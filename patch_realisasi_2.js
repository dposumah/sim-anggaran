const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');

// Add Lucide Edit2 icon
code = code.replace(/Trash2, Check, X, FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, BarChart3/, 'Trash2, Edit2, Check, X, FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, BarChart3');

// Add states for paket
code = code.replace('const [rekeningOptions, setRekeningOptions] = useState<any[]>([]);', 'const [rekeningOptions, setRekeningOptions] = useState<any[]>([]);\n  const [paketOptions, setPaketOptions] = useState<any[]>([]);\n  const [selectedPaketId, setSelectedPaketId] = useState<string>(\'\');\n  const [editId, setEditId] = useState<number | null>(null);');

// Fetch paket
code = code.replace('if (data.rekenings) setRekeningOptions(data.rekenings);', 'if (data.rekenings) setRekeningOptions(data.rekenings);\n          if (data.pakets) setPaketOptions(data.pakets);');

// Edit function
const editFunc = `
  const handleEdit = (r: any) => {
    setEditId(r.id);
    setFormData({
      subKegiatanId: r.subKegiatanId.toString(),
      sumberDanaId: r.sumberDanaId.toString(),
      rekeningId: r.rekeningId.toString(),
      bulan: r.bulan.toString(),
      nominal: r.nominal.toString(),
      keterangan: r.keterangan || ''
    });
    setSelectedPaketId(''); // Reset paket select on edit
    setShowForm(true);
    // scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
`;
code = code.replace('const handleManualSubmit = async (e: React.FormEvent) => {', editFunc + '\n  const handleManualSubmit = async (e: React.FormEvent) => {');

// Reset editId on cancel and submit
code = code.replace(/setFormData\(\{ subKegiatanId: '', sumberDanaId: '', rekeningId: '', bulan: '', nominal: '', keterangan: '' \}\);/g, 'setFormData({ subKegiatanId: "", sumberDanaId: "", rekeningId: "", bulan: "", nominal: "", keterangan: "" }); setEditId(null); setSelectedPaketId("");');
code = code.replace('onClick={() => setShowForm(false)}', 'onClick={() => { setShowForm(false); setEditId(null); setFormData({ subKegiatanId: "", sumberDanaId: "", rekeningId: "", bulan: "", nominal: "", keterangan: "" }); setSelectedPaketId(""); }}');

// Paket change handler
const paketHandler = `
  const handlePaketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedPaketId(pid);
    if (pid) {
      const pkt = paketOptions.find(p => p.id.toString() === pid);
      if (pkt) {
        setFormData(prev => ({
          ...prev,
          rekeningId: pkt.rekeningId.toString(),
          sumberDanaId: pkt.sumberDanaId.toString()
        }));
      }
    }
  };
`;
code = code.replace('const handleUpload = async () => {', paketHandler + '\n  const handleUpload = async () => {');

// Add Paket Dropdown to Form
const paketDropdown = `
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pilih dari Paket (Opsional)</label>
                <select value={selectedPaketId} onChange={handlePaketChange} className="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm" disabled={!formData.subKegiatanId}>
                  <option value="">-- Pilih Paket untuk Auto-Isi --</option>
                  {paketOptions.filter(p => p.subKegiatanId.toString() === formData.subKegiatanId).map(p => (<option key={p.id} value={p.id}>{p.namaPaket}</option>))}
                </select>
              </div>
`;
code = code.replace('<div>\n                <label className="block text-xs font-medium text-gray-700 mb-1">Rekening ID</label>', paketDropdown + '              <div>\n                <label className="block text-xs font-medium text-gray-700 mb-1">Rekening ID</label>');

// Add Edit Button
code = code.replace('<button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500">\n                            <Trash2 className="w-4 h-4" />\n                          </button>', '<button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-blue-500">\n                            <Edit2 className="w-4 h-4" />\n                          </button>\n                          <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500">\n                            <Trash2 className="w-4 h-4" />\n                          </button>');

// Adjust gap in Action column
code = code.replace('<td className="px-3 py-2.5 text-center">', '<td className="px-3 py-2.5 text-center flex justify-center gap-3">');

// Update Form Title
code = code.replace('<h3 className="font-medium text-gray-700">Data Realisasi</h3>', '<h3 className="font-medium text-gray-700">{editId ? "Edit Realisasi" : "Data Realisasi"}</h3>');

// Update Save Button
code = code.replace('<Check className="w-4 h-4" /> Simpan', '<Check className="w-4 h-4" /> {editId ? "Update" : "Simpan"}');

fs.writeFileSync('src/app/realisasi/page.tsx', code);
console.log("Patched realisasi page");
