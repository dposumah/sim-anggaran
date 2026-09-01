const fs = require('fs');
let code = fs.readFileSync('src/app/realisasi/page.tsx', 'utf8');

// Add state for options
code = code.replace('const [loading, setLoading] = useState(false);', `const [loading, setLoading] = useState(false);\n  const [subKegiatanOptions, setSubKegiatanOptions] = useState<any[]>([]);\n  const [rekeningOptions, setRekeningOptions] = useState<any[]>([]);`);

// Fetch options when skpd changes
const useEffectSkpd = `  useEffect(() => {
    if (selectedSkpd) loadRealisasi();
  }, [selectedSkpd]);`;

const useEffectNew = `  useEffect(() => {
    if (selectedSkpd) {
      loadRealisasi();
      fetch(\`/api/realisasi/options?skpdId=\${selectedSkpd}\`)
        .then(r => r.json())
        .then(data => {
          if (data.subKegiatans) setSubKegiatanOptions(data.subKegiatans);
          if (data.rekenings) setRekeningOptions(data.rekenings);
        });
    }
  }, [selectedSkpd]);`;

code = code.replace(useEffectSkpd, useEffectNew);

// Replace raw inputs with selects
const oldSubInput = `<input required type="number" value={formData.subKegiatanId} onChange={e => setFormData({...formData, subKegiatanId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="ID Sub Kegiatan" />`;
const newSubInput = `<select required value={formData.subKegiatanId} onChange={e => setFormData({...formData, subKegiatanId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Pilih Sub Kegiatan</option>
                  {subKegiatanOptions.map(sk => (<option key={sk.id} value={sk.id}>{sk.kode} - {sk.nama}</option>))}
                </select>`;
code = code.replace(oldSubInput, newSubInput);

const oldRekInput = `<input required type="number" value={formData.rekeningId} onChange={e => setFormData({...formData, rekeningId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="ID Rekening" />`;
const newRekInput = `<select required value={formData.rekeningId} onChange={e => setFormData({...formData, rekeningId: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Pilih Rekening</option>
                  {rekeningOptions.map(rek => (<option key={rek.id} value={rek.id}>{rek.kode} - {rek.nama}</option>))}
                </select>`;
code = code.replace(oldRekInput, newRekInput);

fs.writeFileSync('src/app/realisasi/page.tsx', code);
console.log("Updated page.tsx");
