/* Kiểm thử nhanh bản Windows (chạy được trên Linux: xvfb-run -a node test/smoke.js).
   Cần Playwright (npm i -D playwright hoặc bản cài sẵn). Hộp thoại Windows được thay bằng hàm giả trong tiến trình chính.
   DVDCAD_EXE=<đường dẫn DVDCAD.exe đã cài>: chạy trên bản đóng gói thay vì mã nguồn (test/installed.js dùng). */
'use strict';
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const APP = path.resolve(__dirname, '..');
const ROOT = path.resolve(APP, '..');
const sandbox = process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [];
const EXE = process.env.DVDCAD_EXE || '';
const ELECTRON = EXE || require(path.join(APP, 'node_modules', 'electron'));
const appArgs = (...files) => EXE ? files : [...sandbox, APP, ...files];
const SHOTS = process.env.SHOTS || '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dvdcad-test-'));
const userData = path.join(tmp, 'userData');
const env = { ...process.env, DVDCAD_USER_DATA: userData };
let failed = 0;
function check(ok, msg){ console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if(!ok) failed++; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 20000){ const t = Date.now(); while(Date.now() - t < ms){ try{ if(await fn()) return true; }catch(_){} await sleep(200); } return false; }
// ảnh PNG w×h (RGB) để thử IMAGE của AutoCAD trỏ tới tệp ảnh cạnh bản vẽ
const CRC_T = (() => { const t = []; for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function pngFile(w, h){ const crc = b => { let c = 0xFFFFFFFF; for(const x of b) c = CRC_T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t, d) => { const n = Buffer.alloc(4); n.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([n, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) raw[y * (w * 3 + 1) + 1 + x * 3] = 200;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', require('zlib').deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }

(async () => {
  const dwgCopy = path.join(tmp, 'Mặt bằng tầng 1.dwg');
  fs.copyFileSync(path.join(ROOT, 'sample.dwg'), dwgCopy);
  // ODA File Converter giả (Linux / macOS): ghi 1 file DWG nhỏ vào thư mục ra — kiểm tra đường lưu DWG trên máy
  if(process.platform !== 'win32'){ const fake = path.join(tmp, 'ODAFileConverter'); fs.writeFileSync(fake, '#!/bin/sh\nprintf "AC1032-dvdcad-test-%s" 0123456789012345678901234567890123456789 > "$2/drawing.dwg"\n', { mode: 0o755 }); env.ODA = fake; }
  const app = await electron.launch({ executablePath: ELECTRON, args: appArgs(dwgCopy), env });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', e => errors.push(e.message));
  await win.waitForLoadState('domcontentloaded');

  console.log('1. Khởi động + mở DWG từ dòng lệnh (như nhấp đúp trong Explorer)');
  check(await win.evaluate(() => location.href) === 'dvdcad://app/index.html', 'nạp từ dvdcad://app/ (offline, không dùng mạng)');
  check(await win.evaluate(() => !!(window.dvdDesktop && window.DVDDesktop)), 'có cầu nối dvdDesktop');
  check(await until(() => win.evaluate(() => typeof currentName === 'string' && /Mặt bằng/.test(currentName) && entities.length > 0), 60000), 'DWG mở được qua LibreDWG WASM');
  check(await win.evaluate(async () => { try{ return !(await navigator.serviceWorker.getRegistrations()).length; }catch(_){ return true; } }), 'không đăng ký service worker');
  check(await win.evaluate(() => !DVDAcad.startShown()), 'trang Bắt đầu tự ẩn khi đã có bản vẽ');
  if(SHOTS) await win.screenshot({ path: path.join(SHOTS, 'e1-dwg.png') });

  console.log('2. OPEN (Ctrl+O) → hộp thoại Windows → mở DXF thành tab mới');
  const dxf = path.join(ROOT, 'sample.dxf');
  await app.evaluate(({ dialog }, p) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] }); }, dxf);
  await win.click('#acadTop [data-q="OPEN"]');
  check(await until(() => win.evaluate(() => currentName === 'sample.dxf' && entities.length > 1000)), 'sample.dxf mở xong');
  check(await win.evaluate(() => DVDAcad.TABS.length) === 2, '2 tab bản vẽ');

  console.log('3. SAVEAS → hộp thoại Lưu của Windows → ghi file DXF');
  const out = path.join(tmp, 'ban-ve-luu.dxf');
  await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, out);
  await win.evaluate(() => DVDCmd.run ? DVDCmd.run('SAVEAS') : DVDCloud.saveDxfLocal(true));
  check(await until(() => fs.existsSync(out) && fs.statSync(out).size > 10000), 'file đã ghi (' + (fs.existsSync(out) ? fs.statSync(out).size : 0) + ' byte)');
  check(fs.existsSync(out) && /SECTION/.test(fs.readFileSync(out, 'utf8').slice(0, 2000)), 'nội dung là DXF');
  check(!fs.existsSync(out + '.dvdtmp'), 'không còn file tạm');
  // Ctrl+S lần sau ghi đè đúng file đó, không hỏi lại
  await app.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => { throw new Error('không được hỏi lại'); }; });
  const m0 = fs.statSync(out).mtimeMs; await sleep(50);
  await win.evaluate(() => DVDCloud.save());
  check(await until(() => fs.statSync(out).mtimeMs > m0), 'QSAVE ghi đè file đã chọn');

  // lưu vào chỗ không ghi được (ở đây: trùng tên một thư mục) → báo lỗi, không để lại file tạm
  const bad = path.join(tmp, 'khong-ghi-duoc.dxf'); fs.mkdirSync(bad);
  await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, bad);
  await win.evaluate(() => DVDCloud.saveDxfLocal(true));
  check(await until(() => win.evaluate(() => /Không lưu được|Could not save/.test(document.getElementById('toast').textContent))), 'lưu lỗi → thông báo: ' + await win.evaluate(() => document.getElementById('toast').textContent));
  check(!fs.existsSync(bad + '.dvdtmp'), 'lưu lỗi không để lại file tạm');
  await win.evaluate(() => { DVDCloud.state.saveHandle = null; });

  console.log('4. Trang Bắt đầu: gần đây theo đường dẫn + ảnh thu nhỏ');
  await sleep(1800);
  await win.click('#acStart');
  check(await win.evaluate(() => DVDAcad.startShown()), 'trang Bắt đầu hiện');
  await until(() => win.evaluate(() => document.querySelectorAll('#stList .st-card').length >= 3));
  const names = await win.evaluate(() => [...document.querySelectorAll('#stList .st-nm')].map(e => e.textContent));
  check(names.includes('Mặt bằng tầng 1.dwg') && names.includes('sample.dxf') && names.includes('ban-ve-luu.dxf'), 'danh sách gần đây: ' + names.join(', '));
  check(await win.evaluate(() => [...document.querySelectorAll('#stList .st-th')].every(e => /url\(/.test(e.style.backgroundImage))), 'mọi bản vẽ đều có ảnh thu nhỏ');
  check(fs.existsSync(path.join(userData, 'recent.json')), 'recent.json lưu trong thư mục dữ liệu');
  if(SHOTS) await win.screenshot({ path: path.join(SHOTS, 'e2-start.png') });
  // mở lại từ danh sách
  await win.evaluate(() => { const c = [...document.querySelectorAll('#stList .st-card')].find(x => /Mặt bằng/.test(x.textContent)); c.click(); });
  check(await until(() => win.evaluate(() => /Mặt bằng/.test(currentName) && !DVDAcad.startShown())), 'bấm thẻ gần đây → về bản vẽ');

  console.log('5. Mở thêm file khi app đang chạy (lần chạy thứ 2 chuyển file cho cửa sổ đang mở)');
  const dxf2 = path.join(tmp, 'thu-hai.dxf'); fs.copyFileSync(out, dxf2);
  const p2 = spawn(ELECTRON, appArgs(dxf2), { env, stdio: 'ignore' });
  const exited = await new Promise(r => { const t = setTimeout(() => r(false), 20000); p2.on('exit', () => { clearTimeout(t); r(true); }); });
  check(exited, 'tiến trình thứ 2 tự thoát (chỉ 1 cửa sổ)');
  check(await until(() => win.evaluate(() => currentName === 'thu-hai.dxf')), 'file của lần chạy thứ 2 mở trong cửa sổ cũ');

  console.log('6. An toàn: link ngoài, điều hướng, đọc file không được cấp quyền');
  const before = app.windows().length;
  await win.evaluate(() => { window.open('https://example.com', '_blank'); });
  await sleep(500);
  check(app.windows().length === before, 'link web không mở cửa sổ trong app');
  let denied = false; try{ await win.evaluate(() => dvdDesktop.readFile('/etc/hostname')); }catch(_){ denied = true; }
  check(denied, 'không đọc được file chưa được người dùng chọn');
  check(await win.evaluate(() => fetch('./libredwg-web.wasm').then(r => r.headers.get('content-type'))) === 'application/wasm', 'WASM có MIME application/wasm');
  check(await win.evaluate(() => fetch('../../etc/passwd').then(r => r.status)) !== 200, 'không thoát ra ngoài thư mục app');

  console.log('7. Lệnh phục hồi (x3 / x4 / x5) + lưu DWG');
  check(await win.evaluate(() => ['DRAWORDER', 'WIPEOUT', 'CANNOSCALE', 'GCHORIZONTAL', 'DCALIGNED', 'PARAMETERS', 'BPARAMETER', 'BDYN', 'SAVEDWG'].every(n => DVDCmd.commands.some(c => c.k.includes(n)))), 'có DRAWORDER, WIPEOUT, CANNOSCALE, GC*/DC*, PARAMETERS, BPARAMETER, BDYN, SAVEDWG');
  {
    const stubSave = p => app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, p);
    const head = p => { try{ return fs.readFileSync(p, 'latin1').slice(0, 6); }catch(_){ return ''; } };
    const reopen = p => win.evaluate(async p => { const r = await window.dvdDesktop.readFile(p); const u = new Uint8Array(r.data); await loadDWG(u.slice().buffer, 'kiem-tra.dwg'); await new Promise(q => setTimeout(q, 300)); return modelEntities.length; }, p);
    const outDir = process.env.DVD_DWG_OUT || '';   // CI: thư mục chép file DWG để ODA File Converter kiểm tra lại
    const keep = (p, name) => { if(outDir){ fs.mkdirSync(outDir, { recursive: true }); fs.copyFileSync(p, path.join(outDir, name)); } };
    const n0 = await win.evaluate(() => modelEntities.length);
    // mặc định: DWG 2018 gốc (dvd-dwg.js), không cần ODA
    const dwgNat = path.join(tmp, 'luu-goc.dwg'); await stubSave(dwgNat);
    await win.evaluate(() => { localStorage.removeItem('dvd:dwgsrv'); DVDCmd.run('SAVEDWG'); });
    check(await until(() => head(dwgNat) === 'AC1032', 60000), 'SAVEDWG mặc định ghi DWG 2018 gốc (AC1032), không cần ODA File Converter');
    keep(dwgNat, 'mat-bang-tang-1-R2018.dwg');
    check(await reopen(dwgNat) === n0, 'mở lại DWG 2018 vừa ghi: đủ ' + n0 + ' đối tượng');
    // các phiên bản khác của bộ ghi gốc: 2013 / 2010 / 2004 / 2000 → mở lại đủ đối tượng
    for(const [v, ac] of [['R2013', 'AC1027'], ['R2010', 'AC1024'], ['R2004', 'AC1018'], ['R2000', 'AC1015']]){
      const r = await win.evaluate(async v => { const ents = modelEntities.slice(), d = DVDAcad.dwgNative(ents, { version: v }); let s = ''; for(let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
        await loadDWG(d.slice().buffer, 'kiem-tra-' + v + '.dwg'); await new Promise(q => setTimeout(q, 300)); const n = modelEntities.length; return { b64: btoa(s), n }; }, v);
      const pv = path.join(tmp, 'luu-' + v + '.dwg'); fs.writeFileSync(pv, Buffer.from(r.b64, 'base64'));
      check(head(pv) === ac && r.n === n0, 'DWG ' + v.slice(1) + ' gốc (' + ac + '): mở lại đủ ' + n0 + ' đối tượng (' + r.n + ')'); keep(pv, 'mat-bang-tang-1-' + v + '.dwg');
    }
    // Lưu thành (SAVEAS) chọn đuôi .dwg → DWG
    const dwgAs = path.join(tmp, 'luu-thanh.dwg'); await stubSave(dwgAs);
    await win.evaluate(() => DVDCmd.run('SAVEAS'));
    check(await until(() => head(dwgAs) === 'AC1032', 60000), 'SAVEAS chọn *.dwg → ghi DWG 2018');
    // bản vẽ tổng hợp: kích thước, hatch, chữ tiếng Việt, khối 3D, vùng che… → DWG → mở lại
    const syn = await win.evaluate(async () => { const A = DVDAcad, w = ms => new Promise(r => setTimeout(r, ms));
      A.newDrawing(); await w(600); try{ A.hideStart && A.hideStart(); }catch(_){}
      for(const n of ['GAS_LINE', 'FENCELINE1']) try{ A.loadLT(n); }catch(_){}
      const add = es => A.commit({ add: [].concat(es).filter(Boolean).map(e => A.newProps ? A.newProps(e) : e) });
      add([{ type: 'LINE', x1: 0, y1: 0, x2: 120, y2: 0, lt: 'GAS_LINE' }, { type: 'LINE', x1: 0, y1: 10, x2: 120, y2: 10, lt: 'FENCELINE1' }, { type: 'CIRCLE', cx: 200, cy: 200, r: 20 }]);
      const c = modelEntities.find(e => e.type === 'CIRCLE'); add(A.makeDimRad(c, { x: 230, y: 230 }, false)); add(A.makeDimRad(c, { x: 170, y: 235 }, true));
      add(A.makeDimAng({ x: 300, y: 0 }, 0, Math.PI / 3, { x: 340, y: 15 })); add(A.makeDimLinear({ x: 0, y: 50 }, { x: 80, y: 90 }, { x: 40, y: 110 }, 0));
      add([{ type: 'HATCH', loops: [[{ x: 0, y: 200 }, { x: 50, y: 200 }, { x: 50, y: 250 }, { x: 0, y: 250 }]], pat: 'ANSI31', psc: 1, pang: 0 }, { type: 'HATCH', loops: [[{ x: 60, y: 200 }, { x: 110, y: 200 }, { x: 85, y: 250 }]], pat: 'SOLID', solid: true },
        { type: 'TEXT', x: 0, y: -30, h: 5, text: 'Chữ tiếng Việt: ĐƯỜNG ỐNG Ø100', rot: 15 }, { type: 'TEXT', x: 0, y: -60, h: 3.5, text: 'Dòng một\nDòng hai', mt: 1 }, { type: 'ELLIPSE', cx: 400, cy: 0, mx: 30, my: 0, ratio: 0.5, p1: 0, p2: Math.PI }]);
      for(const s of ['BOX\n700,0\n740,40\n25\n', 'WIPEOUT\n100,500\n140,500\n140,540\n100,540\n\n']){ await A.runScript(s); await w(300); for(let i = 0; i < 5 && A.busy(); i++){ A.cancel(); await w(60); } }
      { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = '#08f'; g.fillRect(0, 0, 40, 30);   // ảnh → IMAGE + IMAGEDEF
        const im = await A.imgAdd(await new Promise(r => c.toBlob(r, 'image/jpeg')), 'anh-nen.jpg'); add({ type: 'IMAGE', x: 600, y: 300, w: 80, h: 60, rot: 0, img: im.id, name: 'anh-nen.jpg', op: 0.8 }); }
      // khối động: 2 trạng thái hiển thị + kéo giãn + lật; bản chèn đang ở trạng thái "Dong", dài 150, lật ngang
      { const L = (x1, y1, x2, y2) => A.newProps({ type: 'LINE', x1, y1, x2, y2 }); A.commit({ add: [L(900, 0, 1000, 0), L(1000, 0, 1000, 50), L(900, 0, 900, 50), L(900, 0, 950, 50)] });
        A.makeBlock(modelEntities.slice(-4), { x: 900, y: 0 }, 'CUA_DONG', 'convert');
        const mem = modelEntities.filter(e => e.bm && e.bm.name === 'CUA_DONG'); A.dynDefs().CUA_DONG = { vis: { states: ['Mo', 'Dong'], def: 'Mo' }, lin: [{ name: 'Dai', b: { x: 0, y: 0 }, d: { x: 1, y: 0 }, L0: 100 }], flip: true };
        A.commit({ rep: mem.map((e, i) => { const q = JSON.parse(JSON.stringify(e)); q.dyn = { st: 'Mo', L: { Dai: 100 }, fx: 0, fy: 0 }; if(i === 2) q.dvs = ['Mo']; if(i === 3){ q.dvs = ['Dong']; q.vh = 1; } return [e, q]; }) });
        A.dynSetState(mem[0].grp, { st: 'Dong', L: { Dai: 150 }, fx: 1 }); }
      const dsig = () => modelEntities.filter(e => e.bm && e.bm.name === 'CUA_DONG').map(e => (e.vh ? 'h' : 'v') + ((e.dyn || {}).st || '') + ((e.dyn && e.dyn.L) || {}).Dai + ((e.dyn || {}).fx ? 'F' : '') + (e.dvs || []).join('/') + '@' + Math.round(Math.min(e.x1, e.x2)) + ':' + Math.round(Math.max(e.x1, e.x2)) + (e.bm.a < 0 ? '-' : '+')).sort().join(',');
      const sig = () => modelEntities.map(e => e.type + (e.blk ? '*' : '') + (e.wipe ? 'W' : '') + '|' + (e.layer || '0') + '|' + (e.lt || '') + '|' + (e.text || '')).sort().join('\n');
      const s0 = sig(), d0 = dsig(), ents = modelEntities.slice(), res = {};
      for(const v of ['R2018', 'R2013', 'R2010', 'R2004', 'R2000']){ const dwg = A.dwgNative(ents, { version: v }); await loadDWG(dwg.slice().buffer, 'tong-hop.dwg'); await w(300);
        let bin = ''; for(let i = 0; i < dwg.length; i += 0x8000) bin += String.fromCharCode.apply(null, dwg.subarray(i, i + 0x8000));
        res[v] = { same: sig() === s0, dyn: d0.length > 0 && dsig() === d0, n: modelEntities.length, s3d: modelEntities.some(e => e.type === 'SOLID3D'), wipe: modelEntities.some(e => e.wipe), b64: btoa(bin) }; }
      return res; });
    for(const v of Object.keys(syn)){ const q = syn[v];
      check(q.same && q.s3d && q.wipe && q.dyn, 'bản vẽ tổng hợp (kích thước, hatch, chữ Việt, kiểu nét chữ/hình, khối 3D, vùng che, ảnh, khối động) → DWG ' + v.slice(1) + ' → mở lại giống hệt (' + q.n + ' đối tượng)');
      if(outDir){ fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'tong-hop-' + v + '.dwg'), Buffer.from(q.b64, 'base64')); } }
    // ảnh: lưu bản vẽ có ảnh → IMAGE + IMAGEDEF ".\tên" và tệp ảnh ghi kèm cạnh bản vẽ (AutoCAD thấy ảnh)
    const dwgImg = path.join(tmp, 'co-anh.dwg'); await stubSave(dwgImg);
    await win.evaluate(async () => { const A = DVDAcad, c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#c00'; g.fillRect(0, 0, 64, 32);
      const im = await A.imgAdd(await new Promise(r => c.toBlob(r, 'image/png')), 'logo.png'); A.commit({ add: [A.newProps({ type: 'IMAGE', x: 500, y: 500, w: 64, h: 32, rot: 15, img: im.id, name: 'logo.png', op: 1 })] });
      localStorage.removeItem('dvd:dwgsrv'); DVDCmd.run('SAVEDWG'); });
    check(await until(() => head(dwgImg) === 'AC1032' && fs.readdirSync(tmp).some(f => /^logo_\w+\.png$/.test(f)), 60000), 'lưu bản vẽ có ảnh: DWG + tệp ảnh ghi kèm cạnh bản vẽ (' + fs.readdirSync(tmp).filter(f => /\.png$/.test(f)).join(', ') + ')');
    keep(dwgImg, 'co-anh-R2018.dwg');
    // IMAGE của AutoCAD (IMAGEDEF ".\pic.png", không có dữ liệu DVDCAD): mở → đọc tệp ảnh trong thư mục bản vẽ
    fs.writeFileSync(path.join(tmp, 'pic.png'), pngFile(6, 4));
    const acadImg = path.join(tmp, 'anh-acad.dxf');
    fs.writeFileSync(acadImg, ['0', 'SECTION', '2', 'ENTITIES', '0', 'LINE', '5', '50', '8', '0', '10', '0', '20', '0', '30', '0', '11', '10', '21', '0', '31', '0',
      '0', 'IMAGE', '5', '51', '8', '0', '100', 'AcDbEntity', '100', 'AcDbRasterImage', '90', '0', '10', '2', '20', '3', '30', '0', '11', '0.5', '21', '0', '31', '0', '12', '0', '22', '0.5', '32', '0', '13', '6', '23', '4', '340', '60', '70', '7', '280', '0', '281', '50', '282', '50', '283', '0', '71', '1', '91', '2', '14', '-0.5', '24', '-0.5', '14', '5.5', '24', '3.5',
      '0', 'ENDSEC', '0', 'SECTION', '2', 'OBJECTS', '0', 'IMAGEDEF', '5', '60', '100', 'AcDbRasterImageDef', '90', '0', '1', '.\\pic.png', '10', '6', '20', '4', '11', '0.5', '21', '0.5', '280', '1', '281', '0', '0', 'ENDSEC', '0', 'EOF', ''].join('\r\n'));
    await app.evaluate(({ dialog }, p) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] }); }, acadImg);
    await win.evaluate(() => DVDDesktop.openDialog());
    check(await until(() => win.evaluate(() => { const e = modelEntities.find(x => x.type === 'IMAGE'), im = e && window.DVDImg && DVDImg.get(e.img); return currentName === 'anh-acad.dxf' && !!im && im.naturalWidth === 6 && Math.abs(e.w - 3) < 1e-9; }), 30000), 'mở DXF của AutoCAD có IMAGE: thành ảnh, đọc tệp ảnh (.\\pic.png) trong thư mục bản vẽ');
    // DWG 2007 qua ODA File Converter (Linux/macOS: ODA giả ghi AC1032; Windows chưa cài ODA → tự ghi DWG 2004 bằng bộ ghi gốc)
    const dwgOda = path.join(tmp, 'luu-oda.dwg'); await stubSave(dwgOda);
    await win.evaluate(() => { localStorage.setItem('dvd:dwgsrv', JSON.stringify({ url: '', ver: 'ACAD2007' })); DVDCmd.run('SAVEDWG'); });
    if(process.platform !== 'win32') check(await until(() => head(dwgOda) === 'AC1032'), 'DWG 2007 qua ODA File Converter trên máy');
    else check(await until(() => /^AC10(21|18)$/.test(head(dwgOda)), 60000), 'DWG 2007: qua ODA nếu máy đã cài, chưa cài → tự ghi DWG 2004 gốc, AutoCAD 2007 mở được (' + head(dwgOda) + ')');
    await win.evaluate(() => localStorage.removeItem('dvd:dwgsrv'));
  }

  console.log('8. Lệnh tắt giống AutoCAD (acad.pgp)');
  const al = await win.evaluate(() => {
    const by = new Map(); for(const c of DVDCmd.commands) for(const k of c.k) by.set(k, c);
    const bad = []; let ok = 0;
    for(const [a, t] of DVDAcad.ACAD_PGP){ const ct = by.get(t); if(!ct) continue; if(by.get(a) === ct) ok++; else bad.push(a + '→' + t); }
    const is = (a, t) => by.get(a) && by.get(a) === by.get(t);
    return { ok, bad, spot: is('DO', 'DONUT') && is('T', 'MTEXT') && is('DT', 'TEXT') && !!by.get('QM') && /^Đo nhanh/.test(by.get('QM').d) && is('PA', 'PASTESPEC') && is('REA', 'REGENALL') };
  });
  check(!al.bad.length && al.ok >= 200, al.ok + ' lệnh tắt trỏ đúng lệnh' + (al.bad.length ? '; sai: ' + al.bad.join(', ') : ''));
  check(al.spot, 'DO = DONUT, T = MTEXT, DT = TEXT, QM = đo nhanh, PA = PASTESPEC, REA = REGENALL');

  console.log('9. Dòng lệnh kiểu AutoCAD 2027');
  const cl = await win.evaluate(async () => {
    const w = (ms = 40) => new Promise(r => setTimeout(r, ms));
    const run = async (...xs) => { DVDCmd.run(xs[0]); await w(); for(const x of xs.slice(1)){ if(!DVDAcad.busy()) break; DVDAcad.input(x.t != null ? x.t : x, x.t != null ? { dyn: true } : undefined); await w(); } for(let i = 0; i < 5 && DVDAcad.busy(); i++){ DVDAcad.cancel(); await w(); } };
    const lines = () => modelEntities.filter(e => e.type === 'LINE').map(e => [e.x1, e.y1, e.x2, e.y2].map(v => Math.round(v * 1000) / 1000).join(','));
    DVDAcad.newDrawing(); await w(600); try{ if(DVDAcad.hideStart) DVDAcad.hideStart(); }catch(_){}
    DVDAcad.commit({ del: modelEntities.slice() });
    const o = {};
    // nhập động: điểm thứ hai x,y tương đối, # tuyệt đối; khoá góc; bộ lọc .X; 'CAL đưa kết quả vào lời nhắc
    await run('LINE', '0,0', { t: '100,0' }, { t: '#0,50' }); o.dyn = lines().join(' ');
    DVDAcad.commit({ del: modelEntities.slice() });
    await run('LINE', '0,0', '<90', "'CAL", '20*2'); o.cal = lines().join(' ');
    DVDAcad.commit({ del: modelEntities.slice() });
    await run('LINE', '0,0', '.X', '30,5', '7,40'); o.filt = lines().join(' ');
    // script -LAYER + UNDO nhóm
    o.before = lines().length;
    await DVDAcad.runScript('-LAYER M TUONG C 1 TUONG \nUNDO BE\nLINE 0,10 10,10 \nLINE 0,20 10,20 \nUNDO E\nU\n'); await w(200);
    o.layer = DVDAcad.LS.cur + ' ' + DVDAcad.layerHex('TUONG'); o.undo = lines().length;
    // gợi ý: đồng nghĩa, sửa lỗi gõ, biến hệ thống
    const sug = async t => { const i = document.querySelector('#dvdCmd input'); i.focus(); i.value = t; i.dispatchEvent(new Event('input')); await w(60); const s = document.querySelector('#dvdCmd .sug').innerText; i.value = ''; i.dispatchEvent(new Event('input')); return s; };
    o.syn = /FILLET/.test(await sug('ROUND')); o.typo = /LINE/.test(await sug('LNIE')); o.sv = /OSMODE/.test(await sug('OSM'));
    o.help = !!(window.DVD_HELP && DVD_HELP.TRIM && window.DVD_HELP_PROMPTS && DVD_HELP_PROMPTS.LINE);
    return o;
  });
  check(cl.dyn === '0,0,100,0 100,0,0,50', 'nhập động: x,y tương đối cho điểm thứ hai, #x,y tuyệt đối: ' + cl.dyn);
  check(cl.cal === '0,0,0,40', "khoá góc <90 + 'CAL 20*2 đưa 40 vào lời nhắc: " + cl.cal);
  check(cl.filt === '0,0,30,40', 'bộ lọc điểm .X: ' + cl.filt);
  check(cl.layer === 'TUONG #ff0000' && cl.undo === cl.before, 'script -LAYER M/C, UNDO BE/E + U hoàn tác cả nhóm: ' + cl.layer + ', còn ' + cl.undo + '/' + cl.before + ' đường');
  check(cl.syn && cl.typo && cl.sv, 'gợi ý khi gõ: đồng nghĩa (ROUND → FILLET), sửa lỗi gõ (LNIE → LINE), biến hệ thống (OSM → OSMODE)');
  check(cl.help, 'trợ giúp F1 có trang cách dùng + lời nhắc đầu của lệnh');

  check(!errors.length, 'không có lỗi JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failed ? '\nTHẤT BẠI: ' + failed + ' mục' : '\nĐẠT tất cả');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
