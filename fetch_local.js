const http = require('http');

setTimeout(() => {
  http.get('http://localhost:3000/login-debug', (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => { console.log(data); });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}, 2000);
