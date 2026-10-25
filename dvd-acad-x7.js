/* DVDCAD v4n — các phần còn thiếu so với AutoCAD
   VPORTS (nhiều khung nhìn trong Model) · mảng liên kết (ARRAYEDIT, sửa trong bảng Thuộc tính) · hatch liên kết đường biên
   SPELL (kiểm tra chính tả) · SETVAR + biến hệ thống (OSMODE, ORTHOMODE, PDMODE…) · PTYPE · ISODRAFT / ISOCIRCLE
   XCLIP / IMAGECLIP · GROUPEDIT · HYPERLINK / OPENLINK · DIMBREAK · PURGE (hộp thoại) · OPTIONS · STATUS · REGENALL */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x7 || !window.DVDCmd) return; A._x7 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const o = JSON.parse(JSON.stringify(e)); delete o.userAdded; return o; };
  const docName = () => { try{ return currentName || ''; }catch(_){ return ''; } };
  const center = e => { const b = entBBox(e); return b ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : { x: 0, y: 0 }; };
  const fmt = v => A.fmt ? A.fmt(v) : String(+(+v).toFixed(4));
  const redraw = () => { try{ invalidateSnap(); }catch(_){} try{ forceRedraw(); }catch(_){ try{ draw(); }catch(__){} } try{ A.paint(); }catch(_){} };

  /* =====================================================================
     1) VPORTS — nhiều khung nhìn trong Model
     ===================================================================== */
  const VP = { tiles: null, active: 0 };   // tiles: [{fx,fy,fw,fh, view:{scale,offsetX,offsetY}}]
  const LAYOUTS = { '1': [[0, 0, 1, 1]], '2V': [[0, 0, .5, 1], [.5, 0, .5, 1]], '2H': [[0, 0, 1, .5], [0, .5, 1, .5]], '3R': [[0, 0, .5, .5], [0, .5, .5, .5], [.5, 0, .5, 1]], '3L': [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .5, .5]], '3V': [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], '4': [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]] };
  const multi = () => !!(VP.tiles && VP.tiles.length > 1) && (() => { try{ return isModelView() && !(typeof compareOn !== 'undefined' && compareOn); }catch(_){ return false; } })();
  const rectOf = t => { const Wd = W(), Hd = H(); return { x: t.fx * Wd, y: t.fy * Hd, w: t.fw * Wd, h: t.fh * Hd }; };
  // đặt view cho 1 ô: giữ tâm world, thu khung về ô
  function fitTileFrom(src, t){ const R = rectOf(t), Wd = W(), Hd = H(); const cw = { x: (Wd / 2 - src.offsetX) / src.scale, y: -(Hd / 2 - src.offsetY) / src.scale }; const k = Math.min(R.w / Wd, R.h / Hd);
    const sc = src.scale * k; return { scale: sc, offsetX: R.x + R.w / 2 - cw.x * sc, offsetY: R.y + R.h / 2 + cw.y * sc }; }
  function setVports(kind){
    const L = LAYOUTS[kind]; if(!L) return false;
    if(kind === '1'){ if(VP.tiles){ const t = VP.tiles[VP.active]; const R = rectOf(t), Wd = W(), Hd = H(); const cw = { x: (R.x + R.w / 2 - view.offsetX) / view.scale, y: -(R.y + R.h / 2 - view.offsetY) / view.scale }; const k = Math.min(Wd / R.w, Hd / R.h); view.scale *= k; view.offsetX = Wd / 2 - cw.x * view.scale; view.offsetY = Hd / 2 + cw.y * view.scale; } VP.tiles = null; VP.active = 0; redraw(); return true; }
    if(VP.tiles) setVports('1');
    const src = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY };
    VP.tiles = L.map(([fx, fy, fw, fh]) => { const t = { fx, fy, fw, fh }; t.view = fitTileFrom(src, t); return t; });
    VP.active = 0; Object.assign(view, VP.tiles[0].view); view.rot = 0; redraw(); return true;
  }
  A.vports = { set: setVports, get state(){ return VP; }, activate: i => activateTile(i) };
  function activateTile(i){ if(!multi() || i === VP.active || !VP.tiles[i]) return; VP.tiles[VP.active].view = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot || 0 }; VP.active = i; Object.assign(view, VP.tiles[i].view); view.rot = VP.tiles[i].view.rot || 0; try{ updateCompass(); }catch(_){} redraw(); }
  const _drawVP = window.draw;
  window.draw = function(){
    if(!multi() || (typeof _exporting !== 'undefined' && _exporting)) return _drawVP.apply(this, arguments);
    const dpr = window.devicePixelRatio || 1; const act = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot };
    VP.tiles[VP.active].view = { scale: act.scale, offsetX: act.offsetX, offsetY: act.offsetY, rot: act.rot || 0 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#11151b'; ctx.fillRect(0, 0, W(), H());
    let r;
    VP.tiles.forEach((t, i) => {
      const R = rectOf(t); const isAct = i === VP.active;
      Object.assign(view, t.view); view.rot = t.view.rot || 0;
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.beginPath(); ctx.rect(R.x + 1, R.y + 1, R.w - 2, R.h - 2); ctx.clip();
      const svE = _exporting; if(!isAct) _exporting = true;
      try{ const x = _drawVP.apply(this, arguments); if(isAct) r = x; } finally { _exporting = svE; ctx.restore(); }
    });
    Object.assign(view, act); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    VP.tiles.forEach((t, i) => { const R = rectOf(t); ctx.save(); ctx.lineWidth = i === VP.active ? 2.5 : 1; ctx.strokeStyle = i === VP.active ? '#3d9ae8' : '#56606f'; ctx.strokeRect(R.x + 1, R.y + 1, R.w - 2, R.h - 2); ctx.restore(); });
    return r;
  };
  const _fit = window.fitView;
  if(typeof _fit === 'function') window.fitView = function(){ const r = _fit.apply(this, arguments); if(multi()){ const t = VP.tiles[VP.active]; Object.assign(view, fitTileFrom({ scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY }, t)); draw(); } return r; };
  // bấm vào ô khác: chuyển khung nhìn hiện hành (như AutoCAD)
  document.addEventListener('pointerdown', e => {
    if(!multi() || e.button > 1) return; const c = document.getElementById('cv'); if(!c) return; const rc = c.getBoundingClientRect();
    const x = e.clientX - rc.left, y = e.clientY - rc.top; if(x < 0 || y < 0 || x > rc.width || y > rc.height) return;
    if(!e.target || !(e.target === c || (e.target.closest && e.target.closest('.stage')) )) return; if(e.target.closest && e.target.closest('button,input,select,.zoom,#dvdCmd,#dvdProps,#acadVP')) return;
    const i = VP.tiles.findIndex(t => { const R = rectOf(t); return x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h; });
    if(i >= 0 && i !== VP.active){ activateTile(i); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  A.onLoad = (function(prev){ return function(){ VP.tiles = null; VP.active = 0; if(prev) prev(); }; })(A.onLoad);
  cmd(['VPORTS', 'VIEWPORTS'], 'Chia màn hình Model thành nhiều khung nhìn (1, 2, 3, 4) — bấm vào khung để làm hiện hành', async () => {
    try{ if(!isModelView()){ log('VPORTS trong layout: dùng MVIEW.'); return; } }catch(_){}
    const k = await A.getKw('Cấu hình khung nhìn', { kw: [{ k: '1', t: 'Một' }, { k: '2', t: 'Hai dọc' }, { k: '2N', t: 'Hai ngang' }, { k: '3', t: 'Ba (lớn bên phải)' }, { k: '3T', t: 'Ba (lớn bên trái)' }, { k: '3D', t: 'Ba cột' }, { k: '4', t: 'Bốn' }, { k: 'J', t: 'Gộp (về một)' }], def: 'Bốn' });
    const m = { '1': '1', '2': '2V', '2N': '2H', '3': '3R', '3T': '3L', '3D': '3V', '4': '4', 'J': '1' }[k.kw || '4']; setVports(m);
    log(m === '1' ? 'VPORTS: một khung nhìn.' : 'VPORTS: ' + VP.tiles.length + ' khung nhìn. Bấm vào khung để làm hiện hành; mỗi khung phóng/kéo riêng.');
  });

  /* =====================================================================
     2) MẢNG LIÊN KẾT (associative array) + ARRAYEDIT
     ===================================================================== */
  A.MEM.arrAssoc = A.MEM.arrAssoc !== false;
  function arrItems(d){
    const out = []; const src = d.src;
    const tr = (dx, dy) => src.map(e => { const w = copy(e); translateEnt(w, dx, dy); return w; });
    if(d.k === 'R'){ for(let i = 0; i < d.C; i++) for(let j = 0; j < d.R; j++) out.push(tr(d.dx * i, d.dy * j)); }
    else if(d.k === 'P'){ const step = Math.abs(Math.abs(d.F) - 360) < 1e-9 ? d.F / d.N : d.F / (d.N - 1);
      for(let i = 0; i < d.N; i++){ const a = step * i; out.push(src.map(e => { const w = copy(e); if(!i) return w; if(d.rot) rotateEnt(w, a, d.c); else { const ce = entCenter(w), q = _rotPt(ce, d.c, a * D2R); translateEnt(w, q.x - ce.x, q.y - ce.y); } return w; })); } }
    else if(d.k === 'A' && A.pathAt){ const PA = A.pathAt(d.pp); const a0 = PA.at(0).ang; out.push(src.map(copy));
      for(let i = 0; i < d.N; i++){ const q = PA.at(i * d.step); if(i === 0 && Math.abs(q.x - d.base.x) + Math.abs(q.y - d.base.y) < 1e-9 && !(d.align && Math.abs(q.ang - a0) > 1e-12)) continue;
        out.push(src.map(e => { const w = copy(e); translateEnt(w, q.x - d.base.x, q.y - d.base.y); if(d.align && Math.abs(q.ang - a0) > 1e-12) rotateEnt(w, (q.ang - a0) * R2D, { x: q.x, y: q.y }); return w; })); } }
    return out;
  }
  function shiftDef(d, dx, dy){ if(!dx && !dy) return d; const n = JSON.parse(JSON.stringify(d)); n.src = n.src.map(e => { translateEnt(e, dx, dy); return e; }); if(n.c){ n.c.x += dx; n.c.y += dy; } if(n.base){ n.base.x += dx; n.base.y += dy; } if(n.pp) n.pp.P = n.pp.P.map(p => ({ x: p.x + dx, y: p.y + dy })); n.h0 = { x: n.h0.x + dx, y: n.h0.y + dy }; return n; }
  function buildArray(d, gid){
    const items = arrItems(d); const out = [];
    items.forEach((it, ii) => it.forEach((w, k) => { for(const f of ['cid', 'arrd']) delete w[f]; w.grp = gid; w.blk = '*ARRAY'; if(ii === 0 && k === 0) w.arrd = d; out.push(w); }));
    return out;
  }
  A.arrCommit = function(sel, add, def, msg){
    if(!A.MEM.arrAssoc || !sel.length || sel.some(e => e.grp || A.isLocked(e))) return false;
    const gid = A.newGroupId('AR'); const d = Object.assign({}, JSON.parse(JSON.stringify(def)), { src: sel.map(e => { const w = copy(e); delete w.cid; return w; }) }); d.h0 = center(d.src[0]);
    const rep = sel.map((e, k) => { const w = copy(e); w.grp = gid; w.blk = '*ARRAY'; if(k === 0) w.arrd = d; return [e, w]; });
    for(const w of add){ w.grp = gid; w.blk = '*ARRAY'; delete w.arrd; }
    A.commit({ rep, add }, msg + ' (liên kết — sửa bằng ARRAYEDIT hoặc bảng Thuộc tính)'); return true;
  };
  const holderOf = e => e && e.grp ? modelEntities.find(m => m.grp === e.grp && m.arrd) : null;
  function rebuild(holder, patch){
    const cur = holderOf(holder) || holder; const c0 = center(cur); let d = shiftDef(cur.arrd, c0.x - cur.arrd.h0.x, c0.y - cur.arrd.h0.y);
    d = Object.assign(JSON.parse(JSON.stringify(d)), patch || {});
    if(d.k === 'A' && A.pathAt){ const T = A.pathAt(d.pp).total; if(patch && patch.N != null && patch.step == null) d.step = d.pp.closed ? T / d.N : T / Math.max(1, d.N - 1); if(patch && patch.step != null) d.N = Math.floor(T / d.step + 1e-9) + 1; }
    const cnt = (d.k === 'R' ? d.C * d.R : d.N) * d.src.length; if(cnt > 60000){ say('Mảng quá lớn.'); return false; }
    const mem = modelEntities.filter(m => m.grp === cur.grp); const add = buildArray(d, cur.grp);
    A.commit({ del: mem, add }, 'Đã sửa mảng'); try{ selEnts.clear(); for(const w of add) selEnts.add(w); refreshPanSel(); }catch(_){}
    return true;
  }
  A.arrayEdit = rebuild;
  cmd(['ARRAYEDIT', 'ARRAYASSOC'], 'Sửa mảng liên kết: số cột/hàng, khoảng cách, số phần tử, góc', async () => {
    const r = await A.getEnt('Chọn mảng', { filter: e => !!holderOf(e) }); if(!r.ent) return; let h = holderOf(r.ent);
    for(;;){
      const d = h.arrd; let k;
      if(d.k === 'R') k = await A.getKw('Sửa mảng chữ nhật', { kw: [{ k: 'COL', t: 'Số cột (' + d.C + ')' }, { k: 'R', t: 'Số hàng (' + d.R + ')' }, { k: 'S', t: 'Khoảng cách (' + fmt(d.dx) + ', ' + fmt(d.dy) + ')' }, { k: 'X', t: 'Thoát' }], def: 'Thoát' });
      else if(d.k === 'P') k = await A.getKw('Sửa mảng tròn', { kw: [{ k: 'I', t: 'Số phần tử (' + d.N + ')' }, { k: 'F', t: 'Góc lấp đầy (' + d.F + '°)' }, { k: 'ROT', t: 'Xoay phần tử (' + (d.rot ? 'Có' : 'Không') + ')' }, { k: 'X', t: 'Thoát' }], def: 'Thoát' });
      else k = await A.getKw('Sửa mảng theo đường', { kw: [{ k: 'I', t: 'Số phần tử (' + d.N + ')' }, { k: 'S', t: 'Khoảng cách (' + fmt(d.step) + ')' }, { k: 'AL', t: 'Xoay theo đường (' + (d.align ? 'Có' : 'Không') + ')' }, { k: 'X', t: 'Thoát' }], def: 'Thoát' });
      if(!k.kw || k.kw === 'X') return;
      let patch = null;
      if(k.kw === 'COL'){ const v = await A.getNum('Số cột', { def: d.C }); if(v.num >= 1) patch = { C: Math.round(v.num) }; }
      else if(k.kw === 'R' && d.k === 'R'){ const v = await A.getNum('Số hàng', { def: d.R }); if(v.num >= 1) patch = { R: Math.round(v.num) }; }
      else if(k.kw === 'S' && d.k === 'R'){ const a = await A.getDist('Khoảng cách cột', { def: d.dx }); const b = await A.getDist('Khoảng cách hàng', { def: d.dy }); patch = { dx: a.num != null ? a.num : d.dx, dy: b.num != null ? b.num : d.dy }; }
      else if(k.kw === 'I'){ const v = await A.getNum('Số phần tử', { def: d.N }); if(v.num >= 2) patch = { N: Math.round(v.num) }; }
      else if(k.kw === 'F'){ const v = await A.getNum('Góc lấp đầy (độ)', { def: d.F }); if(v.num != null) patch = { F: v.num }; }
      else if(k.kw === 'ROT') patch = { rot: !d.rot };
      else if(k.kw === 'AL') patch = { align: !d.align };
      else if(k.kw === 'S'){ const v = await A.getDist('Khoảng cách', { def: d.step }); if(v.num > 0) patch = { step: v.num }; }
      if(patch && rebuild(h, patch)) h = modelEntities.find(m => m.arrd && m.grp === h.grp) || h;
    }
  });
  plain(['ARRAYASSOCIATIVITY', 'ARRAYASSOC_ONOFF'], 'Bật/tắt tạo mảng liên kết (mặc định bật như AutoCAD)', () => { A.MEM.arrAssoc = !A.MEM.arrAssoc; log('Mảng mới ' + (A.MEM.arrAssoc ? 'là mảng liên kết.' : 'là các đối tượng rời.')); });
  // bảng Thuộc tính: mục "Mảng"
  const _pal = window.DVDPalExtra;
  window.DVDPalExtra = function(s, editable){
    const prev = _pal ? _pal(s, editable) : null;
    try{
      const gids = new Set(s.map(e => e.grp).filter(Boolean)); if(gids.size !== 1) return prev; const h = modelEntities.find(m => m.grp === [...gids][0] && m.arrd); if(!h) return prev; const d = h.arrd, ro = editable ? '' : ' readonly';
      const row = (k, l, v) => '<div class="r"><label>' + l + '</label><input data-arr="' + k + '" value="' + esc(v) + '"' + ro + '></div>';
      let html = '<div class="grp">Mảng liên kết — ' + (d.k === 'R' ? 'chữ nhật' : d.k === 'P' ? 'tròn' : 'theo đường') + '</div>';
      if(d.k === 'R') html += row('C', 'Số cột', d.C) + row('R', 'Số hàng', d.R) + row('dx', 'Khoảng cột', fmt(d.dx)) + row('dy', 'Khoảng hàng', fmt(d.dy));
      else if(d.k === 'P') html += row('N', 'Số phần tử', d.N) + row('F', 'Góc lấp đầy', d.F) + row('rot', 'Xoay phần tử (1/0)', d.rot ? 1 : 0);
      else html += row('N', 'Số phần tử', d.N) + row('step', 'Khoảng cách', fmt(d.step)) + row('align', 'Xoay theo đường (1/0)', d.align ? 1 : 0);
      const bind = root => { root.querySelectorAll('[data-arr]').forEach(inp => inp.addEventListener('change', () => { const k = inp.dataset.arr, v = A.calc ? A.calc(inp.value) : parseFloat(inp.value); if(!isFinite(v)) return;
        const patch = {}; if(k === 'C' || k === 'R' || k === 'N') patch[k] = Math.max(1, Math.round(v)); else if(k === 'rot' || k === 'align') patch[k] = !!v; else patch[k] = v; rebuild(h, patch); try{ DVDCmd.refreshPalette(); }catch(_){} })); if(prev && prev.bind) prev.bind(root); };
      return { html: ((prev && prev.html) || '') + html, bind };
    }catch(err){ console.warn(err); return prev; }
  };

  /* =====================================================================
     3) HATCH LIÊN KẾT ĐƯỜNG BIÊN
     ===================================================================== */
  const newCid = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function loopOf(e){
    if(e.type === 'POLYLINE' && (e.closed || e.vertices.length > 2) && !e.wq) return e.vertices.map(p => ({ x: p.x, y: p.y }));
    if(e.type === 'CIRCLE'){ const o = []; const n = 72; for(let i = 0; i < n; i++){ const a = i / n * TAU; o.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } return o; }
    if(e.type === 'ELLIPSE'){ const c = G.curveOf(e); if(!c || !c.closed) return null; return c.pieces.map(p => ({ x: p.ax, y: p.ay })); }
    return null;
  }
  function matchBoundary(loop, pool){
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const p of loop){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const sz = Math.max(x1 - x0, y1 - y0, 1e-9), tol = sz * 2e-3;
    for(const e of pool){ if(!/^(POLYLINE|CIRCLE|ELLIPSE)$/.test(e.type) || e.wipe) continue; const b = entBBox(e); if(!b || Math.abs(b.x0 - x0) > tol || Math.abs(b.y0 - y0) > tol || Math.abs(b.x1 - x1) > tol || Math.abs(b.y1 - y1) > tol) continue;
      const c = G.curveOf(e); if(!c) continue; let ok = true; for(let i = 0; i < loop.length; i += Math.max(1, Math.floor(loop.length / 40))){ const q = G.nearOnCurve(c, loop[i]); if(!q || q.d > tol){ ok = false; break; } } if(ok) return e; }
    return null;
  }
  const _cm = A.commit;
  A.commit = function(ch, msg){
    try{
      if(ch){
        // hatch mới: gắn với đường biên kín trùng khớp
        const adds = ch.add || []; const hs = adds.filter(e => e && e.type === 'HATCH' && !e.hassoc && e.loops && e.loops.length && !e.grp);
        if(hs.length){ ch.rep = ch.rep || [];
          for(const h of hs){ const pool = []; const b = entBBox(h); if(!b) continue; const pad = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.01; for(const e of A.queryBox(b.x0 - pad, b.y0 - pad, b.x1 + pad, b.y1 + pad, 5000)) pool.push(e); for(const e of adds) if(e !== h) pool.push(e);
            const ids = h.loops.map(lp => { const m = matchBoundary(lp, pool); if(!m) return null; if(!m.cid){ if(adds.includes(m)) m.cid = newCid(); else { const pr = ch.rep.find(([o]) => o === m); if(pr){ if(!pr[1].cid) pr[1].cid = newCid(); return pr[1].cid; } const w = copy(m); w.cid = newCid(); ch.rep.push([m, w]); return w.cid; } } return m.cid; });
            if(ids.some(Boolean)) h.hassoc = ids; } }
        // đường biên bị sửa / xoá → cập nhật hatch
        const changed = new Map(); for(const [o, w] of (ch.rep || [])) if(w && w.cid) changed.set(w.cid, w);
        const gone = new Set(); for(const e of (ch.del || [])) if(e && e.cid) gone.add(e.cid);
        if(changed.size || gone.size){
          for(const h of modelEntities){ if(h.type !== 'HATCH' || !h.hassoc) continue; if(!h.hassoc.some(c => c && (changed.has(c) || gone.has(c)))) continue;
            let pr = (ch.rep || []).find(([o]) => o === h); let w = pr ? pr[1] : null; if(!w){ w = copy(h); ch.rep = ch.rep || []; ch.rep.push([h, w]); }
            if((ch.del || []).includes(h)) continue;
            w.hassoc = h.hassoc.map((c, i) => { if(!c) return null; if(gone.has(c) && !changed.has(c)) return null; const b = changed.get(c); if(b){ const lp = loopOf(b); if(lp && lp.length >= 3) w.loops[i] = lp; } return c; });
            if(!w.hassoc.some(Boolean)) delete w.hassoc; }
        }
      }
    }catch(err){ console.warn('hatch assoc', err); }
    return _cm.apply(this, arguments);
  };
  A.hatchAssocOf = h => h && h.hassoc ? h.hassoc.slice() : null;
  cmd(['HATCHASSOC', 'HATCHLINK'], 'Gắn / bỏ liên kết hatch với đường biên', async () => {
    const s = await A.getSel('Chọn hatch', { filter: e => e.type === 'HATCH' }); const list = (s.sel || []).filter(e => e.type === 'HATCH'); if(!list.length) return;
    const k = await A.getKw('Liên kết', { kw: [{ k: 'C', t: 'Gắn lại' }, { k: 'B', t: 'Bỏ liên kết' }], def: 'Gắn lại' });
    if(k.kw === 'B'){ A.commit({ rep: list.map(h => { const w = copy(h); delete w.hassoc; return [h, w]; }) }, 'Đã bỏ liên kết ' + list.length + ' hatch'); return; }
    const del = list.slice(), add = list.map(h => { const w = copy(h); delete w.hassoc; return w; }); A.commit({ del, add }, 'Đã gắn lại liên kết hatch');
    log(add.filter(h => h.hassoc).length + '/' + add.length + ' hatch đã liên kết với đường biên kín.');
  });

  /* =====================================================================
     4) SPELL — kiểm tra chính tả (bộ kiểm tra của trình duyệt)
     ===================================================================== */
  plain(['SPELL', 'SP', 'CHINHTA'], 'Kiểm tra chính tả chữ trong bản vẽ (gạch đỏ dưới từ sai, sửa trực tiếp)', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const src = (selEnts.size ? [...selEnts] : modelEntities).filter(e => e.type === 'TEXT' && !e.dimd && !e.tbld && !A.isLocked(e) && String(e.text || '').trim() && !e.fld);
    const uniq = new Map(); for(const e of src){ const t = String(e.text); if(!uniq.has(t)) uniq.set(t, []); uniq.get(t).push(e); }
    const keys = [...uniq.keys()].slice(0, 600);
    if(!keys.length){ say('Không có chữ để kiểm tra.'); return; }
    A.dialog({ title: 'Kiểm tra chính tả (' + keys.length + ' nội dung' + (selEnts.size ? ', trong vùng chọn' : '') + ')', wide: true, okText: 'Áp dụng sửa',
      html: '<p style="margin:0 0 6px;opacity:.8;font-size:12.5px">Từ sai được gạch đỏ (theo từ điển của trình duyệt / hệ điều hành — có tiếng Việt nếu máy đã cài). Bấm chuột phải vào từ để xem gợi ý, sửa trực tiếp rồi bấm Áp dụng.</p>' +
        '<label style="font-size:12.5px">Ngôn ngữ <select id="spL"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label><div id="spB" style="max-height:52vh;overflow:auto;margin-top:6px">' + keys.map((t, i) => '<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:4px"><span style="opacity:.6;min-width:34px;font-size:11px">×' + uniq.get(t).length + '</span><textarea data-i="' + i + '" spellcheck="true" lang="vi" rows="' + Math.min(4, String(t).split('\n').length) + '" style="flex:1;resize:vertical;background:var(--bg-canvas);color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:4px 6px;font:13px system-ui">' + esc(t) + '</textarea></div>').join('') + '</div>',
      onOpen: root => { root.querySelectorAll('textarea').forEach(ta => { ta.addEventListener('keydown', e => e.stopPropagation()); }); root.querySelector('#spL').onchange = ev => root.querySelectorAll('textarea').forEach(ta => { ta.lang = ev.target.value; ta.spellcheck = false; ta.spellcheck = true; }); const f = root.querySelector('textarea'); if(f) setTimeout(() => f.focus(), 60); },
      ok: root => { const rep = []; root.querySelectorAll('textarea[data-i]').forEach(ta => { const old = keys[+ta.dataset.i], nv = ta.value; if(nv === old) return; for(const e of uniq.get(old)){ const w = copy(e); w.text = nv; rep.push([e, w]); } });
        if(rep.length) A.commit({ rep }, 'Chính tả: đã sửa ' + rep.length + ' chữ'); else log('Không có thay đổi.'); } });
  });

  /* =====================================================================
     5) BIẾN HỆ THỐNG (SETVAR) + PTYPE
     ===================================================================== */
  const SET = A.SET; const save = () => { try{ A.saveSet(); }catch(_){} };
  const OSB = { end: 1, mid: 2, cen: 4, nod: 8, qua: 16, int: 32, ins: 64, per: 128, tan: 256, nea: 512, gce: 1024, ext: 4096, par: 8192 };
  const ptKey = () => 'dvd:pt::' + docName();
  function loadPT(){ try{ const o = JSON.parse(localStorage.getItem(ptKey()) || 'null'); PDMODE = o ? o.m | 0 : 0; PDSIZE = o ? +o.s || 0 : 0; }catch(_){ PDMODE = 0; PDSIZE = 0; } }
  function savePT(){ try{ localStorage.setItem(ptKey(), JSON.stringify({ m: PDMODE, s: PDSIZE })); }catch(_){} try{ draw(); }catch(_){} }
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); loadPT(); }; })(A.onLoad); setTimeout(loadPT, 0);
  const aciOf = h => { try{ return typeof aciFromHex === 'function' ? aciFromHex(h) : 7; }catch(_){ return 7; } };
  const V = {
    OSMODE: { d: 'Chế độ bắt điểm (mã bit: 1 END, 2 MID, 4 CEN, 8 NOD, 16 QUA, 32 INT, 64 INS, 128 PER, 256 TAN, 512 NEA, 1024 GCE, 4096 EXT, 8192 PAR, 16384 = tắt)', get: () => { let v = 0; for(const m of SET.osm) v |= OSB[m] || 0; return SET.osnap ? v : v | 16384; }, set: v => { v = v | 0; SET.osm = Object.keys(OSB).filter(k => v & OSB[k]); SET.osnap = !(v & 16384) && v !== 0; save(); } },
    ORTHOMODE: { d: 'Chế độ vuông góc (0/1)', get: () => SET.ortho ? 1 : 0, set: v => { SET.ortho = !!+v; save(); } },
    SNAPMODE: { d: 'Bắt bước lưới (0/1)', get: () => SET.snap ? 1 : 0, set: v => { SET.snap = !!+v; save(); } },
    GRIDMODE: { d: 'Hiện lưới (0/1)', get: () => SET.grid ? 1 : 0, set: v => { SET.grid = !!+v; save(); try{ draw(); }catch(_){} } },
    SNAPUNIT: { d: 'Bước lưới (0 = tự động)', get: () => SET.snapSp || 0, set: v => { SET.snapSp = Math.max(0, +v || 0); save(); } },
    POLARANG: { d: 'Góc tăng của truy bắt cực (độ)', get: () => SET.polarAng, set: v => { if(+v > 0){ SET.polarAng = +v; save(); } } },
    POLARMODE: { d: 'Truy bắt cực (0/1)', get: () => SET.polar ? 1 : 0, set: v => { SET.polar = !!+v; save(); } },
    AUTOSNAP: { d: 'Truy bắt theo điểm OTRACK (0/1)', get: () => SET.otrack ? 1 : 0, set: v => { SET.otrack = !!+v; save(); } },
    DYNMODE: { d: 'Nhập động cạnh con trỏ (0/1)', get: () => SET.dyn ? 1 : 0, set: v => { SET.dyn = !!+v; save(); } },
    APERTURE: { d: 'Ô bắt điểm (pixel)', get: () => SET.aperture, set: v => { if(+v > 0){ SET.aperture = +v; save(); } } },
    PICKBOX: { d: 'Ô chọn (pixel)', get: () => SET.pickbox, set: v => { if(+v >= 0){ SET.pickbox = +v; save(); } } },
    CURSORSIZE: { d: 'Độ dài sợi tóc con trỏ (% màn hình)', get: () => SET.xhair, set: v => { if(+v > 0){ SET.xhair = Math.min(100, +v); save(); } } },
    PICKSTYLE: { d: 'Chọn cả nhóm (0/1)', get: () => SET.pickGroup === false ? 0 : 1, set: v => { SET.pickGroup = !!+v; save(); } },
    ROLLOVERTIPS: { d: 'Gợi ý thuộc tính khi rê chuột (0/1)', get: () => SET.rollover === false ? 0 : 1, set: v => { SET.rollover = !!+v; save(); } },
    CLAYER: { d: 'Lớp hiện hành', s: 1, get: () => A.LS.cur, set: v => { const n = String(v).trim(); if(!A.layerNames().includes(n)) A.addLayer(n); A.setCurLayer(n); } },
    CECOLOR: { d: 'Màu hiện hành (BYLAYER, số ACI hoặc #rrggbb)', s: 1, get: () => A.LS.color === 'BYLAYER' ? 'BYLAYER' : String(aciOf(A.LS.color)), set: v => { const t = String(v).trim().toUpperCase(); if(t === 'BYLAYER') A.setCurColor('BYLAYER'); else if(/^#[0-9A-F]{6}$/.test(t)) A.setCurColor(t.toLowerCase()); else if(+t >= 1 && +t <= 255 && typeof aciHex === 'function') A.setCurColor(aciHex(+t)); } },
    CELTYPE: { d: 'Kiểu nét hiện hành', s: 1, get: () => A.LS.lt, set: v => A.setCurLT(String(v).trim().toUpperCase()) },
    CELWEIGHT: { d: 'Bề rộng nét hiện hành (1/100 mm, -1 = BYLAYER)', get: () => A.LS.lw === 'BYLAYER' ? -1 : A.LS.lw, set: v => A.setCurLW(+v < 0 ? 'BYLAYER' : +v) },
    CELTSCALE: { d: 'Tỉ lệ kiểu nét cho đối tượng mới', get: () => A.LS.celts, set: v => A.setCELTS(+v) },
    LTSCALE: { d: 'Tỉ lệ kiểu nét toàn cục', get: () => LTSCALE, set: v => A.setLTScale(+v) },
    TEXTSIZE: { d: 'Cao chữ mặc định', get: () => A.MEM.th || 2.5, set: v => { if(+v > 0) A.MEM.th = +v; } },
    OFFSETDIST: { d: 'Khoảng OFFSET mặc định', get: () => A.MEM.offset != null ? A.MEM.offset : -1, set: v => { A.MEM.offset = +v >= 0 ? +v : null; } },
    FILLETRAD: { d: 'Bán kính FILLET', get: () => A.MEM.fr != null ? A.MEM.fr : (A.MEM.frad || 0), set: v => { A.MEM.fr = +v; A.MEM.frad = +v; } },
    PDMODE: { d: 'Kiểu điểm (0 chấm, 1 không, 2 +, 3 x, 4 |; +32 tròn, +64 vuông)', get: () => PDMODE, set: v => { PDMODE = +v | 0; savePT(); } },
    PDSIZE: { d: 'Cỡ điểm (0 = 5% màn hình, >0 đơn vị bản vẽ, <0 % màn hình)', get: () => PDSIZE, set: v => { PDSIZE = +v || 0; savePT(); } },
    WIPEOUTFRAME: { d: 'Khung vùng che (0 tắt, 1 hiện & in, 2 hiện không in)', get: () => WIPEFRAME, set: v => { WIPEFRAME = Math.max(0, Math.min(2, +v | 0)); try{ localStorage.setItem('dvd:wipeframe', String(WIPEFRAME)); draw(); }catch(_){} } },
    INSUNITS: { d: 'Đơn vị bản vẽ (4 mm, 5 cm, 6 m, 1 inch, 2 feet)', get: () => insunits, set: v => { insunits = +v | 0; try{ draw(); }catch(_){} } },
    ARRAYASSOCIATIVITY: { d: 'Mảng mới là mảng liên kết (0/1)', get: () => A.MEM.arrAssoc ? 1 : 0, set: v => { A.MEM.arrAssoc = !!+v; } },
    MIRRTEXT: { d: 'Lật chữ khi đối xứng MIRROR (0 = giữ chữ đọc được, 1 = lật cả chữ)', get: () => window.MIRRTEXT ? 1 : 0, set: v => { window.MIRRTEXT = +v ? 1 : 0; try{ localStorage.setItem('dvd:mirrtext', String(window.MIRRTEXT)); }catch(_){} } },
    TILEMODE: { d: 'Đang ở Model (1) hay Layout (0) — chỉ đọc', get: () => { try{ return isModelView() ? 1 : 0; }catch(_){ return 1; } }, set: () => log('Chuyển Model/Layout bằng tab dưới màn hình.') },
    DATE: { d: 'Ngày giờ hiện tại — chỉ đọc', s: 1, get: () => new Date().toLocaleString('vi-VN'), set: () => {} },
    DWGNAME: { d: 'Tên bản vẽ — chỉ đọc', s: 1, get: () => docName(), set: () => {} },
    ISODRAFT: { d: 'Vẽ trục đo (0 tắt, T trên, L trái, R phải)', s: 1, get: () => SET.iso ? SET.iso.toUpperCase()[0] : '0', set: v => setIso(String(v).trim().toUpperCase()) }
  };
  async function askVar(n){ const x = V[n]; const cur = x.get(); if(x.ro){ log(n + ' = ' + cur + ' (chỉ đọc)'); return; } const r = await A.getStr('Nhập giá trị mới cho ' + n, { def: String(cur) }); if(r.str == null || r.str === '') return; x.set(r.str); log(n + ' = ' + V[n].get()); try{ draw(); A.paint(); }catch(_){} }
  const regVar = n => { if(DVDCmd.commands.some(c => c.k.includes(n))) return; cmd([n], 'Biến hệ thống: ' + V[n].d, () => askVar(n)); };
  // def: mô-đun khác khai báo thêm biến hệ thống (gõ tên ở dòng lệnh, SETVAR, (getvar) / (setvar) của LISP)
  A.sysvar = { get: n => V[n] ? V[n].get() : undefined, set: (n, v) => { if(!V[n] || V[n].ro) return false; V[n].set(v); return true; }, list: () => Object.keys(V), desc: n => V[n] ? V[n].d : '',
    def: (n, o) => { n = String(n).toUpperCase(); V[n] = o; regVar(n); } };
  for(const n of Object.keys(V)) regVar(n);
  plain(['SETVAR', 'SET', 'SYSVAR'], 'Biến hệ thống (OSMODE, ORTHOMODE, PDMODE, CLAYER, TEXTSIZE…)', () => {
    const rows = () => Object.keys(V).sort().map(n => '<tr><td><b>' + n + '</b></td><td><input data-v="' + n + '" value="' + esc(V[n].get()) + '" style="width:120px"></td><td style="white-space:normal;opacity:.8;font-size:11.5px">' + esc(V[n].d) + '</td></tr>').join('');
    A.dialog({ title: 'Biến hệ thống (SETVAR)', wide: true, okText: 'Áp dụng', html: '<input id="svF" placeholder="Lọc tên biến…" style="width:100%;margin-bottom:6px"><div class="lm-tbl"><table><thead><tr><th>Tên</th><th>Giá trị</th><th>Ý nghĩa</th></tr></thead><tbody id="svB">' + rows() + '</tbody></table></div><p style="opacity:.75;font-size:12px">Cũng có thể gõ thẳng tên biến ở dòng lệnh, vd <code>OSMODE</code>, <code>PDMODE</code>.</p>',
      onOpen: root => { root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation())); root.querySelector('#svF').addEventListener('input', ev => { const q = ev.target.value.toUpperCase(); root.querySelectorAll('#svB tr').forEach(tr => { tr.style.display = tr.textContent.toUpperCase().includes(q) ? '' : 'none'; }); }); },
      ok: root => { let n = 0; root.querySelectorAll('input[data-v]').forEach(i => { const k = i.dataset.v; if(String(V[k].get()) !== i.value){ V[k].set(i.value); n++; } }); log('SETVAR: đã đổi ' + n + ' biến.'); try{ draw(); A.paint(); }catch(_){} } });
  });
  plain(['PTYPE', 'DDPTYPE'], 'Kiểu điểm & cỡ điểm (PDMODE / PDSIZE)', () => {
    const modes = [0, 1, 2, 3, 4, 32, 33, 34, 35, 36, 64, 65, 66, 67, 68, 96, 97, 98, 99, 100];
    A.dialog({ title: 'Kiểu điểm (PTYPE)', html: '<div id="ptG" style="display:grid;grid-template-columns:repeat(5,52px);gap:6px">' + modes.map(m => '<canvas data-m="' + m + '" width="48" height="48" style="border:2px solid ' + (m === PDMODE ? '#3d9ae8' : '#4a5363') + ';border-radius:4px;cursor:pointer;background:#1b2028"></canvas>').join('') + '</div><label class="dvd-frow" style="margin-top:8px"><span>Cỡ điểm</span><span class="v"><input id="ptS" value="' + (PDSIZE || 5) + '"></span></label><label><input type="radio" name="ptR" value="rel"' + (PDSIZE <= 0 ? ' checked' : '') + '> % so với màn hình</label> &nbsp; <label><input type="radio" name="ptR" value="abs"' + (PDSIZE > 0 ? ' checked' : '') + '> Đơn vị bản vẽ</label>',
      onOpen: root => { let cur = PDMODE; const paint = () => root.querySelectorAll('canvas').forEach(c => { const m = +c.dataset.m; const g = c.getContext('2d'); g.clearRect(0, 0, 48, 48); g.strokeStyle = '#e6eaf0'; g.fillStyle = '#e6eaf0'; g.lineWidth = 1.4; const b = m & 31, r = 14, x = 24, y = 24; g.beginPath(); if(b === 0){ g.arc(x, y, 2, 0, TAU); g.fill(); g.beginPath(); } if(b === 2){ g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); } if(b === 3){ g.moveTo(x - 10, y - 10); g.lineTo(x + 10, y + 10); g.moveTo(x + 10, y - 10); g.lineTo(x - 10, y + 10); } if(b === 4){ g.moveTo(x, y); g.lineTo(x, y - r); } if(m & 32){ g.moveTo(x + 9, y); g.arc(x, y, 9, 0, TAU); } if(m & 64) g.rect(x - 9, y - 9, 18, 18); g.stroke(); c.style.borderColor = m === cur ? '#3d9ae8' : '#4a5363'; });
        paint(); root.querySelector('#ptG').addEventListener('click', e => { const c = e.target.closest('canvas'); if(!c) return; cur = +c.dataset.m; root._m = cur; paint(); }); root._m = cur; root.querySelector('#ptS').addEventListener('keydown', e => e.stopPropagation()); },
      ok: root => { PDMODE = root._m | 0; const v = Math.abs(parseFloat(root.querySelector('#ptS').value) || 5); PDSIZE = root.querySelector('input[name=ptR]:checked').value === 'abs' ? v : -v; savePT(); log('PDMODE = ' + PDMODE + ', PDSIZE = ' + PDSIZE); } });
  });

  /* =====================================================================
     6) ISODRAFT / ISOCIRCLE — vẽ hình chiếu trục đo
     ===================================================================== */
  const PLN = { T: 'top', L: 'left', R: 'right' }, PLV = { top: 'Trên', left: 'Trái', right: 'Phải' };
  function setIso(v){ if(v === '0' || v === 'O' || v === 'OFF' || v === 'TAT'){ SET.iso = null; save(); log('ISODRAFT: tắt.'); updIso(); return; } const p = PLN[v[0]] || (SET.iso ? null : 'left'); if(!p) return; SET.iso = p; SET.ortho = true; save(); log('ISODRAFT: mặt ' + PLV[p] + ' (F5 đổi mặt, ORTHO theo trục 30°/90°/150°).'); updIso(); }
  function cycleIso(){ if(!SET.iso) return; SET.iso = SET.iso === 'left' ? 'top' : SET.iso === 'top' ? 'right' : 'left'; save(); log('<Mặt trục đo: ' + PLV[SET.iso] + '>'); updIso(); try{ A.paint(); }catch(_){} }
  function updIso(){ try{ const sb = document.querySelector('.ac-sb'); if(!sb) return; let c = document.getElementById('acIso'); if(!c){ c = document.createElement('button'); c.id = 'acIso'; c.title = 'Vẽ trục đo (ISODRAFT) — bấm để đổi mặt, F5'; c.addEventListener('click', () => SET.iso ? cycleIso() : setIso('L')); sb.insertBefore(c, sb.firstChild); } c.textContent = SET.iso ? 'ISO ' + PLV[SET.iso] : 'ISO'; c.classList.toggle('on', !!SET.iso); }catch(_){} }
  setTimeout(updIso, 300);
  window.addEventListener('keydown', e => { if(e.key === 'F5' && SET.iso && document.documentElement.classList.contains('acad')){ e.preventDefault(); cycleIso(); } }, true);
  cmd(['ISODRAFT', 'ISOPLANE'], 'Vẽ trục đo: mặt Trái / Trên / Phải (F5 đổi mặt), ORTHO đi theo trục 30°/90°/150°', async () => {
    const k = await A.getKw('Mặt trục đo', { kw: [{ k: 'L', t: 'Trái' }, { k: 'T', t: 'Trên' }, { k: 'R', t: 'Phải' }, { k: 'O', t: 'Tắt' }], def: SET.iso ? 'Tắt' : 'Trái' }); setIso(k.kw || (SET.iso ? 'O' : 'L'));
  });
  function isoEllipse(c, r, plane){
    const ang = plane === 'top' ? [30, 150] : plane === 'left' ? [90, 150] : [90, 30];
    const u = { x: Math.cos(ang[0] * D2R), y: Math.sin(ang[0] * D2R) }, v = { x: Math.cos(ang[1] * D2R), y: Math.sin(ang[1] * D2R) };
    // ảnh của đường tròn bán kính r trong mặt (u,v) → tìm trục elip từ ma trận M M^T
    const a = u.x * u.x + v.x * v.x, b = u.x * u.y + v.x * v.y, d = u.y * u.y + v.y * v.y; const tr = a + d, det = a * d - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc; let ex = b, ey = l1 - a; if(Math.hypot(ex, ey) < 1e-12){ ex = l1 - d; ey = b; } if(Math.hypot(ex, ey) < 1e-12){ ex = 1; ey = 0; } const L = Math.hypot(ex, ey);
    const R1 = r * Math.sqrt(l1), R2 = r * Math.sqrt(Math.max(l2, 0));
    return { type: 'ELLIPSE', cx: c.x, cy: c.y, mx: ex / L * R1, my: ey / L * R1, ratio: R2 / R1 };
  }
  A.isoEllipse = isoEllipse;
  cmd(['ISOCIRCLE', 'ISOC'], 'Vòng tròn trục đo (elip theo mặt ISODRAFT hiện hành)', async () => {
    const plane = SET.iso || 'top'; const c = await A.getPoint('Tâm vòng tròn trục đo (mặt ' + PLV[plane] + ')'); if(!c.pt) return;
    const r = await A.getDist('Bán kính', { base: c.pt, def: A.MEM.cr || 100 }); const R = r.num != null ? Math.abs(r.num) : (A.MEM.cr || 100); if(!(R > 0)) return; A.MEM.cr = R;
    const e = isoEllipse(c.pt, R, plane); A.newProps(e); A.commit({ add: [e] }, 'Vòng tròn trục đo R' + fmt(R) + ' (mặt ' + PLV[plane] + ')');
  });

  /* =====================================================================
     7) XCLIP / IMAGECLIP — cắt hiển thị khối, tham chiếu, ảnh theo khung
     ===================================================================== */
  async function clipCmd(kind){
    const r = await A.getEnt(kind === 'I' ? 'Chọn ảnh' : 'Chọn khối / tham chiếu ngoài', { filter: e => kind === 'I' ? e.type === 'IMAGE' : !!(e.grp || e.xr) }); if(!r.ent) return;
    const e0 = r.ent; const members = e0.type === 'IMAGE' ? [e0] : e0.xr ? modelEntities.filter(m => m.xr === e0.xr) : modelEntities.filter(m => m.grp === e0.grp);
    const k = await A.getKw('Tuỳ chọn', { kw: [{ k: 'N', t: 'Khung cắt mới' }, { k: 'D', t: 'Xoá khung cắt' }, { k: 'OF', t: 'Tắt' }, { k: 'ON', t: 'Bật' }], def: 'Khung cắt mới' });
    let fn;
    if(k.kw === 'D') fn = w => { delete w.clip; delete w.clip0; };
    else if(k.kw === 'OF') fn = w => { if(w.clip){ w.clip0 = w.clip; delete w.clip; } };
    else if(k.kw === 'ON') fn = w => { if(w.clip0){ w.clip = w.clip0; delete w.clip0; } };
    else { const a = await A.getPoint('Góc thứ nhất của khung cắt'); if(!a.pt) return; const b = await A.getPoint('Góc đối diện', { base: a.pt, rubber: false, preview: (g, p) => g.poly([a.pt, { x: p.x, y: a.pt.y }, p, { x: a.pt.x, y: p.y }], true) }); if(!b.pt) return;
      const c = { x: Math.min(a.pt.x, b.pt.x), y: Math.min(a.pt.y, b.pt.y), w: Math.abs(b.pt.x - a.pt.x), h: Math.abs(b.pt.y - a.pt.y) }; if(!(c.w > 0 && c.h > 0)) return; fn = w => { w.clip = c; delete w.clip0; }; }
    A.commit({ rep: members.map(m => { const w = copy(m); fn(w); return [m, w]; }) }, (kind === 'I' ? 'IMAGECLIP' : 'XCLIP') + ': ' + members.length + ' đối tượng');
  }
  cmd(['XCLIP', 'XC', 'CLIP'], 'Cắt hiển thị khối / tham chiếu ngoài theo khung chữ nhật', () => clipCmd('X'));
  cmd(['IMAGECLIP', 'ICL'], 'Cắt hiển thị ảnh nền theo khung chữ nhật', () => clipCmd('I'));

  /* =====================================================================
     8) GROUPEDIT, HYPERLINK
     ===================================================================== */
  cmd(['GROUPEDIT', 'GROUPEDIT2'], 'Sửa nhóm: thêm / bớt đối tượng, đổi tên', async () => {
    const r = await A.getEnt('Chọn nhóm', { filter: e => !!e.grp && !e.dimd && !e.tbld }); if(!r.ent) return; const gid = r.ent.grp, name = r.ent.blk || '*NHÓM';
    const k = await A.getKw('Sửa nhóm', { kw: [{ k: 'A', t: 'Thêm đối tượng' }, { k: 'R', t: 'Bớt đối tượng' }, { k: 'REN', t: 'Đổi tên' }], def: 'Thêm đối tượng' });
    if(k.kw === 'REN'){ const v = await A.getStr('Tên nhóm mới', { def: String(name).replace(/^\*/, '') }); const n = String(v.str || '').trim(); if(!n) return; A.commit({ rep: modelEntities.filter(m => m.grp === gid).map(m => { const w = copy(m); w.blk = n; return [m, w]; }) }, 'Đổi tên nhóm → ' + n); return; }
    const pg0 = SET.pickGroup; SET.pickGroup = false; let sel;
    try{ const s = await A.getSel(k.kw === 'R' ? 'Chọn đối tượng cần bớt khỏi nhóm' : 'Chọn đối tượng cần thêm vào nhóm'); sel = (s.sel || []).filter(e => !A.isLocked(e)); } finally { SET.pickGroup = pg0; }
    if(!sel.length) return;
    if(k.kw === 'R') A.commit({ rep: sel.filter(e => e.grp === gid).map(e => { const w = copy(e); delete w.grp; delete w.blk; return [e, w]; }) }, 'Đã bớt khỏi nhóm');
    else A.commit({ rep: sel.filter(e => e.grp !== gid && !e.grp).map(e => { const w = copy(e); w.grp = gid; w.blk = name; return [e, w]; }) }, 'Đã thêm vào nhóm');
  });
  cmd(['HYPERLINK', 'HL', 'LIENKET'], 'Gắn liên kết web / file cho đối tượng (OPENLINK để mở)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const cur = sel.find(e => e.href); const v = await A.getStr('Địa chỉ liên kết (để trống = bỏ liên kết)', { def: cur ? cur.href : 'https://' }); const u = String(v.str == null ? (cur ? cur.href : '') : v.str).trim();
    A.commit({ rep: sel.map(e => { const w = copy(e); if(u && u !== 'https://') w.href = u; else delete w.href; return [e, w]; }) }, u ? 'Đã gắn liên kết ' + u : 'Đã bỏ liên kết');
  });
  cmd(['OPENLINK', 'GOHYPERLINK'], 'Mở liên kết gắn trên đối tượng', async () => {
    const r = await A.getEnt('Chọn đối tượng có liên kết', { filter: e => !!e.href }); if(!r.ent) return; const u = r.ent.href; log('Mở ' + u); try{ window.open(/^[a-z]+:/i.test(u) ? u : 'https://' + u, '_blank', 'noopener'); }catch(_){}
  });
  // Ctrl + bấm đối tượng có liên kết → mở (như AutoCAD)
  document.addEventListener('click', e => { if(!(e.ctrlKey || e.metaKey) || A.busy()) return; const c = document.getElementById('cv'); if(!c || !(e.target === c || (e.target.closest && e.target.closest('.stage')))) return; try{ const rc = c.getBoundingClientRect(); const w = toWorld(e.clientX - rc.left, e.clientY - rc.top); const tol = 6 / view.scale; const hit = A.queryBox(w.x - tol, w.y - tol, w.x + tol, w.y + tol, 200).find(x => x.href); if(hit){ e.preventDefault(); window.open(/^[a-z]+:/i.test(hit.href) ? hit.href : 'https://' + hit.href, '_blank', 'noopener'); } }catch(_){} }, true);

  /* =====================================================================
     9) DIMBREAK — ngắt đường kích thước / đường gióng tại chỗ cắt nét khác
     ===================================================================== */
  // truy vấn theo hình học SẮP áp dụng (trong lúc commit) — để chỗ ngắt / hatch tính theo vị trí mới
  function pendQuery(bb){ const P = A._pend; let L = A.queryBox(bb[0], bb[1], bb[2], bb[3], 3000); if(!P) return L;
    L = L.filter(o => !P.del.has(o)).map(o => P.rep.get(o) || o); for(const a of P.add){ const b = entBBox(a); if(b && !(b.x1 < bb[0] || b.x0 > bb[2] || b.y1 < bb[1] || b.y0 > bb[3])) L.push(a); } for(const [o, w] of P.rep){ if(L.includes(w)) continue; const b = entBBox(w); if(b && !(b.x1 < bb[0] || b.x0 > bb[2] || b.y1 < bb[1] || b.y0 > bb[3])) L.push(w); } return L; }
  A.pendQuery = pendQuery;
  if(A.dimRegenFrom){
    const _dr = A.dimRegenFrom;
    A.dimRegenFrom = function(w){
      const out = _dr.apply(this, arguments); if(!out || !w.dimd || !w.dimd.brk) return out;
      try{
        const gap = ((w.dimd.s && w.dimd.s.txt) || w.h || 2.5) * 0.6; const res = [];
        for(const e of out){
          if(e.type !== 'LINE'){ res.push(e); continue; }
          const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1); if(L < 1e-9){ res.push(e); continue; }
          const seg = { t: 's', ax: e.x1, ay: e.y1, bx: e.x2, by: e.y2, u0: 0, u1: L };
          const bb = [Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.max(e.x1, e.x2), Math.max(e.y1, e.y2)]; const ts = [];
          for(const o of pendQuery(bb)){ if(o.grp === w.grp || o.type === 'TEXT' || o.type === 'HATCH') continue; const c = G.curveOf(o); if(!c) continue; for(const p of c.pieces) for(const q of G.xPieces(seg, p)) if(q.ua > gap * 0.3 && q.ua < L - gap * 0.3) ts.push(q.ua); }
          if(!ts.length){ res.push(e); continue; }
          ts.sort((a, b) => a - b); let s0 = 0; const ux = (e.x2 - e.x1) / L, uy = (e.y2 - e.y1) / L;
          const piece = (a, b) => { if(b - a > 1e-9) res.push(Object.assign({}, e, { x1: e.x1 + ux * a, y1: e.y1 + uy * a, x2: e.x1 + ux * b, y2: e.y1 + uy * b })); };
          for(const t of ts){ piece(s0, Math.max(s0, t - gap / 2)); s0 = Math.max(s0, t + gap / 2); } piece(s0, L);
        }
        return res;
      }catch(err){ console.warn(err); return out; }
    };
  }
  cmd(['DIMBREAK'], 'Ngắt đường kích thước / gióng tại chỗ cắt qua nét khác (R = bỏ ngắt)', async () => {
    const k = await A.getKw('Tuỳ chọn', { kw: [{ k: 'A', t: 'Tự động ngắt' }, { k: 'R', t: 'Bỏ ngắt' }], def: 'Tự động ngắt' });
    const s = await A.getSel('Chọn kích thước', { filter: e => !!e.grp }); const ts = [...new Set((s.sel || []).map(e => e.dimd ? e : modelEntities.find(m => m.grp === e.grp && m.dimd)).filter(Boolean))]; if(!ts.length){ log('Chưa chọn kích thước.'); return; }
    A.commit({ rep: ts.map(t => { const w = copy(t); if(k.kw === 'R') delete w.dimd.brk; else w.dimd.brk = 1; return [t, w]; }) }, 'DIMBREAK: ' + ts.length + ' kích thước');
  });

  /* =====================================================================
     10) PURGE (hộp thoại), OPTIONS, STATUS, REGENALL
     ===================================================================== */
  plain(['PURGE', 'PU'], 'Dọn bản vẽ: lớp trống, kiểu nét không dùng, khối động / trạng thái lớp không dùng', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const used = new Set(modelEntities.map(e => e.layer || '0'));
    const lay = A.layerNames().filter(n => n !== '0' && n !== A.LS.cur && !used.has(n));
    const ltUsed = new Set(modelEntities.map(e => e.lt).filter(Boolean)); for(const v of Object.values(A.LS.layLT || {})) ltUsed.add(v); ltUsed.add(A.LS.lt);
    const lts = Object.keys(A.LS.ltd || {}).filter(n => !ltUsed.has(n));
    const D = (A.dynDefs && A.dynDefs()) || {}; const blkUsed = new Set(modelEntities.filter(e => e.bm).map(e => e.bm.name)); const dyn = Object.keys(D).filter(n => !blkUsed.has(n));
    const sec = (id, t, arr) => '<div class="dvd-sub">' + t + ' (' + arr.length + ')</div>' + (arr.length ? arr.map(n => '<label style="display:block"><input type="checkbox" data-' + id + '="' + esc(n) + '" checked> ' + esc(n) + '</label>').join('') : '<p style="opacity:.6;margin:2px 0">Không có.</p>');
    A.dialog({ title: 'Dọn bản vẽ (PURGE)', okText: 'Dọn các mục đã chọn', html: '<div style="max-height:55vh;overflow:auto">' + sec('l', 'Lớp không dùng', lay) + sec('t', 'Kiểu nét không dùng', lts) + sec('d', 'Định nghĩa khối động không dùng', dyn) + '</div>',
      ok: root => { let n = 0; root.querySelectorAll('[data-l]:checked').forEach(c => { if(!A.deleteLayer(c.dataset.l)) n++; }); root.querySelectorAll('[data-t]:checked').forEach(c => { delete A.LS.ltd[c.dataset.t]; try{ delete LTYPES[c.dataset.t]; }catch(_){} n++; }); if(root.querySelectorAll('[data-t]:checked').length) A.lsSave();
        const dd = [...root.querySelectorAll('[data-d]:checked')].map(c => c.dataset.d); if(dd.length){ for(const k of dd) delete D[k]; try{ localStorage.setItem('dvd:dynblk', JSON.stringify(D)); }catch(_){} n += dd.length; } log('PURGE: đã dọn ' + n + ' mục.'); } });
  });
  plain(['OPTIONS', 'OP', 'TUYCHON'], 'Tuỳ chọn (hiển thị, nền, bề rộng nét, đơn vị…)', () => { const b = document.getElementById('displayBtn'); if(b) b.click(); });
  plain(['STATUS'], 'Trạng thái bản vẽ: số đối tượng, phạm vi, lớp hiện hành, chế độ vẽ', () => {
    const b = (typeof bounds !== 'undefined' && bounds) || null; const by = {}; for(const e of modelEntities) by[e.type] = (by[e.type] || 0) + 1;
    log('STATUS: ' + docName() + ' · ' + modelEntities.length + ' đối tượng (' + Object.entries(by).map(([k, v]) => k + ' ' + v).join(', ') + ')');
    log('  Phạm vi: ' + (b ? fmt(b.minX) + ',' + fmt(b.minY) + ' → ' + fmt(b.maxX) + ',' + fmt(b.maxY) : '—') + ' · Lớp hiện hành: ' + A.LS.cur + ' · OSNAP ' + (SET.osnap ? 'bật' : 'tắt') + ' · ORTHO ' + (SET.ortho ? 'bật' : 'tắt') + ' · POLAR ' + (SET.polar ? SET.polarAng + '°' : 'tắt') + (SET.iso ? ' · ISO ' + PLV[SET.iso] : ''));
  });
  plain(['REGENALL', 'REDRAWALL'], 'Vẽ lại tất cả khung nhìn', () => redraw());

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
