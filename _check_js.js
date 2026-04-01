const fs = require('fs');
const html = fs.readFileSync('pages/admin/lifts.html', 'utf8');
const scripts = [];
let i = 0;
while ((i = html.indexOf('<script', i)) !== -1) {
  const end = html.indexOf('</script>', i);
  const tag = html.slice(i, html.indexOf('>', i)+1);
  if (tag.indexOf('src=') === -1) {
    scripts.push(html.slice(html.indexOf('>',i)+1, end));
  }
  i = end+1;
}
scripts.forEach((s,n) => {
  try { new Function(s); console.log('Script', n+1, 'OK'); }
  catch(e) { console.log('Script', n+1, 'SYNTAX ERROR:', e.message.slice(0,200)); }
});
console.log('Total inline scripts:', scripts.length);
