/* DVDCAD v6i — lưới và mặt 3D như AutoCAD
   Lưới: MESHSMOOTH, MESHSMOOTHMORE / MESHSMOOTHLESS (chia nhỏ Loop), MESHREFINE, MESHCREASE / MESHUNCREASE, MESHEXTRUDE,
         MESHSPLIT, MESHMERGE, MESHCOLLAPSE, MESHSPIN, MESHCAP, MESHOPTIONS, MESHPRIMITIVEOPTIONS (MESH dùng số chia)
   Mặt:  SURFOFFSET, SURFEXTEND, SURFTRIM / SURFUNTRIM, SURFPATCH, SURFBLEND, SURFNETWORK, SURFSCULPT, SURFEXTRACTCURVE,
         PROJECTGEOMETRY, OFFSETEDGE
   Phân tích: ANALYSISZEBRA, ANALYSISCURVATURE, ANALYSISDRAFT, ANALYSISOPTIONS (hiện trong khung 3D) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x27 || !window.DVDCmd) return; A._x27 = true;
  const log = m => A.log(m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const fmt = v => String(+(+v).toFixed(4));
  const isS3 = e => !!(e && e.type === 'SOLID3D');
  const isMesh = e => isS3(e) && e.k === 'mesh';
  const isSurf = e => isS3(e) && !!e.srf;
  const unlocked = l => (l || []).filter(e => !A.isLocked(e));
  const TAU = Math.PI * 2;
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const KW = async (p, o) => { const r = await A.getKw(p, o); return { kw: r.kw || (o && o.def) }; };

  /* ===================== tuỳ chọn ===================== */
  const OPT_KEY = 'dvd:meshopt';
  A.meshOpts = () => { let o = {}; try{ o = JSON.parse(localStorage.getItem(OPT_KEY) || '{}') || {}; }catch(_){}
    return Object.assign({ lv: 1, maxLv: 4, maxFace: 200000, box: 3, wedge: 3, pyr: 3, primLv: 0 }, o); };
  const saveOpts = o => { try{ localStorage.setItem(OPT_KEY, JSON.stringify(o)); }catch(_){} };
  A.anaOpts = () => { let o = {}; try{ o = JSON.parse(localStorage.getItem('dvd:ana') || '{}') || {}; }catch(_){}
    return { zebra: Object.assign({ n: 12, dir: 0, c1: '#101010', c2: '#f4f4f4' }, o.zebra), curv: Object.assign({ type: 'G' }, o.curv), draft: Object.assign({ a0: -3, a1: 3 }, o.draft) }; };

  /* ===================== hình học cơ bản ===================== */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.hypot(a[0], a[1], a[2]), unit = a => { const l = len(a); return l > 1e-300 ? mul(a, 1 / l) : [0, 0, 1]; };
  const P3 = (V, i) => [V[i * 3], V[i * 3 + 1], V[i * 3 + 2]];
  const triN = (V, F, t) => { const a = P3(V, F[t * 3]), b = P3(V, F[t * 3 + 1]), c = P3(V, F[t * 3 + 2]); return cross(sub(b, a), sub(c, a)); };
  function hull2d(V){ const P = []; for(let k = 0; k < V.length; k += 3) P.push({ x: V[k], y: V[k + 1] }); P.sort((a, b) => a.x - b.x || a.y - b.y); if(P.length < 3) return P;
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); const lo = [], up = [];
    for(const p of P){ while(lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for(let i = P.length - 1; i >= 0; i--){ const p = P[i]; while(up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up); }
  // bỏ đỉnh không dùng, đánh lại chỉ số
  function compact(V, F, cr){ const map = new Int32Array(V.length / 3).fill(-1), nv = []; const nf = [];
    for(let t = 0; t + 2 < F.length; t += 3){ const a = F[t], b = F[t + 1], c = F[t + 2]; if(a === b || b === c || a === c) continue; for(const i of [a, b, c]) if(map[i] < 0){ map[i] = nv.length / 3; nv.push(V[i * 3], V[i * 3 + 1], V[i * 3 + 2]); } nf.push(map[a], map[b], map[c]); }
    const ncr = []; for(let k = 0; k + 1 < (cr || []).length; k += 2){ const a = map[cr[k]], b = map[cr[k + 1]]; if(a >= 0 && b >= 0) ncr.push(a, b); }
    return { v: nv, f: nf, cr: ncr }; }
  // gộp đỉnh trùng nhưng giữ thứ tự tam giác
  function weldKeep(V, F){ const w = A.weld(V, F); return { v: w.p, f: w.i }; }
  const ekey = (a, b, n) => a < b ? a * n + b : b * n + a;
  function edgeMap(F, nv){ const M = new Map(); for(let t = 0; t < F.length / 3; t++) for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3]; const key = ekey(a, b, nv); let r = M.get(key); if(!r){ r = { a: Math.min(a, b), b: Math.max(a, b), t: [] }; M.set(key, r); } r.t.push(t); } return M; }

  /* ===================== chia nhỏ Loop (có cạnh gấp) ===================== */
  function loop1(V, F, cr){
    const nv = V.length / 3, E = new Map(), crs = new Set();
    for(let k = 0; k + 1 < cr.length; k += 2) crs.add(ekey(cr[k], cr[k + 1], nv));
    for(let t = 0; t < F.length / 3; t++) for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3], c = F[t * 3 + (k + 2) % 3]; const key = ekey(a, b, nv); let r = E.get(key); if(!r){ r = { a, b, o: [], id: 0 }; E.set(key, r); } r.o.push(c); }
    const nb = Array.from({ length: nv }, () => []), sh = Array.from({ length: nv }, () => []);
    let id = nv; for(const [key, r] of E){ r.id = id++; r.sharp = r.o.length !== 2 || crs.has(key); nb[r.a].push(r.b); nb[r.b].push(r.a); if(r.sharp){ sh[r.a].push(r.b); sh[r.b].push(r.a); } }
    const out = new Float64Array(id * 3);
    for(let v = 0; v < nv; v++){ const p = P3(V, v), n = nb[v].length, s = sh[v].length; let q;
      if(s >= 3 || n === 0) q = p;
      else if(s === 2){ q = add3(mul(p, 0.75), mul(add3(P3(V, sh[v][0]), P3(V, sh[v][1])), 0.125)); }
      else { const be = n === 3 ? 3 / 16 : 3 / (8 * n); let S = [0, 0, 0]; for(const j of nb[v]) S = add3(S, P3(V, j)); q = add3(mul(p, 1 - n * be), mul(S, be)); }
      out[v * 3] = q[0]; out[v * 3 + 1] = q[1]; out[v * 3 + 2] = q[2]; }
    for(const r of E.values()){ const a = P3(V, r.a), b = P3(V, r.b); const q = r.sharp ? mul(add3(a, b), 0.5) : add3(mul(add3(a, b), 3 / 8), mul(add3(P3(V, r.o[0]), P3(V, r.o[1])), 1 / 8)); out[r.id * 3] = q[0]; out[r.id * 3 + 1] = q[1]; out[r.id * 3 + 2] = q[2]; }
    const nf = new Array(F.length * 4); const mid = (a, b) => E.get(ekey(a, b, nv)).id;
    for(let t = 0; t < F.length / 3; t++){ const a = F[t * 3], b = F[t * 3 + 1], c = F[t * 3 + 2]; const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); const o = t * 12;
      nf[o] = a; nf[o + 1] = ab; nf[o + 2] = ca; nf[o + 3] = ab; nf[o + 4] = b; nf[o + 5] = bc; nf[o + 6] = ca; nf[o + 7] = bc; nf[o + 8] = c; nf[o + 9] = ab; nf[o + 10] = bc; nf[o + 11] = ca; }
    const ncr = []; for(let k = 0; k + 1 < cr.length; k += 2){ const r = E.get(ekey(cr[k], cr[k + 1], nv)); if(r){ ncr.push(cr[k], r.id, r.id, cr[k + 1]); } }
    return { v: Array.from(out, x => Math.round(x * 1e6) / 1e6), f: nf, cr: ncr };
  }
  function subdivide(v, f, cr, lv){ let m = { v, f, cr: cr || [] }; for(let i = 0; i < lv; i++) m = loop1(m.v, m.f, m.cr); return m; }
  A.meshSubdivide = subdivide;
  // lồng (cage) của lưới: các đỉnh / mặt gốc trước khi làm trơn
  const cageOf = e => e.ms && e.ms.v0 ? { v: e.ms.v0.slice(), f: e.ms.f0.slice(), cr: (e.ms.cr || []).slice(), lv: e.ms.lv | 0 } : { v: (e.v || []).slice(), f: (e.f || []).slice(), cr: [], lv: 0 };
  function setCage(w, c){ const o = A.meshOpts(); let lv = Math.max(0, c.lv | 0); while(lv > 0 && c.f.length / 3 * Math.pow(4, lv) > o.maxFace) lv--;
    const m = lv > 0 ? subdivide(c.v, c.f, c.cr, lv) : { v: c.v, f: c.f };
    w.v = m.v.map(x => Math.round(x * 1e6) / 1e6); w.f = m.f.slice(); w.pts = hull2d(w.v);
    if(lv > 0 || (c.cr && c.cr.length)) w.ms = { lv, v0: c.v.map(x => Math.round(x * 1e6) / 1e6), f0: c.f.slice(), cr: (c.cr || []).slice() }; else delete w.ms;
    return w; }
  A.meshApplyMs = (e, ms) => { if(!ms || !Array.isArray(ms.v0) || !Array.isArray(ms.f0)) return e; return setCage(e, { v: ms.v0, f: ms.f0, cr: ms.cr || [], lv: ms.lv | 0 }); };
  function makeMesh(v, f, base, extra){ const e = { type: 'SOLID3D', k: 'mesh', v: v.map(x => Math.round(x * 1e6) / 1e6), f: f.slice() }; e.pts = hull2d(e.v);
    if(base) for(const k of ['layer', 'col', 'bl', 'mat', 'lw', 'tp', 'aci']) if(base[k] != null) e[k] = base[k];
    if(extra) Object.assign(e, extra); if(!base) A.newProps(e); delete e.lt; return e; }

  /* ===================== độ cong (cho ANALYSISCURVATURE) ===================== */
  A.meshCurvature = function(P, I, type){
    const w = A.weld(P, I), p = w.p, F = w.i, n = p.length / 3; let lo = Infinity, hi = -Infinity; for(const x of p){ if(x < lo) lo = x; if(x > hi) hi = x; }
    const q = Math.max(1e-9, (hi - lo) * 1e-5); const ang = new Float64Array(n), area = new Float64Array(n), nb = Array.from({ length: n }, () => new Set()), nrm = new Float64Array(n * 3);
    const E = edgeMap(F, n); const bnd = new Uint8Array(n); for(const r of E.values()) if(r.t.length !== 2){ bnd[r.a] = 1; bnd[r.b] = 1; }
    for(let t = 0; t < F.length / 3; t++){ const ix = [F[t * 3], F[t * 3 + 1], F[t * 3 + 2]]; const P0 = ix.map(i => P3(p, i)); const N = cross(sub(P0[1], P0[0]), sub(P0[2], P0[0])); const ar = len(N) / 2;
      for(let k = 0; k < 3; k++){ const i = ix[k], u = sub(P0[(k + 1) % 3], P0[k]), v = sub(P0[(k + 2) % 3], P0[k]); const c = dot(u, v) / Math.max(1e-300, len(u) * len(v)); ang[i] += Math.acos(Math.max(-1, Math.min(1, c))); area[i] += ar / 3; nb[i].add(ix[(k + 1) % 3]); nb[i].add(ix[(k + 2) % 3]); nrm[i * 3] += N[0]; nrm[i * 3 + 1] += N[1]; nrm[i * 3 + 2] += N[2]; } }
    const val = new Float64Array(n);
    for(let i = 0; i < n; i++){ if(bnd[i] || !area[i]){ val[i] = 0; continue; }
      if(type === 'M'){ let S = [0, 0, 0], L2 = 0; const pi = P3(p, i); for(const j of nb[i]){ const d = sub(P3(p, j), pi); S = add3(S, d); L2 += dot(d, d); } const m = nb[i].size || 1; const Lv = mul(S, 1 / m); const nn = unit([nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]]); val[i] = -dot(Lv, nn) / Math.max(1e-300, L2 / m) * 2; }
      else val[i] = (TAU - ang[i]) / area[i]; }
    const map = new Map(); for(let i = 0; i < n; i++) map.set(Math.round(p[i * 3] / q) + ',' + Math.round(p[i * 3 + 1] / q) + ',' + Math.round(p[i * 3 + 2] / q), i);
    const find = (x, y, z) => { const X = Math.round(x / q), Y = Math.round(y / q), Z = Math.round(z / q); let r = map.get(X + ',' + Y + ',' + Z); if(r !== undefined) return r;
      for(let a = -1; a <= 1; a++) for(let b = -1; b <= 1; b++) for(let c = -1; c <= 1; c++){ r = map.get((X + a) + ',' + (Y + b) + ',' + (Z + c)); if(r !== undefined) return r; } return -1; };
    return { val: Array.from(val), find };
  };

  /* ===================== chọn mặt / cạnh của lưới ===================== */
  const z3Of = pt => { const L = A._last3D; return L && pt && Date.now() - L.t < 5000 && Math.abs(L.x - pt.x) + Math.abs(L.y - pt.y) < 1e-3 * (1 + Math.abs(pt.x) + Math.abs(pt.y)) ? L.z : null; };
  function distPtTri3(p, a, b, c){ const n = unit(cross(sub(b, a), sub(c, a))); const d = dot(sub(p, a), n); const q = sub(p, mul(n, d));
    const inside = [[a, b], [b, c], [c, a]].every(([u, v]) => dot(cross(sub(v, u), sub(q, u)), n) >= -1e-9); if(inside) return Math.abs(d);
    let m = Infinity; for(const [u, v] of [[a, b], [b, c], [c, a]]){ const e = sub(v, u); const t = Math.max(0, Math.min(1, dot(sub(p, u), e) / Math.max(1e-300, dot(e, e)))); m = Math.min(m, len(sub(p, add3(u, mul(e, t))))); } return m; }
  function segDist2(px, py, ax, ay, bx, by){ const ex = bx - ax, ey = by - ay, L = ex * ex + ey * ey; const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / L)) : 0; const dx = ax + ex * t - px, dy = ay + ey * t - py; return dx * dx + dy * dy; }
  // tam giác dưới điểm chọn: có z (chọn trong khung 3D) thì gần nhất trong không gian, không thì tam giác cao nhất chứa điểm (mặt bằng)
  function triAt(V, F, pt){ const z = z3Of(pt); let best = -1, bv = Infinity;
    if(z != null){ const p = [pt.x, pt.y, z]; for(let t = 0; t < F.length / 3; t++){ const d = distPtTri3(p, P3(V, F[t * 3]), P3(V, F[t * 3 + 1]), P3(V, F[t * 3 + 2])); if(d < bv){ bv = d; best = t; } } return best; }
    let topZ = -Infinity;
    for(let t = 0; t < F.length / 3; t++){ const a = P3(V, F[t * 3]), b = P3(V, F[t * 3 + 1]), c = P3(V, F[t * 3 + 2]); const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if(Math.abs(det) < 1e-12) continue;
      const l1 = ((b[1] - c[1]) * (pt.x - c[0]) + (c[0] - b[0]) * (pt.y - c[1])) / det, l2 = ((c[1] - a[1]) * (pt.x - c[0]) + (a[0] - c[0]) * (pt.y - c[1])) / det, l3 = 1 - l1 - l2;
      if(l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9){ const zz = l1 * a[2] + l2 * b[2] + l3 * c[2]; if(zz > topZ){ topZ = zz; best = t; } } }
    if(best >= 0) return best;
    for(let t = 0; t < F.length / 3; t++){ let m = Infinity; for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3]; m = Math.min(m, segDist2(pt.x, pt.y, V[a * 3], V[a * 3 + 1], V[b * 3], V[b * 3 + 1])); } if(m < bv){ bv = m; best = t; } }
    return best; }
  // mặt của lồng tại điểm: tìm trên lưới đang hiện (đã làm trơn) rồi quy về tam giác lồng
  function cageTriAt(e, c, pt){ const t = triAt(e.v, e.f, pt); if(t < 0) return -1; return Math.floor(t / Math.pow(4, c.lv | 0)); }
  // "mặt" như AutoCAD: tam giác + tam giác cùng mặt phẳng ghép qua cạnh dài nhất (mặt tứ giác của lưới)
  function faceGroup(c, t){ const nv = c.v.length / 3, E = edgeMap(c.f, nv);
    const longest = s => { let bk = -1, bl = -1; for(let k = 0; k < 3; k++){ const a = c.f[s * 3 + k], b = c.f[s * 3 + (k + 1) % 3]; const l = len(sub(P3(c.v, a), P3(c.v, b))); if(l > bl){ bl = l; bk = ekey(a, b, nv); } } return bk; };
    const k = longest(t), r = E.get(k); if(!r || r.t.length !== 2) return [t]; const o = r.t[0] === t ? r.t[1] : r.t[0];
    if(longest(o) !== k) return [t]; const n1 = unit(triN(c.v, c.f, t)), n2 = unit(triN(c.v, c.f, o)); return dot(n1, n2) > 0.9999 ? [t, o] : [t]; }
  // cạnh lồng gần điểm chọn
  function edgeAt(c, pt){ const nv = c.v.length / 3, E = edgeMap(c.f, nv), z = z3Of(pt); let best = null, bd = Infinity;
    for(const r of E.values()){ let d; if(z != null){ const a = P3(c.v, r.a), b = P3(c.v, r.b), p = [pt.x, pt.y, z]; const e = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), e) / Math.max(1e-300, dot(e, e)))); d = len(sub(p, add3(a, mul(e, t)))); d *= d; }
      else d = segDist2(pt.x, pt.y, c.v[r.a * 3], c.v[r.a * 3 + 1], c.v[r.b * 3], c.v[r.b * 3 + 1]); if(d < bd){ bd = d; best = r; } }
    return best; }
  const triPoly = (V, F, t) => [0, 1, 2].map(k => ({ x: V[F[t * 3 + k] * 3], y: V[F[t * 3 + k] * 3 + 1] }));
  async function pickMesh(prompt, filter){ const r = await A.getEnt(prompt || 'Chọn đối tượng lưới', { filter: filter || isMesh }); return r.ent || null; }
  // chọn nhiều mặt lồng: bấm từng điểm, Enter = xong
  async function pickFaces(e, c, prompt){ const S = new Set();
    for(;;){ const polys = [...S].map(t => ({ type: 'POLYLINE', closed: true, vertices: triPoly(c.v, c.f, t) }));
      const r = await A.getPoint((prompt || 'Chọn mặt lưới') + (S.size ? ' (' + S.size + ' tam giác) — Enter = xong' : ''), { preview: polys.length ? g => g.ents(polys, '#ffb347') : null }); if(!r.pt) break;
      const t = cageTriAt(e, c, r.pt); if(t < 0) continue; for(const x of faceGroup(c, t)){ if(S.has(x)) S.delete(x); else S.add(x); } }
    return [...S]; }
  async function pickEdges(e, c, prompt){ const out = []; const seen = new Set();
    for(;;){ const lines = out.map(r => ({ type: 'LINE', x1: c.v[r.a * 3], y1: c.v[r.a * 3 + 1], x2: c.v[r.b * 3], y2: c.v[r.b * 3 + 1] }));
      const r = await A.getPoint((prompt || 'Chọn cạnh lưới') + (out.length ? ' (' + out.length + ' cạnh) — Enter = xong' : ''), { preview: lines.length ? g => g.ents(lines, '#ffb347') : null }); if(!r.pt) break;
      const ed = edgeAt(c, r.pt); if(!ed) continue; const k = ed.a + ',' + ed.b; if(seen.has(k)){ seen.delete(k); out.splice(out.findIndex(x => x.a === ed.a && x.b === ed.b), 1); } else { seen.add(k); out.push(ed); } }
    return out; }
  function commitCage(e, c, msg){ const w = copy(e); setCage(w, c); A.commit({ rep: [[e, w]] }, msg); return w; }

  /* ===================== đổi thành lưới theo tuỳ chọn ===================== */
  // chia đều mỗi tam giác thành k² tam giác (cạnh chung chia như nhau → gộp đỉnh kín nước)
  function divideTris(V, F, k){ if(k <= 1) return { v: V.slice(), f: F.slice() }; const nv = [], nf = [];
    for(let t = 0; t < F.length / 3; t++){ const a = P3(V, F[t * 3]), b = P3(V, F[t * 3 + 1]), c = P3(V, F[t * 3 + 2]); const id = {}; const at = (i, j) => { const key = i + ',' + j; if(id[key] == null){ const u = i / k, w = j / k; const p = add3(add3(mul(a, 1 - u - w), mul(b, u)), mul(c, w)); id[key] = nv.length / 3; nv.push(p[0], p[1], p[2]); } return id[key]; };
      for(let j = 0; j < k; j++) for(let i = 0; i < k - j; i++){ nf.push(at(i, j), at(i + 1, j), at(i, j + 1)); if(i + j + 1 < k) nf.push(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)); } }
    return weldKeep(nv, nf); }
  function toMeshOpt(e, lv, prim){ const o = A.meshOpts(); let m = null;
    if(isMesh(e)){ const w = copy(e); const c = cageOf(e); c.lv = lv == null ? c.lv : lv; return setCage(w, c); }
    const g = A.meshOf ? A.meshOf(e) : null; if(!g || !g.i.length) return null;
    let k = 1; if(e.k === 'ext') k = prim ? Math.max(1, Math.min(8, o.box | 0)) : 1; m = divideTris(g.p, g.i, k); if(!g.smooth && e.k !== 'ext'){ const w0 = weldKeep(m.v, m.f); m = w0; }
    if(!m.f.length) return null; const w = makeMesh(m.v, m.f, e, e.srf ? { srf: 1 } : null); if(e.type === 'SOLID' && e.face) w.srf = 1;
    if(A.volumeOf && !w.srf && A.volumeOf(w) < 0 && A.flipI) A.flipI(w.f);
    return setCage(w, { v: w.v, f: w.f, cr: [], lv: lv == null ? o.lv : lv }); }
  A.toMeshOpt = toMeshOpt;

  /* ===================== MESHSMOOTH… ===================== */
  const meshable = e => isS3(e) || (e && e.type === 'SOLID' && e.face);
  cmd(['MESHSMOOTH'], 'Đổi khối 3D, mặt, mặt 3DFACE thành lưới có độ trơn theo MESHOPTIONS', async () => {
    const s = await A.getSel('Chọn đối tượng đổi thành lưới', { filter: meshable }); const L = unlocked(s.sel); if(!L.length) return; const o = A.meshOpts();
    const rep = []; for(const e of L){ const w = toMeshOpt(e, isMesh(e) ? Math.max(1, cageOf(e).lv) : o.lv); if(w) rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, 'MESHSMOOTH: ' + rep.length + ' lưới, mức trơn ' + (rep[0][1].ms ? rep[0][1].ms.lv : 0)); });
  async function levelBy(d, name){ const s = await A.getSel('Chọn đối tượng lưới', { filter: isMesh }); const L = unlocked(s.sel); if(!L.length) return; const o = A.meshOpts(); const rep = []; let msg = '';
    for(const e of L){ const c = cageOf(e); const nl = c.lv + d; if(nl < 0){ msg = 'Lưới đã ở mức trơn 0.'; continue; } if(nl > o.maxLv){ msg = 'Đã đạt mức trơn tối đa (' + o.maxLv + ', MESHOPTIONS).'; continue; } if(c.f.length / 3 * Math.pow(4, nl) > o.maxFace){ msg = 'Quá số mặt tối đa (' + o.maxFace + ').'; continue; } c.lv = nl; rep.push([e, setCage(copy(e), c)]); }
    if(rep.length) A.commit({ rep }, name + ': mức trơn ' + (rep[0][1].ms ? rep[0][1].ms.lv : 0) + ' · ' + rep[0][1].f.length / 3 + ' tam giác'); else if(msg) log(msg); }
  cmd(['MESHSMOOTHMORE'], 'Tăng độ trơn của lưới một mức', () => levelBy(1, 'MESHSMOOTHMORE'));
  cmd(['MESHSMOOTHLESS'], 'Giảm độ trơn của lưới một mức', () => levelBy(-1, 'MESHSMOOTHLESS'));
  cmd(['MESHREFINE'], 'Làm mịn lưới: các mặt đã làm trơn thành mặt sửa được, mức trơn về 0', async () => {
    const s = await A.getSel('Chọn lưới cần làm mịn', { filter: e => isMesh(e) && e.ms && e.ms.lv > 0 }); const L = unlocked(s.sel); if(!L.length){ log('Chọn lưới có mức trơn ≥ 1.'); return; }
    const rep = L.map(e => { const w = copy(e); delete w.ms; return [e, setCage(w, { v: e.v.slice(), f: e.f.slice(), cr: [], lv: 0 })]; }); A.commit({ rep }, 'MESHREFINE: ' + rep.length + ' lưới'); });
  cmd(['MESHCREASE'], 'Gấp cạnh lưới: cạnh giữ sắc khi làm trơn', async () => {
    const e = await pickMesh('Chọn lưới cần gấp cạnh'); if(!e || A.isLocked(e)) return; const c = cageOf(e);
    const k = await KW('Gấp [Cạnh / Tất cả cạnh gãy]', { kw: [{ k: 'E', t: 'Cạnh' }, { k: 'A', t: 'Tất cả cạnh gãy' }], def: 'E' }); const nv = c.v.length / 3; const have = new Set(); for(let i = 0; i + 1 < c.cr.length; i += 2) have.add(ekey(c.cr[i], c.cr[i + 1], nv));
    let add = [];
    if(k.kw === 'A'){ const E = edgeMap(c.f, nv); for(const r of E.values()){ if(r.t.length !== 2) continue; const d = dot(unit(triN(c.v, c.f, r.t[0])), unit(triN(c.v, c.f, r.t[1]))); if(d < Math.cos(30 * Math.PI / 180)) add.push(r); } }
    else add = await pickEdges(e, c, 'Chọn cạnh cần gấp');
    let n = 0; for(const r of add){ const key = ekey(r.a, r.b, nv); if(!have.has(key)){ have.add(key); c.cr.push(r.a, r.b); n++; } }
    if(!n){ log('Không có cạnh mới.'); return; } commitCage(e, c, 'MESHCREASE: gấp ' + n + ' cạnh'); });
  cmd(['MESHUNCREASE'], 'Bỏ gấp cạnh lưới', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e); if(!c.cr.length){ log('Lưới không có cạnh gấp.'); return; }
    const k = await KW('Bỏ gấp [Cạnh / Tất cả]', { kw: [{ k: 'E', t: 'Cạnh' }, { k: 'A', t: 'Tất cả' }], def: 'A' }); const nv = c.v.length / 3; let n = 0;
    if(k.kw === 'A'){ n = c.cr.length / 2; c.cr = []; } else { const L = await pickEdges(e, c, 'Chọn cạnh bỏ gấp'); const rm = new Set(L.map(r => ekey(r.a, r.b, nv))); const nc = []; for(let i = 0; i + 1 < c.cr.length; i += 2){ if(rm.has(ekey(c.cr[i], c.cr[i + 1], nv))) n++; else nc.push(c.cr[i], c.cr[i + 1]); } c.cr = nc; }
    if(n) commitCage(e, c, 'MESHUNCREASE: bỏ ' + n + ' cạnh gấp'); });

  /* ===================== MESHEXTRUDE ===================== */
  function extrudeFaces(c, S, d, dir){ const nv0 = c.v.length / 3, set = new Set(S), E = edgeMap(c.f, nv0);
    let nAvg = [0, 0, 0]; for(const t of S) nAvg = add3(nAvg, triN(c.v, c.f, t)); const D = dir ? unit(dir) : unit(nAvg); const off = mul(D, d);
    const dup = new Map(); const V = c.v.slice(); const nd = i => { if(!dup.has(i)){ dup.set(i, V.length / 3); const p = add3(P3(c.v, i), off); V.push(p[0], p[1], p[2]); } return dup.get(i); };
    const F = c.f.slice(); const side = [];
    for(const t of S){ for(let k = 0; k < 3; k++){ const a = c.f[t * 3 + k], b = c.f[t * 3 + (k + 1) % 3]; const r = E.get(ekey(a, b, nv0)); const inner = r && r.t.length === 2 && set.has(r.t[0]) && set.has(r.t[1]); if(!inner){ const a2 = nd(a), b2 = nd(b); if(d >= 0) side.push(a, b, b2, a, b2, a2); else side.push(a, b2, b, a, a2, b2); } } }
    for(const t of S) for(let k = 0; k < 3; k++) F[t * 3 + k] = nd(c.f[t * 3 + k]);
    return compact(V, F.concat(side), c.cr); }
  A.meshExtrude = extrudeFaces;
  cmd(['MESHEXTRUDE'], 'Đùn mặt lưới: chọn các mặt, nhập chiều cao (hoặc Hướng 2 điểm)', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e); const S = await pickFaces(e, c, 'Chọn mặt cần đùn'); if(!S.length) return;
    const r = await A.getDist('Chiều cao đùn hoặc', { kw: [{ k: 'D', t: 'Hướng' }], def: 1 }); let d = numOr(r, 1), dir = null;
    if(r.kw === 'D'){ const p1 = await A.getPoint('Điểm đầu của hướng'); if(!p1.pt) return; const p2 = await A.getPoint('Điểm cuối của hướng', { base: p1.pt }); if(!p2.pt) return; const v = [p2.pt.x - p1.pt.x, p2.pt.y - p1.pt.y, (p2.pt.z || 0) - (p1.pt.z || 0)]; d = len(v); dir = v; if(d < 1e-12) return; }
    if(!(isFinite(d) && Math.abs(d) > 1e-12)) return; const m = extrudeFaces(c, S, d, dir); commitCage(e, { v: m.v, f: m.f, cr: m.cr, lv: c.lv }, 'MESHEXTRUDE: ' + S.length + ' tam giác, cao ' + fmt(d)); });

  /* ===================== MESHSPLIT ===================== */
  // cắt các tam giác S bằng mặt phẳng qua đường (x,y) đứng (hoặc mặt ngang z = h); tam giác kề chung cạnh bị cắt cũng tách để lưới vẫn kín
  function splitBy(c, S, sd){ const nv0 = c.v.length / 3, V = c.v.slice(), set = new Set(S), cut = new Map(); const s = i => sd(P3(c.v, i));
    const mid = (a, b) => { const key = ekey(a, b, nv0); if(cut.has(key)) return cut.get(key); const sa = s(a), sb = s(b); if((sa > 1e-9 && sb < -1e-9) || (sa < -1e-9 && sb > 1e-9)){ const t = sa / (sa - sb); const p = add3(P3(c.v, a), mul(sub(P3(c.v, b), P3(c.v, a)), t)); const id = V.length / 3; V.push(p[0], p[1], p[2]); cut.set(key, id); return id; } cut.set(key, -1); return -1; };
    const F = []; let n = 0;
    for(let t = 0; t < c.f.length / 3; t++){ if(!set.has(t)){ continue; } const ix = [c.f[t * 3], c.f[t * 3 + 1], c.f[t * 3 + 2]]; const m = [mid(ix[0], ix[1]), mid(ix[1], ix[2]), mid(ix[2], ix[0])]; const cnt = m.filter(x => x >= 0).length;
      if(cnt === 2){ n++; const k = m[0] < 0 ? 0 : m[1] < 0 ? 1 : 2; /* cạnh k không bị cắt → đỉnh lẻ là ix[(k+2)%3] */ const a = ix[k], b = ix[(k + 1) % 3], cc = ix[(k + 2) % 3]; const mbc = m[(k + 1) % 3], mca = m[(k + 2) % 3]; F.push(cc, mca, mbc, a, b, mbc, a, mbc, mca); }
      else if(cnt === 1){ n++; const k = m.findIndex(x => x >= 0); const a = ix[k], b = ix[(k + 1) % 3], cc = ix[(k + 2) % 3]; F.push(a, m[k], cc, m[k], b, cc); }
      else F.push(ix[0], ix[1], ix[2]); }
    // tam giác ngoài S có cạnh vừa bị cắt
    const out = []; for(let t = 0; t < c.f.length / 3; t++){ if(set.has(t)) continue; const ix = [c.f[t * 3], c.f[t * 3 + 1], c.f[t * 3 + 2]]; let done = false;
      for(let k = 0; k < 3 && !done; k++){ const key = ekey(ix[k], ix[(k + 1) % 3], nv0); const m = cut.get(key); if(m != null && m >= 0){ const a = ix[k], b = ix[(k + 1) % 3], cc = ix[(k + 2) % 3]; out.push(a, m, cc, m, b, cc); done = true; } }
      if(!done) out.push(ix[0], ix[1], ix[2]); }
    return { m: compact(V, out.concat(F), c.cr), n }; }
  cmd(['MESHSPLIT'], 'Tách mặt lưới bằng đường qua 2 điểm (hoặc mặt ngang ở cao độ)', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e); const S = await pickFaces(e, c, 'Chọn mặt cần tách'); if(!S.length) return;
    const p1 = await A.getPoint('Điểm đầu đường tách hoặc', { kw: [{ k: 'H', t: 'Ngang (cao độ)' }] }); let sd;
    if(p1.kw === 'H'){ const z = numOr(await A.getNum('Cao độ mặt tách', { def: 0 }), 0); sd = p => p[2] - z; }
    else { if(!p1.pt) return; const p2 = await A.getPoint('Điểm cuối đường tách', { base: p1.pt }); if(!p2.pt) return; const nx = -(p2.pt.y - p1.pt.y), ny = p2.pt.x - p1.pt.x; const L = Math.hypot(nx, ny); if(L < 1e-12) return; sd = p => ((p[0] - p1.pt.x) * nx + (p[1] - p1.pt.y) * ny) / L; }
    const r = splitBy(c, S, sd); if(!r.n){ log('Đường tách không cắt qua mặt đã chọn.'); return; } commitCage(e, { v: r.m.v, f: r.m.f, cr: r.m.cr, lv: c.lv }, 'MESHSPLIT: tách ' + r.n + ' tam giác'); });

  /* ===================== MESHMERGE · MESHCOLLAPSE · MESHSPIN · MESHCAP ===================== */
  // tam giác hoá đa giác 3D (chiếu lên mặt phẳng trung bình), cắt tai
  function earcut3(L){ let N = [0, 0, 0]; for(let i = 0; i < L.length; i++){ const a = L[i], b = L[(i + 1) % L.length]; N[0] += (a[1] - b[1]) * (a[2] + b[2]); N[1] += (a[2] - b[2]) * (a[0] + b[0]); N[2] += (a[0] - b[0]) * (a[1] + b[1]); } N = unit(N);
    const U = unit(Math.abs(N[2]) < 0.9 ? cross([0, 0, 1], N) : cross([1, 0, 0], N)), W = cross(N, U); const P = L.map(p => [dot(p, U), dot(p, W)]);
    const idx = P.map((_, i) => i), out = []; const ar = (a, b, c) => (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
    const inT = (p, a, b, c) => { const d1 = ar(a, b, p), d2 = ar(b, c, p), d3 = ar(c, a, p); return d1 > 0 && d2 > 0 && d3 > 0; };
    let guard = 0; while(idx.length > 3 && guard++ < 10000){ let cut = false; for(let i = 0; i < idx.length; i++){ const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length]; if(ar(a, b, c) <= 1e-14) continue; if(idx.some(p => p !== a && p !== b && p !== c && inT(p, a, b, c))) continue; out.push(a, b, c); idx.splice(i, 1); cut = true; break; } if(!cut){ for(let i = 1; i + 1 < idx.length; i++) out.push(idx[0], idx[i], idx[i + 1]); idx.length = 0; break; } }
    if(idx.length === 3) out.push(idx[0], idx[1], idx[2]); return { tri: out, N }; }
  A.earcut3 = earcut3;
  // biên (các cạnh có hướng không có cạnh đối) của tập tam giác → các vòng
  function boundaryLoops(F, S){ const set = S ? new Set(S) : null, D = new Map(), cnt = new Map();
    const tris = S ? S : [...Array(F.length / 3).keys()];
    for(const t of tris) for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3]; cnt.set(a + '>' + b, (cnt.get(a + '>' + b) || 0) + 1); }
    for(const t of tris) for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3]; if(!cnt.has(b + '>' + a)) D.set(a, b); }
    const loops = [], seen = new Set(); for(const s of D.keys()){ if(seen.has(s)) continue; const L = []; let cur = s, g = 0; while(cur != null && !seen.has(cur) && g++ < 1e6){ seen.add(cur); L.push(cur); cur = D.get(cur); } if(L.length >= 3) loops.push(L); }
    void set; return loops; }
  A.meshBoundaryLoops = boundaryLoops;
  cmd(['MESHMERGE'], 'Gộp các mặt lưới kề nhau thành một mặt', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e); const S = await pickFaces(e, c, 'Chọn các mặt kề nhau cần gộp'); if(S.length < 2){ log('Chọn ít nhất 2 mặt.'); return; }
    const L = boundaryLoops(c.f, S); if(L.length !== 1){ log('Các mặt đã chọn phải liền nhau, không có lỗ.'); return; }
    const lp = L[0], pts = lp.map(i => P3(c.v, i)); const ec = earcut3(pts); const set = new Set(S); const F = []; for(let t = 0; t < c.f.length / 3; t++) if(!set.has(t)) F.push(c.f[t * 3], c.f[t * 3 + 1], c.f[t * 3 + 2]);
    // giữ hướng: so pháp tuyến với trung bình các mặt cũ
    let n0 = [0, 0, 0]; for(const t of S) n0 = add3(n0, triN(c.v, c.f, t)); const nt = []; for(let k = 0; k < ec.tri.length; k += 3){ nt.push(lp[ec.tri[k]], lp[ec.tri[k + 1]], lp[ec.tri[k + 2]]); }
    if(dot(ec.N, n0) < 0) for(let k = 0; k < nt.length; k += 3){ const t = nt[k + 1]; nt[k + 1] = nt[k + 2]; nt[k + 2] = t; }
    const m = compact(c.v, F.concat(nt), c.cr); commitCage(e, { v: m.v, f: m.f, cr: m.cr, lv: c.lv }, 'MESHMERGE: gộp ' + S.length + ' tam giác thành 1 mặt (' + nt.length / 3 + ' tam giác)'); });
  cmd(['MESHCOLLAPSE'], 'Thu mặt hoặc cạnh lưới về một điểm (tâm)', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e);
    const k = await KW('Thu [Mặt / Cạnh]', { kw: [{ k: 'F', t: 'Mặt' }, { k: 'E', t: 'Cạnh' }], def: 'F' }); let ids = [];
    if(k.kw === 'E'){ const L = await pickEdges(e, c, 'Chọn cạnh cần thu'); if(!L.length) return; ids = [L[0].a, L[0].b]; }
    else { const S = await pickFaces(e, c, 'Chọn mặt cần thu'); if(!S.length) return; ids = [...new Set(S.flatMap(t => [c.f[t * 3], c.f[t * 3 + 1], c.f[t * 3 + 2]]))]; }
    let C = [0, 0, 0]; for(const i of ids) C = add3(C, P3(c.v, i)); C = mul(C, 1 / ids.length); const keep = ids[0]; const V = c.v.slice(); V[keep * 3] = C[0]; V[keep * 3 + 1] = C[1]; V[keep * 3 + 2] = C[2];
    const set = new Set(ids); const F = c.f.map(i => set.has(i) ? keep : i); const cr = c.cr.map(i => set.has(i) ? keep : i); const m = compact(V, F, cr);
    commitCage(e, { v: m.v, f: m.f, cr: m.cr, lv: c.lv }, 'MESHCOLLAPSE: ' + ids.length + ' đỉnh → 1'); });
  cmd(['MESHSPIN'], 'Xoay cạnh chung của hai mặt tam giác (đổi đường chéo)', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e); const L = await pickEdges(e, c, 'Chọn cạnh chung của 2 tam giác'); if(!L.length) return; const r = L[0];
    if(r.t.length !== 2){ log('Cạnh phải là cạnh chung của đúng 2 tam giác.'); return; } const [t1, t2] = r.t; const opp = t => [0, 1, 2].map(k => c.f[t * 3 + k]).find(i => i !== r.a && i !== r.b);
    // a→b theo hướng của t1
    let a = r.a, b = r.b; for(let k = 0; k < 3; k++) if(c.f[t1 * 3 + k] === r.b && c.f[t1 * 3 + (k + 1) % 3] === r.a){ a = r.b; b = r.a; }
    const c1 = opp(t1), d1 = opp(t2); const F = c.f.slice(); F[t1 * 3] = c1; F[t1 * 3 + 1] = a; F[t1 * 3 + 2] = d1; F[t2 * 3] = d1; F[t2 * 3 + 1] = b; F[t2 * 3 + 2] = c1;
    const nv = c.v.length / 3; const cr = []; for(let i = 0; i + 1 < c.cr.length; i += 2) if(ekey(c.cr[i], c.cr[i + 1], nv) !== ekey(r.a, r.b, nv)) cr.push(c.cr[i], c.cr[i + 1]);
    commitCage(e, { v: c.v, f: F, cr, lv: c.lv }, 'MESHSPIN: đã xoay cạnh'); });
  cmd(['MESHCAP'], 'Bịt lỗ hở của lưới: chọn một cạnh của biên hở', async () => {
    const e = await pickMesh('Chọn lưới'); if(!e || A.isLocked(e)) return; const c = cageOf(e); const loops = boundaryLoops(c.f); if(!loops.length){ log('Lưới đã kín, không có lỗ.'); return; }
    let lp = loops[0]; if(loops.length > 1){ const L = await pickEdges(e, c, 'Chọn một cạnh của biên cần bịt'); if(!L.length) return; lp = loops.find(l => l.includes(L[0].a) && l.includes(L[0].b)) || null; if(!lp){ log('Cạnh không nằm trên biên hở.'); return; } }
    const pts = lp.map(i => P3(c.v, i)); const ec = earcut3(pts.slice().reverse()); const rl = lp.slice().reverse(); const nt = []; for(let k = 0; k < ec.tri.length; k += 3) nt.push(rl[ec.tri[k]], rl[ec.tri[k + 1]], rl[ec.tri[k + 2]]);
    const w = commitCage(e, { v: c.v, f: c.f.concat(nt), cr: c.cr, lv: c.lv }, 'MESHCAP: bịt lỗ ' + lp.length + ' cạnh'); void w; });

  /* ===================== MESHOPTIONS · MESHPRIMITIVEOPTIONS ===================== */
  plain(['MESHOPTIONS'], 'Tuỳ chọn đổi thành lưới (Mesh Tessellation Options): mức trơn sau khi đổi, mức tối đa, số mặt tối đa', () => {
    const o = A.meshOpts(); const d = A.dialog({ title: 'Mesh Tessellation Options', html: '<div class="acw" style="min-width:360px"><fieldset class="acw-grp"><legend>Sau khi đổi thành lưới</legend><div class="acw-row"><label>Mức trơn (MESHSMOOTH)</label><select id="moLv">' + [0, 1, 2, 3, 4].map(i => '<option' + (i === o.lv ? ' selected' : '') + '>' + i + '</option>').join('') + '</select></div></fieldset><fieldset class="acw-grp"><legend>Giới hạn</legend><div class="acw-row"><label>Mức trơn tối đa (SMOOTHMESHMAXLEV)</label><input id="moMx" type="number" min="1" max="6" value="' + o.maxLv + '" style="width:70px"></div><div class="acw-row"><label>Số tam giác tối đa (SMOOTHMESHMAXFACE)</label><input id="moMf" type="number" min="1000" step="1000" value="' + o.maxFace + '" style="width:110px"></div></fieldset></div>',
      ok: root => { o.lv = +root.querySelector('#moLv').value; o.maxLv = Math.max(1, Math.min(6, +root.querySelector('#moMx').value || 4)); o.maxFace = Math.max(1000, +root.querySelector('#moMf').value || 200000); saveOpts(o); log('MESHOPTIONS: mức trơn ' + o.lv + ', tối đa ' + o.maxLv + ', ' + o.maxFace + ' tam giác.'); } });
    d.root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation())); });
  plain(['MESHPRIMITIVEOPTIONS'], 'Tuỳ chọn khối lưới cơ bản: số chia cạnh hộp / nêm / chóp, mức trơn ban đầu', () => {
    const o = A.meshOpts(); const row = (k, t) => '<div class="acw-row"><label>' + t + '</label><input data-k="' + k + '" type="number" min="1" max="8" value="' + o[k] + '" style="width:70px"></div>';
    const d = A.dialog({ title: 'Mesh Primitive Options', html: '<div class="acw" style="min-width:340px"><fieldset class="acw-grp"><legend>Số chia mỗi cạnh</legend>' + row('box', 'Hộp (Box)') + row('wedge', 'Nêm (Wedge)') + row('pyr', 'Chóp (Pyramid)') + '</fieldset><fieldset class="acw-grp"><legend>Độ trơn</legend><div class="acw-row"><label>Mức trơn khối mới</label><select id="mpLv">' + [0, 1, 2, 3, 4].map(i => '<option' + (i === o.primLv ? ' selected' : '') + '>' + i + '</option>').join('') + '</select></div></fieldset><div class="acw-note">Trụ, nón, cầu, xuyến đã chia mịn sẵn (48 phần theo vòng).</div></div>',
      ok: root => { root.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = Math.max(1, Math.min(8, +i.value || 3)); }); o.primLv = +root.querySelector('#mpLv').value; saveOpts(o); log('MESHPRIMITIVEOPTIONS: hộp ' + o.box + ', nêm ' + o.wedge + ', chóp ' + o.pyr + ', mức trơn ' + o.primLv + '.'); } });
    d.root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation())); });
  // MESH: khối lưới cơ bản dùng số chia và mức trơn của MESHPRIMITIVEOPTIONS (như AutoCAD)
  { const PRIM = { B: 'BOX', C: 'CYLINDER', O: 'CONE', S: 'SPHERE', W: 'WEDGE', T: 'TORUS', P: 'PYRAMID' };
    cmd(['MESH'], 'Khối lưới cơ bản (hộp, trụ, nón, cầu, nêm, xuyến, chóp) — số chia theo MESHPRIMITIVEOPTIONS', async () => {
      const k = await KW('Loại khối lưới [Hộp / Trụ / nÓn / Cầu / Nêm / Xuyến / Chóp / Cài đặt]', { kw: [{ k: 'B', t: 'Hộp' }, { k: 'C', t: 'Trụ' }, { k: 'O', t: 'Nón' }, { k: 'S', t: 'Cầu' }, { k: 'W', t: 'Nêm' }, { k: 'T', t: 'Xuyến' }, { k: 'P', t: 'Chóp' }, { k: 'SE', t: 'Cài đặt' }], def: 'B' });
      if(k.kw === 'SE'){ setTimeout(() => DVDCmd.run('MESHPRIMITIVEOPTIONS'), 0); return; }
      const c = PRIM[k.kw || 'B'], before = new Set(ME());
      setTimeout(() => { DVDCmd.run(c); const t0 = Date.now(); const iv = setInterval(() => { if(A.busy() && Date.now() - t0 < 600000) return; clearInterval(iv);
        const o = A.meshOpts(); const rep = ME().filter(e => !before.has(e) && isS3(e) && e.k !== 'mesh').map(e => [e, toMeshOpt(e, o.primLv, true)]).filter(x => x[1]); if(rep.length){ A.commit({ rep }, 'MESH'); log('Đã tạo ' + rep.length + ' khối lưới (' + rep[0][1].f.length / 3 + ' tam giác).'); } }, 120); }, 0); }); }

  /* ===================== đường cong → điểm 3D ===================== */
  function curvePts(e, step){
    if(!e) return null;
    if(e.type === 'POLYLINE' && (e.p3 || !(e.vertices || []).some(v => v.b))){ const z0 = e.elev || e.z || 0; const L = (e.vertices || []).map(v => [v.x, v.y, v.z != null ? v.z : z0]); return { pts: L, closed: !!e.closed }; }
    if(e.type === 'LINE') return { pts: [[e.x1, e.y1, e.z1 || 0], [e.x2, e.y2, e.z2 || 0]], closed: false };
    const c = A.G && A.G.curveOf ? A.G.curveOf(e) : null; if(!c) return null; const z = e.elev || e.z || 0, out = [];
    for(const q of c.pieces || []){ if(q.t === 's'){ out.push([q.ax, q.ay, z]); } else if(q.t === 'a'){ const n = Math.max(4, Math.ceil(Math.abs(q.sw) / (Math.PI / 24))); for(let i = 0; i < n; i++){ const a = q.a0 + q.sw * i / n; out.push([q.cx + q.r * Math.cos(a), q.cy + q.r * Math.sin(a), z]); } } else { /* khác: lấy mẫu theo tham số */ } }
    if(!out.length || !(c.pieces || []).every(q => q.t === 's' || q.t === 'a')){ out.length = 0; const N = 96; for(let i = 0; i <= N; i++){ const p = c.at(c.u0 + (c.u1 - c.u0) * i / N); out.push([p.x, p.y, z]); } if(c.closed) out.pop(); return { pts: out, closed: !!c.closed }; }
    const last = (c.pieces || [])[c.pieces.length - 1]; if(!c.closed && last){ if(last.t === 's') out.push([last.bx, last.by, z]); else out.push([last.cx + last.r * Math.cos(last.a0 + last.sw), last.cy + last.r * Math.sin(last.a0 + last.sw), z]); }
    void step; return { pts: out, closed: !!c.closed }; }
  A.curvePts3 = curvePts;
  const isCurve = e => !!(e && (e.type === 'LINE' || e.type === 'ARC' || e.type === 'CIRCLE' || e.type === 'ELLIPSE' || e.type === 'SPLINE' || e.type === 'POLYLINE'));
  function resample(L, n, closed){ const P = closed ? L.concat([L[0]]) : L; const d = [0]; for(let i = 1; i < P.length; i++) d.push(d[i - 1] + len(sub(P[i], P[i - 1]))); const T = d[d.length - 1] || 1; const out = [];
    for(let k = 0; k < n; k++){ const s = closed ? T * k / n : T * k / (n - 1); let i = 1; while(i < P.length - 1 && d[i] < s) i++; const t = (s - d[i - 1]) / Math.max(1e-300, d[i] - d[i - 1]); out.push(add3(P[i - 1], mul(sub(P[i], P[i - 1]), Math.max(0, Math.min(1, t))))); } return out; }
  // lưới hình chữ nhật R × C điểm → mặt
  function gridSurf(G, base, closedU){ const R = G.length, C = G[0].length, V = [], F = []; for(const row of G) for(const p of row) V.push(p[0], p[1], p[2]);
    const cc = closedU ? C : C - 1; for(let i = 0; i < R - 1; i++) for(let j = 0; j < cc; j++){ const j2 = (j + 1) % C; const a = i * C + j, b = i * C + j2, c = (i + 1) * C + j2, d = (i + 1) * C + j; F.push(a, b, c, a, c, d); }
    const w = weldKeep(V, F); return makeMesh(w.v, w.f, base, { srf: 1 }); }
  const poly3 = (pts, closed, base) => { const e = { type: 'POLYLINE', p3: 1, closed: !!closed, vertices: pts.map(p => ({ x: +p[0].toFixed(6), y: +p[1].toFixed(6), z: +p[2].toFixed(6) })) }; if(base) for(const k of ['layer', 'col', 'bl']) if(base[k] != null) e[k] = base[k]; else A.newProps(e); if(!base) A.newProps(e); return e; };

  /* ===================== pháp tuyến đỉnh ===================== */
  function vNormals(V, F){ const n = V.length / 3, N = new Float64Array(n * 3); for(let t = 0; t < F.length / 3; t++){ const c = triN(V, F, t); for(let k = 0; k < 3; k++){ const i = F[t * 3 + k]; N[i * 3] += c[0]; N[i * 3 + 1] += c[1]; N[i * 3 + 2] += c[2]; } }
    const out = []; for(let i = 0; i < n; i++) out.push(unit([N[i * 3], N[i * 3 + 1], N[i * 3 + 2]])); return out; }

  /* ===================== SURFOFFSET ===================== */
  function offsetMesh(e, d){ const w0 = weldKeep(e.v, e.f); const N = vNormals(w0.v, w0.f); const V = []; for(let i = 0; i < N.length; i++){ const p = add3(P3(w0.v, i), mul(N[i], d)); V.push(p[0], p[1], p[2]); } return { v: V, f: w0.f.slice(), v0: w0.v }; }
  cmd(['SURFOFFSET'], 'Mặt song song cách mặt đã chọn một khoảng (cả hai phía / tạo khối đặc)', async () => {
    const s = await A.getSel('Chọn mặt cần dời', { filter: e => isS3(e) && !!(e.srf || e.k === 'mesh') }); const L = unlocked(s.sel); if(!L.length) return;
    const r = await A.getDist('Khoảng cách dời hoặc', { kw: [{ k: 'B', t: 'Cả hai phía' }, { k: 'S', t: 'Khối đặc' }, { k: 'F', t: 'Đảo hướng' }], def: 1 }); let both = false, solid = false, flip = false, R = r;
    for(let g = 0; g < 4 && R.kw; g++){ if(R.kw === 'B') both = true; if(R.kw === 'S') solid = true; if(R.kw === 'F') flip = true; R = await A.getDist('Khoảng cách dời', { def: 1 }); }
    let d = numOr(R, 1); if(!isFinite(d) || !d) return; if(flip) d = -d; const add = [];
    for(const e of L){ const m = toMeshOpt(e, 0) || e; const sides = both ? [d, -d] : [d];
      if(solid){ const o = offsetMesh(m, d), n0 = o.v0.length / 3; const V = o.v0.concat(o.v); const F = []; for(let t = 0; t < o.f.length; t += 3) F.push(o.f[t], o.f[t + 2], o.f[t + 1]); for(let t = 0; t < o.f.length; t += 3) F.push(o.f[t] + n0, o.f[t + 1] + n0, o.f[t + 2] + n0);
        for(const lp of boundaryLoops(o.f)) for(let k = 0; k < lp.length; k++){ const a = lp[k], b = lp[(k + 1) % lp.length]; F.push(b, a, a + n0, b, a + n0, b + n0); }
        const sol = makeMesh(V, F, e); if(A.volumeOf && A.volumeOf(sol) < 0) A.flipI(sol.f); add.push(sol); continue; }
      for(const dd of sides){ const o = offsetMesh(m, dd); add.push(makeMesh(o.v, o.f, e, { srf: 1 })); } }
    if(add.length) A.commit({ add }, 'SURFOFFSET: ' + add.length + ' mặt, khoảng ' + fmt(d)); });

  /* ===================== SURFEXTEND ===================== */
  function extendMesh(m, d, pick){ const w = weldKeep(m.v, m.f); const V = w.v.slice(), F = w.f.slice(); const loops = boundaryLoops(F); if(!loops.length) return null; const nv = V.length / 3;
    const E = edgeMap(F, nv); const dir = new Map(); const want = (a, b) => !pick || pick.has(ekey(a, b, nv));
    for(const lp of loops) for(let k = 0; k < lp.length; k++){ const a = lp[k], b = lp[(k + 1) % lp.length]; if(!want(a, b)) continue; const r = E.get(ekey(a, b, nv)); const t = r.t[0]; const n = unit(triN(V, F, t)); const ev = unit(sub(P3(V, b), P3(V, a))); const out = unit(cross(ev, n)); for(const i of [a, b]){ const o = dir.get(i) || [0, 0, 0]; dir.set(i, add3(o, out)); } }
    const nd = new Map(); for(const [i, v] of dir){ const p = add3(P3(V, i), mul(unit(v), d)); nd.set(i, V.length / 3); V.push(p[0], p[1], p[2]); }
    let n = 0; for(const lp of loops) for(let k = 0; k < lp.length; k++){ const a = lp[k], b = lp[(k + 1) % lp.length]; if(!want(a, b) || !nd.has(a) || !nd.has(b)) continue; const a2 = nd.get(a), b2 = nd.get(b); F.push(b, a, a2, b, a2, b2); n++; }
    return n ? { v: V, f: F, n } : null; }
  cmd(['SURFEXTEND'], 'Kéo dài mặt theo cạnh biên một khoảng', async () => {
    const e = await pickMesh('Chọn mặt cần kéo dài', e => isS3(e) && e.k === 'mesh' && !!e.srf); if(!e || A.isLocked(e)) return;
    const k = await KW('Kéo dài [Mọi cạnh biên / Chọn cạnh]', { kw: [{ k: 'A', t: 'Mọi cạnh biên' }, { k: 'E', t: 'Chọn cạnh' }], def: 'A' }); let pick = null; const c = { v: weldKeep(e.v, e.f).v, f: weldKeep(e.v, e.f).f, cr: [], lv: 0 };
    if(k.kw === 'E'){ const L = await pickEdges({ v: c.v, f: c.f }, c, 'Chọn cạnh biên cần kéo dài'); if(!L.length) return; pick = new Set(L.map(r => ekey(r.a, r.b, c.v.length / 3))); }
    const r = await A.getDist('Khoảng kéo dài', { def: 1 }); const d = numOr(r, 1); if(!(d > 0)) return; const m = extendMesh(c, d, pick); if(!m){ log('Mặt không có cạnh biên (đã kín).'); return; }
    const w = copy(e); delete w.ms; setCage(w, { v: m.v, f: m.f, cr: [], lv: 0 }); A.commit({ rep: [[e, w]] }, 'SURFEXTEND: kéo dài ' + m.n + ' cạnh biên ' + fmt(d)); });

  /* ===================== SURFTRIM / SURFUNTRIM ===================== */
  const inPoly = (x, y, P) => { let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ if(((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; };
  function linSplit(V, F){ const n = V.length / 3, M = new Map(), nv = V.slice(), nf = []; const mid = (a, b) => { const k = ekey(a, b, n); if(M.has(k)) return M.get(k); const id = nv.length / 3; nv.push((V[a * 3] + V[b * 3]) / 2, (V[a * 3 + 1] + V[b * 3 + 1]) / 2, (V[a * 3 + 2] + V[b * 3 + 2]) / 2); M.set(k, id); return id; };
    for(let t = 0; t < F.length / 3; t++){ const a = F[t * 3], b = F[t * 3 + 1], c = F[t * 3 + 2]; const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); } return { v: nv, f: nf }; }
  function trimMesh(m, polys, removeInside){ let V = m.v.slice(), F = m.f.slice();
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity]; for(const P of polys) for(const p of P){ lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1])]; hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1])]; } const target = Math.max(hi[0] - lo[0], hi[1] - lo[1]) / 60;
    for(let it = 0; it < 6; it++){ let mx = 0; for(let t = 0; t < F.length / 3; t++) for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3]; mx = Math.max(mx, Math.hypot(V[a * 3] - V[b * 3], V[a * 3 + 1] - V[b * 3 + 1])); } if(mx <= target || F.length / 3 * 4 > 120000) break; const s = linSplit(V, F); V = s.v; F = s.f; }
    const inside = (x, y) => polys.some(P => inPoly(x, y, P)); const keep = []; let rm = 0;
    for(let t = 0; t < F.length / 3; t++){ const a = F[t * 3], b = F[t * 3 + 1], c = F[t * 3 + 2]; const cx = (V[a * 3] + V[b * 3] + V[c * 3]) / 3, cy = (V[a * 3 + 1] + V[b * 3 + 1] + V[c * 3 + 1]) / 3; if(inside(cx, cy) === removeInside){ rm++; continue; } keep.push(a, b, c); }
    if(!rm || !keep.length) return null; const cm = compact(V, keep, []);
    // dời đỉnh biên mới về đường cắt (chiếu theo Z)
    const segs = []; for(const P of polys) for(let i = 0; i < P.length; i++) segs.push([P[i], P[(i + 1) % P.length]]);
    const tol = target * 0.75; for(const lp of boundaryLoops(cm.f)) for(const i of lp){ const x = cm.v[i * 3], y = cm.v[i * 3 + 1]; let best = null, bd = tol * tol; for(const [p, q] of segs){ const ex = q[0] - p[0], ey = q[1] - p[1], L = ex * ex + ey * ey; const t = L > 0 ? Math.max(0, Math.min(1, ((x - p[0]) * ex + (y - p[1]) * ey) / L)) : 0; const px = p[0] + ex * t, py = p[1] + ey * t; const d = (px - x) * (px - x) + (py - y) * (py - y); if(d < bd){ bd = d; best = [px, py]; } } if(best){ cm.v[i * 3] = best[0]; cm.v[i * 3 + 1] = best[1]; } }
    return { v: cm.v, f: cm.f, rm }; }
  cmd(['SURFTRIM'], 'Cắt bỏ một phần mặt bằng đường cong kín (chiếu theo phương Z)', async () => {
    const s = await A.getSel('Chọn mặt cần cắt', { filter: e => isS3(e) && e.k === 'mesh' && !!e.srf }); const L = unlocked(s.sel); if(!L.length) return;
    const c = await A.getSel('Chọn đường cắt kín (đa tuyến kín, tròn, elip…)', { filter: e => { if(!isCurve(e)) return false; const q = curvePts(e); return !!(q && q.closed && q.pts.length >= 3); }, pre: false }); const polys = (c.sel || []).map(e => curvePts(e).pts); if(!polys.length) return;
    const p = await A.getPoint('Chọn vùng cần bỏ (trong hoặc ngoài đường cắt)'); if(!p.pt) return; const rin = polys.some(P => inPoly(p.pt.x, p.pt.y, P));
    const rep = []; for(const e of L){ const m = trimMesh({ v: e.v, f: e.f }, polys, rin); if(!m) continue; const w = copy(e); delete w.ms; w.trim0 = e.trim0 || { v: e.v.slice(), f: e.f.slice() }; setCage(w, { v: m.v, f: m.f, cr: [], lv: 0 }); rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, 'SURFTRIM: cắt ' + rep.length + ' mặt (bỏ phần ' + (rin ? 'trong' : 'ngoài') + ')'); else log('Đường cắt không cắt qua mặt đã chọn.'); });
  cmd(['SURFUNTRIM'], 'Trả lại phần mặt đã cắt bằng SURFTRIM', async () => {
    const s = await A.getSel('Chọn mặt đã cắt', { filter: e => isS3(e) && !!e.trim0 }); const L = unlocked(s.sel); if(!L.length){ log('Chọn mặt đã cắt bằng SURFTRIM.'); return; }
    const rep = L.map(e => { const w = copy(e); const t = w.trim0; delete w.trim0; delete w.ms; setCage(w, { v: t.v, f: t.f, cr: [], lv: 0 }); return [e, w]; }); A.commit({ rep }, 'SURFUNTRIM: ' + rep.length + ' mặt'); });

  /* ===================== SURFPATCH ===================== */
  function patchLoop(L, base){ const ec = earcut3(L); let V = []; for(const p of L) V.push(p[0], p[1], p[2]); let F = ec.tri.slice(); const nb0 = L.length;
    let lo = Infinity, hi = -Infinity; for(const p of L) for(const x of p){ lo = Math.min(lo, x); hi = Math.max(hi, x); } const target = (hi - lo) / 12;
    for(let it = 0; it < 4; it++){ let mx = 0; for(let t = 0; t < F.length / 3; t++) for(let k = 0; k < 3; k++){ const a = F[t * 3 + k], b = F[t * 3 + (k + 1) % 3]; mx = Math.max(mx, len(sub(P3(V, a), P3(V, b)))); } if(mx <= target || F.length / 3 * 4 > 40000) break; const s = linSplit(V, F); V = s.v; F = s.f; }
    // làm trơn đỉnh trong (Laplace), giữ biên → mặt căng như màng
    const n = V.length / 3, E = edgeMap(F, n), nb = Array.from({ length: n }, () => []), bnd = new Uint8Array(n); for(const r of E.values()){ nb[r.a].push(r.b); nb[r.b].push(r.a); if(r.t.length !== 2){ bnd[r.a] = 1; bnd[r.b] = 1; } } for(let i = 0; i < nb0; i++) bnd[i] = 1;
    for(let it = 0; it < 60; it++){ const W = V.slice(); for(let i = 0; i < n; i++){ if(bnd[i] || !nb[i].length) continue; let S = [0, 0, 0]; for(const j of nb[i]) S = add3(S, P3(V, j)); S = mul(S, 1 / nb[i].length); W[i * 3] = S[0]; W[i * 3 + 1] = S[1]; W[i * 3 + 2] = S[2]; } V = W; }
    return makeMesh(V, F, base, { srf: 1 }); }
  A.surfPatch = patchLoop;
  cmd(['SURFPATCH'], 'Vá mặt: tạo mặt lấp đầy đường kín (hoặc lỗ biên của mặt)', async () => {
    const r = await A.getEnt('Chọn đường kín hoặc mặt có lỗ biên', { filter: e => (isCurve(e) && (curvePts(e) || {}).closed) || (isMesh(e)) }); const e = r.ent; if(!e) return; let L = null;
    if(isMesh(e)){ const w = weldKeep(e.v, e.f); const loops = boundaryLoops(w.f); if(!loops.length){ log('Mặt không có lỗ biên.'); return; } let lp = loops[0];
      if(loops.length > 1){ const p = await A.getPoint('Chọn gần cạnh của lỗ cần vá'); if(!p.pt) return; const ed = edgeAt({ v: w.v, f: w.f }, p.pt); lp = loops.find(l => ed && l.includes(ed.a) && l.includes(ed.b)) || loops[0]; }
      L = lp.slice().reverse().map(i => P3(w.v, i)); }
    else L = curvePts(e).pts;
    if(!L || L.length < 3) return; const s = patchLoop(L, e); A.commit({ add: [s] }, 'SURFPATCH: vá ' + L.length + ' cạnh (' + s.f.length / 3 + ' tam giác)'); });

  /* ===================== SURFBLEND ===================== */
  // chuỗi cạnh biên của mặt gần điểm chọn (dừng ở góc gãy > 30°) + hướng tiếp tuyến ra ngoài mặt tại từng đỉnh
  function edgeChain(e, pt){ const w = weldKeep(e.v, e.f), V = w.v, F = w.f; const loops = boundaryLoops(F); if(!loops.length) return null; const ed = edgeAt({ v: V, f: F }, pt); if(!ed) return null;
    const lp = loops.find(l => l.includes(ed.a) && l.includes(ed.b)); if(!lp) return null; const n = lp.length; let k0 = lp.indexOf(ed.a); if(lp[(k0 + 1) % n] !== ed.b) k0 = lp.indexOf(ed.b);
    const turn = k => { const p = P3(V, lp[(k + n - 1) % n]), q = P3(V, lp[k]), r = P3(V, lp[(k + 1) % n]); return dot(unit(sub(q, p)), unit(sub(r, q))) < Math.cos(30 * Math.PI / 180); };
    let s = k0, g = 0; while(!turn(s) && g++ < n) s = (s + n - 1) % n; let t = (k0 + 1) % n; g = 0; while(!turn(t) && g++ < n) t = (t + 1) % n;
    const ids = []; let k = s; g = 0; do { ids.push(lp[k]); if(k === t) break; k = (k + 1) % n; } while(g++ < n); if(ids.length < 2) return null;
    const E = edgeMap(F, V.length / 3); const tan = ids.map(() => [0, 0, 0]);
    for(let i = 0; i + 1 < ids.length; i++){ const a = ids[i], b = ids[i + 1]; const r2 = E.get(ekey(a, b, V.length / 3)); if(!r2) continue; const nn = unit(triN(V, F, r2.t[0])); const o = unit(cross(unit(sub(P3(V, b), P3(V, a))), nn)); tan[i] = add3(tan[i], o); tan[i + 1] = add3(tan[i + 1], o); }
    return { pts: ids.map(i => P3(V, i)), tan: tan.map(unit) }; }
  async function pickChain(prompt){ const r = await A.getEnt(prompt, { filter: e => isCurve(e) || isMesh(e) }); const e = r.ent; if(!e) return null;
    if(isMesh(e)){ const pt = r.pt || (await A.getPoint('Chọn gần cạnh biên')).pt; if(!pt) return null; const c = edgeChain(e, pt); if(c) c.e = e; return c; }
    const q = curvePts(e); if(!q) return null; return { pts: q.pts, tan: null, e }; }
  cmd(['SURFBLEND'], 'Mặt chuyển tiếp nối hai cạnh biên mặt (liên tục tiếp tuyến) hoặc hai đường', async () => {
    const c1 = await pickChain('Chọn cạnh biên mặt / đường thứ nhất'); if(!c1) return; const c2 = await pickChain('Chọn cạnh biên mặt / đường thứ hai'); if(!c2) return;
    const b = await A.getNum('Độ phồng (0 – 1, 0 = mặt kẻ thẳng)', { def: 0.5 }); const bulge = b.num == null ? 0.5 : Math.max(0, Math.min(1, b.num));
    const N = Math.max(8, Math.min(80, Math.max(c1.pts.length, c2.pts.length) * 2)); let A1 = resample(c1.pts, N, false), A2 = resample(c2.pts, N, false);
    const t1 = c1.tan ? resample(c1.tan, N, false).map(unit) : null; let t2 = c2.tan ? resample(c2.tan, N, false).map(unit) : null;
    if(len(sub(A1[0], A2[0])) + len(sub(A1[N - 1], A2[N - 1])) > len(sub(A1[0], A2[N - 1])) + len(sub(A1[N - 1], A2[0]))){ A2 = A2.reverse(); if(t2) t2 = t2.reverse(); }
    const M = 12, G = []; for(let i = 0; i <= M; i++){ const s = i / M, h00 = 2 * s * s * s - 3 * s * s + 1, h10 = s * s * s - 2 * s * s + s, h01 = -2 * s * s * s + 3 * s * s, h11 = s * s * s - s * s; const row = [];
      for(let j = 0; j < N; j++){ const P = A1[j], Q = A2[j], D = len(sub(Q, P)) * bulge * 1.5; const T1 = t1 ? mul(t1[j], D) : mul(sub(Q, P), bulge ? 1 : 1), T2 = t2 ? mul(t2[j], -D) : mul(sub(Q, P), 1);
        row.push(add3(add3(mul(P, h00), mul(T1, h10)), add3(mul(Q, h01), mul(T2, h11)))); } G.push(row); }
    const srf = gridSurf(G, c1.e && isMesh(c1.e) ? c1.e : null); A.commit({ add: [srf] }, 'SURFBLEND: mặt chuyển tiếp ' + (t1 || t2 ? 'tiếp tuyến' : 'kẻ thẳng')); });

  /* ===================== SURFNETWORK ===================== */
  function coons(U0, U1, V0, V1, N, M){ const a = resample(U0, N, false), b = resample(U1, N, false), c = resample(V0, M, false), d = resample(V1, M, false); const G = [];
    const P00 = a[0], P10 = a[N - 1], P01 = b[0], P11 = b[N - 1];
    for(let i = 0; i < M; i++){ const v = i / (M - 1); const row = []; for(let j = 0; j < N; j++){ const u = j / (N - 1);
      const Lc = add3(mul(a[j], 1 - v), mul(b[j], v)), Ld = add3(mul(c[i], 1 - u), mul(d[i], u)), B = add3(add3(mul(P00, (1 - u) * (1 - v)), mul(P10, u * (1 - v))), add3(mul(P01, (1 - u) * v), mul(P11, u * v)));
      row.push(sub(add3(Lc, Ld), B)); } G.push(row); } return G; }
  function catmull(P, n){ const out = []; const m = P.length; if(m === 2){ for(let i = 0; i < n; i++) out.push(add3(P[0], mul(sub(P[1], P[0]), i / (n - 1)))); return out; }
    for(let i = 0; i < n; i++){ const s = i / (n - 1) * (m - 1); const k = Math.min(m - 2, Math.floor(s)), t = s - k; const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(m - 1, k + 2)];
      const t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } return out; }
  cmd(['SURFNETWORK'], 'Mặt lưới đường: qua các đường theo hướng U (và hướng V)', async () => {
    const s1 = await A.getSel('Chọn các đường hướng thứ nhất (U)', { filter: isCurve, pre: true }); const U = (s1.sel || []).map(e => curvePts(e)).filter(Boolean).map(q => q.pts); if(U.length < 2){ log('Cần ít nhất 2 đường hướng U.'); return; }
    const s2 = await A.getSel('Chọn các đường hướng thứ hai (V) — Enter nếu không có', { filter: isCurve, pre: false }); const Vc = (s2.sel || []).map(e => curvePts(e)).filter(Boolean).map(q => q.pts); const base = (s1.sel || [])[0];
    const N = 24; let G;
    if(U.length === 2 && Vc.length === 2){ let [u0, u1] = U, [v0, v1] = Vc; const near = (p, q) => len(sub(p, q));
      if(near(u0[0], u1[0]) + near(u0[u0.length - 1], u1[u1.length - 1]) > near(u0[0], u1[u1.length - 1]) + near(u0[u0.length - 1], u1[0])) u1 = u1.slice().reverse();
      if(near(v0[0], u0[0]) > near(v0[v0.length - 1], u0[0])) v0 = v0.slice().reverse(); if(near(v1[0], u0[u0.length - 1]) > near(v1[v1.length - 1], u0[u0.length - 1])) v1 = v1.slice().reverse();
      if(near(v0[0], u0[0]) > near(v1[0], u0[0])){ const t = v0; v0 = v1; v1 = t; }
      G = coons(u0, u1, v0, v1, N, N); }
    else { // nội suy Catmull-Rom qua các đường U (sắp theo khoảng cách)
      const R = U.map(L => resample(L, N, false)); for(let i = 1; i < R.length; i++){ const p = R[i - 1]; if(len(sub(p[0], R[i][0])) > len(sub(p[0], R[i][N - 1]))) R[i] = R[i].reverse(); }
      const M = Math.max(8, (R.length - 1) * 8); const cols = []; for(let j = 0; j < N; j++) cols.push(catmull(R.map(r => r[j]), M)); G = []; for(let i = 0; i < M; i++) G.push(cols.map(c => c[i])); }
    const srf = gridSurf(G, null); if(base) for(const k of ['layer', 'col', 'bl']) if(base[k] != null) srf[k] = base[k]; A.commit({ add: [srf] }, 'SURFNETWORK: mặt qua ' + U.length + ' + ' + Vc.length + ' đường'); });

  /* ===================== SURFSCULPT ===================== */
  cmd(['SURFSCULPT'], 'Ghép các mặt bao kín thành khối đặc', async () => {
    const s = await A.getSel('Chọn các mặt / khối bao kín một vùng', { filter: isS3 }); const L = unlocked(s.sel); if(!L.length) return; const V = [], F = [];
    for(const e of L){ const m = A.meshOf(e); if(!m) continue; const b = V.length / 3; for(const x of m.p) V.push(x); for(const i of m.i) F.push(i + b); }
    const w = A.weld(V, F); const E = edgeMap(w.i, w.p.length / 3); let open = 0; for(const r of E.values()) if(r.t.length !== 2) open++;
    if(open){ log('SURFSCULPT: các mặt chưa bao kín (' + open + ' cạnh hở). Dùng SURFEXTEND / SURFPATCH để khép kín rồi thử lại.'); return; }
    const sol = makeMesh(w.p, w.i, L[0]); delete sol.srf; if(A.volumeOf && A.volumeOf(sol) < 0) A.flipI(sol.f); A.commit({ add: [sol], del: L }, 'SURFSCULPT: khối đặc từ ' + L.length + ' mặt'); });

  /* ===================== SURFEXTRACTCURVE · cắt lưới bằng mặt phẳng ===================== */
  function slice(V, F, n, d){ const segs = []; let lo0 = Infinity, hi0 = -Infinity; for(const x of V){ lo0 = Math.min(lo0, x); hi0 = Math.max(hi0, x); } const eps = Math.max(1e-12, (hi0 - lo0) * 1e-9); const s = i => { const v = dot(P3(V, i), n) - d; return Math.abs(v) < eps ? eps : v; };
    for(let t = 0; t < F.length / 3; t++){ const ix = [F[t * 3], F[t * 3 + 1], F[t * 3 + 2]], sv = ix.map(s), pts = [];
      for(let k = 0; k < 3; k++){ const a = ix[k], b = ix[(k + 1) % 3], sa = sv[k], sb = sv[(k + 1) % 3]; if((sa > 0) !== (sb > 0)){ const u = sa / (sa - sb); pts.push(add3(P3(V, a), mul(sub(P3(V, b), P3(V, a)), u))); } }
      if(pts.length === 2 && len(sub(pts[0], pts[1])) > eps * 1000) segs.push(pts); }
    // nối đoạn thành đường
    let lo = Infinity, hi = -Infinity; for(const x of V){ lo = Math.min(lo, x); hi = Math.max(hi, x); } const q = Math.max(1e-9, (hi - lo) * 1e-7); const key = p => Math.round(p[0] / q) + ',' + Math.round(p[1] / q) + ',' + Math.round(p[2] / q);
    const adj = new Map(); segs.forEach((sg, i) => { for(const p of sg){ const k = key(p); if(!adj.has(k)) adj.set(k, []); adj.get(k).push(i); } });
    const used = new Uint8Array(segs.length), out = [];
    for(let i = 0; i < segs.length; i++){ if(used[i]) continue; used[i] = 1; let L = [segs[i][0], segs[i][1]];
      for(const dir of [1, 0]){ for(let g = 0; g < segs.length; g++){ const end = dir ? L[L.length - 1] : L[0]; const nx = (adj.get(key(end)) || []).find(j => !used[j]); if(nx == null) break; used[nx] = 1; const sg = segs[nx]; const o = key(sg[0]) === key(end) ? sg[1] : sg[0]; if(dir) L.push(o); else L.unshift(o); } }
      L = L.filter((p, k) => !k || key(p) !== key(L[k - 1])); const closed = L.length > 3 && key(L[0]) === key(L[L.length - 1]); if(closed) L.pop(); if(L.length >= 2) out.push({ pts: L, closed }); }
    return out; }
  A.meshSlice = slice;
  cmd(['SURFEXTRACTCURVE'], 'Trích đường trên mặt / khối đi qua điểm chọn (hướng X, Y hoặc mặt ngang)', async () => {
    const r = await A.getEnt('Chọn mặt hoặc khối', { filter: isS3 }); const e = r.ent; if(!e) return; const m = A.meshOf(e); if(!m) return;
    const k = await KW('Hướng [U (theo X) / V (theo Y) / Cả hai / Ngang (Z)]', { kw: [{ k: 'U', t: 'U (theo X)' }, { k: 'V', t: 'V (theo Y)' }, { k: 'B', t: 'Cả hai' }, { k: 'Z', t: 'Ngang (Z)' }], def: 'B' });
    const add = [];
    for(;;){ const p = await A.getPoint('Chọn điểm trên mặt (Enter = xong)'); if(!p.pt) break; const z = z3Of(p.pt); const P = [];
      if(k.kw === 'U' || k.kw === 'B' || !k.kw) P.push([[0, 1, 0], p.pt.y]); if(k.kw === 'V' || k.kw === 'B' || !k.kw) P.push([[1, 0, 0], p.pt.x]);
      if(k.kw === 'Z'){ const zz = z != null ? z : numOr(await A.getNum('Cao độ', { def: 0 }), 0); P.push([[0, 0, 1], zz]); }
      for(const [n, d] of P) for(const L of slice(m.p, m.i, n, d)) if(L.pts.length >= 2) add.push(poly3(L.pts, L.closed, e)); }
    if(add.length) A.commit({ add }, 'SURFEXTRACTCURVE: ' + add.length + ' đường 3D'); });

  /* ===================== PROJECTGEOMETRY ===================== */
  function dropZ(targets, x, y){ let best = -Infinity; for(const m of targets){ if(x < m.bx0 || x > m.bx1 || y < m.by0 || y > m.by1) continue; const V = m.p, F = m.i;
      for(let t = 0; t < F.length / 3; t++){ const a = F[t * 3] * 3, b = F[t * 3 + 1] * 3, c = F[t * 3 + 2] * 3; const det = (V[b + 1] - V[c + 1]) * (V[a] - V[c]) + (V[c] - V[b]) * (V[a + 1] - V[c + 1]); if(Math.abs(det) < 1e-14) continue;
        const l1 = ((V[b + 1] - V[c + 1]) * (x - V[c]) + (V[c] - V[b]) * (y - V[c + 1])) / det, l2 = ((V[c + 1] - V[a + 1]) * (x - V[c]) + (V[a] - V[c]) * (y - V[c + 1])) / det, l3 = 1 - l1 - l2;
        if(l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9){ const z = l1 * V[a + 2] + l2 * V[b + 2] + l3 * V[c + 2]; if(z > best) best = z; } } }
    return isFinite(best) ? best : null; }
  cmd(['PROJECTGEOMETRY'], 'Chiếu đường (đường thẳng, đa tuyến, tròn…) lên mặt / khối theo phương Z', async () => {
    const s = await A.getSel('Chọn đường cần chiếu', { filter: isCurve }); const C = s.sel || []; if(!C.length) return;
    const t = await A.getSel('Chọn mặt / khối nhận hình chiếu', { filter: isS3, pre: false }); const T = (t.sel || []).map(e => { const m = A.meshOf(e); if(!m) return null; let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity; for(let k = 0; k < m.p.length; k += 3){ bx0 = Math.min(bx0, m.p[k]); bx1 = Math.max(bx1, m.p[k]); by0 = Math.min(by0, m.p[k + 1]); by1 = Math.max(by1, m.p[k + 1]); } return { p: m.p, i: m.i, bx0, by0, bx1, by1 }; }).filter(Boolean); if(!T.length) return;
    let ext = 0; for(const m of T) ext = Math.max(ext, m.bx1 - m.bx0, m.by1 - m.by0); const step = ext / 150 || 1; const add = [];
    for(const e of C){ const q = curvePts(e); if(!q) continue; const P = q.closed ? q.pts.concat([q.pts[0]]) : q.pts; let cur = [];
      const flush = () => { if(cur.length >= 2) add.push(poly3(cur, false, e)); cur = []; };
      for(let i = 0; i + 1 < P.length; i++){ const a = P[i], b = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for(let k = (i ? 1 : 0); k <= n; k++){ const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; const z = dropZ(T, x, y); if(z == null) flush(); else cur.push([x, y, z]); } }
      flush(); }
    if(add.length) A.commit({ add }, 'PROJECTGEOMETRY: ' + add.length + ' đường 3D nằm trên mặt'); else log('Đường không nằm trên mặt / khối đã chọn (nhìn theo Z).'); });

  /* ===================== OFFSETEDGE ===================== */
  function offsetLoop2(P, d, round){ const n = P.length, out = []; let ar = 0; for(let i = 0; i < n; i++){ const a = P[i], b = P[(i + 1) % n]; ar += a[0] * b[1] - b[0] * a[1]; } const s = ar > 0 ? 1 : -1;
    const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dy / L * s, -dx / L * s]; };   // pháp tuyến ra ngoài
    for(let i = 0; i < n; i++){ const p = P[(i + n - 1) % n], q = P[i], r = P[(i + 1) % n]; const n1 = nrm(p, q), n2 = nrm(q, r); const cr = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]); const convex = cr * s > 0;
      if(round && convex === d > 0){ const a1 = Math.atan2(n1[1], n1[0]); let a2 = Math.atan2(n2[1], n2[0]); let da = a2 - a1; while(da > Math.PI) da -= TAU; while(da < -Math.PI) da += TAU; const k = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 12))); for(let j = 0; j <= k; j++){ const a = a1 + da * j / k; out.push([q[0] + Math.cos(a) * Math.abs(d) * Math.sign(d), q[1] + Math.sin(a) * Math.abs(d) * Math.sign(d)]); } continue; }
      const m = [n1[0] + n2[0], n1[1] + n2[1]]; const ml = Math.hypot(m[0], m[1]) || 1; const cosh = (n1[0] * n2[0] + n1[1] * n2[1] + 1) / 2; const k = d / Math.sqrt(Math.max(0.05, cosh)); out.push([q[0] + m[0] / ml * k, q[1] + m[1] / ml * k]); }
    return out; }
  cmd(['OFFSETEDGE'], 'Đường song song với cạnh của một mặt phẳng của khối / mặt (chọn mặt, khoảng cách, phía)', async () => {
    const r = await A.getEnt('Chọn khối / mặt', { filter: isS3 }); const e = r.ent; if(!e) return; const m = A.meshOf(e); if(!m) return; const w = A.weld(m.p, m.i); const V = w.p, F = w.i;
    const p = await A.getPoint('Chọn mặt phẳng (bấm lên mặt)'); if(!p.pt) return; const t0 = triAt(V, F, p.pt); if(t0 < 0) return;
    // vùng mặt phẳng liền với tam giác chọn
    const n0 = unit(triN(V, F, t0)), E = edgeMap(F, V.length / 3), S = new Set([t0]), st = [t0]; while(st.length){ const t = st.pop(); for(let k = 0; k < 3; k++){ const r2 = E.get(ekey(F[t * 3 + k], F[t * 3 + (k + 1) % 3], V.length / 3)); for(const u of r2.t) if(!S.has(u) && dot(unit(triN(V, F, u)), n0) > 0.9999){ S.add(u); st.push(u); } } }
    const loops = boundaryLoops(F, [...S]); if(!loops.length) return;
    const k = await KW('Góc [Nhọn / Tròn]', { kw: [{ k: 'S', t: 'Nhọn' }, { k: 'R', t: 'Tròn' }], def: 'S' }); const d = await A.getDist('Khoảng cách (dương = ra ngoài, âm = vào trong)', { def: 1 }); const dd = numOr(d, 1); if(!isFinite(dd) || !dd) return;
    const U = unit(Math.abs(n0[2]) < 0.9 ? cross([0, 0, 1], n0) : cross([1, 0, 0], n0)), W = cross(n0, U), O = P3(V, F[t0 * 3]); const add = [];
    for(const lp of loops){ const P2 = lp.map(i => { const q = sub(P3(V, i), O); return [dot(q, U), dot(q, W)]; }); const off = offsetLoop2(P2, dd, k.kw === 'R'); add.push(poly3(off.map(q => add3(O, add3(mul(U, q[0]), mul(W, q[1])))), true, e)); }
    A.commit({ add }, 'OFFSETEDGE: ' + add.length + ' đường cách cạnh mặt ' + fmt(dd)); });

  /* ===================== ANALYSIS* ===================== */
  async function anaCmd(kind, name, extra){ if(!A.open3D){ log('Cần khung 3D.'); return; } await A.open3D({ keep: true }); const V3 = A.view3D; if(!V3 || !V3.setAnalysis){ log('Khung 3D chưa sẵn sàng.'); return; }
    const on = V3.analysis === kind; const k = await KW(name + ' [Bật / Tắt' + (extra ? ' / ' + extra.map(x => x.t).join(' / ') : '') + ']', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }].concat(extra || []), def: on ? 'OFF' : 'ON' });
    if(k.kw === 'OFF'){ V3.setAnalysis(null); log(name + ': tắt.'); return; }
    if(extra && extra.some(x => x.k === k.kw)){ const x = extra.find(y => y.k === k.kw); await x.run(); }
    V3.setAnalysis(kind); log(name + ': bật — xem trong khung 3D (ANALYSISOPTIONS để chỉnh).'); }
  const saveAna = o => { try{ localStorage.setItem('dvd:ana', JSON.stringify(o)); }catch(_){} };
  cmd(['ANALYSISZEBRA'], 'Phân tích sọc ngựa vằn: kiểm tra độ liền mạch giữa các mặt (trong khung 3D)', () => anaCmd('zebra', 'ANALYSISZEBRA', [{ k: 'D', t: 'Hướng sọc', run: async () => { const o = A.anaOpts(); const r = await KW('Hướng sọc [Dọc / Ngang]', { kw: [{ k: 'V', t: 'Dọc' }, { k: 'H', t: 'Ngang' }], def: o.zebra.dir ? 'H' : 'V' }); o.zebra.dir = r.kw === 'H' ? 1 : 0; saveAna(o); } }, { k: 'N', t: 'Số sọc', run: async () => { const o = A.anaOpts(); const r = await A.getNum('Số sọc', { def: o.zebra.n }); if(r.num > 0){ o.zebra.n = Math.round(r.num); saveAna(o); } } }]));
  cmd(['ANALYSISCURVATURE'], 'Phân tích độ cong (Gauss / trung bình): tô màu theo độ cong (trong khung 3D)', () => anaCmd('curv', 'ANALYSISCURVATURE', [{ k: 'T', t: 'Kiểu', run: async () => { const o = A.anaOpts(); const r = await KW('Kiểu độ cong [Gauss / Trung bình]', { kw: [{ k: 'G', t: 'Gauss' }, { k: 'M', t: 'Trung bình' }], def: o.curv.type }); o.curv.type = r.kw || 'G'; saveAna(o); } }]));
  cmd(['ANALYSISDRAFT'], 'Phân tích góc thoát khuôn theo phương Z: đỏ (âm) → xanh lá (0°) → xanh dương (dương)', () => anaCmd('draft', 'ANALYSISDRAFT', [{ k: 'A', t: 'Góc', run: async () => { const o = A.anaOpts(); const a = await A.getNum('Góc nhỏ nhất (độ)', { def: o.draft.a0 }); const b = await A.getNum('Góc lớn nhất (độ)', { def: o.draft.a1 }); if(a.num != null && b.num != null && b.num > a.num){ o.draft.a0 = a.num; o.draft.a1 = b.num; saveAna(o); } } }]));
  plain(['ANALYSISOPTIONS'], 'Tuỳ chọn phân tích bề mặt (Zebra, Curvature, Draft Angle)', () => {
    const o = A.anaOpts(); const d = A.dialog({ title: 'Analysis Options', html: '<div class="acw" style="min-width:380px">' +
      '<fieldset class="acw-grp"><legend>Zebra</legend><div class="acw-row"><label>Hướng sọc</label><select id="anD"><option value="0"' + (o.zebra.dir ? '' : ' selected') + '>Dọc</option><option value="1"' + (o.zebra.dir ? ' selected' : '') + '>Ngang</option></select></div><div class="acw-row"><label>Số sọc</label><input id="anN" type="number" min="2" max="60" value="' + o.zebra.n + '" style="width:70px"></div><div class="acw-row"><label>Màu 1 / màu 2</label><input id="anC1" type="color" value="' + esc(o.zebra.c1) + '"> <input id="anC2" type="color" value="' + esc(o.zebra.c2) + '"></div></fieldset>' +
      '<fieldset class="acw-grp"><legend>Curvature</legend><div class="acw-row"><label>Kiểu</label><select id="anT"><option value="G"' + (o.curv.type === 'G' ? ' selected' : '') + '>Gauss</option><option value="M"' + (o.curv.type === 'M' ? ' selected' : '') + '>Trung bình (Mean)</option></select></div><div class="acw-note">Thang màu tự động theo độ cong của các mặt.</div></fieldset>' +
      '<fieldset class="acw-grp"><legend>Draft Angle</legend><div class="acw-row"><label>Góc nhỏ nhất / lớn nhất (°)</label><input id="anA0" type="number" step="0.5" value="' + o.draft.a0 + '" style="width:70px"> <input id="anA1" type="number" step="0.5" value="' + o.draft.a1 + '" style="width:70px"></div></fieldset></div>',
      ok: root => { const q = s => root.querySelector(s); o.zebra.dir = +q('#anD').value; o.zebra.n = Math.max(2, Math.min(60, +q('#anN').value || 12)); o.zebra.c1 = q('#anC1').value; o.zebra.c2 = q('#anC2').value; o.curv.type = q('#anT').value; const a0 = +q('#anA0').value, a1 = +q('#anA1').value; if(a1 > a0){ o.draft.a0 = a0; o.draft.a1 = a1; } saveAna(o);
        if(A.view3D && A.view3D.analysis) A.view3D.setAnalysis(A.view3D.analysis); log('ANALYSISOPTIONS: đã lưu.'); } });
    d.root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation())); });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
