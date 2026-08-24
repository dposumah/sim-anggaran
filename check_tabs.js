const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const activeTabLine = lines.findIndex(l => l.includes('const [activeTab'));
console.log(lines.slice(activeTabLine-2, activeTabLine+5).join('\n'));
