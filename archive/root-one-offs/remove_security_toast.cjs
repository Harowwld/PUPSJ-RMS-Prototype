const fs = require('fs');
const file = 'next-app/src/components/systemadmin/SecurityQuestionsTab.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /if \(isManual\) \{\s*showToast\?\.\(\{\s*title: "Security Questions Refreshed",\s*description: "Loaded latest challenge configuration from repository\.",\s*\}\)\s*\}/g,
  ''
);
fs.writeFileSync(file, content);
console.log('Removed manual toast from SecurityQuestionsTab');
