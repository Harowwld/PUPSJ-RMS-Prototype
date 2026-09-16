import fs from 'fs';
let code = fs.readFileSync('next-app/src/components/landing/LandingBento.js', 'utf8');

// Replace Mouse SVG
code = code.replace(
  /<svg[\s\S]*?<\/svg>/,
  '<MousePointer2 className="w-6 h-6 drop-shadow-md text-black fill-white" style={{ animation: `cursorClick 6s infinite ${delay}` }} />'
);

if (code.includes('<MousePointer2') && !code.includes('MousePointer2')) {
  code = code.replace(
    'import { FileText, Database, Shield, Layout, ArrowRight } from "lucide-react";',
    'import { FileText, Database, Shield, Layout, ArrowRight, MousePointer2 } from "lucide-react";'
  );
}

fs.writeFileSync('next-app/src/components/landing/LandingBento.js', code);
