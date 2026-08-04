'use client';

import { useState, useEffect } from 'react';
import RincianTable from '@/components/RincianTable';

export default function RincianClient({ subKegiatanId, isLocked, parentInfo }: { subKegiatanId: number, isLocked: boolean, parentInfo: any }) {
  const [rincianList, setRincianList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRincian = () => {
    setLoading(true);
    fetch(`/api/explorer?level=rincian&subKegiatanId=${subKegiatanId}`)
      .then(res => res.json())
      .then(data => {
        setRincianList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRincian();
  }, [subKegiatanId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        Memuat rincian sub kegiatan...
      </div>
    );
  }

  return (
    <RincianTable 
      rincianList={rincianList}
      subKegiatanId={subKegiatanId}
      isLocked={isLocked}
      parentInfo={parentInfo}
      onRefresh={fetchRincian}
    />
  );
}
