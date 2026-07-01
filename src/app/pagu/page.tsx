'use client';

import { useState, useEffect } from 'react';
import { Pencil, ShieldAlert } from 'lucide-react';

export default function PaguPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ skpdId: 0, ceilingAmount: 0, skpdName: '' });
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pagu');
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/pagu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skpdId: form.skpdId,
          ceilingAmount: form.ceilingAmount
        })
      });
      setShowModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const openForm = (item: any) => {
    setForm({ skpdId: item.id, ceilingAmount: item.ceilingAmount, skpdName: item.nama });
    setShowModal(true);
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" /> Kontrol Pagu SKPD
        </h1>
        <p className="text-sm text-secondary">Atur batas maksimal pagu anggaran untuk masing-masing SKPD / Sub Unit.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Memuat data...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKPD / Sub Unit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Batas Pagu (Ceiling)</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {row.kode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {row.nama}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-700">
                    {formatRupiah(row.ceilingAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button onClick={() => openForm(row)} className="text-blue-600 hover:text-blue-800 p-2 flex items-center justify-center w-full">
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Set Pagu Ceiling</h2>
            <p className="text-sm text-gray-500 mb-4">{form.skpdName}</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batas Maksimal Anggaran (Rp)</label>
                <input 
                  type="number" 
                  value={form.ceilingAmount} 
                  onChange={e => setForm({...form, ceilingAmount: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-semibold text-blue-700"
                  required
                  min="0"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
