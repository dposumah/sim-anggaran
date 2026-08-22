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
    (parsedData as any).Pages.forEach((page: any) => {
      let pageTexts: any[] = [];
      if (page.Texts) {
        page.Texts.forEach((t: any) => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch { text = unescape(t.R[0].T); }
          pageTexts.push({ x: t.x, y: t.y, text });
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
            let specStr = lineText.split('Spesifikasi :')[1].trim().split(' ')[0] || '-';
            parsingItem.spesifikasi = specStr;
            
            // To extract Sesudah (After) values, we look at the specific X coordinates for this line and the line BEFORE it.
            // Because koefisien can be on the line above (e.g. 157240).
            let prevLineObj = rawLines[i-1];
            let nextLineObj = rawLines[i+1];
            
            let allItemTexts = [...lineObj.texts];
            // If prev line doesn't start with '[', '5.', 'Sumber', etc, it might contain the Koefisien
            if (prevLineObj && !prevLineObj.texts.map(t=>t.text).join(' ').match(/^([\[5]|Sumber|Sub Kegiatan|Spesifikasi)/)) {
               allItemTexts = [...prevLineObj.texts, ...allItemTexts];
            }
            // If next line contains part of the item (like "Hari" or "Kali" or values), include it too if it doesn't look like a new Uraian
            if (nextLineObj && !nextLineObj.texts.map(t=>t.text).join(' ').match(/^([\[5]|Sumber|Sub Kegiatan|Spesifikasi)/) && nextLineObj.texts.length < 10) {
               allItemTexts = [...allItemTexts, ...nextLineObj.texts];
            }
            
            // Extract from buckets (Rincian Perhitungan Sesudah: X > 44)
            let koefText = allItemTexts.filter(t => t.x >= 44 && t.x < 48.5).map(t => t.text).join(' ').trim();
            let satText = allItemTexts.filter(t => t.x >= 48.5 && t.x < 52.5).map(t => t.text).join(' ').trim();
            let hrgText = allItemTexts.filter(t => t.x >= 52.5 && t.x < 56.5).map(t => t.text).join(' ').trim();
            let ppnText = allItemTexts.filter(t => t.x >= 56.5 && t.x < 59).map(t => t.text).join(' ').trim();
            let jmlText = allItemTexts.filter(t => t.x >= 59 && t.x < 67).map(t => t.text).join(' ').trim();
            
            // Clean up overlapping words in Satuan like "Orang / Hari" vs "Hari"
            if (koefText) parsingItem.koefisien = koefText;
            if (satText) parsingItem.satuan = satText;
            
            // For prices, we can just pick the first currency match inside the bucket string
            let hrgMatch = hrgText.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/);
            if (hrgMatch) parsingItem.hargaSatuan = cleanNumber(hrgMatch[0]);
            
            let ppnMatch = ppnText.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/);
            if (ppnMatch) parsingItem.ppn = cleanNumber(ppnMatch[0]);
            
            let jmlMatch = jmlText.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/);
            if (jmlMatch) parsingItem.jumlah = cleanNumber(jmlMatch[0]);
            
            // If the buckets somehow missed the values, fallback to regex on lineText
            if (!hrgMatch || !jmlMatch) {
               let fallbackMatches = lineText.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/g);
               if (fallbackMatches && fallbackMatches.length >= 6) {
                  parsingItem.hargaSatuan = cleanNumber(fallbackMatches[fallbackMatches.length - 4]);
                  parsingItem.jumlah = cleanNumber(fallbackMatches[fallbackMatches.length - 2]);
               }
            }
            
            // If koefisien empty, fallback to 1
            if (!parsingItem.koefisien || parsingItem.koefisien === '-') {
                parsingItem.koefisien = '1';
                parsingItem.satuan = 'Ls';
            }

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
