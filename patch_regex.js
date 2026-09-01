const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');

// Insert Paket dropdown before Rekening ID
const paketHtml = `              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pilih dari Paket (Opsional)</label>
                <select value={selectedPaketId} onChange={handlePaketChange} className="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm" disabled={!formData.subKegiatanId}>
                  <option value="">-- Pilih Paket untuk Auto-Isi --</option>
                  {paketOptions.filter(p => p.subKegiatanId.toString() === formData.subKegiatanId).map(p => (<option key={p.id} value={p.id}>{p.namaPaket}</option>))}
                </select>
              </div>\n`;

code = code.replace(/(<div>\s*<label[^>]*>Rekening ID<\/label>)/, paketHtml + '$1');

// Insert Edit2 button before Trash2
const editHtml = `<button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-blue-500 mr-2">\n                            <Edit2 className="w-4 h-4" />\n                          </button>\n                          `;
// But only replace the one in the table (it's inside <td className="px-3 py-2.5 text-center">)
code = code.replace(/(<button onClick=\{\(\) => handleDelete\(r\.id\)\} className="text-gray-400 hover:text-red-500">)/g, editHtml + '$1');

fs.writeFileSync('src/app/realisasi/page.tsx', code);
console.log("Regex Patched successfully");
