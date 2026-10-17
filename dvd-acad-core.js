/* DVDCAD — lõi thao tác kiểu AutoCAD
   - Bộ chạy lệnh có lời nhắc (chọn điểm / chọn đối tượng / nhập số / tuỳ chọn) — các lệnh viết tuần tự bằng async/await
   - Bắt điểm OSNAP (Endpoint, Midpoint, Center, Quadrant, Intersection, Perpendicular, Tangent, Nearest, Node, Insertion)
   - ORTHO, POLAR, truy bắt theo điểm (OTRACK), SNAP lưới, nhập động (Dynamic Input)
   - Chọn kiểu AutoCAD: bấm thêm, Shift+bấm bỏ, khung Window (trái→phải, xanh) / Crossing (phải→trái, xanh lá)
   - Lớp: lớp hiện hành, khoá, đóng băng, màu lớp; nhóm/khối (grp)
   Nạp sau script chính + dvd-cmd.js; dùng trực tiếp các biến/hàm toàn cục của app. */
(function(){
  'use strict';
  if(window.DVDAcad) return;
  const A = window.DVDAcad = {};
  const $ = id => document.getElementById(id);
  const say = m => { try{ toast(m); }catch(_){} };
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const isDeskPtr = () => !!(window.matchMedia && matchMedia('(pointer:fine)').matches) && !/iPhone|iPad|Android/i.test(navigator.userAgent);
  const deskUI = () => isDeskPtr() && window.innerWidth >= 900;
  const hasDoc = () => { try{ return !!(entities.length || window.__dvdNewDoc); }catch(_){ return false; } };
  const num = v => { const n = parseFloat(String(v).trim().replace(',', '.')); return isFinite(n) ? n : NaN; };
  const deacc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
  A.deskUI = deskUI; A.isDeskPtr = isDeskPtr; A.hasDoc = hasDoc;

  /* =====================================================================
     1) CÀI ĐẶT TRỢ GIÚP VẼ (lưu trên máy)
     ===================================================================== */
  const OS_ALL = ['end', 'mid', 'cen', 'qua', 'int', 'per', 'tan', 'nea', 'nod', 'ins'];
  const OS_NAME = { end: 'Điểm cuối', mid: 'Trung điểm', cen: 'Tâm', qua: 'Góc phần tư', int: 'Giao điểm', per: 'Vuông góc', tan: 'Tiếp tuyến', nea: 'Gần nhất', nod: 'Nút', ins: 'Điểm chèn' };
  const OS_KEY = { END: 'end', ENDP: 'end', MID: 'mid', CEN: 'cen', QUA: 'qua', INT: 'int', PER: 'per', TAN: 'tan', NEA: 'nea', NOD: 'nod', INS: 'ins', NON: 'none', NONE: 'none' };
  const SET = Object.assign({
    osnap: true, osm: ['end', 'mid', 'cen', 'int', 'per', 'qua', 'nod', 'ins'],
    ortho: false, polar: true, polarAng: 45, otrack: true, grid: true, snap: false, snapSp: 0, dyn: true,
    aperture: 10, pickbox: 5, xhair: 100
  }, (() => { try{ return JSON.parse(localStorage.getItem('dvd:acad') || '{}'); }catch(_){ return {}; } })());
  A.SET = SET; A.OS_NAME = OS_NAME; A.OS_ALL = OS_ALL;
  A.saveSet = () => { try{ localStorage.setItem('dvd:acad', JSON.stringify(SET)); }catch(_){} if(A.onSetChange) A.onSetChange(); paintSoon(); };

  /* =====================================================================
     2) HÌNH HỌC: tách đối tượng thành đoạn thẳng / cung (pieces) + giao điểm
     ===================================================================== */
  const G = A.G = {};
  const norm = a => { a %= TAU; return a < 0 ? a + TAU : a; };
  G.norm = norm;
  // Đường cong của 1 đối tượng: tham số u (LINE: 0..1, ARC/CIRCLE: góc kể từ đầu, POLYLINE: chiều dài, ELLIPSE: tham số elip)
  function curveOf(e){
    if(!e) return null;
    switch(e.type){
      case 'LINE': {
        const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
        return { e, kind: 'line', closed: false, u0: 0, u1: 1, len: L,
          pieces: [{ t: 's', ax: e.x1, ay: e.y1, bx: e.x2, by: e.y2, u0: 0, u1: 1 }],
          at: u => ({ x: e.x1 + (e.x2 - e.x1) * u, y: e.y1 + (e.y2 - e.y1) * u }),
          sub: (a, b) => { const p = { x: e.x1 + (e.x2 - e.x1) * a, y: e.y1 + (e.y2 - e.y1) * a }, q = { x: e.x1 + (e.x2 - e.x1) * b, y: e.y1 + (e.y2 - e.y1) * b }; return Object.assign(clone(e), { x1: p.x, y1: p.y, x2: q.x, y2: q.y }); } };
      }
      case 'ARC': {
        const a1 = norm(e.a1 * D2R); let sw = norm(e.a2 * D2R - a1); if(sw < 1e-9) sw = TAU;
        return { e, kind: 'arc', closed: false, u0: 0, u1: sw, len: sw * e.r, a1,
          pieces: [{ t: 'a', cx: e.cx, cy: e.cy, r: e.r, a0: a1, sw, u0: 0 }],
          at: u => ({ x: e.cx + e.r * Math.cos(a1 + u), y: e.cy + e.r * Math.sin(a1 + u) }),
          sub: (a, b) => Object.assign(clone(e), { a1: (a1 + a) * R2D, a2: (a1 + b) * R2D }) };
      }
      case 'CIRCLE':
        return { e, kind: 'circle', closed: true, u0: 0, u1: TAU, len: TAU * e.r, a1: 0,
          pieces: [{ t: 'a', cx: e.cx, cy: e.cy, r: e.r, a0: 0, sw: TAU, u0: 0 }],
          at: u => ({ x: e.cx + e.r * Math.cos(u), y: e.cy + e.r * Math.sin(u) }),
          sub: (a, b) => { const o = clone(e); o.type = 'ARC'; o.a1 = a * R2D; o.a2 = b * R2D; delete o.r; o.r = e.r; return o; } };
      case 'POLYLINE': case 'SOLID': {
        let v = (e.type === 'POLYLINE' ? e.vertices : solidOrder(e.pts)) || []; const closed = e.type === 'SOLID' ? true : !!e.closed;
        if(v.length < 2) return null;
        const pieces = []; let s = 0;
        const nseg = closed ? v.length : v.length - 1;
        for(let i = 0; i < nseg; i++){ const a = v[i], b = v[(i + 1) % v.length]; const L = Math.hypot(b.x - a.x, b.y - a.y); pieces.push({ t: 's', ax: a.x, ay: a.y, bx: b.x, by: b.y, u0: s, u1: s + L, i }); s += L; }
        const total = s;
        const at = u => { if(closed){ u = ((u % total) + total) % total; } u = Math.max(0, Math.min(total, u)); for(const p of pieces){ if(u <= p.u1 + 1e-12){ const f = p.u1 > p.u0 ? (u - p.u0) / (p.u1 - p.u0) : 0; return { x: p.ax + (p.bx - p.ax) * f, y: p.ay + (p.by - p.ay) * f }; } } const l = pieces[pieces.length - 1]; return { x: l.bx, y: l.by }; };
        return { e, kind: 'poly', closed, u0: 0, u1: total, len: total, pieces, at,
          sub: (a, b) => {   // a<b ; với đa tuyến kín b có thể > total (vòng qua điểm đầu)
            const pts = [at(a)];
            const verts = []; let acc = 0; for(let i = 0; i < pieces.length; i++){ acc = pieces[i].u1; verts.push({ s: acc, p: { x: pieces[i].bx, y: pieces[i].by } }); }
            const add = (lo, hi, off) => { for(const q of verts){ const ss = q.s + off; if(ss > lo + 1e-9 && ss < hi - 1e-9) pts.push({ x: q.p.x, y: q.p.y }); } };
            if(b <= total + 1e-12) add(a, b, 0); else { add(a, total + 1e-12, 0); add(total, b, total); }
            pts.push(at(b));
            const o = clone(e); o.type = 'POLYLINE'; o.vertices = dedup(pts); o.closed = false; delete o.pts; delete o.wq; return o;
          } };
      }
      case 'ELLIPSE': {
        let p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; if(p2 <= p1) p2 += TAU;
        const full = Math.abs(p2 - p1 - TAU) < 1e-6;
        const Mx = e.mx, My = e.my, mx = -e.my * (e.ratio || 1), my = e.mx * (e.ratio || 1);
        const at = t => ({ x: e.cx + Math.cos(t) * Mx + Math.sin(t) * mx, y: e.cy + Math.cos(t) * My + Math.sin(t) * my });
        const n = 96, pieces = [];
        for(let i = 0; i < n; i++){ const ta = p1 + (p2 - p1) * i / n, tb = p1 + (p2 - p1) * (i + 1) / n; const a = at(ta), b = at(tb); pieces.push({ t: 's', ax: a.x, ay: a.y, bx: b.x, by: b.y, u0: ta, u1: tb }); }
        return { e, kind: 'ellipse', closed: full, u0: p1, u1: p2, len: 0, pieces, at,
          sub: (a, b) => Object.assign(clone(e), { p1: a, p2: b }) };
      }
      case 'XLINE': {
        const L = Math.hypot(e.dx, e.dy) || 1, ux = e.dx / L, uy = e.dy / L, big = 1e7;
        const ax = e.ray ? e.x : e.x - ux * big, ay = e.ray ? e.y : e.y - uy * big;
        return { e, kind: 'xline', closed: false, u0: 0, u1: 1, len: 0, pieces: [{ t: 's', ax, ay, bx: e.x + ux * big, by: e.y + uy * big, u0: 0, u1: 1 }], at: u => ({ x: ax + (e.x + ux * big - ax) * u, y: ay + (e.y + uy * big - ay) * u }), sub: null };
      }
      case 'HATCH': {
        const pieces = []; for(const lp of (e.loops || [])){ for(let i = 0; i < lp.length; i++){ const a = lp[i], b = lp[(i + 1) % lp.length]; pieces.push({ t: 's', ax: a.x, ay: a.y, bx: b.x, by: b.y, u0: 0, u1: 0 }); } }
        return { e, kind: 'hatch', closed: true, u0: 0, u1: 0, len: 0, pieces, at: () => null, sub: null };
      }
    }
    return null;
  }
  G.curveOf = curveOf;
  function solidOrder(p){ p = p || []; return p.length === 4 ? [p[0], p[1], p[3], p[2]] : p; }
  function dedup(pts){ const o = []; for(const p of pts){ const l = o[o.length - 1]; if(!l || Math.hypot(l.x - p.x, l.y - p.y) > 1e-9) o.push(p); } return o; }
  function clone(e){ const o = JSON.parse(JSON.stringify(e)); delete o.userAdded; return o; }
  G.clone = clone; G.dedup = dedup;

  // điểm gần nhất trên 1 piece
  function nearOnPiece(p, w){
    if(p.t === 's'){ const dx = p.bx - p.ax, dy = p.by - p.ay, L2 = dx * dx + dy * dy; let f = L2 > 1e-18 ? ((w.x - p.ax) * dx + (w.y - p.ay) * dy) / L2 : 0; f = Math.max(0, Math.min(1, f)); return { x: p.ax + dx * f, y: p.ay + dy * f, u: p.u0 + (p.u1 - p.u0) * f }; }
    let a = Math.atan2(w.y - p.cy, w.x - p.cx); let off = norm(a - p.a0);
    if(off > p.sw){ const dA = off - p.sw, dB = TAU - off; off = dA < dB ? p.sw : 0; }
    const ang = p.a0 + off; return { x: p.cx + p.r * Math.cos(ang), y: p.cy + p.r * Math.sin(ang), u: p.u0 + off };
  }
  G.nearOnPiece = nearOnPiece;
  function nearOnCurve(c, w){ let best = null, bd = Infinity; for(const p of c.pieces){ const q = nearOnPiece(p, w); const d = Math.hypot(q.x - w.x, q.y - w.y); if(d < bd){ bd = d; best = q; } } if(best) best.d = bd; return best; }
  G.nearOnCurve = nearOnCurve;

  // giao điểm giữa 2 piece -> [{x,y,ua,ub}] (ua/ub = tham số trên từng đường cong)
  function onArc(p, ang){ const off = norm(ang - p.a0); return off <= p.sw + 1e-9 ? off : (TAU - off < 1e-9 ? 0 : -1); }
  function xPieces(a, b, ext){
    const out = [];
    if(a.t === 's' && b.t === 's'){
      const x1 = a.ax, y1 = a.ay, x2 = a.bx, y2 = a.by, x3 = b.ax, y3 = b.ay, x4 = b.bx, y4 = b.by;
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if(Math.abs(d) < 1e-14) return out;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
      const e1 = ext && ext.a ? 1e9 : 1e-9, e2 = ext && ext.b ? 1e9 : 1e-9;
      if(t < -e1 || t > 1 + e1 || u < -e2 || u > 1 + e2) return out;
      out.push({ x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), ua: a.u0 + (a.u1 - a.u0) * t, ub: b.u0 + (b.u1 - b.u0) * u, fa: t, fb: u });
      return out;
    }
    if(a.t === 'a' && b.t === 's'){ return xPieces(b, a, ext && { a: ext.b, b: ext.a }).map(q => ({ x: q.x, y: q.y, ua: q.ub, ub: q.ua, fa: q.fb, fb: q.fa })); }
    if(a.t === 's' && b.t === 'a'){
      const dx = a.bx - a.ax, dy = a.by - a.ay, fx = a.ax - b.cx, fy = a.ay - b.cy;
      const A2 = dx * dx + dy * dy, B2 = 2 * (fx * dx + fy * dy), C2 = fx * fx + fy * fy - b.r * b.r;
      if(A2 < 1e-18) return out; let disc = B2 * B2 - 4 * A2 * C2; if(disc < -1e-12) return out; disc = Math.sqrt(Math.max(0, disc));
      const lim = ext && ext.a ? 1e9 : 1e-9;
      for(const t of disc < 1e-12 ? [-B2 / (2 * A2)] : [(-B2 - disc) / (2 * A2), (-B2 + disc) / (2 * A2)]){
        if(t < -lim || t > 1 + lim) continue;
        const x = a.ax + dx * t, y = a.ay + dy * t; const off = ext && ext.b ? norm(Math.atan2(y - b.cy, x - b.cx) - b.a0) : onArc(b, Math.atan2(y - b.cy, x - b.cx)); if(off < 0) continue;
        out.push({ x, y, ua: a.u0 + (a.u1 - a.u0) * t, ub: b.u0 + off, fa: t, fb: off });
      }
      return out;
    }
    // cung – cung
    const dx = b.cx - a.cx, dy = b.cy - a.cy, d = Math.hypot(dx, dy);
    if(d < 1e-12 || d > a.r + b.r + 1e-9 || d < Math.abs(a.r - b.r) - 1e-9) return out;
    const l = (a.r * a.r - b.r * b.r + d * d) / (2 * d), h2 = a.r * a.r - l * l, h = Math.sqrt(Math.max(0, h2));
    const mx = a.cx + dx * l / d, my = a.cy + dy * l / d;
    const pts = h < 1e-12 ? [{ x: mx, y: my }] : [{ x: mx + h * dy / d, y: my - h * dx / d }, { x: mx - h * dy / d, y: my + h * dx / d }];
    for(const q of pts){
      const oa = ext && ext.a ? norm(Math.atan2(q.y - a.cy, q.x - a.cx) - a.a0) : onArc(a, Math.atan2(q.y - a.cy, q.x - a.cx));
      const ob = ext && ext.b ? norm(Math.atan2(q.y - b.cy, q.x - b.cx) - b.a0) : onArc(b, Math.atan2(q.y - b.cy, q.x - b.cx));
      if(oa < 0 || ob < 0) continue;
      out.push({ x: q.x, y: q.y, ua: a.u0 + oa, ub: b.u0 + ob, fa: oa, fb: ob });
    }
    return out;
  }
  G.xPieces = xPieces;
  function xCurves(c1, c2, ext){ const out = []; for(const a of c1.pieces) for(const b of c2.pieces){ for(const q of xPieces(a, b, ext)) out.push(q); } return out; }
  G.xCurves = xCurves;
  function pieceBB(p){ if(p.t === 's') return [Math.min(p.ax, p.bx), Math.min(p.ay, p.by), Math.max(p.ax, p.bx), Math.max(p.ay, p.by)]; return [p.cx - p.r, p.cy - p.r, p.cx + p.r, p.cy + p.r]; }
  G.pieceBB = pieceBB;
  G.ptInPoly = function(p, poly){ let c = false; for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j]; if(((a.y > p.y) !== (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / ((b.y - a.y) || 1e-300) + a.x)) c = !c; } return c; };
  G.ptInLoops = function(p, loops){ let c = false; for(const lp of loops) if(G.ptInPoly(p, lp)) c = !c; return c; };
  G.area = function(poly){ let s = 0; for(let i = 0; i < poly.length; i++){ const a = poly[i], b = poly[(i + 1) % poly.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };

  /* =====================================================================
     3) TRUY VẤN NHANH THEO HỘP BAO (dùng mảng số của app)
     ===================================================================== */
  function ensureBB(){ try{ if(bbDirty || bbN !== entities.length || !bbX0) buildBBoxCache(); }catch(_){} }
  const isHiddenE = e => hiddenUserLayers.has(e.layer || '0');
  function queryBox(x0, y0, x1, y1, max, opt){
    ensureBB(); const out = []; max = max || 1e9; opt = opt || {};
    for(let i = 0; i < bbN; i++){
      const a = bbX0[i]; const e = entities[i];
      if(a !== a){ if(e && e.type === 'XLINE' && !isHiddenE(e)) out.push(e); continue; }
      if(bbX1[i] < x0 || a > x1 || bbY1[i] < y0 || bbY0[i] > y1) continue;
      if(!e || isHiddenE(e)) continue;
      if(opt.noLocked && isLockedE(e)) continue;
      out.push(e); if(out.length >= max) break;
    }
    return out;
  }
  A.queryBox = queryBox; A.ensureBB = ensureBB;
  function visibleBox(){ const b = viewWorldAABB(); return b; }
  A.visibleEnts = (max) => { const b = visibleBox(); return queryBox(b.minX, b.minY, b.maxX, b.maxY, max); };

  /* =====================================================================
     4) LỚP: lớp hiện hành, khoá, đóng băng, màu (lưu theo bản vẽ)
     ===================================================================== */
  const LS = A.LS = { cur: '0', color: 'BYLAYER', off: new Set(), frozen: new Set(), locked: new Set(), hex: {}, orig: {}, extra: new Set(), lw: 'BYLAYER' };
  function lsKey(){ try{ return baseKey ? 'lay::' + baseKey : null; }catch(_){ return null; } }
  function isLockedE(e){ return LS.locked.has((e && e.layer) || '0'); }
  A.isLocked = isLockedE;
  A.layerHex = n => LS.hex[n] || LS.orig[n] || '#ffffff';
  A.layerNames = () => { const s = new Set(['0']); try{ for(const L of layerList) s.add(L.name); }catch(_){} for(const n of LS.extra) s.add(n); for(const n of Object.keys(LS.hex)) s.add(n); return [...s].sort((a, b) => a === '0' ? -1 : b === '0' ? 1 : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })); };
  function syncHidden(){   // đồng bộ với bảng Lớp gốc (điện thoại) nếu người dùng bật/tắt ở đó
    for(const n of [...LS.frozen]) if(!hiddenUserLayers.has(n)) LS.frozen.delete(n);
    for(const n of [...LS.off]) if(!hiddenUserLayers.has(n)) LS.off.delete(n);
    for(const n of hiddenUserLayers) if(!LS.frozen.has(n)) LS.off.add(n);
  }
  function applyHidden(){ hiddenUserLayers.clear(); for(const n of LS.off) hiddenUserLayers.add(n); for(const n of LS.frozen) hiddenUserLayers.add(n); }
  A.lsSync = syncHidden;
  A.lsSave = function(){
    const k = lsKey(); if(!k) return; syncHidden();
    const o = { cur: LS.cur, color: LS.color, off: [...LS.off], fz: [...LS.frozen], lk: [...LS.locked], hex: LS.hex, extra: [...LS.extra] };
    try{ localStorage.setItem(k, JSON.stringify(o)); }catch(_){}
    if(A.onLayers) A.onLayers();
  };
  A.lsLoad = function(){
    LS.cur = '0'; LS.color = 'BYLAYER'; LS.off = new Set(); LS.frozen = new Set(); LS.locked = new Set(); LS.hex = {}; LS.orig = {}; LS.extra = new Set();
    try{ for(const L of layerList) LS.orig[L.name] = String(L.hex || '#ffffff').toLowerCase(); }catch(_){}
    let o = null; const k = lsKey(); try{ o = k ? JSON.parse(localStorage.getItem(k) || 'null') : null; }catch(_){}
    if(o){
      LS.cur = o.cur || '0'; LS.color = o.color || 'BYLAYER';
      LS.off = new Set(o.off || []); LS.frozen = new Set(o.fz || []); LS.locked = new Set(o.lk || []); LS.extra = new Set(o.extra || []);
      const hex = o.hex || {};
      for(const [n, h] of Object.entries(hex)){ const old = LS.orig[n]; if(old && old !== h) recolorLayer(n, old, h, true); LS.hex[n] = h; }
      applyHidden();
    }
    if(!A.layerNames().includes(LS.cur)) LS.cur = '0';
    if(A.onLayers) A.onLayers();
  };
  function recolorLayer(name, oldHex, newHex, silent){
    oldHex = String(oldHex || '').toLowerCase(); let user = false;
    const seen = new Set();
    for(const arr of [modelEntities, entities]){
      if(!arr || seen.has(arr)) continue; seen.add(arr);
      for(const e of arr){ if((e.layer || '0') !== name) continue; if(e.bl || String(e.col || '').toLowerCase() === oldHex){ e.col = newHex; if(e.bl === undefined && e.userAdded) e.bl = 1; if(e.userAdded) user = true; } }
    }
    if(user && !silent) try{ saveGeomEdits(); }catch(_){}
  }
  A.setLayerColor = function(name, hex){
    hex = String(hex).toLowerCase(); const old = A.layerHex(name);
    recolorLayer(name, old, hex, false);
    LS.hex[name] = hex; try{ for(const L of layerList) if(L.name === name) L.hex = hex; }catch(_){}
    A.lsSave(); try{ draw(); }catch(_){}
  };
  A.setLayerFlag = function(name, flag, on){
    syncHidden();
    const set = flag === 'off' ? LS.off : flag === 'frozen' ? LS.frozen : LS.locked;
    if(on) set.add(name); else set.delete(name);
    if(flag === 'frozen' && on && name === LS.cur){ say('Không đóng băng được lớp hiện hành.'); LS.frozen.delete(name); }
    if(flag !== 'locked') applyHidden();
    if(flag === 'locked' && on){ try{ for(const e of [...selEnts]) if((e.layer || '0') === name) selEnts.delete(e); }catch(_){} }
    A.lsSave(); try{ invalidateSnap(); forceRedraw(); }catch(_){ try{ draw(); }catch(__){} }
  };
  A.setCurLayer = function(name){ if(!name) return; if(!A.layerNames().includes(name)) LS.extra.add(name); LS.cur = name; if(LS.frozen.has(name)){ LS.frozen.delete(name); applyHidden(); } A.lsSave(); };
  A.addLayer = function(name, hex){ name = String(name || '').trim(); if(!name) return false; if(A.layerNames().includes(name)) return false; LS.extra.add(name); if(hex) LS.hex[name] = String(hex).toLowerCase(); A.lsSave(); return true; };
  A.deleteLayer = function(name){
    if(name === '0' || name === LS.cur) return 'Không xoá được lớp 0 hoặc lớp hiện hành.';
    for(const e of modelEntities) if((e.layer || '0') === name) return 'Lớp còn đối tượng — chỉ xoá được lớp trống.';
    LS.extra.delete(name); delete LS.hex[name]; LS.off.delete(name); LS.frozen.delete(name); LS.locked.delete(name); applyHidden(); A.lsSave(); return '';
  };
  A.setCurColor = function(c){ LS.color = c || 'BYLAYER'; A.lsSave(); };
  // Thuộc tính cho đối tượng mới: lớp hiện hành + màu (ByLayer)
  A.newProps = function(e){
    e.layer = LS.cur || '0';
    if(LS.color === 'BYLAYER'){ e.col = A.layerHex(e.layer); e.bl = 1; } else { e.col = LS.color; delete e.bl; }
    return e;
  };

  /* =====================================================================
     5) NHÓM / KHỐI (grp) + lọc khoá
     ===================================================================== */
  let _gid = 0;
  A.newGroupId = p => (p || 'G') + Date.now().toString(36) + (++_gid).toString(36) + Math.random().toString(36).slice(2, 5);
  function groupMap(){ const m = new Map(); for(const e of modelEntities){ if(e && e.grp){ let a = m.get(e.grp); if(!a){ a = []; m.set(e.grp, a); } a.push(e); } } return m; }
  A.groupMembers = function(gid){ const out = []; for(const e of modelEntities) if(e && e.grp === gid) out.push(e); return out; };
  A.expandGroups = function(set){
    let has = false; for(const e of set) if(e && e.grp){ has = true; break; } if(!has) return set;
    const m = groupMap(); for(const e of [...set]){ if(e && e.grp){ const a = m.get(e.grp); if(a) for(const x of a) if(!isHiddenE(x)) set.add(x); } }
    return set;
  };
  A.filterSel = function(arr){ return arr.filter(e => e && !isLockedE(e) && !isHiddenE(e)); };

  /* =====================================================================
     6) GHI THAY ĐỔI (1 bước hoàn tác) — add / del / rep
     ===================================================================== */
  A.lastAdded = []; A.prevSel = [];
  A.commit = function(ch, msg){
    try{ if(!isModelView()){ say('Chuyển về Model để vẽ/sửa.'); return false; } }catch(_){}
    ch = ch || {}; const steps = [];
    const rep = ch.rep || [], del = ch.del || [], add = ch.add || [];
    const repItems = [];
    for(const [o, w] of rep){
      const i = modelEntities.indexOf(o); if(i < 0) continue;
      const sig = entSig(o), wasAdded = !!o.userAdded; w.userAdded = true; if(w.layer == null) w.layer = o.layer || '0'; if(w.col == null) w.col = o.col;
      modelEntities.splice(i, 1, w); if(!wasAdded) geomDel.add(sig);
      repItems.push({ orig: o, work: w, sig, wasAdded });
    }
    if(repItems.length) steps.push({ op: 'batchReplace', items: repItems });
    const removed = [];
    for(const e of del){ const i = modelEntities.indexOf(e); if(i < 0) continue; const sig = entSig(e), wasAdded = !!e.userAdded; modelEntities.splice(i, 1); if(!wasAdded) geomDel.add(sig); removed.push({ ent: e, sig, wasAdded }); }
    if(removed.length) steps.push({ op: 'delMulti', items: removed });
    const added = [];
    for(const e of add){ if(!e) continue; e.userAdded = true; if(e.layer == null) A.newProps(e); else if(e.col == null) e.col = A.layerHex(e.layer); modelEntities.push(e); added.push(e); }
    if(added.length) steps.push({ op: 'arrayAdd', ents: added });
    if(!steps.length) return false;
    pushUndo(steps.length === 1 ? steps[0] : { op: 'multi', steps });
    bbDirty = true; snapDirty = true; try{ saveGeomEdits(); }catch(_){}
    if(added.length) A.lastAdded = added;
    try{ if(infoIdx >= 0) hideObjectInfo(); }catch(_){}
    for(const e of del) selEnts.delete(e); for(const [o, w] of rep){ if(selEnts.has(o)){ selEnts.delete(o); selEnts.add(w); } }
    try{ if(typeof buildLayerList === 'function') buildLayerList(); }catch(_){}
    draw(); if(msg) say(msg);
    return true;
  };

  /* =====================================================================
     7) BẮT ĐIỂM (OSNAP)
     ===================================================================== */
  let osOverride = null;   // bắt điểm 1 lần (gõ END, MID...) hoặc 'none'
  const PRI = { end: 0, int: 1, mid: 2, cen: 3, qua: 4, per: 5, tan: 6, nod: 7, ins: 8, nea: 9 };
  function osnapFind(w, sp, base, touch){
    const modes = osOverride ? (osOverride === 'none' ? [] : [osOverride]) : (SET.osnap ? SET.osm : []);
    if(!modes.length) return null;
    const M = new Set(modes);
    const ap = (touch ? 22 : SET.aperture) / view.scale;
    const cands = queryBox(w.x - ap, w.y - ap, w.x + ap, w.y + ap, 400);
    if(!cands.length) return null;
    let best = null;
    const consider = (x, y, type, d, extra) => {
      if(!isFinite(x) || !isFinite(y)) return;
      const dd = d != null ? d : Math.hypot(x - w.x, y - w.y);
      if(dd > ap) return;
      const score = dd + (type === 'nea' ? ap * 2 : 0) + PRI[type] * 1e-9;
      if(!best || score < best.score) best = Object.assign({ x, y, type, score }, extra || {});
    };
    const curves = [];
    for(const e of cands){
      if(e.type === 'POINT'){ if(M.has('nod')) consider(e.x, e.y, 'nod'); continue; }
      if(e.type === 'TEXT'){ if(M.has('ins')) consider(e.x, e.y, 'ins'); continue; }
      if(e.type === 'HATCH') continue;
      const c = curveOf(e); if(!c) continue; curves.push(c);
      if(c.kind === 'line'){
        if(M.has('end')){ consider(e.x1, e.y1, 'end'); consider(e.x2, e.y2, 'end'); }
        if(M.has('mid')) consider((e.x1 + e.x2) / 2, (e.y1 + e.y2) / 2, 'mid');
      } else if(c.kind === 'poly'){
        const scr = view.scale;
        for(const p of c.pieces){
          if(M.has('end')){ consider(p.ax, p.ay, 'end'); consider(p.bx, p.by, 'end'); }
          if(M.has('mid') && Math.hypot(p.bx - p.ax, p.by - p.ay) * scr > 14) consider((p.ax + p.bx) / 2, (p.ay + p.by) / 2, 'mid');
        }
      } else if(c.kind === 'arc' || c.kind === 'circle'){
        const p = c.pieces[0];
        const edge = nearOnPiece(p, w), ed = Math.hypot(edge.x - w.x, edge.y - w.y);
        if(M.has('cen')){ const dc = Math.hypot(e.cx - w.x, e.cy - w.y); consider(e.cx, e.cy, 'cen', Math.min(dc, ed + ap * 0.35)); }
        if(c.kind === 'arc'){
          if(M.has('end')){ const a = c.at(0), b = c.at(c.u1); consider(a.x, a.y, 'end'); consider(b.x, b.y, 'end'); }
          if(M.has('mid')){ const m = c.at(c.u1 / 2); consider(m.x, m.y, 'mid'); }
        }
        if(M.has('qua')) for(let k = 0; k < 4; k++){ const ang = k * Math.PI / 2; if(c.kind === 'circle' || onArc(p, ang) >= 0) consider(e.cx + e.r * Math.cos(ang), e.cy + e.r * Math.sin(ang), 'qua'); }
      } else if(c.kind === 'ellipse'){
        if(M.has('cen')) consider(e.cx, e.cy, 'cen');
        if(M.has('qua')){ for(const t of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]){ const q = c.at(t); consider(q.x, q.y, 'qua'); } }
        if(M.has('end') && !c.closed){ const a = c.at(c.u0), b = c.at(c.u1); consider(a.x, a.y, 'end'); consider(b.x, b.y, 'end'); }
      }
      if(base && M.has('per')){
        for(const p of c.pieces){
          if(p.t === 's'){ const dx = p.bx - p.ax, dy = p.by - p.ay, L2 = dx * dx + dy * dy; if(L2 < 1e-18) continue; const f = ((base.x - p.ax) * dx + (base.y - p.ay) * dy) / L2; if(f < -1e-9 || f > 1 + 1e-9) continue; consider(p.ax + dx * f, p.ay + dy * f, 'per'); }
          else { const a = Math.atan2(base.y - p.cy, base.x - p.cx); for(const ang of [a, a + Math.PI]){ if(onArc(p, ang) >= 0) consider(p.cx + p.r * Math.cos(ang), p.cy + p.r * Math.sin(ang), 'per'); } }
        }
      }
      if(base && M.has('tan') && (c.kind === 'arc' || c.kind === 'circle')){
        const p = c.pieces[0], d = Math.hypot(base.x - p.cx, base.y - p.cy);
        if(d > p.r + 1e-9){ const a = Math.atan2(base.y - p.cy, base.x - p.cx), b = Math.acos(p.r / d); for(const ang of [a + b, a - b]){ if(onArc(p, ang) >= 0) consider(p.cx + p.r * Math.cos(ang), p.cy + p.r * Math.sin(ang), 'tan'); } }
      }
      if(M.has('nea')){ const q = nearOnCurve(c, w); if(q) consider(q.x, q.y, 'nea', q.d); }
    }
    if(M.has('int') && curves.length >= 1){
      // các piece gần con trỏ
      const near = [];
      for(const c of curves){ for(const p of c.pieces){ const b = pieceBB(p); if(b[2] < w.x - ap || b[0] > w.x + ap || b[3] < w.y - ap || b[1] > w.y + ap) continue; near.push({ p, c }); if(near.length > 240) break; } if(near.length > 240) break; }
      for(let i = 0; i < near.length; i++) for(let j = i + 1; j < near.length; j++){
        if(near[i].c === near[j].c && near[i].c.kind !== 'poly') continue;
        if(near[i].c === near[j].c && Math.abs((near[i].p.i || 0) - (near[j].p.i || 0)) <= 1) continue;   // 2 đoạn liền kề của cùng đa tuyến
        for(const q of xPieces(near[i].p, near[j].p)) consider(q.x, q.y, 'int');
      }
    }
    return best;
  }
  A.osnapFind = osnapFind;

  /* =====================================================================
     8) TÍNH ĐIỂM: OSNAP → OTRACK → ORTHO/POLAR → SNAP
     ===================================================================== */
  const acq = [];   // điểm đã "dừng" để truy bắt (OTRACK)
  let acqCand = null;
  function gridSpacing(){
    if(SET.snapSp > 0) return SET.snapSp;
    const raw = 18 / view.scale, pow = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 5, 10].map(m => m * pow).find(c => c >= raw) || 10 * pow;
  }
  A.gridSpacing = gridSpacing;
  function computePoint(sp, r, touch){
    const w = toWorld(sp.x, sp.y);
    const res = { x: w.x, y: w.y, raw: w, snap: null, track: null };
    const base = r && r.base;
    const os = (r && r.noSnap) ? null : osnapFind(w, sp, base, touch);
    if(os){ res.x = os.x; res.y = os.y; res.snap = os; noteAcquire(os); return res; }
    noteAcquire(null);
    // truy bắt theo điểm đã dừng (OTRACK) + polar từ điểm gốc
    const tol = (touch ? 14 : 9) / view.scale;
    const lines = [];
    if(base && !(r && r.noOrtho)){
      if(SET.ortho){
        const dx = w.x - base.x, dy = w.y - base.y;
        if(Math.abs(dx) >= Math.abs(dy)){ res.x = w.x; res.y = base.y; res.track = { base, ang: dx >= 0 ? 0 : Math.PI, d: Math.abs(dx), ortho: true }; }
        else { res.x = base.x; res.y = w.y; res.track = { base, ang: dy >= 0 ? Math.PI / 2 : -Math.PI / 2, d: Math.abs(dy), ortho: true }; }
        return snapGridMaybe(res, true);
      }
      if(SET.polar) lines.push({ p: base, incs: SET.polarAng, kind: 'polar' });
    }
    if(SET.otrack && SET.osnap) for(const a of acq) lines.push({ p: a, incs: SET.polar ? SET.polarAng : 90, kind: 'track' });
    const hits = [];
    for(const L of lines){
      const ang = Math.atan2(w.y - L.p.y, w.x - L.p.x), inc = L.incs * D2R;
      const a2 = Math.round(ang / inc) * inc, ux = Math.cos(a2), uy = Math.sin(a2);
      const d = (w.x - L.p.x) * ux + (w.y - L.p.y) * uy; if(d <= tol * 0.5) continue;
      const off = Math.abs(-(w.x - L.p.x) * uy + (w.y - L.p.y) * ux);
      if(off <= tol) hits.push({ L, ang: a2, ux, uy, d, off });
    }
    if(hits.length >= 2){   // giao 2 đường truy bắt
      let bestX = null;
      for(let i = 0; i < hits.length; i++) for(let j = i + 1; j < hits.length; j++){
        const a = hits[i], b = hits[j]; const den = a.ux * b.uy - a.uy * b.ux; if(Math.abs(den) < 1e-9) continue;
        const t = ((b.L.p.x - a.L.p.x) * b.uy - (b.L.p.y - a.L.p.y) * b.ux) / den;
        const X = { x: a.L.p.x + a.ux * t, y: a.L.p.y + a.uy * t }; const dd = Math.hypot(X.x - w.x, X.y - w.y);
        if(dd <= tol * 1.6 && (!bestX || dd < bestX.dd)) bestX = { X, a, b, dd };
      }
      if(bestX){ res.x = bestX.X.x; res.y = bestX.X.y; res.track = { multi: [bestX.a, bestX.b].map(h => ({ base: h.L.p, ang: h.ang, kind: h.L.kind })), base: base, d: base ? Math.hypot(res.x - base.x, res.y - base.y) : 0, ang: base ? Math.atan2(res.y - base.y, res.x - base.x) : 0 }; return res; }
    }
    if(hits.length){
      hits.sort((a, b) => a.off - b.off); const h = hits[0];
      res.x = h.L.p.x + h.ux * h.d; res.y = h.L.p.y + h.uy * h.d;
      res.track = { base: h.L.p, ang: h.ang, d: h.d, kind: h.L.kind };
      return snapGridMaybe(res, true);
    }
    return snapGridMaybe(res, false);
  }
  function snapGridMaybe(res, along){
    if(!SET.snap) return res;
    const s = gridSpacing();
    if(along && res.track && res.track.base){ const d = Math.round(res.track.d / s) * s; res.x = res.track.base.x + Math.cos(res.track.ang) * d; res.y = res.track.base.y + Math.sin(res.track.ang) * d; res.track.d = d; return res; }
    res.x = Math.round(res.x / s) * s; res.y = Math.round(res.y / s) * s; return res;
  }
  let acqTimer = 0;
  function noteAcquire(os){
    if(!SET.otrack || !SET.osnap){ acqCand = null; return; }
    if(!os){ acqCand = null; clearTimeout(acqTimer); return; }
    if(acqCand && Math.hypot(acqCand.x - os.x, acqCand.y - os.y) < 1e-9) return;
    acqCand = { x: os.x, y: os.y }; clearTimeout(acqTimer);
    const c = acqCand;
    acqTimer = setTimeout(() => { if(acqCand !== c) return; const i = acq.findIndex(p => Math.hypot(p.x - c.x, p.y - c.y) < 1e-9); if(i >= 0) acq.splice(i, 1); else { acq.push({ x: c.x, y: c.y }); if(acq.length > 4) acq.shift(); } paintSoon(); }, 550);
  }
  A.clearTrack = () => { acq.length = 0; };
  A.computePoint = computePoint;

  /* =====================================================================
     9) LỚP VẼ PHỦ (overlay): con trỏ chữ thập, dấu bắt điểm, xem trước, chọn
     ===================================================================== */
  const stage = document.querySelector('.stage');
  const ovS = document.createElement('canvas'); ovS.id = 'dvdOvS';
  const ovC = document.createElement('canvas'); ovC.id = 'dvdOvC';
  for(const c of [ovS, ovC]){ c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1'; }
  cv.insertAdjacentElement('afterend', ovC); cv.insertAdjacentElement('afterend', ovS);
  const cS = ovS.getContext('2d'), cC = ovC.getContext('2d');
  // điện thoại: lớp phủ chỉ cấp bộ nhớ khi đang chạy lệnh (tiết kiệm RAM iPhone); dpr tối đa 2
  function ovDpr(){ return deskUI() ? (window.devicePixelRatio || 1) : (cur ? Math.min(2, window.devicePixelRatio || 1) : 0); }
  function sizeOv(){ const dpr = ovDpr(); const w = dpr ? cv.clientWidth : 1, h = dpr ? cv.clientHeight : 1; for(const c of [ovS, ovC]){ const W2 = Math.max(1, Math.round(w * (dpr || 1))), H2 = Math.max(1, Math.round(h * (dpr || 1))); if(c.width !== W2 || c.height !== H2){ c.width = W2; c.height = H2; } } }
  // vẽ đối tượng bằng hàm của app lên canvas phủ
  function withCtx(c2, fn){ const sv = ctx; ctx = c2; try{ fn(); } finally { ctx = sv; } }
  function drawEntOn(c2, e, color, width, dash){
    withCtx(c2, () => {
      c2.save(); c2.lineWidth = width || 1.6; c2.setLineDash(dash || []); c2.lineJoin = 'round'; c2.lineCap = 'round';
      if(e.type === 'HATCH'){ c2.strokeStyle = color; for(const lp of (e.loops || [])) strokePts(lp, true); }
      else { const sc = e.col; e.col = color; const svLW = showLW; try{ showLW = false; drawEntity(e); } finally { e.col = sc; showLW = svLW; } }
      c2.restore();
    });
  }
  A.drawEntOn = drawEntOn;
  let mouse = null, mouseIn = false, lastTouch = false;
  let cur = null;          // lệnh đang chạy
  let win = null;          // khung chọn {x0,y0,x1,y1,owner,press}
  let hoverEnt = null;
  let lastPt = null;       // kết quả computePoint gần nhất
  let _paintS = 0, _paintC = 0;
  function paintSoon(){ if(!_paintC) _paintC = requestAnimationFrame(() => { _paintC = 0; paintC(); }); }
  function paintSelSoon(){ if(!_paintS) _paintS = requestAnimationFrame(() => { _paintS = 0; paintS(); }); }
  A.paint = () => { paintSelSoon(); paintSoon(); };
  function acc(){ return getCSS('--accent') || '#38bdf8'; }
  function paintS(){
    sizeOv(); const dpr = ovDpr(); if(!dpr) return; cS.setTransform(dpr, 0, 0, dpr, 0, 0); cS.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    if(!hasDoc()) return;
    if(!cur){ drawGrips(cS); return; }
    if(cur.hot){ const P = toScreen(cur.hot.x, cur.hot.y); cS.fillStyle = '#ff3b3b'; cS.fillRect(Math.round(P.x) - 4, Math.round(P.y) - 4, 8, 8); }
    const sel = cur.sel; if(sel && sel.size){ let n = 0; for(const e of sel){ if(n++ > 4000) break; drawEntOn(cS, e, '#5aa9ff', 2, [7, 4]); } }
    if(cur.hl && cur.hl.length){ for(const e of cur.hl) drawEntOn(cS, e, '#ffd24a', 2.4, []); }
  }
  // phần xem trước của lệnh: các hàm vẽ theo toạ độ thế giới
  function previewApi(c2){
    const T = p => toScreen(p.x, p.y);
    return {
      ent: (e, color, dash) => drawEntOn(c2, e, color || '#e8eef7', 1.4, dash),
      ents: (arr, color) => { let n = 0; for(const e of arr){ if(n++ > 3000) break; drawEntOn(c2, e, color || '#e8eef7', 1.3, []); } },
      shift: (arr, dx, dy, color) => { const o = toScreen(0, 0), q = toScreen(dx, dy); c2.save(); c2.translate(q.x - o.x, q.y - o.y); let n = 0; for(const e of arr){ if(n++ > 4000) break; drawEntOn(c2, e, color || '#e8eef7', 1.3, []); } c2.restore(); },
      xform: (arr, fn, color) => { let n = 0; for(const e of arr){ if(n++ > 900) break; const w = JSON.parse(JSON.stringify(e)); try{ fn(w); }catch(_){ continue; } drawEntOn(c2, w, color || '#e8eef7', 1.3, []); } },
      line: (a, b, color, dash) => { const A1 = T(a), B1 = T(b); c2.save(); c2.strokeStyle = color || '#e8eef7'; c2.lineWidth = 1.3; c2.setLineDash(dash || []); c2.beginPath(); c2.moveTo(A1.x, A1.y); c2.lineTo(B1.x, B1.y); c2.stroke(); c2.restore(); },
      circle: (c, r, color, dash) => { const C = T(c); c2.save(); c2.strokeStyle = color || '#e8eef7'; c2.lineWidth = 1.3; c2.setLineDash(dash || []); c2.beginPath(); c2.arc(C.x, C.y, Math.abs(r) * view.scale, 0, TAU); c2.stroke(); c2.restore(); },
      poly: (pts, closed, color, dash) => { if(!pts.length) return; c2.save(); c2.strokeStyle = color || '#e8eef7'; c2.lineWidth = 1.3; c2.setLineDash(dash || []); c2.beginPath(); const p0 = T(pts[0]); c2.moveTo(p0.x, p0.y); for(let i = 1; i < pts.length; i++){ const q = T(pts[i]); c2.lineTo(q.x, q.y); } if(closed) c2.closePath(); c2.stroke(); c2.restore(); },
      fill: (loops, color) => { c2.save(); c2.fillStyle = color || 'rgba(90,169,255,.25)'; c2.beginPath(); for(const lp of loops){ if(!lp.length) continue; const p0 = T(lp[0]); c2.moveTo(p0.x, p0.y); for(let i = 1; i < lp.length; i++){ const q = T(lp[i]); c2.lineTo(q.x, q.y); } c2.closePath(); } c2.fill('evenodd'); c2.restore(); },
      dot: (p, color) => { const P = T(p); c2.save(); c2.fillStyle = color || '#ffd24a'; c2.beginPath(); c2.arc(P.x, P.y, 3.5, 0, TAU); c2.fill(); c2.restore(); },
      label: (p, text, color) => { const P = T(p); c2.save(); c2.font = '600 12px system-ui,sans-serif'; const tw = c2.measureText(text).width; c2.fillStyle = 'rgba(20,24,32,.88)'; c2.fillRect(P.x + 10, P.y - 24, tw + 10, 18); c2.fillStyle = color || '#e8eef7'; c2.fillText(text, P.x + 15, P.y - 11); c2.restore(); }
    };
  }
  A.previewApi = previewApi;
  function drawMarker(c2, P, type){
    c2.save(); c2.strokeStyle = '#ffcf1a'; c2.lineWidth = 2; c2.setLineDash([]); const s = 7;
    c2.beginPath();
    switch(type){
      case 'end': c2.rect(P.x - s, P.y - s, 2 * s, 2 * s); break;
      case 'mid': c2.moveTo(P.x, P.y - s - 1); c2.lineTo(P.x + s, P.y + s - 1); c2.lineTo(P.x - s, P.y + s - 1); c2.closePath(); break;
      case 'cen': c2.arc(P.x, P.y, s, 0, TAU); break;
      case 'qua': c2.moveTo(P.x, P.y - s); c2.lineTo(P.x + s, P.y); c2.lineTo(P.x, P.y + s); c2.lineTo(P.x - s, P.y); c2.closePath(); break;
      case 'int': c2.moveTo(P.x - s, P.y - s); c2.lineTo(P.x + s, P.y + s); c2.moveTo(P.x + s, P.y - s); c2.lineTo(P.x - s, P.y + s); break;
      case 'per': c2.moveTo(P.x - s, P.y - s); c2.lineTo(P.x - s, P.y + s); c2.lineTo(P.x + s, P.y + s); c2.moveTo(P.x - s, P.y); c2.lineTo(P.x, P.y); c2.lineTo(P.x, P.y + s); break;
      case 'tan': c2.arc(P.x, P.y, s, 0, TAU); c2.moveTo(P.x - s, P.y - s); c2.lineTo(P.x + s, P.y - s); break;
      case 'nea': c2.moveTo(P.x - s, P.y - s); c2.lineTo(P.x + s, P.y - s); c2.lineTo(P.x - s, P.y + s); c2.lineTo(P.x + s, P.y + s); c2.closePath(); break;
      case 'nod': c2.arc(P.x, P.y, s, 0, TAU); c2.moveTo(P.x - s * .7, P.y - s * .7); c2.lineTo(P.x + s * .7, P.y + s * .7); c2.moveTo(P.x + s * .7, P.y - s * .7); c2.lineTo(P.x - s * .7, P.y + s * .7); break;
      case 'ins': c2.rect(P.x - s, P.y - s, s, s); c2.rect(P.x, P.y, s, s); break;
    }
    c2.stroke(); c2.restore();
  }
  function tipBox(c2, x, y, text, bg, fg){ c2.save(); c2.font = '12px system-ui,sans-serif'; const tw = c2.measureText(text).width; c2.fillStyle = bg || 'rgba(255,248,200,.95)'; c2.strokeStyle = 'rgba(0,0,0,.35)'; c2.fillRect(x, y, tw + 10, 18); c2.strokeRect(x + .5, y + .5, tw + 9, 17); c2.fillStyle = fg || '#1b1b1b'; c2.fillText(text, x + 5, y + 13); c2.restore(); }
  function paintC(){
    sizeOv(); const dpr = ovDpr(); if(!dpr){ updateDyn(); return; } cC.setTransform(dpr, 0, 0, dpr, 0, 0); const Wd = cv.clientWidth, Hd = cv.clientHeight; cC.clearRect(0, 0, Wd, Hd);
    if(!hasDoc()){ updateDyn(); return; }
    const r = cur && cur.req;
    // ô nắm dưới con trỏ (hồng)
    if(!r && mouseIn && mouse && !win){ const gh = gripHit(mouse); if(gh){ const P = toScreen(gh.x, gh.y); cC.fillStyle = '#ff5fd2'; cC.fillRect(Math.round(P.x) - 5, Math.round(P.y) - 5, 10, 10); } }
    // làm nổi đối tượng dưới con trỏ (xem trước lựa chọn)
    if(hoverEnt && mouseIn && (!r || r.type === 'sel') && !win){
      const set = hoverEnt.grp ? A.groupMembers(hoverEnt.grp) : [hoverEnt];
      let n = 0; for(const e of set){ if(n++ > 600) break; drawEntOn(cC, e, '#9fd0ff', 2.6, []); }
    }
    // xem trước của lệnh
    if(r && (mouseIn || lastTouch) && lastPt && (r.type === 'pt' || r.type === 'dist' || r.type === 'ang')){
      const g = previewApi(cC);
      if(r.base && r.rubber !== false) g.line(r.base, lastPt, 'rgba(232,238,247,.75)', [6, 4]);
      if(r.preview){ try{ r.preview(g, { x: lastPt.x, y: lastPt.y }); }catch(err){ console.warn(err); } }
    }
    if(r && r.type === 'sel' && r.preview && lastPt){ try{ r.preview(previewApi(cC), { x: lastPt.x, y: lastPt.y }); }catch(_){} }
    // đường truy bắt / polar
    if(lastPt && lastPt.track && mouseIn && r && r.type !== 'sel'){
      const tr = lastPt.track.multi || [lastPt.track];
      cC.save(); cC.strokeStyle = 'rgba(80,255,130,.85)'; cC.lineWidth = 1; cC.setLineDash([3, 4]);
      for(const t of tr){ if(!t.base) continue; const B = toScreen(t.base.x, t.base.y); const far = 5000 / view.scale; const E = toScreen(t.base.x + Math.cos(t.ang) * far, t.base.y + Math.sin(t.ang) * far);
        cC.beginPath(); cC.moveTo(B.x, B.y); cC.lineTo(E.x, E.y); cC.stroke(); }
      cC.restore();
      const P = toScreen(lastPt.x, lastPt.y);
      cC.save(); cC.strokeStyle = 'rgba(80,255,130,.95)'; cC.lineWidth = 1.5; cC.beginPath(); cC.moveTo(P.x - 5, P.y - 5); cC.lineTo(P.x + 5, P.y + 5); cC.moveTo(P.x + 5, P.y - 5); cC.lineTo(P.x - 5, P.y + 5); cC.stroke(); cC.restore();
      if(!SET.dyn || !deskUI()){
        const t0 = lastPt.track; const lbl = (t0.ortho ? 'Ortho: ' : t0.multi ? 'Giao truy bắt: ' : t0.kind === 'track' ? 'Truy bắt: ' : 'Polar: ') + A.fmt(t0.d || 0) + ' < ' + Math.round(((t0.ang * R2D) % 360 + 360) % 360) + '°';
        tipBox(cC, P.x + 16, P.y + 14, lbl);
      }
    }
    // điểm đã "dừng" (OTRACK)
    if(acq.length && r && r.type !== 'sel'){ cC.save(); cC.strokeStyle = 'rgba(80,255,130,.95)'; cC.lineWidth = 1.4; for(const a of acq){ const P = toScreen(a.x, a.y); cC.beginPath(); cC.moveTo(P.x - 4, P.y); cC.lineTo(P.x + 4, P.y); cC.moveTo(P.x, P.y - 4); cC.lineTo(P.x, P.y + 4); cC.stroke(); } cC.restore(); }
    // dấu bắt điểm
    if(lastPt && lastPt.snap && (mouseIn || lastTouch) && r && r.type !== 'sel'){
      const P = toScreen(lastPt.snap.x, lastPt.snap.y); drawMarker(cC, P, lastPt.snap.type);
      if(deskUI()) tipBox(cC, P.x + 12, P.y + 12, OS_NAME[lastPt.snap.type] || lastPt.snap.type);
    }
    // khung chọn
    if(win){ const x = Math.min(win.x0, win.x1), y = Math.min(win.y0, win.y1), w = Math.abs(win.x1 - win.x0), h = Math.abs(win.y1 - win.y0); const cross = win.x1 < win.x0;
      cC.save(); cC.lineWidth = 1; if(cross){ cC.strokeStyle = '#4ce07a'; cC.fillStyle = 'rgba(60,200,100,.16)'; cC.setLineDash([6, 4]); } else { cC.strokeStyle = '#5aa9ff'; cC.fillStyle = 'rgba(60,140,255,.16)'; cC.setLineDash([]); }
      cC.fillRect(x, y, w, h); cC.strokeRect(x + .5, y + .5, w, h); cC.restore(); }
    // biểu tượng UCS
    if(deskUI()){ const ox = 34, oy = Hd - 34; cC.save(); cC.lineWidth = 1.6; cC.setLineDash([]);
      const rx = Math.cos(-view.rot), ry = Math.sin(-view.rot);
      cC.strokeStyle = '#ff5b5b'; cC.beginPath(); cC.moveTo(ox, oy); cC.lineTo(ox + rx * 30, oy + ry * 30); cC.stroke();
      cC.strokeStyle = '#4ce07a'; cC.beginPath(); cC.moveTo(ox, oy); cC.lineTo(ox + ry * 30, oy - rx * 30); cC.stroke();
      cC.fillStyle = '#d7dde6'; cC.font = '600 10px system-ui,sans-serif'; cC.fillText('X', ox + rx * 30 + 3, oy + ry * 30 + 4); cC.fillText('Y', ox + ry * 30 - 3, oy - rx * 30 - 4);
      cC.strokeStyle = '#d7dde6'; cC.strokeRect(ox - 3, oy - 3, 6, 6); cC.restore(); }
    // con trỏ chữ thập (chuột)
    if(mouseIn && mouse && deskUI() && !lastTouch){
      const P = (lastPt && r && r.type !== 'sel' && (lastPt.snap || lastPt.track)) ? toScreen(lastPt.x, lastPt.y) : mouse;
      const showX = !r || r.type !== 'sel';
      const len = SET.xhair >= 100 ? 1e5 : Math.max(Wd, Hd) * SET.xhair / 200;
      cC.save(); cC.strokeStyle = plotMode ? '#111' : '#f0f3f7'; cC.lineWidth = 1; cC.setLineDash([]);
      const px = Math.round(mouse.x) + .5, py = Math.round(mouse.y) + .5, pb = SET.pickbox;
      if(showX){ cC.beginPath(); cC.moveTo(px - len, py); cC.lineTo(px - pb - 1, py); cC.moveTo(px + pb + 1, py); cC.lineTo(px + len, py); cC.moveTo(px, py - len); cC.lineTo(px, py - pb - 1); cC.moveTo(px, py + pb + 1); cC.lineTo(px, py + len); cC.stroke(); }
      if(!r || r.type === 'sel') cC.strokeRect(px - pb, py - pb, pb * 2, pb * 2);
      cC.restore();
      void P;
    }
    updateDyn();
  }

  /* ---- Nhập động (Dynamic Input) cạnh con trỏ ---- */
  const dyn = document.createElement('div'); dyn.id = 'dvdDyn'; stage.appendChild(dyn);
  let typed = '';
  A.onTyped = v => { typed = v || ''; updateDyn(); };
  A.fmt = v => { if(!isFinite(v)) return ''; const a = Math.abs(v); return a >= 1000 ? v.toFixed(1) : a >= 10 ? v.toFixed(2) : v.toFixed(3); };
  function updateDyn(){
    const show = SET.dyn && deskUI() && mouseIn && mouse && hasDoc() && !lastTouch && (cur && cur.req || typed);
    if(!show){ dyn.style.display = 'none'; return; }
    const r = cur && cur.req; let h = '';
    if(r) h += '<div class="pr">' + escapeHtml(shortPrompt(r)) + '</div>';
    let v = '';
    if(typed) v = '<span class="in">' + escapeHtml(typed) + '</span>';
    else if(r && lastPt && (r.type === 'pt' || r.type === 'dist' || r.type === 'ang')){
      if(r.base){ const d = Math.hypot(lastPt.x - r.base.x, lastPt.y - r.base.y), a = ((Math.atan2(lastPt.y - r.base.y, lastPt.x - r.base.x) * R2D) % 360 + 360) % 360; v = '<span class="in">' + A.fmt(d) + '</span><span class="in">' + a.toFixed(0) + '°</span>'; }
      else v = '<span class="in">' + A.fmt(lastPt.x) + '</span><span class="in">' + A.fmt(lastPt.y) + '</span>';
    }
    if(v) h += '<div class="vals">' + v + '</div>';
    if(!h){ dyn.style.display = 'none'; return; }
    dyn.innerHTML = h; dyn.style.display = 'block';
    let x = mouse.x + 22, y = mouse.y + 20; const W0 = cv.clientWidth, H0 = cv.clientHeight; const bw = dyn.offsetWidth, bh = dyn.offsetHeight;
    if(x + bw > W0 - 6) x = mouse.x - bw - 16; if(y + bh > H0 - 6) y = mouse.y - bh - 14;
    dyn.style.left = x + 'px'; dyn.style.top = y + 'px';
  }
  function shortPrompt(r){ let s = r.prompt || ''; if(r.kw && r.kw.length) s += ' [' + r.kw.map(k => k.t).join('/') + ']'; return s.length > 70 ? s.slice(0, 68) + '…' : s; }

  /* =====================================================================
     10) BỘ CHẠY LỆNH + LỜI NHẮC
     ===================================================================== */
  class Cancel extends Error{ constructor(){ super('cancel'); this.cancel = true; } }
  A.Cancel = Cancel;
  let runId = 0, internalMode = false;
  A.busy = () => !!cur;
  A.cur = () => cur;
  function log(m){ try{ if(window.DVDCmd && DVDCmd.log) DVDCmd.log(m); }catch(_){} }
  A.log = log;
  function refresh(){ try{ if(window.DVDCmd && DVDCmd.refresh) DVDCmd.refresh(); }catch(_){} paintSoon(); }
  function setModeInt(m){ internalMode = true; try{ setMode(m); } finally { internalMode = false; } }
  A.run = async function(name, fn, opt){
    opt = opt || {};
    if(!hasDoc()){ say('Mở hoặc tạo bản vẽ trước.'); return; }
    if(cur) A.cancel(true);
    let pre = [];
    try{ pre = A.filterSel([...selEnts]); if(!pre.length && infoIdx >= 0 && entities[infoIdx]) pre = A.filterSel([entities[infoIdx]]); }catch(_){}
    const id = ++runId;
    cur = { id, name, pre, sel: new Set(), req: null, hl: [] };
    if(opt.keepMode !== true) setModeInt('acad');
    log('Lệnh: ' + name);
    hoverEnt = null; osOverride = null; acq.length = 0;
    refresh();
    try{ await fn(A, cur); }
    catch(err){ if(err && err.cancel) log('*Huỷ*'); else { console.error(err); log('Lỗi: ' + (err && err.message || err)); say('Lệnh ' + name + ' lỗi: ' + (err && err.message || err)); } }
    finally{
      if(cur && cur.id === id){
        cur = null; win = null; osOverride = null;
        if(mode === 'acad') setModeInt('pan');
        paintSelSoon(); refresh();
      }
    }
  };
  A.cancel = function(silent){
    if(!cur) return false;
    const c = cur; const r = c.req; cur = null; win = null; osOverride = null;
    if(r && r.rej) r.rej(new Cancel());
    if(mode === 'acad') setModeInt('pan');
    paintSelSoon(); refresh();
    if(!silent) {}
    return true;
  };
  function ask(req){
    if(!cur) return Promise.reject(new Cancel());
    const c = cur;
    return new Promise((res, rej) => {
      req.res = v => { if(c.req === req) c.req = null; res(v); };
      req.rej = rej; c.req = req;
      if(req.type === 'sel'){ c.sel = new Set(); }
      lastPt = mouse ? computePoint(mouse, req, lastTouch) : null;
      refresh(); paintSelSoon();
    });
  }
  // Lời nhắc chọn điểm. Trả {pt} | {kw} | {none} | {num}
  A.getPoint = (prompt, o) => ask(Object.assign({ type: 'pt', prompt }, o || {}));
  A.getDist = (prompt, o) => ask(Object.assign({ type: 'dist', prompt }, o || {}));
  A.getAngle = (prompt, o) => ask(Object.assign({ type: 'ang', prompt }, o || {}));
  A.getKw = (prompt, o) => ask(Object.assign({ type: 'kw', prompt }, o || {}));
  A.getStr = (prompt, o) => ask(Object.assign({ type: 'str', prompt }, o || {}));
  A.getSel = async function(prompt, o){
    o = o || {};
    if(o.pre !== false && cur && cur.pre && cur.pre.length && !o.single){
      let s = cur.pre; cur.pre = []; if(o.filter) s = s.filter(o.filter);
      if(s.length){ s = [...A.expandGroups(new Set(s))]; A.prevSel = s; if(cur) cur.sel = new Set(s); paintSelSoon(); log('Dùng ' + s.length + ' đối tượng đã chọn sẵn'); return { sel: s }; }
    }
    if(cur) cur.pre = [];
    const r = await ask(Object.assign({ type: 'sel', prompt: prompt || 'Chọn đối tượng' }, o));
    if(r.sel && !o.single){ A.prevSel = r.sel; }
    return r;
  };
  A.getEnt = (prompt, o) => A.getSel(prompt, Object.assign({ single: true, pre: false }, o || {}));
  A.promptHTML = function(){
    const r = cur && cur.req; if(!r) return cur ? escapeHtml(cur.name) + ':' : '';
    let h = escapeHtml(r.prompt || '');
    if(r.type === 'sel' && cur.sel.size) h += ' <b class="cnt">(' + cur.sel.size + ')</b>';
    if(r.kw && r.kw.length) h += ' [' + r.kw.map(k => '<span class="kw" data-k="' + escapeHtml(k.k) + '">' + escapeHtml(k.t) + '</span>').join('/') + ']';
    if(r.def !== undefined && r.def !== null && r.def !== '') h += ' &lt;' + escapeHtml(typeof r.def === 'number' ? A.fmt(r.def).replace(/\.?0+$/, '') : r.def) + '&gt;';
    return h + ':';
  };
  function matchKw(r, t){
    if(!r.kw || !r.kw.length) return null; const T = deacc(t);
    for(const k of r.kw){ if(T === deacc(k.k)) return k.k; }
    for(const k of r.kw){ const w = deacc(k.t); if(T.length >= 2 && w.startsWith(T)) return k.k; }
    return null;
  }
  const TRANSPARENT = new Set(['Z', 'ZOOM', 'P', 'PAN', 'RE', 'REGEN', 'REDRAW', 'ZE', 'ZW']);
  // nhập toạ độ: x,y | @dx,dy | @d<a | d<a | số (khoảng cách theo hướng con trỏ)
  function parseCoord(t, base){
    t = t.replace(/\s+/g, ''); let m;
    if((m = /^(#)?(-?[\d.]+)[,;](-?[\d.]+)$/.exec(t))){ const x = num(m[2]), y = num(m[3]); if(isFinite(x) && isFinite(y)) return { x, y }; }
    if((m = /^@(-?[\d.]+)[,;](-?[\d.]+)$/.exec(t))){ const dx = num(m[1]), dy = num(m[2]); const b = base || { x: 0, y: 0 }; if(isFinite(dx) && isFinite(dy)) return { x: b.x + dx, y: b.y + dy }; }
    if((m = /^(@)?(-?[\d.]+)<(-?[\d.]+)$/.exec(t))){ const d = num(m[2]), a = num(m[3]) * D2R; const b = (m[1] || base) ? (base || { x: 0, y: 0 }) : { x: 0, y: 0 }; if(isFinite(d) && isFinite(a)) return { x: b.x + d * Math.cos(a), y: b.y + d * Math.sin(a) }; }
    return null;
  }
  A.parseCoord = parseCoord;
  function dirFromCursor(base){
    if(lastPt && lastPt.track && lastPt.track.base === base) return lastPt.track.ang;
    const p = lastPt || (mouse ? toWorld(mouse.x, mouse.y) : null);
    if(!p) return 0; const dx = p.x - base.x, dy = p.y - base.y;
    if(SET.ortho) return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : Math.PI) : (dy >= 0 ? Math.PI / 2 : -Math.PI / 2);
    return Math.hypot(dx, dy) > 1e-12 ? Math.atan2(dy, dx) : 0;
  }
  A.input = function(text){
    const r = cur && cur.req; const t = String(text == null ? '' : text).trim();
    if(!cur) return false;
    if(!r){ return true; }
    const T = t.toUpperCase().replace(/^'/, '');
    if(TRANSPARENT.has(T.split(/\s+/)[0])){ try{ DVDCmd.runTransparent(T); }catch(_){} return true; }
    if(!t){
      if(r.type === 'sel'){ if(win){ win = null; } r.res({ sel: [...cur.sel] }); return true; }
      r.res({ none: true }); return true;
    }
    if(r.type === 'str'){ r.res({ str: t }); return true; }
    const kw = matchKw(r, t); if(kw){ r.res({ kw }); return true; }
    if(r.type === 'pt' || r.type === 'dist' || r.type === 'ang'){
      if(OS_KEY[T]){ osOverride = OS_KEY[T]; log('Bắt điểm 1 lần: ' + (OS_NAME[osOverride] || 'không')); refresh(); return true; }
    }
    if(r.type === 'sel'){
      if(T === 'ALL' || T === 'TẤT CẢ'){ for(const e of A.selectable()) cur.sel.add(e); A.expandGroups(cur.sel); log('Đã chọn ' + cur.sel.size); refresh(); paintSelSoon(); return true; }
      if(T === 'P'){ for(const e of A.prevSel) if(modelEntities.indexOf(e) >= 0) cur.sel.add(e); log('Chọn lại: ' + cur.sel.size); refresh(); paintSelSoon(); return true; }
      if(T === 'L'){ for(const e of A.lastAdded) if(modelEntities.indexOf(e) >= 0) cur.sel.add(e); refresh(); paintSelSoon(); return true; }
      if(T === 'R'){ cur.remove = true; log('Chế độ bỏ chọn — bấm đối tượng để bỏ (gõ A để thêm lại)'); return true; }
      if(T === 'A'){ cur.remove = false; return true; }
      log('Gõ ALL (tất cả), P (lần trước), L (vừa vẽ), R (bỏ), Enter (xong).'); return true;
    }
    const n = num(t), isNum = /^-?[\d.]+(e-?\d+)?$/i.test(t.replace(',', '.'));
    if(r.type === 'pt'){
      const p = parseCoord(t, r.base);
      if(p){ r.res({ pt: p, typed: true }); return true; }
      if(isNum && isFinite(n)){
        if(r.num){ r.res({ num: n }); return true; }
        if(r.base){ const a = dirFromCursor(r.base); r.res({ pt: { x: r.base.x + n * Math.cos(a), y: r.base.y + n * Math.sin(a) }, typed: true, dist: n }); return true; }
      }
      log('Điểm không hợp lệ: "' + t + '" — dùng x,y · @dx,dy · dài<góc' + (r.base ? ' · hoặc 1 số (dài theo hướng con trỏ)' : '')); return true;
    }
    if(r.type === 'dist' || r.type === 'ang' || r.type === 'num'){
      if(isNum && isFinite(n)){ r.res({ num: n }); return true; }
      if(r.type === 'dist' && r.base){ const p = parseCoord(t, r.base); if(p){ r.res({ num: Math.hypot(p.x - r.base.x, p.y - r.base.y), pt: p }); return true; } }
      log('Cần nhập số.'); return true;
    }
    if(r.type === 'kw'){ log('Tuỳ chọn không hợp lệ: ' + t); return true; }
    return true;
  };
  A.getNum = (prompt, o) => ask(Object.assign({ type: 'num', prompt }, o || {}));

  /* =====================================================================
     11) CHỌN ĐỐI TƯỢNG (bấm / khung)
     ===================================================================== */
  A.selectable = function(){ const out = []; for(const e of entities){ if(!e || isHiddenE(e) || isLockedE(e)) continue; out.push(e); } return out; };
  function entDist(e, w){
    if(e.type === 'POINT') return Math.hypot(w.x - e.x, w.y - e.y);
    if(e.type === 'TEXT'){ if(!e.text) return Infinity; const L = textLocal(e, w), ex = textExtent(e); if(L.lx >= ex.xmin && L.lx <= ex.xmax && L.ly >= ex.ymin && L.ly <= ex.ymax) return 0; const dx = Math.max(ex.xmin - L.lx, 0, L.lx - ex.xmax), dy = Math.max(ex.ymin - L.ly, 0, L.ly - ex.ymax); return Math.hypot(dx, dy); }
    if(e.type === 'HATCH') return Infinity;
    const c = curveOf(e); if(!c) return Infinity; const q = nearOnCurve(c, w); return q ? q.d : Infinity;
  }
  A.entDist = entDist;
  function pickAt(sp, opt){
    opt = opt || {};
    const w = toWorld(sp.x, sp.y), tol = ((opt.touch ? 16 : SET.pickbox + 3)) / view.scale;
    const cands = queryBox(w.x - tol, w.y - tol, w.x + tol, w.y + tol, 8000);
    let best = null, bd = tol;
    for(const e of cands){ if(!opt.allowLocked && isLockedE(e)) continue; if(opt.filter && !opt.filter(e)) continue; const d = entDist(e, w); if(d < bd || (d === bd && best && e.userAdded)){ bd = d; best = e; } }
    if(best) return best;
    // trong vùng hatch (ưu tiên hatch nhỏ nhất)
    let hb = null, ha = Infinity;
    for(const e of queryBox(w.x, w.y, w.x, w.y, 4000)){ if(e.type !== 'HATCH' || (!opt.allowLocked && isLockedE(e)) || (opt.filter && !opt.filter(e))) continue; if(G.ptInLoops(w, e.loops || [])){ const b = entBBox(e); const ar = b ? (b.x1 - b.x0) * (b.y1 - b.y0) : Infinity; if(ar < ha){ ha = ar; hb = e; } } }
    return hb;
  }
  A.pickAt = pickAt;
  function winSelect(x0, y0, x1, y1, filter){
    const a = toWorld(x0, y0), b = toWorld(x1, y1);
    const box = { minx: Math.min(a.x, b.x), maxx: Math.max(a.x, b.x), miny: Math.min(a.y, b.y), maxy: Math.max(a.y, b.y) };
    const crossing = x1 < x0; const out = [];
    for(const e of queryBox(box.minx, box.miny, box.maxx, box.maxy)){
      if(isLockedE(e) || (filter && !filter(e))) continue;
      if(e.type === 'HATCH'){ const bb = entBBox(e); if(!bb) continue; const inside = bb.x0 >= box.minx && bb.x1 <= box.maxx && bb.y0 >= box.miny && bb.y1 <= box.maxy; if(inside || (crossing && (G.ptInLoops({ x: (box.minx + box.maxx) / 2, y: (box.miny + box.maxy) / 2 }, e.loops || []) || (e.loops || []).some(lp => lp.some(p => p.x >= box.minx && p.x <= box.maxx && p.y >= box.miny && p.y <= box.maxy))))) out.push(e); continue; }
      if(e.type === 'XLINE'){ if(crossing) out.push(e); continue; }
      if(entHitBox(e, box, crossing)) out.push(e);
    }
    return { list: out, box, crossing };
  }
  A.winSelect = winSelect;

  /* =====================================================================
     11b) NẮM KÉO (GRIPS) kiểu AutoCAD: bấm ô xanh -> đỏ -> kéo giãn / di chuyển / xoay / tỉ lệ / đối xứng
     ===================================================================== */
  function gripsOf(e){
    switch(e.type){
      case 'LINE': return [{ x: e.x1, y: e.y1, r: 'p0' }, { x: e.x2, y: e.y2, r: 'p1' }, { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2, r: 'mid' }];
      case 'CIRCLE': return [{ x: e.cx, y: e.cy, r: 'c' }].concat([0, 1, 2, 3].map(k => ({ x: e.cx + e.r * Math.cos(k * Math.PI / 2), y: e.cy + e.r * Math.sin(k * Math.PI / 2), r: 'q' })));
      case 'ARC': { const c = curveOf(e); const a = c.at(0), b = c.at(c.u1), m = c.at(c.u1 / 2); return [{ x: a.x, y: a.y, r: 'a1' }, { x: b.x, y: b.y, r: 'a2' }, { x: m.x, y: m.y, r: 'am' }, { x: e.cx, y: e.cy, r: 'c' }]; }
      case 'ELLIPSE': { const c = curveOf(e); const out = [{ x: e.cx, y: e.cy, r: 'c' }]; [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].forEach((t, i) => { const q = c.at(t); out.push({ x: q.x, y: q.y, r: i % 2 ? 'eb' : 'ea' }); }); return out; }
      case 'POLYLINE': { const v = e.vertices || []; if(v.length > 400) return [{ x: v[0].x, y: v[0].y, r: 'v0' }, { x: v[v.length - 1].x, y: v[v.length - 1].y, r: 'v' + (v.length - 1) }]; return v.map((q, i) => ({ x: q.x, y: q.y, r: 'v' + i })); }
      case 'SOLID': return (e.pts || []).map((q, i) => ({ x: q.x, y: q.y, r: 'v' + i }));
      case 'TEXT': case 'POINT': case 'XLINE': return [{ x: e.x, y: e.y, r: 'mv' }];
      case 'HATCH': { const b = entBBox(e); return b ? [{ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, r: 'mv' }] : []; }
    }
    return [];
  }
  A.gripsOf = gripsOf;
  function applyGrip(w, role, from, to){
    const dx = to.x - from.x, dy = to.y - from.y;
    switch(role){
      case 'p0': w.x1 = to.x; w.y1 = to.y; return;
      case 'p1': w.x2 = to.x; w.y2 = to.y; return;
      case 'mid': case 'c': case 'mv': translateEnt(w, dx, dy); return;
      case 'q': w.r = Math.max(1e-9, Math.hypot(to.x - w.cx, to.y - w.cy)); return;
      case 'a1': case 'a2': case 'am': {
        const c = curveOf(w); let s0 = c.at(0), m0 = c.at(c.u1 / 2), e0 = c.at(c.u1);
        if(role === 'a1') s0 = to; else if(role === 'a2') e0 = to; else m0 = to;
        const C = G.circum ? G.circum(s0, m0, e0) : null; if(!C) return;
        let a1 = Math.atan2(s0.y - C.y, s0.x - C.x), a2 = Math.atan2(e0.y - C.y, e0.x - C.x); const am = Math.atan2(m0.y - C.y, m0.x - C.x);
        if(!(norm(am - a1) <= norm(a2 - a1))){ const t = a1; a1 = a2; a2 = t; }
        w.cx = C.x; w.cy = C.y; w.r = C.r; w.a1 = a1 * R2D; w.a2 = a2 * R2D; return; }
      case 'ea': { const a = Math.hypot(w.mx, w.my), b = a * (w.ratio || 1); const vx = to.x - w.cx, vy = to.y - w.cy, L = Math.hypot(vx, vy); if(L < 1e-12) return; if(b <= L){ w.mx = vx; w.my = vy; w.ratio = b / L; } else { w.mx = -vy / L * b; w.my = vx / L * b; w.ratio = L / b; } return; }
      case 'eb': { const a = Math.hypot(w.mx, w.my); const L = Math.hypot(to.x - w.cx, to.y - w.cy); if(L < 1e-12) return; if(L <= a) w.ratio = L / a; else { const ux = w.mx / a, uy = w.my / a; w.mx = -uy * L; w.my = ux * L; w.ratio = a / L; } return; }
    }
    if(role[0] === 'v'){ const i = +role.slice(1); const vs = w.type === 'POLYLINE' ? w.vertices : w.pts; if(vs && vs[i]){ vs[i] = { x: to.x, y: to.y }; if(w.type === 'POLYLINE' && w.closed && i === 0 && vs.length > 1){ const l = vs[vs.length - 1]; if(Math.hypot(l.x - from.x, l.y - from.y) < 1e-9) vs[vs.length - 1] = { x: to.x, y: to.y }; } } delete w.wq; }
  }
  const GRIP_MAX = 400;
  function gripSel(){ if(!idleDesk() || !selEnts.size || selEnts.size > GRIP_MAX) return null; return [...selEnts]; }
  function gripHit(p){
    const sel = gripSel(); if(!sel) return null; const tol = 7;
    for(const e of sel){ if(isHiddenE(e)) continue; for(const g of gripsOf(e)){ const P = toScreen(g.x, g.y); if(Math.abs(P.x - p.x) <= tol && Math.abs(P.y - p.y) <= tol) return { x: g.x, y: g.y }; } }
    return null;
  }
  A.gripHit = gripHit;
  function drawGrips(c2){
    const sel = gripSel(); if(!sel) return;
    c2.save(); c2.lineWidth = 1; const seen = new Set();
    for(const e of sel){ if(isHiddenE(e)) continue; for(const g of gripsOf(e)){ const P = toScreen(g.x, g.y); const k = Math.round(P.x) + ',' + Math.round(P.y); if(seen.has(k)) continue; seen.add(k); if(P.x < -10 || P.y < -10 || P.x > cv.clientWidth + 10 || P.y > cv.clientHeight + 10) continue;
      c2.fillStyle = '#2f7bff'; c2.strokeStyle = '#0b1830'; c2.fillRect(Math.round(P.x) - 4, Math.round(P.y) - 4, 8, 8); c2.strokeRect(Math.round(P.x) - 4.5, Math.round(P.y) - 4.5, 9, 9); } }
    c2.restore();
  }
  const GMODES = [{ k: 'ST', n: 'KÉO GIÃN', p: 'Chỉ định điểm kéo giãn' }, { k: 'MO', n: 'DI CHUYỂN', p: 'Chỉ định điểm đích' }, { k: 'RO', n: 'XOAY', p: 'Chỉ định góc xoay' }, { k: 'SC', n: 'TỈ LỆ', p: 'Chỉ định hệ số tỉ lệ' }, { k: 'MI', n: 'ĐỐI XỨNG', p: 'Chỉ định điểm thứ hai của trục' }];
  function startGrip(hot){
    const sel = [...selEnts]; if(!sel.length) return;
    let result = sel;
    A.run('GRIP', async () => {
      let mi = 0, copy = false, base = { x: hot.x, y: hot.y }; const near = (g) => Math.hypot(g.x - hot.x, g.y - hot.y) <= 1e-7 * Math.max(1, Math.abs(hot.x), Math.abs(hot.y));
      cur.sel = new Set(sel); cur.hot = hot; paintSelSoon();
      const xf = (w, m, p, num) => {
        if(m === 'ST'){ for(const g of gripsOf(w)) if(near(g)){ applyGrip(w, g.r, hot, p); break; } }
        else if(m === 'MO') translateEnt(w, p.x - base.x, p.y - base.y);
        else if(m === 'RO') rotateEnt(w, num != null ? num : Math.atan2(p.y - base.y, p.x - base.x) * R2D, base);
        else if(m === 'SC'){ const f = num != null ? num : Math.hypot(p.x - base.x, p.y - base.y); if(f > 1e-12) scaleEnt(w, f, base); }
        else if(m === 'MI'){ if(Math.hypot(p.x - base.x, p.y - base.y) > 1e-12) mirrorAcross(w, base, p); }
      };
      for(;;){
        const M = GMODES[mi];
        const r = await A.getPoint('** ' + M.n + (copy ? ' (nhiều bản)' : '') + ' ** ' + M.p, { base, num: M.k === 'RO' || M.k === 'SC', kw: [{ k: 'ST', t: 'Kéo giãn' }, { k: 'MO', t: 'Di chuyển' }, { k: 'RO', t: 'Xoay' }, { k: 'SC', t: 'Tỉ lệ' }, { k: 'MI', t: 'Đối xứng' }, { k: 'C', t: 'Sao chép' }, { k: 'B', t: 'Điểm gốc' }, { k: 'X', t: 'Thoát' }],
          preview: (g, p) => g.xform(sel, w => xf(w, M.k, p)) });
        if(r.none){ mi = (mi + 1) % GMODES.length; continue; }
        if(r.kw === 'X') return;
        if(r.kw === 'C'){ copy = !copy; continue; }
        if(r.kw === 'B'){ const b = await A.getPoint('Chỉ định điểm gốc'); if(b.pt) base = b.pt; continue; }
        if(r.kw){ const j = GMODES.findIndex(m => m.k === r.kw); if(j >= 0) mi = j; continue; }
        const p = r.pt || base, num = r.pt ? null : r.num;
        if(copy || (M.k === 'ST' && false)){ const add = sel.map(e => { const w = G.clone(e); delete w.grp; xf(w, M.k, p, num); return w; }); A.commit({ add }); continue; }
        const rep = sel.map(e => { const w = G.clone(e); xf(w, M.k, p, num); return [e, w]; }).filter(([e, w]) => JSON.stringify(e.type === w.type ? w : 0) !== JSON.stringify(Object.assign({}, e, { userAdded: undefined })));
        if(rep.length) A.commit({ rep }); result = rep.length ? sel.map(e => { const f = rep.find(x => x[0] === e); return f ? f[1] : e; }) : sel;
        return;
      }
    }).then(() => { try{ selEnts.clear(); for(const e of result) if(modelEntities.indexOf(e) >= 0) selEnts.add(e); refreshPanSel(); }catch(_){} });
  }
  let gripDrag = null;

  /* =====================================================================
     12) CHUỘT / CHẠM
     ===================================================================== */
  let down = null;          // {x,y,btn,t,id,touch,pan,hit}
  let panDrag = null;
  let lastMidClick = 0;
  function locE(e){ const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function idleDesk(){ return mode === 'pan' && !cur && deskUI(); }
  function engineMouse(){ return !!cur && cur.req; }
  // vào trước mọi xử lý của app (pha capture trên .stage)
  stage.addEventListener('pointerdown', ev => {
    if(ev.target !== cv) return;
    const p = locE(ev); const touch = ev.pointerType !== 'mouse';
    lastTouch = touch;
    if(!hasDoc()) return;
    // nút giữa: kéo màn hình (kích đúp = phóng vừa bản vẽ)
    if(ev.button === 1){ ev.preventDefault(); ev.stopPropagation(); const now = Date.now(); if(now - lastMidClick < 350){ try{ fitView(); }catch(_){} lastMidClick = 0; return; } lastMidClick = now; panDrag = { x: p.x, y: p.y, id: ev.pointerId }; try{ cv.setPointerCapture(ev.pointerId); }catch(_){} return; }
    if(ev.button === 2){ ev.preventDefault(); ev.stopPropagation(); onRightClick(ev, p); return; }
    if(cur){
      if(touch){ down = { x: p.x, y: p.y, t: Date.now(), id: ev.pointerId, touch: true, moved: false, multi: pointers.size >= 1 }; return; }   // chạm: để app theo dõi ngón (chụm zoom)
      ev.stopPropagation(); ev.preventDefault();
      mouse = p; mouseIn = true;
      down = { x: p.x, y: p.y, t: Date.now(), id: ev.pointerId, touch: false, moved: false, shift: ev.shiftKey };
      try{ cv.setPointerCapture(ev.pointerId); }catch(_){}
      return;
    }
    if(idleDesk() && !touch){
      const gh = gripHit(p);
      if(gh){ ev.stopPropagation(); ev.preventDefault(); mouse = p; mouseIn = true; gripDrag = { id: ev.pointerId, x: p.x, y: p.y, moved: false }; try{ cv.setPointerCapture(ev.pointerId); }catch(_){} startGrip(gh); return; }
      // trúng nắm kéo / tay cầm / đối tượng đã chọn -> để app xử lý (kéo sửa, kéo di chuyển)
      try{ if(gripEdit && gripHitTest(p) >= 0) return; }catch(_){}
      const hit = pickAt(p);
      if(hit && selEnts.has(hit) && !ev.shiftKey){ reAddAfterUp = hit; return; }
      ev.stopPropagation(); ev.preventDefault();
      mouse = p; mouseIn = true;
      if(win && win.owner === 'idle' && !win.press){ finishIdleWin(p, ev.shiftKey); return; }
      down = { x: p.x, y: p.y, t: Date.now(), id: ev.pointerId, touch: false, moved: false, shift: ev.shiftKey, hit };
      try{ cv.setPointerCapture(ev.pointerId); }catch(_){}
    }
  }, true);
  let reAddAfterUp = null;
  window.addEventListener('pointermove', ev => {
    const p = locE(ev);
    if(panDrag && ev.pointerId === panDrag.id){ const dx = p.x - panDrag.x, dy = p.y - panDrag.y; panBy(dx, dy); panDrag.x = p.x; panDrag.y = p.y; mouse = p; return; }
    if(gripDrag && ev.pointerId === gripDrag.id && Math.hypot(p.x - gripDrag.x, p.y - gripDrag.y) > 4) gripDrag.moved = true;
    if(down && ev.pointerId === down.id){
      if(Math.hypot(p.x - down.x, p.y - down.y) > (down.touch ? 9 : 4)) down.moved = true;
      if(down.touch){
        if(cur && down.moved && pointers.size <= 1 && !pinchActive){ const lp = down.lp || { x: down.x, y: down.y }; panBy(p.x - lp.x, p.y - lp.y); down.lp = p; }
        return;
      }
      mouse = p;
      if(down.moved && !win){ const selReq = !cur || (cur.req && cur.req.type === 'sel'); if(selReq) win = { x0: down.x, y0: down.y, x1: p.x, y1: p.y, owner: cur ? 'cmd' : 'idle', press: true }; }
      if(win){ win.x1 = p.x; win.y1 = p.y; }
    }
  });
  window.addEventListener('pointerup', ev => {
    if(panDrag && ev.pointerId === panDrag.id){ panDrag = null; return; }
    if(gripDrag && ev.pointerId === gripDrag.id){ const gd = gripDrag; gripDrag = null; if(gd.moved && cur && cur.req){ const p = locE(ev); mouse = p; clickAt(p, { touch: false, shift: false }); } return; }
    if(reAddAfterUp){ const e = reAddAfterUp; reAddAfterUp = null; setTimeout(() => { try{ if(!moved && modelEntities.indexOf(e) >= 0 && !selEnts.has(e)){ selEnts.add(e); refreshPanSel(); } }catch(_){} }, 0); }
    if(!down || ev.pointerId !== down.id) return;
    const d = down; down = null; const p = locE(ev);
    if(d.touch){
      if(!d.moved && !d.multi && Date.now() - d.t < 700 && pointers.size === 0 && cur && cur.req){ mouse = p; lastPt = computePoint(p, cur.req, true); clickAt(p, { touch: true, shift: false }); }
      return;
    }
    if(win && win.press){
      const w0 = win; win = null;
      if(Math.hypot(w0.x1 - w0.x0, w0.y1 - w0.y0) > 4){
        if(w0.owner === 'idle') applyIdleWin(w0, d.shift); else applyCmdWin(w0, d.shift);
        paintSoon(); return;
      }
    }
    if(d.moved && !cur) { paintSoon(); return; }
    clickAt(p, { touch: false, shift: d.shift, hit: d.hit });
  });
  function panBy(dx, dy){ if(view.rot){ const c = Math.cos(view.rot), s = Math.sin(view.rot); const ux = dx * c + dy * s, uy = -dx * s + dy * c; dx = ux; dy = uy; } view.offsetX += dx; view.offsetY += dy; draw(); }
  // nhấp chuột / chạm
  function clickAt(p, o){
    if(cur && cur.req){
      const r = cur.req;
      if(r.type === 'sel'){ selClick(p, o); return; }
      if(r.type === 'pt' || r.type === 'dist' || r.type === 'ang'){
        const q = computePoint(p, r, o.touch); osOverride = null;
        const pt = { x: q.x, y: q.y };
        if(r.type === 'pt') r.res({ pt, snap: q.snap });
        else if(r.type === 'dist'){ if(r.base) r.res({ num: Math.hypot(pt.x - r.base.x, pt.y - r.base.y), pt }); else r.res({ pt }); }
        else { if(r.base) r.res({ num: Math.atan2(pt.y - r.base.y, pt.x - r.base.x) * R2D, pt }); else r.res({ pt }); }
        return;
      }
      return;
    }
    if(idleDesk()){
      const hit = o.hit !== undefined ? o.hit : pickAt(p);
      if(hit){
        const set = A.expandGroups(new Set([hit]));
        if(o.shift){ for(const e of set) selEnts.delete(e); }
        else { for(const e of set) selEnts.add(e); }
        selected = null; refreshPanSel(); paintSoon(); return;
      }
      // chỗ trống: bắt đầu khung chọn (bấm–bấm)
      win = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, owner: 'idle', press: false };
      paintSoon();
    }
  }
  function selClick(p, o){
    const r = cur.req;
    if(win && win.owner === 'cmd' && !win.press){ const w0 = win; win = null; w0.x1 = p.x; w0.y1 = p.y; applyCmdWin(w0, o.shift); return; }
    const hit = pickAt(p, { touch: o.touch, filter: r.filter, allowLocked: r.allowLocked });
    if(hit){
      if(r.single){ r.res({ sel: [hit], ent: hit, pt: toWorld(p.x, p.y), shift: !!o.shift }); return; }
      const set = A.expandGroups(new Set([hit]));
      const rem = o.shift || cur.remove;
      for(const e of set){ if(rem) cur.sel.delete(e); else cur.sel.add(e); }
      refresh(); paintSelSoon(); return;
    }
    if(r.single){ if(r.allowNone){ r.res({ none: true, pt: toWorld(p.x, p.y) }); return; } log('Không trúng đối tượng nào.'); return; }
    win = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, owner: 'cmd', press: false };
    paintSoon();
  }
  function applyCmdWin(w0, shift){
    const r = cur && cur.req; if(!r || r.type !== 'sel') return;
    const res = winSelect(w0.x0, w0.y0, w0.x1, w0.y1, r.filter);
    if(r.wantWindow){ r.res({ window: res, sel: res.list }); return; }
    const set = A.expandGroups(new Set(res.list)); const rem = shift || cur.remove; let n = 0;
    for(const e of set){ if(rem){ if(cur.sel.delete(e)) n++; } else if(!cur.sel.has(e)){ cur.sel.add(e); n++; } }
    log((res.crossing ? 'Khung cắt' : 'Khung trùm') + ': ' + (rem ? 'bỏ ' : 'thêm ') + n + ', tổng ' + cur.sel.size);
    refresh(); paintSelSoon();
  }
  function finishIdleWin(p, shift){ const w0 = win; win = null; w0.x1 = p.x; w0.y1 = p.y; if(Math.hypot(w0.x1 - w0.x0, w0.y1 - w0.y0) < 3){ paintSoon(); return; } applyIdleWin(w0, shift); }
  function applyIdleWin(w0, shift){
    const res = winSelect(w0.x0, w0.y0, w0.x1, w0.y1);
    const set = A.expandGroups(new Set(res.list));
    for(const e of set){ if(shift) selEnts.delete(e); else selEnts.add(e); }
    selected = null; refreshPanSel(); paintSoon();
  }
  A.cancelWin = () => { if(win){ win = null; paintSoon(); return true; } return false; };
  // rê chuột
  let _hovRAF = 0;
  cv.addEventListener('pointermove', ev => {
    if(ev.pointerType !== 'mouse') return;
    lastTouch = false;
    mouse = locE(ev); mouseIn = true;
    A.onMouse && A.onMouse(mouse);
    if(win && !win.press){ win.x1 = mouse.x; win.y1 = mouse.y; }
    if(!_hovRAF) _hovRAF = requestAnimationFrame(() => {
      _hovRAF = 0; if(!mouse) return;
      const r = cur && cur.req;
      if(r && (r.type === 'pt' || r.type === 'dist' || r.type === 'ang')){ lastPt = computePoint(mouse, r, false); hoverEnt = null; }
      else {
        lastPt = r ? { x: toWorld(mouse.x, mouse.y).x, y: toWorld(mouse.x, mouse.y).y } : null;
        hoverEnt = (!win && (idleDesk() || (r && r.type === 'sel')) && !(ev.buttons & 1)) ? pickAt(mouse, { filter: r && r.filter, allowLocked: r && r.allowLocked }) : null;
      }
      paintC();
    });
  });
  cv.addEventListener('pointerleave', () => { mouseIn = false; hoverEnt = null; paintSoon(); });
  cv.addEventListener('pointerenter', () => { mouseIn = true; });
  cv.addEventListener('dblclick', ev => {
    if(!idleDesk() || cur) return;
    const p = locE(ev); const e = pickAt(p); if(!e) return;
    ev.preventDefault();
    if(e.type === 'TEXT' && !e.grp){ try{ editTextInline(e); }catch(_){} return; }
    selEnts.add(e); A.expandGroups(selEnts); refreshPanSel();
    if(A.showProps) A.showProps(true);
  });
  function onRightClick(ev, p){
    if(cur){ if(win){ win = null; paintSoon(); return; } A.input(''); refresh(); return; }
    if(win){ win = null; paintSoon(); return; }
    if(A.contextMenu) A.contextMenu(ev, p);
  }
  A.rightClick = onRightClick;

  /* =====================================================================
     13) MÓC VÀO APP
     ===================================================================== */
  // vẽ lại lớp phủ mỗi khi app vẽ lại (pan/zoom/sửa)
  const _draw = window.draw;
  window.draw = function(){ const r = _draw.apply(this, arguments); paintSelSoon(); paintSoon(); return r; };
  // lưới kiểu AutoCAD (đường chính + phụ) + bật/tắt GRID
  const _drawGrid = window.drawGrid;
  window.drawGrid = function(){
    if(!deskUI()) return _drawGrid.apply(this, arguments);
    if(!SET.grid) return;
    const minor = SET.snap && SET.snapSp > 0 && SET.snapSp * view.scale >= 6 ? SET.snapSp : (function(){ const raw = 14 / view.scale, pow = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 5, 10].map(m => m * pow).find(c => c >= raw) || 10 * pow; })();
    const major = minor * 5; const vb = viewWorldAABB();
    const draw1 = (sp, col) => { const x0 = Math.floor(vb.minX / sp) * sp, x1 = Math.ceil(vb.maxX / sp) * sp, y0 = Math.floor(vb.minY / sp) * sp, y1 = Math.ceil(vb.maxY / sp) * sp; if((x1 - x0) / sp > 600 || (y1 - y0) / sp > 600) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); for(let x = x0; x <= x1 + 1e-9; x += sp){ const a = toScreen(x, y0), b = toScreen(x, y1); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } for(let y = y0; y <= y1 + 1e-9; y += sp){ const a = toScreen(x0, y), b = toScreen(x1, y); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } ctx.stroke(); ctx.restore(); };
    draw1(minor, plotMode ? 'rgba(0,0,0,.05)' : 'rgba(150,170,200,.07)');
    draw1(major, plotMode ? 'rgba(0,0,0,.10)' : 'rgba(150,170,200,.15)');
    // trục X/Y gốc toạ độ
    const o = toScreen(0, 0); ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,90,90,.35)'; ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W(), o.y); ctx.stroke(); ctx.strokeStyle = 'rgba(80,220,120,.35)'; ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H()); ctx.stroke(); ctx.restore();
  };
  const _dsb = window.drawScaleBar;
  window.drawScaleBar = function(){ if(deskUI() && !_exporting) return; return _dsb.apply(this, arguments); };
  // chọn trong app (bấm/khung ở chế độ Di chuyển): bỏ đối tượng lớp khoá, mở rộng theo nhóm/khối
  const _refreshPanSel = window.refreshPanSel;
  window.refreshPanSel = function(){
    try{ for(const e of [...selEnts]) if(isLockedE(e)) selEnts.delete(e); A.expandGroups(selEnts); }catch(_){}
    const r = _refreshPanSel.apply(this, arguments);
    if(A.onSelChange) A.onSelChange();
    A.paint(); return r;
  };
  const _spg = window.startPanGrip; window.startPanGrip = function(){ if(deskUI()) return false; return _spg.apply(this, arguments); };
  const _gzh = window.gizmoHandles; window.gizmoHandles = function(){ if(deskUI()) return null; return _gzh.apply(this, arguments); };
  const _clearSel = window.clearSel;
  window.clearSel = function(){ const r = _clearSel.apply(this, arguments); if(A.onSelChange) A.onSelChange(); A.paint(); return r; };
  // bấm trúng: tạm ẩn lớp khoá; thêm bấm trong vùng hatch
  const _pickEntity = window.pickEntity;
  window.pickEntity = function(screen){
    const added = []; for(const n of LS.locked) if(!hiddenUserLayers.has(n)){ hiddenUserLayers.add(n); added.push(n); }
    try{
      let i = _pickEntity.apply(this, arguments);
      if(i < 0){ const h = pickAt(screen, { touch: !isMouse }); if(h && h.type === 'HATCH') i = entities.indexOf(h); }
      return i;
    } finally { for(const n of added) hiddenUserLayers.delete(n); }
  };
  const _eim = window.entitiesInMarquee;
  window.entitiesInMarquee = function(){
    if(!marquee) return [];
    const r = winSelect(marquee.x0, marquee.y0, marquee.x1, marquee.y1);
    return r.list.filter(e => !isLockedE(e));
  };
  void _eim;
  // biến đổi hình học cho ELLIPSE / HATCH / XLINE
  const rotV = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
  const _tr = window.translateEnt;
  window.translateEnt = function(e, dx, dy){
    if(e.type === 'HATCH'){ for(const lp of (e.loops || [])) for(const p of lp){ p.x += dx; p.y += dy; } return; }
    if(e.type === 'XLINE'){ e.x += dx; e.y += dy; return; }
    return _tr.apply(this, arguments);
  };
  const _rot = window.rotateEnt;
  window.rotateEnt = function(e, deg, c){
    const a = deg * D2R;
    if(e.type === 'ELLIPSE'){ const q = _rotPt({ x: e.cx, y: e.cy }, c, a); e.cx = q.x; e.cy = q.y; const v = rotV(e.mx, e.my, a); e.mx = v.x; e.my = v.y; return; }
    if(e.type === 'HATCH'){ for(const lp of (e.loops || [])) for(let i = 0; i < lp.length; i++) lp[i] = _rotPt(lp[i], c, a); e.pang = (e.pang || 0) + deg; return; }
    if(e.type === 'XLINE'){ const q = _rotPt({ x: e.x, y: e.y }, c, a); e.x = q.x; e.y = q.y; const v = rotV(e.dx, e.dy, a); e.dx = v.x; e.dy = v.y; return; }
    return _rot.apply(this, arguments);
  };
  const _scl = window.scaleEnt;
  window.scaleEnt = function(e, f, c){
    if(e.type === 'ELLIPSE'){ const q = _sclPt({ x: e.cx, y: e.cy }, c, f); e.cx = q.x; e.cy = q.y; e.mx *= f; e.my *= f; return; }
    if(e.type === 'HATCH'){ for(const lp of (e.loops || [])) for(let i = 0; i < lp.length; i++) lp[i] = _sclPt(lp[i], c, f); if(e.psc) e.psc *= f; return; }
    if(e.type === 'XLINE'){ const q = _sclPt({ x: e.x, y: e.y }, c, f); e.x = q.x; e.y = q.y; return; }
    return _scl.apply(this, arguments);
  };
  const _mir = window.mirrorAcross;
  window.mirrorAcross = function(e, Ap, Bp){
    let dx = Bp.x - Ap.x, dy = Bp.y - Ap.y; const L = Math.hypot(dx, dy); if(L < 1e-12) return false; dx /= L; dy /= L;
    const R = p => { const wx = p.x - Ap.x, wy = p.y - Ap.y, d = wx * dx + wy * dy; return { x: Ap.x + 2 * d * dx - wx, y: Ap.y + 2 * d * dy - wy }; };
    const RV = v => { const d = v.x * dx + v.y * dy; return { x: 2 * d * dx - v.x, y: 2 * d * dy - v.y }; };
    const th = Math.atan2(dy, dx) * R2D;
    if(e.type === 'ELLIPSE'){ const q = R({ x: e.cx, y: e.cy }); e.cx = q.x; e.cy = q.y; const v = RV({ x: e.mx, y: e.my }); e.mx = v.x; e.my = v.y; const p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; e.p1 = -p2; e.p2 = -p1; return true; }
    if(e.type === 'HATCH'){ for(const lp of (e.loops || [])) for(let i = 0; i < lp.length; i++) lp[i] = R(lp[i]); e.pang = 2 * th - (e.pang || 0); return true; }
    if(e.type === 'XLINE'){ const q = R({ x: e.x, y: e.y }); e.x = q.x; e.y = q.y; const v = RV({ x: e.dx, y: e.dy }); e.dx = v.x; e.dy = v.y; return true; }
    return _mir.apply(this, arguments);
  };
  const _ec = window.entCenter;
  window.entCenter = function(e){
    if(e.type === 'ELLIPSE') return { x: e.cx, y: e.cy };
    if(e.type === 'HATCH' || e.type === 'XLINE'){ const b = entBBox(e); return b ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : { x: e.x || 0, y: e.y || 0 }; }
    return _ec.apply(this, arguments);
  };
  // giữ chế độ khi app tự đổi (vd. bấm nút dưới) -> huỷ lệnh đang chạy
  const _setMode = window.setMode;
  window.setMode = function(m){
    if(cur && !internalMode && m !== 'acad') A.cancel(true);
    const r = _setMode.apply(this, arguments);
    try{ document.body.dataset.mode = m; }catch(_){}
    if(m !== 'pan'){ win = null; }
    paintSoon(); return r;
  };
  // sau khi mở bản vẽ: nạp trạng thái lớp, huỷ lệnh
  function afterLoad(){ try{ if(cur) A.cancel(true); A.lsLoad(); acq.length = 0; win = null; hoverEnt = null; A.paint(); if(A.onLoad) A.onLoad(); if(window.DVDCmd && DVDCmd.refresh) DVDCmd.refresh(); if(window.DVDCmd && DVDCmd.refreshPalette) DVDCmd.refreshPalette(); }catch(err){ console.warn(err); } }
  const _loadDXF = window.loadDXF, _loadDWG = window.loadDWG;
  window.loadDXF = function(text, name){ window.__dvdNewDoc = typeof text === 'string' && /999\r?\nDVDCAD-NEW/.test(text.slice(0, 400)); const r = _loadDXF.apply(this, arguments); afterLoad(); return r; };
  window.loadDWG = async function(){ window.__dvdNewDoc = false; const r = await _loadDWG.apply(this, arguments); afterLoad(); return r; };
  const _switchLayout = window.switchLayout;
  window.switchLayout = function(){ const r = _switchLayout.apply(this, arguments); try{ applyHidden(); A.paint(); if(A.onLoad) A.onLoad(); }catch(_){} return r; };
  // in ra màn hình kích thước mới
  const _ro = new ResizeObserver(() => { sizeOv(); A.paint(); }); _ro.observe(stage); _ro.observe(cv);
  window.addEventListener('blur', () => { mouseIn = false; paintSoon(); });

  /* ---- Bật/tắt nhanh ---- */
  A.toggle = function(k, v){
    SET[k] = v === undefined ? !SET[k] : !!v;
    if(k === 'ortho' && SET.ortho) SET.polar = false;
    if(k === 'polar' && SET.polar) SET.ortho = false;
    A.saveSet();
    const names = { osnap: 'OSNAP (bắt điểm)', ortho: 'ORTHO (vuông góc)', polar: 'POLAR (góc cực)', otrack: 'OTRACK (truy bắt)', grid: 'GRID (lưới)', snap: 'SNAP (bước lưới)', dyn: 'DYN (nhập động)' };
    log('<' + (names[k] || k) + ' ' + (SET[k] ? 'bật' : 'tắt') + '>');
    if(k === 'grid') try{ draw(); }catch(_){}
    return SET[k];
  };
  // phím chức năng kiểu AutoCAD
  window.addEventListener('keydown', e => {
    const k = e.key;
    if(/^F(2|3|7|8|9|10|11|12)$/.test(k) && !e.ctrlKey && !e.altKey){
      e.preventDefault();
      if(k === 'F2'){ if(window.DVDCmd && DVDCmd.toggleHistory) DVDCmd.toggleHistory(); return; }
      if(k === 'F3') A.toggle('osnap'); else if(k === 'F7') A.toggle('grid'); else if(k === 'F8') A.toggle('ortho'); else if(k === 'F9') A.toggle('snap'); else if(k === 'F10') A.toggle('polar'); else if(k === 'F11') A.toggle('otrack'); else if(k === 'F12') A.toggle('dyn');
      return;
    }
    if(k === 'Shift' && cur && cur.req && (cur.req.type === 'pt') && !SET.ortho){ /* giữ Shift = ORTHO tạm thời */ tempOrtho = true; SET.ortho = true; paintSoon(); }
  }, true);
  let tempOrtho = false;
  window.addEventListener('keyup', e => { if(e.key === 'Shift' && tempOrtho){ tempOrtho = false; SET.ortho = false; paintSoon(); } }, true);

  A.paintNow = () => { paintS(); paintC(); };
  sizeOv();
})();
