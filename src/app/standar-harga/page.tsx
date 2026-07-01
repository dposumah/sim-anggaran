'use client';

import { useState, useEffect } from 'react';
import { Tags, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StandarHargaPage() {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const fetchData = async (page = 1, searchQuery = search, typeQuery = type) => {
    setLoading(true);
    try {
      const url = `/api/standar-harga?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}&type=${typeQuery}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json.data || []);
      setMeta(json.meta || { total: 0, page: 1, limit: 50, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData(1, '', '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1, search, type);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    fetchData(newPage, search, type);
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tags className="w-6 h-6 text-primary" /> Standar Harga (SSH & SBU)
        </h1>
        <p className="text-sm text-secondary">Cari dan kelola daftar Standar Satuan Harga dan Standar Biaya Umum.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pencarian</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari uraian barang, spesifikasi, atau kode..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
            <select 
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                fetchData(1, search, e.target.value);
              }}
            >
              <option value="">Semua</option>
              <option value="SSH">SSH</option>
              <option value="SBU">SBU</option>
            </select>
          </div>
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium transition-colors shadow-sm h-[38px]">
            Cari
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Memuat data...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode / Rekening</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uraian & Spesifikasi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Satuan</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Harga (Rp)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          row.tipe === 'SSH' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' : 'bg-purple-50 text-purple-700 ring-purple-700/10'
                        }`}>
                          {row.tipe}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="font-semibold">{row.kodeBarang}</div>
                        <div className="text-xs text-gray-500">{row.kodeRekening}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{row.uraianBarang}</div>
                        <div className="text-xs text-gray-500 line-clamp-2" title={row.spesifikasi}>{row.spesifikasi}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.satuan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {formatRupiah(Number(row.hargaSatuan))}
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Tidak ada data ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Menampilkan <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span> hingga <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> dari <span className="font-medium">{meta.total}</span> hasil
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(meta.page - 1)}
                      disabled={meta.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Hal {meta.page} / {meta.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(meta.page + 1)}
                      disabled={meta.page >= meta.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
