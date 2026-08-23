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
          let allItemTexts = [...lineObj.texts];
          let prevLineObj = rawLines[i-1];
          if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^(\[|^5\.|Sumber|Sub Kegiatan|Spesifikasi)/)) {
             allItemTexts = [...prevLineObj.texts, ...allItemTexts];
          }
          for (let j = 1; j <= 5; j++) {
             let nextLine = rawLines[i+j];
             if (!nextLine) break;
             let nextLineText = nextLine.texts.map(t=>t.text).join(' ').trim();
             if (nextLineText.match(/^(\[|^5\.|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)/)) {
                break;
             }
             allItemTexts = [...allItemTexts, ...nextLine.texts];
          }
          
          let jmlText = allItemTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
          let jmlMatch = jmlText.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/);
          
          let title = lineText.substring(0, 30);
          if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^(\[|^5\.|Sumber|Sub Kegiatan|Spesifikasi)/)) {
              title = prevLineObj.texts.map(t=>t.text).join(' ').substring(0, 30);
          }
          
          console.log(title.padEnd(30) + ' => Bucket: ' + (jmlMatch ? jmlMatch[0] : 'FAILED'));
      }
    }
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 2.22.02.2.02.0001 Pelindungan, Pengembangan, Pemanfaatan Objek Pemajuan Tradisi Budaya.pdf');
