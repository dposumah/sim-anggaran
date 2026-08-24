const fs = require('fs');
let code = fs.readFileSync('src/app/api/explorer/route.ts', 'utf8');
const lines = code.split('\n');
const caseLine = lines.findIndex(l => l.includes("case 'rincian':"));
console.log(lines.slice(caseLine, caseLine + 50).join('\n'));
