/* DVDCAD v6m — DGN (MicroStation V7) như AutoCAD
   · DGNIMPORT: nhập tệp .dgn V7 (2D / 3D) vào bản vẽ — đường, chuỗi đường, hình kín (có tô), đường cong, chuỗi điểm, cung, elip,
     chuỗi phức / hình phức (ghép thành một đa tuyến), chữ (cả chữ 16 bit), ô (cell) — mức (level) → lớp, bảng màu, kiểu nét, bề rộng nét
   · DGNATTACH: gắn tệp DGN làm nền tham chiếu (khối UL$DGN$…) — DGNLAYERS bật / tắt mức, DGNCLIP cắt, DGNADJUST mờ / đơn sắc
   · DGNEXPORT: ghi tệp .dgn V7 2D — đơn vị, gốc toạ độ chung, bảng màu riêng, lớp → mức, kiểu nét, bề rộng, hình tô (liên kết tô)
   · DGNMAPPING: ánh xạ mức ↔ lớp, kiểu nét DGN ↔ kiểu nét, bề rộng ↔ lineweight (dùng khi nhập / gắn / xuất)
   Bố cục tệp V7: phần tử = 2 byte (mức | loại) + số từ còn lại; số nguyên 32 bit "giữa-đầu" (từ cao trước, mỗi từ little-endian), số thực VAX D. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x34 || !window.DVDCmd) return; A._x34 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); });
  const docBase = () => String((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
  const drawMM = () => { try{ return (typeof unitToMM === 'function' && unitToMM()) || 1; }catch(_){ return 1; } };
  const D2R = Math.PI / 180, TAU = Math.PI * 2;

  /* ===================== ánh xạ ===================== */
  const DEF_STYLE = ['CONTINUOUS', 'DOT', 'DASHED', 'DASHEDX2', 'DASHDOT', 'HIDDEN', 'DIVIDE', 'CENTER'];
  const DEF_W = w => w <= 0 ? 0 : [13, 18, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140][Math.min(15, w - 1)] || 211;
  const MAP = () => Object.assign({ levels: {}, styles: DEF_STYLE.slice(), wmap: null, prefix: 'Level ' }, LS('dvd:dgnmap', {}));
  A.dgnMapping = MAP;
  const levelName = (M, n) => (M.levels && M.levels[n]) || (M.prefix != null ? M.prefix : 'Level ') + n;
  // bảng màu mặc định (khi tệp không có bảng màu): 0 trắng, 1 lam, 2 lục, 3 đỏ, 4 vàng, 5 tím, 6 cam, 7 lục lam, còn lại theo vòng màu
  const DEF_PCT = (() => { const t = [[255, 255, 255], [0, 0, 255], [0, 255, 0], [255, 0, 0], [255, 255, 0], [255, 0, 255], [255, 127, 0], [0, 255, 255], [64, 64, 64], [192, 192, 192]];
    for(let i = 10; i < 256; i++){ const h = (i * 37) % 360, l = 0.35 + ((i >> 3) % 4) * 0.12; const c = (1 - Math.abs(2 * l - 1)), x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; t.push([r, g, b].map(v => Math.round((v + m) * 255))); }
    return t; })();
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('');

  /* ===================== số học V7 ===================== */
  const rI32 = (u, o) => (u[o + 2] | (u[o + 3] << 8) | (u[o] << 16) | (u[o + 1] << 24)) | 0;
  const rU32 = (u, o) => rI32(u, o) >>> 0;
  const rU16 = (u, o) => u[o] | (u[o + 1] << 8);
  // VAX D: 4 từ 16 bit little-endian, từ cao trước — dấu 1, mũ 8 (lệch 128, 0.1m), định trị 55 bit
  function rVax(u, o){ const B = [u[o + 1], u[o], u[o + 3], u[o + 2], u[o + 5], u[o + 4], u[o + 7], u[o + 6]]; const sg = B[0] & 0x80 ? -1 : 1; const e = ((B[0] & 0x7f) << 1) | (B[1] >> 7); if(e === 0) return 0;
    let m = (B[1] & 0x7f); for(let i = 2; i < 8; i++) m = m * 256 + B[i]; return sg * (1 + m / 36028797018963968) * Math.pow(2, e - 129); }   // 2^55
  function wVax(v){ const out = new Uint8Array(8); if(!v || !isFinite(v)) return out; const sg = v < 0 ? 1 : 0; v = Math.abs(v); let e = Math.floor(Math.log2(v)) + 129; let f = v / Math.pow(2, e - 129); if(f >= 2){ f /= 2; e++; } if(f < 1){ f *= 2; e--; } if(e <= 0) return out; if(e > 255) e = 255;
    let m = Math.round((f - 1) * 36028797018963968); const B = new Array(8).fill(0); for(let i = 7; i >= 2; i--){ B[i] = m % 256; m = Math.floor(m / 256); } B[1] = (m & 0x7f) | ((e & 1) << 7); B[0] = (sg << 7) | (e >> 1);
    out.set([B[1], B[0], B[3], B[2], B[5], B[4], B[7], B[6]]); return out; }
  const wI32 = (u, o, v) => { v = v | 0; u[o] = (v >>> 16) & 255; u[o + 1] = (v >>> 24) & 255; u[o + 2] = v & 255; u[o + 3] = (v >>> 8) & 255; };
  A.dgnVax = { r: rVax, w: wVax };

  /* ===================== đọc DGN V7 ===================== */
  const UNIT_MM = { MM: 1, CM: 10, DM: 100, M: 1000, KM: 1e6, IN: 25.4, '"': 25.4, FT: 304.8, "'": 304.8, YD: 914.4, MI: 1609344, UM: 0.001, MU: 0.001 };
  function parseDGN(buf, opt){
    opt = opt || {}; const u = new Uint8Array(buf); const M = MAP();
    if(u[0] === 0xD0 && u[1] === 0xCF && u[2] === 0x11 && u[3] === 0xE0) throw new Error('Đây là DGN V8 (MicroStation V8 / CONNECT) — DVDCAD chỉ đọc DGN V7. Lưu lại thành V7 trong MicroStation hoặc đổi bằng ODA File Converter.');
    if(!((u[0] === 0x08 || u[0] === 0xC8) && u[1] === 0x09 && u[2] === 0xFE && u[3] === 0x02)) throw new Error('Không phải tệp DGN V7 (thiếu phần tử TCB đầu tệp).');
    let is3D = false, scale = 1, ox = 0, oy = 0, oz = 0, sub = 1, uor = 1, mu = '', su = '', pct = null;
    const out = [], skipped = {}, levels = new Set(); let o = 0, nEl = 0; let cx = null;   // cx: chuỗi / hình phức đang gom
    const P2 = (q, k) => ({ x: rI32(u, q) * scale - ox, y: rI32(u, q + 4) * scale - oy, z: is3D ? rI32(u, q + 8) * scale - oz : 0 });
    const step = () => is3D ? 12 : 8;
    const lt = s => { const n = (M.styles || DEF_STYLE)[s & 7]; return n && n !== 'CONTINUOUS' ? n : null; };
    const fillOf = (q, size) => { const ai = rU16(u, q + 30); let a = q + 32 + ai * 2; const end = q + size; while(a + 4 <= end){ if(u[a] === 0x07 && u[a + 1] === 0x10 && u[a + 2] === 0x41 && u[a + 3] === 0x00) return u[a + 8]; const n = ((u[a] & 0xff) + 1) * 2; if(!(u[a + 1] & 0x10)) break; a += Math.max(2, n); } return null; };
    const base = (q, o2) => { const lv = u[q] & 0x3f; const sym = u[q + 34], ci = u[q + 35]; const L = levelName(M, lv); levels.add(L); const c = (pct || DEF_PCT)[ci] || [255, 255, 255];
      const w = Object.assign({ layer: L, col: hex(c), dgnc: ci }, o2); const ls = lt(sym & 7); if(ls) w.lt = ls; const wt = sym >> 3; const lw = M.wmap && M.wmap[wt] != null ? M.wmap[wt] : DEF_W(wt); if(lw > 0) w.lw = lw; return w; };
    const flat = pts => pts.every(p => Math.abs(p.z - pts[0].z) < 1e-9);
    const poly = (q, pts, closed, extra) => { if(pts.length < 2) return null; if(!flat(pts)) return base(q, Object.assign({ type: 'POLYLINE', p3: true, vertices: pts.map(p => ({ x: p.x, y: p.y, z: p.z })), closed: !!closed }, extra)); return base(q, Object.assign({ type: 'POLYLINE', vertices: pts.map(p => ({ x: p.x, y: p.y })), closed: !!closed }, extra)); };
    // ma trận quay từ quaternion (3D) → góc quay trong mặt XY nếu trục z giữ nguyên
    const quatRot = q => { const s = 2147483647; const w = rI32(u, q) / s, x = rI32(u, q + 4) / s, y = rI32(u, q + 8) / s, z = rI32(u, q + 12) / s;
      const m = [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), 2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), 2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)];
      return { m, planar: Math.abs(Math.abs(m[8]) - 1) < 1e-6, rot: Math.atan2(m[3], m[0]) / D2R, flip: m[8] < 0 }; };
    const arcPts = (cxp, a, b, rot, s0, sw) => { const n = Math.max(8, Math.ceil(Math.abs(sw) / 5)); const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R); const P = []; for(let i = 0; i <= n; i++){ const t = (s0 + sw * i / n) * D2R; const px = a * Math.cos(t), py = b * Math.sin(t); P.push({ x: cxp.x + px * c - py * s, y: cxp.y + px * s + py * c, z: cxp.z }); } return P; };
    const emit = w => { if(!w) return; if(cx){ cx.parts.push(w); cx.left--; if(cx.left <= 0) endCx(); return; } out.push(w); };
    const ptsOf = w => w.type === 'LINE' ? [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }] : w.type === 'POLYLINE' ? w.vertices : w._pts || [];
    function endCx(){ const C = cx; cx = null; if(!C) return; let pts = [];
      for(const w of C.parts){ let q = ptsOf(w); if(!q.length) continue; if(pts.length){ const l = pts[pts.length - 1]; const d0 = Math.hypot(q[0].x - l.x, q[0].y - l.y), d1 = Math.hypot(q[q.length - 1].x - l.x, q[q.length - 1].y - l.y); if(d1 < d0) q = q.slice().reverse(); if(Math.min(d0, d1) < 1e-9) q = q.slice(1); } pts = pts.concat(q); }
      if(pts.length >= 2){ const w = Object.assign({}, C.head, { type: 'POLYLINE', vertices: pts.map(p => ({ x: p.x, y: p.y })), closed: C.shape }); delete w._pts; out.push(w); if(C.fill != null) out.push(Object.assign({}, C.head, { type: 'HATCH', solid: true, pat: 'SOLID', loops: [pts.map(p => ({ x: p.x, y: p.y }))], col: hex((pct || DEF_PCT)[C.fill] || [255, 255, 255]) })); } }
    while(o + 4 <= u.length){
      if(u[o] === 0xff && u[o + 1] === 0xff) break;
      const b0 = u[o], b1 = u[o + 1], wtf = rU16(u, o + 2), size = (wtf + 2) * 2; if(size < 4 || o + size > u.length) break; const type = b1 & 0x7f, del = !!(b1 & 0x80), cpx = !!(b0 & 0x80); nEl++;
      try{
        if(cx && !cpx) endCx();
        if(type === 9){ is3D = (u.length > o + 1214 && (u[o + 1214] & 0x40) !== 0); sub = rI32(u, o + 1112) || 1; uor = rI32(u, o + 1116) || 1; mu = String.fromCharCode(u[o + 1120], u[o + 1121]).replace(/\0/g, '').trim(); su = String.fromCharCode(u[o + 1122], u[o + 1123]).replace(/\0/g, '').trim();
          scale = 1 / (sub * uor); ox = rVax(u, o + 1240) / (sub * uor); oy = rVax(u, o + 1248) / (sub * uor); oz = rVax(u, o + 1256) / (sub * uor); if(opt.sub){ scale *= sub; ox *= sub; oy *= sub; oz *= sub; } }
        else if(del){ /* phần tử đã xoá */ }
        else if(type === 5 && (b0 & 0x3f) === 1){ pct = []; for(let i = 0; i < 256; i++) pct.push([u[o + 38 + 3 * i], u[o + 39 + 3 * i], u[o + 40 + 3 * i]]); }
        else if(type === 3){ const s = step(); const a = P2(o + 36), b = P2(o + 36 + s); if(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-12) emit(base(o, { type: 'POINT', x: a.x, y: a.y, _pts: [a] })); else if(Math.abs(a.z - b.z) < 1e-9) emit(base(o, { type: 'LINE', x1: a.x, y1: a.y, x2: b.x, y2: b.y })); else emit(poly(o, [a, b], false)); }
        else if(type === 4 || type === 6 || type === 11 || type === 22){ const n = rU16(u, o + 36), s = step(); const pts = []; for(let i = 0; i < n; i++) pts.push(P2(o + 38 + i * s));
          if(type === 22){ for(const p of pts) out.push(base(o, { type: 'POINT', x: p.x, y: p.y })); }
          else if(type === 11){ const F = pts.slice(2, -2); if(F.length >= 2){ const w = base(o, { type: 'POLYLINE', vertices: (typeof sampleCatmull === 'function' ? sampleCatmull(F, false, 12) : F).map(p => ({ x: p.x, y: p.y })), closed: false }); w.spl = F.map(p => ({ x: p.x, y: p.y })); emit(w); } }
          else { let P = pts; const closed = type === 6; if(closed && P.length > 2 && Math.hypot(P[0].x - P[P.length - 1].x, P[0].y - P[P.length - 1].y) < 1e-9) P = P.slice(0, -1); const w = poly(o, P, closed); emit(w);
            if(closed && !cx && w && !w.p3){ const f = fillOf(o, size); if(f != null) out.push(base(o, { type: 'HATCH', solid: true, pat: 'SOLID', loops: [P.map(p => ({ x: p.x, y: p.y }))], col: hex((pct || DEF_PCT)[f] || [255, 255, 255]) })); } } }
        else if(type === 12 || type === 14){ if(cx) endCx(); cx = { head: base(o, {}), left: rU16(u, o + 38), parts: [], shape: type === 14, fill: type === 14 ? fillOf(o, size) : null }; if(cx.left <= 0) cx = null; }
        else if(type === 15 || type === 16){ const arc = type === 16; let q = o + 36; let s0 = 0, sw = 360;
          if(arc){ s0 = rI32(u, q) / 360000; const sv = rU32(u, q + 4); sw = sv & 0x80000000 ? -(sv & 0x7fffffff) / 360000 : sv === 0 ? 360 : sv / 360000; q += 8; }
          const a = rVax(u, q) * scale, b = rVax(u, q + 8) * scale; let rot = 0, org, planar = true, R3 = null;
          if(!is3D){ rot = rI32(u, q + 16) / 360000; org = { x: rVax(u, q + 20) * scale - ox, y: rVax(u, q + 28) * scale - oy, z: 0 }; }
          else { const Q = quatRot(q + 16); R3 = Q; planar = Q.planar; rot = Q.rot; org = { x: rVax(u, q + 32) * scale - ox, y: rVax(u, q + 40) * scale - oy, z: rVax(u, q + 48) * scale - oz }; if(Q.flip){ s0 = -s0; sw = -sw; } }
          if(!planar){ const n = Math.max(8, Math.ceil(Math.abs(sw) / 5)); const P = []; for(let i = 0; i <= n; i++){ const t = (s0 + sw * i / n) * D2R, px = a * Math.cos(t), py = b * Math.sin(t), m = R3.m; P.push({ x: org.x + m[0] * px + m[1] * py, y: org.y + m[3] * px + m[4] * py, z: org.z + m[6] * px + m[7] * py }); } emit(poly(o, P, Math.abs(sw) >= 360)); }
          else if(cx){ const w = base(o, { type: 'POLYLINE', vertices: arcPts(org, a, b, rot, s0, sw).map(p => ({ x: p.x, y: p.y })), closed: false }); emit(w); }
          else { const full = Math.abs(sw) >= 360 - 1e-9;
            if(Math.abs(a - b) <= 1e-9 * Math.max(1, a)){ if(full) emit(base(o, { type: 'CIRCLE', cx: org.x, cy: org.y, r: a })); else { let a1 = rot + s0, a2 = rot + s0 + sw; if(sw < 0){ const t = a1; a1 = a2; a2 = t; } const nz = v => ((v % 360) + 360) % 360; emit(base(o, { type: 'ARC', cx: org.x, cy: org.y, r: a, a1: nz(a1), a2: nz(a2) })); } }
            else { const maj = a >= b; const L = maj ? a : b, rr = maj ? b / a : a / b; const ang = (rot + (maj ? 0 : 90)) * D2R; const w = base(o, { type: 'ELLIPSE', cx: org.x, cy: org.y, mx: L * Math.cos(ang), my: L * Math.sin(ang), ratio: rr });
              if(!full){ let p1 = (s0 - (maj ? 0 : 90)) * D2R, p2 = p1 + sw * D2R; if(sw < 0){ const t = p1; p1 = p2; p2 = t; } p1 = ((p1 % TAU) + TAU) % TAU; w.p1 = p1; w.p2 = p1 + Math.abs(sw) * D2R; } emit(w); } } }
        else if(type === 17){ let q = o + 36; const wm = rI32(u, q + 2) * scale * 6 / 1000, hm = rI32(u, q + 6) * scale * 6 / 1000; let rot, org, nq;
          if(!is3D){ rot = rI32(u, q + 10) / 360000; org = P2(q + 14); nq = q + 22; } else { rot = quatRot(q + 10).rot; org = P2(q + 26); nq = q + 38; }
          const nc = u[nq]; let s = ''; const t0 = nq + 2; if(u[t0] === 0xff && u[t0 + 1] === 0xfd){ for(let i = 2; i + 1 < nc; i += 2) s += String.fromCharCode(u[t0 + i] | (u[t0 + i + 1] << 8)); } else for(let i = 0; i < nc; i++){ const c = u[t0 + i]; if(c) s += String.fromCharCode(c); }
          void wm; if(s.trim()) emit(base(o, { type: 'TEXT', x: org.x, y: org.y, h: Math.max(1e-6, hm), rot, text: s, _pts: [org] })); }
        else if(type === 2 || type === 7 || type === 8 || type === 10 || type === 5 || type === 1 || type === 0){ /* ô, nút chữ, cài đặt — phần tử con xử lý riêng */ }
        else skipped[type] = (skipped[type] || 0) + 1;
      }catch(err){ skipped[type + '!'] = (skipped[type + '!'] || 0) + 1; }
      o += size; }
    if(cx) endCx();
    for(const w of out) delete w._pts;
    return { ents: out, skipped, levels: [...levels], is3D, units: { master: mu, sub: su, subPerMaster: sub, uorPerSub: uor }, elements: nEl, colorTable: !!pct };
  }
  A.parseDGN = parseDGN;
  // tỉ lệ đổi đơn vị DGN → đơn vị bản vẽ
  const unitScale = (R, useSub) => { const n = String((useSub ? R.units.sub : R.units.master) || '').toUpperCase(); const mm = UNIT_MM[n]; return mm ? mm / drawMM() : 1; };
  const applyScale = (L, k) => { if(Math.abs(k - 1) < 1e-12 || !A.xformEnt) return L; return L.map(e => A.xformEnt(e, { a: k, b: 0, c: 0, d: k, e: 0, f: 0 }) || e); };

  /* ===================== ghi DGN V7 (2D) ===================== */
  const US = { 1: 'IN', 2: 'FT', 4: 'MM', 5: 'CM', 6: 'M', 7: 'KM' };
  function writeDGN(ents, opt){
    opt = opt || {}; const M = MAP(); const L = ents.filter(e => e && !e.vh && !e.inv && !e.p3 && e.type !== 'SOLID3D' && e.type !== 'IMAGE');
    const bb = A.bboxOf ? A.bboxOf(L) : null; const cxv = bb ? (bb.x0 + bb.x1) / 2 : 0, cyv = bb ? (bb.y0 + bb.y1) / 2 : 0; const span = bb ? Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0, 1e-9) : 1;
    let uor = 1000; while(uor > 1 && span / 2 * uor > 2e9) uor /= 10; const k = uor;   // số UOR / đơn vị chính (sub = 1)
    const X = x => Math.round((x - cxv) * k), Y = y => Math.round((y - cyv) * k);
    const name = String(US[(typeof insunits !== 'undefined' && insunits) || 4] || 'MM');
    const chunks = []; let skipped = {}, n = 0;
    // TCB
    const T = new Uint8Array(1536); T[0] = 0x08; T[1] = 0x09; T[2] = 0xFE; T[3] = 0x02; wI32(T, 1112, 1); wI32(T, 1116, k); T[1120] = name.charCodeAt(0) || 77; T[1121] = name.charCodeAt(1) || 32; T[1122] = name.charCodeAt(0) || 77; T[1123] = name.charCodeAt(1) || 32;
    T.set(wVax(-cxv * k), 1240); T.set(wVax(-cyv * k), 1248); T.set(wVax(0), 1256); chunks.push(T);
    // bảng màu: mọi màu dùng trong bản vẽ (tối đa 254) + mặc định
    const pal = DEF_PCT.map(c => c.slice()); const pIdx = new Map(); let nextC = 10; const colorIdx = e => { const h = String(e.col || '#ffffff').toLowerCase(); if(pIdx.has(h)) return pIdx.get(h); const m = /^#([0-9a-f]{6})$/.exec(h); if(!m) return 0; const v = parseInt(m[1], 16); const rgb = [v >> 16 & 255, v >> 8 & 255, v & 255];
      let i = pal.findIndex((c, j) => j < 10 && c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2]); if(i < 0 && nextC < 255){ i = nextC++; pal[i] = rgb; } if(i < 0){ let best = 0, bd = Infinity; pal.forEach((c, j) => { const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2; if(d < bd){ bd = d; best = j; } }); i = best; } pIdx.set(h, i); return i; };
    for(const e of L) colorIdx(e);
    { const C = new Uint8Array(806); C[0] = 1; C[1] = 5; C[2] = (806 / 2 - 2) & 255; C[3] = (806 / 2 - 2) >> 8; for(let i = 0; i < 256; i++) C.set(pal[i], 38 + 3 * i); chunks.push(C); }
    // lớp → mức
    const lvMap = new Map(); const inv = {}; for(const [kk, v] of Object.entries(M.levels || {})) inv[v] = +kk; let nextLv = 1;
    const levelOf = e => { const ly = e.layer || '0'; if(lvMap.has(ly)) return lvMap.get(ly); let lv = inv[ly] || (/^Level (\d+)$/.exec(ly) ? +RegExp.$1 : 0); if(!(lv >= 1 && lv <= 63)){ while(Object.values(inv).includes(nextLv) && nextLv < 63) nextLv++; lv = Math.min(63, nextLv++); } lvMap.set(ly, lv); return lv; };
    const styleOf = e => { let lt = e.lt; if(!lt){ try{ lt = A.layerLT ? A.layerLT(e.layer || '0') : null; }catch(_){} } const i = (M.styles || DEF_STYLE).indexOf(String(lt || 'CONTINUOUS').toUpperCase()); return i > 0 ? i : 0; };
    const weightOf = e => { const lw = e.lw > 0 ? e.lw : 0; if(!lw) return 0; let best = 0, bd = Infinity; for(let w = 0; w < 32; w++){ const v = M.wmap && M.wmap[w] != null ? M.wmap[w] : DEF_W(w); const d = Math.abs(v - lw); if(d < bd){ bd = d; best = w; } } return best; };
    function elem(type, e, data, pts, attr){ const len = 36 + data.length + (attr ? attr.length : 0); const B = new Uint8Array(len + (len & 1)); const wtf = B.length / 2 - 2;
      B[0] = levelOf(e) & 0x3f; B[1] = type; B[2] = wtf & 255; B[3] = wtf >> 8;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const p of pts){ x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      [x0, y0, 0, x1, y1, 0].forEach((v, i) => wI32(B, 4 + 4 * i, (v | 0) ^ 0x80000000));
      const ai = (data.length + 4) / 2; B[30] = ai & 255; B[31] = ai >> 8; if(attr){ B[32] = 0x00; B[33] = 0x08; }   // thuộc tính: có liên kết
      B[34] = (styleOf(e) & 7) | (weightOf(e) << 3); B[35] = colorIdx(e); B.set(data, 36); if(attr) B.set(attr, 36 + data.length); chunks.push(B); }
    const fillLink = c => { const a = new Uint8Array(16); a.set([0x07, 0x10, 0x41, 0x00, 0x02, 0x08, 0x01, 0x00]); a[8] = c; return a; };
    const ptsData = P => { const D = new Uint8Array(2 + P.length * 8); D[0] = P.length & 255; D[1] = P.length >> 8; P.forEach((p, i) => { wI32(D, 2 + i * 8, p[0]); wI32(D, 6 + i * 8, p[1]); }); return D; };
    const lineStr = (e, P, closed, fill) => { if(P.length < 2) return; if(closed){ const Q = P.slice(); if(Q[0][0] !== Q[Q.length - 1][0] || Q[0][1] !== Q[Q.length - 1][1]) Q.push(Q[0]); if(Q.length <= 101){ elem(6, e, ptsData(Q), Q, fill != null ? fillLink(fill) : null); return; } P = Q; }
      if(P.length === 2){ const D = new Uint8Array(16); wI32(D, 0, P[0][0]); wI32(D, 4, P[0][1]); wI32(D, 8, P[1][0]); wI32(D, 12, P[1][1]); elem(3, e, D, P); return; }
      for(let i = 0; i < P.length - 1; i += 100){ const S = P.slice(i, i + 101); if(S.length >= 2) elem(4, e, ptsData(S), S); } };
    const vax = v => wVax(v);
    const arcEl = (e, cx0, cy0, a, b, rotDeg, s0, sw) => { const full = Math.abs(Math.abs(sw) - 360) < 1e-9; const pts = []; for(let i = 0; i <= 16; i++){ const t = (s0 + sw * i / 16) * D2R, c = Math.cos(rotDeg * D2R), s = Math.sin(rotDeg * D2R); const px = a * Math.cos(t), py = b * Math.sin(t); pts.push([X(cx0 + px * c - py * s), Y(cy0 + px * s + py * c)]); }
      if(full){ const D = new Uint8Array(36); D.set(vax(a * k), 0); D.set(vax(b * k), 8); wI32(D, 16, Math.round(rotDeg * 360000)); D.set(vax((cx0 - cxv) * k), 20); D.set(vax((cy0 - cyv) * k), 28); elem(15, e, D, pts); return; }
      const D = new Uint8Array(44); wI32(D, 0, Math.round(s0 * 360000)); const sv = Math.round(Math.abs(sw) * 360000); wI32(D, 4, sw < 0 ? (0x80000000 | sv) : sv); D.set(vax(a * k), 8); D.set(vax(b * k), 16); wI32(D, 24, Math.round(rotDeg * 360000)); D.set(vax((cx0 - cxv) * k), 28); D.set(vax((cy0 - cyv) * k), 36); elem(16, e, D, pts); };
    const enc = s => { const ascii = /^[\x20-\x7e]*$/.test(s); if(ascii) return Array.from(s).map(c => c.charCodeAt(0)); const out = [0xff, 0xfd]; for(const c of s){ const v = c.charCodeAt(0); out.push(v & 255, v >> 8); } return out; };
    for(const e of L){ try{ switch(e.type){
      case 'LINE': lineStr(e, [[X(e.x1), Y(e.y1)], [X(e.x2), Y(e.y2)]], false); n++; break;
      case 'POINT': lineStr(e, [[X(e.x), Y(e.y)], [X(e.x), Y(e.y)]], false); n++; break;
      case 'CIRCLE': arcEl(e, e.cx, e.cy, e.r, e.r, 0, 0, 360); n++; break;
      case 'ARC': { let sw = (e.a2 - e.a1) % 360; if(sw <= 0) sw += 360; arcEl(e, e.cx, e.cy, e.r, e.r, 0, e.a1, sw); n++; break; }
      case 'ELLIPSE': { const a = Math.hypot(e.mx, e.my), b = a * (e.ratio || 1), rot = Math.atan2(e.my, e.mx) / D2R; const p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; let sw = (p2 - p1) / D2R; if(sw <= 0) sw += 360; arcEl(e, e.cx, e.cy, a, b, rot, p1 / D2R, Math.min(360, sw)); n++; break; }
      case 'POLYLINE': { const bv = A.bvOf ? A.bvOf(e) : null; if(bv && bv.some(q => q.bulge)){ // cung trong đa tuyến → đoạn + cung riêng
          const m = bv.length, ns = e.closed ? m : m - 1; for(let i = 0; i < ns; i++){ const a = bv[i], b = bv[(i + 1) % m]; if(!a.bulge){ lineStr(e, [[X(a.x), Y(a.y)], [X(b.x), Y(b.y)]], false); continue; }
            const th = 4 * Math.atan(a.bulge), ch = Math.hypot(b.x - a.x, b.y - a.y), r = ch / (2 * Math.sin(Math.abs(th) / 2)); const ux = (b.x - a.x) / ch, uy = (b.y - a.y) / ch, dd = r * Math.cos(Math.abs(th) / 2) * Math.sign(a.bulge); const cx0 = (a.x + b.x) / 2 - uy * dd, cy0 = (a.y + b.y) / 2 + ux * dd;
            const s0 = Math.atan2(a.y - cy0, a.x - cx0) / D2R; arcEl(e, cx0, cy0, r, r, 0, s0, th / D2R); } n++; break; }
        const V = (e.vertices || []).map(v => [X(v.x), Y(v.y)]); lineStr(e, V, !!e.closed); n++; break; }
      case 'SOLID': { const p = e.pts || []; if(p.length < 3) break; const q = p.length === 4 && !e.face ? [p[0], p[1], p[3], p[2]] : p; lineStr(e, q.map(v => [X(v.x), Y(v.y)]), true, colorIdx(e)); n++; break; }
      case 'HATCH': { const solid = e.solid || e.pat === 'SOLID'; for(const lp of e.loops || []) if(lp.length >= 3) lineStr(e, lp.map(v => [X(v.x), Y(v.y)]), true, solid ? colorIdx(e) : null); n++; break; }
      case 'TEXT': { const lines = String(e.text || '').split('\n'); const h = e.h || 2.5, r = (e.rot || 0) * D2R; lines.forEach((ln, i) => { if(!ln.trim()) return; const bytes = enc(ln).slice(0, 255); const D = new Uint8Array(24 + bytes.length + (bytes.length & 1));
          const mult = Math.round(h * k * 1000 / 6); D[0] = 1; D[1] = 0; wI32(D, 2, mult); wI32(D, 6, mult); wI32(D, 10, Math.round((e.rot || 0) * 360000)); const ox2 = e.x + Math.sin(r) * h * 1.6 * i, oy2 = e.y - Math.cos(r) * h * 1.6 * i; wI32(D, 14, X(ox2)); wI32(D, 18, Y(oy2)); D[22] = bytes.length; D[23] = 0; D.set(bytes, 24);
          elem(17, e, D, [[X(ox2), Y(oy2)], [X(ox2 + Math.cos(r) * h * ln.length * 0.8), Y(oy2 + Math.sin(r) * h * ln.length * 0.8 + h)]]); }); n++; break; }
      default: skipped[e.type] = (skipped[e.type] || 0) + 1;
    } }catch(err){ skipped[e.type + '!'] = (skipped[e.type + '!'] || 0) + 1; } }
    chunks.push(new Uint8Array([0xff, 0xff]));
    const tot = chunks.reduce((a, c) => a + c.length, 0); const out = new Uint8Array(tot); let o = 0; for(const c of chunks){ out.set(c, o); o += c.length; }
    return { data: out, count: n, elements: chunks.length - 1, skipped, uor: k, levels: [...lvMap.entries()] };
  }
  A.writeDGN = writeDGN;

  const skTxt = sk => { const k = Object.keys(sk || {}); return k.length ? ' Bỏ qua: ' + k.map(t => 'loại ' + t + ' ×' + sk[t]).join(', ') + '.' : ''; };
  async function readFileDGN(f, useSub){ const R = parseDGN(await f.arrayBuffer(), { sub: useSub }); const k = unitScale(R, useSub); R.ents = applyScale(R.ents, k); R.k = k; return R; }
  async function askUnits(){ const r = await A.getKw('Đơn vị DGN [Chính (Master) / Phụ (Sub)] <Chính>', { kw: [{ k: 'M', t: 'Chính' }, { k: 'S', t: 'Phụ' }], def: 'Chính' }); return r.kw === 'S'; }
  async function importDGN(f, o){ o = o || {}; let R; try{ R = await readFileDGN(f, !!o.sub); }catch(err){ log('DGNIMPORT: ' + err.message); say(err.message); return null; }
    if(!R.ents.length){ log('DGNIMPORT: tệp không có đối tượng.' + skTxt(R.skipped)); return R; }
    for(const nm of R.levels) try{ A.addLayer(nm); }catch(_){} const add = R.ents.map(w => { const e = A.newProps({ type: w.type }); Object.assign(e, w); delete e.bl; return e; });
    A.commit({ add }, 'DGNIMPORT: ' + f.name + ' — ' + add.length + ' đối tượng, ' + R.levels.length + ' mức' + (R.is3D ? ' (tệp 3D)' : '') + ', đơn vị ' + (o.sub ? R.units.sub : R.units.master || '?') + (Math.abs(R.k - 1) > 1e-12 ? ' ×' + (+R.k.toPrecision(6)) : '') + '.' + skTxt(R.skipped));
    try{ fitView(); draw(); }catch(_){} return R; }
  A.dgnImportFile = importDGN;
  cmd(['DGNIMPORT'], 'Nhập tệp MicroStation DGN (V7) vào bản vẽ: đường, hình, cung, elip, chữ, ô; mức → lớp, màu, kiểu nét, bề rộng', async () => {
    const f = await pickFile('.dgn,.DGN'); if(!f) return; const sub = await askUnits(); await importDGN(f, { sub }); });
  async function attachDGN(f, o){ o = o || {}; let R; try{ R = await readFileDGN(f, !!o.sub); }catch(err){ log('DGNATTACH: ' + err.message); say(err.message); return null; } if(!R.ents.length){ log('DGNATTACH: tệp không có đối tượng.'); return null; }
    const sc = o.sc || 1, ins = o.ins || { x: 0, y: 0 }, rot = (o.rot || 0) * D2R; let ents = R.ents.map(w => Object.assign({}, w)); if(Math.abs(sc - 1) > 1e-12) ents = applyScale(ents, sc);
    const bb = A.bboxOf(ents); if(bb) ents.push({ type: 'POLYLINE', closed: true, vertices: [{ x: bb.x0, y: bb.y0 }, { x: bb.x1, y: bb.y0 }, { x: bb.x1, y: bb.y1 }, { x: bb.x0, y: bb.y1 }], col: '#8a93a3', layer: '*FRAME*' });
    const title = String(f.name || 'dgn').replace(/\.dgn$/i, ''); const add = A.makeUnderlay('DGN', title, ents, ins, rot, null);
    A.commit({ add }, 'DGNATTACH: gắn "' + title + '" làm nền (' + (add.length - 1) + ' đối tượng, ' + R.levels.length + ' mức) — DGNLAYERS bật / tắt mức, DGNCLIP cắt, DGNADJUST chỉnh'); try{ fitView(); }catch(_){} return add; }
  A.dgnAttachFile = attachDGN;
  cmd(['DGNATTACH'], 'Gắn tệp DGN (V7) làm nền tham chiếu: điểm chèn, tỉ lệ, góc xoay; DGNLAYERS / DGNCLIP / DGNADJUST', async () => {
    const f = await pickFile('.dgn,.DGN'); if(!f) return; const sub = await askUnits(); const sc = numOr(await A.getNum('Tỉ lệ', { def: 1 }), 1) || 1;
    const p = await A.getPoint('Điểm chèn <0,0>', { rubber: false }); const rot = numOr(await A.getNum('Góc xoay (độ)', { def: 0 }), 0); await attachDGN(f, { sub, sc, ins: p.pt || { x: 0, y: 0 }, rot }); });
  const isDGN = e => A.isUnderlay && A.isUnderlay(e, 'DGN');
  const pickDGN = async () => { const r = await A.getEnt('Chọn nền DGN', { filter: isDGN }); return r.ent || null; };
  cmd(['DGNLAYERS'], 'Bật / tắt mức (level) của nền DGN', async () => { const e = await pickDGN(); if(e) A.underlayLayersDialog(e.grp); });
  cmd(['DGNCLIP'], 'Cắt nền DGN theo khung (chữ nhật / đa giác / đa tuyến, đảo ngược) như XCLIP', async () => { const e = await pickDGN(); if(!e) return; setTimeout(() => { try{ selEnts.clear(); for(const m of ME().filter(x => x.grp === e.grp)) selEnts.add(m); }catch(_){} DVDCmd.run('XCLIP'); }, 0); });
  cmd(['DGNADJUST'], 'Chỉnh nền DGN: độ mờ, đơn sắc', async () => { const e = await pickDGN(); if(e) A.underlayAdjustDialog(e.grp); });
  cmd(['DGNEXPORT'], 'Xuất bản vẽ ra MicroStation DGN V7 (2D): lớp → mức, màu (bảng màu riêng), kiểu nét, bề rộng, chữ, hình tô', async () => {
    const s = await A.getSel('Chọn đối tượng <Tất cả>'); const L = s && s.sel && s.sel.length ? s.sel : ME().filter(e => !e.vh && !e.inv); if(!L.length){ log('DGNEXPORT: bản vẽ trống.'); return; }
    const R = writeDGN(L); const nm = docBase() + '.dgn'; await shareOrDownload(new Blob([R.data], { type: 'application/octet-stream' }), nm, 'application/octet-stream');
    log('DGNEXPORT: đã ghi ' + nm + ' — ' + R.count + ' đối tượng → ' + R.elements + ' phần tử DGN, ' + R.levels.length + ' mức, độ phân giải ' + R.uor + ' UOR / đơn vị.' + skTxt(R.skipped)); });
  plain(['DGNMAPPING'], 'Ánh xạ DGN: mức ↔ tên lớp, kiểu nét DGN 0–7 ↔ kiểu nét, tiền tố tên mức (dùng khi nhập / gắn / xuất)', () => { const M = MAP(); const ltn = (A.ltNames ? A.ltNames() : DEF_STYLE).concat(DEF_STYLE).filter((v, i, a) => a.indexOf(v) === i);
    const rows = Object.entries(M.levels || {}).map(([k, v]) => '<tr><td><input type="number" min="1" max="63" value="' + k + '" style="width:60px"></td><td><input value="' + esc(v) + '" style="width:200px"></td></tr>').join('');
    const d = A.dialog({ title: 'Ánh xạ DGN (DGNMAPPING)', help: 'DGNMAPPING', html: '<div class="acw" style="width:460px"><div class="acw-row"><label>Tiền tố tên mức</label><input id="dmP" value="' + esc(M.prefix) + '" style="width:120px"> <span style="opacity:.7">(mức 5 → "' + esc(M.prefix) + '5")</span></div>' +
        '<fieldset class="acw-grp"><legend>Mức → tên lớp</legend><div class="lm-tbl" style="max-height:160px"><table id="dmL"><tr><th>Mức</th><th>Tên lớp</th></tr>' + rows + '</table></div><button type="button" id="dmA">＋ Thêm mức</button></fieldset>' +
        '<fieldset class="acw-grp"><legend>Kiểu nét DGN → kiểu nét</legend>' + [1, 2, 3, 4, 5, 6, 7].map(i => '<div class="acw-row"><label>Kiểu ' + i + '</label><select data-s="' + i + '">' + ltn.map(n => '<option' + (n === M.styles[i] ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>').join('') + '</fieldset></div>',
      onOpen: root => { const R = root.root || root; R.querySelectorAll('input,select').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation())); R.querySelector('#dmA').onclick = () => { const tr = document.createElement('tr'); tr.innerHTML = '<td><input type="number" min="1" max="63" style="width:60px"></td><td><input style="width:200px"></td>'; R.querySelector('#dmL').appendChild(tr); }; },
      ok: root => { const levels = {}; root.querySelectorAll('#dmL tr').forEach(tr => { const i = tr.querySelectorAll('input'); if(i.length === 2 && +i[0].value >= 1 && +i[0].value <= 63 && i[1].value.trim()) levels[+i[0].value] = i[1].value.trim(); });
        const styles = M.styles.slice(); root.querySelectorAll('[data-s]').forEach(s => { styles[+s.dataset.s] = s.value; }); SV('dvd:dgnmap', Object.assign({}, M, { levels, styles, prefix: root.querySelector('#dmP').value })); log('DGNMAPPING: ' + Object.keys(levels).length + ' mức có tên riêng.'); } }); void d; });
  A.dgnSetMapping = m => SV('dvd:dgnmap', Object.assign(MAP(), m || {}));
})();
