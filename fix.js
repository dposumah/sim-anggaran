const fs = require('fs');
let code = fs.readFileSync('src/app/api/upload-pdf-rincian/route.ts', 'utf8');
code = code.replace(/\^\(\\\\[\|\^5\\\\\\.\\\\d\\+\\\\\\.\\\\d\\+\\\\\\.\\\\d\\+\|Sumber\|Sub Kegiatan\|Spesifikasi\)/g, "^\\\\s*(\\\\[|^5\\\\.\\\\d+\\\\.\\\\d+\\\\.\\\\d+|Sumber|Sub Kegiatan|Spesifikasi)");
code = code.replace(/\^\(\\\\[\|\^5\\\\\\.\\\\d\\+\\\\\\.\\\\d\\+\\\\\\.\\\\d\\+\|Sumber\|Sub Kegiatan\|Spesifikasi\|Jumlah Anggaran\)/g, "^\\\\s*(\\\\[|^5\\\\.\\\\d+\\\\.\\\\d+\\\\.\\\\d+|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)");
fs.writeFileSync('src/app/api/upload-pdf-rincian/route.ts', code);
