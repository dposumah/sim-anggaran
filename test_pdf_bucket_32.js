const fs = require('fs');
const PDFParser = require('pdf2json');

function cleanNumber(str) {
  if (!str || str.trim() === '-') return 0;
  return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'));
}

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

    let items = [];
    let currentSubKegiatan = '';
    let currentRekening = '';
    let currentNamaRekening = '';
    let currentPaket = '-';
    let currentSumberDana = '-';
    let parsingItem = null;

    function flushParsingItem() {
        if (parsingItem) {
            let amountTexts = parsingItem.rawLines.flatMap(l => l.texts);
            let jmlText = amountTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
            let jmlMatch = jmlText.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/);
            let finalJumlah = 0;
            if (jmlMatch) {
                finalJumlah = cleanNumber(jmlMatch[0]);
            } else {
                let fallbackMatches = amountTexts.map(t=>t.text).join(' ').match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/g);
                if (fallbackMatches && fallbackMatches.length >= 6) {
                    finalJumlah = cleanNumber(fallbackMatches[fallbackMatches.length - 2]);
                }
            }
            parsingItem.hargaSatuan = finalJumlah;
            parsingItem.jumlah = finalJumlah;
            
            console.log('FLUSHED:', parsingItem.uraian.substring(0, 50).padEnd(50) + ' => ' + finalJumlah);
            items.push(parsingItem);
            parsingItem = null;
        }
    }

    for (let i = 0; i < rawLines.length; i++) {
      let lineObj = rawLines[i];
      let lineText = lineObj.texts.map(t => t.text).join(' ').trim();
      let hasLeftText = lineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
      
      if (lineText.startsWith('Sub Kegiatan :')) {
        flushParsingItem();
        currentSubKegiatan = lineText.replace('Sub Kegiatan :', '').trim();
      } else if (lineText.match(/^5\.\d+\.\d+\.\d+\.\d+\.\d+\s+/)) {
        flushParsingItem();
        let parts = lineText.split(' ');
        currentRekening = parts[0];
        currentNamaRekening = parts.slice(1).join(' ').split(/ \d/)[0].trim();
      } else if (lineText.startsWith('[ # ]')) {
        flushParsingItem();
        currentPaket = lineText.replace('[ # ]', '').trim() || '-';
      } else if (lineText.startsWith('Sumber Dana :')) {
        flushParsingItem();
        currentSumberDana = lineText.replace('Sumber Dana :', '').split(/ \d/)[0].trim() || '-';
      } else if (lineText.startsWith('[ - ]')) {
        flushParsingItem();
      } else if (currentRekening && !lineText.includes('Satuan Kerja Perangkat Daerah') && !lineText.includes('Koefisien Satuan')) {
        
        if (lineText.includes('Spesifikasi :')) {
          if (parsingItem) {
            let itemLines = [...parsingItem.rawLines, lineObj];
            
            for (let j = 1; j <= 5; j++) {
               let nextLine = rawLines[i+j];
               if (!nextLine) break;
               let nextLineText = nextLine.texts.map(t=>t.text).join(' ').trim();
               if (nextLineText.match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)/)) break;
               
               let isNewUraian = false;
               let hasLeft = nextLine.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
               if (hasLeft) {
                   for (let k = 1; k <= 2; k++) {
                       let checkLine = rawLines[i+j+k];
                       if (checkLine && checkLine.texts.map(t=>t.text).join(' ').includes('Spesifikasi :')) {
                           isNewUraian = true;
                           break;
                       }
                   }
               }
               if (isNewUraian) break;
               itemLines.push(nextLine);
            }
            
            let amountTexts = itemLines.flatMap(l => l.texts);
            let jmlText = amountTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
            let jmlMatch = jmlText.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/);
            let finalJumlah = 0;
            if (jmlMatch) {
                finalJumlah = cleanNumber(jmlMatch[0]);
            } else {
                let fallbackMatches = amountTexts.map(t=>t.text).join(' ').match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/g);
                if (fallbackMatches && fallbackMatches.length >= 6) {
                    finalJumlah = cleanNumber(fallbackMatches[fallbackMatches.length - 2]);
                }
            }
            
            let leftTexts = itemLines.flatMap(l => l.texts.filter(t => t.x < 25)).map(t => t.text).join(' ').trim();
            let parts = leftTexts.split('Spesifikasi :');
            
            let extractedUraian = parts[0].trim();
            if (!extractedUraian) extractedUraian = parsingItem.uraian;
            
            let extractedSpesifikasi = parts[1] ? parts[1].trim() : '-';
            
            parsingItem.uraian = extractedUraian;
            parsingItem.spesifikasi = extractedSpesifikasi;
            parsingItem.koefisien = '1';
            parsingItem.satuan = 'Ls';
            parsingItem.hargaSatuan = finalJumlah;
            parsingItem.jumlah = finalJumlah;
            parsingItem.ppn = 0;

            console.log('SPESIFIKASI:', parsingItem.uraian.substring(0, 50).padEnd(50) + ' => ' + finalJumlah);
            items.push(parsingItem);
            parsingItem = null;
          }
        } else if (hasLeftText && !lineText.match(/^5\.\d/) && lineText.length > 2) {
           let leftOnlyTexts = lineObj.texts.filter(t => t.x < 25).map(t => t.text).join(' ').trim();
           if (parsingItem) {
               parsingItem.uraian += ' ' + leftOnlyTexts;
               parsingItem.rawLines.push(lineObj);
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
                 hargaSatuan: 0,
                 ppn: 0,
                 jumlah: 0,
                 rawLines: [lineObj]
               };
           }
        } else if (parsingItem) {
           // even if no left text, if it's not a boundary, it might contain amount data for the current item!
           parsingItem.rawLines.push(lineObj);
        }
      }
    }
    flushParsingItem(); // at the end
    
    const total = items.reduce((sum, r) => sum + r.jumlah, 0);
    console.log('TOTAL:', total);
});
pdfParser.loadPDF('C:\\Users\\ASUS\\Downloads\\Sistem Informasi Pemerintahan Daerah - Cetak RKA Rincian Belanja _ 1.01.01.2.08.0004 Penyediaan Jasa Pelayanan Umum Kantor (1).pdf');
