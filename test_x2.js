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
    let matches = allTexts.filter(t => t.text.includes('15.000.000,00'));
    matches.forEach(m => console.log('Found 15.000.000,00 at x:', m.x));
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.02.2.01.0025 Pembinaan Minat, Bakat dan Kreativitas Siswa.pdf');
