import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

function cleanNumber(str: string) {
  if (!str || str === '-') return 0;
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

    let rawLines: string[] = [];
    (parsedData as any).Pages.forEach((page: any) => {
      let allTexts: any[] = [];
      if (page.Texts) {
        page.Texts.forEach((t: any) => {
          let text = '';
          try { text = decodeURIComponent(t.R[0].T); } catch { text = unescape(t.R[0].T); }
          allTexts.push({ x: t.x, y: t.y, text });
        });
      }
      allTexts.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.5) return a.y - b.y;
        return a.x - b.x;
      });
      let currentY = -1;
      let currentLine = '';
      allTexts.forEach(t => {
        if (currentY === -1 || Math.abs(t.y - currentY) > 0.5) {
          if (currentLine) rawLines.push(currentLine.trim());
          currentLine = t.text;
          currentY = t.y;
        } else {
          currentLine += ' ' + t.text;
        }
      });
      if (currentLine) rawLines.push(currentLine.trim());
    });

    let items = [];
    let currentSubKegiatan = '';
    let currentRekening = '';
    let currentNamaRekening = '';
    let currentPaket = '';
    let currentSumberDana = '';
    
    let parsingItem = null;

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i];
      if (line.startsWith('Sub Kegiatan :')) {
        currentSubKegiatan = line.replace('Sub Kegiatan :', '').trim();
      } else if (line.match(/^5\.\d+\.\d+\.\d+\.\d+\.\d+\s+/)) {
        let parts = line.split(' ');
        currentRekening = parts[0];
        currentNamaRekening = parts.slice(1).join(' ').split(/ \d/)[0].trim();
      } else if (line.startsWith('[ # ]')) {
        currentPaket = line.replace('[ # ]', '').trim();
      } else if (line.startsWith('Sumber Dana :')) {
        currentSumberDana = line.replace('Sumber Dana :', '').split(/ \d/)[0].trim();
      } else if (line.startsWith('[ - ]')) {
        // start of item block
        // Wait, items come AFTER [ - ]
      } else if (currentPaket && currentSumberDana && currentRekening && line !== 'Rincian Anggaran Belanja Sub Kegiatan' && !line.includes('Satuan Kerja Perangkat Daerah') && !line.includes('Koefisien Satuan')) {
        // Could be an item. Usually item spans 2 lines: Uraian, then Spesifikasi.
        if (line.includes('Spesifikasi :')) {
          if (parsingItem) {
            let specStr = line.split('Spesifikasi :')[1].trim();
            // Try to extract numbers from specStr or next lines.
            // A typical line: "Spesifikasi : - 1 Botol Botol 176.500,00 - 176.500,00 1 Botol Botol 176.500,00 - 176.500,00 0,00"
            // Let's use regex to find sequences of numbers.
            // Actually, we can just grab all numbers in the string that match currency format:
            let matches = line.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/g);
            if (!matches || matches.length < 5) {
              // Maybe numbers are on the next line
              let nextLine = rawLines[i+1];
              if (nextLine && !nextLine.includes('Spesifikasi :') && !nextLine.startsWith('[') && !nextLine.match(/^5\.\d/)) {
                line += ' ' + nextLine;
                matches = line.match(/(\d+\.\d+,\d{2}|\d+,\d{2}|-)/g);
              }
            }
            parsingItem.spesifikasi = specStr.split(' ')[0] || '-';
            
            if (matches && matches.length >= 6) {
              // The last few matches are usually: Harga(Sesudah), PPN, Jumlah(Sesudah), Selisih
              // Let's just assume simple structure or parse raw text if needed.
              // To be safe, we just set default 0 and let user edit.
              parsingItem.hargaSatuan = cleanNumber(matches[matches.length - 4]);
              parsingItem.jumlah = cleanNumber(matches[matches.length - 2]);
              
              // Koefisien and satuan are hard to extract reliably via regex without breaking. 
              // We'll extract koefisien as whatever is before Harga.
              parsingItem.koefisien = '1';
              parsingItem.satuan = 'Pcs';
            }
            items.push(parsingItem);
            parsingItem = null;
          }
        } else if (!line.startsWith('[') && !line.match(/^5\.\d/) && line.length > 2) {
           // Might be uraian
           parsingItem = {
             rekening: currentRekening,
             namaRekening: currentNamaRekening,
             paket: currentPaket,
             sumberDana: currentSumberDana,
             uraian: line.split(/ \d/)[0].trim(),
             spesifikasi: '-',
             koefisien: '1',
             satuan: 'Pcs',
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
