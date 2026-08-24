const fs = require('fs');
let code = fs.readFileSync('src/app/explorer/[id]/RincianClient.tsx', 'utf8');

const targetTabs = `          {[
            { id: 'rincian', label: 'Daftar Rincian', icon: Layers },
            { id: 'sd', label: 'Rekap Sumber Dana', icon: Folder },
            { id: 'rekening', label: 'Rekap Rekening', icon: FileText },
            { id: 'paket', label: 'Rekap Uraian Paket', icon: CheckSquare },
          ].map((tab) => (`;

const newTabs = `          {[
            { id: 'rincian', label: 'Daftar Rincian', icon: Layers },
            { id: 'detail', label: 'Rincian Detail (Spesifikasi)', icon: FileText },
            { id: 'sd', label: 'Rekap Sumber Dana', icon: Folder },
            { id: 'rekening', label: 'Rekap Rekening', icon: FileText },
            { id: 'paket', label: 'Rekap Uraian Paket', icon: CheckSquare },
          ].map((tab) => (`;

code = code.replace(targetTabs, newTabs);
fs.writeFileSync('src/app/explorer/[id]/RincianClient.tsx', code);
console.log("Updated tabs array");
