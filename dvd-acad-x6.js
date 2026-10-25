/* DVDCAD v4m — bổ sung lệnh AutoCAD còn thiếu
   Vẽ: CIRCLE TTR / TTT, SOLID (2D), SKETCH, HELIX, BREAKLINE, GRADIENT
   Sửa: EXTRIM, COPYM, SPLINEDIT, HATCHEDIT, CHPROP, FLATTEN, BURST, NCOPY
   Chữ: TCOUNT, TEXTMASK, ARCTEXT, TEXTALIGN, FIND & REPLACE, FIELD / UPDATEFIELD, bảng có công thức (=SUM(A1:A3)…)
   Kích thước: DIMSPACE, DIMTEDIT, DIMEDIT, DIMJOGGED, TOLERANCE
   Lớp: LAYCUR, LAYMCH, COPYTOLAYER, LAYWALK, LAYERP, LAYERSTATE
   Khác: WBLOCK, RENAME, ALIASEDIT (đọc acad.pgp), SCRIPT (.scr), AUDIT, DWGPROPS, TIME, PLAN */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x6 || !window.DVDCmd) return; A._x6 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const o = JSON.parse(JSON.stringify(e)); delete o.userAdded; return o; };
  const mk = (type, p) => A.newProps(Object.assign({ type }, p));
  const fmt = v => A.fmt ? A.fmt(v) : String(+(+v).toFixed(4));
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const docName = () => { try{ return currentName || ''; }catch(_){ return ''; } };
  const unlocked = arr => (arr || []).filter(e => !A.isLocked(e));
  const textsOf = arr => unlocked(arr).filter(e => e.type === 'TEXT');
  const repAll = (sel, fn) => sel.map(e => { const w = copy(e); fn(w, e); return [e, w]; });
  const dimText = e => e && (e.dimd ? e : modelEntities.find(m => m.grp && m.grp === e.grp && m.dimd));
  const curveOf = e => { try{ return G.curveOf(e); }catch(_){ return null; } };
  const lenOf = e => { if(e.type === 'LINE') return Math.hypot(e.x2 - e.x1, e.y2 - e.y1); if(e.type === 'CIRCLE') return TAU * e.r; const c = curveOf(e); if(!c) return 0; if(c.len) return c.len; let s = 0; for(const p of c.pieces) s += p.t === 's' ? Math.hypot(p.bx - p.ax, p.by - p.ay) : Math.abs(p.sw) * p.r; return s; };
  const areaOf = e => { if(e.type === 'CIRCLE') return Math.PI * e.r * e.r; if(e.type === 'POLYLINE' && (e.closed || e.vertices.length > 2)) return Math.abs(G.area(e.vertices)); if(e.type === 'HATCH'){ let s = 0; for(const l of e.loops || []) s += G.area(l); return Math.abs(s); } if(e.type === 'ELLIPSE') return Math.PI * Math.hypot(e.mx, e.my) ** 2 * (e.ratio || 1); return 0; };
  // điểm mẫu của một đường cong kín (để kiểm tra trong/ngoài)
  function polyOf(e){
    if(e.type === 'POLYLINE') return e.vertices.map(p => ({ x: p.x, y: p.y }));
    if(e.type === 'CIRCLE'){ const o = []; for(let i = 0; i < 96; i++){ const a = i / 96 * TAU; o.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } return o; }
    const c = curveOf(e); if(!c) return null; const o = [];
    for(const p of c.pieces){ if(p.t === 's') o.push({ x: p.ax, y: p.ay }); else { const n = Math.max(8, Math.ceil(Math.abs(p.sw) / 0.1)); for(let i = 0; i < n; i++){ const a = p.a0 + p.sw * i / n; o.push({ x: p.cx + p.r * Math.cos(a), y: p.cy + p.r * Math.sin(a) }); } } }
    return o;
  }

  /* =====================================================================
     VẼ
     ===================================================================== */
  // ---- CIRCLE Tiếp tuyến–Tiếp tuyến–Bán kính / 3 tiếp tuyến ----
  const tanFilter = e => e.type === 'LINE' || e.type === 'CIRCLE' || e.type === 'ARC' || (e.type === 'POLYLINE' && !e.wq);
  function tanObj(r){ const e = r.ent, p = r.pt || { x: 0, y: 0 };
    if(e.type === 'CIRCLE' || e.type === 'ARC') return { k: 'c', cx: e.cx, cy: e.cy, R: e.r, p };
    if(e.type === 'LINE') return { k: 'l', a: { x: e.x1, y: e.y1 }, b: { x: e.x2, y: e.y2 }, p };
    const c = curveOf(e); let best = null, bd = Infinity; for(const q of c.pieces){ if(q.t !== 's') continue; const n = G.nearOnPiece(q, p); const d = Math.hypot(n.x - p.x, n.y - p.y); if(d < bd){ bd = d; best = q; } }
    return best ? { k: 'l', a: { x: best.ax, y: best.ay }, b: { x: best.bx, y: best.by }, p } : null; }
  function offsets(o, r){   // đường cong tâm cách đối tượng một khoảng r
    if(o.k === 'l'){ const dx = o.b.x - o.a.x, dy = o.b.y - o.a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; return [1, -1].map(s => ({ k: 'l', a: { x: o.a.x + nx * r * s, y: o.a.y + ny * r * s }, d: { x: dx / L, y: dy / L } })); }
    return [o.R + r, Math.abs(o.R - r)].filter(v => v > 1e-12).map(R => ({ k: 'c', cx: o.cx, cy: o.cy, R }));
  }
  function xOff(a, b){
    if(a.k === 'l' && b.k === 'l'){ const d = a.d.x * b.d.y - a.d.y * b.d.x; if(Math.abs(d) < 1e-12) return []; const t = ((b.a.x - a.a.x) * b.d.y - (b.a.y - a.a.y) * b.d.x) / d; return [{ x: a.a.x + a.d.x * t, y: a.a.y + a.d.y * t }]; }
    if(a.k === 'c' && b.k === 'l') return xOff(b, a);
    if(a.k === 'l' && b.k === 'c'){ const fx = a.a.x - b.cx, fy = a.a.y - b.cy; const B = 2 * (fx * a.d.x + fy * a.d.y), C = fx * fx + fy * fy - b.R * b.R; let D = B * B - 4 * C; if(D < -1e-9) return []; D = Math.sqrt(Math.max(0, D)); return [(-B - D) / 2, (-B + D) / 2].map(t => ({ x: a.a.x + a.d.x * t, y: a.a.y + a.d.y * t })); }
    const dx = b.cx - a.cx, dy = b.cy - a.cy, d = Math.hypot(dx, dy); if(d < 1e-12 || d > a.R + b.R + 1e-9 || d < Math.abs(a.R - b.R) - 1e-9) return [];
    const l = (a.R * a.R - b.R * b.R + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a.R * a.R - l * l)), mx = a.cx + dx * l / d, my = a.cy + dy * l / d;
    return [{ x: mx + h * dy / d, y: my - h * dx / d }, { x: mx - h * dy / d, y: my + h * dx / d }];
  }
  const tanPt = (o, c) => { if(o.k === 'l'){ const dx = o.b.x - o.a.x, dy = o.b.y - o.a.y, L2 = dx * dx + dy * dy || 1, t = ((c.x - o.a.x) * dx + (c.y - o.a.y) * dy) / L2; return { x: o.a.x + dx * t, y: o.a.y + dy * t }; } const a = Math.atan2(c.y - o.cy, c.x - o.cx); return { x: o.cx + o.R * Math.cos(a), y: o.cy + o.R * Math.sin(a) }; };
  function circleTTR(o1, o2, r){
    const cands = []; for(const a of offsets(o1, r)) for(const b of offsets(o2, r)) for(const q of xOff(a, b)) cands.push(q);
    let best = null, bs = Infinity; for(const c of cands){ const s = dist(tanPt(o1, c), o1.p) + dist(tanPt(o2, c), o2.p); if(s < bs){ bs = s; best = c; } } return best;
  }
  A.circleTTR = circleTTR;
  // dùng chung cho CIRCLETTR và tuỳ chọn T (Ttr) của CIRCLE
  A.circleTTRFlow = async () => {
    const r1 = await A.getEnt('Chỉ định điểm trên đối tượng tiếp tuyến thứ nhất', { filter: tanFilter }); if(!r1.ent) return;
    const r2 = await A.getEnt('Chỉ định điểm trên đối tượng tiếp tuyến thứ hai', { filter: tanFilter }); if(!r2.ent) return;
    const d = await A.getDist('Bán kính đường tròn', { def: A.MEM.cr || 100 }); const r = d.num != null ? Math.abs(d.num) : (A.MEM.cr || 100); if(!(r > 0)) return; A.MEM.cr = r;
    const o1 = tanObj(r1), o2 = tanObj(r2); const c = o1 && o2 ? circleTTR(o1, o2, r) : null; if(!c){ log('Không có đường tròn nào thoả mãn.'); return; }
    A.commit({ add: [mk('CIRCLE', { cx: c.x, cy: c.y, r })] }, 'Đường tròn TTR r=' + fmt(r));
  };
  cmd(['CIRCLETTR', 'TTR'], 'Đường tròn tiếp xúc 2 đối tượng với bán kính cho trước (Tan, Tan, Radius)', () => A.circleTTRFlow());
  function circleTTT(objs){
    const P = objs.map(o => o.p); const ax = P[0].x, ay = P[0].y, bx = P[1].x, by = P[1].y, cx = P[2].x, cy = P[2].y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); let x = [(ax + bx + cx) / 3, (ay + by + cy) / 3, 1];
    if(Math.abs(d) > 1e-12){ const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d; x = [ux, uy, Math.hypot(ax - ux, ay - uy)]; }
    const sgn = objs.map(o => o.k === 'c' ? (Math.hypot(x[0] - o.cx, x[1] - o.cy) > o.R ? 1 : -1) : 0);
    const res = v => objs.map((o, i) => { if(o.k === 'l'){ const dx = o.b.x - o.a.x, dy = o.b.y - o.a.y, L = Math.hypot(dx, dy) || 1; return Math.abs(((v[0] - o.a.x) * dy - (v[1] - o.a.y) * dx) / L) - v[2]; } const dd = Math.hypot(v[0] - o.cx, v[1] - o.cy); return sgn[i] > 0 ? dd - o.R - v[2] : o.R - dd - v[2]; });
    for(let it = 0; it < 60; it++){ const r0 = res(x); if(Math.max(...r0.map(Math.abs)) < 1e-10 * (1 + Math.abs(x[2]))) break;
      const J = [0, 1, 2].map(j => { const h = Math.max(Math.abs(x[j]) * 1e-7, 1e-7); const xs = x.slice(); xs[j] += h; const r1 = res(xs); return r1.map((v, i) => (v - r0[i]) / h); });
      const M = [0, 1, 2].map(i => [J[0][i], J[1][i], J[2][i]]); const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det(M); if(Math.abs(D) < 1e-18) break; const dx = [0, 1, 2].map(j => { const m = M.map(r => r.slice()); for(let i = 0; i < 3; i++) m[i][j] = -r0[i]; return det(m) / D; });
      x = x.map((v, j) => v + dx[j]); if(!isFinite(x[0])) return null; }
    return x[2] > 0 && Math.max(...res(x).map(Math.abs)) < 1e-6 * (1 + x[2]) ? { x: x[0], y: x[1], r: x[2] } : null;
  }
  cmd(['CIRCLETTT', 'TTT'], 'Đường tròn tiếp xúc 3 đối tượng (Tan, Tan, Tan)', async () => {
    const o = []; for(let i = 1; i <= 3; i++){ const r = await A.getEnt('Chỉ định điểm trên đối tượng tiếp tuyến thứ ' + i, { filter: tanFilter }); if(!r.ent) return; const t = tanObj(r); if(t) o.push(t); }
    const c = o.length === 3 ? circleTTT(o) : null; if(!c){ log('Không tìm được đường tròn tiếp xúc cả 3 đối tượng.'); return; }
    A.commit({ add: [mk('CIRCLE', { cx: c.x, cy: c.y, r: c.r })] }, 'Đường tròn TTT r=' + fmt(c.r));
  });
  // ---- SOLID 2D (tô đặc 3/4 điểm, nối tiếp như AutoCAD) ----
  cmd(['SOLID', 'SO'], 'Tô đặc vùng tam giác / tứ giác (2D solid, nối tiếp)', async () => {
    let a = await A.getPoint('Chỉ định điểm thứ nhất'); if(!a.pt) return; let b = await A.getPoint('Chỉ định điểm thứ hai', { base: a.pt }); if(!b.pt) return;
    let p1 = a.pt, p2 = b.pt; const add = [];
    for(;;){
      const c = await A.getPoint('Chỉ định điểm thứ ba', { base: p2, preview: (g, p) => g.poly([p1, p2, p], true) }); if(!c.pt) break;
      const d = await A.getPoint('Chỉ định điểm thứ tư hoặc <thoát>', { base: c.pt, preview: (g, p) => g.poly([p1, p2, p, c.pt], true) });
      if(!d.pt){ add.push(mk('SOLID', { pts: [p1, p2, c.pt] })); break; }
      add.push(mk('SOLID', { pts: [p1, p2, c.pt, d.pt] })); p1 = c.pt; p2 = d.pt;
    }
    if(add.length) A.commit({ add }, 'SOLID: ' + add.length + ' vùng');
  });
  // ---- SKETCH: vẽ tay ----
  cmd(['SKETCH'], 'Vẽ phác tay: rê chuột để vẽ, bấm để kết thúc nét', async () => {
    for(;;){
      const s = await A.getPoint('Bấm điểm bắt đầu nét phác (Enter để thoát)'); if(!s.pt) return;
      const pts = [s.pt]; const inc = 3 / (view.scale || 1);
      const e = await A.getPoint('Rê chuột để vẽ, bấm để kết thúc nét', { rubber: false, noSnap: true, noOrtho: true, preview: (g, p) => { const l = pts[pts.length - 1]; if(dist(l, p) >= inc) pts.push({ x: p.x, y: p.y }); g.poly(pts, false); } });
      if(e.pt && dist(pts[pts.length - 1], e.pt) > 1e-9) pts.push(e.pt);
      if(pts.length >= 2) A.commit({ add: [mk('POLYLINE', { vertices: pts, closed: false })] }, 'Nét phác ' + pts.length + ' điểm');
    }
  });
  // ---- HELIX (xoắn ốc trên mặt bằng) ----
  cmd(['HELIX', 'SPIRAL'], 'Đường xoắn ốc (tâm, bán kính đầu, bán kính cuối, số vòng)', async () => {
    const c = await A.getPoint('Chỉ định tâm'); if(!c.pt) return;
    const r1 = await A.getDist('Bán kính đầu', { base: c.pt, def: 100 }); const R1 = r1.num != null ? Math.abs(r1.num) : 100;
    const r2 = await A.getDist('Bán kính cuối', { base: c.pt, def: R1 * 3 }); const R2 = r2.num != null ? Math.abs(r2.num) : R1 * 3;
    const t = await A.getNum('Số vòng', { def: 3 }); const T = t.num > 0 ? t.num : 3;
    const k = await A.getKw('Chiều xoắn', { kw: [{ k: 'N', t: 'Ngược chiều kim đồng hồ' }, { k: 'C', t: 'Cùng chiều kim đồng hồ' }], def: 'Ngược chiều kim đồng hồ' }); const dir = k.kw === 'C' ? -1 : 1;
    const n = Math.ceil(T * 72), v = []; for(let i = 0; i <= n; i++){ const f = i / n, a = dir * f * T * TAU, r = R1 + (R2 - R1) * f; v.push({ x: c.pt.x + r * Math.cos(a), y: c.pt.y + r * Math.sin(a) }); }
    A.commit({ add: [mk('POLYLINE', { vertices: v, closed: false })] }, 'Xoắn ốc ' + T + ' vòng');
  });
  // ---- BREAKLINE (ký hiệu đường cắt ngắn) ----
  cmd(['BREAKLINE', 'BRL'], 'Đường cắt ngắn có ký hiệu gãy (Express Tools)', async () => {
    const a = await A.getPoint('Điểm đầu đường cắt ngắn'); if(!a.pt) return;
    const sz0 = A.MEM.brl || 0; const b = await A.getPoint('Điểm cuối', { base: a.pt }); if(!b.pt) return;
    const L = dist(a.pt, b.pt); if(L < 1e-9) return; const ux = (b.pt.x - a.pt.x) / L, uy = (b.pt.y - a.pt.y) / L, nx = -uy, ny = ux;
    const sd = await A.getDist('Kích thước ký hiệu', { def: sz0 > 0 ? sz0 : +(L / 8).toPrecision(3) }); const s = sd.num > 0 ? sd.num : (sz0 > 0 ? sz0 : L / 8); A.MEM.brl = s;
    const m = await A.getPoint('Vị trí ký hiệu <giữa>', { base: a.pt }); let t = L / 2; if(m.pt){ t = Math.max(s, Math.min(L - s, (m.pt.x - a.pt.x) * ux + (m.pt.y - a.pt.y) * uy)); }
    const P = (d, o) => ({ x: a.pt.x + ux * d + nx * o, y: a.pt.y + uy * d + ny * o });
    const v = [P(0, 0), P(t - s * 0.5, 0), P(t - s * 0.2, s * 0.9), P(t + s * 0.2, -s * 0.9), P(t + s * 0.5, 0), P(L, 0)];
    A.commit({ add: [mk('POLYLINE', { vertices: v, closed: false })] }, 'Đường cắt ngắn');
  });
  // ---- GRADIENT (tô chuyển màu) + vẽ ----
  const _dh = window.drawHatch;
  if(typeof _dh === 'function') window.drawHatch = function(e){
    if(!e || !e.grad) return _dh.apply(this, arguments);
    const g = e.grad; ctx.save(); ctx.beginPath(); for(const lp of e.loops || []){ if(!lp || lp.length < 2) continue; const p0 = toScreen(lp[0].x, lp[0].y); ctx.moveTo(p0.x, p0.y); for(let k = 1; k < lp.length; k++){ const p = toScreen(lp[k].x, lp[k].y); ctx.lineTo(p.x, p.y); } ctx.closePath(); }
    const b = entBBox(e); const a = toScreen(b.x0, b.y0), c = toScreen(b.x1, b.y1); const cx = (a.x + c.x) / 2, cy = (a.y + c.y) / 2, R = Math.hypot(c.x - a.x, c.y - a.y) / 2;
    let gr; if(g.kind === 'radial') gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); else { const an = -(g.ang || 0) * D2R; gr = ctx.createLinearGradient(cx - Math.cos(an) * R, cy - Math.sin(an) * R, cx + Math.cos(an) * R, cy + Math.sin(an) * R); }
    const c1 = plotMode && typeof plotColor === 'function' ? plotColor(g.c1) : g.c1, c2 = plotMode && typeof plotColor === 'function' ? plotColor(g.c2) : g.c2;
    gr.addColorStop(0, c1); gr.addColorStop(1, c2); ctx.fillStyle = gr; ctx.globalAlpha = g.op != null ? g.op : 0.85; ctx.fill('evenodd'); ctx.restore();
  };
  async function loopsFrom(prompt){
    const r = await A.getPoint(prompt, { kw: [{ k: 'S', t: 'Chọn đối tượng kín' }] });
    if(r.kw === 'S'){ const s = await A.getSel('Chọn đường kín (đa tuyến kín, tròn, elip)'); return (s.sel || []).map(polyOf).filter(l => l && l.length >= 3); }
    if(!r.pt) return null;
    if(A.findBoundary){ try{ const b = A.findBoundary(r.pt); if(b && b.err){ log(b.err); return null; } const L = b && b.loops; if(L && L.length) return L; }catch(err){ console.warn(err); } }
    log('Không tìm được vùng kín quanh điểm đã bấm.'); return null;
  }
  const GR = { c1: '#1f5fa8', c2: '#bfe0ff', kind: 'linear', ang: 0 };
  try{ Object.assign(GR, JSON.parse(localStorage.getItem('dvd:grad') || '{}')); }catch(_){}
  function gradDialog(init, done){
    const g = Object.assign({}, init);
    A.dialog({ title: 'Tô chuyển màu (Gradient)', html: '<div class="dvd-form">' +
      '<label class="dvd-frow"><span>Màu 1</span><span class="v"><input type="color" id="g1" value="' + g.c1 + '"></span></label><label class="dvd-frow"><span>Màu 2</span><span class="v"><input type="color" id="g2" value="' + g.c2 + '"></span></label>' +
      '<label class="dvd-frow"><span>Kiểu</span><span class="v"><select id="gk"><option value="linear"' + (g.kind !== 'radial' ? ' selected' : '') + '>Tuyến tính</option><option value="radial"' + (g.kind === 'radial' ? ' selected' : '') + '>Toả tròn</option></select></span></label>' +
      '<label class="dvd-frow"><span>Góc (độ)</span><span class="v"><input id="ga" value="' + (g.ang || 0) + '"></span></label><canvas id="gpv" width="300" height="70" style="border:1px solid #556;margin-top:6px"></canvas></div>',
      onOpen: root => { const pv = () => { const c = root.querySelector('#gpv'), x = c.getContext('2d'); const k = root.querySelector('#gk').value, an = -(+root.querySelector('#ga').value || 0) * D2R; const gr = k === 'radial' ? x.createRadialGradient(150, 35, 0, 150, 35, 150) : x.createLinearGradient(150 - Math.cos(an) * 150, 35 - Math.sin(an) * 150, 150 + Math.cos(an) * 150, 35 + Math.sin(an) * 150); gr.addColorStop(0, root.querySelector('#g1').value); gr.addColorStop(1, root.querySelector('#g2').value); x.fillStyle = gr; x.fillRect(0, 0, 300, 70); }; root.addEventListener('input', pv); pv(); },
      ok: root => { g.c1 = root.querySelector('#g1').value; g.c2 = root.querySelector('#g2').value; g.kind = root.querySelector('#gk').value; g.ang = +root.querySelector('#ga').value || 0; done(g); } });
  }
  cmd(['GRADIENT', 'GD'], 'Tô chuyển màu: bấm điểm trong vùng kín (S = chọn đối tượng, T = cài đặt màu)', async () => {
    for(;;){
      const r = await A.getKw('Tô chuyển màu', { kw: [{ k: 'P', t: 'Bấm điểm / chọn vùng' }, { k: 'T', t: 'Cài đặt màu (' + GR.c1 + ' → ' + GR.c2 + ')' }], def: 'Bấm điểm / chọn vùng' });
      if(r.kw === 'T'){ await new Promise(res => gradDialog(GR, g => { Object.assign(GR, g); try{ localStorage.setItem('dvd:grad', JSON.stringify(GR)); }catch(_){} res(); })); continue; }
      break;
    }
    const loops = await loopsFrom('Bấm điểm bên trong vùng kín'); if(!loops || !loops.length) return;
    const e = mk('HATCH', { loops, solid: true, grad: Object.assign({}, GR) }); e.col = GR.c1; delete e.bl;
    A.commit({ add: [e] }, 'Đã tô chuyển màu');
  });

  /* =====================================================================
     SỬA
     ===================================================================== */
  // ---- EXTRIM: cắt mọi đối tượng ở một phía của đường kín ----
  function extrim(bnd, side){
    const poly = polyOf(bnd); const cb = curveOf(bnd); if(!poly || !cb) return 0;
    const bb = entBBox(bnd); const cands = A.queryBox(bb.x0, bb.y0, bb.x1, bb.y1, 50000).filter(e => e !== bnd && !A.isLocked(e) && e.type !== 'TEXT' && e.type !== 'HATCH' && !e.grp);
    const inside = p => G.ptInPoly(p, poly); const rem = side === 'in';
    const rep = [], del = [], add = []; let n = 0;
    for(const e of cands){
      const c = curveOf(e); if(!c || !c.sub) continue;
      const xs = G.xCurves(c, cb).map(q => q.ua).filter(isFinite);
      const period = c.u1 - c.u0, tol = Math.max(Math.abs(period) * 1e-9, 1e-12);
      let us = xs.slice().sort((a, b) => a - b); const uniq = []; for(const u of us) if(!uniq.length || u - uniq[uniq.length - 1] > tol) uniq.push(u);
      if(!uniq.length) continue;
      const keep = [];
      if(c.closed){
        const U = uniq.map(u => ((u - c.u0) % period + period) % period + c.u0).sort((a, b) => a - b);
        for(let i = 0; i < U.length; i++){ const a = U[i], b = i + 1 < U.length ? U[i + 1] : U[0] + period; const m = c.at((a + b) / 2); if(inside(m) !== rem) keep.push([a, b]); }
      } else {
        const U = [c.u0].concat(uniq.filter(u => u > c.u0 + tol && u < c.u1 - tol)).concat([c.u1]);
        for(let i = 0; i < U.length - 1; i++){ const m = c.at((U[i] + U[i + 1]) / 2); if(inside(m) !== rem) keep.push([U[i], U[i + 1]]); }
      }
      const parts = keep.filter(([a, b]) => b - a > tol).map(([a, b]) => { const o = c.sub(a, b); if(c.kind === 'ellipse'){ o.p1 = a; o.p2 = b; } return o; });
      if(parts.length === 1 && c.closed === false && Math.abs(keep[0][0] - c.u0) < tol && Math.abs(keep[0][1] - c.u1) < tol) continue;
      n++; if(!parts.length){ del.push(e); continue; } rep.push([e, parts[0]]); for(const p of parts.slice(1)) add.push(p);
    }
    if(n) A.commit({ rep, del, add }, 'EXTRIM: cắt ' + n + ' đối tượng');
    return n;
  }
  A.extrim = extrim;
  cmd(['EXTRIM'], 'Cắt mọi đối tượng ở một phía của đường kín (Express Tools)', async () => {
    const r = await A.getEnt('Chọn đường cắt (đa tuyến, tròn, elip, cung…)', { filter: e => ['POLYLINE', 'CIRCLE', 'ELLIPSE', 'ARC', 'LINE'].includes(e.type) }); if(!r.ent) return;
    if(!(r.ent.type === 'CIRCLE' || r.ent.closed || (r.ent.type === 'ELLIPSE' && (r.ent.p1 == null || Math.abs((r.ent.p2 || TAU) - (r.ent.p1 || 0) - TAU) < 1e-6)))){ log('EXTRIM cần đường kín.'); return; }
    const p = await A.getPoint('Chỉ định phía cần cắt (bấm bên trong hoặc bên ngoài)'); if(!p.pt) return;
    const n = extrim(r.ent, G.ptInPoly(p.pt, polyOf(r.ent)) ? 'in' : 'out'); if(!n) log('Không có đối tượng nào cắt qua đường đã chọn.');
  });
  // ---- COPYM: sao chép nhiều với Lặp lại / Chia đều / Chia theo khoảng / Mảng ----
  cmd(['COPYM'], 'Sao chép nhiều: lặp lại, chia đều, theo khoảng, mảng (Express Tools)', async () => {
    const s = await A.getSel('Chọn đối tượng cần sao chép'); const sel = s.sel || []; if(!sel.length) return;
    const b = await A.getPoint('Điểm gốc'); if(!b.pt) return; const base = b.pt; let last = null;
    const shift = (dx, dy) => sel.map(e => { const w = copy(e); A.xformEnt(w, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }); delete w.cid; return w; });
    const remapG = arr => { const m = new Map(); for(const w of arr) if(w.grp){ if(!m.has(w.grp)) m.set(w.grp, A.newGroupId('C')); w.grp = m.get(w.grp); } return arr; };
    const place = list => { const add = []; for(const [dx, dy] of list) add.push(...remapG(shift(dx, dy))); if(add.length) A.commit({ add }, 'COPYM: ' + list.length + ' bản'); };
    for(;;){
      const r = await A.getPoint('Điểm thứ hai', { base, kw: [{ k: 'R', t: 'Lặp lại' }, { k: 'D', t: 'Chia đều' }, { k: 'M', t: 'Theo khoảng' }, { k: 'A', t: 'Mảng' }, { k: 'U', t: 'Hoàn tác' }], preview: (g, p) => g.shift(sel, p.x - base.x, p.y - base.y, '#cfe3ff') });
      if(r.none || (!r.pt && !r.kw)) return;
      if(r.kw === 'U'){ undoEdit(); continue; }
      if(r.kw === 'R'){ if(!last){ log('Chưa có lần sao chép trước.'); continue; } place([[last.x * (last.k + 1), last.y * (last.k + 1)]]); last.k++; continue; }
      if(r.kw === 'D' || r.kw === 'M' || r.kw === 'A'){
        const e = await A.getPoint(r.kw === 'A' ? 'Điểm của bản thứ hai (bước mảng)' : 'Điểm cuối', { base }); if(!e.pt) continue; const dx = e.pt.x - base.x, dy = e.pt.y - base.y, L = Math.hypot(dx, dy); if(L < 1e-12) continue;
        if(r.kw === 'D'){ const n = await A.getNum('Số khoảng chia', { def: 4 }); const N = Math.max(1, Math.round(n.num || 4)); const l = []; for(let i = 1; i <= N; i++) l.push([dx * i / N, dy * i / N]); place(l); }
        else if(r.kw === 'M'){ const n = await A.getDist('Khoảng cách giữa các bản', { def: +(L / 4).toPrecision(4) }); const sp = Math.abs(n.num || L / 4); const l = []; for(let d = sp; d <= L + 1e-9; d += sp) l.push([dx * d / L, dy * d / L]); place(l); }
        else { const n = await A.getNum('Số bản (kể cả bản gốc)', { def: 4 }); const N = Math.max(2, Math.round(n.num || 4)); const l = []; for(let i = 1; i < N; i++) l.push([dx * i, dy * i]); place(l); }
        continue;
      }
      if(r.pt){ last = { x: r.pt.x - base.x, y: r.pt.y - base.y, k: 1 }; place([[last.x, last.y]]); }
    }
  });
  // ---- SPLINEDIT ----
  cmd(['SPLINEDIT', 'SPE'], 'Sửa spline: đóng/mở, sửa/thêm/xoá điểm qua, đảo chiều, chuyển thành đa tuyến', async () => {
    const r = await A.getEnt('Chọn spline', { filter: e => e.type === 'POLYLINE' && Array.isArray(e.spl) }); if(!r.ent) return; let e = r.ent;
    const commitW = (w, msg) => { w.vertices = sampleCatmull(w.spl, !!w.closed, 16); delete w.wq; A.commit({ rep: [[e, w]] }, msg); e = w; };
    for(;;){
      const k = await A.getKw('Tuỳ chọn', { kw: [{ k: e.closed ? 'O' : 'C', t: e.closed ? 'Mở' : 'Đóng' }, { k: 'E', t: 'Sửa điểm qua' }, { k: 'A', t: 'Thêm điểm' }, { k: 'D', t: 'Xoá điểm' }, { k: 'R', t: 'Đảo chiều' }, { k: 'P', t: 'Thành đa tuyến' }] });
      if(!k.kw) return;
      if(k.kw === 'C' || k.kw === 'O'){ const w = copy(e); w.closed = k.kw === 'C'; commitW(w, w.closed ? 'Đóng spline' : 'Mở spline'); continue; }
      if(k.kw === 'R'){ const w = copy(e); w.spl = w.spl.slice().reverse(); commitW(w, 'Đảo chiều spline'); continue; }
      if(k.kw === 'P'){ const w = copy(e); delete w.spl; A.commit({ rep: [[e, w]] }, 'Đã chuyển thành đa tuyến'); return; }
      const nearest = p => { let bi = 0, bd = Infinity; e.spl.forEach((q, i) => { const d = dist(q, p); if(d < bd){ bd = d; bi = i; } }); return bi; };
      if(k.kw === 'E'){ for(;;){ const p = await A.getPoint('Bấm gần điểm qua cần sửa (Enter để thôi)'); if(!p.pt) break; const i = nearest(p.pt);
          const q = await A.getPoint('Vị trí mới', { base: e.spl[i], preview: (g, x) => { const f = e.spl.slice(); f[i] = x; g.poly(sampleCatmull(f, !!e.closed, 12), !!e.closed); } }); if(!q.pt) break; const w = copy(e); w.spl[i] = { x: q.pt.x, y: q.pt.y }; commitW(w, 'Sửa điểm qua'); } continue; }
      if(k.kw === 'A'){ const p = await A.getPoint('Bấm vị trí điểm mới'); if(!p.pt) continue; const f = e.spl; let bi = 0, bd = Infinity; const m = e.closed ? f.length : f.length - 1;
        for(let i = 0; i < m; i++){ const a = f[i], b = f[(i + 1) % f.length]; const d = G.nearOnPiece({ t: 's', ax: a.x, ay: a.y, bx: b.x, by: b.y, u0: 0, u1: 1 }, p.pt); const dd = Math.hypot(d.x - p.pt.x, d.y - p.pt.y); if(dd < bd){ bd = dd; bi = i; } }
        let at = bi + 1; if(!e.closed){ if(dist(p.pt, f[0]) < Math.min(bd, dist(p.pt, f[1]))) at = 0; else if(dist(p.pt, f[f.length - 1]) < Math.min(bd, dist(p.pt, f[f.length - 2]))) at = f.length; }
        const w = copy(e); w.spl.splice(at, 0, { x: p.pt.x, y: p.pt.y }); commitW(w, 'Thêm điểm qua'); continue; }
      if(k.kw === 'D'){ if(e.spl.length <= 2){ log('Spline cần ít nhất 2 điểm.'); continue; } const p = await A.getPoint('Bấm gần điểm cần xoá'); if(!p.pt) continue; const w = copy(e); w.spl.splice(nearest(p.pt), 1); commitW(w, 'Xoá điểm qua'); continue; }
    }
  });
  // ---- HATCHEDIT ----
  function hatchEditDialog(list){
    const h0 = list[0]; const PATS = A.PATS || {}; const keys = Object.keys(PATS);
    const isG = !!h0.grad, isS = !isG && !!h0.solid;
    A.dialog({ title: 'Sửa hatch (' + list.length + ')', html: '<div class="dvd-form">' +
      '<label class="dvd-frow"><span>Kiểu</span><span class="v"><select id="hk"><option value="pat"' + (!isG && !isS ? ' selected' : '') + '>Mẫu</option><option value="solid"' + (isS ? ' selected' : '') + '>Tô đặc (SOLID)</option><option value="grad"' + (isG ? ' selected' : '') + '>Chuyển màu (Gradient)</option></select></span></label>' +
      '<label class="dvd-frow"><span>Mẫu</span><span class="v"><select id="hp">' + keys.map(k => '<option value="' + esc(k) + '"' + (k === (h0.pat || 'ANSI31') ? ' selected' : '') + '>' + esc((PATS[k] && PATS[k].name) || k) + '</option>').join('') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Tỉ lệ</span><span class="v"><input id="hs" value="' + (h0.psc || 1) + '"></span></label><label class="dvd-frow"><span>Góc (độ)</span><span class="v"><input id="ha" value="' + (h0.pang || 0) + '"></span></label>' +
      '<label class="dvd-frow"><span>Màu chuyển 1 / 2</span><span class="v"><input type="color" id="g1" value="' + ((h0.grad && h0.grad.c1) || GR.c1) + '"><input type="color" id="g2" value="' + ((h0.grad && h0.grad.c2) || GR.c2) + '"></span></label></div>',
      ok: root => { const k = root.querySelector('#hk').value, pat = root.querySelector('#hp').value, sc = parseFloat(root.querySelector('#hs').value) || 1, an = parseFloat(root.querySelector('#ha').value) || 0;
        const rep = repAll(list, w => { if(k === 'grad'){ w.grad = { c1: root.querySelector('#g1').value, c2: root.querySelector('#g2').value, kind: (w.grad && w.grad.kind) || 'linear', ang: an }; w.solid = true; }
          else { delete w.grad; if(k === 'solid'){ w.solid = true; delete w.pat; } else { w.solid = false; w.pat = pat; w.psc = sc; w.pang = an; } } });
        A.commit({ rep }, 'Đã sửa ' + rep.length + ' hatch'); } });
  }
  cmd(['HATCHEDIT', 'HE'], 'Sửa hatch: mẫu, tỉ lệ, góc, tô đặc, chuyển màu', async () => {
    const s = await A.getSel('Chọn hatch', { filter: e => e.type === 'HATCH' }); const list = unlocked(s.sel).filter(e => e.type === 'HATCH'); if(!list.length){ log('Chưa chọn hatch nào.'); return; }
    hatchEditDialog(list);
  });
  // ---- CHPROP / CHANGE ----
  const ACI = { 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff', 6: '#ff00ff', 7: '#ffffff', 8: '#808080', 9: '#c0c0c0' };
  const CNAME = { RED: 1, DO: 1, YELLOW: 2, VANG: 2, GREEN: 3, XANH: 3, CYAN: 4, BLUE: 5, MAGENTA: 6, TIM: 6, WHITE: 7, TRANG: 7 };
  cmd(['CHPROP', 'CHANGE', '-CH'], 'Đổi thuộc tính qua dòng lệnh: màu, lớp, kiểu nét, tỉ lệ nét, bề rộng nét', async () => {
    const s = await A.getSel('Chọn đối tượng'); let sel = unlocked(s.sel); if(!sel.length) return;
    for(;;){
      const k = await A.getKw('Thuộc tính cần đổi', { kw: [{ k: 'C', t: 'Màu' }, { k: 'LA', t: 'Lớp' }, { k: 'LT', t: 'Kiểu nét' }, { k: 'S', t: 'Tỉ lệ nét' }, { k: 'LW', t: 'Bề rộng nét' }] }); if(!k.kw) return;
      let fn = null, msg = '';
      if(k.kw === 'C'){ const v = await A.getStr('Màu mới (ByLayer, số ACI 1–255, tên hoặc #rrggbb)', { def: 'BYLAYER' }); const t = String(v.str || 'BYLAYER').trim().toUpperCase();
        if(t === 'BYLAYER'){ fn = w => { w.bl = 1; w.col = A.layerHex(w.layer || '0'); }; } else { let hex = /^#[0-9A-F]{6}$/.test(t) ? t.toLowerCase() : ACI[+t] || ACI[CNAME[t]] || null; if(!hex && +t > 0 && +t < 256 && typeof aciHex === 'function') hex = aciHex(+t); if(!hex){ log('Màu không hợp lệ.'); continue; } fn = w => { delete w.bl; w.col = hex; }; } msg = 'Đã đổi màu'; }
      if(k.kw === 'LA'){ const v = await A.getStr('Tên lớp mới', { def: A.LS.cur }); const n = String(v.str || A.LS.cur).trim(); if(!A.layerNames().includes(n)) A.addLayer(n); fn = w => { w.layer = n; if(w.bl) w.col = A.layerHex(n); }; msg = 'Đã chuyển sang lớp ' + n; }
      if(k.kw === 'LT'){ const v = await A.getStr('Kiểu nét (BYLAYER, CONTINUOUS, DASHED, CENTER…)', { def: 'BYLAYER' }); const n = String(v.str || 'BYLAYER').trim().toUpperCase(); if(!/^(BYLAYER|BYBLOCK|CONTINUOUS)$/.test(n)) A.loadLT(n); fn = w => { if(n === 'BYLAYER') delete w.lt; else w.lt = n; }; msg = 'Đã đổi kiểu nét'; }
      if(k.kw === 'S'){ const v = await A.getNum('Tỉ lệ kiểu nét', { def: 1 }); if(!(v.num > 0)) continue; fn = w => { if(v.num === 1) delete w.lts; else w.lts = v.num; }; msg = 'Đã đổi tỉ lệ nét'; }
      if(k.kw === 'LW'){ const v = await A.getStr('Bề rộng nét mm (BYLAYER hoặc vd 0.35)', { def: 'BYLAYER' }); const t = String(v.str || 'BYLAYER').trim().toUpperCase(); fn = w => { if(t === 'BYLAYER') delete w.lw; else w.lw = Math.round(parseFloat(t) * 100) || 0; }; msg = 'Đã đổi bề rộng nét'; }
      if(fn){ const rep = repAll(sel, fn); A.commit({ rep }, msg); sel = rep.map(x => x[1]); }
    }
  });
  // ---- FLATTEN: đưa khối 3D / mặt 3D về nét 2D ----
  cmd(['FLATTEN'], 'Làm phẳng: khối 3D thành nét 2D hình chiếu bằng, bỏ cao độ (Express Tools)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = unlocked(s.sel); if(!sel.length) return;
    const del = [], add = [], rep = [];
    for(const e of sel){
      if(e.type === 'SOLID3D'){ const L = A.planEdges ? A.planEdges(e) : []; for(let i = 0; i + 3 < L.length; i += 4){ const l = { type: 'LINE', x1: L[i], y1: L[i + 1], x2: L[i + 2], y2: L[i + 3], layer: e.layer, col: e.col }; if(e.bl) l.bl = 1; add.push(l); } del.push(e); continue; }
      if(e.type === 'SOLID' && e.face){ const w = copy(e); delete w.face; delete w.zs; rep.push([e, Object.assign(w, { type: 'POLYLINE', vertices: (e.pts.length === 4 ? [e.pts[0], e.pts[1], e.pts[3], e.pts[2]] : e.pts).map(p => ({ x: p.x, y: p.y })), closed: true })]); delete rep[rep.length - 1][1].pts; continue; }
      if(e.z != null || e.elev != null || e.zs){ const w = copy(e); delete w.z; delete w.elev; delete w.zs; rep.push([e, w]); }
    }
    if(!del.length && !rep.length){ log('Các đối tượng đã phẳng.'); return; }
    A.commit({ del, add, rep }, 'FLATTEN: ' + (del.length + rep.length) + ' đối tượng');
  });
  // ---- BURST / NCOPY ----
  cmd(['BURST'], 'Phá khối giữ thuộc tính thành chữ thường (Express Tools)', async () => {
    const s = await A.getSel('Chọn khối', { filter: e => !!e.grp }); const sel = unlocked(s.sel).filter(e => e.grp); if(!sel.length) return;
    const gids = new Set(sel.map(e => e.grp)); const mem = modelEntities.filter(e => gids.has(e.grp));
    const del = mem.filter(e => e.vh); const rep = repAll(mem.filter(e => !e.vh), w => { for(const k of ['grp', 'blk', 'bm', 'bip', 'l0', 'att', 'attp', 'dyn', 'dvs', 'dimd', 'dimv', 'tbld']) delete w[k]; });
    A.commit({ rep, del }, 'BURST: ' + gids.size + ' khối → ' + rep.length + ' đối tượng');
  });
  cmd(['NCOPY'], 'Sao chép đối tượng nằm trong khối / tham chiếu ra ngoài (Express Tools)', async () => {
    const pg0 = A.SET.pickGroup; A.SET.pickGroup = false; let sel;
    try{ const s = await A.getSel('Chọn đối tượng lồng trong khối'); sel = (s.sel || []).slice(); } finally { A.SET.pickGroup = pg0; }
    if(!sel.length) return;
    const b = await A.getPoint('Điểm gốc <tại chỗ>'); let dx = 0, dy = 0;
    if(b.pt){ const t = await A.getPoint('Điểm đích', { base: b.pt, preview: (g, p) => g.shift(sel, p.x - b.pt.x, p.y - b.pt.y, '#cfe3ff') }); if(!t.pt) return; dx = t.pt.x - b.pt.x; dy = t.pt.y - b.pt.y; }
    const add = sel.map(e => { const w = copy(e); for(const k of ['grp', 'blk', 'bm', 'bip', 'l0', 'att', 'attp', 'dyn', 'dvs', 'vh', 'xr', 'cid', 'dimd', 'dimv', 'tbld']) delete w[k]; if(dx || dy) A.xformEnt(w, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }); return w; });
    A.commit({ add }, 'NCOPY: ' + add.length + ' đối tượng');
  });

  /* =====================================================================
     CHỮ
     ===================================================================== */
  cmd(['TCOUNT'], 'Đánh số thứ tự cho các chữ (thay, thêm trước, thêm sau) — Express Tools', async () => {
    const s = await A.getSel('Chọn chữ cần đánh số'); const sel = textsOf(s.sel).filter(e => !e.dimd && !e.tbld); if(!sel.length) return;
    const k = await A.getKw('Sắp xếp theo', { kw: [{ k: 'X', t: 'Toạ độ X' }, { k: 'Y', t: 'Toạ độ Y (trên xuống)' }, { k: 'S', t: 'Thứ tự chọn' }], def: 'Toạ độ X' });
    const ord = sel.slice(); if(k.kw !== 'S'){ if(k.kw === 'Y') ord.sort((a, b) => b.y - a.y || a.x - b.x); else ord.sort((a, b) => a.x - b.x || b.y - a.y); }
    const v = await A.getStr('Số bắt đầu, bước tăng', { def: '1,1' }); const [st, inc] = String(v.str || '1,1').split(/[,;\s]+/).map(Number); const S = isFinite(st) ? st : 1, I = isFinite(inc) ? inc : 1;
    const p = await A.getKw('Đặt số', { kw: [{ k: 'O', t: 'Thay nội dung' }, { k: 'P', t: 'Thêm phía trước' }, { k: 'S', t: 'Thêm phía sau' }, { k: 'F', t: 'Thay ký tự #' }], def: 'Thêm phía trước' }); const m = p.kw || 'P';
    const rep = ord.map((e, i) => { const n = String(+(S + I * i).toFixed(6)); const w = copy(e); const t = String(e.text || '');
      w.text = m === 'O' ? n : m === 'S' ? t + ' ' + n : m === 'F' ? (t.includes('#') ? t.replace('#', n) : t) : n + ' ' + t; return [e, w]; });
    A.commit({ rep }, 'TCOUNT: ' + rep.length + ' chữ');
  });
  function textQuad(e, off){ const ex = textExtent(e), r = (e.rot || 0) * D2R, c = Math.cos(r), s = Math.sin(r);
    return [[ex.xmin - off, ex.ymin - off], [ex.xmax + off, ex.ymin - off], [ex.xmax + off, ex.ymax + off], [ex.xmin - off, ex.ymax + off]].map(([x, y]) => ({ x: e.x + x * c - y * s, y: e.y + x * s + y * c })); }
  cmd(['TEXTMASK'], 'Che nền dưới chữ (tạo vùng che theo khung chữ) — Express Tools', async () => {
    const s = await A.getSel('Chọn chữ'); const sel = textsOf(s.sel); if(!sel.length) return;
    const o = await A.getNum('Khoảng hở (× cao chữ)', { def: A.MEM.tmo || 0.35 }); const f = o.num >= 0 ? o.num : 0.35; A.MEM.tmo = f;
    let mx = 0; for(const e of modelEntities) mx = Math.max(mx, e.dord | 0);
    const add = [], rep = [];
    for(const t of sel){ const w = mk('POLYLINE', { vertices: textQuad(t, f * (t.h || 10)), closed: true, wipe: 1, dord: mx + 1 }); delete w.lt; w.layer = t.layer; w.tmask = 1; add.push(w); const tw = copy(t); tw.dord = mx + 2; rep.push([t, tw]); }
    A.commit({ add, rep }, 'TEXTMASK: ' + sel.length + ' chữ'); log('Bỏ che: xoá vùng che (POLYLINE vùng che nằm dưới chữ) hoặc dùng TEXTUNMASK.');
  });
  cmd(['TEXTUNMASK'], 'Bỏ vùng che dưới chữ đã tạo bằng TEXTMASK', async () => {
    const s = await A.getSel('Chọn chữ'); const sel = textsOf(s.sel); if(!sel.length) return;
    const del = []; for(const t of sel){ const b = entBBox(t); for(const e of modelEntities) if(e.tmask && e.wipe){ const c = entBBox(e); if(c && c.x0 <= b.x0 && c.y0 <= b.y0 && c.x1 >= b.x1 && c.y1 >= b.y1 && !del.includes(e)) del.push(e); } }
    if(del.length) A.commit({ del }, 'Đã bỏ ' + del.length + ' vùng che'); else log('Không có vùng che nào.');
  });
  cmd(['ARCTEXT'], 'Viết chữ uốn theo cung tròn (Express Tools)', async () => {
    const r = await A.getEnt('Chọn cung hoặc đường tròn', { filter: e => e.type === 'ARC' || e.type === 'CIRCLE' }); if(!r.ent) return; const a = r.ent;
    const t = await A.getStr('Nội dung chữ'); const txt = String(t.str || '').trim(); if(!txt) return;
    const hd = await A.getDist('Cao chữ', { def: A.MEM.th || +(a.r / 8).toPrecision(3) }); const h = hd.num > 0 ? hd.num : (A.MEM.th || a.r / 8);
    const k = await A.getKw('Vị trí', { kw: [{ k: 'N', t: 'Phía ngoài (lồi)' }, { k: 'T', t: 'Phía trong (lõm)' }], def: 'Phía ngoài (lồi)' }); const inner = k.kw === 'T';
    const chars = [...txt], cw = h * 0.68, R = inner ? a.r - h * 0.3 : a.r + h * 0.3;
    const mid = a.type === 'ARC' ? (() => { let a1 = a.a1, a2 = a.a2; if(a2 < a1) a2 += 360; return (a1 + a2) / 2 * D2R; })() : (r.pt ? Math.atan2(r.pt.y - a.cy, r.pt.x - a.cx) : Math.PI / 2);
    const tot = chars.length * cw / R; const gid = A.newGroupId('AT'); const add = [];
    chars.forEach((ch, i) => { const f = (i + 0.5) / chars.length - 0.5; const ang = inner ? mid + f * tot : mid - f * tot;
      const rr = inner ? R - h : R; const x = a.cx + rr * Math.cos(ang), y = a.cy + rr * Math.sin(ang); const rot = inner ? ang * R2D + 90 : ang * R2D - 90;
      const e = mk('TEXT', { x, y, h, rot, text: ch, ha: 'center', va: 'alphabetic' }); e.grp = gid; e.blk = '*ARCTEXT'; add.push(e); });
    A.commit({ add }, 'ARCTEXT: ' + chars.length + ' ký tự');
  });
  cmd(['TEXTALIGN', 'TA'], 'Căn thẳng hàng nhiều chữ theo chữ gốc (dọc, ngang hoặc theo 2 điểm)', async () => {
    const s = await A.getSel('Chọn các chữ cần căn'); const sel = textsOf(s.sel).filter(e => !e.dimd); if(sel.length < 2) return;
    const b = await A.getEnt('Chọn chữ gốc', { filter: e => e.type === 'TEXT' }); if(!b.ent) return; const base = b.ent;
    const k = await A.getKw('Hướng căn', { kw: [{ k: 'D', t: 'Dọc' }, { k: 'N', t: 'Ngang' }, { k: 'H', t: 'Theo 2 điểm' }], def: 'Dọc' });
    let u = { x: 0, y: -1 }; if(k.kw === 'N') u = { x: 1, y: 0 }; if(k.kw === 'H'){ const p1 = await A.getPoint('Điểm thứ nhất của hướng'); if(!p1.pt) return; const p2 = await A.getPoint('Điểm thứ hai', { base: p1.pt }); if(!p2.pt) return; const L = dist(p1.pt, p2.pt) || 1; u = { x: (p2.pt.x - p1.pt.x) / L, y: (p2.pt.y - p1.pt.y) / L }; }
    const sp = await A.getKw('Khoảng cách', { kw: [{ k: 'G', t: 'Giữ khoảng hiện tại' }, { k: 'E', t: 'Chia đều' }], def: 'Giữ khoảng hiện tại' });
    const all = sel.includes(base) ? sel : [base].concat(sel); const proj = e => (e.x - base.x) * u.x + (e.y - base.y) * u.y; const ord = all.slice().sort((a, b) => proj(a) - proj(b));
    const t0 = proj(ord[0]), t1 = proj(ord[ord.length - 1]);
    const rep = ord.filter(e => e !== base).map(e => { const i = ord.indexOf(e); const t = sp.kw === 'E' ? t0 + (t1 - t0) * i / (ord.length - 1) : proj(e); const w = copy(e); w.x = base.x + u.x * t; w.y = base.y + u.y * t; w.ha = base.ha; w.va = base.va; return [e, w]; });
    A.commit({ rep }, 'TEXTALIGN: ' + rep.length + ' chữ');
  });
  // ---- Tìm & thay thế ----
  plain(['FINDREPLACE', 'REPLACE', 'THAYCHU'], 'Tìm và thay thế chữ (chữ, thuộc tính khối, kích thước, bảng)', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const selN = selEnts.size;
    A.dialog({ title: 'Tìm và thay thế', wide: true, okText: 'Thay tất cả', html: '<div class="dvd-form"><label class="dvd-frow"><span>Tìm</span><span class="v"><input id="frF"></span></label><label class="dvd-frow"><span>Thay bằng</span><span class="v"><input id="frR"></span></label>' +
      '<label class="dvd-frow"><span>Phạm vi</span><span class="v"><select id="frS"><option value="all">Toàn bản vẽ</option>' + (selN ? '<option value="sel">Đối tượng đang chọn (' + selN + ')</option>' : '') + '</select></span></label>' +
      '<label><input type="checkbox" id="frC"> Phân biệt hoa thường</label> &nbsp; <label><input type="checkbox" id="frW"> Nguyên từ</label> &nbsp; <label><input type="checkbox" id="frT" checked> Cả bảng</label><p id="frN" style="opacity:.8"></p></div>',
      onOpen: root => { const upd = () => { const re = mkRe(root); root.querySelector('#frN').textContent = re ? 'Tìm thấy ' + targets(root).filter(e => re.test(textOf(e))).length + ' đối tượng.' : ''; }; root.addEventListener('input', upd); root.addEventListener('change', upd); setTimeout(() => root.querySelector('#frF').focus(), 50); },
      ok: root => { const re = mkRe(root); if(!re){ say('Nhập chữ cần tìm.'); return false; } const R = root.querySelector('#frR').value; const rep = [];
        for(const e of targets(root)){ if(!re.test(textOf(e))) continue; const w = copy(e);
          if(w.tbld){ w.tbld.cells = w.tbld.cells.map(r => r.map(c => String(c == null ? '' : c).replace(gRe(re), R))); }
          else if(w.dimd){ const t = String(w.text || '').replace(gRe(re), R); w.text = t; w.dimd.ov = t; } else w.text = String(w.text || '').replace(gRe(re), R);
          rep.push([e, w]); }
        if(rep.length) A.commit({ rep }, 'Đã thay ' + rep.length + ' chữ'); else say('Không tìm thấy.'); } });
    function mkRe(root){ const f = root.querySelector('#frF').value; if(!f) return null; const s = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp(root.querySelector('#frW').checked ? '(^|[^\\p{L}\\p{N}_])' + s + '(?=$|[^\\p{L}\\p{N}_])' : s, (root.querySelector('#frC').checked ? '' : 'i') + 'u'); }
    function gRe(re){ return new RegExp(re.source, re.flags + 'g'); }
    function targets(root){ const src = root.querySelector('#frS').value === 'sel' ? [...selEnts] : modelEntities; const tb = root.querySelector('#frT').checked; return unlocked(src).filter(e => e.type === 'TEXT' && (!e.grp || e.att || e.dimd || (tb && e.tbld)) && !(e.tbld && !tb)); }
    function textOf(e){ return e.tbld ? e.tbld.cells.map(r => r.join('\t')).join('\n') : String(e.text || ''); }
  });
  // ---- FIELD (trường tự cập nhật) ----
  const FLD = { date: 'Ngày hiện tại', file: 'Tên bản vẽ', author: 'Người vẽ (DWGPROPS)', title: 'Tiêu đề (DWGPROPS)', area: 'Diện tích đối tượng', len: 'Chiều dài / chu vi đối tượng', count: 'Số đối tượng trong bản vẽ' };
  const propsKey = () => 'dvd:props::' + docName();
  const getProps = () => { try{ return JSON.parse(localStorage.getItem(propsKey()) || '{}'); }catch(_){ return {}; } };
  function fieldValue(f){
    const P = getProps();
    if(f.k === 'date'){ const d = new Date(); const p2 = n => String(n).padStart(2, '0'); return f.fmt === 'long' ? 'ngày ' + d.getDate() + ' tháng ' + (d.getMonth() + 1) + ' năm ' + d.getFullYear() : p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); }
    if(f.k === 'file') return String(docName()).replace(/\.[^.]+$/, '');
    if(f.k === 'author') return P.author || '';
    if(f.k === 'title') return P.title || '';
    if(f.k === 'count') return String(modelEntities.length);
    if(f.k === 'area' || f.k === 'len'){ const o = modelEntities.find(e => e.cid === f.ref); if(!o) return '####'; let v = f.k === 'area' ? areaOf(o) : lenOf(o); const div = f.fmt === 'm2' ? 1e6 : f.fmt === 'm' ? 1e3 : 1; v /= div; const d = f.dec != null ? f.dec : 2; return v.toFixed(d) + (f.fmt === 'm2' ? ' m²' : f.fmt === 'm' ? ' m' : ''); }
    return '';
  }
  const fieldText = f => (f.pre || '') + fieldValue(f) + (f.suf || '');
  A.fieldValue = fieldValue;
  function updateFields(silent){
    const rep = []; for(const e of modelEntities){ if(!e.fld || A.isLocked(e)) continue; const t = fieldText(e.fld); if(t !== e.text){ const w = copy(e); w.text = t; rep.push([e, w]); } }
    if(rep.length) A.commit({ rep }, 'Cập nhật ' + rep.length + ' trường'); else if(!silent) log('Các trường đã cập nhật.');
    return rep.length;
  }
  A.updateFields = updateFields;
  cmd(['FIELD', 'FLD'], 'Chèn trường tự cập nhật: ngày, tên bản vẽ, người vẽ, diện tích / chiều dài đối tượng…', async () => {
    const f = await new Promise(res => A.dialog({ title: 'Chèn trường (Field)', html: '<div class="dvd-form"><label class="dvd-frow"><span>Loại trường</span><span class="v"><select id="fk">' + Object.entries(FLD).map(([k, t]) => '<option value="' + k + '">' + t + '</option>').join('') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Định dạng</span><span class="v"><select id="ff"><option value="">Mặc định</option><option value="long">Ngày dài (ngày … tháng … năm …)</option><option value="m2">Đổi ra m² (bản vẽ mm)</option><option value="m">Đổi ra m (bản vẽ mm)</option></select></span></label>' +
      '<label class="dvd-frow"><span>Số lẻ</span><span class="v"><input id="fd" value="2"></span></label><label class="dvd-frow"><span>Chữ phía trước / sau</span><span class="v"><input id="fp" placeholder="vd S = "><input id="fs"></span></label></div>',
      ok: root => res({ k: root.querySelector('#fk').value, fmt: root.querySelector('#ff').value || undefined, dec: +root.querySelector('#fd').value || 0, pre: root.querySelector('#fp').value, suf: root.querySelector('#fs').value }), cancel: () => res(null) }));
    if(!f) return;
    if(f.k === 'area' || f.k === 'len'){ const r = await A.getEnt('Chọn đối tượng', { filter: e => areaOf(e) > 0 || lenOf(e) > 0 }); if(!r.ent) return; let o = r.ent;
      if(!o.cid){ const w = copy(o); w.cid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); A.commit({ rep: [[o, w]] }); o = w; } f.ref = o.cid; }
    const p = await A.getPoint('Điểm chèn chữ'); if(!p.pt) return;
    const hd = await A.getDist('Cao chữ', { base: p.pt, def: A.MEM.th || 250 }); const h = hd.num > 0 ? hd.num : (A.MEM.th || 250);
    const e = mk('TEXT', { x: p.pt.x, y: p.pt.y, h, rot: 0, text: fieldText(f), fld: f });
    A.commit({ add: [e] }, 'Đã chèn trường ' + FLD[f.k]);
  });
  plain(['UPDATEFIELD', 'UPDFLD'], 'Cập nhật mọi trường (ngày, tên bản vẽ, diện tích…)', () => updateFields(false));
  // nền xám cho trường (như AutoCAD, không in)
  const _draw = window.draw;
  window.draw = function(){ const r = _draw.apply(this, arguments); try{ if(!(typeof _exporting !== 'undefined' && _exporting) && !plotMode && isModelView()){ const L = modelEntities.filter(e => e.fld && !A.isHiddenE(e)); if(L.length && L.length < 3000){ const dpr = window.devicePixelRatio || 1; ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(150,160,175,.22)'; for(const e of L){ const q = textQuad(e, (e.h || 10) * 0.1).map(p => toScreen(p.x, p.y)); ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for(const p of q.slice(1)) ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill(); } ctx.restore(); } } }catch(_){} return r; };
  // ---- Bảng có công thức ----
  const colIdx = s => { let n = 0; for(const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  function evalTable(cells){
    const memo = new Map(), busy = new Set();
    const num = v => { const t = String(v == null ? '' : v).trim().replace(/\s/g, ''); if(!t) return 0; const c = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); const n = parseFloat(c); return isFinite(n) ? n : 0; };
    const val = (r, c) => { const k = r + ':' + c; if(memo.has(k)) return memo.get(k); const raw = cells[r] && cells[r][c]; let v = raw;
      if(typeof raw === 'string' && raw.trim().startsWith('=')){ if(busy.has(k)) return '#REF'; busy.add(k); v = calc(raw.trim().slice(1)); busy.delete(k); }
      memo.set(k, v); return v; };
    const range = (a, b) => { const m1 = /^([A-Z]+)(\d+)$/i.exec(a), m2 = /^([A-Z]+)(\d+)$/i.exec(b); if(!m1 || !m2) return []; const c1 = colIdx(m1[1]), r1 = +m1[2] - 1, c2 = colIdx(m2[1]), r2 = +m2[2] - 1; const o = []; for(let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) for(let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) o.push(num(val(r, c))); return o; };
    function calc(expr){
      try{
        let s = expr.toUpperCase();
        s = s.replace(/\b(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, f, a, b) => { const L = range(a, b); if(f === 'SUM') return '(' + L.reduce((x, y) => x + y, 0) + ')'; if(f === 'AVERAGE' || f === 'AVG') return '(' + (L.length ? L.reduce((x, y) => x + y, 0) / L.length : 0) + ')'; if(f === 'COUNT') return '(' + L.length + ')'; return '(' + (f === 'MIN' ? Math.min(...L) : Math.max(...L)) + ')'; });
        s = s.replace(/\b([A-Z]+)(\d+)\b/g, (m, c, r) => '(' + num(val(+r - 1, colIdx(c))) + ')');
        if(!/^[\d\s.+\-*/()^,%E]+$/.test(s)) return '#ERR';
        const v = A.calc ? A.calc(s.replace(/,/g, '.')) : Function('"use strict";return(' + s.replace(/\^/g, '**') + ')')();
        if(typeof v !== 'number' || !isFinite(v)) return '#ERR'; return String(+v.toFixed(6));
      }catch(_){ return '#ERR'; }
    }
    return cells.map((row, r) => row.map((c, ci) => (typeof c === 'string' && c.trim().startsWith('=')) ? String(val(r, ci)) : c));
  }
  A.evalTable = evalTable;
  const hasF = T => T && T.cells && T.cells.some(r => r.some(c => typeof c === 'string' && c.trim().startsWith('=')));
  if(A.tblRegenFrom){ const _tr = A.tblRegenFrom; A.tblRegenFrom = function(w){ const T = w.tbld; if(!hasF(T)) return _tr.call(this, w); const w2 = Object.assign({}, w, { tbld: Object.assign({}, T, { cells: evalTable(T.cells) }) }); const out = _tr.call(this, w2); if(out && out[0]) out[0].tbld = JSON.parse(JSON.stringify(T)); return out; }; }
  // bảng mới có công thức → dựng lại để hiện kết quả
  const _c0 = A.commit;
  A.commit = function(ch, msg){
    try{ if(ch && ch.add && ch.add.length && A.tblRegenFrom){ const heads = ch.add.filter(e => e && e.tbld && hasF(e.tbld)); for(const h of heads){ const out = A.tblRegenFrom(h); if(out && out.length){ ch.add = ch.add.filter(e => e.grp !== h.grp).concat(out); } } } }catch(err){ console.warn(err); }
    return _c0.apply(this, arguments);
  };

  /* =====================================================================
     KÍCH THƯỚC
     ===================================================================== */
  const isLinDim = e => { const t = dimText(e); return !!(t && t.dimd && t.dimd.k === 'lin'); };
  cmd(['DIMSPACE'], 'Giãn đều khoảng cách giữa các kích thước song song', async () => {
    const b = await A.getEnt('Chọn kích thước gốc', { filter: isLinDim }); if(!b.ent) return; const bt = dimText(b.ent);
    const s = await A.getSel('Chọn các kích thước cần giãn', { filter: isLinDim }); const others = [...new Set(unlocked(s.sel).map(dimText).filter(t => t && t !== bt && t.dimd && t.dimd.k === 'lin'))];
    const phi = bt.dimd.phi * D2R; const par = others.filter(t => Math.abs(Math.sin(t.dimd.phi * D2R - phi)) < 1e-6); if(!par.length){ log('Không có kích thước song song nào.'); return; }
    const th = (bt.dimd.s && bt.dimd.s.txt) || bt.h || 2.5;
    const v = await A.getNum('Khoảng cách (A = tự động)', { def: +(th * 2).toPrecision(4), kw: [{ k: 'A', t: 'Tự động' }] }); const sp = v.kw === 'A' || !(v.num >= 0) ? th * 2 : v.num;
    const n = { x: -Math.sin(phi), y: Math.cos(phi) }; const off = t => (t.dimd.L.x - bt.dimd.L.x) * n.x + (t.dimd.L.y - bt.dimd.L.y) * n.y;
    const pos = par.filter(t => off(t) >= 0).sort((a, b) => off(a) - off(b)), neg = par.filter(t => off(t) < 0).sort((a, b) => off(b) - off(a));
    const rep = []; const put = (t, target) => { const w = copy(t); const d = target - off(t); w.dimd.L = { x: w.dimd.L.x + n.x * d, y: w.dimd.L.y + n.y * d }; rep.push([t, w]); };
    pos.forEach((t, i) => put(t, sp * (i + 1))); neg.forEach((t, i) => put(t, -sp * (i + 1)));
    A.commit({ rep }, 'DIMSPACE: ' + rep.length + ' kích thước');
  });
  cmd(['DIMTEDIT', 'DIMTED'], 'Dời / canh chữ kích thước (trái, phải, giữa, về vị trí gốc)', async () => {
    const r = await A.getEnt('Chọn kích thước', { filter: e => !!dimText(e) }); if(!r.ent) return; const t = dimText(r.ent);
    const k = await A.getPoint('Vị trí mới của chữ', { kw: [{ k: 'L', t: 'Trái' }, { k: 'R', t: 'Phải' }, { k: 'C', t: 'Giữa' }, { k: 'H', t: 'Về gốc' }] }); const w = copy(t); const d = w.dimd;
    if(k.pt) A.dimApplyGrip(d, 'dt', { x: t.x, y: t.y }, k.pt);
    else if(k.kw){ if(d.k !== 'lin'){ if(k.kw === 'H' || k.kw === 'C'){ /* giữ */ } }
      else { const u = { x: Math.cos(d.phi * D2R), y: Math.sin(d.phi * D2R) }; const L = Math.abs((d.p2.x - d.p1.x) * u.x + (d.p2.y - d.p1.y) * u.y); const tw = textExtent(t); const half = Math.max(L / 2 - (tw.xmax - tw.xmin) / 2 - (t.h || 2.5) * 0.5, L * 0.25);
        d.tx = k.kw === 'L' ? -half * Math.sign(((d.p2.x - d.p1.x) * u.x + (d.p2.y - d.p1.y) * u.y) || 1) : k.kw === 'R' ? half * Math.sign(((d.p2.x - d.p1.x) * u.x + (d.p2.y - d.p1.y) * u.y) || 1) : 0; } }
    else return;
    A.commit({ rep: [[t, w]] }, 'Đã dời chữ kích thước');
  });
  cmd(['DIMEDIT', 'DED'], 'Sửa kích thước: chữ mới (<> = số đo), về gốc, khôi phục số đo', async () => {
    const k = await A.getKw('Tuỳ chọn', { kw: [{ k: 'N', t: 'Chữ mới' }, { k: 'H', t: 'Về gốc' }, { k: 'M', t: 'Khôi phục số đo' }], def: 'Về gốc' }); const o = k.kw || 'H';
    let txt = null; if(o === 'N'){ const v = await A.getStr('Nội dung mới (<> là số đo, vd "<> (đã kiểm tra)")', { def: '<>' }); txt = String(v.str == null ? '<>' : v.str); }
    const s = await A.getSel('Chọn kích thước', { filter: e => !!dimText(e) }); const list = [...new Set(unlocked(s.sel).map(dimText).filter(Boolean))]; if(!list.length) return;
    const rep = list.map(t => { const w = copy(t); if(o === 'H'){ w.dimd.tx = 0; if(w.dimd.k !== 'lin'){ /* chữ theo đường kích thước */ } }
      else if(o === 'M') w.dimd.ov = null; else { const meas = A.dimFmt ? A.dimFmt(t.dimv) : String(t.dimv); w.dimd.ov = txt.includes('<>') ? txt.replace(/<>/g, meas) : txt; } return [t, w]; });
    A.commit({ rep }, 'DIMEDIT: ' + rep.length + ' kích thước');
  });
  cmd(['DIMJOGGED', 'DJO', 'JOG'], 'Kích thước bán kính gấp khúc (cho cung có tâm ở xa)', async () => {
    const r = await A.getEnt('Chọn cung hoặc đường tròn', { filter: e => e.type === 'ARC' || e.type === 'CIRCLE' }); if(!r.ent) return; const a = r.ent;
    const cp = await A.getPoint('Vị trí tâm thay thế'); if(!cp.pt) return;
    const lp = await A.getPoint('Vị trí đường kích thước', { base: cp.pt }); if(!lp.pt) return;
    const ang = Math.atan2(lp.pt.y - a.cy, lp.pt.x - a.cx), u = { x: Math.cos(ang), y: Math.sin(ang) };
    const P = { x: a.cx + a.r * u.x, y: a.cy + a.r * u.y }; const th = A.dimTxt ? A.dimTxt() : (A.DS && A.DS.txt) || 2.5;
    const A1 = { x: P.x - u.x * Math.max(a.r * 0.25, th * 4), y: P.y - u.y * Math.max(a.r * 0.25, th * 4) };
    const m = { x: (A1.x + cp.pt.x) / 2, y: (A1.y + cp.pt.y) / 2 }, dv = { x: cp.pt.x - A1.x, y: cp.pt.y - A1.y }, Ld = Math.hypot(dv.x, dv.y) || 1, nn = { x: -dv.y / Ld * th, y: dv.x / Ld * th };
    const J1 = { x: m.x + nn.x - dv.x / Ld * th * 0.6, y: m.y + nn.y - dv.y / Ld * th * 0.6 }, J2 = { x: m.x - nn.x + dv.x / Ld * th * 0.6, y: m.y - nn.y + dv.y / Ld * th * 0.6 };
    const al = th * 1.2, aw = th * 0.35; const tip = P, back = { x: P.x - u.x * al, y: P.y - u.y * al };
    const ents = [{ type: 'POLYLINE', vertices: [P, A1, J1, J2, cp.pt], closed: false }, { type: 'SOLID', pts: [tip, { x: back.x - u.y * aw, y: back.y + u.x * aw }, { x: back.x + u.y * aw, y: back.y - u.x * aw }] }];
    const tx = { x: (P.x + A1.x) / 2 - u.y * th * 0.8, y: (P.y + A1.y) / 2 + u.x * th * 0.8 }; let rot = ang * R2D; if(rot > 90 || rot < -90) rot += 180;
    const val = a.r; ents.push({ type: 'TEXT', x: tx.x, y: tx.y, h: th, rot, text: 'R' + (A.dimFmt ? A.dimFmt(val) : fmt(val)), ha: 'center', va: 'bottom' });
    const out = A.finishDim ? A.finishDim(ents, val, 'gấp khúc') : ents.map(e => A.newProps(e)); A.commit({ add: out }, 'Kích thước bán kính gấp khúc R' + fmt(val));
  });
  // ---- TOLERANCE (khung dung sai hình học GD&T) ----
  const GDT = [['', '(không)'], ['⌖', 'Vị trí'], ['◎', 'Đồng tâm'], ['⌯', 'Đối xứng'], ['∥', 'Song song'], ['⊥', 'Vuông góc'], ['∠', 'Nghiêng'], ['⌭', 'Trụ'], ['⏥', 'Phẳng'], ['○', 'Tròn'], ['⏤', 'Thẳng'], ['⌓', 'Biên dạng mặt'], ['⌒', 'Biên dạng đường'], ['↗', 'Đảo hướng kính'], ['⌰', 'Đảo toàn phần']];
  cmd(['TOLERANCE', 'TOL'], 'Khung dung sai hình học (GD&T)', async () => {
    const T = await new Promise(res => A.dialog({ title: 'Dung sai hình học', html: '<div class="dvd-form"><label class="dvd-frow"><span>Ký hiệu</span><span class="v"><select id="ts">' + GDT.map(([s, n]) => '<option value="' + s + '">' + (s ? s + '  ' : '') + n + '</option>').join('') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Dung sai 1</span><span class="v"><label style="white-space:nowrap"><input type="checkbox" id="td"> Ø</label><input id="t1" placeholder="0.05"><select id="tm"><option value="">-</option><option>Ⓜ</option><option>Ⓛ</option><option>Ⓢ</option></select></span></label>' +
      '<label class="dvd-frow"><span>Dung sai 2</span><span class="v"><input id="t2"></span></label><label class="dvd-frow"><span>Chuẩn 1 / 2 / 3</span><span class="v"><input id="d1" placeholder="A"><input id="d2" placeholder="B"><input id="d3" placeholder="C"></span></label></div>',
      ok: root => res({ s: root.querySelector('#ts').value, t1: (root.querySelector('#td').checked ? 'Ø' : '') + root.querySelector('#t1').value + root.querySelector('#tm').value, t2: root.querySelector('#t2').value, d: ['#d1', '#d2', '#d3'].map(q => root.querySelector(q).value.trim()).filter(Boolean) }), cancel: () => res(null) }));
    if(!T) return;
    const cellsT = [T.s, T.t1, T.t2, ...T.d].filter((x, i) => i === 0 ? !!x : !!x);
    if(!cellsT.length){ log('Chưa nhập nội dung.'); return; }
    const th = A.dimTxt ? A.dimTxt() : 2.5; const H = th * 2;
    const r = await A.getPoint('Điểm đặt khung dung sai', { preview: (g, p) => { let x = p.x; const box = []; for(const c of cellsT){ const w = Math.max(H, [...c].length * th * 0.8 + th); box.push([{ x, y: p.y }, { x: x + w, y: p.y }, { x: x + w, y: p.y - H }, { x, y: p.y - H }]); x += w; } for(const b of box) g.poly(b, true); } }); if(!r.pt) return;
    const gid = A.newGroupId('TOL'); const add = []; let x = r.pt.x;
    for(const c of cellsT){ const w = Math.max(H, [...c].length * th * 0.8 + th); add.push(mk('POLYLINE', { vertices: [{ x, y: r.pt.y }, { x: x + w, y: r.pt.y }, { x: x + w, y: r.pt.y - H }, { x, y: r.pt.y - H }], closed: true })); add.push(mk('TEXT', { x: x + w / 2, y: r.pt.y - H / 2, h: th, rot: 0, text: c, ha: 'center', va: 'middle' })); x += w; }
    for(const e of add){ e.grp = gid; e.blk = '*TOLERANCE'; delete e.lt; }
    A.commit({ add }, 'Khung dung sai');
  });

  /* =====================================================================
     LỚP
     ===================================================================== */
  cmd(['LAYCUR'], 'Chuyển đối tượng chọn sang lớp hiện hành', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = unlocked(s.sel); if(!sel.length) return; const L = A.LS.cur;
    A.commit({ rep: repAll(sel, w => { w.layer = L; if(w.bl) w.col = A.layerHex(L); }) }, sel.length + ' đối tượng → lớp hiện hành ' + L);
  });
  async function pickLayer(prompt){
    const r = await A.getEnt(prompt, { kw: [{ k: 'N', t: 'Nhập tên lớp' }] }); if(r.ent) return r.ent.layer || '0';
    if(r.kw === 'N'){ const v = await A.getStr('Tên lớp', { def: A.LS.cur }); const n = String(v.str || A.LS.cur).trim(); if(!n) return null; if(!A.layerNames().includes(n)){ A.addLayer(n); log('Đã tạo lớp mới "' + n + '".'); } return n; }
    return null;
  }
  cmd(['LAYMCH'], 'Chuyển đối tượng chọn sang lớp của đối tượng đích', async () => {
    const s = await A.getSel('Chọn đối tượng cần đổi lớp'); const sel = unlocked(s.sel); if(!sel.length) return;
    const L = await pickLayer('Chọn đối tượng trên lớp đích'); if(!L) return;
    A.commit({ rep: repAll(sel, w => { w.layer = L; if(w.bl) w.col = A.layerHex(L); }) }, sel.length + ' đối tượng → lớp ' + L);
  });
  cmd(['COPYTOLAYER', 'CPTOLAYER'], 'Sao chép đối tượng sang lớp khác (có thể dời)', async () => {
    const s = await A.getSel('Chọn đối tượng cần sao chép'); const sel = (s.sel || []).slice(); if(!sel.length) return;
    const L = await pickLayer('Chọn đối tượng trên lớp đích'); if(!L) return;
    const b = await A.getPoint('Điểm gốc để dời <không dời>'); let dx = 0, dy = 0; if(b.pt){ const t = await A.getPoint('Điểm đích', { base: b.pt, preview: (g, p) => g.shift(sel, p.x - b.pt.x, p.y - b.pt.y, '#cfe3ff') }); if(t.pt){ dx = t.pt.x - b.pt.x; dy = t.pt.y - b.pt.y; } }
    const gm = new Map(); const add = sel.map(e => { const w = copy(e); w.layer = L; if(w.bl) w.col = A.layerHex(L); delete w.cid; if(w.grp){ if(!gm.has(w.grp)) gm.set(w.grp, A.newGroupId('C')); w.grp = gm.get(w.grp); } if(dx || dy) A.xformEnt(w, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }); return w; });
    A.commit({ add }, 'COPYTOLAYER: ' + add.length + ' đối tượng → lớp ' + L);
  });
  // ---- trạng thái lớp: LAYERP / LAYERSTATE ----
  const LS = A.LS;
  const snap = () => ({ cur: LS.cur, off: [...LS.off], fz: [...LS.frozen], lk: [...LS.locked], hex: Object.assign({}, LS.hex), layLT: Object.assign({}, LS.layLT), layLW: Object.assign({}, LS.layLW) });
  const sameSnap = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let restoring = false, lastSnap = null; const PREV = [];
  function restoreSnap(S){
    restoring = true;
    try{
      for(const [n, h] of Object.entries(S.hex || {})) if(A.layerHex(n) !== h) A.setLayerColor(n, h);
      LS.off = new Set(S.off || []); LS.frozen = new Set(S.fz || []); LS.locked = new Set(S.lk || []);
      hiddenUserLayers.clear(); for(const n of LS.off) hiddenUserLayers.add(n); for(const n of LS.frozen) hiddenUserLayers.add(n);
      for(const [n, v] of Object.entries(S.layLT || {})) if((LS.layLT[n] || 'CONTINUOUS') !== v) A.setLayerLT(n, v);
      for(const [n, v] of Object.entries(S.layLW || {})) if((LS.layLW[n] || 0) !== v) A.setLayerLW(n, v);
      if(S.cur && A.layerNames().includes(S.cur)) LS.cur = S.cur;
      A.lsSave(); try{ invalidateSnap(); forceRedraw(); }catch(_){ try{ draw(); }catch(__){} }
    } finally { restoring = false; lastSnap = snap(); }
  }
  const _lsSave = A.lsSave;
  A.lsSave = function(){ const r = _lsSave.apply(this, arguments); try{ if(!restoring){ const s = snap(); if(lastSnap && !sameSnap(s, lastSnap)){ PREV.push(lastSnap); if(PREV.length > 50) PREV.shift(); } lastSnap = s; } }catch(_){} return r; };
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); PREV.length = 0; lastSnap = snap(); setTimeout(() => { try{ updateFields(true); }catch(_){} }, 50); }; })(A.onLoad);
  setTimeout(() => { lastSnap = snap(); }, 0);
  plain(['LAYERP', 'LAYP'], 'Trả lại thiết lập lớp trước đó (bật/tắt, đóng băng, khoá, màu, lớp hiện hành)', () => {
    const S = PREV.pop(); if(!S){ log('LAYERP: không còn thiết lập lớp nào trước đó.'); return; } restoreSnap(S); log('LAYERP: đã trả lại thiết lập lớp trước.');
  });
  const lasKey = () => 'dvd:las::' + docName();
  const getLAS = () => { try{ return JSON.parse(localStorage.getItem(lasKey()) || '{}'); }catch(_){ return {}; } };
  const setLAS = o => { try{ localStorage.setItem(lasKey(), JSON.stringify(o)); }catch(_){} };
  // mask: chỉ gọi lại các thuộc tính chọn (như "Layer properties to restore" của AutoCAD): on, frz, lock, col, lt, lw, cur
  const mergeSnap = (S, m) => { if(!m) return S; const C = snap(), O = Object.assign({}, C);
    if(m.on) O.off = S.off || []; if(m.frz) O.fz = S.fz || []; if(m.lock) O.lk = S.lk || []; if(m.col) O.hex = Object.assign({}, C.hex, S.hex); if(m.lt) O.layLT = Object.assign({}, C.layLT, S.layLT); if(m.lw) O.layLW = Object.assign({}, C.layLW, S.layLW); if(m.cur && S.cur) O.cur = S.cur; return O; };
  A.layerState = { save: (n, desc) => { const o = getLAS(); const S = snap(); S.desc = desc != null ? desc : ((o[n] && o[n].desc) || ''); S.t = Date.now(); S.layers = A.layerNames(); o[n] = S; setLAS(o); },
    restore: (n, mask) => { const o = getLAS(); if(o[n]){ restoreSnap(mergeSnap(o[n], mask)); return true; } return false; }, list: () => Object.keys(getLAS()), all: () => getLAS(), snap: () => snap(),
    del: n => { const o = getLAS(); delete o[n]; setLAS(o); }, rename: (a, b) => { const o = getLAS(); if(!o[a]) return 'Không thấy trạng thái lớp.'; if(o[b]) return 'Tên đã có.'; o[b] = o[a]; delete o[a]; setLAS(o); return ''; },
    apply: S => restoreSnap(S), setDesc: (n, d) => { const o = getLAS(); if(o[n]){ o[n].desc = d; setLAS(o); } }, put: (n, S) => { const o = getLAS(); o[n] = S; setLAS(o); }, same: n => { const o = getLAS(); if(!o[n]) return false; const a = Object.assign({}, o[n]), b = snap(); delete a.desc; delete a.t; delete a.layers; return sameSnap(a, b); } };
  plain(['LAYERSTATE', 'LAS', 'LMAN'], 'Quản lý trạng thái lớp: lưu / gọi lại tình trạng bật, tắt, khoá, màu của các lớp', () => {
    const render = root => { const o = getLAS(); const n = Object.keys(o); root.querySelector('#lsL').innerHTML = n.length ? n.map(k => '<tr><td>' + esc(k) + '</td><td>' + (o[k].off.length + o[k].fz.length) + ' tắt/đóng băng · ' + o[k].lk.length + ' khoá</td><td><button data-r="' + esc(k) + '">Gọi lại</button> <button data-d="' + esc(k) + '">✕</button></td></tr>').join('') : '<tr><td colspan="3" style="opacity:.7">Chưa lưu trạng thái nào.</td></tr>'; };
    A.dialog({ title: 'Trạng thái lớp (Layer States)', wide: true, noOk: true, cancelText: 'Đóng', html: '<div class="lm-bar"><input id="lsN" placeholder="Tên trạng thái mới (vd In kết cấu)"><button id="lsS">Lưu trạng thái hiện tại</button></div><div class="lm-tbl"><table><thead><tr><th>Tên</th><th>Nội dung</th><th></th></tr></thead><tbody id="lsL"></tbody></table></div>',
      onOpen: root => { render(root); root.querySelector('#lsS').onclick = () => { const n = root.querySelector('#lsN').value.trim(); if(!n){ say('Nhập tên.'); return; } A.layerState.save(n); root.querySelector('#lsN').value = ''; render(root); log('Đã lưu trạng thái lớp "' + n + '".'); };
        root.addEventListener('click', e => { const r = e.target.closest('[data-r]'), d = e.target.closest('[data-d]'); if(r){ A.layerState.restore(r.dataset.r); log('Đã gọi lại trạng thái lớp "' + r.dataset.r + '".'); } if(d){ const o = getLAS(); delete o[d.dataset.d]; localStorage.setItem(lasKey(), JSON.stringify(o)); render(root); } }); } });
  });
  plain(['LAYWALK'], 'Duyệt lớp: chỉ hiện lớp đang chọn trong danh sách (đóng hộp thoại để trả lại)', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const names = A.layerNames(); const S0 = snap(); const cnt = {}; for(const e of modelEntities){ const l = e.layer || '0'; cnt[l] = (cnt[l] || 0) + 1; }
    const show = list => { const keep = new Set(list); hiddenUserLayers.clear(); for(const n of names) if(!keep.has(n)) hiddenUserLayers.add(n); try{ invalidateSnap(); forceRedraw(); }catch(_){ draw(); } };
    const back = () => { hiddenUserLayers.clear(); for(const n of LS.off) hiddenUserLayers.add(n); for(const n of LS.frozen) hiddenUserLayers.add(n); try{ invalidateSnap(); forceRedraw(); }catch(_){ draw(); } };
    A.dialog({ title: 'Duyệt lớp (LAYWALK) — ' + names.length + ' lớp', html: '<p style="margin:0 0 6px;opacity:.8">Bấm chọn lớp (Ctrl/Shift để chọn nhiều). Bản vẽ chỉ hiện các lớp đang chọn.</p><select id="lwL" multiple size="14" style="width:100%">' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + ' (' + (cnt[n] || 0) + ')</option>').join('') + '</select><label style="display:block;margin-top:6px"><input type="checkbox" id="lwK"> Giữ trạng thái này khi đóng</label>',
      okText: 'Đóng', noCancel: true,
      onOpen: root => { const sel = root.querySelector('#lwL'); sel.addEventListener('change', () => { const v = [...sel.selectedOptions].map(o => o.value); if(v.length) show(v); else back(); }); sel.addEventListener('keydown', e => e.stopPropagation()); },
      ok: root => { if(root.querySelector('#lwK').checked){ const v = [...root.querySelector('#lwL').selectedOptions].map(o => o.value); if(v.length){ const S = snap(); S.off = names.filter(n => !v.includes(n) && !S.fz.includes(n)); if(!v.includes(S.cur)) S.cur = v[0]; restoreSnap(S); return; } } back(); },
      cancel: back });
  });

  /* =====================================================================
     KHỐI / FILE
     ===================================================================== */
  cmd(['WBLOCK', 'W'], 'Ghi đối tượng hoặc khối ra file DXF riêng (dùng lại ở bản vẽ khác)', async () => {
    const k = await A.getKw('Nguồn', { kw: [{ k: 'O', t: 'Đối tượng' }, { k: 'B', t: 'Khối' }, { k: 'T', t: 'Toàn bản vẽ' }], def: 'Đối tượng' });
    let ents = [], base = { x: 0, y: 0 }, name = String(docName() || 'banve').replace(/\.[^.]+$/, '') + '_w';
    if(k.kw === 'B'){ const r = await A.getEnt('Chọn khối', { filter: e => !!e.bm }); if(!r.ent) return; const bm = r.ent.bm; ents = modelEntities.filter(e => e.grp === r.ent.grp && !e.vh); const Mi = (() => { const det = bm.a * bm.d - bm.b * bm.c; const a = bm.d / det, b = -bm.b / det, c = -bm.c / det, d = bm.a / det; return { a, b, c, d, e: -(a * bm.e + c * bm.f), f: -(b * bm.e + d * bm.f) }; })(); ents = ents.map(e => A.xformEnt(copy(e), Mi)); name = bm.name; }
    else if(k.kw === 'T'){ ents = modelEntities.filter(e => !e.vh).map(copy); }
    else { const s = await A.getSel('Chọn đối tượng'); if(!(s.sel || []).length) return; const b = await A.getPoint('Điểm gốc (điểm chèn khi dùng lại)'); if(!b.pt) return; base = b.pt; ents = s.sel.map(e => A.xformEnt(copy(e), { a: 1, b: 0, c: 0, d: 1, e: -base.x, f: -base.y })); }
    if(!ents.length) return;
    const nm = await A.getStr('Tên file', { def: name }); const fn = String(nm.str || name).trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\.dxf$/i, '') + '.dxf';
    let dxf; try{ dxf = entitiesToDXF(ents); }catch(err){ say('Không tạo được DXF.'); return; }
    try{ await shareOrDownload(new Blob([dxf], { type: 'application/dxf' }), fn, 'application/dxf'); }catch(_){}
    log('WBLOCK: đã ghi ' + ents.length + ' đối tượng ra ' + fn + ' (gốc 0,0 = điểm gốc đã chọn). Dùng XATTACH hoặc mở file để dùng lại.');
  });
  plain(['RENAME', 'REN'], 'Đổi tên lớp hoặc khối', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const blocks = [...new Set(modelEntities.filter(e => e.bm && e.bm.name).map(e => e.bm.name))].sort();
    const opts = (k) => (k === 'L' ? A.layerNames() : blocks).map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    A.dialog({ title: 'Đổi tên (RENAME)', okText: 'Đổi tên', html: '<div class="dvd-form"><label class="dvd-frow"><span>Loại</span><span class="v"><select id="rnK"><option value="L">Lớp</option><option value="B">Khối</option></select></span></label><label class="dvd-frow"><span>Tên cũ</span><span class="v"><select id="rnO">' + opts('L') + '</select></span></label><label class="dvd-frow"><span>Tên mới</span><span class="v"><input id="rnN"></span></label></div>',
      onOpen: root => { root.querySelector('#rnK').onchange = () => { root.querySelector('#rnO').innerHTML = opts(root.querySelector('#rnK').value); }; root.querySelector('#rnN').addEventListener('keydown', e => e.stopPropagation()); },
      ok: root => { const k = root.querySelector('#rnK').value, o = root.querySelector('#rnO').value, n = root.querySelector('#rnN').value.trim().replace(/[<>\/\\":;?*|=`]/g, '_'); if(!o || !n || o === n){ say('Nhập tên mới khác tên cũ.'); return false; }
        if(k === 'L' ? !renameLayer(o, n) : !renameBlock(o, n)) return false; } });
  });
  A.renameLayer = (o, n) => renameLayer(o, n);
  function renameLayer(o, n){
    if(o === '0'){ say('Không đổi tên được lớp 0.'); return false; } if(A.layerNames().includes(n)){ say('Đã có lớp "' + n + '".'); return false; }
    const rep = []; for(const e of modelEntities) if((e.layer || '0') === o) rep.push([e, Object.assign(copy(e), { layer: n })]);
    try{ for(const L of layerList) if(L.name === o) L.name = n; }catch(_){}
    const mv = (set) => { if(set.has(o)){ set.delete(o); set.add(n); } }; mv(LS.off); mv(LS.frozen); mv(LS.locked); mv(LS.extra); LS.extra.add(n);
    for(const m of [LS.hex, LS.orig, LS.layLT, LS.layLW]) if(o in m){ m[n] = m[o]; delete m[o]; }
    try{ if(LAYER_LT[o] != null){ LAYER_LT[n] = LAYER_LT[o]; delete LAYER_LT[o]; } if(LAYER_LW[o] != null){ LAYER_LW[n] = LAYER_LW[o]; delete LAYER_LW[o]; } }catch(_){}
    if(LS.cur === o) LS.cur = n; hiddenUserLayers.clear(); for(const x of LS.off) hiddenUserLayers.add(x); for(const x of LS.frozen) hiddenUserLayers.add(x);
    if(rep.length) A.commit({ rep }, 'Đổi tên lớp ' + o + ' → ' + n); A.lsSave(); log('Đã đổi tên lớp "' + o + '" thành "' + n + '" (' + rep.length + ' đối tượng).'); return true;
  }
  function renameBlock(o, n){
    const rep = []; for(const e of modelEntities) if(e.bm && e.bm.name === o){ const w = copy(e); w.bm.name = n; if(w.blk === o) w.blk = n; rep.push([e, w]); }
    if(!rep.length) return false; A.commit({ rep }, 'Đổi tên khối ' + o + ' → ' + n);
    try{ const D = A.dynDefs && A.dynDefs(); if(D && D[o]){ D[n] = D[o]; delete D[o]; localStorage.setItem('dvd:dynblk', JSON.stringify(D)); } }catch(_){}
    log('Đã đổi tên khối "' + o + '" thành "' + n + '".'); return true;
  }

  /* =====================================================================
     TIỆN ÍCH
     ===================================================================== */
  // ---- ALIASEDIT: lệnh tắt tự đặt + đọc acad.pgp ----
  const AK = 'dvd:alias';
  const getAL = () => { try{ return JSON.parse(localStorage.getItem(AK) || '{}') || {}; }catch(_){ return {}; } };
  function applyAlias(al, cmdName){
    al = String(al).trim().toUpperCase(); cmdName = String(cmdName).trim().toUpperCase().replace(/^[*_.'-]+/, ''); if(!al || !cmdName) return false;
    const c = DVDCmd.commands.find(x => x.k.includes(cmdName)); if(!c) return false; if(c.k.includes(al)) return true;
    const extra = {}; for(const k in c) if(!['k', 'd', 'run'].includes(k)) extra[k] = c[k];
    DVDCmd.register(c.k.concat([al]), c.d, c.run, extra); return true;
  }
  A.applyAlias = applyAlias;
  function applyAll(){ const o = getAL(); let n = 0; for(const [a, c] of Object.entries(o)) if(applyAlias(a, c)) n++; return n; }
  function parsePGP(text){ const o = {}; for(const line of String(text).split(/\r?\n/)){ const t = line.replace(/;.*$/, '').trim(); const m = /^([^,\s]+)\s*,\s*\*\s*([A-Za-z0-9_\-.]+)/.exec(t); if(m) o[m[1].toUpperCase()] = m[2].toUpperCase(); } return o; }
  A.parsePGP = parsePGP;
  plain(['ALIASEDIT', 'ALIAS', 'PGP'], 'Đặt lệnh tắt riêng (như acad.pgp) — nhập file acad.pgp của bạn', () => {
    const render = root => { const o = getAL(); const ks = Object.keys(o).sort(); root.querySelector('#alL').innerHTML = ks.length ? ks.map(a => { const ok = DVDCmd.commands.some(c => c.k.includes(o[a])); return '<tr><td><b>' + esc(a) + '</b></td><td' + (ok ? '' : ' style="color:#ff8a80"') + '>' + esc(o[a]) + (ok ? '' : ' (chưa có lệnh)') + '</td><td><button data-x="' + esc(a) + '">✕</button></td></tr>'; }).join('') : '<tr><td colspan="3" style="opacity:.7">Chưa có lệnh tắt riêng.</td></tr>'; };
    A.dialog({ title: 'Lệnh tắt (ALIASEDIT)', wide: true, noOk: true, cancelText: 'Đóng', html: '<div class="lm-bar"><input id="alA" placeholder="Lệnh tắt (vd CC)" style="max-width:120px"><input id="alC" placeholder="Lệnh (vd COPY)"><button id="alAdd">Thêm</button><label class="btn-ghost" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:6px 10px;border:1px solid var(--line);border-radius:6px">Nhập acad.pgp<input type="file" id="alF" accept=".pgp,.txt" style="display:none"></label></div><div class="lm-tbl"><table><thead><tr><th>Tên tắt</th><th>Lệnh</th><th></th></tr></thead><tbody id="alL"></tbody></table></div><p style="opacity:.75;font-size:12px">Lệnh tắt lưu trên máy này, áp dụng cho mọi bản vẽ. Dòng trong acad.pgp có dạng <code>CC, *COPY</code>.</p>',
      onOpen: root => { render(root); root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
        root.querySelector('#alAdd').onclick = () => { const a = root.querySelector('#alA').value.trim().toUpperCase(), c = root.querySelector('#alC').value.trim().toUpperCase(); if(!a || !c) return; if(!applyAlias(a, c)){ say('Không có lệnh "' + c + '".'); return; } const o = getAL(); o[a] = c; localStorage.setItem(AK, JSON.stringify(o)); root.querySelector('#alA').value = ''; root.querySelector('#alC').value = ''; render(root); };
        root.querySelector('#alF').onchange = ev => { const f = ev.target.files[0]; if(!f) return; f.text().then(t => { const P = parsePGP(t); const o = getAL(); let ok = 0, miss = 0; for(const [a, c] of Object.entries(P)){ if(DVDCmd.commands.some(x => x.k.includes(c))){ o[a] = c; ok++; } else miss++; } localStorage.setItem(AK, JSON.stringify(o)); applyAll(); render(root); say('Đã nhập ' + ok + ' lệnh tắt' + (miss ? ' (' + miss + ' lệnh DVDCAD chưa có)' : '') + '.'); }); };
        root.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if(!x) return; const o = getAL(); delete o[x.dataset.x]; localStorage.setItem(AK, JSON.stringify(o)); render(root); say('Bỏ lệnh tắt có hiệu lực sau khi tải lại trang.'); }); } });
  });
  setTimeout(applyAll, 0); setTimeout(applyAll, 1500);
  // ---- SCRIPT (.scr) ----
  const SCR_CL = new Set(['COLOR', 'COL', 'INSERT', 'I', 'BLOCK', 'B', 'PURGE', 'PU']);
  async function runScript(text, label){
    const lines = String(text).replace(/\r/g, '').split('\n'); const toks = [];
    for(const ln of lines){ if(/^\s*;/.test(ln)) continue; const parts = ln.split(' '); for(const p of parts) toks.push(p); }
    while(toks.length && toks[toks.length - 1] === '') toks.pop();
    const wait = ms => new Promise(r => setTimeout(r, ms)); let n = 0;
    for(const t of toks){
      if(!A.busy()){ if(t === '') continue; const u = t.toUpperCase().replace(/^[_.]+/, ''); DVDCmd.run(SCR_CL.has(u) ? '-' + u : t); n++; }   // lệnh nay mở hộp thoại: script chạy bản dòng lệnh như trước
      else A.input(t);
      await wait(25);
    }
    if(A.busy()) A.input(''); log('SCRIPT' + (label ? ' ' + label : '') + ': đã chạy ' + n + ' lệnh.');
    return n;
  }
  A.runScript = runScript;
  plain(['SCRIPT', 'SCR'], 'Chạy file script AutoCAD (.scr): chuỗi lệnh tự động', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.scr,.txt';
    inp.onchange = () => { const f = inp.files[0]; if(f) f.text().then(t => runScript(t, f.name)); }; inp.click();
  });
  // ---- AUDIT ----
  cmd(['AUDIT'], 'Kiểm tra lỗi bản vẽ (toạ độ hỏng, đối tượng rỗng, lớp thiếu) và sửa', async () => {
    const bad = [], zero = [], noLay = new Set(); const names = new Set(A.layerNames());
    const fin = v => typeof v !== 'number' || isFinite(v);
    for(const e of modelEntities){
      const b = entBBox(e); const nums = Object.values(e).filter(v => typeof v === 'number'); if(!nums.every(fin) || (b && ![b.x0, b.y0, b.x1, b.y1].every(isFinite))){ bad.push(e); continue; }
      if(e.type === 'LINE' && Math.hypot(e.x2 - e.x1, e.y2 - e.y1) < 1e-12) zero.push(e);
      else if(e.type === 'POLYLINE' && (!e.vertices || e.vertices.length < 2)) zero.push(e);
      else if(e.type === 'TEXT' && !String(e.text || '').trim() && !e.att && !e.attdef) zero.push(e);
      else if((e.type === 'CIRCLE' || e.type === 'ARC') && !(e.r > 0)) zero.push(e);
      if(!names.has(e.layer || '0')) noLay.add(e.layer || '0');
    }
    const total = bad.length + zero.length + noLay.size;
    log('AUDIT: ' + modelEntities.length + ' đối tượng · ' + bad.length + ' toạ độ hỏng · ' + zero.length + ' đối tượng rỗng/độ dài 0 · ' + noLay.size + ' lớp thiếu.');
    if(!total){ say('Không phát hiện lỗi.'); return; }
    const k = await A.getKw('Sửa lỗi phát hiện được?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Có' }); if(k.kw === 'K') return;
    for(const n of noLay) A.addLayer(n);
    const del = bad.concat(zero).filter(e => !A.isLocked(e)); if(del.length) A.commit({ del }, 'AUDIT: đã xoá ' + del.length + ' đối tượng lỗi');
    log('AUDIT: đã sửa ' + (del.length + noLay.size) + ' lỗi.');
  });
  // ---- DWGPROPS / TIME ----
  const timeKey = () => 'dvd:time::' + docName();
  const getTime = () => { try{ return JSON.parse(localStorage.getItem(timeKey()) || 'null'); }catch(_){ return null; } };
  let sessStart = Date.now();
  function touchTime(){ if(!docName()) return; const t = getTime() || { created: Date.now(), total: 0 }; t.opened = t.opened || Date.now(); localStorage.setItem(timeKey(), JSON.stringify(t)); }
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); try{ const t = getTime(); if(t){ t.total = (t.total || 0); localStorage.setItem(timeKey(), JSON.stringify(t)); } sessStart = Date.now(); touchTime(); }catch(_){} }; })(A.onLoad);
  setInterval(() => { try{ if(!docName()) return; const t = getTime() || { created: Date.now(), total: 0 }; t.total = (t.total || 0) + 60000; t.edited = Date.now(); localStorage.setItem(timeKey(), JSON.stringify(t)); }catch(_){} }, 60000);
  const fmtDT = ms => ms ? new Date(ms).toLocaleString('vi-VN') : '—';
  const fmtDur = ms => { const m = Math.round((ms || 0) / 60000); return Math.floor(m / 60) + ' giờ ' + (m % 60) + ' phút'; };
  plain(['TIME'], 'Thời gian: tạo bản vẽ, sửa lần cuối, tổng thời gian sửa', () => {
    const t = getTime() || {}; log('TIME: hiện tại ' + fmtDT(Date.now()) + ' · tạo/mở lần đầu ' + fmtDT(t.created) + ' · sửa gần nhất ' + fmtDT(t.edited) + ' · tổng thời gian ' + fmtDur(t.total) + ' · phiên này ' + fmtDur(Date.now() - sessStart));
  });
  plain(['DWGPROPS', 'THONGTIN'], 'Thông tin bản vẽ: tiêu đề, người vẽ, từ khoá, ghi chú, thống kê', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const P = getProps(); const t = getTime() || {}; const by = {}; for(const e of modelEntities) by[e.type] = (by[e.type] || 0) + 1; const b = (typeof bounds !== 'undefined' && bounds) || null;
    const row = (k, l) => '<label class="dvd-frow"><span>' + l + '</span><span class="v"><input data-k="' + k + '" value="' + esc(P[k] || '') + '"></span></label>';
    A.dialog({ title: 'Thông tin bản vẽ — ' + esc(docName()), wide: true, html: '<div class="dvd-form">' + row('title', 'Tiêu đề') + row('subject', 'Chủ đề / công trình') + row('author', 'Người vẽ') + row('checker', 'Người kiểm') + row('keywords', 'Từ khoá') + row('comments', 'Ghi chú') +
      '<div class="dvd-sub">Thống kê</div><p style="margin:0;line-height:1.6;font-size:12.5px">' + modelEntities.length + ' đối tượng · ' + A.layerNames().length + ' lớp · ' + Object.entries(by).map(([k, v]) => k + ' ' + v).join(', ') + '<br>Phạm vi: ' + (b ? fmt(b.maxX - b.minX) + ' × ' + fmt(b.maxY - b.minY) : '—') + '<br>Tạo / mở lần đầu: ' + fmtDT(t.created) + ' · Sửa gần nhất: ' + fmtDT(t.edited) + ' · Tổng thời gian sửa: ' + fmtDur(t.total) + '</p></div>',
      onOpen: root => root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation())),
      ok: root => { const o = {}; root.querySelectorAll('[data-k]').forEach(i => o[i.dataset.k] = i.value); localStorage.setItem(propsKey(), JSON.stringify(o)); updateFields(true); log('Đã lưu thông tin bản vẽ.'); } });
  });
  plain(['PLAN'], 'Về mặt bằng: hướng gốc, phóng vừa bản vẽ', () => { try{ if(typeof setRotation === 'function') setRotation(0); else view.rot = 0; }catch(_){} try{ A.pushView && A.pushView(); fitView(); }catch(_){ try{ DVDCmd.run('ZE'); }catch(__){} } });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
