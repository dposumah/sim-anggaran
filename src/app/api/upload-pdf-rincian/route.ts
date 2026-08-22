import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

function cleanNumber(str: string) {
  if (!str || str.trim() === '-') return 0;
  return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedData = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on('pdfParser_dataError', errData => reject((errData as any).parserError));
      pdfParser.on('pdfParser_dataReady', pdfData => resolve(pdfData));
      pdfParser.parseBuffer(buffer);
    });

    let allTexts: any[] = [];
    (parsedData as any).Pages.forEach((page: any, pageIndex: number) => {
      let pageTexts: any[] = [];
      if (page.Texts) {
        page.Texts.forEach((t: any) => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch { text = unescape(t.R[0].T); }
          pageTexts.push({ x: t.x, y: t.y + (pageIndex * 100), text });
        });
      }
      pageTexts.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.5) return a.y - b.y;
        return a.x - b.x;
      });
      allTexts.push(...pageTexts);
    });

    let rawLines: { y: number, texts: any[] }[] = [];
    let currentLineTexts: any[] = [];
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


    let items = [];
    let currentSubKegiatan = '';
    let currentRekening = '';
    let currentNamaRekening = '';
    let currentPaket = '-';
    let currentSumberDana = '-';
    
    let parsingItem = null;

    for (let i = 0; i < rawLines.length; i++) {
      let lineObj = rawLines[i];
      let lineText = lineObj.texts.map(t => t.text).join(' ').trim();
      
      if (lineText.startsWith('Sub Kegiatan :')) {
        currentSubKegiatan = lineText.replace('Sub Kegiatan :', '').trim();
      } else if (lineText.match(/^5\.\d+\.\d+\.\d+\.\d+\.\d+\s+/)) {
        let parts = lineText.split(' ');
        currentRekening = parts[0];
        currentNamaRekening = parts.slice(1).join(' ').split(/ \d/)[0].trim();
      } else if (lineText.startsWith('[ # ]')) {
        currentPaket = lineText.replace('[ # ]', '').trim() || '-';
      } else if (lineText.startsWith('Sumber Dana :')) {
        currentSumberDana = lineText.replace('Sumber Dana :', '').split(/ \d/)[0].trim() || '-';
      } else if (currentRekening && !lineText.includes('Satuan Kerja Perangkat Daerah') && !lineText.includes('Koefisien Satuan') && !lineText.startsWith('[ - ]')) {
        
        if (lineText.includes('Spesifikasi :')) {
          if (parsingItem) {
            let itemLines = [lineObj];
            
            let prevLineObj = rawLines[i-1];
            if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').trim().match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
               let hasLeftText = prevLineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
               if (hasLeftText) {
                   itemLines.unshift(prevLineObj);
                   let prev2LineObj = rawLines[i-2];
                   if (prev2LineObj && !prev2LineObj.texts.map(t=>t.text).join(' ').trim().match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
                       if (prev2LineObj.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/))) {
                          itemLines.unshift(prev2LineObj);
                       }
                   }
               }
            }
            
            for (let j = 1; j <= 5; j++) {
               let nextLine = rawLines[i+j];
               if (!nextLine) break;
               let nextLineText = nextLine.texts.map(t=>t.text).join(' ').trim();
               if (nextLineText.match(/^(\[|^5\.\d+\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)/)) break;
               
               let isNewUraian = false;
               let hasLeftText = nextLine.texts.some(t => t.x < 25 && t.text.match(/[a-zA-Z]/));
               if (hasLeftText) {
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
            let extractedUraian = parts[0].trim() || parsingItem.uraian;
            let extractedSpesifikasi = parts[1] ? parts[1].trim() : '-';
            
            parsingItem.uraian = extractedUraian;
            parsingItem.spesifikasi = extractedSpesifikasi;
            parsingItem.koefisien = '1';
            parsingItem.satuan = 'Ls';
            parsingItem.hargaSatuan = finalJumlah;
            parsingItem.jumlah = finalJumlah;
            parsingItem.ppn = 0;

            items.push(parsingItem);
            parsingItem = null;
          }
        } else if (!lineText.startsWith('[') && !lineText.match(/^5\.\d/) && lineText.length > 2) {
           parsingItem = {
             rekening: currentRekening,
             namaRekening: currentNamaRekening,
             paket: currentPaket,
             sumberDana: currentSumberDana,
             uraian: lineText.split(/ \d/)[0].trim(),
             spesifikasi: '-',
             koefisien: '1',
             satuan: 'Ls',
             hargaSatuan: 0,
             ppn: 0,
             jumlah: 0
           };
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        subKegiatan: currentSubKegiatan,
        items
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
