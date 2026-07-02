'use client';

import { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('rekap');
  const [tahun, setTahun] = useState<number>(2026);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setMessage('');

    // Simulate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // hold at 90% until API finishes
        }
        return prev + 10;
      });
    }, 300);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('tahun', tahun.toString());

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setFile(null);
      } else {
        setMessage(data.error || 'Upload gagal');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-primary" /> Upload Data Excel
        </h1>
        <p className="text-sm text-secondary">Unggah file rekap anggaran SKPD atau master data Standar Harga untuk memperbarui database.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Anggaran</label>
              <input 
                type="number"
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Data</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="rekap" 
                  checked={type === 'rekap'} 
                  onChange={() => setType('rekap')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Rekap SKPD (Anggaran)</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="standar-harga" 
                  checked={type === 'standar-harga'} 
                  onChange={() => setType('standar-harga')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Master Standar Harga (SSH/SBU)</span>
              </label>
            </div>
          </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Excel (.xlsx)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
              <div className="space-y-1 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-hover focus-within:outline-none">
                    <span>Pilih file dari komputer</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx, .xls" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Hanya menerima file Excel hingga maksimal 50MB
                </p>
              </div>
            </div>
            {file && (
              <div className="mt-3 text-sm text-gray-700 flex items-center gap-2 bg-blue-50 p-2 rounded">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {loading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-2 text-center">Sedang memproses dan menyimpan data... {progress}%</p>
            </div>
          )}

          {message && !loading && (
            <div className={`p-4 rounded-md text-sm flex items-start gap-2 ${message.includes('berhasil') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message.includes('berhasil') && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {message}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              disabled={!file || loading}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Mengunggah...' : 'Upload & Proses Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
