'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function RealisasiPage() {
  const [tahun, setTahun] = useState<number>(2026);
  const [skpds, setSkpds] = useState<any[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState<string>('');
  
  const [realisasi, setRealisasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subKegiatanId: '',
    sumberDanaId: '',
    rekeningId: '',
    bulan: '',
    nominal: '',
    keterangan: ''
  });
  const [sumberDanas, setSumberDanas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/dashboard?tahun=' + tahun)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setSkpds(data.data.map((s: any) => ({ id: s.id, nama: s.nama })));
          if (data.data.length > 0) setSelectedSkpd(data.data[0].id.toString());
        }
      });
    fetch('/api/sumber-dana').then(r => r.json()).then(d => setSumberDanas(d));
  }, [tahun]);

  useEffect(() => {
    if (selectedSkpd) loadRealisasi();
  }, [selectedSkpd]);

  const loadRealisasi = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/realisasi?skpdId=${selectedSkpd}&tahun=${tahun}`);
      const data = await res.json();
      if (data.data) setRealisasi(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const buffer = await uploadFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const REQUIRED_HEADERS = ['Kode Sub Kegiatan', 'Kode Rekening', 'Alokasi Anggaran', 'Realisasi Anggaran'];
      let headerRowIndex = -1;
      let headerMap: Record<string, number> = {};

      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        const rowStrings = row.map((cell: any) => String(cell || '').trim());
        const found = REQUIRED_HEADERS.every(h => rowStrings.some(cell => cell.toLowerCase().includes(h.toLowerCase())));
        if (found) {
          headerRowIndex = i;
          rowStrings.forEach((cell: string, idx: number) => { headerMap[cell] = idx; });
          break;
        }
      }

      if (headerRowIndex < 0) {
        setUploadResult({ error: 'Header tidak ditemukan. Pastikan ada: ' + REQUIRED_HEADERS.join(', ') });
        return;
      }

      let colNamaSKPD = -1;
      for (const key of Object.keys(headerMap)) {
        if (key.toLowerCase().includes('nama skpd') || key.toLowerCase().includes('nama sub skpd')) {
          colNamaSKPD = headerMap[key];
          break;
        }
      }

      const filteredData = [];
      const dataRows = rawData.slice(headerRowIndex + 1);
      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        if (colNamaSKPD >= 0) {
          const rowSkpdName = String(row[colNamaSKPD] || '').trim().toLowerCase();
          if (!rowSkpdName || !rowSkpdName.includes('pendidikan')) {
            continue;
          }
        }
        filteredData.push(row);
      }

      const res = await fetch('/api/upload-realisasi', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           tahun, 
           filteredData,
           headerMap
        }) 
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Gagal membaca response server (mungkin file masih terlalu besar).');
      }
      
      if (res.ok) {
        setUploadResult(data);
        setUploadFile(null);
        loadRealisasi();
      } else {
        setUploadResult({ error: data.error || 'Terjadi kesalahan' });
      }
    } catch (e: any) {
      setUploadResult({ error: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus realisasi ini?')) return;
    try {
      await fetch(`/api/realisasi?id=${id}`, { method: 'DELETE' });
      loadRealisasi();
    } catch (e) { console.error(e); }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/realisasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, skpdId: selectedSkpd, tahun })
      });
      if (res.ok) {
        setFormData({ subKegiatanId: '', sumberDanaId: '', rekeningId: '', bulan: '', nominal: '', keterangan: '' });
        setShowForm(false);
        loadRealisasi();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menyimpan');
      }
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const getBulanName = (b: number) => {
    if (b === 0) return 'Total/Akumulasi';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[b - 1] || b;
  };

  // Aggregate summary
  const totalAlokasi = realisasi.reduce((s, r) => s + Number(r.alokasiRealisasi || 0), 0);
  const totalRealisasi = realisasi.reduce((s, r) => s + Number(r.nominal || 0), 0);
  const totalSisa = totalAlokasi - totalRealisasi;
  const pctSerapan = totalAlokasi > 0 ? (totalRealisasi / totalAlokasi * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Realisasi Anggaran
          </h1>
          <p className="text-sm text-secondary">Kontrol dan monitor realisasi belanja per Sub Kegiatan</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <select value={selectedSkpd} onChange={(e) => setSelectedSkpd(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none max-w-[250px] truncate">
            {skpds.map(s => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-600" /> Upload Excel Realisasi
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Upload file Excel Laporan Realisasi Pemerintah Daerah. Kolom yang diperlukan: <b>Kode Sub Kegiatan, Kode Rekening, Alokasi Anggaran, Realisasi Anggaran</b>. 
          Header akan dideteksi otomatis.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-dashed border-gray-300 hover:border-primary hover:bg-blue-50/50 cursor-pointer transition-colors text-sm">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            {uploadFile ? uploadFile.name : 'Pilih File Excel (.xlsx)'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
              setUploadFile(e.target.files?.[0] || null);
              setUploadResult(null);
            }} />
          </label>
          <button 
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Memproses...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload & Import</>
            )}
          </button>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className={`mt-4 p-4 rounded-lg border text-sm ${uploadResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            {uploadResult.error ? (
              <div className="flex items-start gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div><b>Gagal:</b> {uploadResult.error}</div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                  <CheckCircle2 className="w-5 h-5" /> Import Berhasil
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700">
                  <div className="bg-white rounded-md p-2 border">
                    <div className="text-xs text-gray-500">Total Baris</div>
                    <div className="font-bold">{uploadResult.summary?.totalRows?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-md p-2 border">
                    <div className="text-xs text-gray-500">Berhasil Import</div>
                    <div className="font-bold text-green-600">{uploadResult.summary?.imported?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-md p-2 border">
                    <div className="text-xs text-gray-500">Dilewati (SKPD lain)</div>
                    <div className="font-bold text-gray-500">{uploadResult.summary?.skipped?.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-md p-2 border">
                    <div className="text-xs text-gray-500">Error</div>
                    <div className="font-bold text-red-600">{uploadResult.summary?.errors}</div>
                  </div>
                </div>
                {uploadResult.warnings?.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-orange-600 cursor-pointer font-medium">
                      ⚠️ {uploadResult.warnings.length} Peringatan (klik untuk lihat)
                    </summary>
                    <ul className="mt-2 text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.warnings.map((w: string, i: number) => (
                        <li key={i} className="bg-orange-50 rounded px-2 py-1">⚠ {w}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {realisasi.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="text-xs text-gray-500 font-medium">Total Alokasi</div>
            <div className="text-lg font-bold text-gray-800 mt-1">{formatRupiah(totalAlokasi)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="text-xs text-gray-500 font-medium">Total Realisasi</div>
            <div className="text-lg font-bold text-blue-700 mt-1">{formatRupiah(totalRealisasi)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="text-xs text-gray-500 font-medium">Sisa Anggaran</div>
            <div className={`text-lg font-bold mt-1 ${totalSisa >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRupiah(totalSisa)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="text-xs text-gray-500 font-medium">% Serapan</div>
            <div className="text-lg font-bold text-purple-700 mt-1">{pctSerapan.toFixed(2)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, pctSerapan)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
          <h3 className="font-medium text-gray-700">Data Realisasi</h3>
          <button onClick={() => setShowForm(!showForm)}
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1">
            <Plus className="w-4 h-4" /> Input Manual
          </button>
        </div>

        {/* Manual Input Form */}
        {showForm && (
          <div className="p-4 bg-blue-50/30 border-b border-border">
            <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sub Kegiatan ID</label>
                <input required type="number" value={formData.subKegiatanId} onChange={e => setFormData({...formData, subKegiatanId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="ID Sub Kegiatan" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rekening ID</label>
                <input required type="number" value={formData.rekeningId} onChange={e => setFormData({...formData, rekeningId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="ID Rekening" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sumber Dana</label>
                <select required value={formData.sumberDanaId} onChange={e => setFormData({...formData, sumberDanaId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Pilih Sumber Dana</option>
                  {sumberDanas.map(sd => (<option key={sd.id} value={sd.id}>{sd.nama}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bulan (1-12, 0=Total)</label>
                <input required type="number" min="0" max="12" value={formData.bulan} onChange={e => setFormData({...formData, bulan: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nominal Realisasi</label>
                <input required type="number" value={formData.nominal} onChange={e => setFormData({...formData, nominal: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-full flex justify-end gap-2 mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md flex items-center gap-2">
                  <Check className="w-4 h-4" /> Simpan
                </button>
              </div>
            </form>
          </div>
        )}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-3 font-semibold">Bulan</th>
                  <th className="px-3 py-3 font-semibold">Sub Kegiatan</th>
                  <th className="px-3 py-3 font-semibold">Rekening</th>
                  <th className="px-3 py-3 font-semibold">Sumber Dana</th>
                  <th className="px-3 py-3 font-semibold text-right">Alokasi</th>
                  <th className="px-3 py-3 font-semibold text-right">Realisasi</th>
                  <th className="px-3 py-3 font-semibold text-right">Sisa</th>
                  <th className="px-3 py-3 font-semibold text-right">% Serapan</th>
                  <th className="px-3 py-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {realisasi.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Belum ada data realisasi. Silakan upload Excel atau input manual.
                    </td>
                  </tr>
                ) : (
                  realisasi.map((r, idx) => {
                    const alokasi = Number(r.alokasiRealisasi || 0);
                    const realisasiVal = Number(r.nominal || 0);
                    const sisa = alokasi - realisasiVal;
                    const pct = alokasi > 0 ? (realisasiVal / alokasi * 100) : 0;
                    
                    return (
                      <tr key={r.id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-xs">{getBulanName(r.bulan)}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-xs">{r.subKegiatan?.kode}</div>
                          <div className="text-[10px] text-gray-500 max-w-[180px] truncate" title={r.subKegiatan?.nama}>{r.subKegiatan?.nama}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-xs">{r.rekening?.kode}</div>
                          <div className="text-[10px] text-gray-500 max-w-[180px] truncate" title={r.rekening?.nama}>{r.rekening?.nama}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {r.sumberDana?.nama || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-medium text-gray-700">{formatRupiah(alokasi)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-blue-700">{formatRupiah(realisasiVal)}</td>
                        <td className={`px-3 py-2.5 text-right text-xs font-bold ${sisa >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRupiah(sisa)}</td>
                        <td className="px-3 py-2.5 text-right text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${pct > 80 ? 'bg-green-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <span className="font-medium text-gray-600 w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
