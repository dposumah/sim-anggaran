const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
const lines = code.split('\n');
const idx = lines.findIndex(l => l.includes('Belum ada data rincian spesifikasi untuk sub kegiatan ini.'));
console.log(lines.slice(idx - 5, idx + 5).join('\n'));
