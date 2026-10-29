/* DVDCAD v5v — xuất / chuyển đổi như AutoCAD
   · PSOUT: xuất PostScript đóng gói (.eps) theo thiết lập PLOT (khổ giấy, vùng in, tỉ lệ, bảng kiểu in: màu / bề rộng / kiểu nét)
   · WMFOUT: xuất Windows Metafile (.wmf, dạng placeable) các đối tượng chọn — nét vectơ, vùng tô, màu, bề rộng
   · PUBLISHTOWEB: trang web (index.html + ảnh từng layout) đóng gói .zip
   · DWGCONVERT: đổi hàng loạt tệp DWG / DXF sang DWG 2018 / 2013 / 2010 / 2004 / 2000 hoặc DXF — chạy trong khung ẩn, không đụng bản vẽ đang mở
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x21 || !A.dialog || !A.acw || !window.DVDCmd) return; A._x21 = true;
  const K = A.acw;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const docBase = () => String((typeof currentName === 'string' && currentName) || 'Drawing').replace(/\.[^.]+$/, '');
  const save = async (blob, name, mime) => { try{ await shareOrDownload(blob, name, mime); }catch(_){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); } };
  // chạy bộ duyệt nét với kiểu màu in (giống máy vẽ): đen trắng / màu theo bảng kiểu in
  function walk(G, list, B, style){
    const sv = { plot: plotMode, st: _plotStyle }; plotMode = true; _plotStyle = style != null ? style : ((A.PS || {}).style === 'color' ? '' : ((A.PS || {}).style || 'mono'));
    try{ return A.vecWalk(G, list, B); } finally { plotMode = sv.plot; _plotStyle = sv.st; }
  }
  // tách nét đứt (mẫu theo mm giấy) thành các đoạn liền
  function dashed(Q, pat){
    if(!pat || !pat.length) return [Q]; const tot = pat.reduce((a, v) => a + Math.abs(v), 0); if(!(tot > 0.05)) return [Q];
    const out = []; let pi = 0, left = Math.abs(pat[0]) || 0.05, on = pat[0] >= 0, cur = on ? [Q[0]] : null;
    for(let i = 1; i < Q.length; i++){ let a = Q[i - 1]; const b = Q[i]; let L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while(L > 1e-9){ const d = Math.min(L, left), t = d / L, n = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if(on) cur.push(n); a = n; L -= d; left -= d;
        if(left <= 1e-9){ if(on && cur.length >= 2) out.push(cur); pi = (pi + 1) % pat.length; on = pat[pi] >= 0; left = Math.abs(pat[pi]) || 0.05; cur = on ? [a] : null; } } }
    if(on && cur && cur.length >= 2) out.push(cur); return out;
  }

  /* ==================================================================
     PSOUT — Encapsulated PostScript
     ================================================================== */
  function epsOut(){
    if(!A.plotGeom || !A.vecWalk) return null; const G = A.plotGeom(); const pt = 72 / 25.4, W = G.Wmm * pt, H = G.Hmm * pt;
    const X = x => (G.ox + (x - G.area.x0) * G.k) * pt, Y = y => (G.Hmm - G.oy - (G.area.y1 - y) * G.k) * pt; const f = v => (+v.toFixed(3)).toString();
    const out = ['%!PS-Adobe-3.0 EPSF-3.0', '%%Creator: DVDCAD (PSOUT)', '%%Title: ' + docBase(), '%%CreationDate: ' + new Date().toISOString(), '%%BoundingBox: 0 0 ' + Math.ceil(W) + ' ' + Math.ceil(H), '%%HiResBoundingBox: 0 0 ' + f(W) + ' ' + f(H), '%%LanguageLevel: 2', '%%Pages: 1', '%%EndComments',
      '%%BeginProlog', '/m {moveto} bind def /l {lineto} bind def /s {stroke} bind def', '%%EndProlog', '%%Page: 1 1', 'gsave 1 setlinecap 1 setlinejoin',
      'newpath ' + f(X(G.area.x0)) + ' ' + f(Y(G.area.y0)) + ' m ' + f(X(G.area.x1)) + ' ' + f(Y(G.area.y0)) + ' l ' + f(X(G.area.x1)) + ' ' + f(Y(G.area.y1)) + ' l ' + f(X(G.area.x0)) + ' ' + f(Y(G.area.y1)) + ' l closepath clip newpath'];
    let cur = '';
    const sel = (P, w, dash) => { const k = P.rgb.join(',') + '|' + w + '|' + (dash || ''); if(k === cur) return; cur = k; out.push(P.rgb.map(v => f(v / 255)).join(' ') + ' setrgbcolor ' + f(w) + ' setlinewidth [' + (dash || '') + '] 0 setdash'); };
    let nE = 0;
    nE = walk(G, entities, {
      stroke(pts, closed, P, dash){ if(pts.length < 2) return; const d = dash && dash.length ? dash.map(v => f(Math.max(0.05, Math.abs(v)) * pt)).join(' ') : ''; sel(P, Math.max(0.1, P.w * pt), d);
        const s = ['newpath ' + f(X(pts[0].x)) + ' ' + f(Y(pts[0].y)) + ' m']; for(let i = 1; i < pts.length; i++) s.push(f(X(pts[i].x)) + ' ' + f(Y(pts[i].y)) + ' l'); if(closed) s.push('closepath'); s.push('s'); out.push(s.join(' ')); },
      fill(loops, P){ const L = loops.filter(l => l && l.length >= 3); if(!L.length) return; sel(P, 0.1, ''); const s = ['newpath']; for(const l of L){ s.push(f(X(l[0].x)) + ' ' + f(Y(l[0].y)) + ' m'); for(let i = 1; i < l.length; i++) s.push(f(X(l[i].x)) + ' ' + f(Y(l[i].y)) + ' l'); s.push('closepath'); } s.push('eofill'); out.push(s.join(' ')); }
    });
    out.push('grestore', 'showpage', '%%Trailer', '%%EOF');
    return { text: out.join('\n') + '\n', ents: nE, w: G.Wmm, h: G.Hmm };
  }
  A.epsOut = epsOut;
  plain(['PSOUT', 'EXPORTEPS'], 'Xuất PostScript đóng gói (.eps) theo thiết lập PLOT: khổ giấy, vùng in, tỉ lệ, màu / bề rộng / kiểu nét theo bảng kiểu in', async () => {
    if(!A.hasDoc || !A.hasDoc()){ say('Mở bản vẽ trước.'); return; } const r = epsOut(); if(!r){ say('Không tạo được tệp EPS.'); return; }
    const nm = docBase() + '.eps'; await save(new Blob([r.text], { type: 'application/postscript' }), nm, 'application/postscript');
    log('PSOUT: ' + nm + ' (' + r.ents + ' đối tượng, giấy ' + (+r.w.toFixed(1)) + ' × ' + (+r.h.toFixed(1)) + ' mm, theo thiết lập PLOT).');
  });

  /* ==================================================================
     WMFOUT — Windows Metafile (placeable), đơn vị 0,1 mm
     ================================================================== */
  function wmfOut(list, opt){
    opt = opt || {}; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of list){ let b = null; try{ b = entBBox(e); }catch(_){} if(!b) continue; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); }
    if(!isFinite(x0)) return null; const pad = Math.max(x1 - x0, y1 - y0, 1e-9) * 0.02; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const side = opt.mm || 200, k = side / Math.max(x1 - x0, y1 - y0); const Wmm = (x1 - x0) * k, Hmm = (y1 - y0) * k;
    const G = { k, ox: 0, oy: 0, Wmm, Hmm, area: { x0, y0, x1, y1 } }; const U = 10;   // 0,1 mm
    const X = x => Math.round((x - x0) * k * U), Y = y => Math.round((y1 - y) * k * U), Wd = Math.round(Wmm * U), Hd = Math.round(Hmm * U);
    if(Wd > 32000 || Hd > 32000) return null;
    const recs = []; let maxRec = 0;
    const rec = (fn, words) => { const n = 3 + words.length; maxRec = Math.max(maxRec, n); const b = new Int16Array(n + 1); const u = new Uint16Array(b.buffer); u[0] = n & 0xffff; u[1] = n >>> 16; u[2] = fn; for(let i = 0; i < words.length; i++) b[3 + i] = words[i]; recs.push(new Uint8Array(b.buffer, 0, n * 2)); };
    const cref = rgb => [rgb[0] | (rgb[1] << 8), rgb[2]];
    rec(0x020B, [0, 0]); rec(0x020C, [Hd, Wd]); rec(0x0102, [1]); rec(0x0106, [1]);
    const poly = (Q, P) => { const w = Math.max(1, Math.round(P.w * U)); rec(0x02FA, [0, w, 0].concat(cref(P.rgb))); rec(0x012D, [0]);
      for(let s = 0; s < Q.length - 1; s += 7999){ const part = Q.slice(s, s + 8000); if(part.length < 2) break; rec(0x0325, [part.length].concat(...part.map(q => [Math.round(q[0]), Math.round(q[1])]))); }
      rec(0x01F0, [0]); };
    const nE = walk(G, list, {
      stroke(pts, closed, P, dash){ if(pts.length < 2) return; const Q = pts.map(p => [(p.x - x0) * k, (y1 - p.y) * k]); if(closed) Q.push(Q[0]);
        const pat = dash && dash.length ? dash.map(v => (v >= 0 ? 1 : -1) * Math.max(0.05, Math.abs(v))) : null; for(const q of dashed(Q, pat)) poly(q.map(v => [v[0] * U, v[1] * U]), P); },
      fill(loops, P){ const L = loops.filter(l => l && l.length >= 3).map(l => l.map(p => [X(p.x), Y(p.y)])); if(!L.length) return; const n = L.reduce((a, l) => a + l.length, 0); if(n > 15000) return;
        rec(0x02FC, [0].concat(cref(P.rgb), [0])); rec(0x012D, [0]); rec(0x02FA, [5, 0, 0, 0, 0]); rec(0x012D, [1]);
        rec(0x0538, [L.length].concat(L.map(l => l.length), ...L.map(l => [].concat(...l)))); rec(0x01F0, [0]); rec(0x01F0, [1]); }
    }, opt.style != null ? opt.style : '');
    rec(0x0000, []);
    const body = recs.reduce((a, r) => a + r.length, 0), total = 18 + body;
    const ph = new DataView(new ArrayBuffer(22)); ph.setUint32(0, 0x9AC6CDD7, true); ph.setInt16(4, 0, true); ph.setInt16(6, 0, true); ph.setInt16(8, 0, true); ph.setInt16(10, Wd, true); ph.setInt16(12, Hd, true); ph.setUint16(14, 254, true); ph.setUint32(16, 0, true);
    let cs = 0; for(let i = 0; i < 10; i++) cs ^= ph.getUint16(i * 2, true); ph.setUint16(20, cs, true);
    const hd = new DataView(new ArrayBuffer(18)); hd.setUint16(0, 1, true); hd.setUint16(2, 9, true); hd.setUint16(4, 0x0300, true); hd.setUint32(6, total / 2, true); hd.setUint16(10, 2, true); hd.setUint32(12, maxRec, true); hd.setUint16(16, 0, true);
    const out = new Uint8Array(22 + total); out.set(new Uint8Array(ph.buffer), 0); out.set(new Uint8Array(hd.buffer), 22); let o = 40; for(const r of recs){ out.set(r, o); o += r.length; }
    return { data: out, ents: nE, w: Wmm, h: Hmm };
  }
  A.wmfOut = wmfOut;
  ecmd(['WMFOUT'], 'Xuất các đối tượng chọn ra Windows Metafile (.wmf): nét vectơ, vùng tô, màu, bề rộng nét', async () => {
    const s = await A.getSel('Chọn đối tượng hoặc <tất cả>', { pre: true }); let L = s.sel && s.sel.length ? s.sel : entities.filter(e => !(A.isHiddenE && A.isHiddenE(e)));
    L = L.filter(Boolean); if(!L.length){ log('Không có đối tượng để xuất.'); return; }
    const r = wmfOut(L); if(!r){ log('WMFOUT: không tạo được tệp (vùng quá lớn hoặc không có hình).'); return; }
    const nm = docBase() + '.wmf'; await save(new Blob([r.data], { type: 'image/wmf' }), nm, 'image/wmf'); log('WMFOUT: ' + nm + ' — ' + r.ents + ' đối tượng, ' + (+r.w.toFixed(1)) + ' × ' + (+r.h.toFixed(1)) + ' mm.');
  });

  /* ==================================================================
     PUBLISHTOWEB — trang web từ các layout (ảnh PNG / JPG + index.html), đóng gói .zip
     ================================================================== */
  plain(['PUBLISHTOWEB'], 'Xuất bản lên trang web: chọn layout, kiểu ảnh, độ phân giải → index.html + ảnh (.zip)', () => {
    if(!A.plotRender || !A.zipStore){ say('Chưa sẵn sàng.'); return; } if(A.busy && A.busy()) A.cancel(true);
    let all = (typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).map((l, i) => ({ i, name: l.isModel ? 'Model' : l.name, model: !!l.isModel })); const noLay = !all.length; if(noLay) all = [{ i: -1, name: 'Model', model: true }];
    const O = Object.assign({ fmt: 'png', dpi: 150, title: docBase(), desc: '', tpl: 'grid' }, lsGet('dvd:ptw', {})); O.title = docBase();
    const html = '<div class="acw" style="width:520px">' + K.grp('Trang web', K.row('Tiêu đề:', K.txt('pwT', O.title)) + K.row('Mô tả:', K.txt('pwD', O.desc)) + K.row('Mẫu trang:', K.sel('pwTp', [['grid', 'Lưới ảnh thu nhỏ'], ['list', 'Danh sách ảnh lớn']], O.tpl))) +
      K.grp('Ảnh', K.row('Kiểu ảnh:', K.sel('pwF', [['png', 'PNG'], ['jpg', 'JPEG']], O.fmt)) + K.row('Độ phân giải (dpi):', K.sel('pwR', [['96', '96 — nhỏ'], ['150', '150 — vừa'], ['200', '200 — lớn'], ['300', '300 — rất lớn']], String(O.dpi)))) +
      K.grp('Layout đưa lên trang', '<div style="max-height:150px;overflow:auto">' + all.map(a => '<div class="acw-row">' + K.chk('pwL' + a.i, a.name, !a.model || all.length === 1) + '</div>').join('') + '</div>') +
      '<div class="acw-note" style="white-space:normal">Mỗi layout in theo thiết lập PLOT của nó. Tệp .zip gồm index.html và các ảnh — giải nén rồi đưa lên máy chủ web bất kỳ.</div></div>';
    A.dialog({ title: 'Xuất bản lên web', cls: 'acw-free', help: 'PUBLISHTOWEB', html, okText: 'Xuất bản', ok: async root => {
      O.title = root.querySelector('#pwT').value.trim() || docBase(); O.desc = root.querySelector('#pwD').value.trim(); O.tpl = root.querySelector('#pwTp').value; O.fmt = root.querySelector('#pwF').value; O.dpi = +root.querySelector('#pwR').value || 150; lsSet('dvd:ptw', O);
      const sel = all.filter(a => root.querySelector('#pwL' + a.i).checked); if(!sel.length){ say('Chưa chọn layout nào.'); return false; }
      setTimeout(() => publishWeb(sel, O, noLay), 0); } });
  });
  async function publishWeb(sel, O, noLay){
    const cur = typeof currentLayout !== 'undefined' ? currentLayout : 0; const files = [], pages = []; say('Đang xuất bản ' + sel.length + ' trang lên web…');
    const enc = new TextEncoder(); const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '_');
    try{
      for(const a of sel){ if(a.i >= 0 && !noLay){ try{ switchLayout(a.i); }catch(_){} } await new Promise(r => setTimeout(r, 60));
        const r = A.plotRender(O.dpi, false); const cv = r.canvas; const mime = O.fmt === 'jpg' ? 'image/jpeg' : 'image/png';
        if(O.fmt === 'jpg'){ const g = document.createElement('canvas'); g.width = cv.width; g.height = cv.height; const c = g.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, g.width, g.height); c.drawImage(cv, 0, 0); var src = g; } else var src = cv;
        const blob = await new Promise(res => src.toBlob(res, mime, 0.92)); const fn = 'images/' + safe(a.name) + '.' + O.fmt; files.push({ name: fn, data: new Uint8Array(await blob.arrayBuffer()) }); pages.push({ name: a.name, file: fn, w: cv.width, h: cv.height }); }
    } finally { if(!noLay){ try{ switchLayout(cur); }catch(_){} } }
    const date = new Date().toLocaleString();
    const cards = O.tpl === 'list' ? pages.map(p => '<section><h2>' + esc(p.name) + '</h2><a href="' + esc(p.file) + '"><img src="' + esc(p.file) + '" alt="' + esc(p.name) + '" style="width:100%"></a></section>').join('\n')
      : '<div class="g">' + pages.map(p => '<figure><a href="' + esc(p.file) + '"><img src="' + esc(p.file) + '" alt="' + esc(p.name) + '"></a><figcaption>' + esc(p.name) + '</figcaption></figure>').join('\n') + '</div>';
    const page = '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(O.title) + '</title>\n<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f3f4f6;color:#1f2933}header{background:#1f2933;color:#fff;padding:18px 24px}h1{margin:0;font-size:22px}header p{margin:4px 0 0;opacity:.8}main{padding:20px 24px;max-width:1200px;margin:auto}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}figure{margin:0;background:#fff;border:1px solid #d9dee5;border-radius:6px;overflow:hidden}figure img{width:100%;display:block;background:#fff}figcaption{padding:8px 12px;font-weight:600}section{background:#fff;border:1px solid #d9dee5;border-radius:6px;padding:12px 16px;margin-bottom:18px}h2{font-size:17px;margin:0 0 8px}footer{color:#6b7480;font-size:12px;padding:12px 24px;text-align:center}</style></head>\n<body><header><h1>' + esc(O.title) + '</h1>' + (O.desc ? '<p>' + esc(O.desc) + '</p>' : '') + '</header><main>\n' + cards + '\n</main><footer>' + esc(pages.length + ' trang · ' + date + ' · DVDCAD') + '</footer></body></html>\n';
    files.unshift({ name: 'index.html', data: enc.encode(page) });
    const zip = A.zipStore(files); const nm = safe(O.title) + '_web.zip'; await save(new Blob([zip], { type: 'application/zip' }), nm, 'application/zip');
    log('PUBLISHTOWEB: ' + nm + ' — index.html + ' + pages.length + ' ảnh (' + O.fmt.toUpperCase() + ', ' + O.dpi + ' dpi).'); return { zip, pages };
  }
  A.publishWeb = publishWeb;

  /* ==================================================================
     DWGCONVERT — đổi phiên bản hàng loạt (khung ẩn: bản vẽ đang mở không bị ảnh hưởng)
     ================================================================== */
  const TGT = [['R2018', 'DWG 2018'], ['R2013', 'DWG 2013'], ['R2010', 'DWG 2010'], ['R2004', 'DWG 2004'], ['R2000', 'DWG 2000'], ['DXF:R2018', 'DXF 2018'], ['DXF:R2013', 'DXF 2013'], ['DXF:R2010', 'DXF 2010'], ['DXF:R2007', 'DXF 2007'], ['DXF:R2004', 'DXF 2004'], ['DXF:R2000', 'DXF 2000']];
  let FR = null;
  function frame(){ if(FR && FR.ready) return FR.ready;
    const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.style.cssText = 'position:fixed;left:-20000px;top:0;width:1200px;height:800px;border:0;visibility:hidden';
    f.src = location.pathname + '?dwgconvert=1'; document.body.appendChild(f); FR = { f };
    FR.ready = new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { try{ const w = f.contentWindow; if(w && w.DVDAcad && w.DVDAcad.dwgNative && typeof w.loadDWG === 'function' && w.DVDAcad.hasDoc){ clearInterval(iv); try{ w.localStorage && 0; }catch(_){} res(w); return; } }catch(_){} if(Date.now() - t0 > 60000){ clearInterval(iv); rej(new Error('Không nạp được bộ chuyển đổi.')); } }, 150); });
    return FR.ready; }
  function dropFrame(){ if(FR && FR.f) FR.f.remove(); FR = null; }
  async function convertOne(w, file, tgt, onLoaded){
    const nm = file.name, ext = (/\.(dwg|dxf)$/i.exec(nm) || [])[1]; if(!ext) throw new Error('Không phải tệp DWG / DXF');
    const buf = await file.arrayBuffer();
    if(/dwg/i.test(ext)) await w.loadDWG(buf, nm); else w.loadDXF(new TextDecoder().decode(buf), nm);
    await new Promise(r => setTimeout(r, 200));
    const ME2 = w.eval('modelEntities'); if(!ME2 || !ME2.length) throw new Error('Bản vẽ trống hoặc không đọc được');
    if(onLoaded) onLoaded(w);   // PARTIALOAD / PSETUPIN: đọc dữ liệu từ khung ẩn
    const base = nm.replace(/\.(dwg|dxf)$/i, '');
    if(tgt.startsWith('DXF:')){ const A2 = w.DVDAcad, pv = A2.dxfVer; A2.dxfVer = tgt.slice(4); let t; try{ t = A2.dxfR2000(ME2); } finally { A2.dxfVer = pv; } return { name: base + '.dxf', data: new TextEncoder().encode(t), n: ME2.length }; }
    const d = w.DVDAcad.dwgNative(ME2, { version: tgt }); return { name: base + '.dwg', data: d, n: ME2.length };
  }
  A.dwgConvertFiles = async (files, tgt, onEach, onLoaded) => { const w = await frame(); const out = [], bad = []; try{ for(const f of files){ try{ const r = await convertOne(w, f, tgt, onLoaded); out.push(r); if(onEach) onEach(f, r); }catch(err){ bad.push([f.name, err.message || String(err)]); if(onEach) onEach(f, null, err); } } } finally { dropFrame(); } return { out, bad }; };
  plain(['DWGCONVERT'], 'Đổi phiên bản DWG hàng loạt (DWG Convert): danh sách tệp DWG / DXF → DWG 2018 / 2013 / 2010 / 2004 / 2000 hoặc DXF, đóng gói .zip', () => {
    if(A.busy && A.busy()) A.cancel(true);
    let L = []; let tgt = lsGet('dvd:dwgconv', 'R2018');
    const html = '<div class="acw" style="width:560px"><div class="acw-cols"><div class="c1"><div class="lm-grid" style="height:220px"><table><thead><tr><th>Tệp</th><th style="width:80px">Cỡ</th><th style="width:150px">Trạng thái</th></tr></thead><tbody id="dcB"></tbody></table></div></div>' +
      '<div class="c2 acw-btncol">' + K.btn('dcAdd', 'Thêm tệp…') + K.btn('dcRm', 'Bỏ tệp') + K.btn('dcClr', 'Bỏ hết') + '</div></div>' +
      K.grp('Đổi sang', K.row('Định dạng:', K.sel('dcT', TGT, tgt))) + '<div class="acw-note" style="white-space:normal">Các tệp mở trong khung ẩn rồi ghi lại bằng bộ ghi của DVDCAD; bản vẽ đang mở không bị ảnh hưởng. Kết quả tải về một tệp .zip (một tệp thì tải thẳng).</div></div>';
    const d = A.dialog({ title: 'Đổi phiên bản DWG', cls: 'acw-free', help: 'DWGCONVERT', html, okText: 'Đổi', ok: root => { tgt = root.querySelector('#dcT').value; lsSet('dvd:dwgconv', tgt); if(!L.length){ say('Chưa có tệp nào.'); return false; } run(root); return false; } });
    const root = d.root, $ = id => root.querySelector('#' + id); let sel = -1; const st = new Map();
    const render = () => { $('dcB').innerHTML = L.length ? L.map((f, i) => '<tr data-i="' + i + '"' + (i === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(f.name) + '</td><td>' + (f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.ceil(f.size / 1024) + ' KB') + '</td><td>' + esc(st.get(f) || 'Chờ') + '</td></tr>').join('') : '<tr><td colspan="3" style="color:#9aa6ba;padding:10px">Bấm "Thêm tệp…" để chọn tệp DWG / DXF.</td></tr>'; };
    $('dcB').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if(tr){ sel = +tr.dataset.i; render(); } });
    $('dcAdd').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.dwg,.dxf'; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { for(const f of i.files || []) if(/\.(dwg|dxf)$/i.test(f.name) && !L.some(x => x.name === f.name && x.size === f.size)) L.push(f); i.remove(); render(); }; i.click(); };
    $('dcRm').onclick = () => { if(sel >= 0){ L.splice(sel, 1); sel = -1; render(); } }; $('dcClr').onclick = () => { L = []; sel = -1; render(); };
    let busy = false;
    async function run(){ if(busy) return; busy = true; root.querySelector('.dvd-ok').disabled = true; for(const f of L) st.set(f, 'Đang chờ…'); render();
      try{ const r = await A.dwgConvertFiles(L, tgt, (f, res, err) => { st.set(f, res ? '✓ ' + res.name : '✗ ' + (err && err.message || 'lỗi')); render(); });
        if(r.out.length === 1){ const x = r.out[0]; await save(new Blob([x.data], { type: 'application/octet-stream' }), x.name, 'application/octet-stream'); }
        else if(r.out.length){ const z = A.zipStore(r.out.map(x => ({ name: x.name, data: x.data }))); await save(new Blob([z], { type: 'application/zip' }), 'DWGConvert_' + (TGT.find(t => t[0] === tgt) || [0, tgt])[1].replace(/\s+/g, '') + '.zip', 'application/zip'); }
        log('DWGCONVERT: ' + r.out.length + ' tệp → ' + (TGT.find(t => t[0] === tgt) || [0, tgt])[1] + (r.bad.length ? ', lỗi ' + r.bad.length + ' (' + r.bad.map(b => b[0]).join(', ') + ')' : '') + '.');
      }catch(err){ say('DWGCONVERT: ' + (err.message || err)); } finally { busy = false; const ok = root.querySelector('.dvd-ok'); if(ok) ok.disabled = false; } }
    render();
  });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
