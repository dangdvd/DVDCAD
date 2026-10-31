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
  check(await win.evaluate(() => ['BCONVERT', 'VIEWBASE', 'VIEWSECTION', 'VIEWDETAIL', 'GCSYMMETRIC', 'DCCONVERT', 'GEOMARKPOINT', '3DPOLY', 'SHAPE', 'PSOUT', 'WMFOUT', 'PUBLISHTOWEB', 'DWGCONVERT', 'BVSTATE', 'PSETUPIN', 'SYSVARMONITOR'].every(n => DVDCmd.commands.some(c => c.k.includes(n)))), 'có lệnh v5v: BCONVERT, VIEWBASE / VIEWSECTION / VIEWDETAIL, GCSYMMETRIC, DCCONVERT, GEOMARK, 3DPOLY, SHAPE, PSOUT, WMFOUT, PUBLISHTOWEB, DWGCONVERT, BVSTATE, PSETUPIN, SYSVARMONITOR');
  check(await win.evaluate(() => ['WMFIN', 'WMFOPTS', 'SHXFONTS', 'GCSMOOTH', 'ALIGNSPACE', 'SYSWINDOWS'].every(n => DVDCmd.commands.some(c => c.k.includes(n)))), 'có lệnh v5w: WMFIN, WMFOPTS, SHXFONTS, GCSMOOTH, ALIGNSPACE, SYSWINDOWS');
  {
    const v5w = await win.evaluate(async () => { const A = DVDAcad, out = {};
      // WMF tối thiểu: placeable 100 × 50 đơn vị (100 / inch), bút đỏ + chữ nhật
      const recs = [[0x020B, [0, 0]], [0x020C, [50, 100]], [0x02FA, [0, 1, 0, 0x00FF, 0]], [0x012D, [0]], [0x041B, [40, 90, 10, 10]], [0x0000, []]];
      const body = []; let mx = 0; for(const [fn, w] of recs){ const n = 3 + w.length; mx = Math.max(mx, n); body.push(n & 0xffff, n >>> 16, fn, ...w); }
      const ph = new DataView(new ArrayBuffer(22)); ph.setUint32(0, 0x9AC6CDD7, true); ph.setInt16(10, 100, true); ph.setInt16(12, 50, true); ph.setUint16(14, 100, true); let cs = 0; for(let i = 0; i < 10; i++) cs ^= ph.getUint16(i * 2, true); ph.setUint16(20, cs, true);
      const hd = new DataView(new ArrayBuffer(18)); hd.setUint16(0, 1, true); hd.setUint16(2, 9, true); hd.setUint16(4, 0x300, true); hd.setUint32(6, (18 + body.length * 2) / 2, true); hd.setUint16(10, 1, true); hd.setUint32(12, mx, true);
      const u = new Uint8Array(40 + body.length * 2); u.set(new Uint8Array(ph.buffer), 0); u.set(new Uint8Array(hd.buffer), 22); new Uint16Array(u.buffer, 40).set(body.map(v => v & 0xffff));
      const R = A.parseWMF(u.buffer, {}); const P = R.ents.find(e => e.type === 'POLYLINE'); out.wmf = !!P && P.closed && P.col === '#ff0000' && Math.abs(R.w - 25.4) < 1e-6 && Math.abs(P.vertices[2].x - 22.86) < 1e-6;
      // phông SHX shapes 1.0 tự dựng: hình 0 (cao 6), 'A' rộng 5
      const nm = s => [...s].map(c => c.charCodeAt(0)); const g0 = nm('T').concat([0, 6, 2, 0, 0]), gA = [0, 8, 2, 6, 8, 2, 250, 2, 8, 1, 0, 0];
      const hdr = nm('AutoCAD-86 shapes 1.0\r\n\x1a'), F = hdr.concat([1, 0, 65, 0, 2, 0], [0, 0, g0.length, 0, 65, 0, gA.length, 0], g0, gA);
      await A.shxFontAdd(Uint8Array.from(F), 'smoke.shx', false); const ex = A.shxExtent({ type: 'TEXT', text: 'AA', ff: 'smoke.shx', h: 3 }); out.shx = !!ex && Math.abs(ex.xmax - 5) < 1e-9;
      return out; });
    check(v5w.wmf, 'WMFIN: đọc Windows Metafile (placeable) → đa tuyến kín đúng kích thước và màu bút');
    check(v5w.shx, 'phông SHX: nạp phông shapes 1.0, bề rộng chữ theo bước tiến của phông');
  }
  {
    // v5z: phông nét đơn thay SHX thiếu (FONTALT, vendor/lff), phông Liberation kèm theo, in thẳng máy in bằng SVG vector
    const v5z = await win.evaluate(async () => { const A = DVDAcad, out = {};
      await A.lffReady('standard'); await A.lffReady('simplex'); out.alt = [A.shxAltOf('txt.shx'), A.shxAltOf('romans_khong_co.shx')];
      const e = A.newProps({ type: 'TEXT', x: 0, y: 0, h: 5, text: 'Mặt bằng', ff: 'txt.shx' }); out.st = (A.shxStrokes(e) || []).length;
      const r = await fetch('./vendor/fonts/LiberationSans-Regular.ttf'); out.lib = r.ok && (await r.arrayBuffer()).byteLength > 100000;
      A.newDrawing(); await new Promise(q => setTimeout(q, 500)); A.commit({ add: [A.newProps({ type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 50 }), A.newProps({ type: 'TEXT', x: 5, y: 20, h: 5, text: 'Ghi chú tiếng Việt' })] });
      Object.assign(A.PS, { paper: 'A4', land: true, fit: true, dev: 'print' }); const rs = A.plotRender(0, false, 'svg'); out.svg = /^<svg/.test(rs.svg) && /Ghi chú tiếng Việt/.test(rs.svg) && !/<image/.test(rs.svg); return out; });
    check(v5z.alt[0] === 'standard.lff' && v5z.alt[1] === 'simplex.lff' && v5z.st > 10, 'phông .shx chưa nạp → phông nét đơn kèm theo (txt → standard.lff, khác → FONTALT simplex), chữ tiếng Việt ghép dấu (' + v5z.st + ' nét)');
    check(v5z.lib, 'phông Liberation kèm theo (cho PDF khi máy không có phông) có trong bản cài');
    check(v5z.svg, 'in thẳng máy in: bản in vector SVG (chữ là chữ, không có ảnh)');
  }
  {
    // v5y: PLOT → PDF vector, chữ nhúng phông TrueType của hệ thống (lấy qua cầu nối dvdDesktop.font)
    const v5y = await win.evaluate(async fam => { const A = DVDAcad, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      const f = await window.dvdDesktop.font(fam, false, false); out.font = !!(f && f.data && f.data.length > 10000);
      A.newDrawing(); await w(600); try{ A.hideStart && A.hideStart(); }catch(_){}
      A.commit({ add: [A.newProps({ type: 'LINE', x1: 0, y1: 0, x2: 200, y2: 100 }), A.newProps({ type: 'TEXT', x: 10, y: 50, h: 5, text: 'Mặt bằng tầng 1 — ĐƯỜNG ỐNG Ø100', ff: fam })] });
      Object.assign(A.PS, { paper: 'A4', land: true, fit: true, dev: 'pdf' }); const bl = await A.plotPDF('kiem-tra'); const u = new Uint8Array(await bl.arrayBuffer());
      out.pdf = String.fromCharCode.apply(null, u.slice(0, 8)) === '%PDF-1.7' && u.length > 1000; out.info = bl.dvdInfo; out.ui = (A.PLOT_DEVICES || []).length; return out; }, process.platform === 'win32' ? 'Arial' : 'DejaVu Sans');
    check(v5y.font, 'cầu nối dvdDesktop.font: đọc được phông hệ thống (' + (process.platform === 'win32' ? 'Arial' : 'DejaVu Sans') + ')');
    check(v5y.pdf && v5y.info && v5y.info.fonts.length >= 1 && v5y.info.rasterText === 0, 'PLOT DWG To PDF: PDF vector, chữ tiếng Việt nhúng phông ' + ((v5y.info && v5y.info.fonts) || []).join(', '));
    check(v5y.ui === 11, 'hộp PLOT có 11 máy in / máy vẽ .pc3 như AutoCAD (DWG To PDF, 4 kiểu AutoCAD PDF, DWFx ePlot, máy in Windows, PNG, JPG, HPGL/2)');
  }
  {
    // v6b: máy in Windows đã cài (getPrintersAsync), in thẳng theo tên máy in, Plot Preview vector zoom / pan, bảng Xuất PDF vector, khổ giấy đầy đủ
    const v6b = await win.evaluate(async () => { const A = DVDAcad, D = window.dvdDesktop, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      const L = await D.printers(); out.list = Array.isArray(L); out.n = L.length;
      const r = await D.printSVG({ html: '<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm"></svg>', wmm: 210, hmm: 297, deviceName: 'DVDCAD khong co may in nay', silent: true }); out.bad = r && r.ok === false;
      out.papers = Object.keys(A.PAPER_SIZES).length; out.media = A.paperMedia('FB_A1') === 'ISO_full_bleed_A1_(841.00_x_594.00_MM)' && A.paperFromMedia('ANSI_expand_D_(34.00_x_22.00_Inches)') === 'ANSI_EX_D';
      A.newDrawing(); await w(600); try{ A.hideStart && A.hideStart(); }catch(_){}
      A.commit({ add: [A.newProps({ type: 'LINE', x1: 0, y1: 0, x2: 200, y2: 100 }), A.newProps({ type: 'TEXT', x: 10, y: 50, h: 5, text: 'Xem trước' })] });
      Object.assign(A.PS, { paper: 'A3', land: true, fit: true, dev: 'pdf', area: 'extents' }); await A.plotPreview(); await w(300);
      const P = A._pv; out.pv = !!P && !P.svg.querySelector('image') && /Xem trước/.test(P.svg.innerHTML); out.pvd = P ? [P.svg.querySelectorAll('*').length, P.fitS, P.svg.innerHTML.length] : 'không mở'; if(P){ P.zoomAt(100, 100, 40); await w(100); out.zoom = P.cam.s / P.fitS > 30; P.close(); }   // chữ bản vẽ không bị bộ dịch giao diện đổi; đóng xem trước để các bước sau bấm được
      const pg = renderForPDF('a3l', null, true); out.exp = !!pg.pdf;
      // DWFx ePlot: trang XPS + phần DWF (CI: .NET XpsDocument của Windows mở và vẽ lại trang)
      const rx = A.plotRender(0, false, 'xps'), bx = await A.dwfxBuild([{ ctx: rx.xps, Wmm: rx.Wmm, Hmm: rx.Hmm, title: 'Model' }], { title: 'kiem-tra' }), ux = new Uint8Array(await bx.arrayBuffer());
      let sx = ''; for(let i = 0; i < ux.length; i += 0x8000) sx += String.fromCharCode.apply(null, ux.subarray(i, i + 0x8000)); out.dwfx = { b64: btoa(sx), ok: ux[0] === 0x50 && ux[1] === 0x4B && bx.dvdInfo.fonts.length > 0 && bx.dvdInfo.rasterText === 0 }; return out; });
    check(v6b.list, 'máy in Windows đã cài: ' + v6b.n + ' máy (getPrintersAsync)');
    check(v6b.bad, 'in thẳng tới máy in không có → báo lỗi, không treo');
    check(v6b.papers >= 85 && v6b.media, 'khổ giấy như DWG To PDF.pc3: ' + v6b.papers + ' khổ (ISO / full bleed / expand / B / C, ANSI, ARCH, JIS), tên khổ chuẩn AutoCAD');
    check(v6b.pv && v6b.zoom, 'Plot Preview: trang SVG vector, phóng to ×40 vẫn là nét vector (' + JSON.stringify(v6b.pvd) + ')');
    check(v6b.exp, 'bảng Xuất → PDF: trang vector (không còn ảnh JPEG)');
    check(v6b.dwfx.ok, 'DWFx ePlot: gói OPC / XPS, chữ nhúng phông TrueType (không thành ảnh)');
    if(process.env.DVD_DWG_OUT){ fs.mkdirSync(process.env.DVD_DWG_OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.DVD_DWG_OUT, 'kiem-tra.dwfx'), Buffer.from(v6b.dwfx.b64, 'base64')); }
  }
  {
    // v6d: độ trong suốt theo lớp (DXF / DWG), ETRANSMIT gói DWG nén
    const v6d = await win.evaluate(async () => { const A = DVDAcad, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      A.newDrawing(); await w(500); try{ A.hideStart && A.hideStart(); }catch(_){}
      A.addLayer('KINH', '#00ffff'); A.setLayerTP('KINH', 40); const e0 = A.newProps({ type: 'LINE', x1: 0, y1: 0, x2: 100, y2: 0 }); e0.layer = 'KINH'; delete e0.tp; A.commit({ add: [e0] }); await w(100);
      out.dxf = /AcCmTransparency\r?\n\s*1071\r?\n33554585/.test(A.dxfR2000(modelEntities.slice(), { version: 'R2018' }));
      const d = A.dwgNative(modelEntities.slice(), { version: 'R2018' }); await loadDWG(d.slice().buffer, 'tp.dwg'); await w(500); out.dwg = A.layerTP('KINH');
      const z = await A.transmit(false, { fmt: 'R2013', z: 1, noSave: true }); const u = new Uint8Array(await z.arrayBuffer()); out.zip = u[0] === 0x50 && u[1] === 0x4B && u[8] === 8;   // mục đầu nén deflate
      let s = ''; for(let i = 0; i < Math.min(u.length, 4096); i++) s += String.fromCharCode(u[i]); out.dwgIn = /\.dwg/.test(s); return out; });
    check(v6d.dxf && v6d.dwg === 40, 'độ trong suốt lớp 40%: DXF ghi XDATA AcCmTransparency, DWG 2018 đọc lại ' + v6d.dwg + '%');
    check(v6d.zip && v6d.dwgIn, 'ETRANSMIT: gói .zip nén, bản vẽ DWG trong gói');
    // v6e: tiện ích AutoLISP — hộp thoại DCL, vla- / vlax-curve-, thư mục hỗ trợ
    const v6e = await win.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      await DVDLisp.fs.put('smk.dcl', 'smk : dialog { label = "Smoke"; : edit_box { key = "v"; label = "Giá trị"; value = "7"; } ok_cancel; }');
      const run = DVDLisp.evalToString('(progn (setq id (load_dialog "smk.dcl")) (new_dialog "smk" id) (action_tile "accept" "(setq *v* (get_tile \\"v\\")) (done_dialog 1)") (setq st (start_dialog)) (list st *v*))');
      await w(400); const b = document.querySelector('.dcl-dlg [data-dcl-key="accept"]'); out.dlg = !!b; if(b) b.click(); out.dcl = await run;
      out.vla = await DVDLisp.evalToString('(progn (vl-load-com) (setq ln (vla-AddLine (vla-get-ModelSpace (vla-get-ActiveDocument (vlax-get-acad-object))) (vlax-3d-point 0 0 0) (vlax-3d-point 3 4 0))) (list (vla-get-Length ln) (vlax-curve-getDistAtParam ln 2.5)))');
      return out; });
    check(v6e.dlg && v6e.dcl === '(1 "7")', 'AutoLISP: hộp thoại DCL hiện và trả giá trị ' + v6e.dcl);
    check(v6e.vla === '(5.0 2.5)', 'AutoLISP: vla-AddLine / vla-get-Length / vlax-curve ' + v6e.vla);
    // v6f: LISP như AutoCAD — (command) với tuỳ chọn "_X", XDATA ghi vào DWG (ODA / ACadSharp đọc lại trong CI)
    const v6f = await win.evaluate(async () => { const out = { dwg: {} };
      out.cmd = await DVDLisp.evalToString('(progn (command "_.ZOOM" "_E") (command "_.PLINE" (list 0 0) "_W" 1 1 (list 100 0) "") (regapp "DVD_TEST") (entmod (append (entget (entlast)) (list (list -3 (list "DVD_TEST" (cons 1000 "Dam D1") (cons 1040 2.5) (cons 1070 7) (list 1010 1.0 2.0 0.0)))))) (cdr (assoc 1000 (cdr (cadr (assoc -3 (entget (entlast) (list "DVD_TEST"))))))))');
      const ents = modelEntities.slice();
      for(const v of ['R2018', 'R2013', 'R2007', 'R2000']){ const d = DVDAcad.dwgNative(ents, { version: v }); let s = ''; for(let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); out.dwg[v] = btoa(s); }
      out.back = atob(out.dwg.R2018).includes('DVD_TEST') ? 1 : 0; return out; });
    check(v6f.cmd === '"Dam D1"' && v6f.back, 'LISP: (command) với "_E" / "_W", XDATA entmod / entget, XDATA ghi vào DWG');
    // v6g: reactor lệnh, COM Excel / FileSystemObject
    const v6g = await win.evaluate(async () => { await DVDLisp.evalToString('(progn (setq *rx* nil) (vlr-command-reactor nil (list (cons :vlr-commandEnded (function (lambda (r a) (setq *rx* (car a))))))) T)');
      await DVDLisp.evalToString('(command "_.LINE" (list 0 0) (list 5 5) "")'); await new Promise(q => setTimeout(q, 500));
      return DVDLisp.evalToString('(progn (vlr-remove-all) (setq xl (vlax-get-or-create-object "Excel.Application") sh (vlax-get-property (vlax-invoke-method (vlax-get-property xl (quote Workbooks)) (quote Add)) (quote ActiveSheet))) (vlax-put-property (vlax-get-property sh (quote Range) "B2") (quote Value) 12.5) (list *rx* (vlax-variant-value (vlax-get-property (vlax-get-property sh (quote Range) "B2") (quote Value))) (dos_strreplace "a-b" "-" "+")))'); });
    check(v6g === '("LINE" 12.5 "a+b")', 'LISP: vlr-command-reactor, COM Excel.Application (Range.Value), DOSLib: ' + v6g);
    // v6h: thư viện acet-* của Express Tools + lệnh PLT2DWG đọc HPGL
    const v6h = await win.evaluate(async () => { const r = await DVDLisp.evalToString('(list (acet-str-to-list "," "a,b") (acet-list-remove-duplicates (list 1 1 2) nil) (acet-filename-ext-remove "C:\\\\x\\\\a.dwg"))');
      const H = DVDAcad.hpglParse('IN;SP1;PU0,0;PD4000,0;CI400;'); return r + ' ' + H.map(e => e.type).join(',') + ' ' + ['SUPERHATCH', 'ATTOUT', 'BTABLE', 'RTEXT', 'MKSHAPE'].every(k => DVDCmd.commands.some(c => c.k.includes(k))); });
    check(v6h === '(("a" "b") (1 2) "C:\\\\x\\\\a") LINE,CIRCLE true', 'Express Tools: acet-str / list / filename, PLT2DWG, SUPERHATCH / ATTOUT / BTABLE / RTEXT / MKSHAPE: ' + v6h);
    // v6i: lưới (chia Loop, đùn mặt) và mặt (vá, cắt lát)
    const v6i = await win.evaluate(() => { const A = DVDAcad; const bx = A.newProps({ type: 'SOLID3D', k: 'ext', pts: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 9 }, { x: 0, y: 9 }], z0: 0, h: 9, tri: [0, 1, 2, 0, 2, 3] });
      const m = A.toMeshOpt(bx, 1, true); const ex = A.meshExtrude({ v: m.ms.v0, f: m.ms.f0, cr: [] }, [0], 2, null); const s = A.surfPatch([[0, 0, 0], [10, 0, 2], [10, 10, 0], [0, 10, 2]], null);
      return [m.f.length / 3, m.ms.lv, A.meshBoundaryLoops(A.weld(ex.v, ex.f).i).length, s.srf, A.meshSlice(s.v, s.f, [1, 0, 0], 5).length, ['MESHSMOOTHMORE', 'MESHEXTRUDE', 'SURFTRIM', 'SURFBLEND', 'ANALYSISZEBRA', 'PROJECTGEOMETRY'].every(k => DVDCmd.commands.some(c => c.k.includes(k)))].join(','); });
    check(v6i === '432,1,0,1,1,true', 'Lưới / mặt 3D: MESHSMOOTH mức 1 (432 tam giác), MESHEXTRUDE kín, SURFPATCH, cắt lát, lệnh SURF* / ANALYSIS*: ' + v6i);
    if(process.env.DVD_DWG_OUT) for(const v of Object.keys(v6f.dwg)) fs.writeFileSync(path.join(process.env.DVD_DWG_OUT, 'xdata-' + v + '.dwg'), Buffer.from(v6f.dwg[v], 'base64'));
  }
  {
    // v5x: MTEXT nhiều phông (\F SHX / \f TrueType), thiết lập trang có tên → PLOTSETTINGS, khung nhìn xoay (VIEWTWIST) → DWG đọc lại
    const v5x = await win.evaluate(async () => { const A = DVDAcad, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
      const R = A.mtextRuns('{\\Ftxt|c0;AB}{\\fArial|b0|i0|c0|p34;CD}'); out.runs = !!R && R[0].ff === 'txt.shx' && R[1].ff === 'Arial';
      A.newDrawing(); await w(600); try{ A.hideStart && A.hideStart(); }catch(_){}
      A.commit({ add: [A.newProps({ type: 'LINE', x1: 0, y1: 0, x2: 1000, y2: 0 }), A.newProps({ type: 'CIRCLE', cx: 500, cy: 250, r: 100 })] });
      A.pageSetupsSave({ 'Ban in A3': { paper: 'A3', land: true, area: 'extents', fit: true, center: true, style: 'mono', lw: true, dev: 'pdf' } });
      DVDCmd.run('LAYOUT'); await w(400); const ok = document.querySelector('.dvd-dlg .dvd-ok'); if(ok) ok.click(); await w(800);
      const L = dwgLayouts[currentLayout]; if(L && L.user && L.def){ const D = JSON.parse(JSON.stringify(L.def)); D.vps[0].tw = Math.PI / 6; A.saveLayoutDef(D); await w(300); }
      out.tw = !!(dwgLayouts[currentLayout] && dwgLayouts[currentLayout].paper.viewports[0] && Math.abs(dwgLayouts[currentLayout].paper.viewports[0].tw - Math.PI / 6) < 1e-12);
      const pv = A.dxfVer; A.dxfVer = 'R2018'; const dx = A.dxfR2000(modelEntities); A.dxfVer = pv;
      out.dxf = /\n\s*0\r?\nPLOTSETTINGS\r?\n/.test(dx) && !!A.setupsFromDXF(dx)['Ban in A3'];
      out.dwg = {}; for(const v of ['R2018', 'R2007', 'R2000']){ const d = A.dwgNative(modelEntities, { version: v }); let bin = ''; for(let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
        await loadDWG(d.slice().buffer, 'layout-xoay.dwg'); await w(500);
        const F = (dwgLayouts._file || []).find(x => !x.isModel && x.paper && x.paper.viewports.length), q = (window._dwgPageSetups || []).find(x => x && x.name === 'Ban in A3');
        out.dwg[v] = { tw: !!F && Math.abs(F.paper.viewports[0].tw - Math.PI / 6) < 1e-9, ps: !!q && q.media === 'ISO_A3_(420.00_x_297.00_MM)' && q.printer === 'DWG To PDF.pc3', b64: btoa(bin) }; }
      A.pageSetupsSave({}); return out; });
    check(v5x.runs, 'MTEXT nhiều phông: đọc mã \\F (SHX) / \\f (TrueType) thành đoạn có phông riêng');
    check(v5x.tw && v5x.dxf, 'khung nhìn xoay nhìn 30° + thiết lập trang có tên → DXF có PLOTSETTINGS');
    const outDir = process.env.DVD_DWG_OUT || '';
    for(const v of Object.keys(v5x.dwg)){ const q = v5x.dwg[v];
      check(q.tw && q.ps, 'DWG ' + v.slice(1) + ': khung nhìn xoay 30° và thiết lập trang "Ban in A3" (PLOTSETTINGS) đọc lại đúng');
      if(outDir){ fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'layout-xoay-' + v + '.dwg'), Buffer.from(q.b64, 'base64')); } }
  }
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
    // các phiên bản khác của bộ ghi gốc: 2013 / 2010 / 2007 / 2004 / 2000 → mở lại đủ đối tượng
    for(const [v, ac] of [['R2013', 'AC1027'], ['R2010', 'AC1024'], ['R2007', 'AC1021'], ['R2004', 'AC1018'], ['R2000', 'AC1015']]){
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
      add([{ type: 'POLYLINE', p3: 1, closed: false, vertices: [{ x: 0, y: -100, z: 0 }, { x: 50, y: -100, z: 20 }, { x: 100, y: -80, z: 5 }] },   // đa tuyến 3D (3DPOLY) + mặt 3D có cạnh ẩn (EDGE)
        { type: 'SOLID', face: 1, pts: [{ x: 200, y: -100 }, { x: 250, y: -100 }, { x: 250, y: -50 }, { x: 200, y: -50 }], zs: [0, 0, 10, 10], ie: 5 }]);
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
      const sig = () => modelEntities.map(e => e.type + (e.blk ? '*' : '') + (e.wipe ? 'W' : '') + (e.p3 ? 'P3:' + e.vertices.map(v => v.z || 0).join('/') : '') + (e.face ? 'F' + (e.ie || 0) + ':' + (e.zs || []).join('/') : '') + '|' + (e.layer || '0') + '|' + (e.lt || '') + '|' + (e.text || '')).sort().join('\n');
      const s0 = sig(), d0 = dsig(), ents = modelEntities.slice(), res = {};
      for(const v of ['R2018', 'R2013', 'R2010', 'R2007', 'R2004', 'R2000']){ const dwg = A.dwgNative(ents, { version: v }); await loadDWG(dwg.slice().buffer, 'tong-hop.dwg'); await w(300);
        let bin = ''; for(let i = 0; i < dwg.length; i += 0x8000) bin += String.fromCharCode.apply(null, dwg.subarray(i, i + 0x8000));
        res[v] = { same: sig() === s0, dyn: d0.length > 0 && dsig() === d0, n: modelEntities.length, s3d: modelEntities.some(e => e.type === 'SOLID3D'), wipe: modelEntities.some(e => e.wipe), b64: btoa(bin) }; }
      return res; });
    for(const v of Object.keys(syn)){ const q = syn[v];
      check(q.same && q.s3d && q.wipe && q.dyn, 'bản vẽ tổng hợp (kích thước, hatch, chữ Việt, kiểu nét chữ/hình, khối 3D, vùng che, ảnh, khối động, đa tuyến 3D, mặt 3D cạnh ẩn) → DWG ' + v.slice(1) + ' → mở lại giống hệt (' + q.n + ' đối tượng)');
      if(outDir){ fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'tong-hop-' + v + '.dwg'), Buffer.from(q.b64, 'base64')); } }
    // DWGCONVERT: đổi tệp trong khung ẩn (?dwgconvert=1) — bản vẽ đang mở giữ nguyên
    const cv = await win.evaluate(async () => { const A = DVDAcad, n0 = modelEntities.length, nm = currentName; const f = new File([A.dxfR2000(modelEntities)], 'chuyen-doi.dxf');
      const r = await A.dwgConvertFiles([f], 'R2013'), o = r.out[0]; return { bad: r.bad.map(x => x.join(': ')), head: o ? String.fromCharCode.apply(null, o.data.slice(0, 6)) : '', n: o ? o.n : 0, n0, same: modelEntities.length === n0 && currentName === nm, frames: document.querySelectorAll('iframe').length }; });
    check(cv.head === 'AC1027' && cv.n === cv.n0 && cv.same && !cv.bad.length && !cv.frames, 'DWGCONVERT: DXF → DWG 2013 trong khung ẩn, đủ ' + cv.n + '/' + cv.n0 + ' đối tượng, bản vẽ đang mở giữ nguyên' + (cv.bad.length ? ' — ' + cv.bad.join('; ') : ''));
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
    else check(await until(() => head(dwgOda) === 'AC1021', 60000), 'DWG 2007: qua ODA nếu máy đã cài, chưa cài → tự ghi DWG 2007 gốc (' + head(dwgOda) + ')');
    await win.evaluate(() => localStorage.removeItem('dvd:dwgsrv'));
    // DWGSERVER: nút Tải ODA File Converter mở trang tải chính thức (trình duyệt ngoài), Tìm lại dò lại ODA trên máy
    await app.evaluate(({ shell }) => { global.__ext = []; shell.openExternal = async u => { global.__ext.push(u); }; });
    await win.evaluate(() => DVDCmd.run('DWGSERVER'));
    check(await until(() => win.evaluate(() => !!document.querySelector('#dwOd') && !!document.querySelector('#dwOr'))), 'DWGSERVER có nút Tải ODA File Converter và Tìm lại');
    await win.click('#dwOd');
    check(await until(() => app.evaluate(() => global.__ext.join(' ') === 'https://www.opendesign.com/guestfiles/oda_file_converter')), 'Tải ODA File Converter mở trang tải của ODA bằng trình duyệt ngoài');
    await win.evaluate(() => { document.querySelector('#dwO').value = ''; document.querySelector('#dwOs').textContent = ''; }); await win.click('#dwOr');
    const od = await (async () => { await until(() => win.evaluate(() => !!document.querySelector('#dwOs').textContent)); return win.evaluate(() => ({ v: document.querySelector('#dwO').value, s: document.querySelector('#dwOs').textContent })); })();
    if(process.platform !== 'win32') check(od.v === env.ODA && /Đã tìm thấy|Found/.test(od.s), 'Tìm lại thấy ODA File Converter trên máy (' + od.v + ')');
    else check(!!od.v === /Đã tìm thấy|Found/.test(od.s) && (!!od.v || /Chưa cài|Not installed/.test(od.s)), 'Tìm lại: ' + (od.v || od.s));
    await win.keyboard.press('Escape');
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
