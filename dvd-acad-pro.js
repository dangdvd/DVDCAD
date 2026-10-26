/* DVDCAD — bổ sung kiểu AutoCAD (v4e)
   • Thuộc tính khối: ATTDEF, ATTEDIT/EATTEDIT (kích đúp), ATTEXPORT (xuất CSV)
   • Ảnh nền: IMAGEATTACH, IMAGEADJUST
   • Tham chiếu ngoài: XATTACH, XREF (nạp lại / gỡ / gộp / mở)
   • Layout giấy: LAYOUT (khổ giấy + khung tên), MVIEW (khung nhìn theo tỉ lệ), VPEDIT, quản lý layout */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._pro || !window.DVDCmd) return; A._pro = true;
  const D2R = Math.PI / 180;
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => A.log(m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const deep = e => JSON.parse(JSON.stringify(e));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const hasDoc = () => { try{ return A.hasDoc(); }catch(_){ return false; } };
  const bkey = () => { try{ return baseKey || ''; }catch(_){ return ''; } };

  /* ---------------- IndexedDB nhỏ: lưu ảnh & file tham chiếu ---------------- */
  let _db = null;
  function db(){ if(_db) return _db; _db = new Promise((res, rej) => { const r = indexedDB.open('dvdcad-pro', 1); r.onupgradeneeded = () => { r.result.createObjectStore('files'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); return _db; }
  async function idbPut(k, v){ const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(v, k); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }); }
  async function idbGet(k){ const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readonly'); const q = t.objectStore('files').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function idbDel(k){ const d = await db(); return new Promise(res => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').delete(k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); }
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function pickFile(accept){ return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); setTimeout(() => { if(document.body.contains(i)) { /* chờ người dùng */ } }, 60000); }); }

  /* =====================================================================
     1) THUỘC TÍNH KHỐI
     ===================================================================== */
  cmd(['ATTDEF', 'ATT', 'DDATTDEF'], 'Định nghĩa thuộc tính khối (tên, lời nhắc, giá trị mặc định)', async () => {
    const o = await new Promise(res => A.dialog({ title: 'Định nghĩa thuộc tính (ATTDEF)', html:
      '<label class="dvd-frow"><span>Tên thuộc tính (Tag)</span><span class="v"><input id="adTag" placeholder="VD: SO_HIEU"></span></label><label class="dvd-frow"><span>Lời nhắc (Prompt)</span><span class="v"><input id="adPr" placeholder="VD: Số hiệu cột"></span></label><label class="dvd-frow"><span>Giá trị mặc định</span><span class="v"><input id="adDef"></span></label><label class="dvd-frow"><span>Cao chữ</span><span class="v"><input id="adH" style="width:90px" value="' + (+(A.dimTxt ? A.dimTxt() : 2.5).toPrecision(3)) + '"></span></label>' +
      '<p style="margin:6px 0 0">Đặt thuộc tính lên hình rồi dùng BLOCK để gộp thành khối. Khi chèn khối sẽ được hỏi giá trị; kích đúp vào khối để sửa.</p>',
      ok: r => { const tag = r.querySelector('#adTag').value.trim().toUpperCase().replace(/\s+/g, '_'); if(!tag){ say('Cần tên thuộc tính.'); return false; } res({ tag, pr: r.querySelector('#adPr').value.trim() || tag, def: r.querySelector('#adDef').value, h: parseFloat(String(r.querySelector('#adH').value).replace(',', '.')) || 2.5 }); }, cancel: () => res(null) }));
    if(!o) return;
    const mk = p => A.newProps({ type: 'TEXT', x: p.x, y: p.y, h: o.h, rot: 0, text: o.tag, ha: 'left', va: 'alphabetic', attdef: { tag: o.tag, prompt: o.pr, def: o.def } });
    const r = await A.getPoint('Chỉ định vị trí thuộc tính', { preview: (g, p) => g.ents([mk(p)]) }); if(!r.pt) return;
    A.commit({ add: [mk(r.pt)] }, 'Đã định nghĩa thuộc tính ' + o.tag);
  });
  // chèn khối: định nghĩa thuộc tính -> thuộc tính có giá trị mặc định, rồi mở hộp nhập giá trị
  function attMembers(gid){ return modelEntities.filter(e => e.grp === gid && e.att); }
  function editAttribs(ent){
    const gid = ent.grp; const list = attMembers(gid).filter(e => !e.acon); if(!list.length){ log('Khối này không có thuộc tính sửa được.'); return false; }
    const name = String(ent.blk || '').replace(/^\*/, '');
    A.dialog({ title: 'Sửa thuộc tính khối "' + name + '"', wide: true, html: '<div class="lm-tbl"><table><thead><tr><th>Thuộc tính</th><th>Lời nhắc</th><th style="width:55%">Giá trị</th></tr></thead><tbody>' + list.map((e, i) => '<tr><td><b>' + esc(e.att) + '</b></td><td style="color:#aab3c0">' + esc(e.attp || '') + '</td><td><input data-i="' + i + '" value="' + esc(e.text || '') + '" style="width:100%"></td></tr>').join('') + '</tbody></table></div>',
      onOpen: r => { const f = r.querySelector('input[data-i]'); if(f) setTimeout(() => { f.focus(); f.select(); }, 30); },
      ok: r => { const rep = []; r.querySelectorAll('input[data-i]').forEach(inp => { const e = list[+inp.dataset.i]; if(String(e.text || '') !== inp.value){ const w = deep(e); delete w.userAdded; w.text = inp.value; rep.push([e, w]); } }); if(rep.length) A.commit({ rep }, 'Đã sửa ' + rep.length + ' thuộc tính'); } });
    return true;
  }
  A.editAttribs = editAttribs;
  cmd(['EATTEDIT', 'ATTEDIT', 'ATE'], 'Sửa giá trị thuộc tính của khối', async () => { const r = await A.getEnt('Chọn khối có thuộc tính', { filter: e => !!e.grp && modelEntities.some(x => x.grp === e.grp && x.att) }); if(r.ent) setTimeout(() => editAttribs(r.ent), 0); });
  // sau khi INSERT: nếu khối có thuộc tính -> hỏi giá trị ngay (như AutoCAD)
  const _commitA = A.commit;
  A.commit = function(ch, msg){ const r = _commitA.apply(this, arguments); try{ if(r && ch && ch.add && ch.add.length && !ch.rep && !ch.del && /^Đã chèn khối/.test(msg || '')){ const a = ch.add.find(e => e.att && !e.acon && !e.apre); if(a) setTimeout(() => editAttribs(a), 60); } }catch(_){} return r; };
  // kích đúp khối có thuộc tính -> sửa thuộc tính
  const _dbl = A.onDblEnt;
  A.onDblEnt = function(e){ if(e && e.grp && !(A.inRefedit && A.inRefedit()) && modelEntities.some(x => x.grp === e.grp && x.att) && !e.tbld && !String(e.blk || '').startsWith('*')){ (A.eattedit || editAttribs)(e); return true; } return _dbl ? _dbl.apply(this, arguments) : false; };
  plain(['ATTEXPORT', 'ATTEXT', 'DATAEXTRACTION', 'DX'], 'Xuất bảng thuộc tính khối ra CSV (Excel)', () => {
    const groups = new Map(); for(const e of modelEntities){ if(e.att && e.grp){ let g = groups.get(e.grp); if(!g){ g = { blk: String(e.blk || '').replace(/^\*/, ''), vals: {}, x: e.bip ? e.bip.x : e.x, y: e.bip ? e.bip.y : e.y, layer: e.layer }; groups.set(e.grp, g); } g.vals[e.att] = e.text || ''; } }
    if(!groups.size){ say('Bản vẽ không có khối nào có thuộc tính.'); return; }
    const tags = [...new Set([...groups.values()].flatMap(g => Object.keys(g.vals)))];
    const q = v => { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const rows = [['Khối', 'Lớp', 'X', 'Y'].concat(tags).map(q).join(',')]; for(const g of groups.values()) rows.push([g.blk, g.layer, (+g.x).toFixed(2), (+g.y).toFixed(2)].concat(tags.map(t => g.vals[t] || '')).map(q).join(','));
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    shareOrDownload(blob, (String(currentName || 'banve').replace(/\.[^.]+$/, '')) + '_thuoc-tinh.csv', 'text/csv'); log('Đã xuất ' + groups.size + ' khối có thuộc tính.');
  });

  /* =====================================================================
     2) ẢNH NỀN (IMAGEATTACH)
     ===================================================================== */
  const IMG = new Map(), IMG_LOADING = new Set();
  window.DVDImg = { get(id){ if(!id) return null; const im = IMG.get(id); if(im) return im; if(!IMG_LOADING.has(id)){ IMG_LOADING.add(id); idbGet('img:' + id).then(b => { if(!b) return; const u = URL.createObjectURL(b); const el = new Image(); el.onload = () => { try{ draw(); }catch(_){} }; el.src = u; IMG.set(id, el); }).catch(() => {}); } return null; } };
  A.imgAdd = async (blob, name) => { const id = uid('I'); await idbPut('img:' + id, blob); const u = URL.createObjectURL(blob); const el = new Image(); await new Promise(r => { el.onload = r; el.onerror = r; el.src = u; }); IMG.set(id, el); return { id, el, name }; };
  // ghi ảnh với id có sẵn (mở lại ảnh nhúng trong tệp DVDCAD)
  A.imgPut = async (id, blob) => { if(!id || !blob) return null; await idbPut('img:' + id, blob); const u = URL.createObjectURL(blob); const el = new Image(); await new Promise(r => { el.onload = r; el.onerror = r; el.src = u; }); IMG.set(id, el); return el; };
  // dữ liệu ảnh (data URL JPEG) của một ảnh đã nạp — để nhúng vào DXF / DWG khi lưu
  A.imgDataURL = (id, maxPx) => { const im = window.DVDImg ? DVDImg.get(id) : null; if(!im || !im.complete || !im.naturalWidth) return null;
    try{ const s = Math.min(1, (maxPx || 4096) / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.9); }catch(_){ return null; } };
  cmd(['IMAGEATTACH', 'IAT', 'IMAGE', 'IM'], 'Chèn ảnh nền (ảnh chụp, bản scan) vào bản vẽ', async () => {
    const f = await pickFile('image/*'); if(!f){ return; }
    const id = uid('I'); await idbPut('img:' + id, f);
    const u = URL.createObjectURL(f); const el = new Image(); await new Promise(r => { el.onload = r; el.onerror = r; el.src = u; }); IMG.set(id, el);
    if(!el.naturalWidth){ say('Không đọc được ảnh.'); return; }
    const ar = el.naturalHeight / el.naturalWidth;
    const r = await A.getPoint('Chỉ định điểm chèn (góc dưới trái) của ảnh'); if(!r.pt) return; const P = r.pt;
    const vb = viewWorldAABB(); const defW = (vb.maxX - vb.minX) * 0.4;
    const mk = w => A.newProps({ type: 'IMAGE', x: P.x, y: P.y, w, h: w * ar, rot: 0, img: id, name: f.name, op: 1 });
    const d = await A.getDist('Chiều rộng ảnh (hoặc kéo chuột)', { base: P, def: +defW.toPrecision(4), preview: (g, p) => { const w = Math.max(1e-9, Math.abs(p.x - P.x)); g.poly([P, { x: P.x + w, y: P.y }, { x: P.x + w, y: P.y + w * ar }, { x: P.x, y: P.y + w * ar }], true, '#9fd0ff', [6, 4]); } });
    let w = d.num != null ? Math.abs(d.num) : defW; if(d.pt) w = Math.abs(d.pt.x - P.x) || w;
    const e = mk(w); delete e.lt; A.commit({ add: [e] }, 'Đã chèn ảnh ' + f.name);
  });
  cmd(['IMAGEADJUST', 'IAD'], 'Chỉnh độ mờ / khung của ảnh', async () => {
    const s = await A.getSel('Chọn ảnh', { filter: e => e.type === 'IMAGE' }); const sel = (s.sel || []).filter(e => e.type === 'IMAGE'); if(!sel.length) return;
    const v = await A.getNum('Độ đậm ảnh (0–100%)', { def: Math.round((sel[0].op != null ? sel[0].op : 1) * 100) }); if(v.num == null) return;
    const k = await A.getKw('Hiện khung viền ảnh?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Có' });
    A.commit({ rep: sel.map(e => { const w = deep(e); delete w.userAdded; w.op = Math.max(0.05, Math.min(1, v.num / 100)); w.frame = k.kw !== 'N'; return [e, w]; }) }, 'Đã chỉnh ảnh');
  });

  /* =====================================================================
     3) THAM CHIẾU NGOÀI (XREF)
     ===================================================================== */
  const XK = () => 'xref::' + bkey();
  const xrefs = () => { try{ return JSON.parse(localStorage.getItem(XK()) || '[]'); }catch(_){ return []; } };
  const xsave = L => { try{ localStorage.setItem(XK(), JSON.stringify(L)); }catch(_){} };
  const XLOADED = new Map();   // id -> số đối tượng đang hiển thị
  function fade(hex, k){ let s = String(hex || '#ffffff').replace('#', ''); if(s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); if(!isFinite(n)) return hex; let bg = '#212830'; try{ bg = getCSS('--bg-canvas') || bg; }catch(_){} const b = parseInt(String(bg).replace('#', ''), 16) || 0x212830;
    const mix = (a, c) => Math.round(a * (1 - k) + c * k); const r = mix((n >> 16) & 255, (b >> 16) & 255), g = mix((n >> 8) & 255, (b >> 8) & 255), bl = mix(n & 255, b & 255); return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0'); }
  async function parseRef(kind, data){
    const sv = [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF];
    try{
      if(kind === 'dwg'){ const lib = await getLibreDwg(); const ptr = lib.dwg_read_data(data.slice(0), _DwgType.DWG); if(ptr == null) throw new Error('dwg'); const dbx = lib.convert(ptr); try{ lib.dwg_free(ptr); }catch(_){}
        buildLayerColors(dbx); const recs = (dbx.tables && dbx.tables.BLOCK_RECORD && dbx.tables.BLOCK_RECORD.entries) || []; const blocks = buildBlockDefs(dbx, recs); return { ents: mergeText(resolveBlocks(dwgList(dbx.entities), blocks)), lt: Object.assign({}, LAYER_LT), lts: LTSCALE }; }
      const r = parseDXF(typeof data === 'string' ? data : new TextDecoder().decode(data)); return { ents: mergeText(resolveBlocks(r.entities, r.blocks)), lt: Object.assign({}, LAYER_LT), lts: LTSCALE };
    } finally { [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF] = sv; }
  }
  // DesignCenter: đọc file nguồn, giữ ngữ cảnh lớp/kiểu nét của file đó để chèn khối đúng màu
  A.dcLoad = async function(kind, data){
    const sv = [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF]; let ctxG = null, blocks = {}, nEnt = 0;
    try{
      if(kind === 'dwg'){ const lib = await getLibreDwg(); const ptr = lib.dwg_read_data(data.slice(0), _DwgType.DWG); if(ptr == null) throw new Error('dwg'); const dbx = lib.convert(ptr); try{ lib.dwg_free(ptr); }catch(_){}
        buildLayerColors(dbx); const recs = (dbx.tables && dbx.tables.BLOCK_RECORD && dbx.tables.BLOCK_RECORD.entries) || []; blocks = buildBlockDefs(dbx, recs); nEnt = (dbx.entities || []).length; }
      else { const r = parseDXF(typeof data === 'string' ? data : new TextDecoder().decode(data)); blocks = r.blocks || {}; nEnt = (r.entities || []).length; }
      ctxG = [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF];
    } finally { [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF] = sv; }
    const names = Object.keys(blocks).filter(n => n && !n.startsWith('*') && !/^_/.test(n) && (blocks[n].entities || []).length).sort();
    return { names, nEnt, layers: Object.assign({}, ctxG[0]), layerLT: Object.assign({}, ctxG[2]), ltypes: Object.assign({}, ctxG[4]), count: n => (blocks[n] && blocks[n].entities || []).length,
      make(name, x, y, sc, rot){ const sv2 = [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF]; [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF] = ctxG;
        try{ return resolveBlocks([{ type: 'INSERT', layer: '0', name, ix: x, iy: y, sx: sc || 1, sy: sc || 1, rot: rot || 0, cols: 1, rows: 1, csp: 0, rsp: 0 }], blocks, true); } finally { [LAYER_COLORS, HIDDEN_LAYERS, LAYER_LT, LAYER_LW, LTYPES, LTSCALE, STYLE_FONTS, STYLE_WF] = sv2; } } };
  };
  function placeRef(ents, X, refLT){
    const r = (X.rot || 0) * D2R, c = Math.cos(r) * (X.sc || 1), s = Math.sin(r) * (X.sc || 1); const M = { a: c, b: s, c: -s, d: c, e: X.ins.x, f: X.ins.y };
    const pre = X.name.replace(/\.[^.]+$/, '') + '|'; const out = [];
    for(const e0 of ents){ const e = A.xformEnt ? A.xformEnt(deep(e0), M) : deep(e0); const ly = e.layer || '0'; e.layer = pre + ly; if(!e.lt && refLT && refLT[ly]) e.lt = refLT[ly]; e.xr = X.id; if(X.fade !== false) e.col = fade(e.col, 0.45); delete e.grp; delete e.bm; delete e.bip; out.push(e); }
    return out;
  }
  function removeRefEnts(id){ let n = 0; for(let i = modelEntities.length - 1; i >= 0; i--) if(modelEntities[i].xr === id){ modelEntities.splice(i, 1); n++; } if(n){ bbDirty = true; try{ invalidateSnap(); buildLayerList(); }catch(_){} } XLOADED.delete(id); return n; }
  async function loadRef(X){
    const blob = await idbGet('xref:' + X.id); if(!blob){ X.missing = true; return 0; }
    const data = X.kind === 'dwg' ? blob : await new Response(blob).text();
    const p = await parseRef(X.kind, data); removeRefEnts(X.id);
    const ents = placeRef(p.ents, X, p.lt); for(const e of ents) modelEntities.push(e);
    XLOADED.set(X.id, ents.length); bbDirty = true; try{ invalidateSnap(); buildLayerList(); }catch(_){} X.missing = false; return ents.length;
  }
  let _xLoadTok = 0;
  async function loadAllRefs(){ const tok = ++_xLoadTok; const L = xrefs(); if(!L.length) return; const key = bkey();
    for(const X of L){ if(tok !== _xLoadTok || key !== bkey()) return; try{ if(!isModelView() || X.unloaded) continue; await loadRef(X); }catch(err){ console.warn('xref', err); } }
    try{ draw(); A.paint(); }catch(_){} }
  const _onLoadX = A.onLoad; A.onLoad = function(){ if(_onLoadX) _onLoadX.apply(this, arguments); XLOADED.clear(); setTimeout(loadAllRefs, 30); };
  cmd(['XATTACH', 'XA'], 'Gắn bản vẽ tham chiếu ngoài (DWG/DXF) làm nền', async () => {
    const f = await pickFile('.dwg,.dxf'); if(!f) return; const kind = /\.dwg$/i.test(f.name) ? 'dwg' : 'dxf';
    log('Đang đọc ' + f.name + '…');
    let p; try{ p = await parseRef(kind, kind === 'dwg' ? await f.arrayBuffer() : await f.text()); }catch(err){ console.error(err); say('Không đọc được file tham chiếu.'); return; }
    if(!p.ents.length){ say('File tham chiếu không có hình.'); return; }
    const X = { id: uid('X'), name: f.name, kind, ins: { x: 0, y: 0 }, sc: 1, rot: 0, fade: true, t: Date.now() };
    const pv = p.ents.slice(0, 3000);
    const r = await A.getPoint('Chỉ định điểm chèn tham chiếu (Enter = 0,0)', { kw: [{ k: 'S', t: 'Tỉ lệ' }], preview: (g, q) => g.shift(pv, q.x, q.y, '#8fb3d9') });
    if(r.kw === 'S'){ const v = await A.getNum('Tỉ lệ', { def: 1 }); if(v.num > 0) X.sc = v.num; const r2 = await A.getPoint('Chỉ định điểm chèn'); if(r2.pt) X.ins = r2.pt; }
    else if(r.pt) X.ins = r.pt;
    try{ await idbPut('xref:' + X.id, f); }catch(_){ say('Không lưu được file tham chiếu (bộ nhớ trình duyệt đầy?).'); return; }
    const L = xrefs(); L.push(X); xsave(L);
    const ents = placeRef(p.ents, X, p.lt); for(const e of ents) modelEntities.push(e); XLOADED.set(X.id, ents.length);
    bbDirty = true; try{ invalidateSnap(); buildLayerList(); }catch(_){} draw(); A.paint();
    log('Đã gắn tham chiếu ' + f.name + ' (' + ents.length + ' đối tượng, chỉ xem — bắt điểm được). Quản lý: lệnh XREF.');
    if(xrD && xrD.render) xrD.render();
  });
  // External References (như AutoCAD 2027: bảng nổi, danh sách File References + Details, menu chuột phải Open / Attach / Unload / Reload / Detach / Bind)
  let xrD = null;
  function openXrefManager(){
    if(!hasDoc()){ say('Mở bản vẽ trước.'); return; }
    if(xrD && document.body.contains(xrD.root)){ xrD.render(); return; }
    const K = A.acw; let sel = null; const sizes = new Map();
    const st = X => X.unloaded ? 'Đã gỡ nạp' : X.missing ? 'Không tìm thấy' : XLOADED.has(X.id) ? 'Đã nạp' : 'Chưa nạp';
    const kb = n => n == null ? '' : n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
    const dt = t => t ? new Date(t).toLocaleDateString() : '';
    const html = '<div class="acw xr-pal"><div class="lm-tb"><button type="button" data-a="add" title="Gắn DWG / DXF…">' + (A.ico ? A.ico('XATTACH') : '＋') + '</button><button type="button" data-a="rla" title="Nạp lại tất cả tham chiếu">' + (A.ico ? A.ico('REGEN') : '⟳') + '</button><span class="sp"></span><span class="acw-note" style="margin:0">Gắn DWG…</span></div>' +
      '<div class="acw-lab">Tham chiếu file</div><div class="ls-grid" style="height:190px"><table><thead><tr><th>Tên tham chiếu</th><th>Trạng thái</th><th>Dung lượng</th><th>Loại</th><th>Ngày</th><th style="width:100%">Đường dẫn lưu</th></tr></thead><tbody id="xrB"></tbody></table></div>' +
      '<div class="acw-lab" style="margin-top:8px">Chi tiết</div><div class="pg-det" id="xrD" style="height:auto;min-height:150px"></div>' +
      '<div class="acw-note">Tham chiếu chỉ để xem và bắt điểm, không ghi vào file khi lưu. Bấm chuột phải vào tham chiếu để Mở / Gỡ nạp / Nạp lại / Gỡ / Gộp.</div></div>';
    xrD = A.dialog({ title: 'Tham chiếu ngoài', cls: 'acw-free', help: 'XREF', html, noOk: true, cancelText: 'Đóng', modeless: true, cancel: () => { xrD = null; } });
    const root = xrD.root, $ = id => root.querySelector('#' + id); root.querySelector('.modal').style.width = '560px';
    const render = () => { if(!document.body.contains(root)) return; const L = xrefs(); if(sel && sel !== '*' && !L.some(x => x.id === sel)) sel = null;
      // kích thước file: đọc bất đồng bộ từ bộ nhớ, mỗi tham chiếu một lần
      for(const X of L) if(!sizes.has(X.id)){ sizes.set(X.id, null); idbGet('xref:' + X.id).then(b => { if(b){ sizes.set(X.id, b.size); render(); } }).catch(() => {}); }
      const me = String((typeof currentName !== 'undefined' && currentName) || 'Bản vẽ');
      $('xrB').innerHTML = '<tr data-id="*"' + (sel === '*' ? ' class="sel"' : '') + '><td translate="no"><b>' + esc(me.replace(/\.[^.]+$/, '')) + '</b></td><td>Đang mở</td><td></td><td></td><td></td><td></td></tr>' +
        L.map(X => '<tr data-id="' + X.id + '"' + (sel === X.id ? ' class="sel"' : '') + '><td translate="no">' + esc(X.name.replace(/\.[^.]+$/, '')) + '</td><td style="color:' + (XLOADED.has(X.id) && !X.unloaded ? '#e8ecf2' : '#ffb347') + '">' + st(X) + '</td><td>' + kb(sizes.get(X.id)) + '</td><td>Gắn</td><td>' + dt(X.t) + '</td><td translate="no">' + esc(X.name) + '</td></tr>').join('');
      details(); };
    xrD.render = render;
    const details = () => { const L = xrefs(), X = L.find(x => x.id === sel); const row = (k, v) => '<span>' + k + '</span><span translate="no">' + esc(v) + '</span>';
      if(sel === '*'){ $('xrD').innerHTML = '<div class="dp-info">' + row('Tên tham chiếu:', String((typeof currentName !== 'undefined' && currentName) || '')) + row('Số tham chiếu:', String(L.length)) + '</div>'; return; }
      if(!X){ $('xrD').innerHTML = '<span class="acw-note" style="margin:0">Chọn một tham chiếu để xem chi tiết.</span>'; return; }
      $('xrD').innerHTML = '<div class="dp-info">' + row('Tên tham chiếu:', X.name.replace(/\.[^.]+$/, '')) + '<span>Trạng thái:</span><span>' + st(X) + '</span>' + row('Dung lượng:', kb(sizes.get(X.id)) || '—') + '<span>Loại:</span><span>Gắn (Attach)</span>' + row('Ngày:', dt(X.t) || '—') +
        row('Số đối tượng:', String(XLOADED.get(X.id) || 0)) + row('Điểm chèn:', (+X.ins.x).toFixed(2) + ', ' + (+X.ins.y).toFixed(2)) + row('Tỉ lệ:', String(X.sc || 1)) + row('Góc xoay:', String(X.rot || 0) + '°') + '<span>Làm mờ:</span><span><label class="acw-ck" style="margin:0"><input type="checkbox" id="xrF"' + (X.fade !== false ? ' checked' : '') + '><span>Làm mờ tham chiếu</span></label></span>' + row('Đường dẫn lưu:', X.name) + '</div>';
      const f = $('xrF'); if(f) f.onchange = async () => { X.fade = f.checked; xsave(L); if(!X.unloaded) await loadRef(X); draw(); }; };
    const act = async (a, id) => { const L = xrefs(); const X = L.find(x => x.id === id);
      if(a === 'add'){ DVDCmd.run('XATTACH'); return; }
      if(a === 'rla'){ for(const Y of L) if(!Y.unloaded) await loadRef(Y); xsave(L); draw(); render(); log('Đã nạp lại ' + L.filter(Y => !Y.unloaded).length + ' tham chiếu.'); return; }
      if(!X) return;
      if(a === 'rl'){ X.unloaded = false; const n = await loadRef(X); xsave(L); draw(); log(n ? 'Đã nạp lại ' + X.name : 'Không tìm thấy dữ liệu tham chiếu ' + X.name); }
      if(a === 'ul'){ removeRefEnts(id); X.unloaded = true; xsave(L); draw(); log('Đã gỡ nạp ' + X.name + ' (vẫn giữ trong danh sách).'); }
      if(a === 'dt'){ removeRefEnts(id); xsave(L.filter(x => x.id !== id)); idbDel('xref:' + id); sel = null; draw(); log('Đã gỡ tham chiếu ' + X.name + '.'); }
      if(a === 'bd'){ const ents = modelEntities.filter(x => x.xr === id).map(x => { const w = deep(x); delete w.xr; w.layer = String(w.layer).replace('|', '$0$'); return w; }); removeRefEnts(id); xsave(L.filter(x => x.id !== id)); A.commit({ add: ents }, 'Đã gộp tham chiếu ' + X.name + ' (' + ents.length + ' đối tượng)'); sel = null; }
      if(a === 'op'){ const blob = await idbGet('xref:' + id); if(!blob){ say('Không còn dữ liệu file.'); return; } xrD.close(); xrD = null; if(X.kind === 'dwg') loadDWG(await blob.arrayBuffer(), X.name); else loadDXF(await new Response(blob).text(), X.name); return; }
      render(); };
    root.querySelector('.lm-tb').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(b) act(b.dataset.a); });
    $('xrB').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if(!tr) return; sel = tr.dataset.id; render(); });
    $('xrB').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-id]'); if(tr && tr.dataset.id !== '*') act('op', tr.dataset.id); });
    $('xrB').addEventListener('contextmenu', e => { const tr = e.target.closest('tr[data-id]'); e.preventDefault(); if(tr){ sel = tr.dataset.id; render(); } const id = sel && sel !== '*' ? sel : null; const X = id && xrefs().find(x => x.id === id);
      if(A.acwMenu) A.acwMenu(e.clientX, e.clientY, [['Mở', () => act('op', id), !id], ['Gắn…', () => act('add')], null, ['Gỡ nạp', () => act('ul', id), !id || (X && X.unloaded)], ['Nạp lại', () => act('rl', id), !id], ['Gỡ', () => act('dt', id), !id], ['Gộp…', () => A.dialog({ title: 'Gộp tham chiếu', help: 'XREF', html: '<div class="acw" style="max-width:380px">Gộp "' + esc(X ? X.name : '') + '" thành đối tượng thường của bản vẽ? Không gỡ lại được bằng XREF.</div>', okText: 'Gộp', ok: () => act('bd', id) }), !id || (X && X.unloaded)]]); });
    root.querySelector('.modal').addEventListener('pointerenter', render);
    render();
  }
  plain(['XREF', 'XR', 'ER', 'EXTERNALREFERENCES'], 'Quản lý tham chiếu ngoài (nạp lại, gỡ, gộp, mở)', () => openXrefManager());

  /* =====================================================================
     4) LAYOUT GIẤY: khổ giấy + khung tên + khung nhìn theo tỉ lệ
     ===================================================================== */
  const PAPERS = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };
  const LK = () => 'ulay::' + bkey();
  const ulays = () => { try{ return JSON.parse(localStorage.getItem(LK()) || '[]'); }catch(_){ return []; } };
  const usave = L => { try{ localStorage.setItem(LK(), JSON.stringify(L)); }catch(_){} };
  const mmU = () => { try{ return unitToMM() || 1; }catch(_){ return 1; } };
  function frameOf(D){ const [W, H] = D.size; const big = Math.max(W, H) > 420; const m = big ? 10 : 5; return { x0: 20, y0: m, x1: W - m, y1: H - m }; }
  function sheetPrims(D){
    const out = sheetBase(D); const o = D.org;
    if(o && (o[0] || o[1])) for(const e of out){ const [dx, dy] = o;   // gốc tờ giấy của layout lấy từ tệp
      if(e.type === 'LINE'){ e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy; } else if(e.vertices) e.vertices = e.vertices.map(p => ({ x: p.x + dx, y: p.y + dy })); else if(e.x != null){ e.x += dx; e.y += dy; } }
    (D.vps || []).forEach((v, vi) => { out.push({ type: 'POLYLINE', layer: 'VPORTS', vertices: [{ x: v.x, y: v.y }, { x: v.x + v.w, y: v.y }, { x: v.x + v.w, y: v.y + v.h }, { x: v.x, y: v.y + v.h }], closed: true, col: '#5fa8ff', vpf: 1, vpi: vi }); });
    return out;
  }
  function sheetBase(D){
    const [W, H] = D.size; const F = frameOf(D); const out = []; const col = '#ffffff', c2 = '#c8ccd2';
    const L = (x1, y1, x2, y2, lw) => out.push({ type: 'LINE', layer: 'KHUNG', x1, y1, x2, y2, col, lw });
    const T = (x, y, h, text, ha, bold) => { if(text) out.push({ type: 'TEXT', layer: 'KHUNG', x, y, h, text, ha: ha || 'left', va: 'middle', rot: 0, col, ff: 'Arial' }); };
    out.push({ type: 'POLYLINE', layer: 'GIAY', vertices: [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }], closed: true, col: '#6c7686', vpf: 1 });
    if(D.frame !== false) out.push({ type: 'POLYLINE', layer: 'KHUNG', vertices: [{ x: F.x0, y: F.y0 }, { x: F.x1, y: F.y0 }, { x: F.x1, y: F.y1 }, { x: F.x0, y: F.y1 }], closed: true, col, lw: 70 });
    if(D.tb !== false){
      const tb = D.tbv || {}; const w = 180, h = 40, x0 = F.x1 - w, y0 = F.y0, x1 = F.x1, y1 = y0 + h;
      out.push({ type: 'POLYLINE', layer: 'KHUNG', vertices: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], closed: true, col, lw: 50 });
      const r = [y0 + 8, y0 + 16, y0 + 24, y0 + 32];
      L(x0, r[3], x1, r[3]); L(x0 + 110, r[2], x1, r[2]); L(x0, r[1], x0 + 110, r[1]); L(x0 + 110, r[1], x1, r[1]); L(x0, r[0], x1, r[0]);
      L(x0 + 110, y0, x0 + 110, r[3]); L(x0 + 25, y0, x0 + 25, r[1]); L(x0 + 145, y0, x0 + 145, r[2]);
      L(x0 + 75, y0, x0 + 75, r[1]);
      T(x0 + 2, (r[3] + y1) / 2, 3.5, tb.cty || 'CÔNG TRÌNH: …', 'left'); T(x0 + 2, (r[1] + r[3]) / 2, 5, tb.bv || (D.name || 'TÊN BẢN VẼ'), 'left');
      T(x0 + 112, (r[2] + r[3]) / 2, 2.5, 'TỈ LỆ', 'left'); T(x0 + 147, (r[2] + r[3]) / 2, 3, tb.tl || vpScaleText(D), 'left');
      T(x0 + 112, (r[1] + r[2]) / 2, 2.5, 'NGÀY', 'left'); T(x0 + 147, (r[1] + r[2]) / 2, 3, tb.ngay || new Date().toLocaleDateString('vi-VN'), 'left');
      T(x0 + 2, (r[0] + r[1]) / 2, 2.5, 'THIẾT KẾ', 'left'); T(x0 + 27, (r[0] + r[1]) / 2, 3, tb.tk || '', 'left'); T(x0 + 77, (r[0] + r[1]) / 2, 2.5, 'KÝ', 'left');
      T(x0 + 2, (y0 + r[0]) / 2, 2.5, 'KIỂM TRA', 'left'); T(x0 + 27, (y0 + r[0]) / 2, 3, tb.kt || '', 'left'); T(x0 + 77, (y0 + r[0]) / 2, 2.5, 'KÝ', 'left');
      T(x0 + 112, (r[0] + r[1]) / 2, 2.5, 'SỐ BẢN VẼ', 'left'); T(x0 + 112, (y0 + r[0]) / 2, 4, tb.so || 'KT-01', 'left');
      T(x0 + 112, (r[3] + y1) / 2, 2.5, tb.dv || 'ĐƠN VỊ THIẾT KẾ', 'left');
      void c2;
    }
    return out;
  }
  function vpScaleText(D){ const v = (D.vps || [])[0]; return v ? '1:' + (+v.n.toPrecision(4)) : ''; }
  // đối tượng vẽ trên giấy (paper space) của layout: D.ps — giữ nguyên tham chiếu qua các lần dựng lại layout (cho chọn / hoàn tác)
  const PSLIVE = new Map();
  const psSer = L => JSON.stringify((L || []).map(e => { const o = Object.assign({}, e); delete o.userAdded; return o; }));
  function psOf(D){ const key = bkey() + '::' + D.name, live = PSLIVE.get(key), cur = Array.isArray(D.ps) ? D.ps : [];
    if(live && live !== cur && psSer(live) === psSer(cur)){ D.ps = live; return live; } for(const e of cur) if(e) e.userAdded = true; PSLIVE.set(key, cur); D.ps = cur; return cur; }
  function toLayout(D){
    const k = n => mmU() / n;   // mm giấy trên 1 đơn vị bản vẽ
    const vps = (D.vps || []).map(v => ({ vcx: v.x + v.w / 2, vcy: v.y + v.h / 2, w: v.w, h: v.h, dcx: v.cx, dcy: v.cy, vh: v.h / k(v.n), vx: v.vx || undefined }));
    return { name: D.name, tabOrder: 100 + (D.ord || 0), isModel: false, user: true, def: D, paper: { paperPrims: sheetPrims(D).concat(psOf(D)), viewports: vps } };
  }
  function installLayouts(){
    // dựng lại danh sách tab: layout của tệp (giữ thứ tự; layout đã chuyển thay đúng chỗ, đã xoá thì ẩn) + layout tự tạo theo định nghĩa đã lưu
    const F = dwgLayouts._file || dwgLayouts.filter(x => !x.user && !x._auto);
    const cur = dwgLayouts[currentLayout], curNm = cur ? (cur.isModel ? null : cur.name) : null;
    const L = ulays(), out = [], fromF = new Map();
    for(const D of L) if(D.from != null && F.some(X => !X.isModel && X.name === D.from)) fromF.set(D.from, D);
    for(const X of F){ const D = X.isModel ? null : fromF.get(X.name); if(!D){ out.push(X); continue; } if(D.gone) continue;
      const T = toLayout(D); T.tabOrder = X.tabOrder; T.fileL = X; out.push(T); }
    L.forEach((D, i) => { D.ord = i; if(D.gone || (D.from != null && fromF.get(D.from) === D)) return; out.push(toLayout(D)); });
    if(out.length && !out.some(x => x.isModel)) out.unshift({ name: 'Model', tabOrder: 0, isModel: true, paper: null, _auto: true });
    dwgLayouts.length = 0; for(const x of out) dwgLayouts.push(x); dwgLayouts._file = F;
    const k = curNm == null ? dwgLayouts.findIndex(x => x.isModel) : dwgLayouts.findIndex(x => x.name === curNm);
    currentLayout = k >= 0 ? k : 0;
    try{ if(A.renderLT) A.renderLT(); }catch(_){}
  }
  // layout đọc từ tệp (DWG/DXF) → layout DVDCAD sửa được: đối tượng giấy của tệp → D.ps (giữ nguyên đối tượng), khung nhìn → D.vps
  function fileDef(L){
    if(!L || L.user || L.isModel || !L.paper) return null;
    const P = L.paper, ps = (P.paperPrims || []).filter(e => e && !e.vpf);
    const vps = (P.viewports || []).map((v, k) => { const o = { x: v.vcx - v.w / 2, y: v.vcy - v.h / 2, w: v.w, h: v.h, n: v.vh * mmU() / v.h, cx: v.dcx, cy: v.dcy }; let vx = null; try{ vx = window.vpExtra ? window.vpExtra(L, k) : v.vx; }catch(_){} if(vx) o.vx = JSON.parse(JSON.stringify(vx)); return o; });
    let b = P.lim ? { x0: P.lim.x0, y0: P.lim.y0, x1: P.lim.x1, y1: P.lim.y1 } : null;
    if(!b){ let a = Infinity, c = Infinity, d = -Infinity, f = -Infinity; const add = bb => { if(!bb) return; if(bb.x0 < a) a = bb.x0; if(bb.y0 < c) c = bb.y0; if(bb.x1 > d) d = bb.x1; if(bb.y1 > f) f = bb.y1; };
      for(const e of ps){ try{ add(entBBox(e)); }catch(_){} } for(const v of vps) add({ x0: v.x, y0: v.y, x1: v.x + v.w, y1: v.y + v.h });
      if(isFinite(a)){ const m = Math.max(d - a, f - c) * 0.03; b = { x0: a - m, y0: c - m, x1: d + m, y1: f + m }; } else b = { x0: 0, y0: 0, x1: 420, y1: 297 }; }
    const W = b.x1 - b.x0, H = b.y1 - b.y0; const pk = Object.keys(PAPERS).find(k => { const p = PAPERS[k]; return (Math.abs(p[0] - W) < 1 && Math.abs(p[1] - H) < 1) || (Math.abs(p[1] - W) < 1 && Math.abs(p[0] - H) < 1); });
    return { name: L.name, from: L.name, paper: pk || 'custom', land: W >= H, size: [W, H], org: [b.x0, b.y0], tb: false, frame: false, tbv: {}, vps, ps };
  }
  // chuyển layout thứ i (của tệp) thành layout sửa được — giữ nguyên chỗ tab, đối tượng đang chọn vẫn là đối tượng giấy
  function convertFile(i, quiet){
    const L = dwgLayouts[i]; const D = fileDef(L); if(!D) return null;
    const LL = ulays().filter(x => !(x.from === D.from)); LL.push(D);
    try{ localStorage.setItem(LK(), JSON.stringify(LL)); }catch(err){ say('Không lưu được layout "' + D.name + '" (bộ nhớ trình duyệt đầy?).'); console.warn('layout', err); return null; }
    PSLIVE.set(bkey() + '::' + D.name, D.ps); for(const e of D.ps) if(e) e.userAdded = true;
    const cur = currentLayout === i; installLayouts(); const j = dwgLayouts.findIndex(x => x.user && x.name === D.name);
    if(j >= 0 && cur){ currentLayout = j; entities = buildPaperEntities(dwgLayouts[j]); bbDirty = true; try{ invalidateSnap(); }catch(_){} try{ draw(); A.paint(); }catch(_){} }
    try{ if(A.renderLT) A.renderLT(); }catch(_){}
    if(!quiet) log('Layout "' + D.name + '" của tệp đã chuyển thành layout sửa được (' + D.ps.length + ' đối tượng giấy, ' + D.vps.length + ' khung nhìn).');
    return j >= 0 ? dwgLayouts[j] : null;
  }
  A.layoutFromFile = convertFile; A.fileLayoutDef = fileDef;
  A.userLayoutDefs = () => ulays();
  // mở lại DXF/DWG do DVDCAD ghi: định nghĩa layout kèm trong tệp → thay layout cùng tên của tệp (khi máy chưa có bản riêng cho tệp này)
  A.seedLayoutDefs = defs => { try{ if(ulays().length || !Array.isArray(defs)) return; usave(defs.filter(D => D && D.name && D.size).map(D => Object.assign({}, D, { from: D.name }))); }catch(err){ console.warn('layout', err); } };
  A.isFileLayout = L => !!(L && !L.user && !L.isModel && L.paper);
  function curUser(){ try{ const L = dwgLayouts[currentLayout]; return L && L.user ? L : null; }catch(_){ return null; } }
  A.curUserLayout = curUser;
  function refreshLayout(nameKeep){
    installLayouts(); const i = dwgLayouts.findIndex(L => L.user && L.name === nameKeep);
    if(i >= 0){ if(i === currentLayout){ entities = buildPaperEntities(dwgLayouts[i]); bbDirty = true; try{ invalidateSnap(); }catch(_){} draw(); A.paint(); } else switchLayout(i); }
    try{ if(A.renderLT) A.renderLT(); }catch(_){}
  }
  const _onLoadL = A.onLoad; let _inInstall = false;
  A.onLoad = function(){ if(_onLoadL) _onLoadL.apply(this, arguments); if(_inInstall) return; _inInstall = true; try{ if(!curUser()) installLayouts(); }finally{ _inInstall = false; } };
  function modelExtents(){ let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for(const e of modelEntities){ if(e.xr) continue; const bb = entBBox(e); if(!bb) continue; if(bb.x0 < a) a = bb.x0; if(bb.y0 < b) b = bb.y0; if(bb.x1 > c) c = bb.x1; if(bb.y1 > d) d = bb.y1; } return isFinite(a) ? { x0: a, y0: b, x1: c, y1: d } : { x0: 0, y0: 0, x1: 1000, y1: 1000 }; }
  function fitN(vw, vh, ext){ const k = Math.min(vw / Math.max(1e-9, ext.x1 - ext.x0), vh / Math.max(1e-9, ext.y1 - ext.y0)); const n = mmU() / k; const STD = [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 1000, 2000, 5000, 10000]; return STD.find(s => s >= n * 1.02) || Math.ceil(n); }
  function layoutDialog(D, title, onOk){
    const tb = D.tbv || {};
    A.dialog({ title, wide: true, html:
      '<label class="dvd-frow"><span>Tên layout</span><span class="v"><input id="lyN" value="' + esc(D.name) + '"></span></label>' +
      '<label class="dvd-frow"><span>Khổ giấy</span><span class="v"><select id="lyP">' + Object.keys(PAPERS).map(k => '<option' + (k === D.paper ? ' selected' : '') + '>' + k + '</option>').join('') + (PAPERS[D.paper] ? '' : '<option value="custom" selected>' + Math.round(Math.max(...D.size)) + ' × ' + Math.round(Math.min(...D.size)) + '</option>') + '</select> <select id="lyO"><option value="1"' + (D.land ? ' selected' : '') + '>Ngang</option><option value="0"' + (!D.land ? ' selected' : '') + '>Dọc</option></select></span></label>' +
      '<label class="dvd-frow"><span>Khung viền</span><span class="v"><input type="checkbox" id="lyFr"' + (D.frame !== false ? ' checked' : '') + '></span></label>' +
      '<label class="dvd-frow"><span>Khung tên</span><span class="v"><input type="checkbox" id="lyTb"' + (D.tb !== false ? ' checked' : '') + '></span></label>' +
      '<label class="dvd-frow"><span>Công trình</span><span class="v"><input id="lyCt" value="' + esc(tb.cty || '') + '"></span></label><label class="dvd-frow"><span>Tên bản vẽ</span><span class="v"><input id="lyBv" value="' + esc(tb.bv || '') + '"></span></label>' +
      '<label class="dvd-frow"><span>Số bản vẽ</span><span class="v"><input id="lySo" value="' + esc(tb.so || '') + '"></span></label><label class="dvd-frow"><span>Thiết kế / Kiểm tra</span><span class="v"><input id="lyTk" value="' + esc(tb.tk || '') + '" style="width:48%"> <input id="lyKt" value="' + esc(tb.kt || '') + '" style="width:48%"></span></label>' +
      '<label class="dvd-frow"><span>Đơn vị thiết kế</span><span class="v"><input id="lyDv" value="' + esc(tb.dv || '') + '"></span></label>' +
      (D._new ? '<label class="dvd-frow"><span>Khung nhìn đầu tiên — tỉ lệ 1:</span><span class="v"><input id="lyS" placeholder="để trống = vừa khung" style="width:120px"></span></label>' : ''),
      ok: r => { const g = id => r.querySelector('#' + id); const nm = g('lyN').value.trim() || D.name; D.name = nm; D.paper = g('lyP').value; D.land = g('lyO').value === '1'; const p = PAPERS[D.paper]; if(p) D.size = D.land ? [p[1], p[0]] : [p[0], p[1]]; else { const a = Math.max(...D.size), b = Math.min(...D.size); D.size = D.land ? [a, b] : [b, a]; } D.tb = g('lyTb').checked; D.frame = g('lyFr').checked;
        D.tbv = { cty: g('lyCt').value, bv: g('lyBv').value, so: g('lySo').value, tk: g('lyTk').value, kt: g('lyKt').value, dv: g('lyDv').value }; const sc = D._new ? parseFloat(String(g('lyS').value).replace(',', '.')) : NaN; delete D._new; onOk(D, sc > 0 ? sc : null); } });
  }
  plain(['LAYOUT', 'LO', 'LAYOUTNEW'], 'Tạo layout in: khổ giấy, khung tên, khung nhìn theo tỉ lệ', () => {
    if(!hasDoc()){ say('Mở bản vẽ trước.'); return; } if(A.busy()) A.cancel(true);
    if(!isModelView() && !curUser()){ const mi = dwgLayouts.findIndex(L => L.isModel); if(mi >= 0) switchLayout(mi); }
    const L = ulays(); let i = 1; while(L.some(x => x.name === 'Layout' + i) || dwgLayouts.some(x => x.name === 'Layout' + i)) i++;
    const D = { name: 'Layout' + i, paper: 'A3', land: true, size: [420, 297], tb: true, tbv: {}, vps: [], _new: true };
    layoutDialog(D, 'Layout mới', (D2, sc) => {
      let nm = D2.name; while(L.some(x => x.name === nm) || dwgLayouts.some(x => !x.user && x.name === nm)) nm += '_';
      D2.name = nm; const F = frameOf(D2); const top = D2.tb !== false ? F.y0 + 40 + 4 : F.y0 + 4;
      const vx = F.x0 + 4, vy = top, vw = F.x1 - F.x0 - 8, vh = F.y1 - top - 4; const ext = modelExtents();
      const n = sc || fitN(vw, vh, ext);
      D2.vps = [{ x: vx, y: vy, w: vw, h: vh, n, cx: (ext.x0 + ext.x1) / 2, cy: (ext.y0 + ext.y1) / 2 }];
      L.push(D2); usave(L); installLayouts(); const j = dwgLayouts.findIndex(x => x.user && x.name === nm); if(j >= 0) switchLayout(j);
      log('Đã tạo layout "' + nm + '" khổ ' + D2.paper + ', khung nhìn 1:' + n + '. MVIEW để thêm khung nhìn, VPEDIT để chỉnh tỉ lệ/tâm, PLOT để in.');
    });
  });
  function needUser(){ const U = curUser() || (A.ensurePaperLayout ? A.ensurePaperLayout() : null); if(!U){ log('Chuyển sang một layout do bạn tạo (lệnh LAYOUT) trước.'); return null; } return U; }
  function saveDef(D){ const L = ulays(); const i = L.findIndex(x => x.name === D.name); if(i >= 0) L[i] = D; else L.push(D); usave(L); refreshLayout(D.name); }
  cmd(['MVIEW', 'MV'], 'Tạo khung nhìn (viewport) trên layout theo tỉ lệ', async () => {
    const U = needUser(); if(!U) return; const D = deep(U.def);
    const a = await A.getPoint('Chỉ định góc thứ nhất của khung nhìn (trên giấy)'); if(!a.pt) return;
    const b = await A.getPoint('Chỉ định góc đối diện', { base: a.pt, rubber: false, preview: (g, p) => g.poly([a.pt, { x: p.x, y: a.pt.y }, p, { x: a.pt.x, y: p.y }], true, '#5fa8ff', [6, 4]) }); if(!b.pt) return;
    const x = Math.min(a.pt.x, b.pt.x), y = Math.min(a.pt.y, b.pt.y), w = Math.abs(b.pt.x - a.pt.x), h = Math.abs(b.pt.y - a.pt.y); if(w < 5 || h < 5){ log('Khung quá nhỏ.'); return; }
    const ext = modelExtents(); const def = fitN(w, h, ext);
    const s = await A.getNum('Tỉ lệ khung nhìn 1:N — nhập N', { def }); const n = s.num > 0 ? s.num : def;
    D.vps = (D.vps || []).concat([{ x, y, w, h, n, cx: (ext.x0 + ext.x1) / 2, cy: (ext.y0 + ext.y1) / 2 }]); saveDef(D); log('Đã tạo khung nhìn 1:' + n + ' — dùng VPEDIT để chọn vùng hiển thị.');
  });
  function vpEdit(){
    const U = needUser(); if(!U) return; const D = deep(U.def); if(!(D.vps || []).length){ log('Layout chưa có khung nhìn — dùng MVIEW.'); return; }
    const render = root => { root.querySelector('tbody').innerHTML = D.vps.map((v, i) => '<tr data-i="' + i + '"><td>#' + (i + 1) + '</td><td>' + Math.round(v.w) + '×' + Math.round(v.h) + ' mm</td><td>1:<input data-f="n" value="' + (+v.n.toPrecision(5)) + '" style="width:70px"></td><td><input data-f="cx" value="' + (+v.cx.toFixed(2)) + '" style="width:100px"> , <input data-f="cy" value="' + (+v.cy.toFixed(2)) + '" style="width:100px"></td><td style="white-space:nowrap"><button class="tg" data-a="pick" title="Chọn tâm trên Model">⌖</button><button class="tg" data-a="fit" title="Vừa toàn bản vẽ">⤢</button><button class="tg" data-a="del" title="Xoá khung nhìn">✕</button></td></tr>').join(''); };
    const pull = root => root.querySelectorAll('tr[data-i]').forEach(tr => { const v = D.vps[+tr.dataset.i]; for(const inp of tr.querySelectorAll('input[data-f]')){ const val = parseFloat(String(inp.value).replace(',', '.')); if(isFinite(val) && (inp.dataset.f !== 'n' || val > 0)) v[inp.dataset.f] = val; } });
    A.dialog({ title: 'Khung nhìn của "' + D.name + '"', wide: true, html: '<div class="lm-tbl"><table><thead><tr><th></th><th>Kích thước</th><th>Tỉ lệ</th><th>Tâm vùng hiển thị (toạ độ Model)</th><th></th></tr></thead><tbody></tbody></table></div><p style="margin:6px 0 0">⌖ = về Model, bấm 1 điểm làm tâm khung nhìn. Tỉ lệ 1:N theo đơn vị bản vẽ hiện tại.</p>',
      onOpen: root => { render(root); root.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(!b) return; pull(root); const i = +b.closest('tr').dataset.i; const v = D.vps[i];
        if(b.dataset.a === 'del'){ D.vps.splice(i, 1); render(root); }
        if(b.dataset.a === 'fit'){ const ext = modelExtents(); v.n = fitN(v.w, v.h, ext); v.cx = (ext.x0 + ext.x1) / 2; v.cy = (ext.y0 + ext.y1) / 2; render(root); }
        if(b.dataset.a === 'pick'){ root.remove(); const mi = dwgLayouts.findIndex(L => L.isModel); const back = D.name; if(mi >= 0) switchLayout(mi);
          A.run('VPCENTER', async () => { const r = await A.getPoint('Chỉ định tâm vùng hiển thị cho khung nhìn #' + (i + 1)); if(r.pt){ v.cx = r.pt.x; v.cy = r.pt.y; } saveDef(D); const j = dwgLayouts.findIndex(L => L.user && L.name === back); if(j >= 0) switchLayout(j); }); } }); },
      ok: root => { pull(root); saveDef(D); } });
  }
  plain(['VPEDIT', 'VPSCALE', 'VPORTS'], 'Chỉnh tỉ lệ / vùng hiển thị khung nhìn của layout', () => { if(A.busy()) A.cancel(true); vpEdit(); });
  function layoutMenu(i, x, y){
    const L = dwgLayouts[i]; if(!L || L.isModel) { A.menu(x, y - 60, [{ t: 'Layout mới…', ic: 'LAYOUT', fn: () => DVDCmd.run('LAYOUT') }]); return; }
    const items = [{ t: 'Layout mới…', ic: 'LAYOUT', fn: () => DVDCmd.run('LAYOUT') }];
    const gone = nm => { const LL = ulays().filter(z => z.from !== nm && z.name !== nm); LL.push({ name: nm, from: nm, gone: true }); usave(LL); const mi = dwgLayouts.findIndex(z => z.isModel); if(mi >= 0) switchLayout(mi); installLayouts(); };
    if(!L.user && L.paper){   // layout đọc từ tệp
      items.push({ t: 'Chuyển thành layout sửa được', ic: 'LAYOUT', fn: () => convertFile(i) },
        { t: 'In layout này…', ic: 'PLOT', fn: () => { if(i !== currentLayout) switchLayout(i); setTimeout(() => DVDCmd.run('PLOT'), 50); } },
        { sep: 1 }, { t: 'Xoá layout', ic: 'ERASE', fn: () => { if(confirm('Xoá layout "' + L.name + '"?')) gone(L.name); } });
      A.menu(x, y - items.length * 30 - 10, items); return; }
    if(L.user && L.def && L.def.from != null) items.push({ t: 'Khôi phục layout gốc của tệp', ic: 'UNDO', fn: () => { if(!confirm('Bỏ mọi thay đổi trên layout "' + L.name + '" và lấy lại bản trong tệp?')) return; const nm = L.def.from; usave(ulays().filter(z => z.from !== nm)); installLayouts(); const j = dwgLayouts.findIndex(z => !z.user && z.name === nm); if(j >= 0){ currentLayout = -1; switchLayout(j); } } });
    if(L.user) items.push({ t: 'Khổ giấy & khung tên…', ic: 'SETTINGS', fn: () => { if(i !== currentLayout) switchLayout(i); const D = deep(L.def); const old = D.name; layoutDialog(D, 'Thiết lập layout', D2 => { const LL = ulays(); const k = LL.findIndex(x => x.name === old); if(k >= 0) LL[k] = D2; usave(LL); refreshLayout(D2.name); }); } },
      { t: 'Khung nhìn (tỉ lệ, tâm)…', ic: 'ZW', fn: () => { if(i !== currentLayout) switchLayout(i); setTimeout(vpEdit, 50); } },
      { t: 'In layout này…', ic: 'PLOT', fn: () => { if(i !== currentLayout) switchLayout(i); setTimeout(() => DVDCmd.run('PLOT'), 50); } },
      { sep: 1 }, { t: 'Xoá layout', ic: 'ERASE', fn: () => { if(!confirm('Xoá layout "' + L.name + '"?')) return; if(L.def && L.def.from != null){ gone(L.def.from); return; } const mi = dwgLayouts.findIndex(z => z.isModel); if(mi >= 0) switchLayout(mi); usave(ulays().filter(z => z.name !== L.name)); installLayouts(); } });
    A.menu(x, y - items.length * 30 - 10, items);
  }
  A.layoutMenu = layoutMenu; A.saveLayoutDef = saveDef; A.proIdbGet = idbGet; A.xrefList = xrefs; A.refreshLayout = refreshLayout;
  A.sheetPrims = sheetPrims;
  // lưu định nghĩa layout mà không dựng lại (đối tượng giấy giữ nguyên tham chiếu)
  A.saveLayoutQuiet = D => { const L = ulays(); const o = JSON.parse(JSON.stringify(D, (k, v) => k === 'userAdded' ? undefined : v)); const i = L.findIndex(x => x.name === D.name); if(i >= 0) L[i] = o; else L.push(o); usave(L); };
  const _ofl = A.onLoad; void _ofl;
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
