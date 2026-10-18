/* DVDCAD — 3D (v5)
   Khối 3D: BOX, CYLINDER, CONE, SPHERE, EXTRUDE, PRESSPULL, WALL3D (tường 3D từ mặt bằng)
   Xem 3D: 3DORBIT — quay/thu phóng/kéo, ViewCube, góc nhìn chuẩn, kiểu hiển thị, song song/phối cảnh
   Xuất: STL, OBJ, ảnh PNG; DXF ghi khối 3D thành mặt 3DFACE (AutoCAD mở được) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._3d || !window.DVDCmd) return; A._3d = true;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => A.log(m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const MEM = A.MEM || {};
  const hasDoc = () => { try{ return A.hasDoc(); }catch(_){ return false; } };

  /* ---------------- nạp three.js (lười, chỉ khi cần) ---------------- */
  let _three = null;
  function load3(){
    if(window.THREE) return Promise.resolve(window.THREE);
    if(_three) return _three;
    _three = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = './vendor/three.min.js'; sc.onload = () => window.THREE ? res(window.THREE) : rej(new Error('three')); sc.onerror = () => { _three = null; rej(new Error('Không tải được bộ vẽ 3D')); }; document.head.appendChild(sc); });
    return _three;
  }
  A.load3 = load3;

  /* ---------------- hình học ---------------- */
  const area2 = p => { let s = 0; for(let i = 0; i < p.length; i++){ const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
  const dedup = p => { const o = []; for(const q of p){ const l = o[o.length - 1]; if(!l || Math.hypot(l.x - q.x, l.y - q.y) > 1e-9) o.push({ x: q.x, y: q.y }); } while(o.length > 2 && Math.hypot(o[0].x - o[o.length - 1].x, o[0].y - o[o.length - 1].y) < 1e-9) o.pop(); return o; };
  function triangulate(T, pts, holes){
    const c = pts.map(p => new T.Vector2(p.x, p.y)), h = (holes || []).map(l => l.map(p => new T.Vector2(p.x, p.y)));
    const f = T.ShapeUtils.triangulateShape(c, h); const out = []; for(const t of f) out.push(t[0], t[1], t[2]); return out;
  }
  // tạo khối đùn từ đa giác (+ lỗ): chuẩn hoá chiều (ngoài CCW, lỗ CW) và tam giác hoá nắp
  async function makeExt(pts, holes, z0, h){
    const T = await load3(); pts = dedup(pts); if(pts.length < 3) return null; if(area2(pts) < 0) pts.reverse();
    holes = (holes || []).map(dedup).filter(l => l.length >= 3).map(l => (area2(l) > 0 ? l.reverse() : l));
    if(h < 0){ z0 += h; h = -h; }
    const tri = triangulate(T, pts, holes); if(!tri.length) return null;
    return { type: 'SOLID3D', k: 'ext', pts, holes, z0, h, tri };
  }
  A.makeExt = makeExt;
  // lưới tam giác của 1 khối: {p:[x,y,z…], i:[…], smooth}
  function meshOf(e){
    const P = [], I = [];
    const v = (x, y, z) => { P.push(x, y, z); return P.length / 3 - 1; };
    if(e.type === 'SOLID' && e.face){ const z = e.zs || []; const q = e.pts.map((p, i) => v(p.x, p.y, z[i] || 0)); I.push(q[0], q[1], q[2]); if(q.length > 3 && Math.hypot(e.pts[3].x - e.pts[2].x, e.pts[3].y - e.pts[2].y) + Math.abs((z[3] || 0) - (z[2] || 0)) > 1e-9) I.push(q[0], q[2], q[3]); return { p: P, i: I, flat: true }; }
    if(e.type !== 'SOLID3D') return null;
    if(e.k === 'ext'){
      const V = (e.pts || []).concat(...(e.holes || [])); const n = V.length, z0 = e.z0 || 0, z1 = z0 + (e.h || 0);
      for(const q of V) v(q.x, q.y, z0); for(const q of V) v(q.x, q.y, z1);
      const t = e.tri || []; for(let k = 0; k + 2 < t.length; k += 3){ I.push(t[k], t[k + 2], t[k + 1]); I.push(n + t[k], n + t[k + 1], n + t[k + 2]); }
      let off = 0; for(const lp of [e.pts || []].concat(e.holes || [])){ const m = lp.length; for(let a = 0; a < m; a++){ const b = (a + 1) % m; const a0 = off + a, b0 = off + b; I.push(a0, b0, n + b0, a0, n + b0, n + a0); } off += m; }
      if(area2(e.pts || []) < 0) flipI(I);   // sau MIRROR: đảo chiều mặt để pháp tuyến hướng ra ngoài
      return { p: P, i: I, flat: true };
    }
    if(e.k === 'mesh') return { p: e.v || [], i: e.f || [], flat: true };
    if(e.k === 'cone'){
      const N = 48, z0 = e.z0 || 0, z1 = z0 + (e.h || 0), r1 = e.r, r2 = e.r2 != null ? e.r2 : e.r;
      const b = [], t = []; for(let k = 0; k < N; k++){ const a = k / N * TAU; b.push(v(e.cx + r1 * Math.cos(a), e.cy + r1 * Math.sin(a), z0)); } for(let k = 0; k < N; k++){ const a = k / N * TAU; t.push(v(e.cx + r2 * Math.cos(a), e.cy + r2 * Math.sin(a), z1)); }
      for(let k = 0; k < N; k++){ const j = (k + 1) % N; I.push(b[k], b[j], t[j], b[k], t[j], t[k]); }
      const cb = v(e.cx, e.cy, z0); for(let k = 0; k < N; k++) I.push(cb, b[(k + 1) % N], b[k]);
      if(r2 > 1e-12){ const ct = v(e.cx, e.cy, z1); for(let k = 0; k < N; k++) I.push(ct, t[k], t[(k + 1) % N]); }
      return { p: P, i: I, smooth: true };
    }
    if(e.k === 'sph'){
      const NU = 40, NV = 20, z = e.z0 || 0; const idx = [];
      for(let j = 0; j <= NV; j++){ const ph = Math.PI * j / NV; const row = []; for(let k = 0; k < NU; k++){ const th = TAU * k / NU; row.push(v(e.cx + e.r * Math.sin(ph) * Math.cos(th), e.cy + e.r * Math.sin(ph) * Math.sin(th), z + e.r * Math.cos(ph))); } idx.push(row); }
      for(let j = 0; j < NV; j++) for(let k = 0; k < NU; k++){ const a = idx[j][k], b = idx[j][(k + 1) % NU], c = idx[j + 1][(k + 1) % NU], d = idx[j + 1][k]; I.push(a, d, c, a, c, b); }
      return { p: P, i: I, smooth: true };
    }
    return null;
  }
  A.meshOf = meshOf;
  function flipI(I){ for(let k = 0; k + 2 < I.length; k += 3){ const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; } return I; }
  A.flipI = flipI;
  // gộp đỉnh trùng (lượng tử q), bỏ tam giác suy biến
  function weld(P, I, q){
    if(!q){ let a = Infinity, b = -Infinity; for(const v of P){ if(v < a) a = v; if(v > b) b = v; } q = Math.max(1e-9, (b - a) * 1e-9); }
    const map = new Map(), np = [], re = new Int32Array(P.length / 3);
    for(let k = 0; k < P.length; k += 3){ const key = Math.round(P[k] / q) + ',' + Math.round(P[k + 1] / q) + ',' + Math.round(P[k + 2] / q); let id = map.get(key); if(id === undefined){ id = np.length / 3; map.set(key, id); np.push(P[k], P[k + 1], P[k + 2]); } re[k / 3] = id; }
    const ni = []; for(let k = 0; k + 2 < I.length; k += 3){ const a = re[I[k]], b = re[I[k + 1]], c = re[I[k + 2]]; if(a === b || b === c || a === c) continue;
      const ux = np[b * 3] - np[a * 3], uy = np[b * 3 + 1] - np[a * 3 + 1], uz = np[b * 3 + 2] - np[a * 3 + 2], vx = np[c * 3] - np[a * 3], vy = np[c * 3 + 1] - np[a * 3 + 1], vz = np[c * 3 + 2] - np[a * 3 + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; if(Math.hypot(cx, cy, cz) <= q * q) continue; ni.push(a, b, c); }
    return { p: np, i: ni };
  }
  A.weld = weld;
  // cạnh của lưới: [a, b, f1, f2] (f2 = -1: cạnh biên), pháp tuyến mặt N
  function edgeData(m){
    const w = weld(m.p, m.i); const p = w.p, I = w.i, nf = I.length / 3, N = new Float64Array(nf * 3);
    for(let f = 0; f < nf; f++){ const a = I[f * 3] * 3, b = I[f * 3 + 1] * 3, c = I[f * 3 + 2] * 3; const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]; let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const l = Math.hypot(x, y, z) || 1; N[f * 3] = x / l; N[f * 3 + 1] = y / l; N[f * 3 + 2] = z / l; }
    const nv = p.length / 3, map = new Map(), E = [];
    for(let f = 0; f < nf; f++) for(let k = 0; k < 3; k++){ let a = I[f * 3 + k], b = I[f * 3 + (k + 1) % 3]; if(a > b){ const t = a; a = b; b = t; } const key = a * nv + b; const ix = map.get(key); if(ix === undefined){ map.set(key, E.length); E.push(a, b, f, -1); } else if(E[ix + 3] === -1) E[ix + 3] = f; else E[ix + 3] = -2; }
    return { p, I, N, E };
  }
  A.edgeData = edgeData;
  // cạnh nhìn thấy theo hướng d: cạnh biên, cạnh gãy (> góc), đường bao (silhouette)
  function viewEdges(ed, d, cosA){
    const { p, N, E } = ed, out = []; cosA = cosA == null ? Math.cos(20 * D2R) : cosA;
    for(let k = 0; k < E.length; k += 4){ const f1 = E[k + 2], f2 = E[k + 3]; let keep = f2 < 0;
      if(!keep){ const n1 = f1 * 3, n2 = f2 * 3; const dd = N[n1] * N[n2] + N[n1 + 1] * N[n2 + 1] + N[n1 + 2] * N[n2 + 2]; if(dd < cosA) keep = true; else if(d){ const s1 = N[n1] * d[0] + N[n1 + 1] * d[1] + N[n1 + 2] * d[2], s2 = N[n2] * d[0] + N[n2 + 1] * d[1] + N[n2 + 2] * d[2]; if((s1 > 1e-6 && s2 < -1e-6) || (s1 < -1e-6 && s2 > 1e-6)) keep = true; } }
      if(keep){ const a = E[k] * 3, b = E[k + 1] * 3; out.push(p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2]); } }
    return out;
  }
  A.viewEdges = viewEdges;
  // nét mặt bằng của khối lưới (chiếu đứng từ trên xuống), có bộ nhớ đệm theo mảng đỉnh
  const _pe = new WeakMap();
  A.planEdges = function(e){
    if(!e.v) return []; let r = _pe.get(e.v); if(r && r.f === e.f) return r.L;
    const L3 = viewEdges(edgeData({ p: e.v, i: e.f || [] }), [0, 0, 1]); const L = [], seen = new Set();
    let a = Infinity, b = -Infinity; for(const v of e.v){ if(v < a) a = v; if(v > b) b = v; } const q = Math.max(1e-9, (b - a) * 1e-7);
    for(let k = 0; k < L3.length; k += 6){ const x1 = L3[k], y1 = L3[k + 1], x2 = L3[k + 3], y2 = L3[k + 4]; if(Math.hypot(x2 - x1, y2 - y1) < q) continue; let k1 = Math.round(x1 / q) + ',' + Math.round(y1 / q), k2 = Math.round(x2 / q) + ',' + Math.round(y2 / q); const key = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1; if(seen.has(key)) continue; seen.add(key); L.push(x1, y1, x2, y2); }
    _pe.set(e.v, { f: e.f, L }); return L;
  };
  // tạo khối lưới từ tam giác (đảm bảo pháp tuyến hướng ra ngoài)
  function meshEnt(P, I, base){
    const w = weld(P, I); if(w.i.length < 3) return null;
    const v = w.p.map(x => Math.round(x * 1e6) / 1e6); const e = { type: 'SOLID3D', k: 'mesh', v, f: w.i };
    if(volumeOf(e) < 0) flipI(e.f);
    const pp = []; for(let k = 0; k < v.length; k += 3) pp.push({ x: v[k], y: v[k + 1] }); e.pts = hull2d(pp);
    if(base){ for(const k of ['layer', 'col', 'bl', 'mat', 'lw']) if(base[k] != null) e[k] = base[k]; }
    return e;
  }
  A.meshEnt = meshEnt;
  A.toMesh = e => { if(e.k === 'mesh') return e; const m = meshOf(e); return m ? meshEnt(m.p.slice(), m.i.slice(), e) : null; };
  // đường đẳng tham số (isolines) cho khung dây của mặt cong — như ISOLINES của AutoCAD
  function isoLines(e){
    const P = []; if(e.type !== 'SOLID3D') return P; const seg = (a, b) => P.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    if(e.k === 'cone'){ const z0 = e.z0 || 0, z1 = z0 + (e.h || 0), r2 = e.r2 != null ? e.r2 : e.r; for(let k = 0; k < 4; k++){ const a = k * Math.PI / 2; seg([e.cx + e.r * Math.cos(a), e.cy + e.r * Math.sin(a), z0], [e.cx + r2 * Math.cos(a), e.cy + r2 * Math.sin(a), z1]); } }
    if(e.k === 'sph'){ const N = 64, z = e.z0 || 0, r = e.r; for(let k = 0; k < N; k++){ const a = k / N * TAU, b = (k + 1) / N * TAU;
      seg([e.cx + r * Math.cos(a), e.cy + r * Math.sin(a), z], [e.cx + r * Math.cos(b), e.cy + r * Math.sin(b), z]);
      seg([e.cx + r * Math.cos(a), e.cy, z + r * Math.sin(a)], [e.cx + r * Math.cos(b), e.cy, z + r * Math.sin(b)]);
      seg([e.cx, e.cy + r * Math.cos(a), z + r * Math.sin(a)], [e.cx, e.cy + r * Math.cos(b), z + r * Math.sin(b)]); } }
    return P;
  }
  function volumeOf(e){ if(e.k === 'ext'){ let a = Math.abs(area2(e.pts || [])); for(const h of e.holes || []) a -= Math.abs(area2(h)); return a * Math.abs(e.h || 0); } if(e.k === 'cone'){ const r2 = e.r2 != null ? e.r2 : e.r; return Math.PI * Math.abs(e.h || 0) * (e.r * e.r + e.r * r2 + r2 * r2) / 3; } if(e.k === 'sph') return 4 / 3 * Math.PI * e.r ** 3;
    if(e.k === 'mesh'){ const p = e.v || [], I = e.f || []; let s = 0; for(let k = 0; k + 2 < I.length; k += 3){ const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3; s += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]); } return s / 6; }
    return 0; }
  A.volumeOf = volumeOf;
  const is3D = e => e && (e.type === 'SOLID3D' || (e.type === 'SOLID' && e.face));

  /* ---------------- lệnh tạo khối ---------------- */
  const H0 = () => MEM.h3 || (() => { try{ const b = viewWorldAABB(); return +((b.maxX - b.minX) * 0.15).toPrecision(2); }catch(_){ return 1000; } })();
  async function askH(prompt, base){ const r = await A.getDist(prompt || 'Chiều cao (âm = đùn xuống)', { def: H0(), base }); let h = r.num != null ? r.num : H0(); if(!h) return null; MEM.h3 = Math.abs(h); return h; }
  async function askZ0(){ return MEM.z03 || 0; }
  function addSolids(list, msg){ const add = list.filter(Boolean).map(e => { A.newProps(e); delete e.lt; return e; }); if(!add.length){ log('Không tạo được khối.'); return []; } A.commit({ add }, msg || ('Đã tạo ' + add.length + ' khối 3D')); log((msg || 'Đã tạo khối 3D') + ' — gõ 3DORBIT (hoặc nút 3D) để xem.'); return add; }
  cmd(['BOX'], 'Khối hộp 3D (2 góc đáy + chiều cao)', async () => {
    const a = await A.getPoint('Chỉ định góc thứ nhất của đáy'); if(!a.pt) return;
    const b = await A.getPoint('Chỉ định góc đối diện (hoặc @dài,rộng)', { base: a.pt, rubber: false, preview: (g, p) => g.poly([a.pt, { x: p.x, y: a.pt.y }, p, { x: a.pt.x, y: p.y }], true) }); if(!b.pt) return;
    const h = await askH('Chiều cao hộp', b.pt); if(h == null) return;
    const p = [a.pt, { x: b.pt.x, y: a.pt.y }, b.pt, { x: a.pt.x, y: b.pt.y }]; addSolids([await makeExt(p, [], await askZ0(), h)], 'Đã tạo khối hộp');
  });
  cmd(['CYLINDER', 'CYL'], 'Khối trụ 3D (tâm, bán kính, chiều cao)', async () => {
    const c = await A.getPoint('Chỉ định tâm đáy'); if(!c.pt) return;
    const r = await A.getDist('Bán kính', { base: c.pt, preview: (g, p) => g.circle(c.pt, Math.hypot(p.x - c.pt.x, p.y - c.pt.y)) }); const R = r.num; if(!(R > 0)) return;
    const h = await askH('Chiều cao trụ'); if(h == null) return;
    const z0 = await askZ0(); addSolids([{ type: 'SOLID3D', k: 'cone', cx: c.pt.x, cy: c.pt.y, r: R, r2: R, z0: z0 + (h < 0 ? h : 0), h: Math.abs(h) }], 'Đã tạo khối trụ');
  });
  cmd(['CONE'], 'Khối nón / nón cụt 3D', async () => {
    const c = await A.getPoint('Chỉ định tâm đáy'); if(!c.pt) return;
    const r = await A.getDist('Bán kính đáy', { base: c.pt, preview: (g, p) => g.circle(c.pt, Math.hypot(p.x - c.pt.x, p.y - c.pt.y)) }); const R = r.num; if(!(R > 0)) return;
    const r2 = await A.getDist('Bán kính đỉnh (0 = nón nhọn)', { def: 0 }); const R2 = Math.max(0, r2.num || 0);
    const h = await askH('Chiều cao nón'); if(h == null) return;
    addSolids([{ type: 'SOLID3D', k: 'cone', cx: c.pt.x, cy: c.pt.y, r: R, r2: R2, z0: await askZ0(), h: Math.abs(h) }], 'Đã tạo khối nón');
  });
  cmd(['SPHERE'], 'Khối cầu 3D', async () => {
    const c = await A.getPoint('Chỉ định tâm'); if(!c.pt) return;
    const r = await A.getDist('Bán kính', { base: c.pt, preview: (g, p) => g.circle(c.pt, Math.hypot(p.x - c.pt.x, p.y - c.pt.y)) }); const R = r.num; if(!(R > 0)) return;
    addSolids([{ type: 'SOLID3D', k: 'sph', cx: c.pt.x, cy: c.pt.y, r: R, z0: (await askZ0()) + R }], 'Đã tạo khối cầu');
  });
  function sampleClosed(e){
    if(e.type === 'POLYLINE' && (e.closed || (e.vertices.length > 3 && Math.hypot(e.vertices[0].x - e.vertices[e.vertices.length - 1].x, e.vertices[0].y - e.vertices[e.vertices.length - 1].y) < 1e-9))) return e.vertices.map(p => ({ x: p.x, y: p.y }));
    if(e.type === 'ELLIPSE'){ try{ return smpEllipse(e).slice(0, -1); }catch(_){ return null; } }
    if(e.type === 'SOLID' && !e.face){ const p = e.pts; return p.length === 4 ? [p[0], p[1], p[3], p[2]] : p.slice(); }
    return null;
  }
  async function extrudeEnts(sel, h){
    const out = [];
    for(const e of sel){
      if(e.type === 'CIRCLE'){ out.push({ type: 'SOLID3D', k: 'cone', cx: e.cx, cy: e.cy, r: e.r, r2: e.r, z0: (MEM.z03 || 0) + (h < 0 ? h : 0), h: Math.abs(h), layer: e.layer, col: e.col, bl: e.bl }); continue; }
      if(e.type === 'HATCH'){ const L = (e.loops || []).filter(l => l.length >= 3); if(!L.length) continue; L.sort((a, b) => Math.abs(area2(b)) - Math.abs(area2(a))); const s = await makeExt(L[0], L.slice(1), MEM.z03 || 0, h); if(s){ s.layer = e.layer; s.col = e.col; out.push(s); } continue; }
      const p = sampleClosed(e); if(!p) continue; const s = await makeExt(p, [], MEM.z03 || 0, h); if(s){ s.layer = e.layer; s.col = e.col; if(e.bl) s.bl = 1; out.push(s); }
    }
    return out;
  }
  cmd(['EXTRUDE', 'EXT'], 'Đùn hình kín (đa tuyến kín, tròn, elip, hatch) thành khối 3D', async () => {
    const s = await A.getSel('Chọn hình kín cần đùn'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const ok = sel.filter(e => e.type === 'CIRCLE' || e.type === 'HATCH' || sampleClosed(e)); if(!ok.length){ log('Không có hình kín nào (cần đa tuyến kín, đường tròn, elip, hatch).'); return; }
    const h = await askH('Chiều cao đùn'); if(h == null) return;
    const list = await extrudeEnts(ok, h); const add = list.map(e => { if(e.layer == null) A.newProps(e); delete e.lt; return e; });
    if(!add.length){ log('Không tạo được khối.'); return; }
    A.commit({ add }, 'Đã đùn ' + add.length + ' khối 3D'); log('Đã đùn ' + add.length + ' hình (cao ' + Math.abs(h) + '). Hình 2D gốc vẫn giữ — xem 3D: 3DORBIT.');
  });
  cmd(['PRESSPULL', 'PP'], 'Bấm vào trong vùng kín rồi kéo thành khối 3D', async () => {
    for(;;){
      const r = await A.getPoint('Bấm vào trong vùng kín (Enter để xong)'); if(!r.pt) return;
      const b = A.findBoundary ? A.findBoundary(r.pt) : null; if(!b || !b.loops || !b.loops.length){ log('Không tìm thấy vùng kín ở đây.'); continue; }
      const h = await askH('Chiều cao'); if(h == null) return;
      const L = b.loops.slice().sort((x, y) => Math.abs(area2(y)) - Math.abs(area2(x)));
      addSolids([await makeExt(L[0], L.slice(1), MEM.z03 || 0, h)], 'Đã kéo vùng thành khối 3D');
    }
  });
  cmd(['WALL3D', 'TUONG3D', 'TUONG'], 'Dựng tường 3D từ đường trục / nét tường trên mặt bằng', async () => {
    const s = await A.getSel('Chọn đường trục tường (LINE / đa tuyến)', { filter: e => e.type === 'LINE' || e.type === 'POLYLINE' }); const sel = (s.sel || []).filter(e => e.type === 'LINE' || e.type === 'POLYLINE'); if(!sel.length) return;
    const t = await A.getDist('Bề dày tường', { def: MEM.wt3 || 220 }); const T = t.num > 0 ? t.num : (MEM.wt3 || 220); MEM.wt3 = T;
    const h = await A.getDist('Chiều cao tường', { def: MEM.wh3 || 3300 }); const H = h.num > 0 ? h.num : (MEM.wh3 || 3300); MEM.wh3 = H;
    const segs = []; for(const e of sel){ if(e.type === 'LINE') segs.push([{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }]); else { const v = e.vertices; const m = e.closed ? v.length : v.length - 1; for(let i = 0; i < m; i++) segs.push([v[i], v[(i + 1) % v.length]]); } }
    const out = [];
    for(const [a, b] of segs){ const L = Math.hypot(b.x - a.x, b.y - a.y); if(L < 1e-9) continue; const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, nx = -uy * T / 2, ny = ux * T / 2, ex = ux * T / 2, ey = uy * T / 2;   // kéo dài nửa bề dày để góc tường kín
      out.push(await makeExt([{ x: a.x - ex + nx, y: a.y - ey + ny }, { x: b.x + ex + nx, y: b.y + ey + ny }, { x: b.x + ex - nx, y: b.y + ey - ny }, { x: a.x - ex - nx, y: a.y - ey - ny }], [], MEM.z03 || 0, H)); }
    addSolids(out, 'Đã dựng ' + out.filter(Boolean).length + ' đoạn tường 3D');
  });

  /* ---------------- XUẤT STL / OBJ ---------------- */
  function allMeshes(sel){ const out = []; for(const e of (sel || modelEntities)){ if(!is3D(e)) continue; try{ if(A.isHiddenE && A.isHiddenE(e)) continue; }catch(_){} const m = meshOf(e); if(m && m.i.length) out.push({ e, m }); } return out; }
  function exportSTL(){
    const L = allMeshes(); if(!L.length){ say('Bản vẽ chưa có khối 3D.'); return; }
    let nt = 0; for(const { m } of L) nt += m.i.length / 3;
    const buf = new ArrayBuffer(84 + nt * 50), dv = new DataView(buf); const hdr = 'DVDCAD STL'; for(let i = 0; i < hdr.length; i++) dv.setUint8(i, hdr.charCodeAt(i)); dv.setUint32(80, nt, true);
    let o = 84; const k = (typeof unitToMM === 'function' && unitToMM()) || 1;   // STL tính bằng mm
    for(const { m } of L){ const p = m.p; for(let t = 0; t < m.i.length; t += 3){ const a = m.i[t] * 3, b = m.i[t + 1] * 3, c = m.i[t + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
      for(const q of [a, b, c]){ dv.setFloat32(o, p[q] * k, true); dv.setFloat32(o + 4, p[q + 1] * k, true); dv.setFloat32(o + 8, p[q + 2] * k, true); o += 12; } dv.setUint16(o, 0, true); o += 2; } }
    shareOrDownload(new Blob([buf], { type: 'model/stl' }), String(currentName || 'mohinh').replace(/\.[^.]+$/, '') + '.stl', 'model/stl'); log('Đã xuất STL: ' + L.length + ' khối, ' + nt + ' tam giác (đơn vị mm).');
  }
  function exportOBJ(){
    const L = allMeshes(); if(!L.length){ say('Bản vẽ chưa có khối 3D.'); return; }
    const lines = ['# DVDCAD OBJ', 'mtllib ' + 'mohinh.mtl']; const mtl = []; const mats = new Map(); let base = 1;
    for(const { e, m } of L){ const col = String(e.col || '#cccccc').toLowerCase(); if(!mats.has(col)){ const nm = 'm' + mats.size; mats.set(col, nm); const n = parseInt(col.replace('#', ''), 16) || 0xcccccc; mtl.push('newmtl ' + nm, 'Kd ' + (((n >> 16) & 255) / 255).toFixed(3) + ' ' + (((n >> 8) & 255) / 255).toFixed(3) + ' ' + ((n & 255) / 255).toFixed(3), ''); }
      lines.push('o ' + (e.layer || '0') + '_' + base, 'usemtl ' + mats.get(col)); for(let i = 0; i < m.p.length; i += 3) lines.push('v ' + m.p[i].toFixed(4) + ' ' + m.p[i + 2].toFixed(4) + ' ' + (-m.p[i + 1]).toFixed(4));   // OBJ: trục Y hướng lên
      for(let t = 0; t < m.i.length; t += 3) lines.push('f ' + (m.i[t] + base) + ' ' + (m.i[t + 1] + base) + ' ' + (m.i[t + 2] + base)); base += m.p.length / 3; }
    const nm = String(currentName || 'mohinh').replace(/\.[^.]+$/, '');
    shareOrDownload(new Blob([lines.join('\n').replace('mohinh.mtl', nm + '.mtl')], { type: 'text/plain' }), nm + '.obj', 'text/plain');
    setTimeout(() => shareOrDownload(new Blob([mtl.join('\n')], { type: 'text/plain' }), nm + '.mtl', 'text/plain'), 600);
    log('Đã xuất OBJ (+ MTL màu): ' + L.length + ' khối. Mở được bằng SketchUp, Blender, 3ds Max…');
  }
  plain(['EXPORTSTL', 'STLOUT'], 'Xuất khối 3D ra STL (in 3D, phần mềm 3D)', () => exportSTL());
  plain(['EXPORTOBJ', 'OBJOUT'], 'Xuất khối 3D ra OBJ (SketchUp, Blender, 3ds Max)', () => exportOBJ());

  /* ---------------- VẬT LIỆU (MATERIALS) ---------------- */
  const MATS = {
    concrete: { n: 'Bê tông', c: '#a9aaa5', r: .95, tex: 'noise', ts: 800 },
    brick: { n: 'Gạch xây', c: '#b5583a', r: .9, tex: 'brick', ts: 600 },
    tile: { n: 'Gạch lát nền', c: '#d9d2c5', r: .45, tex: 'tile', ts: 1200 },
    wood: { n: 'Gỗ', c: '#a0703f', r: .7, tex: 'wood', ts: 900 },
    stone: { n: 'Đá ốp', c: '#9c958a', r: .8, tex: 'stone', ts: 1200 },
    roof: { n: 'Ngói', c: '#9a4b32', r: .8, tex: 'roof', ts: 900 },
    grass: { n: 'Cỏ', c: '#5f8f3a', r: 1, tex: 'grass', ts: 1500 },
    paint: { n: 'Sơn trắng', c: '#efeee9', r: .9 },
    glass: { n: 'Kính', c: '#9fc8e6', r: .05, op: .35 },
    metal: { n: 'Kim loại', c: '#b9c0c8', r: .3, m: .85 },
    water: { n: 'Nước', c: '#3f7fb5', r: .1, op: .6 }
  };
  A.MATS = MATS;
  const _tex = {};
  function texCanvas(kind, base){
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
    g.fillStyle = base; g.fillRect(0, 0, N, N);
    if(kind === 'noise' || kind === 'stone'){ for(let i = 0; i < (kind === 'stone' ? 900 : 4000); i++){ g.fillStyle = shade(base, 0.85 + rnd() * 0.3); const s = kind === 'stone' ? 4 + rnd() * 14 : 1 + rnd() * 2; g.fillRect(rnd() * N, rnd() * N, s, s); } if(kind === 'stone'){ g.strokeStyle = shade(base, .7); g.lineWidth = 2; for(let y = 0; y <= N; y += N / 2){ g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); } for(let r = 0; r < 2; r++){ const o = r % 2 ? N / 4 : 0; for(let x = o; x <= N; x += N / 2){ g.beginPath(); g.moveTo(x, r * N / 2); g.lineTo(x, (r + 1) * N / 2); g.stroke(); } } } }
    if(kind === 'brick'){ const rh = N / 4, bw = N / 2; for(let r = 0; r < 4; r++){ const o = r % 2 ? bw / 2 : 0; for(let x = -bw + o; x < N; x += bw){ g.fillStyle = shade(base, 0.85 + rnd() * 0.3); g.fillRect(x + 3, r * rh + 3, bw - 6, rh - 6); } } g.globalAlpha = .25; for(let i = 0; i < 2500; i++){ g.fillStyle = shade(base, .6 + rnd() * .8); g.fillRect(rnd() * N, rnd() * N, 1.5, 1.5); } g.globalAlpha = 1; g.fillStyle = '#cfc8bc'; for(let r = 0; r <= 4; r++) g.fillRect(0, r * rh - 3, N, 6); for(let r = 0; r < 4; r++){ const o = r % 2 ? bw / 2 : 0; for(let x = o; x <= N; x += bw) g.fillRect(x - 3, r * rh, 6, rh); } }
    if(kind === 'tile'){ for(let i = 0; i < 2; i++) for(let j = 0; j < 2; j++){ g.fillStyle = shade(base, .94 + rnd() * .1); g.fillRect(i * N / 2 + 2, j * N / 2 + 2, N / 2 - 4, N / 2 - 4); } g.fillStyle = '#8f887c'; for(let k = 0; k <= 2; k++){ g.fillRect(0, k * N / 2 - 2, N, 4); g.fillRect(k * N / 2 - 2, 0, 4, N); } }
    if(kind === 'wood'){ for(let y = 0; y < N; y++){ const v = 0.82 + 0.18 * Math.sin(y * 0.35 + Math.sin(y * 0.05) * 4) + (rnd() - .5) * .08; g.fillStyle = shade(base, v); g.fillRect(0, y, N, 1); } g.fillStyle = shade(base, .55); for(let k = 0; k < 4; k++) g.fillRect(0, k * N / 4, N, 2); }
    if(kind === 'grass'){ for(let i = 0; i < 6000; i++){ g.strokeStyle = shade(base, .7 + rnd() * .6); g.beginPath(); const x = rnd() * N, y = rnd() * N; g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 4, y - 3 - rnd() * 5); g.stroke(); } }
    if(kind === 'roof'){ const rh = N / 6; for(let r = 0; r < 6; r++){ g.fillStyle = shade(base, .9 + (r % 2) * .12); g.fillRect(0, r * rh, N, rh); g.fillStyle = shade(base, .6); g.fillRect(0, r * rh + rh - 4, N, 4); for(let x = 0; x < N; x += N / 8){ g.fillStyle = shade(base, .72); g.fillRect(x, r * rh, 2, rh); } } }
    return cv;
  }
  function texOf(T, key){ if(_tex[key]) return _tex[key]; const M = MATS[key]; const t = new T.CanvasTexture(texCanvas(M.tex, M.c)); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; _tex[key] = t; return t; }
  // toạ độ UV kiểu chiếu hộp (box mapping) theo kích thước mẫu vật liệu
  function boxUV(T, g, ts){ const P = g.attributes.position, Nn = g.attributes.normal, n = P.count, uv = new Float32Array(n * 2);
    for(let i = 0; i < n; i++){ const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(Nn.getX(i)), ay = Math.abs(Nn.getY(i)), az = Math.abs(Nn.getZ(i)); let u, v; if(az >= ax && az >= ay){ u = x; v = y; } else if(ax >= ay){ u = y; v = z; } else { u = x; v = z; } uv[i * 2] = u / ts; uv[i * 2 + 1] = v / ts; }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2)); }

  /* ---------------- KHUNG NHÌN 3D ---------------- */
  const V = { open: false, style: localStorage.getItem('dvd:3dstyle') || 'shedge', persp: localStorage.getItem('dvd:3dpersp') !== '0', show2d: localStorage.getItem('dvd:3d2d') !== '0' };
  let R3 = null;   // trạng thái renderer
  const CSS = `
  #dvd3d{position:absolute;inset:0;z-index:40;background:linear-gradient(#3b4250,#20252d);touch-action:none;overflow:hidden}
  #dvd3d canvas.c3{position:absolute !important;inset:0;width:100%;height:100%;display:block}
  #dvd3d .t3{position:absolute;left:8px;top:8px;display:flex;flex-wrap:wrap;gap:4px;max-width:calc(100% - 150px);z-index:2}
  #dvd3d .t3 button,#dvd3d .t3 select{height:28px;border-radius:5px;border:1px solid #556071;background:rgba(32,38,48,.88);color:#e6eaf0;font:12px system-ui,sans-serif;padding:0 8px;cursor:pointer}
  #dvd3d .t3 button:hover{background:#3d4757} #dvd3d .t3 button.on{background:#2f6fd0;border-color:#4a8be8}
  #dvd3d .t3 .x{background:#5a2f2f;border-color:#9a4a4a}
  #dvd3d .vc{position:absolute;right:22px;top:22px;width:96px;height:96px;perspective:400px;z-index:2}
  #dvd3d .vc .cube{position:absolute;inset:16px;transform-style:preserve-3d}
  #dvd3d .vc .f{position:absolute;width:64px;height:64px;display:grid;place-items:center;background:rgba(220,226,235,.9);border:1px solid #7d8796;color:#2a313b;font:700 10px system-ui,sans-serif;cursor:pointer;user-select:none;backface-visibility:hidden}
  #dvd3d .vc .f:hover{background:#9cc8ff}
  #dvd3d .vc .ring{position:absolute;left:4px;top:58px;width:88px;height:22px;border-radius:50%;border:2px solid rgba(200,210,225,.35)}
  #dvd3d .hint{position:absolute;left:10px;bottom:10px;color:#aab3c0;font:12px system-ui,sans-serif;background:rgba(20,24,32,.6);padding:4px 8px;border-radius:5px;pointer-events:none}
  #dvd3d .home{position:absolute;right:30px;top:124px;z-index:2;height:26px;border-radius:5px;border:1px solid #556071;background:rgba(32,38,48,.88);color:#e6eaf0;font:12px system-ui;cursor:pointer;padding:0 8px}
  #dvd3d .t3 .vsel{display:none}
  @media (max-width:760px){ #dvd3d .t3 button[data-v]{display:none} #dvd3d .t3 .vsel{display:inline-block} #dvd3d .hint{font-size:11px;right:10px} }
  html:not(.acad) #dvd3d .t3{max-width:calc(100% - 130px)} html:not(.acad) #dvd3d .vc{right:8px;top:8px;transform:scale(.85)}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const VIEWS = { top: [0, 89.9], bottom: [0, -89.9], front: [-90, 0], back: [90, 0], left: [180, 0], right: [0, 0], sw: [-135, 30], se: [-45, 30], ne: [45, 30], nw: [135, 30] };
  const VN = { top: 'Trên', bottom: 'Dưới', front: 'Trước', back: 'Sau', left: 'Trái', right: 'Phải', sw: 'ISO TN', se: 'ISO ĐN', ne: 'ISO ĐB', nw: 'ISO TB' };
  function sceneBounds(meshes){ let a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity]; for(const { m } of meshes) for(let i = 0; i < m.p.length; i += 3) for(let k = 0; k < 3; k++){ const v = m.p[i + k]; if(v < a[k]) a[k] = v; if(v > b[k]) b[k] = v; } return a[0] <= b[0] ? { a, b } : null; }
  function lines2D(maxSeg){
    const P = [], C = []; let n = 0; const vb = (() => { try{ return null; }catch(_){ return null; } })(); void vb;
    const push = (x1, y1, x2, y2, col) => { if(n >= maxSeg) return; P.push(x1, y1, 0, x2, y2, 0); const c = parseInt(String(col || '#c8ccd2').replace('#', ''), 16) || 0xc8ccd2; const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255; C.push(r, g, b, r, g, b); n++; };
    for(const e of modelEntities){
      if(n >= maxSeg) break; if(is3D(e) || e.type === 'TEXT' || e.type === 'HATCH' || e.type === 'IMAGE' || e.type === 'XLINE'){ continue; } try{ if(A.isHiddenE(e)) continue; }catch(_){}
      const col = e.col;
      if(e.type === 'LINE') push(e.x1, e.y1, e.x2, e.y2, col);
      else if(e.type === 'POLYLINE'){ const v = e.vertices || []; for(let i = 1; i < v.length; i++) push(v[i - 1].x, v[i - 1].y, v[i].x, v[i].y, col); if(e.closed && v.length > 2) push(v[v.length - 1].x, v[v.length - 1].y, v[0].x, v[0].y, col); }
      else if(e.type === 'CIRCLE' || e.type === 'ARC' || e.type === 'ELLIPSE'){ let pts; try{ pts = e.type === 'CIRCLE' ? smpCircle(e.cx, e.cy, e.r) : e.type === 'ARC' ? smpArc(e.cx, e.cy, e.r, e.a1, e.a2) : smpEllipse(e); }catch(_){ pts = null; } if(pts) for(let i = 1; i < pts.length; i++) push(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, col); }
      else if(e.type === 'SOLID'){ const p = e.pts; const o = p.length === 4 ? [p[0], p[1], p[3], p[2]] : p; for(let i = 0; i < o.length; i++){ const a = o[i], b = o[(i + 1) % o.length]; push(a.x, a.y, b.x, b.y, col); } }
    }
    return { P, C, n };
  }
  async function open3D(opt){
    opt = opt || {};
    if(!hasDoc()){ say('Mở bản vẽ trước.'); return; }
    if(V.open){ return; }
    let T; try{ T = await load3(); }catch(err){ say('Không tải được bộ vẽ 3D (cần mạng lần đầu).'); return; }
    if(!opt.keep && A.busy()) A.cancel(true);
    V.open = true;
    const stage = document.querySelector('.stage');
    const ov = document.createElement('div'); ov.id = 'dvd3d';
    ov.innerHTML = '<div class="t3"><button class="x" data-a="close" title="Về bản vẽ 2D (Esc)">✕ 2D</button>' + ['top', 'front', 'right', 'left', 'back', 'sw', 'se', 'ne', 'nw'].map(k => '<button data-v="' + k + '">' + VN[k] + '</button>').join('') +
      '<select data-a="views" class="vsel" title="Góc nhìn"><option value="">Góc nhìn…</option>' + Object.keys(VN).map(k => '<option value="' + k + '">' + VN[k] + '</option>').join('') + '</select>' +
      '<select data-a="style" title="Kiểu hiển thị (Visual style)"><option value="wire">Khung dây</option><option value="shade">Tô bóng</option><option value="shedge">Tô bóng + cạnh</option><option value="xray">X-quang</option><option value="real">Thực tế (vật liệu, bóng đổ)</option></select>' +
      '<button data-a="persp" title="Phối cảnh / song song">' + (V.persp ? 'Phối cảnh' : 'Song song') + '</button><button data-a="2d" class="' + (V.show2d ? 'on' : '') + '" title="Hiện nét 2D ở cao độ 0">Nét 2D</button><button data-a="cut" title="Mặt cắt ngang (section plane)">Cắt</button><input type="range" data-a="cutz" min="0" max="1000" value="500" title="Cao độ mặt cắt" style="display:none;width:120px"><button data-a="flat" title="Chiếu thành hình 2D theo góc nhìn này (FLATSHOT)">Chiếu 2D</button><button data-a="png" title="Lưu ảnh PNG">Ảnh</button><button data-a="stl">STL</button><button data-a="obj">OBJ</button></div>' +
      '<div class="vc"><div class="cube">' + [['top', 'TRÊN'], ['bottom', 'DƯỚI'], ['front', 'TRƯỚC'], ['back', 'SAU'], ['left', 'TRÁI'], ['right', 'PHẢI']].map(([k, t]) => '<div class="f" data-v="' + k + '">' + t + '</div>').join('') + '</div></div><button class="home" data-v="se" title="Về góc nhìn ISO">⌂</button>' +
      '<div class="hint">' + (matchMedia('(pointer:coarse)').matches ? '1 ngón: xoay · 2 ngón: dời + phóng · Chạm đúp: vừa màn hình' : 'Kéo trái: xoay · Kéo phải / giữa / Shift: dời · Lăn: phóng · Kích đúp: vừa màn hình · Esc: về 2D') + '</div>';
    stage.appendChild(ov); ov.querySelector('select[data-a="style"]').value = V.style;
    const cv3 = document.createElement('canvas'); cv3.className = 'c3'; ov.insertBefore(cv3, ov.firstChild);
    const renderer = new T.WebGLRenderer({ canvas: cv3, antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x50555e, 0.75));
    const sun = new T.DirectionalLight(0xffffff, 0.9); sun.position.set(0.6, -1.0, 1.6); scene.add(sun); scene.add(sun.target);
    const sun2 = new T.DirectionalLight(0xffffff, 0.25); sun2.position.set(-1, 0.8, 0.4); scene.add(sun2);
    const root = new T.Group(); scene.add(root);
    // khối 3D
    const meshes0 = allMeshes(); const solids = []; const mats = new Map();
    // gộp các mặt 3DFACE cùng màu thành 1 lưới (để cạnh chung giữa các tam giác không bị vẽ)
    const meshes = [], fg = new Map();
    const many = meshes0.length > 200;   // nhiều khối: gộp theo màu để vẽ nhanh (ít lệnh vẽ)
    for(const it of meshes0){ if(it.e.type !== 'SOLID' && !many){ meshes.push(it); continue; } const sm = !!it.m.smooth, k = String(it.e.col || '#cccccc') + (sm ? '|s' : '|f') + '|' + (it.e.mat || ''); let g = fg.get(k); if(!g){ g = { e: { col: String(it.e.col || '#cccccc'), mat: it.e.mat }, m: { p: [], i: [], flat: !sm, smooth: sm }, iso: [] }; fg.set(k, g); meshes.push(g); } const b = g.m.p.length / 3; for(const v of it.m.p) g.m.p.push(v); for(const i of it.m.i) g.m.i.push(i + b); const ip = isoLines(it.e); for(const v of ip) g.iso.push(v); }
    const matOf = col => { col = String(col || '#cccccc'); if(!mats.has(col)) mats.set(col, new T.MeshLambertMaterial({ color: new T.Color(col), side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })); return mats.get(col); };
    const edgeMat = new T.LineBasicMaterial({ color: 0x0d1015 }), wireMat = new T.LineBasicMaterial({ color: 0xd8dee8 });
    const U = (typeof unitToMM === 'function' && unitToMM()) || 1, stds = new Map();
    const stdOf = (col, mk) => { const key = (col || '') + '|' + (mk || ''); if(stds.has(key)) return stds.get(key); const M = MATS[mk];
      const o = { side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
      if(M){ o.color = new T.Color(M.tex ? '#ffffff' : M.c); o.roughness = M.r; o.metalness = M.m || 0; if(M.tex) o.map = texOf(T, mk); if(M.op){ o.transparent = true; o.opacity = M.op; o.depthWrite = false; } }
      else { o.color = new T.Color(col || '#cccccc'); o.roughness = .75; o.metalness = 0; }
      const m = new T.MeshStandardMaterial(o); stds.set(key, m); return m; };
    for(const { e, m, iso: isoP } of meshes){
      let g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(m.p, 3)); g.setIndex(m.i);
      if(m.flat){ g = g.toNonIndexed(); } g.computeVertexNormals();
      if(e.mat && MATS[e.mat] && MATS[e.mat].tex) boxUV(T, g, MATS[e.mat].ts / U);
      const mesh = new T.Mesh(g, matOf(e.mat && MATS[e.mat] ? MATS[e.mat].c : e.col)); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
      const eg = new T.EdgesGeometry(g, 25); const ed = new T.LineSegments(eg, edgeMat); root.add(ed);
      let iso = null; const IP = isoP || isoLines(e); if(IP.length){ const ig = new T.BufferGeometry(); ig.setAttribute('position', new T.Float32BufferAttribute(IP, 3)); iso = new T.LineSegments(ig, wireMat); iso.visible = false; root.add(iso); }
      solids.push({ mesh, ed, iso, col: e.col, lam: mesh.material, std: stdOf(e.col, e.mat) });
    }
    // nét 2D ở z = 0
    let l2 = null;
    const build2D = () => { if(l2){ root.remove(l2); l2.geometry.dispose(); l2 = null; } if(!V.show2d) return; const L = lines2D(400000); if(!L.n) return; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(L.P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(L.C, 3)); l2 = new T.LineSegments(g, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 })); root.add(l2); };
    build2D();
    // khung bao
    let bb = sceneBounds(meshes);
    if(!bb){ let a = [Infinity, Infinity, 0], b = [-Infinity, -Infinity, 0]; for(const e of modelEntities){ const x = entBBox(e); if(!x) continue; a[0] = Math.min(a[0], x.x0); a[1] = Math.min(a[1], x.y0); b[0] = Math.max(b[0], x.x1); b[1] = Math.max(b[1], x.y1); } bb = isFinite(a[0]) ? { a, b } : { a: [0, 0, 0], b: [1000, 1000, 1000] }; }
    const ctr = new T.Vector3((bb.a[0] + bb.b[0]) / 2, (bb.a[1] + bb.b[1]) / 2, (bb.a[2] + bb.b[2]) / 2);
    const size = Math.max(bb.b[0] - bb.a[0], bb.b[1] - bb.a[1], bb.b[2] - bb.a[2], 1e-6);
    // lưới mặt đất
    const gsz = Math.pow(10, Math.ceil(Math.log10(size * 1.5))); const grid = new T.GridHelper(gsz, 20, 0x6b7586, 0x4a5262); grid.rotation.x = Math.PI / 2; grid.position.set(ctr.x, ctr.y, Math.min(0, bb.a[2]) - size * 1e-4); grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
    const axes = new T.AxesHelper(size * 0.15); axes.position.set(bb.a[0], bb.a[1], 0); scene.add(axes);
    const zg = Math.min(0, bb.a[2]);
    const ground = new T.Mesh(new T.PlaneGeometry(gsz, gsz), new T.ShadowMaterial({ opacity: 0.28 })); ground.position.set(ctr.x, ctr.y, zg - size * 2e-4); ground.receiveShadow = true; ground.visible = false; scene.add(ground);
    { const R = size * 0.9; sun.target.position.copy(ctr); sun.position.set(ctr.x + size * 0.7, ctr.y - size * 1.1, ctr.z + size * 1.8); const sc = sun.shadow.camera; sc.left = -R * 1.4; sc.right = R * 1.4; sc.top = R * 1.4; sc.bottom = -R * 1.4; sc.near = size * 0.1; sc.far = size * 6; sc.updateProjectionMatrix(); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = size * 0.002; }
    let env = null; const envMap = () => { if(env) return env; const pm = new T.PMREMGenerator(renderer); const es = new T.Scene(); const sg = new T.SphereGeometry(1, 32, 16); const cols = []; const pa = sg.attributes.position; for(let i = 0; i < pa.count; i++){ const z = pa.getY(i); const c = z > 0 ? new T.Color('#cfe3ff').lerp(new T.Color('#ffffff'), 1 - z) : new T.Color('#6b6359'); cols.push(c.r, c.g, c.b); } sg.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); es.add(new T.Mesh(sg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide }))); env = pm.fromScene(es, 0.02).texture; pm.dispose(); return env; };
    // mặt cắt ngang (section plane): giữ phần có z ≤ cao độ cắt
    const zr = [bb.a[2], bb.b[2] > bb.a[2] ? bb.b[2] : bb.a[2] + size]; const cutPlane = new T.Plane(new T.Vector3(0, 0, -1), 0);
    const cutZ = () => zr[0] + (zr[1] - zr[0]) * (V.cutF == null ? 0.5 : V.cutF);
    const applyCut = () => { cutPlane.constant = cutZ(); renderer.clippingPlanes = V.cut ? [cutPlane] : []; const inp = ov.querySelector('[data-a="cutz"]'); if(inp){ inp.style.display = V.cut ? '' : 'none'; inp.value = Math.round((V.cutF == null ? .5 : V.cutF) * 1000); } const b = ov.querySelector('[data-a="cut"]'); if(b) b.classList.toggle('on', !!V.cut); need = true; };
    // camera (Z hướng lên như AutoCAD)
    const pc = new T.PerspectiveCamera(40, 1, size / 1000, size * 200); pc.up.set(0, 0, 1);
    const oc = new T.OrthographicCamera(-1, 1, 1, -1, -size * 100, size * 200); oc.up.set(0, 0, 1);
    const S = { target: ctr.clone(), az: -45 * D2R, el: 30 * D2R, dist: size * 1.8 };
    const cam = () => V.persp ? pc : oc;
    let need = true;
    function place(){
      const W = ov.clientWidth || 1, H = ov.clientHeight || 1; renderer.setSize(W, H, false);
      const el = Math.max(-89.9 * D2R, Math.min(89.9 * D2R, S.el));
      const dir = new T.Vector3(Math.cos(el) * Math.cos(S.az), Math.cos(el) * Math.sin(S.az), Math.sin(el));
      for(const c of [pc, oc]){ c.position.copy(S.target).addScaledVector(dir, S.dist); c.up.set(0, 0, 1); if(Math.abs(el) > 89 * D2R) c.up.set(-Math.cos(S.az) * Math.sign(el), -Math.sin(S.az) * Math.sign(el), 0); c.lookAt(S.target); c.updateMatrixWorld(true); }
      pc.aspect = W / H; pc.near = Math.max(S.dist / 2000, size / 1e5); pc.far = S.dist * 50 + size * 10; pc.updateProjectionMatrix();
      const hh = S.dist * Math.tan(20 * D2R); oc.left = -hh * W / H; oc.right = hh * W / H; oc.top = hh; oc.bottom = -hh; oc.near = -size * 50 - S.dist; oc.far = S.dist + size * 50; oc.updateProjectionMatrix();
      // ViewCube theo hướng camera
      const cube = ov.querySelector('.cube'); if(cube){ const m = new T.Matrix4().extractRotation(cam().matrixWorldInverse); const e = m.elements; cube.style.transform = 'matrix3d(' + [e[0], -e[1], e[2], 0, e[4], -e[5], e[6], 0, e[8], -e[9], e[10], 0, 0, 0, 0, 1].map(v => +v.toFixed(6)).join(',') + ')'; }
    }
    // mặt ViewCube (hệ Z-up: trên = +Z, trước = -Y, phải = +X)
    // mỗi mặt: cột (phải, −lên, pháp tuyến) trong hệ thế giới; khối cha đổi thế giới → màn hình
    (() => { const F = { top: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], bottom: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], front: [[1, 0, 0], [0, 0, 1], [0, -1, 0]], back: [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], right: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], left: [[0, -1, 0], [0, 0, 1], [-1, 0, 0]] };
      ov.querySelectorAll('.cube .f').forEach(d => { const [r, u, n] = F[d.dataset.v]; d.style.transform = 'matrix3d(' + [r[0], r[1], r[2], 0, -u[0], -u[1], -u[2], 0, n[0], n[1], n[2], 0, n[0] * 32, n[1] * 32, n[2] * 32, 1].join(',') + ')'; }); })();
    function applyStyle(){
      const s = V.style, real = s === 'real';
      for(const o of solids){ o.mesh.visible = s !== 'wire'; o.mesh.material = real ? o.std : o.lam; o.ed.visible = s !== 'shade' && !real; o.ed.material = s === 'wire' ? wireMat : edgeMat; if(o.iso) o.iso.visible = s === 'wire' || s === 'xray'; }
      ground.visible = real; sun.castShadow = real; sun.intensity = real ? 1.6 : 0.9; scene.environment = real ? envMap() : null; renderer.toneMapping = real ? T.ACESFilmicToneMapping : T.NoToneMapping;
      for(const m of mats.values()){ m.transparent = s === 'xray'; m.opacity = s === 'xray' ? 0.4 : 1; m.depthWrite = s !== 'xray'; m.needsUpdate = true; }
      need = true;
    }
    applyStyle();
    // FLATSHOT: chiếu song song theo hướng nhìn hiện tại, khử nét khuất bằng bộ đệm độ sâu
    const _ed = new Map();
    function flatshot(){
      place();
      const el = Math.max(-89.9 * D2R, Math.min(89.9 * D2R, S.el)); const dir = [Math.cos(el) * Math.cos(S.az), Math.cos(el) * Math.sin(S.az), Math.sin(el)];
      const Rr = Math.hypot(bb.b[0] - bb.a[0], bb.b[1] - bb.a[1], bb.b[2] - bb.a[2]) / 2 || size, D = Rr * 3;
      const fc = new T.OrthographicCamera(-Rr * 1.02, Rr * 1.02, Rr * 1.02, -Rr * 1.02, D - Rr * 1.05, D + Rr * 1.05);
      fc.up.copy(oc.up); fc.position.set(ctr.x + dir[0] * D, ctr.y + dir[1] * D, ctr.z + dir[2] * D); fc.lookAt(ctr); fc.updateMatrixWorld(true); fc.updateProjectionMatrix();
      const W = 2048, H = 2048, rt = new T.WebGLRenderTarget(W, H);
      const dm = new T.ShaderMaterial({ vertexShader: '#include <clipping_planes_pars_vertex>\nvoid main(){\n vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n gl_Position = projectionMatrix * mvPosition;\n#include <clipping_planes_vertex>\n}', fragmentShader: '#include <clipping_planes_pars_fragment>\nvec4 pk(float v){ vec4 e = vec4(1.0, 255.0, 65025.0, 16581375.0) * v; e = fract(e); e -= e.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0); return e; }\nvoid main(){\n#include <clipping_planes_fragment>\n gl_FragColor = pk(gl_FragCoord.z);\n}', side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4, clipping: true });
      const ds = new T.Scene(); for(const o of solids) ds.add(new T.Mesh(o.mesh.geometry, dm));
      const oldCC = renderer.getClearColor(new T.Color()), oldCA = renderer.getClearAlpha(), oldTM = renderer.toneMapping; renderer.toneMapping = T.NoToneMapping;
      renderer.setRenderTarget(rt); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(ds, fc);
      const buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      renderer.setRenderTarget(null); renderer.setClearColor(oldCC, oldCA); renderer.toneMapping = oldTM; rt.dispose(); dm.dispose(); need = true;
      const dep = (x, y) => { if(x < 0 || y < 0 || x >= W || y >= H) return 2; const i = (y * W + x) * 4; return buf[i] / 255 + buf[i + 1] / 65025 + buf[i + 2] / 16581375 + buf[i + 3] / 4228250625; };
      const right = new T.Vector3().setFromMatrixColumn(fc.matrixWorld, 0), upv = new T.Vector3().setFromMatrixColumn(fc.matrixWorld, 1);
      const out = [], seen = new Set(), v3 = new T.Vector3(), czOn = !!V.cut, cz = cutZ(), tol = 1.2e-3;
      const vis = (x, y, z) => { if(czOn && z > cz + size * 1e-6) return false; v3.set(x, y, z).project(fc); const px = (v3.x * .5 + .5) * W, py = (v3.y * .5 + .5) * H, d = v3.z * .5 + .5; const ix = Math.floor(px), iy = Math.floor(py); let m = 0; for(let a = -1; a <= 1; a++) for(let b = -1; b <= 1; b++){ const q = dep(ix + a, iy + b); if(q > m) m = q; } return d <= m + tol; };
      const emit = (p, q) => { const x1 = (p[0] - ctr.x) * right.x + (p[1] - ctr.y) * right.y + (p[2] - ctr.z) * right.z, y1 = (p[0] - ctr.x) * upv.x + (p[1] - ctr.y) * upv.y + (p[2] - ctr.z) * upv.z, x2 = (q[0] - ctr.x) * right.x + (q[1] - ctr.y) * right.y + (q[2] - ctr.z) * right.z, y2 = (q[0] - ctr.x) * upv.x + (q[1] - ctr.y) * upv.y + (q[2] - ctr.z) * upv.z;
        if(Math.hypot(x2 - x1, y2 - y1) < size * 1e-6) return; const r = v => Math.round(v / (size * 1e-6)); const k1 = r(x1) + ',' + r(y1), k2 = r(x2) + ',' + r(y2), key = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1; if(seen.has(key)) return; seen.add(key); out.push(x1, y1, x2, y2); };
      for(const it of meshes0){ let ed = _ed.get(it.m); if(!ed){ ed = edgeData(it.m); _ed.set(it.m, ed); } const L = viewEdges(ed, dir);
        for(let k = 0; k < L.length; k += 6){ const a = [L[k], L[k + 1], L[k + 2]], b = [L[k + 3], L[k + 4], L[k + 5]];
          v3.set(a[0], a[1], a[2]).project(fc); const ax = v3.x, ay = v3.y; v3.set(b[0], b[1], b[2]).project(fc); const pl = Math.hypot((v3.x - ax) * W / 2, (v3.y - ay) * H / 2); const n = Math.min(4000, Math.max(2, Math.ceil(pl / 1.5)));
          let run = -1; const P = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
          for(let s2 = 0; s2 <= n; s2++){ const t = s2 / n, q = P(t), ok = vis(q[0], q[1], q[2]); if(ok && run < 0) run = t; if((!ok || s2 === n) && run >= 0){ const t1 = ok ? t : (s2 - 1) / n; if(t1 > run && ((t1 - run) * pl >= 4 || (run === 0 && t1 === 1))) emit(P(run), P(t1)); run = -1; } } } }
      return out;
    }
    function frame(){ if(!R3) return; if(need){ need = false; place(); renderer.render(scene, cam()); } R3.raf = requestAnimationFrame(frame); }
    function setView(k){ const v = VIEWS[k]; if(!v) return; S.az = v[0] * D2R; S.el = v[1] * D2R; S.target.copy(ctr); S.dist = size * 1.8; need = true; }
    function zoomExt(){ S.target.copy(ctr); S.dist = size * 1.8; need = true; }
    // chuột / chạm
    let drag = null; const pts = new Map();
    const panBy = (dx, dy) => { const H = ov.clientHeight || 1; const k = (2 * S.dist * Math.tan(20 * D2R)) / H; const c = cam(); const right = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(c.matrixWorld, 1); S.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); need = true; };
    cv3.addEventListener('contextmenu', e => e.preventDefault());
    cv3.addEventListener('pointerdown', e => { cv3.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey }; });
    cv3.addEventListener('pointermove', e => {
      if(!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if(pts.size >= 2){ const [p1, p2] = [...pts.values()]; const other = [...pts.entries()].find(([id]) => id !== e.pointerId)[1]; const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(p1.x - p2.x, p1.y - p2.y); if(d0 > 0 && d1 > 0) S.dist *= d0 / d1; panBy((e.clientX - prev.x) / 2, (e.clientY - prev.y) / 2); need = true; return; }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y; if(!drag) return;
      if(drag.b === 0 && !drag.sh && !e.shiftKey){ S.az -= dx * 0.008; S.el += dy * 0.008; S.el = Math.max(-89.9 * D2R, Math.min(89.9 * D2R, S.el)); need = true; }
      else panBy(dx, dy);
    });
    const up = e => { pts.delete(e.pointerId); if(!pts.size) drag = null; };
    cv3.addEventListener('pointerup', up); cv3.addEventListener('pointercancel', up);
    cv3.addEventListener('wheel', e => { e.preventDefault(); S.dist *= Math.pow(1.0015, e.deltaY); S.dist = Math.max(size / 1e4, Math.min(size * 100, S.dist)); need = true; }, { passive: false });
    cv3.addEventListener('dblclick', zoomExt);
    ov.addEventListener('click', async e => {
      const v = e.target.closest('[data-v]'); if(v){ setView(v.dataset.v); return; }
      const b = e.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a;
      if(a === 'close') close3D();
      if(a === 'persp'){ V.persp = !V.persp; localStorage.setItem('dvd:3dpersp', V.persp ? '1' : '0'); b.textContent = V.persp ? 'Phối cảnh' : 'Song song'; need = true; }
      if(a === '2d'){ V.show2d = !V.show2d; localStorage.setItem('dvd:3d2d', V.show2d ? '1' : '0'); b.classList.toggle('on', V.show2d); build2D(); need = true; }
      if(a === 'png'){ need = true; place(); renderer.render(scene, cam()); cv3.toBlob(bl => { if(bl) shareOrDownload(bl, String(currentName || 'mohinh').replace(/\.[^.]+$/, '') + '_3D.png', 'image/png'); }, 'image/png'); }
      if(a === 'stl') exportSTL(); if(a === 'obj') exportOBJ();
      if(a === 'cut'){ V.cut = !V.cut; applyCut(); }
      if(a === 'flat'){ const segs = flatshot(); close3D(); A._fs = segs; setTimeout(() => DVDCmd.run('FLATSHOT'), 30); }
    });
    ov.querySelector('[data-a="cutz"]').addEventListener('input', e => { V.cutF = (+e.target.value) / 1000; applyCut(); });
    ov.querySelector('select[data-a="views"]').addEventListener('change', e => { if(e.target.value) setView(e.target.value); e.target.value = ''; });
    ov.querySelector('select[data-a="style"]').addEventListener('change', e => { V.style = e.target.value; localStorage.setItem('dvd:3dstyle', V.style); applyStyle(); });
    const onKey = e => { if(e.key === 'Escape'){ e.stopPropagation(); e.preventDefault(); close3D(); } };
    window.addEventListener('keydown', onKey, true);
    const ro = new ResizeObserver(() => { need = true; }); ro.observe(ov);
    R3 = { ov, renderer, scene, ro, onKey, raf: 0, setView, flatshot, get state(){ return S; }, solids: solids.length, render(){ need = true; place(); renderer.render(scene, cam()); }, canvas: cv3, setCut(on, f){ V.cut = !!on; if(f != null) V.cutF = f; applyCut(); }, setStyle(st){ V.style = st; ov.querySelector('select[data-a="style"]').value = st; applyStyle(); } };
    applyCut();
    if(MEM.cam3 && !opt.view){ S.az = MEM.cam3.az; S.el = MEM.cam3.el; } else setView(opt.view || MEM.v3 || 'se'); frame();
    if(!meshes.length) log('Bản vẽ chưa có khối 3D — dùng BOX, CYLINDER, EXTRUDE, PRESSPULL hoặc WALL3D để tạo. Đang hiện nét 2D ở cao độ 0.');
    else log('Xem 3D: ' + meshes.length + ' khối. Esc hoặc "✕ 2D" để về bản vẽ.');
    A.view3D = R3;
  }
  function close3D(){
    if(!R3) { V.open = false; return; }
    try{ MEM.cam3 = { az: R3.state.az, el: R3.state.el }; }catch(_){}
    cancelAnimationFrame(R3.raf); window.removeEventListener('keydown', R3.onKey, true); try{ R3.ro.disconnect(); }catch(_){}
    R3.scene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
    try{ R3.renderer.dispose(); R3.renderer.forceContextLoss(); }catch(_){}
    R3.ov.remove(); R3 = null; A.view3D = null; V.open = false; try{ draw(); A.paint(); }catch(_){}
  }
  A.open3D = open3D; A.close3D = close3D;
  plain(['3DORBIT', '3DO', 'ORBIT', 'VIEW3D', '3D', 'NAVVCUBE'], 'Xem mô hình 3D (quay, thu phóng, ViewCube, kiểu hiển thị)', () => open3D());
  for(const [k, n] of [['top', 'TOP'], ['front', 'FRONT'], ['right', 'RIGHT'], ['sw', 'SWISO'], ['se', 'SEISO'], ['ne', 'NEISO'], ['nw', 'NWISO']]){
    plain(['-VIEW' + n, 'VIEW' + n], 'Xem 3D hướng ' + VN[k], async () => { MEM.v3 = k; MEM.cam3 = null; if(!V.open) await open3D({ view: k }); else if(R3) R3.setView(k); });
  }

  /* ---------------- DXF: khối 3D -> mặt 3DFACE ---------------- */
  const _toDxf = window.entitiesToDXF;
  window.entitiesToDXF = function(ents){
    const list = (ents || []).filter(e => e && !e.xr && is3D(e)); if(!list.length) return _toDxf.apply(this, arguments);
    const s = _toDxf.call(this, (ents || []).filter(e => !is3D(e)));
    const L = []; const P = (c, v) => { L.push(String(c)); L.push(typeof v === 'number' ? (Math.abs(v) < 1e-12 ? '0' : String(+v.toFixed(8))) : String(v)); };
    for(const e of list){ const m = meshOf(e); if(!m) continue; const ly = String(e.layer || '0').replace(/[^\x20-\x7e]/g, '_');
      let aci = 256; try{ if(!(e.bl || String(e.col || '').toLowerCase() === String(A.layerHex(e.layer || '0')).toLowerCase())) aci = A.aciNear(e.col || '#ffffff'); }catch(_){}
      const nf = m.i.length / 3; let xd = null;
      if(e.type === 'SOLID3D'){ const d = {}; for(const k of ['k', 'pts', 'holes', 'z0', 'h', 'tri', 'cx', 'cy', 'r', 'r2', 'mat']) if(e[k] != null && !(e.k === 'mesh' && k === 'pts')) d[k] = e[k];
        let js = JSON.stringify(d, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v); if(js.length > 15000) js = JSON.stringify({ k: 'mesh', mat: e.mat });
        xd = []; for(let k = 0; k < js.length; k += 240) xd.push(js.slice(k, k + 240)); }
      for(let t = 0; t < m.i.length; t += 3){ const q = [m.i[t], m.i[t + 1], m.i[t + 2], m.i[t + 2]]; P(0, '3DFACE'); P(8, ly); if(aci !== 256) P(62, aci); q.forEach((ix, j) => { P(10 + j, m.p[ix * 3]); P(20 + j, m.p[ix * 3 + 1]); P(30 + j, m.p[ix * 3 + 2]); });
        if(t === 0 && xd){ P(1001, 'DVDCAD'); P(1000, 'S3D'); P(1071, nf); for(const c of xd) P(1000, c); } } }
    const NL = s.indexOf('\r\n') >= 0 ? '\r\n' : '\n'; const add = L.join(NL) + NL;
    // chèn trước ENDSEC của phần ENTITIES
    const i = s.lastIndexOf(NL + 'ENTITIES' + NL); const j = i < 0 ? -1 : s.indexOf(NL + '0' + NL + 'ENDSEC', i + 1); if(i < 0 || j < 0) return s;
    let o = s.slice(0, j + NL.length) + add + s.slice(j + NL.length);
    // bảng APPID cho dữ liệu mở rộng (XDATA) "DVDCAD" — giữ thông số khối khi mở lại
    const ti = o.indexOf(NL + 'TABLES' + NL); const tj = ti < 0 ? -1 : o.indexOf(NL + '0' + NL + 'ENDSEC', ti + 1);
    if(tj > 0 && o.indexOf(NL + 'APPID' + NL) < 0) o = o.slice(0, tj + NL.length) + ['0', 'TABLE', '2', 'APPID', '70', '2', '0', 'APPID', '2', 'ACAD', '70', '0', '0', 'APPID', '2', 'DVDCAD', '70', '0', '0', 'ENDTAB'].join(NL) + NL + o.slice(tj + NL.length);
    return o;
  };
  // đọc lại: nhóm mặt 3DFACE có XDATA "DVDCAD" -> khối 3D (sửa tiếp được)
  A.fromFaces = function(list){
    if(!list.some(e => e && e._x3)) return list;
    const out = [];
    for(let i = 0; i < list.length; i++){
      const e = list[i]; if(!e || !e._x3){ out.push(e); continue; }
      const n = e._x3.n | 0, js = e._x3.d; delete e._x3;
      const F = []; for(let k = i; k < list.length && F.length < n; k++){ const q = list[k]; if(!(q && q.type === 'SOLID' && q.face) || (k > i && q._x3)) break; F.push(q); }
      if(F.length !== n){ out.push(e); continue; }
      let def = null; try{ def = JSON.parse(js || '{}'); }catch(_){}
      let sol = null;
      if(def && def.k && def.k !== 'mesh'){ const c = Object.assign({ type: 'SOLID3D' }, def); const m = meshOf(c);
        if(m && m.i.length / 3 === n){ const a = m.i[0] * 3; const z = (e.zs || [])[0] || 0; const sz = Math.max(1, Math.abs(m.p[a]) + Math.abs(m.p[a + 1]) + Math.abs(m.p[a + 2])); if(Math.abs(m.p[a] - e.pts[0].x) + Math.abs(m.p[a + 1] - e.pts[0].y) + Math.abs(m.p[a + 2] - z) < sz * 1e-6 + 1e-6) sol = c; } }
      if(!sol){ const P = [], I = []; for(const q of F){ const m = meshOf(q); const b = P.length / 3; for(const v of m.p) P.push(v); for(const t of m.i) I.push(t + b); } sol = meshEnt(P, I); if(sol && def && def.mat) sol.mat = def.mat; }
      if(!sol){ for(const q of F) out.push(q); i += n - 1; continue; }
      sol.layer = e.layer; if(e.aci !== undefined) sol.aci = e.aci; for(const k of ['lt', 'lw', 'lts']) if(e[k] != null) sol[k] = e[k];
      out.push(sol); i += n - 1;
    }
    return out;
  };

  /* ---------------- nút 3D trên thanh điều hướng + menu điện thoại ---------------- */
  try{
    const z = document.querySelector('.zoom'); if(z && !document.getElementById('view3dBtn')){ const b = document.createElement('button'); b.id = 'view3dBtn'; b.title = 'Xem 3D (3DORBIT)'; b.setAttribute('aria-label', 'Xem 3D'); b.textContent = '3D'; b.style.cssText = 'font:700 12px system-ui,sans-serif'; b.addEventListener('click', () => { if(V.open) close3D(); else open3D(); }); z.appendChild(b); }
  }catch(_){}
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
