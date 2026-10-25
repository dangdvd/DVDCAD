/* DVDCAD Desktop — vỏ Electron để chạy DVDCAD như phần mềm Windows, hoàn toàn offline.
   • Toàn bộ app (index.html, dvd-*.js, LibreDWG WASM, three.js…) được phục vụ từ ổ đĩa qua giao thức
     riêng dvdcad://app/ — không cần mạng, không cần service worker.
   • Hộp thoại Mở / Lưu của Windows, nhấp đúp file .dwg / .dxf trong Explorer để mở (1 cửa sổ, mở thêm tab).
   • Nhớ kích thước / vị trí cửa sổ, danh sách bản vẽ gần đây theo đường dẫn (cả file lớn). */
'use strict';
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const SCHEME = 'dvdcad';
const ORIGIN = SCHEME + '://app';
// Bản đóng gói: mã web nằm trong resources/www. Khi chạy thử (npm start): thư mục cha của desktop/.
const WEB_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'www') : path.resolve(__dirname, '..');
const CAD_EXT = /\.(dwg|dxf)$/i;
const RECENT_MAX = 30;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.lsp': 'text/plain; charset=utf-8',
  '.dxf': 'application/dxf', '.dwg': 'application/acad', '.ttf': 'font/ttf', '.woff2': 'font/woff2'
};

// Thư mục dữ liệu riêng (chạy thử, bản portable trên USB…): DVDCAD_USER_DATA=đường-dẫn
if(process.env.DVDCAD_USER_DATA) app.setPath('userData', path.resolve(process.env.DVDCAD_USER_DATA));

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true }
}]);

/* ---------------- trạng thái lưu trong %APPDATA%\DVDCAD ---------------- */
const dataFile = n => path.join(app.getPath('userData'), n);
function readJSON(n, def){ try{ return JSON.parse(fs.readFileSync(dataFile(n), 'utf8')); }catch(_){ return def; } }
function writeJSON(n, v){ try{ fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(dataFile(n), JSON.stringify(v, null, 1)); }catch(_){} }

// Quyền đọc / ghi: renderer chỉ được đụng tới file người dùng đã chọn (hộp thoại, Explorer, kéo thả, danh sách gần đây).
const canRead = new Set(), canWrite = new Set();
const norm = p => path.resolve(String(p || ''));
const key = p => process.platform === 'win32' ? norm(p).toLowerCase() : norm(p);
function grantRead(p){ canRead.add(key(p)); }
function grantWrite(p){ canWrite.add(key(p)); canRead.add(key(p)); }

let recent = readJSON('recent.json', []).filter(r => r && typeof r.path === 'string');
recent.forEach(r => grantRead(r.path));
function addRecent(p){
  p = norm(p); let st = null; try{ st = fs.statSync(p); }catch(_){}
  recent = recent.filter(r => key(r.path) !== key(p));
  recent.unshift({ path: p, name: path.basename(p), size: st ? st.size : 0, time: Date.now() });
  if(recent.length > RECENT_MAX) recent.length = RECENT_MAX;
  writeJSON('recent.json', recent); grantRead(p);
  try{ app.addRecentDocument(p); }catch(_){}
}

/* ---------------- phục vụ file của app qua dvdcad://app/… ---------------- */
function serve(req){
  let rel;
  try{ rel = decodeURIComponent(new URL(req.url).pathname); }catch(_){ return new Response('Bad request', { status: 400 }); }
  if(rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(WEB_ROOT, rel));
  if(file !== WEB_ROOT && !file.startsWith(WEB_ROOT + path.sep)) return new Response('Forbidden', { status: 403 });
  return fs.promises.readFile(file).then(
    buf => new Response(buf, { status: 200, headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' } }),
    () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } }));
}

/* ---------------- cửa sổ ---------------- */
let win = null;
const pending = [];   // file mở từ Explorer trước khi giao diện sẵn sàng
let rendererReady = false;

