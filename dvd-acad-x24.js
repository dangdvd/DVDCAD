/* DVDCAD v5y — PDF vector cho PLOT / PUBLISH (như DWG To PDF.pc3 của AutoCAD)
   PdfCtx: ngữ cảnh vẽ giả lập CanvasRenderingContext2D, ghi mọi lệnh vẽ của bộ vẽ bản vẽ thành toán tử PDF
   (đường, cung, Bézier, tô / cắt, nét đứt, độ trong suốt, gradient, ảnh) — phóng to bao nhiêu cũng sắc nét.
   Chữ: phông TrueType / OpenType của máy được nhúng (chỉ các ký tự dùng tới), chọn / tìm / sao chép được trong trình đọc PDF. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x24) return; A._x24 = true;
  const enc = new TextEncoder();
  const num = v => { if(!isFinite(v)) return '0'; const s = (Math.abs(v) < 1e-6 ? 0 : v).toFixed(3); return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') || '0' : s; };
  const mmul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mstr = m => m.map(num).join(' ');
  async function deflate(u8){ try{ if(typeof CompressionStream === 'undefined') return null; const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate')); return new Uint8Array(await new Response(s).arrayBuffer()); }catch(_){ return null; } }

  /* ==================================================================
     Phông TrueType / OpenType: bảng, cmap, bề rộng, cắt gọn (subset) glyf
     ================================================================== */
  function sfnt(u8, face){
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), tag = o => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    let off = 0; if(tag(0) === 'ttcf'){ const n = dv.getUint32(8); off = dv.getUint32(12 + 4 * Math.min(Math.max(0, face | 0), n - 1)); }
    const nt = dv.getUint16(off + 4), T = {}; for(let i = 0; i < nt; i++){ const o = off + 12 + 16 * i; T[tag(o)] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) }; }
    return { dv, T, u8 };
  }
  function parseFont(u8, face){
    const { dv, T } = sfnt(u8, face); if(!T.head || !T.hhea || !T.maxp || !T.hmtx || !T.cmap) throw new Error('Phông thiếu bảng');
    const h = T.head.off, upm = dv.getUint16(h + 18) || 1000, bbox = [dv.getInt16(h + 36), dv.getInt16(h + 38), dv.getInt16(h + 40), dv.getInt16(h + 42)], locFmt = dv.getInt16(h + 50), mac = dv.getUint16(h + 44);
    const asc = dv.getInt16(T.hhea.off + 4), desc = dv.getInt16(T.hhea.off + 6), nhm = dv.getUint16(T.hhea.off + 34), ng = dv.getUint16(T.maxp.off + 4);
    const adv = new Uint16Array(ng); for(let i = 0; i < ng; i++) adv[i] = dv.getUint16(T.hmtx.off + 4 * Math.min(i, nhm - 1));
    let cap = asc * 0.7, ital = 0, fsType = 0; if(T['OS/2']){ const o = T['OS/2'].off, v = dv.getUint16(o); fsType = dv.getUint16(o + 8); if(v >= 2 && T['OS/2'].len >= 90) cap = dv.getInt16(o + 88) || cap; }
    if(T.post) ital = dv.getInt32(T.post.off + 4) / 65536;
    // tên PostScript (name ID 6)
    let ps = ''; if(T.name){ const o = T.name.off, n = dv.getUint16(o + 2), so = o + dv.getUint16(o + 4);
      for(let i = 0; i < n && !ps; i++){ const r = o + 6 + 12 * i, pid = dv.getUint16(r), id = dv.getUint16(r + 6), L = dv.getUint16(r + 8), so2 = so + dv.getUint16(r + 10); if(id !== 6) continue;
        let s = ''; if(pid === 3 || pid === 0){ for(let k = 0; k + 1 < L; k += 2) s += String.fromCharCode(dv.getUint16(so2 + k)); } else for(let k = 0; k < L; k++) s += String.fromCharCode(dv.getUint8(so2 + k)); ps = s; } }
    ps = (ps || 'Font').replace(/[^\x21-\x7e]|[()<>\[\]{}\/%#]/g, '') || 'Font';
    // cmap: (3,10) dạng 12, (3,1) / (0,x) dạng 4
    const c = T.cmap.off, nc = dv.getUint16(c + 2); let s12 = -1, s4 = -1;
    for(let i = 0; i < nc; i++){ const r = c + 4 + 8 * i, pid = dv.getUint16(r), eid = dv.getUint16(r + 2), so = c + dv.getUint32(r + 4), fm = dv.getUint16(so);
      if(fm === 12 && (pid === 3 || pid === 0) && s12 < 0) s12 = so; if(fm === 4 && ((pid === 3 && (eid === 1 || eid === 0)) || pid === 0) && s4 < 0) s4 = so; }
    const memo = new Map();
    const gid = cp => { let g = memo.get(cp); if(g != null) return g; g = 0;
      if(s12 >= 0){ const n = dv.getUint32(s12 + 12); let lo = 0, hi = n - 1; while(lo <= hi){ const m = (lo + hi) >> 1, o = s12 + 16 + 12 * m, a = dv.getUint32(o), b = dv.getUint32(o + 4); if(cp < a) hi = m - 1; else if(cp > b) lo = m + 1; else { g = dv.getUint32(o + 8) + cp - a; break; } } }
      else if(s4 >= 0 && cp <= 0xFFFF){ const sx2 = dv.getUint16(s4 + 6), seg = sx2 / 2, eo = s4 + 14, so = eo + sx2 + 2, dO = so + sx2, ro = dO + sx2;
        for(let i = 0; i < seg; i++){ const e = dv.getUint16(eo + 2 * i); if(cp > e) continue; const s = dv.getUint16(so + 2 * i); if(cp < s) break; const d = dv.getInt16(dO + 2 * i), r = dv.getUint16(ro + 2 * i);
          if(!r) g = (cp + d) & 0xFFFF; else { const go = ro + 2 * i + r + 2 * (cp - s); const v = dv.getUint16(go); g = v ? (v + d) & 0xFFFF : 0; } break; } }
      if(g >= ng) g = 0; memo.set(cp, g); return g; };
    return { u8, face: face | 0, upm, bbox, asc, desc, cap, ital, ps, adv, ng, gid, glyf: !!(T.glyf && T.loca), cff: !!T['CFF '], locFmt, T, dv, bold: !!(mac & 1), embeddable: (fsType & 0x0F) !== 2 };
  }
  // phông chỉ còn các glyph dùng tới (giữ nguyên số glyph → CID = GID)
  function subsetTTF(F, used){
    const { dv, T, u8 } = F; const loc = i => F.locFmt ? dv.getUint32(T.loca.off + 4 * i) : dv.getUint16(T.loca.off + 2 * i) * 2;
    const keep = new Set([0]); const stack = [...used];
    while(stack.length){ const g = stack.pop(); if(keep.has(g) || g >= F.ng) continue; keep.add(g); const a = loc(g), b = loc(g + 1); if(b - a < 10) continue; const o = T.glyf.off + a;
      if(dv.getInt16(o) < 0){ let p = o + 10, fl; do{ fl = dv.getUint16(p); stack.push(dv.getUint16(p + 2)); p += 4 + ((fl & 1) ? 4 : 2) + ((fl & 8) ? 2 : (fl & 0x40) ? 4 : (fl & 0x80) ? 8 : 0); } while(fl & 0x20); } }
    keep.add(0); let size = 0; const L = new Uint32Array(F.ng + 1);
    for(let g = 0; g < F.ng; g++){ L[g] = size; if(keep.has(g)){ const n = loc(g + 1) - loc(g); size += (n + 3) & ~3; } } L[F.ng] = size;
    const glyf = new Uint8Array(size); for(const g of keep){ const a = loc(g), n = loc(g + 1) - a; if(n > 0) glyf.set(u8.subarray(T.glyf.off + a, T.glyf.off + a + n), L[g]); }
    const loca = new Uint8Array(4 * (F.ng + 1)); const ldv = new DataView(loca.buffer); for(let i = 0; i <= F.ng; i++) ldv.setUint32(4 * i, L[i]);
    const tabs = { glyf, loca }; for(const t of ['head', 'hhea', 'maxp', 'hmtx', 'cvt ', 'fpgm', 'prep']) if(T[t]) tabs[t] = u8.slice(T[t].off, T[t].off + T[t].len);
    new DataView(tabs.head.buffer).setInt16(50, 1); new DataView(tabs.head.buffer).setUint32(8, 0);   // loca dạng dài, checkSumAdjustment = 0
    const tags = Object.keys(tabs).sort(), n = tags.length; let off = 12 + 16 * n; const dir = []; for(const t of tags){ dir.push([t, off, tabs[t].length]); off += (tabs[t].length + 3) & ~3; }
    const out = new Uint8Array(off), od = new DataView(out.buffer); od.setUint32(0, 0x00010000); od.setUint16(4, n); let es = 1, lg = 0; while(es * 2 <= n){ es *= 2; lg++; } od.setUint16(6, es * 16); od.setUint16(8, lg); od.setUint16(10, n * 16 - es * 16);
    dir.forEach(([t, o, len], i) => { const b = tabs[t]; out.set(b, o); let s = 0; for(let k = 0; k < len; k += 4) s = (s + ((b[k] << 24) | ((b[k + 1] || 0) << 16) | ((b[k + 2] || 0) << 8) | (b[k + 3] || 0))) >>> 0;
      const r = 12 + 16 * i; for(let k = 0; k < 4; k++) out[r + k] = t.charCodeAt(k); od.setUint32(r + 4, s); od.setUint32(r + 8, o); od.setUint32(r + 12, len); });
    return out;
  }

  /* ---------- nguồn phông: Electron (phông hệ thống), móc thử nghiệm, Local Font Access (nếu đã cấp quyền) ---------- */
  const FONT_CACHE = new Map();
  const famOf = f => { const m = /(?:^|\s)(\d+(?:\.\d+)?)px\s+(.+)$/.exec(String(f || '')); const fam = (m ? m[2] : 'Arial').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean); return { fams: fam, bold: /\bbold\b|\b[6-9]00\b/.test(f), italic: /\bitalic\b|\boblique\b/.test(f), px: m ? +m[1] : 10 }; };
  const GENERIC = /^(-apple-system|system-ui|sans-serif|serif|monospace|BlinkMacSystemFont|ui-sans-serif)$/i;
  // phông tiếng Việt cũ (TCVN3 / VNI): chữ đã giải mã sang Unicode nên không dùng các phông này (bảng mã khác) — thay bằng phông Unicode
  const LEGACY_VN = /^\.?vn|^vni[\s-]|tcvn|^vn[a-z]+h?$/i;
  const FALLBACK = ['Arial', 'Segoe UI', 'Liberation Sans', 'DejaVu Sans', 'Noto Sans', 'Helvetica', 'FreeSans'];
  async function fetchFont(fam, bold, italic){
    const key = fam.toLowerCase() + '|' + (bold ? 1 : 0) + (italic ? 1 : 0); if(FONT_CACHE.has(key)) return FONT_CACHE.get(key);
    const p = (async () => { let r = null;
      try{ if(A.pdfFontSource) r = await A.pdfFontSource(fam, bold, italic); }catch(_){}
      try{ if(!r && window.dvdDesktop && window.dvdDesktop.font) r = await window.dvdDesktop.font(fam, bold, italic); }catch(_){}
      try{ if(!r && window.queryLocalFonts && navigator.permissions){ const st = await navigator.permissions.query({ name: 'local-fonts' }); if(st.state === 'granted'){ const L = await window.queryLocalFonts(); const want = L.filter(f => f.family.toLowerCase() === fam.toLowerCase()); const sty = s => /bold/i.test(s) === !!bold && /italic|oblique/i.test(s) === !!italic; const f = want.find(x => sty(x.style)) || want[0]; if(f) r = { data: new Uint8Array(await (await f.blob()).arrayBuffer()), face: 0 }; } } }catch(_){}
      if(!r || !r.data) return null; const u8 = r.data instanceof Uint8Array ? r.data : new Uint8Array(r.data);
      try{ const F = parseFont(u8, r.face | 0); return F.glyf || F.cff ? F : null; }catch(_){ return null; } })();
    FONT_CACHE.set(key, p); return p;
  }
  // phông kèm theo (Liberation Sans / Serif, SIL OFL — cùng số đo với Arial / Times New Roman): dùng khi máy không cung cấp phông (bản trình duyệt)
  const BUNDLED = new Map();
  function bundled(serif, bold){ const n = 'Liberation' + (serif ? 'Serif' : 'Sans') + '-' + (bold ? 'Bold' : 'Regular'); if(!BUNDLED.has(n)) BUNDLED.set(n, fetch('./vendor/fonts/' + n + '.ttf').then(r => r.ok ? r.arrayBuffer() : null).then(b => { try{ return b ? parseFont(new Uint8Array(b), 0) : null; }catch(_){ return null; } }).catch(() => null)); return BUNDLED.get(n); }
  const SERIF = /times|serif|roman|georgia|garamond|cambria|book|minion|palatino|vntime|tinos/i;
  async function fontChain(spec){ const out = []; const seen = new Set();
    for(const f of spec.fams.filter(x => !GENERIC.test(x) && !/\.shx$/i.test(x) && !LEGACY_VN.test(x)).concat(FALLBACK)){ const k = f.toLowerCase(); if(seen.has(k)) continue; seen.add(k); const F = await fetchFont(f, spec.bold, spec.italic) || (spec.bold || spec.italic ? await fetchFont(f, false, false) : null); if(F && !out.includes(F)) out.push(F); if(out.length >= 3) break; }
    const B = await bundled(SERIF.test(spec.fams.find(x => !GENERIC.test(x)) || ''), spec.bold); if(B && !out.includes(B)) out.push(B);   // luôn có phông có đủ dấu tiếng Việt ở cuối chuỗi
    return out; }

  /* ==================================================================
     PdfCtx — ngữ cảnh vẽ giả lập canvas → nội dung trang PDF
     ================================================================== */
  let scratch = null; const sc = () => scratch || (scratch = document.createElement('canvas').getContext('2d'));
  const NAMED = { black: '#000000', white: '#ffffff', transparent: 'rgba(0,0,0,0)' };
  function color(v){
    if(v && v._pdfGrad) return v; let s = String(v == null ? '#000' : v).trim(); if(NAMED[s.toLowerCase()]) s = NAMED[s.toLowerCase()];
    let m = /^#([0-9a-f]{3,8})$/i.exec(s); if(!m){ const g = sc(); g.fillStyle = '#000'; g.fillStyle = s; s = g.fillStyle; m = /^#([0-9a-f]{6})$/i.exec(s); }
    if(m){ let h = m[1]; if(h.length <= 4) h = h.split('').map(c => c + c).join(''); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }; }
    const q = /rgba?\(([^)]+)\)/.exec(s); if(q){ const p = q[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return { r: (p[0] || 0) / 255, g: (p[1] || 0) / 255, b: (p[2] || 0) / 255, a: p.length > 3 ? p[3] : 1 }; }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  class Grad { constructor(kind, c){ this._pdfGrad = true; this.kind = kind; this.c = c; this.stops = []; } addColorStop(t, col){ this.stops.push([Math.min(1, Math.max(0, +t || 0)), color(col)]); this.stops.sort((a, b) => a[0] - b[0]); } }

  class PdfCtx {
    // w, h: kích thước theo đơn vị thiết bị (như canvas.width/height); f: điểm PDF trên 1 đơn vị thiết bị; flip: in lộn ngược
    constructor(w, h, f, opt){ opt = opt || {};
      this.canvas = { width: w, height: h, getContext: () => this, style: {} }; this.W = w; this.H = h; this.f = f; this.pw = w * f; this.ph = h * f;
      this.base = opt.flip ? [-f, 0, 0, f, this.pw, 0] : [f, 0, 0, -f, 0, this.ph];
      this.chunks = []; this.buf = ''; this.path = []; this.M = [1, 0, 0, 1, 0, 0]; this.stk = [];
      this.st = { fillStyle: color('#000'), strokeStyle: color('#000'), lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, globalAlpha: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', dash: [], lineDashOffset: 0 };
      this.ems = [{}]; this.gs = new Map(); this.shades = []; this.images = []; this.texts = 0; this.raw = { fillStyle: '#000', strokeStyle: '#000' };
      this.imgMax = opt.imgMax || 16e6; this.globalCompositeOperation = 'source-over'; this.shadowBlur = 0; this.shadowColor = 'transparent'; this.shadowOffsetX = 0; this.shadowOffsetY = 0; this.imageSmoothingEnabled = true; this.imageSmoothingQuality = 'high'; this.filter = 'none'; this.direction = 'ltr';
    }
    // bỏ lật trang (in lộn ngược): phần vẽ sau đó (dấu in) đứng thẳng như bản in ảnh
    unflip(){ this.base = [this.f, 0, 0, -this.f, 0, this.ph]; this.beginPath(); }
    _o(s){ this.buf += s; if(this.buf.length > 65536){ this.chunks.push(this.buf); this.buf = ''; } }
    get fillStyle(){ return this.raw.fillStyle; } set fillStyle(v){ this.raw.fillStyle = v; this.st.fillStyle = color(v); }
    get strokeStyle(){ return this.raw.strokeStyle; } set strokeStyle(v){ this.raw.strokeStyle = v; this.st.strokeStyle = color(v); }
    get lineWidth(){ return this.st.lineWidth; } set lineWidth(v){ if(v > 0 && isFinite(v)) this.st.lineWidth = +v; }
    get lineCap(){ return this.st.lineCap; } set lineCap(v){ this.st.lineCap = v; }
    get lineJoin(){ return this.st.lineJoin; } set lineJoin(v){ this.st.lineJoin = v; }
    get miterLimit(){ return this.st.miterLimit; } set miterLimit(v){ if(v > 0) this.st.miterLimit = +v; }
    get globalAlpha(){ return this.st.globalAlpha; } set globalAlpha(v){ if(v >= 0 && v <= 1) this.st.globalAlpha = +v; }
    get font(){ return this.st.font; } set font(v){ this.st.font = String(v); }
    get textAlign(){ return this.st.textAlign; } set textAlign(v){ this.st.textAlign = v; }
    get textBaseline(){ return this.st.textBaseline; } set textBaseline(v){ this.st.textBaseline = v; }
    get lineDashOffset(){ return this.st.lineDashOffset; } set lineDashOffset(v){ this.st.lineDashOffset = +v || 0; }
    setLineDash(a){ this.st.dash = (a || []).map(Number).filter(v => isFinite(v) && v >= 0); if(this.st.dash.length % 2) this.st.dash = this.st.dash.concat(this.st.dash); }
    getLineDash(){ return this.st.dash.slice(); }
    save(){ this.stk.push({ M: this.M.slice(), st: Object.assign({}, this.st, { dash: this.st.dash.slice() }), raw: Object.assign({}, this.raw) }); this.ems.push(Object.assign({}, this.ems[this.ems.length - 1])); this._o('q\n'); }
    restore(){ const s = this.stk.pop(); if(!s) return; this.M = s.M; this.st = s.st; this.raw = s.raw; this.ems.pop(); this._o('Q\n'); }
    // ma trận
    setTransform(a, b, c, d, e, f){ if(a && typeof a === 'object'){ const m = a; this.M = [m.a, m.b, m.c, m.d, m.e, m.f]; } else this.M = [a, b, c, d, e, f].map(Number); }
    resetTransform(){ this.M = [1, 0, 0, 1, 0, 0]; }
    transform(a, b, c, d, e, f){ this.M = mmul(this.M, [a, b, c, d, e, f]); }
    translate(x, y){ this.transform(1, 0, 0, 1, x, y); } scale(x, y){ this.transform(x, 0, 0, y, 0, 0); } rotate(t){ const c = Math.cos(t), s = Math.sin(t); this.transform(c, s, -s, c, 0, 0); }
    getTransform(){ const m = this.M; return new DOMMatrix([m[0], m[1], m[2], m[3], m[4], m[5]]); }
    // đường
    _p(x, y){ const q = ap(this.M, x, y); return ap(this.base, q[0], q[1]); }
    beginPath(){ this.path = []; this.cur = null; this.start = null; }
    moveTo(x, y){ const p = this._p(x, y); this.path.push(num(p[0]) + ' ' + num(p[1]) + ' m'); this.cur = [x, y]; this.start = [x, y]; this.curD = p; }
    lineTo(x, y){ if(!this.cur){ this.moveTo(x, y); return; } const p = this._p(x, y); this.path.push(num(p[0]) + ' ' + num(p[1]) + ' l'); this.cur = [x, y]; }
    closePath(){ if(this.path.length){ this.path.push('h'); if(this.start) this.cur = this.start.slice(); } }
    bezierCurveTo(a, b, c, d, x, y){ if(!this.cur) this.moveTo(a, b); const p1 = this._p(a, b), p2 = this._p(c, d), p3 = this._p(x, y); this.path.push([p1, p2, p3].map(p => num(p[0]) + ' ' + num(p[1])).join(' ') + ' c'); this.cur = [x, y]; }
    quadraticCurveTo(a, b, x, y){ if(!this.cur) this.moveTo(a, b); const [x0, y0] = this.cur; this.bezierCurveTo(x0 + 2 / 3 * (a - x0), y0 + 2 / 3 * (b - y0), x + 2 / 3 * (a - x), y + 2 / 3 * (b - y), x, y); }
    rect(x, y, w, h){ this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    roundRect(x, y, w, h){ this.rect(x, y, w, h); }
    ellipse(cx, cy, rx, ry, rot, a0, a1, ccw){
      const TAU = Math.PI * 2; let sw; if(!ccw){ sw = a1 - a0; if(sw >= TAU) sw = TAU; else { sw %= TAU; if(sw < 0) sw += TAU; } } else { sw = a0 - a1; if(sw >= TAU) sw = TAU; else { sw %= TAU; if(sw < 0) sw += TAU; } sw = -sw; }
      const cr = Math.cos(rot || 0), sr = Math.sin(rot || 0), P = t => { const x = rx * Math.cos(t), y = ry * Math.sin(t); return [cx + x * cr - y * sr, cy + x * sr + y * cr]; }, D = t => { const x = -rx * Math.sin(t), y = ry * Math.cos(t); return [x * cr - y * sr, x * sr + y * cr]; };
      const s0 = P(a0); if(this.cur) this.lineTo(s0[0], s0[1]); else this.moveTo(s0[0], s0[1]);
      const n = Math.max(1, Math.ceil(Math.abs(sw) / (Math.PI / 2) - 1e-9)), h = sw / n, k = 4 / 3 * Math.tan(h / 4);
      for(let i = 0; i < n; i++){ const t0 = a0 + i * h, t1 = t0 + h, p0 = P(t0), p1 = P(t1), d0 = D(t0), d1 = D(t1); this.bezierCurveTo(p0[0] + k * d0[0], p0[1] + k * d0[1], p1[0] - k * d1[0], p1[1] - k * d1[1], p1[0], p1[1]); }
    }
    arc(x, y, r, a0, a1, ccw){ this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
    arcTo(x1, y1, x2, y2, r){ if(!this.cur){ this.moveTo(x1, y1); return; } const [x0, y0] = this.cur; const v1 = [x0 - x1, y0 - y1], v2 = [x2 - x1, y2 - y1], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
      if(!(r > 0) || l1 < 1e-12 || l2 < 1e-12){ this.lineTo(x1, y1); return; } const cosA = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2), A2 = Math.acos(Math.max(-1, Math.min(1, cosA))) / 2; if(Math.abs(Math.sin(A2)) < 1e-9){ this.lineTo(x1, y1); return; }
      const t = r / Math.tan(A2), u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2], p1 = [x1 + u1[0] * t, y1 + u1[1] * t], p2 = [x1 + u2[0] * t, y1 + u2[1] * t];
      const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(...bis), dc = r / Math.sin(A2), c = [x1 + bis[0] / bl * dc, y1 + bis[1] / bl * dc];
      const s = Math.atan2(p1[1] - c[1], p1[0] - c[0]), e = Math.atan2(p2[1] - c[1], p2[0] - c[0]), cross = u1[0] * u2[1] - u1[1] * u2[0];
      this.lineTo(p1[0], p1[1]); this.ellipse(c[0], c[1], r, r, 0, s, e, cross > 0); }
    // trạng thái vẽ PDF (chỉ ghi khi đổi)
    _em(k, v, s){ const E = this.ems[this.ems.length - 1]; if(E[k] === v) return; E[k] = v; this._o(s + '\n'); }
    _alpha(k, a){ a = Math.round(Math.max(0, Math.min(1, a)) * 1000) / 1000; const key = k + a; let n = this.gs.get(key); if(!n){ n = 'G' + (this.gs.size + 1); this.gs.set(key, n); } this._em('gs' + k, a, '/' + n + ' gs'); }
    _sc(){ return Math.sqrt(Math.abs(this.M[0] * this.M[3] - this.M[1] * this.M[2])) * this.f; }
    _strokeState(){ const S = this.st, c = S.strokeStyle._pdfGrad ? (S.strokeStyle.stops[0] || [0, color('#000')])[1] : S.strokeStyle, k = this._sc();
      this._em('RG', c.r + ',' + c.g + ',' + c.b, num(c.r) + ' ' + num(c.g) + ' ' + num(c.b) + ' RG'); this._alpha('CA', c.a * S.globalAlpha);
      this._em('w', num(S.lineWidth * k), num(S.lineWidth * k) + ' w'); this._em('J', S.lineCap, ({ butt: 0, round: 1, square: 2 }[S.lineCap] || 0) + ' J'); this._em('j', S.lineJoin, ({ miter: 0, round: 1, bevel: 2 }[S.lineJoin] || 0) + ' j');
      this._em('M', S.miterLimit, num(S.miterLimit) + ' M'); const d = '[' + S.dash.map(v => num(v * k)).join(' ') + '] ' + num(S.lineDashOffset * k) + ' d'; this._em('d', d, d); }
    _fillState(c){ this._em('rg', c.r + ',' + c.g + ',' + c.b, num(c.r) + ' ' + num(c.g) + ' ' + num(c.b) + ' rg'); this._alpha('ca', c.a * this.st.globalAlpha); }
    stroke(){ if(!this.path.length) return; if(this.st.strokeStyle.a === 0 || this.st.globalAlpha === 0) return; this._strokeState(); this._o(this.path.join('\n') + '\nS\n'); }
    fill(rule){ if(!this.path.length) return; const ev = rule === 'evenodd'; const F = this.st.fillStyle;
      if(F._pdfGrad){ this._shade(F, ev); return; } if(F.a === 0 || this.st.globalAlpha === 0) return; this._fillState(F); this._o(this.path.join('\n') + '\n' + (ev ? 'f*' : 'f') + '\n'); }
    clip(rule){ if(!this.path.length) return; this._o(this.path.join('\n') + '\n' + (rule === 'evenodd' ? 'W*' : 'W') + ' n\n'); }
    fillRect(x, y, w, h){ const p = this.path, c = this.cur, s = this.start; this.beginPath(); this.rect(x, y, w, h); this.fill(); this.path = p; this.cur = c; this.start = s; }
    strokeRect(x, y, w, h){ const p = this.path, c = this.cur, s = this.start; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.path = p; this.cur = c; this.start = s; }
    clearRect(x, y, w, h){ const sv = this.raw.fillStyle, a = this.st.globalAlpha; this.fillStyle = '#ffffff'; this.st.globalAlpha = 1; this.fillRect(x, y, w, h); this.fillStyle = sv; this.st.globalAlpha = a; }   // giấy trắng
    createLinearGradient(x0, y0, x1, y1){ return new Grad('L', [x0, y0, x1, y1]); }
    createRadialGradient(x0, y0, r0, x1, y1, r1){ return new Grad('R', [x0, y0, r0, x1, y1, r1]); }
    createPattern(){ return '#808080'; }
    _shade(G, ev){ if(!G.stops.length) return; const id = 'Sh' + (this.shades.length + 1); this.shades.push({ id, G }); const m = mmul(this.base, this.M);
      this._o('q\n' + this.path.join('\n') + '\n' + (ev ? 'W*' : 'W') + ' n\n' + mstr(m) + ' cm\n'); this._alpha('ca', this.st.globalAlpha); this._o('/' + id + ' sh\nQ\n'); this.ems[this.ems.length - 1] = {}; }
    // chữ: ghi lại, nối phông lúc xuất (bất đồng bộ)
    measureText(t){ const g = sc(); g.font = this.st.font; return g.measureText(t); }
    fillText(text, x, y, maxW){ text = String(text == null ? '' : text); if(!text.trim() || this.st.fillStyle.a === 0) return;
      const g = sc(); g.font = this.st.font; g.textBaseline = this.st.textBaseline; g.textAlign = 'left'; const mt = g.measureText(text);
      let dy = 0; if(mt.alphabeticBaseline != null && this.st.textBaseline !== 'alphabetic') dy = -mt.alphabeticBaseline;   // khoảng từ đường canh (textBaseline) tới chân chữ
      else if(this.st.textBaseline !== 'alphabetic'){ const a = mt.fontBoundingBoxAscent || 0, d = mt.fontBoundingBoxDescent || 0; dy = this.st.textBaseline === 'top' || this.st.textBaseline === 'hanging' ? a : this.st.textBaseline === 'middle' ? (a - d) / 2 : this.st.textBaseline === 'bottom' || this.st.textBaseline === 'ideographic' ? -d : 0; }
      const F = this.st.fillStyle._pdfGrad ? (this.st.fillStyle.stops[0] || [0, color('#000')])[1] : this.st.fillStyle;
      const rec = { t: text.normalize('NFC'), x, y: y + dy, M: mmul(this.base, this.M), font: this.st.font, align: this.st.textAlign, cw: mt.width, maxW, col: F, a: F.a * this.st.globalAlpha };
      this.chunks.push(this.buf); this.buf = ''; this.chunks.push(rec); this.texts++; this.ems[this.ems.length - 1] = Object.assign({}, this.ems[this.ems.length - 1], { rg: null, gsca: null }); }
    strokeText(text, x, y){ const sv = this.raw.fillStyle; this.fillStyle = this.raw.strokeStyle; this.fillText(text, x, y); this.fillStyle = sv; }
    // ảnh: canvas / img / ImageBitmap → XObject (RGB nén + mặt nạ alpha)
    drawImage(img, a, b, c, d, e, f, g, h){ let sx = 0, sy = 0, sw = img.naturalWidth || img.videoWidth || img.width, sh = img.naturalHeight || img.videoHeight || img.height, dx, dy, dw, dh;
      if(arguments.length <= 3){ dx = a; dy = b; dw = sw; dh = sh; } else if(arguments.length <= 5){ dx = a; dy = b; dw = c; dh = d; } else { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
      if(!(sw > 0 && sh > 0 && dw && dh)) return;
      let px = null; try{ const k = Math.min(1, Math.sqrt((this.imgMax || 16e6) / (sw * sh))), W = Math.max(1, Math.round(sw * k)), H = Math.max(1, Math.round(sh * k)); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H); px = { W, H, data: cx.getImageData(0, 0, W, H).data }; }catch(_){ return; }   // ảnh khác nguồn (không đọc được điểm ảnh) → bỏ
      const id = 'Im' + (this.images.length + 1); this.images.push({ id, px }); const m = mmul(mmul(this.base, this.M), [dw, 0, 0, -dh, dx, dy + dh]);
      this._alpha('ca', this.st.globalAlpha); this._o('q\n' + mstr(m) + ' cm\n/' + id + ' Do\nQ\n'); }
    getImageData(x, y, w, h){ return new ImageData(Math.max(1, w | 0), Math.max(1, h | 0)); } putImageData(){} isPointInPath(){ return false; } isPointInStroke(){ return false; }
    createImageData(w, h){ return new ImageData(Math.max(1, w | 0), Math.max(1, h | 0)); }
  }

  /* ==================================================================
     Ghép tệp PDF: trang (mỗi trang một PdfCtx), phông nhúng, ảnh, gradient
     ================================================================== */
  async function buildPDF(pages, info){
    const objs = []; const add = parts => { objs.push(parts); return objs.length; };   // parts: chuỗi hoặc mảng [chuỗi | Uint8Array]
    const stream = async (dict, data, raw) => { let u8 = typeof data === 'string' ? enc.encode(data) : data; let fl = ''; if(!raw){ const z = await deflate(u8); if(z && z.length < u8.length){ u8 = z; fl = ' /Filter /FlateDecode'; } } return add(['<< ' + dict + fl + ' /Length ' + u8.length + ' >>\nstream\n', u8, '\nendstream']); };
    const catalog = add(''), pagesId = add(''); const kids = []; const fonts = new Map(); let fseq = 0, rasterTxt = 0;
    const fontRes = F => { let r = fonts.get(F); if(!r){ r = { name: 'F' + (++fseq), F, used: new Map() }; fonts.set(F, r); } return r; };
    for(const P of pages){ const ctx = P.ctx; if(ctx.buf) { ctx.chunks.push(ctx.buf); ctx.buf = ''; }
      // phông của các đoạn chữ (theo thứ tự ưu tiên; ký tự không có trong phông đầu thì lấy phông sau)
      const specs = new Map(); for(const c of ctx.chunks) if(typeof c !== 'string'){ const s = famOf(c.font); const k = s.fams.join(',') + '|' + s.bold + s.italic; if(!specs.has(k)) specs.set(k, fontChain(s)); c._k = k; }
      for(const [k, p] of specs) specs.set(k, await p);
      const pageFonts = new Set(); let body = '';
      for(const c of ctx.chunks){ if(typeof c === 'string'){ body += c; continue; }
        const chain = specs.get(c._k) || [], s = famOf(c.font), size = s.px; const cps = [...c.t];
        if(!chain.length || cps.some(ch => !chain.some(F => F.gid(ch.codePointAt(0)) || /\s/.test(ch)))){ body += await rasterText(c, P, s); rasterTxt++; continue; }   // không có phông: chữ thành ảnh nét mịn
        // chia đoạn theo phông có ký tự
        const runs = []; for(const ch of cps){ const cp = ch.codePointAt(0); let F = chain.find(x => x.gid(cp)) || chain[0]; const last = runs[runs.length - 1]; if(last && last.F === F) last.s.push(cp); else runs.push({ F, s: [cp] }); }
        const wOf = r => r.s.reduce((w, cp) => w + r.F.adv[r.F.gid(cp)] / r.F.upm, 0) * size; let tw = runs.reduce((w, r) => w + wOf(r), 0);
        let hz = 1; if(c.maxW > 0 && tw > c.maxW) hz = c.maxW / tw; tw *= hz;
        const al = c.align === 'center' ? -tw / 2 : c.align === 'right' || c.align === 'end' ? -tw : 0; let x = c.x + al;
        body += 'q\n'; const col = c.col; body += num(col.r) + ' ' + num(col.g) + ' ' + num(col.b) + ' rg\n'; if(c.a < 1){ const key = 'ca' + Math.round(c.a * 1000) / 1000; let n = ctx.gs.get(key); if(!n){ n = 'G' + (ctx.gs.size + 1); ctx.gs.set(key, n); } body += '/' + n + ' gs\n'; }
        body += 'BT\n'; for(const r of runs){ const R = fontRes(r.F); pageFonts.add(R); let hex = ''; for(const cp of r.s){ const g = r.F.gid(cp); R.used.set(g, R.used.get(g) || cp); hex += g.toString(16).padStart(4, '0'); }
          const m = mmul(c.M, [size * hz, 0, 0, -size, x, c.y]); body += '/' + R.name + ' 1 Tf\n' + mstr(m) + ' Tm\n<' + hex + '> Tj\n'; x += wOf(r) * hz; }
        body += 'ET\nQ\n'; }
      // tài nguyên trang
      const gsD = [...ctx.gs].map(([k, n]) => '/' + n + ' << /' + k.slice(0, 2) + ' ' + num(+k.slice(2)) + ' >>').join(' ');
      const imD = []; for(const im of ctx.images){ const { W, H, data } = im.px; const rgb = new Uint8Array(W * H * 3), al = new Uint8Array(W * H); let hasA = false;
        for(let i = 0, j = 0; i < W * H; i++, j += 4){ rgb[3 * i] = data[j]; rgb[3 * i + 1] = data[j + 1]; rgb[3 * i + 2] = data[j + 2]; al[i] = data[j + 3]; if(data[j + 3] < 255) hasA = true; }
        const sm = hasA ? await stream('/Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + H + ' /ColorSpace /DeviceGray /BitsPerComponent 8', al) : 0;
        const id = await stream('/Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + H + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' + (sm ? ' /SMask ' + sm + ' 0 R' : ''), rgb); imD.push('/' + im.id + ' ' + id + ' 0 R'); }
      const shD = []; for(const s of ctx.shades){ const G = s.G, st = G.stops.length > 1 ? G.stops : [G.stops[0], [1, G.stops[0][1]]]; const fn = (a, b) => '<< /FunctionType 2 /Domain [0 1] /C0 [' + [a.r, a.g, a.b].map(num).join(' ') + '] /C1 [' + [b.r, b.g, b.b].map(num).join(' ') + '] /N 1 >>';
        let F; if(st.length === 2) F = fn(st[0][1], st[1][1]); else { const fs = [], bd = [], en = []; for(let i = 0; i + 1 < st.length; i++){ fs.push(fn(st[i][1], st[i + 1][1])); if(i) bd.push(num(st[i][0])); en.push('0 1'); } F = '<< /FunctionType 3 /Domain [0 1] /Functions [' + fs.join(' ') + '] /Bounds [' + bd.join(' ') + '] /Encode [' + en.join(' ') + '] >>'; }
        const t0 = st[0][0], t1 = st[st.length - 1][0], c = G.c; let co; if(G.kind === 'L'){ const dx = c[2] - c[0], dy = c[3] - c[1]; co = [c[0] + dx * t0, c[1] + dy * t0, c[0] + dx * t1, c[1] + dy * t1]; } else co = c;
        const id = add('<< /ShadingType ' + (G.kind === 'L' ? 2 : 3) + ' /ColorSpace /DeviceRGB /Coords [' + co.map(num).join(' ') + '] /Function ' + F + ' /Extend [true true] >>'); shD.push('/' + s.id + ' ' + id + ' 0 R'); }
      const cont = await stream('', body); P.res = { gsD, imD, shD, pageFonts, cont };
      const pid = add(''); P.id = pid; kids.push(pid);
    }
    // phông nhúng
    let fi = 0; for(const R of fonts.values()){ const F = R.F, n = fi++, base = 'DVDA' + String.fromCharCode(65 + Math.floor(n / 26) % 26, 65 + n % 26) + '+' + F.ps;   // tiền tố 6 chữ hoa = phông đã cắt gọn
      let ff, sub = 'CIDFontType2'; if(F.glyf){ const S = subsetTTF(F, R.used.keys()); ff = await stream('/Length1 ' + S.length, S); } else { sub = 'CIDFontType0'; ff = await stream('/Subtype /OpenType', F.u8); }
      const s = 1000 / F.upm; const fd = add('<< /Type /FontDescriptor /FontName /' + base + ' /Flags ' + (32 + (F.ital ? 64 : 0)) + ' /FontBBox [' + F.bbox.map(v => num(v * s)).join(' ') + '] /ItalicAngle ' + num(F.ital) + ' /Ascent ' + num(F.asc * s) + ' /Descent ' + num(F.desc * s) + ' /CapHeight ' + num(F.cap * s) + ' /StemV ' + (F.bold ? 140 : 80) + ' /' + (F.glyf ? 'FontFile2' : 'FontFile3') + ' ' + ff + ' 0 R >>');
      const gids = [...R.used.keys()].sort((a, b) => a - b); const W = gids.map(g => g + ' [' + num(F.adv[g] * s) + ']').join(' ');
      const cid = add('<< /Type /Font /Subtype /' + sub + ' /BaseFont /' + base + ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ' + fd + ' 0 R /DW 1000 /W [' + W + ']' + (F.glyf ? ' /CIDToGIDMap /Identity' : '') + ' >>');
      const hx = v => v.toString(16).padStart(4, '0'), u16 = cp => cp > 0xFFFF ? hx(0xD800 + ((cp - 0x10000) >> 10)) + hx(0xDC00 + ((cp - 0x10000) & 0x3FF)) : hx(cp);
      const map = gids.map(g => '<' + hx(g) + '> <' + u16(R.used.get(g)) + '>'); let bf = ''; for(let i = 0; i < map.length; i += 100){ const part = map.slice(i, i + 100); bf += part.length + ' beginbfchar\n' + part.join('\n') + '\nendbfchar\n'; }
      const tu = await stream('', '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' + bf + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend');
      R.obj = add('<< /Type /Font /Subtype /Type0 /BaseFont /' + base + ' /Encoding /Identity-H /DescendantFonts [' + cid + ' 0 R] /ToUnicode ' + tu + ' 0 R >>'); }
    for(const P of pages){ const r = P.res, fd = [...r.pageFonts].map(R => '/' + R.name + ' ' + R.obj + ' 0 R').join(' ');
      objs[P.id - 1] = '<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + num(P.ctx.pw) + ' ' + num(P.ctx.ph) + '] /Contents ' + r.cont + ' 0 R /Resources << /ProcSet [/PDF /Text /ImageB /ImageC]' + (fd ? ' /Font << ' + fd + ' >>' : '') + (r.gsD ? ' /ExtGState << ' + r.gsD + ' >>' : '') + (r.imD.length ? ' /XObject << ' + r.imD.join(' ') + ' >>' : '') + (r.shD.length ? ' /Shading << ' + r.shD.join(' ') + ' >>' : '') + ' >> >>'; }
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
    objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    const pstr = s => '(' + [...String(s || '')].map(ch => { const c = ch.codePointAt(0); return c < 128 && !'()\\'.includes(ch) ? ch : '\\' + (c < 256 ? c.toString(8).padStart(3, '0') : '077'); }).join('') + ')';
    const utf16 = s => '<FEFF' + [...String(s || '')].map(ch => { const c = ch.codePointAt(0); const h = v => v.toString(16).padStart(4, '0'); return c > 0xFFFF ? h(0xD800 + ((c - 0x10000) >> 10)) + h(0xDC00 + ((c - 0x10000) & 0x3FF)) : h(c); }).join('') + '>';
    const d = new Date(), p2 = v => String(v).padStart(2, '0'); const infoId = add('<< /Producer ' + pstr('DVDCAD ' + ((info && info.version) || '')) + ' /Creator ' + pstr('DVDCAD - DWG To PDF') + (info && info.title ? ' /Title ' + utf16(info.title) : '') + ' /CreationDate (D:' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + ') >>');
    // ghi tệp
    const parts = [enc.encode('%PDF-1.7\n'), new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])]; let pos = parts[0].length + parts[1].length; const xref = [];
    objs.forEach((o, i) => { xref.push(pos); const L = [enc.encode((i + 1) + ' 0 obj\n')].concat((Array.isArray(o) ? o : [o]).map(x => typeof x === 'string' ? enc.encode(x) : x), [enc.encode('\nendobj\n')]); for(const u of L){ parts.push(u); pos += u.length; } });
    let xr = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + xref.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    xr += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + infoId + ' 0 R >>\nstartxref\n' + pos + '\n%%EOF\n'; parts.push(enc.encode(xr));
    const blob = new Blob(parts, { type: 'application/pdf' }); blob.dvdInfo = { fonts: [...fonts.values()].map(R => R.F.ps), rasterText: rasterTxt, pages: pages.length }; return blob;
  }
  // chữ không có phông nhúng (trình duyệt không đọc được phông máy): vẽ chữ thành ảnh độ phân giải cao, đặt đúng chỗ
  async function rasterText(c, P, s){ const ctx = P.ctx, g = sc(); g.font = c.font; const w = g.measureText(c.t).width, size = s.px; if(!(w > 0)) return '';
    const det = Math.sqrt(Math.abs(c.M[0] * c.M[3] - c.M[1] * c.M[2])), ptH = size * det, k = Math.max(4, Math.min(24, 600 / 72 * ptH / size));
    const cv = document.createElement('canvas'), pad = size * 0.4; cv.width = Math.ceil((w + 2 * pad) * k); cv.height = Math.ceil(size * 1.6 * k); if(cv.width * cv.height > 2.5e7) return '';
    const x = cv.getContext('2d'); x.scale(k, k); x.font = c.font; x.textBaseline = 'alphabetic'; x.fillStyle = 'rgb(' + [c.col.r, c.col.g, c.col.b].map(v => Math.round(v * 255)).join(',') + ')'; x.fillText(c.t, pad, size * 1.15);
    const al = c.align === 'center' ? -w / 2 : c.align === 'right' || c.align === 'end' ? -w : 0, X0 = c.x + al - pad, Y0 = c.y - size * 1.15, W = cv.width / k, H = cv.height / k;
    const id = 'Im' + (ctx.images.length + 1); const d = x.getImageData(0, 0, cv.width, cv.height); ctx.images.push({ id, px: { W: cv.width, H: cv.height, data: d.data } });
    return 'q\n' + mstr(mmul(c.M, [W, 0, 0, -H, X0, Y0 + H])) + ' cm\n/' + id + ' Do\nQ\n'; }

  /* ==================================================================
     SvgCtx — cùng giao diện PdfCtx, ghi ra SVG: in thẳng ra máy in bằng nét vector (trình duyệt / Windows in SVG thành nét, chữ là chữ)
     ================================================================== */
  const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rgb = c => 'rgb(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ')';
  class SvgCtx extends PdfCtx {
    constructor(w, h, opt){ super(w, h, 1, opt); this.base = opt && opt.flip ? [-1, 0, 0, -1, w, h] : [1, 0, 0, 1, 0, 0]; this.out = []; this.defs = []; this.grp = [0]; this.nid = 0;
      this.q = opt && opt.q || null; }   // q: máy in giảm màu (256 màu / đen trắng) — màu → bảng màu máy in, dither = mẫu chấm vector
    // màu vẽ (+ độ mờ): giảm màu thì trộn với giấy trắng rồi quy về bảng màu, không còn độ trong suốt (như máy vẽ)
    _pc(c, am){ const a = Math.max(0, Math.min(1, c.a * am)); if(!this.q) return [rgb(c), this._op(a)];
      return [this.q.paint(c.r * a + 1 - a, c.g * a + 1 - a, c.b * a + 1 - a, c, this.defs), null]; }
    unflip(){ this.base = [1, 0, 0, 1, 0, 0]; this.beginPath(); }
    _o(){}   // không dùng toán tử PDF
    _d(){ return this.path.map(t => { const q = t.split(' '), op = q.pop(); return op === 'm' ? 'M' + q.join(' ') : op === 'l' ? 'L' + q.join(' ') : op === 'c' ? 'C' + q.join(' ') : 'Z'; }).join(''); }
    save(){ this.stk.push({ M: this.M.slice(), st: Object.assign({}, this.st, { dash: this.st.dash.slice() }), raw: Object.assign({}, this.raw) }); this.grp.push(0); }
    restore(){ const s = this.stk.pop(); if(!s) return; this.M = s.M; this.st = s.st; this.raw = s.raw; const n = this.grp.pop() || 0; for(let i = 0; i < n; i++) this.out.push('</g>'); }
    _op(a){ a = Math.max(0, Math.min(1, a)); return a < 0.999 ? a : null; }
    stroke(){ if(!this.path.length) return; const S = this.st, c = S.strokeStyle._pdfGrad ? (S.strokeStyle.stops[0] || [0, color('#000')])[1] : S.strokeStyle; if(c.a === 0 || S.globalAlpha === 0) return; const k = this._sc(), o = this._op(c.a * S.globalAlpha);
      const [pc, o2] = this._pc(c, S.globalAlpha); this.out.push('<path d="' + this._d() + '" fill="none" stroke="' + pc + '" stroke-width="' + num(S.lineWidth * k) + '"' + (o2 != null ? ' stroke-opacity="' + num(o2) + '"' : '') + (S.lineCap !== 'butt' ? ' stroke-linecap="' + S.lineCap + '"' : '') + (S.lineJoin !== 'miter' ? ' stroke-linejoin="' + S.lineJoin + '"' : ' stroke-miterlimit="' + num(S.miterLimit) + '"') +
        (S.dash.length ? ' stroke-dasharray="' + S.dash.map(v => num(v * k)).join(' ') + '"' + (S.lineDashOffset ? ' stroke-dashoffset="' + num(S.lineDashOffset * k) + '"' : '') : '') + '/>'); }
    fill(rule){ if(!this.path.length) return; const F = this.st.fillStyle, ev = rule === 'evenodd';
      if(F._pdfGrad){ this._shade(F, ev); return; } if(F.a === 0 || this.st.globalAlpha === 0) return; const [pc, o] = this._pc(F, this.st.globalAlpha);
      this.out.push('<path d="' + this._d() + '" fill="' + pc + '"' + (o != null ? ' fill-opacity="' + num(o) + '"' : '') + (ev ? ' fill-rule="evenodd"' : '') + '/>'); }
    clip(rule){ if(!this.path.length) return; const id = 'c' + (++this.nid); this.defs.push('<clipPath id="' + id + '"><path d="' + this._d() + '"' + (rule === 'evenodd' ? ' clip-rule="evenodd"' : '') + '/></clipPath>'); this.out.push('<g clip-path="url(#' + id + ')">'); this.grp[this.grp.length - 1]++; }
    _shade(G, ev){ if(!G.stops.length) return; const id = 'g' + (++this.nid), m = mmul(this.base, this.M), c = G.c, q = this.q, st = G.stops.map(([t, k]) => '<stop offset="' + num(t) + '" stop-color="' + (q ? q.solid(k.r * k.a + 1 - k.a, k.g * k.a + 1 - k.a, k.b * k.a + 1 - k.a) : rgb(k)) + '"' + (k.a < 1 && !q ? ' stop-opacity="' + num(k.a) + '"' : '') + '/>').join('');
      this.defs.push(G.kind === 'L' ? '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + num(c[0]) + '" y1="' + num(c[1]) + '" x2="' + num(c[2]) + '" y2="' + num(c[3]) + '" gradientTransform="matrix(' + mstr(m) + ')">' + st + '</linearGradient>'
        : '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" fx="' + num(c[0]) + '" fy="' + num(c[1]) + '" cx="' + num(c[3]) + '" cy="' + num(c[4]) + '" r="' + num(c[5]) + '" gradientTransform="matrix(' + mstr(m) + ')">' + st + '</radialGradient>');
      const o = this.q ? null : this._op(this.st.globalAlpha); this.out.push('<path d="' + this._d() + '" fill="url(#' + id + ')"' + (o != null ? ' fill-opacity="' + num(o) + '"' : '') + (ev ? ' fill-rule="evenodd"' : '') + '/>'); }
    fillText(text, x, y){ text = String(text == null ? '' : text); if(!text.trim() || this.st.fillStyle.a === 0) return;
      const g = sc(); g.font = this.st.font; g.textBaseline = this.st.textBaseline; const mt = g.measureText(text); let dy = 0; if(mt.alphabeticBaseline != null && this.st.textBaseline !== 'alphabetic') dy = -mt.alphabeticBaseline;
      const F = this.st.fillStyle._pdfGrad ? (this.st.fillStyle.stops[0] || [0, color('#000')])[1] : this.st.fillStyle, s = famOf(this.st.font), o = this._op(F.a * this.st.globalAlpha), al = this.st.textAlign, m = mmul(this.base, this.M);
      const fam = s.fams.map(f => GENERIC.test(f) ? (/mono/i.test(f) ? 'monospace' : /^serif$/i.test(f) ? 'serif' : 'sans-serif') : "'" + f.replace(/'/g, '') + "'").filter((v, i, a) => a.indexOf(v) === i).join(',');
      this.out.push('<text xml:space="preserve" transform="matrix(' + mstr(m) + ')" x="' + num(x) + '" y="' + num(y + dy) + '" font-family="' + xe(fam) + '" font-size="' + num(s.px) + '"' + (s.bold ? ' font-weight="bold"' : '') + (s.italic ? ' font-style="italic"' : '') +
        (al === 'center' ? ' text-anchor="middle"' : al === 'right' || al === 'end' ? ' text-anchor="end"' : '') + ' fill="' + this._pc(F, this.st.globalAlpha)[0] + '"' + (this.q || o == null ? '' : ' fill-opacity="' + num(o) + '"') + '>' + xe(text.normalize('NFC')) + '</text>'); this.texts++; }
    drawImage(img, a, b, c, d, e, f, g, h){ let sx = 0, sy = 0, sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height, dx, dy, dw, dh;
      if(arguments.length <= 3){ dx = a; dy = b; dw = sw; dh = sh; } else if(arguments.length <= 5){ dx = a; dy = b; dw = c; dh = d; } else { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
      if(!(sw > 0 && sh > 0 && dw && dh)) return; let url = null; try{ const k = Math.min(1, Math.sqrt(this.imgMax / (sw * sh))), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(sw * k)); cv.height = Math.max(1, Math.round(sh * k)); cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height); if(this.q && this.q.image) this.q.image(cv, this.st.globalAlpha); url = cv.toDataURL('image/png'); }catch(_){ return; }
      const o = this._op(this.st.globalAlpha); this.out.push('<image transform="matrix(' + mstr(mmul(this.base, this.M)) + ')" x="' + num(dx) + '" y="' + num(dy) + '" width="' + num(dw) + '" height="' + num(dh) + '" preserveAspectRatio="none" href="' + url + '"' + (o != null ? ' opacity="' + num(o) + '"' : '') + '/>'); }
    // SVG hoàn chỉnh, kích thước theo mm của khổ giấy
    toSVG(Wmm, Hmm){ let close = ''; for(const n of this.grp) close += '</g>'.repeat(n);
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + num(Wmm) + 'mm" height="' + num(Hmm) + 'mm" viewBox="0 0 ' + num(this.W) + ' ' + num(this.H) + '"><defs>' + this.defs.join('') + '</defs>' + this.out.join('') + close + '</svg>'; }
  }
  A.SvgCtx = SvgCtx;

  A.PdfCtx = PdfCtx; A.pdfBuild = buildPDF; A.pdfParseFont = parseFont; A.pdfSubset = (F, used) => subsetTTF(F, used);
})();
