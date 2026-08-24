const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const rincianContentLine = lines.findIndex(l => l.includes("activeTab === 'rincian' && ("));
console.log(lines.slice(Math.max(0, rincianContentLine-5), rincianContentLine+5).join('\n'));
