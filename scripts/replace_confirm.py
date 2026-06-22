#!/usr/bin/env python3
"""Replace native confirm() with swalConfirm() across HTML/JS files."""
import re, os, glob

SWAL_HELPER = """
// swalConfirm — substitui confirm() nativo pelo Swal
async function swalConfirm(text, title = 'Confirmar') {
    const r = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar'
    });
    return r.isConfirmed;
}"""

# Regex patterns
CONFIRM_RE = re.compile(r'\bwindow\.confirm\(|\bconfirm\(')
# Function declarations we can make async
FUNC_DECLS = [
    # async function name(
    (re.compile(r'^(\s*)(async\s+function\s+\w+\s*\()'), None),  # already async
    # function name(
    (re.compile(r'^(\s*)(function\s+\w+\s*\()'), 'async '),
    # name: function(
    (re.compile(r'^(\s*)(\w+\s*:\s*function\s*\()'), 'async '),
    # name = function(
    (re.compile(r'^(\s*)(\w[\w.]*\s*=\s*function\s*\()'), 'async '),
    # name = async (args) => — already async
    (re.compile(r'^(\s*)(\w[\w.]*\s*=\s*async\s*(?:\([^)]*\)|\w+)\s*=>)'), None),
    # name = (args) =>
    (re.compile(r'^(\s*)(\w[\w.]*\s*=\s*(?:\([^)]*\)|\w+)\s*=>)'), 'async '),
    # onclick/on* inline: functionName(
    (re.compile(r'^(\s*)((?:on\w+\s*=\s*["\']\s*)?(?:async\s+)?function\s*\()'), 'async '),
]

def find_enclosing_function_line(lines, line_idx):
    """Search backwards for a function declaration."""
    depth = 0
    for i in range(line_idx - 1, max(line_idx - 200, -1), -1):
        line = lines[i]
        # Count braces to track scope
        depth += line.count('}') - line.count('{')
        # Look for function keywords
        stripped = line.strip()
        if depth >= 0:  # we might be in the right scope
            # Check for various function declaration patterns
            if re.search(r'\bfunction\b', line) and re.search(r'\{', line):
                return i
            # Arrow function
            if re.search(r'=>\s*\{', line):
                return i
    return -1

def make_line_async(line):
    """Add async to a function declaration line if not already async."""
    # Already async?
    if re.search(r'\basync\b', line):
        return line, False

    transformations = [
        # function name(
        (re.compile(r'(\bfunction\s+)(\w+\s*\()'), r'async \1\2'),
        # name: function(
        (re.compile(r'(\w+\s*:\s*)(function\s*\()'), r'\1async \2'),
        # name = function(
        (re.compile(r'(=\s*)(function\s*\()'), r'\1async \2'),
        # (args) =>
        (re.compile(r'(=\s*)(\([^)]*\)\s*=>)'), r'\1async \2'),
        # word =>
        (re.compile(r'(=\s*)(\w+\s*=>)'), r'\1async \2'),
    ]
    for pattern, repl in transformations:
        new_line, n = re.subn(pattern, repl, line)
        if n > 0:
            return new_line, True
    return line, False

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if no confirm() calls (not already converted)
    if not CONFIRM_RE.search(content):
        return 0

    # Skip if no Swal available (no sweetalert/swal script tag)
    has_swal = bool(re.search(r'sweetalert|SweetAlert|swal\.min', content, re.I))
    if not has_swal:
        return 0

    lines = content.split('\n')
    changed_funcs = set()
    confirm_count = 0

    # First pass: replace confirm( and window.confirm( with await swalConfirm(
    new_lines = []
    for i, line in enumerate(lines):
        # Skip lines that are already using swalConfirm or await
        if 'swalConfirm' in line:
            new_lines.append(line)
            continue

        new_line = re.sub(r'\bwindow\.confirm\(', 'await swalConfirm(', line)
        new_line = re.sub(r'(?<!\w)confirm\(', 'await swalConfirm(', new_line)

        if new_line != line:
            confirm_count += 1
            # Find enclosing function to make async
            func_line = find_enclosing_function_line(lines, i)
            if func_line >= 0:
                changed_funcs.add(func_line)

        new_lines.append(new_line)

    if confirm_count == 0:
        return 0

    # Second pass: make enclosing functions async
    async_count = 0
    for func_idx in changed_funcs:
        new_line, changed = make_line_async(new_lines[func_idx])
        if changed:
            new_lines[func_idx] = new_line
            async_count += 1

    # Third pass: inject swalConfirm helper if not already present
    if 'swalConfirm' not in content:
        # Find a good injection point: after last </script> opening or before </body>
        # Try to inject before last </script> tag in the HTML
        result = '\n'.join(new_lines)
        inject_marker = '</script>'
        last_pos = result.rfind(inject_marker)
        if last_pos == -1:
            # Pure JS file - inject at end
            result = result + '\n' + SWAL_HELPER
        else:
            result = result[:last_pos] + SWAL_HELPER + '\n' + result[last_pos:]
    else:
        result = '\n'.join(new_lines)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(result)

    print(f"  {confirm_count:3d} confirm / {async_count:3d} async  {path}")
    return confirm_count

if __name__ == '__main__':
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    patterns = [
        f'{base}/pages/**/*.html',
        f'{base}/assets/js/**/*.js',
        f'{base}/assets/js/*.js',
    ]
    files = []
    for pat in patterns:
        files.extend(glob.glob(pat, recursive=True))
    files = sorted(set(files))

    total = 0
    print("Replacing confirm() → swalConfirm():")
    for f in files:
        total += process_file(f)
    print(f"\nTotal replaced: {total}")
