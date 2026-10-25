/* DVDCAD v4k (viết lại ở v5i) — khối động (tab Chèn → Khối động)
   · BPARAMETER: chọn khối rồi thêm tham số
       V Hiển thị: đặt tên trạng thái, chọn các nét của khối sẽ hiện ở trạng thái đó (chạy lại để thêm trạng thái khác)
       L Kéo giãn: điểm gốc (phần cố định) + điểm kéo + tên (vd Dai); điểm nằm quá nửa đoạn dời theo hướng kéo
       F Lật: cho phép lật ngang / dọc quanh điểm chèn · X Bỏ mọi tham số động của khối
   · Đổi trạng thái: bảng Thuộc tính (mục "Khối động") hoặc lệnh BDYN. Các bản khác cùng tên tự nhận định nghĩa.
   · Dữ liệu: A.dynDefs() = { tên khối: { vis: { states, def }, lin: [{ name, b, d, L0 }], flip } } (localStorage dvd:dynblk, DXF DVDCAD_DATA)
     thành viên khối: e.dvs = các trạng thái nó hiện, e.dyn = { st, L, fx, fy } của bản chèn, e.vh = đang ẩn (bộ vẽ, chọn, DXF đã đọc). */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x5 || !window.DVDCmd) return; A._x5 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtV = v => String(+(+v).toFixed(6));

  /* ---------------- định nghĩa khối động ---------------- */
  let DYN = {}; try{ DYN = JSON.parse(localStorage.getItem('dvd:dynblk') || '{}') || {}; }catch(_){ DYN = {}; }
  A.dynDefs = () => DYN;
  const saveDefs = () => { try{ localStorage.setItem('dvd:dynblk', JSON.stringify(DYN)); }catch(_){} };
  const nameOf = e => (e && e.bm && e.bm.name) || null;
  const members = gid => A.groupMembers(gid);
  const instances = name => { const m = new Map(); for(const e of modelEntities){ if(e.grp && nameOf(e) === name){ if(!m.has(e.grp)) m.set(e.grp, []); m.get(e.grp).push(e); } } return m; };
  const defOf = name => DYN[name] || null;
  const isDyn = name => { const d = defOf(name); return !!(d && ((d.vis && d.vis.states && d.vis.states.length) || (d.lin && d.lin.length) || d.flip)); };
  function stateOf(list, d){ const s = (list.find(e => e.dyn) || {}).dyn || {}; const L = {}; for(const p of (d && d.lin) || []) L[p.name] = s.L && s.L[p.name] != null ? +s.L[p.name] : p.L0;
    return { st: s.st != null ? s.st : (d && d.vis && d.vis.def) || null, L, fx: s.fx ? 1 : 0, fy: s.fy ? 1 : 0 }; }

  /* ---------------- ma trận ---------------- */
  const ap = (M, p) => ({ x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f });
  const lin = (M, v) => ({ x: M.a * v.x + M.c * v.y, y: M.b * v.x + M.d * v.y });
  function inv(M){ const det = M.a * M.d - M.b * M.c; if(Math.abs(det) < 1e-18) return null; const a = M.d / det, b = -M.b / det, c = -M.c / det, d = M.a / det; return { a, b, c, d, e: -(a * M.e + c * M.f), f: -(b * M.e + d * M.f) }; }
  const mul = (P, Q) => ({ a: P.a * Q.a + P.c * Q.b, b: P.b * Q.a + P.d * Q.b, c: P.a * Q.c + P.c * Q.d, d: P.b * Q.c + P.d * Q.d, e: P.a * Q.e + P.c * Q.f + P.e, f: P.b * Q.e + P.d * Q.f + P.f });
  const matOf = bm => ({ a: bm.a, b: bm.b, c: bm.c, d: bm.d, e: bm.e, f: bm.f });

  // dời các điểm của 1 đối tượng theo hàm fn(p) → p' (dùng cho kéo giãn)
  function mapPts(w, fn){
    const f = (o, kx, ky) => { const q = fn({ x: o[kx], y: o[ky] }); o[kx] = q.x; o[ky] = q.y; };
    switch(w.type){
      case 'LINE': f(w, 'x1', 'y1'); f(w, 'x2', 'y2'); break;
      case 'POLYLINE': { const bv = A.bvOf && A.bvOf(w); if(bv && A.setBV){ A.setBV(w, bv.map(p => Object.assign({}, p, fn(p)))); } else w.vertices = (w.vertices || []).map(p => Object.assign({}, p, fn(p))); delete w.wq; break; }
      case 'CIRCLE': case 'ARC': case 'ELLIPSE': f(w, 'cx', 'cy'); break;
      case 'TEXT': case 'POINT': f(w, 'x', 'y'); break;
      case 'SOLID': w.pts = (w.pts || []).map(p => Object.assign({}, p, fn(p))); break;
      case 'HATCH': w.loops = (w.loops || []).map(l => l.map(p => Object.assign({}, p, fn(p)))); break;
    }
  }

  /* ---------------- đặt trạng thái cho 1 bản chèn ---------------- */
  function applyState(list, target){
    const name = nameOf(list[0]), d = defOf(name); if(!d) return [];
    const cur = stateOf(list, d); const T = Object.assign({}, cur, target || {}); T.L = Object.assign({}, cur.L, (target && target.L) || {});
    let bm = matOf(list[0].bm); const rep = [];
    const flip = (sx, sy) => { const S = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }; const iv = inv(bm); if(!iv) return null; const M = mul(mul(bm, S), iv); bm = mul(bm, S); return M; };
    const ops = [];
    if(d.flip && T.fx !== cur.fx){ const M = flip(-1, 1); if(M) ops.push(w => A.xformEnt(w, M)); }
    if(d.flip && T.fy !== cur.fy){ const M = flip(1, -1); if(M) ops.push(w => A.xformEnt(w, M)); }
    for(const p of d.lin || []){ const dv = (+T.L[p.name]) - cur.L[p.name]; if(!isFinite(dv) || Math.abs(dv) < 1e-12) continue;
      const B = bm, iv = inv(B); if(!iv) continue; const ux = p.d.x, uy = p.d.y;
      ops.push(w => mapPts(w, q => { const l = ap(iv, q); const t = (l.x - p.b.x) * ux + (l.y - p.b.y) * uy; if(t <= p.L0 / 2 + 1e-9) return q; return ap(B, { x: l.x + ux * dv, y: l.y + uy * dv }); })); }
    const st = { st: T.st, L: T.L, fx: T.fx, fy: T.fy };
    for(const e of list){ const w = copy(e); for(const op of ops) op(w); w.bm = Object.assign({}, e.bm, bm); w.dyn = deep(st);
      if(d.vis && Array.isArray(w.dvs)){ if(w.dvs.includes(T.st)) delete w.vh; else w.vh = 1; } else if(w.vh && !(d.vis && w.dvs)) delete w.vh;
      rep.push([e, w]); }
    return rep;
  }
  A.dynSetState = (gid, target, msg) => { const list = members(gid); const rep = applyState(list, target); if(rep.length) A.commit({ rep }, msg || 'Đã đổi trạng thái khối động'); return rep.length > 0; };

  /* ---------------- BPARAMETER ---------------- */
  const pickBlock = pr => A.getEnt(pr, { filter: e => !!(e.grp && e.bm && nameOf(e)) });
  cmd(['BPARAMETER', 'PARAM'], 'Thêm tham số động cho khối: V hiển thị, L kéo giãn, F lật, X bỏ', async () => {
    const r = await pickBlock('Chọn khối'); if(!r.ent) return;
    const gid = r.ent.grp, name = nameOf(r.ent), list = members(gid), bm = r.ent.bm, iv = inv(bm); if(!iv){ log('Khối bị co dẹt — không thêm được tham số.'); return; }
    const k = await A.getKw('Loại tham số', { kw: [{ k: 'V', t: 'Hiển thị' }, { k: 'L', t: 'Kéo giãn' }, { k: 'F', t: 'Lật' }, { k: 'X', t: 'Bỏ tham số' }], def: 'V' });
    const kw = k.kw || (k.none ? 'V' : null); if(!kw) return;
    const d = DYN[name] || (DYN[name] = {});
    if(kw === 'X'){
      const rep = []; for(const [, L] of instances(name)) for(const e of L){ if(!e.dyn && !e.dvs && !e.vh) continue; const w = copy(e); delete w.dyn; delete w.dvs; delete w.vh; rep.push([e, w]); }
      delete DYN[name]; saveDefs(); if(rep.length) A.commit({ rep }); log('Đã bỏ tham số động của khối "' + name + '".'); return;
    }
    if(kw === 'F'){ d.flip = true; saveDefs(); log('Khối "' + name + '" lật được (bảng Thuộc tính → Khối động, hoặc BDYN).'); A.paint(); return; }
    if(kw === 'L'){
      const b = await A.getPoint('Điểm gốc (phần cố định)'); if(!b.pt) return;
      const e2 = await A.getPoint('Điểm kéo', { base: b.pt }); if(!e2.pt) return;
      const lb = ap(iv, b.pt), le = ap(iv, e2.pt), L0 = Math.hypot(le.x - lb.x, le.y - lb.y); if(L0 < 1e-9){ log('Hai điểm trùng nhau.'); return; }
      d.lin = d.lin || []; let pn = 'Dai'; let n = 1; while(d.lin.some(p => p.name === pn)) pn = 'Dai' + (++n);
      const s = await A.getStr('Tên tham số', { def: pn }); const nm = String((s.str || '').trim() || pn).replace(/\s+/g, '_');
      d.lin = d.lin.filter(p => p.name !== nm); d.lin.push({ name: nm, b: lb, d: { x: (le.x - lb.x) / L0, y: (le.y - lb.y) / L0 }, L0 });
      saveDefs(); log('Đã thêm tham số kéo giãn "' + nm + '" = ' + fmtV(L0) + ' cho khối "' + name + '".'); A.paint(); return;
    }
    // V: trạng thái hiển thị
    const sv = await A.getStr('Tên trạng thái hiển thị', { def: 'Trạng thái ' + (((d.vis && d.vis.states) || []).length + 1) }); const st = String((sv.str || '').trim() || ('Trạng thái ' + (((d.vis && d.vis.states) || []).length + 1)));
    const pg = A.SET.pickGroup; A.SET.pickGroup = false;
    let sel; try{ const s = await A.getSel('Chọn các nét của khối sẽ hiện ở trạng thái "' + st + '"', { filter: e => e.grp === gid, pre: false }); sel = (s.sel || []).filter(e => e.grp === gid); } finally { A.SET.pickGroup = pg; }
    if(!sel.length){ log('Chưa chọn nét nào.'); return; }
    const idx = new Set(sel.map(e => list.indexOf(e)).filter(i => i >= 0));
    d.vis = d.vis || { states: [], def: st }; if(!d.vis.states.includes(st)) d.vis.states.push(st); if(!d.vis.def) d.vis.def = st;
    const rep = [];
    for(const [g, L] of instances(name)){
      const cur = stateOf(L, d); const target = g === gid ? st : (cur.st && d.vis.states.includes(cur.st) ? cur.st : d.vis.def);
      L.forEach((e, i) => { const w = copy(e); let dvs = Array.isArray(w.dvs) ? w.dvs.filter(x => x !== st) : null; if(idx.has(i)) dvs = (dvs || []).concat([st]);
        if(dvs && dvs.length) w.dvs = dvs; else delete w.dvs; w.dyn = Object.assign({}, stateOf(L, d), { st: target });
        if(w.dvs && !w.dvs.includes(target)) w.vh = 1; else delete w.vh; rep.push([e, w]); });
    }
    saveDefs(); A.commit({ rep }, 'Đã thêm trạng thái "' + st + '" (' + idx.size + ' nét) cho khối "' + name + '"');
  });

  /* ---------------- đổi trạng thái: BDYN + bảng Thuộc tính ---------------- */
  function formHTML(name, s, ro){
    const d = defOf(name); let h = '';
    if(d.vis && d.vis.states && d.vis.states.length) h += '<div class="r"><label>Trạng thái</label><select data-dyn="st"' + (ro ? ' disabled' : '') + '>' + d.vis.states.map(x => '<option' + (x === s.st ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div>';
    for(const p of d.lin || []) h += '<div class="r"><label>' + esc(p.name) + '</label><input data-dyn="L" data-p="' + esc(p.name) + '" value="' + esc(fmtV(s.L[p.name])) + '"' + (ro ? ' readonly' : '') + '></div>';
    if(d.flip) h += '<div class="act"><button type="button" data-dyn="fx"' + (ro ? ' disabled' : '') + '>⇋ Lật ngang' + (s.fx ? ' ✓' : '') + '</button><button type="button" data-dyn="fy"' + (ro ? ' disabled' : '') + '>⇅ Lật dọc' + (s.fy ? ' ✓' : '') + '</button></div>';
    return h;
  }
  function readForm(root, s){ const T = { st: s.st, L: Object.assign({}, s.L), fx: s.fx, fy: s.fy };
    const sel = root.querySelector('[data-dyn="st"]'); if(sel) T.st = sel.value;
    root.querySelectorAll('[data-dyn="L"]').forEach(i => { const v = A.calc ? A.calc(i.value) : parseFloat(String(i.value).replace(',', '.')); if(isFinite(v) && v > 0) T.L[i.dataset.p] = v; });
    return T; }
  cmd(['BDYN'], 'Đổi trạng thái khối động (hiển thị, độ dài, lật)', async () => {
    const r = await pickBlock('Chọn khối động'); if(!r.ent) return; const name = nameOf(r.ent), gid = r.ent.grp;
    if(!isDyn(name)){ log('Khối "' + name + '" chưa có tham số động — dùng BPARAMETER.'); return; }
    const s = stateOf(members(gid), defOf(name)); let flips = { fx: s.fx, fy: s.fy };
    A.dialog({ title: 'Khối động — ' + name, html: '<div class="dyn-form">' + formHTML(name, s, false) + '</div>',
      onOpen: root => { root.querySelectorAll('input,select').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
        root.querySelectorAll('[data-dyn="fx"],[data-dyn="fy"]').forEach(b => b.onclick = () => { const k = b.dataset.dyn; flips[k] = flips[k] ? 0 : 1; b.textContent = (k === 'fx' ? '⇋ Lật ngang' : '⇅ Lật dọc') + (flips[k] ? ' ✓' : ''); }); },
      ok: root => { const T = readForm(root, s); T.fx = flips.fx; T.fy = flips.fy; A.dynSetState(gid, T); } });
  });
  const _pal = window.DVDPalExtra;
  window.DVDPalExtra = function(s, editable){
    const prev = _pal ? _pal(s, editable) : null;
    try{
      const gids = new Set(s.map(e => e.grp).filter(Boolean)); if(gids.size !== 1) return prev;
      const gid = [...gids][0], name = nameOf(s.find(e => e.grp === gid)); if(!name || !isDyn(name)) return prev;
      const st = stateOf(members(gid), defOf(name));
      const html = (prev && prev.html || '') + '<div class="grp">Khối động</div>' + formHTML(name, st, !editable);
      const bind = root => { if(prev && prev.bind) prev.bind(root);
        root.querySelectorAll('[data-dyn="st"],[data-dyn="L"]').forEach(el => el.addEventListener('change', () => A.dynSetState(gid, readForm(root, st))));
        root.querySelectorAll('[data-dyn="L"]').forEach(el => el.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter') el.blur(); }));
        root.querySelectorAll('[data-dyn="fx"],[data-dyn="fy"]').forEach(b => b.addEventListener('click', () => { const T = readForm(root, st); T[b.dataset.dyn] = st[b.dataset.dyn] ? 0 : 1; A.dynSetState(gid, T); })); };
      return { html, bind };
    }catch(err){ console.warn('dyn pal', err); return prev; }
  };

  /* ---------------- bản chèn mới của khối động nhận định nghĩa ---------------- */
  { const _c = A.commit;
    A.commit = function(ch){
      try{ if(ch && ch.add && ch.add.length){
        const groups = new Map(); for(const e of ch.add){ if(e && e.grp && !e.dyn && nameOf(e) && isDyn(nameOf(e))){ if(!groups.has(e.grp)) groups.set(e.grp, []); groups.get(e.grp).push(e); } }
        for(const [gid, L] of groups){ const name = nameOf(L[0]), d = defOf(name); let tpl = null;
          for(const [g, M] of instances(name)) if(g !== gid && M.length === L.length && M.some(x => x.dvs)){ tpl = M; break; }
          const st = { st: (d.vis && d.vis.def) || null, L: Object.fromEntries((d.lin || []).map(p => [p.name, p.L0])), fx: 0, fy: 0 };
          L.forEach((e, i) => { if(tpl && tpl[i] && tpl[i].dvs) e.dvs = tpl[i].dvs.slice(); e.dyn = deep(st); if(e.dvs && st.st && !e.dvs.includes(st.st)) e.vh = 1; });
        } } }catch(err){ console.warn('x5 commit', err); }
      return _c.apply(this, arguments);
    }; }

  /* ---------------- mở bản vẽ: dựng lại cờ ẩn (vh) theo trạng thái ---------------- */
  A.onLoad = (prev => function(){ if(prev) prev.apply(this, arguments);
    try{ for(const e of modelEntities){ if(!e.dvs || !e.dyn) continue; const v = e.dvs.includes(e.dyn.st); if(v) delete e.vh; else e.vh = 1; } }catch(_){} })(A.onLoad);
})();
