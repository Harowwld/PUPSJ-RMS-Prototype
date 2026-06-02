import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const transformations = [
  ['Save Changes', 'Save changes'],
  ['Cancel Preview', 'Cancel preview'],
  ['Clear Form', 'Clear form'],
  ['Change Answer', 'Change answer'],
  ['Delete Room', 'Delete room'],
  ['Reset Room', 'Reset room'],
  ['Use Template', 'Use template'],
  ['Scan QR Code', 'Scan QR code'],
  ['Secret Key', 'Secret key'],
  ['Serial Key', 'Serial key'],
  ['Log Out', 'Log out'],
  ['Active Filters:', 'Active filters:'],
  ['Use Default', 'Use default'],
  ['New Doc Type', 'New doc type'],
  ['New Course', 'New course'],
  ['New Section', 'New section'],
  ['Delete Selected', 'Delete selected'],
  ['Restore Record', 'Restore record'],
  ['Archive Record', 'Archive record'],
  ['Export Data', 'Export data'],
  ['Import Data', 'Import data'],
  ['Student No.', 'Student no.'],
  ['Full Name', 'Full name'],
  ['Physical Location', 'Physical location']
];

walkDir('next-app/src', (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Strip 'uppercase' class (case-sensitive)
    // We only want to remove the exact word 'uppercase' when it's standing alone (like in class names).
    // It will not match 'toUpperCase' because 'T' is uppercase.
    content = content.replace(/\buppercase\b/g, '');

    // 2. Replace known exact uppercase strings that are used in UI
    content = content.replace(/>\s*CANCEL\s*</g, '>Cancel<');
    content = content.replace(/>\s*SAVE\s*</g, '>Save<');
    content = content.replace(/>\s*UPDATE\s*</g, '>Update<');
    content = content.replace(/>\s*DELETE\s*</g, '>Delete<');
    content = content.replace(/>\s*VIEW\s*</g, '>View<');
    content = content.replace(/>\s*RESET\s*</g, '>Reset<');
    content = content.replace(/>\s*ARCHIVE\s*</g, '>Archive<');
    content = content.replace(/>\s*RESTORE\s*</g, '>Restore<');
    content = content.replace(/>\s*NEXT\s*</g, '>Next<');
    content = content.replace(/>\s*PREV\s*</g, '>Prev<');

    // 3. Sentence case specific phrases
    for (const [oldStr, newStr] of transformations) {
      // Look for the string outside of imports or URLs if possible. 
      // Safest is to just do a global replace for these very specific UI strings.
      const regex = new RegExp(`(?<![a-zA-Z0-9_-])${oldStr}(?![a-zA-Z0-9_-])`, 'g');
      content = content.replace(regex, newStr);
    }

    // Fix multiple spaces that might have been left by removing 'uppercase'
    content = content.replace(/className="([^"]*)"/g, (match, p1) => {
      const cleaned = p1.replace(/\s+/g, ' ').trim();
      return `className="${cleaned}"`;
    });
    content = content.replace(/className=\{`([^`]*)`\}/g, (match, p1) => {
      const cleaned = p1.replace(/  +/g, ' ');
      return `className={\`${cleaned}\`}`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
