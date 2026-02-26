const http = require('http');

http.get('http://localhost:3000/api/profile/discover?limit=5', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data), null, 2)));
}).on('error', (err) => console.log('Error: ', err.message));
