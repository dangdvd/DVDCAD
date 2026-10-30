/* DVDCAD v5w — bổ sung như AutoCAD 2027
   · WMFIN: nhập Windows Metafile (.wmf, placeable hoặc thường) thành khối WMF0, WMF1… — nét, đa giác, chữ nhật, elip, cung, chữ, vùng tô (đặc / gạch)
   · WMFOPTS: tuỳ chọn nhập WMF — Khung dây (không tô), Nét rộng (giữ bề rộng bút)
   · Phông SHX cho chữ (TEXT / MTEXT): nạp phông .shx (shapes 1.0 / unifont / bigfont), kiểu chữ dùng phông .shx thì chữ vẽ bằng nét
     của phông như AutoCAD (cỡ chữ = chiều cao chữ hoa); ký tự phông không có → bigfont → phông TrueType thay thế
   · ALIGNSPACE (Express Tools): căn tỉ lệ + vị trí khung nhìn layout theo cặp điểm mô hình ↔ giấy
   · SYSWINDOWS: xếp các bản vẽ đang mở — Xếp chồng / Lát ngang / Lát dọc / Thu nhỏ (bấm ô để làm bản vẽ hiện hành)
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x23 || !A.dialog || !window.DVDCmd) return; A._x23 = true;
  const K = A.acw;
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); });
  const hex2 = v => (v & 255).toString(16).padStart(2, '0');

  /* ==================================================================
     WMF → đối tượng DVDCAD (toạ độ mm, gốc ở góc trên trái của ảnh, trục y hướng lên)
     ================================================================== */
  // bảng mã theo lfCharSet của font
  const CHARSET = { 0: 'windows-1252', 1: 'windows-1252', 2: 'windows-1252', 77: 'macintosh', 128: 'shift_jis', 129: 'euc-kr', 134: 'gbk', 136: 'big5', 161: 'windows-1253', 162: 'windows-1254', 163: 'windows-1258', 177: 'windows-1255', 178: 'windows-1256', 186: 'windows-1257', 204: 'windows-1251', 222: 'windows-874', 238: 'windows-1250' };
  const HATCHPAT = { 0: ['LINE', 0], 1: ['LINE', 90], 2: ['ANSI31', 90], 3: ['ANSI31', 0], 4: ['NET', 0], 5: ['ANSI37', 0] };   // HS_HORIZONTAL, VERTICAL, FDIAGONAL, BDIAGONAL, CROSS, DIAGCROSS
  function parseWMF(buf, opt){
    opt = opt || {}; const dv = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer, buf.byteOffset || 0, buf.byteLength);
    let off = 0, bbox = null, inch = 1440;
    if(dv.byteLength >= 22 && dv.getUint32(0, true) === 0x9AC6CDD7){ bbox = { l: dv.getInt16(6, true), t: dv.getInt16(8, true), r: dv.getInt16(10, true), b: dv.getInt16(12, true) }; inch = dv.getUint16(14, true) || 1440; off = 22; }
    if(dv.byteLength < off + 18) throw new Error('Không phải tệp WMF.');
    const typ = dv.getUint16(off, true), hsz = dv.getUint16(off + 2, true), ver = dv.getUint16(off + 4, true);
    if(!((typ === 1 || typ === 2) && hsz === 9 && (ver === 0x0300 || ver === 0x0100))) throw new Error('Không phải tệp WMF (Windows Metafile).');
    const nObj = dv.getUint16(off + 10, true); off += 18;
    // trạng thái DC
    let S = { wo: { x: 0, y: 0 }, we: null, pen: null, brush: null, font: null, ta: 0, tc: [0, 0, 0], pos: { x: 0, y: 0 }, fill: 1 };
    const stack = [], objs = new Array(Math.max(nObj, 1)).fill(null);
    const addObj = o => { let i = objs.indexOf(null); if(i < 0){ i = objs.length; objs.push(null); } objs[i] = o; };
    // vùng ảnh (mm): theo placeable; không có thì 1 đơn vị = 1/1440 inch
    const pts = [];   // để tính khung khi không có placeable / SETWINDOWEXT
    const out = [];
    const rgb = (w0, w1) => [w0 & 255, (w0 >> 8) & 255, w1 & 255];
    const hexOf = c => '#' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]);
    // ghi hình theo toạ độ lôgic; đổi ra mm khi kết thúc
    const ops = [];
    const L = (x, y) => ({ x, y, wo: S.wo, we: S.we });
    const penOn = () => S.pen && S.pen.style !== 5;
    const brushOn = () => S.brush && S.brush.style !== 1;
    function shape(loops, closed){ const P = penOn() ? S.pen : null, B = closed && brushOn() ? S.brush : null; if(!P && !B) return; ops.push({ k: 'poly', loops, closed, pen: P, brush: B, fillMode: S.fill }); for(const l of loops) for(const p of l) pts.push(p); }
    function ell(l, t, r, b, kind, p1, p2){ ops.push({ k: kind, box: [L(l, t), L(r, b)], p1, p2, pen: penOn() ? S.pen : null, brush: kind === 'arc' || !brushOn() ? null : S.brush }); pts.push(L(l, t), L(r, b)); }
    const rp = (o, n) => { const a = []; for(let i = 0; i < n; i++) a.push(L(dv.getInt16(o + i * 4, true), dv.getInt16(o + i * 4 + 2, true))); return a; };
    let guard = 0;
    while(off + 6 <= dv.byteLength && guard++ < 2e6){
      const size = dv.getUint32(off, true), fn = dv.getUint16(off + 4, true), p = off + 6; if(size < 3 || off + size * 2 > dv.byteLength + 2) break;
      const w = i => dv.getInt16(p + i * 2, true), uw = i => dv.getUint16(p + i * 2, true);
      switch(fn){
        case 0x0000: off = dv.byteLength; continue;
        case 0x020B: S.wo = { x: w(1), y: w(0) }; break;                                  // SETWINDOWORG
        case 0x020C: S.we = { x: w(1), y: w(0) }; break;                                  // SETWINDOWEXT
        case 0x020F: S.wo = { x: S.wo.x + w(1), y: S.wo.y + w(0) }; break;                // OFFSETWINDOWORG
        case 0x0410: if(S.we){ const xn = w(3), xd = w(2) || 1, yn = w(1), yd = w(0) || 1; S.we = { x: S.we.x * xn / xd, y: S.we.y * yn / yd }; } break;   // SCALEWINDOWEXT
        case 0x001E: stack.push(Object.assign({}, S)); break;                             // SAVEDC
        case 0x0127: { let n = w(0); if(n >= 0) n = stack.length - n; else n = stack.length + n; if(n >= 0 && n < stack.length){ S = stack[n]; stack.length = n; } break; }   // RESTOREDC
        case 0x0106: S.fill = uw(0); break;                                               // SETPOLYFILLMODE (1 = xen kẽ, 2 = cuộn)
        case 0x012E: S.ta = uw(0); break;                                                 // SETTEXTALIGN
        case 0x0209: S.tc = rgb(uw(0), uw(1)); break;                                     // SETTEXTCOLOR
        case 0x02FA: addObj({ t: 'pen', style: uw(0) & 15, w: Math.abs(w(1)), c: rgb(uw(3), uw(4)) }); break;   // CREATEPENINDIRECT
        case 0x02FC: addObj({ t: 'brush', style: uw(0), c: rgb(uw(1), uw(2)), hatch: uw(3) }); break;           // CREATEBRUSHINDIRECT
        case 0x02FB: { const h = w(0), esc = w(2), wt = w(4), b = p + 10, it = dv.getUint8(b), cs = dv.getUint8(b + 3); let face = ''; for(let i = b + 8; i < Math.min(p + (size - 3) * 2, b + 40); i++){ const c = dv.getUint8(i); if(!c) break; face += String.fromCharCode(c); }
          addObj({ t: 'font', h, esc, bold: wt >= 600, it: !!it, cs, face }); break; }                        // CREATEFONTINDIRECT
        case 0x00F7: case 0x01F9: case 0x0142: case 0x06FF: addObj({ t: 'other' }); break;                     // bảng màu, chổi ảnh, vùng: vẫn chiếm chỗ trong bảng đối tượng
        case 0x012D: { const o = objs[uw(0)]; if(o){ if(o.t === 'pen') S.pen = o; else if(o.t === 'brush') S.brush = o; else if(o.t === 'font') S.font = o; } break; }   // SELECTOBJECT
        case 0x01F0: { const i = uw(0); const o = objs[i]; if(o){ if(S.pen === o) S.pen = null; if(S.brush === o) S.brush = null; if(S.font === o) S.font = null; } if(i < objs.length) objs[i] = null; break; }   // DELETEOBJECT
        case 0x0214: S.pos = L(w(1), w(0)); break;                                        // MOVETO
        case 0x0213: { const q = L(w(1), w(0)); shape([[S.pos, q]], false); S.pos = q; break; }   // LINETO
        case 0x0325: shape([rp(p + 2, uw(0))], false); break;                             // POLYLINE
        case 0x0324: shape([rp(p + 2, uw(0))], true); break;                              // POLYGON
        case 0x0538: { const n = uw(0), cnt = []; for(let i = 0; i < n; i++) cnt.push(uw(1 + i)); let o = p + 2 + n * 2; const loops = []; for(const c of cnt){ loops.push(rp(o, c)); o += c * 4; } shape(loops, true); break; }   // POLYPOLYGON
        case 0x041B: { const b = w(0), r = w(1), t = w(2), l = w(3); shape([[L(l, t), L(r, t), L(r, b), L(l, b)]], true); break; }   // RECTANGLE
        case 0x061C: { const b = w(2), r = w(3), t = w(4), l = w(5); shape([[L(l, t), L(r, t), L(r, b), L(l, b)]], true); break; }   // ROUNDRECT (góc vuông)
        case 0x0418: ell(w(3), w(2), w(1), w(0), 'ell'); break;                            // ELLIPSE
        case 0x0817: case 0x081A: case 0x0830: ell(w(7), w(6), w(5), w(4), fn === 0x0817 ? 'arc' : fn === 0x081A ? 'pie' : 'chord', L(w(3), w(2)), L(w(1), w(0))); break;   // ARC / PIE / CHORD
        case 0x0521: { const n = uw(0); const s = dec(new Uint8Array(dv.buffer, dv.byteOffset + p + 2, n), S.font); const o2 = 1 + ((n + 1) >> 1); ops.push({ k: 'text', at: L(w(o2 + 1), w(o2)), s, font: S.font, ta: S.ta, c: S.tc }); pts.push(L(w(o2 + 1), w(o2))); break; }   // TEXTOUT
        case 0x0A32: { const y = w(0), x = w(1), n = uw(2), fl = uw(3); let o = p + 8; if(fl & 6) o += 8; const bytes = new Uint8Array(dv.buffer, dv.byteOffset + o, Math.min(n, dv.byteLength - o)); ops.push({ k: 'text', at: L(x, y), s: dec(bytes, S.font), font: S.font, ta: S.ta, c: S.tc }); pts.push(L(x, y)); break; }   // EXTTEXTOUT
        default: break;
      }
      off += size * 2;
    }
    // khung lôgic → mm
    let F = null;
    if(bbox){ F = { l: bbox.l, t: bbox.t, w: bbox.r - bbox.l, h: bbox.b - bbox.t, mm: 25.4 / inch }; }
    else { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const q of pts){ const u = norm(q, null); x0 = Math.min(x0, u.x); y0 = Math.min(y0, u.y); x1 = Math.max(x1, u.x); y1 = Math.max(y1, u.y); } if(!isFinite(x0)) throw new Error('Tệp WMF không có hình vẽ.'); F = { l: x0, t: y0, w: (x1 - x0) || 1, h: (y1 - y0) || 1, mm: 25.4 / 1440, raw: true }; }
    function norm(q, F){ const we = q.we; if(!we || !F || F.raw) return { x: q.x, y: q.y }; return { x: F.l + (q.x - q.wo.x) / we.x * F.w, y: F.t + (q.y - q.wo.y) / we.y * F.h }; }
    const sxw = q => (q && q.we && !F.raw ? Math.abs(F.w / q.we.x) : 1) * F.mm;   // mm / đơn vị lôgic theo x
    const syw = q => (q && q.we && !F.raw ? Math.abs(F.h / q.we.y) : 1) * F.mm;
    const M = q => { const u = norm(q, F); return { x: (u.x - F.l) * F.mm * Math.sign(F.w || 1), y: -(u.y - F.t) * F.mm * Math.sign(F.h || 1) }; };
    const Wmm = Math.abs(F.w) * F.mm, Hmm = Math.abs(F.h) * F.mm;
    const mk = (e, c) => { e.col = hexOf(c); return e; };
    for(const op of ops){
      if(op.k === 'poly'){
        const loops = op.loops.map(l => l.map(M)).filter(l => l.length >= 2);
        if(op.brush && !opt.wire){ const B = op.brush, Lp = loops.filter(l => l.length >= 3); if(Lp.length){
          if(B.style === 0) out.push(mk({ type: 'HATCH', loops: Lp, solid: true, pat: 'SOLID', psc: 1, pang: 0 }, B.c));
          else if(B.style === 2){ const hp = HATCHPAT[B.hatch] || HATCHPAT[3]; out.push(mk({ type: 'HATCH', loops: Lp, pat: hp[0], psc: Math.max(Wmm, Hmm) / 120, pang: hp[1] }, B.c)); } } }
        if(op.pen){ const lw = op.pen.w * sxw(op.loops[0] && op.loops[0][0]); for(const l of loops){ if(op.closed && l.length >= 3){ const e = mk({ type: 'POLYLINE', closed: true, vertices: l }, op.pen.c); if(opt.wide && lw > 0.05) e.lw = Math.min(2.11, lw); out.push(e); }
          else if(l.length === 2){ const e = mk({ type: 'LINE', x1: l[0].x, y1: l[0].y, x2: l[1].x, y2: l[1].y }, op.pen.c); if(opt.wide && lw > 0.05) e.lw = Math.min(2.11, lw); out.push(e); }
          else { const e = mk({ type: 'POLYLINE', closed: false, vertices: l }, op.pen.c); if(opt.wide && lw > 0.05) e.lw = Math.min(2.11, lw); out.push(e); } } }
      } else if(op.k === 'text'){
        const f = op.font || { h: 12, esc: 0 }; const hl = Math.abs(f.h || 12) * syw(op.at); const h = (f.h < 0 ? hl : hl * 0.8) * 0.72;   // cỡ chữ ≈ chiều cao chữ hoa
        const at = M(op.at), rot = (f.esc || 0) / 10; const ha = (op.ta & 6) === 6 ? 'center' : (op.ta & 2) ? 'right' : 'left'; const va = (op.ta & 24) === 24 ? 'alphabetic' : (op.ta & 8) ? 'bottom' : 'top';
        const s = String(op.s || '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+$/, ''); if(!s) continue;
        const e = mk({ type: 'TEXT', x: at.x, y: at.y, h: Math.max(h, 1e-6), rot, text: s, ha, va }, op.c); out.push(e);
      } else {
        const a = M(op.box[0]), b = M(op.box[1]); const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2; if(!(rx > 0 && ry > 0)) continue;
        const ang = q => { const m = M(q); return Math.atan2((m.y - cy) / ry, (m.x - cx) / rx); };
        let t1 = 0, t2 = Math.PI * 2; const full = op.k === 'ell'; if(!full){ t1 = ang(op.p1); t2 = ang(op.p2); if(t2 <= t1 + 1e-9) t2 += Math.PI * 2; }
        const pt = t => ({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
        // vùng tô: đa giác xấp xỉ
        if(op.brush && !opt.wire && op.k !== 'arc'){ const n = 72, lp = []; for(let i = 0; i <= n; i++) lp.push(pt(t1 + (t2 - t1) * i / n)); if(op.k === 'pie') lp.push({ x: cx, y: cy }); const B = op.brush;
          if(B.style === 0) out.push(mk({ type: 'HATCH', loops: [lp], solid: true, pat: 'SOLID', psc: 1, pang: 0 }, B.c)); else if(B.style === 2){ const hp = HATCHPAT[B.hatch] || HATCHPAT[3]; out.push(mk({ type: 'HATCH', loops: [lp], pat: hp[0], psc: Math.max(Wmm, Hmm) / 120, pang: hp[1] }, B.c)); } }
        if(op.pen){ const c = op.pen.c; const lw = op.pen.w * sxw(op.box[0]); const W = e => { if(opt.wide && lw > 0.05) e.lw = Math.min(2.11, lw); out.push(mk(e, c)); };
          const circ = Math.abs(rx - ry) <= 1e-6 * Math.max(rx, ry);
          if(full) W(circ ? { type: 'CIRCLE', cx, cy, r: rx } : { type: 'ELLIPSE', cx, cy, mx: rx >= ry ? rx : 0, my: rx >= ry ? 0 : ry, ratio: Math.min(rx, ry) / Math.max(rx, ry), p1: 0, p2: Math.PI * 2 });
          else { if(circ) W({ type: 'ARC', cx, cy, r: rx, a1: t1 * 180 / Math.PI, a2: t2 * 180 / Math.PI });
            else { const maj = rx >= ry; const off = maj ? 0 : -Math.PI / 2; W({ type: 'ELLIPSE', cx, cy, mx: maj ? rx : 0, my: maj ? 0 : ry, ratio: Math.min(rx, ry) / Math.max(rx, ry), p1: t1 + off, p2: t2 + off }); }
            const s = pt(t1), e2 = pt(t2); if(op.k === 'pie'){ W({ type: 'LINE', x1: cx, y1: cy, x2: s.x, y2: s.y }); W({ type: 'LINE', x1: cx, y1: cy, x2: e2.x, y2: e2.y }); } else if(op.k === 'chord') W({ type: 'LINE', x1: s.x, y1: s.y, x2: e2.x, y2: e2.y }); } }
      }
    }
    return { ents: out, w: Wmm, h: Hmm, placeable: !!bbox };
  }
  function dec(bytes, font){ const cs = font ? font.cs : 0; let enc = CHARSET[cs] || 'windows-1252'; if(font && font.cs === 2) return Array.from(bytes, b => String.fromCharCode(b)).join('');   // SYMBOL_CHARSET
    try{ return new TextDecoder(enc).decode(bytes).normalize('NFC'); }catch(_){ try{ return new TextDecoder('windows-1252').decode(bytes); }catch(__){ return Array.from(bytes, b => String.fromCharCode(b)).join(''); } } }
  A.parseWMF = parseWMF;

  /* ==================================================================
     PHÔNG SHX CHO CHỮ — shapes 1.0 (txt, simplex, romans…), unifont (Unicode), bigfont (chữ Á Đông, phông phụ)
     ================================================================== */
  const FONTS = new Map();   // TÊN.SHX (hoa) → phông
  const hdrOf = u8 => { let s = ''; for(let i = 0; i < Math.min(u8.length, 40); i++){ const c = u8[i]; if(c === 13 || c === 26) break; s += String.fromCharCode(c); } return s.trim(); };
  const nameSplit = b => { const k = b.indexOf(0); return k < 0 ? b : b.subarray(k + 1); };
  function parseFont(u8, file){
    const hdr = hdrOf(u8), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let o = u8.indexOf(26) + 1; if(o <= 0) throw new Error('Không phải tệp phông SHX.');
    const F = { file: String(file).toUpperCase(), glyph: new Map(), above: 8, below: 2, modes: 0 };
    if(/shapes 1\.[01]/i.test(hdr)){ F.type = 'shapes'; o += 4; const n = dv.getUint16(o, true); o += 2; const idx = []; for(let i = 0; i < n; i++){ idx.push([dv.getUint16(o, true), dv.getUint16(o + 2, true)]); o += 4; }
      for(const [c, len] of idx){ const d = u8.subarray(o, o + len); o += len; if(c === 0){ const b = nameSplit(d); F.above = b[0] || 8; F.below = b[1] || 0; F.modes = b[2] || 0; F.info = 1; continue; } F.glyph.set(c, nameSplit(d)); }
      if(!F.info) throw new Error('Tệp này là tệp hình (không có thông tin phông) — dùng LOAD / SHAPE.'); }
    else if(/unifont 1\.0/i.test(hdr)){ F.type = 'unifont'; const n = dv.getInt32(o, true); o += 4; const il = dv.getUint16(o, true); o += 2; const info = nameSplit(u8.subarray(o, o + il)); o += il; F.above = info[0] || 8; F.below = info[1] || 0; F.modes = info[2] || 0;
      for(let i = 0; i < n - 1 && o + 4 <= u8.length; i++){ const c = dv.getUint16(o, true), len = dv.getUint16(o + 2, true); o += 4; const d = u8.subarray(o, o + len); o += len; if(len) F.glyph.set(c, nameSplit(d)); } }
    else if(/bigfont 1\.0/i.test(hdr)){ F.type = 'bigfont'; o += 2; const n = dv.getUint16(o, true), nr = dv.getUint16(o + 2, true); o += 4; F.ranges = []; for(let i = 0; i < nr; i++){ F.ranges.push([dv.getUint16(o, true), dv.getUint16(o + 2, true)]); o += 4; }
      for(let i = 0; i < n && o + 8 <= u8.length; i++){ const c = dv.getUint16(o, true), len = dv.getUint16(o + 2, true), off = dv.getUint32(o + 4, true); o += 8; if(!len || off + len > u8.length) continue; let d = u8.subarray(off, off + len);
        if(c === 0){ const b = nameSplit(d); let k = 0; while(k < b.length && !b[k]) k++; const r = b.length - k; if(r >= 3){ F.above = b[k] || 8; F.below = r === 4 ? (b[k + 1] || 0) : 0; } continue; }
        if(c > 255 && d.length >= 2 && d[0] === (c >> 8) && d[1] === (c & 255)) d = d.subarray(d[2] === 0 ? 3 : 2);   // bỏ tiền tố mã ký tự 2 byte
        else d = nameSplit(d); F.glyph.set(c, d); }
      F.enc = /big5|chineset|tw/i.test(file) ? 'big5' : /jis|extfont|bigfont|japan|@extfont/i.test(file) ? 'shift_jis' : /whgt|whtg|kor|hangul/i.test(file) ? 'euc-kr' : 'gbk'; }
    else throw new Error('Không phải tệp phông SHX.');
    if(!(F.above > 0)) F.above = 8; return F;
  }
  // dịch mã hình → nét (đơn vị phông) + điểm bút cuối (bước tiến)
  const DIRV = [[1, 0], [1, .5], [1, 1], [.5, 1], [0, 1], [-.5, 1], [-1, 1], [-1, .5], [-1, 0], [-1, -.5], [-1, -1], [-.5, -1], [0, -1], [.5, -1], [1, -1], [1, -.5]];
  const sbt = v => (v > 127 ? v - 256 : v);
  function runGlyph(F, b, depth, penInit){
    const out = []; let x = 0, y = 0, sc = 1, pen = penInit !== false, line = null; const stack = []; let i = 0, skip = false;
    const flush = () => { if(line && line.length >= 2) out.push(line); line = null; };
    const mv = (nx, ny) => { if(pen){ if(!line) line = [[x, y]]; line.push([nx, ny]); } x = nx; y = ny; };
    const arc = (cx, cy, r, a0, a1) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 12))); for(let k = 1; k <= n; k++){ const a = a0 + (a1 - a0) * k / n; mv(cx + r * Math.cos(a), cy + r * Math.sin(a)); } };
    const bul = (dx, dy, bg) => { const ex = x + dx, ey = y + dy; if(!bg){ mv(ex, ey); return; } const h = bg / 127, d = Math.hypot(dx, dy) || 1e-12, th = 4 * Math.atan(h), r = d / (2 * Math.sin(Math.abs(th) / 2)), mx = (x + ex) / 2, my = (y + ey) / 2, s2 = h > 0 ? 1 : -1, of = r * Math.cos(Math.abs(th) / 2);
      const cx = mx - s2 * (dy / d) * of, cy = my + s2 * (dx / d) * of, a0 = Math.atan2(y - cy, x - cx); arc(cx, cy, r, a0, a0 + th); x = ex; y = ey; };
    while(i < b.length){ const c = b[i++], doIt = !skip; skip = false;
      if(c === 0) break;
      if(c > 14){ const L = (c >> 4) * sc, d = DIRV[c & 15]; if(doIt) mv(x + d[0] * L, y + d[1] * L); continue; }
      switch(c){
        case 1: if(doIt) pen = true; break;
        case 2: if(doIt){ flush(); pen = false; } break;
        case 3: { const v = b[i++] || 1; if(doIt) sc /= v; break; }
        case 4: { const v = b[i++] || 1; if(doIt) sc *= v; break; }
        case 5: if(doIt) stack.push([x, y]); break;
        case 6: if(doIt){ const q = stack.pop(); if(q){ flush(); x = q[0]; y = q[1]; } } break;
        case 7: { let num, ext = null;
          if(F.type === 'shapes') num = b[i++];
          else if(F.type === 'unifont') { num = (b[i] << 8) | b[i + 1]; i += 2; }
          else if(b[i] === 0){ i++; num = (b[i] << 8) | b[i + 1]; i += 2; ext = { ox: b[i++], oy: b[i++], w: b[i++], h: b[i++] }; }   // bigfont mở rộng
          else { num = (b[i] << 8) | b[i + 1]; i += 2; }
          if(doIt && depth < 6){ const sub = F.glyph.get(num); if(sub){ flush(); const R = runGlyph(F, sub, depth + 1, F.type !== 'bigfont');
              const k = ext && ext.h ? ext.h / (F.above || 1) : 1, ox = ext ? ext.ox : 0, oy = ext ? ext.oy : 0;
              for(const L of R.lines) out.push(L.map(p => [x + (ox + p[0] * k) * sc, y + (oy + p[1] * k) * sc])); if(!ext){ x += R.end[0] * sc; y += R.end[1] * sc; } } } break; }
        case 8: { const dx = sbt(b[i++]), dy = sbt(b[i++]); if(doIt) mv(x + dx * sc, y + dy * sc); break; }
        case 9: for(;;){ const dx = sbt(b[i++] || 0), dy = sbt(b[i++] || 0); if(!dx && !dy) break; if(doIt) mv(x + dx * sc, y + dy * sc); } break;
        case 10: { const r = b[i++] * sc, q = sbt(b[i++]); if(!doIt) break; const cw = q < 0, aq = Math.abs(q), so = (aq >> 4) & 7, n = (aq & 7) || 8, a0 = so * Math.PI / 4, a1 = a0 + (cw ? -1 : 1) * n * Math.PI / 4; arc(x - r * Math.cos(a0), y - r * Math.sin(a0), r, a0, a1); break; }
        case 11: { const s0 = b[i++], e0 = b[i++], rh = b[i++], rl = b[i++], q = sbt(b[i++]); if(!doIt) break; const r = (rh * 256 + rl) * sc, cw = q < 0, aq = Math.abs(q), so = (aq >> 4) & 7, n = (aq & 7) || 8, sg = cw ? -1 : 1;
          const a0 = (so * 45 + sg * s0 * 45 / 256) * Math.PI / 180, a1 = ((so + sg * n) * 45 + (e0 ? -sg * (45 - e0 * 45 / 256) : 0)) * Math.PI / 180; arc(x - r * Math.cos(a0), y - r * Math.sin(a0), r, a0, a1); break; }
        case 12: { const dx = sbt(b[i++]), dy = sbt(b[i++]), bg = sbt(b[i++]); if(doIt) bul(dx * sc, dy * sc, bg); break; }
        case 13: for(;;){ const dx = sbt(b[i++] || 0), dy = sbt(b[i++] || 0); if(!dx && !dy) break; const bg = sbt(b[i++] || 0); if(doIt) bul(dx * sc, dy * sc, bg); } break;
        case 14: skip = true; break;   // chỉ dùng cho chữ dọc
      }
    }
    flush(); return { lines: out, end: [x, y] };
  }
  // bảng ngược Unicode → mã 1 byte (windows-1252) / 2 byte (bigfont)
  let REV1 = null; const rev1 = () => { if(REV1) return REV1; REV1 = new Map(); try{ const d = new TextDecoder('windows-1252'); for(let c = 128; c < 256; c++) REV1.set(d.decode(Uint8Array.of(c)), c); }catch(_){} return REV1; };
  const REV2 = new Map(); function rev2(F){ let m = REV2.get(F.enc); if(m) return m; m = new Map(); try{ const d = new TextDecoder(F.enc); const L = F.ranges && F.ranges.length ? F.ranges : [[0x81, 0xFE]];
      const u = new Uint8Array(2); for(const [a, z] of L) for(let hi = Math.max(0x81, a & 255); hi <= Math.min(0xFE, z & 255); hi++) for(let lo = 0x40; lo <= 0xFE; lo++){ u[0] = hi; u[1] = lo; const ch = d.decode(u); if([...ch].length === 1 && ch !== '\ufffd' && !m.has(ch)) m.set(ch, (hi << 8) | lo); } }catch(_){} REV2.set(F.enc, m); return m; }
  const SPECIAL = { '°': [127, 176], '±': [128, 177], 'Ø': [129, 216], '⌀': [129, 216, 0x2205] };
  function codesFor(F, ch){ const u = ch.codePointAt(0);
    if(F.type === 'unifont'){ const L = [u]; if(ch === '°') L.push(127); if(ch === '±') L.push(128); if(ch === 'Ø' || ch === '⌀') L.push(0x2205, 129); return L; }
    if(F.type === 'bigfont'){ if(u < 128) return [u]; const c = rev2(F).get(ch); return c ? [c] : []; }
    if(SPECIAL[ch]) return SPECIAL[ch]; if(u < 128) return [u]; const c = rev1().get(ch); return c != null ? [c] : []; }
  // một ký tự → { lines (đơn vị chiều cao chữ = 1), adv } hoặc null
  function glyphOf(main, big, ch){
    if(main.lff) return lffGlyph(main, ch);   // phông nét đơn thay thế (FONTALT)
    const key = ch; let G = main.cache || (main.cache = new Map()); if(G.has(key + '|' + (big ? big.file : ''))) return G.get(key + '|' + (big ? big.file : ''));
    let r = null;
    for(const c of codesFor(main, ch)){ const b = main.glyph.get(c); if(b){ const R = runGlyph(main, b, 0, true), k = 1 / main.above; r = { lines: R.lines.map(L => L.map(p => [p[0] * k, p[1] * k])), adv: R.end[0] * k }; break; } }
    if(!r && big){ for(const c of codesFor(big, ch)){ const b = big.glyph.get(c); if(b){ const R = runGlyph(big, b, 0, false), k = 1 / (big.above || 1); r = { lines: R.lines.map(L => L.map(p => [p[0] * k, p[1] * k])), adv: R.end[0] * k }; break; } } }
    if(!r && ch === ' ') r = { lines: [], adv: 2 / 3 };
    G.set(key + '|' + (big ? big.file : ''), r); return r;
  }
  const fontKey = f => String(f || '').replace(/^.*[\\/]/, '').toUpperCase().replace(/(\.SHX)?$/, '.SHX');
  /* ---------- phông nét đơn LibreCAD (.lff, GPL v2+) thay phông .shx chưa nạp — như FONTALT của AutoCAD ----------
     chữ hoa cao 9 đơn vị; nét: "x,y;x,y,A<bulge>" (cung từ đỉnh trước tới đỉnh này), "C<mã>" = ghép glyph khác; dấu tiếng Việt ghép từ chữ gốc + dấu */
  const LFF = new Map(), LFFLOAD = new Map();
  const LFF_OF = { TXT: 'standard', MONOTXT: 'standard', SIMPLEX: 'simplex', ROMANS: 'romans', ROMAND: 'romand', ROMANC: 'romand', ROMANT: 'romand', COMPLEX: 'romand', ITALIC: 'italicc', ITALICC: 'italicc', ITALICT: 'italicc', SCRIPTS: 'italicc', SCRIPTC: 'italicc' };
  const lffName = key => { const b = key.replace(/\.SHX$/, ''); if(LFF_OF[b]) return LFF_OF[b]; if(/^ISO/.test(b)) return 'iso'; return null; };
  const fontAlt = () => { try{ const v = localStorage.getItem('dvd:fontalt'); return v == null ? 'simplex.shx' : v; }catch(_){ return 'simplex.shx'; } };
  function parseLFF(text, name){
    const G = new Map(); let ls = 3, ws = 6.75, cur = null;
    for(const raw of String(text).split(/\r?\n/)){ const line = raw.trim();
      if(line[0] === '#'){ const m = /^#\s*(LetterSpacing|WordSpacing):\s*([\d.]+)/i.exec(line); if(m){ if(/letter/i.test(m[1])) ls = +m[2]; else ws = +m[2]; } continue; }
      const h = /^\[([0-9a-fA-F]+)\]/.exec(line); if(h){ cur = { lines: [], refs: [] }; G.set(parseInt(h[1], 16), cur); continue; }
      if(!cur || !line) continue;
      if(/^C[0-9a-fA-F]+$/.test(line)){ cur.refs.push(parseInt(line.slice(1), 16)); continue; }
      const P = []; for(const v of line.split(';')){ const q = v.split(','); const x = +q[0], y = +q[1]; if(!isFinite(x) || !isFinite(y)) continue; const bg = q[2] && /^A/i.test(q[2]) ? +q[2].slice(1) : 0;
        if(bg && P.length){ const a = P[P.length - 1], th = 4 * Math.atan(bg), dx = x - a[0], dy = y - a[1], c = Math.hypot(dx, dy); if(c > 1e-9){ const r = c / 2 / Math.sin(th / 2), mx = (a[0] + x) / 2, my = (a[1] + y) / 2, d = r * Math.cos(th / 2), nx = -dy / c, ny = dx / c;
            const cx = mx + nx * d, cy = my + ny * d, a0 = Math.atan2(a[1] - cy, a[0] - cx), n = Math.max(2, Math.ceil(Math.abs(th) / (Math.PI / 12))), R = Math.abs(r);
            for(let k = 1; k < n; k++){ const t = a0 + th * k / n; P.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]); } } }
        P.push([x, y]); }
      if(P.length > 1) cur.lines.push(P); }
    const res = (g, d) => { if(!g || g.done || d > 6) return g; for(const r of g.refs){ const o = res(G.get(r), d + 1); if(o) for(const L of o.lines) g.lines.push(L.map(p => p.slice())); } g.done = true; return g; };
    for(const g of G.values()) res(g, 0);
    return { file: name.toUpperCase() + '.LFF', type: 'lff', lff: true, G, ls, ws, above: 9, below: 3, cache: null, glyph: G };
  }
  function lffLoad(name){ if(LFF.has(name) || LFFLOAD.has(name)) return; const p = fetch('./vendor/lff/' + name + '.lff').then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))).then(t => { LFF.set(name, parseLFF(t, name)); redraw(); }).catch(err => { console.warn('lff', name, err); }); LFFLOAD.set(name, p); }
  A.lffReady = name => { lffLoad(name); return LFFLOAD.get(name); };
  // phông thay cho tệp .shx chưa nạp: phông nét đơn tương ứng (txt → standard, simplex, romans, romand, iso…), không có thì theo FONTALT
  function altFont(ff){ const key = fontKey(ff); const alt = fontAlt(); if(!alt || alt === '.') return null; let n = lffName(key);
    if(!n){ const ak = fontKey(alt); if(FONTS.has(ak)) return FONTS.get(ak); n = lffName(ak) || 'simplex'; }
    const F = LFF.get(n); if(!F){ lffLoad(n); return null; } return F; }
  A.shxAltOf = ff => { const F = altFont(ff); return F ? F.file.toLowerCase() : null; };
  // glyph LFF (đơn vị = chiều cao chữ hoa) + dấu tiếng Việt ghép (NFD: chữ gốc + dấu)
  const MARK = {
    0x300: (c, t) => [[[c - 0.9, t + 2.3], [c + 0.6, t + 0.8]]],                                   // huyền
    0x301: (c, t) => [[[c - 0.6, t + 0.8], [c + 0.9, t + 2.3]]],                                   // sắc
    0x302: (c, t) => [[[c - 1.6, t + 0.6], [c, t + 2.1], [c + 1.6, t + 0.6]]],                     // mũ
    0x306: (c, t) => [[[c - 1.6, t + 2.1], [c - 1.1, t + 1.1], [c, t + 0.7], [c + 1.1, t + 1.1], [c + 1.6, t + 2.1]]],   // trăng
    0x303: (c, t) => [[[c - 1.9, t + 0.9], [c - 1.2, t + 1.7], [c - 0.4, t + 1.6], [c + 0.4, t + 1.0], [c + 1.2, t + 0.9], [c + 1.9, t + 1.7]]],   // ngã
    0x309: (c, t) => [[[c - 0.9, t + 1.9], [c - 0.3, t + 2.4], [c + 0.6, t + 2.2], [c + 0.8, t + 1.6], [c + 0.1, t + 1.2], [c + 0.1, t + 0.6]]],   // hỏi
    0x323: (c, t, b) => { const y = b - 1.6, r = 0.4, L = []; for(let k = 0; k <= 8; k++){ const a = k * Math.PI / 4; L.push([c + r * Math.cos(a), y + r * Math.sin(a)]); } return [L]; },   // nặng
  };
  function lffGlyph(F, ch){
    const G = F.cache || (F.cache = new Map()); if(G.has(ch)) return G.get(ch);
    const base = g => { if(!g || !g.lines.length) return null; let mx = -Infinity; for(const L of g.lines) for(const p of L) if(p[0] > mx) mx = p[0]; return { lines: g.lines.map(L => L.map(p => [p[0], p[1]])), w: mx }; };
    let r = null, cp = ch.codePointAt(0);
    if(ch === ' ') r = { lines: [], w: F.ws - 1.2 };
    else { let g = base(F.G.get(cp));
      if(!g){ const d = ch.normalize('NFD'), b0 = d.codePointAt(0), marks = [...d].slice(1).map(m => m.codePointAt(0)); let horn = false, bar = false;
        if(cp === 0x111 || cp === 0x110){ g = base(F.G.get(cp === 0x111 ? 0x64 : 0x44)); bar = true; }
        else { const bs = String.fromCodePoint(b0); let src = bs; for(const m of marks.slice()){ const cand = (bs + String.fromCodePoint(m)).normalize('NFC'); if([...cand].length === 1 && F.G.get(cand.codePointAt(0)) && src === bs){ src = cand; marks.splice(marks.indexOf(m), 1); } }   // dùng chữ có sẵn dấu (â, ê, ô, ă) nếu phông có
          g = base(F.G.get(src.codePointAt(0))); const hi = marks.indexOf(0x31B); if(hi >= 0){ horn = true; marks.splice(hi, 1); } }
        if(g){ let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for(const L of g.lines) for(const p of L){ x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
          const cx = (x0 + x1) / 2; let top = y1;
          if(horn){ g.lines.push([[x1 - 0.3, y1 - 0.9], [x1 + 0.7, y1 - 0.1], [x1 + 0.9, y1 + 0.9]]); g.w = Math.max(g.w, x1 + 0.9); }
          if(bar){ if(cp === 0x111) g.lines.push([[x1 - 2.4, 7.2], [x1 + 0.6, 7.2]]); else g.lines.push([[x0 - 1, 4.5], [x0 + 2.6, 4.5]]); }
          for(const m of marks){ const f = MARK[m]; if(!f) continue; const L = f(cx, top, y0); if(m !== 0x323){ for(const l of L) g.lines.push(l); top += 1.9; } else for(const l of L) g.lines.push(l); } }
      }
      if(g) r = { lines: g.lines, w: g.w + 1.2 }; }
    const k = 1 / F.above, out = r ? { lines: r.lines.map(L => L.map(p => [p[0] * k, p[1] * k])), adv: Math.max(0, r.w) * k } : null; G.set(ch, out); return out;
  }
  const isShx = f => /\.shx$/i.test(String(f || ''));
  function fontsOf(e){ if(!e || !isShx(e.ff)) return null; const m = FONTS.get(fontKey(e.ff)) || altFont(e.ff); if(!m || m.type === 'bigfont'){ const b = e.ffb ? FONTS.get(fontKey(e.ffb)) : null; return m ? { main: m, big: b } : null; } return { main: m, big: e.ffb ? FONTS.get(fontKey(e.ffb)) || null : null }; }
  // bố cục 1 dòng: các nét (đơn vị = cỡ chữ) + ký tự thiếu (vẽ bằng phông thay thế) + bề rộng
  let measCtx = null; const measure = (ch, ff) => { if(!measCtx) measCtx = document.createElement('canvas').getContext('2d'); measCtx.font = '100px ' + (ff || 'Arial'); return measCtx.measureText(ch).width / 72; };
  function layoutLine(fs, s){ const lines = [], miss = []; let x = 0;
    for(const ch of s){ const g = glyphOf(fs.main, fs.big, ch); if(g){ for(const L of g.lines) lines.push(L.map(p => [p[0] + x, p[1]])); x += g.adv; } else { const w = measure(ch); miss.push({ ch, x }); x += w; } }
    return { lines, miss, w: x }; }
  const lineCache = new Map();
  function layoutOf(e, fs){ const key = fs.main.file + '|' + (fs.big ? fs.big.file : '') + '|' + e.text; let L = lineCache.get(key); if(L) return L; if(lineCache.size > 4000) lineCache.clear();
    L = String(e.text || '').split('\n').map(t => layoutLine(fs, t)); lineCache.set(key, L); return L; }
  // độ dời gốc theo canh lề (đơn vị = cỡ chữ; y hướng lên)
  function place(e, fs, L){ const n = L.length, lh = 5 / 3, dsc = (fs.main.below || 0) / fs.main.above, va = e.va || 'alphabetic', ha = e.ha || 'left';
    const base = va === 'top' ? -1 : va === 'middle' ? (n > 1 ? -0.5 : -0.5) : va === 'bottom' ? dsc : 0;   // đường chân chữ dòng đầu
    let y0 = base; if(n > 1){ if(va === 'middle') y0 = (n - 1) * lh / 2 - 0.5; else if(va === 'alphabetic' || va === 'bottom') y0 = base + (n - 1) * lh; }
    return L.map((l, i) => ({ l, dx: ha === 'center' ? -l.w / 2 : (ha === 'right' || ha === 'end') ? -l.w : 0, dy: y0 - i * lh })); }
  // vẽ trên canvas đã đặt hệ toạ độ chữ (px, y xuống, gốc = điểm chèn). Trả false nếu không có phông.
  A.shxText = (ctx, e, size, col, T0) => {
    const fs = fontsOf(e); if(!fs) return false; const L = place(e, fs, layoutOf(e, fs)); ctx.beginPath();
    for(const p of L){ for(const ln of p.l.lines){ ctx.moveTo((ln[0][0] + p.dx) * size, -(ln[0][1] + p.dy) * size); for(let k = 1; k < ln.length; k++) ctx.lineTo((ln[k][0] + p.dx) * size, -(ln[k][1] + p.dy) * size); } }
    let miss = false; for(const p of L) if(p.l.miss.length){ miss = true; break; }
    if(miss){ ctx.save(); ctx.font = (size / 0.72) + 'px Arial, "Noto Sans", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col; for(const p of L) for(const m of p.l.miss) ctx.fillText(m.ch, (m.x + p.dx) * size, -p.dy * size); ctx.restore(); }
    if(T0) ctx.setTransform(T0); const lw = ctx.lineWidth; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, lw || 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineWidth = lw;
    return true; };
  // khung chữ trong hệ của chữ (đơn vị bản vẽ) — cho chọn, bắt, phóng
  A.shxExtent = e => { const fs = fontsOf(e); if(!fs) return null; const h = e.h || 2.5, xs = e.xs || 1; const L = place(e, fs, layoutOf(e, fs)); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for(const p of L){ x0 = Math.min(x0, p.dx); x1 = Math.max(x1, p.dx + p.l.w); for(const ln of p.l.lines) for(const q of ln){ y0 = Math.min(y0, q[1] + p.dy); y1 = Math.max(y1, q[1] + p.dy); } y0 = Math.min(y0, p.dy); y1 = Math.max(y1, p.dy + 1); }
    if(!isFinite(x0)) return null; let xmin = x0 * h * Math.abs(xs), xmax = x1 * h * Math.abs(xs); if(xs < 0){ const t = xmin; xmin = -xmax; xmax = -t; } const ymin = y0 * h, ymax = y1 * h; return e.ud ? { xmin, xmax, ymin: -ymax, ymax: -ymin } : { xmin, xmax, ymin, ymax }; };
  // nét chữ ra toạ độ bản vẽ (máy vẽ, EPS, WMF, TXTEXP)
  A.shxStrokes = e => { if(e && (e.cols || (e.rt && e.rtx === e.text)) && A.richShxStrokes) return A.richShxStrokes(e);   // chữ có định dạng: chỉ khi mọi đoạn dùng phông SHX
    const fs = fontsOf(e); if(!fs) return null; const h = e.h || 2.5, xs = e.xs || 1, r = (e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), ob = e.obl ? Math.tan(e.obl * Math.PI / 180) : 0, ud = e.ud ? -1 : 1;
    const T = (x, y) => { const lx = (x + y * ob) * h * xs, ly = y * h * ud; return { x: e.x + lx * c - ly * s, y: e.y + lx * s + ly * c }; };
    const out = []; for(const p of place(e, fs, layoutOf(e, fs))) for(const ln of p.l.lines) out.push(ln.map(q => T(q[0] + p.dx, q[1] + p.dy))); return out; };
  // đoạn chữ của MTEXT có định dạng (phông riêng từng đoạn): bộ phông + bố cục 1 dòng (đơn vị = cỡ chữ)
  A.shxRun = (ff, ffb) => fontsOf({ ff, ffb });
  A.shxLine = (fs, t) => { const key = 'L1|' + fs.main.file + '|' + (fs.big ? fs.big.file : '') + '|' + t; let L = lineCache.get(key); if(L) return L; if(lineCache.size > 4000) lineCache.clear(); L = layoutLine(fs, String(t)); lineCache.set(key, L); return L; };
  A.shxVer = 0;
  A.shxFontList = () => [...FONTS.values()].map(F => ({ file: F.file, type: F.type, n: F.glyph.size }));
  A.shxFontHas = f => FONTS.has(fontKey(f));
  // lưu phông trong IndexedDB (phông bigfont có thể vài MB)
  let fdb = null; const fdbOpen = () => fdb || (fdb = new Promise((res, rej) => { const r = indexedDB.open('dvdcad-pro', 1); r.onupgradeneeded = () => { r.result.createObjectStore('files'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const fdbTx = async (mode, fn) => { const d = await fdbOpen(); return new Promise((res, rej) => { const t = d.transaction('files', mode), st = t.objectStore('files'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const redraw = () => { lineCache.clear(); A.shxVer++; for(const F of FONTS.values()) F.cache = null; try{ bbDirty = true; snapDirty = true; }catch(_){} try{ if(typeof requestDraw === 'function') requestDraw(); else if(typeof draw === 'function') draw(); }catch(_){} };
  async function addFont(u8, file, keep){ const F = parseFont(u8, file); FONTS.set(F.file, F); if(keep !== false){ try{ await fdbTx('readwrite', st => st.put(u8, 'shxf:' + F.file)); const L = new Set((await fdbTx('readonly', st => st.get('shxf:list'))) || []); L.add(F.file); await fdbTx('readwrite', st => st.put([...L], 'shxf:list')); }catch(_){} } redraw(); return F; }
  A.shxFontAdd = addFont;
  A.shxFontRemove = async file => { const k = fontKey(file); FONTS.delete(k); try{ await fdbTx('readwrite', st => st.delete('shxf:' + k)); const L = new Set((await fdbTx('readonly', st => st.get('shxf:list'))) || []); L.delete(k); await fdbTx('readwrite', st => st.put([...L], 'shxf:list')); }catch(_){} redraw(); };
  // FONTALT: phông thay cho phông .shx không có (như AutoCAD); '.' = không thay (vẽ bằng phông TrueType)
  if(A.sysvar && A.sysvar.def) A.sysvar.def('FONTALT', { d: 'Phông thay thế khi bản vẽ dùng phông .shx chưa nạp (DVDCAD kèm phông nét đơn tương ứng: txt → standard, simplex, romans, romand, iso, italicc); "." = không thay', s: 1,
    get: fontAlt, set: v => { const t = String(v == null ? '' : v).trim(); try{ localStorage.setItem('dvd:fontalt', t || '.'); }catch(_){} redraw(); } });
  A.shxFontsReady = (async () => { try{ const L = (await fdbTx('readonly', st => st.get('shxf:list'))) || []; for(const f of L){ const u = await fdbTx('readonly', st => st.get('shxf:' + f)); if(u) try{ const F = parseFont(u instanceof Uint8Array ? u : new Uint8Array(u), f); FONTS.set(F.file, F); }catch(_){} } if(L.length) redraw(); }catch(_){} })();
  // phông .shx bản vẽ cần mà chưa nạp
  A.shxMissing = () => { const S = new Set(); for(const e of (typeof modelEntities !== 'undefined' ? modelEntities : [])) if(e.type === 'TEXT'){ if(isShx(e.ff) && !FONTS.has(fontKey(e.ff))) S.add(String(e.ff).toLowerCase()); if(isShx(e.ffb) && !FONTS.has(fontKey(e.ffb))) S.add(String(e.ffb).toLowerCase()); } return [...S].sort(); };
  async function pickFonts(){ const files = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.shx'; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res([...(i.files || [])]); i.remove(); }; i.click(); });
    const ok = [], bad = []; for(const f of files){ try{ const F = await addFont(new Uint8Array(await f.arrayBuffer()), f.name.replace(/^.*[\\/]/, '')); ok.push(F.file.toLowerCase() + ' (' + F.type + ', ' + F.glyph.size + ' ký tự)'); }catch(err){ bad.push(f.name + ': ' + err.message); } }
    if(ok.length) log('Đã nạp phông SHX: ' + ok.join(', ') + '.'); for(const b of bad) log(b); return ok.length; }
  A.shxPickFonts = pickFonts;
  // mở bản vẽ có kiểu chữ dùng phông .shx chưa nạp: nhắc một lần (như AutoCAD báo thiếu phông)
  A.onLoad = (function(prev){ return function(){ if(prev) prev.apply(this, arguments); setTimeout(async () => { try{ await A.shxFontsReady; const m = A.shxMissing(); if(m.length) log('Bản vẽ dùng phông SHX chưa nạp: ' + m.join(', ') + ' — đang vẽ bằng phông nét đơn thay thế (' + m.map(f => f + ' → ' + (A.shxAltOf(f) || lffAlias(f))).join(', ') + ', FONTALT); muốn đúng phông gốc thì nạp bằng SHXFONTS (hoặc STYLE → Phông SHX…).'); }catch(_){} }, 50); }; })(A.onLoad);
  const lffAlias = f => (lffName(fontKey(f)) || lffName(fontKey(fontAlt())) || 'simplex') + '.lff';
  plain(['SHXFONTS', 'FONTSHX'], 'Phông SHX cho chữ: nạp tệp .shx (txt, simplex, romans, isocp…, unifont, bigfont), xem / bỏ phông đã nạp, phông bản vẽ còn thiếu', () => {
    const rows = () => { const L = A.shxFontList(); return L.length ? L.map(F => '<tr data-f="' + F.file + '"><td translate="no">' + F.file.toLowerCase() + '</td><td>' + F.type + '</td><td>' + F.n + '</td></tr>').join('') : '<tr><td colspan="3" style="opacity:.7">Chưa nạp phông SHX nào.</td></tr>'; };
    const miss = () => { const m = A.shxMissing(); return m.length ? 'Bản vẽ dùng phông chưa nạp: <b translate="no">' + m.join(', ') + '</b> (đang vẽ bằng phông nét đơn thay thế theo FONTALT = ' + String(fontAlt()).replace(/[&<]/g, '') + ').' : 'Bản vẽ không thiếu phông SHX nào.'; };
    const html = '<div class="acw" style="width:480px"><div class="lm-grid" style="height:200px"><table><thead><tr><th>Phông</th><th style="width:90px">Loại</th><th style="width:70px">Ký tự</th></tr></thead><tbody id="sfB">' + rows() + '</tbody></table></div>' +
      '<div style="display:flex;gap:6px;margin:8px 0">' + K.btn('sfAdd', 'Nạp phông…') + K.btn('sfRm', 'Bỏ phông') + '</div><div class="acw-note" id="sfM" style="white-space:normal">' + miss() + '</div>' +
      '<div class="acw-note" style="white-space:normal">Phông SHX của AutoCAD (thư mục Fonts) dùng theo giấy phép của Autodesk — DVDCAD không kèm phông, bạn nạp phông có sẵn trên máy. Kiểu chữ dùng phông .shx (bảng STYLE hoặc tệp DXF / DWG) sẽ vẽ bằng nét của phông.</div></div>';
    const d = A.dialog({ title: 'Phông SHX', cls: 'acw-free', help: 'SHXFONTS', html, noOk: true, cancelText: 'Đóng' }); const root = d.root; let sel = null;
    const upd = () => { root.querySelector('#sfB').innerHTML = rows(); root.querySelector('#sfM').innerHTML = miss(); sel = null; };
    root.querySelector('#sfB').addEventListener('click', ev => { const tr = ev.target.closest('tr[data-f]'); if(!tr) return; sel = tr.dataset.f; root.querySelectorAll('#sfB tr').forEach(t => t.classList.toggle('sel', t === tr)); });
    root.querySelector('#sfAdd').onclick = async () => { await pickFonts(); upd(); };
    root.querySelector('#sfRm').onclick = async () => { if(!sel) return; await A.shxFontRemove(sel); upd(); };
  });


  /* ==================================================================
     ALIGNSPACE — căn khung nhìn: điểm trong MÔ HÌNH (bấm trong khung nhìn) ↔ điểm trên GIẤY
     ================================================================== */
  const curPaper = () => { try{ const L = dwgLayouts[currentLayout]; if(L && !L.isModel && L.paper && (L.paper.viewports || []).length) return L; }catch(_){} return null; };
  const vpAt = (L, p) => { let best = -1, ba = Infinity; L.paper.viewports.forEach((v, i) => { if(Math.abs(p.x - v.vcx) <= v.w / 2 + 1e-9 && Math.abs(p.y - v.vcy) <= v.h / 2 + 1e-9 && v.w * v.h < ba){ ba = v.w * v.h; best = i; } }); return best; };
  const toModel = (v, p) => window.vpToModel(v, p);   // tính cả xoay nhìn (VIEWTWIST)
  const nrm = a => { a %= 2 * Math.PI; if(a < 0) a += 2 * Math.PI; return a < 1e-9 || 2 * Math.PI - a < 1e-9 ? 0 : a; };
  function vpApply(L, i, sNew, dc, tw){
    const v = L.paper.viewports[i], vh0 = v.vh; v.vh = v.h / sNew; v.dcx = dc.x; v.dcy = dc.y; if(tw) v.tw = tw; else delete v.tw;
    if(L.user && L.def && A.saveLayoutDef){ const D = JSON.parse(JSON.stringify(L.def)); const q = D.vps && D.vps[i]; if(q){ q.n = q.n * (v.vh / vh0); q.cx = dc.x; q.cy = dc.y; if(tw) q.tw = tw; else delete q.tw; } A.saveLayoutDef(D); return true; }
    try{ entities = buildPaperEntities(L); }catch(_){} try{ redraw(); A.paint(); }catch(_){} return false;
  }
  // 2 cặp điểm: tỉ lệ = khoảng cách giấy / mô hình, xoay nhìn = hướng giấy − hướng mô hình; điểm mô hình 1 nằm đúng điểm giấy 1
  A.alignSpace = (L, i, m1, p1, m2, p2, noRot) => { const v = L.paper.viewports[i]; let s = v.h / v.vh, tw = v.tw || 0;
    if(m2 && p2){ const dm = Math.hypot(m2.x - m1.x, m2.y - m1.y), dp = Math.hypot(p2.x - p1.x, p2.y - p1.y); if(dm > 1e-12 && dp > 1e-12){ s = dp / dm; if(!noRot) tw = nrm(Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.atan2(m2.y - m1.y, m2.x - m1.x)); } }
    const c = Math.cos(tw), sn = Math.sin(tw), x = (p1.x - v.vcx) / s, y = (p1.y - v.vcy) / s;
    return { s, tw, user: vpApply(L, i, s, { x: m1.x - (c * x + sn * y), y: m1.y - (-sn * x + c * y) }, tw) }; };
  ecmd(['ALIGNSPACE'], 'Căn khung nhìn layout (Express Tools): 1–2 điểm trong mô hình (bấm trong khung nhìn) và 1–2 điểm tương ứng trên giấy → đổi tỉ lệ và vị trí nhìn cho trùng', async () => {
    const L = curPaper(); if(!L){ log('Mở một layout có khung nhìn trước (tab layout phía dưới).'); return; }
    const a = await A.getPoint('Chỉ định điểm căn thứ nhất trong không gian MÔ HÌNH', { noLim: true }); if(!a.pt) return; const i = vpAt(L, a.pt); if(i < 0){ log('Điểm không nằm trong khung nhìn nào.'); return; }
    const v = L.paper.viewports[i], m1 = toModel(v, a.pt);
    const b = await A.getPoint('Chỉ định điểm căn thứ hai trong không gian MÔ HÌNH hoặc <tiếp tục>', { base: a.pt, noLim: true }); let m2 = null;
    if(b.pt){ if(vpAt(L, b.pt) !== i){ log('Hai điểm mô hình phải cùng một khung nhìn.'); return; } m2 = toModel(v, b.pt); }
    const c = await A.getPoint('Chỉ định điểm căn thứ nhất trong không gian GIẤY', { noLim: true }); if(!c.pt) return; let p2 = null;
    if(m2){ const d = await A.getPoint('Chỉ định điểm căn thứ hai trong không gian GIẤY', { base: c.pt, noLim: true }); if(!d.pt) return; p2 = d.pt; }
    const r = A.alignSpace(L, i, m1, c.pt, m2, p2);
    const twd = r.tw * 180 / Math.PI;
    log('ALIGNSPACE: khung nhìn #' + (i + 1) + ' tỉ lệ ' + (r.s >= 1 ? (+r.s.toPrecision(5)) + ':1' : '1:' + (+(1 / r.s).toPrecision(5))) + (twd ? ', xoay nhìn ' + (+twd.toFixed(4)) + '°' : '') + (r.user ? '.' : ' (layout của tệp: giữ đến khi mở lại tệp).'));
  });

  /* ==================================================================
     SYSWINDOWS — xếp các bản vẽ đang mở (như cửa sổ con của AutoCAD); ảnh của từng bản vẽ ở góc nhìn đang dùng
     ================================================================== */
  const SHOT = new Map();   // id tab → ảnh canvas lúc rời bản vẽ
  const curTabId = () => { const on = document.querySelector('#acadFile .ft.doc.on'); return on ? +on.dataset.id : null; };
  const grab = (w) => { try{ const c = document.getElementById('cv'); const k = Math.min(1, (w || 900) / Math.max(1, c.width)); const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(c.width * k)); o.height = Math.max(1, Math.round(c.height * k)); const g = o.getContext('2d'); g.fillStyle = getComputedStyle(c).backgroundColor || '#212830'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.85); }catch(_){ return null; } };
  const keepShot = () => { const id = curTabId(); if(id != null){ const u = grab(); if(u) SHOT.set(id, u); } };
  for(const fn of ['loadDXF', 'loadDWG']){ const f0 = window[fn]; if(typeof f0 === 'function') window[fn] = function(){ try{ keepShot(); }catch(_){} return f0.apply(this, arguments); }; }
  // Lát dọc / Lát ngang / Xếp chồng: ô của bản vẽ hiện hành chứa canvas thật (vẽ, sửa như thường); ô khác là ảnh bản vẽ — bấm để làm hiện hành ngay trong ô đó.
  // Thu nhỏ: các thanh tên ở đáy, bấm để mở. Nút □ trên thanh tên (hoặc SYSWINDOWS lần nữa) = trở về một cửa sổ.
  let SW = null;   // { box, mode, cur, n, t }
  const cvEl = () => document.getElementById('cv');
  function cvPlace(R){ const cv = cvEl(); let cw = null; try{ if(!view.rot) cw = toWorld(W() / 2, H() / 2); }catch(_){}
    // canvas + 2 lớp phủ (con trỏ, khung chọn) cùng chỗ; 'important' thắng quy tắc thu hẹp khi mở bảng Thuộc tính
    for(const c of [cv, document.getElementById('dvdOvS'), document.getElementById('dvdOvC')]){ if(!c) continue;
      if(R){ for(const [k, v] of [['left', R.x + 'px'], ['top', R.y + 'px'], ['width', R.w + 'px'], ['height', R.h + 'px'], ['right', 'auto'], ['bottom', 'auto']]) c.style.setProperty(k, v, 'important'); }
      else for(const k of ['left', 'top', 'width', 'height', 'right', 'bottom']) c.style.removeProperty(k); }
    if(!R){ const o = document.getElementById('dvdOvS'); for(const c of [o, document.getElementById('dvdOvC')]) if(c){ c.style.inset = '0'; c.style.width = '100%'; c.style.height = '100%'; } }
    try{ resize(); }catch(_){}
    if(cw){ try{ view.offsetX = W() / 2 - cw.x * view.scale; view.offsetY = H() / 2 + cw.y * view.scale; draw(); A.paint(); }catch(_){} } }   // giữ tâm nhìn khi đổi cỡ ô
  const swKey = e => { if(e.key === 'Escape' && SW && SW.mode === 'A'){ e.stopPropagation(); swClose(); } };
  const swClose = () => { if(!SW) return; clearInterval(SW.t); window.removeEventListener('resize', swRelay); document.removeEventListener('keydown', swKey, true); SW.box.remove(); const live = SW.mode !== 'A'; SW = null; if(live) cvPlace(null); };
  const swRelay = () => { if(SW) layoutSW(); };
  function layoutSW(){
    const mode = SW.mode, T = (A.TABS || []).slice(), cur = curTabId(); SW.cur = cur; SW.n = T.length;
    const items = T.length ? T.map(t => ({ id: t.id, name: t.name, on: t.id === cur })) : [{ id: cur, name: (typeof currentName === 'string' && currentName) || 'Drawing', on: true }];
    if(mode === 'C'){ const k = items.findIndex(it => it.on); if(k >= 0) items.push(items.splice(k, 1)[0]); }   // xếp chồng: bản vẽ hiện hành nằm trên cùng
    const stage = cvEl().parentElement, r0 = stage.getBoundingClientRect(), box = SW.box; box.innerHTML = '';
    const r = { left: r0.left, top: r0.top, width: r0.width - (document.documentElement.classList.contains('dvd-props-on') ? 290 : 0), height: r0.height };   // chừa chỗ bảng Thuộc tính
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const n = items.length, cols = mode === 'V' ? n : mode === 'H' ? 1 : Math.ceil(Math.sqrt(n)), rows = mode === 'V' ? 1 : mode === 'H' ? n : Math.ceil(n / cols);
    const rects = mode === 'C' ? items.map((_, i) => ({ x: 12 + i * 28, y: 12 + i * 28, w: r.width * 0.68, h: r.height * 0.68 })) : mode === 'A' ? items.map((_, i) => ({ x: 8 + i * 168, y: r.height - 32, w: 160, h: 24 }))
      : items.map((_, i) => { const w = r.width / cols, h = r.height / rows; return { x: (i % cols) * w + 2, y: Math.floor(i / cols) * h + 2, w: w - 4, h: h - 4 }; });
    const act = rects[items.findIndex(it => it.on)];
    const nm = s => String(s).replace(/[&<]/g, c => c === '&' ? '&amp;' : '&lt;');
    items.forEach((it, i) => { const R = rects[i], live = it.on && mode !== 'A', d = document.createElement('div'); d.className = 'sw-pane' + (it.on ? ' on' : '') + (live ? ' live' : ''); d.dataset.id = it.id;
      d.style.cssText = 'position:absolute;left:' + R.x + 'px;top:' + R.y + 'px;width:' + R.w + 'px;height:' + R.h + 'px;z-index:' + (i + 1) + ';display:flex;flex-direction:column;border:1px solid ' + (it.on ? '#0696d7' : '#59647a') + ';box-sizing:border-box;' + (live ? 'pointer-events:none' : 'background:#1e232b;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:pointer;pointer-events:auto');
      // xếp chồng: phần ô cũ bị ô hiện hành che thì cắt bỏ (để canvas bên dưới lộ ra)
      if(mode === 'C' && !it.on && act){ const ax = act.x - R.x, ay = act.y - R.y; if(ax < R.w && ay < R.h) d.style.clipPath = 'polygon(0 0,' + R.w + 'px 0,' + R.w + 'px ' + Math.max(0, ay) + 'px,' + Math.max(0, ax) + 'px ' + Math.max(0, ay) + 'px,' + Math.max(0, ax) + 'px ' + R.h + 'px,0 ' + R.h + 'px)'; }
      const img = SHOT.get(it.id);
      d.innerHTML = '<div class="sw-tt" style="flex:0 0 22px;display:flex;align-items:center;gap:6px;padding:0 4px 0 8px;background:' + (it.on ? '#0b5a86' : '#3a4250') + ';color:#fff;font:12px system-ui,sans-serif;white-space:nowrap;overflow:hidden;pointer-events:auto;cursor:' + (it.on ? 'default' : 'pointer') + '"><span translate="no" style="flex:1;overflow:hidden;text-overflow:ellipsis">' + nm(it.name) + '</span>' +
        (mode === 'A' ? '' : '<button type="button" class="sw-max" title="Phóng to (một cửa sổ)" style="border:0;background:none;color:#fff;font:13px system-ui;cursor:pointer;padding:0 4px">□</button>') + '</div>' +
        (mode === 'A' || live ? '' : '<div style="flex:1;min-height:0;background:#212830 center/contain no-repeat' + (img ? ' url(' + img + ')' : '') + ';display:grid;place-items:center;color:#8f99a8;font:12px system-ui">' + (img ? '' : 'Bấm để mở bản vẽ') + '</div>');
      d.addEventListener('click', ev => { const mx = ev.target.closest('.sw-max');
        if(mx){ ev.stopPropagation(); const go = !it.on; swClose(); if(go && A.switchTab){ keepShot(); A.switchTab(it.id); } return; }
        if(it.on) return; if(mode === 'A'){ swClose(); if(A.switchTab) A.switchTab(it.id); return; }
        keepShot(); if(A.switchTab) A.switchTab(it.id); });
      box.appendChild(d); });
    if(mode !== 'A' && act) cvPlace({ x: act.x + 1, y: act.y + 23, w: Math.max(40, act.w - 2), h: Math.max(30, act.h - 24) });
    return items.length;
  }
  function sysWin(mode){
    if(SW) swClose(); keepShot();
    const box = document.createElement('div'); box.className = 'sw-host'; box.style.cssText = 'position:fixed;z-index:45;overflow:hidden;pointer-events:none;' + (mode === 'A' ? 'background:rgba(42,48,56,.92);pointer-events:auto' : '');
    document.body.appendChild(box); SW = { box, mode, cur: null, n: 0, t: 0 };
    const n = layoutSW();
    if(mode === 'A') document.addEventListener('keydown', swKey, true);
    else { window.addEventListener('resize', swRelay);
      // đổi bản vẽ (bấm ô, tab tệp, mở / đóng bản vẽ) → xếp lại; ảnh bản vẽ hiện hành được làm mới định kỳ
      let k = 0; SW.t = setInterval(() => { if(!SW) return; const c = curTabId(), m = (A.TABS || []).length; if(m < 2 && SW.n >= 2){ swClose(); return; } if(c !== SW.cur || m !== SW.n) layoutSW(); else if(++k % 8 === 0) keepShot(); }, 250); }
    return n;
  }
  A.sysWindows = sysWin;
  try{ if(A.ribbonAct) for(const m of ['V', 'H', 'C']) A.ribbonAct('SYSWINDOWS|' + m, () => { const n = sysWin(m); log('SYSWINDOWS: ' + n + ' bản vẽ — bản vẽ hiện hành sửa ngay trong ô của nó; bấm ô khác để chuyển; □ = trở về một cửa sổ.'); }); }catch(_){}
  ecmd(['SYSWINDOWS'], 'Xếp các bản vẽ đang mở thành cửa sổ con: Xếp chồng / Lát ngang / Lát dọc / Thu nhỏ — bản vẽ hiện hành vẽ, sửa ngay trong ô; bấm ô khác để chuyển; □ = một cửa sổ', async () => {
    if(SW && SW.mode !== 'A'){ swClose(); log('SYSWINDOWS: trở về một cửa sổ.'); return; }
    const k = await A.getKw('Nhập tuỳ chọn', { kw: [{ k: 'C', t: 'Xếp chồng' }, { k: 'H', t: 'Lát ngang' }, { k: 'V', t: 'Lát dọc' }, { k: 'A', t: 'Thu nhỏ' }], def: 'Lát dọc' });
    const m = k.kw || (k.none ? 'V' : null); if(!m) return; const n = sysWin(m); log('SYSWINDOWS: ' + n + ' bản vẽ — ' + (m === 'A' ? 'bấm vào thanh để mở bản vẽ, Esc để trở lại.' : 'bản vẽ hiện hành sửa ngay trong ô của nó; bấm ô khác để chuyển; □ = trở về một cửa sổ.'));
  });
  /* ---- WMFOPTS ---- */
  const OPT = () => Object.assign({ wire: false, wide: true }, lsGet('dvd:wmfopts', {}));
  plain(['WMFOPTS'], 'Tuỳ chọn nhập WMF (WMFIN): khung dây — không tô vùng; nét rộng — giữ bề rộng bút', () => {
    const o = OPT();
    A.dialog({ title: 'Tuỳ chọn nhập WMF', help: 'WMFOPTS', html: '<div class="acw" style="width:320px">' + K.grp('Nhập', K.chk('woW', 'Khung dây (không tô vùng)', o.wire) + K.chk('woL', 'Nét rộng (giữ bề rộng bút)', o.wide)) + '</div>',
      ok: root => { lsSet('dvd:wmfopts', { wire: root.querySelector('#woW').checked, wide: root.querySelector('#woL').checked }); log('WMFOPTS: đã lưu.'); } });
  });

  /* ---- WMFIN ---- */
  ecmd(['WMFIN'], 'Nhập Windows Metafile (.wmf) thành khối WMF0, WMF1…: điểm chèn (góc trên trái), tỉ lệ, góc xoay', async () => {
    const f = await pickFile('.wmf'); if(!f) return; let R;
    try{ R = parseWMF(await f.arrayBuffer(), OPT()); }catch(err){ log('WMFIN: ' + err.message); say(err.message); return; }
    if(!R.ents.length){ log('WMFIN: tệp không có hình vẽ.'); return; }
    const defs = window._dvdBlocks || (window._dvdBlocks = {}); const used = new Set(Object.keys(defs).concat(Object.keys(A.blockLib ? A.blockLib() : {})).concat(modelEntities.filter(e => e.blk).map(e => e.blk)).map(s => s.toUpperCase()));
    let n = 0; while(used.has('WMF' + n)) n++; const name = 'WMF' + n;
    defs[name] = { name, base: { x: 0, y: 0 }, entities: R.ents.map(e => Object.assign({ layer: '0' }, e)) };
    const prev = (g, q, sc, rot) => { const L = A.instBlock(name, 'file', q, sc || 1, rot || 0); g.ents ? g.ents(L) : null; };
    const p = await A.getPoint('Chỉ định điểm chèn (góc trên trái)', { rubber: false, preview: (g, q) => prev(g, q) }); if(!p.pt){ delete defs[name]; return; }
    const s = await A.getNum('Nhập hệ số tỉ lệ', { def: 1 }); const sc = s.num > 0 ? s.num : 1;
    const r = await A.getAngle('Chỉ định góc xoay', { base: p.pt, def: 0 }); const rot = r.num != null ? r.num : (r.ang != null ? r.ang : 0);
    const L = A.instBlock(name, 'file', p.pt, sc, rot); if(!L.length){ delete defs[name]; log('WMFIN: không chèn được.'); return; }
    A.commit({ add: L }, 'WMFIN: ' + f.name + ' → khối ' + name + ' (' + R.ents.length + ' đối tượng, ' + (+(R.w * sc).toFixed(1)) + ' × ' + (+(R.h * sc).toFixed(1)) + ' mm)');
  });
})();
