const fs = require('fs');
let lines = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8').split('\n');
lines[204] = '                <div key={result.id} className={lex flex-col }>';
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', lines.join('\n'));
