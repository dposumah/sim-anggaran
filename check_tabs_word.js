const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const tabHeaderLine = lines.findIndex(l => l.includes('Daftar Rincian'));
console.log(lines.slice(Math.max(0, tabHeaderLine-10), tabHeaderLine+20).join('\n'));
