'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Database } from 'lucide-react';

export default function MasterGajiPage() {
  const [dataGaji, setDataGaji] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ status: 'PNS', golongan: '', masaKerja: 0, gajiPokok: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-gaji');
      const data = await res.json();
      if (res.ok) setDataGaji(data);
      else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/master-gaji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      if (res.ok) {
        setIsAdding(false);
        setAddForm({ status: 'PNS', golongan: '', masaKerja: 0, gajiPokok: 0 });
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data gaji ini?')) return;
    try {
      const res = await fetch(`/api/master-gaji?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    try {
      const res = await fetch('/api/master-gaji/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Master Gaji
          </h1>
          <p className="text-sm text-secondary">Kelola daftar standar Gaji Pokok PNS dan PPPK</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm transition-colors cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
            <Database className="w-4 h-4" /> Upload Excel
          </label>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Gaji
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Golongan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Masa Kerja (Tahun)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gaji Pokok</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isAdding && (
                <tr className="bg-blue-50/50">
                  <td className="px-6 py-4">
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      value={addForm.status}
                      onChange={e => setAddForm({...addForm, status: e.target.value})}
                    >
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Misal: IIIa atau IX"
                      value={addForm.golongan}
                      onChange={e => setAddForm({...addForm, golongan: e.target.value})}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-right"
                      value={addForm.masaKerja}
                      onChange={e => setAddForm({...addForm, masaKerja: Number(e.target.value)})}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-right"
                      value={addForm.gajiPokok}
                      onChange={e => setAddForm({...addForm, gajiPokok: Number(e.target.value)})}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={handleAdd} className="p-2 text-green-600 hover:bg-green-50 rounded-md"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setIsAdding(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-md"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )}

              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
              ) : dataGaji.length === 0 && !isAdding ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">Belum ada data gaji</td></tr>
              ) : (
                dataGaji.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{g.status}</td>
                    <td className="px-6 py-3 text-gray-700">{g.golongan}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{g.masaKerja}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{formatRupiah(Number(g.gajiPokok))}</td>
                    <td className="px-6 py-3 text-center">
                      <button 
                        onClick={() => handleDelete(g.id)} 
                        className="p-1.5 text-gray-500 bg-gray-100 rounded hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
