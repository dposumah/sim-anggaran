const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
content = content.replace(/className=\{\f.*?lex flex-col \}/, 'className={lex flex-col }');
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', content);
