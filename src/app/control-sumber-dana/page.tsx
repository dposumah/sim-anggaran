'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Database, Table as TableIcon } from 'lucide-react';

// Interfaces for our data structures
interface ExcelDataRow {
  'KODE SKPD': string;
  'NAMA SKPD': string;
  'KODE SUB KEGIATAN': string;
  'NAMA SUB KEGIATAN': string;
  'KODE SUMBER DANA': string;
  'NAMA SUMBER DANA': string;
  'PAGU': number | string;
}

interface SystemSumberDana {
  kode: string;
  nama: string;
  totalPagu: number;
}

interface SystemSubKegiatan {
  kode: string;
  nama: string;
  sumberDanas: SystemSumberDana[];
}

interface MergedSumberDana {
  kodeSumberDana: string;
  namaSumberDana: string;
  excelPagu: number;
  systemPagu: number;
  variance: number;
}

interface MergedSubKegiatan {
  kodeSubKegiatan: string;
  namaSubKegiatan: string;
  sumberDanas: MergedSumberDana[];
  isExpanded: boolean;
}

export default function ControlSumberDanaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [systemData, setSystemData] = useState<SystemSubKegiatan[]>([]);
  const [mergedData, setMergedData] = useState<MergedSubKegiatan[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  const [skpdInfo, setSkpdInfo] = useState<{kode: string, nama: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load system data first or on demand
  const fetchSystemData = async () => {
    setIsLoadingSystem(true);
    try {
      const response = await fetch('/api/control-sumber-dana');
      if (!response.ok) throw new Error('Gagal mengambil data sistem');
      const data = await response.json();
      setSystemData(data.data);
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
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = xlsx.utils.sheet_to_json<ExcelDataRow>(worksheet);
          
          // Filter only Education Department
          const eduData = jsonData.filter(row => 
            row['NAMA SKPD']?.toString().toUpperCase().includes('DINAS PENDIDIKAN DAN KEBUDAYAAN')
          );

          if (eduData.length === 0) {
            setError('Tidak ditemukan data untuk Dinas Pendidikan dan Kebudayaan di dalam file Excel.');
            setIsProcessing(false);
            return;
          }

          // Aggregate Excel Data
          // Map of SubKegiatan Kode -> Map of SumberDana Kode -> aggregated values
          const excelMap = new Map<string, { namaSub: string, sds: Map<string, { namaSd: string, pagu: number }> }>();

          eduData.forEach(row => {
            const subKode = row['KODE SUB KEGIATAN'];
            const subNama = row['NAMA SUB KEGIATAN'];
            const sdKode = row['KODE SUMBER DANA'];
            const sdNama = row['NAMA SUMBER DANA'];
            const paguStr = row['PAGU'];
            
            // Check if pagu is numeric
            let pagu = 0;
            if (typeof paguStr === 'number') pagu = paguStr;
            else if (typeof paguStr === 'string') pagu = parseFloat(paguStr.replace(/[^0-9.-]+/g, ""));
            
            if (isNaN(pagu)) pagu = 0;

            // Only process if we have valid codes
            if (subKode && sdKode) {
              if (!excelMap.has(subKode)) {
                excelMap.set(subKode, { namaSub: subNama, sds: new Map() });
              }
              const sdMap = excelMap.get(subKode)!.sds;
              if (!sdMap.has(sdKode)) {
                sdMap.set(sdKode, { namaSd: sdNama, pagu: 0 });
              }
              sdMap.get(sdKode)!.pagu += pagu;
            }
          });

          // Now merge with System Data
          mergeData(excelMap);

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

  const mergeData = (excelMap: Map<string, { namaSub: string, sds: Map<string, { namaSd: string, pagu: number }> }>) => {
    const mergedResults: MergedSubKegiatan[] = [];

    // Create a deep copy lookup for System Data
    const systemLookup = new Map<string, { nama: string, sds: Map<string, { nama: string, pagu: number }> }>();
    
    systemData.forEach(sysSub => {
      const sdsMap = new Map();
      sysSub.sumberDanas.forEach(sd => {
        sdsMap.set(sd.kode, { nama: sd.nama, pagu: sd.totalPagu });
      });
      systemLookup.set(sysSub.kode, { nama: sysSub.nama, sds: sdsMap });
    });

    // We need to iterate over all distinct Sub Kegiatan from BOTH Excel and System
    const allSubKodes = new Set([...Array.from(excelMap.keys()), ...Array.from(systemLookup.keys())]);

    allSubKodes.forEach(subKode => {
      const exSub = excelMap.get(subKode);
      const sysSub = systemLookup.get(subKode);
      
      const namaSub = exSub?.namaSub || sysSub?.nama || 'Unknown';
      
      const allSdKodes = new Set([
        ...(exSub ? Array.from(exSub.sds.keys()) : []),
        ...(sysSub ? Array.from(sysSub.sds.keys()) : [])
      ]);

      const mergedSds: MergedSumberDana[] = [];
      
      allSdKodes.forEach(sdKode => {
        const exSd = exSub?.sds.get(sdKode);
        const sysSd = sysSub?.sds.get(sdKode);
        
        const namaSd = exSd?.namaSd || sysSd?.nama || 'Unknown';
        const exPagu = exSd?.pagu || 0;
        const sysPagu = sysSd?.pagu || 0;
        
        mergedSds.push({
          kodeSumberDana: sdKode,
          namaSumberDana: namaSd,
          excelPagu: exPagu,
          systemPagu: sysPagu,
          variance: exPagu - sysPagu
        });
      });

      if (mergedSds.length > 0) {
         mergedResults.push({
          kodeSubKegiatan: subKode,
          namaSubKegiatan: namaSub,
          sumberDanas: mergedSds,
          isExpanded: true // Default expanded so users can see
        });
      }
    });

    // Sort by Sub Kegiatan Kode
    mergedResults.sort((a, b) => a.kodeSubKegiatan.localeCompare(b.kodeSubKegiatan));
    
    setMergedData(mergedResults);
    setIsProcessing(false);
  };

  const toggleExpand = (subKode: string) => {
    setMergedData(prev => prev.map(item => 
      item.kodeSubKegiatan === subKode ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Control Sumber Dana</h2>
        <p className="text-gray-500 mt-1">Pencocokan target pagu sumber dana dari Excel dengan rincian belanja sistem khusus Dinas Pendidikan.</p>
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

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
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
          <p className="mt-2 text-sm text-gray-500">
            Unggah file format .xlsx untuk membandingkan pagu sumber dana.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isLoadingSystem}
            className="mt-6 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {isProcessing ? 'Memproses...' : 'Pilih File Excel'}
            <Upload className="ml-2 -mr-0.5 h-4 w-4" />
          </button>
          {file && !isProcessing && (
            <p className="mt-3 text-sm text-green-600 font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              File aktif: {file.name}
            </p>
          )}
        </div>
      </div>

      {mergedData.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TableIcon className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Hasil Pencocokan Pagu Sumber Dana</h3>
            </div>
            {skpdInfo && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {skpdInfo.kode} - {skpdInfo.nama}
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-10"></th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kode & Uraian</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Target (Excel)</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Sistem (Saat Ini)</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Selisih</th>
                  <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {mergedData.map((sub) => {
                  
                  // Calculate subtotals
                  const totalExcel = sub.sumberDanas.reduce((sum, item) => sum + item.excelPagu, 0);
                  const totalSystem = sub.sumberDanas.reduce((sum, item) => sum + item.systemPagu, 0);
                  const totalVariance = totalExcel - totalSystem;

                  return (
                    <React.Fragment key={sub.kodeSubKegiatan}>
                      {/* Sub Kegiatan Header Row */}
                      <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => toggleExpand(sub.kodeSubKegiatan)}>
                        <td className="px-3 py-4 text-center">
                          {sub.isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500 mx-auto" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          <div className="font-bold">{sub.kodeSubKegiatan}</div>
                          <div className="text-gray-600">{sub.namaSubKegiatan}</div>
                        </td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(totalExcel)}
                        </td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(totalSystem)}
                        </td>
                        <td className={`px-3 py-4 text-right text-sm font-bold ${totalVariance === 0 ? 'text-green-600' : totalVariance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                          {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                        </td>
                        <td className="px-3 py-4 text-center text-sm font-medium">
                          {totalVariance === 0 ? (
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Sesuai</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">Ada Selisih</span>
                          )}
                        </td>
                      </tr>

                      {/* Sumber Dana Rows */}
                      {sub.isExpanded && sub.sumberDanas.map((sd) => (
                        <tr key={sd.kodeSumberDana} className="bg-white">
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3 pl-8 text-sm text-gray-700">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-primary/40 mr-3"></div>
                              <div>
                                <div className="font-semibold">{sd.kodeSumberDana}</div>
                                <div className="text-gray-500 text-xs">{sd.namaSumberDana}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(sd.excelPagu)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(sd.systemPagu)}
                          </td>
                          <td className={`px-3 py-3 text-right text-sm font-medium ${sd.variance === 0 ? 'text-green-600' : sd.variance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {sd.variance > 0 ? '+' : ''}{formatCurrency(sd.variance)}
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-medium">
                            {sd.systemPagu === 0 && sd.excelPagu > 0 ? (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Sumber Baru</span>
                            ) : sd.variance === 0 ? (
                              <span className="text-green-600"><CheckCircle className="h-4 w-4 mx-auto" /></span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
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
