const https = require('https');
https.get('https://sim-anggaran.vercel.app/api/test-db', (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
     console.log('Redirecting to:', res.headers.location);
     https.get(res.headers.location, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => console.log(data2));
     });
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
  }
}).on('error', (e) => console.error(e));
