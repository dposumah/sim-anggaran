'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Save, ChevronDown, ChevronUp, FileText, XCircle } from 'lucide-react';
import Link from 'next/link';

const formatCurrency = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number || 0);
};

type ParsedResult = {
  id: string;
  fileName: string;
  status: 'idle' | 'parsing' | 'success' | 'warning' | 'error';
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string;
  data?: any;
  items?: any[];
  expanded?: boolean;
};

export default function UploadPDFRincian() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(newFiles);
      setResults(newFiles.map((file, idx) => ({
        id: file.name + '-' + idx,
        fileName: file.name,
        status: 'idle',
        saveStatus: 'idle',
        expanded: false
      })));
    }
  };

  const handleBatchUpload = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    const newResults = [...results];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const resIdx = newResults.findIndex(r => r.fileName === file.name);
      if (resIdx === -1) continue;

      newResults[resIdx].status = 'parsing';
      setResults([...newResults]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload-pdf-rincian', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          const parsedData = data.data;
          const totalPdf = parsedData.items.reduce((sum: number, r: any) => sum + (parseFloat(r.jumlah) || 0), 0);
          const existingPagu = parsedData.existingPagu || 0;
          const isMatch = totalPdf === existingPagu;

          newResults[resIdx].status = existingPagu === 0 ? 'error' : (isMatch ? 'success' : 'warning');
          newResults[resIdx].errorMessage = existingPagu === 0 ? 'Belum terdaftar atau Rp 0' : undefined;
          newResults[resIdx].data = parsedData;
          newResults[resIdx].items = parsedData.items;
        } else {
          newResults[resIdx].status = 'error';
          newResults[resIdx].errorMessage = data.error || 'Gagal membaca PDF';
        }
      } catch (err: any) {
        newResults[resIdx].status = 'error';
        newResults[resIdx].errorMessage = err.message;
      }
      setResults([...newResults]);
    }
    setIsProcessing(false);
  };

  const toggleExpand = (id: string) => {
    setResults(results.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r));
  };

  const updateItem = (resultId: string, itemIdx: number, field: string, value: any) => {
    setResults(results.map(r => {
      if (r.id === resultId && r.items) {
        const newItems = [...r.items];
        newItems[itemIdx] = { ...newItems[itemIdx], [field]: value };
        return { ...r, items: newItems };
      }
      return r;
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const newResults = [...results];

    for (let i = 0; i < newResults.length; i++) {
      const result = newResults[i];
      // Only save success and warning statuses (ignore errors)
      if ((result.status === 'success' || result.status === 'warning') && result.saveStatus !== 'saved') {
        newResults[i].saveStatus = 'saving';
        setResults([...newResults]);

        try {
          const res = await fetch('/api/save-pdf-rincian', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subKegiatan: result.data.subKegiatan,
              items: result.items
            }),
          });
          const data = await res.json();
          if (data.success) {
            newResults[i].saveStatus = 'saved';
          } else {
            newResults[i].saveStatus = 'error';
            newResults[i].errorMessage = data.error || 'Gagal menyimpan';
          }
        } catch (err: any) {
          newResults[i].saveStatus = 'error';
          newResults[i].errorMessage = err.message;
        }
        setResults([...newResults]);
      }
    }
    setIsSaving(false);
  };

  const hasData = results.some(r => r.status !== 'idle');
  const totalFiles = results.length;
  const readyToSaveCount = results.filter(r => (r.status === 'success' || r.status === 'warning') && r.saveStatus !== 'saved').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/upload" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Upload PDF Rincian Belanja</h1>
          <p className="text-gray-500 text-sm">Unggah banyak PDF sekaligus. Sistem akan memvalidasi pagu secara otomatis.</p>
        </div>
      </div>

      {!hasData && (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Pilih Beberapa File PDF</h3>
          <p className="text-sm text-gray-500 max-w-md">Anda dapat memilih lebih dari satu file PDF sekaligus (Ctrl+A atau tarik kotak).</p>
          <input 
            type="file" 
            accept=".pdf" 
            multiple
            onChange={handleFilesChange}
            className="block w-full max-w-sm text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <button 
            onClick={handleBatchUpload}
            disabled={files.length === 0 || isProcessing}
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isProcessing ? 'Mengekstrak PDF...' : 'Mulai Ekstrak ' + (files.length > 0 ? files.length + ' File' : '')}
          </button>
        </div>
      )}

      {hasData && (
        <div className="space-y-4">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Hasil Ekstraksi ({totalFiles} File)</h2>
            <button onClick={() => { setFiles([]); setResults([]); }} className="text-sm text-blue-600 hover:underline">Upload Ulang</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {results.map((result) => {
              const isSuccess = result.status === 'success';
              const isWarning = result.status === 'warning';
              const isError = result.status === 'error';
              const isParsing = result.status === 'parsing';
              const isSaved = result.saveStatus === 'saved';
              const totalPdf = result.items ? result.items.reduce((sum, r) => sum + (parseFloat(r.jumlah)||0), 0) : 0;
              const existingPagu = result.data?.existingPagu || 0;

              return (
                <div key={result.id} className={lex flex-col }>
                  {/* Row Header */}
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => (isWarning || isSuccess) && toggleExpand(result.id)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isParsing && <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
                      {isSuccess && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                      {isWarning && <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />}
                      {isError && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                      {result.status === 'idle' && <FileText className="w-5 h-5 text-gray-400 shrink-0" />}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800 truncate" title={result.data?.subKegiatan || result.fileName}>
                            {result.data?.subKegiatan || result.fileName}
                          </h4>
                          {isSaved && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">Tersimpan</span>}
                          {result.saveStatus === 'error' && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">Gagal Simpan</span>}
                        </div>
                        {result.data && (
                          <div className="flex items-center gap-4 text-xs mt-1">
                            <span className="text-gray-500">PDF: <strong className={isWarning ? 'text-red-600' : 'text-green-600'}>{formatCurrency(totalPdf)}</strong></span>
                            <span className="text-gray-500">Sistem: <strong>{formatCurrency(existingPagu)}</strong></span>
                            {isWarning && <span className="text-red-600 font-medium">Selisih: {formatCurrency(Math.abs(existingPagu - totalPdf))}</span>}
                          </div>
                        )}
                        {isError && <p className="text-xs text-red-600 mt-1">{result.errorMessage}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {(isWarning || isSuccess) && (
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors">
                          {result.expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Items Area */}
                  {result.expanded && result.items && (
                    <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50">
                      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 font-semibold text-gray-700">Rekening & Paket</th>
                                <th className="px-3 py-2 font-semibold text-gray-700">Uraian & Spesifikasi</th>
                                <th className="px-3 py-2 font-semibold text-gray-700 text-right w-40">Jumlah (Rp)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {result.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 align-top text-xs w-64">
                                    <div className="font-medium text-gray-900">{item.rekening}</div>
                                    <div className="text-blue-700 line-clamp-1" title={item.paket}>{item.paket}</div>
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input type="text" className="w-full bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 font-medium text-xs" value={item.uraian} onChange={e => updateItem(result.id, idx, 'uraian', e.target.value)} />
                                    <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1" title={item.spesifikasi}>Spesifkasi: {item.spesifikasi}</div>
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input type="number" className="w-full bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 text-right font-medium text-gray-800 text-xs" value={item.jumlah} onChange={e => updateItem(result.id, idx, 'jumlah', e.target.value)} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Footer Button */}
          {readyToSaveCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex justify-end items-center px-8">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600"><strong>{readyToSaveCount}</strong> file siap disimpan.</p>
                <button 
                  onClick={handleSaveAll} 
                  disabled={isSaving} 
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Semua ke Database'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
