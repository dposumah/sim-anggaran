import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const skpd = await prisma.skpd.findFirst({
      where: {
        nama: {
          contains: "PENDIDIKAN DAN KEBUDAYAAN DAERAH",
          mode: "insensitive"
        }
      },
      include: {
        tahun: true
      }
    });

    if (!skpd) {
      return NextResponse.json({ error: "SKPD Pendidikan tidak ditemukan di database sistem." }, { status: 404 });
    }

    const rincianList = await prisma.rincianBelanja.findMany({
      where: {
        namaPaket: { not: "" },
        subKegiatan: {
          kegiatan: {
            program: {
              skpdId: skpd.id
            }
          }
        }
      },
      select: {
        id: true,
        namaPaket: true,
        paguInduk: true,
        paguRkpd: true,
        paguPerubahan: true,
        subKegiatanId: true,
        rekeningId: true,
        sumberDanaId: true,
        subKegiatan: {
          select: { kode: true, nama: true }
        },
        sumberDana: {
          select: { kode: true, nama: true }
        },
        rekening: {
          select: { kode: true, nama: true }
        }
      }
    });

    const realisasiList = await prisma.realisasiBelanja.findMany({
      where: {
        skpdId: skpd.id,
        tahunId: skpd.tahunId
      }
    });

    // Create realisasi map based on subKegiatanId_sumberDanaId_rekeningId
    const realisasiMap: Record<string, number> = {};
    realisasiList.forEach((r: any) => {
      const key = `${r.subKegiatanId}_${r.sumberDanaId}_${r.rekeningId}`;
      if (!realisasiMap[key]) realisasiMap[key] = 0;
      realisasiMap[key] += Number(r.nominal);
    });

    // To distribute realisasi proportionally if there are multiple pakets for the same key, we calculate total pagu per key
    const paguPerKey: Record<string, number> = {};
    rincianList.forEach((r: any) => {
      const key = `${r.subKegiatanId}_${r.sumberDanaId}_${r.rekeningId}`;
      if (!paguPerKey[key]) paguPerKey[key] = 0;
      paguPerKey[key] += Number(r.paguPerubahan !== null ? r.paguPerubahan : r.paguInduk);
    });

    const groupedMap = new Map<string, any>();

    rincianList.forEach((r: any) => {
      let pkt = r.namaPaket.trim();
      if (!pkt) return;

      const subUpper = (r.subKegiatan?.nama || "").toUpperCase();
      const sdUpper = (r.sumberDana?.nama || "").toUpperCase();
      
      const isBosp = sdUpper.includes('BOS') || sdUpper.includes('BOP') || sdUpper.includes('BOSP');

      if (subUpper.includes('PENYEDIAAN GAJI DAN TUNJANGAN')) {
        pkt = 'Gaji dan Tunjangan';
      } else if (isBosp) {
        if (subUpper.includes('SEKOLAH DASAR')) {
          pkt = 'BOS SD';
        } else if (subUpper.includes('SEKOLAH MENENGAH PERTAMA') || subUpper.includes('SMP')) {
          pkt = 'BOS SMP';
        } else if (subUpper.includes('PAUD')) {
          pkt = 'BOP PAUD';
        } else if (subUpper.includes('KESETARAAN')) {
          pkt = 'BOP KESETARAAN';
        }
      }

      if (!groupedMap.has(pkt)) {
        groupedMap.set(pkt, {
          namaPaket: pkt,
          paguInduk: 0,
          paguRkpd: 0,
          paguPerubahan: 0,
          realisasi: 0,
          items: []
        });
      }

      const group = groupedMap.get(pkt);

      const pInduk = Number(r.paguInduk || 0);
      const pRkpd = Number(r.paguRkpd || 0);
      const pPerubahan = r.paguPerubahan !== null ? Number(r.paguPerubahan) : pInduk;

      group.paguInduk += pInduk;
      group.paguRkpd += pRkpd;
      group.paguPerubahan += pPerubahan;

      // Calculate proportional realisasi
      const key = `${r.subKegiatanId}_${r.sumberDanaId}_${r.rekeningId}`;
      const totalRealisasiForKey = realisasiMap[key] || 0;
      const totalPaguForKey = paguPerKey[key] || 0;
      let proportionalRealisasi = 0;
      if (totalPaguForKey > 0) {
        proportionalRealisasi = (pPerubahan / totalPaguForKey) * totalRealisasiForKey;
      }

      group.realisasi += proportionalRealisasi;

      group.items.push({
        id: r.id,
        subKegiatan: r.subKegiatan?.nama || "",
        sumberDana: r.sumberDana?.nama || "",
        rekening: r.rekening?.nama || "",
        paguInduk: pInduk,
        paguRkpd: pRkpd,
        paguPerubahan: pPerubahan,
        realisasi: proportionalRealisasi
      });
    });

    const data = Array.from(groupedMap.values()).sort((a, b) => b.paguPerubahan - a.paguPerubahan);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

