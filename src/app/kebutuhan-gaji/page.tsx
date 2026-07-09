'use client';

import { useState, useEffect } from 'react';
import { Users, Calculator, Download, Building, Settings, CheckSquare, Edit } from 'lucide-react';
import { useYear } from '@/contexts/YearContext';

export default function KebutuhanGajiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { tahun } = useYear();

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<any>({
    komponenGaji13: '',
    komponenGaji14: '',
    gajiTerusanBulan: 3,
    acressPersen: 2.5
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [showRealisasi, setShowRealisasi] = useState(false);
  const [rForm, setRForm] = useState({ skpdId: 0, kategori: 'PNS', uraianBelanja: 'gapok', bulan: 1, nominal: 0 });
  const [isSavingRealisasi, setIsSavingRealisasi] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/kebutuhan-gaji?tahun=${tahun}`)
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) {
          setData(d);
          if (d.length > 0 && d[0].pengaturan) {
            setSettings(d[0].pengaturan);
          }
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [tahun]);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/pengaturan-gaji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahunId: data[0].pengaturan.tahunId,
          ...settings
        })
      });
      if (res.ok) {
        setShowSettings(false);
        fetchData();
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch (e) {
      alert('Error');
    }
    setIsSavingSettings(false);
  };

  const saveRealisasi = async () => {
    setIsSavingRealisasi(true);
    try {
      const res = await fetch('/api/realisasi-gaji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rForm,
          skpdId: rForm.skpdId || data[0].id,
          tahunId: data[0].pengaturan.tahunId
        })
      });
      if (res.ok) {
        setShowRealisasi(false);
        fetchData();
      } else {
        alert('Gagal menyimpan realisasi');
      }
    } catch (e) {
      alert('Error');
    }
    setIsSavingRealisasi(false);
  };

  const toggleKomponen = (jenis: '13' | '14', key: string) => {
    const field = jenis === '13' ? 'komponenGaji13' : 'komponenGaji14';
    let arr = (settings[field] || '').split(',').filter(Boolean);
    if (arr.includes(key)) arr = arr.filter((k: string) => k !== key);
    else arr.push(key);
    setSettings({ ...settings, [field]: arr.join(',') });
  };

  const uraianList = [
    { label: 'Belanja Gaji Pokok', key: 'gapok' },
    { label: 'Belanja Tunjangan Keluarga', key: 'tunjKeluarga' },
    { label: 'Belanja Tunjangan Jabatan', key: 'tunjJabatan' },
    { label: 'Belanja Tunjangan Fungsional', key: 'tunjFungsional' },
    { label: 'Belanja Tunjangan Fungsional Umum', key: 'tunjFungsionalUmum' },
    { label: 'Belanja Tunjangan Beras', key: 'tunjBeras' },
    { label: 'Belanja Tunjangan PPh/Tunjangan Khusus', key: 'tunjPph' },
    { label: 'Belanja Pembulatan Gaji', key: 'pembulatan' },
    { label: 'Belanja Iuran Jaminan Kesehatan', key: 'bpjsKes' },
    { label: 'Belanja Iuran Jaminan Kecelakaan Kerja', key: 'jkk' },
    { label: 'Belanja Iuran Jaminan Kematian', key: 'jkm' },
    { label: 'Belanja Tambahan Penghasilan Pegawai (TPP)', key: 'tpp' },
  ];

  const totalPns = data.reduce((acc, curr) => acc + curr.pns.count, 0);
  const totalPppk = data.reduce((acc, curr) => acc + curr.pppk.count, 0);
  const totalHonorer = data.reduce((acc, curr) => acc + curr.honorer.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Kebutuhan Gaji & TPP
          </h1>
          <p className="text-sm text-secondary">
            Estimasi proyeksi belanja pegawai khusus Dinas Pendidikan
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Settings className="w-4 h-4" /> Pengaturan Gaji
          </button>
          <button 
            onClick={() => setShowRealisasi(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Edit className="w-4 h-4" /> Input Realisasi
          </button>
          <button 
            onClick={() => window.open(`/api/kebutuhan-gaji/export?tahun=${tahun}`, '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4"><Users className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">Total PNS</p><h3 className="text-2xl font-bold text-gray-900">{totalPns}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mr-4"><Users className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">Total PPPK</p><h3 className="text-2xl font-bold text-gray-900">{totalPppk}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-border flex items-center">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg mr-4"><Users className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">Total Honorer</p><h3 className="text-2xl font-bold text-gray-900">{totalHonorer}</h3></div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-border">Menghitung formulasi gaji...</div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-gray-500 italic bg-white rounded-xl shadow-sm border border-border">Data SKPD Pendidikan tidak ditemukan.</div>
      ) : (
        <div className="space-y-8">
          {data.map(skpd => (
            <div key={skpd.id} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="font-bold text-gray-900">{skpd.nama}</h3>
                  <p className="text-xs text-gray-500">{skpd.kode}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Kebutuhan Setahun</p>
                  <p className="text-lg font-bold text-primary">{formatRupiah(skpd.grandTotal)}</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Uraian Belanja</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-blue-50/50">PNS</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-indigo-50/50">PPPK</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-amber-50/50">HONORER</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Total Setahun</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50/50">Realisasi</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-red-700 uppercase tracking-wider bg-red-50/50">Sisa Anggaran</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {uraianList.map((row, idx) => {
                      const multiplier = skpd.multipliers[row.key] || 12;
                      const pnsVal = (skpd.pns[row.key] || 0) * multiplier;
                      const pppkVal = (skpd.pppk[row.key] || 0) * multiplier;
                      const honorerVal = (skpd.honorer[row.key] || 0) * multiplier;
                      const totalVal = pnsVal + pppkVal + honorerVal;
                      
                      const realisasiPns = skpd.pns.realisasi[row.key] || 0;
                      const realisasiPppk = skpd.pppk.realisasi[row.key] || 0;
                      const realisasiHon = skpd.honorer.realisasi[row.key] || 0;
                      const totalRealisasi = realisasiPns + realisasiPppk + realisasiHon;
                      const sisa = totalVal - totalRealisasi;

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-sm text-gray-900">{row.label} <span className="text-xs text-gray-400">({multiplier} bln)</span></td>
                          <td className="px-6 py-3 text-right text-sm text-gray-700 bg-blue-50/10">{formatRupiah(pnsVal)}</td>
                          <td className="px-6 py-3 text-right text-sm text-gray-700 bg-indigo-50/10">{formatRupiah(pppkVal)}</td>
                          <td className="px-6 py-3 text-right text-sm text-gray-700 bg-amber-50/10">{formatRupiah(honorerVal)}</td>
                          <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{formatRupiah(totalVal)}</td>
                          <td className="px-6 py-3 text-right text-sm text-green-700 bg-green-50/20">{formatRupiah(totalRealisasi)}</td>
                          <td className="px-6 py-3 text-right text-sm text-red-700 bg-red-50/20">{formatRupiah(sisa)}</td>
                        </tr>
                      );
                    })}
                    
                    {/* Terusan */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-sm text-gray-900">Belanja Gaji Terusan <span className="text-xs text-gray-400">({settings.gajiTerusanBulan} bln)</span></td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700 bg-blue-50/10">{formatRupiah(skpd.pns.terusan)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700 bg-indigo-50/10">{formatRupiah(skpd.pppk.terusan)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700 bg-amber-50/10">{formatRupiah(skpd.honorer.terusan)}</td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{formatRupiah(skpd.pns.terusan + skpd.pppk.terusan + skpd.honorer.terusan)}</td>
                      <td className="px-6 py-3 text-right text-sm text-green-700 bg-green-50/20">{formatRupiah((skpd.pns.realisasi.terusan||0) + (skpd.pppk.realisasi.terusan||0) + (skpd.honorer.realisasi.terusan||0))}</td>
                      <td className="px-6 py-3 text-right text-sm text-red-700 bg-red-50/20">{formatRupiah((skpd.pns.terusan + skpd.pppk.terusan + skpd.honorer.terusan) - ((skpd.pns.realisasi.terusan||0) + (skpd.pppk.realisasi.terusan||0) + (skpd.honorer.realisasi.terusan||0)))}</td>
                    </tr>
                    
                    {/* Acress */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-sm text-gray-900">Cadangan / Acress <span className="text-xs text-gray-400">({settings.acressPersen}%)</span></td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700 bg-blue-50/10">{formatRupiah(skpd.pns.acress)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700 bg-indigo-50/10">{formatRupiah(skpd.pppk.acress)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700 bg-amber-50/10">{formatRupiah(skpd.honorer.acress)}</td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{formatRupiah(skpd.pns.acress + skpd.pppk.acress + skpd.honorer.acress)}</td>
                      <td className="px-6 py-3 text-right text-sm text-green-700 bg-green-50/20">{formatRupiah((skpd.pns.realisasi.acress||0) + (skpd.pppk.realisasi.acress||0) + (skpd.honorer.realisasi.acress||0))}</td>
                      <td className="px-6 py-3 text-right text-sm text-red-700 bg-red-50/20">{formatRupiah((skpd.pns.acress + skpd.pppk.acress + skpd.honorer.acress) - ((skpd.pns.realisasi.acress||0) + (skpd.pppk.realisasi.acress||0) + (skpd.honorer.realisasi.acress||0)))}</td>
                    </tr>

                    {/* GRAND TOTAL */}
                    <tr className="bg-blue-900">
                      <td className="px-6 py-4 font-bold text-sm text-white">GRAND TOTAL</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-blue-200">{formatRupiah(skpd.pns.total)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-indigo-200">{formatRupiah(skpd.pppk.total)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-amber-200">{formatRupiah(skpd.honorer.total)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-white">{formatRupiah(skpd.grandTotal)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-green-300">{formatRupiah(skpd.realisasiTotal)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-red-300">{formatRupiah(skpd.grandTotal - skpd.realisasiTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5"/> Pengaturan Parameter Gaji</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 border-b pb-2">Gaji ke-13</h3>
                  <div className="space-y-2">
                    {uraianList.map(u => (
                      <label key={`13-${u.key}`} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox" className="rounded" checked={(settings.komponenGaji13||'').includes(u.key)} onChange={() => toggleKomponen('13', u.key)} />
                        {u.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 border-b pb-2">Gaji ke-14 (THR)</h3>
                  <div className="space-y-2">
                    {uraianList.map(u => (
                      <label key={`14-${u.key}`} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox" className="rounded" checked={(settings.komponenGaji14||'').includes(u.key)} onChange={() => toggleKomponen('14', u.key)} />
                        {u.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Gaji Terusan (Bulan)</label>
                  <input type="number" className="w-full p-2 border border-border rounded focus:outline-none focus:border-primary" 
                    value={settings.gajiTerusanBulan} onChange={e => setSettings({...settings, gajiTerusanBulan: Number(e.target.value)})} />
                  <p className="text-xs text-gray-500 mt-1">Estimasi dihitung rata-rata kebutuhan gaji per bulan dikali x bulan.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Acress (%)</label>
                  <input type="number" step="0.1" className="w-full p-2 border border-border rounded focus:outline-none focus:border-primary" 
                    value={settings.acressPersen} onChange={e => setSettings({...settings, acressPersen: Number(e.target.value)})} />
                  <p className="text-xs text-gray-500 mt-1">Persentase cadangan dihitung dari total setahun.</p>
                </div>
              </div>

            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Batal</button>
              <button onClick={saveSettings} disabled={isSavingSettings} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-2">
                <CheckSquare className="w-4 h-4"/> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realisasi Modal */}
      {showRealisasi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold flex items-center gap-2"><Edit className="w-5 h-5"/> Input Realisasi</h2>
              <button onClick={() => setShowRealisasi(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Bulan</label>
                <select className="w-full p-2 border border-border rounded" value={rForm.bulan} onChange={e => setRForm({...rForm, bulan: Number(e.target.value)})}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(b => <option key={b} value={b}>Bulan ke-{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Kategori Pegawai</label>
                <select className="w-full p-2 border border-border rounded" value={rForm.kategori} onChange={e => setRForm({...rForm, kategori: e.target.value})}>
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="HONORER">HONORER</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Uraian Belanja</label>
                <select className="w-full p-2 border border-border rounded" value={rForm.uraianBelanja} onChange={e => setRForm({...rForm, uraianBelanja: e.target.value})}>
                  {uraianList.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                  <option value="terusan">Belanja Gaji Terusan</option>
                  <option value="acress">Cadangan / Acress</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nominal Realisasi (Rp)</label>
                <input type="number" className="w-full p-2 border border-border rounded" value={rForm.nominal} onChange={e => setRForm({...rForm, nominal: Number(e.target.value)})} />
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowRealisasi(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Batal</button>
              <button onClick={saveRealisasi} disabled={isSavingRealisasi} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-2">
                <CheckSquare className="w-4 h-4"/> Simpan Realisasi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
