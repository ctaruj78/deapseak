import re, glob

uk = re.compile(r'[\u0400-\u04FF]')
files = [
    'pages/tech/ar-helper.html',
    'pages/tech/knowledge-base.html',
    'pages/dispatcher/invoice-template.html',
    'pages/dispatcher/lifts.html',
    'pages/dispatcher/lifts-new.html',
    'pages/dispatcher/lifts-admin-style.html',
    'pages/client/dashboard.html',
    'pages/client/support.html',
    'pages/client/requests.html',
    'pages/client/notifications.html',
]

for f in files:
    try:
        lines = open(f, encoding='utf-8').readlines()
    except:
        continue
    found = False
    for i, line in enumerate(lines):
        if uk.search(line):
            stripped = line.strip()
            if (not stripped.startswith('//') and 
                not stripped.startswith('<!--') and 
                'console.' not in stripped and
                not stripped.startswith('*') and
                not stripped.startswith('/*')):
                if not found:
                    print(f'\n=== {f} ===')
                    found = True
                print(f'  {i+1}: {stripped[:130]}')
