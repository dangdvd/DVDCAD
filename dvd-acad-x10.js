/* DVDCAD v4w — bổ sung các lệnh còn thiếu so với AutoCAD
   DIM (kích thước thông minh) · MLEDIT (nối tường MLINE: chữ thập, chữ T, góc) · ATTSYNC / BATTMAN (đồng bộ / quản lý thuộc tính khối)
   MLEADEREDIT / MLEADERALIGN / MLEADERCOLLECT · PLINE / PEDIT độ rộng + TRACE (lưu DXF giữ độ rộng) · 3DSCALE
   FILTER (lọc chọn nhiều điều kiện, lưu bộ lọc) · PASTEBLOCK · LIMITS · POLAR · VISUALSTYLES · DWGCOMPARE */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x10 || !window.DVDCmd) return; A._x10 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const hl = arr => { try{ const c = A.cur(); if(c){ c.hl = arr || []; A.paint(); } }catch(_){} };

  /* =====================================================================
     1) DIM — kích thước thông minh (một lệnh cho mọi loại, như AutoCAD 2016+)
        bấm vào đường → thẳng / chéo · đường tròn → đường kính · cung → bán kính · bấm đường thứ hai → góc
        bấm vào chỗ trống hoặc bắt điểm → kích thước theo 2 điểm (tự ngang / dọc theo vị trí đặt)
     ===================================================================== */
  const dimable = e => e && !A.isLocked(e) && /^(LINE|CIRCLE|ARC|POLYLINE)$/.test(e.type) && !e.dimd && !(e.grp && /^\*(DIM|LEADER)/i.test(String(e.blk || '')));
  function entAt(r){
    if(!r || !r.pt || r.typed) return null;
    if(r.snap && !/^(nea|per|tan)$/.test(r.snap.type || r.snap.k || '')) return null;   // đang bắt điểm (đầu, giữa, tâm…) → hiểu là điểm
    try{ const s = toScreen(r.pt.x, r.pt.y); return A.pickAt(s, { filter: dimable }); }catch(_){ return null; }
  }
  const autoPhi = (p1, p2, L) => { const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);
    const inX = L.x > x0 && L.x < x1, inY = L.y > y0 && L.y < y1; if(inX && !inY) return 0; if(inY && !inX) return 90; return Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y) ? 0 : 90; };
  function segOf(e, pt){
    if(e.type === 'LINE') return [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
    const V = e.vertices || []; let best = null, bd = Infinity; const m = e.closed ? V.length : V.length - 1;
    for(let i = 0; i < m; i++){ const a = V[i], b = V[(i + 1) % V.length]; const d = segDist(pt, a, b); if(d < bd){ bd = d; best = [a, b]; } }
    // đoạn cong của đa tuyến (nhiều đỉnh mẫu): lấy dây cung của cả cung nếu có bv
    try{ const bv = A.bvOf && A.bvOf(e); if(bv && best){ const n = bv.length, mm = e.closed ? n : n - 1; for(let i = 0; i < mm; i++){ const a = bv[i], b = bv[(i + 1) % n]; if(!a.bulge) continue; const c = G.bulgeArc(a, b, a.bulge); if(c && Math.abs(Math.hypot(pt.x - c.cx, pt.y - c.cy) - c.r) < bd + 1e-9) return { arc: { cx: c.cx, cy: c.cy, r: c.r } }; } } }catch(_){}
    return best ? [{ x: best[0].x, y: best[0].y }, { x: best[1].x, y: best[1].y }] : null;
  }
  function segDist(p, a, b){ const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let t = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); }
  async function dimRound(e){
    let dia = e.type === 'CIRCLE';
    for(;;){
      const r = await A.getPoint('Chỉ định vị trí kích thước ' + (dia ? 'đường kính' : 'bán kính'), { kw: [{ k: dia ? 'R' : 'D', t: dia ? 'Bán kính' : 'Đường kính' }], rubber: false, preview: (g, p) => g.ents(A.dimRadPreview(e, p, dia)) });
      if(r.kw){ dia = !dia; continue; } if(!r.pt) return false;
      A.commit({ add: A.makeDimRad(e, r.pt, dia) }); return true;
    }
  }
  async function dimAng(a, b){
    const V = window.lineIntersect(a, b); if(!V){ log('Hai đường song song — không ghi được kích thước góc.'); return false; }
    const d1 = Math.atan2(a.y2 - a.y1, a.x2 - a.x1), d2 = Math.atan2(b.y2 - b.y1, b.x2 - b.x1); hl([a, b]);
    const r = await A.getPoint('Chỉ định vị trí cung kích thước góc', { rubber: false, preview: (g, p) => g.ents(A.dimAngPreview(V, d1, d2, p)) }); hl([]); if(!r.pt) return false;
    const d = A.makeDimAng(V, d1, d2, r.pt); if(!d) return false; A.commit({ add: d }); return true;
  }
  async function dimTwo(p1, p2, fixedPhi){
    let mode = null;
    for(;;){
      const phiOf = L => mode === 'H' ? 0 : mode === 'V' ? 90 : mode === 'A' ? Math.atan2(p2.y - p1.y, p2.x - p1.x) * R2D : fixedPhi != null ? fixedPhi : autoPhi(p1, p2, L);
      const r = await A.getPoint('Chỉ định vị trí đường kích thước', { kw: [{ k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }, { k: 'A', t: 'Chéo' }], rubber: false, preview: (g, p) => g.ents(A.dimLinPreview(p1, p2, p, phiOf(p))) });
      if(r.kw){ mode = r.kw; fixedPhi = null; continue; } if(!r.pt) return false;
      const d = A.makeDimLinear(p1, p2, r.pt, phiOf(r.pt), 'thẳng'); if(!d){ log('Hai điểm trùng theo phương đo.'); return false; } A.commit({ add: d }); return true;
    }
  }
  async function dimObj(e, pt){
    if(e.type === 'CIRCLE' || e.type === 'ARC') return dimRound(e);
    const s = segOf(e, pt || { x: 0, y: 0 }); if(!s) return false;
    if(s.arc) return dimRound(Object.assign({ type: 'ARC' }, s.arc));
    const [p1, p2] = s; hl([e]);
    const aligned = Math.abs(p2.x - p1.x) > 1e-9 && Math.abs(p2.y - p1.y) > 1e-9; let mode = aligned ? 'A' : null;
    for(;;){
      const phiOf = L => mode === 'H' ? 0 : mode === 'V' ? 90 : mode === 'A' ? Math.atan2(p2.y - p1.y, p2.x - p1.x) * R2D : autoPhi(p1, p2, L);
      const r = await A.getPoint('Vị trí đường kích thước, hoặc bấm đường thứ hai (kích thước góc)', { kw: [{ k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }, { k: 'A', t: 'Chéo' }, { k: 'G', t: 'Góc với đường khác' }], rubber: false, preview: (g, p) => g.ents(A.dimLinPreview(p1, p2, p, phiOf(p))) });
      if(r.kw === 'G'){ const b = await A.getEnt('Chọn đường thứ hai', { filter: x => x.type === 'LINE' && x !== e }); if(!b.ent){ hl([]); return false; } const L1 = e.type === 'LINE' ? e : { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }; return dimAng(L1, b.ent); }
      if(r.kw){ mode = r.kw; continue; }
      if(!r.pt){ hl([]); return false; }
      const e2 = entAt(r); if(e2 && e2 !== e && e2.type === 'LINE'){ const L1 = e.type === 'LINE' ? e : { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }; return dimAng(L1, e2); }
      hl([]); const d = A.makeDimLinear(p1, p2, r.pt, phiOf(r.pt), aligned && mode === 'A' ? 'chéo' : 'thẳng'); if(!d) return false; A.commit({ add: d }); return true;
    }
  }
  cmd(['DIM', 'DIMSMART'], 'Kích thước thông minh: bấm đường → thẳng/chéo, tròn → đường kính, cung → bán kính, 2 đường → góc, hoặc chỉ 2 điểm', async () => {
    let n = 0;
    for(;;){
      const r = await A.getPoint('DIM: bấm đối tượng hoặc chỉ định gốc đường gióng thứ nhất (Enter = chọn đối tượng)');
      if(r.none){ const s = await A.getEnt('Chọn đối tượng cần ghi kích thước (Enter = thôi)', { filter: dimable }); if(!s.ent) break; if(await dimObj(s.ent, s.pt || null)) n++; continue; }
      if(!r.pt) break;
      const e = entAt(r); if(e){ if(await dimObj(e, r.pt)) n++; continue; }
      const r2 = await A.getPoint('Chỉ định gốc đường gióng thứ hai', { base: r.pt }); if(!r2.pt) break;
      if(await dimTwo(r.pt, r2.pt)) n++;
    }
    if(n) log('DIM: đã ghi ' + n + ' kích thước.');
  });

  /* =====================================================================
     2) MLEDIT — sửa chỗ giao của đường đôi (tường MLINE)
     ===================================================================== */
  const isML = e => e && e.grp && e.blk === '*MLINE';
  const pv = p => p.closed && p.vertices.length > 2 ? p.vertices.concat([p.vertices[0]]) : p.vertices;   // đỉnh kể cả đoạn khép
  function mlInfo(e){
    if(!isML(e)) return null; const mem = A.groupMembers(e.grp); const pl = mem.filter(x => x.type === 'POLYLINE' && (x.vertices || []).length >= 2); if(!pl.length) return null;
    if(pl.some(x => x.mlk == null)){   // MLINE cũ: xếp thứ tự theo khoảng lệch tại đỉnh đầu
      const r = pl[0].vertices, a = r[0], b = r[1], L = dist(a, b) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L; const off = q => (q.vertices[0].x - a.x) * nx + (q.vertices[0].y - a.y) * ny;
      const vals = [...new Set(pl.map(q => +off(q).toFixed(6)))].sort((x, y) => x - y); for(const q of pl) q.mlk = vals.indexOf(+off(q).toFixed(6)); }
    const ks = [...new Set(pl.map(x => x.mlk))].sort((x, y) => x - y);
    const lines = ks.map(k => { const pieces = pl.filter(x => x.mlk === k); const chain = []; for(const p of pieces) for(const v of pv(p)){ const l = chain[chain.length - 1]; if(!l || dist(l, v) > 1e-9) chain.push({ x: v.x, y: v.y }); } return { k, pieces, chain }; });
    return { gid: e.grp, mem, pl, caps: mem.filter(x => x.type === 'LINE'), lines, outer: [lines[0], lines[lines.length - 1]], closed: pl.some(x => x.closed) };
  }
  const bandOf = I => I.outer[0].chain.concat(I.outer[1].chain.slice().reverse());
  // giao 2 đoạn: trả về t trên đoạn ab, u trên đoạn cd
  function segX(a, b, c, d){ const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y }; const den = r.x * s.y - r.y * s.x; if(Math.abs(den) < 1e-14) return null;
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den; return { t, u, x: a.x + r.x * t, y: a.y + r.y * t }; }
  // phần của đường gấp khúc V nằm NGOÀI đa giác poly
  function splitOutside(V, poly){
    const out = []; let cur = [];
    for(let i = 0; i < V.length - 1; i++){
      const a = V[i], b = V[i + 1]; const ts = [0, 1];
      for(let j = 0; j < poly.length; j++){ const x = segX(a, b, poly[j], poly[(j + 1) % poly.length]); if(x && x.t > 1e-9 && x.t < 1 - 1e-9 && x.u >= -1e-9 && x.u <= 1 + 1e-9) ts.push(x.t); }
      ts.sort((x, y) => x - y);
      for(let k = 0; k < ts.length - 1; k++){ const t0 = ts[k], t1 = ts[k + 1]; if(t1 - t0 < 1e-12) continue; const p = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 }, q = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
        const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
        if(!G.ptInPoly(m, poly)){ if(!cur.length) cur.push(p); cur.push(q); } else if(cur.length){ if(cur.length >= 2) out.push(cur); cur = []; } }
    }
    if(cur.length >= 2) out.push(cur); return out;
  }
  // tỉa / kéo dài đầu "end" của đường gấp khúc V tới đường N (gấp khúc): lấy giao điểm GẦN ĐẦU ĐÓ NHẤT
  // (trên thân đường hoặc trên phần kéo dài của đoạn cuối). Trả về { V, s } — s: vị trí đầu mới tính từ đầu xa.
  function trimExtendS(V, end, N){
    const W = end === 'last' ? V.slice() : V.slice().reverse(); const n = W.length; const S = [0]; for(let i = 1; i < n; i++) S.push(S[i - 1] + dist(W[i - 1], W[i])); const L = S[n - 1];
    const cand = [];
    for(let i = 0; i < n - 1; i++){ const sl = S[i + 1] - S[i]; for(let j = 0; j < N.length - 1; j++){ const x = segX(W[i], W[i + 1], N[j], N[j + 1]); if(x && x.t > 1e-9 && x.t <= 1 + 1e-9 && x.u >= -1e-9 && x.u <= 1 + 1e-9) cand.push({ s: S[i] + x.t * sl, i, x }); } }
    { const a = W[n - 2], b = W[n - 1], sl = S[n - 1] - S[n - 2]; let best = null;
      for(let pass = 0; pass < 2 && !best; pass++) for(let j = 0; j < N.length - 1; j++){ const x = segX(a, b, N[j], N[j + 1]); if(!x || x.t <= 1 + 1e-9) continue; if(pass === 0 && (x.u < -1e-9 || x.u > 1 + 1e-9)) continue; if(!best || x.t < best.t) best = x; }
      if(best) cand.push({ s: S[n - 2] + best.t * sl, i: n - 2, x: best }); }
    if(!cand.length) return null; cand.sort((p, q) => Math.abs(p.s - L) - Math.abs(q.s - L)); const c = cand[0];
    const R = W.slice(0, c.i + 1).concat([{ x: c.x.x, y: c.x.y }]); return { V: end === 'last' ? R : R.reverse(), s: c.s };
  }
  const trimExtend = (V, end, N) => { const r = trimExtendS(V, end, N); return r ? r.V : null; };
  // khoảng cách từ điểm tới đường gấp khúc
  const polyDist = (p, V) => { let d = Infinity; for(let i = 0; i < V.length - 1; i++) d = Math.min(d, segDist(p, V[i], V[i + 1])); return d; };
  // cắt bỏ đoạn giữa 2 điểm p, q nằm trên đường gấp khúc V
  function cutBetween(V, p, q, tol, closed){
    const S = [0]; for(let i = 1; i < V.length; i++) S.push(S[i - 1] + dist(V[i - 1], V[i]));
    const param = x => { let best = null; for(let i = 0; i < V.length - 1; i++){ const a = V[i], b = V[i + 1], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let t = L2 ? ((x.x - a.x) * dx + (x.y - a.y) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(x.x - a.x - t * dx, x.y - a.y - t * dy); if(d <= tol && (!best || d < best.d)) best = { d, s: S[i] + t * Math.sqrt(L2) }; } return best ? best.s : null; };
    let s1 = param(p), s2 = param(q); if(s1 == null || s2 == null) return null; if(s1 > s2){ const t = s1; s1 = s2; s2 = t; }
    const at = s => { for(let i = 0; i < V.length - 1; i++) if(s <= S[i + 1] + 1e-12){ const t = (s - S[i]) / ((S[i + 1] - S[i]) || 1); return { x: V[i].x + (V[i + 1].x - V[i].x) * t, y: V[i].y + (V[i + 1].y - V[i].y) * t }; } return V[V.length - 1]; };
    const sub = (s0, s1b) => { const R = [at(s0)]; for(let i = 1; i < V.length - 1; i++) if(S[i] > s0 + 1e-12 && S[i] < s1b - 1e-12) R.push(V[i]); R.push(at(s1b)); return R; };
    if(closed && s2 - s1 > S[S.length - 1] / 2) return [sub(s1, s2)];   // vòng khép: chỗ mở vắt qua đỉnh đầu
    const out = []; if(s1 > 1e-9) out.push(sub(0, s1)); if(s2 < S[S.length - 1] - 1e-9) out.push(sub(s2, S[S.length - 1]));
    if(closed && out.length === 2) return [out[1].concat(out[0].slice(1))];   // vòng khép: nối 2 phần thành 1 đường
    return out;
  }
  function endNear(I, other){   // đầu nào của MLINE I gần chỗ nối: gần điểm bấm trên MLINE kia (nếu có), không thì gần MLINE kia
    const c = I.lines[0].chain, a = c[0], b = c[c.length - 1];
    if(other.pick) return dist(a, other.pick) <= dist(b, other.pick) ? 'first' : 'last';
    const oc = other.outer[0].chain.concat(other.outer[1].chain); return polyDist(a, oc) <= polyDist(b, oc) ? 'first' : 'last';
  }
  async function pickML(prompt){ const r = await A.getEnt(prompt, { filter: isML }); if(!r.ent) return null; const I = mlInfo(r.ent); if(!I){ log('Không đọc được đường đôi này.'); return null; } I.pick = r.pt || null; return I; }
  cmd(['MLEDIT'], 'Sửa chỗ giao đường đôi (MLINE): chữ thập kín / hở / liền, chữ T kín / hở, góc', async () => {
    const k = await A.getKw('Kiểu nối', { kw: [{ k: 'CC', t: 'Chữ thập kín' }, { k: 'OC', t: 'Chữ thập hở' }, { k: 'MC', t: 'Chữ thập liền' }, { k: 'CT', t: 'Chữ T kín' }, { k: 'OT', t: 'Chữ T hở' }, { k: 'CJ', t: 'Góc' }], def: 'Chữ T hở' });
    const kind = k.kw || (k.none ? 'OT' : null); if(!kind) return;
    for(;;){
      const I1 = await pickML(kind === 'CJ' ? 'Chọn đường đôi thứ nhất' : /T$/.test(kind) ? 'Chọn đường đôi thứ nhất (thân chữ T)' : 'Chọn đường đôi thứ nhất (bị cắt)'); if(!I1) return;
      if(I1.closed && (/T$/.test(kind) || kind === 'CJ')){ log('Đường đôi khép kín không làm thân chữ T / góc được — chọn nó làm đường thứ hai.'); continue; } hl(I1.mem);
      const I2 = await pickML('Chọn đường đôi thứ hai'); hl([]); if(!I2) return; if(I2.gid === I1.gid){ log('Chọn 2 đường đôi khác nhau.'); continue; }
      if(I2.closed && kind === 'CJ'){ log('Đường đôi khép kín không nối góc được.'); continue; }
      const res = mlApply(kind, I1, I2); if(!res){ log('Hai đường đôi không giao nhau ở chỗ nối.'); continue; }
      A.commit(res, 'MLEDIT: đã nối'); log('MLEDIT: đã sửa chỗ giao (' + ({ CC: 'chữ thập kín', OC: 'chữ thập hở', MC: 'chữ thập liền', CT: 'chữ T kín', OT: 'chữ T hở', CJ: 'góc' })[kind] + ').');
    }
  });
  // trả về { del, add } hoặc null
  function mlApply(kind, I1, I2){
    const del = [], add = [];
    const mkPiece = (src, V) => { const w = copy(src); w.vertices = V.map(p => ({ x: p.x, y: p.y })); w.closed = false; delete w.bv; delete w.bvs; delete w.wq; return w; };
    const cutLines = (I, lines, band) => { let changed = false; for(const L of lines){ const outL = []; let touched = false; for(const p of L.pieces){ const PV = pv(p); const parts = splitOutside(PV, band); if(parts.length === 1 && parts[0].length === PV.length && parts[0].every((v, i) => dist(v, PV[i]) < 1e-9)){ outL.push(p); continue; } touched = true; for(const V of parts) outL.push(mkPiece(p, V)); }
        if(touched){ changed = true; for(const p of L.pieces) del.push(p); for(const p of outL) add.push(L.pieces.includes(p) ? copy(p) : p); } } return changed; };
    if(kind === 'CC' || kind === 'OC' || kind === 'MC'){
      const b1 = bandOf(I1), b2 = bandOf(I2); let ch = false;
      if(kind === 'CC') ch = cutLines(I1, I1.lines, b2);
      if(kind === 'OC'){ ch = cutLines(I1, I1.lines, b2); ch = cutLines(I2, I2.outer[0] === I2.outer[1] ? [I2.outer[0]] : I2.outer, b1) || ch; }
      if(kind === 'MC'){ ch = cutLines(I1, I1.outer[0] === I1.outer[1] ? [I1.outer[0]] : I1.outer, b2); ch = cutLines(I2, I2.outer[0] === I2.outer[1] ? [I2.outer[0]] : I2.outer, b1) || ch; }
      return ch ? { del, add } : null;
    }
    const pieceAt = (L, end) => { const c = L.chain, P = end === 'last' ? c[c.length - 1] : c[0]; return L.pieces.find(p => { const v = p.vertices; return dist(end === 'last' ? v[v.length - 1] : v[0], P) < 1e-6; }) || null; };
    const capsNear = (I, pt, r) => I.caps.filter(c => Math.hypot((c.x1 + c.x2) / 2 - pt.x, (c.y1 + c.y2) / 2 - pt.y) <= r);
    const width = I => { const a = I.outer[0].chain, b = I.outer[1].chain; return polyDist(a[0], b) || polyDist(a[a.length - 1], b) || 0; };
    if(kind === 'CT' || kind === 'OT'){
      const end = endNear(I1, I2);
      // mép gần của đường đôi thứ hai = mép mà thân chữ T gặp trước (tính từ đầu xa, quanh chỗ nối)
      const ref = I1.lines[0], rA = trimExtendS(ref.chain, end, I2.outer[0].chain), rB = trimExtendS(ref.chain, end, I2.outer[1].chain);
      if(!rA && !rB) return null; const N = !rB || (rA && rA.s <= rB.s) ? I2.outer[0] : I2.outer[1];
      const newEnds = []; const c0 = I1.lines[0].chain; const endPt = end === 'last' ? c0[c0.length - 1] : c0[0];
      for(const L of I1.lines){ const p = pieceAt(L, end); if(!p) continue; const V = trimExtend(p.vertices, end, N.chain); if(!V) return null; del.push(p); add.push(mkPiece(p, V)); newEnds.push({ k: L.k, pt: end === 'last' ? V[V.length - 1] : V[0] }); }
      if(!newEnds.length) return null;
      for(const c of capsNear(I1, endPt, width(I1) * 0.75 + 1e-9)) del.push(c);
      if(kind === 'OT' && newEnds.length >= 2){ const pa = newEnds[0].pt, pb = newEnds[newEnds.length - 1].pt; const tol = Math.max(1e-6, width(I2) * 1e-3);
        const outN = []; let touched = false; for(const p of N.pieces){ const r = cutBetween(pv(p), pa, pb, tol, !!p.closed); if(!r){ outN.push(p); continue; } touched = true; for(const V of r) if(V.length >= 2 && dist(V[0], V[V.length - 1]) > 1e-9) outN.push(mkPiece(p, V)); }
        if(touched){ for(const p of N.pieces) del.push(p); for(const p of outN) add.push(N.pieces.includes(p) ? copy(p) : p); } }
      return { del, add };
    }
    if(kind === 'CJ'){
      const e1 = endNear(I1, I2), e2 = endNear(I2, I1);
      const farOf = (I, end) => { const c = I.lines[0].chain; return end === 'last' ? c[0] : c[c.length - 1]; };
      const f1 = farOf(I1, e1), f2 = farOf(I2, e2);
      const endSeg = (L, end) => { const c = L.chain; return end === 'last' ? [c[c.length - 2], c[c.length - 1]] : [c[1], c[0]]; };
      const lineD = (p, s) => { const dx = s[1].x - s[0].x, dy = s[1].y - s[0].y, L = Math.hypot(dx, dy) || 1; return Math.abs((p.x - s[0].x) * dy - (p.y - s[0].y) * dx) / L; };
      const r1 = I1.lines.slice().sort((a, b) => lineD(f2, endSeg(b, e1)) - lineD(f2, endSeg(a, e1)));   // xa thân MLINE kia = mép ngoài
      const r2 = I2.lines.slice().sort((a, b) => lineD(f1, endSeg(b, e2)) - lineD(f1, endSeg(a, e2)));
      const n = Math.min(r1.length, r2.length); if(!n) return null;
      const big = s => { const dx = s[1].x - s[0].x, dy = s[1].y - s[0].y, L = Math.hypot(dx, dy) || 1, K = 1e7; return [{ x: s[1].x - dx / L * K, y: s[1].y - dy / L * K }, { x: s[1].x + dx / L * K, y: s[1].y + dy / L * K }]; };
      const c1 = I1.lines[0].chain, c2 = I2.lines[0].chain; const ep1 = e1 === 'last' ? c1[c1.length - 1] : c1[0], ep2 = e2 === 'last' ? c2[c2.length - 1] : c2[0];
      for(let i = 0; i < n; i++){ const a = r1[i], b = r2[i]; const pa = pieceAt(a, e1), pb = pieceAt(b, e2); if(!pa || !pb) continue;
        const Va = trimExtend(pa.vertices, e1, big(endSeg(b, e2))), Vb = trimExtend(pb.vertices, e2, big(endSeg(a, e1))); if(!Va || !Vb) return null;
        del.push(pa, pb); add.push(mkPiece(pa, Va), mkPiece(pb, Vb)); }
      for(const c of capsNear(I1, ep1, width(I1) * 0.75 + 1e-9)) del.push(c); for(const c of capsNear(I2, ep2, width(I2) * 0.75 + 1e-9)) del.push(c);
      return add.length ? { del, add } : null;
    }
    return null;
  }
  A.mlApply = mlApply; A.mlInfo = mlInfo;

  /* =====================================================================
     3) THUỘC TÍNH KHỐI — ATTSYNC (đồng bộ theo định nghĩa) · BATTMAN (quản lý thuộc tính)
     ===================================================================== */
  const inv = m => { const det = m.a * m.d - m.b * m.c; if(Math.abs(det) < 1e-300) return null; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; };
  const isBlk = e => e && e.grp && e.bm && e.bm.name && !String(e.blk || '').startsWith('*');
  const instances = name => { const m = new Map(); for(const e of modelEntities) if(e && e.grp && e.bm && e.bm.name === name){ let a = m.get(e.grp); if(!a){ a = []; m.set(e.grp, a); } a.push(e); } return m; };
  // danh sách định nghĩa thuộc tính của khối (toạ độ trong khối): từ thư viện / file, hoặc từ một bản chèn mẫu
  function attDefs(name, src, sample){
    try{ for(const s of [src, 'lib', 'file']){ if(!s) continue; const B = A.blockPrims && A.blockPrims(name, s); if(B && B.prims){ const L = B.prims.filter(p => p.attdef).map(p => ({ tag: p.attdef.tag, prompt: p.attdef.prompt || p.attdef.tag, def: p.attdef.def || '', prim: deep(p), src: s })); if(L.length) return L; } } }catch(_){}
    if(sample && sample.length){ const f = sample[0], Mi = inv(f.bm); if(!Mi) return [];
      return sample.filter(x => x.att).map(x => { const loc = A.xformEnt(copy(x), Mi); const p = Object.assign({}, loc); delete p.att; delete p.attp; delete p.grp; delete p.blk; delete p.bm; delete p.bip; p.attdef = { tag: x.att, prompt: x.attp || x.att, def: '' }; return { tag: x.att, prompt: x.attp || x.att, def: '', prim: p, src: 'inst' }; }); }
    return [];
  }
  // đồng bộ mọi bản chèn của khối với danh sách thuộc tính defs (giữ giá trị đang có theo tên thuộc tính)
  // keepPos: true = giữ thuộc tính của bản chèn · false = theo định nghĩa, giữ lớp / màu của bản chèn (ATTSYNC) · 'def' = hoàn toàn theo định nghĩa (BATTMAN)
  function syncAtts(name, defs, keepPos){
    const del = [], add = []; let nInst = 0;
    for(const [gid, mem] of instances(name)){
      const f = mem.find(x => !x.att) || mem[0]; const M = f.bm; const old = mem.filter(x => x.att); const byTag = new Map(old.map(x => [x.att, x]));
      for(const x of old) del.push(x); nInst++;
      defs.forEach((d, i) => { const o = byTag.get(d.tag); let w;
        if(o && keepPos === true){ w = copy(o); }
        else { w = A.xformEnt(deep(d.prim), M); delete w.attdef; delete w.userAdded; if(o && keepPos !== 'def'){ for(const k of ['layer', 'col', 'bl', 'lw', 'ff', 'style']) if(o[k] != null) w[k] = o[k]; } else { if(!w.layer || w.layer === '0'){ w.layer = M.lay || f.layer || '0'; } if(!w.col) w.col = A.layerHex(w.layer); } }
        w.type = 'TEXT'; w.att = d.tag; w.attp = d.prompt; w.text = o ? (o.text || '') : (d.def || ''); w.attOrd = i; w.grp = gid; w.blk = f.blk; w.bm = M; if(f.bip) w.bip = f.bip;
        // chế độ thuộc tính (BATTMAN / ATTDEF): ẩn, hằng số, xác nhận, đặt sẵn, khoá vị trí, nhiều dòng
        const md = (d.prim && d.prim.attdef && d.prim.attdef.mode) || {}; for(const [k, f2] of [['inv', 'ainv'], ['ver', 'aver'], ['pre', 'apre'], ['lock', 'alock'], ['ml', 'aml']]){ if(md[k]) w[f2] = 1; else delete w[f2]; }
        if(md.con){ w.acon = 1; w.text = d.def || ''; } else delete w.acon;
        add.push(w); });
    }
    return { del, add, nInst };
  }
  A.syncAtts = syncAtts; A.attDefs = attDefs;
  cmd(['ATTSYNC'], 'Đồng bộ thuộc tính các bản chèn khối theo định nghĩa (thêm thuộc tính mới, bỏ thuộc tính thừa, giữ giá trị)', async () => {
    const r = await A.getEnt('Chọn một khối (hoặc Enter để nhập tên)', { filter: isBlk }); let name, src, sample = null;
    if(r.ent){ name = r.ent.bm.name; src = r.ent.bm.src; sample = A.groupMembers(r.ent.grp); }
    else { const s = await A.getStr('Tên khối'); if(!s.str) return; name = s.str.trim(); }
    let defs = attDefs(name, src, null); let fromInst = false;
    if(!defs.length && sample){ defs = attDefs(name, null, sample); fromInst = true; }
    if(!defs.length){ log('Khối "' + name + '" không có định nghĩa thuộc tính.'); return; }
    const res = syncAtts(name, defs, false); if(!res.nInst){ log('Không có bản chèn nào của khối "' + name + '".'); return; }
    A.commit({ del: res.del, add: res.add }, 'ATTSYNC: ' + res.nInst + ' khối "' + name + '"');
    log('ATTSYNC: đồng bộ ' + res.nInst + ' bản chèn "' + name + '" theo ' + (fromInst ? 'bản chèn đã chọn' : 'định nghĩa khối') + ' (' + defs.length + ' thuộc tính: ' + defs.map(d => d.tag).join(', ') + ').');
  });
  function blocksWithAtts(){ const s = new Map(); for(const e of modelEntities) if(e && e.att && e.bm && e.bm.name && !String(e.blk || '').startsWith('*')) if(!s.has(e.bm.name)) s.set(e.bm.name, e); try{ const L = A.blockLib ? A.blockLib() : {}; for(const n of Object.keys(L)) if((L[n].ents || []).some(p => p.attdef) && !s.has(n)) s.set(n, null); }catch(_){} return s; }
  plain(['BATTMAN'], 'Quản lý thuộc tính khối: sửa lời nhắc, giá trị mặc định, thứ tự, xoá thuộc tính — rồi đồng bộ mọi bản chèn', () => { if(A.busy && A.busy()) A.cancel(true); battman(); });
  function battman(pre){
    const all = blocksWithAtts(); if(!all.size){ say('Bản vẽ chưa có khối nào có thuộc tính.'); return; }
    const names = [...all.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    let name = pre && all.has(pre) ? pre : names[0]; let rows = [];
    const load = () => { const smp = all.get(name); const src = smp && smp.bm ? smp.bm.src : 'lib'; let d = attDefs(name, src, null); if(!d.length && smp) d = attDefs(name, null, A.groupMembers(smp.grp)); rows = d.map(x => Object.assign({}, x)); };
    load();
    const table = () => '<div class="lm-tbl"><table><thead><tr><th>Thuộc tính</th><th>Lời nhắc</th><th>Mặc định</th><th style="width:96px"></th></tr></thead><tbody>' + rows.map((r, i) => '<tr data-i="' + i + '"><td><b>' + esc(r.tag) + '</b></td><td><input data-f="prompt" value="' + esc(r.prompt) + '" style="width:100%"></td><td><input data-f="def" value="' + esc(r.def) + '" style="width:100%"></td><td><button type="button" data-a="up" title="Lên">↑</button><button type="button" data-a="dn" title="Xuống">↓</button><button type="button" data-a="rm" title="Xoá">✕</button></td></tr>').join('') + '</tbody></table></div>';
    const cnt = () => instances(name).size;
    A.dialog({ title: 'Quản lý thuộc tính khối (BATTMAN)', wide: true, okText: 'Áp dụng & đồng bộ', html:
      '<label class="dvd-frow"><span>Khối</span><span class="v"><select id="bmName">' + names.map(n => '<option' + (n === name ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select> <span id="bmCnt" style="opacity:.7"></span></span></label><div id="bmTbl"></div><p style="opacity:.75;font-size:12px;margin:6px 0 0">Giá trị đang nhập trong từng khối được giữ nguyên. Thuộc tính bị xoá sẽ mất khỏi mọi bản chèn.</p>',
      onOpen: root => {
        const draw = () => { root.querySelector('#bmTbl').innerHTML = table(); root.querySelector('#bmCnt').textContent = cnt() + ' bản chèn'; };
        const grab = () => root.querySelectorAll('#bmTbl tr[data-i]').forEach(tr => { const r = rows[+tr.dataset.i]; tr.querySelectorAll('input[data-f]').forEach(inp => { r[inp.dataset.f] = inp.value; }); });
        draw();
        root.querySelector('#bmName').addEventListener('change', ev => { name = ev.target.value; load(); draw(); });
        root.querySelector('#bmTbl').addEventListener('click', ev => { const b = ev.target.closest('button[data-a]'); if(!b) return; grab(); const i = +b.closest('tr').dataset.i;
          if(b.dataset.a === 'up' && i > 0) rows.splice(i - 1, 0, rows.splice(i, 1)[0]); if(b.dataset.a === 'dn' && i < rows.length - 1) rows.splice(i + 1, 0, rows.splice(i, 1)[0]); if(b.dataset.a === 'rm') rows.splice(i, 1); draw(); });
        root._grab = grab;
      },
      ok: root => { root._grab && root._grab(); battApply(name, rows); } });
  }
  function battApply(name, rows){
    const defs = rows.map(r => { const prim = deep(r.prim); prim.attdef = { tag: r.tag, prompt: r.prompt || r.tag, def: r.def || '' }; return { tag: r.tag, prompt: r.prompt || r.tag, def: r.def || '', prim }; });
    // khối trong thư viện của tôi: cập nhật định nghĩa
    try{ const L = A.blockLib(); const B = L[name]; if(B){ const others = (B.ents || []).filter(p => !p.attdef); B.ents = others.concat(defs.map(d => d.prim)); A.saveBlockLib(L); } }catch(_){}
    const res = syncAtts(name, defs, true);
    if(res.nInst) A.commit({ del: res.del, add: res.add }, 'BATTMAN: ' + name);
    log('BATTMAN: khối "' + name + '" có ' + defs.length + ' thuộc tính, đã đồng bộ ' + res.nInst + ' bản chèn.');
  }
  A.battApply = battApply;

  /* =====================================================================
     4) GHI CHÚ DẪN — MLEADEREDIT (thêm / bỏ mũi tên) · MLEADERALIGN · MLEADERCOLLECT
     ===================================================================== */
  const isLD = e => e && e.grp && e.blk === '*LEADER';
  function ldInfo(gid){
    const mem = A.groupMembers(gid); const t = mem.find(x => x.type === 'TEXT'); if(!t) return null;
    let pts = t.ldp ? t.ldp.map(p => ({ x: p.x, y: p.y })) : null;
    if(!pts){   // ghi chú dẫn cũ: dựng lại từ hình
      const land = mem.filter(x => x.type === 'LINE' && Math.abs(x.y1 - x.y2) < 1e-9 && Math.abs(x.y1 - t.y) < 1e-6 * Math.max(1, Math.abs(t.y)) + 1e-9)[0];
      const paths = mem.filter(x => x.type === 'POLYLINE' && !x.closed && (x.vertices || []).length >= 2).sort((a, b) => b.vertices.length - a.vertices.length || plen(b.vertices) - plen(a.vertices));
      const sol = mem.find(x => x.type === 'SOLID'); let path = paths.find(p => land && dist(p.vertices[p.vertices.length - 1], { x: land.x1, y: land.y1 }) < 1e-6) || paths[0]; if(!path) return null;
      pts = path.vertices.map(p => ({ x: p.x, y: p.y })); if(sol) pts[0] = { x: sol.pts[0].x, y: sol.pts[0].y }; }
    return { gid, mem, t, pts, more: (t.ldx || []).map(a => a.map(p => ({ x: p.x, y: p.y }))), text: t.text || '', h: t.h || A.leaderTxtH() };
  }
  const plen = V => { let s = 0; for(let i = 1; i < V.length; i++) s += dist(V[i - 1], V[i]); return s; };
  function ldBuild(I){
    const ents = A.leaderEnts(I.pts, I.text, I.h); const land = I.pts[I.pts.length - 1];
    for(const m of I.more){ const ex = A.leaderEnts(m.concat([land]), '', I.h); ex.pop(); for(const e of ex) ents.push(e); }   // bỏ gờ trùng
    const base = I.mem.find(x => x.type !== 'TEXT') || I.t;
    for(const e of ents){ for(const k of ['layer', 'col', 'bl', 'lw']) if(base[k] != null) e[k] = base[k]; e.grp = I.gid; e.blk = '*LEADER';
      if(e.type === 'TEXT'){ for(const k of ['layer', 'col', 'bl', 'ff', 'style', 'anno']) if(I.t[k] != null) e[k] = I.t[k]; e.ldp = I.pts.map(p => ({ x: p.x, y: p.y })); if(I.more.length) e.ldx = I.more; } }
    return ents;
  }
  A.ldInfo = ldInfo; A.ldBuild = ldBuild;
  cmd(['MLEADEREDIT', 'MLE', 'AIMLEADEREDITADD', 'AIMLEADEREDITREMOVE'], 'Thêm / bỏ đường dẫn (mũi tên) của ghi chú dẫn', async () => {
    const r = await A.getEnt('Chọn ghi chú dẫn', { filter: isLD }); if(!r.ent) return; let I = ldInfo(r.ent.grp); if(!I){ log('Không đọc được ghi chú dẫn này.'); return; }
    const k = await A.getKw('Tuỳ chọn', { kw: [{ k: 'A', t: 'Thêm đường dẫn' }, { k: 'R', t: 'Bỏ đường dẫn' }], def: 'Thêm đường dẫn' }); const mode = k.kw || 'A';
    if(mode === 'A'){ const land = I.pts[I.pts.length - 1];
      for(;;){ const p = await A.getPoint('Chỉ định đầu mũi tên mới (Enter = xong)', { base: land, preview: (g, q) => g.ents(A.leaderEnts([q, land], '', I.h).slice(0, -1)) }); if(!p.pt) break;
        I.more.push([p.pt]); const ents = ldBuild(I); A.commit({ del: I.mem, add: ents }, 'Đã thêm đường dẫn'); I = ldInfo(I.gid); }
      return; }
    for(;;){
      const all = [I.pts].concat(I.more); if(all.length < 2){ log('Ghi chú chỉ còn 1 đường dẫn.'); return; }
      const p = await A.getPoint('Bấm gần đầu mũi tên cần bỏ (Enter = xong)'); if(!p.pt) return;
      let bi = 0, bd = Infinity; all.forEach((a, i) => { const d = dist(a[0], p.pt); if(d < bd){ bd = d; bi = i; } });
      if(bi === 0){ const nx = I.more.shift(); I.pts = nx.concat([I.pts[I.pts.length - 1]]); } else I.more.splice(bi - 1, 1);
      A.commit({ del: I.mem, add: ldBuild(I) }, 'Đã bỏ đường dẫn'); I = ldInfo(I.gid);
    }
  });
  cmd(['MLEADERALIGN', 'MLA'], 'Căn thẳng hàng các ghi chú dẫn theo một ghi chú mẫu', async () => {
    const s = await A.getSel('Chọn các ghi chú dẫn cần căn', { filter: isLD }); const gids = [...new Set((s.sel || []).filter(isLD).map(e => e.grp))]; if(gids.length < 2){ log('Cần chọn ít nhất 2 ghi chú dẫn.'); return; }
    const r = await A.getEnt('Chọn ghi chú dẫn làm mẫu', { filter: isLD }); if(!r.ent) return; const R = ldInfo(r.ent.grp); if(!R) return; const O = R.pts[R.pts.length - 1];
    const d = await A.getPoint('Chỉ định hướng thẳng hàng (Enter = dọc)', { base: O }); let ux = 0, uy = 1; if(d.pt){ const L = dist(d.pt, O); if(L > 1e-9){ ux = (d.pt.x - O.x) / L; uy = (d.pt.y - O.y) / L; } }
    const del = [], add = []; let n = 0;
    for(const g of gids){ if(g === R.gid) continue; const I = ldInfo(g); if(!I) continue; const P = I.pts[I.pts.length - 1]; const t = (P.x - O.x) * ux + (P.y - O.y) * uy; const Q = { x: O.x + ux * t, y: O.y + uy * t };
      const Lm = I.pts.length; I.pts[Lm - 1] = Q; if(Lm > 2 && dist(I.pts[Lm - 2], Q) < 1e-9) I.pts.splice(Lm - 2, 1); for(const x of I.mem) del.push(x); for(const x of ldBuild(I)) add.push(x); n++; }
    if(n) A.commit({ del, add }, 'Đã căn ' + n + ' ghi chú dẫn'); log('MLEADERALIGN: căn ' + n + ' ghi chú theo mẫu.');
  });
  cmd(['MLEADERCOLLECT', 'MLC'], 'Gom nhiều ghi chú dẫn thành một (một nội dung, nhiều mũi tên)', async () => {
    const s = await A.getSel('Chọn các ghi chú dẫn cần gom', { filter: isLD }); const gids = [...new Set((s.sel || []).filter(isLD).map(e => e.grp))]; if(gids.length < 2){ log('Cần chọn ít nhất 2 ghi chú dẫn.'); return; }
    const L = gids.map(ldInfo).filter(Boolean); if(L.length < 2) return;
    const k = await A.getKw('Gộp nội dung', { kw: [{ k: 'N', t: 'Nối các dòng' }, { k: 'F', t: 'Giữ nội dung ghi chú đầu' }], def: 'Nối các dòng' });
    L.sort((a, b) => b.pts[b.pts.length - 1].y - a.pts[a.pts.length - 1].y);
    const M = L[0]; const texts = []; for(const I of L){ if(I.text && !texts.includes(I.text)) texts.push(I.text); }
    if(k.kw !== 'F') M.text = texts.join('\n');
    for(const I of L.slice(1)){ M.more.push(I.pts.slice(0, -1).length ? I.pts.slice(0, -1) : [I.pts[0]]); for(const m of I.more) M.more.push(m); }
    const del = []; for(const I of L) for(const x of I.mem) del.push(x);
    A.commit({ del, add: ldBuild(M) }, 'Đã gom ' + L.length + ' ghi chú dẫn'); log('MLEADERCOLLECT: gom ' + L.length + ' ghi chú thành 1 (' + (M.more.length + 1) + ' mũi tên).');
  });

  /* =====================================================================
     5) ĐỘ RỘNG ĐA TUYẾN — TRACE · giữ tứ giác tô khi dời / xoay / tỉ lệ / đối xứng
     ===================================================================== */
  cmd(['TRACEWIDE', 'TRACELINE'], 'Vẽ nét đậm có độ rộng (tô đặc) — lệnh TRACE cũ của AutoCAD; TRACE nay là vết can (Trace)', async () => {
    const w = await A.getDist('Độ rộng nét', { def: A.MEM && A.MEM.trw || 1 }); if(!(w.num > 0)) return; if(A.MEM) A.MEM.trw = w.num;
    const r = await A.getPoint('Điểm đầu'); if(!r.pt) return; const P = [r.pt];
    for(;;){ const q = await A.getPoint('Điểm tiếp theo', { base: P[P.length - 1], kw: P.length > 1 ? [{ k: 'U', t: 'Bỏ đoạn' }] : [] }); if(q.kw === 'U'){ if(P.length > 1) P.pop(); continue; } if(!q.pt) break; if(dist(q.pt, P[P.length - 1]) > 1e-12) P.push(q.pt); }
    if(P.length < 2) return; const e = A.widthPoly(P.map(p => ({ x: p.x, y: p.y, bulge: 0, sw: w.num, ew: w.num })), false); A.newProps(e); A.commit({ add: [e] }, 'Đã vẽ TRACE');
  });
  { const mq = (e, f) => { if(e && e.wq) e.wq = e.wq.map(q => q.map(f)); };
    const _t = window.translateEnt; window.translateEnt = function(e, dx, dy){ const r = _t.apply(this, arguments); mq(e, p => ({ x: p.x + dx, y: p.y + dy })); return r; };
    const _r = window.rotateEnt; window.rotateEnt = function(e, deg, c){ const r = _r.apply(this, arguments); const a = deg * D2R, co = Math.cos(a), si = Math.sin(a); mq(e, p => ({ x: c.x + (p.x - c.x) * co - (p.y - c.y) * si, y: c.y + (p.x - c.x) * si + (p.y - c.y) * co })); return r; };
    const _s = window.scaleEnt; window.scaleEnt = function(e, f, c){ const r = _s.apply(this, arguments); mq(e, p => ({ x: c.x + (p.x - c.x) * f, y: c.y + (p.y - c.y) * f })); return r; };
    const _m = window.mirrorAcross; if(_m) window.mirrorAcross = function(e, P1, P2){ const r = _m.apply(this, arguments); let dx = P2.x - P1.x, dy = P2.y - P1.y; const L = Math.hypot(dx, dy); if(L > 1e-9){ dx /= L; dy /= L; mq(e, p => { const wx = p.x - P1.x, wy = p.y - P1.y, d = wx * dx + wy * dy; return { x: P1.x + 2 * d * dx - wx, y: P1.y + 2 * d * dy - wy }; }); } return r; }; }

  /* =====================================================================
     6) 3DSCALE — tỉ lệ khối 3D (cả chiều cao) quanh điểm gốc
     ===================================================================== */
  const is3D = e => e && e.type === 'SOLID3D';
  function scale3(e, f, b){
    const w = copy(e); const sp = p => ({ x: b.x + (p.x - b.x) * f, y: b.y + (p.y - b.y) * f });
    if(w.k === 'mesh' || w.v){ const m = w.k === 'mesh' ? w : A.toMesh(e); const v = m.v.slice(); for(let i = 0; i < v.length; i += 3){ v[i] = b.x + (v[i] - b.x) * f; v[i + 1] = b.y + (v[i + 1] - b.y) * f; v[i + 2] = b.z + (v[i + 2] - b.z) * f; }
      const o = A.meshEnt(v, m.f.slice(), e); if(!o) return null; for(const k of Object.keys(e)) if(!(k in o) && !/^(k|v|f|pts|holes|cx|cy|r|r2|z0|h|tri|userAdded)$/.test(k)) o[k] = deep(e[k]); return o; }
    if(w.pts) w.pts = w.pts.map(sp); if(w.holes) w.holes = w.holes.map(h => h.map(sp));
    if(w.cx != null){ const q = sp({ x: w.cx, y: w.cy }); w.cx = q.x; w.cy = q.y; }
    for(const k of ['r', 'r2', 'h']) if(w[k] != null) w[k] *= f;
    w.z0 = b.z + ((w.z0 || 0) - b.z) * f; return w;
  }
  A.scale3 = scale3;
  cmd(['3DSCALE', '3DS'], 'Tỉ lệ khối 3D (cả chiều cao) quanh điểm gốc', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: is3D }); const sel = (s.sel || []).filter(e => is3D(e) && !A.isLocked(e)); if(!sel.length){ log('Không có khối 3D nào.'); return; }
    const p = await A.getPoint('Điểm gốc trên mặt bằng'); if(!p.pt) return; const z = await A.getNum('Cao độ Z của điểm gốc', { def: 0 }); const b = { x: p.pt.x, y: p.pt.y, z: z.num || 0 };
    const f = await A.getNum('Hệ số tỉ lệ', { def: 2 }); if(!(f.num > 0)) return;
    const rep = []; for(const e of sel){ const w = scale3(e, f.num, b); if(w) rep.push([e, w]); }
    A.commit({ rep }, '3DSCALE ×' + f.num); log('3DSCALE: ' + rep.length + ' khối × ' + f.num + '.');
  });

  /* =====================================================================
     7) FILTER — lọc chọn theo nhiều điều kiện cùng lúc, lưu bộ lọc
     ===================================================================== */
  const FK = 'dvd:filters';
  const TYPES = [['', '(mọi loại)'], ['LINE', 'Đường thẳng'], ['POLYLINE', 'Đa tuyến'], ['CIRCLE', 'Đường tròn'], ['ARC', 'Cung'], ['ELLIPSE', 'Elip'], ['TEXT', 'Chữ'], ['HATCH', 'Hatch'], ['POINT', 'Điểm'], ['SOLID', 'Mặt tô'], ['XLINE', 'Đường vô hạn'], ['SOLID3D', 'Khối 3D'], ['IMAGE', 'Ảnh'], ['*BLOCK', 'Khối (block)'], ['*DIM', 'Kích thước']];
  const fList = () => { try{ return JSON.parse(localStorage.getItem(FK) || '{}'); }catch(_){ return {}; } };
  const lenOf = e => { try{ if(e.type === 'LINE') return dist({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }); if(e.type === 'CIRCLE') return 2 * Math.PI * e.r; if(e.type === 'ARC'){ let s = (e.a2 - e.a1) % 360; if(s <= 0) s += 360; return e.r * s * D2R; } if(e.type === 'POLYLINE'){ let s = plen(e.vertices || []); if(e.closed && e.vertices.length > 2) s += dist(e.vertices[0], e.vertices[e.vertices.length - 1]); return s; } }catch(_){} return null; };
  function fTest(F){
    const num = v => v === '' || v == null ? null : parseFloat(String(v).replace(',', '.'));
    const lmin = num(F.lmin), lmax = num(F.lmax), rmin = num(F.rmin), rmax = num(F.rmax), hmin = num(F.hmin), hmax = num(F.hmax);
    const lay = (F.layer || '').trim().toLowerCase(), txt = (F.text || '').trim().toLowerCase(), col = (F.color || '').trim().toLowerCase(), lt = (F.lt || '').trim().toUpperCase(), blk = (F.blk || '').trim().toLowerCase();
    const wild = (pat, v) => { if(!pat) return true; if(!/[*?]/.test(pat)) return v === pat; const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); return re.test(v); };
    return e => {
      if(F.type){ if(F.type === '*BLOCK'){ if(!(e.grp && e.bm && !String(e.blk || '').startsWith('*'))) return false; } else if(F.type === '*DIM'){ if(!(e.grp && /^\*DIM/.test(String(e.blk || '')))) return false; } else if(e.type !== F.type) return false; }
      if(lay && !wild(lay, String(e.layer || '0').toLowerCase())) return false;
      if(col){ const c = String(e.col || '').toLowerCase(); if(col === 'bylayer'){ if(!e.bl) return false; } else if(/^\d+$/.test(col)){ if(A.aciNear(e.col || '#ffffff') !== +col) return false; } else if(c !== (col[0] === '#' ? col : '#' + col)) return false; }
      if(lt && String(e.lt || A.layerLT(e.layer || '0') || 'CONTINUOUS').toUpperCase() !== lt) return false;
      if(blk && !wild(blk, String((e.bm && e.bm.name) || e.blk || '').toLowerCase())) return false;
      if(txt){ if(e.type !== 'TEXT' || !wild(txt.includes('*') || txt.includes('?') ? txt : '*' + txt + '*', String(e.text || '').toLowerCase())) return false; }
      if(lmin != null || lmax != null){ const L = lenOf(e); if(L == null || (lmin != null && L < lmin) || (lmax != null && L > lmax)) return false; }
      if(rmin != null || rmax != null){ if(e.r == null || (rmin != null && e.r < rmin) || (rmax != null && e.r > rmax)) return false; }
      if(hmin != null || hmax != null){ if(e.type !== 'TEXT' || (hmin != null && (e.h || 0) < hmin) || (hmax != null && (e.h || 0) > hmax)) return false; }
      return true; };
  }
  function fApply(F, scope){ const t = fTest(F); const base = (scope === 'sel' ? [...selEnts] : (A.selectable ? A.selectable() : modelEntities)).filter(e => e && !A.isLocked(e) && !(A.isHiddenE && A.isHiddenE(e)));
    let hit = base.filter(e => F.not ? !t(e) : t(e)); hit = [...A.expandGroups(new Set(hit))]; selEnts.clear(); for(const e of hit) selEnts.add(e); try{ refreshPanSel(); }catch(_){} A.paint(); return hit.length; }
  A.filterSelect = fApply; A.filterTest = fTest;
  plain(['FILTER', 'FI'], 'Lọc chọn theo nhiều điều kiện (loại, lớp, màu, kiểu nét, khối, chữ, chiều dài, bán kính, cao chữ) — lưu được bộ lọc', () => { if(A.busy && A.busy()) A.cancel(true); filterDlg(); });
  function filterDlg(){
    const saved = fList(); const lays = A.layerNames();
    const inp = (id, ph, w) => '<input id="' + id + '" placeholder="' + esc(ph || '') + '" style="width:' + (w || '100%') + '">';
    const R = A.formRow || ((l, h) => '<label class="dvd-frow"><span>' + l + '</span><span class="v">' + h + '</span></label>');
    A.dialog({ title: 'Lọc chọn (FILTER)', wide: true, okText: 'Chọn', html:
      R('Bộ lọc đã lưu', '<select id="fSaved"><option value="">—</option>' + Object.keys(saved).map(n => '<option>' + esc(n) + '</option>').join('') + '</select> <button type="button" id="fSave">Lưu…</button> <button type="button" id="fDel">Xoá</button>') +
      R('Áp dụng cho', '<select id="fScope"><option value="all">Toàn bản vẽ</option>' + (selEnts.size ? '<option value="sel" selected>Tập đang chọn (' + selEnts.size + ')</option>' : '') + '</select>') +
      R('Loại đối tượng', '<select id="fType">' + TYPES.map(([v, t]) => '<option value="' + v + '">' + esc(t) + '</option>').join('') + '</select>') +
      R('Lớp (dùng được * ?)', '<input id="fLayer" list="fLays" style="width:100%"><datalist id="fLays">' + lays.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>') +
      R('Màu (#rrggbb, số ACI, bylayer)', inp('fColor', 'VD: 1 hoặc #ff0000')) + R('Kiểu nét', inp('fLt', 'VD: DASHED')) + R('Tên khối (* ?)', inp('fBlk', 'VD: CUA*')) + R('Chữ chứa', inp('fText', 'VD: D100')) +
      R('Chiều dài từ … đến', inp('fLmin', 'min', '45%') + ' ' + inp('fLmax', 'max', '45%')) + R('Bán kính từ … đến', inp('fRmin', 'min', '45%') + ' ' + inp('fRmax', 'max', '45%')) + R('Cao chữ từ … đến', inp('fHmin', 'min', '45%') + ' ' + inp('fHmax', 'max', '45%')) +
      '<label style="display:block;margin-top:6px"><input type="checkbox" id="fNot"> Đảo ngược (chọn những đối tượng KHÔNG khớp)</label>',
      onOpen: root => {
        const F = ['type', 'layer', 'color', 'lt', 'blk', 'text', 'lmin', 'lmax', 'rmin', 'rmax', 'hmin', 'hmax']; const id = k => '#f' + k[0].toUpperCase() + k.slice(1);
        const get = () => { const o = {}; for(const k of F) o[k] = root.querySelector(id(k)).value; o.not = root.querySelector('#fNot').checked; return o; };
        const put = o => { for(const k of F) root.querySelector(id(k)).value = o[k] || ''; root.querySelector('#fNot').checked = !!o.not; };
        root._get = get;
        root.querySelector('#fSaved').addEventListener('change', ev => { const o = fList()[ev.target.value]; if(o) put(o); });
        root.querySelector('#fSave').addEventListener('click', () => { const n = prompt('Tên bộ lọc:', root.querySelector('#fSaved').value || 'Bộ lọc ' + (Object.keys(fList()).length + 1)); if(!n) return; const all = fList(); all[n] = get(); try{ localStorage.setItem(FK, JSON.stringify(all)); }catch(_){} const s = root.querySelector('#fSaved'); if(![...s.options].some(o => o.value === n)){ const o = document.createElement('option'); o.textContent = n; s.appendChild(o); } s.value = n; say('Đã lưu bộ lọc "' + n + '"'); });
        root.querySelector('#fDel').addEventListener('click', () => { const s = root.querySelector('#fSaved'); const n = s.value; if(!n) return; const all = fList(); delete all[n]; try{ localStorage.setItem(FK, JSON.stringify(all)); }catch(_){} s.querySelector('option:checked').remove(); s.value = ''; });
      },
      ok: root => { const n = fApply(root._get(), root.querySelector('#fScope').value); log('FILTER: chọn ' + n + ' đối tượng.'); say('Đã chọn ' + n + ' đối tượng'); } });
  }

  /* =====================================================================
     8) Lệnh nhỏ: PASTEBLOCK · LIMITS · POLAR · VISUALSTYLES · DWGCOMPARE
     ===================================================================== */
  cmd(['PASTEBLOCK'], 'Dán bộ nhớ tạm thành một khối (Ctrl+Shift+V kiểu AutoCAD)', async () => {
    const c = A.getClip ? A.getClip() : null; if(!c || !c.ents || !c.ents.length){ log('Bộ nhớ tạm trống — COPYCLIP (Ctrl+C) trước.'); return; }
    const r = await A.getPoint('Chỉ định điểm chèn', { rubber: false, preview: (g, p) => g.shift(c.ents, p.x - c.base.x, p.y - c.base.y, '#cfe3ff') }); if(!r.pt) return;
    const name = 'A$C' + Math.random().toString(16).slice(2, 10).toUpperCase(); const gid = A.newGroupId('B'); const lay = A.LS.cur || '0';
    const bm = { name, src: 'clip', lay, a: 1, b: 0, c: 0, d: 1, e: r.pt.x, f: r.pt.y };
    const add = c.ents.map(e => { const w = deep(e); delete w.userAdded; window.translateEnt(w, r.pt.x - c.base.x, r.pt.y - c.base.y); w.grp = gid; w.blk = name; w.bm = bm; w.bip = { x: r.pt.x, y: r.pt.y }; return w; });
    A.commit({ add }, 'Đã dán thành khối ' + name); log('PASTEBLOCK: khối "' + name + '" (' + add.length + ' đối tượng).');
  });
  const LIMK = () => 'dvd:limits::' + (typeof currentName !== 'undefined' ? currentName : '');
  const loadLim = () => { try{ A.limits = JSON.parse(localStorage.getItem(LIMK()) || 'null'); }catch(_){ A.limits = null; } };
  loadLim();
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); loadLim(); }; })(A.onLoad);
  A.limitOK = p => !A.limits || !A.limits.on || (p.x >= A.limits.x0 - 1e-9 && p.x <= A.limits.x1 + 1e-9 && p.y >= A.limits.y0 - 1e-9 && p.y <= A.limits.y1 + 1e-9);
  cmd(['LIMITS'], 'Giới hạn bản vẽ (góc dưới trái / trên phải); BẬT = không cho vẽ ra ngoài', async () => {
    const L = A.limits || { x0: 0, y0: 0, x1: 420, y1: 297, on: false };
    const r = await A.getPoint('Góc dưới trái', { kw: [{ k: 'ON', t: 'Bật kiểm tra' }, { k: 'OFF', t: 'Tắt kiểm tra' }], def: A.fmt(L.x0) + ',' + A.fmt(L.y0) });
    if(r.kw === 'ON' || r.kw === 'OFF'){ L.on = r.kw === 'ON'; A.limits = L; try{ localStorage.setItem(LIMK(), JSON.stringify(L)); }catch(_){} log('LIMITS: kiểm tra giới hạn ' + (L.on ? 'BẬT' : 'TẮT') + '.'); return; }
    const p0 = r.pt || (r.none ? { x: L.x0, y: L.y0 } : null); if(!p0) return;
    const r2 = await A.getPoint('Góc trên phải', { base: p0, rubber: false, def: A.fmt(L.x1) + ',' + A.fmt(L.y1), preview: (g, p) => g.poly([p0, { x: p.x, y: p0.y }, p, { x: p0.x, y: p.y }], true) });
    const p1 = r2.pt || (r2.none ? { x: L.x1, y: L.y1 } : null); if(!p1) return;
    A.limits = { x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y), on: !!L.on };
    try{ localStorage.setItem(LIMK(), JSON.stringify(A.limits)); }catch(_){} log('LIMITS: ' + A.fmt(A.limits.x0) + ',' + A.fmt(A.limits.y0) + ' → ' + A.fmt(A.limits.x1) + ',' + A.fmt(A.limits.y1) + ' (ghi vào $LIMMIN/$LIMMAX khi lưu DXF).');
  });
  // LIMITS bật: điểm bấm ngoài giới hạn bị từ chối (như LIMCHECK = 1)
  { const _gp = A.getPoint; A.getPoint = async function(prompt, o){ for(;;){ const r = await _gp.call(this, prompt, o); if(r && r.pt && !A.limitOK(r.pt) && !(o && o.noLim)){ log('**Ngoài giới hạn bản vẽ (LIMITS)'); continue; } return r; } }; }
  cmd(['POLAR'], 'Bắt góc cực (POLAR): bật / tắt và góc bước', async () => {
    const S = A.SET; const r = await A.getKw('POLAR đang ' + (S.polar ? 'BẬT' : 'TẮT') + ', góc bước ' + S.polarAng + '°', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }, { k: 'A', t: 'Góc bước' }], def: 'Góc bước' });
    if(r.kw === 'ON' || r.kw === 'OFF'){ A.toggle('polar', r.kw === 'ON'); A.saveSet(); log('POLAR ' + (r.kw === 'ON' ? 'BẬT' : 'TẮT') + '.'); return; }
    const a = await A.getNum('Góc bước (5, 10, 15, 18, 22.5, 30, 45, 90…)', { def: S.polarAng }); if(!(a.num > 0 && a.num <= 180)) return;
    S.polarAng = a.num; A.toggle('polar', true); A.saveSet(); log('POLAR BẬT, góc bước ' + a.num + '°.');
  });
  plain(['VISUALSTYLES', 'VSCURRENT', 'VS', 'SHADEMODE'], 'Kiểu hiển thị 3D: khung dây, tô bóng, tô bóng + cạnh, X-quang, thực tế', async () => {
    const st = [['wire', 'Khung dây'], ['shade', 'Tô bóng'], ['shedge', 'Tô bóng + cạnh'], ['xray', 'X-quang'], ['real', 'Thực tế']];
    const v = await new Promise(res => A.dialog({ title: 'Kiểu hiển thị (VISUALSTYLES)', html: '<div style="display:grid;gap:6px">' + st.map(([k, t]) => '<label><input type="radio" name="vs" value="' + k + '"' + ((localStorage.getItem('dvd:3dstyle') || 'shedge') === k ? ' checked' : '') + '> ' + t + '</label>').join('') + '</div>', ok: r => res((r.querySelector('input[name=vs]:checked') || {}).value || null), cancel: () => res(null) }));
    if(!v) return; try{ localStorage.setItem('dvd:3dstyle', v); }catch(_){}
    if(!A.view3D) DVDCmd.run('3DORBIT'); setTimeout(() => { try{ const s = document.querySelector('select[data-a="style"]'); if(s){ s.value = v; s.dispatchEvent(new Event('change')); } }catch(_){} }, 300);
  });
  plain(['DWGCOMPARE', 'COMPAREDWG'], 'So sánh 2 bản vẽ (tô màu chỗ thêm / bớt)', () => DVDCmd.run('COMPARE'));

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
