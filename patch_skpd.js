const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');
code = code.replace("fetch('/api/dashboard?tahun=' + tahun)", "fetch('/api/skpd')");
fs.writeFileSync('src/app/realisasi/page.tsx', code);
console.log("Patched skpd fetch");
