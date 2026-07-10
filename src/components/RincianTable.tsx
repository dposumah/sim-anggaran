'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Lock, Check, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function RincianTable({ rincianList, subKegiatanId, onRefresh, isLocked }: { rincianList: any[], subKegiatanId: number, onRefresh: () => void, isLocked?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ volume: number, hargaSatuan: number, sumberDanaId: number | null }>({ volume: 1, hargaSatuan: 0, sumberDanaId: null });
  const [sumberDanas, setSumberDanas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/sumber-dana')
      .then(res => res.json())
      .then(data => setSumberDanas(Array.isArray(data) ? data : []))
      .catch(e => console.error(e));
  }, []);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus rincian ini?')) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/rincian?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menghapus');
      } else {
        onRefresh();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async (sumberDanaId: number, currentStatus: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kontrol-sumber-dana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subKegiatanId,
          sumberDanaId,
          isLocked: !currentStatus
        })
      });
      if (res.ok) {
        alert(currentStatus ? 'Sumber Dana dibuka.' : 'Sumber Dana dikunci!');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (rincianList.length === 0) return;
    
    const wsData = rincianList.map((r, index) => ({
      'No': index + 1,
      'Kode Rekening': r.rekening?.kode || '-',
      'Nama Rekening': r.rekening?.nama || '-',
      'Rincian (Paket)': r.namaPaket,
      'Komponen': r.komponen || '-',
      'Volume': r.volume,
      'Satuan': r.satuan || '-',
      'Harga Satuan': Number(r.hargaSatuan),
      'Pagu': Number(r.pagu),
      'Pagu Perubahan': r.paguPerubahan !== null ? Number(r.paguPerubahan) : '-',
      'Sumber Dana': r.sumberDana?.nama || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 35 },
      { wch: 40 },
      { wch: 25 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rincian_Belanja');
    XLSX.writeFile(wb, `Rincian_SubKegiatan_${subKegiatanId}.xlsx`);
  };

  const handleEditClick = (r: any) => {
    if (isLocked) {
      alert("Sub kegiatan ini terkunci. Anda tidak dapat mengubah rincian.");
      return;
    }
    setEditingId(r.id);
    setEditData({
      volume: r.volumePerubahan !== null && r.volumePerubahan !== undefined ? r.volumePerubahan : r.volume,
      hargaSatuan: r.hargaSatuanPerubahan !== null && r.hargaSatuanPerubahan !== undefined ? Number(r.hargaSatuanPerubahan) : Number(r.hargaSatuan),
      sumberDanaId: r.sumberDanaId
    });
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/rincian`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          volumePerubahan: editData.volume,
          hargaSatuanPerubahan: editData.hargaSatuan,
          sumberDanaId: editData.sumberDanaId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan');
      } else {
        setEditingId(null);
        onRefresh();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pl-12 pr-4 py-4 bg-gray-50/50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Daftar Rincian Belanja</h4>
        <div className="flex gap-2">
          {rincianList.length > 0 && rincianList[0].sumberDanaId && (
             <button 
                onClick={() => toggleLock(rincianList[0].sumberDanaId, false)}
                className="flex items-center text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 border border-red-200"
              >
                <Lock className="w-3 h-3 mr-1" /> Kunci Sumber Dana Pertama
             </button>
          )}
          
          {rincianList.length > 0 && (
            <button 
              onClick={exportToExcel}
              className="flex items-center text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors shadow-sm"
              title="Export Rincian ke Excel"
            >
              <Download className="w-3 h-3 mr-1" /> Export
            </button>
          )}

          <button className="flex items-center text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary-hover transition-colors shadow-sm" disabled={isLocked}>
            <Plus className="w-3 h-3 mr-1" /> Tambah Rincian
          </button>
        </div>
      </div>
      
      {errorMsg && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {errorMsg}
        </div>
      )}

      {rincianList.length === 0 ? (
        <div className="py-4 text-sm text-secondary italic text-center bg-white rounded-md border border-gray-200">Belum ada rincian belanja di sub kegiatan ini.</div>
      ) : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Kode Rekening</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Nama Rekening</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Uraian / Paket</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Sumber Dana</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Volume</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Harga Satuan</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Pagu Sebelum</th>
                <th className="px-4 py-2.5 text-right font-semibold text-blue-800">Pagu Sesudah</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Selisih</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rincianList.map(r => {
                const isEditing = editingId === r.id;
                
                return (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2 text-gray-700">
                      <div className="font-medium text-xs">{r.rekening?.kode}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      <div className="text-xs text-gray-500 max-w-[200px]" title={r.rekening?.nama}>
                        {r.rekening?.nama}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-xs truncate" title={r.namaPaket}>{r.namaPaket}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {isEditing ? (
                        <select 
                          className="w-full max-w-[150px] px-2 py-1 text-[10px] border border-gray-300 rounded"
                          value={editData.sumberDanaId || ''}
                          onChange={(e) => setEditData({...editData, sumberDanaId: Number(e.target.value)})}
                        >
                          <option value="">Pilih Sumber Dana...</option>
                          {sumberDanas.map(sd => (
                            <option key={sd.id} value={sd.id}>{sd.nama}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {r.sumberDana?.nama || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-right" 
                          value={editData.volume}
                          onChange={(e) => setEditData({...editData, volume: Number(e.target.value)})}
                        />
                      ) : (
                        r.volumePerubahan !== null && r.volumePerubahan !== undefined ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 font-medium">Sebelum: <span className="line-through">{r.volume}</span></span>
                            <span className="text-blue-700 font-semibold">Sesudah: {r.volumePerubahan}</span>
                          </div>
                        ) : r.volume
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right" 
                          value={editData.hargaSatuan}
                          onChange={(e) => setEditData({...editData, hargaSatuan: Number(e.target.value)})}
                        />
                      ) : (
                        r.hargaSatuanPerubahan !== null && r.hargaSatuanPerubahan !== undefined ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 font-medium">Sebelum: <span className="line-through">{formatRupiah(Number(r.hargaSatuan))}</span></span>
                            <span className="text-blue-700 font-semibold">Sesudah: {formatRupiah(Number(r.hargaSatuanPerubahan))}</span>
                          </div>
                        ) : formatRupiah(Number(r.hargaSatuan))
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {formatRupiah(Number(r.pagu))}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-blue-700">
                      {isEditing ? (
                        formatRupiah(editData.volume * editData.hargaSatuan)
                      ) : (
                        r.paguPerubahan !== null && r.paguPerubahan !== undefined ? formatRupiah(Number(r.paguPerubahan)) : '-'
                      )}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${r.paguPerubahan !== null && r.paguPerubahan !== undefined ? (Number(r.paguPerubahan) - Number(r.pagu) > 0 ? 'text-green-600' : Number(r.paguPerubahan) - Number(r.pagu) < 0 ? 'text-red-600' : 'text-gray-400') : 'text-gray-400'}`}>
                      {isEditing ? (
                        <span className={(editData.volume * editData.hargaSatuan) - Number(r.pagu) > 0 ? 'text-green-600' : (editData.volume * editData.hargaSatuan) - Number(r.pagu) < 0 ? 'text-red-600' : 'text-gray-400'}>
                          {((editData.volume * editData.hargaSatuan) - Number(r.pagu) > 0 ? '+' : '') + formatRupiah((editData.volume * editData.hargaSatuan) - Number(r.pagu))}
                        </span>
                      ) : (
                        r.paguPerubahan !== null && r.paguPerubahan !== undefined ? (Number(r.paguPerubahan) - Number(r.pagu) > 0 ? '+' : '') + formatRupiah(Number(r.paguPerubahan) - Number(r.pagu)) : '-'
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-2">
                          <button disabled={loading} onClick={handleSaveEdit} className="text-white hover:bg-green-600 transition-colors p-1 bg-green-500 rounded" title="Simpan">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button disabled={loading} onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 transition-colors p-1 bg-gray-100 rounded" title="Batal">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button disabled={loading || isLocked} onClick={() => handleEditClick(r)} className="text-secondary hover:text-primary transition-colors p-1 bg-gray-100 rounded disabled:opacity-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button disabled={loading || isLocked} onClick={() => handleDelete(r.id)} className="text-secondary hover:text-red-500 transition-colors p-1 bg-gray-100 rounded disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
