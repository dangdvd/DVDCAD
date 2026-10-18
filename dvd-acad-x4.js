/* DVDCAD v4k — RÀNG BUỘC THAM SỐ (parametric constraints) kiểu AutoCAD
   Hình học: GCHORIZONTAL, GCVERTICAL, GCPARALLEL, GCPERPENDICULAR, GCCOINCIDENT, GCCOLLINEAR, GCEQUAL, GCCONCENTRIC, GCTANGENT, GCFIX (GEOMCONSTRAINT)
   Kích thước: DCHORIZONTAL, DCVERTICAL, DCALIGNED, DCRADIUS, DCDIAMETER, DCANGULAR (DIMCONSTRAINT) · PARAMETERS · AUTOCONSTRAIN · DELCONSTRAINT · CONSTRAINTBAR
   Bộ giải: Levenberg–Marquardt trên toạ độ các đối tượng; mỗi lần sửa (lệnh, ô nắm, bảng thuộc tính…) các đối tượng liên quan tự điều chỉnh. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x4 || !window.DVDCmd) return; A._x4 = true;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const docName = () => { try{ return currentName || ''; }catch(_){ return ''; } };
  const OK_T = e => e && (e.type === 'LINE' || e.type === 'CIRCLE' || e.type === 'ARC' || (e.type === 'POLYLINE' && !e.wq && (e.vertices || []).length >= 2 && (e.vertices || []).length <= 400));

  /* ---------------- dữ liệu ---------------- */
  let CONS = []; let SHOW = true;
  const cKey = () => 'dvd:cons::' + docName();
  const loadC = () => { try{ CONS = JSON.parse(localStorage.getItem(cKey()) || '[]'); }catch(_){ CONS = []; } };
  const saveC = () => { try{ if(CONS.length) localStorage.setItem(cKey(), JSON.stringify(CONS)); else localStorage.removeItem(cKey()); }catch(_){} };
  A.constraints = () => CONS;
  const newCid = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const byCid = () => { const m = new Map(); for(const e of modelEntities) if(e.cid) m.set(e.cid, e); return m; };

  /* ---------------- tham số hoá đối tượng ---------------- */
  function params(e){
    switch(e.type){
      case 'LINE': return [e.x1, e.y1, e.x2, e.y2];
      case 'CIRCLE': return [e.cx, e.cy, e.r];
      case 'ARC': return [e.cx, e.cy, e.r, e.a1 * D2R, e.a2 * D2R];
      case 'POLYLINE': { const o = []; for(const v of e.vertices) o.push(v.x, v.y); return o; }
    }
    return [];
  }
  function setParams(w, p){
    switch(w.type){
      case 'LINE': [w.x1, w.y1, w.x2, w.y2] = p; break;
      case 'CIRCLE': w.cx = p[0]; w.cy = p[1]; w.r = Math.abs(p[2]); break;
      case 'ARC': { w.cx = p[0]; w.cy = p[1]; w.r = Math.abs(p[2]); const n = a => ((a * R2D) % 360 + 360) % 360; w.a1 = n(p[3]); w.a2 = n(p[4]); break; }
      case 'POLYLINE': w.vertices = w.vertices.map((v, i) => Object.assign({}, v, { x: p[2 * i], y: p[2 * i + 1] })); break;
    }
  }
  // truy xuất điểm / đoạn / đường tròn trên vector tham số
  function G(X, idx){
    const off = c => idx.get(c);
    return {
      pt(r){ const o = idx.get(r.c); if(!o) return null; const e = o.e, b = o.off;
        if(e.type === 'LINE') return r.k === 'p2' ? [X[b + 2], X[b + 3]] : r.k === 'mid' ? [(X[b] + X[b + 2]) / 2, (X[b + 1] + X[b + 3]) / 2] : [X[b], X[b + 1]];
        if(e.type === 'CIRCLE') return [X[b], X[b + 1]];
        if(e.type === 'ARC'){ if(r.k === 's') return [X[b] + X[b + 2] * Math.cos(X[b + 3]), X[b + 1] + X[b + 2] * Math.sin(X[b + 3])]; if(r.k === 'e') return [X[b] + X[b + 2] * Math.cos(X[b + 4]), X[b + 1] + X[b + 2] * Math.sin(X[b + 4])]; return [X[b], X[b + 1]]; }
        if(e.type === 'POLYLINE'){ const i = parseInt(String(r.k).slice(1), 10) || 0, n = e.vertices.length; const j = ((i % n) + n) % n; return [X[b + 2 * j], X[b + 2 * j + 1]]; }
        return null; },
      line(r){ const o = idx.get(r.c); if(!o) return null; const e = o.e, b = o.off;
        if(e.type === 'LINE') return [[X[b], X[b + 1]], [X[b + 2], X[b + 3]]];
        if(e.type === 'POLYLINE'){ const n = e.vertices.length, i = Math.max(0, Math.min(n - 1, parseInt(String(r.k).slice(1), 10) || 0)), j = (i + 1) % n; return [[X[b + 2 * i], X[b + 2 * i + 1]], [X[b + 2 * j], X[b + 2 * j + 1]]]; }
        return null; },
      circ(r){ const o = idx.get(r.c); if(!o) return null; const b = o.off; return (o.e.type === 'CIRCLE' || o.e.type === 'ARC') ? [[X[b], X[b + 1]], Math.abs(X[b + 2])] : null; },
      raw: off
    };
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = v => Math.hypot(v[0], v[1]), crs = (a, b) => a[0] * b[1] - a[1] * b[0], dt = (a, b) => a[0] * b[0] + a[1] * b[1];
  // phần dư của 1 ràng buộc
  function resid(c, g, L){
    const R = c.r;
    switch(c.t){
      case 'coin': { const p = g.pt(R[0]), q = g.pt(R[1]); return p && q ? [p[0] - q[0], p[1] - q[1]] : []; }
      case 'hor': { if(R.length === 2){ const p = g.pt(R[0]), q = g.pt(R[1]); return p && q ? [q[1] - p[1]] : []; } const l = g.line(R[0]); return l ? [l[1][1] - l[0][1]] : []; }
      case 'ver': { if(R.length === 2){ const p = g.pt(R[0]), q = g.pt(R[1]); return p && q ? [q[0] - p[0]] : []; } const l = g.line(R[0]); return l ? [l[1][0] - l[0][0]] : []; }
      case 'par': case 'perp': case 'col': { const a = g.line(R[0]), b = g.line(R[1]); if(!a || !b) return []; const u = sub(a[1], a[0]), v = sub(b[1], b[0]), lu = len(u) || 1, lv = len(v) || 1;
        if(c.t === 'perp') return [dt(u, v) / (lu * lv) * L];
        const r = [crs(u, v) / (lu * lv) * L]; if(c.t === 'col') r.push(crs(u, sub(b[0], a[0])) / lu); return r; }
      case 'eq': { const a = g.line(R[0]), b = g.line(R[1]); if(a && b) return [len(sub(a[1], a[0])) - len(sub(b[1], b[0]))]; const p = g.circ(R[0]), q = g.circ(R[1]); return p && q ? [p[1] - q[1]] : []; }
      case 'conc': { const p = g.circ(R[0]), q = g.circ(R[1]); return p && q ? [p[0][0] - q[0][0], p[0][1] - q[0][1]] : []; }
      case 'tan': { const C1 = g.circ(R[0]), l = g.line(R[1]), C2 = g.circ(R[1]);
        if(C1 && l){ const u = sub(l[1], l[0]), lu = len(u) || 1; return [Math.abs(crs(u, sub(C1[0], l[0]))) / lu - C1[1]]; }
        if(C1 && C2){ const d = len(sub(C1[0], C2[0])); return [c.inner ? d - Math.abs(C1[1] - C2[1]) : d - (C1[1] + C2[1])]; } return []; }
      case 'fix': { const p = g.pt(R[0]); return p ? [(p[0] - c.at[0]) * 10, (p[1] - c.at[1]) * 10] : []; }
      case 'dh': { const p = g.pt(R[0]), q = g.pt(R[1]); return p && q ? [(q[0] - p[0]) * (c.sg || 1) - c.val] : []; }
      case 'dv': { const p = g.pt(R[0]), q = g.pt(R[1]); return p && q ? [(q[1] - p[1]) * (c.sg || 1) - c.val] : []; }
      case 'da': { if(R.length === 1){ const l = g.line(R[0]); return l ? [len(sub(l[1], l[0])) - c.val] : []; } const p = g.pt(R[0]), q = g.pt(R[1]); return p && q ? [len(sub(q, p)) - c.val] : []; }
      case 'dr': { const p = g.circ(R[0]); return p ? [p[1] - c.val] : []; }
      case 'dd': { const p = g.circ(R[0]); return p ? [2 * p[1] - c.val] : []; }
      case 'dang': { const a = g.line(R[0]), b = g.line(R[1]); if(!a || !b) return []; const u = sub(a[1], a[0]), v = sub(b[1], b[0]); let t = Math.atan2(crs(u, v), dt(u, v)) * (c.sg || 1); return [(t - c.val * D2R) * L]; }
    }
    return [];
  }
  /* ---------------- bộ giải Levenberg–Marquardt ---------------- */
  function solveLin(M, b){ const n = b.length; for(let i = 0; i < n; i++){ let p = i; for(let k = i + 1; k < n; k++) if(Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; [M[i], M[p]] = [M[p], M[i]]; [b[i], b[p]] = [b[p], b[i]]; const d = M[i][i] || 1e-30; for(let k = i + 1; k < n; k++){ const f = M[k][i] / d; if(!f) continue; for(let j = i; j < n; j++) M[k][j] -= f * M[i][j]; b[k] -= f * b[i]; } } const x = new Array(n).fill(0); for(let i = n - 1; i >= 0; i--){ let s = b[i]; for(let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / (M[i][i] || 1e-30); } return x; }
  // chỉ số tham số ứng với 1 tham chiếu (để ghim điểm)
  function refIdx(e, k){
    if(k === '*') return params(e).map((_, i) => i);
    switch(e.type){
      case 'LINE': return k === 'p1' ? [0, 1] : k === 'p2' ? [2, 3] : [0, 1, 2, 3];
      case 'CIRCLE': return k === 'c' ? [0, 1] : [0, 1, 2];
      case 'ARC': return k === 's' ? [0, 1, 2, 3] : k === 'e' ? [0, 1, 2, 4] : k === 'c' ? [0, 1] : [0, 1, 2, 3, 4];
      case 'POLYLINE': { const n = e.vertices.length; const m = /^([vS])(\d+)$/.exec(String(k)); if(!m) return []; const i = +m[2] % n; const o = [2 * i, 2 * i + 1]; if(m[1] === 'S'){ const j = (i + 1) % n; o.push(2 * j, 2 * j + 1); } return o; }
    }
    return [];
  }
  /* Bộ giải: chiếu Gauss–Newton có trọng số (nghiệm "di chuyển ít nhất"): đối tượng vừa sửa / điểm được ghim giữ nguyên nhiều nhất,
     các đối tượng còn lại tự điều chỉnh. Ràng buộc thoả chính xác; ràng buộc thừa / mâu thuẫn được giảm chấn. */
  function solve(work, cons, changed, pins){
    const idx = new Map(); const X = []; const W = [];
    for(const [cid, e] of work){ idx.set(cid, { e, off: X.length }); const p = params(e); const ch = changed.has(cid); for(let k = 0; k < p.length; k++){ X.push(p[k]); W.push(ch ? 1 : 0.02); }
      if(e.type === 'CIRCLE' || e.type === 'ARC') W[X.length - p.length + 2] *= 4; }       // ưu tiên dời hơn là đổi bán kính
    for(const r of (pins || [])){ const o = idx.get(r.c); if(!o) continue; for(const j of refIdx(o.e, r.k)) W[o.off + j] = 50; }
    const n = X.length; if(!n) return false;
    let mn = [Infinity, Infinity], mx = [-Infinity, -Infinity]; for(const [, e] of work){ const b = entBBox(e); if(!b) continue; mn = [Math.min(mn[0], b.x0), Math.min(mn[1], b.y0)]; mx = [Math.max(mx[0], b.x1), Math.max(mx[1], b.y1)]; }
    const L = Math.max(Math.hypot(mx[0] - mn[0], mx[1] - mn[1]), 1e-6) / 4, tol = L * 1e-10;
    for(const [, o] of idx) if(o.e.type === 'ARC'){ W[o.off + 3] *= L; W[o.off + 4] *= L; }
    const Dg = W.map(w => 1 / (w * w));
    const res = x => { const g = G(x, idx), r = []; for(const c of cons) for(const v of resid(c, g, L)) r.push(v); return r; };
    const nrm = r => r.reduce((s, v) => s + v * v, 0);
    let x = X.slice(), r = res(x), f = nrm(r);
    for(let it = 0; it < 60 && r.length; it++){
      if(Math.max(...r.map(Math.abs)) < tol) break;
      const m = r.length, J = []; for(let i = 0; i < m; i++) J.push(new Float64Array(n));
      for(let j = 0; j < n; j++){ const h = Math.max(Math.abs(x[j]) * 1e-7, L * 1e-8, 1e-10); const xs = x.slice(); xs[j] += h; const r1 = res(xs); for(let i = 0; i < m; i++) J[i][j] = (r1[i] - r[i]) / h; }
      const M = []; let tr = 0; for(let a = 0; a < m; a++){ const row = new Array(m).fill(0); for(let b = 0; b <= a; b++){ let s2 = 0; const Ja = J[a], Jb = J[b]; for(let j = 0; j < n; j++) if(Ja[j] && Jb[j]) s2 += Ja[j] * Dg[j] * Jb[j]; row[b] = s2; } M.push(row); tr += row[a]; }
      for(let a = 0; a < m; a++) for(let b = a + 1; b < m; b++) M[a][b] = M[b][a];
      let mu = Math.max(tr / m, 1e-30) * 1e-10, done = false;
      for(let tries = 0; tries < 8 && !done; tries++){
        const Mm = M.map((row, a) => { const q = row.slice(); q[a] += mu; return q; });
        const y = solveLin(Mm, r.slice()); const dx = new Float64Array(n); for(let i = 0; i < m; i++){ const yi = y[i]; if(!yi) continue; const Ji = J[i]; for(let j = 0; j < n; j++) if(Ji[j]) dx[j] -= Dg[j] * Ji[j] * yi; }
        let al = 1; for(let ls = 0; ls < 8; ls++){ const xn = x.map((v, j) => v + al * dx[j]); const rn = res(xn), fn = nrm(rn); if(fn < f || fn < tol * tol){ x = xn; r = rn; f = fn; done = true; break; } al /= 2; }
        if(!done) mu *= 1e3;
      }
      if(!done) break;
    }
    const ok = !r.length || Math.max(...r.map(Math.abs)) < Math.max(L * 1e-6, 1e-9);
    for(const [, o] of idx){ const p = params(o.e); setParams(o.e, x.slice(o.off, o.off + p.length)); }
    return ok;
  }
  /* ---------------- áp dụng: mỗi lần commit, giải các ràng buộc liên quan ---------------- */
  let internal = false;
  function component(seed){ const cids = new Set(seed), out = new Set(); let grew = true;
    while(grew){ grew = false; for(let i = 0; i < CONS.length; i++){ if(out.has(i)) continue; if(CONS[i].r.some(r => cids.has(r.c))){ out.add(i); grew = true; for(const r of CONS[i].r) cids.add(r.c); } } }
    return { cons: [...out].map(i => CONS[i]), cids }; }
  function runSolve(ch, seed, weightCh, pins){
    const comp = component(seed); if(!comp.cons.length) return ch;
    const cur = byCid(); const work = new Map(); const repMap = new Map();
    for(const [o, w] of (ch.rep || [])) if(w && w.cid){ work.set(w.cid, w); repMap.set(w.cid, o); }
    for(const e of (ch.add || [])) if(e && e.cid) work.set(e.cid, e);
    const extra = [];
    for(const cid of comp.cids){ if(work.has(cid)) continue; const e = cur.get(cid); if(!e || !OK_T(e)) continue; const w = copy(e); work.set(cid, w); extra.push([e, w]); }
    const ok = solve(work, comp.cons.filter(c => c.r.every(r => work.has(r.c))), weightCh || new Set(seed), pins);
    if(!ok) log('Ràng buộc: không thoả được hết — kiểm tra ràng buộc mâu thuẫn (PARAMETERS / DELCONSTRAINT).');
    const rep = (ch.rep || []).concat(extra.filter(([e, w]) => JSON.stringify(params(e)) !== JSON.stringify(params(w))));
    return Object.assign({}, ch, { rep });
  }
  const _commit = A.commit;
  A.commit = function(ch, msg){
    if(internal || !CONS.length || !ch) return _commit.apply(this, arguments);
    try{
      const repC = new Set((ch.rep || []).map(([, w]) => w && w.cid).filter(Boolean)), addC = new Set((ch.add || []).map(e => e && e.cid).filter(Boolean));
      const dels = (ch.del || []).map(e => e && e.cid).filter(c => c && !repC.has(c) && !addC.has(c));
      if(dels.length){ const ds = new Set(dels); const n0 = CONS.length; CONS = CONS.filter(c => !c.r.some(r => ds.has(r.c))); if(CONS.length !== n0){ saveC(); log('Đã bỏ ' + (n0 - CONS.length) + ' ràng buộc của đối tượng bị xoá.'); } }
      const seed = [...repC, ...addC]; if(seed.length && CONS.length){ ch = runSolve(ch, seed); }
    }catch(err){ console.warn('constraint', err); }
    return _commit.call(this, ch, msg);
  };
  // gắn mã ràng buộc (cid) cho đối tượng, thêm ràng buộc rồi giải (1 bước hoàn tác)
  // pin: 'first' = giữ đối tượng chọn trước (đối tượng sau dời theo, như AutoCAD) · 'pt' = giữ điểm thứ nhất · mảng tham chiếu cụ thể
  function addConstraint(c, ents, pin){
    const rep = []; const ids = ents.map(e => { if(e.cid) return e.cid; const id = newCid(); const w = copy(e); w.cid = id; rep.push([e, w]); return id; });
    c.r = c.r.map(r => Object.assign({}, r, { c: ids[r.i] })); c.r.forEach(r => delete r.i); c.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    CONS.push(c); saveC();
    let ch = { rep }; const seed = ids.slice();
    let pins = []; if(pin === true || pin === 'first'){ const r0 = c.r[0]; pins = c.r.filter(r => r.c === r0.c && r.k === r0.k); if(c.r.every(r => r.c === r0.c) === false) pins = [{ c: r0.c, k: '*' }]; }
    else if(pin === 'pt') pins = [c.r[0]]; else if(Array.isArray(pin)) pins = pin.map(r => Object.assign({}, r, { c: r.c != null ? r.c : ids[r.i] }));
    ch = runSolve(ch, seed, new Set(), pins);
    internal = true; try{ _commit({ rep: ch.rep }, 'Thêm ràng buộc'); } finally { internal = false; }
    try{ draw(); A.paint(); }catch(_){}
  }
  A.addConstraint = addConstraint;
  /* ---------------- chọn điểm / đoạn / đường tròn ---------------- */
  function keyPts(e){ switch(e.type){ case 'LINE': return [['p1', e.x1, e.y1], ['p2', e.x2, e.y2], ['mid', (e.x1 + e.x2) / 2, (e.y1 + e.y2) / 2]]; case 'CIRCLE': return [['c', e.cx, e.cy]];
    case 'ARC': return [['s', e.cx + e.r * Math.cos(e.a1 * D2R), e.cy + e.r * Math.sin(e.a1 * D2R)], ['e', e.cx + e.r * Math.cos(e.a2 * D2R), e.cy + e.r * Math.sin(e.a2 * D2R)], ['c', e.cx, e.cy]];
    case 'POLYLINE': return e.vertices.map((v, i) => ['v' + i, v.x, v.y]); } return []; }
  async function pickPt(prompt){ const r = await A.getEnt(prompt, { filter: OK_T }); if(!r.ent) return null; const p = r.pt || { x: 0, y: 0 }; let best = null, bd = Infinity; for(const [k, x, y] of keyPts(r.ent)){ const d = Math.hypot(x - p.x, y - p.y); if(d < bd){ bd = d; best = k; } } return best ? { e: r.ent, k: best, p: keyPts(r.ent).find(q => q[0] === best) } : null; }
  function nearSeg(ent, p){ const v = ent.vertices; p = p || v[0]; let bi = 0, bd = Infinity; const m = ent.closed ? v.length : v.length - 1;
    for(let i = 0; i < m; i++){ const a = v[i], b = v[(i + 1) % v.length]; const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)); const d = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); if(d < bd){ bd = d; bi = i; } }
    return 'S' + bi; }
  async function pickLine(prompt){ const r = await A.getEnt(prompt, { filter: e => e.type === 'LINE' || (e.type === 'POLYLINE' && OK_T(e)) }); if(!r.ent) return null; if(r.ent.type === 'LINE') return { e: r.ent, k: 'L' };
    return { e: r.ent, k: nearSeg(r.ent, r.pt) }; }
  async function pickCirc(prompt){ const r = await A.getEnt(prompt, { filter: e => e.type === 'CIRCLE' || e.type === 'ARC' }); return r.ent ? { e: r.ent, k: 'C' } : null; }
  async function pickLineOrCirc(prompt){ const r = await A.getEnt(prompt, { filter: e => OK_T(e) }); if(!r.ent) return null; if(r.ent.type === 'CIRCLE' || r.ent.type === 'ARC') return { e: r.ent, k: 'C' }; if(r.ent.type === 'LINE') return { e: r.ent, k: 'L' }; return { e: r.ent, k: nearSeg(r.ent, r.pt) }; }
  const two = (a, b) => [a.e, b.e].reduce((o, e) => { if(!o.includes(e)) o.push(e); return o; }, []);
  function refs(list){ const ents = []; const R = list.map(x => { let i = ents.indexOf(x.e); if(i < 0){ ents.push(x.e); i = ents.length - 1; } return { i, k: x.k }; }); return { ents, R }; }
  const GC = {
    hor: async () => { const k = await A.getKw('Ràng buộc ngang cho', { kw: [{ k: 'D', t: 'Đoạn thẳng' }, { k: '2', t: '2 điểm' }], def: 'Đoạn thẳng' }); if(k.kw === '2'){ const a = await pickPt('Điểm thứ nhất'); if(!a) return; const b = await pickPt('Điểm thứ hai'); if(!b) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'hor', r: R }, ents, false); return; } const l = await pickLine('Chọn đoạn thẳng'); if(!l) return; const { ents, R } = refs([l]); addConstraint({ t: 'hor', r: R }, ents, false); },
    ver: async () => { const k = await A.getKw('Ràng buộc dọc cho', { kw: [{ k: 'D', t: 'Đoạn thẳng' }, { k: '2', t: '2 điểm' }], def: 'Đoạn thẳng' }); if(k.kw === '2'){ const a = await pickPt('Điểm thứ nhất'); if(!a) return; const b = await pickPt('Điểm thứ hai'); if(!b) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'ver', r: R }, ents, false); return; } const l = await pickLine('Chọn đoạn thẳng'); if(!l) return; const { ents, R } = refs([l]); addConstraint({ t: 'ver', r: R }, ents, false); },
    par: async () => { const a = await pickLine('Chọn đoạn thứ nhất (giữ nguyên)'); if(!a) return; const b = await pickLine('Chọn đoạn thứ hai (sẽ xoay)'); if(!b) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'par', r: R }, ents, true); },
    perp: async () => { const a = await pickLine('Chọn đoạn thứ nhất (giữ nguyên)'); if(!a) return; const b = await pickLine('Chọn đoạn thứ hai'); if(!b) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'perp', r: R }, ents, true); },
    col: async () => { const a = await pickLine('Chọn đoạn thứ nhất'); if(!a) return; const b = await pickLine('Chọn đoạn thứ hai'); if(!b) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'col', r: R }, ents, true); },
    coin: async () => { const a = await pickPt('Chọn điểm thứ nhất (bấm gần đầu đoạn / tâm)'); if(!a) return; const b = await pickPt('Chọn điểm thứ hai (sẽ dời tới điểm thứ nhất)'); if(!b) return; if(a.e === b.e && a.k === b.k) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'coin', r: R }, ents, true); },
    eq: async () => { const a = await pickLineOrCirc('Chọn đoạn / đường tròn thứ nhất'); if(!a) return; const b = await pickLineOrCirc('Chọn đối tượng thứ hai (cùng loại)'); if(!b) return; if((a.k === 'C') !== (b.k === 'C')){ log('Hai đối tượng phải cùng loại (đoạn – đoạn hoặc tròn – tròn).'); return; } const { ents, R } = refs([a, b]); addConstraint({ t: 'eq', r: R }, ents, true); },
    conc: async () => { const a = await pickCirc('Chọn đường tròn / cung thứ nhất'); if(!a) return; const b = await pickCirc('Chọn đường tròn / cung thứ hai'); if(!b) return; const { ents, R } = refs([a, b]); addConstraint({ t: 'conc', r: R }, ents, true); },
    tan: async () => { const a = await pickCirc('Chọn đường tròn / cung'); if(!a) return; const b = await pickLineOrCirc('Chọn đoạn thẳng hoặc đường tròn tiếp xúc'); if(!b) return; const { ents, R } = refs([a, b]); const c = { t: 'tan', r: R }; if(b.k === 'C'){ const d = Math.hypot(a.e.cx - b.e.cx, a.e.cy - b.e.cy); c.inner = d < Math.max(a.e.r, b.e.r); } addConstraint(c, ents, 'first'); },
    fix: async () => { const a = await pickPt('Chọn điểm cần cố định'); if(!a) return; const { ents, R } = refs([a]); addConstraint({ t: 'fix', r: R, at: [a.p[1], a.p[2]] }, ents, false); }
  };
  const GCN = { hor: 'Ngang', ver: 'Dọc', par: 'Song song', perp: 'Vuông góc', col: 'Thẳng hàng', coin: 'Trùng điểm', eq: 'Bằng nhau', conc: 'Đồng tâm', tan: 'Tiếp xúc', fix: 'Cố định' };
  const GCK = { hor: 'H', ver: 'V', par: 'PA', perp: 'PE', col: 'COL', coin: 'C', eq: 'E', conc: 'CON', tan: 'T', fix: 'F' };
  cmd(['GEOMCONSTRAINT', 'GCON', 'RANGBUOC'], 'Ràng buộc hình học: ngang, dọc, song song, vuông góc, trùng điểm, bằng nhau, đồng tâm, tiếp xúc, cố định', async () => {
    const k = await A.getKw('Loại ràng buộc', { kw: Object.keys(GCN).map(t => ({ k: GCK[t], t: GCN[t] })), def: 'Ngang' }); const t = Object.keys(GCK).find(x => GCK[x] === (k.kw || 'H')); if(t) await GC[t]();
  });
  const GCMD = { hor: 'GCHORIZONTAL', ver: 'GCVERTICAL', par: 'GCPARALLEL', perp: 'GCPERPENDICULAR', col: 'GCCOLLINEAR', coin: 'GCCOINCIDENT', eq: 'GCEQUAL', conc: 'GCCONCENTRIC', tan: 'GCTANGENT', fix: 'GCFIX' };
  for(const t of Object.keys(GCMD)) cmd([GCMD[t]], 'Ràng buộc ' + GCN[t].toLowerCase(), () => GC[t]());
  /* ---------------- ràng buộc kích thước ---------------- */
  const fmtV = v => String(+(+v).toFixed(4));
  function nextName(prefix){ let i = 1; const names = new Set(CONS.map(c => c.name)); while(names.has(prefix + i)) i++; return prefix + i; }
  async function askVal(cur, name){ const r = await A.getStr('Giá trị ' + name + ' (số hoặc biểu thức, vd d1/2)', { def: fmtV(cur) }); const t = (r.str || '').trim(); if(!t) return { val: cur }; const v = evalExpr(t); if(v == null){ log('Biểu thức không hợp lệ: ' + t); return { val: cur }; } return { val: v, expr: /^[-+]?[\d.]+$/.test(t) ? null : t }; }
  function evalExpr(t){ let s = String(t); const names = CONS.filter(c => c.name).sort((a, b) => b.name.length - a.name.length); for(const c of names) s = s.replace(new RegExp('\\b' + c.name + '\\b', 'gi'), '(' + c.val + ')'); try{ return A.calc ? A.calc(s) : Number(s); }catch(_){ return null; } }
  const DC = {
    dh: async () => { const a = await pickPt('Điểm thứ nhất'); if(!a) return; const b = await pickPt('Điểm thứ hai'); if(!b) return; const d = b.p[1] - a.p[1], sg = d < 0 ? -1 : 1, nm = nextName('d'); const v = await askVal(Math.abs(d), nm); const { ents, R } = refs([a, b]); addConstraint({ t: 'dh', r: R, sg, val: v.val, expr: v.expr, name: nm }, ents, 'pt'); },
    dv: async () => { const a = await pickPt('Điểm thứ nhất'); if(!a) return; const b = await pickPt('Điểm thứ hai'); if(!b) return; const d = b.p[2] - a.p[2], sg = d < 0 ? -1 : 1, nm = nextName('d'); const v = await askVal(Math.abs(d), nm); const { ents, R } = refs([a, b]); addConstraint({ t: 'dv', r: R, sg, val: v.val, expr: v.expr, name: nm }, ents, 'pt'); },
    da: async () => { const k = await A.getKw('Kích thước thẳng cho', { kw: [{ k: 'D', t: 'Đoạn thẳng' }, { k: '2', t: '2 điểm' }], def: 'Đoạn thẳng' }); const nm = nextName('d');
      if(k.kw === '2'){ const a = await pickPt('Điểm thứ nhất'); if(!a) return; const b = await pickPt('Điểm thứ hai'); if(!b) return; const v = await askVal(Math.hypot(b.p[1] - a.p[1], b.p[2] - a.p[2]), nm); const { ents, R } = refs([a, b]); addConstraint({ t: 'da', r: R, val: v.val, expr: v.expr, name: nm }, ents, 'pt'); return; }
      const l = await pickLine('Chọn đoạn thẳng'); if(!l) return; const p = l.e.type === 'LINE' ? [[l.e.x1, l.e.y1], [l.e.x2, l.e.y2]] : (() => { const i = parseInt(l.k.slice(1), 10), v = l.e.vertices, j = (i + 1) % v.length; return [[v[i].x, v[i].y], [v[j].x, v[j].y]]; })();
      const v = await askVal(Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), nm); const { ents, R } = refs([l]); addConstraint({ t: 'da', r: R, val: v.val, expr: v.expr, name: nm }, ents, [{ i: 0, k: l.k === 'L' ? 'p1' : 'v' + l.k.slice(1) }]); },
    dr: async () => { const c = await pickCirc('Chọn đường tròn / cung'); if(!c) return; const nm = nextName('rad'); const v = await askVal(c.e.r, nm); const { ents, R } = refs([c]); addConstraint({ t: 'dr', r: R, val: v.val, expr: v.expr, name: nm }, ents, [{ i: 0, k: 'c' }]); },
    dd: async () => { const c = await pickCirc('Chọn đường tròn / cung'); if(!c) return; const nm = nextName('dia'); const v = await askVal(c.e.r * 2, nm); const { ents, R } = refs([c]); addConstraint({ t: 'dd', r: R, val: v.val, expr: v.expr, name: nm }, ents, [{ i: 0, k: 'c' }]); },
    dang: async () => { const a = await pickLine('Chọn đoạn thứ nhất'); if(!a) return; const b = await pickLine('Chọn đoạn thứ hai'); if(!b) return; const seg = x => x.e.type === 'LINE' ? [x.e.x2 - x.e.x1, x.e.y2 - x.e.y1] : (() => { const i = parseInt(x.k.slice(1), 10), v = x.e.vertices, j = (i + 1) % v.length; return [v[j].x - v[i].x, v[j].y - v[i].y]; })();
      const u = seg(a), w = seg(b); let t = Math.atan2(crs(u, w), dt(u, w)) * R2D; const sg = t < 0 ? -1 : 1; const nm = nextName('ang'); const v = await askVal(Math.abs(t), nm); const { ents, R } = refs([a, b]); addConstraint({ t: 'dang', r: R, sg, val: v.val, expr: v.expr, name: nm }, ents, true); }
  };
  const DCN = { dh: 'Ngang', dv: 'Dọc', da: 'Thẳng', dr: 'Bán kính', dd: 'Đường kính', dang: 'Góc' }, DCK = { dh: 'H', dv: 'V', da: 'A', dr: 'R', dd: 'D', dang: 'AN' };
  cmd(['DIMCONSTRAINT', 'DCON', 'RANGBUOCKT'], 'Ràng buộc kích thước: ngang, dọc, thẳng, bán kính, đường kính, góc (đổi số → hình đổi theo)', async () => {
    const k = await A.getKw('Loại', { kw: Object.keys(DCN).map(t => ({ k: DCK[t], t: DCN[t] })), def: 'Thẳng' }); const t = Object.keys(DCK).find(x => DCK[x] === (k.kw || 'A')); if(t) await DC[t]();
  });
  for(const [t, c] of [['dh', 'DCHORIZONTAL'], ['dv', 'DCVERTICAL'], ['da', 'DCALIGNED'], ['dr', 'DCRADIUS'], ['dd', 'DCDIAMETER'], ['dang', 'DCANGULAR']]) cmd([c], 'Ràng buộc kích thước ' + DCN[t].toLowerCase(), () => DC[t]());
  cmd(['AUTOCONSTRAIN', 'AUTOCON'], 'Tự thêm ràng buộc trùng điểm, ngang, dọc cho đối tượng chọn', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = (s.sel || []).filter(OK_T); if(!sel.length) return;
    let mn = [Infinity, Infinity], mx = [-Infinity, -Infinity]; for(const e of sel){ const b = entBBox(e); if(b){ mn = [Math.min(mn[0], b.x0), Math.min(mn[1], b.y0)]; mx = [Math.max(mx[0], b.x1), Math.max(mx[1], b.y1)]; } }
    const tol = Math.max(Math.hypot(mx[0] - mn[0], mx[1] - mn[1]) * 1e-6, 1e-9);
    const ids = new Map(); const rep = []; for(const e of sel){ if(e.cid){ ids.set(e, e.cid); continue; } const id = newCid(); ids.set(e, id); const w = copy(e); w.cid = id; rep.push([e, w]); }
    const has = (t, a, b) => CONS.some(c => c.t === t && c.r.length === 2 && ((c.r[0].c === a.c && c.r[0].k === a.k && c.r[1].c === b.c && c.r[1].k === b.k) || (c.r[0].c === b.c && c.r[0].k === b.k && c.r[1].c === a.c && c.r[1].k === a.k)));
    let nC = 0, nH = 0;
    const pts = []; for(const e of sel) for(const [k, x, y] of keyPts(e)) if(k !== 'mid' && k !== 'c') pts.push({ c: ids.get(e), k, x, y, e });
    for(let i = 0; i < pts.length; i++) for(let j = i + 1; j < pts.length; j++){ const a = pts[i], b = pts[j]; if(a.c === b.c) continue; if(Math.hypot(a.x - b.x, a.y - b.y) <= tol && !has('coin', a, b)){ CONS.push({ t: 'coin', r: [{ c: a.c, k: a.k }, { c: b.c, k: b.k }], id: 'c' + Math.random().toString(36).slice(2, 9) }); nC++; } }
    const segs = []; for(const e of sel){ if(e.type === 'LINE') segs.push({ c: ids.get(e), k: 'L', a: [e.x1, e.y1], b: [e.x2, e.y2] }); else if(e.type === 'POLYLINE'){ const v = e.vertices, m = e.closed ? v.length : v.length - 1; for(let i = 0; i < m; i++){ const q = v[(i + 1) % v.length]; segs.push({ c: ids.get(e), k: 'S' + i, a: [v[i].x, v[i].y], b: [q.x, q.y] }); } } }
    for(const sg of segs){ const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], L = Math.hypot(dx, dy); if(L < tol) continue; const ang = Math.abs(Math.atan2(dy, dx)) * R2D;
      const t = (ang < 1 || ang > 179) ? 'hor' : (Math.abs(ang - 90) < 1) ? 'ver' : null; if(t && !CONS.some(c => c.t === t && c.r.length === 1 && c.r[0].c === sg.c && c.r[0].k === sg.k)){ CONS.push({ t, r: [{ c: sg.c, k: sg.k }], id: 'c' + Math.random().toString(36).slice(2, 9) }); nH++; } }
    saveC(); let ch = { rep }; ch = runSolve(ch, [...ids.values()], new Set());
    internal = true; try{ _commit({ rep: ch.rep }, 'Tự ràng buộc'); } finally { internal = false; } try{ draw(); }catch(_){}
    log('AUTOCONSTRAIN: ' + nC + ' trùng điểm, ' + nH + ' ngang/dọc.');
  });
  cmd(['DELCONSTRAINT', 'DELCON'], 'Xoá mọi ràng buộc của đối tượng chọn', async () => {
    const s = await A.getSel('Chọn đối tượng'); const ids = new Set((s.sel || []).map(e => e.cid).filter(Boolean)); if(!ids.size){ log('Đối tượng chọn không có ràng buộc.'); return; }
    const n0 = CONS.length; CONS = CONS.filter(c => !c.r.some(r => ids.has(r.c))); saveC(); try{ draw(); }catch(_){} log('DELCONSTRAINT: đã xoá ' + (n0 - CONS.length) + ' ràng buộc.');
  });
  plain(['CONSTRAINTBAR', 'CBAR', 'DCDISPLAY'], 'Hiện / ẩn ký hiệu ràng buộc', () => { SHOW = !SHOW; try{ localStorage.setItem('dvd:cbar', SHOW ? '1' : '0'); draw(); }catch(_){} log('Ký hiệu ràng buộc: ' + (SHOW ? 'hiện' : 'ẩn')); });
  try{ SHOW = localStorage.getItem('dvd:cbar') !== '0'; }catch(_){}
  // đổi giá trị ràng buộc kích thước (từ PARAMETERS)
  function applyParams(){
    for(let pass = 0; pass < 3; pass++) for(const c of CONS) if(c.expr){ const v = evalExpr(c.expr); if(v != null) c.val = v; }
    saveC(); const cur = byCid(); const seed = [...new Set(CONS.filter(c => c.val != null).flatMap(c => c.r.map(r => r.c)))].filter(id => cur.has(id));
    const pins = CONS.filter(c => c.name).map(c => { const r = c.r[0]; const k = r.k === 'L' ? 'p1' : /^S\d+$/.test(r.k) ? 'v' + r.k.slice(1) : r.k === 'C' ? 'c' : r.k; return { c: r.c, k }; });
    let ch = { rep: [] }; ch = runSolve(ch, seed, new Set(), pins);
    internal = true; try{ if(ch.rep.length) _commit({ rep: ch.rep }, 'Đổi tham số'); } finally { internal = false; } try{ draw(); A.paint(); }catch(_){}
  }
  A.setParam = (name, v) => { const c = CONS.find(x => x.name === name); if(!c) return false; if(typeof v === 'number'){ c.val = v; delete c.expr; } else { const x = evalExpr(v); if(x == null) return false; c.val = x; c.expr = v; } applyParams(); return true; };
  plain(['PARAMETERS', 'PAR', 'THAMSO'], 'Bảng tham số: sửa giá trị / biểu thức các ràng buộc kích thước', () => {
    const dims = CONS.filter(c => c.name);
    const html = dims.length ? '<table style="width:100%;border-collapse:collapse" cellpadding="4"><tr><th align="left">Tên</th><th align="left">Biểu thức / giá trị</th><th align="right">Giá trị</th><th></th></tr>' + dims.map(c => '<tr><td><b>' + esc(c.name) + '</b> <span style="opacity:.6">' + esc(DCN[c.t] || '') + '</span></td><td><input data-n="' + esc(c.name) + '" value="' + esc(c.expr || fmtV(c.val)) + '" style="width:100%"></td><td align="right">' + fmtV(c.val) + (c.t === 'dang' ? '°' : '') + '</td><td><button data-x="' + esc(c.id) + '">✕</button></td></tr>').join('') + '</table>' : '<p>Chưa có ràng buộc kích thước. Dùng DIMCONSTRAINT (DCON).</p>';
    A.dialog({ title: 'Tham số (PARAMETERS)', html: html + '<p style="opacity:.75;font-size:12px">Gõ số hoặc biểu thức theo tên khác, vd <code>d1/2</code>, <code>d1+300</code>. Ràng buộc hình học: ' + CONS.filter(c => !c.name).length + '.</p>', wide: true, okText: 'Áp dụng',
      onOpen: root => root.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if(!x) return; CONS = CONS.filter(c => c.id !== x.dataset.x); saveC(); x.closest('tr').remove(); try{ draw(); }catch(_){} }),
      ok: root => { let bad = null; root.querySelectorAll('input[data-n]').forEach(inp => { const c = CONS.find(x => x.name === inp.dataset.n); if(!c) return; const t = inp.value.trim(); if(/^[-+]?[\d.]+$/.test(t)){ c.val = +t; delete c.expr; } else { const v = evalExpr(t); if(v == null) bad = t; else { c.expr = t; c.val = v; } } }); if(bad){ say('Biểu thức không hợp lệ: ' + bad); return false; } applyParams(); log('Đã áp dụng tham số.'); } });
  });
  /* ---------------- hiển thị ký hiệu ràng buộc ---------------- */
  const SYM = { hor: 'H', ver: 'V', par: '∥', perp: '⊥', col: '≡', coin: '•', eq: '=', conc: '◎', tan: 'T', fix: '🔒' };
  function drawCons(){
    if(!SHOW || !CONS.length || (typeof _exporting !== 'undefined' && _exporting)) return; try{ if(!isModelView()) return; }catch(_){}
    const cur = byCid(); if(!cur.size) return; const idx = new Map(); const X = []; for(const [cid, e] of cur){ if(!OK_T(e)) continue; idx.set(cid, { e, off: X.length }); for(const v of params(e)) X.push(v); } const g = G(X, idx);
    const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '11px system-ui,sans-serif'; ctx.textBaseline = 'middle';
    const slot = new Map(); const at = (r) => { const l = g.line(r); if(l && r.k !== 'c' && !/^(p1|p2|mid|s|e|v\d+)$/.test(r.k)) return [(l[0][0] + l[1][0]) / 2, (l[0][1] + l[1][1]) / 2]; const p = g.pt(r); if(p) return p; const c = g.circ(r); return c ? [c[0][0] + c[1] * 0.7, c[0][1] + c[1] * 0.7] : null; };
    for(const c of CONS){
      if(c.name){ const pts = c.r.map(r => g.pt(r) || at(r)).filter(Boolean); if(!pts.length) continue; let p = pts[0], q = pts[1] || pts[0];
        if(c.t === 'da' && c.r.length === 1){ const l = g.line(c.r[0]); if(l){ p = l[0]; q = l[1]; } }
        if(c.t === 'dr' || c.t === 'dd'){ const C = g.circ(c.r[0]); if(C){ p = C[0]; q = [C[0][0] + C[1], C[0][1]]; } }
        const P = toScreen(p[0], p[1]), Q = toScreen(q[0], q[1]); ctx.strokeStyle = 'rgba(80,160,255,.8)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke(); ctx.setLineDash([]);
        const txt = c.name + ' = ' + (c.expr ? c.expr + ' (' + fmtV(c.val) + ')' : fmtV(c.val)) + (c.t === 'dang' ? '°' : ''); const w = ctx.measureText(txt).width + 10, mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2 - 12;
        ctx.fillStyle = 'rgba(20,40,70,.9)'; ctx.fillRect(mx - w / 2, my - 8, w, 16); ctx.fillStyle = '#9fd0ff'; ctx.textAlign = 'center'; ctx.fillText(txt, mx, my); continue; }
      for(const r of c.r){ const p = at(r); if(!p) continue; const S = toScreen(p[0], p[1]); const key = r.c + '|' + Math.round(S.x / 18) + '|' + Math.round(S.y / 18); const n = slot.get(key) || 0; slot.set(key, n + 1);
        const x = S.x + 8 + n * 16, y = S.y - 12; ctx.fillStyle = 'rgba(30,34,44,.92)'; ctx.strokeStyle = 'rgba(140,150,170,.9)'; ctx.fillRect(x - 7, y - 7, 14, 14); ctx.strokeRect(x - 7, y - 7, 14, 14); ctx.fillStyle = c.t === 'fix' ? '#ffcc66' : '#d8e2f0'; ctx.textAlign = 'center'; ctx.fillText(SYM[c.t] || '?', x, y + 0.5); }
    }
    ctx.restore();
  }
  const _draw = window.draw; window.draw = function(){ const r = _draw.apply(this, arguments); try{ drawCons(); }catch(err){ console.warn(err); } return r; };
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); loadC(); }; })(A.onLoad);
  setTimeout(loadC, 0);
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
