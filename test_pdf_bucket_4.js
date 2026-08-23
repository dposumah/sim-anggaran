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
      
      if (lineText.includes('UANG HARIAN PERJALANAN DINAS DALAM DAERAH') || lineText.includes('SATUAN BIAYA TIKET PESAWAT PERJALANAN DINAS') || lineText.includes('SATUAN BIAYA KONSUMSI RAPAT/KEGIATAN')) {
          console.log('\n--- FOUND OMITTED URAIAN ---');
          for (let j = -2; j <= 5; j++) {
             if (rawLines[i+j]) {
                console.log('LINE ' + j + ': ' + rawLines[i+j].texts.map(t => 'x'+t.x.toFixed(1)+'='+t.text).join(' | '));
             }
          }
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 2.22.02.2.02.0001 Pelindungan, Pengembangan, Pemanfaatan Objek Pemajuan Tradisi Budaya.pdf');
