/* DVDCAD v6o — cộng tác như AutoCAD, chạy cục bộ (không cần tài khoản / dịch vụ đám mây của Autodesk)
   · TRACE (bảng vết can), -TRACE, TRACEFRONT, TRACEBACK, TRACECLOSE: "giấy can" phủ lên bản vẽ — vẽ / ghi chú trên vết can mà không
     sửa bản vẽ; Trước = sửa vết can (bản vẽ mờ, khoá), Sau = sửa bản vẽ (vết can mờ phía sau, khoá). Vết can lưu kèm DWG / DXF
     (DVDCAD_DATA), không lẫn vào hình học của bản vẽ, không in. Lệnh TRACE cũ (nét có độ rộng) đổi tên thành TRACEWIDE.
   · DESIGNFEEDOPEN / DESIGNFEEDCLOSE: bảng Design Feed — bình luận, trả lời, gắn vị trí (bong bóng số trên bản vẽ), đánh dấu đã xong;
     lưu kèm bản vẽ
   · SHAREVIEW: chia sẻ góc nhìn — một tệp .html tự chứa (bản vẽ dạng vector SVG, phóng / kéo, các layout, bình luận) mở bằng trình duyệt bất kỳ
   · PUSHTODOCS: xuất các layout ra PDF (một tệp hoặc mỗi layout một tệp trong .zip) để đưa lên hệ thống tài liệu
   · PUSHTOWEB: đưa bản vẽ sang DVDCAD Web (Google Drive nếu đã cấu hình, nếu không: lưu DXF và mở DVDCAD Web)
   · UPLOADTOCLOUD: tải bản vẽ lên Google Drive (cấu hình trong Tuỳ chọn đám mây) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x39 || !window.DVDCmd) return; A._x39 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ if(v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const docName = () => (typeof currentName === 'string' && currentName) || '';
  const docBase = () => String(docName() || 'banve').replace(/\.[^.]+$/, '');
  const who = () => { try{ const v = A.sysvar && A.sysvar.get ? A.sysvar.get('LOGINNAME') : null; return String(v || 'User'); }catch(_){ return 'User'; } };
  const fmtT = t => { try{ return new Date(t).toLocaleString(); }catch(_){ return String(t); } };
  const redraw = () => { try{ draw(); }catch(_){} try{ A.paint(); }catch(_){} };
  const dirty = () => { try{ bbDirty = true; snapDirty = true; }catch(_){} };
  const save = (blob, name, mime) => (typeof shareOrDownload === 'function' ? shareOrDownload(blob, name, mime) : Promise.resolve());
  const panel = (id, title, w) => { let P = document.getElementById(id); if(P) return P; P = document.createElement('div'); P.id = id; P.style.cssText = 'position:absolute;right:8px;top:40px;width:' + (w || 330) + 'px;max-height:calc(100% - 140px);display:flex;flex-direction:column;z-index:40;background:var(--panel,#1c222b);border:1px solid var(--line,#3a4452);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.4);font-size:12px;color:var(--ink,#e6eaf0)';
    P.innerHTML = '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line,#3a4452)"><b style="flex:1">' + esc(title) + '</b><button type="button" data-x="1" title="Đóng">×</button></div><div class="pb" style="overflow:auto;padding:6px 8px"></div>';
    (document.getElementById('cvWrap') || document.querySelector('.canvas-wrap') || document.body).appendChild(P); P.querySelector('[data-x]').onclick = () => { P.remove(); redraw(); }; return P; };

  /* ===================== dữ liệu theo bản vẽ (DVDCAD_DATA → dx) ===================== */
  A.docExt = A.docExt || {};
  const EXT = {};   // khoá → { reset(), apply(v), local() }
  function regExt(k, o){ A.docExt[k] = o; EXT[k] = o; }
  let lastDoc = null;
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); try{
      const F = A._dxFile; A._dxFile = undefined; const nm = docName();
      if(F !== undefined){ for(const k of Object.keys(EXT)){ EXT[k].reset(); if(F[k] != null) EXT[k].apply(F[k]); else EXT[k].local(); } lastDoc = nm; }
      else if(nm !== lastDoc){ for(const k of Object.keys(EXT)){ EXT[k].reset(); EXT[k].local(); } lastDoc = nm; }
      paintAll();
    }catch(err){ console.warn('x39', err); } }; })(A.onLoad);

  /* ===================== VẾT CAN (TRACE) ===================== */
  const TS = { list: [], open: null };   // list: [{ id, name, by, t }], open: { id, mode: 'front' | 'back' }
  const tKey = () => 'dvd:trace::' + docName();
  const tSave = () => SV(tKey(), TS.list.length ? { list: TS.list } : null);
  const tEnts = id => ME().filter(e => e.trc === id);
  const tById = id => TS.list.find(t => t.id === id) || null;
  function tPush(ents){ const have = new Set(ME().filter(e => e.trc).map(e => e.trc)); let n = 0; for(const e of ents || []){ if(!e || !e.trc || have.has(e.trc)) continue; e.userAdded = true; ME().push(e); n++; } if(n) dirty(); return n; }
  regExt('trace', {
    get: () => TS.list.length ? { list: TS.list, ents: ME().filter(e => e.trc && tById(e.trc)).map(copy) } : null,
    reset(){ TS.list = []; TS.open = null; banner(); },
    apply(v){ TS.list = Array.isArray(v.list) ? v.list.filter(t => t && t.id) : []; tPush(v.ents); tSave(); },
    local(){ const v = LS(tKey(), null); if(v && Array.isArray(v.list)) TS.list = v.list; }
  });
  A.hideHook = e => e.trc != null && (!TS.open || TS.open.id !== e.trc);
  A.lockHook = e => !!TS.open && (TS.open.mode === 'front' ? e.trc == null : e.trc != null);
  // vẽ: bản vẽ mờ khi vết can ở trước, vết can mờ khi ở sau; không in vết can
  if(typeof window.drawEntity === 'function'){ const _de = window.drawEntity;
    window.drawEntity = function(e){ if(e && e.trc != null){ try{ if((typeof plotMode !== 'undefined' && plotMode) || (typeof _exporting !== 'undefined' && _exporting)) return; }catch(_){} }
      const O = TS.open; if(!O || !e) return _de.apply(this, arguments);
      const fade = O.mode === 'front' ? e.trc == null : e.trc != null; if(!fade) return _de.apply(this, arguments);
      const c = typeof ctx !== 'undefined' ? ctx : null; if(!c) return _de.apply(this, arguments);
      c.save(); c.globalAlpha *= O.mode === 'front' ? 0.3 : 0.45; try{ return _de.apply(this, arguments); } finally { c.restore(); } }; }
  // đối tượng vẽ mới khi vết can ở trước → thuộc vết can
  { const _np = A.newProps; A.newProps = function(e){ const r = _np.apply(this, arguments); try{ if(e && TS.open && TS.open.mode === 'front') e.trc = TS.open.id; }catch(_){} return r; }; }
  function banner(){ let B = document.getElementById('dvdTraceBar'); const O = TS.open;
    if(!O){ if(B) B.remove(); return; } const t = tById(O.id); if(!t){ TS.open = null; if(B) B.remove(); return; }
    if(!B){ B = document.createElement('div'); B.id = 'dvdTraceBar'; B.style.cssText = 'position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:41;display:flex;gap:6px;align-items:center;padding:4px 10px;border-radius:14px;background:#3b2f63;color:#fff;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.4)';
      (document.getElementById('cvWrap') || document.querySelector('.canvas-wrap') || document.body).appendChild(B);
      B.addEventListener('click', ev => { const b = ev.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a; if(a === 'f') traceMode('front'); if(a === 'b') traceMode('back'); if(a === 'c') traceClose(); }); }
    B.innerHTML = '<b>Vết can:</b> ' + esc(t.name) + ' — ' + (O.mode === 'front' ? 'ở trước (sửa vết can)' : 'ở sau (sửa bản vẽ)') + ' <button type="button" data-a="' + (O.mode === 'front' ? 'b' : 'f') + '">' + (O.mode === 'front' ? 'Đưa ra sau' : 'Đưa lên trước') + '</button><button type="button" data-a="c">Đóng vết can</button>';
  }
  function clearSel(){ try{ selEnts.clear(); }catch(_){} try{ DVDCmd.refreshPalette && DVDCmd.refreshPalette(true); }catch(_){} }
  function traceNew(name){ const id = 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const t = { id, name: String(name || ('Vết can ' + (TS.list.length + 1))), by: who(), t: Date.now() }; TS.list.push(t); tSave(); traceOpen(id, 'front'); log('TRACE: tạo vết can "' + t.name + '" — vẽ / ghi chú lên vết can; bản vẽ không bị sửa.'); return t; }
  function traceOpen(id, mode){ const t = tById(id); if(!t) return false; TS.open = { id, mode: mode || 'front' }; clearSel(); dirty(); banner(); paintTracePanel(); redraw(); return true; }
  function traceMode(mode){ if(!TS.open){ log('Chưa mở vết can nào (TRACE).'); return false; } TS.open.mode = mode; clearSel(); dirty(); banner(); paintTracePanel(); redraw(); log(mode === 'front' ? 'TRACEFRONT: vết can ở trước — vẽ trên vết can, bản vẽ khoá.' : 'TRACEBACK: vết can ở sau — sửa bản vẽ, vết can khoá.'); return true; }
  function traceClose(){ if(!TS.open) return false; const t = tById(TS.open.id); TS.open = null; clearSel(); dirty(); banner(); paintTracePanel(); redraw(); tSave(); log('TRACECLOSE: đã đóng vết can' + (t ? ' "' + t.name + '"' : '') + '.'); return true; }
  function traceDelete(id){ const t = tById(id); if(!t) return false; if(TS.open && TS.open.id === id) TS.open = null; const del = tEnts(id); TS.list = TS.list.filter(x => x.id !== id); tSave(); if(del.length){ for(const e of del){ const i = ME().indexOf(e); if(i >= 0) ME().splice(i, 1); } dirty(); try{ saveGeomEdits(); }catch(_){} } banner(); paintTracePanel(); redraw(); log('Đã xoá vết can "' + t.name + '".'); return true; }
  A.trace = { list: () => TS.list.map(t => Object.assign({ n: tEnts(t.id).length }, t)), state: () => TS.open ? Object.assign({}, TS.open) : null, create: traceNew, open: traceOpen, mode: traceMode, close: traceClose, del: traceDelete, ents: tEnts };
  function paintTracePanel(){ const P = document.getElementById('dvdTrace'); if(!P) return; const body = P.querySelector('.pb'); const O = TS.open;
    body.innerHTML = '<div style="display:flex;gap:6px;margin-bottom:6px"><button type="button" data-a="new">＋ Vết can mới</button>' + (O ? '<button type="button" data-a="' + (O.mode === 'front' ? 'back' : 'front') + '">' + (O.mode === 'front' ? 'Đưa ra sau' : 'Đưa lên trước') + '</button><button type="button" data-a="close">Đóng</button>' : '') + '</div>' +
      (TS.list.length ? TS.list.map(t => { const on = O && O.id === t.id; return '<div data-id="' + esc(t.id) + '" style="padding:5px 6px;margin-bottom:4px;border-radius:5px;border:1px solid ' + (on ? '#8b7bd8' : 'var(--line,#3a4452)') + ';background:' + (on ? 'rgba(139,123,216,.15)' : 'transparent') + '"><div style="display:flex;gap:6px;align-items:center"><b style="flex:1">' + esc(t.name) + '</b><span style="opacity:.7">' + tEnts(t.id).length + ' nét</span></div><div style="opacity:.75">' + esc(t.by || '') + ' · ' + esc(fmtT(t.t)) + '</div><div style="display:flex;gap:4px;margin-top:4px">' + (on ? '' : '<button type="button" data-a="open">Mở</button>') + '<button type="button" data-a="ren">Đổi tên</button><button type="button" data-a="del">Xoá</button></div></div>'; }).join('')
        : '<div style="opacity:.75;white-space:normal">Chưa có vết can. Vết can như tờ giấy can đặt lên bản vẽ: vẽ, ghi chú, góp ý mà không sửa bản vẽ gốc.</div>');
  }
  function tracePanel(){ const P = panel('dvdTrace', 'Vết can (Trace)', 300); if(!P._wired){ P._wired = 1; P.querySelector('.pb').addEventListener('click', async ev => { const b = ev.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a; const row = b.closest('[data-id]'), id = row ? row.dataset.id : null;
      if(a === 'new'){ const nm = window.prompt('Tên vết can', 'Vết can ' + (TS.list.length + 1)); if(nm != null) traceNew(nm.trim() || null); }
      if(a === 'front') traceMode('front'); if(a === 'back') traceMode('back'); if(a === 'close') traceClose();
      if(a === 'open' && id) traceOpen(id, 'front');
      if(a === 'ren' && id){ const t = tById(id); const nm = window.prompt('Tên vết can', t.name); if(nm && nm.trim()){ t.name = nm.trim(); tSave(); paintTracePanel(); banner(); } }
      if(a === 'del' && id){ const t = tById(id); if(window.confirm('Xoá vết can "' + t.name + '" và mọi nét trên nó?')) traceDelete(id); } }); }
    paintTracePanel(); return P; }
  plain(['TRACE'], 'Bảng vết can (Trace): tạo / mở vết can để vẽ, ghi chú, góp ý lên bản vẽ mà không sửa bản vẽ gốc (lưu kèm DWG / DXF)', () => tracePanel());
  cmd(['-TRACE'], 'Vết can bằng dòng lệnh: Mới / Mở / Trước / Sau / Đóng / Danh sách / Xoá', async () => {
    const k = await A.getKw('Vết can', { kw: [{ k: 'N', t: 'Mới' }, { k: 'O', t: 'Mở' }, { k: 'F', t: 'Trước' }, { k: 'B', t: 'Sau' }, { k: 'C', t: 'Đóng' }, { k: 'L', t: 'Danh sách' }, { k: 'D', t: 'Xoá' }], def: 'Mới' }); const kw = k.kw || (k.str ? 'N' : null); if(!kw) return;
    if(kw === 'N'){ const s = await A.getStr('Tên vết can', { def: 'Vết can ' + (TS.list.length + 1) }); traceNew((s.str || '').trim() || null); return; }
    if(kw === 'F') return traceMode('front'); if(kw === 'B') return traceMode('back'); if(kw === 'C'){ if(!traceClose()) log('Chưa mở vết can nào.'); return; }
    if(kw === 'L'){ if(!TS.list.length){ log('Bản vẽ chưa có vết can.'); return; } for(const t of TS.list) log('  ' + t.name + ' — ' + (t.by || '') + ', ' + fmtT(t.t) + ', ' + tEnts(t.id).length + ' nét' + (TS.open && TS.open.id === t.id ? ' (đang mở)' : '')); return; }
    if(!TS.list.length){ log('Bản vẽ chưa có vết can.'); return; }
    const s = await A.getStr('Tên vết can', { def: TS.list[TS.list.length - 1].name }); const t = TS.list.find(x => x.name.toUpperCase() === String(s.str || '').trim().toUpperCase()); if(!t){ log('Không có vết can "' + (s.str || '') + '".'); return; }
    if(kw === 'O') traceOpen(t.id, 'front'); else traceDelete(t.id);
  });
  plain(['TRACEFRONT'], 'Đưa vết can lên trước: vẽ / sửa trên vết can, bản vẽ mờ đi và bị khoá', () => traceMode('front'));
  plain(['TRACEBACK'], 'Đưa vết can ra sau: sửa bản vẽ, vết can hiện mờ phía sau và bị khoá', () => traceMode('back'));
  plain(['TRACECLOSE'], 'Đóng vết can đang mở (nét của vết can ẩn đi, vẫn lưu kèm bản vẽ)', () => { if(!traceClose()) log('Chưa mở vết can nào.'); });

  /* ===================== DESIGN FEED ===================== */
  const FD = { posts: [] };   // posts: [{ id, by, t, txt, at: {x, y} | null, rp: [{ by, t, txt }], done }]
  const fKey = () => 'dvd:feed::' + docName();
  const fSave = () => SV(fKey(), FD.posts.length ? { posts: FD.posts } : null);
  regExt('feed', { get: () => FD.posts.length ? { posts: FD.posts } : null, reset(){ FD.posts = []; }, apply(v){ FD.posts = Array.isArray(v.posts) ? v.posts.filter(p => p && p.id) : []; fSave(); }, local(){ const v = LS(fKey(), null); if(v && Array.isArray(v.posts)) FD.posts = v.posts; } });
  const feedOpen = () => !!document.getElementById('dvdFeed');
  function feedPost(txt, at){ txt = String(txt || '').trim(); if(!txt) return null; const p = { id: 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), by: who(), t: Date.now(), txt, at: at ? { x: at.x, y: at.y } : null, rp: [], done: false }; FD.posts.push(p); fSave(); paintFeed(); redraw(); return p; }
  function feedReply(id, txt){ const p = FD.posts.find(q => q.id === id); txt = String(txt || '').trim(); if(!p || !txt) return null; const r = { by: who(), t: Date.now(), txt }; p.rp.push(r); fSave(); paintFeed(); return r; }
  function feedDone(id, on){ const p = FD.posts.find(q => q.id === id); if(!p) return false; p.done = on == null ? !p.done : !!on; fSave(); paintFeed(); redraw(); return p.done; }
  function feedDel(id){ const n = FD.posts.length; FD.posts = FD.posts.filter(q => q.id !== id); fSave(); paintFeed(); redraw(); return FD.posts.length < n; }
  A.feed = { list: () => FD.posts.map(p => JSON.parse(JSON.stringify(p))), post: feedPost, reply: feedReply, done: feedDone, del: feedDel };
  const pinNo = p => FD.posts.filter(q => q.at).indexOf(p) + 1;
  function zoomTo(p){ if(!p || !p.at) return; try{ const r = Math.max(1e-9, 150 / ((typeof view !== 'undefined' && view.scale) || 1)); zoomToWorldRect(p.at.x - r, p.at.y - r, p.at.x + r, p.at.y + r); }catch(_){} redraw(); }
  function paintFeed(){ const P = document.getElementById('dvdFeed'); if(!P) return; const body = P.querySelector('.pb');
    const L = FD.posts.slice().reverse();
    body.innerHTML = '<div style="margin-bottom:8px"><textarea id="fdTxt" rows="3" style="width:100%;box-sizing:border-box" placeholder="Viết bình luận / góp ý…"></textarea><div style="display:flex;gap:6px;align-items:center;margin-top:4px"><label style="flex:1"><input type="checkbox" id="fdAt"> Gắn vị trí trên bản vẽ</label><button type="button" data-a="post">Đăng</button></div></div>' +
      (L.length ? L.map(p => '<div data-id="' + esc(p.id) + '" style="padding:6px;margin-bottom:6px;border-radius:6px;border:1px solid var(--line,#3a4452);' + (p.done ? 'opacity:.6' : '') + '"><div style="display:flex;gap:6px;align-items:center">' + (p.at ? '<span style="display:inline-block;min-width:18px;height:18px;border-radius:9px;background:' + (p.done ? '#3c9a5f' : '#2f7de1') + ';color:#fff;text-align:center;line-height:18px;font-size:11px">' + pinNo(p) + '</span>' : '') + '<b style="flex:1">' + esc(p.by) + '</b><span style="opacity:.7">' + esc(fmtT(p.t)) + '</span></div><div style="white-space:pre-wrap;margin:4px 0">' + esc(p.txt) + '</div>' +
        p.rp.map(r => '<div style="margin:3px 0 3px 12px;padding-left:6px;border-left:2px solid var(--line,#3a4452)"><b>' + esc(r.by) + '</b> <span style="opacity:.7">' + esc(fmtT(r.t)) + '</span><div style="white-space:pre-wrap">' + esc(r.txt) + '</div></div>').join('') +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">' + (p.at ? '<button type="button" data-a="zoom">Phóng tới</button>' : '') + '<button type="button" data-a="rep">Trả lời</button><button type="button" data-a="done">' + (p.done ? 'Mở lại' : 'Đã xong') + '</button><button type="button" data-a="del">Xoá</button></div></div>').join('')
        : '<div style="opacity:.75;white-space:normal">Chưa có bình luận. Bình luận lưu kèm bản vẽ để người khác mở là thấy.</div>');
  }
  function feedPanel(){ const P = panel('dvdFeed', 'Design Feed', 320); if(!P._wired){ P._wired = 1; P.querySelector('.pb').addEventListener('click', async ev => { const b = ev.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a; const row = b.closest('[data-id]'), id = row ? row.dataset.id : null; const body = P.querySelector('.pb');
      if(a === 'post'){ const txt = body.querySelector('#fdTxt').value; if(!txt.trim()){ say('Chưa nhập nội dung.'); return; } const wantAt = body.querySelector('#fdAt').checked; let at = null;
        if(wantAt){ if(A.busy && A.busy()) A.cancel(true); await new Promise(res => A.run('DESIGNFEED', async () => { const r = await A.getPoint('Chỉ định vị trí bình luận'); at = r.pt || null; res(); })); if(!at) return; }
        feedPost(txt, at); log('Design Feed: đã đăng bình luận' + (at ? ' (có vị trí)' : '') + '.'); }
      if(a === 'zoom' && id) zoomTo(FD.posts.find(p => p.id === id));
      if(a === 'rep' && id){ const t = window.prompt('Trả lời', ''); if(t && t.trim()) feedReply(id, t); }
      if(a === 'done' && id) feedDone(id);
      if(a === 'del' && id && window.confirm('Xoá bình luận này?')) feedDel(id); }); }
    paintFeed(); redraw(); return P; }
  // bong bóng số tại vị trí bình luận (khi bảng Design Feed đang mở)
  { const _d = window.draw; if(typeof _d === 'function') window.draw = function(){ const r = _d.apply(this, arguments); try{
      if(!feedOpen() || (typeof plotMode !== 'undefined' && plotMode) || (typeof _exporting !== 'undefined' && _exporting) || (typeof isModelView === 'function' && !isModelView())) return r;
      const L = FD.posts.filter(p => p.at); if(!L.length) return r; const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      L.forEach((p, i) => { const s = toScreen(p.at.x, p.at.y); ctx.fillStyle = p.done ? '#3c9a5f' : '#2f7de1'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 5, s.y - 9); ctx.arc(s.x, s.y - 18, 10, Math.PI * 0.72, Math.PI * 2.28); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), s.x, s.y - 18); });
      ctx.restore(); }catch(_){} return r; }; }
  plain(['DESIGNFEEDOPEN', 'DESIGNFEED'], 'Bảng Design Feed: bình luận, trả lời, gắn vị trí trên bản vẽ, đánh dấu đã xong — lưu kèm bản vẽ', () => feedPanel());
  plain(['DESIGNFEEDCLOSE'], 'Đóng bảng Design Feed', () => { const P = document.getElementById('dvdFeed'); if(P){ P.remove(); redraw(); } });
  function paintAll(){ banner(); paintTracePanel(); paintFeed(); }

  /* ===================== SHAREVIEW ===================== */
  const layoutsAll = () => { const L = (typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).map((l, i) => ({ i, name: l.isModel ? 'Model' : l.name, model: !!l.isModel })); return L.length ? L : [{ i: -1, name: 'Model', model: true }]; };
  const curLayout = () => (typeof currentLayout !== 'undefined' ? currentLayout : -1);
  async function renderPages(sel, kind){ const cur = curLayout(), out = []; const many = sel.length > 1 || (sel[0] && sel[0].i !== cur);
    try{ for(const a of sel){ if(many && a.i >= 0){ try{ switchLayout(a.i); }catch(_){} await new Promise(r => setTimeout(r, 40)); } const r = A.plotRender(0, false, kind); out.push({ name: a.name, r }); } }
    finally { if(many && cur >= 0){ try{ switchLayout(cur); }catch(_){} } }
    return out; }
  function shareHTML(title, pages, feed){
    const by = who(), date = new Date().toLocaleString();
    const tabs = pages.length > 1 ? '<nav>' + pages.map((p, i) => '<button data-p="' + i + '"' + (i ? '' : ' class="on"') + '>' + esc(p.name) + '</button>').join('') + '</nav>' : '';
    const svgs = pages.map((p, i) => '<div class="pg" data-p="' + i + '"' + (i ? ' hidden' : '') + '>' + p.svg + '</div>').join('\n');
    const cm = feed && feed.length ? '<aside><h2>Bình luận (' + feed.length + ')</h2>' + feed.map((p, i) => '<div class="c' + (p.done ? ' d' : '') + '"><b>' + (i + 1) + '. ' + esc(p.by) + '</b> <small>' + esc(fmtT(p.t)) + (p.done ? ' · đã xong' : '') + '</small><p>' + esc(p.txt) + '</p>' + (p.rp || []).map(r => '<div class="r"><b>' + esc(r.by) + '</b> <small>' + esc(fmtT(r.t)) + '</small><p>' + esc(r.txt) + '</p></div>').join('') + '</div>').join('') + '</aside>' : '';
    return '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="DVDCAD SHAREVIEW"><title>' + esc(title) + '</title>\n<style>' +
      'html,body{margin:0;height:100%;font:14px/1.45 system-ui,sans-serif;background:#2a2f37;color:#e8ecf2}header{display:flex;gap:12px;align-items:center;padding:8px 14px;background:#1d2128}header h1{font-size:16px;margin:0;flex:1}header small{opacity:.7}' +
      'nav{display:flex;gap:4px;padding:6px 14px;background:#232830}nav button{background:#323944;color:#e8ecf2;border:1px solid #444d5a;border-radius:4px;padding:3px 10px;cursor:pointer}nav button.on{background:#2f7de1;border-color:#2f7de1}' +
      'main{position:absolute;left:0;right:0;bottom:0;display:flex}#vp{flex:1;position:relative;overflow:hidden;cursor:grab;background:#5b636e}#vp:active{cursor:grabbing}.pg{position:absolute;left:0;top:0;transform-origin:0 0;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.45)}.pg[hidden]{display:none}.pg svg{display:block}' +
      'aside{width:300px;overflow:auto;padding:10px 12px;background:#1d2128;border-left:1px solid #39414d}aside h2{font-size:14px;margin:0 0 8px}.c{padding:6px 8px;margin-bottom:6px;border:1px solid #39414d;border-radius:6px}.c.d{opacity:.6}.c p{margin:4px 0;white-space:pre-wrap}.r{margin-left:10px;padding-left:6px;border-left:2px solid #39414d}.tools{position:absolute;right:10px;bottom:10px;display:flex;gap:4px}.tools button{width:32px;height:32px;border-radius:16px;border:0;background:#1d2128;color:#fff;font-size:16px;cursor:pointer}' +
      '@media(max-width:700px){aside{display:none}}</style></head><body>' +
      '<header><h1>' + esc(title) + '</h1><small>Chia sẻ bởi ' + esc(by) + ' · ' + esc(date) + ' · DVDCAD</small></header>' + tabs +
      '<main><div id="vp">' + svgs + '<div class="tools"><button data-z="1.25" title="Phóng to">+</button><button data-z="0.8" title="Thu nhỏ">−</button><button data-z="0" title="Vừa khung">⤢</button></div></div>' + cm + '</main>' +
      '<script>(function(){var vp=document.getElementById("vp"),cur=0,S={k:1,x:0,y:0};function pg(){return vp.querySelectorAll(".pg")[cur]}function ap(){var p=pg();if(p)p.style.transform="translate("+S.x+"px,"+S.y+"px) scale("+S.k+")"}' +
      'function fit(){var p=pg();if(!p)return;var s=p.firstElementChild,w=s.width.baseVal.value||s.getBoundingClientRect().width,h=s.height.baseVal.value||s.getBoundingClientRect().height,W=vp.clientWidth,H=vp.clientHeight;S.k=Math.min(W/w,H/h)*0.94;S.x=(W-w*S.k)/2;S.y=(H-h*S.k)/2;ap()}' +
      'function zoom(f,cx,cy){if(cx==null){cx=vp.clientWidth/2;cy=vp.clientHeight/2}S.x=cx-(cx-S.x)*f;S.y=cy-(cy-S.y)*f;S.k*=f;ap()}' +
      'vp.addEventListener("wheel",function(e){e.preventDefault();var r=vp.getBoundingClientRect();zoom(Math.pow(1.0015,-e.deltaY),e.clientX-r.left,e.clientY-r.top)},{passive:false});' +
      'var d=null;vp.addEventListener("pointerdown",function(e){if(e.target.closest(".tools"))return;d={x:e.clientX,y:e.clientY};vp.setPointerCapture(e.pointerId)});vp.addEventListener("pointermove",function(e){if(!d)return;S.x+=e.clientX-d.x;S.y+=e.clientY-d.y;d={x:e.clientX,y:e.clientY};ap()});vp.addEventListener("pointerup",function(){d=null});' +
      'vp.querySelector(".tools").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var z=+b.dataset.z;if(z)zoom(z);else fit()});' +
      'document.querySelectorAll("nav button").forEach(function(b){b.onclick=function(){document.querySelectorAll("nav button").forEach(function(x){x.classList.remove("on")});b.classList.add("on");vp.querySelectorAll(".pg").forEach(function(p){p.hidden=true});cur=+b.dataset.p;pg().hidden=false;fit()}});' +
      'function lay(){var t=document.querySelector("header").offsetHeight+(document.querySelector("nav")?document.querySelector("nav").offsetHeight:0);document.querySelector("main").style.top=t+"px";fit()}window.addEventListener("resize",lay);lay()})();</' + 'script></body></html>';
  }
  async function shareView(O){ O = Object.assign({ name: docBase(), all: false, feed: true }, O || {});
    if(!A.plotRender || !A.SvgCtx){ log('SHAREVIEW: chưa có bộ vẽ vector.'); return null; }
    const L = layoutsAll(); const cur = curLayout(); const sel = O.all ? L : [L.find(a => a.i === cur) || L[0]];
    const P = await renderPages(sel, 'svg'); const pages = P.filter(p => p.r && p.r.svg).map(p => ({ name: p.name, svg: p.r.svg }));
    if(!pages.length){ log('SHAREVIEW: không dựng được hình.'); return null; }
    const html = shareHTML(O.name, pages, O.feed ? FD.posts : null); const blob = new Blob([html], { type: 'text/html' }); const fn = String(O.name).replace(/[\\/:*?"<>|]+/g, '_') + '_shareview.html';
    if(!O.noSave) await save(blob, fn, 'text/html');
    const H = LS('dvd:shareviews', []); H.unshift({ name: O.name, file: fn, t: Date.now(), pages: pages.map(p => p.name), size: blob.size }); SV('dvd:shareviews', H.slice(0, 30));
    log('SHAREVIEW: ' + fn + ' — ' + pages.length + ' trang vector' + (O.feed && FD.posts.length ? ', ' + FD.posts.length + ' bình luận' : '') + '. Mở bằng trình duyệt bất kỳ, không cần cài DVDCAD.');
    return { html, pages: pages.length, file: fn };
  }
  A.shareView = shareView;
  plain(['SHAREVIEW'], 'Chia sẻ góc nhìn: xuất bản vẽ (layout đang xem hoặc mọi layout) thành một tệp .html tự chứa — vector, phóng / kéo, bình luận Design Feed', () => {
    if(A.busy && A.busy()) A.cancel(true); const K = A.acw; const H = LS('dvd:shareviews', []);
    const html = '<div class="acw" style="width:460px">' + (K ? K.grp('Góc nhìn chia sẻ', K.row('Tên:', K.txt('svN', docBase())) + '<div class="acw-row">' + K.chk('svAll', 'Mọi layout (không chỉ layout đang xem)', false) + '</div><div class="acw-row">' + K.chk('svF', 'Kèm bình luận Design Feed (' + FD.posts.length + ')', true) + '</div>') : '') +
      '<div class="acw-note" style="white-space:normal">Tệp .html tự chứa: gửi qua email / chat hoặc đặt lên web; người nhận mở bằng trình duyệt, không cần DVDCAD hay tài khoản.</div>' +
      (H.length ? '<div style="margin-top:8px"><b>Đã chia sẻ gần đây</b><div style="max-height:120px;overflow:auto">' + H.slice(0, 10).map(h => '<div>' + esc(h.name) + ' — ' + esc(fmtT(h.t)) + ' (' + (h.pages || []).length + ' trang)</div>').join('') + '</div></div>' : '') + '</div>';
    A.dialog({ title: 'Chia sẻ góc nhìn (Share View)', html, okText: 'Chia sẻ', ok: root => { const O = { name: (root.querySelector('#svN') || {}).value || docBase(), all: !!(root.querySelector('#svAll') || {}).checked, feed: !!(root.querySelector('#svF') || {}).checked }; setTimeout(() => shareView(O), 0); } });
  });

  /* ===================== PUSHTODOCS ===================== */
  async function pushDocs(O){ O = Object.assign({ one: true }, O || {}); if(!A.plotRender || !A.pdfBuild){ log('PUSHTODOCS: chưa có bộ xuất PDF.'); return null; }
    const L = layoutsAll(); const sel = O.names ? L.filter(a => O.names.includes(a.name)) : L.filter(a => !a.model || L.length === 1); if(!sel.length){ log('PUSHTODOCS: chưa chọn layout.'); return null; }
    const P = await renderPages(sel, true); const base = docBase(); const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '_'); let blob, fn;
    if(O.one){ blob = await A.pdfBuild(P.map(p => ({ ctx: p.r.pdf })), { title: base, version: A.version || '' }); fn = safe(base) + '.pdf'; }
    else { const files = []; for(const p of P){ const b = await A.pdfBuild([{ ctx: p.r.pdf }], { title: base + ' - ' + p.name, version: A.version || '' }); files.push({ name: safe(base + ' - ' + p.name) + '.pdf', data: new Uint8Array(await b.arrayBuffer()) }); } blob = new Blob([A.zipStore(files)], { type: 'application/zip' }); fn = safe(base) + '_pdf.zip'; }
    if(!O.noSave) await save(blob, fn, O.one ? 'application/pdf' : 'application/zip');
    log('PUSHTODOCS: ' + sel.length + ' layout → ' + fn + '. Đưa tệp lên hệ thống quản lý tài liệu (Docs, SharePoint, Google Drive…) của bạn.'); return { blob, file: fn, n: sel.length };
  }
  A.pushDocs = pushDocs;
  plain(['PUSHTODOCS'], 'Đưa layout lên hệ thống tài liệu: chọn layout → PDF vector (một tệp nhiều trang hoặc mỗi layout một tệp trong .zip)', () => {
    if(A.busy && A.busy()) A.cancel(true); const K = A.acw; const L = layoutsAll();
    const html = '<div class="acw" style="width:420px">' + K.grp('Layout', '<div style="max-height:180px;overflow:auto">' + L.map(a => '<div class="acw-row">' + K.chk('pdL' + (a.i + 1), a.name, !a.model || L.length === 1) + '</div>').join('') + '</div>') +
      K.grp('Tệp', K.row('Kiểu:', K.sel('pdO', [['1', 'Một tệp PDF nhiều trang'], ['0', 'Mỗi layout một PDF (.zip)']], '1'))) + '<div class="acw-note" style="white-space:normal">Mỗi layout in theo thiết lập PLOT của nó (PDF vector, chữ chọn được).</div></div>';
    A.dialog({ title: 'Đưa lên Docs (Push to Docs)', html, okText: 'Xuất', ok: root => { const names = L.filter(a => root.querySelector('#pdL' + (a.i + 1)).checked).map(a => a.name); if(!names.length){ say('Chưa chọn layout nào.'); return false; } const one = root.querySelector('#pdO').value === '1'; setTimeout(() => pushDocs({ names, one }), 0); } });
  });

  /* ===================== PUSHTOWEB / UPLOADTOCLOUD ===================== */
  const WEB = 'https://dangdvd.github.io/DVDCAD/';
  const cloudOk = () => { try{ return !!(window.DVDCloud && DVDCloud.cfgOk && DVDCloud.cfgOk()); }catch(_){ return false; } };
  const openUrl = u => { try{ if(window.dvdDesktop && dvdDesktop.openExternal) return dvdDesktop.openExternal(u); window.open(u, '_blank', 'noopener'); }catch(_){} };
  async function saveDXF(){ const txt = entitiesToDXF(ME()); const fn = docBase() + '.dxf'; await save(new Blob([txt], { type: 'application/dxf' }), fn, 'application/dxf'); return fn; }
  plain(['UPLOADTOCLOUD'], 'Tải bản vẽ lên đám mây (Google Drive của bạn) — cần cấu hình Google Drive trong Tuỳ chọn đám mây', async () => {
    if(cloudOk()){ try{ await DVDCloud.uploadCurrentToDrive(); log('UPLOADTOCLOUD: đã gửi bản vẽ lên Google Drive.'); }catch(err){ log('UPLOADTOCLOUD: ' + (err && err.message || err)); } return; }
    A.dialog({ title: 'Tải lên đám mây', html: '<div class="acw" style="width:420px;white-space:normal">DVDCAD dùng Google Drive của chính bạn làm đám mây (không có máy chủ riêng). Chưa cấu hình Google Drive.<br><br><b>Cấu hình</b>: nhập Client ID + API Key của Google (miễn phí) trong Tuỳ chọn đám mây.<br><b>Lưu tệp</b>: lưu bản vẽ ra tệp DXF rồi tự đưa lên dịch vụ lưu trữ bất kỳ.</div>',
      okText: 'Cấu hình Google Drive', ok: () => { try{ DVDCloud.openSettings(); }catch(_){ say('Chưa có mô-đun đám mây.'); } }, left: '<button type="button" class="btn-ghost" data-a="dxf">Lưu tệp DXF</button>',
      onOpen: ov => { const b = ov.querySelector('[data-a="dxf"]'); if(b) b.onclick = async () => { ov.remove(); const fn = await saveDXF(); log('UPLOADTOCLOUD: đã lưu ' + fn + '.'); }; } });
  });
  plain(['PUSHTOWEB'], 'Đưa bản vẽ sang DVDCAD Web (trình duyệt): qua Google Drive nếu đã cấu hình, nếu không lưu DXF và mở DVDCAD Web', async () => {
    if(cloudOk()){ try{ await DVDCloud.uploadCurrentToDrive(); }catch(err){ log('PUSHTOWEB: ' + (err && err.message || err)); return; } openUrl(WEB); log('PUSHTOWEB: bản vẽ đã lên Google Drive — mở DVDCAD Web, chọn "Mở từ Google Drive".'); return; }
    const fn = await saveDXF(); openUrl(WEB); log('PUSHTOWEB: đã lưu ' + fn + ' và mở DVDCAD Web (' + WEB + ') — kéo tệp vào trang để mở.');
  });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
