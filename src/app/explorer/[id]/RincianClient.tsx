'use client';

import { useState, useEffect, useMemo } from 'react';
import RincianTable from '@/components/RincianTable';
import { Layers, FileText, Folder, CheckSquare, Wallet } from 'lucide-react';

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

export default function RincianClient({ subKegiatanId, isLocked, parentInfo }: { subKegiatanId: number, isLocked: boolean, parentInfo: any }) {
  const [rincianList, setRincianList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rincian');

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

  const totalPaguPerubahan = useMemo(() => {
    return rincianList.reduce((acc, curr) => acc + Number(curr.paguPerubahan || 0), 0);
  }, [rincianList]);

  const totalRealisasi = useMemo(() => {
    return rincianList.reduce((acc, curr) => acc + Number(curr.realisasi || 0), 0);
  }, [rincianList]);

  // Aggregate Rekap SD
  const rekapSd = useMemo(() => {
    const map = new Map<string, { nama: string, pagu: number }>();
    rincianList.forEach(r => {
      const k = r.sumberDana?.nama || 'Unknown';
      const ext = map.get(k) || { nama: k, pagu: 0 };
      ext.pagu += Number(r.paguPerubahan || 0);
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.pagu - a.pagu);
  }, [rincianList]);

  // Aggregate Rekap Rekening
  const rekapRekening = useMemo(() => {
    const map = new Map<string, { kode: string, nama: string, pagu: number }>();
    rincianList.forEach(r => {
      const k = r.rekening?.kode || 'Unknown';
      const ext = map.get(k) || { kode: k, nama: r.rekening?.nama || 'Unknown', pagu: 0 };
      ext.pagu += Number(r.paguPerubahan || 0);
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.pagu - a.pagu);
  }, [rincianList]);

  // Aggregate Rekap Paket
  const rekapPaket = useMemo(() => {
    const map = new Map<string, { nama: string, pagu: number }>();
    rincianList.forEach(r => {
      const k = r.namaPaket || 'Unknown';
      const ext = map.get(k) || { nama: k, pagu: 0 };
      ext.pagu += Number(r.paguPerubahan || 0);
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.pagu - a.pagu);
  }, [rincianList]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        Memuat rincian sub kegiatan...
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Total Pagu Perubahan</p>
              <h3 className="text-xl font-bold text-gray-900">{formatRupiah(totalPaguPerubahan)}</h3>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="bg-purple-100 p-3 rounded-full mr-4">
              <CheckSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Total Realisasi</p>
              <h3 className="text-xl font-bold text-gray-900">{formatRupiah(totalRealisasi)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex -mb-px px-6 space-x-6" aria-label="Tabs">
          {[
            { id: 'rincian', label: 'Daftar Rincian', icon: Layers },
            { id: 'sd', label: 'Rekap Sumber Dana', icon: Folder },
            { id: 'rekening', label: 'Rekap Rekening', icon: FileText },
            { id: 'paket', label: 'Rekap Uraian Paket', icon: CheckSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-0">
        {activeTab === 'rincian' && (
          <RincianTable 
            rincianList={rincianList}
            subKegiatanId={subKegiatanId}
            isLocked={isLocked}
            parentInfo={parentInfo}
            onRefresh={fetchRincian}
          />
        )}

        {activeTab === 'sd' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rekapitulasi Berdasarkan Sumber Dana</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Sumber Dana</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Total Pagu Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rekapSd.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{r.nama}</td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-700">{formatRupiah(r.pagu)}</td>
                    </tr>
                  ))}
                  {rekapSd.length === 0 && (
                    <tr><td colSpan={2} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapSd.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rekening' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rekapitulasi Berdasarkan Rekening</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Kode Rekening</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Nama Rekening</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Total Pagu Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rekapRekening.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">{r.kode}</td>
                      <td className="px-6 py-4 text-gray-700">{r.nama}</td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-700">{formatRupiah(r.pagu)}</td>
                    </tr>
                  ))}
                  {rekapRekening.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapRekening.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th colSpan={2} className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {activeTab === 'paket' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rekapitulasi Berdasarkan Uraian Paket</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Uraian / Paket</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Total Pagu Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rekapPaket.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700 max-w-sm whitespace-normal break-words">{r.nama}</td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-700">{formatRupiah(r.pagu)}</td>
                    </tr>
                  ))}
                  {rekapPaket.length === 0 && (
                    <tr><td colSpan={2} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapPaket.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
