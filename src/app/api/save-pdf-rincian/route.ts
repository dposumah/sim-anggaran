import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const subKegiatanStr = formData.get('subKegiatan') as string;
    const tahapan = (formData.get('tahapan') as string) || 'perubahan';

    if (!file || !subKegiatanStr) {
      return NextResponse.json({ success: false, error: 'File atau data Sub Kegiatan tidak lengkap' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract Kode Sub Kegiatan
    const kodeSubKeg = subKegiatanStr.trim().split(' ')[0].replace(/[^0-9.]/g, '');

    // Cari Sub Kegiatan di DB
    let subKeg = await prisma.subKegiatan.findFirst({
      where: { kode: kodeSubKeg }
    });

    if (!subKeg) {
      return NextResponse.json({ success: false, error: 'Sub Kegiatan dengan kode ' + kodeSubKeg + ' tidak ditemukan di database. Pastikan Anda sudah mengupload Pagu Excel atau mendaftarkan Kegiatan/SubKegiatannya.' }, { status: 404 });
    }

    // Upsert the PDF file into the database
    await prisma.fileRincianPdf.upsert({
      where: {
        subKegiatanId_tahapan: {
          subKegiatanId: subKeg.id,
          tahapan: tahapan,
        }
      },
      update: {
        fileData: buffer,
        fileName: file.name,
        uploadedAt: new Date()
      },
      create: {
        subKegiatanId: subKeg.id,
        tahapan: tahapan,
        fileData: buffer,
        fileName: file.name
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'File PDF berhasil disimpan'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
