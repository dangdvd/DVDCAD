/* DVDCAD v4k — KHỐI ĐỘNG (dynamic blocks) kiểu AutoCAD
   BPARAMETER (BPARAM): gán tham số cho khối — Hiển thị (visibility states), Kéo giãn thẳng (linear + stretch), Lật (flip X/Y)
   BVSTATE / BDYN: đổi trạng thái của 1 bản khối · bảng Thuộc tính (chọn khối) có mục "Khối động" để đổi trực tiếp.
   Định nghĩa lưu theo tên khối (dùng chung mọi bản vẽ trên máy: 'dvd:dynblk'); trạng thái từng bản lưu trên đối tượng (e.dyn). */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x5 || !window.DVDCmd) return; A._x5 = true;
  const D2R = Math.PI / 180;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const w = deep(e); delete w.userAdded; return w; };
  const fmt = v => String(+(+v).toFixed(4));

  /* ---------------- định nghĩa ---------------- */
  const KEY = 'dvd:dynblk';
  let DEF = {}; try{ DEF = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(_){ DEF = {}; }
  const saveDef = () => { try{ localStorage.setItem(KEY, JSON.stringify(DEF)); }catch(_){ say('Không lưu được định nghĩa khối động (bộ nhớ đầy).'); } };
  const defOf = name => DEF[name] || null;
  A.dynDefs = () => DEF;

  /* ---------------- ma trận ---------------- */
  const ap = (M, p) => ({ x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f });
  const lin = (M, v) => ({ x: M.a * v.x + M.c * v.y, y: M.b * v.x + M.d * v.y });
  const mul = (M, N) => ({ a: M.a * N.a + M.c * N.b, b: M.b * N.a + M.d * N.b, c: M.a * N.c + M.c * N.d, d: M.b * N.c + M.d * N.d, e: M.a * N.e + M.c * N.f + M.e, f: M.b * N.e + M.d * N.f + M.f });
  function inv(M){ const det = M.a * M.d - M.b * M.c; if(Math.abs(det) < 1e-18) return null; const a = M.d / det, b = -M.b / det, c = -M.c / det, d = M.a / det; return { a, b, c, d, e: -(a * M.e + c * M.f), f: -(b * M.e + d * M.f) }; }

  /* ---------------- bản khối (instance) ---------------- */
  function instOf(ent){ if(!ent || !ent.grp || !ent.bm) return null; const list = modelEntities.filter(e => e.grp === ent.grp); return { gid: ent.grp, name: ent.bm.name, bm: ent.bm, list }; }
  function stateOf(I){ const d = defOf(I.name) || {}; const s0 = I.list.find(e => e.dyn) || {}; const st = deep(s0.dyn || {});
    if(d.vis && !st.vis) st.vis = d.vis.def || d.vis.states[0]; st.L = st.L || {}; for(const p of (d.lin || [])) if(st.L[p.name] == null) st.L[p.name] = p.def; st.fx = st.fx ? 1 : 0; st.fy = st.fy ? 1 : 0; return st; }

  // dời các điểm nằm bên "đầu kéo" (local) theo hướng u một đoạn dl
  function stretchLocal(w, u, base, thr, dl){
    const mv = p => { const t = (p.x - base.x) * u.x + (p.y - base.y) * u.y; return t > thr ? { x: p.x + u.x * dl, y: p.y + u.y * dl } : p; };
    const mvXY = (o, kx, ky) => { const q = mv({ x: o[kx], y: o[ky] }); o[kx] = q.x; o[ky] = q.y; };
    switch(w.type){
      case 'LINE': mvXY(w, 'x1', 'y1'); mvXY(w, 'x2', 'y2'); break;
      case 'POLYLINE': w.vertices = (w.vertices || []).map(p => Object.assign({}, p, mv(p))); break;
      case 'SOLID': w.pts = (w.pts || []).map(mv); break;
      case 'HATCH': w.loops = (w.loops || []).map(l => l.map(mv)); break;
      case 'CIRCLE': case 'ARC': case 'ELLIPSE': mvXY(w, 'cx', 'cy'); break;
      case 'TEXT': case 'POINT': mvXY(w, 'x', 'y'); break;
    }
    return w;
  }
  // áp trạng thái mới cho 1 bản khối → danh sách rep
  function applyState(I, ns){
    const d = defOf(I.name) || {}; const old = stateOf(I); const rep = [];
    let bm = I.bm; const Mi = inv(bm); if(!Mi) return rep;
    const F = { a: (ns.fx ^ old.fx) ? -1 : 1, b: 0, c: 0, d: (ns.fy ^ old.fy) ? -1 : 1, e: 0, f: 0 };
    const flip = F.a < 0 || F.d < 0;
    const newBm = flip ? Object.assign({}, bm, mul(bm, F)) : bm;
    const Wf = flip ? mul(bm, mul(F, Mi)) : null;   // lật quanh gốc khối, trong hệ toạ độ khối
    for(const e of I.list){
      let w = copy(e);
      // kéo giãn (trong hệ toạ độ khối)
      for(const p of (d.lin || [])){ const dl = (ns.L[p.name] != null ? +ns.L[p.name] : p.def) - (old.L[p.name] != null ? +old.L[p.name] : p.def); if(Math.abs(dl) < 1e-12) continue;
        const u = { x: Math.cos(p.ang * D2R), y: Math.sin(p.ang * D2R) }; const cur = old.L[p.name] != null ? +old.L[p.name] : p.def;
        // hướng kéo trong hệ local đã lật (giữ nguyên định nghĩa)
        w = A.xformEnt(w, Mi); stretchLocal(w, u, p.base, cur * 0.5, dl); w = A.xformEnt(w, bm); }
      if(flip) w = A.xformEnt(w, Wf);
      w.bm = newBm; w.dyn = { vis: ns.vis, L: Object.assign({}, ns.L), fx: ns.fx, fy: ns.fy };
      if(d.vis){ const on = !e.dvs || e.dvs.includes(ns.vis); if(on) delete w.vh; else w.vh = 1; }
      rep.push([e, w]);
    }
    return rep;
  }
  function setState(I, patch, msg){ const ns = Object.assign(stateOf(I), patch); if(patch.L) ns.L = Object.assign(stateOf(I).L, patch.L); const rep = applyState(I, ns); if(rep.length) A.commit({ rep }, msg || 'Khối động "' + I.name + '"'); try{ selEnts.clear(); for(const [, w] of rep) selEnts.add(w); }catch(_){} }
  A.dynSet = (ent, patch) => { const I = instOf(ent); if(!I) return false; setState(I, patch); return true; };
  A.dynState = ent => { const I = instOf(ent); return I ? stateOf(I) : null; };

  /* ---------------- BPARAMETER ---------------- */
  async function pickInst(prompt){ const r = await A.getEnt(prompt || 'Chọn khối', { filter: e => !!(e.bm && e.grp) }); if(!r.ent) return null; return instOf(r.ent); }
  cmd(['BPARAMETER', 'BPARAM', 'BACTION', 'KHOIDONG'], 'Khối động: thêm tham số Hiển thị / Kéo giãn / Lật cho khối', async () => {
    const I = await pickInst('Chọn khối cần thêm tham số động'); if(!I) return;
    const k = await A.getKw('Loại tham số', { kw: [{ k: 'V', t: 'Hiển thị (Visibility)' }, { k: 'L', t: 'Kéo giãn (Linear)' }, { k: 'F', t: 'Lật (Flip)' }, { k: 'X', t: 'Xoá tham số' }], def: 'Hiển thị (Visibility)' });
    const kw = k.kw || 'V'; const d = DEF[I.name] = DEF[I.name] || {};
    if(kw === 'X'){ delete DEF[I.name]; saveDef(); const rep = I.list.map(e => { const w = copy(e); delete w.dyn; delete w.dvs; delete w.vh; return [e, w]; }); A.commit({ rep }, 'Đã bỏ tham số động của khối "' + I.name + '"'); return; }
    if(kw === 'F'){ const f = await A.getKw('Cho phép lật', { kw: [{ k: 'X', t: 'Ngang (X)' }, { k: 'Y', t: 'Dọc (Y)' }, { k: 'C', t: 'Cả hai' }], def: 'Cả hai' }); const v = f.kw || 'C'; d.flipX = v !== 'Y'; d.flipY = v !== 'X'; saveDef(); log('Khối "' + I.name + '": cho phép lật ' + (v === 'C' ? 'X và Y' : v) + '. Chọn khối → bảng Thuộc tính để lật.'); return; }
    const Mi = inv(I.bm);
    if(kw === 'L'){
      const a = await A.getPoint('Điểm gốc (phần cố định)'); if(!a.pt) return; const b = await A.getPoint('Điểm đầu kéo (phần sẽ giãn)', { base: a.pt }); if(!b.pt) return;
      const la = ap(Mi, a.pt), lb = ap(Mi, b.pt); const L = Math.hypot(lb.x - la.x, lb.y - la.y); if(L < 1e-9) return;
      let nm = 'Dai' + ((d.lin || []).length + 1); const s = await A.getStr('Tên tham số', { def: nm }); if(s.str && s.str.trim()) nm = s.str.trim();
      d.lin = (d.lin || []).filter(p => p.name !== nm); d.lin.push({ name: nm, base: la, ang: Math.atan2(lb.y - la.y, lb.x - la.x) / D2R, def: L }); saveDef();
      // gán giá trị hiện tại cho bản này
      const rep = I.list.map(e => { const w = copy(e); w.dyn = Object.assign({}, e.dyn || {}); w.dyn.L = Object.assign({}, (e.dyn && e.dyn.L) || {}, { [nm]: L }); return [e, w]; }); A.commit({ rep }, 'Tham số kéo giãn "' + nm + '" = ' + fmt(L));
      log('Khối "' + I.name + '": đổi "' + nm + '" trong bảng Thuộc tính hoặc lệnh BDYN — điểm nằm quá nửa đoạn sẽ dời theo.'); return;
    }
    // Visibility
    d.vis = d.vis || { states: [], def: null };
    const dn = 'TT' + (d.vis.states.length + 1); const s = await A.getStr('Tên trạng thái hiển thị', { def: dn }); if(s.cancel) return; const st = (s.str || dn).trim(); if(!st) return;
    const pg0 = A.SET && A.SET.pickGroup; if(A.SET) A.SET.pickGroup = false; let sel; try{ sel = await A.getSel('Chọn các đối tượng của khối HIỆN ở trạng thái "' + st + '" (Enter = tất cả)'); } finally { if(A.SET) A.SET.pickGroup = pg0; } const on = new Set((sel.sel || []).filter(e => e.grp === I.gid)); const all = !on.size;
    if(!d.vis.states.includes(st)) d.vis.states.push(st); if(!d.vis.def) d.vis.def = st; saveDef();
    const first = d.vis.states.length === 1;
    const rep = I.list.map(e => { const w = copy(e); let v = e.dvs ? e.dvs.slice() : (first ? [] : d.vis.states.filter(x => x !== st)); v = v.filter(x => x !== st); if(all || on.has(e)) v.push(st); w.dvs = v; w.dyn = Object.assign({}, e.dyn || {}, { vis: st }); if(v.includes(st)) delete w.vh; else w.vh = 1; return [e, w]; });
    A.commit({ rep }, 'Trạng thái hiển thị "' + st + '" (' + (all ? I.list.length : on.size) + ' đối tượng)');
    // các bản khác cùng tên: gán dvs theo vị trí tương ứng
    syncOthers(I.name, I.gid);
    log('Khối "' + I.name + '" có ' + d.vis.states.length + ' trạng thái: ' + d.vis.states.join(', ') + '. Thêm trạng thái: chạy lại BPARAMETER → V.');
  });
  // đồng bộ thẻ hiển thị (dvs) cho các bản cùng tên theo chữ ký hình học (toạ độ khối)
  function sigOf(e, Mi){ const w = A.xformEnt(copy(e), Mi); const r = v => Math.round(v * 1000) / 1000; switch(w.type){ case 'LINE': { const a = [r(w.x1), r(w.y1)], b = [r(w.x2), r(w.y2)]; return 'L' + [a, b].map(String).sort().join('|'); } case 'CIRCLE': return 'C' + [r(w.cx), r(w.cy), r(w.r)]; case 'ARC': return 'A' + [r(w.cx), r(w.cy), r(w.r)]; case 'TEXT': return 'T' + [r(w.x), r(w.y), w.text]; case 'POLYLINE': return 'P' + (w.vertices || []).slice(0, 6).map(p => r(p.x) + ',' + r(p.y)).join(';'); default: return w.type + JSON.stringify(entBBox(w) || {}).slice(0, 60); } }
  function syncOthers(name, srcGid){
    const src = modelEntities.filter(e => e.grp === srcGid); if(!src.length) return; const Ms = inv(src[0].bm); const map = new Map(); for(const e of src) map.set(sigOf(e, Ms), e.dvs || null);
    const others = new Map(); for(const e of modelEntities) if(e.bm && e.grp !== srcGid && e.bm.name === name){ if(!others.has(e.grp)) others.set(e.grp, []); others.get(e.grp).push(e); }
    const rep = []; const d = defOf(name);
    for(const [, list] of others){ const Mi = inv(list[0].bm); if(!Mi) continue; const vis = (list.find(e => e.dyn && e.dyn.vis) || {}).dyn; const cur = vis && vis.vis || (d.vis && d.vis.def);
      for(const e of list){ const v = map.get(sigOf(e, Mi)); if(v === undefined) continue; const w = copy(e); if(v) w.dvs = v.slice(); else delete w.dvs; w.dyn = Object.assign({}, e.dyn || {}, { vis: cur }); if(!w.dvs || w.dvs.includes(cur)) delete w.vh; else w.vh = 1; rep.push([e, w]); } }
    if(rep.length) A.commit({ rep }, 'Đồng bộ ' + others.size + ' bản khối "' + name + '"');
  }
  // khi chèn (INSERT) khối có tham số động: áp trạng thái mặc định
  const _commit = A.commit;
  A.commit = function(ch){
    try{ if(ch && ch.add && ch.add.length){ const byG = new Map(); for(const e of ch.add) if(e && e.bm && e.grp && DEF[e.bm.name] && DEF[e.bm.name].vis && !e.dyn){ const d = DEF[e.bm.name]; e.dyn = { vis: d.vis.def || d.vis.states[0] }; if(e.dvs && !e.dvs.includes(e.dyn.vis)) e.vh = 1; } } }catch(_){}
    return _commit.apply(this, arguments);
  };

  cmd(['BDYN', 'BVSTATE', 'BLOCKDYN'], 'Đổi trạng thái khối động (hiển thị, kéo giãn, lật)', async () => {
    const I = await pickInst('Chọn khối động'); if(!I) return; const d = defOf(I.name); if(!d){ log('Khối "' + I.name + '" chưa có tham số động — dùng BPARAMETER.'); return; }
    for(;;){
      const st = stateOf(I); const kw = [];
      if(d.vis) kw.push({ k: 'V', t: 'Hiển thị (' + st.vis + ')' });
      for(const [i, p] of (d.lin || []).entries()) kw.push({ k: 'L' + (i + 1), t: p.name + ' (' + fmt(st.L[p.name]) + ')' });
      if(d.flipX) kw.push({ k: 'X', t: 'Lật ngang' }); if(d.flipY) kw.push({ k: 'Y', t: 'Lật dọc' });
      const r = await A.getKw('Thay đổi', { kw }); if(!r.kw) return;
      if(r.kw === 'V'){ const ks = d.vis.states.map((s, i) => ({ k: String(i + 1), t: s })); const v = await A.getKw('Trạng thái', { kw: ks, def: st.vis }); const ns = v.kw ? d.vis.states[+v.kw - 1] : null; if(ns) setState(I, { vis: ns }); }
      else if(r.kw === 'X') setState(I, { fx: st.fx ? 0 : 1 }, 'Lật ngang khối "' + I.name + '"');
      else if(r.kw === 'Y') setState(I, { fy: st.fy ? 0 : 1 }, 'Lật dọc khối "' + I.name + '"');
      else if(/^L\d+$/.test(r.kw)){ const p = d.lin[+r.kw.slice(1) - 1]; const v = await A.getDist(p.name + ' mới', { def: st.L[p.name] }); const val = v.num; if(val > 0) setState(I, { L: { [p.name]: val } }); }
      I.list = modelEntities.filter(e => e.grp === I.gid); if(!I.list.length) return; I.bm = I.list[0].bm;
    }
  });

  /* ---------------- bảng Thuộc tính: mục "Khối động" ---------------- */
  const _pal = window.DVDPalExtra;
  window.DVDPalExtra = function(s, editable){
    const prev = _pal ? _pal(s, editable) : null;
    try{
      const gids = new Set(s.map(e => e.grp).filter(Boolean)); if(gids.size !== 1) return prev; const e0 = s.find(e => e.bm); if(!e0) return prev; const d = defOf(e0.bm.name); if(!d) return prev;
      const I = instOf(e0); const st = stateOf(I); const dis = editable ? '' : ' disabled';
      let h = '<div class="grp">Khối động — ' + esc(I.name) + '</div>';
      if(d.vis) h += '<div class="r"><label>Hiển thị</label><select data-dyn="vis"' + dis + '>' + d.vis.states.map(x => '<option' + (x === st.vis ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div>';
      for(const p of (d.lin || [])) h += '<div class="r"><label>' + esc(p.name) + '</label><input data-dyn="L" data-n="' + esc(p.name) + '" value="' + fmt(st.L[p.name]) + '"' + (editable ? '' : ' readonly') + '></div>';
      if(d.flipX || d.flipY) h += '<div class="act">' + (d.flipX ? '<button data-dyn="fx"' + dis + '>Lật ngang' + (st.fx ? ' ✓' : '') + '</button>' : '') + (d.flipY ? '<button data-dyn="fy"' + dis + '>Lật dọc' + (st.fy ? ' ✓' : '') + '</button>' : '') + '</div>';
      const bind = root => {
        const cur = () => instOf(modelEntities.find(e => e.grp === I.gid));
        root.querySelectorAll('[data-dyn]').forEach(el => {
          const t = el.dataset.dyn;
          if(t === 'vis') el.addEventListener('change', () => { const J = cur(); if(J) setState(J, { vis: el.value }); try{ draw(); A.paint(); if(window.refreshPanSel) refreshPanSel(); }catch(_){} });
          else if(t === 'L') el.addEventListener('change', () => { const v = A.calc ? A.calc(el.value) : parseFloat(el.value); const J = cur(); if(J && v > 0) setState(J, { L: { [el.dataset.n]: v } }); try{ draw(); A.paint(); }catch(_){} });
          else el.addEventListener('click', () => { const J = cur(); if(!J) return; const s2 = stateOf(J); setState(J, t === 'fx' ? { fx: s2.fx ? 0 : 1 } : { fy: s2.fy ? 0 : 1 }); try{ draw(); A.paint(); }catch(_){} });
        });
        if(prev && prev.bind) prev.bind(root);
      };
      return { html: ((prev && prev.html) || '') + h, bind };
    }catch(err){ console.warn(err); return prev; }
  };
  /* ---------------- xuất: bỏ đối tượng đang ẩn của khối động ---------------- */
  const _toDXF = window.entitiesToDXF;
  if(typeof _toDXF === 'function') window.entitiesToDXF = function(ents){ return _toDXF.call(this, Array.isArray(ents) ? ents.filter(e => !e || !e.vh) : ents); };
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
