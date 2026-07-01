export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subKegiatanId, sumberDanaId, rekeningId, sshSbuId, tipePaket, namaPaket, volume, hargaSatuan } = body;

    if (!subKegiatanId || !sumberDanaId || !rekeningId || !namaPaket || !volume || !hargaSatuan) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const pagu = volume * hargaSatuan;

    // 1. Validation SSH/SBU Harga Satuan
    if (sshSbuId) {
      const ssh = await prisma.sshSbu.findUnique({ where: { id: sshSbuId } });
      if (ssh && hargaSatuan > Number(ssh.hargaSatuan)) {
        return NextResponse.json({ 
          error: `Harga satuan melebihi standar maksimal (Rp ${Number(ssh.hargaSatuan).toLocaleString('id-ID')})` 
        }, { status: 400 });
      }
    }

    // 2. Insert Data
    const rincian = await prisma.rincianBelanja.create({
      data: {
        subKegiatanId,
        sumberDanaId,
        rekeningId,
        sshSbuId: sshSbuId || null,
        tipePaket: tipePaket || '-',
        namaPaket,
        volume,
        hargaSatuan,
        pagu
      }
    });

    return NextResponse.json(rincian);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, sumberDanaId, rekeningId, sshSbuId, tipePaket, namaPaket, volume, hargaSatuan } = body;

    if (!id) return NextResponse.json({ error: 'ID Rincian dibutuhkan' }, { status: 400 });

    const existingRincian = await prisma.rincianBelanja.findUnique({
      where: { id }
    });

    if (!existingRincian) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    const pagu = volume * hargaSatuan;

    // Validation SSH/SBU
    if (sshSbuId) {
      const ssh = await prisma.sshSbu.findUnique({ where: { id: sshSbuId } });
      if (ssh && hargaSatuan > Number(ssh.hargaSatuan)) {
        return NextResponse.json({ 
          error: `Harga satuan melebihi standar maksimal (Rp ${Number(ssh.hargaSatuan).toLocaleString('id-ID')})` 
        }, { status: 400 });
      }
    }

    // Validation Kunci Sumber Dana
    const sdRelation = await prisma.subKegiatanSumberDana.findUnique({
      where: {
        subKegiatanId_sumberDanaId: {
          subKegiatanId: existingRincian.subKegiatanId,
          sumberDanaId: existingRincian.sumberDanaId
        }
      }
    });

    if (sdRelation?.isLocked) {
      // If locked, we must ensure the total pagu doesn't decrease below lockedAmount
      // To do this strictly, we'd sum all current rincian and check the delta.
      // For now, if the new pagu is less than the old pagu, block it.
      if (pagu < Number(existingRincian.pagu)) {
        return NextResponse.json({ error: 'Pagu sumber dana dikunci. Anda tidak dapat mengurangi pagu rincian ini.' }, { status: 403 });
      }
    }

    const rincian = await prisma.rincianBelanja.update({
      where: { id },
      data: {
        sumberDanaId: sumberDanaId || existingRincian.sumberDanaId,
        rekeningId: rekeningId || existingRincian.rekeningId,
        sshSbuId: sshSbuId !== undefined ? sshSbuId : existingRincian.sshSbuId,
        tipePaket: tipePaket || existingRincian.tipePaket,
        namaPaket: namaPaket || existingRincian.namaPaket,
        volume: volume !== undefined ? volume : existingRincian.volume,
        hargaSatuan: hargaSatuan !== undefined ? hargaSatuan : existingRincian.hargaSatuan,
        pagu
      }
    });

    return NextResponse.json(rincian);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);

    if (!id) return NextResponse.json({ error: 'ID Rincian dibutuhkan' }, { status: 400 });

    const existingRincian = await prisma.rincianBelanja.findUnique({
      where: { id }
    });

    if (!existingRincian) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    // Validation Kunci Sumber Dana
    const sdRelation = await prisma.subKegiatanSumberDana.findUnique({
      where: {
        subKegiatanId_sumberDanaId: {
          subKegiatanId: existingRincian.subKegiatanId,
          sumberDanaId: existingRincian.sumberDanaId
        }
      }
    });

    if (sdRelation?.isLocked) {
      return NextResponse.json({ error: 'Sumber dana terkunci. Anda tidak dapat menghapus rincian ini karena akan mengurangi pagu.' }, { status: 403 });
    }

    await prisma.rincianBelanja.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

