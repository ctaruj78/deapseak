import re, glob

uk = re.compile(r'[\u0400-\u04FF]')
files = (
    glob.glob('pages/client/**/*.html', recursive=True) +
    glob.glob('pages/tech/**/*.html', recursive=True) +
    glob.glob('pages/dispatcher/**/*.html', recursive=True)
)

results = []
for f in sorted(files):
    try:
        lines = open(f, encoding='utf-8').readlines()
    except:
        continue
    for i, line in enumerate(lines):
        if uk.search(line):
            stripped = line.strip()
            # Skip pure comments and console logs
            if (stripped.startswith('//') or 
                stripped.startswith('<!--') or 
                'console.' in stripped or
                stripped.startswith('*') or
                stripped.startswith('/*')):
                continue
            results.append(f'{f}:{i+1}: {stripped[:130]}')

print('\n'.join(results[:100]))
print(f'\n--- Total: {len(results)} visible lines with Ukrainian ---')
