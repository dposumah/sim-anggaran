const fs = require('fs');
let content = fs.readFileSync('src/app/api/upload-pdf-rincian/route.ts', 'utf8');

const regex = /if\s*\(parsingItem\)\s*\{\s*parsingItem\.uraian\s*\+=\s*' '\s*\+\s*leftOnlyTexts;\s*if\s*\(amountOnLine\s*>\s*0\)\s*parsingItem\.tempJumlah\s*=\s*amountOnLine;\s*\}\s*else\s*\{/g;

const replacement = `if (parsingItem) {
                 if (amountOnLine > 0 && parsingItem.tempJumlah > 0) {
                     flushParsingItem();
                     parsingItem = {
                         rekening: currentRekening,
                         namaRekening: currentNamaRekening,
                         paket: currentPaket,
                         sumberDana: currentSumberDana,
                         uraian: leftOnlyTexts,
                         spesifikasi: '',
                         jumlah: 0,
                         tempJumlah: amountOnLine
                     };
                 } else {
                     parsingItem.uraian += ' ' + leftOnlyTexts;
                     if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
                 }
             } else {`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/api/upload-pdf-rincian/route.ts', content);
