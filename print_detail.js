const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const detailTabLine = lines.findIndex(l => l.includes("rincianList.flatMap"));
console.log(lines.slice(Math.max(0, detailTabLine-5), detailTabLine + 25).join('\n'));
