const fs = require('fs');
const PDFParser = require('pdf2json');
const pdfParser = new PDFParser(); 
pdfParser.on('pdfParser_dataReady', pdfData => {
    let allTexts = [];
    pdfData.Pages.forEach(page => {
      if (page.Texts) {
        page.Texts.forEach(t => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch(e) { text = unescape(t.R[0].T); }
          allTexts.push({ x: t.x, y: t.y, text: text });
        });
      }
    });
    allTexts.sort((a,b) => Math.abs(a.y - b.y) > 0.5 ? a.y - b.y : a.x - b.x);
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
          let allItemTexts = [...lineObj.texts];
          let prevLineObj = rawLines[i-1];
          if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^([\[5]|Sumber|Sub Kegiatan|Spesifikasi)/)) {
             allItemTexts = [...prevLineObj.texts, ...allItemTexts];
          }
          
          for (let j = 1; j <= 5; j++) {
             let nextLine = rawLines[i+j];
             if (!nextLine) break;
             let nextLineText = nextLine.texts.map(t=>t.text).join(' ').trim();
             if (nextLineText.match(/^([\[5]|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)/)) {
                break;
             }
             allItemTexts = [...allItemTexts, ...nextLine.texts];
          }
          
          let fullString = allItemTexts.map(t => t.text).join(' ');
          let matches = fullString.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/g);
          
          let jumlah = 'NOT FOUND';
          if (matches && matches.length >= 2) {
             jumlah = matches[matches.length - 2];
          }
          
          let spec = lineText.substring(0, 30);
          console.log(spec.padEnd(30) + ' => Matches: ' + (matches ? matches.length : 0) + ' | Jumlah: ' + jumlah);
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.02.2.01.0025 Pembinaan Minat, Bakat dan Kreativitas Siswa.pdf');
