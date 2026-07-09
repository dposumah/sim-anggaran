'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  Folder, 
  FileText, 
  FileJson,
  X,
  Search
} from 'lucide-react';
import RincianTable from '@/components/RincianTable';
import { useYear } from '@/contexts/YearContext';

export default function ExplorerPage() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [modalSdData, setModalSdData] = useState<{ title: string, sumberDanas: Record<string, { pagu: number, paguPerubahan: number | null }> } | null>(null);
  const [rincianData, setRincianData] = useState<Record<string, any[]>>({});
  const { tahun } = useYear();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/explorer/tree?tahun=${tahun}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTreeData(data);
        } else {
          console.error(data.error);
          setTreeData([]);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [tahun]);

  // Expand all matching nodes if user types a search term
  useEffect(() => {
    if (searchTerm.length > 2) {
      // Find all matching nodes and expand them, but let's just use the filtered tree
    }
  }, [searchTerm]);

  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData;
    
    const lowerTerm = searchTerm.toLowerCase();
    
    return treeData.map(skpd => {
      const programs = (skpd.programs || []).map((prog: any) => {
        const kegiatans = (prog.kegiatans || []).map((keg: any) => {
          const subKegiatans = (keg.subKegiatans || []).filter((sub: any) => 
            (sub.kode && sub.kode.toLowerCase().includes(lowerTerm)) || 
            (sub.nama && sub.nama.toLowerCase().includes(lowerTerm))
          );
          
          const kegMatch = (keg.kode && keg.kode.toLowerCase().includes(lowerTerm)) || 
                           (keg.nama && keg.nama.toLowerCase().includes(lowerTerm)) || 
                           subKegiatans.length > 0;
                           
          if (kegMatch) return { ...keg, subKegiatans };
          return null;
        }).filter(Boolean);
        
        const progMatch = (prog.kode && prog.kode.toLowerCase().includes(lowerTerm)) || 
                          (prog.nama && prog.nama.toLowerCase().includes(lowerTerm)) || 
                          kegiatans.length > 0;
                          
        if (progMatch) return { ...prog, kegiatans };
        return null;
      }).filter(Boolean);
      
      const skpdMatch = (skpd.kode && skpd.kode.toLowerCase().includes(lowerTerm)) || 
                        (skpd.nama && skpd.nama.toLowerCase().includes(lowerTerm)) || 
                        (skpd.kodeSubUnit && skpd.kodeSubUnit.toLowerCase().includes(lowerTerm)) ||
                        (skpd.namaSubUnit && skpd.namaSubUnit.toLowerCase().includes(lowerTerm)) ||
                        programs.length > 0;
                        
      if (skpdMatch) return { ...skpd, programs };
      return null;
    }).filter(Boolean);
  }, [treeData, searchTerm]);

  const toggleNode = async (type: string, id: number) => {
    const key = `${type}_${id}`;
    const newExpanded = new Set(expandedNodes);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
      setExpandedNodes(newExpanded);
      return;
    }

    newExpanded.add(key);
    setExpandedNodes(newExpanded);

    // If it's a subkegiatan, we need to fetch the Rincian (lazy load)
    if (type === 'subkegiatan' && !rincianData[key]) {
      try {
        const res = await fetch(`/api/explorer?level=rincian&subKegiatanId=${id}`);
        const data = await res.json();
        setRincianData(prev => ({ ...prev, [key]: data }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const renderRow = (item: any, type: string, depth: number) => {
    const key = `${type}_${item.id}`;
    
    // Auto-expand if searching and there is a match in children, otherwise respect manual toggle
    const isExpanded = searchTerm.length > 0 ? true : expandedNodes.has(key);
    
    let Icon = Building;
    if (type === 'program') Icon = Folder;
    if (type === 'kegiatan') Icon = FileText;
    if (type === 'subkegiatan') Icon = FileJson;
    
    let code = item.kode;
    if (type === 'skpd') code = item.kodeSubUnit;

    let name = item.nama;
    if (type === 'skpd' && item.nama !== item.namaSubUnit) {
      name = `${item.nama} - ${item.namaSubUnit}`;
    }

    return (
      <div key={key}>
        <div 
          className={`grid grid-cols-12 gap-2 items-center p-3 border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${depth === 0 ? 'bg-gray-50/50' : ''}`}
          onClick={() => toggleNode(type, item.id)}
        >
          {/* Uraian */}
          <div className="col-span-12 lg:col-span-6 flex items-center" style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}>
            <div className="w-5 flex justify-center mr-1">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <Icon className={`w-5 h-5 mr-3 shrink-0 ${depth === 0 ? 'text-blue-600' : 'text-gray-400'}`} />
            
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-700 mr-2">{code}</span>
              <span className={`text-gray-900 ${depth === 0 ? 'font-semibold' : ''}`}>{name}</span>
              {type === 'subkegiatan' && item.is_locked && (
                <span className="ml-2 inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                  Terkunci
                </span>
              )}
              {item.sumberDanas && Object.entries(item.sumberDanas).length > 0 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalSdData({ title: `Rekap SD - ${name}`, sumberDanas: item.sumberDanas });
                  }}
                  className="ml-2 text-[10px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
                >
                  Rekap SD
                </button>
              )}
            </div>
          </div>
          
          {/* Values */}
          {item.totalPaguPerubahan !== undefined && item.totalPaguPerubahan !== null ? (
            <>
              <div className="col-span-4 lg:col-span-2 text-right">
                <span className="text-xs text-gray-500 block lg:hidden">Sebelum</span>
                <span className="text-sm font-semibold text-gray-700">{formatRupiah(item.totalPagu)}</span>
              </div>
              <div className="col-span-4 lg:col-span-2 text-right">
                <span className="text-xs text-gray-500 block lg:hidden">Sesudah</span>
                <span className="text-sm font-bold text-blue-700">{formatRupiah(item.totalPaguPerubahan)}</span>
              </div>
              <div className="col-span-4 lg:col-span-2 text-right">
                <span className="text-xs text-gray-500 block lg:hidden">Selisih</span>
                <span className={`text-sm font-bold ${item.totalPaguPerubahan - item.totalPagu > 0 ? 'text-green-600' : item.totalPaguPerubahan - item.totalPagu < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {(item.totalPaguPerubahan - item.totalPagu) > 0 ? '+' : ''}{formatRupiah(item.totalPaguPerubahan - item.totalPagu)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="col-span-4 lg:col-span-2 text-right">
                <span className="text-xs text-gray-500 block lg:hidden">Pagu</span>
                <span className="text-sm font-semibold text-gray-800">{formatRupiah(item.totalPagu)}</span>
              </div>
              <div className="col-span-4 lg:col-span-2 text-right">
                <span className="text-sm font-semibold text-gray-400">-</span>
              </div>
              <div className="col-span-4 lg:col-span-2 text-right">
                <span className="text-sm font-semibold text-gray-400">-</span>
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div>
            {type === 'skpd' && item.programs?.map((p: any) => renderRow(p, 'program', depth + 1))}
            {type === 'program' && item.kegiatans?.map((k: any) => renderRow(k, 'kegiatan', depth + 1))}
            {type === 'kegiatan' && item.subKegiatans?.map((s: any) => renderRow(s, 'subkegiatan', depth + 1))}
            {type === 'subkegiatan' && (
              <div className="bg-gray-50 border-b border-gray-200 shadow-inner">
                {!rincianData[key] ? (
                  <div className="p-4 text-center text-sm text-gray-500">Memuat rincian...</div>
                ) : (
                  <RincianTable 
                    rincianList={rincianData[key]} 
                    subKegiatanId={item.id}
                    isLocked={item.is_locked}
                    onRefresh={() => {
                      fetch(`/api/explorer?level=rincian&subKegiatanId=${item.id}`)
                        .then(res => res.json())
                        .then(data => setRincianData(prev => ({ ...prev, [key]: data })));
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Folder className="w-6 h-6 text-primary" /> Budget Explorer
          </h1>
          <p className="text-sm text-secondary">Telusuri hierarki anggaran mulai dari SKPD hingga rincian belanja.</p>
        </div>
        
        <div className="relative w-full sm:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="Cari kode atau uraian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Memuat seluruh hierarki anggaran...
          </div>
        ) : (
          <div className="min-w-full">
            {/* Header Columns */}
            <div className="hidden lg:grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 font-bold text-sm text-gray-700">
               <div className="col-span-6 pl-10">Uraian / Kode</div>
               <div className="col-span-2 text-right">Pagu Sebelum</div>
               <div className="col-span-2 text-right text-blue-800">Pagu Sesudah</div>
               <div className="col-span-2 text-right">Selisih</div>
            </div>
            
            {filteredTreeData.map(skpd => renderRow(skpd, 'skpd', 0))}
            
            {filteredTreeData.length === 0 && (
              <div className="p-12 text-center text-gray-500">Tidak ada data yang cocok dengan pencarian Anda.</div>
            )}
          </div>
        )}
      </div>

      {/* Modal Rekap Sumber Dana */}
      {modalSdData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 truncate pr-4">{modalSdData.title}</h3>
              <button 
                onClick={() => setModalSdData(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sumber Dana</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pagu Sebelum</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Pagu Sesudah</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Selisih</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(modalSdData.sumberDanas).map(([sd, data]) => {
                    const selisih = data.paguPerubahan !== null ? data.paguPerubahan - data.pagu : 0;
                    return (
                      <tr key={sd} className="hover:bg-blue-50/30">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate" title={sd}>{sd}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">{formatRupiah(data.pagu)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                          {data.paguPerubahan !== null ? formatRupiah(data.paguPerubahan) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-bold ${selisih > 0 ? 'text-green-600' : selisih < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {data.paguPerubahan !== null ? (selisih > 0 ? '+' + formatRupiah(selisih) : formatRupiah(selisih)) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setModalSdData(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
