const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');
let newContent = '';
let lines = content.split(/\r?\n/);
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('result.id') && lines[i].includes('flex-col')) {
     newContent += '                <div key={result.id} className={lex flex-col }>\n';
  } else {
     newContent += lines[i] + '\n';
  }
}
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', newContent);
