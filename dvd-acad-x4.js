/* DVDCAD v4k (viết lại ở v5i) — ràng buộc tham số như AutoCAD (tab Parametric)
   · Hình học: GCHORIZONTAL, GCVERTICAL, GCPARALLEL, GCPERPENDICULAR, GCCOLLINEAR, GCCOINCIDENT, GCEQUAL, GCCONCENTRIC, GCTANGENT, GCFIX · lệnh chung GEOMCONSTRAINT
     Như AutoCAD: đối tượng chọn trước đứng yên, đối tượng chọn sau dời theo.
   · Kích thước: DCALIGNED, DCHORIZONTAL, DCVERTICAL, DCRADIUS, DCDIAMETER, DCANGULAR · lệnh chung DIMCONSTRAINT
     Mỗi ràng buộc có tên (d1, rad1, dia1, ang1…); giá trị là biểu thức theo tên khác: d1*2, d1+300, sqrt(d2^2+d3^2).
   · AUTOCONSTRAIN · PARAMETERS (bảng tham số) · DELCONSTRAINT · CONSTRAINTBAR (hiện / ẩn ký hiệu)
   · Mọi cách sửa (MOVE, ô nắm, STRETCH, bảng Thuộc tính…) đi qua A.commit nên giữ ràng buộc: đối tượng liên quan tự chỉnh,
     Undo hoàn tác cả nhóm. Dùng cho đường thẳng, đa tuyến không cong, đường tròn, cung.
   · Lưu theo bản vẽ (localStorage dvd:cons::<tên>) và trong DXF (DVDCAD_DATA, đối tượng giữ mã e.cid). */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x4 || !window.DVDCmd) return; A._x4 = true;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const docName = () => (typeof currentName === 'string' && currentName) || '';
  const newCid = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtV = v => String(+(+v).toFixed(6));

  /* =====================================================================
     1) DỮ LIỆU — CONS: [{ id, t, a, b?, name?, expr?, g?, p? }]
        a / b: { cid, s } đoạn thẳng thứ s · { cid, k } điểm (p1 p2 c a1 a2 v<i>) · { cid } cả đối tượng
     ===================================================================== */
  let CONS = [], BAR = true, seq = 0;
  try{ BAR = localStorage.getItem('dvd:consbar') !== '0'; }catch(_){}
  const consKey = () => 'dvd:cons::' + docName();
  const saveCons = () => { try{ if(CONS.length) localStorage.setItem(consKey(), JSON.stringify(CONS)); else localStorage.removeItem(consKey()); }catch(_){} };
  function loadCons(){ CONS = []; try{ CONS = JSON.parse(localStorage.getItem(consKey()) || '[]') || []; }catch(_){} for(const c of CONS){ const n = parseInt(String(c.id || '').slice(1), 10); if(n > seq) seq = n; } }
  const refs = c => [c.a, c.b].filter(Boolean);
  const cidsOf = c => [...new Set(refs(c).map(r => r.cid))];
  const isDim = c => /^(dist|dx|dy|rad|dia|ang)$/.test(c.t);
  function liveMap(){ const m = new Map(); for(const e of modelEntities) if(e && e.cid && !m.has(e.cid)) m.set(e.cid, e); return m; }
  const liveCons = (M = liveMap()) => CONS.filter(c => cidsOf(c).every(id => M.has(id)));
  A.constraints = () => deep(liveCons());

  /* =====================================================================
     2) HÌNH HỌC CỦA ĐỐI TƯỢNG
     ===================================================================== */
  const isPoly = e => e.type === 'POLYLINE' && Array.isArray(e.vertices) && e.vertices.length >= 2 && !e.wipe && !(A.bvOf && A.bvOf(e));
  const okEnt = e => !!e && !e.grp && !e.xr && (e.type === 'LINE' || e.type === 'CIRCLE' || e.type === 'ARC' || isPoly(e));
  const isCurve = e => e && (e.type === 'CIRCLE' || e.type === 'ARC');
  const hasSeg = e => e && (e.type === 'LINE' || isPoly(e));
  const nSeg = e => e.type === 'LINE' ? 1 : (e.closed ? e.vertices.length : e.vertices.length - 1);
  function segKeys(e, s){ if(e.type === 'LINE') return ['p1', 'p2']; const n = e.vertices.length; return ['v' + s, 'v' + ((s + 1) % n)]; }
  function keysOf(e){ if(e.type === 'LINE') return ['p1', 'p2']; if(e.type === 'CIRCLE') return ['c']; if(e.type === 'ARC') return ['c', 'a1', 'a2']; return e.vertices.map((_, i) => 'v' + i); }
  const arcPt = (e, a) => ({ x: e.cx + e.r * Math.cos(a * D2R), y: e.cy + e.r * Math.sin(a * D2R) });
  function getP(e, k){
    if(!e) return null;
    switch(k){ case 'p1': return { x: e.x1, y: e.y1 }; case 'p2': return { x: e.x2, y: e.y2 }; case 'c': return { x: e.cx, y: e.cy };
      case 'a1': return arcPt(e, e.a1); case 'a2': return arcPt(e, e.a2); }
    if(k && k[0] === 'v'){ const v = e.vertices && e.vertices[+k.slice(1)]; return v ? { x: v.x, y: v.y } : null; }
    return null;
  }
  function setP(e, k, p){
    switch(k){ case 'p1': e.x1 = p.x; e.y1 = p.y; return; case 'p2': e.x2 = p.x; e.y2 = p.y; return; case 'c': e.cx = p.x; e.cy = p.y; return;
      case 'a1': case 'a2': { const q = getP(e, k); e.cx += p.x - q.x; e.cy += p.y - q.y; return; } }   // đầu cung: dời cả cung
    if(k[0] === 'v'){ const v = e.vertices[+k.slice(1)]; if(v){ v.x = p.x; v.y = p.y; } }
    if(e.wq) delete e.wq;
  }
  function translate(e, dx, dy){ for(const k of keysOf(e)){ if(k === 'a1' || k === 'a2') continue; const p = getP(e, k); setP(e, k, { x: p.x + dx, y: p.y + dy }); } }
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const segPts = (e, s) => segKeys(e, s).map(k => getP(e, k));
  function nearSeg(e, pt){ if(!pt || e.type === 'LINE') return 0; let best = 0, bd = Infinity; for(let s = 0; s < nSeg(e); s++){ const [a, b] = segPts(e, s); const d = segDist(pt, a, b); if(d < bd){ bd = d; best = s; } } return best; }
  function segDist(p, a, b){ const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1e-30; let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy); }
  function nearKey(e, pt){ let best = null, bd = Infinity; for(const k of keysOf(e)){ const q = getP(e, k); const d = pt ? dist(q, pt) : 0; if(d < bd){ bd = d; best = k; } } return { k: best, d: bd }; }
  const pxTol = () => 10 / ((typeof view !== 'undefined' && view.scale) || 1);

  /* =====================================================================
     3) BIỂU THỨC (d1*2, sqrt(d1^2+d2^2)…) — không dùng eval
     ===================================================================== */
  const FN = { sqrt: Math.sqrt, abs: Math.abs, sin: x => Math.sin(x * D2R), cos: x => Math.cos(x * D2R), tan: x => Math.tan(x * D2R), round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max };
  function evalExpr(src, look){
    const s = String(src).replace(/,/g, '.'); let i = 0;
    const ws = () => { while(i < s.length && /\s/.test(s[i])) i++; };
    const fail = m => { throw new Error(m || ('Biểu thức sai: ' + src)); };
    function prim(){ ws(); const ch = s[i];
      if(ch === '('){ i++; const v = add(); ws(); if(s[i] !== ')') fail(); i++; return v; }
      if(ch === '-'){ i++; return -pow(); } if(ch === '+'){ i++; return pow(); }
      const mn = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i)); if(mn){ i += mn[0].length; return parseFloat(mn[0]); }
      const mi = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)); if(mi){ i += mi[0].length; const n = mi[0]; ws();
        if(s[i] === '('){ i++; const args = []; ws(); if(s[i] !== ')'){ for(;;){ args.push(add()); ws(); if(s[i] === ','){ i++; continue; } break; } } if(s[i] !== ')') fail(); i++;
          const f = FN[n.toLowerCase()]; if(!f) fail('Không có hàm ' + n); return f(...args); }
        if(/^pi$/i.test(n)) return Math.PI; return look(n); }
      fail(); }
    function pow(){ let v = prim(); ws(); if(s[i] === '^'){ i++; v = Math.pow(v, pow()); } return v; }
    function mul(){ let v = pow(); for(;;){ ws(); if(s[i] === '*'){ i++; v *= pow(); } else if(s[i] === '/'){ i++; v /= pow(); } else return v; } }
    function add(){ let v = mul(); for(;;){ ws(); if(s[i] === '+'){ i++; v += mul(); } else if(s[i] === '-'){ i++; v -= mul(); } else return v; } }
    const v = add(); ws(); if(i < s.length) fail(); if(!isFinite(v)) fail('Giá trị không hợp lệ');
    return v;
  }
  // giá trị mọi ràng buộc kích thước (theo tên), phát hiện vòng lặp
  // tham số người dùng (User Parameters của Parameters Manager): { name, expr } — dùng được trong biểu thức ràng buộc
  const usrKey = () => 'dvd:userpar::' + docName();
  const userPars = () => { try{ return JSON.parse(localStorage.getItem(usrKey()) || '[]') || []; }catch(_){ return []; } };
  const saveUser = L => { try{ if(L.length) localStorage.setItem(usrKey(), JSON.stringify(L)); else localStorage.removeItem(usrKey()); }catch(_){} };
  function values(list){
    const by = new Map(list.filter(isDim).map(c => [String(c.name).toLowerCase(), c])), out = new Map(), busy = new Set();
    for(const u of userPars()){ const k = String(u.name).toLowerCase(); if(!by.has(k)) by.set(k, { name: u.name, expr: u.expr, user: 1 }); }
    const look = n => { const k = n.toLowerCase(); if(out.has(k)) return out.get(k); const c = by.get(k); if(!c) throw new Error('Không có tham số ' + n);
      if(busy.has(k)) throw new Error('Tham số tham chiếu vòng: ' + n); busy.add(k); const v = evalExpr(c.expr, look); busy.delete(k); out.set(k, v); return v; };
    for(const c of list) if(isDim(c)) look(c.name);
    for(const u of userPars()){ try{ look(u.name); }catch(_){} }
    return out;
  }
  const valOf = (c, V) => V.get(String(c.name).toLowerCase());

  /* =====================================================================
     4) BỘ GIẢI — lan từ đối tượng vừa sửa ra ngoài; điểm vừa được đặt thì khoá trong lượt giải
     ===================================================================== */
  function makeWS(initial, exclude){
    const live = liveMap(); if(exclude) for(const id of exclude) live.delete(id);
    const work = new Map(initial || []), orig = new Map();
    return { live, work, orig,
      cur: id => work.get(id) || live.get(id) || null,
      w: id => { let x = work.get(id); if(x) return x; const e = live.get(id); if(!e) return null; x = copy(e); work.set(id, x); orig.set(id, e); return x; } };
  }
  function rankMap(list, seeds){
    const adj = new Map(); const link = (a, b) => { if(!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
    for(const c of list){ const ids = cidsOf(c); for(const a of ids) for(const b of ids) if(a !== b) link(a, b); }
    const R = new Map(), q = [];
    for(const s of seeds) if(!R.has(s)){ R.set(s, 0); q.push(s); }
    for(const c of list) if(c.t === 'fix' && !R.has(c.a.cid)){ R.set(c.a.cid, 0); q.push(c.a.cid); }
    while(q.length){ const x = q.shift(); for(const y of adj.get(x) || []) if(!R.has(y)){ R.set(y, R.get(x) + 1); q.push(y); } }
    return R;
  }
  function solve(ws, seeds, locks){
    const list = CONS.filter(c => cidsOf(c).every(id => ws.cur(id)));
    if(!list.length) return { ok: true };
    let V; try{ V = values(list); }catch(err){ return { ok: false, err: err.message }; }
    const R = rankMap(list, seeds), rk = id => R.has(id) ? R.get(id) : 1e9;
    const fixedEnt = new Set(list.filter(c => c.t === 'fix' && !c.a.k).map(c => c.a.cid));
    const L = locks || new Set(); const lk = (id, k) => L.has(id + '|' + k); const lock = (id, k) => L.add(id + '|' + k);
    let scale = 1; for(const id of R.keys()){ const e = ws.cur(id); if(e) for(const k of keysOf(e)){ const p = getP(e, k); scale = Math.max(scale, Math.abs(p.x), Math.abs(p.y)); } }
    const tol = 1e-9 * scale;
    const order = list.slice().sort((a, b) => Math.max(...cidsOf(a).map(rk)) - Math.max(...cidsOf(b).map(rk)));
    // chọn bên được dời: bên xa đối tượng vừa sửa hơn; bằng nhau thì bên chọn sau (b)
    const side = c => { let ref = c.a, mov = c.b; if(rk(c.b.cid) < rk(c.a.cid) || (fixedEnt.has(c.b.cid) && !fixedEnt.has(c.a.cid))) { ref = c.b; mov = c.a; } return fixedEnt.has(mov.cid) ? null : { ref, mov }; };
    // dời 1 điểm (ghi nhận độ dời). Khoá điểm khi nó thật sự bị dời, hoặc khi do đối tượng khác quyết định (force) —
    // ràng buộc của chính đối tượng mà không dời gì thì không khoá (vd GCHORIZONTAL không giữ chặt đầu mút trước khi DCHORIZONTAL đặt độ dài)
    let moved = 0; const put = (id, k, p, force) => { const e = ws.w(id), q = getP(e, k); const d = dist(p, q); if(d > tol){ setP(e, k, p); moved = Math.max(moved, d); } if(d > tol || force) lock(id, k); };
    // xoay đoạn s của đối tượng id về hướng (ux,uy), giữ điểm neo (điểm đã khoá) và độ dài
    const orient = (id, s, ux, uy, len) => { const e = ws.cur(id); const [k1, k2] = segKeys(e, s); const p1 = getP(e, k1), p2 = getP(e, k2);
      const keep2 = lk(id, k2) && !lk(id, k1); const L0 = len != null ? len : dist(p1, p2);
      let dx = p2.x - p1.x, dy = p2.y - p1.y; if(dx * ux + dy * uy < 0){ ux = -ux; uy = -uy; }
      if(keep2) put(id, k1, { x: p2.x - ux * L0, y: p2.y - uy * L0 }); else put(id, k2, { x: p1.x + ux * L0, y: p1.y + uy * L0 }); };
    const dirOf = (id, s) => { const [a, b] = segPts(ws.cur(id), s); const L = dist(a, b) || 1; return { x: (b.x - a.x) / L, y: (b.y - a.y) / L, L, a, b }; };
    const lineOf = r => { const e = ws.cur(r.cid); return hasSeg(e) ? segPts(e, r.s || 0) : null; };
    const shiftEnt = (id, dx, dy) => { if(Math.hypot(dx, dy) <= tol) return; translate(ws.w(id), dx, dy); moved = Math.max(moved, Math.hypot(dx, dy)); for(const k of keysOf(ws.cur(id))) lock(id, k); };
    function apply(c){
      const one = c.b == null || (c.a.cid === c.b.cid);
      switch(c.t){
        case 'hor': case 'ver': { const id = c.a.cid, e = ws.cur(id); const [k1, k2] = segKeys(e, c.a.s || 0); const p1 = getP(e, k1), p2 = getP(e, k2);
          const keep2 = lk(id, k2) && !lk(id, k1);
          if(c.t === 'hor'){ if(keep2) put(id, k1, { x: p1.x, y: p2.y }); else put(id, k2, { x: p2.x, y: p1.y }); }
          else { if(keep2) put(id, k1, { x: p2.x, y: p1.y }); else put(id, k2, { x: p1.x, y: p2.y }); }
          return; }
        case 'fix': { const e = ws.cur(c.a.cid); if(c.a.k){ if(c.p) put(c.a.cid, c.a.k, c.p); }
          else if(c.g){ const w = ws.w(c.a.cid); for(const k of keysOf(e)){ if(k === 'a1' || k === 'a2') continue; const p = getP(c.g, k); if(p) put(c.a.cid, k, p); } if(c.g.r != null && Math.abs(w.r - c.g.r) > tol){ w.r = c.g.r; moved = Math.max(moved, 1); } }
          return; }
        case 'rad': case 'dia': { const v = valOf(c, V); const r = c.t === 'dia' ? v / 2 : v; const e = ws.cur(c.a.cid); if(r > 0 && Math.abs(e.r - r) > tol){ ws.w(c.a.cid).r = r; moved = Math.max(moved, Math.abs(e.r - r)); } return; }
      }
      if(one && (c.t === 'dist' || c.t === 'dx' || c.t === 'dy' || c.t === 'coin')){   // hai điểm của cùng 1 đối tượng
        const id = c.a.cid, e = ws.cur(id); let ka = c.a.k, kb = c.b.k; if(lk(id, kb) && !lk(id, ka)){ const t = ka; ka = kb; kb = t; }
        const pa = getP(e, ka), pb = getP(e, kb); return dimPts(c, id, kb, pa, pb);
      }
      const sd = side(c); if(!sd) return; const { ref, mov } = sd;
      const E = ws.cur(ref.cid), M = ws.cur(mov.cid);
      switch(c.t){
        case 'coin': put(mov.cid, mov.k, getP(E, ref.k), true); return;
        case 'dist': case 'dx': case 'dy': return dimPts(c, mov.cid, mov.k, getP(E, ref.k), getP(M, mov.k));
        case 'conc': put(mov.cid, 'c', getP(E, 'c'), true); return;
        case 'par': case 'perp': case 'col': { const d = dirOf(ref.cid, ref.s || 0); const ux = c.t === 'perp' ? -d.y : d.x, uy = c.t === 'perp' ? d.x : d.y;
          orient(mov.cid, mov.s || 0, ux, uy);
          if(c.t === 'col'){ const [m1] = segPts(ws.cur(mov.cid), mov.s || 0); const off = (m1.x - d.a.x) * -d.y + (m1.y - d.a.y) * d.x;
            if(Math.abs(off) > tol){ const [k1, k2] = segKeys(ws.cur(mov.cid), mov.s || 0); for(const k of [k1, k2]){ const p = getP(ws.cur(mov.cid), k); put(mov.cid, k, { x: p.x + d.y * off, y: p.y - d.x * off }); } } }
          return; }
        case 'ang': { const v = valOf(c, V) * D2R; const d = dirOf(ref.cid, ref.s || 0), m = dirOf(mov.cid, mov.s || 0);
          const phi = Math.atan2(d.x * m.y - d.y * m.x, d.x * m.x + d.y * m.y), a0 = Math.atan2(d.y, d.x) + (phi < 0 ? -v : v);   // giữ chiều quay hiện tại
          orient(mov.cid, mov.s || 0, Math.cos(a0), Math.sin(a0)); return; }
        case 'eq': {
          if(isCurve(E) && isCurve(M)){ if(Math.abs(M.r - E.r) > tol){ ws.w(mov.cid).r = E.r; moved = Math.max(moved, Math.abs(M.r - E.r)); } return; }
          if(hasSeg(E) && hasSeg(M)){ const d = dirOf(ref.cid, ref.s || 0), m = dirOf(mov.cid, mov.s || 0); orient(mov.cid, mov.s || 0, m.x, m.y, d.L); }
          return; }
        case 'tan': {
          if(hasSeg(E) && isCurve(M)){ const [a, b] = segPts(E, ref.s || 0); const L = dist(a, b) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; const sd2 = (M.cx - a.x) * nx + (M.cy - a.y) * ny; const want = (sd2 < 0 ? -1 : 1) * M.r; shiftEnt(mov.cid, nx * (want - sd2), ny * (want - sd2)); return; }
          if(isCurve(E) && hasSeg(M)){ const [a, b] = segPts(M, mov.s || 0); const L = dist(a, b) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; const sd2 = (E.cx - a.x) * nx + (E.cy - a.y) * ny; const want = (sd2 < 0 ? -1 : 1) * E.r; const k = sd2 - want; const [k1, k2] = segKeys(M, mov.s || 0); for(const kk of [k1, k2]){ const p = getP(ws.cur(mov.cid), kk); put(mov.cid, kk, { x: p.x + nx * k, y: p.y + ny * k }); } return; }
          if(isCurve(E) && isCurve(M)){ const dd = Math.hypot(M.cx - E.cx, M.cy - E.cy) || 1e-9; const inside = dd < Math.max(E.r, M.r) && dd + Math.min(E.r, M.r) <= Math.max(E.r, M.r) + 1e-9; const want = inside ? Math.abs(E.r - M.r) : E.r + M.r;
            const ux = (M.cx - E.cx) / dd, uy = (M.cy - E.cy) / dd; put(mov.cid, 'c', { x: E.cx + ux * want, y: E.cy + uy * want }, true); }
          return; }
      }
    }
    // ràng buộc khoảng cách giữa 2 điểm: dời điểm (id, k) — giữ hướng hiện tại
    function dimPts(c, id, k, pa, pb){ const v = valOf(c, V); if(!(v >= 0)) return;
      if(c.t === 'dist'){ let ux = pb.x - pa.x, uy = pb.y - pa.y; const L = Math.hypot(ux, uy); if(L < 1e-12){ ux = 1; uy = 0; } else { ux /= L; uy /= L; } put(id, k, { x: pa.x + ux * v, y: pa.y + uy * v }); return; }
      if(c.t === 'dx'){ const sg = pb.x - pa.x < 0 ? -1 : 1; put(id, k, { x: pa.x + sg * v, y: pb.y }); return; }
      if(c.t === 'dy'){ const sg = pb.y - pa.y < 0 ? -1 : 1; put(id, k, { x: pb.x, y: pa.y + sg * v }); return; }
      if(c.t === 'coin') put(id, k, pa); }
    let it = 0;
    for(; it < 50; it++){ moved = 0; for(const c of order){ try{ apply(c); }catch(err){ console.warn('constraint', c, err); } } if(moved <= tol) break; }
    return { ok: it < 50 };
  }
  const repsOf = ws => [...ws.orig.entries()].map(([id, e]) => [e, ws.work.get(id)]);

  /* =====================================================================
     5) GIỮ RÀNG BUỘC KHI SỬA — móc vào A.commit
     ===================================================================== */
  let solving = false;
  function changedKeys(o, w){ const s = new Set(); try{ for(const k of keysOf(w)){ const a = getP(o, k), b = getP(w, k); if(!a || !b || dist(a, b) > 1e-12) s.add(k); } }catch(_){} return s; }
  { const _c = A.commit;
    A.commit = function(ch, msg){
      if(solving || !CONS.length || !ch) return _c.apply(this, arguments);
      try{
        const live = liveMap(), delIds = new Set((ch.del || []).map(e => e && e.cid).filter(Boolean));
        const keep = new Set((ch.rep || []).map(x => x && x[0] && x[0].cid).filter(Boolean));
        for(const e of ch.add || []) if(e && e.cid && live.has(e.cid) && !delIds.has(e.cid)) delete e.cid;   // bản chép (COPY…) không mang ràng buộc
        const init = new Map(), locks = new Set(), seeds = new Set();
        for(const [o, w] of ch.rep || []){ if(!o || !w || !o.cid) continue; w.cid = o.cid; init.set(o.cid, w); seeds.add(o.cid); if(okEnt(w)) for(const k of changedKeys(o, w)) locks.add(o.cid + '|' + k); else for(const k of (okEnt(o) ? keysOf(o) : [])) locks.add(o.cid + '|' + k); }
        const touched = [...seeds].filter(id => CONS.some(c => cidsOf(c).includes(id)));
        if(touched.length){
          const ws = makeWS(init, delIds); for(const id of keep) if(!ws.live.has(id)) ws.live.set(id, init.get(id));
          const r = solve(ws, new Set(touched), locks); if(!r.ok) log('Ràng buộc: không thoả được hết' + (r.err ? ' — ' + r.err : '') + '.');
          let extra = repsOf(ws);
          if(extra.length && A.dimAssocExtra){ try{ const ex = A.dimAssocExtra({ rep: extra }); if(ex) extra = extra.concat(ex.filter(([o]) => !(ch.rep || []).some(([x]) => x === o))); }catch(_){} }
          if(extra.length) ch = Object.assign({}, ch, { rep: (ch.rep || []).concat(extra) });
        }
      }catch(err){ console.warn('x4 commit', err); }
      return _c.apply(this, [ch, msg].concat([].slice.call(arguments, 2)));
    }; }

  // thay đổi danh sách ràng buộc + chỉnh hình theo — 1 bước hoàn tác
  function change(mut, seeds, msg, prep){
    const before = deep(CONS); mut(CONS); const after = deep(CONS);
    const ws = makeWS(prep ? prep.init : null); if(prep) for(const [id, e] of prep.orig) ws.orig.set(id, e);
    const r = solve(ws, new Set(seeds || []), new Set());
    const reps = repsOf(ws); let did = false;
    if(reps.length){ solving = true; try{ did = A.commit({ rep: reps }); }finally{ solving = false; } }
    const fn = { op: 'fn', undo: () => { CONS = deep(before); saveCons(); try{ draw(); }catch(_){} }, redo: () => { CONS = deep(after); saveCons(); try{ draw(); }catch(_){} } };
    try{ if(did && editUndoStack.length){ const last = editUndoStack.pop(); pushUndo({ op: 'multi', steps: [last, fn] }); } else pushUndo(fn); }catch(_){}
    saveCons(); try{ draw(); }catch(_){}
    if(msg) log(msg + (r.ok ? '' : ' — không thoả được hết' + (r.err ? ' (' + r.err + ')' : '')));
    return r.ok;
  }
  // đối tượng chưa có mã cid → bản sao có cid (ghi cùng bước hoàn tác)
  function prepFor(ents){ const init = new Map(), orig = new Map(), ids = [];
    for(const e of ents){ if(e.cid){ ids.push(e.cid); continue; } const id = newCid(); const w = copy(e); w.cid = id; init.set(id, w); orig.set(id, e); ids.push(id); }
    return { init, orig, ids }; }
  const cidOf = (prep, e, i) => prep.ids[i];

  /* =====================================================================
     6) LỆNH
     ===================================================================== */
  const nextId = () => 'c' + (++seq);
  const KIND = { hor: 'Ngang', ver: 'Dọc', par: 'Song song', perp: 'Vuông góc', col: 'Thẳng hàng', coin: 'Trùng điểm', eq: 'Bằng nhau', conc: 'Đồng tâm', tan: 'Tiếp xúc', fix: 'Cố định', dist: 'Dài thẳng', dx: 'Ngang', dy: 'Dọc', rad: 'Bán kính', dia: 'Đường kính', ang: 'Góc' };
  const pick = (pr, filter, o) => A.getEnt(pr, Object.assign({ filter: e => okEnt(e) && (!filter || filter(e)) }, o || {}));
  async function addGeo(t, a0, b0){
    const ents = [a0.e].concat(b0 ? [b0.e] : []); const prep = prepFor(ents.filter((e, i, s) => s.indexOf(e) === i));
    const idOf = e => prep.ids[ents.filter((x, i, s) => s.indexOf(x) === i).indexOf(e)];
    const ra = Object.assign({ cid: idOf(a0.e) }, a0.s != null ? { s: a0.s } : {}, a0.k ? { k: a0.k } : {});
    const c = { id: nextId(), t, a: ra };
    if(b0) c.b = Object.assign({ cid: idOf(b0.e) }, b0.s != null ? { s: b0.s } : {}, b0.k ? { k: b0.k } : {});
    if(t === 'fix'){ if(a0.k) c.p = getP(a0.e, a0.k); else c.g = copy(a0.e); }
    return change(L => L.push(c), [ra.cid], 'Đã thêm ràng buộc ' + KIND[t], prep);
  }
  const segPick = async pr => { const r = await pick(pr, hasSeg); return r.ent ? { e: r.ent, s: nearSeg(r.ent, r.pt) } : null; };
  const curvePick = async pr => { const r = await pick(pr, isCurve); return r.ent ? { e: r.ent } : null; };
  const pointPick = async pr => { const r = await pick(pr); if(!r.ent) return null; return { e: r.ent, k: nearKey(r.ent, r.pt).k }; };
  const anyPick = async pr => { const r = await pick(pr, e => hasSeg(e) || isCurve(e)); if(!r.ent) return null; return isCurve(r.ent) ? { e: r.ent } : { e: r.ent, s: nearSeg(r.ent, r.pt) }; };
  const GEO = {
    GCHORIZONTAL: ['hor', 'Ràng buộc ngang', async () => { const a = await segPick('Chọn đoạn thẳng'); if(a) await addGeo('hor', a); }],
    GCVERTICAL: ['ver', 'Ràng buộc dọc', async () => { const a = await segPick('Chọn đoạn thẳng'); if(a) await addGeo('ver', a); }],
    GCPARALLEL: ['par', 'Ràng buộc song song', async () => { const a = await segPick('Chọn đối tượng thứ nhất'); if(!a) return; const b = await segPick('Chọn đối tượng thứ hai'); if(b) await addGeo('par', a, b); }],
    GCPERPENDICULAR: ['perp', 'Ràng buộc vuông góc', async () => { const a = await segPick('Chọn đối tượng thứ nhất'); if(!a) return; const b = await segPick('Chọn đối tượng thứ hai'); if(b) await addGeo('perp', a, b); }],
    GCCOLLINEAR: ['col', 'Ràng buộc thẳng hàng', async () => { const a = await segPick('Chọn đối tượng thứ nhất'); if(!a) return; const b = await segPick('Chọn đối tượng thứ hai'); if(b) await addGeo('col', a, b); }],
    GCCOINCIDENT: ['coin', 'Ràng buộc trùng điểm (bấm gần đầu đoạn hoặc tâm)', async () => { const a = await pointPick('Chọn điểm thứ nhất'); if(!a) return; const b = await pointPick('Chọn điểm thứ hai'); if(!b) return; if(a.e === b.e && a.k === b.k){ log('Hai điểm trùng nhau.'); return; } await addGeo('coin', a, b); }],
    GCEQUAL: ['eq', 'Ràng buộc bằng nhau (đoạn thẳng / bán kính)', async () => { const a = await anyPick('Chọn đối tượng thứ nhất'); if(!a) return; const b = await anyPick('Chọn đối tượng thứ hai'); if(!b) return; if(isCurve(a.e) !== isCurve(b.e)){ log('Chọn hai đoạn thẳng hoặc hai đường tròn / cung.'); return; } await addGeo('eq', a, b); }],
    GCCONCENTRIC: ['conc', 'Ràng buộc đồng tâm', async () => { const a = await curvePick('Chọn đường tròn / cung thứ nhất'); if(!a) return; const b = await curvePick('Chọn đường tròn / cung thứ hai'); if(b) await addGeo('conc', a, b); }],
    GCTANGENT: ['tan', 'Ràng buộc tiếp xúc', async () => { const a = await anyPick('Chọn đối tượng thứ nhất'); if(!a) return; const b = await anyPick('Chọn đối tượng thứ hai'); if(!b) return; if(!isCurve(a.e) && !isCurve(b.e)){ log('Cần ít nhất một đường tròn / cung.'); return; } await addGeo('tan', a, b); }],
    GCFIX: ['fix', 'Ràng buộc cố định (bấm gần một điểm để cố định điểm, chỗ khác = cả đối tượng)', async () => { const r = await pick('Chọn điểm hoặc đối tượng cần cố định'); if(!r.ent) return; const n = nearKey(r.ent, r.pt); await addGeo('fix', n.d <= pxTol() ? { e: r.ent, k: n.k } : { e: r.ent }); }]
  };
  for(const [name, [t, desc, fn]] of Object.entries(GEO)) cmd([name], desc, fn);
  cmd(['GEOMCONSTRAINT', 'GCON'], 'Ràng buộc hình học (chọn loại)', async () => {
    const r = await A.getKw('Nhập loại ràng buộc', { kw: [['H', 'Ngang', 'GCHORIZONTAL'], ['V', 'Dọc', 'GCVERTICAL'], ['PE', 'Vuông góc', 'GCPERPENDICULAR'], ['PA', 'Song song', 'GCPARALLEL'], ['T', 'Tiếp xúc', 'GCTANGENT'], ['CO', 'Trùng điểm', 'GCCOINCIDENT'], ['CON', 'Đồng tâm', 'GCCONCENTRIC'], ['COL', 'Thẳng hàng', 'GCCOLLINEAR'], ['E', 'Bằng nhau', 'GCEQUAL'], ['F', 'Cố định', 'GCFIX']].map(([k, t]) => ({ k, t })), def: 'H' });
    const m = { H: 'GCHORIZONTAL', V: 'GCVERTICAL', PE: 'GCPERPENDICULAR', PA: 'GCPARALLEL', T: 'GCTANGENT', CO: 'GCCOINCIDENT', CON: 'GCCONCENTRIC', COL: 'GCCOLLINEAR', E: 'GCEQUAL', F: 'GCFIX' }[r.kw || (r.none ? 'H' : '')];
    if(m) await GEO[m][2]();
  });

  // ---- ràng buộc kích thước ----
  const PFX = { dist: 'd', dx: 'd', dy: 'd', rad: 'rad', dia: 'dia', ang: 'ang' };
  function newName(t){ const p = PFX[t]; let n = 1; const used = new Set(CONS.filter(isDim).map(c => String(c.name).toLowerCase())); while(used.has(p + n)) n++; return p + n; }
  async function askExpr(name, cur, list){
    for(;;){ const r = await A.getStr('Giá trị ' + name + ' (số hoặc biểu thức, vd ' + (name.startsWith('d') ? 'd1*2' : '30') + ')', { def: fmtV(cur) });
      const s = r.str != null && String(r.str).trim() !== '' ? String(r.str).trim() : (r.none ? fmtV(cur) : null); if(s == null) return null;
      try{ const L = list.concat([{ t: 'dist', name, expr: s }]); const v = values(L).get(name.toLowerCase()); if(!(v >= 0)) throw new Error('Giá trị phải ≥ 0'); return s; }catch(err){ log(err.message); } }
  }
  async function addDim(t){
    let a, b, cur;
    if(t === 'rad' || t === 'dia'){ const r = await curvePick('Chọn cung hoặc đường tròn'); if(!r) return; a = { e: r.e }; cur = t === 'dia' ? r.e.r * 2 : r.e.r; }
    else if(t === 'ang'){ const p = await segPick('Chọn đoạn thẳng thứ nhất'); if(!p) return; const q = await segPick('Chọn đoạn thẳng thứ hai'); if(!q) return; a = p; b = q;
      const [p1, p2] = segPts(p.e, p.s), [q1, q2] = segPts(q.e, q.s); const ang = Math.abs(Math.atan2((p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x), (p2.x - p1.x) * (q2.x - q1.x) + (p2.y - p1.y) * (q2.y - q1.y))) * R2D; cur = ang; }
    else {
      const r = await A.getEnt('Chọn đoạn thẳng hoặc [Hai điểm]', { filter: e => okEnt(e), kw: [{ k: 'P', t: 'Hai điểm' }] });
      if(r.kw === 'P'){ const p = await pointPick('Chọn điểm thứ nhất'); if(!p) return; const q = await pointPick('Chọn điểm thứ hai'); if(!q) return; a = p; b = q; }
      else if(r.ent && hasSeg(r.ent)){ const s = nearSeg(r.ent, r.pt); const [k1, k2] = segKeys(r.ent, s); a = { e: r.ent, k: k1 }; b = { e: r.ent, k: k2 }; }
      else { if(r.ent) log('Chọn đoạn thẳng, hoặc gõ P để chọn hai điểm.'); return; }
      const pa = getP(a.e, a.k), pb = getP(b.e, b.k); cur = t === 'dx' ? Math.abs(pb.x - pa.x) : t === 'dy' ? Math.abs(pb.y - pa.y) : dist(pa, pb);
    }
    const name = newName(t); const expr = await askExpr(name, cur, liveCons()); if(expr == null) return;
    const ents = [a.e].concat(b && b.e !== a.e ? [b.e] : []); const prep = prepFor(ents); const idOf = e => prep.ids[ents.indexOf(e)];
    const ref = x => Object.assign({ cid: idOf(x.e) }, x.s != null ? { s: x.s } : {}, x.k ? { k: x.k } : {});
    const c = { id: nextId(), t, a: ref(a), name, expr }; if(b) c.b = ref(b);
    change(L => L.push(c), [c.a.cid], 'Đã thêm ràng buộc ' + name + ' = ' + expr, prep);
  }
  const DIMS = { DCALIGNED: ['dist', 'Ràng buộc kích thước thẳng (độ dài / khoảng cách 2 điểm)'], DCHORIZONTAL: ['dx', 'Ràng buộc kích thước ngang'], DCVERTICAL: ['dy', 'Ràng buộc kích thước dọc'],
    DCRADIUS: ['rad', 'Ràng buộc bán kính'], DCDIAMETER: ['dia', 'Ràng buộc đường kính'], DCANGULAR: ['ang', 'Ràng buộc góc giữa 2 đoạn thẳng'] };
  for(const [name, [t, desc]] of Object.entries(DIMS)) cmd([name], desc, () => addDim(t));
  cmd(['DCLINEAR'], 'Ràng buộc kích thước ngang / dọc', async () => { const r = await A.getKw('Hướng', { kw: [{ k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }], def: 'H' }); await addDim(r.kw === 'V' ? 'dy' : 'dx'); });
  cmd(['DIMCONSTRAINT', 'DCON'], 'Ràng buộc kích thước (chọn loại)', async () => {
    const r = await A.getKw('Nhập loại ràng buộc', { kw: [{ k: 'A', t: 'Thẳng' }, { k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }, { k: 'AN', t: 'Góc' }, { k: 'R', t: 'Bán kính' }, { k: 'D', t: 'Đường kính' }], def: 'A' });
    const t = { A: 'dist', H: 'dx', V: 'dy', AN: 'ang', R: 'rad', D: 'dia' }[r.kw || (r.none ? 'A' : '')]; if(t) await addDim(t);
  });

  // ---- AUTOCONSTRAIN: trùng điểm + ngang / dọc ----
  cmd(['AUTOCONSTRAIN'], 'Tự thêm ràng buộc trùng điểm và ngang / dọc cho các đối tượng chọn', async () => {
    const s = await A.getSel('Chọn đối tượng', { filter: okEnt }); const sel = A.filterSel(s.sel || []).filter(okEnt); if(!sel.length) return;
    let sz = 0; for(const e of sel) for(const k of keysOf(e)){ const p = getP(e, k); sz = Math.max(sz, Math.abs(p.x), Math.abs(p.y)); }
    const tolD = Math.max(1e-6 * (1 + sz), 1e-9), tolA = 1 * D2R;
    const prep = prepFor(sel); const idOf = e => prep.ids[sel.indexOf(e)];
    const have = (t, a, b) => CONS.some(c => c.t === t && JSON.stringify([c.a, c.b]) === JSON.stringify([a, b]));
    const add = [];
    const pts = []; for(const e of sel) for(const k of keysOf(e)) if(k !== 'c' || isCurve(e)) pts.push({ e, k, p: getP(e, k) });
    const sameEntAdj = (x, y) => x.e === y.e && (x.e.type !== 'POLYLINE' || true);
    const used = new Set();
    for(let i = 0; i < pts.length; i++) for(let j = i + 1; j < pts.length; j++){ const x = pts[i], y = pts[j]; if(sameEntAdj(x, y)) continue; if(x.k === 'c' || y.k === 'c') continue; if(dist(x.p, y.p) > tolD) continue;
      const key = idOf(y.e) + '|' + y.k; if(used.has(key)) continue; used.add(key);
      const a = { cid: idOf(x.e), k: x.k }, b = { cid: idOf(y.e), k: y.k }; if(!have('coin', a, b)) add.push({ id: nextId(), t: 'coin', a, b }); }
    for(const e of sel) if(hasSeg(e)) for(let s2 = 0; s2 < nSeg(e); s2++){ const [p, q] = segPts(e, s2); const ang = Math.atan2(q.y - p.y, q.x - p.x); const a = Math.abs(((ang % Math.PI) + Math.PI) % Math.PI);
      const r = { cid: idOf(e), s: s2 };
      if(Math.min(a, Math.PI - a) <= tolA){ if(!have('hor', r)) add.push({ id: nextId(), t: 'hor', a: r }); }
      else if(Math.abs(a - Math.PI / 2) <= tolA){ if(!have('ver', r)) add.push({ id: nextId(), t: 'ver', a: r }); } }
    if(!add.length){ log('Không tìm thấy ràng buộc nào để thêm.'); return; }
    change(L => L.push(...add), sel.map(idOf), 'AUTOCONSTRAIN: đã thêm ' + add.length + ' ràng buộc', prep);
  });

  // ---- xoá ràng buộc ----
  cmd(['DELCONSTRAINT', 'DELCON'], 'Xoá mọi ràng buộc của các đối tượng chọn', async () => {
    const s = await A.getSel('Chọn đối tượng'); const ids = new Set((s.sel || []).map(e => e.cid).filter(Boolean)); if(!ids.size){ log('Các đối tượng chọn không có ràng buộc.'); return; }
    const n = CONS.filter(c => cidsOf(c).some(id => ids.has(id))).length; if(!n){ log('Các đối tượng chọn không có ràng buộc.'); return; }
    change(L => { for(let i = L.length - 1; i >= 0; i--) if(cidsOf(L[i]).some(id => ids.has(id))) L.splice(i, 1); }, [], 'Đã xoá ' + n + ' ràng buộc');
  });
  plain(['CONSTRAINTBAR', 'CBAR'], 'Hiện / ẩn ký hiệu ràng buộc', () => { BAR = !BAR; try{ localStorage.setItem('dvd:consbar', BAR ? '1' : '0'); }catch(_){} log('Ký hiệu ràng buộc: ' + (BAR ? 'hiện' : 'ẩn')); try{ draw(); }catch(_){} });

  // ---- PARAMETERS — Parameters Manager (như AutoCAD 2027): tham số ràng buộc kích thước + tham số người dùng, sửa tên / biểu thức tại chỗ ----
  let parD = null;
  function paramsMgr(){
    if(!A.hasDoc()){ say('Mở hoặc tạo bản vẽ trước.'); return; }
    if(parD && document.body.contains(parD.root)){ parD.render(); return; }
    const K = A.acw; let sel = null, q = '', openG = { d: 1, u: 1 };
    const html = '<div class="acw" style="width:520px"><div class="lm-tb"><button type="button" id="pmNew" title="Tạo tham số người dùng mới">ƒx＋</button><button type="button" id="pmDel" title="Xoá tham số">✕</button><span class="sp"></span><input id="pmQ" placeholder="Tìm tham số…" style="flex:1"></div>' +
      '<div class="lm-grid" style="height:300px"><table><thead><tr><th style="width:120px">Tên</th><th>Biểu thức</th><th style="width:100px">Giá trị</th></tr></thead><tbody id="pmB"></tbody></table></div><div class="acw-note" id="pmE" style="color:#ff8a80;min-height:16px"></div>' +
      '<div class="acw-note">Biểu thức dùng tên tham số khác, vd <b>d1*2</b>, <b>d1+300</b>, <b>sqrt(d1^2+d2^2)</b>, <b>rong/2</b>.</div></div>';
    const d = A.dialog({ title: 'Quản lý tham số', cls: 'acw-free', help: 'PARAMETERS', html, modeless: true, noOk: true, cancelText: 'Đóng', cancel: () => { parD = null; } });
    const root = d.root, $ = id => root.querySelector('#' + id), err = m => { $('pmE').textContent = m || ''; };
    const okName = n => /^[a-z_][a-z0-9_]*$/i.test(n);
    function render(){ const L = liveCons().filter(isDim), U = userPars(); let V = new Map(); try{ V = values(liveCons()); }catch(e){ err(e.message); }
      const qq = q.trim().toLowerCase(), m = x => !qq || String(x.name).toLowerCase().includes(qq) || String(x.expr).toLowerCase().includes(qq);
      const row = (id, x, kind, unit) => '<tr data-id="' + esc(id) + '" data-kind="' + kind + '"' + (id === sel ? ' class="sel"' : '') + '><td><input class="pn" value="' + esc(x.name) + '" style="width:110px;height:20px;box-sizing:border-box"></td><td><input class="pe" value="' + esc(x.expr) + '" style="width:100%;height:20px;box-sizing:border-box"></td><td translate="no">' + (V.has(String(x.name).toLowerCase()) ? fmtV(V.get(String(x.name).toLowerCase())) + (unit || '') : '—') + '</td></tr>';
      const head = (k, t, n) => '<tr data-g="' + k + '"><td colspan="3" style="background:#343c4a;cursor:pointer"><b>' + (openG[k] ? '▾ ' : '▸ ') + t + '</b> <span style="color:#9aa6ba">(' + n + ')</span></td></tr>';
      $('pmB').innerHTML = head('d', 'Tham số ràng buộc kích thước', L.length) + (openG.d ? L.filter(m).map(c => row(c.id, c, 'd', c.t === 'ang' ? '°' : '')).join('') : '') + head('u', 'Tham số người dùng', U.length) + (openG.u ? U.filter(m).map((u, i) => row('u' + i, u, 'u')).join('') : '');
      $('pmDel').disabled = !sel; }
    d.render = render; parD = d;
    function applyEdit(tr){ const id = tr.dataset.id, kind = tr.dataset.kind, nm = tr.querySelector('.pn').value.trim(), ex = tr.querySelector('.pe').value.trim(); err('');
      if(!okName(nm)){ err('Tên chỉ gồm chữ, số, dấu _ và bắt đầu bằng chữ.'); return; } if(!ex){ err('Biểu thức không được trống.'); return; }
      const dims = liveCons().filter(isDim), U = userPars(); const names = dims.map(c => c.id === id ? nm : c.name).concat(U.map((u, i) => 'u' + i === id ? nm : u.name)).map(x => String(x).toLowerCase());
      if(new Set(names).size !== names.length){ err('Tên tham số bị trùng.'); return; }
      if(kind === 'u'){ const i = +id.slice(1), old = U[i]; if(!old) return; const U2 = U.slice(); U2[i] = { name: nm, expr: ex };
        const prev = JSON.stringify(U); saveUser(U2); try{ const M = liveMap(); const v = values(CONS.filter(c => cidsOf(c).every(x => M.has(x)))); for(const x of v.values()) if(!(x >= 0) && !(x < 0)) throw new Error('Giá trị không hợp lệ'); }catch(e){ saveUser(JSON.parse(prev)); err(e.message); render(); return; }
        // đổi tên tham số người dùng → đổi theo trong biểu thức các ràng buộc
        const ren = old.name !== nm, src = '\\b' + old.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', re = new RegExp(src, 'gi'), reT = new RegExp(src, 'i');
        const seeds = CONS.filter(c => isDim(c) && reT.test(String(c.expr))).flatMap(cidsOf);
        change(Lc => { if(ren) for(const c of Lc) if(isDim(c)) c.expr = String(c.expr).replace(re, nm); }, seeds, 'Tham số người dùng ' + nm + ' = ' + ex); render(); return; }
      const next = deep(CONS); const c = next.find(x => x.id === id); if(!c) return; const oldName = c.name; c.name = nm; c.expr = ex;
      if(oldName !== nm){ const re = new RegExp('\\b' + String(oldName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'); for(const x of next) if(isDim(x) && x !== c) x.expr = String(x.expr).replace(re, nm); }
      try{ const M = liveMap(); const v = values(next.filter(x => cidsOf(x).every(k => M.has(k)))); for(const x of v.values()) if(!(x >= 0)) throw new Error('Giá trị phải ≥ 0'); }catch(e){ err(e.message); render(); return; }
      change(Lc => { Lc.length = 0; Lc.push(...next); }, cidsOf(c), 'Đã đổi tham số ' + nm + ' = ' + ex); render(); }
    $('pmB').addEventListener('change', e => { const tr = e.target.closest('tr[data-id]'); if(tr) applyEdit(tr); });
    $('pmB').addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ const tr = e.target.closest('tr[data-id]'); if(tr){ e.preventDefault(); e.target.blur(); } } }, true);
    $('pmB').addEventListener('click', e => { const g = e.target.closest('tr[data-g]'); if(g){ openG[g.dataset.g] = !openG[g.dataset.g]; render(); return; } const tr = e.target.closest('tr[data-id]'); if(tr && sel !== tr.dataset.id){ sel = tr.dataset.id; root.querySelectorAll('#pmB tr.sel').forEach(x => x.classList.remove('sel')); tr.classList.add('sel'); $('pmDel').disabled = false; } });
    $('pmQ').addEventListener('input', () => { q = $('pmQ').value; render(); }); $('pmQ').addEventListener('keydown', e => e.stopPropagation());
    $('pmNew').onclick = () => { const U = userPars(); const used = new Set(liveCons().filter(isDim).map(c => String(c.name).toLowerCase()).concat(U.map(u => String(u.name).toLowerCase()))); let i = 1; while(used.has('user' + i)) i++; U.push({ name: 'user' + i, expr: '1' }); saveUser(U); openG.u = 1; sel = 'u' + (U.length - 1); render(); };
    $('pmDel').onclick = () => { if(!sel) return; if(sel[0] === 'u' && !CONS.some(c => c.id === sel)){ const U = userPars(), i = +sel.slice(1), u = U[i]; if(!u) return; const re = new RegExp('\\b' + u.name + '\\b', 'i'); if(CONS.some(c => isDim(c) && re.test(String(c.expr)))){ err('Tham số "' + u.name + '" đang được dùng trong biểu thức.'); return; } U.splice(i, 1); saveUser(U); sel = null; render(); return; }
      const c = CONS.find(x => x.id === sel); if(!c) return; change(L => { const k = L.findIndex(x => x.id === sel); if(k >= 0) L.splice(k, 1); }, [], 'Đã xoá ràng buộc ' + c.name); sel = null; render(); };
    render();
  }
  plain(['PARAMETERS', 'PAR'], 'Quản lý tham số (Parameters Manager): tham số ràng buộc kích thước và tham số người dùng, sửa tên / biểu thức', () => paramsMgr());
  { const _c = A.commit; A.commit = function(){ const r = _c.apply(this, arguments); if(parD && !solving) setTimeout(() => { try{ if(parD) parD.render(); }catch(_){} }, 30); return r; }; }

  /* =====================================================================
     7) KÝ HIỆU RÀNG BUỘC (CONSTRAINTBAR) + nhãn ràng buộc kích thước
     ===================================================================== */
  const GLYPH = { hor: '—', ver: '│', par: '∥', perp: '⊥', col: '⋯', eq: '=', conc: '◎', tan: '◠', fix: '🔒' };
  const _draw = window.draw;
  window.draw = function(){
    const r = _draw.apply(this, arguments);
    try{
      if(!BAR || !CONS.length || (typeof _exporting !== 'undefined' && _exporting) || (typeof plotMode !== 'undefined' && plotMode) || (typeof isModelView === 'function' && !isModelView())) return r;
      const M = liveMap(), L = liveCons(M); if(!L.length) return r;
      let V = new Map(); try{ V = values(L); }catch(_){}
      const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '600 11px system-ui,sans-serif'; ctx.textBaseline = 'middle';
      const stack = new Map();
      const badge = (wp, txt, col) => { const P = toScreen(wp.x, wp.y); const key = Math.round(P.x / 6) + ',' + Math.round(P.y / 6); const n = stack.get(key) || 0; stack.set(key, n + 1);
        const w = Math.max(14, ctx.measureText(txt).width + 8), x = P.x + 8 + n * (w + 2), y = P.y - 12;
        ctx.fillStyle = 'rgba(30,36,46,.92)'; ctx.strokeStyle = col || '#5a8fd8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(x, y - 8, w, 16); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e8eef7'; ctx.fillText(txt, x + 4, y); };
      const anchor = rf => { const e = M.get(rf.cid); if(!e) return null; if(rf.k) return getP(e, rf.k); if(rf.s != null && hasSeg(e)){ const [a, b] = segPts(e, rf.s); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } if(isCurve(e)) return { x: e.cx + e.r * 0.7071, y: e.cy + e.r * 0.7071 }; if(hasSeg(e)){ const [a, b] = segPts(e, 0); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } return null; };
      for(const c of L){
        if(c.t === 'coin'){ const p = getP(M.get(c.a.cid), c.a.k); if(!p) continue; const P = toScreen(p.x, p.y); ctx.fillStyle = '#5a8fd8'; ctx.fillRect(P.x - 3, P.y - 3, 6, 6); continue; }
        if(isDim(c)){ const v = V.get(String(c.name).toLowerCase()); const lab = c.name + ' = ' + (v != null ? fmtV(v) : '?') + (c.t === 'ang' ? '°' : '');
          if(c.t === 'dist' || c.t === 'dx' || c.t === 'dy'){ const pa = getP(M.get(c.a.cid), c.a.k), pb = getP(M.get(c.b.cid), c.b.k); if(!pa || !pb) continue; const A1 = toScreen(pa.x, pa.y), B1 = toScreen(pb.x, pb.y);
            ctx.strokeStyle = 'rgba(120,170,255,.8)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y); ctx.stroke(); ctx.setLineDash([]); badge({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, lab, '#3d9ae8'); }
          else { const p = anchor(c.b || c.a); if(p) badge(p, lab, '#3d9ae8'); }
          continue; }
        for(const rf of refs(c)){ const p = anchor(rf); if(p) badge(p, GLYPH[c.t] || '?', c.t === 'fix' ? '#d8a35a' : '#5a8fd8'); }
      }
      ctx.restore();
    }catch(err){ console.warn('constraint bar', err); }
    return r;
  };

  A.onLoad = (prev => function(){ if(prev) prev.apply(this, arguments); loadCons(); })(A.onLoad);
  loadCons();
})();
