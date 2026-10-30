/* DVDCAD v6c — DWFx ePlot (XPS Compatible) như máy vẽ "DWFx ePlot (XPS Compatible).pc3" của AutoCAD
   XpsCtx: cùng giao diện PdfCtx / SvgCtx (giả lập CanvasRenderingContext2D), ghi lệnh vẽ thành trang XPS (FixedPage, XAML):
   đường / Bézier / tô / cắt / nét đứt / độ trong suốt / gradient → <Path>, ảnh → ImageBrush (PNG), chữ → <Glyphs> nhúng phông TrueType.
   dwfxBuild: gói OPC (ZIP) — phần XPS (FixedDocumentSequence → FixedDocument → FixedPage) để trình xem XPS mở được,
   cộng phần DWF (DWFDocumentSequence → manifest.xml → section ePlot: descriptor.xml + trang .fpage) như tệp DWFx của AutoCAD. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x25 || !A.SvgCtx) return; A._x25 = true;
  const enc = new TextEncoder();
  const num = v => { if(!isFinite(v)) return '0'; const s = (Math.abs(v) < 1e-6 ? 0 : v).toFixed(3); return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') || '0' : s; };
  const mmul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const mx = m => m.map(num).join(',');
  const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const h2 = v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0').toUpperCase();
  const argb = (c, a) => '#' + h2(a == null ? c.a : a) + h2(c.r) + h2(c.g) + h2(c.b);   // màu XPS #AARRGGBB
  const CAP = { butt: 'Flat', round: 'Round', square: 'Square' }, JOIN = { miter: 'Miter', round: 'Round', bevel: 'Bevel' };

  /* ==================================================================
     XpsCtx — trang XPS. Đơn vị XPS = 1/96 inch = px CSS: trang W × H px như SvgCtx.
     ================================================================== */
  class XpsCtx extends A.SvgCtx {
    constructor(w, h, opt){ super(w, h, Object.assign({}, opt, { q: null })); this.texts = 0; this.imgs = []; }
    // hình học XPS: F1 = tô nonzero (mặc định XPS là even-odd), toạ độ đã nhân ma trận (như PDF / SVG)
    _g(ev){ return (ev ? '' : 'F1 ') + this.path.map(t => { const q = t.split(' '), op = q.pop(); if(op === 'h') return 'Z'; const P = []; for(let i = 0; i + 1 < q.length; i += 2) P.push(q[i] + ',' + q[i + 1]); return (op === 'm' ? 'M' : op === 'l' ? 'L' : 'C') + P.join(' '); }).join(' '); }
    save(){ super.save(); }
    restore(){ const s = this.stk.pop(); if(!s) return; this.M = s.M; this.st = s.st; this.raw = s.raw; const n = this.grp.pop() || 0; for(let i = 0; i < n; i++) this.out.push('</Canvas>'); }
    stroke(){ if(!this.path.length) return; const S = this.st, c = S.strokeStyle._pdfGrad ? (S.strokeStyle.stops[0] || [0, A.pdfColor('#000')])[1] : S.strokeStyle; const a = c.a * S.globalAlpha; if(!(a > 0)) return;
      const k = this._sc(), w = Math.max(1e-3, S.lineWidth * k);
      this.out.push('<Path Data="' + this._g(true) + '" Stroke="' + argb(c, a) + '" StrokeThickness="' + num(w) + '" StrokeStartLineCap="' + CAP[S.lineCap] + '" StrokeEndLineCap="' + CAP[S.lineCap] + '" StrokeDashCap="' + CAP[S.lineCap] + '" StrokeLineJoin="' + JOIN[S.lineJoin] + '"' +
        (S.lineJoin === 'miter' ? ' StrokeMiterLimit="' + num(Math.max(1, S.miterLimit)) + '"' : '') + (S.dash.length ? ' StrokeDashArray="' + S.dash.map(v => num(v * k / w)).join(' ') + '"' + (S.lineDashOffset ? ' StrokeDashOffset="' + num(S.lineDashOffset * k / w) + '"' : '') : '') + '/>'); }   // nét đứt XPS tính theo bội số bề dày nét
    fill(rule){ if(!this.path.length) return; const F = this.st.fillStyle, ev = rule === 'evenodd';
      if(F._pdfGrad){ this._shade(F, ev); return; } const a = F.a * this.st.globalAlpha; if(!(a > 0)) return;
      this.out.push('<Path Data="' + this._g(ev) + '" Fill="' + argb(F, a) + '"/>'); }
    clip(rule){ if(!this.path.length) return; this.out.push('<Canvas Clip="' + this._g(rule === 'evenodd') + '">'); this.grp[this.grp.length - 1]++; }
    _shade(G, ev){ if(!G.stops.length) return; const m = mmul(this.base, this.M), c = G.c, ga = this.st.globalAlpha, st = G.stops.length > 1 ? G.stops : [G.stops[0], [1, G.stops[0][1]]];
      const stops = '<GradientStop Color="' + st.map(([t, k]) => argb(k, k.a * ga) + '" Offset="' + num(t)).join('"/><GradientStop Color="') + '"/>';
      const br = G.kind === 'L' ? '<LinearGradientBrush MappingMode="Absolute" StartPoint="' + num(c[0]) + ',' + num(c[1]) + '" EndPoint="' + num(c[2]) + ',' + num(c[3]) + '" SpreadMethod="Pad" Transform="' + mx(m) + '"><LinearGradientBrush.GradientStops>' + stops + '</LinearGradientBrush.GradientStops></LinearGradientBrush>'
        : '<RadialGradientBrush MappingMode="Absolute" GradientOrigin="' + num(c[0]) + ',' + num(c[1]) + '" Center="' + num(c[3]) + ',' + num(c[4]) + '" RadiusX="' + num(c[5]) + '" RadiusY="' + num(c[5]) + '" SpreadMethod="Pad" Transform="' + mx(m) + '"><RadialGradientBrush.GradientStops>' + stops + '</RadialGradientBrush.GradientStops></RadialGradientBrush>';
      this.out.push('<Path Data="' + this._g(ev) + '"><Path.Fill>' + br + '</Path.Fill></Path>'); }
    // chữ: ghi lại, nối phông lúc đóng gói (bất đồng bộ)
    fillText(text, x, y, maxW){ text = String(text == null ? '' : text); if(!text.trim() || this.st.fillStyle.a === 0) return;
      const g = document.createElement('canvas').getContext('2d'); g.font = this.st.font; g.textBaseline = this.st.textBaseline; const mt = g.measureText(text);
      let dy = 0; if(mt.alphabeticBaseline != null && this.st.textBaseline !== 'alphabetic') dy = -mt.alphabeticBaseline;
      const F = this.st.fillStyle._pdfGrad ? (this.st.fillStyle.stops[0] || [0, A.pdfColor('#000')])[1] : this.st.fillStyle;
      this.out.push({ t: text.normalize('NFC'), x, y: y + dy, M: mmul(this.base, this.M), font: this.st.font, align: this.st.textAlign, maxW, col: F, a: F.a * this.st.globalAlpha, cw: mt.width }); this.texts++; }
    strokeText(text, x, y){ const sv = this.raw.fillStyle; this.fillStyle = this.raw.strokeStyle; this.fillText(text, x, y); this.fillStyle = sv; }
    // ảnh → phần PNG riêng, tô bằng ImageBrush lên hình chữ nhật đích
    drawImage(img, a, b, c, d, e, f, g, h){ let sx = 0, sy = 0, sw = img.naturalWidth || img.videoWidth || img.width, sh = img.naturalHeight || img.videoHeight || img.height, dx, dy, dw, dh;
      if(arguments.length <= 3){ dx = a; dy = b; dw = sw; dh = sh; } else if(arguments.length <= 5){ dx = a; dy = b; dw = c; dh = d; } else { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
      if(!(sw > 0 && sh > 0 && dw && dh)) return; let cv; try{ const k = Math.min(1, Math.sqrt(this.imgMax / (sw * sh))); cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(sw * k)); cv.height = Math.max(1, Math.round(sh * k)); cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height); }catch(_){ return; }
      const id = this.imgs.length; this.imgs.push(cv); const o = this.st.globalAlpha;
      this.out.push('<Path RenderTransform="' + mx(mmul(this.base, this.M)) + '" Data="M' + num(dx) + ',' + num(dy) + ' L' + num(dx + dw) + ',' + num(dy) + ' ' + num(dx + dw) + ',' + num(dy + dh) + ' ' + num(dx) + ',' + num(dy + dh) + ' Z"' + (o < 0.999 ? ' Opacity="' + num(o) + '"' : '') +
        '><Path.Fill><ImageBrush ImageSource="{IMG' + id + '}" Viewbox="0,0,' + cv.width + ',' + cv.height + '" ViewboxUnits="Absolute" Viewport="' + num(dx) + ',' + num(dy) + ',' + num(dw) + ',' + num(dh) + '" ViewportUnits="Absolute" TileMode="None"/></Path.Fill></Path>'); }
  }
  A.XpsCtx = XpsCtx;

  /* ---------- ZIP (nén deflate nếu trình duyệt có CompressionStream) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for(let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function deflateRaw(u8){ try{ if(typeof CompressionStream === 'undefined') return null; const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); }catch(_){ return null; } }
  async function zip(files, prefix){
    const parts = prefix ? [prefix] : [], cds = []; let off = prefix ? prefix.length : 0; const d = new Date();
    const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    for(const f of files){ const nm = enc.encode(f.name), raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(raw); let data = raw, meth = 0;
      if(f.z !== false && raw.length > 64){ const z = await deflateRaw(raw); if(z && z.length < raw.length){ data = z; meth = 8; } }
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, meth, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, raw.length, true); h.setUint16(26, nm.length, true);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, meth, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, raw.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      parts.push(new Uint8Array(h.buffer), nm, data); cds.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length; }
    const cdSize = cds.reduce((s, u) => s + u.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return parts.concat(cds, [new Uint8Array(e.buffer)]);
  }
  A.zipParts = zip;

  const guid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const x = [...b].map(v => v.toString(16).padStart(2, '0')).join(''); return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20); };
  const pngOf = cv => new Promise(r => cv.toBlob(b => b ? b.arrayBuffer().then(x => r(new Uint8Array(x))) : r(null), 'image/png'));
  const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const NS_XPS = 'http://schemas.microsoft.com/xps/2005/06', NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const REL_FIXED = 'http://schemas.microsoft.com/xps/2005/06/fixedrepresentation', REL_RES = 'http://schemas.microsoft.com/xps/2005/06/required-resource';
  const REL_CORE = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', REL_DWFSEQ = 'http://schemas.autodesk.com/dwfx/2007/relationships/documentsequence';
  const rels = L => XML + '<Relationships xmlns="' + NS_REL + '">' + L.map(([id, type, t]) => '<Relationship Id="' + id + '" Type="' + type + '" Target="' + xe(t) + '"/>').join('') + '</Relationships>';

  // chữ của một trang → <Glyphs> (phông nhúng: chỉ các glyph dùng tới, giữ các bảng khác để phông nạp được như phông thường)
  async function glyphsOf(rec, fonts, P){
    const s = A.pdfFamOf(rec.font), chain = await A.pdfFontChain(s), size = s.px; const cps = [...rec.t];
    if(!chain.length || cps.some(ch => !chain.some(F => F.gid(ch.codePointAt(0)) || /\s/.test(ch)))){ P.raster++; return rasterGlyphs(rec, P, s); }
    const runs = []; for(const ch of cps){ const cp = ch.codePointAt(0); const F = chain.find(x => x.gid(cp)) || chain[0], last = runs[runs.length - 1]; if(last && last.F === F) last.s.push(cp); else runs.push({ F, s: [cp] }); }
    const wOf = r => r.s.reduce((w, cp) => w + r.F.adv[r.F.gid(cp)] / r.F.upm, 0) * size; let tw = runs.reduce((w, r) => w + wOf(r), 0);
    let hz = 1; if(rec.maxW > 0 && tw > rec.maxW) hz = rec.maxW / tw; tw *= hz;
    let x = rec.x + (rec.align === 'center' ? -tw / 2 : rec.align === 'right' || rec.align === 'end' ? -tw : 0); let out = '';
    for(const r of runs){ let R = fonts.get(r.F); if(!R){ R = { F: r.F, used: new Set(), name: '/Resources/' + guid().toUpperCase() + '.ttf' }; fonts.set(r.F, R); } P.fonts.add(R);
      const us = r.s.map(cp => String.fromCodePoint(cp)).join(''), idx = r.s.map(cp => { const g = r.F.gid(cp); R.used.add(g); return (cp > 0xFFFF ? '(2:1)' : '') + g + ',' + num(r.F.adv[g] / r.F.upm * 100); }).join(';');
      const sim = s.bold && !r.F.bold ? (s.italic && !r.F.ital ? 'BoldItalicSimulation' : 'BoldSimulation') : s.italic && !r.F.ital ? 'ItalicSimulation' : '';
      out += '<Glyphs RenderTransform="' + mx(mmul(rec.M, [hz, 0, 0, 1, x, rec.y])) + '" OriginX="0" OriginY="0" FontRenderingEmSize="' + num(size) + '" FontUri="' + R.name + '" UnicodeString="' + (us[0] === '{' ? '{}' : '') + xe(us) + '" Indices="' + idx + '"' + (sim ? ' StyleSimulations="' + sim + '"' : '') + ' Fill="' + argb(rec.col, rec.a) + '"/>';
      x += wOf(r); }
    return out; }
  // chữ không có phông nào đủ ký tự: ảnh chữ độ phân giải cao, đặt đúng chỗ
  function rasterGlyphs(rec, P, s){ const g = document.createElement('canvas').getContext('2d'); g.font = rec.font; const w = g.measureText(rec.t).width, size = s.px; if(!(w > 0)) return '';
    const det = Math.sqrt(Math.abs(rec.M[0] * rec.M[3] - rec.M[1] * rec.M[2])), k = Math.max(4, Math.min(24, 600 / 96 * det)), pad = size * 0.4, cv = document.createElement('canvas');
    cv.width = Math.ceil((w + 2 * pad) * k); cv.height = Math.ceil(size * 1.6 * k); if(cv.width * cv.height > 2.5e7) return '';
    const x = cv.getContext('2d'); x.scale(k, k); x.font = rec.font; x.fillStyle = 'rgb(' + [rec.col.r, rec.col.g, rec.col.b].map(v => Math.round(v * 255)).join(',') + ')'; x.fillText(rec.t, pad, size * 1.15);
    const al = rec.align === 'center' ? -w / 2 : rec.align === 'right' || rec.align === 'end' ? -w : 0, X0 = rec.x + al - pad, Y0 = rec.y - size * 1.15, W = cv.width / k, H = cv.height / k, id = P.ctx.imgs.length; P.ctx.imgs.push(cv);
    return '<Path RenderTransform="' + mx(rec.M) + '" Data="M' + num(X0) + ',' + num(Y0) + ' L' + num(X0 + W) + ',' + num(Y0) + ' ' + num(X0 + W) + ',' + num(Y0 + H) + ' ' + num(X0) + ',' + num(Y0 + H) + ' Z"><Path.Fill><ImageBrush ImageSource="{IMG' + id + '}" Viewbox="0,0,' + cv.width + ',' + cv.height + '" ViewboxUnits="Absolute" Viewport="' + num(X0) + ',' + num(Y0) + ',' + num(W) + ',' + num(H) + '" ViewportUnits="Absolute" TileMode="None"/></Path.Fill></Path>'; }

  /* ==================================================================
     Gói DWFx: pages = [{ ctx: XpsCtx, Wmm, Hmm, title }]
     ================================================================== */
  async function dwfxBuild(pages, info){ info = info || {};
    const files = [], fonts = new Map(), docId = guid(), base = 'dwf/documents/' + docId, title = info.title || 'DVDCAD'; const pageMeta = [];
    for(let i = 0; i < pages.length; i++){ const P = pages[i], ctx = P.ctx, sid = 'com.autodesk.dwf.ePlot_' + guid(), dir = base + '/sections/' + sid, pid = guid().toUpperCase();
      const S = { ctx, fonts: new Set(), raster: 0 }; let body = ''; for(const o of ctx.out) body += typeof o === 'string' ? o : await glyphsOf(o, fonts, S);
      for(const n of ctx.grp) body += '</Canvas>'.repeat(n);
      const imgRel = []; for(let k = 0; k < ctx.imgs.length; k++){ const png = await pngOf(ctx.imgs[k]); const nm = '/' + dir + '/' + guid().toUpperCase() + '.png'; if(png) files.push({ name: nm.slice(1), data: png, z: false }); imgRel.push(nm); body = body.split('{IMG' + k + '}').join(nm); }
      const W = ctx.W, H = ctx.H, fpage = dir + '/' + pid + '.fpage';
      // trang giấy trắng + nội dung (toạ độ 1/96 inch, gốc trên trái như màn hình)
      files.push({ name: fpage, data: XML + '<FixedPage xmlns="' + NS_XPS + '" xmlns:x="http://schemas.microsoft.com/xps/2005/06/resourcedictionary-key" xml:lang="vi-VN" Width="' + num(W) + '" Height="' + num(H) + '"><Path Data="M0,0 L' + num(W) + ',0 ' + num(W) + ',' + num(H) + ' 0,' + num(H) + ' Z" Fill="#FFFFFFFF"/><Canvas>' + body + '</Canvas></FixedPage>' });
      files.push({ name: dir + '/_rels/' + pid + '.fpage.rels', data: rels([...[...S.fonts].map((R, j) => ['F' + j, REL_RES, R.name]), ...imgRel.map((nm, j) => ['I' + j, REL_RES, nm])]) });
      // phần DWF: mô tả trang ePlot (khổ giấy mm) — trình xem DWF tìm trang qua manifest
      files.push({ name: dir + '/descriptor.xml', data: XML + '<ePlot:Page version="1.2" xmlns:ePlot="DWF-ePlot:1.2" objectId="' + guid() + '" name="' + xe(P.title || 'Model') + '" plotOrder="' + (i + 1) + '" color="255 255 255"><ePlot:Paper units="mm" width="' + num(P.Wmm) + '" height="' + num(P.Hmm) + '" color="255 255 255" clip="0 0 ' + num(P.Wmm) + ' ' + num(P.Hmm) + '"/>' +
        '<ePlot:Resources><ePlot:GraphicResource role="2d streaming graphics" mime="application/vnd.ms-package.xps-fixedpage+xml" href="/' + fpage + '" objectId="' + guid() + '" zOrder="1" transform="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1" extents="[0 0][' + num(W) + ' ' + num(H) + ']" clip="0 0 ' + num(W) + ' 0 ' + num(W) + ' ' + num(H) + ' 0 ' + num(H) + '"/></ePlot:Resources></ePlot:Page>' });
      pageMeta.push({ sid, dir, fpage, title: P.title || 'Model', W, H, raster: S.raster }); }
    // phông nhúng (TrueType: cắt gọn glyph, giữ bảng; CFF: nguyên phông)
    for(const R of fonts.values()) files.push({ name: R.name.slice(1), data: R.F.glyf ? A.pdfSubset(R.F, R.used, true) : R.F.u8 });
    // XPS: FixedDocumentSequence → FixedDocument → các trang
    files.push({ name: 'FixedDocumentSequence.fdseq', data: XML + '<FixedDocumentSequence xmlns="' + NS_XPS + '"><DocumentReference Source="/' + base + '/FixedDocument.fdoc"/></FixedDocumentSequence>' });
    files.push({ name: base + '/FixedDocument.fdoc', data: XML + '<FixedDocument xmlns="' + NS_XPS + '">' + pageMeta.map(p => '<PageContent Source="/' + p.fpage + '" Width="' + num(p.W) + '" Height="' + num(p.H) + '"/>').join('') + '</FixedDocument>' });
    // DWF: DWFDocumentSequence → manifest.xml (mỗi trang một section ePlot)
    files.push({ name: 'DWFDocumentSequence.dwfseq', data: XML + '<DWFDocumentSequence xmlns="http://schemas.autodesk.com/dwfx/2007/documentsequence"><ManifestReference Source="/' + base + '/manifest.xml"/></DWFDocumentSequence>' });
    files.push({ name: base + '/manifest.xml', data: XML + '<dwf:Manifest dwf:version="6.0" xmlns:dwf="DWF-Manifest:6.0" objectId="' + docId + '"><dwf:Interfaces><dwf:Interface name="ePlot" objectId="' + guid() + '" href="http://www.autodesk.com/viewers"/></dwf:Interfaces>' +
      '<dwf:Properties><dwf:Property name="SourceProductName" value="DVDCAD"/><dwf:Property name="SourceProductVersion" value="' + xe(A.version || '') + '"/></dwf:Properties><dwf:Sections>' +
      pageMeta.map((p, i) => '<dwf:Section type="com.autodesk.dwf.ePlot" title="' + xe(p.title) + '" objectId="' + guid() + '" name="' + p.sid + '"><dwf:Resources><dwf:Resource role="descriptor" mime="text/xml" href="/' + p.dir + '/descriptor.xml"/><dwf:GraphicResource role="2d streaming graphics" mime="application/vnd.ms-package.xps-fixedpage+xml" href="/' + p.fpage + '" title="' + xe(p.title) + '" zOrder="' + (i + 1) + '"/></dwf:Resources></dwf:Section>').join('') + '</dwf:Sections></dwf:Manifest>' });
    files.push({ name: base + '/_rels/manifest.xml.rels', data: rels(pageMeta.map((p, i) => ['D' + i, 'http://schemas.autodesk.com/dwfx/2007/relationships/requiredresource', '/' + p.dir + '/descriptor.xml'])) });
    const d = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    files.push({ name: 'docProps/core.xml', data: XML + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + xe(title) + '</dc:title><dc:creator>DVDCAD</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + d + '</dcterms:created></cp:coreProperties>' });
    files.push({ name: '_rels/.rels', data: rels([['R0', REL_FIXED, '/FixedDocumentSequence.fdseq'], ['R1', REL_DWFSEQ, '/DWFDocumentSequence.dwfseq'], ['R2', REL_CORE, '/docProps/core.xml']]) });
    const ct = XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="text/xml"/>' +
      '<Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/><Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>' +
      '<Default Extension="ttf" ContentType="application/vnd.ms-opentype"/><Default Extension="png" ContentType="image/png"/><Default Extension="dwfseq" ContentType="application/vnd.adsk-package.dwfx-dwfdocumentsequence+xml"/>' +
      '<Override PartName="/' + base + '/manifest.xml" ContentType="application/vnd.adsk-package.dwfx-manifest+xml"/>' + pageMeta.map(p => '<Override PartName="/' + p.dir + '/descriptor.xml" ContentType="application/vnd.adsk-package.dwfx-section+xml"/>').join('') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
    files.unshift({ name: '[Content_Types].xml', data: ct });
    const blob = new Blob(await zip(files), { type: 'model/vnd.dwfx+xps' }); blob.dvdInfo = { pages: pages.length, fonts: [...fonts.values()].map(R => R.F.ps), rasterText: pageMeta.reduce((s, p) => s + p.raster, 0) }; return blob; }
  A.dwfxBuild = dwfxBuild;
})();
