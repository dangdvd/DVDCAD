/* Kiểm thử bộ cài trên Windows thật (GitHub Actions windows-latest, chạy sau npm run dist):
   1. cài lặng dist/DVDCAD-Setup-*.exe (/S, cho người dùng hiện tại)
   2. kiểm tra file đã cài, gắn .dwg / .dxf trong registry, lối tắt Desktop / Start Menu
   3. chạy test/smoke.js trên chính DVDCAD.exe đã cài (DVDCAD_EXE)
   4. gỡ cài lặng và kiểm tra đã gỡ sạch */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawnSync, execFileSync } = require('child_process');

if(process.platform !== 'win32'){ console.log('Bỏ qua: chỉ chạy trên Windows.'); process.exit(0); }
const DIST = path.resolve(__dirname, '..', 'dist');
const setup = fs.readdirSync(DIST).find(n => /^DVDCAD-Setup-.*\.exe$/i.test(n));
if(!setup){ console.error('Không thấy bộ cài trong ' + DIST); process.exit(1); }
const DIR = path.join(process.env.LOCALAPPDATA, 'Programs', 'DVDCAD');
const EXE = path.join(DIR, 'DVDCAD.exe');
let failed = 0;
const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if(!ok) failed++; };
const reg = (key, val) => { try{ return execFileSync('reg', ['query', key].concat(val ? ['/v', val] : ['/ve']), { encoding: 'utf8' }); }catch(_){ return ''; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms){ const t = Date.now(); while(Date.now() - t < ms){ if(fn()) return true; await sleep(500); } return false; }

(async () => {
  console.log('1. Cài lặng ' + setup);
  const r = spawnSync(path.join(DIST, setup), ['/S'], { stdio: 'inherit', timeout: 300000 });
  check(r.status === 0, 'bộ cài thoát mã 0 (' + r.status + ')');
  check(await until(() => fs.existsSync(EXE), 60000), 'có ' + EXE);
  check(fs.existsSync(path.join(DIR, 'resources', 'www', 'index.html')) && fs.existsSync(path.join(DIR, 'resources', 'www', 'libredwg-web.wasm')), 'có mã web + bộ đọc DWG (resources\\www)');
  check(fs.existsSync(path.join(DIR, 'resources', 'www', 'LICENSE')), 'có LICENSE (GPL-3.0)');
  check(['dvd-acad-x3.js', 'dvd-acad-x4.js', 'dvd-acad-x5.js'].every(f => fs.existsSync(path.join(DIR, 'resources', 'www', f))), 'có 3 mô-đun x3 / x4 / x5');

  console.log('2. Gắn file .dwg / .dxf, lối tắt');
  for(const ext of ['dwg', 'dxf']){
    const cls = (reg('HKCU\\Software\\Classes\\.' + ext).match(/REG_SZ\s+(\S+)/) || [])[1] || '';
    check(/DVDCAD/i.test(cls), '.' + ext + ' → ' + (cls || '(không có)'));
    const open = cls ? reg('HKCU\\Software\\Classes\\' + cls + '\\shell\\open\\command') : '';
    check(/DVDCAD\.exe/i.test(open) && /%1/.test(open), 'mở .' + ext + ' bằng DVDCAD.exe "%1"');
  }
  const desk = path.join(process.env.USERPROFILE, 'Desktop', 'DVDCAD.lnk'), start = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'DVDCAD.lnk');
  check(fs.existsSync(desk), 'lối tắt Desktop'); check(fs.existsSync(start), 'lối tắt Start Menu');
  let unreg = ''; try{ unreg = execFileSync('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s', '/f', 'DVDCAD'], { encoding: 'utf8' }); }catch(_){}
  check(/DVDCAD/i.test(unreg), 'có trong Settings → Apps (mục gỡ cài)');

  console.log('3. Chạy kiểm thử trên DVDCAD.exe đã cài');
  const t = spawnSync(process.execPath, [path.join(__dirname, 'smoke.js')], { stdio: 'inherit', env: { ...process.env, DVDCAD_EXE: EXE }, timeout: 600000 });
  check(t.status === 0, 'smoke.js trên bản đã cài');

  console.log('4. Gỡ cài lặng');
  const unExe = fs.readdirSync(DIR).find(n => /^Uninstall.*\.exe$/i.test(n));
  check(!!unExe, 'có trình gỡ cài');
  if(unExe){ spawnSync(path.join(DIR, unExe), ['/S', '_?=' + DIR], { stdio: 'inherit', timeout: 300000 }); }
  check(await until(() => !fs.existsSync(EXE), 60000), 'đã xoá DVDCAD.exe');
  check(!/DVDCAD/i.test(reg('HKCU\\Software\\Classes\\.dwg')), 'đã bỏ gắn .dwg');
  console.log(failed ? '\nTHẤT BẠI: ' + failed + ' mục' : '\nĐẠT tất cả');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
