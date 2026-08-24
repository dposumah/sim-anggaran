import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subKegiatanId: string }> }
) {
  try {
    const { subKegiatanId: idStr } = await params;
    const subKegiatanId = parseInt(idStr);
    if (isNaN(subKegiatanId)) {
      return new NextResponse('Invalid ID', { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tahapan = searchParams.get('tahapan') || 'perubahan';

    const pdfRecord = await prisma.fileRincianPdf.findUnique({
      where: {
        subKegiatanId_tahapan: {
          subKegiatanId,
          tahapan,
        }
      }
    });

    if (!pdfRecord) {
      return new NextResponse('PDF tidak ditemukan', { status: 404 });
    }

    // Serve the file as application/pdf
    return new NextResponse(pdfRecord.fileData as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdfRecord.fileName || 'rincian.pdf'}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
