#!/usr/bin/env python3
"""Replace native alert() calls with toastr notifications."""
import re, sys, os, glob

def categorize(msg: str) -> str:
    m = msg.lower()
    if '✅' in msg: return 'success'
    if '❌' in msg: return 'error'
    if '⚠️' in msg: return 'warning'
    if any(x in m for x in ['erro', 'error', 'falhou', 'inválid', 'não foi possível',
                              'autenticação', 'sessão expir', 'não autorizado', 'acesso negado',
                              'não encontrad', 'ligação ao serv']):
        return 'error'
    if any(x in m for x in ['sucesso', 'guardado', 'adicionado', 'criado', 'enviado',
                              'eliminado', 'arquivado', 'restaurado', 'actualizado', 'atualizado']):
        return 'success'
    if any(x in m for x in ['por favor', 'primeiro ', 'selecione', 'seleccione', 'preencha',
                              'introduza', 'indique ', 'carregue', 'deve ', 'tem de ', 'obrigatório',
                              'preenche', 'formato ']):
        return 'warning'
    return 'info'

def replace_alerts_in_content(content: str) -> tuple[str, int]:
    count = 0
    result = []
    i = 0
    n = len(content)

    while i < n:
        # Match word-boundary alert( — not preceded by letter/digit/dot/underscore
        if (content[i:i+6] == 'alert(' and
                (i == 0 or (content[i-1] not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.'))):
            # Find the opening quote (skip whitespace)
            j = i + 6
            while j < n and content[j] in ' \t':
                j += 1
            if j < n and content[j] in ('"', "'", '`'):
                quote = content[j]
                # Extract message content to categorize
                k = j + 1
                while k < n:
                    if content[k] == '\\':
                        k += 2
                        continue
                    if quote != '`' and content[k] == '\n':
                        break
                    if content[k] == quote:
                        break
                    k += 1
                msg_inner = content[j+1:k] if k < n else content[j+1:]
                fn = categorize(msg_inner)
                result.append(f'toastr.{fn}(')
                i += 6
                count += 1
                continue
            # alert( not followed by string quote — skip as-is
        result.append(content[i])
        i += 1

    return ''.join(result), count


def process_file(path: str) -> int:
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()
    new_content, count = replace_alerts_in_content(original)
    if count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  {count:3d}  {path}")
    return count

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
    print("Replacing alert() → toastr.*:")
    for f in files:
        total += process_file(f)
    print(f"\nTotal replaced: {total}")
