import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RincianClient from './RincianClient';

export default async function RincianPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const subKegiatanId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(subKegiatanId)) {
    return <div className="p-12 text-center text-red-500">ID Sub Kegiatan tidak valid</div>;
  }

  const subKegiatan = await prisma.subKegiatan.findUnique({
    where: { id: subKegiatanId },
    include: {
      kegiatan: {
        include: {
          program: {
            include: {
              skpd: true
            }
          }
        }
      },
      subKegiatanSumberDanas: true
    }
  });

  if (!subKegiatan) {
    return <div className="p-12 text-center text-red-500">Sub Kegiatan tidak ditemukan</div>;
  }

  const parentInfo = {
    skpd: { kode: subKegiatan.kegiatan.program.skpd.kodeSubUnit, nama: `${subKegiatan.kegiatan.program.skpd.nama} - ${subKegiatan.kegiatan.program.skpd.namaSubUnit}` },
    program: { kode: subKegiatan.kegiatan.program.kode, nama: subKegiatan.kegiatan.program.nama },
    kegiatan: { kode: subKegiatan.kegiatan.kode, nama: subKegiatan.kegiatan.nama },
    subkegiatan: { kode: subKegiatan.kode, nama: subKegiatan.nama }
  };

  const isLocked = subKegiatan.subKegiatanSumberDanas.some(s => s.isLocked);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/explorer" className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center bg-white border shadow-sm">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rincian Sub Kegiatan</h1>
          <p className="text-gray-500">{subKegiatan.kode} - {subKegiatan.nama}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <RincianClient subKegiatanId={subKegiatanId} isLocked={isLocked} parentInfo={parentInfo} />
      </div>
    </div>
  );
}
