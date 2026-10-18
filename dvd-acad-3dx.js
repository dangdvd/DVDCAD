/* DVDCAD — 3D nâng cao (v4g)
   Cộng/trừ/giao khối: UNION, SUBTRACT, INTERSECT (BSP-CSG), SLICE
   Tạo khối: REVOLVE, SWEEP, TORUS, PYRAMID, WEDGE · Sửa 3D: 3DMOVE, 3DROTATE, MIRROR3D, ELEV
   Vật liệu: MATERIALS · RENDER · SECTIONPLANE · FLATSHOT */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._3dx || !A._3d || !window.DVDCmd) return; A._3dx = true;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const log = m => A.log(m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const MEM = A.MEM || (A.MEM = {});
  const is3D = e => e && e.type === 'SOLID3D';
  const elev = () => MEM.z03 || 0;
  const area2 = p => { let s = 0; for(let i = 0; i < p.length; i++){ const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };

  /* =================== CSG (cây BSP) =================== */
  let EPS = 1e-5;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  class Plane {
    constructor(n, w){ this.n = n; this.w = w; }
    static from(vs){ let best = null, bl = 0; const a = vs[0]; for(let i = 1; i + 1 < vs.length; i++){ const c = cross(sub(vs[i], a), sub(vs[i + 1], a)); const l = Math.hypot(c[0], c[1], c[2]); if(l > bl){ bl = l; best = c; } } if(!best || bl < 1e-30) return null; const n = [best[0] / bl, best[1] / bl, best[2] / bl]; return new Plane(n, dot(n, a)); }
    clone(){ return new Plane(this.n.slice(), this.w); }
    flip(){ this.n = [-this.n[0], -this.n[1], -this.n[2]]; this.w = -this.w; }
    split(p, cf, cb, f, b){
      const n = this.n, w = this.w, vs = p.vs, ty = new Array(vs.length); let t = 0;
      for(let i = 0; i < vs.length; i++){ const d = dot(n, vs[i]) - w; const k = d < -EPS ? 2 : d > EPS ? 1 : 0; t |= k; ty[i] = k; }
      if(t === 0){ (dot(n, p.plane.n) > 0 ? cf : cb).push(p); return; }
      if(t === 1){ f.push(p); return; } if(t === 2){ b.push(p); return; }
      const F = [], B = [];
      for(let i = 0; i < vs.length; i++){ const j = (i + 1) % vs.length, ti = ty[i], tj = ty[j], vi = vs[i], vj = vs[j];
        if(ti !== 2) F.push(vi); if(ti !== 1) B.push(ti !== 2 ? vi.slice() : vi);
        if((ti | tj) === 3){ const dd = sub(vj, vi); const s = (w - dot(n, vi)) / dot(n, dd); const v = [vi[0] + dd[0] * s, vi[1] + dd[1] * s, vi[2] + dd[2] * s]; F.push(v); B.push(v.slice()); } }
      if(F.length >= 3) f.push(new Poly(F, p.plane.clone())); if(B.length >= 3) b.push(new Poly(B, p.plane.clone()));
    }
  }
  class Poly { constructor(vs, plane){ this.vs = vs; this.plane = plane || Plane.from(vs); } flip(){ this.vs.reverse(); this.plane.flip(); } }
  class Node {
    constructor(){ this.plane = null; this.front = null; this.back = null; this.polys = []; }
    nodes(){ const out = [], st = [this]; while(st.length){ const n = st.pop(); out.push(n); if(n.front) st.push(n.front); if(n.back) st.push(n.back); } return out; }
    invert(){ for(const n of this.nodes()){ for(const p of n.polys) p.flip(); if(n.plane) n.plane.flip(); const t = n.front; n.front = n.back; n.back = t; } }
    clipPolygons(polys){ const out = [], st = [[this, polys]]; while(st.length){ const [n, ps] = st.pop(); if(!n.plane){ for(const p of ps) out.push(p); continue; } const f = [], b = []; for(const p of ps) n.plane.split(p, f, b, f, b); if(n.front) st.push([n.front, f]); else for(const p of f) out.push(p); if(n.back) st.push([n.back, b]); } return out; }
    clipTo(bsp){ for(const n of this.nodes()) n.polys = bsp.clipPolygons(n.polys); }
    all(){ const o = []; for(const n of this.nodes()) for(const p of n.polys) o.push(p); return o; }
    build(polys){ const st = [[this, polys]]; while(st.length){ const [n, ps] = st.pop(); if(!ps.length) continue; if(!n.plane) n.plane = ps[0].plane.clone(); const f = [], b = []; for(const p of ps) n.plane.split(p, n.polys, n.polys, f, b); if(f.length){ if(!n.front) n.front = new Node(); st.push([n.front, f]); } if(b.length){ if(!n.back) n.back = new Node(); st.push([n.back, b]); } } }
  }
  const bsp = polys => { const n = new Node(); n.build(polys); return n; };
  function polysOf(e){ const m = A.meshOf(e); if(!m) return []; const w = A.weld(m.p.slice(), m.i.slice()); const p = w.p, out = []; for(let k = 0; k < w.i.length; k += 3){ const vs = [w.i[k], w.i[k + 1], w.i[k + 2]].map(i => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]); const pl = Plane.from(vs); if(pl) out.push(new Poly(vs, pl)); } return out; }
  function csgOp(op, pa, pb){
    const a = bsp(pa), b = bsp(pb);
    if(op === 'union'){ a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); return a.all(); }
    if(op === 'sub'){ a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); a.invert(); return a.all(); }
    a.invert(); b.clipTo(a); b.invert(); a.clipTo(b); b.clipTo(a); a.build(b.all()); a.invert(); return a.all();   // giao
  }
  // khử điểm chữ T (đỉnh nằm trên cạnh tam giác khác) để lưới kín, cạnh không bị vẽ thừa
  function fixT(P, I, tol){
    const nv = P.length / 3; if(!nv) return I;
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for(let i = 0; i < nv; i++) for(let k = 0; k < 3; k++){ const v = P[i * 3 + k]; if(v < mn[k]) mn[k] = v; if(v > mx[k]) mx[k] = v; }
    const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2], 1e-9), cs = ext / Math.max(4, Math.min(96, Math.round(Math.cbrt(nv) * 2)));
    const G = new Map(), ck = (x, y, z) => x + ',' + y + ',' + z, ci = (v, k) => Math.floor((v - mn[k]) / cs);
    for(let i = 0; i < nv; i++){ const key = ck(ci(P[i * 3], 0), ci(P[i * 3 + 1], 1), ci(P[i * 3 + 2], 2)); let l = G.get(key); if(!l) G.set(key, l = []); l.push(i); }
    const onEdge = (a, b) => {
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], dx = P[b * 3] - ax, dy = P[b * 3 + 1] - ay, dz = P[b * 3 + 2] - az, L2 = dx * dx + dy * dy + dz * dz; if(L2 < tol * tol) return -1;
      const L = Math.sqrt(L2), steps = Math.max(1, Math.ceil(L / cs)), seen = new Set(); let best = -1, bt = 2;
      for(let s = 0; s <= steps; s++){ const t = s / steps, x = ci(ax + dx * t, 0), y = ci(ay + dy * t, 1), z = ci(az + dz * t, 2);
        for(let i = -1; i <= 1; i++) for(let j = -1; j <= 1; j++) for(let k = -1; k <= 1; k++){ const key = ck(x + i, y + j, z + k); if(seen.has(key)) continue; seen.add(key); const l = G.get(key); if(!l) continue;
          for(const v of l){ if(v === a || v === b) continue; const px = P[v * 3] - ax, py = P[v * 3 + 1] - ay, pz = P[v * 3 + 2] - az; const tt = (px * dx + py * dy + pz * dz) / L2; if(tt <= 1e-9 || tt >= 1 - 1e-9) continue; const ex = px - dx * tt, ey = py - dy * tt, ez = pz - dz * tt; if(ex * ex + ey * ey + ez * ez < tol * tol && Math.abs(tt - .5) < Math.abs(bt - .5)){ bt = tt; best = v; } } } }
      return best; };
    const Q = []; for(let k = 0; k + 2 < I.length; k += 3) Q.push([I[k], I[k + 1], I[k + 2]]);
    const out = []; let guard = 0;
    while(Q.length){ const [a, b, c] = Q.pop(); if(++guard > 400000){ out.push(a, b, c); continue; } let done = false;
      for(const [p, q, r] of [[a, b, c], [b, c, a], [c, a, b]]){ const k = onEdge(p, q); if(k >= 0){ Q.push([p, k, r], [k, q, r]); done = true; break; } }
      if(!done) out.push(a, b, c); }
    return out;
  }
  function polysToEnt(polys, base){
    const P = [], I = [];
    for(const p of polys){ const b = P.length / 3; for(const v of p.vs) P.push(v[0], v[1], v[2]); for(let k = 1; k + 1 < p.vs.length; k++) I.push(b, b + k, b + k + 1); }
    if(!I.length) return null;
    let w = A.weld(P, I); const tol = EPS * 20; w = { p: w.p, i: fixT(w.p, w.i, tol) };
    return A.meshEnt(w.p, w.i, base);
  }
  function sizeOf(list){ let a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity]; for(const e of list){ const m = A.meshOf(e); if(!m) continue; for(let i = 0; i < m.p.length; i += 3) for(let k = 0; k < 3; k++){ const v = m.p[i + k]; if(v < a[k]) a[k] = v; if(v > b[k]) b[k] = v; } } return { a, b, d: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1 }; }
  function boolean(op, A1, B1){
    const sz = sizeOf(A1.concat(B1)); EPS = Math.max(1e-9, sz.d * 1e-8);
    let acc = [].concat(...A1.map(polysOf));
    if(op === 'union'){ for(const e of B1) acc = csgOp('union', acc, polysOf(e)); }
    else if(op === 'sub'){ let cut = []; if(B1.length === 1) cut = polysOf(B1[0]); else { cut = polysOf(B1[0]); for(const e of B1.slice(1)) cut = csgOp('union', cut, polysOf(e)); } acc = csgOp('sub', acc, cut); }
    else { for(const e of B1) acc = csgOp('int', acc, polysOf(e)); }
    return polysToEnt(acc, A1[0]);
  }
  A.csg = { boolean, csgOp, polysOf, polysToEnt, fixT };
  const pick3D = async (prompt) => { const s = await A.getSel(prompt, { filter: is3D }); return (s.sel || []).filter(e => is3D(e) && !A.isLocked(e)); };
  function busyRun(fn){ log('Đang tính…'); return new Promise(res => setTimeout(() => { let r = null; try{ r = fn(); }catch(err){ console.error(err); log('Lỗi khi tính khối: ' + (err && err.message || err)); } res(r); }, 20)); }
  cmd(['UNION', 'UNI'], 'Cộng (hợp nhất) các khối 3D thành một', async () => {
    const sel = await pick3D('Chọn các khối cần cộng'); if(sel.length < 2){ if(sel.length) log('Cần chọn ít nhất 2 khối.'); return; }
    const t0 = Date.now(); const r = await busyRun(() => boolean('union', [sel[0]], sel.slice(1))); if(!r){ log('Không cộng được các khối này.'); return; }
    A.commit({ add: [r], del: sel }, 'Đã cộng ' + sel.length + ' khối'); log('UNION: đã cộng ' + sel.length + ' khối thành 1 (' + (r.f.length / 3) + ' mặt tam giác, ' + (Date.now() - t0) + ' ms).');
  });
  cmd(['SUBTRACT', 'SU'], 'Trừ khối (khoét lỗ, cắt bớt)', async () => {
    const a = await pick3D('Chọn khối bị trừ (giữ lại)'); if(!a.length) return;
    const b = (await pick3D('Chọn khối dùng để trừ (sẽ mất)')).filter(e => a.indexOf(e) < 0); if(!b.length){ log('Chưa chọn khối để trừ.'); return; }
    const base = a.length > 1 ? await busyRun(() => boolean('union', [a[0]], a.slice(1))) : a[0]; if(!base) return;
    const r = await busyRun(() => boolean('sub', [base], b)); if(!r){ log('Kết quả rỗng — khối trừ bao trùm hết khối gốc.'); A.commit({ del: a.concat(b) }, 'Đã trừ khối'); return; }
    A.commit({ add: [r], del: a.concat(b) }, 'Đã trừ khối'); log('SUBTRACT: xong (' + (r.f.length / 3) + ' mặt tam giác).');
  });
  cmd(['INTERSECT', 'IN'], 'Lấy phần giao của các khối 3D', async () => {
    const sel = await pick3D('Chọn các khối'); if(sel.length < 2){ if(sel.length) log('Cần chọn ít nhất 2 khối.'); return; }
    const r = await busyRun(() => boolean('int', [sel[0]], sel.slice(1))); if(!r){ log('Các khối không giao nhau.'); return; }
    A.commit({ add: [r], del: sel }, 'Đã lấy phần giao'); log('INTERSECT: xong.');
  });
  // khối hộp lớn chứa nửa không gian bên trái đường AB (nhìn từ A sang B)
  function halfBox(Ap, Bp, size, c){ const ux = Bp.x - Ap.x, uy = Bp.y - Ap.y, L = Math.hypot(ux, uy) || 1, dx = ux / L, dy = uy / L, nx = -dy, ny = dx, R = size * 4;
    const pts = [{ x: Ap.x - dx * R, y: Ap.y - dy * R }, { x: Ap.x + dx * R, y: Ap.y + dy * R }, { x: Ap.x + dx * R + nx * R, y: Ap.y + dy * R + ny * R }, { x: Ap.x - dx * R + nx * R, y: Ap.y - dy * R + ny * R }];
    const z0 = c.a[2] - size, h = c.b[2] - c.a[2] + size * 2; const V = []; for(const q of pts) V.push(q.x, q.y, z0); for(const q of pts) V.push(q.x, q.y, z0 + h);
    const I = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7]; for(let a = 0; a < 4; a++){ const b = (a + 1) % 4; I.push(a, b, 4 + b, a, 4 + b, 4 + a); }
    return { type: 'SOLID3D', k: 'mesh', v: V, f: I }; }
  cmd(['SLICE', 'SL'], 'Cắt khối 3D bằng mặt phẳng đứng qua 2 điểm', async () => {
    const sel = await pick3D('Chọn khối cần cắt'); if(!sel.length) return;
    const p1 = await A.getPoint('Điểm thứ nhất của mặt cắt (mặt phẳng đứng)'); if(!p1.pt) return;
    const p2 = await A.getPoint('Điểm thứ hai', { base: p1.pt }); if(!p2.pt) return;
    const k = await A.getPoint('Bấm một điểm ở phía cần giữ (Enter = giữ cả hai)', { kw: [{ k: 'B', t: 'Cả hai' }] });
    let keep = 'both'; if(k.pt){ const s = (p2.pt.x - p1.pt.x) * (k.pt.y - p1.pt.y) - (p2.pt.y - p1.pt.y) * (k.pt.x - p1.pt.x); keep = s >= 0 ? 'L' : 'R'; }
    const c = sizeOf(sel); const add = [];
    const res = await busyRun(() => { for(const e of sel){ EPS = Math.max(1e-9, c.d * 1e-8); const P = polysOf(e);
      const L = halfBox(p1.pt, p2.pt, c.d, c), Rb = halfBox(p2.pt, p1.pt, c.d, c);
      if(keep !== 'R'){ const r = polysToEnt(csgOp('int', P.map(p => new Poly(p.vs.map(v => v.slice()), p.plane.clone())), polysOf(L)), e); if(r) add.push(r); }
      if(keep !== 'L'){ const r = polysToEnt(csgOp('int', P.map(p => new Poly(p.vs.map(v => v.slice()), p.plane.clone())), polysOf(Rb)), e); if(r) add.push(r); } } return true; });
    if(!res) return; A.commit({ add, del: sel }, 'Đã cắt khối'); log('SLICE: ' + sel.length + ' khối → ' + add.length + ' phần.');
  });

  /* =================== tạo khối mới =================== */
  async function tri2(pts){ const T = await A.load3(); const c = pts.map(p => new T.Vector2(p.x, p.y)); const f = T.ShapeUtils.triangulateShape(c, []); const o = []; for(const t of f) o.push(t[0], t[1], t[2]); return o; }
  function profileOf(e){
    if(e.type === 'CIRCLE'){ const o = []; for(let k = 0; k < 48; k++){ const a = k / 48 * TAU; o.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } return o; }
    if(e.type === 'ELLIPSE'){ try{ return smpEllipse(e).slice(0, -1); }catch(_){ return null; } }
    if(e.type === 'POLYLINE'){ const v = e.vertices || []; const cl = e.closed || (v.length > 3 && Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y) < 1e-9); if(!cl) return null; const o = v.map(p => ({ x: p.x, y: p.y })); if(!e.closed) o.pop(); return o; }
    return null;
  }
  function addMesh(e, base, msg){ if(!e){ log('Không tạo được khối.'); return; } if(base){ e.layer = base.layer; e.col = base.col; if(base.bl) e.bl = 1; } else A.newProps(e); delete e.lt; if(A.ucsApply) e = A.ucsApply(e); A.commit({ add: [e] }, msg); log(msg + ' — xem: 3DORBIT.'); }
  cmd(['REVOLVE', 'REV'], 'Xoay biên dạng kín quanh trục thành khối 3D (cột, chậu, lan can…)', async () => {
    const s = await A.getSel('Chọn biên dạng kín (đa tuyến kín / tròn)', { filter: e => !!profileOf(e) }); const prof = (s.sel || []).find(e => profileOf(e)); if(!prof){ log('Cần một đa tuyến kín hoặc đường tròn.'); return; }
    const a = await A.getPoint('Điểm đầu trục xoay (chân)'); if(!a.pt) return;
    const b = await A.getPoint('Điểm cuối trục xoay (đỉnh)', { base: a.pt }); if(!b.pt) return;
    const ang = await A.getNum('Góc xoay', { def: 360 }); const deg = Math.max(1, Math.min(360, ang.num != null ? ang.num : 360));
    const kw = await A.getKw('Đặt khối (Đứng: trục thành phương Z · Nằm: như AutoCAD)', { kw: [{ k: 'D', t: 'Đứng' }, { k: 'N', t: 'Nằm' }], def: 'Đứng' }); const stand = kw.kw !== 'N';
    const P = profileOf(prof); const ux0 = b.pt.x - a.pt.x, uy0 = b.pt.y - a.pt.y, L = Math.hypot(ux0, uy0); if(L < 1e-9){ log('Trục quá ngắn.'); return; }
    const u = { x: ux0 / L, y: uy0 / L }, w = { x: -u.y, y: u.x };
    const st = P.map(p => ({ s: (p.x - a.pt.x) * u.x + (p.y - a.pt.y) * u.y, t: (p.x - a.pt.x) * w.x + (p.y - a.pt.y) * w.y }));
    const tmin = Math.min(...st.map(q => q.t)), tmax = Math.max(...st.map(q => q.t)); const tol = L * 1e-6;
    if(tmin < -tol && tmax > tol){ log('Biên dạng cắt qua trục — vẽ biên dạng nằm hẳn một bên trục.'); return; }
    const full = deg >= 360 - 1e-9, N = Math.max(8, Math.round(64 * deg / 360)), th = deg * D2R, z0 = elev();
    const V = [], I = [], n = st.length;
    const ring = k => { const q = k / N * th, c = Math.cos(q), sn = Math.sin(q); for(const p of st){ if(stand){ const r = Math.abs(p.t); V.push(a.pt.x + r * c, a.pt.y + r * sn, z0 + p.s); } else V.push(a.pt.x + p.s * u.x + p.t * c * w.x, a.pt.y + p.s * u.y + p.t * c * w.y, z0 + Math.abs(p.t) * sn); } };
    const R = full ? N : N + 1; for(let k = 0; k < R; k++) ring(k);
    for(let k = 0; k < N; k++){ const k2 = full ? (k + 1) % N : k + 1; for(let i = 0; i < n; i++){ const j = (i + 1) % n; const a0 = k * n + i, b0 = k * n + j, a1 = k2 * n + i, b1 = k2 * n + j; I.push(a0, b0, b1, a0, b1, a1); } }
    if(!full){ const t2 = await tri2(st.map(q => ({ x: q.s, y: q.t }))); for(let k = 0; k < t2.length; k += 3){ I.push(t2[k], t2[k + 2], t2[k + 1]); I.push(N * n + t2[k], N * n + t2[k + 1], N * n + t2[k + 2]); } }
    addMesh(A.meshEnt(V, I, null), null, 'Đã tạo khối xoay (' + deg + '°)');
  });
  cmd(['SWEEP'], 'Quét biên dạng dọc theo đường dẫn (ống, dầm, lan can, gờ chỉ)', async () => {
    const s1 = await A.getSel('Chọn biên dạng kín (tròn / đa tuyến kín) — vẽ ở đâu cũng được', { filter: e => !!profileOf(e) }); const prof = (s1.sel || []).find(e => profileOf(e)); if(!prof){ log('Cần biên dạng kín.'); return; }
    const s2 = await A.getSel('Chọn đường dẫn (LINE / đa tuyến)', { filter: e => (e.type === 'LINE' || e.type === 'POLYLINE' || e.type === 'ARC') && e !== prof }); const path = (s2.sel || []).find(e => e !== prof && (e.type === 'LINE' || e.type === 'POLYLINE' || e.type === 'ARC')); if(!path){ log('Cần đường dẫn.'); return; }
    let pv = path.type === 'LINE' ? [{ x: path.x1, y: path.y1 }, { x: path.x2, y: path.y2 }] : path.type === 'ARC' ? smpArc(path.cx, path.cy, path.r, path.a1, path.a2) : (path.vertices || []).map(p => ({ x: p.x, y: p.y }));
    pv = pv.filter((p, i) => !i || Math.hypot(p.x - pv[i - 1].x, p.y - pv[i - 1].y) > 1e-9); let closed = path.type === 'POLYLINE' && !!path.closed;
    if(pv.length > 2 && Math.hypot(pv[0].x - pv[pv.length - 1].x, pv[0].y - pv[pv.length - 1].y) < 1e-9){ pv.pop(); closed = true; }
    if(pv.length < 2){ log('Đường dẫn quá ngắn.'); return; }
    const P = profileOf(prof); let cx = 0, cy = 0; for(const p of P){ cx += p.x; cy += p.y; } cx /= P.length; cy /= P.length; if(prof.type === 'CIRCLE'){ cx = prof.cx; cy = prof.cy; }
    const kw = await A.getKw('Căn biên dạng vào đường dẫn', { kw: [{ k: 'T', t: 'Tâm' }, { k: 'B', t: 'Đáy' }], def: 'Tâm' });
    let vmin = Infinity; for(const p of P) vmin = Math.min(vmin, p.y - cy); const voff = kw.kw === 'B' ? -vmin : 0;
    const prof2 = P.map(p => ({ u: p.x - cx, v: p.y - cy + voff })); if(area2(P) < 0) prof2.reverse();
    const n = prof2.length, m = pv.length, z0 = elev(), V = [], I = [];
    const tan = (i) => { const a = pv[(i - 1 + m) % m], b = pv[i], c = pv[(i + 1) % m]; let t1 = null, t2 = null; if(closed || i > 0){ const L = Math.hypot(b.x - a.x, b.y - a.y); t1 = { x: (b.x - a.x) / L, y: (b.y - a.y) / L }; } if(closed || i < m - 1){ const L = Math.hypot(c.x - b.x, c.y - b.y); t2 = { x: (c.x - b.x) / L, y: (c.y - b.y) / L }; } if(!t1) return { t: t2, k: 1 }; if(!t2) return { t: t1, k: 1 }; let tx = t1.x + t2.x, ty = t1.y + t2.y; const l = Math.hypot(tx, ty); if(l < 1e-9) return { t: t2, k: 1 }; tx /= l; ty /= l; return { t: { x: tx, y: ty }, k: 1 / Math.max(0.25, tx * t2.x + ty * t2.y) }; };
    for(let i = 0; i < m; i++){ const { t, k } = tan(i), nx = -t.y, ny = t.x; for(const q of prof2) V.push(pv[i].x + nx * q.u * k, pv[i].y + ny * q.u * k, z0 + q.v); }
    const segs = closed ? m : m - 1; for(let i = 0; i < segs; i++){ const j = (i + 1) % m; for(let a = 0; a < n; a++){ const b = (a + 1) % n; I.push(i * n + a, j * n + a, j * n + b, i * n + a, j * n + b, i * n + b); } }
    if(!closed){ const t2 = await tri2(prof2.map(q => ({ x: q.u, y: q.v }))); for(let k = 0; k < t2.length; k += 3){ I.push(t2[k], t2[k + 1], t2[k + 2]); I.push((m - 1) * n + t2[k], (m - 1) * n + t2[k + 2], (m - 1) * n + t2[k + 1]); } }
    addMesh(A.meshEnt(V, I, null), null, 'Đã quét biên dạng theo đường dẫn');
  });
  function frustum(cx, cy, R, R2, N, off, z0, z1){
    const V = [], I = []; for(let k = 0; k < N; k++){ const a = off + k / N * TAU; V.push(cx + R * Math.cos(a), cy + R * Math.sin(a), z0); } for(let k = 0; k < N; k++){ const a = off + k / N * TAU; V.push(cx + R2 * Math.cos(a), cy + R2 * Math.sin(a), z1); }
    for(let k = 0; k < N; k++){ const j = (k + 1) % N; I.push(k, j, N + j, k, N + j, N + k); }
    V.push(cx, cy, z0); const cb = 2 * N; for(let k = 0; k < N; k++) I.push(cb, (k + 1) % N, k);
    V.push(cx, cy, z1); const ct = 2 * N + 1; for(let k = 0; k < N; k++) I.push(ct, N + k, N + (k + 1) % N);
    return A.meshEnt(V, I, null);
  }
  cmd(['PYRAMID', 'PYR'], 'Khối chóp (đáy đa giác đều)', async () => {
    const ns = await A.getNum('Số cạnh đáy', { def: MEM.pyrN || 4 }); const N = Math.max(3, Math.min(64, Math.round(ns.num || MEM.pyrN || 4))); MEM.pyrN = N;
    const c = await A.getPoint('Tâm đáy'); if(!c.pt) return;
    const off = -Math.PI / 2 + Math.PI / N;
    const r = await A.getDist('Bán kính đáy (tới đỉnh đa giác)', { base: c.pt, preview: (g, p) => { const R = Math.hypot(p.x - c.pt.x, p.y - c.pt.y); const o = []; for(let k = 0; k < N; k++){ const a = off + k / N * TAU; o.push({ x: c.pt.x + R * Math.cos(a), y: c.pt.y + R * Math.sin(a) }); } g.poly(o, true); } }); if(!(r.num > 0)) return;
    const r2 = await A.getDist('Bán kính đỉnh (0 = chóp nhọn)', { def: 0 });
    const h = await A.getDist('Chiều cao', { def: MEM.h3 || r.num * 1.5 }); if(!(h.num > 0)) return;
    addMesh(frustum(c.pt.x, c.pt.y, r.num, Math.max(0, r2.num || 0), N, off, elev(), elev() + h.num), null, 'Đã tạo khối chóp');
  });
  cmd(['TORUS', 'TOR'], 'Khối xuyến (vòng, phao)', async () => {
    const c = await A.getPoint('Tâm xuyến'); if(!c.pt) return;
    const R = await A.getDist('Bán kính xuyến (tới tâm ống)', { base: c.pt, preview: (g, p) => g.circle(c.pt, Math.hypot(p.x - c.pt.x, p.y - c.pt.y)) }); if(!(R.num > 0)) return;
    const r = await A.getDist('Bán kính ống', { def: R.num / 4 }); if(!(r.num > 0)) return;
    const NU = 48, NV = 20, V = [], I = [], zc = elev() + r.num;
    for(let i = 0; i < NU; i++){ const a = i / NU * TAU; for(let j = 0; j < NV; j++){ const b = j / NV * TAU, rr = R.num + r.num * Math.cos(b); V.push(c.pt.x + rr * Math.cos(a), c.pt.y + rr * Math.sin(a), zc + r.num * Math.sin(b)); } }
    for(let i = 0; i < NU; i++){ const i2 = (i + 1) % NU; for(let j = 0; j < NV; j++){ const j2 = (j + 1) % NV; I.push(i * NV + j, i2 * NV + j, i2 * NV + j2, i * NV + j, i2 * NV + j2, i * NV + j2); } }
    addMesh(A.meshEnt(V, I, null), null, 'Đã tạo khối xuyến');
  });
  cmd(['WEDGE', 'WE'], 'Khối nêm (dốc, ram dốc)', async () => {
    const a = await A.getPoint('Góc thứ nhất của đáy (phía cao)'); if(!a.pt) return;
    const b = await A.getPoint('Góc đối diện (phía thấp)', { base: a.pt, rubber: false, preview: (g, p) => g.poly([a.pt, { x: p.x, y: a.pt.y }, p, { x: a.pt.x, y: p.y }], true) }); if(!b.pt) return;
    const h = await A.getDist('Chiều cao', { def: MEM.h3 || 1000 }); if(!(h.num > 0)) return;
    const x0 = a.pt.x, y0 = a.pt.y, x1 = b.pt.x, y1 = b.pt.y, z0 = elev(), z1 = z0 + h.num;
    const V = [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z1, x0, y1, z1];   // A B C D E F
    const I = [0, 3, 2, 0, 2, 1, 0, 4, 5, 0, 5, 3, 1, 2, 5, 1, 5, 4, 0, 1, 4, 3, 5, 2];
    addMesh(A.meshEnt(V, I, null), null, 'Đã tạo khối nêm');
  });

  /* =================== sửa trong không gian 3D =================== */
  function moveZ(w, dz){ if(w.type === 'SOLID' && w.face){ w.zs = (w.zs || []).map(z => (z || 0) + dz); return; } if(w.k === 'mesh'){ const v = w.v.slice(); for(let i = 2; i < v.length; i += 3) v[i] += dz; w.v = v; return; } w.z0 = (w.z0 || 0) + dz; }
  cmd(['3DMOVE', '3M', 'MOVEZ'], 'Dời khối 3D (cả theo phương đứng Z)', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: e => is3D(e) || (e.type === 'SOLID' && e.face) }); const sel = (s.sel || []).filter(e => (is3D(e) || (e.type === 'SOLID' && e.face)) && !A.isLocked(e)); if(!sel.length) return;
    const p1 = await A.getPoint('Điểm gốc trên mặt bằng (Enter = chỉ dời theo Z)'); let dx = 0, dy = 0;
    if(p1.pt){ const p2 = await A.getPoint('Điểm đến trên mặt bằng', { base: p1.pt }); if(p2.pt){ dx = p2.pt.x - p1.pt.x; dy = p2.pt.y - p1.pt.y; } }
    const z = await A.getNum('Dời theo Z (lên +, xuống −)', { def: 0 }); const dz = z.num || 0;
    const rep = sel.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; if(dx || dy) window.translateEnt(w, dx, dy); if(dz) moveZ(w, dz); return [e, w]; });
    A.commit({ rep }, 'Đã dời ' + sel.length + ' khối'); log('3DMOVE: ' + sel.length + ' khối (ΔX ' + +dx.toFixed(4) + ', ΔY ' + +dy.toFixed(4) + ', ΔZ ' + dz + ').');
  });
  function rotMesh(w, o, ax, ang){ const c = Math.cos(ang), s = Math.sin(ang), [kx, ky, kz] = ax, v = w.v.slice();
    for(let i = 0; i < v.length; i += 3){ const x = v[i] - o[0], y = v[i + 1] - o[1], z = v[i + 2] - o[2]; const d = kx * x + ky * y + kz * z; const cx = ky * z - kz * y, cy = kz * x - kx * z, cz = kx * y - ky * x;
      v[i] = o[0] + x * c + cx * s + kx * d * (1 - c); v[i + 1] = o[1] + y * c + cy * s + ky * d * (1 - c); v[i + 2] = o[2] + z * c + cz * s + kz * d * (1 - c); }
    w.v = v; const pp = []; for(let i = 0; i < v.length; i += 3) pp.push({ x: v[i], y: v[i + 1] }); w.pts = hull2d(pp); }
  cmd(['3DROTATE', 'ROTATE3D', '3R'], 'Xoay khối 3D quanh trục X, Y, Z hoặc trục nằm qua 2 điểm', async () => {
    const sel = await pick3D('Chọn khối 3D'); if(!sel.length) return;
    const k = await A.getKw('Trục xoay', { kw: [{ k: 'X', t: 'Trục X' }, { k: 'Y', t: 'Trục Y' }, { k: 'K', t: 'Trục Z (đứng)' }, { k: '2', t: '2 điểm' }], def: '2 điểm' }); let ax = k.kw || '2'; if(ax === 'K') ax = 'Z';
    let o, dir;
    if(ax === '2'){ const a = await A.getPoint('Điểm thứ nhất của trục (nằm ngang)'); if(!a.pt) return; const b = await A.getPoint('Điểm thứ hai của trục', { base: a.pt }); if(!b.pt) return; const L = Math.hypot(b.pt.x - a.pt.x, b.pt.y - a.pt.y); if(L < 1e-9) return; o = [a.pt.x, a.pt.y, 0]; dir = [(b.pt.x - a.pt.x) / L, (b.pt.y - a.pt.y) / L, 0]; }
    else { const a = await A.getPoint('Điểm trục đi qua'); if(!a.pt) return; o = [a.pt.x, a.pt.y, 0]; dir = ax === 'X' ? [1, 0, 0] : ax === 'Y' ? [0, 1, 0] : [0, 0, 1]; }
    if(ax !== 'Z'){ const z = await A.getNum('Cao độ Z của trục', { def: MEM.rz3 || 0 }); o[2] = z.num || 0; MEM.rz3 = o[2]; }
    const an = await A.getNum('Góc xoay (độ)', { def: 90 }); const deg = an.num != null ? an.num : 90; if(!deg) return;
    const rep = sel.map(e => { let w; if(ax === 'Z'){ w = JSON.parse(JSON.stringify(e)); delete w.userAdded; window.rotateEnt(w, deg, { x: o[0], y: o[1] }); } else { w = JSON.parse(JSON.stringify(A.toMesh(e))); delete w.userAdded; rotMesh(w, o, dir, deg * D2R); } return [e, w]; });
    A.commit({ rep }, 'Đã xoay 3D ' + sel.length + ' khối'); log('3DROTATE: xoay ' + deg + '° quanh trục ' + (ax === '2' ? 'qua 2 điểm' : ax) + '.');
  });
  cmd(['MIRROR3D', '3DMIRROR'], 'Đối xứng khối 3D qua mặt phẳng ngang (lật trên/dưới) hoặc mặt đứng', async () => {
    const sel = await pick3D('Chọn khối 3D'); if(!sel.length) return;
    const k = await A.getKw('Mặt đối xứng', { kw: [{ k: 'N', t: 'Ngang (lật trên/dưới)' }, { k: 'D', t: 'Đứng qua 2 điểm' }], def: 'Ngang' });
    if(k.kw === 'D'){ const a = await A.getPoint('Điểm thứ nhất'); if(!a.pt) return; const b = await A.getPoint('Điểm thứ hai', { base: a.pt }); if(!b.pt) return;
      const kk = await A.getKw('Xoá khối gốc?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Không' });
      const out = sel.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; window.mirrorAcross(w, a.pt, b.pt); return w; });
      if(kk.kw === 'C') A.commit({ rep: sel.map((e, i) => [e, out[i]]) }, 'Đã đối xứng'); else A.commit({ add: out }, 'Đã đối xứng'); return; }
    const z = await A.getNum('Cao độ Z của mặt đối xứng', { def: 0 }); const Z = z.num || 0;
    const kk = await A.getKw('Xoá khối gốc?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Không' });
    const out = sel.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded;
      if(w.k === 'mesh'){ const v = w.v.slice(); for(let i = 2; i < v.length; i += 3) v[i] = 2 * Z - v[i]; w.v = v; A.flipI(w.f = w.f.slice()); }
      else if(w.k === 'sph') w.z0 = 2 * Z - (w.z0 || 0);
      else if(w.k === 'cone'){ const z1 = (w.z0 || 0) + (w.h || 0); w.z0 = 2 * Z - z1; const r2 = w.r2 != null ? w.r2 : w.r; w.r2 = w.r; w.r = r2; if(!(w.r > 0)){ const m = A.toMesh(Object.assign({}, e, { r: e.r, r2: e.r2 })); const v = m.v.slice(); for(let i = 2; i < v.length; i += 3) v[i] = 2 * Z - v[i]; return Object.assign(JSON.parse(JSON.stringify(m)), { v, f: A.flipI(m.f.slice()) }); } }
      else w.z0 = 2 * Z - ((w.z0 || 0) + (w.h || 0));
      return w; });
    if(kk.kw === 'C') A.commit({ rep: sel.map((e, i) => [e, out[i]]) }, 'Đã đối xứng 3D'); else A.commit({ add: out }, 'Đã đối xứng 3D');
    log('MIRROR3D: ' + sel.length + ' khối qua mặt Z = ' + Z + '.');
  });
  cmd(['ELEV', 'ELEVATION'], 'Cao độ đặt khối 3D mới (Z của đáy)', async () => {
    const z = await A.getNum('Cao độ mới cho khối 3D', { def: elev() }); if(z.num == null) return; MEM.z03 = z.num; try{ localStorage.setItem('dvd:elev', String(z.num)); }catch(_){}
    log('ELEV: khối 3D mới đặt ở cao độ Z = ' + z.num + '.');
  });
  try{ const z = parseFloat(localStorage.getItem('dvd:elev')); if(isFinite(z)) MEM.z03 = z; }catch(_){}

  /* =================== vật liệu / render / mặt cắt / chiếu 2D =================== */
  function matDialog(sel){
    const cur = sel[0].mat || '';
    const sw = k => { const M = A.MATS[k]; return '<span style="display:inline-block;width:22px;height:22px;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #0004;background:' + (M ? M.c : '#888') + (M && M.op ? ';opacity:.6' : '') + '"></span>'; };
    const html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + [['', 'Theo màu đối tượng']].concat(Object.keys(A.MATS).map(k => [k, A.MATS[k].n])).map(([k, n]) => '<label style="display:flex;align-items:center;padding:6px 8px;border:1px solid #4a5363;border-radius:6px;cursor:pointer"><input type="radio" name="mat3" value="' + k + '"' + (k === cur ? ' checked' : '') + ' style="margin-right:8px">' + sw(k) + esc(n) + '</label>').join('') + '</div><p style="opacity:.75;font-size:12px;margin:10px 0 0">Vật liệu hiện trong khung nhìn 3D ở kiểu "Thực tế". Đã chọn ' + sel.length + ' khối.</p>';
    return new Promise(res => A.dialog({ title: 'Gán vật liệu (MATERIALS)', html, wide: true, ok: root => { const r = root.querySelector('input[name=mat3]:checked'); res(r ? r.value : null); }, cancel: () => res(null) }));
  }
  cmd(['MATERIALS', 'MAT', 'MATERIALASSIGN', 'RMAT', 'VATLIEU'], 'Gán vật liệu cho khối 3D (bê tông, gạch, gỗ, kính…)', async () => {
    const sel = await pick3D('Chọn khối 3D cần gán vật liệu'); if(!sel.length) return;
    const m = await matDialog(sel); if(m == null) return;
    const rep = sel.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; if(m) w.mat = m; else delete w.mat; return [e, w]; });
    A.commit({ rep }, 'Đã gán vật liệu'); log('Đã gán "' + (m ? A.MATS[m].n : 'Theo màu') + '" cho ' + sel.length + ' khối. Xem: RENDER.');
  });
  plain(['RENDER', 'RR'], 'Xem phối cảnh thực tế: vật liệu, ánh sáng, bóng đổ', async () => { await A.open3D(); if(A.view3D) A.view3D.setStyle('real'); });
  plain(['SECTIONPLANE', 'SECTION', 'MATCAT'], 'Mặt cắt ngang mô hình 3D (kéo thanh để đổi cao độ cắt)', async () => { await A.open3D(); if(A.view3D) A.view3D.setCut(true, 0.4); });
  cmd(['FLATSHOT', 'FSHOT'], 'Chiếu mô hình 3D thành hình 2D (mặt đứng, ISO) theo góc nhìn 3D, đã khử nét khuất', async () => {
    let segs = A._fs; A._fs = null;
    if(!segs){ if(!A.view3D) await A.open3D({ keep: true }); if(!A.view3D) return; segs = A.view3D.flatshot(); A.close3D(); }
    if(!segs || !segs.length){ log('Không có cạnh nào để chiếu (bản vẽ chưa có khối 3D?).'); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(let i = 0; i < segs.length; i += 2){ x0 = Math.min(x0, segs[i]); x1 = Math.max(x1, segs[i]); y0 = Math.min(y0, segs[i + 1]); y1 = Math.max(y1, segs[i + 1]); }
    const nP = Math.min(segs.length, 4 * 2500);
    const r = await A.getPoint('Điểm đặt hình chiếu (góc dưới trái) — ' + (segs.length / 4) + ' nét', { preview: (g, p) => { const dx = p.x - x0, dy = p.y - y0; for(let i = 0; i < nP; i += 4) g.line({ x: segs[i] + dx, y: segs[i + 1] + dy }, { x: segs[i + 2] + dx, y: segs[i + 3] + dy }); g.poly([{ x: p.x, y: p.y }, { x: p.x + x1 - x0, y: p.y }, { x: p.x + x1 - x0, y: p.y + y1 - y0 }, { x: p.x, y: p.y + y1 - y0 }], true, 'rgba(120,170,255,.6)', [4, 4]); } });
    if(!r.pt) return; const dx = r.pt.x - x0, dy = r.pt.y - y0; const add = [], gid = 'fs' + Date.now().toString(36);
    for(let i = 0; i < segs.length; i += 4){ const e = { type: 'LINE', x1: segs[i] + dx, y1: segs[i + 1] + dy, x2: segs[i + 2] + dx, y2: segs[i + 3] + dy }; A.newProps(e); e.grp = gid; e.blk = '*FLATSHOT'; add.push(e); }
    A.commit({ add }, 'FLATSHOT: ' + add.length + ' nét'); log('FLATSHOT: đã chèn ' + add.length + ' nét (một nhóm — EXPLODE để tách, kích thước thật 1:1).');
  });
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
