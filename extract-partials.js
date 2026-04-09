const fs = require('fs');
const content = fs.readFileSync('views/pages/index.ejs', 'utf8');
const lines = content.split(/\r?\n/);

const headerLines = lines.slice(0, 1719); 
const bodyLines = lines.slice(1719, 2510);
const footerLines = lines.slice(2510);

fs.writeFileSync('views/partials/header.ejs', headerLines.join('\n'));
fs.writeFileSync('views/partials/footer.ejs', footerLines.join('\n'));

const newIndex = `<%- include('../partials/header') %>\n` + bodyLines.join('\n') + `\n<%- include('../partials/footer') %>\n`;
fs.writeFileSync('views/pages/index.ejs', newIndex);

console.log("Extraction complete!");
