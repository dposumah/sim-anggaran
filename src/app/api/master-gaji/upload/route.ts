export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

    // Buang baris pertama (header)
    const rawRows = data.slice(1).filter(r => r[0] && r[1]); 
    // Format Asumsi:
    // Kolom 0: Status (PNS / PPPK)
    // Kolom 1: Golongan (IIIa, IX, dsb)
    // Kolom 2: Masa Kerja (Angka)
    // Kolom 3: Gaji Pokok (Angka)

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'Data kosong atau format salah. Pastikan kolom Status dan Golongan terisi.' }, { status: 400 });
    }

    let inserted = 0;
    for (const r of rawRows) {
      const status = String(r[0]).trim().toUpperCase();
      const golongan = String(r[1]).trim();
      const masaKerja = parseInt(String(r[2]), 10) || 0;
      const gajiPokok = parseFloat(String(r[3])) || 0;

      if ((status === 'PNS' || status === 'PPPK') && golongan && gajiPokok > 0) {
        await prisma.masterGaji.upsert({
          where: {
            status_golongan_masaKerja: {
              status,
              golongan,
              masaKerja
            }
          },
          update: { gajiPokok },
          create: { status, golongan, masaKerja, gajiPokok }
        });
        inserted++;
      }
    }

    return NextResponse.json({ success: true, message: `Berhasil memproses ${inserted} data master gaji.` });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
