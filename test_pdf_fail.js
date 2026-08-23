const fs = require('fs');
const PDFParser = require('pdf2json');
const pdfParser = new PDFParser(); 
pdfParser.on('pdfParser_dataReady', pdfData => {
    let allTexts = [];
    
    pdfData.Pages.forEach(page => {
      let pageTexts = [];
      if (page.Texts) {
        page.Texts.forEach(t => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch(e) { text = unescape(t.R[0].T); }
          pageTexts.push({ x: t.x, y: t.y, text: text });
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
        if (currentLineTexts.length > 0) {
           rawLines.push({ y: lineY, texts: currentLineTexts });
        }
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
      
      if (lineText.includes('CLIPS') || lineText.includes('Honorarium Narasumber/Pembahas') || lineText.includes('Pejabat')) {
          console.log('\n--- FOUND ITEM URAIAN ---');
          console.log('TEXT:', lineText);
          let prevLineObj = rawLines[i-1];
          let nextLineObj = rawLines[i+1];
          let next2LineObj = rawLines[i+2];
          
          if (prevLineObj) {
            console.log('PREV:', prevLineObj.texts.map(t => 'x'+t.x.toFixed(1)+'='+t.text).join(' | '));
          }
          console.log('CURR:', lineObj.texts.map(t => 'x'+t.x.toFixed(1)+'='+t.text).join(' | '));
          if (nextLineObj) {
            console.log('NEXT:', nextLineObj.texts.map(t => 'x'+t.x.toFixed(1)+'='+t.text).join(' | '));
          }
          if (next2LineObj) {
            console.log('NEXT2:', next2LineObj.texts.map(t => 'x'+t.x.toFixed(1)+'='+t.text).join(' | '));
          }
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 2.22.04.2.01.0001 Pemberdayaan Sumber Daya Manusia dan Lembaga Sejarah Lokal Kabupaten_Kota.pdf');
