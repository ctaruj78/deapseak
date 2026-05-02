#!/usr/bin/env python3
import re, sys

files = sys.argv[1:] if len(sys.argv) > 1 else [
    'pages/client/dashboard.html',
    'pages/tech/dashboard.html', 
    'pages/admin/users.html',
    'pages/dispatcher/dashboard.html',
    'pages/dispatcher/technicians.html',
    'pages/client/my-lifts.html',
]

for f in files:
    print(f'\n=== {f} ===')
    try:
        with open(f, encoding='utf-8') as fp:
            for i, line in enumerate(fp, 1):
                if re.search(r'[А-ЯЄІЇа-яєії]', line):
                    s = line.strip()
                    if not s.startswith(('//', '/*', '*', '<!--')):
                        print(f'{i}: {s[:120]}')
    except Exception as e:
        print(f'ERROR: {e}')
