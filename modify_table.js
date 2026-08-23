const fs = require('fs');
let code = fs.readFileSync('src/components/RincianTable.tsx', 'utf8');

if (!code.includes('expandedRows')) {
    code = code.replace('const [editingId', 'const [expandedRows, setExpandedRows] = useState<number[]>([]);\n  const [editingId');
    
    // Add chevron to namaPaket column header? Or just make the row clickable.
    
    // Replace the mapping
    const trStartRegex = /<tr key=\{r\.id\} className="hover:bg-blue-50\/30 transition-colors">/;
    
    // We will render a Fragment instead of just a TR
    const newTr = `
                return (
                  <React.Fragment key={r.id}>
                  <tr className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setExpandedRows(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}>
`;
    code = code.replace(/<tr key=\{r\.id\} className="hover:bg-blue-50\/30 transition-colors">/, newTr);
    
    // Fix React.Fragment import
    if (!code.includes("import React")) {
        code = code.replace("import { useState", "import React, { useState");
    }

    const trEnd = `</tr>`;
    const newTrEnd = `</tr>
                  {expandedRows.includes(r.id) && r.rincianItemBelanjas && r.rincianItemBelanjas.length > 0 && (
                    <tr className="bg-gray-50/80">
                      <td colSpan={10} className="px-8 py-4">
                        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-100 text-gray-700">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Uraian / Spesifikasi</th>
                                <th className="px-4 py-2 text-center font-semibold">Koefisien</th>
                                <th className="px-4 py-2 text-center font-semibold">Satuan</th>
                                <th className="px-4 py-2 text-right font-semibold">Harga Satuan</th>
                                <th className="px-4 py-2 text-right font-semibold">Jumlah</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {r.rincianItemBelanjas.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-800">
                                    <div className="font-medium">{item.uraian}</div>
                                    {item.spesifikasi && item.spesifikasi !== '-' && (
                                      <div className="text-gray-500 mt-0.5">{item.spesifikasi}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-center text-gray-600">{item.koefisien}</td>
                                  <td className="px-4 py-2 text-center text-gray-600">{item.satuan}</td>
                                  <td className="px-4 py-2 text-right text-gray-600">{formatRupiah(Number(item.hargaSatuan))}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-blue-700">{formatRupiah(Number(item.jumlah))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
`;
    // Replace only the LAST </tr> in the map loop.
    // The TR end is before `})} </tbody>`
    
    code = code.replace(/<\/td>\s*<\/tr>\s*\);\s*\}\)\}/, "</td>\n" + newTrEnd + "\n                );\n              })}");
    
    fs.writeFileSync('src/components/RincianTable.tsx', code);
    console.log("Replaced RincianTable");
} else {
    console.log("Already modified");
}
