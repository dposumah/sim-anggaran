const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfPath = "C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja 1.01.01.2.08.0004 Penyediaa....pdf";

// Get actual filename
const files = fs.readdirSync("C:\\Users\\ASUS\\Downloads");
const actualFile = files.find(f => f.includes('Cetak RKA Rincian Belanja 1.01.01.2.08.0004'));
const fullPath = "C:\\Users\\ASUS\\Downloads\\" + actualFile;

const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    
    let allTexts = [];
    pdfData.Pages.forEach((page, pageIndex) => {
      let pageTexts = [];
      if (page.Texts) {
        page.Texts.forEach(t => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch { text = unescape(t.R[0].T); }
          pageTexts.push({ x: t.x, y: t.y + (pageIndex * 100), text });
        });
      }
      
      pageTexts.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 0.5) {
          return a.x - b.x;
        }
        return a.y - b.y;
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

    function cleanNumber(str) {
      if (!str || str.trim() === '-') return 0;
      const cleanStr = str.replace(/\./g, '').replace(/,/g, '.');
      const val = parseFloat(cleanStr);
      return isNaN(val) ? 0 : val;
    }

    let items = [];
    let currentSubKegiatan = '';
    let currentRekening = '';
    let currentNamaRekening = '';
    let currentPaket = '-';
    let currentSumberDana = '-';
    
    let parsingItem = null;

    function flushParsingItem() {
        if (parsingItem && parsingItem.tempJumlah > 0 && !parsingItem.uraian.includes('Jumlah Anggaran') && !parsingItem.uraian.includes('SIPD-RI')) {
            parsingItem.hargaSatuan = parsingItem.tempJumlah;
            parsingItem.jumlah = parsingItem.tempJumlah;
            delete parsingItem.tempJumlah;
            items.push(parsingItem);
        }
        parsingItem = null;
    }

    for (let i = 0; i < rawLines.length; i++) {
      let lineObj = rawLines[i];
      let lineText = lineObj.texts.map(t => t.text).join(' ').trim();
      let hasLeftText = lineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
      
      if (lineText.startsWith('Sub Kegiatan :')) { flushParsingItem(); currentSubKegiatan = lineText.replace('Sub Kegiatan :', '').trim(); } else if (lineText.match(/^:\s*\d\.\d\d\.\d\d\.\d\.\d\d\.\d\d\d\d/)) { flushParsingItem(); currentSubKegiatan = lineText.replace(/^:\s*/, '').trim(); } else if (lineText.match(/^5\.\d+\.\d+\.\d+\.\d+\.\d+\s+/)) {
        flushParsingItem();
        let parts = lineText.split(' ');
        currentRekening = parts[0];
        currentNamaRekening = parts.slice(1).join(' ').split(/ \d/)[0].trim();
      } else if (lineText.startsWith('[ # ]')) {
        flushParsingItem();
        currentPaket = lineText.replace('[ # ]', '').trim() || '-';
      } else if (lineText.startsWith('Sumber Dana :')) {
        parsingItem = null;
        currentSumberDana = lineText.replace('Sumber Dana :', '').split(/ \d/)[0].trim() || '-';
      } else if (lineText.startsWith('[ - ]')) {
        flushParsingItem();
        if (currentRekening) {
          let bracketLeftTexts = lineObj.texts.filter(t => t.x < 25).map(t => t.text).join(' ').trim();
          let schoolName = bracketLeftTexts.replace(/^\[\s*-\s*\]\s*/, '').trim();
          if (schoolName && schoolName.length > 1) {
            parsingItem = {
              rekening: currentRekening,
              namaRekening: currentNamaRekening,
              paket: currentPaket,
              sumberDana: currentSumberDana,
              uraian: schoolName,
              spesifikasi: '-',
              koefisien: '1',
              satuan: 'Ls',
              tempJumlah: 0,
              ppn: 0
            };
          }
        }
      } else if (lineText.startsWith('SIPD-RI') || lineText.startsWith('Jumlah Anggaran') || lineText.startsWith('Rincian Anggaran') || lineText.startsWith('Satuan Kerja') || lineText.startsWith('Kode Rekening') || lineText.startsWith('Rincian Perhitungan')) { continue; } else if (currentRekening && !lineText.includes('Satuan Kerja Perangkat Daerah') && !lineText.includes('Koefisien Satuan')) {
        
        if (lineText.includes('Spesifikasi :')) {
          let itemLines = [lineObj];
          let foundLeftText = false;
          for (let b = 1; b <= 4; b++) {
              let pLine = rawLines[i-b];
              if (!pLine) break;
              let pText = pLine.texts.map(t=>t.text).join(' ').trim();
              if (pText.match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) break;
              
              let hasLeft = pLine.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
              if (hasLeft) {
                  foundLeftText = true;
                  itemLines.unshift(pLine);
              } else {
                  if (foundLeftText) {
                      break;
                  } else {
                      itemLines.unshift(pLine);
                  }
              }
          }

          for (let j = 1; j <= 5; j++) {
             let nextLine = rawLines[i+j];
             if (!nextLine) break;
             let nextText = nextLine.texts.map(t=>t.text).join(' ').trim();
             
             let hasLeft = nextLine.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
             if (hasLeft && nextText.length > 2 && !nextText.match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan)/)) {
                 itemLines.push(nextLine);
             } else {
                 break;
             }
          }

          let rightTexts = itemLines.flatMap(l => l.texts.filter(t => t.x >= 59 && t.x < 67)).map(t => t.text).join(' ').trim();
          let jmlMatch = rightTexts.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
          let finalJumlah = jmlMatch ? cleanNumber(jmlMatch[0]) : 0;
          
          let leftTexts = itemLines.flatMap(l => l.texts.filter(t => t.x < 25)).map(t => t.text).join(' ').trim();
          let parts = leftTexts.split('Spesifikasi :');
          
          let extractedUraian = parts[0].trim();
          if (!extractedUraian && parsingItem) extractedUraian = parsingItem.uraian;
          
          let extractedSpesifikasi = parts[1] ? parts[1].trim() : '-';
          
          let finalItem = {
             rekening: currentRekening,
             namaRekening: currentNamaRekening,
             paket: currentPaket,
             sumberDana: currentSumberDana,
             uraian: extractedUraian,
             spesifikasi: extractedSpesifikasi,
             koefisien: '1',
             satuan: 'Ls',
             hargaSatuan: finalJumlah,
             jumlah: finalJumlah,
             ppn: 0
          };

          items.push(finalItem);
          parsingItem = null;
          
          let lastLookaheadLine = itemLines[itemLines.length - 1];
          let lastIndex = rawLines.indexOf(lastLookaheadLine);
          if (lastIndex > i) {
              i = lastIndex;
          }
        } else if (hasLeftText && !lineText.match(/^5\.\d/) && lineText.length > 2) {
           let leftOnlyTexts = lineObj.texts.filter(t => t.x < 25).map(t => t.text).join(' ').trim();
           
           let rightTexts = lineObj.texts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
           let jmlMatch = rightTexts.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/);
           let amountOnLine = jmlMatch ? cleanNumber(jmlMatch[0]) : 0;

           if (parsingItem) {
                 if (parsingItem.tempJumlah > 0) {
                     flushParsingItem();
                     parsingItem = {
                         rekening: currentRekening,
                         namaRekening: currentNamaRekening,
                         paket: currentPaket,
                         sumberDana: currentSumberDana,
                         uraian: leftOnlyTexts,
                         spesifikasi: '',
                         jumlah: 0,
                         tempJumlah: amountOnLine
                     };
                 } else {
                     parsingItem.uraian += ' ' + leftOnlyTexts;
                     if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
                 }
             } else {
               parsingItem = {
                 rekening: currentRekening,
                 namaRekening: currentNamaRekening,
                 paket: currentPaket,
                 sumberDana: currentSumberDana,
                 uraian: leftOnlyTexts,
                 spesifikasi: '-',
                 koefisien: '1',
                 satuan: 'Ls',
                 tempJumlah: amountOnLine,
                 ppn: 0
               };
           }
        } else if (!hasLeftText && parsingItem) {
           let rightTexts = lineObj.texts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
           let jmlMatch = rightTexts.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
           if (jmlMatch) {
               let amountOnLine = cleanNumber(jmlMatch[0]);
               if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
           }
        }
      }
    }
    flushParsingItem();

    console.log("Found items:", items.length);
    if (items.length > 0) {
        console.log("First 2 items:");
        console.log(items.slice(0, 2));
    }
});

pdfParser.loadPDF(fullPath);
