const http = require('http');
const fs = require('fs');

http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('c:/projects/Ambassadors-Assembly/scratch/homepage.html', data);
    console.log('Saved homepage.html');
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});
