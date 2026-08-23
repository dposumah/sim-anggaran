const fs = require('fs');
let lines = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8').split(/\r?\n/);
for (let i = 200; i < 210; i++) {
   console.log(i + ': ' + lines[i]);
}
