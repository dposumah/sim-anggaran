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
          allTexts.push({ x: t.x, y: t.y, text: text, page: page.id });
        });
      }
    });
    
    let sesudahTexts = allTexts.filter(t => t.x >= 44 && t.x <= 65);
    
    sesudahTexts.sort((a,b) => {
        if (Math.abs(a.y - b.y) > 0.5) return a.y - b.y;
        return a.x - b.x;
    });

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
       let koef = r.filter(t => t.x >= 44 && t.x < 48).map(t => t.text).join(' ');
       let sat = r.filter(t => t.x >= 48 && t.x < 52).map(t => t.text).join(' ');
       let hrg = r.filter(t => t.x >= 52 && t.x < 56).map(t => t.text).join(' ');
       let ppn = r.filter(t => t.x >= 56 && t.x < 59).map(t => t.text).join(' ');
       let jml = r.filter(t => t.x >= 59 && t.x < 65).map(t => t.text).join(' ');
       if (hrg || jml || koef) {
          console.log('Koef: ' + koef.padEnd(15) + ' | Sat: ' + sat.padEnd(10) + ' | Hrg: ' + hrg.padEnd(15) + ' | PPN: ' + ppn.padEnd(5) + ' | Jml: ' + jml);
       }
    });
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.02.2.01.0025 Pembinaan Minat, Bakat dan Kreativitas Siswa.pdf');
