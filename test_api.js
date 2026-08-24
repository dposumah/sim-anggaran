require('dotenv').config({ path: '.env.local' });
// Vercel deployment URL
const url = 'https://sim-anggaran.vercel.app/api/explorer?level=rincian&subKegiatanId=34'; // 34 is one of them probably

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.length > 0) {
      console.log("Found data:", data.length, "items");
      console.log("First item has rincianItemBelanjas?", data[0].rincianItemBelanjas ? data[0].rincianItemBelanjas.length : 'No');
    } else {
      console.log("No data returned");
    }
  })
  .catch(err => console.error(err));
