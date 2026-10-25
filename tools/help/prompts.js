/* Sinh DVD_HELP_PROMPTS trong dvd-help.js: chạy từng lệnh trong trình duyệt không giao diện, ghi lại lời nhắc đầu tiên rồi huỷ.
   Cách chạy (ở thư mục gốc repo):
     python3 -m http.server 8765 --bind 127.0.0.1 &
     node tools/help/prompts.js            # cần playwright (npm i -g playwright hoặc dùng bản trong desktop/) */
'use strict';
const fs = require('fs');
const path = require('path');
let chromium; try{ ({ chromium } = require('playwright')); }catch(_){ ({ chromium } = require(path.join(__dirname, '..', '..', 'desktop', 'node_modules', 'playwright'))); }
const FILE = path.join(__dirname, '..', '..', 'dvd-help.js');
const URL = process.env.DVDCAD_URL || 'http://127.0.0.1:8765/index.html';
const SKIP = /^(QUIT|EXIT|QQUIT|CLOSE|CLOSEALL|NEW|QNEW|OPEN|RECOVER|REVERT|SAVEALL|MULTIPLE|SCRIPT|DELAY|RESUME)$/;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 900 }, locale: 'vi-VN' });
  p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(URL); await p.waitForTimeout(2500);
  await p.evaluate(() => { try{ localStorage.setItem('dvd:riblang', 'vi'); }catch(_){} });
  await p.keyboard.press('Control+n'); await p.waitForTimeout(1200);
  await p.evaluate(() => { DVDAcad.commit({ add: [{ type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }, { type: 'CIRCLE', cx: 50, cy: 50, r: 20 }, { type: 'POLYLINE', vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }], closed: true }] }); selEnts.clear(); });
  const names = await p.evaluate(() => DVDCmd.commands.filter(c => c.engine).map(c => c.k[0]).sort());
  const out = {};
  for(const n of names){
    if(SKIP.test(n)) continue;
    const r = await p.evaluate(async n => {
      try{ document.querySelectorAll('.overlay.show').forEach(o => o.remove()); }catch(_){}
      selEnts.clear(); DVDCmd.run(n);
      for(let i = 0; i < 25; i++){ await new Promise(r => setTimeout(r, 20)); const c = DVDAcad.cur(); if(!DVDAcad.busy() || (c && c.req)) break; }
      const c = DVDAcad.cur(); const q = c && c.req; const s = q ? DVDAcad.plainPrompt(q) : null;
      try{ DVDAcad.cancel(true); }catch(_){} try{ document.querySelectorAll('.overlay.show, .dvd-dlg').forEach(o => o.remove()); }catch(_){}
      return s;
    }, n).catch(() => null);
    if(r) out[n] = r + ':';
  }
  await b.close();
  const src = fs.readFileSync(FILE, 'utf8'), A = '/* <PROMPTS> */', B = '/* </PROMPTS> */';
  const block = A + '\nwindow.DVD_HELP_PROMPTS = ' + JSON.stringify(out, null, 0).replace(/","/g, '",\n  "') + ';\n' + B;
  const i = src.indexOf(A), j = src.indexOf(B);
  fs.writeFileSync(FILE, (i >= 0 && j > i ? src.slice(0, i) + block + src.slice(j + B.length) : src.replace(/\s*$/, '\n') + block + '\n'));
  console.log('DVD_HELP_PROMPTS: ' + Object.keys(out).length + ' lệnh → ' + FILE);
})().catch(e => { console.error(e); process.exit(1); });
