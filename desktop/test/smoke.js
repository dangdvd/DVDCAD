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
  if(process.platform !== 'win32'){
    const dwgOut = path.join(tmp, 'luu-ra.dwg');
    await app.evaluate(({ dialog }, p) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: p }); }, dwgOut);
    await win.evaluate(() => DVDCmd.run('SAVEDWG'));
    check(await until(() => fs.existsSync(dwgOut) && fs.readFileSync(dwgOut, 'latin1').startsWith('AC1032')), 'SAVEDWG chuyển qua ODA File Converter trên máy và lưu .dwg');
  }else{
    await win.evaluate(() => DVDCmd.run('SAVEDWG'));
    check(await until(() => win.evaluate(() => /ODA/.test(document.getElementById('toast').textContent))), 'SAVEDWG khi chưa cài ODA → hướng dẫn cài ODA File Converter');
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

  check(!errors.length, 'không có lỗi JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failed ? '\nTHẤT BẠI: ' + failed + ' mục' : '\nĐẠT tất cả');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
