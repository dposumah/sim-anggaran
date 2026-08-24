const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const fetchLine = lines.findIndex(l => l.includes("fetch("));
console.log(lines.slice(fetchLine-2, fetchLine+10).join('\n'));
