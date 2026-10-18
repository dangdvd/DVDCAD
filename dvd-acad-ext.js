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
      case 'POLYLINE': e.vertices = (e.vertices || []).map(p => ap(M, p)); if(e.wq) e.wq = e.wq.map(q => q.map(p => ap(M, p))); return e;
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
    const local = mine.map(m => { const w = xformEnt(deep(m), Minv); delete w.userAdded; delete w.grp; delete w.bip; delete w.bm; delete w.dimd; delete w.tbld; return w; });
    const inst = blockInstances(R.name); inst.delete(R.gid);
    let total = 0; for(const g of inst.values()) total += local.length;
    if(total > 40000 && !confirm('Cập nhật ' + inst.size + ' khối (' + total + ' nét). Bản vẽ lớn có thể lưu chậm. Tiếp tục?')){ finish(); return; }
    const del = [], add = []; const srcHex = A.layerHex(R.lay || '0');
    for(const [gid, g] of inst){
      for(const e of g.list) del.push(e);
      for(const l of local){ const w = xformEnt(deep(l), g.bm); w.grp = gid; w.blk = R.name; w.bm = g.bm; if(g.bip) w.bip = g.bip;
        if(l.l0 && g.bm.lay){ w.layer = g.bm.lay; if(l.bl || String(l.col || '').toLowerCase() === String(srcHex).toLowerCase()) w.col = A.layerHex(w.layer); }
        add.push(w); }
    }
    if(add.length || del.length) A.commit({ del, add }, 'Đã cập nhật ' + inst.size + ' khối "' + R.name + '"');
    finish(); log('Đã lưu khối "' + R.name + '" cho ' + (inst.size + 1) + ' bản.');
  }
  A.refedit = startRefedit; A.refclose = endRefedit; A.inRefedit = () => !!RE;
  cmd(['REFEDIT', 'BEDIT', 'BE'], 'Sửa khối tại chỗ (mọi khối cùng tên được cập nhật)', async () => {
    const r = await A.getEnt('Chọn khối cần sửa', { filter: e => !!e.bm }); if(!r.ent) return; setTimeout(() => startRefedit(r.ent), 0);
  });
  plain(['REFCLOSE', 'BCLOSE'], 'Kết thúc sửa khối (lưu / huỷ)', () => { if(!RE){ log('Không có khối nào đang sửa.'); return; } if(A.busy()) A.cancel(true); const ok = confirm('Lưu thay đổi cho mọi khối "' + RE.name + '"?\nOK = Lưu · Cancel = Huỷ thay đổi'); endRefedit(ok); });
  const _onLoadRE = A.onLoad; A.onLoad = function(){ if(RE){ RE = null; if(reBar){ reBar.remove(); reBar = null; } } if(_onLoadRE) _onLoadRE.apply(this, arguments); };

  /* =====================================================================
     4) TABLE — bảng
     ===================================================================== */
  function tblBuild(T){
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
    return ents.map((e, i) => { e.layer = w.layer || '0'; if(w.bl){ e.bl = 1; e.col = A.layerHex(e.layer); } else e.col = w.col; e.grp = w.grp; e.blk = '*TABLE'; if(i === 0) e.tbld = deep(T); return e; });
  };
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
    function pull(){ tb.querySelectorAll('td div[data-r]').forEach(div => { const r = +div.dataset.r, c = +div.dataset.c; cur.cells[r][c] = div.innerText.replace(/\n+$/, ''); }); tb.querySelectorAll('input[data-w]').forEach(i => { const v = parseFloat(String(i.value).replace(',', '.')); if(v > 0) cur.cw[+i.dataset.w] = v; }); const th = parseFloat(String(root.querySelector('#tbTh').value).replace(',', '.')); if(th > 0) cur.th = th; cur.title = root.querySelector('#tbTitle').checked; }
    function render(){
      let h = '<tr><th class="rh"></th>' + cur.cw.map((w, c) => '<th>' + String.fromCharCode(65 + (c % 26)) + ' <input data-w="' + c + '" value="' + (+w.toPrecision(5)) + '" style="width:56px;height:20px;font-size:11px;padding:0 3px"></th>').join('') + '</tr>';
      for(let r = 0; r < cur.cells.length; r++){ h += '<tr class="' + (cur.title && r === 0 ? 'title' : '') + '"><th class="rh">' + (r + 1) + '</th>' + cur.cells[r].map((v, c) => '<td' + (cur.title && r === 0 && c > 0 ? ' style="opacity:.35"' : '') + '><div contenteditable="true" data-r="' + r + '" data-c="' + c + '">' + esc(v) + '</div></td>').join('') + '</tr>'; }
      tb.innerHTML = h;
    }
    render();
    root.querySelector('.tb-bar').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(!b) return; pull(); const a = b.dataset.a;
      if(a === 'ar'){ cur.cells.push(Array(cur.cw.length).fill('')); cur.rh.push(cur.rh[cur.rh.length - 1] || cur.th * 2.2); }
      if(a === 'dr' && cur.cells.length > 1){ cur.cells.pop(); cur.rh.pop(); }
      if(a === 'ac'){ cur.cw.push(cur.cw[cur.cw.length - 1] || cur.th * 10); cur.cells.forEach(r => r.push('')); }
      if(a === 'dc' && cur.cw.length > 1){ cur.cw.pop(); cur.cells.forEach(r => r.pop()); }
      render(); });
    root.querySelector('#tbTitle').addEventListener('change', () => { pull(); render(); });
    tb.addEventListener('keydown', e => e.stopPropagation());
    tb.addEventListener('paste', e => { const div = e.target.closest('div[data-r]'); if(!div) return; const t = (e.clipboardData || window.clipboardData).getData('text'); if(!t || (!t.includes('\t') && !t.includes('\n'))) return; e.preventDefault(); pull();
      const data = tblFromTSV(t), r0 = +div.dataset.r, c0 = +div.dataset.c;
      while(cur.cells.length < r0 + data.length){ cur.cells.push(Array(cur.cw.length).fill('')); cur.rh.push(cur.rh[cur.rh.length - 1]); }
      const nc = Math.max(...data.map(r => r.length)); while(cur.cw.length < c0 + nc){ cur.cw.push(cur.cw[cur.cw.length - 1]); cur.cells.forEach(r => r.push('')); }
      data.forEach((row, i) => row.forEach((v, j) => { cur.cells[r0 + i][c0 + j] = v.trim(); })); render(); });
    return d;
  }
  async function tableCmd(){
    const th0 = (A.dimTxt ? A.dimTxt() : 2.5);
    const o = await new Promise(res => {
      A.dialog({ title: 'Chèn bảng (Table)', wide: true, okText: 'Tiếp — chọn điểm chèn', html:
        '<label class="dvd-frow"><span>Số hàng</span><span class="v"><input id="tRows" value="5" style="width:80px"></span></label><label class="dvd-frow"><span>Số cột</span><span class="v"><input id="tCols" value="4" style="width:80px"></span></label>' +
        '<label class="dvd-frow"><span>Cao chữ</span><span class="v"><input id="tTh" value="' + (+th0.toPrecision(3)) + '" style="width:80px"></span></label><label class="dvd-frow"><span>Rộng cột</span><span class="v"><input id="tCw" value="' + (+(th0 * 10).toPrecision(3)) + '" style="width:80px"></span></label><label class="dvd-frow"><span>Cao hàng</span><span class="v"><input id="tRh" value="' + (+(th0 * 2.2).toPrecision(3)) + '" style="width:80px"></span></label>' +
        '<label class="dvd-frow"><span>Hàng tiêu đề gộp</span><span class="v"><input type="checkbox" id="tTitle"></span></label><label class="dvd-frow"><span>Hàng đầu là tên cột (căn giữa)</span><span class="v"><input type="checkbox" id="tHead" checked></span></label>' +
        '<div style="margin-top:6px;font-size:12px;color:#aab3c0">Dán dữ liệu từ Excel (tuỳ chọn — bỏ trống để tạo bảng rỗng):</div><textarea id="tData" style="width:100%;height:110px;margin-top:4px;background:#1b2028;color:#e6eaf0;border:1px solid var(--line);border-radius:6px;font:12px ui-monospace,monospace" placeholder="Chọn vùng ô trong Excel → Ctrl+C → dán vào đây"></textarea>',
        ok: root => { const g = id => parseFloat(String(root.querySelector('#' + id).value).replace(',', '.')); const data = tblFromTSV(root.querySelector('#tData').value);
          const title = root.querySelector('#tTitle').checked; let rows = g('tRows') | 0, cols = g('tCols') | 0;
          if(data.length){ rows = data.length + (title ? 1 : 0); cols = Math.max(...data.map(r => r.length)); }
          const th = g('tTh') > 0 ? g('tTh') : th0; res({ rows: Math.min(500, Math.max(1, rows)), cols: Math.min(60, Math.max(1, cols)), th, cw: g('tCw') > 0 ? g('tCw') : th * 10, rh: g('tRh') > 0 ? g('tRh') : th * 2.2, title, head: root.querySelector('#tHead').checked, data: data.length ? (title ? [['']].concat(data) : data) : null }); },
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
