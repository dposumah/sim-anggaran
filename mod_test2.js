const fs = require('fs');
let content = fs.readFileSync('test_pdf_bucket_34.js', 'utf8');

const oldLogic = `             if (parsingItem) {
                 parsingItem.uraian += ' ' + leftOnlyTexts;
                 if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
             } else {
                 parsingItem = { uraian: leftOnlyTexts, tempJumlah: amountOnLine };
             }`;

const newLogic = `             if (parsingItem) {
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

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('test_pdf_bucket_34.js', content);
