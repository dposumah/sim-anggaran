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
      
      if (lineText.includes('Spesifikasi :')) {
          let prevLineObj = rawLines[i-1];
          let nextLineObj = rawLines[i+1];
          
          let allItemTexts = [...lineObj.texts];
          if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^([\[5]|Sumber|Sub Kegiatan|Spesifikasi)/)) {
             allItemTexts = [...prevLineObj.texts, ...allItemTexts];
          }
          if (nextLineObj && !nextLineObj.texts.map(t=>t.text).join(' ').match(/^([\[5]|Sumber|Sub Kegiatan|Spesifikasi)/) && nextLineObj.texts.length < 10) {
             allItemTexts = [...allItemTexts, ...nextLineObj.texts];
          }
          
          let jmlText = allItemTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
          let jmlMatch = jmlText.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/);
          let finalJumlah = jmlMatch ? jmlMatch[0] : '0';
          
          let specStr = lineText.split('Spesifikasi :')[1].trim().split(' ')[0] || '-';
          console.log(specStr.padEnd(20) + " => Jumlah Sesudah: " + finalJumlah);
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.02.2.01.0025 Pembinaan Minat, Bakat dan Kreativitas Siswa.pdf');
