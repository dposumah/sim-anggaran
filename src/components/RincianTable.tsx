'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, Lock, Unlock } from 'lucide-react';

export default function RincianTable({ rincianList, subKegiatanId, onRefresh }: { rincianList: any[], subKegiatanId: number, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  return (
    <div className="pl-12 pr-4 py-4 bg-gray-50/50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Daftar Rincian Belanja</h4>
        <div className="flex gap-2">
          {/* Untuk demonstrasi Kunci Sumber Dana. Di aplikasi nyata, tombol ini per sumber dana */}
          {rincianList.length > 0 && rincianList[0].sumberDanaId && (
             <button 
                onClick={() => toggleLock(rincianList[0].sumberDanaId, false)}
                className="flex items-center text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 border border-red-200"
              >
                <Lock className="w-3 h-3 mr-1" /> Kunci Sumber Dana Pertama
             </button>
          )}
          
          <button className="flex items-center text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary-hover transition-colors shadow-sm">
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
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Rekening</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Uraian / Paket</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-900">Sumber Dana</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Volume</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Harga Satuan</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-900">Total Pagu</th>
                <th className="px-4 py-2.5 text-center font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rincianList.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2 text-gray-700">
                    <div className="font-medium text-xs">{r.rekening?.kode}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]" title={r.rekening?.nama}>
                      {r.rekening?.nama}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-700 max-w-xs truncate" title={r.namaPaket}>{r.namaPaket}</td>
                  <td className="px-4 py-2 text-gray-700">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {r.sumberDana?.nama || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">{r.volume}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatRupiah(Number(r.hargaSatuan))}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{formatRupiah(Number(r.pagu))}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button disabled={loading} className="text-secondary hover:text-primary transition-colors p-1 bg-gray-100 rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button disabled={loading} onClick={() => handleDelete(r.id)} className="text-secondary hover:text-red-500 transition-colors p-1 bg-gray-100 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
