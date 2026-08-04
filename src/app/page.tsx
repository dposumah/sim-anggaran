'use client';

import { useEffect, useState } from 'react';
import { 
  Building2, 
  Wallet, 
  Target,
  FileText,
  FileJson,
  X,
  Loader2,
  Search,
  CheckCircle,
  Banknote,
  TrendingUp
} from 'lucide-react';
import { useYear } from '@/contexts/YearContext';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { tahun } = useYear();
  const [viewMode, setViewMode] = useState<'induk' | 'perubahan'>('perubahan');
  const [searchSd, setSearchSd] = useState('');
  const [searchRek, setSearchRek] = useState('');

  // Modal State
  const [selectedItem, setSelectedItem] = useState<{ type: 'sumber_dana' | 'rekening', id: number, name: string } | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?tahun=${tahun}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.error) {
          console.error(resData.error);
          setData(null);
        } else {
          setData(resData);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
        setLoading(false);
      });
  }, [tahun]);

  useEffect(() => {
    if (selectedItem) {
      setLoadingDetail(true);
      fetch(`/api/dashboard/detail?tahun=${tahun}&type=${selectedItem.type}&id=${selectedItem.id}`)
        .then(res => res.json())
        .then(resData => {
          setDetailData(resData);
          setLoadingDetail(false);
        })
        .catch(err => {
          console.error('Error fetching detail:', err);
          setLoadingDetail(false);
        });
    } else {
      setDetailData(null);
    }
  }, [selectedItem, tahun]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl font-medium text-secondary">Memuat Dashboard...</div>
      </div>
    );
  }

  if (!data) return (
    <div className="flex h-full items-center justify-center">
      <div className="text-xl font-medium text-secondary">Data untuk Tahun Anggaran {tahun} belum tersedia.</div>
    </div>
  );

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const handleRowClick = (type: 'sumber_dana' | 'rekening', id: number, name: string) => {
    setSelectedItem({ type, id, name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Anggaran</h1>
        <p className="text-sm text-secondary">Ringkasan alokasi APBD Kota Tomohon TA {tahun}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary">Total Pagu Induk</h3>
            <p className="text-xl font-bold text-foreground">{formatRupiah(data.summary.totalPaguInduk)}</p>
          </div>
        </div>
        
        <div className="flex items-center rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Banknote className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-secondary">Total Pagu Perubahan</h3>
            <p className="text-xl font-bold text-foreground">{formatRupiah(data.summary.totalPaguPerubahan)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-secondary">Total Realisasi</h3>
              <p className="text-xl font-bold text-foreground">{formatRupiah(data.summary.totalRealisasi)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-purple-700">
              {((data.summary.totalRealisasi / (data.summary.totalPaguPerubahan || 1)) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-gray-500">Terserap</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 lg:grid-cols-4">
        <div className="flex items-center rounded-xl bg-surface p-4 shadow-sm border border-border">
          <Building2 className="h-5 w-5 text-success/70" />
          <div className="ml-3">
            <h3 className="text-xs font-medium text-secondary">SKPD</h3>
            <p className="text-lg font-bold text-foreground">{data.summary.skpdCount}</p>
          </div>
        </div>
        <div className="flex items-center rounded-xl bg-surface p-4 shadow-sm border border-border">
          <Target className="h-5 w-5 text-accent/70" />
          <div className="ml-3">
            <h3 className="text-xs font-medium text-secondary">Program</h3>
            <p className="text-lg font-bold text-foreground">{data.summary.programCount}</p>
          </div>
        </div>
        <div className="flex items-center rounded-xl bg-surface p-4 shadow-sm border border-border">
          <FileText className="h-5 w-5 text-amber-500/70" />
          <div className="ml-3">
            <h3 className="text-xs font-medium text-secondary">Kegiatan</h3>
            <p className="text-lg font-bold text-foreground">{data.summary.kegiatanCount}</p>
          </div>
        </div>
        <div className="flex items-center rounded-xl bg-surface p-4 shadow-sm border border-border">
          <FileJson className="h-5 w-5 text-purple-500/70" />
          <div className="ml-3">
            <h3 className="text-xs font-medium text-secondary">Sub Kegiatan</h3>
            <p className="text-lg font-bold text-foreground">{data.summary.subKegiatanCount}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode('induk')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'induk' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Pagu Induk
          </button>
          <button
            onClick={() => setViewMode('perubahan')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'perubahan' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Pagu Perubahan
          </button>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tabel Sumber Dana */}
        <div className="rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">Rekapitulasi per Sumber Dana</h3>
            <div className="relative w-48">
              <input
                type="text"
                placeholder="Cari..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchSd}
                onChange={(e) => setSearchSd(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
            </div>
          </div>
          <div className="overflow-x-auto h-96 relative border rounded-lg">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Sumber Dana</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Total Pagu (Rp)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Realisasi (Rp)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">% Serap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.sumberDanaChart?.filter((i:any) => i.name.toLowerCase().includes(searchSd.toLowerCase())).map((item: any, index: number) => {
                  const pagu = viewMode === 'induk' ? item.paguInduk : item.paguPerubahan;
                  const totalPaguContext = viewMode === 'induk' ? data.summary.totalPaguInduk : data.summary.totalPaguPerubahan;
                  const percentage = totalPaguContext > 0 ? ((pagu / totalPaguContext) * 100).toFixed(1) : '0.0';
                  const realisasiPercent = pagu > 0 ? ((item.realisasi / pagu) * 100).toFixed(1) : '0.0';
                  return (
                    <tr 
                      key={index} 
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick('sumber_dana', item.id, item.name)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatRupiah(pagu)}
                        <div className="text-[10px] text-gray-500">{percentage}% dr Total</div>
                      </td>
                      <td className="px-4 py-3 text-right text-purple-700 font-medium">
                        {formatRupiah(item.realisasi || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                          {realisasiPercent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!data.sumberDanaChart || data.sumberDanaChart.filter((i:any) => i.name.toLowerCase().includes(searchSd.toLowerCase())).length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data sumber dana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">* Klik baris untuk melihat rincian Sub Kegiatan</p>
        </div>

        {/* Tabel Rekening */}
        <div className="rounded-xl bg-surface p-6 shadow-sm border border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">Rekapitulasi per Rekening Belanja</h3>
            <div className="relative w-48">
              <input
                type="text"
                placeholder="Cari..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchRek}
                onChange={(e) => setSearchRek(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
            </div>
          </div>
          <div className="overflow-x-auto h-96 relative border rounded-lg">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Rekening</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Total Pagu (Rp)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Realisasi (Rp)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">% Serap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rekeningChart?.filter((i:any) => i.nama.toLowerCase().includes(searchRek.toLowerCase()) || i.kode.includes(searchRek)).map((item: any, index: number) => {
                  const pagu = viewMode === 'induk' ? item.paguInduk : item.paguPerubahan;
                  const totalPaguContext = viewMode === 'induk' ? data.summary.totalPaguInduk : data.summary.totalPaguPerubahan;
                  const percentage = totalPaguContext > 0 ? ((pagu / totalPaguContext) * 100).toFixed(1) : '0.0';
                  const realisasiPercent = pagu > 0 ? ((item.realisasi / pagu) * 100).toFixed(1) : '0.0';
                  return (
                    <tr 
                      key={index} 
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick('rekening', item.id, item.nama)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 line-clamp-2" title={item.nama}>{item.nama}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.kode}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                        {formatRupiah(pagu)}
                        <div className="text-[10px] text-gray-500">{percentage}% dr Total</div>
                      </td>
                      <td className="px-4 py-3 text-right text-purple-700 font-medium whitespace-nowrap">
                        {formatRupiah(item.realisasi || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                          {realisasiPercent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!data.rekeningChart || data.rekeningChart.filter((i:any) => i.nama.toLowerCase().includes(searchRek.toLowerCase()) || i.kode.includes(searchRek)).length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data rekening.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">* Klik baris untuk melihat rincian Sub Kegiatan</p>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Rincian Penggunaan {selectedItem.type === 'sumber_dana' ? 'Sumber Dana' : 'Rekening'}
                </h2>
                <p className="text-sm font-medium text-blue-600 mt-1">{selectedItem.name}</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-500">Memuat rincian sub kegiatan...</p>
                </div>
              ) : detailData?.error ? (
                <div className="p-8 text-center text-red-500 bg-red-50">
                  {detailData.error}
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-100 border-b sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-gray-900 w-16">No</th>
                      <th className="px-6 py-3 font-semibold text-gray-900">Sub Kegiatan</th>
                      <th className="px-6 py-3 font-semibold text-gray-900 text-right">Pagu (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailData?.details?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.nama}</div>
                          <div className="text-xs text-gray-500 mt-1">{item.kode}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                          {formatRupiah(item.pagu)}
                        </td>
                      </tr>
                    ))}
                    {(!detailData?.details || detailData.details.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                          Tidak ada sub kegiatan ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {detailData?.details && detailData.details.length > 0 && (
                    <tfoot className="bg-gray-50 border-t font-bold sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-right text-gray-900">Total</td>
                        <td className="px-6 py-4 text-right text-blue-700 whitespace-nowrap">
                          {formatRupiah(detailData.details.reduce((sum: number, item: any) => sum + item.pagu, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
