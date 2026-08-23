const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');

const handleSaveSingleCode = `
  const handleSaveSingle = async (resultId: string) => {
    const newResults = [...results];
    const resIdx = newResults.findIndex(r => r.id === resultId);
    if (resIdx === -1) return;
    
    newResults[resIdx].saveStatus = 'saving';
    setResults([...newResults]);

    try {
      const res = await fetch('/api/save-pdf-rincian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subKegiatan: newResults[resIdx].data.subKegiatan,
          items: newResults[resIdx].items
        }),
      });
      const data = await res.json();
      if (data.success) {
        newResults[resIdx].saveStatus = 'saved';
      } else {
        newResults[resIdx].saveStatus = 'error';
        newResults[resIdx].errorMessage = data.error || 'Gagal menyimpan';
      }
    } catch (err: any) {
      newResults[resIdx].saveStatus = 'error';
      newResults[resIdx].errorMessage = err.message;
    }
    setResults([...newResults]);
  };
`;

content = content.replace('  const handleSaveAll = async () => {', handleSaveSingleCode + '\n  const handleSaveAll = async () => {');

const footerCode = `
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                          <div className="font-semibold text-gray-800 text-sm">
                            Total Jumlah: {formatCurrency(result.items.reduce((acc, curr) => acc + (parseFloat(curr.jumlah)||0), 0))}
                          </div>
                          <button 
                            onClick={() => handleSaveSingle(result.id)}
                            disabled={isSaved || result.saveStatus === 'saving'}
                            className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {result.saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaved ? 'Tersimpan' : 'Simpan Baris Ini'}
                          </button>
                        </div>
                      </div>
`;

content = content.replace('                        </div>\r\n                      </div>', footerCode);
content = content.replace('                        </div>\n                      </div>', footerCode);

fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', content);
