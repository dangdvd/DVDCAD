/* DVDCAD v5j — dòng lệnh kiểu AutoCAD 2027 (phần bổ sung cho dvd-cmd.js + dvd-acad-core.js)
   · Giữ chuột phải khi đang chạy lệnh: menu Enter / Huỷ / Nhập gần đây / tuỳ chọn của lời nhắc / cách chọn / bắt điểm tạm / 'ZOOM / 'CAL
   · Shift + chuột phải: menu bắt điểm 1 lần (END, MID, … TT, FROM, M2P, bộ lọc .X .Y .XY)
   · INPUTSEARCHOPTIONS: cài đặt gợi ý khi gõ (AutoComplete, AutoAppend, AutoCorrect, đồng nghĩa, giữa chuỗi, biến hệ thống, nội dung)
   · Biến hệ thống của dòng lệnh / nhập động / chọn: CLIPROMPTLINES, AUTOCOMPLETEMODE, AUTOCOMPLETEDELAY, INPUTSEARCHDELAY, DYNPICOORDS, DYNPROMPT,
     SHORTCUTMENUDURATION, PICKFIRST, LASTPOINT, CMDACTIVE, CMDNAMES, HPNAME, HPSCALE, HPANG, TEXTSTYLE, EXTMIN, EXTMAX, ACADVER
   · MULTIPLE hỏi tên lệnh ngay trên dòng lệnh (không dùng hộp thoại của trình duyệt) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || !window.DVDCmd || A._cmdline) return; A._cmdline = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const SET = A.SET, IS = DVDCmd.opts, saveIS = DVDCmd.saveOpts;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => (A.fmt ? A.fmt(v) : String(v)).replace(/\.?0+$/, '');
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});

  /* ---- menu chuột phải khi đang chạy lệnh (giữ chuột phải; bấm nhanh = Enter) ---- */
  const SEL_OPTS = [['W', 'Khung trùm'], ['C', 'Khung cắt'], ['F', 'Hàng rào'], ['WP', 'Đa giác trùm'], ['CP', 'Đa giác cắt'], ['ALL', 'Tất cả'], ['P', 'Lần chọn trước'], ['L', 'Đối tượng vừa vẽ'], ['G', 'Theo tên nhóm'], ['R', 'Bỏ đối tượng'], ['U', 'Hoàn tác lần chọn']];
  A.cmdMenu = function(x, y){
    const c = A.cur(); const r = c && c.req; if(!r){ A.input(''); return; }
    const items = [{ t: 'Enter', k: '↵', fn: () => A.input('') }, { t: 'Huỷ', k: 'Esc', fn: () => A.cancel() }];
    const ri = A.recentInput ? A.recentInput(r.type) : [];
    if(ri.length){ items.push({ sep: 1 }, { hd: 'Nhập gần đây' }); for(const v of ri.slice(0, 6)) items.push({ t: v, fn: () => A.input(v) }); }
    if(r.kw && r.kw.length){ items.push({ sep: 1 }); for(const k of r.kw) items.push({ t: k.t, k: k.k, fn: () => A.input(k.k) }); }
    if(r.type === 'sel'){ items.push({ sep: 1 }, { hd: 'Cách chọn' }); for(const [k, t] of SEL_OPTS) items.push({ t, k, fn: () => A.input(k) }); }
    if(r.type === 'pt' || r.type === 'dist' || r.type === 'ang') items.push({ sep: 1 }, { t: 'Bắt điểm tạm…', k: 'Shift+phải', ic: 'OSNAP', fn: () => setTimeout(() => A.osnapMenu(x, y), 0) });
    items.push({ sep: 1 }, { t: 'Phóng vừa bản vẽ', k: "'Z E", ic: 'ZE', fn: () => DVDCmd.runTransparent('ZE') }, { t: 'Phóng / kéo…', k: "'Z", ic: 'ZOOM', fn: () => A.input("'ZOOM") }, { t: 'Máy tính nhanh', k: "'CAL", ic: 'CAL', fn: () => A.input("'CAL") });
    A.menu(x, y, items);
  };
  /* ---- menu bắt điểm 1 lần (Shift + chuột phải) ---- */
  const OSN = [['END', 'end'], ['MID', 'mid'], ['INT', 'int'], ['EXT', 'ext'], ['CEN', 'cen'], ['GCE', 'gce'], ['QUA', 'qua'], ['TAN', 'tan'], ['PER', 'per'], ['PAR', 'par'], ['INS', 'ins'], ['NOD', 'nod'], ['NEA', 'nea']];
  A.osnapMenu = function(x, y){
    const c = A.cur(); const r = c && c.req; if(!r || !(r.type === 'pt' || r.type === 'dist' || r.type === 'ang')) return;
    const N = A.OS_NAME || {};
    const items = [{ hd: 'Bắt điểm 1 lần' }, { t: 'Điểm truy bắt tạm thời', k: 'TT', fn: () => A.input('TT') }, { t: 'Từ điểm (gốc + độ lệch)', k: 'FROM', fn: () => A.input('FROM') }, { t: 'Trung điểm giữa 2 điểm', k: 'M2P', fn: () => A.input('M2P') },
      { t: 'Bộ lọc điểm X', k: '.X', fn: () => A.input('.X') }, { t: 'Bộ lọc điểm Y', k: '.Y', fn: () => A.input('.Y') }, { t: 'Bộ lọc điểm XY', k: '.XY', fn: () => A.input('.XY') }, { sep: 1 }];
    for(const [k, m] of OSN) items.push({ t: N[m] || k, k, fn: () => A.input(k) });
    items.push({ t: 'Không bắt điểm', k: 'NON', fn: () => A.input('NON') }, { sep: 1 }, { t: 'Cài đặt bắt điểm…', k: "'OS", ic: 'OSNAP', fn: () => A.input("'OSNAP") });
    A.menu(x, y, items);
  };

  /* ---- INPUTSEARCHOPTIONS ---- */
  function syncAuto(){ window.DVD_AUTOCOMPLETE = !!IS.auto; try{ localStorage.setItem('dvd:autocomp', IS.auto ? '1' : '0'); }catch(_){} }
  if(window.DVD_AUTOCOMPLETE === false && IS.auto){ IS.auto = 0; saveIS(); }   // giữ đúng lựa chọn cũ của lệnh AUTOCOMPLETE
  plain(['INPUTSEARCHOPTIONS'], 'Cài đặt tìm kiếm khi gõ lệnh: tự hoàn thành, tự sửa lỗi gõ, đồng nghĩa, biến hệ thống, nội dung bản vẽ', () => {
    // bố cục như hộp Input Search Options của AutoCAD 2027
    const K = A.acw; const ck = (k, t, tip) => '<label class="acw-ck"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><input type="checkbox" data-k="' + k + '"' + (IS[k] ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
    const nAC = Object.keys(DVDCmd.autocorrect || {}).length;
    const G = (t, h) => K ? K.grp(t, h) : '<fieldset><legend>' + t + '</legend>' + h + '</fieldset>';
    A.dialog({ title: 'Tuỳ chọn tìm kiếm khi nhập', cls: 'acw-free', help: 'INPUTSEARCHOPTIONS', okText: 'OK', html: '<div class="acw" style="width:460px">' +
      ck('auto', 'Bật tự hoàn thành (AutoComplete)', 'Hiện danh sách lệnh khớp ngay khi gõ, có biểu tượng') +
      G('Tự hoàn thành', ck('append', 'Tự nối gợi ý khi gõ', 'Hiện mờ phần còn lại của tên lệnh — phím → hoặc Tab để nhận') + '<br>' + ck('sysvar', 'Tìm biến hệ thống', 'gõ OSM thấy OSMODE kèm giá trị hiện tại') + '<br>' + ck('mid', 'Tìm giữa chuỗi', 'gõ LINE thấy cả PLINE, XLINE, MLINE…') + '<br>' + ck('freq', 'Xếp gợi ý theo lệnh hay dùng', 'Lệnh dùng nhiều hiện lên đầu danh sách') + '<br>' +
        ck('content', 'Tìm nội dung bản vẽ', 'Lớp (đặt hiện hành), khối (chèn), mẫu hatch (tô), kiểu chữ (đặt hiện hành)') +
        '<div style="margin:2px 0 4px 22px;color:#b4bdca">Loại nội dung: <label class="acw-ck dis"><input type="checkbox" checked disabled><span>Lớp</span></label><label class="acw-ck dis"><input type="checkbox" checked disabled><span>Khối</span></label><label class="acw-ck dis"><input type="checkbox" checked disabled><span>Mẫu hatch</span></label><label class="acw-ck dis"><input type="checkbox" checked disabled><span>Kiểu chữ</span></label></div>' +
        '<label class="acw-row"><span class="l">Thời gian chờ:</span><input data-n="delay" type="number" min="0" max="5000" step="50" value="' + (IS.delay || 0) + '" style="width:80px"><span>mili giây</span></label>') +
      ck('correct', 'Bật tự sửa lỗi gõ (AutoCorrect)', 'Gợi ý lệnh gần đúng khi gõ sai') + G('Tự sửa', '<div class="acw-row"><span class="l">Nhớ chỗ sửa sau 3 lần gõ sai</span><button type="button" class="acw-btn" id="isAC"' + (nAC ? '' : ' disabled') + '>Xoá danh sách tự sửa (' + nAC + ')</button></div>') +
      ck('syn', 'Tìm theo từ đồng nghĩa', 'vd ROUND → FILLET, SYMBOL → INSERT, XOAY → ROTATE, CHUNHAT → RECTANG') +
      '<label class="acw-row" style="margin-top:6px"><span class="l">Số dòng lời nhắc phía trên (CLIPROMPTLINES):</span><input data-n="lines" type="number" min="0" max="50" value="' + IS.lines + '" style="width:80px"></label></div>',
      onOpen: root => { root.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
        root.querySelector('#isAC').onclick = ev => { const AC = DVDCmd.autocorrect || {}; for(const k of Object.keys(AC)) delete AC[k]; try{ localStorage.setItem('dvd:autocorrect', '{}'); }catch(_){} ev.target.disabled = true; ev.target.textContent = 'Đã xoá danh sách tự sửa'; }; },
      ok: root => { root.querySelectorAll('[data-k]').forEach(i => { IS[i.dataset.k] = i.checked ? 1 : 0; });
        root.querySelectorAll('[data-n]').forEach(i => { const v = Math.max(0, +i.value || 0); IS[i.dataset.n] = i.dataset.n === 'lines' ? Math.min(50, v | 0) : Math.min(5000, v); });
        saveIS(); syncAuto(); log('Đã lưu cài đặt tìm kiếm khi gõ.'); } });
  });
  // lệnh AUTOCOMPLETE cũ (x16) bật / tắt cùng cài đặt này
  { const c = DVDCmd.commands.find(x => x.k[0] === 'AUTOCOMPLETE'); if(c){ const run0 = c.run; c.run = function(){ const r = run0.apply(this, arguments); const t = setInterval(() => { if(A.busy()) return; clearInterval(t); const on = window.DVD_AUTOCOMPLETE !== false; if(!!IS.auto !== on){ IS.auto = on ? 1 : 0; saveIS(); } }, 100); return r; }; } }

  /* ---- biến hệ thống ---- */
  const V = (n, o) => A.sysvar && A.sysvar.def && A.sysvar.def(n, o);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  V('CLIPROMPTLINES', { d: 'Số dòng lời nhắc hiện phía trên dòng lệnh (0–50)', get: () => IS.lines, set: v => { IS.lines = clamp(+v | 0, 0, 50); saveIS(); } });
  V('AUTOCOMPLETEMODE', { d: 'Gợi ý khi gõ (mã bit: 1 bật, 2 tự nối chữ, 4 danh sách, 8 biểu tượng, 16 biến hệ thống, 32 có thời gian chờ)', get: () => (IS.auto ? 1 | 4 | 8 : 0) | (IS.append ? 2 : 0) | (IS.sysvar ? 16 : 0) | (IS.delay ? 32 : 0),
    set: v => { v = +v | 0; IS.auto = v & 1 ? 1 : 0; IS.append = v & 2 ? 1 : 0; IS.sysvar = v & 16 ? 1 : 0; if(!(v & 32)) IS.delay = 0; else if(!IS.delay) IS.delay = 300; saveIS(); syncAuto(); } });
  V('AUTOCOMPLETEDELAY', { d: 'Thời gian chờ trước khi hiện gợi ý (giây)', get: () => (IS.delay || 0) / 1000, set: v => { IS.delay = clamp(+v || 0, 0, 10) * 1000; saveIS(); } });
  V('INPUTSEARCHDELAY', { d: 'Thời gian chờ trước khi gợi ý (mili giây)', get: () => IS.delay || 0, set: v => { IS.delay = clamp(+v || 0, 0, 10000); saveIS(); } });
  V('DYNPICOORDS', { d: 'Nhập động: điểm thứ hai trở đi gõ x,y là 0 = tương đối (mặc định), 1 = tuyệt đối', get: () => SET.dynRel === false ? 1 : 0, set: v => { SET.dynRel = !(+v); A.saveSet(); } });
  V('DYNPROMPT', { d: 'Hiện lời nhắc trong ô nhập động cạnh con trỏ (0/1)', get: () => SET.dynPrompt === false ? 0 : 1, set: v => { SET.dynPrompt = !!+v; A.saveSet(); } });
  V('SHORTCUTMENUDURATION', { d: 'Giữ chuột phải bao lâu (mili giây) thì hiện menu khi đang chạy lệnh; bấm nhanh = Enter', get: () => SET.rcMs || 250, set: v => { SET.rcMs = clamp(+v | 0, 100, 10000); A.saveSet(); } });
  V('PICKFIRST', { d: 'Chọn đối tượng trước rồi gõ lệnh (0/1)', get: () => SET.pickfirst === false ? 0 : 1, set: v => { SET.pickfirst = !!+v; A.saveSet(); } });
  V('LASTPOINT', { d: 'Điểm nhập cuối cùng (gõ @ để dùng lại)', s: 1, get: () => A.lastPoint ? fmt(A.lastPoint.x) + ',' + fmt(A.lastPoint.y) : '0,0', set: v => { const p = A.parseCoord(String(v), null, false); if(p) A.lastPoint = { x: p.x, y: p.y }; } });
  V('CMDACTIVE', { d: 'Đang chạy lệnh? 0 không, 1 lệnh, 3 lệnh trong suốt — chỉ đọc', ro: 1, get: () => !A.busy() ? 0 : (A.cur().nest ? 3 : 1), set: () => {} });
  V('CMDNAMES', { d: 'Tên lệnh đang chạy — chỉ đọc', s: 1, ro: 1, get: () => A.cmdName() || '', set: () => {} });
  const hsSave = () => { try{ localStorage.setItem('dvd:hatch', JSON.stringify(A.HS)); }catch(_){} };
  V('HPNAME', { d: 'Mẫu hatch mặc định', s: 1, get: () => A.HS ? A.HS.pat : '', set: v => { const n = String(v).trim().toUpperCase(); if(!(A.setHatchPattern && A.setHatchPattern(n))) log('Không có mẫu hatch ' + n + '.'); } });
  V('HPSCALE', { d: 'Tỉ lệ mẫu hatch (0 = tự động)', get: () => A.HS ? (A.HS.scale || 0) : 0, set: v => { if(A.HS && +v >= 0){ A.HS.scale = +v; hsSave(); } } });
  V('HPANG', { d: 'Góc mẫu hatch (độ)', get: () => A.HS ? (A.HS.ang || 0) : 0, set: v => { if(A.HS && isFinite(+v)){ A.HS.ang = +v; hsSave(); } } });
  V('TEXTSTYLE', { d: 'Kiểu chữ hiện hành', s: 1, get: () => A.TS ? A.TS.cur : 'Standard', set: v => { if(!(A.tsSetCur && A.tsSetCur(String(v).trim()))) log('Không có kiểu chữ ' + v + '.'); } });
  const ext = () => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; try{ for(const e of modelEntities){ const b = entBBox(e); if(!b) continue; if(b.x0 < x0) x0 = b.x0; if(b.y0 < y0) y0 = b.y0; if(b.x1 > x1) x1 = b.x1; if(b.y1 > y1) y1 = b.y1; } }catch(_){} return isFinite(x0) ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: 0, y1: 0 }; };
  V('EXTMIN', { d: 'Góc dưới trái phạm vi bản vẽ — chỉ đọc', s: 1, ro: 1, get: () => { const b = ext(); return fmt(b.x0) + ',' + fmt(b.y0); }, set: () => {} });
  V('EXTMAX', { d: 'Góc trên phải phạm vi bản vẽ — chỉ đọc', s: 1, ro: 1, get: () => { const b = ext(); return fmt(b.x1) + ',' + fmt(b.y1); }, set: () => {} });
  V('ACADVER', { d: 'Phiên bản chương trình — chỉ đọc', s: 1, ro: 1, get: () => 'DVDCAD 5.10', set: () => {} });

  /* ---- lệnh dòng lệnh dùng trong script / LISP: -LAYER, -INSERT, -OSNAP, UNDO ---- */
  const ACI_NAME = { RED: 1, YELLOW: 2, GREEN: 3, CYAN: 4, BLUE: 5, MAGENTA: 6, WHITE: 7, DO: 1, VANG: 2, XANHLA: 3, LUCLAM: 4, XANHDUONG: 5, TIM: 6, TRANG: 7 };
  const colorHex = v => { const t = String(v || '').trim().toUpperCase(); if(/^#[0-9A-F]{6}$/.test(t)) return t.toLowerCase(); const n = /^\d+$/.test(t) ? +t : ACI_NAME[t]; if(n >= 1 && n <= 255 && typeof aciHex === 'function') return aciHex(n); return null; };
  // danh sách tên lớp: "A,B*,C?" (có ký tự đại diện * ?)
  const namesOf = (list, all) => { const pats = String(list || '').split(',').map(x => x.trim()).filter(Boolean); if(!pats.length) return [];
    const L = all || A.layerNames(), out = new Set(); for(const p of pats){ if(/[*?]/.test(p)){ const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); for(const n of L) if(re.test(n)) out.add(n); } else out.add(L.find(n => n.toUpperCase() === p.toUpperCase()) || p); } return [...out]; };
  const pickLayers = async (prompt, allowSel) => { const r = await A.getStr(prompt + (allowSel ? ' hoặc <chọn đối tượng>' : '')); if(r.str) return namesOf(r.str);
    if(!allowSel) return []; const s = await A.getSel('Chọn đối tượng'); return [...new Set((s.sel || []).map(e => e.layer || '0'))]; };
  cmd(['-LAYER', '-LA'], 'Lớp bằng dòng lệnh (cho script / LISP): ? · Tạo · Hiện hành · Mới · Bật · Tắt · Màu · Kiểu nét · Bề rộng nét · Trong suốt · Đóng băng · Rã băng · Khoá · Mở khoá', async () => {
    for(;;){
      log('Lớp hiện hành: "' + A.LS.cur + '"');
      const k = await A.getKw('Nhập tuỳ chọn', { kw: [{ k: '?', t: '?' }, { k: 'M', t: 'Tạo' }, { k: 'S', t: 'Hiện hành' }, { k: 'N', t: 'Mới' }, { k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }, { k: 'C', t: 'Màu' }, { k: 'L', t: 'Kiểu nét' }, { k: 'LW', t: 'Bề rộng nét' }, { k: 'TR', t: 'Trong suốt' }, { k: 'F', t: 'Đóng băng' }, { k: 'T', t: 'Rã băng' }, { k: 'LO', t: 'Khoá' }, { k: 'U', t: 'Mở khoá' }] });
      if(k.none || !k.kw) return;
      const LS = A.LS;
      if(k.kw === '?'){ const r = await A.getStr('Nhập tên lớp cần liệt kê', { def: '*' }); const L = namesOf(r.str || '*'); for(const n of L) log(n + '  ' + (LS.off.has(n) ? 'Tắt' : 'Bật') + (LS.frozen.has(n) ? ' · Đóng băng' : '') + (LS.locked.has(n) ? ' · Khoá' : '') + '  màu ' + A.layerHex(n) + '  ' + A.layerLT(n)); continue; }
      if(k.kw === 'M'){ const r = await A.getStr('Nhập tên lớp mới (thành lớp hiện hành)', { def: LS.cur }); const n = String(r.str || LS.cur).trim(); if(!n) continue; A.addLayer(n); A.setCurLayer(n); continue; }
      if(k.kw === 'S'){ const r = await A.getStr('Nhập tên lớp làm hiện hành hoặc <chọn đối tượng>'); let n = String(r.str || '').trim(); if(!n){ const s = await A.getEnt('Chọn đối tượng'); if(s.ent) n = s.ent.layer || '0'; } if(!n) continue; if(!A.layerNames().some(x => x.toUpperCase() === n.toUpperCase())){ log('Không có lớp "' + n + '".'); continue; } A.setCurLayer(namesOf(n)[0]); continue; }
      if(k.kw === 'N'){ const r = await A.getStr('Nhập danh sách tên lớp mới'); for(const n of String(r.str || '').split(',').map(x => x.trim()).filter(Boolean)) A.addLayer(n); continue; }
      if(k.kw === 'ON' || k.kw === 'OFF' || k.kw === 'F' || k.kw === 'T' || k.kw === 'LO' || k.kw === 'U'){
        const flag = { ON: 'off', OFF: 'off', F: 'frozen', T: 'frozen', LO: 'locked', U: 'locked' }[k.kw], on = k.kw === 'OFF' || k.kw === 'F' || k.kw === 'LO';
        const L = await pickLayers({ ON: 'Nhập danh sách lớp cần bật', OFF: 'Nhập danh sách lớp cần tắt', F: 'Nhập danh sách lớp cần đóng băng', T: 'Nhập danh sách lớp cần rã băng', LO: 'Nhập danh sách lớp cần khoá', U: 'Nhập danh sách lớp cần mở khoá' }[k.kw], on || k.kw === 'U');
        for(const n of L) A.setLayerFlag(n, flag, on); if(A.onLayers) A.onLayers(); continue; }
      if(k.kw === 'C'){ const r = await A.getStr('Màu mới (số ACI 1–255, tên như RED, hoặc #rrggbb)'); const hex = colorHex(r.str); if(!hex){ log('Màu không hợp lệ.'); continue; }
        const L = await pickLayers('Nhập danh sách lớp nhận màu ' + String(r.str).trim(), false); for(const n of (L.length ? L : [LS.cur])){ A.addLayer(n); A.setLayerColor(n, hex); } if(A.onLayers) A.onLayers(); continue; }
      if(k.kw === 'L'){ const r = await A.getStr('Nhập tên kiểu nét', { def: 'CONTINUOUS' }); const lt = String(r.str || 'CONTINUOUS').trim().toUpperCase();
        const L = await pickLayers('Nhập danh sách lớp nhận kiểu nét "' + lt + '"', false); for(const n of (L.length ? L : [LS.cur])) A.setLayerLT(n, lt); if(A.onLayers) A.onLayers(); continue; }
      if(k.kw === 'LW'){ const r = await A.getNum('Nhập bề rộng nét (mm)'); if(r.num == null) continue; const lw = Math.round(Math.abs(r.num) * 100);
        const L = await pickLayers('Nhập danh sách lớp nhận bề rộng ' + (lw / 100).toFixed(2) + ' mm', false); for(const n of (L.length ? L : [LS.cur])) A.setLayerLW(n, lw); if(A.onLayers) A.onLayers(); continue; }
      if(k.kw === 'TR' && A.setLayerTP){ const r = await A.getNum('Nhập giá trị độ trong suốt (0-90)', { def: 0 }); if(r.num == null) continue; const v = Math.round(r.num); if(!(v >= 0 && v <= 90)){ log('Độ trong suốt từ 0 đến 90.'); continue; }
        const L = await pickLayers('Nhập danh sách lớp nhận độ trong suốt ' + v, false); for(const n of (L.length ? L : [LS.cur])) A.setLayerTP(n, v); if(A.onLayers) A.onLayers(); continue; }
    }
  });
  cmd(['-INSERT', '-I'], 'Chèn khối bằng dòng lệnh (cho script / LISP): tên, điểm chèn, tỉ lệ, góc xoay', async () => {
    const B = A.blockList ? A.blockList() : { file: [], lib: [] };
    let r = await A.getStr('Nhập tên khối hoặc [?]', { def: A.MEM.lastIns || undefined }); let name = String(r.str || A.MEM.lastIns || '').trim();
    if(name === '?'){ log('Khối: ' + B.file.concat(B.lib.filter(n => !B.file.includes(n))).join(', ')); return; }
    const src = B.file.find(n => n.toUpperCase() === name.toUpperCase()) ? 'file' : B.lib.find(n => n.toUpperCase() === name.toUpperCase()) ? 'lib' : null;
    if(!src){ log('Không có khối "' + name + '".'); return; } name = (src === 'file' ? B.file : B.lib).find(n => n.toUpperCase() === name.toUpperCase()); A.MEM.lastIns = name;
    let sc = 1, rot = 0; let p;
    for(;;){ p = await A.getPoint('Chỉ định điểm chèn', { kw: [{ k: 'S', t: 'Tỉ lệ' }, { k: 'R', t: 'Xoay' }], rubber: false, preview: (g, q) => g.ents(A.instBlock(name, src, q, sc, rot).slice(0, 1500), '#cfe3ff') });
      if(p.kw === 'S'){ const v = await A.getNum('Chỉ định hệ số tỉ lệ', { def: sc }); if(v.num) sc = Math.abs(v.num); continue; }
      if(p.kw === 'R'){ const v = await A.getAngle('Chỉ định góc xoay', { def: rot }); if(v.num != null) rot = v.num; continue; }
      break; }
    if(!p.pt) return;
    const xs = await A.getNum('Nhập hệ số tỉ lệ X', { def: sc }); if(xs.num) sc = Math.abs(xs.num);
    const ys = await A.getNum('Nhập hệ số tỉ lệ Y', { def: 'dùng hệ số X' }); if(ys.num && Math.abs(Math.abs(ys.num) - sc) > 1e-9) log('Tỉ lệ X, Y khác nhau chưa hỗ trợ — dùng ' + fmt(sc) + '.');
    const ro = await A.getAngle('Chỉ định góc xoay', { base: p.pt, def: rot }); if(ro.num != null) rot = ro.num;
    const ents = A.instBlock(name, src, p.pt, sc, rot); if(!ents.length){ log('Khối rỗng.'); return; }
    A.commit({ add: ents }, 'Đã chèn khối ' + name);
  });
  const OSK = { END: 'end', ENDP: 'end', ENDPOINT: 'end', MID: 'mid', MIDPOINT: 'mid', CEN: 'cen', CENTER: 'cen', GCE: 'gce', GCEN: 'gce', NOD: 'nod', NODE: 'nod', QUA: 'qua', QUAD: 'qua', QUADRANT: 'qua', INT: 'int', INTERSECTION: 'int', EXT: 'ext', EXTENSION: 'ext',
    INS: 'ins', INSERT: 'ins', PER: 'per', PERP: 'per', PERPENDICULAR: 'per', TAN: 'tan', TANGENT: 'tan', NEA: 'nea', NEAR: 'nea', NEAREST: 'nea', PAR: 'par', PARALLEL: 'par', APP: 'int', APPINT: 'int' };
  cmd(['-OSNAP', '-OS'], 'Đặt chế độ bắt điểm bằng dòng lệnh: vd END,MID,INT hoặc NONE', async () => {
    const cur = SET.osnap ? SET.osm.map(m => Object.keys(OSK).find(k => OSK[k] === m)).join(',') : 'NONE';
    const r = await A.getStr('Nhập danh sách chế độ bắt điểm', { def: cur }); const t = String(r.str || '').trim().toUpperCase(); if(!t) return;
    if(/^(NON|NONE|OFF)$/.test(t)){ SET.osnap = false; A.saveSet(); log('OSNAP: tắt'); return; }
    const ms = [...new Set(t.split(/[,\s]+/).map(x => OSK[x]).filter(Boolean))]; if(!ms.length){ log('Không hiểu "' + t + '".'); return; }
    SET.osm = ms; SET.osnap = true; A.saveSet(); log('OSNAP: ' + ms.map(m => (A.OS_NAME || {})[m] || m).join(', '));
  });
  // UNDO như AutoCAD: số bước, hoặc [Tự động/Điều khiển/Bắt đầu/Kết thúc/Đánh dấu/Lùi về]; U vẫn là hoàn tác 1 bước
  let undoMarks = [], undoGroup = null;
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); undoMarks = []; undoGroup = null; }; })(A.onLoad);
  const stackLen = () => { try{ return editUndoStack.length; }catch(_){ return 0; } };
  cmd(['UNDO'], 'Hoàn tác nhiều bước: số bước, BE/E (nhóm thao tác), M (đánh dấu), B (lùi về dấu)', async () => {
    const r = await A.getNum('Nhập số thao tác cần hoàn tác', { def: 1, kw: [{ k: 'A', t: 'Tự động' }, { k: 'C', t: 'Điều khiển' }, { k: 'BE', t: 'Bắt đầu' }, { k: 'E', t: 'Kết thúc' }, { k: 'M', t: 'Đánh dấu' }, { k: 'B', t: 'Lùi về' }] });
    if(r.kw === 'A' || r.kw === 'C'){ log('DVDCAD luôn ghi đầy đủ các bước hoàn tác.'); return; }
    if(r.kw === 'M'){ undoMarks.push(stackLen()); log('Đã đánh dấu.'); return; }
    if(r.kw === 'BE'){ undoGroup = stackLen(); return; }
    if(r.kw === 'E'){ if(undoGroup == null) return; const k = undoGroup; undoGroup = null; try{ if(editUndoStack.length - k > 1){ const steps = editUndoStack.splice(k); editUndoStack.push({ op: 'multi', steps }); } }catch(_){} return; }
    if(r.kw === 'B'){ const m = undoMarks.length ? undoMarks.pop() : 0; let n = 0; while(stackLen() > m){ undoEdit(); n++; } log(undoMarks.length || m ? 'Đã lùi về dấu (' + n + ' bước).' : 'Đã hoàn tác mọi thứ (' + n + ' bước).'); return; }
    const n = Math.max(0, Math.round(r.num != null ? r.num : 1)); let k = 0; for(; k < n && stackLen(); k++) undoEdit(); log('Đã hoàn tác ' + k + ' thao tác.');
  });
  { const u = DVDCmd.commands.find(c => c.k.includes('U') && c.k[0] !== 'UNDO'); if(!u) DVDCmd.register(['U'], 'Hoàn tác 1 bước (Ctrl+Z)', () => { try{ undoEdit(); }catch(_){} }, {}); }

  /* ---- MULTIPLE: hỏi tên lệnh ở dòng lệnh rồi lặp tới khi Esc ---- */
  if(A.multipleRun) cmd(['MULTIPLE'], 'Lặp lại một lệnh liên tục tới khi bấm Esc', async () => {
    const r = await A.getStr('Nhập tên lệnh cần lặp lại'); const name = String(r.str || '').trim().toUpperCase().replace(/^[_.']+/, ''); if(!name) return;
    const c = DVDCmd.lookup ? DVDCmd.lookup(name) : null; if(!c){ log('Không có lệnh "' + name + '".'); return; }
    setTimeout(() => A.multipleRun(c.k[0]), 0);
  });
})();
