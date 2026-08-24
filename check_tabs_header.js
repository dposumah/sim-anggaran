const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const setActiveTabLines = lines.map((l, i) => l.includes('setActiveTab') && l.includes('onClick') ? i : -1).filter(i => i !== -1);
setActiveTabLines.forEach(i => console.log(lines.slice(i-2, i+3).join('\n') + '\n---'));
