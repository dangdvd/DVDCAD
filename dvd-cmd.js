/* DVDCAD — dòng lệnh kiểu AutoCAD (lời nhắc + tuỳ chọn bấm được + lịch sử F2), phím tắt, bảng Thuộc tính.
   Các lệnh vẽ/sửa thật chạy trên bộ lệnh DVDAcad (dvd-acad-core.js / dvd-acad-cmds.js) và tự đăng ký vào đây. */
(function(){
  'use strict';
  if(window.DVDCmd) return;
  const $ = id => document.getElementById(id);
  const say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fine = () => !!(window.matchMedia && matchMedia('(pointer:fine)').matches) && !/iPhone|iPad|Android/i.test(navigator.userAgent);
  const deaccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const num = v => { const n = parseFloat(String(v).trim().replace(',', '.')); return isFinite(n) ? n : NaN; };
  const fmt = v => { if(!isFinite(v)) return ''; const a = Math.abs(v); return a >= 1000 ? v.toFixed(1) : a >= 1 ? v.toFixed(3).replace(/\.?0+$/, '') : v.toFixed(4).replace(/\.?0+$/, ''); };
  const hasDrawing = () => { try{ return !!(entities.length || window.__dvdNewDoc); }catch(_){ return false; } };
  const ACAD = () => window.DVDAcad;
  const busy = () => !!(ACAD() && ACAD().busy && ACAD().busy());

  function selection(){
    try{
      if(selEnts && selEnts.size) return [...selEnts];
      if(infoIdx >= 0 && entities[infoIdx]) return [entities[infoIdx]];
    }catch(_){}
    return [];
  }
  function measure(kind){
    if(!hasDrawing()){ say('Mở bản vẽ trước.'); return; }
    setMode('measure');
    const b = document.querySelector('#dimRow .pill[data-dim="' + kind + '"]'); if(b) b.click();
  }
  function zoomCmd(arg){
    const a = String(arg || '').trim().toUpperCase();
    const pv = () => { try{ ACAD() && ACAD().pushView && ACAD().pushView(); }catch(_){} };
    if(a === 'W' || a === 'WINDOW'){ const b = $('zoomWinBtn'); if(b) b.click(); return; }
    if(a === 'P' || a === 'PREVIOUS'){ if(ACAD() && ACAD().prevView) ACAD().prevView(); return; }
    if(a === 'I' || a === 'IN'){ pv(); applyZoom(1.6, W() / 2, H() / 2); draw(); return; }
    if(a === 'O' || a === 'OUT'){ pv(); applyZoom(1 / 1.6, W() / 2, H() / 2); draw(); return; }
    if(a && isFinite(num(a.replace(/X$/, '')))){ const f = num(a.replace(/X$/, '')); if(f > 0){ pv(); applyZoom(f, W() / 2, H() / 2); draw(); } return; }
    if(hasDrawing()){ pv(); fitView(); }
  }
  function selectAll(){
    if(!hasDrawing()) return;
    if(busy()){ ACAD().input('ALL'); return; }
    if(mode !== 'pan') setMode('pan');
    selEnts.clear(); for(const e of entities){ if(hiddenUserLayers.has(e.layer || '0')) continue; if(ACAD() && ACAD().isLocked(e)) continue; selEnts.add(e); }
    refreshPanSel(); say('Đã chọn ' + selEnts.size + ' đối tượng');
  }

  /* ---------------- danh sách lệnh ---------------- */
  const C = (k, d, run, extra) => Object.assign({ k, d, run }, extra || {});
  const cloud = n => (...a) => { if(window.DVDCloud && DVDCloud[n]) return DVDCloud[n](...a); say('Chưa nạp module Drive.'); };
  const CMDS = [
    C(['PROPERTIES', 'PR', 'PROPS', 'CH', 'MO'], 'Bật/tắt bảng Thuộc tính (Ctrl+1)', () => togglePalette()),
    C(['LAYER', 'LA'], 'Quản lý lớp', () => { if(ACAD() && ACAD().openLayerManager) ACAD().openLayerManager(); else { const b = $('layerBtn'); if(b) b.click(); } }),
    C(['SELECTALL', 'ALL'], 'Chọn tất cả (Ctrl+A)', () => selectAll()),
    C(['QM', 'MEASUREGEOM', 'MEA'], 'Đo nhanh có ghi lại trên bản vẽ (lớp đo)', () => measure('aligned')),   // DO để dành cho DONUT như AutoCAD
    C(['NOTE', 'GC', 'MARKUP'], 'Ghi chú / khoanh mây (lớp ghi chú)', () => { if(hasDrawing()) setMode('note'); }),
    C(['ZE', 'ZA'], 'Phóng vừa bản vẽ', () => zoomCmd('E')),
    C(['ZW'], 'Phóng theo khung', () => zoomCmd('W')),
    C(['PAN', 'P'], 'Kéo màn hình (giữ chuột giữa để kéo)', () => setMode('pan')),
    C(['REGEN', 'RE', 'REDRAW', 'R'], 'Vẽ lại màn hình', () => { try{ forceRedraw(); }catch(_){ draw(); } }),
    C(['UNDO', 'U'], 'Hoàn tác (Ctrl+Z)', () => { if(hasDrawing()) undoEdit(); }),
    C(['REDO', 'MREDO'], 'Làm lại (Ctrl+Y)', () => { if(hasDrawing()) redoEdit(); }),
    C(['OPEN'], 'Mở bản vẽ (Ctrl+O)', () => { const b = $('openBtn'); if(b) b.click(); }),
    C(['QSAVE', 'SAVE'], 'Lưu (Ctrl+S): Drive hoặc file DWG / DXF trên máy', () => cloud('save')()),
    C(['SAVEAS'], 'Lưu thành file DWG / DXF mới (Ctrl+Shift+S)', () => cloud('saveDxfLocal')(true)),
    C(['DXFOUT'], 'Xuất DXF', () => { try{ exportDXF(false); }catch(_){} }),
    C(['DRIVE', 'CLOUD'], 'Google Drive · chia sẻ · cộng tác', () => cloud('openSheet')()),
    C(['SHARE'], 'Chia sẻ link bản vẽ', () => cloud('share')()),
    C(['SYNC'], 'Đồng bộ cộng tác ngay', () => cloud('syncNow')()),
    C(['EXPORT', 'PLOT', 'PRINT', 'PDF', 'EXPORTPDF'], 'Xuất PNG / PDF / DXF / In (Ctrl+P)', () => { const b = $('exportBtn'); if(b) b.click(); }),
    C(['FIND', 'SEARCH'], 'Tìm chữ trong bản vẽ', () => { const b = $('searchBtn'); if(b) b.click(); }),
    C(['GOTO'], 'Đi tới toạ độ', () => { const b = $('openGoto'); if(b){ const d = $('displayBtn'); if(d) d.click(); setTimeout(() => b.click(), 30); } }),
    C(['COMPARE'], 'So sánh 2 bản vẽ', () => { const b = $('compareBtn'); if(b) b.click(); }),
    C(['HELP', '?'], 'Danh sách lệnh (F1)', () => showHelp())
  ];
  let ALIAS = new Map(); const rebuild = () => { ALIAS = new Map(); for(const c of CMDS) for(const k of c.k) ALIAS.set(k, c); }; rebuild();
  function register(keys, desc, run, extra){
    const c = C(keys, desc, run, extra);
    const i = CMDS.findIndex(x => x.k[0] === keys[0]); if(i >= 0) CMDS[i] = c; else CMDS.push(c);
    for(const k of keys){ for(const o of CMDS){ if(o !== c && o.k.includes(k)) o.k = o.k.filter(x => x !== k); } }
    rebuild(); return c;
  }

  const UNDEF = new Set((() => { try{ return JSON.parse(localStorage.getItem('dvd:undef') || '[]'); }catch(_){ return []; } })());   // UNDEFINE / REDEFINE như AutoCAD
  const saveUndef = () => { try{ localStorage.setItem('dvd:undef', JSON.stringify([...UNDEF])); }catch(_){} };
  let lastCmd = null, lastUnknown = null;
  // tên lệnh: _LINE (tên quốc tế) · .LINE (lệnh gốc, bỏ qua UNDEFINE) · 'ZOOM (trong suốt) · -LAYER (bản dòng lệnh: chưa có thì dùng lệnh thường)
  const lookup = name => ALIAS.get(name) || (name[0] === '-' ? ALIAS.get(name.slice(1)) : null);
  function runCommand(text, opt){
    const raw = String(text || '').trim();
    if(window.DVDLisp && /^[(!]/.test(raw) && DVDLisp.commandLine(raw)) return;   // AutoLISP gõ thẳng ở dòng lệnh: (+ 1 2), !bien
    if(busy()){ ACAD().input(raw, opt); updateBar(); return; }
    if(!raw){ return repeatOrFinish(); }
    const parts = raw.split(/\s+/); const name = parts[0].toUpperCase().replace(/^[_.']+/, ''); const arg = parts.slice(1).join(' ');
    if(name === 'Z' || name === 'ZOOM'){ if(arg){ zoomCmd(arg); log('Lệnh: ZOOM ' + arg.toUpperCase()); return; } }
    if(UNDEF.has(name) && !/^[_]?\./.test(parts[0])){ log('Lệnh ' + name + ' đã bị tắt bằng UNDEFINE. Gõ .' + name + ' để dùng lệnh gốc, REDEFINE ' + name + ' để bật lại.'); return; }
    let c = lookup(name);
    if(!c){
      const ac = AC[name]; if(ac && ac.n >= 3 && ALIAS.get(ac.to)){ log('Tự sửa: ' + name + ' → ' + ac.to); execute(ALIAS.get(ac.to), arg); return; }
      const sug = IS.correct ? corrections(name) : []; lastUnknown = sug.length ? { name, t: Date.now(), to: sug.map(x => x.k[0]) } : null;
      log('Không có lệnh "' + raw + '". Bấm F1 để xem trợ giúp.' + (sug.length ? ' Có phải: ' + sug.map(x => x.k[0]).join(', ') + '?' : ''));
      return;
    }
    if(name[0] === '-' && !ALIAS.get(name)) log('(' + name + ' dùng bản thường ' + c.k[0] + ')');
    execute(c, arg);
  }
  // lệnh trong suốt khi đang chạy lệnh khác — trả true nếu đã xử lý
  function runTransparent(t, apos){
    const p = String(t || '').trim().toUpperCase().replace(/^'/, '').split(/\s+/); const n = p[0].replace(/^[_.]+/, ''), a = p.slice(1).join(' ');
    if(!n) return false;
    const zc = ALIAS.get('ZOOM');
    if((n === 'Z' || n === 'ZOOM') && (a || !zc || !zc.engine)){ zoomCmd(a || 'E'); log('>>ZOOM' + (a ? ' ' + a : '')); return true; }
    if(n === 'ZE' || n === 'ZA'){ zoomCmd('E'); log('>>ZOOM E'); return true; }
    if(n === 'ZW'){ zoomCmd('W'); log('>>ZOOM W'); return true; }
    if(n === 'RE' || n === 'REGEN' || n === 'REDRAW' || n === 'REGENALL'){ try{ forceRedraw(); }catch(_){ draw(); } log('>>' + n); return true; }
    if(n === 'P' || n === 'PAN'){ if(!apos && n === 'P') return false; log('>>PAN — giữ chuột giữa (hoặc Space + kéo) để kéo màn hình, rồi tiếp tục lệnh.'); return true; }
    const c = lookup(n);
    if(!c){ if(apos){ log('Không có lệnh "' + n + '".'); return true; } return false; }
    const A = ACAD();
    if(c.engine && !(A && A.isTransparent && (A.isTransparent(c.k[0]) || A.isTransparent(n)))){ if(apos){ log('** Lệnh ' + c.k[0] + ' không chạy trong suốt được **'); return true; } return false; }
    if(!c.engine) log('>>' + c.k[0]);
    if(A) A._nest = true;
    try{ c.run(a); }catch(err){ console.error(err); log('Lỗi: ' + err.message); }
    finally{ if(A) A._nest = false; }
    updateBar(); return true;
  }
  function execute(c, arg){
    lastCmd = c;
    if(!c.engine) log('Lệnh: ' + c.k[0]);
    if(lastUnknown && Date.now() - lastUnknown.t < 30000 && lastUnknown.to.includes(c.k[0])){ const a = AC[lastUnknown.name] || (AC[lastUnknown.name] = { to: c.k[0], n: 0 }); if(a.to !== c.k[0]){ a.to = c.k[0]; a.n = 0; } a.n++; saveAC(); }
    lastUnknown = null;
    if(!/^(UNDO|U|REDO|MREDO|HELP|\?)$/.test(c.k[0])){ bumpFreq(c.k[0]); noteCmd(c.k[0]); }
    try{ c.run(arg); }catch(err){ console.error(err); log('Lỗi: ' + err.message); }
    updateBar();
  }
  function repeatOrFinish(){
    if(busy()){ ACAD().input(''); updateBar(); return; }
    if(lastCmd){ execute(lastCmd); return; }
  }
  function cancelAll(){
    if(busy()){ ACAD().cancel(); return true; }
    if(ACAD() && ACAD().cancelWin && ACAD().cancelWin()) return true;
    try{
      if(document.querySelector('.overlay.show')) return false;
      if(gripEdit){ cancelGripEdit(); return true; }
      if(mirrorEnt){ finishMirror(); draw(); return true; }
      if(mode === 'edit' && editPts && editPts.length){ editPts = []; updateEditUI(); draw(); return true; }
      if(selEnts.size || infoIdx >= 0){ clearSel(); return true; }
      if(mode !== 'pan'){ setMode('pan'); return true; }
    }catch(_){}
    return false;
  }

  /* ---------------- thanh dòng lệnh + lịch sử ---------------- */
  const CSS = `
  #dvdCmd{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:8;width:min(760px,calc(100% - 200px));display:none;flex-direction:column;gap:3px}
  #dvdCmd.show{display:flex}
  #dvdCmd{pointer-events:none}
  #dvdCmd .box,#dvdCmd .sug{pointer-events:auto}
  @media (max-width:700px){ #dvdCmd{width:calc(100% - 24px)} }
  #dvdCmd{--cl-op:.94}
  #dvdCmd .hist{display:flex;flex-direction:column;gap:1px;max-height:none;overflow:hidden;font:12px "Cascadia Mono",Consolas,ui-monospace,Menlo,"DejaVu Sans Mono",monospace;color:#c9d2de;pointer-events:none}
  #dvdCmd .hist div{background:rgba(20,26,34,calc(var(--cl-op) * .78));padding:1px 8px;border-radius:4px;align-self:flex-start;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .6s}
  #dvdCmd .hist div.old{opacity:0}
  #dvdCmd.big .hist{max-height:42vh;overflow-y:auto;pointer-events:auto;background:rgba(20,26,34,.92);border:1px solid var(--line);border-radius:8px;padding:6px}
  #dvdCmd.big .hist div{background:none;opacity:1 !important;white-space:normal}
  #dvdCmd .mid{display:flex;flex-wrap:wrap;align-items:center;gap:0 6px;flex:1;min-width:0}
  #dvdCmd .box{display:flex;align-items:center;gap:6px;background:rgba(10,12,17,var(--cl-op));border:1px solid var(--line);border-radius:9px;padding:0 5px 0 8px;box-shadow:var(--shadow);backdrop-filter:blur(8px)}
  #dvdCmd .box:focus-within{border-color:var(--accent)}
  #dvdCmd .ic{color:var(--ink-faint);font:700 13px ui-monospace,Menlo,monospace;flex:0 0 auto}
  #dvdCmd .pr{line-height:1.45;padding:4px 0;font:600 12.5px "Cascadia Mono",Consolas,ui-monospace,Menlo,"DejaVu Sans Mono",monospace;color:#9fd0ff;white-space:normal;max-width:100%;flex:0 1 auto;word-break:break-word}
  #dvdCmd .pr .kw{color:#ffd24a;cursor:pointer;text-decoration:underline dotted;padding:0 1px}
  #dvdCmd .pr .kw:hover{color:#fff;background:rgba(255,210,74,.2)}
  #dvdCmd .pr .cnt{color:#7ee787}
  #dvdCmd .pr .kw .kk{font-style:normal;font-size:9.5px;color:#9aa6b6;margin-left:2px;vertical-align:1px;text-decoration:none}
  #dvdCmd .iw{position:relative;flex:1 1 90px;min-width:90px;display:flex}
  #dvdCmd input{flex:1;min-width:60px;background:transparent;border:none;outline:none;color:var(--ink);font:600 13.5px "Cascadia Mono",Consolas,ui-monospace,Menlo,"DejaVu Sans Mono",monospace;padding:9px 2px;text-transform:uppercase;position:relative;z-index:1}
  #dvdCmd .gh{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;padding:0 2px;font:600 13.5px "Cascadia Mono",Consolas,ui-monospace,Menlo,"DejaVu Sans Mono",monospace;color:#6d7a8c;white-space:pre;pointer-events:none;text-transform:uppercase;overflow:hidden}
  #dvdCmd .gh i{font-style:normal;color:transparent}
  #dvdCmd .tl{display:flex;flex-direction:column;gap:1px;margin-left:-4px;flex:0 0 auto}
  #dvdCmd .tl .tb{width:18px;height:14px;padding:0;border:none;background:none;color:var(--ink-faint);cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:3px}
  #dvdCmd .tl .tb:hover{background:rgba(255,255,255,.1);color:var(--ink)}
  #dvdCmd .tl svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  #dvdCmd .tl .tb[data-tb="cust"] svg{fill:currentColor;stroke:none}
  #dvdCmd .sug p.hd{margin:0;padding:4px 11px 2px;font:700 10px system-ui,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--ink-faint);border-top:1px solid var(--line)}
  #dvdCmd .sug div em{font-style:normal;font-size:11px;color:#ffd24a;margin-right:4px}
  #dvdCmd .sug div .ic.sv{font:700 10px "Cascadia Mono",Consolas,ui-monospace,Menlo,"DejaVu Sans Mono",monospace;color:#7ee787;display:flex;align-items:center;justify-content:center}
  #dvdCmd.dock{left:0;right:0;bottom:0;transform:none;width:auto;gap:0}
  #dvdCmd.dock .box{border-radius:0;border-left:none;border-right:none;border-bottom:none;box-shadow:none}
  #dvdCmd.dock .hist{background:rgba(20,26,34,var(--cl-op));border-top:1px solid var(--line);padding:2px 0;overflow-y:auto;pointer-events:auto}
  #dvdCmd.dock .hist div{background:none;opacity:1 !important}
  #dvdCmd.dock .sug{margin:0 8px 4px;align-self:flex-start;min-width:min(620px,96%)}
  #dvdCmd input::placeholder{text-transform:none;color:var(--ink-faint);font-weight:500}
  #dvdCmd .bt{font-family:inherit;font-size:12px;font-weight:700;border-radius:7px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);padding:6px 10px;cursor:pointer;display:none;flex:0 0 auto}
  #dvdCmd .bt.show{display:block}
  #dvdCmd .sug{display:none;flex-direction:column;background:rgba(17,21,29,.98);border:1px solid var(--line);border-radius:9px;overflow:hidden;box-shadow:var(--shadow)}
  #dvdCmd .sug.show{display:flex}
  #dvdCmd .sug div{display:flex;gap:10px;padding:7px 11px;font-size:12.5px;cursor:pointer;color:var(--ink-dim)}
  #dvdCmd .sug div b{min-width:96px;color:var(--ink);font:700 12px "Cascadia Mono",Consolas,ui-monospace,Menlo,"DejaVu Sans Mono",monospace}
  #dvdCmd .sug div.on,#dvdCmd .sug div:hover{background:rgba(56,189,248,.14);color:var(--ink)}
  #dvdCmd .sug div .ic{width:16px;height:16px;flex:0 0 16px;--ic-bg:#11151d}
  #dvdProps{position:absolute;right:66px;top:62px;z-index:8;width:280px;max-height:calc(100% - 140px);overflow-y:auto;display:none;
    background:rgba(17,21,29,.96);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);backdrop-filter:blur(8px);font-size:12.5px}
  #dvdProps.show{display:block}
  @media (max-width:700px){ #dvdProps{left:12px;right:12px;width:auto;top:auto;bottom:62px;max-height:45%} }
  #dvdProps .hd{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line);font-weight:700;position:sticky;top:0;background:rgba(17,21,29,.98);z-index:1}
  #dvdProps .hd span{flex:1}
  #dvdProps .hd button{background:none;border:none;color:var(--ink-dim);font-size:18px;cursor:pointer;line-height:1}
  #dvdProps .grp{padding:7px 12px 3px;color:var(--ink-faint);font-size:10.5px;font-weight:700;letter-spacing:.7px;text-transform:uppercase}
  #dvdProps .r{display:flex;align-items:center;gap:8px;padding:3px 12px}
  #dvdProps .r label{flex:0 0 96px;color:var(--ink-dim)}
  #dvdProps .r input,#dvdProps .r select{flex:1;min-width:0;background:var(--bg-canvas);border:1px solid var(--line);border-radius:6px;color:var(--ink);font:500 12.5px ui-monospace,Menlo,Consolas,monospace;padding:5px 7px;outline:none}
  #dvdProps .r input:focus,#dvdProps .r select:focus{border-color:var(--accent)}
  #dvdProps .r input[readonly]{color:var(--ink-dim);background:transparent;border-color:transparent}
  #dvdProps .r input[type=checkbox]{flex:0 0 auto;width:18px;height:18px}
  #dvdProps .r .sw{width:16px;height:16px;border-radius:3px;border:1px solid rgba(255,255,255,.3);flex:0 0 auto}
  #dvdProps .act{display:flex;gap:6px;padding:8px 12px;flex-wrap:wrap}
  #dvdProps .act button{flex:1;min-width:90px;font:600 12px inherit;font-family:inherit;padding:6px 8px;border-radius:7px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);cursor:pointer}
  #dvdProps .pe{padding:12px;color:var(--ink-dim);line-height:1.5}
  body.dvd-cmd-on .toast{bottom:auto;top:calc(env(safe-area-inset-top) + 128px)}
  #dvdHelpList{max-height:56vh;overflow-y:auto;margin-top:6px}
  #dvdHelpList div{display:flex;gap:10px;padding:6px 2px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--ink-dim)}
  #dvdHelpList b{min-width:150px;color:var(--ink);font:700 12px ui-monospace,Menlo,Consolas,monospace}
  `;
  let bar, input, histEl, prEl, sugEl, ghEl, okBtn, entBtn, escBtn, sugIdx = -1, sugList = [], hist = [], histIdx = -1, riIdx = -1, barWanted = null, histBig = false;
  const lines = [];
  /* ---- tuỳ chọn dòng lệnh (INPUTSEARCHOPTIONS / CLIPROMPTLINES / độ trong suốt / neo) ---- */
  const IS_DEF = { auto: 1, append: 1, correct: 1, syn: 1, mid: 1, sysvar: 1, content: 1, freq: 1, delay: 0, lines: 3, opacity: 94, dock: 0 };
  const IS = Object.assign({}, IS_DEF, (() => { try{ return JSON.parse(localStorage.getItem('dvd:inputsearch') || '{}') || {}; }catch(_){ return {}; } })());
  const saveIS = () => { try{ localStorage.setItem('dvd:inputsearch', JSON.stringify(IS)); }catch(_){} applyLook(); };
  function applyLook(){
    if(!bar) return; bar.classList.toggle('dock', !!IS.dock);
    bar.style.setProperty('--cl-op', String(Math.max(20, Math.min(100, +IS.opacity || 94)) / 100));
    renderHist(); try{ resize(); }catch(_){}
  }
  // số lần dùng từng lệnh: gợi ý xếp lệnh hay dùng lên trước (như AutoCAD)
  const FREQ = (() => { try{ return JSON.parse(localStorage.getItem('dvd:cmdfreq') || '{}') || {}; }catch(_){ return {}; } })();
  let freqT = 0; const bumpFreq = n => { FREQ[n] = (FREQ[n] || 0) + 1; clearTimeout(freqT); freqT = setTimeout(() => { try{ localStorage.setItem('dvd:cmdfreq', JSON.stringify(FREQ)); }catch(_){} }, 800); };
  // lệnh dùng gần đây (nút ▾ cạnh dòng lệnh)
  const RECENT = (() => { try{ return JSON.parse(localStorage.getItem('dvd:cmdrecent') || '[]') || []; }catch(_){ return []; } })();
  const noteCmd = n => { const i = RECENT.indexOf(n); if(i >= 0) RECENT.splice(i, 1); RECENT.unshift(n); if(RECENT.length > 20) RECENT.length = 20; try{ localStorage.setItem('dvd:cmdrecent', JSON.stringify(RECENT)); }catch(_){} };
  // từ đồng nghĩa (như acadSynonyms.pgp): gõ từ quen thuộc → gợi ý đúng lệnh
  const SYN = { ROUND: 'FILLET', CORNER: 'FILLET', BEVEL: 'CHAMFER', SYMBOL: 'INSERT', PART: 'INSERT', COMPONENT: 'INSERT', DELETE: 'ERASE', DEL: 'ERASE', REMOVE: 'ERASE', DUPLICATE: 'COPY', CLONE: 'COPY',
    TURN: 'ROTATE', SPIN: 'ROTATE', RESIZE: 'SCALE', SIZE: 'SCALE', ENLARGE: 'SCALE', FLIP: 'MIRROR', REFLECT: 'MIRROR', PARALLEL: 'OFFSET', CUT: 'TRIM', CLIPLINE: 'TRIM', LENGTHEN: 'EXTEND', PROLONG: 'EXTEND',
    STRAIGHT: 'LINE', SEGMENT: 'LINE', POLY: 'PLINE', SQUARE: 'RECTANG', RECTANGLE: 'RECTANG', BOX: 'RECTANG', HEXAGON: 'POLYGON', OVAL: 'ELLIPSE', CURVE: 'SPLINE', BEZIER: 'SPLINE', CLOUD: 'REVCLOUD',
    WRITE: 'MTEXT', WORDS: 'MTEXT', LABEL: 'MTEXT', NOTE: 'MLEADER', CALLOUT: 'MLEADER', ARROW: 'MLEADER', LEADER: 'MLEADER', DIMENSION: 'DIM', MEASURE: 'MEASUREGEOM', DISTANCE: 'DIST', AREA: 'AREA',
    PATTERN: 'HATCH', FILLAREA: 'HATCH', SHADE: 'GRADIENT', PRINT: 'PLOT', PDF: 'EXPORTPDF', CLEAN: 'PURGE', CLEANUP: 'PURGE', ATTACH: 'XATTACH', REFERENCE: 'XREF', SHEET: 'LAYOUT', PAPER: 'LAYOUT',
    GROUPS: 'GROUP', LAYERS: 'LAYER', LEVEL: 'LAYER', SETTINGS: 'OPTIONS', PREFERENCES: 'OPTIONS', CALCULATOR: 'QUICKCALC', SNAPS: 'OSNAP', OBJECTSNAP: 'OSNAP', NUMBER: 'TCOUNT', COUNTER: 'COUNT', QUANTITY: 'COUNT',
    XOA: 'ERASE', CHEP: 'COPY', SAOCHEP: 'COPY', DICHUYEN: 'MOVE', XOAY: 'ROTATE', CAT: 'TRIM', KEODAI: 'EXTEND', BOGOC: 'FILLET', VATGOC: 'CHAMFER', DOIXUNG: 'MIRROR', TILE: 'SCALE', SONGSONG: 'OFFSET',
    DUONG: 'LINE', DUONGTHANG: 'LINE', DATUYEN: 'PLINE', TRON: 'CIRCLE', DUONGTRON: 'CIRCLE', CUNG: 'ARC', CHUNHAT: 'RECTANG', DAGIAC: 'POLYGON', ELIP: 'ELLIPSE', CHU: 'MTEXT', VIETCHU: 'MTEXT',
    KICHTHUOC: 'DIM', DIMKT: 'DIM', LOP: 'LAYER', KHOI: 'BLOCK', CHENKHOI: 'INSERT', MANG: 'ARRAY', NHOM: 'GROUP', PHAKHOI: 'EXPLODE', NOI: 'JOIN', TACH: 'BREAK', KEOGIAN: 'STRETCH', TODAC: 'HATCH', MATCAT: 'HATCH', IN: 'PLOT', LUU: 'QSAVE', MO: 'OPEN' };
  // tự sửa lỗi gõ (AutoCorrect): sửa cùng một lỗi 3 lần thì lần sau tự chạy đúng lệnh
  const AC = (() => { try{ return JSON.parse(localStorage.getItem('dvd:autocorrect') || '{}') || {}; }catch(_){ return {}; } })();
  const saveAC = () => { try{ localStorage.setItem('dvd:autocorrect', JSON.stringify(AC)); }catch(_){} };
  // khoảng cách sửa chữ (có tính đổi chỗ 2 chữ liền nhau: LNIE → LINE = 1)
  function lev(a, b, max){
    if(Math.abs(a.length - b.length) > max) return max + 1;
    let pp = null, prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for(let i = 1; i <= a.length; i++){
      const cur = [i]; let best = i;
      for(let j = 1; j <= b.length; j++){
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if(pp && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 1);
        cur.push(v); if(v < best) best = v;
      }
      if(best > max) return max + 1; pp = prev; prev = cur;
    }
    return prev[b.length];
  }
  function corrections(q){
    if(q.length < 3) return [];
    const max = q.length <= 4 ? 1 : 2, out = [];
    for(const c of CMDS){ let d = Infinity; for(const k of c.k){ if(k.length < 3) continue; const v = lev(q, k, max); if(v < d) d = v; } if(d <= max) out.push({ c, d }); }
    return out.sort((a, b) => a.d - b.d || (FREQ[b.c.k[0]] || 0) - (FREQ[a.c.k[0]] || 0)).slice(0, 4).map(o => o.c);
  }
  // m: chuỗi, hoặc mảng mảnh [chuỗi dịch được | { nt: chuỗi giữ nguyên }] — giao diện English dịch từng mảnh
  function log(m){
    if(!m) return; const parts = Array.isArray(m) ? m : null;
    lines.push({ t: Date.now(), m: parts ? parts.map(x => typeof x === 'string' ? x : x.nt).join('') : String(m), parts }); if(lines.length > 500) lines.shift();
    renderHist();
  }
  const partsHTML = P => P.map(x => typeof x === 'string' ? (x ? '<span>' + esc(x) + '</span>' : '') : '<span translate="no">' + esc(x.nt) + '</span>').join('');
  // tách lời nhắc dạng chữ "… [A/B] <mặc định>:" thành mảnh
  function promptStrParts(s){
    const m = /^([\s\S]*?)(?: \[([^\]]*)\])?(?: <([^>]*)>)?(:?)$/.exec(String(s || '')); if(!m) return [String(s || '')];
    const out = [m[1]]; if(m[2] != null){ out.push(' ['); m[2].split('/').forEach((k, i) => { if(i) out.push('/'); out.push(k); }); out.push(']'); }
    if(m[3] != null){ out.push(' <'); out.push(/^[\d.,\-]+$/.test(m[3]) ? { nt: m[3] } : m[3]); out.push('>'); } if(m[4]) out.push(':'); return out;
  }
  function renderHist(){
    if(!histEl) return;
    const n = Math.max(0, Math.min(50, IS.lines | 0));
    const now = Date.now(); const show = histBig ? lines.slice(-300) : lines.slice(-n);
    histEl.innerHTML = show.map(l => '<div class="' + (!histBig && !IS.dock && now - l.t > 12000 ? 'old' : '') + '">' + (l.parts ? partsHTML(l.parts) : esc(l.m)) + '</div>').join('');
    histEl.style.display = !histBig && !n ? 'none' : '';
    if(IS.dock && !histBig) histEl.style.height = (n * 17 + 4) + 'px'; else histEl.style.height = '';
    histEl.scrollTop = histEl.scrollHeight;
  }
  setInterval(() => { if(!histBig && !IS.dock && lines.length) renderHist(); }, 3000);
  function toggleHistory(on){ histBig = on === undefined ? !histBig : !!on; if(bar) bar.classList.toggle('big', histBig); renderHist(); }
  const TOOL_SVG = { cust: '<svg viewBox="0 0 16 16"><path d="M10.6 2.2a3.3 3.3 0 0 0-3.9 4.3L2.4 10.8a1.2 1.2 0 0 0 1.7 1.7l4.3-4.3a3.3 3.3 0 0 0 4.3-3.9l-1.9 1.9-1.7-.4-.4-1.7z"/></svg>',
    rec: '<svg viewBox="0 0 16 16"><path d="M3 4h7M3 8h10M3 12h6"/><path d="M12 2.5l2 2-2 2"/></svg>', close: '<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg>' };
  function buildBar(){
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    bar = document.createElement('div'); bar.id = 'dvdCmd';
    bar.innerHTML = '<div class="sug"></div><div class="hist"></div><div class="box"><span class="tl"><button type="button" class="tb" data-tb="close" title="Ẩn dòng lệnh (Ctrl+9)">' + TOOL_SVG.close + '</button><button type="button" class="tb" data-tb="cust" title="Tuỳ chỉnh dòng lệnh">' + TOOL_SVG.cust + '</button><button type="button" class="tb" data-tb="rec" title="Lệnh gần đây">' + TOOL_SVG.rec + '</button></span><span class="mid"><span class="ic" title="Dòng lệnh">&gt;_</span><span class="pr">Lệnh:</span><span class="iw"><span class="gh" aria-hidden="true"></span><input autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="gõ lệnh: L, PL, C, M, CO, TR, H, DLI… (F1 = trợ giúp)"></span></span><button class="bt ok" type="button">✓ Xong chọn</button><button class="bt ent" type="button" title="Enter">↵</button><button class="bt esc" type="button" title="Huỷ (Esc)">✕</button></div>';
    const stage = document.querySelector('.stage'); stage.appendChild(bar);
    input = bar.querySelector('input'); histEl = bar.querySelector('.hist'); prEl = bar.querySelector('.pr'); sugEl = bar.querySelector('.sug'); ghEl = bar.querySelector('.gh');
    okBtn = bar.querySelector('.ok'); entBtn = bar.querySelector('.ent'); escBtn = bar.querySelector('.esc'); input.dataset.ph = input.getAttribute('placeholder');
    okBtn.addEventListener('click', () => { runCommand(''); });
    entBtn.addEventListener('click', () => { const v = input.value; input.value = ''; onTyped(); runCommand(v); });
    escBtn.addEventListener('click', () => { input.value = ''; onTyped(); cancelAll(); updateBar(); });
    bar.querySelector('.tl').addEventListener('mousedown', e => { const b = e.target.closest('[data-tb]'); if(!b) return; e.preventDefault(); const r = b.getBoundingClientRect();
      if(b.dataset.tb === 'close') toggleBar(); else if(b.dataset.tb === 'rec') recentMenu(r.left, r.top - 4); else custMenu(r.left, r.top - 4); });
    prEl.addEventListener('mousedown', e => { const k = e.target.closest('.kw'); if(!k) return; e.preventDefault(); if(busy()) ACAD().input(k.dataset.k); updateBar(); });
    histEl.addEventListener('dblclick', () => toggleHistory());
    input.addEventListener('input', () => { riIdx = -1; schedSug(); onTyped(); });
    input.addEventListener('keydown', e => {
      const lispOpen = () => { const v = input.value.trimStart(); if(v[0] !== '(') return false; let d = 0, q = false; for(const ch of v){ if(ch === '"') q = !q; else if(!q){ if(ch === '(') d++; else if(ch === ')') d--; } } return d > 0 || q; };
      if(e.key === ' ' && input.value.trimStart()[0] === '(') return;   // biểu thức LISP: phím cách là dấu cách
      if(e.key === 'Enter' && lispOpen()){ e.preventDefault(); input.value += ' '; return; }   // ngoặc chưa đóng: chờ gõ tiếp
      if(e.key === 'Enter' || (e.key === ' ' && !(busy() && ACAD().cur().req && ACAD().cur().req.type === 'str'))){
        e.preventDefault();
        let v = input.value; let picked = null;
        if(sugIdx >= 0 && sugList[sugIdx] && !busy() && !tryParseCoordOnly(v)) picked = sugList[sugIdx];
        const dyn = busy() && !!(ACAD().dynShown && ACAD().dynShown());
        input.value = ''; hideSug(); onTyped(); riIdx = -1;
        if(v.trim()){ hist.push(v.trim()); if(hist.length > 50) hist.shift(); }
        histIdx = -1;
        if(picked) runSug(picked, v.trim()); else runCommand(v, { dyn });
        if(!fine()) input.blur();
        return;
      }
      if(e.key === 'Escape'){ e.preventDefault(); if(input.value){ input.value = ''; hideSug(); onTyped(); } else { cancelAll(); input.blur(); } riIdx = -1; updateBar(); return; }
      if(e.key === 'ArrowUp'){ e.preventDefault(); if(sugEl.classList.contains('show')){ moveSug(-1); return; }
        if(busy()){ const L = recentFor(); if(L.length){ riIdx = Math.min(L.length - 1, riIdx + 1); input.value = L[riIdx]; onTyped(); } return; }
        if(hist.length){ histIdx = histIdx < 0 ? hist.length - 1 : Math.max(0, histIdx - 1); input.value = hist[histIdx]; onTyped(); } return; }
      if(e.key === 'ArrowDown'){ e.preventDefault(); if(sugEl.classList.contains('show')){ moveSug(1); return; }
        if(busy()){ if(riIdx >= 0){ const L = recentFor(); riIdx--; input.value = riIdx >= 0 ? L[riIdx] : ''; onTyped(); return; } if(!input.value) kwMenu(); return; }
        if(histIdx >= 0){ histIdx = Math.min(hist.length, histIdx + 1); input.value = hist[histIdx] || ''; if(histIdx >= hist.length) histIdx = -1; onTyped(); } return; }
      if(e.key === 'Tab'){ e.preventDefault();
        if(busy() && ACAD().dynTab && ACAD().dynTab(input.value)){ input.value = ''; onTyped(); return; }
        const c = sugList[sugIdx >= 0 ? sugIdx : 0]; if(c){ input.value = c.name || c.k[0]; hideSug(); onTyped(); } return; }
      if(e.key === 'ArrowRight' && ghEl.textContent && input.selectionStart === input.value.length){ const c = sugList[sugIdx >= 0 ? sugIdx : 0]; if(c && c.k){ e.preventDefault(); input.value = c.k.find(k => k.startsWith(input.value.trim().toUpperCase())) || c.k[0]; renderSug(); onTyped(); } return; }
      if((e.ctrlKey || e.metaKey) && !input.value && handleCtrl(e)){ e.preventDefault(); }
      if(/^F\d+$/.test(e.key)) return;
    });
    input.addEventListener('blur', () => setTimeout(() => { if(document.activeElement !== input) hideSug(); }, 150));
    sugEl.addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if(!d) return; e.preventDefault(); const c = sugList[+d.dataset.i]; const typed = input.value.trim(); input.value = ''; hideSug(); onTyped(); if(c){ hist.push(c.name || c.k[0]); runSug(c, typed); } });
    applyLook();
  }
  function onTyped(){ try{ if(ACAD() && ACAD().onTyped) ACAD().onTyped(input.value); }catch(_){} updGhost(); }
  function tryParseCoordOnly(v){ return /\d/.test(v) && /^\s*[@#*]?[-+\d.,;<'"\/\s]*$/.test(v); }
  function recentFor(){ const A = ACAD(); const c = A && A.cur && A.cur(); const r = c && c.req; if(!r || !A.recentInput) return []; return A.recentInput(r.type === 'ang' ? 'ang' : r.type); }
  /* ---- gợi ý khi gõ (AutoComplete): lệnh · đồng nghĩa · sửa lỗi gõ · biến hệ thống · nội dung bản vẽ ---- */
  let sugT = 0;
  function schedSug(){ clearTimeout(sugT); const d = Math.max(0, +IS.delay || 0); if(d) sugT = setTimeout(renderSug, d); else renderSug(); }
  function contentItems(q){
    const A = ACAD(); if(!A || !IS.content || q.length < 2) return [];
    const out = [], Q = deaccent(q), hit = n => { const d = deaccent(n); return IS.mid ? d.includes(Q) : d.startsWith(Q); };
    const add = (cat, name, run, ic) => { if(out.length < 12) out.push({ cat, name, d: cat + ': ' + name, run, ic }); };
    try{ for(const n of (A.layerNames ? A.layerNames() : [])) if(hit(n)) add('Lớp', n, () => { A.setCurLayer(n); log('Lớp hiện hành: ' + n); }, 'LAYER'); }catch(_){}
    try{ const B = A.blockList ? A.blockList() : { file: [], lib: [] }; for(const n of B.file) if(hit(n)) add('Khối', n, () => A.insertBlock(n, 'file'), 'INSERT'); for(const n of B.lib) if(hit(n) && !B.file.includes(n)) add('Khối (thư viện)', n, () => A.insertBlock(n, 'lib'), 'INSERT'); }catch(_){}
    try{ const P = A.PATS || {}; for(const k of Object.keys(P)) if(hit(k) || hit(P[k].name || '')) add('Mẫu hatch', k, () => { A.setHatchPattern(k); runCommand('HATCH'); }, 'HATCH'); }catch(_){}
    try{ const L = A.TS && A.TS.list ? Object.keys(A.TS.list) : []; for(const n of L) if(hit(n)) add('Kiểu chữ', n, () => { A.tsSetCur(n); log('Kiểu chữ hiện hành: ' + n); }, 'STYLE'); }catch(_){}
    return out;
  }
  function sysvarItems(q){
    const A = ACAD(); if(!A || !A.sysvar || !IS.sysvar || q.length < 2) return [];
    const out = []; for(const n of A.sysvar.list()){ if(!(n.startsWith(q) || (IS.mid && q.length >= 3 && n.includes(q)))) continue; const c = ALIAS.get(n); let v = ''; try{ v = A.sysvar.get(n); }catch(_){}
      out.push({ sys: n, name: n, d: (c ? c.d.replace(/^Biến hệ thống:\s*/, '') : '') , val: v, run: () => { if(c) execute(c); } }); }
    return out.sort((a, b) => a.name.length - b.name.length).slice(0, 6);
  }
  function renderSug(){
    const q = input.value.trim().toUpperCase();
    if(!q || tryParseCoordOnly(q) || busy() || q[0] === '(' || q[0] === '!' || window.DVD_AUTOCOMPLETE === false || !IS.auto){ hideSug(); return; }
    const qq = q.replace(/^[_.'\-]+/, ''); if(!qq){ hideSug(); return; }
    const dq = deaccent(qq), f = c => IS.freq ? (FREQ[c.k[0]] || 0) : 0;
    const exact = [], pre = [], mid = [], desc = [], seen = new Set();
    const svC = c => IS.sysvar && /^Biến hệ thống:/.test(c.d) && !c.k.includes(qq);
    for(const c of CMDS){
      if(svC(c)) continue;
      if(c.k.includes(qq)) exact.push(c);
      else if(c.k.some(k => k.startsWith(qq))) pre.push(c);
      else if(IS.mid && qq.length >= 2 && c.k.some(k => k.includes(qq))) mid.push(c);
      else if(dq.length >= 3 && deaccent(c.d).includes(dq)) desc.push(c);
    }
    const minLen = c => Math.min(...c.k.filter(k => k.startsWith(qq)).map(k => k.length));
    pre.sort((a, b) => (f(b) - f(a)) || (minLen(a) - minLen(b))); mid.sort((a, b) => f(b) - f(a)); desc.sort((a, b) => f(b) - f(a));
    let list = [];
    const push = (c, tag) => { if(!c || seen.has(c)) return; seen.add(c); list.push(tag ? Object.assign(Object.create(c), { tag }) : c); };
    for(const c of exact) push(c);
    if(IS.syn){ const s = SYN[deaccent(qq).toUpperCase()]; if(s) push(ALIAS.get(s), 'đồng nghĩa'); for(const k in SYN) if(qq.length >= 3 && k !== qq && k.startsWith(deaccent(qq).toUpperCase())) push(ALIAS.get(SYN[k]), 'đồng nghĩa: ' + k); }
    for(const c of pre) push(c);
    for(const c of mid) push(c);
    if(IS.correct && !exact.length && !pre.length){ const ac = AC[qq]; if(ac && ALIAS.get(ac.to)) push(ALIAS.get(ac.to), 'tự sửa'); for(const c of corrections(qq)) push(c, 'sửa lỗi gõ'); }
    list = list.slice(0, 8);
    // biến hệ thống + nội dung bản vẽ, rồi mới tới lệnh khớp theo mô tả (gõ chữ Việt: XOAY, CHUNHAT…)
    const extra = sysvarItems(qq).concat(contentItems(qq)).slice(0, 6);
    const more = []; for(const c of desc){ if(seen.has(c)) continue; seen.add(c); more.push(c); }
    sugList = list.concat(extra, more.slice(0, Math.max(0, 12 - list.length - extra.length))); sugIdx = sugList.length ? 0 : -1;
    if(!sugList.length){ hideSug(); return; }
    // biểu tượng cạnh từng gợi ý như AutoComplete của AutoCAD
    const A = ACAD(), icoK = k => (A && A.ico && A.ICONS && k && (A.ICONS[k] || (window.DVDIcons && DVDIcons[k]))) ? A.ico(k) : '<span class="ic"></span>';
    const icoOf = c => { if(c.sys) return '<span class="ic sv">x=</span>'; if(c.cat) return icoK(c.ic); if(!A || !A.ico || !A.ICONS) return ''; const k = c.k.find(x => A.ICONS[x] || (window.DVDIcons && DVDIcons[x])); return k ? A.ico(k) : '<span class="ic"></span>'; };
    let lastCat = null;
    sugEl.innerHTML = sugList.map((c, i) => {
      let hd = ''; const cat = c.sys ? 'Biến hệ thống' : c.cat ? c.cat : null; if(cat && cat !== lastCat){ hd = '<p class="hd">' + esc(cat) + '</p>'; } lastCat = cat;
      const label = c.sys ? c.name : c.cat ? c.name : c.k.slice(0, 3).join(' · ');
      const d = c.sys ? (String(c.val) + (c.d ? ' — ' + c.d : '')) : c.cat ? '' : c.d;
      return hd + '<div data-i="' + i + '" class="' + (i === sugIdx ? 'on' : '') + '">' + icoOf(c) + '<b' + (c.cat ? ' translate="no"' : '') + '>' + esc(label) + '</b><span>' + (c.tag ? '<em>' + esc(c.tag) + '</em> ' : '') + esc(d) + '</span></div>';
    }).join('');
    sugEl.classList.add('show'); updGhost();
  }
  function updGhost(){
    if(!ghEl) return; const v = input.value; const c = sugList[sugIdx >= 0 ? sugIdx : 0];
    let g = '';
    if(IS.append && v && c && c.k && sugEl.classList.contains('show')){ const Q = v.toUpperCase(); const k = c.k.find(x => x.startsWith(Q) && x.length > Q.length); if(k && Q === v.toUpperCase()) g = k.slice(Q.length); }
    ghEl.innerHTML = g ? '<i>' + esc(v) + '</i>' + esc(g) : '';
  }
  // chạy mục gợi ý: lệnh / biến hệ thống / nội dung (lớp, khối, mẫu hatch, kiểu chữ)
  function runSug(c, typed){
    if(c.run && (c.sys || c.cat)){ c.run(); updateBar(); return; }
    const base = Object.getPrototypeOf(c) && Object.getPrototypeOf(c).k ? (c.tag ? Object.getPrototypeOf(c) : c) : c;
    const T = String(typed || '').toUpperCase();
    if(c.tag && /sửa/.test(c.tag) && T && !base.k.includes(T)){ const a = AC[T] || (AC[T] = { to: base.k[0], n: 0 }); if(a.to !== base.k[0]){ a.to = base.k[0]; a.n = 0; } a.n++; saveAC(); }
    execute(base, '');
  }
  function moveSug(d){ if(!sugList.length) return; sugIdx = (sugIdx + d + sugList.length) % sugList.length; sugEl.querySelectorAll('[data-i]').forEach((x, i) => x.classList.toggle('on', i === sugIdx)); updGhost(); }
  function hideSug(){ sugEl.classList.remove('show'); sugList = []; sugIdx = -1; clearTimeout(sugT); if(ghEl) ghEl.innerHTML = ''; }
  /* ---- menu: lệnh gần đây · tuỳ chỉnh dòng lệnh · tuỳ chọn của lời nhắc (↓) ---- */
  const amenu = (x, y, items) => { const A = ACAD(); if(A && A.menu) A.menu(x, y, items); };
  function recentMenu(x, y){
    const L = RECENT.filter(n => ALIAS.get(n)).slice(0, 20);
    if(!L.length){ say('Chưa có lệnh nào.'); return; }
    amenu(x, y, [{ hd: 'Lệnh gần đây' }].concat(L.map(n => ({ t: n + ' — ' + ALIAS.get(n).d.slice(0, 60), ic: n, fn: () => runCommand(n) }))));
  }
  function custMenu(x, y){
    const ck = (on, t) => (on ? '✓ ' : ' ') + t, tg = k => () => { IS[k] = IS[k] ? 0 : 1; saveIS(); };
    amenu(x, y, [{ hd: 'Gợi ý khi gõ' },
      { t: ck(IS.auto, 'Tự hoàn thành (AutoComplete)'), fn: tg('auto') }, { t: ck(IS.append, 'Tự nối chữ (AutoAppend)'), fn: tg('append') }, { t: ck(IS.correct, 'Tự sửa lỗi gõ (AutoCorrect)'), fn: tg('correct') },
      { t: ck(IS.syn, 'Từ đồng nghĩa'), fn: tg('syn') }, { t: ck(IS.mid, 'Tìm giữa chuỗi'), fn: tg('mid') }, { t: ck(IS.sysvar, 'Tìm biến hệ thống'), fn: tg('sysvar') }, { t: ck(IS.content, 'Tìm nội dung (lớp, khối, mẫu hatch, kiểu chữ)'), fn: tg('content') },
      { t: ck(IS.freq, 'Xếp theo lệnh hay dùng'), fn: tg('freq') }, { t: ' Cài đặt tìm kiếm…', fn: () => runCommand('INPUTSEARCHOPTIONS') },
      { sep: 1 }, { t: ' Số dòng lời nhắc (CLIPROMPTLINES = ' + IS.lines + ')…', fn: () => runCommand('CLIPROMPTLINES') }, { t: ' Độ trong suốt…', fn: () => opacityDlg() },
      { t: ck(IS.dock, 'Neo ở đáy cửa sổ'), fn: tg('dock') }, { sep: 1 }, { t: ' Lịch sử dòng lệnh', k: 'F2', fn: () => toggleHistory() }, { t: ' Cửa sổ chữ', k: 'Ctrl+F2', fn: () => runCommand('TEXTSCR') }, { t: ' Sao chép lịch sử', fn: () => runCommand('COPYHIST') }]);
  }
  function opacityDlg(){
    const A = ACAD(); if(!A || !A.dialog) return; const v0 = IS.opacity;
    A.dialog({ title: 'Độ trong suốt dòng lệnh', okText: 'Xong', html: '<label class="dvd-frow"><span>Độ đục</span><span class="v"><input id="clOp" type="range" min="20" max="100" value="' + IS.opacity + '" style="width:220px"> <b id="clOpV">' + IS.opacity + '%</b></span></label>',
      onOpen: root => { const r = root.querySelector('#clOp'); r.addEventListener('input', () => { IS.opacity = +r.value; root.querySelector('#clOpV').textContent = r.value + '%'; applyLook(); }); },
      ok: () => saveIS(), cancel: () => { IS.opacity = v0; applyLook(); } });
  }
  // DYNPROMPT: ↓ ở lời nhắc có tuỳ chọn → danh sách tuỳ chọn cạnh con trỏ
  function kwMenu(){
    const A = ACAD(); const c = A && A.cur && A.cur(); const r = c && c.req; if(!r || !r.kw || !r.kw.length) return false;
    const dy = document.getElementById('dvdDyn'); let x = 0, y = 0;
    if(dy && dy.style.display === 'block'){ const b = dy.getBoundingClientRect(); x = b.left; y = b.bottom + 2; } else { const b = input.getBoundingClientRect(); x = b.left; y = b.top - 6; }
    amenu(x, y, r.kw.map(k => ({ t: k.t + '  (' + k.k + ')', fn: () => { A.input(k.k); updateBar(); } })));
    return true;
  }
  function promptHTML(){
    if(busy()) return ACAD().promptHTML();
    try{
      if(mode === 'edit'){
        const n = (editPts || []).length;
        switch(editTool){
          case 'line': return n ? 'Đường · điểm tiếp:' : 'Đường · điểm đầu:';
          case 'pline': return 'Đa tuyến · điểm (' + n + '):';
          case 'rect': return n ? 'Chữ nhật · góc đối diện:' : 'Chữ nhật · góc 1:';
          case 'circle': return n ? 'Tròn · bán kính:' : 'Tròn · tâm:';
        }
      }
      if(mode === 'measure') return 'ĐO · bấm các điểm:';
      if(mode === 'note') return 'GHI CHÚ:';
    }catch(_){}
    return 'Lệnh:';
  }
  let _lastPr = '';
  function updateBar(){
    if(!bar) return;
    const deskAcad = document.documentElement.classList.contains('acad');
    const want = (barWanted !== null ? barWanted : (deskAcad || fine())) || busy();
    bar.classList.toggle('show', !!want && hasDrawing());
    document.body.classList.toggle('dvd-cmd-on', bar.classList.contains('show'));
    const h = promptHTML(); if(h !== _lastPr){ prEl.innerHTML = h; _lastPr = h; }
    const b = busy(); const touch = !fine();
    const ph = b ? '' : (input.dataset.ph || ''); if(input.getAttribute('placeholder') !== ph && (b || input.dataset.ph)) input.setAttribute('placeholder', ph);
    okBtn.classList.toggle('show', false);
    entBtn.classList.toggle('show', b || touch);
    escBtn.classList.toggle('show', b);
  }
  function toggleBar(){
    barWanted = !(bar && bar.classList.contains('show'));
    updateBar(); if(barWanted) setTimeout(() => input.focus(), 30);
  }
  function addMobileButton(){
    const ct = $('ctools'); if(!ct) return;
    const b = document.createElement('button'); b.className = 'ctool'; b.id = 'dvdCmdBtn';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 6l5 6-5 6"/><path d="M12 18h8"/></svg>Lệnh';
    b.addEventListener('click', toggleBar);
    const p = document.createElement('button'); p.className = 'ctool'; p.id = 'dvdPropBtn';
    p.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/></svg>Thuộc tính';
    p.addEventListener('click', () => togglePalette());
    ct.appendChild(b); ct.appendChild(p);
  }

  /* ---------------- trợ giúp (F1) — danh sách lệnh + trang cách dùng của từng lệnh ----------------
     F1 khi đang chạy lệnh mở thẳng trang của lệnh đó, như trợ giúp theo ngữ cảnh của AutoCAD.
     Nội dung cách dùng: window.DVD_HELP (dvd-help.js); lời nhắc đầu: window.DVD_HELP_PROMPTS (tự sinh). */
  let helpOv = null;
  const HELP_INTRO = '<p>Gõ lệnh rồi Enter (hoặc Space). Enter trống = lặp lệnh trước. Esc = huỷ. Chuột phải = Enter khi đang chạy lệnh (giữ chuột phải = menu, Shift + chuột phải = bắt điểm). Bấm chữ vàng trong lời nhắc để chọn tuỳ chọn, hoặc gõ chữ tắt.</p>' +
    '<p>Khi chọn điểm có thể nhập: <b>x,y</b> · <b>@dx,dy</b> · <b>@dài&lt;góc</b> · <b>#x,y</b> (tuyệt đối khi nhập động) · chỉ <b>dài</b> (theo hướng con trỏ / ORTHO / POLAR / đường truy bắt) · <b>&lt;góc</b> (khoá góc) · <b>.X .Y .XY</b> (bộ lọc điểm) · <b>FROM</b> · <b>M2P</b> · <b>TT</b>. Gõ END, MID, CEN, INT, PER, TAN, NEA, QUA, NOD, INS, EXT, PAR, GCE để bắt điểm 1 lần. Lệnh trong suốt: <b>\'Z</b>, <b>\'CAL</b>, <b>\'DIST</b>, <b>\'LA</b>, <b>\'OSMODE</b>…</p>';
  function showHelp(name){
    if(!helpOv){
      helpOv = document.createElement('div'); helpOv.className = 'overlay'; helpOv.id = 'dvdHelpOverlay';
      helpOv.innerHTML = '<div class="modal wide"><h3>Trợ giúp DVDCAD — lệnh &amp; phím tắt</h3><div id="dvdHelpBody"></div><div class="modal-actions"><button class="btn-ghost" id="dvdHelpBack" style="display:none">← Danh sách lệnh</button><button class="btn-ghost" id="dvdHelpClose">Đóng</button></div></div>';
      document.body.appendChild(helpOv);
      helpOv.addEventListener('click', e => { if(e.target === helpOv) closeModal(helpOv); const r = e.target.closest('[data-hc]'); if(r){ const c = lookup(r.dataset.hc); if(c) cmdHelp(c); } });
      helpOv.querySelector('#dvdHelpClose').onclick = () => closeModal(helpOv);
      helpOv.querySelector('#dvdHelpBack').onclick = () => listHelp();
      helpOv.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeModal(helpOv); } });
    }
    const c = name ? lookup(String(name).toUpperCase().replace(/^[_.']+/, '')) : null;
    if(c) cmdHelp(c); else listHelp();
    openModal(helpOv);
  }
  function listHelp(){
    const body = helpOv.querySelector('#dvdHelpBody'); helpOv.querySelector('#dvdHelpBack').style.display = 'none';
    body.innerHTML = HELP_INTRO + '<input id="dvdHelpFind" placeholder="Tìm lệnh (tên, chữ tắt hoặc nội dung)…" style="width:100%;margin-bottom:6px"><div id="dvdHelpList"></div>';
    const f = body.querySelector('#dvdHelpFind'); f.addEventListener('input', fillHelp); f.addEventListener('keydown', e => e.stopPropagation()); fillHelp(); setTimeout(() => f.focus(), 30);
  }
  function fillHelp(){
    const q = deaccent((helpOv.querySelector('#dvdHelpFind').value || '').trim());
    const keys = [['F1', 'Trợ giúp (khi đang chạy lệnh: trang của lệnh đó)'], ['F2', 'Lịch sử dòng lệnh'], ['Ctrl+F2', 'Cửa sổ chữ (lịch sử, sao chép được)'], ['F3', 'Bật/tắt bắt điểm OSNAP'], ['F7', 'Lưới GRID'], ['F8', 'ORTHO (giữ Shift = tạm thời)'], ['F9', 'SNAP bước lưới'], ['F10', 'POLAR góc cực'], ['F11', 'Truy bắt OTRACK'], ['F12', 'Nhập động DYN'],
      ['Tab', 'Nhập động: khoá ô đang gõ (độ dài / góc, X / Y) rồi sang ô kia'], ['↑ / ↓', 'Lệnh đã gõ trước (khi không chạy lệnh) · giá trị đã nhập gần đây (khi đang ở lời nhắc) · ↓ = danh sách tuỳ chọn'],
      ['Ctrl+Z / Ctrl+Y', 'Hoàn tác / làm lại'], ['Ctrl+C / X / V', 'Sao chép / cắt / dán (giữa các bản vẽ)'], ['Ctrl+Shift+C / V', 'Sao chép kèm điểm gốc / dán đúng toạ độ'], ['Ctrl+N', 'Bản vẽ mới'], ['Ctrl+O', 'Mở'], ['Ctrl+S / Ctrl+Shift+S', 'Lưu / lưu thành'], ['Ctrl+A', 'Chọn tất cả'], ['Ctrl+Shift+A', 'Bật/tắt chọn cả nhóm/khối'], ['Ctrl+P', 'In / xuất'], ['Ctrl+1', 'Thuộc tính'], ['Ctrl+9', 'Ẩn / hiện dòng lệnh'], ['Ctrl+0', 'Toàn màn hình (ẩn ribbon)'], ['Delete', 'Xoá đối tượng đã chọn'], ['Esc', 'Huỷ lệnh / bỏ chọn'],
      ['Chuột giữa', 'Kéo màn hình · kích đúp = vừa bản vẽ'], ['Lăn chuột', 'Phóng to/nhỏ tại con trỏ'], ['Kéo trái→phải', 'Khung trùm (chọn đối tượng nằm trọn)'], ['Kéo phải→trái', 'Khung cắt (chọn đối tượng chạm khung)'], ['Shift+bấm', 'Bỏ chọn']];
    const H = window.DVD_HELP || {};
    const rows = CMDS.filter(c => !q || deaccent(c.k.join(' ') + ' ' + c.d).includes(q)).slice(0, 700);
    const kr = keys.filter(r => !q || deaccent(r[0] + ' ' + r[1]).includes(q));
    helpOv.querySelector('#dvdHelpList').innerHTML = rows.map(c => '<div data-hc="' + esc(c.k[0]) + '" style="cursor:pointer"><b>' + esc(c.k.join(' · ')) + '</b><span>' + esc(c.d) + (H[c.k[0]] ? ' <i style="color:var(--accent);font-style:normal">· cách dùng ›</i>' : '') + '</span></div>').join('') +
      (kr.length ? '<div style="border:none;padding-top:10px"><b style="color:var(--ink-faint)">PHÍM TẮT</b></div>' + kr.map(k => '<div><b>' + esc(k[0]) + '</b><span>' + esc(k[1]) + '</span></div>').join('') : '');
  }
  function cmdHelp(c){
    const body = helpOv.querySelector('#dvdHelpBody'); helpOv.querySelector('#dvdHelpBack').style.display = '';
    const n = c.k[0], H = (window.DVD_HELP || {})[n], P = (window.DVD_HELP_PROMPTS || {})[n];
    const A = ACAD(); const ico = A && A.ico && A.ICONS && (A.ICONS[n] || (window.DVDIcons && DVDIcons[n])) ? A.ico(n) : '';
    let h = '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px"><span style="width:28px;height:28px;display:inline-flex">' + ico + '</span><div><div style="font:700 16px ui-monospace,Consolas,monospace">' + esc(n) + '</div>' +
      (c.k.length > 1 ? '<div style="font-size:12px;color:var(--ink-dim)">Lệnh tắt: <b translate="no">' + esc(c.k.slice(1).join(', ')) + '</b></div>' : '') + '</div></div>';
    h += '<p>' + esc(c.d) + '</p>';
    if(H){
      if(H.u && H.u.length) h += '<div class="grp" style="font-weight:700;margin-top:8px">Cách dùng</div><ol style="margin:4px 0 6px 18px;padding:0">' + H.u.map(x => '<li style="margin:2px 0">' + esc(x) + '</li>').join('') + '</ol>';
      if(H.o && H.o.length) h += '<div class="grp" style="font-weight:700;margin-top:8px">Tuỳ chọn</div><div id="dvdHelpList" style="max-height:none">' + H.o.map(o => '<div><b translate="no">' + esc(o[0]) + '</b><span><b style="min-width:0;font-family:inherit">' + esc(o[1]) + '</b>' + (o[2] ? ' — ' + esc(o[2]) : '') + '</span></div>').join('') + '</div>';
      if(H.n) h += '<p style="margin-top:8px;color:var(--ink-dim)">' + esc(H.n) + '</p>';
    }
    if(P && (!H || !H.u)){ h += '<div class="grp" style="font-weight:700;margin-top:8px">Lời nhắc đầu tiên</div><p style="font-family:ui-monospace,Consolas,monospace;font-size:12.5px">' + partsHTML(promptStrParts(P)) + '</p>'; }
    if(!H && !P) h += '<p style="color:var(--ink-dim)">Chạy lệnh và làm theo lời nhắc ở dòng lệnh; bấm chữ vàng (hoặc gõ chữ tắt) để chọn tuỳ chọn.</p>';
    const onRib = A && A.ribbonFind && A.ribbonFind(n, true);
    h += '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn-ghost" id="dvdHelpRun">▶ Chạy ' + esc(n) + '</button>' + (onRib ? '<button type="button" class="btn-ghost" id="dvdHelpFindR">⌕ Tìm trên ribbon</button>' : '') + '</div>';
    body.innerHTML = h;
    body.querySelector('#dvdHelpRun').onclick = () => { closeModal(helpOv); if(busy() && ACAD().cmdName() === n) return; setTimeout(() => runCommand(n), 30); };
    const fr = body.querySelector('#dvdHelpFindR'); if(fr) fr.onclick = () => { closeModal(helpOv); setTimeout(() => A.ribbonFind(n), 60); };
  }

  /* ---------------- bảng Thuộc tính ---------------- */
  let pal, palBody, palWanted = false, palSig = '';
  const COLORS = [['#ff0000', 'Đỏ (1)'], ['#ffff00', 'Vàng (2)'], ['#00ff00', 'Xanh lá (3)'], ['#00ffff', 'Lục lam (4)'], ['#0000ff', 'Xanh dương (5)'], ['#ff00ff', 'Tím (6)'], ['#ffffff', 'Trắng (7)'], ['#808080', 'Xám (8)'], ['#c0c0c0', 'Xám nhạt (9)'], ['#ff7f00', 'Cam (30)']];
  function buildPalette(){
    pal = document.createElement('div'); pal.id = 'dvdProps';
    pal.innerHTML = '<div class="hd"><span>Thuộc tính</span><button type="button" title="Đóng">×</button></div><div class="bd"></div>';
    pal.querySelector('.hd button').onclick = () => togglePalette(false);
    palBody = pal.querySelector('.bd');
    document.querySelector('.stage').appendChild(pal);
    setInterval(() => { if(palWanted) refreshPalette(false); updateBar(); }, 450);
  }
  function setPropsOn(on){ const h = document.documentElement; if(h.classList.contains('dvd-props-on') === !!on) return; h.classList.toggle('dvd-props-on', !!on); if(h.classList.contains('acad')) setTimeout(() => { try{ resize(); }catch(_){} }, 0); }
  function togglePalette(on){
    palWanted = on === undefined ? !palWanted : !!on;
    try{ localStorage.setItem('dvd:props', palWanted ? '1' : '0'); }catch(_){}
    pal.classList.toggle('show', palWanted && hasDrawing());
    setPropsOn(palWanted && hasDrawing());
    palSig = ''; if(palWanted) refreshPalette(true);
  }
  const TYPE_VN = { LINE: 'Đường thẳng', CIRCLE: 'Đường tròn', ARC: 'Cung tròn', POLYLINE: 'Đa tuyến', TEXT: 'Chữ', ELLIPSE: 'Elip', SOLID: 'Vùng tô', HATCH: 'Hatch (mặt cắt)', POINT: 'Điểm', INSERT: 'Khối', XLINE: 'Đường dựng', SOLID3D: 'Khối 3D', IMAGE: 'Ảnh' };
  let _uid = new WeakMap(), _uidN = 0; const uid = o => { if(!_uid.has(o)) _uid.set(o, ++_uidN); return _uid.get(o); };
  function polyLen(v, closed){ let s = 0; for(let i = 1; i < v.length; i++) s += Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y); if(closed && v.length > 2) s += Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y); return s; }
  function polyArea(v){ let s = 0; for(let i = 0; i < v.length; i++){ const a = v[i], b = v[(i + 1) % v.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
  const layerNames = () => { try{ if(ACAD() && ACAD().layerNames) return ACAD().layerNames(); }catch(_){} try{ return layerList.map(l => l.name); }catch(_){ return ['0']; } };
  const lyOpts = (cur, extra) => { const set = new Set(layerNames()); if(cur != null) set.add(cur); return (extra || '') + [...set].map(n => '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>').join(''); };
  const NOLT = { TEXT: 1, HATCH: 1, SOLID: 1, POINT: 1, SOLID3D: 1 };
  const ltOpts = (cur, mixed) => { const A = ACAD(); const names = A && A.ltNames ? A.ltNames() : ['CONTINUOUS']; cur = mixed ? '*' : (cur || 'BYLAYER');
    const all = ['BYLAYER', 'BYBLOCK'].concat(names); if(!mixed && !all.includes(cur)) all.push(cur);
    return (mixed ? '<option value="*" selected>*nhiều*</option>' : '') + all.map(n => '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc(n === 'BYLAYER' ? 'ByLayer' : n === 'BYBLOCK' ? 'ByBlock' : n === 'CONTINUOUS' ? 'Continuous (liền)' : n) + '</option>').join('') + '<option value="OTHER">Tải thêm kiểu nét…</option>'; };
  const lwOpts = (cur, mixed) => { const A = ACAD(); const L = (A && A.LW_LIST || []).filter(v => v > 0); cur = mixed ? '*' : (cur > 0 ? cur : 'BYLAYER');
    return (mixed ? '<option value="*" selected>*nhiều*</option>' : '') + '<option value="BYLAYER"' + (cur === 'BYLAYER' ? ' selected' : '') + '>ByLayer</option>' + L.map(v => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + (v / 100).toFixed(2) + ' mm</option>').join(''); };
  const setLT = (w, v) => { if(v === 'BYLAYER') delete w.lt; else w.lt = v; };
  const setLW = (w, v) => { if(v === 'BYLAYER') delete w.lw; else w.lw = +v; };
  const colOpts = (cur, isBL, mixed) => { let h = (mixed ? '<option value="*" selected>*nhiều*</option>' : '') + '<option value="BYLAYER"' + (isBL && !mixed ? ' selected' : '') + '>ByLayer</option>'; let found = isBL || mixed; for(const [v, t] of COLORS){ const s = !mixed && !isBL && String(cur).toLowerCase() === v; if(s) found = true; h += '<option value="' + v + '"' + (s ? ' selected' : '') + '>' + t + '</option>'; } if(!found && cur) h += '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>'; h += '<option value="PICK">Chọn màu…</option>'; return h; };
  function refreshPalette(force){
    if(!pal) return;
    const show = palWanted && hasDrawing();
    pal.classList.toggle('show', show); setPropsOn(show);
    if(!show) return;
    if(pal.contains(document.activeElement) && !force) return;
    let s = selection();
    const A = ACAD(); const ln = A && A.LS ? A.LS : null;
    const sig = s.length + '|' + s.slice(0, 50).map(uid).join(',') + '|' + (s.length === 1 ? JSON.stringify(s[0]) : '') + '|' + isModelView() + '|' + (ln ? ln.cur + ln.color + ln.lt + ln.lw + ln.celts + '|' + (typeof LTSCALE !== 'undefined' ? LTSCALE : '') : '');
    if(sig === palSig && !force) return; palSig = sig;
    const editable = isModelView();
    const ro = editable ? '' : ' readonly';
    const F = (label, key, val, rdo) => '<div class="r"><label>' + label + '</label><input' + (rdo ? ' readonly' : ro) + ' data-f="' + (key || '') + '" value="' + esc(typeof val === 'number' ? fmt(val) : val) + '"></div>';
    let h = '';
    if(!s.length){
      h += '<div class="grp">Không chọn — đối tượng mới</div>';
      if(ln){ h += '<div class="r"><label>Lớp hiện hành</label><select data-g="layer">' + lyOpts(ln.cur) + '</select></div>';
              h += '<div class="r"><label>Màu</label><select data-g="col">' + colOpts(ln.color, ln.color === 'BYLAYER') + '</select></div>';
              h += '<div class="r"><label>Kiểu nét</label><select data-g="lt">' + ltOpts(ln.lt) + '</select></div>';
              h += '<div class="r"><label>Tỉ lệ kiểu nét</label><input data-g="celts" value="' + esc(fmt(ln.celts || 1)) + '"></div>';
              h += '<div class="r"><label>Bề rộng nét</label><select data-g="lw">' + lwOpts(ln.lw) + '</select></div>';
              { const A0 = ACAD(); const cv = A0 && A0.SET ? A0.SET.cetp : null; h += '<div class="r"><label>Độ trong suốt</label><select data-g="tp">' + tpOpts(cv == null ? 'BYLAYER' : cv) + '</select></div>'; }
              h += '<div class="r"><label>LTSCALE (toàn cục)</label><input data-g="ltscale" value="' + esc(fmt(typeof LTSCALE !== 'undefined' ? LTSCALE : 1)) + '"></div>'; }
      h += '<div class="grp">Bản vẽ</div>' + F('Tên', '', currentName || '', true) + F('Số đối tượng', '', String(entities.length), true) + F('Đơn vị', '', (typeof UNIT !== 'undefined' && UNIT[insunits]) || '(không rõ)', true);
      palBody.innerHTML = h + '<div class="pe">Bấm vào một nét (hoặc kéo khung) để xem và sửa thuộc tính.</div>'; bindGlobal(); return;
    }
    // nhóm / khối
    const grpIds = new Set(s.map(e => e.grp).filter(Boolean));
    if(s.length > 1){
      const by = {}; for(const e of s) by[e.type] = (by[e.type] || 0) + 1;
      h += '<div class="grp">Đang chọn ' + s.length + '</div>';
      if(grpIds.size === 1 && s.every(e => e.grp)){ const e0 = s[0]; h += F('Khối / nhóm', '', String(e0.blk || '*nhóm').replace(/^\*/, ''), true); const t = s.find(e => e.type === 'TEXT' && e.dimv != null); if(t) h += F('Nội dung kích thước', 'dimtext', t.text || ''); }
      h += Object.entries(by).map(([t, n]) => F(TYPE_VN[t] || t, '', String(n), true)).join('');
      const ly = new Set(s.map(e => e.layer || '0')), cols = new Set(s.map(e => e.bl ? 'BYLAYER' : (e.col || ''))) ;
      h += '<div class="grp">Chung</div>';
      h += '<div class="r"><label>Lớp</label><select data-m="layer"' + (editable ? '' : ' disabled') + '>' + (ly.size > 1 ? '<option selected value="*">*nhiều*</option>' : '') + lyOpts(ly.size === 1 ? [...ly][0] : null) + '</select></div>';
      const c0 = [...cols][0]; h += '<div class="r"><label>Màu</label><select data-m="col"' + (editable ? '' : ' disabled') + '>' + colOpts(c0, c0 === 'BYLAYER', cols.size > 1) + '</select></div>';
      { const lts = new Set(s.map(e => e.lt || 'BYLAYER')), lws = new Set(s.map(e => e.lw > 0 ? e.lw : 'BYLAYER')), sc = new Set(s.map(e => e.lts || 1));
        h += '<div class="r"><label>Kiểu nét</label><select data-m="lt"' + (editable ? '' : ' disabled') + '>' + ltOpts([...lts][0], lts.size > 1) + '</select></div>';
        h += '<div class="r"><label>Tỉ lệ kiểu nét</label><input data-m="lts"' + ro + ' value="' + (sc.size > 1 ? '*nhiều*' : esc(fmt([...sc][0]))) + '"></div>';
        h += '<div class="r"><label>Bề rộng nét</label><select data-m="lw"' + (editable ? '' : ' disabled') + '>' + lwOpts([...lws][0], lws.size > 1) + '</select></div>';
        const tps = new Set(s.map(e => e.tp != null ? e.tp : 'BYLAYER')); h += '<div class="r"><label>Độ trong suốt</label><select data-m="tp"' + (editable ? '' : ' disabled') + '>' + tpOpts([...tps][0], tps.size > 1) + '</select></div>'; }
      if(grpIds.size) h += '<div class="act"><button data-a="explode">Phá nhóm/khối</button></div>';
      const ex = window.DVDPalExtra ? window.DVDPalExtra(s, editable) : null; if(ex && ex.html) h += ex.html;
      palBody.innerHTML = h; bindMulti(s); if(ex && ex.bind) ex.bind(palBody); return;
    }
    const e = s[0];
    h += '<div class="grp">' + esc(TYPE_VN[e.type] || e.type) + (e.userAdded ? ' · do bạn vẽ' : '') + '</div>';
    h += '<div class="r"><label>Lớp</label><select data-f="layer"' + (editable ? '' : ' disabled') + '>' + lyOpts(e.layer || '0') + '</select></div>';
    h += '<div class="r"><label>Màu</label><span class="sw" style="background:' + esc(e.col || '#fff') + '"></span><select data-f="col"' + (editable ? '' : ' disabled') + '>' + colOpts(e.col, !!e.bl) + '</select></div>';
    if(!NOLT[e.type]){
      h += '<div class="r"><label>Kiểu nét</label><select data-f="lt"' + (editable ? '' : ' disabled') + '>' + ltOpts(e.lt) + '</select></div>';
      h += F('Tỉ lệ kiểu nét', 'lts', e.lts || 1);
    }
    h += '<div class="r"><label>Bề rộng nét</label><select data-f="lw"' + (editable ? '' : ' disabled') + '>' + lwOpts(e.lw) + '</select></div>';
    h += '<div class="r"><label>Độ trong suốt</label><select data-f="tp"' + (editable ? '' : ' disabled') + '>' + tpOpts(e.tp != null ? e.tp : 'BYLAYER') + '</select></div>';
    h += '<div class="grp">Hình học</div>';
    switch(e.type){
      case 'LINE':
        h += F('Đầu X', 'x1', e.x1) + F('Đầu Y', 'y1', e.y1) + F('Cuối X', 'x2', e.x2) + F('Cuối Y', 'y2', e.y2);
        h += F('Chiều dài', 'len', Math.hypot(e.x2 - e.x1, e.y2 - e.y1)) + F('Góc (°)', 'lang', (Math.atan2(e.y2 - e.y1, e.x2 - e.x1) * 180 / Math.PI + 360) % 360);
        h += F('ΔX', '', e.x2 - e.x1, true) + F('ΔY', '', e.y2 - e.y1, true);
        break;
      case 'CIRCLE':
        h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Bán kính', 'r', e.r) + F('Đường kính', 'dia', 2 * e.r);
        h += F('Chu vi', '', 2 * Math.PI * e.r, true) + F('Diện tích', '', Math.PI * e.r * e.r, true);
        break;
      case 'ARC':
        h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Bán kính', 'r', e.r) + F('Góc đầu (°)', 'a1', e.a1) + F('Góc cuối (°)', 'a2', e.a2);
        { let sw = (e.a2 - e.a1) % 360; if(sw < 0) sw += 360; h += F('Góc ở tâm', '', sw, true) + F('Dài cung', '', e.r * sw * Math.PI / 180, true); }
        break;
      case 'ELLIPSE': { const a = Math.hypot(e.mx, e.my); h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Bán trục lớn', 'ea', a) + F('Bán trục nhỏ', 'eb', a * (e.ratio || 1)) + F('Góc trục (°)', '', (Math.atan2(e.my, e.mx) * 180 / Math.PI + 360) % 360, true); break; }
      case 'TEXT':
        { const A2 = ACAD(); const names = A2 && A2.TS ? Object.keys(A2.TS.list) : []; const cur = e.style || ''; const opts = names.slice(); if(cur && !opts.includes(cur)) opts.unshift(cur);
          if(opts.length) h += '<div class="r"><label>Kiểu chữ</label><select data-f="tstyle"' + (editable ? '' : ' disabled') + '>' + (cur ? '' : '<option value="" selected>(theo file)</option>') + opts.map(n => '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc(n) + (A2.TS.list[n] ? ' — ' + esc(A2.TS.list[n].font) : '') + '</option>').join('') + '</select></div>'; }
        h += F('Nội dung', 'text', e.text || '') + F('Cao chữ', 'h', e.h || 0) + F('Hệ số rộng', 'xs', e.xs || 1) + F('Góc xoay (°)', 'rot', e.rot || 0) + F('Vị trí X', 'x', e.x) + F('Vị trí Y', 'y', e.y);
        h += '<div class="r"><label>Canh lề</label><select data-f="ha"' + (editable ? '' : ' disabled') + '>' + [['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải']].map(([v, t]) => '<option value="' + v + '"' + ((e.ha || 'left') === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
        break;
      case 'POLYLINE': {
        const v = e.vertices || [];
        h += '<div class="r"><label>Đóng kín</label><input type="checkbox" data-f="closed"' + (e.closed ? ' checked' : '') + (editable ? '' : ' disabled') + '></div>';
        h += F('Số đỉnh', '', String(v.length), true) + F('Chiều dài', '', polyLen(v, e.closed), true);
        if(e.closed && v.length > 2) h += F('Diện tích', '', polyArea(v), true);
        if(v[0]) h += F('Đỉnh 1 X', 'v0x', v[0].x) + F('Đỉnh 1 Y', 'v0y', v[0].y);
        break; }
      case 'HATCH': {
        const P = (ACAD() && ACAD().PATS) || {}; let ar = 0; for(const lp of (e.loops || [])){ let s2 = 0; for(let i = 0; i < lp.length; i++){ const a = lp[i], b = lp[(i + 1) % lp.length]; s2 += a.x * b.y - b.x * a.y; } ar += s2 / 2; }
        if(e.pat){ h += '<div class="r"><label>Mẫu</label><select data-f="pat"' + (editable ? '' : ' disabled') + '>' + Object.keys(P).map(k => '<option value="' + k + '"' + (k === e.pat ? ' selected' : '') + '>' + esc(P[k].name) + '</option>').join('') + '</select></div>' + F('Tỉ lệ mẫu', 'psc', e.psc || 1) + F('Góc mẫu (°)', 'pang', e.pang || 0); }
        else h += F('Kiểu', '', e.solid ? 'Tô đặc (file gốc)' : 'Mẫu của file gốc', true);
        h += F('Số vòng biên', '', String((e.loops || []).length), true) + F('Diện tích ≈', '', Math.abs(ar), true);
        break; }
      case 'POINT': h += F('X', 'x', e.x) + F('Y', 'y', e.y);
        if(e.light) h += F('Đèn — cao độ Z', 'lz', e.light.z || 0) + F('Đèn — cường độ', 'li', e.light.int || 5);
        if(e.cam3) h += F('Camera — tên', '', e.cam3.name || '', true) + F('Camera — cao mắt', 'cz', e.cam3.z || 0) + '<div class="act"><button data-a="view3d">Xem từ camera</button></div>';
        break;
      case 'SOLID3D': {
        const KN = { mesh: 'Khối lưới (sau cộng/trừ, xoay, quét…)', ext: 'Khối đùn / hộp', cone: (e.r2 != null && Math.abs(e.r2 - e.r) < 1e-12) ? 'Khối trụ' : 'Khối nón', sph: 'Khối cầu' };
        h += F('Loại', '', KN[e.k] || e.k, true);
        if(e.k === 'sph') h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Tâm Z', 'z0', e.z0 || 0) + F('Bán kính', 'r', e.r);
        else if(e.k === 'mesh'){ let z0 = Infinity, z1 = -Infinity; const v = e.v || []; for(let i = 2; i < v.length; i += 3){ if(v[i] < z0) z0 = v[i]; if(v[i] > z1) z1 = v[i]; } h += F('Số mặt tam giác', '', String((e.f || []).length / 3), true) + F('Z thấp nhất', '', z0, true) + F('Z cao nhất', '', z1, true); }
        else { if(e.k === 'cone') h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Bán kính đáy', 'r', e.r) + F('Bán kính đỉnh', 'r2', e.r2 != null ? e.r2 : e.r);
          h += F('Cao độ đáy (Z)', 'z0', e.z0 || 0) + F('Chiều cao', 'h', e.h || 0); }
        { const A2 = ACAD(); if(A2 && A2.volumeOf) h += F('Thể tích', '', Math.abs(A2.volumeOf(e)), true);
          if(A2 && A2.MATS) h += '<div class="r"><label>Vật liệu</label><select data-f="mat"' + (editable ? '' : ' disabled') + '><option value="">Theo màu</option>' + Object.keys(A2.MATS).map(k => '<option value="' + k + '"' + (e.mat === k ? ' selected' : '') + '>' + esc(A2.MATS[k].n) + '</option>').join('') + '</select></div>'; }
        h += '<div class="act"><button data-a="view3d">Xem 3D</button></div>';
        break; }
      default: { const bb = entBBox(e); if(bb) h += F('Rộng', '', bb.x1 - bb.x0, true) + F('Cao', '', bb.y1 - bb.y0, true); }
    }
    if(!editable) h += '<div class="pe">Đang xem layout — chuyển về Model để sửa.</div>';
    palBody.innerHTML = h; bindSingle(e);
    const b3 = palBody.querySelector('[data-a="view3d"]'); if(b3) b3.addEventListener('click', () => { const A2 = ACAD(); if(!A2 || !A2.open3D) return; if(e.cam3) A2.open3D({ cam: { pos: [e.x, e.y, e.cam3.z], target: [e.x + e.cam3.dx, e.y + e.cam3.dy, e.cam3.tz] } }); else A2.open3D(); });
  }
  function pickColor(cb, cur){ const AC = ACAD(); if(AC && AC.selectColor && AC.deskUI && AC.deskUI()){ AC.selectColor(cur, c => { if(c && c !== 'BYBLOCK') cb(c); }, { byLayer: true }); return; } const i = document.createElement('input'); i.type = 'color'; i.value = /^#[0-9a-f]{6}$/i.test(cur || '') ? cur : '#ffffff'; i.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0'; document.body.appendChild(i); i.addEventListener('change', () => { cb(i.value); i.remove(); }); i.addEventListener('blur', () => setTimeout(() => i.remove(), 400)); i.click(); }
  function commitSingle(e, fn){
    if(!isModelView()) return;
    if(modelEntities.indexOf(e) < 0){ palSig = ''; return; }
    const work = _deepEnt(e); delete work.userAdded; fn(work);
    if(JSON.stringify(work) === JSON.stringify(Object.assign({}, e, { userAdded: undefined }))) return;
    const A = ACAD();
    if(A && A.commit){ A.commit({ rep: [[e, work]] }); if(selEnts.has(work) || !selEnts.size){ selEnts.clear(); selEnts.add(work); try{ refreshPanSel(); }catch(_){} } palSig = ''; refreshPalette(true); return; }
    const wasSel = selEnts.has(e);
    if(replaceEntity(e, work)){ if(wasSel) afterEditKeepSel(e, work); palSig = ''; refreshPalette(true); }
  }
  const tpOpts = (v, multi) => (multi ? '<option selected value="*">*nhiều*</option>' : '') + '<option value="BYLAYER"' + (!multi && (v == null || v === 'BYLAYER') ? ' selected' : '') + '>ByLayer</option>' + [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(n => '<option value="' + n + '"' + (!multi && v != null && v !== 'BYLAYER' && +v === n ? ' selected' : '') + '>' + n + '</option>').join('');
  const setTP = (w, v) => { if(v === 'BYLAYER' || v === '' || v == null) delete w.tp; else w.tp = Math.max(0, Math.min(90, +v || 0)); };
  const setColor = (w, v) => { const A = ACAD(); if(v === 'BYLAYER'){ w.bl = 1; w.col = A ? A.layerHex(w.layer || '0') : w.col; } else { delete w.bl; w.col = v; } };
  function bindGlobal(){
    const A = ACAD(); if(!A) return;
    palBody.querySelectorAll('input[data-g]').forEach(el => el.addEventListener('keydown', ev => { ev.stopPropagation(); if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } }));
    palBody.querySelectorAll('[data-g]').forEach(el => el.addEventListener('change', () => {
      const g = el.dataset.g;
      if(g === 'layer') A.setCurLayer(el.value);
      else if(g === 'lt'){ if(el.value === 'OTHER'){ if(A.openLinetypes) A.openLinetypes(); } else A.setCurLT(el.value); }
      else if(g === 'lw') A.setCurLW(el.value);
      else if(g === 'celts' || g === 'ltscale'){ const v = num(el.value); if(!(v > 0)) say('Tỉ lệ phải > 0.'); else if(g === 'celts') A.setCELTS(v); else A.setLTScale(v); }
      else if(g === 'tp'){ A.SET.cetp = el.value === 'BYLAYER' ? null : +el.value; A.saveSet(); }
      else if(el.value === 'PICK') pickColor(c => { A.setCurColor(c); palSig = ''; refreshPalette(true); }, A.LS.color);
      else A.setCurColor(el.value);
      palSig = ''; refreshPalette(true);
    }));
  }
  function bindSingle(e){
    palBody.querySelectorAll('[data-f]').forEach(el => {
      const f = el.dataset.f; if(!f || el.readOnly) return;
      const apply = () => {
        if(f === 'layer'){ commitSingle(e, w => { const wasBL = w.bl; w.layer = el.value; if(wasBL && ACAD()) w.col = ACAD().layerHex(w.layer); }); return; }
        if(f === 'col'){ if(el.value === 'PICK'){ pickColor(c => commitSingle(e, w => setColor(w, c)), e.col); return; } commitSingle(e, w => setColor(w, el.value)); return; }
        if(f === 'closed'){ commitSingle(e, w => { w.closed = el.checked; }); return; }
        if(f === 'lt'){ if(el.value === 'OTHER'){ palSig = ''; refreshPalette(true); const A = ACAD(); if(A && A.openLinetypes) A.openLinetypes(); return; } const A = ACAD(); if(A && el.value !== 'BYLAYER' && el.value !== 'BYBLOCK' && el.value !== 'CONTINUOUS' && !LTYPES[el.value]) A.loadLT(el.value); commitSingle(e, w => setLT(w, el.value)); return; }
        if(f === 'lw'){ commitSingle(e, w => setLW(w, el.value)); return; }
        if(f === 'tp'){ commitSingle(e, w => setTP(w, el.value)); return; }
        if(f === 'lts'){ const v = num(el.value); if(!(v > 0)){ say('Tỉ lệ phải > 0.'); palSig = ''; refreshPalette(true); return; } commitSingle(e, w => { if(Math.abs(v - 1) < 1e-12) delete w.lts; else w.lts = v; }); return; }
        if(f === 'text'){ commitSingle(e, w => { w.text = el.value; }); return; }
        if(f === 'ha'){ commitSingle(e, w => { w.ha = el.value; }); return; }
        if(f === 'mat'){ commitSingle(e, w => { if(el.value) w.mat = el.value; else delete w.mat; }); return; }
        if(f === 'tstyle'){ const A2 = ACAD(); if(!el.value || !A2 || !A2.TS.list[el.value]) return; commitSingle(e, w => A2.tsApply(w, el.value)); return; }
        if(f === 'pat'){ commitSingle(e, w => { w.pat = el.value; w.solid = el.value === 'SOLID'; }); return; }
        const v = num(el.value); if(!isFinite(v)){ say('Giá trị không hợp lệ.'); palSig = ''; refreshPalette(true); return; }
        commitSingle(e, w => {
          if(f === 'len'){ const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, k = v / L; w.x2 = w.x1 + (w.x2 - w.x1) * k; w.y2 = w.y1 + (w.y2 - w.y1) * k; }
          else if(f === 'lang'){ const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), a = v * Math.PI / 180; w.x2 = w.x1 + L * Math.cos(a); w.y2 = w.y1 + L * Math.sin(a); }
          else if(f === 'dia'){ if(v > 0) w.r = v / 2; }
          else if(f === 'r' || f === 'h' || f === 'psc'){ if(v > 0) w[f] = v; }
          else if(f === 'xs'){ if(v > 0.05 && v < 20){ if(Math.abs(v - 1) < 1e-6) delete w.xs; else w.xs = v; } }
          else if(f === 'ea'){ const a = Math.hypot(w.mx, w.my) || 1; if(v > 0){ const b = a * (w.ratio || 1); w.mx *= v / a; w.my *= v / a; w.ratio = Math.min(1, b / v); } }
          else if(f === 'eb'){ const a = Math.hypot(w.mx, w.my) || 1; if(v > 0 && v <= a) w.ratio = v / a; }
          else if(f === 'r2'){ if(v >= 0) w.r2 = v; }
          else if(f === 'lz' && w.light){ w.light.z = v; } else if(f === 'li' && w.light){ if(v > 0) w.light.int = v; } else if(f === 'cz' && w.cam3){ w.cam3.z = v; w.cam3.tz = v; }
          else if(f === 'v0x' || f === 'v0y'){ if(w.vertices && w.vertices[0]) w.vertices[0][f === 'v0x' ? 'x' : 'y'] = v; }
          else w[f] = v;
        });
      };
      const tag = el.tagName;
      if(tag === 'SELECT' || el.type === 'checkbox') el.addEventListener('change', apply);
      else { el.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } if(ev.key === 'Escape'){ palSig = ''; el.blur(); refreshPalette(true); } ev.stopPropagation(); });
             el.addEventListener('change', apply); }
    });
  }
  function bindMulti(s){
    const A = ACAD();
    const run = fn => { if(!isModelView()) return; if(A && A.commit){ const rep = s.filter(e => modelEntities.indexOf(e) >= 0).map(e => { const w = _deepEnt(e); delete w.userAdded; fn(w); return [e, w]; }); A.commit({ rep }); selEnts.clear(); for(const [, w] of rep) selEnts.add(w); try{ refreshPanSel(); }catch(_){} palSig = ''; refreshPalette(true); say('Đã cập nhật ' + rep.length + ' đối tượng'); } };
    palBody.querySelectorAll('input[data-m]').forEach(el => el.addEventListener('keydown', ev => { ev.stopPropagation(); if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } }));
    palBody.querySelectorAll('[data-m]').forEach(el => el.addEventListener('change', () => {
      if(el.dataset.m === 'layer'){ if(el.value === '*') return; run(w => { const wasBL = w.bl; w.layer = el.value; if(wasBL && A) w.col = A.layerHex(w.layer); }); }
      else if(el.dataset.m === 'lt'){ if(el.value === '*') return; if(el.value === 'OTHER'){ palSig = ''; refreshPalette(true); if(A && A.openLinetypes) A.openLinetypes(); return; } run(w => { if(!NOLT[w.type]) setLT(w, el.value); }); }
      else if(el.dataset.m === 'lw'){ if(el.value === '*') return; run(w => setLW(w, el.value)); }
      else if(el.dataset.m === 'tp'){ if(el.value === '*') return; run(w => setTP(w, el.value)); }
      else if(el.dataset.m === 'lts'){ const v = num(el.value); if(!(v > 0)) return; run(w => { if(NOLT[w.type]) return; if(Math.abs(v - 1) < 1e-12) delete w.lts; else w.lts = v; }); }
      else { if(el.value === '*') return; if(el.value === 'PICK'){ pickColor(c => run(w => setColor(w, c))); return; } run(w => setColor(w, el.value)); }
    }));
    palBody.querySelectorAll('[data-f="dimtext"]').forEach(el => { el.addEventListener('keydown', ev => { ev.stopPropagation(); if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } }); el.addEventListener('change', () => { const t = s.find(e => e.type === 'TEXT' && e.dimv != null); if(!t || !A) return; const w = _deepEnt(t); delete w.userAdded; w.text = el.value; if(w.dimd){ w.dimd.ov = el.value.trim() ? el.value : null; if(!el.value.trim()) w.text = '?'; } A.commit({ rep: [[t, w]] }); selEnts.delete(t); if(modelEntities.indexOf(w) >= 0) selEnts.add(w); try{ refreshPanSel(); }catch(_){} palSig = ''; refreshPalette(true); }); });
    const ex = palBody.querySelector('[data-a="explode"]'); if(ex) ex.onclick = () => { run(w => { delete w.grp; delete w.blk; delete w.dimv; delete w.dimd; delete w.bip; delete w.bm; delete w.l0; delete w.tbld; }); };
  }

  /* ---------------- phím tắt toàn cục ---------------- */
  function typing(t){ return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  function handleCtrl(e){
    const k = e.key.toLowerCase();
    const run = n => { const c = ALIAS.get(n); if(c) execute(c); else say('Lệnh ' + n + ' chưa sẵn sàng.'); };
    if(k === 'z' && !e.shiftKey){ if(hasDrawing()) undoEdit(); return true; }
    if(k === 'y' || (k === 'z' && e.shiftKey)){ if(hasDrawing()) redoEdit(); return true; }
    if(k === 's'){ if(e.shiftKey) (window.DVDCloud ? DVDCloud.saveDxfLocal(true) : exportDXF(false)); else (window.DVDCloud ? DVDCloud.save() : say('Đã tự lưu trên máy.')); return true; }
    if(k === 'o'){ const b = $('openBtn'); if(b) b.click(); return true; }
    if(k === 'n'){ run('NEW'); return true; }
    if(k === 'a' && e.shiftKey){ const A = ACAD(); if(A) A.toggle('pickGroup'); return true; }
    if(k === 'a'){ selectAll(); return true; }
    if(k === 'p'){ if(ALIAS.get('PLOT') && document.documentElement.classList.contains('acad')) run('PLOT'); else { const b = $('exportBtn'); if(b) b.click(); } return true; }
    if(k === '1'){ togglePalette(); return true; }
    if(k === '9'){ toggleBar(); return true; }
    if(k === '0'){ document.documentElement.classList.toggle('acad-clean'); setTimeout(() => { try{ resize(); }catch(_){} }, 30); return true; }
    if(!hasDrawing()) return false;
    if(k === 'c'){ run(e.shiftKey ? 'COPYBASE' : 'COPYCLIP'); return true; }
    if(k === 'x'){ run('CUTCLIP'); return true; }
    if(k === 'v'){ run(e.shiftKey ? 'PASTEORIG' : 'PASTECLIP'); return true; }
    return false;
  }
  window.addEventListener('keydown', e => {
    if(e.defaultPrevented) return;
    const t = e.target;
    if(e.key === 'F1'){ e.preventDefault(); showHelp(busy() ? ACAD().cmdName() : (t === input && input.value.trim() ? input.value.trim().toUpperCase().replace(/^[_.'\-]+/, '').split(/\s+/)[0] : '')); return; }
    if(e.key === 'F2' && e.ctrlKey){ e.preventDefault(); runCommand('TEXTSCR'); return; }
    if(typing(t) && t !== input) return;
    if(document.querySelector('.overlay.show')) return;
    if(t === input) return;   // ô lệnh tự xử lý
    if((e.ctrlKey || e.metaKey) && !e.altKey){ if(handleCtrl(e)) e.preventDefault(); return; }
    if(e.altKey) return;
    if(e.key === 'Escape'){ if(cancelAll()) e.preventDefault(); updateBar(); return; }
    if(e.key === 'Delete' || (e.key === 'Backspace' && !busy() && (selEnts.size || infoIdx >= 0))){
      if(busy()) return;
      const s = selection(); if(s.length){ e.preventDefault(); const A = ACAD(); if(A && A.commit){ A.commit({ del: s.filter(x => !A.isLocked(x)) }, 'Đã xoá ' + s.length + ' đối tượng'); try{ clearSel(); }catch(_){} } else { const n = deleteEntityObjects(s); if(n) say('Đã xoá ' + n + ' đối tượng'); } }
      return;
    }
    if(!hasDrawing()) return;
    if(e.key === 'Enter' || e.key === ' '){
      if(searchNavOpen()) return;
      e.preventDefault(); repeatOrFinish(); updateBar(); return;
    }
    if(e.key.length === 1 && /[A-Za-z0-9@#*.,<\-?'(!_]/.test(e.key)){
      if(!bar.classList.contains('show')){ barWanted = true; updateBar(); }
      input.focus(); input.value += e.key.toUpperCase(); renderSug(); onTyped(); e.preventDefault();
    }
  });
  function searchNavOpen(){ const n = $('searchNav'); return n && n.style.display && n.style.display !== 'none'; }

  /* ---------------- khởi động ---------------- */
  buildBar(); buildPalette(); addMobileButton();
  try{ const v = localStorage.getItem('dvd:props'); if(v === '1' || (v == null && fine() && window.innerWidth >= 900)) palWanted = true; }catch(_){}
  updateBar();
  window.DVDCmd = { undefine: n => { n = String(n).toUpperCase().replace(/^[_.]+/, ''); if(!ALIAS.has(n)) return false; UNDEF.add(n); saveUndef(); return true; }, redefine: n => { n = String(n).toUpperCase().replace(/^[_.]+/, ''); const had = UNDEF.delete(n); saveUndef(); return had; }, get undefined(){ return [...UNDEF]; }, run: runCommand, commands: CMDS, register, log, refresh: () => { _lastPr = ''; updateBar(); }, toggleHistory, runTransparent, togglePalette, toggleBar, showHelp, refreshPalette: () => { palSig = ''; refreshPalette(true); }, isPaletteOn: () => palWanted, focus: () => { if(input) input.focus(); },
    opts: IS, saveOpts: saveIS, recent: () => RECENT.slice(), lookup, kwMenu, synonyms: SYN, autocorrect: AC };
  window.DVDCmd.history = () => lines.map(l => l.m);
})();
