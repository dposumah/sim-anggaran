const fs = require('fs');
const PDFParser = require('pdf2json');
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

    for (let i = 0; i < rawLines.length; i++) {
      let lineObj = rawLines[i];
      let lineText = lineObj.texts.map(t => t.text).join(' ').trim();
      
      if (lineText.includes('Spesifikasi :')) {
          let itemLines = [lineObj];
          
          let prevLineObj = rawLines[i-1];
          if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
             let hasLeftText = prevLineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
             if (hasLeftText) {
                 itemLines.unshift(prevLineObj);
                 let prev2LineObj = rawLines[i-2];
                 if (prev2LineObj && !prev2LineObj.texts.map(t=>t.text).join(' ').match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
                     if (prev2LineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/))) {
                        itemLines.unshift(prev2LineObj);
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
             let hasLeftText = nextLine.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
             if (hasLeftText) {
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
          if (!jmlMatch) {
              let fallbackMatches = amountTexts.map(t=>t.text).join(' ').match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/g);
              if (fallbackMatches && fallbackMatches.length >= 6) jmlMatch = [fallbackMatches[fallbackMatches.length - 2]];
          }
          
          let leftTexts = itemLines.flatMap(l => l.texts.filter(t => t.x < 25)).map(t => t.text).join(' ').trim();
          let parts = leftTexts.split('Spesifikasi :');
          let extractedUraian = parts[0].trim();
          
          if (!jmlMatch) {
              console.log('FAILED (0):', extractedUraian.substring(0, 50));
          } else {
              console.log('SUCCESS:', extractedUraian.substring(0, 30).padEnd(30) + ' => ' + jmlMatch[0]);
          }
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.04.2.01.0001 Perhitungan dan Pemetaan Pendidik dan Tenaga Kependidikan Satuan Pendidikan Dasar, PAUD, dan Pendidikan Nonformal_Kesetaraan.pdf');
