import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const JASA_CATEGORIES = [
  { name: 'PPPK Paruh Waktu', keywords: ['PARUH WAKTU'] },
  { name: 'Jaminan Kesehatan', keywords: ['JAMINAN KESEHATAN'] },
  { name: 'Jaminan Kematian & Kecelakaan', keywords: ['JAMINAN KECELAKAAN', 'JAMINAN KEMATIAN'] },
  { name: 'Pengelola Keuangan', keywords: ['PENGELOLA KEUANGAN', 'BENDAHARA'] },
  { name: 'Tenaga Supir', keywords: ['SUPIR', 'SOPIR'] },
  { name: 'Tenaga Kebersihan', keywords: ['KEBERSIHAN'] },
  { name: 'Tenaga Keamanan', keywords: ['KEAMANAN'] },
  { name: 'Tenaga Administrasi', keywords: ['ADMINISTRASI', 'OPERATOR', 'KOMPUTER'] },
  { name: 'Pengadaan Barang', keywords: ['PENGADAAN BARANG', 'PENGADAAN JASA'] },
  { name: 'Pengelolaan BMD', keywords: ['BMD', 'BARANG PENGGUNA'] }
];

function getCategory(namaRekening: string, namaPaket: string) {
  const text = `${namaRekening} ${namaPaket}`.toUpperCase();
  for (const cat of JASA_CATEGORIES) {
    if (cat.keywords.some(k => text.includes(k))) return cat.name;
  }
  return 'Lainnya';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = parseInt(searchParams.get('tahun') || '2026', 10);
    const skpdIdParam = searchParams.get('skpdId');

    const tahunData = await prisma.tahunAnggaran.findUnique({
      where: { tahun }
    });

    if (!tahunData) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 404 });
    }

    // Ambil SKPD (default to all Pendidikan if not specified)
    const skpds = await prisma.skpd.findMany({
      where: skpdIdParam 
        ? { id: parseInt(skpdIdParam, 10), tahunId: tahunData.id }
        : { tahunId: tahunData.id, nama: { contains: 'PENDIDIKAN', mode: 'insensitive' } },
      orderBy: { kode: 'asc' }
    });

    const skpdIds = skpds.map(s => s.id);
    if (skpdIds.length === 0) return NextResponse.json({ tahun: tahunData, data: [] });

    // 1. Ambil target dari database KontrolJasaTarget
    const targets = await prisma.kontrolJasaTarget.findMany({
      where: {
        skpdId: { in: skpdIds },
        tahunId: tahunData.id
      }
    });

    // 2. Ambil Rincian Belanja dari Excel
    const subKegiatans = await prisma.subKegiatan.findMany({
      where: {
        kegiatan: { program: { skpdId: { in: skpdIds } } },
        nama: { contains: 'Penyediaan Jasa Pelayanan Umum', mode: 'insensitive' }
      },
      select: { id: true, kegiatan: { select: { program: { select: { skpdId: true } } } } }
    });

    const subKegiatanMap = new Map();
    subKegiatans.forEach(sk => subKegiatanMap.set(sk.id, sk.kegiatan.program.skpdId));

    const rincianList = await prisma.rincianBelanja.findMany({
      where: { subKegiatanId: { in: subKegiatans.map(sk => sk.id) } },
      select: { 
        subKegiatanId: true, 
        namaPaket: true, 
        pagu: true, 
        paguPerubahan: true,
        rekening: { select: { nama: true } } 
      }
    });

    // 3. Gabungkan Data per SKPD
    const result = skpds.map(skpd => {
      const skpdTargets = targets.filter(t => t.skpdId === skpd.id);
      
      const categoriesMap = new Map();
      
      // Initialize basic categories
      [...JASA_CATEGORIES.map(c => c.name), 'Lainnya'].forEach(c => {
        const t = skpdTargets.find(x => x.kategori === c);
        categoriesMap.set(c, {
          kategori: c,
          target: t ? Number(t.target) : 0,
          induk: 0,
          perubahan: 0,
          breakdown: []
        });
      });

      // Aggregate Excel data
      rincianList.forEach(r => {
        if (subKegiatanMap.get(r.subKegiatanId) !== skpd.id) return;

        const catName = getCategory(r.rekening?.nama || '', r.namaPaket || '');
        const valInduk = Number(r.pagu || 0);
        const valPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : valInduk;

        const catData = categoriesMap.get(catName);
        if (catData) {
          catData.induk += valInduk;
          catData.perubahan += valPerubahan;
          
          const label = `${r.rekening?.nama || '-'} ${r.namaPaket !== '-' ? `(${r.namaPaket})` : ''}`.trim();
          catData.breakdown.push({ label, induk: valInduk, perubahan: valPerubahan });
        }
      });

      return {
        skpdId: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        categories: Array.from(categoriesMap.values()).filter(c => c.target > 0 || c.induk > 0 || c.perubahan > 0)
      };
    });

    return NextResponse.json({
      tahun: tahunData,
      data: result
    });
  } catch (error: any) {
    console.error('Error GET kontrol-honor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skpdId, tahunId, categories } = body;

    if (!skpdId || !tahunId || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    // Upsert each category target
    const promises = categories.map(async (cat: any) => {
      return prisma.kontrolJasaTarget.upsert({
        where: { skpdId_tahunId_kategori: { skpdId, tahunId, kategori: cat.kategori } },
        update: { target: cat.target },
        create: { skpdId, tahunId, kategori: cat.kategori, target: cat.target }
      });
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error POST kontrol-honor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
