'use client';

import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

const formatCurrency = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number || 0);
};

export default function UploadPDFRincian() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-pdf-rincian', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setParsedData(data.data);
        setItems(data.data.items);
      } else {
        alert(data.error || 'Gagal membaca PDF');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/save-pdf-rincian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subKegiatan: parsedData.subKegiatan,
          items 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Data berhasil disimpan ke database!');
        setParsedData(null);
        setItems([]);
        setFile(null);
      } else {
        alert(data.error || 'Gagal menyimpan data');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'jumlah') {
      const jumlah = parseFloat(value) || 0;
      newItems[index].hargaSatuan = jumlah;
    }
    setItems(newItems);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/upload" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Upload PDF Rincian Belanja</h1>
          <p className="text-gray-500 text-sm">Unggah Cetak RKA Rincian Belanja (PDF) dari SIPD untuk mengekstrak standar harga.</p>
        </div>
      </div>

      {!parsedData ? (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Pilih File PDF</h3>
          <p className="text-sm text-gray-500 max-w-md">Pastikan format file adalah PDF hasil Cetak RKA Rincian Belanja dari SIPD.</p>
          <input 
            type="file" 
            accept=".pdf" 
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="block w-full max-w-sm text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading ? 'Membaca PDF...' : 'Mulai Ekstrak'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">PDF Berhasil Dibaca</h4>
              <p className="text-sm text-blue-700">Sub Kegiatan: <strong>{parsedData.subKegiatan}</strong></p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Perhatian: Review Data</h4>
              <p className="text-sm text-yellow-700">Silakan periksa tabel di bawah. Anda bisa mengedit Uraian atau Jumlah langsung di tabel jika ada yang tidak sesuai sebelum menyimpan.</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Rekening</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Paket</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Uraian & Spesifikasi</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right w-48">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 align-top text-xs w-48">
                        <div className="font-medium text-gray-900">{item.rekening}</div>
                        <div className="text-gray-500">{item.namaRekening}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs w-48">
                        <div className="font-medium text-blue-700">{item.paket}</div>
                        <div className="text-gray-500">{item.sumberDana}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input type="text" className="w-full bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 font-medium" value={item.uraian} onChange={e => updateItem(idx, 'uraian', e.target.value)} />
                        <div className="text-xs text-gray-500 mt-1">Spesifikasi: {item.spesifikasi}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input type="number" className="w-full bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 text-right font-medium text-gray-800" value={item.jumlah} onChange={e => updateItem(idx, 'jumlah', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="font-semibold text-gray-800 text-lg">
                Total Jumlah: {formatCurrency(items.reduce((acc, curr) => acc + (parseFloat(curr.jumlah)||0), 0))}
              </div>
              <button onClick={handleSave} disabled={isUploading} className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan ke Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
