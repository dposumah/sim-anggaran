const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('model RealisasiBelanja'));
const end = lines.findIndex((l, i) => i > start && l.includes('}'));
console.log(lines.slice(start, end + 1).join('\n'));
