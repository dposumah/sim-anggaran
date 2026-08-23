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
    // Print anything near x = 60 to 62
    let near = allTexts.filter(t => t.x >= 59 && t.x <= 63 && t.text.includes('000'));
    near.forEach(m => console.log('text:', m.text, 'at x:', m.x));
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.02.2.01.0025 Pembinaan Minat, Bakat dan Kreativitas Siswa.pdf');
