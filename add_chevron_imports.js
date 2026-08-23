const fs = require('fs');
function addImport(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    if (!code.includes('ChevronDown')) {
        // Find lucide-react import
        const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
        const match = code.match(lucideRegex);
        if (match) {
            const imports = match[1];
            if (!imports.includes('ChevronDown')) {
                const newImports = imports + ', ChevronDown, ChevronUp';
                code = code.replace(lucideRegex, `import { ${newImports} } from 'lucide-react'`);
                fs.writeFileSync(filename, code);
                console.log("Added Chevron imports to " + filename);
            }
        }
    }
}
addImport('src/app/laporan/LaporanPerbandingan.tsx');
addImport('src/app/laporan/LaporanEksekutif.tsx');
