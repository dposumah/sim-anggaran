const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('const [sumberDanas'));
const end = lines.findIndex((l, i) => i > start && l.includes('loadRealisasi();'));
console.log(lines.slice(start, end + 5).join('\n'));
