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
    let currentPaket = '';
    let currentSumberDana = '';
    
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
        currentPaket = lineText.replace('[ # ]', '').trim();
      } else if (lineText.startsWith('Sumber Dana :')) {
        currentSumberDana = lineText.replace('Sumber Dana :', '').split(/ \d/)[0].trim();
      } else if (currentPaket && currentSumberDana && currentRekening && !lineText.includes('Satuan Kerja Perangkat Daerah') && !lineText.includes('Koefisien Satuan') && !lineText.startsWith('[ - ]')) {
        
        if (lineText.includes('Spesifikasi :')) {
          if (parsingItem) {
            let specStr = '-';
            parsingItem.spesifikasi = specStr;
            
            let allItemTexts = [...lineObj.texts];
            
            let prevLineObj = rawLines[i-1];
            if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^(\[|^5\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi)/)) {
               allItemTexts = [...prevLineObj.texts, ...allItemTexts];
            }
            
            // Gather all next lines that belong to this item (up to 5 lines ahead)
            for (let j = 1; j <= 5; j++) {
               let nextLine = rawLines[i+j];
               if (!nextLine) break;
               let nextLineText = nextLine.texts.map(t=>t.text).join(' ').trim();
               // Stop if we see a marker that indicates a new section or item
               if (nextLineText.match(/^(\[|^5\.\d+\.\d+|Sumber|Sub Kegiatan|Spesifikasi|Jumlah Anggaran)/)) {
                  break;
               }
               allItemTexts = [...allItemTexts, ...nextLine.texts];
            }
            
            // Extract just the Jumlah bucket (X > 59)
            let jmlText = allItemTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
            
            let jmlMatch = jmlText.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/);
            let finalJumlah = 0;
            if (jmlMatch) {
               finalJumlah = cleanNumber(jmlMatch[0]);
            } else {
               // Fallback: check raw text if bucket failed
               let fallbackMatches = lineText.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|-)/g);
               if (fallbackMatches && fallbackMatches.length >= 6) {
                  finalJumlah = cleanNumber(fallbackMatches[fallbackMatches.length - 2]);
               }
            }
            
            // Set defaults to ignore Koefisien/Satuan/Harga from PDF
            parsingItem.koefisien = '1';
            parsingItem.satuan = 'Ls';
            parsingItem.hargaSatuan = finalJumlah;
            parsingItem.jumlah = finalJumlah;
            parsingItem.ppn = 0;

            items.push(parsingItem);
            parsingItem = null;
          }
        } else if (!lineText.startsWith('[') && !lineText.match(/^5\.\d/) && lineText.length > 2) {
           // Might be uraian
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
