import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // 1. Ambil SKPD Pendidikan
    const skpds = await prisma.skpd.findMany({
      where: { 
        tahunId: tahunData.id,
        nama: { contains: 'PENDIDIKAN', mode: 'insensitive' }
      },
      orderBy: { kode: 'asc' }
    });

    const skpdIds = skpds.map(s => s.id);

    // 2. Ambil data KontrolGaji
    const kontrolGajis = await prisma.kontrolGaji.findMany({
      where: {
        skpdId: { in: skpdIds },
        tahunId: tahunData.id
      }
    });

    const kontrolMap = new Map();
    kontrolGajis.forEach(kg => {
      kontrolMap.set(kg.skpdId, kg);
    });

    // 3. Ambil data dari RincianBelanja (Excel) untuk Gaji PNS dan PPPK
    // Filter SubKegiatan "Penyediaan Gaji dan Tunjangan" (biasanya mengandung kata ini)
    const subKegiatans = await prisma.subKegiatan.findMany({
      where: {
        kegiatan: { program: { skpdId: { in: skpdIds } } },
        nama: { contains: 'Gaji dan Tunjangan', mode: 'insensitive' }
      },
      select: { id: true, kegiatan: { select: { program: { select: { skpdId: true } } } } }
    });

    const subKegiatanMap = new Map();
    subKegiatans.forEach(sk => {
      subKegiatanMap.set(sk.id, sk.kegiatan.program.skpdId);
    });

    const rincianGaji = await prisma.rincianBelanja.findMany({
      where: {
        subKegiatanId: { in: subKegiatans.map(sk => sk.id) },
        OR: [
          { namaPaket: { contains: 'PNS', mode: 'insensitive' } },
          { namaPaket: { contains: 'PPPK', mode: 'insensitive' } },
          { rekening: { nama: { contains: 'PNS', mode: 'insensitive' } } },
          { rekening: { nama: { contains: 'PPPK', mode: 'insensitive' } } }
        ]
      },
      select: { subKegiatanId: true, namaPaket: true, pagu: true, paguPerubahan: true, rekening: { select: { nama: true } } }
    });

    // Daftar paket resmi
    const validPnsPackages = [
      'Belanja Gaji Pokok PNS',
      'Belanja Tunjangan Keluarga PNS',
      'Belanja Tunjangan Jabatan PNS',
      'Belanja Tunjangan Fungsional PNS',
      'Belanja Tunjangan Fungsional Umum PNS',
      'Belanja Tunjangan Beras PNS',
      'Belanja Tunjangan PPh/Tunjangan Khusus PNS',
      'Belanja Pembulatan Gaji PNS',
      'Belanja Iuran Jaminan Kesehatan PNS',
      'Belanja Iuran Jaminan Kecelakaan Kerja PNS',
      'Belanja Iuran Jaminan Kematian PNS'
    ].map(s => s.toUpperCase());

    const validPppkPackages = validPnsPackages.map(s => s.replace('PNS', 'PPPK'));

    // Kalkulasi per SKPD
    const excelDataMap = new Map();
    
    rincianGaji.forEach(r => {
      const skpdId = subKegiatanMap.get(r.subKegiatanId);
      if (!skpdId) return;

      if (!excelDataMap.has(skpdId)) {
        excelDataMap.set(skpdId, { pnsInduk: 0, pnsPerubahan: 0, pppkInduk: 0, pppkPerubahan: 0 });
      }
      
      const stat = excelDataMap.get(skpdId);
      const namaPaket = r.namaPaket.trim().toUpperCase();
      const namaRekening = r.rekening?.nama?.trim().toUpperCase() || '';
      
      // Check if either namaPaket or namaRekening matches the valid packages
      const isPns = validPnsPackages.some(vp => namaPaket.includes(vp) || namaRekening.includes(vp));
      const isPppk = validPppkPackages.some(vp => namaPaket.includes(vp) || namaRekening.includes(vp));

      const valInduk = Number(r.pagu || 0);
      const valPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : valInduk;

      if (isPppk) {
        stat.pppkInduk += valInduk;
        stat.pppkPerubahan += valPerubahan;
      } else if (isPns) {
        // Fallback to PNS if it contains PNS but not PPPK
        stat.pnsInduk += valInduk;
        stat.pnsPerubahan += valPerubahan;
      }
    });

    // 4. Gabungkan Data
    const result = skpds.map(skpd => {
      const kg = kontrolMap.get(skpd.id);
      const ed = excelDataMap.get(skpd.id) || { pnsInduk: 0, pnsPerubahan: 0, pppkInduk: 0, pppkPerubahan: 0 };

      return {
        skpdId: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        targetPns: kg ? Number(kg.targetPns || 0) : 0,
        targetPppk: kg ? Number(kg.targetPppk || 0) : 0,
        excelPnsInduk: ed.pnsInduk,
        excelPnsPerubahan: ed.pnsPerubahan,
        excelPppkInduk: ed.pppkInduk,
        excelPppkPerubahan: ed.pppkPerubahan
      };
    });

    return NextResponse.json({
      tahun: tahunData,
      data: result
    });
  } catch (error: any) {
    console.error('Error GET kontrol-gaji:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skpdId, tahunId, targetPns, targetPppk } = body;

    if (!skpdId || !tahunId) {
      return NextResponse.json({ error: 'skpdId dan tahunId diperlukan' }, { status: 400 });
    }

    const upserted = await prisma.kontrolGaji.upsert({
      where: {
        skpdId_tahunId: { skpdId, tahunId }
      },
      update: {
        targetPns: targetPns,
        targetPppk: targetPppk
      },
      create: {
        skpdId,
        tahunId,
        targetPns: targetPns,
        targetPppk: targetPppk
      }
    });

    return NextResponse.json({ success: true, data: upserted });
  } catch (error: any) {
    console.error('Error POST kontrol-gaji:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
