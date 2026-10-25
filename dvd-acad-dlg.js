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
        K.grp('Hiệu ứng', '<div class="acw-cols"><div class="c1">' + K.chk('tsUd', 'Lộn ngược', 0, { dis: 1 }) + '<br>' + K.chk('tsBk', 'Viết ngược (trái ↔ phải)', 0) + '<br>' + K.chk('tsVt', 'Viết dọc', 0, { dis: 1 }) + '</div><div class="c1">' +
          K.vrow('Hệ số rộng:', K.num('tsWf', 1, { min: 0.01 })) + K.vrow('Góc nghiêng:', K.num('tsObl', 0, { dis: 1 })) + '</div></div>') + '</div>' +
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
    const load = () => { const st = TS.list[sel] || {}; $('tsFont').value = st.font || 'Arial'; $('tsH').value = st.h > 0 ? st.h : 0; $('tsWf').value = st.wf > 0 ? st.wf : 1; $('tsBk').checked = !!st.bk;
      $('tsDel').disabled = sel === 'Standard' || sel === TS.cur; dirty = false; ap.disabled = true; prev(); };
    const prev = () => { const p = $('tsPrev'), w = num($('tsWf').value) || 1; p.style.fontFamily = '"' + $('tsFont').value + '",sans-serif'; p.style.transform = 'scaleX(' + (w * ($('tsBk').checked ? -1 : 1)) + ')'; };
    const apply = () => { const st = TS.list[sel]; if(!st) return; const w = num($('tsWf').value), h = num($('tsH').value);
      st.font = $('tsFont').value; if(w > 0.01 && w < 100) st.wf = w; st.h = h > 0 ? h : 0; if($('tsBk').checked) st.bk = 1; else delete st.bk; A.tsSave();
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

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
