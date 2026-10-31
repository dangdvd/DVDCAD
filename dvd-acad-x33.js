/* DVDCAD v6l — OLE, PSFILL, WMFCLIP và các lệnh tiện ích còn thiếu so với AutoCAD
   · INSERTOBJ (đối tượng OLE: nhúng / liên kết tệp, tạo mới ghi chú / bảng), OLESCALE, OLELINKS (cập nhật, mở, đổi nguồn, ngắt liên kết)
   · WMFCLIP (chép đối tượng chọn vào bộ nhớ tạm dạng hình), PSFILL (tô đa tuyến kín bằng mẫu tô PostScript)
   · REGENAUTO (REGENMODE), HATCHGAPTOL (HPGAPTOL — dò biên hatch bỏ qua khe hở), FILEOPEN, WHOHAS (.dwl / .dwl2), TASKBAR, TRAYSETTINGS, TOOLPALETTESCLOSE,
     TABLET, SIGVALIDATE, CONVERT, CONVERTPSTYLES, ADCNAVIGATE, AUTOPUBLISH, VIEWPLOTDETAILS, ACTIVITYINSIGHTS, MYINSIGHTS, XREFCOMPARE, SMARTBLOCKSREPLACE,
     DWGHISTORY + SNAPSHOT (lịch sử phiên bản bản vẽ) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x33 || !window.DVDCmd) return; A._x33 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const noKey = root => { try{ (root.root || root).querySelectorAll('input,select,textarea').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation())); }catch(_){} };
  const docName = () => String((typeof currentName === 'string' && currentName) || 'banve');
  const docBase = () => docName().replace(/\.[^.]+$/, '');
  const drawMM = () => { try{ return (typeof unitToMM === 'function' && unitToMM()) || 1; }catch(_){ return 1; } };
  const pickFile = (accept, multiple) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; if(accept) i.accept = accept; if(multiple) i.multiple = true; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(multiple ? [...(i.files || [])] : (i.files && i.files[0] || null)); i.remove(); }; i.click(); });
  const DESK = () => window.dvdDesktop && window.dvdDesktop.isDesktop ? window.dvdDesktop : null;
  const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
  const now = () => new Date().toLocaleString('vi-VN');
  const user = () => { try{ return localStorage.getItem('dvd:user') || (navigator.userAgent.includes('Windows') ? 'Windows' : 'DVDCAD'); }catch(_){ return 'DVDCAD'; } };
  // IndexedDB riêng: dữ liệu OLE + lịch sử bản vẽ
  let _db = null;
  const db = () => _db || (_db = new Promise((res, rej) => { const r = indexedDB.open('dvdcad-x33', 1); r.onupgradeneeded = () => { r.result.createObjectStore('ole'); r.result.createObjectStore('hist'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const idb = async (st, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(st, mode); const s = t.objectStore(st); let out; const q = fn(s); if(q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };
  const iPut = (st, k, v) => idb(st, 'readwrite', s => s.put(v, k)), iGet = (st, k) => idb(st, 'readonly', s => s.get(k)), iDel = (st, k) => idb(st, 'readwrite', s => s.delete(k));
  const iKeys = st => idb(st, 'readonly', s => s.getAllKeys());

  /* ===================================================================== OLE ===================================================================== */
  const OLEMEM = new Map();   // oid → { blob, name, mime }
  const isImg = (name, mime) => /^image\//.test(mime || '') || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(name || '');
  const isTxt = (name, mime) => /^text\//.test(mime || '') || /\.(txt|csv|tsv|json|md|xml|lsp|scr|ini|log|pgp|html?)$/i.test(name || '');
  async function oleStore(oid, blob, name, mime){ OLEMEM.set(oid, { blob, name, mime }); try{ await iPut('ole', oid, { blob, name, mime }); }catch(_){} }
  async function oleData(oid){ if(OLEMEM.has(oid)) return OLEMEM.get(oid); try{ const r = await iGet('ole', oid); if(r){ OLEMEM.set(oid, r); return r; } }catch(_){} return null; }
  const csvRows = t => { const sep = (t.split('\n')[0].match(/\t/g) || []).length > (t.split('\n')[0].match(/;/g) || []).length ? '\t' : (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ','; return t.replace(/\r/g, '').split('\n').filter(l => l.trim()).slice(0, 60).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, ''))); };
  // ảnh xem trước của đối tượng OLE (như AutoCAD hiện nội dung do chương trình nguồn vẽ)
  async function olePreview(o){ const { blob, name, mime, text, kind, icon } = o;
    if(!icon && blob && isImg(name, mime)) return blob;
    const cv = document.createElement('canvas'), g = cv.getContext('2d'); const font = '13px "Segoe UI", Arial, sans-serif';
    const fin = () => new Promise(r => cv.toBlob(r, 'image/png'));
    if(!icon && blob && /\.pdf$/i.test(name || '') && A.loadPdfJs){ try{ const L = await A.loadPdfJs(); const doc = await L.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; const pg = await doc.getPage(1); const vp = pg.getViewport({ scale: 1.5 }); cv.width = vp.width; cv.height = vp.height; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: g, viewport: vp }).promise; return fin(); }catch(_){} }
    let T = text; if(T == null && !icon && blob && isTxt(name, mime)) T = await blob.text();
    if(!icon && T != null){ const table = kind === 'table' || /\.(csv|tsv)$/i.test(name || '');
      if(table){ const R = csvRows(T); const nc = Math.max(1, ...R.map(r => r.length)); g.font = font; const cw = []; for(let c = 0; c < nc; c++) cw.push(Math.min(260, Math.max(40, ...R.map(r => g.measureText(r[c] || '').width + 14)))); const rh = 22;
        cv.width = Math.max(60, cw.reduce((a, b) => a + b, 0) + 2); cv.height = R.length * rh + 2; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.font = font; g.textBaseline = 'middle';
        let y = 1; R.forEach((r, i) => { let x = 1; if(i === 0){ g.fillStyle = '#e8eef6'; g.fillRect(1, y, cv.width - 2, rh); } for(let c = 0; c < nc; c++){ g.strokeStyle = '#8a96a6'; g.strokeRect(x + 0.5, y + 0.5, cw[c], rh); g.fillStyle = '#111'; g.font = (i === 0 ? 'bold ' : '') + font; g.fillText(String(r[c] || '').slice(0, 40), x + 6, y + rh / 2); x += cw[c]; } y += rh; }); return fin(); }
      const lines = String(T).replace(/\r/g, '').split('\n').slice(0, 50).map(l => l.slice(0, 110)); g.font = font; const w = Math.min(900, Math.max(120, ...lines.map(l => g.measureText(l).width))) + 24;
      cv.width = w; cv.height = lines.length * 18 + 20; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = '#b8c2cf'; g.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1); g.fillStyle = '#111'; g.font = font; g.textBaseline = 'top'; lines.forEach((l, i) => g.fillText(l, 12, 10 + i * 18)); return fin(); }
    // biểu tượng: khung tệp + đuôi + tên + cỡ
    const ext = (/\.([^.]+)$/.exec(name || '') || [, '?'])[1].toUpperCase().slice(0, 5); cv.width = 220; cv.height = 150; g.fillStyle = '#fff'; g.fillRect(0, 0, 220, 150);
    g.fillStyle = '#e9eef5'; g.strokeStyle = '#6b7a8c'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 12); g.lineTo(126, 12); g.lineTo(142, 28); g.lineTo(142, 92); g.lineTo(80, 92); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2f6fb3'; g.fillRect(70, 52, 82, 24); g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ext, 111, 64);
    g.fillStyle = '#111'; g.font = font; g.fillText(String(name || '').slice(0, 30), 110, 112); g.fillStyle = '#556'; g.fillText(blob ? fmtSize(blob.size) : '', 110, 132); return fin(); }
  const isOLE = e => !!e && e.type === 'IMAGE' && !!e.ole;
  A.isOLE = isOLE;
  async function placeOLE(o, at){ const pv = await olePreview(o); const im = await A.imgAdd(pv, (o.name || 'ole') + '.png'); const el = im.el; const wpx = (el && el.naturalWidth) || 200, hpx = (el && el.naturalHeight) || 150;
    const k = 25.4 / 96 / drawMM(); const w = wpx * k, h = hpx * k; let p = at;
    if(!p){ const r = await A.getPoint('Chỉ định điểm chèn (góc trên trái)', { rubber: false }); if(!r.pt) return null; p = r.pt; }
    const oid = o.oid || ('O' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)); if(o.blob) await oleStore(oid, o.blob, o.name, o.mime);
    const e = A.newProps({ type: 'IMAGE', x: p.x, y: p.y - h, w, h, rot: 0, img: im.id, name: (o.name || 'OLE') + '.png', op: 1, frame: false }); delete e.lt;
    e.ole = { oid, name: o.name || '', mime: o.mime || '', size: o.blob ? o.blob.size : (o.text || '').length, link: !!o.link, path: o.path || '', kind: o.kind || 'file', icon: !!o.icon, w0: w, h0: h, upd: 'A', t: Date.now() }; if(o.text != null) e.ole.text = o.text;
    return e; }
  A.olePlace = placeOLE;
  // đổi nội dung (cập nhật liên kết / sửa ghi chú): ảnh mới, giữ góc trên trái + tỉ lệ đang dùng
  async function oleRefresh(e, o){ const pv = await olePreview(Object.assign({ name: e.ole.name, mime: e.ole.mime, kind: e.ole.kind, icon: e.ole.icon }, o)); const im = await A.imgAdd(pv, (e.ole.name || 'ole') + '.png');
    const wpx = (im.el && im.el.naturalWidth) || 200, hpx = (im.el && im.el.naturalHeight) || 150; const k = 25.4 / 96 / drawMM(); const sx = e.w / (e.ole.w0 || e.w), sy = e.h / (e.ole.h0 || e.h);
    const w = copy(e); const top = { x: e.x - Math.sin((e.rot || 0) * Math.PI / 180) * e.h, y: e.y + Math.cos((e.rot || 0) * Math.PI / 180) * e.h };
    w.img = im.id; w.ole.w0 = wpx * k; w.ole.h0 = hpx * k; w.w = w.ole.w0 * sx; w.h = w.ole.h0 * sy; w.x = top.x + Math.sin((e.rot || 0) * Math.PI / 180) * w.h; w.y = top.y - Math.cos((e.rot || 0) * Math.PI / 180) * w.h; w.ole.t = Date.now();
    if(o.blob){ await oleStore(e.ole.oid, o.blob, e.ole.name, e.ole.mime); w.ole.size = o.blob.size; } if(o.text != null){ w.ole.text = o.text; w.ole.size = o.text.length; } return w; }
  async function readLinked(e){ const D = DESK(); if(D && e.ole.path){ try{ const r = await D.readFile(e.ole.path); return new Blob([r.data], { type: e.ole.mime || '' }); }catch(_){} } return null; }
  async function pickSource(prev){ const D = DESK(); if(D){ const r = await D.openDialog({ title: 'Chọn tệp nguồn' + (prev ? ' (' + prev + ')' : ''), types: [] }); if(!r || !r[0]) return null; const f = await D.readFile(r[0].path); return { blob: new Blob([f.data]), name: r[0].name, path: r[0].path }; }
    const f = await pickFile(''); return f ? { blob: f, name: f.name, mime: f.type, path: f.name } : null; }

  cmd(['INSERTOBJ', 'IO'], 'Chèn đối tượng OLE: nhúng / liên kết tệp (ảnh, PDF trang 1, văn bản, CSV → bảng, tệp khác → biểu tượng) hoặc tạo mới ghi chú / bảng', async () => {
    const r = await new Promise(res => { const d = A.dialog({ title: 'Chèn đối tượng (INSERTOBJ)', help: 'INSERTOBJ', html: '<div class="acw" style="width:440px">' +
        '<label style="display:block;margin:2px 0"><input type="radio" name="ioM" value="new"> Tạo mới</label><div style="margin-left:22px"><select id="ioT"><option value="text">Ghi chú văn bản</option><option value="table">Bảng (CSV — dấu phẩy / Tab)</option></select><br><textarea id="ioX" rows="6" style="width:390px;margin-top:4px" placeholder="Nội dung…"></textarea></div>' +
        '<label style="display:block;margin:6px 0 2px"><input type="radio" name="ioM" value="file" checked> Tạo từ tệp</label><div style="margin-left:22px"><label><input type="checkbox" id="ioL"> Liên kết (cập nhật theo tệp gốc — OLELINKS)</label><br><label><input type="checkbox" id="ioI"> Hiện dạng biểu tượng</label></div></div>',
      ok: root => { const m = root.querySelector('input[name=ioM]:checked').value; res({ m, t: root.querySelector('#ioT').value, x: root.querySelector('#ioX').value, link: root.querySelector('#ioL').checked, icon: root.querySelector('#ioI').checked }); }, cancel: () => res(null) }); noKey(d); });
    if(!r) return; let o;
    if(r.m === 'new'){ if(!r.x.trim()){ log('INSERTOBJ: nội dung trống.'); return; } o = { text: r.x, kind: r.t, name: r.t === 'table' ? 'Bang.csv' : 'GhiChu.txt', mime: r.t === 'table' ? 'text/csv' : 'text/plain' }; }
    else { const s = await pickSource(); if(!s) return; o = { blob: s.blob, name: s.name, mime: s.mime || s.blob.type || '', link: r.link, path: s.path, icon: r.icon, kind: 'file' }; }
    const e = await placeOLE(o); if(!e) return; A.commit({ add: [e] }, 'INSERTOBJ: ' + (o.name || 'OLE') + (o.link ? ' (liên kết)' : ' (nhúng)') + ' — ' + (+e.w.toFixed(2)) + ' × ' + (+e.h.toFixed(2)));
  });
  cmd(['OLESCALE'], 'Cỡ đối tượng OLE: chiều cao / chiều rộng, tỉ lệ %, khoá tỉ lệ, đặt lại cỡ gốc', async () => {
    let e = [...(typeof selEnts !== 'undefined' ? selEnts : [])].find(isOLE); if(!e){ const r = await A.getEnt('Chọn đối tượng OLE', { filter: isOLE }); e = r.ent; } if(!e) return;
    const w0 = e.ole.w0 || e.w, h0 = e.ole.h0 || e.h; const f = v => +(+v).toFixed(4);
    A.dialog({ title: 'Cỡ đối tượng OLE (OLESCALE)', help: 'OLESCALE', html: '<div class="acw" style="width:380px"><fieldset class="acw-grp"><legend>Cỡ</legend><div class="acw-row"><label>Chiều cao</label><input id="osH" type="number" step="any" value="' + f(e.h) + '" style="width:110px"></div><div class="acw-row"><label>Chiều rộng</label><input id="osW" type="number" step="any" value="' + f(e.w) + '" style="width:110px"></div><button type="button" id="osR">Đặt lại</button></fieldset>' +
        '<fieldset class="acw-grp"><legend>Tỉ lệ</legend><div class="acw-row"><label>Cao %</label><input id="osHP" type="number" value="' + f(e.h / h0 * 100) + '" style="width:80px"> <label>Rộng %</label><input id="osWP" type="number" value="' + f(e.w / w0 * 100) + '" style="width:80px"></div><label><input type="checkbox" id="osK" checked> Khoá tỉ lệ</label></fieldset>' +
        '<div style="opacity:.75;font-size:11.5px">Cỡ gốc: ' + f(w0) + ' × ' + f(h0) + ' · ' + esc(e.ole.name) + '</div></div>',
      onOpen: root => { noKey(root); const q = s => root.querySelector(s); const lock = () => q('#osK').checked; const sync = (src) => { let H = +q('#osH').value, W = +q('#osW').value;
          if(src === 'H' && lock()) W = H * w0 / h0; if(src === 'W' && lock()) H = W * h0 / w0; if(src === 'HP'){ H = h0 * q('#osHP').value / 100; if(lock()) W = w0 * q('#osHP').value / 100; } if(src === 'WP'){ W = w0 * q('#osWP').value / 100; if(lock()) H = h0 * q('#osWP').value / 100; }
          if(src !== 'H') q('#osH').value = f(H); if(src !== 'W') q('#osW').value = f(W); if(src !== 'HP') q('#osHP').value = f(H / h0 * 100); if(src !== 'WP') q('#osWP').value = f(W / w0 * 100); };
        q('#osH').addEventListener('input', () => sync('H')); q('#osW').addEventListener('input', () => sync('W')); q('#osHP').addEventListener('input', () => sync('HP')); q('#osWP').addEventListener('input', () => sync('WP'));
        q('#osR').addEventListener('click', () => { q('#osH').value = f(h0); sync('H'); q('#osW').value = f(w0); sync('W'); }); },
      ok: root => { const H = +root.querySelector('#osH').value, W = +root.querySelector('#osW').value; if(!(H > 0 && W > 0)){ say('Cỡ phải lớn hơn 0.'); return false; } A.oleResize(e, W, H); } });
  });
  // đổi cỡ, giữ góc trên trái
  A.oleResize = (e, W, H) => { const w = copy(e); const r = (e.rot || 0) * Math.PI / 180; const top = { x: e.x - Math.sin(r) * e.h, y: e.y + Math.cos(r) * e.h }; w.w = W; w.h = H; w.x = top.x + Math.sin(r) * H; w.y = top.y - Math.cos(r) * H;
    A.commit({ rep: [[e, w]] }, 'OLESCALE: ' + (+W.toFixed(3)) + ' × ' + (+H.toFixed(3)) + ' (' + (+(W / (e.ole.w0 || W) * 100).toFixed(1)) + ' %)'); return w; };
  async function oleOpen(e){ if(e.ole.kind === 'text' || e.ole.kind === 'table'){ const t = await new Promise(res => { const d = A.dialog({ title: 'Sửa đối tượng OLE — ' + e.ole.name, html: '<textarea id="oeX" rows="12" style="width:520px">' + esc(e.ole.text || '') + '</textarea>', ok: root => res(root.querySelector('#oeX').value), cancel: () => res(null) }); noKey(d); });
      if(t == null) return; const w = await oleRefresh(e, { text: t }); A.commit({ rep: [[e, w]] }, 'OLE: đã cập nhật ' + e.ole.name); return; }
    const D = await oleData(e.ole.oid); let blob = D && D.blob; if(e.ole.link){ const b = await readLinked(e); if(b) blob = b; }
    if(!blob){ say('Không còn dữ liệu của ' + e.ole.name + ' trên máy này — dùng Đổi nguồn.'); return; } await shareOrDownload(blob, e.ole.name || 'ole.bin', e.ole.mime || 'application/octet-stream'); log('OLE: đã mở / lưu ' + e.ole.name + '.'); }
  A.oleOpen = oleOpen;
  plain(['OLELINKS'], 'Liên kết OLE: cập nhật ngay, mở nguồn, đổi nguồn, ngắt liên kết, tự động / thủ công', () => {
    const L = () => ME().filter(isOLE); if(!L().length){ log('OLELINKS: bản vẽ không có đối tượng OLE.'); return; } let sel = 0;
    const html = () => '<div class="acw" style="width:600px"><div class="lm-tbl" style="max-height:260px"><table style="width:100%"><thead><tr><th>Nguồn</th><th>Kiểu</th><th>Cập nhật</th><th>Cỡ</th></tr></thead><tbody>' +
      L().map((e, i) => '<tr data-i="' + i + '" style="cursor:pointer' + (i === sel ? ';background:var(--accent-soft,#2b4a6f)' : '') + '"><td>' + esc(e.ole.path || e.ole.name) + '</td><td data-k="' + (e.ole.link ? 'link' : e.ole.kind === 'file' ? 'emb' : 'new') + '">' + (e.ole.link ? 'Liên kết' : e.ole.kind === 'file' ? 'Nhúng' : 'Tạo mới (' + (e.ole.kind === 'table' ? 'bảng' : 'ghi chú') + ')') + '</td><td>' + (e.ole.link ? (e.ole.upd === 'M' ? 'Thủ công' : 'Tự động') : '—') + '</td><td>' + fmtSize(e.ole.size || 0) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button type="button" data-a="upd">Cập nhật ngay</button><button type="button" data-a="open">Mở nguồn</button><button type="button" data-a="chg">Đổi nguồn…</button><button type="button" data-a="brk">Ngắt liên kết</button><span style="flex:1"></span><label><input type="radio" name="olU" value="A"> Tự động</label><label><input type="radio" name="olU" value="M"> Thủ công</label></div></div>';
    const d = A.dialog({ title: 'Liên kết (OLELINKS)', help: 'OLELINKS', noCancel: true, okText: 'Đóng', html: html() });
    const root = d && d.root ? d.root : document.querySelector('.dvd-dlg:last-of-type'); const body = root.querySelector('.dvd-body');
    const render = () => { body.innerHTML = html(); const e = L()[sel]; if(e) body.querySelectorAll('input[name=olU]').forEach(x => { x.checked = x.value === (e.ole.upd || 'A'); x.disabled = !e.ole.link; }); };
    body.addEventListener('click', async ev => { const tr = ev.target.closest('tr[data-i]'); if(tr){ sel = +tr.dataset.i; render(); return; } const b = ev.target.closest('[data-a]'); if(!b) return; const e = L()[sel]; if(!e) return; const a = b.dataset.a;
      if(a === 'open'){ await oleOpen(e); render(); return; }
      if(a === 'upd'){ if(!e.ole.link){ say('Đối tượng nhúng — không có tệp gốc để cập nhật.'); return; } let blob = await readLinked(e); if(!blob){ const s = await pickSource(e.ole.path); if(!s) return; blob = s.blob; } const w = await oleRefresh(e, { blob }); A.commit({ rep: [[e, w]] }, 'OLELINKS: đã cập nhật ' + e.ole.name); render(); return; }
      if(a === 'chg'){ const s = await pickSource(e.ole.path); if(!s) return; const w0 = await oleRefresh(e, { blob: s.blob, name: s.name }); w0.ole.name = s.name; w0.ole.path = s.path; w0.ole.mime = s.mime || s.blob.type || ''; w0.ole.kind = 'file'; delete w0.ole.text; A.commit({ rep: [[e, w0]] }, 'OLELINKS: nguồn mới ' + s.name); render(); return; }
      if(a === 'brk'){ if(!e.ole.link){ say('Không phải liên kết.'); return; } const w = copy(e); w.ole.link = false; A.commit({ rep: [[e, w]] }, 'OLELINKS: đã ngắt liên kết ' + e.ole.name + ' (giữ bản nhúng)'); render(); return; } });
    body.addEventListener('change', ev => { if(ev.target.name !== 'olU') return; const e = L()[sel]; if(!e) return; const w = copy(e); w.ole.upd = ev.target.value; A.commit({ rep: [[e, w]] }); });
    render();
  });
  // mở bản vẽ: liên kết "Tự động" (bản Windows) đọc lại tệp gốc
  { const _ol = A.onLoad; A.onLoad = function(){ if(_ol) _ol.apply(this, arguments); setTimeout(async () => { if(!DESK()) return; const rep = []; for(const e of ME().filter(x => isOLE(x) && x.ole.link && x.ole.upd !== 'M')){ const b = await readLinked(e); if(b && b.size !== e.ole.size) rep.push([e, await oleRefresh(e, { blob: b })]); } if(rep.length) A.commit({ rep }, 'OLE: cập nhật ' + rep.length + ' liên kết tự động'); }, 600); }; }

  /* ===================================================================== WMFCLIP ===================================================================== */
  // vẽ đối tượng chọn ra ảnh (nền trắng, như ảnh metafile dán vào Word / Excel)
  function entsPNG(L, maxPx){ const bb = A.bboxOf ? A.bboxOf(L) : null; if(!bb) return null; const W0 = Math.max(1e-9, bb.x1 - bb.x0), H0 = Math.max(1e-9, bb.y1 - bb.y0); const M = maxPx || 1600; const k = M / Math.max(W0, H0); const pad = 10;
    const cv = document.createElement('canvas'); cv.width = Math.max(4, Math.round(W0 * k) + 2 * pad); cv.height = Math.max(4, Math.round(H0 * k) + 2 * pad); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    const X = x => pad + (x - bb.x0) * k, Y = y => cv.height - pad - (y - bb.y0) * k; const col = e => { const c = String(e.col || '#000').toLowerCase(); return c === '#ffffff' || c === '#fff' ? '#000000' : c; };
    g.lineCap = 'round'; g.lineJoin = 'round';
    for(const e of L){ g.strokeStyle = g.fillStyle = col(e); g.lineWidth = Math.max(1, ((e.lw > 0 ? e.lw : 25) / 100) * k * 0); g.lineWidth = 1.2; g.beginPath();
      switch(e.type){
        case 'LINE': g.moveTo(X(e.x1), Y(e.y1)); g.lineTo(X(e.x2), Y(e.y2)); g.stroke(); break;
        case 'CIRCLE': g.arc(X(e.cx), Y(e.cy), e.r * k, 0, Math.PI * 2); g.stroke(); break;
        case 'ARC': g.arc(X(e.cx), Y(e.cy), e.r * k, -e.a1 * Math.PI / 180, -e.a2 * Math.PI / 180, true); g.stroke(); break;
        case 'ELLIPSE': { const a = Math.hypot(e.mx, e.my); g.ellipse(X(e.cx), Y(e.cy), a * k, a * (e.ratio || 1) * k, -Math.atan2(e.my, e.mx), -(e.p1 || 0), -(e.p2 == null ? Math.PI * 2 : e.p2), true); g.stroke(); break; }
        case 'POLYLINE': { const V = e.vertices || []; V.forEach((v, i) => i ? g.lineTo(X(v.x), Y(v.y)) : g.moveTo(X(v.x), Y(v.y))); if(e.closed) g.closePath(); g.stroke(); break; }
        case 'POINT': g.fillRect(X(e.x) - 1.5, Y(e.y) - 1.5, 3, 3); break;
        case 'SOLID': { const p = e.pts || []; const q = p.length === 4 && !e.face ? [p[0], p[1], p[3], p[2]] : p; q.forEach((v, i) => i ? g.lineTo(X(v.x), Y(v.y)) : g.moveTo(X(v.x), Y(v.y))); g.closePath(); g.fill(); break; }
        case 'HATCH': { for(const lp of e.loops || []){ lp.forEach((v, i) => i ? g.lineTo(X(v.x), Y(v.y)) : g.moveTo(X(v.x), Y(v.y))); g.closePath(); } if(e.solid || e.pat === 'SOLID'){ g.fill('evenodd'); } else { g.globalAlpha = 0.25; g.fill('evenodd'); g.globalAlpha = 1; g.stroke(); } break; }
        case 'TEXT': { const h = (e.h || 2.5) * k; if(h < 2) break; g.save(); g.translate(X(e.x), Y(e.y)); g.rotate(-(e.rot || 0) * Math.PI / 180); g.font = h + 'px Arial'; g.textBaseline = 'alphabetic'; String(e.text || '').split('\n').forEach((l, i) => g.fillText(l, 0, i * h * 1.6)); g.restore(); break; }
        case 'IMAGE': { const im = window.DVDImg ? DVDImg.get(e.img) : null; if(im && im.complete){ g.save(); g.translate(X(e.x), Y(e.y)); g.rotate(-(e.rot || 0) * Math.PI / 180); g.drawImage(im, 0, -e.h * k, e.w * k, e.h * k); g.restore(); } break; }
      } }
    return { canvas: cv, w: W0, h: H0 }; }
  A.entsPNG = entsPNG;
  cmd(['WMFCLIP'], 'Chép đối tượng chọn vào bộ nhớ tạm dạng hình (dán vào Word / Excel / PowerPoint); không chép được thì lưu tệp .wmf', async () => {
    const s = await A.getSel('Chọn đối tượng'); const L = (s && s.sel) || []; if(!L.length) return; const R = entsPNG(L); if(!R){ log('WMFCLIP: không có hình.'); return; }
    const blob = await new Promise(r => R.canvas.toBlob(r, 'image/png'));
    try{ await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); log('WMFCLIP: đã chép ' + L.length + ' đối tượng vào bộ nhớ tạm (' + R.canvas.width + ' × ' + R.canvas.height + ' px) — dán vào Word / Excel bằng Ctrl+V.'); A._wmfclip = blob; return; }catch(_){}
    if(A.wmfOut){ const w = A.wmfOut(L); if(w){ await shareOrDownload(new Blob([w.data], { type: 'image/wmf' }), docBase() + '.wmf', 'image/wmf'); log('WMFCLIP: trình duyệt không cho chép hình — đã lưu tệp ' + docBase() + '.wmf.'); return; } }
    log('WMFCLIP: không chép được vào bộ nhớ tạm.'); });

  /* ===================================================================== PSFILL ===================================================================== */
  const PSF = { GRAYSCALE: 'Grayscale', RGBCOLOR: 'RGBcolor', LINEARGRAY: 'Lineargray', RADIALGRAY: 'Radialgray', SQUARE: 'Square', WAFFLE: 'Waffle', ZIGZAG: 'Zigzag', STARS: 'Stars', BRICK: 'Brick', SPECKS: 'Specks' };
  cmd(['PSFILL'], 'Tô đa tuyến kín bằng mẫu tô PostScript: Grayscale, RGBcolor, Lineargray, Radialgray, Square, Waffle, Zigzag, Stars, Brick, Specks', async () => {
    const r = await A.getEnt('Chọn đa tuyến kín', { filter: e => e.type === 'POLYLINE' && e.closed && (e.vertices || []).length >= 3 || e.type === 'CIRCLE' || e.type === 'ELLIPSE' }); const e = r.ent; if(!e) return;
    const k = await A.getKw('Mẫu tô [' + Object.values(PSF).join(' / ') + '] <Grayscale>', { kw: Object.entries(PSF).map(([k2, t]) => ({ k: k2.slice(0, 2) === 'RG' ? 'RG' : k2.slice(0, 2) === 'RA' ? 'RA' : k2 === 'STARS' ? 'ST' : k2 === 'SPECKS' ? 'SP' : k2[0], t })), def: 'Grayscale' });
    const map = { G: 'GRAYSCALE', RG: 'RGBCOLOR', L: 'LINEARGRAY', RA: 'RADIALGRAY', S: 'SQUARE', W: 'WAFFLE', Z: 'ZIGZAG', ST: 'STARS', B: 'BRICK', SP: 'SPECKS' };
    const P = k.kw ? map[k.kw] : 'GRAYSCALE'; if(!P) return; const c = A.curveOf ? A.curveOf(e) : null;
    let loop = e.type === 'POLYLINE' ? e.vertices.map(v => ({ x: v.x, y: v.y })) : null; if(!loop){ const N = 96; loop = []; for(let i = 0; i < N; i++){ const t = i / N * Math.PI * 2; if(e.type === 'CIRCLE') loop.push({ x: e.cx + e.r * Math.cos(t), y: e.cy + e.r * Math.sin(t) }); else { const a = Math.hypot(e.mx, e.my), rr = Math.atan2(e.my, e.mx), b = a * (e.ratio || 1); loop.push({ x: e.cx + a * Math.cos(t) * Math.cos(rr) - b * Math.sin(t) * Math.sin(rr), y: e.cy + a * Math.cos(t) * Math.sin(rr) + b * Math.sin(t) * Math.cos(rr) }); } } } void c;
    const h = A.newProps({ type: 'HATCH', loops: [loop], solid: false }); h.layer = e.layer; h.psfill = PSF[P];
    const hx = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    if(P === 'GRAYSCALE'){ const g = numOr(await A.getNum('Mức xám (0 = trắng … 100 = đen)', { def: 50 }), 50); const v = 255 * (1 - Math.max(0, Math.min(100, g)) / 100); h.solid = true; h.pat = 'SOLID'; h.col = '#' + hx(v) + hx(v) + hx(v); delete h.bl; }
    else if(P === 'RGBCOLOR'){ const R = numOr(await A.getNum('Đỏ (0–100 %)', { def: 100 }), 100), G = numOr(await A.getNum('Xanh lá (0–100 %)', { def: 0 }), 0), B = numOr(await A.getNum('Xanh dương (0–100 %)', { def: 0 }), 0); h.solid = true; h.pat = 'SOLID'; h.col = '#' + hx(R * 2.55) + hx(G * 2.55) + hx(B * 2.55); delete h.bl; }
    else if(P === 'LINEARGRAY' || P === 'RADIALGRAY'){ const ang = P === 'LINEARGRAY' ? numOr(await A.getNum('Góc chuyển màu (độ)', { def: 0 }), 0) : 0; h.solid = true; h.pat = 'SOLID'; h.grad = { kind: P === 'LINEARGRAY' ? 'LINEAR' : 'SPHERICAL', c1: '#000000', c2: '#ffffff', ang, ctr: 1 }; }
    else { const sc = numOr(await A.getNum('Tỉ lệ mẫu', { def: 1 }), 1) || 1; const pick = (...n) => n.find(x => A.PATS && A.PATS[x]) || 'ANSI31'; const pat = { SQUARE: pick('NET', 'SQUARE'), WAFFLE: pick('ANSI37', 'NET'), ZIGZAG: pick('ZIGZAG', 'ANSI33', 'ANSI31'), STARS: pick('STARS', 'DOTS'), BRICK: pick('BRICK'), SPECKS: pick('DOTS', 'EARTH') }[P];
      h.pat = pat; h.psc = sc * (P === 'WAFFLE' ? 1 : 1); if(P === 'WAFFLE') h.pang = 45; }
    const w = copy(e); w.psfill = PSF[P]; A.commit({ add: [h], rep: [[e, w]] }, 'PSFILL: ' + PSF[P]); });

  /* ===================================================================== biến hệ thống + lệnh nhỏ ===================================================================== */
  const SET = Object.assign({ regenmode: 1, hpgaptol: 0, taskbar: 1, tray: { icons: 1, notes: 1, sec: 2.6, sticky: 0 }, tabmode: 0, autopub: { on: 0, fmt: 'PDF', where: 'same' }, pstylemode: 1 }, LS('dvd:x33', {}));
  const saveSet = () => SV('dvd:x33', SET);
  A.hpGapTol = () => +SET.hpgaptol || 0;
  if(A.sysvar){ A.sysvar.def('REGENMODE', { d: 'Tự tái tạo bản vẽ khi cần (0 tắt, 1 bật)', get: () => SET.regenmode, set: v => { SET.regenmode = +v ? 1 : 0; saveSet(); } });
    A.sysvar.def('HPGAPTOL', { d: 'Khe hở lớn nhất bỏ qua khi dò biên hatch (0 – 5000 đơn vị)', get: () => SET.hpgaptol, set: v => { SET.hpgaptol = Math.max(0, Math.min(5000, +v || 0)); saveSet(); } });
    A.sysvar.def('TASKBAR', { d: 'Mỗi bản vẽ một mục trên thanh tác vụ Windows (0/1)', get: () => SET.taskbar, set: v => { SET.taskbar = +v ? 1 : 0; saveSet(); applyTaskbar(); } });
    A.sysvar.def('TABMODE', { d: 'Bảng số hoá (digitizer) — 0 tắt, 1 bật', get: () => SET.tabmode, set: v => { SET.tabmode = +v ? 1 : 0; saveSet(); } });
    A.sysvar.def('PSTYLEMODE', { d: 'Kiểu in của bản vẽ: 1 theo màu (CTB), 0 theo tên (STB) — chỉ đọc, đổi bằng CONVERTPSTYLES', get: () => SET.pstylemode, set: () => log('Dùng CONVERTPSTYLES để đổi kiểu in.') });
    A.sysvar.def('AUTODWFPUBLISH', { d: 'Tự xuất bản khi lưu (0/1) — xem AUTOPUBLISH', get: () => SET.autopub.on, set: v => { SET.autopub.on = +v ? 1 : 0; saveSet(); } }); }
  cmd(['REGENAUTO'], 'Tự tái tạo bản vẽ (REGENMODE): Bật / Tắt', async () => { const k = await A.getKw('Nhập chế độ [Bật / Tắt] <' + (SET.regenmode ? 'Bật' : 'Tắt') + '>', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: SET.regenmode ? 'Bật' : 'Tắt' });
    if(k.kw){ SET.regenmode = k.kw === 'ON' ? 1 : 0; saveSet(); } log('REGENAUTO: ' + (SET.regenmode ? 'Bật' : 'Tắt') + (SET.regenmode ? '' : ' — dùng REGEN khi cần làm mới hình.')); });
  cmd(['HATCHGAPTOL'], 'Dung sai khe hở khi dò biên hatch (HPGAPTOL): khe nhỏ hơn giá trị này vẫn coi là vùng kín', async () => {
    const r = await A.getNum('Nhập dung sai khe hở <' + SET.hpgaptol + '>', { def: SET.hpgaptol }); const v = numOr(r, SET.hpgaptol); if(!(v >= 0 && v <= 5000)){ log('Giá trị phải từ 0 đến 5000.'); return; } SET.hpgaptol = v; saveSet(); log('HPGAPTOL = ' + v + (v ? ' — HATCH / BOUNDARY nối khe hở ≤ ' + v + '.' : '')); });
  // TASKBAR: bản Windows hiện số bản vẽ đang mở trên tiêu đề cửa sổ (mục thanh tác vụ)
  function applyTaskbar(){ try{ const n = (A.docs && A.docs().length) || (window.DVDDocs && DVDDocs.list ? DVDDocs.list().length : 1); const base = document.title.replace(/ \[\d+ bản vẽ\]$/, ''); document.title = SET.taskbar && n > 1 ? base + ' [' + n + ' bản vẽ]' : base; }catch(_){} }
  cmd(['TASKBAR'], 'Hiện từng bản vẽ trên thanh tác vụ Windows (0 / 1)', async () => { const r = await A.getNum('Nhập giá trị mới cho TASKBAR <' + SET.taskbar + '>', { def: SET.taskbar }); SET.taskbar = numOr(r, SET.taskbar) ? 1 : 0; saveSet(); applyTaskbar(); log('TASKBAR = ' + SET.taskbar); });
  // TRAYSETTINGS: thông báo (toast) — bật / tắt, thời gian, giữ tới khi đóng
  { const _t = window.toast; if(typeof _t === 'function'){ window.toast = function(msg){ const T = SET.tray; try{ onToast(String(msg)); }catch(_){} if(!T.notes){ try{ A.log(String(msg)); }catch(_){} return; } const r = _t.apply(this, arguments);
      try{ if(T.sticky || Math.abs((+T.sec || 2.6) - 2.6) > 1e-9){ const el = document.getElementById('toast'); clearTimeout(toastT); if(T.sticky){ el.onclick = () => el.classList.remove('show'); toastT = 0; } else toastT = setTimeout(() => el.classList.remove('show'), (+T.sec || 2.6) * 1000); } }catch(_){} return r; }; } }
  plain(['TRAYSETTINGS'], 'Thiết lập thông báo khay trạng thái: hiện biểu tượng, hiện thông báo, thời gian hiện, giữ tới khi đóng', () => { const T = SET.tray;
    A.dialog({ title: 'Thiết lập khay (TRAYSETTINGS)', help: 'TRAYSETTINGS', html: '<div class="acw" style="width:360px"><label style="display:block"><input type="checkbox" id="tsI"' + (T.icons ? ' checked' : '') + '> Hiện biểu tượng dịch vụ trên thanh trạng thái</label><label style="display:block"><input type="checkbox" id="tsN"' + (T.notes ? ' checked' : '') + '> Hiện thông báo từ dịch vụ</label>' +
      '<fieldset class="acw-grp"><legend>Thời gian hiện thông báo</legend><label><input type="radio" name="tsT" value="0"' + (T.sticky ? '' : ' checked') + '> Hiện trong <input id="tsS" type="number" min="1" max="60" value="' + (+T.sec || 2.6) + '" style="width:60px"> giây</label><br><label><input type="radio" name="tsT" value="1"' + (T.sticky ? ' checked' : '') + '> Hiện tới khi đóng (bấm vào thông báo)</label></fieldset></div>',
      onOpen: noKey, ok: root => { const q = s => root.querySelector(s); T.icons = q('#tsI').checked ? 1 : 0; T.notes = q('#tsN').checked ? 1 : 0; T.sec = Math.max(1, Math.min(60, +q('#tsS').value || 2.6)); T.sticky = q('input[name=tsT]:checked').value === '1' ? 1 : 0; saveSet();
        try{ document.querySelectorAll('.statusbar .tray, #dvdTray').forEach(x => x.style.display = T.icons ? '' : 'none'); }catch(_){} log('TRAYSETTINGS: thông báo ' + (T.notes ? (T.sticky ? 'hiện tới khi đóng' : T.sec + ' giây') : 'tắt (chỉ ghi ở dòng lệnh)') + '.'); } }); });
  plain(['TOOLPALETTESCLOSE', 'TPCLOSE'], 'Đóng bảng công cụ (Tool Palettes)', () => { if(document.getElementById('dvdTP')){ DVDCmd.run('TOOLPALETTES'); log('Đã đóng bảng công cụ.'); } else log('Bảng công cụ đang đóng.'); });
  // TABLET: bản số hoá dùng WinTab — trình duyệt / Electron không truy cập được
  cmd(['TABLET', 'TA'], 'Bảng số hoá (digitizer): Bật / Tắt / Hiệu chỉnh / Cấu hình', async () => { const k = await A.getKw('Nhập tuỳ chọn [Bật / Tắt / Hiệu chỉnh / Cấu hình]', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }, { k: 'CAL', t: 'Hiệu chỉnh' }, { k: 'CFG', t: 'Cấu hình' }] }); if(!k.kw) return;
    if(k.kw === 'OFF'){ SET.tabmode = 0; saveSet(); log('TABLET: tắt (TABMODE = 0).'); return; }
    log('TABLET: không tìm thấy bảng số hoá (digitizer) — DVDCAD nhận bút cảm ứng / bảng vẽ như chuột (Windows Ink), không dùng trình điều khiển WinTab nên không ' + (k.kw === 'ON' ? 'bật chế độ bảng' : k.kw === 'CAL' ? 'hiệu chỉnh toạ độ bảng' : 'cấu hình vùng menu bảng') + ' được. Để số hoá bản đồ giấy: quét thành ảnh, IMAGEATTACH rồi ALIGN / SCALE theo 2 điểm đã biết.'); });
  cmd(['FILEOPEN'], 'Mở bản vẽ theo tên tệp, không hiện hộp thoại (dùng trong script)', async () => {
    const r = await A.getStr('Nhập tên tệp cần mở', {}); const nm = String(r && r.str || '').trim().replace(/^"|"$/g, ''); if(!nm) return;
    const D = window.DVDDesktop; if(D && /[\\/]/.test(nm) && D.openPath){ try{ await D.openPath(nm); log('FILEOPEN: ' + nm); return; }catch(_){ log('FILEOPEN: không mở được "' + nm + '" (chưa được cấp quyền — dùng OPEN).'); return; } }
    let rec = []; try{ rec = (await (window.DVDDesktop && DVDDesktop.recentList ? DVDDesktop.recentList() : Promise.resolve([]))) || []; }catch(_){}
    const base = nm.split(/[\\/]/).pop().toLowerCase(); const hit = rec.find(x => String(x.path || x.name || '').toLowerCase().endsWith(base));
    if(hit && D && D.openPath){ await D.openPath(hit.path); log('FILEOPEN: ' + hit.path); return; }
    if(A.openRecentByName && await A.openRecentByName(base)){ log('FILEOPEN: ' + base + ' (bản vẽ gần đây)'); return; }
    log('FILEOPEN: không tìm thấy "' + nm + '" trong bản vẽ gần đây — chọn tệp.'); const f = await pickFile('.dwg,.dxf'); if(!f) return; const isDwg = /\.dwg$/i.test(f.name); if(isDwg) loadDWG(await f.arrayBuffer(), f.name); else loadDXF(await f.text(), f.name); });
  // WHOHAS: đọc tệp khoá .dwl / .dwl2 (AutoCAD tạo khi mở bản vẽ trên mạng)
  function parseDWL(name, text){ if(/\.dwl2$/i.test(name) || /^\s*<\?xml|<whohas/i.test(text)){ const g = t => { const m = new RegExp('<' + t + '[^>]*>([^<]*)</' + t + '>', 'i').exec(text); return m ? m[1].trim() : ''; }; return { user: g('username'), machine: g('machinename'), time: g('opentime') || g('opendatetime'), app: g('application') || g('product') }; }
    const L = text.replace(/\r/g, '').split('\n').map(s => s.replace(/\0/g, '').trim()); return { user: L[0] || '', machine: L[1] || '', time: L[2] || '' }; }
  A.parseDWL = parseDWL;
  plain(['WHOHAS'], 'Ai đang mở bản vẽ: đọc tệp khoá .dwl / .dwl2 nằm cạnh bản vẽ (người dùng, máy, thời điểm mở)', async () => {
    let name, text; const D = DESK(); if(D){ const r = await D.openDialog({ title: 'Chọn tệp khoá .dwl / .dwl2 (cạnh bản vẽ)', types: [{ description: 'Tệp khoá bản vẽ (*.dwl; *.dwl2)', accept: { 'text/plain': ['.dwl', '.dwl2'] } }] }); if(!r || !r[0]) return; const f = await D.readFile(r[0].path); name = r[0].name; text = new TextDecoder('windows-1252').decode(f.data); }
    else { const f = await pickFile('.dwl,.dwl2'); if(!f) return; name = f.name; text = await f.text(); }
    const W = parseDWL(name, text); if(!W.user && !W.machine){ log('WHOHAS: tệp ' + name + ' không có thông tin người mở.'); return; }
    const msg = 'Bản vẽ ' + name.replace(/\.dwl2?$/i, '.dwg') + ' đang được mở bởi: ' + (W.user || '?') + ' — máy ' + (W.machine || '?') + (W.time ? ' — lúc ' + W.time : ''); log('WHOHAS: ' + msg); A.dialog({ title: 'WHOHAS', noCancel: true, html: '<div style="min-width:320px">' + esc(msg) + '</div>' }); });
  // SIGVALIDATE: kiểm tệp có chữ ký số không + mã băm SHA-256
  async function sigInfo(buf, name){ const u8 = new Uint8Array(buf); const ver = String.fromCharCode(...u8.slice(0, 6)); const YR = { AC1015: '2000', AC1018: '2004', AC1021: '2007', AC1024: '2010', AC1027: '2013', AC1032: '2018' };
    const L1 = new TextDecoder('latin1').decode(u8); const has = t => L1.includes(t) || L1.includes([...t].join('\0') + '\0');
    const signed = /^AC10/.test(ver) ? has('AcDb:Signature') || has('AcDsSignature') : /\.pdf$/i.test(name) ? has('/ByteRange') && has('/Sig') : false;
    let sha = ''; try{ const h = await crypto.subtle.digest('SHA-256', buf); sha = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }catch(_){}
    return { ver: YR[ver] ? 'DWG ' + YR[ver] + ' (' + ver + ')' : /^AC10/.test(ver) ? ver : '', signed, sha, size: u8.length }; }
  A.sigInfo = sigInfo;
  plain(['SIGVALIDATE'], 'Kiểm chữ ký số của bản vẽ (DWG / PDF) + mã băm SHA-256 để đối chiếu tính toàn vẹn', async () => { const f = await pickFile('.dwg,.dxf,.pdf,.dwf,.dwfx'); if(!f) return; const I = await sigInfo(await f.arrayBuffer(), f.name);
    const html = '<div style="min-width:420px;line-height:1.7"><b>' + esc(f.name) + '</b> — ' + fmtSize(I.size) + (I.ver ? ' — ' + I.ver : '') + '<br>' + (I.signed ? '⚠ Tệp <b>có chữ ký số</b>. DVDCAD không kiểm được chứng thư (cần kho chứng thư Windows) — mở bằng AutoCAD / Adobe để xác minh người ký.' : 'Tệp <b>không có chữ ký số</b>.') +
      '<br>SHA-256:<br><code style="font-size:11px;word-break:break-all">' + I.sha + '</code><br><span style="opacity:.75;font-size:11.5px">So mã này với mã do người gửi cung cấp: trùng nhau = tệp không bị sửa trên đường truyền.</span></div>';
    A.dialog({ title: 'Xác minh chữ ký số (SIGVALIDATE)', help: 'SIGVALIDATE', noCancel: true, html }); log('SIGVALIDATE: ' + f.name + ' — ' + (I.signed ? 'có chữ ký số' : 'không có chữ ký số') + ', SHA-256 ' + I.sha.slice(0, 16) + '…'); });
  // CONVERT: chuẩn hoá đa tuyến cũ + hatch
  cmd(['CONVERT'], 'Chuyển đa tuyến 2D kiểu cũ và hatch cũ sang dạng tối ưu: bỏ đỉnh trùng, đa tuyến 3D phẳng → 2D, hatch nạp lại biên', async () => {
    const k = await A.getKw('Nhập kiểu chuyển [Hatch / Polyline / All] <All>', { kw: [{ k: 'H', t: 'Hatch' }, { k: 'P', t: 'Polyline' }, { k: 'A', t: 'All' }], def: 'All' }); const m = k.kw || 'A'; if(k.cancel) return;
    const rep = []; let np = 0, nh = 0;
    for(const e of ME()){ if(e.xr || e.vh) continue;
      if((m === 'A' || m === 'P') && e.type === 'POLYLINE' && !A.bvOf(e)){ const V = e.vertices || []; const flat3 = e.p3 && V.every(v => Math.abs(v.z || 0) < 1e-12); const dd = V.filter((v, i) => i && Math.hypot(v.x - V[i - 1].x, v.y - V[i - 1].y) < 1e-12).length;
        if(flat3 || dd){ const w = copy(e); if(flat3){ delete w.p3; w.vertices = V.map(v => ({ x: v.x, y: v.y })); } w.vertices = w.vertices.filter((v, i) => i === 0 || Math.hypot(v.x - w.vertices[i - 1].x, v.y - w.vertices[i - 1].y) >= 1e-12); if(w.vertices.length >= 2){ rep.push([e, w]); np++; } } }
      if((m === 'A' || m === 'H') && e.type === 'HATCH' && (e.loops || []).some(l => l.length >= 2 && Math.hypot(l[0].x - l[l.length - 1].x, l[0].y - l[l.length - 1].y) < 1e-12)){ const w = copy(e); w.loops = w.loops.map(l => l.length > 3 && Math.hypot(l[0].x - l[l.length - 1].x, l[0].y - l[l.length - 1].y) < 1e-12 ? l.slice(0, -1) : l); rep.push([e, w]); nh++; } }
    if(rep.length) A.commit({ rep }, 'CONVERT: ' + np + ' đa tuyến, ' + nh + ' hatch đã chuyển.'); else log('CONVERT: 0 đa tuyến, 0 hatch cần chuyển.'); });
  // CONVERTPSTYLES: bản vẽ theo màu (CTB) ↔ theo tên (STB) — kiểu in theo tên lấy từ bảng màu hiện hành (Style 1…255), bản in giữ nguyên
  plain(['CONVERTPSTYLES'], 'Đổi bản vẽ giữa kiểu in theo màu (CTB) và kiểu in theo tên (STB)', () => {
    const toNamed = SET.pstylemode === 1; const ctb = (A.PS && A.PS.style) || (typeof _plotStyle === 'string' ? _plotStyle : '') || 'monochrome';
    A.dialog({ title: 'CONVERTPSTYLES', help: 'CONVERTPSTYLES', html: '<div style="max-width:420px;line-height:1.6">' + (toNamed ? 'Bản vẽ đang dùng <b>kiểu in theo màu</b>. Chuyển sang <b>kiểu in theo tên</b>: mỗi màu ACI thành một kiểu in tên "Style N" (bảng ' + esc(String(ctb).replace(/^ctb:/, '')) + '.stb), gán cho lớp và đối tượng — bản in không đổi.' : 'Bản vẽ đang dùng <b>kiểu in theo tên</b>. Chuyển về <b>kiểu in theo màu</b>: bỏ tên kiểu in trên lớp / đối tượng.') + '</div>',
      ok: () => { const aci = h => (A.aciOf ? A.aciOf(h) : 7) || 7; let n = 0; const rep = [];
        if(toNamed){ const used = new Set(); for(const e of ME()){ if(e.xr) continue; const w = copy(e); w.pst = e.bl ? 'ByLayer' : 'Style ' + aci(e.col); if(!e.bl) used.add(w.pst); rep.push([e, w]); n++; } const lay = {}; for(const L of A.layerNames()){ lay[L] = 'Style ' + aci(A.layerHex(L)); used.add(lay[L]); }
          SV('dvd:stb', { name: String(ctb).replace(/^ctb:/, '') + '.stb', styles: [...used].sort(), layers: lay }); SET.pstylemode = 0; }
        else { for(const e of ME()) if(e.pst){ const w = copy(e); delete w.pst; rep.push([e, w]); n++; } SV('dvd:stb', null); SET.pstylemode = 1; }
        saveSet(); if(rep.length) A.commit({ rep }); log('CONVERTPSTYLES: ' + (SET.pstylemode ? 'theo màu (CTB)' : 'theo tên (STB)') + ' — ' + n + ' đối tượng.'); } }); });
  // ADCNAVIGATE: mở DesignCenter tại tệp chỉ định
  cmd(['ADCNAVIGATE'], 'Mở DesignCenter tại bản vẽ chỉ định (tên tệp / đường dẫn) để lấy khối, lớp, kiểu nét', async () => {
    const r = await A.getStr('Nhập đường dẫn hoặc tên tệp bản vẽ <chọn tệp>', {}); const nm = String(r && r.str || '').trim().replace(/^"|"$/g, '');
    const D = DESK(); let file = null;
    if(D && nm){ try{ const x = await D.readFile(nm); file = new File([x.data], x.name); }catch(_){} }
    if(!file){ if(nm) log('ADCNAVIGATE: chưa mở được "' + nm + '" trực tiếp — chọn tệp.'); file = await pickFile('.dwg,.dxf'); } if(!file) return;
    if(A.dcOpen){ await A.dcOpen(file); log('ADCNAVIGATE: DesignCenter → ' + file.name); } else DVDCmd.run('ADCENTER'); });

  /* ===================================================================== theo dõi: lưu, in, lệnh, sửa ===================================================================== */
  const ACT = () => LS('dvd:activity', []), PLOTLOG = () => LS('dvd:plotlog', []), USE = () => LS('dvd:cmduse', {});
  function act(kind, msg, extra){ const L = ACT(); L.push(Object.assign({ t: Date.now(), k: kind, f: docName(), u: user(), m: String(msg || '').slice(0, 200) }, extra || {})); while(L.length > 1500) L.shift(); SV('dvd:activity', L); try{ if(A._actPal) A._actPal(); }catch(_){} }
  A.activity = { add: act, list: ACT, clear: () => SV('dvd:activity', []) };
  let lastSave = 0;
  function onToast(msg){ if(/^Đã lưu .+\.(dwg|dxf)\b/i.test(msg) && Date.now() - lastSave > 500){ lastSave = Date.now(); onSaved(msg); } }
  async function onSaved(msg){ act('save', msg); try{ if(SET.autopub.on) await autoPublish(true); }catch(err){ console.warn('autopublish', err); } try{ await snapshot('Lưu'); }catch(_){} }
  A.notifySaved = m => onSaved(m || 'Đã lưu ' + docName());
  { const _ol = A.onLoad; A.onLoad = function(){ if(_ol) _ol.apply(this, arguments); setTimeout(() => { act('open', 'Mở ' + docName()); applyTaskbar(); }, 50); }; }
  { const _c = A.commit; A.commit = function(ch, m){ const r = _c.apply(this, arguments); try{ if(ch && (ch.add || ch.del || ch.rep)){ const c = A.cmdName ? A.cmdName() : ''; act('edit', m || c || 'Sửa bản vẽ', { c, n: [(ch.add || []).length, (ch.del || []).length, (ch.rep || []).length] }); } }catch(_){} return r; }; }
  { const _r = A.run; if(_r) A.run = function(name){ try{ const U = USE(); const k = String(name || '').toUpperCase(); if(k){ U[k] = (U[k] || 0) + 1; SV('dvd:cmduse', U); } }catch(_){} return _r.apply(this, arguments); }; }
  { const _l = A.log; A.log = function(m){ try{ const s = String(m || ''); const mm = /^(PLOT|PUBLISH|EXPORT[A-Z]*|PLOTTOFILE|EXPORTPDF|EXPORTDWFX?|EXPORTLAYOUT|AUTOPUBLISH|PNGOUT|JPGOUT|PSOUT|WMFOUT|IGESEXPORT)\b\s*:?\s*(.*)$/i.exec(s);
      if(mm){ const L = PLOTLOG(); L.push({ t: Date.now(), f: docName(), c: mm[1].toUpperCase(), m: s.slice(0, 300), ok: !/lỗi|không (tạo|in|xuất|ghi)|thất bại|error/i.test(s) }); while(L.length > 500) L.shift(); SV('dvd:plotlog', L); } }catch(_){} return _l.apply(this, arguments); }; }
  plain(['VIEWPLOTDETAILS'], 'Chi tiết in và xuất bản: các lần in / xuất (PLOT, PUBLISH, EXPORT…) — thành công / lỗi, thời gian, tệp', () => { const L = PLOTLOG().slice().reverse();
    const rows = f => L.filter(x => f === 'all' || (f === 'err' ? !x.ok : x.ok)).map(x => '<tr><td>' + new Date(x.t).toLocaleString('vi-VN') + '</td><td>' + (x.ok ? '✓' : '✗') + '</td><td>' + esc(x.c) + '</td><td>' + esc(x.f) + '</td><td style="white-space:normal">' + esc(x.m) + '</td></tr>').join('') || '<tr><td colspan="5" style="opacity:.7">Chưa có lần in / xuất nào.</td></tr>';
    const d = A.dialog({ title: 'Chi tiết in và xuất bản (VIEWPLOTDETAILS)', help: 'VIEWPLOTDETAILS', wide: true, noCancel: true, okText: 'Đóng', left: '<button type="button" id="vpC">Xoá danh sách</button>', html: '<div><select id="vpF"><option value="all">Mọi lần</option><option value="err">Chỉ lỗi</option><option value="ok">Chỉ thành công</option></select> <span style="opacity:.7">' + L.length + ' lần</span></div><div class="lm-tbl" style="max-height:360px"><table style="width:100%"><thead><tr><th>Thời gian</th><th></th><th>Lệnh</th><th>Bản vẽ</th><th>Chi tiết</th></tr></thead><tbody id="vpB">' + rows('all') + '</tbody></table></div>' });
    const root = d && d.root ? d.root : document; root.querySelector('#vpF').addEventListener('change', ev => { root.querySelector('#vpB').innerHTML = rows(ev.target.value); }); const c = root.querySelector('#vpC'); if(c) c.onclick = () => { SV('dvd:plotlog', []); root.querySelector('#vpB').innerHTML = rows('all'); }; });
  // ACTIVITYINSIGHTS: bảng hoạt động của bản vẽ
  plain(['ACTIVITYINSIGHTS', 'ACTIVITYINSIGHTSCLOSE'], 'Bảng hoạt động (Activity Insights): mở, lưu, sửa bản vẽ — ai, khi nào, lệnh gì; lọc, xuất CSV', () => {
    const old = document.getElementById('dvdAct'); if(old){ old.remove(); A._actPal = null; return; }
    const P = document.createElement('div'); P.id = 'dvdAct'; P.style.cssText = 'position:absolute;right:8px;top:40px;width:340px;max-height:calc(100% - 140px);display:flex;flex-direction:column;z-index:40;background:var(--panel,#1c222b);border:1px solid var(--line,#3a4452);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.4);font-size:12px;color:var(--ink,#e6eaf0)';
    P.innerHTML = '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line,#3a4452)"><b style="flex:1">Hoạt động — ' + esc(docName()) + '</b><select id="aiF"><option value="">Tất cả</option><option value="open">Mở</option><option value="save">Lưu</option><option value="edit">Sửa</option></select><button type="button" id="aiX" title="Xuất CSV">CSV</button><button type="button" id="aiC" title="Đóng">×</button></div><div id="aiB" style="overflow:auto;padding:4px 8px"></div>';
    (document.getElementById('cvWrap') || document.querySelector('.canvas-wrap') || document.body).appendChild(P);
    const KN = { open: 'Mở', save: 'Lưu', edit: 'Sửa', snap: 'Ảnh chụp' };
    const render = () => { const f = P.querySelector('#aiF').value; const L = ACT().filter(x => x.f === docName() && (!f || x.k === f)).reverse().slice(0, 400); let day = '';
      P.querySelector('#aiB').innerHTML = L.map(x => { const d = new Date(x.t), ds = d.toLocaleDateString('vi-VN'); const h = ds !== day ? '<div style="margin:6px 0 2px;opacity:.7;font-weight:600">' + ds + '</div>' : ''; day = ds; return h + '<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="opacity:.7">' + d.toLocaleTimeString('vi-VN') + '</span> · <b>' + (KN[x.k] || x.k) + '</b> · ' + esc(x.u) + '<br>' + esc(x.m) + (x.n ? ' <span style="opacity:.6">(+' + x.n[0] + ' −' + x.n[1] + ' ~' + x.n[2] + ')</span>' : '') + '</div>'; }).join('') || '<div style="opacity:.7;padding:8px 0">Chưa có hoạt động.</div>'; };
    A._actPal = render; P.querySelector('#aiF').onchange = render; P.querySelector('#aiC').onclick = () => { P.remove(); A._actPal = null; };
    P.querySelector('#aiX').onclick = () => { const L = ACT().filter(x => x.f === docName()); const csv = 'Thoi gian,Loai,Nguoi dung,Noi dung\n' + L.map(x => [new Date(x.t).toISOString(), x.k, x.u, '"' + String(x.m).replace(/"/g, '""') + '"'].join(',')).join('\n'); shareOrDownload(new Blob(['﻿' + csv], { type: 'text/csv' }), docBase() + '_hoatdong.csv', 'text/csv'); };
    render(); });
  // MYINSIGHTS: gợi ý theo thói quen dùng lệnh
  const TIPS = [[/^(LINE|L)$/, 'Dùng PLINE để vẽ nhiều đoạn liền thành một đối tượng (dễ OFFSET, tính diện tích).'], [/^(COPY|CO|CP)$/, 'Cần nhiều bản sao đều nhau? Dùng ARRAY (mảng liên kết sửa được).'], [/^(TRIM|TR)$/, 'Bấm TRIM rồi kéo một nét qua các đoạn cần xén (chế độ Nhanh) — không phải chọn biên.'],
    [/^(ERASE|E)$/, 'Chọn đối tượng trước rồi bấm Delete nhanh hơn gõ ERASE.'], [/^(ZOOM|Z)$/, 'Lăn chuột để phóng, nhấp đúp nút giữa để xem toàn bộ (Zoom Extents).'], [/^(HATCH|H|BHATCH)$/, 'Vùng có khe hở nhỏ? Đặt HATCHGAPTOL để HATCH vẫn nhận vùng kín.'], [/^(DIM|DIMLINEAR|DLI)$/, 'Lệnh DIM tự nhận loại kích thước theo đối tượng rê chuột tới.'], [/^(MOVE|M)$/, 'Giữ Shift khi kéo grip để sao chép thay vì di chuyển.'], [/^(INSERT|I)$/, 'Bảng Blocks (Ctrl+3 → Tool Palettes) kéo thả khối nhanh hơn.'], [/^(LAYER|LA)$/, 'Lưu trạng thái lớp bằng LAYERSTATE để chuyển nhanh giữa các bộ lớp.']];
  plain(['MYINSIGHTS'], 'Gợi ý cá nhân (My Insights): lệnh dùng nhiều nhất, phím tắt nên dùng, mẹo theo thói quen', () => { const U = USE(); const top = Object.entries(U).sort((a, b) => b[1] - a[1]).slice(0, 12); const tot = Object.values(U).reduce((a, b) => a + b, 0);
    let al = {}; try{ al = A.pgpAliases ? A.pgpAliases() : {}; }catch(_){} const short = k => { for(const [a, c] of Object.entries(al || {})) if(String(c).toUpperCase() === k && a.length < k.length) return a; return null; };
    const tips = []; for(const [k] of top){ const t = TIPS.find(x => x[0].test(k)); if(t && !tips.includes(t[1])) tips.push(t[1]); const s = short(k); if(s && U[k] >= 5) tips.push('Gõ ' + s + ' thay cho ' + k + ' (đã dùng ' + U[k] + ' lần).'); }
    const html = '<div style="min-width:440px"><b>Lệnh dùng nhiều nhất</b> (' + tot + ' lần)<table style="width:100%;margin:4px 0 10px">' + (top.map(([k, n]) => '<tr><td>' + esc(k) + '</td><td style="width:60%"><div style="background:var(--accent,#3b82f6);height:9px;border-radius:4px;width:' + Math.max(3, n / (top[0] ? top[0][1] : 1) * 100) + '%"></div></td><td style="text-align:right">' + n + '</td></tr>').join('') || '<tr><td style="opacity:.7">Chưa có dữ liệu — dùng vài lệnh rồi mở lại.</td></tr>') + '</table>' +
      '<b>Gợi ý cho bạn</b><ul style="margin:4px 0 0 18px;padding:0">' + (tips.slice(0, 8).map(t => '<li>' + esc(t) + '</li>').join('') || '<li style="opacity:.7">Chưa có gợi ý.</li>') + '</ul></div>';
    A.dialog({ title: 'Gợi ý cho bạn (MYINSIGHTS)', help: 'MYINSIGHTS', noCancel: true, okText: 'Đóng', left: '<button type="button" onclick="localStorage.removeItem(\'dvd:cmduse\');this.textContent=\'Đã xoá\'">Xoá thống kê</button>', html }); });

  /* ===================================================================== AUTOPUBLISH ===================================================================== */
  async function autoPublish(auto){ const P = SET.autopub; if(!A.plotPDF){ log('AUTOPUBLISH: chưa có bộ xuất PDF.'); return; } const base = docBase();
    if(P.fmt === 'DWFX' && A.exportDWFX){ await A.exportDWFX(); log('AUTOPUBLISH: ' + base + '.dwfx' + (auto ? ' (tự động khi lưu)' : '')); return; }
    const blob = await A.plotPDF(base); await shareOrDownload(blob, base + '.pdf', 'application/pdf'); log('AUTOPUBLISH: ' + base + '.pdf' + (auto ? ' (tự động khi lưu)' : '') + ' — ' + fmtSize(blob.size)); }
  A.autoPublish = autoPublish;
  plain(['AUTOPUBLISH'], 'Tự xuất bản PDF / DWFx mỗi khi lưu bản vẽ; Xuất bản ngay', () => { const P = SET.autopub;
    A.dialog({ title: 'Tự động xuất bản (AUTOPUBLISH)', help: 'AUTOPUBLISH', okText: 'OK', left: '<button type="button" id="apNow">Xuất bản ngay</button>', html: '<div class="acw" style="width:360px"><label><input type="checkbox" id="apOn"' + (P.on ? ' checked' : '') + '> Tự xuất bản khi lưu (AUTODWFPUBLISH)</label><fieldset class="acw-grp"><legend>Định dạng</legend><label><input type="radio" name="apF" value="PDF"' + (P.fmt !== 'DWFX' ? ' checked' : '') + '> PDF (vector)</label> <label><input type="radio" name="apF" value="DWFX"' + (P.fmt === 'DWFX' ? ' checked' : '') + '> DWFx</label></fieldset><div style="opacity:.75;font-size:11.5px">Dùng thiết lập in hiện hành (PAGESETUP). Tệp đặt tên theo bản vẽ.</div></div>',
      onOpen: root => { const b = (root.root || root).querySelector ? document.getElementById('apNow') : null; if(b) b.onclick = () => autoPublish(false); },
      ok: root => { P.on = root.querySelector('#apOn').checked ? 1 : 0; P.fmt = root.querySelector('input[name=apF]:checked').value; saveSet(); log('AUTOPUBLISH: ' + (P.on ? 'bật — xuất ' + P.fmt + ' mỗi khi lưu' : 'tắt') + '.'); } }); });

  /* ===================================================================== DWGHISTORY + SNAPSHOT ===================================================================== */
  const HK = () => 'h:' + docName() + ':';
  async function snapshot(note){ if(!ME().length || typeof entitiesToDXF !== 'function') return null; let dxf; try{ dxf = entitiesToDXF(ME().filter(e => !e.xr)); }catch(_){ return null; } if(dxf.length > 25e6) return null;
    const key = HK() + Date.now(); await iPut('hist', key, { t: Date.now(), f: docName(), note: note || '', n: ME().filter(e => !e.xr).length, size: dxf.length, u: user(), dxf });
    const ks = (await iKeys('hist')).filter(k => String(k).startsWith(HK())).sort(); while(ks.length > 30){ await iDel('hist', ks.shift()); } act('snap', 'Ảnh chụp phiên bản: ' + (note || '')); return key; }
  A.dwgSnapshot = snapshot;
  A.dwgHistory = async () => { const ks = (await iKeys('hist')).filter(k => String(k).startsWith(HK())).sort(); const out = []; for(const k of ks){ const v = await iGet('hist', k); if(v) out.push(Object.assign({ key: k }, v, { dxf: undefined })); } return out; };
  cmd(['SNAPSHOT'], 'Lưu ảnh chụp phiên bản bản vẽ hiện tại vào lịch sử (DWGHISTORY) kèm ghi chú', async () => { const r = await A.getStr('Ghi chú cho phiên bản <không>', {}); const k = await snapshot(String(r && r.str || '').trim() || 'Ảnh chụp'); log(k ? 'SNAPSHOT: đã lưu phiên bản ' + new Date().toLocaleString('vi-VN') + ' (' + ME().length + ' đối tượng).' : 'SNAPSHOT: bản vẽ trống hoặc quá lớn.'); });
  function diffSets(oldE, newE){ const sig = e => { try{ return entSig(e); }catch(_){ return JSON.stringify([e.type, e.x1, e.y1, e.cx, e.cy]); } }; const cnt = m => { const M = new Map(); for(const e of m){ const s = sig(e); M.set(s, (M.get(s) || 0) + 1); } return M; };
    const a = cnt(oldE), b = cnt(newE); const removed = [], added = []; const ra = new Map(a), rb = new Map(b);
    for(const e of oldE){ const s = sig(e); const nb = rb.get(s) || 0; if(nb > 0) rb.set(s, nb - 1); else removed.push(e); }
    for(const e of newE){ const s = sig(e); const na = ra.get(s) || 0; if(na > 0) ra.set(s, na - 1); else added.push(e); } return { added, removed, same: newE.length - added.length }; }
  A.diffEnts = diffSets;
  // đánh dấu khác biệt: bản sao tô màu trên lớp riêng (xanh = thêm, đỏ = mất)
  function markDiff(D, tag){ const L = 'DIFF$' + tag; A.addLayer(L + '_THEM', '#22c55e'); A.addLayer(L + '_MAT', '#ef4444'); const add = [];
    for(const e of D.added){ const w = copy(e); delete w.xr; delete w.grp; delete w.blk; w.layer = L + '_THEM'; w.col = '#22c55e'; delete w.bl; w.lw = 50; add.push(w); }
    for(const e of D.removed){ const w = copy(e); delete w.xr; delete w.grp; delete w.blk; w.layer = L + '_MAT'; w.col = '#ef4444'; delete w.bl; w.lw = 50; add.push(w); }
    if(add.length) A.commit({ add }, tag + ': +' + D.added.length + ' / −' + D.removed.length + ' (lớp ' + L + '_THEM / _MAT)'); return add.length; }
  plain(['DWGHISTORY'], 'Lịch sử bản vẽ: các phiên bản đã lưu (tự chụp khi lưu + SNAPSHOT) — mở, so sánh với hiện tại, xoá', async () => {
    const H = (await A.dwgHistory()).reverse(); if(!H.length){ log('DWGHISTORY: chưa có phiên bản nào của "' + docName() + '" — lưu bản vẽ (Ctrl+S) hoặc dùng SNAPSHOT.'); return; }
    const d = A.dialog({ title: 'Lịch sử bản vẽ (DWGHISTORY) — ' + docName(), help: 'DWGHISTORY', wide: true, noCancel: true, okText: 'Đóng', html: '<div class="lm-tbl" style="max-height:380px"><table style="width:100%"><thead><tr><th>Thời gian</th><th>Ghi chú</th><th>Người dùng</th><th>Đối tượng</th><th>Cỡ</th><th></th></tr></thead><tbody>' +
      H.map((h, i) => '<tr><td>' + new Date(h.t).toLocaleString('vi-VN') + '</td><td>' + esc(h.note) + '</td><td>' + esc(h.u) + '</td><td>' + h.n + '</td><td>' + fmtSize(h.size) + '</td><td style="white-space:nowrap"><button type="button" data-a="cmp" data-i="' + i + '">So sánh</button> <button type="button" data-a="open" data-i="' + i + '">Mở</button> <button type="button" data-a="del" data-i="' + i + '">Xoá</button></td></tr>').join('') + '</tbody></table></div>' });
    const root = d && d.root ? d.root : document.querySelector('.dvd-dlg:last-of-type');
    root.addEventListener('click', async ev => { const b = ev.target.closest('[data-a]'); if(!b) return; const h = H[+b.dataset.i]; const v = await iGet('hist', h.key); if(!v){ say('Phiên bản không còn.'); return; }
      if(b.dataset.a === 'del'){ await iDel('hist', h.key); b.closest('tr').remove(); return; }
      if(b.dataset.a === 'open'){ root.remove(); loadDXF(v.dxf, docBase() + '_' + new Date(h.t).toISOString().slice(0, 16).replace(/[:T]/g, '') + '.dxf'); log('DWGHISTORY: đã mở phiên bản ' + new Date(h.t).toLocaleString('vi-VN') + ' thành bản vẽ riêng.'); return; }
      if(b.dataset.a === 'cmp'){ let P; try{ P = parseDXF(v.dxf); }catch(_){ say('Không đọc được phiên bản.'); return; } const oldE = mergeText(resolveBlocks(P.entities, P.blocks)); const D = diffSets(oldE, ME().filter(e => !e.xr && !/^DIFF\$/.test(e.layer || '')));
        root.remove(); log('DWGHISTORY: so với ' + new Date(h.t).toLocaleString('vi-VN') + ' — thêm ' + D.added.length + ', bớt ' + D.removed.length + ', giữ ' + D.same + '.'); markDiff(D, 'HIST'); } });
  });

  /* ===================================================================== XREFCOMPARE ===================================================================== */
  cmd(['XREFCOMPARE'], 'So sánh tham chiếu ngoài đang gắn với bản mới của tệp đó: tô xanh chỗ thêm, đỏ chỗ mất', async () => {
    const XL = A.xrefList ? A.xrefList() : []; if(!XL.length){ log('XREFCOMPARE: bản vẽ chưa gắn tham chiếu ngoài (XATTACH).'); return; }
    let X = XL[0]; if(XL.length > 1){ const r = await A.getEnt('Chọn tham chiếu ngoài cần so sánh', { filter: e => !!e.xr }); if(!r.ent) return; X = XL.find(x => x.id === r.ent.xr) || X; }
    log('XREFCOMPARE: chọn bản mới của ' + X.name + '…'); const f = await pickFile('.dwg,.dxf'); if(!f) return; if(!A.parseRef || !A.placeRef){ log('XREFCOMPARE: thiếu bộ đọc tham chiếu.'); return; }
    const kind = /\.dwg$/i.test(f.name) ? 'dwg' : 'dxf'; let p; try{ p = await A.parseRef(kind, kind === 'dwg' ? await f.arrayBuffer() : await f.text()); }catch(err){ say('Không đọc được ' + f.name); return; }
    const newE = A.placeRef(p.ents, X, p.lt), oldE = ME().filter(e => e.xr === X.id); const D = diffSets(oldE, newE);
    log('XREFCOMPARE: ' + X.name + ' ↔ ' + f.name + ' — thêm ' + D.added.length + ', mất ' + D.removed.length + ', giống ' + D.same + '.'); if(!D.added.length && !D.removed.length){ say('Hai phiên bản giống nhau.'); return; } markDiff(D, 'XREF'); });
  A.xrefCompareEnts = (X, newEnts) => diffSets(ME().filter(e => e.xr === X.id), newEnts);

  /* ===================================================================== SMARTBLOCKSREPLACE ===================================================================== */
  // chữ ký hình: số lượng theo loại + tỉ lệ cạnh khung bao → độ giống nhau giữa nhóm đối tượng chọn và các khối trong bản vẽ
  const shapeSig = L => { const bb = A.bboxOf ? A.bboxOf(L) : null; const T = {}; for(const e of L) T[e.type] = (T[e.type] || 0) + 1; const w = bb ? bb.x1 - bb.x0 : 0, h = bb ? bb.y1 - bb.y0 : 0; return { T, n: L.length, ar: w > 0 && h > 0 ? Math.min(w, h) / Math.max(w, h) : 0, w, h, bb }; };
  const simil = (a, b) => { const keys = new Set([...Object.keys(a.T), ...Object.keys(b.T)]); let inter = 0, uni = 0; for(const k of keys){ inter += Math.min(a.T[k] || 0, b.T[k] || 0); uni += Math.max(a.T[k] || 0, b.T[k] || 0); } return (uni ? inter / uni : 0) * 0.75 + (1 - Math.abs(a.ar - b.ar)) * 0.25; };
  function blockCands(){ const by = new Map(); for(const e of ME()){ if(!e.grp || !e.blk || /^\*/.test(e.blk)) continue; if(!by.has(e.grp)) by.set(e.grp, { name: e.blk, ents: [] }); by.get(e.grp).ents.push(e); } const seen = new Map(); for(const g of by.values()) if(!seen.has(g.name)) seen.set(g.name, g); return [...seen.values()]; }
  A.smartBlockCands = (L) => { const s = shapeSig(L); return blockCands().map(c => ({ name: c.name, score: simil(s, shapeSig(c.ents)), c })).sort((a, b) => b.score - a.score); };
  cmd(['SMARTBLOCKSREPLACE', 'SBREPLACE'], 'Thay nhóm đối tượng (hoặc khối) bằng khối giống nhất trong bản vẽ — gợi ý theo hình dạng, khớp tâm và cỡ', async () => {
    const s = await A.getSel('Chọn các đối tượng cần thay bằng khối'); const L = (s && s.sel) || []; if(!L.length) return; const src = shapeSig(L);
    const own = new Set(L.map(e => e.blk).filter(Boolean)); const C = A.smartBlockCands(L).filter(c => !own.has(c.name)).slice(0, 8); if(!C.length){ log('SMARTBLOCKSREPLACE: bản vẽ chưa có khối nào để gợi ý.'); return; }
    const pick = await new Promise(res => { A.dialog({ title: 'Thay bằng khối (SMARTBLOCKSREPLACE)', help: 'SMARTBLOCKSREPLACE', html: '<div style="min-width:360px">Khối gợi ý (giống nhất trước):<div class="lm-tbl" style="max-height:260px;margin-top:4px"><table style="width:100%">' + C.map((c, i) => '<tr><td><label><input type="radio" name="sbR" value="' + i + '"' + (i ? '' : ' checked') + '> ' + esc(c.name) + '</label></td><td style="text-align:right">' + Math.round(c.score * 100) + ' %</td></tr>').join('') + '</table></div><label><input type="checkbox" id="sbS" checked> Co giãn khối theo cỡ đối tượng chọn</label></div>',
      ok: root => res({ c: C[+root.querySelector('input[name=sbR]:checked').value], sc: root.querySelector('#sbS').checked }), cancel: () => res(null) }); });
    if(!pick) return; const cs = shapeSig(pick.c.c.ents); const bs = cs.bb, ss = src.bb; if(!bs || !ss){ log('SMARTBLOCKSREPLACE: không xác định được khung bao.'); return; }
    const sc = pick.sc ? Math.max(1e-9, Math.max(src.w, src.h) / Math.max(1e-9, Math.max(cs.w, cs.h))) : 1; const cx = (ss.x0 + ss.x1) / 2, cy = (ss.y0 + ss.y1) / 2, bx = (bs.x0 + bs.x1) / 2, by = (bs.y0 + bs.y1) / 2;
    const gid = A.newGroupId ? A.newGroupId('B') : 'G' + Date.now(); const add = pick.c.c.ents.map(e => { const w = copy(e); w.grp = gid; return A.xformEnt ? A.xformEnt(w, { a: sc, b: 0, c: 0, d: sc, e: cx - bx * sc, f: cy - by * sc }) : w; });
    const del = new Set(L); for(const e of L) if(e.grp) for(const x of ME()) if(x.grp === e.grp) del.add(x);
    A.commit({ add, del: [...del] }, 'SMARTBLOCKSREPLACE: ' + del.size + ' đối tượng → khối ' + pick.c.name + (Math.abs(sc - 1) > 1e-9 ? ' (tỉ lệ ' + (+sc.toFixed(4)) + ')' : '')); });
})();
