import os
import re

files = [
  'next-app/src/components/admin/system-config/CoursesTab.js',
  'next-app/src/components/admin/system-config/SectionsTab.js',
  'next-app/src/components/admin/system-config/DocTypesTab.js',
  'next-app/src/components/admin/StaffDirectoryTab.js',
  'next-app/src/components/staff/NotificationsTab.js',
  'next-app/src/components/systemadmin/GlobalStaffTab.js',
  'next-app/src/components/systemadmin/ModuleConfigTab.js',
  'next-app/src/components/systemadmin/OfficeManagementTab.js'
]

for file in files:
    if os.path.exists(file):
        with open(file, 'r') as f:
            content = f.read()
        
        content = re.sub(r'<span[^>]*>\s*(?:·\s*)?Restore Mode\s*</span>', '', content)
        content = re.sub(r'\{[a-zA-Z0-9_=\s"\']+\s*&&\s*\(\s*\)\s*\}', '', content)

        with open(file, 'w') as f:
            f.write(content)
