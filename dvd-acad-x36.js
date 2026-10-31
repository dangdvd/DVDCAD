/* DVDCAD v6n — khối 3D: ACISOUT, BREP, IMPRINT, AMECONVERT, HLSETTINGS
   · ACISOUT: ghi tệp ACIS .sat (7.0) — mỗi khối thành một body B-rep: các mặt phẳng (gộp tam giác cùng mặt phẳng, có lỗ), cạnh thẳng dùng chung, đỉnh
   · BREP: bỏ lịch sử / thông số của khối (khối đùn, hộp, trụ… → khối lưới B-rep thuần)
   · IMPRINT: in dấu đường 2D / 3D lên mặt khối (nét in nằm trên mặt, hiện trong khung 3D, lưu cùng khối)
   · AMECONVERT: đổi khối AME (R12) — DVDCAD không có đối tượng AME nên báo số đối tượng đã đổi
   · HLSETTINGS: nét khuất khi xem kiểu Hidden — màu, kiểu nét (tắt / liền / đứt / chấm), khe hở viền (HALOGAP) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x36 || !window.DVDCmd) return; A._x36 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const docBase = () => String((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
  const is3 = e => !!e && e.type === 'SOLID3D';
  const meshOfE = e => (e.k === 'mesh' && e.v && e.f) ? { p: e.v, i: e.f } : (A.meshOf ? A.meshOf(e) : null);

  /* ===================== mặt phẳng của lưới ===================== */
  // hàn đỉnh trùng, gộp tam giác kề cùng mặt phẳng → mặt; biên mặt = cạnh có hướng chỉ thuộc 1 tam giác của mặt → vòng
  function weld(p, I){ let lo = Infinity, hi = -Infinity; for(const v of p){ if(v < lo) lo = v; if(v > hi) hi = v; } const q = Math.max(1e-9, (hi - lo) * 1e-9); const map = new Map(), P = [], re = [];
    for(let k = 0; k < p.length; k += 3){ const key = Math.round(p[k] / q) + ',' + Math.round(p[k + 1] / q) + ',' + Math.round(p[k + 2] / q); let id = map.get(key); if(id === undefined){ id = P.length; map.set(key, id); P.push([p[k], p[k + 1], p[k + 2]]); } re.push(id); }
    const T = []; for(let k = 0; k + 2 < I.length; k += 3){ const a = re[I[k]], b = re[I[k + 1]], c = re[I[k + 2]]; if(a !== b && b !== c && a !== c) T.push([a, b, c]); } return { P, T }; }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrmz = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function planarFaces(m){ const { P, T } = weld(m.p, m.i); let span = 0; for(const v of P) span = Math.max(span, Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])); const tol = Math.max(1e-9, span * 1e-9);
    const N = T.map(t => nrmz(crs(sub(P[t[1]], P[t[0]]), sub(P[t[2]], P[t[0]])))); const ek = (a, b) => a < b ? a + '_' + b : b + '_' + a; const adj = new Map();
    T.forEach((t, i) => { for(let k = 0; k < 3; k++){ const kk = ek(t[k], t[(k + 1) % 3]); let l = adj.get(kk); if(!l) adj.set(kk, l = []); l.push(i); } });
    const fid = new Int32Array(T.length).fill(-1), faces = [];
    for(let s = 0; s < T.length; s++){ if(fid[s] >= 0) continue; const n = N[s], d = dot(n, P[T[s][0]]); const F = { n, d, tris: [] }; const Q = [s]; fid[s] = faces.length;
      while(Q.length){ const t = Q.pop(); F.tris.push(t); for(let k = 0; k < 3; k++){ for(const o of adj.get(ek(T[t][k], T[t][(k + 1) % 3])) || []){ if(fid[o] >= 0) continue; if(dot(N[o], n) < 1 - 1e-9) continue; if(T[o].some(v => Math.abs(dot(n, P[v]) - d) > tol)) continue; fid[o] = faces.length; Q.push(o); } } }
      faces.push(F); }
    for(const F of faces){ const cnt = new Map(); for(const t of F.tris) for(let k = 0; k < 3; k++){ const a = T[t][k], b = T[t][(k + 1) % 3]; const kk = ek(a, b); cnt.set(kk, (cnt.get(kk) || 0) + 1); }
      const nxt = new Map(); for(const t of F.tris) for(let k = 0; k < 3; k++){ const a = T[t][k], b = T[t][(k + 1) % 3]; if(cnt.get(ek(a, b)) === 1){ let l = nxt.get(a); if(!l) nxt.set(a, l = []); l.push(b); } }
      const used = new Set(), loops = [];
      for(const [a0, L] of nxt){ for(const b0 of L){ const k0 = a0 + '>' + b0; if(used.has(k0)) continue; const loop = [a0]; let a = a0, b = b0, g = 0; used.add(k0);
          while(b !== a0 && g++ < 100000){ loop.push(b); const cand = (nxt.get(b) || []).filter(c => !used.has(b + '>' + c)); if(!cand.length) break; const c = cand[0]; used.add(b + '>' + c); a = b; b = c; } void a;
          if(loop.length >= 3) loops.push(loop); } }
      // vòng ngoài = diện tích lớn nhất (cùng chiều pháp tuyến)
      const ar = L => { let s = [0, 0, 0]; for(let i = 0; i < L.length; i++){ const c = crs(P[L[i]], P[L[(i + 1) % L.length]]); s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]]; } return dot(s, F.n) / 2; };
      loops.sort((x, y) => Math.abs(ar(y)) - Math.abs(ar(x))); F.loops = loops; }
    return { P, T, faces }; }
  A.planarFaces = m => planarFaces(m);

  /* ===================== ACISOUT ===================== */
  function satOf(solids, opt){ opt = opt || {}; const R = []; const add = s => { R.push(s); return R.length - 1; };
    const f = v => { if(!isFinite(v)) v = 0; if(Math.abs(v) < 1e-14) return '0'; return String(+v.toPrecision(15)); };
    let nb = 0;
    for(const e of solids){ const m = meshOfE(e); if(!m || !m.i.length) continue; const G = planarFaces(m); if(!G.faces.length) continue; nb++;
      // chừa chỗ body, lump, shell
      const iB = add(null), iL = add(null), iS = add(null);
      const vIdx = new Map(), ptIdx = new Map(), edges = new Map(); const faceRec = [];
      const vertexOf = v => { if(vIdx.has(v)) return vIdx.get(v); const iv = add(null); vIdx.set(v, iv); return iv; };
      for(const F of G.faces){ if(!F.loops.length) continue; const iF = add(null), plane = add(null); faceRec.push(iF);
        const u = nrmz(Math.abs(F.n[0]) < 0.9 ? crs([1, 0, 0], F.n) : crs([0, 1, 0], F.n)); const o = G.P[F.loops[0][0]];
        R[plane] = 'plane-surface $-1 -1 $-1 ' + [o[0], o[1], o[2], F.n[0], F.n[1], F.n[2], u[0], u[1], u[2]].map(f).join(' ') + ' forward_v I I I I #';
        const loopIdx = [];
        for(const L of F.loops){ const iLp = add(null); loopIdx.push(iLp); const ce = L.map(() => add(null));
          L.forEach((a, k) => { const b = L[(k + 1) % L.length]; const key = a < b ? a + '_' + b : b + '_' + a; let E = edges.get(key); if(!E){ E = { i: add(null), a, b, co: [] }; edges.set(key, E); } const fwd = E.a === a; E.co.push(ce[k]);
            R[ce[k]] = { next: ce[(k + 1) % L.length], prev: ce[(k + L.length - 1) % L.length], E, fwd, loop: iLp }; vertexOf(a); vertexOf(b); });
          R[iLp] = { first: ce[0], face: iF }; }
        loopIdx.forEach((iLp, k) => { const r = R[iLp]; R[iLp] = 'loop $-1 -1 $-1 $' + (k + 1 < loopIdx.length ? loopIdx[k + 1] : -1) + ' $' + r.first + ' $' + iF + ' #'; });
        R[iF] = { loop: loopIdx[0], plane }; }
      // mặt: chuỗi next
      faceRec.forEach((iF, k) => { const r = R[iF]; R[iF] = 'face $-1 -1 $-1 $' + (k + 1 < faceRec.length ? faceRec[k + 1] : -1) + ' $' + r.loop + ' $' + iS + ' $-1 $' + r.plane + ' forward single #'; });
      // cạnh + đường thẳng
      for(const E of edges.values()){ const a = G.P[E.a], b = G.P[E.b], d = sub(b, a), L = Math.hypot(d[0], d[1], d[2]) || 1; const iC = add('straight-curve $-1 -1 $-1 ' + [a[0], a[1], a[2], d[0] / L, d[1] / L, d[2] / L].map(f).join(' ') + ' I I #');
        R[E.i] = 'edge $-1 -1 $-1 $' + vIdx.get(E.a) + ' 0 $' + vIdx.get(E.b) + ' ' + f(L) + ' $' + E.co[0] + ' $' + iC + ' forward @7 unknown #'; E.L = L; }
      // coedge: đối tác = coedge còn lại của cùng cạnh
      for(let i = 0; i < R.length; i++){ const r = R[i]; if(!r || typeof r !== 'object' || !r.E) continue; const partner = r.E.co.find(c => c !== i); R[i] = 'coedge $-1 -1 $-1 $' + r.next + ' $' + r.prev + ' $' + (partner != null ? partner : -1) + ' $' + r.E.i + ' ' + (r.fwd ? 'forward' : 'reversed') + ' $' + r.loop + ' $-1 #'; }
      // đỉnh + điểm
      const firstEdge = new Map(); for(const E of edges.values()){ if(!firstEdge.has(E.a)) firstEdge.set(E.a, E.i); if(!firstEdge.has(E.b)) firstEdge.set(E.b, E.i); }
      for(const [v, iv] of vIdx){ const p = G.P[v]; let ip = ptIdx.get(v); if(ip == null){ ip = add('point $-1 -1 $-1 ' + p.map(f).join(' ') + ' #'); ptIdx.set(v, ip); } R[iv] = 'vertex $-1 -1 $-1 $' + firstEdge.get(v) + ' $' + ip + ' #'; }
      R[iB] = 'body $-1 -1 $-1 $' + iL + ' $-1 $-1 #'; R[iL] = 'lump $-1 -1 $-1 $-1 $' + iS + ' $' + iB + ' #'; R[iS] = 'shell $-1 -1 $-1 $-1 $-1 $' + faceRec[0] + ' $-1 $' + iL + ' #'; }
    const hs = s => '@' + s.length + ' ' + s; const date = new Date().toString().split(' ').slice(0, 5).join(' ');
    const head = ['700 0 ' + nb + ' 0', hs('DVDCAD') + ' ' + hs('ACIS 7.0 NT') + ' ' + hs(date), (opt.mm || 1) + ' 9.9999999999999995e-007 1e-010'];
    return { text: head.concat(R.filter(x => typeof x === 'string'), ['End-of-ACIS-data']).join('\n') + '\n', bodies: nb, records: R.length }; }
  A.satOf = satOf;
  cmd(['ACISOUT'], 'Xuất khối 3D ra tệp ACIS (.sat, bản 7.0): mặt phẳng gộp từ lưới, cạnh dùng chung, mở được bằng AutoCAD / phần mềm đọc SAT', async () => {
    const s = await A.getSel('Chọn khối 3D'); const L = ((s && s.sel) || []).filter(is3); if(!L.length){ log('ACISOUT: không có khối 3D nào được chọn.'); return; }
    const R = satOf(L); if(!R.bodies){ log('ACISOUT: không tạo được khối.'); return; } const nm = docBase() + '.sat'; await shareOrDownload(new Blob([R.text], { type: 'text/plain' }), nm, 'text/plain');
    log('ACISOUT: đã ghi ' + nm + ' — ' + R.bodies + ' khối, ' + R.records + ' bản ghi ACIS.'); });

  /* ===================== BREP ===================== */
  cmd(['BREP'], 'Bỏ lịch sử / thông số của khối 3D: khối đùn, hộp, trụ, cầu… thành khối B-rep (lưới) thuần', async () => {
    const s = await A.getSel('Chọn khối 3D'); const L = ((s && s.sel) || []).filter(is3); if(!L.length) return; const rep = [];
    for(const e of L){ if(e.k === 'mesh' && !e.hist && !e.csg) continue; const w = A.toMesh ? A.toMesh(e) : null; if(!w) continue; const n = Object.assign(copy(e), w); delete n.hist; delete n.csg; delete n.hst; for(const k of ['pts', 'holes', 'z0', 'h', 'tri', 'cx', 'cy', 'r', 'r2', 'ms', 'ns']) if(!(k in w)) delete n[k]; n.k = 'mesh'; n.v = w.v; n.f = w.f; n.pts = w.pts; rep.push([e, n]); }
    if(rep.length) A.commit({ rep }, 'BREP: ' + rep.length + ' khối đã bỏ lịch sử (thành khối B-rep).'); else log('BREP: các khối đã là B-rep (không có lịch sử).'); });

  /* ===================== IMPRINT ===================== */
  const curvePts = e => { if(A.curvePts3){ try{ const r = A.curvePts3(e); if(r && r.length) return r.map(q => Array.isArray(q) ? q : [q.x, q.y, q.z || 0]); }catch(_){} }
    if(e.type === 'LINE') return [[e.x1, e.y1, 0], [e.x2, e.y2, 0]]; if(e.type === 'POLYLINE') return (e.vertices || []).map(v => [v.x, v.y, v.z || 0]).concat(e.closed && e.vertices.length ? [[e.vertices[0].x, e.vertices[0].y, e.vertices[0].z || 0]] : []);
    if(e.type === 'CIRCLE' || e.type === 'ARC'){ const a1 = e.type === 'ARC' ? e.a1 * Math.PI / 180 : 0; let a2 = e.type === 'ARC' ? e.a2 * Math.PI / 180 : Math.PI * 2; while(a2 <= a1) a2 += Math.PI * 2; const n = 48, o = []; for(let i = 0; i <= n; i++){ const t = a1 + (a2 - a1) * i / n; o.push([e.cx + e.r * Math.cos(t), e.cy + e.r * Math.sin(t), 0]); } return o; }
    return []; };
  // điểm (x, y, z0) lên mặt khối: z0 nằm trên một mặt → giữ; không thì chiếu đứng lên mặt trên cùng
  function onSolid(m, x, y, z0, span){ let top = -Infinity, hit = false; const tol = Math.max(1e-6, span * 1e-7);
    for(let t = 0; t + 2 < m.i.length; t += 3){ const a = m.i[t] * 3, b = m.i[t + 1] * 3, c = m.i[t + 2] * 3; const ax = m.p[a], ay = m.p[a + 1], bx = m.p[b], by = m.p[b + 1], cx = m.p[c], cy = m.p[c + 1];
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if(Math.abs(d) < 1e-18) continue; const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, l3 = 1 - l1 - l2; if(l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const z = l1 * m.p[a + 2] + l2 * m.p[b + 2] + l3 * m.p[c + 2]; if(Math.abs(z - z0) <= tol) hit = true; if(z > top) top = z; }
    return hit ? z0 : (isFinite(top) ? top : null); }
  A.imprintPts = (sol, pts) => { const m = meshOfE(sol); if(!m) return []; let span = 0; for(const v of m.p) span = Math.max(span, Math.abs(v)); const out = []; let cur = [];
    const dens = []; for(let i = 0; i + 1 < pts.length; i++){ const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(1e-9, span / 200))); for(let k = 0; k < n; k++) dens.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, a[2] + (b[2] - a[2]) * k / n]); } if(pts.length) dens.push(pts[pts.length - 1]);
    for(const q of dens){ const z = onSolid(m, q[0], q[1], q[2], span); if(z == null){ if(cur.length > 1) out.push(cur); cur = []; continue; } cur.push([q[0], q[1], z]); } if(cur.length > 1) out.push(cur); return out; };
  A.extraEdges = (e, X) => { if(!e || !e.imp) return; for(const L of e.imp) for(let i = 0; i + 1 < L.length; i++) X.push(L[i][0], L[i][1], L[i][2], L[i + 1][0], L[i + 1][1], L[i + 1][2]); };
  cmd(['IMPRINT'], 'In dấu đường (đường thẳng, đa tuyến, cung, tròn, spline) lên mặt khối 3D; có thể xoá đường gốc', async () => {
    const r = await A.getEnt('Chọn khối 3D', { filter: is3 }); const sol = r.ent; if(!sol) return; const rep = new Map(), del = [];
    for(;;){ const q = await A.getEnt('Chọn đối tượng để in dấu (Enter = xong)', { filter: e => /^(LINE|POLYLINE|ARC|CIRCLE|ELLIPSE|SPLINE)$/.test(e.type) }); if(!q.ent) break;
      const P = A.imprintPts(rep.get(sol) || sol, curvePts(q.ent)); if(!P.length){ log('IMPRINT: đối tượng không nằm trên khối.'); continue; }
      const k = await A.getKw('Xoá đối tượng gốc? [Có / Không] <Không>', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Không' }); if(k.kw === 'Y') del.push(q.ent);
      const w = rep.get(sol) || copy(sol); w.imp = (w.imp || []).concat(P); rep.set(sol, w); }
    if(rep.size) A.commit({ rep: [...rep.entries()], del }, 'IMPRINT: ' + rep.get(sol).imp.length + ' nét in trên khối.'); });

  /* ===================== AMECONVERT ===================== */
  cmd(['AMECONVERT'], 'Đổi khối AME (AutoCAD R12) sang khối 3D — bản vẽ DVDCAD mở chỉ có khối ACIS / lưới nên báo số khối AME tìm thấy', async () => {
    const s = await A.getSel('Chọn khối AME'); const L = ((s && s.sel) || []).filter(e => e.ame); log('AMECONVERT: ' + L.length + ' khối AME' + (L.length ? '' : ' — đối tượng chọn không phải khối AME (khối 3D của DVDCAD / AutoCAD R13+ đã là ACIS).')); });

  /* ===================== HLSETTINGS ===================== */
  const HL = () => Object.assign({ lt: 0, col: '#808080', halo: 0, ix: 0 }, LS('dvd:hlset', {}));
  if(A.sysvar){ A.sysvar.def('OBSCUREDLTYPE', { d: 'Nét khuất khi xem kiểu Hidden: 0 tắt, 1 liền, 2 đứt, 3 chấm', get: () => HL().lt, set: v => { SV('dvd:hlset', Object.assign(HL(), { lt: Math.max(0, Math.min(3, v | 0)) })); reapply(); } });
    A.sysvar.def('OBSCUREDCOLOR', { d: 'Màu nét khuất (#rrggbb)', s: 1, get: () => HL().col, set: v => { SV('dvd:hlset', Object.assign(HL(), { col: String(v) })); reapply(); } });
    A.sysvar.def('HALOGAP', { d: 'Khe hở viền nét khuất (% đơn vị, 0 – 100)', get: () => HL().halo, set: v => { SV('dvd:hlset', Object.assign(HL(), { halo: Math.max(0, Math.min(100, +v || 0)) })); reapply(); } }); }
  function reapply(){ const V = A.view3D; if(!V || !V.ov) return; const sel = V.ov.querySelector('select[data-a="style"]'); if(sel) V.setStyle(sel.value); }
  A.hlHook = ({ T, solids, style }) => { const S = HL(); A._hlSolids = solids;
    for(const o of solids){ if(!o.ed) continue; const on = style === 'hidden' && S.lt > 0;
      if(!o._obs && on){ const g = o.ed.geometry; g.computeBoundingSphere(); const r = (g.boundingSphere && g.boundingSphere.radius) || 1; o._obsR = r; const ls = new T.LineSegments(g, new T.LineBasicMaterial()); ls.renderOrder = -1; o.ed.parent.add(ls); o._obs = ls; }
      if(!o._obs) continue; if(on){ const r = o._obsR || 1, gap = 1 + (S.halo || 0) / 100; const mat = S.lt === 1 ? new T.LineBasicMaterial({ color: S.col, depthTest: false, transparent: true, opacity: 0.85 }) : new T.LineDashedMaterial({ color: S.col, depthTest: false, transparent: true, opacity: 0.85, dashSize: r * (S.lt === 3 ? 0.006 : 0.03), gapSize: r * 0.02 * gap });
        if(o._obs.material) o._obs.material.dispose(); o._obs.material = mat; if(S.lt > 1) o._obs.computeLineDistances(); }
      o._obs.visible = on; } };
  plain(['HLSETTINGS'], 'Cài đặt nét khuất (kiểu xem Hidden): hiện nét khuất, màu, kiểu nét liền / đứt / chấm, khe hở viền', () => { const S = HL();
    A.dialog({ title: 'Cài đặt nét khuất (HLSETTINGS)', help: 'HLSETTINGS', html: '<div class="acw" style="width:340px"><fieldset class="acw-grp"><legend>Nét khuất (Obscured lines)</legend><div class="acw-row"><label>Kiểu nét</label><select id="hlT">' + [['0', 'Tắt'], ['1', 'Liền'], ['2', 'Đứt'], ['3', 'Chấm']].map(([v, t]) => '<option value="' + v + '"' + (+v === S.lt ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
      '<div class="acw-row"><label>Màu</label><input id="hlC" type="color" value="' + esc(S.col) + '"></div><div class="acw-row"><label>Khe hở viền (%)</label><input id="hlH" type="number" min="0" max="100" value="' + S.halo + '" style="width:70px"></div></fieldset><div style="opacity:.75;font-size:11.5px">Áp dụng khi khung 3D xem kiểu Hidden (Ẩn nét).</div></div>',
      ok: root => { SV('dvd:hlset', { lt: +root.querySelector('#hlT').value, col: root.querySelector('#hlC').value, halo: +root.querySelector('#hlH').value || 0 }); reapply(); log('HLSETTINGS: nét khuất ' + ['tắt', 'liền', 'đứt', 'chấm'][HL().lt] + '.'); } }); });
})();
