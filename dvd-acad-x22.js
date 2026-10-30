/* DVDCAD v5v — các lệnh nhỏ còn thiếu so với AutoCAD 2027
   CLOSEALLOTHER · ATTREDEF · PSETUPIN · PARTIALOPEN / PARTIALOAD · SYSVARMONITOR · QUICKPROPERTIES (QPMODE) · MVSETUP (khung tên)
   PLOTTERMANAGER · UPDATETHUMBSNOW
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x22 || !A.dialog || !A.acw || !window.DVDCmd) return; A._x22 = true;
  const K = A.acw;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const deep = o => JSON.parse(JSON.stringify(o));
  const pickFile = (accept, multi) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; if(multi) i.multiple = true; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(multi ? [...(i.files || [])] : (i.files && i.files[0] || null)); i.remove(); }; i.click(); });

  /* CLOSEALLOTHER — đóng mọi bản vẽ khác, giữ bản đang mở */
  plain(['CLOSEALLOTHER'], 'Đóng mọi bản vẽ (tab) khác, giữ bản vẽ đang mở', () => {
    const T = A.TABS || []; if(T.length < 2){ log('Chỉ có một bản vẽ đang mở.'); return; }
    const bk = typeof baseKey !== 'undefined' ? baseKey : null; const cur = T.find(t => bk != null && t.key === bk) || T.find(t => t.name === currentName); if(!cur){ log('Không xác định được bản vẽ đang mở.'); return; }
    const others = T.filter(t => t !== cur);
    if(!confirm('Đóng ' + others.length + ' bản vẽ khác? Thay đổi chưa lưu ở các bản vẽ đó sẽ mất.')) return;
    for(const t of others) try{ A.closeTab(t.id); }catch(_){}
    log('CLOSEALLOTHER: đã đóng ' + others.length + ' bản vẽ.');
  });

  /* ATTREDEF — định nghĩa lại khối có thuộc tính, cập nhật mọi bản chèn (giữ giá trị thuộc tính theo thẻ) */
  ecmd(['ATTREDEF'], 'Định nghĩa lại khối có thuộc tính: chọn đối tượng mới, điểm gốc; mọi bản chèn cập nhật, giữ giá trị thuộc tính cùng thẻ', async () => {
    const names = new Set(); try{ for(const n of A.fileBlockNames()) names.add(n); }catch(_){} try{ for(const n of Object.keys(A.blockLib())) names.add(n); }catch(_){} for(const e of ME()) if(e.bm && e.bm.name) names.add(e.bm.name);
    const r = await A.getStr('Nhập tên khối cần định nghĩa lại'); const v = String(r.str || '').trim(); if(!v) return; const name = [...names].find(n => n.toLowerCase() === v.toLowerCase()); if(!name){ log('Không có khối "' + v + '".'); return; }
    const s = await A.getSel('Chọn đối tượng cho khối mới', { pre: false, filter: e => !e.grp || e.grp === undefined }); const sel = (s.sel || []).filter(e => !e.grp); if(!sel.length) return;
    const b = await A.getPoint('Chỉ định điểm gốc của khối mới'); if(!b.pt) return;
    // bản chèn cũ: vị trí, tỉ lệ, góc, lớp, giá trị thuộc tính
    const groups = new Map(); for(const e of ME()) if(e.grp && e.bm && e.bm.name === name){ let L = groups.get(e.grp); if(!L){ L = []; groups.set(e.grp, L); } L.push(e); }
    const olds = [...groups.values()].map(L => { const h = L[0], m = h.bm; const vals = {}; for(const e of L) if(e.att) vals[e.att] = e.text; return { L, ip: h.bip || { x: m.e, y: m.f }, sc: Math.hypot(m.a, m.b) || 1, rot: Math.atan2(m.b, m.a) * 180 / Math.PI, lay: m.lay || h.layer || A.LS.cur, vals }; });
    A.makeBlock(sel, b.pt, name);   // định nghĩa mới (thư viện) — đối tượng chọn thành một bản chèn
    const del = [], add = [], sv = A.LS.cur; let kept = 0;
    for(const o of olds){ try{ A.LS.cur = o.lay; const N = A.instBlock(name, 'lib', o.ip, o.sc, o.rot); for(const e of N){ delete e.userAdded; if(e.att && o.vals[e.att] != null){ e.text = o.vals[e.att]; kept++; } } del.push(...o.L); add.push(...N); }finally{ A.LS.cur = sv; } }
    if(del.length) A.commit({ del, add }, 'ATTREDEF "' + name + '"');
    log('ATTREDEF: khối "' + name + '" định nghĩa lại, ' + olds.length + ' bản chèn cập nhật, giữ ' + kept + ' giá trị thuộc tính.');
  });

  /* PSETUPIN — nhập thiết lập trang có tên từ bản vẽ khác (DXF: PLOTSETTINGS / LAYOUT; bản vẽ DVDCAD: DVDCAD_DATA) */
  const PAPERS_RE = /(?:^|_)A(\d)(?:_|$)/i;
  // một thiết lập in (mã nhóm DXF: 2 máy in, 4 khổ giấy, 7 bảng kiểu in, 70 cờ, 73 xoay, 74 vùng in, 75 tỉ lệ chuẩn, 142 / 143 tỉ lệ) → thiết lập trang DVDCAD
  function psFrom(cur){ const P = {}; const paper = cur[4] || ''; const pk = A.paperFromMedia && A.paperFromMedia(paper); const m = pk ? null : PAPERS_RE.exec(paper.replace(/ISO_(full_bleed_|expand_)?/i, '')); if(pk) P.paper = pk; else if(m) P.paper = 'A' + m[1];
    else { const q = /^(ANSI|ARCH)_(?:full_bleed_|expand_)?(E1|[A-E])_/i.exec(paper); if(q && A.PAPER_SIZES && A.PAPER_SIZES[q[1].toUpperCase() + '_' + q[2].toUpperCase()]) P.paper = q[1].toUpperCase() + '_' + q[2].toUpperCase();
      else { const d = /\(([\d.]+)_x_([\d.]+)_(MM|Inches|Pixels)\)/i.exec(paper), k = d && /inch/i.test(d[3]) ? 25.4 : 1; if(d && !/pixel/i.test(d[3])){ P.paper = 'custom'; P.cw = +(+d[1] * k).toFixed(2); P.ch = +(+d[2] * k).toFixed(2); } } }
    const dims = /\(([\d.]+)_x_([\d.]+)_(MM|Inches)\)/i.exec(paper); const wide = dims ? +dims[1] >= +dims[2] : (cur.pw > 0 && cur.ph > 0 ? cur.pw >= cur.ph : true); const rot = +(cur[73] || 0); P.land = (rot % 2 === 1) ? !wide : wide;
    const pt = cur[74] == null || cur[74] === '' ? 1 : +cur[74]; P.area = pt === 0 || pt === 3 ? 'display' : pt === 4 ? 'window' : 'extents';
    const fl = +(cur[70] || 0); P.center = !!(fl & 4); P.lw = !!(fl & 128) || !(fl & 32);
    // tỉ lệ: cờ 16 = dùng tỉ lệ chuẩn (75 = 0 → vừa khổ giấy, khác 0 → hệ số 147); không có cờ 16 → tỉ lệ riêng 142 : 143
    const num = +(cur[142] || 1), den = +(cur[143] || 1), std = +(cur[75] || 0), f147 = +(cur[147] || 0);
    if((fl & 16) && std === 0) P.fit = true; else { P.fit = false; const sc = (fl & 16) ? (f147 > 0 ? 1 / f147 : null) : (num > 0 ? den / num : null); if(sc > 0) P.scale = +sc.toPrecision(6); }
    const ctb = String(cur[7] || '').toLowerCase(); P.style = /mono/.test(ctb) ? 'mono' : /gray/.test(ctb) ? 'gray' : ctb ? 'mono' : 'color';
    const dev = String(cur[2] || '').toLowerCase(); P.dev = /high quality/.test(dev) ? 'pdfhq' : /smallest/.test(dev) ? 'pdfsm' : /general doc/.test(dev) ? 'pdfgd' : /web and mobile/.test(dev) ? 'pdfwm' : /default windows/.test(dev) ? 'defprn' : /dwfx/.test(dev) ? 'dwfx' : /dwf6|dwf\.pc3|eplot/.test(dev) ? 'dwf' : /pdf/.test(dev) ? 'pdf' : /jpg|jpeg/.test(dev) ? 'jpg' : /png|publishtoweb/.test(dev) ? 'png' : /hpgl|designjet|\.pc3/.test(dev) && !/pdf|png/.test(dev) ? 'plt' : dev && !/none_device/.test(dev) ? 'sys:' + String(cur[2]) : 'print';   // tên máy in Windows
    return P; }
  // DXF: PLOTSETTINGS (thiết lập trang có tên) + thiết lập riêng của từng LAYOUT (tên *Layout1* như Page Setup Manager của AutoCAD)
  function setupsFromDXF(text, opt){
    const out = {}, lay = {}; const t = String(text); let i = t.search(/\n\s*0\s*\r?\n\s*OBJECTS\s*\r?\n/); if(i < 0) i = 0;
    const lines = t.slice(i).replace(/\r/g, '').split('\n'); let cur = null;
    const flush = () => { if(!cur){ return; } if(cur.name) out[cur.name] = psFrom(cur); else if(cur.kind === 'LAYOUT' && cur.layName) lay['*' + cur.layName + '*'] = psFrom(cur); cur = null; };
    for(let k = 0; k + 1 < lines.length; k += 2){ const c = parseInt(lines[k], 10), v = lines[k + 1].trim(); if(!isFinite(c)) continue;
      if(c === 0){ flush(); if(v === 'PLOTSETTINGS' || v === 'LAYOUT') cur = { kind: v }; continue; }
      if(!cur) continue; if(c === 100 && v === 'AcDbLayout'){ cur.lay = true; continue; }
      if(c === 1 && cur.lay && cur.layName == null){ cur.layName = v; continue; }
      if(c === 1 && !cur.lay && cur.name == null){ cur.name = v; continue; } if([2, 4, 7, 70, 73, 74, 75, 142, 143, 147].includes(c) && !cur.lay && cur[c] == null) cur[c] = v; if((c === 44 || c === 45) && !cur.lay) cur[c === 44 ? 'pw' : 'ph'] = +v; }
    flush(); delete out['']; return opt && opt.layouts ? { named: out, layouts: lay } : out;
  }
  // DWG (đọc trong khung ẩn): thiết lập in của LAYOUT + PLOTSETTINGS có tên → cùng dạng mã nhóm như DXF
  const psCodes = q => ({ 2: q.printer, 4: q.media, 7: q.style, 70: q.flags, 73: q.rot, 74: q.type, 75: q.stdType, 142: q.pu, 143: q.du, 147: q.stdFactor, pw: q.pw, ph: q.ph });
  A.setupsFromDWGFrame = w => { const named = {}, layouts = {}; let unread = 0;
    try{ for(const q of (w._dwgPageSetups || [])){ if(!q || q.unreadable){ unread++; continue; } if(q.name) named[q.name] = psFrom(psCodes(q)); } }catch(_){}
    try{ for(const L of (w.eval('dwgLayouts') || [])) if(L && L.plot) layouts['*' + L.name + '*'] = psFrom(psCodes(L.plot)); }catch(_){}
    return { named, layouts, unread }; };
  A.setupsFromDXF = setupsFromDXF;
  A.psetupIn = async () => {
    const f = await pickFile('.dxf,.dwg'); if(!f) return null; let found = {}, lays = {}, unread = 0;
    try{
      if(/\.dxf$/i.test(f.name)){ const t = await f.text(); const R = setupsFromDXF(t, { layouts: true }); found = R.named; lays = R.layouts; const m = /\n\s*1\s*\r?\n\s*DVDCAD1\s*\r?\n/.exec(t); if(m){ let js = ''; const L = t.slice(m.index + m[0].length).replace(/\r/g, '').split('\n'); for(let k = 0; k + 1 < L.length; k += 2){ const c = parseInt(L[k], 10); if(c === 0) break; if(c === 300) js += L[k + 1]; } try{ const o = JSON.parse(js); if(o.psu) Object.assign(found, o.psu); }catch(_){} } }
      else if(A.dwgConvertFiles){ const nm = f.name; try{ localStorage.removeItem('dvd:psetups::' + nm); }catch(_){} let R = null; await A.dwgConvertFiles([f], 'DXF:R2018', null, w => { R = A.setupsFromDWGFrame(w); }); found = Object.assign({}, R ? R.named : {}, lsGet('dvd:psetups::' + nm, {}) || {}); if(R){ lays = R.layouts; unread = R.unread; } }
    }catch(err){ log('PSETUPIN: ' + (err.message || err)); return null; }
    if(unread) log('PSETUPIN: ' + unread + ' thiết lập trang có tên trong tệp DWG không đọc được — lưu tệp thành DXF trong AutoCAD rồi nhập để lấy đủ.');
    for(const [k, v] of Object.entries(lays)) if(!found[k]) found[k] = Object.assign({ _lay: 1 }, v);
    const names = Object.keys(found); if(!names.length){ log('PSETUPIN: tệp "' + f.name + '" không có thiết lập trang có tên.'); return null; }
    return new Promise(res => { const cur = A.pageSetups();
      A.dialog({ title: 'Nhập thiết lập trang', cls: 'acw-free', help: 'PSETUPIN', html: '<div class="acw" style="width:380px"><div class="acw-note" translate="no">' + esc(f.name) + '</div>' + names.map((n, i) => '<div class="acw-row">' + K.chk('psi' + i, n + (found[n]._lay ? ' — thiết lập của layout' : '') + (cur[n] ? ' (ghi đè)' : ''), found[n]._lay ? 0 : 1) + '</div>').join('') + '</div>',
        ok: r => { const L = A.pageSetups(), got = []; names.forEach((n, i) => { if(r.querySelector('#psi' + i).checked){ const v = Object.assign({}, found[n]); delete v._lay; L[n] = v; got.push(n); } }); A.pageSetupsSave(L); log('PSETUPIN: nhập ' + got.length + ' thiết lập trang (' + got.join(', ') + ').'); res(got); }, cancel: () => res(null) }); });
  };
  plain(['PSETUPIN'], 'Nhập thiết lập trang có tên (page setup) từ bản vẽ khác (.dxf / .dwg, cả thiết lập của từng layout) — dùng trong hộp PLOT', () => A.psetupIn());

  /* PARTIALOPEN / PARTIALOAD — mở một phần bản vẽ theo lớp, nạp thêm lớp sau */
  let PART = null;   // { name, file, kind, data, layers (đã nạp), all }
  const layersOf = () => { const s = new Map(); for(const e of ME()){ const l = e.layer || '0'; s.set(l, (s.get(l) || 0) + 1); } return s; };
  function layerDlg(title, list, checked, note){ return new Promise(res => A.dialog({ title, cls: 'acw-free', help: 'PARTIALOPEN', html: '<div class="acw" style="width:400px"><div class="acw-row">' + K.btn('poAll', 'Chọn hết') + K.btn('poNone', 'Bỏ hết') + '</div><div style="max-height:300px;overflow:auto;border:1px solid #5a6578;padding:4px;margin-top:4px">' + list.map(([n, c], i) => '<div class="acw-row">' + K.chk('po' + i, '<span translate="no">' + esc(n) + '</span> <span style="color:#9aa6ba">(' + c + ')</span>', checked(n)) + '</div>').join('') + '</div>' + (note ? '<div class="acw-note" style="white-space:normal">' + note + '</div>' : '') + '</div>',
    onOpen: r => { r.querySelector('#poAll').onclick = () => r.querySelectorAll('input[type=checkbox]').forEach(x => { x.checked = true; }); r.querySelector('#poNone').onclick = () => r.querySelectorAll('input[type=checkbox]').forEach(x => { x.checked = false; }); },
    ok: r => res(list.filter((_, i) => r.querySelector('#po' + i).checked).map(x => x[0])), cancel: () => res(null) })); }
  plain(['PARTIALOPEN', '-PARTIALOPEN'], 'Mở một phần bản vẽ: chỉ nạp hình học trên các lớp chọn (PARTIALOAD nạp thêm lớp sau)', async () => {
    const f = await pickFile('.dwg,.dxf'); if(!f) return; const buf = await f.arrayBuffer(); const kind = /\.dwg$/i.test(f.name) ? 'dwg' : 'dxf';
    if(kind === 'dwg') await loadDWG(buf.slice(0), f.name); else loadDXF(new TextDecoder().decode(buf), f.name);
    await new Promise(r => setTimeout(r, 300)); const all = [...layersOf().entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'));
    const pick = await layerDlg('Mở một phần — chọn lớp', all, () => true, 'Chỉ hình học trên các lớp chọn được nạp. Lớp khác vẫn có trong bảng lớp; nạp thêm bằng PARTIALOAD.'); if(!pick) { PART = null; return; }
    const keep = new Set(pick); const del = ME().filter(e => !keep.has(e.layer || '0'));
    PART = { name: f.name, kind, data: buf, layers: keep, all: all.map(x => x[0]) };
    if(del.length){ A.commit({ del }, 'PARTIALOPEN'); try{ if(typeof editUndoStack !== 'undefined') editUndoStack.length = 0; }catch(_){} }
    log('PARTIALOPEN: ' + f.name + ' — nạp ' + keep.size + '/' + all.length + ' lớp (' + ME().length + ' đối tượng).');
  });
  plain(['PARTIALOAD'], 'Nạp thêm hình học của các lớp chưa nạp từ bản vẽ đã mở một phần (PARTIALOPEN)', async () => {
    if(!PART || PART.name !== currentName){ log('Bản vẽ không được mở bằng PARTIALOPEN.'); return; }
    const rest = PART.all.filter(n => !PART.layers.has(n)); if(!rest.length){ log('Đã nạp mọi lớp.'); return; }
    const pick = await layerDlg('Nạp thêm lớp', rest.map(n => [n, '']), () => false, 'Hình học trên các lớp chọn được nạp thêm vào bản vẽ (giữ nguyên các thay đổi đã làm).'); if(!pick || !pick.length) return;
    if(!A.dwgConvertFiles){ log('Thiếu bộ đọc ẩn (DWGCONVERT).'); return; }
    // đọc lại tệp trong khung ẩn, lấy đối tượng của các lớp chọn (đổi mã nhóm để không trùng)
    const want = new Set(pick); let got = [];
    const f = new File([PART.data], PART.name);
    await A.dwgConvertFiles([f], 'DXF:R2018', null, w => { got = deep(w.eval('modelEntities').filter(e => want.has(e.layer || '0'))); });
    const map = new Map(); for(const e of got){ delete e.userAdded; if(e.grp){ let g = map.get(e.grp); if(!g){ g = A.newGroupId('P'); map.set(e.grp, g); } e.grp = g; } }
    if(got.length) A.commit({ add: got }, 'PARTIALOAD'); for(const n of pick) PART.layers.add(n);
    log('PARTIALOAD: nạp thêm ' + pick.length + ' lớp (' + got.length + ' đối tượng).');
  });

  /* SYSVARMONITOR — theo dõi biến hệ thống, báo khi khác giá trị mong muốn, đặt lại */
  const SVM_K = 'dvd:svmon';
  const SVM_DEF = ['FILEDIA', 'CMDDIA', 'PICKADD', 'PICKAUTO', 'PICKFIRST', 'OSMODE', 'ORTHOMODE', 'SNAPMODE', 'GRIDMODE', 'LTSCALE', 'DYNMODE', 'SELECTIONPREVIEW'];
  const SVM = Object.assign({ on: 1, list: null }, lsGet(SVM_K, {}));
  const svGet = n => { try{ return A.sysvar ? A.sysvar.get(n) : undefined; }catch(_){ return undefined; } };
  if(!SVM.list){ SVM.list = {}; for(const n of SVM_DEF){ const v = svGet(n); if(v !== undefined) SVM.list[n] = v; } lsSet(SVM_K, SVM); }
  const svDiff = () => Object.entries(SVM.list).filter(([n, v]) => { const c = svGet(n); return c !== undefined && String(c) !== String(v); });
  let svmLast = '';
  setInterval(() => { if(!SVM.on) return; try{ const D = svDiff(); const k = D.map(x => x[0]).join(','); if(k && k !== svmLast) log('Biến hệ thống khác giá trị mong muốn: ' + D.map(([n, v]) => n + ' = ' + svGet(n) + ' (mong muốn ' + v + ')').join(', ') + ' — SYSVARMONITOR để đặt lại.'); svmLast = k; }catch(_){} }, 3000);
  plain(['SYSVARMONITOR', 'SYSVARMON'], 'Theo dõi biến hệ thống (System Variable Monitor): giá trị mong muốn / hiện tại, báo khi đổi, đặt lại tất cả', () => {
    const html = '<div class="acw" style="width:520px"><div class="lm-grid" style="height:260px"><table><thead><tr><th>Biến</th><th style="width:110px">Mong muốn</th><th style="width:110px">Hiện tại</th><th style="width:50px"></th></tr></thead><tbody id="smB"></tbody></table></div>' +
      '<div class="acw-row" style="margin-top:4px">' + K.txt('smN', '', { ph: 'Tên biến (vd MIRRTEXT)' }) + K.btn('smAdd', 'Thêm') + K.btn('smDel', 'Bỏ') + K.btn('smKeep', 'Lấy giá trị hiện tại') + '</div>' +
      '<div class="acw-row">' + K.chk('smOn', 'Báo khi biến hệ thống khác giá trị mong muốn', SVM.on) + '</div></div>';
    let sel = null;
    const d = A.dialog({ title: 'Theo dõi biến hệ thống', cls: 'acw-free', help: 'SYSVARMONITOR', html, okText: 'Đặt lại tất cả', cancelText: 'Đóng',
      ok: () => { let n = 0; for(const [k, v] of Object.entries(SVM.list)){ if(String(svGet(k)) !== String(v)){ try{ if(A.sysvar.set(k, v)) n++; }catch(_){} } } log('SYSVARMONITOR: đặt lại ' + n + ' biến hệ thống.'); svmLast = ''; } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { $('smB').innerHTML = Object.entries(SVM.list).map(([n, v]) => { const c = svGet(n), bad = c !== undefined && String(c) !== String(v); return '<tr data-n="' + esc(n) + '"' + (n === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(n) + '</td><td>' + esc(v) + '</td><td' + (bad ? ' style="color:#ffb347;font-weight:600"' : '') + '>' + esc(c === undefined ? '—' : c) + '</td><td>' + (bad ? '⚠' : '✓') + '</td></tr>'; }).join(''); };
    $('smB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(tr){ sel = tr.dataset.n; render(); } });
    $('smAdd').onclick = () => { const n = $('smN').value.trim().toUpperCase(); if(!n) return; const v = svGet(n); if(v === undefined){ say('Không có biến hệ thống ' + n + '.'); return; } SVM.list[n] = v; lsSet(SVM_K, SVM); $('smN').value = ''; sel = n; render(); };
    $('smDel').onclick = () => { if(sel){ delete SVM.list[sel]; sel = null; lsSet(SVM_K, SVM); render(); } };
    $('smKeep').onclick = () => { if(sel){ SVM.list[sel] = svGet(sel); lsSet(SVM_K, SVM); render(); } };
    $('smOn').onchange = () => { SVM.on = $('smOn').checked ? 1 : 0; lsSet(SVM_K, SVM); };
    render();
  });

  /* QUICKPROPERTIES — bảng thuộc tính nhanh cạnh đối tượng chọn (QPMODE) */
  const QP_K = 'dvd:qpmode'; let QPMODE = lsGet(QP_K, 0) ? 1 : 0; let qpEl = null, qpSig = '';
  if(A.sysvar && A.sysvar.def) try{ A.sysvar.def('QPMODE', { d: 'Bảng thuộc tính nhanh khi chọn đối tượng (0 tắt, 1 bật)', get: () => QPMODE, set: v => { QPMODE = +v ? 1 : 0; lsSet(QP_K, QPMODE); if(!QPMODE) qpHide(); } }); }catch(_){}
  const qpCss = document.createElement('style'); qpCss.textContent = `.qp-pal{position:absolute;z-index:31;background:#2b313b;border:1px solid #5d697e;border-radius:3px;box-shadow:0 3px 12px rgba(0,0,0,.45);color:#e8ecf2;font:12px system-ui,sans-serif;width:230px}
  .qp-pal .h{padding:4px 8px;background:#3b4453;display:flex;justify-content:space-between;align-items:center}.qp-pal .h b{font-weight:600}.qp-pal .h button{background:none;border:0;color:#cfd6e0;cursor:pointer}
  .qp-pal .r{display:grid;grid-template-columns:80px 1fr;gap:4px;padding:3px 8px;align-items:center}.qp-pal select,.qp-pal input{height:20px;font:12px inherit;background:#1f242c;color:#e8ecf2;border:1px solid #4d5869;min-width:0}`;
  document.head.appendChild(qpCss);
  function qpHide(){ if(qpEl){ qpEl.remove(); qpEl = null; } qpSig = ''; }
  const TN = { LINE: 'Đường thẳng', POLYLINE: 'Đa tuyến', CIRCLE: 'Đường tròn', ARC: 'Cung', ELLIPSE: 'Elip', TEXT: 'Chữ', HATCH: 'Hatch', POINT: 'Điểm', SOLID: 'Mặt tô', SOLID3D: 'Khối 3D', IMAGE: 'Ảnh' };
  function qpShow(L){
    const cv = document.getElementById('cv'); if(!cv || !cv.parentElement) return; qpHide(); const e0 = L[0], same = L.every(e => e.type === e0.type);
    const el = document.createElement('div'); el.className = 'qp-pal'; const lays = A.layerNames ? A.layerNames() : ['0']; const lay0 = L.every(e => (e.layer || '0') === (e0.layer || '0')) ? (e0.layer || '0') : '';
    const col0 = L.every(e => !!e.bl === !!e0.bl && (e.bl || e.col === e0.col)) ? (e0.bl ? 'BYLAYER' : e0.col || '') : '';
    let geo = ''; if(L.length === 1){ const e = e0; if(e.type === 'LINE') geo = '<div class="r"><span>Dài</span><span>' + (+Math.hypot(e.x2 - e.x1, e.y2 - e.y1).toFixed(4)) + '</span></div>'; else if(e.type === 'CIRCLE' || e.type === 'ARC') geo = '<div class="r"><span>Bán kính</span><input data-q="r" value="' + (+e.r.toFixed(6)) + '"></div>'; else if(e.type === 'TEXT') geo = '<div class="r"><span>Nội dung</span><input data-q="text" value="' + esc(e.text || '') + '"></div><div class="r"><span>Cao chữ</span><input data-q="h" value="' + (+(e.h || 2.5).toFixed(6)) + '"></div>'; }
    el.innerHTML = '<div class="h"><b>' + esc(same ? (TN[e0.type] || e0.type) : 'Nhiều loại') + (L.length > 1 ? ' (' + L.length + ')' : '') + '</b><button type="button" data-a="x" title="Đóng">✕</button></div>' +
      '<div class="r"><span>Lớp</span><select data-q="layer">' + (lay0 ? '' : '<option value="">*Khác nhau*</option>') + lays.map(n => '<option value="' + esc(n) + '"' + (n === lay0 ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div>' +
      '<div class="r"><span>Màu</span><select data-q="col">' + (col0 === '' ? '<option value="">*Khác nhau*</option>' : '') + [['BYLAYER', 'ByLayer'], ['#ff0000', 'Đỏ'], ['#ffff00', 'Vàng'], ['#00ff00', 'Xanh lá'], ['#00ffff', 'Lục lam'], ['#0000ff', 'Xanh dương'], ['#ff00ff', 'Tím'], ['#ffffff', 'Trắng']].concat(col0 && col0 !== 'BYLAYER' && !/^#(ff0000|ffff00|00ff00|00ffff|0000ff|ff00ff|ffffff)$/i.test(col0) ? [[col0, col0]] : []).map(([v, t]) => '<option value="' + v + '"' + (String(v).toLowerCase() === String(col0).toLowerCase() ? ' selected' : '') + '>■ ' + t + '</option>').join('') + '</select></div>' + geo;
    cv.parentElement.appendChild(el); qpEl = el;
    let bb = null; try{ bb = A.bboxOf ? A.bboxOf(L) : null; }catch(_){} const r = cv.getBoundingClientRect(), pr = cv.parentElement.getBoundingClientRect(); let x = r.width - 250, y = 40;
    if(bb){ const q = toScreen(bb.x1, bb.y1); x = Math.min(r.width - 240, Math.max(8, q.x + 16)); y = Math.min(r.height - 160, Math.max(8, q.y - 10)); } el.style.left = (x + r.left - pr.left) + 'px'; el.style.top = (y + r.top - pr.top) + 'px';
    el.addEventListener('click', ev => { if(ev.target.closest('[data-a=x]')) qpHide(); });
    el.addEventListener('keydown', ev => ev.stopPropagation());
    el.addEventListener('change', ev => { const k = ev.target.dataset.q; if(!k) return; const v = ev.target.value; if(v === '') return; const rep = [];
      for(const e of [...selEnts]){ const w = deep(e); delete w.userAdded;
        if(k === 'layer'){ w.layer = v; if(w.bl) w.col = A.layerHex(v); }
        else if(k === 'col'){ if(v === 'BYLAYER'){ w.bl = 1; w.col = A.layerHex(w.layer || '0'); } else { delete w.bl; w.col = v; } }
        else if(k === 'r'){ const x2 = parseFloat(v.replace(',', '.')); if(x2 > 0 && (w.type === 'CIRCLE' || w.type === 'ARC')) w.r = x2; else continue; }
        else if(k === 'text'){ if(w.type === 'TEXT') w.text = v; else continue; }
        else if(k === 'h'){ const x2 = parseFloat(v.replace(',', '.')); if(x2 > 0 && w.type === 'TEXT') w.h = x2; else continue; }
        rep.push([e, w]); }
      if(rep.length){ A.commit({ rep }, 'Thuộc tính nhanh'); setTimeout(() => { try{ selEnts.clear(); for(const [, w] of rep) selEnts.add(w); refreshPanSel(); }catch(_){} }, 0); } });
  }
  setInterval(() => { try{ if(!QPMODE || (A.busy && A.busy())){ if(qpEl && (!QPMODE)) qpHide(); return; } const L = typeof selEnts !== 'undefined' ? [...selEnts] : []; if(!L.length){ if(qpEl) qpHide(); return; }
      const sig = L.length + ':' + L.slice(0, 20).map(e => e.type + (e.layer || '') + (e.x1 || e.cx || e.x || 0)).join('|'); if(sig === qpSig && qpEl) return; if(qpEl && qpEl.contains(document.activeElement)) return; qpSig = sig; qpShow(L.slice(0, 2000)); }catch(_){} }, 350);
  plain(['QUICKPROPERTIES', 'QP'], 'Bảng thuộc tính nhanh (Quick Properties): bật / tắt bảng nhỏ cạnh đối tượng chọn — lớp, màu, kích thước chính (QPMODE)', () => { QPMODE = QPMODE ? 0 : 1; lsSet(QP_K, QPMODE); if(!QPMODE) qpHide(); else qpSig = ''; log('Thuộc tính nhanh: ' + (QPMODE ? 'bật (chọn đối tượng để xem)' : 'tắt') + ' — QPMODE = ' + QPMODE); });

  /* MVSETUP — khung bản vẽ + khung tên theo khổ giấy và tỉ lệ (tuỳ chọn Title block như AutoCAD) */
  const PAPER = { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] };
  ecmd(['MVSETUP'], 'Thiết lập bản vẽ (MVSETUP): khung bản vẽ + khung tên theo khổ giấy (A0–A4) và tỉ lệ', async () => {
    const k = await A.getKw('Nhập tuỳ chọn', { kw: [{ k: 'T', t: 'Khung tên' }, { k: 'O', t: 'Tuỳ chọn' }], def: 'Khung tên' });
    if(k.kw === 'O'){ log('MVSETUP: khung tên vẽ trên lớp hiện hành; tỉ lệ dùng đơn vị bản vẽ (mm).'); }
    const p = await A.getKw('Khổ giấy', { kw: [{ k: 'A0', t: 'A0' }, { k: 'A1', t: 'A1' }, { k: 'A2', t: 'A2' }, { k: 'A3', t: 'A3' }, { k: 'A4', t: 'A4' }], def: 'A3' }); const pk = p.kw || 'A3';
    const o = await A.getKw('Hướng giấy', { kw: [{ k: 'L', t: 'Ngang' }, { k: 'P', t: 'Dọc' }], def: pk === 'A4' ? 'Dọc' : 'Ngang' }); const land = o.kw ? o.kw === 'L' : pk !== 'A4';
    const s = await A.getNum('Tỉ lệ bản vẽ 1 :', { def: 1 }); const sc = s.num > 0 ? s.num : 1;
    const b = await A.getPoint('Chỉ định góc dưới trái của khung', { def: '0,0' }); const o0 = b.pt || { x: 0, y: 0 };
    let [W, H] = PAPER[pk]; if(!land) [W, H] = [H, W]; W *= sc; H *= sc;
    const mL = 20 * sc, m = (pk === 'A4' || pk === 'A3' ? 5 : 10) * sc; const out = [], L = (x1, y1, x2, y2, lw) => { const e = A.newProps({ type: 'LINE', x1: o0.x + x1, y1: o0.y + y1, x2: o0.x + x2, y2: o0.y + y2 }); if(lw) e.lw = lw; out.push(e); };
    const T = (x, y, h, t, ha) => out.push(A.newProps({ type: 'TEXT', x: o0.x + x, y: o0.y + y, h: h * sc, text: t, rot: 0, ha: ha || 'left', va: 'middle' }));
    // mép giấy, khung bản vẽ (lề trái 20 mm để đóng tập), khung tên 180 × 56 mm ở góc dưới phải
    L(0, 0, W, 0, 18); L(W, 0, W, H, 18); L(W, H, 0, H, 18); L(0, H, 0, 0, 18);
    L(mL, m, W - m, m, 70); L(W - m, m, W - m, H - m, 70); L(W - m, H - m, mL, H - m, 70); L(mL, H - m, mL, m, 70);
    const tw = 180 * sc, th = 56 * sc, tx = W - m - tw, ty = m;
    L(tx, ty, tx, ty + th, 50); L(tx, ty + th, tx + tw, ty + th, 50);
    for(const f of [8, 16, 24, 32, 40, 48]) L(tx, ty + f * sc, tx + 70 * sc, ty + f * sc, 25);
    for(const f of [17, 40, 58]) L(tx + f * sc, ty, tx + f * sc, ty + th, 25);
    L(tx + 70 * sc, ty, tx + 70 * sc, ty + th, 50); L(tx + 70 * sc, ty + 20 * sc, tx + tw, ty + 20 * sc, 50); L(tx + 70 * sc, ty + 38 * sc, tx + tw, ty + 38 * sc, 50); L(tx + 140 * sc, ty, tx + 140 * sc, ty + 20 * sc, 25);
    const lab = [['Thiết kế', 44], ['Vẽ', 36], ['Kiểm tra', 28], ['Duyệt', 20], ['', 12], ['', 4]]; for(const [t, y] of lab) if(t) T(tx + 1.5 * sc, ty + y * sc, 2.5, t);
    T(tx + 125 * sc, ty + 47 * sc, 5, 'TÊN BẢN VẼ', 'center'); T(tx + 125 * sc, ty + 29 * sc, 3.5, 'TÊN CÔNG TRÌNH', 'center'); T(tx + 105 * sc, ty + 10 * sc, 3.5, 'ĐƠN VỊ', 'center');
    T(tx + 160 * sc, ty + 14 * sc, 2.5, 'Tỉ lệ 1:' + (+sc.toPrecision(6)), 'center'); T(tx + 160 * sc, ty + 6 * sc, 2.5, 'Tờ ' + pk, 'center');
    const gid = A.newGroupId('TB'); for(const e of out){ e.grp = gid; e.blk = '*TITLEBLOCK'; }
    A.commit({ add: out }, 'MVSETUP'); log('MVSETUP: khung ' + pk + ' ' + (land ? 'ngang' : 'dọc') + ', tỉ lệ 1:' + (+sc.toPrecision(6)) + ' (' + (+W.toFixed(2)) + ' × ' + (+H.toFixed(2)) + ' đơn vị) — khung tên 180 × 56 mm theo TCVN.');
    try{ zoomToWorldRect(o0.x - W * 0.05, o0.y - H * 0.05, o0.x + W * 1.05, o0.y + H * 1.05); }catch(_){}
  });

  /* PLOTTERMANAGER — danh sách máy in / máy vẽ (.pc3), mở trình sửa cấu hình */
  plain(['PLOTTERMANAGER'], 'Quản lý máy vẽ (Plotter Manager): các cấu hình máy in / máy vẽ .pc3 và thuộc tính (độ sâu màu)', () => {
    const DEV = [['pdf', 'DWG To PDF.pc3', 'Xuất PDF vectơ'], ['pdfgd', 'AutoCAD PDF (General Documentation).pc3', 'PDF vectơ, tài liệu chung'], ['pdfhq', 'AutoCAD PDF (High Quality Print).pc3', 'PDF vectơ, ảnh độ phân giải cao'], ['pdfsm', 'AutoCAD PDF (Smallest File).pc3', 'PDF vectơ, ảnh nén nhỏ'], ['pdfwm', 'AutoCAD PDF (Web and Mobile).pc3', 'PDF vectơ cho web / điện thoại'], ['png', 'PublishToWeb PNG.pc3', 'Xuất ảnh PNG'], ['jpg', 'PublishToWeb JPG.pc3', 'Xuất ảnh JPG'], ['defprn', 'Default Windows System Printer.pc3', 'Máy in mặc định của Windows'], ['print', 'Máy in Windows (hộp in hệ thống)', 'Hộp in của hệ điều hành'], ['plt', 'HP DesignJet (HPGL/2).pc3', 'Tệp .plt cho máy vẽ HPGL/2']];
    let sel = 'pdf';
    const html = '<div class="acw" style="width:440px"><div class="acw-list" id="pmL" style="height:230px">' + DEV.map(([k, n, t]) => '<div class="it' + (k === sel ? ' on' : '') + '" data-v="' + k + '"><span translate="no">🖨 ' + esc(n) + '</span> <span style="color:#9aa6ba">— ' + esc(t) + '</span></div>').join('') + '</div>' +
      '<div class="acw-row" style="margin-top:6px">' + K.btn('pmP', 'Thuộc tính…') + K.btn('pmU', 'Dùng khi in (PLOT)') + '</div><div class="acw-note" style="white-space:normal">Cấu hình máy vẽ dùng trong PLOT, PUBLISH và thiết lập trang. Độ sâu màu / dither chỉnh ở Thuộc tính.</div></div>';
    const d = A.dialog({ title: 'Quản lý máy vẽ', cls: 'acw-free', help: 'PLOTTERMANAGER', html, noOk: true, cancelText: 'Đóng' });
    const root = d.root; K.bindList(root.querySelector('#pmL'), v => { sel = v; }, v => { sel = v; root.querySelector('#pmP').click(); });
    // máy in Windows đã cài (bản desktop)
    if(A.sysPrinters) A.sysPrinters().then(L => { const box = root.querySelector('#pmL'); if(!box || !L.length) return; for(const q of L){ DEV.push(['sys:' + q.name, q.display || q.name, 'Máy in Windows' + (q.isDefault ? ' (mặc định)' : '')]);
      box.insertAdjacentHTML('beforeend', '<div class="it" data-v="' + esc('sys:' + q.name) + '"><span translate="no">🖨 ' + esc(q.display || q.name) + '</span> <span style="color:#9aa6ba">— ' + esc(DEV[DEV.length - 1][2]) + '</span></div>'); } });   // bindList bắt sự kiện trên cả danh sách: mục thêm sau vẫn chọn được
    root.querySelector('#pmP').onclick = () => { if(A.plotterProps && sel !== 'plt') A.plotterProps(sel, () => {}); else log('Máy vẽ HPGL/2: số bút / bút ảo đặt trong bảng kiểu in (STYLESMANAGER).'); };
    root.querySelector('#pmU').onclick = () => { if(A.PS){ A.PS.dev = sel; try{ localStorage.setItem('dvd:plot', JSON.stringify(Object.assign({}, A.PS, { win: undefined }))); }catch(_){} } log('PLOT dùng máy: ' + (DEV.find(x => x[0] === sel) || [0, sel])[1]); };
  });

  /* UPDATETHUMBSNOW — cập nhật ảnh thu nhỏ của bản vẽ (trang Bắt đầu, danh sách gần đây) */
  plain(['UPDATETHUMBSNOW', 'UPDATETHUMB'], 'Cập nhật ảnh thu nhỏ của bản vẽ ngay (trang Bắt đầu, danh sách gần đây)', () => { try{ if(A.captureThumb){ A.captureThumb(true); log('Đã cập nhật ảnh thu nhỏ.'); } else log('Chưa có trang Bắt đầu.'); }catch(err){ log('Không cập nhật được ảnh thu nhỏ.'); } });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
