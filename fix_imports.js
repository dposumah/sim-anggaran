const fs = require('fs');
function fixImport(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
    const match = code.match(lucideRegex);
    if (match) {
        let imports = match[1];
        if (!imports.includes('ChevronDown')) {
            code = code.replace(lucideRegex, `import { ${imports}, ChevronDown, ChevronUp } from 'lucide-react'`);
            fs.writeFileSync(filename, code);
            console.log("Added Chevron imports to " + filename);
        }
    }
}
fixImport('src/app/laporan/LaporanPerbandingan.tsx');
fixImport('src/app/laporan/LaporanEksekutif.tsx');
