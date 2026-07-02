'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Briefcase } from 'lucide-react';

export default function MasterJabatanPage() {
  const [jabatans, setJabatans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nama: '', besaranTpp: 0 });

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ nama: '', besaranTpp: 0 });

  const fetchJabatans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-jabatan');
      const data = await res.json();
      if (res.ok) setJabatans(data);
      else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJabatans();
  }, []);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/master-jabatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      if (res.ok) {
        setIsAdding(false);
        setAddForm({ nama: '', besaranTpp: 0 });
        fetchJabatans();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (id: number) => {
    try {
      const res = await fetch(`/api/master-jabatan?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingId(null);
        fetchJabatans();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jabatan ini?')) return;
    try {
      const res = await fetch(`/api/master-jabatan?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchJabatans();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" /> Master Jabatan
          </h1>
          <p className="text-sm text-secondary">Kelola daftar jabatan dan besaran standar TPP</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Jabatan
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Jabatan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Besaran TPP</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isAdding && (
                <tr className="bg-blue-50/50">
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Contoh: Kepala Dinas"
                      value={addForm.nama}
                      onChange={e => setAddForm({...addForm, nama: e.target.value})}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-right"
                      value={addForm.besaranTpp}
                      onChange={e => setAddForm({...addForm, besaranTpp: Number(e.target.value)})}
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
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
              ) : jabatans.length === 0 && !isAdding ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">Belum ada data jabatan</td></tr>
              ) : (
                jabatans.map(j => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {editingId === j.id ? (
                        <input 
                          type="text" 
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none"
                          value={editForm.nama}
                          onChange={e => setEditForm({...editForm, nama: e.target.value})}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{j.nama}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {editingId === j.id ? (
                        <input 
                          type="number" 
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none text-right"
                          value={editForm.besaranTpp}
                          onChange={e => setEditForm({...editForm, besaranTpp: Number(e.target.value)})}
                        />
                      ) : (
                        formatRupiah(Number(j.besaranTpp))
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === j.id ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleSave(j.id)} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => { setEditingId(j.id); setEditForm({ nama: j.nama, besaranTpp: Number(j.besaranTpp) }); }} 
                            className="p-1.5 text-gray-500 bg-gray-100 rounded hover:text-primary transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(j.id)} 
                            className="p-1.5 text-gray-500 bg-gray-100 rounded hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
