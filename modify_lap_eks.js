const fs = require('fs');
let code = fs.readFileSync('src/app/laporan/LaporanEksekutif.tsx', 'utf8');

if (!code.includes('expandedRows')) {
    code = code.replace(
        `const [selectedPaket, setSelectedPaket] = useState<{`,
        `const [expandedRows, setExpandedRows] = useState<number[]>([]);\n  const [selectedPaket, setSelectedPaket] = useState<{`
    );

    const trStartRegex = /<tr\s*key=\{i\}\s*className="hover:bg-gray-50 transition-colors"\s*>/;
    const newTr = `
                        <React.Fragment key={i}>
                          <tr
                            className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedRows(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                          >
`;
    code = code.replace(trStartRegex, newTr);
    
    if (!code.includes("import React")) {
        code = code.replace("import { useState", "import React, { useState");
    }

    const trEnd = `</tr>`;
    const newTrEnd = `</tr>
                          {expandedRows.includes(i) && r.items && r.items.length > 0 && (
                            <tr className="bg-gray-50/80">
                              <td colSpan={5} className="px-8 py-4">
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
                                      {r.items.map((item: any) => (
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
    // Replace the LAST </tr> inside selectedPaket.rincian.map
    // It looks like:
    //                              {formatRupiah(r.realisasi)}
    //                            </td>
    //                          </tr>
    //                        ))
    
    code = code.replace(/<\/td>\s*<\/tr>\s*\)\)\s*\)\}/, "</td>\n" + newTrEnd + "\n                        ))\n                      )}");
    
    fs.writeFileSync('src/app/laporan/LaporanEksekutif.tsx', code);
    console.log("Updated LaporanEksekutif");
} else {
    console.log("Already updated");
}
