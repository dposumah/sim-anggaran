'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Database, Save, Loader2 } from 'lucide-react';

interface ExcelDataRow {
  'NAMA SKPD': string;
  'KODE SUMBER DANA': string;
  'NAMA SUMBER DANA': string;
  'PAGU': number | string;
}

interface SystemSumberDana {
  sumberDanaId: number;
  kode: string;
  nama: string;
  ceilingAmount: number; // Dari database (diinput user)
  excelAmount: number;   // Dari excel (temporary)
  isSaving?: boolean;
}

export default function ControlSumberDanaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [sumberDanas, setSumberDanas] = useState<SystemSumberDana[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  const [skpdInfo, setSkpdInfo] = useState<{id: number, kode: string, nama: string, tahunId: number} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSystemData = async () => {
    setIsLoadingSystem(true);
    try {
      const response = await fetch('/api/control-sumber-dana');
      if (!response.ok) throw new Error('Gagal mengambil data sistem');
      const data = await response.json();
      
      const formattedData = data.data.map((item: any) => ({
        ...item,
        excelAmount: 0 // Reset excel amount
      }));

      setSumberDanas(formattedData);
      setSkpdInfo(data.skpd);
    } catch (err: unknown) {
      console.error(err);
      setError('Gagal mengambil data dari database sistem.');
    } finally {
      setIsLoadingSystem(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = xlsx.utils.sheet_to_json<ExcelDataRow>(worksheet);
          
          const eduData = jsonData.filter(row => 
            row['NAMA SKPD']?.toString().toUpperCase().includes('DINAS PENDIDIKAN DAN KEBUDAYAAN')
          );

          if (eduData.length === 0) {
            setError('Tidak ditemukan data untuk Dinas Pendidikan dan Kebudayaan di dalam file Excel.');
            setIsProcessing(false);
            return;
          }

          // Aggregate by KODE SUMBER DANA
          const excelTotals = new Map<string, number>();

          eduData.forEach(row => {
            const sdKode = row['KODE SUMBER DANA'];
            const paguStr = row['PAGU'];
            
            let pagu = 0;
            if (typeof paguStr === 'number') pagu = paguStr;
            else if (typeof paguStr === 'string') pagu = parseFloat(paguStr.replace(/[^0-9.-]+/g, ""));
            
            if (isNaN(pagu)) pagu = 0;

            if (sdKode) {
              excelTotals.set(sdKode, (excelTotals.get(sdKode) || 0) + pagu);
            }
          });

          // Update UI state with Excel amounts
          setSumberDanas(prev => prev.map(sd => ({
            ...sd,
            excelAmount: excelTotals.get(sd.kode) || 0
          })));

          setSuccessMsg('File Excel berhasil diproses dan dicocokkan!');
          setIsProcessing(false);

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setError('Gagal membaca format file Excel: ' + msg);
          setIsProcessing(false);
        }
      };
      
      reader.readAsArrayBuffer(uploadedFile);
    } catch (err: unknown) {
      setError('Gagal memproses file.');
      setIsProcessing(false);
    }
  };

  const handleCeilingChange = (kode: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numValue)) return;
    
    setSumberDanas(prev => prev.map(sd => 
      sd.kode === kode ? { ...sd, ceilingAmount: numValue } : sd
    ));
  };

  const saveCeiling = async (sd: SystemSumberDana) => {
    if (!skpdInfo) return;
    
    setSumberDanas(prev => prev.map(item => item.kode === sd.kode ? { ...item, isSaving: true } : item));
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/control-sumber-dana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skpdId: skpdInfo.id,
          tahunId: skpdInfo.tahunId,
          sumberDanaId: sd.sumberDanaId,
          ceilingAmount: sd.ceilingAmount
        })
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');
      setSuccessMsg(`Pagu untuk ${sd.nama} berhasil disimpan.`);
    } catch (err) {
      setError(`Gagal menyimpan Pagu untuk ${sd.nama}.`);
    } finally {
      setSumberDanas(prev => prev.map(item => item.kode === sd.kode ? { ...item, isSaving: false } : item));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Control Pagu Sumber Dana</h2>
        <p className="text-gray-500 mt-1">Input target Pagu Sumber Dana dan cocokkan dengan data agregat RKPD dari Excel.</p>
      </div>

      {isLoadingSystem && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 flex items-center">
          <Database className="h-5 w-5 mr-2 animate-pulse" />
          Sedang mengambil data sistem saat ini...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">Upload File RKPD (Excel)</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Unggah file format .xlsx untuk mendapatkan Total Pagu dari RKPD. Data akan langsung disandingkan di kolom "Total di Excel" di bawah.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isLoadingSystem}
            className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {isProcessing ? 'Memproses...' : 'Pilih File Excel'}
            <Upload className="ml-2 -mr-0.5 h-4 w-4" />
          </button>
          {file && !isProcessing && (
            <p className="mt-3 text-sm text-green-600 font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              File di-load: {file.name}
            </p>
          )}
        </div>
      </div>

      {!isLoadingSystem && sumberDanas.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Form Pagu & Perbandingan</h3>
            {skpdInfo && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                {skpdInfo.kode} - {skpdInfo.nama}
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/3">Sumber Dana</th>
                  <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 w-64">Pagu Sistem (Target)</th>
                  <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Total di Excel</th>
                  <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-gray-900">Selisih</th>
                  <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sumberDanas.map((sd) => {
                  const variance = sd.ceilingAmount - sd.excelAmount;
                  
                  // Hide completely empty rows if Excel is not loaded and system pagu is 0
                  // But keep them visible if user wants to input data. We should probably show all of them so user can input.
                  
                  return (
                    <tr key={sd.kode} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-gray-900">{sd.kode}</div>
                        <div className="text-gray-500">{sd.nama}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                            value={sd.ceilingAmount === 0 ? '' : sd.ceilingAmount}
                            onChange={(e) => handleCeilingChange(sd.kode, e.target.value)}
                            placeholder="Rp 0"
                          />
                          <button
                            onClick={() => saveCeiling(sd)}
                            disabled={sd.isSaving}
                            className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            title="Simpan Pagu"
                          >
                            {sd.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-blue-600" />}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{formatCurrency(sd.ceilingAmount)}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(sd.excelAmount)}
                      </td>
                      <td className={`px-4 py-4 text-right text-sm font-bold ${variance === 0 && sd.excelAmount > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : variance > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium">
                        {sd.excelAmount === 0 && sd.ceilingAmount === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : variance === 0 ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Sesuai (Balance)</span>
                        ) : variance < 0 ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Defisit (Excel Lebih Besar)</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">Sisa Pagu (Sistem Lebih Besar)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
