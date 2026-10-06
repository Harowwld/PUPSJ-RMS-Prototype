import fs from 'fs';
let code = fs.readFileSync('next-app/src/components/shared/Sidebar.js', 'utf8');

// Replace Minus SVG
code = code.replace(
  /<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http:\/\/www.w3.org\/2000\/svg">\s*<path d="M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"\/>\s*<\/svg>/g,
  '<Minus className="w-3 h-3 stroke-[2.5]" />'
);

// Replace Plus SVG
code = code.replace(
  /<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http:\/\/www.w3.org\/2000\/svg">\s*<path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"\/>\s*<\/svg>/g,
  '<Plus className="w-3 h-3 stroke-[2.5]" />'
);

// Add imports if needed
if (code.includes('<Minus') && !code.includes('Minus, Plus')) {
  code = code.replace(
    'import { Monitor, User, Shield, AlertTriangle, Fingerprint, Lock, ShieldCheck, Mail, Save, Clock, ChevronDown, Check, Sun, Moon, Search, Settings, Calendar, Maximize2, Minimize2 } from "lucide-react";',
    'import { Monitor, User, Shield, AlertTriangle, Fingerprint, Lock, ShieldCheck, Mail, Save, Clock, ChevronDown, Check, Sun, Moon, Search, Settings, Calendar, Maximize2, Minimize2, Plus, Minus } from "lucide-react";'
  );
}

fs.writeFileSync('next-app/src/components/shared/Sidebar.js', code);
