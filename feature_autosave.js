const fs = require('fs');
let content = fs.readFileSync('src/app/upload/pdf-rincian/page.tsx', 'utf8');

const regex = /newResults\[resIdx\]\.status = existingPagu === 0 \? 'error' : \(isMatch \? 'success' : 'warning'\);\s*newResults\[resIdx\]\.errorMessage = existingPagu === 0 \? 'Belum terdaftar atau Rp 0' : undefined;\s*newResults\[resIdx\]\.data = parsedData;\s*newResults\[resIdx\]\.items = parsedData\.items;/g;

const replacement = `newResults[resIdx].status = existingPagu === 0 ? 'error' : (isMatch ? 'success' : 'warning');
          newResults[resIdx].errorMessage = existingPagu === 0 ? 'Belum terdaftar atau Rp 0' : undefined;
          newResults[resIdx].data = parsedData;
          newResults[resIdx].items = parsedData.items;

          if (existingPagu > 0 && isMatch) {
            newResults[resIdx].saveStatus = 'saving';
            // Wait a moment so UI can render 'saving' state
            setResults([...newResults]);
            
            try {
              const saveRes = await fetch('/api/save-pdf-rincian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subKegiatan: parsedData.subKegiatan,
                  items: parsedData.items
                }),
              });
              const saveData = await saveRes.json();
              if (saveData.success) {
                newResults[resIdx].saveStatus = 'saved';
              } else {
                newResults[resIdx].saveStatus = 'error';
                newResults[resIdx].errorMessage = saveData.error || 'Gagal menyimpan otomatis';
              }
            } catch (err: any) {
              newResults[resIdx].saveStatus = 'error';
              newResults[resIdx].errorMessage = err.message;
            }
          }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/upload/pdf-rincian/page.tsx', content);
