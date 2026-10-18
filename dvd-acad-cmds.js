/* DVDCAD — các lệnh kiểu AutoCAD chạy trên bộ lệnh DVDAcad
   Vẽ: LINE PLINE RECTANG CIRCLE ARC ELLIPSE POLYGON POINT XLINE RAY SPLINE TEXT MTEXT
   Sửa: MOVE COPY ROTATE SCALE MIRROR OFFSET ARRAY STRETCH TRIM EXTEND FILLET CHAMFER BREAK BREAKATPOINT JOIN EXPLODE LENGTHEN ERASE MATCHPROP DDEDIT
   Chú thích: DIMLINEAR DIMALIGNED DIMRADIUS DIMDIAMETER DIMANGULAR DIMCONTINUE DIMBASELINE DIMSTYLE · HATCH
   Hỏi: DIST AREA ID LIST DIVIDE MEASURE · Khối: INSERT BLOCK GROUP UNGROUP · Clipboard: COPYCLIP CUTCLIP COPYBASE PASTECLIP PASTEORIG
   Lớp: LAYMCUR LAYISO LAYUNISO LAYOFF LAYON LAYFRZ LAYTHW LAYLCK LAYULK · NEW · ZOOM · xuất DXF đầy đủ (lớp, hatch, chữ Unicode) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._cmds) return; A._cmds = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => A.log(m);
  const deep = e => JSON.parse(JSON.stringify(e));
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const fmt = v => A.fmt(v);
  const fmtA = d => { d = ((d % 360) + 360) % 360; return (Math.round(d * 1000) / 1000) + '°'; };
  const mk = (type, props) => A.newProps(Object.assign({ type }, props));
  const MEM = A.MEM = (() => { try{ return JSON.parse(sessionStorage.getItem('dvd:mem') || '{}'); }catch(_){ return {}; } })();
  const remember = () => { try{ sessionStorage.setItem('dvd:mem', JSON.stringify(MEM)); }catch(_){} };
  const cmd = (keys, desc, fn, extra) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), Object.assign({ engine: true }, extra || {}));
  const plain = (keys, desc, fn, extra) => DVDCmd.register(keys, desc, fn, extra || {});
  const hl = arr => { const c = A.cur(); if(c){ c.hl = arr || []; A.paint(); } };
  const selHL = arr => { const c = A.cur(); if(c){ c.sel = new Set(arr || []); A.paint(); } };
  function popLastAdd(e){
    const a = editUndoStack[editUndoStack.length - 1];
    if(a && a.op === 'arrayAdd' && a.ents.length === 1 && a.ents[0] === e){ editUndoStack.pop(); applyEdit(a, false); redoStack.length = 0; updateUndoRedoBtns(); draw(); return true; }
    return A.commit({ del: [e] });
  }
  function bboxOf(list){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of list){ const b = entBBox(e); if(!b) continue; if(b.x0 < x0) x0 = b.x0; if(b.y0 < y0) y0 = b.y0; if(b.x1 > x1) x1 = b.x1; if(b.y1 > y1) y1 = b.y1; } return isFinite(x0) ? { x0, y0, x1, y1 } : null; }
  A.bboxOf = bboxOf;
  function remapGroups(list){ const m = new Map(); for(const e of list){ if(e.grp){ if(!m.has(e.grp)) m.set(e.grp, A.newGroupId(e.grp[0])); e.grp = m.get(e.grp); } } return list; }
  function copyOf(e){ const w = deep(e); delete w.userAdded; return w; }

  /* ===================================================================
     VẼ
     =================================================================== */
  cmd(['LINE', 'L'], 'Vẽ đường thẳng (nối tiếp, C = đóng, U = lùi)', async () => {
    let r = await A.getPoint('Chỉ định điểm đầu');
    if(!r.pt) return;
    const first = r.pt; let last = r.pt; const made = [];
    for(;;){
      const kw = [{ k: 'U', t: 'Hoàn tác' }]; if(made.length >= 2) kw.unshift({ k: 'C', t: 'Đóng' });
      r = await A.getPoint('Chỉ định điểm tiếp theo', { base: last, kw });
      if(r.none) break;
      if(r.kw === 'U'){ if(made.length){ const e = made.pop(); popLastAdd(e); last = made.length ? { x: made[made.length - 1].x2, y: made[made.length - 1].y2 } : first; } else log('Không còn đoạn nào để lùi.'); continue; }
      if(r.kw === 'C'){ const e = mk('LINE', { x1: last.x, y1: last.y, x2: first.x, y2: first.y }); A.commit({ add: [e] }); break; }
      if(r.pt){ if(dist(last, r.pt) < 1e-12) continue; const e = mk('LINE', { x1: last.x, y1: last.y, x2: r.pt.x, y2: r.pt.y }); A.commit({ add: [e] }); made.push(e); last = r.pt; }
    }
  });

  function tangentArc(S, d, P){
    const vx = P.x - S.x, vy = P.y - S.y, vv = vx * vx + vy * vy; if(vv < 1e-18) return null;
    const nx = -d.y, ny = d.x, nv = nx * vx + ny * vy;
    if(Math.abs(nv) < 1e-9 * Math.sqrt(vv)) return [S, P];
    const R = vv / (2 * nv), C = { x: S.x + nx * R, y: S.y + ny * R };
    const a0 = Math.atan2(S.y - C.y, S.x - C.x), a1 = Math.atan2(P.y - C.y, P.x - C.x);
    const sw = R > 0 ? G.norm(a1 - a0) : -G.norm(a0 - a1);
    const n = Math.max(4, Math.ceil(Math.abs(sw) / (5 * D2R))), rr = Math.abs(R), out = [];
    for(let i = 0; i <= n; i++){ const a = a0 + sw * i / n; out.push({ x: C.x + rr * Math.cos(a), y: C.y + rr * Math.sin(a) }); }
    out.sw = sw;
    out[out.length - 1] = { x: P.x, y: P.y };
    return out;
  }
  cmd(['PLINE', 'PL'], 'Vẽ đa tuyến (A = cung, L = thẳng, C = đóng, U = lùi, W = độ rộng, H = nửa độ rộng)', async () => {
    let r = await A.getPoint('Chỉ định điểm đầu'); if(!r.pt) return;
    const V = [r.pt], lens = [1]; let arcMode = false, closed = false; const BV = [{ x: r.pt.x, y: r.pt.y }], lensB = [1];
    let wS = MEM.plw || 0, wE = MEM.plw || 0;   // độ rộng đầu / cuối của đoạn kế tiếp (như PLINEWID)
    const setW = async half => { const k = half ? 0.5 : 1; const a = await A.getDist(half ? 'Nửa độ rộng đầu' : 'Độ rộng đầu', { def: wS * k, base: V[V.length - 1] }); if(a.num == null || a.num < 0) return; const b = await A.getDist(half ? 'Nửa độ rộng cuối' : 'Độ rộng cuối', { def: a.num, base: V[V.length - 1] }); if(b.num == null || b.num < 0) return; wS = a.num / k; wE = b.num / k; MEM.plw = wE; remember(); };
    const dirNow = () => { if(V.length >= 2){ const a = V[V.length - 2], b = V[V.length - 1], L = dist(a, b) || 1; return { x: (b.x - a.x) / L, y: (b.y - a.y) / L }; } return { x: 1, y: 0 }; };
    const preview = (g, p) => { if(V.length > 1) g.poly(V, false, '#e8eef7'); if(arcMode){ const a = tangentArc(V[V.length - 1], dirNow(), p); if(a) g.poly(a, false, '#e8eef7'); } };
    for(;;){
      const kw = (arcMode ? [{ k: 'L', t: 'Thẳng' }, { k: 'C', t: 'Đóng' }, { k: 'U', t: 'Hoàn tác' }] : [{ k: 'A', t: 'Cung' }, { k: 'C', t: 'Đóng' }, { k: 'U', t: 'Hoàn tác' }]).concat([{ k: 'W', t: 'Độ rộng' }, { k: 'H', t: 'Nửa độ rộng' }]);
      r = await A.getPoint(arcMode ? 'Chỉ định điểm cuối cung' : 'Chỉ định điểm tiếp theo', { base: V[V.length - 1], kw: V.length >= 3 ? kw : kw.filter(k => k.k !== 'C'), preview, rubber: !arcMode });
      if(r.none) break;
      if(r.kw === 'A'){ arcMode = true; continue; }
      if(r.kw === 'L'){ arcMode = false; continue; }
      if(r.kw === 'W' || r.kw === 'H'){ await setW(r.kw === 'H'); continue; }
      if(r.kw === 'U'){ if(lens.length > 1){ lens.pop(); V.length = lens[lens.length - 1]; lensB.pop(); BV.length = lensB[lensB.length - 1]; delete BV[BV.length - 1].bulge; } continue; }
      if(r.kw === 'C'){ closed = true; break; }
      if(r.pt){
        if(arcMode){ const a = tangentArc(V[V.length - 1], dirNow(), r.pt); if(!a) continue; for(let i = 1; i < a.length; i++) V.push(a[i]); if(a.sw) BV[BV.length - 1].bulge = Math.tan(a.sw / 4); BV[BV.length - 1].sw = wS; BV[BV.length - 1].ew = wE; BV.push({ x: r.pt.x, y: r.pt.y }); }
        else { if(dist(V[V.length - 1], r.pt) < 1e-12) continue; V.push(r.pt); BV[BV.length - 1].sw = wS; BV[BV.length - 1].ew = wE; BV.push({ x: r.pt.x, y: r.pt.y }); }
        wS = wE;
        lens.push(V.length); lensB.push(BV.length);
      }
    }
    if(V.length >= 2){
      if(closed && BV.length >= 2){ BV[BV.length - 1].sw = wS; BV[BV.length - 1].ew = wE; }
      if(BV.some(p => p.sw > 0 || p.ew > 0) && typeof polyWidthQuads === 'function'){   // đa tuyến có độ rộng (tô đặc như AutoCAD)
        const raw = BV.map(p => ({ x: p.x, y: p.y, bulge: p.bulge || 0, sw: p.sw || 0, ew: p.ew || 0 })); const e = widePoly(raw, closed, mk('POLYLINE', {})); A.commit({ add: [e] }); return; }
      const e = mk('POLYLINE', { vertices: V.map(p => ({ x: p.x, y: p.y })), closed }); if(BV.some(p => p.bulge) && A.setBV) A.setBV(e, BV); A.commit({ add: [e] }); }
  });
  A.widthPoly = (raw, closed) => widePoly(raw, closed, {});

  const rectPts = (a, b) => [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }];
  cmd(['RECTANG', 'REC', 'RECTANGLE'], 'Vẽ hình chữ nhật (D = theo kích thước)', async () => {
    let r = await A.getPoint('Chỉ định góc thứ nhất'); if(!r.pt) return; const a = r.pt; let dims = null;
    const corner = p => dims ? { x: a.x + (p.x >= a.x ? 1 : -1) * dims.w, y: a.y + (p.y >= a.y ? 1 : -1) * dims.h } : p;
    for(;;){
      r = await A.getPoint('Chỉ định góc đối diện', { base: a, rubber: false, kw: [{ k: 'D', t: 'Kích thước' }], preview: (g, p) => g.poly(rectPts(a, corner(p)), true) });
      if(r.none) return;
      if(r.kw === 'D'){
        const w = await A.getDist('Chiều dài', { base: a, def: MEM.rw }); const W1 = w.num != null ? Math.abs(w.num) : MEM.rw; if(!(W1 > 0)) continue;
        const h = await A.getDist('Chiều rộng', { base: a, def: MEM.rh }); const H1 = h.num != null ? Math.abs(h.num) : MEM.rh; if(!(H1 > 0)) continue;
        MEM.rw = W1; MEM.rh = H1; remember(); dims = { w: W1, h: H1 }; continue;
      }
      if(r.pt){ const b = r.typed && !dims ? r.pt : corner(r.pt); if(Math.abs(b.x - a.x) < 1e-12 || Math.abs(b.y - a.y) < 1e-12){ log('Hình chữ nhật suy biến.'); continue; } A.commit({ add: [mk('POLYLINE', { vertices: rectPts(a, b), closed: true })] }); return; }
    }
  });

  function circum(a, b, c){
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if(Math.abs(d) < 1e-18) return null;
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return { x, y, r: Math.hypot(a.x - x, a.y - y) };
  }
  G.circum = circum;
  cmd(['CIRCLE', 'C'], 'Vẽ đường tròn (tâm–bán kính, D, 2P, 3P)', async () => {
    let r = await A.getPoint('Chỉ định tâm đường tròn', { kw: [{ k: '3P', t: '3 điểm' }, { k: '2P', t: '2 điểm' }] });
    if(r.none) return;
    if(r.kw === '2P'){
      const p1 = await A.getPoint('Chỉ định đầu thứ nhất của đường kính'); if(!p1.pt) return;
      const p2 = await A.getPoint('Chỉ định đầu thứ hai của đường kính', { base: p1.pt, preview: (g, p) => g.circle({ x: (p1.pt.x + p.x) / 2, y: (p1.pt.y + p.y) / 2 }, dist(p1.pt, p) / 2) }); if(!p2.pt) return;
      const c = { x: (p1.pt.x + p2.pt.x) / 2, y: (p1.pt.y + p2.pt.y) / 2 }, rr = dist(p1.pt, p2.pt) / 2; if(rr > 0) A.commit({ add: [mk('CIRCLE', { cx: c.x, cy: c.y, r: rr })] }); return;
    }
    if(r.kw === '3P'){
      const p1 = await A.getPoint('Chỉ định điểm thứ nhất'); if(!p1.pt) return;
      const p2 = await A.getPoint('Chỉ định điểm thứ hai', { base: p1.pt }); if(!p2.pt) return;
      const p3 = await A.getPoint('Chỉ định điểm thứ ba', { preview: (g, p) => { const c = circum(p1.pt, p2.pt, p); if(c) g.circle(c, c.r); } }); if(!p3.pt) return;
      const c = circum(p1.pt, p2.pt, p3.pt); if(!c){ log('3 điểm thẳng hàng.'); return; } A.commit({ add: [mk('CIRCLE', { cx: c.x, cy: c.y, r: c.r })] }); return;
    }
    const c = r.pt;
    let rr = await A.getDist('Chỉ định bán kính', { base: c, def: MEM.cr, kw: [{ k: 'D', t: 'Đường kính' }], preview: (g, p) => g.circle(c, dist(c, p)) });
    let R;
    if(rr.kw === 'D'){ const d = await A.getDist('Chỉ định đường kính', { base: c, def: MEM.cr ? MEM.cr * 2 : undefined, preview: (g, p) => g.circle(c, dist(c, p) / 2) }); R = d.num != null ? Math.abs(d.num) / 2 : MEM.cr; }
    else R = rr.num != null ? Math.abs(rr.num) : MEM.cr;
    if(!(R > 0)) return; MEM.cr = R; remember();
    A.commit({ add: [mk('CIRCLE', { cx: c.x, cy: c.y, r: R })] });
  });

  function arc3(a, m, b){
    const c = circum(a, m, b); if(!c) return null;
    let a1 = ang(c, a), a2 = ang(c, b); const am = ang(c, m);
    const inCCW = G.norm(am - a1) <= G.norm(a2 - a1);
    if(!inCCW){ const t = a1; a1 = a2; a2 = t; }
    return { type: 'ARC', cx: c.x, cy: c.y, r: c.r, a1: a1 * R2D, a2: a2 * R2D };
  }
  cmd(['ARC', 'A'], 'Vẽ cung tròn (3 điểm, hoặc Tâm–đầu–cuối)', async () => {
    let r = await A.getPoint('Chỉ định điểm đầu của cung', { kw: [{ k: 'C', t: 'Tâm' }] });
    if(r.none) return;
    if(r.kw === 'C'){
      const c = await A.getPoint('Chỉ định tâm cung'); if(!c.pt) return;
      const s = await A.getPoint('Chỉ định điểm đầu của cung', { base: c.pt }); if(!s.pt) return;
      const R = dist(c.pt, s.pt), a1 = ang(c.pt, s.pt);
      const mkA = p => ({ type: 'ARC', cx: c.pt.x, cy: c.pt.y, r: R, a1: a1 * R2D, a2: ang(c.pt, p) * R2D });
      const e = await A.getPoint('Chỉ định điểm cuối (ngược chiều kim đồng hồ)', { base: c.pt, preview: (g, p) => g.ent(mkA(p)) }); if(!e.pt) return;
      A.commit({ add: [A.newProps(mkA(e.pt))] }); return;
    }
    const s = r.pt;
    const r2 = await A.getPoint('Chỉ định điểm thứ hai của cung', { base: s, kw: [{ k: 'C', t: 'Tâm' }, { k: 'E', t: 'Điểm cuối' }] }); if(r2.none) return;
    if(r2.kw === 'C'){
      const c = await A.getPoint('Chỉ định tâm cung', { base: s }); if(!c.pt) return;
      const R = dist(c.pt, s), a1 = ang(c.pt, s); const mkA = p => ({ type: 'ARC', cx: c.pt.x, cy: c.pt.y, r: R, a1: a1 * R2D, a2: ang(c.pt, p) * R2D });
      const e = await A.getPoint('Chỉ định điểm cuối', { base: c.pt, preview: (g, p) => g.ent(mkA(p)) }); if(!e.pt) return;
      A.commit({ add: [A.newProps(mkA(e.pt))] }); return;
    }
    if(r2.kw === 'E'){
      const e = await A.getPoint('Chỉ định điểm cuối cung', { base: s }); if(!e.pt) return;
      const mkA = c => { const R = dist(c, s); return { type: 'ARC', cx: c.x, cy: c.y, r: R, a1: ang(c, s) * R2D, a2: ang(c, e.pt) * R2D }; };
      const c = await A.getPoint('Chỉ định tâm cung', { base: e.pt, preview: (g, p) => g.ent(mkA(p)) }); if(!c.pt) return;
      A.commit({ add: [A.newProps(mkA(c.pt))] }); return;
    }
    const m = r2.pt;
    const e = await A.getPoint('Chỉ định điểm cuối cung', { base: m, preview: (g, p) => { const a = arc3(s, m, p); if(a) g.ent(a); } }); if(!e.pt) return;
    const a = arc3(s, m, e.pt); if(!a){ log('3 điểm thẳng hàng.'); return; }
    A.commit({ add: [A.newProps(a)] });
  });

  function ellipseFrom(c, ax, b){
    const a = Math.hypot(ax.x, ax.y); b = Math.abs(b); if(a < 1e-12 || b < 1e-12) return null;
    if(b <= a) return { type: 'ELLIPSE', cx: c.x, cy: c.y, mx: ax.x, my: ax.y, ratio: b / a, p1: 0, p2: TAU };
    const ux = ax.x / a, uy = ax.y / a; return { type: 'ELLIPSE', cx: c.x, cy: c.y, mx: -uy * b, my: ux * b, ratio: a / b, p1: 0, p2: TAU };
  }
  cmd(['ELLIPSE', 'EL'], 'Vẽ elip (trục + nửa trục kia, hoặc C = theo tâm)', async () => {
    let r = await A.getPoint('Chỉ định đầu trục elip', { kw: [{ k: 'C', t: 'Tâm' }] }); if(r.none) return;
    let c, ax;
    if(r.kw === 'C'){ const r1 = await A.getPoint('Chỉ định tâm elip'); if(!r1.pt) return; c = r1.pt; const r2 = await A.getPoint('Chỉ định đầu trục', { base: c }); if(!r2.pt) return; ax = { x: r2.pt.x - c.x, y: r2.pt.y - c.y }; }
    else { const p1 = r.pt; const r2 = await A.getPoint('Chỉ định đầu kia của trục', { base: p1 }); if(!r2.pt) return; c = { x: (p1.x + r2.pt.x) / 2, y: (p1.y + r2.pt.y) / 2 }; ax = { x: (r2.pt.x - p1.x) / 2, y: (r2.pt.y - p1.y) / 2 }; }
    const r3 = await A.getDist('Chỉ định khoảng tới trục kia', { base: c, preview: (g, p) => { const e = ellipseFrom(c, ax, dist(c, p)); if(e) g.ent(e); } });
    if(r3.num == null) return; const e = ellipseFrom(c, ax, r3.num); if(!e) return;
    A.commit({ add: [A.newProps(e)] });
  });

  function polyPts(c, p, n, mode){
    const R0 = dist(c, p), t0 = ang(c, p), out = [];
    if(mode === 'C'){ const R = R0 / Math.cos(Math.PI / n); for(let k = 0; k < n; k++){ const a = t0 + Math.PI / n + k * TAU / n; out.push({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) }); } }
    else for(let k = 0; k < n; k++){ const a = t0 + k * TAU / n; out.push({ x: c.x + R0 * Math.cos(a), y: c.y + R0 * Math.sin(a) }); }
    return out;
  }
  cmd(['POLYGON', 'POL'], 'Vẽ đa giác đều', async () => {
    const rn = await A.getNum('Nhập số cạnh', { def: MEM.ps || 4 }); let n = Math.round(rn.num != null ? rn.num : (MEM.ps || 4));
    if(!(n >= 3 && n <= 1024)){ log('Số cạnh 3–1024.'); return; } MEM.ps = n; remember();
    const r = await A.getPoint('Chỉ định tâm đa giác', { kw: [{ k: 'E', t: 'Cạnh' }] }); if(r.none) return;
    if(r.kw === 'E'){
      const e1 = await A.getPoint('Chỉ định đầu thứ nhất của cạnh'); if(!e1.pt) return;
      const mkE = p => { const L = dist(e1.pt, p); if(L < 1e-12) return null; const R = L / (2 * Math.sin(Math.PI / n)); const mid = { x: (e1.pt.x + p.x) / 2, y: (e1.pt.y + p.y) / 2 }; const a = ang(e1.pt, p) + Math.PI / 2, h = R * Math.cos(Math.PI / n); const c = { x: mid.x + Math.cos(a) * h, y: mid.y + Math.sin(a) * h }; return polyPts(c, e1.pt, n, 'I'); };
      const e2 = await A.getPoint('Chỉ định đầu thứ hai của cạnh', { base: e1.pt, preview: (g, p) => { const v = mkE(p); if(v) g.poly(v, true); } }); if(!e2.pt) return;
      const v = mkE(e2.pt); if(v) A.commit({ add: [mk('POLYLINE', { vertices: v, closed: true })] }); return;
    }
    const c = r.pt;
    const ic = await A.getKw('Nhập tuỳ chọn', { kw: [{ k: 'I', t: 'Nội tiếp đường tròn' }, { k: 'C', t: 'Ngoại tiếp đường tròn' }], def: MEM.pmode === 'C' ? 'Ngoại tiếp' : 'Nội tiếp' });
    const modeP = ic.kw || MEM.pmode || 'I'; MEM.pmode = modeP; remember();
    const rr = await A.getDist('Chỉ định bán kính đường tròn', { base: c, preview: (g, p) => g.poly(polyPts(c, p, n, modeP), true) });
    if(rr.num == null) return; const p = rr.pt || { x: c.x, y: c.y - Math.abs(rr.num) };
    const v = rr.pt ? polyPts(c, p, n, modeP) : polyPts(c, { x: c.x + Math.abs(rr.num) * Math.cos(-Math.PI / 2 + (modeP === 'C' ? 0 : Math.PI / n)), y: c.y + Math.abs(rr.num) * Math.sin(-Math.PI / 2 + (modeP === 'C' ? 0 : Math.PI / n)) }, n, modeP);
    A.commit({ add: [mk('POLYLINE', { vertices: v, closed: true })] });
  });

  cmd(['POINT', 'PO'], 'Đặt điểm (nhiều lần, Enter để thôi)', async () => {
    for(;;){ const r = await A.getPoint('Chỉ định điểm'); if(!r.pt) return; A.commit({ add: [mk('POINT', { x: r.pt.x, y: r.pt.y })] }); }
  });
  async function xlineRay(isRay){
    let r = await A.getPoint(isRay ? 'Chỉ định điểm đầu tia' : 'Chỉ định điểm', { kw: isRay ? [] : [{ k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }] });
    if(r.none) return;
    if(r.kw === 'H' || r.kw === 'V'){ for(;;){ const p = await A.getPoint('Chỉ định điểm đi qua'); if(!p.pt) return; A.commit({ add: [mk('XLINE', { x: p.pt.x, y: p.pt.y, dx: r.kw === 'H' ? 1 : 0, dy: r.kw === 'H' ? 0 : 1, ray: false })] }); } }
    const b = r.pt;
    for(;;){
      const p = await A.getPoint('Chỉ định điểm đi qua', { base: b, preview: (g, q) => { const L = dist(b, q); if(L > 1e-12) g.ent({ type: 'XLINE', x: b.x, y: b.y, dx: (q.x - b.x) / L, dy: (q.y - b.y) / L, ray: isRay }); } });
      if(!p.pt) return; const L = dist(b, p.pt); if(L < 1e-12) continue;
      A.commit({ add: [mk('XLINE', { x: b.x, y: b.y, dx: (p.pt.x - b.x) / L, dy: (p.pt.y - b.y) / L, ray: isRay })] });
    }
  }
  cmd(['XLINE', 'XL'], 'Đường dựng vô hạn', () => xlineRay(false));
  cmd(['RAY'], 'Tia (nửa đường thẳng)', () => xlineRay(true));
  cmd(['SPLINE', 'SPL'], 'Đường cong trơn qua các điểm (Enter để xong)', async () => {
    const fit = []; let r = await A.getPoint('Chỉ định điểm đầu'); if(!r.pt) return; fit.push(r.pt);
    for(;;){
      r = await A.getPoint('Chỉ định điểm tiếp theo', { base: fit[fit.length - 1], rubber: false, kw: [{ k: 'U', t: 'Hoàn tác' }, ...(fit.length >= 3 ? [{ k: 'C', t: 'Đóng' }] : [])], preview: (g, p) => { const v = sampleCatmull(fit.concat([p]), false, 14); g.poly(v, false); } });
      if(r.none) break; if(r.kw === 'U'){ if(fit.length > 1) fit.pop(); continue; }
      if(r.kw === 'C'){ const v = sampleCatmull(fit, true, 16); A.commit({ add: [mk('POLYLINE', { vertices: v, closed: true, spl: fit })] }); return; }
      if(r.pt) fit.push(r.pt);
    }
    if(fit.length >= 2) A.commit({ add: [mk('POLYLINE', { vertices: sampleCatmull(fit, false, 16), closed: false, spl: fit })] });
  });
  // REVCLOUD: khung chữ nhật dạng mây (thật, nằm trong bản vẽ)
  cmd(['REVCLOUD', 'RC'], 'Khoanh mây sửa đổi (2 góc)', async () => {
    const a = await A.getPoint('Chỉ định góc thứ nhất'); if(!a.pt) return;
    const mkC = b => { const pts = rectPts(a.pt, b); const per = 2 * (Math.abs(b.x - a.pt.x) + Math.abs(b.y - a.pt.y)); if(per < 1e-9) return null; const arcL = MEM.rcL || Math.max(per / 40, 1e-6); const out = [];
      for(let i = 0; i < 4; i++){ const p = pts[i], q = pts[(i + 1) % 4]; const L = dist(p, q), n = Math.max(1, Math.round(L / arcL)); for(let k = 0; k < n; k++){ const s = { x: p.x + (q.x - p.x) * k / n, y: p.y + (q.y - p.y) * k / n }, e = { x: p.x + (q.x - p.x) * (k + 1) / n, y: p.y + (q.y - p.y) * (k + 1) / n }; const c = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 }, rr = dist(s, e) / 2, a0 = ang(c, s); const cw = G.area(pts) > 0 ? -1 : 1; for(let j = 0; j < 8; j++){ const t = a0 + cw * Math.PI * j / 8; out.push({ x: c.x + rr * Math.cos(t), y: c.y + rr * Math.sin(t) }); } } }
      return out; };
    const b = await A.getPoint('Chỉ định góc đối diện', { base: a.pt, rubber: false, preview: (g, p) => { const v = mkC(p); if(v) g.poly(v, true); } }); if(!b.pt) return;
    const v = mkC(b.pt); if(v) A.commit({ add: [mk('POLYLINE', { vertices: v, closed: true })] });
  });

  async function textCmd(multi){
    let ha = 'left', va = 'alphabetic', p;
    if(multi){
      const a = await A.getPoint('Chỉ định góc thứ nhất'); if(!a.pt) return;
      const b = await A.getPoint('Chỉ định góc đối diện', { base: a.pt, rubber: false, preview: (g, q) => g.poly(rectPts(a.pt, q), true, '#e8eef7', [5, 4]) }); if(!b.pt) return;
      p = { x: Math.min(a.pt.x, b.pt.x), y: Math.max(a.pt.y, b.pt.y) }; va = 'top';
    } else {
      let r = await A.getPoint('Chỉ định điểm đặt chữ', { kw: [{ k: 'J', t: 'Canh lề' }] }); if(r.none) return;
      if(r.kw === 'J'){
        const j = await A.getKw('Canh lề', { kw: [{ k: 'L', t: 'Trái' }, { k: 'C', t: 'Giữa' }, { k: 'R', t: 'Phải' }, { k: 'M', t: 'Chính giữa' }, { k: 'TL', t: 'Trên trái' }] });
        if(j.kw === 'C'){ ha = 'center'; } else if(j.kw === 'R'){ ha = 'right'; } else if(j.kw === 'M'){ ha = 'center'; va = 'middle'; } else if(j.kw === 'TL'){ va = 'top'; }
        r = await A.getPoint('Chỉ định điểm canh lề'); if(!r.pt) return;
      }
      p = r.pt;
    }
    const dh = MEM.th || defaultTextH();
    const rh = await A.getDist('Chỉ định chiều cao chữ', { base: p, def: dh }); const h = rh.num != null ? Math.abs(rh.num) : dh; if(!(h > 0)) return; MEM.th = h; lastTextH = h;
    let rot = 0;
    if(!multi){ const ra = await A.getAngle('Chỉ định góc xoay chữ', { base: p, def: MEM.trot || 0 }); rot = ra.num != null ? ra.num : (MEM.trot || 0); MEM.trot = rot; }
    remember();
    const s = await askText({ title: multi ? 'Nội dung chữ nhiều dòng' : 'Nội dung chữ', value: '' });
    if(s == null || !s.trim()) return;
    A.commit({ add: [mk('TEXT', { x: p.x, y: p.y, text: s.replace(/\r/g, ''), h, rot, ha, va })] });
  }
  cmd(['TEXT', 'DT', 'DTEXT', 'T'], 'Viết chữ (điểm, cao, góc, nội dung)', () => textCmd(false));
  cmd(['MTEXT', 'MT'], 'Chữ nhiều dòng trong khung', () => textCmd(true));
  cmd(['DDEDIT', 'ED', 'TEXTEDIT'], 'Sửa nội dung chữ', async () => {
    for(;;){
      const r = await A.getEnt('Chọn chữ cần sửa', { filter: e => e.type === 'TEXT' }); if(!r.ent) return;
      const e = r.ent; const s = await askText({ title: 'Sửa chữ', value: String(e.text || '') }); if(s == null || !s.trim()) continue;
      const w = copyOf(e); w.text = s; if(w.dimd) w.dimd.ov = (w.dimv != null && s === dimFmtOf(w)) ? null : s; A.commit({ rep: [[e, w]] });
    }
  });

  /* ===================================================================
     SỬA
     =================================================================== */
  const transformAll = (sel, fn) => sel.map(e => { const w = copyOf(e); fn(w); return [e, w]; });
  async function basePoint(prompt){ return A.getPoint(prompt || 'Chỉ định điểm gốc', { kw: [{ k: 'D', t: 'Độ dời' }] }); }
  cmd(['MOVE', 'M'], 'Di chuyển (điểm gốc → điểm đích)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    let r = await basePoint(); let base, to;
    if(r.none || r.kw === 'D'){ const d = await A.getPoint('Chỉ định độ dời dx,dy', { def: '0,0' }); if(!d.pt) return; base = { x: 0, y: 0 }; to = d.pt; }
    else { base = r.pt; const r2 = await A.getPoint('Chỉ định điểm thứ hai', { base, preview: (g, p) => g.shift(sel, p.x - base.x, p.y - base.y) }); if(!r2.pt) return; to = r2.pt; }
    const dx = to.x - base.x, dy = to.y - base.y; if(!dx && !dy) return;
    A.commit({ rep: transformAll(sel, w => translateEnt(w, dx, dy)) }, 'Đã di chuyển ' + sel.length + ' đối tượng');
    clearSelSafe();
  });
  function clearSelSafe(){ try{ selEnts.clear(); hideSelBar(); }catch(_){} }
  cmd(['COPY', 'CO', 'CP'], 'Sao chép (nhiều lần, Enter để thôi)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    let r = await basePoint(); let base;
    if(r.none || r.kw === 'D'){ const d = await A.getPoint('Chỉ định độ dời dx,dy'); if(!d.pt) return; A.commit({ add: remapGroups(sel.map(e => { const w = copyOf(e); translateEnt(w, d.pt.x, d.pt.y); return w; })) }); return; }
    base = r.pt; const stack = [];
    for(;;){
      const r2 = await A.getPoint('Chỉ định điểm thứ hai', { base, kw: [{ k: 'A', t: 'Mảng' }, { k: 'U', t: 'Hoàn tác' }], preview: (g, p) => g.shift(sel, p.x - base.x, p.y - base.y) });
      if(r2.none) return;
      if(r2.kw === 'U'){ if(stack.length){ stack.pop(); undoEdit(); } continue; }
      if(r2.kw === 'A'){
        const n = await A.getNum('Nhập số bản trong mảng (kể cả gốc)', { def: MEM.can || 3 }); const N = Math.round(n.num || MEM.can || 3); if(N < 2) continue; MEM.can = N; remember();
        const p2 = await A.getPoint('Chỉ định điểm thứ hai', { base, preview: (g, p) => { for(let i = 1; i < N; i++) g.shift(sel, (p.x - base.x) * i, (p.y - base.y) * i); } }); if(!p2.pt) continue;
        const add = []; for(let i = 1; i < N; i++){ const dx = (p2.pt.x - base.x) * i, dy = (p2.pt.y - base.y) * i; add.push(...remapGroups(sel.map(e => { const w = copyOf(e); translateEnt(w, dx, dy); return w; }))); }
        A.commit({ add }); stack.push(1); continue;
      }
      if(r2.pt){ const dx = r2.pt.x - base.x, dy = r2.pt.y - base.y; A.commit({ add: remapGroups(sel.map(e => { const w = copyOf(e); translateEnt(w, dx, dy); return w; })) }); stack.push(1); }
    }
  });
  async function refAngle(base){
    const r = await A.getAngle('Chỉ định góc tham chiếu (số, hoặc bấm 2 điểm)', { def: 0 });
    if(r.num != null && !r.pt) return r.num;
    if(r.pt){ const p2 = await A.getPoint('Chỉ định điểm thứ hai', { base: r.pt }); if(!p2.pt) return null; return ang(r.pt, p2.pt) * R2D; }
    return r.none ? 0 : null;
  }
  cmd(['ROTATE', 'RO'], 'Xoay quanh điểm gốc (C = sao chép, R = tham chiếu)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    const b = await A.getPoint('Chỉ định điểm gốc'); if(!b.pt) return; const base = b.pt;
    let copy = false, ref = 0;
    for(;;){
      const r = await A.getAngle('Chỉ định góc xoay', { base, def: MEM.rot || 0, kw: [{ k: 'C', t: 'Sao chép' }, { k: 'R', t: 'Tham chiếu' }], preview: (g, p) => g.xform(sel, w => rotateEnt(w, ang(base, p) * R2D - ref, base)) });
      if(r.kw === 'C'){ copy = !copy; log(copy ? 'Xoay một bản sao.' : 'Xoay đối tượng gốc.'); continue; }
      if(r.kw === 'R'){ const ra = await refAngle(base); if(ra == null) return; ref = ra; continue; }
      let deg; if(r.pt) deg = ang(base, r.pt) * R2D - ref; else if(r.num != null) deg = r.num - ref; else if(r.none) deg = (MEM.rot || 0); else return;
      if(r.num != null && !r.pt){ MEM.rot = r.num; remember(); }
      if(copy) A.commit({ add: remapGroups(sel.map(e => { const w = copyOf(e); rotateEnt(w, deg, base); return w; })) });
      else A.commit({ rep: transformAll(sel, w => rotateEnt(w, deg, base)) }, 'Đã xoay ' + fmtA(deg));
      clearSelSafe(); return;
    }
  });
  cmd(['SCALE', 'SC'], 'Đổi tỉ lệ quanh điểm gốc (C = sao chép, R = tham chiếu)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    const b = await A.getPoint('Chỉ định điểm gốc'); if(!b.pt) return; const base = b.pt;
    let copy = false, refLen = 1;
    for(;;){
      const r = await A.getDist('Chỉ định hệ số tỉ lệ', { base, def: MEM.sc || 1, kw: [{ k: 'C', t: 'Sao chép' }, { k: 'R', t: 'Tham chiếu' }], preview: (g, p) => { const f = dist(base, p) / refLen; if(f > 1e-9) g.xform(sel, w => scaleEnt(w, f, base)); } });
      if(r.kw === 'C'){ copy = !copy; continue; }
      if(r.kw === 'R'){ const rr = await A.getDist('Chỉ định chiều dài tham chiếu', { def: 1 }); let L = rr.num; if(rr.pt && rr.num == null){ const p2 = await A.getPoint('Chỉ định điểm thứ hai', { base: rr.pt }); if(!p2.pt) return; L = dist(rr.pt, p2.pt); } if(!(L > 0)) return; refLen = L; log('Chiều dài tham chiếu = ' + fmt(L) + ' — nhập chiều dài mới'); continue; }
      let f; if(r.pt) f = dist(base, r.pt) / refLen; else if(r.num != null) f = Math.abs(r.num) / refLen; else if(r.none) f = (MEM.sc || 1); else return;
      if(!(f > 0)) return; if(r.num != null && !r.pt && refLen === 1){ MEM.sc = f; remember(); }
      if(copy) A.commit({ add: remapGroups(sel.map(e => { const w = copyOf(e); scaleEnt(w, f, base); return w; })) });
      else A.commit({ rep: transformAll(sel, w => scaleEnt(w, f, base)) }, 'Tỉ lệ ×' + fmt(f));
      clearSelSafe(); return;
    }
  });
  cmd(['MIRROR', 'MI'], 'Đối xứng qua trục 2 điểm', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    const a = await A.getPoint('Chỉ định điểm thứ nhất của trục đối xứng'); if(!a.pt) return;
    const b = await A.getPoint('Chỉ định điểm thứ hai của trục đối xứng', { base: a.pt, preview: (g, p) => { if(dist(a.pt, p) > 1e-12) g.xform(sel, w => mirrorAcross(w, a.pt, p)); } }); if(!b.pt || dist(a.pt, b.pt) < 1e-12) return;
    const k = await A.getKw('Xoá đối tượng gốc?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Không' });
    if(k.kw === 'Y') A.commit({ rep: transformAll(sel, w => mirrorAcross(w, a.pt, b.pt)) });
    else A.commit({ add: remapGroups(sel.map(e => { const w = copyOf(e); mirrorAcross(w, a.pt, b.pt); return w; })) });
    clearSelSafe();
  });

  // OFFSET
  function offsetPoly(V, closed, d){
    const n = V.length; if(n < 2) return null; const segs = [];
    const nseg = closed ? n : n - 1;
    for(let i = 0; i < nseg; i++){ const a = V[i], b = V[(i + 1) % n], L = dist(a, b); if(L < 1e-12) continue; const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; segs.push({ a: { x: a.x + nx * d, y: a.y + ny * d }, b: { x: b.x + nx * d, y: b.y + ny * d }, ux: (b.x - a.x) / L, uy: (b.y - a.y) / L }); }
    if(!segs.length) return null;
    const join = (s1, s2) => { const den = s1.ux * s2.uy - s1.uy * s2.ux; if(Math.abs(den) < 1e-9) return [s1.b]; const t = ((s2.a.x - s1.a.x) * s2.uy - (s2.a.y - s1.a.y) * s2.ux) / den; const X = { x: s1.a.x + s1.ux * t, y: s1.a.y + s1.uy * t }; if(dist(X, s1.b) > Math.abs(d) * 8) return [s1.b, s2.a]; return [X]; };
    const out = [];
    if(closed){ for(let i = 0; i < segs.length; i++){ const p = segs[(i - 1 + segs.length) % segs.length], q = segs[i]; out.push(...join(p, q)); } }
    else { out.push(segs[0].a); for(let i = 1; i < segs.length; i++) out.push(...join(segs[i - 1], segs[i])); out.push(segs[segs.length - 1].b); }
    return G.dedup(out);
  }
  G.offsetPoly = offsetPoly;
  // offset đa tuyến có cung: đoạn thẳng dời theo pháp tuyến, cung đổi bán kính (giữ góc quét)
  function offsetBV(V, closed, d){
    const n = V.length, ns = closed ? n : n - 1; const S = [];
    for(let i = 0; i < ns; i++){ const a = V[i], b = V[(i + 1) % n]; const L = dist(a, b); if(L < 1e-12) continue;
      if(a.bulge){ const C = G.bulgeArc(a, b, a.bulge); if(!C) continue; const r2 = C.r - d * Math.sign(C.sw); if(!(r2 > 1e-9)) continue; const k = r2 / C.r;
        S.push({ arc: true, bulge: a.bulge, a: { x: C.cx + (a.x - C.cx) * k, y: C.cy + (a.y - C.cy) * k }, b: { x: C.cx + (b.x - C.cx) * k, y: C.cy + (b.y - C.cy) * k } }); }
      else { const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; S.push({ a: { x: a.x + nx * d, y: a.y + ny * d }, b: { x: b.x + nx * d, y: b.y + ny * d }, ux: (b.x - a.x) / L, uy: (b.y - a.y) / L }); } }
    if(!S.length) return null;
    const out = []; const push = (p, bulge) => { const l = out[out.length - 1]; if(l && dist(l, p) < 1e-9){ if(bulge) l.bulge = bulge; return; } out.push({ x: p.x, y: p.y, bulge: bulge || 0 }); };
    const meet = (s1, s2) => { if(dist(s1.b, s2.a) < 1e-9) return null; if(!s1.arc && !s2.arc){ const den = s1.ux * s2.uy - s1.uy * s2.ux; if(Math.abs(den) < 1e-9) return null; const t = ((s2.a.x - s1.a.x) * s2.uy - (s2.a.y - s1.a.y) * s2.ux) / den; return { x: s1.a.x + s1.ux * t, y: s1.a.y + s1.uy * t }; } return 'gap'; };
    const m = S.length;
    for(let i = 0; i < m; i++){ const s = S[i];
      let start = s.a; if(i > 0 || closed){ const pv = S[(i - 1 + m) % m]; const X = meet(pv, s); if(X && X !== 'gap'){ start = X; } }
      let end = s.b; if(i < m - 1 || closed){ const nx = S[(i + 1) % m]; const X = meet(s, nx); if(X && X !== 'gap') end = X; else if(X === 'gap'){ push(start, s.arc ? s.bulge : 0); push(end, 0); continue; } }
      push(start, s.arc ? s.bulge : 0); if(i === m - 1 && !closed) push(end, 0); }
    if(closed && out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-9) out.pop();
    return out;
  }
  G.offsetBV = offsetBV;
  function offsetEntity(e, d, side){
    if(e.type === 'LINE'){ const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1); if(L < 1e-12) return null; const nx = -(e.y2 - e.y1) / L, ny = (e.x2 - e.x1) / L; const sd = (side.x - e.x1) * nx + (side.y - e.y1) * ny; const dd = d == null ? sd : (sd >= 0 ? d : -d); const w = copyOf(e); w.x1 += nx * dd; w.y1 += ny * dd; w.x2 += nx * dd; w.y2 += ny * dd; return w; }
    if(e.type === 'CIRCLE' || e.type === 'ARC'){ const dc = Math.hypot(side.x - e.cx, side.y - e.cy); const R = d == null ? dc : (dc > e.r ? e.r + d : e.r - d); if(!(R > 1e-9)) return null; const w = copyOf(e); w.r = R; return w; }
    if(e.type === 'POLYLINE' || e.type === 'ELLIPSE'){
      const c = G.curveOf(e); if(!c) return null; const q = G.nearOnCurve(c, side); if(!q) return null;
      let V = e.type === 'POLYLINE' ? e.vertices : c.pieces.map(p => ({ x: p.ax, y: p.ay })).concat(c.closed ? [] : [{ x: c.pieces[c.pieces.length - 1].bx, y: c.pieces[c.pieces.length - 1].by }]);
      // phía: dấu tích có hướng tại đoạn gần nhất
      let best = null, bd = Infinity; for(const p of c.pieces){ const nq = G.nearOnPiece(p, side); const dd = Math.hypot(nq.x - side.x, nq.y - side.y); if(dd < bd){ bd = dd; best = p; } }
      const sgn = ((best.bx - best.ax) * (side.y - best.ay) - (best.by - best.ay) * (side.x - best.ax)) >= 0 ? 1 : -1;
      const dd = (d == null ? bd : d) * sgn;
      const bv = e.type === 'POLYLINE' && A.bvOf ? A.bvOf(e) : null;
      if(bv){ const nb = offsetBV(bv, c.closed, dd); if(nb && nb.length >= 2){ const w = copyOf(e); w.closed = c.closed; delete w.wq; A.setBV(w, nb); return w; } }
      const nv = offsetPoly(V, c.closed, dd); if(!nv || nv.length < 2) return null;
      const w = copyOf(e); w.type = 'POLYLINE'; w.vertices = nv; w.closed = c.closed; delete w.cx; delete w.cy; delete w.mx; delete w.my; delete w.ratio; delete w.p1; delete w.p2; delete w.wq; delete w.spl; return w;
    }
    return null;
  }
  G.offsetEntity = offsetEntity;
  const canOffset = e => /^(LINE|CIRCLE|ARC|POLYLINE|ELLIPSE)$/.test(e.type);
  cmd(['OFFSET', 'O'], 'Tạo bản song song cách đều (T = đi qua điểm)', async () => {
    let d = MEM.offset; let through = false;
    const r = await A.getDist('Chỉ định khoảng offset', { kw: [{ k: 'T', t: 'Đi qua điểm' }], def: d != null ? d : undefined });
    if(r.kw === 'T') through = true; else if(r.num != null) d = Math.abs(r.num); else if(!(r.none && d != null)) return;
    if(!through){ MEM.offset = d; remember(); }
    for(;;){
      const rs = await A.getEnt('Chọn đối tượng cần offset (Enter để thôi)', { filter: canOffset }); if(!rs.ent) break;
      const e = rs.ent; hl([e]);
      const rp = await A.getPoint(through ? 'Chỉ định điểm đi qua' : 'Chỉ định điểm ở phía cần offset', { preview: (g, p) => { const o = offsetEntity(e, through ? null : d, p); if(o) g.ent(o); } });
      hl([]); if(!rp.pt) break;
      const o = offsetEntity(e, through ? null : d, rp.pt); if(o) A.commit({ add: [o] }); else log('Không offset được (bán kính ≤ 0?).');
    }
  });

  cmd(['ARRAY', 'AR'], 'Nhân bản dạng mảng (chữ nhật / tròn)', async () => arrayCmd(null));
  cmd(['ARRAYRECT'], 'Mảng chữ nhật', async () => arrayCmd('R'));
  cmd(['ARRAYPOLAR'], 'Mảng tròn quanh tâm', async () => arrayCmd('PO'));
  async function arrayCmd(type){
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    if(!type){ const t = await A.getKw('Chọn kiểu mảng', { kw: [{ k: 'R', t: 'Chữ nhật' }, { k: 'PO', t: 'Tròn' }], def: 'Chữ nhật' }); type = t.kw || 'R'; }
    const bb = bboxOf(sel) || { x0: 0, y0: 0, x1: 1, y1: 1 }; const w0 = (bb.x1 - bb.x0) || 1, h0 = (bb.y1 - bb.y0) || 1;
    if(type === 'R'){
      const v = await askNum({ title: 'Mảng chữ nhật', hint: 'Khoảng cách tính từ gốc đối tượng này tới đối tượng kế tiếp', fields: [{ label: 'Số cột', value: String(MEM.ac || 4) }, { label: 'Số hàng', value: String(MEM.ar || 1) }, { label: 'Khoảng cột', value: String(MEM.acs || +(w0 * 1.5).toPrecision(3)) }, { label: 'Khoảng hàng', value: String(MEM.ars || +(h0 * 1.5).toPrecision(3)) }] });
      if(!v) return; const C = Math.max(1, Math.min(500, Math.round(v[0] || 1))), R = Math.max(1, Math.min(500, Math.round(v[1] || 1))), dx = v[2] || 0, dy = v[3] || 0;
      if(C * R * sel.length > 60000){ say('Mảng quá lớn.'); return; }
      Object.assign(MEM, { ac: C, ar: R, acs: dx, ars: dy }); remember();
      const add = []; for(let i = 0; i < C; i++) for(let j = 0; j < R; j++){ if(!i && !j) continue; add.push(...remapGroups(sel.map(e => { const w = copyOf(e); translateEnt(w, dx * i, dy * j); return w; }))); }
      if(A.arrCommit && A.arrCommit(sel, add, { k: 'R', C, R, dx, dy }, 'Đã tạo mảng ' + C + '×' + R)) return;
      A.commit({ add }, 'Đã tạo mảng ' + C + '×' + R); return;
    }
    const c = await A.getPoint('Chỉ định tâm mảng'); if(!c.pt) return;
    const v = await askNum({ title: 'Mảng tròn', fields: [{ label: 'Số phần tử (kể cả gốc)', value: String(MEM.apn || 6) }, { label: 'Góc lấp đầy (độ)', value: String(MEM.apa || 360) }, { label: 'Xoay theo (1 = có)', value: '1' }] });
    if(!v) return; const N = Math.max(2, Math.min(1000, Math.round(v[0] || 6))), F = isFinite(v[1]) ? v[1] : 360, rotItems = v[2] !== 0;
    Object.assign(MEM, { apn: N, apa: F }); remember();
    const step = Math.abs(Math.abs(F) - 360) < 1e-9 ? F / N : F / (N - 1); const add = [];
    for(let i = 1; i < N; i++){ const a = step * i; add.push(...remapGroups(sel.map(e => { const w = copyOf(e); if(rotItems) rotateEnt(w, a, c.pt); else { const ce = entCenter(w), q = _rotPt(ce, c.pt, a * D2R); translateEnt(w, q.x - ce.x, q.y - ce.y); } return w; }))); }
    if(A.arrCommit && A.arrCommit(sel, add, { k: 'P', N, F, rot: rotItems, c: { x: c.pt.x, y: c.pt.y } }, 'Đã tạo mảng tròn ' + N + ' phần tử')) return;
    A.commit({ add }, 'Đã tạo mảng tròn ' + N + ' phần tử');
  }

  // STRETCH
  function inBox(p, b){ if(b.list) return b.list.some(x => inBox(p, x)); return p.x >= b.minx && p.x <= b.maxx && p.y >= b.miny && p.y <= b.maxy; }   // b.list: nhiều khung (MSTRETCH)
  function stretchEnt(w, box, dx, dy){
    const mv = p => { if(inBox(p, box)){ p.x += dx; p.y += dy; } };
    if(w.tbld){ if(inBox(w.tbld.o, box)) translateEnt(w, dx, dy); return; }
    if(w.dimd){ const d = w.dimd; const Lin = d.L && inBox(d.L, box); for(const k of ['p1', 'p2', 'c', 'V']) if(d[k]) mv(d[k]); if(d.L && (Lin || inBox({ x: w.x, y: w.y }, box))){ d.L.x += dx; d.L.y += dy; } return; }
    if(w.bip){ if(inBox(w.bip, box)) translateEnt(w, dx, dy); return; }   // khối: chỉ dời khi điểm chèn nằm trong khung (như AutoCAD)
    switch(w.type){
      case 'LINE': { const a = { x: w.x1, y: w.y1 }, b = { x: w.x2, y: w.y2 }; mv(a); mv(b); w.x1 = a.x; w.y1 = a.y; w.x2 = b.x; w.y2 = b.y; break; }
      case 'POLYLINE': for(const p of w.vertices) mv(p); delete w.wq; break;
      case 'SOLID': for(const p of w.pts) mv(p); break;
      case 'HATCH': for(const lp of w.loops) for(const p of lp) mv(p); break;
      case 'ARC': { const c = G.curveOf(w), s = c.at(0), e = c.at(c.u1); const sIn = inBox(s, box), eIn = inBox(e, box);
        if(inBox({ x: w.cx, y: w.cy }, box) || (sIn && eIn)) translateEnt(w, dx, dy);
        else if(sIn || eIn){ const m = c.at(c.u1 / 2); const ns = sIn ? { x: s.x + dx, y: s.y + dy } : s, ne = eIn ? { x: e.x + dx, y: e.y + dy } : e; const a = arc3(ns, m, ne); if(a){ w.cx = a.cx; w.cy = a.cy; w.r = a.r; w.a1 = a.a1; w.a2 = a.a2; } }
        break; }
      case 'CIRCLE': case 'ELLIPSE': if(inBox({ x: w.cx, y: w.cy }, box)) translateEnt(w, dx, dy); break;
      case 'TEXT': case 'POINT': case 'XLINE': if(inBox({ x: w.x, y: w.y }, box)) translateEnt(w, dx, dy); break;
    }
  }
  A.stretchEnt = stretchEnt;
  cmd(['STRETCH', 'S'], 'Kéo giãn: chọn bằng khung cắt, các đỉnh trong khung bị dời', async () => {
    const r = await A.getSel('Chọn đối tượng cần kéo giãn bằng khung cắt (kéo phải → trái)', { wantWindow: true, pre: false });
    const box = r.window ? r.window.box : null; let sel = r.sel || []; if(!sel.length){ log('Không có đối tượng.'); return; }
    selHL(sel);
    { const dimG = new Set(sel.filter(e => e.dimd || e.tbld).map(e => e.grp)); if(dimG.size) sel = sel.filter(e => !(e.grp && dimG.has(e.grp) && !e.dimd && !e.tbld)); }   // kích thước: chỉ kéo điểm định nghĩa rồi dựng lại
    let b = await basePoint(); let base, to;
    if(b.none || b.kw === 'D'){ const d = await A.getPoint('Chỉ định độ dời dx,dy'); if(!d.pt) return; base = { x: 0, y: 0 }; to = d.pt; }
    else { base = b.pt; const r2 = await A.getPoint('Chỉ định điểm thứ hai', { base, preview: (g, p) => g.xform(sel, w => box ? stretchEnt(w, box, p.x - base.x, p.y - base.y) : translateEnt(w, p.x - base.x, p.y - base.y)) }); if(!r2.pt) return; to = r2.pt; }
    const dx = to.x - base.x, dy = to.y - base.y;
    A.commit({ rep: transformAll(sel, w => box ? stretchEnt(w, box, dx, dy) : translateEnt(w, dx, dy)) }, 'Đã kéo giãn');
  });

  // TRIM / EXTEND (chế độ nhanh: mọi đối tượng là cạnh cắt)
  const curveable = e => /^(LINE|ARC|CIRCLE|POLYLINE|ELLIPSE)$/.test(e.type);
  const cutter = e => /^(LINE|ARC|CIRCLE|POLYLINE|ELLIPSE|XLINE|SOLID)$/.test(e.type);
  function cutParams(c, e, edges){
    const bb = entBBox(e); const span = bb ? Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) : 1; const pad = span * 1e-6 + 1e-9;
    const others = edges ? edges.filter(x => x !== e && cutter(x)) : A.queryBox(bb.x0 - pad, bb.y0 - pad, bb.x1 + pad, bb.y1 + pad, 20000).filter(x => x !== e && cutter(x));
    const us = [];
    for(const o of others){ const co = G.curveOf(o); if(!co) continue; for(const q of G.xCurves(c, co)) us.push(q.ua); }
    if(c.kind === 'poly'){   // tự cắt của đa tuyến
      const P = c.pieces; for(let i = 0; i < P.length; i++) for(let j = i + 2; j < P.length; j++){ if(c.closed && i === 0 && j === P.length - 1) continue; for(const q of G.xPieces(P[i], P[j])){ us.push(q.ua); us.push(q.ub); } }
    }
    return us;
  }
  function doTrim(e, pick, edges){
    const c = G.curveOf(e); if(!c || !c.sub) return 'Không cắt được loại này.';
    const near = G.nearOnCurve(c, pick); if(!near) return 'Không xác định được điểm.';
    const period = c.u1 - c.u0, tol = Math.max(period * 1e-9, 1e-12);
    let us = cutParams(c, e, edges).filter(u => isFinite(u));
    const pk = near.u;
    if(c.closed){
      us = us.map(u => ((u - c.u0) % period + period) % period + c.u0).sort((a, b) => a - b);
      const uniq = []; for(const u of us) if(!uniq.length || u - uniq[uniq.length - 1] > tol) uniq.push(u);
      if(uniq.length > 1 && (uniq[0] + period) - uniq[uniq.length - 1] <= tol) uniq.pop();
      if(!uniq.length){ A.commit({ del: [e] }); return ''; }
      if(uniq.length < 2) return 'Cần ít nhất 2 giao điểm để cắt đường kín.';
      let lo = null, hi = null;
      for(const u of uniq){ if(u <= pk) lo = u; if(u > pk && hi == null) hi = u; }
      if(lo == null) lo = uniq[uniq.length - 1] - period; if(hi == null) hi = uniq[0] + period;
      const rem = c.sub(hi, lo + period); if(c.kind === 'ellipse'){ rem.p1 = hi; rem.p2 = lo + period; }
      A.commit({ rep: [[e, rem]] }); return '';
    }
    us = us.filter(u => u > c.u0 + tol && u < c.u1 - tol).sort((a, b) => a - b);
    let lo = null, hi = null; for(const u of us){ if(u < pk - tol) lo = u; else if(u > pk + tol && hi == null) hi = u; }
    if(lo == null && hi == null){ A.commit({ del: [e] }); return ''; }
    const parts = []; if(lo != null) parts.push(c.sub(c.u0, lo)); if(hi != null) parts.push(c.sub(hi, c.u1));
    const rep = [[e, parts[0]]]; const add = parts.slice(1);
    A.commit({ rep, add }); return '';
  }
  function doExtend(e, pick, edges){
    const big = (() => { const b = bounds || { minX: 0, minY: 0, maxX: 1, maxY: 1 }; return Math.max(b.maxX - b.minX, b.maxY - b.minY, 1) * 4; })();
    const cands = (box) => (edges ? edges.filter(x => x !== e && cutter(x)) : A.queryBox(box[0], box[1], box[2], box[3], 30000).filter(x => x !== e && cutter(x)));
    const firstHit = (seg) => { const bb = G.pieceBB(seg); let best = null; for(const o of cands(bb)){ const co = G.curveOf(o); if(!co) continue; for(const p of co.pieces) for(const q of G.xPieces(seg, p)){ if(q.fa > 1e-9 && (!best || q.fa < best.fa)) best = q; } } return best; };
    if(e.type === 'LINE' || (e.type === 'POLYLINE' && !e.closed)){
      let a, b, atStart;
      if(e.type === 'LINE'){ atStart = Math.hypot(pick.x - e.x1, pick.y - e.y1) < Math.hypot(pick.x - e.x2, pick.y - e.y2); a = atStart ? { x: e.x2, y: e.y2 } : { x: e.x1, y: e.y1 }; b = atStart ? { x: e.x1, y: e.y1 } : { x: e.x2, y: e.y2 }; }
      else { const BV = A.bvOf(e); const V = BV || e.vertices; atStart = Math.hypot(pick.x - V[0].x, pick.y - V[0].y) < Math.hypot(pick.x - V[V.length - 1].x, pick.y - V[V.length - 1].y); if(atStart){ b = V[0]; a = V[1]; } else { b = V[V.length - 1]; a = V[V.length - 2]; }
        if(BV && (atStart ? BV[0].bulge : BV[BV.length - 2].bulge)) return 'Đầu đa tuyến là cung — dùng LENGTHEN hoặc kéo ô nắm.'; }
      const L = dist(a, b); if(L < 1e-12) return 'Đoạn quá ngắn.';
      const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
      const seg = { t: 's', ax: b.x, ay: b.y, bx: b.x + ux * big, by: b.y + uy * big, u0: 0, u1: 1 };
      const h = firstHit(seg); if(!h) return 'Không gặp ranh giới nào theo hướng kéo dài.';
      const w = copyOf(e);
      if(e.type === 'LINE'){ if(atStart){ w.x1 = h.x; w.y1 = h.y; } else { w.x2 = h.x; w.y2 = h.y; } }
      else { const BV = A.bvOf(e); if(BV){ const nb = BV.map(q => Object.assign({}, q)); if(atStart) Object.assign(nb[0], { x: h.x, y: h.y }); else Object.assign(nb[nb.length - 1], { x: h.x, y: h.y }); A.setBV(w, nb); } else { if(atStart) w.vertices[0] = { x: h.x, y: h.y }; else w.vertices[w.vertices.length - 1] = { x: h.x, y: h.y }; delete w.wq; } }
      A.commit({ rep: [[e, w]] }); return '';
    }
    if(e.type === 'ARC'){
      const c = G.curveOf(e); const s = c.at(0), en = c.at(c.u1); const atStart = dist(pick, s) < dist(pick, en);
      const a1 = c.a1, a2 = c.a1 + c.u1, gapMax = TAU - c.u1;
      const full = { t: 'a', cx: e.cx, cy: e.cy, r: e.r, a0: 0, sw: TAU, u0: 0 };
      const bb = [e.cx - e.r, e.cy - e.r, e.cx + e.r, e.cy + e.r]; let best = null;
      for(const o of cands(bb)){ const co = G.curveOf(o); if(!co) continue; for(const p of co.pieces) for(const q of G.xPieces(full, p)){ const angQ = Math.atan2(q.y - e.cy, q.x - e.cx); const off = atStart ? G.norm(a1 - angQ) : G.norm(angQ - a2); if(off > 1e-9 && off < gapMax - 1e-9 && (!best || off < best)) best = off; } }
      if(best == null) return 'Không gặp ranh giới nào.';
      const w = copyOf(e); if(atStart) w.a1 = (a1 - best) * R2D; else w.a2 = (a2 + best) * R2D;
      A.commit({ rep: [[e, w]] }); return '';
    }
    return 'Chỉ kéo dài được đường thẳng, cung, đa tuyến hở.';
  }
  async function trimExtendCmd(modeTE){
    let edges = null;
    log(modeTE === 'trim' ? 'Cắt nhanh: bấm phần cần bỏ (mọi đối tượng là cạnh cắt) · T = chọn cạnh cắt · giữ Shift để kéo dài' : 'Kéo dài nhanh: bấm gần đầu cần kéo dài · T = chọn ranh giới · giữ Shift để cắt');
    for(;;){
      const r = await A.getEnt(modeTE === 'trim' ? 'Chọn đối tượng cần cắt' : 'Chọn đối tượng cần kéo dài', { kw: [{ k: 'T', t: edges ? 'Cạnh cắt (đang chọn ' + edges.length + ')' : 'Cạnh cắt' }, { k: 'U', t: 'Hoàn tác' }], filter: curveable });
      if(r.kw === 'T'){ const s = await A.getSel('Chọn cạnh cắt / ranh giới (Enter = tất cả)', { pre: false }); edges = s.sel && s.sel.length ? s.sel : null; hl(edges || []); continue; }
      if(r.kw === 'U'){ undoEdit(); continue; }
      if(!r.ent) break;
      const m = r.shift ? (modeTE === 'trim' ? 'extend' : 'trim') : modeTE;
      const msg = m === 'trim' ? doTrim(r.ent, r.pt, edges) : doExtend(r.ent, r.pt, edges);
      if(msg) log(msg);
      if(edges) edges = edges.filter(x => modelEntities.indexOf(x) >= 0);
    }
    hl([]);
  }
  cmd(['TRIM', 'TR'], 'Cắt phần thừa (bấm phần cần bỏ)', () => trimExtendCmd('trim'));
  cmd(['EXTEND', 'EX'], 'Kéo dài tới đối tượng gần nhất', () => trimExtendCmd('extend'));
  A.doTrim = doTrim; A.doExtend = doExtend;

  // FILLET / CHAMFER
  function cornerZero(L1, t1, L2, t2){
    const P = lineIntersect(L1, L2); if(!P) return null;
    const keep = (L, t) => { const e1 = { x: L.x1, y: L.y1 }, e2 = { x: L.x2, y: L.y2 }; const dx = t.x - P.x, dy = t.y - P.y; const p1 = (e1.x - P.x) * dx + (e1.y - P.y) * dy, p2 = (e2.x - P.x) * dx + (e2.y - P.y) * dy; return p1 >= p2 ? e1 : e2; };
    const K1 = keep(L1, t1), K2 = keep(L2, t2);
    return { l1: { x1: K1.x, y1: K1.y, x2: P.x, y2: P.y }, l2: { x1: K2.x, y1: K2.y, x2: P.x, y2: P.y } };
  }
  // bo / vát 1 góc của đa tuyến có cung (hai đoạn kề là đoạn thẳng) → cung thật (bulge)
  function cornerBV(V, closed, k, kind, val){
    const n = V.length; if(!closed && (k <= 0 || k >= n - 1)) return null; const ip = (k - 1 + n) % n, inx = (k + 1) % n;
    if(V[ip].bulge || V[k].bulge) return null;
    const P = V[k], A1 = V[ip], B1 = V[inx]; const L1 = dist(A1, P), L2 = dist(P, B1); if(L1 < 1e-12 || L2 < 1e-12) return null;
    const u1 = { x: (P.x - A1.x) / L1, y: (P.y - A1.y) / L1 }, u2 = { x: (B1.x - P.x) / L2, y: (B1.y - P.y) / L2 };
    const phi = Math.atan2(u1.x * u2.y - u1.y * u2.x, u1.x * u2.x + u1.y * u2.y); if(Math.abs(phi) < 1e-9 || Math.abs(Math.abs(phi) - Math.PI) < 1e-9) return null;
    const t = kind === 'fillet' ? val * Math.tan(Math.abs(phi) / 2) : val; if(t > L1 + 1e-9 || t > L2 + 1e-9) return null;
    const T1 = { x: P.x - u1.x * t, y: P.y - u1.y * t }, T2 = { x: P.x + u2.x * t, y: P.y + u2.y * t };
    if(kind === 'fillet') T1.bulge = Math.tan(phi / 4);
    const out = V.slice(); out.splice(k, 1, T1, T2); return out.filter((q, i) => i === 0 || dist(q, out[i - 1]) > 1e-12);
  }
  G.cornerBV = cornerBV;
  async function cornerCmd(kind){
    const key = kind === 'fillet' ? 'fr' : 'cd';
    let val = MEM[key] != null ? MEM[key] : 0;
    log((kind === 'fillet' ? 'Bán kính bo' : 'Khoảng vát') + ' hiện tại = ' + fmt(val));
    let multiple = false;
    for(;;){
      const r1 = await A.getEnt('Chọn đối tượng thứ nhất', { kw: [{ k: kind === 'fillet' ? 'R' : 'D', t: kind === 'fillet' ? 'Bán kính' : 'Khoảng vát' }, { k: 'P', t: 'Đa tuyến' }, { k: 'M', t: 'Nhiều lần' }, { k: 'U', t: 'Hoàn tác' }], filter: e => e.type === 'LINE' || e.type === 'POLYLINE' });
      if(r1.kw === 'R' || r1.kw === 'D'){ const v = await A.getDist(kind === 'fillet' ? 'Chỉ định bán kính bo' : 'Chỉ định khoảng vát', { def: val }); if(v.num != null){ val = Math.abs(v.num); MEM[key] = val; remember(); } continue; }
      if(r1.kw === 'M'){ multiple = true; log('Chế độ nhiều lần.'); continue; }
      if(r1.kw === 'U'){ undoEdit(); continue; }
      if(r1.kw === 'P'){
        const rp = await A.getEnt('Chọn đa tuyến', { filter: e => e.type === 'POLYLINE' }); if(!rp.ent) continue;
        if(!(val > 0)){ log('Đặt bán kính/khoảng > 0 trước.'); continue; }
        const BV0 = A.bvOf(rp.ent) || (rp.ent.vertices || []).map(q => ({ x: q.x, y: q.y })); const closed = !!rp.ent.closed; let n = 0;   /* như AutoCAD: góc bo thành cung thật (bulge), không chia thành đoạn nhỏ */
        if(BV0){ let V = BV0.map(q => Object.assign({}, q)); for(let k = closed ? V.length - 1 : V.length - 2; k >= (closed ? 0 : 1); k--){ const nv = cornerBV(V, closed, k, kind, val); if(nv){ V = nv; n++; } }
          if(n){ const w = copyOf(rp.ent); A.setBV(w, V); A.commit({ rep: [[rp.ent, w]] }, (kind === 'fillet' ? 'Đã bo ' : 'Đã vát ') + n + ' góc'); } else log('Không bo/vát được góc nào.'); if(!multiple) return; continue; }
        let V = rp.ent.vertices.slice();
        for(let k = closed ? V.length - 1 : V.length - 2; k >= (closed ? 0 : 1); k--){ const nv = polyCorner(V, closed, k, kind, val); if(nv){ V = nv; n++; } }
        if(n){ const w = copyOf(rp.ent); w.vertices = V; delete w.wq; A.commit({ rep: [[rp.ent, w]] }, (kind === 'fillet' ? 'Đã bo ' : 'Đã vát ') + n + ' góc'); } else log('Không bo/vát được góc nào.');
        if(!multiple) return; continue;
      }
      if(!r1.ent) return;
      const e1 = r1.ent;
      if(e1.type === 'POLYLINE' && A.bvOf(e1)){
        const BV = A.bvOf(e1); let k = -1, bd = Infinity; for(let i = 0; i < BV.length; i++){ const d = dist(BV[i], r1.pt); if(d < bd){ bd = d; k = i; } }
        if(!(val > 0)){ log('Đa tuyến: đặt bán kính/khoảng > 0.'); if(!multiple) return; continue; }
        const nv = cornerBV(BV.map(q => Object.assign({}, q)), !!e1.closed, k, kind, val); if(!nv){ log('Không bo/vát được góc này.'); if(!multiple) return; continue; }
        const w = copyOf(e1); A.setBV(w, nv); A.commit({ rep: [[e1, w]] }); if(!multiple) return; continue;
      }
      if(e1.type === 'POLYLINE'){
        const V = e1.vertices; let k = -1, bd = Infinity; for(let i = 0; i < V.length; i++){ const d = dist(V[i], r1.pt); if(d < bd){ bd = d; k = i; } }
        if(!(val > 0)){ log('Đa tuyến: đặt bán kính/khoảng > 0.'); if(!multiple) return; continue; }
        const nv = polyCorner(V, !!e1.closed, k, kind, val); if(!nv){ log('Không bo/vát được góc này.'); if(!multiple) return; continue; }
        const w = copyOf(e1); w.vertices = nv; delete w.wq; A.commit({ rep: [[e1, w]] }); if(!multiple) return; continue;
      }
      hl([e1]);
      const r2 = await A.getEnt('Chọn đối tượng thứ hai', { filter: e => e.type === 'LINE' && e !== e1 }); hl([]);
      if(!r2.ent) return;
      const res = val > 0 ? cornerOp(e1, r1.pt, r2.ent, r2.pt, kind, val) : cornerZero(e1, r1.pt, r2.ent, r2.pt);
      if(!res){ log('Không thực hiện được (song song hoặc giá trị quá lớn).'); if(!multiple) return; continue; }
      const w1 = copyOf(e1), w2 = copyOf(r2.ent); Object.assign(w1, res.l1); Object.assign(w2, res.l2);
      const add = []; const pr = { layer: e1.layer || '0', col: e1.col }; if(e1.bl) pr.bl = 1; if(res.arc) add.push(Object.assign({ type: 'ARC' }, res.arc, pr)); if(res.line) add.push(Object.assign({ type: 'LINE' }, res.line, pr));
      A.commit({ rep: [[e1, w1], [r2.ent, w2]], add });
      if(!multiple) return;
    }
  }
  cmd(['FILLET', 'F'], 'Bo góc 2 đường (R = bán kính, 0 = nối góc)', () => cornerCmd('fillet'));
  cmd(['CHAMFER', 'CHA'], 'Vát góc 2 đường (D = khoảng vát)', () => cornerCmd('chamfer'));

  // BREAK / BREAKATPOINT
  function doBreak(e, p1, p2){
    const c = G.curveOf(e); if(!c || !c.sub) return 'Không bẻ được loại này.';
    const u1 = G.nearOnCurve(c, p1).u, u2 = p2 ? G.nearOnCurve(c, p2).u : u1;
    const tol = (c.u1 - c.u0) * 1e-9;
    if(c.closed){
      const period = c.u1 - c.u0; if(Math.abs(u1 - u2) < tol) return 'Không bẻ đường kín tại 1 điểm.';
      let a = u2, b = u1; if(b < a) b += period;
      const rem = c.sub(a, b); if(c.kind === 'ellipse'){ rem.p1 = a; rem.p2 = b; }
      A.commit({ rep: [[e, rem]] }); return '';
    }
    const lo = Math.min(u1, u2), hi = Math.max(u1, u2); const parts = [];
    if(lo - c.u0 > tol) parts.push(c.sub(c.u0, lo)); if(c.u1 - hi > tol) parts.push(c.sub(hi, c.u1));
    if(!parts.length){ A.commit({ del: [e] }); return ''; }
    A.commit({ rep: [[e, parts[0]]], add: parts.slice(1) }); return '';
  }
  cmd(['BREAK', 'BR'], 'Bẻ gãy: bỏ đoạn giữa 2 điểm', async () => {
    const r = await A.getEnt('Chọn đối tượng', { filter: curveable }); if(!r.ent) return; const e = r.ent; hl([e]);
    let p1 = r.pt;
    let r2 = await A.getPoint('Chỉ định điểm bẻ thứ hai', { kw: [{ k: 'F', t: 'Điểm thứ nhất' }] });
    if(r2.kw === 'F'){ const a = await A.getPoint('Chỉ định điểm bẻ thứ nhất'); if(!a.pt) return; p1 = a.pt; r2 = await A.getPoint('Chỉ định điểm bẻ thứ hai', { base: p1 }); }
    hl([]); if(!r2.pt) return;
    const m = doBreak(e, p1, r2.pt); if(m) log(m);
  });
  cmd(['BREAKATPOINT', 'BRP', 'BR@'], 'Tách đối tượng tại 1 điểm', async () => {
    const r = await A.getEnt('Chọn đối tượng', { filter: curveable }); if(!r.ent) return; hl([r.ent]);
    const p = await A.getPoint('Chỉ định điểm tách'); hl([]); if(!p.pt) return;
    const m = doBreak(r.ent, p.pt, null); if(m) log(m);
  });

  // JOIN
  function endpointsOf(e){   // đỉnh kèm bulge (cung giữ nguyên khi nối)
    if(e.type === 'LINE') return [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
    if(e.type === 'POLYLINE' && !e.closed){ const bv = A.bvOf(e); return (bv || e.vertices).map(v => v.bulge ? { x: v.x, y: v.y, bulge: v.bulge } : { x: v.x, y: v.y }); }
    if(e.type === 'ARC'){ const c = G.curveOf(e); const a = c.at(0), b = c.at(c.u1); if(c.u1 >= Math.PI * 1.9){ const m = c.at(c.u1 / 2); return [{ x: a.x, y: a.y, bulge: Math.tan(c.u1 / 8) }, { x: m.x, y: m.y, bulge: Math.tan(c.u1 / 8) }, { x: b.x, y: b.y }]; } return [{ x: a.x, y: a.y, bulge: Math.tan(c.u1 / 4) }, { x: b.x, y: b.y }]; }
    return null;
  }
  const revBV = P => { const n = P.length, o = []; for(let i = n - 1; i >= 0; i--){ const q = { x: P[i].x, y: P[i].y }; const b = i > 0 ? P[i - 1].bulge : 0; if(b) q.bulge = -b; o.push(q); } return o; };
  const catBV = (A0, B0) => { const o = A0.map(q => Object.assign({}, q)); const last = o[o.length - 1]; if(B0[0].bulge) last.bulge = B0[0].bulge; else delete last.bulge; return o.concat(B0.slice(1).map(q => Object.assign({}, q))); };
  cmd(['JOIN', 'J'], 'Nối các đường/cung/đa tuyến liền mạch thành 1', async () => {
    const s = await A.getSel('Chọn các đối tượng cần nối'); doJoin(s.sel || []);
  });
  function doJoin(selIn){
    let sel = selIn.filter(e => /^(LINE|ARC)$/.test(e.type) || (e.type === 'POLYLINE' && !e.closed));
    if(sel.length < 2){ log('Cần chọn ≥ 2 đường/cung/đa tuyến hở.'); return null; }
    // các đường thẳng cùng phương, chồng/chạm nhau -> 1 đường
    if(sel.every(e => e.type === 'LINE')){
      const e0 = sel[0], L = Math.hypot(e0.x2 - e0.x1, e0.y2 - e0.y1); const ux = (e0.x2 - e0.x1) / L, uy = (e0.y2 - e0.y1) / L;
      const bb = bboxOf(sel), tolC = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 1e-7 + 1e-9;
      const col = sel.every(e => [[e.x1, e.y1], [e.x2, e.y2]].every(([x, y]) => Math.abs(-(x - e0.x1) * uy + (y - e0.y1) * ux) <= tolC));
      if(col){ let tmin = Infinity, tmax = -Infinity; for(const e of sel) for(const [x, y] of [[e.x1, e.y1], [e.x2, e.y2]]){ const t = (x - e0.x1) * ux + (y - e0.y1) * uy; tmin = Math.min(tmin, t); tmax = Math.max(tmax, t); }
        const w = copyOf(e0); w.x1 = e0.x1 + ux * tmin; w.y1 = e0.y1 + uy * tmin; w.x2 = e0.x1 + ux * tmax; w.y2 = e0.y1 + uy * tmax; A.commit({ rep: [[e0, w]], del: sel.slice(1) }, 'Đã nối ' + sel.length + ' đường thẳng'); return [w]; }
    }
    // các cung cùng tâm/bán kính
    if(sel.every(e => e.type === 'ARC')){
      const e0 = sel[0], tolR = e0.r * 1e-6;
      if(sel.every(e => Math.hypot(e.cx - e0.cx, e.cy - e0.cy) <= tolR && Math.abs(e.r - e0.r) <= tolR)){
        const iv = sel.map(e => { const c = G.curveOf(e); return [c.a1, c.a1 + c.u1]; }).sort((a, b) => a[0] - b[0]);
        let a = iv[0][0], b = iv[0][1];
        for(let k = 1; k < iv.length + 1; k++){ for(const [x, y] of iv){ let xx = x; while(xx < a - 1e-9) xx += TAU; if(xx <= b + 1e-6 && xx + (y - x) > b) b = xx + (y - x); } }
        const w = copyOf(e0); if(b - a >= TAU - 1e-6){ w.type = 'CIRCLE'; delete w.a1; delete w.a2; } else { w.a1 = a * R2D; w.a2 = b * R2D; }
        A.commit({ rep: [[e0, w]], del: sel.slice(1) }, 'Đã nối cung'); return [w];
      }
    }
    // nối chuỗi đầu mút -> đa tuyến
    const bb = bboxOf(sel), tol = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 1e-6 + 1e-9;
    const items = sel.map(e => ({ e, pts: endpointsOf(e), used: false })).filter(it => it.pts && it.pts.length >= 2);
    const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
    const chains = [];
    for(const it of items){
      if(it.used) continue; it.used = true; let pts = it.pts.slice(); const members = [it.e];
      let grown = true;
      while(grown){ grown = false;
        for(const o of items){ if(o.used) continue; const a = o.pts[0], b = o.pts[o.pts.length - 1];
          const tail = pts[pts.length - 1], head = pts[0];
          if(near(tail, a)){ pts = catBV(pts, o.pts); } else if(near(tail, b)){ pts = catBV(pts, revBV(o.pts)); }
          else if(near(head, b)){ pts = catBV(o.pts, pts); } else if(near(head, a)){ pts = catBV(revBV(o.pts), pts); }
          else continue;
          o.used = true; members.push(o.e); grown = true; }
      }
      if(members.length > 1) chains.push({ pts, members });
    }
    if(!chains.length){ log('Các đối tượng không nối tiếp nhau (đầu mút không trùng).'); return null; }
    const rep = [], del = [];
    for(const ch of chains){ let closed = false; if((ch.pts.length > 3 || (ch.pts.length > 2 && ch.pts.some(q => q.bulge))) && near(ch.pts[0], ch.pts[ch.pts.length - 1])){ ch.pts.pop(); closed = true; }
      const base = ch.members[0]; const w = { type: 'POLYLINE', layer: base.layer, col: base.col, bl: base.bl, vertices: ch.pts.map(q => ({ x: q.x, y: q.y })), closed }; if(w.bl === undefined) delete w.bl; if(ch.pts.some(q => q.bulge)) A.setBV(w, ch.pts);
      rep.push([base, w]); del.push(...ch.members.slice(1)); }
    A.commit({ rep, del }, 'Đã nối thành ' + chains.length + ' đa tuyến');
    return rep.map(r => r[1]);
  }
  A.doJoin = doJoin;

  /* ---- PEDIT: đóng/mở, nối, đảo chiều đa tuyến ---- */
  cmd(['PEDIT', 'PE'], 'Sửa đa tuyến: đóng/mở, nối, đảo chiều, chuyển đường thành đa tuyến', async () => {
    const r = await A.getEnt('Chọn đa tuyến', { filter: e => /^(LINE|ARC|POLYLINE)$/.test(e.type) }); let e = r.ent; if(!e) return;
    if(e.type !== 'POLYLINE'){
      const k = await A.getKw('Đối tượng không phải đa tuyến — chuyển thành đa tuyến?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Có' }); if(k.kw === 'N') return;
      const w = { type: 'POLYLINE', layer: e.layer, col: e.col, vertices: endpointsOf(e), closed: false }; if(e.bl) w.bl = 1; A.commit({ rep: [[e, w]] }); e = w;
    }
    for(;;){
      hl([e]);
      const k = await A.getKw('Nhập tuỳ chọn', { kw: [{ k: 'C', t: e.closed ? 'Mở' : 'Đóng' }, { k: 'J', t: 'Nối' }, { k: 'W', t: 'Độ rộng' }, { k: 'R', t: 'Đảo chiều' }, { k: 'X', t: 'Thoát' }] });
      if(k.none || k.kw === 'X') break;
      if(k.kw === 'W'){ const d = await A.getDist('Độ rộng mới cho cả đa tuyến (0 = nét mảnh)', { def: 0 }); if(d.num == null || d.num < 0) continue; const w = copyOf(e);
        if(d.num > 0){ const src = (A.bvOf && A.bvOf(e)) || e.vertices; const raw = src.map(p => ({ x: p.x, y: p.y, bulge: p.bulge || 0, sw: d.num, ew: d.num })); const cl = !!e.closed; delete w.bv; delete w.bvs; widePoly(raw, cl, w); }
        else { delete w.wq; delete w.pw; } A.commit({ rep: [[e, w]] }, 'Đã đổi độ rộng đa tuyến'); e = w; continue; }
      if(k.kw === 'C'){ const w = copyOf(e); w.closed = !w.closed; delete w.wq; A.commit({ rep: [[e, w]] }); e = w; continue; }
      if(k.kw === 'R'){ const w = copyOf(e); if(!A.bvReverse(w, !!w.closed)){ w.vertices = w.vertices.slice().reverse(); delete w.wq; } A.commit({ rep: [[e, w]] }); e = w; continue; }
      if(k.kw === 'J'){ if(e.closed){ log('Đa tuyến kín — mở ra trước khi nối.'); continue; } const s = await A.getSel('Chọn đối tượng cần nối vào', { pre: false }); const res = doJoin([e].concat((s.sel || []).filter(x => x !== e))); if(res){ const m = res.find(x => x.type === 'POLYLINE') || res[0]; if(m) e = m; } continue; }
    }
    hl([]);
  });

  // EXPLODE
  cmd(['EXPLODE', 'X'], 'Phá khối / đa tuyến / hatch thành nét rời', async () => {
    const s = await A.getSel('Chọn đối tượng cần phá'); const sel = s.sel || []; if(!sel.length) return;
    const rep = [], add = [], del = []; let n = 0;
    for(const e of sel){
      if(e.grp){ const w = copyOf(e); delete w.grp; delete w.blk; delete w.dimv; delete w.dimd; delete w.bip; delete w.bm; delete w.l0; delete w.tbld; rep.push([e, w]); n++; continue; }
      if(e.type === 'POLYLINE' && A.bvOf(e)){   // như AutoCAD: đoạn cong của đa tuyến phá thành cung (ARC), không thành nhiều đoạn nhỏ
        const B = A.bvOf(e), segs = [], m = e.closed ? B.length : B.length - 1;
        for(let i = 0; i < m; i++){ const a = B[i], b = B[(i + 1) % B.length]; if(dist(a, b) < 1e-12) continue; const o = { layer: e.layer, col: e.col }; if(e.bl !== undefined) o.bl = e.bl;
          const ar = a.bulge ? G.bulgeArc(a, b, a.bulge) : null;
          if(ar){ const s0 = ar.a0 * R2D, s1 = (ar.a0 + ar.sw) * R2D; segs.push(Object.assign(o, { type: 'ARC', cx: ar.cx, cy: ar.cy, r: ar.r, a1: ar.sw > 0 ? s0 : s1, a2: ar.sw > 0 ? s1 : s0 })); }
          else segs.push(Object.assign(o, { type: 'LINE', x1: a.x, y1: a.y, x2: b.x, y2: b.y })); }
        if(segs.length){ rep.push([e, segs[0]]); add.push(...segs.slice(1)); n++; } continue; }
      if(e.type === 'POLYLINE'){ const V = e.vertices || []; const segs = []; const m = e.closed ? V.length : V.length - 1; for(let i = 0; i < m; i++){ const a = V[i], b = V[(i + 1) % V.length]; if(dist(a, b) < 1e-12) continue; segs.push({ type: 'LINE', layer: e.layer, col: e.col, bl: e.bl, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); } if(segs.length){ segs.forEach(x => { if(x.bl === undefined) delete x.bl; }); rep.push([e, segs[0]]); add.push(...segs.slice(1)); n++; } continue; }
      if(e.type === 'HATCH'){ const loops = (e.loops || []).filter(l => l.length >= 2).map(l => ({ type: 'POLYLINE', layer: e.layer, col: e.col, vertices: l.map(p => ({ x: p.x, y: p.y })), closed: true })); if(loops.length){ rep.push([e, loops[0]]); add.push(...loops.slice(1)); n++; } continue; }
    }
    if(!n){ log('Không có đối tượng nào phá được (khối, kích thước, đa tuyến, hatch).'); return; }
    A.commit({ rep, add, del }, 'Đã phá ' + n + ' đối tượng');
  });

  // LENGTHEN
  function lenOf(e){ const c = G.curveOf(e); return c ? (c.kind === 'arc' ? c.u1 * e.r : c.len) : 0; }
  function applyLen(e, pick, modeL, val, newEnd){
    const L = lenOf(e); let NL;
    if(modeL === 'DE') NL = L + val; else if(modeL === 'P') NL = L * val / 100; else if(modeL === 'T') NL = val; else NL = null;
    if(e.type === 'LINE'){
      const atStart = Math.hypot(pick.x - e.x1, pick.y - e.y1) < Math.hypot(pick.x - e.x2, pick.y - e.y2);
      const o = atStart ? { x: e.x2, y: e.y2 } : { x: e.x1, y: e.y1 }, en = atStart ? { x: e.x1, y: e.y1 } : { x: e.x2, y: e.y2 };
      const ux = (en.x - o.x) / L, uy = (en.y - o.y) / L; if(NL == null) NL = (newEnd.x - o.x) * ux + (newEnd.y - o.y) * uy;
      if(!(NL > 1e-12)) return null; const w = copyOf(e); const p = { x: o.x + ux * NL, y: o.y + uy * NL }; if(atStart){ w.x1 = p.x; w.y1 = p.y; } else { w.x2 = p.x; w.y2 = p.y; } return w;
    }
    if(e.type === 'ARC'){
      const c = G.curveOf(e); const atStart = dist(pick, c.at(0)) < dist(pick, c.at(c.u1));
      let sw; if(NL == null){ const a = Math.atan2(newEnd.y - e.cy, newEnd.x - e.cx); sw = atStart ? G.norm(c.a1 + c.u1 - a) : G.norm(a - c.a1); } else sw = NL / e.r;
      if(!(sw > 1e-9) || sw >= TAU) return null; const w = copyOf(e); if(atStart) w.a1 = (c.a1 + c.u1 - sw) * R2D; else w.a2 = (c.a1 + sw) * R2D; return w;
    }
    if(e.type === 'POLYLINE' && !e.closed){
      const V = e.vertices; const atStart = dist(pick, V[0]) < dist(pick, V[V.length - 1]);
      const end = atStart ? V[0] : V[V.length - 1], prev = atStart ? V[1] : V[V.length - 2]; const sl = dist(prev, end); if(sl < 1e-12) return null;
      const ux = (end.x - prev.x) / sl, uy = (end.y - prev.y) / sl; let nsl = NL == null ? (newEnd.x - prev.x) * ux + (newEnd.y - prev.y) * uy : sl + (NL - L);
      if(!(nsl > 1e-12)) return null; const w = copyOf(e); const p = { x: prev.x + ux * nsl, y: prev.y + uy * nsl }; if(atStart) w.vertices[0] = p; else w.vertices[w.vertices.length - 1] = p; delete w.wq; return w;
    }
    return null;
  }
  cmd(['LENGTHEN', 'LEN'], 'Đổi chiều dài (DE = thêm, P = %, T = tổng, DY = kéo)', async () => {
    let modeL = MEM.lenMode || 'DY', val = MEM.lenVal;
    const filt = e => e.type === 'LINE' || e.type === 'ARC' || (e.type === 'POLYLINE' && !e.closed);
    for(;;){
      const r = await A.getEnt('Chọn đối tượng để xem chiều dài', { kw: [{ k: 'DE', t: 'Thêm bớt' }, { k: 'P', t: 'Phần trăm' }, { k: 'T', t: 'Tổng' }, { k: 'DY', t: 'Kéo động' }], filter: filt });
      if(r.ent){ log('Chiều dài hiện tại: ' + fmt(lenOf(r.ent))); continue; }
      if(!r.kw) return;
      modeL = r.kw;
      if(modeL !== 'DY'){ const v = await A.getDist(modeL === 'DE' ? 'Nhập độ dài thêm (âm = bớt)' : modeL === 'P' ? 'Nhập phần trăm chiều dài' : 'Nhập tổng chiều dài', { def: val }); if(v.num != null) val = v.num; if(val == null) return; }
      MEM.lenMode = modeL; MEM.lenVal = val; remember();
      for(;;){
        const r2 = await A.getEnt('Chọn đối tượng cần đổi (bấm gần đầu cần đổi)', { filter: filt }); if(!r2.ent) return;
        let w;
        if(modeL === 'DY'){ const e = r2.ent; hl([e]); const p = await A.getPoint('Chỉ định điểm cuối mới', { preview: (g, q) => { const x = applyLen(e, r2.pt, 'DY', 0, q); if(x) g.ent(x); } }); hl([]); if(!p.pt) return; w = applyLen(e, r2.pt, 'DY', 0, p.pt); }
        else w = applyLen(r2.ent, r2.pt, modeL, val);
        if(w) A.commit({ rep: [[r2.ent, w]] }); else log('Không đổi được chiều dài.');
      }
    }
  });

  cmd(['ERASE', 'E', 'DELETE', 'DEL'], 'Xoá đối tượng', async () => {
    const s = await A.getSel('Chọn đối tượng cần xoá'); const sel = s.sel || []; if(!sel.length) return;
    A.commit({ del: sel }, 'Đã xoá ' + sel.length + ' đối tượng'); clearSelSafe(); A.lastErased = sel;
  });
  cmd(['OOPS'], 'Khôi phục đối tượng vừa xoá bằng ERASE', async () => {
    const L = (A.lastErased || []).filter(e => modelEntities.indexOf(e) < 0); if(!L.length){ log('Không có gì để khôi phục.'); return; }
    A.commit({ add: L.map(e => { const w = copyOf(e); return w; }) }, 'Đã khôi phục ' + L.length + ' đối tượng'); A.lastErased = [];
  });
  let simResult = null;
  DVDCmd.register(['SELECTSIMILAR', 'SELSIM'], 'Chọn các đối tượng cùng loại & cùng lớp', () => {
    simResult = null;
    A.run('SELECTSIMILAR', async () => {
      const s = await A.getSel('Chọn đối tượng mẫu'); const sel = s.sel || []; if(!sel.length) return;
      const keys = new Set(sel.map(e => e.type + '|' + (e.layer || '0') + '|' + (e.blk || '')));
      simResult = A.selectable().filter(e => keys.has(e.type + '|' + (e.layer || '0') + '|' + (e.blk || '')));
      log('Đã chọn ' + simResult.length + ' đối tượng tương tự');
    }).then(() => { if(simResult){ selEnts.clear(); for(const e of simResult) selEnts.add(e); refreshPanSel(); } });
  });
  plain(['PURGE', 'PU'], 'Dọn lớp trống không dùng', () => {
    const used = new Set(modelEntities.map(e => e.layer || '0')); let n = 0;
    for(const nm of [...A.LS.extra]){ if(!used.has(nm) && nm !== A.LS.cur && nm !== '0'){ A.deleteLayer(nm); n++; } }
    log('Đã dọn ' + n + ' lớp trống.');
  });
  plain(['DSETTINGS', 'DS', 'OSNAP', 'OS', 'SE'], 'Cài đặt bắt điểm / polar / lưới / nhập động', () => { if(A.openDrafting) A.openDrafting(); });
  plain(['UNITS', 'UN'], 'Đơn vị & tỉ lệ đo', () => { const b = document.getElementById('displayBtn'); if(b) b.click(); setTimeout(() => { const c = document.getElementById('openCalib'); if(c) c.click(); }, 30); });
  plain(['CLOSE'], 'Đóng bản vẽ', () => { if(confirm('Đóng bản vẽ? (thay đổi đã tự lưu trên máy)')) location.href = location.pathname; });
  const NOLT = { TEXT: 1, HATCH: 1, SOLID: 1, POINT: 1 };
  cmd(['MATCHPROP', 'MA', 'PAINTER'], 'Sao chép thuộc tính (lớp, màu, kiểu nét, bề rộng, cao chữ, mẫu hatch)', async () => {
    const r = await A.getEnt('Chọn đối tượng nguồn'); if(!r.ent) return; const src = r.ent; hl([src]);
    log('Nguồn: lớp ' + (src.layer || '0') + ', màu ' + (src.bl ? 'ByLayer' : src.col));
    for(;;){
      const s = await A.getSel('Chọn đối tượng đích (Enter để xong)', { pre: false }); const sel = (s.sel || []).filter(e => e !== src); if(!sel.length) break;
      A.commit({ rep: transformAll(sel, w => { w.layer = src.layer || '0'; if(src.bl){ w.bl = 1; w.col = A.layerHex(w.layer); } else { delete w.bl; w.col = src.col; } if(w.type === 'TEXT' && src.type === 'TEXT') w.h = src.h; if(src.lw > 0) w.lw = src.lw; else delete w.lw; if(!NOLT[w.type]){ if(src.lt && !NOLT[src.type]) w.lt = src.lt; else if(!NOLT[src.type]) delete w.lt; if(src.lts) w.lts = src.lts; else delete w.lts; } if(w.type === 'HATCH' && src.type === 'HATCH'){ w.pat = src.pat; w.psc = src.psc; w.pang = src.pang; w.solid = src.solid; } }) }, 'Đã áp thuộc tính cho ' + sel.length + ' đối tượng');
    }
    hl([]);
  });

  /* ===================================================================
     HỎI / ĐO KIỂU AUTOCAD (in kết quả ra dòng lệnh)
     =================================================================== */
  const fD = v => { try{ return formatDist(v); }catch(_){ return fmt(v); } };
  const fAr = v => { try{ return formatArea(v); }catch(_){ return fmt(v); } };
  cmd(['DIST', 'DI'], 'Khoảng cách giữa 2 điểm (in ra dòng lệnh)', async () => {
    const a = await A.getPoint('Chỉ định điểm thứ nhất'); if(!a.pt) return;
    const b = await A.getPoint('Chỉ định điểm thứ hai', { base: a.pt }); if(!b.pt) return;
    const dx = b.pt.x - a.pt.x, dy = b.pt.y - a.pt.y, d = Math.hypot(dx, dy);
    const msg = 'Khoảng cách = ' + fmt(d) + (fD(d) !== fmt(d) ? ' (' + fD(d) + ')' : '') + ', Góc = ' + fmtA(Math.atan2(dy, dx) * R2D) + ', ΔX = ' + fmt(dx) + ', ΔY = ' + fmt(dy);
    log(msg); say(msg); try{ showVal('D ' + fmt(d)); }catch(_){}
  });
  cmd(['AREA', 'AA'], 'Diện tích & chu vi (điểm, hoặc O = chọn đối tượng)', async () => {
    let r = await A.getPoint('Chỉ định điểm góc thứ nhất', { kw: [{ k: 'O', t: 'Đối tượng' }] }); if(r.none) return;
    let pts = [], closed = true;
    if(r.kw === 'O'){
      const s = await A.getEnt('Chọn đối tượng', { filter: e => /^(CIRCLE|POLYLINE|ELLIPSE|HATCH|ARC|SOLID)$/.test(e.type) }); if(!s.ent) return; const e = s.ent;
      if(e.type === 'CIRCLE'){ const ar = Math.PI * e.r * e.r; const m = 'Diện tích = ' + fmt(ar) + ' (' + fAr(ar) + '), Chu vi = ' + fmt(TAU * e.r); log(m); say(m); return; }
      if(e.type === 'HATCH'){ let ar = 0; for(const lp of e.loops) ar += G.area(lp); const m = 'Diện tích hatch ≈ ' + fmt(Math.abs(ar)) + ' (' + fAr(Math.abs(ar)) + ')'; log(m); say(m); return; }
      const c = G.curveOf(e); pts = c.pieces.map(p => ({ x: p.ax, y: p.ay })); if(!c.closed) pts.push({ x: c.pieces[c.pieces.length - 1].bx, y: c.pieces[c.pieces.length - 1].by });
    } else {
      pts.push(r.pt);
      for(;;){ const q = await A.getPoint('Chỉ định điểm tiếp theo (Enter = xong)', { base: pts[pts.length - 1], preview: (g, p) => { g.fill([pts.concat([p])], 'rgba(90,169,255,.18)'); g.poly(pts.concat([p]), true, '#9fd0ff'); } }); if(!q.pt) break; pts.push(q.pt); }
    }
    if(pts.length < 3){ log('Cần ≥ 3 điểm.'); return; }
    const ar = Math.abs(G.area(pts)); let per = 0; for(let i = 0; i < pts.length; i++) per += dist(pts[i], pts[(i + 1) % pts.length]);
    const m = 'Diện tích = ' + fmt(ar) + ' (' + fAr(ar) + '), Chu vi = ' + fmt(per) + ' (' + fD(per) + ')'; log(m); say(m); void closed;
  });
  cmd(['ID'], 'Toạ độ 1 điểm', async () => { const r = await A.getPoint('Chỉ định điểm'); if(!r.pt) return; const m = 'X = ' + fmt(r.pt.x) + '   Y = ' + fmt(r.pt.y); log(m); say(m); });
  const TYPE_VN = { LINE: 'Đường thẳng', CIRCLE: 'Đường tròn', ARC: 'Cung', POLYLINE: 'Đa tuyến', TEXT: 'Chữ', ELLIPSE: 'Elip', SOLID: 'Vùng đặc', HATCH: 'Hatch', POINT: 'Điểm', XLINE: 'Đường dựng' };
  A.TYPE_VN = TYPE_VN;
  cmd(['LIST', 'LI', 'LS'], 'Liệt kê thông tin đối tượng', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    for(const e of sel.slice(0, 30)){
      let t = (TYPE_VN[e.type] || e.type) + ' · Lớp: ' + (e.layer || '0') + ' · Màu: ' + (e.bl ? 'ByLayer' : (e.col || '?')) + (e.blk ? ' · Khối: ' + e.blk : '');
      if(e.type === 'LINE') t += ' · Từ (' + fmt(e.x1) + ', ' + fmt(e.y1) + ') đến (' + fmt(e.x2) + ', ' + fmt(e.y2) + ') · Dài ' + fmt(Math.hypot(e.x2 - e.x1, e.y2 - e.y1));
      else if(e.type === 'CIRCLE') t += ' · Tâm (' + fmt(e.cx) + ', ' + fmt(e.cy) + ') · R ' + fmt(e.r) + ' · S ' + fmt(Math.PI * e.r * e.r);
      else if(e.type === 'ARC') t += ' · Tâm (' + fmt(e.cx) + ', ' + fmt(e.cy) + ') · R ' + fmt(e.r) + ' · Góc ' + fmtA(e.a1) + '→' + fmtA(e.a2);
      else if(e.type === 'POLYLINE'){ const c = G.curveOf(e); t += ' · ' + (e.vertices || []).length + ' đỉnh · Dài ' + fmt(c ? c.len : 0) + (e.closed ? ' · S ' + fmt(Math.abs(G.area(e.vertices))) : ''); }
      else if(e.type === 'TEXT') t += ' · "' + String(e.text).slice(0, 60) + '" · cao ' + fmt(e.h);
      log(t);
    }
    if(sel.length > 30) log('… và ' + (sel.length - 30) + ' đối tượng khác');
    if(window.DVDCmd && DVDCmd.toggleHistory) DVDCmd.toggleHistory(true);
  });
  function pointsAlong(e, n, step){
    const c = G.curveOf(e); if(!c) return [];
    const out = []; const total = c.kind === 'arc' || c.kind === 'circle' ? c.u1 : c.kind === 'ellipse' ? c.u1 - c.u0 : c.len;
    if(c.kind === 'ellipse'){ for(let i = 1; i < n; i++) out.push(c.at(c.u0 + total * i / n)); return out; }
    const L = c.kind === 'arc' || c.kind === 'circle' ? total * e.r : total;
    if(step){ for(let s = step; s < L - 1e-9; s += step) out.push(c.at(c.kind === 'line' ? s / L : (c.kind === 'arc' || c.kind === 'circle') ? s / e.r : s)); return out; }
    const m = c.closed ? n : n; for(let i = 1; i < m; i++){ const s = L * i / n; out.push(c.at(c.kind === 'line' ? s / L : (c.kind === 'arc' || c.kind === 'circle') ? s / e.r : s)); }
    if(c.closed && c.kind !== 'line') out.unshift(c.at(0));
    return out;
  }
  cmd(['DIVIDE', 'DIV'], 'Chia đều đối tượng bằng các điểm', async () => {
    const r = await A.getEnt('Chọn đối tượng cần chia', { filter: curveable }); if(!r.ent) return;
    const n = await A.getNum('Nhập số đoạn', { def: MEM.divn || 4 }); const N = Math.round(n.num || MEM.divn || 4); if(!(N >= 2 && N <= 32767)) return; MEM.divn = N; remember();
    const pts = pointsAlong(r.ent, N); A.commit({ add: pts.map(p => mk('POINT', { x: p.x, y: p.y })) }, 'Đã chia thành ' + N + ' đoạn');
  });
  cmd(['MEASURE', 'ME'], 'Đặt điểm cách đều theo chiều dài', async () => {
    const r = await A.getEnt('Chọn đối tượng', { filter: curveable }); if(!r.ent) return;
    const d = await A.getDist('Chỉ định chiều dài đoạn', { def: MEM.mesd }); const D = d.num != null ? Math.abs(d.num) : MEM.mesd; if(!(D > 0)) return; MEM.mesd = D; remember();
    const pts = pointsAlong(r.ent, 0, D); if(pts.length > 20000){ say('Quá nhiều điểm.'); return; }
    A.commit({ add: pts.map(p => mk('POINT', { x: p.x, y: p.y })) }, 'Đã đặt ' + pts.length + ' điểm');
  });

  /* ===================================================================
     KÍCH THƯỚC (DIM) — nhóm nét thật trong bản vẽ, xuất DXF được
     =================================================================== */
  const DSK = () => { try{ return 'dim::' + (baseKey || ''); }catch(_){ return 'dim::'; } };
  const DS = A.DS = { txt: 0, arrow: 'tick', dec: 0, lfac: 1, exo: 0.6, exe: 0.8, gap: 0.5, asz: 1, dli: 1.8, suffix: '', prefix: '', layer: '' };
  function dsLoad(){ Object.assign(DS, { txt: 0, arrow: 'tick', dec: 0, lfac: 1, exo: 0.6, exe: 0.8, gap: 0.5, asz: 1, dli: 1.8, suffix: '', prefix: '', layer: '' }); try{ const g = JSON.parse(localStorage.getItem('dvd:dimstyle') || '{}'); Object.assign(DS, g); const o = JSON.parse(localStorage.getItem(DSK()) || '{}'); if(o.txt) DS.txt = o.txt; }catch(_){} }
  function dsSave(){ try{ const g = Object.assign({}, DS); delete g.txt; localStorage.setItem('dvd:dimstyle', JSON.stringify(g)); localStorage.setItem(DSK(), JSON.stringify({ txt: DS.txt })); }catch(_){} }
  A.dsSave = dsSave; A.dsLoad = dsLoad;
  dsLoad();
  function dimTxt(){ if(!(DS.txt > 0)){ DS.txt = +defaultTextH().toPrecision(3); dsSave(); } return DS.txt; }
  function dimFmt(v){ const x = v * (DS.lfac || 1); return (DS.prefix || '') + x.toFixed(Math.max(0, Math.min(6, DS.dec | 0))) + (DS.suffix || ''); }
  function dimFmtOf(w){ try{ return withStyle(w.dimd && w.dimd.s, () => dimFmt(w.dimv)); }catch(_){ return ''; } }
  const readable = deg => { deg = ((deg % 360) + 360) % 360; if(deg > 90 && deg <= 270) deg -= 180; return deg; };
  function arrowAt(tip, dirx, diry, t, out){   // dir = hướng từ trong ra đầu mũi tên
    const s = t * DS.asz;
    if(DS.arrow === 'tick'){ const a = Math.atan2(diry, dirx) + Math.PI / 4; out.push({ type: 'LINE', x1: tip.x - Math.cos(a) * s / 2, y1: tip.y - Math.sin(a) * s / 2, x2: tip.x + Math.cos(a) * s / 2, y2: tip.y + Math.sin(a) * s / 2, lw: 35 }); }
    else if(DS.arrow === 'dot'){ out.push({ type: 'CIRCLE', cx: tip.x, cy: tip.y, r: s / 5 }); }
    else { const bx = tip.x - dirx * s, by = tip.y - diry * s, nx = -diry * s / 6, ny = dirx * s / 6; out.push({ type: 'SOLID', pts: [{ x: tip.x, y: tip.y }, { x: bx + nx, y: by + ny }, { x: bx - nx, y: by - ny }, { x: bx - nx, y: by - ny }] }); }
  }
  const DS_KEYS = ['txt', 'arrow', 'dec', 'lfac', 'exo', 'exe', 'gap', 'asz', 'dli', 'suffix', 'prefix'];
  function styleSnap(){ const o = {}; for(const k of DS_KEYS) o[k] = DS[k]; o.txt = dimTxt(); return o; }
  function withStyle(sn, fn){ if(!sn) return fn(); const sv = {}; for(const k of DS_KEYS) sv[k] = DS[k]; try{ Object.assign(DS, sn); return fn(); } finally { Object.assign(DS, sv); } }
  function finishDim(ents, value, kindName, def){
    const gid = A.newGroupId('D'); const lay = DS.layer && A.layerNames().includes(DS.layer) ? DS.layer : null;
    return ents.map(e => { A.newProps(e); delete e.lt; delete e.lts; if(lay){ e.layer = lay; if(e.bl) e.col = A.layerHex(lay); } e.grp = gid; e.blk = '*DIM ' + kindName; if(e.type === 'TEXT'){ e.dimv = value; if(def) e.dimd = Object.assign({}, def, { s: styleSnap() }); } return e; });
  }
  // dựng lại hình của 1 kích thước từ định nghĩa (giữ kiểu dim lúc tạo) — dùng khi kéo grip / di chuyển / kéo giãn
  function dimBuild(d){
    return withStyle(d.s, () => {
      if(d.k === 'lin'){ const r = dimLinearEnts(d.p1, d.p2, d.L, d.phi, d.ov, d.tx); return r ? dimDecor(d, { ents: r.ents, val: r.meas, kind: 'thẳng', a: r.a, b: r.b }) : null; }
      if(d.k === 'rad' || d.k === 'dia'){ const r = dimRadEnts({ cx: d.c.x, cy: d.c.y, r: d.r }, d.L, d.k === 'dia', d.ov); return dimDecor(d, { ents: r.ents, val: r.val, kind: d.k === 'dia' ? 'đường kính' : 'bán kính' }); }
      if(d.k === 'ang'){ const r = dimAngEnts(d.V, d.d1, d.d2, d.L, d.ov); return r ? dimDecor(d, { ents: r.ents, val: r.val, kind: 'góc' }) : null; }
      return null;
    });
  }
  // trang trí kích thước: ký hiệu gấp khúc (DIMJOGLINE, d.jog = vị trí 0…1 trên đường kích thước) và khung kiểm tra (DIMINSPECT, d.insp = { lab, rate })
  function dimDecor(d, r){
    if(!r || !r.ents) return r; const t = r.ents.find(e => e.type === 'TEXT'); const th = (t && t.h) || dimTxt();
    if(d.jog != null && r.a && r.b){ const f = Math.max(0.05, Math.min(0.95, +d.jog || 0.5)), a = r.a, b = r.b, L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, nx = -uy, ny = ux;
      const P = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, w = th * 0.75, h = th * 0.9;
      r.ents.push({ type: 'POLYLINE', closed: false, vertices: [{ x: P.x - ux * w * 1.2, y: P.y - uy * w * 1.2 }, { x: P.x - ux * w * 0.3 + nx * h * 0.5, y: P.y - uy * w * 0.3 + ny * h * 0.5 }, { x: P.x + ux * w * 0.3 - nx * h * 0.5, y: P.y + uy * w * 0.3 - ny * h * 0.5 }, { x: P.x + ux * w * 1.2, y: P.y + uy * w * 1.2 }] }); }
    if(d.insp && t){ const lab = String(d.insp.lab || ''), rate = String(d.insp.rate || ''); const cw = th * 0.62, pad = th * 0.45;
      const w0 = [...String(t.text || '')].length * cw + 2 * pad, w1 = lab ? [...lab].length * cw + 2 * pad : 0, w2 = rate ? [...rate].length * cw + 2 * pad : 0;
      const ro = (t.rot || 0) * D2R, ux = Math.cos(ro), uy = Math.sin(ro), vx = -uy, vy = ux; const ha = t.ha || 'center';
      const xoff = ha === 'left' ? w0 / 2 - pad : (ha === 'right' || ha === 'end') ? -(w0 / 2 - pad) : 0, yoff = t.va === 'middle' ? 0 : t.va === 'top' ? -th * 0.5 : th * 0.36;
      const C = { x: t.x + ux * xoff + vx * yoff, y: t.y + uy * xoff + vy * yoff }; const at = (lx, ly) => ({ x: C.x + ux * lx + vx * ly, y: C.y + uy * lx + vy * ly });
      const R = th * 0.8, xl = -w0 / 2 - w1, xr = w0 / 2 + w2; const V = [];
      for(let k = 0; k <= 8; k++){ const g = -Math.PI / 2 + Math.PI * k / 8; V.push(at(xr - R + R * Math.cos(g) + (w2 ? 0 : 0), R * Math.sin(g))); }
      for(let k = 0; k <= 8; k++){ const g = Math.PI / 2 + Math.PI * k / 8; V.push(at(xl + R + R * Math.cos(g), R * Math.sin(g))); }
      r.ents.push({ type: 'POLYLINE', closed: true, vertices: V });
      const mkT = (lx, s) => { const p = at(lx, 0); return { type: 'TEXT', x: p.x, y: p.y, h: th, rot: t.rot || 0, text: s, ha: 'center', va: 'middle', dimx: 1 }; };
      if(lab){ const p1 = at(-w0 / 2, -R), p2 = at(-w0 / 2, R); r.ents.push({ type: 'LINE', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, mkT(-w0 / 2 - w1 / 2, lab)); }
      if(rate){ const p1 = at(w0 / 2, -R), p2 = at(w0 / 2, R); r.ents.push({ type: 'LINE', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, mkT(w0 / 2 + w2 / 2, rate)); } }
    return r;
  }
  A.dimBuild = dimBuild;
  // tạo các đối tượng mới thay cho nhóm kích thước, giữ lớp/màu/nhóm của chữ kích thước w
  A.dimRegenFrom = function(w){
    const r = dimBuild(w.dimd); if(!r) return null;
    return r.ents.map(e => { e.layer = w.layer || '0'; if(w.bl){ e.bl = 1; e.col = A.layerHex(e.layer); } else e.col = w.col; if(w.lw > 0 && e.lw == null) e.lw = w.lw; e.grp = w.grp; e.blk = w.blk || ('*DIM ' + r.kind); if(e.type === 'TEXT' && !e.dimx){ e.dimv = r.val; e.dimd = JSON.parse(JSON.stringify(w.dimd)); } return e; });
  };
  // các điểm nắm của kích thước (như AutoCAD: gốc đường gióng, đường kích thước, chữ)
  A.dimGrips = function(t){
    const d = t.dimd; if(!d) return [];
    if(d.k === 'lin'){ const r = withStyle(d.s, () => dimLinearEnts(d.p1, d.p2, d.L, d.phi, d.ov, d.tx)); const g = [{ x: d.p1.x, y: d.p1.y, r: 'dp1' }, { x: d.p2.x, y: d.p2.y, r: 'dp2' }]; if(r){ g.push({ x: r.a.x, y: r.a.y, r: 'dl' }, { x: r.b.x, y: r.b.y, r: 'dl' }); } g.push({ x: t.x, y: t.y, r: 'dt' }); return g; }
    if(d.k === 'rad' || d.k === 'dia') return [{ x: d.c.x, y: d.c.y, r: 'dc' }, { x: d.L.x, y: d.L.y, r: 'dl' }, { x: t.x, y: t.y, r: 'dt' }];
    if(d.k === 'ang') return [{ x: d.V.x, y: d.V.y, r: 'dc' }, { x: d.L.x, y: d.L.y, r: 'dl' }, { x: t.x, y: t.y, r: 'dt' }];
    return [];
  };
  // kéo 1 điểm nắm của kích thước -> định nghĩa mới
  A.dimApplyGrip = function(d, role, from, to){
    const dx = to.x - from.x, dy = to.y - from.y;
    if(role === 'dp1') d.p1 = { x: to.x, y: to.y };
    else if(role === 'dp2') d.p2 = { x: to.x, y: to.y };
    else if(role === 'dl'){ d.L = { x: d.L.x + dx, y: d.L.y + dy }; }
    else if(role === 'dc'){ if(d.c) d.c = { x: d.c.x + dx, y: d.c.y + dy }; if(d.V) d.V = { x: d.V.x + dx, y: d.V.y + dy }; d.L = { x: d.L.x + dx, y: d.L.y + dy }; }
    else if(role === 'dt'){
      if(d.k === 'lin'){ const phi = d.phi * D2R, ux = Math.cos(phi), uy = Math.sin(phi); const nL = { x: d.L.x + dx, y: d.L.y + dy };
        const along = dx * ux + dy * uy; d.tx = (d.tx || 0) + along; d.L = nL; }
      else d.L = { x: d.L.x + dx, y: d.L.y + dy };
    }
    return d;
  };
  // kích thước thẳng xoay góc phi (độ): đo theo phương phi, đường kích thước đi qua L
  function dimLinearEnts(p1, p2, L, phiDeg, overrideText, tx){
    const t = dimTxt(); const phi = phiDeg * D2R, ux = Math.cos(phi), uy = Math.sin(phi), nx = -uy, ny = ux;
    const d1 = (L.x - p1.x) * nx + (L.y - p1.y) * ny, d2 = (L.x - p2.x) * nx + (L.y - p2.y) * ny;
    const a = { x: p1.x + nx * d1, y: p1.y + ny * d1 }, b = { x: p2.x + nx * d2, y: p2.y + ny * d2 };
    const meas = Math.abs((p2.x - p1.x) * ux + (p2.y - p1.y) * uy); if(meas < 1e-12) return null;
    const out = [];
    const ext = (p, d) => { if(Math.abs(d) < t * DS.exo * 1.01) return; const s = Math.sign(d); out.push({ type: 'LINE', x1: p.x + nx * s * t * DS.exo, y1: p.y + ny * s * t * DS.exo, x2: p.x + nx * (d + s * t * DS.exe), y2: p.y + ny * (d + s * t * DS.exe) }); };
    ext(p1, d1); ext(p2, d2);
    const dl = dist(a, b), dux = (b.x - a.x) / dl, duy = (b.y - a.y) / dl;
    const ov = t * DS.asz * (DS.arrow === 'tick' ? 0.6 : 0);   // nét kích thước vượt qua đường gióng (kiểu tick)
    out.push({ type: 'LINE', x1: a.x - dux * ov, y1: a.y - duy * ov, x2: b.x + dux * ov, y2: b.y + duy * ov });
    arrowAt(a, -dux, -duy, t, out); arrowAt(b, dux, duy, t, out);
    const rot = readable(Math.atan2(duy, dux) * R2D), r = rot * D2R, upx = -Math.sin(r), upy = Math.cos(r);
    const txt = overrideText || dimFmt(meas);
    const sh = tx || 0, cx = (a.x + b.x) / 2 + ux * sh, cy = (a.y + b.y) / 2 + uy * sh;
    const mid = { x: cx + upx * t * DS.gap, y: cy + upy * t * DS.gap };
    if(sh && Math.abs(sh) > dl / 2){   // chữ dời ra ngoài: kéo dài đường kích thước tới dưới chữ
      const sg = Math.sign(sh); const end = ((b.x - a.x) * ux + (b.y - a.y) * uy) * sg > 0 ? b : a; const tw = t * 0.62 * String(txt).length / 2 + t * 0.4;
      out.push({ type: 'LINE', x1: end.x, y1: end.y, x2: cx + ux * sg * tw, y2: cy + uy * sg * tw });
    }
    out.push({ type: 'TEXT', x: mid.x, y: mid.y, h: t, rot, text: txt, ha: 'center', va: 'alphabetic' });
    return { ents: out, meas, txt, a, b };
  }
  function autoPhi(p1, p2, L){
    const minx = Math.min(p1.x, p2.x), maxx = Math.max(p1.x, p2.x), miny = Math.min(p1.y, p2.y), maxy = Math.max(p1.y, p2.y);
    const outY = L.y > maxy || L.y < miny, outX = L.x > maxx || L.x < minx;
    if(outY && !outX) return 0; if(outX && !outY) return 90;
    const dyOut = L.y > maxy ? L.y - maxy : miny - L.y, dxOut = L.x > maxx ? L.x - maxx : minx - L.x;
    if(outX && outY) return dyOut >= dxOut ? 0 : 90;
    return Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y) ? 0 : 90;
  }
  let lastDim = null;
  async function dimOrigins(){
    let r = await A.getPoint('Chỉ định gốc đường gióng thứ nhất hoặc <chọn đối tượng>');
    let p1, p2;
    if(r.none){ const s = await A.getEnt('Chọn đối tượng cần ghi kích thước', { filter: e => e.type === 'LINE' || e.type === 'POLYLINE' || e.type === 'ARC' }); if(!s.ent) return null; const e = s.ent;
      if(e.type === 'LINE'){ p1 = { x: e.x1, y: e.y1 }; p2 = { x: e.x2, y: e.y2 }; }
      else if(e.type === 'ARC'){ const c = G.curveOf(e); p1 = c.at(0); p2 = c.at(c.u1); }
      else { const c = G.curveOf(e); let best = null, bd = Infinity; for(const p of c.pieces){ const q = G.nearOnPiece(p, s.pt); const d = Math.hypot(q.x - s.pt.x, q.y - s.pt.y); if(d < bd){ bd = d; best = p; } } p1 = { x: best.ax, y: best.ay }; p2 = { x: best.bx, y: best.by }; } }
    else { if(!r.pt) return null; p1 = r.pt; const r2 = await A.getPoint('Chỉ định gốc đường gióng thứ hai', { base: p1 }); if(!r2.pt) return null; p2 = r2.pt; }
    return { p1, p2 };
  }
  async function dimLinearCmd(aligned){
    const o = await dimOrigins(); if(!o) return;
    let forced = aligned ? 'A' : null, txtOv = null, rotFixed = null;
    for(;;){
      const phiOf = L => forced === 'A' ? ang(o.p1, o.p2) * R2D : forced === 'H' ? 0 : forced === 'V' ? 90 : rotFixed != null ? rotFixed : autoPhi(o.p1, o.p2, L);
      const kw = aligned ? [{ k: 'T', t: 'Chữ' }] : [{ k: 'T', t: 'Chữ' }, { k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }, { k: 'R', t: 'Xoay' }];
      const r = await A.getPoint('Chỉ định vị trí đường kích thước', { kw, rubber: false, preview: (g, p) => { const d = dimLinearEnts(o.p1, o.p2, p, phiOf(p), txtOv); if(d) g.ents(d.ents, '#e8eef7'); } });
      if(r.none) return;
      if(r.kw === 'T'){ const s = await askText({ title: 'Nội dung kích thước (để trống = đo tự động)', value: '' }); txtOv = s && s.trim() ? s.trim() : null; continue; }
      if(r.kw === 'H' || r.kw === 'V'){ forced = r.kw; continue; }
      if(r.kw === 'R'){ const a = await A.getAngle('Chỉ định góc đường kích thước', { def: 0 }); rotFixed = a.num != null ? a.num : 0; forced = null; continue; }
      if(!r.pt) return;
      const phi = phiOf(r.pt); const d = dimLinearEnts(o.p1, o.p2, r.pt, phi, txtOv); if(!d){ log('Hai điểm trùng nhau theo phương đo.'); return; }
      A.commit({ add: finishDim(d.ents, d.meas, aligned ? 'chéo' : 'thẳng', { k: 'lin', p1: o.p1, p2: o.p2, L: r.pt, phi, ov: txtOv || null }) });
      log('Kích thước = ' + d.txt);
      lastDim = { p1: o.p1, p2: o.p2, L: r.pt, phi, base: o.p1, off: 0 };
      return;
    }
  }
  A.makeDimLinear = (p1, p2, L, phi, kind) => { const d = dimLinearEnts(p1, p2, L, phi); if(!d) return null; return finishDim(d.ents, d.meas, kind || 'nhanh', { k: 'lin', p1, p2, L, phi, ov: null }); };
  A.dimTxt = () => dimTxt(); A.finishDim = finishDim; A.arrowAt = arrowAt; A.dimFmt = v => dimFmt(v); A.dimReadable = readable;
  cmd(['DIMLINEAR', 'DLI', 'DIMLIN'], 'Kích thước ngang/dọc (thật, trong bản vẽ)', () => dimLinearCmd(false));
  cmd(['DIMALIGNED', 'DAL', 'DIMALI'], 'Kích thước chéo theo 2 điểm', () => dimLinearCmd(true));
  async function dimChain(baseline){
    if(!lastDim){ log('Chưa có kích thước thẳng nào để nối tiếp — vẽ DIMLINEAR trước.'); return; }
    let prev = lastDim; const t = dimTxt();
    for(;;){
      const r = await A.getPoint('Chỉ định gốc đường gióng tiếp theo (Enter để thôi)', { kw: [{ k: 'U', t: 'Hoàn tác' }], rubber: false, preview: (g, p) => {
        const from = baseline ? prev.base : prev.p2; const L = baseline ? shiftL(prev, t) : prev.L; const d = dimLinearEnts(from, p, L, prev.phi); if(d) g.ents(d.ents); } });
      if(r.none) return; if(r.kw === 'U'){ undoEdit(); continue; }
      if(!r.pt) return;
      const from = baseline ? prev.base : prev.p2; const L = baseline ? shiftL(prev, t) : prev.L;
      const d = dimLinearEnts(from, r.pt, L, prev.phi); if(!d){ log('Điểm trùng phương đo.'); continue; }
      A.commit({ add: finishDim(d.ents, d.meas, baseline ? 'cơ sở' : 'liên tục', { k: 'lin', p1: from, p2: r.pt, L, phi: prev.phi, ov: null }) }); log('Kích thước = ' + d.txt);
      prev = { p1: from, p2: r.pt, L, phi: prev.phi, base: prev.base }; lastDim = prev;
    }
  }
  function shiftL(prev, t){ const phi = prev.phi * D2R, nx = -Math.sin(phi), ny = Math.cos(phi); const s = ((prev.L.x - prev.base.x) * nx + (prev.L.y - prev.base.y) * ny) >= 0 ? 1 : -1; return { x: prev.L.x + nx * s * t * DS.dli, y: prev.L.y + ny * s * t * DS.dli }; }
  cmd(['DIMCONTINUE', 'DCO', 'DIMCONT'], 'Kích thước nối tiếp chuỗi', () => dimChain(false));
  cmd(['DIMBASELINE', 'DBA', 'DIMBASE'], 'Kích thước cùng gốc (bậc thang)', () => dimChain(true));
  function dimRadEnts(e, L, dia, ov){
    const t = dimTxt(); let ux = L.x - e.cx, uy = L.y - e.cy; const dl = Math.hypot(ux, uy) || 1; ux /= dl; uy /= dl;
    const edge = { x: e.cx + ux * e.r, y: e.cy + uy * e.r }, out = [];
    if(dia){ const o = { x: e.cx - ux * e.r, y: e.cy - uy * e.r }; out.push({ type: 'LINE', x1: o.x, y1: o.y, x2: edge.x, y2: edge.y }); const sv = DS.arrow; if(DS.arrow === 'tick') DS.arrow = 'arrow'; arrowAt(edge, ux, uy, t, out); arrowAt(o, -ux, -uy, t, out); DS.arrow = sv; }
    else { out.push({ type: 'LINE', x1: e.cx, y1: e.cy, x2: edge.x, y2: edge.y }); const sv = DS.arrow; if(DS.arrow === 'tick') DS.arrow = 'arrow'; arrowAt(edge, ux, uy, t, out); DS.arrow = sv; }
    if(dl > e.r) out.push({ type: 'LINE', x1: edge.x, y1: edge.y, x2: L.x, y2: L.y });
    const rot = readable(Math.atan2(uy, ux) * R2D), r = rot * D2R, upx = -Math.sin(r), upy = Math.cos(r);
    const at = dl > e.r ? { x: (edge.x + L.x) / 2, y: (edge.y + L.y) / 2 } : { x: (e.cx + edge.x) / 2, y: (e.cy + edge.y) / 2 };
    const val = dia ? 2 * e.r : e.r; const txt = ov || ((dia ? 'Ø' : 'R') + dimFmt(val));
    out.push({ type: 'TEXT', x: at.x + upx * t * DS.gap, y: at.y + upy * t * DS.gap, h: t, rot, text: txt, ha: 'center', va: 'alphabetic' });
    return { ents: out, val, txt };
  }
  async function dimRadCmd(dia){
    const s = await A.getEnt(dia ? 'Chọn đường tròn hoặc cung' : 'Chọn cung hoặc đường tròn', { filter: e => e.type === 'CIRCLE' || e.type === 'ARC' }); if(!s.ent) return; const e = s.ent; hl([e]);
    const r = await A.getPoint('Chỉ định vị trí đường kích thước', { rubber: false, preview: (g, p) => g.ents(dimRadEnts(e, p, dia).ents) }); hl([]); if(!r.pt) return;
    const d = dimRadEnts(e, r.pt, dia); A.commit({ add: finishDim(d.ents, d.val, dia ? 'đường kính' : 'bán kính', { k: dia ? 'dia' : 'rad', c: { x: e.cx, y: e.cy }, r: e.r, L: r.pt, ov: null }) }); log('Kích thước = ' + d.txt);
  }
  A.makeDimRad = (e, L, dia) => { const d = dimRadEnts(e, L, dia); return finishDim(d.ents, d.val, dia ? 'đường kính' : 'bán kính', { k: dia ? 'dia' : 'rad', c: { x: e.cx, y: e.cy }, r: e.r, L, ov: null }); };
  A.dimRadPreview = (e, L, dia) => dimRadEnts(e, L, dia).ents;
  cmd(['DIMRADIUS', 'DRA', 'DIMRAD'], 'Kích thước bán kính', () => dimRadCmd(false));
  cmd(['DIMDIAMETER', 'DDI', 'DIMDIA'], 'Kích thước đường kính', () => dimRadCmd(true));
  function dimAngEnts(V, d1, d2, L, ov){
    const t = dimTxt(); const R = Math.max(dist(V, L), t);
    const aL = ang(V, L); const cand = [];
    for(const [u, v] of [[d1, d2], [d2, d1]]) for(const r1 of [u, u + Math.PI]) for(const r2 of [v, v + Math.PI]){ const sw = G.norm(r2 - r1); if(sw < 1e-9 || sw > Math.PI) continue; if(G.norm(aL - r1) <= sw) cand.push({ a1: r1, sw }); }   // cả 2 chiều (chọn đường nào trước cũng được)
    if(!cand.length) return null; const c = cand[0];
    const out = [{ type: 'ARC', cx: V.x, cy: V.y, r: R, a1: c.a1 * R2D, a2: (c.a1 + c.sw) * R2D }];
    const p1 = { x: V.x + R * Math.cos(c.a1), y: V.y + R * Math.sin(c.a1) }, p2 = { x: V.x + R * Math.cos(c.a1 + c.sw), y: V.y + R * Math.sin(c.a1 + c.sw) };
    const sv = DS.arrow; if(DS.arrow === 'tick') DS.arrow = 'arrow';
    arrowAt(p1, Math.sin(c.a1), -Math.cos(c.a1), t, out); arrowAt(p2, -Math.sin(c.a1 + c.sw), Math.cos(c.a1 + c.sw), t, out); DS.arrow = sv;
    const am = c.a1 + c.sw / 2, mid = { x: V.x + (R + t * DS.gap) * Math.cos(am), y: V.y + (R + t * DS.gap) * Math.sin(am) };
    const deg = c.sw * R2D; const txt = ov || (deg.toFixed(Math.max(0, DS.dec | 0)) + '°');
    out.push({ type: 'TEXT', x: mid.x, y: mid.y, h: t, rot: readable(am * R2D - 90), text: txt, ha: 'center', va: 'alphabetic' });
    return { ents: out, val: deg, txt };
  }
  cmd(['DIMANGULAR', 'DAN', 'DIMANG'], 'Kích thước góc giữa 2 đường', async () => {
    const a = await A.getEnt('Chọn đường thứ nhất', { filter: e => e.type === 'LINE' }); if(!a.ent) return; hl([a.ent]);
    const b = await A.getEnt('Chọn đường thứ hai', { filter: e => e.type === 'LINE' && e !== a.ent }); if(!b.ent){ hl([]); return; } hl([a.ent, b.ent]);
    const V = lineIntersect(a.ent, b.ent); if(!V){ hl([]); log('Hai đường song song.'); return; }
    const d1 = Math.atan2(a.ent.y2 - a.ent.y1, a.ent.x2 - a.ent.x1), d2 = Math.atan2(b.ent.y2 - b.ent.y1, b.ent.x2 - b.ent.x1);
    const r = await A.getPoint('Chỉ định vị trí cung kích thước', { rubber: false, preview: (g, p) => { const d = dimAngEnts(V, d1, d2, p); if(d) g.ents(d.ents); } }); hl([]); if(!r.pt) return;
    const d = dimAngEnts(V, d1, d2, r.pt); if(!d) return; A.commit({ add: finishDim(d.ents, d.val, 'góc', { k: 'ang', V, d1, d2, L: r.pt, ov: null }) }); log('Góc = ' + d.txt);
  });
  A.makeDimAng = (V, d1, d2, L) => { const d = dimAngEnts(V, d1, d2, L); return d ? finishDim(d.ents, d.val, 'góc', { k: 'ang', V, d1, d2, L, ov: null }) : null; };
  A.dimAngPreview = (V, d1, d2, L) => { const d = dimAngEnts(V, d1, d2, L); return d ? d.ents : []; };
  A.dimLinPreview = (p1, p2, L, phi) => { const d = dimLinearEnts(p1, p2, L, phi); return d ? d.ents : []; };
  DVDCmd.register(['DIMSTYLE', 'D', 'DST', 'DDIM'], 'Kiểu kích thước (cao chữ, mũi tên, số lẻ…)', () => openDimStyle());
  function openDimStyle(){
    dimTxt();
    const layers = A.layerNames();
    A.dialog({ title: 'Kiểu kích thước', wide: true, html:
      '<div class="dvd-form">' +
      row('Cao chữ', '<input id="dsTxt" type="number" step="any" value="' + DS.txt + '">') +
      row('Mũi tên', sel('dsArrow', [['tick', 'Gạch chéo (kiến trúc)'], ['arrow', 'Mũi tên đặc'], ['dot', 'Chấm tròn']], DS.arrow)) +
      row('Số lẻ', '<input id="dsDec" type="number" min="0" max="6" value="' + DS.dec + '">') +
      row('Hệ số đo', '<input id="dsLfac" type="number" step="any" value="' + DS.lfac + '">') +
      row('Tiền tố / hậu tố', '<input id="dsPre" value="' + escapeHtml(DS.prefix || '') + '" style="width:45%"> <input id="dsSuf" value="' + escapeHtml(DS.suffix || '') + '" style="width:45%">') +
      row('Cỡ mũi tên (× cao chữ)', '<input id="dsAsz" type="number" step="any" value="' + DS.asz + '">') +
      row('Hở gốc gióng (× cao chữ)', '<input id="dsExo" type="number" step="any" value="' + DS.exo + '">') +
      row('Vượt gióng (× cao chữ)', '<input id="dsExe" type="number" step="any" value="' + DS.exe + '">') +
      row('Khoảng bậc DBA (× cao chữ)', '<input id="dsDli" type="number" step="any" value="' + DS.dli + '">') +
      row('Lớp cho kích thước', sel('dsLayer', [['', '(lớp hiện hành)']].concat(layers.map(n => [n, n])), DS.layer || '')) +
      '</div>',
      ok: (root) => { const v = id => root.querySelector('#' + id).value; const nv = id => parseFloat(v(id));
        if(nv('dsTxt') > 0) DS.txt = nv('dsTxt'); DS.arrow = v('dsArrow'); DS.dec = Math.max(0, Math.min(6, parseInt(v('dsDec')) || 0)); if(nv('dsLfac') > 0) DS.lfac = nv('dsLfac');
        DS.prefix = v('dsPre'); DS.suffix = v('dsSuf'); for(const [k, id] of [['asz', 'dsAsz'], ['exo', 'dsExo'], ['exe', 'dsExe'], ['dli', 'dsDli']]){ const x = nv(id); if(isFinite(x) && x >= 0) DS[k] = x; } DS.layer = v('dsLayer');
        dsSave(); say('Đã lưu kiểu kích thước'); } });
  }
  function row(l, h){ return '<label class="dvd-frow"><span>' + l + '</span><span class="v">' + h + '</span></label>'; }
  function sel(id, opts, cur){ return '<select id="' + id + '">' + opts.map(([v, t]) => '<option value="' + escapeHtml(v) + '"' + (v === cur ? ' selected' : '') + '>' + escapeHtml(t) + '</option>').join('') + '</select>'; }
  A.formRow = row; A.formSel = sel;

  /* ===================================================================
     HATCH — mẫu tô + dò biên kín từ điểm bên trong
     =================================================================== */
  const PATS = A.PATS = {
    SOLID: { name: 'Tô đặc', solid: true },
    ANSI31: { name: 'ANSI31 (gạch 45°)', fam: [{ a: 45, sp: 3.175 }] },
    ANSI32: { name: 'ANSI32 (thép)', fam: [{ a: 45, sp: 9.525 }, { a: 45, sp: 9.525, off: 3.175 }] },
    ANSI37: { name: 'ANSI37 (lưới chéo)', fam: [{ a: 45, sp: 3.175 }, { a: 135, sp: 3.175 }] },
    NET: { name: 'NET (lưới vuông)', fam: [{ a: 0, sp: 3.175 }, { a: 90, sp: 3.175 }] },
    LINE: { name: 'LINE (gạch ngang)', fam: [{ a: 0, sp: 3.175 }] },
    BRICK: { name: 'BRICK (gạch xây)', brick: { h: 6.35, w: 12.7 } },
    DOTS: { name: 'DOTS (chấm)', dots: 3.175 },
    'AR-CONC': { name: 'AR-CONC (bê tông)', conc: 6 },
    EARTH: { name: 'EARTH (đất)', earth: 6.35 }
  };
  const HS = A.HS = Object.assign({ pat: 'ANSI31', scale: 0, ang: 0, col: '' }, (() => { try{ return JSON.parse(localStorage.getItem('dvd:hatch') || '{}'); }catch(_){ return {}; } })());
  const hsSave = () => { try{ localStorage.setItem('dvd:hatch', JSON.stringify(HS)); }catch(_){} };
  function hash01(i, j, k){ let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // đoạn thẳng mẫu (toạ độ thế giới) trong hộp bb — dùng cả để vẽ lẫn xuất DXF
  function patternSegs(e, bb, maxN){
    const P = PATS[e.pat] || PATS.ANSI31; const sc = e.psc || 1, rot = (e.pang || 0) * D2R; const segs = [], dots = [];
    const diag = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const family = (aDeg, sp, off) => { const a = aDeg * D2R + rot, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux; const S = sp * sc; if(!(S > 0)) return true;
      const c0 = cx * nx + cy * ny; const k0 = Math.floor((c0 - diag / 2 - (off || 0) * sc) / S), k1 = Math.ceil((c0 + diag / 2 - (off || 0) * sc) / S);
      if(k1 - k0 > maxN) return false;
      for(let k = k0; k <= k1; k++){ const o = k * S + (off || 0) * sc; const px = nx * o + ux * (cx * ux + cy * uy), py = ny * o + uy * (cx * ux + cy * uy); segs.push([px - ux * diag, py - uy * diag, px + ux * diag, py + uy * diag]); }
      return true; };
    if(P.fam){ for(const f of P.fam) if(!family(f.a, f.sp, f.off)) return null; }
    else if(P.brick){ const h = P.brick.h * sc, w = P.brick.w * sc; if(!family(0, P.brick.h, 0)) return null;
      const ux = Math.cos(rot), uy = Math.sin(rot), nx = -uy, ny = ux; const toW = (u, v) => ({ x: u * ux + v * nx, y: u * uy + v * ny });
      const us = [bb.x0 * ux + bb.y0 * uy, bb.x1 * ux + bb.y0 * uy, bb.x0 * ux + bb.y1 * uy, bb.x1 * ux + bb.y1 * uy], vs = [bb.x0 * nx + bb.y0 * ny, bb.x1 * nx + bb.y0 * ny, bb.x0 * nx + bb.y1 * ny, bb.x1 * nx + bb.y1 * ny];
      const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
      const rows = Math.ceil((v1 - v0) / h) + 2, cols = Math.ceil((u1 - u0) / w) + 2; if(rows * cols > maxN * 4) return null;
      for(let r = Math.floor(v0 / h) - 1; r <= Math.ceil(v1 / h); r++){ const sh = (r & 1) ? w / 2 : 0; for(let c = Math.floor(u0 / w) - 1; c <= Math.ceil(u1 / w) + 1; c++){ const u = c * w + sh; const A1 = toW(u, r * h), B1 = toW(u, (r + 1) * h); segs.push([A1.x, A1.y, B1.x, B1.y]); } } }
    else if(P.dots || P.conc || P.earth){
      const S = (P.dots || P.conc || P.earth) * sc; const nX = Math.ceil((bb.x1 - bb.x0) / S) + 1, nY = Math.ceil((bb.y1 - bb.y0) / S) + 1; if(nX * nY > maxN * 6) return null;
      for(let i = Math.floor(bb.x0 / S); i <= Math.ceil(bb.x1 / S); i++) for(let j = Math.floor(bb.y0 / S); j <= Math.ceil(bb.y1 / S); j++){
        const x = i * S, y = j * S;
        if(P.dots){ dots.push([x + ((j & 1) ? S / 2 : 0), y]); continue; }
        if(P.earth){ const v = (i + j) & 1; for(let k = 0; k < 3; k++){ const o = (k + 1) * S / 4; if(v) segs.push([x, y + o, x + S * 0.8, y + o]); else segs.push([x + o, y, x + o, y + S * 0.8]); } continue; }
        const rx = x + hash01(i, j, 1) * S * 0.8, ry = y + hash01(i, j, 2) * S * 0.8, rs = S * (0.18 + 0.2 * hash01(i, j, 3)), ra = hash01(i, j, 4) * TAU;
        if(hash01(i, j, 5) < 0.55){ const p = [0, 1, 2].map(k => ({ x: rx + Math.cos(ra + k * TAU / 3) * rs, y: ry + Math.sin(ra + k * TAU / 3) * rs })); for(let k = 0; k < 3; k++) segs.push([p[k].x, p[k].y, p[(k + 1) % 3].x, p[(k + 1) % 3].y]); }
        dots.push([x + hash01(i, j, 6) * S, y + hash01(i, j, 7) * S]); if(hash01(i, j, 8) < 0.5) dots.push([x + hash01(i, j, 9) * S, y + hash01(i, j, 10) * S]);
      }
    }
    return { segs, dots };
  }
  A.patternSegs = patternSegs;
  // cắt đoạn thẳng theo vùng (even-odd) -> các đoạn nằm trong
  function clipSegToLoops(x1, y1, x2, y2, loops){
    const ts = [0, 1]; const dx = x2 - x1, dy = y2 - y1;
    for(const lp of loops){ for(let i = 0; i < lp.length; i++){ const a = lp[i], b = lp[(i + 1) % lp.length]; const ex = b.x - a.x, ey = b.y - a.y; const den = dx * ey - dy * ex; if(Math.abs(den) < 1e-18) continue; const t = ((a.x - x1) * ey - (a.y - y1) * ex) / den, u = ((a.x - x1) * dy - (a.y - y1) * dx) / den; if(t > 0 && t < 1 && u >= 0 && u < 1) ts.push(t); } }
    ts.sort((a, b) => a - b); const out = [];
    for(let i = 0; i < ts.length - 1; i++){ const ta = ts[i], tb = ts[i + 1]; if(tb - ta < 1e-12) continue; const tm = (ta + tb) / 2; if(G.ptInLoops({ x: x1 + dx * tm, y: y1 + dy * tm }, loops)) out.push([x1 + dx * ta, y1 + dy * ta, x1 + dx * tb, y1 + dy * tb]); }
    return out;
  }
  A.clipSegToLoops = clipSegToLoops;
  // vẽ hatch có mẫu (hatch do người dùng tạo); hatch gốc của file giữ cách vẽ cũ
  const _drawHatch = window.drawHatch;
  window.drawHatch = function(e){
    if(!e.pat) return _drawHatch.apply(this, arguments);
    if(!e.loops || !e.loops.length) return;
    const col = plotColor(e.col || getCSS('--entity'));
    ctx.save(); ctx.beginPath();
    for(const lp of e.loops){ if(!lp || lp.length < 2) continue; const p0 = toScreen(lp[0].x, lp[0].y); ctx.moveTo(p0.x, p0.y); for(let k = 1; k < lp.length; k++){ const p = toScreen(lp[k].x, lp[k].y); ctx.lineTo(p.x, p.y); } ctx.closePath(); }
    if(e.pat === 'SOLID'){ ctx.fillStyle = col; ctx.fill('evenodd'); ctx.restore(); return; }
    ctx.clip('evenodd');
    const vb = viewWorldAABB(), hb = entBBox(e); if(!hb){ ctx.restore(); return; }
    const bb = { x0: Math.max(vb.minX, hb.x0), y0: Math.max(vb.minY, hb.y0), x1: Math.min(vb.maxX, hb.x1), y1: Math.min(vb.maxY, hb.y1) };
    if(bb.x1 <= bb.x0 || bb.y1 <= bb.y0){ ctx.restore(); return; }
    const P = PATS[e.pat] || PATS.ANSI31; const base = (P.fam ? Math.min(...P.fam.map(f => f.sp)) : P.brick ? P.brick.h : (P.dots || P.conc || P.earth)) * (e.psc || 1);
    if(base * view.scale < 2.2){ ctx.fillStyle = hexA(col, 0.35); ctx.fill('evenodd'); ctx.restore(); return; }   // quá dày -> tô mờ
    const r = patternSegs(e, bb, 3000);
    if(!r){ ctx.fillStyle = hexA(col, 0.35); ctx.fill('evenodd'); ctx.restore(); return; }
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath();
    for(const s of r.segs){ const a = toScreen(s[0], s[1]), b = toScreen(s[2], s[3]); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    if(r.dots.length){ ctx.fillStyle = col; for(const d of r.dots){ const p = toScreen(d[0], d[1]); ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6); } }
    ctx.restore();
  };
  // ---- dò biên kín chứa điểm P (đồ thị phẳng từ các nét đang hiển thị) ----
  // tìm từ vùng nhỏ quanh điểm rồi nới dần (nhanh với bản vẽ lớn); kết quả hợp lệ khi biên nằm trọn trong vùng
  function findBoundary(P){
    const vb = viewWorldAABB(); const span = Math.max(vb.maxX - vb.minX, vb.maxY - vb.minY);
    let last = null;
    for(const f of [1 / 14, 1 / 5, 1 / 2]){
      const h = span * f; const box = { minX: Math.max(vb.minX, P.x - h), minY: Math.max(vb.minY, P.y - h), maxX: Math.min(vb.maxX, P.x + h), maxY: Math.min(vb.maxY, P.y + h) };
      const r = findBoundaryIn(P, box); last = r;
      if(r.loops){ const lp = r.loops[0]; const m = span * 1e-9; const inside = lp.every(q => q.x > box.minX + m && q.x < box.maxX - m && q.y > box.minY + m && q.y < box.maxY - m); if(inside || (box.minX <= vb.minX && box.maxX >= vb.maxX && box.minY <= vb.minY && box.maxY >= vb.maxY)) return r; }
    }
    // vùng kín lớn hơn màn hình: mở rộng dần phạm vi dò (không cần phóng ra trước)
    const inBox = (r, box) => { if(!r || !r.loops) return false; const m = span * 1e-9; return r.loops[0].every(q => q.x > box.minX + m && q.x < box.maxX - m && q.y > box.minY + m && q.y < box.maxY - m); };
    const r0 = findBoundaryIn(P, vb); if(inBox(r0, vb)) return r0;
    const ex = bboxOf(modelEntities.length < 300000 ? modelEntities : []) || null;
    if(ex){ let prev = null; for(const k of [3, 10, 40]){ const h = span * k / 2; const box = { minX: Math.max(ex.x0 - span * 0.01, P.x - h), minY: Math.max(ex.y0 - span * 0.01, P.y - h), maxX: Math.min(ex.x1 + span * 0.01, P.x + h), maxY: Math.min(ex.y1 + span * 0.01, P.y + h) };
      if(prev && box.minX === prev.minX && box.maxX === prev.maxX && box.minY === prev.minY && box.maxY === prev.maxY) break; prev = box;
      const r = findBoundaryIn(P, box); if(r.loops && (inBox(r, box) || (box.minX <= ex.x0 && box.maxX >= ex.x1 && box.minY <= ex.y0 && box.maxY >= ex.y1))) return r; if(r.err && /Quá nhiều/.test(r.err)) break; } }
    return r0;
  }
  A.findBoundary = findBoundary;
  A.findBoundaryIn = (P, vb, list) => findBoundaryIn(P, vb, list);
  function findBoundaryIn(P, vb, list){
    const span = Math.max(vb.maxX - vb.minX, vb.maxY - vb.minY);
    const ents = (list || A.queryBox(vb.minX, vb.minY, vb.maxX, vb.maxY, 80000)).filter(e => /^(LINE|ARC|CIRCLE|POLYLINE|ELLIPSE|SOLID)$/.test(e.type));
    const S = [];
    for(const e of ents){ const c = G.curveOf(e); if(!c) continue; for(const p of c.pieces){ if(p.t === 's'){ if(Math.hypot(p.bx - p.ax, p.by - p.ay) > 1e-12) S.push([p.ax, p.ay, p.bx, p.by]); } else { const n = Math.max(6, Math.ceil(p.sw / (4 * D2R))); for(let i = 0; i < n; i++){ const a0 = p.a0 + p.sw * i / n, a1 = p.a0 + p.sw * (i + 1) / n; S.push([p.cx + p.r * Math.cos(a0), p.cy + p.r * Math.sin(a0), p.cx + p.r * Math.cos(a1), p.cy + p.r * Math.sin(a1)]); } } } }
    if(!S.length) return { err: 'Không có nét nào trong khung nhìn.' };
    if(S.length > 120000) return { err: 'Quá nhiều nét trong khung nhìn — phóng gần vùng cần tô hơn.' };
    const n = S.length, cuts = S.map(() => [0, 1]);
    const cells = Math.max(8, Math.min(700, Math.round(Math.sqrt(n) * 1.3))); const cs = span / cells || 1;
    const grid = new Map(); const x0 = vb.minX - span, y0 = vb.minY - span;
    const key = (i, j) => i * 100003 + j;
    for(let s = 0; s < n; s++){ const g = S[s]; const L = Math.hypot(g[2] - g[0], g[3] - g[1]); const steps = Math.min(4000, Math.max(1, Math.ceil(L / (cs * 0.5)))); let last = null;
      for(let k = 0; k <= steps; k++){ const t = k / steps; const i = Math.floor((g[0] + (g[2] - g[0]) * t - x0) / cs), j = Math.floor((g[1] + (g[3] - g[1]) * t - y0) / cs); const kk = key(i, j); if(kk === last) continue; last = kk; let a = grid.get(kk); if(!a){ a = []; grid.set(kk, a); } if(a[a.length - 1] !== s) a.push(s); } }
    const tested = new Set(); const tolP = span * 1e-9;
    for(const arr of grid.values()){
      if(arr.length < 2) continue;
      for(let a = 0; a < arr.length; a++) for(let b = a + 1; b < arr.length; b++){
        const i = arr[a], j = arr[b]; const pk = i < j ? i * n + j : j * n + i; if(tested.has(pk)) continue; tested.add(pk);
        const A1 = S[i], B1 = S[j];
        const dx1 = A1[2] - A1[0], dy1 = A1[3] - A1[1], dx2 = B1[2] - B1[0], dy2 = B1[3] - B1[1];
        const den = dx1 * dy2 - dy1 * dx2; const L1 = Math.hypot(dx1, dy1), L2 = Math.hypot(dx2, dy2);
        if(Math.abs(den) < 1e-12 * L1 * L2){   // song song: nếu thẳng hàng thì chia tại đầu mút của nhau
          const off = Math.abs((B1[0] - A1[0]) * dy1 - (B1[1] - A1[1]) * dx1) / (L1 || 1); if(off > tolP * 10) continue;
          for(const [P0, Q] of [[A1, B1], [B1, A1]]){ const dx = P0[2] - P0[0], dy = P0[3] - P0[1], LL = dx * dx + dy * dy; const ci = P0 === A1 ? i : j; for(const [qx, qy] of [[Q[0], Q[1]], [Q[2], Q[3]]]){ const t = ((qx - P0[0]) * dx + (qy - P0[1]) * dy) / LL; if(t > 1e-9 && t < 1 - 1e-9) cuts[ci].push(t); } }
          continue;
        }
        const t = ((B1[0] - A1[0]) * dy2 - (B1[1] - A1[1]) * dx2) / den, u = ((B1[0] - A1[0]) * dy1 - (B1[1] - A1[1]) * dx1) / den;
        const et = 1e-9; if(t < -et || t > 1 + et || u < -et || u > 1 + et) continue;
        cuts[i].push(Math.min(1, Math.max(0, t))); cuts[j].push(Math.min(1, Math.max(0, u)));
      }
    }
    // dựng đồ thị
    const eps = span * 1e-8; const nodes = new Map(), pos = [], adj = [];
    const nid = (x, y) => { const k = Math.round(x / eps) + ',' + Math.round(y / eps); let id = nodes.get(k); if(id == null){ id = pos.length; nodes.set(k, id); pos.push({ x, y }); adj.push([]); } return id; };
    const edgeSet = new Set(); const edges = [];
    for(let s = 0; s < n; s++){ const g = S[s]; const ts = cuts[s].sort((a, b) => a - b); let prev = null;
      for(const t of ts){ const x = g[0] + (g[2] - g[0]) * t, y = g[1] + (g[3] - g[1]) * t; const id = nid(x, y); if(prev != null && prev !== id){ const k = prev < id ? prev + '_' + id : id + '_' + prev; if(!edgeSet.has(k)){ edgeSet.add(k); edges.push([prev, id]); adj[prev].push(id); adj[id].push(prev); } } prev = id; } }
    const angOf = (u, v) => Math.atan2(pos[v].y - pos[u].y, pos[v].x - pos[u].x);
    // tia từ P sang phải
    const hits = [];
    for(const [u, v] of edges){ const a = pos[u], b = pos[v]; if((a.y > P.y) === (b.y > P.y)) continue; const x = a.x + (P.y - a.y) * (b.x - a.x) / (b.y - a.y); if(x > P.x) hits.push({ x, u, v }); }
    hits.sort((p, q) => p.x - q.x);
    const walk = (s0, s1) => {
      const poly = [pos[s0]]; let a = s0, b = s1; const maxSteps = edges.length * 2 + 10;
      for(let k = 0; k < maxSteps; k++){
        poly.push(pos[b]);
        const din = angOf(a, b); let best = -1, bt = -Infinity;
        for(const c of adj[b]){ let tA; if(c === a) tA = -Math.PI - 1; else { tA = angOf(b, c) - din; while(tA <= -Math.PI) tA += TAU; while(tA > Math.PI) tA -= TAU; } if(tA > bt){ bt = tA; best = c; } }
        if(best < 0) return null;
        a = b; b = best;
        if(a === s0 && b === s1){ poly.pop(); return poly; }
      }
      return null;
    };
    for(const h of hits.slice(0, 60)){
      const a = pos[h.u], b = pos[h.v]; const cr = (b.x - a.x) * (P.y - a.y) - (b.y - a.y) * (P.x - a.x);
      const [s0, s1] = cr > 0 ? [h.u, h.v] : [h.v, h.u];
      const poly = walk(s0, s1); if(!poly || poly.length < 3) continue;
      const ar = G.area(poly); if(ar <= 0 || !G.ptInPoly(P, poly)) continue;
      // đảo (vùng kín nằm trong): đường tròn / đa tuyến kín / elip kín không chứa P
      const bbO = poly.reduce((m, q) => ({ x0: Math.min(m.x0, q.x), y0: Math.min(m.y0, q.y), x1: Math.max(m.x1, q.x), y1: Math.max(m.y1, q.y) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
      const holes = [];
      for(const e of ents){ const c = G.curveOf(e); if(!c || !c.closed) continue; const bb = entBBox(e); if(!bb || bb.x0 < bbO.x0 || bb.x1 > bbO.x1 || bb.y0 < bbO.y0 || bb.y1 > bbO.y1) continue;
        const loop = c.pieces[0].t === 'a' ? (() => { const p = c.pieces[0], k = 72, o = []; for(let i = 0; i < k; i++){ const t = p.a0 + p.sw * i / k; o.push({ x: p.cx + p.r * Math.cos(t), y: p.cy + p.r * Math.sin(t) }); } return o; })() : c.pieces.map(p => ({ x: p.ax, y: p.ay }));
        if(loop.length < 3 || G.ptInPoly(P, loop)) continue; if(!G.ptInPoly(loop[0], poly)) continue;
        if(Math.abs(Math.abs(G.area(loop)) - ar) < ar * 1e-6) continue;   // chính là biên ngoài
        holes.push(loop); }
      return { loops: [poly].concat(holes) };
    }
    return { err: 'Không tìm thấy vùng kín bao quanh điểm này (biên hở hoặc nằm ngoài khung nhìn).' };
  }
  A.findBoundary = findBoundary;
  function niceScale(loops){
    if(HS.scale > 0) return HS.scale;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const lp of loops) for(const p of lp){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const want = Math.max(Math.hypot(x1 - x0, y1 - y0) / 45, 1e-9); const raw = want / 3.175, pw = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map(m => m * pw).find(v => v >= raw) || 10 * pw;
  }
  function makeHatch(loops){
    const sc = niceScale(loops); if(!(HS.scale > 0)){ HS.scale = sc; hsSave(); log('Tỉ lệ mẫu tự chọn = ' + sc + ' (đổi bằng tuỳ chọn Tỉ lệ)'); }
    const e = A.newProps({ type: 'HATCH', loops: loops.map(l => l.map(p => ({ x: p.x, y: p.y }))), solid: HS.pat === 'SOLID', pat: HS.pat, psc: HS.scale, pang: HS.ang || 0 });
    if(HS.col){ e.col = HS.col; delete e.bl; }
    return e;
  }
  function hatchClosedLoop(e){
    const c = G.curveOf(e); if(!c) return null;
    if(c.pieces[0] && c.pieces[0].t === 'a'){ const p = c.pieces[0], k = 96, o = []; for(let i = 0; i < k; i++){ const t = p.a0 + p.sw * i / k; o.push({ x: p.cx + p.r * Math.cos(t), y: p.cy + p.r * Math.sin(t) }); } return o; }
    const pts = c.pieces.map(p => ({ x: p.ax, y: p.ay })); return pts.length >= 3 ? pts : null;
  }
  cmd(['HATCH', 'H', 'BH', 'BHATCH'], 'Tô vật liệu: bấm điểm trong vùng kín (S = chọn đối tượng, T = cài đặt)', async () => {
    log('Mẫu: ' + (PATS[HS.pat] ? PATS[HS.pat].name : HS.pat) + ' · tỉ lệ ' + (HS.scale || 'tự động') + ' · góc ' + (HS.ang || 0) + '°');
    for(;;){
      const r = await A.getPoint('Bấm điểm bên trong vùng cần tô', { noSnap: true, rubber: false, kw: [{ k: 'S', t: 'Chọn đối tượng' }, { k: 'T', t: 'Cài đặt' }, { k: 'P', t: 'Mẫu' }, { k: 'SC', t: 'Tỉ lệ' }, { k: 'A', t: 'Góc' }, { k: 'U', t: 'Hoàn tác' }] });
      if(r.none) return;
      if(r.kw === 'T' || r.kw === 'P'){ await openHatchDialog(); continue; }
      if(r.kw === 'SC'){ const v = await A.getNum('Tỉ lệ mẫu', { def: HS.scale || undefined }); if(v.num > 0){ HS.scale = v.num; hsSave(); } continue; }
      if(r.kw === 'A'){ const v = await A.getNum('Góc mẫu (độ)', { def: HS.ang || 0 }); if(v.num != null){ HS.ang = v.num; hsSave(); } continue; }
      if(r.kw === 'U'){ undoEdit(); continue; }
      if(r.kw === 'S'){
        const s = await A.getSel('Chọn đường kín (đa tuyến kín, tròn, elip)', { pre: false, filter: e => { const c = G.curveOf(e); return !!(c && c.closed && e.type !== 'HATCH'); } });
        const loops = (s.sel || []).map(hatchClosedLoop).filter(Boolean); if(!loops.length){ log('Không có đường kín.'); continue; }
        A.commit({ add: [makeHatch(loops)] }, 'Đã tô ' + loops.length + ' vùng'); continue;
      }
      if(!r.pt) return;
      log('Đang dò biên…');
      const res = findBoundary(r.pt);
      if(res.err){ log(res.err); say(res.err); continue; }
      A.commit({ add: [makeHatch(res.loops)] }, 'Đã tô vùng (' + res.loops[0].length + ' đỉnh' + (res.loops.length > 1 ? ', ' + (res.loops.length - 1) + ' đảo' : '') + ')');
    }
  });
  function openHatchDialog(){
    return new Promise(res => {
      const keys = Object.keys(PATS);
      A.dialog({ title: 'Cài đặt Hatch', wide: true, html:
        '<div class="dvd-pats">' + keys.map(k => '<button type="button" class="dvd-pat' + (k === HS.pat ? ' on' : '') + '" data-p="' + k + '"><canvas width="64" height="44"></canvas><span>' + escapeHtml(PATS[k].name) + '</span></button>').join('') + '</div>' +
        '<div class="dvd-form">' + row('Tỉ lệ mẫu (0 = tự động)', '<input id="hsScale" type="number" step="any" value="' + (HS.scale || 0) + '">') + row('Góc (độ)', '<input id="hsAng" type="number" step="any" value="' + (HS.ang || 0) + '">') +
        row('Màu', sel('hsCol', [['', 'ByLayer (theo lớp)'], ['#ff3b30', 'Đỏ'], ['#ffd400', 'Vàng'], ['#22c55e', 'Xanh lá'], ['#33d6ff', 'Lục lam'], ['#0a84ff', 'Xanh dương'], ['#bf5af2', 'Tím'], ['#ffffff', 'Trắng'], ['#9aa0a6', 'Xám']], HS.col || '')) + '</div>',
        onOpen: root => {
          root.querySelectorAll('.dvd-pat').forEach(b => { const c = b.querySelector('canvas'), g = c.getContext('2d'); g.fillStyle = '#1b2230'; g.fillRect(0, 0, 64, 44); const P = PATS[b.dataset.p];
            g.save(); g.beginPath(); g.rect(2, 2, 60, 40); g.clip(); g.strokeStyle = '#cfd8e6'; g.fillStyle = '#cfd8e6'; g.lineWidth = 1;
            const e = { pat: b.dataset.p, psc: 1, pang: 0 }; if(P.solid){ g.fillRect(2, 2, 60, 40); } else { const rr = patternSegs(e, { x0: 0, y0: 0, x1: 22, y1: 15 }, 400); if(rr){ g.beginPath(); for(const s of rr.segs){ g.moveTo(s[0] * 2.8, 44 - s[1] * 2.8); g.lineTo(s[2] * 2.8, 44 - s[3] * 2.8); } g.stroke(); for(const d of rr.dots) g.fillRect(d[0] * 2.8 - .7, 44 - d[1] * 2.8 - .7, 1.4, 1.4); } }
            g.restore();
            b.addEventListener('click', () => { root.querySelectorAll('.dvd-pat').forEach(x => x.classList.toggle('on', x === b)); }); });
        },
        ok: root => { const on = root.querySelector('.dvd-pat.on'); if(on) HS.pat = on.dataset.p; const sc = parseFloat(root.querySelector('#hsScale').value); HS.scale = sc > 0 ? sc : 0; const an = parseFloat(root.querySelector('#hsAng').value); HS.ang = isFinite(an) ? an : 0; HS.col = root.querySelector('#hsCol').value; hsSave(); res(true); },
        cancel: () => res(false) });
    });
  }
  A.openHatchDialog = openHatchDialog;
  DVDCmd.register(['HATCHSET', 'HS'], 'Cài đặt mẫu hatch', () => openHatchDialog());

  /* ===================================================================
     KHỐI / NHÓM / CLIPBOARD
     =================================================================== */
  const LIBK = 'dvd:blocklib';
  const lib = () => { try{ return JSON.parse(localStorage.getItem(LIBK) || '{}'); }catch(_){ return {}; } };
  const saveLib = o => { try{ localStorage.setItem(LIBK, JSON.stringify(o)); return true; }catch(_){ say('Bộ nhớ đầy — không lưu được khối.'); return false; } };
  function fileBlockNames(){ const b = window._dvdBlocks || {}; return Object.keys(b).filter(n => n && !n.startsWith('*') && !/^_/.test(n)).sort((a, b2) => a.localeCompare(b2, undefined, { numeric: true })); }
  const blkCache = new Map();
  A.blockLib = lib; A.saveBlockLib = o => { const r = saveLib(o); blkCache.clear(); return r; }; A.fileBlockNames = () => fileBlockNames(); A.chooseBlock = () => chooseBlock(); A.blockPrims = (n, s) => blockPrims(n, s);
  function blockPrims(name, src){
    const ck = src + '|' + name; if(blkCache.has(ck)) return blkCache.get(ck);
    let out = null;
    if(src === 'file'){ const defs = window._dvdBlocks || {}; const d = defs[name]; if(d){ const prims = resolveBlocks(d.entities, defs); if(d.attdefs) for(const a of d.attdefs){ const q = deep(a); if(!q.col) try{ q.col = resolveColor(q.aci, q.layer); }catch(_){} prims.push(q); } out = { base: d.base || { x: 0, y: 0 }, prims }; } }
    else { const L = lib()[name]; if(L) out = { base: L.base, prims: L.ents }; }
    if(out) blkCache.set(ck, out);
    return out;
  }
  function instBlock(name, src, ins, sc, rotDeg){
    const B = blockPrims(name, src); if(!B) return [];
    const gid = A.newGroupId('B'); const lay = A.LS.cur || '0'; const l0 = A.layerHex('0');
    const r = (rotDeg || 0) * D2R, co = Math.cos(r) * sc, si = Math.sin(r) * sc; const bm = { name, src, lay, a: co, b: si, c: -si, d: co, e: ins.x - (co * B.base.x - si * B.base.y), f: ins.y - (si * B.base.x + co * B.base.y) };
    const out = [];
    for(const p of B.prims){ if(out.length > 50000) break; const w = deep(p); delete w.userAdded; delete w.grp; delete w.bip; delete w.dimd; delete w.bm; delete w.l0; delete w.tbld;
      translateEnt(w, -B.base.x, -B.base.y); if(sc !== 1) scaleEnt(w, sc, { x: 0, y: 0 }); if(rotDeg) rotateEnt(w, rotDeg, { x: 0, y: 0 }); translateEnt(w, ins.x, ins.y);
      if(!w.layer || w.layer === '0'){ w.layer = lay; w.l0 = 1; if(!w.col || String(w.col).toLowerCase() === String(l0).toLowerCase() || w.bl){ w.col = A.layerHex(lay); w.bl = 1; } }
      if(w.attdef){ w.att = w.attdef.tag; w.attp = w.attdef.prompt; w.text = w.attdef.def || ''; delete w.attdef; }   // định nghĩa thuộc tính -> thuộc tính có giá trị
      w.grp = gid; w.blk = name; w.bip = { x: ins.x, y: ins.y }; w.bm = bm; out.push(w); }
    return out;
  }
  A.instBlock = instBlock;
  function blockThumb(cnv, name, src){
    const B = blockPrims(name, src); const g = cnv.getContext('2d'); g.fillStyle = '#1b2230'; g.fillRect(0, 0, cnv.width, cnv.height); if(!B || !B.prims.length) return;
    const bb = bboxOf(B.prims); if(!bb) return; const s = Math.min((cnv.width - 8) / Math.max(bb.x1 - bb.x0, 1e-9), (cnv.height - 8) / Math.max(bb.y1 - bb.y0, 1e-9));
    const sv = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot }; const svW = _RTW, svH = _RTH;
    view.scale = s; view.rot = 0; view.offsetX = cnv.width / 2 - (bb.x0 + bb.x1) / 2 * s; view.offsetY = cnv.height / 2 + (bb.y0 + bb.y1) / 2 * s; _RTW = cnv.width; _RTH = cnv.height;
    try{ let n = 0; for(const e of B.prims){ if(n++ > 1500) break; A.drawEntOn(g, e, e.col || '#cfd8e6', 1, []); } }
    finally { Object.assign(view, sv); _RTW = svW; _RTH = svH; }
  }
  cmd(['INSERT', 'I', 'DDINSERT'], 'Chèn khối (của bản vẽ hoặc thư viện của tôi)', async () => {
    const pick = await chooseBlock(); if(!pick) return;
    let sc = MEM.isc || 1, rot = MEM.irot || 0;
    for(;;){
      const r = await A.getPoint('Chỉ định điểm chèn "' + pick.name + '"', { kw: [{ k: 'S', t: 'Tỉ lệ (' + fmt(sc) + ')' }, { k: 'R', t: 'Xoay (' + rot + '°)' }], rubber: false, preview: (g, p) => g.ents(instBlock(pick.name, pick.src, p, sc, rot).slice(0, 1500), '#cfe3ff') });
      if(r.none) return;
      if(r.kw === 'S'){ const v = await A.getNum('Hệ số tỉ lệ', { def: sc }); if(v.num > 0){ sc = v.num; MEM.isc = sc; remember(); } continue; }
      if(r.kw === 'R'){ const v = await A.getNum('Góc xoay (độ)', { def: rot }); if(v.num != null){ rot = v.num; MEM.irot = rot; remember(); } continue; }
      if(!r.pt) return;
      const ents = instBlock(pick.name, pick.src, r.pt, sc, rot); if(!ents.length){ log('Khối rỗng.'); return; }
      A.commit({ add: ents }, 'Đã chèn khối ' + pick.name); return;
    }
  });
  function chooseBlock(){
    return new Promise(res => {
      const fb = fileBlockNames(), lb = Object.keys(lib()).sort();
      if(!fb.length && !lb.length){ say('Chưa có khối nào. Dùng lệnh BLOCK (B) để tạo khối vào thư viện của bạn.'); res(null); return; }
      let chosen = null;
      const item = (n, src) => '<button type="button" class="dvd-blk" data-n="' + escapeHtml(n) + '" data-s="' + src + '"><canvas width="96" height="72"></canvas><span>' + escapeHtml(n) + '</span></button>';
      A.dialog({ title: 'Chèn khối', wide: true, html:
        '<input id="blkFind" placeholder="Tìm tên khối…" style="width:100%;margin-bottom:8px">' +
        (lb.length ? '<div class="dvd-sub">Thư viện của tôi (dùng được cho mọi bản vẽ)</div><div class="dvd-blks">' + lb.map(n => item(n, 'lib')).join('') + '</div>' : '') +
        (fb.length ? '<div class="dvd-sub">Khối trong bản vẽ này</div><div class="dvd-blks">' + fb.slice(0, 400).map(n => item(n, 'file')).join('') + '</div>' : ''),
        okText: 'Chèn',
        onOpen: root => {
          const btns = [...root.querySelectorAll('.dvd-blk')];
          const io = new IntersectionObserver(es => { for(const en of es){ if(en.isIntersecting){ const b = en.target; io.unobserve(b); try{ blockThumb(b.querySelector('canvas'), b.dataset.n, b.dataset.s); }catch(_){} } } }, { root: root.querySelector('.modal') || null });
          btns.forEach(b => { io.observe(b); b.addEventListener('click', () => { btns.forEach(x => x.classList.toggle('on', x === b)); chosen = { name: b.dataset.n, src: b.dataset.s }; }); b.addEventListener('dblclick', () => { chosen = { name: b.dataset.n, src: b.dataset.s }; root.querySelector('.dvd-ok').click(); }); });
          const f = root.querySelector('#blkFind'); f.addEventListener('input', () => { const q = f.value.trim().toLowerCase(); btns.forEach(b => { b.style.display = !q || b.dataset.n.toLowerCase().includes(q) ? '' : 'none'; }); });
          setTimeout(() => f.focus(), 50);
        },
        ok: () => { if(!chosen){ say('Chọn 1 khối.'); return false; } res(chosen); },
        cancel: () => res(null) });
    });
  }
  cmd(['BLOCK', 'B', 'BMAKE'], 'Tạo khối từ đối tượng (lưu vào thư viện của tôi)', async () => {
    const s = await A.getSel('Chọn đối tượng tạo khối'); const sel = s.sel || []; if(!sel.length) return;
    if(sel.length > 6000){ say('Khối quá lớn (>6000 nét).'); return; }
    const b = await A.getPoint('Chỉ định điểm gốc của khối'); if(!b.pt) return;
    const name = await askText({ title: 'Tên khối', value: '' }); if(name == null) return; const nm = name.trim().replace(/[<>\/\\":;?*|=`]/g, '_'); if(!nm){ say('Cần đặt tên.'); return; }
    const L = lib(); if(L[nm] && !confirm('Đã có khối "' + nm + '". Ghi đè?')) return;
    L[nm] = { base: b.pt, ents: sel.map(e => { const o = serializeEnt(e); delete o.grp; delete o.blk; return o; }), t: Date.now() };
    if(!saveLib(L)) return; blkCache.delete('lib|' + nm);
    const gid = A.newGroupId('B');
    const bm = { name: nm, src: 'lib', lay: A.LS.cur || '0', a: 1, b: 0, c: 0, d: 1, e: b.pt.x, f: b.pt.y };
    A.commit({ rep: transformAll(sel, w => { w.grp = gid; w.blk = nm; w.bm = bm; w.bip = { x: b.pt.x, y: b.pt.y }; if(w.attdef){ w.att = w.attdef.tag; w.attp = w.attdef.prompt; w.text = w.attdef.def || ''; delete w.attdef; } }) }, 'Đã tạo khối "' + nm + '" (' + sel.length + ' nét) — dùng INSERT để chèn ở bản vẽ khác');
  });
  cmd(['GROUP', 'G'], 'Gộp nhóm (chọn 1 lần cả nhóm)', async () => {
    const s = await A.getSel('Chọn đối tượng cần gộp nhóm'); const sel = s.sel || []; if(sel.length < 2){ log('Cần ≥ 2 đối tượng.'); return; }
    const gid = A.newGroupId('G'); A.commit({ rep: transformAll(sel, w => { w.grp = gid; w.blk = w.blk && !String(w.blk).startsWith('*') ? w.blk : '*NHÓM'; }) }, 'Đã gộp nhóm ' + sel.length + ' đối tượng');
  });
  cmd(['UNGROUP', 'UG'], 'Bỏ nhóm', async () => {
    const s = await A.getSel('Chọn nhóm'); const sel = (s.sel || []).filter(e => e.grp); if(!sel.length){ log('Không có nhóm nào.'); return; }
    A.commit({ rep: transformAll(sel, w => { delete w.grp; delete w.blk; delete w.dimd; delete w.bip; delete w.bm; delete w.l0; delete w.tbld; }) }, 'Đã bỏ nhóm');
  });
  const CLIP = 'dvd:clip';
  function putClip(sel, base){ try{ localStorage.setItem(CLIP, JSON.stringify({ base, ents: sel.map(e => serializeEnt(e)), t: Date.now(), src: currentName })); log('Đã sao chép ' + sel.length + ' đối tượng vào bộ nhớ tạm'); return true; }catch(_){ say('Bộ nhớ tạm đầy — chọn ít đối tượng hơn.'); return false; } }
  const getClip = () => { try{ return JSON.parse(localStorage.getItem(CLIP) || 'null'); }catch(_){ return null; } };
  A.getClip = getClip; A.remapGroups = remapGroups;
  cmd(['COPYCLIP'], 'Sao chép vào bộ nhớ tạm (Ctrl+C)', async () => { const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return; const bb = bboxOf(sel); putClip(sel, { x: bb.x0, y: bb.y0 }); });
  cmd(['CUTCLIP'], 'Cắt vào bộ nhớ tạm (Ctrl+X)', async () => { const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return; const bb = bboxOf(sel); if(putClip(sel, { x: bb.x0, y: bb.y0 })) A.commit({ del: sel }); clearSelSafe(); });
  cmd(['COPYBASE'], 'Sao chép kèm điểm gốc (Ctrl+Shift+C)', async () => { const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return; const b = await A.getPoint('Chỉ định điểm gốc'); if(!b.pt) return; putClip(sel, b.pt); });
  cmd(['PASTECLIP'], 'Dán từ bộ nhớ tạm (Ctrl+V)', async () => {
    const c = getClip(); if(!c || !c.ents || !c.ents.length){ log('Bộ nhớ tạm trống.'); return; }
    const ents = c.ents; const r = await A.getPoint('Chỉ định điểm chèn', { rubber: false, preview: (g, p) => g.shift(ents, p.x - c.base.x, p.y - c.base.y, '#cfe3ff') }); if(!r.pt) return;
    const add = remapGroups(ents.map(e => { const w = deep(e); translateEnt(w, r.pt.x - c.base.x, r.pt.y - c.base.y); return w; }));
    A.commit({ add }, 'Đã dán ' + add.length + ' đối tượng');
  });
  cmd(['PASTEORIG'], 'Dán đúng toạ độ gốc (Ctrl+Shift+V)', async () => { const c = getClip(); if(!c || !c.ents || !c.ents.length){ log('Bộ nhớ tạm trống.'); return; } A.commit({ add: remapGroups(c.ents.map(deep)) }, 'Đã dán ' + c.ents.length + ' đối tượng tại toạ độ gốc'); });

  /* ===================================================================
     LỚP
     =================================================================== */
  cmd(['LAYMCUR'], 'Đặt lớp của đối tượng làm lớp hiện hành', async () => { const r = await A.getEnt('Chọn đối tượng'); if(!r.ent) return; A.setCurLayer(r.ent.layer || '0'); log('Lớp hiện hành: ' + (r.ent.layer || '0')); });
  let isoPrev = null;
  cmd(['LAYISO'], 'Cô lập lớp của các đối tượng chọn', async () => {
    const s = await A.getSel('Chọn đối tượng thuộc lớp cần cô lập'); const sel = s.sel || []; if(!sel.length) return;
    A.lsSync(); isoPrev = { off: [...A.LS.off], cur: A.LS.cur }; const keep = new Set(sel.map(e => e.layer || '0'));
    for(const n of A.layerNames()){ if(!keep.has(n)) A.LS.off.add(n); else A.LS.off.delete(n); }
    if(!keep.has(A.LS.cur)) A.LS.cur = [...keep][0];
    A.setLayerFlag([...keep][0], 'off', false); log('Đã cô lập ' + keep.size + ' lớp');
  });
  cmd(['LAYUNISO'], 'Bỏ cô lập lớp', async () => { if(!isoPrev){ log('Chưa cô lập lớp nào.'); return; } A.lsSync(); A.LS.off = new Set(isoPrev.off); A.LS.cur = isoPrev.cur; isoPrev = null; A.setLayerFlag('0', 'off', A.LS.off.has('0')); log('Đã khôi phục trạng thái lớp'); });
  const layPick = (flag, on, prompt) => async () => {
    for(;;){ const r = await A.getEnt(prompt, { allowLocked: true }); if(!r.ent) return; const n = r.ent.layer || '0';
      if(flag === 'frozen' && n === A.LS.cur){ log('Không đóng băng lớp hiện hành.'); continue; }
      A.setLayerFlag(n, flag, on); log('Lớp "' + n + '": ' + ({ off: on ? 'tắt' : 'bật', frozen: on ? 'đóng băng' : 'rã băng', locked: on ? 'khoá' : 'mở khoá' })[flag]); }
  };
  cmd(['LAYOFF'], 'Tắt lớp của đối tượng bấm chọn', layPick('off', true, 'Chọn đối tượng thuộc lớp cần tắt'));
  cmd(['LAYFRZ'], 'Đóng băng lớp của đối tượng bấm chọn', layPick('frozen', true, 'Chọn đối tượng thuộc lớp cần đóng băng'));
  cmd(['LAYLCK'], 'Khoá lớp của đối tượng bấm chọn', layPick('locked', true, 'Chọn đối tượng thuộc lớp cần khoá'));
  cmd(['LAYULK'], 'Mở khoá lớp của đối tượng bấm chọn', layPick('locked', false, 'Chọn đối tượng thuộc lớp cần mở khoá'));
  plain(['LAYON'], 'Bật tất cả lớp', () => { A.lsSync(); A.LS.off.clear(); A.setLayerFlag('0', 'off', false); log('Đã bật tất cả lớp'); });
  plain(['LAYTHW'], 'Rã băng tất cả lớp', () => { A.lsSync(); A.LS.frozen.clear(); A.setLayerFlag('0', 'frozen', false); log('Đã rã băng tất cả lớp'); });

  /* ===================================================================
     BẢN VẼ MỚI · ZOOM
     =================================================================== */
  function newDrawing(){
    let n = 1; try{ n = (parseInt(localStorage.getItem('dvd:newN') || '0') || 0) + 1; localStorage.setItem('dvd:newN', String(n)); }catch(_){}
    const name = 'Drawing' + n + '.dxf';
    const text = ['999', 'DVDCAD-NEW ' + Date.now(), '0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '1', '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS', '0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', '0', 'ENDSEC', '0', 'EOF', ''].join('\r\n');
    try{ loadDXF(text, name); }catch(err){ console.error(err); }
    try{ recordRecent(drawingKey(text, name), name, 'dxf', text); }catch(_){}
    log('Bản vẽ mới ' + name + ' (đơn vị mm). Dùng Ctrl+S để lưu ra DXF.');
  }
  A.newDrawing = newDrawing;
  plain(['NEW', 'QNEW'], 'Bản vẽ mới (trống)', newDrawing);
  const viewStack = [];
  A.pushView = () => { viewStack.push({ scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot }); if(viewStack.length > 30) viewStack.shift(); };
  A.prevView = () => { const v = viewStack.pop(); if(!v){ log('Không còn khung nhìn trước.'); return; } Object.assign(view, v); try{ updateCompass(); }catch(_){} draw(); };
  cmd(['ZOOM', 'Z'], 'Phóng: khung (bấm 2 góc), E = vừa bản vẽ, P = trước, số = hệ số', async () => {
    const r = await A.getPoint('Chỉ định góc khung, nhập hệ số, hoặc', { noSnap: true, num: true, kw: [{ k: 'E', t: 'Vừa bản vẽ' }, { k: 'A', t: 'Tất cả' }, { k: 'P', t: 'Trước' }, { k: 'W', t: 'Khung' }, { k: 'O', t: 'Đối tượng' }] });
    if(r.none) return;
    if(r.kw === 'E' || r.kw === 'A'){ A.pushView(); fitView(); return; }
    if(r.kw === 'P'){ A.prevView(); return; }
    if(r.kw === 'O'){ const s = await A.getSel('Chọn đối tượng'); const bb = bboxOf(s.sel || []); if(bb){ A.pushView(); zoomToWorldRect(bb.x0, bb.y0, bb.x1, bb.y1); } return; }
    if(r.num != null){ if(r.num > 0){ A.pushView(); applyZoom(r.num, W() / 2, H() / 2); draw(); } return; }
    let a = r.pt; if(r.kw === 'W'){ const q = await A.getPoint('Chỉ định góc thứ nhất', { noSnap: true }); if(!q.pt) return; a = q.pt; }
    const b = await A.getPoint('Chỉ định góc đối diện', { noSnap: true, base: a, rubber: false, preview: (g, p) => g.poly(rectPts(a, p), true, '#5aa9ff') }); if(!b.pt) return;
    A.pushView(); zoomToWorldRect(a.x, a.y, b.pt.x, b.pt.y);
  });

  /* ===================================================================
     XUẤT DXF (R12) ĐẦY ĐỦ: bảng lớp có màu/trạng thái, màu ByLayer, chữ Unicode, hatch (nổ thành nét/SOLID)
     =================================================================== */
  function aciNear(hex){ const c = _hexRGB(hex); let best = 7, bd = 1e18; for(let i = 1; i <= 255; i++){ const v = ACI_RGB[i]; const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255; const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2; if(d < bd){ bd = d; best = i; if(!d) break; } } return best; }
  A.aciNear = aciNear;
  function dxfStr(s){ return String(s).replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, ch => { const cp = ch.codePointAt(0); return cp > 0xffff ? '?' : '\\U+' + cp.toString(16).toUpperCase().padStart(4, '0'); }); }
  window.entitiesToDXF = function(ents){
    if(A.dxfR2000 && A.dxfVer !== 'R12') return A.dxfR2000(ents);   // mặc định: DXF 2018 (dvd-acad-dxf.js)
    ents = ents.filter(e => e && !e.xr);   // tham chiếu ngoài (XREF) không ghi vào file
    const L = []; const P = (c, v) => { L.push(String(c)); let s; if(typeof v === 'number') s = (c >= 10 && c < 60) ? _fmtReal(v) : String(v | 0); else s = String(v); L.push(s); };
    const layers = new Set(A.layerNames().filter(n => !n.includes('|'))); for(const e of ents) layers.add(String(e.layer || '0'));
    let ext = bboxOf(ents) || { x0: 0, y0: 0, x1: 100, y1: 100 };
    P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$ACADVER'); P(1, 'AC1009'); if(insunits){ P(9, '$INSUNITS'); P(70, insunits); }
    P(9, '$EXTMIN'); P(10, ext.x0); P(20, ext.y0); P(9, '$EXTMAX'); P(10, ext.x1); P(20, ext.y1); P(9, '$CLAYER'); P(8, A.LS.cur || '0'); P(9, '$LTSCALE'); P(40, LTSCALE || 1); P(9, '$CELTSCALE'); P(40, A.LS.celts || 1); P(0, 'ENDSEC');
    P(0, 'SECTION'); P(2, 'TABLES');
    const ltUsed = new Set(); for(const ly of layers){ const v = A.layerLT(ly); if(v && v !== 'CONTINUOUS') ltUsed.add(v); } for(const e of ents) if(e.lt && !/^(CONTINUOUS|BYBLOCK|BYLAYER)$/.test(e.lt)) ltUsed.add(e.lt);
    const ltDefs = [...ltUsed].map(n => { const d = A.ltDefOf(n); return d && d.pat && d.pat.length ? { n, d } : null; }).filter(Boolean);
    const ltOk = new Set(ltDefs.map(x => x.n));
    P(0, 'TABLE'); P(2, 'LTYPE'); P(70, 1 + ltDefs.length); P(0, 'LTYPE'); P(2, 'CONTINUOUS'); P(70, 0); P(3, 'Solid line'); P(72, 65); P(73, 0); P(40, 0);
    for(const { n, d } of ltDefs){ P(0, 'LTYPE'); P(2, dxfStr(n)); P(70, 0); P(3, dxfStr(d.desc || n)); P(72, 65); P(73, d.pat.length); P(40, d.pat.reduce((a, b) => a + Math.abs(b), 0)); for(const v of d.pat) P(49, v); }
    P(0, 'ENDTAB');
    P(0, 'TABLE'); P(2, 'LAYER'); P(70, layers.size);
    A.lsSync();
    for(const ly of layers){ const aci = aciNear(A.layerHex(ly)); let fl = 0; if(A.LS.frozen.has(ly)) fl |= 1; if(A.LS.locked.has(ly)) fl |= 4; P(0, 'LAYER'); P(2, dxfStr(ly)); P(70, fl); P(62, A.LS.off.has(ly) ? -aci : aci); const llt = A.layerLT(ly); P(6, ltOk.has(llt) ? dxfStr(llt) : 'CONTINUOUS'); }
    P(0, 'ENDTAB');
    const stUsed = new Map(); for(const e of ents){ if(e.type === 'TEXT' && e.style && e.ff && A.FONT_FILE && A.FONT_FILE[e.ff] && !stUsed.has(e.style)) stUsed.set(e.style, A.FONT_FILE[e.ff]); }
    stUsed.delete('STANDARD');
    P(0, 'TABLE'); P(2, 'STYLE'); P(70, 1 + stUsed.size); P(0, 'STYLE'); P(2, 'STANDARD'); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, 'arial.ttf'); P(4, '');
    for(const [n, f] of stUsed){ P(0, 'STYLE'); P(2, dxfStr(n)); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, f); P(4, ''); }
    P(0, 'ENDTAB');
    P(0, 'TABLE'); P(2, 'APPID'); P(70, 2); P(0, 'APPID'); P(2, 'ACAD'); P(70, 0); P(0, 'APPID'); P(2, 'DVDCAD'); P(70, 0); P(0, 'ENDTAB');
    P(0, 'TABLE'); P(2, 'DIMSTYLE'); P(70, 1); P(0, 'DIMSTYLE'); P(2, 'STANDARD'); P(70, 0); P(3, ''); P(4, ''); P(5, ''); P(6, ''); P(7, ''); P(40, 1); P(41, (A.DS && A.dimTxt ? A.dimTxt() * (A.DS.asz || 1) : 2.5)); P(140, (A.dimTxt ? A.dimTxt() : 2.5)); P(0, 'ENDTAB');
    P(0, 'ENDSEC');
    // ---- khối (BLOCK + INSERT + thuộc tính) và kích thước (DIMENSION) giữ nguyên dạng khi mở bằng AutoCAD
    const inSet = new Set(ents); const byGrp = new Map(); for(const e of ents) if(e.grp){ let a = byGrp.get(e.grp); if(!a){ a = []; byGrp.set(e.grp, a); } a.push(e); }
    const grpCnt = new Map(); if(byGrp.size) for(const x of modelEntities) if(x.grp && byGrp.has(x.grp)) grpCnt.set(x.grp, (grpCnt.get(x.grp) || 0) + 1);
    const grpAll = gid => { const a = byGrp.get(gid) || []; const n = grpCnt.get(gid) || 0; return a.length === n || n === 0 ? a : null; };
    const inv = m => { const det = m.a * m.d - m.b * m.c; if(Math.abs(det) < 1e-300) return null; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; };
    const clone = o => JSON.parse(JSON.stringify(o));
    const blockDefs = new Map(), blockFam = new Map(), inserts = new Map(), dims = new Map(); const done = new Set();
    if(ents.length < 200000) for(const [gid, mem0] of byGrp){
      const mem = grpAll(gid); if(!mem || !mem.length) continue; const f = mem[0];
      if(f.bm && f.bm.name && !String(f.blk || '').startsWith('*') && !mem.some(x => x.vh || x.type === 'SOLID3D' || x.type === 'IMAGE')){
        const Mi = inv(f.bm); if(!Mi || mem.some(x => !x.bm || x.bm.name !== f.bm.name)) continue; const nm = String(f.bm.name).replace(/[<>\/":;?*|=`]/g, '_').slice(0, 250); if(!nm) continue;
        const loc = mem.map(x => { const w = A.xformEnt(clone(x), Mi); return w; }); const bb = bboxOf(loc.filter(x => !x.att)) || { x0: 0, y0: 0, x1: 0, y1: 0 };
        // bản khối bị sửa riêng → định nghĩa khối biến thể NAME$1, NAME$2… (AutoCAD vẫn thấy là khối)
        const tol = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0, 1) * 1e-6; const same = D0 => D0.n === mem.length && Math.abs(D0.bb.x0 - bb.x0) <= tol && Math.abs(D0.bb.y0 - bb.y0) <= tol && Math.abs(D0.bb.x1 - bb.x1) <= tol && Math.abs(D0.bb.y1 - bb.y1) <= tol;
        const fam = blockFam.get(nm) || []; let D = fam.find(same);
        if(!D){ const vn = fam.length ? nm + '$' + fam.length : nm; D = { name: vn, ents: loc, n: mem.length, bb, atts: loc.filter(x => x.att) }; fam.push(D); blockFam.set(nm, fam); blockDefs.set(vn, D); }
        inserts.set(gid, { D, m: f.bm, mem }); for(const x of mem) done.add(x); continue; }
      if(String(f.blk || '').startsWith('*DIM')){ const t = mem.find(x => x.dimd && x.type === 'TEXT'); if(t && /^(lin|rad|dia|ang)$/.test(t.dimd.k)){ dims.set(gid, { t, mem }); for(const x of mem) done.add(x); } }
    }
    // bảng ghi chú vùng (REGION) & các mục khác: XDATA DVDCAD để mở lại đúng trong DVDCAD
    P(0, 'SECTION'); P(2, 'BLOCKS');
    const emitAll = (list, o) => { for(const e of list) emit(e, o); };
    for(const D of blockDefs.values()){ P(0, 'BLOCK'); P(8, '0'); P(2, dxfStr(D.name)); P(70, D.atts.length ? 2 : 0); P(10, 0); P(20, 0); P(30, 0); P(3, dxfStr(D.name)); emitAll(D.ents, { inBlock: true }); P(0, 'ENDBLK'); P(8, '0'); }
    let dn = 0; for(const [gid, d] of dims){ d.bn = '*D' + (++dn); P(0, 'BLOCK'); P(8, '0'); P(2, d.bn); P(70, 1); P(10, 0); P(20, 0); P(30, 0); P(3, d.bn); emitAll(d.mem, { dimBlock: true }); P(0, 'ENDBLK'); P(8, '0'); }
    P(0, 'ENDSEC');
    P(0, 'SECTION'); P(2, 'ENTITIES');
    const span = Math.max(ext.x1 - ext.x0, ext.y1 - ext.y0, 1);
    function emit(e, o){ o = o || {};
      const ly = dxfStr(String(o.inBlock && e.l0 ? '0' : (e.layer || '0')));
      const byL = e.bl || String(e.col || '').toLowerCase() === String(A.layerHex(e.layer || '0')).toLowerCase();
      const aci = byL ? 256 : aciNear(e.col || '#ffffff');
      const elt = e.lt && (ltOk.has(e.lt) || e.lt === 'CONTINUOUS' || e.lt === 'BYBLOCK') ? dxfStr(e.lt) : null;
      const head = t => { P(0, t); P(8, ly); if(elt && e.type !== 'HATCH' && e.type !== 'TEXT') P(6, elt); if(aci !== 256) P(62, aci); };
      const xd = () => { if(e.rgn && !o.inBlock){ P(1001, 'DVDCAD'); P(1000, 'RGN' + (e.grp && e.blk === '*REGION' ? ':' + e.grp : '')); } };
      const poly = (verts, closed) => { if(verts.length < 2) return; head('POLYLINE'); P(66, 1); P(70, closed ? 1 : 0); P(10, 0); P(20, 0); P(30, 0); xd(); for(const v of verts){ P(0, 'VERTEX'); P(8, ly); P(10, v.x); P(20, v.y); P(30, 0); if(v.bulge) P(42, v.bulge); } P(0, 'SEQEND'); P(8, ly); };
      if(e.att && o.inBlock){ const h = e.h || 2.5; P(0, 'ATTDEF'); P(8, ly); if(aci !== 256) P(62, aci); P(10, e.x); P(20, e.y); P(30, 0); P(40, h); P(1, dxfStr(e.text || '')); P(3, dxfStr(e.attp || e.att)); P(2, dxfStr(e.att)); P(70, 0); if(e.rot) P(50, e.rot);
        const hj = e.ha === 'center' ? 1 : (e.ha === 'right' || e.ha === 'end') ? 2 : 0, vj = e.va === 'bottom' ? 1 : e.va === 'middle' ? 2 : e.va === 'top' ? 3 : 0; if(hj) P(72, hj); if(hj || vj){ P(11, e.x); P(21, e.y); P(31, 0); } if(vj) P(74, vj); return; }
      if(e.type === 'POLYLINE'){ const bv = A.bvOf ? A.bvOf(e) : null; poly(bv && bv.length >= 2 ? bv : (e.vertices || []), !!e.closed); return; }
      switch(e.type){
        case 'LINE': head('LINE'); P(10, e.x1); P(20, e.y1); P(30, 0); P(11, e.x2); P(21, e.y2); P(31, 0); break;
        case 'CIRCLE': head('CIRCLE'); P(10, e.cx); P(20, e.cy); P(30, 0); P(40, e.r); break;
        case 'ARC': head('ARC'); P(10, e.cx); P(20, e.cy); P(30, 0); P(40, e.r); P(50, e.a1); P(51, e.a2); break;
        case 'POINT': head('POINT'); P(10, e.x); P(20, e.y); P(30, 0); break;
        case 'TEXT': {
          if(!e.text) break; const lines = String(e.text).split('\n'); const h = e.h || 10, rr = e.rot || 0;
          const hj = e.ha === 'center' ? 1 : (e.ha === 'right' || e.ha === 'end') ? 2 : 0; const vj = e.va === 'bottom' ? 1 : e.va === 'middle' ? 2 : e.va === 'top' ? 3 : 0;
          const th = rr * D2R, lh = h * 1.3, dx = Math.sin(th) * lh, dy = -Math.cos(th) * lh;
          for(let i = 0; i < lines.length; i++){ const s = lines[i]; if(!s.trim()) continue; const x = e.x + dx * i, y = e.y + dy * i;
            head('TEXT'); P(10, x); P(20, y); P(30, 0); P(40, h); P(1, dxfStr(s)); if(e.style && stUsed.has(e.style)) P(7, dxfStr(e.style)); if(rr) P(50, rr); if(e.xs && Math.abs(Math.abs(e.xs) - 1) > 1e-3) P(41, Math.abs(e.xs)); if(e.xs < 0) P(71, 2); if(hj) P(72, hj); if(vj) P(73, vj); if(hj || vj){ P(11, x); P(21, y); P(31, 0); } }
          break; }
        case 'IMAGE': try{ poly(imgCorners(e), true); }catch(_){} break;
        case 'SOLID': { const p = e.pts || []; if(p.length >= 3){ head('SOLID'); P(10, p[0].x); P(20, p[0].y); P(30, 0); P(11, p[1].x); P(21, p[1].y); P(31, 0); P(12, p[2].x); P(22, p[2].y); P(32, 0); const q = p[3] || p[2]; P(13, q.x); P(23, q.y); P(33, 0); } break; }
        case 'ELLIPSE': try{ poly(smpEllipse(e), Math.abs(((e.p2 == null ? TAU : e.p2) - (e.p1 || 0)) - TAU) < 1e-3); }catch(_){} break;
        case 'XLINE': { const Lx = Math.hypot(e.dx, e.dy) || 1, ux = e.dx / Lx, uy = e.dy / Lx, big = span * 3; head('LINE'); P(10, e.ray ? e.x : e.x - ux * big); P(20, e.ray ? e.y : e.y - uy * big); P(30, 0); P(11, e.x + ux * big); P(21, e.y + uy * big); P(31, 0); break; }
        case 'HATCH': {
          const loops = (e.loops || []).filter(l => l.length >= 3); if(!loops.length) break;
          if(e.pat === 'SOLID' || (!e.pat && e.solid)){
            // chia vùng (even-odd) thành các hình thang SOLID theo dải ngang
            const ys = [...new Set(loops.flatMap(l => l.map(p => p.y)))].sort((a, b) => a - b); let cnt = 0;
            for(let k = 0; k < ys.length - 1 && cnt < 40000; k++){ const ya = ys[k], yb = ys[k + 1]; if(yb - ya < 1e-12) continue; const ym = (ya + yb) / 2; const xs = [];
              for(const lp of loops) for(let i = 0; i < lp.length; i++){ const a = lp[i], b = lp[(i + 1) % lp.length]; if((a.y > ym) === (b.y > ym)) continue; const xAt = y => a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y); xs.push({ m: xAt(ym), a: xAt(ya), b: xAt(yb) }); }
              xs.sort((p, q) => p.m - q.m);
              for(let i = 0; i + 1 < xs.length; i += 2){ const l = xs[i], r = xs[i + 1]; head('SOLID'); P(10, l.a); P(20, ya); P(30, 0); P(11, r.a); P(21, ya); P(31, 0); P(12, l.b); P(22, yb); P(32, 0); P(13, r.b); P(23, yb); P(33, 0); cnt++; } }
          } else if(e.pat){
            const bb = entBBox(e); const r = bb ? patternSegs(e, bb, 20000) : null;
            if(r){ for(const s of r.segs) for(const c of clipSegToLoops(s[0], s[1], s[2], s[3], loops)){ head('LINE'); P(10, c[0]); P(20, c[1]); P(30, 0); P(11, c[2]); P(21, c[3]); P(31, 0); }
                   for(const d of r.dots) if(G.ptInLoops({ x: d[0], y: d[1] }, loops)){ head('POINT'); P(10, d[0]); P(20, d[1]); P(30, 0); } }
          }
          break; }
      }
        }
    for(const e of ents){ if(done.has(e)) continue; emit(e); }
    for(const ins of inserts.values()){ const m = ins.m; const sx = Math.hypot(m.a, m.b), det = m.a * m.d - m.b * m.c, sy = det / (sx || 1), rot = Math.atan2(m.b, m.a) * R2D; const f = ins.mem[0];
      const ly = dxfStr(String(m.lay || f.layer || '0')); const atts = ins.mem.filter(x => x.att && x.type === 'TEXT');
      P(0, 'INSERT'); P(8, ly); if(atts.length) P(66, 1); P(2, dxfStr(ins.D.name)); P(10, m.e); P(20, m.f); P(30, 0); if(Math.abs(sx - 1) > 1e-12) P(41, sx); if(Math.abs(sy - 1) > 1e-12) P(42, sy); if(Math.abs(rot) > 1e-12) P(50, rot);
      if(atts.length){ for(const a of atts){ const al = a.layer || '0'; P(0, 'ATTRIB'); P(8, dxfStr(al)); const byL2 = a.bl || String(a.col || '').toLowerCase() === String(A.layerHex(al)).toLowerCase(); if(!byL2) P(62, aciNear(a.col || '#ffffff')); P(10, a.x); P(20, a.y); P(30, 0); P(40, a.h || 2.5); P(1, dxfStr(a.text || '')); P(2, dxfStr(a.att)); P(70, 0); if(a.rot) P(50, a.rot);
          const hj = a.ha === 'center' ? 1 : (a.ha === 'right' || a.ha === 'end') ? 2 : 0, vj = a.va === 'bottom' ? 1 : a.va === 'middle' ? 2 : a.va === 'top' ? 3 : 0; if(hj) P(72, hj); if(hj || vj){ P(11, a.x); P(21, a.y); P(31, 0); } if(vj) P(74, vj); }
        P(0, 'SEQEND'); P(8, ly); } }
    for(const d of dims.values()){ const t = d.t, D = t.dimd; const ly = dxfStr(String(t.layer || '0'));
      P(0, 'DIMENSION'); P(8, ly); P(2, d.bn);
      if(D.k === 'lin'){ const ph = (D.phi || 0) * D2R, ux = Math.cos(ph), uy = Math.sin(ph), nx = -uy, ny = ux; const d2 = (D.L.x - D.p2.x) * nx + (D.L.y - D.p2.y) * ny;
        P(10, D.p2.x + nx * d2); P(20, D.p2.y + ny * d2); P(30, 0); P(11, t.x); P(21, t.y); P(31, 0); P(70, 32); if(D.ov) P(1, dxfStr(D.ov)); P(3, 'STANDARD'); P(13, D.p1.x); P(23, D.p1.y); P(33, 0); P(14, D.p2.x); P(24, D.p2.y); P(34, 0); P(50, D.phi || 0); }
      else if(D.k === 'ang'){ const R = Math.max(Math.hypot(D.L.x - D.V.x, D.L.y - D.V.y), 1e-9); const aL = Math.atan2(D.L.y - D.V.y, D.L.x - D.V.x); let r1 = D.d1, sw = 0;
        for(const a1 of [D.d1, D.d1 + Math.PI]) for(const a2 of [D.d2, D.d2 + Math.PI]){ const w = G.norm(a2 - a1); if(w < 1e-9 || w > Math.PI) continue; if(G.norm(aL - a1) <= w && !sw){ r1 = a1; sw = w; } }
        P(10, D.L.x); P(20, D.L.y); P(30, 0); P(11, t.x); P(21, t.y); P(31, 0); P(70, 32 + 5); if(D.ov) P(1, dxfStr(D.ov)); P(3, 'STANDARD');
        P(13, D.V.x + Math.cos(r1) * R); P(23, D.V.y + Math.sin(r1) * R); P(33, 0); P(14, D.V.x + Math.cos(r1 + sw) * R); P(24, D.V.y + Math.sin(r1 + sw) * R); P(34, 0); P(15, D.V.x); P(25, D.V.y); P(35, 0); }
      else { const ux0 = D.L.x - D.c.x, uy0 = D.L.y - D.c.y, L0 = Math.hypot(ux0, uy0) || 1, ux = ux0 / L0, uy = uy0 / L0; const q = { x: D.c.x + ux * D.r, y: D.c.y + uy * D.r };
        if(D.k === 'rad'){ P(10, D.c.x); P(20, D.c.y); P(30, 0); P(11, t.x); P(21, t.y); P(31, 0); P(70, 32 + 4); if(D.ov) P(1, dxfStr(D.ov)); P(3, 'STANDARD'); P(15, q.x); P(25, q.y); P(35, 0); P(40, Math.abs(L0 - D.r)); }
        else { P(10, D.c.x - ux * D.r); P(20, D.c.y - uy * D.r); P(30, 0); P(11, t.x); P(21, t.y); P(31, 0); P(70, 32 + 3); if(D.ov) P(1, dxfStr(D.ov)); P(3, 'STANDARD'); P(15, q.x); P(25, q.y); P(35, 0); P(40, 0); } } }
    P(0, 'ENDSEC'); P(0, 'EOF');
    return L.join('\r\n') + '\r\n';
  };

  /* ===================================================================
     HỘP THOẠI ĐƠN GIẢN (dùng chung)
     =================================================================== */
  A.dialog = function(o){
    const ov = document.createElement('div'); ov.className = 'overlay dvd-dlg show';
    ov.innerHTML = '<div class="modal' + (o.wide ? ' wide' : '') + '"><h3>' + escapeHtml(o.title || '') + '</h3><div class="dvd-body">' + (o.html || '') + '</div><div class="modal-actions">' + (o.noCancel ? '' : '<button class="btn-ghost dvd-cancel" type="button">' + (o.cancelText || 'Huỷ') + '</button>') + (o.noOk ? '' : '<button class="btn-ok dvd-ok" type="button">' + (o.okText || 'OK') + '</button>') + '</div></div>';
    document.body.appendChild(ov);
    const close = () => { ov.remove(); };
    const cancel = () => { close(); if(o.cancel) o.cancel(); };
    ov.addEventListener('click', e => { if(e.target === ov) cancel(); });
    const cb = ov.querySelector('.dvd-cancel'); if(cb) cb.onclick = cancel;
    const okb = ov.querySelector('.dvd-ok'); if(okb) okb.onclick = () => { if(o.ok && o.ok(ov) === false) return; close(); };
    ov.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Escape'){ e.preventDefault(); cancel(); } if(e.key === 'Enter' && e.target.tagName === 'INPUT' && okb){ e.preventDefault(); okb.click(); } });
    if(o.onOpen) o.onOpen(ov);
    return { root: ov, close };
  };
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); dsLoad(); lastDim = null; blkCache.clear(); }; })(A.onLoad);
})();
