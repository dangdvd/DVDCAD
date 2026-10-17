/* DVDCAD — Google Drive, chia sẻ link, cộng tác nhiều người, mở/lưu file trực tiếp trên máy.
   File này nạp SAU script chính của index.html và dùng lại các hàm/biến toàn cục của app
   (loadDXF, loadDWG, measurements, annotations, modelEntities, geomDel, entitiesToDXF, toast...).
   Không có server riêng: dữ liệu nằm trong Google Drive của người dùng (quyền drive.file — app chỉ thấy
   những file người dùng tự chọn hoặc do app tạo ra). */
(function(){
  'use strict';
  if(window.DVDCloud) return;
  const Core = window.DVDCollabCore;
  const DRIVE = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const POLL_MS = 4000;
  const RAW_KEEP_MAX = 20 * 1024 * 1024;     // giữ dữ liệu gốc của file vừa mở (để "Lưu lên Drive") nếu <= 20MB

  /* ---------------- cấu hình ---------------- */
  function readCfg(){
    let local = {};
    try{ local = JSON.parse(localStorage.getItem('dvd:gcfg') || '{}') || {}; }catch(_){}
    const base = window.DVD_GOOGLE || {};
    const pick = k => String((local[k] || base[k] || '')).trim();
    return { clientId: pick('clientId'), apiKey: pick('apiKey'), appId: pick('appId') };
  }
  let CFG = readCfg();
  const cfgOk = () => !!(CFG.clientId && CFG.apiKey);

  /* ---------------- trạng thái ---------------- */
  const S = {
    token: null, tokenExp: 0, user: null,
    file: null,          // bản vẽ đang mở từ Drive: {id,name,ext,canEdit,canShare,parents,collabId,dxfCopyId,webViewLink}
    collab: null,        // phiên cộng tác đang chạy
    opening: false,      // đang mở file do module này điều khiển (không reset ngữ cảnh Drive)
    applying: false,     // đang áp thay đổi từ xa vào app (không coi là thay đổi cục bộ)
    changeGen: 0,        // tăng mỗi khi app lưu đo/ghi chú/hình vẽ
    lastRaw: null,       // {data,type,name} dữ liệu gốc file vừa mở
    stash: new Map(),    // chữ ký -> [đối tượng gốc đã bị xoá] (để phục hồi khi người khác hoàn tác)
    saveHandle: null,    // file DXF đã chọn để lưu đè (File System Access)
    gisReady: null, gapiReady: null, tokenClient: null
  };
  try{ const t = JSON.parse(sessionStorage.getItem('dvd:gtok') || 'null'); if(t && t.exp > Date.now() + 60000){ S.token = t.tok; S.tokenExp = t.exp; } }catch(_){}
  try{ const u = JSON.parse(localStorage.getItem('dvd:guser') || 'null'); if(u && u.email) S.user = u; }catch(_){}

  /* ---------------- tiện ích ---------------- */
  const $ = id => document.getElementById(id);
  const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = m => { try{ toast(m); }catch(_){ console.log(m); } };
  const baseName = n => String(n || 'banve').replace(/\.(dwg|dxf)$/i, '');
  const extOf = n => { const m = /\.(dwg|dxf)$/i.exec(String(n || '')); return m ? m[1].toLowerCase() : ''; };
  const isMobile = () => (typeof isMobileDevice === 'function') ? isMobileDevice() : /iPhone|iPad|Android/i.test(navigator.userAgent);
  const isIOSStandalone = () => !!(window.navigator.standalone) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches && /iPhone|iPad/.test(navigator.userAgent));
  function busyMsg(s){ try{ showVal(s); }catch(_){} }
  function clearBusy(){ try{ valEl.classList.remove('show'); }catch(_){} }
  function me(){ return (S.user && S.user.email) || 'khach'; }
  function myName(){ return (S.user && (S.user.name || S.user.email)) || 'Khách'; }

  function loadScript(src){
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => res(); s.onerror = () => rej(new Error('Không tải được ' + src)); document.head.appendChild(s); });
  }
  function ensureGIS(){
    if(!S.gisReady) S.gisReady = loadScript('https://accounts.google.com/gsi/client').catch(e => { S.gisReady = null; throw e; });
    return S.gisReady;
  }
  function ensurePicker(){
    if(!S.gapiReady) S.gapiReady = loadScript('https://apis.google.com/js/api.js')
      .then(() => new Promise((res, rej) => window.gapi.load('picker', { callback: res, onerror: () => rej(new Error('picker')) })))
      .catch(e => { S.gapiReady = null; throw e; });
    return S.gapiReady;
  }
  function preload(){ if(!cfgOk() || !navigator.onLine) return; ensureGIS().catch(() => {}); ensurePicker().catch(() => {}); }

  /* ---------------- đăng nhập (Google Identity Services, token client) ---------------- */
  function tokenValid(){ return !!(S.token && S.tokenExp > Date.now() + 30000); }
  async function getToken(interactive){
    if(tokenValid()) return S.token;
    if(!interactive) return null;
    if(!cfgOk()){ openSettings(); return null; }
    if(!navigator.onLine){ say('Cần có mạng để đăng nhập Google.'); return null; }
    try{ await ensureGIS(); }catch(_){ say('Không tải được dịch vụ đăng nhập Google. Kiểm tra mạng.'); return null; }
    return new Promise(resolve => {
      try{
        if(!S.tokenClient){
          S.tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CFG.clientId, scope: SCOPE, callback: () => {},
            error_callback: err => { const f = S._tokErr; S._tokErr = null; if(f) f(err); } });
        }
        S.tokenClient.callback = async resp => {
          if(!resp || resp.error){ say('Chưa đăng nhập được Google' + (resp && resp.error ? ' (' + resp.error + ')' : '') + '.'); resolve(null); return; }
          S.token = resp.access_token; S.tokenExp = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
          try{ sessionStorage.setItem('dvd:gtok', JSON.stringify({ tok: S.token, exp: S.tokenExp })); }catch(_){}
          await fetchUser();
          updateUI();
          resolve(S.token);
        };
        S._tokErr = err => { say(err && err.type === 'popup_closed' ? 'Đã đóng cửa sổ đăng nhập.' : 'Trình duyệt chặn cửa sổ đăng nhập — cho phép popup rồi thử lại.'); resolve(null); };
        const req = { prompt: S.user ? '' : 'consent' }; if(S.user && S.user.email) req.login_hint = S.user.email;
        S.tokenClient.requestAccessToken(req);
      }catch(e){ console.error(e); say('Lỗi đăng nhập Google: ' + (e.message || e)); resolve(null); }
    });
  }
  async function fetchUser(){
    try{
      const r = await gfetch(DRIVE + '/about?fields=user(displayName,emailAddress,photoLink)');
      if(r.ok){ const j = await r.json(); S.user = { name: j.user.displayName, email: j.user.emailAddress, photo: j.user.photoLink }; localStorage.setItem('dvd:guser', JSON.stringify(S.user)); }
    }catch(_){}
  }
  function signOut(){
    try{ if(S.token && window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(S.token, () => {}); }catch(_){}
    S.token = null; S.tokenExp = 0; S.user = null;
    try{ sessionStorage.removeItem('dvd:gtok'); localStorage.removeItem('dvd:guser'); }catch(_){}
    if(S.collab) S.collab.readonly = true;
    updateUI(); say('Đã đăng xuất Google.');
  }

  /* ---------------- gọi Drive API ---------------- */
  // auth: 'token' | 'key' | 'auto' (có token thì dùng token, không thì dùng API key — đọc được file công khai)
  async function gfetch(url, opts, auth){
    opts = Object.assign({}, opts || {}); auth = auth || 'token';
    const headers = Object.assign({}, opts.headers || {});
    let useKey = auth === 'key' || (auth === 'auto' && !tokenValid());
    if(!useKey){ if(!tokenValid()) throw httpErr(401, 'Cần đăng nhập Google'); headers.Authorization = 'Bearer ' + S.token; }
    else url += (url.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(CFG.apiKey);
    opts.headers = headers;
    const r = await fetch(url, opts);
    if(r.status === 401 && !useKey){ S.token = null; S.tokenExp = 0; try{ sessionStorage.removeItem('dvd:gtok'); }catch(_){} }
    return r;
  }
  function httpErr(status, message){ const e = new Error(message); e.status = status; return e; }
  async function ensureOk(r){
    if(r.ok) return r;
    let msg = 'Lỗi Drive ' + r.status;
    try{ const j = await r.json(); if(j && j.error){ msg = j.error.message || msg; const rs = j.error.errors && j.error.errors[0] && j.error.errors[0].reason; if(rs) msg += ' [' + rs + ']'; } }catch(_){}
    throw httpErr(r.status, msg);
  }
  const FILE_FIELDS = 'id,name,mimeType,size,version,modifiedTime,parents,appProperties,webViewLink,capabilities(canEdit,canShare)';
  async function getMeta(id, fields, auth){
    const r = await gfetch(DRIVE + '/files/' + encodeURIComponent(id) + '?supportsAllDrives=true&fields=' + encodeURIComponent(fields || FILE_FIELDS), {}, auth);
    await ensureOk(r); return r.json();
  }
  async function download(id, auth){
    const r = await gfetch(DRIVE + '/files/' + encodeURIComponent(id) + '?alt=media&supportsAllDrives=true', { cache: 'no-store' }, auth);
    await ensureOk(r); return r.arrayBuffer();
  }
  async function createFile(meta, data, mime){
    const b = 'dvd' + Math.random().toString(36).slice(2);
    const body = new Blob([
      '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n',
      '--' + b + '\r\nContent-Type: ' + mime + '\r\n\r\n', data, '\r\n--' + b + '--'
    ]);
    const r = await gfetch(UPLOAD + '/files?uploadType=multipart&supportsAllDrives=true&fields=' + encodeURIComponent(FILE_FIELDS), { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
    await ensureOk(r); return r.json();
  }
  async function updateMedia(id, data, mime){
    const r = await gfetch(UPLOAD + '/files/' + encodeURIComponent(id) + '?uploadType=media&supportsAllDrives=true&fields=id,version', { method: 'PATCH', headers: { 'Content-Type': mime }, body: data });
    await ensureOk(r); return r.json();
  }
  async function updateMeta(id, meta){
    const r = await gfetch(DRIVE + '/files/' + encodeURIComponent(id) + '?supportsAllDrives=true&fields=id,appProperties', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
    await ensureOk(r); return r.json();
  }
  async function addPermission(id, perm, notify, message){
    let url = DRIVE + '/files/' + encodeURIComponent(id) + '/permissions?supportsAllDrives=true&sendNotificationEmail=' + (notify ? 'true' : 'false');
    if(notify && message) url += '&emailMessage=' + encodeURIComponent(message);
    const r = await gfetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(perm) });
    await ensureOk(r); return r.json();
  }
  async function removeAnyone(id){
    const r = await gfetch(DRIVE + '/files/' + encodeURIComponent(id) + '/permissions/anyoneWithLink?supportsAllDrives=true', { method: 'DELETE' });
    if(r.status === 404) return; await ensureOk(r);
  }
  async function isPublic(id){
    try{ const j = await getMeta(id, 'permissions(id,type,role)'); return (j.permissions || []).some(p => p.type === 'anyone'); }catch(_){ return null; }
  }

  /* ---------------- Google Picker ---------------- */
  async function pick(opts){
    opts = opts || {};
    const tok = await getToken(true); if(!tok) return null;
    try{ await ensurePicker(); }catch(_){ say('Không tải được trình chọn file của Google.'); return null; }
    return new Promise(resolve => {
      const P = google.picker;
      const view = new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setMode(P.DocsViewMode.LIST);
      if(opts.fileIds && opts.fileIds.length && view.setFileIds) view.setFileIds(opts.fileIds.join(','));
      const b = new P.PickerBuilder()
        .setOAuthToken(tok).setDeveloperKey(CFG.apiKey).setLocale('vi')
        .setTitle(opts.title || 'Chọn bản vẽ .dwg / .dxf')
        .addView(view)
        .setCallback(d => {
          if(d.action === P.Action.PICKED) resolve((d.docs || []).map(x => ({ id: x.id, name: x.name, mimeType: x.mimeType })));
          else if(d.action === P.Action.CANCEL) resolve(null);
        });
      if(CFG.appId) b.setAppId(CFG.appId);
      if(opts.multi) b.enableFeature(P.Feature.MULTISELECT_ENABLED);
      if(!opts.fileIds) b.addView(new P.DocsUploadView().setIncludeFolders(true));
      b.build().setVisible(true);
    });
  }

  /* ---------------- mở bản vẽ từ Drive ---------------- */
  async function openFromDrive(){
    if(!cfgOk()){ openSettings(); return; }
    try{ closeModal(openOverlay); }catch(_){}
    closeSheet();
    const docs = await pick({}); if(!docs || !docs.length) return;
    const d = docs[0];
    if(!extOf(d.name)){ say('Hãy chọn file .dwg hoặc .dxf.'); return; }
    await openDriveFile(d.id, {});
  }

  // opts: {collabId, silent:true khi mở từ link (chưa có thao tác người dùng)}
  async function openDriveFile(id, opts){
    opts = opts || {};
    if(!navigator.onLine){ say('Cần mạng để mở file từ Google Drive.'); return false; }
    busyMsg('Đang tải bản vẽ từ Google Drive…');
    let meta = null, auth = tokenValid() ? 'token' : 'key';
    try{ meta = await getMeta(id, null, auth); }
    catch(e){
      if(auth === 'token' && (e.status === 404 || e.status === 403)){
        try{ meta = await getMeta(id, null, 'key'); auth = 'key'; }catch(_){ meta = null; }
      }
      if(!meta){
        clearBusy();
        if(opts.silent){ askSignInForLink(id, opts.collabId); return false; }
        if(tokenValid()){
          // file riêng tư chưa cấp quyền cho app: mở trình chọn đã lọc sẵn đúng file để người dùng cấp quyền
          const ok = await grantAccess([id, opts.collabId].filter(Boolean));
          if(ok) return openDriveFile(id, Object.assign({}, opts, { silent: false, granted: true }));
        }
        say('Không mở được file trên Drive: ' + (e.message || e)); return false;
      }
    }
    const ext = extOf(meta.name);
    if(!ext){ clearBusy(); say('File "' + meta.name + '" không phải .dwg/.dxf.'); return false; }
    let buf;
    try{ buf = await download(id, auth); }
    catch(e){ clearBusy(); say('Không tải được nội dung file: ' + (e.message || e)); return false; }
    const ap = meta.appProperties || {};
    S.opening = true;
    try{
      stopCollab();
      S.file = { id: meta.id, name: meta.name, ext, canEdit: !!(meta.capabilities && meta.capabilities.canEdit) && auth === 'token',
                 canShare: !!(meta.capabilities && meta.capabilities.canShare) && auth === 'token', parents: meta.parents || [],
                 collabId: opts.collabId || ap.dvdcadCollab || null, dxfCopyId: ap.dvdcadDxf || null, webViewLink: meta.webViewLink || '', viaKey: auth === 'key' };
      if(ext === 'dwg') await loadDWG(buf, meta.name);
      else loadDXF(new TextDecoder('utf-8').decode(buf), meta.name);
    }finally{ S.opening = false; }
    if(!(entities && entities.length) || currentName !== meta.name){ S.file = null; updateUI(); return false; }
    try{
      if(buf.byteLength <= RECENT_MAX_BYTES){
        const key = drawingKey(ext === 'dwg' ? new Uint8Array(buf) : new TextDecoder('utf-8').decode(buf), meta.name);
        idbPut({ key, name: meta.name, type: ext, data: ext === 'dwg' ? buf : new TextDecoder('utf-8').decode(buf), savedAt: Date.now(), gd: meta.id, gc: S.file.collabId || null });
      }
    }catch(_){}
    updateUrl();
    if(S.file.collabId) startCollab(S.file.collabId);
    updateUI();
    say('Đã mở từ Google Drive: ' + meta.name + (S.file.collabId ? ' · đang đồng bộ ghi chú dùng chung' : ''));
    return true;
  }

  async function grantAccess(ids){
    say('Chọn bản vẽ trong cửa sổ Google để cấp quyền cho DVDCAD.');
    const docs = await pick({ fileIds: ids, multi: ids.length > 1, title: 'Cấp quyền mở bản vẽ được chia sẻ' });
    return !!(docs && docs.length);
  }

  function askSignInForLink(id, collabId){
    openPrompt({
      title: 'Bản vẽ trên Google Drive',
      text: 'Bản vẽ này không mở công khai. Đăng nhập Google bằng tài khoản đã được chia sẻ để mở.',
      ok: 'Đăng nhập Google',
      onOk: async () => { const t = await getToken(true); if(t) openDriveFile(id, { collabId }); }
    });
  }

  /* ---------------- lưu lên Drive ---------------- */
  async function uploadCurrentToDrive(){
    if(S.file){ say('Bản vẽ này đã nằm trên Google Drive.'); return; }
    const raw = S.lastRaw;
    if(!raw || raw.name !== currentName){ say('Không còn dữ liệu gốc (file quá lớn hoặc là bản mẫu). Mở lại file từ máy rồi thử lại.'); return; }
    const tok = await getToken(true); if(!tok) return;
    closeSheet(); busyMsg('Đang tải bản vẽ lên Google Drive…');
    try{
      const mime = raw.type === 'dwg' ? 'image/vnd.dwg' : 'application/dxf';
      const r = await createFile({ name: raw.name, mimeType: mime, description: 'Tải lên bằng DVDCAD' }, raw.file || raw.data, mime);
      S.file = { id: r.id, name: r.name, ext: raw.type, canEdit: true, canShare: true, parents: r.parents || [], collabId: null, dxfCopyId: null, webViewLink: r.webViewLink || '' };
      clearBusy(); updateUrl(); updateUI();
      say('Đã lưu "' + r.name + '" lên Google Drive. Giờ có thể chia sẻ và cùng sửa.');
    }catch(e){ clearBusy(); say('Không tải lên được: ' + (e.message || e)); }
  }

  async function saveDxfToDrive(){
    if(!modelEntities || !modelEntities.length){ say('Chưa có bản vẽ.'); return; }
    const tok = await getToken(true); if(!tok) return;
    closeSheet();
    let dxf; try{ dxf = entitiesToDXF(modelEntities); }catch(e){ say('Không tạo được DXF.'); return; }
    const name = baseName(currentName) + '_DVDCAD.dxf';
    busyMsg('Đang lưu DXF lên Google Drive…');
    try{
      let id = S.file && S.file.dxfCopyId, done = false;
      if(id){ try{ await updateMedia(id, dxf, 'application/dxf'); done = true; }catch(_){ id = null; } }
      if(!done){
        const meta = { name, mimeType: 'application/dxf', description: 'Bản DXF xuất từ DVDCAD (gồm cả phần đã vẽ/sửa)' };
        if(S.file && S.file.parents && S.file.parents[0]) meta.parents = [S.file.parents[0]];
        let r; try{ r = await createFile(meta, dxf, 'application/dxf'); }catch(e){ if(!meta.parents) throw e; delete meta.parents; r = await createFile(meta, dxf, 'application/dxf'); }
        id = r.id;
        if(S.file){ S.file.dxfCopyId = id; if(S.file.canEdit){ try{ await updateMeta(S.file.id, { appProperties: { dvdcadDxf: id } }); }catch(_){} } }
      }
      clearBusy(); say('Đã lưu "' + name + '" lên Google Drive (mở được bằng AutoCAD).');
    }catch(e){ clearBusy(); say('Không lưu được lên Drive: ' + (e.message || e)); }
  }

  /* ---------------- cộng tác ---------------- */
  function normMeas(m){ return { kind: (m && m.kind) || 'aligned', pts: ((m && m.pts) || []).map(p => ({ x: +p.x, y: +p.y })) }; }
  function normAnn(o){
    if(!o || typeof o !== 'object') return null;
    const t = o.type || 'pin', n = v => +v;
    if(t === 'circle') return { type: t, cx: n(o.cx), cy: n(o.cy), r: n(o.r), text: o.text || '' };
    if(t === 'cloud' || t === 'leader') return { type: t, x1: n(o.x1), y1: n(o.y1), x2: n(o.x2), y2: n(o.y2), text: o.text || '' };
    if(t === 'freehand') return { type: t, pts: (o.pts || []).map(p => ({ x: n(p.x), y: n(p.y) })), text: o.text || '' };
    return { type: t === 'text' ? 'text' : 'pin', x: n(o.x), y: n(o.y), text: o.text || '' };
  }
  function collectLocal(){
    const out = [];
    for(const m of measurements) out.push({ obj: m, k: 'm', d: JSON.stringify(normMeas(m)) });
    for(const a of annotations){ const n = normAnn(a); if(n) out.push({ obj: a, k: 'a', d: JSON.stringify(n) }); }
    for(const e of modelEntities) if(e && e.userAdded) out.push({ obj: e, k: 'g', d: JSON.stringify(serializeEnt(e)) });
    if(geomDel) for(const sig of geomDel) out.push({ obj: sig, k: 'x', d: sig });
    return out;
  }
  function isBusyEditing(){
    try{
      if(gripEdit || selDrag || gizmoDrag || picking || mark || marquee || pendingNote) return true;
      if((editPts && editPts.length) || (measureTemp && measureTemp.length) || editingIdx >= 0) return true;
      if(document.querySelector('.overlay.show:not(#dvdCloudOverlay):not(#dvdShareOverlay)')) return true;
    }catch(_){}
    return false;
  }

  function startCollab(collabId, readonlyHint){
    stopCollab();
    S.collab = { id: collabId, doc: Core.emptyDoc(S.file ? { id: S.file.id, name: S.file.name } : null), remote: null, ver: null,
                 base: {}, ids: new WeakMap(), readonly: readonlyHint !== undefined ? !!readonlyHint : !tokenValid(),
                 checkedCaps: false, busy: false, again: false, timer: null, debounce: null, lastPresence: 0, seenT: 0, status: 'sync', err: '',
                 needAuth: !tokenValid(), needGrant: false };
    S.collab.timer = setInterval(() => { if(document.visibilityState === 'visible') syncNow(); }, POLL_MS);
    syncNow(); updateUI();
  }
  function stopCollab(){
    const co = S.collab; if(!co) return;
    clearInterval(co.timer); clearTimeout(co.debounce); S.collab = null; updateUI();
  }

  async function enableCollab(){
    if(!S.file){ say('Lưu bản vẽ lên Google Drive trước (nút ☁ → "Lưu bản vẽ này lên Drive").'); return; }
    const tok = await getToken(true); if(!tok) return;
    if(S.file.collabId){ startCollab(S.file.collabId); return; }
    busyMsg('Đang tạo file dùng chung trên Drive…');
    try{
      const doc = Core.emptyDoc({ id: S.file.id, name: S.file.name });
      const meta = { name: baseName(S.file.name) + '.dvdcad.json', mimeType: 'application/json', appProperties: { dvdcadFor: S.file.id },
                     description: 'Ghi chú, phép đo và hình vẽ dùng chung của DVDCAD cho bản vẽ ' + S.file.name };
      if(S.file.parents && S.file.parents[0]) meta.parents = [S.file.parents[0]];
      let r; try{ r = await createFile(meta, JSON.stringify(doc), 'application/json'); }
      catch(e){ if(!meta.parents) throw e; delete meta.parents; r = await createFile(meta, JSON.stringify(doc), 'application/json'); }
      S.file.collabId = r.id;
      if(S.file.canEdit){ try{ await updateMeta(S.file.id, { appProperties: { dvdcadCollab: r.id } }); }catch(_){} }
      // bản vẽ đang mở công khai thì file dùng chung cũng cho xem công khai (người xem link thấy ghi chú)
      if(await isPublic(S.file.id)){ try{ await addPermission(r.id, { role: 'reader', type: 'anyone' }, false); }catch(_){} }
      clearBusy(); updateUrl();
      startCollab(r.id, false);
      say('Đã bật cộng tác: ghi chú, phép đo và hình vẽ sẽ đồng bộ cho người được chia sẻ.');
    }catch(e){ clearBusy(); say('Không bật được cộng tác: ' + (e.message || e)); }
  }

  function noteLocalChange(){
    S.changeGen++;
    const co = S.collab; if(!co || co.readonly) return;
    clearTimeout(co.debounce); co.debounce = setTimeout(() => syncNow(), 900);
  }

  async function ensureUser(){ if(tokenValid() && !S.user){ await fetchUser(); } }
  async function syncNow(){
    const co = S.collab; if(!co) return;
    if(co.busy){ co.again = true; return; }
    if(!navigator.onLine){ setStatus('offline'); return; }
    if(isBusyEditing()){ co.again = true; return; }
    co.busy = true; const gen0 = S.changeGen;
    try{
      await ensureUser();
      if(!tokenValid() && !co.readonly){ co.readonly = true; co.needAuth = true; }
      const auth = tokenValid() ? 'auto' : 'key';
      if(tokenValid() && !co.checkedCaps){
        try{ const m = await getMeta(co.id, 'id,capabilities(canEdit)', 'token'); co.readonly = !(m.capabilities && m.capabilities.canEdit); co.needAuth = false; }
        catch(e){ if(e.status === 404 || e.status === 403){ co.readonly = true; co.needGrant = true; } else throw e; }
        co.checkedCaps = true;
      }
      setStatus('sync');
      // 1) đọc bản trên Drive nếu đã đổi
      let meta;
      try{ meta = await getMeta(co.id, 'id,version', co.needGrant ? 'key' : auth); }
      catch(e){ if(auth !== 'key' && (e.status === 404 || e.status === 403)){ meta = await getMeta(co.id, 'id,version', 'key'); } else throw e; }
      if(String(meta.version) !== String(co.ver)){
        const buf = await download(co.id, co.needGrant ? 'key' : auth);
        let remote; try{ remote = JSON.parse(new TextDecoder('utf-8').decode(buf)); }catch(_){ remote = null; }
        if(!Core.isDoc(remote)) remote = Core.emptyDoc(co.doc.drawing);
        co.remote = remote; co.ver = meta.version;
        co.doc = Core.mergeDocs(remote, co.doc);
      }
      // 2) thay đổi cục bộ -> ghi lên Drive
      if(!co.readonly){
        const lm = Core.assignIds(collectLocal(), co.ids, [co.base, co.doc.items]);
        const ops = Core.diff(co.base, lm, Date.now(), me());
        if(Object.keys(ops).length) co.doc = Core.applyOps(co.doc, ops);
        const now = Date.now(), needPresence = now - co.lastPresence > 30000;
        if(needPresence) co.doc.presence = Object.assign({}, co.doc.presence, { [me()]: { n: myName(), t: now } });
        if(needPresence || !Core.sameItems(co.doc, co.remote)){
          const out = Core.gc(co.doc, 30 * 864e5, now);
          const r = await updateMedia(co.id, JSON.stringify(out), 'application/json');
          co.doc = out; co.remote = JSON.parse(JSON.stringify(out)); co.ver = r.version; co.lastPresence = now;
        }
      }
      // 3) áp tài liệu hợp nhất vào app (bỏ qua nếu người dùng vừa sửa thêm trong lúc chờ mạng)
      if(S.changeGen === gen0 && !isBusyEditing() && S.collab === co){
        const changed = applyDocToLocal(co.doc);
        co.base = Core.liveSnapshot(co.doc);
        if(changed) announceRemote(co);
      }else co.again = true;
      co.err = '';
      setStatus(co.readonly ? (co.needAuth || co.needGrant ? 'auth' : 'readonly') : 'ok');
    }catch(e){
      console.warn('[DVDCAD sync]', e);
      co.err = e.message || String(e);
      setStatus(e.status === 401 ? 'auth' : (navigator.onLine ? 'error' : 'offline'));
    }finally{
      co.busy = false;
      if(co.again && S.collab === co){ co.again = false; setTimeout(syncNow, 400); }
    }
  }

  function rebuildList(live, cur, ids, make, norm){
    const byId = new Map();
    for(const o of cur){ const id = ids.get(o); if(id && !byId.has(id)) byId.set(id, o); }
    const list = live.map(it => {
      const ex = byId.get(it.id);
      if(ex && JSON.stringify(norm(ex)) === it.d) return ex;
      const o = make(it.d); ids.set(o, it.id); return o;
    });
    for(const o of cur){ if(!ids.get(o)) list.push(o); }      // mục cục bộ chưa từng đồng bộ (chế độ chỉ xem) -> giữ lại
    const changed = list.length !== cur.length || list.some((o, i) => o !== cur[i]);
    return { list, changed };
  }
  function findOriginal(sig){
    const st = S.stash.get(sig); if(st && st.length) return st.splice(0);
    const found = [];
    const scan = a => { if(!a) return; for(const k of ['ent', 'orig']){ const e = a[k]; if(e && !e.userAdded && entSig(e) === sig) found.push(e); }
      for(const arr of [a.items, a.orig]){ if(Array.isArray(arr)) for(const it of arr){ const e = it && (it.ent || it.orig); if(e && !e.userAdded && entSig(e) === sig) found.push(e); } }
      if(Array.isArray(a.steps)) for(const s2 of a.steps) scan(s2); };
    try{ for(const a of editUndoStack) scan(a); for(const a of redoStack) scan(a); }catch(_){}
    return found.slice(0, 1);
  }

  function applyDocToLocal(doc){
    const co = S.collab, live = Core.liveByKind(doc);
    let mC = false, aC = false, gC = false, missingOrig = 0;
    S.applying = true;
    try{
      const mr = rebuildList(live.m, measurements, co.ids, d => normMeas(JSON.parse(d)), normMeas);
      if(mr.changed){ measurements = mr.list; mC = true; }
      const ar = rebuildList(live.a, annotations, co.ids, d => JSON.parse(d), normAnn);
      if(ar.changed){ annotations = ar.list; aC = true; }
      // hình vẽ thêm
      const want = new Map(live.g.map(it => [it.id, it.d])), have = new Set();
      for(let i = modelEntities.length - 1; i >= 0; i--){
        const e = modelEntities[i]; if(!e || !e.userAdded) continue;
        const id = co.ids.get(e); if(!id) continue;                   // hình chưa đồng bộ (chỉ xem) -> giữ
        const d = want.get(id);
        if(d !== undefined && !have.has(id) && JSON.stringify(serializeEnt(e)) === d){ have.add(id); continue; }
        modelEntities.splice(i, 1); gC = true;
      }
      for(const it of live.g){ if(have.has(it.id)) continue; const e = JSON.parse(it.d); e.userAdded = true; co.ids.set(e, it.id); modelEntities.push(e); gC = true; }
      // đối tượng gốc của file đã xoá
      const wantX = new Set(live.x.map(it => it.d));
      if(co.readonly) for(const s of geomDel) wantX.add(s);             // chỉ xem: không bỏ các xoá cục bộ của mình
      const addX = [...wantX].filter(s => !geomDel.has(s)), remX = [...geomDel].filter(s => !wantX.has(s));
      if(addX.length){
        const set = new Set(addX);
        for(let i = modelEntities.length - 1; i >= 0; i--){
          const e = modelEntities[i]; if(!e || e.userAdded) continue;
          const s = entSig(e); if(set.has(s)){ modelEntities.splice(i, 1); if(!S.stash.has(s)) S.stash.set(s, []); S.stash.get(s).push(e); gC = true; }
        }
      }
      for(const s of remX){ const back = findOriginal(s); if(back.length){ for(const e of back) modelEntities.push(e); gC = true; } else missingOrig++; }
      if(addX.length || remX.length){ geomDel = new Set(wantX); gC = true; }
      if(gC){
        invalidateSnap(); bbDirty = true;
        editUndoStack.length = 0; redoStack.length = 0; updateUndoRedoBtns();
        try{ selEnts.clear(); if(infoIdx >= 0) hideObjectInfo(); hideSelBar(); }catch(_){}
        _saveGeom();
      }
      if(mC || aC){ selected = null; _saveOverlay(); }
    }finally{ S.applying = false; }
    if(missingOrig) say('Có ' + missingOrig + ' đối tượng gốc được người khác khôi phục — mở lại bản vẽ để thấy.');
    if(mC || aC || gC){ try{ draw(); }catch(_){} }
    return mC || aC || gC;
  }

  function announceRemote(co){
    let maxT = co.seenT, who = new Map();
    for(const it of Object.values(co.doc.items)){
      if(!it || !it.t) continue;
      if(it.t > co.seenT && it.by && it.by !== me()){ who.set(it.by, (who.get(it.by) || 0) + 1); }
      if(it.t > maxT) maxT = it.t;
    }
    const first = co.seenT === 0; co.seenT = maxT;
    if(first || !who.size) return;
    const names = [...who.keys()].map(u => (co.doc.presence[u] && co.doc.presence[u].n) || u.split('@')[0]);
    const n = [...who.values()].reduce((a, b) => a + b, 0);
    say(names.join(', ') + ' vừa cập nhật ' + n + ' mục');
  }

  function othersOnline(){
    const co = S.collab; if(!co || !co.doc) return [];
    const now = Date.now();
    return Object.entries(co.doc.presence || {}).filter(([u, p]) => u !== me() && p && now - p.t < 75000).map(([u, p]) => p.n || u);
  }

  function setStatus(st){ if(S.collab){ S.collab.status = st; } updateChip(); }

  /* ---------------- chia sẻ ---------------- */
  function shareLink(){
    if(!S.file) return '';
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.searchParams.set('gd', S.file.id); if(S.file.collabId) u.searchParams.set('gc', S.file.collabId);
    return u.toString();
  }
  function updateUrl(){
    try{
      const u = new URL(location.href);
      if(S.file){ u.searchParams.set('gd', S.file.id); if(S.file.collabId) u.searchParams.set('gc', S.file.collabId); else u.searchParams.delete('gc'); }
      else { u.searchParams.delete('gd'); u.searchParams.delete('gc'); }
      history.replaceState(null, '', u.toString());
    }catch(_){}
  }
  async function setPublic(on){
    const tok = await getToken(true); if(!tok || !S.file) return;
    const ids = [S.file.id, S.file.collabId].filter(Boolean);
    try{
      for(const id of ids){ if(on) await addPermission(id, { role: 'reader', type: 'anyone' }, false); else await removeAnyone(id); }
      say(on ? 'Ai có link đều xem được bản vẽ (không cần đăng nhập).' : 'Đã tắt xem công khai — chỉ người được mời mới mở được.');
    }catch(e){ say('Không đổi được quyền chia sẻ: ' + (e.message || e) + (e.status === 403 ? ' (tài khoản/tổ chức có thể cấm chia sẻ công khai)' : '')); }
    renderShare();
  }
  async function invite(email, role){
    email = String(email || '').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ say('Email chưa đúng.'); return; }
    const tok = await getToken(true); if(!tok || !S.file) return;
    if(role === 'writer' && !S.file.collabId){ await enableCollab(); if(!S.file.collabId) return; }
    busyMsg('Đang mời ' + email + '…');
    const link = shareLink();
    const msg = myName() + ' mời bạn ' + (role === 'writer' ? 'cùng sửa' : 'xem') + ' bản vẽ "' + S.file.name + '" trên DVDCAD.\nMở tại: ' + link + '\n(Đăng nhập Google bằng email này khi được hỏi.)';
    try{
      await addPermission(S.file.id, { role: 'reader', type: 'user', emailAddress: email }, true, msg);
      if(S.file.collabId) await addPermission(S.file.collabId, { role: role === 'writer' ? 'writer' : 'reader', type: 'user', emailAddress: email }, false);
      clearBusy(); say('Đã gửi lời mời tới ' + email + '.');
    }catch(e){ clearBusy(); say('Không mời được: ' + (e.message || e)); }
  }
  async function copyLink(){
    const l = shareLink(); if(!l) return;
    try{ await navigator.clipboard.writeText(l); say('Đã sao chép link.'); }
    catch(_){ const i = $('dvdShareLink'); if(i){ i.select(); try{ document.execCommand('copy'); say('Đã sao chép link.'); }catch(__){ say('Hãy giữ ngón tay trên ô link để sao chép.'); } } }
  }
  async function sendLink(){
    const l = shareLink(); if(!l) return;
    if(navigator.share){ try{ await navigator.share({ title: S.file.name, text: 'Bản vẽ ' + S.file.name + ' (mở bằng DVDCAD)', url: l }); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
    copyLink();
  }

  /* ---------------- file trên máy (Edge/Chrome máy tính): mở & lưu trực tiếp ---------------- */
  const fsOK = () => ('showOpenFilePicker' in window) && !isMobile();
  async function openLocalFS(){
    try{
      const hs = await window.showOpenFilePicker({ multiple: false, excludeAcceptAllOption: false,
        types: [{ description: 'Bản vẽ CAD (.dwg, .dxf)', accept: { 'application/octet-stream': ['.dwg', '.dxf'] } }] });
      if(!hs || !hs[0]) return;
      try{ closeModal(openOverlay); }catch(_){}
      await openLocalFile(await hs[0].getFile());
    }catch(e){ if(!e || e.name !== 'AbortError') say('Không mở được file: ' + (e && e.message || e)); }
  }
  async function openLocalFile(f){
    const isDwg = /\.dwg$/i.test(f.name);
    S.pendingFile = f;
    if(!isDwg && !/\.dxf$/i.test(f.name)){ say('Chỉ mở được file .dwg hoặc .dxf.'); return; }
    if(isDwg){
      const buf = await f.arrayBuffer(); await loadDWG(buf, f.name);
      if(f.size <= RECENT_MAX_BYTES) recordRecent(drawingKey(new Uint8Array(buf), f.name), f.name, 'dwg', buf);
    }else{
      const txt = await f.text(); loadDXF(txt, f.name);
      if(f.size <= RECENT_MAX_BYTES) recordRecent(drawingKey(txt, f.name), f.name, 'dxf', txt);
    }
  }
  async function saveDxfLocal(forcePick){
    if(!modelEntities || !modelEntities.length){ say('Chưa có bản vẽ.'); return; }
    let dxf; try{ dxf = entitiesToDXF(modelEntities); }catch(e){ say('Không tạo được DXF.'); return; }
    if(!('showSaveFilePicker' in window) || isMobile()){ exportDXF(false); return; }
    try{
      let h = (!forcePick && S.saveHandle) || null;
      if(!h){ h = await window.showSaveFilePicker({ suggestedName: baseName(currentName) + '_DVDCAD.dxf', types: [{ description: 'DXF (AutoCAD)', accept: { 'application/dxf': ['.dxf'] } }] }); S.saveHandle = h; }
      const w = await h.createWritable(); await w.write(dxf); await w.close();
      say('Đã lưu ' + h.name + ' (Ctrl+S lần sau ghi đè file này).');
    }catch(e){ if(!e || e.name !== 'AbortError') say('Không lưu được: ' + (e && e.message || e)); }
  }
  // Ctrl+S
  function save(){
    if(S.collab && !S.collab.readonly){ syncNow(); say('Đang đồng bộ lên Google Drive…'); return; }
    if(!entities || !entities.length){ say('Chưa có bản vẽ.'); return; }
    if(fsOK()) saveDxfLocal(false);
    else say('Đo, ghi chú và hình vẽ đã tự lưu trên máy. Dùng Xuất → DXF để lưu file.');
  }

  /* ---------------- giao diện ---------------- */
  const CSS = `
  .dvd-cloud-btn{position:relative}
  .dvd-cloud-btn .dot{width:8px;height:8px;border-radius:50%;background:var(--ink-faint);display:inline-block}
  .dvd-cloud-btn.on .dot{background:#22c55e;box-shadow:0 0 8px #22c55e}
  .dvd-cloud-btn.warn .dot{background:var(--measure)}
  @media (max-width:520px){ .dvd-cloud-btn .lbl{display:none} }
  #dvdChip{position:absolute;left:12px;top:62px;z-index:7;display:none;align-items:center;gap:7px;max-width:62%;
    background:rgba(17,21,29,.92);border:1px solid var(--line);border-radius:999px;padding:6px 11px;font-size:11.5px;font-weight:600;
    color:var(--ink-dim);box-shadow:var(--shadow);backdrop-filter:blur(8px);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #dvdChip.show{display:flex}
  #dvdChip .d{width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:#22c55e}
  #dvdChip.sync .d{background:var(--accent);animation:dvdpulse 1s infinite}
  #dvdChip.offline .d,#dvdChip.error .d{background:var(--note)}
  #dvdChip.readonly .d,#dvdChip.auth .d{background:var(--measure)}
  @keyframes dvdpulse{50%{opacity:.3}}
  .dvd-row{display:flex;align-items:center;gap:10px;background:var(--panel-2);border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin-bottom:8px;font-size:13px}
  .dvd-row .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
  .dvd-row small{display:block;color:var(--ink-faint);font-size:11px;margin-top:2px}
  .dvd-mini{font-family:inherit;font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer;white-space:nowrap}
  .dvd-mini.pri{background:linear-gradient(135deg,var(--accent),#0ea5b7);color:#06131a;border-color:transparent}
  .dvd-sec{font-size:11.5px;color:var(--ink-faint);margin:14px 2px 8px;font-weight:700;letter-spacing:.6px}
  .dvd-note{font-size:12px;color:var(--ink-dim);line-height:1.55;margin:4px 2px 10px}
  .dvd-field{display:block;font-size:12px;color:var(--ink-dim);margin:10px 0 5px;font-weight:600}
  .modal select.dvd-sel{font-family:inherit;font-size:14px;color:var(--ink);background:var(--bg-canvas);border:1px solid var(--line);border-radius:10px;padding:11px 10px}
  .dvd-people{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px}
  .dvd-people span{font-size:11.5px;background:rgba(56,189,248,.12);color:var(--accent);border:1px solid rgba(56,189,248,.35);border-radius:999px;padding:4px 9px}
  `;
  function injectCSS(){ const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

  function makeOverlay(id){
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = id;
    ov.innerHTML = '<div class="modal"></div>';
    ov.addEventListener('click', e => { if(e.target === ov) closeModal(ov); });
    document.body.appendChild(ov); return ov;
  }
  let cloudOv, shareOv, cfgOv, promptOv;
  function closeSheet(){ if(cloudOv) closeModal(cloudOv); }

  function buildTopButton(){
    const open = $('openBtn'); if(!open) return;
    const b = document.createElement('button'); b.className = 'top-btn dvd-cloud-btn'; b.id = 'dvdCloudBtn'; b.title = 'Google Drive · chia sẻ · cộng tác';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/></svg><span class="lbl">Drive</span><span class="dot"></span>';
    b.addEventListener('click', openSheet);
    open.parentNode.insertBefore(b, open);
    const chip = document.createElement('div'); chip.id = 'dvdChip'; chip.innerHTML = '<span class="d"></span><span class="t"></span>';
    chip.addEventListener('click', async () => {
      const co = S.collab;
      if(co && (co.status === 'auth')){ const t = await getToken(true); if(t){ co.checkedCaps = false; co.needAuth = false; co.needGrant = false; await maybeGrantCollab(); syncNow(); } return; }
      openSheet();
    });
    const stage = document.querySelector('.stage'); if(stage) stage.appendChild(chip);
  }
  async function maybeGrantCollab(){
    const co = S.collab; if(!co || !tokenValid()) return;
    try{ await getMeta(co.id, 'id', 'token'); }
    catch(e){ if(e.status === 404 || e.status === 403){ const ok = await grantAccess([S.file && S.file.id, co.id].filter(Boolean)); if(ok){ co.checkedCaps = false; co.needGrant = false; } } }
  }

  function addOpenSheetItem(){
    const pickBtn = $('openPick'); if(!pickBtn) return;
    const item = document.createElement('button'); item.className = 'sheet-item'; item.id = 'openDrive';
    item.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/></svg><span style="flex:1;text-align:left">Mở từ Google Drive</span>';
    item.addEventListener('click', () => { if(!cfgOk()){ closeModal(openOverlay); openSettings(); return; } openFromDrive(); });
    pickBtn.parentNode.insertBefore(item, pickBtn.nextSibling);
    // Máy tính (Edge/Chrome): mở bằng hộp thoại hệ thống — giữ được tên & quyền lưu file
    pickBtn.addEventListener('click', e => { if(fsOK()){ e.stopImmediatePropagation(); e.preventDefault(); openLocalFS(); } }, true);
    ['openBtn', 'openBtn2'].forEach(id => { const b = $(id); if(b) b.addEventListener('click', preload); });
  }

  function openSheet(){
    if(!cloudOv) cloudOv = makeOverlay('dvdCloudOverlay');
    renderSheet(); openModal(cloudOv); preload();
  }
  function renderSheet(){
    if(!cloudOv) return;
    const m = cloudOv.querySelector('.modal');
    const signed = tokenValid();
    const co = S.collab;
    let h = '<h3>Google Drive · chia sẻ · cộng tác</h3>';
    if(!cfgOk()){
      h += '<p>Chưa cấu hình kết nối Google. Cần Client ID và API key (miễn phí) — xem HUONG-DAN-GOOGLE-DRIVE.md trong repo.</p>';
      h += '<button class="sheet-item" data-act="settings">⚙ Cài đặt Google…</button>';
      h += '<div class="modal-actions"><button class="btn-ghost" data-act="close">Đóng</button></div>';
      m.innerHTML = h; bindActs(m); return;
    }
    h += '<div class="dvd-row"><div class="grow">' + (signed ? ('Đã đăng nhập<small>' + esc(myName()) + (S.user && S.user.email && S.user.name ? ' · ' + esc(S.user.email) : '') + '</small>')
         : ('Chưa đăng nhập<small>' + (S.user ? 'Lần trước: ' + esc(S.user.email) : 'Cần để mở/lưu Drive, chia sẻ, cùng sửa') + '</small>')) + '</div>' +
         (signed ? '<button class="dvd-mini" data-act="signout">Đăng xuất</button>' : '<button class="dvd-mini pri" data-act="signin">Đăng nhập Google</button>') + '</div>';
    if(isIOSStandalone() && !signed) h += '<div class="dvd-note">Trên iPhone, nếu đăng nhập xong không quay lại được app, hãy mở DVDCAD bằng Safari để dùng Drive.</div>';
    h += '<button class="sheet-item" data-act="open">📂 Mở bản vẽ từ Google Drive</button>';
    if(entities && entities.length){
      h += '<div class="dvd-sec">BẢN VẼ ĐANG MỞ</div>';
      if(S.file){
        h += '<div class="dvd-row"><div class="grow">☁ ' + esc(S.file.name) + '<small>Trên Google Drive' + (S.file.viaKey ? ' · đang xem bằng link công khai' : '') + '</small></div></div>';
        h += '<button class="sheet-item" data-act="share">🔗 Chia sẻ link / mời người khác…</button>';
      }else{
        h += '<button class="sheet-item" data-act="upload">⬆ Lưu bản vẽ này lên Drive (để chia sẻ, cùng sửa)</button>';
      }
      h += '<button class="sheet-item" data-act="savedxf">💾 Lưu bản DXF đã sửa lên Drive</button>';
      if(fsOK()) h += '<button class="sheet-item" data-act="savelocal">🖫 Lưu DXF vào máy… (Ctrl+Shift+S)</button>';
      h += '<div class="dvd-sec">CỘNG TÁC</div>';
      if(co){
        const others = othersOnline();
        h += '<div class="dvd-row"><div class="grow">' + statusText(co) + '<small>Ghi chú, phép đo và hình vẽ thêm được đồng bộ ~' + (POLL_MS / 1000) + ' giây/lần</small>' +
             (others.length ? '<div class="dvd-people">' + others.map(n => '<span>● ' + esc(n) + '</span>').join('') + '</div>' : '') + '</div>' +
             '<button class="dvd-mini" data-act="sync">Đồng bộ</button></div>';
        if(co.status === 'auth') h += '<button class="sheet-item" data-act="reauth">🔑 Đăng nhập để cùng sửa</button>';
        h += '<button class="sheet-item" data-act="stopcollab">⏸ Tạm dừng đồng bộ trên máy này</button>';
      }else if(S.file){
        h += '<div class="dvd-note">Bật để mọi người được chia sẻ cùng thấy và cùng thêm ghi chú, phép đo, hình vẽ. Dữ liệu lưu trong một file .dvdcad.json cạnh bản vẽ trên Drive của bạn.</div>';
        h += '<button class="sheet-item" data-act="collab">👥 Bật cộng tác cho bản vẽ này</button>';
      }else{
        h += '<div class="dvd-note">Lưu bản vẽ lên Drive trước để bật cộng tác.</div>';
      }
    }
    h += '<button class="sheet-item" data-act="settings" style="margin-top:6px">⚙ Cài đặt Google…</button>';
    h += '<div class="modal-actions"><button class="btn-ghost" data-act="close">Đóng</button></div>';
    m.innerHTML = h; bindActs(m);
  }
  function statusText(co){
    const n = othersOnline().length;
    switch(co.status){
      case 'sync': return 'Đang đồng bộ…';
      case 'ok': return 'Đã đồng bộ' + (n ? ' · ' + n + ' người khác đang mở' : '');
      case 'offline': return 'Ngoại tuyến — sẽ đồng bộ khi có mạng';
      case 'readonly': return 'Chỉ xem (không có quyền sửa)';
      case 'auth': return 'Chỉ xem — đăng nhập để cùng sửa';
      case 'error': return 'Lỗi đồng bộ: ' + esc(co.err || '');
      default: return '';
    }
  }
  function bindActs(m){
    m.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.act;
      if(a === 'close'){ closeSheet(); return; }
      if(a === 'signin'){ const t = await getToken(true); if(t && S.collab){ S.collab.checkedCaps = false; await maybeGrantCollab(); syncNow(); } renderSheet(); return; }
      if(a === 'reauth'){ const t = await getToken(true); if(t && S.collab){ S.collab.checkedCaps = false; S.collab.needAuth = false; await maybeGrantCollab(); syncNow(); } renderSheet(); return; }
      if(a === 'signout'){ signOut(); renderSheet(); return; }
      if(a === 'open'){ openFromDrive(); return; }
      if(a === 'upload'){ uploadCurrentToDrive(); return; }
      if(a === 'savedxf'){ saveDxfToDrive(); return; }
      if(a === 'savelocal'){ closeSheet(); saveDxfLocal(true); return; }
      if(a === 'share'){ closeSheet(); openShare(); return; }
      if(a === 'collab'){ closeSheet(); enableCollab(); return; }
      if(a === 'stopcollab'){ stopCollab(); say('Đã tạm dừng đồng bộ trên máy này.'); renderSheet(); return; }
      if(a === 'sync'){ syncNow(); setTimeout(renderSheet, 1500); return; }
      if(a === 'settings'){ closeSheet(); openSettings(); return; }
    }));
  }

  async function openShare(){
    if(!S.file){ say('Lưu bản vẽ lên Google Drive trước.'); return; }
    if(!shareOv) shareOv = makeOverlay('dvdShareOverlay');
    renderShare(); openModal(shareOv);
  }
  async function renderShare(){
    if(!shareOv || !S.file) return;
    const m = shareOv.querySelector('.modal');
    const link = shareLink();
    let h = '<h3>Chia sẻ "' + esc(S.file.name) + '"</h3>';
    h += '<p>Người nhận mở link bằng trình duyệt hoặc app DVDCAD, không cần cài thêm gì.</p>';
    h += '<input id="dvdShareLink" readonly value="' + esc(link) + '">';
    h += '<div class="modal-actions" style="margin-top:10px"><button class="btn-ghost" data-s="copy">Sao chép link</button><button class="btn-solid" data-s="send">Gửi…</button></div>';
    h += '<div class="dvd-sec">AI ĐƯỢC XEM</div>';
    h += '<div class="dvd-row"><div class="grow">Ai có link đều xem được<small id="dvdPubState">Đang kiểm tra…</small></div><button class="dvd-mini" data-s="pub" id="dvdPubBtn" disabled>…</button></div>';
    h += '<div class="dvd-sec">MỜI NGƯỜI CÙNG SỬA / XEM</div>';
    h += '<input id="dvdInvEmail" type="email" inputmode="email" autocomplete="off" placeholder="email@gmail.com">';
    h += '<div style="display:flex;gap:8px;margin-top:8px"><select id="dvdInvRole" class="dvd-sel" style="flex:1"><option value="writer">Cùng sửa (ghi chú, đo, vẽ)</option><option value="reader">Chỉ xem</option></select><button class="dvd-mini pri" data-s="invite">Mời</button></div>';
    h += '<div class="dvd-note" style="margin-top:10px">Người được mời nhận email từ Google kèm link. Họ cần đăng nhập Google bằng đúng email đó trong DVDCAD để cùng sửa. ' +
         (S.file.collabId ? '' : 'Mời "Cùng sửa" sẽ tự bật cộng tác cho bản vẽ.') + '</div>';
    h += '<div class="modal-actions"><button class="btn-ghost" data-s="close">Đóng</button></div>';
    m.innerHTML = h;
    m.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.s;
      if(a === 'close') closeModal(shareOv);
      else if(a === 'copy') copyLink();
      else if(a === 'send') sendLink();
      else if(a === 'pub'){ b.disabled = true; await setPublic(b.dataset.on !== '1'); }
      else if(a === 'invite') invite($('dvdInvEmail').value, $('dvdInvRole').value);
    }));
    if(tokenValid() && S.file.canShare !== false){
      const pub = await isPublic(S.file.id);
      const st = $('dvdPubState'), pb = $('dvdPubBtn'); if(!st || !pb) return;
      if(pub === null){ st.textContent = 'Không kiểm tra được (cần quyền chủ sở hữu)'; pb.textContent = 'Bật'; pb.dataset.on = '0'; pb.disabled = false; }
      else { st.textContent = pub ? 'Đang BẬT — mở link là xem được, không cần đăng nhập' : 'Đang TẮT — chỉ người được mời'; pb.textContent = pub ? 'Tắt' : 'Bật'; pb.dataset.on = pub ? '1' : '0'; pb.disabled = false; }
    }else{
      const st = $('dvdPubState'); if(st) st.textContent = tokenValid() ? 'Bạn không có quyền đổi chia sẻ của file này' : 'Đăng nhập Google để đổi quyền';
      const pb = $('dvdPubBtn'); if(pb && !tokenValid()){ pb.textContent = 'Đăng nhập'; pb.disabled = false; pb.onclick = async ev => { ev.stopImmediatePropagation(); if(await getToken(true)) renderShare(); }; }
    }
  }

  function openSettings(){
    if(!cfgOv) cfgOv = makeOverlay('dvdCfgOverlay');
    const m = cfgOv.querySelector('.modal');
    m.innerHTML = '<h3>Cài đặt Google Drive</h3>' +
      '<p>Lấy 3 giá trị này trong Google Cloud Console (làm 1 lần, miễn phí). Xem HUONG-DAN-GOOGLE-DRIVE.md.</p>' +
      '<label class="dvd-field">OAuth Client ID</label><input id="dvdCfgClient" autocomplete="off" placeholder="....apps.googleusercontent.com" value="' + esc(CFG.clientId) + '">' +
      '<label class="dvd-field">API key</label><input id="dvdCfgKey" autocomplete="off" placeholder="AIzaSy..." value="' + esc(CFG.apiKey) + '">' +
      '<label class="dvd-field">Project number (App ID)</label><input id="dvdCfgApp" inputmode="numeric" autocomplete="off" placeholder="123456789012" value="' + esc(CFG.appId) + '">' +
      '<div class="dvd-note" style="margin-top:10px">Giá trị nhập ở đây chỉ lưu trên máy này. Để link chia sẻ chạy cho mọi người, bấm "Sao chép dvd-config.js" rồi dán đè vào file dvd-config.js trên GitHub.</div>' +
      '<div class="modal-actions"><button class="btn-ghost" data-c="copy">Sao chép dvd-config.js</button><button class="btn-solid" data-c="save">Lưu</button></div>' +
      '<div class="modal-actions" style="margin-top:8px"><button class="btn-ghost" data-c="clear">Xoá cài đặt trên máy</button><button class="btn-ghost" data-c="close">Đóng</button></div>';
    m.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.c;
      const vals = { clientId: $('dvdCfgClient').value.trim(), apiKey: $('dvdCfgKey').value.trim(), appId: $('dvdCfgApp').value.trim() };
      if(a === 'close'){ closeModal(cfgOv); return; }
      if(a === 'clear'){ localStorage.removeItem('dvd:gcfg'); CFG = readCfg(); S.tokenClient = null; say('Đã xoá cài đặt trên máy.'); closeModal(cfgOv); updateUI(); return; }
      if(a === 'save'){
        if(vals.clientId && !/\.apps\.googleusercontent\.com$/.test(vals.clientId)){ say('Client ID phải kết thúc bằng .apps.googleusercontent.com'); return; }
        if(vals.appId && !/^\d+$/.test(vals.appId)){ say('Project number chỉ gồm chữ số.'); return; }
        localStorage.setItem('dvd:gcfg', JSON.stringify(vals)); CFG = readCfg(); S.tokenClient = null; S.gisReady = S.gisReady || null;
        say('Đã lưu cài đặt Google.'); closeModal(cfgOv); updateUI(); preload(); return;
      }
      if(a === 'copy'){
        const txt = '/* DVDCAD — cấu hình kết nối Google Drive */\nwindow.DVD_GOOGLE = {\n  clientId: ' + JSON.stringify(vals.clientId) + ',\n  apiKey:   ' + JSON.stringify(vals.apiKey) + ',\n  appId:    ' + JSON.stringify(vals.appId) + '\n};\n';
        try{ await navigator.clipboard.writeText(txt); say('Đã sao chép nội dung dvd-config.js.'); }catch(_){ try{ shareOrDownload(new Blob([txt], { type: 'text/javascript' }), 'dvd-config.js', 'text/javascript'); }catch(__){} }
      }
    }));
    openModal(cfgOv);
  }

  function openPrompt(o){
    if(!promptOv) promptOv = makeOverlay('dvdPromptOverlay');
    const m = promptOv.querySelector('.modal');
    m.innerHTML = '<h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p><div class="modal-actions"><button class="btn-ghost" data-p="no">Để sau</button><button class="btn-solid" data-p="ok">' + esc(o.ok || 'OK') + '</button></div>';
    m.querySelector('[data-p="no"]').onclick = () => closeModal(promptOv);
    m.querySelector('[data-p="ok"]').onclick = () => { closeModal(promptOv); o.onOk && o.onOk(); };
    openModal(promptOv); preload();
  }

  function updateChip(){
    const chip = $('dvdChip'); if(!chip) return;
    const co = S.collab;
    if(!co){ chip.classList.remove('show'); return; }
    chip.className = 'show ' + (co.status || '');
    const others = othersOnline();
    let t = statusText(co).replace(/<[^>]+>/g, '');
    if(co.status === 'ok') t = 'Đồng bộ' + (others.length ? ' · ' + others.length + ' người' : '');
    chip.querySelector('.t').textContent = t;
    chip.title = others.length ? 'Đang mở: ' + others.join(', ') : statusText(co).replace(/<[^>]+>/g, '');
    if(cloudOv && cloudOv.classList.contains('show') && co.status !== 'sync') renderSheet();
  }
  function updateUI(){
    const b = $('dvdCloudBtn');
    if(b){
      b.style.display = '';
      b.classList.toggle('on', !!(S.collab && S.collab.status === 'ok') || (!!S.file && tokenValid()));
      b.classList.toggle('warn', !!(S.collab && (S.collab.status === 'auth' || S.collab.status === 'error' || S.collab.status === 'offline')));
    }
    updateChip();
  }

  /* ---------------- móc vào app ---------------- */
  const _saveOverlay = window.saveOverlay, _saveGeom = window.saveGeomEdits;
  window.saveOverlay = function(){ const r = _saveOverlay.apply(this, arguments); if(!S.applying) noteLocalChange(); return r; };
  window.saveGeomEdits = function(){ const r = _saveGeom.apply(this, arguments); if(!S.applying) noteLocalChange(); return r; };
  const _applyGeom = window.applyGeomEdits;
  window.applyGeomEdits = function(){
    S.stash = new Map();
    try{
      const ed = loadGeomEdits(); const del = new Set(ed.del || []);
      if(del.size) for(const e of modelEntities){ if(e && !e.userAdded){ const s = entSig(e); if(del.has(s)){ if(!S.stash.has(s)) S.stash.set(s, []); S.stash.get(s).push(e); } } }
    }catch(_){}
    return _applyGeom.apply(this, arguments);
  };
  function beforeLoad(data, type, name){
    if(!S.opening){ stopCollab(); S.file = null; updateUrl(); }
    S.saveHandle = null;
    // ưu tiên giữ chính File gốc (đúng từng byte, không tốn RAM) — DXF đọc dạng chữ có thể đã đổi ký tự lạ
    const pf = S.pendingFile; S.pendingFile = null;
    if(pf && pf.name === name){ S.lastRaw = { file: pf, type, name }; return; }
    const size = type === 'dwg' ? (data && data.byteLength) || 0 : (data ? data.length : 0);
    S.lastRaw = (size && size <= RAW_KEEP_MAX) ? { data, type, name } : null;
  }
  const _loadDXF = window.loadDXF, _loadDWG = window.loadDWG, _openRecent = window.openRecent;
  window.loadDXF = function(text, name){ beforeLoad(text, 'dxf', name); const r = _loadDXF.apply(this, arguments); updateUI(); return r; };
  window.loadDWG = async function(buf, name){ beforeLoad(buf, 'dwg', name); const r = await _loadDWG.apply(this, arguments); updateUI(); return r; };
  window.openRecent = async function(f){
    if(f && f.gd){
      S.opening = true;
      try{ stopCollab(); S.file = { id: f.gd, name: f.name, ext: f.type, canEdit: false, canShare: false, parents: [], collabId: f.gc || null, dxfCopyId: null }; await _openRecent.apply(this, arguments); }
      finally{ S.opening = false; }
      updateUrl();
      if(navigator.onLine && cfgOk()){
        try{ const meta = await getMeta(f.gd, null, tokenValid() ? 'token' : 'key'); const ap = meta.appProperties || {};
          Object.assign(S.file, { canEdit: !!(meta.capabilities && meta.capabilities.canEdit) && tokenValid(), canShare: !!(meta.capabilities && meta.capabilities.canShare) && tokenValid(), parents: meta.parents || [], collabId: S.file.collabId || ap.dvdcadCollab || null, dxfCopyId: ap.dvdcadDxf || null }); }catch(_){}
      }
      if(S.file && S.file.collabId) startCollab(S.file.collabId);
      updateUI(); return;
    }
    return _openRecent.apply(this, arguments);
  };

  /* ---------------- khởi động ---------------- */
  injectCSS(); buildTopButton(); addOpenSheetItem(); updateUI();
  { const fi = $('fileInput'); if(fi) fi.addEventListener('change', e => { S.pendingFile = (e.target.files && e.target.files[0]) || null; }, true); }
  if(tokenValid() && !S.user) fetchUser().then(updateUI);
  window.addEventListener('online', () => { if(S.collab) syncNow(); updateUI(); });
  window.addEventListener('offline', () => { if(S.collab) setStatus('offline'); });
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && S.collab) syncNow(); });
  // Mở bằng double-click file .dwg/.dxf trên Windows (PWA đã cài, Edge/Chrome)
  if('launchQueue' in window){
    window.launchQueue.setConsumer(async params => {
      if(!params || !params.files || !params.files.length) return;
      try{ const f = await params.files[0].getFile(); await openLocalFile(f); }catch(e){ say('Không mở được file: ' + (e.message || e)); }
    });
  }
  // Mở từ link chia sẻ ?gd=...&gc=...
  (function(){
    let p; try{ p = new URLSearchParams(location.search); }catch(_){ return; }
    const gd = p.get('gd'); if(!gd) return;
    if(!cfgOk()){ say('Link Google Drive cần cấu hình Google (dvd-config.js) trên trang này.'); return; }
    preload();
    setTimeout(() => openDriveFile(gd, { collabId: p.get('gc'), silent: true }), 50);
  })();
  if(S.user && cfgOk()) setTimeout(preload, 3000);

  window.DVDCloud = { state: S, openSheet, openFromDrive, openDriveFile, uploadCurrentToDrive, saveDxfToDrive, saveDxfLocal, save, share: openShare,
                      enableCollab, stopCollab, syncNow, signIn: () => getToken(true), signOut, openSettings, openLocalFS, openLocalFile, cfgOk, fsOK };
})();
