/* DVDCAD v6n — đánh dấu (markup), so sánh xuất / nhập, kết nối dữ liệu
   · MARKUPIMPORT: nhập bản đánh dấu (PDF / ảnh / DWFx) làm nền trên lớp MARKUP; MARKUPASSIST: tìm các vết đánh dấu màu đỏ
     (nét + chữ gần nhau) → bảng: phóng tới, chèn chữ vào bản vẽ, vẽ đám mây sửa đổi, đánh dấu đã xong; MARKUPCLOSE đóng bảng
   · OPENDWFMARKUP: mở tệp DWFx có đánh dấu (Design Review) làm nền + bảng đánh dấu
   · COMPAREEXPORT: xuất kết quả so sánh (bản vẽ + lớp đánh dấu xanh / đỏ + chú giải) ra DXF; COMPAREIMPORT: lấy đối tượng của bản so sánh vào bản vẽ
   · DBCONNECT: kết nối bảng dữ liệu (CSV / Excel) — liên kết dòng với đối tượng, xem bản ghi, chọn đối tượng theo dòng, nhãn từ trường */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x38 || !window.DVDCmd) return; A._x38 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); });
  const docBase = () => String((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
  const uMM = () => { try{ return (typeof unitToMM === 'function' && unitToMM()) || 1; }catch(_){ return 1; } };
  const panel = (id, title, w) => { let P = document.getElementById(id); if(P) return P; P = document.createElement('div'); P.id = id; P.style.cssText = 'position:absolute;right:8px;top:40px;width:' + (w || 330) + 'px;max-height:calc(100% - 140px);display:flex;flex-direction:column;z-index:40;background:var(--panel,#1c222b);border:1px solid var(--line,#3a4452);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.4);font-size:12px;color:var(--ink,#e6eaf0)';
    P.innerHTML = '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line,#3a4452)"><b style="flex:1">' + esc(title) + '</b><button type="button" data-x="1" title="Đóng">×</button></div><div class="pb" style="overflow:auto;padding:6px 8px"></div>';
    (document.getElementById('cvWrap') || document.querySelector('.canvas-wrap') || document.body).appendChild(P); P.querySelector('[data-x]').onclick = () => P.remove(); return P; };

  /* ===================== MARKUP ===================== */
  // màu "đánh dấu": đỏ / cam / hồng (sắc độ ≤ 25° hoặc ≥ 330°, đủ đậm)
  const isRed = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '')); if(!m) return false; const v = parseInt(m[1], 16), r = (v >> 16 & 255) / 255, g = (v >> 8 & 255) / 255, b = (v & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if(mx < 0.35 || mx - mn < 0.35) return false; let h = 0; const d = mx - mn;
    if(mx === r) h = 60 * (((g - b) / d) % 6); else if(mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); if(h < 0) h += 360; return h <= 25 || h >= 330; };
  A.isMarkupColor = isRed;
  const key = M => M.bb.map(v => Math.round(v * 10) / 10).join(',');
  function findMarkups(list){ const L = (list || ME()).filter(e => !e.vh && (isRed(e.col) || e.layer === 'MARKUP' || /^MARKUP/i.test(e.ull || ''))); const box = e => { const b = A.bboxOf ? A.bboxOf([e]) : null; return b ? [b.x0, b.y0, b.x1, b.y1] : null; };
    const items = L.map(e => ({ e, b: box(e) })).filter(x => x.b); let span = 0; for(const x of items) span = Math.max(span, x.b[2] - x.b[0], x.b[3] - x.b[1]); let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity, th = 0; for(const x of items){ X0 = Math.min(X0, x.b[0]); Y0 = Math.min(Y0, x.b[1]); X1 = Math.max(X1, x.b[2]); Y1 = Math.max(Y1, x.b[3]); if(x.e.type === 'TEXT') th = Math.max(th, x.e.h || 0); }
    const gap = Math.max(1e-9, span * 0.05, th * 1.5, Math.hypot(X1 - X0, Y1 - Y0) * 0.02);   // gom nét + chữ gần nhau thành một vết
    const G = []; for(const it of items){ const hit = G.filter(g => it.b[0] <= g.bb[2] + gap && g.bb[0] <= it.b[2] + gap && it.b[1] <= g.bb[3] + gap && g.bb[1] <= it.b[3] + gap);
      if(!hit.length){ G.push({ ents: [it.e], bb: it.b.slice() }); continue; } const g = hit[0]; g.ents.push(it.e); g.bb = [Math.min(g.bb[0], it.b[0]), Math.min(g.bb[1], it.b[1]), Math.max(g.bb[2], it.b[2]), Math.max(g.bb[3], it.b[3])];
      for(const o of hit.slice(1)){ g.ents.push(...o.ents); g.bb = [Math.min(g.bb[0], o.bb[0]), Math.min(g.bb[1], o.bb[1]), Math.max(g.bb[2], o.bb[2]), Math.max(g.bb[3], o.bb[3])]; G.splice(G.indexOf(o), 1); } }
    for(const g of G){ g.text = g.ents.filter(e => e.type === 'TEXT').sort((a, b) => b.y - a.y || a.x - b.x).map(e => String(e.text || '')).join(' ').trim(); g.key = key(g); }
    return G.sort((a, b) => b.bb[3] - a.bb[3] || a.bb[0] - b.bb[0]); }
  A.findMarkups = findMarkups;
  const doneK = () => 'dvd:mkdone:' + docBase();
  function assist(){ const G = findMarkups(); const P = panel('dvdMarkup', 'Trợ lý đánh dấu (Markup Assist)', 340); const done = new Set(LS(doneK(), []));
    const body = P.querySelector('.pb'); const render = () => { body.innerHTML = G.length ? G.map((g, i) => '<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)' + (done.has(g.key) ? ';opacity:.5' : '') + '"><b>' + (i + 1) + '.</b> ' + (g.text ? '“' + esc(g.text.slice(0, 120)) + '”' : '<i>(không có chữ)</i>') + ' <span style="opacity:.6">— ' + g.ents.length + ' đối tượng</span><br>' +
        '<button type="button" data-a="z" data-i="' + i + '">Phóng tới</button> <button type="button" data-a="t" data-i="' + i + '"' + (g.text ? '' : ' disabled') + '>Chèn chữ</button> <button type="button" data-a="c" data-i="' + i + '">Đám mây</button> <button type="button" data-a="d" data-i="' + i + '">' + (done.has(g.key) ? 'Chưa xong' : 'Đã xong') + '</button></div>').join('') : '<div style="opacity:.7;padding:8px 0">Không tìm thấy vết đánh dấu (màu đỏ hoặc lớp MARKUP). Nhập bản đánh dấu bằng MARKUPIMPORT.</div>'; };
    body.onclick = ev => { const b = ev.target.closest('[data-a]'); if(!b) return; const g = G[+b.dataset.i]; const a = b.dataset.a; const [x0, y0, x1, y1] = g.bb, w = x1 - x0 || 1, h = y1 - y0 || 1;
      if(a === 'z'){ try{ A.pushView && A.pushView(); const s = Math.min(W() / (w * 2), H() / (h * 2)); view.scale = s; view.rot = 0; view.offsetX = W() / 2 - (x0 + w / 2) * s; view.offsetY = H() / 2 + (y0 + h / 2) * s; draw(); }catch(_){} }
      if(a === 't'){ const th = Math.max(h / 6, (A.MEM && A.MEM.th) || 2.5); const t = A.newProps({ type: 'TEXT', x: x1 + w * 0.1, y: y1, h: th, rot: 0, text: g.text }); A.commit({ add: [t] }, 'MARKUPASSIST: đã chèn chữ “' + g.text.slice(0, 40) + '”'); }
      if(a === 'c'){ const m = Math.max(w, h) * 0.1, X0 = x0 - m, Y0 = y0 - m, X1 = x1 + m, Y1 = y1 + m; const arc = Math.max(w, h) / 6; const V = []; const edge = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / arc)); for(let k = 0; k < n; k++) V.push({ x: ax + (bx - ax) * k / n, y: ay + (by - ay) * k / n, bulge: -0.5 }); };
        edge(X0, Y0, X1, Y0); edge(X1, Y0, X1, Y1); edge(X1, Y1, X0, Y1); edge(X0, Y1, X0, Y0); const c = A.newProps({ type: 'POLYLINE', vertices: [], closed: true }); A.setBV(c, V); A.commit({ add: [c] }, 'MARKUPASSIST: đám mây sửa đổi quanh vết ' + (+b.dataset.i + 1)); }
      if(a === 'd'){ if(done.has(g.key)) done.delete(g.key); else done.add(g.key); SV(doneK(), [...done]); } render(); };
    render(); return G; }
  A.markupAssist = assist;
  plain(['MARKUPASSIST'], 'Trợ lý đánh dấu: tìm các vết đánh dấu đỏ (nét + chữ) trong bản vẽ / nền nhập vào; phóng tới, chèn chữ, vẽ đám mây, đánh dấu đã xong', () => { const G = assist(); log('MARKUPASSIST: ' + G.length + ' vết đánh dấu.'); });
  plain(['MARKUPCLOSE'], 'Đóng bảng đánh dấu', () => { const P = document.getElementById('dvdMarkup'); if(P) P.remove(); });
  async function importMarkup(f){ const n = f.name || ''; let add = [];
    if(/\.pdf$/i.test(n)){ const R = await A.pdfToEnts(new Uint8Array(await f.arrayBuffer()), 1, { k: 25.4 / 72 / uMM(), fill: true, text: true, max: 200000 }); for(const e of R.ents){ e.ull = 'MARKUP'; e.layer = 'MARKUP'; } add = A.makeUnderlay ? A.makeUnderlay('PDF', 'MARKUP_' + n.replace(/\.pdf$/i, ''), R.ents, { x: 0, y: 0 }, 0, R.size) : R.ents; }
    else if(/\.(dwfx|xps)$/i.test(n) && A.dwfAttach){ await A.dwfAttach(f); return true; }
    else if(/\.(png|jpe?g|gif|bmp|webp)$/i.test(n)){ const im = await A.imgAdd(f, n); const k = 25.4 / 96 / uMM(); const w = (im.el.naturalWidth || 800) * k, h = (im.el.naturalHeight || 600) * k; const e = A.newProps({ type: 'IMAGE', x: 0, y: 0, w, h, rot: 0, img: im.id, name: n, op: 1 }); e.layer = 'MARKUP'; delete e.lt; add = [e]; }
    else { say('Định dạng chưa hỗ trợ: ' + n); return false; }
    try{ A.addLayer('MARKUP', '#ff3b30'); }catch(_){} A.commit({ add }, 'MARKUPIMPORT: ' + n + ' trên lớp MARKUP (' + add.length + ' đối tượng)'); try{ fitView(); }catch(_){} return true; }
  A.markupImport = importMarkup;
  cmd(['MARKUPIMPORT'], 'Nhập bản đánh dấu (PDF / ảnh chụp bản in có ghi chú / DWFx) làm nền trên lớp MARKUP rồi mở trợ lý đánh dấu', async () => { const f = await pickFile('.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.dwfx,.xps'); if(!f) return; if(await importMarkup(f)) setTimeout(() => assist(), 300); });
  cmd(['OPENDWFMARKUP'], 'Mở tệp DWFx có đánh dấu (Autodesk Design Review) làm nền và bảng đánh dấu', async () => { const f = await pickFile('.dwfx,.xps,.dwf'); if(!f) return; if(A.dwfAttach){ await A.dwfAttach(f); setTimeout(() => assist(), 300); } else log('OPENDWFMARKUP: thiếu bộ đọc DWFx.'); });

  /* ===================== COMPAREEXPORT / COMPAREIMPORT ===================== */
  const isMark = e => /^DIFF\$/.test(e.layer || '') && !!e.dfo;
  async function compareWithFile(){ log('So sánh: chọn bản vẽ để so với bản hiện tại…'); const f = await pickFile('.dwg,.dxf'); if(!f || !A.parseRef || !A.diffEnts || !A.markDiff) return false; const kind = /\.dwg$/i.test(f.name) ? 'dwg' : 'dxf';
    let p; try{ p = await A.parseRef(kind, kind === 'dwg' ? await f.arrayBuffer() : await f.text()); }catch(_){ say('Không đọc được ' + f.name); return false; }
    const D = A.diffEnts(ME().filter(e => !e.xr && !isMark(e)), p.ents); A.markDiff(D, 'CMP'); return true; }
  A.compareWithEnts = (other, tag) => { const D = A.diffEnts(ME().filter(e => !e.xr && !isMark(e)), other); A.markDiff(D, tag || 'CMP'); return D; };
  cmd(['COMPAREEXPORT'], 'Xuất kết quả so sánh bản vẽ ra DXF: bản vẽ + đối tượng thêm (xanh) / mất (đỏ) + chú giải', async () => {
    if(!ME().some(isMark)){ if(!await compareWithFile()) return; }
    const M = ME().filter(isMark); const th = (A.MEM && A.MEM.th) || 2.5; const bb = A.bboxOf ? A.bboxOf(ME()) : null; const x = bb ? bb.x0 : 0, y = bb ? bb.y0 - th * 4 : 0; const C = A._lastCompare || {};
    const leg = [A.newProps({ type: 'TEXT', x, y, h: th, rot: 0, text: 'SO SÁNH BẢN VẼ — ' + docBase() + ' — ' + new Date().toLocaleString('vi-VN') }), Object.assign(A.newProps({ type: 'TEXT', x, y: y - th * 1.8, h: th * 0.8, rot: 0, text: 'Xanh: chỉ có ở bản so sánh (' + M.filter(e => /_THEM$/.test(e.layer)).length + ')' }), { col: '#22c55e' }), Object.assign(A.newProps({ type: 'TEXT', x, y: y - th * 3.4, h: th * 0.8, rot: 0, text: 'Đỏ: chỉ có ở bản hiện tại (' + M.filter(e => /_MAT$/.test(e.layer)).length + ')' }), { col: '#ef4444' })];
    for(const t of leg) delete t.bl; void C; const dxf = entitiesToDXF(ME().concat(leg)); const nm = docBase() + '_SoSanh.dxf'; await shareOrDownload(new Blob([dxf], { type: 'application/dxf' }), nm, 'application/dxf'); log('COMPAREEXPORT: đã xuất ' + nm + ' (' + M.length + ' đối tượng khác nhau).'); return nm; });
  cmd(['COMPAREIMPORT'], 'Lấy đối tượng của bản so sánh vào bản vẽ hiện tại: chọn đối tượng xanh (thêm) — Enter = tất cả', async () => {
    if(!ME().some(isMark)){ if(!await compareWithFile()) return; }
    const s = await A.getSel('Chọn đối tượng so sánh cần lấy vào <Tất cả>'); let L = ((s && s.sel) || []).filter(e => isMark(e) && /_THEM$/.test(e.layer)); if(!L.length) L = ME().filter(e => isMark(e) && /_THEM$/.test(e.layer)); if(!L.length){ log('COMPAREIMPORT: không có đối tượng thêm.'); return; }
    const rep = L.map(e => { const w = copy(e); const o = w.dfo; delete w.dfo; w.layer = o.layer; if(o.col) w.col = o.col; else delete w.col; if(o.bl) w.bl = o.bl; else delete w.bl; if(o.lw != null) w.lw = o.lw; else delete w.lw; return [e, w]; });
    A.commit({ rep }, 'COMPAREIMPORT: đã lấy ' + rep.length + ' đối tượng vào bản vẽ.'); });

  /* ===================== DBCONNECT ===================== */
  const DB = () => LS('dvd:db', {}); const saveDB = o => SV('dvd:db', o);
  async function loadTable(f){ const n = f.name; let rows;
    if(/\.(csv|tsv|txt)$/i.test(n)) rows = A.parseCSV(await f.text());
    else { const X = await A.loadXLSX(); const wb = X.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; rows = X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }); }
    rows = rows.filter(r => r.some(c => String(c).trim())); if(rows.length < 2) throw new Error('Bảng cần dòng tiêu đề + ít nhất 1 dòng dữ liệu.'); const head = rows[0].map((h, i) => String(h).trim() || ('Cột ' + (i + 1)));
    const T = { name: n.replace(/\.[^.]+$/, ''), cols: head, rows: rows.slice(1).map(r => head.map((_, i) => r[i] == null ? '' : String(r[i]))), key: 0 }; const D = DB(); D[T.name] = T; saveDB(D); return T; }
  A.dbAddTable = T => { const D = DB(); D[T.name] = Object.assign({ key: 0 }, T); saveDB(D); return D[T.name]; };
  A.dbTables = DB;
  const linkedTo = (tn, kv) => ME().filter(e => e.dbl && e.dbl.t === tn && String(e.dbl.k) === String(kv));
  A.dbLink = (ents, tn, kv) => { const rep = ents.map(e => { const w = copy(e); w.dbl = { t: tn, k: String(kv) }; return [e, w]; }); A.commit({ rep }, 'DBCONNECT: liên kết ' + rep.length + ' đối tượng với ' + tn + ' / ' + kv); return rep.length; };
  A.dbLabel = (e, T, fields) => { const row = T.rows.find(r => String(r[T.key]) === String(e.dbl.k)); if(!row) return null; const b = A.bboxOf([e]); const txt = fields.map(i => row[i]).filter(Boolean).join('\n'); const th = (A.MEM && A.MEM.th) || 2.5;
    const t = A.newProps({ type: 'TEXT', x: b ? (b.x0 + b.x1) / 2 : 0, y: b ? (b.y0 + b.y1) / 2 : 0, h: th, rot: 0, text: txt }); t.dbl = { t: T.name, k: e.dbl.k, lbl: fields }; return t; };
  function dbPanel(){ const P = panel('dvdDB', 'Kết nối dữ liệu (dbConnect)', 420); const body = P.querySelector('.pb'); let cur = Object.keys(DB())[0] || '', sel = -1;
    const render = () => { const D = DB(), T = D[cur]; body.innerHTML = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><select id="dbT">' + Object.keys(D).map(n => '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select><button type="button" data-a="add">＋ Bảng (CSV / Excel)</button>' + (T ? '<label>Khoá <select id="dbK">' + T.cols.map((c, i) => '<option value="' + i + '"' + (i === T.key ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' : '') + '</div>' +
      (T ? '<div class="lm-tbl" style="max-height:240px"><table style="width:100%"><thead><tr><th>#</th>' + T.cols.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + T.rows.map((r, i) => { const n = linkedTo(cur, r[T.key]).length; return '<tr data-i="' + i + '" style="cursor:pointer' + (i === sel ? ';background:var(--accent-soft,#2b4a6f)' : '') + '"><td>' + (n ? '🔗' + n : '') + '</td>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" data-a="lnk">Liên kết đối tượng đang chọn</button><button type="button" data-a="sel">Chọn đối tượng liên kết</button><button type="button" data-a="lbl">Nhãn</button><button type="button" data-a="view">Bản ghi của đối tượng chọn</button><button type="button" data-a="del">Xoá bảng</button></div>' : '<div style="opacity:.7">Chưa có bảng dữ liệu — bấm ＋ Bảng.</div>'); };
    body.addEventListener('change', ev => { if(ev.target.id === 'dbT'){ cur = ev.target.value; sel = -1; render(); } if(ev.target.id === 'dbK'){ const D = DB(); D[cur].key = +ev.target.value; saveDB(D); render(); } });
    body.addEventListener('click', async ev => { const tr = ev.target.closest('tr[data-i]'); if(tr){ sel = +tr.dataset.i; render(); return; } const b = ev.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a; const D = DB(), T = D[cur]; const S = [...(typeof selEnts !== 'undefined' ? selEnts : [])];
      if(a === 'add'){ const f = await pickFile('.csv,.tsv,.txt,.xlsx,.xls,.ods'); if(!f) return; try{ const t = await loadTable(f); cur = t.name; log('DBCONNECT: bảng ' + t.name + ' — ' + t.rows.length + ' dòng, ' + t.cols.length + ' cột.'); }catch(err){ say(err.message); } render(); return; }
      if(!T) return; const row = T.rows[sel];
      if(a === 'lnk'){ if(!row){ say('Chọn một dòng trong bảng.'); return; } if(!S.length){ say('Chọn đối tượng trên bản vẽ trước.'); return; } A.dbLink(S, cur, row[T.key]); render(); }
      if(a === 'sel'){ if(!row) return; const L = linkedTo(cur, row[T.key]); try{ selEnts.clear(); for(const e of L) selEnts.add(e); draw(); }catch(_){} log('DBCONNECT: ' + L.length + ' đối tượng liên kết với ' + row[T.key] + '.'); }
      if(a === 'view'){ const e = S.find(x => x.dbl); if(!e){ say('Đối tượng chọn chưa liên kết.'); return; } const T2 = D[e.dbl.t]; const r2 = T2 && T2.rows.find(r => String(r[T2.key]) === e.dbl.k); A.dialog({ title: 'Bản ghi — ' + e.dbl.t, noCancel: true, html: '<table>' + (r2 ? T2.cols.map((c, i) => '<tr><th style="text-align:left">' + esc(c) + '</th><td>' + esc(r2[i]) + '</td></tr>').join('') : '<tr><td>Không còn dòng ' + esc(e.dbl.k) + '</td></tr>') + '</table>' }); }
      if(a === 'lbl'){ const L = (S.length ? S : ME()).filter(e => e.dbl && e.dbl.t === cur && !e.dbl.lbl); const add = L.map(e => A.dbLabel(e, T, T.cols.map((_, i) => i).filter(i => i !== T.key).slice(0, 2).concat([T.key]))).filter(Boolean); if(add.length) A.commit({ add }, 'DBCONNECT: ' + add.length + ' nhãn.'); }
      if(a === 'del'){ if(!confirm('Xoá bảng ' + cur + '? (liên kết trên đối tượng vẫn giữ)')) return; delete D[cur]; saveDB(D); cur = Object.keys(D)[0] || ''; render(); } });
    render(); return P; }
  plain(['DBCONNECT', 'DBC', 'DBCCLOSE'], 'Kết nối dữ liệu: nạp bảng CSV / Excel, liên kết dòng với đối tượng, xem bản ghi, chọn đối tượng theo dòng, nhãn từ trường dữ liệu', () => { const P = document.getElementById('dvdDB'); if(P){ P.remove(); return; } dbPanel(); });
})();
