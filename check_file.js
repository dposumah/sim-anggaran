const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');
console.log(code.includes('detail') ? "Contains detail" : "Does NOT contain detail");
console.log(code.includes('Rekapitulasi Berdasarkan Sumber Dana') ? "Contains Rekap" : "Does NOT contain Rekap");
