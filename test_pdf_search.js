const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser(); 
pdfParser.on('pdfParser_dataReady', pdfData => {
    let allTexts = [];
    pdfData.Pages.forEach((page, pageIndex) => {
      if (page.Texts) {
        page.Texts.forEach(t => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch(e) { text = unescape(t.R[0].T); }
          allTexts.push({ text: text });
        });
      }
    });
    
    let textStr = allTexts.map(t => t.text).join(' ');
    console.log('BMD:', textStr.includes('BMD'));
    console.log('3.600.000:', textStr.includes('3.600.000'));
    console.log('9.450.000:', textStr.includes('9.450.000'));
    console.log('13.050.000:', textStr.includes('13.050.000'));
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.01.2.08.0004 Penyediaan Jasa Pelayanan Umum Kantor (1).pdf');
