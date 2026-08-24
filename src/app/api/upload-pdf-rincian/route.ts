import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';
import { prisma } from '@/lib/prisma';

function cleanNumber(str: string) {
  if (!str || str.trim() === '-') return 0;
  return parseFloat(str.replace(/\./g, '').replace(/,/g, '.'));
}

/**
 * Dynamically detect the x-position of the "Jumlah" column header.
 * Scans allTexts for a text element containing "Jumlah" that appears
 * in the header area (typically first few lines of a page).
 * Returns the x-coordinate so we can use it to extract amounts.
 */
function detectJumlahColumnX(allTexts: any[]): number {
  // Look for "Jumlah" text that's on the right side of the page (x > 30)
  // and appears in the table header context
  for (const t of allTexts) {
    const text = t.text.trim();
    // Match "Jumlah" but not "Jumlah Anggaran" (which is a total row)
    if ((text === 'Jumlah' || text === 'Jumlah (Rp)') && t.x > 30) {
      return t.x;
    }
  }
  // Default fallback to the original known position
  return -1;
}

/**
 * Extract the "Jumlah" amount from text elements on a line/block.
 * Uses the detected jumlahX position with tolerance, with progressive fallbacks.
 */
function extractJumlah(texts: any[], jumlahX: number): number {
  const tolerance = 5; // Allow some variance in x-position
  
  // Strategy 1: Use detected column position (if available)
  if (jumlahX > 0) {
    let colTexts = texts.filter(t => Math.abs(t.x - jumlahX) <= tolerance);
    let colStr = colTexts.map(t => t.text).join(' ').trim();
    let match = colStr.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (match) return cleanNumber(match[0]);
    if (colStr === '-') return 0;
  }
  
  // Strategy 2: Try original hardcoded range (x >= 59, x < 67)
  {
    let colTexts = texts.filter(t => t.x >= 59 && t.x < 67);
    let colStr = colTexts.map(t => t.text).join(' ').trim();
    let match = colStr.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (match) return cleanNumber(match[0]);
    if (colStr === '-') return 0;
  }

  // Strategy 3: Slightly wider range (x >= 55, x < 72)
  {
    let colTexts = texts.filter(t => t.x >= 55 && t.x < 72);
    let colStr = colTexts.map(t => t.text).join(' ').trim();
    let match = colStr.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (match) return cleanNumber(match[0]);
  }

  // Strategy 4: Take the LAST number from right side (x >= 50), 
  // which should be "Jumlah" as the rightmost numeric column
  {
    let rightTexts = texts.filter(t => t.x >= 50).sort((a, b) => a.x - b.x);
    let allStr = rightTexts.map(t => t.text).join(' ').trim();
    let matches = allStr.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/g);
    if (matches && matches.length > 0) {
      return cleanNumber(matches[matches.length - 1]);
    }
  }

  // Strategy 5: Final fallback - scan ALL text for numbers, take second-to-last
  // (last is often a page total, second-to-last is the item jumlah)
  {
    let allStr = texts.map(t => t.text).join(' ');
    let matches = allStr.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/g);
    if (matches && matches.length >= 6) {
      return cleanNumber(matches[matches.length - 2]);
    }
    if (matches && matches.length > 0) {
      return cleanNumber(matches[matches.length - 1]);
    }
  }

  return 0;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tahapan = (formData.get('tahapan') as string) || 'perubahan';
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

    // Detect "Jumlah" column position dynamically
    const jumlahX = detectJumlahColumnX(allTexts);

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
    
    let parsingItem: any = null;

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
        // Extract school/item name from left side of [ - ] line (x < 25)
        // but do NOT capture the subtotal amount — let the detail line below set the amount
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
          let finalJumlah = extractJumlah(amountTexts, jumlahX);
          
          let leftTexts = itemLines.flatMap(l => l.texts.filter(t => t.x < 25)).map(t => t.text).join(' ').trim();
          let parts = leftTexts.split('Spesifikasi :');
          
          let extractedUraian = parts[0].trim();
          if (!extractedUraian && parsingItem) extractedUraian = parsingItem.uraian;
          
          let extractedSpesifikasi = parts[1] ? parts[1].trim() : '-';
          
          let finalItem: any = {
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
           let amountOnLine = extractJumlah(lineObj.texts, jumlahX);

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
           let amountOnLine = extractJumlah(lineObj.texts, jumlahX);
           if (amountOnLine > 0) parsingItem.tempJumlah = amountOnLine;
        }
      }
    }
    flushParsingItem();

    let existingPagu = 0;
    const kodeSubKeg = currentSubKegiatan.trim().split(' ')[0].replace(/[^0-9.]/g, '');
    if (kodeSubKeg) {
       const subKeg = await prisma.subKegiatan.findFirst({
         where: { kode: kodeSubKeg },
         include: { rincianBelanjas: true }
       });
       if (subKeg) {
          existingPagu = subKeg.rincianBelanjas.reduce((sum, r) => {
             let val: any = 0;
             if (tahapan === 'induk') val = r.paguInduk ?? 0;
             else if (tahapan === 'rkpd') val = r.paguRkpd ?? 0;
             else val = r.paguPerubahan ?? 0;
             
             // Fallback if the specific pagu is somehow empty but others exist
             if (Number(val) === 0) {
                 val = r.paguPerubahan ?? r.paguRkpd ?? r.paguInduk ?? 0;
             }
             
             return sum + Number(val);
          }, 0);
       }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        subKegiatan: currentSubKegiatan,
        existingPagu,
        items
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
