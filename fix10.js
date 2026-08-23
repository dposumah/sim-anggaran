const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
content = content.replace(/className=\{flex flex-col \}/g, 'className={lex flex-col }');
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', content);
