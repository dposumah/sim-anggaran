'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  Folder, 
  FileText, 
  FileJson,
  Banknote
} from 'lucide-react';
import RincianTable from '@/components/RincianTable';

export default function ExplorerPage() {
  const [skpds, setSkpds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, any>>({}); // key = type_id, value = children data

  useEffect(() => {
    fetch('/api/explorer?level=skpd')
      .then(res => res.json())
      .then(data => {
        setSkpds(data);
        setLoading(false);
      });
  }, []);

  const toggleExpand = async (type: string, id: number, parentKey: string) => {
    const key = `${type}_${id}`;
    
    // If already expanded, collapse it
    if (expanded[key]) {
      const newExpanded = { ...expanded };
      delete newExpanded[key];
      setExpanded(newExpanded);
      return;
    }

    // Fetch children
    let url = '';
    if (type === 'skpd') url = `/api/explorer?level=program&skpdId=${id}`;
    if (type === 'program') url = `/api/explorer?level=kegiatan&programId=${id}`;
    if (type === 'kegiatan') url = `/api/explorer?level=subkegiatan&kegiatanId=${id}`;
    if (type === 'subkegiatan') url = `/api/explorer?level=rincian&subKegiatanId=${id}`;

    if (!url) return;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setExpanded(prev => ({ ...prev, [key]: data }));
    } catch (e) {
      console.error(e);
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const renderRincian = (rincianList: any[], subKegiatanId: number) => {
    return <RincianTable 
      rincianList={rincianList} 
      subKegiatanId={subKegiatanId} 
      onRefresh={() => toggleExpand('subkegiatan', subKegiatanId, `subkegiatan_${subKegiatanId}`)} 
    />;
  };

  const renderNode = (item: any, type: string, paddingLeft: number, icon: any) => {
    const key = `${type}_${item.id}`;
    const isExpanded = !!expanded[key];
    const children = expanded[key];

    let nextType = '';
    let nextIcon = null;
    if (type === 'skpd') { nextType = 'program'; nextIcon = Folder; }
    if (type === 'program') { nextType = 'kegiatan'; nextIcon = FileText; }
    if (type === 'kegiatan') { nextType = 'subkegiatan'; nextIcon = FileJson; }
    if (type === 'subkegiatan') { nextType = 'rincian'; nextIcon = Banknote; }

    const Icon = icon;

    return (
      <div key={key} className="border-b border-gray-100 last:border-0">
        <div 
          className="flex items-center py-3 px-4 hover:bg-blue-50/50 cursor-pointer transition-colors"
          style={{ paddingLeft: `${paddingLeft}rem` }}
          onClick={() => toggleExpand(type, item.id, key)}
        >
          <div className="mr-2 text-gray-400">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <Icon className="mr-3 h-5 w-5 text-primary/70" />
          <div className="flex-1">
            <span className="font-medium text-gray-700 mr-2">
              {type === 'skpd' ? item.kodeSubUnit : item.kode}
            </span>
            <span className="text-gray-900 font-medium">
              {type === 'skpd' 
                ? (item.nama === item.namaSubUnit ? item.nama : `${item.nama} - ${item.namaSubUnit}`)
                : item.nama}
            </span>
          </div>
          
          <div className="text-right">
            {item.totalPagu !== undefined && (
              <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                {formatRupiah(item.totalPagu)}
              </span>
            )}
          </div>

          {type === 'subkegiatan' && item.is_locked && (
            <span className="ml-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
              Terkunci
            </span>
          )}
        </div>
        
        {isExpanded && children && (
          <div className="bg-gray-50/30">
            {type === 'subkegiatan' 
              ? renderRincian(children, item.id) 
              : children.map((child: any) => renderNode(child, nextType, paddingLeft + 1.5, nextIcon))
            }
            {children.length === 0 && type !== 'subkegiatan' && (
              <div className="py-2 text-sm text-gray-500" style={{ paddingLeft: `${paddingLeft + 3.5}rem` }}>
                Tidak ada data.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Budget Explorer</h1>
        <p className="text-sm text-secondary">Telusuri rincian anggaran dari tingkat SKPD hingga Rincian Belanja.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-secondary">Memuat data SKPD...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {skpds.map(skpd => renderNode(skpd, 'skpd', 1, Building))}
            {skpds.length === 0 && (
              <div className="p-8 text-center text-secondary">Data kosong. Pastikan import data telah selesai.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
