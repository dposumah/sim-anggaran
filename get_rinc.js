const fs = require('fs');
const lines = fs.readFileSync('prisma/schema.prisma', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('model RincianBelanja'));
const end = lines.findIndex((l, i) => i > start && l.includes('}'));
console.log(lines.slice(start, end+1).join('\n'));
