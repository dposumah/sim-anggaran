const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');
const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('{showForm && ('));
const idx2 = lines.findIndex((l, i) => i > idx && l.includes('</form>'));
console.log(lines.slice(idx, idx2 + 1).join('\n'));
