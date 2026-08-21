export const dynamic = 'force-dynamic';
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
            kode: true,
            nama: true,
            kegiatan: { select: { nama: true, program: { select: { skpdId: true, nama: true } } } }
          }
        }
      }
    });

    // Kalkulasi per SKPD
    const excelDataMap = new Map();
    const detailsDataMap = new Map();
    
    rincian.forEach(r => {
      const skpdId = r.subKegiatan.kegiatan.program.skpdId;
      if (!skpdId) return;

      if (!excelDataMap.has(skpdId)) {
        excelDataMap.set(skpdId, { 
          'Gaji PNS': 0, 'Gaji PPPK': 0, 'Gaji PPPK Paruh Waktu': 0,
          'TPP': 0, 'TPP BPJS': 0, 'TPP PPH': 0,
          'BPJS PPPK Paruh Waktu': 0, 'JKK/JKM PPPK Paruh Waktu': 0,
          'Bendahara, PPTK/PPKOM/PPK/PBJ': 0, 'Pengurus Barang': 0,
          'Sopir': 0, 'Kebersihan': 0, 'Keamanan': 0,
          'Listrik': 0, 'Air': 0, 'Internet': 0,
          'Dau Pendidikan': 0, 'DAK Non Fisik BOS Reguler': 0, 'DAK Non Fisik BOS Kinerja': 0,
          'DAK Non Fisik BOP PAUD Reguler': 0, 'DAK Non Fisik BOP PAUD Kinerja': 0,
          'DAK Non Fisik BOP Kesetaraan Reguler': 0, 'DAK Non Fisik BOP Kesetaraan Kinerja': 0,
          'TPG': 0, 'Tamsil': 0, 'TPG/Tamsil Carry Over 2024': 0, 'TPG/Tamsil THR Guru': 0,
          'Juru Pelihara Cagar Budaya': 0, 'Kegiatan PAUD dan Kebudayaan': 0,
          'Optimalisasi Retribusi': 0, 'Tim Kesenian': 0
        });
        detailsDataMap.set(skpdId, {});
      }
      
      const stat = excelDataMap.get(skpdId);
      const details = detailsDataMap.get(skpdId);
      
      const addStat = (cat: string, val: number) => {
        if (!stat[cat]) stat[cat] = 0;
        stat[cat] += val;
        
        if (val !== 0) {
          if (!details[cat]) details[cat] = [];
          details[cat].push({
            subKegiatan: r.subKegiatan?.nama || '-',
            rekening: r.rekening?.nama || '-',
            sumberDana: r.sumberDana?.nama || '-',
            paket: r.namaPaket || '-',
            pagu: val
          });
        }
      };
      
      const valInduk = Number(r.paguInduk || 0);
      const valPerubahan = Number(r.paguPerubahan !== null ? r.paguPerubahan : valInduk);
      
      const rekKode = r.rekening?.kode || '';
      const rekNama = r.rekening?.nama || '';
      const sdNama = r.sumberDana?.nama || '';
      const paket = r.namaPaket || '';
      const paketLower = paket.toLowerCase();
      
      const subUpper = (r.subKegiatan?.nama || '').toUpperCase();
      const rekUpper = rekNama.toUpperCase();
      const isGaji = subUpper.includes('GAJI DAN TUNJANGAN ASN');

      let isPns = false;
      let isPppk = false;

      if (isGaji) {
        const isExcluded = rekUpper.includes('PNSD') || rekUpper.includes('TUNJANGAN PROFESI GURU') || rekUpper.includes('TAMBAHAN PENGHASILAN') || rekUpper.includes('TAMSIL');
        if (!isExcluded) {
          if (rekUpper.includes('PNS')) {
            isPns = true;
          } else if (rekUpper.includes('PPPK')) {
            isPppk = true;
          }
        }
      }

      const isTppBpjs = paket.includes('TPP BPJS') || paket.includes('TTP BPJS');
      const isTppPph = paket.includes('TPP PPH') || paket.includes('TTP PPH');

      let mappedCount = 0;
      const addStatAndMark = (cat: string, val: number) => {
        addStat(cat, val);
        mappedCount++;
      };

      const isTPG = rekNama.includes('Belanja Tunjangan Profesi Guru (TPG) PNSD') || rekNama.includes('Belanja Tunjangan Profesi Guru (TPG) PPPK');
      const isTamsil = rekNama.includes('Belanja Tambahan Penghasilan (Tamsil) Guru PPPK') || rekNama.includes('Belanja Tambahan Penghasilan (Tamsil) Guru PNSD');
      
      const isCarryOver = paket.includes('Silpa TPG') || paket.includes('Silpa Tamsil PPPK') || paket.includes('Silpa TPG PPPK') || paket.includes('Silpa Tamsil PNS');
      const isThr = paket.includes('THR dan G13');
      
      const kegiatanNama = r.subKegiatan?.kegiatan?.nama || '';
      const programNama = r.subKegiatan?.kegiatan?.program?.nama || '';
      const kegiatanUpper = kegiatanNama.toUpperCase();
      const programUpper = programNama.toUpperCase();
      const sdUpper = sdNama.toUpperCase();
      const subKode = r.subKegiatan?.kode || '';

      const isPad = sdUpper.includes('PENDAPATAN ASLI DAERAH') || sdUpper.includes('(PAD)') || sdUpper === 'PAD';
      const isPaudKebudayaan = isPad && (
        kegiatanUpper.includes('PENGELOLAAN PENDIDIKAN ANAK USIA DINI (PAUD)') ||
        kegiatanUpper.includes('PENGELOLAAN PENDIDIKAN NONFORMAL/KESETARAAN') ||
        programUpper.includes('PENGEMBANGAN KEBUDAYAAN') ||
        programUpper.includes('PENGEMBANGAN KESENIAN TRADISIONAL') ||
        programUpper.includes('PEMBINAAN SEJARAH') ||
        programUpper.includes('PELESTARIAN DAN PENGELOLAAN CAGAR BUDAYA')
      );

      if (isPns && !isTppBpjs && !isTppPph) addStatAndMark('Gaji PNS', valPerubahan);
      else if (isPppk) addStatAndMark('Gaji PPPK', valPerubahan);
      else if (isTppBpjs) addStatAndMark('TPP BPJS', valPerubahan);
      else if (isTppPph) addStatAndMark('TPP PPH', valPerubahan);
      else if (rekNama.includes('Tambahan Penghasilan berdasarkan Beban Kerja PNS')) addStatAndMark('TPP', valPerubahan);
      
      else if (rekNama.toLowerCase().includes('belanja jasa pegawai pemerintah dengan perjanjian kerja') && rekNama.toLowerCase().includes('paruh waktu')) addStatAndMark('Gaji PPPK Paruh Waktu', valPerubahan);
      else if (rekNama.includes('Belanja Iuran Jaminan Kesehatan bagi PPPK Paruh Waktu')) addStatAndMark('BPJS PPPK Paruh Waktu', valPerubahan);
      else if (rekNama.includes('Belanja Iuran Jaminan Kecelakaan Kerja bagi PPPK Paruh Waktu') || rekNama.includes('Belanja Iuran Jaminan Kematian bagi PPPK Paruh Waktu')) addStatAndMark('JKK/JKM PPPK Paruh Waktu', valPerubahan);
      
      else if (rekNama.includes('Belanja Honorarium Penanggungjawaban Pengelola Keuangan') || rekNama.includes('Belanja Honorarium Pengadaan Barang/Jasa')) addStatAndMark('Bendahara, PPTK/PPKOM/PPK/PBJ', valPerubahan);
      else if (rekNama.includes('Belanja Jasa Pengelolaan BMD yang Tidak Menghasilkan Pendapatan')) addStatAndMark('Pengurus Barang', valPerubahan);
      else if (rekNama.includes('Belanja Jasa Tenaga Supir')) addStatAndMark('Sopir', valPerubahan);
      else if (rekNama.includes('Belanja Jasa Tenaga Kebersihan')) addStatAndMark('Kebersihan', valPerubahan);
      else if (rekNama.includes('Belanja Jasa Tenaga Keamanan')) addStatAndMark('Keamanan', valPerubahan);
      
      else if (rekNama.includes('Belanja Tagihan Listrik')) addStatAndMark('Listrik', valPerubahan);
      else if (rekNama.includes('Belanja Tagihan Air')) addStatAndMark('Air', valPerubahan);
      else if (rekNama.includes('Belanja Kawat/Faksimili/Internet/TV Berlangganan')) addStatAndMark('Internet', valPerubahan);
      
      else if (sdNama.includes('DAU yang Ditentukan Penggunaannya Bidang Pendidikan')) addStatAndMark('Dau Pendidikan', valPerubahan);
      else if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOS Reguler')) addStatAndMark('DAK Non Fisik BOS Reguler', valPerubahan);
      else if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOS Kinerja')) addStatAndMark('DAK Non Fisik BOS Kinerja', valPerubahan);
      else if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP PAUD Reguler')) addStatAndMark('DAK Non Fisik BOP PAUD Reguler', valPerubahan);
      else if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP PAUD Kinerja')) addStatAndMark('DAK Non Fisik BOP PAUD Kinerja', valPerubahan);
      else if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP Kesetaraan Reguler')) addStatAndMark('DAK Non Fisik BOP Kesetaraan Reguler', valPerubahan);
      else if (sdNama.includes('DAK Non Fisik-Dana BOSP-BOP Kesetaraan Kinerja')) addStatAndMark('DAK Non Fisik BOP Kesetaraan Kinerja', valPerubahan);
      
      else if (isTPG && !isCarryOver && !isThr) addStatAndMark('TPG', valPerubahan);
      else if (isTamsil && !isCarryOver && !isThr) addStatAndMark('Tamsil', valPerubahan);
      else if (isCarryOver) addStatAndMark('TPG/Tamsil THR Guru', valPerubahan);
      else if (isThr) addStatAndMark('TPG/Tamsil Carry Over 2024', valPerubahan);
      
      else if (paketLower.includes('juru pelihara cagar budaya')) addStatAndMark('Juru Pelihara Cagar Budaya', valPerubahan);
      
      else if (isPaudKebudayaan) addStatAndMark('Kegiatan PAUD dan Kebudayaan', valPerubahan);
      
      else if (sdUpper.includes('RETRIBUSI DAERAH') && sdUpper.includes('LRA')) addStatAndMark('Optimalisasi Retribusi', valPerubahan);
      
      else if (sdUpper.includes('PENDAPATAN TRANSFER ANTAR DAERAH') && subKode.includes('2.22.03.2.01.0001')) addStatAndMark('Tim Kesenian', valPerubahan);
      
      else if (isPad) addStatAndMark('RUTIN SEKRETARIAT/ KEG LAINNYA', valPerubahan);
    });

    // 4. Gabungkan Data
    const result = skpds.map(skpd => {
      const kg = kontrolMap.get(skpd.id);
      const tj = targetMap.get(skpd.id) || {};
      const ed = excelDataMap.get(skpd.id) || {};
      const dd = detailsDataMap.get(skpd.id) || {};

      const categories = [
        'Gaji PNS', 'Gaji PPPK', 'Gaji PPPK Paruh Waktu', 'TPP', 'TPP BPJS', 'TPP PPH',
        'BPJS PPPK Paruh Waktu', 'JKK/JKM PPPK Paruh Waktu',
        'Bendahara, PPTK/PPKOM/PPK/PBJ', 'Pengurus Barang',
        'Sopir', 'Kebersihan', 'Keamanan',
        'Listrik', 'Air', 'Internet',
        'Dau Pendidikan', 'DAK Non Fisik BOS Reguler', 'DAK Non Fisik BOS Kinerja',
        'DAK Non Fisik BOP PAUD Reguler', 'DAK Non Fisik BOP PAUD Kinerja',
        'DAK Non Fisik BOP Kesetaraan Reguler', 'DAK Non Fisik BOP Kesetaraan Kinerja',
        'TPG', 'Tamsil', 'TPG/Tamsil Carry Over 2024', 'TPG/Tamsil THR Guru',
        'Juru Pelihara Cagar Budaya', 'Kegiatan PAUD dan Kebudayaan',
        'Optimalisasi Retribusi', 'Tim Kesenian', 'RUTIN SEKRETARIAT/ KEG LAINNYA'
      ];

      const items = categories.map(cat => {
        let target = 0;
        if (cat === 'Gaji PNS') target = kg ? Number(kg.targetPns || 0) : 0;
        else if (cat === 'Gaji PPPK') target = kg ? Number(kg.targetPppk || 0) : 0;
        else target = tj[cat] || 0;

        return {
          kategori: cat,
          target: target,
          excel: ed[cat] || 0,
          details: dd[cat] || []
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
