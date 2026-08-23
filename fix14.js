const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
let idx1 = content.indexOf('lex flex-col');
let idx2 = content.indexOf('lex flex-col', idx1 + 1);
let start = content.lastIndexOf('className={', idx2);
let end = content.indexOf('>', idx2);
let toReplace = content.substring(start, end);
console.log('Replacing:', JSON.stringify(toReplace));
content = content.replace(toReplace, 'className={lex flex-col }');
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', content);
