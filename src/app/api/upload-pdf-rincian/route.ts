import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // We only need to parse the first page to get the Sub Kegiatan code
    const parsedData = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on('pdfParser_dataError', errData => reject((errData as any).parserError));
      pdfParser.on('pdfParser_dataReady', pdfData => resolve(pdfData));
      pdfParser.parseBuffer(buffer);
    });

    let currentSubKegiatan = '';
    const pages = (parsedData as any).Pages;
    if (pages && pages.length > 0) {
      // Scan texts on the first page
      const firstPageTexts = pages[0].Texts;
      for (const t of firstPageTexts) {
        let text = '';
        try { text = decodeURIComponent(t.R[0].T); } catch { text = unescape(t.R[0].T); }
        text = text.trim();
        
        if (text.startsWith('Sub Kegiatan :')) {
          currentSubKegiatan = text.replace('Sub Kegiatan :', '').trim();
          break;
        } else if (text.match(/^:\s*\d\.\d\d\.\d\d\.\d\.\d\d\.\d\d\d\d/)) {
          currentSubKegiatan = text.replace(/^:\s*/, '').trim();
          break;
        }
      }
    }

    if (!currentSubKegiatan) {
      return NextResponse.json({ success: false, error: 'Tidak dapat menemukan header Sub Kegiatan di file PDF ini.' }, { status: 400 });
    }

    let existingPagu = 0;
    const kodeSubKeg = currentSubKegiatan.split(' ')[0].replace(/[^0-9.]/g, '');
    if (kodeSubKeg) {
       const subKeg = await prisma.subKegiatan.findFirst({
         where: { kode: kodeSubKeg },
         include: { rincianBelanjas: true }
       });
       if (subKeg) {
          const tahapan = (formData.get('tahapan') as string) || 'perubahan';
          existingPagu = subKeg.rincianBelanjas.reduce((sum, r) => {
             let val: any = 0;
             if (tahapan === 'induk') val = r.paguInduk ?? 0;
             else if (tahapan === 'rkpd') val = r.paguRkpd ?? 0;
             else val = r.paguPerubahan ?? 0;
             if (Number(val) === 0) val = r.paguPerubahan ?? r.paguRkpd ?? r.paguInduk ?? 0;
             return sum + Number(val);
          }, 0);
       }
    }

    // Notice we return items: [] so the UI doesn't crash if it expects an array
    return NextResponse.json({ 
      success: true, 
      data: {
        subKegiatan: currentSubKegiatan,
        existingPagu,
        items: [] 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
