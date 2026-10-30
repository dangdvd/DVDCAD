/* DVDCAD v5v — Hình chiếu từ mô hình 3D như AutoCAD (Model Documentation)
   · VIEWBASE: hình chiếu cơ sở (hướng Trước / Sau / Trái / Phải / Trên / Dưới / 4 hướng ISO, tỉ lệ, nét khuất) rồi đặt luôn các hình chiếu phụ
   · VIEWPROJ: hình chiếu phụ từ một hình chiếu có sẵn — đặt sang phải / trái / trên / dưới theo góc chiếu 1 (TCVN, ISO) hoặc 3, chéo = ISO
   · VIEWSECTION: mặt cắt toàn phần / nửa / bậc / xoay trên hình chiếu cha — đường cắt + mũi tên + chữ, mặt cắt gạch ANSI31, nhãn "MẶT CẮT A-A"
   · VIEWDETAIL: hình trích (tròn / chữ nhật) phóng to một vùng của hình chiếu cha, nhãn "HÌNH TRÍCH B  TỈ LỆ 2 : 1"
   · VIEWEDIT (tỉ lệ, nét khuất, nhãn) · VIEWUPDATE (dựng lại theo mô hình đã sửa, giữ chỗ đã dời) · VIEWSTD · VIEWSECTIONSTYLE · VIEWDETAILSTYLE
   Lớp MD_Visible / MD_Hidden / MD_Annotation / MD_Hatch như AutoCAD. Thông số hình chiếu lưu kèm bản vẽ (DXF / DWG). */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x19 || !A.dialog || !A.acw || !window.DVDCmd) return; A._x19 = true;
  const K = A.acw;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };

  /* ---- vectơ 3D ---- */
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const unit = a => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
  const orth = (u, d) => { const v = sub(u, mul(d, dot(u, d))); const L = Math.hypot(v[0], v[1], v[2]); return L < 1e-9 ? null : mul(v, 1 / L); };
  const Z = [0, 0, 1];
  const isoUp = d => orth(Z, d) || orth([0, 1, 0], d);
  const ORI = { front: { d: [0, -1, 0], u: Z, t: 'Trước' }, back: { d: [0, 1, 0], u: Z, t: 'Sau' }, left: { d: [-1, 0, 0], u: Z, t: 'Trái' }, right: { d: [1, 0, 0], u: Z, t: 'Phải' },
    top: { d: [0, 0, 1], u: [0, 1, 0], t: 'Trên' }, bottom: { d: [0, 0, -1], u: [0, -1, 0], t: 'Dưới' },
    sw: { d: unit([-1, -1, 1]), t: 'ISO Tây Nam' }, se: { d: unit([1, -1, 1]), t: 'ISO Đông Nam' }, ne: { d: unit([1, 1, 1]), t: 'ISO Đông Bắc' }, nw: { d: unit([-1, 1, 1]), t: 'ISO Tây Bắc' } };
  for(const k of ['sw', 'se', 'ne', 'nw']) ORI[k].u = isoUp(ORI[k].d);
  const isOrtho = d => Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])) > 0.9999;
  // hướng lên của hình chiếu: nhìn ngang thì trục Z luôn hướng lên (như các hướng chuẩn Trước / Sau / Trái / Phải của AutoCAD)
  const upFor = (d, fb) => Math.abs(d[2]) < 0.99 ? orth(Z, d) : (orth(fb, d) || orth([0, 1, 0], d));
  // hình chiếu con thẳng hàng với cha theo trục chung: ngang = cùng trục đứng, dọc = cùng trục ngang
  const alignKind = (par, d, u, kind) => { const r = unit(cross(u, d)); if(kind === 'h' && dot(u, par.u) > 0.9999) return 'h'; if(kind === 'v' && dot(r, par.r) > 0.9999) return 'v'; return null; };

  /* ---- tiêu chuẩn + kiểu nhãn ---- */
  const STD_K = 'dvd:viewstd', SST_K = 'dvd:viewsecstyle', DST_K = 'dvd:viewdetstyle';
  const STD = Object.assign({ proj: 1, hid: 0, sc: 1 }, lsGet(STD_K, {}));
  const SST = Object.assign({ th: 5, lth: 5, lab: 'MẶT CẮT', pat: 'ANSI31', psc: 1, arr: 5, showSc: 1 }, lsGet(SST_K, {}));
  const DST = Object.assign({ th: 5, lth: 5, lab: 'HÌNH TRÍCH', f: 2, showSc: 1, shape: 'C' }, lsGet(DST_K, {}));
  const LAY = { vis: 'MD_Visible', hid: 'MD_Hidden', ann: 'MD_Annotation', hat: 'MD_Hatch' };
  function ensureLayers(){
    const ex = new Set(A.layerNames());
    if(!ex.has(LAY.vis)){ A.addLayer(LAY.vis, '#ffffff'); A.setLayerLW(LAY.vis, 50); }
    if(!ex.has(LAY.hid)){ A.addLayer(LAY.hid, '#ffffff'); A.setLayerLT(LAY.hid, 'HIDDEN'); A.setLayerLW(LAY.hid, 25); }
    if(!ex.has(LAY.ann)){ A.addLayer(LAY.ann, '#ffffff'); A.setLayerLW(LAY.ann, 25); }
    if(!ex.has(LAY.hat)){ A.addLayer(LAY.hat, '#ffffff'); A.setLayerLW(LAY.hat, 18); }
    try{ if(A.onLayers) A.onLayers(); }catch(_){}
  }
  const scTxt = s => s >= 1 ? (+s.toPrecision(6)) + ' : 1' : '1 : ' + (+(1 / s).toPrecision(6));

  /* ---- sổ hình chiếu (lưu kèm bản vẽ) ---- */
  const DV = new Map(); let seq = 0;
  A.dviewsGet = () => DV.size ? [...DV.values()].map(r => Object.assign({}, r)) : null;
  const tagOf = e => e && e.dvw != null ? String(e.dvw) : null;
  const idOf = e => { const t = tagOf(e); return t && !t.endsWith('/a') ? parseInt(t, 10) : null; };
  const viewEnts = id => ME().filter(e => tagOf(e) === String(id));
  const allEnts = id => ME().filter(e => { const t = tagOf(e); return t === String(id) || t === id + '/a'; });
  const isView = e => { const id = idOf(e); return id != null && DV.has(id); };
  const usedLetters = () => new Set([...DV.values()].map(r => r.lab).filter(Boolean));
  const nextLetter = () => { const U = usedLetters(); for(const c of 'ABCDEFGHJKLMNPRSTUVWXYZ') if(!U.has(c)) return c; let i = 1; while(U.has('A' + i)) i++; return 'A' + i; };

  /* ---- chụp hình chiếu từ khung 3D (FLATSHOT có nét khuất, mặt cắt theo mặt phẳng bất kỳ) ---- */
  async function withViewer(fn){
    const was = !!A.view3D; if(!was) await A.open3D({ keep: true }); const V = A.view3D; if(!V) return null;
    const keep = { az: V.state.az, el: V.state.el };
    try{ return await fn(V); } finally { try{ V.state.az = keep.az; V.state.el = keep.el; }catch(_){} if(!was) A.close3D(); }
  }
  // trả { vis, hid (toạ độ trong hệ (r, u) của hình chiếu, gốc = tâm mô hình c), reg (vùng cắt), c }
  function shootOn(V, d, u, cut){
    const r = unit(cross(u, d)); let F, R = null;
    try{
      if(cut){ V.setCutPlane(cut.n, cut.o); R = V.buildCaps(); }
      F = V.flatshot({ dir: d, up: u, hidden: true, caps: !!cut });
    } finally { if(cut){ try{ V.setCut(false); }catch(_){} } }
    if(!F || !F.B) return null;
    const B = F.B, a = dot(B.r, r), b = dot(B.u, r), c2 = dot(B.r, u), d2 = dot(B.u, u), ox = dot(B.c, r), oy = dot(B.c, u);
    const map = S => { const o = new Array(S.length); for(let i = 0; i < S.length; i += 2){ const x = S[i], y = S[i + 1]; o[i] = x * a + y * b + ox; o[i + 1] = x * c2 + y * d2 + oy; } return o; };
    const out = { vis: map(F), hid: map(F.hid || []), reg: [], r, u, d };
    if(cut && R && R.length){   // vùng cắt: toạ độ trong hệ của mặt cắt (giống dvd-acad-3d cutBasis 'p') → hệ hình chiếu
      const N = unit(cut.n), ax = Math.abs(N[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], bu = unit(cross(ax, N)), bv = cross(N, bu), o = cut.o;
      const to = p => { const P = add(o, add(mul(bu, p[0]), mul(bv, p[1]))); return [dot(P, r), dot(P, u)]; };
      for(const g of R) out.reg.push({ outer: g.outer.map(to), holes: (g.holes || []).map(h => h.map(to)) });
    }
    return out;
  }
  const segBB = (S, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity) => { for(let i = 0; i < S.length; i += 2){ x0 = Math.min(x0, S[i]); x1 = Math.max(x1, S[i]); y0 = Math.min(y0, S[i + 1]); y1 = Math.max(y1, S[i + 1]); } return { x0, y0, x1, y1 }; };
  const shotBB = s => { let b = segBB(s.vis); for(const g of s.reg) for(const p of g.outer) b = segBB(p, b.x0, b.y0, b.x1, b.y1); if(!isFinite(b.x0)) b = segBB(s.hid); return isFinite(b.x0) ? b : { x0: -1, y0: -1, x1: 1, y1: 1 }; };

  /* ---- mặt cắt: toàn phần (F) / nửa (H) / bậc (O) / xoay (A) ---- */
  const cutPts = rec => rec.cut ? (rec.cut.pts || [rec.cut.a, rec.cut.b]).filter(Boolean) : [];
  const cutType = rec => (rec.cut && rec.cut.type) || 'F';
  const mapCut = (rec, f) => { if(rec.cut) rec.cut = { pts: cutPts(rec).map(f), type: cutType(rec) }; };
  const rotAbout = (v, k, th) => { const c = Math.cos(th), s2 = Math.sin(th); return add(add(mul(v, c), mul(cross(k, v), s2)), mul(k, dot(k, v) * (1 - c))); };   // Rodrigues
  // các dải của mặt cắt: mỗi dải một mặt phẳng cắt (hoặc không cắt) + khoảng theo trục dọc đường cắt
  function sectionPlan(rec, par){
    const to3 = q => add(mul(par.r, (q.x - par.at.x) / par.sc), mul(par.u, (q.y - par.at.y) / par.sc));
    const P3 = cutPts(rec).map(to3), type = cutType(rec), d = rec.d, u = rec.u, r = unit(cross(u, d));
    const segs = []; for(let i = 0; i + 1 < P3.length; i++){ const v = sub(P3[i + 1], P3[i]), L = Math.hypot(v[0], v[1], v[2]); if(L < 1e-12) continue; segs.push({ A: P3[i], B: P3[i + 1], dir: mul(v, 1 / L), L }); }
    if(!segs.length) return null;
    const d1 = segs[0].dir, ax = par.d, pl = { type, lx: dot(d1, r), ly: dot(d1, u), wx: dot(ax, r), wy: dot(ax, u), strips: [] };
    if(type === 'A'){   // xoay: mỗi đoạn một mặt phẳng, trải phẳng về mặt phẳng của đoạn đầu (quay quanh trục nhìn của hình chiếu cha)
      let acc = dot(segs[0].A, d1);
      segs.forEach((sg, i) => { const th = Math.atan2(dot(cross(d1, sg.dir), ax), dot(d1, sg.dir)), di = rotAbout(d, ax, th), ui = rotAbout(u, ax, th);
        const tA = dot(sg.A, sg.dir), tB = dot(sg.B, sg.dir); pl.strips.push({ cut: { n: mul(di, -1), o: sg.A }, d: di, u: ui, lo: i === 0 ? -Infinity : tA, hi: i === segs.length - 1 ? Infinity : tB, off: acc - tA, unf: 1 }); acc += sg.L; });
      return pl;
    }
    // F / H / O: đoạn cắt song song với đoạn đầu, đoạn bậc vuông góc; đoạn bậc ở đầu / cuối = phần không cắt (mặt cắt nửa)
    const kind = segs.map((sg, i) => { if(i === 0) return 'c'; if(type === 'F') return 'c'; if(type === 'H') return 's'; const k = dot(sg.dir, d1); return k > 0.98 ? 'c' : Math.abs(k) < 0.2 ? 's' : k < -0.98 ? 'r' : 'x'; });
    if(kind.includes('x')) return { err: 'Đường cắt bậc: các đoạn phải song song hoặc vuông góc với đoạn đầu (dùng kiểu Cắt xoay cho đoạn xiên).' };
    if(kind.includes('r')) return { err: 'Đường cắt bậc phải đi một chiều.' };
    const C = kind.map((k, i) => k === 'c' ? i : -1).filter(i => i >= 0), t = p => dot(p, d1);
    C.forEach((ci, j) => { const sg = segs[ci]; const lo = j === 0 ? (ci > 0 ? t(sg.A) : -Infinity) : t(sg.A), hi = j === C.length - 1 ? (ci < segs.length - 1 ? t(sg.B) : Infinity) : t(segs[C[j + 1]].A);
      pl.strips.push({ cut: { n: mul(d, -1), o: sg.A }, d, u, lo, hi, off: 0 }); });
    if(C[0] > 0) pl.strips.push({ cut: null, d, u, lo: -Infinity, hi: t(segs[C[0]].A), off: 0 });
    if(C[C.length - 1] < segs.length - 1) pl.strips.push({ cut: null, d, u, lo: t(segs[C[C.length - 1]].B), hi: Infinity, off: 0 });
    return pl;
  }
  // chụp mặt cắt: chụp từng dải rồi cắt theo khoảng của dải, ghép lại (xoay: trải phẳng)
  function shootSection(V, rec, par){
    const pl = sectionPlan(rec, par); if(!pl) return null; if(pl.err){ log(pl.err); return null; }
    if(pl.strips.length === 1 && !isFinite(pl.strips[0].lo) && !isFinite(pl.strips[0].hi)){ const st = pl.strips[0]; return shootOn(V, st.d, st.u, st.cut); }   // toàn phần
    const out = { vis: [], hid: [], reg: [], r: unit(cross(rec.u, rec.d)), u: rec.u, d: rec.d };
    const T = (x, y) => x * pl.lx + y * pl.ly, W = (x, y) => x * pl.wx + y * pl.wy;
    for(const st of pl.strips){
      const s = shootOn(V, st.d, st.u, st.cut); if(!s) return null;
      const M = (x, y) => { if(!st.unf) return [x, y]; const tt = T(x, y) + st.off, w = W(x, y); return [tt * pl.lx + w * pl.wx, tt * pl.ly + w * pl.wy]; };
      const clipS = (S, dst) => { for(let i = 0; i < S.length; i += 4){ const ta = T(S[i], S[i + 1]), tb = T(S[i + 2], S[i + 3]), dt = tb - ta; let t0 = 0, t1 = 1;
          if(Math.abs(dt) < 1e-15){ if(ta < st.lo || ta > st.hi) continue; } else { let u0 = (st.lo - ta) / dt, u1 = (st.hi - ta) / dt; if(u0 > u1){ const w2 = u0; u0 = u1; u1 = w2; } t0 = Math.max(0, u0); t1 = Math.min(1, u1); if(t1 <= t0) continue; }
          const p = M(S[i] + (S[i + 2] - S[i]) * t0, S[i + 1] + (S[i + 3] - S[i + 1]) * t0), q = M(S[i] + (S[i + 2] - S[i]) * t1, S[i + 1] + (S[i + 3] - S[i + 1]) * t1); dst.push(p[0], p[1], q[0], q[1]); } };
      clipS(s.vis, out.vis); clipS(s.hid, out.hid);
      for(const g of s.reg){
        const clipL = l => { let L = l.map(v => ({ x: v[0], y: v[1] })); const tt = q => T(q.x, q.y);
          for(const [lim, sg] of [[st.lo, 1], [st.hi, -1]]){ if(!isFinite(lim) || !L.length) continue; L = clipPoly(L, q => (tt(q) - lim) * sg >= 0, (q1, q2) => { const a = tt(q1), b = tt(q2), k = (lim - a) / (b - a); return { x: q1.x + (q2.x - q1.x) * k, y: q1.y + (q2.y - q1.y) * k }; }); }
          return L.length >= 3 ? L.map(q => M(q.x, q.y)) : null; };
        const outer = clipL(g.outer); if(!outer) continue; const holes = (g.holes || []).map(clipL).filter(Boolean);
        const E = []; for(const l of [g.outer].concat(g.holes || [])){ const S = []; for(let i = 0; i < l.length; i++){ const a = l[i], b = l[(i + 1) % l.length]; S.push(a[0], a[1], b[0], b[1]); } clipS(S, E); }
        out.reg.push({ outer, holes, edges: E });   // biên vùng cắt: chỉ cạnh thật, không vẽ đường ghép giữa các dải
      }
    }
    return out;
  }

  /* ---- dựng đối tượng 2D của một hình chiếu ---- */
  function mk(type, o, layer, tag){ const e = Object.assign({ type }, o); A.newProps(e); e.layer = layer; e.bl = 1; e.col = A.layerHex(layer); delete e.lt; delete e.lw; e.dvw = tag; return e; }
  const P = (rec, x, y) => ({ x: rec.at.x + rec.sc * x, y: rec.at.y + rec.sc * y });
  function geomOf(rec, s){
    const out = [], tag = String(rec.id);
    const lines = (S, layer) => { for(let i = 0; i < S.length; i += 4){ const a = P(rec, S[i], S[i + 1]), b = P(rec, S[i + 2], S[i + 3]); out.push(mk('LINE', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, layer, tag)); } };
    lines(s.vis, LAY.vis); if(rec.hid) lines(s.hid, LAY.hid);
    if(s.reg.length){ const size = (() => { const b = shotBB(s); return Math.max(b.x1 - b.x0, b.y1 - b.y0) * rec.sc; })();
      for(const g of s.reg){ const loops = [g.outer].concat(g.holes).map(l => l.map(p => P(rec, p[0], p[1])));
        if(g.edges) lines(g.edges, LAY.vis); else for(const l of loops) out.push(mk('POLYLINE', { closed: true, vertices: l }, LAY.vis, tag));
        out.push(mk('HATCH', { loops, pat: SST.pat || 'ANSI31', psc: Math.max(1e-6, (SST.psc || 1) * size / 80 / 3.175), pang: 0, solid: false }, LAY.hat, tag)); } }
    return out;
  }
  function label(rec, lines, th){
    const out = [], tag = String(rec.id); const bb = rec._bb; if(!bb) return out; const cx = (bb.x0 + bb.x1) / 2; let y = bb.y0 - th * 2.2;
    for(const [t, h] of lines){ out.push(mk('TEXT', { x: cx, y, h, text: t, rot: 0, ha: 'center', va: 'top' }, LAY.ann, tag)); y -= h * 1.7; }
    return out;
  }
  const entsBB = L => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of L){ let b = null; try{ b = entBBox(e); }catch(_){} if(!b) continue; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
  // mặt cắt: đường cắt + mũi tên + chữ trên hình chiếu cha (đường gãy: nét đậm ở mỗi chỗ gãy)
  function cutMarks(rec, par){
    const out = [], tag = rec.id + '/a', P = cutPts(rec), n = P.length, type = cutType(rec); if(n < 2) return out;
    const dirs = []; for(let i = 0; i + 1 < n; i++){ const L = Math.hypot(P[i + 1].x - P[i].x, P[i + 1].y - P[i].y) || 1; dirs.push({ x: (P[i + 1].x - P[i].x) / L, y: (P[i + 1].y - P[i].y) / L }); }
    const vd = mul(rec.d, -1), wx = dot(vd, par.r), wy = dot(vd, par.u), wl = Math.hypot(wx, wy) || 1, N0 = { x: wx / wl, y: wy / wl };   // hướng nhìn trên hình chiếu cha
    const s = SST.arr, ext = s * 1.2, d0 = dirs[0], dl = dirs[dirs.length - 1];
    const A0 = { x: P[0].x - d0.x * ext, y: P[0].y - d0.y * ext }, B0 = { x: P[n - 1].x + dl.x * ext, y: P[n - 1].y + dl.y * ext };
    const ln = n === 2 ? mk('LINE', { x1: A0.x, y1: A0.y, x2: B0.x, y2: B0.y }, LAY.ann, tag) : mk('POLYLINE', { closed: false, vertices: [A0].concat(P.slice(1, -1), [B0]) }, LAY.ann, tag);
    ln.lt = 'DASHDOT'; ln.lts = Math.max(0.05, s / 6); out.push(ln);
    const thick = (p, ux, uy, L) => { const t = mk('LINE', { x1: p.x, y1: p.y, x2: p.x + ux * L, y2: p.y + uy * L }, LAY.ann, tag); t.lw = 70; out.push(t); };
    thick(A0, d0.x, d0.y, s * 2); thick(B0, -dl.x, -dl.y, s * 2);
    for(let i = 1; i < n - 1; i++){ thick(P[i], -dirs[i - 1].x, -dirs[i - 1].y, s); thick(P[i], dirs[i].x, dirs[i].y, s); }
    // mũi tên vuông góc đoạn đầu / đoạn cuối, chỉ hướng nhìn (mặt cắt nửa: đoạn cuối là bậc → không mũi tên ở cuối)
    const perpTo = dd => { let q = { x: -dd.y, y: dd.x }; if(q.x * N0.x + q.y * N0.y < 0) q = { x: -q.x, y: -q.y }; return q; };
    const ends = [[A0, perpTo(d0), d0, 1]]; const lastCut = type === 'A' || type === 'F' || (type === 'O' && Math.abs(dl.x * d0.x + dl.y * d0.y) > 0.98);
    ends.push([B0, lastCut ? perpTo(dl) : null, dl, -1]);
    for(const [p, nn, dd, sg] of ends){
      if(nn){ const tip = { x: p.x + nn.x * s * 2.2, y: p.y + nn.y * s * 2.2 }, base = { x: p.x + nn.x * s * 0.8, y: p.y + nn.y * s * 0.8 };
        out.push(mk('LINE', { x1: p.x, y1: p.y, x2: base.x, y2: base.y }, LAY.ann, tag));
        out.push(mk('SOLID', { pts: [tip, { x: base.x + dd.x * s * 0.4, y: base.y + dd.y * s * 0.4 }, { x: base.x - dd.x * s * 0.4, y: base.y - dd.y * s * 0.4 }] }, LAY.ann, tag)); }
      const side = nn || N0; const tp = { x: p.x + side.x * s * 1.4 - sg * dd.x * s * 1.4, y: p.y + side.y * s * 1.4 - sg * dd.y * s * 1.4 };
      out.push(mk('TEXT', { x: tp.x, y: tp.y, h: SST.th, text: rec.lab, rot: 0, ha: 'center', va: 'middle' }, LAY.ann, tag)); }
    return out;
  }
  // hình trích: cắt nét của hình chiếu cha trong vùng, phóng to
  function clipSeg(p, q, c, r, rect){
    if(rect){ // Liang–Barsky
      let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y; const chk = (pp, qq) => { if(Math.abs(pp) < 1e-15) return qq >= 0; const t = qq / pp; if(pp < 0){ if(t > t1) return false; if(t > t0) t0 = t; } else { if(t < t0) return false; if(t < t1) t1 = t; } return true; };
      if(!chk(-dx, p.x - rect.x0) || !chk(dx, rect.x1 - p.x) || !chk(-dy, p.y - rect.y0) || !chk(dy, rect.y1 - p.y)) return null; return [{ x: p.x + dx * t0, y: p.y + dy * t0 }, { x: p.x + dx * t1, y: p.y + dy * t1 }]; }
    const dx = q.x - p.x, dy = q.y - p.y, fx = p.x - c.x, fy = p.y - c.y; const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - r * r; if(a < 1e-18) return cc <= 0 ? [p, q] : null;
    const D = b * b - 4 * a * cc; if(D <= 0) return null; const sq = Math.sqrt(D); const t0 = Math.max(0, (-b - sq) / (2 * a)), t1 = Math.min(1, (-b + sq) / (2 * a)); if(t1 <= t0) return null;
    return [{ x: p.x + dx * t0, y: p.y + dy * t0 }, { x: p.x + dx * t1, y: p.y + dy * t1 }];
  }
  function clipPoly(loop, inside, inter){   // Sutherland–Hodgman với một nửa mặt phẳng
    const out = []; for(let i = 0; i < loop.length; i++){ const a = loop[i], b = loop[(i + 1) % loop.length], ia = inside(a), ib = inside(b); if(ia && ib) out.push(b); else if(ia && !ib) out.push(inter(a, b)); else if(!ia && ib){ out.push(inter(a, b)); out.push(b); } } return out;
  }
  function clipLoopConvex(loop, poly){ let L = loop; for(let i = 0; i < poly.length && L.length; i++){ const a = poly[i], b = poly[(i + 1) % poly.length]; const side = p => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
      const inter = (p, q) => { const d1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x), d2 = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x), t = d1 / (d1 - d2); return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; };
      L = clipPoly(L, side, inter); } return L; }
  function detailGeom(rec, par, src){
    const out = [], tag = String(rec.id), c = rec.det.c, R = rec.det.r, rect = rec.det.shape === 'R' ? { x0: c.x - rec.det.w / 2, y0: c.y - rec.det.h / 2, x1: c.x + rec.det.w / 2, y1: c.y + rec.det.h / 2 } : null;
    const f = rec.sc / par.sc, T = p => ({ x: rec.at.x + (p.x - c.x) * f, y: rec.at.y + (p.y - c.y) * f });
    const poly = rect ? [{ x: rect.x0, y: rect.y0 }, { x: rect.x1, y: rect.y0 }, { x: rect.x1, y: rect.y1 }, { x: rect.x0, y: rect.y1 }] : Array.from({ length: 96 }, (_, i) => ({ x: c.x + R * Math.cos(i * Math.PI / 48), y: c.y + R * Math.sin(i * Math.PI / 48) }));
    for(const e of src || viewEnts(par.id)){
      if(e.type === 'LINE'){ const s = clipSeg({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }, c, R, rect); if(s){ const a = T(s[0]), b = T(s[1]); out.push(mk('LINE', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, e.layer, tag)); } }
      else if(e.type === 'POLYLINE'){ const V = e.vertices || [], n = V.length; for(let i = 0; i < n - 1 + (e.closed ? 1 : 0); i++){ const s = clipSeg(V[i], V[(i + 1) % n], c, R, rect); if(s){ const a = T(s[0]), b = T(s[1]); out.push(mk('LINE', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, e.layer, tag)); } } }
      else if(e.type === 'HATCH'){ const loops = (e.loops || []).map(l => clipLoopConvex(l, poly)).filter(l => l.length >= 3).map(l => l.map(T)); if(loops.length) out.push(mk('HATCH', { loops, pat: e.pat, psc: (e.psc || 1) * f, pang: e.pang || 0, solid: e.solid }, e.layer, tag)); }
    }
    // biên hình trích
    if(rect) out.push(mk('POLYLINE', { closed: true, vertices: poly.map(T) }, LAY.ann, tag)); else { const q = T(c); out.push(mk('CIRCLE', { cx: q.x, cy: q.y, r: R * f }, LAY.ann, tag)); }
    return out;
  }
  function detailMarks(rec, par){
    const out = [], tag = rec.id + '/a', c = rec.det.c, R = rec.det.r;
    if(rec.det.shape === 'R') out.push(mk('POLYLINE', { closed: true, vertices: [{ x: c.x - rec.det.w / 2, y: c.y - rec.det.h / 2 }, { x: c.x + rec.det.w / 2, y: c.y - rec.det.h / 2 }, { x: c.x + rec.det.w / 2, y: c.y + rec.det.h / 2 }, { x: c.x - rec.det.w / 2, y: c.y + rec.det.h / 2 }] }, LAY.ann, tag));
    else out.push(mk('CIRCLE', { cx: c.x, cy: c.y, r: R }, LAY.ann, tag));
    const rr = rec.det.shape === 'R' ? Math.hypot(rec.det.w, rec.det.h) / 2 : R, k = Math.SQRT1_2;
    out.push(mk('TEXT', { x: c.x + rr * k + DST.th * 0.8, y: c.y + rr * k + DST.th * 0.8, h: DST.th, text: rec.lab, rot: 0, ha: 'center', va: 'middle' }, LAY.ann, tag));
    return out;
  }
  // thứ tự dựng: cha trước con
  const depth = r => { let k = 0, p = r; while(p && p.par != null && k < 50){ p = DV.get(p.par); k++; } return k; };
  const kids = id => [...DV.values()].filter(r => r.par === id);
  function descend(ids){ const S = new Set(ids); let ch = true; while(ch){ ch = false; for(const r of DV.values()) if(r.par != null && S.has(r.par) && !S.has(r.id)){ S.add(r.id); ch = true; } } return [...S].map(i => DV.get(i)).filter(Boolean).sort((a, b) => depth(a) - depth(b)); }
  // dựng lại (hoặc dựng mới) các hình chiếu; một lần commit, hoàn tác được
  async function regen(recs, msg, opt){
    opt = opt || {}; ensureLayers();
    const del = [], addL = [];
    // hình chiếu đã bị dời bằng MOVE: lấy lại chỗ đặt theo tâm hiện tại
    // đường cắt / vùng trích nằm trên hình chiếu cha nên đi theo cha
    const moved = new Map();
    for(const r of recs){ const cur = viewEnts(r.id).filter(e => e.type !== 'TEXT'); if(cur.length && r._c && !opt.fresh){ const b = entsBB(cur); if(b){ const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; if(Math.hypot(cx - r._c.x, cy - r._c.y) > 1e-9 * Math.max(1, Math.abs(cx) + Math.abs(cy))){ const dx = cx - r._c.x, dy = cy - r._c.y; r.at = { x: r.at.x + dx, y: r.at.y + dy }; moved.set(r.id, { dx, dy }); } } } }
    for(const r of recs){ const m = r.par != null ? moved.get(r.par) : null; if(!m) continue; const sh = q => ({ x: q.x + m.dx, y: q.y + m.dy });
      if(r.cut) mapCut(r, sh); if(r.det) r.det = Object.assign({}, r.det, { c: sh(r.det.c) }); }
    const need = recs.filter(r => r.k !== 'det');
    const shots = new Map();
    if(need.length){ const ok = await withViewer(async V => { for(const r of need){ const s = r.k === 'sec' ? shootSection(V, r, DV.get(r.par)) : shootOn(V, r.d, r.u, null); if(!s) return false; shots.set(r.id, s); } return true; }); if(!ok){ log('Không dựng được hình chiếu (cần khung 3D).'); return false; } }
    const made = new Map();   // id → đối tượng mới (để hình trích dùng nét mới của cha)
    for(const r of recs){
      for(const e of allEnts(r.id)) del.push(e);
      let L = [];
      const par = r.par != null ? DV.get(r.par) : null;
      if(r.k === 'det'){ if(!par) continue; L = detailGeom(r, par, made.get(par.id)); }
      else { const s = shots.get(r.id); if(!s) continue; r.r = s.r; L = geomOf(r, s); }
      const bb = entsBB(L) || { x0: r.at.x, y0: r.at.y, x1: r.at.x, y1: r.at.y }; r._bb = bb; r._c = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 };
      // nhãn
      if(r.k === 'sec'){ const t = [[(SST.lab || 'MẶT CẮT') + ' ' + r.lab + '-' + r.lab, SST.lth]]; if(SST.showSc && par && Math.abs(r.sc - par.sc) > 1e-9) t.push(['TỈ LỆ ' + scTxt(r.sc), SST.lth * 0.8]); L.push(...label(r, t, SST.lth)); }
      if(r.k === 'det'){ const t = [[(DST.lab || 'HÌNH TRÍCH') + ' ' + r.lab, DST.lth]]; if(DST.showSc) t.push(['TỈ LỆ ' + scTxt(r.sc), DST.lth * 0.8]); L.push(...label(r, t, DST.lth)); }
      if(r.k === 'base' && r.showSc) L.push(...label(r, [['TỈ LỆ ' + scTxt(r.sc), DST.lth * 0.8]], DST.lth));
      if(par && r.k === 'sec') L.push(...cutMarks(r, par));
      if(par && r.k === 'det') L.push(...detailMarks(r, par));
      const gid = 'DV' + r.id; for(const e of L){ e.grp = gid; e.blk = '*DVIEW'; } for(const e of L) if(tagOf(e).endsWith('/a')){ e.grp = 'DV' + r.id + 'a'; }
      made.set(r.id, L.filter(e => tagOf(e) === String(r.id)));
      addL.push(...L);
    }
    for(const e of addL) delete e.userAdded;
    A.commit({ del: [...new Set(del)], add: addL }, msg || 'VIEWUPDATE');
    return true;
  }

  /* ---- chọn hình chiếu ---- */
  async function pickView(prompt, filt){
    const r = await A.getEnt(prompt, { filter: e => isView(e) && (!filt || filt(DV.get(idOf(e)))) }); if(!r.ent) return null; return DV.get(idOf(r.ent));
  }
  const newRec = o => { const id = ++seq; const r = Object.assign({ id, hid: STD.hid ? 1 : 0, sc: STD.sc || 1 }, o); DV.set(id, r); return r; };
  // hướng hình chiếu phụ theo vị trí đặt so với hình chiếu cha
  function childDir(par, p){
    const c = par._c || par.at, dx = p.x - c.x, dy = p.y - c.y; const k = STD.proj === 3 ? 1 : -1; const sh = Math.sign(dx) || 1, sv = Math.sign(dy) || 1;
    const t = Math.tan(22.5 * Math.PI / 180); let kind;
    if(Math.abs(dy) <= Math.abs(dx) * t) kind = 'h'; else if(Math.abs(dx) <= Math.abs(dy) * t) kind = 'v'; else kind = 'iso';
    let d, u;
    if(kind === 'h'){ d = mul(par.r, k * sh); u = upFor(d, par.u); }
    else if(kind === 'v'){ d = mul(par.u, k * sv); u = upFor(d, mul(par.d, -k * sv)); }
    else { d = unit(add(par.d, add(mul(par.r, k * sh), mul(par.u, k * sv)))); u = isoUp(d); }
    return { kind, key: kind[0] + sh + sv, d, u, al: kind === 'iso' ? null : alignKind(par, d, u, kind) };
  }
  // đặt các hình chiếu phụ (dùng chung cho VIEWBASE và VIEWPROJ)
  async function placeProjected(par){
    if(!isOrtho(par.d)){ log('Chỉ chiếu phụ được từ hình chiếu vuông góc (không phải ISO).'); return 0; }
    log('Đang dựng các hình chiếu phụ…');
    const C = new Map(); const cand = [];
    for(const sh of [1, -1]) cand.push(childDir(par, { x: (par._c || par.at).x + sh * 10, y: (par._c || par.at).y }));
    for(const sv of [1, -1]) cand.push(childDir(par, { x: (par._c || par.at).x, y: (par._c || par.at).y + sv * 10 }));
    for(const sh of [1, -1]) for(const sv of [1, -1]) cand.push(childDir(par, { x: (par._c || par.at).x + sh * 10, y: (par._c || par.at).y + sv * 10 }));
    const ok = await withViewer(async V => { for(const q of cand){ const s = shootOn(V, q.d, q.u, null); if(s) C.set(q.key, s); } return true; }); if(!ok) return 0;
    let n = 0;
    const placeOf = (q, s, p) => { const b = shotBB(s), bc = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
      if(q.al === 'h') return { x: p.x - par.sc * bc.x, y: par.at.y }; if(q.al === 'v') return { x: par.at.x, y: p.y - par.sc * bc.y }; return { x: p.x - par.sc * bc.x, y: p.y - par.sc * bc.y }; };
    for(;;){
      const r = await A.getPoint('Chỉ định vị trí hình chiếu phụ hoặc <thoát>', { rubber: false, preview: (g, p) => { const q = childDir(par, p), s = C.get(q.key); if(!s) return; const at = placeOf(q, s, p); const S = s.vis, m = Math.min(S.length, 16000);
          for(let i = 0; i < m; i += 4) g.line({ x: at.x + par.sc * S[i], y: at.y + par.sc * S[i + 1] }, { x: at.x + par.sc * S[i + 2], y: at.y + par.sc * S[i + 3] }); } });
      if(!r.pt) break;
      const q = childDir(par, r.pt), s = C.get(q.key); if(!s) continue;
      const rec = newRec({ k: 'proj', par: par.id, d: q.d, u: q.u, sc: par.sc, hid: q.kind === 'iso' ? 0 : par.hid, at: placeOf(q, s, r.pt) });
      if(!(await regen([rec], 'VIEWPROJ'))){ DV.delete(rec.id); break; } n++;
    }
    return n;
  }
  const hasSolids = () => ME().some(e => e.type === 'SOLID3D');
  /* VIEWBASE */
  async function viewBaseCmd(){
    if(!hasSolids()){ log('Bản vẽ chưa có khối 3D (SOLID3D) — VIEWBASE chiếu khối 3D thành hình 2D.'); return; }
    let ori = lsGet('dvd:viewbase:ori', 'front'); if(!ORI[ori]) ori = 'front'; let sc = STD.sc || 1, hid = STD.hid ? 1 : 0;
    let shot = null;
    const take = async () => { log('Đang dựng hình chiếu ' + ORI[ori].t + '…'); shot = await withViewer(async V => shootOn(V, ORI[ori].d, ORI[ori].u, null)); return !!shot; };
    if(!(await take())){ log('Không dựng được hình chiếu (cần khung 3D).'); return; }
    let at = null;
    for(;;){
      const b = shotBB(shot), bc = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
      const r = await A.getPoint('Chỉ định vị trí hình chiếu cơ sở hoặc', { rubber: false, kw: [{ k: 'O', t: 'Hướng' }, { k: 'H', t: 'Nét khuất' }, { k: 'S', t: 'Tỉ lệ' }, { k: 'P', t: 'Kiểu chiếu' }],
        preview: (g, p) => { const S = shot.vis, m = Math.min(S.length, 20000); for(let i = 0; i < m; i += 4) g.line({ x: p.x + sc * (S[i] - bc.x), y: p.y + sc * (S[i + 1] - bc.y) }, { x: p.x + sc * (S[i + 2] - bc.x), y: p.y + sc * (S[i + 3] - bc.y) }); } });
      if(r.kw === 'O'){ const keys = Object.keys(ORI); const k = await A.getKw('Hướng hình chiếu', { kw: [{ k: 'TR', t: 'Trước' }, { k: 'SA', t: 'Sau' }, { k: 'TA', t: 'Trái' }, { k: 'PH', t: 'Phải' }, { k: 'TE', t: 'Trên' }, { k: 'DU', t: 'Dưới' }, { k: 'TN', t: 'ISO Tây Nam' }, { k: 'DN', t: 'ISO Đông Nam' }, { k: 'DB', t: 'ISO Đông Bắc' }, { k: 'TB', t: 'ISO Tây Bắc' }], def: ORI[ori].t });
        const m = { TR: 'front', SA: 'back', TA: 'left', PH: 'right', TE: 'top', DU: 'bottom', TN: 'sw', DN: 'se', DB: 'ne', TB: 'nw' }; if(k.kw && m[k.kw]){ ori = m[k.kw]; lsSet('dvd:viewbase:ori', ori); if(!(await take())) return; } void keys; continue; }
      if(r.kw === 'H'){ const k = await A.getKw('Kiểu hiển thị', { kw: [{ k: 'V', t: 'Nét thấy' }, { k: 'I', t: 'Nét thấy và nét khuất' }], def: hid ? 'Nét thấy và nét khuất' : 'Nét thấy' }); if(k.kw) hid = k.kw === 'I' ? 1 : 0; continue; }
      if(r.kw === 'S'){ const v = await A.getNum('Tỉ lệ hình chiếu (vd 0.5 = 1:2)', { def: sc }); if(v.num > 0) sc = v.num; continue; }
      if(r.kw === 'P'){ const k = await A.getKw('Phương pháp chiếu', { kw: [{ k: '1', t: 'Góc chiếu thứ nhất (TCVN / ISO)' }, { k: '3', t: 'Góc chiếu thứ ba' }], def: STD.proj === 3 ? 'Góc chiếu thứ ba' : 'Góc chiếu thứ nhất (TCVN / ISO)' }); if(k.kw) { STD.proj = k.kw === '3' ? 3 : 1; lsSet(STD_K, STD); } continue; }
      if(!r.pt) return; at = { x: r.pt.x - sc * bc.x, y: r.pt.y - sc * bc.y }; break;
    }
    const rec = newRec({ k: 'base', d: ORI[ori].d, u: ORI[ori].u, sc, hid, at, ori });
    if(!(await regen([rec], 'VIEWBASE'))){ DV.delete(rec.id); return; }
    log('VIEWBASE: hình chiếu ' + ORI[ori].t + ', tỉ lệ ' + scTxt(sc) + (hid ? ', có nét khuất' : '') + '.');
    const n = await placeProjected(rec); if(n) log('VIEWBASE: thêm ' + n + ' hình chiếu phụ (' + (STD.proj === 3 ? 'góc chiếu thứ ba' : 'góc chiếu thứ nhất') + ').');
  }
  ecmd(['VIEWBASE', 'VIEWS3', 'HINHCHIEU'], 'Hình chiếu cơ sở từ mô hình 3D (Model Documentation): hướng, tỉ lệ, nét khuất; đặt tiếp các hình chiếu phụ (vuông góc / ISO) — liên kết với mô hình, VIEWUPDATE dựng lại', viewBaseCmd);
  ecmd(['VIEWPROJ'], 'Hình chiếu phụ từ một hình chiếu có sẵn: đặt sang phải / trái / trên / dưới (theo góc chiếu 1 hoặc 3), chéo = hình chiếu ISO', async () => {
    const par = await pickView('Chọn hình chiếu cha'); if(!par) return; if(par.k === 'det'){ log('Không chiếu phụ từ hình trích.'); return; }
    const n = await placeProjected(par); if(n) log('VIEWPROJ: ' + n + ' hình chiếu phụ.');
  });
  /* VIEWSECTION — mặt cắt toàn phần / nửa / bậc / xoay */
  const SECT = { F: 'Toàn phần', H: 'Nửa', O: 'Bậc', A: 'Cắt xoay' };
  ecmd(['VIEWSECTION'], 'Mặt cắt từ hình chiếu: toàn phần, nửa, bậc (offset) hoặc xoay (aligned) — đường cắt, mũi tên, chữ, mặt cắt gạch ANSI31, nhãn "MẶT CẮT A-A"', async () => {
    const par = await pickView('Chọn hình chiếu cha', r => r.k !== 'det'); if(!par) return; if(!isOrtho(par.d)){ log('Mặt cắt cần hình chiếu cha vuông góc (không phải ISO).'); return; }
    let lab = nextLetter(), type = lsGet('dvd:viewsec:type', 'F'); if(!SECT[type]) type = 'F';
    let a = null;
    for(;;){ const r = await A.getPoint('Chỉ định điểm đầu đường cắt hoặc', { kw: [{ k: 'T', t: 'Kiểu' }, { k: 'I', t: 'Ký hiệu' }] });
      if(r.kw === 'T'){ const k = await A.getKw('Kiểu mặt cắt', { kw: [{ k: 'F', t: 'Toàn phần' }, { k: 'H', t: 'Nửa' }, { k: 'O', t: 'Bậc' }, { k: 'A', t: 'Cắt xoay' }], def: SECT[type] }); if(k.kw && SECT[k.kw]){ type = k.kw; lsSet('dvd:viewsec:type', type); } continue; }
      if(r.kw === 'I'){ const s = await A.getStr('Ký hiệu mặt cắt', { def: lab }); const v = String(s.str || '').trim(); if(v) lab = v.toUpperCase(); continue; }
      if(!r.pt) return; a = r.pt; break; }
    const pts = [a]; const same = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9;
    const drawn = g => { for(let i = 0; i + 1 < pts.length; i++) g.line(pts[i], pts[i + 1]); };
    if(type === 'F'){ const q = await A.getPoint('Chỉ định điểm cuối đường cắt', { base: a }); if(!q.pt) return; pts.push(q.pt); }
    else if(type === 'H'){ const q = await A.getPoint('Chỉ định điểm tiếp theo', { base: a }); if(!q.pt) return; pts.push(q.pt); const q2 = await A.getPoint('Chỉ định điểm cuối đường cắt', { base: q.pt, preview: drawn }); if(!q2.pt) return; pts.push(q2.pt); }
    else for(;;){ const q = await A.getPoint(pts.length < 2 ? 'Chỉ định điểm tiếp theo' : 'Chỉ định điểm tiếp theo hoặc', { base: pts[pts.length - 1], kw: pts.length > 1 ? [{ k: 'U', t: 'Hoàn tác' }] : [], preview: drawn });
      if(q.kw === 'U'){ if(pts.length > 1) pts.pop(); continue; } if(!q.pt) break; if(!same(q.pt, pts[pts.length - 1])) pts.push(q.pt); }
    if(pts.length < 2 || same(pts[0], pts[1])) return;
    const b = pts[1];
    // đoạn đầu của đường cắt → mặt phẳng cắt 3D chứa đoạn đó và hướng nhìn của cha
    const to3 = q => add(mul(par.r, (q.x - par.at.x) / par.sc), mul(par.u, (q.y - par.at.y) / par.sc));
    const A3 = to3(a), B3 = to3(b); const n = unit(cross(sub(B3, A3), par.d));
    // hình chiếu mặt cắt: đặt về phía nào thì nhìn theo quy ước góc chiếu
    const k = STD.proj === 3 ? 1 : -1;
    const dirFor = p => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, nx = dot(n, par.r), ny = dot(n, par.u); const side = Math.sign((p.x - mx) * nx + (p.y - my) * ny) || 1; const d = mul(n, k * side);
      const horiz = Math.abs(nx) >= Math.abs(ny); const u = upFor(d, horiz ? par.u : mul(par.d, -(Math.sign(dot(d, par.u)) || 1))); return { d, u, horiz, key: side, al: alignKind(par, d, u, horiz ? 'h' : 'v') }; };
    const cut = { pts, type };
    { const pl = sectionPlan({ d: n, u: upFor(n, par.u), cut }, par); if(pl && pl.err){ log(pl.err); return; } }
    log('Đang dựng mặt cắt…');
    const C = new Map();
    const ok = await withViewer(async V => { for(const side of [1, -1]){ const q = dirFor({ x: (a.x + b.x) / 2 + dot(n, par.r) * side, y: (a.y + b.y) / 2 + dot(n, par.u) * side }); const s = shootSection(V, { d: q.d, u: q.u, cut }, par); if(s) C.set(side, { q, s }); } return true; });
    if(!ok || !C.size){ log('Không dựng được mặt cắt.'); return; }
    const placeOf = (q, s, p) => { const bb = shotBB(s), bc = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 }; if(q.al === 'h') return { x: p.x - par.sc * bc.x, y: par.at.y }; if(q.al === 'v') return { x: par.at.x, y: p.y - par.sc * bc.y }; return { x: p.x - par.sc * bc.x, y: p.y - par.sc * bc.y }; };
    const r = await A.getPoint('Chỉ định vị trí hình chiếu mặt cắt', { rubber: false, preview: (g, p) => { const q = dirFor(p), it = C.get(q.key); if(!it) return; const at = placeOf(q, it.s, p);
        const S = it.s.vis, m = Math.min(S.length, 16000); for(let i = 0; i < m; i += 4) g.line({ x: at.x + par.sc * S[i], y: at.y + par.sc * S[i + 1] }, { x: at.x + par.sc * S[i + 2], y: at.y + par.sc * S[i + 3] });
        for(const R of it.s.reg) g.poly(R.outer.map(v => ({ x: at.x + par.sc * v[0], y: at.y + par.sc * v[1] })), true); } });
    if(!r.pt) return;
    const q = dirFor(r.pt), it = C.get(q.key); if(!it) return;
    const rec = newRec({ k: 'sec', par: par.id, d: q.d, u: q.u, sc: par.sc, hid: 0, at: placeOf(q, it.s, r.pt), lab, cut });
    if(!(await regen([rec], 'VIEWSECTION'))){ DV.delete(rec.id); return; }
    log('VIEWSECTION: mặt cắt ' + SECT[type].toLowerCase() + ' ' + lab + '-' + lab + (it.s.reg.length ? ' (' + it.s.reg.length + ' vùng cắt)' : ' — đường cắt không qua khối nào') + '.');
  });
  /* VIEWDETAIL — hình trích */
  ecmd(['VIEWDETAIL'], 'Hình trích (Detail View): khoanh vùng tròn / chữ nhật trên hình chiếu cha, phóng to theo tỉ lệ, nhãn "HÌNH TRÍCH B  TỈ LỆ 2 : 1"', async () => {
    const par = await pickView('Chọn hình chiếu cha'); if(!par) return;
    let lab = nextLetter(), shape = DST.shape === 'R' ? 'R' : 'C', c = null;
    for(;;){ const r = await A.getPoint('Chỉ định tâm vùng trích hoặc', { kw: [{ k: 'H', t: 'Hình dạng' }, { k: 'I', t: 'Ký hiệu' }] });
      if(r.kw === 'H'){ const k = await A.getKw('Hình dạng vùng trích', { kw: [{ k: 'C', t: 'Tròn' }, { k: 'R', t: 'Chữ nhật' }], def: shape === 'R' ? 'Chữ nhật' : 'Tròn' }); if(k.kw) shape = k.kw; continue; }
      if(r.kw === 'I'){ const s = await A.getStr('Ký hiệu hình trích', { def: lab }); const v = String(s.str || '').trim(); if(v) lab = v.toUpperCase(); continue; }
      if(!r.pt) return; c = r.pt; break; }
    const det = { c, shape };
    if(shape === 'R'){ const q = await A.getPoint('Chỉ định góc vùng trích', { base: c, rubber: false, preview: (g, p) => { const w = Math.abs(p.x - c.x) * 2, h = Math.abs(p.y - c.y) * 2; g.poly([{ x: c.x - w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y + h / 2 }, { x: c.x - w / 2, y: c.y + h / 2 }], true); } }); if(!q.pt) return; det.w = Math.max(1e-6, Math.abs(q.pt.x - c.x) * 2); det.h = Math.max(1e-6, Math.abs(q.pt.y - c.y) * 2); det.r = Math.hypot(det.w, det.h) / 2; }
    else { const q = await A.getDist('Chỉ định bán kính vùng trích', { base: c }); const R = q.num || (q.pt ? Math.hypot(q.pt.x - c.x, q.pt.y - c.y) : 0); if(!(R > 0)) return; det.r = R; }
    let f = DST.f || 2;
    for(;;){
      const tmp = { id: -1, k: 'det', par: par.id, sc: par.sc * f, at: { x: 0, y: 0 }, det, lab };
      const r = await A.getPoint('Chỉ định vị trí hình trích hoặc', { rubber: false, kw: [{ k: 'S', t: 'Tỉ lệ' }], preview: (g, p) => { tmp.at = p; const L = detailGeom(tmp, par); g.ents(L.slice(0, 6000)); } });
      if(r.kw === 'S'){ const v = await A.getNum('Hệ số phóng so với hình chiếu cha', { def: f }); if(v.num > 0) f = v.num; continue; }
      if(!r.pt) return;
      const rec = newRec({ k: 'det', par: par.id, sc: par.sc * f, hid: par.hid, at: r.pt, det, lab });
      if(!(await regen([rec], 'VIEWDETAIL'))){ DV.delete(rec.id); return; }
      log('VIEWDETAIL: hình trích ' + lab + ', tỉ lệ ' + scTxt(rec.sc) + '.'); return;
    }
  });
  /* VIEWUPDATE / VIEWEDIT */
  const prune = () => { for(const [id, r] of [...DV]) if(!viewEnts(id).length && !allEnts(id).length) DV.delete(id); };
  async function updateAll(recs){ prune(); const L = descend((recs || [...DV.values()]).map(r => r.id)); if(!L.length){ log('Bản vẽ chưa có hình chiếu nào (VIEWBASE).'); return 0; } if(L.some(r => r.k !== 'det') && !hasSolids()){ log('Bản vẽ không còn khối 3D để chiếu.'); return 0; }
    const ok = await regen(L, 'VIEWUPDATE'); if(ok) log('VIEWUPDATE: đã dựng lại ' + L.length + ' hình chiếu theo mô hình.'); return ok ? L.length : 0; }
  A.viewUpdate = updateAll;
  ecmd(['VIEWUPDATE'], 'Dựng lại hình chiếu theo mô hình 3D đã sửa (giữ vị trí đã dời): chọn hình chiếu hoặc Tất cả', async () => {
    prune(); if(!DV.size){ log('Bản vẽ chưa có hình chiếu nào (VIEWBASE).'); return; }
    const r = await A.getEnt('Chọn hình chiếu cần cập nhật hoặc', { filter: isView, kw: [{ k: 'A', t: 'Tất cả' }], def: 'Tất cả' });
    if(r.ent){ await updateAll([DV.get(idOf(r.ent))]); return; } await updateAll(null);
  });
  ecmd(['VIEWEDIT'], 'Sửa hình chiếu: tỉ lệ, nét khuất, ký hiệu — hình chiếu phụ / mặt cắt / hình trích phụ thuộc được dựng lại theo', async () => {
    const rec = await pickView('Chọn hình chiếu cần sửa'); if(!rec) return;
    const kindT = { base: 'Hình chiếu cơ sở', proj: 'Hình chiếu phụ', sec: 'Mặt cắt', det: 'Hình trích' }[rec.k];
    const html = '<div class="acw" style="width:360px"><div class="acw-note" style="margin-bottom:6px">' + esc(kindT) + (rec.lab ? ' ' + esc(rec.lab) : '') + '</div>' +
      K.grp('Hiển thị', K.row('Tỉ lệ:', K.num('veSc', +rec.sc.toPrecision(6), { min: 1e-6 })) + '<div class="acw-row">' + K.chk('veHid', 'Hiện nét khuất', rec.hid) + '</div>' + (rec.k === 'base' ? '<div class="acw-row">' + K.chk('veShow', 'Ghi tỉ lệ dưới hình chiếu', rec.showSc) + '</div>' : '')) +
      (rec.lab ? K.grp('Ký hiệu', K.row('Ký hiệu:', K.txt('veLab', rec.lab))) : '') +
      '<div class="acw-note" style="white-space:normal">Đổi tỉ lệ hình chiếu cha thì các hình chiếu phụ và mặt cắt đổi theo, hình trích giữ hệ số phóng.</div></div>';
    const res = await new Promise(res => A.dialog({ title: 'Sửa hình chiếu', cls: 'acw-free', help: 'VIEWEDIT', html, ok: root => res({ sc: num(root.querySelector('#veSc').value), hid: root.querySelector('#veHid').checked ? 1 : 0, show: !!(root.querySelector('#veShow') && root.querySelector('#veShow').checked), lab: root.querySelector('#veLab') ? root.querySelector('#veLab').value.trim().toUpperCase() : null }), cancel: () => res(null) }));
    if(!res) return;
    const f = res.sc > 0 ? res.sc / rec.sc : 1;
    rec.hid = res.hid; if(rec.k === 'base') rec.showSc = res.show; if(res.lab) rec.lab = res.lab;
    if(Math.abs(f - 1) > 1e-12){ const c = rec._c || rec.at; const scaleAround = r => { r.at = { x: c.x + (r.at.x - c.x) * f, y: c.y + (r.at.y - c.y) * f }; if(r._c) r._c = { x: c.x + (r._c.x - c.x) * f, y: c.y + (r._c.y - c.y) * f }; r.sc *= f; };
      // giữ tâm hình chiếu này; con (không phải hình trích) đổi tỉ lệ theo
      const keepC = rec._c ? { x: rec._c.x, y: rec._c.y } : null; scaleAround(rec); if(keepC) rec._c = keepC;
      for(const ch of descend([rec.id])) if(ch !== rec){ if(ch.k === 'det' && ch.par !== rec.id) continue; if(ch.k === 'det'){ ch.det = Object.assign({}, ch.det, { c: { x: c.x + (ch.det.c.x - c.x) * f, y: c.y + (ch.det.c.y - c.y) * f }, r: ch.det.r * f, w: ch.det.w ? ch.det.w * f : ch.det.w, h: ch.det.h ? ch.det.h * f : ch.det.h }); ch.sc *= f; continue; }
        ch.sc *= f; if(ch.k === 'sec') mapCut(ch, q => ({ x: c.x + (q.x - c.x) * f, y: c.y + (q.y - c.y) * f }));
        const cc = ch._c || ch.at; const dx = (cc.x - c.x) * (f - 1), dy = (cc.y - c.y) * (f - 1); const nc = { x: cc.x + dx, y: cc.y + dy }; ch.at = { x: nc.x - (cc.x - ch.at.x) * f, y: nc.y - (cc.y - ch.at.y) * f }; ch._c = null; }
      rec._c = null; }
    await regen(descend([rec.id]), 'VIEWEDIT', { fresh: true }); log('VIEWEDIT: đã cập nhật hình chiếu.');
  });
  /* VIEWSTD / VIEWSECTIONSTYLE / VIEWDETAILSTYLE */
  plain(['VIEWSTD'], 'Tiêu chuẩn hình chiếu (Drafting Standard): góc chiếu thứ nhất (TCVN / ISO) hoặc thứ ba, nét khuất và tỉ lệ mặc định', () => {
    const html = '<div class="acw" style="width:380px">' + K.grp('Phương pháp chiếu', '<div class="acw-row">' + K.rad('vsP', '1', 'Góc chiếu thứ nhất (TCVN, ISO)', STD.proj !== 3) + '</div><div class="acw-row">' + K.rad('vsP', '3', 'Góc chiếu thứ ba (ANSI)', STD.proj === 3) + '</div>') +
      K.grp('Mặc định cho hình chiếu mới', '<div class="acw-row">' + K.chk('vsH', 'Hiện nét khuất', STD.hid) + '</div>' + K.row('Tỉ lệ:', K.num('vsS', STD.sc || 1, { min: 1e-6 }))) + '</div>';
    A.dialog({ title: 'Tiêu chuẩn hình chiếu', cls: 'acw-free', help: 'VIEWSTD', html, ok: root => { STD.proj = K.radio(root, 'vsP') === '3' ? 3 : 1; STD.hid = root.querySelector('#vsH').checked ? 1 : 0; const s = num(root.querySelector('#vsS').value); if(s > 0) STD.sc = s; lsSet(STD_K, STD); log('VIEWSTD: ' + (STD.proj === 3 ? 'góc chiếu thứ ba' : 'góc chiếu thứ nhất') + '.'); } });
  });
  plain(['VIEWSECTIONSTYLE'], 'Kiểu mặt cắt: cỡ chữ ký hiệu, mũi tên, nhãn "MẶT CẮT", mẫu gạch và tỉ lệ gạch', () => {
    const html = '<div class="acw" style="width:380px">' + K.grp('Ký hiệu và mũi tên', K.row('Cao chữ ký hiệu:', K.num('ssT', SST.th, { min: 0.01 })) + K.row('Cỡ mũi tên:', K.num('ssA', SST.arr, { min: 0.01 }))) +
      K.grp('Nhãn hình chiếu', K.row('Chữ đầu nhãn:', K.txt('ssL', SST.lab)) + K.row('Cao chữ nhãn:', K.num('ssLT', SST.lth, { min: 0.01 })) + '<div class="acw-row">' + K.chk('ssS', 'Ghi tỉ lệ khi khác hình chiếu cha', SST.showSc) + '</div>') +
      K.grp('Mặt cắt', K.row('Mẫu gạch:', K.txt('ssP', SST.pat)) + K.row('Hệ số tỉ lệ gạch:', K.num('ssPS', SST.psc, { min: 1e-6 }))) + '</div>';
    A.dialog({ title: 'Kiểu mặt cắt', cls: 'acw-free', help: 'VIEWSECTIONSTYLE', html, ok: root => { const v = id => num(root.querySelector('#' + id).value); SST.th = v('ssT') || SST.th; SST.arr = v('ssA') || SST.arr; SST.lab = root.querySelector('#ssL').value.trim() || 'MẶT CẮT'; SST.lth = v('ssLT') || SST.lth; SST.showSc = root.querySelector('#ssS').checked ? 1 : 0; SST.pat = root.querySelector('#ssP').value.trim().toUpperCase() || 'ANSI31'; SST.psc = v('ssPS') || SST.psc; lsSet(SST_K, SST); log('Kiểu mặt cắt đã lưu — VIEWUPDATE để áp cho mặt cắt có sẵn.'); } });
  });
  plain(['VIEWDETAILSTYLE'], 'Kiểu hình trích: cỡ chữ ký hiệu, nhãn "HÌNH TRÍCH", hệ số phóng mặc định, vùng tròn / chữ nhật', () => {
    const html = '<div class="acw" style="width:380px">' + K.grp('Ký hiệu', K.row('Cao chữ ký hiệu:', K.num('dsT', DST.th, { min: 0.01 }))) +
      K.grp('Nhãn hình chiếu', K.row('Chữ đầu nhãn:', K.txt('dsL', DST.lab)) + K.row('Cao chữ nhãn:', K.num('dsLT', DST.lth, { min: 0.01 })) + '<div class="acw-row">' + K.chk('dsS', 'Ghi tỉ lệ', DST.showSc) + '</div>') +
      K.grp('Mặc định', K.row('Hệ số phóng:', K.num('dsF', DST.f, { min: 1e-6 })) + K.row('Vùng trích:', K.sel('dsH', [['C', 'Tròn'], ['R', 'Chữ nhật']], DST.shape))) + '</div>';
    A.dialog({ title: 'Kiểu hình trích', cls: 'acw-free', help: 'VIEWDETAILSTYLE', html, ok: root => { const v = id => num(root.querySelector('#' + id).value); DST.th = v('dsT') || DST.th; DST.lab = root.querySelector('#dsL').value.trim() || 'HÌNH TRÍCH'; DST.lth = v('dsLT') || DST.lth; DST.showSc = root.querySelector('#dsS').checked ? 1 : 0; DST.f = v('dsF') || DST.f; DST.shape = root.querySelector('#dsH').value; lsSet(DST_K, DST); log('Kiểu hình trích đã lưu.'); } });
  });

  /* ---- lưu / mở: thông số hình chiếu nằm trong DVDCAD_DATA, đối tượng mang dvw → gom lại thành hình chiếu ---- */
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); try{
      DV.clear(); seq = 0; const L = A._dvwFromFile; A._dvwFromFile = null;
      if(Array.isArray(L)) for(const r of L){ if(!r || !(r.id > 0)) continue; DV.set(r.id, r); seq = Math.max(seq, r.id); }
      const ids = new Set(); for(const e of ME()){ const t = tagOf(e); if(!t) continue; const id = parseInt(t, 10); if(!DV.has(id)){ delete e.dvw; continue; } e.grp = 'DV' + id + (t.endsWith('/a') ? 'a' : ''); e.blk = '*DVIEW'; ids.add(id); }
      for(const id of [...DV.keys()]) if(!ids.has(id)) DV.delete(id);
    }catch(err){ console.warn('dview', err); } }; })(A.onLoad);
  A._dvRegistry = DV;
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
