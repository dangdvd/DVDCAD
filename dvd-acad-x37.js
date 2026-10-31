/* DVDCAD v6n — mặt NURBS như AutoCAD
   · Mặt NURBS: SOLID3D k = 'nsrf', ns = { du, dv, nu, nv, U, V, P: [[x,y,z]] (chỉ số j·nu + i), W } — vẽ bằng lưới tính từ mặt, lưu DXF / DWG
   · CONVTONURBS: khối / mặt / lưới → mặt NURBS: mặt phẳng 4 cạnh → song tuyến, trụ / cầu → NURBS hữu tỉ bậc 2 chính xác, mặt khác → từng tam giác
   · 3DEDITBAR: kéo một điểm trên mặt — dời các điểm điều khiển (nghiệm chuẩn nhỏ nhất) để điểm đó đi đúng vectơ dời
   · INSERTCONTROLPOINT: chèn nút (Boehm) theo U hoặc V tại điểm chọn — thêm hàng điểm điều khiển, hình không đổi
   · SURFFILLET: bo cung tròn giữa 2 mặt phẳng (NURBS hữu tỉ bậc 2 × bậc 1, bán kính R), cắt 2 mặt tới đường tiếp xúc */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x37 || !window.DVDCmd) return; A._x37 = true;
  const log = m => A.log(m);
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const isN = e => !!e && e.type === 'SOLID3D' && e.k === 'nsrf' && !!e.ns;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = a => Math.hypot(a[0], a[1], a[2]), nz = a => sc(a, 1 / (len(a) || 1));

  /* ===================== tính mặt NURBS ===================== */
  function span(n, p, u, U){ if(u >= U[n + 1]) return n; if(u <= U[p]) return p; let lo = p, hi = n + 1, mid = (lo + hi) >> 1, g = 0; while((u < U[mid] || u >= U[mid + 1]) && g++ < 200){ if(u < U[mid]) hi = mid; else lo = mid; mid = (lo + hi) >> 1; } return mid; }
  function basis(i, u, p, U){ const N = [1], L = [], R = []; for(let j = 1; j <= p; j++){ L[j] = u - U[i + 1 - j]; R[j] = U[i + j] - u; let s = 0; for(let r = 0; r < j; r++){ const den = R[r + 1] + L[j - r]; const t = den ? N[r] / den : 0; N[r] = s + R[r + 1] * t; s = L[j - r] * t; } N[j] = s; } return N; }
  // trọng số các điểm điều khiển tại (u, v): [{ k, b }] (b = hệ số hữu tỉ)
  function weights(S, u, v){ const su = span(S.nu - 1, S.du, u, S.U), sv = span(S.nv - 1, S.dv, v, S.V); const Nu = basis(su, u, S.du, S.U), Nv = basis(sv, v, S.dv, S.V); const out = []; let w = 0;
    for(let b = 0; b <= S.dv; b++) for(let a = 0; a <= S.du; a++){ const i = su - S.du + a, j = sv - S.dv + b; if(i < 0 || j < 0 || i >= S.nu || j >= S.nv) continue; const k = j * S.nu + i; const c = Nu[a] * Nv[b] * (S.W ? S.W[k] : 1); out.push({ k, c }); w += c; }
    for(const o of out) o.b = w ? o.c / w : 0; return out; }
  function pt(S, u, v){ let x = 0, y = 0, z = 0; for(const o of weights(S, u, v)){ const P = S.P[o.k]; x += o.b * P[0]; y += o.b * P[1]; z += o.b * P[2]; } return [x, y, z]; }
  const dom = S => ({ u0: S.U[S.du], u1: S.U[S.nu], v0: S.V[S.dv], v1: S.V[S.nv] });
  A.nurbsSurfPt = pt;
  function meshN(e){ const S = e.ns, D = dom(S); const ru = S.du === 1 ? S.nu - 1 : Math.min(64, (S.nu - S.du) * 10), rv = S.dv === 1 ? S.nv - 1 : Math.min(64, (S.nv - S.dv) * 10);
    const uu = [], vv = []; if(S.du === 1) for(let i = 0; i < S.nu; i++) uu.push(S.U[i + 1]); else for(let i = 0; i <= ru; i++) uu.push(D.u0 + (D.u1 - D.u0) * i / ru);
    if(S.dv === 1) for(let j = 0; j < S.nv; j++) vv.push(S.V[j + 1]); else for(let j = 0; j <= rv; j++) vv.push(D.v0 + (D.v1 - D.v0) * j / rv);
    const p = [], I = []; for(const v of vv) for(const u of uu){ const q = pt(S, u, v); p.push(q[0], q[1], q[2]); } const nu = uu.length;
    for(let j = 0; j + 1 < vv.length; j++) for(let i = 0; i + 1 < nu; i++){ const a = j * nu + i, b = a + 1, c = a + nu + 1, d = a + nu; const T3 = (x, y, z) => { const A3 = [p[x * 3], p[x * 3 + 1], p[x * 3 + 2]], B3 = [p[y * 3], p[y * 3 + 1], p[y * 3 + 2]], C3 = [p[z * 3], p[z * 3 + 1], p[z * 3 + 2]]; if(len(crs(sub(B3, A3), sub(C3, A3))) > 1e-20) I.push(x, y, z); }; T3(a, b, c); T3(a, c, d); }
    return { p, i: I, smooth: S.du > 1 || S.dv > 1 }; }
  { const prev = A.meshOfExt; A.meshOfExt = e => { if(isN(e)) return meshN(e); return prev ? prev(e) : null; }; }
  const hull = P => { const pp = P.map(q => ({ x: q[0], y: q[1] })); try{ return typeof hull2d === 'function' ? hull2d(pp) : pp; }catch(_){ return pp; } };
  function mkN(S, base){ const e = A.newProps({ type: 'SOLID3D', k: 'nsrf', srf: 1, ns: S }); if(base){ for(const k of ['layer', 'col', 'bl', 'mat']) if(base[k] != null) e[k] = base[k]; else if(k === 'bl') delete e.bl; } e.pts = hull(S.P); return e; }
  A.nurbsSurf = mkN;
  const bilin = (a, b, c, d) => ({ du: 1, dv: 1, nu: 2, nv: 2, U: [0, 0, 1, 1], V: [0, 0, 1, 1], P: [a, b, d, c], W: null });   // a b c d theo vòng: (0,0) (1,0) (1,1) (0,1)

  /* ===================== CONVTONURBS ===================== */
  function exactOf(e){ const c = Math.SQRT1_2, z0 = e.z0 || 0;
    if(e.k === 'cyl' || e.k === 'cone'){ const r1 = e.r, r2 = e.k === 'cone' ? (e.r2 || 0) : e.r, h = e.h || 0; const ring = (r, z) => { const C = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]]; return C.map(q => [e.cx + r * q[0], e.cy + r * q[1], z]); };
      const Wr = [1, c, 1, c, 1, c, 1, c, 1]; const U = [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1];
      const side = { du: 2, dv: 1, nu: 9, nv: 2, U, V: [0, 0, 1, 1], P: ring(r1, z0).concat(ring(r2, z0 + h)), W: Wr.concat(Wr) };
      const cap = (r, z) => ({ du: 2, dv: 1, nu: 9, nv: 2, U, V: [0, 0, 1, 1], P: ring(r, z).concat(Array(9).fill([e.cx, e.cy, z])), W: Wr.concat(Wr) });
      const out = [side, cap(r1, z0)]; if(r2 > 1e-12) out.push(cap(r2, z0 + h)); return out; }
    if(e.k === 'sph'){ const r = e.r, z = e.z0 || 0; const ring = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]], Wr = [1, c, 1, c, 1, c, 1, c, 1]; const mer = [[0, -1, 1], [1, -1, c], [1, 0, 1], [1, 1, c], [0, 1, 1]];   // nửa đường tròn kinh tuyến (ρ, z, w)
      const P = [], W = []; for(const m of mer) ring.forEach((q, i) => { P.push([e.cx + r * m[0] * q[0], e.cy + r * m[0] * q[1], z + r * m[1]]); W.push(Wr[i] * m[2]); });
      return [{ du: 2, dv: 2, nu: 9, nv: 5, U: [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1], V: [0, 0, 0, 0.5, 0.5, 1, 1, 1], P, W }]; }
    return null; }
  function convOf(e){ const ex = exactOf(e); if(ex) return ex; const m = (e.k === 'mesh' && e.v && e.f) ? { p: e.v, i: e.f } : (A.meshOf ? A.meshOf(e) : null); if(!m || !A.planarFaces) return [];
    const G = A.planarFaces(m), out = [];
    for(const F of G.faces){ let L = F.loops[0]; if(!L) continue; const P = L.map(i => G.P[i]);
      // bỏ đỉnh thẳng hàng
      const Q = P.filter((q, i) => { const a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length]; return len(crs(sub(q, a), sub(b, q))) > 1e-9 * (len(sub(q, a)) * len(sub(b, q)) + 1e-30); });
      if(F.loops.length === 1 && Q.length === 4) out.push(bilin(Q[0], Q[1], Q[2], Q[3]));
      else for(const t of F.tris){ const T3 = G.T[t].map(i => G.P[i]); out.push(bilin(T3[0], T3[1], T3[2], T3[2])); } }
    return out; }
  A.convToNurbs = convOf;
  cmd(['CONVTONURBS'], 'Đổi khối / mặt / lưới 3D thành mặt NURBS (sửa điểm điều khiển bằng 3DEDITBAR, INSERTCONTROLPOINT)', async () => {
    const s = await A.getSel('Chọn khối, mặt hoặc lưới'); const L = ((s && s.sel) || []).filter(e => e.type === 'SOLID3D' && !isN(e)); if(!L.length) return; const add = [], del = [];
    for(const e of L){ const S = convOf(e); if(!S.length) continue; for(const q of S) add.push(mkN(q, e)); del.push(e); }
    if(add.length) A.commit({ add, del }, 'CONVTONURBS: ' + del.length + ' đối tượng → ' + add.length + ' mặt NURBS.'); else log('CONVTONURBS: không đổi được.'); });

  /* ===================== chọn điểm trên mặt ===================== */
  function nearestUV(S, q){ const D = dom(S); let best = null, bd = Infinity; const N = 40; const d2 = p => (p[0] - q.x) ** 2 + (p[1] - q.y) ** 2 + (q.z != null ? (p[2] - q.z) ** 2 : 0);
    for(let j = 0; j <= N; j++) for(let i = 0; i <= N; i++){ const u = D.u0 + (D.u1 - D.u0) * i / N, v = D.v0 + (D.v1 - D.v0) * j / N; const d = d2(pt(S, u, v)); if(d < bd){ bd = d; best = [u, v]; } }
    let [u, v] = best, h = (D.u1 - D.u0) / N, k = (D.v1 - D.v0) / N; for(let it = 0; it < 40; it++){ let moved = false; for(const [du, dv] of [[h, 0], [-h, 0], [0, k], [0, -k]]){ const u2 = Math.max(D.u0, Math.min(D.u1, u + du)), v2 = Math.max(D.v0, Math.min(D.v1, v + dv)); const d = d2(pt(S, u2, v2)); if(d < bd){ bd = d; u = u2; v = v2; moved = true; } } if(!moved){ h /= 2; k /= 2; } }
    return { u, v }; }
  A.nurbsNearestUV = nearestUV;
  const pickN = async p => { const r = await A.getEnt(p || 'Chọn mặt NURBS', { filter: isN }); return r.ent || null; };
  const ptOn = async (S, prompt) => { const r = await A.getPoint(prompt); if(!r.pt) return null; const L = A._last3D; const q = { x: r.pt.x, y: r.pt.y, z: L && Date.now() - L.t < 2000 && Math.abs(L.x - r.pt.x) < 1e-3 * (1 + Math.abs(r.pt.x)) ? L.z : null }; return nearestUV(S, q); };

  /* ===================== 3DEDITBAR ===================== */
  // dời điểm S(u,v) đúng vectơ d: ΔPk = bk·d / Σ bk² (nghiệm chuẩn nhỏ nhất, mặt không hữu tỉ hoặc có trọng số đều)
  function moveAt(S, u, v, d){ const W = weights(S, u, v); const s2 = W.reduce((a, o) => a + o.b * o.b, 0) || 1; const P = S.P.map(q => q.slice()); for(const o of W){ const f = o.b / s2; P[o.k] = add(P[o.k], sc(d, f)); } return Object.assign({}, S, { P }); }
  A.nurbsMoveAt = moveAt;
  cmd(['3DEDITBAR'], 'Sửa mặt NURBS: chọn điểm trên mặt, nhập vectơ dời (hoặc độ cao Z) — các điểm điều khiển dời để điểm đó đi đúng vị trí', async () => {
    const e = await pickN(); if(!e) return; const S = e.ns; const uv = await ptOn(S, 'Chọn điểm trên mặt NURBS'); if(!uv) return; const P0 = pt(S, uv.u, uv.v);
    const k = await A.getKw('Dời [Điểm / Z] <Z>', { kw: [{ k: 'P', t: 'Điểm' }, { k: 'Z', t: 'Z' }], def: 'Z' }); let d;
    if(k.kw === 'P'){ const r = await A.getPoint('Vị trí mới', { base: { x: P0[0], y: P0[1] } }); if(!r.pt) return; const z = r.pt.z != null ? r.pt.z : P0[2]; d = [r.pt.x - P0[0], r.pt.y - P0[1], z - P0[2]]; }
    else { const r = await A.getNum('Độ dời theo Z', { def: 0 }); d = [0, 0, numOr(r, 0)]; } if(!len(d)) return;
    const w = copy(e); w.ns = moveAt(S, uv.u, uv.v, d); w.pts = hull(w.ns.P); A.commit({ rep: [[e, w]] }, '3DEDITBAR: dời điểm (' + P0.map(v => +v.toFixed(3)).join(', ') + ') thêm ' + d.map(v => +v.toFixed(3)).join(', ')); });

  /* ===================== INSERTCONTROLPOINT (chèn nút) ===================== */
  // chèn nút t vào hướng 'u' hoặc 'v' (Boehm, toạ độ đồng nhất)
  function insertKnot(S, dir, t){ const isU = dir === 'u'; const p = isU ? S.du : S.dv, K = isU ? S.U : S.V, n = (isU ? S.nu : S.nv) - 1; const k = span(n, p, t, K);
    const nu = isU ? S.nu + 1 : S.nu, nv = isU ? S.nv : S.nv + 1; const P = new Array(nu * nv), W = S.W ? new Array(nu * nv) : null;
    const row = (L) => { // L: dãy [x·w, y·w, z·w, w]
      const o = []; for(let i = 0; i <= n + 1; i++){ if(i <= k - p) o.push(L[i]); else if(i > k) o.push(L[i - 1]); else { const a = (t - K[i]) / ((K[i + p] - K[i]) || 1); o.push(L[i - 1].map((x, m) => (1 - a) * x + a * L[i][m])); } } return o; };
    const other = isU ? S.nv : S.nu;
    for(let r = 0; r < other; r++){ const L = []; for(let i = 0; i <= n; i++){ const idx = isU ? r * S.nu + i : i * S.nu + r; const w = S.W ? S.W[idx] : 1; const q = S.P[idx]; L.push([q[0] * w, q[1] * w, q[2] * w, w]); }
      row(L).forEach((h, i) => { const idx = isU ? r * nu + i : i * nu + r; P[idx] = [h[0] / h[3], h[1] / h[3], h[2] / h[3]]; if(W) W[idx] = h[3]; }); }
    const K2 = K.slice(0, k + 1).concat([t], K.slice(k + 1)); return Object.assign({}, S, isU ? { U: K2, nu } : { V: K2, nv }, { P, W }); }
  A.nurbsInsertKnot = insertKnot;
  cmd(['INSERTCONTROLPOINT'], 'Chèn điểm điều khiển vào mặt NURBS (chèn nút theo hướng U hoặc V tại điểm chọn — hình không đổi)', async () => {
    const e = await pickN(); if(!e) return; const S = e.ns; const k = await A.getKw('Hướng [U / V] <U>', { kw: [{ k: 'U', t: 'U' }, { k: 'V', t: 'V' }], def: 'U' }); const dir = k.kw === 'V' ? 'v' : 'u';
    const uv = await ptOn(S, 'Chọn điểm trên mặt'); if(!uv) return; const t = dir === 'u' ? uv.u : uv.v; const w = copy(e); w.ns = insertKnot(S, dir, t); w.pts = hull(w.ns.P);
    A.commit({ rep: [[e, w]] }, 'INSERTCONTROLPOINT: thêm hàng điểm điều khiển theo ' + dir.toUpperCase() + ' (' + w.ns.nu + ' × ' + w.ns.nv + ').'); });

  /* ===================== SURFFILLET ===================== */
  function planeOf(S){ const P = S.P; let n = [0, 0, 0]; const c = P.reduce((a, q) => add(a, q), [0, 0, 0]).map(v => v / P.length); for(let i = 0; i < P.length; i++) for(let j = i + 1; j < P.length; j++){ const m = crs(sub(P[i], c), sub(P[j], c)); if(len(m) > len(n)) n = m; } if(len(n) < 1e-20) return null; n = nz(n);
    if(P.some(q => Math.abs(dot(sub(q, c), n)) > 1e-7 * (1 + len(sub(q, c))))) return null; return { n, c }; }
  function filletPlanes(S1, S2, R){ const A1 = planeOf(S1), A2 = planeOf(S2); if(!A1 || !A2) return { err: 'Chỉ bo được giữa hai mặt phẳng.' };
    const dir = crs(A1.n, A2.n); if(len(dir) < 1e-9) return { err: 'Hai mặt song song.' }; const L = nz(dir);
    // điểm trên giao tuyến: giải n1·x = d1, n2·x = d2, L·x = 0
    const d1 = dot(A1.n, A1.c), d2 = dot(A2.n, A2.c); const M = [A1.n, A2.n, L], b = [d1, d2, 0]; const det = dot(M[0], crs(M[1], M[2]));
    const X0 = sc(add(add(sc(crs(M[1], M[2]), b[0]), sc(crs(M[2], M[0]), b[1])), sc(crs(M[0], M[1]), b[2])), 1 / det);
    const inPl = (pl, cen) => { let e = crs(L, pl.n); if(dot(e, sub(cen, X0)) < 0) e = sc(e, -1); return nz(e); };   // hướng trong mặt, vuông góc giao tuyến, về phía mặt
    const e1 = inPl(A1, A1.c), e2 = inPl(A2, A2.c); const th = Math.acos(Math.max(-1, Math.min(1, dot(e1, e2)))); if(th < 1e-6 || th > Math.PI - 1e-6) return { err: 'Góc giữa hai mặt không bo được.' };
    const t = R / Math.tan(th / 2), w = Math.sin(th / 2);
    // khoảng dọc giao tuyến chung của hai mặt
    const rng = S => { let lo = Infinity, hi = -Infinity; for(const q of S.P){ const s = dot(sub(q, X0), L); lo = Math.min(lo, s); hi = Math.max(hi, s); } return [lo, hi]; }; const r1 = rng(S1), r2 = rng(S2); const s0 = Math.max(r1[0], r2[0]), s1 = Math.min(r1[1], r2[1]); if(s1 <= s0) return { err: 'Hai mặt không chạy song song dọc giao tuyến.' };
    const ctrl = s => { const O = add(X0, sc(L, s)); return [add(O, sc(e1, t)), O, add(O, sc(e2, t))]; };
    const F = { du: 2, dv: 1, nu: 3, nv: 2, U: [0, 0, 0, 1, 1, 1], V: [0, 0, 1, 1], P: ctrl(s0).concat(ctrl(s1)), W: [1, w, 1, 1, w, 1] };
    // cắt mặt song tuyến: cạnh nằm trên giao tuyến dời tới đường tiếp xúc
    const trim = (S, e) => { if(S.nu !== 2 || S.nv !== 2 || S.du !== 1 || S.dv !== 1) return null; const on = q => len(crs(sub(q, X0), L)) < 1e-7 * (1 + len(sub(q, X0))); const idx = S.P.map((q, i) => on(q) ? i : -1).filter(i => i >= 0); if(idx.length !== 2) return null; const P = S.P.map(q => q.slice()); for(const i of idx) P[i] = add(P[i], sc(e, t)); return Object.assign({}, S, { P }); };
    return { F, T1: trim(S1, e1), T2: trim(S2, e2), t, center: add(add(X0, sc(nz(add(e1, e2)), R / Math.sin(th / 2))), sc(L, s0)) }; }
  A.nurbsFillet = filletPlanes;
  cmd(['SURFFILLET'], 'Bo cung tròn giữa hai mặt phẳng (NURBS): bán kính, cắt hai mặt tới đường tiếp xúc', async () => {
    const a = await pickN('Chọn mặt thứ nhất'); if(!a) return; const b = await pickN('Chọn mặt thứ hai'); if(!b || b === a) return; const R = numOr(await A.getNum('Bán kính bo', { def: (A.MEM && A.MEM.sfr) || 1 }), 1); if(!(R > 0)) return; if(A.MEM) A.MEM.sfr = R;
    const k = await A.getKw('Cắt mặt [Có / Không] <Có>', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Có' }); const doTrim = k.kw !== 'N';
    const r = filletPlanes(a.ns, b.ns, R); if(r.err){ log('SURFFILLET: ' + r.err); return; } const rep = [];
    if(doTrim){ if(r.T1){ const w = copy(a); w.ns = r.T1; w.pts = hull(r.T1.P); rep.push([a, w]); } if(r.T2){ const w = copy(b); w.ns = r.T2; w.pts = hull(r.T2.P); rep.push([b, w]); } }
    A.commit({ add: [mkN(r.F, a)], rep }, 'SURFFILLET: bo R = ' + R + (doTrim ? ', cắt ' + rep.length + ' mặt' : '') + '.'); });
})();
