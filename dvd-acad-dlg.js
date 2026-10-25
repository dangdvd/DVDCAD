/* DVDCAD — hộp thoại lệnh bố cục như AutoCAD 2027
   Bộ dựng điều khiển (khung nhóm, tab, danh sách, ô xem trước) + các hộp thoại người quen AutoCAD hay dùng:
   DIMSTYLE (Dimension Style Manager), …  Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || !A.dialog || !window.DVDCmd) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
  const r6 = v => +(+v).toPrecision(6);

  /* ------------------------------------------------------------------
     Bộ dựng điều khiển (dùng chung cho các hộp thoại)
     ------------------------------------------------------------------ */
  const css = document.createElement('style');
  css.textContent = `
  .acw{font-size:12px}
  .acw-grp{border:1px solid #5d697e;border-radius:2px;margin:0 0 8px;padding:4px 9px 7px;min-width:0}
  .acw-grp legend{padding:0 4px;margin-left:-2px;color:#e8ecf2;font-size:12px}
  .acw-row{display:flex;align-items:center;gap:8px;margin:3px 0;min-height:22px}
  .acw-row .l{flex:1 0 auto;color:#e8ecf2;white-space:nowrap}
  .acw-row > input:not([type=checkbox]),.acw-row > select,.acw-row > .acw-w{flex:0 1 150px;width:150px;min-width:46px}
  .acw-row.w2 > input:not([type=checkbox]),.acw-row.w2 > select{width:110px}
  .acw-w3 .acw-row > input:not([type=checkbox]),.acw-w3 .acw-row > select{width:86px}
  .acw-row.dis .l{opacity:.45}
  .acw-vrow{flex-direction:column;align-items:stretch;gap:3px}
  .acw-vrow > input:not([type=checkbox]),.acw-vrow > select{width:auto;flex:0 0 auto}
  .acw-ck{display:inline-flex;align-items:center;gap:5px;margin:2px 14px 2px 0;cursor:pointer;white-space:nowrap;color:#e8ecf2}
  .acw-ck.dis{opacity:.45;cursor:default}
  .acw-cols{display:flex;gap:12px;align-items:flex-start}
  .acw-cols > .c1{flex:1 1 auto;min-width:0}
  .acw-cols > .c2{flex:0 0 auto}
  .acw-pane{display:none}.acw-pane.on{display:block}
  .acw-panes{border:1px solid #6a768c;padding:10px;border-radius:0 2px 2px 2px;min-height:360px}
  .acw-dimdlg{width:min(800px,97vw)}
  .acw-dimdlg .acw-panes{height:min(548px,calc(90vh - 150px));overflow:auto;box-sizing:border-box}
  .acw-dimdlg .acw-cols > .c1{flex:1 1 430px}
  .acw-prev{background:#1b2230;border:1px solid #5d697e;display:block}
  .acw-list{border:1px solid #5a6578;background:#262b34;overflow:auto;user-select:none;-webkit-user-select:none}
  .acw-list .it{padding:2px 6px;cursor:default;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .acw-list .it:hover{background:#343c4a}
  .acw-list .it.on{background:#0b5f8f;color:#fff}
  .acw-list .it.sub{padding-left:22px;color:#cfd6e0}
  .acw-btncol{display:flex;flex-direction:column;gap:7px}
  .acw-btncol .acw-btn{min-width:96px}
  .acw-lab{color:#b4bdca;margin:0 0 3px}
  .acw-note{color:#b4bdca;font-size:11.5px;margin-top:6px}
  .acw-sw{display:inline-block;width:11px;height:11px;border:1px solid rgba(255,255,255,.45);vertical-align:-1px;margin-right:4px}
  html:not(.acad) .acw-btn{padding:6px 12px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:600 12px system-ui,sans-serif;cursor:pointer}
  html:not(.acad) .acw-cols{flex-wrap:wrap}
  html:not(.acad) .acw input[type=checkbox],html:not(.acad) .acw input[type=radio],html:not(.acad) .bp-opt input[type=checkbox]{width:auto;padding:0;margin:0;flex:0 0 auto}
  html:not(.acad) .acw input:not([type=checkbox]):not([type=radio]),html:not(.acad) .acw select{font-size:14px;padding:6px 8px;border-radius:6px;height:auto}
  @media (max-width:700px){ .acw-cols{flex-direction:column} .acw-cols > *{width:auto !important;flex:1 1 auto !important} .acw .lm-flt{display:none} .acw-row > input:not([type=checkbox]),.acw-row > select{flex:1 1 auto;width:auto} .acw-prev{max-width:100%} .acw-dimdlg .acw-panes{height:auto} }
  .lm-tb{display:flex;align-items:center;gap:1px;margin:0 0 6px;padding:2px;border-bottom:1px solid #56627a}
  .lm-tb button{width:28px;height:26px;display:grid;place-items:center;border:1px solid transparent;background:none;border-radius:2px;cursor:pointer}
  .lm-tb button:hover{background:#4c5869;border-color:#61708a}
  .lm-tb .sp{width:1px;height:18px;background:#56627a;margin:0 4px}
  .lm-flt{flex:0 0 150px;display:flex;flex-direction:column;border:1px solid #5a6578;background:#262b34;height:380px}
  .lm-flt .it{padding:3px 6px;cursor:default;display:flex;align-items:center;gap:5px}
  .lm-flt .it.on{background:#0b5f8f}
  .lm-grid{flex:1 1 auto;min-width:0;height:380px;overflow:auto;border:1px solid #5a6578;background:#262b34}
  .lm-grid table{width:100%;border-collapse:collapse;font-size:12px}
  .lm-grid th{position:sticky;top:0;z-index:1;background:#434c5b;font-weight:400;text-align:left;padding:3px 6px;border-right:1px solid #5a6578;white-space:nowrap;cursor:default;user-select:none}
  .lm-grid th.srt{color:#fff;box-shadow:inset 0 -2px 0 #0696d7}
  .lm-grid td{padding:1px 6px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.04);height:20px}
  .lm-grid td svg{display:block}
  .lm-grid td[data-f=off],.lm-grid td[data-f=frozen],.lm-grid td[data-f=locked],.lm-grid td[data-f=col],.lm-grid td[data-f=lt],.lm-grid td[data-f=lw]{cursor:pointer}
  .lm-grid tr:hover td{background:#30384a}
  .lm-grid tr.sel td{background:#0b5f8f}
  .bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:4px;max-height:300px;min-height:150px;overflow:auto;border:1px solid #5a6578;background:#262b34;padding:4px}
  .bp-it{display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;border:1px solid transparent;border-radius:2px;background:none;color:#e8ecf2;font:11px inherit;cursor:pointer;min-width:0}
  .bp-it:hover{background:#343c4a;border-color:#5a6578}
  .bp-it.on{background:#0b5f8f;border-color:#0696d7}
  .bp-it span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bp-opt .acw-row > input:not([type=checkbox]){width:80px;flex:0 1 80px}
  .bpw .acw-btn{min-width:0;padding:0 8px}
  .bp-xy .l{flex:0 0 auto}
  .hp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:4px;max-height:300px;overflow:auto}
  .hc-gal{display:grid;grid-auto-flow:column;grid-template-rows:repeat(2,36px);gap:2px;max-width:300px;overflow-x:auto;padding:2px;scrollbar-width:thin}
  .hc-gal canvas,.bp-it canvas,.acw canvas{position:static;inset:auto;display:block;touch-action:auto}
  .hc-gal button{padding:0;border:1px solid #4a5363;background:none;border-radius:2px;cursor:pointer;width:48px;height:36px}
  .hc-gal button.on{border-color:#0696d7;box-shadow:0 0 0 1px #0696d7}
  .hc-props{display:grid;grid-template-columns:auto 108px auto 108px;gap:4px 6px;align-items:center;font-size:11.5px;padding:4px}
  .hc-props label{display:contents;color:#dfe5ee}
  .hc-props select,.hc-props input{height:21px;background:#262b34;color:#e6eaf0;border:1px solid #4a5363;border-radius:2px;font:11.5px inherit;padding:0 4px;width:108px;box-sizing:border-box}
  .sc-grid{display:grid;grid-template-columns:repeat(24,18px);gap:2px;background:#262b34;border:1px solid #5a6578;padding:4px;width:max-content}
  .sc-sw{width:18px;height:18px;padding:0;border:1px solid rgba(0,0,0,.45);border-radius:0;cursor:pointer}
  .sc-sw:hover{outline:1px solid #fff;outline-offset:0}
  .sc-sw.on{outline:2px solid #fff;outline-offset:1px;position:relative;z-index:1}
  .sc-row{display:flex;gap:2px;margin-bottom:4px}
  .sc-row .sc-sw{width:22px;height:22px}
  .sc-old,.sc-new{display:inline-block;width:46px;height:26px;border:1px solid #5a6578}
  .sc-new{margin-left:-1px}
  .arx{display:grid;grid-template-columns:auto 86px;gap:3px 6px;align-items:center;font-size:11.5px;padding:2px 4px}
  .arx label{display:contents;color:#dfe5ee}
  .arx input{height:21px;background:#262b34;color:#e6eaf0;border:1px solid #4a5363;border-radius:2px;font:11.5px inherit;padding:0 4px;width:86px;box-sizing:border-box}
  .arx input:disabled{opacity:.45}
  .arx-b{display:flex;gap:2px;align-items:stretch}
  .acw-cmp{width:100%;border-collapse:collapse;font-size:12px}
  .acw-cmp th{background:#434c5b;font-weight:400;text-align:left;padding:3px 6px;border-right:1px solid #5a6578;position:sticky;top:0}
  .acw-cmp td{padding:2px 6px;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap}
  `;
  document.head.appendChild(css);

  const opt = (v, t, cur) => '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(t) + '</option>';
  const K = A.acw = {
    grp: (t, h, st) => '<fieldset class="acw-grp"' + (st ? ' style="' + st + '"' : '') + '>' + (t ? '<legend>' + t + '</legend>' : '') + h + '</fieldset>',
    vrow: (label, ctl) => '<label class="acw-row acw-vrow"><span class="l">' + label + '</span>' + ctl + '</label>',
    row: (label, ctl, o) => '<label class="acw-row' + (o && o.cls ? ' ' + o.cls : '') + (o && o.dis ? ' dis' : '') + '"' + (o && o.tip ? ' title="' + esc(o.tip) + '"' : '') + '><span class="l">' + label + '</span>' + ctl + '</label>',
    num: (id, v, o) => '<input id="' + id + '" type="number" step="' + ((o && o.step) || 'any') + '"' + (o && o.min != null ? ' min="' + o.min + '"' : '') + (o && o.max != null ? ' max="' + o.max + '"' : '') + ' value="' + esc(v == null ? '' : v) + '"' + (o && o.dis ? ' disabled' : '') + '>',
    txt: (id, v, o) => '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (o && o.dis ? ' disabled' : '') + (o && o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>',
    sel: (id, opts, cur, o) => '<select id="' + id + '"' + (o && o.dis ? ' disabled' : '') + '>' + opts.map(([v, t]) => opt(v, t, cur)).join('') + '</select>',
    chk: (id, label, on, o) => '<label class="acw-ck' + (o && o.dis ? ' dis' : '') + '"' + (o && o.tip ? ' title="' + esc(o.tip) + '"' : '') + '><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (o && o.dis ? ' disabled' : '') + '><span>' + label + '</span></label>',
    rad: (name, val, label, on, o) => '<label class="acw-ck' + (o && o.dis ? ' dis' : '') + '"' + (o && o.tip ? ' title="' + esc(o.tip) + '"' : '') + '><input type="radio" name="' + name + '" value="' + esc(val) + '"' + (on ? ' checked' : '') + (o && o.dis ? ' disabled' : '') + '><span>' + label + '</span></label>',
    btn: (id, label, o) => '<button type="button" class="acw-btn' + (o && o.def ? ' def' : '') + '" id="' + id + '"' + (o && o.dis ? ' disabled' : '') + '>' + label + '</button>',
    tabs: (id, list, cur) => '<div class="acw-tabs" data-tabs="' + id + '">' + list.map(([k, t]) => '<button type="button" data-tab="' + k + '"' + (k === cur ? ' class="on"' : '') + '>' + t + '</button>').join('') + '</div>',
    pane: (id, k, cur, h) => '<div class="acw-pane' + (k === cur ? ' on' : '') + '" data-pane="' + id + ':' + k + '">' + h + '</div>',
    bindTabs(root, onChange){ root.querySelectorAll('[data-tabs]').forEach(bar => bar.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if(!b) return; const id = bar.dataset.tabs;
      bar.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); root.querySelectorAll('[data-pane^="' + id + ':"]').forEach(p => p.classList.toggle('on', p.dataset.pane === id + ':' + b.dataset.tab)); if(onChange) onChange(b.dataset.tab); })); },
    // ô chọn màu như AutoCAD: ByBlock, ByLayer, 7 màu chuẩn, Chọn màu… (bảng ACI)
    COLORS: [['', 'ByBlock'], ['BYLAYER', 'ByLayer'], ['#ff0000', 'Đỏ'], ['#ffff00', 'Vàng'], ['#00ff00', 'Xanh lá'], ['#00ffff', 'Lục lam'], ['#0000ff', 'Xanh dương'], ['#ff00ff', 'Tím'], ['#ffffff', 'Trắng']],
    colorSel(id, cur, o){ const L = K.COLORS.slice(); if(o && o.noBlock) L.shift(); if(cur && !L.some(c => c[0] === cur)) L.push([cur, cur]); return '<select id="' + id + '" data-color="1">' + L.map(([v, t]) => opt(v, '■ ' + t, cur || '')).join('') + '<option value="PICK">Chọn màu…</option></select>'; },
    bindColors(root, onChange){ root.querySelectorAll('select[data-color]').forEach(s => { let prev = s.value; s.addEventListener('focus', () => { prev = s.value; });
      s.addEventListener('change', () => { if(s.value !== 'PICK'){ prev = s.value; if(onChange) onChange(s); return; } s.value = prev;
        if(!A.aciPicker) return; A.aciPicker(s.getBoundingClientRect(), c => { if(!c) return; if(![...s.options].some(o => o.value === c)){ const op = document.createElement('option'); op.value = c; op.textContent = '■ ' + c; s.insertBefore(op, s.lastElementChild); } s.value = c; prev = c; if(onChange) onChange(s); }); }); }); },
    ltSel(id, cur){ const L = [['', 'ByBlock'], ['BYLAYER', 'ByLayer']].concat(A.ltNames ? A.ltNames().map(n => [n, n === 'CONTINUOUS' ? 'Continuous' : n]) : []); if(cur && !L.some(x => x[0] === cur)) L.push([cur, cur]); return K.sel(id, L, cur || ''); },
    lwSel(id, cur){ const L = [['', 'ByBlock'], ['-1', 'ByLayer'], ['0', 'Mặc định']].concat((A.LW_LIST || []).filter(v => v > 0).map(v => [String(v), (v / 100).toFixed(2) + ' mm'])); return K.sel(id, L, cur == null ? '' : String(cur)); },
    // canvas xem trước theo tỉ lệ màn hình (nét mảnh, sắc)
    canvas(id, w, h){ return '<canvas id="' + id + '" class="acw-prev" width="' + w + '" height="' + h + '" style="width:' + w + 'px;height:' + h + 'px" data-w="' + w + '" data-h="' + h + '"></canvas>'; },
    paint(cnv, ents, o){ if(!cnv || !A.previewEnts) return; const d = Math.min(3, window.devicePixelRatio || 1), w = +cnv.dataset.w, h = +cnv.dataset.h; if(cnv.width !== Math.round(w * d)){ cnv.width = Math.round(w * d); cnv.height = Math.round(h * d); } A.previewEnts(cnv, ents, Object.assign({ pad: 12 * d }, o || {})); },
    // danh sách chọn (listbox) — items: [{ v, t, cls }]
    list(id, items, cur, st){ return '<div class="acw-list" id="' + id + '" tabindex="0"' + (st ? ' style="' + st + '"' : '') + '>' + items.map(i => '<div class="it' + (i.cls ? ' ' + i.cls : '') + (i.v === cur ? ' on' : '') + '" data-v="' + esc(i.v) + '">' + (i.h || esc(i.t)) + '</div>').join('') + '</div>'; },
    bindList(el, onPick, onDbl){ el.addEventListener('click', e => { const it = e.target.closest('.it'); if(!it) return; el.querySelectorAll('.it.on').forEach(x => x.classList.remove('on')); it.classList.add('on'); onPick && onPick(it.dataset.v); });
      if(onDbl) el.addEventListener('dblclick', e => { const it = e.target.closest('.it'); if(it) onDbl(it.dataset.v); });
      el.addEventListener('keydown', e => { if(e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault(); const its = [...el.querySelectorAll('.it')]; let i = its.findIndex(x => x.classList.contains('on')); i = Math.max(0, Math.min(its.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); if(its[i]){ its[i].click(); its[i].scrollIntoView({ block: 'nearest' }); } }); },
    val(root, id){ const el = root.querySelector('#' + id); return el ? el.value : null; },
    on(root, id){ const el = root.querySelector('#' + id); return !!(el && el.checked); },
    radio(root, name){ const el = root.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }
  };

  /* ==================================================================
     DIMSTYLE — Dimension Style Manager (như AutoCAD 2027)
     ================================================================== */
  const DSN = A.dimStyles;
  if(DSN){
    // bội số cao chữ ↔ giá trị tuyệt đối hiện trong hộp thoại (AutoCAD ghi số tuyệt đối)
    const ABS = ['dli', 'dle', 'exe', 'exo', 'fxlen', 'asz', 'cens', 'gap'];
    const refTxt = v => v && v.txt > 0 ? v.txt : (A.DS.txt > 0 ? A.DS.txt : (A.dimTxt ? A.dimTxt() / (A.DS.scl > 0 ? A.DS.scl : 1) : 2.5));
    const fullVals = v => { const o = {}; for(const k of DSN.keys) if(k !== 'name') o[k] = DSN.def[k]; return Object.assign(o, v || {}); };
    const UNITS_L = [['sci', 'Khoa học (Scientific)'], ['dec', 'Thập phân (Decimal)'], ['eng', 'Kỹ thuật (Engineering)'], ['arch', 'Kiến trúc (Architectural)'], ['frac', 'Phân số (Fractional)'], ['win', 'Theo Windows (Windows Desktop)']];
    const UNITS_A = [['deg', 'Độ thập phân (Decimal Degrees)'], ['dms', 'Độ / phút / giây (Deg/Min/Sec)'], ['grad', 'Grad (Gradians)'], ['rad', 'Radian (Radians)']];
    function precOpts(unit, sep){ const s = sep || '.'; const o = [];
      for(let i = 0; i <= 8; i++){ let t;
        if(unit === 'arch') t = i ? "0'-0 1/" + Math.pow(2, i) + '"' : "0'-0\"";
        else if(unit === 'frac') t = i ? '0 1/' + Math.pow(2, i) : '0';
        else if(unit === 'eng') t = "0'-0" + (i ? s + '0'.repeat(i) : '') + '"';
        else if(unit === 'sci') t = '0' + (i ? s + '0'.repeat(i) : '') + 'E+01';
        else t = '0' + (i ? s + '0'.repeat(i) : '');
        o.push([String(i), t]); }
      return o; }
    function precAng(unit, sep){ const s = sep || '.'; const o = [];
      for(let i = 0; i <= 8; i++){ let t; if(unit === 'dms') t = i === 0 ? '0°' : i <= 2 ? "0°00'" : i <= 4 ? "0°00'00\"" : "0°00'00" + s + '0'.repeat(i - 4) + '"'; else t = '0' + (i ? s + '0'.repeat(i) : '') + (unit === 'rad' ? 'r' : unit === 'grad' ? 'g' : '°'); o.push([String(i), t]); }
      return o; }
    const arrowOpts = () => DSN.arrows.map(([k, t]) => [k, t]);
    // tên biến hệ thống AutoCAD tương ứng (dùng cho Compare)
    const SYSV = { scl: ['DIMSCALE', 'Tỉ lệ toàn cục'], txt: ['DIMTXT', 'Cao chữ'], clrd: ['DIMCLRD', 'Màu đường kích thước'], lwd: ['DIMLWD', 'Bề rộng đường kích thước'], ltd: ['DIMLTYPE', 'Kiểu nét đường kích thước'], dle: ['DIMDLE', 'Vượt quá gạch chéo'], dli: ['DIMDLI', 'Khoảng bậc DBA'], sd1: ['DIMSD1', 'Ẩn đường kích thước 1'], sd2: ['DIMSD2', 'Ẩn đường kích thước 2'],
      clre: ['DIMCLRE', 'Màu đường gióng'], lwe: ['DIMLWE', 'Bề rộng đường gióng'], lte1: ['DIMLTEX1', 'Kiểu nét đường gióng 1'], lte2: ['DIMLTEX2', 'Kiểu nét đường gióng 2'], se1: ['DIMSE1', 'Ẩn đường gióng 1'], se2: ['DIMSE2', 'Ẩn đường gióng 2'], exe: ['DIMEXE', 'Vượt đường kích thước'], exo: ['DIMEXO', 'Hở gốc gióng'], fxl: ['DIMFXLON', 'Gióng dài cố định'], fxlen: ['DIMFXL', 'Chiều dài gióng cố định'],
      arrow: ['DIMBLK1', 'Mũi tên thứ nhất'], arrow2: ['DIMBLK2', 'Mũi tên thứ hai'], arrowL: ['DIMLDRBLK', 'Mũi tên ghi chú dẫn'], asz: ['DIMASZ', 'Cỡ mũi tên'], cen: ['DIMCEN', 'Dấu tâm'], cens: ['DIMCEN', 'Cỡ dấu tâm'], arcsym: ['DIMARCSYM', 'Ký hiệu dài cung'],
      tstyle: ['DIMTXSTY', 'Kiểu chữ'], clrt: ['DIMCLRT', 'Màu chữ'], tframe: ['DIMGAP', 'Khung quanh chữ'], tvp: ['DIMTAD', 'Vị trí chữ theo phương đứng'], thp: ['DIMJUST', 'Vị trí chữ theo phương ngang'], gap: ['DIMGAP', 'Khe chữ'], tal: ['DIMTIH', 'Hướng chữ'], fit: ['DIMATFIT', 'Tuỳ chọn khớp'], fitsup: ['DIMSOXD', 'Bỏ mũi tên khi không lọt'],
      lunit: ['DIMLUNIT', 'Đơn vị'], dec: ['DIMDEC', 'Số lẻ'], dsep: ['DIMDSEP', 'Dấu thập phân'], rnd: ['DIMRND', 'Làm tròn'], prefix: ['DIMPOST', 'Tiền tố'], suffix: ['DIMPOST', 'Hậu tố'], lfac: ['DIMLFAC', 'Hệ số đo'], lz: ['DIMZIN', 'Bỏ số 0 đầu'], tz: ['DIMZIN', 'Bỏ số 0 cuối'], aunit: ['DIMAUNIT', 'Đơn vị góc'], adec: ['DIMADEC', 'Số lẻ góc'], az: ['DIMAZIN', 'Bỏ số 0 đầu (góc)'], atz: ['DIMAZIN', 'Bỏ số 0 cuối (góc)'],
      alt: ['DIMALT', 'Hiện đơn vị thay thế'], altu: ['DIMALTU', 'Đơn vị thay thế'], altd: ['DIMALTD', 'Số lẻ thay thế'], altf: ['DIMALTF', 'Hệ số thay thế'], altr: ['DIMALTRND', 'Làm tròn thay thế'], altp: ['DIMAPOST', 'Tiền tố thay thế'], alts: ['DIMAPOST', 'Hậu tố thay thế'], altpos: ['DIMAPOST', 'Vị trí đơn vị thay thế'],
      tolm: ['DIMTOL', 'Kiểu dung sai'], tdec: ['DIMTDEC', 'Số lẻ dung sai'], tp: ['DIMTP', 'Sai lệch trên'], tm: ['DIMTM', 'Sai lệch dưới'], tfac: ['DIMTFAC', 'Hệ số cao chữ dung sai'], tvpos: ['DIMTOLJ', 'Vị trí dung sai'] };

    // ---------- hộp thoại Sửa / Tạo / Ghi đè kiểu (7 tab + xem trước) ----------
    let lastTab = 'lines';
    function editStyle(title, vals0, onOk){
      const v = fullVals(JSON.parse(JSON.stringify(vals0 || {})));
      const T = refTxt(v), ab = k => r6((k === 'dle' && v.dle == null ? (v.asz || 1) * (['tick', 'oblique', 'integral'].includes(v.arrow) ? 0.6 : 0) : v[k]) * T);
      const tsNames = A.TS && A.TS.list ? Object.keys(A.TS.list) : ['Standard'];
      const I = (id, k, o) => K.num(id, ab(k), o);
      const lines = '<div class="acw-cols"><div class="c1">' +
        K.grp('Đường kích thước', K.row('Màu:', K.colorSel('dmClrd', v.clrd)) + K.row('Kiểu nét:', K.ltSel('dmLtd', v.ltd)) + K.row('Bề rộng nét:', K.lwSel('dmLwd', v.lwd)) +
          K.row('Vượt quá gạch chéo:', I('dmDle', 'dle', { min: 0 })) + K.row('Khoảng cách bậc (baseline):', I('dmDli', 'dli', { min: 0 })) +
          '<div class="acw-row"><span class="l">Ẩn:</span>' + K.chk('dmSd1', 'Đường k.thước 1', v.sd1) + K.chk('dmSd2', 'Đường k.thước 2', v.sd2) + '</div>') +
        K.grp('Đường gióng', K.row('Màu:', K.colorSel('dmClre', v.clre)) + K.row('Kiểu nét gióng 1:', K.ltSel('dmLte1', v.lte1)) + K.row('Kiểu nét gióng 2:', K.ltSel('dmLte2', v.lte2)) + K.row('Bề rộng nét:', K.lwSel('dmLwe', v.lwe)) +
          '<div class="acw-row"><span class="l">Ẩn:</span>' + K.chk('dmSe1', 'Gióng 1', v.se1) + K.chk('dmSe2', 'Gióng 2', v.se2) + '</div>' +
          K.row('Vượt đường kích thước:', I('dmExe', 'exe', { min: 0 })) + K.row('Hở gốc gióng:', I('dmExo', 'exo', { min: 0 })) +
          '<div class="acw-row">' + K.chk('dmFxl', 'Gióng dài cố định', v.fxl) + '<span class="l"></span></div>' + K.row('Chiều dài:', I('dmFxlen', 'fxlen', { min: 0 }))) +
        '</div><div class="c2">' + K.canvas('dmPv1', 300, 230) + '</div></div>';
      const sym = '<div class="acw-cols"><div class="c1">' +
        K.grp('Mũi tên', K.row('Thứ nhất:', K.sel('dmA1', arrowOpts(), v.arrow)) + K.row('Thứ hai:', K.sel('dmA2', [['', '(như thứ nhất)']].concat(arrowOpts()), v.arrow2 || '')) + K.row('Ghi chú dẫn:', K.sel('dmAL', arrowOpts(), v.arrowL || 'arrow')) + K.row('Cỡ mũi tên:', I('dmAsz', 'asz', { min: 0 }))) +
        K.grp('Dấu tâm', '<div class="acw-row">' + K.rad('dmCen', 'none', 'Không', v.cen === 'none') + K.rad('dmCen', 'mark', 'Dấu (Mark)', v.cen === 'mark') + K.rad('dmCen', 'line', 'Đường tâm (Line)', v.cen === 'line') + '</div>' + K.row('Cỡ:', I('dmCens', 'cens', { min: 0 }))) +
        K.grp('Ngắt kích thước', K.row('Cỡ ngắt:', K.num('dmBrk', r6(T * 1.5), { dis: 1 }), { dis: 1, tip: 'Chưa hỗ trợ (DIMBREAK)' })) +
        K.grp('Ký hiệu dài cung', K.rad('dmArc', 'pre', 'Trước chữ kích thước', v.arcsym !== 'above' && v.arcsym !== 'none') + '<br>' + K.rad('dmArc', 'above', 'Phía trên chữ kích thước', v.arcsym === 'above') + '<br>' + K.rad('dmArc', 'none', 'Không có', v.arcsym === 'none')) +
        '</div><div class="c2">' + K.canvas('dmPv2', 300, 230) + '</div></div>';
      const text = '<div class="acw-cols"><div class="c1">' +
        K.grp('Hình thức chữ', K.row('Kiểu chữ:', '<span class="acw-w" style="display:flex;gap:4px">' + K.sel('dmTsty', [['', '(kiểu chữ hiện hành)']].concat(tsNames.map(n => [n, n])), v.tstyle || '') + '<button type="button" class="acw-btn" id="dmTstyB" style="min-width:26px;padding:0 6px" title="Kiểu chữ (STYLE)">…</button></span>') +
          K.row('Màu chữ:', K.colorSel('dmClrt', v.clrt)) + K.row('Màu nền chữ:', K.sel('dmFill', [['', 'Không có']], '', { dis: 1 }), { dis: 1, tip: 'Chưa hỗ trợ (DIMTFILL)' }) + K.row('Cao chữ:', K.num('dmTxt', r6(T), { min: 0 })) +
          '<div class="acw-row">' + K.chk('dmFrame', 'Vẽ khung quanh chữ', v.tframe) + '</div>') +
        K.grp('Vị trí chữ', K.row('Phương đứng:', K.sel('dmTvp', [['centered', 'Giữa (Centered)'], ['above', 'Phía trên (Above)'], ['below', 'Phía dưới (Below)']], v.tvp)) +
          K.row('Phương ngang:', K.sel('dmThp', [['center', 'Giữa (Centered)'], ['ext1', 'Gần đường gióng 1'], ['ext2', 'Gần đường gióng 2']], v.thp)) +
          K.row('Hướng đọc:', K.sel('dmVd', [['l', 'Trái sang phải']], 'l', { dis: 1 }), { dis: 1 }) + K.row('Cách đường kích thước:', I('dmGap', 'gap', { min: 0 }))) +
        K.grp('Căn chữ', K.rad('dmTal', 'horizontal', 'Nằm ngang', v.tal === 'horizontal') + '<br>' + K.rad('dmTal', 'aligned', 'Theo đường kích thước', v.tal !== 'horizontal' && v.tal !== 'iso') + '<br>' + K.rad('dmTal', 'iso', 'Tiêu chuẩn ISO', v.tal === 'iso')) +
        '</div><div class="c2">' + K.canvas('dmPv3', 300, 230) + '</div></div>';
      const fit = '<div class="acw-cols"><div class="c1">' +
        K.grp('Tuỳ chọn khớp', '<div class="acw-lab">Không đủ chỗ đặt cả chữ và mũi tên giữa 2 đường gióng thì đưa ra ngoài trước:</div>' +
          [['best', 'Chữ hoặc mũi tên (tự chọn tốt nhất)'], ['arrows', 'Mũi tên'], ['text', 'Chữ'], ['both', 'Cả chữ và mũi tên'], ['keep', 'Luôn giữ chữ giữa 2 đường gióng']].map(([k, t]) => K.rad('dmFit', k, t, (v.fit || 'best') === k)).join('<br>') +
          '<div style="margin-top:4px">' + K.chk('dmFitsup', 'Bỏ mũi tên nếu không lọt giữa 2 đường gióng', v.fitsup) + '</div>') +
        K.grp('Vị trí chữ', '<div class="acw-lab">Khi chữ không ở vị trí mặc định, đặt chữ:</div>' + K.rad('dmTmove', 'beside', 'Cạnh đường kích thước', 1) + '<br>' + K.rad('dmTmove', 'leader', 'Trên đường kích thước, có đường dẫn', 0, { dis: 1 }) + '<br>' + K.rad('dmTmove', 'noleader', 'Trên đường kích thước, không đường dẫn', 0, { dis: 1 })) +
        K.grp('Tỉ lệ cho chi tiết kích thước', K.chk('dmAnno', 'Chú thích theo tỉ lệ (Annotative)', 0, { dis: 1, tip: 'Dùng lệnh ANNOTATIVE cho từng kích thước' }) + '<br>' + K.rad('dmSclM', 'layout', 'Theo tỉ lệ khung nhìn layout', 0, { dis: 1 }) +
          '<div class="acw-row">' + K.rad('dmSclM', 'overall', 'Tỉ lệ toàn cục:', 1) + '<span class="l"></span>' + K.num('dmScl', r6(v.scl || 1), { min: 0 }) + '</div>') +
        K.grp('Tinh chỉnh', K.chk('dmManual', 'Tự đặt chữ bằng tay', 0, { dis: 1 }) + '<br>' + K.chk('dmDimIn', 'Luôn vẽ đường kích thước giữa 2 gióng', 1, { dis: 1 })) +
        '</div><div class="c2">' + K.canvas('dmPv4', 300, 230) + '</div></div>';
      const prim = '<div class="acw-cols"><div class="c1">' +
        K.grp('Kích thước thẳng', K.row('Định dạng đơn vị:', K.sel('dmLunit', UNITS_L, v.lunit || 'dec')) + K.row('Độ chính xác:', K.sel('dmDec', precOpts(v.lunit, v.dsep), String(v.dec | 0))) +
          K.row('Định dạng phân số:', K.sel('dmFrac', [['h', 'Ngang']], 'h', { dis: 1 }), { dis: 1 }) + K.row('Dấu thập phân:', K.sel('dmDsep', [['.', "'.' (Chấm)"], [',', "',' (Phẩy)"], [' ', "' ' (Cách)"]], v.dsep || '.')) +
          K.row('Làm tròn tới:', K.num('dmRnd', v.rnd || 0, { min: 0 })) + K.row('Tiền tố:', K.txt('dmPre', v.prefix)) + K.row('Hậu tố:', K.txt('dmSuf', v.suffix)) +
          K.grp('Tỉ lệ đo', K.row('Hệ số tỉ lệ:', K.num('dmLfac', v.lfac || 1)) + K.chk('dmLfacL', 'Chỉ áp cho kích thước trong layout', 0, { dis: 1 }), 'margin-top:6px') +
          K.grp('Bỏ số 0', K.chk('dmLz', 'Số 0 đầu', v.lz) + K.chk('dmTz', 'Số 0 cuối', v.tz) + '<br>' + K.chk('dmZf', '0 feet', 0, { dis: 1 }) + K.chk('dmZi', '0 inch', 0, { dis: 1 }))) +
        K.grp('Kích thước góc', K.row('Định dạng đơn vị:', K.sel('dmAunit', UNITS_A, v.aunit || 'deg')) + K.row('Độ chính xác:', K.sel('dmAdec', precAng(v.aunit, v.dsep), String(v.adec | 0))) +
          K.grp('Bỏ số 0', K.chk('dmAz', 'Số 0 đầu', v.az) + K.chk('dmAtz', 'Số 0 cuối', v.atz), 'margin:6px 0 0')) +
        '</div><div class="c2">' + K.canvas('dmPv5', 300, 230) + '</div></div>';
      const alt = '<div class="acw-cols"><div class="c1">' + '<div style="margin:0 0 6px">' + K.chk('dmAlt', 'Hiện đơn vị thay thế', v.alt) + '</div>' +
        K.grp('Đơn vị thay thế', K.row('Định dạng đơn vị:', K.sel('dmAltu', UNITS_L, v.altu || 'dec')) + K.row('Độ chính xác:', K.sel('dmAltd', precOpts(v.altu, v.dsep), String(v.altd | 0))) +
          K.row('Hệ số nhân đơn vị thay thế:', K.num('dmAltf', v.altf == null ? 25.4 : v.altf)) + K.row('Làm tròn tới:', K.num('dmAltr', v.altr || 0, { min: 0 })) + K.row('Tiền tố:', K.txt('dmAltp', v.altp)) + K.row('Hậu tố:', K.txt('dmAlts', v.alts))) +
        K.grp('Bỏ số 0', K.chk('dmAltlz', 'Số 0 đầu', v.altlz) + K.chk('dmAlttz', 'Số 0 cuối', v.alttz)) +
        K.grp('Vị trí', K.rad('dmAltpos', 'after', 'Sau giá trị chính', v.altpos !== 'below') + '<br>' + K.rad('dmAltpos', 'below', 'Dưới giá trị chính', v.altpos === 'below')) +
        '</div><div class="c2">' + K.canvas('dmPv6', 300, 230) + '</div></div>';
      const tol = '<div class="acw-cols"><div class="c1">' +
        K.grp('Định dạng dung sai', K.row('Phương pháp:', K.sel('dmTolm', [['none', 'Không (None)'], ['sym', 'Đối xứng (Symmetrical)'], ['dev', 'Sai lệch (Deviation)'], ['lim', 'Giới hạn (Limits)'], ['basic', 'Cơ bản (Basic)']], v.tolm || 'none')) +
          K.row('Độ chính xác:', K.sel('dmTdec', precOpts(v.lunit === 'arch' || v.lunit === 'frac' ? 'dec' : v.lunit, v.dsep), String(v.tdec == null ? 2 : v.tdec | 0))) + K.row('Sai lệch trên:', K.num('dmTp', v.tp || 0)) + K.row('Sai lệch dưới:', K.num('dmTm', v.tm || 0)) +
          K.row('Hệ số cao chữ:', K.num('dmTfac', v.tfac || 1, { min: 0 })) + K.row('Vị trí theo phương đứng:', K.sel('dmTvpos', [['bottom', 'Dưới'], ['middle', 'Giữa'], ['top', 'Trên']], v.tvpos || 'middle'))) +
        K.grp('Căn dung sai', K.rad('dmTal2', 'dec', 'Thẳng dấu thập phân', 1, { dis: 1 }) + '<br>' + K.rad('dmTal2', 'op', 'Thẳng dấu phép tính', 0, { dis: 1 })) +
        K.grp('Bỏ số 0', K.chk('dmTlz', 'Số 0 đầu', v.tlz) + K.chk('dmTtz', 'Số 0 cuối', v.ttz)) +
        '</div><div class="c2">' + K.canvas('dmPv7', 300, 230) + '</div></div>';
      const TABS = [['lines', 'Đường nét'], ['sym', 'Ký hiệu & mũi tên'], ['text', 'Chữ'], ['fit', 'Khớp'], ['prim', 'Đơn vị chính'], ['alt', 'Đơn vị thay thế'], ['tol', 'Dung sai']];
      const cur = TABS.some(t => t[0] === lastTab) ? lastTab : 'lines';
      const html = '<div class="acw">' + K.tabs('dm', TABS, cur) + '<div class="acw-panes">' + K.pane('dm', 'lines', cur, lines) + K.pane('dm', 'sym', cur, sym) + K.pane('dm', 'text', cur, text) + K.pane('dm', 'fit', cur, fit) + K.pane('dm', 'prim', cur, prim) + K.pane('dm', 'alt', cur, alt) + K.pane('dm', 'tol', cur, tol) + '</div></div>';
      let root = null;
      // đọc hộp thoại → giá trị kiểu (giá trị tuyệt đối đổi lại thành bội số cao chữ)
      const read = () => { const g = id => K.val(root, id), c = id => K.on(root, id) ? 1 : 0, n = (id, d) => { const x = num(g(id)); return x == null ? d : x; };
        const o = Object.assign({}, v); const t = n('dmTxt', T) > 0 ? n('dmTxt', T) : T; o.txt = t;
        const rel = (id, k) => { const x = n(id, null); if(x != null && x >= 0) o[k] = r6(x / t); };
        rel('dmDle', 'dle'); rel('dmDli', 'dli'); rel('dmExe', 'exe'); rel('dmExo', 'exo'); rel('dmFxlen', 'fxlen'); rel('dmAsz', 'asz'); rel('dmCens', 'cens'); rel('dmGap', 'gap');
        o.clrd = g('dmClrd'); o.ltd = g('dmLtd'); { const w = g('dmLwd'); o.lwd = w === '' ? null : +w; } o.sd1 = c('dmSd1'); o.sd2 = c('dmSd2');
        o.clre = g('dmClre'); o.lte1 = g('dmLte1'); o.lte2 = g('dmLte2'); { const w = g('dmLwe'); o.lwe = w === '' ? null : +w; } o.se1 = c('dmSe1'); o.se2 = c('dmSe2'); o.fxl = c('dmFxl');
        o.arrow = g('dmA1'); o.arrow2 = g('dmA2') === o.arrow ? '' : g('dmA2'); o.arrowL = g('dmAL'); o.cen = K.radio(root, 'dmCen') || 'mark'; o.arcsym = K.radio(root, 'dmArc') || 'pre';
        o.tstyle = g('dmTsty'); o.clrt = g('dmClrt'); o.tframe = c('dmFrame'); o.tvp = g('dmTvp'); o.thp = g('dmThp'); o.tal = K.radio(root, 'dmTal') || 'aligned';
        o.fit = K.radio(root, 'dmFit') || 'best'; o.fitsup = c('dmFitsup'); { const s = n('dmScl', 1); o.scl = s > 0 ? s : 1; }
        o.lunit = g('dmLunit'); o.dec = +g('dmDec') || 0; o.dsep = g('dmDsep') || '.'; o.rnd = Math.max(0, n('dmRnd', 0)); o.prefix = g('dmPre') || ''; o.suffix = g('dmSuf') || ''; { const f = n('dmLfac', 1); o.lfac = f || 1; } o.lz = c('dmLz'); o.tz = c('dmTz');
        o.aunit = g('dmAunit'); o.adec = +g('dmAdec') || 0; o.az = c('dmAz'); o.atz = c('dmAtz');
        o.alt = c('dmAlt'); o.altu = g('dmAltu'); o.altd = +g('dmAltd') || 0; o.altf = n('dmAltf', 25.4); o.altr = Math.max(0, n('dmAltr', 0)); o.altp = g('dmAltp') || ''; o.alts = g('dmAlts') || ''; o.altlz = c('dmAltlz'); o.alttz = c('dmAlttz'); o.altpos = K.radio(root, 'dmAltpos') || 'after';
        o.tolm = g('dmTolm'); o.tdec = +g('dmTdec') || 0; o.tp = n('dmTp', 0); o.tm = n('dmTm', 0); { const f = n('dmTfac', 1); o.tfac = f > 0 ? f : 1; } o.tvpos = g('dmTvpos'); o.tlz = c('dmTlz'); o.ttz = c('dmTtz');
        return o; };
      let pvT = 0;
      const preview = () => { clearTimeout(pvT); pvT = setTimeout(() => { if(!root || !document.body.contains(root)) return; let ents = []; try{ ents = A.dimSample(read()); }catch(_){}
        const pane = root.querySelector('.acw-pane.on'); const cnv = pane && pane.querySelector('canvas'); if(cnv) K.paint(cnv, ents); }, 40); };
      const d = A.dialog({ title, wide: true, cls: 'acw-dimdlg acw-free', help: 'DIMSTYLE', html,
        ok: () => { const o = read(); if(!(o.txt > 0)){ say('Cao chữ phải lớn hơn 0.'); return false; } onOk(o); },
        onOpen: r => { root = r; } });
      root = d.root;
      K.bindTabs(root, k => { lastTab = k; preview(); }); K.bindColors(root, preview);
      root.addEventListener('input', preview); root.addEventListener('change', e => {
        const id = e.target.id;
        if(id === 'dmLunit' || id === 'dmDsep'){ const u = K.val(root, 'dmLunit'), s = K.val(root, 'dmDsep'), sel = root.querySelector('#dmDec'), cv = sel.value; sel.innerHTML = precOpts(u, s).map(([a, b]) => opt(a, b, cv)).join('');
          const st = root.querySelector('#dmTdec'), tv = st.value; st.innerHTML = precOpts(u === 'arch' || u === 'frac' ? 'dec' : u, s).map(([a, b]) => opt(a, b, tv)).join(''); }
        if(id === 'dmAltu' || id === 'dmDsep'){ const sel = root.querySelector('#dmAltd'), cv = sel.value; sel.innerHTML = precOpts(K.val(root, 'dmAltu'), K.val(root, 'dmDsep')).map(([a, b]) => opt(a, b, cv)).join(''); }
        if(id === 'dmAunit' || id === 'dmDsep'){ const sel = root.querySelector('#dmAdec'), cv = sel.value; sel.innerHTML = precAng(K.val(root, 'dmAunit'), K.val(root, 'dmDsep')).map(([a, b]) => opt(a, b, cv)).join(''); }
        preview(); });
      root.querySelector('#dmTstyB').onclick = () => { if(A.openStyles) A.openStyles(); };
      requestAnimationFrame(preview);
      return d;
    }

    // các kích thước trong bản vẽ đang dùng kiểu nào (để lọc "Styles in use" và cập nhật khi sửa kiểu)
    function dimTexts(){ const out = []; try{ for(const e of modelEntities) if(e && e.type === 'TEXT' && e.dimd && e.grp) out.push(e); }catch(_){} return out; }
    const styleOf = t => (t.dimd && t.dimd.s && t.dimd.s.name) || 'Standard';
    // sửa kiểu → dựng lại mọi kích thước dùng kiểu đó (như AutoCAD); giữ ghi đè riêng từng kích thước không làm được nên thay toàn bộ
    function restyle(name, vals){
      if(!A.dimRegenFrom || !A.groupMembers) return 0; const del = [], add = []; const done = new Set();
      for(const t of dimTexts()){ if(styleOf(t) !== name || done.has(t.grp)) continue; done.add(t.grp);
        const w = JSON.parse(JSON.stringify(t)); w.dimd.s = Object.assign({}, vals, { name, txt: vals.txt > 0 ? vals.txt : (t.dimd.s && t.dimd.s.txt) || vals.txt });
        let ents = null; try{ ents = A.dimRegenFrom(w); }catch(_){}
        if(ents && ents.length){ del.push(...A.groupMembers(t.grp)); add.push(...ents); } }
      if(add.length) A.commit({ del, add }, 'Cập nhật ' + done.size + ' kích thước theo kiểu ' + name);
      return done.size;
    }

    function openManager(){
      let lib = DSN.lib(); let sel = A.DS.name || 'Standard'; let filter = 'all';
      const isOver = () => { const base = lib[A.DS.name]; if(!base) return false; const cur = DSN.values(); return DSN.keys.some(k => k !== 'name' && k !== 'txt' && JSON.stringify(base[k] == null ? DSN.def[k] : base[k]) !== JSON.stringify(cur[k] == null ? DSN.def[k] : cur[k])); };
      const html = '<div class="acw"><div class="acw-row" style="margin:0 0 6px"><span>Kiểu kích thước hiện hành:</span> <b id="dmCur" class="nm" style="font-weight:400"></b></div>' +
        '<div class="acw-cols"><div style="flex:0 0 190px"><div class="acw-lab">Các kiểu:</div><div id="dmList"></div>' +
        '<div class="acw-lab" style="margin-top:8px">Liệt kê:</div>' + K.sel('dmFilter', [['all', 'Tất cả kiểu'], ['used', 'Kiểu đang dùng']], 'all') +
        '<div style="margin-top:8px">' + K.chk('dmXref', 'Không liệt kê kiểu của Xref', 1, { dis: 1 }) + '</div></div>' +
        '<div class="c1"><div class="acw-lab">Xem trước kiểu: <span id="dmPvN" class="nm"></span></div>' + K.canvas('dmPvM', 330, 250) +
        '<div class="acw-lab" style="margin-top:8px">Mô tả</div><div id="dmDesc" style="min-height:30px;border:1px solid #5a6578;background:#262b34;padding:4px 6px"></div></div>' +
        '<div class="acw-btncol" style="padding-top:16px">' + K.btn('dmSet', 'Đặt hiện hành') + K.btn('dmNew', 'Mới…') + K.btn('dmMod', 'Sửa…') + K.btn('dmOvr', 'Ghi đè…') + K.btn('dmCmp', 'So sánh…') + '</div></div></div>';
      const d = A.dialog({ title: 'Quản lý kiểu kích thước', wide: true, cls: 'acw-free', help: 'DIMSTYLE', html, noOk: true, cancelText: 'Đóng' });
      const root = d.root, $ = id => root.querySelector('#' + id); root.querySelector('.modal').style.maxWidth = 'min(760px,97vw)';
      const render = () => {
        const used = new Set(dimTexts().map(styleOf)); used.add(A.DS.name);
        const names = Object.keys(lib).sort((a, b) => a.localeCompare(b)).filter(n => filter === 'all' || used.has(n));
        if(!names.includes(sel) && sel !== '*over') sel = names[0] || A.DS.name;
        const items = []; for(const n of names){ items.push({ v: n, h: (n === A.DS.name ? '<span style="color:#7ee787">▸</span> ' : '<span style="visibility:hidden">▸</span> ') + '<span class="nm">' + esc(n) + '</span>' }); if(n === A.DS.name && isOver()) items.push({ v: '*over', t: '<ghi đè kiểu>', cls: 'sub' }); }
        $('dmList').outerHTML = K.list('dmList', items, sel, 'height:250px'); K.bindList($('dmList'), v => { sel = v; show(); }, v => { if(v !== '*over') setCur(v); });
        $('dmList').addEventListener('contextmenu', ctx);
        $('dmCur').textContent = A.DS.name + (isOver() ? ' + ghi đè' : ''); show(); };
      const valsOf = n => n === '*over' ? DSN.values() : fullVals(lib[n]);
      const show = () => { $('dmPvN').textContent = sel === '*over' ? A.DS.name + ' (ghi đè)' : sel; let ents = []; try{ ents = A.dimSample(valsOf(sel)); }catch(_){} K.paint($('dmPvM'), ents);
        $('dmDesc').textContent = sel === '*over' ? A.DS.name + ' + ghi đè' : sel; $('dmSet').disabled = sel === '*over'; };
      const setCur = n => { if(!lib[n]) return; DSN.setCurrent(n, lib); lib = DSN.lib(); sel = n; log('Kiểu kích thước hiện hành: ' + n); render(); };
      const ctx = e => { const it = e.target.closest('.it'); if(!it) return; e.preventDefault(); it.click(); const n = it.dataset.v; if(n === '*over') return;
        const pop = document.createElement('div'); pop.className = 'ac-pop'; pop.style.left = e.clientX + 'px'; pop.style.top = e.clientY + 'px';
        pop.innerHTML = '<div class="it" data-a="cur">Đặt hiện hành</div><div class="it" data-a="ren">Đổi tên</div><div class="it' + (n === A.DS.name || n === 'Standard' ? ' dis' : '') + '" data-a="del">Xoá</div>';
        document.body.appendChild(pop); const off = ev => { if(!pop.contains(ev.target)){ pop.remove(); document.removeEventListener('pointerdown', off, true); } }; document.addEventListener('pointerdown', off, true);
        pop.onclick = async ev => { const a = ev.target.closest('[data-a]'); if(!a) return; pop.remove();
          if(a.dataset.a === 'cur') setCur(n);
          if(a.dataset.a === 'del'){ if(dimTexts().some(t => styleOf(t) === n)){ say('Kiểu "' + n + '" đang được dùng — không xoá được.'); return; } delete lib[n]; DSN.saveLib(lib); sel = A.DS.name; render(); }
          if(a.dataset.a === 'ren'){ const nn = await askText({ title: 'Đổi tên kiểu kích thước', value: n }); const t = nn && nn.trim(); if(!t || t === n) return; if(lib[t]){ say('Đã có kiểu "' + t + '".'); return; }
            lib[t] = lib[n]; delete lib[n]; if(A.DS.name === n){ A.DS.name = t; A.dsSave(); } DSN.saveLib(lib); sel = t; render(); } }; };
      $('dmFilter').onchange = () => { filter = $('dmFilter').value; render(); };
      $('dmSet').onclick = () => setCur(sel);
      $('dmNew').onclick = () => newStyle(lib, sel === '*over' ? A.DS.name : sel, n => { lib = DSN.lib(); sel = n; render(); });
      $('dmMod').onclick = () => { const n = sel === '*over' ? A.DS.name : sel; editStyle('Sửa kiểu kích thước: ' + n, valsOf(n), o => {
          lib[n] = Object.assign({}, o); delete lib[n].name; DSN.saveLib(lib); if(n === A.DS.name) DSN.setCurrent(n, lib); const k = restyle(n, lib[n]); if(k) log('Đã cập nhật ' + k + ' kích thước dùng kiểu ' + n); lib = DSN.lib(); render(); }); };
      $('dmOvr').onclick = () => editStyle('Ghi đè kiểu hiện hành: ' + A.DS.name, DSN.values(), o => { const lay = A.DS.layer, name = A.DS.name; Object.assign(A.DS, o, { name, layer: lay }); A.dsSave(); sel = '*over'; render(); });
      $('dmCmp').onclick = () => compare(lib, sel === '*over' ? A.DS.name : sel);
      render();
    }
    function newStyle(lib, base, done){
      let i = 1; while(lib['Bản sao ' + base + (i > 1 ? ' (' + i + ')' : '')]) i++;
      const def = 'Bản sao ' + base + (i > 1 ? ' (' + i + ')' : '');
      const html = '<div class="acw" style="width:300px">' + K.vrow('Tên kiểu mới:', K.txt('dnName', def)) + K.vrow('Bắt đầu từ:', K.sel('dnBase', Object.keys(lib).sort().map(n => [n, n]), base)) +
        '<div style="margin:6px 0">' + K.chk('dnAnno', 'Chú thích theo tỉ lệ (Annotative)', 0, { dis: 1 }) + '</div>' + K.vrow('Dùng cho:', K.sel('dnFor', [['all', 'Mọi kích thước']], 'all', { dis: 1 })) + '</div>';
      A.dialog({ title: 'Tạo kiểu kích thước mới', help: 'DIMSTYLE', html, okText: 'Tiếp tục',
        ok: root => { const n = (K.val(root, 'dnName') || '').trim(); if(!n){ say('Nhập tên kiểu.'); return false; } if(lib[n]){ say('Đã có kiểu "' + n + '".'); return false; }
          const b = K.val(root, 'dnBase'); const vals = b === A.DS.name ? DSN.values() : fullVals(lib[b]);
          setTimeout(() => editStyle('Kiểu kích thước mới: ' + n, vals, o => { lib[n] = Object.assign({}, o); delete lib[n].name; DSN.saveLib(lib); done(n); }), 0); } });
    }
    function compare(lib, a){
      const names = Object.keys(lib).sort();
      const html = '<div class="acw"><div class="acw-cols" style="gap:16px">' + K.row('So sánh:', K.sel('dcA', names.map(n => [n, n]), a)) + K.row('Với:', K.sel('dcB', [['', '<không>']].concat(names.map(n => [n, n])), names.find(n => n !== a) || '')) + '</div>' +
        '<div id="dcHead" class="acw-lab" style="margin:6px 0"></div><div class="lm-tbl" style="max-height:300px"><table class="acw-cmp"><thead><tr><th>Mô tả</th><th>Biến</th><th id="dcHA"></th><th id="dcHB"></th></tr></thead><tbody id="dcBody"></tbody></table></div></div>';
      const d = A.dialog({ title: 'So sánh kiểu kích thước', wide: true, help: 'DIMSTYLE', html, noOk: true, cancelText: 'Đóng' });
      const root = d.root, $ = id => root.querySelector('#' + id);
      const shown = (k, x) => { if(x == null || x === '') return k.startsWith('clr') ? 'ByBlock' : k === 'arrow2' ? '(như thứ nhất)' : '—'; if(typeof x === 'number') return String(r6(x)); return String(x); };
      const run = () => { const A1 = $('dcA').value, B1 = $('dcB').value; const va = fullVals(lib[A1]), vb = B1 ? fullVals(lib[B1]) : null; $('dcHA').textContent = A1; $('dcHB').textContent = B1 || '';
        // khoảng cách so sánh theo giá trị tuyệt đối (như AutoCAD), không theo bội số cao chữ
        const absV = (v, k) => ABS.includes(k) && v[k] != null ? r6(v[k] * refTxt(v)) : k === 'txt' ? r6(refTxt(v)) : v[k];
        const rows = []; for(const k of Object.keys(SYSV)){ const a1 = absV(va, k), b1 = vb ? absV(vb, k) : null; if(vb && JSON.stringify(a1) === JSON.stringify(b1)) continue; rows.push('<tr><td>' + esc(SYSV[k][1]) + '</td><td>' + SYSV[k][0] + '</td><td class="nm">' + esc(shown(k, a1)) + '</td><td class="nm">' + (vb ? esc(shown(k, b1)) : '') + '</td></tr>'); }
        $('dcHead').textContent = vb ? (rows.length ? 'Tìm thấy ' + rows.length + ' khác biệt:' : 'Hai kiểu giống hệt nhau.') : 'Mọi thuộc tính của kiểu:'; $('dcBody').innerHTML = rows.join(''); };
      $('dcA').onchange = run; $('dcB').onchange = run; run();
    }
    A.openDimStyle = openManager;
    plain(['DIMSTYLE', 'D', 'DST', 'DDIM', 'DIMSTY'], 'Quản lý kiểu kích thước (Dimension Style Manager)', () => { if(A.busy && A.busy()) A.cancel(true); openManager(); });
  }

  /* ==================================================================
     DSETTINGS — Drafting Settings (Snap and Grid · Polar Tracking · Object Snap · Dynamic Input)
     ================================================================== */
  // ký hiệu AutoSnap (vàng) như cột biểu tượng trong tab Object Snap của AutoCAD
  const OSG = { end: '<rect x="3" y="3" width="10" height="10"/>', mid: '<path d="M8 2.5 13.5 13H2.5z"/>', cen: '<circle cx="8" cy="8" r="5.2"/>', gce: '<path d="M8 2.8 13 6.4 11.1 12.6H4.9L3 6.4z"/><path d="M6.6 8h2.8M8 6.6v2.8"/>', nod: '<circle cx="8" cy="8" r="5"/><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
    qua: '<path d="M8 2.5 13.5 8 8 13.5 2.5 8z"/>', int: '<path d="M3 3l10 10M13 3 3 13"/>', ext: '<path d="M2 8h2.2M6.4 8h2.2M10.8 8H13"/>', ins: '<path d="M3 2.5h6v4.5h4.5V13.5H7.5V9H3z"/>', per: '<path d="M3 3v10h10M3 8h5v5"/>',
    tan: '<circle cx="8" cy="9" r="4.3"/><path d="M2.5 4.2h11"/>', nea: '<path d="M3 3h10L3 13h10z"/>', app: '<rect x="3" y="3" width="10" height="10"/><path d="M3 3l10 10M13 3 3 13"/>', par: '<path d="M3 11.5 9 3.5M7.5 12.5 13.5 4.5"/>' };
  const osIco = k => '<svg viewBox="0 0 16 16" width="16" height="16" style="flex:0 0 auto;fill:none;stroke:#ffcf1a;stroke-width:1.5">' + (OSG[k] || '') + '</svg>';
  function openDrafting(tab){
    const S = A.SET, T0 = { os: 'osnap', po: 'polar', gr: 'snap', dy: 'dyn' }[tab] || tab || 'osnap';
    const cur = ['snap', 'polar', 'osnap', 'dyn'].includes(T0) ? T0 : 'osnap';
    const sp = S.snapSp > 0 ? S.snapSp : '';
    const snap = '<div class="acw-cols acw-w3"><div class="c1">' + '<div style="margin:0 0 6px">' + K.chk('dsSn', 'Bật Snap (F9)', S.snap) + '</div>' +
      K.grp('Khoảng cách snap', K.row('Khoảng snap X:', K.num('dsSx', sp, { min: 0 })) + K.row('Khoảng snap Y:', K.num('dsSy', sp, { min: 0, dis: 1 })) + K.chk('dsSeq', 'Khoảng X và Y bằng nhau', 1, { dis: 1 }) +
        '<div class="acw-note">Để trống = bước tự đổi theo mức phóng.</div>') +
      K.grp('Khoảng cách polar', K.row('Khoảng polar:', K.num('dsPd', 0, { dis: 1 }), { dis: 1 })) +
      K.grp('Kiểu snap', K.rad('dsSt', 'grid', 'Snap theo lưới', 1) + '<div style="padding-left:18px">' + K.rad('dsSt2', 'rect', 'Snap chữ nhật', 1) + '<br>' + K.rad('dsSt2', 'iso', 'Snap trục đo (isometric)', 0, { dis: 1 }) + '</div>' + K.rad('dsSt', 'polar', 'PolarSnap', 0, { dis: 1 })) +
      '</div><div class="c1">' + '<div style="margin:0 0 6px">' + K.chk('dsGr', 'Bật lưới (F7)', S.grid) + '</div>' +
      K.grp('Kiểu lưới', '<div class="acw-lab">Hiện lưới chấm trong:</div>' + K.chk('dsGd1', 'Model 2D', 0, { dis: 1 }) + '<br>' + K.chk('dsGd2', 'Trình sửa khối', 0, { dis: 1 }) + '<br>' + K.chk('dsGd3', 'Layout', 0, { dis: 1 })) +
      K.grp('Khoảng cách lưới', K.row('Khoảng lưới X:', K.num('dsGx', '', { dis: 1 }), { dis: 1, tip: 'Lưới đi theo khoảng snap' }) + K.row('Khoảng lưới Y:', K.num('dsGy', '', { dis: 1 }), { dis: 1 }) + K.row('Đường chính mỗi:', K.num('dsGm', 5, { dis: 1 }), { dis: 1 })) +
      K.grp('Hành vi lưới', K.chk('dsGa', 'Lưới thích ứng (theo mức phóng)', !(S.snapSp > 0), { dis: 1 }) + '<br>' + K.chk('dsGb', 'Hiện lưới ngoài Limits', 1, { dis: 1 })) +
      '</div></div>';
    const angs = [90, 45, 30, 22.5, 18, 15, 10, 5];
    const polar = '<div style="margin:0 0 6px">' + K.chk('dsPo', 'Bật truy bắt cực (F10)', S.polar) + '</div><div class="acw-cols acw-w3"><div class="c1">' +
      K.grp('Cài đặt góc cực', K.row('Bước góc:', K.sel('dsPa', angs.map(v => [String(v), String(v)]).concat(angs.includes(+S.polarAng) ? [] : [[String(S.polarAng), String(S.polarAng)]]), String(S.polarAng || 45))) +
        K.chk('dsPadd', 'Góc thêm', 0, { dis: 1, tip: 'Chưa hỗ trợ góc thêm' }) + '<div class="acw-list" style="height:90px;margin-top:4px;opacity:.5"></div>') +
      '</div><div class="c1">' + K.grp('Cài đặt truy bắt điểm', K.rad('dsOtm', 'ortho', 'Chỉ truy bắt vuông góc', 0, { dis: 1 }) + '<br>' + K.rad('dsOtm', 'all', 'Truy bắt theo mọi góc cực đã đặt', 1)) +
      K.grp('Cách đo góc cực', K.rad('dsPm', 'abs', 'Tuyệt đối', 1) + '<br>' + K.rad('dsPm', 'rel', 'So với đoạn trước', 0, { dis: 1 })) +
      K.grp('Ortho', K.chk('dsOr', 'Bật Ortho (F8)', S.ortho, { tip: 'Chỉ vẽ ngang / dọc; giữ Shift để bật tạm thời' })) + '</div></div>';
    const L = A.OS_ALL.concat(['app']), colA = ['end', 'mid', 'cen', 'gce', 'nod', 'qua', 'int', 'ext'], colB = ['ins', 'per', 'tan', 'nea', 'app', 'par'];
    const osRow = k => '<label class="acw-ck" style="display:flex;margin:4px 0"' + (k === 'app' ? ' title="Chưa hỗ trợ"' : '') + '><input type="checkbox" data-os="' + k + '"' + (S.osm.includes(k) ? ' checked' : '') + (k === 'app' ? ' disabled' : '') + '>' + osIco(k) + '<span' + (k === 'app' ? ' style="opacity:.45"' : '') + '>' + esc(k === 'app' ? 'Giao điểm biểu kiến' : A.OS_NAME[k]) + '</span></label>';
    const os = '<div class="acw-cols" style="margin:0 0 6px"><div class="c1">' + K.chk('dsOs', 'Bật bắt điểm (F3)', S.osnap) + '</div><div class="c1">' + K.chk('dsOt', 'Bật truy bắt theo điểm (F11)', S.otrack) + '</div></div>' +
      K.grp('Các kiểu bắt điểm', '<div class="acw-cols"><div class="c1">' + colA.filter(k => L.includes(k)).map(osRow).join('') + '</div><div class="c1">' + colB.filter(k => L.includes(k)).map(osRow).join('') +
        '</div><div class="acw-btncol">' + K.btn('dsAll', 'Chọn tất cả') + K.btn('dsNone', 'Bỏ tất cả') + '</div></div>' +
        '<div class="acw-note">Để bắt từ điểm bắt, dừng con trỏ trên điểm khi đang chạy lệnh — hiện dấu +; dời con trỏ sẽ hiện đường truy bắt. Dừng lại lần nữa để bỏ.</div>');
    const dyn = '<div class="acw-cols"><div class="c1">' + K.grp('', K.chk('dsDy', 'Bật nhập toạ độ con trỏ', S.dyn) + '<div class="acw-row" style="margin-top:6px"><span class="l"></span>' + K.btn('dsDyS', 'Cài đặt…') + '</div>') + '</div><div class="c1">' +
      K.grp('', K.chk('dsDd', 'Bật nhập kích thước khi có thể', S.dyn, { dis: 1, tip: 'Đi theo nhập toạ độ con trỏ' }) + '<div class="acw-row" style="margin-top:6px"><span class="l"></span>' + K.btn('dsDdS', 'Cài đặt…', { dis: 1 }) + '</div>') + '</div></div>' +
      K.grp('Lời nhắc động', K.chk('dsDp', 'Hiện lời nhắc và ô nhập lệnh cạnh con trỏ', S.dynPrompt !== false) + '<br>' + K.chk('dsDt', 'Hiện thêm gợi ý cùng lời nhắc', S.rollover !== false)) +
      '<div class="acw-row"><span class="l"></span>' + K.btn('dsTip', 'Hình thức chú giải…', { dis: 1 }) + '</div>';
    const TABS = [['snap', 'Snap và lưới'], ['polar', 'Truy bắt cực'], ['osnap', 'Bắt điểm'], ['dyn', 'Nhập động']];
    const html = '<div class="acw">' + K.tabs('ds', TABS, cur) + '<div class="acw-panes" style="min-height:392px">' + K.pane('ds', 'snap', cur, snap) + K.pane('ds', 'polar', cur, polar) + K.pane('ds', 'osnap', cur, os) + K.pane('ds', 'dyn', cur, dyn) + '</div></div>';
    let rel = S.dynRel !== false;
    const d = A.dialog({ title: 'Cài đặt trợ giúp vẽ', cls: 'acw-dsdlg acw-free', help: 'DSETTINGS', html, left: K.btn('dsOpt', 'Tuỳ chọn…'),
      ok: root => { const g = id => root.querySelector('#' + id), c = id => !!(g(id) && g(id).checked);
        S.snap = c('dsSn'); const x = num(g('dsSx').value); S.snapSp = x > 0 ? x : 0; S.grid = c('dsGr');
        S.polar = c('dsPo'); S.polarAng = num(g('dsPa').value) || 45; S.ortho = c('dsOr'); if(S.ortho) S.polar = false;
        S.osnap = c('dsOs'); S.otrack = c('dsOt'); S.osm = [...root.querySelectorAll('[data-os]')].filter(i => i.checked && !i.disabled).map(i => i.dataset.os);
        S.dyn = c('dsDy'); S.dynPrompt = c('dsDp'); S.rollover = c('dsDt'); S.dynRel = rel;
        A.saveSet(); try{ draw(); }catch(_){} } });
    const root = d.root; root.querySelector('.modal').style.width = 'min(620px,97vw)';
    K.bindTabs(root);
    root.querySelector('#dsAll').onclick = () => root.querySelectorAll('[data-os]:not([disabled])').forEach(i => i.checked = true);
    root.querySelector('#dsNone').onclick = () => root.querySelectorAll('[data-os]').forEach(i => i.checked = false);
    root.querySelector('#dsOpt').onclick = () => { if(A.openOptions) A.openOptions('drafting'); else DVDCmd.run('OPTIONS'); };
    // Pointer Input Settings: định dạng toạ độ điểm thứ hai
    root.querySelector('#dsDyS').onclick = () => A.dialog({ title: 'Cài đặt nhập toạ độ con trỏ', help: 'DSETTINGS',
      html: '<div class="acw" style="width:300px">' + K.grp('Định dạng', '<div class="acw-lab">Điểm thứ hai trở đi:</div>' + K.rad('piF', 'polar', 'Toạ độ cực', 1, { dis: 1 }) + '<br>' + K.rad('piF', 'cart', 'Toạ độ Đề-các', 1, { dis: 1 }) + '<br><br>' + K.rad('piR', 'rel', 'Toạ độ tương đối', rel) + '<br>' + K.rad('piR', 'abs', 'Toạ độ tuyệt đối', !rel)) +
        K.grp('Hiện', K.rad('piV', 'auto', 'Tự động khi có lệnh hỏi điểm', 1) + '<br>' + K.rad('piV', 'always', 'Luôn hiện — kể cả khi không có lệnh', 0, { dis: 1 })) + '</div>',
      ok: r => { rel = K.radio(r, 'piR') !== 'abs'; } });
    return d;
  }
  A.openDrafting = openDrafting;

  /* ==================================================================
     STYLE — Text Style (như AutoCAD 2027)
     ================================================================== */
  function textsOfStyle(n){ const out = []; try{ for(const e of modelEntities) if(e && e.type === 'TEXT' && (e.style || 'Standard') === n && !e.dimd && !e.dimx) out.push(e); }catch(_){} return out; }
  function openTextStyle(){
    const TS = A.TS; if(!TS){ say('Chưa có kiểu chữ.'); return; }
    const fonts = (A.FONTS || ['Arial']).slice(); for(const st of Object.values(TS.list)) if(st.font && !fonts.includes(st.font)) fonts.push(st.font);
    let sel = TS.cur, filter = 'all', dirty = false;
    const html = '<div class="acw"><div class="acw-row" style="margin:0 0 6px"><span>Kiểu chữ hiện hành:</span> <span id="tsCur" class="nm"></span></div>' +
      '<div class="acw-cols"><div style="flex:0 0 170px"><div class="acw-lab">Các kiểu:</div><div id="tsList"></div>' + '<div style="margin-top:8px">' + K.sel('tsFilter', [['all', 'Tất cả kiểu'], ['used', 'Kiểu đang dùng']], 'all') + '</div>' +
        '<div id="tsPrev" style="margin-top:8px;height:66px;border:1px solid #5d697e;background:#fff;color:#000;display:grid;place-items:center;overflow:hidden;font-size:24px;white-space:nowrap">AaBb123</div></div>' +
      '<div class="c1">' + K.grp('Phông chữ', '<div class="acw-cols"><div class="c1">' + K.vrow('Tên phông:', K.sel('tsFont', fonts.map(f => [f, f]), '')) + '</div><div class="c1">' + K.vrow('Kiểu phông:', K.sel('tsFst', [['r', 'Thường (Regular)']], 'r', { dis: 1 })) + '</div></div>' + K.chk('tsBig', 'Dùng Big Font', 0, { dis: 1, tip: 'Chỉ dùng phông TrueType' })) +
        K.grp('Cỡ chữ', '<div class="acw-cols"><div class="c1">' + K.chk('tsAnno', 'Chú thích theo tỉ lệ (Annotative)', 0, { dis: 1 }) + '<br>' + K.chk('tsOri', 'Xoay chữ theo hướng layout', 0, { dis: 1 }) + '</div><div class="c1">' + K.vrow('Cao chữ:', K.num('tsH', 0, { min: 0 })) + '</div></div>' +
          '<div class="acw-note">Cao chữ 0 = hỏi cao chữ mỗi lần dùng lệnh TEXT.</div>') +
        K.grp('Hiệu ứng', '<div class="acw-cols"><div class="c1">' + K.chk('tsUd', 'Lộn ngược', 0) + '<br>' + K.chk('tsBk', 'Viết ngược (trái ↔ phải)', 0) + '<br>' + K.chk('tsVt', 'Viết dọc', 0, { dis: 1, tip: 'Chỉ có với phông SHX (như AutoCAD)' }) + '</div><div class="c1">' +
          K.vrow('Hệ số rộng:', K.num('tsWf', 1, { min: 0.01 })) + K.vrow('Góc nghiêng:', K.num('tsObl', 0)) + '</div></div>') + '</div>' +
      '<div class="acw-btncol" style="padding-top:16px">' + K.btn('tsSet', 'Đặt hiện hành') + K.btn('tsNew', 'Mới…') + K.btn('tsDel', 'Xoá') + '</div></div></div>';
    const d = A.dialog({ title: 'Kiểu chữ', wide: true, cls: 'acw-free', help: 'STYLE', html, noOk: true, cancelText: 'Đóng', left: K.btn('tsSelApply', 'Áp cho chữ đang chọn'),
      cancel: () => { if(dirty) askSave(); } });
    const root = d.root, $ = id => root.querySelector('#' + id); root.querySelector('.modal').style.width = 'min(700px,97vw)';
    // nút Áp dụng như AutoCAD (đứng trước Đóng)
    const ap = document.createElement('button'); ap.type = 'button'; ap.className = 'btn-ghost'; ap.textContent = 'Áp dụng'; ap.disabled = true; root.querySelector('.dvd-cancel').before(ap);
    const used = () => { const u = new Set([TS.cur]); try{ for(const e of modelEntities) if(e && e.type === 'TEXT') u.add(e.style || 'Standard'); }catch(_){} return u; };
    const render = () => { const u = used(); const names = Object.keys(TS.list).sort((a, b) => a === 'Standard' ? -1 : b === 'Standard' ? 1 : a.localeCompare(b)).filter(n => filter === 'all' || u.has(n));
      if(!names.includes(sel)) sel = names[0] || TS.cur;
      $('tsList').outerHTML = K.list('tsList', names.map(n => ({ v: n, h: (n === TS.cur ? '<span style="color:#7ee787">▸</span> ' : '<span style="visibility:hidden">▸</span> ') + '<span class="nm">' + esc(n) + '</span>' })), sel, 'height:200px');
      K.bindList($('tsList'), v => { if(dirty) apply(); sel = v; load(); }, v => { if(dirty) apply(); TS.cur = v; sel = v; A.tsSave(); render(); });
      $('tsCur').textContent = TS.cur; load(); };
    const load = () => { const st = TS.list[sel] || {}; $('tsFont').value = st.font || 'Arial'; $('tsH').value = st.h > 0 ? st.h : 0; $('tsWf').value = st.wf > 0 ? st.wf : 1; $('tsBk').checked = !!st.bk; $('tsUd').checked = !!st.ud; $('tsObl').value = st.obl || 0;
      $('tsDel').disabled = sel === 'Standard' || sel === TS.cur; dirty = false; ap.disabled = true; prev(); };
    const prev = () => { const p = $('tsPrev'), w = num($('tsWf').value) || 1; p.style.fontFamily = '"' + $('tsFont').value + '",sans-serif'; const ob = Math.max(-85, Math.min(85, num($('tsObl').value) || 0)); p.style.transform = 'scaleX(' + (w * ($('tsBk').checked ? -1 : 1)) + ') scaleY(' + ($('tsUd').checked ? -1 : 1) + ') skewX(' + (-ob) + 'deg)'; };
    const apply = () => { const st = TS.list[sel]; if(!st) return; const w = num($('tsWf').value), h = num($('tsH').value);
      st.font = $('tsFont').value; if(w > 0.01 && w < 100) st.wf = w; st.h = h > 0 ? h : 0; if($('tsBk').checked) st.bk = 1; else delete st.bk; if($('tsUd').checked) st.ud = 1; else delete st.ud; { const ob = num($('tsObl').value) || 0; if(Math.abs(ob) > 1e-9 && Math.abs(ob) <= 85) st.obl = ob; else delete st.obl; } A.tsSave();
      // như AutoCAD: chữ đang dùng kiểu này đổi theo
      const t = textsOfStyle(sel).filter(e => !A.isLocked || !A.isLocked(e)); if(t.length) A.commit({ rep: t.map(e => { const c = JSON.parse(JSON.stringify(e)); A.tsApply(c, sel); return [e, c]; }) }, 'Cập nhật ' + t.length + ' chữ theo kiểu ' + sel);
      dirty = false; ap.disabled = true; };
    const askSave = () => { const n = sel; A.dialog({ title: 'Kiểu chữ', help: false, html: '<div class="acw" style="max-width:340px">Kiểu "' + esc(n) + '" đã sửa. Lưu thay đổi?</div>', okText: 'Có', cancelText: 'Không', ok: () => { sel = n; apply(); } }); };
    root.addEventListener('input', e => { if(e.target.closest('.c1')){ dirty = true; ap.disabled = false; prev(); } });
    root.addEventListener('change', e => { if(e.target.closest('.c1')){ dirty = true; ap.disabled = false; prev(); } });
    ap.onclick = apply;
    $('tsFilter').onchange = () => { filter = $('tsFilter').value; render(); };
    $('tsSet').onclick = () => { if(dirty) apply(); TS.cur = sel; A.tsSave(); render(); log('Kiểu chữ hiện hành: ' + sel); };
    $('tsNew').onclick = async () => { if(dirty) apply(); let i = 1; while(TS.list['style' + i]) i++; const nm = await askText({ title: 'Kiểu chữ mới — tên kiểu', value: 'style' + i }); if(nm == null) return; const n = nm.trim();
      if(!n || TS.list[n]){ say('Tên trống hoặc đã có.'); return; } TS.list[n] = Object.assign({}, TS.list[sel] || TS.list.Standard); TS.cur = n; sel = n; A.tsSave(); render(); };
    $('tsDel').onclick = () => { if(sel === 'Standard' || sel === TS.cur){ say('Không xoá được Standard hoặc kiểu hiện hành.'); return; } if(textsOfStyle(sel).length){ say('Kiểu "' + sel + '" đang được dùng — không xoá được.'); return; }
      delete TS.list[sel]; sel = TS.cur; A.tsSave(); render(); };
    $('tsSelApply').onclick = () => { if(dirty) apply(); const t = [...(typeof selEnts !== "undefined" ? selEnts : [])].filter(e => e.type === 'TEXT' && !(A.isLocked && A.isLocked(e))); if(!t.length){ say('Chọn chữ trên bản vẽ trước.'); return; }
      A.commit({ rep: t.map(e => { const c = JSON.parse(JSON.stringify(e)); A.tsApply(c, sel); return [e, c]; }) }, 'Đã áp kiểu ' + sel + ' cho ' + t.length + ' chữ'); };
    render();
    return d;
  }
  A.openStyles = openTextStyle;
  plain(['STYLE', 'ST', 'DDSTYLE'], 'Kiểu chữ (Text Style): phông, cao chữ, hệ số rộng, kiểu hiện hành', () => { if(A.busy && A.busy()) A.cancel(true); openTextStyle(); });

  /* ==================================================================
     LAYER — Layer Properties Manager (bảng nổi như AutoCAD: vẫn vẽ được khi đang mở)
     ================================================================== */
  const SV = (p, st) => '<svg viewBox="0 0 24 24" width="16" height="16" style="fill:none;stroke:' + (st || '#cfd6e0') + ';stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">' + p + '</svg>';
  const IC_ON = on => SV(on ? '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" fill="#ffd24a"/>' : '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>', on ? '#ffd24a' : '#6f7b8e');
  const IC_FZ = fz => fz ? SV('<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5"/>', '#8fd3ff') : SV('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', '#ffcf5a');
  const IC_LK = lk => lk ? SV('<rect x="5" y="11" width="14" height="10" rx="1" fill="#c9a24a"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', '#e0b85a') : SV('<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>', '#cfd6e0');
  const IC_CUR = SV('<path d="M5 12.5l4.5 4.5L19 7"/>', '#7ee787'), IC_LAY = SV('<path d="M3 9l9-5 9 5-9 5z"/><path d="M3 14l9 5 9-5" opacity=".6"/>', '#9fb3c8');
  const ACI_N = { 1: 'red', 2: 'yellow', 3: 'green', 4: 'cyan', 5: 'blue', 6: 'magenta', 7: 'white' };
  const colName = hex => { const i = A.aciNear ? A.aciNear(hex) : 0; return ACI_N[i] || (i ? String(i) : hex); };
  const ltName = n => !n || n === 'CONTINUOUS' ? 'Continuous' : n;
  const lwName = v => v > 0 ? (v / 100).toFixed(2) + ' mm' : 'Mặc định';
  let lmD = null;
  function openLayerManager(){
    if(A.hasDoc && !A.hasDoc()){ say('Mở bản vẽ trước.'); return; }
    if(lmD && document.body.contains(lmD.root)){ lmD.root.querySelector('.modal').classList.add('dvd-flash'); setTimeout(() => lmD && lmD.root.querySelector('.modal').classList.remove('dvd-flash'), 500); return; }
    A.lsSync && A.lsSync();
    let sel = new Set([A.LS.cur]), anchor = A.LS.cur, filt = 'all', inv = false, q = '', sortK = 'name', sortD = 1;
    const tb = [['new', 'Lớp mới (Alt+N)', '<path d="M3 9l9-5 9 5-9 5z"/><path d="M17 15v6M14 18h6" stroke="#7ee787"/>'], ['del', 'Xoá lớp (Alt+D)', '<path d="M3 9l9-5 9 5-9 5z"/><path d="M15 16l5 5M20 16l-5 5" stroke="#ff8a8a"/>'], ['cur', 'Đặt hiện hành (Alt+C)', '<path d="M3 9l9-5 9 5-9 5z"/><path d="M14 18l2.5 2.5L21 16" stroke="#7ee787"/>'],
      ['sep'], ['states', 'Quản lý trạng thái lớp', '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>'], ['sep'], ['refresh', 'Làm mới', '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>']];
    const html = '<div class="acw lmw"><div class="acw-row" style="margin:0 0 6px"><span>Lớp hiện hành:</span> <b id="lmCur" class="nm" style="font-weight:400"></b><span class="l"></span>' +
      '<input id="lmQ" placeholder="Tìm lớp" style="width:170px"></div>' +
      '<div class="lm-tb">' + tb.map(b => b[0] === 'sep' ? '<span class="sp"></span>' : '<button type="button" data-a="' + b[0] + '" title="' + b[1] + '">' + SV(b[2]) + '</button>').join('') + '</div>' +
      '<div class="acw-cols" style="gap:6px;align-items:stretch"><div class="lm-flt"><div class="acw-lab" style="padding:3px 6px;margin:0;border-bottom:1px solid #5a6578">Bộ lọc</div><div id="lmF"></div>' +
        '<div style="margin-top:auto;padding:6px">' + K.chk('lmInv', 'Đảo bộ lọc', 0) + '</div></div>' +
      '<div class="lm-grid"><table><thead><tr>' + [['st', 'Trạng thái'], ['name', 'Tên'], ['on', 'Bật'], ['fz', 'Đóng băng'], ['lk', 'Khoá'], ['col', 'Màu'], ['lt', 'Kiểu nét'], ['lw', 'Bề rộng nét'], ['n', 'Số đối tượng']].map(([k, t]) => '<th data-s="' + k + '">' + t + '</th>').join('') + '</tr></thead><tbody id="lmB"></tbody></table></div></div>' +
      '<div id="lmS" class="acw-note" style="margin-top:6px"></div></div>';
    lmD = A.dialog({ title: 'Quản lý thuộc tính lớp', cls: 'lm-pal acw-free', help: 'LAYER', html, noOk: true, cancelText: 'Đóng', modeless: true, cancel: () => { lmD = null; } });
    const root = lmD.root, $ = id => root.querySelector('#' + id); const md = root.querySelector('.modal'); md.style.width = 'min(900px,96vw)';
    const close0 = lmD.close; lmD.close = () => { close0(); lmD = null; };
    root.querySelector('.dvd-cancel').onclick = () => lmD && lmD.close();
    root.querySelector('.dvd-tbx').onclick = () => lmD && lmD.close();
    const counts = () => { const c = {}; try{ for(const e of modelEntities) c[e.layer || '0'] = (c[e.layer || '0'] || 0) + 1; }catch(_){} return c; };
    const rows = () => { const c = counts(); let L = A.layerNames().slice();
      if(filt === 'used') L = L.filter(n => c[n] || n === '0' || n === A.LS.cur); if(inv) L = A.layerNames().filter(n => !L.includes(n));
      if(q){ const re = new RegExp('^' + q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + (q.includes('*') ? '$' : ''), 'i'); L = L.filter(n => re.test(n) || n.toLowerCase().includes(q.toLowerCase())); }
      const key = n => sortK === 'on' ? +A.LS.off.has(n) : sortK === 'fz' ? +A.LS.frozen.has(n) : sortK === 'lk' ? +A.LS.locked.has(n) : sortK === 'col' ? colName(A.layerHex(n)) : sortK === 'lt' ? ltName(A.layerLT(n)) : sortK === 'lw' ? A.layerLW(n) : sortK === 'n' ? (c[n] || 0) : sortK === 'st' ? +(n !== A.LS.cur) : n.toLowerCase();
      L.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : a.localeCompare(b, undefined, { numeric: true })) * sortD; });
      return { L, c }; };
    const render = () => { if(!document.body.contains(root)) return; A.lsSync && A.lsSync(); const { L, c } = rows();
      $('lmCur').textContent = A.LS.cur;
      $('lmF').innerHTML = [['all', 'Tất cả'], ['used', 'Lớp đang dùng']].map(([k, t]) => '<div class="it' + (filt === k ? ' on' : '') + '" data-f="' + k + '" style="padding-left:' + (k === 'all' ? 6 : 20) + 'px">' + IC_LAY + ' ' + t + '</div>').join('');
      $('lmB').innerHTML = L.map(n => { const off = A.LS.off.has(n), fz = A.LS.frozen.has(n), lk = A.LS.locked.has(n), hx = A.layerHex(n);
        return '<tr data-n="' + esc(n) + '" class="' + (sel.has(n) ? 'sel' : '') + '"><td data-f="st">' + (n === A.LS.cur ? IC_CUR : IC_LAY) + '</td><td class="nm" data-f="name">' + esc(n) + '</td><td data-f="off">' + IC_ON(!off) + '</td><td data-f="frozen">' + IC_FZ(fz) + '</td><td data-f="locked">' + IC_LK(lk) + '</td>' +
          '<td data-f="col"><span class="acw-sw" style="background:' + hx + '"></span>' + esc(colName(hx)) + '</td><td data-f="lt">' + esc(ltName(A.layerLT(n))) + '</td><td data-f="lw">' + esc(lwName(A.layerLW(n))) + '</td><td style="text-align:right;color:#aab3c0">' + (c[n] || 0) + '</td></tr>'; }).join('');
      root.querySelectorAll('th[data-s]').forEach(th => th.classList.toggle('srt', th.dataset.s === sortK));
      const tot = A.layerNames().length; $('lmS').textContent = (filt === 'used' ? 'Lớp đang dùng' : 'Tất cả') + ': hiện ' + L.length + ' / ' + tot + ' lớp'; };
    lmD.render = render;
    const sig = () => { try{ return A.LS.cur + '|' + A.layerNames().join(',') + '|' + [...A.LS.off].join(',') + '|' + [...A.LS.frozen].join(',') + '|' + [...A.LS.locked].join(',') + '|' + A.layerNames().map(n => A.layerHex(n) + A.layerLT(n) + A.layerLW(n)).join(''); }catch(_){ return ''; } };
    let last = ''; const render0 = render; const renderS = () => { last = sig(); render0(); }; lmD.render = renderS;
    md.addEventListener('pointerenter', () => { if(sig() !== last) renderS(); });
    const targets = n => sel.has(n) ? [...sel] : [n];
    const flag = (n, f) => { const set = f === 'off' ? A.LS.off : f === 'frozen' ? A.LS.frozen : A.LS.locked; const v = !set.has(n); for(const x of targets(n)) A.setLayerFlag(x, f, v); };
    const newLayer = () => { let i = 1; const names = A.layerNames(); while(names.includes('Layer' + i)) i++; const n = 'Layer' + i; const from = sel.size === 1 ? [...sel][0] : null;
      if(!A.addLayer(n, from ? A.layerHex(from) : '#ffffff')) return; if(from){ if(A.layerLT(from) !== 'CONTINUOUS') A.setLayerLT(n, A.layerLT(from)); if(A.layerLW(from) > 0) A.setLayerLW(n, A.layerLW(from)); }
      sel = new Set([n]); anchor = n; renderS(); rename(n); };
    const delLayers = () => { const msgs = []; for(const n of [...sel]){ const m = A.deleteLayer(n); if(m) msgs.push(n + ': ' + m); } if(msgs.length) say(msgs[0]); sel = new Set([A.LS.cur]); renderS(); };
    const setCur = n => { if(!n) return; if(A.LS.frozen.has(n)) A.setLayerFlag(n, 'frozen', false); A.setCurLayer(n); renderS(); try{ A.ribbon && A.ribbon.renderS(); }catch(_){} };
    const rename = n => { const td = root.querySelector('tr[data-n="' + CSS.escape(n) + '"] td[data-f="name"]'); if(!td || n === '0') return; td.innerHTML = '<input value="' + esc(n) + '" style="width:100%;height:20px">'; const i = td.querySelector('input'); i.focus(); i.select();
      let done = false; const fin = ok => { if(done) return; done = true; const v = i.value.trim(); if(ok && v && v !== n){ if(A.renameLayer && A.renameLayer(n, v)){ sel = new Set([v]); anchor = v; } } renderS(); };
      i.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); fin(true); } if(e.key === 'Escape'){ e.preventDefault(); fin(false); } }); i.addEventListener('blur', () => fin(true)); };
    root.querySelector('.lm-tb').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a;
      if(a === 'new') newLayer(); if(a === 'del') delLayers(); if(a === 'cur') setCur(sel.size === 1 ? [...sel][0] : anchor); if(a === 'refresh') renderS(); if(a === 'states') DVDCmd.run('LAYERSTATE'); });
    $('lmQ').addEventListener('input', () => { q = $('lmQ').value.trim(); renderS(); });
    $('lmInv').onchange = () => { inv = $('lmInv').checked; renderS(); };
    $('lmF').addEventListener('click', e => { const it = e.target.closest('[data-f]'); if(!it) return; filt = it.dataset.f; renderS(); });
    root.querySelector('thead').addEventListener('click', e => { const th = e.target.closest('th[data-s]'); if(!th) return; if(sortK === th.dataset.s) sortD = -sortD; else { sortK = th.dataset.s; sortD = 1; } renderS(); });
    $('lmB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr || e.target.closest('input')) return; const n = tr.dataset.n, td = e.target.closest('td[data-f]'), f = td && td.dataset.f;
      if(f === 'off' || f === 'frozen' || f === 'locked'){ flag(n, f); renderS(); return; }
      if(f === 'col'){ A.aciPicker(td.getBoundingClientRect(), c => { if(!c || c === 'BYLAYER') return; for(const x of targets(n)) A.setLayerColor(x, c); renderS(); }); return; }
      if(f === 'lt'){ selectLinetype(A.layerLT(n), v => { for(const x of targets(n)) A.setLayerLT(x, v); renderS(); }); return; }
      if(f === 'lw'){ selectLineweight(A.layerLW(n), v => { for(const x of targets(n)) A.setLayerLW(x, v); renderS(); }); return; }
      // chọn dòng: Ctrl = thêm/bớt, Shift = khoảng
      const { L } = rows();
      if(e.shiftKey && anchor && L.includes(anchor)){ const i0 = L.indexOf(anchor), i1 = L.indexOf(n); sel = new Set(L.slice(Math.min(i0, i1), Math.max(i0, i1) + 1)); }
      else if(e.ctrlKey || e.metaKey){ if(sel.has(n) && sel.size > 1) sel.delete(n); else sel.add(n); anchor = n; }
      else { if(f === 'name' && sel.size === 1 && sel.has(n) && e.detail === 1){ clearTimeout(lmD._rn); lmD._rn = setTimeout(() => rename(n), 600); return; } sel = new Set([n]); anchor = n; }
      $('lmB').querySelectorAll('tr[data-n]').forEach(r => r.classList.toggle('sel', sel.has(r.dataset.n))); });   // chỉ tô lại dòng chọn (dựng lại bảng sẽ làm mất bấm đúp)
    $('lmB').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); const td = e.target.closest('td[data-f]'); if(!tr || !td || !['st', 'name'].includes(td.dataset.f)) return; clearTimeout(lmD._rn); setCur(tr.dataset.n); });
    root.addEventListener('keydown', e => { if(e.target.tagName === 'INPUT') return; const one = sel.size === 1 ? [...sel][0] : null;
      if(e.key === 'F2' && one){ e.preventDefault(); rename(one); } if(e.key === 'Delete'){ e.preventDefault(); delLayers(); }
      if(e.altKey && /^[ndc]$/i.test(e.key)){ e.preventDefault(); const k = e.key.toLowerCase(); if(k === 'n') newLayer(); if(k === 'd') delLayers(); if(k === 'c' && one) setCur(one); }
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a'){ e.preventDefault(); sel = new Set(rows().L); renderS(); } });
    $('lmB').addEventListener('contextmenu', e => { const tr = e.target.closest('tr[data-n]'); e.preventDefault(); if(tr && !sel.has(tr.dataset.n)){ sel = new Set([tr.dataset.n]); anchor = tr.dataset.n; renderS(); }
      const one = sel.size === 1 ? [...sel][0] : null;
      ctxMenu(e.clientX, e.clientY, [['Đặt hiện hành', () => setCur(one), !one], ['Lớp mới', newLayer], ['Đổi tên lớp', () => rename(one), !one || one === '0'], ['Xoá lớp', delLayers], null,
        ['Chọn tất cả', () => { sel = new Set(rows().L); renderS(); }], ['Bỏ chọn tất cả', () => { sel = new Set(); renderS(); }], ['Chọn tất cả trừ lớp hiện hành', () => { sel = new Set(rows().L.filter(n => n !== A.LS.cur)); renderS(); }], ['Đảo vùng chọn', () => { sel = new Set(rows().L.filter(n => !sel.has(n))); renderS(); }], null,
        ['Bật tất cả lớp', () => { for(const n of A.layerNames()) if(A.LS.off.has(n)) A.setLayerFlag(n, 'off', false); renderS(); }], ['Rã băng tất cả lớp', () => { for(const n of A.layerNames()) if(A.LS.frozen.has(n)) A.setLayerFlag(n, 'frozen', false); renderS(); }], ['Mở khoá tất cả lớp', () => { for(const n of A.layerNames()) if(A.LS.locked.has(n)) A.setLayerFlag(n, 'locked', false); renderS(); }], null,
        ['Chọn đối tượng trên lớp', () => { try{ const L = new Set(sel); selEnts.clear(); for(const x of modelEntities) if(L.has(x.layer || '0') && !x.vh) selEnts.add(x); refreshPanSel(); draw(); }catch(_){} }]]); });
    // cập nhật khi quay lại bảng (lớp có thể đổi từ ribbon / dòng lệnh)
    renderS();
  }
  // menu chuột phải nhỏ: items = [ [nhãn, hàm, tắt?] | null (gạch ngăn) ]
  function ctxMenu(x, y, items){
    document.querySelectorAll('.acw-ctx').forEach(p => p.remove());
    const pop = document.createElement('div'); pop.className = 'ac-pop acw-ctx'; pop.style.left = x + 'px'; pop.style.top = y + 'px';
    pop.innerHTML = items.map((it, i) => it ? '<div class="it' + (it[2] ? ' dis' : '') + '" data-i="' + i + '">' + esc(it[0]) + '</div>' : '<div class="sep"></div>').join('');
    document.body.appendChild(pop); const r = pop.getBoundingClientRect(); if(r.bottom > innerHeight) pop.style.top = Math.max(4, innerHeight - r.height - 4) + 'px'; if(r.right > innerWidth) pop.style.left = Math.max(4, innerWidth - r.width - 4) + 'px';
    const off = ev => { if(!pop.contains(ev.target)){ pop.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    pop.onclick = ev => { const d = ev.target.closest('[data-i]'); if(!d || d.classList.contains('dis')) return; pop.remove(); document.removeEventListener('pointerdown', off, true); const it = items[+d.dataset.i]; if(it && it[1]) it[1](); };
  }
  A.acwMenu = ctxMenu;
  // Select Linetype (như AutoCAD): danh sách kiểu nét đã tải + Tải…
  function selectLinetype(cur, cb){
    const list = () => ['CONTINUOUS'].concat(A.ltNames().filter(n => n !== 'CONTINUOUS'));
    let pick = cur || 'CONTINUOUS';
    const body = () => '<table><thead><tr><th>Kiểu nét</th><th>Hình dạng</th><th>Mô tả</th></tr></thead><tbody>' + list().map(n => { const d = A.ltDefOf ? A.ltDefOf(n) : null; return '<tr data-n="' + esc(n) + '" class="' + (n === pick ? 'cur' : '') + '"><td class="nm">' + esc(ltName(n)) + '</td><td><canvas data-n="' + esc(n) + '" width="120" height="12"></canvas></td><td>' + esc((d && d.desc) || '') + '</td></tr>'; }).join('') + '</tbody></table>';
    const d = A.dialog({ title: 'Chọn kiểu nét', wide: true, help: 'LINETYPE', html: '<div class="acw"><div class="acw-lab">Kiểu nét đã tải</div><div class="lm-tbl" id="slT" style="max-height:260px">' + body() + '</div></div>', left: K.btn('slLoad', 'Tải…'),
      ok: () => { cb(pick); } });
    const root = d.root; const paint = () => { root.querySelectorAll('canvas[data-n]').forEach(c => { const df = A.ltDefOf ? A.ltDefOf(c.dataset.n) : null; if(A.ltPreview) A.ltPreview(c, df && df.pat); }); };
    const T = root.querySelector('#slT'); T.addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; pick = tr.dataset.n; T.querySelectorAll('tr').forEach(x => x.classList.toggle('cur', x === tr)); });
    T.addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; pick = tr.dataset.n; d.close(); cb(pick); });
    root.querySelector('#slLoad').onclick = () => { if(A.loadLtDialog) A.loadLtDialog(() => { T.innerHTML = body(); paint(); }); };
    paint();
  }
  A.selectLinetype = selectLinetype;
  // Lineweight (như AutoCAD): danh sách bề rộng có hình nét, Ban đầu / Mới
  function selectLineweight(cur, cb){
    let pick = +cur || 0; const L = [0].concat((A.LW_LIST || []).filter(v => v > 0));
    const html = '<div class="acw" style="width:280px"><div class="acw-lab">Bề rộng nét:</div>' + K.list('swL', L.map(v => ({ v: String(v), h: '<span style="display:inline-block;width:70px;height:' + Math.max(1, Math.min(8, Math.round(v / 25) || 1)) + 'px;background:#e6eaf0;vertical-align:middle"></span> ' + esc(lwName(v)) })), String(pick), 'height:220px') +
      '<div class="acw-note">Ban đầu: ' + esc(lwName(+cur || 0)) + '<br>Mới: <span id="swN">' + esc(lwName(pick)) + '</span></div></div>';
    const d = A.dialog({ title: 'Bề rộng nét', help: 'LWEIGHT', html, ok: () => cb(pick) });
    K.bindList(d.root.querySelector('#swL'), v => { pick = +v; d.root.querySelector('#swN').textContent = lwName(pick); }, v => { pick = +v; d.close(); cb(pick); });
  }
  A.selectLineweight = selectLineweight;
  A.openLayerManager = openLayerManager;

  /* ==================================================================
     UNITS — Drawing Units (như AutoCAD 2027)
     ================================================================== */
  const INSU = [[0, 'Không đơn vị'], [1, 'Inch'], [2, 'Feet'], [3, 'Dặm (Miles)'], [4, 'Milimét'], [5, 'Xentimét'], [6, 'Mét'], [7, 'Kilômét'], [8, 'Microinch'], [9, 'Mil'], [10, 'Yard'], [11, 'Angstrom'], [12, 'Nanomét'], [13, 'Micromét'], [14, 'Đềximét'], [15, 'Đềcamét'], [16, 'Héctômét'], [17, 'Gigamét'], [18, 'Đơn vị thiên văn'], [19, 'Năm ánh sáng'], [20, 'Parsec'], [21, 'US Survey Feet']];
  function openUnits(){
    const G = k => { try{ return eval(k); }catch(_){ return undefined; } };   // biến toàn cục của trang (insunits, measPrec…)
    const ins = G('insunits') | 0, prec = G('measPrec');
    const precL = [['', '(tự động)']].concat([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [String(i), '0' + (i ? '.' + '0'.repeat(i) : '')]));
    const html = '<div class="acw" style="width:440px"><div class="acw-cols">' +
      '<div class="c1">' + K.grp('Chiều dài', K.vrow('Kiểu:', K.sel('unLt', [['arch', 'Kiến trúc (Architectural)'], ['dec', 'Thập phân (Decimal)'], ['eng', 'Kỹ thuật (Engineering)'], ['frac', 'Phân số (Fractional)'], ['sci', 'Khoa học (Scientific)']], 'dec', { dis: 1 })) + K.vrow('Độ chính xác:', K.sel('unLp', precL, prec == null ? '' : String(prec)))) + '</div>' +
      '<div class="c1">' + K.grp('Góc', K.vrow('Kiểu:', K.sel('unAt', [['deg', 'Độ thập phân (Decimal Degrees)'], ['dms', 'Độ/phút/giây'], ['grad', 'Grad'], ['rad', 'Radian'], ['surv', 'Đơn vị trắc địa (Surveyor)']], 'deg', { dis: 1 })) + K.vrow('Độ chính xác:', K.sel('unAp', [['0', '0']], '0', { dis: 1 })) + K.chk('unCw', 'Chiều kim đồng hồ', 0, { dis: 1 })) + '</div></div>' +
      K.grp('Tỉ lệ khi chèn', K.vrow('Đơn vị để co giãn nội dung chèn vào:', K.sel('unIns', INSU.map(([v, t]) => [String(v), t]), String(ins)))) +
      K.grp('Ví dụ hiển thị', '<div id="unSmp" class="nm" style="padding:2px 0;line-height:1.6"></div>') +
      K.grp('Chiếu sáng', K.vrow('Đơn vị cường độ sáng:', K.sel('unLg', [['si', 'Quốc tế (International)']], 'si', { dis: 1 }))) + '</div>';
    const d = A.dialog({ title: 'Đơn vị bản vẽ', help: 'UNITS', html, left: K.btn('unDir', 'Hướng…', { dis: 1 }) + K.btn('unCal', 'Tỉ lệ đo…'),
      ok: root => { const p = K.val(root, 'unLp'), i = +K.val(root, 'unIns') || 0;
        try{ measPrec = p === '' ? null : +p; localStorage.setItem('dvdcad_prec', p === '' ? 'auto' : p); }catch(_){}
        try{ if(i !== (insunits | 0)){ insunits = i; log('INSUNITS = ' + i + ' (' + (INSU.find(x => x[0] === i) || [0, ''])[1] + ')'); } }catch(_){}
        try{ syncDisplayToggles(); }catch(_){} try{ draw(); }catch(_){} try{ refreshPanSel(); }catch(_){} } });
    const root = d.root;
    const smp = () => { const p = K.val(root, 'unLp'); const f = v => p === '' ? (Math.abs(v) >= 10 ? v.toFixed(2) : v.toFixed(3)) : v.toFixed(+p); root.querySelector('#unSmp').innerHTML = esc(f(1.5) + ',' + f(2.0039) + ',' + f(0)) + '<br>' + esc(f(3) + '<45,' + f(0)); };
    root.querySelector('#unLp').onchange = smp; smp();
    root.querySelector('#unCal').onclick = () => { d.close(); try{ openCalib(); }catch(_){ const b = document.getElementById('displayBtn'); if(b) b.click(); } };
    return d;
  }
  A.openUnits = openUnits;
  plain(['UNITS', 'UN', 'DDUNITS'], 'Đơn vị bản vẽ (Drawing Units): độ chính xác, đơn vị chèn', () => openUnits());

  /* ==================================================================
     KHỐI — bảng Blocks (INSERT), Insert cổ điển (CLASSICINSERT), Block Definition (BLOCK), Attribute Definition (ATTDEF)
     ================================================================== */
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const selNow = () => { try{ return [...selEnts]; }catch(_){ return []; } };
  const BOK = 'dvd:blkopt';
  const bopt = (() => { try{ return Object.assign({ ptOn: 1, x: 0, y: 0, scOn: 0, sc: 1, rotOn: 0, rot: 0, rep: 0, exp: 0, tab: 'cur' }, JSON.parse(localStorage.getItem(BOK) || '{}')); }catch(_){ return { ptOn: 1, x: 0, y: 0, scOn: 0, sc: 1, rotOn: 0, rot: 0, rep: 0, exp: 0, tab: 'cur' }; } })();
  const bsave = () => { try{ localStorage.setItem(BOK, JSON.stringify(bopt)); }catch(_){} };
  function thumbs(root){ const cs = [...root.querySelectorAll('canvas[data-bn]')]; const io = new IntersectionObserver(es => { for(const en of es) if(en.isIntersecting){ const c = en.target; io.unobserve(c); try{ const B = A.blockPrims(c.dataset.bn, c.dataset.bs); K.paint(c, B ? B.prims : [], { pad: 6, max: 1500 }); }catch(_){} } }); cs.forEach(c => io.observe(c)); }
  function insWith(name, src, o){ A._insOpt = o; A.insertBlock(name, src); }
  const curBlocks = () => { const f = A.fileBlockNames ? A.fileBlockNames().map(n => ({ name: n, src: 'file' })) : []; const used = new Set(); try{ for(const e of modelEntities) if(e && e.bm && e.bm.src === 'lib' && e.bm.name) used.add(e.bm.name); }catch(_){}
    return f.concat([...used].sort().filter(n => !f.some(x => x.name === n)).map(n => ({ name: n, src: 'lib' }))); };
  let bpD = null;
  function openBlocksPalette(){
    if(bpD && document.body.contains(bpD.root)){ bpD.render(); return; }
    let tab = bopt.tab || 'cur', q = '';
    const TABS = [['cur', 'Bản vẽ hiện tại'], ['rec', 'Gần đây'], ['lib', 'Thư viện']];
    const html = '<div class="acw bpw">' + K.tabs('bp', TABS, tab) + '<div class="acw-panes" style="min-height:0;padding:8px">' +
      '<div class="acw-row" style="margin:0 0 6px"><input id="bpQ" placeholder="Lọc theo tên khối" style="flex:1;width:auto"><span id="bpN" class="acw-note" style="margin:0"></span>' + K.btn('bpNew', 'Tạo…') + K.btn('bpCls', 'Cổ điển…') + '</div>' +
      '<div id="bpG" class="bp-grid"></div>' +
      K.grp('Tuỳ chọn chèn', '<div class="bp-opt">' +
        '<div class="acw-row">' + K.chk('bpPt', 'Điểm chèn — chỉ định trên màn hình', bopt.ptOn) + '</div><div class="acw-row bp-xy" id="bpXY"><span class="l">X:</span>' + K.num('bpX', bopt.x) + '<span class="l">Y:</span>' + K.num('bpY', bopt.y) + '</div>' +
        '<div class="acw-row">' + K.chk('bpSc', 'Tỉ lệ — chỉ định trên màn hình', bopt.scOn) + '<span class="l"></span>' + K.num('bpScV', bopt.sc, { min: 0 }) + '</div>' +
        '<div class="acw-row">' + K.chk('bpRo', 'Xoay — chỉ định trên màn hình', bopt.rotOn) + '<span class="l"></span>' + K.num('bpRoV', bopt.rot) + '</div>' +
        '<div class="acw-row">' + K.chk('bpRep', 'Lặp lại khi đặt', bopt.rep) + K.chk('bpExp', 'Phá khối khi chèn', bopt.exp) + '</div></div>', 'margin:8px 0 0') + '</div></div>';
    bpD = A.dialog({ title: 'Bảng khối', cls: 'acw-free bp-pal', help: 'INSERT', html, noOk: true, cancelText: 'Đóng', modeless: true, cancel: () => { bpD = null; } });
    const root = bpD.root, $ = id => root.querySelector('#' + id); root.querySelector('.modal').style.width = '400px';
    const list = () => { const all = tab === 'cur' ? curBlocks() : tab === 'rec' ? A.blockRecent().filter(r => r.src === 'lib' ? A.blockLib()[r.name] : (A.fileBlockNames() || []).includes(r.name)) : Object.keys(A.blockLib()).sort().map(n => ({ name: n, src: 'lib' }));
      return q ? all.filter(b => b.name.toLowerCase().includes(q.toLowerCase())) : all; };
    const render = () => { if(!document.body.contains(root)) return; const L = list();
      $('bpG').innerHTML = L.length ? L.slice(0, 600).map(b => '<button type="button" class="bp-it" data-n="' + esc(b.name) + '" data-s="' + b.src + '" title="' + esc(b.name) + (b.src === 'lib' ? ' — thư viện của tôi' : '') + '"><canvas data-bn="' + esc(b.name) + '" data-bs="' + b.src + '" data-w="92" data-h="68" width="92" height="68" style="width:92px;height:68px"></canvas><span class="nm">' + esc(b.name) + '</span></button>').join('')
        : '<div class="acw-note" style="padding:20px 8px;text-align:center">' + (tab === 'lib' ? 'Thư viện của tôi chưa có khối. Dùng lệnh BLOCK để tạo khối.' : tab === 'rec' ? 'Chưa chèn khối nào.' : 'Bản vẽ này chưa có khối.') + '</div>';
      $('bpN').textContent = L.length + ' khối'; thumbs(root);
      $('bpXY').style.display = $('bpPt').checked ? 'none' : ''; };
    bpD.render = render;
    const opts = () => { bopt.ptOn = $('bpPt').checked ? 1 : 0; bopt.x = num($('bpX').value) || 0; bopt.y = num($('bpY').value) || 0; bopt.scOn = $('bpSc').checked ? 1 : 0; bopt.sc = num($('bpScV').value) > 0 ? num($('bpScV').value) : 1;
      bopt.rotOn = $('bpRo').checked ? 1 : 0; bopt.rot = num($('bpRoV').value) || 0; bopt.rep = $('bpRep').checked ? 1 : 0; bopt.exp = $('bpExp').checked ? 1 : 0; bsave(); $('bpXY').style.display = bopt.ptOn ? 'none' : ''; };
    root.querySelector('.bp-opt').addEventListener('change', opts);
    K.bindTabs(root, k => { tab = k; bopt.tab = k; bsave(); render(); });
    $('bpQ').addEventListener('input', () => { q = $('bpQ').value.trim(); render(); });
    $('bpG').addEventListener('click', e => { const b = e.target.closest('.bp-it'); if(!b) return; opts();
      root.querySelectorAll('.bp-it.on').forEach(x => x.classList.remove('on')); b.classList.add('on');
      insWith(b.dataset.n, b.dataset.s, { pt: bopt.ptOn ? null : { x: bopt.x, y: bopt.y }, sc: bopt.sc, rot: bopt.rot, askScale: !!bopt.scOn, askRot: !!bopt.rotOn, repeat: !!bopt.rep, explode: !!bopt.exp }); });
    $('bpG').addEventListener('contextmenu', e => { const b = e.target.closest('.bp-it'); if(!b) return; e.preventDefault(); const n = b.dataset.n, sr = b.dataset.s;
      ctxMenu(e.clientX, e.clientY, [['Chèn', () => b.click()], ['Chèn và lặp lại', () => { opts(); insWith(n, sr, { sc: bopt.sc, rot: bopt.rot, repeat: true }); }], null,
        ['Đổi tên…', async () => { if(sr !== 'lib'){ DVDCmd.run('RENAME'); return; } const nn = await askText({ title: 'Đổi tên khối', value: n }); const t = nn && nn.trim(); if(!t || t === n) return; const L = A.blockLib(); if(L[t]){ say('Đã có khối "' + t + '".'); return; } L[t] = L[n]; delete L[n]; A.saveBlockLib(L); render(); }, sr !== 'lib'],
        ['Xoá khỏi thư viện', () => { const L = A.blockLib(); delete L[n]; A.saveBlockLib(L); render(); }, sr !== 'lib']]); });
    $('bpNew').onclick = () => DVDCmd.run('BLOCK');
    $('bpCls').onclick = () => DVDCmd.run('CLASSICINSERT');
    root.querySelector('.modal').addEventListener('pointerenter', () => { if(tab !== 'lib') render(); });
    render();
  }
  A.openBlocksPalette = openBlocksPalette;
  plain(['BLOCKSPALETTE', 'BLOCKS'], 'Bảng Khối (Blocks palette): chèn khối của bản vẽ / gần đây / thư viện', () => openBlocksPalette());
  plain(['BLOCKSPALETTECLOSE'], 'Đóng bảng Khối', () => { if(bpD) bpD.close(); bpD = null; });
  // Insert cổ điển (CLASSICINSERT) — như hộp Insert của AutoCAD trước 2020
  function classicInsert(){
    const all = curBlocks().concat(Object.keys(A.blockLib()).sort().filter(n => !curBlocks().some(b => b.name === n)).map(n => ({ name: n, src: 'lib' })));
    if(!all.length){ say('Chưa có khối nào. Dùng lệnh BLOCK (B) để tạo khối.'); return; }
    const first = all[0];
    const html = '<div class="acw" style="width:560px"><div class="acw-cols"><div class="c1">' + K.row('Tên:', K.sel('ciN', all.map(b => [b.src + '|' + b.name, b.name + (b.src === 'lib' ? '  (thư viện)' : '')]), first.src + '|' + first.name), { cls: 'w2' }).replace('class="acw-row w2"', 'class="acw-row" style="gap:6px"') +
      '<div class="acw-note" id="ciP" style="margin:0 0 6px"></div></div><div class="c2">' + K.canvas('ciV', 110, 80) + '</div></div>' +
      '<div class="acw-cols">' + K.grp('Điểm chèn', K.chk('ciPt', 'Chỉ định trên màn hình', 1) + K.row('X:', K.num('ciX', 0)) + K.row('Y:', K.num('ciY', 0)) + K.row('Z:', K.num('ciZ', 0, { dis: 1 })), 'flex:1') +
        K.grp('Tỉ lệ', K.chk('ciSo', 'Chỉ định trên màn hình', 0) + K.row('X:', K.num('ciS', bopt.sc || 1, { min: 0 })) + K.row('Y:', K.num('ciSy', bopt.sc || 1, { dis: 1 })) + K.row('Z:', K.num('ciSz', bopt.sc || 1, { dis: 1 })) + K.chk('ciU', 'Tỉ lệ đều', 1, { dis: 1 }), 'flex:1') +
        K.grp('Xoay', K.chk('ciRo', 'Chỉ định trên màn hình', 0) + K.row('Góc:', K.num('ciR', bopt.rot || 0)) + K.grp('Đơn vị khối', K.row('Đơn vị:', K.txt('ciBu', 'Milimét', { dis: 1 })) + K.row('Hệ số:', K.txt('ciBf', '1', { dis: 1 })), 'margin:8px 0 0'), 'flex:1') + '</div>' +
      K.chk('ciE', 'Phá khối', 0) + '</div>';
    const d = A.dialog({ title: 'Chèn', help: 'INSERT', cls: 'acw-free', html,
      ok: root => { const v = K.val(root, 'ciN'), i = v.indexOf('|'), src = v.slice(0, i), name = v.slice(i + 1); const pOn = K.on(root, 'ciPt');
        setTimeout(() => insWith(name, src, { pt: pOn ? null : { x: num(K.val(root, 'ciX')) || 0, y: num(K.val(root, 'ciY')) || 0 }, sc: num(K.val(root, 'ciS')) > 0 ? num(K.val(root, 'ciS')) : 1, rot: num(K.val(root, 'ciR')) || 0, askScale: K.on(root, 'ciSo'), askRot: K.on(root, 'ciRo'), explode: K.on(root, 'ciE') }), 0); } });
    const root = d.root; const pv = () => { const v = K.val(root, 'ciN'), i = v.indexOf('|'); const B = A.blockPrims(v.slice(i + 1), v.slice(0, i)); K.paint(root.querySelector('#ciV'), B ? B.prims : [], { pad: 6 }); root.querySelector('#ciP').textContent = v.slice(0, i) === 'lib' ? 'Nguồn: thư viện khối của tôi' : 'Nguồn: khối trong bản vẽ'; };
    root.querySelector('#ciN').onchange = pv; pv();
  }
  plain(['CLASSICINSERT'], 'Hộp thoại Insert cổ điển: tên khối, điểm chèn, tỉ lệ, góc, phá khối', () => classicInsert());

  // Block Definition (BLOCK): hộp thoại ẩn đi khi chọn điểm gốc / đối tượng rồi hiện lại (như AutoCAD)
  ecmd(['BLOCK', 'B', 'BMAKE', 'BMOD'], 'Định nghĩa khối (Block Definition): tên, điểm gốc, đối tượng', async (_A, cur) => {
    // đối tượng chọn sẵn trước khi gọi lệnh (PICKFIRST) được dùng luôn, như AutoCAD
    let pre = cur && cur.pre && cur.pre.length ? [...(A.expandGroups ? A.expandGroups(new Set(cur.pre)) : cur.pre)] : selNow(); if(cur) cur.pre = [];
    const st = { name: '', base: { x: 0, y: 0 }, sel: pre.filter(e => !(A.isLocked && A.isLocked(e))), mode: 'convert', desc: '', ptOn: 0, selOn: 0 };
    if(st.sel.length){ try{ for(const e of st.sel) selEnts.add(e); A.paint && A.paint(); }catch(_){} }
    const names = Object.keys(A.blockLib()).sort();
    for(;;){
      const act = await new Promise(res => {
        const html = '<div class="acw" style="width:600px"><div class="acw-row"><span>Tên:</span><input id="bdN" list="bdNL" value="' + esc(st.name) + '" style="width:300px"><datalist id="bdNL">' + names.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>' +
          '<div class="acw-cols" style="margin-top:6px">' +
          K.grp('Điểm gốc', K.chk('bdPo', 'Chỉ định trên màn hình', st.ptOn) + '<div style="margin:6px 0">' + K.btn('bdPick', '⌖ Chọn điểm') + '</div>' + K.row('X:', K.num('bdX', r6(st.base.x))) + K.row('Y:', K.num('bdY', r6(st.base.y))) + K.row('Z:', K.num('bdZ', 0, { dis: 1 })), 'flex:1') +
          K.grp('Các đối tượng', K.chk('bdSo', 'Chỉ định trên màn hình', st.selOn) + '<div style="margin:6px 0;display:flex;gap:6px">' + K.btn('bdSel', '⬚ Chọn đối tượng') + K.btn('bdQs', 'QSELECT') + '</div>' +
            K.rad('bdM', 'retain', 'Giữ lại', st.mode === 'retain') + '<br>' + K.rad('bdM', 'convert', 'Chuyển thành khối', st.mode === 'convert') + '<br>' + K.rad('bdM', 'delete', 'Xoá', st.mode === 'delete') +
            '<div class="acw-note" id="bdCnt">' + (st.sel.length ? 'Đã chọn ' + st.sel.length + ' đối tượng' : '⚠ Chưa chọn đối tượng') + '</div>', 'flex:1') +
          K.grp('Cách hoạt động', K.chk('bdAn', 'Chú thích theo tỉ lệ', 0, { dis: 1 }) + '<br>' + K.chk('bdUs', 'Co giãn đều', 0, { dis: 1 }) + '<br>' + K.chk('bdEx', 'Cho phép phá khối', 1, { dis: 1 }), 'flex:1') + '</div>' +
          '<div class="acw-cols">' + K.grp('Cài đặt', K.row('Đơn vị khối:', K.sel('bdU', [['mm', 'Milimét']], 'mm', { dis: 1 })) + '<div>' + K.btn('bdHl', 'Siêu liên kết…', { dis: 1 }) + '</div>', 'flex:0 0 220px') +
          K.grp('Mô tả', '<textarea id="bdD" rows="3" style="width:100%;box-sizing:border-box">' + esc(st.desc) + '</textarea>', 'flex:1') + '</div>' + K.chk('bdBe', 'Mở trong trình sửa khối', 0, { dis: 1 }) + '</div>';
        let done = false; const fin = a => { if(done) return; done = true; res(a); };
        const read = r => { st.name = (K.val(r, 'bdN') || '').trim(); st.base = { x: num(K.val(r, 'bdX')) || 0, y: num(K.val(r, 'bdY')) || 0 }; st.mode = K.radio(r, 'bdM') || 'convert'; st.desc = K.val(r, 'bdD') || ''; st.ptOn = K.on(r, 'bdPo') ? 1 : 0; st.selOn = K.on(r, 'bdSo') ? 1 : 0; };
        const d = A.dialog({ title: 'Định nghĩa khối', cls: 'acw-free', help: 'BLOCK', html,
          ok: r => { read(r); const n = st.name.replace(/[<>\/\\":;?*|=`]/g, '_'); if(!n){ say('Nhập tên khối.'); return false; } st.name = n; if(!st.sel.length && !st.selOn){ say('Chưa chọn đối tượng.'); return false; } fin('ok'); },
          cancel: () => fin('cancel') });
        const r = d.root;
        r.querySelector('#bdPick').onclick = () => { read(r); d.close(); fin('pick'); };
        r.querySelector('#bdSel').onclick = () => { read(r); d.close(); fin('sel'); };
        r.querySelector('#bdQs').onclick = () => { read(r); d.close(); fin('qs'); };
      });
      if(act === 'cancel') return;
      if(act === 'pick'){ const p = await A.getPoint('Chỉ định điểm gốc chèn'); if(p.pt) st.base = p.pt; continue; }
      if(act === 'sel'){ const sv = await A.getSel('Chọn đối tượng', { pre: false }); if(sv.sel) st.sel = sv.sel.filter(e => !(A.isLocked && A.isLocked(e))); continue; }
      if(act === 'qs'){ DVDCmd.run('QSELECT'); log('Chọn bằng QSELECT rồi gọi lại BLOCK — đối tượng đang chọn sẽ được dùng.'); return; }
      if(st.ptOn){ const p = await A.getPoint('Chỉ định điểm gốc chèn'); if(!p.pt) return; st.base = p.pt; }
      if(st.selOn){ const sv = await A.getSel('Chọn đối tượng', { pre: false }); st.sel = (sv.sel || []).filter(e => !(A.isLocked && A.isLocked(e))); }
      if(!st.sel.length){ log('Chưa chọn đối tượng.'); return; } if(st.sel.length > 6000){ say('Khối quá lớn (>6000 nét).'); return; }
      if(A.blockLib()[st.name] && !confirm('Khối "' + st.name + '" đã có. Định nghĩa lại?')) continue;
      A.makeBlock(st.sel, st.base, st.name, st.mode, st.desc); try{ if(bpD) bpD.render(); }catch(_){}
      return;
    }
  });

  // Attribute Definition (ATTDEF)
  let lastAtt = null;
  ecmd(['ATTDEF', 'ATT', 'DDATTDEF'], 'Định nghĩa thuộc tính (Attribute Definition): tag, lời nhắc, mặc định, chữ', async () => {
    const TS = A.TS && A.TS.list ? Object.keys(A.TS.list) : ['Standard']; const h0 = (lastAtt && lastAtt.h) || (A.dimTxt ? +(A.dimTxt()).toPrecision(3) : 2.5);
    const J = [['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải'], ['middle', 'Chính giữa'], ['tl', 'Trên trái'], ['tc', 'Trên giữa'], ['tr', 'Trên phải'], ['ml', 'Giữa trái'], ['mc', 'Giữa giữa'], ['mr', 'Giữa phải'], ['bl', 'Dưới trái'], ['bc', 'Dưới giữa'], ['br', 'Dưới phải']];
    const o = await new Promise(res => {
      const html = '<div class="acw" style="width:560px"><div class="acw-cols">' +
        '<div style="flex:0 0 190px">' + K.grp('Chế độ', ['Ẩn (Invisible)', 'Cố định (Constant)', 'Kiểm tra (Verify)', 'Đặt sẵn (Preset)'].map((t, i) => K.chk('adM' + i, t, 0, { dis: 1 })).join('<br>') + '<br>' + K.chk('adM4', 'Khoá vị trí', 1, { dis: 1 }) + '<br>' + K.chk('adM5', 'Nhiều dòng', 0, { dis: 1 })) +
          K.grp('Điểm chèn', K.chk('adOn', 'Chỉ định trên màn hình', 1) + K.row('X:', K.num('adX', 0, { dis: 1 })) + K.row('Y:', K.num('adY', 0, { dis: 1 })) + K.row('Z:', K.num('adZ', 0, { dis: 1 }))) + '</div>' +
        '<div class="c1">' + K.grp('Thuộc tính', K.row('Tag:', K.txt('adTag', '', { ph: 'VD: SO_HIEU' })) + K.row('Lời nhắc:', K.txt('adPr', '', { ph: 'VD: Số hiệu cột' })) + K.row('Mặc định:', K.txt('adDef', ''))) +
          K.grp('Cài đặt chữ', K.row('Canh lề:', K.sel('adJ', J, (lastAtt && lastAtt.j) || 'left')) + K.row('Kiểu chữ:', K.sel('adS', TS.map(n => [n, n]), A.TS ? A.TS.cur : 'Standard')) + K.chk('adAn', 'Chú thích theo tỉ lệ', 0, { dis: 1 }) +
            K.row('Cao chữ:', K.num('adH', h0, { min: 0 })) + K.row('Góc xoay:', K.num('adR', (lastAtt && lastAtt.rot) || 0)) + K.row('Bề rộng khung:', K.num('adW', 0, { dis: 1 }))) + '</div></div>' +
        K.chk('adBelow', 'Canh dưới định nghĩa thuộc tính trước', 0, lastAtt ? {} : { dis: 1 }) + '</div>';
      const d = A.dialog({ title: 'Định nghĩa thuộc tính', cls: 'acw-free', help: 'ATTDEF', html,
        ok: r => { const tag = (K.val(r, 'adTag') || '').trim().toUpperCase().replace(/\s+/g, '_'); if(!tag){ say('Cần tên thuộc tính (Tag).'); return false; }
          res({ tag, pr: (K.val(r, 'adPr') || '').trim() || tag, def: K.val(r, 'adDef') || '', j: K.val(r, 'adJ'), st: K.val(r, 'adS'), h: num(K.val(r, 'adH')) > 0 ? num(K.val(r, 'adH')) : h0, rot: num(K.val(r, 'adR')) || 0,
            on: K.on(r, 'adOn'), x: num(K.val(r, 'adX')) || 0, y: num(K.val(r, 'adY')) || 0, below: K.on(r, 'adBelow') }); }, cancel: () => res(null) });
      const r = d.root; r.querySelector('#adOn').onchange = () => ['adX', 'adY'].forEach(id => r.querySelector('#' + id).disabled = r.querySelector('#adOn').checked);
      r.querySelector('#adBelow').onchange = () => { const b = r.querySelector('#adBelow').checked; r.querySelector('#adOn').disabled = b; ['adX', 'adY'].forEach(id => r.querySelector('#' + id).disabled = b || r.querySelector('#adOn').checked); };
    });
    if(!o) return;
    const HJ = { left: ['left', 'alphabetic'], center: ['center', 'alphabetic'], right: ['right', 'alphabetic'], middle: ['center', 'middle'], tl: ['left', 'top'], tc: ['center', 'top'], tr: ['right', 'top'], ml: ['left', 'middle'], mc: ['center', 'middle'], mr: ['right', 'middle'], bl: ['left', 'bottom'], bc: ['center', 'bottom'], br: ['right', 'bottom'] }[o.j] || ['left', 'alphabetic'];
    const mk = p => { const e = A.newProps({ type: 'TEXT', x: p.x, y: p.y, h: o.h, rot: o.rot, text: o.tag, ha: HJ[0], va: HJ[1], attdef: { tag: o.tag, prompt: o.pr, def: o.def } }); if(A.tsApply && o.st) A.tsApply(e, o.st); return e; };
    let pt;
    if(o.below && lastAtt){ const a = lastAtt.rot * Math.PI / 180; pt = { x: lastAtt.p.x + Math.sin(a) * lastAtt.h * 1.5, y: lastAtt.p.y - Math.cos(a) * lastAtt.h * 1.5 }; }
    else if(!o.on) pt = { x: o.x, y: o.y };
    else { const r = await A.getPoint('Chỉ định điểm bắt đầu', { preview: (g, p) => g.ents([mk(p)]) }); if(!r.pt) return; pt = r.pt; }
    A.commit({ add: [mk(pt)] }, 'Đã định nghĩa thuộc tính ' + o.tag);
    lastAtt = { p: pt, h: o.h, rot: o.rot, j: o.j };
  });

  /* ==================================================================
     HATCH — Hatch and Gradient (HATCHSET / tuỳ chọn T của HATCH) + tab ngữ cảnh "Hatch Creation"
     ================================================================== */
  function patSwatch(cnv, k, scale){
    const PATS = A.PATS, P = PATS && PATS[k]; if(!P) return; const d = Math.min(3, devicePixelRatio || 1), w = +cnv.dataset.w || cnv.width, h = +cnv.dataset.h || cnv.height;
    cnv.width = Math.round(w * d); cnv.height = Math.round(h * d); const g = cnv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = '#1b2230'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#cfd8e6'; g.fillStyle = '#cfd8e6'; g.lineWidth = 1; if(P.solid){ g.fillRect(2, 2, w - 4, h - 4); return; }
    const f = scale || 2.8, rr = A.patternSegs ? A.patternSegs({ pat: k, psc: 1, pang: 0 }, { x0: 0, y0: 0, x1: w / f, y1: h / f }, 600) : null; if(!rr) return;
    g.save(); g.beginPath(); g.rect(1, 1, w - 2, h - 2); g.clip(); g.beginPath(); for(const q of rr.segs){ g.moveTo(q[0] * f, h - q[1] * f); g.lineTo(q[2] * f, h - q[3] * f); } g.stroke(); for(const t of rr.dots) g.fillRect(t[0] * f - .7, h - t[1] * f - .7, 1.4, 1.4); g.restore();
  }
  // Hatch Pattern Palette: lưới mẫu để chọn (nút … cạnh ô Pattern)
  function patternPalette(cur, cb){
    const keys = Object.keys(A.PATS || {});
    const html = '<div class="acw" style="width:420px">' + K.tabs('hp', [['all', 'Mẫu có sẵn']], 'all') + '<div class="acw-panes" style="min-height:0;padding:6px"><div class="hp-grid">' +
      keys.map(k => '<button type="button" class="bp-it' + (k === cur ? ' on' : '') + '" data-k="' + k + '" title="' + esc(A.PATS[k].name) + '"><canvas data-w="64" data-h="44" width="64" height="44" style="width:64px;height:44px"></canvas><span>' + esc(k) + '</span></button>').join('') + '</div></div></div>';
    let pick = cur; const d = A.dialog({ title: 'Bảng mẫu hatch', help: 'HATCH', html, ok: () => cb(pick) });
    d.root.querySelectorAll('.hp-grid .bp-it').forEach(b => { patSwatch(b.querySelector('canvas'), b.dataset.k); b.onclick = () => { pick = b.dataset.k; d.root.querySelectorAll('.hp-grid .bp-it').forEach(x => x.classList.toggle('on', x === b)); }; b.ondblclick = () => { pick = b.dataset.k; d.close(); cb(pick); }; });
  }
  function openHatch(o){
    o = o || {}; const HS = A.HS; if(!HS) return Promise.resolve(false);
    const keys = Object.keys(A.PATS || {}); const scs = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '2', '5', '10', '20', '50', '100'];
    return new Promise(res => {
      const hatchT = '<div class="acw-cols"><div class="c1">' +
        K.grp('Kiểu và mẫu', K.row('Kiểu:', K.sel('hgT', [['pre', 'Có sẵn (Predefined)'], ['user', 'Tự định nghĩa (User defined)'], ['cust', 'Tuỳ biến (Custom)']], 'pre', { dis: 1 })) +
          K.row('Mẫu:', '<span class="acw-w" style="display:flex;gap:4px">' + K.sel('hgP', keys.map(k => [k, k]), HS.pat) + '<button type="button" class="acw-btn" id="hgPB" style="min-width:26px;padding:0 6px">…</button></span>') +
          K.row('Màu:', K.colorSel('hgC', HS.col || 'BYLAYER', { noBlock: 1 })) + K.row('Mẫu xem:', '<canvas id="hgS" data-w="150" data-h="34" width="150" height="34" style="width:150px;height:34px;border:1px solid #5a6578;cursor:pointer"></canvas>')) +
        K.grp('Góc và tỉ lệ', '<div class="acw-cols"><div class="c1">' + K.vrow('Góc:', '<input id="hgA" list="hgAL" value="' + esc(HS.ang || 0) + '"><datalist id="hgAL">' + [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165].map(v => '<option value="' + v + '">').join('') + '</datalist>') + '</div><div class="c1">' +
          K.vrow('Tỉ lệ:', '<input id="hgSc" list="hgSL" value="' + esc(HS.scale || 0) + '"><datalist id="hgSL">' + scs.map(v => '<option value="' + v + '">').join('') + '</datalist>') + '</div></div>' +
          '<div class="acw-note" style="margin-top:2px">Tỉ lệ 0 = tự chọn theo cỡ vùng.</div>' + K.chk('hgDbl', 'Hai chiều (Double)', 0, { dis: 1 }) + K.chk('hgPs', 'Theo không gian giấy', 0, { dis: 1 }) + K.row('Khoảng cách:', K.num('hgSp', 1, { dis: 1 }), { dis: 1 })) +
        K.grp('Gốc hatch', K.rad('hgO', 'cur', 'Dùng gốc hiện hành', 1) + '<br>' + K.rad('hgO', 'set', 'Gốc chỉ định', 0, { dis: 1 })) + '</div></div>';
      const gradT = '<div class="acw-note" style="margin:0 0 8px">Tô chuyển màu dùng lệnh GRADIENT: chọn 2 màu, kiểu tuyến tính / toả tròn và góc, rồi chọn vùng.</div><canvas id="hgG" data-w="300" data-h="60" width="300" height="60" style="width:300px;height:60px;border:1px solid #5a6578"></canvas><div style="margin-top:8px">' + K.btn('hgGo', 'Mở GRADIENT…') + '</div>';
      const side = '<div class="c2" style="width:200px">' + K.grp('Biên', '<div class="acw-btncol">' + K.btn('hgPick', '⌖ Thêm: chọn điểm', { dis: !o.inCmd }) + K.btn('hgSel', '⬚ Thêm: chọn đối tượng', { dis: !o.inCmd }) + K.btn('hgRm', 'Bỏ biên', { dis: 1 }) + K.btn('hgRc', 'Dựng lại biên', { dis: 1 }) + '</div>') +
        K.grp('Tuỳ chọn', K.chk('hgAn', 'Chú thích theo tỉ lệ', 0, { dis: 1 }) + '<br>' + K.chk('hgAs', 'Liên kết biên', 1, { dis: 1, tip: 'Dùng HATCHASSOC' }) + '<br>' + K.chk('hgSep', 'Tạo hatch riêng từng vùng', 0, { dis: 1 }) +
          K.vrow('Thứ tự vẽ:', K.sel('hgDo', [['back', 'Đưa ra sau biên']], 'back', { dis: 1 }))) + '</div>';
      const html = '<div class="acw" style="width:640px">' + '<div class="acw-cols"><div class="c1">' + K.tabs('hg', [['h', 'Hatch'], ['g', 'Gradient']], 'h') + '<div class="acw-panes" style="min-height:400px">' + K.pane('hg', 'h', 'h', hatchT) + K.pane('hg', 'g', 'h', gradT) + '</div></div>' + side + '</div></div>';
      let done = false; const fin = v => { if(!done){ done = true; res(v); } };
      const save = r => { HS.pat = K.val(r, 'hgP') || HS.pat; const sc = num(K.val(r, 'hgSc')); HS.scale = sc > 0 ? sc : 0; const an = num(K.val(r, 'hgA')); HS.ang = an != null ? an : 0; const c = K.val(r, 'hgC'); HS.col = c === 'BYLAYER' ? '' : c; if(A.hsSave) A.hsSave(); };
      const d = A.dialog({ title: 'Hatch và Gradient', cls: 'acw-free', help: 'HATCH', html, left: K.btn('hgInh', 'Lấy theo hatch có sẵn', { dis: !o.inCmd }),
        ok: r => { save(r); fin(true); }, cancel: () => fin(false) });
      const r = d.root; const sw = () => patSwatch(r.querySelector('#hgS'), K.val(r, 'hgP'), 2.2);
      K.bindTabs(r); K.bindColors(r); r.querySelector('#hgP').onchange = sw; sw();
      const pal = () => patternPalette(K.val(r, 'hgP'), k => { r.querySelector('#hgP').value = k; sw(); });
      r.querySelector('#hgPB').onclick = pal; r.querySelector('#hgS').onclick = pal;
      { const c = r.querySelector('#hgG'), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 300, 0); gr.addColorStop(0, '#2f6db0'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, 300, 60); }
      r.querySelector('#hgGo').onclick = () => { save(r); d.close(); fin(false); setTimeout(() => DVDCmd.run('GRADIENT'), 0); };
      r.querySelector('#hgPick').onclick = () => { save(r); d.close(); fin('pick'); };
      r.querySelector('#hgSel').onclick = () => { save(r); d.close(); fin('sel'); };
      r.querySelector('#hgInh').onclick = () => { save(r); d.close(); fin('pick'); setTimeout(() => { try{ DVDCmd.run('MATCHPROP'); }catch(_){} }, 0); };
    });
  }
  A.openHatchDialog = openHatch;
  plain(['HATCHSET', 'HS'], 'Hatch và Gradient: mẫu, màu, góc, tỉ lệ', () => openHatch());

  // tab ngữ cảnh Hatch Creation (hiện khi HATCH đang chạy) — gắn vào ribbon
  if(A.ribbon && A.ribbon.RIB && A.ribbonAct){
    const inp = v => { try{ A.input(v); }catch(_){} };
    A.ribbonAct('HCX_PICK', () => {}); A.ribbonAct('HCX_SEL', () => inp('S')); A.ribbonAct('HCX_SET', () => inp('T')); A.ribbonAct('HCX_UNDO', () => inp('U')); A.ribbonAct('HCX_CLOSE', () => inp(''));
    const big = (cmd, en, vi, icon) => ({ t: 'big', cmd, en, vi, icon }), sm = (cmd, en, vi, icon) => ({ t: 'sm', cmd, en, vi, icon });
    const gallery = { t: 'html', html: () => '<div class="hc-gal">' + Object.keys(A.PATS || {}).map(k => '<button type="button" data-k="' + k + '" class="' + (A.HS && A.HS.pat === k ? 'on' : '') + '" title="' + esc(A.PATS[k].name) + '"><canvas data-w="46" data-h="34" width="46" height="34" style="width:46px;height:34px"></canvas></button>').join('') + '</div>',
      bind: el => { el.querySelectorAll('button[data-k]').forEach(b => { patSwatch(b.querySelector('canvas'), b.dataset.k, 2); b.onclick = () => { A.HS.pat = b.dataset.k; if(A.hsSave) A.hsSave(); el.querySelectorAll('button[data-k]').forEach(x => x.classList.toggle('on', x === b)); log('Mẫu hatch: ' + A.HS.pat); }; }); } };
    const props = { t: 'html', html: () => { const H = A.HS || {}; return '<div class="hc-props">' + '<label>Kiểu<select data-p="type"><option value="pat"' + (H.pat !== 'SOLID' ? ' selected' : '') + '>Mẫu (Pattern)</option><option value="solid"' + (H.pat === 'SOLID' ? ' selected' : '') + '>Tô đặc (Solid)</option></select></label>' +
        '<label>Màu' + K.colorSel('hcC', H.col || 'BYLAYER', { noBlock: 1 }) + '</label><label>Góc<input data-p="ang" type="number" step="any" value="' + esc(H.ang || 0) + '"></label><label>Tỉ lệ<input data-p="scale" type="number" step="any" min="0" value="' + esc(H.scale || 0) + '" title="0 = tự động"></label></div>'; },
      bind: el => { const H = A.HS; const sv = () => { if(A.hsSave) A.hsSave(); };
        el.querySelector('[data-p="type"]').onchange = e => { if(e.target.value === 'solid'){ H._lastPat = H.pat !== 'SOLID' ? H.pat : H._lastPat; H.pat = 'SOLID'; } else if(H.pat === 'SOLID') H.pat = H._lastPat || 'ANSI31'; sv(); try{ A.ribbon.render(); }catch(_){} };
        K.bindColors(el, s => { H.col = s.value === 'BYLAYER' ? '' : s.value; sv(); });
        el.querySelector('[data-p="ang"]').onchange = e => { const v = num(e.target.value); H.ang = v || 0; sv(); };
        el.querySelector('[data-p="scale"]').onchange = e => { const v = num(e.target.value); H.scale = v > 0 ? v : 0; sv(); };
        el.addEventListener('keydown', e => e.stopPropagation()); } };
    A.ribbon.RIB.hatchctx = { en: 'Hatch Creation', vi: 'Tạo hatch', ctx: true, panels: [
      { id: 'hcb', en: 'Boundaries', vi: 'Biên', pri: 1, items: [big('HCX_PICK', 'Pick\nPoints', 'Chọn\nđiểm', 'HATCH'), { t: 'col', items: [sm('HCX_SEL', 'Select', 'Chọn đối tượng', 'SELECT'), sm('HCX_UNDO', 'Undo', 'Hoàn tác', 'UNDO'), sm('BOUNDARY', 'Boundary', 'Tạo đường biên', 'BOUNDARY')] }] },
      { id: 'hcp', en: 'Pattern', vi: 'Mẫu', pri: 3, items: [gallery] },
      { id: 'hcq', en: 'Properties', vi: 'Thuộc tính', pri: 2, items: [props] },
      { id: 'hco', en: 'Options', vi: 'Tuỳ chọn', pri: 5, items: [big('HCX_SET', 'Hatch\nSettings', 'Cài đặt\nhatch', 'HATCHSET'), { t: 'col', items: [sm('HATCHASSOC', 'Associative', 'Liên kết biên', 'HATCHASSOC'), sm('HATCHTOBACK', 'Send to Back', 'Đưa ra sau', 'HATCHTOBACK')] }] },
      { id: 'hcc', en: 'Close', vi: 'Đóng', pri: 0, items: [big('HCX_CLOSE', 'Close Hatch\nCreation', 'Đóng\ntạo hatch', 'CLOSE')] }
    ] };
  }

  /* ==================================================================
     OPTIONS — Options (như AutoCAD: Display · Open and Save · Plot and Publish · System · User Preferences · Drafting · Selection)
     ================================================================== */
  function openOptions(tab){
    const S = A.SET, G = k => { try{ return eval(k); }catch(_){ return undefined; } };
    const cur = ['display', 'open', 'plot', 'system', 'user', 'drafting', 'selection'].includes(tab) ? tab : 'display';
    const slider = (id, v, mn, mx) => '<div class="acw-row"><input type="range" id="' + id + '" min="' + mn + '" max="' + mx + '" value="' + v + '" style="flex:1;width:auto"><input type="number" id="' + id + 'N" min="' + mn + '" max="' + mx + '" value="' + v + '" style="width:60px;flex:0 0 60px"></div>';
    const dxfV = [['R2018', 'AutoCAD 2018 DXF (*.dxf)'], ['R2013', 'AutoCAD 2013 DXF (*.dxf)'], ['R2010', 'AutoCAD 2010 DXF (*.dxf)'], ['R2007', 'AutoCAD 2007 DXF (*.dxf)'], ['R2004', 'AutoCAD 2004 DXF (*.dxf)'], ['R2000', 'AutoCAD 2000 DXF (*.dxf)'], ['R12', 'AutoCAD R12 DXF (*.dxf)']];
    const T = {
      display: '<div class="acw-cols"><div class="c1">' + K.grp('Phối màu', K.row('Giao diện:', K.sel('opScheme', [['dark', 'Tối']], 'dark', { dis: 1 }))) +
          K.grp('Thành phần cửa sổ', K.chk('opSb', 'Hiện thanh tỉ lệ trên màn hình', G('scaleBarOn') !== false) + '<br>' + K.chk('opTip', 'Hiện chú giải công cụ (tooltip)', S.rollover !== false) + '<br>' + K.chk('opScroll', 'Hiện thanh cuộn trong vùng vẽ', 0, { dis: 1 }) +
            '<div class="acw-row" style="margin-top:6px">' + K.btn('opColors', 'Màu…') + '<span class="acw-note" style="margin:0">Nền trắng ↔ tối (bản in)</span></div>') +
          K.grp('Hiển thị bề rộng nét', K.chk('opLw', 'Hiện bề rộng nét (LWT)', !!G('showLW')) + '<div style="margin-top:4px">' + K.btn('opLwS', 'Cài đặt bề rộng nét…') + '</div>') + '</div><div class="c1">' +
          K.grp('Cỡ chữ thập (%)', slider('opXh', S.xhair || 100, 3, 100)) +
          K.grp('Độ phân giải', K.row('Độ mịn cung và tròn:', K.num('opArc', 1000, { dis: 1 }), { dis: 1 }) + K.row('Số đoạn mỗi đường cong polyline:', K.num('opSeg', 8, { dis: 1 }), { dis: 1 })) + '</div></div>',
      open: K.grp('Lưu file', K.vrow('Lưu thành (DXF):', K.sel('opDxf', dxfV, A.dxfVer || 'R2018')) + '<div class="acw-note">Ghi DWG dùng SAVEDWG / DWGSERVER (DWG 2000 gốc hoặc qua ODA).</div>' + '<div style="margin-top:6px">' + K.btn('opDwg', 'Cài đặt lưu DWG…') + '</div>') +
        K.grp('Phòng mất dữ liệu', K.chk('opAs', 'Tự lưu', 0, { dis: 1 }) + K.row('Phút giữa các lần lưu:', K.num('opAsM', 10, { dis: 1 }), { dis: 1 })) +
        K.grp('Mở file', K.row('Số file gần đây:', K.num('opMru', 9, { dis: 1 }), { dis: 1 }) + K.chk('opFp', 'Hiện đường dẫn đầy đủ trong tiêu đề', 0, { dis: 1 })),
      plot: K.grp('Cài đặt in mặc định cho bản vẽ mới', K.vrow('Thiết bị in mặc định:', K.sel('opPdev', [['pdf', 'DWG To PDF.pc3'], ['print', 'Máy in Windows (hệ thống)'], ['png', 'PublishToWeb PNG.pc3']], (A.PS && A.PS.dev) || 'pdf')) + '<div style="margin-top:6px">' + K.btn('opPst', 'Bảng kiểu in (.ctb)…') + '</div>') +
        K.grp('In nền', K.chk('opBg', 'In', 0, { dis: 1 }) + K.chk('opBgP', 'Xuất bản', 0, { dis: 1 })),
      system: K.grp('Hiệu năng', K.btn('opPerf', 'Cài đặt hiệu năng đồ hoạ…', { dis: 1 })) + K.grp('Tuỳ chọn chung', K.chk('opBeep', 'Kêu khi nhập sai', 0, { dis: 1 }) + '<br>' + K.chk('opOle', 'Tải ứng dụng LISP lúc khởi động', 1, { dis: 1 })) +
        K.grp('Thông tin', '<div class="acw-note" style="margin:0">DVDCAD · ' + esc((A.sysvar && A.sysvar.get && A.sysvar.get('ACADVER')) || '') + '</div>'),
      user: K.grp('Thao tác chuẩn Windows', K.chk('opDbl', 'Bấm đúp để sửa', 1, { dis: 1 }) + '<br>' + K.chk('opCtx', 'Menu chuột phải trong vùng vẽ', 1, { dis: 1 }) + K.row('Giữ chuột phải để hiện menu khi đang chạy lệnh (ms):', K.num('opRc', S.rcMs || 250, { min: 50, max: 2000 }))) +
        K.grp('Tỉ lệ khi chèn', K.row('Đơn vị nội dung nguồn:', K.sel('opIu', [['mm', 'Milimét']], 'mm', { dis: 1 }), { dis: 1 })) +
        K.grp('Ưu tiên nhập toạ độ', K.rad('opCo', 'run', 'Bắt điểm khi chạy', 0, { dis: 1 }) + '<br>' + K.rad('opCo', 'kb', 'Nhập từ bàn phím', 0, { dis: 1 }) + '<br>' + K.rad('opCo', 'kbx', 'Nhập từ bàn phím, trừ script', 1, { dis: 1 })),
      drafting: '<div class="acw-cols"><div class="c1">' + K.grp('Cài đặt AutoSnap', K.chk('opMk', 'Dấu bắt điểm', 1, { dis: 1 }) + '<br>' + K.chk('opMg', 'Nam châm', 0, { dis: 1 }) + '<br>' + K.chk('opAtip', 'Hiện chú giải AutoSnap', 1, { dis: 1 }) + '<br>' + K.chk('opAbox', 'Hiện ô bắt điểm', 0, { dis: 1 })) +
          K.grp('Cỡ ô bắt điểm (aperture)', slider('opAp', S.aperture || 10, 4, 30)) + '</div><div class="c1">' +
          K.grp('Cài đặt AutoTrack', K.chk('opPv', 'Hiện đường truy bắt cực', S.polar !== false) + '<br>' + K.chk('opOt', 'Hiện đường truy bắt điểm', S.otrack !== false)) +
          K.grp('Truy bắt', '<div class="acw-note" style="margin:0">Dừng con trỏ trên điểm bắt để lấy điểm truy bắt (như AutoCAD).</div>') + '<div style="margin-top:6px">' + K.btn('opDs', 'Cài đặt trợ giúp vẽ…') + '</div></div></div>',
      selection: '<div class="acw-cols"><div class="c1">' + K.grp('Cỡ ô chọn (pickbox)', slider('opPb', S.pickbox || 5, 2, 15)) +
          K.grp('Chế độ chọn', K.chk('opPf', 'Chọn trước rồi gọi lệnh (noun/verb)', S.pickfirst !== false) + '<br>' + K.chk('opSh', 'Giữ Shift để thêm vào tập chọn', 0, { dis: 1 }) + '<br>' + K.chk('opIw', 'Kéo khung khi bấm vào chỗ trống', 1, { dis: 1 }) + '<br>' + K.chk('opGr', 'Chọn cả nhóm', S.pickGroup !== false) + '<br>' + K.chk('opRo', 'Xem trước khi rê chuột lên đối tượng', S.rollover !== false)) + '</div><div class="c1">' +
          K.grp('Ô nắm (grip)', K.chk('opGs', 'Hiện ô nắm', 1, { dis: 1 }) + '<br>' + K.chk('opGb', 'Hiện ô nắm trong khối', 0, { dis: 1 }) + K.row('Giới hạn số đối tượng hiện ô nắm:', K.num('opGl', 100, { dis: 1 }), { dis: 1 })) + '</div></div>'
    };
    const TABS = [['display', 'Hiển thị'], ['open', 'Mở và lưu'], ['plot', 'In và xuất bản'], ['system', 'Hệ thống'], ['user', 'Tuỳ chọn người dùng'], ['drafting', 'Hỗ trợ vẽ'], ['selection', 'Vùng chọn']];
    const html = '<div class="acw"><div class="acw-row" style="margin:0 0 6px"><span>Hồ sơ hiện hành:</span> <span class="nm">&lt;&lt;Hồ sơ chưa đặt tên&gt;&gt;</span><span class="l"></span><span>Bản vẽ hiện hành:</span> <span class="nm" id="opDn"></span></div>' +
      K.tabs('op', TABS, cur) + '<div class="acw-panes" style="height:min(400px,calc(90vh - 200px));overflow:auto">' + TABS.map(([k]) => K.pane('op', k, cur, T[k])).join('') + '</div></div>';
    const apply = r => { const c = id => K.on(r, id), n = id => num(K.val(r, id));
      S.xhair = Math.max(3, Math.min(100, n('opXhN') | 0 || 100)); S.aperture = Math.max(4, Math.min(30, n('opApN') | 0 || 10)); S.pickbox = Math.max(2, Math.min(15, n('opPbN') | 0 || 5));
      S.rollover = c('opRo'); S.pickfirst = c('opPf'); S.pickGroup = c('opGr'); const rc = n('opRc'); if(rc >= 50) S.rcMs = Math.min(2000, rc);
      try{ const sb = c('opSb'); if(sb !== scaleBarOn){ scaleBarOn = sb; localStorage.setItem('dvdcad_scalebar', sb ? '1' : '0'); } }catch(_){}
      try{ const lw = c('opLw'); if(lw !== !!showLW){ showLW = lw; syncDisplayToggles(); } }catch(_){}
      if(A.setDxfVer) A.setDxfVer(K.val(r, 'opDxf')); if(A.PS){ A.PS.dev = K.val(r, 'opPdev'); try{ localStorage.setItem('dvd:plot', JSON.stringify(A.PS)); }catch(_){} }
      A.saveSet(); try{ draw(); }catch(_){} };
    const d = A.dialog({ title: 'Tuỳ chọn', cls: 'acw-free', help: 'OPTIONS', html, ok: r => apply(r), left: '' });
    const root = d.root; root.querySelector('.modal').style.width = 'min(720px,97vw)';
    try{ root.querySelector('#opDn').textContent = (typeof currentName !== 'undefined' && currentName) || '—'; }catch(_){}
    const ap = document.createElement('button'); ap.type = 'button'; ap.className = 'btn-ghost'; ap.textContent = 'Áp dụng'; root.querySelector('.dvd-help').before(ap); ap.onclick = () => apply(root);
    K.bindTabs(root);
    root.querySelectorAll('input[type=range]').forEach(rg => { const nb = root.querySelector('#' + rg.id + 'N'); rg.oninput = () => { nb.value = rg.value; }; nb.oninput = () => { rg.value = nb.value; }; });
    const on = (id, fn) => { const b = root.querySelector('#' + id); if(b) b.onclick = fn; };
    on('opColors', () => { const b = document.getElementById('themeBtn'); if(b) b.click(); });
    on('opLwS', () => A.openLweight && A.openLweight()); on('opDwg', () => DVDCmd.run('DWGSERVER')); on('opPst', () => DVDCmd.run('STYLESMANAGER')); on('opDs', () => openDrafting());
    return d;
  }
  A.openOptions = openOptions;
  plain(['OPTIONS', 'OP', 'PREFERENCES', 'TUYCHON'], 'Tuỳ chọn (Options): hiển thị, mở / lưu, in, trợ giúp vẽ, chọn đối tượng', () => { if(A.busy && A.busy()) A.cancel(true); openOptions(); });

  /* ==================================================================
     COLOR — Select Color (Index Color · True Color · Color Books) như AutoCAD
     ================================================================== */
  const aciTab = () => { try{ return ACI_RGB; }catch(_){ return null; } };
  const aciHex = i => { const T = aciTab(); return T ? '#' + ((T[i] >>> 0) & 0xffffff).toString(16).padStart(6, '0') : '#ffffff'; };
  const ACI_NM = { 1: 'red', 2: 'yellow', 3: 'green', 4: 'cyan', 5: 'blue', 6: 'magenta', 7: 'white' };
  const hexRgb = h => { const n = parseInt(String(h || '').replace('#', ''), 16); return isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 255, 255]; };
  const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, '0')).join('');
  const aciExact = h => { const T = aciTab(); if(!T) return 0; const n = parseInt(String(h || '').replace('#', ''), 16); for(let i = 1; i <= 255; i++) if(((T[i] >>> 0) & 0xffffff) === n) return i; return 0; };
  // chuỗi người dùng gõ trong ô Color: số ACI, tên (red…), "r,g,b", #rrggbb, bylayer / byblock
  function parseColor(t){ t = String(t || '').trim().toLowerCase(); if(!t) return null; if(t === 'bylayer') return 'BYLAYER'; if(t === 'byblock') return 'BYBLOCK';
    if(/^#?[0-9a-f]{6}$/.test(t)) return '#' + t.replace('#', ''); if(/^\d{1,3}$/.test(t) && +t >= 1 && +t <= 255) return aciHex(+t);
    const m = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/.exec(t); if(m) return rgbHex(m[1], m[2], m[3]);
    const k = Object.keys(ACI_NM).find(i => ACI_NM[i] === t); return k ? aciHex(+k) : null; }
  const colLabel = c => c === 'BYLAYER' ? 'ByLayer' : c === 'BYBLOCK' ? 'ByBlock' : (() => { const i = aciExact(c); return i ? (ACI_NM[i] || String(i)) : hexRgb(c).join(','); })();
  function selectColor(cur, cb, o){
    o = o || {}; let pick = cur || (o.byLayer !== false ? 'BYLAYER' : '#ffffff'); const old = pick;
    const sw = i => '<button type="button" class="sc-sw" data-i="' + i + '" style="background:' + aciHex(i) + '" title="' + i + '"></button>';
    let grid = ''; for(let row = 0; row < 10; row++) for(let c = 0; c < 24; c++){ const i = 10 + c * 10 + row; grid += i <= 249 ? sw(i) : '<span></span>'; }
    const idx = '<div class="acw-lab">Bảng màu chỉ số AutoCAD (ACI):</div><div class="sc-grid">' + grid + '</div>' +
      '<div class="acw-row" style="margin:6px 0"><span>Màu chỉ số:</span> <b id="scI" style="font-weight:400;min-width:40px"></b><span class="l"></span><span>Đỏ, Xanh lá, Xanh dương:</span> <b id="scR" style="font-weight:400"></b></div>' +
      '<div style="display:flex;gap:10px;align-items:flex-start"><div><div class="sc-row">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(sw).join('') + '</div><div class="sc-row">' + [250, 251, 252, 253, 254, 255].map(sw).join('') + '</div></div>' +
      '<span class="l" style="flex:1"></span><div class="acw-btncol">' + K.btn('scBL', 'ByLayer', { dis: o.byLayer === false }) + K.btn('scBB', 'ByBlock', { dis: !o.byBlock }) + '</div></div>';
    const [r0, g0, b0] = hexRgb(pick !== 'BYLAYER' && pick !== 'BYBLOCK' ? pick : '#ffffff');
    const tc = '<div class="acw-cols"><div class="c1">' + K.row('Mô hình màu:', K.sel('scMd', [['rgb', 'RGB'], ['hsl', 'HSL']], 'rgb', { dis: 1 })) +
      ['Đỏ:', 'Xanh lá:', 'Xanh dương:'].map((t, k) => '<div class="acw-row"><span class="l" style="flex:0 0 80px">' + t + '</span><input type="range" min="0" max="255" id="scT' + k + '" value="' + [r0, g0, b0][k] + '" style="flex:1;width:auto"><input type="number" min="0" max="255" id="scN' + k + '" value="' + [r0, g0, b0][k] + '" style="width:60px;flex:0 0 60px"></div>').join('') +
      K.row('Mã màu:', K.txt('scHex', rgbHex(r0, g0, b0))) + '</div><div class="c2"><input type="color" id="scPk" value="' + rgbHex(r0, g0, b0) + '" style="width:110px;height:110px;padding:0;border:1px solid #5a6578;background:none"></div></div>';
    const html = '<div class="acw" style="width:560px">' + K.tabs('sc', [['idx', 'Màu chỉ số'], ['tc', 'Màu thật'], ['cb', 'Bảng màu (Color Books)']], 'idx') + '<div class="acw-panes" style="min-height:300px">' +
      K.pane('sc', 'idx', 'idx', idx) + K.pane('sc', 'tc', 'idx', tc) + K.pane('sc', 'cb', 'idx', '<div class="acw-note">Chưa hỗ trợ bảng màu (Pantone, RAL…). Dùng Màu thật để nhập mã RGB.</div>') + '</div>' +
      '<div class="acw-row" style="margin-top:8px"><span>Màu:</span>' + K.txt('scC', colLabel(pick)) + '<span class="l"></span><span class="sc-old" title="Cũ"></span><span class="sc-new" title="Mới"></span></div></div>';
    const d = A.dialog({ title: 'Chọn màu', cls: 'acw-free', help: 'COLOR', html, ok: r => { const v = parseColor(K.val(r, 'scC')); if(v) pick = v; if(pick === 'BYBLOCK' && !o.byBlock){ say('ByBlock chưa dùng được ở đây.'); return false; } cb(pick); } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    const show = (c, from) => { pick = c; const hex = c === 'BYLAYER' || c === 'BYBLOCK' ? '#ffffff' : c; const i = c === 'BYLAYER' ? 'BYLAYER' : c === 'BYBLOCK' ? 'BYBLOCK' : aciExact(hex);
      $('scI').textContent = i === 'BYLAYER' ? 'ByLayer' : i === 'BYBLOCK' ? 'ByBlock' : i || '—'; $('scR').textContent = c === 'BYLAYER' || c === 'BYBLOCK' ? '—' : hexRgb(hex).join(',');
      if(from !== 'txt') $('scC').value = colLabel(c); root.querySelector('.sc-new').style.background = c === 'BYLAYER' && A.layerHex ? A.layerHex(A.LS.cur) : hex;
      root.querySelectorAll('.sc-sw').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      if(from !== 'tc' && c !== 'BYLAYER' && c !== 'BYBLOCK'){ const rgb = hexRgb(hex); rgb.forEach((v, k) => { $('scT' + k).value = v; $('scN' + k).value = v; }); $('scHex').value = hex; $('scPk').value = hex; } };
    root.querySelector('.sc-old').style.background = old === 'BYLAYER' && A.layerHex ? A.layerHex(A.LS.cur) : old === 'BYBLOCK' ? '#ffffff' : old;
    root.querySelectorAll('.sc-sw').forEach(b => { b.onclick = () => show(aciHex(+b.dataset.i)); b.ondblclick = () => { show(aciHex(+b.dataset.i)); root.querySelector('.dvd-ok').click(); };
      b.onmouseenter = () => { $('scI').textContent = b.dataset.i; $('scR').textContent = hexRgb(aciHex(+b.dataset.i)).join(','); }; b.onmouseleave = () => show(pick, 'hover'); });
    $('scBL').onclick = () => show('BYLAYER'); $('scBB').onclick = () => show('BYBLOCK');
    const fromRgb = () => { const v = [0, 1, 2].map(k => +$('scN' + k).value || 0); show(rgbHex(...v), 'tc'); $('scHex').value = pick; $('scPk').value = pick; };
    for(let k = 0; k < 3; k++){ $('scT' + k).oninput = () => { $('scN' + k).value = $('scT' + k).value; fromRgb(); }; $('scN' + k).oninput = () => { $('scT' + k).value = $('scN' + k).value; fromRgb(); }; }
    $('scHex').onchange = () => { const v = parseColor($('scHex').value); if(v && v[0] === '#') show(v); };
    $('scPk').oninput = () => show($('scPk').value);
    $('scC').addEventListener('input', () => { const v = parseColor($('scC').value); if(v) show(v, 'txt'); });
    show(pick);
    return d;
  }
  A.selectColor = selectColor;
  plain(['COLOR', 'COL', 'COLOUR', 'DDCOLOR'], 'Chọn màu hiện hành (Select Color): bảng ACI, màu thật RGB, ByLayer', () => selectColor(A.LS && A.LS.color, c => {
    if(c === 'BYBLOCK') return; if(A.setCurColor) A.setCurColor(c); try{ A.onSetChange && A.onSetChange(); }catch(_){} log('Màu hiện hành: ' + colLabel(c)); }, { byLayer: true }));

  /* ==================================================================
     Tab ngữ cảnh "Array Creation" (ARRAYRECT / ARRAYPOLAR đang chạy) — sửa số lượng / khoảng cách, xem trước ngay
     ================================================================== */
  if(A.ribbon && A.ribbon.RIB && A.ribbonAct){
    const inp = v => { try{ A.input(v); }catch(_){} };
    A.ribbonAct('ARX_CLOSE', () => inp('')); A.ribbonAct('ARX_ASSOC', () => { const st = A._arr; if(!st) return; st.assoc = !st.assoc; try{ A.ribbon.render(); }catch(_){} });
    A.ribbonAct('ARX_ROT', () => { const st = A._arr; if(!st) return; st.rot = !st.rot; A._arrUpd && A._arrUpd(); try{ A.ribbon.render(); }catch(_){} });
    A.ribbonAct('ARX_DIR', () => { const st = A._arr; if(!st) return; st.cw = !st.cw; A._arrUpd && A._arrUpd(); try{ A.ribbon.render(); }catch(_){} });
    A.ribbonAct('ARX_NONE', () => {});
    const big = (cmd, en, vi, icon, o) => Object.assign({ t: 'big', cmd, en, vi, icon }, o || {});
    const fmtN = v => String(+(+v).toPrecision(6));
    // ô nhập trong bảng: rows = [[nhãn, khoá, tắt?]]; đổi giá trị → cập nhật trạng thái mảng rồi vẽ lại xem trước
    const fields = (rows, apply) => ({ t: 'html', html: () => { const st = A._arr || {}; return '<div class="arx">' + rows.map(([lab, k, dis]) => '<label><span>' + lab + '</span><input data-k="' + k + '" type="number" step="any" value="' + esc(dis ? 1 : fmtN(apply.get(st, k))) + '"' + (dis ? ' disabled' : '') + '></label>').join('') + '</div>'; },
      bind: el => { el.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); e.target.blur(); } });
        el.addEventListener('change', e => { const i = e.target.closest('input[data-k]'); const st = A._arr; if(!i || !st) return; const v = num(i.value); if(v == null) return; apply.set(st, i.dataset.k, v);
          el.querySelectorAll('input[data-k]').forEach(x => { if(!x.disabled && x !== i) x.value = fmtN(apply.get(st, x.dataset.k)); }); if(A._arrUpd) A._arrUpd(); }); } });
    const R = { get: (st, k) => k === 'C' ? st.C : k === 'dx' ? st.dx : k === 'tx' ? st.dx * (st.C - 1) : k === 'R' ? st.R : k === 'dy' ? st.dy : k === 'ty' ? st.dy * (st.R - 1) : 1,
      set: (st, k, v) => { if(k === 'C') st.C = Math.max(1, Math.min(500, Math.round(v))); if(k === 'R') st.R = Math.max(1, Math.min(500, Math.round(v))); if(k === 'dx') st.dx = v; if(k === 'dy') st.dy = v; if(k === 'tx' && st.C > 1) st.dx = v / (st.C - 1); if(k === 'ty' && st.R > 1) st.dy = v / (st.R - 1); } };
    const full = st => Math.abs(st.F - 360) < 1e-9;
    const P = { get: (st, k) => k === 'N' ? st.N : k === 'a' ? st.F / (full(st) ? st.N : st.N - 1) : k === 'F' ? st.F : 1,
      set: (st, k, v) => { if(k === 'N') st.N = Math.max(2, Math.min(1000, Math.round(v))); if(k === 'F') st.F = Math.max(1e-6, Math.min(360, Math.abs(v))); if(k === 'a') st.F = Math.min(360, Math.abs(v) * (full(st) ? st.N : st.N - 1)); } };
    const props = (polar) => ({ t: 'html', html: () => { const st = A._arr || {}; return '<div class="arx-b">' + [['ARX_ASSOC', 'Liên kết', 'ARRAYEDIT', st.assoc], ['ARX_NONE', 'Điểm gốc', 'ID', false, 1]].concat(polar ? [['ARX_ROT', 'Xoay phần tử', 'ROTATE', st.rot], ['ARX_DIR', 'Chiều', 'ARRAYPOLAR', !st.cw]] : [])
        .map(([c, t, ic, on, dis]) => '<button type="button" class="ac-rbig' + (on ? ' on' : '') + '" data-c="' + c + '"' + (dis ? ' disabled style="opacity:.45"' : '') + '>' + (A.ico ? A.ico(ic) : '') + '<span>' + t + '</span></button>').join('') + '</div>'; } });
    const close = { id: 'arc', en: 'Close', vi: 'Đóng', pri: 0, items: [big('ARX_CLOSE', 'Close\nArray', 'Đóng\nmảng', 'CLOSE')] };
    A.ribbon.RIB.arrayctx = { en: 'Array Creation', vi: 'Tạo mảng', ctx: true, panels: [
      { id: 'art', en: 'Type', vi: 'Kiểu', pri: 6, items: [big('ARX_NONE', 'Rectangular', 'Chữ nhật', 'ARRAYRECT')] },
      { id: 'arcol', en: 'Columns', vi: 'Cột', pri: 0, items: [fields([['Cột:', 'C'], ['Khoảng:', 'dx'], ['Tổng:', 'tx']], R)] },
      { id: 'arrow', en: 'Rows', vi: 'Hàng', pri: 0, items: [fields([['Hàng:', 'R'], ['Khoảng:', 'dy'], ['Tổng:', 'ty']], R)] },
      { id: 'arlev', en: 'Levels', vi: 'Tầng', pri: 7, items: [fields([['Tầng:', 'L', 1], ['Khoảng:', 'dz', 1], ['Tổng:', 'tz', 1]], R)] },
      { id: 'arpro', en: 'Properties', vi: 'Thuộc tính', pri: 3, items: [props(false)] }, close ] };
    A.ribbon.RIB.arrayctxp = { en: 'Array Creation', vi: 'Tạo mảng', ctx: true, panels: [
      { id: 'art', en: 'Type', vi: 'Kiểu', pri: 6, items: [big('ARX_NONE', 'Polar', 'Tròn', 'ARRAYPOLAR')] },
      { id: 'aritm', en: 'Items', vi: 'Phần tử', pri: 0, items: [fields([['Số phần tử:', 'N'], ['Góc giữa:', 'a'], ['Lấp đầy:', 'F']], P)] },
      { id: 'arrow', en: 'Rows', vi: 'Hàng', pri: 7, items: [fields([['Hàng:', 'R', 1], ['Khoảng:', 'dy', 1], ['Tổng:', 'ty', 1]], P)] },
      { id: 'arlev', en: 'Levels', vi: 'Tầng', pri: 8, items: [fields([['Tầng:', 'L', 1], ['Khoảng:', 'dz', 1], ['Tổng:', 'tz', 1]], P)] },
      { id: 'arpro', en: 'Properties', vi: 'Thuộc tính', pri: 3, items: [props(true)] }, close ] };
  }

  /* ==================================================================
     Chữ có định dạng (như MTEXT của AutoCAD): các đoạn { t, b, i, u, o, f } — đậm / nghiêng / gạch chân / gạch trên / trường (field)
     e.rt = các đoạn · e.rtx = e.text lúc gán (chữ bị sửa ở nơi khác thì bỏ định dạng) · e.cols = cột { n, w, g, h, dyn } (đơn vị bản vẽ)
     ================================================================== */
  const FAM = f => (f ? '"' + f + '",' : '') + '-apple-system,system-ui,"Segoe UI",Roboto,Arial,"Noto Sans","Helvetica Neue",sans-serif';
  let mctx = null;
  const measure = (t, font) => { if(!mctx) mctx = document.createElement('canvas').getContext('2d'); mctx.font = font; return mctx.measureText(t).width; };
  const COLBRK = '\f';   // ngắt cột (Alt+Enter)
  const FK = ['b', 'i', 'u', 'o'];
  const fkey = r => (r.b ? 'b' : '') + (r.i ? 'i' : '') + (r.u ? 'u' : '') + (r.o ? 'o' : '');
  const rtCell = r => { const o = { t: String(r.t == null ? '' : r.t) }; for(const k of FK) if(r[k]) o[k] = 1; if(r.f) o.f = r.f; return o; };
  function rtNorm(runs){ const out = []; for(const r0 of runs || []){ if(!r0) continue; const r = rtCell(r0); if(!r.t && !r.f) continue; const L = out[out.length - 1]; if(L && !L.f && !r.f && fkey(L) === fkey(r)) L.t += r.t; else out.push(r); } return out; }
  const rtPlain = runs => (runs || []).map(r => r.t).join('');
  const rtFancy = runs => (runs || []).some(r => r.f || r.b || r.i || r.u || r.o || r.t.indexOf(COLBRK) >= 0);
  const rtValid = e => !!(e && e.rt && e.rt.length && e.rtx === e.text);
  const rfont = (r, px, ff) => (r.i ? 'italic ' : '') + (r.b ? 'bold ' : '') + px + 'px ' + FAM(ff);
  A.rtOf = e => rtValid(e) ? e.rt.map(rtCell) : null;
  // dàn dòng: xuống dòng cứng (\n), ngắt cột (\f), ngắt mềm theo bề rộng wpx (đo bằng phông thật, cỡ px); từ dài hơn khung thì tràn như AutoCAD
  function rtLines(runs, px, ff, wpx, xs){
    xs = Math.abs(xs || 1) || 1; const lines = []; let segs = [], lw = 0, cb = false;
    const endLine = soft => {
      if(soft) for(let k = segs.length - 1; k >= 0; k--){ const s = segs[k]; if(s.f) break; const t = s.t.replace(/\s+$/, ''); if(t === s.t) break; lw -= s.w; s.t = t; s.w = t ? measure(t, rfont(s, px, ff)) : 0; lw += s.w; if(t) break; segs.pop(); }
      lines.push({ segs, w: lw, cb }); segs = []; lw = 0; cb = false; };
    const add = tok => { const w = measure(tok.t, rfont(tok, px, ff)), wt = tok.f ? w : measure(tok.t.replace(/\s+$/, ''), rfont(tok, px, ff));
      if(wpx > 0 && segs.length && (lw + wt) * xs > wpx + 0.01) endLine(true);
      const L = segs[segs.length - 1]; if(L && !L.f && !tok.f && fkey(L) === fkey(tok)){ L.t += tok.t; L.w += w; } else segs.push(Object.assign({}, tok, { w })); lw += w; };
    for(const r of runs || []){ if(r.f){ add(rtCell(r)); continue; }
      for(const part of String(r.t).split(/(\n|\f)/)){ if(part === '\n'){ endLine(false); continue; } if(part === COLBRK){ endLine(false); cb = true; continue; } if(!part) continue;
        for(const wd of part.split(/(?<=\s)/)) if(wd) add(Object.assign(rtCell(r), { t: wd })); } }
    endLine(false); return lines;
  }
  const linesPlain = lines => lines.map(L => L.segs.map(s => s.t).join('')).join('\n');
  // ngắt dòng chữ thường theo bề rộng (đơn vị bản vẽ) — dùng chung cách dàn dòng ở trên
  function wrapText(src, h, w, ff, xs){ if(!(w > 0) || !(h > 0)) return String(src); return linesPlain(rtLines([{ t: String(src) }], 100, ff, w * 100 / h, xs)); }
  const srcOf = e => rtValid(e) ? e.rt : [{ t: e.cols && e.mtp ? e.mtp : String(e.text || '') }];
  const wrapW = e => e.cols ? +e.cols.w || 0 : (e.mtwk > 0 ? e.mtwk * (e.h || 1) : 0);
  const LAY = new WeakMap(), LAYX = new WeakMap();
  function entLines(e, px, cache){
    // khoá rẻ (không chuỗi hoá các đoạn mỗi khung hình): đối tượng được thay mới khi sửa, nên so tham chiếu e.rt là đủ
    const ww = wrapW(e), C = e.cols, key = px + '|' + e.ff + '|' + ww + '|' + (e.xs || 1) + '|' + e.text + '|' + (e.rtx === e.text) + '|' + (C ? C.n + ',' + C.w + ',' + C.g + ',' + C.h + ',' + (C.dyn ? 1 : 0) : 0) + '|' + (e.mtp || '');
    const c = cache.get(e); if(c && c.key === key && c.rt === e.rt) return c.lines;
    const lines = rtLines(srcOf(e), px, e.ff, ww > 0 ? ww * px / (e.h || 1) : 0, e.xs); cache.set(e, { key, rt: e.rt, lines }); return lines;
  }
  // chữ thuần theo dàn dòng (có ngắt mềm) — e.text của chữ có định dạng / có cột
  const layoutPlain = e => linesPlain(entLines(e, 100, LAYX));
  // vị trí từng dòng (đơn vị của ctx: px, trục x đã nhân hệ số rộng), cột theo chiều cao cột
  const BOFF = { alphabetic: 0, top: 0.8, middle: 0.3, bottom: -0.2 };
  function place(e, lines, px){
    const k = px / (e.h || 1), xs = Math.abs(e.xs || 1) || 1, lh = px * 1.3, va = e.va || 'alphabetic', ha = e.ha === 'end' ? 'right' : (e.ha || 'left'), C = e.cols;
    const per = C && C.h > 0 ? Math.max(1, Math.floor(C.h * k / lh + 1e-6)) : Infinity;
    const at = []; let c = 0, r = 0; lines.forEach((L, i) => { if(i && C && (L.cb || r >= per)){ c++; r = 0; } at.push([c, r]); r++; });
    const rows = C ? Math.max(1, ...at.map(a => a[1] + 1)) : lines.length, used = (at.length ? at[at.length - 1][0] : 0) + 1;
    const st = va === 'middle' ? -(rows - 1) / 2 * lh : va === 'top' ? 0 : -(rows - 1) * lh;
    const cw = C ? C.w * k / xs : 0, gw = C ? (C.g || 0) * k / xs : 0, nC = C ? (C.dyn ? used : Math.max(1, C.n || 1)) : 1, tot = nC * cw + (nC - 1) * gw;
    const x0 = C ? (ha === 'center' ? -tot / 2 : ha === 'right' ? -tot : 0) : 0;
    return lines.map((L, i) => { const [cc, rr] = at[i], bx = x0 + cc * (cw + gw);
      const ax = C ? (ha === 'center' ? (cw - L.w) / 2 : ha === 'right' ? cw - L.w : 0) : (ha === 'center' ? -L.w / 2 : ha === 'right' ? -L.w : 0);
      return { x: (C ? bx : 0) + ax, y: st + rr * lh, c: cc, bx, cw }; });
  }
  const plotting = () => { try{ return !!plotMode; }catch(_){ return false; } };
  // vẽ (ctx đã dời về điểm chèn, xoay, nhân hệ số rộng — gọi từ bộ vẽ TEXT của index.html)
  A.drawRichText = function(ctx, e, px){
    const lines = entLines(e, px, LAY), P = place(e, lines, px), va = e.va || 'alphabetic', bo = (BOFF[va] || 0) * px, th = Math.max(1, px * 0.06), fill = ctx.fillStyle, pl = plotting();
    ctx.textAlign = 'left'; ctx.textBaseline = va;
    lines.forEach((L, i) => { let x = P[i].x; const y = P[i].y;
      for(const s of L.segs){ if(!s.t) continue; ctx.font = rfont(s, px, e.ff);
        if(s.f && !pl){ ctx.fillStyle = 'rgba(150,150,150,.32)'; ctx.fillRect(x, y + bo - 0.92 * px, s.w, 1.18 * px); ctx.fillStyle = fill; }   // nền xám của trường (FIELDDISPLAY), không in
        ctx.fillText(s.t, x, y); if(s.u) ctx.fillRect(x, y + bo + 0.12 * px, s.w, th); if(s.o) ctx.fillRect(x, y + bo - 0.9 * px, s.w, th); x += s.w; } });
  };
  // khung bao (toạ độ riêng của chữ, trục y hướng lên) — cho chọn / bắt điểm / phóng vừa
  A.richExtent = function(e){
    const px = 100, lines = entLines(e, px, LAYX), P = place(e, lines, px), bo = (BOFF[e.va || 'alphabetic'] || 0) * px, k = px / (e.h || 1), xs = e.xs || 1;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    lines.forEach((L, i) => { const p = P[i]; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x + Math.max(L.w, px * 0.3)); const b = p.y + bo; y0 = Math.min(y0, b - 0.85 * px); y1 = Math.max(y1, b + 0.25 * px); });
    if(!isFinite(x0)) return null;
    let xmin = x0 * Math.abs(xs) / k, xmax = x1 * Math.abs(xs) / k; if(xs < 0){ const t = xmin; xmin = -xmax; xmax = -t; }
    return e.ud ? { xmin, xmax, ymin: y0 / k, ymax: y1 / k } : { xmin, xmax, ymin: -y1 / k, ymax: -y0 / k };
  };
  // xuất DXF / DWG: mỗi cột một MTEXT, đoạn định dạng thành mã MTEXT ({\fArial|b1|i0;…} \L…\l \O…\o) để AutoCAD hiện đúng
  A.richPieces = function(e, mtesc){
    const px = 100, lines = entLines(e, px, LAYX), P = place(e, lines, px), k = px / (e.h || 1), xs = e.xs || 1, bo = (BOFF[e.va || 'alphabetic'] || 0) * px;
    const font = e.ff || (A.TS && A.TS.list[e.style] && A.TS.list[e.style].font) || 'Arial', ha = e.ha === 'end' ? 'right' : (e.ha || 'left');
    const code = s => { const t = mtesc(s.t); if(!(s.b || s.i || s.u || s.o)) return t; return '{' + ((s.b || s.i) ? '\\f' + font + '|b' + (s.b ? 1 : 0) + '|i' + (s.i ? 1 : 0) + '|c0|p34;' : '') + (s.u ? '\\L' : '') + (s.o ? '\\O' : '') + t + '}'; };
    const groups = []; lines.forEach((L, i) => { (groups[P[i].c] = groups[P[i].c] || []).push(i); });
    const r = (e.rot || 0) * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    return groups.filter(Boolean).map(idx => { const p0 = P[idx[0]];
      const x = e.cols ? p0.bx + (ha === 'center' ? p0.cw / 2 : ha === 'right' ? p0.cw : 0) : 0, ytop = p0.y + bo - 0.8 * px;
      const lx = x * xs / k, ly = -ytop / k;
      return { x: e.x + cs * lx - sn * ly, y: e.y + sn * lx + cs * ly, ap: 1 + (ha === 'center' ? 1 : ha === 'right' ? 2 : 0),
        str: (Math.abs(Math.abs(xs) - 1) > 1e-3 ? '\\W' + Math.abs(xs) + ';' : '') + (e.obl ? '\\Q' + e.obl + ';' : '') + idx.map(i => lines[i].segs.map(code).join('')).join('\\P') }; });
  };
  // đọc mã định dạng MTEXT của AutoCAD (\L \O \f…|b1|i1; {…}) thành các đoạn — null nếu không có định dạng
  A.mtextRuns = function(raw){
    const s = String(raw || ''); if(!/\\[LlOo]|\|[bi]1/.test(s)) return null;
    if(/\\f[^;|]*(VNI|\.Vn|TCVN|ABC|VSCII)/i.test(s)) return null;   // phông tiếng Việt cũ: để decodeCAD giải mã
    const Z = { b: 0, i: 0, u: 0, o: 0 }, out = [], stack = []; let f = Object.assign({}, Z), buf = '';
    const flush = () => { if(buf){ out.push(Object.assign({ t: buf }, f)); buf = ''; } };
    const set = o => { flush(); f = Object.assign({}, f, o); };
    for(let i = 0; i < s.length; i++){ const c = s[i];
      if(c === '{'){ flush(); stack.push(f); continue; }
      if(c === '}'){ flush(); f = stack.pop() || Object.assign({}, Z); continue; }
      if(c !== '\\'){ buf += c; continue; }
      const n = s[i + 1]; if(n == null) break;
      if(n === '\\' || n === '{' || n === '}'){ buf += n; i++; continue; }
      if(n === 'P' || n === 'X'){ buf += '\n'; i++; continue; }
      if(n === '~'){ buf += ' '; i++; continue; }
      if(n === 'L' || n === 'l'){ set({ u: n === 'L' ? 1 : 0 }); i++; continue; }
      if(n === 'O' || n === 'o'){ set({ o: n === 'O' ? 1 : 0 }); i++; continue; }
      if(n === 'K' || n === 'k'){ i++; continue; }
      if(n === 'U' && s[i + 2] === '+' && /^[0-9a-f]{4}$/i.test(s.substr(i + 3, 4))){ buf += String.fromCodePoint(parseInt(s.substr(i + 3, 4), 16)); i += 6; continue; }
      if(n === 'M' && s[i + 2] === '+' && /^[0-9a-f]{4}$/i.test(s.substr(i + 4, 4))){ buf += String.fromCodePoint(parseInt(s.substr(i + 4, 4), 16)); i += 7; continue; }
      const sc = s.indexOf(';', i + 2), end = sc < 0 ? s.length : sc, spec = s.slice(i + 2, end);
      if(n === 'f'){ const mb = /\|b([01])/.exec(spec), mi = /\|i([01])/.exec(spec); set({ b: mb ? +mb[1] : 0, i: mi ? +mi[1] : 0 }); i = end; continue; }
      if(n === 'S'){ buf += spec.replace(/[#^]/, '/'); i = end; continue; }
      if(/[FACcHQTWpa]/.test(n)){ i = end; continue; }
      buf += n; i++; }
    flush();
    const sym = t => t.replace(/%%[Dd]/g, '°').replace(/%%[Cc]/g, 'Ø').replace(/%%[Pp]/g, '±').replace(/%%%/g, '%');
    const runs = rtNorm(out.map(r => Object.assign(r, { t: sym(r.t).normalize('NFC') }))); return rtFancy(runs) ? runs : null;
  };
  // trường trong chữ có định dạng: tính lại giá trị (UPDATEFIELD, mở / lưu bản vẽ)
  A.rtFieldsRefresh = e => { if(!rtValid(e) || !A.fieldValue || !e.rt.some(r => r.f)) return null; let ch = false;
    const rt = e.rt.map(r => { if(!r.f) return r; const v = A.fieldValue(r.f); if(v === r.t) return r; ch = true; return Object.assign({}, r, { t: v }); }); if(!ch) return null;
    const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; w.rt = rt; const t = layoutPlain(w); w.text = t; w.rtx = t; return w; };
  // sau khi mở file: bỏ mảnh cột phụ (đã gộp trong mảnh đầu), chuẩn hoá chữ có định dạng; định dạng lệch nội dung (đã sửa ở AutoCAD) thì bỏ
  A.onLoad = (function(prev){ return function(){ if(prev) prev.apply(this, arguments); try{
    let ch = 0; const sq = t => String(t || '').replace(/[\s\f]+/g, '');
    for(let i = modelEntities.length - 1; i >= 0; i--){ const e = modelEntities[i]; if(e.colx){ modelEntities.splice(i, 1); ch++; continue; }
      if(e.type !== 'TEXT' || !e.rt) continue; if(!Array.isArray(e.rt) || !(e.cols || sq(rtPlain(e.rt)) === sq(e.text))){ delete e.rt; delete e.rtx; ch++; continue; }
      e.rtx = e.text; const t = layoutPlain(e); e.text = t; e.rtx = t; ch++; }
    if(ch){ try{ bbDirty = true; invalidateSnap(); }catch(_){} try{ draw(); }catch(_){} }
  }catch(err){ console.warn('richtext', err); } }; })(A.onLoad);
  // nội dung gốc (trước khi ngắt dòng) của chữ MTEXT — chỉ dùng khi chữ chưa bị sửa nơi khác
  A.textSrc = e => rtValid(e) ? rtPlain(e.rt).replace(/\f/g, '\n') : (e && e.mtp && e.mtwk > 0 && wrapText(e.mtp, e.h, e.mtwk * e.h, e.ff, e.xs) === e.text) ? e.mtp : String((e && e.text) || '');
  A.wrapText = wrapText;
  // các phép sửa trên đoạn (theo vị trí trong chữ thuần; trường là một khối, không cắt giữa)
  const explode = runs => { const c = []; for(const r of runs || []){ if(r.f){ c.push(rtCell(r)); continue; } for(const ch of r.t) c.push(Object.assign(rtCell(r), { t: ch })); } return c; };
  const cellIdx = (cells, p, down) => { let n = 0; for(let i = 0; i < cells.length; i++){ const L = cells[i].t.length; if(p <= n) return i; if(p < n + L) return down ? i : i + 1; n += L; } return cells.length; };
  const fmtAt = (runs, p) => { const c = explode(runs), i = cellIdx(c, p); const r = c[i - 1] || c[i] || {}; const o = {}; for(const k of FK) if(r[k]) o[k] = 1; return o; };
  function rtReplace(runs, a, b, text, fmt){ const c = explode(runs), i = cellIdx(c, a, true), j = cellIdx(c, b); const ins = text ? [Object.assign({}, fmt || fmtAt(runs, a), { t: text })] : []; c.splice(i, Math.max(0, j - i), ...ins); return rtNorm(c); }
  function rtToggle(runs, a, b, key){ const c = explode(runs), i = cellIdx(c, a, true), j = cellIdx(c, b); const sel = c.slice(i, j).filter(x => x.t.trim() || x.f); const on = !(sel.length && sel.every(x => x[key]));
    for(let k = i; k < j; k++){ if(on) c[k][key] = 1; else delete c[k][key]; } return { runs: rtNorm(c), on }; }
  function rtMap(runs, a, b, fn){ const c = explode(runs), i = cellIdx(c, a, true), j = cellIdx(c, b); for(let k = i; k < j; k++) if(!c[k].f) c[k].t = fn(c[k].t); return rtNorm(c); }
  const rtAllOn = (runs, a, b, key) => { const c = explode(runs), i = cellIdx(c, a, true), j = cellIdx(c, b); const sel = c.slice(i, j).filter(x => x.t.trim() || x.f); return sel.length ? sel.every(x => x[key]) : !!fmtAt(runs, a)[key]; };

  /* ==================================================================
     Soạn chữ ngay trên bản vẽ (MTEXT / TEXT / DDEDIT) + tab ngữ cảnh "Text Editor" như AutoCAD 2027
     MTEXT: Enter xuống dòng, Ctrl+Enter hoặc bấm ra ngoài = lưu, Esc = bỏ; Ctrl+B / I / U, Alt+Enter = ngắt cột.
     TEXT: Enter ở dòng trống = xong, Esc = giữ phần đã gõ.
     ================================================================== */
  const css2 = document.createElement('style');
  css2.textContent = `
  .te-wrap{position:fixed;left:0;top:0;width:0;height:0;z-index:40;transform-origin:0 0;pointer-events:none}
  .te-box{position:absolute;pointer-events:auto;width:max-content}
  .te-ta{display:inline-block;margin:0;padding:2px;border:1px solid #9aa6ba;outline:none;overflow:hidden;background:rgba(22,27,36,.94);caret-color:#fff;line-height:1.3;white-space:pre;box-sizing:border-box;min-width:12px;tab-size:4;vertical-align:top;cursor:text}
  .te-box.mt .te-ta{display:block;border-style:dashed;white-space:pre-wrap;overflow-wrap:normal;word-break:normal}
  .te-box.cols .te-ta{column-fill:auto;overflow:visible}
  .te-ta ::selection,.te-ta::selection{background:rgba(6,150,215,.55)}
  .te-fld{background:rgba(150,150,150,.38);border-radius:1px}
  .te-cb{display:block;height:0;break-after:column;overflow:hidden}
  .te-rul{position:absolute;left:0;right:0;top:-13px;height:12px;border:1px solid #9aa6ba;border-bottom:0;box-sizing:border-box;background:#e9edf3 repeating-linear-gradient(90deg,#6b778a 0 1px,transparent 1px 10px) 0 100%/100% 4px no-repeat}
  .te-rul::after{content:'';position:absolute;right:-1px;top:-1px;width:5px;height:12px;background:#5a6578}
  .tx-p{display:grid;grid-template-columns:auto 120px;gap:3px 6px;align-items:center;font-size:11.5px;padding:2px 4px}
  .tx-p label{display:contents;color:#dfe5ee}
  .tx-p select,.tx-p input{height:21px;background:#262b34;color:#e6eaf0;border:1px solid #4a5363;border-radius:2px;font:11.5px inherit;padding:0 4px;width:120px;box-sizing:border-box}
  .tx-p select:disabled{opacity:.45}
  .tx-p.w{grid-template-columns:auto 170px}.tx-p.w select{width:170px}
  .tx-fr{display:flex;flex-direction:column;gap:2px;padding:2px 4px}
  .tx-fr .r{display:flex;gap:2px;align-items:center}
  .tx-fr .r button{min-width:24px;height:22px;padding:0 5px;background:none;border:1px solid transparent;border-radius:2px;color:#e6eaf0;font:12px inherit;cursor:pointer}
  .tx-fr .r button:hover{background:#4c5869;border-color:#61708a}
  .tx-fr .r button:disabled{opacity:.4;cursor:default;background:none;border-color:transparent}
  .tx-fr .r button.on{background:#0b5f8f;border-color:#0696d7}
  .tx-fr select{height:21px;background:#262b34;color:#e6eaf0;border:1px solid #4a5363;border-radius:2px;font:11.5px inherit;padding:0 4px;width:150px}
  `;
  document.head.appendChild(css2);
  const JUST = { TL: ['left', 'top'], TC: ['center', 'top'], TR: ['right', 'top'], ML: ['left', 'middle'], MC: ['center', 'middle'], MR: ['right', 'middle'], BL: ['left', 'bottom'], BC: ['center', 'bottom'], BR: ['right', 'bottom'], L: ['left', 'alphabetic'], C: ['center', 'alphabetic'], R: ['right', 'alphabetic'] };
  const JNAME = { TL: 'Trên trái', TC: 'Trên giữa', TR: 'Trên phải', ML: 'Giữa trái', MC: 'Giữa giữa', MR: 'Giữa phải', BL: 'Dưới trái', BC: 'Dưới giữa', BR: 'Dưới phải', L: 'Trái (chân chữ)', C: 'Giữa (chân chữ)', R: 'Phải (chân chữ)' };
  const jOf = (ha, va) => Object.keys(JUST).find(k => JUST[k][0] === ha && JUST[k][1] === va) || 'TL';
  const TE = { cur: null, ruler: true };
  try{ TE.ruler = localStorage.getItem('dvd:teRuler') !== '0'; }catch(_){}
  A.textEditor = () => TE.cur;
  // ---- vùng soạn (contenteditable) ↔ các đoạn ----
  function runsHtml(runs){ let h = '';
    for(const r of runs || []){ const st = (r.b ? 'font-weight:bold;' : '') + (r.i ? 'font-style:italic;' : '') + (r.u || r.o ? 'text-decoration-line:' + (r.u ? 'underline' : '') + (r.u && r.o ? ' ' : '') + (r.o ? 'overline' : '') + ';' : '');
      if(r.f){ h += '<span class="te-fld" contenteditable="false" data-f="' + esc(JSON.stringify(r.f)) + '"' + (st ? ' style="' + st + '"' : '') + '>' + esc(r.t) + '</span>'; continue; }
      const body = esc(r.t).replace(/\n/g, '<br>').replace(/\f/g, '<span class="te-cb" contenteditable="false"></span>');
      h += st ? '<span style="' + st + '">' + body + '</span>' : body; }
    return h + '<br>';   // <br> cuối chỉ giữ chỗ (để dòng trống cuối hiện được)
  }
  function fmtOfEl(el, p){ const f = Object.assign({}, p), t = el.tagName; if(t === 'B' || t === 'STRONG') f.b = 1; if(t === 'I' || t === 'EM') f.i = 1; if(t === 'U') f.u = 1;
    const s = el.style; if(s){ const fw = s.fontWeight; if(fw) f.b = (fw === 'bold' || fw === 'bolder' || +fw >= 600) ? 1 : 0; if(s.fontStyle) f.i = /italic|oblique/.test(s.fontStyle) ? 1 : 0;
      const td = s.textDecorationLine || s.textDecoration || ''; if(td){ f.u = /underline/.test(td) ? 1 : 0; f.o = /overline/.test(td) ? 1 : 0; } } return f; }
  function readRuns(root, keepLast){
    const out = [];
    const walk = (node, fmt) => { for(const n of node.childNodes){
        if(n.nodeType === 3){ const t = n.nodeValue.replace(/​/g, '').replace(/\r/g, ''); if(t) out.push(Object.assign({ t }, fmt)); continue; }
        if(n.nodeType !== 1) continue;
        if(n.tagName === 'BR'){ out.push(Object.assign({ t: '\n', _br: 1 }, fmt)); continue; }
        if(n.classList.contains('te-cb')){ out.push({ t: COLBRK }); continue; }
        if(n.classList.contains('te-fld')){ let fd = null; try{ fd = JSON.parse(n.getAttribute('data-f') || 'null'); }catch(_){} out.push(Object.assign({ t: n.textContent, f: fd }, fmtOfEl(n, fmt))); continue; }
        if(/^(DIV|P|LI)$/.test(n.tagName) && out.length && !/\n$/.test(out[out.length - 1].t)) out.push({ t: '\n' });
        walk(n, fmtOfEl(n, fmt)); } };
    walk(root, {});
    if(!keepLast){ const L = out[out.length - 1]; if(L && L._br) out.pop(); }
    return rtNorm(out);
  }
  function selOf(ce){ const S = window.getSelection(); if(!S || !S.rangeCount) return null; const R = S.getRangeAt(0); if(!(ce === R.startContainer || ce.contains(R.startContainer))) return null;
    const off = (node, o) => { const r = document.createRange(); r.setStart(ce, 0); try{ r.setEnd(node, o); }catch(_){ return 0; } return rtPlain(readRuns(r.cloneContents(), true)).length; };
    const a = off(R.startContainer, R.startOffset), b = R.collapsed ? a : off(R.endContainer, R.endOffset); return { s: Math.min(a, b), e: Math.max(a, b) }; }
  function posAt(ce, p){ let n = 0, res = null;
    const walk = node => { for(let i = 0; i < node.childNodes.length && !res; i++){ const c = node.childNodes[i];
        if(c.nodeType === 3){ const L = c.nodeValue.length; if(p <= n + L){ res = [c, p - n]; return; } n += L; continue; }
        if(c.nodeType !== 1) continue;
        const atom = c.tagName === 'BR' || c.classList.contains('te-cb') || c.classList.contains('te-fld');
        if(atom){ const L = c.classList.contains('te-fld') ? c.textContent.length : 1; if(p <= n){ res = [node, i]; return; } if(p < n + L){ res = [node, i + 1]; return; } n += L; continue; }
        walk(c); } };
    walk(ce); return res || [ce, ce.childNodes.length]; }
  function setSelOf(ce, s, e){ const S = window.getSelection(); if(!S) return; const a = posAt(ce, s), b = e === s ? a : posAt(ce, e); const r = document.createRange(); try{ r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); }catch(_){ return; } S.removeAllRanges(); S.addRange(r); }
  function inplaceText(o){
    if(TE.cur) TE.cur.finish(false);
    return new Promise(resolve => {
      const cv = document.getElementById('cv'); if(!cv || typeof toScreen !== 'function'){ resolve(null); return; }
      const TS = A.TS, stl = o.style && TS && TS.list[o.style] ? o.style : (TS ? TS.cur : 'Standard');
      const st = { h: +o.h || 2.5, ha: o.ha || 'left', va: o.va || 'alphabetic', style: stl, font: o.font != null ? o.font : ((TS && TS.list[stl] && TS.list[stl].font) || ''), col: o.col === '' || o.col === 'BYLAYER' || o.col == null ? 'BYLAYER' : o.col, colSet: false, styleSet: false, fontSet: false,
        cols: o.cols ? Object.assign({}, o.cols) : null, boxH: +o.boxH || 0 };
      const rot = +o.rot || 0, multi = !!o.multi, single = !!o.single; let w = +o.w || 0; st.w = w;
      const wrap = document.createElement('div'); wrap.className = 'te-wrap';
      wrap.innerHTML = '<div class="te-box' + (multi ? ' mt' : '') + '">' + (multi ? '<div class="te-rul"></div>' : '') + '<div class="te-ta" contenteditable="true" spellcheck="false" translate="no" role="textbox" aria-multiline="true"></div></div>';
      document.body.appendChild(wrap);
      const box = wrap.firstChild, ce = box.querySelector('.te-ta'), rul = box.querySelector('.te-rul');
      const runs0 = o.runs && o.runs.length ? rtNorm(o.runs) : [{ t: String(o.value || '').replace(/\r/g, '') }];
      ce.innerHTML = runsHtml(multi ? runs0 : [{ t: rtPlain(runs0) }]);
      try{ document.execCommand('styleWithCSS', false, false); }catch(_){}
      const colHex = () => st.col === 'BYLAYER' ? (A.layerHex ? A.layerHex((A.LS && A.LS.cur) || '0') : '#ffffff') : st.col === 'BYBLOCK' ? '#ffffff' : st.col;
      let sig = '';
      const layout = () => {
        const r = cv.getBoundingClientRect(), P = toScreen(o.x, o.y), real = st.h * view.scale, fz = Math.max(12, Math.min(160, real)), k = real > 0 ? fz / real : 1, ppu = view.scale * k;   // px mỗi đơn vị bản vẽ trong ô soạn
        wrap.style.left = (r.left + P.x) + 'px'; wrap.style.top = (r.top + P.y) + 'px';
        const ang = -rot * Math.PI / 180 + (view.rot || 0); wrap.style.transform = ang ? 'rotate(' + ang + 'rad)' : '';
        ce.style.font = fz + 'px ' + FAM(st.font); ce.style.lineHeight = multi ? '1.3' : '1.5'; ce.style.color = colHex(); ce.style.textAlign = st.ha === 'center' ? 'center' : st.ha === 'right' ? 'right' : 'left';   // TEXT: dòng sau cách 1.5 lần cao chữ như khi tạo
        if(rul) rul.style.display = TE.ruler ? '' : 'none';
        const C = st.cols; box.classList.toggle('cols', !!C);
        if(C){ const n = Math.max(1, C.n || 1); ce.style.columnCount = n; ce.style.columnGap = (C.g || 0) * ppu + 'px'; ce.style.width = (n * C.w + (n - 1) * (C.g || 0)) * ppu + 6 + 'px'; ce.style.height = C.h * ppu + 6 + 'px'; }
        else { ce.style.columnCount = ''; ce.style.columnGap = ''; ce.style.height = ''; ce.style.width = multi && st.w > 0 ? Math.max(24, st.w * ppu + 6) + 'px' : ''; }
        ce.style.whiteSpace = C || (multi && st.w > 0) ? 'pre-wrap' : 'pre';   // MTEXT không có bề rộng: không ngắt dòng (như AutoCAD)
        const bw = ce.offsetWidth, bh = ce.offsetHeight, lh = fz * (multi ? 1.3 : 1.5), n = Math.max(1, Math.round((bh - 6) / lh)), pad = 3;
        box.style.left = (st.ha === 'center' ? -bw / 2 : st.ha === 'right' ? -(bw - pad) : -pad) + 'px';
        const lead = (lh - fz) / 2, va = C ? 'top' : st.va;   // khoảng thừa trên dòng đầu (line-height); có cột: khung neo theo đỉnh
        box.style.top = (va === 'top' ? -(pad + lead) : va === 'middle' ? -bh / 2 : va === 'bottom' ? -(pad + (n - 1) * lh + lead + fz) : -(pad + (n - 1) * lh + lead + 0.82 * fz)) + 'px';
        sig = [view.scale, view.offsetX, view.offsetY, view.rot, r.left, r.top, r.width].join(',');
      };
      // ---- hoàn tác riêng của ô soạn (đoạn + vùng chọn) ----
      const hist = []; let hi = -1, tmr = 0, pend = null;
      const snap = () => ({ runs: readRuns(ce), sel: selOf(ce) || { s: 0, e: 0 } });
      const pushH = () => { clearTimeout(tmr); tmr = 0; const S = snap(), cur = hist[hi]; if(cur && JSON.stringify(cur.runs) === JSON.stringify(S.runs)){ cur.sel = S.sel; return; } hist.splice(hi + 1); hist.push(S); if(hist.length > 300) hist.shift(); hi = hist.length - 1; };
      const restoreH = S => { ce.innerHTML = runsHtml(S.runs); layout(); focus(); setSelOf(ce, S.sel.s, S.sel.e); fmtUi(); };
      const undo = () => { if(tmr) pushH(); if(hi > 0){ hi--; restoreH(hist[hi]); } };
      const redo = () => { if(tmr) pushH(); if(hi < hist.length - 1){ hi++; restoreH(hist[hi]); } };
      const focus = () => { try{ ce.focus({ preventScroll: true }); }catch(_){} };
      // đặt nội dung mới (sau một thao tác), giữ vùng chọn s..e
      const setRuns = (runs, s, e) => { if(tmr) pushH(); ce.innerHTML = runsHtml(runs); layout(); focus(); setSelOf(ce, s, e == null ? s : e); pushH(); fmtUi(); };
      const sel = () => selOf(ce) || (() => { const n = rtPlain(readRuns(ce)).length; return { s: n, e: n }; })();
      // B / I / U / O: có vùng chọn → đổi vùng chọn; chưa chọn → áp cho chữ gõ tiếp (như AutoCAD)
      const toggle = key => { if(!multi) return; const S = sel(), R = readRuns(ce);
        if(S.s === S.e){ const curOn = !!(pend && key in pend ? pend[key] : fmtAt(R, S.s)[key]); pend = Object.assign({}, pend || {}, { [key]: curOn ? 0 : 1 }); pendAt = S.s; fmtUi(); return; }
        setRuns(rtToggle(R, S.s, S.e, key).runs, S.s, S.e); };
      let pendAt = -1;
      const insertText = (t, fmtOver) => { const S = sel(), R = readRuns(ce); const f = Object.assign({}, fmtAt(R, S.s), pend && pendAt === S.s ? pend : {}, fmtOver || {}); for(const k of FK) if(!f[k]) delete f[k];
        setRuns(rtReplace(R, S.s, S.e, t, f), S.s + t.length); pend = null; };
      const fmtUi = () => { const S = selOf(ce); if(!S) return; const R = readRuns(ce);
        for(const k of FK){ const on = pend && pendAt === S.s && S.s === S.e && k in pend ? !!pend[k] : rtAllOn(R, S.s, S.e, k); document.querySelectorAll('[data-c="TX_' + k.toUpperCase() + '"]').forEach(b => b.classList.toggle('on', on)); } };
      let done = false, raf = 0; const wasBusy = !!(A.busy && A.busy());
      const tick = () => { if(done) return; const r = cv.getBoundingClientRect(); if([view.scale, view.offsetX, view.offsetY, view.rot, r.left, r.top, r.width].join(',') !== sig) layout();
        if(wasBusy && !A.busy()){ finish(false); return; } raf = requestAnimationFrame(tick); };
      const result = () => { const runs = multi ? readRuns(ce) : [{ t: rtPlain(readRuns(ce)).replace(/\f/g, '\n') }], src = rtPlain(runs).replace(/\f/g, '\n');
        const R = { text: src, h: st.h, ha: st.ha, va: st.va, style: st.styleSet ? st.style : o.style, font: st.fontSet ? st.font : undefined, col: st.colSet ? st.col : undefined };
        if(st.styleSet && !st.fontSet) R.font = undefined;
        if(!multi) return R;
        const fancy = rtFancy(runs) || !!st.cols, tmp = { h: st.h, ff: st.font, xs: 1, mtwk: st.w > 0 && !st.cols ? st.w / st.h : 0, cols: st.cols, rt: fancy ? runs : null, text: src, rtx: src };
        if(st.cols || tmp.mtwk > 0 || fancy){ R.text = layoutPlain(tmp); }
        if(fancy) R.rt = runs; if(st.cols) R.cols = Object.assign({}, st.cols);
        if(tmp.mtwk > 0){ R.mtwk = tmp.mtwk; if(R.text !== src) R.mtp = src; }
        return R; };
      function finish(ok){ if(done) return; done = true; cancelAnimationFrame(raf); clearTimeout(tmr); const R = ok ? result() : null;
        document.removeEventListener('pointerdown', outside, true); document.removeEventListener('mousedown', keepFocus, true); document.removeEventListener('selectionchange', onSel); window.removeEventListener('resize', layout);
        wrap.remove(); if(TE.cur && TE.cur.ce === ce) TE.cur = null; try{ A.ribbonCtx && A.ribbonCtx(null); }catch(_){} resolve(R); }
      // bấm ra ngoài = lưu (như AutoCAD); bấm lên ribbon / menu / hộp thoại thì vẫn soạn tiếp
      const KEEP = '#acadTop,.ac-pop,.ac-slide,.dvd-dlg,.acw-ctx,.ac-rtip,.gt-pick';
      function outside(e){ if(TE.picking) return; if(box.contains(e.target) || (e.target.closest && e.target.closest(KEEP))) return; const onCanvas = e.target === cv; finish(true); if(onCanvas){ e.preventDefault(); e.stopPropagation(); } }
      // giữ con trỏ trong ô chữ khi bấm nút trên ribbon (không lấy mất vùng bôi đen)
      function keepFocus(e){ const t = e.target; if(t.closest && t.closest('#acadTop,.ac-slide,.acw-ctx') && !t.closest('select,input,textarea')) e.preventDefault(); }
      function onSel(){ if(document.activeElement !== ce) return; const S = selOf(ce); if(pend && (!S || S.s !== pendAt || S.s !== S.e)) pend = null; fmtUi(); }
      ce.addEventListener('keydown', e => { e.stopPropagation();
        const K2 = e.key.length === 1 ? e.key.toLowerCase() : e.key, mod = e.ctrlKey || e.metaKey;
        if(e.key === 'Escape'){ e.preventDefault(); finish(!multi && !single && rtPlain(readRuns(ce)).trim() !== ''); return; }
        if(e.key === 'Enter' && (mod || single)){ e.preventDefault(); finish(true); return; }
        if(mod && !e.altKey && (K2 === 'z' || K2 === 'y')){ e.preventDefault(); if(K2 === 'y' || e.shiftKey) redo(); else undo(); return; }
        if(mod && !e.altKey && (K2 === 'b' || K2 === 'i' || K2 === 'u')){ e.preventDefault(); toggle(K2); return; }
        if(e.key === 'Enter' && e.altKey && multi){ e.preventDefault(); if(st.cols) insertText(COLBRK); return; }
        if(e.key === 'Enter'){ e.preventDefault(); const S = sel(), v = rtPlain(readRuns(ce));
          if(!multi){ const ls = v.lastIndexOf('\n', S.s - 1) + 1, le = v.indexOf('\n', S.s), line = v.slice(ls, le < 0 ? v.length : le); if(!line.trim() && le < 0){ setRuns([{ t: v.slice(0, ls).replace(/\n$/, '') }], 0); finish(true); return; } }
          insertText('\n'); return; }
        if(e.key === 'Tab' && multi){ e.preventDefault(); insertText('\t'); return; }
        if(e.key === 'F1'){ e.preventDefault(); try{ DVDCmd.showHelp && DVDCmd.showHelp(multi ? 'MTEXT' : 'TEXT'); }catch(_){} } });
      ce.addEventListener('keyup', e => e.stopPropagation()); ce.addEventListener('keypress', e => e.stopPropagation());
      ce.addEventListener('beforeinput', e => {
        if(e.inputType === 'historyUndo'){ e.preventDefault(); undo(); return; } if(e.inputType === 'historyRedo'){ e.preventDefault(); redo(); return; }
        if(/^format/.test(e.inputType)){ e.preventDefault(); const m = { formatBold: 'b', formatItalic: 'i', formatUnderline: 'u' }[e.inputType]; if(m) toggle(m); return; }
        if(e.inputType === 'insertText' && e.data && pend){ const S = sel(); if(S.s === pendAt){ e.preventDefault(); insertText(e.data); } }
        if(e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak'){ e.preventDefault(); insertText('\n'); } });
      ce.addEventListener('input', () => { layout(); clearTimeout(tmr); tmr = setTimeout(pushH, 400); });
      ce.addEventListener('paste', e => { e.preventDefault(); const t = ((e.clipboardData && e.clipboardData.getData('text/plain')) || '').replace(/\r\n?/g, '\n'); if(t) insertText(multi ? t : t.replace(/\n+/g, ' ')); });
      ce.addEventListener('drop', e => { e.preventDefault(); const t = ((e.dataTransfer && e.dataTransfer.getData('text/plain')) || '').replace(/\r\n?/g, '\n'); if(t) insertText(t); });
      ce.addEventListener('wheel', e => { e.preventDefault(); cv.dispatchEvent(new WheelEvent('wheel', e)); }, { passive: false });
      ce.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); teMenu(e.clientX, e.clientY); });
      document.addEventListener('pointerdown', outside, true); document.addEventListener('mousedown', keepFocus, true); document.addEventListener('selectionchange', onSel); window.addEventListener('resize', layout);
      TE.cur = { st, ce, o, multi, single, finish, layout, focus, toggle, insertText, setRuns, undo, redo, sel, pushH, fmtUi: () => fmtUi(),
        runs: () => readRuns(ce), plain: () => rtPlain(readRuns(ce)), select: (s, e) => { focus(); setSelOf(ce, s, e == null ? s : e); fmtUi(); },
        setCols: C => { st.cols = C ? Object.assign({}, C) : null; layout(); focus(); }, defH: () => st.boxH > 0 ? st.boxH : st.h * 1.3 * 10, defW: () => st.w > 0 ? st.w : st.h * 30 };
      layout(); focus(); pushH();
      if(o.value || (o.runs && o.runs.length)) setSelOf(ce, 0, rtPlain(readRuns(ce)).length); else setSelOf(ce, 0, 0);
      raf = requestAnimationFrame(tick); try{ A.paint && A.paint(); }catch(_){}   // xoá đường dây thun / ô nhập động của bước trước
      try{ if(A.ribbonCtx && multi && !o.dim) A.ribbonCtx('textctx'); }catch(_){}   // như AutoCAD: tab Text Editor chỉ có với MTEXT
      fmtUi();
      log(multi ? 'Soạn chữ: Enter = xuống dòng · Ctrl+Enter hoặc bấm ra ngoài = lưu · Esc = bỏ' : single ? 'Sửa chữ: Enter = lưu · Esc = bỏ' : 'Gõ chữ: Enter = dòng mới · Enter ở dòng trống = xong');
    });
  }
  A.inplaceText = inplaceText;
  // script / LISP / dòng lệnh khi đang soạn chữ: mỗi dòng nhập là một dòng chữ, dòng trống = xong (như AutoCAD đọc chữ từ script)
  const _input = A.input;
  A.input = function(text){ const T = TE.cur; if(!T) return _input.apply(this, arguments);
    const t = String(text == null ? '' : text).replace(/\r/g, '');
    if(T.single){ if(t !== '') T.setRuns([{ t }], t.length); T.finish(true); return true; }
    if(t === ''){ T.finish(true); return true; }
    const v = T.plain(); T.setRuns(rtNorm(T.runs().concat([{ t: (v ? '\n' : '') + t }])), v.length + (v ? 1 : 0) + t.length); return true; };
  // áp kiểu chữ / phông / màu / khung MTEXT / định dạng / cột đã chọn trong bộ soạn vào đối tượng chữ (gọi sau khi gán w.text)
  A.textFinish = (w, R) => {
    if(!w || !R) return w;
    if(R.style && A.tsApply && A.TS && A.TS.list[R.style]) A.tsApply(w, R.style);
    if(R.font !== undefined){ if(R.font) w.ff = R.font; else delete w.ff; }
    if(R.col !== undefined){ if(R.col === 'BYLAYER'){ w.col = A.layerHex ? A.layerHex(w.layer || '0') : w.col; w.bl = 1; } else if(R.col && R.col !== 'BYBLOCK'){ w.col = R.col; delete w.bl; } }
    if(R.mtwk > 0) w.mtwk = R.mtwk; else delete w.mtwk;
    if(R.mtp) w.mtp = R.mtp; else delete w.mtp;
    if(R.cols) w.cols = Object.assign({}, R.cols); else delete w.cols;
    if(R.rt){ w.rt = R.rt.map(rtCell); w.mt = true; w.rtx = w.text; } else { delete w.rt; delete w.rtx; }
    return w;
  };
  // thao tác trên ô chữ: thay vùng bôi đen (hoặc cả nội dung nếu chưa bôi đen)
  const teEdit = fn => { const T = TE.cur; if(!T) return; let { s, e } = T.sel(); const R = T.runs(); if(s === e){ s = 0; e = rtPlain(R).length; } const R2 = rtMap(R, s, e, fn); T.setRuns(R2, s, e + rtPlain(R2).length - rtPlain(R).length); };
  const teInsert = t => { const T = TE.cur; if(T) T.insertText(t); };
  const BUL = /^(\s*)(•\s|\d+\.\s|[a-z]\.\s|[A-Z]\.\s)/;
  // đánh số / đầu dòng cho các đoạn chứa vùng bôi đen
  const bullets = kind => { const T = TE.cur; if(!T) return; let R = T.runs(); const v = rtPlain(R), S = T.sel();
    const a0 = v.lastIndexOf('\n', S.s - 1) + 1, starts = [a0]; if(S.e > S.s){ let p = a0; for(;;){ const nx = v.indexOf('\n', p); if(nx < 0 || nx + 1 >= S.e) break; starts.push(nx + 1); p = nx + 1; } }
    const lineAt = a => { const e = v.indexOf('\n', a); return v.slice(a, e < 0 ? v.length : e); };
    let cnt = 0; const nums = starts.map(a => lineAt(a).trim() ? cnt++ : -1);
    for(let k = starts.length - 1; k >= 0; k--){ const a = starts[k], line = lineAt(a), m = BUL.exec(line), pa = a + (m ? m[1].length : 0);
      if(m) R = rtReplace(R, pa, pa + m[0].length - m[1].length, '');
      if(kind !== 'off' && nums[k] >= 0){ const i = nums[k], pre = kind === 'bul' ? '• ' : kind === 'num' ? (i + 1) + '. ' : kind === 'abc' ? String.fromCharCode(97 + (i % 26)) + '. ' : String.fromCharCode(65 + (i % 26)) + '. '; R = rtReplace(R, pa, pa, pre, fmtAt(R, pa + 1)); } }
    T.setRuns(R, a0, Math.max(a0, S.e + rtPlain(R).length - v.length)); };
  const SYMS = [['Độ  %%d', '°'], ['Cộng/trừ  %%p', '±'], ['Đường kính  %%c', 'Ø'], null, ['Gần bằng', '≈'], ['Góc', '∠'], ['Đường ranh giới', '⅊'], ['Đường tâm', '℄'], ['Delta', 'Δ'], ['Pha điện', 'φ'], ['Đường dòng', '≡'], ['Đồng nhất', '≣'], ['Không bằng', '≠'], ['Ohm', 'Ω'], ['Omega', 'ω'], ['Micro', 'µ'], ['Bình phương', '²'], ['Lập phương', '³'], null, ['Dấu cách không ngắt', ' ']];
  function symMenu(x, y){ ctxMenu(x, y, SYMS.map(s => s ? [s[1].trim() ? s[1] + '   ' + s[0] : s[0], () => teInsert(s[1])] : null)); }
  function teMenu(x, y){ const T = TE.cur; if(!T) return; const S = T.sel(), has = S.e > S.s;
    ctxMenu(x, y, [['Hoàn tác', () => T.undo()], ['Làm lại', () => T.redo()], null,
      ['Cắt', () => { T.focus(); document.execCommand('cut'); }, !has], ['Chép', () => { T.focus(); document.execCommand('copy'); }, !has], ['Dán', async () => { try{ const t = await navigator.clipboard.readText(); teInsert(t); }catch(_){ say('Dán bằng Ctrl+V.'); } }], null,
      ['Chèn trường…', () => insertField(), !T.multi], ['Chèn ký hiệu…', () => symMenu(x, y)], ['Chọn tất cả', () => T.select(0, T.plain().length)], null,
      ['Đậm (Ctrl+B)', () => T.toggle('b'), !T.multi], ['Nghiêng (Ctrl+I)', () => T.toggle('i'), !T.multi], ['Gạch chân (Ctrl+U)', () => T.toggle('u'), !T.multi], ['Gạch trên', () => T.toggle('o'), !T.multi], null,
      ['Chữ HOA', () => teEdit(t => t.toUpperCase())], ['Chữ thường', () => teEdit(t => t.toLowerCase())], ['Tìm và thay thế…', findReplace], null,
      ['Lưu và đóng (Ctrl+Enter)', () => T.finish(true)], ['Huỷ (Esc)', () => T.finish(false)]]); }
  function findReplace(){ const T = TE.cur; if(!T) return;
    const S0 = T.sel(), sel0 = T.plain().slice(S0.s, S0.e);
    const html = '<div class="acw" style="width:400px">' + K.row('Tìm:', K.txt('frF', sel0.includes('\n') ? '' : sel0)) + K.row('Thay bằng:', K.txt('frR', '')) +
      K.grp('Tuỳ chọn tìm', K.chk('frC', 'Phân biệt hoa thường', 0) + '<br>' + K.chk('frW', 'Chỉ tìm nguyên từ', 0)) + '<div class="acw-row"><span class="l" id="frN"></span>' + K.btn('frNext', 'Tìm tiếp') + K.btn('frOne', 'Thay thế') + K.btn('frAll', 'Thay tất cả') + '</div></div>';
    const d = A.dialog({ title: 'Tìm và thay thế', cls: 'acw-free', help: 'FIND', html, okText: 'Đóng', noCancel: true, ok: () => { T.focus(); } });
    const root = d.root, $ = id => root.querySelector('#' + id); let at = S0;
    const rx = g => { const f = $('frF').value; if(!f) return null; let s = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if($('frW').checked) s = '(?<![\\p{L}\\p{N}_])' + s + '(?![\\p{L}\\p{N}_])'; return new RegExp(s, 'u' + (g ? 'g' : '') + ($('frC').checked ? '' : 'i')); };
    const next = () => { const r = rx(true); if(!r) return false; const v = T.plain(); r.lastIndex = at.e; let m = r.exec(v); if(!m){ r.lastIndex = 0; m = r.exec(v); } if(!m){ $('frN').textContent = 'Không tìm thấy.'; return false; } at = { s: m.index, e: m.index + m[0].length }; T.select(at.s, at.e); $('frN').textContent = ''; return true; };
    $('frNext').onclick = next;
    $('frOne').onclick = () => { const r = rx(false), cur = T.plain().slice(at.s, at.e); if(r && cur && new RegExp('^(?:' + r.source + ')$', r.flags).test(cur)){ const R = $('frR').value; T.setRuns(rtReplace(T.runs(), at.s, at.e, R), at.s + R.length); at = { s: at.s, e: at.s + R.length }; } next(); };
    $('frAll').onclick = () => { const r = rx(true); if(!r) return; const v = T.plain(), R = $('frR').value, ms = [...v.matchAll(r)]; let runs = T.runs(); for(let k = ms.length - 1; k >= 0; k--){ const m = ms[k]; runs = rtReplace(runs, m.index, m.index + m[0].length, R); } if(ms.length) T.setRuns(runs, 0); $('frN').textContent = 'Đã thay ' + ms.length + ' chỗ.'; };
  }
  function importText(){ const T = TE.cur; if(!T) return; const f = document.createElement('input'); f.type = 'file'; f.accept = '.txt,.csv,text/plain';
    f.onchange = () => { const file = f.files && f.files[0]; if(!file) return; const rd = new FileReader(); rd.onload = () => { teInsert(String(rd.result || '').replace(/\r\n?/g, '\n')); say('Đã nhập chữ từ ' + file.name); }; rd.readAsText(file); }; f.click(); }
  // trường trong ô soạn (Insert Field): hộp thoại Field rồi chèn khối trường (nền xám) tại con trỏ
  async function insertField(){ const T = TE.cur; if(!T || !T.multi) return; const S = T.sel(); const f = await fieldDialog(); if(!f || !TE.cur) return;
    const v = A.fieldValue ? A.fieldValue(f) : ''; const R0 = rtReplace(T.runs(), S.s, S.e, ''), fm = fmtAt(R0, S.s), c = explode(R0), i = cellIdx(c, S.s);
    c.splice(i, 0, Object.assign({}, fm, { t: v, f })); T.setRuns(rtNorm(c), S.s + v.length); }
  // cột (Columns): không cột / cột tĩnh 2–6 / ngắt cột / cài đặt cột
  function colsMenu(x, y){ const T = TE.cur; if(!T || !T.multi) return; const C = T.st.cols;
    const stat = n => { const h = T.st.h, tot = C ? C.n * C.w + (C.n - 1) * C.g : T.defW(), g = C ? C.g : h * 2; T.setCols({ n, g, w: Math.max(h, (tot - (n - 1) * g) / n), h: C ? C.h : T.defH() }); };
    ctxMenu(x, y, [['Không chia cột', () => T.setCols(null)], ['Cột động', () => { const h = T.st.h; T.setCols(Object.assign({ n: 1, g: h * 2, w: T.defW(), h: T.defH() }, C || {}, { dyn: 1 })); }], null,
      ['2 cột tĩnh', () => stat(2)], ['3 cột tĩnh', () => stat(3)], ['4 cột tĩnh', () => stat(4)], ['5 cột tĩnh', () => stat(5)], ['6 cột tĩnh', () => stat(6)], null,
      ['Chèn ngắt cột (Alt+Enter)', () => T.insertText(COLBRK), !C], ['Cài đặt cột…', () => colSettings()]]); }
  function colSettings(){ const T = TE.cur; if(!T) return; const h = T.st.h, C = T.st.cols || { n: 2, g: h * 2, w: (T.defW() - h * 2) / 2, h: T.defH() };
    const typ = T.st.cols ? (C.dyn ? 'dyn' : 'st') : 'none';
    const html = '<div class="acw" style="width:420px"><div class="acw-cols"><div class="c1">' + K.grp('Kiểu cột', K.rad('csT', 'dyn', 'Cột động', typ === 'dyn') + '<br>' + K.rad('csT', 'st', 'Cột tĩnh', typ === 'st') + '<br>' + K.rad('csT', 'none', 'Không chia cột', typ === 'none')) +
      K.grp('Số cột', K.num('csN', C.n || 2, { min: 1, max: 20 })) + '</div><div class="c1">' + K.grp('Chiều cao', K.num('csH', r6(C.h), { min: 0 })) +
      K.grp('Bề rộng', K.row('Cột:', K.num('csW', r6(C.w), { min: 0 })) + K.row('Khoảng cách:', K.num('csG', r6(C.g), { min: 0 })) + K.row('Tổng:', K.num('csTot', r6((C.n || 2) * C.w + ((C.n || 2) - 1) * C.g), { min: 0 }))) + '</div></div></div>';
    const d = A.dialog({ title: 'Cài đặt cột', cls: 'acw-free', help: 'MTEXT', html, ok: r => { const t = (r.querySelector('input[name=csT]:checked') || {}).value; if(t === 'none'){ TE.cur && TE.cur.setCols(null); return; }
      const n = Math.max(1, Math.round(num(K.val(r, 'csN')) || 1)), w = num(K.val(r, 'csW')), g = Math.max(0, num(K.val(r, 'csG')) || 0), hh = num(K.val(r, 'csH')); if(!(w > 0) || !(hh > 0)){ say('Bề rộng và chiều cao cột phải lớn hơn 0.'); return false; }
      TE.cur && TE.cur.setCols({ n, w, g, h: hh, dyn: t === 'dyn' ? 1 : undefined }); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const tot = () => { const n = Math.max(1, Math.round(num($('csN').value) || 1)), w = num($('csW').value) || 0, g = num($('csG').value) || 0; $('csTot').value = r6(n * w + (n - 1) * g); };
    $('csN').oninput = tot; $('csW').oninput = tot; $('csG').oninput = tot;
    $('csTot').oninput = () => { const n = Math.max(1, Math.round(num($('csN').value) || 1)), g = num($('csG').value) || 0, t = num($('csTot').value) || 0; $('csW').value = r6(Math.max(0, (t - (n - 1) * g) / n)); };
  }

  if(A.ribbon && A.ribbon.RIB && A.ribbonAct){
    const act = (n, fn) => A.ribbonAct(n, () => { if(!TE.cur) return; fn(TE.cur); if(TE.cur) TE.cur.focus(); });
    act('TX_CLOSE', T => T.finish(true)); act('TX_UPPER', () => teEdit(t => t.toUpperCase())); act('TX_LOWER', () => teEdit(t => t.toLowerCase()));
    for(const k of FK) act('TX_' + k.toUpperCase(), T => T.toggle(k));
    act('TX_FIND', () => findReplace()); act('TX_IMPORT', () => importText()); act('TX_UNDO', T => T.undo()); act('TX_REDO', T => T.redo());
    act('TX_FIELD', () => insertField());
    act('TX_RULER', T => { TE.ruler = !TE.ruler; try{ localStorage.setItem('dvd:teRuler', TE.ruler ? '1' : '0'); }catch(_){} T.layout(); try{ A.ribbon.render(); }catch(_){} });
    const below = c => { const b = document.querySelector('[data-c="' + c + '"]'), r = b ? b.getBoundingClientRect() : { left: 200, bottom: 120 }; return [r.left, r.bottom + 2]; };
    A.ribbonAct('TX_SYM', () => { if(TE.cur) symMenu(...below('TX_SYM')); });
    A.ribbonAct('TX_COLS', () => { if(TE.cur) colsMenu(...below('TX_COLS')); });
    A.ribbonAct('TX_BUL', () => { if(!TE.cur) return; const [x, y] = below('TX_BUL');
      ctxMenu(x, y, [['Tắt', () => bullets('off')], null, ['Đánh số  1. 2. 3.', () => bullets('num')], ['Chữ cái thường  a. b. c.', () => bullets('abc')], ['Chữ cái hoa  A. B. C.', () => bullets('ABC')], ['Dấu đầu dòng  •', () => bullets('bul')]]); });
    A.ribbonAct('TX_NONE', () => {});
    const big = (cmd, en, vi, icon) => ({ t: 'big', cmd, en, vi, icon }), sm = (cmd, en, vi, icon) => ({ t: 'sm', cmd, en, vi, icon });
    const refocus = () => { if(TE.cur) setTimeout(() => TE.cur && TE.cur.focus(), 0); };
    const stop = el => el.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); e.target.blur(); refocus(); } if(e.key === 'Escape'){ e.preventDefault(); refocus(); } });
    const style = { t: 'html', html: () => { const T = TE.cur, s = T ? T.st : { style: A.TS ? A.TS.cur : 'Standard', h: 2.5 }; const names = A.TS ? Object.keys(A.TS.list) : ['Standard'];
        return '<div class="tx-p"><label><span>Kiểu chữ</span><select data-p="style">' + names.map(n => opt(n, n, s.style)).join('') + '</select></label><label><span>Cao chữ</span><input data-p="h" type="number" step="any" min="0" value="' + esc(r6(s.h)) + '"></label>' +
          '<label><span>Chú thích</span><select disabled><option>Không (Annotative)</option></select></label></div>'; },
      bind: el => { stop(el); const T = TE.cur; if(!T) return; const s = T.st;
        el.querySelector('[data-p="style"]').onchange = e => { const n = e.target.value, d = A.TS && A.TS.list[n]; s.style = n; s.styleSet = true; if(d){ s.font = d.font || ''; s.fontSet = false; if(+d.h > 0) s.h = +d.h; } T.layout(); try{ A.ribbon.render(); }catch(_){} refocus(); };
        el.querySelector('[data-p="h"]').onchange = e => { const v = num(e.target.value); if(v > 0){ s.h = v; T.layout(); } else e.target.value = r6(s.h); refocus(); }; } };
    const FB = [['B', 'Đậm (Ctrl+B)', 'font-weight:700'], ['I', 'Nghiêng (Ctrl+I)', 'font-style:italic'], ['U', 'Gạch chân (Ctrl+U)', 'text-decoration:underline'], ['O', 'Gạch trên', 'text-decoration:overline']];
    const format = { t: 'html', html: () => { const T = TE.cur, s = T ? T.st : { font: '', col: 'BYLAYER' }; const fonts = (A.FONTS || []).slice(); if(s.font && !fonts.includes(s.font)) fonts.unshift(s.font);
        return '<div class="tx-fr"><div class="r">' + FB.map(([c, t, css]) => '<button type="button" data-c="TX_' + c + '" title="' + t + '" style="' + css + '">' + c + '</button>').join('') +
          '<button type="button" data-c="TX_UPPER" title="Chữ HOA">AA</button><button type="button" data-c="TX_LOWER" title="chữ thường">aa</button></div>' +
          '<div class="r"><select data-p="font" title="Phông chữ"><option value="">(theo kiểu chữ)</option>' + fonts.map(f => opt(f, f, s.font)).join('') + '</select></div><div class="r">' + K.colorSel('txCol', s.col, { noBlock: 1 }).replace('<select ', '<select title="Màu chữ" ') + '</div></div>'; },
      bind: el => { stop(el); const T = TE.cur; if(!T) return; const s = T.st;
        el.querySelector('[data-p="font"]').onchange = e => { s.font = e.target.value || ((A.TS && A.TS.list[s.style] && A.TS.list[s.style].font) || ''); s.fontSet = true; T.layout(); refocus(); };
        K.bindColors(el, sl => { s.col = sl.value || 'BYLAYER'; s.colSet = true; T.layout(); refocus(); }); setTimeout(() => { if(TE.cur) TE.cur.fmtUi(); }, 0); } };
    const para = { t: 'html', html: () => { const T = TE.cur, s = T ? T.st : { ha: 'left', va: 'top' }, j = jOf(s.ha, s.va), ks = Object.keys(JUST).slice(0, 9);
        return '<div class="tx-p w"><label><span>Canh lề</span><select data-p="j">' + ks.map(k => opt(k, k + ' — ' + JNAME[k], j)).join('') + '</select></label></div>'; },
      bind: el => { stop(el); const T = TE.cur; if(!T) return; el.querySelector('[data-p="j"]').onchange = e => { const J = JUST[e.target.value]; if(J){ T.st.ha = J[0]; T.st.va = J[1]; T.layout(); } refocus(); }; } };
    A.ribbon.RIB.textctx = { en: 'Text Editor', vi: 'Soạn chữ', ctx: true, panels: [
      { id: 'txs', en: 'Style', vi: 'Kiểu', pri: 2, items: [style] },
      { id: 'txf', en: 'Formatting', vi: 'Định dạng', pri: 1, items: [format] },
      { id: 'txp', en: 'Paragraph', vi: 'Đoạn văn', pri: 3, items: [para, { t: 'col', items: [sm('TX_BUL', 'Bullets and Numbering', 'Đánh số / đầu dòng', 'TJUST')] }] },
      { id: 'txi', en: 'Insert', vi: 'Chèn', pri: 4, items: [big('TX_SYM', 'Symbol', 'Ký hiệu', 'SYMBOL'), { t: 'col', items: [sm('TX_FIELD', 'Field', 'Trường', 'FIELD'), sm('TX_COLS', 'Columns', 'Cột', 'TABLE'), sm('TX_IMPORT', 'Import Text', 'Nhập chữ từ file', 'IMPORT')] }] },
      { id: 'txt', en: 'Tools', vi: 'Công cụ', pri: 5, items: [big('TX_FIND', 'Find &\nReplace', 'Tìm và\nthay thế', 'FINDREPLACE')] },
      { id: 'txo', en: 'Options', vi: 'Tuỳ chọn', pri: 6, items: [{ t: 'col', items: [sm('TX_RULER', 'Ruler', 'Thước', 'TEXTALIGN'), sm('TX_UNDO', 'Undo', 'Hoàn tác', 'UNDO'), sm('TX_REDO', 'Redo', 'Làm lại', 'REDO')] }] },
      { id: 'txc', en: 'Close', vi: 'Đóng', pri: 0, items: [big('TX_CLOSE', 'Close Text\nEditor', 'Đóng\nsoạn chữ', 'CLOSE')] }
    ] };
  }

  /* ==================================================================
     FIELD — hộp thoại Field (như AutoCAD: nhóm trường · tên trường · định dạng · xem trước · biểu thức trường)
     ================================================================== */
  const FLDS = [
    ['date', 'Ngày', 'dt', 'Date'], ['cdate', 'Ngày tạo', 'dt', 'CreateDate'], ['sdate', 'Ngày lưu', 'dt', 'SaveDate'],
    ['author', 'Tác giả', 'doc', 'Author'], ['title', 'Tiêu đề', 'doc', 'Title'], ['subject', 'Chủ đề', 'doc', 'Subject'], ['keywords', 'Từ khoá', 'doc', 'Keywords'], ['comments', 'Ghi chú', 'doc', 'Comments'], ['checker', 'Người kiểm', 'doc', 'Checker'],
    ['hyperlink', 'Đường dẫn gốc siêu liên kết', 'doc', 'HyperlinkBase'], ['file', 'Tên file', 'doc', 'Filename'], ['custom', 'Thuộc tính tuỳ chỉnh', 'doc', 'CustomDP'],
    ['area', 'Diện tích đối tượng', 'obj', 'Object Area'], ['len', 'Chiều dài / chu vi đối tượng', 'obj', 'Object Length'], ['count', 'Số đối tượng trong bản vẽ', 'oth', 'NumObjects']];
  const FCAT = [['all', 'Tất cả'], ['dt', 'Ngày giờ'], ['doc', 'Thông tin bản vẽ'], ['obj', 'Đối tượng'], ['oth', 'Khác']];
  const DFMT = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', "'ngày' d 'tháng' M 'năm' yyyy", 'd MMMM yyyy', 'dddd, d MMMM yyyy', 'MMMM yyyy', 'dd/MM/yyyy HH:mm', 'HH:mm', 'h:mm tt'];
  function fieldDialog(pre){
    return new Promise(res => {
      let k = (pre && pre.k) || 'date', ref = pre && pre.ref, picked = null;
      const P = (() => { try{ return JSON.parse(localStorage.getItem('dvd:props::' + (typeof currentName !== 'undefined' ? currentName : '')) || '{}'); }catch(_){ return {}; } })();
      const html = '<div class="acw" style="width:620px"><div class="acw-cols"><div class="c1" style="flex:0 0 230px">' + K.vrow('Nhóm trường:', K.sel('fdC', FCAT, 'all')) + '<div class="acw-lab" style="margin-top:6px">Tên trường:</div><div class="acw-list" id="fdL" style="height:250px" tabindex="0"></div></div>' +
        '<div class="c1" id="fdR"></div></div>' + '<div class="acw-lab" style="margin-top:8px">Biểu thức trường:</div><input id="fdX" readonly style="width:100%;box-sizing:border-box" translate="no"></div>';
      const d = A.dialog({ title: 'Trường', cls: 'acw-free', help: 'FIELD', html, cancel: () => res(null), ok: () => { const f = cur(); if(!f){ say('Chọn tên trường.'); return false; } if((f.k === 'area' || f.k === 'len') && !f.ref){ say('Bấm "Chọn đối tượng" để lấy đối tượng.'); return false; } if(f.k === 'custom' && !f.name){ say('Chưa có thuộc tính tuỳ chỉnh (DWGPROPS → Tuỳ chỉnh).'); return false; } res(f); } });
      const root = d.root, $ = id => root.querySelector('#' + id);
      const cur = () => { const f = { k }; const v = id => { const el = $(id); return el ? el.value : ''; };
        if(['date', 'cdate', 'sdate'].includes(k)) f.fmt = v('fdDf') || 'dd/MM/yyyy';
        if(['author', 'title', 'subject', 'keywords', 'comments', 'checker', 'hyperlink', 'file', 'custom'].includes(k)){ const c = v('fdCs'); if(c) f.cs = c; }
        if(k === 'file' && $('fdExt') && $('fdExt').checked) f.fx = 'ext';
        if(k === 'custom') f.name = v('fdCn');
        if(k === 'area' || k === 'len'){ f.fmt = v('fdU') || undefined; f.dec = +v('fdDec') || 0; f.ref = ref; }
        if(!f.fmt) delete f.fmt; return f; };
      const expr = f => { const n = (FLDS.find(x => x[0] === f.k) || [])[3] || f.k; if(f.k === 'area' || f.k === 'len') return '%<\\AcObjProp Object(%<\\_ObjId ' + (f.ref || '?') + '>%).' + (f.k === 'area' ? 'Area' : 'Length') + ' \\f "%lu2%pr' + (f.dec || 0) + '">%';
        if(f.k === 'custom') return '%<\\AcVar CustomDP.' + (f.name || '') + '>%'; return '%<\\AcVar ' + n + (f.fmt ? ' \\f "' + f.fmt + '"' : '') + (f.cs ? ' \\f "%tc' + ({ up: 1, lo: 2, fc: 3, tc: 4 }[f.cs] || 0) + '"' : '') + '>%'; };
      const prev = () => { const f = cur(); let v = ''; try{ v = A.fieldValue ? A.fieldValue(f) : ''; }catch(_){ v = '####'; } const pv = $('fdPv'); if(pv) pv.textContent = v || '----'; $('fdX').value = expr(f); };
      const right = () => { let h = '<div class="acw-lab">Giá trị:</div><div class="pg-det" id="fdPv" style="height:auto;min-height:24px;margin-bottom:8px" translate="no"></div>';
        if(['date', 'cdate', 'sdate'].includes(k)) h += K.vrow('Định dạng ngày:', '<input id="fdDf" value="' + esc((pre && pre.k === k && pre.fmt) || 'dd/MM/yyyy') + '" translate="no">') + '<div class="acw-lab" style="margin-top:6px">Ví dụ:</div><div class="acw-list" id="fdEx" style="height:160px" tabindex="0" translate="no">' + DFMT.map(f => '<div class="it" data-v="' + esc(f) + '">' + esc(A.fmtDate ? A.fmtDate(new Date(), f) : f) + '</div>').join('') + '</div>';
        else if(k === 'area' || k === 'len') h += '<div class="acw-row">' + K.btn('fdPick', 'Chọn đối tượng') + '<span class="acw-note" id="fdObj" style="margin:0"></span></div>' + K.row('Đơn vị:', K.sel('fdU', k === 'area' ? [['', 'Đơn vị bản vẽ'], ['m2', 'm² (bản vẽ mm)'], ['cm2', 'cm² (bản vẽ mm)']] : [['', 'Đơn vị bản vẽ'], ['m', 'm (bản vẽ mm)'], ['cm', 'cm (bản vẽ mm)']], (pre && pre.fmt) || '')) + K.row('Số lẻ:', K.sel('fdDec', [0, 1, 2, 3, 4, 5, 6].map(n => [String(n), n ? '0.' + '0'.repeat(n) : '0']), String(pre && pre.dec != null ? pre.dec : 2)));
        else if(k === 'count') h += '<div class="acw-note">Đếm mọi đối tượng trong bản vẽ.</div>';
        else { if(k === 'custom'){ const ns = Object.keys(P.custom || {}); h += K.row('Thuộc tính:', K.sel('fdCn', ns.length ? ns.map(n => [n, n]) : [['', '(chưa có)']], (pre && pre.name) || ns[0] || '')); }
          h += K.row('Định dạng:', K.sel('fdCs', [['', '(không)'], ['up', 'CHỮ HOA'], ['lo', 'chữ thường'], ['fc', 'Viết hoa chữ đầu'], ['tc', 'Viết Hoa Mỗi Từ']], (pre && pre.cs) || ''));
          if(k === 'file') h += K.chk('fdExt', 'Hiện phần mở rộng (.dwg / .dxf)', pre && pre.fx === 'ext'); }
        $('fdR').innerHTML = h; prev();
        const ex = $('fdEx'); if(ex) ex.addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; $('fdDf').value = it.dataset.v; ex.querySelectorAll('.it').forEach(x => x.classList.toggle('on', x === it)); prev(); });
        const pk = $('fdPick'); if(pk){ const show = () => { const o2 = ref && modelEntities.find(e => e.cid === ref); $('fdObj').textContent = o2 ? o2.type + (o2.layer ? ' · ' + o2.layer : '') : 'Chưa chọn'; }; show();
          pk.onclick = () => { d.root.style.display = 'none'; TE.picking = true; log('Chọn đối tượng (Esc = huỷ)'); const cv = document.getElementById('cv');
            const off = () => { document.removeEventListener('pointerdown', dn, true); window.removeEventListener('keydown', kd, true); d.root.style.display = ''; setTimeout(() => { TE.picking = false; }, 0); };
            const dn = ev => { if(ev.target !== cv) return; ev.preventDefault(); ev.stopPropagation(); const r = cv.getBoundingClientRect(); let o2 = null; try{ const i = pickEntity({ x: ev.clientX - r.left, y: ev.clientY - r.top }); o2 = i >= 0 ? entities[i] : null; }catch(_){}
              off(); if(!o2 || !(A.areaOf(o2) > 0 || A.lenOf(o2) > 0)){ say('Chọn đường kín, đường tròn, đa tuyến hoặc đoạn thẳng.'); return; }
              if(!o2.cid){ const w2 = JSON.parse(JSON.stringify(o2)); delete w2.userAdded; w2.cid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); A.commit({ rep: [[o2, w2]] }); o2 = w2; }
              ref = o2.cid; picked = o2; show(); prev(); };
            const kd = ev => { if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); off(); } };
            document.addEventListener('pointerdown', dn, true); window.addEventListener('keydown', kd, true); }; }
        $('fdR').querySelectorAll('input,select').forEach(el => { el.addEventListener('input', prev); el.addEventListener('change', prev); }); };
      const fill = () => { const c = $('fdC').value; $('fdL').innerHTML = FLDS.filter(f => c === 'all' || f[2] === c).map(f => '<div class="it' + (f[0] === k ? ' on' : '') + '" data-v="' + f[0] + '">' + esc(f[1]) + '</div>').join(''); };
      $('fdC').onchange = fill; K.bindList($('fdL'), v => { k = v; right(); });
      fill(); right(); void picked;
    });
  }
  A.fieldDialog = fieldDialog;
  ecmd(['FIELD', 'FLD'], 'Chèn trường (Field): ngày, tên bản vẽ, tác giả, thuộc tính tuỳ chỉnh, diện tích / chiều dài đối tượng…', async () => {
    const f = await fieldDialog(); if(!f) return;
    const p = await A.getPoint('Chỉ định điểm bắt đầu'); if(!p.pt) return;
    const dh = (A.TS && A.TS.list[A.TS.cur] && +A.TS.list[A.TS.cur].h) || (A.MEM && A.MEM.th) || 2.5;
    const hd = await A.getDist('Chỉ định chiều cao', { base: p.pt, def: dh }); const h = hd.num > 0 ? hd.num : dh;
    const v = A.fieldValue ? A.fieldValue(f) : ''; const w = A.newProps({ type: 'TEXT', x: p.pt.x, y: p.pt.y, h, rot: 0, text: v, ha: 'left', va: 'top', mt: true });
    if(A.TS && A.tsApply) A.tsApply(w, A.TS.cur); w.rt = [{ t: v, f }]; w.rtx = w.text;
    A.commit({ add: [w] }, 'Đã chèn trường ' + ((FLDS.find(x => x[0] === f.k) || [])[1] || ''));
  });

  /* ==================================================================
     Danh mục đối tượng có tên trong bản vẽ (dùng cho PURGE / RENAME): khối, kiểu kích thước, lớp, kiểu nét, kiểu ghi chú dẫn, kiểu chữ
     ================================================================== */
  const css3 = document.createElement('style');
  css3.textContent = `
  .pg-mode{display:flex;gap:0;margin:0 0 8px;border:1px solid #5a6578;border-radius:2px;overflow:hidden}
  .pg-mode button{flex:1;height:26px;border:0;background:#343c4a;color:#dfe5ee;font:12px inherit;cursor:pointer}
  .pg-mode button + button{border-left:1px solid #5a6578}
  .pg-mode button.on{background:#0b5f8f;color:#fff}
  .pg-tree{height:300px}
  .pg-tree .it{gap:4px}
  .pg-tree .it .tg{width:12px;text-align:center;color:#b4bdca;cursor:pointer;flex:0 0 12px}
  .pg-tree .it.l1{padding-left:16px}.pg-tree .it.l2{padding-left:34px}
  .pg-tree .it .c{color:#9aa6ba;margin-left:auto;padding-left:10px}
  .pg-tree .it input{margin:0}
  .pg-det{height:300px;overflow:auto;border:1px solid #5a6578;background:#262b34;padding:6px 8px;box-sizing:border-box;color:#dfe5ee;line-height:1.5}
  .rn-l{height:260px}
  `;
  document.head.appendChild(css3);
  const blkName = e => e && e.bm && e.bm.name ? e.bm.name : (e && e.blk && !String(e.blk).startsWith('*') ? String(e.blk) : '');
  function namedData(){
    const ents = (() => { try{ return modelEntities; }catch(_){ return []; } })();
    const B = window._dvdBlocks || {}, fileB = A.fileBlockNames ? A.fileBlockNames() : [];
    // khối đang dùng: có bản chèn trên bản vẽ, hoặc lồng trong khối đang dùng
    const used = new Set(); for(const e of ents){ const n = blkName(e); if(n) used.add(n); }
    const st = [...used]; while(st.length){ const n = st.pop(); const d = B[n]; if(!d || !d.entities) continue; for(const x of d.entities) if(x.type === 'INSERT' && x.name && !used.has(x.name)){ used.add(x.name); st.push(x.name); } }
    const cnt = {}; for(const e of ents){ if(e.grp){ const n = blkName(e); if(n){ cnt[n] = cnt[n] || new Set(); cnt[n].add(e.grp); } } }
    const blocks = fileB.map(n => ({ n, use: used.has(n) ? (cnt[n] ? cnt[n].size + ' bản chèn trên bản vẽ' : 'lồng trong khối khác') : '' }));
    // lớp
    const lc = {}; for(const e of ents){ const l = e.layer || '0'; lc[l] = (lc[l] || 0) + 1; }
    const inBlk = new Set(); for(const n of fileB){ if(!used.has(n)) continue; const d = B[n]; for(const x of (d && d.entities) || []) inBlk.add(x.layer || '0'); }
    const layers = A.layerNames().map(n => ({ n, use: n === '0' ? 'Lớp 0 luôn có' : n === A.LS.cur ? 'Lớp hiện hành' : lc[n] ? lc[n] + ' đối tượng' : inBlk.has(n) ? 'Dùng trong định nghĩa khối' : (n === 'Defpoints' ? 'Lớp hệ thống' : '') }));
    // kiểu nét
    const ltU = {}; for(const e of ents) if(e.lt) ltU[e.lt] = (ltU[e.lt] || 0) + 1; const ltL = {}; for(const [l, v] of Object.entries(A.LS.layLT || {})) if(v) (ltL[v] = ltL[v] || []).push(l);
    const ltypes = Object.keys(A.LS.ltd || {}).filter(n => !/^(CONTINUOUS|BYLAYER|BYBLOCK)$/i.test(n)).map(n => ({ n, use: n === A.LS.lt ? 'Kiểu nét hiện hành' : ltU[n] ? ltU[n] + ' đối tượng' : ltL[n] ? 'Gán cho lớp ' + ltL[n].slice(0, 3).join(', ') + (ltL[n].length > 3 ? '…' : '') : '' }));
    // kiểu chữ
    const tsU = {}; for(const e of ents) if(e.type === 'TEXT' && !e.dimd && !e.dimx){ const s = e.style || 'Standard'; tsU[s] = (tsU[s] || 0) + 1; }
    const TS = A.TS || { list: { Standard: {} }, cur: 'Standard' };
    const tstyles = Object.keys(TS.list).map(n => ({ n, use: n === 'Standard' ? 'Kiểu Standard luôn có' : n === TS.cur ? 'Kiểu chữ hiện hành' : tsU[n] ? tsU[n] + ' chữ' : '' }));
    // kiểu kích thước
    const dsU = {}; for(const e of ents) if(e.dimd){ const s = (e.dimd.s && e.dimd.s.name) || 'Standard'; dsU[s] = (dsU[s] || 0) + 1; }
    const dlib = A.dimStyles ? A.dimStyles.lib() : {}; const dcur = (A.DS && A.DS.name) || 'Standard';
    const dstyles = Object.keys(dlib).map(n => ({ n, use: n === 'Standard' ? 'Kiểu Standard luôn có' : n === dcur ? 'Kiểu kích thước hiện hành' : dsU[n] ? dsU[n] + ' kích thước' : '' }));
    // kiểu ghi chú dẫn
    const ml = A.mlsLib ? A.mlsLib() : null; const mcur = (A.MLS && A.MLS.name) || 'Standard';
    const mstyles = ml ? Object.keys(ml).map(n => ({ n, use: n === 'Standard' ? 'Kiểu Standard luôn có' : n === mcur ? 'Kiểu hiện hành' : '' })) : [];
    // kiểu đường đôi (MLSTYLE)
    const mlc = (A.MLINESTYLE && A.MLINESTYLE.name) || 'STANDARD'; const mlines = Object.keys(mnLib()).map(n => ({ n, use: n === 'STANDARD' ? 'Kiểu STANDARD luôn có' : n === mlc ? 'Kiểu hiện hành' : '' }));
    // định nghĩa khối động
    const D = (A.dynDefs && A.dynDefs()) || {}; const dyn = Object.keys(D).map(n => ({ n, use: used.has(n) || ents.some(e => e.bm && e.bm.name === n) ? 'Đang có bản chèn' : '' }));
    return [
      { k: 'blk', t: 'Khối', tt: 'Các khối', items: blocks }, { k: 'dim', t: 'Kiểu kích thước', tt: 'Các kiểu kích thước', items: dstyles }, { k: 'dyn', t: 'Định nghĩa khối động', tt: 'Các định nghĩa khối động', items: dyn },
      { k: 'lay', t: 'Lớp', tt: 'Các lớp', items: layers }, { k: 'lt', t: 'Kiểu nét', tt: 'Các kiểu nét', items: ltypes }, { k: 'mls', t: 'Kiểu ghi chú dẫn', tt: 'Các kiểu ghi chú dẫn', items: mstyles }, { k: 'mln', t: 'Kiểu đường đôi', tt: 'Các kiểu đường đôi', items: mlines }, { k: 'ts', t: 'Kiểu chữ', tt: 'Các kiểu chữ', items: tstyles }
    ];
  }
  function purgeItem(k, n){
    try{
      if(k === 'blk'){ const B = window._dvdBlocks; if(B && B[n]){ delete B[n]; if(A.saveBlockLib) A.saveBlockLib(A.blockLib()); return true; } return false; }
      if(k === 'lay'){ if(A.deleteLayer(n)) return false; try{ const i = layerList.findIndex(L => L.name === n); if(i >= 0) layerList.splice(i, 1); }catch(_){} for(const m of [A.LS.orig, A.LS.layLT, A.LS.layLW]) if(m) delete m[n]; A.lsSave(); return true; }
      if(k === 'lt'){ delete A.LS.ltd[n]; try{ delete LTYPES[n]; }catch(_){} A.lsSave(); return true; }
      if(k === 'ts'){ if(!A.TS || n === 'Standard' || n === A.TS.cur) return false; delete A.TS.list[n]; A.tsSave(); return true; }
      if(k === 'dim'){ const lib = A.dimStyles.lib(); if(n === 'Standard' || n === A.DS.name || !lib[n]) return false; delete lib[n]; A.dimStyles.saveLib(lib); return true; }
      if(k === 'mls'){ return A.mlsDelete ? A.mlsDelete(n) : false; }
      if(k === 'mln'){ const lib = mnLib(); if(n === 'STANDARD' || n === ((A.MLINESTYLE && A.MLINESTYLE.name) || 'STANDARD') || !lib[n]) return false; delete lib[n]; mnSave(lib); return true; }
      if(k === 'dyn'){ const D = A.dynDefs(); if(!D[n]) return false; delete D[n]; try{ localStorage.setItem('dvd:dynblk', JSON.stringify(D)); }catch(_){} return true; }
    }catch(err){ console.warn(err); }
    return false;
  }
  // hình độ dài 0 và chữ rỗng (Unnamed Objects của PURGE)
  const isZero = e => { const t = 1e-9;
    if(e.type === 'LINE') return Math.hypot(e.x2 - e.x1, e.y2 - e.y1) < t;
    if(e.type === 'CIRCLE' || e.type === 'ARC') return !(e.r > t);
    if(e.type === 'POLYLINE' || e.type === 'LWPOLYLINE' || e.type === 'SPLINE'){ const v = e.vertices || e.pts || []; return v.length < 2 || v.every(q => Math.hypot(q.x - v[0].x, q.y - v[0].y) < t); }
    return false; };
  const zeroEnts = () => modelEntities.filter(e => !e.grp && isZero(e) && !(A.isLocked && A.isLocked(e)));
  const emptyTexts = () => modelEntities.filter(e => e.type === 'TEXT' && !e.grp && !String(e.text || '').trim() && !(A.isLocked && A.isLocked(e)));

  /* ==================================================================
     PURGE — Purge (như AutoCAD 2027: Purgeable Items / Find Non-Purgeable Items, cây mục có tên, đối tượng không tên)
     ================================================================== */
  function openPurge(){
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    let mode = 'p', data = namedData(), open = new Set(), chk = null, pick = null;
    const resetChk = () => { chk = new Set(); for(const c of data) for(const i of c.items) if(!i.use) chk.add(c.k + '\u0001' + i.n); };
    resetChk();
    const html = '<div class="acw" style="width:640px"><div class="pg-mode"><button type="button" data-m="p" class="on">Mục dọn được</button><button type="button" data-m="n">Tìm mục không dọn được</button></div>' +
      '<div class="acw-cols"><div class="c1" style="flex:1 1 330px"><div class="acw-lab" id="pgH">Mục có tên không dùng</div><div class="acw-list pg-tree" id="pgT" tabindex="0"></div></div>' +
      '<div class="c2" style="flex:0 0 280px"><div class="acw-lab">Chi tiết</div><div class="pg-det" id="pgD"></div></div></div>' +
      '<div id="pgO">' + K.grp('Tuỳ chọn', K.chk('pgCf', 'Xác nhận từng mục trước khi dọn', 0, { dis: 1, tip: 'Dọn luôn, có thể Hoàn tác bằng U' }) + '<br>' + K.chk('pgNs', 'Dọn cả mục lồng nhau', 1), 'margin:8px 0 6px') +
      K.grp('Đối tượng không tên', K.chk('pgZ', 'Dọn hình có độ dài 0', 1) + ' <span class="acw-note" id="pgZn" style="margin:0"></span><br>' + K.chk('pgE', 'Dọn chữ rỗng', 1) + ' <span class="acw-note" id="pgEn" style="margin:0"></span><br>' + K.chk('pgOr', 'Dọn dữ liệu mồ côi', 0, { dis: 1 })) + '</div></div>';
    const d = A.dialog({ title: 'Dọn bản vẽ', cls: 'acw-free', help: 'PURGE', html, noOk: true, cancelText: 'Đóng',
      left: K.btn('pgChk', 'Dọn các mục đã chọn') + ' ' + K.btn('pgAll', 'Dọn tất cả') });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => {
      const show = c => mode === 'p' ? c.items.filter(i => !i.use) : c.items.filter(i => i.use);
      let h = '<div class="it" data-n="*"><span class="tg"></span>' + (mode === 'p' ? '<input type="checkbox" data-all="1"' + (data.every(c => show(c).every(i => chk.has(c.k + '\u0001' + i.n))) && data.some(c => show(c).length) ? ' checked' : '') + '>' : '') + '<span>Tất cả mục</span></div>';
      for(const c of data){ const L = show(c), op = open.has(c.k);
        h += '<div class="it l1' + (pick === c.k ? ' on' : '') + '" data-c="' + c.k + '"><span class="tg" data-tg="' + c.k + '">' + (L.length ? (op ? '▾' : '▸') : '') + '</span>' + (mode === 'p' ? '<input type="checkbox" data-cc="' + c.k + '"' + (L.length && L.every(i => chk.has(c.k + '\u0001' + i.n)) ? ' checked' : '') + (L.length ? '' : ' disabled') + '>' : '') + '<span>' + esc(c.tt || c.t) + '</span><span class="c">' + L.length + '</span></div>';
        if(op) for(const i of L) h += '<div class="it l2' + (pick === c.k + '\u0001' + i.n ? ' on' : '') + '" data-i="' + esc(c.k + '\u0001' + i.n) + '"><span class="tg"></span>' + (mode === 'p' ? '<input type="checkbox" data-ii="' + esc(c.k + '\u0001' + i.n) + '"' + (chk.has(c.k + '\u0001' + i.n) ? ' checked' : '') + '>' : '') + '<span translate="no">' + esc(i.n) + '</span></div>'; }
      $('pgT').innerHTML = h; $('pgH').textContent = mode === 'p' ? 'Mục có tên không dùng' : 'Mục có tên đang dùng'; $('pgO').style.display = mode === 'p' ? '' : 'none';
      root.querySelector('#pgChk').style.display = root.querySelector('#pgAll').style.display = mode === 'p' ? '' : 'none';
      const z = zeroEnts().length, e = emptyTexts().length; $('pgZn').textContent = '(' + z + ')'; $('pgEn').textContent = '(' + e + ')';
      detail(); };
    const detail = () => { let h = '';
      if(!pick) h = mode === 'p' ? '<div class="acw-note" style="margin:0">Chọn một mục để xem chi tiết. Đánh dấu các mục cần dọn rồi bấm "Dọn các mục đã chọn".</div>' : '<div class="acw-note" style="margin:0">Các mục này đang được dùng nên không dọn được. Chọn một mục để xem lý do.</div>';
      else if(!pick.includes('\u0001')){ const c = data.find(x => x.k === pick); const L = c ? c.items.filter(i => mode === 'p' ? !i.use : !!i.use) : []; h = '<b>' + esc(c ? c.tt || c.t : '') + '</b><br>' + (mode === 'p' ? L.length + ' mục không dùng, có thể dọn.' : L.length + ' mục đang dùng.'); }
      else { const [k, n] = pick.split('\u0001'); const c = data.find(x => x.k === k), i = c && c.items.find(x => x.n === n); h = '<b translate="no">' + esc(n) + '</b><br><span style="color:#9aa6ba">' + esc(c ? c.t : '') + '</span><br><br>' + (i && i.use ? 'Không dọn được: ' + esc(i.use) + '.' : 'Không được dùng trong bản vẽ — có thể dọn.'); }
      $('pgD').innerHTML = h; };
    root.querySelector('.pg-mode').onclick = e => { const b = e.target.closest('[data-m]'); if(!b) return; mode = b.dataset.m; pick = null; root.querySelectorAll('.pg-mode button').forEach(x => x.classList.toggle('on', x === b)); render(); };
    $('pgT').addEventListener('click', e => {
      const tg = e.target.closest('[data-tg]'); if(tg){ const k = tg.dataset.tg; if(open.has(k)) open.delete(k); else open.add(k); render(); return; }
      const inp = e.target.closest('input[type=checkbox]');
      if(inp){ const on = inp.checked; const show = c => c.items.filter(i => !i.use);
        if(inp.dataset.all) for(const c of data) for(const i of show(c)) on ? chk.add(c.k + '\u0001' + i.n) : chk.delete(c.k + '\u0001' + i.n);
        if(inp.dataset.cc){ const c = data.find(x => x.k === inp.dataset.cc); for(const i of show(c)) on ? chk.add(c.k + '\u0001' + i.n) : chk.delete(c.k + '\u0001' + i.n); }
        if(inp.dataset.ii) on ? chk.add(inp.dataset.ii) : chk.delete(inp.dataset.ii);
        render(); return; }
      const it = e.target.closest('.it'); if(!it) return; pick = it.dataset.i || it.dataset.c || null; render(); });
    $('pgT').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-c]'); if(!it) return; const k = it.dataset.c; if(open.has(k)) open.delete(k); else open.add(k); render(); });
    const run = keys => { let n = 0, guard = 0;
      for(;;){ let k = 0; for(const key of keys){ const [c, nm] = key.split('\u0001'); if(purgeItem(c, nm)){ k++; log('Đã dọn ' + (data.find(x => x.k === c) || {}).t + ' "' + nm + '".'); } } n += k; data = namedData();
        if(!$('pgNs').checked || !k || ++guard > 6) break;
        // mục lồng nhau: khối vừa dọn có thể làm lộ thêm khối / lớp / kiểu không dùng nằm trong các nhóm đã chọn
        const cats = new Set(keys.map(x => x.split('\u0001')[0])); keys = []; for(const c of data) if(cats.has(c.k)) for(const i of c.items) if(!i.use) keys.push(c.k + '\u0001' + i.n); if(!keys.length) break; }
      const del = []; if($('pgZ').checked) del.push(...zeroEnts()); if($('pgE').checked) for(const e of emptyTexts()) if(!del.includes(e)) del.push(e);
      if(del.length){ A.commit({ del }, 'Dọn ' + del.length + ' đối tượng không tên'); n += del.length; }
      log('PURGE: đã dọn ' + n + ' mục.'); say(n ? 'Đã dọn ' + n + ' mục.' : 'Không có gì để dọn.'); data = namedData(); resetChk(); pick = null; render(); try{ draw(); }catch(_){} };
    $('pgChk').onclick = () => run([...chk]);
    $('pgAll').onclick = () => { const keys = []; for(const c of data) for(const i of c.items) if(!i.use) keys.push(c.k + '\u0001' + i.n); run(keys); };
    render();
  }
  A.openPurge = openPurge;
  plain(['PURGE', 'PU'], 'Dọn bản vẽ (Purge): khối, lớp, kiểu nét, kiểu chữ, kiểu kích thước không dùng; hình độ dài 0, chữ rỗng', () => openPurge());
  // -PURGE (bản dòng lệnh như AutoCAD — script / LISP gọi (command "PURGE" "A" "*" "N"))
  ecmd(['-PURGE', '-PU'], 'Dọn bản vẽ bằng dòng lệnh: loại mục, tên (* ?), xác nhận', async () => {
    const KW = [{ k: 'B', t: 'Khối' }, { k: 'D', t: 'Kiểu kích thước' }, { k: 'LA', t: 'Lớp' }, { k: 'LT', t: 'Kiểu nét' }, { k: 'MA', t: 'Vật liệu' }, { k: 'MU', t: 'Kiểu ghi chú dẫn' }, { k: 'M', t: 'Kiểu đường đôi' }, { k: 'ST', t: 'Kiểu chữ' }, { k: 'Z', t: 'Hình độ dài 0' }, { k: 'E', t: 'Chữ rỗng' }, { k: 'A', t: 'Tất cả' }];
    const t = await A.getKw('Nhập loại mục không dùng cần dọn', { kw: KW }); if(!t.kw) return;
    const MAP = { B: 'blk', D: 'dim', LA: 'lay', LT: 'lt', MU: 'mls', M: 'mln', ST: 'ts' };
    if(t.kw === 'Z' || t.kw === 'E'){ const del = t.kw === 'Z' ? zeroEnts() : emptyTexts(); if(del.length) A.commit({ del }, 'Dọn ' + del.length + ' đối tượng'); log(del.length ? 'Đã dọn ' + del.length + ' đối tượng.' : 'Không có đối tượng nào để dọn.'); return; }
    if(t.kw === 'MA'){ log('Không có vật liệu nào để dọn.'); return; }
    const pat = await A.getStr('Nhập tên cần dọn', { def: '*' }); const P = String(pat.str || '*').trim() || '*';
    const re = new RegExp('^(?:' + P.split(',').map(x => x.trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')).join('|') + ')$', 'i');
    const v = await A.getKw('Xác nhận từng tên trước khi dọn?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Có' }); const ask = v.kw !== 'N';
    let n = 0;
    for(let pass = 0; pass < 6; pass++){ let k = 0; const data = namedData();
      for(const c of data){ if(t.kw !== 'A' && MAP[t.kw] !== c.k) continue;
        for(const i of c.items){ if(i.use || !re.test(i.n)) continue;
          if(ask){ const q = await A.getKw('Dọn ' + c.t.toLowerCase() + ' "' + i.n + '"?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Không' }); if(q.kw !== 'Y') continue; }
          if(purgeItem(c.k, i.n)){ k++; log('Đang dọn ' + c.t.toLowerCase() + ' "' + i.n + '".'); } } }
      n += k; if(!k || ask) break; }
    log(n ? 'Đã dọn ' + n + ' mục.' : 'Không có mục nào không dùng để dọn.');
  });

  /* ==================================================================
     RENAME — Rename (như AutoCAD: Named Objects · Items · Old Name · Rename To)
     ================================================================== */
  function renameStyle(k, o, n){
    if(k === 'ts'){ const TS = A.TS; if(!TS || !TS.list[o] || TS.list[n] || o === 'Standard') return o === 'Standard' ? 'Không đổi tên được kiểu Standard.' : 'Tên đã có.';
      TS.list[n] = TS.list[o]; delete TS.list[o]; if(TS.cur === o) TS.cur = n; A.tsSave();
      const rep = []; for(const e of modelEntities) if(e.type === 'TEXT' && (e.style || 'Standard') === o){ const w = JSON.parse(JSON.stringify(e)); w.style = n; rep.push([e, w]); } if(rep.length) A.commit({ rep }, 'Đổi tên kiểu chữ ' + o + ' → ' + n); return ''; }
    if(k === 'dim'){ const lib = A.dimStyles.lib(); if(!lib[o] || lib[n]) return 'Tên đã có.'; if(o === 'Standard') return 'Không đổi tên được kiểu Standard.';
      lib[n] = lib[o]; delete lib[o]; A.dimStyles.saveLib(lib); if(A.DS.name === o){ A.DS.name = n; if(A.dsSave) A.dsSave(); }
      const rep = []; for(const e of modelEntities) if(e.dimd && e.dimd.s && e.dimd.s.name === o){ const w = JSON.parse(JSON.stringify(e)); w.dimd.s.name = n; rep.push([e, w]); } if(rep.length) A.commit({ rep }, 'Đổi tên kiểu kích thước ' + o + ' → ' + n); return ''; }
    if(k === 'mls') return A.mlsRename ? A.mlsRename(o, n) : 'Chưa hỗ trợ.';
    if(k === 'mln'){ const lib = mnLib(); if(!lib[o]) return 'Không thấy kiểu.'; if(lib[n]) return 'Tên đã có.'; lib[n] = lib[o]; delete lib[o]; mnSave(lib); if(A.MLINESTYLE && A.MLINESTYLE.name === o){ A.MLINESTYLE.name = n; try{ localStorage.setItem('dvd:mlstyle', JSON.stringify(A.MLINESTYLE)); }catch(_){} } return ''; }
    if(k === 'view'){ const V = A.namedViews; if(!V) return 'Chưa hỗ trợ.'; const L = V.get(); if(L.some(v => v.name === n)) return 'Tên đã có.'; const v = L.find(x => x.name === o); if(!v) return 'Không thấy.'; v.name = n; V.set(L); return ''; }
    if(k === 'lst'){ return A.layerState && A.layerState.rename ? A.layerState.rename(o, n) : 'Chưa hỗ trợ.'; }
    return 'Chưa hỗ trợ.';
  }
  function openRename(){
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const TYPES = [['blk', 'Các khối'], ['dim', 'Các kiểu kích thước'], ['lay', 'Các lớp'], ['lst', 'Các trạng thái lớp'], ['mls', 'Các kiểu ghi chú dẫn'], ['mln', 'Các kiểu đường đôi'], ['ts', 'Các kiểu chữ'], ['view', 'Các góc nhìn']];
    const items = k => { if(k === 'blk') return [...new Set(modelEntities.map(blkName).filter(Boolean))].concat(A.fileBlockNames ? A.fileBlockNames() : []).filter((v, i, a) => a.indexOf(v) === i).sort();
      if(k === 'lay') return A.layerNames().filter(n => n !== '0'); if(k === 'ts') return A.TS ? Object.keys(A.TS.list).filter(n => n !== 'Standard') : [];
      if(k === 'dim') return Object.keys(A.dimStyles ? A.dimStyles.lib() : {}).filter(n => n !== 'Standard'); if(k === 'mls') return A.mlsLib ? Object.keys(A.mlsLib()).filter(n => n !== 'Standard') : []; if(k === 'mln') return Object.keys(mnLib()).filter(n => n !== 'STANDARD');
      if(k === 'view') return A.namedViews ? A.namedViews.get().map(v => v.name) : []; if(k === 'lst') return A.layerState ? A.layerState.list() : []; return []; };
    let typ = 'lay', it = null;
    const html = '<div class="acw" style="width:520px"><div class="acw-cols"><div class="c1" style="flex:1 1 50%"><div class="acw-lab">Loại đối tượng có tên</div>' + K.list('rnT', TYPES.map(([v, t]) => ({ v, t })), typ, 'height:260px') + '</div>' +
      '<div class="c1" style="flex:1 1 50%"><div class="acw-lab">Mục</div><div class="acw-list rn-l" id="rnI" tabindex="0"></div></div></div>' +
      '<div class="acw-row" style="margin-top:8px"><span class="l" style="flex:0 0 90px">Tên cũ:</span><input id="rnO" style="flex:1;width:auto"></div>' +
      '<div class="acw-row">' + K.btn('rnBtn', 'Đổi thành:') + '<input id="rnN" style="flex:1;width:auto"></div></div>';
    const d = A.dialog({ title: 'Đổi tên', cls: 'acw-free', help: 'RENAME', html, ok: root => { const r = apply(root); return r; } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const fill = () => { const L = items(typ); $('rnI').innerHTML = L.length ? L.map(n => '<div class="it' + (n === it ? ' on' : '') + '" data-v="' + esc(n) + '" translate="no">' + esc(n) + '</div>').join('') : '<div class="acw-note" style="padding:6px">Không có mục nào đổi tên được.</div>'; };
    K.bindList($('rnT'), v => { typ = v; it = null; $('rnO').value = ''; fill(); });
    $('rnI').addEventListener('click', e => { const x = e.target.closest('.it[data-v]'); if(!x) return; it = x.dataset.v; $('rnO').value = it; $('rnN').value = it; fill(); setTimeout(() => { $('rnN').focus(); $('rnN').select(); }, 0); });
    $('rnO').addEventListener('input', () => { const v = $('rnO').value; const m = items(typ).includes(v) ? v : null; it = m; fill(); });
    function apply(){ const o = $('rnO').value.trim(), n = $('rnN').value.trim().replace(/[<>\/\\":;?*|=`]/g, '_');
      if(!o || !items(typ).includes(o)){ say('Chọn mục cần đổi tên.'); return false; } if(!n || n === o){ say('Nhập tên mới khác tên cũ.'); return false; }
      if(typ === 'lay'){ if(!A.renameLayer(o, n)) return false; }
      else if(typ === 'blk'){ if(!renameBlk(o, n)) return false; }
      else { const err = renameStyle(typ, o, n); if(err){ say(err); return false; } log('Đã đổi tên "' + o + '" thành "' + n + '".'); }
      return true; }
    $('rnBtn').onclick = () => { if(apply() !== false){ it = $('rnN').value.trim(); $('rnO').value = it; fill(); } };
    fill();
  }
  function renameBlk(o, n){
    const B = window._dvdBlocks; if((B && B[n]) || modelEntities.some(e => blkName(e) === n)){ say('Đã có khối "' + n + '".'); return false; }
    const rep = []; for(const e of modelEntities) if(blkName(e) === o){ const w = JSON.parse(JSON.stringify(e)); if(w.bm && w.bm.name === o) w.bm.name = n; if(w.blk === o) w.blk = n; rep.push([e, w]); }
    if(B && B[o]){ B[n] = B[o]; delete B[o]; for(const d of Object.values(B)) for(const x of (d && d.entities) || []) if(x.type === 'INSERT' && x.name === o) x.name = n; }
    try{ const D = A.dynDefs && A.dynDefs(); if(D && D[o]){ D[n] = D[o]; delete D[o]; localStorage.setItem('dvd:dynblk', JSON.stringify(D)); } }catch(_){}
    if(rep.length) A.commit({ rep }, 'Đổi tên khối ' + o + ' → ' + n); if(A.saveBlockLib) A.saveBlockLib(A.blockLib());
    log('Đã đổi tên khối "' + o + '" thành "' + n + '".'); return true;
  }
  A.openRename = openRename;
  plain(['RENAME', 'REN', 'DDRENAME'], 'Đổi tên đối tượng có tên (Rename): khối, lớp, kiểu chữ, kiểu kích thước, góc nhìn…', () => openRename());

  /* ==================================================================
     LAYERSTATE — Layer States Manager (như AutoCAD: bảng trạng thái, Mới / Lưu / Đổi tên / Xoá / Nhập / Xuất, thuộc tính cần gọi lại)
     ================================================================== */
  const css4 = document.createElement('style');
  css4.textContent = `
  .ls-grid{height:220px;overflow:auto;border:1px solid #5a6578;background:#262b34}
  .ls-grid table,.vm-props table,.fr-res table{width:100%;border-collapse:collapse;font-size:12px}
  .ls-grid th,.fr-res th{position:sticky;top:0;background:#434c5b;font-weight:400;text-align:left;padding:3px 6px;border-right:1px solid #5a6578;white-space:nowrap}
  .ls-grid td,.fr-res td{padding:2px 6px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.04);cursor:default}
  .ls-grid tr.sel td,.fr-res tr.sel td{background:#0b5f8f}
  .ls-props{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px}
  .vm-props{height:300px;overflow:auto;border:1px solid #5a6578;background:#262b34}
  .vm-props td{padding:2px 6px;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap}
  .vm-props td:first-child{color:#b4bdca;width:42%}
  .vm-props tr.hd td{background:#384252;color:#e8ecf2;font-weight:600}
  .vm-props input{width:100%;box-sizing:border-box;height:20px;background:#1f242c;color:#e8ecf2;border:1px solid #4a5363;border-radius:2px;font:12px inherit;padding:0 4px}
  .fr-res{height:150px;overflow:auto;border:1px solid #5a6578;background:#262b34;margin-top:6px}
  .fr-more{display:none}.fr-more.on{display:flex}
  `;
  document.head.appendChild(css4);
  const PROPS = [['on', 'Bật / tắt'], ['frz', 'Đóng băng / rã băng'], ['lock', 'Khoá / mở khoá'], ['col', 'Màu'], ['lt', 'Kiểu nét'], ['lw', 'Bề rộng nét'], ['cur', 'Lớp hiện hành']];
  const LSM_KEY = 'dvd:lsmask';
  function openLayerStates(){
    const LST = A.layerState; if(!LST){ say('Chưa sẵn sàng.'); return; }
    let mask = (() => { try{ return Object.assign({ on: 1, frz: 1, lock: 1, col: 1, lt: 1, lw: 1, cur: 1 }, JSON.parse(localStorage.getItem(LSM_KEY) || '{}')); }catch(_){ return { on: 1, frz: 1, lock: 1, col: 1, lt: 1, lw: 1, cur: 1 }; } })();
    let sel = null;
    const html = '<div class="acw" style="width:620px"><div class="acw-lab">Trạng thái lớp</div><div class="acw-cols"><div class="c1"><div class="ls-grid"><table><thead><tr><th>Tên</th><th>Không gian</th><th>Giống bản vẽ</th><th style="width:100%">Mô tả</th></tr></thead><tbody id="lsB"></tbody></table></div>' +
      K.chk('lsX', 'Không liệt kê trạng thái lớp của Xref', 1, { dis: 1 }) + '</div>' +
      '<div class="c2 acw-btncol">' + K.btn('lsNew', 'Mới…') + K.btn('lsSave', 'Lưu') + K.btn('lsEdit', 'Sửa…', { dis: 1 }) + K.btn('lsRen', 'Đổi tên') + K.btn('lsDel', 'Xoá') + K.btn('lsImp', 'Nhập…') + K.btn('lsExp', 'Xuất…') + '</div></div>' +
      K.grp('Tuỳ chọn gọi lại', K.chk('lsOff', 'Tắt các lớp không có trong trạng thái lớp', 0) + '<br>' + K.chk('lsVp', 'Áp thuộc tính như ghi đè khung nhìn', 0, { dis: 1 }), 'margin:8px 0 6px') +
      K.grp('Thuộc tính lớp cần gọi lại', '<div class="ls-props">' + PROPS.map(([k, t]) => K.chk('lsP_' + k, t, mask[k])).join('') + '</div><div class="acw-row" style="margin-top:4px"><span class="l"></span>' + K.btn('lsAllP', 'Chọn tất cả') + K.btn('lsNoP', 'Bỏ tất cả') + '</div>') +
      '<div class="acw-note" id="lsCur"></div></div>';
    const d = A.dialog({ title: 'Quản lý trạng thái lớp', cls: 'acw-free', help: 'LAYERSTATE', html, okText: 'Gọi lại', cancelText: 'Đóng', ok: () => { if(!sel){ say('Chọn một trạng thái lớp.'); return false; } restore(); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const readMask = () => { for(const [k] of PROPS) mask[k] = $('lsP_' + k).checked ? 1 : 0; try{ localStorage.setItem(LSM_KEY, JSON.stringify(mask)); }catch(_){} };
    const render = () => { const all = LST.all(), names = Object.keys(all).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if(sel && !all[sel]) sel = null;
      $('lsB').innerHTML = names.length ? names.map(n => '<tr data-n="' + esc(n) + '"' + (n === sel ? ' class="sel"' : '') + '><td translate="no">' + esc(n) + '</td><td>Model</td><td>' + (LST.same(n) ? '✓' : '') + '</td><td translate="no">' + esc(all[n].desc || '') + '</td></tr>').join('') : '<tr><td colspan="4" style="color:#9aa6ba">Chưa có trạng thái lớp nào. Bấm "Mới…" để lưu tình trạng lớp hiện tại.</td></tr>';
      ['lsSave', 'lsRen', 'lsDel', 'lsExp'].forEach(id => $(id).disabled = !sel); root.querySelector('.dvd-ok').disabled = !sel;
      { const cn = names.find(n => LST.same(n)); $('lsCur').innerHTML = 'Trạng thái lớp hiện tại: ' + (cn ? '<span translate="no">' + esc(cn) + '</span>' : '*Chưa lưu*'); } };
    const restore = () => { readMask(); LST.restore(sel, Object.assign({}, mask));
      if($('lsOff').checked){ const S = LST.all()[sel]; const known = new Set((S.layers || Object.keys(S.hex || {})).concat(S.off || [], S.fz || [], S.lk || [], [S.cur])); for(const n of A.layerNames()) if(!known.has(n) && n !== A.LS.cur) A.setLayerFlag(n, 'off', true); }
      log('Đã gọi lại trạng thái lớp "' + sel + '".'); };
    $('lsB').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; render(); });
    $('lsB').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; restore(); d.close(); });
    $('lsNew').onclick = () => { let i = 1; while(LST.all()['Trạng thái ' + i]) i++;
      A.dialog({ title: 'Trạng thái lớp mới cần lưu', cls: 'acw-free', help: 'LAYERSTATE', html: '<div class="acw" style="width:360px">' + K.vrow('Tên trạng thái lớp mới:', K.txt('lnN', 'Trạng thái ' + i)) + K.vrow('Mô tả', K.txt('lnD', '')) + '</div>',
        ok: r => { const n = K.val(r, 'lnN').trim(); if(!n){ say('Nhập tên.'); return false; } if(LST.all()[n]){ say('Đã có trạng thái "' + n + '".'); return false; } LST.save(n, K.val(r, 'lnD')); sel = n; render(); log('Đã lưu trạng thái lớp "' + n + '".'); } }); };
    $('lsSave').onclick = () => { if(!sel) return; A.dialog({ title: 'Trạng thái lớp', help: false, html: '<div class="acw" style="max-width:380px">Trạng thái lớp "' + esc(sel) + '" đã có. Ghi đè bằng tình trạng lớp hiện tại?</div>', okText: 'Có', cancelText: 'Không', ok: () => { LST.save(sel); render(); } }); };
    $('lsRen').onclick = async () => { if(!sel) return; const nn = await askText({ title: 'Đổi tên trạng thái lớp', value: sel }); const t = nn && nn.trim(); if(!t || t === sel) return; const err = LST.rename(sel, t); if(err){ say(err); return; } sel = t; render(); };
    $('lsDel').onclick = () => { if(!sel) return; LST.del(sel); sel = null; render(); };
    $('lsExp').onclick = () => { if(!sel) return; const S = LST.all()[sel]; const blob = new Blob([JSON.stringify({ dvdLayerState: 1, name: sel, state: S }, null, 1)], { type: 'application/json' });
      try{ shareOrDownload(blob, sel.replace(/[\\/:*?"<>|]+/g, '_') + '.las.json', 'application/json'); }catch(_){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sel + '.las.json'; a.click(); } };
    $('lsImp').onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,.las'; f.onchange = () => { const file = f.files && f.files[0]; if(!file) return; const rd = new FileReader();
      rd.onload = () => { try{ const o = JSON.parse(String(rd.result)); const S = o && o.state; if(!S || !Array.isArray(S.off)) throw 0; let n = String(o.name || file.name.replace(/\..*$/, '')); while(LST.all()[n]) n += ' (2)'; LST.put(n, S); sel = n; render(); log('Đã nhập trạng thái lớp "' + n + '".'); }catch(_){ say('File không phải trạng thái lớp của DVDCAD (.las.json).'); } }; rd.readAsText(file); }; f.click(); };
    $('lsAllP').onclick = () => { for(const [k] of PROPS) $('lsP_' + k).checked = true; readMask(); };
    $('lsNoP').onclick = () => { for(const [k] of PROPS) $('lsP_' + k).checked = false; readMask(); };
    root.querySelector('.ls-props').addEventListener('change', readMask);
    render();
  }
  A.openLayerStates = openLayerStates;
  plain(['LAYERSTATE', 'LAS', 'LMAN'], 'Quản lý trạng thái lớp (Layer States Manager): lưu, gọi lại, đổi tên, nhập / xuất', () => openLayerStates());

  /* ==================================================================
     VIEW — View Manager (như AutoCAD: cây Views · bảng thuộc tính · Set Current / New / Delete)
     ================================================================== */
  function openViewManager(){
    const V = A.namedViews; if(!V){ say('Chưa sẵn sàng.'); return; }
    let L = V.get().map(v => Object.assign({}, v)), sel = '*cur', pend = null;
    const geo = v => { const w = W(), h = H(), sc = v.s || 1; const ox = v.x, oy = v.y; const c = { x: (w / 2 - ox) / sc, y: -(h / 2 - oy) / sc }; return { c, w: w / sc, h: h / sc }; };
    const curV = () => ({ name: 'Hiện tại', s: view.scale, x: view.offsetX, y: view.offsetY, r: view.rot || 0 });
    const presets = [['Trên', 0], ['Xoay 90°', Math.PI / 2], ['Xoay 180°', Math.PI], ['Xoay 270°', 3 * Math.PI / 2]];
    const html = '<div class="acw" style="width:700px"><div class="acw-cols"><div class="c1" style="flex:0 0 210px"><div class="acw-lab">Góc nhìn</div><div class="acw-list pg-tree" id="vmT" tabindex="0" style="height:300px"></div></div>' +
      '<div class="c1" style="flex:1 1 auto"><div class="acw-lab" id="vmH">Thuộc tính</div><div class="vm-props" id="vmP"></div></div>' +
      '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('vmCur', 'Đặt hiện hành') + K.btn('vmNew', 'Mới…') + K.btn('vmLay', 'Cập nhật lớp') + K.btn('vmBnd', 'Sửa biên…', { dis: 1 }) + K.btn('vmDel', 'Xoá') + '</div></div></div>';
    const d = A.dialog({ title: 'Quản lý góc nhìn', cls: 'acw-free', help: 'VIEW', html, left: K.btn('vmApply', 'Áp dụng'), ok: () => { commit(); if(pend) go(pend); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const commit = () => { V.set(L); };
    const go = v => { if(v.pre != null){ try{ if(typeof setRotation === 'function') setRotation(v.pre); else view.rot = v.pre; }catch(_){ view.rot = v.pre; } draw(); return; } V.restore(v); if(v.lay && A.layerState && A.layerState.apply) A.layerState.apply(v.lay); log('Góc nhìn "' + v.name + '".'); };
    const node = (id, t, lvl, ex) => '<div class="it ' + (lvl ? 'l' + lvl : '') + (sel === id ? ' on' : '') + '" data-v="' + esc(id) + '"><span class="tg">' + (ex || '') + '</span><span' + (id.startsWith('m:') ? ' translate="no"' : '') + '>' + esc(t) + '</span></div>';
    const render = () => { let h = node('*cur', 'Hiện tại', 0) + node('*model', 'Góc nhìn mô hình', 0, '▾');
      for(const v of L) h += node('m:' + v.name, v.name, 2); h += node('*lay', 'Góc nhìn layout', 0, '') + node('*pre', 'Góc nhìn mẫu', 0, '▾'); for(const [t] of presets) h += node('p:' + t, t, 2);
      $('vmT').innerHTML = h; props(); const isM = sel.startsWith('m:'); $('vmDel').disabled = !isM; $('vmLay').disabled = !isM; $('vmCur').disabled = !(isM || sel.startsWith('p:')); };
    const props = () => { let v = null, t = '';
      if(sel === '*cur'){ v = curV(); t = 'Hiện tại'; } else if(sel.startsWith('m:')){ v = L.find(x => x.name === sel.slice(2)); t = v ? v.name : ''; } else if(sel.startsWith('p:')){ const p = presets.find(x => x[0] === sel.slice(2)); t = p ? p[0] : ''; }
      $('vmH').innerHTML = 'Thuộc tính' + (t ? ' — <span' + (sel.startsWith('m:') ? ' translate="no"' : '') + '>' + esc(t) + '</span>' : '');
      if(!v){ $('vmP').innerHTML = '<table><tr><td colspan="2" style="color:#9aa6ba;white-space:normal;width:auto">' + (sel.startsWith('p:') ? 'Góc nhìn mẫu: đặt hướng xoay màn hình (mặt bằng 2D).' : sel === '*lay' ? 'Chưa có góc nhìn layout.' : 'Chọn một góc nhìn để xem thuộc tính.') + '</td></tr></table>'; return; }
      const g = geo(v), ed = sel.startsWith('m:'), f = x => (+x).toFixed(Math.max(0, Math.min(6, (window.measPrec != null ? measPrec : 4))));
      const row = (k, val, inp) => '<tr><td>' + k + '</td><td>' + (inp && ed ? '<input data-k="' + inp + '" value="' + esc(val) + '"' + (inp === 'cat' ? ' placeholder="<Không>"' : '') + '>' : esc(val)) + '</td></tr>';
      $('vmP').innerHTML = '<table><tr class="hd"><td colspan="2">Tổng quát</td></tr>' + row('Tên', v.name, 'name') + row('Nhóm', v.cat || '', 'cat') + row('Loại góc nhìn', 'Mô hình') + row('Ảnh chụp lớp', v.lay ? 'Có' : 'Không') +
        '<tr class="hd"><td colspan="2">Khung nhìn</td></tr>' + row('Tâm X', f(g.c.x), 'cx') + row('Tâm Y', f(g.c.y), 'cy') + row('Chiều cao', f(g.h), 'h') + row('Chiều rộng', f(g.w)) + row('Góc xoay', f(-(v.r || 0) * 180 / Math.PI) + '°', 'r') + '</table>'; };
    $('vmP').addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); e.target.blur(); } });
    $('vmP').addEventListener('change', e => { const i = e.target.closest('input[data-k]'); if(!i || !sel.startsWith('m:')) return; const v = L.find(x => x.name === sel.slice(2)); if(!v) return; const k = i.dataset.k, val = i.value.trim();
      if(k === 'name'){ if(!val || L.some(x => x !== v && x.name === val)){ say('Tên trống hoặc đã có.'); props(); return; } v.name = val; sel = 'm:' + val; render(); return; }
      if(k === 'cat'){ v.cat = val && val !== '<Không>' ? val : undefined; return; }
      const n = num(val.replace('°', '')); if(n == null){ props(); return; } const g = geo(v);
      if(k === 'h' && n > 0){ v.s = H() / n; } const g2 = geo(v); const cx = k === 'cx' ? n : g.c.x, cy = k === 'cy' ? n : g.c.y;
      if(k === 'r') v.r = -n * Math.PI / 180;
      v.x = W() / 2 - cx * v.s; v.y = H() / 2 + cy * v.s; void g2; props(); });
    $('vmT').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; const v = it.dataset.v; if(v === '*model' || v === '*pre') return; sel = v; render(); });
    $('vmT').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; sel = it.dataset.v; $('vmCur').click(); });
    $('vmCur').onclick = () => { if(sel.startsWith('m:')){ pend = L.find(x => x.name === sel.slice(2)); } else if(sel.startsWith('p:')){ const p = presets.find(x => x[0] === sel.slice(2)); pend = { name: p[0], pre: p[1] }; } if(pend) log('Góc nhìn hiện hành (khi bấm OK): ' + pend.name); };
    $('vmApply').onclick = () => { commit(); if(pend){ go(pend); pend = null; render(); } };
    $('vmDel').onclick = () => { if(!sel.startsWith('m:')) return; L = L.filter(x => x.name !== sel.slice(2)); sel = '*model'; sel = '*cur'; render(); };
    $('vmLay').onclick = () => { const v = L.find(x => x.name === sel.slice(2)); if(v && A.layerState){ v.lay = A.layerState.snap(); say('Đã cập nhật ảnh chụp lớp cho "' + v.name + '".'); props(); } };
    $('vmNew').onclick = () => { let i = 1; while(L.some(v => v.name === 'Góc nhìn ' + i)) i++;
      A.dialog({ title: 'Thuộc tính góc nhìn mới', cls: 'acw-free', help: 'VIEW', html: '<div class="acw" style="width:400px">' + K.row('Tên góc nhìn:', K.txt('nvN', 'Góc nhìn ' + i)) + K.row('Nhóm góc nhìn:', K.txt('nvC', '', { ph: '<Không>' })) +
        K.grp('Biên', K.rad('nvB', 'cur', 'Hiển thị hiện tại', 1) + '<br>' + K.rad('nvB', 'win', 'Chọn cửa sổ', 0)) + K.grp('Cài đặt', K.chk('nvL', 'Lưu ảnh chụp lớp cùng góc nhìn', 1)) + '</div>',
        ok: r => { const n = K.val(r, 'nvN').trim(); if(!n){ say('Nhập tên.'); return false; } if(L.some(v => v.name === n)){ say('Đã có góc nhìn "' + n + '".'); return false; }
          const v = { name: n, s: view.scale, x: view.offsetX, y: view.offsetY, r: view.rot || 0 }; const c = K.val(r, 'nvC').trim(); if(c) v.cat = c; if(r.querySelector('#nvL').checked && A.layerState) v.lay = A.layerState.snap();
          const add = () => { L.push(v); sel = 'm:' + n; render(); };
          if((r.querySelector('input[name=nvB]:checked') || {}).value !== 'win'){ add(); return; }
          // chọn cửa sổ: tạm ẩn View Manager, bấm 2 góc trên bản vẽ
          setTimeout(async () => { d.root.style.display = 'none'; const w = await pickWin(); d.root.style.display = '';
            if(w){ const g = { x0: Math.min(w[0].x, w[1].x), x1: Math.max(w[0].x, w[1].x), y0: Math.min(w[0].y, w[1].y), y1: Math.max(w[0].y, w[1].y) }; const sc = Math.min(W() / Math.max(1e-9, g.x1 - g.x0), H() / Math.max(1e-9, g.y1 - g.y0)) * 0.96; v.s = sc; v.x = W() / 2 - (g.x0 + g.x1) / 2 * sc; v.y = H() / 2 + (g.y0 + g.y1) / 2 * sc; }
            add(); }, 0); } }); };
    // chọn cửa sổ 2 góc trên bản vẽ (khi hộp thoại tạm ẩn)
    const pickWin = () => new Promise(res => { const cv = document.getElementById('cv'); let a = null; log('Chỉ định góc thứ nhất của cửa sổ góc nhìn (Esc = huỷ)');
      const pt = e => { const r = cv.getBoundingClientRect(); return toWorld(e.clientX - r.left, e.clientY - r.top); };
      const dn = e => { if(e.target !== cv) return; e.preventDefault(); e.stopPropagation(); if(!a){ a = pt(e); log('Chỉ định góc đối diện'); return; } const b = pt(e); off(); res([a, b]); };
      const kd = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); off(); res(null); } };
      const off = () => { document.removeEventListener('pointerdown', dn, true); window.removeEventListener('keydown', kd, true); };
      document.addEventListener('pointerdown', dn, true); window.addEventListener('keydown', kd, true); });
    render();
  }
  A.openViewManager = openViewManager;
  plain(['VIEW', 'V', 'DDVIEW'], 'Quản lý góc nhìn (View Manager): lưu, gọi lại, sửa góc nhìn đặt tên', () => openViewManager());

  /* ==================================================================
     FIND — Find and Replace (như AutoCAD: Find what / Replace with / Find where, danh sách kết quả, Thêm tuỳ chọn)
     ================================================================== */
  const FR = { hist: [], rhist: [] };
  function openFind(pre){
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    let scope = selEnts.size ? 'sel' : 'all', selSet = scope === 'sel' ? [...selEnts] : [], hits = [], idx = -1;
    const dl = (id, L) => '<datalist id="' + id + '">' + L.map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>';
    const html = '<div class="acw" style="width:640px"><div class="acw-cols"><div class="c1">' + K.vrow('Tìm:', '<input id="fdF" list="fdFL" value="' + esc(pre || '') + '">' + dl('fdFL', FR.hist)) + K.vrow('Thay bằng:', '<input id="fdR" list="fdRL">' + dl('fdRL', FR.rhist)) + '</div>' +
      '<div class="c1" style="flex:0 0 230px">' + K.vrow('Tìm ở:', '<div class="acw-row" style="margin:0"><select id="fdW" style="flex:1;width:auto"><option value="all">Toàn bản vẽ</option><option value="sel"' + (scope === 'sel' ? ' selected' : '') + '>Vùng chọn hiện tại</option></select>' + K.btn('fdSel', A.ICONS && A.ICONS.SELECT ? A.ico('SELECT') : '⌖') + '</div>') + '<div class="acw-note" id="fdSN"></div></div></div>' +
      '<div class="acw-row">' + K.chk('fdList', 'Liệt kê kết quả', 1) + '<span class="l"></span><button type="button" class="acw-btn" id="fdMore">Thêm tuỳ chọn ⌄</button></div>' +
      '<div class="fr-res" id="fdRes"><table><thead><tr><th>Vị trí</th><th>Loại đối tượng</th><th style="width:100%">Nội dung</th></tr></thead><tbody id="fdB"></tbody></table></div>' +
      '<div class="acw-cols fr-more" id="fdMo" style="margin-top:8px"><div class="c1">' + K.grp('Tuỳ chọn tìm', K.chk('fdC', 'Phân biệt hoa thường', 0) + '<br>' + K.chk('fdWh', 'Chỉ tìm nguyên từ', 0) + '<br>' + K.chk('fdWc', 'Dùng ký tự đại diện (* ?)', 0) + '<br>' + K.chk('fdX', 'Tìm trong Xref', 0, { dis: 1 }) + '<br>' + K.chk('fdBk', 'Tìm trong khối', 1) + '<br>' + K.chk('fdH', 'Bỏ qua mục ẩn', 1) + '<br>' + K.chk('fdDi', 'Phân biệt dấu (ă, â, ê…)', 1)) + '</div>' +
      '<div class="c1">' + K.grp('Loại chữ', K.chk('fdTa', 'Giá trị thuộc tính khối', 1) + '<br>' + K.chk('fdTd', 'Chữ kích thước / ghi chú dẫn', 1) + '<br>' + K.chk('fdTt', 'Chữ một dòng / nhiều dòng', 1) + '<br>' + K.chk('fdTb', 'Chữ trong bảng', 1) + '<br>' + K.chk('fdTh', 'Mô tả siêu liên kết', 0, { dis: 1 })) + '</div></div>' +
      '<div class="acw-note" id="fdN"></div></div>';
    const d = A.dialog({ title: 'Tìm và thay thế', cls: 'acw-free', help: 'FIND', html, noOk: true, cancelText: 'Hoàn tất', modeless: true,
      left: K.btn('fdRep', 'Thay thế') + ' ' + K.btn('fdAll', 'Thay tất cả') + ' ' + K.btn('fdNext', 'Tìm', { def: 1 }) });
    const root = d.root, $ = id => root.querySelector('#' + id), C = id => $(id).checked;
    const fold = ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    const norm = s => C('fdDi') ? s : fold(s);
    // bỏ dấu từng ký tự, giữ bảng vị trí về chuỗi gốc (để thay đúng chỗ khi không phân biệt dấu)
    const normMap = src => { let n = ''; const map = []; for(let i = 0; i < src.length;){ const ch = String.fromCodePoint(src.codePointAt(i)), t = fold(ch); for(let k = 0; k < t.length; k++) map.push(i); n += t; i += ch.length; } map.push(src.length); return { n, map }; };
    const mkRe = g => { const f = $('fdF').value; if(!f) return null; let s = norm(f).replace(/[.+^${}()|[\]\\]/g, '\\$&'); s = C('fdWc') ? s.replace(/\*/g, '.*').replace(/\?/g, '.') : s.replace(/[*?]/g, '\\$&');
      if(C('fdWh')) s = '(?<![\\p{L}\\p{N}_])' + s + '(?![\\p{L}\\p{N}_])'; return new RegExp(s, 'u' + (g ? 'g' : '') + (C('fdC') ? '' : 'i')); };
    const kindOf = e => e.tbld ? 'tb' : e.att ? 'att' : (e.dimd || e.dimx || e.ldr) ? 'dim' : 'txt';
    const KN = { tb: 'Bảng', att: 'Thuộc tính khối', dim: 'Kích thước', txt: 'Chữ' };
    const textOf = e => e.tbld ? e.tbld.cells.map(r => r.join('\t')).join('\n') : (A.textSrc ? A.textSrc(e) : String(e.text || ''));
    const pool = () => { const src = $('fdW').value === 'sel' ? selSet : modelEntities; const seenTb = new Set();
      return src.filter(e => { if(e.type !== 'TEXT') return false; if(C('fdH') && e.vh) return false; const k = kindOf(e);
        if(k === 'tb'){ if(!C('fdTb') || seenTb.has(e.tbld)) return false; seenTb.add(e.tbld); return true; }
        if(k === 'att') return C('fdTa'); if(k === 'dim') return C('fdTd'); if(e.grp && !C('fdBk') && !e.att) return false; return C('fdTt'); }); };
    const search = () => { const re = mkRe(false); hits = re ? pool().filter(e => re.test(norm(textOf(e)))) : []; idx = -1; list(); };
    const list = () => { $('fdRes').style.display = C('fdList') ? '' : 'none';
      $('fdB').innerHTML = hits.slice(0, 500).map((e, i) => '<tr data-i="' + i + '"' + (i === idx ? ' class="sel"' : '') + '><td>Model</td><td>' + KN[kindOf(e)] + '</td><td translate="no">' + esc(textOf(e).replace(/\s*\n\s*/g, ' ⏎ ').slice(0, 120)) + '</td></tr>').join('');
      $('fdN').textContent = $('fdF').value ? (hits.length ? 'Tìm thấy ' + hits.length + ' đối tượng.' : 'Không tìm thấy.') : ''; };
    const show = i => { const e = hits[i]; if(!e) return; idx = i; try{ selEnts.clear(); selEnts.add(e); refreshPanSel(); }catch(_){} const b = entBBox(e);
      if(b){ const w = Math.max(b.x1 - b.x0, e.h * 6 || 1), h = Math.max(b.y1 - b.y0, e.h * 4 || 1), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; try{ A.pushView && A.pushView(); }catch(_){} zoomToWorldRect(cx - w * 1.5, cy - h * 1.5, cx + w * 1.5, cy + h * 1.5); }
      try{ draw(); }catch(_){} list(); const tr = $('fdB').querySelector('tr.sel'); if(tr) tr.scrollIntoView({ block: 'nearest' }); };
    const remember = () => { const f = $('fdF').value, r = $('fdR').value; if(f && !FR.hist.includes(f)) FR.hist.unshift(f); if(r && !FR.rhist.includes(r)) FR.rhist.unshift(r); FR.hist.length = Math.min(FR.hist.length, 12); FR.rhist.length = Math.min(FR.rhist.length, 12); };
    const replIn = (e, R) => { const re = mkRe(true); const w = JSON.parse(JSON.stringify(e)); const rp = s => { if(C('fdDi')) return String(s).replace(re, () => R); const src = String(s), M = normMap(src); let out = '', last = 0; M.n.replace(re, (m, ...a) => { const off = a.find(x => typeof x === 'number'); const s0 = M.map[off], s1 = M.map[off + m.length]; out += src.slice(last, s0) + R; last = s1; return m; }); return out + src.slice(last); };
      // chữ có định dạng: thay trên các đoạn, giữ đậm / nghiêng / trường
      if(!w.tbld && A.rtOf(e)){ let runs = A.rtOf(e); const src = rtPlain(runs), M = C('fdDi') ? null : normMap(src);
        const rg = M ? [...M.n.matchAll(re)].map(m => [M.map[m.index], M.map[m.index + m[0].length]]) : [...src.matchAll(re)].map(m => [m.index, m.index + m[0].length]);
        for(let k = rg.length - 1; k >= 0; k--) runs = rtReplace(runs, rg[k][0], rg[k][1], R); w.rt = runs; const t = layoutPlain(w); w.text = t; w.rtx = t; delete w.userAdded; return w; }
      if(w.tbld) w.tbld.cells = w.tbld.cells.map(r => r.map(c => rp(c == null ? '' : c)));
      else { const t = rp(textOf(e)); if(e.mtp && e.mtwk > 0 && A.textSrc(e) === e.mtp){ w.mtp = t; w.text = wrapText(t, e.h, e.mtwk * e.h, e.ff, e.xs); if(w.text === t) delete w.mtp; } else w.text = t; if(w.dimd) w.dimd.ov = w.text; }
      delete w.userAdded; return w; };
    $('fdNext').onclick = () => { remember(); if(!hits.length) search(); if(!hits.length) return; show((idx + 1) % hits.length); };
    $('fdRep').onclick = () => { remember(); if(idx < 0){ $('fdNext').click(); return; } const e = hits[idx]; if(!e || (A.isLocked && A.isLocked(e))){ say('Đối tượng bị khoá.'); return; } const w = replIn(e, $('fdR').value); A.commit({ rep: [[e, w]] }, 'Đã thay 1 chữ'); hits[idx] = w; const re = mkRe(false); if(!re.test(norm(textOf(w)))){ hits.splice(idx, 1); idx--; } if(hits.length) show((idx + 1) % hits.length); else list(); };
    $('fdAll').onclick = () => { remember(); search(); const R = $('fdR').value; const rep = hits.filter(e => !(A.isLocked && A.isLocked(e))).map(e => [e, replIn(e, R)]); if(rep.length){ A.commit({ rep }, 'Đã thay ' + rep.length + ' chữ'); say('Đã thay ' + rep.length + ' đối tượng.'); } else say('Không tìm thấy.'); search(); };
    $('fdB').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if(tr) show(+tr.dataset.i); });
    $('fdMore').onclick = () => { const on = $('fdMo').classList.toggle('on'); $('fdMore').textContent = on ? 'Ít tuỳ chọn ⌃' : 'Thêm tuỳ chọn ⌄'; };
    $('fdSel').onclick = () => { d.root.style.display = 'none'; const done = () => { d.root.style.display = ''; selSet = [...selEnts]; $('fdW').value = selSet.length ? 'sel' : 'all'; $('fdSN').textContent = selSet.length ? selSet.length + ' đối tượng đã chọn' : ''; search(); };
      log('Chọn đối tượng rồi Enter (hoặc bấm chuột phải) để quay lại Tìm và thay thế.'); const k = e => { if(e.key === 'Enter' || e.key === 'Escape'){ window.removeEventListener('keydown', k, true); document.removeEventListener('contextmenu', c2, true); done(); } };
      const c2 = e => { e.preventDefault(); window.removeEventListener('keydown', k, true); document.removeEventListener('contextmenu', c2, true); done(); }; window.addEventListener('keydown', k, true); document.addEventListener('contextmenu', c2, true); };
    root.addEventListener('input', e => { if(e.target.id === 'fdF') search(); });
    root.addEventListener('change', e => { if(e.target.type === 'checkbox' || e.target.id === 'fdW') search(); });
    root.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); $('fdNext').click(); } });
    $('fdSN').textContent = selSet.length ? selSet.length + ' đối tượng đã chọn' : '';
    setTimeout(() => { try{ $('fdF').focus(); $('fdF').select(); }catch(_){} }, 30);
    search();
  }
  A.openFind = openFind;
  plain(['FIND', 'FINDREPLACE', 'REPLACE', 'THAYCHU'], 'Tìm và thay thế (Find and Replace): chữ, thuộc tính khối, kích thước, bảng', () => openFind());

  /* ==================================================================
     EATTEDIT — Enhanced Attribute Editor (như AutoCAD: Attribute · Text Options · Properties)
     ================================================================== */
  const css5 = document.createElement('style');
  css5.textContent = `
  .ea-hd{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;align-items:center;margin-bottom:8px}
  .ea-hd b{font-weight:600}
  .acw .acw-btn svg{width:16px;height:16px;vertical-align:-3px;flex:0 0 auto}
  .acw .acw-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px}
  .gt-grid{display:grid;grid-template-columns:44px repeat(2,minmax(0,1fr)) repeat(3,minmax(0,.62fr));gap:4px 8px;align-items:center}
  .gt-grid .h{color:#b4bdca;text-align:center;font-size:11.5px}
  .gt-c{display:flex;gap:3px;align-items:center}
  .gt-c input{flex:1 1 auto;width:0;min-width:0;height:22px;box-sizing:border-box}
  .gt-b{width:24px;height:22px;flex:0 0 24px;padding:0;border:1px solid #5a6578;background:#11151b;color:#fff;font:15px "Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans",sans-serif;cursor:pointer;border-radius:1px;line-height:1}
  .gt-b.sym{width:40px;height:30px;flex:0 0 40px;font-size:19px}
  .gt-pick{display:grid;grid-template-columns:repeat(5,44px);gap:4px;padding:6px;background:#2b313b;border:1px solid #5a6578;position:fixed;z-index:200;box-shadow:0 6px 20px rgba(0,0,0,.45)}
  .gt-pick button{height:40px;border:1px solid #5a6578;background:#11151b;color:#fff;font:21px "Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans",sans-serif;cursor:pointer}
  .gt-pick button:hover{border-color:#0696d7}
  .dp-grid{display:grid;grid-template-columns:150px 1fr;gap:4px 10px;align-items:center}
  .dp-grid span{color:#dfe5ee}
  .dp-grid textarea{height:70px;resize:vertical}
  .dp-info{display:grid;grid-template-columns:150px 1fr;gap:5px 10px;color:#dfe5ee}
  .dp-info span:nth-child(odd){color:#b4bdca}
  `;
  document.head.appendChild(css5);
  function eattedit(ent){
    const gid = ent && ent.grp; let list = gid ? modelEntities.filter(e => e.grp === gid && e.att && !e.acon) : [];   // thuộc tính hằng số (Constant) không sửa được, như AutoCAD
    if(!list.length){ log('Khối này không có thuộc tính.'); return false; }
    const name = (ent.bm && ent.bm.name) || String(ent.blk || '').replace(/^\*/, '');
    const W0 = new Map(list.map(e => [e, JSON.parse(JSON.stringify(e))])); let cur = list[0], dirty = false;
    const TSN = A.TS ? Object.keys(A.TS.list) : ['Standard'];
    const JS = [['left|alphabetic', 'Trái'], ['center|alphabetic', 'Giữa'], ['right|alphabetic', 'Phải'], ['center|middle', 'Chính giữa'], ['left|top', 'Trên trái'], ['center|top', 'Trên giữa'], ['right|top', 'Trên phải'], ['left|middle', 'Giữa trái'], ['right|middle', 'Giữa phải'], ['left|bottom', 'Dưới trái'], ['center|bottom', 'Dưới giữa'], ['right|bottom', 'Dưới phải']];
    const html = '<div class="acw" style="width:520px"><div class="ea-hd"><span>Khối:</span><b translate="no">' + esc(name) + '</b><span style="grid-row:span 2">' + K.btn('eaSel', (A.ICONS && A.ICONS.SELECT ? A.ico('SELECT') : '') + '<span>Chọn khối</span>') + '</span><span>Nhãn:</span><b id="eaTag" translate="no"></b></div>' +
      K.tabs('ea', [['att', 'Thuộc tính khối'], ['txt', 'Tuỳ chọn chữ'], ['pr', 'Thuộc tính đối tượng']], 'att') + '<div class="acw-panes" style="min-height:250px">' +
      K.pane('ea', 'att', 'att', '<div class="ls-grid" style="height:170px"><table><thead><tr><th>Nhãn</th><th>Lời nhắc</th><th style="width:100%">Giá trị</th></tr></thead><tbody id="eaB"></tbody></table></div><div class="acw-row" style="margin-top:8px;align-items:flex-start"><span class="l" style="flex:0 0 60px">Giá trị:</span><textarea id="eaV" rows="1" style="flex:1;width:auto;resize:vertical;min-height:22px"></textarea></div>') +
      K.pane('ea', 'txt', 'att', '<div class="acw-cols"><div class="c1">' + K.row('Kiểu chữ:', K.sel('eaTs', TSN.map(n => [n, n]), '')) + K.row('Canh lề:', K.sel('eaJ', JS, '')) + K.row('Cao chữ:', K.num('eaH', 0, { min: 0 })) + K.row('Góc xoay:', K.num('eaR', 0)) + '</div><div class="c1">' +
        K.row('Hệ số rộng:', K.num('eaW', 1, { min: 0.01 })) + K.row('Góc nghiêng:', K.num('eaO', 0)) + K.chk('eaAn', 'Chú thích (Annotative)', 0) + '<br>' + K.chk('eaBk', 'Viết ngược', 0) + '<br>' + K.chk('eaUd', 'Lộn ngược', 0) + '</div></div>') +
      K.pane('ea', 'pr', 'att', K.row('Lớp:', K.sel('eaL', A.layerNames().map(n => [n, n]), '')) + K.row('Kiểu nét:', K.ltSel('eaLt', 'BYLAYER')) + K.row('Màu:', K.colorSel('eaC', 'BYLAYER', { noBlock: 1 })) + K.row('Bề rộng nét:', K.lwSel('eaLw', -1)) + K.row('Kiểu in:', K.sel('eaPs', [['', 'ByLayer']], '', { dis: 1 }), { dis: 1, tip: 'Bản vẽ dùng bảng in theo màu (.ctb) — như AutoCAD' })) +
      '</div></div>';
    const d = A.dialog({ title: 'Sửa thuộc tính khối nâng cao', cls: 'acw-free', help: 'EATTEDIT', html, left: K.btn('eaAp', 'Áp dụng', { dis: 1 }), ok: () => { apply(); } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    const W = () => W0.get(cur);
    const fill = () => { $('eaB').innerHTML = list.map((e, i) => { const w = W0.get(e); return '<tr data-i="' + i + '"' + (e === cur ? ' class="sel"' : '') + '><td translate="no">' + esc(e.att) + '</td><td translate="no">' + esc(e.attp || e.att) + '</td><td translate="no">' + esc(w.text || '') + '</td></tr>'; }).join('');
      const w = W(); $('eaTag').textContent = cur.att; $('eaV').value = w.text || ''; $('eaTs').value = w.style || 'Standard'; $('eaJ').value = (w.ha || 'left') + '|' + (w.va || 'alphabetic'); if(!$('eaJ').value) $('eaJ').value = 'left|alphabetic';
      $('eaH').value = r6(w.h || 2.5); $('eaR').value = r6(w.rot || 0); $('eaW').value = r6(Math.abs(w.xs || 1)); $('eaL').value = w.layer || '0';
      $('eaO').value = r6(w.obl || 0); $('eaBk').checked = (w.xs || 1) < 0; $('eaUd').checked = !!w.ud; $('eaAn').checked = w.anno > 0; $('eaLt').value = w.lt || 'BYLAYER'; $('eaLw').value = w.lw > 0 ? String(w.lw) : '-1';
      const c = w.bl ? 'BYLAYER' : (w.col || 'BYLAYER'), cs = $('eaC'); if(![...cs.options].some(o => o.value === c)){ const op = document.createElement('option'); op.value = c; op.textContent = '■ ' + c; cs.insertBefore(op, cs.lastElementChild); } cs.value = c; };
    const touch = () => { dirty = true; $('eaAp').disabled = false; };
    $('eaB').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if(!tr) return; cur = list[+tr.dataset.i]; fill(); setTimeout(() => { $('eaV').focus(); $('eaV').select(); }, 0); });
    $('eaV').addEventListener('input', () => { W().text = $('eaV').value; const td = $('eaB').querySelector('tr.sel td:last-child'); if(td) td.textContent = $('eaV').value; touch(); });
    $('eaTs').onchange = () => { const w = W(); if(A.tsApply) A.tsApply(w, $('eaTs').value); else w.style = $('eaTs').value; touch(); };
    $('eaJ').onchange = () => { const [ha, va] = $('eaJ').value.split('|'); W().ha = ha; W().va = va; touch(); };
    $('eaH').onchange = () => { const v = num($('eaH').value); if(v > 0){ W().h = v; touch(); } };
    $('eaR').onchange = () => { const v = num($('eaR').value); if(v != null){ W().rot = v; touch(); } };
    $('eaO').onchange = () => { const v = num($('eaO').value) || 0; if(Math.abs(v) > 85){ $('eaO').value = r6(W().obl || 0); return; } if(v) W().obl = v; else delete W().obl; touch(); };
    $('eaBk').onchange = () => { const w = W(), a = Math.abs(w.xs || 1); w.xs = $('eaBk').checked ? -a : a; if(Math.abs(w.xs - 1) < 1e-9) delete w.xs; touch(); };
    $('eaUd').onchange = () => { if($('eaUd').checked) W().ud = 1; else delete W().ud; touch(); };
    $('eaAn').onchange = () => { const w = W(), N = (A.ANNO && A.ANNO.N) || 1; if($('eaAn').checked) w.anno = (w.h || 2.5) / N; else delete w.anno; touch(); };
    $('eaLt').onchange = () => { const v = $('eaLt').value; if(!v || v === 'BYLAYER') delete W().lt; else W().lt = v; touch(); };
    $('eaLw').onchange = () => { const v = +$('eaLw').value; if(v > 0) W().lw = v; else delete W().lw; touch(); };
    $('eaW').onchange = () => { const v = num($('eaW').value); if(v > 0){ const sg = (W().xs || 1) < 0 ? -1 : 1; if(Math.abs(v * sg - 1) > 1e-6) W().xs = v * sg; else delete W().xs; touch(); } };
    $('eaL').onchange = () => { const w = W(); w.layer = $('eaL').value; if(w.bl) w.col = A.layerHex(w.layer); touch(); };
    K.bindColors(root, s => { const w = W(); if(s.value === 'BYLAYER'){ w.bl = 1; w.col = A.layerHex(w.layer || '0'); } else { delete w.bl; w.col = s.value; } touch(); });
    function apply(){ const rep = []; for(const e of list){ const w = W0.get(e); if(JSON.stringify(w) !== JSON.stringify(e)){ const c = JSON.parse(JSON.stringify(w)); delete c.userAdded; rep.push([e, c]); } }
      if(rep.length){ A.commit({ rep }, 'Đã sửa ' + rep.length + ' thuộc tính'); const m = new Map(rep); list = list.map(e => m.get(e) || e); const nW = new Map(); for(const e of list) nW.set(e, JSON.parse(JSON.stringify(e))); W0.clear(); for(const [k, v] of nW) W0.set(k, v); cur = m.get(cur) || cur; }
      dirty = false; $('eaAp').disabled = true; }
    $('eaAp').onclick = () => { apply(); fill(); };
    $('eaSel').onclick = () => { if(dirty) apply(); d.close(); DVDCmd.run('EATTEDIT'); };
    root.querySelector('.acw').addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.id === 'eaV' && !(cur.aml && !e.ctrlKey)){ e.preventDefault(); e.stopPropagation(); const i = list.indexOf(cur); if(i < list.length - 1){ cur = list[i + 1]; fill(); $('eaV').select(); } else root.querySelector('.dvd-ok').click(); } }, true);
    fill(); setTimeout(() => { try{ $('eaV').focus(); $('eaV').select(); }catch(_){} }, 30);
    return true;
  }
  A.eattedit = eattedit;
  DVDCmd.register(['EATTEDIT', 'ATTEDIT', 'ATE'], 'Sửa thuộc tính khối (Enhanced Attribute Editor): giá trị, chữ, lớp, màu', () => A.run('EATTEDIT', async (A2, c) => {
    const pre = ((c && c.pre) || []).find(e => e.grp && modelEntities.some(x => x.grp === e.grp && x.att));
    const r = pre ? { ent: pre } : await A.getEnt('Chọn khối', { filter: e => !!e.grp && modelEntities.some(x => x.grp === e.grp && x.att) }); if(r.ent) setTimeout(() => eattedit(r.ent), 0); }), { engine: true });

  /* ==================================================================
     TOLERANCE — Geometric Tolerance (như AutoCAD: Sym · Tolerance 1/2 · Datum 1/2/3, 2 hàng, Height, Projected Tolerance Zone, Datum Identifier)
     ================================================================== */
  const GSYM = [['⌖', 'Vị trí'], ['◎', 'Đồng tâm / đồng trục'], ['⌯', 'Đối xứng'], ['∥', 'Song song'], ['⊥', 'Vuông góc'], ['∠', 'Nghiêng'], ['⌭', 'Trụ'], ['⏥', 'Phẳng'], ['○', 'Tròn'], ['⏤', 'Thẳng'], ['⌓', 'Biên dạng mặt'], ['⌒', 'Biên dạng đường'], ['↗', 'Đảo hướng kính'], ['⌰', 'Đảo toàn phần']];
  const GMC = [['Ⓜ', 'Lớn nhất (MMC)'], ['Ⓛ', 'Nhỏ nhất (LMC)'], ['Ⓢ', 'Không phụ thuộc kích thước (RFS)']];
  function gtPick(btn, items, cols, cb){
    document.querySelectorAll('.gt-pick').forEach(p => p.remove());
    const pop = document.createElement('div'); pop.className = 'gt-pick'; pop.style.gridTemplateColumns = 'repeat(' + cols + ',44px)';
    pop.innerHTML = items.map(([s, t]) => '<button type="button" data-s="' + esc(s) + '" title="' + esc(t) + '">' + esc(s) + '</button>').join('') + '<button type="button" data-s="" title="Không">&nbsp;</button>';
    document.body.appendChild(pop); const r = btn.getBoundingClientRect(); pop.style.left = Math.min(r.left, innerWidth - pop.offsetWidth - 6) + 'px'; pop.style.top = Math.min(r.bottom + 3, innerHeight - pop.offsetHeight - 6) + 'px';
    const off = e => { if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('pointerdown', off, true); } }; setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    pop.onclick = e => { const b = e.target.closest('[data-s]'); if(!b) return; pop.remove(); document.removeEventListener('pointerdown', off, true); cb(b.dataset.s); };
  }
  function tolDialog(){
    return new Promise(res => {
      const row = r => '<button type="button" class="gt-b sym" data-sym="' + r + '"></button>' +
        [1, 2].map(t => '<div class="gt-c"><button type="button" class="gt-b" data-dia="' + r + t + '" title="Đường kính Ø"></button><input id="gtT' + r + t + '"><button type="button" class="gt-b" data-mc="T' + r + t + '" title="Điều kiện vật liệu"></button></div>').join('') +
        [1, 2, 3].map(t => '<div class="gt-c"><input id="gtD' + r + t + '"><button type="button" class="gt-b" data-mc="D' + r + t + '" title="Điều kiện vật liệu"></button></div>').join('');
      const html = '<div class="acw" style="width:640px"><div class="gt-grid"><span class="h">Ký hiệu</span><span class="h">Dung sai 1</span><span class="h">Dung sai 2</span><span class="h">Chuẩn 1</span><span class="h">Chuẩn 2</span><span class="h">Chuẩn 3</span>' + row(1) + row(2) + '</div>' +
        '<div class="acw-cols" style="margin-top:10px"><div class="c1">' + K.row('Chiều cao:', K.txt('gtH', '')) + K.row('Mã nhận dạng chuẩn:', K.txt('gtId', '')) + '</div><div class="c1"><div class="acw-row"><span class="l">Vùng dung sai chiếu:</span><button type="button" class="gt-b" id="gtP" title="Ⓟ"></button></div></div></div></div>';
      const st = { sym: {}, dia: {}, mc: {}, p: false };
      const d = A.dialog({ title: 'Dung sai hình học', cls: 'acw-free', help: 'TOLERANCE', html, cancel: () => res(null), ok: root => {
        const v = id => K.val(root, id).trim(); const rows = [];
        for(const r of [1, 2]){ const cells = []; if(st.sym[r]) cells.push(st.sym[r]);
          for(const t of [1, 2]){ const x = v('gtT' + r + t); if(x || st.dia[r + '' + t]) cells.push((st.dia[r + '' + t] ? 'Ø' : '') + x + (st.mc['T' + r + t] || '')); }
          for(const t of [1, 2, 3]){ const x = v('gtD' + r + t); if(x) cells.push(x + (st.mc['D' + r + t] || '')); }
          if(cells.length) rows.push(cells); }
        const h = v('gtH'); if(h || st.p) rows.push([h + (st.p ? ' Ⓟ' : '')].map(s => s.trim()));
        const id = v('gtId'); if(id) rows.push(['-' + id + '-']);
        if(!rows.length){ say('Chưa nhập nội dung.'); return false; } res(rows); } });
      const root = d.root;
      root.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => gtPick(b, GSYM, 5, s => { st.sym[b.dataset.sym] = s; b.textContent = s; }));
      root.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { const k = b.dataset.dia; st.dia[k] = !st.dia[k]; b.textContent = st.dia[k] ? 'Ø' : ''; });
      root.querySelectorAll('[data-mc]').forEach(b => b.onclick = () => gtPick(b, GMC, 4, s => { st.mc[b.dataset.mc] = s; b.textContent = s; }));
      root.querySelector('#gtP').onclick = e => { st.p = !st.p; e.currentTarget.textContent = st.p ? 'Ⓟ' : ''; };
    });
  }
  DVDCmd.register(['TOLERANCE', 'TOL'], 'Khung dung sai hình học (Geometric Tolerance, GD&T)', () => A.run('TOLERANCE', async () => {
    const rows = await tolDialog(); if(!rows) return;
    const th = A.dimTxt ? A.dimTxt() : 2.5, H = th * 2;
    const cw = c => Math.max(H, [...c].length * th * 0.82 + th);
    const build = p => { const add = []; let y = p.y;
      for(const cells of rows){ let x = p.x; for(const c of cells){ const w = cw(c); add.push({ type: 'POLYLINE', vertices: [{ x, y }, { x: x + w, y }, { x: x + w, y: y - H }, { x, y: y - H }], closed: true }); add.push({ type: 'TEXT', x: x + w / 2, y: y - H / 2, h: th, rot: 0, text: c, ha: 'center', va: 'middle' }); x += w; } y -= H; }
      return add; };
    const r = await A.getPoint('Nhập vị trí dung sai', { preview: (g, p) => g.ents(build(p)) }); if(!r.pt) return;
    const gid = A.newGroupId('TOL'); const add = build(r.pt).map(e => { A.newProps(e); delete e.lt; e.grp = gid; e.blk = '*TOLERANCE'; return e; });
    A.commit({ add }, 'Khung dung sai');
  }), { engine: true });

  /* ==================================================================
     DWGPROPS — Drawing Properties (như AutoCAD: General · Summary · Statistics · Custom)
     ================================================================== */
  function openDwgProps(){
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const dn = (() => { try{ return currentName || ''; }catch(_){ return ''; } })(), PK = 'dvd:props::' + dn, TK = 'dvd:time::' + dn;
    const P = (() => { try{ return JSON.parse(localStorage.getItem(PK) || '{}'); }catch(_){ return {}; } })(), T = (() => { try{ return JSON.parse(localStorage.getItem(TK) || 'null') || {}; }catch(_){ return {}; } })();
    const dt = ms => ms ? new Date(ms).toLocaleString() : '—', dur = ms => { const m = Math.round((ms || 0) / 60000); return Math.floor(m / 60) + ' giờ ' + (m % 60) + ' phút'; };
    const by = {}; for(const e of modelEntities) by[e.type] = (by[e.type] || 0) + 1;
    const ext = dn.split('.').pop().toUpperCase(), cus = Object.assign({}, P.custom || {});
    const info = rows => '<div class="dp-info">' + rows.map(([k, v]) => '<span>' + k + '</span><span translate="no">' + esc(v) + '</span>').join('') + '</div>';
    const txt = (k, l) => '<span>' + l + '</span><input data-k="' + k + '" value="' + esc(P[k] || '') + '">';
    const html = '<div class="acw" style="width:480px">' + K.tabs('dp', [['gen', 'Tổng quát'], ['sum', 'Tóm tắt'], ['sta', 'Thống kê'], ['cus', 'Tuỳ chỉnh']], 'sum') + '<div class="acw-panes" style="min-height:330px">' +
      K.pane('dp', 'gen', 'sum', info([['Tên file:', dn || '—'], ['Loại:', (ext === 'DWG' ? 'Bản vẽ AutoCAD' : ext === 'DXF' ? 'AutoCAD DXF' : ext) + ' (.' + ext.toLowerCase() + ')'], ['Vị trí:', (A.desktopPath && A.desktopPath()) || 'Bộ nhớ của ứng dụng'], ['Số đối tượng:', String(modelEntities.length)], ['Số lớp:', String(A.layerNames().length)], ['Tạo:', dt(T.created)], ['Sửa:', dt(T.edited)], ['Mở:', dt(T.opened)]])) +
      K.pane('dp', 'sum', 'sum', '<div class="dp-grid">' + txt('title', 'Tiêu đề:') + txt('subject', 'Chủ đề:') + txt('author', 'Tác giả:') + txt('checker', 'Người kiểm:') + txt('keywords', 'Từ khoá:') + '<span>Ghi chú:</span><textarea data-k="comments">' + esc(P.comments || '') + '</textarea>' + txt('hyperlink', 'Đường dẫn gốc siêu liên kết:') + '</div>') +
      K.pane('dp', 'sta', 'sum', info([['Tạo:', dt(T.created)], ['Sửa:', dt(T.edited)], ['Người sửa cuối:', P.author || '—'], ['Số lần sửa đổi:', String(P.rev || '—')], ['Tổng thời gian sửa:', dur(T.total)]]) + '<div class="acw-lab" style="margin-top:10px">Đối tượng theo loại</div>' + info(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, String(v)]))) +
      K.pane('dp', 'cus', 'sum', '<div class="acw-cols"><div class="c1"><div class="ls-grid" style="height:280px"><table><thead><tr><th>Tên</th><th style="width:100%">Giá trị</th></tr></thead><tbody id="dpC"></tbody></table></div></div><div class="c2 acw-btncol">' + K.btn('dpAdd', 'Thêm…') + K.btn('dpDel', 'Xoá') + '</div></div>') + '</div></div>';
    let csel = null;
    const d = A.dialog({ title: 'Thuộc tính bản vẽ: ' + dn, cls: 'acw-free', help: 'DWGPROPS', html, ok: root => { const o = Object.assign({}, P); root.querySelectorAll('[data-k]').forEach(i => o[i.dataset.k] = i.value); o.custom = cus;
      try{ localStorage.setItem(PK, JSON.stringify(o)); }catch(_){} try{ A.updateFields && A.updateFields(true); }catch(_){} log('Đã lưu thuộc tính bản vẽ.'); } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    const fillC = () => { const k = Object.keys(cus); $('dpC').innerHTML = k.length ? k.map(n => '<tr data-n="' + esc(n) + '"' + (n === csel ? ' class="sel"' : '') + '><td translate="no">' + esc(n) + '</td><td><input data-c="' + esc(n) + '" value="' + esc(cus[n]) + '" style="width:100%;box-sizing:border-box"></td></tr>').join('') : '<tr><td colspan="2" style="color:#9aa6ba">Chưa có thuộc tính tuỳ chỉnh.</td></tr>'; $('dpDel').disabled = !csel; };
    $('dpC').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(tr){ csel = tr.dataset.n; root.querySelectorAll('#dpC tr').forEach(x => x.classList.toggle('sel', x === tr)); $('dpDel').disabled = false; } });
    $('dpC').addEventListener('input', e => { const i = e.target.closest('input[data-c]'); if(i) cus[i.dataset.c] = i.value; });
    $('dpAdd').onclick = () => A.dialog({ title: 'Thêm thuộc tính tuỳ chỉnh', cls: 'acw-free', help: 'DWGPROPS', html: '<div class="acw" style="width:340px">' + K.vrow('Tên thuộc tính:', K.txt('daN', '')) + K.vrow('Giá trị:', K.txt('daV', '')) + '</div>',
      ok: r => { const n = K.val(r, 'daN').trim(); if(!n){ say('Nhập tên.'); return false; } if(n in cus){ say('Đã có thuộc tính "' + n + '".'); return false; } cus[n] = K.val(r, 'daV'); csel = n; fillC(); } });
    $('dpDel').onclick = () => { if(csel){ delete cus[csel]; csel = null; fillC(); } };
    fillC();
  }
  A.openDwgProps = openDwgProps;
  plain(['DWGPROPS', 'THONGTIN'], 'Thuộc tính bản vẽ (Drawing Properties): tiêu đề, tác giả, từ khoá, ghi chú, thống kê, thuộc tính tuỳ chỉnh', () => openDwgProps());

  /* ==================================================================
     MLEADERSTYLE — Multileader Style Manager + Modify Multileader Style (Leader Format · Leader Structure · Content)
     ================================================================== */
  const MLK = 'dvd:mlslib';
  const MLF = ['arrow', 'asz', 'land', 'th', 'frame'];
  const mlVals = o => { const v = {}; for(const k of MLF) v[k] = o[k]; return v; };
  const mlsLib = () => { let o = null; try{ o = JSON.parse(localStorage.getItem(MLK) || 'null'); }catch(_){} if(!o || typeof o !== 'object') o = {}; const M = A.MLS || {}; const cur = M.name || 'Standard'; if(!o[cur]) o[cur] = mlVals(M); if(!o.Standard) o.Standard = { arrow: 'closed', asz: 0, land: 1.2, th: 0, frame: false }; return o; };
  const mlsSaveLib = o => { try{ localStorage.setItem(MLK, JSON.stringify(o)); }catch(_){} };
  const mlsSaveCur = () => { try{ localStorage.setItem('dvd:mls', JSON.stringify(A.MLS)); }catch(_){} };
  const mlsSetCur = (n, lib) => { lib = lib || mlsLib(); if(!lib[n] || !A.MLS) return false; Object.assign(A.MLS, lib[n], { name: n }); mlsSaveCur(); return true; };
  A.mlsLib = mlsLib;
  A.mlsDelete = n => { const lib = mlsLib(); if(n === 'Standard' || n === ((A.MLS && A.MLS.name) || 'Standard') || !lib[n]) return false; delete lib[n]; mlsSaveLib(lib); return true; };
  A.mlsRename = (o, n) => { const lib = mlsLib(); if(!lib[o]) return 'Không thấy kiểu.'; if(lib[n]) return 'Tên đã có.'; if(o === 'Standard') return 'Không đổi tên được kiểu Standard.'; lib[n] = lib[o]; delete lib[o]; mlsSaveLib(lib); if(A.MLS && A.MLS.name === o){ A.MLS.name = n; mlsSaveCur(); } return ''; };
  const ARW = [['closed', 'Tam giác đặc (Closed filled)'], ['open', 'Mở (Open)'], ['dot', 'Chấm (Dot)'], ['tick', 'Gạch chéo (Oblique)'], ['none', 'Không (None)']];
  function mlPreview(cnv, v){ if(!cnv || !A.leaderEnts || !A.MLS) return; const save = Object.assign({}, A.MLS); Object.assign(A.MLS, v); let ents = [];
    try{ const h = v.th > 0 ? v.th : 2.5; ents = A.leaderEnts([{ x: 0, y: 0 }, { x: h * 4, y: h * 3 }], window.DVDI18N && DVDI18N.lang === 'en' ? 'Default Text' : 'Chữ mặc định', h).map(e => Object.assign({ col: '#e8eef7' }, e)); }catch(_){} Object.assign(A.MLS, save); K.paint(cnv, ents, { pad: 14 }); }
  function editMls(title, v0, onOk){
    const v = Object.assign({}, v0);
    const html = '<div class="acw acw-dimdlg" style="width:min(720px,97vw)">' + K.tabs('ml', [['fmt', 'Định dạng đường dẫn'], ['str', 'Cấu trúc đường dẫn'], ['cnt', 'Nội dung']], 'fmt') + '<div class="acw-cols" style="margin-top:0"><div class="c1"><div class="acw-panes" style="min-height:330px">' +
      K.pane('ml', 'fmt', 'fmt', K.grp('Chung', K.row('Kiểu:', K.sel('mlTy', [['str', 'Thẳng'], ['spl', 'Cong (Spline)'], ['none', 'Không']], 'str', { dis: 1 }), { dis: 1 }) + K.row('Màu:', K.colorSel('mlCl', 'BYLAYER'), { dis: 1 }) + K.row('Kiểu nét:', K.sel('mlLt', [['BYLAYER', 'ByLayer']], 'BYLAYER', { dis: 1 }), { dis: 1 }) + K.row('Bề rộng nét:', K.sel('mlLw', [['-1', 'ByLayer']], '-1', { dis: 1 }), { dis: 1 })) +
        K.grp('Mũi tên', K.row('Ký hiệu:', K.sel('mlA', ARW, v.arrow)) + K.row('Cỡ (0 = theo kiểu kích thước):', K.num('mlS', r6(v.asz || 0), { min: 0 }))) + K.grp('Ngắt đường dẫn', K.row('Cỡ chỗ ngắt:', K.num('mlBr', 3.75, { dis: 1 }), { dis: 1 }))) +
      K.pane('ml', 'str', 'fmt', K.grp('Ràng buộc', K.chk('mlMx', 'Số điểm tối đa của đường dẫn', 1, { dis: 1 }) + '<br>' + K.chk('mlA1', 'Góc đoạn thứ nhất', 0, { dis: 1 }) + '<br>' + K.chk('mlA2', 'Góc đoạn thứ hai', 0, { dis: 1 })) +
        K.grp('Cài đặt gờ (landing)', K.chk('mlAl', 'Tự động có gờ', 1, { dis: 1 }) + K.row('Đặt độ dài gờ (× cao chữ):', K.num('mlL', r6(v.land || 1.2), { min: 0 }))) + K.grp('Tỉ lệ', K.chk('mlAn', 'Chú thích (Annotative)', 0, { dis: 1 }) + '<br>' + K.rad('mlSc', 'lay', 'Theo tỉ lệ layout', 0, { dis: 1 }) + '<br>' + K.rad('mlSc', 'sp', 'Tỉ lệ chỉ định', 1, { dis: 1 }))) +
      K.pane('ml', 'cnt', 'fmt', K.row('Loại ghi chú dẫn:', K.sel('mlCt', [['mt', 'Chữ nhiều dòng (Mtext)'], ['blk', 'Khối'], ['none', 'Không']], 'mt', { dis: 1 }), { dis: 1 }) +
        K.grp('Tuỳ chọn chữ', K.row('Kiểu chữ:', K.sel('mlTs', (A.TS ? Object.keys(A.TS.list) : ['Standard']).map(n => [n, n]), A.TS ? A.TS.cur : 'Standard', { dis: 1 }), { dis: 1 }) + K.row('Cao chữ (0 = theo kiểu kích thước):', K.num('mlT', r6(v.th || 0), { min: 0 })) + K.chk('mlF', 'Khung quanh chữ', v.frame) + '<br>' + K.chk('mlLj', 'Luôn canh trái', 0, { dis: 1 })) +
        K.grp('Nối đường dẫn', K.rad('mlCn', 'h', 'Nối ngang', 1, { dis: 1 }) + ' ' + K.rad('mlCn', 'v', 'Nối dọc', 0, { dis: 1 }))) +
      '</div></div><div class="c2" style="padding-top:8px">' + K.canvas('mlPv', 220, 200) + '</div></div></div>';
    const d = A.dialog({ title, cls: 'acw-free', help: 'MLEADERSTYLE', html, ok: () => { read(); onOk(v); } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    const read = () => { v.arrow = $('mlA').value; v.asz = Math.max(0, num($('mlS').value) || 0); v.land = num($('mlL').value) > 0 ? num($('mlL').value) : 1.2; v.th = Math.max(0, num($('mlT').value) || 0); v.frame = $('mlF').checked; };
    root.addEventListener('input', () => { read(); mlPreview($('mlPv'), v); }); root.addEventListener('change', () => { read(); mlPreview($('mlPv'), v); });
    mlPreview($('mlPv'), v);
  }
  function openMlsManager(){
    let lib = mlsLib(), sel = (A.MLS && A.MLS.name) || 'Standard', filter = 'all';
    const html = '<div class="acw" style="width:600px"><div class="acw-lab">Kiểu ghi chú dẫn hiện hành: <b id="mmCur" translate="no"></b></div><div class="acw-cols"><div class="c1" style="flex:0 0 190px"><div class="acw-lab">Kiểu:</div><div class="acw-list" id="mmL" style="height:250px" tabindex="0"></div>' +
      K.vrow('Liệt kê:', K.sel('mmF', [['all', 'Tất cả kiểu'], ['use', 'Kiểu đang dùng']], 'all')) + '</div><div class="c1"><div class="acw-lab">Xem trước: <span id="mmPn" translate="no"></span></div>' + K.canvas('mmPv', 240, 250) + '</div>' +
      '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('mmSet', 'Đặt hiện hành') + K.btn('mmNew', 'Mới…') + K.btn('mmMod', 'Sửa…') + K.btn('mmDel', 'Xoá') + '</div></div></div>';
    const d = A.dialog({ title: 'Quản lý kiểu ghi chú dẫn', cls: 'acw-free', help: 'MLEADERSTYLE', html, noOk: true, cancelText: 'Đóng' });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { lib = mlsLib(); const curN = (A.MLS && A.MLS.name) || 'Standard'; if(!lib[sel]) sel = curN; const names = Object.keys(lib).sort((a, b) => a === 'Standard' ? -1 : b === 'Standard' ? 1 : a.localeCompare(b)).filter(n => filter === 'all' || n === curN);
      $('mmL').innerHTML = names.map(n => '<div class="it' + (n === sel ? ' on' : '') + '" data-v="' + esc(n) + '" translate="no">' + (n === curN ? '▸ ' : '') + esc(n) + '</div>').join(''); $('mmCur').textContent = curN; $('mmPn').textContent = sel;
      $('mmDel').disabled = sel === 'Standard' || sel === curN; mlPreview($('mmPv'), lib[sel]); };
    $('mmL').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; sel = it.dataset.v; render(); });
    $('mmL').addEventListener('dblclick', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; sel = it.dataset.v; $('mmSet').click(); });
    $('mmF').onchange = () => { filter = $('mmF').value; render(); };
    $('mmSet').onclick = () => { if(mlsSetCur(sel, lib)){ log('Kiểu ghi chú dẫn hiện hành: ' + sel); render(); } };
    $('mmNew').onclick = () => { let i = 1; while(lib['Kiểu ' + i]) i++;
      A.dialog({ title: 'Tạo kiểu ghi chú dẫn mới', cls: 'acw-free', help: 'MLEADERSTYLE', html: '<div class="acw" style="width:340px">' + K.vrow('Tên kiểu mới:', K.txt('mnN', 'Kiểu ' + i)) + K.vrow('Bắt đầu từ:', K.sel('mnF', Object.keys(lib).map(n => [n, n]), sel)) + K.chk('mnAn', 'Chú thích (Annotative)', 0, { dis: 1 }) + '</div>', okText: 'Tiếp tục',
        ok: r => { const n = K.val(r, 'mnN').trim(); if(!n){ say('Nhập tên.'); return false; } if(lib[n]){ say('Đã có kiểu "' + n + '".'); return false; } const base = lib[K.val(r, 'mnF')] || lib.Standard;
          setTimeout(() => editMls('Sửa kiểu ghi chú dẫn: ' + n, base, v => { lib = mlsLib(); lib[n] = mlVals(v); mlsSaveLib(lib); sel = n; render(); }), 0); } }); };
    $('mmMod').onclick = () => { const n = sel; editMls('Sửa kiểu ghi chú dẫn: ' + n, lib[n], v => { lib = mlsLib(); lib[n] = mlVals(v); mlsSaveLib(lib); if(n === ((A.MLS && A.MLS.name) || 'Standard')) mlsSetCur(n, lib); render(); }); };
    $('mmDel').onclick = () => { if(A.mlsDelete(sel)){ sel = (A.MLS && A.MLS.name) || 'Standard'; render(); } };
    render();
  }
  A.openMlsManager = openMlsManager;
  plain(['MLEADERSTYLE', 'MLS'], 'Quản lý kiểu ghi chú dẫn (Multileader Style Manager): mũi tên, gờ, cao chữ, khung chữ', () => openMlsManager());

  /* ==================================================================
     MLSTYLE — Multiline Style (như AutoCAD: danh sách kiểu · mô tả · xem trước; New / Modify: Caps, Fill, Elements; Load / Save file .mln)
     ================================================================== */
  const MNK = 'dvd:mlstylelib';
  const MNF = ['capS', 'capE', 'arcS', 'arcE', 'inrS', 'inrE', 'joints'];
  const mnVals = o => { const v = { offs: (o.offs || [0.5, -0.5]).slice(), caps: o.caps !== false, capS: o.capS != null ? !!o.capS : o.caps !== false, capE: o.capE != null ? !!o.capE : o.caps !== false, desc: o.desc || '' };
    for(const k of ['arcS', 'arcE', 'inrS', 'inrE', 'joints']) v[k] = !!o[k]; v.angS = +o.angS > 0 && +o.angS < 180 ? +o.angS : 90; v.angE = +o.angE > 0 && +o.angE < 180 ? +o.angE : 90; v.fill = o.fill || '';
    v.ecol = v.offs.map((_, i) => (o.ecol && o.ecol[i]) || 'BYLAYER'); v.elt = v.offs.map((_, i) => (o.elt && o.elt[i]) || 'BYLAYER'); return v; };
  const mnLib = () => { let o = null; try{ o = JSON.parse(localStorage.getItem(MNK) || 'null'); }catch(_){} if(!o || typeof o !== 'object') o = {}; const M = A.MLINESTYLE || { name: 'STANDARD' }; if(!o[M.name]) o[M.name] = mnVals(M); if(!o.STANDARD) o.STANDARD = mnVals({ offs: [0.5, -0.5], caps: true }); return o; };
  const mnSave = o => { try{ localStorage.setItem(MNK, JSON.stringify(o)); }catch(_){} };
  const mnSetCur = (n, lib) => { const M = A.MLINESTYLE; if(!M || !lib[n]) return false; const v = mnVals(lib[n]); for(const k of Object.keys(M)) if(k !== 'name') delete M[k]; Object.assign(M, v, { name: n, caps: v.capS || v.capE }); try{ localStorage.setItem('dvd:mlstyle', JSON.stringify(M)); }catch(_){} return true; };
  function mnPreview(cnv, v){ if(!cnv) return; const L = 6; let ents = [];
    try{ ents = A.mlineEnts ? A.mlineEnts([{ x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: L * 0.55 }], false, 1, 'Z', mnVals(v)) : []; }catch(_){}
    ents = ents.map(e => { const c = Object.assign({}, e); c.col = e._col && e._col !== 'BYLAYER' ? e._col : '#e8eef7'; if(c.type === 'HATCH') c.col = e._col || '#5a6578'; delete c._col; return c; });
    K.paint(cnv, ents, { pad: 18 }); }
  // ---- file .mln (định dạng AutoCAD: MLSTYLE, mã nhóm 2 / 70 / 3 / 62 / 51 / 52 / 71 rồi từng thành phần 49 / 62 / 6) ----
  const mlnFlags = v => (v.fill ? 1 : 0) | (v.joints ? 2 : 0) | (v.capS ? 16 : 0) | (v.inrS ? 32 : 0) | (v.arcS ? 64 : 0) | (v.capE ? 256 : 0) | (v.inrE ? 512 : 0) | (v.arcE ? 1024 : 0);
  const aciOf = c => !c || c === 'BYLAYER' ? 256 : c === 'BYBLOCK' ? 0 : (aciExact(c) || (A.aciNear ? A.aciNear(c) : 7));
  const colOfAci = n => n === 256 || isNaN(n) ? 'BYLAYER' : n === 0 ? 'BYBLOCK' : aciHex(n);
  function mlnWrite(styles){ const L = []; const G = (c, v) => { L.push(String(c).padStart(3, ' ')); L.push(String(v)); };
    for(const [name, v0] of styles){ const v = mnVals(v0); L.push('MLSTYLE'); G(2, name); G(70, mlnFlags(v)); G(3, v.desc || ''); G(62, v.fill ? aciOf(v.fill) : 256); G(51, (+v.angS).toFixed(1)); G(52, (+v.angE).toFixed(1)); G(71, v.offs.length);
      v.offs.forEach((o, i) => { G(49, String(o)); G(62, aciOf(v.ecol[i])); G(6, v.elt[i] || 'BYLAYER'); }); }
    return L.join('\r\n') + '\r\n'; }
  function mlnParse(text){ const L = String(text || '').replace(/\r/g, '').split('\n'); const out = []; let i = 0;
    while(i < L.length){ if(L[i].trim().toUpperCase() !== 'MLSTYLE'){ i++; continue; } i++; const st = { offs: [], ecol: [], elt: [] }; let fl = 0, el = -1, fillAci = 256;
      while(i + 1 < L.length && L[i].trim().toUpperCase() !== 'MLSTYLE'){ const c = parseInt(L[i], 10), v = L[i + 1].trim(); if(!isFinite(c)){ i++; continue; } i += 2;
        if(c === 2) st.name = v.toUpperCase(); else if(c === 70) fl = parseInt(v, 10) || 0; else if(c === 3) st.desc = v; else if(c === 51) st.angS = parseFloat(v); else if(c === 52) st.angE = parseFloat(v);
        else if(c === 62){ const n = parseInt(v, 10); if(el < 0) fillAci = n; else st.ecol[el] = colOfAci(n); } else if(c === 49){ st.offs.push(parseFloat(v) || 0); el = st.offs.length - 1; } else if(c === 6 && el >= 0) st.elt[el] = String(v).toUpperCase() === 'BYLAYER' ? 'BYLAYER' : v.toUpperCase(); }
      if(!st.name || !st.offs.length) continue;
      Object.assign(st, { fill: fl & 1 ? colOfAci(fillAci) : '', joints: !!(fl & 2), capS: !!(fl & 16), inrS: !!(fl & 32), arcS: !!(fl & 64), capE: !!(fl & 256), inrE: !!(fl & 512), arcE: !!(fl & 1024) });
      out.push(st); }
    return out; }
  A.mln = { parse: mlnParse, write: mlnWrite };
  function editMln(title, v0, onOk){
    const v = mnVals(v0); let es = 0;
    const capRow = (lab, k) => '<tr><td>' + lab + '</td><td><input type="checkbox" id="me' + k + 'S"' + (v[k + 'S'] ? ' checked' : '') + '></td><td><input type="checkbox" id="me' + k + 'E"' + (v[k + 'E'] ? ' checked' : '') + '></td></tr>';
    const html = '<div class="acw" style="width:660px"><div class="acw-row"><span style="flex:0 0 90px">Mô tả:</span><input id="meD" value="' + esc(v.desc) + '" style="flex:1;width:auto"></div><div class="acw-cols"><div class="c1" style="flex:1 1 50%">' +
      K.grp('Nắp', '<table class="acw-cmp" style="width:auto"><tr><th></th><th>Đầu</th><th>Cuối</th></tr>' + capRow('Đoạn thẳng:', 'cap') + capRow('Cung ngoài:', 'arc') + capRow('Cung trong:', 'inr') +
        '<tr><td>Góc:</td><td><input id="meAS" value="' + r6(v.angS) + '" style="width:54px"></td><td><input id="meAE" value="' + r6(v.angE) + '" style="width:54px"></td></tr></table>') +
      K.grp('Tô màu', K.row('Màu tô:', K.colorSel('meF', v.fill || '', { noBlock: 1 }).replace('<option value="BYLAYER"', '<option value="">■ Không</option><option value="BYLAYER"'))) + K.chk('meJ', 'Hiện mối nối', v.joints) + '</div>' +
      '<div class="c1" style="flex:1 1 50%">' + K.grp('Thành phần', '<div class="ls-grid" style="height:120px"><table><thead><tr><th>Khoảng lệch</th><th>Màu</th><th style="width:100%">Kiểu nét</th></tr></thead><tbody id="meB"></tbody></table></div>' +
        '<div class="acw-row" style="margin-top:6px">' + K.btn('meAdd', 'Thêm') + K.btn('meDel', 'Xoá') + '</div>' + K.row('Khoảng lệch:', K.num('meO', 0)) + K.row('Màu:', K.colorSel('meC', 'BYLAYER', { noBlock: 1 })) + K.row('Kiểu nét:', K.ltSel('meLt', 'BYLAYER'))) +
      K.canvas('mePv', 300, 120) + '</div></div></div>';
    const d = A.dialog({ title, cls: 'acw-free', help: 'MLSTYLE', html, ok: r => { if(!v.offs.length){ say('Cần ít nhất 1 thành phần.'); return false; } read(); v.caps = v.capS || v.capE; onOk(v); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const cname = c => c === 'BYLAYER' ? 'BYLAYER' : c === 'BYBLOCK' ? 'BYBLOCK' : (aciExact(c) ? String(aciExact(c)) : c);
    const read = () => { v.desc = $('meD').value; for(const k of ['cap', 'arc', 'inr']){ v[k + 'S'] = $('me' + k + 'S').checked; v[k + 'E'] = $('me' + k + 'E').checked; }
      const a = num($('meAS').value), b = num($('meAE').value); v.angS = a > 0 && a < 180 ? a : 90; v.angE = b > 0 && b < 180 ? b : 90; v.joints = $('meJ').checked; v.fill = $('meF').value; };
    const setSel = (s, c) => { if(![...s.options].some(o => o.value === c)){ const op = document.createElement('option'); op.value = c; op.textContent = '■ ' + c; s.insertBefore(op, s.lastElementChild); } s.value = c; };
    const fill = () => { const ord = v.offs.map((o, i) => i).sort((a, b) => v.offs[b] - v.offs[a]); $('meB').innerHTML = ord.map(i => '<tr data-i="' + i + '"' + (i === es ? ' class="sel"' : '') + '><td>' + r6(v.offs[i]) + '</td><td>' + esc(cname(v.ecol[i])) + '</td><td>' + esc(v.elt[i] === 'BYLAYER' ? 'ByLayer' : v.elt[i]) + '</td></tr>').join('');
      $('meO').value = v.offs[es] != null ? r6(v.offs[es]) : ''; setSel($('meC'), v.ecol[es] || 'BYLAYER'); setSel($('meLt'), v.elt[es] || 'BYLAYER'); $('meDel').disabled = v.offs.length < 2; read(); mnPreview($('mePv'), v); };
    $('meB').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if(tr){ es = +tr.dataset.i; fill(); } });
    $('meO').addEventListener('change', () => { const n = num($('meO').value); if(n != null && v.offs[es] != null){ v.offs[es] = n; fill(); } });
    $('meLt').addEventListener('change', () => { v.elt[es] = $('meLt').value || 'BYLAYER'; fill(); });
    K.bindColors(root, s => { if(s.id === 'meC'){ v.ecol[es] = s.value || 'BYLAYER'; fill(); } else { read(); mnPreview($('mePv'), v); } });
    $('meAdd').onclick = () => { v.offs.push(0); v.ecol.push('BYLAYER'); v.elt.push('BYLAYER'); es = v.offs.length - 1; fill(); setTimeout(() => { $('meO').focus(); $('meO').select(); }, 0); };
    $('meDel').onclick = () => { if(v.offs.length < 2) return; v.offs.splice(es, 1); v.ecol.splice(es, 1); v.elt.splice(es, 1); es = 0; fill(); };
    root.querySelector('.acw').addEventListener('change', e => { if(e.target.matches('input[type=checkbox],#meAS,#meAE')){ read(); mnPreview($('mePv'), v); } });
    fill();
  }
  // Load Multiline Styles: chọn file .mln, danh sách kiểu trong file
  function mlnLoad(onDone){
    let styles = [], fileName = '';
    const html = '<div class="acw" style="width:380px"><div class="acw-row">' + K.btn('mlF', 'File…') + '<span id="mlFn" class="acw-note" style="margin:0" translate="no">(chưa chọn file)</span></div><div class="acw-list" id="mlL" style="height:200px" tabindex="0"></div><div class="acw-note" id="mlNt"></div></div>';
    const d = A.dialog({ title: 'Tải kiểu đường đôi', cls: 'acw-free', help: 'MLSTYLE', html, ok: () => { const it = d.root.querySelector('#mlL .it.on'); if(!it){ say('Chọn kiểu cần tải.'); return false; } const st = styles[+it.dataset.v]; const lib = mnLib();
      if(lib[st.name]){ say('Đã có kiểu "' + st.name + '" — đổi tên kiểu cũ trước khi tải.'); return false; } lib[st.name] = mnVals(st); mnSave(lib); log('Đã tải kiểu đường đôi "' + st.name + '" từ ' + fileName); onDone(st.name); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    K.bindList($('mlL'), () => {});
    $('mlL').addEventListener('dblclick', () => root.querySelector('.dvd-ok').click());
    $('mlF').onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.mln,text/plain'; f.onchange = () => { const file = f.files && f.files[0]; if(!file) return; const rd = new FileReader();
      rd.onload = () => { styles = mlnParse(rd.result); fileName = file.name; $('mlFn').textContent = file.name; $('mlL').innerHTML = styles.map((s, i) => '<div class="it' + (i ? '' : ' on') + '" data-v="' + i + '" translate="no">' + esc(s.name) + '</div>').join(''); $('mlNt').textContent = styles.length ? '' : 'File không có kiểu đường đôi nào.'; }; rd.readAsText(file); }; f.click(); };
  }
  function openMlStyle(){
    let lib = mnLib(), sel = (A.MLINESTYLE && A.MLINESTYLE.name) || 'STANDARD';
    const html = '<div class="acw" style="width:560px"><div class="acw-lab">Kiểu đường đôi hiện hành: <b id="mnCur" translate="no"></b></div><div class="acw-cols"><div class="c1"><div class="acw-lab">Kiểu:</div><div class="acw-list" id="mnL" style="height:170px" tabindex="0"></div>' +
      '<div class="acw-lab" style="margin-top:8px">Mô tả:</div><input id="mnD" readonly style="width:100%;box-sizing:border-box"><div class="acw-lab" style="margin-top:8px">Xem trước: <span id="mnPn" translate="no"></span></div>' + K.canvas('mnPv', 400, 110) + '</div>' +
      '<div class="c2 acw-btncol" style="padding-top:16px">' + K.btn('mnSet', 'Đặt hiện hành') + K.btn('mnNew', 'Mới…') + K.btn('mnMod', 'Sửa…') + K.btn('mnRen', 'Đổi tên') + K.btn('mnDel', 'Xoá') + K.btn('mnLoad', 'Tải…') + K.btn('mnSv', 'Lưu…') + '</div></div></div>';
    const d = A.dialog({ title: 'Kiểu đường đôi', cls: 'acw-free', help: 'MLSTYLE', html, ok: () => { mnSetCur(sel, lib); log('Kiểu MLINE hiện hành: ' + sel); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const render = () => { lib = mnLib(); const curN = (A.MLINESTYLE && A.MLINESTYLE.name) || 'STANDARD'; if(!lib[sel]) sel = curN; const names = Object.keys(lib).sort((a, b) => a === 'STANDARD' ? -1 : b === 'STANDARD' ? 1 : a.localeCompare(b));
      $('mnL').innerHTML = names.map(n => '<div class="it' + (n === sel ? ' on' : '') + '" data-v="' + esc(n) + '"><span translate="no">' + esc(n) + '</span>' + (n === curN ? ' (hiện hành)' : '') + '</div>').join('');
      $('mnCur').textContent = curN; $('mnPn').textContent = sel; $('mnD').value = lib[sel].desc || ''; $('mnDel').disabled = $('mnRen').disabled = sel === 'STANDARD' || sel === curN; mnPreview($('mnPv'), mnVals(lib[sel])); };
    $('mnL').addEventListener('click', e => { const it = e.target.closest('.it[data-v]'); if(!it) return; sel = it.dataset.v; render(); });
    $('mnSet').onclick = () => { mnSetCur(sel, lib); render(); };
    $('mnNew').onclick = () => A.dialog({ title: 'Tạo kiểu đường đôi mới', cls: 'acw-free', help: 'MLSTYLE', html: '<div class="acw" style="width:340px">' + K.vrow('Tên kiểu mới:', K.txt('mnN', '')) + K.vrow('Bắt đầu từ:', K.sel('mnF', Object.keys(lib).map(n => [n, n]), sel)) + '</div>', okText: 'Tiếp tục',
      ok: r => { const n = K.val(r, 'mnN').trim().toUpperCase().replace(/\s+/g, '_'); if(!n){ say('Nhập tên.'); return false; } if(lib[n]){ say('Đã có kiểu "' + n + '".'); return false; }
        const base = lib[K.val(r, 'mnF')] || lib.STANDARD; setTimeout(() => editMln('Kiểu đường đôi mới: ' + n, base, v => { lib = mnLib(); lib[n] = v; mnSave(lib); sel = n; render(); }), 0); } });
    $('mnMod').onclick = () => { const n = sel; editMln('Sửa kiểu đường đôi: ' + n, lib[n], v => { lib = mnLib(); lib[n] = v; mnSave(lib); if(n === ((A.MLINESTYLE && A.MLINESTYLE.name) || 'STANDARD')) mnSetCur(n, lib); render(); }); };
    $('mnRen').onclick = async () => { const nn = await askText({ title: 'Đổi tên kiểu đường đôi', value: sel }); const t = nn && nn.trim().toUpperCase().replace(/\s+/g, '_'); if(!t || t === sel) return; if(lib[t]){ say('Tên đã có.'); return; } lib[t] = lib[sel]; delete lib[sel]; mnSave(lib); sel = t; render(); };
    $('mnDel').onclick = () => { delete lib[sel]; mnSave(lib); sel = (A.MLINESTYLE && A.MLINESTYLE.name) || 'STANDARD'; render(); };
    $('mnLoad').onclick = () => mlnLoad(n => { sel = n; render(); });
    $('mnSv').onclick = () => { const blob = new Blob([mlnWrite([[sel, lib[sel]]])], { type: 'text/plain' }), fn = sel.toLowerCase() + '.mln';
      try{ shareOrDownload(blob, fn, 'text/plain'); }catch(_){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; a.click(); } log('Đã lưu kiểu "' + sel + '" ra ' + fn); };
    render();
  }
  A.openMlStyle = openMlStyle;
  plain(['MLSTYLE'], 'Kiểu đường đôi (Multiline Style): thành phần (khoảng lệch, màu, kiểu nét), nắp, tô màu, mối nối; tải / lưu file .mln', () => openMlStyle());

  /* ==================================================================
     BATTMAN — Block Attribute Manager (như AutoCAD: Select block · Block · bảng Tag / Prompt / Default / Modes · Sync / Move Up / Move Down / Edit / Remove · Settings)
     ================================================================== */
  const BTK = 'dvd:battset';
  const BCOLS = [['tag', 'Nhãn'], ['prompt', 'Lời nhắc'], ['def', 'Mặc định'], ['modes', 'Chế độ'], ['anno', 'Chú thích'], ['style', 'Kiểu chữ'], ['just', 'Canh lề'], ['h', 'Cao chữ'], ['rot', 'Góc xoay'], ['wf', 'Hệ số rộng'], ['obl', 'Góc nghiêng'], ['bw', 'Bề rộng khung'], ['layer', 'Lớp'], ['lt', 'Kiểu nét'], ['col', 'Màu'], ['lw', 'Bề rộng nét'], ['ps', 'Kiểu in']];
  const MODES = [['inv', 'Ẩn', 'I'], ['con', 'Hằng số', 'C'], ['ver', 'Xác nhận', 'V'], ['pre', 'Đặt sẵn', 'P'], ['lock', 'Khoá vị trí', 'L'], ['ml', 'Nhiều dòng', 'M']];
  const bset = () => { let o = null; try{ o = JSON.parse(localStorage.getItem(BTK) || 'null'); }catch(_){} return Object.assign({ cols: ['tag', 'prompt', 'def', 'modes'], dup: 1, refs: 1 }, o || {}); };
  const bsetSave = o => { try{ localStorage.setItem(BTK, JSON.stringify(o)); }catch(_){} };
  function battBlocks(){ const s = new Map(); for(const e of modelEntities) if(e && e.att && e.bm && e.bm.name && !String(e.blk || '').startsWith('*')) if(!s.has(e.bm.name)) s.set(e.bm.name, e);
    try{ const L = A.blockLib ? A.blockLib() : {}; for(const n of Object.keys(L)) if((L[n].ents || []).some(p => p.attdef) && !s.has(n)) s.set(n, null); }catch(_){} return s; }
  const battInst = name => { const m = new Set(); for(const e of modelEntities) if(e && e.grp && e.bm && e.bm.name === name) m.add(e.grp); return m.size; };
  function battApplyRows(name, rows, refs){
    const defs = rows.map(r => { const prim = JSON.parse(JSON.stringify(r.prim)); prim.attdef = Object.assign({}, prim.attdef || {}, { tag: r.tag, prompt: r.prompt || r.tag, def: r.def || '' }); return { tag: r.tag, prompt: r.prompt || r.tag, def: r.def || '', prim }; });
    try{ const L = A.blockLib(); const B = L[name]; if(B){ const others = (B.ents || []).filter(p => !p.attdef); B.ents = others.concat(defs.map(d => d.prim)); A.saveBlockLib(L); } }catch(_){}
    if(!refs || !A.syncAtts) return 0; const res = A.syncAtts(name, defs, 'def'); if(res.nInst) A.commit({ del: res.del, add: res.add }, 'BATTMAN: ' + name); return res.nInst;
  }
  const jKey = p => jOf(p.ha || 'left', p.va || 'alphabetic');
  const cellOf = (r, k) => { const p = r.prim || {}, md = (p.attdef && p.attdef.mode) || {};
    switch(k){ case 'tag': return r.tag; case 'prompt': return r.prompt; case 'def': return r.def; case 'modes': return MODES.filter(m => md[m[0]]).map(m => m[2]).join('');
      case 'anno': return p.anno > 0 ? 'Có' : 'Không'; case 'style': return p.style || 'Standard'; case 'just': return jKey(p); case 'h': return r6(p.h || 2.5); case 'rot': return r6(p.rot || 0); case 'wf': return r6(Math.abs(p.xs || 1)); case 'obl': return r6(p.obl || 0);
      case 'bw': return p.mtwk > 0 ? r6(p.mtwk * (p.h || 1)) : '0'; case 'layer': return p.layer || '0'; case 'lt': return p.lt || 'ByLayer'; case 'col': return p.bl || !p.col ? 'ByLayer' : (aciExact(p.col) ? String(aciExact(p.col)) : p.col); case 'lw': return p.lw > 0 ? (p.lw / 100).toFixed(2) + ' mm' : 'ByLayer'; case 'ps': return 'ByLayer'; }
    return ''; };
  function battman(pre){
    let all = battBlocks(); if(!all.size){ say('Bản vẽ chưa có khối nào có thuộc tính.'); return; }
    let name = pre && all.has(pre) ? pre : [...all.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0], rows = [], sel = 0, dirty = false; const S = bset();
    const load = () => { const smp = all.get(name), src = smp && smp.bm ? smp.bm.src : 'lib'; let d = A.attDefs ? A.attDefs(name, src, null) : []; if(!d.length && smp) d = A.attDefs(name, null, A.groupMembers(smp.grp));
      rows = d.map(x => { const prim = JSON.parse(JSON.stringify(x.prim)); prim.attdef = Object.assign({ tag: x.tag, prompt: x.prompt, def: x.def }, prim.attdef || {}); return { tag: x.tag, prompt: x.prompt, def: x.def, prim }; });
      // chế độ đang dùng ở bản chèn (khi định nghĩa chưa ghi)
      const smpAtt = smp ? A.groupMembers(smp.grp).filter(e => e.att) : []; for(const r of rows){ const a = smpAtt.find(e => e.att === r.tag); if(a && !r.prim.attdef.mode){ const md = {}; if(a.ainv) md.inv = 1; if(a.acon) md.con = 1; if(a.aver) md.ver = 1; if(a.apre) md.pre = 1; if(a.alock) md.lock = 1; if(a.aml) md.ml = 1; if(Object.keys(md).length) r.prim.attdef.mode = md; } }
      sel = 0; dirty = false; };
    load();
    const html = '<div class="acw" style="width:640px"><div class="acw-row">' + K.btn('bmPick', (A.ICONS && A.ICONS.SELECT ? A.ico('SELECT') : '') + '<span>Chọn khối</span>') + '<span style="margin-left:8px">Khối:</span><select id="bmB" style="flex:1;width:auto" translate="no"></select>' + K.btn('bmSync', 'Đồng bộ') + '</div>' +
      '<div class="acw-cols" style="margin-top:6px"><div class="c1"><div class="ls-grid" style="height:240px"><table><thead id="bmH"></thead><tbody id="bmT"></tbody></table></div><div class="acw-row"><span id="bmN" class="acw-note" style="margin:0"></span></div></div>' +
      '<div class="c2 acw-btncol">' + K.btn('bmUp', 'Lên') + K.btn('bmDn', 'Xuống') + K.btn('bmEd', 'Sửa…') + K.btn('bmRm', 'Xoá') + '</div></div></div>';
    const d = A.dialog({ title: 'Quản lý thuộc tính khối', cls: 'acw-free', help: 'BATTMAN', html, left: K.btn('bmSet', 'Cài đặt…') + ' ' + K.btn('bmAp', 'Áp dụng', { dis: 1 }), ok: () => { if(dirty) apply(); } });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const apply = () => { const n = battApplyRows(name, rows, S.refs); log('BATTMAN: khối "' + name + '" có ' + rows.length + ' thuộc tính' + (S.refs ? ', đã cập nhật ' + n + ' bản chèn.' : ' (bản chèn cũ giữ nguyên — dùng Đồng bộ / ATTSYNC).')); dirty = false; $('bmAp').disabled = true; all = battBlocks(); };
    const touch = () => { dirty = true; $('bmAp').disabled = false; render(); };
    const render = () => { const names = [...all.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); $('bmB').innerHTML = names.map(n => opt(n, n, name)).join('');
      const cols = BCOLS.filter(c => c[0] === 'tag' || S.cols.includes(c[0])); $('bmH').innerHTML = '<tr>' + cols.map(c => '<th>' + c[1] + '</th>').join('') + '</tr>';
      const cnt = {}; for(const r of rows) cnt[r.tag] = (cnt[r.tag] || 0) + 1;
      $('bmT').innerHTML = rows.length ? rows.map((r, i) => '<tr data-i="' + i + '"' + (i === sel ? ' class="sel"' : '') + (S.dup && cnt[r.tag] > 1 ? ' style="color:#ff6b6b"' : '') + '>' + cols.map(c => '<td' + (/^(tag|prompt|def|layer|style)$/.test(c[0]) ? ' translate="no"' : '') + '>' + esc(cellOf(r, c[0])) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + cols.length + '" style="color:#9aa6ba">Khối không còn thuộc tính.</td></tr>';
      const n = battInst(name); $('bmN').textContent = 'Có trong bản vẽ: ' + n + ' · Có trong Model: ' + n; btns(); };
    const btns = () => { $('bmUp').disabled = sel <= 0; $('bmDn').disabled = sel >= rows.length - 1; $('bmEd').disabled = $('bmRm').disabled = !rows.length; };
    const switchTo = n => { if(n === name) return; const go = () => { name = n; load(); render(); };
      if(dirty) A.dialog({ title: 'Quản lý thuộc tính khối', help: false, html: '<div class="acw" style="max-width:360px">Áp dụng thay đổi cho khối "<span translate="no">' + esc(name) + '</span>" trước khi chuyển?</div>', okText: 'Có', cancelText: 'Không', ok: () => { apply(); go(); }, cancel: go }); else go(); };
    $('bmB').onchange = () => { const n = $('bmB').value; $('bmB').value = name; switchTo(n); };
    $('bmT').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if(!tr) return; sel = +tr.dataset.i; $('bmT').querySelectorAll('tr').forEach(x => x.classList.toggle('sel', x === tr)); btns(); });
    $('bmT').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-i]'); if(tr){ sel = +tr.dataset.i; $('bmEd').click(); } });
    $('bmUp').onclick = () => { if(sel > 0){ rows.splice(sel - 1, 0, rows.splice(sel, 1)[0]); sel--; touch(); } };
    $('bmDn').onclick = () => { if(sel < rows.length - 1){ rows.splice(sel + 1, 0, rows.splice(sel, 1)[0]); sel++; touch(); } };
    $('bmRm').onclick = () => { if(!rows.length) return; rows.splice(sel, 1); sel = Math.max(0, Math.min(sel, rows.length - 1)); touch(); };
    $('bmEd').onclick = () => { if(rows[sel]) battEdit(name, rows, sel, () => { touch(); }); };
    $('bmSync').onclick = () => { if(dirty) apply(); const n = battApplyRows(name, rows, true); log('Đồng bộ: ' + n + ' bản chèn của "' + name + '".'); render(); };
    $('bmSet').onclick = () => battSettings(S, () => { bsetSave(S); render(); });
    $('bmAp').onclick = () => { apply(); render(); };
    $('bmPick').onclick = () => { d.root.style.display = 'none'; log('Chọn một khối có thuộc tính (Esc = huỷ)'); const cv = document.getElementById('cv');
      const off = () => { document.removeEventListener('pointerdown', dn, true); window.removeEventListener('keydown', kd, true); d.root.style.display = ''; };
      const dn = ev => { if(ev.target !== cv) return; ev.preventDefault(); ev.stopPropagation(); const r = cv.getBoundingClientRect(); let o2 = null; try{ const i = pickEntity({ x: ev.clientX - r.left, y: ev.clientY - r.top }); o2 = i >= 0 ? entities[i] : null; }catch(_){}
        off(); if(!o2 || !o2.bm || !all.has(o2.bm.name)){ say('Đối tượng chọn không phải khối có thuộc tính.'); return; } switchTo(o2.bm.name); };
      const kd = ev => { if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); off(); } };
      document.addEventListener('pointerdown', dn, true); window.addEventListener('keydown', kd, true); };
    render();
  }
  A.battman = battman;
  // Edit Attribute (Attribute · Text Options · Properties), xem trước thay đổi ngay trên bản vẽ
  function battEdit(name, rows, i, done){
    const r0 = rows[i], r = JSON.parse(JSON.stringify(r0)), p = r.prim, md = Object.assign({}, (p.attdef && p.attdef.mode) || {}); const TSN = A.TS ? Object.keys(A.TS.list) : ['Standard'];
    const k0 = (() => { try{ return editUndoStack.length; }catch(_){ return -1; } })(); let previewed = false;
    const libSnap = (() => { try{ const B = A.blockLib()[name]; return B ? JSON.stringify(B) : null; }catch(_){ return null; } })();
    const html = '<div class="acw" style="width:540px"><div class="acw-row"><span>Khối đang sửa:</span><b translate="no">' + esc(name) + '</b></div>' +
      K.tabs('be', [['att', 'Thuộc tính khối'], ['txt', 'Tuỳ chọn chữ'], ['pr', 'Thuộc tính đối tượng']], 'att') + '<div class="acw-panes" style="min-height:240px">' +
      K.pane('be', 'att', 'att', '<div class="acw-cols"><div class="c1" style="flex:0 0 150px">' + K.grp('Chế độ', MODES.map(m => K.chk('beM_' + m[0], m[1], md[m[0]])).join('<br>')) + '</div><div class="c1">' +
        K.grp('Dữ liệu', K.row('Nhãn:', K.txt('beTag', r.tag)) + K.row('Lời nhắc:', K.txt('bePr', r.prompt)) + K.row('Mặc định:', K.txt('beDef', r.def))) + '</div></div>') +
      K.pane('be', 'txt', 'att', '<div class="acw-cols"><div class="c1">' + K.row('Kiểu chữ:', K.sel('beTs', TSN.map(n => [n, n]), p.style || 'Standard')) + K.row('Canh lề:', K.sel('beJ', Object.keys(JUST).map(k => [k, k + ' — ' + JNAME[k]]), jKey(p))) +
        K.row('Cao chữ:', K.num('beH', r6(p.h || 2.5), { min: 0 })) + K.row('Góc xoay:', K.num('beR', r6(p.rot || 0))) + K.chk('beAn', 'Chú thích (Annotative)', p.anno > 0) + '</div><div class="c1">' +
        K.chk('beBk', 'Viết ngược', (p.xs || 1) < 0) + '<br>' + K.chk('beUd', 'Lộn ngược', !!p.ud) + K.row('Hệ số rộng:', K.num('beW', r6(Math.abs(p.xs || 1)), { min: 0.01 })) + K.row('Góc nghiêng:', K.num('beO', r6(p.obl || 0))) +
        K.row('Bề rộng khung:', K.num('beBw', p.mtwk > 0 ? r6(p.mtwk * (p.h || 1)) : 0, { min: 0 })) + '</div></div>') +
      K.pane('be', 'pr', 'att', K.row('Lớp:', K.sel('beL', A.layerNames().map(n => [n, n]), p.layer || '0')) + K.row('Kiểu nét:', K.ltSel('beLt', p.lt || 'BYLAYER')) + K.row('Màu:', K.colorSel('beC', p.bl || !p.col ? 'BYLAYER' : p.col, { noBlock: 1 })) +
        K.row('Bề rộng nét:', K.lwSel('beLw', p.lw > 0 ? p.lw : -1)) + K.row('Kiểu in:', K.sel('bePs', [['', 'ByLayer']], '', { dis: 1 }), { dis: 1, tip: 'Bản vẽ dùng bảng in theo màu (.ctb) — như AutoCAD' })) + '</div></div>';
    const d = A.dialog({ title: 'Sửa thuộc tính', cls: 'acw-free', help: 'BATTMAN', html, left: K.chk('beAuto', 'Xem trước thay đổi', 1), ok: root => { if(!read(root)) return false; rows[i] = r; done(); },
      cancel: () => { if(!previewed) return; if(k0 >= 0){ try{ while(editUndoStack.length > k0) undoEdit(); }catch(_){} } if(libSnap){ try{ const L = A.blockLib(); L[name] = JSON.parse(libSnap); A.saveBlockLib(L); }catch(_){} } } });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    const read = () => { const tag = $('beTag').value.trim().toUpperCase().replace(/\s+/g, '_'); if(!tag){ say('Nhãn không được trống.'); return false; } r.tag = tag; r.prompt = $('bePr').value; r.def = $('beDef').value;
      const m = {}; for(const [k] of MODES) if($('beM_' + k).checked) m[k] = 1; p.attdef = Object.assign({}, p.attdef || {}, { tag, prompt: r.prompt || tag, def: r.def }); if(Object.keys(m).length) p.attdef.mode = m; else delete p.attdef.mode;
      if(A.tsApply && A.TS && A.TS.list[$('beTs').value]) A.tsApply(p, $('beTs').value); else p.style = $('beTs').value;
      const J = JUST[$('beJ').value]; if(J){ p.ha = J[0]; p.va = J[1]; }
      const h = num($('beH').value); if(h > 0) p.h = h; p.rot = num($('beR').value) || 0; if(!p.rot) delete p.rot;
      const wf = num($('beW').value) || 1, bk = $('beBk').checked; p.xs = (bk ? -1 : 1) * Math.abs(wf); if(Math.abs(p.xs - 1) < 1e-9) delete p.xs; if($('beUd').checked) p.ud = 1; else delete p.ud;
      const ob = num($('beO').value) || 0; if(Math.abs(ob) > 1e-9 && Math.abs(ob) <= 85) p.obl = ob; else delete p.obl;
      const bw = num($('beBw').value) || 0; if(bw > 0 && m.ml) p.mtwk = bw / (p.h || 1); else delete p.mtwk;
      if($('beAn').checked) p.anno = (p.h || 2.5) / ((A.ANNO && A.ANNO.N) || 1); else delete p.anno;
      p.layer = $('beL').value || '0'; const lt = $('beLt').value; if(!lt || lt === 'BYLAYER') delete p.lt; else p.lt = lt; const lw = +$('beLw').value; if(lw > 0) p.lw = lw; else delete p.lw;
      const c = $('beC').value; if(!c || c === 'BYLAYER'){ p.bl = 1; p.col = A.layerHex(p.layer); } else { delete p.bl; p.col = c; }
      return true; };
    const preview = () => { if(!$('beAuto').checked || !read()) return; const tmp = rows.slice(); tmp[i] = r; const n = battApplyRows(name, tmp, true); if(n) previewed = true; };
    root.querySelector('.acw-panes').addEventListener('change', preview);
    $('beBw').disabled = !md.ml; $('beM_ml').addEventListener('change', () => { $('beBw').disabled = !$('beM_ml').checked; });
    K.bindColors(root, preview);
  }
  function battSettings(S, done){
    const html = '<div class="acw" style="width:440px">' + K.grp('Hiện trong danh sách', '<div class="ls-props">' + BCOLS.map(([k, t]) => K.chk('bsC_' + k, t, k === 'tag' || S.cols.includes(k), k === 'tag' ? { dis: 1 } : null)).join('') + '</div><div class="acw-row" style="margin-top:4px"><span class="l"></span>' + K.btn('bsAll', 'Chọn tất cả') + K.btn('bsNo', 'Bỏ tất cả') + '</div>') +
      K.chk('bsDup', 'Tô đỏ nhãn trùng', S.dup) + '<br>' + K.chk('bsRef', 'Áp thay đổi cho các bản chèn đã có', S.refs) + '</div>';
    const d = A.dialog({ title: 'Cài đặt quản lý thuộc tính', cls: 'acw-free', help: 'BATTMAN', html, ok: r => { S.cols = BCOLS.map(c => c[0]).filter(k => k !== 'tag' && r.querySelector('#bsC_' + k).checked); S.dup = r.querySelector('#bsDup').checked ? 1 : 0; S.refs = r.querySelector('#bsRef').checked ? 1 : 0; done(); } });
    const root = d.root; root.querySelector('#bsAll').onclick = () => root.querySelectorAll('[id^="bsC_"]:not(:disabled)').forEach(c => { c.checked = true; }); root.querySelector('#bsNo').onclick = () => root.querySelectorAll('[id^="bsC_"]:not(:disabled)').forEach(c => { c.checked = false; });
  }
  plain(['BATTMAN'], 'Quản lý thuộc tính khối (Block Attribute Manager): nhãn, lời nhắc, mặc định, chế độ, chữ, lớp, màu — đồng bộ các bản chèn', () => { if(A.busy && A.busy()) A.cancel(true); battman(); });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
