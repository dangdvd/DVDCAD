/* DVDCAD — 3D (v4h): UCS 3D, LOFT, FILLETEDGE / CHAMFEREDGE, mặt trời & đèn, camera, đi bộ, mặt cắt đứng/ngang → 2D */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._3dy || !A._3d || !window.DVDCmd) return; A._3dy = true;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const log = m => A.log(m);
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const MEM = A.MEM || (A.MEM = {});
  const elev = () => MEM.z03 || 0;
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const area2 = p => { let s = 0; for(let i = 0; i < p.length; i++){ const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
  const is3D = e => e && e.type === 'SOLID3D';

  /* =================== UCS 3D =================== */
  const UCS = A.UCS = { on: false, name: 'Thế giới', O: [0, 0, 0], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], A2: { x: 0, y: 0 } };
  const ucsKey = () => 'dvd:ucs::' + (window.currentName || '');
  function saveUCS(){ try{ localStorage.setItem(ucsKey(), JSON.stringify(UCS)); }catch(_){} label(); try{ if(A.view3D) A.view3D.buildUCS(); }catch(_){} }
  function loadUCS(){ let o = null; try{ o = JSON.parse(localStorage.getItem(ucsKey()) || 'null'); }catch(_){} Object.assign(UCS, { on: false, name: 'Thế giới', O: [0, 0, 0], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], A2: { x: 0, y: 0 } }, o || {}); label(); }
  function setUCS(O, U, V, A2, name){ U = norm(U); V = norm(V); const N = norm(cross(U, V)); V = cross(N, U); Object.assign(UCS, { on: true, O, U, V, N, A2: A2 || { x: O[0], y: O[1] }, name: name || 'UCS' }); saveUCS(); }
  function label(){ try{ const vp = document.getElementById('acadVP'); if(vp){ let sp = vp.querySelector('[data-v="ucs"]'); if(!sp){ sp = document.createElement('span'); sp.dataset.v = 'ucs'; vp.appendChild(sp); } sp.textContent = UCS.on ? '[UCS: ' + UCS.name + ']' : '[WCS]'; sp.style.color = UCS.on ? '#7fb6ff' : ''; } }catch(_){} }
  // đổi khối vừa tạo (toạ độ mặt bằng, gốc = điểm neo) sang mặt phẳng UCS
  A.ucsApply = function(e){
    if(!UCS.on || !e || e.type !== 'SOLID3D') return e;
    const m = A.toMesh(e); if(!m) return e; const v = m.v.slice(), o = UCS.O, U = UCS.U, V = UCS.V, N = UCS.N, ax = UCS.A2.x, ay = UCS.A2.y;
    for(let i = 0; i < v.length; i += 3){ const x = v[i] - ax, y = v[i + 1] - ay, z = v[i + 2]; v[i] = Math.round((o[0] + x * U[0] + y * V[0] + z * N[0]) * 1e6) / 1e6; v[i + 1] = Math.round((o[1] + x * U[1] + y * V[1] + z * N[1]) * 1e6) / 1e6; v[i + 2] = Math.round((o[2] + x * U[2] + y * V[2] + z * N[2]) * 1e6) / 1e6; }
    const out = Object.assign({}, m, { v, f: m.f.slice() }); const pp = []; for(let i = 0; i < v.length; i += 3) pp.push({ x: v[i], y: v[i + 1] }); out.pts = hull2d(pp); return out;
  };
  A.setUCSFace = function(P, nrm){ const N = norm(nrm); const U = Math.abs(N[2]) < 0.99 ? norm(cross([0, 0, 1], N)) : [1, 0, 0]; const V = cross(N, U); setUCS(P.slice(), U, V, { x: P[0], y: P[1] }, 'Mặt khối'); log('UCS đặt theo mặt khối: gốc (' + P.map(v => +v.toFixed(2)).join(', ') + '). Vẽ biên dạng trên mặt bằng quanh điểm neo (' + +P[0].toFixed(2) + ', ' + +P[1].toFixed(2) + ') — trục X = ngang của mặt, trục Y = lên. Khối tạo mới sẽ nằm trên mặt đó.'); };
  const rotAxis = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2], cr = cross(k, v); return [v[0] * c + cr[0] * s + k[0] * d * (1 - c), v[1] * c + cr[1] * s + k[1] * d * (1 - c), v[2] * c + cr[2] * s + k[2] * d * (1 - c)]; };
  cmd(['UCS'], 'Hệ toạ độ người dùng 3D: đặt mặt phẳng làm việc cho lệnh tạo khối', async () => {
    const k = await A.getKw('UCS', { kw: [{ k: 'W', t: 'Thế giới' }, { k: 'D', t: 'Mặt đứng qua 2 điểm' }, { k: 'T', t: 'Trước (XZ)' }, { k: 'B', t: 'Bên (YZ)' }, { k: 'F', t: 'Mặt khối' }, { k: 'X', t: 'Xoay quanh X' }, { k: 'Y', t: 'Xoay quanh Y' }, { k: 'C', t: 'Cao độ gốc' }, { k: 'N', t: 'Điểm neo' }], def: 'Thế giới' });
    const o = k.kw || 'W';
    if(o === 'W'){ UCS.on = false; UCS.name = 'Thế giới'; saveUCS(); log('UCS: về hệ toạ độ thế giới (WCS).'); return; }
    if(o === 'D'){ const a = await A.getPoint('Điểm gốc trên mặt bằng (đầu mặt đứng)'); if(!a.pt) return; const b = await A.getPoint('Điểm thứ hai (hướng trục X)', { base: a.pt }); if(!b.pt) return; setUCS([a.pt.x, a.pt.y, elev()], [b.pt.x - a.pt.x, b.pt.y - a.pt.y, 0], [0, 0, 1], a.pt, 'Mặt đứng'); log('UCS: mặt đứng qua 2 điểm. Vẽ biên dạng trên mặt bằng quanh điểm gốc như nhìn thẳng vào mặt đó (X sang phải, Y lên trên) rồi EXTRUDE / REVOLVE / LOFT.'); return; }
    if(o === 'T' || o === 'B'){ const a = await A.getPoint('Gốc UCS trên mặt bằng'); if(!a.pt) return; if(o === 'T') setUCS([a.pt.x, a.pt.y, elev()], [1, 0, 0], [0, 0, 1], a.pt, 'Trước'); else setUCS([a.pt.x, a.pt.y, elev()], [0, 1, 0], [0, 0, 1], a.pt, 'Bên'); log('UCS: ' + UCS.name + '.'); return; }
    if(o === 'F'){ A.cancel(true); await A.open3D(); const b = A.view3D && A.view3D.ov.querySelector('[data-a="ucsf"]'); if(b) b.click(); return; }
    if(o === 'X' || o === 'Y'){ const an = await A.getNum('Góc xoay (độ)', { def: 90 }); const ang = (an.num != null ? an.num : 90) * D2R; if(!UCS.on) Object.assign(UCS, { on: true, name: 'UCS', O: [0, 0, elev()] }); const ax = o === 'X' ? UCS.U : UCS.V; UCS.U = rotAxis(UCS.U, ax, ang); UCS.V = rotAxis(UCS.V, ax, ang); UCS.N = norm(cross(UCS.U, UCS.V)); UCS.name = (UCS.name || 'UCS').replace(/ \(xoay\)$/, '') + ' (xoay)'; saveUCS(); log('UCS: xoay ' + (ang / D2R) + '° quanh trục ' + o + '.'); return; }
    if(o === 'C'){ const z = await A.getNum('Cao độ Z của gốc UCS', { def: UCS.O[2] }); if(z.num == null) return; if(!UCS.on) Object.assign(UCS, { on: true, name: 'Cao độ', U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], O: [0, 0, 0], A2: { x: 0, y: 0 } }); UCS.O = [UCS.O[0], UCS.O[1], z.num]; saveUCS(); log('UCS: gốc ở Z = ' + z.num + '.'); return; }
    if(o === 'N'){ const a = await A.getPoint('Điểm neo trên mặt bằng (ứng với gốc UCS)'); if(!a.pt) return; UCS.A2 = { x: a.pt.x, y: a.pt.y }; saveUCS(); log('UCS: điểm neo mới.'); }
  });
  plain(['UCSICON', 'UCSINFO'], 'Xem trạng thái UCS hiện hành', () => log(UCS.on ? 'UCS "' + UCS.name + '": gốc (' + UCS.O.map(v => +v.toFixed(3)).join(', ') + '), X (' + UCS.U.map(v => +v.toFixed(3)).join(', ') + '), Y (' + UCS.V.map(v => +v.toFixed(3)).join(', ') + '), neo (' + +UCS.A2.x.toFixed(3) + ', ' + +UCS.A2.y.toFixed(3) + ')' : 'Đang dùng hệ toạ độ thế giới (WCS).'));
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); loadUCS(); }; })(A.onLoad);
  setTimeout(loadUCS, 0);

  /* =================== tiện ích đa giác =================== */
  function profileOf(e){
    if(e.type === 'CIRCLE'){ const o = []; for(let k = 0; k < 64; k++){ const a = k / 64 * TAU; o.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } return o; }
    if(e.type === 'ELLIPSE'){ try{ return smpEllipse(e).slice(0, -1); }catch(_){ return null; } }
    if(e.type === 'POLYLINE'){ const v = e.vertices || []; const cl = e.closed || (v.length > 3 && Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y) < 1e-9); if(!cl) return null; const o = v.map(p => ({ x: p.x, y: p.y })); if(!e.closed) o.pop(); return o; }
    return null;
  }
  // lấy mẫu đều N điểm theo chiều dài, bắt đầu tại giao của tia ngang từ trọng tâm (để các mặt cắt khớp nhau)
  function resample(P, N){
    P = P.slice(); if(area2(P) < 0) P.reverse(); let cx = 0, cy = 0; for(const p of P){ cx += p.x; cy += p.y; } cx /= P.length; cy /= P.length;
    let st = 0, sx = -Infinity, stp = null;
    for(let i = 0; i < P.length; i++){ const a = P[i], b = P[(i + 1) % P.length]; if((a.y > cy) === (b.y > cy)) continue; const t = (cy - a.y) / (b.y - a.y), x = a.x + (b.x - a.x) * t; if(x > cx && x > sx){ sx = x; st = i; stp = { x, y: cy }; } }
    const Q = stp ? [stp].concat(P.slice(st + 1), P.slice(0, st + 1)) : P; const L = [0]; for(let i = 1; i <= Q.length; i++){ const a = Q[i - 1], b = Q[i % Q.length]; L.push(L[i - 1] + Math.hypot(b.x - a.x, b.y - a.y)); }
    const tot = L[L.length - 1] || 1, out = []; let j = 0;
    for(let k = 0; k < N; k++){ const d = tot * k / N; while(j < Q.length - 1 && L[j + 1] < d) j++; const a = Q[j], b = Q[(j + 1) % Q.length], seg = (L[j + 1] - L[j]) || 1, t = (d - L[j]) / seg; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
    return out;
  }
  function capTri(ring2){ const P2 = ring2.map(p => [p.x, p.y]); return DVDAcis.triPoly(P2, P2.map((_, i) => i), []); }
  function triWithHoles(loops){ const P2 = [], ix = []; for(const l of loops){ ix.push(l.map(p => { P2.push([p.x, p.y]); return P2.length - 1; })); } return DVDAcis.triPoly(P2, ix[0], ix.slice(1)); }
  function finish(V, I, base, msg){ let e = A.meshEnt(V, I, base || null); if(!e){ log('Không tạo được khối.'); return null; } if(!base) A.newProps(e); delete e.lt; e = A.ucsApply(e); A.commit({ add: [e] }, msg); log(msg + ' — xem: 3DORBIT.'); return e; }

  /* =================== LOFT =================== */
  cmd(['LOFT'], 'Tạo khối chuyển tiếp qua nhiều mặt cắt (tròn → vuông, trụ thon, mái vòm…)', async () => {
    const s = await A.getSel('Chọn các mặt cắt kín theo thứ tự từ dưới lên', { filter: e => !!profileOf(e) }); const sel = (s.sel || []).filter(e => profileOf(e)); if(sel.length < 2){ log('Cần ít nhất 2 mặt cắt kín (đa tuyến kín, tròn, elip).'); return; }
    const r = await A.getStr('Cao độ: khoảng cách đều (vd 1000) hoặc danh sách cao độ từng mặt (vd 0,800,2500)', { def: String(MEM.loftH || 1000) });
    let txt = (r.str || String(MEM.loftH || 1000)).trim(), zs; const nums = txt.split(/[,;\s]+/).map(Number).filter(isFinite);
    if(nums.length >= sel.length) zs = nums.slice(0, sel.length); else { const d = nums[0] || 1000; zs = sel.map((_, i) => i * d); MEM.loftH = d; }
    const N = 64, z0 = elev(), rings = sel.map(e => resample(profileOf(e), N)), V = [], I = [];
    rings.forEach((rg, k) => { for(const p of rg) V.push(p.x, p.y, z0 + zs[k]); });
    for(let k = 0; k + 1 < rings.length; k++) for(let i = 0; i < N; i++){ const j = (i + 1) % N, a0 = k * N + i, b0 = k * N + j, a1 = (k + 1) * N + i, b1 = (k + 1) * N + j; I.push(a0, b0, b1, a0, b1, a1); }
    const t0 = capTri(rings[0]); for(let k = 0; k < t0.length; k += 3) I.push(t0[k], t0[k + 2], t0[k + 1]);
    const last = (rings.length - 1) * N, t1 = capTri(rings[rings.length - 1]); for(let k = 0; k < t1.length; k += 3) I.push(last + t1[k], last + t1[k + 1], last + t1[k + 2]);
    finish(V, I, null, 'Đã tạo khối LOFT qua ' + sel.length + ' mặt cắt');
  });

  /* =================== FILLETEDGE / CHAMFEREDGE =================== */
  function offsetPoly(P, d){ const n = P.length, out = []; for(let i = 0; i < n; i++){ const a = P[(i - 1 + n) % n], p = P[i], b = P[(i + 1) % n]; let e1x = p.x - a.x, e1y = p.y - a.y, e2x = b.x - p.x, e2y = b.y - p.y; const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1; e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2; const n1x = -e1y, n1y = e1x, n2x = -e2y, n2y = e2x, den = 1 + n1x * n2x + n1y * n2y; if(den < 0.05) out.push({ x: p.x + n1x * d, y: p.y + n1y * d }); else out.push({ x: p.x + (n1x + n2x) * d / den, y: p.y + (n1y + n2y) * d / den }); } return out; }
  function fillet2D(P, r, chamfer){
    const n = P.length, out = [];
    for(let i = 0; i < n; i++){ const p = P[i], a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; let v1x = a.x - p.x, v1y = a.y - p.y, v2x = b.x - p.x, v2y = b.y - p.y; const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y); if(l1 < 1e-9 || l2 < 1e-9){ out.push(p); continue; } v1x /= l1; v1y /= l1; v2x /= l2; v2y /= l2;
      const th = Math.acos(Math.max(-1, Math.min(1, v1x * v2x + v1y * v2y))); if(th > Math.PI - 1e-3 || th < 1e-3){ out.push(p); continue; }
      let t = r / Math.tan(th / 2); const tm = 0.45 * Math.min(l1, l2); if(t > tm) t = tm; const rr = t * Math.tan(th / 2);
      const T1 = { x: p.x + v1x * t, y: p.y + v1y * t }, T2 = { x: p.x + v2x * t, y: p.y + v2y * t };
      if(chamfer){ out.push(T1, T2); continue; }
      let bx = v1x + v2x, by = v1y + v2y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl; const dc = rr / Math.sin(th / 2), c = { x: p.x + bx * dc, y: p.y + by * dc };
      let a1 = Math.atan2(T1.y - c.y, T1.x - c.x), a2 = Math.atan2(T2.y - c.y, T2.x - c.x), da = a2 - a1; while(da > Math.PI) da -= TAU; while(da < -Math.PI) da += TAU;
      const K = 8; for(let k = 0; k <= K; k++){ const an = a1 + da * k / K; out.push({ x: c.x + rr * Math.cos(an), y: c.y + rr * Math.sin(an) }); } }
    return out;
  }
  async function edgeOp(chamfer){
    const s = await A.getSel(chamfer ? 'Chọn khối cần vát cạnh (hộp, khối đùn, trụ)' : 'Chọn khối cần bo cạnh (hộp, khối đùn, trụ)', { filter: e => is3D(e) && (e.k === 'ext' || (e.k === 'cone' && Math.abs((e.r2 != null ? e.r2 : e.r) - e.r) < 1e-9)) });
    const sel = (s.sel || []).filter(e => is3D(e) && !A.isLocked(e) && (e.k === 'ext' || (e.k === 'cone' && Math.abs((e.r2 != null ? e.r2 : e.r) - e.r) < 1e-9))); if(!sel.length){ log('Chỉ bo/vát được khối hộp, khối đùn (EXTRUDE, WALL3D) và khối trụ.'); return; }
    const k = await A.getKw('Cạnh nào', { kw: [{ k: 'T', t: 'Cạnh trên' }, { k: 'D', t: 'Cạnh dưới' }, { k: 'C', t: 'Trên và dưới' }, { k: 'G', t: 'Cạnh đứng (góc)' }, { k: 'A', t: 'Tất cả' }], def: 'Cạnh trên' }); const o = k.kw || 'T';
    const rr = await A.getDist(chamfer ? 'Khoảng vát' : 'Bán kính bo', { def: MEM.fer || 50 }); const R = rr.num > 0 ? rr.num : (MEM.fer || 50); MEM.fer = R;
    const rep = [];
    for(const e of sel){
      let outer, holes = [], z0 = e.z0 || 0, h = e.h || 0;
      if(e.k === 'ext'){ outer = e.pts.slice(); holes = (e.holes || []).map(l => l.slice()); }
      else { outer = []; for(let q = 0; q < 64; q++){ const a = q / 64 * TAU; outer.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } }
      if(area2(outer) < 0) outer.reverse(); holes = holes.map(l => area2(l) > 0 ? l.slice().reverse() : l);
      if(o === 'G' || o === 'A'){ if(e.k === 'ext'){ outer = fillet2D(outer, R, chamfer); holes = holes.map(l => fillet2D(l, R, chamfer)); } }
      const top = o === 'T' || o === 'C' || o === 'A', bot = o === 'D' || o === 'C';
      if(!top && !bot){ const w = await A.makeExt(outer, holes, z0, h); if(w){ for(const kk of ['layer', 'col', 'bl', 'mat', 'lw']) if(e[kk] != null) w[kk] = e[kk]; rep.push([e, w]); } continue; }
      const r2 = Math.min(R, h * (top && bot ? 0.49 : 0.98)), K = chamfer ? 1 : 8, rings = [];
      if(bot){ for(let q = K; q >= 0; q--){ const t = q / K * Math.PI / 2; rings.push({ d: chamfer ? r2 * q / K : r2 * (1 - Math.cos(t)), z: z0 + (chamfer ? r2 * (1 - q / K) : r2 - r2 * Math.sin(t)) }); } } else rings.push({ d: 0, z: z0 });
      if(top){ for(let q = 0; q <= K; q++){ const t = q / K * Math.PI / 2; rings.push({ d: chamfer ? r2 * q / K : r2 * (1 - Math.cos(t)), z: z0 + h - (chamfer ? r2 * (1 - q / K) : r2 - r2 * Math.sin(t)) }); } } else rings.push({ d: 0, z: z0 + h });
      const loops0 = [outer].concat(holes), cnt = loops0.reduce((s2, l) => s2 + l.length, 0), V = [], I = [];
      for(const rg of rings){ for(const l of loops0){ for(const p of offsetPoly(l, rg.d)) V.push(p.x, p.y, rg.z); } }
      for(let q = 0; q + 1 < rings.length; q++){ let off = 0; for(const l of loops0){ const m = l.length; for(let a = 0; a < m; a++){ const b = (a + 1) % m, a0 = q * cnt + off + a, b0 = q * cnt + off + b, a1 = (q + 1) * cnt + off + a, b1 = (q + 1) * cnt + off + b; I.push(a0, b0, b1, a0, b1, a1); } off += m; } }
      const capLoops = rg => loops0.map(l => offsetPoly(l, rg.d)); const tb = triWithHoles(capLoops(rings[0])); for(let q = 0; q < tb.length; q += 3) I.push(tb[q], tb[q + 2], tb[q + 1]);
      const lastO = (rings.length - 1) * cnt, tt = triWithHoles(capLoops(rings[rings.length - 1])); for(let q = 0; q < tt.length; q += 3) I.push(lastO + tt[q], lastO + tt[q + 1], lastO + tt[q + 2]);
      const w = A.meshEnt(V, I, e); if(w) rep.push([e, w]);
    }
    if(!rep.length){ log('Không bo/vát được.'); return; }
    A.commit({ rep }, (chamfer ? 'Đã vát cạnh ' : 'Đã bo cạnh ') + rep.length + ' khối'); log((chamfer ? 'CHAMFEREDGE' : 'FILLETEDGE') + ': ' + rep.length + ' khối, ' + (chamfer ? 'vát ' : 'R = ') + R + '.');
  }
  cmd(['FILLETEDGE', 'FILLET3D', 'BOCANH'], 'Bo tròn cạnh khối 3D (cạnh trên/dưới/đứng)', () => edgeOp(false));
  cmd(['CHAMFEREDGE', 'CHAMFER3D', 'VATCANH'], 'Vát cạnh khối 3D (cạnh trên/dưới/đứng)', () => edgeOp(true));

  /* =================== đèn, mặt trời, camera, đi bộ =================== */
  cmd(['LIGHT', 'POINTLIGHT', 'DEN'], 'Đặt đèn điểm (hiện ở kiểu xem Thực tế)', async () => {
    const p = await A.getPoint('Vị trí đèn trên mặt bằng'); if(!p.pt) return;
    const U = (typeof unitToMM === 'function' && unitToMM()) || 1;
    const z = await A.getNum('Cao độ đèn (Z)', { def: MEM.lz || Math.round(2600 / U * 1000) / 1000 }); const Z = z.num != null ? z.num : (MEM.lz || 2600 / U); MEM.lz = Z;
    const it = await A.getNum('Cường độ (1–50)', { def: MEM.li || 6 }); const I = it.num > 0 ? it.num : (MEM.li || 6); MEM.li = I;
    const k = await A.getKw('Màu ánh sáng', { kw: [{ k: 'V', t: 'Vàng ấm' }, { k: 'T', t: 'Trắng' }, { k: 'L', t: 'Lạnh (xanh)' }], def: 'Vàng ấm' });
    const col = k.kw === 'T' ? '#ffffff' : k.kw === 'L' ? '#cfe2ff' : '#ffd9a0';
    const e = { type: 'POINT', x: p.pt.x, y: p.pt.y, light: { z: Z, int: I, col } }; A.newProps(e); A.commit({ add: [e] }, 'Đã đặt đèn'); log('Đã đặt đèn ở Z = ' + Z + '. Xem bằng RENDER (kiểu Thực tế).');
  });
  plain(['SUNPROPERTIES', 'GEOGRAPHICLOCATION', 'SUN', 'MATTROI'], 'Mặt trời theo ngày giờ & vị trí (nghiên cứu bóng đổ)', async () => { await A.open3D(); const R = A.view3D; if(!R) return; R.setStyle('real'); R.setSun({ on: true }); const b = R.ov.querySelector('[data-a="sun"]'); if(b && !R.ov.querySelector('[data-p="sun"]').classList.contains('on')) b.click(); });
  cmd(['CAMERA', 'CAM'], 'Đặt camera (điểm đứng + điểm nhìn) rồi xem phối cảnh', async () => {
    const U = (typeof unitToMM === 'function' && unitToMM()) || 1;
    const a = await A.getPoint('Vị trí camera (điểm đứng)'); if(!a.pt) return;
    const b = await A.getPoint('Điểm nhìn tới', { base: a.pt }); if(!b.pt) return;
    const h = await A.getNum('Cao độ mắt', { def: MEM.eye || Math.round(1600 / U * 1000) / 1000 }); const H = h.num != null ? h.num : (MEM.eye || 1600 / U); MEM.eye = H;
    const nm = await A.getStr('Tên camera', { def: 'Camera ' + (modelEntities.filter(e => e.cam3).length + 1) }); const name = (nm.str || '').trim() || ('Camera ' + (modelEntities.filter(e => e.cam3).length + 1));
    const e = { type: 'POINT', x: a.pt.x, y: a.pt.y, cam3: { dx: b.pt.x - a.pt.x, dy: b.pt.y - a.pt.y, z: H, tz: H, name } }; A.newProps(e); A.commit({ add: [e] }, 'Đã đặt camera');
    A.cancel(true); setTimeout(() => A.open3D({ cam: { pos: [a.pt.x, a.pt.y, H], target: [b.pt.x, b.pt.y, H] } }), 30);
  });
  plain(['3DWALK', 'WALK', 'DIBO'], 'Đi bộ trong mô hình 3D (W A S D)', async () => { await A.open3D(); if(A.view3D) A.view3D.setWalk(true); });

  /* =================== mặt cắt ngang / đứng → 2D =================== */
  cmd(['SECTIONPLANE', 'SECTION', 'MATCAT'], 'Mặt cắt mô hình 3D: ngang (theo cao độ) hoặc đứng (qua 2 điểm); xuất ra nét 2D', async () => {
    const k = await A.getKw('Loại mặt cắt', { kw: [{ k: 'N', t: 'Ngang' }, { k: 'D', t: 'Đứng qua 2 điểm' }], def: 'Ngang' });
    if(k.kw === 'D'){ const a = await A.getPoint('Điểm đầu đường cắt trên mặt bằng'); if(!a.pt) return; const b = await A.getPoint('Điểm cuối (nhìn về phía bên trái hướng này)', { base: a.pt }); if(!b.pt) return;
      A.cancel(true); await A.open3D(); if(A.view3D){ A.view3D.setCut(true, 0.5, 'v', { a: a.pt, b: b.pt }); const dx = b.pt.x - a.pt.x, dy = b.pt.y - a.pt.y; const az = Math.atan2(dy, dx) - Math.PI / 2; A.view3D.state.az = az; A.view3D.state.el = 15 * D2R; A.view3D.render(); } return; }
    A.cancel(true); await A.open3D(); if(A.view3D) A.view3D.setCut(true, 0.4, 'h');
  });
  cmd(['SECTION2D', 'SECTIONPLANETOBLOCK'], 'Chèn mặt cắt (từ khung 3D) thành đa tuyến + hatch 2D', async () => {
    const S = A._sec; A._sec = null; if(!S || !S.regions.length){ log('Mở khung 3D, bật "Cắt", rồi bấm "Mặt cắt → 2D".'); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const r of S.regions) for(const p of r.outer){ x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const prev = (g, dx, dy) => { let n = 0; for(const r of S.regions){ if(n++ > 400) break; g.poly(r.outer.map(p => ({ x: p[0] + dx, y: p[1] + dy })), true); } };
    let dx = 0, dy = 0;
    const pr = await A.getPoint(S.kind === 'h' ? 'Điểm đặt (góc dưới trái) — Enter = đúng vị trí trên mặt bằng' : 'Điểm đặt mặt cắt đứng (góc dưới trái)', { preview: (g, p) => prev(g, p.x - x0, p.y - y0) });
    if(pr.pt){ dx = pr.pt.x - x0; dy = pr.pt.y - y0; } else if(S.kind !== 'h') return;
    const diag = Math.hypot(x1 - x0, y1 - y0) || 1, psc = Math.max(1e-6, diag / 80 / 3.175), gid = 'sec' + Date.now().toString(36), add = [];
    const mk = l => l.map(p => ({ x: p[0] + dx, y: p[1] + dy }));
    for(const r of S.regions){
      for(const l of [r.outer].concat(r.holes)){ const e = { type: 'POLYLINE', closed: true, vertices: mk(l) }; A.newProps(e); e.grp = gid; e.blk = '*SECTION'; add.push(e); }
      const h = { type: 'HATCH', loops: [mk(r.outer)].concat(r.holes.map(mk)), pat: 'ANSI31', psc, pang: 0, solid: false }; A.newProps(h); h.grp = gid; h.blk = '*SECTION'; add.push(h);
    }
    A.commit({ add }, 'Đã chèn mặt cắt'); log('SECTION: ' + S.regions.length + ' vùng cắt (đa tuyến + hatch ANSI31), một nhóm — EXPLODE để tách.');
  });
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
