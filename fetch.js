const https = require('https');
https.get('https://sim-anggaran.vercel.app/api/test-db', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', (e) => console.error(e));
