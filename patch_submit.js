const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');
code = code.replace('body: JSON.stringify({ ...formData, skpdId: selectedSkpd, tahun })', 'body: JSON.stringify({ ...formData, skpdId: selectedSkpd, tahun, id: editId })');
fs.writeFileSync('src/app/realisasi/page.tsx', code);