function filesFromArgv(argv, cwd){
  return argv.slice(1).filter(a => a && !a.startsWith('-') && CAD_EXT.test(a))
    .map(a => path.resolve(cwd || process.cwd(), a)).filter(p => { try{ return fs.statSync(p).isFile(); }catch(_){ return false; } });
}
function openPaths(list){
  for(const p of list){ grantRead(p); addRecent(p); }
  if(!list.length) return;
  if(rendererReady && win) win.webContents.send('desktop:open-files', list.map(p => ({ path: p, name: path.basename(p) })));
  else pending.push(...list);
}

function createWindow(){
  const st = readJSON('window.json', {});
  win = new BrowserWindow({
    width: st.width || 1440, height: st.height || 900, x: st.x, y: st.y, minWidth: 960, minHeight: 600,
    show: false, backgroundColor: '#1f242c', title: 'DVDCAD',
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  if(st.maximized !== false) win.maximize();
  win.once('ready-to-show', () => win.show());

  const saveState = () => { if(!win || win.isDestroyed()) return; const b = win.getNormalBounds(); writeJSON('window.json', { ...b, maximized: win.isMaximized() }); };
  win.on('close', saveState);
  win.on('closed', () => { win = null; rendererReady = false; });

  const wc = win.webContents;
  // Liên kết web → trình duyệt mặc định. Trang nội bộ (hướng dẫn, ADDIN-API.md…) → cửa sổ con.
  wc.setWindowOpenHandler(({ url }) => {
    if(url.startsWith(ORIGIN + '/') || url === 'about:blank') return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: '#1f242c' } };
    if(/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // Kéo thả file lạ vào cửa sổ hoặc bấm link ngoài: không rời khỏi app.
  wc.on('will-navigate', (e, url) => {
    if(url.startsWith(ORIGIN + '/')) return;
    e.preventDefault();
    if(/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
  });
  // Phím riêng của vỏ: Ctrl+Shift+F12 = DevTools (F1…F12 để dành cho lệnh CAD như AutoCAD).
  wc.on('before-input-event', (e, input) => {
    if(input.type === 'keyDown' && input.control && input.shift && input.key === 'F12'){ wc.toggleDevTools(); e.preventDefault(); }
  });
  // Tiến trình giao diện bị sập (hết RAM khi mở file quá lớn…): báo rồi nạp lại.
  wc.on('render-process-gone', (_e, d) => { if(d.reason !== 'clean-exit' && win) dialog.showMessageBox(win, { type: 'error', title: 'DVDCAD', message: 'Giao diện bị lỗi — bấm OK để nạp lại.\nThe window crashed — press OK to reload.', detail: String(d.reason) }).then(() => win && win.reload()); });
  // Trang nạp lại (Đóng bản vẽ, CLOSEALL…): file mở từ Explorer lúc này phải đợi trang mới gọi desktop:ready.
  wc.on('did-start-navigation', (d, _url, inPlace, isMain) => {
    const main = d && d.isMainFrame !== undefined ? d.isMainFrame : isMain, same = d && d.isSameDocument !== undefined ? d.isSameDocument : inPlace;
    if(main && !same) rendererReady = false;
  });

  win.loadURL(ORIGIN + '/index.html');
}

/* ---------------- IPC cho preload.js ---------------- */
function toFilters(types, allFiles){
  const out = [];
  for(const t of types || []){
    const exts = []; for(const k in (t.accept || {})) for(const x of [].concat(t.accept[k])) exts.push(String(x).replace(/^\./, ''));
    if(exts.length) out.push({ name: t.description || exts.join(', '), extensions: exts });
  }
  out.push({ name: allFiles || 'Tất cả file (*.*)', extensions: ['*'] });
  return out;
}
function lastDir(){ return readJSON('prefs.json', {}).lastDir || app.getPath('documents'); }
function rememberDir(p){ const pr = readJSON('prefs.json', {}); pr.lastDir = path.dirname(p); writeJSON('prefs.json', pr); }

ipcMain.handle('desktop:ready', () => { rendererReady = true; const l = pending.splice(0); return l.map(p => ({ path: p, name: path.basename(p) })); });
ipcMain.handle('desktop:info', () => ({ version: app.getVersion(), electron: process.versions.electron, platform: process.platform, userData: app.getPath('userData') }));

ipcMain.handle('dlg:open', async (_e, o = {}) => {
  const r = await dialog.showOpenDialog(win, { title: o.title || 'Mở', defaultPath: lastDir(), filters: toFilters(o.types, o.allFiles),
    properties: ['openFile'].concat(o.multiple ? ['multiSelections'] : []) });
  if(r.canceled || !r.filePaths.length) return null;
  rememberDir(r.filePaths[0]);
  return r.filePaths.map(p => { grantRead(p); if(CAD_EXT.test(p)) addRecent(p); return { path: p, name: path.basename(p) }; });
});
ipcMain.handle('dlg:save', async (_e, o = {}) => {
  const r = await dialog.showSaveDialog(win, { title: o.title || 'Lưu thành', defaultPath: path.join(lastDir(), path.basename(o.suggestedName || 'Drawing1.dxf')), filters: toFilters(o.types, o.allFiles) });
  if(r.canceled || !r.filePath) return null;
  rememberDir(r.filePath); grantWrite(r.filePath);
  return { path: r.filePath, name: path.basename(r.filePath) };
});

ipcMain.handle('fs:read', async (_e, p) => {
  if(!canRead.has(key(p))) throw new Error('Không có quyền đọc file này.');
  const buf = await fs.promises.readFile(norm(p));
  return { name: path.basename(p), data: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), mtime: (await fs.promises.stat(norm(p))).mtimeMs };
});
ipcMain.handle('fs:write', async (_e, p, data) => {
  if(!canWrite.has(key(p))) throw new Error('Không có quyền ghi file này.');
  const tmp = norm(p) + '.dvdtmp';
  try{
    await fs.promises.writeFile(tmp, typeof data === 'string' ? data : Buffer.from(data));
    await fs.promises.rename(tmp, norm(p));   // ghi file tạm rồi đổi tên: không hỏng file cũ nếu lưu giữa chừng bị lỗi
  }catch(e){
    fs.promises.unlink(tmp).catch(() => {});
    if(e && (e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES')) throw new Error('File đang bị chương trình khác mở hoặc chỉ cho đọc: ' + path.basename(p));
    throw e;
  }
  if(CAD_EXT.test(p)) addRecent(p);
  return true;
});
ipcMain.handle('fs:dropped', (_e, list) => { const ok = []; for(const p of [].concat(list || [])) if(p && CAD_EXT.test(p)){ grantRead(p); addRecent(p); ok.push(norm(p)); } return ok; });

// stat bất đồng bộ, có hạn giờ: ổ mạng / USB đã rút không làm treo trang Bắt đầu
const statQuick = p => Promise.race([fs.promises.stat(p).catch(() => null), new Promise(r => setTimeout(() => r(undefined), 1500))]);
ipcMain.handle('recent:list', () => Promise.all(recent.map(async r => {
  const s = await statQuick(r.path);
  return { ...r, size: s ? s.size : r.size, mtime: s ? s.mtimeMs : 0, exists: s === undefined ? true : !!(s && s.isFile()) };
})));
ipcMain.handle('recent:remove', (_e, p) => { recent = recent.filter(r => key(r.path) !== key(p)); writeJSON('recent.json', recent); return true; });

/* ---------------- lưu DWG: DXF → DWG bằng ODA File Converter (miễn phí, cài riêng) ---------------- */
function findODA(){
  const cands = [];
  if(process.env.ODA) cands.push(process.env.ODA);
  const pr = readJSON('prefs.json', {}); if(pr.odaPath) cands.push(pr.odaPath);
  if(process.platform === 'win32'){
    for(const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'C:\\Program Files (x86)']){
      if(!base) continue; let subs = [];
      try{ subs = fs.readdirSync(path.join(base, 'ODA')).filter(n => /^ODAFileConverter/i.test(n)).sort().reverse(); }catch(_){}
      for(const d of subs) cands.push(path.join(base, 'ODA', d, 'ODAFileConverter.exe'));
    }
  }else cands.push('/usr/bin/ODAFileConverter', '/opt/ODAFileConverter/ODAFileConverter');
  return cands.find(p => { try{ return fs.statSync(p).isFile(); }catch(_){ return false; } }) || null;
}
ipcMain.handle('dwg:oda', () => ({ path: findODA() }));
ipcMain.handle('dwg:odaPick', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'ODAFileConverter', properties: ['openFile'], filters: process.platform === 'win32' ? [{ name: 'ODAFileConverter.exe', extensions: ['exe'] }] : [] });
  if(r.canceled || !r.filePaths[0]) return null;
  const pr = readJSON('prefs.json', {}); pr.odaPath = r.filePaths[0]; writeJSON('prefs.json', pr); return { path: r.filePaths[0] };
});
ipcMain.handle('dwg:convert', async (_e, dxf, ver) => {
  const oda = findODA(); if(!oda) return { error: 'Chưa có ODA File Converter trên máy — cài bản miễn phí (opendesign.com) hoặc chọn trong DWGSERVER.' };
  const V = /^ACAD(2000|2004|2007|2010|2013|2018)$/.test(String(ver)) ? String(ver) : 'ACAD2018';
  const work = await fs.promises.mkdtemp(path.join(app.getPath('temp'), 'dvdcad-dwg-'));
  try{
    const inDir = path.join(work, 'in'), outDir = path.join(work, 'out');
    await fs.promises.mkdir(inDir); await fs.promises.mkdir(outDir);
    await fs.promises.writeFile(path.join(inDir, 'drawing.dxf'), String(dxf));
    // ODAFileConverter <thư mục vào> <thư mục ra> <phiên bản> <DWG|DXF> <đệ quy> <audit> <lọc>
    await new Promise((res, rej) => execFile(oda, [inDir, outDir, V, 'DWG', '0', '1', '*.dxf'], { timeout: 180000, windowsHide: true }, err => err ? rej(err) : res()));
    const f = (await fs.promises.readdir(outDir)).find(n => /\.dwg$/i.test(n));
    if(!f) return { error: 'ODA File Converter không tạo được file DWG.' };
    const buf = await fs.promises.readFile(path.join(outDir, f));
    return { data: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) };
  }catch(e){ return { error: 'ODA File Converter lỗi: ' + (e && e.message || e) }; }
  finally{ fs.promises.rm(work, { recursive: true, force: true }).catch(() => {}); }
});

ipcMain.handle('shell:external', (_e, url) => { if(/^(https?:|mailto:)/i.test(String(url))) shell.openExternal(String(url)); return true; });
ipcMain.handle('shell:reveal', (_e, p) => { if(canRead.has(key(p))) shell.showItemInFolder(norm(p)); return true; });

/* ---------------- khởi động ---------------- */
if(!app.requestSingleInstanceLock()){
  app.quit();
}else{
  app.on('second-instance', (_e, argv, cwd) => {
    openPaths(filesFromArgv(argv, cwd));
    if(win){ if(win.isMinimized()) win.restore(); win.focus(); }
  });
  app.on('open-file', (e, p) => { e.preventDefault(); openPaths([p]); });   // macOS
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);   // app có ribbon + phím tắt riêng; không để menu mặc định chiếm Ctrl+W, Ctrl+R…
    protocol.handle(SCHEME, serve);
    openPaths(filesFromArgv(process.argv, process.cwd()));
    createWindow();
    app.on('activate', () => { if(!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
}
