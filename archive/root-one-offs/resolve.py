import re

def resolve_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if filepath == 'next-app/src/components/shared/RefreshButton.js':
        # Take HEAD
        content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [a-f0-9]+\n?', r'\1\n', content, flags=re.DOTALL)
    
    elif filepath == 'next-app/src/components/shared/Sidebar.js':
        # Combine text-[22px] with title=...
        def sidebar_replacer(match):
            head = match.group(1)
            theirs = match.group(2)
            # Find the title attribute in theirs
            title_match = re.search(r'(title=\{[^\}]+\})', theirs)
            title = title_match.group(1) if title_match else ''
            # Inject title into head
            return head.rstrip() + '\n                                ' + title + '\n'

        content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-f0-9]+\n?', sidebar_replacer, content, flags=re.DOTALL)
    
    elif 'Tab.js' in filepath:
        # Resolving separator removal (take HEAD)
        def tab_replacer(match):
            head = match.group(1)
            theirs = match.group(2)
            
            if 'separator' in theirs.lower() or 'bg-gray-200' in theirs:
                return head
            
            # Resolving KPI card shadow
            if 'shadow-none' in head and 'shadow-[' in theirs:
                # Merge shadow-none with h-full from theirs if it exists
                head_str = head
                if 'h-full' in theirs and 'h-full' not in head_str:
                    head_str = head_str.replace('min-h-[110px]', 'min-h-[110px] h-full')
                return head_str
                
            return head # Default to HEAD if unknown

        content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-f0-9]+\n?', tab_replacer, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Resolved {filepath}")

files = [
    'next-app/src/components/admin/DigitalRecordsReviewTab.js',
    'next-app/src/components/shared/RefreshButton.js',
    'next-app/src/components/shared/Sidebar.js',
    'next-app/src/components/systemadmin/GlobalStaffTab.js',
    'next-app/src/components/systemadmin/ModuleConfigTab.js',
    'next-app/src/components/systemadmin/OfficeManagementTab.js'
]

for f in files:
    resolve_file(f)

