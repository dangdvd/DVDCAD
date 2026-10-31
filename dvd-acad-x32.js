/* DVDCAD v6l — IGES và DXB như AutoCAD
   · IGESIMPORT / IGESIN: đọc tệp IGES (.igs / .iges, bản 5.3, dạng ASCII cố định 80 cột)
       đường 110, cung / tròn 100, conic 104 (elip / hyperbol / parabol), đường gấp 106, spline tham số 112, NURBS 126,
       đường ghép 102, đường trên mặt 142, điểm 116, ma trận biến đổi 124 (lồng nhau), mặt phẳng 108,
       mặt kẻ 118, mặt tròn xoay 120, mặt trụ kéo 122, mặt NURBS 128, mặt cắt xén 144 (xén theo biên trong miền tham số / biên phẳng),
       chữ 212, mũi tên 214, kích thước 2xx (lấy nét / chữ thành phần), khối con 308 / 408, màu 314, tên lớp 406-3
   · IGESEXPORT / IGESOUT: ghi IGES 5.3 — LINE, ARC, CIRCLE, ELLIPSE (104 + 124), POINT, đa tuyến (106 / 102 có cung), spline (126),
       chữ (212), SOLID / 3DFACE / khối 3D / lưới / mặt (128 song tuyến từng tam giác), màu (số chuẩn hoặc 314), lớp (406 dạng 3), kiểu nét
   · DXBIN: nhập tệp DXB (Drawing Interchange Binary, "AutoCAD DXB 1.0") vào bản vẽ hiện hành */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x32 || !window.DVDCmd) return; A._x32 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); });
  const docBase = () => String((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
  const drawMM = () => { try{ return (typeof unitToMM === 'function' && unitToMM()) || 1; }catch(_){ return 1; } };
  const ascii = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7e]/g, '?');

  /* ===================== hình học chung ===================== */
  const I3 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const app = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[3], M[4] * p[0] + M[5] * p[1] + M[6] * p[2] + M[7], M[8] * p[0] + M[9] * p[1] + M[10] * p[2] + M[11]];
  const appV = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[4] * p[0] + M[5] * p[1] + M[6] * p[2], M[8] * p[0] + M[9] * p[1] + M[10] * p[2]];
  function mul(P, Q){ const R = new Array(12); for(let r = 0; r < 3; r++){ for(let c = 0; c < 4; c++){ let s = c === 3 ? P[r * 4 + 3] : 0; for(let k = 0; k < 3; k++) s += P[r * 4 + k] * Q[k * 4 + c]; R[r * 4 + c] = s; } } return R; }
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cr3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len3 = a => Math.hypot(a[0], a[1], a[2]), d3 = (a, b) => len3(sub3(a, b));
  // ma trận có giữ mặt phẳng XY (trục z → ±z, không méo trong XY)? → { s: hệ số, det: dấu (lật), rot: góc xoay }
  function planarSim(M){ const ex = [M[0], M[4], M[8]], ey = [M[1], M[5], M[9]]; const sx = len3(ex), sy = len3(ey); if(sx < 1e-15 || sy < 1e-15) return null;
    if(Math.abs(M[8]) > 1e-9 * sx || Math.abs(M[9]) > 1e-9 * sy) return null; if(Math.abs(sx - sy) > 1e-9 * sx || Math.abs(dot3(ex, ey)) > 1e-9 * sx * sy) return null;
    const det = M[0] * M[5] - M[1] * M[4]; return { s: sx, det: det < 0 ? -1 : 1, rot: Math.atan2(M[4], M[0]) }; }
  // B-spline: tìm khoảng + hàm cơ sở (Piegl & Tiller)
  function span(n, p, u, U){ if(u >= U[n + 1]) return n; if(u <= U[p]) return p; let lo = p, hi = n + 1, mid = (lo + hi) >> 1; let g = 0; while((u < U[mid] || u >= U[mid + 1]) && g++ < 200){ if(u < U[mid]) hi = mid; else lo = mid; mid = (lo + hi) >> 1; } return mid; }
  function basis(i, u, p, U){ const N = [1], L = [], R = []; for(let j = 1; j <= p; j++){ L[j] = u - U[i + 1 - j]; R[j] = U[i + j] - u; let s = 0; for(let r = 0; r < j; r++){ const den = R[r + 1] + L[j - r]; const t = den ? N[r] / den : 0; N[r] = s + R[r + 1] * t; s = L[j - r] * t; } N[j] = s; } return N; }
  function nurbsPt(p, U, W, P, u){ const n = P.length - 1; const k = span(n, p, u, U), N = basis(k, u, p, U); let x = 0, y = 0, z = 0, w = 0;
    for(let i = 0; i <= p; i++){ const j = k - p + i; if(j < 0 || j > n) continue; const b = N[i] * (W ? W[j] : 1); x += b * P[j][0]; y += b * P[j][1]; z += b * P[j][2]; w += b; } return w ? [x / w, y / w, z / w] : P[Math.min(n, Math.max(0, k))].slice(); }
  // đa giác có lỗ → một vòng (nối lỗ vào biên ngoài) để tam giác hoá
  function bridge(outer, holes, proj){ let L = outer.slice(); const area = Q => { let s = 0; for(let i = 0; i < Q.length; i++){ const a = proj(Q[i]), b = proj(Q[(i + 1) % Q.length]); s += a[0] * b[1] - b[0] * a[1]; } return s; };
    const so = Math.sign(area(L)) || 1; const HS = holes.filter(h => h.length >= 3).map(h => Math.sign(area(h)) === so ? h.slice().reverse() : h.slice());
    HS.sort((a, b) => Math.max(...b.map(q => proj(q)[0])) - Math.max(...a.map(q => proj(q)[0])));
    const segX = (a, b, c, d) => { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d); return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)); };
    for(const H of HS){ let hk = 0, mx = -Infinity; H.forEach((q, i) => { const x = proj(q)[0]; if(x > mx){ mx = x; hk = i; } }); const hp = proj(H[hk]);
      const cand = L.map((q, i) => ({ i, d: Math.hypot(proj(q)[0] - hp[0], proj(q)[1] - hp[1]) })).sort((a, b) => a.d - b.d); let best = cand[0].i;
      for(const c of cand){ const op = proj(L[c.i]); let ok = true; for(let i = 0; i < L.length && ok; i++){ const a = proj(L[i]), b = proj(L[(i + 1) % L.length]); if(i === c.i || (i + 1) % L.length === c.i) continue; if(segX(op, hp, a, b)) ok = false; } if(ok){ best = c.i; break; } }
      const ring = H.slice(hk).concat(H.slice(0, hk)); ring.push(H[hk]); L = L.slice(0, best + 1).concat(ring, L.slice(best)); }
    return L; }
  function planeOf(L){ let N = [0, 0, 0]; for(let i = 0; i < L.length; i++){ const a = L[i], b = L[(i + 1) % L.length]; N[0] += (a[1] - b[1]) * (a[2] + b[2]); N[1] += (a[2] - b[2]) * (a[0] + b[0]); N[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    const l = len3(N) || 1; N = sc3(N, 1 / l); const U = Math.abs(N[2]) < 0.9 ? cr3([0, 0, 1], N) : cr3([1, 0, 0], N); const lu = len3(U) || 1; const Uu = sc3(U, 1 / lu), W = cr3(N, Uu); return { N, proj: p => [dot3(p, Uu), dot3(p, W)] }; }
  function triPoly(outer, holes){ if(outer.length < 3) return null; const P = planeOf(outer); const L = holes && holes.length ? bridge(outer, holes, P.proj) : outer; if(!A.earcut3) return null; const r = A.earcut3(L); return r && r.tri.length ? { pts: L, tri: r.tri } : null; }
  const inPoly = (x, y, Q) => { let c = false; for(let i = 0, j = Q.length - 1; i < Q.length; j = i++){ const a = Q[i], b = Q[j]; if((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

  /* ===================== đọc IGES ===================== */
  const UNIT_MM = { 1: 25.4, 2: 1, 4: 304.8, 5: 1609344, 6: 1000, 7: 1e6, 8: 0.0254, 9: 0.001, 10: 10, 11: 0.0000254 };
  const UNIT_NAME = { IN: 1, INCH: 1, MM: 2, FT: 4, MI: 5, M: 6, KM: 7, MIL: 8, UM: 9, CM: 10, UIN: 11 };
  function params(s, pd, rd){ const out = []; let i = 0; const n = s.length;
    while(i < n){ while(i < n && s[i] === ' ') i++; if(i >= n) break; if(s[i] === rd){ break; }
      const m = /^(\d+)H/.exec(s.slice(i, i + 12)); if(m){ const k = +m[1]; const st = i + m[0].length; out.push({ h: s.substr(st, k) }); i = st + k; while(i < n && s[i] === ' ') i++; if(s[i] === pd) i++; else if(s[i] === rd) break; continue; }
      let j = i; while(j < n && s[j] !== pd && s[j] !== rd) j++; out.push(s.slice(i, j).trim()); if(j >= n || s[j] === rd) break; i = j + 1; if(i >= n) out.push(''); }
    return out; }
  const num = (v, d) => { if(v == null || v === '' || typeof v === 'object') return d == null ? 0 : d; const x = parseFloat(String(v).replace(/[dD]/, 'E')); return isFinite(x) ? x : (d == null ? 0 : d); };
  const str = v => v && typeof v === 'object' ? v.h : String(v || '');
  function parseIGES(text){
    const lines = String(text).replace(/\r/g, '').split('\n').filter(l => l.length >= 73 || /[SGDPT]\s*\d+\s*$/.test(l));
    const S = [], G = [], D = [], P = new Map(); let comp = false;
    for(const l0 of lines){ const l = l0.padEnd(80, ' '); const k = l[72]; if(k === 'S') S.push(l.slice(0, 72)); else if(k === 'G') G.push(l.slice(0, 72)); else if(k === 'D') D.push(l.slice(0, 72)); else if(k === 'P') P.set(parseInt(l.slice(73, 80), 10), l.slice(0, 64)); else if(k === 'C') comp = true; }
    if(comp) throw new Error('IGES dạng nén (compressed) chưa hỗ trợ — lưu lại ở dạng ASCII cố định.');
    if(!D.length) throw new Error('Không phải tệp IGES (không có mục Directory Entry).');
    const g = G.join(''); let pd = ',', rd = ';'; const m1 = /^\s*1H(.)/.exec(g); if(m1) pd = m1[1]; { const pre = params(g, pd, '\u0000'); if(pre[1] && typeof pre[1] === 'object' && pre[1].h.length === 1) rd = pre[1].h; }
    const GP = params(g, pd, rd); let uf = Math.round(num(GP[13], 2)); if(uf === 3){ uf = UNIT_NAME[str(GP[14]).trim().toUpperCase()] || 2; }
    const E = new Map();
    for(let k = 0; k + 1 < D.length; k += 2){ const a = D[k], b = D[k + 1]; const f = (l, i) => l.slice(i * 8, i * 8 + 8); const I = (l, i) => { const s = f(l, i).trim(); return s ? parseInt(s, 10) || 0 : 0; };
      const st = f(a, 8).replace(/ /g, '0'); const seq = k + 1;
      E.set(seq, { seq, type: I(a, 0), pd: I(a, 1), font: I(a, 3), level: I(a, 4), mat: I(a, 6), blank: +st.slice(0, 2), sub: +st.slice(2, 4), use: +st.slice(4, 6), lw: I(b, 1), color: I(b, 2), pc: I(b, 3), form: I(b, 4), label: f(b, 7).trim(), subs: I(b, 8), p: null }); }
    for(const e of E.values()){ let s = ''; for(let j = 0; j < Math.max(1, e.pc); j++){ const l = P.get(e.pd + j); if(l == null) break; s += l; } const ps = params(s, pd, rd); ps.shift(); e.p = ps; }
    return { E, unit: uf, unitMM: UNIT_MM[uf] || 1, start: S.join('\n').trim(), sender: str(GP[2]), system: str(GP[4]) };
  }
  A.parseIGES = parseIGES;

  function igesToEnts(text, opt){
    opt = opt || {}; const R = parseIGES(text), E = R.E; const us = opt.scale != null ? opt.scale : R.unitMM / drawMM();
    const ROOT = [us, 0, 0, 0, 0, us, 0, 0, 0, 0, us, 0];
    const out = [], skipped = {}; const meshB = new Map(); let nSurf = 0;
    const matCache = new Map();
    function matOf(seq){ if(!seq || seq < 0) return I3(); if(matCache.has(seq)) return matCache.get(seq); matCache.set(seq, I3()); const m = E.get(seq); let M = I3();
      if(m && m.type === 124){ const p = m.p.map(v => num(v)); M = [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11]]; if(m.mat && m.mat !== seq) M = mul(matOf(m.mat), M); }
      matCache.set(seq, M); return M; }
    const MT = (e, T) => mul(T, matOf(e.mat));
    // tên lớp (406 dạng 3) + màu (314)
    const lvName = new Map(); for(const e of E.values()) if(e.type === 406 && e.form === 3){ const nm = str(e.p[2] != null ? e.p[2] : e.p[1]).trim(); const lv = e.level || Math.round(num(e.p[1])); if(nm && lv) lvName.set(lv, nm); }
    const STDC = { 1: '#ffffff', 2: '#ff0000', 3: '#00ff00', 4: '#0000ff', 5: '#ffff00', 6: '#ff00ff', 7: '#00ffff', 8: '#ffffff' };
    const hx = v => Math.max(0, Math.min(255, Math.round(v * 2.55))).toString(16).padStart(2, '0');
    const colOf = e => { if(!e || !e.color) return null; if(e.color > 0) return STDC[e.color] || null; const c = E.get(-e.color); if(c && c.type === 314) return '#' + hx(num(c.p[0])) + hx(num(c.p[1])) + hx(num(c.p[2])); return null; };
    const layers = new Set(); const layOf = e => { const lv = e && e.level > 0 ? e.level : 0; const nm = lvName.get(lv) || (lv ? 'IGES_' + lv : '0'); layers.add(nm); return nm; };
    const LT = { 2: 'DASHED', 3: 'PHANTOM', 4: 'CENTER', 5: 'DOT' };
    function base(o, e, inh){ const w = A.newProps(o); const src = e && (e.color || e.level) ? e : inh || e; w.layer = layOf(e && e.level ? e : (inh || e)); const c = colOf(e) || colOf(inh);
      if(c){ w.col = c; delete w.bl; } else { w.col = A.layerHex ? A.layerHex(w.layer) : '#ffffff'; w.bl = 1; } const f = (e && e.font) || (inh && inh.font); if(LT[f]){ try{ A.loadLT && A.loadLT(LT[f]); }catch(_){} w.lt = LT[f]; } else delete w.lt; void src; return w; }
    const isFlat = pts => { if(!pts.length) return true; const z = pts[0][2]; return pts.every(q => Math.abs(q[2] - z) <= 1e-9 * (1 + Math.abs(z)) + 1e-9); };
    function polyEnt(pts, closed, e, inh){ pts = pts.filter((q, i) => i === 0 || d3(q, pts[i - 1]) > 1e-12); if(closed && pts.length > 2 && d3(pts[0], pts[pts.length - 1]) < 1e-9) pts.pop(); if(pts.length < 2) return null;
      if(isFlat(pts)) return base({ type: 'POLYLINE', vertices: pts.map(q => ({ x: q[0], y: q[1] })), closed: !!closed }, e, inh);
      return base({ type: 'POLYLINE', p3: true, vertices: pts.map(q => ({ x: q[0], y: q[1], z: q[2] })), closed: !!closed }, e, inh); }

    // ---- lấy mẫu đường cong (toạ độ cuối) ----
    const nArc = sw => Math.max(4, Math.ceil(Math.abs(sw) / (Math.PI / 36)));
    function curve(seq, T, depth){ const e = E.get(seq); if(!e || (depth || 0) > 20) return null; const M = MT(e, T); const p = e.p; const P = i => num(p[i]);
      switch(e.type){
        case 110: return { pts: [app(M, [P(0), P(1), P(2)]), app(M, [P(3), P(4), P(5)])] };
        case 116: return { pts: [app(M, [P(0), P(1), P(2)])], point: true };
        case 100: { const zt = P(0), cx = P(1), cy = P(2), x1 = P(3), y1 = P(4), x2 = P(5), y2 = P(6); const r = Math.hypot(x1 - cx, y1 - cy); const a0 = Math.atan2(y1 - cy, x1 - cx); let a1 = Math.atan2(y2 - cy, x2 - cx);
          let sw = a1 - a0; while(sw <= 1e-12) sw += TAU; if(Math.hypot(x2 - x1, y2 - y1) < 1e-9 * Math.max(1, r)) sw = TAU; const n = nArc(sw), pts = [];
          for(let k = 0; k <= n; k++){ const t = a0 + sw * k / n; pts.push(app(M, [cx + r * Math.cos(t), cy + r * Math.sin(t), zt])); } return { pts, closed: sw >= TAU - 1e-12 }; }
        case 104: { const a = P(0), c = P(2), dd = P(3), ee = P(4), f = P(5), zt = P(6), x1 = P(7), y1 = P(8), x2 = P(9), y2 = P(10); const pts = [];
          if(e.form === 1 || (a * c > 0)){ const ra = Math.sqrt(Math.abs(f / a)), rb = Math.sqrt(Math.abs(f / c)); const t0 = Math.atan2(y1 / rb, x1 / ra); let t1 = Math.atan2(y2 / rb, x2 / ra); let sw = t1 - t0; while(sw <= 1e-12) sw += TAU; if(Math.hypot(x2 - x1, y2 - y1) < 1e-9 * Math.max(ra, rb)) sw = TAU;
            const n = nArc(sw); for(let k = 0; k <= n; k++){ const t = t0 + sw * k / n; pts.push(app(M, [ra * Math.cos(t), rb * Math.sin(t), zt])); } return { pts, closed: sw >= TAU - 1e-12, ell: { ra, rb, t0, sw, zt, M } }; }
          if(e.form === 2 || (a * c < 0)){ if(-f / a > 0){ const ra = Math.sqrt(-f / a), rb = Math.sqrt(f / c); const sg = Math.sign(x1) || 1; const s0 = Math.asinh(y1 / rb), s1 = Math.asinh(y2 / rb); for(let k = 0; k <= 32; k++){ const s = s0 + (s1 - s0) * k / 32; pts.push(app(M, [sg * ra * Math.cosh(s), rb * Math.sinh(s), zt])); } }
            else { const ra = Math.sqrt(-f / c), rb = Math.sqrt(f / a); const sg = Math.sign(y1) || 1; const s0 = Math.asinh(x1 / rb), s1 = Math.asinh(x2 / rb); for(let k = 0; k <= 32; k++){ const s = s0 + (s1 - s0) * k / 32; pts.push(app(M, [rb * Math.sinh(s), sg * ra * Math.cosh(s), zt])); } } return { pts }; }
          // parabol: A x² + E y = 0 hoặc C y² + D x = 0
          if(Math.abs(a) > 1e-300 && Math.abs(ee) > 1e-300){ for(let k = 0; k <= 32; k++){ const x = x1 + (x2 - x1) * k / 32; pts.push(app(M, [x, -a * x * x / ee, zt])); } }
          else if(Math.abs(c) > 1e-300 && Math.abs(dd) > 1e-300){ for(let k = 0; k <= 32; k++){ const y = y1 + (y2 - y1) * k / 32; pts.push(app(M, [-c * y * y / dd, y, zt])); } }
          else pts.push(app(M, [x1, y1, zt]), app(M, [x2, y2, zt])); return { pts }; }
        case 106: { const ip = Math.round(P(0)), n = Math.round(P(1)); const pts = [];
          if(ip === 1){ const zt = P(2); for(let k = 0; k < n; k++) pts.push(app(M, [P(3 + 2 * k), P(4 + 2 * k), zt])); }
          else { const st = ip === 3 ? 6 : 3; for(let k = 0; k < n; k++) pts.push(app(M, [P(2 + st * k), P(3 + st * k), P(4 + st * k)])); }
          if(e.form >= 31 && e.form <= 38) return { pts, pairs: true };
          return { pts, closed: e.form === 63 || (pts.length > 3 && d3(pts[0], pts[pts.length - 1]) < 1e-9 * (1 + len3(pts[0]))) }; }
        case 112: { const nseg = Math.round(P(3)); const Tt = []; for(let k = 0; k <= nseg; k++) Tt.push(P(4 + k)); const c0 = 5 + nseg; const pts = [];
          for(let i = 0; i < nseg; i++){ const C = j => P(c0 + 12 * i + j); const L = Tt[i + 1] - Tt[i]; const ns = 8; for(let k = (i ? 1 : 0); k <= ns; k++){ const s = L * k / ns, s2 = s * s, s3 = s2 * s; pts.push(app(M, [C(0) + C(1) * s + C(2) * s2 + C(3) * s3, C(4) + C(5) * s + C(6) * s2 + C(7) * s3, C(8) + C(9) * s + C(10) * s2 + C(11) * s3])); } }
          return { pts }; }
        case 126: { const K = Math.round(P(0)), Md = Math.round(P(1)); const nk = K + Md + 2; let i = 6; const U = []; for(let k = 0; k < nk; k++) U.push(P(i++)); const W = []; for(let k = 0; k <= K; k++) W.push(P(i++) || 1);
          const C = []; for(let k = 0; k <= K; k++){ C.push([P(i), P(i + 1), P(i + 2)]); i += 3; } let v0 = P(i), v1 = P(i + 1); if(!(v1 > v0)){ v0 = U[Md]; v1 = U[K + 1]; }
          const CC = C.map(q => app(M, q)); const pts = []; const deg = Math.max(1, Math.min(Md, K));
          if(deg === 1){ for(let k = 0; k <= K; k++){ const u = U[k + 1]; if(u >= v0 - 1e-12 && u <= v1 + 1e-12) pts.push(CC[k]); } if(pts.length < 2){ for(let k = 0; k <= 16; k++) pts.push(nurbsPt(1, U, W, CC, v0 + (v1 - v0) * k / 16)); } }
          else { const n = Math.min(600, Math.max(16, (K - deg + 1) * 12)); for(let k = 0; k <= n; k++) pts.push(nurbsPt(deg, U, W, CC, v0 + (v1 - v0) * k / n)); }
          const closed = Math.round(P(3)) === 1 && pts.length > 2 && d3(pts[0], pts[pts.length - 1]) < 1e-9 * (1 + len3(pts[0]));
          return { pts, closed, nurbs: { deg: Md, U, W, C: CC, v0, v1 } }; }
        case 102: { const n = Math.round(P(0)); let pts = []; for(let k = 0; k < n; k++){ const c = curve(Math.round(P(1 + k)), M, (depth || 0) + 1); if(!c || !c.pts.length) continue; let q = c.pts; if(pts.length && d3(pts[pts.length - 1], q[q.length - 1]) < d3(pts[pts.length - 1], q[0]) * 1e-3) q = q.slice().reverse(); pts = pts.concat(pts.length && d3(pts[pts.length - 1], q[0]) < 1e-9 * (1 + len3(q[0])) ? q.slice(1) : q); }
          return { pts, closed: pts.length > 2 && d3(pts[0], pts[pts.length - 1]) < 1e-7 * (1 + len3(pts[0])) }; }
        case 142: { const sp = Math.round(P(1)), bp = Math.round(P(2)), cp = Math.round(P(3)); if(cp > 0){ const c = curve(cp, M, (depth || 0) + 1); if(c) return c; }
          if(bp > 0 && sp > 0){ const S = surf(sp, M); const c = curve(bp, I3(), (depth || 0) + 1); if(S && S.native && c) return { pts: c.pts.map(q => S.f(q[0], q[1])), closed: c.closed }; } return null; }
        case 130: { const c = curve(Math.round(P(0)), M, (depth || 0) + 1); return c; }   // đường offset: lấy đường gốc (gần đúng)
        default: return null;
      }
    }
    // ---- mặt: hàm f(u,v) (toạ độ cuối), miền, độ mịn ----
    function surf(seq, T){ const e = E.get(seq); if(!e) return null; const M = MT(e, T); const p = e.p; const P = i => num(p[i]);
      switch(e.type){
        case 128: { const K1 = Math.round(P(0)), K2 = Math.round(P(1)), M1 = Math.round(P(2)), M2 = Math.round(P(3)); let i = 9; const S = [], Tk = [];
          for(let k = 0; k < K1 + M1 + 2; k++) S.push(P(i++)); for(let k = 0; k < K2 + M2 + 2; k++) Tk.push(P(i++));
          const W = []; for(let k = 0; k < (K1 + 1) * (K2 + 1); k++) W.push(P(i++) || 1); const C = []; for(let k = 0; k < (K1 + 1) * (K2 + 1); k++){ C.push(app(M, [P(i), P(i + 1), P(i + 2)])); i += 3; }
          let u0 = P(i), u1 = P(i + 1), v0 = P(i + 2), v1 = P(i + 3); if(!(u1 > u0)){ u0 = S[M1]; u1 = S[K1 + 1]; } if(!(v1 > v0)){ v0 = Tk[M2]; v1 = Tk[K2 + 1]; }
          const f = (u, v) => { const su = span(K1, M1, u, S), sv = span(K2, M2, v, Tk); const Nu = basis(su, u, M1, S), Nv = basis(sv, v, M2, Tk); let x = 0, y = 0, z = 0, w = 0;
            for(let b = 0; b <= M2; b++){ const jv = sv - M2 + b; if(jv < 0 || jv > K2) continue; for(let a = 0; a <= M1; a++){ const ju = su - M1 + a; if(ju < 0 || ju > K1) continue; const id = jv * (K1 + 1) + ju; const c = Nu[a] * Nv[b] * W[id]; x += c * C[id][0]; y += c * C[id][1]; z += c * C[id][2]; w += c; } }
            return w ? [x / w, y / w, z / w] : C[0]; };
          const planar = (() => { const pl = planeOf([C[0], C[K1], C[C.length - 1], C[K2 * (K1 + 1)]]); const o = C[0]; return C.every(q => Math.abs(dot3(sub3(q, o), pl.N)) < 1e-7 * (1 + len3(sub3(q, o)))); })();
          return { f, u0, u1, v0, v1, nu: M1 === 1 ? K1 : Math.min(48, (K1 - M1 + 1) * 8), nv: M2 === 1 ? K2 : Math.min(48, (K2 - M2 + 1) * 8), native: true, planar }; }
        case 118: { const c1 = curve(Math.round(P(0)), M), c2 = curve(Math.round(P(1)), M); if(!c1 || !c2) return null; let b = c2.pts; if(Math.round(P(2)) === 1) b = b.slice().reverse();
          const rs = (pts, t) => { const n = pts.length - 1; const x = t * n; const i = Math.min(n - 1, Math.floor(x)); const f = x - i; return n < 1 ? pts[0] : add3(pts[i], sc3(sub3(pts[i + 1], pts[i]), f)); };
          const nu = Math.max(c1.pts.length, b.length) - 1; return { f: (u, v) => add3(sc3(rs(c1.pts, u), 1 - v), sc3(rs(b, u), v)), u0: 0, u1: 1, v0: 0, v1: 1, nu: Math.min(96, Math.max(1, nu)), nv: 1 }; }
        case 120: { const L = E.get(Math.round(P(0))), c = curve(Math.round(P(1)), M); if(!L || !c) return null; const LM = MT(L, M); const a = app(LM, [num(L.p[0]), num(L.p[1]), num(L.p[2])]), b = app(LM, [num(L.p[3]), num(L.p[4]), num(L.p[5])]);
          const ax = sc3(sub3(b, a), 1 / (d3(a, b) || 1)); const sa = P(2), ta = P(3); const rot = (q, t) => { const v = sub3(q, a); const ct = Math.cos(t), st = Math.sin(t); const r = add3(add3(sc3(v, ct), sc3(cr3(ax, v), st)), sc3(ax, dot3(ax, v) * (1 - ct))); return add3(a, r); };
          const pts = c.pts, n = pts.length - 1; return { f: (u, v) => { const x = u * n, i = Math.min(n - 1, Math.floor(x)); const q = n < 1 ? pts[0] : add3(pts[i], sc3(sub3(pts[i + 1], pts[i]), x - i)); return rot(q, sa + (ta - sa) * v); }, u0: 0, u1: 1, v0: 0, v1: 1, nu: Math.min(96, Math.max(1, n)), nv: Math.max(4, Math.ceil(Math.abs(ta - sa) / (Math.PI / 18))) }; }
        case 122: { const c = curve(Math.round(P(0)), M); if(!c || !c.pts.length) return null; const l = app(M, [P(1), P(2), P(3)]); const dv = sub3(l, c.pts[0]); const pts = c.pts, n = pts.length - 1;
          return { f: (u, v) => { const x = u * n, i = Math.min(n - 1, Math.floor(x)); const q = n < 1 ? pts[0] : add3(pts[i], sc3(sub3(pts[i + 1], pts[i]), x - i)); return add3(q, sc3(dv, v)); }, u0: 0, u1: 1, v0: 0, v1: 1, nu: Math.min(96, Math.max(1, n)), nv: 1 }; }
        case 108: case 190: return { planar: true, plane: true };
        default: return null;
      }
    }
    function addMesh(key, pts, tri, e, inh){ let b = meshB.get(key); if(!b){ b = { p: [], i: [], e, inh }; meshB.set(key, b); } const o = b.p.length / 3; for(const q of pts) b.p.push(q[0], q[1], q[2]); for(const t of tri) b.i.push(o + t); nSurf++; }
    let curRoot = 0; const mkey = (e, inh) => curRoot + '|' + layOf(e && e.level ? e : (inh || e)) + '|' + (colOf(e) || colOf(inh) || '');   // mỗi thực thể gốc (mặt, khối con…) → một lưới
    function gridMesh(S, keep){ const nu = Math.max(1, S.nu || 16), nv = Math.max(1, S.nv || 16); const pts = [], uv = [], tri = [];
      for(let j = 0; j <= nv; j++) for(let i = 0; i <= nu; i++){ const u = S.u0 + (S.u1 - S.u0) * i / nu, v = S.v0 + (S.v1 - S.v0) * j / nv; pts.push(S.f(u, v)); uv.push([u, v]); }
      const id = (i, j) => j * (nu + 1) + i;
      for(let j = 0; j < nv; j++) for(let i = 0; i < nu; i++){ const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
        for(const t of [[a, b, c], [a, c, d]]){ if(keep){ const cu = (uv[t[0]][0] + uv[t[1]][0] + uv[t[2]][0]) / 3, cv = (uv[t[0]][1] + uv[t[1]][1] + uv[t[2]][1]) / 3; if(!keep(cu, cv)) continue; } if(d3(pts[t[0]], pts[t[1]]) < 1e-12 || d3(pts[t[1]], pts[t[2]]) < 1e-12 || d3(pts[t[0]], pts[t[2]]) < 1e-12) continue; tri.push(t[0], t[1], t[2]); } }
      return { pts, tri }; }
    function trimmed(e, T, inh){ const M = MT(e, T); const p = e.p; const sp = Math.round(num(p[0])), n1 = Math.round(num(p[1])), n2 = Math.round(num(p[2])), po = Math.round(num(p[3]));
      const S = surf(sp, M); const se = E.get(sp); if(!S){ skipped[se ? se.type : '?'] = (skipped[se ? se.type : '?'] || 0) + 1; return; }
      const loops = []; if(n1 && po) loops.push({ seq: po, outer: true }); for(let k = 0; k < n2; k++) loops.push({ seq: Math.round(num(p[4 + k])), outer: false });
      // biên trong không gian mô hình (cho mặt phẳng) và trong miền tham số (cho mặt cong)
      const model = L => { const c = curve(L.seq, M); return c && c.pts.length >= 3 ? c.pts : null; };
      const param = L => { const b = E.get(L.seq); if(!b || b.type !== 142) return null; const bp = Math.round(num(b.p[2])); if(!bp) return null; const c = curve(bp, I3()); return c && c.pts.length >= 3 ? c.pts.map(q => [q[0], q[1]]) : null; };
      if(S.planar){ const outer = loops.find(l => l.outer); const O = outer ? model(outer) : (S.native ? [S.f(S.u0, S.v0), S.f(S.u1, S.v0), S.f(S.u1, S.v1), S.f(S.u0, S.v1)] : null); if(!O) return;
        const H = loops.filter(l => !l.outer).map(model).filter(Boolean); const t = triPoly(O, H); if(t) addMesh(mkey(e, inh), t.pts, t.tri, e, inh); return; }
      if(!S.native){ const g = gridMesh(S); if(g.tri.length) addMesh(mkey(e, inh), g.pts, g.tri, e, inh); return; }
      const PO = loops.filter(l => l.outer).map(param).filter(Boolean), PI = loops.filter(l => !l.outer).map(param).filter(Boolean);
      const keep = (u, v) => (!PO.length || PO.some(Q => inPoly(u, v, Q))) && !PI.some(Q => inPoly(u, v, Q));
      const S2 = Object.assign({}, S, { nu: Math.max(S.nu, 24), nv: Math.max(S.nv, 24) }); const g = gridMesh(S2, (PO.length || PI.length) ? keep : null); if(g.tri.length) addMesh(mkey(e, inh), g.pts, g.tri, e, inh); }

    // ---- phát thực thể ----
    function emit(seq, T, inh, depth){ const e = E.get(seq); if(!e || (depth || 0) > 12) return; const M = MT(e, T); const p = e.p; const P = i => num(p[i]); const push = w => { if(w) out.push(w); };
      try{ switch(e.type){
        case 110: { const a = app(M, [P(0), P(1), P(2)]), b = app(M, [P(3), P(4), P(5)]); if(Math.abs(a[2] - b[2]) <= 1e-9 * (1 + Math.abs(a[2]))) push(base({ type: 'LINE', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, e, inh)); else push(polyEnt([a, b], false, e, inh)); return; }
        case 116: { const a = app(M, [P(0), P(1), P(2)]); push(base({ type: 'POINT', x: a[0], y: a[1] }, e, inh)); return; }
        case 100: { const ps = planarSim(M); if(ps){ const zt = P(0), c = app(M, [P(1), P(2), zt]), s = app(M, [P(3), P(4), zt]), t = app(M, [P(5), P(6), zt]); const r = Math.hypot(s[0] - c[0], s[1] - c[1]);
            if(Math.hypot(P(5) - P(3), P(6) - P(4)) < 1e-9 * Math.max(1, Math.hypot(P(3) - P(1), P(4) - P(2)))){ push(base({ type: 'CIRCLE', cx: c[0], cy: c[1], r }, e, inh)); return; }
            let a1 = Math.atan2(s[1] - c[1], s[0] - c[0]) * R2D, a2 = Math.atan2(t[1] - c[1], t[0] - c[0]) * R2D; if(ps.det < 0){ const x = a1; a1 = a2; a2 = x; } const nz = v => ((v % 360) + 360) % 360;
            push(base({ type: 'ARC', cx: c[0], cy: c[1], r, a1: nz(a1), a2: nz(a2) }, e, inh)); return; }
          const c = curve(seq, T); if(c) push(polyEnt(c.pts, c.closed, e, inh)); return; }
        case 104: { const c = curve(seq, T); if(!c) return; const ps = planarSim(M); if(c.ell && ps){ const L = c.ell; const cc = app(M, [0, 0, L.zt]); let mx, my, ratio, t0 = L.t0, sw = L.sw;
            if(L.ra >= L.rb){ const v = appV(M, [L.ra, 0, 0]); mx = v[0]; my = v[1]; ratio = L.rb / L.ra; } else { const v = appV(M, [0, L.rb, 0]); mx = v[0]; my = v[1]; ratio = L.ra / L.rb; t0 -= Math.PI / 2; }
            if(ps.det < 0){ t0 = -(t0 + sw); }
            const w = base({ type: 'ELLIPSE', cx: cc[0], cy: cc[1], mx, my, ratio }, e, inh); if(sw < TAU - 1e-12){ w.p1 = ((t0 % TAU) + TAU) % TAU; w.p2 = w.p1 + sw; } push(w); return; }
          push(polyEnt(c.pts, c.closed, e, inh)); return; }
        case 106: { const c = curve(seq, T); if(!c) return; if(c.pairs){ for(let k = 0; k + 1 < c.pts.length; k += 2){ const a = c.pts[k], b = c.pts[k + 1]; push(base({ type: 'LINE', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, e, inh)); } return; }
          if(e.form === 40 && c.pts.length >= 3){ push(polyEnt(c.pts, false, e, inh)); return; } push(polyEnt(c.pts, c.closed, e, inh)); return; }
        case 112: case 130: { const c = curve(seq, T); if(c) push(polyEnt(c.pts, c.closed, e, inh)); return; }
        case 126: { const c = curve(seq, T); if(!c) return; const w = polyEnt(c.pts, c.closed, e, inh); if(w && !w.p3 && c.nurbs && A.bvSig){ const N = c.nurbs; w.nurbs = { deg: N.deg, U: N.U, W: N.W, C: N.C.map(q => [q[0], q[1], q[2]]), v0: N.v0, v1: N.v1, sig: A.bvSig(w.vertices) }; } push(w); return; }
        case 102: { // đường ghép phẳng chỉ có đoạn thẳng / cung → đa tuyến có cung (giữ cung chính xác)
          const n = Math.round(P(0)); const segs = []; let ok = !!A.setBV;
          const flat = (s, TT, dep) => { const m = E.get(s); if(!m || dep > 8){ ok = false; return; } const MM = MT(m, TT); const q = j => num(m.p[j]);
            if(m.type === 102){ const k = Math.round(q(0)); for(let j = 0; j < k; j++) flat(Math.round(q(1 + j)), MM, dep + 1); return; }
            if(m.type === 110){ const a = app(MM, [q(0), q(1), q(2)]), b = app(MM, [q(3), q(4), q(5)]); segs.push({ a, b, bulge: 0 }); return; }
            if(m.type === 100){ const ps = planarSim(MM); if(!ps){ ok = false; return; } const zt = q(0); const c = [q(1), q(2)], s0 = [q(3), q(4)], s1 = [q(5), q(6)]; let sw = Math.atan2(s1[1] - c[1], s1[0] - c[0]) - Math.atan2(s0[1] - c[1], s0[0] - c[0]); while(sw <= 1e-12) sw += TAU;
              if(Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) < 1e-12){ ok = false; return; } const a = app(MM, [s0[0], s0[1], zt]), b = app(MM, [s1[0], s1[1], zt]); segs.push({ a, b, bulge: Math.tan(sw / 4) * ps.det }); return; }
            ok = false; };
          for(let k = 0; k < n && ok; k++) flat(Math.round(P(1 + k)), M, 0);
          if(ok && segs.length){ const tol = 1e-7 * (1 + Math.abs(segs[0].a[0]) + Math.abs(segs[0].a[1]));
            for(let k = 1; k < segs.length && ok; k++){ const pv = segs[k - 1].b; if(d3(pv, segs[k].a) > tol){ if(d3(pv, segs[k].b) <= tol){ const s = segs[k]; segs[k] = { a: s.b, b: s.a, bulge: -s.bulge }; } else ok = false; } }
            if(ok && segs.every(s => Math.abs(s.a[2] - segs[0].a[2]) <= tol && Math.abs(s.b[2] - segs[0].a[2]) <= tol)){ const closed = d3(segs[segs.length - 1].b, segs[0].a) <= tol; const bv = segs.map(s => ({ x: s.a[0], y: s.a[1], bulge: s.bulge })); if(!closed) bv.push({ x: segs[segs.length - 1].b[0], y: segs[segs.length - 1].b[1] });
              const w = base({ type: 'POLYLINE', vertices: bv.map(q => ({ x: q.x, y: q.y })), closed }, e, inh); A.setBV(w, bv); push(w); return; } }
          const c = curve(seq, T); if(c) push(polyEnt(c.pts, c.closed, e, inh)); return; }
        case 142: { const c = curve(seq, T); if(c) push(polyEnt(c.pts, c.closed, e, inh)); return; }
        case 212: { const ns = Math.round(P(0)); let i = 1; const ps = planarSim(M) || { s: Math.hypot(M[0], M[4]) || 1, rot: Math.atan2(M[4], M[0]), det: 1 };
          for(let k = 0; k < ns; k++){ const nc = P(i), wt = P(i + 1), ht = P(i + 2), ang = P(i + 5), xs = P(i + 8), ys = P(i + 9), zs = P(i + 10); const tx = str(p[i + 11]); i += 12; void nc; void wt;
            const a = app(M, [xs, ys, zs]); if(tx.trim()) push(base({ type: 'TEXT', x: a[0], y: a[1], h: Math.max(1e-6, ht * ps.s), rot: (ang + ps.rot) * R2D, text: tx }, e, inh)); } return; }
        case 214: { const na = Math.round(P(0)), ad = P(1), aw = P(2), zt = P(3); const hd = [P(4), P(5)]; const pts = [hd]; for(let k = 0; k < na; k++) pts.push([P(6 + 2 * k), P(7 + 2 * k)]);
          const Pm = pts.map(q => app(M, [q[0], q[1], zt])); push(polyEnt(Pm, false, e, inh));
          if(pts.length > 1 && ad > 0 && e.form >= 1 && e.form <= 3){ const dx = pts[1][0] - hd[0], dy = pts[1][1] - hd[1], l = Math.hypot(dx, dy) || 1; const ux = dx / l, uy = dy / l; const bx = hd[0] + ux * ad, by = hd[1] + uy * ad, hw = (aw || ad / 3) / 2;
            const tri = [[hd[0], hd[1]], [bx - uy * hw, by + ux * hw], [bx + uy * hw, by - ux * hw]].map(q => app(M, [q[0], q[1], zt])); push(base({ type: 'SOLID', pts: [{ x: tri[0][0], y: tri[0][1] }, { x: tri[1][0], y: tri[1][1] }, { x: tri[2][0], y: tri[2][1] }, { x: tri[2][0], y: tri[2][1] }] }, e, inh)); } return; }
        case 408: { const d = Math.round(P(0)), x = P(1), y = P(2), z = P(3), s = P(4) || 1; const sf = E.get(d); if(!sf || sf.type !== 308) return; const Ti = mul(M, [s, 0, 0, x, 0, s, 0, y, 0, 0, s, z]); const SM = mul(Ti, matOf(sf.mat));
          const n = Math.round(num(sf.p[2])); for(let k = 0; k < n; k++) emit(Math.round(num(sf.p[3 + k])), SM, e, (depth || 0) + 1); return; }
        case 108: { const ptr = Math.round(P(4)); if(ptr > 0){ const c = curve(ptr, M); if(c && c.pts.length >= 3){ const t = triPoly(c.pts, []); if(t) addMesh(mkey(e, inh), t.pts, t.tri, e, inh); } } return; }
        case 118: case 120: case 122: case 128: { const S = surf(seq, T); if(!S) return; if(S.planar && S.native && e.type === 128 && S.nu === 1 && S.nv === 1){ const g = gridMesh(S); if(g.tri.length) addMesh(mkey(e, inh), g.pts, g.tri, e, inh); return; }
          const g = gridMesh(S); if(g.tri.length) addMesh(mkey(e, inh), g.pts, g.tri, e, inh); return; }
        case 144: trimmed(e, T, inh); return;
        case 124: case 314: case 406: case 402: case 308: case 0: return;
        default:
          if(e.type >= 202 && e.type <= 230){   // kích thước: lấy các nét / chữ thành phần
            const seen = new Set(); for(const v of p){ const s = Math.round(num(v, -1)); if(s > 0 && s % 2 === 1 && String(v).trim() === String(s) && !seen.has(s)){ seen.add(s); const m = E.get(s); if(m && [100, 104, 106, 110, 112, 116, 126, 212, 214].includes(m.type)) emit(s, T, e, (depth || 0) + 1); } } return; }
          skipped[e.type] = (skipped[e.type] || 0) + 1;
      } }catch(err){ skipped[e.type + '!'] = (skipped[e.type + '!'] || 0) + 1; }
    }
    for(const e of E.values()){ if(e.blank === 1) continue; if(e.sub & 1) continue; if(e.use === 2 || e.use === 5) continue; if(e.type === 212 || e.type === 214){ /* chữ / mũi tên độc lập */ }
      curRoot = e.label === 'DVDSOLID' && e.subs ? 'S' + e.subs : e.seq; emit(e.seq, ROOT, null, 0); }   // mặt của cùng một khối DVDCAD → một lưới
    for(const b of meshB.values()){ if(!b.i.length || !A.meshEnt) continue; const w = A.meshEnt(b.p, b.i, null); w.srf = 1; const bw = base({ type: 'SOLID3D' }, b.e, b.inh); for(const k of ['layer', 'col', 'bl', 'lt']){ if(bw[k] != null) w[k] = bw[k]; else delete w[k]; } out.push(w); }
    return { ents: out, layers: [...layers], skipped, surfaces: nSurf, unit: R.unit, scale: us, info: R };
  }
  A.igesToEnts = igesToEnts;

  /* ===================== ghi IGES ===================== */
  class IV { constructor(v){ this.v = Math.round(v); } }
  const Ii = v => new IV(v);
  class HS { constructor(s){ this.s = ascii(s); } }
  const Hs = s => new HS(s);
  function fmtR(v){ if(!isFinite(v)) v = 0; if(Math.abs(v) < 1e-300) return '0.'; let s = (+v.toPrecision(15)).toString(); if(/e/i.test(s)){ let [m, x] = s.split(/e/i); if(!m.includes('.')) m += '.'; return m + 'E' + (+x); } if(!s.includes('.')) s += '.'; return s; }
  const IG_COL = { '#000000': 1, '#ff0000': 2, '#00ff00': 3, '#0000ff': 4, '#ffff00': 5, '#ff00ff': 6, '#00ffff': 7, '#ffffff': 8 };
  const LT_IG = { DASHED: 2, HIDDEN: 2, PHANTOM: 3, CENTER: 4, DOT: 5 };
  const US_IG = { 1: [1, 'IN'], 2: [4, 'FT'], 4: [2, 'MM'], 5: [10, 'CM'], 6: [6, 'M'], 7: [7, 'KM'], 9: [8, 'MIL'], 13: [9, 'UM'] };
  function igesWrite(ents, opt){
    opt = opt || {}; const L = []; const add = o => { L.push(o); return o; };
    const name = opt.name || (docBase() + '.igs');
    const colDefs = new Map(); const colOf = e => { if(!e || e.bl) return 0; const c = String(e.col || '').toLowerCase(); if(!/^#[0-9a-f]{6}$/.test(c)) return 0; if(IG_COL[c]) return IG_COL[c];
      if(!colDefs.has(c)){ const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); colDefs.set(c, add({ t: 314, f: 0, use: 2, p: [r / 2.55, g / 2.55, b / 2.55, Hs(c.slice(1).toUpperCase())] })); } return { ref: colDefs.get(c), neg: true }; };
    let lnames = []; try{ lnames = A.layerNames ? A.layerNames() : []; }catch(_){} const lvOf = new Map(); const levelOf = e => { const n = (e && e.layer) || '0'; if(n === '0') return 0; if(!lvOf.has(n)){ const lv = (lnames.indexOf(n) + 1) || (lvOf.size + 1000); lvOf.set(n, lv); add({ t: 406, f: 3, lv, use: 0, p: [Ii(2), Ii(lv), Hs(n)] }); } return lvOf.get(n); };
    const ltOf = e => { let lt = e && e.lt; if(!lt && e){ try{ lt = A.layerLT ? A.layerLT(e.layer || '0') : null; }catch(_){} } return LT_IG[String(lt || '').toUpperCase()] || 1; };
    const geo = (t, f, p, e, ex) => add(Object.assign({ t, f, p, col: colOf(e), lv: levelOf(e), font: ltOf(e) }, ex || {}));
    let MIR = null; const mir = () => MIR || (MIR = add({ t: 124, f: 0, use: 0, sub: 0, p: [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0] }));
    let n = 0, sk = {}; const skip = t => { sk[t] = (sk[t] || 0) + 1; }; let nFace = 0; const FMAX = opt.maxFaces || 60000;
    const arcP = (cx, cy, r, a1, a2) => [0, cx, cy, cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2)];
    let objNo = 0; const bilin = (a, b, c, d, e) => { if(nFace >= FMAX) return; nFace++; geo(128, 0, [Ii(1), Ii(1), Ii(1), Ii(1), Ii(0), Ii(0), Ii(1), Ii(0), Ii(0), 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, ...a, ...b, ...c, ...d, 0, 1, 0, 1], e, { label: 'DVDSOLID', subs: objNo }); };
    const nurbsOut = (e, deg, U, W, C, v0, v1, closed) => { const K = C.length - 1; const poly = W.every(w => Math.abs(w - W[0]) < 1e-12) ? 1 : 0; const planar = C.every(q => Math.abs(q[2] - C[0][2]) < 1e-12) ? 1 : 0;
      const p = [Ii(K), Ii(deg), Ii(planar), Ii(closed ? 1 : 0), Ii(poly), Ii(0), ...U, ...W, ...C.flat(), v0, v1]; if(planar) p.push(0, 0, 1); else p.push(0, 0, 0); return geo(126, 0, p, e); };
    for(const e of ents){ if(!e || e.vh || e.inv) continue; const t = e.type;
      try{ switch(t){
        case 'LINE': geo(110, 0, [e.x1, e.y1, 0, e.x2, e.y2, 0], e); n++; break;
        case 'CIRCLE': geo(100, 0, arcP(e.cx, e.cy, e.r, 0, 0), e); n++; break;
        case 'ARC': geo(100, 0, arcP(e.cx, e.cy, e.r, (e.a1 || 0) * D2R, (e.a2 || 0) * D2R), e); n++; break;
        case 'POINT': geo(116, 0, [e.x, e.y, 0, Ii(0)], e); n++; break;
        case 'ELLIPSE': { const a = Math.hypot(e.mx, e.my), b = a * (e.ratio || 1), r = Math.atan2(e.my, e.mx); const c = Math.cos(r), s = Math.sin(r);
          const M = add({ t: 124, f: 0, use: 0, sub: 0, p: [c, -s, 0, e.cx, s, c, 0, e.cy, 0, 0, 1, 0] }); const p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; const full = Math.abs(p2 - p1 - TAU) < 1e-9 || Math.abs(p2 - p1) < 1e-12;
          const q1 = full ? 0 : p1, q2 = full ? 0 : p2; geo(104, 1, [b * b, 0, a * a, 0, 0, -a * a * b * b, 0, a * Math.cos(q1), b * Math.sin(q1), a * Math.cos(q2), b * Math.sin(q2)], e, { mat: M }); n++; break; }
        case 'POLYLINE': { const V = e.vertices || []; if(V.length < 2) break;
          if(e.p3){ const P = V.map(v => [v.x, v.y, v.z || 0]); if(e.closed) P.push(P[0]); geo(106, 12, [Ii(2), Ii(P.length), ...P.flat()], e); n++; break; }
          if(e.nurbs && A.bvSig && Math.abs(A.bvSig(V) - e.nurbs.sig) <= 1e-7 * Math.max(1, Math.abs(e.nurbs.sig))){ const N = e.nurbs; nurbsOut(e, N.deg, N.U, N.W, N.C, N.v0, N.v1, e.closed); n++; break; }
          if(Array.isArray(e.spl) && e.spl.length >= 3){ // Catmull-Rom đều → Bézier bậc 3 → NURBS 126 (đúng hình)
            const F = e.spl, m = F.length, cl = !!e.closed; const get = i => cl ? F[((i % m) + m) % m] : F[Math.max(0, Math.min(m - 1, i))]; const ns = cl ? m : m - 1; const C = [[F[0].x, F[0].y, 0]]; const U = [0, 0, 0, 0];
            for(let i = 0; i < ns; i++){ const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2); C.push([p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, 0], [p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, 0], [p2.x, p2.y, 0]); if(i < ns - 1) U.push(i + 1, i + 1, i + 1); }
            U.push(ns, ns, ns, ns); nurbsOut(e, 3, U, C.map(() => 1), C, 0, ns, cl); n++; break; }
          const bv = A.bvOf ? A.bvOf(e) : null;
          if(bv && bv.some(q => q.bulge)){ const cl = !!e.closed, m = bv.length, ns = cl ? m : m - 1; const mem = [];
            for(let i = 0; i < ns; i++){ const a = bv[i], b = bv[(i + 1) % m]; if(!a.bulge){ mem.push(add({ t: 110, f: 0, sub: 1, col: colOf(e), lv: levelOf(e), font: ltOf(e), p: [a.x, a.y, 0, b.x, b.y, 0] })); continue; }
              const th = 4 * Math.atan(a.bulge), ch = Math.hypot(b.x - a.x, b.y - a.y), r = ch / (2 * Math.sin(Math.abs(th) / 2)); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; const ux = (b.x - a.x) / ch, uy = (b.y - a.y) / ch; const dd = r * Math.cos(Math.abs(th) / 2) * Math.sign(a.bulge);
              const cx = mx - uy * dd, cy = my + ux * dd;
              if(a.bulge > 0) mem.push(add({ t: 100, f: 0, sub: 1, col: colOf(e), lv: levelOf(e), font: ltOf(e), p: [0, cx, cy, a.x, a.y, b.x, b.y] }));
              else mem.push(add({ t: 100, f: 0, sub: 1, col: colOf(e), lv: levelOf(e), font: ltOf(e), mat: mir(), p: [0, cx, -cy, a.x, -a.y, b.x, -b.y] })); }
            geo(102, 0, [Ii(mem.length), ...mem.map(x => ({ ref: x }))], e); n++; break; }
          const P = V.map(v => [v.x, v.y]); if(e.closed) P.push(P[0]); geo(106, 11, [Ii(1), Ii(P.length), 0, ...P.flat()], e); n++; break; }
        case 'TEXT': { const s = String(e.text || '').split('\n').map(x => x.replace(/\\P/g, ' ')); const h = e.h || 2.5, r = (e.rot || 0) * D2R; const p = [Ii(s.length)];
          s.forEach((ln, i) => { const dx = Math.sin(r) * 1.6 * h * i, dy = -Math.cos(r) * 1.6 * h * i; const tx = ascii(ln); p.push(Ii(tx.length), Math.max(h, tx.length * h * 0.7), h, Ii(1), Math.PI / 2, r, Ii(0), Ii(0), e.x + dx, e.y + dy, 0, Hs(tx)); });
          geo(212, 0, p, e); n++; break; }
        case 'SOLID': { const p = e.pts || []; if(p.length < 3) break; const zs = e.zs || []; const q = k => [p[Math.min(k, p.length - 1)].x, p[Math.min(k, p.length - 1)].y, zs[Math.min(k, p.length - 1)] || 0];
          if(e.face) bilin(q(0), q(1), q(3), q(2), e); else bilin(q(0), q(1), q(2), q(3), e); n++; break; }
        case 'SOLID3D': { objNo++; let P, I; if(e.k === 'mesh' && e.v && e.f){ P = e.v; I = e.f; } else { const m = A.meshOf ? A.meshOf(e) : null; if(!m){ skip(t); break; } P = m.p; I = m.i; }
          const v = k => [P[3 * k], P[3 * k + 1], P[3 * k + 2]]; for(let k = 0; k + 2 < I.length; k += 3){ const a = v(I[k]), b = v(I[k + 1]), c = v(I[k + 2]); bilin(a, b, c, c, e); } n++; break; }
        default: skip(t);
      } }catch(err){ skip(t + '!'); }
    }
    // ---- dàn trang ----
    const idx = new Map(); L.forEach((o, i) => idx.set(o, 2 * i + 1));
    const tok = v => v instanceof IV ? String(v.v) : v instanceof HS ? v.s.length + 'H' + v.s : v && v.ref ? String((v.neg ? -1 : 1) * idx.get(v.ref)) : typeof v === 'number' ? fmtR(v) : String(v);
    const wrap = (toks, w) => { const lines = []; let cur = ''; toks.forEach((t, i) => { const piece = t + (i === toks.length - 1 ? ';' : ','); if(cur.length + piece.length <= w){ cur += piece; return; } if(cur) lines.push(cur); cur = ''; let s = piece; while(s.length > w){ lines.push(s.slice(0, w)); s = s.slice(w); } cur = s; }); if(cur) lines.push(cur); return lines; };
    const pad = (v, w) => String(v).padStart(w, ' ');
    const Sl = ['DVDCAD IGES — ' + ascii(name), 'Xuat tu DVDCAD (ma nguon mo GPL-3.0)'].map(s => ascii(s).slice(0, 72));
    const now = new Date(); const ds = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '.' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const [uf, un] = US_IG[(typeof insunits !== 'undefined' && insunits) || 4] || [2, 'MM'];
    let ext = 1; for(const o of L) for(const v of o.p) if(typeof v === 'number' && isFinite(v)) ext = Math.max(ext, Math.abs(v));
    const GP = [Hs(','), Hs(';'), Hs('DVDCAD'), Hs(name), Hs('DVDCAD'), Hs('DVDCAD IGES 5.3'), Ii(32), Ii(308), Ii(15), Ii(308), Ii(15), Hs(name.replace(/\.[^.]+$/, '')), 1, Ii(uf), Hs(un), Ii(1), 1, Hs(ds), 1e-6, ext, Hs(''), Hs(''), Ii(11), Ii(0), Hs(ds)];
    const Gl = wrap(GP.map(tok), 72);
    const Dl = [], Pl = []; let pseq = 1;
    L.forEach((o, i) => { const de = 2 * i + 1; const pl = wrap([String(o.t)].concat(o.p.map(tok)), 64); const st = '00' + String(o.sub ? 1 : 0).padStart(2, '0') + String(o.use || 0).padStart(2, '0') + '00';
      const col = o.col && o.col.ref ? -idx.get(o.col.ref) : (o.col || 0); const mat = o.mat ? idx.get(o.mat) : 0;
      Dl.push(pad(o.t, 8) + pad(pseq, 8) + pad(0, 8) + pad(o.font || 0, 8) + pad(o.lv || 0, 8) + pad(0, 8) + pad(mat, 8) + pad(0, 8) + st);
      Dl.push(pad(o.t, 8) + pad(0, 8) + pad(col, 8) + pad(pl.length, 8) + pad(o.f || 0, 8) + pad('', 8) + pad('', 8) + pad(o.label || '', 8) + pad(o.subs || 0, 8));
      for(const l of pl){ Pl.push(l.padEnd(64, ' ') + pad(de, 8)); pseq++; } });
    const outL = []; Sl.forEach((l, i) => outL.push(l.padEnd(72, ' ') + 'S' + pad(i + 1, 7))); Gl.forEach((l, i) => outL.push(l.padEnd(72, ' ') + 'G' + pad(i + 1, 7)));
    Dl.forEach((l, i) => outL.push(l.padEnd(72, ' ') + 'D' + pad(i + 1, 7))); Pl.forEach((l, i) => outL.push(l.padEnd(72, ' ') + 'P' + pad(i + 1, 7)));
    outL.push(('S' + pad(Sl.length, 7) + 'G' + pad(Gl.length, 7) + 'D' + pad(Dl.length, 7) + 'P' + pad(Pl.length, 7)).padEnd(72, ' ') + 'T' + pad(1, 7));
    return { text: outL.join('\r\n') + '\r\n', count: n, entities: L.length, skipped: sk, faces: nFace, facesCapped: nFace >= FMAX };
  }
  A.igesWrite = igesWrite;

  const skTxt = sk => { const k = Object.keys(sk); return k.length ? ' Bỏ qua: ' + k.map(t => t + ' ×' + sk[t]).join(', ') + '.' : ''; };
  async function importIGESText(text, fname){
    let R; try{ R = igesToEnts(text); }catch(err){ log('IGESIMPORT: ' + err.message); say(err.message); return null; }
    if(!R.ents.length){ log('IGESIMPORT: không có đối tượng đọc được.' + skTxt(R.skipped)); return R; }
    for(const nm of R.layers) try{ A.addLayer && A.addLayer(nm); }catch(_){}
    A.commit({ add: R.ents }, 'IGESIMPORT: ' + (fname || 'IGES') + ' — ' + R.ents.length + ' đối tượng' + (R.surfaces ? ' (' + R.surfaces + ' mặt gộp thành lưới)' : '') + (Math.abs(R.scale - 1) > 1e-12 ? ', tỉ lệ đơn vị ×' + (+R.scale.toPrecision(6)) : '') + '.' + skTxt(R.skipped));
    try{ fitView(); draw(); }catch(_){} return R; }
  A.igesImportText = importIGESText;
  cmd(['IGESIMPORT', 'IGESIN'], 'Nhập tệp IGES (.igs / .iges): đường, cung, NURBS, đường ghép, mặt (NURBS, cắt xén, tròn xoay…) → lưới, chữ, khối con, màu, lớp', async () => {
    const f = await pickFile('.igs,.iges,.IGS,.IGES'); if(!f) return; await importIGESText(await f.text(), f.name); });
  cmd(['IGESEXPORT', 'IGESOUT'], 'Xuất IGES 5.3 (.igs): đường, cung, elip, đa tuyến (giữ cung), spline (NURBS), chữ, khối 3D / lưới (mặt), màu, lớp, kiểu nét', async () => {
    const s = await A.getSel('Chọn đối tượng <Tất cả>'); let L = s && s.sel && s.sel.length ? s.sel : ME().filter(e => !e.vh && !e.inv);
    if(!L.length){ log('IGESEXPORT: bản vẽ trống.'); return; } const nm = docBase() + '.igs'; const R = igesWrite(L, { name: nm });
    await shareOrDownload(new Blob([R.text], { type: 'model/iges' }), nm, 'model/iges');
    log('IGESEXPORT: đã ghi ' + nm + ' — ' + R.count + ' đối tượng → ' + R.entities + ' thực thể IGES' + (R.faces ? ' (' + R.faces + ' mặt tam giác' + (R.facesCapped ? ', đã chạm giới hạn' : '') + ')' : '') + '.' + skTxt(R.skipped)); });

  /* ===================== DXB ===================== */
  // Drawing Interchange Binary (AutoCAD R12): đầu tệp "AutoCAD DXB 1.0\r\n\x1a\0"; mỗi bản ghi = 1 byte loại + dữ liệu (little-endian)
  // số n: chế độ nguyên = int16 × hệ số tỉ lệ (128) — chế độ thực = float64; w = int16; u (bulge): nguyên = int32 / 2^24 — thực = float64; góc: nguyên = int32 phần triệu độ — thực = float64 radian
  const DXB_HEAD = 'AutoCAD DXB 1.0\r\n\x1a\x00';
  function parseDXB(buf){
    const dv = new DataView(buf), u8 = new Uint8Array(buf); let i = 0; const head = String.fromCharCode(...u8.slice(0, 19)); if(head !== DXB_HEAD) throw new Error('Không phải tệp DXB (thiếu đầu "AutoCAD DXB 1.0").'); i = 19;
    let real = false, sc = 1, layer = '0', color = 0; const out = [], layers = new Set(); let last = null, pl = null, tr = null; let bulgeNext = 0, nRec = 0, bad = null;
    const need = k => { if(i + k > u8.length) throw new Error('hết tệp'); };
    const N = () => { if(real){ need(8); const v = dv.getFloat64(i, true); i += 8; return v; } need(2); const v = dv.getInt16(i, true); i += 2; return v * sc; };
    const W = () => { need(2); const v = dv.getInt16(i, true); i += 2; return v; };
    const Uu = () => { if(real){ need(8); const v = dv.getFloat64(i, true); i += 8; return v; } need(4); const v = dv.getInt32(i, true); i += 4; return v / 16777216; };
    const Ang = () => { if(real){ need(8); const v = dv.getFloat64(i, true); i += 8; return v * R2D; } need(4); const v = dv.getInt32(i, true); i += 4; return v / 1e6; };
    const ACI = c => (A.aciHex ? A.aciHex(c) : null) || ({ 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff', 6: '#ff00ff', 7: '#ffffff' }[c]) || '#ffffff';
    const P = o => { const w = A.newProps(o); w.layer = layer; layers.add(layer); if(color > 0 && color < 256){ w.col = ACI(color); delete w.bl; } else { w.col = A.layerHex ? A.layerHex(layer) : '#ffffff'; w.bl = 1; } out.push(w); return w; };
    const endPl = () => { if(pl && pl.v.length >= 2){ const w = P({ type: 'POLYLINE', vertices: pl.v.map(q => ({ x: q.x, y: q.y })), closed: pl.closed }); if(pl.v.some(q => q.bulge) && A.setBV) A.setBV(w, pl.v); } pl = null; };
    try{ while(i < u8.length){ const t = u8[i++]; nRec++;
      switch(t){
        case 0: i = u8.length; break;   // kết thúc
        case 1: { const x1 = N(), y1 = N(), x2 = N(), y2 = N(); last = P({ type: 'LINE', x1, y1, x2, y2 }); break; }
        case 2: { const x = N(), y = N(); P({ type: 'POINT', x, y }); break; }
        case 3: { const cx = N(), cy = N(), r = N(); P({ type: 'CIRCLE', cx, cy, r }); break; }
        case 8: { const cx = N(), cy = N(), r = N(), a1 = Ang(), a2 = Ang(); P({ type: 'ARC', cx, cy, r, a1, a2 }); break; }
        case 9: case 11: { const q = []; for(let k = 0; k < 4; k++) q.push({ x: N(), y: N() }); if(t === 11) P({ type: 'SOLID', pts: q }); else { P({ type: 'SOLID', pts: q }); tr = q; } break; }
        case 10: { const x1 = N(), y1 = N(), z1 = N(), x2 = N(), y2 = N(), z2 = N(); if(Math.abs(z1 - z2) < 1e-12) last = P({ type: 'LINE', x1, y1, x2, y2 }); else P({ type: 'POLYLINE', p3: true, vertices: [{ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 }], closed: false }); break; }
        case 17: endPl(); break;
        case 19: { endPl(); pl = { closed: (W() & 1) === 1, v: [] }; bulgeNext = 0; break; }
        case 20: { const x = N(), y = N(); if(pl){ pl.v.push({ x, y }); if(bulgeNext){ pl.v[pl.v.length - 1].bulge = bulgeNext; bulgeNext = 0; } } break; }
        case 22: { const q = [], zs = []; for(let k = 0; k < 4; k++){ q.push({ x: N(), y: N() }); zs.push(N()); } P({ type: 'SOLID', face: true, pts: q, zs }); break; }
        case 128: { need(8); sc = dv.getFloat64(i, true); i += 8; if(!(sc > 0)) sc = 1; break; }
        case 129: { let s = ''; while(i < u8.length && u8[i]) s += String.fromCharCode(u8[i++]); i++; layer = s.trim() || '0'; break; }
        case 130: { const x2 = N(), y2 = N(); const x1 = last ? last.x2 : 0, y1 = last ? last.y2 : 0; last = P({ type: 'LINE', x1, y1, x2, y2 }); break; }
        case 131: { const a = { x: N(), y: N() }, b = { x: N(), y: N() }; const p0 = tr ? tr[2] : a, p1 = tr ? tr[3] : b; tr = [p0, p1, a, b]; P({ type: 'SOLID', pts: tr }); break; }
        case 132: { N(); N(); break; }
        case 133: { const b = Uu(); if(pl && pl.v.length) pl.v[pl.v.length - 1].bulge = b; else bulgeNext = b; break; }
        case 134: { N(); N(); break; }
        case 135: { real = W() !== 0; break; }
        case 136: { color = W(); break; }
        default: bad = 'mã bản ghi ' + t + ' tại byte ' + (i - 1); i = u8.length;
      } } }catch(err){ bad = err.message; }
    endPl(); return { ents: out, layers: [...layers], records: nRec, warn: bad };
  }
  A.parseDXB = parseDXB;
  // ghi DXB (để thử / trao đổi): chế độ thực
  A.dxbEncode = function(ents){ const B = []; const u8 = n => B.push(n & 255); const f64 = v => { const b = new ArrayBuffer(8); new DataView(b).setFloat64(0, v, true); B.push(...new Uint8Array(b)); }; const i16 = v => { u8(v); u8(v >> 8); };
    for(const c of DXB_HEAD) u8(c.charCodeAt(0)); u8(135); i16(1); let ly = null;
    for(const e of ents){ if((e.layer || '0') !== ly){ ly = e.layer || '0'; u8(129); for(const c of ascii(ly)) u8(c.charCodeAt(0)); u8(0); }
      switch(e.type){ case 'LINE': u8(1); f64(e.x1); f64(e.y1); f64(e.x2); f64(e.y2); break; case 'POINT': u8(2); f64(e.x); f64(e.y); break; case 'CIRCLE': u8(3); f64(e.cx); f64(e.cy); f64(e.r); break;
        case 'ARC': u8(8); f64(e.cx); f64(e.cy); f64(e.r); f64(e.a1 * D2R); f64(e.a2 * D2R); break;
        case 'POLYLINE': { const bv = (A.bvOf && A.bvOf(e)) || e.vertices; u8(19); i16(e.closed ? 1 : 0); for(const v of bv){ u8(20); f64(v.x); f64(v.y); if(v.bulge){ u8(133); f64(v.bulge); } } u8(17); break; }
        case 'SOLID': { const p = e.pts || []; if(p.length < 3) break; u8(11); for(let k = 0; k < 4; k++){ const q = p[Math.min(k, p.length - 1)]; f64(q.x); f64(q.y); } break; } } }
    u8(0); return new Uint8Array(B).buffer; };
  async function importDXB(buf, fname){ let R; try{ R = parseDXB(buf); }catch(err){ log('DXBIN: ' + err.message); say(err.message); return null; }
    for(const nm of R.layers) try{ A.addLayer && A.addLayer(nm); }catch(_){}
    if(R.ents.length) A.commit({ add: R.ents }, 'DXBIN: ' + (fname || 'DXB') + ' — ' + R.ents.length + ' đối tượng.' + (R.warn ? ' Dừng đọc: ' + R.warn + '.' : '')); else log('DXBIN: không có đối tượng.' + (R.warn ? ' ' + R.warn : ''));
    try{ draw(); }catch(_){} return R; }
  A.dxbImport = importDXB;
  cmd(['DXBIN'], 'Nhập tệp DXB (Drawing Interchange Binary) vào bản vẽ hiện hành: đường, cung, tròn, điểm, đa tuyến (có cung), trace, solid, 3DFACE, lớp, màu', async () => {
    const f = await pickFile('.dxb,.DXB'); if(!f) return; await importDXB(await f.arrayBuffer(), f.name); });
})();
