const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const lineIdx = lines.findIndex(l => l.includes("setRincianList("));
console.log(lines.slice(lineIdx - 5, lineIdx + 5).join('\n'));
