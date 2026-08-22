import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const dbh = await prisma.sumberDana.findFirst({ where: { nama: { contains: "DBH", mode: "insensitive" } } });
    const fallback = await prisma.sumberDana.findFirst({
      where: { OR: [ { nama: { contains: "PENDAPATAN ASLI DAERAH", mode: "insensitive" } }, { nama: { contains: "DAU", mode: "insensitive" } } ] }
    });
    if (!dbh || !fallback) return NextResponse.json({ message: "DBH or Fallback SD not found" });

    const realisasiDbh = await prisma.realisasiBelanja.findMany({ where: { sumberDanaId: dbh.id } });
    let fixedCount = 0; let deletedCount = 0;

    for (const r of realisasiDbh) {
      const rincianDbh = await prisma.rincianBelanja.findFirst({ where: { subKegiatanId: r.subKegiatanId, rekeningId: r.rekeningId, sumberDanaId: dbh.id } });
      if (!rincianDbh) {
        const anyRincian = await prisma.rincianBelanja.findFirst({ where: { subKegiatanId: r.subKegiatanId, rekeningId: r.rekeningId } });
        const newSdId = anyRincian ? anyRincian.sumberDanaId : fallback.id;
        const existing = await prisma.realisasiBelanja.findUnique({
          where: { skpdId_subKegiatanId_sumberDanaId_rekeningId_bulan: { skpdId: r.skpdId, subKegiatanId: r.subKegiatanId, sumberDanaId: newSdId, rekeningId: r.rekeningId, bulan: r.bulan } }
        });
        if (existing) {
          await prisma.realisasiBelanja.update({ where: { id: existing.id }, data: { nominal: Number(existing.nominal) + Number(r.nominal) } });
          await prisma.realisasiBelanja.delete({ where: { id: r.id } });
          deletedCount++;
        } else {
          await prisma.realisasiBelanja.update({ where: { id: r.id }, data: { sumberDanaId: newSdId } });
          fixedCount++;
        }
      }
    }
    return NextResponse.json({ message: "Perbaikan berhasil dijalankan", dipindahkan: fixedCount, digabung: deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
