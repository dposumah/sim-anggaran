'use client';

import { useState, useEffect, useMemo } from 'react';
import RincianTable from '@/components/RincianTable';
import { Layers, FileText, Folder, CheckSquare, Wallet, X } from 'lucide-react';

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

export default function RincianClient({ subKegiatanId, isLocked, parentInfo }: { subKegiatanId: number, isLocked: boolean, parentInfo: any }) {
  const [rincianList, setRincianList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rincian');
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);

  const rincianForSelectedPaket = useMemo(() => {
    if (!selectedPaket) return [];
    return rincianList.filter(r => (r.namaPaket || 'Unknown') === selectedPaket);
  }, [rincianList, selectedPaket]);

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
    const map = new Map<string, { kode: string, nama: string, pagu: number, realisasi: number }>();
    rincianList.forEach(r => {
      const k = r.rekening?.kode || 'Unknown';
      const ext = map.get(k) || { kode: k, nama: r.rekening?.nama || 'Unknown', pagu: 0, realisasi: 0 };
      ext.pagu += Number(r.paguPerubahan || 0);
      ext.realisasi += Number(r.realisasi || 0);
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.pagu - a.pagu);
  }, [rincianList]);

  // Aggregate Rekap Paket
  const rekapPaket = useMemo(() => {
    const map = new Map<string, { nama: string, paguInduk: number, paguRkpd: number, paguPerubahan: number, selisih: number, realisasi: number }>();
    rincianList.forEach(r => {
      const k = r.namaPaket || 'Unknown';
      const ext = map.get(k) || { nama: k, paguInduk: 0, paguRkpd: 0, paguPerubahan: 0, selisih: 0, realisasi: 0 };
      
      const induk = Number(r.paguInduk || 0);
      const rkpd = Number(r.paguRkpd || 0);
      const perubahan = Number(r.paguPerubahan || 0);
      
      ext.paguInduk += induk;
      ext.paguRkpd += rkpd;
      ext.paguPerubahan += perubahan;
      ext.selisih += (perubahan - induk);
      ext.realisasi += Number(r.realisasi || 0);
      
      map.set(k, ext);
    });
    return Array.from(map.values()).sort((a, b) => b.paguPerubahan - a.paguPerubahan);
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Kode Rekening</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Nama Rekening</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Total Pagu Perubahan</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Total Realisasi</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rekapRekening.map((r, i) => {
                    const isWarning = r.realisasi > r.pagu;
                    return (
                      <tr key={i} className={`hover:bg-gray-50 ${isWarning ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 text-gray-700">{r.kode}</td>
                        <td className="px-6 py-4 text-gray-700">{r.nama}</td>
                        <td className="px-6 py-4 text-right font-semibold text-blue-700">{formatRupiah(r.pagu)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-purple-700">{formatRupiah(r.realisasi)}</td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {isWarning ? (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                              Overbudget {formatRupiah(r.realisasi - r.pagu)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                              Aman (Sisa {formatRupiah(r.pagu - r.realisasi)})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rekapRekening.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapRekening.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th colSpan={2} className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                      <th className="px-6 py-3 text-right font-bold text-purple-800">{formatRupiah(totalRealisasi)}</th>
                      <th className="px-6 py-3"></th>
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
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Uraian / Paket</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Pagu Induk</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">RKPD</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Pagu Perubahan</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rekapPaket.map((r, i) => {
                    const selisihColor = r.selisih > 0 ? 'text-green-600' : r.selisih < 0 ? 'text-red-600' : 'text-gray-500';
                    return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700 max-w-sm whitespace-normal break-words">{r.nama}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{formatRupiah(r.paguInduk)}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{formatRupiah(r.paguRkpd)}</td>
                      <td 
                        className="px-6 py-4 text-right font-semibold text-blue-700 cursor-pointer hover:underline"
                        onClick={() => setSelectedPaket(r.nama)}
                        title="Klik untuk melihat rincian pagu"
                      >
                        {formatRupiah(r.paguPerubahan)}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${selisihColor}`}>
                        {r.selisih > 0 ? '+' : ''}{formatRupiah(r.selisih)}
                      </td>
                    </tr>
                    );
                  })}
                  {rekapPaket.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 italic">Data kosong</td></tr>
                  )}
                </tbody>
                {rekapPaket.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right font-bold text-gray-900">Total Keseluruhan</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-800">{formatRupiah(rekapPaket.reduce((acc, curr) => acc + curr.paguInduk, 0))}</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-800">{formatRupiah(rekapPaket.reduce((acc, curr) => acc + curr.paguRkpd, 0))}</th>
                      <th className="px-6 py-3 text-right font-bold text-blue-800">{formatRupiah(totalPaguPerubahan)}</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-800">{formatRupiah(rekapPaket.reduce((acc, curr) => acc + curr.selisih, 0))}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Rincian Paket: <span className="text-blue-700">{selectedPaket}</span></h3>
              <button onClick={() => setSelectedPaket(null)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto">
               <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-white sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-700 font-semibold bg-gray-50">Sumber Dana</th>
                      <th className="px-6 py-3 text-left text-gray-700 font-semibold bg-gray-50">Rekening</th>
                      <th className="px-6 py-3 text-left text-gray-700 font-semibold bg-gray-50">Spesifikasi</th>
                      <th className="px-6 py-3 text-center text-gray-700 font-semibold bg-gray-50">Koefisien</th>
                      <th className="px-6 py-3 text-right text-gray-700 font-semibold bg-gray-50">Harga Satuan</th>
                      <th className="px-6 py-3 text-right text-gray-700 font-semibold bg-gray-50">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rincianForSelectedPaket.map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-600 align-top max-w-[150px] truncate" title={r.sumberDana?.nama}>{r.sumberDana?.nama || '-'}</td>
                        <td className="px-6 py-4 text-gray-600 align-top max-w-[200px]">
                          <div className="font-medium">{r.rekening?.kode}</div>
                          <div className="text-xs text-gray-500 mt-1">{r.rekening?.nama}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 align-top max-w-[200px] whitespace-normal">
                          <div className="font-medium text-gray-900">{r.sshSbu?.uraianBarang || r.namaPaket}</div>
                          {r.sshSbu?.spesifikasi && (
                            <div className="text-xs text-gray-500 mt-1 italic">{r.sshSbu.spesifikasi}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700 align-top whitespace-nowrap">
                          {r.volumePerubahan} {r.sshSbu?.satuan}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600 align-top whitespace-nowrap">{formatRupiah(r.hargaSatuanPerubahan)}</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-700 align-top whitespace-nowrap">{formatRupiah(r.paguPerubahan)}</td>
                      </tr>
                    ))}
                    {rincianForSelectedPaket.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Data rincian tidak ditemukan.</td></tr>
                    )}
                  </tbody>
                  {rincianForSelectedPaket.length > 0 && (
                    <tfoot className="bg-gray-50 sticky bottom-0 border-t border-gray-200">
                      <tr>
                        <th colSpan={5} className="px-6 py-4 text-right font-bold text-gray-900 uppercase tracking-wider text-xs">Total Keseluruhan</th>
                        <th className="px-6 py-4 text-right font-bold text-blue-800 text-base">
                          {formatRupiah(rincianForSelectedPaket.reduce((acc, curr) => acc + Number(curr.paguPerubahan || 0), 0))}
                        </th>
                      </tr>
                    </tfoot>
                  )}
               </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
