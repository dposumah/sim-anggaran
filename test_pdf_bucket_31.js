const fs = require('fs');
const PDFParser = require('pdf2json');

function cleanNumber(str) {
  if (!str || str.trim() === '-') return 0;
  return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'));
}

const pdfParser = new PDFParser(); 
pdfParser.on('pdfParser_dataReady', pdfData => {
    let allTexts = [];
    pdfData.Pages.forEach((page, pageIndex) => {
      let pageTexts = [];
      if (page.Texts) {
        page.Texts.forEach(t => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch(e) { text = unescape(t.R[0].T); }
          pageTexts.push({ x: t.x, y: t.y + (pageIndex * 100), text: text });
        });
      }
      pageTexts.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.5) return a.y - b.y;
        return a.x - b.x;
      });
      allTexts.push(...pageTexts);
    });
    
    let rawLines = [];
    let currentLineTexts = [];
    let lineY = -1;
    allTexts.forEach(t => {
      if (lineY === -1 || Math.abs(t.y - lineY) > 0.5) {
        if (currentLineTexts.length > 0) rawLines.push({ y: lineY, texts: currentLineTexts });
        currentLineTexts = [t];
        lineY = t.y;
      } else {
        currentLineTexts.push(t);
      }
    });
    if (currentLineTexts.length > 0) rawLines.push({ y: lineY, texts: currentLineTexts });

    let items = [];
    let currentSubKegiatan = '';
    let currentRekening = '';
    let currentNamaRekening = '';
    let currentPaket = '-';
    let currentSumberDana = '-';
    let parsingItem = null;

    for (let i = 0; i < rawLines.length; i++) {
      let lineObj = rawLines[i];
      let lineText = lineObj.texts.map(t => t.text).join(' ').trim();
      let hasLeftText = lineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
      
      if (lineText.startsWith('Sub Kegiatan :')) {
        currentSubKegiatan = lineText.replace('Sub Kegiatan :', '').trim();
        parsingItem = null;
      } else if (lineText.match(/^5\.\d+\.\d+\.\d+\.\d+\.\d+\s+/)) {
        let parts = lineText.split(' ');
        currentRekening = parts[0];
        currentNamaRekening = parts.slice(1).join(' ').split(/ \d/)[0].trim();
        parsingItem = null;
      } else if (lineText.startsWith('[ # ]')) {
        currentPaket = lineText.replace('[ # ]', '').trim() || '-';
        parsingItem = null;
      } else if (lineText.startsWith('Sumber Dana :')) {
        currentSumberDana = lineText.replace('Sumber Dana :', '').split(/ \d/)[0].trim() || '-';
        parsingItem = null;
      } else if (currentRekening && !lineText.includes('Satuan Kerja Perangkat Daerah') && !lineText.includes('Koefisien Satuan') && !lineText.startsWith('[ - ]')) {
        
        if (lineText.includes('Spesifikasi :')) {
          if (parsingItem) {
            let itemLines = [lineObj];
            
            let prevLineObj = rawLines[i-1];
            if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').trim().match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
               let hasLeft = prevLineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
               if (hasLeft) {
                   itemLines.unshift(prevLineObj);
                   let prev2LineObj = rawLines[i-2];
                   if (prev2LineObj && !prev2LineObj.texts.map(t=>t.text).join(' ').trim().match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
                       if (prev2LineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/))) {
                          itemLines.unshift(prev2LineObj);
                          let prev3LineObj = rawLines[i-3];
                          if (prev3LineObj && !prev3LineObj.texts.map(t=>t.text).join(' ').trim().match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
                              if (prev3LineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/))) {
                                 itemLines.unshift(prev3LineObj);
                                 let prev4LineObj = rawLines[i-4];
                                 if (prev4LineObj && !prev4LineObj.texts.map(t=>t.text).join(' ').trim().match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
                                     if (prev4LineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/))) {
                                         itemLines.unshift(prev4LineObj);
                                     }
                                 }
                              }
                          }
                       }
                   }
               }
            }
            
            for (let j = 1; j <= 5; j++) {
               let nextLine = rawLines[i+j];
               if (!nextLine) break;
               let nextLineText = nextLine.texts.map(t=>t.text).join(' ').trim();
               if (nextLineText.match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)/)) break;
               
               let isNewUraian = false;
               let hasLeft = nextLine.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
               if (hasLeft) {
                   for (let k = 1; k <= 2; k++) {
                       let checkLine = rawLines[i+j+k];
                       if (checkLine && checkLine.texts.map(t=>t.text).join(' ').includes('Spesifikasi :')) {
                           isNewUraian = true;
                           break;
                       }
                   }
               }
               if (isNewUraian) break;
               
               itemLines.push(nextLine);
            }
            
            let amountTexts = itemLines.flatMap(l => l.texts);
            let jmlText = amountTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
            let jmlMatch = jmlText.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/);
            let finalJumlah = 0;
            if (jmlMatch) {
                finalJumlah = cleanNumber(jmlMatch[0]);
            } else {
                let fallbackMatches = amountTexts.map(t=>t.text).join(' ').match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/g);
                if (fallbackMatches && fallbackMatches.length >= 6) {
                    finalJumlah = cleanNumber(fallbackMatches[fallbackMatches.length - 2]);
                }
            }
            
            let leftTexts = itemLines.flatMap(l => l.texts.filter(t => t.x < 25)).map(t => t.text).join(' ').trim();
            let parts = leftTexts.split('Spesifikasi :');
            let extractedUraian = parts[0].trim();
            if (!extractedUraian) extractedUraian = parsingItem.uraian;
            
            console.log(extractedUraian.substring(0, 50).padEnd(50) + ' => ' + finalJumlah);
            items.push(parsingItem);
            parsingItem = null;
          }
        } else if (hasLeftText && !lineText.startsWith('[') && !lineText.match(/^5\.\d/) && lineText.length > 2) {
           
           let leftOnlyTexts = lineObj.texts.filter(t => t.x < 25).map(t => t.text).join(' ').trim();
           if (parsingItem) {
               parsingItem.uraian += ' ' + leftOnlyTexts;
           } else {
               parsingItem = {
                 rekening: currentRekening,
                 uraian: leftOnlyTexts
               };
           }
        }
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.01.2.08.0004 Penyediaan Jasa Pelayanan Umum Kantor (1).pdf');
