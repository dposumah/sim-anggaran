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

    // 2. Ambil data KontrolGaji dan KontrolJasaTarget
    const kontrolGajis = await prisma.kontrolGaji.findMany({
      where: { skpdId: { in: skpdIds }, tahunId: tahunData.id }
    });
    
    const kontrolJasaTargets = await prisma.kontrolJasaTarget.findMany({
      where: { skpdId: { in: skpdIds }, tahunId: tahunData.id }
    });

    const kontrolMap = new Map();
    kontrolGajis.forEach(kg => kontrolMap.set(kg.skpdId, kg));
    
    const targetMap = new Map(); // skpdId -> { kategori: target }
    kontrolJasaTargets.forEach(kt => {
      if (!targetMap.has(kt.skpdId)) targetMap.set(kt.skpdId, {});
      targetMap.get(kt.skpdId)[kt.kategori] = Number(kt.target);
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
        namaPaket: true,
        rekening: { select: { kode: true, nama: true } },
        sumberDana: { select: { nama: true } },
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
          'Gaji PNS': 0, 'Gaji PPPK': 0,
          'TPP': 0, 'TPP BPJS': 0, 'TPP PPH': 0,
          'BPJS PPPK Paruh Waktu': 0, 'JKK/JKM PPPK Paruh Waktu': 0,
          'Bendahara, PPTK/PPKOM/PPK/PBJ': 0, 'Pengurus Barang': 0,
          'Sopir': 0, 'Kebersihan': 0, 'Keamanan': 0,
          'Listrik': 0, 'Air': 0, 'Internet': 0,
          'Dau Pendidikan': 0, 'DAK Non Fisik BOS Reguler': 0, 'DAK Non Fisik BOS Kinerja': 0,
          'DAK Non Fisik BOP PAUD Reguler': 0, 'DAK Non Fisik BOP PAUD Kinerja': 0,
          'DAK Non Fisik BOP Kesetaraan Reguler': 0, 'DAK Non Fisik BOP Kesetaraan Kinerja': 0,
          'TPG': 0, 'Tamsil': 0, 'TPG/Tamsil Carry Over 2024': 0, 'TPG/Tamsil THR Guru': 0,
          'Juru Pelihara Cagar Budaya': 0
        });
      }
      
      const stat = excelDataMap.get(skpdId);
      
      const valInduk = Number(r.paguInduk || 0);
      const valPerubahan = Number(r.paguPerubahan !== null ? r.paguPerubahan : valInduk);
      
      const rekKode = r.rekening?.kode || '';
      const rekNama = r.rekening?.nama || '';
      const sdNama = r.sumberDana?.nama || '';
      const paket = r.namaPaket || '';
      const paketLower = paket.toLowerCase();
      
      const isPns = REKENING_PNS.some(k => rekKode.startsWith(k));
      const isPppk = REKENING_PPPK.some(k => rekKode.startsWith(k));

      if (isPns) stat['Gaji PNS'] += valPerubahan;
      if (isPppk) stat['Gaji PPPK'] += valPerubahan;

      if (rekNama.includes('Tambahan Penghasilan berdasarkan Beban Kerja PNS')) stat['TPP'] += valPerubahan;
      if (paket.includes('TPP BPJS')) stat['TPP BPJS'] += valPerubahan;
      if (paket.includes('TPP PPH')) stat['TPP PPH'] += valPerubahan;
      
      if (rekNama.includes('Belanja Iuran Jaminan Kesehatan bagi PPPK Paruh Waktu')) stat['BPJS PPPK Paruh Waktu'] += valPerubahan;
      if (rekNama.includes('Belanja Iuran Jaminan Kecelakaan Kerja bagi PPPK Paruh Waktu') || rekNama.includes('Belanja Iuran Jaminan Kematian bagi PPPK Paruh Waktu')) stat['JKK/JKM PPPK Paruh Waktu'] += valPerubahan;
      
      if (rekNama.includes('Belanja Honorarium Penanggungjawaban Pengelola Keuangan') || rekNama.includes('Belanja Honorarium Pengadaan Barang/Jasa')) stat['Bendahara, PPTK/PPKOM/PPK/PBJ'] += valPerubahan;
      if (rekNama.includes('Belanja Jasa Pengelolaan BMD yang Tidak Menghasilkan Pendapatan')) stat['Pengurus Barang'] += valPerubahan;
      if (rekNama.includes('Belanja Jasa Tenaga Supir')) stat['Sopir'] += valPerubahan;
      if (rekNama.includes('Belanja Jasa Tenaga Kebersihan')) stat['Kebersihan'] += valPerubahan;
      if (rekNama.includes('Belanja Jasa Tenaga Keamanan')) stat['Keamanan'] += valPerubahan;
      
      if (rekNama.includes('Belanja Tagihan Listrik')) stat['Listrik'] += valPerubahan;
      if (rekNama.includes('Belanja Tagihan Air')) stat['Air'] += valPerubahan;
      if (rekNama.includes('Belanja Kawat/Faksimili/Internet/TV Berlangganan')) stat['Internet'] += valPerubahan;
      
      if (sdNama.includes('DAU yang Ditentukan Penggunaannya Bidang Pendidikan')) stat['Dau Pendidikan'] += valPerubahan;
      if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOS Reguler')) stat['DAK Non Fisik BOS Reguler'] += valPerubahan;
      if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOS Kinerja')) stat['DAK Non Fisik BOS Kinerja'] += valPerubahan;
      if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP PAUD Reguler')) stat['DAK Non Fisik BOP PAUD Reguler'] += valPerubahan;
      if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP PAUD Kinerja')) stat['DAK Non Fisik BOP PAUD Kinerja'] += valPerubahan;
      if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP Kesetaraan Reguler')) stat['DAK Non Fisik BOP Kesetaraan Reguler'] += valPerubahan;
      if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP Kesetaraan Kinerja')) stat['DAK Non Fisik BOP Kesetaraan Kinerja'] += valPerubahan;
      
      const isTPG = rekNama.includes('Belanja Tunjangan Profesi Guru (TPG) PNSD') || rekNama.includes('Belanja Tunjangan Profesi Guru (TPG) PPPK');
      const isTamsil = rekNama.includes('Belanja Tambahan Penghasilan (Tamsil) Guru PPPK') || rekNama.includes('Belanja Tambahan Penghasilan (Tamsil) Guru PNSD');
      
      const isCarryOver = paket.includes('Silpa TPG') || paket.includes('Silpa Tamsil PPPK') || paket.includes('Silpa TPG PPPK') || paket.includes('Silpa Tamsil PNS');
      const isThr = paket.includes('THR dan G13');
      
      if (isTPG) {
        if (!isCarryOver && !isThr) stat['TPG'] += valPerubahan;
      }
      if (isTamsil) {
        if (!isCarryOver && !isThr) stat['Tamsil'] += valPerubahan;
      }
      
      if (isCarryOver) stat['TPG/Tamsil Carry Over 2024'] += valPerubahan;
      if (isThr) stat['TPG/Tamsil THR Guru'] += valPerubahan;
      
      if (paketLower.includes('juru pelihara cagar budaya')) stat['Juru Pelihara Cagar Budaya'] += valPerubahan;
    });

    // 4. Gabungkan Data
    const result = skpds.map(skpd => {
      const kg = kontrolMap.get(skpd.id);
      const tj = targetMap.get(skpd.id) || {};
      const ed = excelDataMap.get(skpd.id) || {};

      const categories = [
        'Gaji PNS', 'Gaji PPPK', 'TPP', 'TPP BPJS', 'TPP PPH',
        'BPJS PPPK Paruh Waktu', 'JKK/JKM PPPK Paruh Waktu',
        'Bendahara, PPTK/PPKOM/PPK/PBJ', 'Pengurus Barang',
        'Sopir', 'Kebersihan', 'Keamanan',
        'Listrik', 'Air', 'Internet',
        'Dau Pendidikan', 'DAK Non Fisik BOS Reguler', 'DAK Non Fisik BOS Kinerja',
        'DAK Non Fisik BOP PAUD Reguler', 'DAK Non Fisik BOP PAUD Kinerja',
        'DAK Non Fisik BOP Kesetaraan Reguler', 'DAK Non Fisik BOP Kesetaraan Kinerja',
        'TPG', 'Tamsil', 'TPG/Tamsil Carry Over 2024', 'TPG/Tamsil THR Guru',
        'Juru Pelihara Cagar Budaya'
      ];

      const items = categories.map(cat => {
        let target = 0;
        if (cat === 'Gaji PNS') target = kg ? Number(kg.targetPns || 0) : 0;
        else if (cat === 'Gaji PPPK') target = kg ? Number(kg.targetPppk || 0) : 0;
        else target = tj[cat] || 0;

        return {
          kategori: cat,
          target: target,
          excel: ed[cat] || 0
        };
      });

      return {
        skpdId: skpd.id,
        kode: skpd.kode,
        nama: skpd.nama,
        items
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
    const { skpdId, tahunId, items } = body; // items is array of { kategori, target }

    if (!skpdId || !tahunId || !items) {
      return NextResponse.json({ error: 'skpdId, tahunId, dan items diperlukan' }, { status: 400 });
    }

    // Process items
    for (const item of items) {
      if (item.kategori === 'Gaji PNS' || item.kategori === 'Gaji PPPK') {
        const kg = await prisma.kontrolGaji.findUnique({
          where: { skpdId_tahunId: { skpdId, tahunId } }
        });
        await prisma.kontrolGaji.upsert({
          where: { skpdId_tahunId: { skpdId, tahunId } },
          update: {
            targetPns: item.kategori === 'Gaji PNS' ? item.target : kg?.targetPns,
            targetPppk: item.kategori === 'Gaji PPPK' ? item.target : kg?.targetPppk
          },
          create: {
            skpdId,
            tahunId,
            targetPns: item.kategori === 'Gaji PNS' ? item.target : 0,
            targetPppk: item.kategori === 'Gaji PPPK' ? item.target : 0
          }
        });
      } else {
        await prisma.kontrolJasaTarget.upsert({
          where: { skpdId_tahunId_kategori: { skpdId, tahunId, kategori: item.kategori } },
          update: { target: item.target },
          create: { skpdId, tahunId, kategori: item.kategori, target: item.target }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error POST kontrol-gaji:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
