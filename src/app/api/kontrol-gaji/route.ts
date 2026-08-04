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

    const REKENING_PNS = ['5.1.02.01.01.0001', '5.1.02.01.01.0002', '5.1.02.01.01.0003', '5.1.02.01.01.0004', '5.1.02.01.01.0005', '5.1.02.01.01.0006', '5.1.02.01.01.0007', '5.1.02.01.01.0008', '5.1.02.01.01.0009', '5.1.02.01.01.0010'];
    const REKENING_PPPK = ['5.1.02.01.01.0011', '5.1.02.01.01.0012', '5.1.02.01.01.0013', '5.1.02.01.01.0014', '5.1.02.01.01.0015', '5.1.02.01.01.0016', '5.1.02.01.01.0017', '5.1.02.01.01.0018', '5.1.02.01.01.0019', '5.1.02.01.01.0020'];

    // 3. Ambil data dari RincianBelanja (Excel)
    const rincian = await prisma.rincianBelanja.findMany({
      where: { subKegiatan: { kegiatan: { program: { skpdId: { in: skpdIds } } } } },
      select: {
        subKegiatanId: true,
        paguInduk: true,
        paguRkpd: true,
        paguPerubahan: true,
        rekening: { select: { kode: true, nama: true } },
        subKegiatan: {
          select: {
            kegiatan: { select: { program: { select: { skpdId: true } } } }
          }
        }
      }
    });

    // Kalkulasi per SKPD
    const excelDataMap = new Map();
    
    rincian.forEach(r => {
      const skpdId = r.subKegiatan.kegiatan.program.skpdId;
      if (!skpdId) return;

      if (!excelDataMap.has(skpdId)) {
        excelDataMap.set(skpdId, { 
          pnsInduk: 0, pnsPerubahan: 0, 
          pppkInduk: 0, pppkPerubahan: 0,
          pnsBreakdown: new Map(),
          pppkBreakdown: new Map()
        });
      }
      
      const stat = excelDataMap.get(skpdId);
      
      const isPns = REKENING_PNS.some(k => r.rekening?.kode.startsWith(k));
      const isPppk = REKENING_PPPK.some(k => r.rekening?.kode.startsWith(k));

      const valInduk = Number(r.paguInduk || 0);
      const valPerubahan = Number(r.paguPerubahan !== null ? r.paguPerubahan : valInduk);
      
      const bKey = r.rekening?.nama || 'Tidak Diketahui';

      if (isPppk) {
        stat.pppkInduk += valInduk;
        stat.pppkPerubahan += valPerubahan;
        const b = stat.pppkBreakdown.get(bKey) || { induk: 0, perubahan: 0 };
        b.induk += valInduk;
        b.perubahan += valPerubahan;
        stat.pppkBreakdown.set(bKey, b);
      }
      
      if (isPns) {
        stat.pnsInduk += valInduk;
        stat.pnsPerubahan += valPerubahan;
        const b = stat.pnsBreakdown.get(bKey) || { induk: 0, perubahan: 0 };
        b.induk += valInduk;
        b.perubahan += valPerubahan;
        stat.pnsBreakdown.set(bKey, b);
      }
    });

    // 4. Gabungkan Data
    const result = skpds.map(skpd => {
      const kg = kontrolMap.get(skpd.id);
      const ed = excelDataMap.get(skpd.id) || { 
        pnsInduk: 0, pnsPerubahan: 0, pppkInduk: 0, pppkPerubahan: 0,
        pnsBreakdown: new Map(), pppkBreakdown: new Map() 
      };

      return {
        skpdId: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        targetPns: kg ? Number(kg.targetPns || 0) : 0,
        targetPppk: kg ? Number(kg.targetPppk || 0) : 0,
        excelPnsInduk: ed.pnsInduk,
        excelPnsPerubahan: ed.pnsPerubahan,
        excelPppkInduk: ed.pppkInduk,
        excelPppkPerubahan: ed.pppkPerubahan,
        pnsBreakdown: Array.from(ed.pnsBreakdown.entries()).map(([rekening, vals]: any) => ({ rekening, ...vals })),
        pppkBreakdown: Array.from(ed.pppkBreakdown.entries()).map(([rekening, vals]: any) => ({ rekening, ...vals }))
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
