/* DVDCAD v5b — giống AutoCAD hơn:
   · Kích thước liên kết (DIMASSOC 2): sửa / dời / xoay / kéo giãn đường hình thì kích thước bám theo · DIMDISASSOCIATE · DIMREASSOCIATE · DIMASSOC
   · Đa tuyến có độ rộng giữ độ rộng khi sửa đỉnh, bo góc, dời, tỉ lệ (SCALE nhân cả độ rộng), đảo chiều, OFFSET, BREAK…
   · Lệnh mới: POLYSOLID (tường 3D) · RULESURF · TABSURF · REVSURF · EDGESURF · PLANESURF · SURFTAB1 / SURFTAB2
     VPOINT · DDVPOINT · HIDE · MINSERT · DIMROTATED · ABOUT · EXOFFSET · SAVEIMG · MTEDIT · EXCHPROP */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x14 || !window.DVDCmd) return; A._x14 = true;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const alias = (keys, target, desc) => plain(keys, desc, () => DVDCmd.run(target));
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const MEM = A.MEM || (A.MEM = {});
  const store = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem('dvd:x14:' + k)); localStorage.setItem('dvd:x14:' + k, JSON.stringify(v)); }catch(_){ return null; } };
  const bvOrV = e => (A.bvOf && A.bvOf(e)) || e.vertices || [];

  /* =====================================================================
     1) ĐA TUYẾN CÓ ĐỘ RỘNG — dựng lại phần tô (wq) từ độ rộng từng đỉnh (pw) sau mỗi lần sửa
     ===================================================================== */
  function wideFix(w){
    if(!w || w.type !== 'POLYLINE' || !Array.isArray(w.pw) || !w.pw.length) return;
    const B = bvOrV(w), n = B.length; if(n < 2){ delete w.pw; delete w.wq; return; }
    const P = w.pw, m = P.length; let W = null;
    let sz = 0; for(const q of P) sz = Math.max(sz, Math.abs(q[0]), Math.abs(q[1])); const tol = 1e-7 * (1 + sz);
    const dd = (b, q) => Math.hypot(b.x - q[0], b.y - q[1]);
    const uni = P.every(q => Math.abs(q[2] - P[0][2]) < 1e-12 && Math.abs(q[3] - P[0][2]) < 1e-12);
    if(m === n){
      let ef = 0, er = 0; for(let k = 0; k < n; k++){ ef += dd(B[k], P[k]); er += dd(B[k], P[n - 1 - k]); }
      if(n > 1 && er <= tol * n && ef > tol * n){   // đảo chiều (PEDIT R / REVERSE): độ rộng đầu ↔ cuối, đoạn theo thứ tự ngược
        W = []; for(let k = 0; k < n; k++){ const j = ((n - 2 - k) % n + n) % n; const s = P[j]; W.push([s[3], s[2]]); }
      } else {
        W = P.map(q => [q[2], q[3]]);
      }
    } else if(uni) W = B.map(() => [P[0][2], P[0][2]]);
    else W = B.map(b => { let j = 0, bd = Infinity; for(let k = 0; k < m; k++){ const d = dd(b, P[k]); if(d < bd){ bd = d; j = k; } } return [P[j][2], P[j][3]]; });
    if(W.every(x => !(x[0] > 0) && !(x[1] > 0))){ delete w.pw; delete w.wq; return; }
    w.pw = B.map((b, k) => [b.x, b.y, W[k][0], W[k][1]]);
    w.wq = polyWidthQuads(B.map((b, k) => ({ x: b.x, y: b.y, bulge: b.bulge || 0, sw: W[k][0], ew: W[k][1] })), !!w.closed);
  }
  A.wideFix = wideFix;
  // SCALE / ô nắm tỉ lệ / chèn khối có tỉ lệ: nhân cả độ rộng (như AutoCAD)
  { const _s = window.scaleEnt; window.scaleEnt = function(e, f, c){ const r = _s.apply(this, arguments); try{ if(e && Array.isArray(e.pw)){ const k = Math.abs(f); e.pw = e.pw.map(q => [c.x + (q[0] - c.x) * f, c.y + (q[1] - c.y) * f, q[2] * k, q[3] * k]); } }catch(_){} return r; }; }

  /* =====================================================================
     2) KÍCH THƯỚC LIÊN KẾT — điểm gốc kích thước trùng điểm đặc trưng của đường hình thì bám theo khi đường hình đổi
     ===================================================================== */
  if(A.SET.dimassoc == null) A.SET.dimassoc = 2;
  function arcPt(cx, cy, r, a){ return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function bulgeMid(a, b, bulge){ const dx = b.x - a.x, dy = b.y - a.y; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; const s = bulge * Math.hypot(dx, dy) / 2; const L = Math.hypot(dx, dy) || 1; return [mx + dy / L * s, my - dx / L * s]; }
  function charPts(e){
    if(!e) return [];
    switch(e.type){
      case 'LINE': return [[e.x1, e.y1], [e.x2, e.y2], [(e.x1 + e.x2) / 2, (e.y1 + e.y2) / 2]];
      case 'ARC': { const a1 = e.a1 * D2R; let sw = (e.a2 - e.a1) * D2R; while(sw <= 1e-12) sw += TAU; return [arcPt(e.cx, e.cy, e.r, a1), arcPt(e.cx, e.cy, e.r, a1 + sw), [e.cx, e.cy], arcPt(e.cx, e.cy, e.r, a1 + sw / 2)]; }
      case 'CIRCLE': return [[e.cx, e.cy], [e.cx + e.r, e.cy], [e.cx, e.cy + e.r], [e.cx - e.r, e.cy], [e.cx, e.cy - e.r]];
      case 'ELLIPSE': return isFinite(e.cx) ? [[e.cx, e.cy]] : [];
      case 'POINT': return [[e.x, e.y]];
      case 'POLYLINE': { const B = bvOrV(e), n = B.length, out = B.map(p => [p.x, p.y]); const ns = e.closed ? n : n - 1;
        for(let i = 0; i < ns; i++){ const a = B[i], b = B[(i + 1) % n]; out.push(a.bulge ? bulgeMid(a, b, a.bulge) : [(a.x + b.x) / 2, (a.y + b.y) / 2]); } return out; }
      default: return [];
    }
  }
  A.charPts = charPts;
  const isDimPart = e => !!(e && (e.dimd || e.dimx || (e.blk && String(e.blk).startsWith('*DIM'))));
  const qk = (x, y) => Math.round(x * 1e5) + ',' + Math.round(y * 1e5);
  function assocExtra(ch){
    if(!(A.SET.dimassoc > 1) || !ch || !ch.rep || !ch.rep.length) return null;
    const moved = new Map(), circ = []; const touched = new Set();
    for(const [o, w] of ch.rep){ if(o && o.grp) touched.add(o.grp); if(w && w.grp) touched.add(w.grp); }
    for(const e of (ch.del || [])) if(e && e.grp) touched.add(e.grp);
    for(const [o, w] of ch.rep){
      if(!o || !w || isDimPart(o) || o.type !== w.type) continue;
      const K0 = charPts(o), K1 = charPts(w); if(!K0.length || K0.length !== K1.length) continue;
      for(let k = 0; k < K0.length; k++){ const a = K0[k], b = K1[k]; if(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 1e-9 * (1 + Math.abs(a[0]) + Math.abs(a[1]))) continue; const key = qk(a[0], a[1]); if(!moved.has(key)) moved.set(key, { x: b[0], y: b[1] }); }
      if((o.type === 'CIRCLE' || o.type === 'ARC') && (o.cx !== w.cx || o.cy !== w.cy || o.r !== w.r)) circ.push([o, w]);
    }
    if(!moved.size && !circ.length) return null;
    const look = p => p ? moved.get(qk(p.x, p.y)) : null;
    const out = [];
    for(const t of modelEntities){
      if(t.type !== 'TEXT' || !t.dimd || t.dimx || t.dimd.na || !t.grp || touched.has(t.grp)) continue;
      const d = t.dimd; let nd = null;
      if(d.k === 'lin' && d.p1 && d.p2){
        const n1 = look(d.p1), n2 = look(d.p2); if(!n1 && !n2) continue;
        const p1 = n1 || d.p1, p2 = n2 || d.p2; nd = deep(d); nd.p1 = { x: p1.x, y: p1.y }; nd.p2 = { x: p2.x, y: p2.y };
        const a0 = Math.atan2(d.p2.y - d.p1.y, d.p2.x - d.p1.x), a1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const dphi = Math.abs(((d.phi * D2R - a0) % Math.PI + Math.PI) % Math.PI); const aligned = String(t.blk || '').includes('chéo') || (Math.min(dphi, Math.PI - dphi) < 1e-7 && d.phi % 90 !== 0);
        const L0 = Math.hypot(d.p2.x - d.p1.x, d.p2.y - d.p1.y), L1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if(aligned && L0 > 1e-12 && L1 > 1e-12){   // kích thước chéo: giữ khoảng cách đường kích thước tới đường đo, xoay theo
          const u0x = Math.cos(a0), u0y = Math.sin(a0), lx = d.L.x - d.p1.x, ly = d.L.y - d.p1.y; const along = (lx * u0x + ly * u0y) / L0, off = -lx * u0y + ly * u0x;
          const ux = Math.cos(a1), uy = Math.sin(a1); nd.L = { x: p1.x + ux * along * L1 - uy * off, y: p1.y + uy * along * L1 + ux * off }; nd.phi = a1 * R2D;
        } else if(n1 && n2){ const dx1 = n1.x - d.p1.x, dy1 = n1.y - d.p1.y, dx2 = n2.x - d.p2.x, dy2 = n2.y - d.p2.y;
          if(Math.abs(dx1 - dx2) + Math.abs(dy1 - dy2) < 1e-9 * (1 + Math.abs(d.L.x) + Math.abs(d.L.y))) nd.L = { x: d.L.x + dx1, y: d.L.y + dy1 };   // cả đối tượng dời: đường kích thước dời theo
          else { const ph = d.phi * D2R, nx = -Math.sin(ph), ny = Math.cos(ph); const mv = ((dx1 + dx2) / 2) * nx + ((dy1 + dy2) / 2) * ny; nd.L = { x: d.L.x + nx * mv, y: d.L.y + ny * mv }; }
        }
      } else if((d.k === 'rad' || d.k === 'dia') && d.c){
        const hit = circ.find(([o]) => Math.hypot(o.cx - d.c.x, o.cy - d.c.y) < 1e-7 * (1 + Math.abs(o.cx) + Math.abs(o.cy)) && Math.abs(o.r - d.r) < 1e-7 * (1 + o.r));
        if(!hit) continue; const [o, w] = hit; nd = deep(d); nd.c = { x: w.cx, y: w.cy }; nd.r = w.r;
        const vx = d.L.x - d.c.x, vy = d.L.y - d.c.y, vl = Math.hypot(vx, vy) || 1; const k = (vl - o.r + w.r) / vl; nd.L = { x: w.cx + vx * k, y: w.cy + vy * k };
      }
      if(!nd) continue; const tw = copy(t); tw.dimd = nd; out.push([t, tw]); touched.add(t.grp);
    }
    return out.length ? out : null;
  }
  A.dimAssocExtra = assocExtra;

  { const _c = A.commit;
    A.commit = function(ch, msg){
      try{
        if(ch){ for(const e of (ch.add || [])) wideFix(e); for(const x of (ch.rep || [])) if(x && x[1]) wideFix(x[1]);
          const ex = assocExtra(ch); if(ex){ ch = Object.assign({}, ch, { rep: (ch.rep || []).concat(ex) }); if(!msg) msg = undefined; } }
      }catch(err){ console.warn('x14 commit', err); }
      return _c.apply(this, [ch, msg].concat([].slice.call(arguments, 2)));
    }; }

  const dimTexts = list => { const seen = new Set(), out = []; for(const e of list){ const g = e.grp; if(!g || seen.has(g)) continue; const t = e.dimd ? e : modelEntities.find(x => x.grp === g && x.dimd && !x.dimx); if(t){ seen.add(g); out.push(t); } } return out; };
  const pickDims = async pr => { const s = await A.getSel(pr, { filter: e => isDimPart(e) }); return dimTexts(s.sel || []).filter(t => !A.isLocked(t)); };
  cmd(['DIMDISASSOCIATE', 'DDA'], 'Bỏ liên kết kích thước với đường hình (không bám theo nữa)', async () => {
    const T = await pickDims('Chọn kích thước cần bỏ liên kết'); if(!T.length) return;
    const rep = T.filter(t => !t.dimd.na).map(t => { const w = copy(t); w.dimd.na = 1; return [t, w]; }); if(rep.length) A.commit({ rep }, 'Đã bỏ liên kết ' + rep.length + ' kích thước'); log('Bỏ liên kết ' + rep.length + ' kích thước.');
  });
  cmd(['DIMREASSOCIATE', 'DRE', 'DIMREASSOC'], 'Liên kết lại kích thước: chọn lại điểm gốc trên đường hình (Enter = giữ)', async () => {
    const T = await pickDims('Chọn kích thước cần liên kết lại'); if(!T.length) return; let n = 0;
    for(const t of T){
      const d = deep(t.dimd); delete d.na;
      try{ A.highlight && A.highlight(modelEntities.filter(e => e.grp === t.grp)); }catch(_){}
      if(d.k === 'lin'){
        const r1 = await A.getPoint('Gốc đường gióng thứ nhất (Enter = giữ)', { rubber: false }); if(r1.pt) d.p1 = { x: r1.pt.x, y: r1.pt.y };
        const r2 = await A.getPoint('Gốc đường gióng thứ hai (Enter = giữ)', { base: d.p1 }); if(r2.pt) d.p2 = { x: r2.pt.x, y: r2.pt.y };
      } else if(d.k === 'rad' || d.k === 'dia'){
        const r = await A.getEnt('Chọn đường tròn / cung (Enter = giữ)', { filter: e => e.type === 'CIRCLE' || e.type === 'ARC' }); if(r.ent){ const vx = d.L.x - d.c.x, vy = d.L.y - d.c.y, vl = Math.hypot(vx, vy) || 1; d.c = { x: r.ent.cx, y: r.ent.cy }; const k = (vl - t.dimd.r + r.ent.r) / vl; d.r = r.ent.r; d.L = { x: d.c.x + vx * k, y: d.c.y + vy * k }; }
      }
      const cur = modelEntities.find(e => e.grp === t.grp && e.dimd && !e.dimx) || t; const w = copy(cur); w.dimd = d; A.commit({ rep: [[cur, w]] }); n++;
    }
    log('Đã liên kết lại ' + n + ' kích thước.');
  });
  cmd(['DIMASSOC'], 'Kích thước liên kết: 2 = bám theo đường hình (mặc định), 1 / 0 = không bám', async () => {
    const r = await A.getNum('DIMASSOC (0 / 1 / 2)', { def: A.SET.dimassoc }); if(r.num == null) return; A.SET.dimassoc = Math.max(0, Math.min(2, Math.round(r.num))); A.saveSet(); log('DIMASSOC = ' + A.SET.dimassoc + (A.SET.dimassoc > 1 ? ' (kích thước bám theo đường hình)' : ' (không bám)'));
  });

  /* DIMROTATED — kích thước thẳng theo góc cho trước */
  cmd(['DIMROTATED', 'DIMROT'], 'Kích thước thẳng xoay theo góc cho trước', async () => {
    const r = await A.getAngle('Góc đường kích thước', { def: MEM.dimRot || 0 }); if(r.num == null && !r.none) return; const phi = r.num != null ? r.num : (MEM.dimRot || 0); MEM.dimRot = phi;
    const a = await A.getPoint('Gốc đường gióng thứ nhất'); if(!a.pt) return; const b = await A.getPoint('Gốc đường gióng thứ hai', { base: a.pt }); if(!b.pt) return;
    const L = await A.getPoint('Vị trí đường kích thước', { rubber: false, preview: (g, p) => { const x = A.makeDimLinear(a.pt, b.pt, p, phi, 'xoay'); if(x) g.ents(x, '#e8eef7'); } }); if(!L.pt) return;
    const ents = A.makeDimLinear(a.pt, b.pt, L.pt, phi, 'xoay'); if(!ents){ log('Hai điểm trùng nhau theo phương đo.'); return; }
    A.commit({ add: ents }, 'Đã ghi kích thước xoay ' + phi + '°'); const t = ents.find(e => e.dimd); if(t) log('Kích thước = ' + t.text);
  });

  /* =====================================================================
     3) POLYSOLID — tường 3D theo đường vẽ hoặc đối tượng có sẵn
     ===================================================================== */
  const PS = Object.assign({ h: 3000, w: 200, j: 'C' }, store('ps') || {});
  function offsetPath(P, d, closed){
    const n = P.length, out = []; const seg = i => { const a = P[i], b = P[(i + 1) % n]; const L = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { a, b, ux: (b.x - a.x) / L, uy: (b.y - a.y) / L }; };
    const ns = closed ? n : n - 1; const S = []; for(let i = 0; i < ns; i++) S.push(seg(i));
    const off = (s, p) => ({ x: p.x - s.uy * d, y: p.y + s.ux * d });
    for(let i = 0; i < n; i++){
      const sp = closed ? S[(i - 1 + ns) % ns] : S[i - 1], sn = closed ? S[i % ns] : S[i];
      if(!sp){ out.push(off(sn, P[i])); continue; } if(!sn){ out.push(off(sp, P[i])); continue; }
      const q1 = off(sp, P[i]), q2 = off(sn, P[i]); const den = sp.ux * sn.uy - sp.uy * sn.ux;
      if(Math.abs(den) < 1e-9){ out.push(q2); continue; }
      const t = ((q2.x - q1.x) * sn.uy - (q2.y - q1.y) * sn.ux) / den; const m = { x: q1.x + sp.ux * t, y: q1.y + sp.uy * t };
      if(Math.hypot(m.x - P[i].x, m.y - P[i].y) > Math.abs(d) * 8){ out.push(q1, q2); continue; }
      out.push(m);
    }
    return out;
  }
  const area2 = p => { let s = 0; for(let i = 0; i < p.length; i++){ const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
  function wallOutline(P, closed, w, j){
    const d1 = j === 'L' ? w : j === 'R' ? 0 : w / 2, d2 = d1 - w;   // trái = phía bên trái hướng vẽ
    const a = offsetPath(P, d1, closed), b = offsetPath(P, d2, closed);
    if(!closed) return { pts: a.concat(b.reverse()), holes: [] };
    return Math.abs(area2(a)) >= Math.abs(area2(b)) ? { pts: a, holes: [b] } : { pts: b, holes: [a] };
  }
  A.wallOutline = wallOutline;
  function pathOf(e){
    if(e.type === 'LINE') return { P: [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }], closed: false };
    if(e.type === 'CIRCLE' || e.type === 'ARC'){ const c = A.G.curveOf(e); const N = Math.max(12, Math.ceil(64 * (c.u1 - c.u0) / TAU)); const P = []; const cl = e.type === 'CIRCLE'; for(let k = 0; k < (cl ? N : N + 1); k++) P.push(c.at(c.u0 + (c.u1 - c.u0) * k / N)); return { P, closed: cl }; }
    if(e.type === 'POLYLINE'){ let P = (e.vertices || []).map(p => ({ x: p.x, y: p.y })); let cl = !!e.closed; const f = P[0], l = P[P.length - 1]; if(!cl && P.length > 2 && Math.hypot(f.x - l.x, f.y - l.y) < 1e-9){ P.pop(); cl = true; } return P.length >= 2 ? { P, closed: cl } : null; }
    return null;
  }
  async function wallSolid(P, closed, base){
    const o = wallOutline(P, closed, PS.w, PS.j); const z0 = MEM.z03 || 0;
    const s = await A.makeExt(o.pts, o.holes, z0, PS.h); if(!s) return null;
    if(base){ for(const k of ['layer', 'col', 'bl']) if(base[k] != null) s[k] = base[k]; } else A.newProps(s);
    delete s.lt; s.psol = { w: PS.w, h: PS.h, j: PS.j }; return A.ucsApply ? A.ucsApply(s) : s;
  }
  cmd(['POLYSOLID', 'PSOLID'], 'Tường 3D: vẽ theo điểm hoặc chọn đường / cung / đa tuyến (Cao, Rộng, Canh)', async () => {
    const info = () => 'Cao = ' + PS.h + ', Rộng = ' + PS.w + ', Canh = ' + ({ L: 'Trái', C: 'Giữa', R: 'Phải' })[PS.j];
    log(info());
    // P: đường tâm (cung chia nhỏ thành đoạn); seg: số điểm mỗi lần nhập (Hoàn tác); chế độ Cung như AutoCAD: cung tiếp tuyến đoạn trước, hoặc qua điểm thứ hai
    const P = [], seg = []; let closed = false, arcMode = false;
    const tanDir = () => { const n = P.length; if(n < 2) return { x: 1, y: 0 }; const a = P[n - 2], b = P[n - 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / L, y: (b.y - a.y) / L }; };
    const arcPts = (S, E, M) => { let C, ccw;   // điểm chia cung S → E (bỏ S); M: điểm thứ hai (cung 3 điểm), không có M: tiếp tuyến với hướng trước
      if(M){ const ax = S.x, ay = S.y, bx = M.x, by = M.y, cx = E.x, cy = E.y, d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if(Math.abs(d) < 1e-12) return [E];
        C = { x: ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, y: ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d };
        ccw = ((M.x - S.x) * (E.y - S.y) - (M.y - S.y) * (E.x - S.x)) < 0; }
      else { const t = tanDir(), nx = -t.y, ny = t.x, cxv = E.x - S.x, cyv = E.y - S.y, dn = cxv * nx + cyv * ny; if(Math.abs(dn) < 1e-9) return [E];
        const r = (cxv * cxv + cyv * cyv) / (2 * dn); C = { x: S.x + nx * r, y: S.y + ny * r }; ccw = dn > 0; }
      const R = Math.hypot(S.x - C.x, S.y - C.y), a0 = Math.atan2(S.y - C.y, S.x - C.x); let sw = Math.atan2(E.y - C.y, E.x - C.x) - a0;
      if(ccw){ while(sw <= 0) sw += TAU; } else { while(sw >= 0) sw -= TAU; }
      const N = Math.max(4, Math.ceil(Math.abs(sw) / (TAU / 72))), out = []; for(let k = 1; k <= N; k++){ const a = a0 + sw * k / N; out.push(k === N ? { x: E.x, y: E.y } : { x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) }); } return out; };
    const prev = (g, p) => { const Q = P.concat(p ? (arcMode && P.length ? arcPts(P[P.length - 1], p) : [p]) : []); if(Q.length < 2) return; const o = wallOutline(Q, false, PS.w, PS.j); g.ents([{ type: 'POLYLINE', closed: true, vertices: o.pts }], '#9fd0ff'); };
    const push = pts => { for(const q of pts) P.push({ x: q.x, y: q.y }); seg.push(pts.length); };
    for(;;){
      const kw = P.length ? (arcMode ? [{ k: 'C', t: 'Đóng' }, { k: 'L', t: 'Đường thẳng' }, { k: 'S', t: 'Điểm thứ hai' }, { k: 'U', t: 'Hoàn tác' }] : [{ k: 'A', t: 'Cung' }, { k: 'C', t: 'Đóng' }, { k: 'U', t: 'Hoàn tác' }]) : [{ k: 'O', t: 'Đối tượng' }, { k: 'H', t: 'Cao' }, { k: 'W', t: 'Rộng' }, { k: 'J', t: 'Canh' }];
      const r = await A.getPoint(P.length ? (arcMode ? 'Điểm cuối cung' : 'Điểm tiếp theo') : 'Điểm đầu tường hoặc [Đối tượng / Cao / Rộng / Canh] <Đối tượng>', { kw, base: P[P.length - 1], preview: prev });
      if(r.kw === 'H'){ const v = await A.getDist('Chiều cao tường', { def: PS.h }); if(v.num > 0){ PS.h = v.num; store('ps', PS); } log(info()); continue; }
      if(r.kw === 'W'){ const v = await A.getDist('Bề dày tường', { def: PS.w }); if(v.num > 0){ PS.w = v.num; store('ps', PS); } log(info()); continue; }
      if(r.kw === 'J'){ const v = await A.getKw('Canh tường theo đường vẽ', { kw: [{ k: 'L', t: 'Trái' }, { k: 'C', t: 'Giữa' }, { k: 'R', t: 'Phải' }], def: PS.j }); if(v.kw){ PS.j = v.kw; store('ps', PS); } log(info()); continue; }
      if(r.kw === 'A'){ arcMode = true; continue; } if(r.kw === 'L'){ arcMode = false; continue; }
      if(r.kw === 'U'){ const k = seg.pop() || 0; P.splice(P.length - k, k); if(!P.length) seg.length = 0; continue; }
      if(r.kw === 'S'){ const m = await A.getPoint('Điểm thứ hai trên cung', { base: P[P.length - 1] }); if(!m.pt) continue; const S0 = P[P.length - 1];
        const e2 = await A.getPoint('Điểm cuối cung', { base: m.pt, preview: (g, p) => { const Q = P.concat(arcPts(S0, p, m.pt)); const o = wallOutline(Q, false, PS.w, PS.j); g.ents([{ type: 'POLYLINE', closed: true, vertices: o.pts }], '#9fd0ff'); } }); if(!e2.pt) continue; push(arcPts(S0, e2.pt, m.pt)); continue; }
      if(r.kw === 'C'){ if(P.length >= 3){ if(arcMode){ const q = P[0]; push(arcPts(P[P.length - 1], q).slice(0, -1)); } closed = true; break; } continue; }
      if(r.kw === 'O' || (r.none && !P.length)){
        const s = await A.getSel('Chọn đường / cung / tròn / đa tuyến làm đường tâm tường', { filter: e => /^(LINE|ARC|CIRCLE|POLYLINE)$/.test(e.type) && !e.wq }); const src = (s.sel || []).filter(e => !A.isLocked(e));
        const add = []; for(const e of src){ const p = pathOf(e); if(!p) continue; const so = await wallSolid(p.P, p.closed, e); if(so) add.push(so); }
        if(!add.length){ log('Không tạo được tường.'); return; }
        A.commit({ add, del: src }, 'Đã tạo ' + add.length + ' tường 3D'); log('Đã chuyển ' + add.length + ' đối tượng thành tường 3D (' + info() + ').'); return;
      }
      if(r.none || !r.pt) break;
      if(arcMode && P.length) push(arcPts(P[P.length - 1], r.pt)); else push([r.pt]);
    }
    if(P.length < 2) return;
    const so = await wallSolid(P, closed, null); if(!so){ log('Không tạo được tường.'); return; }
    A.commit({ add: [so] }, 'Đã tạo tường 3D'); log('Đã tạo tường 3D: ' + info() + '. Xem bằng lệnh 3D.');
  });

  /* =====================================================================
     4) MẶT LƯỚI: RULESURF · TABSURF · REVSURF · EDGESURF · PLANESURF (SURFTAB1 / SURFTAB2)
     ===================================================================== */
  const ST = Object.assign({ t1: 6, t2: 6 }, store('st') || {});
  for(const [k, f] of [['SURFTAB1', 't1'], ['SURFTAB2', 't2']]) cmd([k], 'Số chia mặt lưới (' + (f === 't1' ? 'hướng 1' : 'hướng 2') + ', mặc định 6 như AutoCAD)', async () => {
    const r = await A.getNum(k, { def: ST[f] }); if(r.num == null) return; ST[f] = Math.max(2, Math.min(256, Math.round(r.num))); store('st', ST); log(k + ' = ' + ST[f]);
  });
  const isCurve = e => /^(LINE|ARC|CIRCLE|POLYLINE|ELLIPSE|SPLINE|POINT)$/.test(e.type);
  // chia đường thành n đoạn bằng nhau theo tham số; đường thẳng / đa tuyến thẳng giữ đúng đỉnh (như AutoCAD)
  function sampleN(e, n){
    if(e.type === 'POINT') return Array.from({ length: n + 1 }, () => ({ x: e.x, y: e.y }));
    const c = A.G.curveOf(e); if(!c) return null; const P = []; const cl = !!c.closed;
    for(let k = 0; k <= n; k++){ const u = c.u0 + (c.u1 - c.u0) * k / n; const p = c.at(k === n && cl ? c.u0 : u); P.push({ x: p.x, y: p.y }); }
    return P;
  }
  function profilePts(e){
    if(e.type === 'LINE') return [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
    if(e.type === 'POLYLINE' && !(A.bvOf && A.bvOf(e))){ const V = (e.vertices || []).map(p => ({ x: p.x, y: p.y })); if(e.closed && V.length) V.push(Object.assign({}, V[0])); return V; }
    return sampleN(e, ST.t2);
  }
  function gridMesh(G, base, closedU, closedV){   // G[i][j] = [x, y, z]
    const P = [], I = [], nu = G.length, nv = G[0].length; const id = (i, j) => i * nv + j;
    for(const row of G) for(const q of row) P.push(q[0], q[1], q[2]);
    for(let i = 0; i < nu - 1; i++) for(let j = 0; j < nv - 1; j++){ const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1); I.push(a, b, c, a, c, d); }
    const e = A.meshEnt(P, I, base); if(!e) return null; e.srf = 1; if(!base || base.layer == null) A.newProps(e); delete e.lt; return A.ucsApply ? A.ucsApply(e) : e;
  }
  A.gridMesh = gridMesh;
  const z0 = () => MEM.z03 || 0;
  const pickOne = async (pr, f) => { const r = await A.getEnt(pr, { filter: f || isCurve }); return r.ent ? r : null; };
  const nearEnd = (e, p) => { const c = A.G.curveOf(e); if(!c || !p) return false; const a = c.at(c.u0), b = c.at(c.u1); return Math.hypot(p.x - b.x, p.y - b.y) < Math.hypot(p.x - a.x, p.y - a.y); };
  const addMesh = (e, msg) => { if(!e){ log('Không tạo được mặt lưới.'); return; } A.commit({ add: [e] }, msg); log(msg + ' (' + (e.f.length / 3) + ' tam giác). Xem bằng lệnh 3D.'); };

  cmd(['RULESURF'], 'Mặt kẻ giữa 2 đường (SURFTAB1 đoạn)', async () => {
    const r1 = await pickOne('Chọn đường cong định nghĩa thứ nhất'); if(!r1) return; const r2 = await pickOne('Chọn đường cong định nghĩa thứ hai'); if(!r2) return;
    const n = ST.t1; let a = sampleN(r1.ent, n), b = sampleN(r2.ent, n); if(!a || !b) return;
    if(nearEnd(r1.ent, r1.pt)) a.reverse(); if(nearEnd(r2.ent, r2.pt)) b.reverse();   // như AutoCAD: điểm bấm quyết định đầu nào nối với đầu nào
    const Z = z0(); addMesh(gridMesh(a.map((p, k) => [[p.x, p.y, Z], [b[k].x, b[k].y, Z]]), r1.ent), 'Đã tạo mặt kẻ RULESURF');
  });
  cmd(['TABSURF'], 'Mặt trượt: đường dẫn trượt theo véc-tơ hướng (chọn đoạn thẳng) hoặc Cao (theo phương Z)', async () => {
    const r1 = await pickOne('Chọn đường dẫn (đường, cung, tròn, đa tuyến)'); if(!r1) return;
    const k = await A.getEnt('Chọn đoạn thẳng chỉ hướng hoặc [Cao]', { filter: e => e.type === 'LINE' || e.type === 'POLYLINE', kw: [{ k: 'H', t: 'Cao (Z)' }] });
    let v = null;
    if(k.kw === 'H' || k.none){ const h = await A.getDist('Chiều cao (theo Z)', { def: MEM.tabH || 1000 }); if(!(h.num)) return; MEM.tabH = h.num; v = [0, 0, h.num]; }
    else if(k.ent){ const e = k.ent; let a, b; if(e.type === 'LINE'){ a = { x: e.x1, y: e.y1 }; b = { x: e.x2, y: e.y2 }; } else { const V = e.vertices; a = V[0]; b = V[V.length - 1]; }
      if(k.pt && Math.hypot(k.pt.x - b.x, k.pt.y - b.y) < Math.hypot(k.pt.x - a.x, k.pt.y - a.y)){ const t = a; a = b; b = t; }   /* như AutoCAD: hướng từ đầu gần điểm bấm sang đầu kia */
      v = [b.x - a.x, b.y - a.y, 0]; }
    if(!v) return; const prof = profilePts(r1.ent); if(!prof) return; const Z = z0();
    addMesh(gridMesh(prof.map(p => [[p.x, p.y, Z], [p.x + v[0], p.y + v[1], Z + v[2]]]), r1.ent), 'Đã tạo mặt trượt TABSURF');
  });
  cmd(['REVSURF'], 'Mặt tròn xoay: xoay đường biên dạng quanh trục (đoạn thẳng) — góc đầu, góc quay', async () => {
    const r1 = await pickOne('Chọn đối tượng cần xoay (biên dạng)'); if(!r1) return;
    const r2 = await A.getEnt('Chọn đối tượng làm trục xoay (đoạn thẳng)', { filter: e => e.type === 'LINE' || (e.type === 'POLYLINE' && (e.vertices || []).length >= 2) }); if(!r2.ent) return;
    const s = await A.getAngle('Góc bắt đầu', { def: 0 }); const a0 = (s.num || 0) * D2R;
    const t = await A.getAngle('Góc quay (+ = ngược chiều kim đồng hồ, 360 = kín)', { def: 360 }); const sw = (t.num != null && t.num !== 0 ? t.num : 360) * D2R;
    const e = r2.ent; let a, b; if(e.type === 'LINE'){ a = { x: e.x1, y: e.y1 }; b = { x: e.x2, y: e.y2 }; } else { const V = e.vertices; a = V[0]; b = V[V.length - 1]; }
    if(r2.pt && Math.hypot(r2.pt.x - b.x, r2.pt.y - b.y) < Math.hypot(r2.pt.x - a.x, r2.pt.y - a.y)){ const q = a; a = b; b = q; }   // chiều trục: từ đầu gần điểm bấm
    const L = Math.hypot(b.x - a.x, b.y - a.y); if(L < 1e-12) return; const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    const prof = profilePts(r1.ent); if(!prof) return; const n = ST.t1, Z = z0(); const full = Math.abs(Math.abs(sw) - TAU) < 1e-9;
    const G = []; for(let i = 0; i <= n; i++){ const th = a0 + sw * i / n, c = Math.cos(th), si = Math.sin(th); G.push(prof.map(p => { const vx = p.x - a.x, vy = p.y - a.y, al = vx * ux + vy * uy, rx = vx - al * ux, ry = vy - al * uy; const cz = ux * ry - uy * rx;
      return [a.x + al * ux + rx * c, a.y + al * uy + ry * c, Z + cz * si]; })); }
    if(full) G[n] = G[0].map(q => q.slice());
    addMesh(gridMesh(G, r1.ent), 'Đã tạo mặt tròn xoay REVSURF');
  });
  cmd(['EDGESURF'], 'Mặt Coons giới hạn bởi 4 cạnh nối đầu nhau', async () => {
    const E = []; for(let k = 1; k <= 4; k++){ const r = await pickOne('Chọn cạnh ' + k, e => /^(LINE|ARC|POLYLINE|SPLINE|ELLIPSE)$/.test(e.type) && !e.closed); if(!r) return; if(E.includes(r.ent)){ k--; continue; } E.push(r.ent); }
    const n1 = ST.t1, n2 = ST.t2; const S = E.map((e, i) => sampleN(e, i % 2 ? n2 : n1)); if(S.some(x => !x)) return;
    const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y); const sz = Math.max(...S.flat().map(p => Math.abs(p.x) + Math.abs(p.y))) + 1; const tol = 1e-6 * sz;
    // xếp các cạnh thành vòng kín: C0 (u), D1 (v), C1 ngược, D0 ngược
    const used = [0], chain = [S[0]]; let end = S[0][S[0].length - 1];
    for(let s = 0; s < 3; s++){ let found = false; for(let j = 1; j < 4; j++){ if(used.includes(j)) continue; let P = S[j]; if(near(P[0], end) <= tol * 10){} else if(near(P[P.length - 1], end) <= tol * 10) P = P.slice().reverse(); else continue; used.push(j); chain.push(P); end = P[P.length - 1]; found = true; break; } if(!found){ log('4 cạnh phải nối đầu nhau thành vòng kín.'); return; } }
    if(near(end, chain[0][0]) > tol * 10){ log('4 cạnh phải nối đầu nhau thành vòng kín.'); return; }
    const C0 = chain[0], D1 = chain[1], C1 = chain[2].slice().reverse(), D0 = chain[3].slice().reverse();
    const nu = C0.length - 1, nv = D1.length - 1; if(C1.length - 1 !== nu || D0.length - 1 !== nv){ /* số chia khác nhau: lấy mẫu lại */ }
    const at = (P, t) => { const f = t * (P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), r = f - i; return { x: P[i].x + (P[i + 1].x - P[i].x) * r, y: P[i].y + (P[i + 1].y - P[i].y) * r }; };
    const P00 = C0[0], P10 = C0[nu], P01 = C1[0], P11 = C1[C1.length - 1]; const Z = z0(); const G = [];
    for(let i = 0; i <= nu; i++){ const u = i / nu; const row = []; for(let j = 0; j <= nv; j++){ const v = j / nv; const c0 = at(C0, u), c1 = at(C1, u), d0 = at(D0, v), d1 = at(D1, v);
      const x = (1 - v) * c0.x + v * c1.x + (1 - u) * d0.x + u * d1.x - ((1 - u) * (1 - v) * P00.x + u * (1 - v) * P10.x + (1 - u) * v * P01.x + u * v * P11.x);
      const y = (1 - v) * c0.y + v * c1.y + (1 - u) * d0.y + u * d1.y - ((1 - u) * (1 - v) * P00.y + u * (1 - v) * P10.y + (1 - u) * v * P01.y + u * v * P11.y); row.push([x, y, Z]); } G.push(row); }
    addMesh(gridMesh(G, E[0]), 'Đã tạo mặt EDGESURF');
  });
  cmd(['PLANESURF'], 'Mặt phẳng: 2 góc chữ nhật hoặc [Đối tượng] kín', async () => {
    const r = await A.getPoint('Góc thứ nhất hoặc [Đối tượng] <Đối tượng>', { kw: [{ k: 'O', t: 'Đối tượng' }] });
    let loops = [], base = null, src = [];
    if(r.kw === 'O' || r.none){
      const s = await A.getSel('Chọn đối tượng kín (đa tuyến kín, tròn, elip, vùng)', { filter: e => e.type === 'CIRCLE' || e.type === 'ELLIPSE' || (e.type === 'POLYLINE' && (e.closed || (e.vertices || []).length > 2)) || e.type === 'HATCH' });
      src = (s.sel || []); for(const e of src){ let P = null;
        if(e.type === 'CIRCLE' || e.type === 'ELLIPSE'){ const p = pathOf(e.type === 'CIRCLE' ? e : { type: 'POLYLINE', vertices: sampleN(e, 64), closed: true }); P = p && p.P; }
        else if(e.type === 'POLYLINE'){ const p = pathOf(e); if(p && p.closed) P = p.P; }
        else if(e.type === 'HATCH' && e.loops && e.loops[0]) P = e.loops[0];
        if(P && P.length >= 3) loops.push({ P, e }); }
      if(!loops.length){ log('Không có đối tượng kín.'); return; }
    } else if(r.pt){
      const b = await A.getPoint('Góc đối diện', { base: r.pt, rubber: false, preview: (g, p) => g.ents([{ type: 'POLYLINE', closed: true, vertices: [r.pt, { x: p.x, y: r.pt.y }, p, { x: r.pt.x, y: p.y }] }], '#9fd0ff') }); if(!b.pt) return;
      loops.push({ P: [r.pt, { x: b.pt.x, y: r.pt.y }, b.pt, { x: r.pt.x, y: b.pt.y }], e: null });
    } else return;
    const T = await A.load3(); const add = []; const Z = z0();
    for(const L of loops){ const c = L.P.map(p => new T.Vector2(p.x, p.y)); const f = T.ShapeUtils.triangulateShape(c, []); const P = [], I = []; for(const p of L.P) P.push(p.x, p.y, Z); for(const t of f) I.push(t[0], t[1], t[2]);
      const e = A.meshEnt(P, I, L.e); if(!e) continue; e.srf = 1; if(!L.e) A.newProps(e); delete e.lt; add.push(A.ucsApply ? A.ucsApply(e) : e); }
    if(!add.length){ log('Không tạo được mặt phẳng.'); return; }
    A.commit({ add }, 'Đã tạo ' + add.length + ' mặt phẳng'); log('Đã tạo ' + add.length + ' mặt phẳng PLANESURF (giữ nguyên đối tượng gốc).');
  });

  /* =====================================================================
     5) HƯỚNG NHÌN 3D: VPOINT · DDVPOINT · HIDE
     ===================================================================== */
  async function view3(az, el, style){
    if(!A.view3D){ if(A.open3D) await A.open3D(); else DVDCmd.run('3D'); }
    const t0 = Date.now(); while(!A.view3D && Date.now() - t0 < 4000) await new Promise(r => setTimeout(r, 50));
    const V = A.view3D; if(!V) return false; if(az != null && V.setAzEl) V.setAzEl(az, el); if(style && V.setStyle) V.setStyle(style); return true;
  }
  A.view3 = view3;
  cmd(['VPOINT', '-VPOINT'], 'Hướng nhìn 3D theo véc-tơ điểm nhìn (x,y,z) hoặc [Xoay] (2 góc)', async () => {
    const r = await A.getStr('Điểm nhìn x,y,z (vd 1,-1,1 = ISO Tây Nam; 0,0,1 = mặt bằng) hoặc [Xoay]', { def: MEM.vp || '1,-1,1' }); const s = (r.str || '').trim(); if(!s && r.none) return;
    let az, el;
    if(/^x|^r/i.test(s)){ const a = await A.getAngle('Góc trong mặt phẳng XY tính từ trục X', { def: 270 }); const b = await A.getAngle('Góc so với mặt phẳng XY', { def: 90 }); az = a.num != null ? a.num : 270; el = b.num != null ? b.num : 90; }
    else { const v = (s || MEM.vp || '1,-1,1').split(/[,;\s]+/).map(Number); if(v.length < 3 || v.some(x => !isFinite(x)) || !(Math.hypot(v[0], v[1], v[2]) > 0)){ log('Nhập 3 số x,y,z.'); return; } MEM.vp = v.join(','); az = Math.atan2(v[1], v[0]) * R2D; el = Math.atan2(v[2], Math.hypot(v[0], v[1])) * R2D; if(!(Math.hypot(v[0], v[1]) > 0)) az = -90; }
    if(await view3(az, el)) log('Hướng nhìn: ' + (+az.toFixed(2)) + '° trong XY, ' + (+el.toFixed(2)) + '° so với XY.');
  });
  plain(['DDVPOINT', 'VP'], 'Đặt hướng nhìn 3D bằng 2 góc (hộp thoại)', () => {
    const a0 = MEM.ddvA != null ? MEM.ddvA : 270, e0 = MEM.ddvE != null ? MEM.ddvE : 90;
    A.dialog({ title: 'Hướng nhìn (DDVPOINT)', html: '<div style="display:grid;grid-template-columns:auto 110px;gap:8px;align-items:center"><label>Góc trong XY từ trục X</label><input id="ddvA" type="number" step="any" value="' + a0 + '"><label>Góc so với mặt phẳng XY</label><input id="ddvE" type="number" step="any" value="' + e0 + '"></div><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button type="button" data-v="270,90">Mặt bằng</button><button type="button" data-v="270,0">Đứng (trước)</button><button type="button" data-v="225,35.26">ISO TN</button><button type="button" data-v="315,35.26">ISO ĐN</button></div>',
      onOpen: r => { r.querySelectorAll('button[data-v]').forEach(b => b.onclick = () => { const [x, y] = b.dataset.v.split(','); r.querySelector('#ddvA').value = x; r.querySelector('#ddvE').value = y; }); },
      ok: r => { const a = +r.querySelector('#ddvA').value || 0, e = +r.querySelector('#ddvE').value || 0; MEM.ddvA = a; MEM.ddvE = e; view3(a, e).then(ok => ok && log('DDVPOINT: ' + a + '° / ' + e + '°')); } });
  });
  plain(['HIDE', 'HI'], 'Xem 3D khuất nét: chỉ hiện cạnh thấy được (như HIDE của AutoCAD)', async () => { if(await view3(null, null, 'hidden')) log('HIDE: khuất nét. Đổi kiểu hiển thị bằng VISUALSTYLES hoặc ô Kiểu trong khung 3D.'); });

  /* =====================================================================
     6) MINSERT — chèn khối thành mảng hàng × cột
     ===================================================================== */
  cmd(['MINSERT'], 'Chèn khối nhiều lần thành mảng (hàng × cột)', async () => {
    if(!A.chooseBlock){ log('Thiếu hộp chọn khối.'); return; } const pick = await A.chooseBlock(); if(!pick) return;
    const r = await A.getPoint('Điểm chèn "' + pick.name + '"', { rubber: false, preview: (g, p) => g.ents(A.instBlock(pick.name, pick.src, p, 1, 0).slice(0, 800), '#cfe3ff') }); if(!r.pt) return;
    const s = await A.getNum('Hệ số tỉ lệ', { def: MEM.isc || 1 }); const sc = s.num > 0 ? s.num : (MEM.isc || 1);
    const ro = await A.getAngle('Góc xoay', { def: 0, base: r.pt }); const rot = ro.num || 0;
    const nr = await A.getNum('Số hàng (---)', { def: MEM.miR || 1 }); const R = Math.max(1, Math.round(nr.num || MEM.miR || 1));
    const nc = await A.getNum('Số cột (|||)', { def: MEM.miC || 1 }); const C = Math.max(1, Math.round(nc.num || MEM.miC || 1)); MEM.miR = R; MEM.miC = C;
    let dy = 0, dx = 0;
    if(R > 1){ const d = await A.getDist('Khoảng cách giữa các hàng', { def: MEM.miDY || 1000, base: r.pt }); dy = d.num != null ? d.num : (MEM.miDY || 1000); MEM.miDY = dy; }
    if(C > 1){ const d = await A.getDist('Khoảng cách giữa các cột', { def: MEM.miDX || 1000, base: r.pt }); dx = d.num != null ? d.num : (MEM.miDX || 1000); MEM.miDX = dx; }
    const a = rot * D2R, ca = Math.cos(a), sa = Math.sin(a); const add = [];
    for(let i = 0; i < R; i++) for(let j = 0; j < C; j++){ const lx = j * dx, ly = i * dy; const p = { x: r.pt.x + lx * ca - ly * sa, y: r.pt.y + lx * sa + ly * ca }; for(const e of A.instBlock(pick.name, pick.src, p, sc, rot)) add.push(e); if(add.length > 200000) break; }
    if(!add.length){ log('Khối rỗng.'); return; }
    A.commit({ add }, 'MINSERT ' + R + ' × ' + C); log('Đã chèn ' + (R * C) + ' khối "' + pick.name + '" (' + R + ' hàng × ' + C + ' cột).');
  });

  /* =====================================================================
     7) Lệnh nhỏ & tên gọi khác như AutoCAD
     ===================================================================== */
  alias(['EXOFFSET'], 'OFFSET', 'OFFSET mở rộng (Express): xoá nguồn, đổi lớp, nhiều lần');
  alias(['SAVEIMG'], 'PNGOUT', 'Lưu ảnh khung nhìn (PNG)');
  alias(['MTEDIT'], 'DDEDIT', 'Sửa chữ nhiều dòng');
  alias(['EXCHPROP'], 'CHPROP', 'Đổi thuộc tính đối tượng (Express)');
  /* tên do người dùng đặt (lớp, khối, layout) không bị dịch khi giao diện tiếng Anh */
  if(window.DVDI18N){ const upd = () => { try{ const S = new Set(A.layerNames ? A.layerNames() : []); for(const k of Object.keys(window._dvdBlocks || {})) S.add(k); try{ for(const k of Object.keys(A.blockLib() || {})) S.add(k); }catch(_){} try{ for(const L of (window.dwgLayouts || [])) if(L && L.name) S.add(L.name); }catch(_){} DVDI18N.protect([...S]); }catch(_){} };
    A.onLoad = (prev => function(){ if(prev) prev.apply(this, arguments); upd(); })(A.onLoad);
    { const ol = A.onLayers; A.onLayers = function(){ if(ol) ol.apply(this, arguments); upd(); }; } upd(); }
  plain(['ABOUT'], 'Thông tin phiên bản DVDCAD', () => {
    const m = (document.body.innerHTML.match(/bản màu · (v\w+)/) || [])[1] || '';
    const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const K = A.acw, n = new Set(DVDCmd.commands.map(c => c.k[0])).size, desk = !!window.dvdDesktop, R = (l, v) => '<div class="acw-row"><span class="l" style="min-width:110px">' + l + '</span><span>' + v + '</span></div>';
    // bố cục như hộp About của AutoCAD: tên sản phẩm, phiên bản, thông tin sản phẩm / giấy phép
    const html = '<div class="acw" style="width:440px"><div style="display:flex;gap:14px;align-items:center;margin:2px 0 10px"><div style="font:800 30px/1 system-ui;color:#fff;background:#c8161d;border-radius:4px;padding:8px 10px">DVD</div><div><div style="font-size:18px">DVDCAD ' + esc(m) + '</div><div class="acw-note" style="margin:2px 0 0">Xem và sửa bản vẽ DWG / DXF, chạy offline</div></div></div>' +
      (K ? K.grp('Thông tin sản phẩm', R('Phiên bản:', esc(m || '—')) + R('Nền tảng:', desk ? 'Ứng dụng Windows (Electron)' : 'Trình duyệt / PWA') + R('Số lệnh:', String(n)) + R('Giấy phép:', 'GNU GPL v3 (mã nguồn mở)')) : '') + '</div>';
    A.dialog({ title: 'Giới thiệu DVDCAD', cls: 'acw-free', help: 'ABOUT', html, noCancel: true, okText: 'Đóng' });
  });
})();
