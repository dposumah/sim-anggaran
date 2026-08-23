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
    
    // Group all texts that belong to "Sesudah" (X > 45)
    let sesudahTexts = allTexts.filter(t => t.x >= 44 && t.x <= 75);
    
    // Group them by Y roughly to see if they align per row
    let rows = [];
    let currentRow = [];
    let currentY = -1;
    sesudahTexts.forEach(t => {
       if (currentY === -1 || Math.abs(t.y - currentY) > 0.5) {
          if (currentRow.length > 0) rows.push(currentRow);
          currentRow = [t];
          currentY = t.y;
       } else {
          currentRow.push(t);
       }
    });
    if (currentRow.length > 0) rows.push(currentRow);
    
    rows.forEach(r => {
       console.log(r.map(t => t.text).join(' | '));
    });
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.02.2.01.0025 Pembinaan Minat, Bakat dan Kreativitas Siswa.pdf');
