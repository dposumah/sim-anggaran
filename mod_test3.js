const fs = require('fs');
let content = fs.readFileSync('src/app/api/upload-pdf-rincian/route.ts', 'utf8');

// The block to replace:
//              if (parsingItem) {
//                  parsingItem.uraian += ' ' + leftOnlyTexts;
//                  if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
//              } else {
//                  parsingItem = { uraian: leftOnlyTexts, tempJumlah: amountOnLine };
//              }

const regex = /if \(parsingItem\) \{\s*parsingItem\.uraian \+= ' ' \+ leftOnlyTexts;\s*if \(amountOnLine > 0\) parsingItem\.tempJumlah = amountOnLine;\s*\} else \{\s*parsingItem = \{ uraian: leftOnlyTexts, tempJumlah: amountOnLine \};\s*\}/;

const newLogic = `if (parsingItem) {
                 if (amountOnLine > 0 && parsingItem.tempJumlah > 0) {
                     flushParsingItem();
                     parsingItem = { uraian: leftOnlyTexts, tempJumlah: amountOnLine };
                 } else {
                     parsingItem.uraian += ' ' + leftOnlyTexts;
                     if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
                 }
             } else {
                 parsingItem = { uraian: leftOnlyTexts, tempJumlah: amountOnLine };
             }`;

content = content.replace(regex, newLogic);
fs.writeFileSync('src/app/api/upload-pdf-rincian/route.ts', content);

// Also do it for test script
let testContent = fs.readFileSync('test_pdf_bucket_34.js', 'utf8');
testContent = testContent.replace(regex, newLogic);
fs.writeFileSync('test_pdf_bucket_34.js', testContent);

