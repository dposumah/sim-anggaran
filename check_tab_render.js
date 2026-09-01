const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('activeTab === \'detail\''));
console.log(lines.slice(idx, idx + 20).join('\n'));
