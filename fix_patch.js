const fs = require('fs');
let lines = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8').split(/\r?\n/);

// Find the Rekening ID label
let rekIdx = lines.findIndex(l => l.includes('Rekening ID</label>'));
if (rekIdx > -1) {
  // It is preceded by <div>. We insert before the <div>
  const paketHtml = `
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pilih dari Paket (Opsional)</label>
                <select value={selectedPaketId} onChange={handlePaketChange} className="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm" disabled={!formData.subKegiatanId}>
                  <option value="">-- Pilih Paket untuk Auto-Isi --</option>
                  {paketOptions.filter(p => p.subKegiatanId.toString() === formData.subKegiatanId).map(p => (<option key={p.id} value={p.id}>{p.namaPaket}</option>))}
                </select>
              </div>`;
  lines.splice(rekIdx - 1, 0, ...paketHtml.split('\n'));
}

// Find the Trash2 button
let trashIdx = -1;
while ((trashIdx = lines.findIndex((l, i) => i > trashIdx && l.includes('<Trash2'))) > -1) {
  // Check if Edit2 is already there
  if (!lines[trashIdx - 1].includes('Edit2') && !lines[trashIdx - 2].includes('Edit2')) {
    const editBtn = `                          <button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-blue-500">
                            <Edit2 className="w-4 h-4" />
                          </button>`;
    // insert before the button that wraps Trash2
    lines.splice(trashIdx - 1, 0, ...editBtn.split('\n'));
  }
}

fs.writeFileSync('src/app/realisasi/page.tsx', lines.join('\n'));
console.log("Patched successfully");
