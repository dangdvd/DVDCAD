/* DVDCAD — bổ sung kiểu AutoCAD (v4d)
   • Nhiều bản vẽ mở cùng lúc (tab file như AutoCAD, Ctrl+Tab)
   • REFEDIT / BEDIT: sửa khối tại chỗ, lưu cho mọi khối cùng tên
   • TABLE / TABLEDIT: bảng (dán dữ liệu từ Excel), sửa bằng kích đúp
   • QDIM: ghi kích thước nhanh hàng loạt */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._ext || !window.DVDCmd) return; A._ext = true;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => A.log(m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const deep = e => JSON.parse(JSON.stringify(e));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const $ = id => document.getElementById(id);
  const desk = () => { try{ return A.deskUI(); }catch(_){ return false; } };

  /* =====================================================================
     1) NHIỀU BẢN VẼ (tab file)
     ===================================================================== */
  const TABS = A.TABS = []; let curId = null, switching = false, tid = 0;
  const _ldx = window.loadDXF, _ldw = window.loadDWG;
  function saveView(t){ if(!t) return; t.view = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot }; try{ t.layout = currentLayout; }catch(_){} }
  function afterOpen(kind, data){
    if(switching) return;
    if(!desk()){ TABS.length = 0; curId = null; return; }   // điện thoại: 1 bản vẽ (tiết kiệm RAM)
    const key = (typeof baseKey !== 'undefined') ? baseKey : null; const name = (typeof currentName === 'string' && currentName) || 'Bản vẽ';
    const old = curId != null ? TABS.find(t => t.id === curId) : null; if(old) saveView(old);
    let t = key ? TABS.find(x => x.key === key) : null;
    if(t){ t.data = data; t.kind = kind; t.name = name; t.view = null; }
    else { t = { id: ++tid, key, name, kind, data, view: null }; TABS.push(t); if(TABS.length > 12){ const i = TABS.findIndex(x => x.id !== t.id); if(i >= 0) TABS.splice(i, 1); } }
    curId = t.id; renderTabs();
  }
  window.loadDXF = function(text, name){ const r = _ldx.apply(this, arguments); try{ if(entities.length || window.__dvdNewDoc) afterOpen('dxf', text); }catch(_){} return r; };
  window.loadDWG = async function(buf, name){ let copy = null; try{ if(!switching && desk() && buf && buf.byteLength) copy = buf.slice(0); }catch(_){} const r = await _ldw.apply(this, arguments); try{ if(entities.length && copy) afterOpen('dwg', copy); }catch(_){} return r; };
  async function switchTo(id){
    if(id === curId) return; const t = TABS.find(x => x.id === id); if(!t) return;
    if(A.busy()) A.cancel(true); if(RE){ say('Đang sửa khối — Lưu hoặc Huỷ trước khi chuyển bản vẽ.'); return; }
    const old = TABS.find(x => x.id === curId); saveView(old);
    switching = true;
    try{
      if(t.kind === 'dwg') await window.loadDWG(t.data.slice(0), t.name); else window.loadDXF(t.data, t.name);
      curId = t.id;
      if(t.layout != null && typeof switchLayout === 'function' && t.layout !== currentLayout){ try{ switchLayout(t.layout); }catch(_){} }
      if(t.view){ view.scale = t.view.scale; view.offsetX = t.view.offsetX; view.offsetY = t.view.offsetY; view.rot = t.view.rot || 0; draw(); A.paint(); }
    } catch(err){ console.error(err); say('Không mở lại được bản vẽ này.'); }
    finally { switching = false; renderTabs(); }
  }
  function closeTab(id){
    const i = TABS.findIndex(x => x.id === id); if(i < 0) return;
    const wasCur = id === curId; TABS.splice(i, 1);
    if(!wasCur){ renderTabs(); return; }
    if(TABS.length){ curId = null; switchTo(TABS[Math.min(i, TABS.length - 1)].id); }
    else { location.href = location.pathname; }
  }
  A.switchTab = switchTo; A.closeTab = closeTab;
  const tabCSS = document.createElement('style'); tabCSS.textContent = `
  #acadFile #acFileTab{display:none !important}
  #acadFile .ft.doc{max-width:220px}
  #acadFile .ft.doc .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #acadFile .ft.doc.on{background:var(--bg-canvas,#212830);color:#fff;border-top:2px solid #3d9ae8}
  #acadFile .ft.doc .x{margin-left:6px;opacity:.6} #acadFile .ft.doc .x:hover{opacity:1;color:#ff8a8a}
  .re-bar{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:30;background:#3b2f12;border:1px solid #c99a2e;color:#ffe7a8;border-radius:6px;padding:6px 10px;display:flex;gap:10px;align-items:center;font:12.5px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4)}
  .re-bar button{border:1px solid #c99a2e;background:#5a4518;color:#fff;border-radius:4px;padding:4px 10px;cursor:pointer;font:600 12px system-ui}
  .re-bar button.ok{background:#2f6fd0;border-color:#4a8be8}
  .tb-grid{max-height:52vh;overflow:auto;border:1px solid var(--line);border-radius:6px;background:#1b2028}
  .tb-grid table{border-collapse:collapse;font:12.5px system-ui,sans-serif}
  .tb-grid td,.tb-grid th{border:1px solid #3f4754;padding:0;min-width:70px}
  .tb-grid th{background:#2b313b;color:#8f99a8;font-weight:600;padding:2px 6px;position:sticky;top:0}
  .tb-grid th.rh{position:sticky;left:0;min-width:30px}
  .tb-grid td div{padding:4px 6px;min-height:20px;outline:none;color:#e6eaf0;white-space:pre-wrap}
  .tb-grid td div:focus{background:#24364f;box-shadow:inset 0 0 0 1px #3d9ae8}
  .tb-grid tr.title td div{font-weight:700;text-align:center}
  .tb-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .tb-bar button{padding:5px 10px}`;
  document.head.appendChild(tabCSS);
  function renderTabs(){
    const bar = $('acadFile'); if(!bar) return;
    bar.querySelectorAll('.ft.doc').forEach(x => x.remove());
    const plus = $('acNewTab');
    for(const t of TABS){
      const d = document.createElement('div'); d.className = 'ft doc' + (t.id === curId ? ' on' : ''); d.dataset.id = t.id; d.title = t.name;
      d.innerHTML = '<span class="nm">' + esc(t.name) + '</span><span class="x" title="Đóng">×</span>';
      bar.insertBefore(d, plus);
    }
  }
  setTimeout(() => { const bar = $('acadFile'); if(!bar) return; bar.addEventListener('click', e => { const d = e.target.closest('.ft.doc'); if(!d) return; const id = +d.dataset.id;
    if(e.target.closest('.x')){ e.stopPropagation(); const t = TABS.find(x => x.id === id); if(t && TABS.length === 1 && !confirm('Đóng bản vẽ "' + t.name + '"? (thay đổi đã tự lưu trên máy)')) return; closeTab(id); return; }
    switchTo(id); }, true);
    bar.addEventListener('auxclick', e => { const d = e.target.closest('.ft.doc'); if(d && e.button === 1) closeTab(+d.dataset.id); });
    renderTabs(); }, 0);
  window.addEventListener('keydown', e => {
    if(e.ctrlKey && e.key === 'Tab' && TABS.length > 1){ e.preventDefault(); const i = TABS.findIndex(x => x.id === curId); const n = TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length]; switchTo(n.id); }
    if(e.ctrlKey && (e.key === 'F4' || (e.key.toLowerCase() === 'w' && e.shiftKey)) && curId != null){ e.preventDefault(); closeTab(curId); }
  }, true);
  plain(['CLOSE'], 'Đóng bản vẽ đang mở (tab)', () => { if(curId == null){ location.href = location.pathname; return; } const t = TABS.find(x => x.id === curId); if(TABS.length === 1 && !confirm('Đóng bản vẽ "' + (t ? t.name : '') + '"?')) return; closeTab(curId); });
  plain(['CLOSEALL'], 'Đóng tất cả bản vẽ', () => { if(confirm('Đóng tất cả bản vẽ? (thay đổi đã tự lưu trên máy)')) location.href = location.pathname; });

  /* =====================================================================
     2) BIẾN ĐỔI AFFINE 1 ĐỐI TƯỢNG (dùng cho sửa khối)
     ===================================================================== */
  const ap = (M, p) => ({ x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f });
  const lin = (M, v) => ({ x: M.a * v.x + M.c * v.y, y: M.b * v.x + M.d * v.y });
  function inv(M){ const det = M.a * M.d - M.b * M.c; if(Math.abs(det) < 1e-18) return null; const a = M.d / det, b = -M.b / det, c = -M.c / det, d = M.a / det; return { a, b, c, d, e: -(a * M.e + c * M.f), f: -(b * M.e + d * M.f) }; }
  function similar(M){ const e = 1e-9 * Math.max(1, Math.abs(M.a), Math.abs(M.b)); return (Math.abs(M.a - M.d) < e && Math.abs(M.b + M.c) < e) || (Math.abs(M.a + M.d) < e && Math.abs(M.b - M.c) < e); }
  function xformEnt(e, M){
    const det = M.a * M.d - M.b * M.c, s = Math.sqrt(Math.abs(det)), rot = Math.atan2(M.b, M.a);
    switch(e.type){
      case 'LINE': { const p = ap(M, { x: e.x1, y: e.y1 }), q = ap(M, { x: e.x2, y: e.y2 }); e.x1 = p.x; e.y1 = p.y; e.x2 = q.x; e.y2 = q.y; return e; }
      case 'POLYLINE': { const bv = A.bvOf ? A.bvOf(e) : null; e.vertices = (e.vertices || []).map(p => ap(M, p)); if(e.wq) e.wq = e.wq.map(q => q.map(p => ap(M, p)));
        if(bv){ if(similar(M)) A.bvFix(e, bv.map(p => { const q = ap(M, p); if(p.bulge) q.bulge = det < 0 ? -p.bulge : p.bulge; return q; })); else { delete e.bv; delete e.bvs; } } return e; }
      case 'SOLID': e.pts = (e.pts || []).map(p => ap(M, p)); return e;
      case 'HATCH': e.loops = (e.loops || []).map(l => l.map(p => ap(M, p))); if(e.psc) e.psc *= s; if(e.pang != null || e.pat) e.pang = (e.pang || 0) + rot * R2D; return e;
      case 'POINT': { const p = ap(M, e); e.x = p.x; e.y = p.y; return e; }
      case 'XLINE': { const p = ap(M, e), v = lin(M, { x: e.dx, y: e.dy }); e.x = p.x; e.y = p.y; e.dx = v.x; e.dy = v.y; return e; }
      case 'TEXT': { const p = ap(M, e); e.x = p.x; e.y = p.y; const sy = Math.hypot(M.c, M.d), sx = Math.hypot(M.a, M.b); e.h = (e.h || 10) * sy; e.rot = (e.rot || 0) + rot * R2D; if(Math.abs(sx / sy - 1) > 1e-6) e.xs = (e.xs || 1) * sx / sy; return e; }
      case 'CIRCLE': if(similar(M)){ const c = ap(M, { x: e.cx, y: e.cy }); e.cx = c.x; e.cy = c.y; e.r *= s; return e; } return Object.assign(e, { type: 'POLYLINE', closed: true, vertices: smpCircle(e.cx, e.cy, e.r).slice(0, -1).map(p => ap(M, p)) });
      case 'ARC': if(similar(M)){ const c = ap(M, { x: e.cx, y: e.cy }); const a1 = e.a1 * D2R, a2 = e.a2 * D2R; let p1 = ap(M, { x: e.cx + e.r * Math.cos(a1), y: e.cy + e.r * Math.sin(a1) }), p2 = ap(M, { x: e.cx + e.r * Math.cos(a2), y: e.cy + e.r * Math.sin(a2) }); if(det < 0){ const t = p1; p1 = p2; p2 = t; }
          e.cx = c.x; e.cy = c.y; e.r *= s; e.a1 = Math.atan2(p1.y - c.y, p1.x - c.x) * R2D; e.a2 = Math.atan2(p2.y - c.y, p2.x - c.x) * R2D; return e; }
        return Object.assign(e, { type: 'POLYLINE', closed: false, vertices: smpArc(e.cx, e.cy, e.r, e.a1, e.a2).map(p => ap(M, p)) });
      case 'ELLIPSE': if(similar(M)){ const c = ap(M, { x: e.cx, y: e.cy }), v = lin(M, { x: e.mx, y: e.my }); e.cx = c.x; e.cy = c.y; e.mx = v.x; e.my = v.y; if(det < 0){ const p1 = e.p1 || 0, p2 = e.p2 == null ? 2 * Math.PI : e.p2; e.p1 = -p2; e.p2 = -p1; } return e; }
        return Object.assign(e, { type: 'POLYLINE', closed: false, vertices: smpEllipse(e).map(p => ap(M, p)) });
    }
    return e;
  }
  A.xformEnt = xformEnt;

  /* =====================================================================
     3) REFEDIT / BEDIT — sửa khối tại chỗ
     ===================================================================== */
  let RE = null, reBar = null;
  function blockInstances(name){ const m = new Map(); for(const e of modelEntities){ if(e.bm && e.grp && e.bm.name === name){ let g = m.get(e.grp); if(!g){ g = { bm: e.bm, bip: e.bip, list: [] }; m.set(e.grp, g); } g.list.push(e); } } return m; }
  function startRefedit(ent){
    if(!ent || !ent.bm){ log('Đối tượng không phải khối.'); return; }
    if(RE){ log('Đang sửa một khối khác.'); return; }
    const inst = blockInstances(ent.bm.name); const M = ent.bm; if(!inv(M)){ log('Khối bị co dẹt — không sửa được.'); return; }
    const members = A.groupMembers(ent.grp); const keep = new Set(members);
    const hide = new Set(); for(const e of entities) if(!keep.has(e)) hide.add(e);
    RE = { gid: ent.grp, name: ent.bm.name, bm: Object.assign({}, ent.bm), bip: ent.bip, lay: ent.bm.lay, undo0: editUndoStack.length, pg: A.SET.pickGroup, hide0: OBJ_HIDE, count: inst.size };
    OBJ_HIDE = hide; A.SET.pickGroup = false; selEnts.clear(); try{ refreshPanSel(); invalidateSnap(); }catch(_){}
    RE.view = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY };
    try{ const b = A.bboxOf ? A.bboxOf(members) : null; if(b){ const w = Math.max(b.x1 - b.x0, b.y1 - b.y0, 1e-6); zoomToWorldRect(b.x0 - w, b.y0 - w, b.x1 + w, b.y1 + w); } }catch(_){}
    draw(); A.paint();
    reBar = document.createElement('div'); reBar.className = 're-bar';
    reBar.innerHTML = '<span>✎ Đang sửa khối <b>' + esc(RE.name) + '</b> · ' + RE.count + ' bản trong bản vẽ</span><button class="ok" data-a="save">Lưu cho mọi khối</button><button data-a="cancel">Huỷ thay đổi</button>';
    document.querySelector('.stage').appendChild(reBar);
    reBar.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(!b) return; if(A.busy()) A.cancel(true); endRefedit(b.dataset.a === 'save'); });
    log('Sửa khối "' + RE.name + '": dùng mọi lệnh vẽ/sửa; nét vẽ thêm sẽ thuộc khối. Xong gõ REFCLOSE (hoặc bấm Lưu).');
    if(A.onIsolate) A.onIsolate();
  }
  // nét vẽ thêm trong lúc sửa khối -> thuộc khối
  const _commit = A.commit;
  A.commit = function(ch){ if(RE && ch && ch.add){ for(const e of ch.add){ if(e && !e.grp){ e.grp = RE.gid; e.blk = RE.name; e.bm = RE.bm; if(RE.bip) e.bip = RE.bip; } } } return _commit.apply(this, arguments); };
  function endRefedit(save){
    if(!RE) return; const R = RE;
    const finish = () => { if(R.view){ view.scale = R.view.scale; view.offsetX = R.view.offsetX; view.offsetY = R.view.offsetY; } RE = null; OBJ_HIDE = R.hide0 || null; A.SET.pickGroup = R.pg; if(reBar){ reBar.remove(); reBar = null; } selEnts.clear(); try{ refreshPanSel(); invalidateSnap(); }catch(_){} draw(); A.paint(); if(A.onIsolate) A.onIsolate(); };
    if(!save){ let n = 0; while(editUndoStack.length > R.undo0 && n++ < 5000) undoEdit(); finish(); log('Đã huỷ thay đổi khối.'); return; }
    const Minv = inv(R.bm); const mine = modelEntities.filter(e => e.grp === R.gid);
    const local = mine.filter(m => !m.att).map(m => { const w = xformEnt(deep(m), Minv); delete w.userAdded; delete w.grp; delete w.bip; delete w.bm; delete w.dimd; delete w.tbld; return w; });   // thuộc tính là riêng từng khối
    const inst = blockInstances(R.name); inst.delete(R.gid);
    let total = 0; for(const g of inst.values()) total += local.length;
    if(total > 40000 && !confirm('Cập nhật ' + inst.size + ' khối (' + total + ' nét). Bản vẽ lớn có thể lưu chậm. Tiếp tục?')){ finish(); return; }
    const del = [], add = []; const srcHex = A.layerHex(R.lay || '0');
    for(const [gid, g] of inst){
      for(const e of g.list) if(!e.att) del.push(e);
      const has = new Set(g.list.filter(e => e.att).map(e => e.att));
      for(const l of local){ if(l.attdef && has.has(l.attdef.tag)) continue; const w = xformEnt(deep(l), g.bm); if(w.attdef){ w.att = w.attdef.tag; w.attp = w.attdef.prompt; w.text = w.attdef.def || ''; delete w.attdef; } w.grp = gid; w.blk = R.name; w.bm = g.bm; if(g.bip) w.bip = g.bip;
        if(l.l0 && g.bm.lay){ w.layer = g.bm.lay; if(l.bl || String(l.col || '').toLowerCase() === String(srcHex).toLowerCase()) w.col = A.layerHex(w.layer); }
        add.push(w); }
    }
    const repA = mine.filter(m => m.attdef).map(m => { const w = deep(m); delete w.userAdded; w.att = w.attdef.tag; w.attp = w.attdef.prompt; w.text = w.attdef.def || ''; delete w.attdef; return [m, w]; });
    if(add.length || del.length || repA.length) A.commit({ del, add, rep: repA }, 'Đã cập nhật ' + inst.size + ' khối "' + R.name + '"');
    finish(); log('Đã lưu khối "' + R.name + '" cho ' + (inst.size + 1) + ' bản.');
  }
  A.refedit = startRefedit; A.refclose = endRefedit; A.inRefedit = () => !!RE;
  // hình khối đang sửa ở toạ độ gốc khối (BSAVEAS)
  A.refeditLocal = () => { if(!RE) return null; const Minv = inv(RE.bm); return { name: RE.name, ents: modelEntities.filter(e => e.grp === RE.gid && !e.att).map(m => { const w = xformEnt(deep(m), Minv); delete w.userAdded; delete w.grp; delete w.bip; delete w.bm; delete w.dimd; delete w.tbld; return w; }) }; };
  A.refeditSave = () => { if(!RE) return; const n = RE.name; endRefedit(true); const e = modelEntities.find(x => x.bm && x.bm.name === n); if(e) setTimeout(() => { startRefedit(e); log('BSAVE: đã lưu khối "' + n + '" — tiếp tục sửa.'); }, 0); };   // BSAVE
  cmd(['REFEDIT', 'BEDIT', 'BE'], 'Sửa khối tại chỗ (mọi khối cùng tên được cập nhật)', async () => {
    const r = await A.getEnt('Chọn khối cần sửa', { filter: e => !!e.bm }); if(!r.ent) return; setTimeout(() => startRefedit(r.ent), 0);
  });
  // REFSET: thêm / bớt đối tượng của bộ đang sửa (REFEDIT) — đối tượng thêm vào thuộc khối, đối tượng bớt ra thành đối tượng thường
  cmd(['REFSET'], 'Thêm / bớt đối tượng của khối đang sửa tại chỗ (REFEDIT)', async () => {
    if(!RE){ log('REFSET chỉ dùng khi đang sửa khối (REFEDIT / BEDIT).'); return; }
    const k = await A.getKw('Chuyển đối tượng giữa bộ sửa và bản vẽ', { kw: [{ k: 'A', t: 'Thêm' }, { k: 'R', t: 'Bớt' }], def: 'Thêm' }); const add = k.kw !== 'R';
    if(add){ const hid = OBJ_HIDE; OBJ_HIDE = R0Hide(); try{ draw(); }catch(_){} let sel;
      try{ const s = await A.getSel('Chọn đối tượng thêm vào khối', { filter: e => e.grp !== RE.gid && !e.att, pre: false }); sel = (s.sel || []).filter(e => e.grp !== RE.gid && !e.att); } finally { OBJ_HIDE = hid; }
      const rep = sel.map(e => { const w = deep(e); delete w.userAdded; w.grp = RE.gid; w.blk = RE.name; w.bm = RE.bm; if(RE.bip) w.bip = RE.bip; return [e, w]; });
      if(rep.length){ A.commit({ rep }, 'REFSET: thêm ' + rep.length + ' đối tượng'); if(OBJ_HIDE) for(const [, w] of rep) OBJ_HIDE.delete(w); }
      log('REFSET: thêm ' + rep.length + ' đối tượng vào khối "' + RE.name + '".'); try{ draw(); }catch(_){} return; }
    const s = await A.getSel('Chọn đối tượng bớt ra khỏi khối', { filter: e => e.grp === RE.gid, pre: false }); const sel = (s.sel || []).filter(e => e.grp === RE.gid && !e.att);
    const rep = sel.map(e => { const w = deep(e); delete w.userAdded; delete w.grp; delete w.blk; delete w.bm; delete w.bip; delete w.l0; return [e, w]; });
    if(rep.length){ A.commit({ rep }, 'REFSET: bớt ' + rep.length + ' đối tượng'); if(OBJ_HIDE) for(const [, w] of rep) OBJ_HIDE.add(w); }
    log('REFSET: bớt ' + rep.length + ' đối tượng khỏi khối "' + RE.name + '" (thành đối tượng thường).'); try{ draw(); }catch(_){}
  });
  const R0Hide = () => (RE && RE.hide0) || null;
  plain(['REFCLOSE', 'BCLOSE'], 'Kết thúc sửa khối (lưu / huỷ)', () => { if(!RE){ log('Không có khối nào đang sửa.'); return; } if(A.busy()) A.cancel(true); const ok = confirm('Lưu thay đổi cho mọi khối "' + RE.name + '"?\nOK = Lưu · Cancel = Huỷ thay đổi'); endRefedit(ok); });
  const _onLoadRE = A.onLoad; A.onLoad = function(){ if(RE){ RE = null; if(reBar){ reBar.remove(); reBar = null; } } if(_onLoadRE) _onLoadRE.apply(this, arguments); };

  /* =====================================================================
     4) TABLE — bảng
     ===================================================================== */
  /* bảng theo kiểu bảng (TABLESTYLE, như AutoCAD): kiểu ô Title / Header / Data (+ kiểu ô riêng) — chữ, lề, căn, nền, định dạng, đường viền */
  const TB_AL = { TL: ['left', 'top'], TC: ['center', 'top'], TR: ['right', 'top'], ML: ['left', 'middle'], MC: ['center', 'middle'], MR: ['right', 'middle'], BL: ['left', 'bottom'], BC: ['center', 'bottom'], BR: ['right', 'bottom'] };
  const tblRowKind = (T, r) => (T.rs && T.rs[r]) || (T.title && r === 0 ? 'Title' : T.head && r === (T.title ? 1 : 0) ? 'Header' : 'Data');
  A.tblRowKind = tblRowKind;
  // định dạng ô (Table Cell Format): chung, số thập phân, phần trăm, tiền tệ, số nguyên, văn bản
  A.tblFmt = function(v, f){ const s = String(v == null ? '' : v); if(!f || !f.t || f.t === 'gen' || f.t === 'text') return s; const n = parseFloat(s.replace(/\s/g, '').replace(',', '.')); if(!s.trim() || !isFinite(n) || !/^[\s+\-]?[\d\s]*[.,]?\d*\s*%?$/.test(s)) return s;
    const p = Math.max(0, Math.min(8, f.p == null ? 2 : f.p | 0)), th = x => { const [i, d] = x.split('.'); return (f.sep ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : i) + (d ? '.' + d : ''); };
    if(f.t === 'dec') return th(n.toFixed(p)); if(f.t === 'whole') return th(Math.round(n).toFixed(0));
    if(f.t === 'pct') return th((/%/.test(s) ? n : n * 100).toFixed(p)) + '%';
    if(f.t === 'cur'){ const sym = f.sym == null ? '$' : f.sym; return f.symEnd ? th(n.toFixed(p)) + ' ' + sym : sym + th(n.toFixed(p)); }
    return s; };
  function tblLay(T){
    const S = T.tss; let CS = S.cells || {};
    const rot = (T.rot || 0) * D2R, co = Math.cos(rot), si = Math.sin(rot);
    const P = (x, y) => ({ x: T.o.x + x * co - y * si, y: T.o.y + x * si + y * co });
    const nR = T.rh.length, nC = T.cw.length, up = S.dir === 'up';
    const keyOf = (r, c) => { const k = (T.cs && T.cs[r + ',' + c]) || tblRowKind(T, r); return CS[k] ? k : (CS.Data ? 'Data' : Object.keys(CS)[0]); };
    const sc = T.tsf > 0 ? T.tsf : 1, CS0 = CS; CS = {}; for(const k in CS0){ const s0 = CS0[k]; CS[k] = Object.assign({}, s0, { th: (s0.th > 0 ? s0.th : 2.5) * sc, hm: (s0.hm >= 0 ? s0.hm : 1) * sc, vm: (s0.vm >= 0 ? s0.vm : 1) * sc }); }   // bảng đã SCALE: nhân cao chữ, lề
    const merged = r => { const s = CS[tblRowKind(T, r)]; return !!(s && s.merge); };
    const cellAt = (r, c) => { const m = merged(r); const c0 = m ? 0 : c; const k = keyOf(r, c0); return { r, c0, c1: m ? nC : c + 1, k, s: CS[k] }; };
    const txtOf = (r, c) => ((T.cells[r] || [])[c] == null ? '' : String(T.cells[r][c]));
    // khối trong ô (TINSERT): T.cb['r,c'] = { name, src, sc, rot, fit, al }
    const bcache = new Map();
    const blkOf = (r, c) => { const b = T.cb && T.cb[r + ',' + c]; if(!b || !A.instBlock) return null; const key = b.name + '|' + (b.src || '') + '|' + (b.rot || 0); let v = bcache.get(key);
      if(!v){ let ents = []; try{ ents = A.instBlock(b.name, b.src || 'lib', { x: 0, y: 0 }, 1, b.rot || 0) || []; }catch(_){} let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of ents){ const q = entBBox(e); if(!q) continue; x0 = Math.min(x0, q.x0); y0 = Math.min(y0, q.y0); x1 = Math.max(x1, q.x1); y1 = Math.max(y1, q.y1); }
        v = { ents, bb: isFinite(x0) ? { x0, y0, x1, y1 } : null }; bcache.set(key, v); } return v.bb ? { b, ents: v.ents, bb: v.bb } : null; };
    const rh = T.rh.map((h, r) => { let need = 0; for(let c = 0; c < nC; c++){ const C = cellAt(r, c); if(C.c0 !== c) continue; const n = Math.max(1, txtOf(r, c).split('\n').length); need = Math.max(need, n * C.s.th * 4 / 3 + 2 * C.s.vm); const K = blkOf(r, c); if(K && !K.b.fit) need = Math.max(need, (K.bb.y1 - K.bb.y0) * (K.b.sc || 1) * sc + 2 * C.s.vm); if(merged(r)) break; } return Math.max(h, need); });
    const xs = [0]; for(let c = 0; c < nC; c++) xs.push(xs[c] + T.cw[c]);
    const ys = [0]; for(let r = 0; r < nR; r++) ys.push(up ? ys[r] + rh[r] : ys[r] - rh[r]);
    return { S, CS, P, nR, nC, up, merged, cellAt, txtOf, xs, ys, W: xs[nC], sc, blkOf };
  }
  // ô (hàng, cột) chứa điểm p của bảng — dùng cho MATCHCELL, chọn ô
  A.tblCellAt = function(T, p){ const rot = (T.rot || 0) * D2R, co = Math.cos(rot), si = Math.sin(rot), dx = p.x - T.o.x, dy = p.y - T.o.y; const x = dx * co + dy * si, y = -dx * si + dy * co;
    let xs, ys, nR = T.rh.length, nC = T.cw.length, mg = r => T.title && r === 0;
    if(T.tss && T.tss.cells){ const L = tblLay(T); xs = L.xs; ys = L.ys; mg = L.merged; } else { xs = [0]; for(let c = 0; c < nC; c++) xs.push(xs[c] + T.cw[c]); ys = [0]; for(let r = 0; r < nR; r++) ys.push(ys[r] - T.rh[r]); }
    if(x < 0 || x > xs[nC]) return null; let r = -1; for(let i = 0; i < nR; i++){ const a = Math.min(ys[i], ys[i + 1]), b = Math.max(ys[i], ys[i + 1]); if(y >= a && y <= b){ r = i; break; } } if(r < 0) return null;
    let c = 0; while(c < nC - 1 && x > xs[c + 1]) c++; if(mg(r)) c = 0; return { r, c }; };
  function tblStyled(T){
    const { S, CS, P, nR, nC, up, merged, cellAt, txtOf, xs, ys, W, sc, blkOf } = tblLay(T); const out = [], fills = [], texts = [];
    // nền ô
    { let prev = [];   // gộp các ô liền nhau cùng màu nền thành một mảng (không lộ đường biên giữa các ô)
      const flush = R => { for(const q of R) fills.push({ type: 'HATCH', solid: true, loops: [[P(xs[q.c0], ys[q.r0]), P(xs[q.c1], ys[q.r0]), P(xs[q.c1], ys[q.r1]), P(xs[q.c0], ys[q.r1])]], _col: q.f }); };
      for(let r = 0; r < nR; r++){ const runs = []; for(let c = 0; c < nC; ){ const C = cellAt(r, c); const f = C.s.fill || ''; const L = runs[runs.length - 1]; if(f && L && L.f === f && L.c1 === C.c0) L.c1 = C.c1; else if(f) runs.push({ c0: C.c0, c1: C.c1, f, r0: r, r1: r + 1 }); c = C.c1; }
        const next = []; for(const q of runs){ const i = prev.findIndex(o => o.c0 === q.c0 && o.c1 === q.c1 && o.f === q.f); if(i >= 0){ const o = prev.splice(i, 1)[0]; o.r1 = r + 1; next.push(o); } else next.push(q); }
        flush(prev); prev = next; }
      flush(prev); }
    // đường viền: cạnh trong (cùng kiểu ô) / cạnh ngoài (giáp kiểu khác hoặc mép bảng)
    const E = (s, k) => { const b = s && s.bd && s.bd[k]; return b && b.on ? b : null; };
    const pk = b => b ? (b.col || '') + '|' + (b.lw == null ? '' : b.lw) + '|' + (b.lt || '') + '|' + (b.dbl ? b.sp || 1.125 : '') : '';
    const seg1 = (a, b, bd) => { const p = P(a[0], a[1]), q = P(b[0], b[1]); const e = { type: 'LINE', x1: p.x, y1: p.y, x2: q.x, y2: q.y }; if(bd.col) e._col = bd.col; if(bd.lw != null && bd.lw !== '') e._lw = bd.lw; if(bd.lt) e._lt = bd.lt; out.push(e); };
    // đường viền đôi: hai nét song song cách nhau "Khoảng cách"
    const seg = (a, b, bd) => { if(!bd.dbl) return seg1(a, b, bd); const h = (bd.sp > 0 ? bd.sp : 1.125) * sc / 2, hor = Math.abs(a[1] - b[1]) < 1e-12; const dx = hor ? 0 : h, dy = hor ? h : 0;
      seg1([a[0] - dx, a[1] - dy], [b[0] - dx, b[1] - dy], bd); seg1([a[0] + dx, a[1] + dy], [b[0] + dx, b[1] + dy], bd); };
    for(let b = 0; b <= nR; b++){ const y = ys[b]; let run = null;
      for(let c = 0; c <= nC; c++){ let bd = null;
        if(c < nC){ const A1 = b > 0 ? cellAt(b - 1, c) : null, B1 = b < nR ? cellAt(b, c) : null; const hi = up ? B1 : A1, lo = up ? A1 : B1;
          if(hi && lo) bd = hi.k === lo.k ? E(hi.s, 'h') : (E(hi.s, 'b') || E(lo.s, 't')); else if(lo) bd = E(lo.s, 't'); else if(hi) bd = E(hi.s, 'b'); }
        const k = pk(bd); if(run && run.k !== k){ if(run.bd) seg([xs[run.c], y], [xs[c], y], run.bd); run = null; } if(!run) run = { c, k, bd }; } }
    for(let k = 0; k <= nC; k++){ let run = null;
      for(let r = 0; r <= nR; r++){ let bd = null;
        if(r < nR && !(merged(r) && k > 0 && k < nC)){ const L = k > 0 ? cellAt(r, k - 1) : null, R = k < nC ? cellAt(r, k) : null;
          if(L && R) bd = L.k === R.k ? E(L.s, 'v') : (E(L.s, 'r') || E(R.s, 'l')); else if(R) bd = E(R.s, 'l'); else if(L) bd = E(L.s, 'r'); }
        const kk = pk(bd); if(run && run.k !== kk){ if(run.bd) seg([xs[k], ys[run.r]], [xs[k], ys[r]], run.bd); run = null; } if(!run) run = { r, k: kk, bd }; } }
    // chữ trong ô
    for(let r = 0; r < nR; r++){ const top = up ? ys[r + 1] : ys[r], bot = up ? ys[r] : ys[r + 1];
      for(let c = 0; c < nC; ){ const C = cellAt(r, c), s = C.s; c = C.c1; const raw = txtOf(r, C.c0); if(!raw) continue; const txt = A.tblFmt(raw, s.fmt); const [ha, va] = TB_AL[s.al] || TB_AL.MC;
        const x0 = xs[C.c0], x1 = xs[C.c1], tx = ha === 'left' ? x0 + s.hm : ha === 'right' ? x1 - s.hm : (x0 + x1) / 2, ty = va === 'top' ? top - s.vm : va === 'bottom' ? bot + s.vm : (top + bot) / 2;
        const m = P(tx, ty), e = { type: 'TEXT', x: m.x, y: m.y, h: s.th, rot: (T.rot || 0) + (s.ang || 0), text: txt, ha, va };
        const st = A.TS && A.TS.list && A.TS.list[s.ts || 'Standard']; if(st){ e.style = s.ts || 'Standard'; e.ff = st.font; if(st.wf && Math.abs(st.wf - 1) > 1e-3) e.xs = st.wf; } else if(T.ff) e.ff = T.ff;
        if(s.col) e._col = s.col; texts.push(e); } }
    // khối trong ô: tự khớp hoặc theo tỉ lệ, căn theo kiểu ô; giữ màu / lớp riêng của khối
    const blks = []; const ro = T.rot || 0;
    for(let r = 0; r < nR; r++){ const top = up ? ys[r + 1] : ys[r], bot = up ? ys[r] : ys[r + 1];
      for(let c = 0; c < nC; ){ const C = cellAt(r, c), s = C.s; c = C.c1; const K = blkOf(r, C.c0); if(!K) continue; const b = K.b, bb = K.bb, bw = Math.max(1e-9, bb.x1 - bb.x0), bh = Math.max(1e-9, bb.y1 - bb.y0);
        const x0 = xs[C.c0], x1 = xs[C.c1]; const k = b.fit ? Math.max(1e-9, Math.min((x1 - x0 - 2 * s.hm) / bw, (top - bot - 2 * s.vm) / bh)) : (b.sc || 1) * sc; const [ha, va] = TB_AL[b.al || s.al] || TB_AL.MC;
        const tx = ha === 'left' ? x0 + s.hm - bb.x0 * k : ha === 'right' ? x1 - s.hm - bb.x1 * k : (x0 + x1) / 2 - (bb.x0 + bb.x1) / 2 * k, ty = va === 'top' ? top - s.vm - bb.y1 * k : va === 'bottom' ? bot + s.vm - bb.y0 * k : (top + bot) / 2 - (bb.y0 + bb.y1) / 2 * k;
        for(const e0 of K.ents){ const e = JSON.parse(JSON.stringify(e0)); for(const f of ['grp', 'blk', 'bm', 'bip', 'att', 'attp', 'userAdded', 'cid']) delete e[f]; if(k !== 1) scaleEnt(e, k, { x: 0, y: 0 }); translateEnt(e, tx, ty); if(ro) rotateEnt(e, ro, { x: 0, y: 0 }); translateEnt(e, T.o.x, T.o.y); e._keep = 1; blks.push(e); } } }
    if(!out.length && !texts.length && !blks.length){ const H = ys[nR]; out.push({ type: 'POLYLINE', vertices: [P(0, 0), P(W, 0), P(W, H), P(0, H)], closed: true }); }   // bảng không viền, không chữ vẫn cần một đối tượng để chọn
    return fills.concat(out, texts, blks);
  }
  function tblBuild(T){
    if(T && T.tss && T.tss.cells) return tblStyled(T);
    const out = []; const rot = (T.rot || 0) * D2R, co = Math.cos(rot), si = Math.sin(rot);
    const P = (x, y) => ({ x: T.o.x + x * co - y * si, y: T.o.y + x * si + y * co });   // x sang phải, y xuống dưới là âm
    const W = T.cw.reduce((a, b) => a + b, 0), H = T.rh.reduce((a, b) => a + b, 0);
    const corners = [P(0, 0), P(W, 0), P(W, -H), P(0, -H)];
    out.push({ type: 'POLYLINE', vertices: corners, closed: true });
    let y = 0;
    for(let r = 0; r < T.rh.length - 1; r++){ y -= T.rh[r]; const a = P(0, y), b = P(W, y); out.push({ type: 'LINE', x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
    let x = 0;
    for(let c = 0; c < T.cw.length - 1; c++){ x += T.cw[c]; const y0 = T.title ? -T.rh[0] : 0; const a = P(x, y0), b = P(x, -H); out.push({ type: 'LINE', x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
    y = 0;
    for(let r = 0; r < T.rh.length; r++){
      const rh = T.rh[r]; let xx = 0;
      for(let c = 0; c < T.cw.length; c++){
        const cw = T.cw[c]; const txt = ((T.cells[r] || [])[c] || '').toString();
        if(T.title && r === 0){ if(c === 0 && txt){ const m = P(W / 2, y - rh / 2); out.push({ type: 'TEXT', x: m.x, y: m.y, h: T.th * 1.15, rot: T.rot || 0, text: txt, ha: 'center', va: 'middle', ff: T.ff }); } xx += cw; continue; }
        if(txt){ const al = (T.al && T.al[c]) || (/^[\s\d.,+\-%x×*/()]+$/.test(txt) ? 'r' : (r === (T.title ? 1 : 0) && T.head ? 'c' : 'l'));
          const pad = Math.min(T.th * 0.6, cw * 0.1); const tx = al === 'c' ? xx + cw / 2 : al === 'r' ? xx + cw - pad : xx + pad; const m = P(tx, y - rh / 2);
          out.push({ type: 'TEXT', x: m.x, y: m.y, h: T.th, rot: T.rot || 0, text: txt, ha: al === 'c' ? 'center' : al === 'r' ? 'right' : 'left', va: 'middle', ff: T.ff }); }
        xx += cw;
      }
      y -= rh;
    }
    return out;
  }
  A.tblRegenFrom = function(w){
    const T = w.tbld; const ents = tblBuild(T);
    let ci = ents.findIndex(e => e.type !== 'HATCH' && !e._keep); if(ci < 0) ci = ents.findIndex(e => e.type !== 'HATCH'); if(ci < 0) ci = 0;   // mang dữ liệu bảng: đối tượng đầu không phải nền ô
    return ents.map((e, i) => { const ol = e.layer; e.layer = w.layer || '0';
      const c = e._col, lw = e._lw, lt = e._lt, keep = e._keep; delete e._col; delete e._lw; delete e._lt; delete e._keep;
      // nét của khối trong ô (TINSERT) giữ màu / lớp riêng; nét trên lớp 0 của khối theo lớp của bảng
      if(keep){ if(e.l0){ if(e.bl) e.col = A.layerHex(e.layer); } else if(ol) e.layer = ol; e.grp = w.grp; e.blk = '*TABLE'; if(i === ci) e.tbld = deep(T); return e; }
      if(c === 'BYLAYER'){ e.bl = 1; e.col = A.layerHex(e.layer); } else if(c){ e.col = c; } else if(w.bl){ e.bl = 1; e.col = A.layerHex(e.layer); } else e.col = w.col;
      if(lw === -1 || lw === '-1'){ /* ByLayer */ } else if(lw != null && +lw > 0) e.lw = +lw; else if(lw == null && w.lw > 0) e.lw = w.lw;
      if(lt && lt !== 'BYLAYER') e.lt = lt; else if(!lt && w.lt && e.type === 'LINE') e.lt = w.lt;
      e.grp = w.grp; e.blk = '*TABLE'; if(i === ci) e.tbld = deep(T); return e; });
  };
  A.tblBuild = T => tblBuild(T);
  function tblFromTSV(tsv){ const rows = String(tsv || '').replace(/\r/g, '').split('\n'); while(rows.length && !rows[rows.length - 1].trim()) rows.pop(); return rows.map(r => r.split('\t')); }
  function newTableDef(o){
    const nr = Math.max(1, o.rows | 0), nc = Math.max(1, o.cols | 0);
    const cells = []; for(let r = 0; r < nr; r++){ cells.push([]); for(let c = 0; c < nc; c++) cells[r].push((o.data && o.data[r] && o.data[r][c] != null) ? String(o.data[r][c]).trim() : ''); }
    return { o: { x: 0, y: 0 }, rot: 0, cw: Array(nc).fill(o.cw), rh: Array(nr).fill(o.rh), cells, th: o.th, title: !!o.title, head: !!o.head };
  }
  function tableDialog(T, title, onOk){
    let cur = deep(T);
    const d = A.dialog({ title, wide: true, okText: 'OK', html: '<div class="tb-bar"><button type="button" class="btn-ghost" data-a="ar">＋ Hàng</button><button type="button" class="btn-ghost" data-a="dr">− Hàng cuối</button><button type="button" class="btn-ghost" data-a="ac">＋ Cột</button><button type="button" class="btn-ghost" data-a="dc">− Cột cuối</button><label style="display:flex;align-items:center;gap:6px;margin-left:auto">Cao chữ <input id="tbTh" style="width:70px" inputmode="decimal"></label><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="tbTitle"> Hàng tiêu đề gộp</label></div><div class="tb-grid"><table id="tbT"></table></div><p style="margin:8px 0 0">Gõ trực tiếp vào ô. <b>Dán (Ctrl+V) dữ liệu từ Excel</b> vào một ô sẽ tự trải ra nhiều hàng/cột. Hàng đầu = độ rộng cột (đơn vị bản vẽ).</p>',
      ok: () => { pull(); onOk(cur); } });
    const root = d.root, tb = root.querySelector('#tbT');
    root.querySelector('#tbTh').value = +(+cur.th).toPrecision(4); root.querySelector('#tbTitle').checked = !!cur.title;
    const styled = !!(cur.tss && cur.tss.cells); if(styled){ root.querySelector('#tbTh').closest('label').style.display = 'none'; root.querySelector('#tbTitle').closest('label').style.display = 'none'; if(!cur.rs) cur.rs = cur.cells.map((_, r) => A.tblRowKind(cur, r)); }
    const csName = k => k === 'Title' ? 'Tiêu đề' : k === 'Header' ? 'Tên cột' : k === 'Data' ? 'Dữ liệu' : k;
    const rsSel = r => styled ? ' <select data-rs="' + r + '" title="Kiểu ô của hàng" style="height:20px;font-size:11px;max-width:86px">' + Object.keys(cur.tss.cells).map(k => '<option value="' + esc(k) + '"' + (k === cur.rs[r] ? ' selected' : '') + '>' + esc(csName(k)) + '</option>').join('') + '</select>' : '';
    function pull(){ tb.querySelectorAll('td div[data-r]').forEach(div => { const r = +div.dataset.r, c = +div.dataset.c; cur.cells[r][c] = div.innerText.replace(/\n+$/, ''); }); tb.querySelectorAll('input[data-w]').forEach(i => { const v = parseFloat(String(i.value).replace(',', '.')); if(v > 0) cur.cw[+i.dataset.w] = v; }); if(styled){ tb.querySelectorAll('select[data-rs]').forEach(sl => { cur.rs[+sl.dataset.rs] = sl.value; }); cur.title = cur.rs[0] === 'Title'; return; } const th = parseFloat(String(root.querySelector('#tbTh').value).replace(',', '.')); if(th > 0) cur.th = th; cur.title = root.querySelector('#tbTitle').checked; }
    function render(){
      let h = '<tr><th class="rh"></th>' + cur.cw.map((w, c) => '<th>' + String.fromCharCode(65 + (c % 26)) + ' <input data-w="' + c + '" value="' + (+w.toPrecision(5)) + '" style="width:56px;height:20px;font-size:11px;padding:0 3px"></th>').join('') + '</tr>';
      for(let r = 0; r < cur.cells.length; r++){ const mg = styled ? !!(cur.tss.cells[cur.rs[r]] || {}).merge : (cur.title && r === 0); h += '<tr class="' + (mg ? 'title' : '') + '"><th class="rh">' + (r + 1) + rsSel(r) + '</th>' + cur.cells[r].map((v, c) => '<td' + (mg && c > 0 ? ' style="opacity:.35"' : '') + '><div contenteditable="true" data-r="' + r + '" data-c="' + c + '">' + esc(v) + '</div></td>').join('') + '</tr>'; }
      tb.innerHTML = h;
    }
    render();
    root.querySelector('.tb-bar').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(!b) return; pull(); const a = b.dataset.a;
      if(a === 'ar'){ cur.cells.push(Array(cur.cw.length).fill('')); cur.rh.push(cur.rh[cur.rh.length - 1] || cur.th * 2.2); if(cur.rs) cur.rs.push(cur.tss && cur.tss.cells.Data ? 'Data' : cur.rs[cur.rs.length - 1]); }
      if(a === 'dr' && cur.cells.length > 1){ cur.cells.pop(); cur.rh.pop(); if(cur.rs) cur.rs.pop(); }
      if(a === 'ac'){ cur.cw.push(cur.cw[cur.cw.length - 1] || cur.th * 10); cur.cells.forEach(r => r.push('')); }
      if(a === 'dc' && cur.cw.length > 1){ cur.cw.pop(); cur.cells.forEach(r => r.pop()); }
      render(); });
    root.querySelector('#tbTitle').addEventListener('change', () => { pull(); render(); });
    tb.addEventListener('change', e => { if(e.target.matches('select[data-rs]')){ pull(); render(); } });
    tb.addEventListener('keydown', e => e.stopPropagation());
    tb.addEventListener('paste', e => { const div = e.target.closest('div[data-r]'); if(!div) return; const t = (e.clipboardData || window.clipboardData).getData('text'); if(!t || (!t.includes('\t') && !t.includes('\n'))) return; e.preventDefault(); pull();
      const data = tblFromTSV(t), r0 = +div.dataset.r, c0 = +div.dataset.c;
      while(cur.cells.length < r0 + data.length){ cur.cells.push(Array(cur.cw.length).fill('')); cur.rh.push(cur.rh[cur.rh.length - 1]); if(cur.rs) cur.rs.push('Data'); }
      const nc = Math.max(...data.map(r => r.length)); while(cur.cw.length < c0 + nc){ cur.cw.push(cur.cw[cur.cw.length - 1]); cur.cells.forEach(r => r.push('')); }
      data.forEach((row, i) => row.forEach((v, j) => { cur.cells[r0 + i][c0 + j] = v.trim(); })); render(); });
    return d;
  }
  async function tableCmd(){
    const th0 = (A.dimTxt ? A.dimTxt() : 2.5);
    const o = await new Promise(res => {
      // bố cục như Insert Table của AutoCAD: kiểu bảng, cách tạo (bảng rỗng / dán dữ liệu), xem trước, số cột / hàng dữ liệu, kiểu ô hàng đầu
      const R = (l, c) => '<label class="dvd-frow"><span>' + l + '</span><span class="v">' + c + '</span></label>', G = (t, h, st) => '<fieldset class="acw-grp"' + (st ? ' style="' + st + '"' : '') + '><legend>' + t + '</legend>' + h + '</fieldset>';
      const cs = (id, v) => '<select id="' + id + '"><option value="title"' + (v === 'title' ? ' selected' : '') + '>Tiêu đề</option><option value="header"' + (v === 'header' ? ' selected' : '') + '>Tên cột</option><option value="data"' + (v === 'data' ? ' selected' : '') + '>Dữ liệu</option></select>';
      const d = A.dialog({ title: 'Chèn bảng', cls: 'acw-free', help: 'TABLE', html: '<div style="display:flex;gap:12px;width:640px"><div style="flex:1">' +
          G('Kiểu bảng', '<div style="display:flex;gap:6px"><select disabled style="flex:1"><option>Standard</option></select></div>' + R('Cao chữ:', '<input id="tTh" value="' + (+th0.toPrecision(3)) + '" style="width:90px">')) +
          G('Cách tạo', '<label class="acw-ck"><input type="radio" name="tSrc" value="empty" checked><span>Bảng rỗng</span></label><br><label class="acw-ck"><input type="radio" name="tSrc" value="paste"><span>Dán dữ liệu từ Excel</span></label><br><label class="acw-ck dis"><input type="radio" name="tSrc" disabled><span>Từ dữ liệu đối tượng (Data Extraction)</span></label>' +
            '<textarea id="tData" style="width:100%;height:70px;margin-top:4px;display:none" placeholder="Chọn vùng ô trong Excel → Ctrl+C → dán vào đây"></textarea>') +
          G('Xem trước', '<canvas id="tPv" width="300" height="130" style="width:300px;height:130px;background:#fff;display:block;position:static"></canvas>') + '</div><div style="flex:1">' +
          G('Cách chèn', '<label class="acw-ck"><input type="radio" name="tIns" value="pt" checked><span>Chỉ định điểm chèn</span></label><br><label class="acw-ck dis"><input type="radio" name="tIns" value="win" disabled><span>Chỉ định khung</span></label>') +
          G('Cột và hàng', '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px">' + R('Số cột:', '<input id="tCols" value="5" style="width:60px">') + R('Rộng cột:', '<input id="tCw" value="' + (+(th0 * 10).toPrecision(3)) + '" style="width:70px">') +
            R('Hàng dữ liệu:', '<input id="tRows" value="3" style="width:60px">') + R('Cao hàng:', '<input id="tRh" value="' + (+(th0 * 2.2).toPrecision(3)) + '" style="width:70px">') + '</div>') +
          G('Kiểu ô', R('Hàng thứ nhất:', cs('tS1', 'title')) + R('Hàng thứ hai:', cs('tS2', 'header')) + R('Các hàng còn lại:', '<select disabled><option>Dữ liệu</option></select>')) + '</div></div>',
        onOpen: root => { const g = id => root.querySelector('#' + id); const pv = () => { const c = g('tPv'), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 130); const nc = Math.max(1, Math.min(12, parseInt(g('tCols').value) || 1)), s1 = g('tS1').value, s2 = g('tS2').value;
            const rows = [s1, s2].concat(Array(Math.max(1, Math.min(8, parseInt(g('tRows').value) || 1))).fill('data')); const W = 280, rh = Math.min(16, 110 / rows.length), x0 = 10, y0 = 10; x.strokeStyle = '#333'; x.lineWidth = 1; x.fillStyle = '#333'; x.font = '9px sans-serif'; x.textAlign = 'center';
            rows.forEach((k, i) => { const y = y0 + i * rh; if(k === 'title'){ x.strokeRect(x0, y, W, rh); x.fillText('Tiêu đề', x0 + W / 2, y + rh - 4); return; } for(let j = 0; j < nc; j++){ x.strokeRect(x0 + j * W / nc, y, W / nc, rh); if(k === 'header') x.fillText('Tên cột', x0 + (j + .5) * W / nc, y + rh - 4); else { x.fillStyle = '#888'; x.fillText('Dữ liệu', x0 + (j + .5) * W / nc, y + rh - 4); x.fillStyle = '#333'; } } }); };
          root.addEventListener('input', pv); root.addEventListener('change', e => { if(e.target.name === 'tSrc') g('tData').style.display = e.target.value === 'paste' ? '' : 'none'; pv(); }); pv(); },
        ok: root => { const g = id => parseFloat(String(root.querySelector('#' + id).value).replace(',', '.')); const paste = (root.querySelector('input[name=tSrc]:checked') || {}).value === 'paste'; const data = paste ? tblFromTSV(root.querySelector('#tData').value) : [];
          const s1 = root.querySelector('#tS1').value, s2 = root.querySelector('#tS2').value; const title = s1 === 'title', head = s1 === 'header' || s2 === 'header';
          let cols = g('tCols') | 0, rows = Math.max(1, g('tRows') | 0) + (s1 !== 'data' ? 1 : 0) + (s2 !== 'data' ? 1 : 0);   // như AutoCAD: số hàng dữ liệu không tính hàng tiêu đề / tên cột
          if(data.length){ rows = data.length + (title ? 1 : 0); cols = Math.max(...data.map(r => r.length)); }
          const th = g('tTh') > 0 ? g('tTh') : th0; res({ rows: Math.min(500, Math.max(1, rows)), cols: Math.min(60, Math.max(1, cols)), th, cw: g('tCw') > 0 ? g('tCw') : th * 10, rh: g('tRh') > 0 ? g('tRh') : th * 2.2, title, head, data: data.length ? (title ? [['']].concat(data) : data) : null }); },
        cancel: () => res(null) });
    });
    if(!o) return;
    const T = newTableDef(o); try{ const st = A.TS && A.TS.list[A.TS.cur]; if(st) T.ff = st.font; }catch(_){}
    if(o.data){ const W = o.cols; for(let c = 0; c < W; c++){ let mx = 0; for(const row of T.cells) mx = Math.max(mx, [...String(row[c] || '')].length); T.cw[c] = Math.max(o.th * 4, mx * o.th * 0.62 + o.th * 1.4); } }
    const r = await A.getPoint('Chỉ định điểm chèn (góc trên trái của bảng)', { preview: (g, p) => { const t2 = deep(T); t2.o = p; g.ents(tblBuild(t2)); } }); if(!r.pt) return;
    T.o = { x: r.pt.x, y: r.pt.y };
    const gid = A.newGroupId('T'); const ents = tblBuild(T).map((e, i) => { A.newProps(e); delete e.lt; e.grp = gid; e.blk = '*TABLE'; if(i === 0) e.tbld = deep(T); return e; });
    A.commit({ add: ents }, 'Đã chèn bảng ' + T.cells.length + '×' + T.cw.length);
    if(!o.data) setTimeout(() => editTable(ents[0]), 50);
  }
  function tableCarrier(e){ if(!e) return null; if(e.tbld) return e; if(e.grp && e.blk === '*TABLE'){ for(const x of modelEntities) if(x.grp === e.grp && x.tbld) return x; } return null; }
  function editTable(e){
    const c = tableCarrier(e); if(!c){ log('Không phải bảng.'); return; }
    tableDialog(c.tbld, 'Sửa bảng', T => { const w = deep(c); delete w.userAdded; w.tbld = T; A.commit({ rep: [[c, w]] }, 'Đã cập nhật bảng'); });
  }
  A.editTable = editTable;
  cmd(['TABLE', 'TB'], 'Chèn bảng (gõ hoặc dán dữ liệu từ Excel)', () => tableCmd());
  cmd(['TABLEDIT', 'TABLEEDIT'], 'Sửa nội dung bảng', async () => { const r = await A.getEnt('Chọn bảng', { filter: e => !!tableCarrier(e) }); if(r.ent) setTimeout(() => editTable(r.ent), 0); });

  /* kích đúp như AutoCAD: bảng -> sửa bảng · khối -> sửa khối · kích thước -> sửa chữ */
  A.onDblEnt = function(e){
    if(RE) return false;
    if(tableCarrier(e)){ editTable(e); return true; }
    if(e.bm){ if(confirm('Sửa khối "' + e.bm.name + '" tại chỗ? (mọi khối cùng tên sẽ được cập nhật)')) startRefedit(e); return true; }
    if(e.grp && String(e.blk || '').startsWith('*DIM')){ const t = e.dimd ? e : modelEntities.find(x => x.grp === e.grp && x.type === 'TEXT'); if(!t) return false;
      askText({ title: 'Chữ kích thước (để trống = số đo tự động)', value: t.dimd && t.dimd.ov ? t.dimd.ov : '' }).then(s => { if(s == null) return; const w = deep(t); delete w.userAdded; if(w.dimd){ w.dimd.ov = s.trim() ? s : null; } else w.text = s; A.commit({ rep: [[t, w]] }, 'Đã sửa chữ kích thước'); }); return true; }
    return false;
  };

  /* =====================================================================
     5) QDIM — kích thước nhanh hàng loạt
     ===================================================================== */
  function qdimPoints(sel){
    const pts = [];
    for(const e of sel){
      if(e.type === 'LINE'){ pts.push({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }); }
      else if(e.type === 'POLYLINE' && (e.vertices || []).length <= 600) for(const v of e.vertices) pts.push({ x: v.x, y: v.y });
      else if(e.type === 'CIRCLE') pts.push({ x: e.cx, y: e.cy });
      else if(e.type === 'ARC'){ const a1 = e.a1 * D2R, a2 = e.a2 * D2R; pts.push({ x: e.cx + e.r * Math.cos(a1), y: e.cy + e.r * Math.sin(a1) }, { x: e.cx + e.r * Math.cos(a2), y: e.cy + e.r * Math.sin(a2) }); }
      else if(e.type === 'POINT') pts.push({ x: e.x, y: e.y });
    }
    return pts;
  }
  function qdimChain(pts, L, phiDeg){
    const phi = phiDeg * D2R, ux = Math.cos(phi), uy = Math.sin(phi), nx = -uy, ny = ux;
    let span = 1; if(pts.length){ const xs = pts.map(p => p.x * ux + p.y * uy); span = Math.max(...xs) - Math.min(...xs) || 1; }
    const tol = span * 1e-6; const m = new Map();
    for(const p of pts){ const t = p.x * ux + p.y * uy; const k = Math.round(t / tol); const dn = Math.abs((L.x - p.x) * nx + (L.y - p.y) * ny); const o = m.get(k); if(!o || dn < o.dn) m.set(k, { t, p, dn }); }
    const arr = [...m.values()].sort((a, b) => a.t - b.t); const pairs = [];
    for(let i = 0; i + 1 < arr.length; i++) if(arr[i + 1].t - arr[i].t > tol * 10) pairs.push([arr[i].p, arr[i + 1].p]);
    return pairs;
  }
  cmd(['QDIM', 'QD'], 'Kích thước nhanh: chọn đối tượng → đặt chuỗi kích thước liên tục', async () => {
    const s = await A.getSel('Chọn hình cần ghi kích thước'); const sel = s.sel || []; if(!sel.length) return;
    const pts = qdimPoints(sel); if(pts.length < 2){ log('Không đủ điểm để ghi kích thước.'); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const p of pts){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    let forced = null;
    const phiOf = L => forced === 'H' ? 0 : forced === 'V' ? 90 : ((L.y > y1 || L.y < y0) && !(L.x > x1 || L.x < x0)) ? 0 : ((L.x > x1 || L.x < x0) && !(L.y > y1 || L.y < y0)) ? 90 : ((x1 - x0) >= (y1 - y0) ? 0 : 90);
    const build = L => { const out = []; for(const [a, b] of qdimChain(pts, L, phiOf(L))){ const d = A.makeDimLinear(a, b, L, phiOf(L), 'nhanh'); if(d) out.push(...d); } return out; };
    for(;;){
      const r = await A.getPoint('Chỉ định vị trí đường kích thước', { kw: [{ k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }, { k: 'A', t: 'Tự động' }], rubber: false, preview: (g, p) => { const e = build(p); g.ents(e.slice(0, 2500)); } });
      if(r.kw){ forced = r.kw === 'A' ? null : r.kw; continue; }
      if(!r.pt) return;
      const ents = build(r.pt); if(!ents.length){ log('Không có khoảng nào để ghi.'); return; }
      A.commit({ add: ents }, 'Đã ghi ' + new Set(ents.map(e => e.grp)).size + ' kích thước'); return;
    }
  });

  /* ribbon: thêm nút (nếu có) */
  try{ if(A.addRibbon) A.addRibbon(); }catch(_){}
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
