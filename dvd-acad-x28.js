/* DVDCAD v6j — nền tham chiếu (underlay) PDF / DWFx như AutoCAD
   · PDF / DWFx xuất ra có lớp: PDF ghi lớp OCG (Optional Content), DWFx ghi lớp thành <Canvas Name="L_…">
   · PDFATTACH: gắn trang PDF làm nền (khối UL$PDF$…), giữ lớp của PDF; PDFIMPORT vẫn nhập thành nét rời (lớp PDF → lớp bản vẽ)
   · DWFATTACH: gắn trang DWFx / XPS làm nền (khối UL$DWF$…); .dwf (DWF6 nhị phân) báo rõ
   · PDFLAYERS / DWFLAYERS / ULAYERS: bật / tắt lớp của nền · PDFCLIP / DWFCLIP: cắt nền (XCLIP) · PDFADJUST / DWFADJUST: mờ, đơn sắc
   · PDFFRAME / DWFFRAME / UFRAMES: khung nền · EXPORTDWFX / EXPORTDWF / DWFFORMAT / EXPORTSETTINGS */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x28 || !window.DVDCmd) return; A._x28 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const uMM = () => { try{ return (typeof unitToMM === 'function' && unitToMM()) || 1; }catch(_){ return 1; } };
  const FRAME = '*FRAME*';
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });

  /* ===================== lớp trong PDF / DWFx xuất ra ===================== */
  A.pdfLayersOn = () => { try{ return localStorage.getItem('dvd:pdflayers') !== '0'; }catch(_){ return true; } };
  if(typeof window.drawEntity === 'function'){ const _de = window.drawEntity;
    window.drawEntity = function(e){ try{ if(e && e.np && typeof plotMode !== 'undefined' && plotMode) return; }catch(_){} try{ const c = typeof ctx !== 'undefined' ? ctx : null; if(c && c.setOC && e && A.pdfLayersOn()) c.setOC(e.layer || '0'); }catch(_){} return _de.apply(this, arguments); }; }

  /* ===================== khối nền ===================== */
  const ulKind = e => { const m = /^UL\$(PDF|DWF)\$/.exec((e && e.blk) || ''); return m && e.grp ? m[1] : null; };
  const isUL = (e, k) => { const t = ulKind(e); return !!t && (!k || t === k); };
  const members = gid => (A.groupMembers ? A.groupMembers(gid) : (typeof modelEntities !== 'undefined' ? modelEntities.filter(x => x.grp === gid) : []));
  const ulTitle = e => String(e.blk || '').replace(/^UL\$(PDF|DWF)\$/, '');
  A.isUnderlay = isUL;
  function makeUnderlay(kind, title, ents, ins, rot, size){
    const name = 'UL$' + kind + '$' + String(title || 'nen').replace(/[<>\/\\":;?*|=`$]/g, '_').slice(0, 200);
    const gid = A.newGroupId('B'), c = Math.cos(rot || 0), s = Math.sin(rot || 0), cur = (A.LS && A.LS.cur) || '0';
    const bm = { name, src: 'file', lay: cur, a: c, b: s, c: -s, d: c, e: ins.x, f: ins.y }; const M = { a: c, b: s, c: -s, d: c, e: ins.x, f: ins.y };
    const L = ents.slice(); if(size) L.push({ type: 'POLYLINE', closed: true, vertices: [{ x: 0, y: 0 }, { x: size[0], y: 0 }, { x: size[0], y: size[1] }, { x: 0, y: size[1] }], col: '#8a93a3', layer: FRAME });
    const fr = (() => { try{ return +localStorage.getItem('dvd:uframes'); }catch(_){ return NaN; } })();
    const out = [];
    for(const e0 of L){ const e = e0; e.ull = e.layer || '0'; e.layer = cur; if(e.ull === FRAME && fr === 0) e.vh = 1; A.xformEnt(e, M); e.grp = gid; e.blk = name; e.bm = bm; e.bip = { x: ins.x, y: ins.y }; out.push(e); }
    return out; }
  A.makeUnderlay = makeUnderlay;
  const askPlace = async () => {
    const sc = numOr(await A.getNum('Tỉ lệ', { def: 1 }), 1);
    const p = await A.getPoint('Điểm chèn <0,0>', { rubber: false }); const ins = p.pt || { x: 0, y: 0 };
    const r = numOr(await A.getNum('Góc xoay (độ)', { def: 0 }), 0); return { sc: sc > 0 ? sc : 1, ins, rot: r * Math.PI / 180 }; };

  /* ===================== PDFATTACH ===================== */
  async function pdfAttach(file){
    const data = new Uint8Array(await file.arrayBuffer()); const L = A.loadPdfJs ? await A.loadPdfJs().catch(() => null) : null; if(!L){ say('Không nạp được bộ đọc PDF.'); return; }
    let pages = 1; try{ const d = await L.getDocument({ data: data.slice(0), isEvalSupported: false }).promise; pages = d.numPages; }catch(_){ say('Không đọc được PDF.'); return; }
    let pg = 1; if(pages > 1){ pg = Math.round(numOr(await A.getNum('Trang (1 – ' + pages + ')', { def: 1 }), 1)); pg = Math.max(1, Math.min(pages, pg)); }
    const P = await askPlace(); const k = 25.4 / 72 / uMM() * P.sc;
    log('PDFATTACH: đang đọc trang ' + pg + '…');
    let R; try{ R = await A.pdfToEnts(data.slice(0), pg, { k, fill: true, text: true, max: 200000 }); }catch(err){ console.error(err); say('Lỗi đọc PDF: ' + err.message); return; }
    const title = String(file.name || 'pdf').replace(/\.pdf$/i, '') + (pages > 1 ? '_p' + pg : '');
    const add = makeUnderlay('PDF', title, R.ents, P.ins, P.rot, R.size);
    A.commit({ add }, 'PDFATTACH: gắn "' + title + '" làm nền (' + (add.length - 1) + ' đối tượng' + (R.ocgs && R.ocgs.length ? ', ' + R.ocgs.length + ' lớp PDF' : '') + ') — PDFLAYERS bật / tắt lớp, PDFCLIP cắt');
    try{ A.pushView && A.pushView(); fitView(); }catch(_){} }
  A.pdfAttach = pdfAttach;
  plain(['PDFATTACH'], 'Gắn trang PDF làm nền tham chiếu (giữ lớp PDF; PDFLAYERS, PDFCLIP, PDFADJUST)', () => pickFile('.pdf').then(f => f && A.run('PDFATTACH', () => pdfAttach(f))));

  /* ===================== DWFx / XPS → nét ===================== */
  const mmul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const parseM = s => { const v = String(s || '').split(/[\s,]+/).filter(Boolean).map(Number); return v.length === 6 && v.every(isFinite) ? v : [1, 0, 0, 1, 0, 0]; };
  const colOf = s => { s = String(s || '').trim(); let m = /^#([0-9a-f]{8})$/i.exec(s); if(m){ if(parseInt(m[1].slice(0, 2), 16) === 0) return null; return '#' + m[1].slice(2).toLowerCase(); } m = /^#([0-9a-f]{6})$/i.exec(s); return m ? '#' + m[1].toLowerCase() : null; };
  function pathData(d){ const T = String(d || '').match(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || []; let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0, lc = null; const subs = []; let cur = null;
    const n = () => +T[i++]; const isN = () => i < T.length && !/^[a-zA-Z]$/.test(T[i]);
    const move = (X, Y) => { cur = { pts: [{ x: X, y: Y }], closed: false }; subs.push(cur); x = sx = X; y = sy = Y; };
    const line = (X, Y) => { if(!cur) move(x, y); cur.pts.push({ x: X, y: Y }); x = X; y = Y; };
    const bez = (x1, y1, x2, y2, X, Y) => { for(let k = 1; k <= 8; k++){ const t = k / 8, u = 1 - t; line(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * X, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * Y); } x = X; y = Y; };
    const arc = (rx, ry, phi, fa, fs, X, Y) => { const x0 = x, y0 = y; if(!rx || !ry){ line(X, Y); return; } const c = Math.cos(phi * Math.PI / 180), s = Math.sin(phi * Math.PI / 180); const dx = (x0 - X) / 2, dy = (y0 - Y) / 2; const x1 = c * dx + s * dy, y1 = -s * dx + c * dy;
      rx = Math.abs(rx); ry = Math.abs(ry); const lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if(lam > 1){ rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const sg = fa === fs ? -1 : 1; const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1; const co = sg * Math.sqrt(Math.max(0, num / den)); const cx1 = co * rx * y1 / ry, cy1 = -co * ry * x1 / rx;
      const cx = c * cx1 - s * cy1 + (x0 + X) / 2, cy = s * cx1 + c * cy1 + (y0 + Y) / 2; const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry); let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry); if(!fs && dt > 0) dt -= 2 * Math.PI; if(fs && dt < 0) dt += 2 * Math.PI;
      const N = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 16))); for(let k = 1; k <= N; k++){ const t = t1 + dt * k / N; line(cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c); } x = X; y = Y; };
    while(i < T.length){ if(/^[a-zA-Z]$/.test(T[i])) cmd = T[i++]; const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), bx = rel ? x : 0, by = rel ? y : 0;
      if(C === 'F'){ n(); continue; } if(C === 'Z'){ if(cur){ cur.closed = true; x = sx; y = sy; cur = null; } continue; }
      if(!isN()){ i++; continue; }
      if(C === 'M'){ move(bx + n(), by + n()); cmd = rel ? 'l' : 'L'; }
      else if(C === 'L') line(bx + n(), by + n());
      else if(C === 'H') line(bx + n(), y); else if(C === 'V') line(x, by + n());
      else if(C === 'C'){ const a = bx + n(), b = by + n(), c2 = bx + n(), d2 = by + n(), X = bx + n(), Y = by + n(); bez(a, b, c2, d2, X, Y); lc = [c2, d2]; continue; }
      else if(C === 'S'){ const c1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]; const c2 = bx + n(), d2 = by + n(), X = bx + n(), Y = by + n(); bez(c1[0], c1[1], c2, d2, X, Y); lc = [c2, d2]; continue; }
      else if(C === 'Q'){ const qx = bx + n(), qy = by + n(), X = bx + n(), Y = by + n(); bez(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), X + 2 / 3 * (qx - X), Y + 2 / 3 * (qy - Y), X, Y); }
      else if(C === 'A'){ const rx = n(), ry = n(), ph = n(), fa = n(), fs = n(), X = bx + n(), Y = by + n(); arc(rx, ry, ph, fa, fs, X, Y); }
      else i++;
      lc = null; }
    return subs.filter(s => s.pts.length >= 2); }
  A.xpsPathData = pathData;
  // một trang FixedPage → nét (toạ độ: 1/96 inch, gốc trên trái → bản vẽ: k đơn vị / px, trục y lên)
  function xpsToEnts(xml, k){
    const doc = new DOMParser().parseFromString(xml, 'application/xml'); const root = doc.documentElement; if(!root || root.localName !== 'FixedPage') throw new Error('Không phải trang XPS');
    const W = +root.getAttribute('Width') || 0, H = +root.getAttribute('Height') || 0; const out = [], lays = new Set(); let nTxt = 0;
    const W2 = p => ({ x: p.x * k, y: (H - p.y) * k });
    const decL = nm => { const m = /^L_([0-9a-f]+)$/i.exec(nm || ''); if(!m) return null; try{ const b = new Uint8Array(m[1].match(/../g).map(h => parseInt(h, 16))); return new TextDecoder().decode(b); }catch(_){ return null; } };
    const walk = (node, M, ly) => { for(const ch of node.children){ const tag = ch.localName; let M2 = M; const rt = ch.getAttribute('RenderTransform'); if(rt) M2 = mmul(M, parseM(rt));
        if(tag === 'Canvas'){ walk(ch, M2, decL(ch.getAttribute('Name')) || ly); continue; }
        const layer = ly || 'DWF';
        if(tag === 'Path'){ let d = ch.getAttribute('Data'); if(!d){ const g = ch.getElementsByTagName('PathGeometry')[0]; d = g ? g.getAttribute('Figures') : ''; }
          const st = colOf(ch.getAttribute('Stroke')), fl = colOf(ch.getAttribute('Fill')); if(!st && !fl) continue; const S = pathData(d); if(!S.length) continue; lays.add(layer);
          if(st) for(const s of S){ const v = s.pts.map(p => W2(ap(M2, p.x, p.y))); if(v.length === 2) out.push({ type: 'LINE', x1: v[0].x, y1: v[0].y, x2: v[1].x, y2: v[1].y, col: st, layer }); else out.push({ type: 'POLYLINE', vertices: v, closed: s.closed, col: st, layer }); }
          else { const loops = S.filter(s => s.pts.length >= 3).map(s => s.pts.map(p => W2(ap(M2, p.x, p.y)))); if(loops.length) out.push({ type: 'HATCH', loops, solid: true, col: fl, layer }); } }
        else if(tag === 'Glyphs'){ const t = ch.getAttribute('UnicodeString') || ''; const str = t.startsWith('{}') ? t.slice(2) : t; if(!str.trim()) continue; const em = +ch.getAttribute('FontRenderingEmSize') || 10;
          const o = ap(M2, +ch.getAttribute('OriginX') || 0, +ch.getAttribute('OriginY') || 0); const sy = Math.hypot(M2[2], M2[3]); const ang = Math.atan2(M2[1], M2[0]); const p = W2(o); lays.add(layer); nTxt++;
          out.push({ type: 'TEXT', x: p.x, y: p.y, h: em * sy * k * 0.72, rot: -ang * 180 / Math.PI, text: str, col: colOf(ch.getAttribute('Fill')) || '#ffffff', layer }); } } };
    walk(root, [1, 0, 0, 1, 0, 0], null);
    return { ents: out, size: [W * k, H * k], layers: [...lays], texts: nTxt }; }
  A.xpsToEnts = xpsToEnts;
  async function xpsPages(buf){ const z = await A.unzip(buf); let names = z.names.filter(n => /\.fpage$/i.test(n));
    // thứ tự trang theo FixedDocument (nếu có)
    try{ const fd = z.names.find(n => /\.fdoc$/i.test(n)); if(fd){ const x = new TextDecoder().decode(await z.get(fd)); const src = [...x.matchAll(/Source="([^"]+)"/g)].map(m => m[1].replace(/^\//, '')); const ord = src.map(s => names.find(n => n === s || n.endsWith(s.split('/').pop()))).filter(Boolean); if(ord.length) names = ord.concat(names.filter(n => !ord.includes(n))); } }catch(_){}
    return { names, get: async n => new TextDecoder().decode(await z.get(n)) }; }
  async function dwfAttach(file){
    const buf = new Uint8Array(await file.arrayBuffer()); const head = new TextDecoder().decode(buf.subarray(0, 12));
    if(/^\(DWF V0?[0-6]/.test(head)){ say('Tệp DWF6 (.dwf nhị phân, W2D) chưa đọc được — Autodesk không công bố định dạng. Hãy xuất lại thành DWFx (XPS) hoặc PDF rồi gắn.'); return; }
    let Z; try{ Z = await xpsPages(buf); }catch(_){ say('Không phải tệp DWFx / XPS.'); return; } if(!Z.names.length){ say('Tệp không có trang XPS.'); return; }
    let pg = 1; if(Z.names.length > 1){ pg = Math.max(1, Math.min(Z.names.length, Math.round(numOr(await A.getNum('Trang (1 – ' + Z.names.length + ')', { def: 1 }), 1)))); }
    const P = await askPlace(); const k = 25.4 / 96 / uMM() * P.sc; let R; try{ R = xpsToEnts(await Z.get(Z.names[pg - 1]), k); }catch(err){ say('Lỗi đọc trang: ' + err.message); return; }
    const title = String(file.name || 'dwf').replace(/\.(dwfx|xps|dwf)$/i, '') + (Z.names.length > 1 ? '_p' + pg : '');
    const add = makeUnderlay('DWF', title, R.ents, P.ins, P.rot, R.size);
    A.commit({ add }, 'DWFATTACH: gắn "' + title + '" làm nền (' + (add.length - 1) + ' đối tượng, ' + R.layers.length + ' lớp) — DWFLAYERS, DWFCLIP'); try{ A.pushView && A.pushView(); fitView(); }catch(_){} }
  A.dwfAttach = dwfAttach;
  plain(['DWFATTACH'], 'Gắn trang DWFx / XPS làm nền tham chiếu (DWFLAYERS, DWFCLIP, DWFADJUST)', () => pickFile('.dwfx,.xps,.dwf').then(f => f && A.run('DWFATTACH', () => dwfAttach(f))));

  /* ===================== lớp của nền ===================== */
  function layersDialog(gid, then){ const mem = members(gid); if(!mem.length) return; const L = [...new Set(mem.map(e => e.ull).filter(x => x && x !== FRAME))].sort((a, b) => a.localeCompare(b));
    const on = l => mem.some(e => e.ull === l && !e.vh);
    const d = A.dialog({ title: (ulKind(mem[0]) === 'PDF' ? 'PDF' : 'DWF') + ' Layers — ' + ulTitle(mem[0]), html: '<div class="acw" style="min-width:320px"><div class="acw-row" style="margin-bottom:4px"><button type="button" class="acw-btn" id="ulAll">Bật hết</button> <button type="button" class="acw-btn" id="ulNone">Tắt hết</button></div><div class="acw-list" style="max-height:340px;overflow:auto;padding:4px">' +
      (L.length ? L.map((l, i) => '<label style="display:block"><input type="checkbox" data-i="' + i + '"' + (on(l) ? ' checked' : '') + '> ' + esc(l) + ' <span style="opacity:.6">(' + mem.filter(e => e.ull === l).length + ')</span></label>').join('') : '<i>Nền này không có lớp.</i>') + '</div></div>',
      ok: root => { const show = new Set(); root.querySelectorAll('[data-i]').forEach(c => { if(c.checked) show.add(L[+c.dataset.i]); }); const rep = [];
        for(const e of mem){ if(!e.ull || e.ull === FRAME) continue; const hide = !show.has(e.ull); if(!!e.vh === hide) continue; const w = copy(e); if(hide) w.vh = 1; else delete w.vh; rep.push([e, w]); }
        if(rep.length) A.commit({ rep }, 'Lớp nền: hiện ' + show.size + ' / ' + L.length + ' lớp'); if(then) then(); } });
    d.root.querySelector('#ulAll').onclick = () => d.root.querySelectorAll('[data-i]').forEach(c => c.checked = true); d.root.querySelector('#ulNone').onclick = () => d.root.querySelectorAll('[data-i]').forEach(c => c.checked = false); }
  A.underlayLayersDialog = layersDialog;
  const pickUL = async (k, what) => { const r = await A.getEnt('Chọn nền ' + (what || k || 'PDF / DWF'), { filter: e => isUL(e, k) }); return r.ent || null; };
  cmd(['PDFLAYERS'], 'Bật / tắt lớp của nền PDF', async () => { const e = await pickUL('PDF', 'PDF'); if(e) layersDialog(e.grp); });
  cmd(['DWFLAYERS'], 'Bật / tắt lớp của nền DWF', async () => { const e = await pickUL('DWF', 'DWF'); if(e) layersDialog(e.grp); });
  plain(['ULAYERS'], 'Lớp của các nền tham chiếu (PDF / DWF) trong bản vẽ', () => {
    const G = new Map(); for(const e of (typeof modelEntities !== 'undefined' ? modelEntities : [])) if(isUL(e) && !G.has(e.grp)) G.set(e.grp, e);
    if(!G.size){ log('Bản vẽ chưa có nền PDF / DWF (PDFATTACH, DWFATTACH).'); return; }
    const L = [...G.values()]; if(L.length === 1){ layersDialog(L[0].grp); return; }
    const d = A.dialog({ title: 'Underlay Layers', html: '<div class="acw" style="min-width:320px"><div class="acw-row"><label>Nền</label><select id="ulSel">' + L.map((e, i) => '<option value="' + i + '">' + esc(ulKind(e) + ': ' + ulTitle(e)) + '</option>').join('') + '</select></div><div class="acw-note">Chọn nền rồi OK để mở danh sách lớp.</div></div>',
      ok: root => { const e = L[+root.querySelector('#ulSel').value]; setTimeout(() => layersDialog(e.grp), 0); } }); void d; });

  /* ===================== cắt, chỉnh, khung ===================== */
  function clipVia(k){ return async () => { const e = await pickUL(k); if(!e) return; setTimeout(() => { try{ selEnts.clear(); for(const m of members(e.grp)) selEnts.add(m); }catch(_){} DVDCmd.run('XCLIP'); }, 0); }; }
  cmd(['PDFCLIP'], 'Cắt nền PDF theo khung (chữ nhật / đa giác / đa tuyến, đảo ngược; bật / tắt / xoá) như XCLIP', clipVia('PDF'));
  cmd(['DWFCLIP'], 'Cắt nền DWF theo khung như XCLIP', clipVia('DWF'));
  const gray = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if(!m) return '#8c8c8c'; const v = parseInt(m[1], 16); const y = Math.round(0.299 * (v >> 16 & 255) + 0.587 * (v >> 8 & 255) + 0.114 * (v & 255)); const s = y.toString(16).padStart(2, '0'); return '#' + s + s + s; };
  function adjustDialog(gid){ const mem = members(gid); if(!mem.length) return; const f0 = mem[0].tp || 0, mono0 = mem.some(e => e.ulc);
    const d = A.dialog({ title: (ulKind(mem[0]) === 'PDF' ? 'PDF' : 'DWF') + ' Adjust — ' + ulTitle(mem[0]), html: '<div class="acw" style="min-width:320px"><div class="acw-row"><label>Độ mờ (Fade) 0 – 80</label><input id="uaF" type="range" min="0" max="80" value="' + f0 + '"> <b id="uaFv">' + f0 + '</b></div><div class="acw-row"><label><input id="uaM" type="checkbox"' + (mono0 ? ' checked' : '') + '> Đơn sắc (Monochrome)</label></div></div>',
      ok: root => { const F = +root.querySelector('#uaF').value || 0, mono = root.querySelector('#uaM').checked; const rep = [];
        for(const e of mem){ const w = copy(e); if(F > 0) w.tp = F; else delete w.tp; if(mono && !w.ulc && e.ull !== FRAME){ w.ulc = w.col || '#ffffff'; w.col = gray(w.col); } if(!mono && w.ulc){ w.col = w.ulc; delete w.ulc; } rep.push([e, w]); }
        A.commit({ rep }, 'Chỉnh nền: mờ ' + F + '%' + (mono ? ', đơn sắc' : '')); } });
    const r = d.root.querySelector('#uaF'); r.oninput = () => d.root.querySelector('#uaFv').textContent = r.value; }
  A.underlayAdjustDialog = adjustDialog;
  cmd(['PDFADJUST'], 'Chỉnh nền PDF: độ mờ, đơn sắc (ảnh thì như IMAGEADJUST)', async () => { const r = await A.getEnt('Chọn nền PDF hoặc ảnh', { filter: e => isUL(e) || e.type === 'IMAGE' }); const e = r.ent; if(!e) return; if(e.type === 'IMAGE' && !isUL(e)){ setTimeout(() => { try{ selEnts.clear(); selEnts.add(e); }catch(_){} DVDCmd.run('IMAGEADJUST'); }, 0); return; } adjustDialog(e.grp); });
  cmd(['DWFADJUST'], 'Chỉnh nền DWF: độ mờ, đơn sắc', async () => { const e = await pickUL('DWF'); if(e) adjustDialog(e.grp); });
  async function frameCmd(name, kinds){ const cur = (() => { try{ const v = localStorage.getItem('dvd:uframes'); return v == null ? 1 : +v; }catch(_){ return 1; } })();
    const r = await A.getNum(name + ': 0 = ẩn khung, 1 = hiện và in, 2 = hiện không in', { def: cur }); const v = Math.round(numOr(r, cur)); if(![0, 1, 2].includes(v)) return; try{ localStorage.setItem('dvd:uframes', String(v)); }catch(_){}
    const rep = []; for(const e of (typeof modelEntities !== 'undefined' ? modelEntities : [])){ if(e.ull !== FRAME || !kinds.includes(ulKind(e))) continue; const hide = v === 0; const np = v === 2; if(!!e.vh === hide && !!e.np === np) continue; const w = copy(e); if(hide) w.vh = 1; else delete w.vh; if(np) w.np = 1; else delete w.np; rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, name + ' = ' + v); else log(name + ' = ' + v); }
  cmd(['PDFFRAME'], 'Khung nền PDF: 0 ẩn, 1 hiện và in, 2 hiện không in', () => frameCmd('PDFFRAME', ['PDF']));
  cmd(['DWFFRAME'], 'Khung nền DWF: 0 ẩn, 1 hiện và in, 2 hiện không in', () => frameCmd('DWFFRAME', ['DWF']));
  cmd(['UFRAMES', 'FRAME'], 'Khung mọi nền tham chiếu (PDF, DWF): 0 ẩn, 1 hiện và in, 2 hiện không in', () => frameCmd('UFRAMES', ['PDF', 'DWF']));

  /* ===================== xuất DWFx / DWF, cài đặt xuất ===================== */
  async function exportDwfx(){ if(!A.plotRender || !A.dwfxBuild){ say('Không có bộ ghi DWFx.'); return; }
    const rs = A.plotRender(0, false, 'xps'); const title = ((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
    const blob = await A.dwfxBuild([{ ctx: rs.xps, Wmm: rs.Wmm, Hmm: rs.Hmm, title: 'Model' }], { title }); const nm = title + '.dwfx';
    await shareOrDownload(blob, nm, 'model/vnd.dwfx+xps'); log('EXPORTDWFX: đã xuất ' + nm + ' (khổ ' + Math.round(rs.Wmm) + ' × ' + Math.round(rs.Hmm) + ' mm, theo thiết lập in hiện tại' + (A.pdfLayersOn() ? ', có lớp' : '') + ').'); return blob; }
  A.exportDwfx = exportDwfx;
  plain(['EXPORTDWFX'], 'Xuất bản vẽ ra DWFx (XPS, có lớp) theo thiết lập in hiện tại', () => exportDwfx().catch(err => say('Lỗi xuất DWFx: ' + err.message)));
  plain(['EXPORTDWF'], 'Xuất DWF: DVDCAD ghi DWFx (DWF6 nhị phân chưa có) — mở được bằng Autodesk Viewer / Design Review / trình xem XPS', () => { log('EXPORTDWF: DWF6 (.dwf nhị phân) chưa ghi được vì Autodesk không công bố định dạng W2D — xuất DWFx thay (cùng nội dung, mở bằng Autodesk Viewer / Design Review).'); exportDwfx().catch(err => say('Lỗi xuất DWFx: ' + err.message)); });
  cmd(['DWFFORMAT'], 'Định dạng mặc định khi xuất DWF: DWFx (DWF6 chưa ghi được)', async () => { const r = await A.getKw('Định dạng [DWF / DWFX]', { kw: [{ k: 'DWF', t: 'DWF' }, { k: 'DWFX', t: 'DWFX' }], def: 'DWFX' }); if(r.kw === 'DWF') log('DWFFORMAT: DWF6 chưa ghi được — vẫn dùng DWFx.'); else log('DWFFORMAT = DWFx'); });
  plain(['EXPORTSETTINGS'], 'Cài đặt xuất PDF / DWFx: có lớp, vùng xuất', () => {
    const on = A.pdfLayersOn(); const d = A.dialog({ title: 'Export to DWF/PDF Options', html: '<div class="acw" style="min-width:340px"><fieldset class="acw-grp"><legend>Thông tin trong tệp</legend><label style="display:block"><input id="exL" type="checkbox"' + (on ? ' checked' : '') + '> Có thông tin lớp (Layer information)</label></fieldset><div class="acw-note">Vùng xuất, khổ giấy, tỉ lệ lấy theo thiết lập in (PLOT / PAGESETUP). Xuất: EXPORTPDF, EXPORTDWFX.</div></div>',
      ok: root => { const v = root.querySelector('#exL').checked; try{ localStorage.setItem('dvd:pdflayers', v ? '1' : '0'); }catch(_){} log('EXPORTSETTINGS: ' + (v ? 'có' : 'không có') + ' lớp trong PDF / DWFx.'); } }); void d; });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
