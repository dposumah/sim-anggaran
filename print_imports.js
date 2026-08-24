const fs = require('fs');
const code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(0, 10).join('\n'));
