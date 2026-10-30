/* DVDCAD — lệnh và hộp thoại bổ sung như AutoCAD 2027 (v5o)
   TABLESTYLE (Table Style · kiểu ô Title / Header / Data), TABLE (Insert Table theo kiểu bảng), …
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || !A.dialog || !A.acw || !window.DVDCmd) return;
  const K = A.acw;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
  const r6 = v => +(+v).toPrecision(6);
  const deep = o => JSON.parse(JSON.stringify(o));
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };

  const css = document.createElement('style');
  css.textContent = `
  .tsb-bd{display:flex;gap:2px;margin:6px 0 2px}
  .tsb-bd button{width:30px;height:28px;display:grid;place-items:center;border:1px solid #5a6578;background:#2c323d;border-radius:2px;cursor:pointer;padding:0}
  .tsb-bd button:hover{background:#3b4452}
  .tsb-bd button.on{background:#0b5f8f;border-color:#0696d7}
  .tsb-cs{display:flex;gap:4px;align-items:center}
  .tsb-cs select{flex:1 1 auto}
  .tsb-cs .acw-btn{min-width:0;padding:0 7px}
  .acw-tabs{display:flex;gap:0;margin:0}
  `;
  document.head.appendChild(css);

  // tạm ẩn hộp thoại để chọn một đối tượng trên bản vẽ (Esc = huỷ)
  function pickEnt(root, msg, ok){
    return new Promise(res => { const cv = document.getElementById('cv'); if(root) root.style.display = 'none'; log(msg || 'Chọn đối tượng (Esc = huỷ)');
      const off = v => { document.removeEventListener('pointerdown', dn, true); window.removeEventListener('keydown', kd, true); if(root) root.style.display = ''; res(v); };
      const dn = ev => { if(ev.target !== cv) return; ev.preventDefault(); ev.stopPropagation(); const r = cv.getBoundingClientRect(); let e = null; try{ const i = pickEntity({ x: ev.clientX - r.left, y: ev.clientY - r.top }); e = i >= 0 ? entities[i] : null; }catch(_){}
        if(e && ok && !ok(e)){ say('Đối tượng chọn không hợp lệ.'); return; } off(e); };
      const kd = ev => { if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); off(null); } };
      document.addEventListener('pointerdown', dn, true); window.addEventListener('keydown', kd, true); });
  }
  A.pickEntDlg = pickEnt;

  /* ==================================================================
     TABLESTYLE — Table Style (như AutoCAD 2027): danh sách kiểu, xem trước, Đặt hiện hành / Mới / Sửa / Xoá
     Kiểu bảng gồm hướng bảng và các kiểu ô (Title, Header, Data + kiểu ô riêng):
     nền, căn lề, định dạng, loại, lề ngang / dọc, gộp ô · kiểu chữ, cao chữ, màu chữ, góc chữ · đường viền
     ================================================================== */
  const TBK = 'dvd:tblstyle';
  const AL = [['TL', 'Trên trái'], ['TC', 'Trên giữa'], ['TR', 'Trên phải'], ['ML', 'Giữa trái'], ['MC', 'Giữa tâm'], ['MR', 'Giữa phải'], ['BL', 'Dưới trái'], ['BC', 'Dưới giữa'], ['BR', 'Dưới phải']];
  const FMT = [['gen', 'Chung'], ['dec', 'Số thập phân'], ['pct', 'Phần trăm'], ['cur', 'Tiền tệ'], ['whole', 'Số nguyên'], ['text', 'Văn bản']];
  const fmtName = f => { const t = (FMT.find(x => x[0] === ((f && f.t) || 'gen')) || FMT[0])[1]; return f && (f.t === 'dec' || f.t === 'pct' || f.t === 'cur') ? t + ' (' + (f.p == null ? 2 : f.p) + ')' : t; };
  const EDGES = ['t', 'b', 'l', 'r', 'h', 'v'];
  const bdAll = () => { const o = {}; for(const k of EDGES) o[k] = { on: 1 }; return o; };
  function cellDef(th, o){ return Object.assign({ al: 'MC', fill: '', fmt: { t: 'gen' }, type: 'data', hm: 1.5, vm: 1.5, merge: 0, ts: 'Standard', th, col: '', ang: 0, bd: bdAll() }, o || {}); }
  function styleDef(){ return { desc: '', dir: 'down', cells: { Title: cellDef(6, { type: 'label', merge: 1 }), Header: cellDef(4.5, { type: 'label' }), Data: cellDef(4.5) } }; }
  const BASE_CS = ['Title', 'Header', 'Data'];
  const csLabel = k => k === 'Title' ? 'Tiêu đề' : k === 'Header' ? 'Tên cột' : k === 'Data' ? 'Dữ liệu' : k;
  function tbLib(){ let o = lsGet(TBK, null); if(!o || !o.list || !o.list.Standard) o = { cur: 'Standard', list: { Standard: styleDef() } }; if(!o.list[o.cur]) o.cur = 'Standard';
    for(const n in o.list){ const s = o.list[n]; if(!s.cells) s.cells = styleDef().cells; for(const k of BASE_CS) if(!s.cells[k]) s.cells[k] = styleDef().cells[k]; } return o; }
  const tbSave = o => lsSet(TBK, o);
  A.TBS = { lib: tbLib, save: tbSave, def: styleDef, cell: cellDef, get cur(){ return tbLib().cur; } };
  // bảng trong bản vẽ dùng kiểu (theo tên) — sửa kiểu thì cập nhật các bảng như AutoCAD
  const tablesUsing = name => modelEntities.filter(e => e.tbld && e.tbld.tss && (e.tbld.ts || 'Standard') === name);
  function restyleTables(name, st){ const L = tablesUsing(name); if(!L.length) return 0; const rep = L.map(c => { const w = deep(c); delete w.userAdded; w.tbld.tss = deep(st); return [c, w]; }); A.commit({ rep }, 'Đã cập nhật ' + L.length + ' bảng theo kiểu "' + name + '"'); return L.length; }
  // bảng mẫu cho ô xem trước (như AutoCAD: Title, Header, Data)
  function sampleTable(st, o){ const d = st.cells.Data || cellDef(4.5), cw = (o && o.cw) || Math.max(d.th * 6, 10), n = (o && o.rows) || 6, nc = (o && o.cols) || 3;
    const rs = ['Title', 'Header'].concat(Array(n).fill('Data')); const cells = rs.map((k, r) => Array.from({ length: nc }, (_, c) => r === 0 ? (c === 0 ? 'Tiêu đề' : '') : r === 1 ? 'Tên cột' : 'Dữ liệu'));
    return { o: { x: 0, y: 0 }, rot: 0, cw: Array(nc).fill(cw), rh: rs.map(() => 0), cells, th: d.th, title: true, head: true, rs, tss: st }; }
  function paintTable(cnv, T){ if(!cnv || !A.tblBuild) return; const ents = A.tblBuild(T).map(e => { e.col = e._col && e._col !== 'BYLAYER' ? e._col : '#e8ecf2'; if(e.type === 'HATCH'){ e.col = e._col || '#555'; } delete e._col; delete e._lw; delete e._lt; return e; }); K.paint(cnv, ents); }
  function tableStyleMgr(onClose){
    let lib = tbLib(), sel = lib.cur, filt = 'all';
    const html = '<div class="acw" style="width:600px"><div class="acw-lab">Kiểu bảng hiện hành: <b id="tsmCur" translate="no"></b></div><div class="acw-cols"><div class="c1" style="flex:0 0 170px"><div class="acw-lab">Kiểu:</div><div class="acw-list" id="tsmL" style="height:230px" tabindex="0"></div>' +
      '<div class="acw-lab" style="margin-top:8px">Liệt kê:</div>' + K.sel('tsmF', [['all', 'Mọi kiểu'], ['used', 'Kiểu đang dùng']], filt) + '</div>' +
      '<div class="c1"><div class="acw-lab">Xem trước: <span id="tsmPn" translate="no"></span></div>' + K.canvas('tsmPv', 290, 230) + '</div>' +
      '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('tsmSet', 'Đặt hiện hành') + K.btn('tsmNew', 'Mới…') + K.btn('tsmMod', 'Sửa…') + K.btn('tsmDel', 'Xoá') + '</div></div></div>';
    const d = A.dialog({ title: 'Kiểu bảng', cls: 'acw-free', help: 'TABLESTYLE', html, noOk: true, cancelText: 'Đóng', cancel: () => { if(onClose) onClose(); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { lib = tbLib(); if(!lib.list[sel]) sel = lib.cur; let names = Object.keys(lib.list).sort((a, b) => a === 'Standard' ? -1 : b === 'Standard' ? 1 : a.localeCompare(b));
      if(filt === 'used') names = names.filter(n => tablesUsing(n).length || n === lib.cur);
      $('tsmL').innerHTML = names.map(n => '<div class="it' + (n === sel ? ' on' : '') + '" data-v="' + esc(n) + '"><span translate="no">' + esc(n) + '</span>' + (n === lib.cur ? ' (hiện hành)' : '') + '</div>').join('');
      $('tsmCur').textContent = lib.cur; $('tsmPn').textContent = sel; $('tsmDel').disabled = sel === 'Standard' || sel === lib.cur || tablesUsing(sel).length > 0;
      paintTable($('tsmPv'), sampleTable(lib.list[sel])); };
    $('tsmL').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; sel = it.dataset.v; render(); });
    $('tsmL').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-v]'); if(it) $('tsmMod').click(); });
    $('tsmF').onchange = () => { filt = $('tsmF').value; render(); };
    $('tsmSet').onclick = () => { lib = tbLib(); lib.cur = sel; tbSave(lib); log('Kiểu bảng hiện hành: ' + sel); render(); };
    $('tsmNew').onclick = () => A.dialog({ title: 'Tạo kiểu bảng mới', cls: 'acw-free', help: 'TABLESTYLE', html: '<div class="acw" style="width:340px">' + K.vrow('Tên kiểu mới:', K.txt('tsnN', 'Bản sao của ' + sel)) + K.vrow('Bắt đầu từ:', K.sel('tsnF', Object.keys(lib.list).map(n => [n, n]), sel)) + '</div>', okText: 'Tiếp tục',
      ok: r => { const n = K.val(r, 'tsnN').trim(); if(!n){ say('Nhập tên.'); return false; } if(tbLib().list[n]){ say('Đã có kiểu "' + n + '".'); return false; }
        const base = deep(tbLib().list[K.val(r, 'tsnF')] || styleDef()); setTimeout(() => editTableStyle('Kiểu bảng mới: ' + n, base, v => { lib = tbLib(); lib.list[n] = v; tbSave(lib); sel = n; render(); }), 0); } });
    $('tsmMod').onclick = () => { const n = sel; editTableStyle('Sửa kiểu bảng: ' + n, deep(lib.list[n]), v => { lib = tbLib(); lib.list[n] = v; tbSave(lib); const k = restyleTables(n, v); if(k) log('Đã cập nhật ' + k + ' bảng dùng kiểu "' + n + '".'); render(); }); };
    $('tsmDel').onclick = () => { if(!confirm('Xoá kiểu bảng "' + sel + '"?')) return; lib = tbLib(); delete lib.list[sel]; tbSave(lib); sel = lib.cur; render(); };
    render();
    return d;
  }
  A.tableStyleMgr = tableStyleMgr;
  const IC = p => '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#9aa6ba" stroke-width="1">' + p + '</svg>';
  const BDBTN = [['all', 'Mọi đường viền', ['t', 'b', 'l', 'r', 'h', 'v']], ['out', 'Đường viền ngoài', ['t', 'b', 'l', 'r']], ['in', 'Đường viền trong', ['h', 'v']], ['b', 'Đường viền dưới', ['b']], ['l', 'Đường viền trái', ['l']], ['t', 'Đường viền trên', ['t']], ['r', 'Đường viền phải', ['r']], ['none', 'Không đường viền', []]];
  const bdIcon = k => { const W = '<rect x="3" y="3" width="14" height="14" stroke-dasharray="1.5 1.5"/><path d="M10 3v14M3 10h14" stroke-dasharray="1.5 1.5"/>', S = 'stroke="#fff" stroke-width="2"';
    const m = { all: '<rect x="3" y="3" width="14" height="14" ' + S + '/><path d="M10 3v14M3 10h14" ' + S + '/>', out: W + '<rect x="3" y="3" width="14" height="14" ' + S + '/>', in: W + '<path d="M10 3v14M3 10h14" ' + S + '/>',
      b: W + '<path d="M3 17h14" ' + S + '/>', l: W + '<path d="M3 3v14" ' + S + '/>', t: W + '<path d="M3 3h14" ' + S + '/>', r: W + '<path d="M17 3v14" ' + S + '/>', none: W };
    return IC(m[k]); };
  // New / Modify Table Style: bảng bắt đầu, hướng bảng, xem trước · kiểu ô (General / Text / Borders) + xem trước kiểu ô
  function editTableStyle(title, st0, onOk){
    const st = deep(st0); let ck = 'Data', tab = 'gen';
    const TSN = A.TS ? Object.keys(A.TS.list) : ['Standard'];
    const left = K.grp('Bảng bắt đầu', '<div class="acw-row"><span class="l">Chọn bảng làm mẫu:</span>' + K.btn('tseStart', '⊞', { tip: 'Chọn bảng làm mẫu' }) + K.btn('tseStartX', '✕') + '</div>') +
      K.grp('Chung', K.row('Hướng bảng:', K.sel('tseDir', [['down', 'Xuống'], ['up', 'Lên']], st.dir || 'down'))) + K.canvas('tsePv', 270, 250);
    const gen = K.grp('Thuộc tính', K.row('Màu nền:', K.colorSel('tseFill', '', { noBlock: 1 })) + K.row('Căn lề:', K.sel('tseAl', AL, 'MC')) +
        K.row('Định dạng:', '<span class="acw-w" style="display:flex;gap:4px"><input id="tseFmt" readonly style="flex:1;min-width:0">' + K.btn('tseFmtB', '…') + '</span>') + K.row('Loại:', K.sel('tseType', [['data', 'Dữ liệu'], ['label', 'Nhãn']], 'data'))) +
      K.grp('Lề', K.row('Ngang:', K.num('tseHm', 1.5, { min: 0 })) + K.row('Dọc:', K.num('tseVm', 1.5, { min: 0 }))) + K.chk('tseMerge', 'Gộp ô khi tạo hàng / cột', 0);
    const txt = K.grp('Thuộc tính', K.row('Kiểu chữ:', '<span class="acw-w" style="display:flex;gap:4px">' + K.sel('tseTs', TSN.map(n => [n, n]), 'Standard') + K.btn('tseTsB', '…', { tip: 'Kiểu chữ (STYLE)' }) + '</span>') +
      K.row('Cao chữ:', K.num('tseTh', 4.5, { min: 0 })) + K.row('Màu chữ:', K.colorSel('tseCol', '')) + K.row('Góc chữ:', K.num('tseAng', 0)));
    const bdr = K.grp('Thuộc tính', K.row('Bề rộng nét:', K.lwSel('tseLw', '')) + K.row('Kiểu nét:', K.ltSel('tseLt', '')) + K.row('Màu:', K.colorSel('tseBc', '')) +
        K.chk('tseDbl', 'Đường đôi', 0) + K.row('Khoảng cách:', K.num('tseSp', 1.125, { min: 0 })) +
        '<div class="tsb-bd" id="tseBd">' + BDBTN.map(([k, t]) => '<button type="button" data-b="' + k + '" title="' + esc(t) + '">' + bdIcon(k) + '</button>').join('') + '</div>' +
        '<div class="acw-note">Bấm các nút trên để áp thuộc tính đã chọn cho đường viền (bấm lại để tắt).</div>');
    const right = K.grp('Kiểu ô', '<div class="tsb-cs">' + '<select id="tseCs"></select>' + K.btn('tseCsNew', '＋', { tip: 'Tạo kiểu ô mới' }) + K.btn('tseCsMgr', '☰', { tip: 'Quản lý kiểu ô' }) + '</div>' +
      '<div style="margin-top:8px">' + K.tabs('tse', [['gen', 'Chung'], ['txt', 'Chữ'], ['bdr', 'Đường viền']], tab) + '<div class="acw-panes" style="min-height:290px">' + K.pane('tse', 'gen', tab, gen) + K.pane('tse', 'txt', tab, txt) + K.pane('tse', 'bdr', tab, bdr) + '</div></div>' +
      '<div class="acw-lab" style="margin-top:6px">Xem trước kiểu ô</div>' + K.canvas('tseCpv', 330, 56));
    const d = A.dialog({ title, cls: 'acw-free', help: 'TABLESTYLE', html: '<div class="acw" style="width:690px"><div class="acw-cols"><div class="c1" style="flex:0 0 280px">' + left + '</div><div class="c1">' + right + '</div></div></div>',
      ok: () => { pull(); onOk(st); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    K.bindTabs(root, t => { tab = t; }); K.bindColors(root, () => { pull(); paint(); });
    const cs = () => st.cells[ck];
    function fillCs(){ $('tseCs').innerHTML = Object.keys(st.cells).map(k => '<option value="' + esc(k) + '"' + (k === ck ? ' selected' : '') + '>' + esc(csLabel(k)) + '</option>').join(''); }
    const setColor = (id, v) => { const s = $(id); if(v && ![...s.options].some(o => o.value === v)){ const op = document.createElement('option'); op.value = v; op.textContent = '■ ' + v; s.insertBefore(op, s.lastElementChild); } s.value = v || (id === 'tseFill' ? 'BYLAYER' : ''); };
    // ô "Màu nền": Không có (None) thay cho ByLayer
    { const f = $('tseFill'); const o0 = f.querySelector('option[value="BYLAYER"]'); if(o0){ o0.value = ''; o0.textContent = 'Không có'; } }
    let curBd = null;
    function load(){ const c = cs(); setColor('tseFill', c.fill || ''); $('tseAl').value = c.al || 'MC'; $('tseFmt').value = fmtName(c.fmt); $('tseType').value = c.type || 'data'; $('tseHm').value = r6(c.hm); $('tseVm').value = r6(c.vm); $('tseMerge').checked = !!c.merge;
      if(![...$('tseTs').options].some(o => o.value === c.ts)){ const op = document.createElement('option'); op.value = op.textContent = c.ts; $('tseTs').appendChild(op); } $('tseTs').value = c.ts || 'Standard'; $('tseTh').value = r6(c.th); setColor('tseCol', c.col || ''); $('tseAng').value = r6(c.ang || 0);
      const b0 = EDGES.map(k => c.bd[k]).find(b => b && b.on) || {}; setColor('tseBc', b0.col || ''); $('tseLw').value = b0.lw == null ? '' : String(b0.lw); $('tseLt').value = b0.lt || ''; $('tseDbl').checked = !!b0.dbl; $('tseSp').value = r6(b0.sp > 0 ? b0.sp : 1.125); $('tseSp').disabled = !b0.dbl; curBd = null; bdState(); }
    function pull(){ const c = cs(); c.fill = $('tseFill').value || ''; c.al = $('tseAl').value; c.type = $('tseType').value; const hm = num($('tseHm').value), vm = num($('tseVm').value); if(hm >= 0) c.hm = hm; if(vm >= 0) c.vm = vm; c.merge = $('tseMerge').checked ? 1 : 0;
      c.ts = $('tseTs').value; const th = num($('tseTh').value); if(th > 0) c.th = th; c.col = $('tseCol').value || ''; c.ang = num($('tseAng').value) || 0; st.dir = $('tseDir').value; }
    const bdProps = () => { const o = { on: 1 }; const col = $('tseBc').value; if(col) o.col = col; const lw = $('tseLw').value; if(lw !== '') o.lw = +lw; const lt = $('tseLt').value; if(lt) o.lt = lt; if($('tseDbl').checked){ o.dbl = 1; const sp = num($('tseSp').value); o.sp = sp > 0 ? sp : 1.125; } return o; };
    function bdState(){ const c = cs(); root.querySelectorAll('#tseBd [data-b]').forEach(b => { const L = (BDBTN.find(x => x[0] === b.dataset.b) || [])[2] || []; b.classList.toggle('on', L.length ? L.every(k => c.bd[k] && c.bd[k].on) : EDGES.every(k => !(c.bd[k] && c.bd[k].on))); }); }
    $('tseBd').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if(!b) return; const c = cs(), L = (BDBTN.find(x => x[0] === b.dataset.b) || [])[2] || [];
      if(!L.length){ for(const k of EDGES) c.bd[k] = { on: 0 }; }
      else { const p = bdProps(), same = L.every(k => c.bd[k] && c.bd[k].on && (c.bd[k].col || '') === (p.col || '') && (c.bd[k].lw == null ? '' : c.bd[k].lw) === (p.lw == null ? '' : p.lw) && (c.bd[k].lt || '') === (p.lt || '') && !!c.bd[k].dbl === !!p.dbl);
        for(const k of L) c.bd[k] = same ? { on: 0 } : Object.assign({}, p); }
      bdState(); paint(); });
    function paint(){ paintTable($('tsePv'), sampleTable(st));
      const c = cs(), one = { cells: { [ck]: c } }; const T = { o: { x: 0, y: 0 }, rot: 0, cw: [c.th * 7, c.th * 7], rh: [0], cells: [[csLabel(ck), c.merge ? '' : csLabel(ck)]], th: c.th, rs: [ck], tss: one };
      paintTable($('tseCpv'), T); }
    root.addEventListener('change', e => { if(e.target.id === 'tseCs'){ pull(); ck = e.target.value; load(); paint(); return; } if(e.target.id === 'tseDbl'){ $('tseSp').disabled = !e.target.checked; return; } if(e.target.closest('#tseBd')) return; pull(); paint(); });
    root.addEventListener('input', e => { if(e.target.type === 'number'){ pull(); paint(); } });
    $('tseFmtB').onclick = () => cellFormat(cs().fmt, f => { cs().fmt = f; $('tseFmt').value = fmtName(f); paint(); });
    $('tseTsB').onclick = () => { try{ DVDCmd.run('STYLE'); }catch(_){} };
    $('tseStart').onclick = async () => { const e = await pickEnt(root, 'Chọn bảng làm mẫu (Esc = huỷ)', x => !!carrierOf(x)); const c = e && carrierOf(e); if(!c) return; const T = c.tbld;
      if(T.tss && T.tss.cells){ st.cells = deep(T.tss.cells); st.dir = T.tss.dir || 'down'; } else { const th = T.th || 2.5; st.cells = { Title: cellDef(th * 1.15, { type: 'label', merge: 1, hm: th * 0.6, vm: th * 0.6 }), Header: cellDef(th, { type: 'label', hm: th * 0.6, vm: th * 0.6 }), Data: cellDef(th, { hm: th * 0.6, vm: th * 0.6 }) }; }
      ck = 'Data'; fillCs(); load(); paint(); log('Đã lấy định dạng từ bảng có sẵn.'); };
    $('tseStartX').onclick = () => { st.cells = styleDef().cells; st.dir = 'down'; $('tseDir').value = 'down'; ck = 'Data'; fillCs(); load(); paint(); };
    $('tseCsNew').onclick = () => A.dialog({ title: 'Tạo kiểu ô mới', cls: 'acw-free', help: 'TABLESTYLE', html: '<div class="acw" style="width:320px">' + K.vrow('Tên kiểu ô mới:', K.txt('csnN', 'Bản sao của ' + csLabel(ck))) + K.vrow('Bắt đầu từ:', K.sel('csnF', Object.keys(st.cells).map(k => [k, csLabel(k)]), ck)) + '</div>', okText: 'Tiếp tục',
      ok: r => { const n = K.val(r, 'csnN').trim(); if(!n){ say('Nhập tên.'); return false; } if(st.cells[n] || BASE_CS.some(k => csLabel(k) === n)){ say('Đã có kiểu ô "' + n + '".'); return false; } pull(); st.cells[n] = deep(st.cells[K.val(r, 'csnF')] || cellDef(4.5)); ck = n; fillCs(); load(); paint(); } });
    $('tseCsMgr').onclick = () => { pull(); let s2 = ck; const items = () => Object.keys(st.cells).map(k => ({ v: k, t: csLabel(k) }));
      const d2 = A.dialog({ title: 'Quản lý kiểu ô', cls: 'acw-free', help: 'TABLESTYLE', html: '<div class="acw" style="width:340px"><div class="acw-cols"><div class="c1"><div class="acw-lab">Kiểu ô:</div><div id="csmL"></div></div><div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('csmNew', 'Mới…') + K.btn('csmRen', 'Đổi tên') + K.btn('csmDel', 'Xoá') + '</div></div></div>', noCancel: true,
        ok: () => { if(!st.cells[ck]) ck = 'Data'; fillCs(); load(); paint(); } });
      const r2 = d2.root, $2 = id => r2.querySelector('#' + id);
      const rr = () => { $2('csmL').innerHTML = K.list('csmLL', items(), s2, 'height:180px'); K.bindList($2('csmLL'), v => { s2 = v; $2('csmRen').disabled = $2('csmDel').disabled = BASE_CS.includes(s2); }); $2('csmRen').disabled = $2('csmDel').disabled = BASE_CS.includes(s2); };
      $2('csmNew').onclick = async () => { const n = await askText({ title: 'Tên kiểu ô mới', value: 'Kiểu ô ' + (Object.keys(st.cells).length + 1) }); const t = n && n.trim(); if(!t || st.cells[t]) return; st.cells[t] = deep(st.cells[s2] || cellDef(4.5)); s2 = t; rr(); };
      $2('csmRen').onclick = async () => { const n = await askText({ title: 'Đổi tên kiểu ô', value: s2 }); const t = n && n.trim(); if(!t || t === s2 || st.cells[t]) return; st.cells[t] = st.cells[s2]; delete st.cells[s2]; if(ck === s2) ck = t; s2 = t; rr(); };
      $2('csmDel').onclick = () => { if(BASE_CS.includes(s2)) return; delete st.cells[s2]; if(ck === s2) ck = 'Data'; s2 = 'Data'; rr(); };
      rr(); };
    fillCs(); load(); paint();
    return d;
  }
  // Table Cell Format: kiểu dữ liệu, độ chính xác, ký hiệu tiền tệ, dấu phân cách hàng nghìn
  function cellFormat(f0, cb){
    const f = Object.assign({ t: 'gen', p: 2, sym: '$' }, f0 || {});
    const d = A.dialog({ title: 'Định dạng ô bảng', cls: 'acw-free', help: 'TABLESTYLE', html: '<div class="acw" style="width:430px"><div class="acw-cols"><div class="c1" style="flex:0 0 150px"><div class="acw-lab">Kiểu dữ liệu:</div>' + K.list('cfT', FMT.map(([v, t]) => ({ v, t })), f.t, 'height:170px') + '</div><div class="c1">' +
        '<div class="acw-lab">Ví dụ:</div><input id="cfEx" readonly style="width:100%;box-sizing:border-box;margin-bottom:8px">' +
        K.row('Độ chính xác:', K.sel('cfP', [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [String(i), i ? '0.' + '0'.repeat(i) : '0']), String(f.p))) + K.row('Ký hiệu:', K.txt('cfSym', f.sym)) +
        K.chk('cfEnd', 'Ký hiệu đặt sau số', !!f.symEnd) + '<br>' + K.chk('cfSep', 'Dấu phân cách hàng nghìn', !!f.sep) + '</div></div></div>',
      ok: r => { cb(get()); } });
    const root = d.root, $ = id => root.querySelector('#' + id); let t = f.t;
    const get = () => { const o = { t }; if(t === 'dec' || t === 'pct' || t === 'cur'){ o.p = +$('cfP').value; } if(t === 'cur'){ o.sym = $('cfSym').value; if($('cfEnd').checked) o.symEnd = 1; } if(t !== 'gen' && t !== 'text' && $('cfSep').checked) o.sep = 1; return o; };
    const upd = () => { const on = t === 'dec' || t === 'pct' || t === 'cur'; $('cfP').disabled = !on; $('cfSym').disabled = $('cfEnd').disabled = t !== 'cur'; $('cfSep').disabled = t === 'gen' || t === 'text'; $('cfEx').value = A.tblFmt ? A.tblFmt(t === 'pct' ? '0.125' : '1234.5678', get()) : ''; };
    K.bindList($('cfT'), v => { t = v; upd(); }); root.addEventListener('change', upd); root.addEventListener('input', upd); upd();
  }
  const carrierOf = e => { if(!e) return null; if(e.tbld) return e; if(e.grp && e.blk === '*TABLE') return modelEntities.find(x => x.grp === e.grp && x.tbld) || null; return null; };
  plain(['TABLESTYLE', 'TS'], 'Kiểu bảng (Table Style): kiểu ô Tiêu đề / Tên cột / Dữ liệu — chữ, lề, căn lề, nền, định dạng, đường viền', () => tableStyleMgr());

  /* ==================================================================
     TABLE — Insert Table (như AutoCAD 2027): kiểu bảng, cách tạo, xem trước, cách chèn (điểm / khung),
     số cột / rộng cột, hàng dữ liệu / cao hàng (theo số dòng), kiểu ô của hàng 1, hàng 2 và các hàng còn lại
     ================================================================== */
  const TIK = 'dvd:tblins';
  const rowH = (s, lines) => (lines || 1) * s.th * 4 / 3 + 2 * s.vm;
  function insertTable(){
    const P0 = Object.assign({ src: 'empty', ins: 'pt', cols: 5, cw: 63.5, rows: 1, lines: 1, s1: 'Title', s2: 'Header', s3: 'Data', pv: 1 }, lsGet(TIK, {}));
    let lib = tbLib(), sty = lib.cur;
    const csOpts = () => Object.keys(lib.list[sty].cells).map(k => [k, csLabel(k)]);
    const html = '<div class="acw" style="width:700px"><div class="acw-cols"><div class="c1" style="flex:1 1 50%">' +
      K.grp('Kiểu bảng', '<div style="display:flex;gap:4px"><select id="itSty" style="flex:1"></select>' + K.btn('itStyB', '…', { tip: 'Kiểu bảng (TABLESTYLE)' }) + '</div>') +
      K.grp('Cách tạo', K.rad('itSrc', 'empty', 'Bắt đầu từ bảng rỗng', P0.src === 'empty') + '<br>' + K.rad('itSrc', 'paste', 'Dán dữ liệu từ Excel', P0.src === 'paste') +
        '<textarea id="itData" style="width:100%;height:64px;margin:3px 0;box-sizing:border-box;display:none" placeholder="Chọn vùng ô trong Excel → Ctrl+C → dán vào đây"></textarea><br>' +
        K.rad('itSrc', 'link', 'Từ liên kết dữ liệu (Excel / CSV)', P0.src === 'link') + '<br>' + K.rad('itSrc', 'dx', 'Từ dữ liệu đối tượng trong bản vẽ (Data Extraction)', P0.src === 'dx')) +
      '<div>' + K.chk('itPv', 'Xem trước', P0.pv) + '</div>' + K.canvas('itCv', 330, 180) + '</div><div class="c1" style="flex:1 1 50%">' +
      K.grp('Cách chèn', K.rad('itIns', 'pt', 'Chỉ định điểm chèn', P0.ins !== 'win') + '<br>' + K.rad('itIns', 'win', 'Chỉ định khung', P0.ins === 'win')) +
      K.grp('Cột và hàng', '<div class="acw-w3" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px">' + K.row('Cột:', K.num('itCols', P0.cols, { min: 1, step: 1 })) + K.row('Rộng cột:', K.num('itCw', P0.cw, { min: 0 })) +
        K.row('Hàng dữ liệu:', K.num('itRows', P0.rows, { min: 1, step: 1 })) + K.row('Cao hàng (dòng):', K.num('itLines', P0.lines, { min: 1, step: 1 })) + '</div>') +
      K.grp('Kiểu ô', K.row('Kiểu ô hàng thứ nhất:', '<select id="itS1"></select>') + K.row('Kiểu ô hàng thứ hai:', '<select id="itS2"></select>') + K.row('Kiểu ô các hàng còn lại:', '<select id="itS3"></select>')) +
      '</div></div></div>';
    return new Promise(res => {
      const d = A.dialog({ title: 'Chèn bảng', cls: 'acw-free', help: 'TABLE', html, ok: r => { const o = get(); lsSet(TIK, Object.assign({}, o, { data: undefined })); res(o); }, cancel: () => res(null) });
      const root = d.root, $ = id => root.querySelector('#' + id);
      const fillSty = () => { lib = tbLib(); if(!lib.list[sty]) sty = lib.cur; $('itSty').innerHTML = Object.keys(lib.list).map(n => '<option value="' + esc(n) + '"' + (n === sty ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
        const fill = (id, v) => { const s = $(id); const cur = s.value || v; s.innerHTML = csOpts().map(([k, t]) => '<option value="' + esc(k) + '"' + (k === cur ? ' selected' : '') + '>' + esc(t) + '</option>').join(''); if(!lib.list[sty].cells[cur]) s.value = 'Data'; };
        fill('itS1', P0.s1); fill('itS2', P0.s2); fill('itS3', P0.s3); };
      const get = () => { const v = id => num($(id).value); return { sty, src: K.radio(root, 'itSrc'), ins: K.radio(root, 'itIns'), cols: Math.max(1, Math.min(60, v('itCols') | 0 || 1)), cw: v('itCw') > 0 ? v('itCw') : 63.5, rows: Math.max(1, Math.min(500, v('itRows') | 0 || 1)), lines: Math.max(1, Math.min(20, v('itLines') | 0 || 1)), s1: $('itS1').value, s2: $('itS2').value, s3: $('itS3').value, pv: $('itPv').checked ? 1 : 0, data: $('itData').value }; };
      const paint = () => { const o = get(), cv = $('itCv'); cv.style.visibility = o.pv ? '' : 'hidden'; if(!o.pv) return; const T = buildDef(o, true); paintTable(cv, T); };
      const upd = () => { const o = get(); $('itData').style.display = o.src === 'paste' ? '' : 'none'; const dis = o.src === 'link' || o.src === 'dx'; ['itCols', 'itCw', 'itRows', 'itLines', 'itS1', 'itS2', 'itS3'].forEach(id => { $(id).disabled = dis; }); paint(); };
      $('itSty').onchange = () => { sty = $('itSty').value; fillSty(); upd(); };
      $('itStyB').onclick = () => tableStyleMgr(() => { fillSty(); upd(); });
      root.addEventListener('change', e => { if(e.target.id !== 'itSty') upd(); }); root.addEventListener('input', () => paint());
      fillSty(); upd();
    });
  }
  const tsv = t => { const rows = String(t || '').replace(/\r/g, '').split('\n'); while(rows.length && !rows[rows.length - 1].trim()) rows.pop(); return rows.map(r => r.split('\t')); };
  function buildDef(o, sample){
    const st = deep(tbLib().list[o.sty] || styleDef()), CS = st.cells; const s = k => CS[k] || CS.Data;
    let data = o.src === 'paste' ? tsv(o.data) : [];
    let nc = o.cols, rs = [o.s1, o.s2].concat(Array(o.rows).fill(o.s3));
    if(data.length){ nc = Math.max(...data.map(r => r.length)); const hasTitle = o.s1 === 'Title' && data[0].filter(x => String(x).trim()).length <= 1 && nc > 1; rs = (o.s1 === 'Title' && !hasTitle ? ['Title'] : []).concat(data.map((_, i) => i === 0 && hasTitle ? 'Title' : (i === 0 && o.s1 !== 'Title') ? o.s1 : (i === (hasTitle ? 1 : 0) && o.s1 === 'Title') ? o.s2 : o.s3)); if(o.s1 === 'Title' && !hasTitle) data = [['']].concat(data); }
    const cells = rs.map((k, r) => Array.from({ length: nc }, (_, c) => data.length ? String((data[r] || [])[c] == null ? '' : data[r][c]).trim() : sample ? (s(k).merge ? (c === 0 ? csLabel(k) : '') : csLabel(k)) : ''));
    const rh = rs.map(k => rowH(s(k), s(k).merge ? 1 : o.lines));
    const T = { o: { x: 0, y: 0 }, rot: 0, cw: Array(nc).fill(o.cw), rh, cells, th: s('Data').th, title: rs[0] === 'Title', head: rs.indexOf('Header') >= 0 && rs.indexOf('Header') <= 1, rs, ts: o.sty, tss: st };
    if(data.length){ for(let c = 0; c < nc; c++){ let mx = 0; for(let r = 0; r < rs.length; r++){ if(s(rs[r]).merge) continue; mx = Math.max(mx, [...String(cells[r][c] || '')].length * s(rs[r]).th * 0.75); } T.cw[c] = Math.max(o.cw * 0.25, mx + 2 * s('Data').hm + s('Data').th); } }
    return T;
  }
  async function tableCmd(){
    const o = await insertTable(); if(!o) return;
    if(o.src === 'link'){ setTimeout(() => DVDCmd.run('DATALINK'), 0); return; }
    if(o.src === 'dx'){ setTimeout(() => DVDCmd.run('DATAEXTRACTION'), 0); return; }
    const T = buildDef(o, false); const up = T.tss.dir === 'up';
    if(o.ins === 'win'){
      const a = await A.getPoint('Chỉ định góc thứ nhất'); if(!a.pt) return;
      const b = await A.getPoint('Chỉ định góc thứ hai', { base: a.pt, rubber: false, preview: (g, p) => { const t2 = deep(T); fitWin(t2, a.pt, p); g.ents(A.tblBuild(t2)); } }); if(!b.pt) return;
      fitWin(T, a.pt, b.pt);
    } else {
      const r = await A.getPoint(up ? 'Chỉ định điểm chèn (góc dưới trái của bảng)' : 'Chỉ định điểm chèn (góc trên trái của bảng)', { preview: (g, p) => { const t2 = deep(T); t2.o = p; g.ents(A.tblBuild(t2)); } }); if(!r.pt) return;
      T.o = { x: r.pt.x, y: r.pt.y };
    }
    const w = A.newProps({ type: 'LINE' }); delete w.lt; w.tbld = T; w.grp = A.newGroupId('T'); const ents = A.tblRegenFrom(w).map(e => { delete e.userAdded; return e; });
    A.commit({ add: ents }, 'Đã chèn bảng ' + T.cells.length + '×' + T.cw.length + ' (kiểu "' + o.sty + '")');
    if(o.src !== 'paste' && A.editTable){ const c = ents.find(e => e.tbld) || ents[0]; setTimeout(() => A.editTable(c), 50); }
  }
  // chèn theo khung: rộng cột = rộng khung / số cột, cao hàng = cao khung / số hàng
  function fitWin(T, a, b){ const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y); const nc = T.cw.length, nr = T.rh.length;
    const Wd = Math.max(1e-6, x1 - x0), Hd = Math.max(1e-6, y1 - y0); const H0 = T.rh.reduce((s, v) => s + v, 0);
    T.cw = T.cw.map(() => Wd / nc); T.rh = T.rh.map(h => h * Hd / Math.max(1e-9, H0)); void nr; T.o = T.tss && T.tss.dir === 'up' ? { x: x0, y: y0 } : { x: x0, y: y1 }; }
  ecmd(['TABLE', 'TB'], 'Chèn bảng (Insert Table): theo kiểu bảng, bảng rỗng / dán từ Excel / liên kết dữ liệu, chèn theo điểm hoặc khung', () => tableCmd());
  /* ==================================================================
     MATCHCELL — sao chép kiểu ô bảng sang các ô khác (như AutoCAD)
     ================================================================== */
  function tableAtPoint(p){ for(const e of modelEntities){ if(!e.tbld || !A.tblCellAt) continue; const rc = A.tblCellAt(e.tbld, p); if(rc) return { c: e, rc }; } return null; }
  ecmd(['MATCHCELL'], 'Sao chép thuộc tính ô bảng (kiểu ô): chọn ô nguồn rồi các ô đích', async () => {
    const a = await A.getPoint('Chọn ô nguồn'); if(!a.pt) return; const s = tableAtPoint(a.pt); if(!s){ log('Không có ô bảng tại điểm này.'); return; }
    const T0 = s.c.tbld; if(!T0.tss){ log('Bảng này không theo kiểu bảng — chèn bảng bằng TABLE để dùng kiểu ô.'); return; }
    const key = (T0.cs && T0.cs[s.rc.r + ',' + s.rc.c]) || A.tblRowKind(T0, s.rc.r), st = deep(T0.tss.cells[key] || {});
    for(;;){ const b = await A.getPoint('Chọn ô đích'); if(!b.pt) return; const d = tableAtPoint(b.pt); if(!d){ log('Không có ô bảng tại điểm này.'); continue; }
      if(!d.c.tbld.tss){ log('Bảng đích không theo kiểu bảng.'); continue; }
      const w = deep(d.c); delete w.userAdded; const T = w.tbld; if(!T.tss.cells[key]) T.tss.cells[key] = st;
      T.cs = T.cs || {}; T.cs[d.rc.r + ',' + d.rc.c] = key; A.commit({ rep: [[d.c, w]] }, 'MATCHCELL: ô ' + String.fromCharCode(65 + (d.rc.c % 26)) + (d.rc.r + 1) + ' → kiểu ô "' + csLabel(key) + '"'); }
  });

  /* ==================================================================
     COUNT / COUNTLIST / COUNTFIELD / COUNTCLOSE — đếm khối như AutoCAD 2027:
     thanh đếm trên vùng vẽ (◀ ▶ duyệt từng bản chèn, chèn trường, tạo bảng), bảng Count liệt kê mọi khối
     ================================================================== */
  const isRef = e => !!(e && e.grp && e.bm && e.blk && !String(e.blk).startsWith('*'));
  const CNT = { name: null, i: -1, bar: null, pal: null, area: null };
  const inArea = L => { const a = CNT.area; if(!a) return true; for(const e of L){ const b = entBBox(e); if(b && b.x1 >= a.x0 && b.x0 <= a.x1 && b.y1 >= a.y0 && b.y0 <= a.y1) return true; } return false; };
  function refsOf(name){ const m = new Map(); for(const e of modelEntities){ if(e.grp && e.blk === name){ let L = m.get(e.grp); if(!L){ L = []; m.set(e.grp, L); } L.push(e); } } return [...m.values()].filter(inArea); }
  function countAll(){ const m = new Map(); const seen = new Map(); for(const e of modelEntities){ if(!isRef(e)) continue; let L = seen.get(e.grp); if(!L){ L = []; seen.set(e.grp, L); } L.push(e); }
    for(const L of seen.values()){ if(!inArea(L)) continue; const n = L[0].blk; m.set(n, (m.get(n) || 0) + 1); } return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi')); }
  A.countBlocks = countAll;
  const bbOf = L => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of L){ const b = entBBox(e); if(!b) continue; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
  function selRefs(L){ selEnts.clear(); for(const g of L) for(const e of g) selEnts.add(e); try{ refreshPanSel(); }catch(_){ try{ draw(); }catch(__){} } }
  function zoomRef(g){ const b = bbOf(g); if(!b) return; const m = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 1.5 + 1e-6; zoomToWorldRect((b.x0 + b.x1) / 2 - m, (b.y0 + b.y1) / 2 - m, (b.x0 + b.x1) / 2 + m, (b.y0 + b.y1) / 2 + m); }
  const barCss = document.createElement('style');
  barCss.textContent = `.cnt-bar{position:absolute;top:30px;left:50%;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:2px;background:#3b4453;border:1px solid #5d697e;border-radius:3px;padding:3px 6px;color:#e8ecf2;font:12px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4)}
  .cnt-bar b{color:#fff;margin:0 4px}.cnt-bar .sp{width:1px;height:18px;background:#5d697e;margin:0 5px}
  .cnt-bar button{background:none;border:1px solid transparent;color:#e8ecf2;border-radius:2px;height:24px;min-width:24px;padding:0 6px;cursor:pointer;font:12px inherit}
  .cnt-bar button:hover{background:#4c5869;border-color:#61708a}
  .cnt-tbl{width:100%;border-collapse:collapse;font-size:12px}.cnt-tbl td,.cnt-tbl th{padding:2px 6px;border-bottom:1px solid rgba(255,255,255,.05);text-align:left;white-space:nowrap}
  .cnt-tbl th{background:#434c5b;font-weight:400;position:sticky;top:0}.cnt-tbl tr[data-n]{cursor:default}.cnt-tbl tr[data-n]:hover td{background:#30384a}.cnt-tbl tr.on td{background:#0b5f8f}
  .cnt-tbl td.n{text-align:right}.cnt-tbl canvas{display:block}`;
  document.head.appendChild(barCss);
  function showBar(){ hideBar(); const name = CNT.name; if(!name) return; const L = refsOf(name); const cv = document.getElementById('cv'); if(!cv || !cv.parentElement) return;
    const b = document.createElement('div'); b.className = 'cnt-bar';
    b.innerHTML = '<span class="nm" translate="no"></span><b translate="no">' + L.length + '</b><span class="t">bản chèn</span><span class="sp"></span><button type="button" data-a="prev" title="Bản chèn trước">◀</button><span class="i" translate="no">' + (CNT.i >= 0 ? (CNT.i + 1) + '/' + L.length : '') + '</span><button type="button" data-a="next" title="Bản chèn sau">▶</button><span class="sp"></span>' +
      '<button type="button" data-a="field" title="Chèn trường đếm (COUNTFIELD)">⊞ Chèn trường</button><button type="button" data-a="table" title="Tạo bảng đếm">▦ Tạo bảng</button><button type="button" data-a="list" title="Bảng Count (COUNTLIST)">☰</button><button type="button" data-a="x" title="Thoát đếm">✕</button>';
    b.querySelector('.nm').textContent = name;
    b.addEventListener('click', e => { const x = e.target.closest('[data-a]'); if(!x) return; const a = x.dataset.a, L2 = refsOf(name); if(!L2.length){ hideBar(); return; }
      if(a === 'prev' || a === 'next'){ CNT.i = ((CNT.i < 0 ? (a === 'next' ? -1 : 0) : CNT.i) + (a === 'next' ? 1 : -1) + L2.length) % L2.length; selRefs([L2[CNT.i]]); zoomRef(L2[CNT.i]); b.querySelector('.i').textContent = (CNT.i + 1) + '/' + L2.length; }
      if(a === 'field') DVDCmd.run('COUNTFIELD'); if(a === 'table') countTable([[name, L2.length]]); if(a === 'list') countList(); if(a === 'x'){ CNT.name = null; CNT.i = -1; hideBar(); selEnts.clear(); try{ refreshPanSel(); }catch(_){} } });
    cv.parentElement.appendChild(b); CNT.bar = b; }
  function hideBar(){ if(CNT.bar){ CNT.bar.remove(); CNT.bar = null; } }
  function startCount(name){ CNT.name = name; CNT.i = -1; const L = refsOf(name); selRefs(L); showBar(); log('Đếm "' + name + '": ' + L.length + ' bản chèn' + (CNT.area ? ' trong vùng chỉ định' : '') + '.'); if(CNT.pal) palRender(); }
  async function countTable(rows){ if(!rows || !rows.length){ say('Không có khối nào.'); return; }
    const tot = rows.reduce((s, r) => s + r[1], 0); const lib = tbLib(), st = deep(lib.list[lib.cur] || styleDef());
    const data = [['Tên khối', 'Số lượng']].concat(rows.map(([n, c]) => [n, String(c)])).concat(rows.length > 1 ? [['Tổng', String(tot)]] : []);
    const rs = ['Title', 'Header'].concat(Array(data.length - 1).fill('Data')); const cells = [['THỐNG KÊ KHỐI', '']].concat(data); const s = k => st.cells[k] || st.cells.Data;
    const cw = [Math.max(...data.map(r => [...r[0]].length)) * s('Data').th * 0.8 + 2 * s('Data').hm + s('Data').th, s('Data').th * 7];
    const T = { o: { x: 0, y: 0 }, rot: 0, cw, rh: rs.map(k => rowH(s(k), 1)), cells, th: s('Data').th, title: true, head: true, rs, ts: lib.cur, tss: st, cntTbl: 1 };
    setTimeout(() => A.run('COUNT', async () => { const r = await A.getPoint('Chỉ định điểm chèn bảng (góc trên trái)', { rubber: false, preview: (g, p) => { const t2 = deep(T); t2.o = p; g.ents(A.tblBuild(t2)); } }); if(!r.pt) return; T.o = { x: r.pt.x, y: r.pt.y };
      const w = A.newProps({ type: 'LINE' }); delete w.lt; w.tbld = T; w.grp = A.newGroupId('T'); A.commit({ add: A.tblRegenFrom(w) }, 'Đã chèn bảng đếm ' + rows.length + ' loại khối'); }), 0); }
  let palSel = null;
  function countList(){
    if(CNT.pal && document.body.contains(CNT.pal.root)){ palRender(); return CNT.pal; }
    const html = '<div class="acw" style="width:330px"><div class="acw-row">' + K.sel('cnScope', [['all', 'Toàn bản vẽ (Model)'], ['area', 'Vùng chỉ định…']], CNT.area ? 'area' : 'all') + K.btn('cnTbl', '▦', { tip: 'Tạo bảng đếm' }) + K.btn('cnRef', '⟳', { tip: 'Làm mới' }) + '</div>' +
      '<div style="height:330px;overflow:auto;border:1px solid #5a6578;background:#262b34;margin-top:4px"><table class="cnt-tbl"><thead><tr><th></th><th>Tên khối</th><th style="text-align:right">Số lượng</th></tr></thead><tbody id="cnB"></tbody></table></div>' +
      '<div class="acw-note" id="cnTot"></div></div>';
    const d = A.dialog({ title: 'Đếm', cls: 'acw-free', help: 'COUNTLIST', html, modeless: true, noOk: true, cancelText: 'Đóng', cancel: () => { CNT.pal = null; } });
    CNT.pal = d; const root = d.root, $ = id => root.querySelector('#' + id);
    $('cnB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; palSel = tr.dataset.n; startCount(palSel); });
    $('cnB').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; const b = bbOf(refsOf(tr.dataset.n).flat()); if(b) zoomToWorldRect(b.x0, b.y0, b.x1, b.y1); });
    $('cnScope').onchange = async () => { if($('cnScope').value === 'all'){ CNT.area = null; palRender(); if(CNT.name) showBar(); return; }
      root.style.display = 'none'; const w = await pickWin2(); root.style.display = ''; if(!w){ $('cnScope').value = CNT.area ? 'area' : 'all'; return; } CNT.area = w; palRender(); if(CNT.name) startCount(CNT.name); };
    $('cnTbl').onclick = () => countTable(countAll()); $('cnRef').onclick = () => palRender();
    palRender(); return d;
  }
  const pickWin2 = () => new Promise(res => { const cv = document.getElementById('cv'); let a = null; log('Chỉ định góc thứ nhất của vùng đếm (Esc = huỷ)');
    const pt = e => { const r = cv.getBoundingClientRect(); return toWorld(e.clientX - r.left, e.clientY - r.top); };
    const off = () => { document.removeEventListener('pointerdown', dn, true); window.removeEventListener('keydown', kd, true); };
    const dn = e => { if(e.target !== cv) return; e.preventDefault(); e.stopPropagation(); if(!a){ a = pt(e); log('Chỉ định góc đối diện'); return; } const b = pt(e); off(); res({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) }); };
    const kd = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); off(); res(null); } };
    document.addEventListener('pointerdown', dn, true); window.addEventListener('keydown', kd, true); });
  function palRender(){ const d = CNT.pal; if(!d || !document.body.contains(d.root)) return; const root = d.root, rows = countAll();
    root.querySelector('#cnB').innerHTML = rows.length ? rows.map(([n, c], i) => '<tr data-n="' + esc(n) + '"' + (n === CNT.name ? ' class="on"' : '') + '><td>' + K.canvas('cnI' + i, 30, 22) + '</td><td translate="no">' + esc(n) + '</td><td class="n">' + c + '</td></tr>').join('') : '<tr><td colspan="3" style="color:#9aa6ba;padding:8px">Không có khối nào.</td></tr>';
    rows.forEach(([n], i) => { const g = refsOf(n)[0]; if(g) K.paint(root.querySelector('#cnI' + i), deep(g).map(e => { if(!e.col) e.col = '#cfd6e0'; return e; }), { pad: 2 }); });
    const tot = rows.reduce((s, r) => s + r[1], 0); root.querySelector('#cnTot').textContent = rows.length + ' loại khối · ' + tot + ' bản chèn' + (CNT.area ? ' (vùng chỉ định)' : ''); }
  // cập nhật bảng Count, thanh đếm và trường đếm (COUNTFIELD) sau mỗi thay đổi bản vẽ
  let cntT = 0;
  const cntRefresh = () => { cntT = 0; try{ if(CNT.pal) palRender(); if(CNT.bar && CNT.name){ const L = refsOf(CNT.name); const b = CNT.bar.querySelector('b'); if(b) b.textContent = L.length; }
      let ch = 0; for(const e of modelEntities){ if(!e.fld || e.fld.k !== 'count' || !e.fld.blk || !A.fieldValue) continue; const t = (e.fld.pre || '') + A.fieldValue(e.fld) + (e.fld.suf || ''); if(t !== e.text){ e.text = t; ch++; } }
      if(ch){ try{ bbDirty = true; invalidateSnap(); }catch(_){} try{ draw(); }catch(_){} } }catch(err){ console.warn('count', err); } };
  { const _c = A.commit; A.commit = function(){ const r = _c.apply(this, arguments); if(!cntT) cntT = setTimeout(cntRefresh, 60); return r; }; }
  ecmd(['COUNT', 'BCOUNT', 'DEMKHOI'], 'Đếm khối (Count): chọn một khối để đếm và duyệt các bản chèn, chèn trường đếm, tạo bảng; Danh sách = bảng Count', async (_, cur) => {
    const pre = cur && cur.pre ? cur.pre.find(isRef) : null; if(cur) cur.pre = [];
    if(pre){ startCount(pre.blk); countList(); return; }
    for(;;){ const r = await A.getEnt('Chọn khối cần đếm hoặc', { filter: isRef, kw: [{ k: 'A', t: 'Vùng' }, { k: 'M', t: 'Model' }, { k: 'L', t: 'Danh sách' }, { k: 'T', t: 'Bảng' }] });
      if(r.kw === 'A'){ const a = await A.getPoint('Chỉ định góc thứ nhất của vùng đếm'); if(!a.pt) return; const b = await A.getPoint('Chỉ định góc đối diện', { base: a.pt }); if(!b.pt) return; CNT.area = { x0: Math.min(a.pt.x, b.pt.x), y0: Math.min(a.pt.y, b.pt.y), x1: Math.max(a.pt.x, b.pt.x), y1: Math.max(a.pt.y, b.pt.y) }; log('Vùng đếm đã đặt.'); continue; }
      if(r.kw === 'M'){ CNT.area = null; log('Đếm trong toàn bản vẽ.'); continue; }
      if(r.kw === 'L'){ countList(); return; }
      if(r.kw === 'T'){ countTable(countAll()); return; }
      if(!r.ent) return; startCount(r.ent.blk); countList(); return; }
  });
  plain(['COUNTLIST', 'COUNTPALETTE'], 'Bảng Count: danh sách khối và số bản chèn (bấm để đếm, kích đúp để phóng tới)', () => countList());
  plain(['COUNTCLOSE'], 'Đóng bảng Count và thanh đếm', () => { if(CNT.pal){ try{ CNT.pal.close(); }catch(_){} CNT.pal = null; } CNT.name = null; CNT.i = -1; hideBar(); });
  ecmd(['COUNTFIELD'], 'Chèn trường đếm số bản chèn của một khối (tự cập nhật khi thêm / xoá khối)', async () => {
    let name = CNT.name; if(!name){ const r = await A.getEnt('Chọn khối cần đếm', { filter: isRef }); if(!r.ent) return; name = r.ent.blk; }
    const p = await A.getPoint('Chỉ định điểm chèn trường đếm "' + name + '"'); if(!p.pt) return;
    const f = { k: 'count', blk: name }; const h = (A.sysvar && +A.sysvar.get('TEXTSIZE')) || 2.5;
    const e = A.newProps({ type: 'TEXT', x: p.pt.x, y: p.pt.y, h, rot: 0, text: A.fieldValue ? A.fieldValue(f) : String(refsOf(name).length), fld: f });
    A.commit({ add: [e] }, 'Đã chèn trường đếm khối "' + name + '"');
  });

  // duyệt bản chèn đang đếm như nút ◀ ▶ của thanh đếm
  function countStep(dir){ if(!CNT.name){ say('Chưa đếm khối nào — dùng COUNT.'); return; } const L = refsOf(CNT.name); if(!L.length){ say('Không còn bản chèn nào của "' + CNT.name + '".'); return; }
    CNT.i = ((CNT.i < 0 ? (dir > 0 ? -1 : 0) : CNT.i) + dir + L.length) % L.length; selRefs([L[CNT.i]]); zoomRef(L[CNT.i]);
    if(!CNT.bar) showBar(); const i = CNT.bar && CNT.bar.querySelector('.i'); if(i) i.textContent = (CNT.i + 1) + '/' + L.length; log('"' + CNT.name + '": bản chèn ' + (CNT.i + 1) + '/' + L.length); }
  plain(['COUNTNEXT'], 'Phóng tới bản chèn kế tiếp của khối đang đếm', () => countStep(1));
  plain(['COUNTPREV'], 'Phóng tới bản chèn trước của khối đang đếm', () => countStep(-1));
  plain(['COUNTREFRESH'], 'Đếm lại: cập nhật thanh đếm, bảng Count, trường và bảng đếm', () => { cntRefresh(); if(CNT.name){ const L = refsOf(CNT.name); selRefs(L); showBar(); log('"' + CNT.name + '": ' + L.length + ' bản chèn.'); } else log('Đã cập nhật bảng Count và trường đếm.'); });

  /* ==================================================================
     BREPLACE — Thay khối (Express Tools): thay mọi bản chèn khối A bằng khối B (giữ điểm chèn, tỉ lệ, góc, lớp)
     ================================================================== */
  function blockNames(){ const s = new Set(); for(const e of modelEntities) if(isRef(e)) s.add(e.blk); try{ for(const n of Object.keys(A.blockLib ? A.blockLib() : {})) s.add(n); }catch(_){} try{ for(const n of (A.fileBlockNames ? A.fileBlockNames() : Object.keys(window._dvdBlocks || {}))) if(!String(n).startsWith('*')) s.add(n); }catch(_){} return [...s].sort((a, b) => a.localeCompare(b, 'vi')); }
  const srcOf = n => (A.fileBlockNames ? A.fileBlockNames() : Object.keys(window._dvdBlocks || {})).includes(n) ? 'file' : 'lib';
  function breplace(from, to, purge){
    const groups = new Map(); for(const e of modelEntities) if(e.grp && e.blk === from){ let L = groups.get(e.grp); if(!L){ L = []; groups.set(e.grp, L); } L.push(e); }
    const del = [], add = [], sv = A.LS.cur;
    for(const L of groups.values()){ const h = L.find(e => e.bm) || L[0], m = h.bm || { a: 1, b: 0 }; const ip = h.bip || { x: m.e || 0, y: m.f || 0 }, sc = Math.hypot(m.a, m.b) || 1, rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
      try{ A.LS.cur = m.lay || h.layer || sv; const N = A.instBlock(to, srcOf(to), ip, sc, rot); if(!N.length) continue; del.push(...L); add.push(...N); }finally{ A.LS.cur = sv; } }
    if(!del.length){ say('Không có bản chèn nào của "' + from + '".'); return 0; }
    for(const e of add) delete e.userAdded;
    A.commit({ del, add }, 'BREPLACE: ' + groups.size + ' bản chèn "' + from + '" → "' + to + '"');
    if(purge){ try{ const L = A.blockLib(); if(L[from]){ delete L[from]; A.saveBlockLib(L); log('Đã dọn định nghĩa khối "' + from + '".'); } }catch(_){} }
    return groups.size;
  }
  A.breplace = breplace;
  plain(['BREPLACE', 'BLOCKREPLACE'], 'Thay khối (Block Replace): thay mọi bản chèn của một khối bằng khối khác', () => {
    const N = blockNames(); if(!N.length){ say('Bản vẽ chưa có khối nào.'); return; }
    const used = new Set(countAll().map(r => r[0])); let a = N.find(n => used.has(n)) || N[0], b = N.find(n => n !== a) || N[0];
    const items = cur => N.map(n => ({ v: n, h: '<span translate="no">' + esc(n) + '</span>' + (used.has(n) ? '' : ' <span style="color:#9aa6ba">(chưa dùng)</span>') }));
    const d = A.dialog({ title: 'Thay khối', cls: 'acw-free', help: 'BREPLACE', html: '<div class="acw" style="width:520px"><div class="acw-cols"><div class="c1"><div class="acw-lab">Khối bị thay:</div>' + K.list('brA', items(), a, 'height:200px') + '<div style="margin-top:4px">' + K.btn('brPa', 'Chọn trên bản vẽ <') + '</div></div>' +
        '<div class="c1"><div class="acw-lab">Thay bằng khối:</div>' + K.list('brB', items(), b, 'height:200px') + '<div style="margin-top:4px">' + K.btn('brPb', 'Chọn trên bản vẽ <') + '</div></div></div>' +
        K.canvas('brPv', 500, 90) + '<div style="margin-top:6px">' + K.chk('brPurge', 'Dọn định nghĩa khối bị thay khi xong (Purge)', 1) + '</div><div class="acw-note" id="brN"></div></div>',
      ok: () => { if(a === b){ say('Chọn hai khối khác nhau.'); return false; } const n = breplace(a, b, root.querySelector('#brPurge').checked); if(!n) return false; } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const upd = () => { $('brN').textContent = (countAll().find(r => r[0] === a) || [0, 0])[1] + ' bản chèn của "' + a + '" sẽ được thay bằng "' + b + '".';
      const pv = []; try{ const g = refsOf(a)[0]; if(g) pv.push(...deep(g)); }catch(_){} try{ const q = A.instBlock(b, srcOf(b), { x: 0, y: 0 }, 1, 0); const bb = bbOf(pv), bq = bbOf(q); if(bb && bq){ const dx = bb.x1 + (bb.x1 - bb.x0) * 0.6 - bq.x0, dy = (bb.y0 + bb.y1) / 2 - (bq.y0 + bq.y1) / 2; q.forEach(e => { try{ translateEnt(e, dx, dy); }catch(_){} }); } pv.push(...q); }catch(_){} K.paint($('brPv'), pv.map(e => { e.col = e.col || '#cfd6e0'; return e; })); };
    K.bindList($('brA'), v => { a = v; upd(); }); K.bindList($('brB'), v => { b = v; upd(); });
    const pk = (lst, set) => async () => { const e = await pickEnt(root, 'Chọn một bản chèn khối (Esc = huỷ)', isRef); if(!e) return; set(e.blk); const it = [...$(lst).querySelectorAll('.it')].find(x => x.dataset.v === e.blk); if(it){ it.click(); it.scrollIntoView({ block: 'nearest' }); } };
    $('brPa').onclick = pk('brA', v => { a = v; }); $('brPb').onclick = pk('brB', v => { b = v; });
    upd();
  });

  /* ==================================================================
     ADDSELECTED — vẽ đối tượng mới cùng loại và thuộc tính với đối tượng đã chọn (như AutoCAD)
     ================================================================== */
  let ADDP = null;
  { const _c = A.commit; A.commit = function(ch){ try{ if(ADDP && ch && ch.add && !(ch.del && ch.del.length) && !(ch.rep && ch.rep.length)) for(const e of ch.add){ if(!e) continue; const P = ADDP.p;
        e.layer = P.layer; if(P.bl){ e.bl = 1; e.col = A.layerHex(P.layer); } else { delete e.bl; if(P.col) e.col = P.col; } if(P.lt) e.lt = P.lt; else delete e.lt; if(P.lts) e.lts = P.lts; if(P.lw > 0) e.lw = P.lw; else delete e.lw; if(P.tp != null) e.tp = P.tp;
        if(e.type === 'TEXT' && P.style){ e.style = P.style; if(P.ff) e.ff = P.ff; } } }catch(err){ console.warn('addselected', err); } return _c.apply(this, arguments); }; }
  function addCmdOf(e){
    if(!e) return null; if(e.tbld || (e.grp && e.blk === '*TABLE')) return 'TABLE';
    if(e.dimd || (e.grp && String(e.blk || '').startsWith('*DIM'))){ const k = e.dimd && e.dimd.k; return k === 'ang' ? 'DIMANGULAR' : k === 'rad' ? 'DIMRADIUS' : k === 'dia' ? 'DIMDIAMETER' : k === 'arc' ? 'DIMARC' : k === 'ord' ? 'DIMORDINATE' : (e.dimd && e.dimd.al) ? 'DIMALIGNED' : 'DIMLINEAR'; }
    if(e.grp && e.blk === '*MLINE') return 'MLINE'; if(e.grp && /^\*(LEADER|MLEADER)/.test(e.blk || '')) return 'MLEADER';
    if(isRef(e)) return 'INSERT';
    return { LINE: 'LINE', POLYLINE: e.wipe ? 'WIPEOUT' : 'PLINE', CIRCLE: 'CIRCLE', ARC: 'ARC', ELLIPSE: 'ELLIPSE', SPLINE: 'SPLINE', POINT: 'POINT', TEXT: e.mt ? 'MTEXT' : 'TEXT', HATCH: e.grad ? 'GRADIENT' : 'HATCH', IMAGE: 'IMAGEATTACH', XLINE: 'XLINE', RAY: 'RAY', SOLID: 'SOLID', REGION: 'REGION' }[e.type] || null;
  }
  ecmd(['ADDSELECTED', 'ADDSEL'], 'Vẽ đối tượng mới cùng loại và thuộc tính (lớp, màu, kiểu nét, bề rộng, kiểu chữ, mẫu hatch…) với đối tượng đã chọn', async (_, cur) => {
    let e = cur && cur.pre && cur.pre.length === 1 ? cur.pre[0] : null; if(cur) cur.pre = [];
    if(!e){ const r = await A.getEnt('Chọn đối tượng'); e = r.ent; } if(!e) return;
    const c = addCmdOf(e); if(!c){ log('Chưa hỗ trợ tạo thêm loại đối tượng này.'); return; }
    const P = { layer: e.layer || '0', bl: !!e.bl, col: e.col, lt: e.lt, lts: e.lts, lw: e.lw, tp: e.tp, style: e.style, ff: e.ff };
    const restore = []; if(c === 'GRADIENT' && e.grad && A.HS){ const s0 = Object.assign({}, A.HS); A.HS.grad = deep(e.grad); restore.push(() => Object.assign(A.HS, s0)); }
    if(c === 'HATCH' && e.pat && A.HS){ const s0 = Object.assign({}, A.HS); A.HS.pat = e.solid ? 'SOLID' : e.pat; if(e.psc) A.HS.scale = e.psc; A.HS.ang = e.pang || 0; restore.push(() => Object.assign(A.HS, s0)); }
    if(c === 'TEXT' || c === 'MTEXT'){ const h0 = A.MEM.th; if(e.h > 0) A.MEM.th = e.h; restore.push(() => { A.MEM.th = h0; }); }
    if(c === 'TABLE'){ const T = (carrierOf(e) || {}).tbld; if(T && T.ts){ const L = tbLib(); if(L.list[T.ts]){ const c0 = L.cur; L.cur = T.ts; tbSave(L); restore.push(() => { const L2 = tbLib(); L2.cur = c0; tbSave(L2); }); } } }
    setTimeout(() => { ADDP = { p: P }; let seen = false; const t0 = Date.now();
      const iv = setInterval(() => { const b = A.busy && A.busy(); if(b) seen = true; if((seen && !b) || Date.now() - t0 > 600000 || (!seen && Date.now() - t0 > 3000)){ clearInterval(iv); ADDP = null; restore.forEach(f => f()); } }, 150);
      if(c === 'INSERT' && A.insertBlock) A.insertBlock(e.blk, e.bm && e.bm.src); else DVDCmd.run(c); }, 0);
  });

  /* ==================================================================
     SYSVDLG — System Variables (như AutoCAD 2027): nhóm, tìm, sửa giá trị, mô tả · SETVAR theo dòng lệnh như AutoCAD
     ================================================================== */
  const SVCAT = [['all', 'Mọi biến hệ thống'], ['chg', 'Đã thay đổi trong phiên'], ['snap', 'Bắt điểm & con trỏ'], ['new', 'Thuộc tính đối tượng mới'], ['ann', 'Chữ, kích thước & chú thích'], ['disp', 'Hiển thị'], ['ro', 'Chỉ đọc'], ['oth', 'Khác']];
  const svCat = n => /^(OSMODE|ORTHOMODE|SNAP|GRID|POLAR|AUTOSNAP|DYNMODE|APERTURE|PICK|CURSOR|ISO|ROLLOVER|OTRACK)/.test(n) ? 'snap' : /^(CLAYER|CECOLOR|CELTYPE|CELWEIGHT|CELTSCALE|CETRANSP|CMLSTYLE|CTABLESTYLE|HP)/.test(n) ? 'new' : /^(TEXT|DIM|CANNO|ANNO|MTEXT|MLEADER|FIELD|MIRRTEXT|ATT)/.test(n) ? 'ann' : /^(LTSCALE|PDMODE|PDSIZE|WIPEOUT|FILL|QTEXT|LWDISPLAY|UCSICON|VIEW|TILEMODE|XCLIP|IMAGE|FRAME)/.test(n) ? 'disp' : 'oth';
  const SVCHG = new Map();
  function sysvdlg(focus){
    if(!A.sysvar) return; let cat = 'all', q = String(focus || ''), sel = focus ? String(focus).toUpperCase() : null; const pend = new Map();
    const html = '<div class="acw" style="width:820px"><div class="acw-cols"><div class="c1" style="flex:0 0 190px">' + K.list('svC', SVCAT.map(([v, t]) => ({ v, t })), cat, 'height:400px') + '</div><div class="c1">' +
      '<div class="acw-row"><input id="svQ" placeholder="Tìm biến hệ thống…" style="flex:1 1 auto;width:auto" value="' + esc(q) + '"><span id="svN" style="color:#9aa6ba"></span></div>' +
      '<div class="lm-grid" style="height:300px"><table><thead><tr><th style="width:150px">Tên</th><th style="width:170px">Giá trị</th><th>Loại</th><th>Mô tả</th></tr></thead><tbody id="svB"></tbody></table></div>' +
      '<div class="acw-grp" style="margin-top:6px;min-height:58px"><legend id="svDn">Mô tả</legend><div id="svDd" style="color:#cfd6e0;white-space:normal"></div></div></div></div></div>';
    const d = A.dialog({ title: 'Biến hệ thống', cls: 'acw-free', help: 'SYSVDLG', html, left: K.btn('svAp', 'Áp dụng') + K.btn('svDef', 'Khôi phục giá trị đầu phiên'),
      ok: () => { apply(); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const ro = n => { try{ return !!(A.sysvar.isRO ? A.sysvar.isRO(n) : /chỉ đọc/i.test(A.sysvar.desc(n))); }catch(_){ return false; } };
    const typ = v => typeof v === 'number' || /^-?\d+$/.test(String(v)) ? (Number.isInteger(+v) ? 'Số nguyên' : 'Số thực') : /^-?\d*\.\d+$/.test(String(v)) ? 'Số thực' : 'Chuỗi';
    function list(){ const all = A.sysvar.list().sort(); const qq = q.trim().toUpperCase();
      return all.filter(n => (cat === 'all' || (cat === 'chg' ? SVCHG.has(n) || pend.has(n) : cat === 'ro' ? ro(n) : svCat(n) === cat)) && (!qq || n.includes(qq) || String(A.sysvar.desc(n)).toUpperCase().includes(qq))); }
    function render(){ const L = list(); $('svN').textContent = L.length + ' biến';
      $('svB').innerHTML = L.map(n => { let v; try{ v = pend.has(n) ? pend.get(n) : A.sysvar.get(n); }catch(_){ v = ''; } const r = ro(n);
        return '<tr data-n="' + n + '"' + (n === sel ? ' class="sel"' : '') + '><td translate="no"><b>' + n + '</b>' + (pend.has(n) ? ' *' : '') + '</td><td><input data-v="' + n + '" value="' + esc(v) + '"' + (r ? ' disabled' : '') + ' style="width:160px;height:20px;box-sizing:border-box"></td><td>' + (r ? 'Chỉ đọc' : typ(v)) + '</td><td style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">' + esc(A.sysvar.desc(n)) + '</td></tr>'; }).join('');
      desc(); }
    function desc(){ $('svDn').textContent = sel || 'Mô tả'; $('svDd').textContent = sel ? A.sysvar.desc(sel) + (SVCHG.has(sel) ? '  ·  Giá trị đầu phiên: ' + SVCHG.get(sel) : '') : 'Chọn một biến để xem mô tả.'; }
    function apply(){ let n = 0; for(const [k, v] of pend){ let old; try{ old = A.sysvar.get(k); }catch(_){} if(String(old) === String(v)) continue; if(!SVCHG.has(k)) SVCHG.set(k, old); if(A.sysvar.set(k, v)) n++; } pend.clear(); if(n){ log('Biến hệ thống: đã đổi ' + n + ' biến.'); try{ draw(); }catch(_){} } return n; }
    K.bindList($('svC'), v => { cat = v; render(); });
    $('svQ').addEventListener('input', () => { q = $('svQ').value; render(); });
    $('svB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; root.querySelectorAll('#svB tr.sel').forEach(x => x.classList.remove('sel')); tr.classList.add('sel'); desc(); });
    $('svB').addEventListener('change', e => { const i = e.target.closest('input[data-v]'); if(!i) return; pend.set(i.dataset.v, i.value); const td = i.closest('tr').querySelector('td b'); if(td && !/\*$/.test(td.parentElement.textContent)) td.insertAdjacentText('afterend', ' *'); });
    $('svB').addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('input[data-v]')){ e.preventDefault(); e.stopPropagation(); pend.set(e.target.dataset.v, e.target.value); apply(); render(); } }, true);
    root.querySelector('#svAp').onclick = () => { apply(); render(); };
    root.querySelector('#svDef').onclick = () => { let n = 0; for(const [k, v] of SVCHG){ if(A.sysvar.set(k, v)) n++; } SVCHG.clear(); pend.clear(); log('Đã khôi phục ' + n + ' biến về giá trị đầu phiên.'); render(); };
    render(); if(sel){ const tr = root.querySelector('#svB tr[data-n="' + sel + '"]'); if(tr) tr.scrollIntoView({ block: 'nearest' }); }
    return d;
  }
  A.sysvdlg = sysvdlg;
  plain(['SYSVDLG', 'SYSVARS'], 'Biến hệ thống (System Variables): xem, tìm, sửa mọi biến hệ thống theo nhóm', () => sysvdlg());
  ecmd(['SETVAR', 'SET', 'SYSVAR'], 'Đặt biến hệ thống theo dòng lệnh (? = liệt kê / hộp thoại Biến hệ thống)', async () => {
    const r = await A.getStr('Nhập tên biến hoặc [?]', { kw: [{ k: '?', t: '?' }] }); let n = String(r.kw === '?' ? '?' : (r.str || '')).trim().toUpperCase(); if(!n) return;
    if(n === '?'){ setTimeout(() => sysvdlg(), 0); return; }
    const L = A.sysvar.list(); if(!L.includes(n)){ log('Không có biến hệ thống "' + n + '". Gõ ? để xem danh sách.'); return; }
    const v0 = A.sysvar.get(n); const v = await A.getStr('Nhập giá trị mới cho ' + n, { def: String(v0) }); if(v.str == null || v.str === '') return;
    if(!SVCHG.has(n)) SVCHG.set(n, v0); if(!A.sysvar.set(n, v.str)) log(n + ' là biến chỉ đọc.'); else { log(n + ' = ' + A.sysvar.get(n)); try{ draw(); }catch(_){} }
  });

  /* ==================================================================
     SCALELISTEDIT — Edit Drawing Scales · OBJECTSCALE (tỉ lệ của đối tượng chú thích) · ANNOALLVISIBLE · ANNORESET / ANNOUPDATE
     ================================================================== */
  const SLK = 'dvd:scalelist';
  const SL_DEF = () => [[1, 1], [1, 2], [1, 4], [1, 5], [1, 8], [1, 10], [1, 16], [1, 20], [1, 25], [1, 30], [1, 40], [1, 50], [1, 100], [1, 200], [1, 250], [1, 500], [1, 1000], [2, 1], [4, 1], [5, 1], [8, 1], [10, 1], [100, 1]].map(([p, d]) => ({ name: p + ':' + d, p, d }));
  A.scaleList = () => { const L = lsGet(SLK, null); return Array.isArray(L) && L.length ? L : SL_DEF(); };
  A.scaleName = N => { const s = A.scaleList().find(x => Math.abs(x.d / x.p - N) < 1e-9); return s ? s.name : (N >= 1 ? '1:' + (+N.toFixed(4)) : (+(1 / N).toFixed(4)) + ':1'); };
  function scaleDlg(title, s0, cb){ const s = Object.assign({ name: '', p: 1, d: 1 }, s0 || {});
    A.dialog({ title, cls: 'acw-free', help: 'SCALELISTEDIT', html: '<div class="acw" style="width:340px">' + K.grp('Tên tỉ lệ', K.vrow('Tên hiện trong danh sách tỉ lệ:', K.txt('scN', s.name))) + K.grp('Thuộc tính tỉ lệ', K.row('Đơn vị giấy:', K.num('scP', s.p, { min: 0 })) + K.row('Đơn vị bản vẽ:', K.num('scD', s.d, { min: 0 }))) + '</div>',
      onOpen: r => { const n = r.querySelector('#scN'); let auto = !s.name; const up = () => { if(auto) n.value = (+r.querySelector('#scP').value || 1) + ':' + (+r.querySelector('#scD').value || 1); }; n.addEventListener('input', () => { auto = false; }); r.querySelector('#scP').addEventListener('input', up); r.querySelector('#scD').addEventListener('input', up); up(); },
      ok: r => { const p = num(K.val(r, 'scP')), d = num(K.val(r, 'scD')), n = K.val(r, 'scN').trim(); if(!(p > 0) || !(d > 0)){ say('Đơn vị giấy và đơn vị bản vẽ phải lớn hơn 0.'); return false; } if(!n){ say('Nhập tên.'); return false; } cb({ name: n, p, d }); } }); }
  plain(['SCALELISTEDIT', 'SCALELIST'], 'Sửa danh sách tỉ lệ (Edit Drawing Scales): thêm, sửa, sắp xếp, xoá, đặt lại', () => {
    let L = A.scaleList().map(x => Object.assign({}, x)), sel = 0;
    const d = A.dialog({ title: 'Sửa danh sách tỉ lệ', cls: 'acw-free', help: 'SCALELISTEDIT', html: '<div class="acw" style="width:470px"><div class="acw-cols"><div class="c1"><div class="acw-lab">Danh sách tỉ lệ:</div><div id="slL"></div>' +
        K.grp('Xem trước tỉ lệ đã chọn', '<div class="acw-row"><span class="l">Đơn vị giấy:</span><b id="slP"></b></div><div class="acw-row"><span class="l">Đơn vị bản vẽ:</span><b id="slD"></b></div>') + '</div>' +
        '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('slAdd', 'Thêm…') + K.btn('slEd', 'Sửa…') + K.btn('slUp', 'Lên') + K.btn('slDn', 'Xuống') + K.btn('slDel', 'Xoá') + K.btn('slRst', 'Đặt lại') + '</div></div></div>',
      ok: () => { lsSet(SLK, L); try{ if(A.syncAnnoBtn) A.syncAnnoBtn(); }catch(_){} log('Đã lưu danh sách ' + L.length + ' tỉ lệ.'); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { sel = Math.max(0, Math.min(L.length - 1, sel)); $('slL').innerHTML = K.list('slLL', L.map((s, i) => ({ v: String(i), h: '<span translate="no">' + esc(s.name) + '</span>' })), String(sel), 'height:260px');
      K.bindList($('slLL'), v => { sel = +v; prev(); }, v => { sel = +v; $('slEd').click(); }); prev(); };
    const prev = () => { const s = L[sel]; $('slP').textContent = s ? r6(s.p) : ''; $('slD').textContent = s ? r6(s.d) : ''; const cur = s && A.ANNO && Math.abs(s.d / s.p - A.ANNO.N) < 1e-9; $('slDel').disabled = !s || L.length <= 1 || !!cur; $('slUp').disabled = sel <= 0; $('slDn').disabled = sel >= L.length - 1; };
    $('slAdd').onclick = () => scaleDlg('Thêm tỉ lệ', null, s => { L.splice(sel + 1, 0, s); sel++; render(); });
    $('slEd').onclick = () => { if(L[sel]) scaleDlg('Sửa tỉ lệ', L[sel], s => { L[sel] = s; render(); }); };
    $('slUp').onclick = () => { if(sel > 0){ [L[sel - 1], L[sel]] = [L[sel], L[sel - 1]]; sel--; render(); } };
    $('slDn').onclick = () => { if(sel < L.length - 1){ [L[sel + 1], L[sel]] = [L[sel], L[sel + 1]]; sel++; render(); } };
    $('slDel').onclick = () => { L.splice(sel, 1); render(); };
    $('slRst').onclick = () => { if(confirm('Đặt lại danh sách tỉ lệ về mặc định?')){ L = SL_DEF(); sel = 0; render(); } };
    render();
  });
  // đối tượng chú thích: e.ascl = các tỉ lệ (N) đối tượng hỗ trợ · ANNOALLVISIBLE 0 = chỉ hiện đối tượng hỗ trợ tỉ lệ hiện hành
  let ANNOALL = (() => { const v = lsGet('dvd:annoall', 1); return v === 0 ? 0 : 1; })();
  const annoTarget = e => !!e && ((e.type === 'TEXT' && e.anno > 0) || (e.dimd && e.dimd.anno > 0));
  const annoMembers = e => e.grp && e.dimd ? modelEntities.filter(x => x.grp === e.grp) : [e];
  A.annoVis = function(){ const N = A.ANNO ? A.ANNO.N : 100; let ch = 0;
    for(const e of modelEntities){ if(!annoTarget(e)) continue; const hide = !ANNOALL && Array.isArray(e.ascl) && e.ascl.length && !e.ascl.some(s => Math.abs(s - N) < 1e-9);
      for(const m of annoMembers(e)){ if(hide && !m.avh){ m.avh = 1; ch++; } else if(!hide && m.avh){ delete m.avh; ch++; } } }
    if(ch){ try{ draw(); }catch(_){} } return ch; };
  { const _c = A.commit; A.commit = function(){ const r = _c.apply(this, arguments); if(!ANNOALL) setTimeout(A.annoVis, 0); return r; }; }
  A.onLoad = (prev => function(){ if(prev) prev.apply(this, arguments); setTimeout(A.annoVis, 0); })(A.onLoad);
  if(A.sysvar && A.sysvar.def){
    A.sysvar.def('ANNOALLVISIBLE', { d: 'Hiện mọi đối tượng chú thích (1) hay chỉ đối tượng hỗ trợ tỉ lệ chú thích hiện hành (0)', get: () => ANNOALL, set: v => { ANNOALL = +v ? 1 : 0; lsSet('dvd:annoall', ANNOALL); A.annoVis(); } });
    A.sysvar.def('CTABLESTYLE', { d: 'Kiểu bảng hiện hành', s: 1, get: () => tbLib().cur, set: v => { const L = tbLib(), n = String(v).trim(); if(!L.list[n]){ log('Không có kiểu bảng ' + n + '.'); return; } L.cur = n; tbSave(L); } });
  }
  ecmd(['OBJECTSCALE'], 'Tỉ lệ của đối tượng chú thích (Annotation Object Scale): thêm / xoá tỉ lệ hỗ trợ', async (_, cur) => {
    let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = [];
    if(!sel){ const s = await A.getSel('Chọn đối tượng chú thích'); sel = s.sel || []; }
    const L = [...new Set(sel.map(e => e.dimd || e.type === 'TEXT' ? (e.grp && !e.dimd ? modelEntities.find(x => x.grp === e.grp && x.dimd) || e : e) : null).filter(annoTarget))];
    if(!L.length){ log('Không có đối tượng chú thích (Annotative) nào trong vùng chọn. Bật chú thích bằng ANNOTATIVE.'); return; }
    const N0 = A.ANNO ? A.ANNO.N : 100, of = e => Array.isArray(e.ascl) && e.ascl.length ? e.ascl : [N0];
    let common = 1; const sets = () => { const all = new Set(); L.forEach(e => of(e).forEach(s => all.add(s))); let S = [...all]; if(common) S = S.filter(s => L.every(e => of(e).some(x => Math.abs(x - s) < 1e-9))); return S.sort((a, b) => a - b); };
    let work = L.map(e => of(e).slice()); const ofW = i => work[i];
    await new Promise(res => { const d = A.dialog({ title: 'Tỉ lệ của đối tượng chú thích', cls: 'acw-free', help: 'OBJECTSCALE', html: '<div class="acw" style="width:420px"><div class="acw-lab">' + L.length + ' đối tượng đã chọn.</div><div class="acw-cols"><div class="c1"><div class="acw-lab">Danh sách tỉ lệ của đối tượng:</div><div id="osL"></div></div><div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('osAdd', 'Thêm…') + K.btn('osDel', 'Xoá') + '</div></div>' +
        K.rad('osM', 'all', 'Liệt kê mọi tỉ lệ của các đối tượng đã chọn', 0) + '<br>' + K.rad('osM', 'com', 'Chỉ liệt kê tỉ lệ chung của mọi đối tượng đã chọn', 1) + '</div>',
      ok: () => { const rep = L.map((e, i) => { const w = deep(e); delete w.userAdded; w.ascl = ofW(i).slice().sort((a, b) => a - b); return [e, w]; }); A.commit({ rep }, 'OBJECTSCALE: đã cập nhật tỉ lệ của ' + rep.length + ' đối tượng'); res(); }, cancel: () => res() });
      const root = d.root, $ = id => root.querySelector('#' + id); let s = null;
      const cur2 = () => { const all = new Set(); work.forEach(w => w.forEach(x => all.add(x))); let S = [...all]; if(common) S = S.filter(x => work.every(w => w.some(y => Math.abs(y - x) < 1e-9))); return S.sort((a, b) => a - b); };
      const render = () => { const S = cur2(); $('osL').innerHTML = K.list('osLL', S.map(x => ({ v: String(x), h: '<span translate="no">' + esc(A.scaleName(x)) + '</span>' })), s, 'height:180px'); K.bindList($('osLL'), v => { s = v; }); };
      root.addEventListener('change', e => { if(e.target.name === 'osM'){ common = e.target.value === 'com' ? 1 : 0; render(); } });
      $('osAdd').onclick = () => { const have = new Set(cur2()); const opts = A.scaleList().filter(x => !have.has(x.d / x.p)); let pick = new Set();
        A.dialog({ title: 'Thêm tỉ lệ vào đối tượng', cls: 'acw-free', help: 'OBJECTSCALE', html: '<div class="acw" style="width:300px"><div class="acw-lab">Danh sách tỉ lệ:</div><div class="acw-list" id="oaL" style="height:240px">' + opts.map(x => '<div class="it" data-v="' + (x.d / x.p) + '" translate="no">' + esc(x.name) + '</div>').join('') + '</div><div class="acw-note">Giữ Ctrl để chọn nhiều tỉ lệ.</div></div>',
          onOpen: r => r.querySelector('#oaL').addEventListener('click', e => { const it = e.target.closest('.it'); if(!it) return; if(!e.ctrlKey && !e.metaKey){ pick.clear(); r.querySelectorAll('#oaL .it.on').forEach(x => x.classList.remove('on')); } const v = +it.dataset.v; if(pick.has(v)){ pick.delete(v); it.classList.remove('on'); } else { pick.add(v); it.classList.add('on'); } }),
          ok: () => { work = work.map(w => { const o = w.slice(); pick.forEach(v => { if(!o.some(y => Math.abs(y - v) < 1e-9)) o.push(v); }); return o; }); render(); } }); };
      $('osDel').onclick = () => { if(s == null) return; const v = +s; work = work.map(w => w.length > 1 ? w.filter(y => Math.abs(y - v) > 1e-9) : w); s = null; render(); };
      render(); });
    A.annoVis();
  });
  ecmd(['ANNORESET'], 'Đặt lại vị trí / cỡ của đối tượng chú thích theo tỉ lệ hiện hành', async () => { const s = await A.getSel('Chọn đối tượng chú thích'); const L = (s.sel || []).filter(e => annoTarget(e)); if(!L.length){ log('Không có đối tượng chú thích.'); return; } const N = A.ANNO.N; const rep = [];
    for(const e of L){ const w = deep(e); delete w.userAdded; if(w.type === 'TEXT' && w.anno > 0) w.h = w.anno * N; if(w.dimd && w.dimd.anno > 0 && w.dimd.s) w.dimd.s.txt = w.dimd.anno * N; rep.push([e, w]); } A.commit({ rep }, 'ANNORESET: ' + rep.length + ' đối tượng'); });
  ecmd(['ANNOUPDATE'], 'Cập nhật đối tượng chú thích theo kiểu chữ / tỉ lệ hiện hành', async () => { const s = await A.getSel('Chọn đối tượng chú thích'); const L = (s.sel || []).filter(e => annoTarget(e) || (e.type === 'TEXT' && e.style)); if(!L.length){ log('Không có đối tượng nào.'); return; } const N = A.ANNO.N; const rep = [];
    for(const e of L){ const w = deep(e); delete w.userAdded; if(w.type === 'TEXT' && w.style && A.tsApply) A.tsApply(w, w.style); if(w.type === 'TEXT' && w.anno > 0) w.h = w.anno * N; if(w.dimd && w.dimd.anno > 0 && w.dimd.s) w.dimd.s.txt = w.dimd.anno * N; rep.push([e, w]); } A.commit({ rep }, 'ANNOUPDATE: ' + rep.length + ' đối tượng'); });

  /* ==================================================================
     UCSMAN — hộp thoại UCS (như AutoCAD): UCS đặt tên · UCS trực giao · Cài đặt
     ================================================================== */
  const ucsNK = () => 'dvd:ucsnamed::' + (window.currentName || '');
  const ORTHO = [['Top', 'Trên', [1, 0, 0], [0, 1, 0]], ['Bottom', 'Dưới', [1, 0, 0], [0, -1, 0]], ['Front', 'Trước', [1, 0, 0], [0, 0, 1]], ['Back', 'Sau', [-1, 0, 0], [0, 0, 1]], ['Left', 'Trái', [0, -1, 0], [0, 0, 1]], ['Right', 'Phải', [0, 1, 0], [0, 0, 1]]];
  function ucsman(tab0){
    const U = A.UCS; if(!U || !A.ucsSet){ log('UCS chưa sẵn sàng.'); return; }
    let named = lsGet(ucsNK(), []), sel = U.on ? U.name : '*WORLD*', tab = tab0 || 'named', osel = 'Top';
    const icon = lsGet('dvd:ucsicon', { on: 1, org: 1 });
    const pane1 = '<div class="acw-lab">UCS hiện hành: <b id="umCur" translate="no"></b></div><div class="acw-cols"><div class="c1"><div id="umL"></div></div><div class="c2 acw-btncol" style="padding-top:2px">' + K.btn('umSet', 'Đặt hiện hành') + K.btn('umSave', 'Lưu UCS hiện hành…') + K.btn('umRen', 'Đổi tên') + K.btn('umDel', 'Xoá') + K.btn('umDet', 'Chi tiết') + '</div></div>';
    const pane2 = '<div class="acw-cols"><div class="c1"><div id="umO"></div></div><div class="c2 acw-btncol" style="padding-top:2px">' + K.btn('umOSet', 'Đặt hiện hành') + '</div></div>' + K.row('Độ sâu (gốc theo Z):', K.num('umDepth', 0)) + K.row('So với:', K.sel('umRel', [['w', 'Thế giới (WCS)']], 'w'));
    const pane3 = K.grp('Cài đặt biểu tượng UCS', K.chk('umIOn', 'Bật', icon.on) + '<br>' + K.chk('umIOrg', 'Hiện tại gốc UCS', icon.org) + '<br>' + K.chk('umIAll', 'Áp dụng cho mọi khung nhìn', 1, { dis: 1 })) + K.grp('Cài đặt UCS', K.chk('umVp', 'Lưu UCS cùng khung nhìn', 1, { dis: 1 }) + '<br>' + K.chk('umPlan', 'Chuyển về mặt bằng khi đổi UCS', !!icon.plan));
    const d = A.dialog({ title: 'UCS', cls: 'acw-free', help: 'UCSMAN', html: '<div class="acw" style="width:480px">' + K.tabs('um', [['named', 'UCS đặt tên'], ['ortho', 'UCS trực giao'], ['set', 'Cài đặt']], tab) + '<div class="acw-panes" style="min-height:280px">' + K.pane('um', 'named', tab, pane1) + K.pane('um', 'ortho', tab, pane2) + K.pane('um', 'set', tab, pane3) + '</div></div>',
      ok: r => { lsSet(ucsNK(), named); lsSet('dvd:ucsicon', { on: r.querySelector('#umIOn').checked ? 1 : 0, org: r.querySelector('#umIOrg').checked ? 1 : 0, plan: r.querySelector('#umPlan').checked ? 1 : 0 }); try{ draw(); }catch(_){} } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root, t => { tab = t; });
    const curName = () => A.UCS.on ? A.UCS.name : 'Thế giới';
    const render = () => { $('umCur').textContent = curName(); const items = [{ v: '*WORLD*', t: 'Thế giới' }].concat(named.map(u => ({ v: u.name, h: '<span translate="no">' + esc(u.name) + '</span>' })));
      $('umL').innerHTML = K.list('umLL', items, sel, 'height:230px'); K.bindList($('umLL'), v => { sel = v; btns(); }, v => { sel = v; $('umSet').click(); }); btns();
      $('umO').innerHTML = K.list('umOL', ORTHO.map(([k, t]) => ({ v: k, t })), osel, 'height:190px'); K.bindList($('umOL'), v => { osel = v; }, v => { osel = v; $('umOSet').click(); }); };
    const btns = () => { $('umRen').disabled = $('umDel').disabled = sel === '*WORLD*'; };
    const setCur = u => { if(!u){ A.UCS.on = false; A.UCS.name = 'Thế giới'; A.ucsSave(); } else A.ucsSet(u.O.slice(), u.U.slice(), u.V.slice(), Object.assign({}, u.A2 || { x: u.O[0], y: u.O[1] }), u.name); log('UCS hiện hành: ' + curName()); render(); };
    $('umSet').onclick = () => setCur(sel === '*WORLD*' ? null : named.find(u => u.name === sel));
    $('umSave').onclick = async () => { if(!A.UCS.on){ say('UCS hiện hành là Thế giới — đặt UCS (lệnh UCS) trước khi lưu.'); return; } const n = await askText({ title: 'Tên UCS', value: A.UCS.name === 'UCS' ? 'UCS' + (named.length + 1) : A.UCS.name }); const t = n && n.trim(); if(!t) return;
      const u = { name: t, O: A.UCS.O.slice(), U: A.UCS.U.slice(), V: A.UCS.V.slice(), A2: Object.assign({}, A.UCS.A2) }; const i = named.findIndex(x => x.name === t); if(i >= 0) named[i] = u; else named.push(u); A.UCS.name = t; A.ucsSave(); sel = t; lsSet(ucsNK(), named); render(); };
    $('umRen').onclick = async () => { const u = named.find(x => x.name === sel); if(!u) return; const n = await askText({ title: 'Đổi tên UCS', value: u.name }); const t = n && n.trim(); if(!t || t === u.name || named.some(x => x.name === t)) return; if(A.UCS.on && A.UCS.name === u.name){ A.UCS.name = t; A.ucsSave(); } u.name = t; sel = t; render(); };
    $('umDel').onclick = () => { named = named.filter(x => x.name !== sel); sel = '*WORLD*'; render(); };
    $('umDet').onclick = () => { const u = sel === '*WORLD*' ? { name: 'Thế giới', O: [0, 0, 0], U: [1, 0, 0], V: [0, 1, 0] } : named.find(x => x.name === sel); if(!u) return; const f = a => a.map(v => r6(v)).join(', '); const Z = [u.U[1] * u.V[2] - u.U[2] * u.V[1], u.U[2] * u.V[0] - u.U[0] * u.V[2], u.U[0] * u.V[1] - u.U[1] * u.V[0]];
      A.dialog({ title: 'Chi tiết UCS', cls: 'acw-free', help: 'UCSMAN', noCancel: true, html: '<div class="acw" style="width:320px"><div class="acw-lab">Tên: <b translate="no">' + esc(u.name) + '</b></div>' + K.grp('Gốc', '<div translate="no">' + f(u.O) + '</div>') + K.grp('Trục X', '<div translate="no">' + f(u.U) + '</div>') + K.grp('Trục Y', '<div translate="no">' + f(u.V) + '</div>') + K.grp('Trục Z', '<div translate="no">' + f(Z) + '</div>') + '</div>' }); };
    $('umOSet').onclick = () => { const o = ORTHO.find(x => x[0] === osel); if(!o) return; const z = num($('umDepth').value) || 0; const N = [o[2][1] * o[3][2] - o[2][2] * o[3][1], o[2][2] * o[3][0] - o[2][0] * o[3][2], o[2][0] * o[3][1] - o[2][1] * o[3][0]];
      if(osel === 'Top' && Math.abs(z) < 1e-12){ setCur(null); return; } A.ucsSet([N[0] * z, N[1] * z, N[2] * z], o[2].slice(), o[3].slice(), { x: 0, y: 0 }, o[1]); log('UCS trực giao: ' + o[1]); render(); };
    render();
  }
  A.ucsman = ucsman;
  plain(['UCSMAN', 'UC', 'DDUCS'], 'Quản lý UCS (hộp thoại UCS): UCS đặt tên, UCS trực giao, cài đặt biểu tượng UCS', () => ucsman());
  plain(['DDUCSP'], 'UCS trực giao (hộp thoại UCS, tab UCS trực giao)', () => ucsman('ortho'));
  /* ==================================================================
     Gắn tên lệnh cho hộp thoại (để các lệnh …CLOSE đóng đúng bảng)
     ================================================================== */
  { const _d = A.dialog; A.dialog = function(o){ const d = _d.apply(this, arguments); try{ const t = (o && o.title) || ''; const h = typeof o.help === 'string' ? o.help : ((/\(([A-Z][A-Z0-9_\-]*)\b/.exec(t) || [])[1] || (A.busy && A.busy() && A.cmdName ? A.cmdName() : '')); if(d && d.root && h) d.root.dataset.cmd = String(h).toUpperCase(); }catch(_){} return d; }; }
  const closeDlg = names => { let n = 0; document.querySelectorAll('.dvd-dlg[data-cmd]').forEach(el => { if(names.includes(el.dataset.cmd)){ const x = el.querySelector('.dvd-cancel') || el.querySelector('.dvd-tbx'); if(x) x.click(); else el.remove(); n++; } }); return n; };
  plain(['EXTERNALREFERENCESCLOSE', 'XREFCLOSE'], 'Đóng bảng Tham chiếu ngoài (External References)', () => { if(!closeDlg(['XREF', 'EXTERNALREFERENCES'])) log('Bảng Tham chiếu ngoài đang đóng.'); });
  plain(['VISUALSTYLESCLOSE'], 'Đóng trình quản lý kiểu hiển thị (Visual Styles)', () => { if(!closeDlg(['VISUALSTYLES', 'VSCURRENT'])) log('Trình quản lý kiểu hiển thị đang đóng.'); });
  plain(['PARAMETERSCLOSE'], 'Đóng bảng Tham số (Parameters Manager)', () => { if(!closeDlg(['PARAMETERS'])) log('Bảng Tham số đang đóng.'); });
  plain(['ADCCLOSE'], 'Đóng DesignCenter', () => { if(!closeDlg(['ADCENTER', 'DESIGNCENTER', 'DC'])) log('DesignCenter đang đóng.'); });
  plain(['DRAWINGRECOVERYHIDE'], 'Đóng trình khôi phục bản vẽ', () => { if(!closeDlg(['RECOVER', 'DRAWINGRECOVERY'])) log('Trình khôi phục bản vẽ đang đóng.'); });

  /* ==================================================================
     HYPERLINK — Insert / Edit Hyperlink (như AutoCAD): file hoặc trang web · góc nhìn của bản vẽ · e-mail
     ATTACHURL / DETACHURL / PASTEASHYPERLINK / HYPERLINKOPTIONS · Ctrl + bấm để mở · gợi ý khi rê chuột
     ================================================================== */
  const URK = 'dvd:urlrecent', UOK = 'dvd:urlopts';
  const urlOf = e => e && (e.url || e.href) || '';
  const uopt = () => Object.assign({ show: 1 }, lsGet(UOK, {}));
  function noteUrl(u){ if(!u) return; const L = lsGet(URK, []).filter(x => x !== u); L.unshift(u); lsSet(URK, L.slice(0, 20)); }
  function followLink(e){ const u = urlOf(e), sub = e && e.urlsub;
    if(sub && A.namedViews){ const v = A.namedViews.get().find(x => x.name === sub); if(v){ A.namedViews.restore(v); log('Đi tới góc nhìn "' + sub + '".'); if(!u) return; } }
    if(!u) return; log('Mở ' + u); noteUrl(u); try{ window.open(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u) ? 'https://' + u : u), '_blank', 'noopener'); }catch(_){} }
  A.followLink = followLink;
  function hyperlinkDlg(sel){
    const e0 = sel.find(e => urlOf(e) || e.urlsub) || null; const hasL = !!e0; let kind = e0 && /^mailto:/i.test(urlOf(e0)) ? 'mail' : (e0 && e0.urlsub && !urlOf(e0)) ? 'view' : 'file', tab = 'rec';
    const mail = (() => { const m = /^mailto:([^?]*)\??(.*)$/i.exec(urlOf(e0)); if(!m) return { to: '', sub: '' }; const q = new URLSearchParams(m[2]); return { to: decodeURIComponent(m[1]), sub: q.get('subject') || '' }; })();
    const inDwg = [...new Set(modelEntities.map(urlOf).filter(Boolean))];
    const views = A.namedViews ? A.namedViews.get() : [];
    const side = '<div class="acw-btncol" style="width:120px">' + [['file', 'Tệp hoặc trang web'], ['view', 'Góc nhìn của bản vẽ này'], ['mail', 'Địa chỉ e-mail']].map(([k, t]) => '<button type="button" class="acw-btn" data-k="' + k + '" style="height:54px;white-space:normal">' + t + '</button>').join('') + '</div>';
    const pFile = K.vrow('Nhập tên tệp hoặc trang web:', '<div style="display:flex;gap:4px"><input id="hlU" style="flex:1" value="' + esc(kind === 'file' ? urlOf(e0) : '') + '">' + K.btn('hlF', 'Tệp…') + K.btn('hlW', 'Trang web…') + '</div>') +
      '<div class="acw-lab" style="margin-top:6px">Hoặc chọn từ danh sách:</div><div style="display:flex;gap:4px"><div class="acw-btncol" style="width:118px">' + K.btn('hlTr', 'Tệp gần đây') + K.btn('hlTb', 'Trang đã duyệt') + K.btn('hlTi', 'Liên kết đã chèn') + '</div><div id="hlList" style="flex:1"></div></div>' +
      '<div class="acw-row" style="margin-top:6px"><span class="l">Vị trí trong bản vẽ (tuỳ chọn):</span>' + K.btn('hlTg', 'Đích…') + '</div><div class="acw-note" id="hlSub"></div>' +
      '<div style="margin-top:4px">' + K.chk('hlRel', 'Dùng đường dẫn tương đối cho siêu liên kết', 1, { dis: 1 }) + '<br>' + K.chk('hlDwf', 'Đổi liên kết DWG thành DWF', 0, { dis: 1 }) + '</div>';
    const pView = '<div class="acw-lab">Chọn một góc nhìn của bản vẽ này:</div>' + K.list('hlV', [{ v: '', t: 'Model (không đổi góc nhìn)' }].concat(views.map(v => ({ v: v.name, h: '<span translate="no">' + esc(v.name) + '</span>' }))), (e0 && e0.urlsub) || '', 'height:220px') + (views.length ? '' : '<div class="acw-note">Chưa có góc nhìn đặt tên — tạo bằng VIEW.</div>');
    const pMail = K.vrow('Địa chỉ e-mail:', K.txt('hlM', mail.to)) + K.vrow('Tiêu đề:', K.txt('hlMs', mail.sub)) + '<div class="acw-lab" style="margin-top:6px">Địa chỉ e-mail dùng gần đây:</div>' + K.list('hlML', lsGet(URK, []).filter(u => /^mailto:/i.test(u)).map(u => ({ v: u, t: u.replace(/^mailto:/i, '') })), '', 'height:120px');
    let sub = (e0 && e0.urlsub) || '';
    const html = '<div class="acw" style="width:600px"><div class="acw-cols"><div class="c2"><div class="acw-lab">Liên kết tới:</div>' + side + '</div><div class="c1">' + K.row('Chữ hiển thị:', K.txt('hlD', (e0 && e0.urld) || '', { ph: sel.length > 1 ? '(nhiều đối tượng)' : '' })) +
      '<div class="acw-panes" style="min-height:300px"><div data-p="file">' + pFile + '</div><div data-p="view" style="display:none">' + pView + '</div><div data-p="mail" style="display:none">' + pMail + '</div></div></div></div></div>';
    const d = A.dialog({ title: hasL ? 'Sửa siêu liên kết' : 'Chèn siêu liên kết', cls: 'acw-free', help: 'HYPERLINK', html, left: hasL ? K.btn('hlRm', 'Bỏ liên kết') : '',
      ok: r => { let u = '', s2 = ''; if(kind === 'file'){ u = K.val(r, 'hlU').trim(); s2 = sub; } else if(kind === 'view'){ s2 = vsel; } else { const to = K.val(r, 'hlM').trim(); if(!to){ say('Nhập địa chỉ e-mail.'); return false; } const sj = K.val(r, 'hlMs').trim(); u = 'mailto:' + to + (sj ? '?subject=' + encodeURIComponent(sj) : ''); }
        if(!u && !s2){ say('Nhập liên kết hoặc chọn góc nhìn.'); return false; } const desc = K.val(r, 'hlD').trim(); setUrl(sel, u, s2, desc); noteUrl(u); } });
    const root = d.root, $ = id => root.querySelector('#' + id); let vsel = (e0 && e0.urlsub) || '';
    const show = k => { kind = k; root.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('def', b.dataset.k === k)); root.querySelectorAll('[data-p]').forEach(p => { p.style.display = p.dataset.p === k ? '' : 'none'; }); };
    root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => show(b.dataset.k));
    const lists = { rec: () => lsGet(URK, []).filter(u => !/^(https?:|mailto:)/i.test(u)), web: () => lsGet(URK, []).filter(u => /^https?:/i.test(u)), ins: () => inDwg };
    const showList = t => { tab = t; ['hlTr', 'hlTb', 'hlTi'].forEach((id, i) => $(id).classList.toggle('def', ['rec', 'web', 'ins'][i] === t)); const L = lists[t](); $('hlList').innerHTML = K.list('hlLL', L.map(u => ({ v: u, h: '<span translate="no">' + esc(u) + '</span>' })), '', 'height:120px'); K.bindList($('hlLL'), v => { $('hlU').value = v; }); };
    $('hlTr').onclick = () => showList('rec'); $('hlTb').onclick = () => showList('web'); $('hlTi').onclick = () => showList('ins');
    $('hlF').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.onchange = () => { const f = i.files[0]; if(f) $('hlU').value = f.path || f.name; }; i.click(); };
    $('hlW').onclick = () => { const u = $('hlU').value.trim() || 'https://'; try{ window.open(/^https?:/i.test(u) ? u : 'https://www.google.com/search?q=' + encodeURIComponent(u), '_blank', 'noopener'); }catch(_){} };
    $('hlTg').onclick = () => { const items = [{ v: '', t: '(không)' }].concat(views.map(v => ({ v: v.name, h: '<span translate="no">' + esc(v.name) + '</span>' }))); let t2 = sub;
      A.dialog({ title: 'Chọn vị trí trong tài liệu', cls: 'acw-free', help: 'HYPERLINK', html: '<div class="acw" style="width:300px"><div class="acw-lab">Chọn một góc nhìn đặt tên:</div>' + K.list('hlTL', items, sub, 'height:200px') + '</div>', onOpen: r => K.bindList(r.querySelector('#hlTL'), v => { t2 = v; }), ok: () => { sub = t2; $('hlSub').textContent = sub ? 'Đích: ' + sub : ''; } }); };
    K.bindList($('hlV'), v => { vsel = v; }); K.bindList($('hlML'), v => { const m = /^mailto:([^?]*)\??(.*)$/i.exec(v); if(m){ $('hlM').value = decodeURIComponent(m[1]); $('hlMs').value = new URLSearchParams(m[2]).get('subject') || ''; } });
    if(hasL) $('hlRm').onclick = () => { setUrl(sel, '', '', ''); d.close(); };
    $('hlSub').textContent = sub ? 'Đích: ' + sub : ''; show(kind); showList('rec');
  }
  function setUrl(sel, u, sub, desc){ const rep = sel.filter(e => !A.isLocked(e)).map(e => { const w = deep(e); delete w.userAdded; delete w.href; if(u) w.url = u; else delete w.url; if(sub) w.urlsub = sub; else delete w.urlsub; if(desc && (u || sub)) w.urld = desc; else delete w.urld; return [e, w]; });
    if(rep.length) A.commit({ rep }, u || sub ? 'Đã gắn siêu liên kết cho ' + rep.length + ' đối tượng' : 'Đã bỏ siêu liên kết của ' + rep.length + ' đối tượng'); }
  ecmd(['HYPERLINK', 'HL', 'LIENKET'], 'Chèn / sửa siêu liên kết (Insert Hyperlink): tệp, trang web, góc nhìn của bản vẽ, e-mail', async (_, cur) => {
    let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = []; if(!sel){ const s = await A.getSel('Chọn đối tượng'); sel = s.sel || []; } sel = sel.filter(e => !A.isLocked(e)); if(!sel.length) return; setTimeout(() => hyperlinkDlg(sel), 0); });
  ecmd(['-HYPERLINK'], 'Siêu liên kết theo dòng lệnh: Chèn / Xoá', async () => {
    const k = await A.getKw('Nhập tuỳ chọn', { kw: [{ k: 'I', t: 'Chèn' }, { k: 'R', t: 'Xoá' }], def: 'Chèn' }); const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return;
    if(k.kw === 'R'){ setUrl(sel, '', '', ''); return; } const u = await A.getStr('Nhập siêu liên kết <không có>'); const v = String(u.str || '').trim(); if(!v) return; const nl = await A.getStr('Nhập vị trí đặt tên <không có>'); const ds = await A.getStr('Nhập mô tả <không có>');
    setUrl(sel, v, String(nl.str || '').trim(), String(ds.str || '').trim()); noteUrl(v); });
  ecmd(['OPENLINK', 'GOHYPERLINK', 'GOTOURL'], 'Mở siêu liên kết gắn trên đối tượng', async () => { const r = await A.getEnt('Chọn đối tượng có siêu liên kết', { filter: e => !!(urlOf(e) || e.urlsub) }); if(r.ent) followLink(r.ent); });
  ecmd(['ATTACHURL'], 'Gắn siêu liên kết cho đối tượng hoặc vùng (Express Tools)', async () => {
    const k = await A.getKw('Nhập tuỳ chọn chèn siêu liên kết', { kw: [{ k: 'A', t: 'Vùng' }, { k: 'O', t: 'Đối tượng' }], def: 'Đối tượng' });
    let sel = [];
    if(k.kw === 'A'){ const a = await A.getPoint('Góc thứ nhất'); if(!a.pt) return; const b = await A.getPoint('Góc đối diện', { base: a.pt }); if(!b.pt) return;
      if(!A.layerNames().includes('URLLAYER')) A.addLayer('URLLAYER'); const r = A.newProps({ type: 'POLYLINE', closed: true, vertices: [{ x: a.pt.x, y: a.pt.y }, { x: b.pt.x, y: a.pt.y }, { x: b.pt.x, y: b.pt.y }, { x: a.pt.x, y: b.pt.y }] }); r.layer = 'URLLAYER'; r.bl = 1; r.col = A.layerHex('URLLAYER'); r.urla = 1; sel = [r]; }
    else { const s = await A.getSel('Chọn đối tượng'); sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return; }
    const u = await A.getStr('Nhập siêu liên kết <bản vẽ hiện hành>'); const v = String(u.str || '').trim() || String((typeof currentName === 'string' && currentName) || ''); if(!v) return;
    if(k.kw === 'A'){ sel[0].url = v; A.commit({ add: sel }, 'ATTACHURL: vùng siêu liên kết ' + v); } else setUrl(sel, v, '', ''); noteUrl(v); });
  ecmd(['DETACHURL'], 'Gỡ siêu liên kết khỏi đối tượng (vùng siêu liên kết bị xoá)', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = (s.sel || []).filter(e => urlOf(e) || e.urlsub); if(!sel.length){ log('Không có đối tượng nào có siêu liên kết.'); return; }
    const del = sel.filter(e => e.urla), rest = sel.filter(e => !e.urla); const rep = rest.map(e => { const w = deep(e); delete w.userAdded; delete w.url; delete w.href; delete w.urlsub; delete w.urld; return [e, w]; });
    A.commit({ del, rep }, 'DETACHURL: đã gỡ ' + sel.length + ' siêu liên kết' + (del.length ? ' (xoá ' + del.length + ' vùng)' : '')); });
  ecmd(['PASTEASHYPERLINK'], 'Dán nội dung bộ nhớ tạm làm siêu liên kết cho đối tượng đã chọn', async (_, cur) => {
    let t = ''; try{ t = await navigator.clipboard.readText(); }catch(_){}
    if(!t){ const r = await A.getStr('Bộ nhớ tạm không đọc được — nhập siêu liên kết'); t = String(r.str || ''); } t = t.trim().split(/\r?\n/)[0]; if(!t) return;
    let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = []; if(!sel){ const s = await A.getSel('Chọn đối tượng để gắn siêu liên kết'); sel = s.sel || []; } if(!sel.length) return; setUrl(sel, t, '', ''); noteUrl(t); });
  ecmd(['HYPERLINKOPTIONS'], 'Hiện con trỏ, gợi ý và menu siêu liên kết khi rê chuột', async () => {
    const o = uopt(); const k = await A.getKw('Hiện con trỏ, gợi ý và menu siêu liên kết?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: o.show ? 'Có' : 'Không' }); if(!k.kw) return; o.show = k.kw === 'Y' ? 1 : 0; lsSet(UOK, o); log('HYPERLINKOPTIONS: ' + (o.show ? 'bật' : 'tắt')); });
  // Ctrl + bấm: mở · rê chuột: con trỏ / gợi ý siêu liên kết (như AutoCAD)
  const hitUrl = ev => { const c = document.getElementById('cv'); if(!c) return null; const rc = c.getBoundingClientRect(); const w = toWorld(ev.clientX - rc.left, ev.clientY - rc.top); const tol = 6 / view.scale; try{ return A.queryBox(w.x - tol, w.y - tol, w.x + tol, w.y + tol, 200).find(x => x.url || x.urlsub) || null; }catch(_){ return null; } };
  document.addEventListener('click', ev => { if(!(ev.ctrlKey || ev.metaKey) || (A.busy && A.busy())) return; const c = document.getElementById('cv'); if(!c || ev.target !== c) return; const h = hitUrl(ev); if(h){ ev.preventDefault(); ev.stopPropagation(); followLink(h); } }, true);
  { let tip = null, tm = 0; const hide = () => { if(tip){ tip.remove(); tip = null; } const c = document.getElementById('cv'); if(c && c.dataset.hl){ c.style.cursor = ''; delete c.dataset.hl; } };
    document.addEventListener('pointermove', ev => { if(tm) return; tm = setTimeout(() => { tm = 0; }, 90); const c = document.getElementById('cv'); if(!c || ev.target !== c || !uopt().show || (A.busy && A.busy())){ hide(); return; } const h = hitUrl(ev); if(!h){ hide(); return; }
      if(!tip){ tip = document.createElement('div'); tip.style.cssText = 'position:fixed;z-index:60;background:#fdfbe6;color:#222;border:1px solid #999;padding:2px 6px;font:12px system-ui,sans-serif;pointer-events:none;max-width:420px'; document.body.appendChild(tip); }
      tip.innerHTML = '<div translate="no">' + esc(h.urld || urlOf(h) || h.urlsub) + '</div><div>Ctrl + bấm để mở liên kết</div>'; tip.style.left = (ev.clientX + 16) + 'px'; tip.style.top = (ev.clientY + 18) + 'px'; c.style.cursor = 'pointer'; c.dataset.hl = 1; }, true); }

  /* ==================================================================
     ACTION RECORDER — ACTRECORD / ACTSTOP / ACTMANAGER / ACTUSERMESSAGE / ACTUSERINPUT / ACTBASEPOINT
     Ghi lệnh + điểm / số / chữ / từ khoá đã nhập thành macro; chạy lại bằng tên macro (như AutoCAD)
     ================================================================== */
  const ACK = 'dvd:actm';
  const actLib = () => lsGet(ACK, {}); const actSave = L => lsSet(ACK, L);
  const REC = { on: false, steps: [], ui: null, askNext: false };
  const fmtPt = p => r6(p.x) + ',' + r6(p.y);
  { const _run = A.run; A.run = function(name, fn, opt){ try{ if(REC.on && !/^ACT/i.test(String(name)) && !(PLAY && PLAY.on)) REC.steps.push({ t: 'cmd', v: String(name).toUpperCase() }); }catch(_){} return _run.apply(this, arguments); }; }
  A.onReqRes = function(req, v){ if(!REC.on || (PLAY && PLAY.on) || !v) return; let s = null;
    if(v.kw) s = { t: 'kw', v: String(v.kw) }; else if(v.none) s = { t: 'enter' }; else if(req.type === 'sel' || v.sel) s = { t: 'sel', ask: 1, n: (v.sel || []).length }; else if(v.pt) s = { t: 'pt', v: { x: v.pt.x, y: v.pt.y } }; else if(v.num != null) s = { t: 'num', v: v.num }; else if(v.str != null) s = { t: 'str', v: v.str };
    if(!s) return; s.p = String(req.prompt || '').slice(0, 80); if(REC.askNext && s.t !== 'sel'){ s.ask = 1; REC.askNext = false; } REC.steps.push(s); recUi(); };
  function recUi(){ if(!REC.on){ if(REC.ui){ REC.ui.remove(); REC.ui = null; } return; } const cv = document.getElementById('cv'); if(!cv || !cv.parentElement) return;
    if(!REC.ui){ const b = document.createElement('div'); b.className = 'cnt-bar'; b.style.top = '64px'; b.innerHTML = '<span style="color:#ff4d4d;font-size:14px">●</span><span>Đang ghi macro</span><b class="n" translate="no"></b><span class="sp"></span>' +
        '<button type="button" data-a="msg" title="Chèn thông báo cho người dùng (ACTUSERMESSAGE)">💬 Thông báo</button><button type="button" data-a="in" title="Giá trị nhập kế tiếp sẽ hỏi người dùng khi chạy (ACTUSERINPUT)">✋ Yêu cầu nhập</button><button type="button" data-a="bp" title="Chèn điểm gốc (ACTBASEPOINT)">⌖ Điểm gốc</button><span class="sp"></span><button type="button" data-a="stop" title="Dừng ghi (ACTSTOP)">■ Dừng</button>';
      b.addEventListener('click', e => { const x = e.target.closest('[data-a]'); if(!x) return; const a = x.dataset.a; if(a === 'stop') actStop(); if(a === 'msg') actMsg(); if(a === 'in'){ REC.askNext = true; log('Giá trị nhập kế tiếp sẽ hỏi người dùng khi chạy macro.'); } if(a === 'bp') actBase(); });
      cv.parentElement.appendChild(b); REC.ui = b; }
    REC.ui.querySelector('.n').textContent = REC.steps.length ? '(' + REC.steps.length + ')' : ''; }
  function actRecord(){ if(REC.on){ log('Đang ghi macro — ACTSTOP để dừng.'); return; } if(A.busy && A.busy()) A.cancel(true); REC.on = true; REC.steps = []; REC.askNext = false; REC.view = { s: view.scale, x: view.offsetX, y: view.offsetY, r: view.rot || 0 }; recUi(); log('ACTRECORD: bắt đầu ghi macro hành động. Chạy các lệnh như bình thường rồi ACTSTOP.'); }
  async function actMsg(){ if(!REC.on){ log('Chưa ghi macro (ACTRECORD).'); return; } const t = await askText({ title: 'Thông báo cho người dùng', value: '' }); if(t == null || !String(t).trim()) return; REC.steps.push({ t: 'msg', v: String(t) }); recUi(); }
  function actBase(){ if(!REC.on){ log('Chưa ghi macro (ACTRECORD).'); return; } if(A.busy && A.busy()){ log('Chèn điểm gốc khi không có lệnh đang chạy.'); return; }
    A.run('ACTBASEPOINT', async () => { const r = await A.getPoint('Chỉ định điểm gốc'); if(!r.pt) return; REC.steps.push({ t: 'base', v: { x: r.pt.x, y: r.pt.y } }); recUi(); log('Đã chèn điểm gốc vào macro.'); }); }
  function actStop(){ if(!REC.on){ log('Không có macro nào đang ghi.'); return; } REC.on = false; recUi(); if(A.busy && A.busy()) A.cancel(true);
    while(REC.steps.length && REC.steps[REC.steps.length - 1].t === 'cmd' && /^(ACT)/.test(REC.steps[REC.steps.length - 1].v)) REC.steps.pop();
    if(!REC.steps.length){ log('ACTSTOP: macro trống — không lưu.'); return; }
    const L = actLib(); let i = 1; while(L['ActMacro' + String(i).padStart(3, '0')]) i++;
    actProps({ name: 'ActMacro' + String(i).padStart(3, '0'), desc: '', steps: REC.steps, view: REC.view, rv1: 1, rv2: 1, chk: 1 }, true); }
  // Action Macro: tên lệnh macro, mô tả, khôi phục góc nhìn, kiểm tra
  function actProps(m, isNew, onDone){
    const d = A.dialog({ title: 'Macro hành động', cls: 'acw-free', help: 'ACTSTOP', html: '<div class="acw" style="width:480px">' + K.row('Tên lệnh macro:', K.txt('amN', m.name)) + K.row('Tên tệp:', K.txt('amF', m.name + '.actm', { dis: 1 })) + K.vrow('Mô tả:', '<textarea id="amD" style="height:54px">' + esc(m.desc || '') + '</textarea>') +
        K.grp('Khôi phục góc nhìn trước khi chạy', K.chk('amV1', 'Khi tạm dừng chờ người dùng nhập', m.rv1) + '<br>' + K.chk('amV2', 'Khi chạy xong', m.rv2)) + K.chk('amC', 'Kiểm tra khác biệt khi bắt đầu chạy', m.chk) + '<br>' + K.chk('amPr', 'Hỏi trước khi chạy', !!m.ask) +
        K.grp('Các bước (' + m.steps.length + ')', '<div id="amS" style="max-height:180px;overflow:auto"></div>') + '</div>',
      ok: r => { const n = K.val(r, 'amN').trim().toUpperCase().replace(/\s+/g, ''); if(!/^[A-Z_][A-Z0-9_\-]*$/.test(n)){ say('Tên lệnh macro chỉ gồm chữ, số, gạch dưới.'); return false; }
        const L = actLib(); const old = isNew ? null : m.name.toUpperCase(); const clash = DVDCmd.commands.some(c => c.k.includes(n) && !(c.actm));
        if((L[n] && n !== old) || clash){ say('Tên "' + n + '" đã có (lệnh hoặc macro khác).'); return false; }
        if(old && old !== n) delete L[old]; const o = { desc: r.querySelector('#amD').value, steps: m.steps, view: m.view, rv1: K.on(r, 'amV1') ? 1 : 0, rv2: K.on(r, 'amV2') ? 1 : 0, chk: K.on(r, 'amC') ? 1 : 0, ask: K.on(r, 'amPr') ? 1 : 0, t: Date.now() };
        L[n] = o; actSave(L); regMacro(n); log('Đã lưu macro "' + n + '" (' + o.steps.length + ' bước). Gõ ' + n + ' để chạy.'); if(onDone) onDone(n); } });
    const root = d.root; root.querySelector('#amN').addEventListener('input', e => { root.querySelector('#amF').value = e.target.value.toUpperCase() + '.actm'; });
    const lbl = s => s.t === 'cmd' ? '▶ ' + s.v : s.t === 'pt' ? '• Điểm ' + fmtPt(s.v) : s.t === 'num' ? '• Số ' + s.v : s.t === 'str' ? '• Chữ "' + s.v + '"' : s.t === 'kw' ? '• Từ khoá ' + s.v : s.t === 'enter' ? '• Enter' : s.t === 'sel' ? '• Chọn đối tượng' : s.t === 'msg' ? '💬 ' + s.v : s.t === 'base' ? '⌖ Điểm gốc ' + fmtPt(s.v) : s.t;
    const rs = () => { root.querySelector('#amS').innerHTML = m.steps.map((s, i) => '<div class="acw-row" style="min-height:20px;margin:0"><span class="l" translate="no" style="' + (s.t === 'cmd' ? 'font-weight:600' : 'padding-left:14px') + '">' + esc(lbl(s)) + (s.ask ? ' ✋' : '') + '</span>' +
      (/^(pt|num|str|kw)$/.test(s.t) ? '<label class="acw-ck" title="Hỏi người dùng khi chạy"><input type="checkbox" data-ask="' + i + '"' + (s.ask ? ' checked' : '') + '><span>Hỏi</span></label>' : '') + (s.t !== 'cmd' ? '<button type="button" class="acw-btn" data-del="' + i + '" style="min-width:0;padding:0 6px;height:20px" title="Bỏ bước">✕</button>' : '') + '</div>').join(''); };
    root.querySelector('#amS').addEventListener('change', e => { const c = e.target.closest('[data-ask]'); if(c){ const s = m.steps[+c.dataset.ask]; if(c.checked) s.ask = 1; else delete s.ask; rs(); } });
    root.querySelector('#amS').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if(b){ m.steps.splice(+b.dataset.del, 1); rs(); } });
    rs();
  }
  // chạy macro: lệnh qua DVDCmd.run, giá trị qua A.input; bước "Hỏi" chờ người dùng nhập; điểm gốc dời các điểm tuyệt đối
  let PLAY = null;
  const waitFor = (f, ms) => new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { let ok = false; try{ ok = f(); }catch(_){} if(ok || Date.now() - t0 > (ms || 8000)){ clearInterval(iv); res(ok); } }, 30); });
  const hasReq = () => !!(A.busy && A.busy() && A.cur && A.cur() && A.cur().req);
  async function playMacro(name){
    const m = actLib()[name]; if(!m){ log('Không có macro "' + name + '".'); return; } if(PLAY && PLAY.on){ log('Một macro khác đang chạy.'); return; }
    if(m.ask){ const ok = await new Promise(res => A.dialog({ title: 'Chạy macro hành động', cls: 'acw-free', help: 'ACTMANAGER', html: '<div class="acw" style="width:360px">Chạy macro <b translate="no">' + esc(name) + '</b>?<div class="acw-note">' + esc(m.desc || '') + '</div></div>', ok: () => res(true), cancel: () => res(false) })); if(!ok) return; }
    const v0 = { s: view.scale, x: view.offsetX, y: view.offsetY, r: view.rot || 0 }; let off = { x: 0, y: 0 }, n = 0;
    PLAY = { on: true, stop: false }; const kd = e => { if(e.key === 'Escape' && PLAY) PLAY.stop = true; }; window.addEventListener('keydown', kd, true);
    log('Chạy macro ' + name + '…');
    try{
      for(const s of m.steps){ if(PLAY.stop) throw new Error('stop');
        if(s.t === 'cmd'){ if(hasReq() && A.cur().name !== s.v && !/^(ZOOM|PAN|Z|P)$/.test(s.v)) await waitFor(() => !(A.busy && A.busy()), 3000); DVDCmd.run(s.v); n++; await waitFor(() => hasReq() || !(A.busy && A.busy()), 1500); continue; }
        if(s.t === 'msg'){ await new Promise(res => A.dialog({ title: 'Macro hành động — thông báo', cls: 'acw-free', help: 'ACTUSERMESSAGE', noCancel: true, html: '<div class="acw" style="width:360px;white-space:pre-wrap">' + esc(s.v) + '</div>', ok: () => res(), cancel: () => res() })); continue; }
        if(s.t === 'base'){ const p = await new Promise(res => A.run('ACTBASEPOINT', async () => { const r = await A.getPoint('Chỉ định điểm gốc cho macro'); res(r.pt || null); })); if(!p) throw new Error('stop'); off = { x: p.x - s.v.x, y: p.y - s.v.y }; continue; }
        const ok = await waitFor(hasReq, 4000); if(!ok){ if(s.t === 'enter') continue; break; }
        if(s.ask){ const seq = A.reqSeq; if(m.rv1){ view.scale = v0.s; view.offsetX = v0.x; view.offsetY = v0.y; try{ draw(); }catch(_){} } log('Macro chờ bạn nhập: ' + (s.p || '')); await waitFor(() => A.reqSeq !== seq || !(A.busy && A.busy()) || PLAY.stop, 600000); continue; }
        if(s.t === 'pt') A.input(fmtPt({ x: s.v.x + off.x, y: s.v.y + off.y })); else if(s.t === 'num') A.input(String(s.v)); else if(s.t === 'str') A.input(String(s.v)); else if(s.t === 'kw') A.input(String(s.v)); else if(s.t === 'enter') A.input('');
        await new Promise(r => setTimeout(r, 20)); }
      await waitFor(() => !(A.busy && A.busy()), 1500);
      log('Macro ' + name + ': xong (' + n + ' lệnh).');
    }catch(err){ if(A.busy && A.busy()) A.cancel(true); log('Macro ' + name + ': đã dừng.'); }
    finally{ window.removeEventListener('keydown', kd, true); PLAY = null; if(m.rv2){ /* giữ góc nhìn như lúc bắt đầu */ view.scale = v0.s; view.offsetX = v0.x; view.offsetY = v0.y; try{ draw(); }catch(_){} } }
  }
  A.playMacro = playMacro;
  function regMacro(n){ const c = DVDCmd.register([n], 'Macro hành động: ' + ((actLib()[n] || {}).desc || n), () => playMacro(n), {}); try{ const o = DVDCmd.commands.find(x => x.k.includes(n)); if(o) o.actm = 1; }catch(_){} return c; }
  setTimeout(() => { for(const n of Object.keys(actLib())) regMacro(n); }, 0);
  function actManager(){
    let sel = null;
    const d = A.dialog({ title: 'Quản lý macro hành động', cls: 'acw-free', help: 'ACTMANAGER', html: '<div class="acw" style="width:620px"><div class="acw-cols"><div class="c1"><div class="acw-lab">Macro hành động:</div><div class="lm-grid" style="height:260px"><table><thead><tr><th>Tên</th><th>Mô tả</th><th>Số bước</th><th>Ngày sửa</th></tr></thead><tbody id="amB"></tbody></table></div></div>' +
        '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('amPlay', 'Chạy') + K.btn('amCp', 'Sao chép…') + K.btn('amRn', 'Đổi tên…') + K.btn('amMod', 'Sửa…') + K.btn('amDel', 'Xoá') + K.btn('amEx', 'Xuất .actm…') + K.btn('amIm', 'Nhập .actm…') + '</div></div></div>', noOk: true, cancelText: 'Đóng' });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { const L = actLib(), N = Object.keys(L).sort(); if(!L[sel]) sel = N[0] || null;
      $('amB').innerHTML = N.length ? N.map(n => '<tr data-n="' + esc(n) + '"' + (n === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(n) + '</td><td>' + esc(L[n].desc || '') + '</td><td>' + L[n].steps.length + '</td><td>' + (L[n].t ? new Date(L[n].t).toLocaleString() : '') + '</td></tr>').join('') : '<tr><td colspan="4" style="color:#9aa6ba">Chưa có macro — ghi bằng ACTRECORD.</td></tr>';
      ['amPlay', 'amCp', 'amRn', 'amMod', 'amDel', 'amEx'].forEach(id => { $(id).disabled = !sel; }); };
    $('amB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; render(); });
    $('amB').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); if(tr){ sel = tr.dataset.n; $('amPlay').click(); } });
    $('amPlay').onclick = () => { const n = sel; d.close(); setTimeout(() => playMacro(n), 50); };
    const nameAsk = async (t, v) => { const s = await askText({ title: t, value: v }); const n = s && s.trim().toUpperCase().replace(/\s+/g, ''); if(!n) return null; if(!/^[A-Z_][A-Z0-9_\-]*$/.test(n) || actLib()[n] || DVDCmd.commands.some(c => c.k.includes(n) && !c.actm)){ say('Tên không hợp lệ hoặc đã có.'); return null; } return n; };
    $('amCp').onclick = async () => { const n = await nameAsk('Sao chép macro thành', sel + '_2'); if(!n) return; const L = actLib(); L[n] = deep(L[sel]); L[n].t = Date.now(); actSave(L); regMacro(n); sel = n; render(); };
    $('amRn').onclick = async () => { const n = await nameAsk('Đổi tên macro', sel); if(!n) return; const L = actLib(); L[n] = L[sel]; delete L[sel]; actSave(L); try{ DVDCmd.undefine && 0; }catch(_){} regMacro(n); sel = n; render(); };
    $('amMod').onclick = () => { const L = actLib(); const m = Object.assign({ name: sel }, deep(L[sel])); actProps(m, false, n => { sel = n; render(); }); };
    $('amDel').onclick = () => { if(!confirm('Xoá macro "' + sel + '"?')) return; const L = actLib(); delete L[sel]; actSave(L); sel = null; render(); };
    $('amEx').onclick = () => { const L = actLib(); const blob = new Blob([JSON.stringify(Object.assign({ kind: 'dvdcad-actm', name: sel }, L[sel]), null, 1)], { type: 'application/json' }); try{ shareOrDownload(blob, sel + '.actm', 'application/json'); }catch(_){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sel + '.actm'; a.click(); } };
    $('amIm').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.actm,.json'; i.onchange = () => { const f = i.files[0]; if(!f) return; f.text().then(t => { let o = null; try{ o = JSON.parse(t); }catch(_){} if(!o || !Array.isArray(o.steps)){ say('Tệp .actm không hợp lệ (chỉ đọc được macro DVDCAD).'); return; }
      const L = actLib(); let n = String(o.name || f.name.replace(/\.[^.]+$/, '')).toUpperCase().replace(/[^A-Z0-9_\-]/g, '_'); while(L[n]) n += '_1'; delete o.kind; delete o.name; L[n] = o; actSave(L); regMacro(n); sel = n; render(); log('Đã nhập macro ' + n); }); }; i.click(); };
    render();
  }
  plain(['ACTRECORD', 'ARR'], 'Bắt đầu ghi macro hành động (Action Recorder)', () => actRecord());
  plain(['ACTSTOP', 'ARS'], 'Dừng ghi và lưu macro hành động', () => actStop());
  plain(['ACTMANAGER', 'ARM'], 'Quản lý macro hành động: chạy, sao chép, đổi tên, sửa, xoá, xuất / nhập', () => actManager());
  plain(['ACTUSERMESSAGE', 'ARU'], 'Chèn thông báo cho người dùng vào macro đang ghi', () => actMsg());
  plain(['ACTUSERINPUT', 'ARI'], 'Giá trị nhập kế tiếp của macro sẽ hỏi người dùng khi chạy', () => { if(!REC.on){ log('Chưa ghi macro (ACTRECORD).'); return; } REC.askNext = true; log('Giá trị nhập kế tiếp sẽ hỏi người dùng khi chạy macro.'); });
  plain(['ACTBASEPOINT'], 'Chèn điểm gốc vào macro đang ghi (khi chạy, điểm tuyệt đối dời theo điểm gốc mới)', () => actBase());

  /* ==================================================================
     RSCRIPT / RESUME / SCRIPTCALL
     ================================================================== */
  plain(['RSCRIPT'], 'Chạy lại script vừa chạy (lặp; Esc / Backspace để dừng)', () => { const L = A.lastScript; if(!L || !A.runScript){ log('Chưa chạy script nào (SCRIPT).'); return; } A.runScript(L.text, L.label); });
  plain(['RESUME'], 'Chạy tiếp script đã bị ngắt (Esc / Backspace)', () => { const S = A._scriptPaused; if(!S || !A.runScriptToks){ log('Không có script nào bị ngắt.'); return; } A._scriptPaused = null; A.runScriptToks(S.toks, S.label, S.text, S.i); });
  plain(['SCRIPTCALL'], 'Chạy một script lồng trong script đang chạy (chọn tệp .scr)', () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.scr,.txt'; i.onchange = () => { const f = i.files[0]; if(f && A.runScript) f.text().then(t => A.runScript(t, f.name)); }; i.click(); });

  /* ==================================================================
     Lệnh nhỏ: GOTOSTART · FILETAB / FILETABCLOSE · QVDRAWING / QVLAYOUT (+CLOSE) · BROWSER · VIEWGO / VIEWPLAY
     GRAPHICSCONFIG · WSSAVE / WSSETTINGS / WORKSPACE · CLASSICXREF / CLASSICIMAGE / CLASSICGROUP · RESETBLOCK · BSAVE · ADJUST
     ================================================================== */
  plain(['GOTOSTART'], 'Chuyển tới thẻ Bắt đầu (Start)', () => { if(A.showStart) A.showStart(); else log('Không có thẻ Bắt đầu.'); });
  const ftBar = () => document.getElementById('acadFile');
  plain(['FILETAB'], 'Hiện thanh thẻ bản vẽ (File Tabs)', () => { const b = ftBar(); if(b){ b.style.display = ''; lsSet('dvd:filetab', 1); try{ window.dispatchEvent(new Event('resize')); }catch(_){} } });
  plain(['FILETABCLOSE'], 'Ẩn thanh thẻ bản vẽ (File Tabs)', () => { const b = ftBar(); if(b){ b.style.display = 'none'; lsSet('dvd:filetab', 0); try{ window.dispatchEvent(new Event('resize')); }catch(_){} } });
  setTimeout(() => { if(lsGet('dvd:filetab', 1) === 0){ const b = ftBar(); if(b) b.style.display = 'none'; } }, 500);
  // Quick View: ảnh thu nhỏ bản vẽ đang mở / layout, bấm để chuyển
  const thumbs = new Map();
  const snap = () => { try{ const c = document.getElementById('cv'); const o = document.createElement('canvas'); const k = 200 / Math.max(1, c.width); o.width = 200; o.height = Math.max(1, Math.round(c.height * k)); const g = o.getContext('2d'); g.fillStyle = '#1e232b'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/png'); }catch(_){ return null; } };
  setTimeout(() => { const b = ftBar(); if(b) b.addEventListener('click', e => { if(e.target.closest('.ft.doc')){ const on = b.querySelector('.ft.doc.on'); if(on) thumbs.set('d' + on.dataset.id, snap()); } }, true); }, 600);
  let QV = null;
  function qv(kind){ qvClose(); const strip = document.createElement('div'); strip.className = 'cnt-bar'; strip.style.cssText += ';top:auto;bottom:40px;gap:8px;padding:8px;flex-wrap:wrap;max-width:90vw;position:fixed';
    let items = [];
    if(kind === 'd'){ const T = A.TABS || []; const on = document.querySelector('#acadFile .ft.doc.on'); if(on) thumbs.set('d' + on.dataset.id, snap()); items = T.map(t => ({ k: 'd' + t.id, name: t.name, on: on && +on.dataset.id === t.id, go: () => { const el = document.querySelector('#acadFile .ft.doc[data-id="' + t.id + '"]'); if(el) el.click(); } }));
      if(!items.length) items = [{ k: 'cur', name: (typeof currentName === 'string' && currentName) || 'Drawing', on: true, go: () => {} }]; }
    else { const tabs = [...document.querySelectorAll('#acLT [data-l]')].filter(x => x.dataset.l !== 'new'); const curEl = tabs.find(x => x.classList.contains('on')); if(curEl) thumbs.set('l' + curEl.dataset.l + ':' + (typeof currentName === 'string' ? currentName : ''), snap());
      const kk = x => 'l' + x.dataset.l + ':' + (typeof currentName === 'string' ? currentName : '');
      items = tabs.length ? tabs.map(x => ({ k: kk(x), name: x.textContent.trim(), on: x === curEl, go: () => x.click() })) : [{ k: 'lModel', name: 'Model', on: true, go: () => {} }]; if(!tabs.length) thumbs.set('lModel', snap()); }
    strip.innerHTML = items.map((it, i) => '<button type="button" data-i="' + i + '" style="display:flex;flex-direction:column;align-items:center;gap:3px;height:auto;padding:4px;border-color:' + (it.on ? '#0696d7' : '#5d697e') + '">' + (thumbs.get(it.k) ? '<img src="' + thumbs.get(it.k) + '" style="width:160px;height:96px;object-fit:cover;background:#1e232b">' : '<div style="width:160px;height:96px;background:#1e232b;display:grid;place-items:center;color:#9aa6ba">—</div>') + '<span translate="no" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(it.name) + '</span></button>').join('') +
      '<button type="button" data-x="1" title="Đóng" style="align-self:flex-start">✕</button>';
    strip.addEventListener('click', e => { if(e.target.closest('[data-x]')){ qvClose(); return; } const b = e.target.closest('[data-i]'); if(!b) return; const it = items[+b.dataset.i]; qvClose(); it.go(); });
    document.body.appendChild(strip); QV = strip; }
  function qvClose(){ if(QV){ QV.remove(); QV = null; } }
  plain(['QVDRAWING', 'QVD'], 'Xem nhanh bản vẽ đang mở (Quick View Drawings): ảnh thu nhỏ, bấm để chuyển', () => qv('d'));
  plain(['QVLAYOUT', 'QVL'], 'Xem nhanh layout (Quick View Layouts): ảnh thu nhỏ Model / layout, bấm để chuyển', () => qv('l'));
  plain(['QVDRAWINGCLOSE', 'QVLAYOUTCLOSE'], 'Đóng xem nhanh bản vẽ / layout', () => qvClose());
  ecmd(['BROWSER'], 'Mở trình duyệt web tới địa chỉ', async () => { const r = await A.getStr('Nhập địa chỉ web (URL)', { def: lsGet('dvd:browser', 'https://www.autodesk.com') }); const u = String(r.str || lsGet('dvd:browser', 'https://www.autodesk.com')).trim(); if(!u) return; lsSet('dvd:browser', u); try{ window.open(/^[a-z]+:/i.test(u) ? u : 'https://' + u, '_blank', 'noopener'); }catch(_){} });
  ecmd(['VIEWGO'], 'Khôi phục góc nhìn đặt tên', async () => { const L = A.namedViews ? A.namedViews.get() : []; if(!L.length){ log('Bản vẽ chưa có góc nhìn đặt tên (VIEW).'); return; }
    const r = await A.getStr('Nhập tên góc nhìn cần khôi phục', { def: L[0].name }); const n = String(r.str || L[0].name).trim(); const v = L.find(x => x.name.toUpperCase() === n.toUpperCase()); if(!v){ log('Không có góc nhìn "' + n + '".'); return; } A.namedViews.restore(v); log('Góc nhìn: ' + v.name); });
  ecmd(['VIEWPLAY'], 'Phát góc nhìn đặt tên (chuyển mượt tới góc nhìn)', async () => { const L = A.namedViews ? A.namedViews.get() : []; if(!L.length){ log('Bản vẽ chưa có góc nhìn đặt tên (VIEW).'); return; }
    const r = await A.getStr('Nhập tên góc nhìn cần phát', { def: L[0].name }); const n = String(r.str || L[0].name).trim(); const v = L.find(x => x.name.toUpperCase() === n.toUpperCase()); if(!v){ log('Không có góc nhìn "' + n + '".'); return; }
    const a = { s: view.scale, x: view.offsetX, y: view.offsetY }; const N = 24; for(let i = 1; i <= N; i++){ const t = i / N, k = t * t * (3 - 2 * t); view.scale = a.s * Math.pow(v.s / a.s, k); view.offsetX = a.x + (v.x - a.x) * k; view.offsetY = a.y + (v.y - a.y) * k; try{ draw(); }catch(_){} await new Promise(q => setTimeout(q, 16)); } A.namedViews.restore(v); });
  plain(['GRAPHICSCONFIG', '3DCONFIG'], 'Hiệu năng đồ hoạ (Graphics Performance): tăng tốc phần cứng, chất lượng hiển thị', () => {
    let gl = 'Canvas 2D'; try{ const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); if(g){ const d = g.getExtension('WEBGL_debug_renderer_info'); gl = (d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'WebGL') + ''; } }catch(_){}
    const has = n => { try{ return A.sysvar && A.sysvar.list().includes(n); }catch(_){ return false; } };
    const sv = (n, d) => { try{ const v = A.sysvar.get(n); return v == null ? d : v; }catch(_){ return d; } };
    const rows = [['FILLMODE', 'Tô đặc hatch / vùng đặc (FILL)'], ['LWDISPLAY', 'Hiện bề rộng nét'], ['QTEXTMODE', 'Chữ hiện dạng khung (QTEXT)'], ['TRANSPARENCYDISPLAY', 'Hiện độ trong suốt']].filter(([n]) => has(n));
    const go = lsGet('dvd:gfx', { dpr: 1, smooth: 1 });
    A.dialog({ title: 'Hiệu năng đồ hoạ', cls: 'acw-free', help: 'GRAPHICSCONFIG', html: '<div class="acw" style="width:440px">' + K.grp('Tăng tốc phần cứng', '<div class="acw-row"><span class="l">Bộ xử lý đồ hoạ:</span><b translate="no" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(gl) + '</b></div>' + K.chk('gcHw', 'Bật tăng tốc phần cứng (trình duyệt quyết định)', 1, { dis: 1 })) +
        K.grp('Chất lượng 2D', K.chk('gcSm', 'Làm mịn ảnh nền (IMAGE) khi phóng', go.smooth) + '<br>' + K.chk('gcDpr', 'Vẽ sắc nét trên màn hình độ phân giải cao (HiDPI)', go.dpr)) +
        (rows.length ? K.grp('Hiển thị', rows.map(([n, t]) => K.chk('gc_' + n, t + ' (' + n + ')', +sv(n, 0) ? 1 : 0)).join('<br>')) : '') + '<div class="acw-note">Thiết bị: ' + (window.devicePixelRatio || 1) + '× · ' + (navigator.hardwareConcurrency || '?') + ' luồng CPU</div></div>',
      ok: r => { lsSet('dvd:gfx', { dpr: K.on(r, 'gcDpr') ? 1 : 0, smooth: K.on(r, 'gcSm') ? 1 : 0 }); for(const [n] of rows){ const v = K.on(r, 'gc_' + n) ? 1 : 0; if(+sv(n, 0) !== v) try{ A.sysvar.set(n, v); }catch(_){} } try{ draw(); }catch(_){} } });
  });
  // không gian làm việc đặt tên (WSSAVE / WSSETTINGS / WORKSPACE)
  const WSK = 'dvd:workspaces';
  const wsBuilt = () => [{ name: 'Drafting & Annotation', ws: 'draft', built: 1 }, { name: '3D Modeling', ws: 'm3d', built: 1 }];
  const wsAll = () => { const o = lsGet(WSK, { list: [], hide: [], save: 0 }); return { list: wsBuilt().concat(o.list || []), o }; };
  const wsCapture = name => { let props = 0; try{ props = DVDCmd.isPaletteOn() ? 1 : 0; }catch(_){} const R = A.ribbon || {}; return { name, ws: R.ws || 'draft', tab: R.tab || '', props }; };
  function wsSet(w){ if(!w) return; try{ if(A.ribbon && A.ribbon.setWS) A.ribbon.setWS(w.ws || 'draft'); }catch(_){} if(!w.built){ try{ DVDCmd.togglePalette(!!w.props); }catch(_){} } lsSet('dvd:wscur', w.name); log('Không gian làm việc: ' + w.name); }
  plain(['WSSAVE'], 'Lưu không gian làm việc hiện tại thành tên', async () => { const n = await askText({ title: 'Lưu không gian làm việc', value: 'Không gian của tôi' }); const t = n && n.trim(); if(!t) return; const { o } = wsAll(); if(wsBuilt().some(w => w.name === t)){ say('Không ghi đè được không gian có sẵn.'); return; }
    o.list = (o.list || []).filter(w => w.name !== t).concat([wsCapture(t)]); lsSet(WSK, o); lsSet('dvd:wscur', t); log('Đã lưu không gian làm việc "' + t + '".'); });
  plain(['WSSETTINGS'], 'Cài đặt không gian làm việc: thứ tự trong menu, hiện / ẩn, lưu thay đổi khi chuyển', () => {
    const { list, o } = wsAll(); let L = list.map(w => w.name), sel = L[0]; const hide = new Set(o.hide || []);
    const d = A.dialog({ title: 'Cài đặt không gian làm việc', cls: 'acw-free', help: 'WSSETTINGS', html: '<div class="acw" style="width:440px">' + K.row('Không gian làm việc của tôi =', K.sel('wsMy', L.map(n => [n, n]), lsGet('dvd:wscur', L[0]))) +
        K.grp('Hiện trong menu', '<div class="acw-cols"><div class="c1"><div id="wsL"></div></div><div class="c2 acw-btncol">' + K.btn('wsUp', 'Lên') + K.btn('wsDn', 'Xuống') + K.btn('wsDel', 'Xoá') + '</div></div>') +
        K.grp('Khi chuyển không gian làm việc', K.rad('wsSv', '0', 'Không lưu thay đổi vào không gian làm việc', !o.save) + '<br>' + K.rad('wsSv', '1', 'Tự lưu thay đổi vào không gian làm việc', !!o.save)) + '</div>',
      ok: r => { const lst = L.map(n => list.find(w => w.name === n)).filter(w => w && !w.built); lsSet(WSK, { list: lst, hide: [...hide], save: K.radio(r, 'wsSv') === '1' ? 1 : 0, order: L }); lsSet('dvd:wscur', K.val(r, 'wsMy')); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { $('wsL').innerHTML = '<div class="acw-list" id="wsLL" style="height:150px">' + L.map(n => '<div class="it' + (n === sel ? ' on' : '') + '" data-v="' + esc(n) + '"><input type="checkbox"' + (hide.has(n) ? '' : ' checked') + ' data-h="' + esc(n) + '"><span translate="no">' + esc(n) + '</span></div>').join('') + '</div>';
      $('wsLL').addEventListener('click', e => { const c = e.target.closest('[data-h]'); if(c){ if(c.checked) hide.delete(c.dataset.h); else hide.add(c.dataset.h); return; } const it = e.target.closest('.it'); if(it){ sel = it.dataset.v; render(); } }); $('wsDel').disabled = !!(list.find(w => w.name === sel) || {}).built; };
    $('wsUp').onclick = () => { const i = L.indexOf(sel); if(i > 0){ [L[i - 1], L[i]] = [L[i], L[i - 1]]; render(); } };
    $('wsDn').onclick = () => { const i = L.indexOf(sel); if(i >= 0 && i < L.length - 1){ [L[i + 1], L[i]] = [L[i], L[i + 1]]; render(); } };
    $('wsDel').onclick = () => { if((list.find(w => w.name === sel) || {}).built) return; L = L.filter(n => n !== sel); sel = L[0]; render(); };
    render(); });
  ecmd(['WORKSPACE', 'WSCURRENT'], 'Không gian làm việc: Đặt hiện hành / Lưu thành / Đổi tên / Xoá / Cài đặt / ?', async () => {
    const k = await A.getKw('Nhập tuỳ chọn không gian làm việc', { kw: [{ k: 'C', t: 'Đặt hiện hành' }, { k: 'SA', t: 'Lưu thành' }, { k: 'R', t: 'Đổi tên' }, { k: 'D', t: 'Xoá' }, { k: 'SE', t: 'Cài đặt' }, { k: '?', t: '?' }], def: 'Đặt hiện hành' }); const kw = k.kw || 'C';
    const { list, o } = wsAll();
    if(kw === '?'){ log('Không gian làm việc: ' + list.map(w => w.name).join(' · ')); return; }
    if(kw === 'SE'){ setTimeout(() => DVDCmd.run('WSSETTINGS'), 0); return; }
    if(kw === 'SA'){ setTimeout(() => DVDCmd.run('WSSAVE'), 0); return; }
    const r = await A.getStr('Nhập tên không gian làm việc', { def: lsGet('dvd:wscur', list[0].name) }); const n = String(r.str || lsGet('dvd:wscur', list[0].name)).trim(); const w = list.find(x => x.name.toUpperCase() === n.toUpperCase() || (x.ws === 'm3d' && /^3D$/i.test(n)) || (x.ws === 'draft' && /^2D$/i.test(n)));
    if(!w){ log('Không có không gian làm việc "' + n + '".'); return; }
    if(kw === 'C'){ wsSet(w); return; }
    if(w.built){ log('Không đổi tên / xoá được không gian có sẵn.'); return; }
    if(kw === 'D'){ o.list = (o.list || []).filter(x => x.name !== w.name); lsSet(WSK, o); log('Đã xoá không gian làm việc "' + w.name + '".'); return; }
    const r2 = await A.getStr('Nhập tên mới', { def: w.name }); const t = String(r2.str || '').trim(); if(!t || list.some(x => x.name === t)) return; o.list = (o.list || []).map(x => x.name === w.name ? Object.assign({}, x, { name: t }) : x); lsSet(WSK, o); log('Đã đổi tên thành "' + t + '".');
  });
  DVDCmd.register(['CLASSICXREF'], 'Trình quản lý tham chiếu ngoài kiểu cũ (mở bảng External References)', () => DVDCmd.run('XREF'), {});
  DVDCmd.register(['CLASSICIMAGE'], 'Trình quản lý ảnh kiểu cũ (mở bảng External References)', () => DVDCmd.run('XREF'), {});
  DVDCmd.register(['ADJUST', 'PDFADJUST'], 'Chỉnh ảnh nền / nền tham chiếu: độ mờ, khung (IMAGEADJUST)', () => DVDCmd.run('IMAGEADJUST'), {});
  // CLASSICGROUP — Object Grouping (hộp thoại nhóm kiểu cũ của AutoCAD)
  const grpName = b => String(b || '').replace(/^\*G:/, '').replace(/^\*NHÓM$/, '');
  function groupsAll(){ const m = new Map(); for(const e of modelEntities){ if(!e.grp || e.bm || e.dimd || e.tbld || (e.blk && String(e.blk).startsWith('*') && !/^\*(G:|NHÓM)/.test(e.blk))) continue; let g = m.get(e.grp); if(!g){ g = { id: e.grp, name: grpName(e.blk), un: !grpName(e.blk), list: [], sel: !e.gns, desc: e.gdsc || '' }; m.set(e.grp, g); } g.list.push(e); } return [...m.values()]; }
  A.groupsAll = groupsAll;
  function classicGroup(){
    let incUn = false, sel = null;
    const html = '<div class="acw" style="width:520px"><div class="lm-grid" style="height:150px"><table><thead><tr><th>Tên nhóm</th><th>Chọn được</th><th>Số đối tượng</th></tr></thead><tbody id="ogB"></tbody></table></div>' +
      K.grp('Nhận dạng nhóm', K.row('Tên nhóm:', K.txt('ogN', '')) + K.row('Mô tả:', K.txt('ogD', '')) + '<div class="acw-row">' + K.btn('ogFind', 'Tìm tên <') + K.btn('ogHi', 'Tô sáng <') + K.chk('ogUn', 'Gồm nhóm không tên', 0) + '</div>') +
      K.grp('Tạo nhóm', '<div class="acw-row">' + K.btn('ogNew', 'Mới <') + K.chk('ogSel', 'Chọn được', 1) + K.chk('ogUnn', 'Không tên', 0) + '</div>') +
      K.grp('Sửa nhóm', '<div class="acw-row" style="flex-wrap:wrap">' + K.btn('ogRm', 'Bớt <') + K.btn('ogAdd', 'Thêm <') + K.btn('ogRen', 'Đổi tên') + K.btn('ogDesc', 'Mô tả') + K.btn('ogExp', 'Rã nhóm') + K.btn('ogTog', 'Chọn được') + '</div>') + '</div>';
    const d = A.dialog({ title: 'Nhóm đối tượng', cls: 'acw-free', help: 'CLASSICGROUP', html, noCancel: true });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { const G = groupsAll().filter(g => incUn || !g.un); if(sel && !G.some(g => g.id === sel)) sel = null;
      $('ogB').innerHTML = G.length ? G.map(g => '<tr data-g="' + esc(g.id) + '"' + (g.id === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(g.name || '*Không tên') + '</td><td>' + (g.sel ? 'Có' : 'Không') + '</td><td>' + g.list.length + '</td></tr>').join('') : '<tr><td colspan="3" style="color:#9aa6ba">Chưa có nhóm.</td></tr>';
      const g = G.find(x => x.id === sel); if(g){ $('ogN').value = g.name; $('ogD').value = g.desc; } ['ogRm', 'ogAdd', 'ogRen', 'ogDesc', 'ogExp', 'ogTog'].forEach(id => { $(id).disabled = !g; }); };
    const G = () => groupsAll().find(x => x.id === sel);
    $('ogB').addEventListener('click', e => { const tr = e.target.closest('tr[data-g]'); if(!tr) return; sel = tr.dataset.g; render(); });
    $('ogUn').onchange = () => { incUn = $('ogUn').checked; render(); };
    const pickSel = msg => new Promise(res => { root.style.display = 'none'; A.run('CLASSICGROUP', async () => { const s = await A.getSel(msg); res(s.sel || []); }).finally(() => { root.style.display = ''; }); });
    const rep = (L, f, msg) => { const r = L.map(e => { const w = deep(e); delete w.userAdded; f(w); return [e, w]; }); if(r.length) A.commit({ rep: r }, msg); };
    $('ogNew').onclick = async () => { const un = $('ogUnn').checked; const n = $('ogN').value.trim(); if(!un && !n){ say('Nhập tên nhóm.'); return; } if(!un && groupsAll().some(g => g.name.toUpperCase() === n.toUpperCase())){ say('Đã có nhóm "' + n + '".'); return; }
      const L = (await pickSel('Chọn đối tượng cho nhóm mới')).filter(e => !A.isLocked(e) && !e.bm && !e.dimd && !e.tbld); if(!L.length) return; const gid = A.newGroupId('G'), ds = $('ogD').value.trim(), sl = $('ogSel').checked;
      rep(L, w => { w.grp = gid; w.blk = un ? '*NHÓM' : '*G:' + n; if(!sl) w.gns = 1; else delete w.gns; if(ds) w.gdsc = ds; else delete w.gdsc; }, 'Đã tạo nhóm ' + (un ? 'không tên' : '"' + n + '"') + ' (' + L.length + ' đối tượng)'); sel = gid; render(); };
    $('ogFind').onclick = async () => { const e = await pickEnt(root, 'Chọn một đối tượng trong nhóm (Esc = huỷ)'); if(!e) return; const g = groupsAll().find(x => x.id === e.grp); if(!g){ say('Đối tượng không thuộc nhóm nào.'); return; } if(g.un){ incUn = true; $('ogUn').checked = true; } sel = g.id; render(); };
    $('ogHi').onclick = () => { const g = G(); if(!g) return; selEnts.clear(); g.list.forEach(e => selEnts.add(e)); try{ refreshPanSel(); }catch(_){} const b = bbOf(g.list); if(b) zoomToWorldRect(b.x0, b.y0, b.x1, b.y1); root.style.display = 'none'; log('Nhóm được tô sáng — bấm chuột / phím bất kỳ để quay lại.'); const back = () => { document.removeEventListener('pointerdown', back, true); window.removeEventListener('keydown', back, true); root.style.display = ''; }; setTimeout(() => { document.addEventListener('pointerdown', back, true); window.addEventListener('keydown', back, true); }, 200); };
    $('ogAdd').onclick = async () => { const g = G(); if(!g) return; const L = (await pickSel('Chọn đối tượng cần thêm vào nhóm')).filter(e => e.grp !== g.id && !e.grp && !A.isLocked(e)); rep(L, w => { w.grp = g.id; w.blk = g.list[0].blk; if(!g.sel) w.gns = 1; if(g.desc) w.gdsc = g.desc; }, 'Đã thêm ' + L.length + ' đối tượng vào nhóm'); render(); };
    $('ogRm').onclick = async () => { const g = G(); if(!g) return; const sv = A.SET ? A.SET.pickGroup : true; try{ if(A.SET) A.SET.pickGroup = false; }catch(_){} const L = (await pickSel('Chọn đối tượng cần bớt khỏi nhóm')).filter(e => e.grp === g.id); try{ if(A.SET) A.SET.pickGroup = sv; }catch(_){} rep(L, w => { delete w.grp; delete w.blk; delete w.gns; delete w.gdsc; }, 'Đã bớt ' + L.length + ' đối tượng khỏi nhóm'); render(); };
    $('ogRen').onclick = () => { const g = G(); if(!g) return; const n = $('ogN').value.trim(); if(!n || n === g.name) { say('Nhập tên mới vào ô Tên nhóm.'); return; } if(groupsAll().some(x => x.id !== g.id && x.name.toUpperCase() === n.toUpperCase())){ say('Đã có nhóm "' + n + '".'); return; } rep(g.list, w => { w.blk = '*G:' + n; }, 'Đổi tên nhóm → ' + n); render(); };
    $('ogDesc').onclick = () => { const g = G(); if(!g) return; const ds = $('ogD').value.trim(); rep(g.list, w => { if(ds) w.gdsc = ds; else delete w.gdsc; }, 'Đã đổi mô tả nhóm'); render(); };
    $('ogExp').onclick = () => { const g = G(); if(!g) return; rep(g.list, w => { delete w.grp; delete w.blk; delete w.gns; delete w.gdsc; }, 'Đã rã nhóm ' + (g.name || '')); sel = null; render(); };
    $('ogTog').onclick = () => { const g = G(); if(!g) return; rep(g.list, w => { if(g.sel) w.gns = 1; else delete w.gns; }, g.sel ? 'Nhóm không chọn được cả nhóm' : 'Nhóm chọn được cả nhóm'); render(); };
    render();
  }
  plain(['CLASSICGROUP'], 'Nhóm đối tượng (Object Grouping) kiểu cũ: tạo, đổi tên, thêm / bớt, mô tả, rã nhóm, chọn được', () => classicGroup());
  // RESETBLOCK — trả khối động về trạng thái mặc định (như lúc chèn)
  ecmd(['RESETBLOCK'], 'Đặt lại khối động về giá trị mặc định', async (_, cur) => {
    let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = []; if(!sel){ const s = await A.getSel('Chọn khối cần đặt lại', { filter: e => !!(e.grp && e.bm) }); sel = s.sel || []; }
    const gs = [...new Set(sel.filter(e => e.grp && e.bm && e.blk).map(e => e.grp))]; if(!gs.length){ log('Không có khối nào.'); return; }
    const del = [], add = [], sv = A.LS.cur;
    for(const g of gs){ const L = modelEntities.filter(e => e.grp === g); const h = L.find(e => e.bm); const m = h.bm, ip = h.bip || { x: m.e, y: m.f }, sc = Math.hypot(m.a, m.b) || 1, rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
      const atts = new Map(L.filter(e => e.att).map(e => [e.att, e.text]));
      try{ A.LS.cur = m.lay || h.layer || sv; const N = A.instBlock(h.blk, m.src || srcOf(h.blk), ip, sc, rot); if(!N.length) continue; for(const e of N){ delete e.userAdded; if(e.att && atts.has(e.att)) e.text = atts.get(e.att); } del.push(...L); add.push(...N); }finally{ A.LS.cur = sv; } }
    if(del.length) A.commit({ del, add }, 'RESETBLOCK: đã đặt lại ' + gs.length + ' khối'); });
  // BSAVE — lưu thay đổi khối đang sửa (REFEDIT / BEDIT) mà vẫn tiếp tục sửa
  plain(['BSAVE'], 'Lưu định nghĩa khối đang sửa (tiếp tục sửa)', () => { if(!(A.inRefedit && A.inRefedit())){ log('Không có khối nào đang sửa (BEDIT / REFEDIT).'); return; } if(A.refeditSave){ A.refeditSave(); return; } DVDCmd.run('REFCLOSE'); });
  /* ==================================================================
     GRADIENT — 9 kiểu chuyển màu như AutoCAD (Linear, Cylinder, Spherical, Hemispherical, Curved và kiểu ngược), căn giữa, góc
     HATCHEDIT — mở hộp Hatch và Gradient để sửa hatch đã chọn
     ================================================================== */
  A.gradFill = function(x, g, cx, cy, R, loops){
    x.beginPath(); for(const lp of loops || []){ if(!lp || lp.length < 2) continue; x.moveTo(lp[0].x, lp[0].y); for(let k = 1; k < lp.length; k++) x.lineTo(lp[k].x, lp[k].y); x.closePath(); }
    const k = String(g.kind || 'LINEAR').toUpperCase(), an = -(g.ang || 0) * Math.PI / 180, ca = Math.cos(an), sa = Math.sin(an), c1 = g.c1 || '#1f5fa8', c2 = g.c2 || '#ffffff';
    const off = g.ctr === 0 ? R * 0.45 : 0, ox = off * sa, oy = -off * ca, X = cx + ox, Y = cy + oy;
    const lin = st => { const gr = x.createLinearGradient(X - ca * R, Y - sa * R, X + ca * R, Y + sa * R); st.forEach(([t, c]) => gr.addColorStop(t, c)); return gr; };
    const rad = (px, py, r0, r1, st) => { const gr = x.createRadialGradient(px, py, r0, px, py, r1); st.forEach(([t, c]) => gr.addColorStop(t, c)); return gr; };
    let gr;
    if(k === 'CYLINDER') gr = lin([[0, c1], [0.5, c2], [1, c1]]);
    else if(k === 'INVCYLINDER') gr = lin([[0, c2], [0.5, c1], [1, c2]]);
    else if(k === 'SPHERICAL') gr = rad(X, Y, 0, R, [[0, c2], [1, c1]]);
    else if(k === 'INVSPHERICAL' || k === 'RADIAL') gr = rad(X, Y, 0, R, [[0, c1], [1, c2]]);
    else if(k === 'HEMISPHERICAL' || k === 'INVHEMISPHERICAL'){ const px = X - sa * R * 0.8, py = Y + ca * R * 0.8; gr = rad(px, py, 0, R * 1.6, k === 'HEMISPHERICAL' ? [[0, c2], [1, c1]] : [[0, c1], [1, c2]]); }
    else if(k === 'CURVED' || k === 'INVCURVED'){ const px = X - sa * R * 2.2, py = Y + ca * R * 2.2; gr = rad(px, py, R * 1.2, R * 3.4, k === 'CURVED' ? [[0, c2], [1, c1]] : [[0, c1], [1, c2]]); }
    else gr = lin([[0, c1], [1, c2]]);
    x.fillStyle = gr; x.fill('evenodd');
  };
  { const _dh = window.drawHatch; if(typeof _dh === 'function') window.drawHatch = function(e){
      if(!e || !e.grad) return _dh.apply(this, arguments);
      const g = e.grad, b = entBBox(e); if(!b) return; const a = toScreen(b.x0, b.y0), c = toScreen(b.x1, b.y1), cx = (a.x + c.x) / 2, cy = (a.y + c.y) / 2, R = Math.hypot(c.x - a.x, c.y - a.y) / 2;
      const pc = v => (plotMode && typeof plotColor === 'function') ? plotColor(v) : v;
      const gg = Object.assign({}, g, { c1: pc(g.c1), c2: pc(g.c2), kind: g.kind === 'linear' ? 'LINEAR' : g.kind === 'radial' ? 'RADIAL' : g.kind, ang: (g.ang || 0) + (view.rot || 0) * 180 / Math.PI });
      ctx.save(); ctx.globalAlpha = g.op != null ? g.op : 0.85; A.gradFill(ctx, gg, cx, cy, R, (e.loops || []).map(lp => lp.map(p => toScreen(p.x, p.y)))); ctx.restore(); }; }
  A.applyHatchEdit = function(list, R){ const rep = list.filter(e => !A.isLocked(e)).map(e => { const w = deep(e); delete w.userAdded;
      if(R.gmode){ w.solid = true; w.grad = deep(R.grad); w.col = R.grad.c1; delete w.bl; }
      else { delete w.grad; w.pat = R.pat; w.solid = R.pat === 'SOLID'; w.psc = R.scale > 0 ? R.scale : (e.psc || 1); w.pang = R.ang || 0; if(R.col){ w.col = R.col; delete w.bl; } else { w.bl = 1; w.col = A.layerHex(w.layer || '0'); } }
      return [e, w]; }); if(rep.length) A.commit({ rep }, 'Đã sửa ' + rep.length + ' hatch'); return rep.length; };
  ecmd(['HATCHEDIT', 'HE'], 'Sửa hatch (Hatch Edit): mẫu, tỉ lệ, góc, màu, chuyển màu — hộp Hatch và Gradient', async (_, cur) => {
    let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = [];
    if(!sel){ const s = await A.getSel('Chọn hatch', { filter: e => e.type === 'HATCH' }); sel = s.sel || []; }
    const list = sel.filter(e => e.type === 'HATCH' && !A.isLocked(e)); if(!list.length){ log('Chưa chọn hatch nào.'); return; }
    setTimeout(() => A.openHatchDialog({ edit: list, tab: list[0].grad ? 'g' : 'h' }), 0); });
  plain(['GRADIENT', 'GD'], 'Tô chuyển màu (Gradient): như HATCH với kiểu chuyển màu đang chọn (T = hộp Hatch và Gradient)', () => { const HS = A.HS; if(!HS) return; HS.gmode = 1; if(!HS.grad) HS.grad = { kind: 'LINEAR', c1: '#1f5fa8', c2: '#bfe0ff', ang: 0, ctr: 1 }; if(A.hsSave) A.hsSave(); DVDCmd.run('HATCH'); });

  /* ==================================================================
     FILTER — Object Selection Filters (như AutoCAD): danh sách điều kiện, toán tử, nhóm AND / OR / XOR / NOT, bộ lọc đặt tên
     ================================================================== */
  const FLK = 'dvd:filters2';
  const OTYPES = [['LINE', 'Đường thẳng (Line)'], ['POLYLINE', 'Đa tuyến (Polyline)'], ['CIRCLE', 'Đường tròn (Circle)'], ['ARC', 'Cung (Arc)'], ['ELLIPSE', 'Elip (Ellipse)'], ['SPLINE', 'Spline'], ['TEXT', 'Chữ (Text)'], ['MTEXT', 'Chữ nhiều dòng (MText)'], ['HATCH', 'Hatch'], ['POINT', 'Điểm (Point)'], ['SOLID', 'Vùng đặc (Solid)'], ['XLINE', 'Đường dựng (Xline)'], ['IMAGE', 'Ảnh (Image)'], ['SOLID3D', 'Khối 3D (3D Solid)'], ['INSERT', 'Khối (Block)'], ['DIMENSION', 'Kích thước (Dimension)'], ['TABLE', 'Bảng (Table)'], ['MLINE', 'Đường đôi (Multiline)'], ['LEADER', 'Ghi chú dẫn (Leader)'], ['ATTRIB', 'Thuộc tính (Attribute)']];
  const FK = [['Object', 'Đối tượng', 'type'], ['Layer', 'Lớp', 'str'], ['Color', 'Màu', 'color'], ['Linetype', 'Kiểu nét', 'str'], ['Lineweight', 'Bề rộng nét', 'num'], ['Block Name', 'Tên khối', 'str'], ['Text Value', 'Nội dung chữ', 'str'], ['Text Style', 'Kiểu chữ', 'str'], ['Text Height', 'Cao chữ', 'num'],
    ['Circle Radius', 'Bán kính đường tròn', 'num'], ['Arc Radius', 'Bán kính cung', 'num'], ['Length', 'Chiều dài', 'num'], ['Line Start', 'Điểm đầu đường thẳng', 'pt'], ['Line End', 'Điểm cuối đường thẳng', 'pt'], ['Circle Center', 'Tâm đường tròn', 'pt'], ['Text Position', 'Vị trí chữ', 'pt'], ['Block Position', 'Điểm chèn khối', 'pt'],
    ['Hatch Pattern', 'Mẫu hatch', 'str'], ['Dimension Style', 'Kiểu kích thước', 'str'], ['**Begin AND', '** Bắt đầu AND', 'grp'], ['**End AND', '** Kết thúc AND', 'grp'], ['**Begin OR', '** Bắt đầu OR', 'grp'], ['**End OR', '** Kết thúc OR', 'grp'], ['**Begin XOR', '** Bắt đầu XOR', 'grp'], ['**End XOR', '** Kết thúc XOR', 'grp'], ['**Begin NOT', '** Bắt đầu NOT', 'grp'], ['**End NOT', '** Kết thúc NOT', 'grp']];
  const fkOf = k => FK.find(x => x[0] === k) || FK[0];
  const OPS = ['=', '!=', '<', '<=', '>', '>=', '*'];
  const isMt = e => e.type === 'TEXT' && !!(e.mt || e.ew || /\n/.test(e.text || ''));
  function objIs(e, t){ switch(t){ case 'MTEXT': return isMt(e) && !e.att; case 'TEXT': return e.type === 'TEXT' && !isMt(e) && !e.att && !e.dimd; case 'ATTRIB': return !!e.att; case 'INSERT': return isRef(e);
      case 'DIMENSION': return !!(e.dimd || (e.grp && /^\*DIM/.test(String(e.blk || '')))); case 'TABLE': return e.blk === '*TABLE'; case 'MLINE': return e.blk === '*MLINE'; case 'LEADER': return /^\*(LEADER|MLEADER)/.test(String(e.blk || '')); default: return e.type === t; } }
  const wildRe = p => new RegExp('^' + String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  const lenE = e => { try{ if(e.type === 'LINE') return Math.hypot(e.x2 - e.x1, e.y2 - e.y1); if(e.type === 'CIRCLE') return 2 * Math.PI * e.r; if(e.type === 'ARC'){ let s = (e.a2 - e.a1) % 360; if(s <= 0) s += 360; return e.r * s * Math.PI / 180; } if(e.type === 'POLYLINE' && A.lenOf) return A.lenOf(e); }catch(_){} return null; };
  const ptOf = (k, e) => k === 'Line Start' ? (e.type === 'LINE' ? { x: e.x1, y: e.y1 } : null) : k === 'Line End' ? (e.type === 'LINE' ? { x: e.x2, y: e.y2 } : null) : k === 'Circle Center' ? ((e.type === 'CIRCLE' || e.type === 'ARC') ? { x: e.cx, y: e.cy } : null) : k === 'Text Position' ? (e.type === 'TEXT' ? { x: e.x, y: e.y } : null) : k === 'Block Position' ? (isRef(e) ? e.bip || null : null) : null;
  function cmpN(v, op, ref){ if(op === '*' || ref === '' || ref == null) return true; const r = +String(ref).replace(',', '.'); if(v == null || !isFinite(r)) return false; const t = Math.abs(v - r) <= 1e-9 * Math.max(1, Math.abs(r));
    return op === '=' ? t : op === '!=' ? !t : op === '<' ? v < r && !t : op === '<=' ? v <= r || t : op === '>' ? v > r && !t : v >= r || t; }
  function cmpS(v, op, ref){ if(op === '*' || ref == null || ref === '') return true; const m = wildRe(ref).test(String(v == null ? '' : v)); return op === '!=' ? !m : m; }
  const aciOfE = e => e.bl ? 'BYLAYER' : String(A.aciNear ? A.aciNear(e.col || '#ffffff') : 7);
  function leafTest(it){ const k = it.k, op = it.op || '=', v = it.v;
    switch(k){
      case 'Object': return e => { const m = objIs(e, v); return op === '!=' ? !m : m; };
      case 'Layer': return e => cmpS(e.layer || '0', op, v); case 'Linetype': return e => cmpS(e.lt || 'BYLAYER', op, v); case 'Block Name': return e => isRef(e) && cmpS(e.bm.name, op, v);
      case 'Text Value': return e => e.type === 'TEXT' && cmpS(e.text, op, v); case 'Text Style': return e => e.type === 'TEXT' && cmpS(e.style || 'Standard', op, v); case 'Text Height': return e => e.type === 'TEXT' && cmpN(e.h, op, v);
      case 'Color': return e => { const c = aciOfE(e), r = String(v || '').toUpperCase(); const m = r === 'BYLAYER' ? c === 'BYLAYER' : c === String(+r); return op === '!=' ? !m : m; };
      case 'Lineweight': return e => cmpN(e.lw > 0 ? e.lw / 100 : -1, op, String(v).toUpperCase() === 'BYLAYER' ? -1 : v);
      case 'Circle Radius': return e => e.type === 'CIRCLE' && cmpN(e.r, op, v); case 'Arc Radius': return e => e.type === 'ARC' && cmpN(e.r, op, v); case 'Length': return e => cmpN(lenE(e), op, v);
      case 'Hatch Pattern': return e => e.type === 'HATCH' && cmpS(e.grad ? 'GRADIENT' : e.solid ? 'SOLID' : e.pat, op, v);
      case 'Dimension Style': return e => !!e.dimd && cmpS((e.dimd.s && e.dimd.s.name) || 'Standard', op, v);
      default: if(fkOf(k)[2] === 'pt') return e => { const p = ptOf(k, e); return !!p && cmpN(p.x, it.ox || '*', it.x) && cmpN(p.y, it.oy || '*', it.y); }; return () => true; } }
  function buildFilter(items){ const root = { op: 'AND', ch: [] }, st = [root];
    for(const it of items){ const m = /^\*\*(Begin|End) (AND|OR|XOR|NOT)$/.exec(it.k);
      if(m){ if(m[1] === 'Begin'){ const n = { op: m[2], ch: [] }; st[st.length - 1].ch.push(n); st.push(n); } else { const n = st.pop(); if(!n || n === root || n.op !== m[2]) throw new Error('Nhóm ' + m[2] + ' không khớp.'); } continue; }
      st[st.length - 1].ch.push(leafTest(it)); }
    if(st.length !== 1) throw new Error('Còn nhóm chưa đóng (** End …).');
    const ev = (n, e) => typeof n === 'function' ? n(e) : n.op === 'AND' ? n.ch.every(c => ev(c, e)) : n.op === 'OR' ? n.ch.some(c => ev(c, e)) : n.op === 'XOR' ? n.ch.filter(c => ev(c, e)).length === 1 : !n.ch.every(c => ev(c, e));
    return e => ev(root, e); }
  A.buildFilter = buildFilter;
  const itemText = it => { const f = fkOf(it.k); if(f[2] === 'grp') return '** ' + it.k.replace(/^\*\*/, '');
    if(f[2] === 'pt') return it.k + ' = X ' + (it.ox || '*') + ' ' + (it.ox && it.ox !== '*' ? it.x : '') + ', Y ' + (it.oy || '*') + ' ' + (it.oy && it.oy !== '*' ? it.y : '');
    if(it.k === 'Object'){ const t = (OTYPES.find(o => o[0] === it.v) || [0, it.v])[1]; return 'Object ' + (it.op || '=') + ' ' + ((/\(([^)]+)\)$/.exec(t) || [0, t])[1]); }
    return it.k + ' ' + (it.op || '=') + ' ' + it.v; };
  function filterDlg2(){
    let items = [], cur = -1; const lib = () => lsGet(FLK, {});
    { const old = lsGet('dvd:filters', null); if(old && !Object.keys(lib()).length){ const L = {}; for(const [n, F] of Object.entries(old)){ const it = []; if(F.type) it.push(F.type === '*BLOCK' ? { k: 'Object', op: '=', v: 'INSERT' } : F.type === '*DIM' ? { k: 'Object', op: '=', v: 'DIMENSION' } : { k: 'Object', op: '=', v: F.type }); if(F.layer) it.push({ k: 'Layer', op: '=', v: F.layer }); if(F.color) it.push({ k: 'Color', op: '=', v: F.color }); if(F.lt) it.push({ k: 'Linetype', op: '=', v: F.lt }); if(F.blk) it.push({ k: 'Block Name', op: '=', v: F.blk }); if(F.text) it.push({ k: 'Text Value', op: '=', v: '*' + F.text + '*' }); if(F.lmin) it.push({ k: 'Length', op: '>=', v: F.lmin }); if(F.lmax) it.push({ k: 'Length', op: '<=', v: F.lmax }); if(F.rmin) it.push({ k: 'Circle Radius', op: '>=', v: F.rmin }); if(F.rmax) it.push({ k: 'Circle Radius', op: '<=', v: F.rmax }); if(F.hmin) it.push({ k: 'Text Height', op: '>=', v: F.hmin }); if(F.hmax) it.push({ k: 'Text Height', op: '<=', v: F.hmax }); if(F.not && it.length) it.unshift({ k: '**Begin NOT' }), it.push({ k: '**End NOT' }); L[n] = it; } lsSet(FLK, L); } }
    const opSel = (id, dis) => K.sel(id, OPS.map(o => [o, o]), '=', { dis });
    const html = '<div class="acw" style="width:600px"><div class="acw-list" id="flL" style="height:140px;font-family:ui-monospace,Consolas,monospace" tabindex="0"></div><div class="acw-cols" style="margin-top:8px"><div class="c1">' +
      K.grp('Chọn điều kiện', '<div class="acw-row">' + K.sel('flK', FK.map(([k, t]) => [k, t]), 'Object') + K.btn('flPick', 'Chọn…') + '</div>' +
        '<div class="acw-row"><span style="width:16px">X:</span>' + opSel('flOx') + '<span id="flXw" style="flex:1;display:flex"></span></div><div class="acw-row"><span style="width:16px">Y:</span>' + opSel('flOy', 1) + K.txt('flY', '', { dis: 1 }) + '</div><div class="acw-row"><span style="width:16px">Z:</span>' + opSel('flOz', 1) + K.txt('flZ', '', { dis: 1 }) + '</div>' +
        '<div class="acw-row">' + K.btn('flAdd', 'Thêm vào danh sách') + K.btn('flSub', 'Thay thế') + '</div><div class="acw-row">' + K.btn('flObj', 'Thêm đối tượng đã chọn <') + '</div>') + '</div>' +
      '<div class="c2 acw-btncol" style="padding-top:8px">' + K.btn('flEd', 'Sửa mục') + K.btn('flDel', 'Xoá') + K.btn('flClr', 'Xoá danh sách') + '</div></div>' +
      K.grp('Bộ lọc đặt tên', '<div class="acw-row"><span class="l">Hiện tại:</span><select id="flCur" style="width:160px"></select></div><div class="acw-row"><span class="l">Lưu thành:</span>' + K.txt('flName', '') + K.btn('flSave', 'Lưu thành') + '</div><div class="acw-row">' + K.btn('flDelF', 'Xoá bộ lọc hiện tại') + '</div>') + '</div>';
    const d = A.dialog({ title: 'Bộ lọc chọn đối tượng', cls: 'acw-free', help: 'FILTER', html, okText: 'Áp dụng',
      ok: () => { let t; try{ t = buildFilter(items); }catch(err){ say(err.message); return false; } if(!items.length){ say('Danh sách điều kiện trống.'); return false; } apply(t); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const valCtl = () => { const k = $('flK').value, f = fkOf(k); const w = $('flXw');
      if(f[2] === 'type') w.innerHTML = K.sel('flX', OTYPES, 'LINE'); else if(f[2] === 'grp') w.innerHTML = K.txt('flX', '', { dis: 1 }); else w.innerHTML = K.txt('flX', '');
      const pt = f[2] === 'pt', grp = f[2] === 'grp'; $('flOx').disabled = grp; $('flOy').disabled = !pt; $('flY').disabled = !pt; $('flPick').disabled = !/^(Layer|Linetype|Block Name|Text Style|Color|Hatch Pattern|Dimension Style)$/.test(k);
      [...$('flOx').options].forEach(o => { o.disabled = (f[2] === 'str' || f[2] === 'type' || f[2] === 'color') && !['=', '!='].includes(o.value); }); if($('flOx').selectedOptions[0] && $('flOx').selectedOptions[0].disabled) $('flOx').value = '='; };
    const read = () => { const k = $('flK').value, f = fkOf(k); if(f[2] === 'grp') return { k }; if(f[2] === 'pt') return { k, ox: $('flOx').value, x: $('flX').value.trim(), oy: $('flOy').value, y: $('flY').value.trim() }; const v = ($('flX').value || '').trim(); if(!v && $('flOx').value !== '*'){ say('Nhập giá trị.'); return null; } return { k, op: $('flOx').value, v }; };
    const put = it => { $('flK').value = it.k; valCtl(); const f = fkOf(it.k); if(f[2] === 'pt'){ $('flOx').value = it.ox || '*'; $('flX').value = it.x || ''; $('flOy').value = it.oy || '*'; $('flY').value = it.y || ''; } else if(f[2] !== 'grp'){ $('flOx').value = it.op || '='; $('flX').value = it.v || ''; } };
    const render = () => { $('flL').innerHTML = items.length ? items.map((it, i) => '<div class="it' + (i === cur ? ' on' : '') + '" data-i="' + i + '" translate="no">' + esc(itemText(it)) + '</div>').join('') : '<div style="color:#9aa6ba;padding:4px">(chưa có điều kiện)</div>';
      $('flEd').disabled = $('flDel').disabled = $('flSub').disabled = cur < 0; const L = lib(); $('flCur').innerHTML = '<option value="">*không tên</option>' + Object.keys(L).map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join(''); };
    $('flL').addEventListener('click', e => { const it = e.target.closest('.it[data-i]'); if(!it) return; cur = +it.dataset.i; render(); });
    $('flL').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-i]'); if(it){ cur = +it.dataset.i; put(items[cur]); render(); } });
    $('flK').onchange = valCtl;
    $('flAdd').onclick = () => { const it = read(); if(!it) return; items.splice(cur >= 0 ? cur + 1 : items.length, 0, it); cur = cur >= 0 ? cur + 1 : items.length - 1; render(); };
    $('flSub').onclick = () => { if(cur < 0) return; const it = read(); if(!it) return; items[cur] = it; render(); };
    $('flEd').onclick = () => { if(cur >= 0) put(items[cur]); };
    $('flDel').onclick = () => { if(cur < 0) return; items.splice(cur, 1); cur = Math.min(cur, items.length - 1); render(); };
    $('flClr').onclick = () => { items = []; cur = -1; render(); };
    $('flObj').onclick = async () => { const e = await pickEnt(root, 'Chọn đối tượng (Esc = huỷ)'); if(!e) return; const t = OTYPES.find(o => objIs(e, o[0])); if(t) items.push({ k: 'Object', op: '=', v: t[0] }); items.push({ k: 'Layer', op: '=', v: e.layer || '0' }); items.push({ k: 'Color', op: '=', v: aciOfE(e) }); if(e.lt) items.push({ k: 'Linetype', op: '=', v: e.lt }); if(isRef(e)) items.push({ k: 'Block Name', op: '=', v: e.bm.name }); cur = items.length - 1; render(); };
    $('flPick').onclick = () => { const k = $('flK').value; if(k === 'Color'){ if(A.aciPicker) A.aciPicker($('flPick').getBoundingClientRect(), c => { if(!c) return; $('flX').value = c === 'BYLAYER' ? 'BYLAYER' : String(A.aciNear ? A.aciNear(c) : c); }); return; }
      const L = k === 'Layer' ? A.layerNames() : k === 'Linetype' ? ['BYLAYER', 'CONTINUOUS'].concat(A.ltNames ? A.ltNames() : []) : k === 'Block Name' ? blockNames() : k === 'Text Style' ? Object.keys((A.TS && A.TS.list) || { Standard: 1 }) : k === 'Hatch Pattern' ? ['SOLID', 'GRADIENT'].concat(Object.keys(A.PATS || {})) : (A.dimStyles && A.dimStyles.names ? A.dimStyles.names() : ['Standard']);
      let v = L[0]; A.dialog({ title: 'Chọn ' + fkOf(k)[1].toLowerCase(), cls: 'acw-free', help: 'FILTER', html: '<div class="acw" style="width:280px">' + K.list('flPL', [...new Set(L)].map(n => ({ v: n, h: '<span translate="no">' + esc(n) + '</span>' })), v, 'height:240px') + '</div>', onOpen: r => K.bindList(r.querySelector('#flPL'), x => { v = x; }, x => { v = x; r.querySelector('.dvd-ok').click(); }), ok: () => { $('flX').value = v; } }); };
    $('flCur').onchange = () => { const n = $('flCur').value; items = n ? deep(lib()[n] || []) : []; cur = -1; render(); $('flCur').value = n; $('flName').value = n; };
    $('flSave').onclick = () => { const n = $('flName').value.trim(); if(!n){ say('Nhập tên bộ lọc.'); return; } if(!items.length){ say('Danh sách điều kiện trống.'); return; } try{ buildFilter(items); }catch(err){ say(err.message); return; } const L = lib(); L[n] = deep(items); lsSet(FLK, L); render(); $('flCur').value = n; log('Đã lưu bộ lọc "' + n + '".'); };
    $('flDelF').onclick = () => { const n = $('flCur').value; if(!n) return; const L = lib(); delete L[n]; lsSet(FLK, L); render(); };
    valCtl(); render();
  }
  function apply(t){ setTimeout(() => A.run('FILTER', async () => { const s = await A.getSel('Áp dụng bộ lọc cho vùng chọn. Chọn đối tượng', { pre: false }); const base = (s.sel || []); const hit = [...A.expandGroups(new Set(base.filter(e => { try{ return t(e); }catch(_){ return false; } })))];
      log(hit.length + ' đối tượng khớp bộ lọc (trong ' + base.length + ' đối tượng đã chọn).'); const go = () => { selEnts.clear(); for(const e of hit) selEnts.add(e); try{ refreshPanSel(); }catch(_){} try{ A.paint(); }catch(_){} }; go(); setTimeout(go, 0); }), 0); }
  plain(['FILTER', 'FI'], 'Bộ lọc chọn đối tượng (Object Selection Filters): điều kiện theo loại, lớp, màu, kích thước…, nhóm AND / OR / XOR / NOT, lưu bộ lọc', () => { if(A.busy && A.busy()) A.cancel(true); filterDlg2(); });

  /* ==================================================================
     ALIASEDIT — acad.pgp – AutoCAD Alias Editor (Express Tools): lệnh tắt, thêm / sửa / xoá, nhập / xuất acad.pgp
     ================================================================== */
  const ALK = 'dvd:alias', ADK = 'dvd:aliasdel';
  function aliasMap(){ const m = new Map(); try{ for(const [a, c] of (A.ACAD_PGP || [])) m.set(String(a).toUpperCase(), { c: String(c).toUpperCase(), b: 1 }); }catch(_){} for(const [a, c] of Object.entries(lsGet(ALK, {}))) m.set(a, { c, u: 1 }); for(const a of lsGet(ADK, [])) m.delete(a); return m; }
  function dropAlias(al){ const c = DVDCmd.commands.find(x => x.k.includes(al) && x.k[0] !== al); if(!c) return false; const extra = {}; for(const k in c) if(!['k', 'd', 'run'].includes(k)) extra[k] = c[k]; DVDCmd.register(c.k.filter(k => k !== al), c.d, c.run, extra); return true; }
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { for(const a of lsGet(ADK, [])) dropAlias(a); }, 1600));
  plain(['ALIASEDIT', 'ALIAS', 'PGP'], 'Sửa lệnh tắt (acad.pgp – Alias Editor): thêm, sửa, xoá lệnh tắt, nhập / xuất acad.pgp', () => {
    let M = aliasMap(), sel = null, q = ''; const adds = new Map(Object.entries(lsGet(ALK, {}))), dels = new Set(lsGet(ADK, []));
    const html = '<div class="acw" style="width:560px">' + K.tabs('al', [['cmd', 'Lệnh tắt'], ['sh', 'Lệnh shell']], 'cmd') + '<div class="acw-panes" style="min-height:330px">' +
      K.pane('al', 'cmd', 'cmd', '<div class="acw-row"><input id="alQ" placeholder="Tìm lệnh tắt / lệnh…" style="flex:1;width:auto"><span id="alN" style="color:#9aa6ba"></span></div><div class="lm-grid" style="height:270px"><table><thead><tr><th style="width:110px">Lệnh tắt</th><th>Lệnh AutoCAD</th><th>Nguồn</th></tr></thead><tbody id="alB"></tbody></table></div>' +
        '<div class="acw-row" style="margin-top:6px">' + K.btn('alAdd', 'Thêm…') + K.btn('alRm', 'Xoá') + K.btn('alEd', 'Sửa…') + '</div>') +
      K.pane('al', 'sh', 'cmd', '<div class="acw-note">Lệnh shell (chạy chương trình hệ điều hành) không dùng được trong DVDCAD.</div>') + '</div></div>';
    const d = A.dialog({ title: 'acad.pgp – Sửa lệnh tắt', cls: 'acw-free', help: 'ALIASEDIT', html, left: K.btn('alImp', 'Nhập acad.pgp…') + K.btn('alExp', 'Xuất acad.pgp…'),
      ok: () => { const o = {}; for(const [a, c] of adds) o[a] = c; lsSet(ALK, o); lsSet(ADK, [...dels]); let n = 0; for(const [a, c] of adds) if(A.applyAlias && A.applyAlias(a, c)) n++; for(const a of dels) dropAlias(a); log('Đã lưu lệnh tắt (' + n + ' lệnh tắt riêng, ' + dels.size + ' lệnh tắt bị bỏ).'); } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    const cur = () => { const m = new Map(M); for(const a of dels) m.delete(a); for(const [a, c] of adds) m.set(a, { c, u: 1 }); return m; };
    const has = c => DVDCmd.commands.some(x => x.k.includes(c));
    const render = () => { const m = cur(), qq = q.trim().toUpperCase(); const L = [...m.entries()].filter(([a, v]) => !qq || a.includes(qq) || v.c.includes(qq)).sort((x, y) => x[0].localeCompare(y[0]));
      $('alN').textContent = L.length + ' lệnh tắt'; $('alB').innerHTML = L.map(([a, v]) => '<tr data-a="' + esc(a) + '"' + (a === sel ? ' class="sel"' : '') + '><td translate="no"><b>' + esc(a) + '</b></td><td translate="no"' + (has(v.c) ? '' : ' style="color:#ff8a80"') + '>' + esc(v.c) + '</td><td>' + (v.u ? 'Người dùng' : 'acad.pgp') + '</td></tr>').join(''); $('alRm').disabled = $('alEd').disabled = !sel; };
    const edit = (a0, c0) => A.dialog({ title: a0 ? 'Sửa lệnh tắt' : 'Lệnh tắt mới', cls: 'acw-free', help: 'ALIASEDIT', html: '<div class="acw" style="width:360px">' + K.row('Lệnh tắt:', K.txt('anA', a0 || '')) + K.row('Lệnh AutoCAD:', '<input id="anC" list="anCL" value="' + esc(c0 || '') + '"><datalist id="anCL">' + DVDCmd.commands.map(c => '<option value="' + esc(c.k[0]) + '">').join('') + '</datalist>') + '</div>',
      ok: r => { const a = K.val(r, 'anA').trim().toUpperCase(), c = K.val(r, 'anC').trim().toUpperCase().replace(/^[*_.]+/, ''); if(!/^[A-Z0-9_\-]+$/.test(a)){ say('Lệnh tắt chỉ gồm chữ, số.'); return false; } if(!has(c)){ say('Không có lệnh "' + c + '".'); return false; }
        if(a0 && a0 !== a){ adds.delete(a0); dels.add(a0); } dels.delete(a); adds.set(a, c); sel = a; render(); } });
    $('alB').addEventListener('click', e => { const tr = e.target.closest('tr[data-a]'); if(!tr) return; sel = tr.dataset.a; render(); });
    $('alB').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-a]'); if(tr){ sel = tr.dataset.a; $('alEd').click(); } });
    $('alQ').addEventListener('input', () => { q = $('alQ').value; render(); });
    $('alAdd').onclick = () => edit('', ''); $('alEd').onclick = () => { const v = cur().get(sel); if(v) edit(sel, v.c); };
    $('alRm').onclick = () => { if(!sel) return; adds.delete(sel); if(M.has(sel)) dels.add(sel); sel = null; render(); };
    $('alImp').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.pgp,.txt'; i.onchange = () => { const f = i.files[0]; if(!f) return; f.text().then(t => { const P = A.parsePGP ? A.parsePGP(t) : {}; let ok = 0, miss = 0; for(const [a, c] of Object.entries(P)){ if(has(c)){ adds.set(a, c); dels.delete(a); ok++; } else miss++; } render(); say('Đã đọc ' + ok + ' lệnh tắt' + (miss ? ' · ' + miss + ' lệnh chưa có trong DVDCAD' : '') + '. Bấm OK để lưu.'); }); }; i.click(); };
    $('alExp').onclick = () => { const L = [...cur().entries()].sort((x, y) => x[0].localeCompare(y[0])); const t = ';  acad.pgp — xuất từ DVDCAD\r\n' + L.map(([a, v]) => (a + ',').padEnd(12) + '*' + v.c).join('\r\n') + '\r\n'; const blob = new Blob([t], { type: 'text/plain' }); try{ shareOrDownload(blob, 'acad.pgp', 'text/plain'); }catch(_){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'acad.pgp'; a.click(); } };
    render();
  });

  /* ==================================================================
     SPELL — Check Spelling (như AutoCAD): nơi kiểm tra, từ không có trong từ điển, gợi ý, Bỏ qua / Bỏ qua tất cả / Thay / Thay tất cả / Thêm vào từ điển, Hoàn tác
     ================================================================== */
  const SPK = 'dvd:spellset', UDK2 = 'dvd:spelldict';
  const WRD = /[A-Za-zÀ-ỹĐđ]+/g;
  function spellDlg(){
    if(!A.spellScan){ log('Thiếu bộ kiểm tra chính tả.'); return; }
    const S = Object.assign({ dims: 1, atts: 1, ignCap: 0, ignUp: 1, ascii: 0 }, lsGet(SPK, {}));
    let where = selEnts.size ? 'sel' : 'all', selSet = [...selEnts], texts = [], flagged = new Map(), ign = new Set(), pos = null, undo = [];
    const html = '<div class="acw" style="width:560px"><div class="acw-row"><span class="l">Nơi kiểm tra:</span>' + K.sel('spWh', [['all', 'Toàn bản vẽ'], ['cur', 'Không gian / layout hiện tại'], ['sel', 'Đối tượng đã chọn']], where) + K.btn('spSel', '⬚', { tip: 'Chọn đối tượng' }) + '</div>' +
      '<div class="acw-cols"><div class="c1">' + K.vrow('Không có trong từ điển:', K.txt('spW', '', { dis: 0 })) + K.vrow('Gợi ý:', K.txt('spS', '')) + '<div class="acw-list" id="spL" style="height:120px"></div>' +
        K.vrow('Ngữ cảnh:', '<div id="spCtx" style="min-height:36px;border:1px solid #5a6578;background:#262b34;padding:4px 6px;white-space:normal"></div>') + '</div>' +
      '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('spStart', 'Bắt đầu', { def: 1 }) + K.btn('spAdd', 'Thêm vào từ điển') + K.btn('spIgn', 'Bỏ qua') + K.btn('spIgnA', 'Bỏ qua tất cả') + K.btn('spChg', 'Thay') + K.btn('spChgA', 'Thay tất cả') + '</div></div>' +
      '<div class="acw-row" style="margin-top:6px"><span class="l">Từ điển chính:</span>' + K.sel('spDict', [['vi', 'Tiếng Việt (Việt Nam)'], ['vi+', 'Tiếng Việt (gồm từ không dấu)']], S.ascii ? 'vi+' : 'vi') + K.btn('spSet', 'Cài đặt…') + K.btn('spDic', 'Từ điển…') + '</div><div class="acw-note" id="spN"></div></div>';
    const d = A.dialog({ title: 'Kiểm tra chính tả', cls: 'acw-free', help: 'SPELL', html, noOk: true, cancelText: 'Đóng', left: K.btn('spUndo', 'Hoàn tác') });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const collect = () => { let src = where === 'sel' ? selSet : modelEntities; if(where === 'cur'){ try{ src = entities.filter(e => modelEntities.includes(e)); }catch(_){} }
      return src.filter(e => e.type === 'TEXT' && !e.tbld && !A.isLocked(e) && String(e.text || '').trim() && !e.fld && (S.dims || !e.dimd) && (S.atts || !e.att)).sort((a, b) => (b.y || 0) - (a.y || 0) || (a.x || 0) - (b.x || 0)); };
    const okWord = w => (S.ignUp && w.length > 1 && w === w.toUpperCase()) || (S.ignCap && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase());
    const btns = on => { ['spAdd', 'spIgn', 'spIgnA', 'spChg', 'spChgA'].forEach(id => { $(id).disabled = !on; }); $('spUndo').disabled = !undo.length; };
    function next(from){ let ei = from ? from.ei : 0, off = from ? from.off : 0;
      for(; ei < texts.length; ei++, off = 0){ const t = String(texts[ei].text || ''); WRD.lastIndex = off; let m; while((m = WRD.exec(t))){ const w = m[0], lw = w.toLowerCase(); if(flagged.has(lw) && !ign.has(lw) && !okWord(w)) return { ei, off: m.index, w }; } }
      return null; }
    function show(p){ pos = p; if(!p){ $('spW').value = ''; $('spS').value = ''; $('spL').innerHTML = ''; $('spCtx').textContent = ''; $('spN').textContent = 'Kiểm tra chính tả xong.'; btns(false); try{ say('Kiểm tra chính tả xong.'); }catch(_){} return; }
      const e = texts[p.ei], t = String(e.text), sug = (flagged.get(p.w.toLowerCase()) || {}).sug || [];
      $('spW').value = p.w; $('spS').value = sug[0] || p.w; $('spL').innerHTML = sug.map(s => '<div class="it" data-v="' + esc(s) + '">' + esc(s) + '</div>').join('') || '<div style="color:#9aa6ba;padding:2px 6px">(không có gợi ý)</div>';
      $('spCtx').innerHTML = esc(t.slice(Math.max(0, p.off - 40), p.off)) + '<b style="color:#ff8a80;text-decoration:underline">' + esc(p.w) + '</b>' + esc(t.slice(p.off + p.w.length, p.off + p.w.length + 40));
      $('spN').textContent = ''; btns(true); try{ const b = entBBox(e); if(b){ const m = Math.max(b.x1 - b.x0, b.y1 - b.y0, (e.h || 2.5) * 6); zoomToWorldRect((b.x0 + b.x1) / 2 - m, (b.y0 + b.y1) / 2 - m * 0.6, (b.x0 + b.x1) / 2 + m, (b.y0 + b.y1) / 2 + m * 0.6); } selEnts.clear(); selEnts.add(e); try{ refreshPanSel(); }catch(_){} }catch(_){} }
    const start = () => { texts = collect(); const L = A.spellScan(texts, { ascii: $('spDict').value === 'vi+' }); flagged = new Map(L.map(it => [it.w.toLowerCase(), it])); ign = new Set(); undo = []; $('spStart').textContent = 'Bắt đầu lại';
      if(!texts.length){ $('spN').textContent = 'Không có chữ nào để kiểm tra.'; btns(false); return; } show(next(null)); };
    const casey = (w, r) => (w === w.toUpperCase() && w.length > 1) ? r.toUpperCase() : (w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) ? r[0].toUpperCase() + r.slice(1) : r;
    const setText = (i, t) => { const e = texts[i]; const w = deep(e); delete w.userAdded; w.text = t; if(w.dimd) w.dimd.ov = t; if(w.rt) delete w.rt; A.commit({ rep: [[e, w]] }, 'Chính tả'); undo.push({ i, e: w, old: e }); texts[i] = w; return w; };
    $('spStart').onclick = start;
    $('spL').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(it) $('spS').value = it.dataset.v; });
    $('spL').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-v]'); if(it){ $('spS').value = it.dataset.v; $('spChg').click(); } });
    $('spIgn').onclick = () => { if(pos) show(next({ ei: pos.ei, off: pos.off + pos.w.length })); };
    $('spIgnA').onclick = () => { if(!pos) return; ign.add(pos.w.toLowerCase()); show(next(pos)); };
    $('spAdd').onclick = () => { if(!pos) return; const D = new Set(lsGet(UDK2, [])); D.add(pos.w.toLowerCase()); lsSet(UDK2, [...D]); ign.add(pos.w.toLowerCase()); log('Đã thêm "' + pos.w + '" vào từ điển riêng.'); show(next(pos)); };
    $('spChg').onclick = () => { if(!pos) return; const r = $('spS').value.trim(); if(!r) return; const t = String(texts[pos.ei].text), rr = casey(pos.w, r); setText(pos.ei, t.slice(0, pos.off) + rr + t.slice(pos.off + pos.w.length)); show(next({ ei: pos.ei, off: pos.off + rr.length })); };
    $('spChgA').onclick = () => { if(!pos) return; const r = $('spS').value.trim(); if(!r) return; const w0 = pos.w; for(let i = 0; i < texts.length; i++){ const t = String(texts[i].text); const n = A.spellReplace ? A.spellReplace(t, w0, r) : t; if(n !== t) setText(i, n); } ign.add(w0.toLowerCase()); show(next({ ei: pos.ei, off: pos.off })); };
    $('spUndo').onclick = () => { const u = undo.pop(); if(!u) return; const cur = texts[u.i]; const w = deep(u.old); delete w.userAdded; A.commit({ rep: [[cur, w]] }, 'Hoàn tác chính tả'); texts[u.i] = w; show(next({ ei: u.i, off: 0 })); };
    $('spWh').onchange = () => { where = $('spWh').value; };
    $('spSel').onclick = () => { root.style.display = 'none'; A.run('SPELL', async () => { const s = await A.getSel('Chọn đối tượng cần kiểm tra chính tả'); selSet = s.sel || []; }).finally(() => { root.style.display = ''; where = 'sel'; $('spWh').value = 'sel'; $('spN').textContent = selSet.length + ' đối tượng đã chọn.'; }); };
    $('spSet').onclick = () => A.dialog({ title: 'Cài đặt kiểm tra chính tả', cls: 'acw-free', help: 'SPELL', html: '<div class="acw" style="width:340px">' + K.grp('Gồm', K.chk('ssD', 'Chữ kích thước', S.dims) + '<br>' + K.chk('ssA', 'Thuộc tính khối', S.atts) + '<br>' + K.chk('ssX', 'Tham chiếu ngoài', 0, { dis: 1 })) +
        K.grp('Tuỳ chọn', K.chk('ssC', 'Bỏ qua từ viết hoa chữ đầu', S.ignCap) + '<br>' + K.chk('ssU', 'Bỏ qua từ viết HOA toàn bộ', S.ignUp) + '<br>' + K.chk('ssN', 'Bỏ qua từ có chữ số', 1, { dis: 1 }) + '<br>' + K.chk('ssP', 'Bỏ qua địa chỉ web, tên tệp', 1, { dis: 1 })) + '</div>',
      ok: r => { S.dims = K.on(r, 'ssD') ? 1 : 0; S.atts = K.on(r, 'ssA') ? 1 : 0; S.ignCap = K.on(r, 'ssC') ? 1 : 0; S.ignUp = K.on(r, 'ssU') ? 1 : 0; lsSet(SPK, S); } });
    $('spDic').onclick = () => { let D = lsGet(UDK2, []), s2 = null; const dd = A.dialog({ title: 'Từ điển', cls: 'acw-free', help: 'SPELL', html: '<div class="acw" style="width:360px">' + K.row('Từ điển chính:', K.sel('sdM', [['vi', 'Tiếng Việt (Việt Nam)']], 'vi')) + K.grp('Từ điển riêng', K.row('Từ:', K.txt('sdW', '') + K.btn('sdAdd', 'Thêm')) + '<div id="sdL"></div>' + K.btn('sdDel', 'Xoá')) + '</div>', noCancel: true });
      const r2 = dd.root; const rr = () => { r2.querySelector('#sdL').innerHTML = K.list('sdLL', D.slice().sort().map(w => ({ v: w, t: w })), s2, 'height:160px'); K.bindList(r2.querySelector('#sdLL'), v => { s2 = v; }); };
      r2.querySelector('#sdAdd').onclick = () => { const w = r2.querySelector('#sdW').value.trim().toLowerCase(); if(!w || D.includes(w)) return; D.push(w); lsSet(UDK2, D); r2.querySelector('#sdW').value = ''; rr(); };
      r2.querySelector('#sdDel').onclick = () => { if(!s2) return; D = D.filter(w => w !== s2); lsSet(UDK2, D); s2 = null; rr(); }; rr(); };
    btns(false); $('spN').textContent = 'Bấm "Bắt đầu" để kiểm tra chính tả.';
  }
  plain(['SPELL', 'SP', 'CHINHTA'], 'Kiểm tra chính tả (Check Spelling): từ điển tiếng Việt có sẵn + từ điển riêng, Thay / Bỏ qua / Thêm vào từ điển', () => { if(!A.hasDoc || A.hasDoc()) spellDlg(); });

  /* ==================================================================
     APPLOAD — Load / Unload Applications (như AutoCAD): nạp tệp, ứng dụng đã nạp / lịch sử, gỡ nạp, Startup Suite
     ================================================================== */
  function apploadDlg(){
    const AD = window.DVDAddins; if(!AD){ log('Chưa có bộ nạp add-in.'); return; }
    let tab = 'ld', sel = null, hist = lsGet('dvd:apphist', 1);
    const html = '<div class="acw" style="width:600px">' + K.grp('Nạp tệp', '<div class="acw-row"><span class="l">Tên tệp:</span><input id="apF" readonly placeholder="(chưa chọn tệp)" style="flex:1;width:auto">' + K.btn('apBr', 'Duyệt…') + K.btn('apLoad', 'Nạp', { def: 1 }) + '</div>' +
        '<div class="acw-row"><span class="l">Loại tệp:</span>' + K.sel('apT', [['all', 'Ứng dụng AutoCAD (*.lsp; *.js; *.fas; *.vlx; *.arx; *.dvb)'], ['lsp', 'Tệp AutoLISP (*.lsp)'], ['js', 'Tệp JavaScript (*.js)']], 'all') + K.chk('apH', 'Thêm vào lịch sử', hist) + '</div>') +
      '<div class="acw-cols"><div class="c1">' + K.tabs('ap', [['ld', 'Ứng dụng đã nạp'], ['hs', 'Lịch sử']], tab) + '<div class="acw-panes" style="min-height:0;padding:4px"><div class="lm-grid" style="height:200px"><table><thead><tr><th>Tệp</th><th>Loại</th><th>Lệnh</th><th>Khởi động</th></tr></thead><tbody id="apB"></tbody></table></div></div></div>' +
        '<div class="c2 acw-btncol" style="padding-top:30px">' + K.btn('apUn', 'Gỡ nạp') + K.btn('apRm', 'Xoá khỏi lịch sử') + '<div style="height:20px"></div>' + K.grp('Startup Suite', '<div style="display:flex;gap:6px;align-items:center"><span style="font-size:22px">💼</span>' + K.btn('apSS', 'Nội dung…') + '</div>') + K.btn('apSmp', 'Add-in mẫu…') + '</div></div>' +
      '<div class="acw-note" id="apN"></div></div>';
    const d = A.dialog({ title: 'Nạp / gỡ ứng dụng', cls: 'acw-free', help: 'APPLOAD', html, noOk: true, cancelText: 'Đóng', cancel: () => lsSet('dvd:apphist', hist) });
    const root = d.root, $ = id => root.querySelector('#' + id); let files = [];
    K.bindTabs(root, t => { tab = t; sel = null; render(); });
    const render = () => { const L = AD.list(), ld = AD.loaded; const rows = tab === 'ld' ? [...ld.keys()].map(n => L.find(x => x.name === n) || { name: n, type: (ld.get(n) || {}).type }) : L;
      $('apB').innerHTML = rows.length ? rows.map(x => '<tr data-n="' + esc(x.name) + '"' + (x.name === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(x.name) + '</td><td>' + (x.type === 'js' ? 'JavaScript' : 'AutoLISP') + '</td><td translate="no" style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + esc(((ld.get(x.name) || {}).cmds || x.cmds || []).join(', ')) + '</td><td>' + (x.startup ? '✓' : '') + '</td></tr>').join('') : '<tr><td colspan="4" style="color:#9aa6ba">' + (tab === 'ld' ? 'Chưa nạp ứng dụng nào.' : 'Lịch sử trống.') + '</td></tr>';
      $('apUn').disabled = !sel || tab !== 'ld'; $('apRm').disabled = !sel || tab !== 'hs'; };
    $('apB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; render(); });
    $('apBr').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; const t = $('apT').value; i.accept = t === 'lsp' ? '.lsp' : t === 'js' ? '.js' : '.lsp,.js,.fas,.vlx,.dll,.arx,.dvb,.txt';
      i.onchange = async () => { files = []; for(const f of i.files) files.push({ name: f.name, code: await f.text() }); $('apF').value = files.map(f => f.name).join('; '); }; i.click(); };
    $('apLoad').onclick = async () => { if(!files.length){ $('apBr').click(); return; } const bad = files.filter(f => !/\.(lsp|js)$/i.test(f.name)); if(bad.length){ $('apN').textContent = bad.map(f => f.name).join(', ') + ': không nạp được trong DVDCAD (chỉ chạy .lsp / .js mã nguồn).'; }
      const good = files.filter(f => /\.(lsp|js)$/i.test(f.name)); if(!good.length) return;
      const ok = await new Promise(res => A.dialog({ title: 'Cảnh báo bảo mật', cls: 'acw-free', help: 'APPLOAD', html: '<div class="acw" style="width:420px">Nạp <b translate="no">' + good.map(f => esc(f.name)).join(', ') + '</b>?<div class="acw-note" style="color:#f6c445">⚠ Ứng dụng chạy với toàn quyền trong DVDCAD (sửa / xoá bản vẽ, gửi dữ liệu ra mạng). Chỉ nạp tệp từ nguồn bạn tin cậy.</div></div>', okText: 'Nạp', ok: () => res(true), cancel: () => res(false) }));
      if(!ok) return; let n = 0; for(const f of good){ try{ await AD.add(f.name, f.code, false); n++; }catch(err){ $('apN').textContent = f.name + ': ' + (err.message || err); } }
      hist = K.on(root, 'apH') ? 1 : 0; if(!hist && AD.save) AD.save(AD.list().filter(x => !good.some(f => f.name === x.name && !x.startup)));   // bỏ "Thêm vào lịch sử": chỉ nạp trong phiên này
      $('apN').textContent = n + ' ứng dụng đã nạp thành công.'; files = []; $('apF').value = ''; tab = 'ld'; root.querySelector('[data-tab="ld"]').click(); render(); };
    $('apUn').onclick = () => { if(!sel) return; AD.loaded.delete(sel); $('apN').textContent = 'Đã gỡ nạp "' + sel + '" (lệnh đã nạp vẫn dùng được tới khi mở lại ứng dụng).'; sel = null; render(); };
    $('apRm').onclick = () => { if(!sel) return; const L = AD.list().filter(x => x.name !== sel); try{ localStorage.setItem('dvd:addins', JSON.stringify(L)); }catch(_){} if(AD.save) AD.save(L); sel = null; render(); };
    $('apSS').onclick = () => { let s2 = null; const dd = A.dialog({ title: 'Startup Suite', cls: 'acw-free', help: 'APPLOAD', html: '<div class="acw" style="width:400px"><div class="acw-lab">Danh sách ứng dụng (tự nạp khi mở DVDCAD):</div><div id="ssL"></div><div class="acw-row" style="margin-top:6px">' + K.btn('ssAdd', 'Thêm…') + K.btn('ssRm', 'Bỏ') + K.btn('ssRmA', 'Bỏ hết') + '</div></div>', noCancel: true, okText: 'Đóng' });
      const r2 = dd.root; const setSt = (n, on) => { const L = AD.list(); const it = L.find(x => x.name === n); if(it){ it.startup = on; try{ localStorage.setItem('dvd:addins', JSON.stringify(L)); }catch(_){} if(AD.save) AD.save(L); } };
      const rr = () => { const L = AD.list().filter(x => x.startup); r2.querySelector('#ssL').innerHTML = K.list('ssLL', L.map(x => ({ v: x.name, h: '<span translate="no">' + esc(x.name) + '</span>' })), s2, 'height:160px'); K.bindList(r2.querySelector('#ssLL'), v => { s2 = v; }); };
      r2.querySelector('#ssAdd').onclick = () => { const L = AD.list().filter(x => !x.startup); if(!L.length){ say('Nạp ứng dụng trước (APPLOAD), rồi thêm vào Startup Suite.'); return; } let v = L[0].name;
        A.dialog({ title: 'Thêm vào Startup Suite', cls: 'acw-free', help: 'APPLOAD', html: '<div class="acw" style="width:300px">' + K.list('ssPL', L.map(x => ({ v: x.name, h: '<span translate="no">' + esc(x.name) + '</span>' })), v, 'height:180px') + '</div>', onOpen: r3 => K.bindList(r3.querySelector('#ssPL'), x => { v = x; }), ok: () => { setSt(v, true); rr(); } }); };
      r2.querySelector('#ssRm').onclick = () => { if(s2){ setSt(s2, false); s2 = null; rr(); } };
      r2.querySelector('#ssRmA').onclick = () => { for(const x of AD.list()) if(x.startup) setSt(x.name, false); rr(); }; rr(); };
    $('apSmp').onclick = () => { try{ DVDCmd.run('ADDINS'); }catch(_){} };
    render(); $('apN').textContent = AD.loaded.size + ' ứng dụng đang nạp.';
  }
  document.addEventListener('DOMContentLoaded', () => { DVDCmd.register(['APPLOAD', 'AP'], 'Nạp / gỡ ứng dụng (Load / Unload Applications): AutoLISP (.lsp), JavaScript (.js), Startup Suite', () => apploadDlg(), {}); });

  /* ==================================================================
     LAYTRANS — Layer Translator (như AutoCAD): Chuyển từ / Chuyển sang, ánh xạ, nạp lớp chuẩn từ DXF, Cài đặt, Chuyển
     ================================================================== */
  const LTK2 = 'dvd:laytrans', LTS = 'dvd:laytransset';
  function dxfLayers(txt){ const L = []; const lines = String(txt).split(/\r?\n/); let inT = false;
    for(let i = 0; i + 1 < lines.length; i += 2){ const c = lines[i].trim(), v = lines[i + 1].trim();
      if(c === '2' && v === 'LAYER' && lines[i - 2] && lines[i - 2].trim() === '0' && lines[i - 1] && lines[i - 1].trim() === 'TABLE') inT = true;
      else if(inT && c === '0' && v === 'ENDTAB') break;
      else if(inT && c === '0' && v === 'LAYER') L.push({});
      else if(inT && L.length){ const o = L[L.length - 1]; if(c === '2') o.name = v; if(c === '62') o.aci = Math.abs(+v); if(c === '6') o.lt = v.toUpperCase(); if(c === '370') o.lw = +v; } }
    return L.filter(o => o.name); }
  function laytrans(){
    const S = Object.assign({ fcol: 1, flt: 1, blk: 0, show: 0 }, lsGet(LTS, {}));
    const cnt = {}; for(const e of modelEntities){ const l = e.layer || '0'; cnt[l] = (cnt[l] || 0) + 1; }
    let from = new Set(), to = null, std = [], map = new Map(), msel = null;
    const html = '<div class="acw" style="width:720px"><div class="acw-cols"><div class="c1"><div class="acw-lab">Chuyển từ</div><div class="acw-list" id="tlF" style="height:200px"></div>' +
        K.grp('Bộ lọc chọn', '<div class="acw-row">' + K.txt('tlFlt', '*') + K.btn('tlFs', 'Chọn') + '</div>') + '</div>' +
      '<div class="c2 acw-btncol" style="padding-top:70px">' + K.btn('tlMap', 'Ánh xạ') + K.btn('tlSame', 'Ánh xạ cùng tên') + '</div>' +
      '<div class="c1"><div class="acw-lab">Chuyển sang</div><div class="acw-list" id="tlT" style="height:200px"></div><div class="acw-row" style="margin-top:6px">' + K.btn('tlLoad', 'Nạp…') + K.btn('tlNew', 'Mới…') + '</div></div></div>' +
      K.grp('Ánh xạ chuyển lớp', '<div class="lm-grid" style="height:150px"><table><thead><tr><th>Tên lớp cũ</th><th>Tên lớp mới</th><th>Màu</th><th>Kiểu nét</th><th>Bề rộng nét</th></tr></thead><tbody id="tlM"></tbody></table></div><div class="acw-row" style="margin-top:4px">' + K.btn('tlEd', 'Sửa…') + K.btn('tlRm', 'Bỏ') + '<span class="l"></span>' + K.sel('tlSaved', [['', '(bảng ánh xạ đã lưu)']].concat(Object.keys(lsGet(LTK2, {})).map(n => [n, n])), '') + K.btn('tlSave', 'Lưu…') + '</div>') + '</div>';
    const d = A.dialog({ title: 'Chuyển lớp', cls: 'acw-free', help: 'LAYTRANS', html, okText: 'Chuyển', left: K.btn('tlSet', 'Cài đặt…'), ok: () => { if(!map.size){ say('Chưa có ánh xạ nào.'); return false; } run(); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const props = n => { const s = std.find(x => x.name === n); if(s) return { col: s.aci != null && typeof aciHex === 'function' ? aciHex(s.aci) : null, aci: s.aci, lt: s.lt || 'CONTINUOUS', lw: s.lw > 0 ? s.lw : -3 };
      if(A.layerNames().includes(n)) return { col: A.layerHex(n), aci: A.aciNear ? A.aciNear(A.layerHex(n)) : '', lt: (A.LS.layLT || {})[n] || 'CONTINUOUS', lw: (A.LS.layLW || {})[n] || -3 }; return { col: '#ffffff', aci: 7, lt: 'CONTINUOUS', lw: -3 }; };
    const toList = () => [...new Set(A.layerNames().concat(std.map(s => s.name)))];
    const render = () => { const used = new Set(map.keys()); const F = A.layerNames().filter(n => !used.has(n));
      $('tlF').innerHTML = F.map(n => '<div class="it' + (from.has(n) ? ' on' : '') + '" data-v="' + esc(n) + '"><span class="acw-sw" style="background:' + A.layerHex(n) + '"></span><span translate="no">' + esc(n) + '</span><span style="color:#9aa6ba;margin-left:auto">' + (cnt[n] || 0) + '</span></div>').join('');
      $('tlT').innerHTML = toList().map(n => { const p = props(n); return '<div class="it' + (n === to ? ' on' : '') + '" data-v="' + esc(n) + '"><span class="acw-sw" style="background:' + (p.col || '#fff') + '"></span><span translate="no">' + esc(n) + '</span>' + (std.some(s => s.name === n) ? '<span style="color:#9aa6ba;margin-left:auto">chuẩn</span>' : '') + '</div>'; }).join('');
      $('tlM').innerHTML = [...map.entries()].map(([a, b]) => { const p = Object.assign(props(b.name), b.o || {}); return '<tr data-a="' + esc(a) + '"' + (a === msel ? ' class="sel"' : '') + '><td translate="no">' + esc(a) + '</td><td translate="no">' + esc(b.name) + '</td><td><span class="acw-sw" style="background:' + (p.col || '#fff') + '"></span>' + esc(p.aci == null ? '' : p.aci) + '</td><td translate="no">' + esc(p.lt) + '</td><td>' + (p.lw > 0 ? (p.lw / 100).toFixed(2) + ' mm' : 'Mặc định') + '</td></tr>'; }).join('');
      $('tlEd').disabled = $('tlRm').disabled = !msel; };
    $('tlF').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; const v = it.dataset.v; if(e.ctrlKey || e.metaKey){ if(from.has(v)) from.delete(v); else from.add(v); } else from = new Set([v]); render(); });
    $('tlT').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; to = it.dataset.v; render(); });
    $('tlM').addEventListener('click', e => { const tr = e.target.closest('tr[data-a]'); if(!tr) return; msel = tr.dataset.a; render(); });
    $('tlFs').onclick = () => { const re = wildRe($('tlFlt').value || '*'); from = new Set(A.layerNames().filter(n => re.test(n) && !map.has(n))); render(); };
    $('tlMap').onclick = () => { if(!from.size || !to){ say('Chọn lớp ở "Chuyển từ" và một lớp ở "Chuyển sang".'); return; } for(const f of from) if(f !== to) map.set(f, { name: to }); from.clear(); render(); };
    $('tlSame').onclick = () => { const T = new Set(std.map(s => s.name.toUpperCase())); let n = 0; for(const l of A.layerNames()) if(T.has(l.toUpperCase())){ const s = std.find(x => x.name.toUpperCase() === l.toUpperCase()); map.set(l, { name: s.name }); n++; } if(!n) say('Không có lớp cùng tên trong danh sách chuẩn (bấm Nạp… để nạp lớp chuẩn).'); render(); };
    $('tlLoad').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.dws,.dwg,.dwt,.dxf'; i.onchange = () => { const f = i.files[0]; if(!f) return; stdTablesOf(f).catch(() => null).then(T => { const L = T ? T.LAYER : []; if(!L.length){ say('Không đọc được bảng lớp (cần tệp DWS / DWG / DXF).'); return; } for(const s of L) if(!std.some(x => x.name === s.name)) std.push(s); log('Đã nạp ' + L.length + ' lớp chuẩn từ ' + f.name); render(); }); }; i.click(); };
    $('tlNew').onclick = () => A.dialog({ title: 'Lớp mới', cls: 'acw-free', help: 'LAYTRANS', html: '<div class="acw" style="width:320px">' + K.row('Tên:', K.txt('tnN', '')) + K.row('Kiểu nét:', K.ltSel('tnL', 'CONTINUOUS')) + K.row('Màu:', K.colorSel('tnC', '#ffffff', { noBlock: 1 })) + K.row('Bề rộng nét:', K.lwSel('tnW', '0')) + '</div>', onOpen: r => K.bindColors(r),
      ok: r => { const n = K.val(r, 'tnN').trim(); if(!n){ say('Nhập tên.'); return false; } const c = K.val(r, 'tnC'); std.push({ name: n, aci: A.aciNear ? A.aciNear(c === 'BYLAYER' ? '#ffffff' : c) : 7, lt: K.val(r, 'tnL') || 'CONTINUOUS', lw: +K.val(r, 'tnW') || 0 }); to = n; render(); } });
    $('tlEd').onclick = () => { const b = map.get(msel); if(!b) return; const p = Object.assign(props(b.name), b.o || {});
      A.dialog({ title: 'Sửa lớp', cls: 'acw-free', help: 'LAYTRANS', html: '<div class="acw" style="width:320px">' + K.row('Tên:', K.txt('teN', b.name)) + K.row('Kiểu nét:', K.ltSel('teL', p.lt)) + K.row('Màu:', K.colorSel('teC', p.col || '#ffffff', { noBlock: 1 })) + K.row('Bề rộng nét:', K.lwSel('teW', String(p.lw > 0 ? p.lw : 0))) + '</div>', onOpen: r => K.bindColors(r),
        ok: r => { const n = K.val(r, 'teN').trim() || b.name; const c = K.val(r, 'teC'); map.set(msel, { name: n, o: { col: c === 'BYLAYER' ? null : c, aci: A.aciNear ? A.aciNear(c === 'BYLAYER' ? '#ffffff' : c) : '', lt: K.val(r, 'teL') || 'CONTINUOUS', lw: +K.val(r, 'teW') || -3 } }); render(); } }); };
    $('tlRm').onclick = () => { map.delete(msel); msel = null; render(); };
    $('tlSaved').onchange = () => { const m = lsGet(LTK2, {})[$('tlSaved').value]; if(!m) return; map = new Map(); for(const [a, b] of Object.entries(m)) if(A.layerNames().includes(a)) map.set(a, typeof b === 'string' ? { name: b } : b); render(); };
    $('tlSave').onclick = async () => { const n = await askText({ title: 'Lưu bảng ánh xạ', value: $('tlSaved').value || 'Chuẩn lớp' }); const t = n && n.trim(); if(!t) return; const all = lsGet(LTK2, {}); const o = {}; for(const [a, b] of map) o[a] = b; all[t] = o; lsSet(LTK2, all); say('Đã lưu bảng "' + t + '"'); };
    $('tlSet').onclick = () => A.dialog({ title: 'Cài đặt chuyển lớp', cls: 'acw-free', help: 'LAYTRANS', html: '<div class="acw" style="width:360px">' + K.chk('tsC', 'Đổi màu đối tượng về BYLAYER', S.fcol) + '<br>' + K.chk('tsL', 'Đổi kiểu nét đối tượng về BYLAYER', S.flt) + '<br>' + K.chk('tsB', 'Chuyển cả đối tượng trong khối', S.blk, { dis: 1 }) + '<br>' + K.chk('tsW', 'Ghi nhật ký chuyển lớp', 0, { dis: 1 }) + '<br>' + K.chk('tsS', 'Hiện nội dung lớp khi chọn', S.show) + '</div>',
      ok: r => { S.fcol = K.on(r, 'tsC') ? 1 : 0; S.flt = K.on(r, 'tsL') ? 1 : 0; S.show = K.on(r, 'tsS') ? 1 : 0; lsSet(LTS, S); } });
    function run(){ const rep = [], moved = new Set();
      for(const [a, b] of map){ const n = b.name; const p = Object.assign(props(n), b.o || {}); if(!A.layerNames().includes(n)) A.addLayer(n, p.col || A.layerHex(a)); else if(b.o && b.o.col) A.setLayerColor(n, b.o.col);
        if(std.some(s => s.name === n) || b.o){ if(p.col && A.layerHex(n) !== p.col && A.setLayerColor) A.setLayerColor(n, p.col); if(p.lt && A.setLayerLT){ if(p.lt !== 'CONTINUOUS' && A.loadLT) A.loadLT(p.lt); A.setLayerLT(n, p.lt); } if(p.lw > 0 && A.setLayerLW) A.setLayerLW(n, p.lw); }
        moved.add(a); }
      for(const e of modelEntities){ if(!e || e.xr) continue; const L = e.layer || '0'; if(!moved.has(L)) continue; const n = map.get(L).name; const w = deep(e); delete w.userAdded; w.layer = n; if(S.fcol){ w.bl = 1; w.col = A.layerHex(n); } else if(w.bl) w.col = A.layerHex(n); if(S.flt) delete w.lt; rep.push([e, w]); }
      if(rep.length) A.commit({ rep }, 'LAYTRANS: ' + rep.length + ' đối tượng'); for(const l of moved) if(l !== '0'){ try{ A.deleteLayer(l); }catch(_){} }
      log('LAYTRANS: chuyển ' + rep.length + ' đối tượng từ ' + moved.size + ' lớp.'); }
    render();
  }
  plain(['LAYTRANS'], 'Chuyển lớp (Layer Translator): ánh xạ lớp sang lớp chuẩn (nạp từ DXF), đổi màu / kiểu nét về BYLAYER, lưu bảng ánh xạ', () => { if(A.busy && A.busy()) A.cancel(true); laytrans(); });

  /* ==================================================================
     LAYWALK — LayerWalk (như AutoCAD): chọn lớp để chỉ hiện các lớp đó, giữ lớp (*), lọc, chọn đối tượng, dọn lớp trống, khôi phục khi thoát
     ================================================================== */
  function laywalk(){
    if(A.hasDoc && !A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const names = A.layerNames(), S0 = A.layerState ? A.layerState.snap() : null, cnt = {}; for(const e of modelEntities){ const l = e.layer || '0'; cnt[l] = (cnt[l] || 0) + 1; }
    let sel = new Set([A.LS.cur]), hold = new Set(), anchor = A.LS.cur, flt = '*', useF = false;
    const show = () => { const keep = new Set([...sel, ...hold]); try{ hiddenUserLayers.clear(); for(const n of names) if(!keep.has(n)) hiddenUserLayers.add(n); invalidateSnap(); forceRedraw(); }catch(_){ try{ draw(); }catch(__){} } };
    const back = () => { if(S0 && A.layerState) A.layerState.apply(S0); else { try{ hiddenUserLayers.clear(); for(const n of A.LS.off) hiddenUserLayers.add(n); for(const n of A.LS.frozen) hiddenUserLayers.add(n); forceRedraw(); }catch(_){} } };
    const html = '<div class="acw" style="width:300px"><div class="acw-row">' + K.chk('lwF', 'Lọc', 0) + K.txt('lwFt', '*') + '</div><div class="acw-list" id="lwL" style="height:320px" tabindex="0"></div>' +
      '<div class="acw-row" style="margin-top:6px">' + K.btn('lwSel', 'Chọn đối tượng <') + K.btn('lwPg', 'Dọn lớp') + '</div><div>' + K.chk('lwRe', 'Khôi phục khi thoát', 1) + '</div></div>';
    const d = A.dialog({ title: 'Duyệt lớp - Các lớp: ' + names.length, cls: 'acw-free', help: 'LAYWALK', html, noOk: true, cancelText: 'Đóng', modeless: true,
      cancel: () => { if(K.on(root, 'lwRe')) back(); else if(A.layerState){ const S = A.layerState.snap(); const keep = new Set([...sel, ...hold]); S.off = names.filter(n => !keep.has(n) && !(S.fz || []).includes(n)); if(!keep.has(S.cur)) S.cur = [...keep][0] || S.cur; A.layerState.apply(S); } } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const vis = () => { const re = wildRe(flt || '*'); return names.filter(n => !useF || re.test(n)); };
    const render = () => { const L = vis(); $('lwL').innerHTML = L.map(n => '<div class="it' + (sel.has(n) ? ' on' : '') + '" data-v="' + esc(n) + '"><span style="width:10px">' + (hold.has(n) ? '*' : '') + '</span><span translate="no">' + esc(n) + '</span><span style="color:#9aa6ba;margin-left:auto">' + (cnt[n] || 0) + '</span></div>').join(''); d.root.querySelector('h3').textContent = 'Duyệt lớp - Các lớp: ' + L.length; show(); };
    $('lwL').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; const v = it.dataset.v, L = vis();
      if(e.shiftKey && anchor){ const a = L.indexOf(anchor), b = L.indexOf(v); sel = new Set(L.slice(Math.min(a, b), Math.max(a, b) + 1)); } else if(e.ctrlKey || e.metaKey){ if(sel.has(v)) sel.delete(v); else sel.add(v); anchor = v; } else { sel = new Set([v]); anchor = v; } render(); });
    $('lwL').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; const v = it.dataset.v; if(hold.has(v)) hold.delete(v); else hold.add(v); render(); });
    $('lwL').addEventListener('keydown', e => { if(e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault(); const L = vis(); let i = L.indexOf(anchor); i = Math.max(0, Math.min(L.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); anchor = L[i]; sel = new Set([anchor]); render(); const it = $('lwL').querySelector('.it.on'); if(it) it.scrollIntoView({ block: 'nearest' }); });
    $('lwL').addEventListener('contextmenu', e => { e.preventDefault(); if(!A.acwMenu) return; const L = vis(); A.acwMenu(e.clientX, e.clientY, [['Giữ chọn', () => { for(const n of sel) hold.add(n); render(); }], ['Bỏ giữ', () => { for(const n of sel) hold.delete(n); render(); }], ['Bỏ giữ tất cả', () => { hold.clear(); render(); }], null,
      ['Chọn tất cả', () => { sel = new Set(L); render(); }], ['Bỏ chọn tất cả', () => { sel.clear(); render(); }], ['Đảo chọn', () => { sel = new Set(L.filter(n => !sel.has(n))); render(); }], ['Chọn lớp không dùng', () => { sel = new Set(L.filter(n => !cnt[n])); render(); }], null,
      ['Lưu trạng thái lớp…', async () => { const n = await askText({ title: 'Tên trạng thái lớp', value: 'LayerWalk' }); if(n && n.trim() && A.layerState){ A.layerState.save(n.trim()); log('Đã lưu trạng thái lớp "' + n.trim() + '".'); } }]]); });
    $('lwF').onchange = () => { useF = $('lwF').checked; render(); }; $('lwFt').addEventListener('input', () => { flt = $('lwFt').value; if(useF) render(); });
    $('lwSel').onclick = () => { root.style.display = 'none'; A.run('LAYWALK', async () => { const s = await A.getSel('Chọn đối tượng để chọn lớp của chúng'); const L = [...new Set((s.sel || []).map(e => e.layer || '0'))]; if(L.length) sel = new Set(L); }).finally(() => { root.style.display = ''; render(); }); };
    $('lwPg').onclick = () => { const L = [...sel].filter(n => !cnt[n] && n !== '0' && n !== A.LS.cur); if(!L.length){ say('Chỉ dọn được lớp không có đối tượng (không phải lớp 0 / lớp hiện hành).'); return; } let k = 0; for(const n of L){ const r = A.deleteLayer(n); if(!r){ k++; const i = names.indexOf(n); if(i >= 0) names.splice(i, 1); sel.delete(n); } } log('LAYWALK: đã dọn ' + k + ' lớp.'); render(); };
    render();
  }
  plain(['LAYWALK'], 'Duyệt lớp (LayerWalk): chỉ hiện các lớp đang chọn, giữ lớp, lọc, chọn theo đối tượng, dọn lớp trống', () => laywalk());

  /* ==================================================================
     PUBLISH — Publish (như AutoCAD): danh sách trang, thêm / bỏ / lên / xuống, xem trước, xuất PDF nhiều trang
     ================================================================== */
  function publishDlg(){
    if(!A.plotRender || typeof canvasesToPDF !== 'function'){ say('Chưa sẵn sàng.'); return; }
    let all = (typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).map((l, i) => ({ i, name: l.isModel ? 'Model' : l.name, model: !!l.isModel })); const noLay = !all.length; if(noLay) all = [{ i: -1, name: 'Model', model: true }];   // bản vẽ chưa có layout: in Model
    const goLay = i => { if(i >= 0) switchLayout(i); };
    const dn = String((typeof currentName === 'string' && currentName) || 'Drawing').replace(/\.[^.]+$/, ''), PK = 'dvd:publish::' + dn;
    let L = lsGet(PK, null); L = Array.isArray(L) && L.length ? L.filter(x => all.some(a => a.i === x.i)) : all.filter(a => !a.model || all.length === 1).map(a => ({ i: a.i })); let sel = 0;
    const O = Object.assign({ open: 1, stamp: 0, copies: 1 }, lsGet('dvd:pubopt', {}));
    const html = '<div class="acw" style="width:640px"><div class="acw-row"><span class="l">Danh sách trang:</span>' + K.btn('pbLd', 'Nạp danh sách') + K.btn('pbSv', 'Lưu danh sách') + '<span class="l"></span><span>Xuất ra:</span>' + K.sel('pbTo', [['pdf', 'PDF'], ['dwfx', 'DWFx'], ['plot', 'Máy in theo thiết lập trang']], 'pdf') + '</div>' +
      '<div class="acw-cols"><div class="c1"><div class="lm-grid" style="height:240px"><table><thead><tr><th>Tên trang</th><th>Thiết lập trang</th><th>Trạng thái</th></tr></thead><tbody id="pbB"></tbody></table></div></div>' +
      '<div class="c2 acw-btncol">' + K.btn('pbAdd', 'Thêm trang…') + K.btn('pbRm', 'Bỏ trang') + K.btn('pbUp', 'Lên') + K.btn('pbDn', 'Xuống') + K.btn('pbPv', 'Xem trước') + '</div></div>' +
      '<div class="acw-cols"><div class="c1">' + K.grp('Tuỳ chọn', K.row('Số bản:', K.num('pbCp', 1, { dis: 1 })) + K.chk('pbSt', 'Kèm dấu in (plot stamp)', O.stamp) + '<br>' + K.chk('pbOp', 'Mở tệp PDF khi xong', O.open) + '<br>' + K.chk('pbBg', 'Xuất ngầm', 0, { dis: 1 })) + '</div>' +
      '<div class="c1">' + K.grp('Chi tiết', '<div id="pbDt" class="acw-note"></div>') + '</div></div></div>';
    const d = A.dialog({ title: 'Xuất bản', cls: 'acw-free', help: 'PUBLISH', html, okText: 'Xuất bản', ok: r => { if(!L.length){ say('Danh sách trang trống.'); return false; } O.open = K.on(r, 'pbOp') ? 1 : 0; O.stamp = K.on(r, 'pbSt') ? 1 : 0; lsSet('dvd:pubopt', O); run(); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const nm = x => dn + '-' + (all.find(a => a.i === x.i) || {}).name;
    const render = () => { sel = Math.max(0, Math.min(L.length - 1, sel)); $('pbB').innerHTML = L.map((x, k) => '<tr data-k="' + k + '"' + (k === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(nm(x)) + '</td><td>&lt;Mặc định: theo PLOT&gt;</td><td>✓ Không có lỗi</td></tr>').join('') || '<tr><td colspan="3" style="color:#9aa6ba">Chưa có trang — bấm Thêm trang…</td></tr>';
      $('pbDt').textContent = L[sel] ? 'Trang: ' + nm(L[sel]) + ' · Layout: ' + (all.find(a => a.i === L[sel].i) || {}).name : ''; ['pbRm', 'pbUp', 'pbDn', 'pbPv'].forEach(id => { $(id).disabled = !L.length; }); };
    $('pbB').addEventListener('click', e => { const tr = e.target.closest('tr[data-k]'); if(tr){ sel = +tr.dataset.k; render(); } });
    $('pbAdd').onclick = () => { const miss = all.filter(a => !L.some(x => x.i === a.i)); if(!miss.length){ say('Mọi layout đã có trong danh sách.'); return; } const pick = new Set(miss.filter(a => !a.model).map(a => a.i));
      A.dialog({ title: 'Thêm trang', cls: 'acw-free', help: 'PUBLISH', html: '<div class="acw" style="width:300px">' + miss.map(a => K.chk('pa' + a.i, a.name, pick.has(a.i))).join('<br>') + '</div>', ok: r => { for(const a of miss) if(K.on(r, 'pa' + a.i)) L.push({ i: a.i }); render(); } }); };
    $('pbRm').onclick = () => { L.splice(sel, 1); render(); };
    $('pbUp').onclick = () => { if(sel > 0){ [L[sel - 1], L[sel]] = [L[sel], L[sel - 1]]; sel--; render(); } };
    $('pbDn').onclick = () => { if(sel < L.length - 1){ [L[sel + 1], L[sel]] = [L[sel], L[sel + 1]]; sel++; render(); } };
    $('pbSv').onclick = () => { lsSet(PK, L); say('Đã lưu danh sách trang.'); };
    $('pbLd').onclick = () => { const v = lsGet(PK, null); if(!Array.isArray(v)){ say('Chưa lưu danh sách trang cho bản vẽ này.'); return; } L = v.filter(x => all.some(a => a.i === x.i)); render(); };
    $('pbPv').onclick = async () => { const x = L[sel]; if(!x) return; const cur = currentLayout; try{ goLay(x.i); await new Promise(r => setTimeout(r, 60)); const r = A.plotRender(80, false); const url = r.canvas.toDataURL('image/png');
        A.dialog({ title: 'Xem trước — ' + nm(x), cls: 'acw-free', help: 'PUBLISH', noCancel: true, html: '<div class="acw" style="width:min(760px,90vw)"><img src="' + url + '" style="max-width:100%;max-height:70vh;background:#fff;display:block;margin:auto"></div>' }); }catch(err){ say('Không xem trước được: ' + (err.message || err)); } finally{ if(!noLay) switchLayout(cur); } };
    async function run(){ if($('pbTo').value === 'plot'){ setTimeout(() => DVDCmd.run('PLOT'), 0); return; } const cur = currentLayout, pages = []; say('Đang xuất bản ' + L.length + ' trang…');
      const dw = $('pbTo').value === 'dwfx' && !!A.dwfxBuild, vec = dw ? 'xps' : !!A.pdfBuild;   // PDF vector (như DWG To PDF) hoặc DWFx nhiều trang (mỗi layout một trang ePlot)
      try{ for(const x of L){ goLay(x.i); await new Promise(r => setTimeout(r, 60)); const r = A.plotRender(200, false, vec);
          if(O.stamp){ try{ const g = r.canvas.getContext('2d'); g.save(); g.fillStyle = '#000'; g.font = Math.round(r.canvas.height / 90) + 'px sans-serif'; g.fillText(nm(x) + ' · ' + new Date().toLocaleString() + ' · DVDCAD', 12, r.canvas.height - 12); g.restore(); }catch(_){} }
          if(dw){ pages.push({ ctx: r.xps, Wmm: r.Wmm, Hmm: r.Hmm, title: nm(x) }); continue; }
          pages.push(r.pdf ? { ctx: r.pdf } : { canvas: r.canvas, pagePt: r.pagePt }); }
        const blob = dw ? await A.dwfxBuild(pages, { title: dn }) : vec ? await A.pdfBuild(pages, { title: dn, version: A.version || '' }) : await canvasesToPDF(pages); const fn = dn + (dw ? '.dwfx' : '.pdf'); if(O.open && !dw){ try{ window.open(URL.createObjectURL(blob), '_blank'); }catch(_){} } await shareOrDownload(blob, fn, dw ? 'model/vnd.dwfx+xps' : 'application/pdf'); log('PUBLISH: ' + pages.length + ' trang → ' + fn); lsSet(PK, L);
      }catch(err){ console.error(err); say('Không xuất bản được: ' + (err.message || err)); } finally{ if(!noLay) switchLayout(cur); } }
    render();
  }
  plain(['PUBLISH', 'BATCHPLOT', 'INHANGLOAT'], 'Xuất bản (Publish): danh sách trang (layout), sắp xếp, xem trước, xuất PDF nhiều trang', () => { if(A.busy && A.busy()) A.cancel(true); publishDlg(); });

  /* ==================================================================
     DDVPOINT — Viewpoint Presets (như AutoCAD): 2 vòng chọn góc (từ trục X / so với mặt XY), Đặt về mặt bằng
     ================================================================== */
  plain(['DDVPOINT', 'VP'], 'Hướng nhìn đặt sẵn (Viewpoint Presets): góc từ trục X và góc so với mặt phẳng XY', () => {
    const M = A.MEM || {}; let az = M.ddvA != null ? M.ddvA : 270, el = M.ddvE != null ? M.ddvE : 90;
    const html = '<div class="acw" style="width:440px">' + K.grp('Đặt góc nhìn', K.rad('dvR', 'w', 'Tuyệt đối theo WCS', 1) + K.rad('dvR', 'u', 'Tương đối theo UCS', 0, { dis: 1 })) +
      '<div style="display:flex;gap:12px;justify-content:center">' + K.canvas('dvC1', 190, 190) + K.canvas('dvC2', 190, 190) + '</div>' +
      '<div class="acw-row"><span class="l">Từ: trục X:</span>' + K.num('dvA', az) + '<span class="l" style="text-align:right">Mặt XY:</span>' + K.num('dvE', el) + '</div><div style="text-align:center;margin-top:6px">' + K.btn('dvPlan', 'Đặt về mặt bằng') + '</div></div>';
    const d = A.dialog({ title: 'Hướng nhìn đặt sẵn', cls: 'acw-free', help: 'DDVPOINT', html, ok: r => { const a = num(K.val(r, 'dvA')), e = num(K.val(r, 'dvE')); if(a == null || e == null) return false; M.ddvA = a; M.ddvE = e; if(A.view3) A.view3(a, e).then(ok => ok && log('DDVPOINT: ' + a + '° / ' + e + '°')); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const dial = (cnv, kind) => { const dd = Math.min(3, devicePixelRatio || 1), w = 190; cnv.width = w * dd; cnv.height = w * dd; const g = cnv.getContext('2d'); g.setTransform(dd, 0, 0, dd, 0, 0); g.clearRect(0, 0, w, w); g.fillStyle = '#1b2230'; g.fillRect(0, 0, w, w);
      const c = w / 2, R = 78; g.strokeStyle = '#8b97aa'; g.fillStyle = '#cfd6e0'; g.font = '10px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 1;
      if(kind === 'a'){ g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(c, c, R * 0.6, 0, Math.PI * 2); g.stroke(); for(let k = 0; k < 360; k += 45){ const t = -k * Math.PI / 180; g.beginPath(); g.moveTo(c + Math.cos(t) * R * 0.6, c + Math.sin(t) * R * 0.6); g.lineTo(c + Math.cos(t) * R, c + Math.sin(t) * R); g.stroke(); g.fillText(String(k), c + Math.cos(t) * (R + 9), c + Math.sin(t) * (R + 9)); }
        const t = -az * Math.PI / 180; g.strokeStyle = '#ff5a5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(t) * R, c + Math.sin(t) * R); g.stroke(); }
      else { const cx = 40; g.beginPath(); g.arc(cx, c, R + 30, -Math.PI / 2, Math.PI / 2); g.stroke(); for(const k of [-90, -60, -45, -30, -10, 0, 10, 30, 45, 60, 90]){ const t = -k * Math.PI / 180; g.beginPath(); g.moveTo(cx + Math.cos(t) * (R + 10), c + Math.sin(t) * (R + 10)); g.lineTo(cx + Math.cos(t) * (R + 30), c + Math.sin(t) * (R + 30)); g.stroke(); g.fillText(String(k), cx + Math.cos(t) * (R + 42), c + Math.sin(t) * (R + 42)); }
        const t = -el * Math.PI / 180; g.strokeStyle = '#ff5a5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, c); g.lineTo(cx + Math.cos(t) * (R + 30), c + Math.sin(t) * (R + 30)); g.stroke(); } };
    const paint = () => { dial($('dvC1'), 'a'); dial($('dvC2'), 'e'); };
    const snapTo = (v, L) => L.reduce((b, x) => Math.abs(x - v) < Math.abs(b - v) ? x : b, L[0]);
    $('dvC1').addEventListener('click', e => { const r = e.target.getBoundingClientRect(); const x = e.clientX - r.left - 95, y = e.clientY - r.top - 95; let a = (-Math.atan2(y, x) * 180 / Math.PI + 360) % 360; const rr = Math.hypot(x, y); if(rr < 78 * 0.6) a = snapTo(a, [0, 45, 90, 135, 180, 225, 270, 315, 360]) % 360; else a = Math.round(a * 10) / 10; az = a; $('dvA').value = r6(az); paint(); });
    $('dvC2').addEventListener('click', e => { const r = e.target.getBoundingClientRect(); const x = e.clientX - r.left - 40, y = e.clientY - r.top - 95; let a = -Math.atan2(y, Math.max(1e-6, x)) * 180 / Math.PI; a = Math.max(-90, Math.min(90, a)); const rr = Math.hypot(x, y); if(rr > 78 + 10) a = snapTo(a, [-90, -60, -45, -30, -10, 0, 10, 30, 45, 60, 90]); else a = Math.round(a * 10) / 10; el = a; $('dvE').value = r6(el); paint(); });
    $('dvA').addEventListener('input', () => { const v = num($('dvA').value); if(v != null){ az = v; paint(); } }); $('dvE').addEventListener('input', () => { const v = num($('dvE').value); if(v != null){ el = v; paint(); } });
    $('dvPlan').onclick = () => { az = 270; el = 90; $('dvA').value = 270; $('dvE').value = 90; paint(); };
    paint();
  });

  /* ==================================================================
     Tệp .lin: đọc kiểu nét đơn giản (A,…) để tải từ tệp riêng (Load or Reload Linetypes → Tệp…)
     ================================================================== */
  A.parseLin = function(txt){ const out = []; let cur = null; for(const raw of String(txt).split(/\r?\n/)){ const ln = raw.replace(/;;.*$/, '').trim(); if(!ln) continue;
      if(ln[0] === '*'){ const m = /^\*([^,]+),?(.*)$/.exec(ln); cur = m ? { name: m[1].trim().toUpperCase(), desc: (m[2] || '').trim() } : null; continue; }
      if(cur && /^A\s*,/i.test(ln)){ const pat = ln.replace(/^A\s*,/i, '').replace(/\[[^\]]*\]/g, '').split(',').map(s => parseFloat(s)).filter(v => isFinite(v)); if(pat.length){ cur.pat = pat; cur.cx = /\[/.test(ln); out.push(cur); } cur = null; } }
    return out; };
  A.defineLT = function(d){ try{ LTYPES[d.name] = { name: d.name, desc: d.desc, pat: d.pat }; A.LS.ltd[d.name] = LTYPES[d.name]; A.lsSave(); try{ draw(); }catch(_){} return true; }catch(_){ return false; } };
  /* ==================================================================
     HATCH (v5p): gốc mẫu (HATCHSETORIGIN, HPORIGIN), thứ tự vẽ, biến HP… như AutoCAD
     ================================================================== */
  const bbLoops = L => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const lp of L || []) for(const p of lp){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
  const extOrg = (L, k) => { const b = bbLoops(L); if(!b) return null; return k === 'br' ? { x: b.x1, y: b.y0 } : k === 'tr' ? { x: b.x1, y: b.y1 } : k === 'tl' ? { x: b.x0, y: b.y1 } : k === 'c' ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : { x: b.x0, y: b.y0 }; };
  A.hatchOrigin = function(loops, S){ const H = S || A.HS || {}; if(H.orgMode === 'set'){ if(H.orgExt) return extOrg(loops, H.orgExt); if(H.org) return { x: H.org.x, y: H.org.y }; } return H.org0 ? { x: H.org0.x, y: H.org0.y } : null; };
  function dordFor(e, k){ if(!k || k === 'none' || k === 'behind') return; let mn = 0, mx = 0; for(const x of modelEntities){ const d = x.dord | 0; if(d < mn) mn = d; if(d > mx) mx = d; }
    if(k === 'back') e.dord = mn - 1; else if(k === 'front') e.dord = mx + 1;
    else if(k === 'infront'){ const b = bbLoops(e.loops); let m = 0; if(b && A.queryBox) for(const x of A.queryBox(b.x0, b.y0, b.x1, b.y1, 2000)) if(x !== e && x.type !== 'HATCH') m = Math.max(m, x.dord | 0); e.dord = m + 1; } }
  A.hatchDrawOrder = e => dordFor(e, (A.HS && A.HS.dord) || 'behind');
  { const _ae = A.applyHatchEdit; A.applyHatchEdit = function(list, R){
      if(!R || R.gmode) return _ae.apply(this, arguments);
      const L = list.filter(e => !A.isLocked(e)); const reassoc = R.assoc && L.some(e => !e.hassoc);
      const out = L.map(e => { const w = deep(e); delete w.userAdded; delete w.grad;
        if(R.pat === '_USER'){ w.pat = '_USER'; w.solid = false; w.usp = R.usp; if(R.udbl) w.udbl = 1; else delete w.udbl; w.psc = 1; } else { w.pat = R.pat; w.solid = R.pat === 'SOLID'; delete w.usp; delete w.udbl; w.psc = R.scale > 0 ? R.scale : (e.psc || 1); }
        w.pang = R.ang || 0; if(R.col){ w.col = R.col; delete w.bl; } else { w.bl = 1; w.col = A.layerHex(w.layer || '0'); }
        const o = R.orgMode === 'set' ? (R.orgExt ? extOrg(w.loops, R.orgExt) : R.org) : (A.HS && A.HS.org0) || null; if(o) w.porg = { x: o.x, y: o.y }; else delete w.porg;
        if(R.anno) w.hanno = 1; else delete w.hanno; if(!R.assoc){ delete w.hassoc; w.nassoc = 1; } else delete w.nassoc;
        if(R.dord && R.dord !== 'none') dordFor(w, R.dord); return w; });
      if(!out.length) return 0;
      // bật lại "Liên kết biên": xoá rồi thêm để lõi gắn lại hatch với đường biên trùng khớp
      if(reassoc){ for(const w of out) delete w.hassoc; A.commit({ del: L, add: out }, 'Đã sửa ' + out.length + ' hatch'); }
      else A.commit({ rep: L.map((e, i) => [e, out[i]]) }, 'Đã sửa ' + out.length + ' hatch');
      return out.length; }; }
  ecmd(['HATCHSETORIGIN', 'HSO'], 'Đặt gốc mẫu của hatch đã chọn (Hatch Origin)', async (_, cur) => {
    let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = [];
    if(!sel){ const s = await A.getSel('Chọn hatch', { filter: e => e.type === 'HATCH' }); sel = s.sel || []; } const L = sel.filter(e => e.type === 'HATCH' && !A.isLocked(e) && !e.solid); if(!L.length){ log('Chưa chọn hatch có mẫu.'); return; }
    const r = await A.getPoint('Chỉ định gốc hatch mới hoặc', { kw: [{ k: 'BL', t: 'Dưới trái' }, { k: 'BR', t: 'Dưới phải' }, { k: 'TR', t: 'Trên phải' }, { k: 'TL', t: 'Trên trái' }, { k: 'C', t: 'Tâm' }] }); if(!r.pt && !r.kw) return;
    const rep = L.map(e => { const w = deep(e); delete w.userAdded; const o = r.pt ? r.pt : extOrg(w.loops, r.kw.toLowerCase()); if(o) w.porg = { x: o.x, y: o.y }; return [e, w]; });
    A.commit({ rep }, 'HATCHSETORIGIN: đã đặt gốc cho ' + rep.length + ' hatch'); });
  if(A.sysvar && A.sysvar.def && A.HS){ const HS = A.HS, sv = () => { if(A.hsSave) A.hsSave(); };
    A.sysvar.def('HPORIGIN', { d: 'Gốc mẫu hatch mặc định (x,y)', s: 1, get: () => HS.org0 ? r6(HS.org0.x) + ',' + r6(HS.org0.y) : '0,0', set: v => { const m = String(v).split(/[,;\s]+/).map(Number); if(m.length >= 2 && m.every(isFinite)){ HS.org0 = (m[0] || m[1]) ? { x: m[0], y: m[1] } : null; sv(); } } });
    A.sysvar.def('HPNAME', { d: 'Mẫu hatch mặc định (SOLID, ANSI31, _USER…)', s: 1, get: () => HS.pat, set: v => { const n = String(v).trim().toUpperCase(); if(A.PATS && A.PATS[n]){ HS.pat = n; HS.gmode = 0; sv(); } else log('Không có mẫu ' + n + '.'); } });
    A.sysvar.def('HPSCALE', { d: 'Tỉ lệ mẫu hatch mặc định (0 = tự chọn)', get: () => HS.scale || 0, set: v => { if(+v >= 0){ HS.scale = +v; sv(); } } });
    A.sysvar.def('HPANG', { d: 'Góc mẫu hatch mặc định (độ)', get: () => HS.ang || 0, set: v => { if(isFinite(+v)){ HS.ang = +v; sv(); } } });
    A.sysvar.def('HPSPACE', { d: 'Khoảng cách mẫu hatch tự định nghĩa (_USER)', get: () => HS.usp || 1, set: v => { if(+v > 0){ HS.usp = +v; sv(); } } });
    A.sysvar.def('HPDOUBLE', { d: 'Mẫu tự định nghĩa hai chiều (0/1)', get: () => HS.udbl ? 1 : 0, set: v => { HS.udbl = +v ? 1 : 0; sv(); } });
    A.sysvar.def('HPASSOC', { d: 'Hatch mới liên kết với biên (0/1)', get: () => HS.noassoc ? 0 : 1, set: v => { HS.noassoc = +v ? 0 : 1; sv(); } });
    A.sysvar.def('HPANNOTATIVE', { d: 'Hatch mới là chú thích theo tỉ lệ (0/1)', get: () => HS.anno ? 1 : 0, set: v => { HS.anno = +v ? 1 : 0; sv(); } });
    A.sysvar.def('HPSEPARATE', { d: 'Tạo hatch riêng cho từng vùng khi chọn nhiều đối tượng kín (0/1)', get: () => HS.sep ? 1 : 0, set: v => { HS.sep = +v ? 1 : 0; sv(); } });
    A.sysvar.def('HPDRAWORDER', { d: 'Thứ tự vẽ hatch mới (0 không gán, 1 dưới cùng, 2 trên cùng, 3 sau biên, 4 trước biên)', get: () => ['none', 'back', 'front', 'behind', 'infront'].indexOf(HS.dord || 'behind'), set: v => { const k = ['none', 'back', 'front', 'behind', 'infront'][+v | 0]; if(k){ HS.dord = k; sv(); } } }); }
  /* ==================================================================
     TINSERT — Insert a Block in a Table Cell (như AutoCAD): tên khối, xem trước, tỉ lệ / tự khớp, góc, căn lề ô
     ================================================================== */
  ecmd(['TINSERT'], 'Chèn khối vào ô bảng (Insert a Block in a Table Cell): tên khối, tỉ lệ / tự khớp, góc, căn lề', async () => {
    const a = await A.getPoint('Chọn ô bảng'); if(!a.pt) return; const s = tableAtPoint(a.pt); if(!s){ log('Không có ô bảng tại điểm này.'); return; }
    if(!s.c.tbld.tss){ log('Bảng này không theo kiểu bảng — chèn bảng bằng TABLE để chèn khối vào ô.'); return; }
    const key = s.rc.r + ',' + s.rc.c, cur0 = (s.c.tbld.cb || {})[key] || null; const N = blockNames(); if(!N.length){ log('Bản vẽ chưa có khối nào.'); return; }
    const o = await new Promise(res => { let name = cur0 ? cur0.name : N[0];
      const html = '<div class="acw" style="width:460px"><div class="acw-cols"><div class="c1">' + K.row('Tên:', K.sel('tiN', N.map(n => [n, n]), name)) + K.grp('Thuộc tính', K.row('Tỉ lệ:', K.num('tiS', cur0 ? cur0.sc || 1 : 1, { min: 0 })) + K.chk('tiF', 'Tự khớp', cur0 ? !!cur0.fit : 1) + K.row('Góc xoay:', K.num('tiR', cur0 ? cur0.rot || 0 : 0)) +
          K.row('Căn lề trong ô:', K.sel('tiA', [['', '(theo kiểu ô)']].concat(AL), cur0 ? cur0.al || '' : ''))) + '</div><div class="c2"><div class="acw-lab">Xem trước</div>' + K.canvas('tiP', 150, 120) + '</div></div></div>';
      const d = A.dialog({ title: 'Chèn khối vào ô bảng', cls: 'acw-free', help: 'TINSERT', html, left: cur0 ? K.btn('tiDel', 'Bỏ khối khỏi ô') : '',
        ok: r => { const sc = num(K.val(r, 'tiS')); res({ name: K.val(r, 'tiN'), sc: sc > 0 ? sc : 1, fit: K.on(r, 'tiF') ? 1 : 0, rot: num(K.val(r, 'tiR')) || 0, al: K.val(r, 'tiA') || '' }); }, cancel: () => res(null) });
      const root = d.root, $ = id => root.querySelector('#' + id);
      const pv = () => { let L = []; try{ L = A.instBlock($('tiN').value, srcOf($('tiN').value), { x: 0, y: 0 }, 1, num($('tiR').value) || 0); }catch(_){} K.paint($('tiP'), L.map(e => { e.col = e.col || '#cfd6e0'; return e; })); $('tiS').disabled = $('tiF').checked; };
      root.addEventListener('change', pv); root.addEventListener('input', pv); pv();
      if(cur0) $('tiDel').onclick = () => { d.close(); res({ del: 1 }); }; });
    if(!o) return;
    const w = deep(s.c); delete w.userAdded; const T = w.tbld; T.cb = T.cb || {};
    if(o.del){ delete T.cb[key]; if(!Object.keys(T.cb).length) delete T.cb; A.commit({ rep: [[s.c, w]] }, 'Đã bỏ khối khỏi ô ' + String.fromCharCode(65 + (s.rc.c % 26)) + (s.rc.r + 1)); return; }
    T.cb[key] = { name: o.name, src: srcOf(o.name), sc: o.sc, fit: o.fit, rot: o.rot, al: o.al };
    A.commit({ rep: [[s.c, w]] }, 'TINSERT: khối "' + o.name + '" → ô ' + String.fromCharCode(65 + (s.rc.c % 26)) + (s.rc.r + 1));
  });
  /* ==================================================================
     PLOTSTAMP — Dấu in (Plot Stamp, như AutoCAD): trường dấu in, trường người dùng, tệp tham số, Nâng cao…
     A.plotPost: in lộn ngược (Plot upside-down) và vẽ dấu in lên bản in / xem trước
     ================================================================== */
  const PSK = 'dvd:plotstamp', PLOG = 'dvd:plotlog';
  const PSD = () => ({ fields: { dwg: 1, layout: 1, date: 1, login: 1, device: 1, paper: 0, scale: 0 }, user: [], u1: '', u2: '', loc: 'bl', orient: 'h', ud: 0, ox: 10, oy: 10, rel: 'print', font: 'Arial', h: 2.5, single: 1, units: 'mm', log: 0, file: '' });
  const stampNorm = o => { const d = PSD(); o = o && typeof o === 'object' ? o : {}; return Object.assign(d, o, { fields: Object.assign(d.fields, o.fields || {}), user: Array.isArray(o.user) ? o.user.map(String) : [] }); };
  const stampGet = () => stampNorm(lsGet(PSK, {}));
  A.plotStamp = stampGet;
  const loginName = () => String(lsGet('dvd:login', '') || 'User');
  const SF = [['dwg', 'Tên bản vẽ'], ['layout', 'Tên layout'], ['date', 'Ngày và giờ'], ['login', 'Tên đăng nhập'], ['device', 'Tên thiết bị'], ['paper', 'Khổ giấy'], ['scale', 'Tỉ lệ in']];
  const DEVN = { pdf: 'DWG To PDF.pc3', png: 'PublishToWeb PNG.pc3', print: 'Máy in Windows (hệ thống)' };
  const userLay = () => { try{ return !!(A.curUserLayout && A.curUserLayout()); }catch(_){ return false; } };
  function stampFields(S, R){ const P = A.PS || {}, F = S.fields || {}, out = [];
    let lay = 'Model'; try{ const L = dwgLayouts[currentLayout]; if(L && L.name) lay = L.name; }catch(_){}
    let sc = '1:' + (P.scale || 1); if(userLay()) sc = '1:1'; else if(P.fit && R && R.k > 0){ let mm = 1; try{ mm = unitToMM() || 1; }catch(_){} sc = '1:' + r6(mm / R.k); }
    const pl = ((A.PAPER_SIZES || {})[P.paper] || {}).label || (P.paper === 'custom' ? 'User' : 'ISO ' + (P.paper || 'A3')); const paper = R ? (userLay() ? '' : pl + ' ') + '(' + r6(R.Wmm) + ' x ' + r6(R.Hmm) + ' mm)' : pl;
    let dwg = 'Drawing1.dwg'; try{ if(currentName) dwg = currentName; }catch(_){}
    const V = { dwg, layout: lay, date: new Date().toLocaleString(), login: loginName(), device: ((A.PLOT_DEVICES || []).find(d => d[0] === (P.dev || 'pdf')) || [])[1] || DEVN[P.dev || 'pdf'] || String(P.dev || '').replace(/^sys:/, ''), paper, scale: sc };
    for(const [k] of SF) if(F[k]) out.push(V[k]);
    for(const n of [S.u1, S.u2]) if(n && S.user.includes(n)) out.push(n);
    return out; }
  A.plotStampText = R => stampFields(stampGet(), R).join(', ');
  const toMM = (v, S, pxmm) => { v = +v || 0; return S.units === 'in' ? v * 25.4 : S.units === 'px' ? v / (pxmm || 1) : v; };
  function stampDraw(R, S){ const c = R.canvas, g = c.getContext('2d'), pxmm = c.width / R.Wmm; const F = stampFields(S, R); if(!F.length) return;
    const lines = S.single ? [F.join(', ')] : [F.slice(0, Math.ceil(F.length / 2)).join(', '), F.slice(Math.ceil(F.length / 2)).join(', ')].filter(Boolean);
    const P = A.PS || {}, mg = S.rel === 'paper' || userLay() ? 0 : Math.max(0, +P.margin || 0);
    const hp = Math.max(1, toMM(S.h, S, pxmm) * pxmm), ox = toMM(S.ox, S, pxmm) * pxmm, oy = toMM(S.oy, S, pxmm) * pxmm;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = Math.round(hp) + 'px "' + String(S.font || 'Arial').replace(/"/g, '') + '", Arial, sans-serif'; g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
    const lh = hp * 1.4, bw = Math.max(...lines.map(t => g.measureText(t).width)), bh = lh * (lines.length - 1) + hp * 1.15;
    const vert = S.orient === 'v', W = vert ? bh : bw, H = vert ? bw : bh;
    const x0 = mg * pxmm, y0 = mg * pxmm, x1 = c.width - mg * pxmm, y1 = c.height - mg * pxmm;
    const L = S.loc === 'tl' || S.loc === 'bl', T = S.loc === 'tl' || S.loc === 'tr';
    const bx = L ? x0 + ox : x1 - ox - W, by = T ? y0 + oy : y1 - oy - H;
    g.translate(bx + W / 2, by + H / 2); g.rotate((vert ? -Math.PI / 2 : 0) + (S.ud ? Math.PI : 0));
    lines.forEach((t, i) => g.fillText(t, -bw / 2, -bh / 2 + hp + i * lh));
    g.restore(); }
  function flip180(c){ const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0); const g = c.getContext('2d');
    g.save(); g.setTransform(-1, 0, 0, -1, c.width, c.height); g.drawImage(t, 0, 0); g.restore(); }
  A.plotPost = function(R, forPreview){ const P = A.PS || {}; if(!R || !R.canvas) return;
    if(P.ud) flip180(R.canvas);
    if(P.stamp){ const S = stampGet(); stampDraw(R, S);
      if(S.log && !forPreview){ const L = lsGet(PLOG, []); L.push(stampFields(Object.assign({}, S, { fields: { dwg: 1, layout: 1, date: 1, login: 1, device: 1, paper: 1, scale: 1 }, u1: '', u2: '' }), R).join(', ')); lsSet(PLOG, L.slice(-500)); } } };
  if(A.sysvar && A.sysvar.def) A.sysvar.def('LOGINNAME', { d: 'Tên đăng nhập hiển thị trong dấu in (PLOTSTAMP)', s: 1, get: loginName, set: v => { lsSet('dvd:login', String(v || '').trim()); } });

  const askStr = (title, label, v) => new Promise(res => A.dialog({ title, cls: 'acw-free', help: false, html: '<div class="acw" style="width:320px">' + K.row(label, K.txt('asV', v || '')) + '</div>', ok: r => { const s = String(K.val(r, 'asV') || '').trim(); if(!s) return false; res(s); }, cancel: () => res(null) }));
  function userFieldsDlg(S){ return new Promise(res => { const U = S.user.slice(); let cur = U[0] || '';
    const d = A.dialog({ title: 'Trường do người dùng định nghĩa', cls: 'acw-free', help: 'PLOTSTAMP', html: '<div class="acw" style="width:380px"><div class="acw-cols"><div class="c1">' + K.list('ufL', [], '', 'height:150px') + '</div><div class="c2 acw-btncol">' + K.btn('ufA', 'Thêm') + K.btn('ufE', 'Sửa') + K.btn('ufD', 'Xoá') + '</div></div></div>',
      ok: () => { S.user = U; if(!U.includes(S.u1)) S.u1 = ''; if(!U.includes(S.u2)) S.u2 = ''; res(true); }, cancel: () => res(false) });
    const root = d.root, $ = id => root.querySelector('#' + id), L = $('ufL');
    const render = () => { L.innerHTML = U.map(u => '<div class="it' + (u === cur ? ' on' : '') + '" data-v="' + esc(u) + '">' + esc(u) + '</div>').join(''); $('ufE').disabled = $('ufD').disabled = !U.includes(cur); };
    K.bindList(L, v => { cur = v; render(); }, () => $('ufE').click()); render();
    $('ufA').onclick = async () => { const s = await askStr('Thêm trường người dùng', 'Trường:', ''); if(s && !U.includes(s)){ U.push(s); cur = s; render(); } };
    $('ufE').onclick = async () => { const i = U.indexOf(cur); if(i < 0) return; const s = await askStr('Sửa trường người dùng', 'Trường:', cur); if(s){ U[i] = s; cur = s; render(); } };
    $('ufD').onclick = () => { const i = U.indexOf(cur); if(i < 0) return; U.splice(i, 1); cur = U[Math.min(i, U.length - 1)] || ''; render(); }; }); }
  function stampAdvDlg(S){ return new Promise(res => { const fonts = (A.FONTS || ['Arial']).slice(); if(S.font && !fonts.includes(S.font)) fonts.push(S.font);
    const html = '<div class="acw" style="width:470px">' +
      K.grp('Vị trí và độ dời', '<div class="acw-cols"><div class="c1">' + K.row('Vị trí:', K.sel('saLoc', [['tl', 'Trên trái'], ['bl', 'Dưới trái'], ['br', 'Dưới phải'], ['tr', 'Trên phải']], S.loc)) + K.row('Hướng:', K.sel('saOr', [['h', 'Nằm ngang'], ['v', 'Dọc']], S.orient)) + K.chk('saUd', 'Dấu in lộn ngược', S.ud) + '</div><div class="c1">' +
        K.row('Dời X:', K.num('saX', S.ox)) + K.row('Dời Y:', K.num('saY', S.oy)) + K.rad('saRel', 'print', 'Dời theo vùng in được', S.rel !== 'paper') + '<br>' + K.rad('saRel', 'paper', 'Dời theo mép giấy', S.rel === 'paper') + '</div></div>') +
      K.grp('Thuộc tính chữ', '<div class="acw-cols"><div class="c1">' + K.row('Phông:', K.sel('saF', fonts.map(f => [f, f]), S.font)) + '</div><div class="c1">' + K.row('Cao chữ:', K.num('saH', S.h, { min: 0 })) + '</div></div>' + K.chk('saSg', 'Dấu in một dòng', S.single)) +
      K.grp('Đơn vị dấu in', K.row('Đơn vị:', K.sel('saU', [['mm', 'Milimét'], ['in', 'Inch'], ['px', 'Điểm ảnh (pixel)']], S.units))) +
      K.grp('Vị trí tệp nhật ký', K.chk('saLg', 'Tạo tệp nhật ký', S.log) + '<div class="acw-row">' + K.txt('saLf', 'plot.log', { dis: 1 }) + K.btn('saLd', 'Tải nhật ký…') + K.btn('saLc', 'Xoá nhật ký') + '</div>') + '</div>';
    const d = A.dialog({ title: 'Tuỳ chọn nâng cao', cls: 'acw-free', help: 'PLOTSTAMP', html,
      ok: r => { const h = num(K.val(r, 'saH')); Object.assign(S, { loc: K.val(r, 'saLoc'), orient: K.val(r, 'saOr'), ud: K.on(r, 'saUd') ? 1 : 0, ox: num(K.val(r, 'saX')) || 0, oy: num(K.val(r, 'saY')) || 0, rel: K.radio(r, 'saRel') || 'print', font: K.val(r, 'saF'), h: h > 0 ? h : S.h, single: K.on(r, 'saSg') ? 1 : 0, units: K.val(r, 'saU'), log: K.on(r, 'saLg') ? 1 : 0 }); res(true); }, cancel: () => res(false) });
    const $ = id => d.root.querySelector('#' + id);
    $('saLd').onclick = () => { const L = lsGet(PLOG, []); if(!L.length){ say('Nhật ký in còn trống.'); return; } shareOrDownload(new Blob([L.join('\r\n') + '\r\n'], { type: 'text/plain' }), 'plot.log', 'text/plain'); };
    $('saLc').onclick = () => { lsSet(PLOG, []); say('Đã xoá nhật ký in.'); }; }); }
  function plotStampDlg(){ return new Promise(res => { const S = stampGet();
    const uOpts = () => [['', '(không)']].concat(S.user.map(u => [u, u]));
    const html = '<div class="acw" style="width:560px"><div class="acw-cols"><div class="c1">' +
        K.grp('Trường dấu in', '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px">' + SF.map(([k, t]) => K.chk('pf_' + k, t, S.fields[k])).join('') + '</div>') + '</div>' +
      '<div class="c2"><div class="acw-lab">Xem trước</div><canvas id="psPv" class="acw-prev" width="150" height="110" style="width:150px;height:110px"></canvas></div></div>' +
      K.grp('Trường do người dùng định nghĩa', '<div class="acw-row">' + K.sel('psU1', uOpts(), S.u1) + K.sel('psU2', uOpts(), S.u2) + K.btn('psUE', 'Thêm / Sửa') + '</div>') +
      K.grp('Tệp tham số dấu in', '<div class="acw-row">' + K.txt('psFile', S.file || '(chưa lưu)', { dis: 1 }) + K.btn('psLoad', 'Nạp…') + K.btn('psSave', 'Lưu thành…') + '</div>') +
      '<div class="acw-note" id="psTxt" style="margin-top:4px;white-space:normal"></div></div>';
    const d = A.dialog({ title: 'Dấu in', cls: 'acw-free', help: 'PLOTSTAMP', html, left: K.btn('psAdv', 'Nâng cao…'),
      ok: r => { read(r); lsSet(PSK, S); res(S); }, cancel: () => res(null) });
    const root = d.root, $ = id => root.querySelector('#' + id);
    function read(r){ for(const [k] of SF) S.fields[k] = K.on(r, 'pf_' + k) ? 1 : 0; S.u1 = K.val(r, 'psU1') || ''; S.u2 = K.val(r, 'psU2') || ''; }
    function load(o){ Object.assign(S, stampNorm(o)); for(const [k] of SF) $('pf_' + k).checked = !!S.fields[k]; refillU(); $('psFile').value = S.file || '(chưa lưu)'; pv(); }
    function refillU(){ for(const id of ['psU1', 'psU2']){ const v = id === 'psU1' ? S.u1 : S.u2; $(id).innerHTML = uOpts().map(([a, b]) => '<option value="' + esc(a) + '"' + (a === v ? ' selected' : '') + '>' + esc(b) + '</option>').join(''); } }
    function pv(){ read(root); const c = $('psPv'), g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H);
      const P = A.PS || {}; const land = P.land !== false; const pw = land ? 120 : 76, ph = land ? 84 : 100, x0 = (W - pw) / 2, y0 = (H - ph) / 2;
      g.fillStyle = '#fff'; g.fillRect(x0, y0, pw, ph); g.strokeStyle = '#8a94a6'; g.strokeRect(x0 + .5, y0 + .5, pw - 1, ph - 1);
      const L = S.loc === 'tl' || S.loc === 'bl', T = S.loc === 'tl' || S.loc === 'tr', vert = S.orient === 'v', m = 6, len = vert ? ph * 0.5 : pw * 0.5;
      g.strokeStyle = '#d33'; g.lineWidth = 2; g.beginPath();
      if(vert){ const x = L ? x0 + m : x0 + pw - m, ya = T ? y0 + m : y0 + ph - m; g.moveTo(x, ya); g.lineTo(x, T ? ya + len : ya - len); }
      else { const y = T ? y0 + m : y0 + ph - m, xa = L ? x0 + m : x0 + pw - m; g.moveTo(xa, y); g.lineTo(L ? xa + len : xa - len, y); }
      g.stroke(); g.lineWidth = 1;
      $('psTxt').textContent = 'Dấu in: ' + (stampFields(S, null).join(', ') || '(không có trường nào)'); }
    root.addEventListener('change', pv); pv();
    $('psUE').onclick = async () => { read(root); if(await userFieldsDlg(S)){ refillU(); pv(); } };
    $('psAdv').onclick = async () => { read(root); if(await stampAdvDlg(S)) pv(); };
    $('psSave').onclick = () => { read(root); const nm = (S.file && S.file !== '(chưa lưu)' ? S.file : 'dvd.pss').replace(/\.[^.]*$/, '') + '.pss'; S.file = nm; $('psFile').value = nm;
      const o = Object.assign({}, S); shareOrDownload(new Blob([JSON.stringify({ dvdPlotStamp: 1, v: o }, null, 1)], { type: 'application/json' }), nm, 'application/json'); };
    $('psLoad').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.pss,.json'; i.onchange = () => { const f = i.files[0]; if(!f) return;
      f.text().then(t => { let o = null; try{ o = JSON.parse(t); }catch(_){} if(!o || !(o.v || o.fields)){ say('Tệp tham số dấu in không hợp lệ (cần tệp .pss do DVDCAD lưu).'); return; } load(Object.assign({}, o.v || o, { file: f.name })); log('Đã nạp tham số dấu in từ ' + f.name); }); }; i.click(); }; }); }
  plain(['PLOTSTAMP'], 'Dấu in (Plot Stamp): trường thông tin, trường người dùng, vị trí / hướng / cỡ chữ, tệp tham số .pss, nhật ký in — in kèm khi bật "Bật dấu in" trong PLOT', async () => {
    if(A.busy && A.busy()) A.cancel(true); const S = await plotStampDlg(); if(!S) return;
    const P = A.PS; log('PLOTSTAMP: ' + (stampFields(S, null).join(', ') || '(không trường)') + (P && !P.stamp ? ' — bật "Bật dấu in" trong hộp PLOT để in kèm.' : '')); });

  /* ==================================================================
     STANDARDS — Cấu hình chuẩn (Configure Standards, như AutoCAD): gắn tệp chuẩn (DXF/DWS dạng DXF) với bản vẽ,
     trình cắm Lớp / Kiểu nét / Kiểu chữ / Kiểu kích thước, Cài đặt
     CHECKSTANDARDS — Kiểm tra chuẩn: Lỗi, Thay bằng, Xem trước thay đổi, Sửa / Lỗi tiếp theo / Bỏ qua
     ================================================================== */
  const STK = 'dvd:standards', STS = 'dvd:stdset', STI = 'dvd:stdign';
  const docKey = () => { try{ return currentName || '(Drawing1)'; }catch(_){ return '(Drawing1)'; } };
  let stdMemo = null;   // { k, L } — tránh đọc localStorage mỗi lần commit
  const stdFiles = () => { const k = docKey(); if(stdMemo && stdMemo.k === k) return stdMemo.L; const o = lsGet(STK, {}); const L = Array.isArray(o[k]) ? o[k] : []; stdMemo = { k, L }; return L; };
  const stdFilesSet = L => { const o = lsGet(STK, {}); if(L.length) o[docKey()] = L; else delete o[docKey()]; lsSet(STK, o); stdMemo = null; };
  const stdSet = () => Object.assign({ plug: { ds: 1, lay: 1, lt: 1, ts: 1 }, auto: 0, showIgn: 0, pref: '', notify: 'icon' }, lsGet(STS, {}));
  const ignGet = () => { const o = lsGet(STI, {}); return new Set(Array.isArray(o[docKey()]) ? o[docKey()] : []); };
  const ignSet = S => { const o = lsGet(STI, {}); o[docKey()] = [...S]; lsSet(STI, o); };
  const PLUGS = [['ds', 'Kiểu kích thước', 'Kiểm tra tên và thuộc tính (cao chữ, mũi tên, số lẻ) của kiểu kích thước so với tệp chuẩn.'], ['lay', 'Lớp', 'Kiểm tra tên lớp và thuộc tính lớp (màu, kiểu nét, bề rộng nét) so với tệp chuẩn.'],
    ['lt', 'Kiểu nét', 'Kiểm tra tên kiểu nét và định nghĩa nét gạch so với tệp chuẩn.'], ['ts', 'Kiểu chữ', 'Kiểm tra tên kiểu chữ và phông, hệ số rộng so với tệp chuẩn.']];
  // đọc bảng LAYER / LTYPE / STYLE / DIMSTYLE của tệp DXF
  function dxfTables(txt){ const ln = String(txt).split(/\r?\n/), T = { LAYER: [], LTYPE: [], STYLE: [], DIMSTYLE: [] }; let tab = null, cur = null, want = false, prev0 = '';
    for(let i = 0; i + 1 < ln.length; i += 2){ const c = ln[i].trim(), v = ln[i + 1].trim();
      if(c === '0'){ cur = null; prev0 = v; if(v === 'TABLE'){ want = true; tab = null; } else if(v === 'ENDTAB') tab = null; else if(tab && v === tab){ cur = { pat: [] }; T[tab].push(cur); } continue; }
      if(c === '2' && prev0 === 'SECTION' && (v === 'BLOCKS' || v === 'ENTITIES')) break;
      if(want && c === '2'){ want = false; tab = T[v] ? v : null; continue; }
      if(!cur) continue; const n = +v;
      if(c === '2') cur.name = v;
      else if(tab === 'LAYER'){ if(c === '62') cur.aci = Math.abs(n); else if(c === '6') cur.lt = v.toUpperCase(); else if(c === '370') cur.lw = n; }
      else if(tab === 'LTYPE'){ if(c === '3') cur.desc = v; else if(c === '49') cur.pat.push(n); }
      else if(tab === 'STYLE'){ if(c === '3') cur.font = v; else if(c === '41') cur.wf = n; else if(c === '40') cur.h = n; else if(c === '70') cur.fl = n; }
      else if(tab === 'DIMSTYLE'){ const m = { 140: 'txt', 41: 'asz', 42: 'exo', 44: 'exe', 147: 'gap', 271: 'dec' }[c]; if(m) cur[m] = n; } }
    T.LAYER = T.LAYER.filter(o => o.name).map(o => ({ name: o.name, aci: o.aci != null ? o.aci : 7, lt: o.lt && o.lt !== 'BYLAYER' && o.lt !== 'BYBLOCK' ? o.lt : 'CONTINUOUS', lw: o.lw > 0 ? o.lw : 0 }));
    T.LTYPE = T.LTYPE.filter(o => o.name && !/^BY(LAYER|BLOCK)$/i.test(o.name)).map(o => ({ name: o.name.toUpperCase(), desc: o.desc || '', pat: o.pat }));
    T.STYLE = T.STYLE.filter(o => o.name && !(o.fl & 1)).map(o => ({ name: o.name, font: o.font || '', wf: o.wf > 0 ? o.wf : 1 }));
    T.DIMSTYLE = T.DIMSTYLE.filter(o => o.name).map(o => { const r = { name: o.name }; for(const k of ['txt', 'asz', 'exo', 'exe', 'gap', 'dec']) if(o[k] != null && isFinite(o[k])) r[k] = o[k]; return r; });
    return T; }
  A.dxfStdTables = dxfTables;
  const U = s => String(s || '').toUpperCase();
  const fontBase = f => String(f || '').replace(/^.*[\\/]/, '').replace(/\.(ttf|ttc|otf|shx)$/i, '').trim();
  const fontOf = r => { const b = fontBase(r.font) || 'Arial'; const F = A.FONTS || []; return F.find(x => U(x) === U(b)) || F.find(x => U(x).replace(/\s+/g, '') === U(b).replace(/\s+/g, '')) || b.charAt(0).toUpperCase() + b.slice(1); };
  const hexOfAci = a => typeof aciHex === 'function' ? aciHex(a) : '#ffffff';
  const aciOf = n => A.aciNear ? A.aciNear(A.layerHex(n)) : 7;
  const lwName = v => v > 0 ? (v / 100).toFixed(2) + ' mm' : 'Mặc định';
  const ltDef = n => { try{ return LTYPES[n] || null; }catch(_){ return null; } };
  const patEq = (a, b) => a && b && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6 * Math.max(1, Math.abs(v)));
  function stdMerged(){ const M = { LAYER: new Map(), LTYPE: new Map(), STYLE: new Map(), DIMSTYLE: new Map() };
    for(const f of stdFiles()) for(const t of Object.keys(M)) for(const r of ((f.data || {})[t] || [])){ const k = U(r.name); if(!M[t].has(k)) M[t].set(k, { r, f: f.name }); }
    return M; }
  function dimTexts(){ const out = []; for(const e of modelEntities) if(e && e.type === 'TEXT' && e.dimd && e.grp) out.push(e); return out; }
  const dsOf = t => (t.dimd && t.dimd.s && t.dimd.s.name) || 'Standard';
  function dimValsFrom(r, base){ const v = Object.assign({}, base || {}); if(r.txt > 0) v.txt = r.txt; const h = r.txt > 0 ? r.txt : (v.txt > 0 ? v.txt : 0);
    if(h) for(const k of ['asz', 'exo', 'exe', 'gap']) if(r[k] != null) v[k] = r6(r[k] / h); if(r.dec != null) v.dec = r.dec | 0; return v; }
  function dimDiffs(cur, r){ const D = [], h = r.txt > 0 ? r.txt : (cur.txt > 0 ? cur.txt : 0);
    if(r.txt > 0 && cur.txt > 0 && Math.abs(cur.txt - r.txt) > 1e-6) D.push(['Cao chữ', r6(cur.txt), r6(r.txt)]);
    if(r.dec != null && (cur.dec | 0) !== (r.dec | 0)) D.push(['Số chữ số thập phân', cur.dec | 0, r.dec | 0]);
    if(h && r.asz != null && cur.asz != null && Math.abs(cur.asz * h - r.asz) > 1e-4) D.push(['Cỡ mũi tên', r6(cur.asz * h), r6(r.asz)]);
    return D; }
  // dựng lại các kích thước dùng kiểu "from" theo giá trị vals (đổi tên sang "to")
  function dimRestyle(from, to, vals){ if(!A.dimRegenFrom || !A.groupMembers) return 0; const del = [], add = [], done = new Set();
    for(const t of dimTexts()){ if(U(dsOf(t)) !== U(from) || done.has(t.grp)) continue; done.add(t.grp); const w = deep(t); delete w.userAdded;
      w.dimd.s = Object.assign({}, vals, { name: to, txt: vals.txt > 0 ? vals.txt : (t.dimd.s && t.dimd.s.txt) || vals.txt }); let ents = null; try{ ents = A.dimRegenFrom(w); }catch(_){}
      if(ents && ents.length){ del.push(...A.groupMembers(t.grp)); add.push(...ents); } }
    if(add.length) A.commit({ del, add }, 'Chuẩn hoá ' + done.size + ' kích thước theo kiểu ' + to); return done.size; }
  // danh sách lỗi chuẩn (như các trình cắm của CHECKSTANDARDS)
  function stdProblems(){ const S = stdSet(), M = stdMerged(), P = [];
    if(S.plug.lay && M.LAYER.size){ const std = [...M.LAYER.values()].map(x => x.r);
      for(const n of A.layerNames()){ if(n.includes('|')) continue; const s = M.LAYER.get(U(n));
        if(s){ const r = s.r, D = []; if(aciOf(n) !== r.aci) D.push(['Màu', aciOf(n), r.aci]); if(U(A.layerLT(n)) !== U(r.lt || 'CONTINUOUS')) D.push(['Kiểu nét', A.layerLT(n), r.lt]);
          if((A.layerLW(n) || 0) !== (r.lw || 0)) D.push(['Bề rộng nét', lwName(A.layerLW(n)), lwName(r.lw)]);
          if(D.length) P.push({ key: 'lay:p:' + n, plug: 'lay', kind: 'prop', name: n, text: 'Thuộc tính của lớp "' + n + '" không khớp với chuẩn (' + s.f + ').', opts: [{ v: r.name, rec: true, r }], diffs: () => D }); }
        else if(n !== '0' && U(n) !== 'DEFPOINTS'){ const rec = std.find(r => U(r.name).includes(U(n)) || U(n).includes(U(r.name)));
          P.push({ key: 'lay:n:' + n, plug: 'lay', kind: 'name', name: n, text: 'Lớp "' + n + '" không có trong tệp chuẩn.', opts: std.map(r => ({ v: r.name, rec: r === rec, r })),
            diffs: o => [['Tên', n, o.r.name], ['Màu', aciOf(n), o.r.aci], ['Kiểu nét', A.layerLT(n), o.r.lt], ['Bề rộng nét', lwName(A.layerLW(n)), lwName(o.r.lw)]] }); } } }
    if(S.plug.lt && M.LTYPE.size){ const std = [...M.LTYPE.values()].map(x => x.r); const used = new Set();
      for(const n of A.layerNames()) used.add(U(A.layerLT(n))); for(const e of modelEntities) if(e && e.lt && !/^BY(LAYER|BLOCK)$/i.test(e.lt)) used.add(U(e.lt)); try{ for(const k of Object.keys(LTYPES)) used.add(U(k)); }catch(_){}
      for(const n of [...used].sort()){ if(!n || n === 'CONTINUOUS' || n === 'BYLAYER' || n === 'BYBLOCK') continue; const s = M.LTYPE.get(n), d = ltDef(n);
        if(s){ if(d && d.pat && s.r.pat.length && !patEq(d.pat, s.r.pat)) P.push({ key: 'lt:p:' + n, plug: 'lt', kind: 'prop', name: n, text: 'Định nghĩa kiểu nét "' + n + '" khác với chuẩn (' + s.f + ').', opts: [{ v: s.r.name, rec: true, r: s.r }], diffs: () => [['Mẫu nét', d.pat.join(', '), s.r.pat.join(', ')]] }); }
        else P.push({ key: 'lt:n:' + n, plug: 'lt', kind: 'name', name: n, text: 'Kiểu nét "' + n + '" không có trong tệp chuẩn.', opts: std.map(r => ({ v: r.name, rec: false, r })), diffs: o => [['Tên', n, o.r.name], ['Mô tả', (d && d.desc) || '', o.r.desc]] }); } }
    if(S.plug.ts && M.STYLE.size && A.TS){ const std = [...M.STYLE.values()].map(x => x.r);
      for(const n of Object.keys(A.TS.list)){ const s = M.STYLE.get(U(n)), st = A.TS.list[n] || {};
        if(s){ const D = []; if(s.r.font && U(st.font || 'Arial') !== U(fontOf(s.r))) D.push(['Phông', st.font || 'Arial', fontOf(s.r)]); if(Math.abs((st.wf > 0 ? st.wf : 1) - s.r.wf) > 1e-6) D.push(['Hệ số rộng', st.wf > 0 ? st.wf : 1, s.r.wf]);
          if(D.length) P.push({ key: 'ts:p:' + n, plug: 'ts', kind: 'prop', name: n, text: 'Thuộc tính của kiểu chữ "' + n + '" không khớp với chuẩn (' + s.f + ').', opts: [{ v: s.r.name, rec: true, r: s.r }], diffs: () => D }); }
        else P.push({ key: 'ts:n:' + n, plug: 'ts', kind: 'name', name: n, text: 'Kiểu chữ "' + n + '" không có trong tệp chuẩn.', opts: std.map(r => ({ v: r.name, rec: false, r })), diffs: o => [['Tên', n, o.r.name], ['Phông', st.font || 'Arial', fontOf(o.r)]] }); } }
    if(S.plug.ds && M.DIMSTYLE.size && A.dimStyles){ const lib = A.dimStyles.lib(), std = [...M.DIMSTYLE.values()].map(x => x.r);
      for(const n of Object.keys(lib)){ const s = M.DIMSTYLE.get(U(n));
        if(s){ const D = dimDiffs(lib[n] || {}, s.r); if(D.length) P.push({ key: 'ds:p:' + n, plug: 'ds', kind: 'prop', name: n, text: 'Thuộc tính của kiểu kích thước "' + n + '" không khớp với chuẩn (' + s.f + ').', opts: [{ v: s.r.name, rec: true, r: s.r }], diffs: () => D }); }
        else P.push({ key: 'ds:n:' + n, plug: 'ds', kind: 'name', name: n, text: 'Kiểu kích thước "' + n + '" không có trong tệp chuẩn.', opts: std.map(r => ({ v: r.name, rec: false, r })), diffs: o => [['Tên', n, o.r.name]] }); } }
    // tệp chuẩn ưu tiên (Cài đặt): gợi ý thay thế lấy từ tệp đó khi chưa có gợi ý
    if(S.pref){ const pf = stdFiles().find(f => f.name === S.pref); if(pf) for(const p of P) if(p.kind === 'name' && !p.opts.some(o => o.rec)){ const T = { lay: 'LAYER', lt: 'LTYPE', ts: 'STYLE', ds: 'DIMSTYLE' }[p.plug]; const r0 = ((pf.data || {})[T] || [])[0]; const o = r0 && p.opts.find(x => U(x.v) === U(r0.name)); if(o) o.rec = true; } }
    return P; }
  A.stdProblems = stdProblems;
  function ensureLT(n){ n = U(n); if(!n || n === 'CONTINUOUS' || ltDef(n)) return; const s = stdMerged().LTYPE.get(n); if(s && s.r.pat.length && A.defineLT) A.defineLT({ name: n, desc: s.r.desc, pat: s.r.pat.slice() }); else if(A.loadLT) A.loadLT(n); }
  function layerProps(n, r){ if(r.aci != null && aciOf(n) !== r.aci) A.setLayerColor(n, hexOfAci(r.aci)); ensureLT(r.lt); A.setLayerLT(n, r.lt || 'CONTINUOUS'); A.setLayerLW(n, r.lw > 0 ? r.lw : 0); }
  // sửa một lỗi theo lựa chọn thay thế o
  function stdFix(p, o){ const r = o.r;
    if(p.plug === 'lay'){ if(p.kind === 'prop'){ layerProps(p.name, r); return 'Đã sửa thuộc tính lớp ' + p.name; }
      const to = r.name; if(!A.layerNames().includes(to)) A.addLayer(to, hexOfAci(r.aci)); layerProps(to, r);
      const rep = []; for(const e of modelEntities){ if(!e || e.xr || (e.layer || '0') !== p.name) continue; const w = deep(e); delete w.userAdded; w.layer = to; if(w.bl) w.col = A.layerHex(to); rep.push([e, w]); }
      if(rep.length) A.commit({ rep }, 'CHECKSTANDARDS: lớp ' + p.name + ' → ' + to); if(A.LS && A.LS.cur === p.name) A.setCurLayer(to); try{ A.deleteLayer(p.name); }catch(_){}
      return 'Đã chuyển ' + rep.length + ' đối tượng từ lớp ' + p.name + ' sang ' + to; }
    if(p.plug === 'lt'){ const to = U(r.name);
      if(p.kind === 'prop'){ if(A.defineLT) A.defineLT({ name: to, desc: r.desc || (ltDef(to) || {}).desc || '', pat: r.pat.slice() }); return 'Đã định nghĩa lại kiểu nét ' + to; }
      ensureLT(to); for(const n of A.layerNames()) if(U(A.layerLT(n)) === p.name) A.setLayerLT(n, to);
      const rep = []; for(const e of modelEntities){ if(!e || e.xr || U(e.lt) !== p.name) continue; const w = deep(e); delete w.userAdded; w.lt = to; rep.push([e, w]); }
      if(rep.length) A.commit({ rep }, 'CHECKSTANDARDS: kiểu nét ' + p.name + ' → ' + to);
      try{ for(const k of Object.keys(LTYPES)) if(U(k) === p.name) delete LTYPES[k]; for(const k of Object.keys(A.LS.ltd || {})) if(U(k) === p.name) delete A.LS.ltd[k]; A.lsSave(); }catch(_){}
      try{ draw(); }catch(_){} return 'Đã thay kiểu nét ' + p.name + ' bằng ' + to; }
    if(p.plug === 'ts'){ const TS = A.TS;
      if(p.kind === 'prop'){ const st = TS.list[p.name] = Object.assign({}, TS.list[p.name]); if(r.font) st.font = fontOf(r); st.wf = r.wf > 0 ? r.wf : 1; A.tsSave(); try{ forceRedraw(); }catch(_){ try{ draw(); }catch(__){} } return 'Đã sửa kiểu chữ ' + p.name; }
      const to = Object.keys(TS.list).find(k => U(k) === U(r.name)) || r.name; if(!TS.list[to]) TS.list[to] = { font: fontOf(r), wf: r.wf > 0 ? r.wf : 1 };
      const rep = []; for(const e of modelEntities){ if(!e || e.xr || e.style !== p.name) continue; const w = deep(e); delete w.userAdded; w.style = to; rep.push([e, w]); }
      if(rep.length) A.commit({ rep }, 'CHECKSTANDARDS: kiểu chữ ' + p.name + ' → ' + to);
      if(p.name !== 'Standard' && p.name !== to) delete TS.list[p.name]; if(TS.cur === p.name || !TS.list[TS.cur]) TS.cur = to; A.tsSave(); return 'Đã thay kiểu chữ ' + p.name + ' bằng ' + to; }
    if(p.plug === 'ds'){ const DSN = A.dimStyles, lib = DSN.lib();
      if(p.kind === 'prop'){ lib[p.name] = dimValsFrom(r, lib[p.name]); DSN.saveLib(lib); if(A.DS && A.DS.name === p.name) DSN.setCurrent(p.name, lib); const k = dimRestyle(p.name, p.name, lib[p.name]); return 'Đã sửa kiểu kích thước ' + p.name + (k ? ' (' + k + ' kích thước)' : ''); }
      const to = Object.keys(lib).find(k => U(k) === U(r.name)) || r.name; if(!lib[to]) lib[to] = dimValsFrom(r, lib.Standard || DSN.values());
      const k = dimRestyle(p.name, to, lib[to]); if(p.name !== to && p.name !== 'Standard') delete lib[p.name]; DSN.saveLib(lib); if(!A.DS || A.DS.name === p.name || !lib[A.DS.name]) DSN.setCurrent(to, lib);
      return 'Đã thay kiểu kích thước ' + p.name + ' bằng ' + to + (k ? ' (' + k + ' kích thước)' : ''); }
    return ''; }

  function stdSettingsDlg(){ return new Promise(res => { const S = stdSet(), F = stdFiles();
    const html = '<div class="acw" style="width:420px">' + K.grp('Thông báo', K.rad('ssN', 'off', 'Tắt thông báo chuẩn', S.notify === 'off') + '<br>' + K.rad('ssN', 'alert', 'Hiện cảnh báo khi có vi phạm chuẩn', S.notify === 'alert') + '<br>' + K.rad('ssN', 'icon', 'Hiện biểu tượng chuẩn trên thanh trạng thái', S.notify === 'icon')) +
      K.grp('Kiểm tra chuẩn', K.chk('ssA', 'Tự động sửa thuộc tính không chuẩn', S.auto) + '<br>' + K.chk('ssI', 'Hiện các lỗi đã bỏ qua', S.showIgn) + K.vrow('Tệp chuẩn ưu tiên dùng để thay thế:', K.sel('ssP', [['', '(Không)']].concat(F.map(f => [f.name, f.name])), S.pref))) + '</div>';
    A.dialog({ title: 'Cài đặt chuẩn CAD', cls: 'acw-free', help: 'STANDARDS', html, ok: r => { S.notify = K.radio(r, 'ssN') || 'icon'; S.auto = K.on(r, 'ssA') ? 1 : 0; S.showIgn = K.on(r, 'ssI') ? 1 : 0; S.pref = K.val(r, 'ssP') || ''; lsSet(STS, S); stdIcon(); res(true); }, cancel: () => res(false) }); }); }
  // đọc bảng chuẩn từ tệp: DXF ASCII hoặc DWG nhị phân (.dws / .dwg / .dwt qua LibreDWG)
  async function stdTablesOf(f){ const buf = await f.arrayBuffer();
    if(A.isDwgBytes && A.isDwgBytes(buf)){ if(!A.dwgStdTables) throw new Error('Thiếu bộ đọc DWG'); return A.dwgStdTables(buf); }
    const t = new TextDecoder().decode(buf); if(!/(^|\n)\s*0\s*\r?\n\s*SECTION/.test(t)) throw new Error('Không phải tệp DWS / DWG / DXF'); return dxfTables(t); }
  A.stdTablesOf = stdTablesOf;
  function pickStdFile(){ return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.dws,.dwg,.dwt,.dxf'; i.onchange = () => { const f = i.files[0]; if(!f){ res(null); return; }
    stdTablesOf(f).catch(err => { say('Không đọc được tệp chuẩn ' + f.name + ': ' + (err.message || err)); return null; }).then(data => { if(!data){ res(null); return; }
      const n = data.LAYER.length + data.LTYPE.length + data.STYLE.length + data.DIMSTYLE.length; if(!n){ say('Tệp không có bảng lớp / kiểu nét / kiểu chữ / kiểu kích thước.'); res(null); return; }
      res({ name: f.name, date: new Date(f.lastModified || Date.now()).toLocaleString(), data }); }); }; i.click(); }); }
  A.stdAttach = (name, dxfText) => { const L = stdFiles().filter(f => f.name !== name); L.push({ name, date: new Date().toLocaleString(), data: dxfTables(dxfText) }); stdFilesSet(L); stdIcon(); return L.length; };
  function standardsDlg(){ return new Promise(res => { let F = stdFiles().map(f => deep(f)), S = stdSet(), sel = F.length ? F[0].name : '', psel = 'lay';
    const html = '<div class="acw" style="width:600px">' + K.tabs('st', [['std', 'Chuẩn'], ['plg', 'Trình cắm']], 'std') +
      K.pane('st', 'std', 'std', '<div class="acw-lab">Các tệp chuẩn gắn với bản vẽ hiện hành:</div><div class="acw-cols"><div class="c1" style="flex:1 1 55%">' + K.list('stL', [], '', 'height:190px') + '</div>' +
        '<div class="c2 acw-btncol">' + K.btn('stAdd', '+ Thêm…') + K.btn('stRm', '− Bỏ') + K.btn('stUp', '↑ Lên') + K.btn('stDn', '↓ Xuống') + '</div><div class="c1" style="flex:1 1 45%"><div class="acw-lab">Mô tả</div><div class="acw-note" id="stD" style="height:174px;overflow:auto;white-space:pre-wrap;border:1px solid #4a5363;padding:6px;margin:0"></div></div></div>') +
      K.pane('st', 'plg', 'std', '<div class="acw-lab">Trình cắm dùng khi kiểm tra chuẩn:</div><div class="acw-cols"><div class="c1" style="flex:1 1 50%"><div class="acw-list" id="stP" style="height:190px">' + PLUGS.map(([k, t]) => '<div class="it' + (k === psel ? ' on' : '') + '" data-v="' + k + '"><label class="acw-ck"><input type="checkbox" data-pl="' + k + '"' + (S.plug[k] ? ' checked' : '') + '><span>' + t + '</span></label></div>').join('') + '</div></div>' +
        '<div class="c1" style="flex:1 1 50%"><div class="acw-lab">Mô tả</div><div class="acw-note" id="stPD" style="height:174px;overflow:auto;white-space:pre-wrap;border:1px solid #4a5363;padding:6px;margin:0"></div></div></div>') + '</div>';
    const save = () => { stdFilesSet(F); const ss = stdSet(); ss.plug = S.plug; if(ss.pref && !F.some(f => f.name === ss.pref)) ss.pref = ''; lsSet(STS, ss); stdIcon(); };
    const d = A.dialog({ title: 'Cấu hình chuẩn', cls: 'acw-free', help: 'STANDARDS', html, left: K.btn('stChk', 'Kiểm tra chuẩn…') + K.btn('stSet', 'Cài đặt…'), ok: () => { save(); res(true); }, cancel: () => res(false) });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    function render(){ $('stL').innerHTML = F.length ? F.map(f => '<div class="it' + (f.name === sel ? ' on' : '') + '" data-v="' + esc(f.name) + '">📄 ' + esc(f.name) + '</div>').join('') : '<div class="acw-note" style="padding:6px">(chưa gắn tệp chuẩn — bấm "+ Thêm…" để chọn tệp DXF / DWS)</div>';
      const f = F.find(x => x.name === sel), i = F.indexOf(f); $('stRm').disabled = !f; $('stUp').disabled = !f || i <= 0; $('stDn').disabled = !f || i >= F.length - 1;
      $('stD').textContent = f ? 'Tệp: ' + f.name + '\nNgày: ' + (f.date || '') + '\n\nLớp: ' + f.data.LAYER.length + '\nKiểu nét: ' + f.data.LTYPE.length + '\nKiểu chữ: ' + f.data.STYLE.length + '\nKiểu kích thước: ' + f.data.DIMSTYLE.length + (i > 0 ? '\n\nKhi trùng tên, tệp xếp trên được ưu tiên.' : '') : '';
      const p = PLUGS.find(x => x[0] === psel); $('stPD').textContent = p ? 'Trình cắm: ' + p[1] + '\nPhiên bản: 1.0\nNhà phát hành: DVDCAD\n\nMục đích: ' + p[2] : ''; }
    K.bindList($('stL'), v => { sel = v; render(); });
    $('stP').addEventListener('click', e => { const it = e.target.closest('.it'); if(!it) return; psel = it.dataset.v; root.querySelectorAll('#stP .it').forEach(x => x.classList.toggle('on', x === it)); render(); });
    $('stP').addEventListener('change', e => { const c = e.target.closest('[data-pl]'); if(c) S.plug[c.dataset.pl] = c.checked ? 1 : 0; });
    $('stAdd').onclick = async () => { const f = await pickStdFile(); if(!f) return; F = F.filter(x => x.name !== f.name); F.push(f); sel = f.name; render(); log('STANDARDS: đã gắn ' + f.name + ' (' + f.data.LAYER.length + ' lớp, ' + f.data.LTYPE.length + ' kiểu nét, ' + f.data.STYLE.length + ' kiểu chữ, ' + f.data.DIMSTYLE.length + ' kiểu kích thước)'); };
    $('stRm').onclick = () => { const i = F.findIndex(x => x.name === sel); if(i < 0) return; F.splice(i, 1); sel = (F[Math.min(i, F.length - 1)] || {}).name || ''; render(); };
    const mv = k => { const i = F.findIndex(x => x.name === sel), j = i + k; if(i < 0 || j < 0 || j >= F.length) return; [F[i], F[j]] = [F[j], F[i]]; render(); };
    $('stUp').onclick = () => mv(-1); $('stDn').onclick = () => mv(1);
    $('stSet').onclick = async () => { save(); await stdSettingsDlg(); S = Object.assign(stdSet(), { plug: S.plug }); };
    $('stChk').onclick = () => { save(); d.close(); res(true); setTimeout(() => DVDCmd.run('CHECKSTANDARDS'), 0); };
    render(); }); }
  plain(['STANDARDS'], 'Cấu hình chuẩn (Configure Standards): gắn tệp chuẩn DXF / DWS với bản vẽ, chọn trình cắm (lớp, kiểu nét, kiểu chữ, kiểu kích thước), cài đặt thông báo', async () => { if(A.busy && A.busy()) A.cancel(true); await standardsDlg(); });

  function checkDone(st){ A.dialog({ title: 'Kiểm tra chuẩn - Hoàn tất', cls: 'acw-free', help: 'CHECKSTANDARDS', noCancel: true, html: '<div class="acw" style="width:360px">' + K.grp('Kết quả', '<div style="line-height:1.7">Đã kiểm tra xong bản vẽ.<br>Số lỗi: <b>' + st.n + '</b><br>Tự động sửa: ' + st.auto + '<br>Sửa thủ công: ' + st.fix + '<br>Đánh dấu bỏ qua: ' + st.ign + '<br>Chưa sửa: ' + Math.max(0, st.n - st.auto - st.fix - st.ign) + '</div>') + '</div>' }); }
  function checkStandards(){ if(!stdFiles().length){ A.dialog({ title: 'Kiểm tra chuẩn', cls: 'acw-free', help: 'CHECKSTANDARDS', okText: 'Cấu hình chuẩn…', cancelText: 'Đóng', html: '<div class="acw" style="width:380px"><p style="margin:4px 0">Bản vẽ hiện hành chưa gắn tệp chuẩn nào.</p><p style="margin:4px 0">Dùng STANDARDS để gắn tệp chuẩn (DXF / DWS) với bản vẽ trước khi kiểm tra.</p></div>', ok: () => { setTimeout(() => DVDCmd.run('STANDARDS'), 0); } }); return; }
    const S = stdSet(), ign = ignGet(), st = { n: 0, auto: 0, fix: 0, ign: 0 }; let all = stdProblems(); st.n = all.length;
    if(S.auto) for(const p of all){ const o = p.kind === 'prop' ? p.opts[0] : p.opts.find(x => x.rec); if(o && !(ign.has(p.key) && !S.showIgn)){ try{ log(stdFix(p, o)); st.auto++; p.done = 1; }catch(err){ console.warn(err); } } }
    let Q = all.filter(p => !p.done && (S.showIgn || !ign.has(p.key))); st.ign = all.filter(p => !p.done && ign.has(p.key) && !S.showIgn).length;
    if(!Q.length){ checkDone(st); return; }
    let i = 0, choice = null;
    const html = '<div class="acw" style="width:560px"><div class="acw-row"><span class="l">Vấn đề:</span><span id="csN" style="margin-left:auto;color:#9aa6b8"></span></div><div class="acw-note" id="csP" style="min-height:44px;border:1px solid #4a5363;padding:6px;margin:0 0 6px;white-space:pre-wrap"></div>' +
      '<div class="acw-lab">Thay bằng:</div>' + K.list('csR', [], '', 'height:120px') +
      '<div class="acw-lab" style="margin-top:6px">Xem trước thay đổi:</div><div class="lm-grid" style="height:118px"><table class="acw-cmp"><thead><tr><th>Thuộc tính</th><th>Giá trị hiện tại</th><th>Giá trị chuẩn</th></tr></thead><tbody id="csV"></tbody></table></div>' +
      '<div class="acw-row" style="margin-top:6px">' + K.btn('csFix', 'Sửa lỗi', { def: 1 }) + K.btn('csNext', 'Lỗi tiếp theo') + '<span class="l"></span>' + K.chk('csIg', 'Đánh dấu bỏ qua lỗi này', 0) + '</div></div>';
    const d = A.dialog({ title: 'Kiểm tra chuẩn', cls: 'acw-free', help: 'CHECKSTANDARDS', html, noOk: true, cancelText: 'Đóng', left: K.btn('csSet', 'Cài đặt…'), cancel: () => { ignSet(ign); log('CHECKSTANDARDS: ' + st.n + ' lỗi, đã sửa ' + (st.fix + st.auto) + ', bỏ qua ' + st.ign + '.'); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    function show(){ const p = Q[i]; $('csN').textContent = 'Lỗi ' + (i + 1) + ' / ' + Q.length; $('csP').textContent = p.text + (ign.has(p.key) ? '\n(đã đánh dấu bỏ qua)' : '');
      const def = p.opts.find(o => o.rec) || p.opts[0]; choice = def;
      $('csR').innerHTML = p.opts.map(o => '<div class="it' + (o === def ? ' on' : '') + '" data-v="' + esc(o.v) + '">' + (o.rec ? '✓ ' : '<span style="display:inline-block;width:1.1em"></span>') + esc(o.v) + '</div>').join('');
      $('csIg').checked = ign.has(p.key); $('csFix').disabled = !p.opts.length; prev(); }
    function prev(){ const p = Q[i]; const D = choice ? p.diffs(choice) : []; $('csV').innerHTML = D.map(([a, b, c]) => '<tr><td>' + esc(a) + '</td><td>' + esc(b) + '</td><td' + (String(b) !== String(c) ? ' style="color:#ffd26a"' : '') + '>' + esc(c) + '</td></tr>').join(''); }
    function next(){ const p = Q[i]; if($('csIg').checked && !ign.has(p.key)){ ign.add(p.key); st.ign++; } else if(!$('csIg').checked && ign.has(p.key)){ ign.delete(p.key); }
      i++; if(i >= Q.length){ ignSet(ign); d.close(); log('CHECKSTANDARDS: ' + st.n + ' lỗi, đã sửa ' + (st.fix + st.auto) + ', bỏ qua ' + st.ign + '.'); checkDone(st); return; } show(); }
    K.bindList($('csR'), v => { choice = Q[i].opts.find(o => o.v === v) || null; prev(); }, () => $('csFix').click());
    $('csFix').onclick = () => { const p = Q[i]; if(!choice) return; try{ const m = stdFix(p, choice); if(m) log(m); st.fix++; ign.delete(p.key); }catch(err){ console.error(err); say('Không sửa được lỗi này.'); return; }
      // lỗi khác có thể đã hết sau khi sửa (vd. đổi lớp kéo theo kiểu nét) → bỏ những lỗi không còn
      const live = new Set(stdProblems().map(x => x.key)); Q = Q.slice(0, i + 1).concat(Q.slice(i + 1).filter(x => live.has(x.key))); $('csIg').checked = false; next(); };
    $('csNext').onclick = next;
    $('csSet').onclick = () => stdSettingsDlg();
    show(); }
  plain(['CHECKSTANDARDS'], 'Kiểm tra chuẩn (Check Standards): so bản vẽ với tệp chuẩn đã gắn — lớp, kiểu nét, kiểu chữ, kiểu kích thước; Sửa / Lỗi tiếp theo / Bỏ qua', () => { if(A.busy && A.busy()) A.cancel(true); checkStandards(); });

  // thông báo vi phạm chuẩn (Cài đặt → Hiện cảnh báo) và biểu tượng chuẩn trên thanh trạng thái
  let stdLast = -1, stdT = 0;
  function stdIcon(){ let el = document.getElementById('stdIco'); const on = stdFiles().length && stdSet().notify === 'icon'; const bar = document.querySelector('#acadStatus .ac-sb');
    if(!on || !bar){ if(el) el.remove(); return; } if(!el){ el = document.createElement('span'); el.id = 'stdIco'; el.setAttribute('role', 'button'); el.title = 'Chuẩn CAD: bấm để kiểm tra chuẩn (CHECKSTANDARDS)'; el.className = 'st-ico'; el.style.cssText = 'cursor:pointer;padding:0 6px;align-self:center'; el.onclick = () => DVDCmd.run('CHECKSTANDARDS'); bar.appendChild(el); }
    let n = 0; try{ const ig = ignGet(); n = stdProblems().filter(p => !ig.has(p.key)).length; }catch(_){} el.textContent = '⚖ ' + (n ? n : '✓'); el.style.color = n ? '#ffb347' : ''; }
  A.stdIcon = stdIcon;
  function stdWatch(){ clearTimeout(stdT); stdT = setTimeout(() => { if(!stdFiles().length){ stdLast = -1; stdIcon(); return; } const S = stdSet(); if(S.notify === 'off'){ stdIcon(); return; }
      let n = 0; try{ const ig = ignGet(); n = stdProblems().filter(p => !ig.has(p.key)).length; }catch(_){ return; }
      if(S.notify === 'alert' && stdLast >= 0 && n > stdLast && !(A.busy && A.busy()) && !document.querySelector('.dvd-dlg.show'))
        A.dialog({ title: 'Vi phạm chuẩn', cls: 'acw-free', help: 'CHECKSTANDARDS', okText: 'Sửa vi phạm chuẩn', cancelText: 'Để nguyên', html: '<div class="acw" style="width:360px"><p style="margin:4px 0">Bản vẽ vừa có thêm vi phạm chuẩn (' + n + ' lỗi).</p></div>', ok: () => { setTimeout(() => DVDCmd.run('CHECKSTANDARDS'), 0); } });
      stdLast = n; stdIcon(); }, 400); }
  { const _c = A.commit; A.commit = function(){ const r = _c.apply(this, arguments); if(stdFiles().length) stdWatch(); return r; }; }
  { const _a = A.addLayer; A.addLayer = function(){ const r = _a.apply(this, arguments); if(r && stdFiles().length) stdWatch(); return r; }; }
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); stdLast = -1; setTimeout(stdWatch, 300); }; })(A.onLoad);
  setTimeout(stdIcon, 1500);
  /* ==================================================================
     v5p — hộp thoại kiểu cũ còn lại theo bố cục AutoCAD 2027 + lệnh nhỏ còn thiếu
     PTYPE · STYLESMANAGER (Plot Style Table Editor) · VISUALSTYLES / VSCURRENT / VSSAVE · ATTACH · REINIT · TEXTSCR / DBLIST
     CENTERMARK / CENTERLINE liên kết + CENTERRESET / CENTERDISASSOCIATE / CENTERREASSOCIATE · BSAVEAS · EXPORTLAYOUT · TREESTAT · COMPARECLOSE
     ================================================================== */
  const css8 = document.createElement('style');
  css8.textContent = `
  .pts-g{display:grid;grid-template-columns:repeat(5,52px);gap:4px;padding:6px;background:#1b2028;border:1px solid #5a6578;width:max-content;margin:0 auto 8px}
  .pts-g canvas{border:1px solid transparent;cursor:pointer;background:#1b2028;width:48px;height:40px;box-sizing:border-box}
  .pts-g canvas.on{border-color:#0696d7;background:#0b5f8f}
  .tile-v{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;padding:6px;background:#1b2028;border:1px solid #4a5363;overflow:auto}
  .tile-v .tl{width:92px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;border:1px solid transparent;border-radius:2px;cursor:pointer;font-size:11.5px;text-align:center;color:#dfe5ee}
  .tile-v .tl:hover{background:#2c323d}
  .tile-v .tl.on{background:#0b5f8f;border-color:#0696d7}
  .tile-v .tl canvas{background:#262b34;border:1px solid #4a5363}
  .tile-v .tl .ic{font-size:28px;line-height:40px}
  .pse-tv{overflow:auto;height:300px;border:1px solid #4a5363}
  .pse-tv table{border-collapse:collapse;font-size:11.5px;white-space:nowrap}
  .pse-tv th,.pse-tv td{border:1px solid #3a4250;padding:2px 6px;min-width:84px}
  .pse-tv th{background:#434c5b;font-weight:400;position:sticky;top:0;z-index:1}
  .pse-tv td.k{background:#353c48;position:sticky;left:0;z-index:2;min-width:120px}
  .pse-tv td.ed{cursor:pointer}
  .pse-tv td.ed:hover{background:#2c3f55}
  .pse-tv td select,.pse-tv td input{width:100%;box-sizing:border-box}
  .pse-pl .it{display:flex;align-items:center;gap:6px}
  .pse-pl .sw{display:inline-block;width:11px;height:11px;border:1px solid #666;flex:0 0 auto}
  .pse-fm .acw-row .l{min-width:118px}
  .txw-t{width:100%;height:360px;box-sizing:border-box;font:12px ui-monospace,Menlo,Consolas,monospace;background:#1b2028;color:#dfe5ee;border:1px solid #4a5363;white-space:pre;resize:vertical}
  `;
  document.head.appendChild(css8);

  /* ---------- PTYPE — Point Style ---------- */
  const PT_MODES = [0, 1, 2, 3, 4, 32, 33, 34, 35, 36, 64, 65, 66, 67, 68, 96, 97, 98, 99, 100];
  function ptGlyph(g, m, x, y, r, col){ g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.3; const b = m & 31; g.beginPath();
    if(b === 0){ g.arc(x, y, 1.6, 0, 2 * Math.PI); g.fill(); g.beginPath(); }
    else if(b === 2){ g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); }
    else if(b === 3){ const q = r * 0.75; g.moveTo(x - q, y - q); g.lineTo(x + q, y + q); g.moveTo(x - q, y + q); g.lineTo(x + q, y - q); }
    else if(b === 4){ g.moveTo(x, y); g.lineTo(x, y - r); }
    g.stroke(); const h = r * 0.62;
    if(m & 32){ g.beginPath(); g.arc(x, y, h, 0, 2 * Math.PI); g.stroke(); }
    if(m & 64) g.strokeRect(x - h, y - h, 2 * h, 2 * h); }
  A.ptGlyph = ptGlyph;
  plain(['PTYPE', 'DDPTYPE'], 'Kiểu điểm (Point Style): 20 kiểu điểm, cỡ điểm theo tỉ lệ màn hình hoặc đơn vị tuyệt đối (PDMODE / PDSIZE)', () => {
    if(A.busy && A.busy()) A.cancel(true); const SV = A.sysvar; let cur = +SV.get('PDMODE') | 0; const sz = +SV.get('PDSIZE') || 0; if(!PT_MODES.includes(cur)) cur = 0;
    const html = '<div class="acw" style="width:310px"><div class="pts-g" id="ptG">' + PT_MODES.map(m => '<canvas data-m="' + m + '" width="96" height="80"' + (m === cur ? ' class="on"' : '') + '></canvas>').join('') + '</div>' +
      '<div class="acw-row"><span class="l">Cỡ điểm:</span>' + K.num('ptS', Math.abs(sz) || 5, { min: 0 }) + '<span id="ptU" style="margin-left:6px;min-width:44px">' + (sz > 0 ? 'Đơn vị' : '%') + '</span></div>' +
      K.rad('ptR', 'rel', 'Cỡ theo tỉ lệ màn hình', sz <= 0) + '<br>' + K.rad('ptR', 'abs', 'Cỡ theo đơn vị tuyệt đối', sz > 0) + '</div>';
    const d = A.dialog({ title: 'Kiểu điểm', cls: 'acw-free', help: 'PTYPE', html, ok: r => { const v = Math.abs(num(K.val(r, 'ptS')) || 5); SV.set('PDMODE', cur); SV.set('PDSIZE', K.radio(r, 'ptR') === 'abs' ? v : -v); try{ draw(); }catch(_){} log('PDMODE = ' + cur + ', PDSIZE = ' + SV.get('PDSIZE')); } });
    const root = d.root, G = root.querySelector('#ptG');
    const paint = () => G.querySelectorAll('canvas').forEach(c => { const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 48, 40); ptGlyph(g, +c.dataset.m, 24, 20, 12, '#e6eaf0'); });
    G.addEventListener('click', e => { const c = e.target.closest('canvas'); if(!c) return; cur = +c.dataset.m; G.querySelectorAll('canvas').forEach(x => x.classList.toggle('on', x === c)); });
    root.querySelectorAll('input[name=ptR]').forEach(x => x.addEventListener('change', () => { root.querySelector('#ptU').textContent = K.radio(root, 'ptR') === 'abs' ? 'Đơn vị' : '%'; }));
    paint(); });

  /* ---------- STYLESMANAGER — Kiểu in (Plot Styles) + Plot Style Table Editor (Chung / Dạng bảng / Dạng biểu mẫu) ---------- */
  const CT = A.ctb, LWS = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
  const PSC = [['o', 'Dùng màu đối tượng'], ['#000000', 'Đen'], ['#ffffff', 'Trắng'], ['#ff0000', 'Đỏ'], ['#ffff00', 'Vàng'], ['#00ff00', 'Xanh lá'], ['#00ffff', 'Lục lam'], ['#0000ff', 'Xanh dương'], ['#ff00ff', 'Tím'], ['x', 'Màu khác…']];
  const lwT = v => v > 0 ? (v / 100).toFixed(2) + ' mm' : 'Dùng bề rộng nét đối tượng';
  const colT = c => { if(!c) return 'Dùng màu đối tượng'; const f = PSC.find(x => x[0] === String(c).toLowerCase()); return f ? f[1] : c; };
  const grayOf = c => { let r, g, b; const s = String(c || ''); let m = /^#?([0-9a-f]{6})$/i.exec(s); if(m){ const n = parseInt(m[1], 16); r = n >> 16 & 255; g = n >> 8 & 255; b = n & 255; } else { m = s.match(/\d+(\.\d+)?/g); if(!m || m.length < 3) return c; [r, g, b] = m.map(Number); } const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b); return 'rgb(' + l + ',' + l + ',' + l + ')'; };
  // Chuyển xám (Grayscale) khi in bằng bảng .ctb
  { const memo = new Map(); let t0 = 0; const _pc = window.plotColor;
    if(_pc && CT) window.plotColor = function(hex){ let out = _pc.apply(this, arguments);
      try{ if(plotMode && typeof _plotStyle === 'string' && _plotStyle.startsWith('ctb:')){ const now = Date.now(); if(now - t0 > 1500){ memo.clear(); t0 = now; } const n = _plotStyle.slice(4); if(!memo.has(n)) memo.set(n, CT.get(n));
        const T = memo.get(n), st = T && T.st && T.st[A.aciOf ? A.aciOf(hex) : 7]; if(st && st.g) out = grayOf(out); } }catch(_){} return out; }; }
  function plotOptsRefresh(){ const s = document.querySelector('#plStyle'); if(!s || !CT) return; const cur = s.value; s.querySelectorAll('option[data-ctb]').forEach(o => o.remove());
    for(const n of Object.keys(CT.all()).sort()){ const o = document.createElement('option'); o.value = 'ctb:' + n; o.textContent = n + '.ctb'; o.dataset.ctb = 1; s.appendChild(o); } if([...s.options].some(o => o.value === cur)) s.value = cur; }
  const pickF = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
  function addPlotStyleWizard(){ return new Promise(res => { const all = CT.all(), names = Object.keys(all).sort(), P = Object.keys(CT.presets || {});
    const html = '<div class="acw" style="width:440px">' + K.grp('Bắt đầu', K.rad('awS', 'new', 'Bắt đầu từ đầu', 1) + '<br>' + K.rad('awS', 'ex', 'Dùng bảng kiểu in có sẵn', 0, { dis: !names.length }) + '<div style="margin:2px 0 4px 22px">' + K.sel('awE', names.map(n => [n, n + '.ctb']), names[0] || '') + '</div>' +
        K.rad('awS', 'pre', 'Dùng mẫu kiểu in', 0) + '<div style="margin:2px 0 4px 22px">' + K.sel('awP', P.map(n => [n, n]), P[0] || '') + '</div>' + K.rad('awS', 'imp', 'Nhập tệp .ctb của AutoCAD…', 0)) +
      K.grp('Tên tệp', K.row('Tên tệp:', K.txt('awN', 'KieuIn' + (names.length + 1)) + '<span style="margin-left:4px">.ctb</span>')) + K.chk('awO', 'Mở Trình sửa bảng kiểu in sau khi tạo', 1) + '</div>';
    A.dialog({ title: 'Thêm bảng kiểu in', cls: 'acw-free', help: 'STYLESMANAGER', html, okText: 'Hoàn tất', ok: r => { const nm = String(K.val(r, 'awN') || '').trim().replace(/\.ctb$/i, ''); if(!nm){ say('Nhập tên tệp.'); return false; } if(all[nm] && !confirm('Đã có "' + nm + '.ctb". Ghi đè?')) return false;
        const S = K.radio(r, 'awS'), open = K.on(r, 'awO');
        const done = T => { CT.put(nm, T); plotOptsRefresh(); log('Đã tạo bảng kiểu in "' + nm + '.ctb"'); res(nm); if(open) setTimeout(() => plotStyleEditor(nm), 0); };
        if(S === 'imp'){ pickF('.ctb').then(async f => { if(!f){ res(null); return; } try{ const T = await CT.parse(await f.arrayBuffer()); done(T); }catch(err){ say('Không đọc được ' + f.name + ': ' + (err.message || err)); res(null); } }); return; }
        if(S === 'ex'){ const v = K.val(r, 'awE'); done(deep(all[v] || { st: {} })); return; }
        if(S === 'pre'){ const p = (CT.presets || {})[K.val(r, 'awP')]; done({ st: p ? p.mk() : {}, desc: p ? p.d : '', src: 'preset' }); return; }
        done({ st: {}, desc: '' }); }, cancel: () => res(null) }); }); }
  // kiểu nét in cố định của bảng kiểu in (chỉ số = giá trị linetype trong .ctb; 31 = dùng kiểu nét đối tượng); độ dài theo mm trên giấy
  const PSLT = A.PSLT = [['Nét liền', []], ['Nét đứt', [5, -2.5]], ['Nét chấm', [0, -1.5]], ['Gạch chấm', [6, -2, 0, -2]], ['Gạch ngắn', [2.5, -1.5]], ['Gạch vừa', [5, -2]], ['Gạch dài', [10, -2.5]],
    ['Gạch ngắn kép', [2.5, -1.25, 2.5, -3]], ['Gạch vừa kép', [5, -1.5, 5, -3]], ['Gạch dài kép', [10, -1.5, 10, -3]], ['Gạch vừa - dài', [10, -2, 5, -2]], ['Gạch vừa - 2 gạch ngắn', [5, -1.5, 2, -1.5, 2, -1.5]],
    ['Gạch dài - gạch ngắn', [10, -2, 2.5, -2]], ['Gạch dài - 2 chấm', [10, -2, 0, -2, 0, -2]], ['Gạch dài - chấm', [10, -2, 0, -2]], ['Gạch vừa - chấm - gạch ngắn - chấm', [5, -1.5, 0, -1.5, 2, -1.5, 0, -1.5]], ['Chấm thưa', [0, -4]],
    ['ISO gạch', [12, -3]], ['ISO gạch thưa', [12, -18]], ['ISO gạch dài - chấm', [24, -3, 0.5, -3]], ['ISO gạch dài - 2 chấm', [24, -3, 0.5, -3, 0.5, -3]], ['ISO gạch dài - 3 chấm', [24, -3, 0.5, -3, 0.5, -3, 0.5, -3]], ['ISO chấm', [0.5, -3]],
    ['ISO gạch dài - gạch ngắn', [24, -3, 6, -3]], ['ISO gạch dài - 2 gạch ngắn', [24, -3, 6, -3, 6, -3]], ['ISO gạch - chấm', [12, -3, 0.5, -3]], ['ISO 2 gạch - chấm', [12, -3, 12, -3, 0.5, -3]], ['ISO gạch - 2 chấm', [12, -3, 0.5, -3, 0.5, -3]],
    ['ISO 2 gạch - 2 chấm', [12, -3, 12, -3, 0.5, -3, 0.5, -3]], ['ISO gạch - 3 chấm', [12, -3, 0.5, -3, 0.5, -3, 0.5, -3]], ['ISO 2 gạch - 3 chấm', [12, -3, 12, -3, 0.5, -3, 0.5, -3, 0.5, -3]]];
  const PSES = [['0', 'Bằng (Butt)'], ['1', 'Vuông (Square)'], ['2', 'Tròn (Round)'], ['3', 'Thoi (Diamond)']], PSJS = [['0', 'Vát nhọn (Miter)'], ['1', 'Vát (Bevel)'], ['2', 'Tròn (Round)'], ['3', 'Thoi (Diamond)']];
  const PSFS = [['64', 'Đặc (Solid)'], ['65', 'Ô cờ'], ['66', 'Lưới ô vuông'], ['67', 'Hình thoi'], ['68', 'Sọc ngang'], ['69', 'Xiên trái'], ['70', 'Xiên phải'], ['71', 'Chấm vuông'], ['72', 'Sọc dọc']];
  A.PSFS = PSFS;
  const lwTable = W => (Array.isArray(W.lwt) && W.lwt.length >= 27 ? W.lwt : (CT.LWMM || LWS.map(v => v / 100)));
  // Edit Lineweights: sửa giá trị bảng bề rộng nét (kiểu đang dùng giá trị cũ đổi theo), đơn vị mm / inch, sắp xếp
  function editLwDlg(W){ return new Promise(res => { const old = lwTable(W).slice(), T = old.slice(); let unit = 'mm';
    const used = v => Object.values(W.st).some(s => s.lw > 0 && Math.abs(s.lw - Math.round(v * 100)) < 0.5);
    const html = '<div class="acw" style="width:380px"><div class="acw-lab">Bề rộng nét:</div><div class="lm-grid" style="height:260px"><table class="acw-cmp"><thead><tr><th>#</th><th>Giá trị</th><th>Đang dùng</th></tr></thead><tbody id="elB"></tbody></table></div>' +
      K.grp('Đơn vị bề rộng nét', K.rad('elU', 'mm', 'Milimét (mm)', 1) + ' &nbsp; ' + K.rad('elU', 'in', 'Inch (in)', 0)) + '<div class="acw-row">' + K.btn('elSort', 'Sắp xếp bề rộng nét') + '</div></div>';
    const d = A.dialog({ title: 'Sửa bề rộng nét', cls: 'acw-free', help: 'STYLESMANAGER', html, ok: () => { pull();
        for(let i = 0; i < T.length; i++) if(Math.abs(T[i] - old[i]) > 1e-9){ const a = Math.round(old[i] * 100), b = Math.round(T[i] * 100); for(const s of Object.values(W.st)) if(s.lw === a) s.lw = b; }
        if(T.every((v, i) => Math.abs(v - (CT.LWMM || [])[i]) < 1e-9)) delete W.lwt; else W.lwt = T.slice(); res(true); }, cancel: () => res(false) });
    const $ = id => d.root.querySelector('#' + id);
    const fmt = v => unit === 'mm' ? (+v).toFixed(2) : (+v / 25.4).toFixed(4);
    const render = () => { $('elB').innerHTML = T.map((v, i) => '<tr><td>' + (i + 1) + '</td><td><input data-i="' + i + '" value="' + fmt(v) + '" style="width:90px"></td><td>' + (used(old[i]) ? '✓' : '') + '</td></tr>').join(''); };
    const pull = () => d.root.querySelectorAll('#elB input[data-i]').forEach(x => { const n = num(x.value); if(n != null && n >= 0) T[+x.dataset.i] = unit === 'mm' ? n : n * 25.4; });
    d.root.querySelectorAll('input[name=elU]').forEach(x => x.addEventListener('change', () => { pull(); unit = K.radio(d.root, 'elU'); render(); }));
    $('elSort').onclick = () => { pull(); const ix = T.map((v, i) => i).sort((a, b) => T[a] - T[b]); const T2 = ix.map(i => T[i]), O2 = ix.map(i => old[i]); T.splice(0, T.length, ...T2); old.splice(0, old.length, ...O2); render(); };
    $('elB').addEventListener('keydown', e => e.stopPropagation()); render(); }); }
  function plotStyleEditor(name){ const T0 = CT.get(name); if(!T0){ say('Không có bảng kiểu in ' + name); return; } const W = deep(T0); W.st = W.st || {}; let sel = new Set([1]), anchor = 1, tab = 'frm';
    const stOf = i => W.st[i] || {};
    const BOOL0 = { g: 1, nd: 1, na: 1, pn: 1, vp: 1 };
    const setSt = (i, f) => { const o = Object.assign({}, W.st[i] || {}); f(o); for(const k of Object.keys(o)) if(o[k] == null || o[k] === '' || (k === 'sc' && o[k] >= 100) || (k === 'lw' && !(o[k] > 0)) || (BOOL0[k] && !o[k])) delete o[k]; if(Object.keys(o).length) W.st[i] = o; else delete W.st[i]; };
    const lwOpts = () => [['0', 'Dùng bề rộng nét đối tượng']].concat(lwTable(W).filter(v => v > 0).map(v => [String(Math.round(v * 100)), (+v).toFixed(2) + ' mm']));
    const rng = (n, a) => { const o = [['0', 'Tự động']]; for(let i = a || 1; i <= n; i++) o.push([String(i), String(i)]); return o; };
    // mô tả thuộc tính: nhãn, danh sách chọn (opts), lấy / đặt giá trị
    const F = {
      dt: { t: 'Bật dither', opts: () => [['1', 'Bật'], ['0', 'Tắt']], get: s => s.nd ? '0' : '1', set: (o, v) => { o.nd = v === '0' ? 1 : 0; } },
      g: { t: 'Chuyển xám', opts: () => [['0', 'Tắt'], ['1', 'Bật']], get: s => s.g ? '1' : '0', set: (o, v) => { o.g = v === '1' ? 1 : 0; } },
      pn: { t: 'Số bút', opts: () => rng(32), get: s => String(s.pn | 0), set: (o, v) => { o.pn = +v | 0; } },
      vp: { t: 'Bút ảo', opts: () => rng(255), get: s => String(s.vp | 0), set: (o, v) => { o.vp = +v | 0; } },
      sc: { t: 'Độ đậm', inp: 1, get: s => String(s.sc != null ? s.sc : 100), set: (o, v) => { const n = num(v); if(n != null) o.sc = Math.max(0, Math.min(100, n)); } },
      lt: { t: 'Kiểu nét', opts: () => [['', 'Dùng kiểu nét đối tượng']].concat(PSLT.map((p, i) => [String(i), p[0]])), get: s => s.lt != null ? String(s.lt) : '', set: (o, v) => { o.lt = v === '' ? null : +v; } },
      ad: { t: 'Thích ứng', opts: () => [['1', 'Bật'], ['0', 'Tắt']], get: s => s.na ? '0' : '1', set: (o, v) => { o.na = v === '0' ? 1 : 0; } },
      lw: { t: 'Bề rộng nét', opts: lwOpts, get: s => String(s.lw > 0 ? s.lw : 0), set: (o, v) => { o.lw = +v; } },
      es: { t: 'Kiểu đầu nét', opts: () => [['', 'Dùng kiểu đầu nét đối tượng']].concat(PSES), get: s => s.es != null ? String(s.es) : '', set: (o, v) => { o.es = v === '' ? null : +v; } },
      js: { t: 'Kiểu nối nét', opts: () => [['', 'Dùng kiểu nối nét đối tượng']].concat(PSJS), get: s => s.js != null ? String(s.js) : '', set: (o, v) => { o.js = v === '' ? null : +v; } },
      fs: { t: 'Kiểu tô', opts: () => [['', 'Dùng kiểu tô đối tượng']].concat(PSFS), get: s => s.fs != null ? String(s.fs) : '', set: (o, v) => { o.fs = v === '' ? null : +v; } },
      d: { t: 'Mô tả', inp: 1, get: s => s.d || '', set: (o, v) => { o.d = String(v).trim(); } } };
    const txtOf = (k, s) => { const f = F[k], v = f.get(s); if(f.inp) return v; const o = f.opts().find(x => x[0] === v); return o ? o[1] : v; };
    const nSt = Object.keys(W.st).length;
    const fsel = (k, w) => K.row(F[k].t + ':', K.sel('pf' + k, F[k].opts(), '') );
    const html = '<div class="acw" style="width:720px">' + K.tabs('pse', [['gen', 'Tổng quát'], ['tbl', 'Dạng bảng'], ['frm', 'Dạng biểu mẫu']], tab) +
      K.pane('pse', 'gen', tab, K.row('Tên tệp bảng kiểu in:', '<b>' + esc(name) + '.ctb</b>') + K.vrow('Mô tả', '<textarea id="peD" rows="4" style="width:100%;box-sizing:border-box">' + esc(W.desc || '') + '</textarea>') +
        K.grp('Thông tin tệp', '<div style="line-height:1.8">Số kiểu: 255<br>Đường dẫn: (lưu trong DVDCAD — xuất .ctb bằng "Lưu thành…")<br>Phiên bản: 1.0<br>Nguồn: ' + (W.src === 'ctb' ? 'nhập từ tệp .ctb' : W.src === 'preset' ? 'mẫu DVDCAD' : 'tạo trong DVDCAD') + '<br>Kiểu khác mặc định: <span id="peN">' + nSt + '</span></div>') +
        K.chk('peAf', 'Áp hệ số tỉ lệ chung cho kiểu nét không theo ISO', W.af, {}) + K.row('Hệ số tỉ lệ:', K.num('peSf', W.sf || 1, { min: 0 }))) +
      K.pane('pse', 'tbl', tab, '<div class="pse-tv" id="peTV"></div><div class="acw-note" style="margin-top:4px">Bấm vào ô để sửa.</div>') +
      K.pane('pse', 'frm', tab, '<div class="acw-cols"><div class="c1" style="flex:0 0 190px"><div class="acw-lab">Kiểu in:</div><div class="acw-list pse-pl" id="pePL" tabindex="0" style="height:330px"></div></div>' +
        '<div class="c1 pse-fm" style="flex:1 1 auto">' + K.grp('Thuộc tính', K.row('Màu:', '<span style="display:flex;gap:4px;flex:1">' + K.sel('peC', PSC, 'o') + '<input type="color" id="peCx" value="#000000" style="width:40px;display:none"></span>') +
          fsel('dt') + fsel('g') + fsel('pn') + fsel('vp') + K.row('Độ đậm:', K.num('pfsc', 100, { min: 0, max: 100 })) + fsel('lt') + fsel('ad') + fsel('lw') + fsel('es') + fsel('js') + fsel('fs')) +
          K.vrow('Mô tả:', '<textarea id="pfd" rows="2" style="width:100%;box-sizing:border-box"></textarea>') + '<div class="acw-row">' + K.btn('peLw', 'Sửa bề rộng nét…') + K.btn('peSa', 'Lưu thành…') + '</div></div></div>') + '</div>';
    const d = A.dialog({ title: 'Trình sửa bảng kiểu in - ' + name + '.ctb', cls: 'acw-free', help: 'STYLESMANAGER', html, okText: 'Lưu & đóng', ok: r => { W.desc = r.querySelector('#peD').value; W.af = K.on(r, 'peAf') ? 1 : 0; if(!W.af) delete W.af; const sf = num(K.val(r, 'peSf')); if(sf > 0 && sf !== 1) W.sf = sf; else delete W.sf; CT.put(name, W); plotOptsRefresh(); try{ forceRedraw(); }catch(_){} log('Đã lưu bảng kiểu in "' + name + '.ctb"'); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    K.bindTabs(root, k => { tab = k; if(k === 'tbl') renderTV(); if(k === 'frm'){ renderPL(); loadForm(); } });
    function renderPL(){ let h = ''; for(let i = 1; i <= 255; i++){ const s = stOf(i); h += '<div class="it' + (sel.has(i) ? ' on' : '') + '" data-v="' + i + '"><span class="sw" style="background:' + (typeof aciHex === 'function' ? aciHex(i) : '#888') + '"></span>Color_' + i + (Object.keys(s).length ? ' •' : '') + '</div>'; } $('pePL').innerHTML = h; }
    function fillSel(el, opts){ const v = el.value; el.innerHTML = opts.map(([a, b]) => '<option value="' + esc(a) + '">' + esc(b) + '</option>').join(''); el.value = v; }
    function loadForm(){ const L = [...sel], s0 = stOf(L[0]); const same = f => L.every(i => f(stOf(i)) === f(s0));
      const c = s0.c || 'o', known = PSC.some(x => x[0] === c); if(same(s => s.c || 'o')){ $('peC').value = known ? c : 'x'; } else $('peC').selectedIndex = -1; $('peCx').style.display = $('peC').value === 'x' ? '' : 'none'; if(s0.c) $('peCx').value = s0.c;
      fillSel($('pflw'), lwOpts());
      for(const k of Object.keys(F)){ const el = $('pf' + k); if(!el) continue; const g = F[k].get; if(same(g)) el.value = g(s0); else if(el.tagName === 'SELECT') el.selectedIndex = -1; else el.value = ''; } }
    const apply = f => { for(const i of sel) setSt(i, f); $('peN').textContent = Object.keys(W.st).length; };
    $('pePL').addEventListener('click', e => { const it = e.target.closest('.it'); if(!it) return; const i = +it.dataset.v;
      if(e.shiftKey){ sel = new Set(); const [a, b] = anchor < i ? [anchor, i] : [i, anchor]; for(let k = a; k <= b; k++) sel.add(k); } else if(e.ctrlKey || e.metaKey){ if(sel.has(i) && sel.size > 1) sel.delete(i); else sel.add(i); anchor = i; } else { sel = new Set([i]); anchor = i; }
      $('pePL').querySelectorAll('.it').forEach(x => x.classList.toggle('on', sel.has(+x.dataset.v))); loadForm(); });
    $('peC').onchange = () => { const v = $('peC').value; $('peCx').style.display = v === 'x' ? '' : 'none'; if(!v) return; apply(o => { o.c = v === 'o' ? null : v === 'x' ? $('peCx').value : v; }); };
    $('peCx').oninput = () => apply(o => { o.c = $('peCx').value; });
    for(const k of Object.keys(F)){ const el = $('pf' + k); if(!el) continue; el.addEventListener('change', () => { if(el.tagName === 'SELECT' && el.selectedIndex < 0) return; const v = el.value; if(k === 'sc' && num(v) == null) return; apply(o => F[k].set(o, v)); }); }
    $('peLw').onclick = async () => { if(await editLwDlg(W)){ loadForm(); if(tab === 'tbl') renderTV(); } };
    $('peSa').onclick = async () => { W.desc = $('peD').value; try{ const u = await CT.build(W); shareOrDownload(new Blob([u], { type: 'application/octet-stream' }), name + '.ctb', 'application/octet-stream'); log('Đã xuất ' + name + '.ctb (chép vào thư mục Plot Styles của AutoCAD để dùng).'); }catch(err){ say('Không xuất được .ctb: ' + (err.message || err)); } };
    // dạng bảng: mỗi cột một kiểu in, bấm ô để sửa
    const ROWS = [['d', 'Mô tả'], ['c', 'Màu'], ['dt'], ['g'], ['pn'], ['vp'], ['sc'], ['lt'], ['ad'], ['lw'], ['es'], ['js'], ['fs']];
    const cellT = (k, i) => k === 'c' ? colT(stOf(i).c) : txtOf(k, stOf(i));
    function renderTV(){ let h = '<table><thead><tr><th class="k" style="position:sticky;left:0;z-index:3">Tên</th>'; for(let i = 1; i <= 255; i++) h += '<th><span class="sw" style="display:inline-block;width:9px;height:9px;margin-right:4px;background:' + (typeof aciHex === 'function' ? aciHex(i) : '#888') + '"></span>Color_' + i + '</th>'; h += '</tr></thead><tbody>';
      for(const [k, t] of ROWS){ h += '<tr><td class="k">' + esc(t || F[k].t) + '</td>'; for(let i = 1; i <= 255; i++) h += '<td class="ed" data-k="' + k + '" data-i="' + i + '">' + esc(cellT(k, i)) + '</td>'; h += '</tr>'; }
      $('peTV').innerHTML = h + '</tbody></table>'; }
    $('peTV').addEventListener('click', e => { const td = e.target.closest('td.ed'); if(!td || td.querySelector('select,input')) return; const k = td.dataset.k, i = +td.dataset.i, s = stOf(i);
      let ctl; if(k === 'c'){ ctl = document.createElement('select'); ctl.innerHTML = PSC.filter(x => x[0] !== 'x').map(([v, t]) => '<option value="' + v + '"' + ((s.c || 'o') === v ? ' selected' : '') + '>' + t + '</option>').join('') + (s.c && !PSC.some(x => x[0] === s.c) ? '<option value="' + s.c + '" selected>' + s.c + '</option>' : ''); }
      else if(F[k].inp){ ctl = document.createElement('input'); ctl.value = F[k].get(s); if(k === 'sc') ctl.type = 'number'; }
      else { ctl = document.createElement('select'); ctl.innerHTML = F[k].opts().map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + '</option>').join(''); ctl.value = F[k].get(s); }
      td.textContent = ''; td.appendChild(ctl); ctl.focus();
      const done = () => { const v = ctl.value; setSt(i, o => { if(k === 'c') o.c = v === 'o' ? null : v; else if(!(k === 'sc' && num(v) == null)) F[k].set(o, v); }); td.textContent = cellT(k, i); $('peN').textContent = Object.keys(W.st).length; };
      ctl.addEventListener('change', () => ctl.blur()); ctl.addEventListener('blur', done, { once: true }); ctl.addEventListener('keydown', ev => { ev.stopPropagation(); if(ev.key === 'Enter'){ ev.preventDefault(); ctl.blur(); } }); });
    renderPL(); loadForm(); return d; }
  A.plotStyleEditor = plotStyleEditor; A.ctbEditor = n => n ? plotStyleEditor(n) : stylesManager();
  function stylesManager(){ let cur = '';
    const html = '<div class="acw" style="width:560px"><div class="acw-lab">Bảng kiểu in theo màu (.ctb) trong DVDCAD:</div><div class="tile-v" id="smV" style="height:250px"></div>' +
      '<div class="acw-row" style="margin-top:6px">' + K.btn('smEd', 'Sửa…') + K.btn('smImp', 'Nhập .ctb…') + K.btn('smExp', 'Xuất .ctb…') + K.btn('smRn', 'Đổi tên…') + K.btn('smDel', 'Xoá') + '</div><div class="acw-note" id="smI" style="margin-top:4px"></div></div>';
    const d = A.dialog({ title: 'Kiểu in (Plot Styles)', cls: 'acw-free', help: 'STYLESMANAGER', html, noCancel: true, okText: 'Đóng' });
    const root = d.root, $ = id => root.querySelector('#' + id);
    function render(){ const all = CT.all(), N = Object.keys(all).sort(); if(cur && !all[cur]) cur = '';
      $('smV').innerHTML = '<div class="tl" data-w="1"><span class="ic">🧙</span>Trình thêm bảng kiểu in</div>' + N.map(n => '<div class="tl' + (n === cur ? ' on' : '') + '" data-n="' + esc(n) + '"><span class="ic">🖨</span>' + esc(n) + '.ctb</div>').join('');
      for(const id of ['smEd', 'smExp', 'smRn', 'smDel']) $(id).disabled = !cur; const T = cur ? all[cur] : null;
      $('smI').textContent = T ? cur + '.ctb — ' + (T.desc || '(không mô tả)') + ' · ' + Object.keys(T.st || {}).length + ' kiểu khác mặc định' : 'Bấm đúp một bảng để sửa, hoặc "Trình thêm bảng kiểu in" để tạo bảng mới.'; }
    $('smV').addEventListener('click', e => { const t = e.target.closest('.tl'); if(!t) return; if(t.dataset.w) return; cur = t.dataset.n; render(); });
    $('smV').addEventListener('dblclick', async e => { const t = e.target.closest('.tl'); if(!t) return; if(t.dataset.w){ const n = await addPlotStyleWizard(); if(n){ cur = n; render(); } return; } plotStyleEditor(t.dataset.n); });
    $('smEd').onclick = () => cur && plotStyleEditor(cur);
    $('smImp').onclick = async () => { const f = await pickF('.ctb'); if(!f) return; try{ const T = await CT.parse(await f.arrayBuffer()); cur = f.name.replace(/\.ctb$/i, ''); CT.put(cur, T); plotOptsRefresh(); render(); log('Đã nhập ' + f.name + ' (' + Object.keys(T.st).length + ' kiểu).'); }catch(err){ say('Không đọc được ' + f.name + ': ' + (err.message || err)); } };
    $('smExp').onclick = async () => { if(!cur) return; try{ const u = await CT.build(CT.get(cur)); shareOrDownload(new Blob([u], { type: 'application/octet-stream' }), cur + '.ctb', 'application/octet-stream'); }catch(err){ say('Không xuất được: ' + (err.message || err)); } };
    $('smRn').onclick = async () => { if(!cur) return; const n = await askStr('Đổi tên bảng kiểu in', 'Tên mới:', cur); if(!n || n === cur) return; const all = CT.all(); if(all[n]){ say('Đã có bảng "' + n + '".'); return; } CT.put(n, all[cur]); CT.del(cur);
      if(A.PS && A.PS.style === 'ctb:' + cur) A.PS.style = 'ctb:' + n; cur = n; plotOptsRefresh(); render(); };
    $('smDel').onclick = () => { if(!cur || !confirm('Xoá bảng kiểu in "' + cur + '.ctb"?')) return; CT.del(cur); cur = ''; plotOptsRefresh(); render(); };
    render(); return d; }
  if(CT){ plain(['STYLESMANAGER', 'PLOTSTYLE', 'CTB', 'CONVERTCTB', 'KIEUIN'], 'Kiểu in (Plot Styles): bảng kiểu in theo màu .ctb — Trình thêm bảng kiểu in, Trình sửa bảng kiểu in (Chung / Dạng bảng / Dạng biểu mẫu), nhập / xuất .ctb của AutoCAD', () => { if(A.busy && A.busy()) A.cancel(true); stylesManager(); });
    // nút ✎ cạnh "Kiểu in" trong PLOT mở trình sửa mới
    const _dl = A.dialog; A.dialog = function(o){ const d = _dl.apply(this, arguments); try{ const b = d && d.root && d.root.querySelector('#plCtbEd'); if(b){ const s = d.root.querySelector('#plStyle'); b.onclick = () => { const v = s && s.value || ''; if(v.startsWith('ctb:')) plotStyleEditor(v.slice(4)); else stylesManager(); }; } }catch(_){} return d; }; }

  /* ---------- VISUALSTYLES — Visual Styles Manager · VSCURRENT · VSSAVE ---------- */
  const VSL = [['2d', '2D khung dây', 'Đối tượng hiện bằng đường thẳng và đường cong (bản vẽ 2D)'], ['wire', 'Khung dây', 'Khung dây 3D: hiện mọi cạnh, không tô mặt'], ['hidden', 'Khuất nét', 'Khung dây có che khuất nét phía sau'],
    ['real', 'Thực tế', 'Tô bóng mượt, vật liệu, bóng đổ'], ['shade', 'Tô bóng', 'Tô bóng mượt, không cạnh'], ['shedge', 'Tô bóng + cạnh', 'Tô bóng mượt kèm cạnh'], ['xray', 'Xuyên thấu (X-quang)', 'Mặt trong suốt một phần (độ mờ 50%)']];
  const VSU = 'dvd:vsuser';
  const vsUser = () => lsGet(VSU, {});
  const vsCur = () => { try{ if(!A.view3D) return '2d'; const u = localStorage.getItem('dvd:vscur'); if(u && vsUser()[u] && A.view3D.vs) return u; const s = A.view3D.ov.querySelector('select[data-a="style"]'); return s ? s.value : (localStorage.getItem('dvd:3dstyle') || 'shedge'); }catch(_){ return '2d'; } };
  // thuộc tính ghi đè của kiểu riêng (null = theo kiểu gốc)
  const VSPROPS = ['face', 'edges', 'edgeCol', 'opacity', 'shadow', 'bg'];
  const vsOver = U => { const o = {}; for(const k of VSPROPS) if(U[k] != null && U[k] !== '') o[k] = U[k]; return Object.keys(o).length ? o : null; };
  async function vsApply(k){ const U = vsUser(), user = U[k] ? k : null; if(user) k = U[user].base; try{ if(user) localStorage.setItem('dvd:vscur', user); else localStorage.removeItem('dvd:vscur'); }catch(_){}
    if(k === '2d'){ if(A.view3D && A.close3D) A.close3D(); log('VSCURRENT: 2D khung dây.'); return; }
    try{ localStorage.setItem('dvd:3dstyle', k); }catch(_){} if(!A.view3D && A.open3D) await A.open3D(); if(A.view3D && A.view3D.setStyle) A.view3D.setStyle(k); if(A.view3D && A.view3D.setVS) A.view3D.setVS(user ? vsOver(U[user]) : null);
    log('VSCURRENT: ' + (user || ((VSL.find(x => x[0] === k) || [, k])[1]))); }
  // mở 3D lại thì giữ kiểu riêng đang dùng
  { const _o3 = A.open3D; if(typeof _o3 === 'function') A.open3D = async function(){ const r = await _o3.apply(this, arguments); try{ const u = localStorage.getItem('dvd:vscur'), U = vsUser(); if(u && U[u] && A.view3D && A.view3D.setVS) A.view3D.setVS(vsOver(U[u])); }catch(_){} return r; }; }
  A.vsApply = vsApply;
  function vsThumb(c, k){ const g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H); const x = W / 2, y = H / 2 + 2, r = Math.min(W, H) * 0.34;
    if(k === '2d' || k === 'wire' || k === 'hidden'){ g.strokeStyle = '#cfd6e0'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke();
      if(k !== '2d') for(const s of [0.35, 0.7]){ g.beginPath(); g.ellipse(x, y, r, r * s, 0, 0, k === 'hidden' ? Math.PI : 2 * Math.PI); g.stroke(); g.beginPath(); g.ellipse(x, y, r * s, r, 0, k === 'hidden' ? -Math.PI / 2 : 0, k === 'hidden' ? Math.PI / 2 : 2 * Math.PI); g.stroke(); }
      if(k === '2d'){ g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); } return; }
    const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r); gr.addColorStop(0, k === 'real' ? '#f6e3c4' : '#e8eef7'); gr.addColorStop(1, k === 'real' ? '#7a5a34' : '#4a5a70');
    g.globalAlpha = k === 'xray' ? 0.5 : 1; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); g.globalAlpha = 1;
    if(k === 'shedge' || k === 'xray'){ g.strokeStyle = '#1b2028'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke(); g.beginPath(); g.ellipse(x, y, r, r * 0.35, 0, 0, 2 * Math.PI); g.stroke(); }
    if(k === 'real'){ g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 1.02, r * 0.8, r * 0.16, 0, 0, 2 * Math.PI); g.fill(); } }
  const VSP = { '2d': [['Kiểu mặt', 'Không'], ['Kiểu cạnh', 'Cạnh 2D'], ['Bóng đổ', 'Tắt'], ['Độ mờ', '—']], wire: [['Kiểu mặt', 'Không'], ['Kiểu cạnh', 'Đường đẳng tham số'], ['Bóng đổ', 'Tắt'], ['Độ mờ', '—']], hidden: [['Kiểu mặt', 'Không'], ['Kiểu cạnh', 'Cạnh mặt, che khuất'], ['Bóng đổ', 'Tắt'], ['Độ mờ', '—']],
    real: [['Kiểu mặt', 'Thực tế'], ['Vật liệu', 'Bật'], ['Bóng đổ', 'Bóng đổ đầy đủ'], ['Độ mờ', 'Tắt']], shade: [['Kiểu mặt', 'Thực tế'], ['Kiểu cạnh', 'Không'], ['Bóng đổ', 'Tắt'], ['Độ mờ', 'Tắt']], shedge: [['Kiểu mặt', 'Thực tế'], ['Kiểu cạnh', 'Cạnh mặt'], ['Bóng đổ', 'Tắt'], ['Độ mờ', 'Tắt']], xray: [['Kiểu mặt', 'Thực tế'], ['Kiểu cạnh', 'Cạnh mặt'], ['Bóng đổ', 'Tắt'], ['Độ mờ', '50%']] };
  function vsManager(){ let cur = vsCur(); const U0 = vsUser(); if(!VSL.some(x => x[0] === cur) && !U0[cur]) cur = '2d';
    const html = '<div class="acw" style="width:470px"><div class="acw-lab">Kiểu hiển thị có trong bản vẽ</div><div class="tile-v" id="vsV" style="height:200px"></div>' +
      '<div class="acw-row" style="margin-top:4px">' + K.btn('vsNew', 'Tạo kiểu mới…') + K.btn('vsApp', 'Áp dụng cho khung nhìn hiện hành', { def: 1 }) + K.btn('vsDel', 'Xoá kiểu') + '</div>' +
      '<div class="acw-lab" id="vsN" style="margin-top:6px"></div><div class="lm-grid" style="height:200px"><table class="acw-cmp"><thead><tr><th>Thuộc tính</th><th>Giá trị</th></tr></thead><tbody id="vsP"></tbody></table></div><div class="acw-note" id="vsD" style="margin-top:4px"></div></div>';
    const d = A.dialog({ title: 'Trình quản lý kiểu hiển thị', cls: 'acw-free', help: 'VISUALSTYLES', html, modeless: true, noCancel: true, okText: 'Đóng' });
    const root = d.root, $ = id => root.querySelector('#' + id);
    function render(){ const U = vsUser(), L = VSL.map(x => ({ k: x[0], t: x[1], d: x[2], base: x[0] })).concat(Object.keys(U).map(n => ({ k: n, t: n, d: 'Kiểu riêng dựa trên ' + ((VSL.find(x => x[0] === U[n].base) || [, U[n].base])[1]), base: U[n].base, user: 1 })));
      $('vsV').innerHTML = L.map(s => '<div class="tl' + (s.k === cur ? ' on' : '') + '" data-k="' + esc(s.k) + '" title="' + esc(s.d) + '"><canvas width="80" height="60" data-b="' + s.base + '"></canvas>' + esc(s.t) + '</div>').join('');
      $('vsV').querySelectorAll('canvas').forEach(c => vsThumb(c, c.dataset.b)); const s = L.find(x => x.k === cur) || L[0];
      $('vsN').textContent = 'Thuộc tính: ' + s.t + (s.k === vsCur() ? ' (đang dùng)' : ''); $('vsD').textContent = s.d; $('vsDel').disabled = !s.user;
      if(!s.user){ $('vsP').innerHTML = (VSP[s.base] || []).map(([a, b]) => '<tr><td>' + esc(a) + '</td><td>' + esc(b) + '</td></tr>').join(''); return; }
      const u = U[s.k], sel = (id, opts, v) => '<select data-p="' + id + '">' + opts.map(([a, b]) => '<option value="' + a + '"' + (String(v == null ? '' : v) === a ? ' selected' : '') + '>' + esc(b) + '</option>').join('') + '</select>';
      const col = (id, v) => '<label class="acw-ck" style="display:inline-flex"><input type="checkbox" data-pc="' + id + '"' + (v ? ' checked' : '') + '><span>Riêng</span></label> <input type="color" data-p="' + id + '" value="' + (v || '#202530') + '"' + (v ? '' : ' disabled') + '>';
      $('vsP').innerHTML = [['Kiểu gốc', sel('base', VSL.filter(x => x[0] !== '2d').map(x => [x[0], x[1]]), u.base)], ['Kiểu mặt', sel('face', [['', 'Theo kiểu gốc'], ['none', 'Không tô mặt']], u.face)],
        ['Hiện cạnh', sel('edges', [['', 'Theo kiểu gốc'], ['none', 'Không'], ['facet', 'Cạnh mặt'], ['iso', 'Đường đẳng tham số']], u.edges)], ['Màu cạnh', col('edgeCol', u.edgeCol)],
        ['Độ mờ (%)', '<input data-p="opacity" type="number" min="5" max="100" placeholder="theo kiểu gốc" value="' + (u.opacity != null ? u.opacity : '') + '" style="width:110px">'],
        ['Bóng đổ', sel('shadow', [['', 'Theo kiểu gốc'], ['off', 'Tắt'], ['ground', 'Bóng trên nền'], ['full', 'Bóng đổ đầy đủ']], u.shadow)], ['Màu nền', col('bg', u.bg)]].map(([a, b]) => '<tr><td>' + esc(a) + '</td><td>' + b + '</td></tr>').join(''); }
    $('vsP').addEventListener('change', e => { const U = vsUser(), u = U[cur]; if(!u) return; const t = e.target, k = t.dataset.p || t.dataset.pc;
      if(t.dataset.pc){ const c = $('vsP').querySelector('input[type=color][data-p="' + k + '"]'); c.disabled = !t.checked; u[k] = t.checked ? c.value : null; }
      else if(k === 'opacity'){ const n = num(t.value); u.opacity = n == null ? null : Math.max(5, Math.min(100, n)); } else if(k) u[k] = t.value || null;
      for(const q of Object.keys(u)) if(u[q] == null) delete u[q]; lsSet(VSU, U); if(vsCur() === cur && A.view3D){ if(k === 'base' && A.view3D.setStyle) A.view3D.setStyle(u.base); if(A.view3D.setVS) A.view3D.setVS(vsOver(u)); } if(k === 'base') render(); });
    $('vsP').addEventListener('keydown', e => e.stopPropagation());
    $('vsV').addEventListener('click', e => { const t = e.target.closest('.tl'); if(!t) return; cur = t.dataset.k; render(); });
    $('vsV').addEventListener('dblclick', e => { const t = e.target.closest('.tl'); if(t) vsApply(t.dataset.k).then(render); });
    $('vsApp').onclick = () => vsApply(cur).then(render);
    $('vsNew').onclick = async () => { const n = await askStr('Tạo kiểu hiển thị mới', 'Tên:', 'Kiểu ' + (Object.keys(vsUser()).length + 1)); if(!n) return; if(VSL.some(x => x[1] === n)){ say('Trùng tên kiểu có sẵn.'); return; } const U = vsUser(); let b = VSL.some(x => x[0] === cur) ? cur : (U[cur] && U[cur].base) || 'shedge'; if(b === '2d') b = 'shedge'; U[n] = U[cur] ? Object.assign({}, U[cur], { base: b }) : { base: b }; lsSet(VSU, U); cur = n; render(); };
    $('vsDel').onclick = () => { const U = vsUser(); if(!U[cur]) return; delete U[cur]; lsSet(VSU, U); cur = '2d'; render(); };
    render(); return d; }
  plain(['VISUALSTYLES'], 'Trình quản lý kiểu hiển thị (Visual Styles Manager): 2D khung dây, khung dây, khuất nét, thực tế, tô bóng, tô bóng + cạnh, X-quang, kiểu riêng', () => { if(document.querySelector('.dvd-dlg[data-cmd="VISUALSTYLES"]')) return; vsManager(); });
  ecmd(['VSCURRENT', 'VS', 'SHADEMODE'], 'Đặt kiểu hiển thị cho khung nhìn hiện hành (2D khung dây / Khung dây / Khuất nét / Thực tế / Tô bóng / tô bóng + Cạnh / X-quang)', async () => {
    const U = vsUser(); const kw = [{ k: '2', t: '2D khung dây' }, { k: 'W', t: 'Khung dây' }, { k: 'H', t: 'Khuất nét' }, { k: 'R', t: 'Thực tế' }, { k: 'S', t: 'Tô bóng' }, { k: 'E', t: 'Tô bóng + cạnh' }, { k: 'X', t: 'Xuyên thấu (X-quang)' }].concat(Object.keys(U).length ? [{ k: 'O', t: 'Kiểu khác' }] : []);
    const cur = vsCur(); const r = await A.getKw('Nhập tuỳ chọn', { kw, def: (VSL.find(x => x[0] === cur) || VSL[0])[1] }); const m = { 2: '2d', W: 'wire', H: 'hidden', R: 'real', S: 'shade', E: 'shedge', X: 'xray' };
    if(r.kw === 'O'){ const s = await A.getStr('Tên kiểu hiển thị (' + Object.keys(U).join(', ') + ')'); if(s.str && U[s.str]) await vsApply(s.str); else if(s.str) log('Không có kiểu "' + s.str + '".'); return; }
    if(r.kw && m[r.kw]) await vsApply(m[r.kw]); });
  ecmd(['VSSAVE'], 'Lưu kiểu hiển thị hiện hành thành kiểu có tên (Save Visual Style)', async () => { const s = await A.getStr('Lưu kiểu hiển thị với tên'); const n = String(s.str || '').trim(); if(!n) return; if(VSL.some(x => x[1] === n)){ log('Trùng tên kiểu có sẵn.'); return; } const U = vsUser(), c0 = vsCur(); U[n] = U[c0] ? Object.assign({}, U[c0]) : { base: c0 === '2d' ? 'shedge' : c0 }; lsSet(VSU, U); log('VSSAVE: đã lưu kiểu "' + n + '".'); });

  /* ---------- ATTACH — chọn tệp tham chiếu rồi mở lệnh gắn tương ứng ---------- */
  let pendFile = null;
  { const _click = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function(){ if(this.type === 'file' && pendFile){ const f = pendFile; pendFile = null;
      try{ const dt = new DataTransfer(); dt.items.add(f); this.files = dt.files; }catch(_){ return _click.apply(this, arguments); } setTimeout(() => this.dispatchEvent(new Event('change', { bubbles: true })), 0); return; } return _click.apply(this, arguments); }; }
  // chạy một lệnh có hộp chọn tệp với tệp đã chọn sẵn (tệp được trao cho hộp chọn tệp đầu tiên lệnh mở)
  A.runWithFile = (c, f) => { pendFile = f; setTimeout(() => { pendFile = null; }, 5000); DVDCmd.run(c); };
  plain(['ATTACH'], 'Gắn tham chiếu (Attach): chọn tệp DWG / DXF, ảnh hoặc PDF rồi mở hộp gắn tương ứng', () => { if(A.busy && A.busy()) A.cancel(true);
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.dwg,.dxf,.pdf,.png,.jpg,.jpeg,.bmp,.gif,.webp,.tif,.tiff'; i.onchange = () => { const f = i.files[0]; if(!f) return; const n = f.name.toLowerCase();
      const c = /\.(dwg|dxf)$/.test(n) ? 'XATTACH' : /\.pdf$/.test(n) ? 'PDFATTACH' : /\.(png|jpe?g|bmp|gif|webp|tiff?)$/.test(n) ? 'IMAGEATTACH' : null; if(!c){ say('Loại tệp chưa hỗ trợ.'); return; } log('ATTACH: ' + f.name + ' → ' + c); A.runWithFile(c, f); }; i.click(); });

  /* ---------- REINIT — Re-initialization ---------- */
  plain(['REINIT'], 'Khởi tạo lại (Re-initialization): nạp lại tệp PGP (lệnh tắt), nạp lại giao diện', () => {
    const html = '<div class="acw" style="width:380px">' + K.grp('Khởi tạo cổng vào / ra', K.chk('riD', 'Bàn số hoá', 0, { dis: 1 }) + '<br>' + K.chk('riP', 'Máy vẽ', 0, { dis: 1 })) +
      K.grp('Khởi tạo thiết bị và tệp', K.chk('riD2', 'Bàn số hoá', 0, { dis: 1 }) + '<br>' + K.chk('riP2', 'Máy vẽ', 0, { dis: 1 }) + '<br>' + K.chk('riG', 'Tệp PGP (lệnh tắt)', 1) + '<br>' + K.chk('riU', 'Giao diện DVDCAD (nạp lại trang — thay đổi chưa lưu sẽ mất)', 0)) + '</div>';
    A.dialog({ title: 'Khởi tạo lại', cls: 'acw-free', help: 'REINIT', html, ok: r => {
      if(K.on(r, 'riG') && A.applyAlias){ const D = new Set(lsGet('dvd:aliasdel', []).map(String)); let n = 0; for(const [a, c] of (A.ACAD_PGP || [])) if(!D.has(a) && A.applyAlias(a, c)) n++; for(const [a, c] of Object.entries(lsGet('dvd:alias', {}) || {})) if(A.applyAlias(a, c)) n++; log('REINIT: đã nạp lại ' + n + ' lệnh tắt (acad.pgp + lệnh tắt riêng).'); }
      if(K.on(r, 'riU')) setTimeout(() => { try{ location.reload(); }catch(_){} }, 50); } }); });

  /* ---------- TEXTSCR / HISTORY — Cửa sổ văn bản · DBLIST ---------- */
  function textWin(title, text, help){ const html = '<div class="acw" style="width:760px"><div class="acw-row" style="margin-bottom:4px">' + K.btn('twC', 'Sao chép') + K.btn('twH', 'Sao chép tất cả') + K.btn('twP', 'Dán vào dòng lệnh') + '<span class="l"></span>' + K.txt('twF', '', { ph: 'Tìm…' }) + K.btn('twN', 'Tìm tiếp') + '</div><textarea class="txw-t" id="twT" rows="22" readonly spellcheck="false" style="height:360px;min-height:360px"></textarea></div>';
    const d = A.dialog({ title, cls: 'acw-free', help: help || 'TEXTSCR', html, modeless: true, noCancel: true, okText: 'Đóng' }); const $ = id => d.root.querySelector('#' + id), t = $('twT'); t.value = text; t.scrollTop = t.scrollHeight;
    const cp = s => { try{ navigator.clipboard.writeText(s).then(() => say('Đã sao chép'), () => {}); }catch(_){ t.select(); document.execCommand('copy'); } };
    $('twC').onclick = () => cp(t.value.slice(t.selectionStart, t.selectionEnd) || t.value); $('twH').onclick = () => cp(t.value);
    $('twP').onclick = () => { const s = t.value.slice(t.selectionStart, t.selectionEnd).split(/\r?\n/)[0].replace(/^.*?:\s*/, '').trim(); const i = document.querySelector('#dvdCmd input'); if(!i || !s) return; i.value = s; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); };
    let at = 0; const find = () => { const q = $('twF').value.toLowerCase(); if(!q) return; const v = t.value.toLowerCase(); let k = v.indexOf(q, at); if(k < 0) k = v.indexOf(q); if(k < 0){ say('Không tìm thấy "' + $('twF').value + '"'); return; } t.focus(); t.setSelectionRange(k, k + q.length); at = k + q.length; const ln = v.slice(0, k).split('\n').length; t.scrollTop = Math.max(0, (ln - 5) * 15); };
    $('twN').onclick = find; $('twF').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); find(); } }); return d; }
  A.textWin = textWin;
  const docNm = () => { try{ return currentName || 'Drawing1.dwg'; }catch(_){ return 'Drawing1.dwg'; } };
  plain(['TEXTSCR', 'HISTORY', 'COMMANDHISTORY'], 'Cửa sổ văn bản (Text Window): lịch sử dòng lệnh, sao chép, dán vào dòng lệnh, tìm', () => textWin('Cửa sổ văn bản DVDCAD - ' + docNm(), (DVDCmd.history ? DVDCmd.history() : []).slice(-3000).join('\n')));
  const F4 = v => { const f = A.fmt ? A.fmt(+v || 0) : (+v || 0).toFixed(4); return String(f).padStart(10); };
  function listOf(e, i){ const t = e.rgn ? 'REGION' : e.type === 'TEXT' && e.mt ? 'MTEXT' : e.type === 'POLYLINE' ? 'LWPOLYLINE' : e.type, P = (l, s) => ' '.repeat(Math.max(0, 22 - l.length)) + l + s;
    const L = ['', P(t, '   Lớp: "' + (e.layer || '0') + '"'), P('', '   Không gian: Mô hình'), P('Màu: ', e.bl ? 'BYLAYER' : String(e.col || '')) + (e.lt ? '   Kiểu nét: "' + e.lt + '"' : '') + (e.blk ? '   Khối: ' + e.blk : ''), P('Thẻ (handle) = ', (i + 1).toString(16).toUpperCase())];
    if(e.type === 'LINE'){ L.push(P('từ điểm, ', 'X=' + F4(e.x1) + '  Y=' + F4(e.y1) + '  Z=' + F4(0)), P('đến điểm, ', 'X=' + F4(e.x2) + '  Y=' + F4(e.y2) + '  Z=' + F4(0)), P('Dài = ', F4(Math.hypot(e.x2 - e.x1, e.y2 - e.y1)).trim() + ',  Góc trong mặt XY = ' + r6(((Math.atan2(e.y2 - e.y1, e.x2 - e.x1) * 180 / Math.PI) + 360) % 360))); }
    else if(e.type === 'CIRCLE') L.push(P('tâm ', 'X=' + F4(e.cx) + '  Y=' + F4(e.cy)), P('bán kính ', F4(e.r).trim()), P('chu vi ', F4(2 * Math.PI * e.r).trim()), P('diện tích ', F4(Math.PI * e.r * e.r).trim()));
    else if(e.type === 'ARC') L.push(P('tâm ', 'X=' + F4(e.cx) + '  Y=' + F4(e.cy)), P('bán kính ', F4(e.r).trim()), P('góc đầu ', String(r6(e.a1))), P('góc cuối ', String(r6(e.a2))));
    else if(e.type === 'POLYLINE'){ const c = A.G && A.G.curveOf ? A.G.curveOf(e) : null; L.push(P(e.closed ? 'Kín' : 'Hở', ''), P('chiều dài ', F4(c ? c.len : 0).trim()) + (e.closed && A.G ? '   diện tích ' + F4(Math.abs(A.G.area(e.vertices || []))).trim() : '')); for(const v of (e.vertices || []).slice(0, 200)) L.push(P('tại điểm ', 'X=' + F4(v.x) + '  Y=' + F4(v.y))); }
    else if(e.type === 'TEXT') L.push(P('Kiểu chữ = ', '"' + (e.style || 'Standard') + '"'), P('điểm đặt, ', 'X=' + F4(e.x) + '  Y=' + F4(e.y)), P('cao ', F4(e.h || 0).trim()), P('chữ ', String(e.text || '').replace(/\n/g, '\\P').slice(0, 200)), P('góc xoay ', String(r6(e.rot || 0))));
    else if(e.type === 'ELLIPSE') L.push(P('tâm ', 'X=' + F4(e.cx) + '  Y=' + F4(e.cy)));
    else if(e.type === 'POINT') L.push(P('tại điểm, ', 'X=' + F4(e.x) + '  Y=' + F4(e.y)));
    return L.join('\n'); }
  plain(['DBLIST'], 'Liệt kê thông tin mọi đối tượng trong bản vẽ (Database List) vào cửa sổ văn bản', () => { const E = modelEntities.filter(Boolean), N = Math.min(E.length, 5000);
    const out = ['Lệnh: DBLIST — ' + E.length + ' đối tượng' + (E.length > N ? ' (hiện ' + N + ' đối tượng đầu)' : '')]; for(let i = 0; i < N; i++) out.push(listOf(E[i], i)); textWin('DBLIST - ' + docNm(), out.join('\n'), 'DBLIST'); log('DBLIST: ' + E.length + ' đối tượng.'); });

  /* ---------- CENTERMARK / CENTERLINE liên kết + CENTERRESET / CENTERDISASSOCIATE / CENTERREASSOCIATE ---------- */
  const CEN = Object.assign({ exe: 0, lt: 'CENTER', lay: '.' }, lsGet('dvd:center', {}));
  const cenSave = () => lsSet('dvd:center', CEN);
  const cTxt = () => A.dimTxt ? A.dimTxt() : 2.5;
  const cenExe = () => CEN.exe > 0 ? CEN.exe : cTxt() * 1.2;
  const ltIf = n => { try{ if(!n || n === 'BYLAYER' || n === '.') return null; if(LTYPES[n]) return n; if(A.loadLT && A.loadLT(n)) return n; }catch(_){} return null; };
  const segOf = e => [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
  const near = (p, q, s) => Math.hypot(p.x - q.x, p.y - q.y) <= 1e-7 * (1 + s);
  const simil = (P0, P1, Q0, Q1) => { const dx = P1.x - P0.x, dy = P1.y - P0.y, ex = Q1.x - Q0.x, ey = Q1.y - Q0.y, d2 = dx * dx + dy * dy || 1, a = (ex * dx + ey * dy) / d2, b = (ey * dx - ex * dy) / d2;
    return { f: p => ({ x: Q0.x + a * (p.x - P0.x) - b * (p.y - P0.y), y: Q0.y + b * (p.x - P0.x) + a * (p.y - P0.y) }), k: Math.hypot(a, b) }; };
  function cmLines(d){ const c = d.c, s = d.s, ext = d.r + d.e, L = [[c.x - s, c.y, c.x + s, c.y], [c.x, c.y - s, c.x, c.y + s]]; for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.push([c.x + dx * s * 1.4, c.y + dy * s * 1.4, c.x + dx * ext, c.y + dy * ext]); return L; }
  function clLine(d){ const a = d.a; let b1 = d.b[0], b2 = d.b[1]; if((a[1].x - a[0].x) * (b2.x - b1.x) + (a[1].y - a[0].y) * (b2.y - b1.y) < 0){ const t = b1; b1 = b2; b2 = t; }
    const p = { x: (a[0].x + b1.x) / 2, y: (a[0].y + b1.y) / 2 }, q = { x: (a[1].x + b2.x) / 2, y: (a[1].y + b2.y) / 2 }, L = Math.hypot(q.x - p.x, q.y - p.y) || 1, ux = (q.x - p.x) / L, uy = (q.y - p.y) / L;
    return [p.x - ux * d.e, p.y - uy * d.e, q.x + ux * d.e, q.y + uy * d.e]; }
  const cenLayer = () => { const n = String(CEN.lay || '.'); if(n === '.' || !n) return null; if(!A.layerNames().includes(n)) A.addLayer(n); return n; };
  function cenProps(x){ A.newProps(x); const L = cenLayer(); if(L){ x.layer = L; x.bl = 1; x.col = A.layerHex(L); } return x; }
  const setLn = (x, q) => { x.x1 = q[0]; x.y1 = q[1]; x.x2 = q[2]; x.y2 = q[3]; return x; };
  function cmNew(o, keep){ const d = { c: { x: o.cx, y: o.cy }, r: o.r, s: Math.min(o.r * 0.25, cTxt() * 1.2), e: cenExe() }, gid = (keep && keep.grp) || A.newGroupId('CM'), lt = ltIf(CEN.lt);
    return cmLines(d).map((q, i) => { const x = keep && keep.props ? Object.assign({ type: 'LINE' }, keep.props) : cenProps({ type: 'LINE' }); setLn(x, q); x.cmi = i; x.grp = gid; x.blk = '*CENTERMARK'; if(i >= 2 && lt && !(keep && keep.props)) x.lt = lt; if(i === 0) x.cmk = d; return x; }); }
  function clNew(a, b){ const d = { a: segOf(a), b: segOf(b), e: cenExe() }, x = setLn(cenProps({ type: 'LINE' }), clLine(d)); const lt = ltIf(CEN.lt); if(lt) x.lt = lt; x.cln = d; x.grp = A.newGroupId('CL'); x.blk = '*CENTERLINE'; return x; }
  // dời / xoay / co giãn dấu tâm, đường tâm: cập nhật dữ liệu theo nét thực tế · sửa đường tròn / đường thẳng gốc: dựng lại dấu tâm, đường tâm bám theo
  function cenSync(w){ if(!w || w.type !== 'LINE') return;
    if(w.cmk && w.cmi === 0){ const q = cmLines(w.cmk)[0], P = segOf(w); if(near(P[0], { x: q[0], y: q[1] }, Math.abs(q[0]) + Math.abs(q[1])) && near(P[1], { x: q[2], y: q[3] }, Math.abs(q[2]) + Math.abs(q[3]))) return;
      const T = simil({ x: q[0], y: q[1] }, { x: q[2], y: q[3] }, P[0], P[1]), d = w.cmk = deep(w.cmk); d.c = T.f(d.c); d.r *= T.k; d.s *= T.k; d.e *= T.k; }
    if(w.cln){ const q = clLine(w.cln), P = segOf(w); if(near(P[0], { x: q[0], y: q[1] }, Math.abs(q[0]) + Math.abs(q[1])) && near(P[1], { x: q[2], y: q[3] }, Math.abs(q[2]) + Math.abs(q[3]))) return;
      const T = simil({ x: q[0], y: q[1] }, { x: q[2], y: q[3] }, P[0], P[1]), d = w.cln = deep(w.cln); d.a = d.a.map(T.f); d.b = d.b.map(T.f); d.e *= T.k; } }
  function cenAssoc(ch){ if(!ch) return ch; for(const e of ch.add || []) cenSync(e); for(const x of ch.rep || []) if(x && x[1]) cenSync(x[1]);
    const src = (ch.rep || []).filter(x => x && x[0] && x[1] && /^(CIRCLE|ARC|LINE)$/.test(x[0].type)); if(!src.length) return ch;
    const car = modelEntities.filter(e => e && ((e.cmk && e.cmi === 0) || e.cln) && !(e.cmk || e.cln).na); if(!car.length) return ch;
    const olds = new Set(); for(const x of ch.rep || []) if(x && x[0]) olds.add(x[0]); for(const e of ch.del || []) olds.add(e);
    const extra = [];
    for(const [o, w] of src){
      if((o.type === 'CIRCLE' || o.type === 'ARC') && (w.type === 'CIRCLE' || w.type === 'ARC')){ const sc = Math.abs(o.cx) + Math.abs(o.cy) + o.r;
        for(const k of car){ const d = k.cmk; if(!d || olds.has(k) || !near(d.c, { x: o.cx, y: o.cy }, sc) || Math.abs(d.r - o.r) > 1e-7 * (1 + o.r) || A.isLocked(k)) continue;
          const nd = deep(d), kk = o.r > 0 ? w.r / o.r : 1; nd.c = { x: w.cx, y: w.cy }; nd.r = w.r; nd.s *= kk; const L = cmLines(nd);
          for(const m of A.groupMembers(k.grp)){ if(m.cmi == null || olds.has(m) || !L[m.cmi]) continue; const mw = deep(m); delete mw.userAdded; setLn(mw, L[m.cmi]); if(m.cmi === 0) mw.cmk = nd; extra.push([m, mw]); olds.add(m); } } }
      else if(o.type === 'LINE' && w.type === 'LINE'){ const os = segOf(o), sc = Math.abs(o.x1) + Math.abs(o.y1) + Math.abs(o.x2) + Math.abs(o.y2), same = s2 => (near(s2[0], os[0], sc) && near(s2[1], os[1], sc)) || (near(s2[0], os[1], sc) && near(s2[1], os[0], sc));
        for(const k of car){ const d = k.cln; if(!d || olds.has(k) || A.isLocked(k)) continue; let nd = null; if(same(d.a)){ nd = deep(d); nd.a = segOf(w); } else if(same(d.b)){ nd = deep(d); nd.b = segOf(w); } if(!nd) continue;
          const kw = setLn(deep(k), clLine(nd)); delete kw.userAdded; kw.cln = nd; extra.push([k, kw]); olds.add(k); } } }
    return extra.length ? Object.assign({}, ch, { rep: (ch.rep || []).concat(extra) }) : ch; }
  { const _c = A.commit; A.commit = function(ch, msg){ try{ ch = cenAssoc(ch); }catch(err){ console.warn('center assoc', err); } return _c.apply(this, [ch, msg].concat([].slice.call(arguments, 2))); }; }
  ecmd(['CENTERMARK', 'CM', 'DIMCENTER', 'DCE'], 'Dấu tâm liên kết (Center Mark) cho đường tròn / cung — bám theo khi dời, đổi bán kính', async () => {
    for(;;){ const r = await A.getEnt('Chọn đường tròn hoặc cung để thêm dấu tâm', { filter: e => e.type === 'CIRCLE' || e.type === 'ARC' }); const e = r.ent; if(!e) return; A.commit({ add: cmNew(e) }, 'Dấu tâm'); } });
  ecmd(['CENTERLINE', 'CL'], 'Đường tâm liên kết (Centerline) giữa 2 đường thẳng — bám theo khi sửa đường', async () => {
    const r1 = await A.getEnt('Chọn đường thứ nhất', { filter: e => e.type === 'LINE' && !e.cln && e.cmi == null }); if(!r1.ent) return;
    const r2 = await A.getEnt('Chọn đường thứ hai', { filter: e => e.type === 'LINE' && e !== r1.ent && !e.cln && e.cmi == null }); if(!r2.ent) return; A.commit({ add: [clNew(r1.ent, r2.ent)] }, 'Đường tâm'); });
  const isCen = e => e && e.type === 'LINE' && (e.cmi != null || e.cln || e.blk === '*CENTERMARK' || e.blk === '*CENTERLINE');
  // gom các dấu tâm / đường tâm đã chọn thành { kind, carrier, members }
  function cenItems(sel){ const out = [], seen = new Set(); for(const e of sel){ if(!isCen(e)) continue; const key = e.grp || e; if(seen.has(key)) continue; seen.add(key);
      if(e.cln || e.blk === '*CENTERLINE') out.push({ k: 'cl', c: e, m: [e] }); else { const M = e.grp ? A.groupMembers(e.grp) : [e]; out.push({ k: 'cm', c: M.find(x => x.cmi === 0 && x.cmk) || null, m: M }); } } return out; }
  async function cenSel(pr, cur){ let sel = cur && cur.pre && cur.pre.length ? cur.pre : null; if(cur) cur.pre = []; if(!sel){ const s = await A.getSel(pr, { filter: isCen }); sel = s.sel || []; } return cenItems(sel.filter(e => !A.isLocked(e))); }
  ecmd(['CENTERDISASSOCIATE'], 'Bỏ liên kết dấu tâm / đường tâm với đối tượng gốc', async (_, cur) => { const I = (await cenSel('Chọn dấu tâm hoặc đường tâm', cur)).filter(x => x.c && !(x.c.cmk || x.c.cln).na); if(!I.length){ log('Không có dấu tâm / đường tâm liên kết nào.'); return; }
    const rep = I.map(x => { const w = deep(x.c); delete w.userAdded; (w.cmk || w.cln).na = 1; return [x.c, w]; }); A.commit({ rep }, 'CENTERDISASSOCIATE: ' + rep.length); log('Đã bỏ liên kết ' + rep.length + ' dấu tâm / đường tâm.'); });
  ecmd(['CENTERREASSOCIATE'], 'Liên kết lại dấu tâm / đường tâm với đường tròn, cung hoặc 2 đường thẳng', async () => {
    const r = await A.getEnt('Chọn dấu tâm hoặc đường tâm', { filter: isCen }); if(!r.ent) return; const it = cenItems([r.ent])[0]; if(!it) return;
    if(it.k === 'cm'){ const s = await A.getEnt('Chọn đường tròn hoặc cung', { filter: e => e.type === 'CIRCLE' || e.type === 'ARC' }); if(!s.ent) return; const p0 = it.m[0];
      const N = cmNew(s.ent, { grp: p0.grp, props: { layer: p0.layer, col: p0.col, bl: p0.bl, lw: p0.lw } }); N.forEach((x, i) => { const o = it.m.find(m => m.cmi === i) || it.m[i]; if(o && o.lt) x.lt = o.lt; else if(i >= 2){ const lt = ltIf(CEN.lt); if(lt) x.lt = lt; } for(const k of Object.keys(x)) if(x[k] == null) delete x[k]; });
      A.commit({ del: it.m, add: N }, 'CENTERREASSOCIATE'); log('Đã liên kết lại dấu tâm.'); return; }
    const a = await A.getEnt('Chọn đường thứ nhất', { filter: e => e.type === 'LINE' && !isCen(e) }); if(!a.ent) return; const b = await A.getEnt('Chọn đường thứ hai', { filter: e => e.type === 'LINE' && e !== a.ent && !isCen(e) }); if(!b.ent) return;
    const w = deep(it.c); delete w.userAdded; w.cln = { a: segOf(a.ent), b: segOf(b.ent), e: (it.c.cln && it.c.cln.e) || cenExe() }; setLn(w, clLine(w.cln)); w.blk = '*CENTERLINE'; if(!w.grp) w.grp = A.newGroupId('CL'); A.commit({ rep: [[it.c, w]] }, 'CENTERREASSOCIATE'); log('Đã liên kết lại đường tâm.'); });
  ecmd(['CENTERRESET'], 'Đặt lại đường kéo dài của dấu tâm / đường tâm theo CENTEREXE', async (_, cur) => { const I = (await cenSel('Chọn dấu tâm hoặc đường tâm', cur)).filter(x => x.c); if(!I.length){ log('Không có dấu tâm / đường tâm nào.'); return; } const e0 = cenExe(), rep = [];
    for(const x of I){ if(x.k === 'cl'){ const w = deep(x.c); delete w.userAdded; w.cln.e = e0; setLn(w, clLine(w.cln)); rep.push([x.c, w]); continue; } const d = deep(x.c.cmk); d.e = e0; const L = cmLines(d); for(const m of x.m){ if(m.cmi == null || !L[m.cmi]) continue; const w = deep(m); delete w.userAdded; setLn(w, L[m.cmi]); if(m.cmi === 0) w.cmk = d; rep.push([m, w]); } }
    A.commit({ rep }, 'CENTERRESET'); log('CENTERRESET: đã đặt lại ' + I.length + ' dấu tâm / đường tâm.'); });
  if(A.sysvar && A.sysvar.def){ A.sysvar.def('CENTEREXE', { d: 'Độ dài đường kéo dài của dấu tâm / đường tâm (0 = theo cao chữ kích thước)', get: () => CEN.exe || 0, set: v => { if(+v >= 0){ CEN.exe = +v; cenSave(); } } });
    A.sysvar.def('CENTERLTYPE', { d: 'Kiểu nét của dấu tâm / đường tâm (CENTER, CENTER2…, "." = theo lớp)', s: 1, get: () => CEN.lt, set: v => { CEN.lt = String(v || '.').toUpperCase(); cenSave(); } });
    A.sysvar.def('CENTERLAYER', { d: 'Lớp vẽ dấu tâm / đường tâm ("." = lớp hiện hành)', s: 1, get: () => CEN.lay, set: v => { CEN.lay = String(v || '.').trim() || '.'; cenSave(); } }); }

  /* ---------- BSAVEAS · EXPORTLAYOUT · TREESTAT · COMPARECLOSE ---------- */
  plain(['BSAVEAS'], 'Lưu khối đang sửa thành khối mới (Save Block As): tên, mô tả, lưu ra tệp bản vẽ', () => { const R = A.refeditLocal ? A.refeditLocal() : null; if(!R){ log('Không có khối nào đang sửa (BEDIT / REFEDIT).'); return; }
    const N = blockNames(); const html = '<div class="acw" style="width:480px"><div class="acw-cols"><div class="c1">' + K.row('Tên khối:', K.txt('bsN', R.name + '_1')) + K.list('bsL', N.map(n => ({ v: n, t: n })), '', 'height:150px') + '</div><div class="c2"><div class="acw-lab">Xem trước</div>' + K.canvas('bsP', 150, 120) + '</div></div>' +
      K.vrow('Mô tả:', '<textarea id="bsD" rows="2" style="width:100%;box-sizing:border-box"></textarea>') + K.chk('bsF', 'Lưu định nghĩa khối ra tệp bản vẽ (.dxf)', 0) + '</div>';
    const d = A.dialog({ title: 'Lưu khối thành', cls: 'acw-free', help: 'BSAVEAS', html, ok: r => { const n = String(K.val(r, 'bsN') || '').trim(); if(!n || /[<>\/\\":;?*|,=`]/.test(n)){ say('Tên khối không hợp lệ.'); return false; }
        const lib = A.blockLib(); if((lib[n] || N.includes(n)) && !confirm('Khối "' + n + '" đã có. Ghi đè định nghĩa trong thư viện?')) return false;
        lib[n] = { base: { x: 0, y: 0 }, ents: deep(R.ents), desc: K.val(r, 'bsD') || '' }; A.saveBlockLib(lib); log('BSAVEAS: đã lưu khối "' + n + '" (' + R.ents.length + ' đối tượng) vào thư viện — khối "' + R.name + '" đang sửa giữ nguyên.');
        if(K.on(r, 'bsF')){ try{ shareOrDownload(new Blob([entitiesToDXF(deep(R.ents))], { type: 'application/dxf' }), n + '.dxf', 'application/dxf'); }catch(err){ console.warn(err); } } } });
    K.bindList(d.root.querySelector('#bsL'), v => { d.root.querySelector('#bsN').value = v; }); K.paint(d.root.querySelector('#bsP'), deep(R.ents).map(e => { e.col = e.col || '#cfd6e0'; return e; })); });
  function clipSeg(p, q, r){ let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y, P = [-dx, dx, -dy, dy], Q = [p.x - r.x0, r.x1 - p.x, p.y - r.y0, r.y1 - p.y];
    for(let i = 0; i < 4; i++){ if(P[i] === 0){ if(Q[i] < 0) return null; } else { const t = Q[i] / P[i]; if(P[i] < 0){ if(t > t1) return null; if(t > t0) t0 = t; } else { if(t < t0) return null; if(t < t1) t1 = t; } } }
    return [{ x: p.x + t0 * dx, y: p.y + t0 * dy }, { x: p.x + t1 * dx, y: p.y + t1 * dy }]; }
  plain(['EXPORTLAYOUT'], 'Xuất layout hiện hành ra bản vẽ mới ở không gian mô hình (DXF): khung tên, nét trong khung nhìn đã cắt theo khung', async () => {
    let L = null; try{ L = dwgLayouts[currentLayout]; }catch(_){} if(!L || L.isModel){ log('EXPORTLAYOUT chỉ dùng được khi đang ở một layout (không phải Model).'); return; }
    const out = []; let cut = 0;
    for(const e of entities){ if(!e || e.vpf || (A.isHiddenE && A.isHiddenE(e))) continue; const c = e.clip; const w = deep(e); delete w.userAdded; delete w.clip;
      if(!c){ out.push(w); continue; } const R = { x0: c.x, y0: c.y, x1: c.x + c.w, y1: c.y + c.h }, bb = entBBox(e); if(bb && (bb.x1 < R.x0 || bb.x0 > R.x1 || bb.y1 < R.y0 || bb.y0 > R.y1)) continue;
      if(e.type === 'LINE'){ const s = clipSeg({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }, R); if(!s) continue; w.x1 = s[0].x; w.y1 = s[0].y; w.x2 = s[1].x; w.y2 = s[1].y; out.push(w); cut++; continue; }
      if(e.type === 'POLYLINE' && !(e.vertices || []).some(v => v.b)){ const V = e.vertices || [], n = V.length, M = e.closed ? n : n - 1; let run = null; const flush = () => { if(run && run.length > 1){ const p = deep(w); p.vertices = run; p.closed = false; out.push(p); } run = null; };
        for(let i = 0; i < M; i++){ const s = clipSeg(V[i], V[(i + 1) % n], R); if(!s){ flush(); continue; } if(run && near(run[run.length - 1], s[0], 1)) run.push(s[1]); else { flush(); run = [s[0], s[1]]; } } flush(); cut++; continue; }
      out.push(w); }
    if(!out.length){ log('Layout không có đối tượng nhìn thấy.'); return; }
    let txt; try{ txt = entitiesToDXF(out); }catch(err){ console.error(err); log('Không tạo được DXF.'); return; }
    const base = docNm().replace(/\.[^.]+$/, ''); await shareOrDownload(new Blob([txt], { type: 'application/dxf' }), base + '_' + String(L.name || 'Layout').replace(/[\\/:*?"<>|]+/g, '_') + '.dxf', 'application/dxf');
    log('EXPORTLAYOUT: đã xuất ' + out.length + ' đối tượng của layout "' + L.name + '" ra không gian mô hình (' + cut + ' nét trong khung nhìn đã cắt theo khung).'); });
  plain(['TREESTAT'], 'Thống kê chỉ mục không gian của bản vẽ (số đối tượng, phạm vi, mật độ ô lưới)', () => { const E = entities.filter(Boolean); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const B = [];
    for(const e of E){ const b = entBBox(e); if(!b) continue; B.push(b); if(b.x0 < x0) x0 = b.x0; if(b.y0 < y0) y0 = b.y0; if(b.x1 > x1) x1 = b.x1; if(b.y1 > y1) y1 = b.y1; }
    if(!B.length){ log('TREESTAT: bản vẽ trống.'); return; } const N = 16, cw = (x1 - x0) / N || 1, ch = (y1 - y0) / N || 1, cnt = new Array(N * N).fill(0);
    for(const b of B){ const i0 = Math.max(0, Math.min(N - 1, Math.floor((b.x0 - x0) / cw))), i1 = Math.max(0, Math.min(N - 1, Math.floor((b.x1 - x0) / cw))), j0 = Math.max(0, Math.min(N - 1, Math.floor((b.y0 - y0) / ch))), j1 = Math.max(0, Math.min(N - 1, Math.floor((b.y1 - y0) / ch))); for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++) cnt[j * N + i]++; }
    const used = cnt.filter(v => v > 0), mx = Math.max(...cnt), avg = used.reduce((a, b) => a + b, 0) / (used.length || 1); const T = new Map(); for(const e of E) T.set(e.type, (T.get(e.type) || 0) + 1);
    const lines = ['TREESTAT — ' + docNm(), 'Không gian: ' + (modelEntities === entities ? 'Mô hình' : 'Layout') + ' · ' + E.length + ' đối tượng (' + B.length + ' có phạm vi)', 'Phạm vi: (' + r6(x0) + ', ' + r6(y0) + ') → (' + r6(x1) + ', ' + r6(y1) + ')',
      'Lưới chỉ mục ' + N + '×' + N + ': ' + used.length + ' ô có đối tượng, trung bình ' + r6(avg) + ' / ô, nhiều nhất ' + mx + ' / ô', 'Theo loại: ' + [...T.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ')];
    for(const l of lines) log(l); if(DVDCmd.toggleHistory) DVDCmd.toggleHistory(true); });
  plain(['COMPARECLOSE'], 'Thoát chế độ so sánh bản vẽ (DWG Compare)', () => { let on = false; try{ on = !!(compareOn || cmpA || cmpB); compareOn = false; cmpA = null; cmpB = null; cmpName = ''; }catch(_){} try{ draw(); }catch(_){} log(on ? 'Đã thoát so sánh bản vẽ.' : 'Không ở chế độ so sánh.'); });
})();
