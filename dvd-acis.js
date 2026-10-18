/* DVDCAD — đọc khối ACIS (3DSOLID / BODY) của AutoCAD trong file DXF
   SAT (DXF R2000–R2010, chuỗi "mã hoá" mã 1/3) và SAB (DXF R2013+, mục ACDSDATA)
   Tam giác hoá: mặt phẳng (cạnh thẳng, cung tròn/elip), mặt trụ/nón (nối 2 đường biên),
   cầu/xuyến trọn vẹn; mặt cong khác: gần đúng theo đường biên. Kèm tam giác hoá đa giác có lỗ. */
(function(){
  'use strict';
  const TAU = Math.PI * 2;
  /* ---------------- tam giác hoá đa giác có lỗ (ear clipping + nối lỗ) ---------------- */
  const area = (P, ix) => { let s = 0; for(let i = 0; i < ix.length; i++){ const a = P[ix[i]], b = P[ix[(i + 1) % ix.length]]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inTri = (p, a, b, c) => cross(a, b, p) >= -1e-12 && cross(b, c, p) >= -1e-12 && cross(c, a, p) >= -1e-12;
  // P: mảng [x,y] của tất cả đỉnh (ngoài + lỗ), outer: chỉ số, holes: [[chỉ số]] → trả mảng chỉ số tam giác
  function triPoly(P, outer, holes){
    let poly = outer.slice(); if(area(P, poly) < 0) poly.reverse();
    const H = (holes || []).filter(h => h.length >= 3).map(h => { h = h.slice(); if(area(P, h) > 0) h.reverse(); return h; });
    H.sort((a, b) => Math.max(...b.map(i => P[i][0])) - Math.max(...a.map(i => P[i][0])));
    for(const h of H){
      let mi = 0; for(let i = 1; i < h.length; i++) if(P[h[i]][0] > P[h[mi]][0]) mi = i; const M = P[h[mi]];
      let best = -1, bx = Infinity;
      for(let i = 0; i < poly.length; i++){ const a = P[poly[i]], b = P[poly[(i + 1) % poly.length]]; if((a[1] > M[1]) === (b[1] > M[1]) && a[1] !== M[1]) continue; if(a[1] === b[1]) continue;
        const x = a[0] + (M[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); if(x >= M[0] - 1e-12 && x < bx){ bx = x; best = a[0] > b[0] ? i : (i + 1) % poly.length; } }
      if(best < 0){ let bd = Infinity; for(let i = 0; i < poly.length; i++){ const q = P[poly[i]], d = (q[0] - M[0]) ** 2 + (q[1] - M[1]) ** 2; if(d < bd){ bd = d; best = i; } } }
      else { const I = [bx, M[1]], Pv = P[poly[best]]; let ang = Infinity, cand = best;
        for(let i = 0; i < poly.length; i++){ const q = P[poly[i]]; if(i === best) continue; if(q[0] < M[0]) continue; if(inTri(q, M, I, Pv) || inTri(q, M, Pv, I)){ const a = Math.abs(Math.atan2(q[1] - M[1], q[0] - M[0])); if(a < ang){ ang = a; cand = i; } } }
        best = cand; }
      const loop = []; for(let k = 0; k <= h.length; k++) loop.push(h[(mi + k) % h.length]);
      poly = poly.slice(0, best + 1).concat(loop, [poly[best]], poly.slice(best + 1));
    }
    const out = []; let guard = 0;
    while(poly.length > 3 && guard++ < 100000){
      let ear = false; const n = poly.length;
      for(let i = 0; i < n; i++){ const ia = poly[(i - 1 + n) % n], ib = poly[i], ic = poly[(i + 1) % n], a = P[ia], b = P[ib], c = P[ic];
        if(cross(a, b, c) <= 1e-14) continue; let ok = true;
        for(let j = 0; j < n; j++){ const ij = poly[j]; if(ij === ia || ij === ib || ij === ic) continue; const q = P[ij]; if((q[0] === a[0] && q[1] === a[1]) || (q[0] === b[0] && q[1] === b[1]) || (q[0] === c[0] && q[1] === c[1])) continue; if(inTri(q, a, b, c)){ ok = false; break; } }
        if(!ok) continue; out.push(ia, ib, ic); poly.splice(i, 1); ear = true; break; }
      if(!ear){ for(let i = 1; i + 1 < poly.length; i++) out.push(poly[0], poly[i], poly[i + 1]); poly = []; break; }
    }
    if(poly.length === 3) out.push(poly[0], poly[1], poly[2]);
    return out;
  }

  /* ---------------- đọc SAT / SAB thành danh sách bản ghi ---------------- */
  function decodeSAT(lines){ return lines.map(t => { let s = '', skip = false; for(let i = 0; i < t.length; i++){ const c = t.charCodeAt(i); if(skip){ skip = false; continue; } if(c === 0x20) s += ' '; else if(c === 0x40) s += '_'; else if(c === 0x5F) s += '@'; else if(c >= 0x41 && c < 0x5F){ s += String.fromCharCode(0x41 + (0x5E - c)); skip = c === 0x5E; } else s += String.fromCharCode(c ^ 0x5F); } return s; }); }
  function parseSAT(lines){
    if(lines.length && !/^\s*\d+\s+\d+/.test(lines[0])) lines = decodeSAT(lines);
    const ver = parseInt(lines[0], 10) || 700; const body = [];
    for(let i = 3; i < lines.length; i++){ const L = lines[i]; if(/^End-of-(ACIS|ASM)-data|^Begin-of-ACIS-History/.test(L)) break; body.push(L); }
    const recs = []; for(let r of body.join(' ').split('#')){ r = r.trim(); if(!r) continue; let t = r.split(/\s+/); if(/^-\d+$/.test(t[0])) t.shift(); recs.push(t); }
    return { ver, recs: recs.map(t => { const name = t[0], rest = t.slice(ver >= 700 ? 3 : 2); return { name, d: rest.map(x => x[0] === '$' ? { p: parseInt(x.slice(1), 10) } : x) }; }) };
  }
  function parseSAB(u8){
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let i = 0; const td = new TextDecoder();
    const sig = td.decode(u8.subarray(0, 15)); if(sig !== 'ACIS BinaryFile' && sig !== 'ASM BinaryFile4') return null; i = 15;
    const ver = dv.getInt32(i, true); i += 16;
    const rstr = () => { const n = u8[i++]; const s = td.decode(u8.subarray(i, i + n)); i += n; return s; };
    for(let k = 0; k < 3; k++){ i++; rstr(); } for(let k = 0; k < 3; k++){ i++; i += 8; }
    const recs = []; let cur = [], type = [];
    while(i < u8.length){
      const tag = u8[i++];
      if(tag === 0x04){ cur.push(dv.getInt32(i, true)); i += 4; }
      else if(tag === 0x06 || tag === 0x17){ cur.push(dv.getFloat64(i, true)); i += 8; }
      else if(tag === 0x07){ cur.push('@' + rstr()); }
      else if(tag === 0x0C){ cur.push({ p: dv.getInt32(i, true) }); i += 4; }
      else if(tag === 0x0A){ cur.push(true); } else if(tag === 0x0B){ cur.push(false); }
      else if(tag === 0x12){ const n = dv.getUint32(i, true); i += 4; cur.push('@' + td.decode(u8.subarray(i, i + n))); i += n; }
      else if(tag === 0x0E){ type.push(rstr()); }
      else if(tag === 0x0D){ type.push(rstr()); cur.push({ t: type.join('-') }); type = []; }
      else if(tag === 0x13 || tag === 0x14){ cur.push(dv.getFloat64(i, true), dv.getFloat64(i + 8, true), dv.getFloat64(i + 16, true)); i += 24; }
      else if(tag === 0x15){ cur.push(dv.getInt32(i, true)); i += 4; }
      else if(tag === 0x0F || tag === 0x10){ /* phân nhóm con */ }
      else if(tag === 0x11){ recs.push(cur); cur = []; }
      else break;
    }
    const out = [];
    for(const r of recs){ if(!r.length || !r[0] || !r[0].t) continue; const name = r[0].t; if(/^End-of|^Begin-of/.test(name)) break; out.push({ name, d: r.slice(ver >= 700 ? 3 : 2), sab: true }); }
    return { ver, recs: out };
  }

  /* ---------------- dựng lưới từ cấu trúc B-rep ---------------- */
  function build(model){
    const { ver, recs } = model; const PAT = ver >= 700, TOL = ver >= 500;
    const R = idx => (idx && idx.p != null && idx.p >= 0) ? recs[idx.p] : null;
    // đọc tuần tự các trường của bản ghi (bỏ qua mục lạ một cách an toàn)
    const rd = rec => { let k = 0; const d = rec.d; return {
      ptr(){ for(let s = 0; s < 3 && k < d.length; s++){ const x = d[k++]; if(x && typeof x === 'object' && x.p != null) return x; } return null; },
      num(){ while(k < d.length){ const x = d[k++]; if(typeof x === 'number') return x; if(typeof x === 'string' && /^[-+]?(\d|\.\d)/.test(x)) return parseFloat(x); } return 0; },
      bool(tw){ while(k < d.length){ const x = d[k++]; if(typeof x === 'boolean') return x; if(typeof x === 'string'){ if(x === tw) return true; if(/^(forward|single|reversed|double|forward_v|reverse_v)$/.test(x)) return false; } } return false; },
      skipPat(){ if(PAT) this.ptr(); }, rawInt(){ if(rec.sab){ const x = d[k]; if(typeof x === 'number') k++; } } }; };
    const pts = new Map();
    const pointOf = vrec => { if(!vrec) return null; if(pts.has(vrec)) return pts.get(vrec); const r = rd(vrec); r.skipPat(); r.ptr(); r.rawInt(); const prec = R(r.ptr()); let p = null; if(prec){ const q = rd(prec); q.skipPat(); p = [q.num(), q.num(), q.num()]; } pts.set(vrec, p); return p; };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = a => Math.hypot(a[0], a[1], a[2]);
    const edgeCache = new Map();
    function edgeInfo(erec){
      if(edgeCache.has(erec)) return edgeCache.get(erec);
      const r = rd(erec); r.skipPat(); const sv = R(r.ptr()); if(TOL) r.num(); const ev = R(r.ptr()); if(TOL) r.num(); r.ptr(); const crec = R(r.ptr()); const esense = r.bool('reversed');
      const a = pointOf(sv), b = pointOf(ev); let L = a && b ? [a, b] : [], curved = false;
      if(crec && /^ellipse-curve/.test(crec.name) && a){
        const q = rd(crec); q.skipPat(); const c = [q.num(), q.num(), q.num()], n = [q.num(), q.num(), q.num()], mj = [q.num(), q.num(), q.num()], ratio = q.num() || 1;
        const nn = len(n) || 1, nu = [n[0] / nn, n[1] / nn, n[2] / nn], mn0 = crs(nu, mj), mn = [mn0[0] * ratio, mn0[1] * ratio, mn0[2] * ratio];
        const m2 = dot(mj, mj) || 1, n2 = dot(mn, mn) || 1, ang = p => { const d = sub(p, c); return Math.atan2(dot(d, mn) / n2, dot(d, mj) / m2); };
        let t0 = ang(a), t1 = sv === ev ? t0 + (esense ? -TAU : TAU) : ang(b);
        if(sv !== ev){ if(!esense){ while(t1 <= t0 + 1e-9) t1 += TAU; } else { while(t1 >= t0 - 1e-9) t1 -= TAU; } }
        const N = Math.max(2, Math.ceil(Math.abs(t1 - t0) / (TAU / 48))); L = [];
        for(let s = 0; s <= N; s++){ const t = t0 + (t1 - t0) * s / N; L.push(s === 0 ? a : (s === N && sv !== ev ? b : (s === N ? a : [c[0] + mj[0] * Math.cos(t) + mn[0] * Math.sin(t), c[1] + mj[1] * Math.cos(t) + mn[1] * Math.sin(t), c[2] + mj[2] * Math.cos(t) + mn[2] * Math.sin(t)]))); }
        curved = true;
      } else if(crec && !/^straight-curve/.test(crec.name)) curved = true;
      const info = { L, curved }; edgeCache.set(erec, info); return info;
    }
    function loopOf(lrec){
      const r = rd(lrec); r.skipPat(); r.ptr(); const first = R(r.ptr()); const chains = []; let ce = first, g = 0;
      while(ce && g++ < 100000){ const q = rd(ce); q.skipPat(); const next = R(q.ptr()); q.ptr(); q.ptr(); const erec = R(q.ptr()); const sense = q.bool('reversed');
        if(erec){ const ei = edgeInfo(erec); let L = ei.L.slice(); if(sense) L.reverse(); chains.push({ L, curved: ei.curved }); }
        ce = next; if(ce === first) break; }
      const P = []; for(const c of chains) for(let k = 0; k < c.L.length; k++){ const p = c.L[k]; const l = P[P.length - 1]; if(l && Math.abs(l[0] - p[0]) + Math.abs(l[1] - p[1]) + Math.abs(l[2] - p[2]) < 1e-12) continue; P.push(p); }
      if(P.length > 1){ const a = P[0], b = P[P.length - 1]; if(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-12) P.pop(); }
      return { P, chains };
    }
    const OUTP = [], OUTI = []; let skipped = 0;
    const addTri = (a, b, c) => { const i = OUTP.length / 3; OUTP.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); OUTI.push(i, i + 1, i + 2); };
    function zipper(A, B, closed){
      if(closed){ let bi = 0, bd = Infinity; for(let j = 0; j < B.length; j++){ const d = len(sub(B[j], A[0])); if(d < bd){ bd = d; bi = j; } } B = B.slice(bi).concat(B.slice(0, bi)); A = A.concat([A[0]]); B = B.concat([B[0]]); }
      const cum = L => { const o = [0]; for(let k = 1; k < L.length; k++) o.push(o[k - 1] + len(sub(L[k], L[k - 1]))); const t = o[o.length - 1] || 1; return o.map(v => v / t); };
      const ca = cum(A), cb = cum(B); let i = 0, j = 0;
      while(i < A.length - 1 || j < B.length - 1){ if(j >= B.length - 1 || (i < A.length - 1 && ca[i + 1] <= cb[j + 1])){ addTri(A[i], A[i + 1], B[j]); i++; } else { addTri(A[i], B[j + 1], B[j]); j++; } }
    }
    function planarFace(loops, nrm){
      let n = nrm; if(!n){ const P = loops[0].P; let s = [0, 0, 0]; for(let k = 0; k < P.length; k++){ const a = P[k], b = P[(k + 1) % P.length]; s[0] += (a[1] - b[1]) * (a[2] + b[2]); s[1] += (a[2] - b[2]) * (a[0] + b[0]); s[2] += (a[0] - b[0]) * (a[1] + b[1]); } n = s; }
      const nl = len(n) || 1; n = [n[0] / nl, n[1] / nl, n[2] / nl]; const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; let u = crs(n, ax); const ul = len(u); u = [u[0] / ul, u[1] / ul, u[2] / ul]; const v = crs(n, u);
      const P3 = [], P2 = []; const ix = loops.map(l => l.P.map(p => { P3.push(p); P2.push([dot(p, u), dot(p, v)]); return P3.length - 1; })).filter(l => l.length >= 3);
      if(!ix.length) return; ix.sort((a, b) => Math.abs(area(P2, b)) - Math.abs(area(P2, a)));
      const T = triPoly(P2, ix[0], ix.slice(1)); for(let k = 0; k < T.length; k += 3) addTri(P3[T[k]], P3[T[k + 1]], P3[T[k + 2]]);
    }
    function uvSphere(c, r){ const NU = 32, NV = 16, g = []; for(let j = 0; j <= NV; j++){ const ph = Math.PI * j / NV, row = []; for(let k = 0; k <= NU; k++){ const th = TAU * k / NU; row.push([c[0] + r * Math.sin(ph) * Math.cos(th), c[1] + r * Math.sin(ph) * Math.sin(th), c[2] + r * Math.cos(ph)]); } g.push(row); } for(let j = 0; j < NV; j++) for(let k = 0; k < NU; k++){ addTri(g[j][k], g[j + 1][k], g[j + 1][k + 1]); addTri(g[j][k], g[j + 1][k + 1], g[j][k + 1]); } }
    function torus(c, n, R0, r0){ const nl = len(n) || 1; n = [n[0] / nl, n[1] / nl, n[2] / nl]; const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; let u = crs(n, ax); const ul = len(u); u = [u[0] / ul, u[1] / ul, u[2] / ul]; const v = crs(n, u); const NU = 48, NV = 16, g = [];
      for(let i = 0; i <= NU; i++){ const a = TAU * i / NU, row = []; for(let j = 0; j <= NV; j++){ const b = TAU * j / NV, rr = R0 + r0 * Math.cos(b); row.push([0, 1, 2].map(k => c[k] + rr * (Math.cos(a) * u[k] + Math.sin(a) * v[k]) + r0 * Math.sin(b) * n[k])); } g.push(row); }
      for(let i = 0; i < NU; i++) for(let j = 0; j < NV; j++){ addTri(g[i][j], g[i + 1][j], g[i + 1][j + 1]); addTri(g[i][j], g[i + 1][j + 1], g[i][j + 1]); } }
    function faceOf(frec){
      const r = rd(frec); r.skipPat(); const next = R(r.ptr()); const lrec = R(r.ptr()); r.ptr(); r.ptr(); const srec = R(r.ptr()); const rev = r.bool('reversed');
      const loops = []; let l = lrec, g = 0; while(l && g++ < 10000){ const lp = loopOf(l); if(lp.P.length >= 2) loops.push(lp); const q = rd(l); q.skipPat(); l = R(q.ptr()); }
      const sname = srec ? srec.name : '';
      try{
        if(/^plane-surface/.test(sname)){ const q = rd(srec); q.skipPat(); q.num(); q.num(); q.num(); let n = [q.num(), q.num(), q.num()]; if(rev) n = [-n[0], -n[1], -n[2]]; if(loops.length) planarFace(loops, n); }
        else if(/^sphere-surface/.test(sname) && !loops.length){ const q = rd(srec); q.skipPat(); const c = [q.num(), q.num(), q.num()]; uvSphere(c, Math.abs(q.num())); }
        else if(/^torus-surface/.test(sname) && !loops.length){ const q = rd(srec); q.skipPat(); const c = [q.num(), q.num(), q.num()], n = [q.num(), q.num(), q.num()]; torus(c, n, Math.abs(q.num()), Math.abs(q.num())); }
        else if(loops.length === 2){ const A = loops[0].P, B = loops[1].P.slice().reverse(); zipper(A, B, true); }
        else if(loops.length === 1){ const ch = loops[0].chains; const cur = []; let run = null;
          for(const c of ch){ if(c.curved){ if(!run){ run = []; cur.push(run); } for(const p of c.L) run.push(p); } else run = null; }
          if(cur.length > 2 && ch[0].curved && ch[ch.length - 1].curved){ const f = cur.shift(); cur[cur.length - 1] = cur[cur.length - 1].concat(f); }
          if(cur.length === 2) zipper(cur[0], cur[1].slice().reverse(), false); else { planarFace(loops, null); if(!/^(cone|plane)/.test(sname)) skipped++; } }
        else if(loops.length > 2) { planarFace(loops, null); skipped++; }
        else skipped++;
      }catch(err){ skipped++; }
      return next;
    }
    // duyệt body → lump → shell → face
    let mtx = null;
    for(const b of recs.filter(x => x.name === 'body')){
      const r = rd(b); r.skipPat(); let lump = R(r.ptr()); r.ptr(); const trec = R(r.ptr());
      if(trec && /^transform/.test(trec.name)){ const lit = trec.d.find(x => typeof x === 'string' && x[0] === '@' && x.indexOf(' ') > 0); let m = [];
        if(lit) m = lit.slice(1).trim().split(/\s+/).slice(0, 12).map(parseFloat); else { const q = rd(trec); for(let k = 0; k < 12; k++) m.push(q.num()); }
        if(m.length === 12 && m.every(isFinite)) mtx = m; }
      const p0 = OUTP.length;
      for(let gl = 0; lump && gl < 10000; gl++){ const ql = rd(lump); ql.skipPat(); const nextL = R(ql.ptr()); let sh = R(ql.ptr());
        for(let gs = 0; sh && gs < 10000; gs++){ const qs = rd(sh); qs.skipPat(); const nextS = R(qs.ptr()); qs.ptr(); let f = R(qs.ptr()); for(let gf = 0; f && gf < 200000; gf++) f = faceOf(f); sh = nextS; }
        lump = nextL; }
      if(mtx){ const m = mtx; for(let k = p0; k < OUTP.length; k += 3){ const x = OUTP[k], y = OUTP[k + 1], z = OUTP[k + 2]; OUTP[k] = x * m[0] + y * m[3] + z * m[6] + m[9]; OUTP[k + 1] = x * m[1] + y * m[4] + z * m[7] + m[10]; OUTP[k + 2] = x * m[2] + y * m[5] + z * m[8] + m[11]; } mtx = null; }
    }
    return { p: OUTP, i: OUTI, skipped };
  }
  // định hướng nhất quán các tam giác (BFS theo cạnh chung), rồi lật cả khối nếu thể tích âm
  function orient(p, I){
    const nt = I.length / 3, map = new Map(), key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
    for(let t = 0; t < nt; t++) for(let k = 0; k < 3; k++){ const a = I[t * 3 + k], b = I[t * 3 + (k + 1) % 3]; const kk = key(a, b); let l = map.get(kk); if(!l) map.set(kk, l = []); l.push(t); }
    const seen = new Uint8Array(nt), flip = t => { const x = I[t * 3 + 1]; I[t * 3 + 1] = I[t * 3 + 2]; I[t * 3 + 2] = x; };
    const has = (t, a, b) => { for(let k = 0; k < 3; k++) if(I[t * 3 + k] === a && I[t * 3 + (k + 1) % 3] === b) return true; return false; };
    for(let s = 0; s < nt; s++){ if(seen[s]) continue; const comp = [s]; seen[s] = 1; const Q = [s];
      while(Q.length){ const t = Q.pop(); for(let k = 0; k < 3; k++){ const a = I[t * 3 + k], b = I[t * 3 + (k + 1) % 3]; const l = map.get(key(a, b)); if(!l || l.length !== 2) continue; const o = l[0] === t ? l[1] : l[0]; if(seen[o]) continue; seen[o] = 1; if(has(o, a, b)) flip(o); Q.push(o); comp.push(o); } }
      let v = 0; for(const t of comp){ const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3; v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]); }
      if(v < 0) for(const t of comp) flip(t); }
    return I;
  }
  function weld(P, I){
    let a = Infinity, b = -Infinity; for(const v of P){ if(v < a) a = v; if(v > b) b = v; } const q = Math.max(1e-9, (b - a) * 1e-9);
    const map = new Map(), np = [], re = []; for(let k = 0; k < P.length; k += 3){ const kk = Math.round(P[k] / q) + ',' + Math.round(P[k + 1] / q) + ',' + Math.round(P[k + 2] / q); let id = map.get(kk); if(id === undefined){ id = np.length / 3; map.set(kk, id); np.push(P[k], P[k + 1], P[k + 2]); } re.push(id); }
    const ni = []; for(let k = 0; k < I.length; k += 3){ const x = re[I[k]], y = re[I[k + 1]], z = re[I[k + 2]]; if(x !== y && y !== z && x !== z) ni.push(x, y, z); }
    return { p: np, i: ni };
  }
  function toEnt(model){
    if(!model || !model.recs.length) return null; const m = build(model); if(!m.i.length) return null;
    const w = weld(m.p, m.i); orient(w.p, w.i); const v = w.p.map(x => Math.round(x * 1e6) / 1e6);
    const pts = []; for(let k = 0; k < v.length; k += 3) pts.push({ x: v[k], y: v[k + 1] });
    const e = { type: 'SOLID3D', k: 'mesh', v, f: w.i, pts: typeof hull2d === 'function' ? hull2d(pts) : pts.slice(0, 3), acis: 1 }; if(m.skipped) e.approx = m.skipped; return e;
  }
  const hexToU8 = h => { const u = new Uint8Array(h.length >> 1); for(let k = 0; k < u.length; k++) u[k] = parseInt(h.substr(k * 2, 2), 16); return u; };
  window.DVDAcis = {
    triPoly, orient,
    fromSAT(lines){ try{ return toEnt(parseSAT(lines)); }catch(err){ console.warn('ACIS SAT', err); return null; } },
    fromSAB(data){ try{ const u8 = typeof data === 'string' ? hexToU8(data) : data; return toEnt(parseSAB(u8)); }catch(err){ console.warn('ACIS SAB', err); return null; } }
  };
})();
