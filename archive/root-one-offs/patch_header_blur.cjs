const fs = require('fs');
const file = 'next-app/src/components/layout/Header.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the current header tag
const newHeader = `<header className="sticky top-0 w-full flex-none z-30 select-none transition-colors duration-200">
      {/* GardenLetters-style gradient blur backdrop */}
      <div 
        className="absolute top-0 left-0 right-0 h-[80px] pointer-events-none z-[-1]"
        style={{
          backdropFilter: 'blur(12px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.8)',
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
        }}
      />`;

content = content.replace(/<header className="backdrop-blur-xl flex-none z-30 select-none transition-colors duration-200">/g, newHeader);

fs.writeFileSync(file, content);
console.log('Header blur patched!');
