/* DVDCAD — thao tác kiểu AutoCAD: dòng lệnh (L, PL, C, M, CO, TR...), nhập toạ độ, phím tắt, bảng Thuộc tính.
   Nạp sau script chính; gọi lại các hàm sẵn có của app (setMode, multiMove, replaceEntity, undoEdit...). */
(function(){
  'use strict';
  if(window.DVDCmd) return;
  const $ = id => document.getElementById(id);
  const say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fine = () => window.matchMedia && matchMedia('(pointer:fine)').matches && !/iPhone|iPad|Android/i.test(navigator.userAgent);
  const deaccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const num = v => { const n = parseFloat(String(v).trim().replace(',', '.')); return isFinite(n) ? n : NaN; };
  const fmt = v => { if(!isFinite(v)) return ''; const a = Math.abs(v); return a >= 1000 ? v.toFixed(1) : a >= 1 ? v.toFixed(3).replace(/\.?0+$/, '') : v.toFixed(4).replace(/\.?0+$/, ''); };
  const hasDrawing = () => { try{ return !!(entities && entities.length); }catch(_){ return false; } };

  /* ---------------- lựa chọn hiện tại ---------------- */
  function selection(){
    try{
      if(selEnts && selEnts.size) return [...selEnts];
      if(infoIdx >= 0 && entities[infoIdx]) return [entities[infoIdx]];
    }catch(_){}
    return [];
  }
  function runSingle(list, fn){
    const e = list[0]; const i = entities.indexOf(e);
    if(i < 0){ say('Không tìm thấy đối tượng.'); return; }
    editTargetIdx = i; fn();
  }
  let pending = null;   // lệnh đang chờ chọn đối tượng
  function needSel(cmd){
    if(!isModelView()){ say('Chuyển về Model để sửa đối tượng.'); return; }
    pending = cmd;
    if(mode !== 'pan') setMode('pan');
    if(fine() && !panMarquee){ panMarquee = true; const t = $('panSelToggle'); if(t) t.classList.add('active'); }
    setMsg(cmd.k[0] + ': chọn đối tượng (bấm / kéo khung) rồi nhấn Enter');
    updateBar();
  }

  /* ---------------- vẽ: chọn công cụ + nhập toạ độ ---------------- */
  function drawTool(t){
    if(!hasDrawing()){ say('Mở bản vẽ trước.'); return; }
    if(!isModelView()){ say('Chuyển về Model để vẽ.'); return; }
    if(mode !== 'edit') setMode('edit');
    const b = document.querySelector('#editRow .pill[data-edit="' + t + '"]');
    if(b) b.click();
  }
  function lastPt(){ return (editPts && editPts.length) ? editPts[editPts.length - 1] : null; }
  function cursorWorld(){ try{ const a = measureAnchor(); return toWorld(a.x, a.y); }catch(_){ return null; } }
  // Trả về điểm thế giới từ chuỗi người dùng nhập, hoặc {radius} cho đường tròn
  function parsePoint(s){
    s = String(s).trim().replace(/\s+/g, '');
    const lp = lastPt();
    let m;
    if((m = /^@?(-?[\d.]+)<(-?[\d.]+)$/.exec(s))){          // dài<góc (tương đối)
      if(!lp) return { err: 'Cần có điểm trước để dùng dài<góc.' };
      const L = num(m[1]), a = num(m[2]) * Math.PI / 180; return { p: { x: lp.x + L * Math.cos(a), y: lp.y + L * Math.sin(a) } };
    }
    if((m = /^@(-?[\d.]+)[,;](-?[\d.]+)$/.exec(s))){          // @dx,dy
      if(!lp) return { err: 'Cần có điểm trước để dùng @dx,dy.' };
      return { p: { x: lp.x + num(m[1]), y: lp.y + num(m[2]) } };
    }
    if((m = /^(-?[\d.]+)[,;](-?[\d.]+)$/.exec(s))) return { p: { x: num(m[1]), y: num(m[2]) } };   // x,y tuyệt đối
    if((m = /^(-?[\d.]+)$/.exec(s))){                          // 1 số: bán kính (tròn) hoặc dài theo hướng con trỏ
      const L = num(m[1]);
      if(editTool === 'circle' && lp) return { radius: L };
      if(!lp) return { err: 'Đặt điểm đầu trước (bấm hoặc nhập x,y).' };
      const c = cursorWorld(); let a = 0;
      if(c && Math.hypot(c.x - lp.x, c.y - lp.y) > 1e-9) a = Math.atan2(c.y - lp.y, c.x - lp.x);
      return { p: { x: lp.x + L * Math.cos(a), y: lp.y + L * Math.sin(a) } };
    }
    return null;
  }
  // Giống confirmEditPoint nhưng dùng điểm nhập tay (không bắt điểm)
  function placePoint(p){
    if(editTool === 'text'){ placeTextAt(p); editPts = []; updateEditUI(); draw(); return; }
    editPts.push(p);
    if(editTool === 'line' && editPts.length >= 2){ addEntity({ type: 'LINE', x1: editPts[0].x, y1: editPts[0].y, x2: editPts[1].x, y2: editPts[1].y }); editPts = [p]; }   // nối tiếp như AutoCAD
    else if(editTool === 'circle' && editPts.length >= 2){ const c = editPts[0], r = Math.hypot(p.x - c.x, p.y - c.y); if(r > 1e-9) addEntity({ type: 'CIRCLE', cx: c.x, cy: c.y, r }); editPts = []; }
    else if(editTool === 'rect' && editPts.length >= 2){ const a = editPts[0], b = editPts[1]; addEntity({ type: 'POLYLINE', closed: true, vertices: [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }] }); editPts = []; }
    updateEditUI(); draw();
  }
  function tryCoordInput(s){
    if(mode !== 'edit' || !['line', 'pline', 'rect', 'circle', 'text'].includes(editTool)) return false;
    const r = parsePoint(s); if(!r) return false;
    if(r.err){ setMsg(r.err); return true; }
    if(r.radius !== undefined){ const c = editPts[0]; if(!(r.radius > 0)){ setMsg('Bán kính phải > 0.'); return true; } addEntity({ type: 'CIRCLE', cx: c.x, cy: c.y, r: r.radius }); editPts = []; updateEditUI(); draw(); return true; }
    placePoint(r.p); return true;
  }

  /* ---------------- đo ---------------- */
  function measure(kind){
    if(!hasDrawing()){ say('Mở bản vẽ trước.'); return; }
    setMode('measure');
    const b = document.querySelector('#dimRow .pill[data-dim="' + kind + '"]'); if(b) b.click();
  }

  /* ---------------- zoom ---------------- */
  function zoomCmd(arg){
    const a = String(arg || '').trim().toUpperCase();
    if(a === 'W' || a === 'WINDOW'){ const b = $('zoomWinBtn'); if(b) b.click(); return; }
    if(a === 'I' || a === 'IN'){ applyZoom(1.6, W() / 2, H() / 2); draw(); return; }
    if(a === 'O' || a === 'OUT'){ applyZoom(1 / 1.6, W() / 2, H() / 2); draw(); return; }
    if(isFinite(num(a)) && a){ const f = num(a); if(f > 0){ applyZoom(f, W() / 2, H() / 2); draw(); } return; }
    if(hasDrawing()) fitView();
  }
  function selectAll(){
    if(!hasDrawing()) return;
    if(mode !== 'pan') setMode('pan');
    const b = $('panSelAll'); if(b) b.click();
  }
  function matchProp(list){
    if(list.length < 2){ say('MATCHPROP: chọn đối tượng mẫu trước, rồi chọn thêm các đối tượng cần áp (≥ 2 đối tượng).'); return; }
    const src = list[0], col = src.col, layer = src.layer || '0';
    const rest = new Set(list.slice(1));
    const keep = new Set(selEnts); selEnts.clear(); for(const e of rest) selEnts.add(e);
    batchReplace(w => { w.col = col; w.layer = layer; });
    for(const e of keep) if(!rest.has(e) && modelEntities.indexOf(e) >= 0) selEnts.add(e);
    refreshPanSel(); say('Đã áp màu & lớp của đối tượng mẫu cho ' + rest.size + ' đối tượng.');
  }

  /* ---------------- danh sách lệnh ---------------- */
  const C = (k, d, run, extra) => Object.assign({ k, d, run }, extra || {});
  const cloud = n => (...a) => { if(window.DVDCloud && DVDCloud[n]) return DVDCloud[n](...a); say('Chưa nạp module Drive.'); };
  const CMDS = [
    C(['LINE', 'L'], 'Vẽ đường thẳng', () => drawTool('line')),
    C(['PLINE', 'PL'], 'Vẽ đa tuyến (Enter để kết thúc)', () => drawTool('pline')),
    C(['RECTANG', 'REC', 'RECTANGLE'], 'Vẽ hình chữ nhật', () => drawTool('rect')),
    C(['CIRCLE', 'C'], 'Vẽ đường tròn (tâm, rồi bán kính)', () => drawTool('circle')),
    C(['TEXT', 'T', 'DT', 'MT', 'MTEXT'], 'Viết chữ', () => drawTool('text')),
    C(['FILLET', 'F'], 'Bo góc 2 đường', () => drawTool('fillet')),
    C(['CHAMFER', 'CHA'], 'Vát góc 2 đường', () => drawTool('chamfer')),
    C(['TRIM', 'TR'], 'Cắt đường theo cạnh', () => drawTool('trim')),
    C(['EXTEND', 'EX'], 'Kéo dài đường tới cạnh', () => drawTool('extend')),
    C(['MOVE', 'M'], 'Di chuyển đối tượng', s => s.length > 1 ? multiMove() : runSingle(s, moveEntity), { sel: true }),
    C(['COPY', 'CO', 'CP'], 'Sao chép đối tượng', s => s.length > 1 ? multiCopy() : runSingle(s, copyEntity), { sel: true }),
    C(['ROTATE', 'RO'], 'Xoay đối tượng', s => s.length > 1 ? multiRotate() : runSingle(s, editRotate), { sel: true }),
    C(['SCALE', 'SC'], 'Đổi tỉ lệ đối tượng', s => s.length > 1 ? multiScale() : runSingle(s, editScale), { sel: true }),
    C(['MIRROR', 'MI'], 'Đối xứng qua 2 điểm', s => runSingle(s, startMirror), { sel: true, one: true }),
    C(['OFFSET', 'O'], 'Tạo đường song song', s => runSingle(s, offsetEntityAction), { sel: true, one: true }),
    C(['ARRAY', 'AR'], 'Nhân bản dạng mảng', s => runSingle(s, arrayEntity), { sel: true, one: true }),
    C(['ERASE', 'E', 'DELETE', 'DEL'], 'Xoá đối tượng', s => { const n = deleteEntityObjects(s); if(n) say('Đã xoá ' + n + ' đối tượng'); }, { sel: true }),
    C(['MATCHPROP', 'MA'], 'Áp màu & lớp từ đối tượng đầu tiên', s => matchProp(s), { sel: true }),
    C(['PROPERTIES', 'PR', 'PROPS', 'CH', 'MO'], 'Bật/tắt bảng Thuộc tính', () => togglePalette()),
    C(['LAYER', 'LA'], 'Bảng Lớp (ẩn/hiện)', () => { const b = $('layerBtn'); if(b) b.click(); }),
    C(['SELECTALL', 'ALL'], 'Chọn tất cả', () => selectAll()),
    C(['DIST', 'DI'], 'Đo khoảng cách', () => measure('aligned')),
    C(['DIMLINEAR', 'DLI'], 'Đo ngang', () => measure('horizontal')),
    C(['DIMVERTICAL', 'DVE'], 'Đo dọc', () => measure('vertical')),
    C(['DIMALIGNED', 'DAL'], 'Đo chéo', () => measure('aligned')),
    C(['DIMRADIUS', 'DRA'], 'Đo bán kính', () => measure('radius')),
    C(['DIMDIAMETER', 'DDI'], 'Đo đường kính', () => measure('diameter')),
    C(['DIMANGULAR', 'DAN'], 'Đo góc', () => measure('angular')),
    C(['AREA', 'AA'], 'Đo diện tích', () => measure('area')),
    C(['ID'], 'Toạ độ điểm', () => measure('point')),
    C(['NOTE', 'GC', 'MARKUP'], 'Ghi chú / khoanh mây', () => { if(hasDrawing()) setMode('note'); }),
    C(['ZOOM', 'Z'], 'Phóng: Z E vừa khung · Z W khung chọn · Z 2 phóng ×2', a => zoomCmd(a), { args: true }),
    C(['ZE', 'ZA'], 'Phóng vừa bản vẽ', () => zoomCmd('E')),
    C(['ZW'], 'Phóng theo khung', () => zoomCmd('W')),
    C(['PAN', 'P'], 'Kéo màn hình / chọn', () => setMode('pan')),
    C(['REGEN', 'RE', 'REDRAW', 'R'], 'Vẽ lại màn hình', () => { try{ forceRedraw(); }catch(_){ draw(); } }),
    C(['UNDO', 'U'], 'Hoàn tác', () => { if(hasDrawing()) undoEdit(); }),
    C(['REDO'], 'Làm lại', () => { if(hasDrawing()) redoEdit(); }),
    C(['OPEN'], 'Mở bản vẽ (máy / Drive)', () => { const b = $('openBtn'); if(b) b.click(); }),
    C(['QSAVE', 'SAVE'], 'Lưu (Drive: đồng bộ · máy: DXF)', () => cloud('save')()),
    C(['SAVEAS'], 'Lưu thành DXF mới', () => cloud('saveDxfLocal')(true)),
    C(['DRIVE', 'CLOUD'], 'Google Drive · chia sẻ · cộng tác', () => cloud('openSheet')()),
    C(['SHARE'], 'Chia sẻ link bản vẽ', () => cloud('share')()),
    C(['SYNC'], 'Đồng bộ cộng tác ngay', () => cloud('syncNow')()),
    C(['EXPORT', 'PLOT', 'PRINT', 'PDF'], 'Xuất PNG / PDF / DXF / In', () => { const b = $('exportBtn'); if(b) b.click(); }),
    C(['FIND', 'SEARCH'], 'Tìm chữ trong bản vẽ', () => { const b = $('searchBtn'); if(b) b.click(); }),
    C(['GOTO'], 'Đi tới toạ độ', () => { const b = $('openGoto'); if(b){ const d = $('displayBtn'); if(d) d.click(); setTimeout(() => b.click(), 30); } }),
    C(['COMPARE'], 'So sánh 2 bản vẽ', () => { const b = $('compareBtn'); if(b) b.click(); }),
    C(['HELP', '?'], 'Danh sách lệnh', () => showHelp())
  ];
  const ALIAS = new Map(); for(const c of CMDS) for(const k of c.k) ALIAS.set(k, c);

  let lastCmd = null;
  function runCommand(text){
    const raw = String(text || '').trim();
    if(!raw){ return repeatOrFinish(); }
    if(tryCoordInput(raw)){ updateBar(); return; }
    const parts = raw.split(/\s+/); const name = parts[0].toUpperCase(); const arg = parts.slice(1).join(' ');
    const c = ALIAS.get(name);
    if(!c){ setMsg('Không có lệnh "' + raw + '". Gõ ? để xem danh sách.'); return; }
    execute(c, arg);
  }
  function execute(c, arg){
    lastCmd = c; pending = null;
    if(c.sel){
      if(!hasDrawing()){ say('Mở bản vẽ trước.'); return; }
      const s = selection();
      if(!s.length){ needSel(c); return; }
      if(c.one && s.length > 1){ setMsg(c.k[0] + ' chỉ áp cho 1 đối tượng — đang dùng đối tượng đầu tiên.'); }
      setMsg(c.k[0] + ' — ' + c.d);
      c.run(s); updateBar(); return;
    }
    setMsg(c.k[0] + ' — ' + c.d);
    c.run(arg); updateBar();
  }
  function repeatOrFinish(){
    if(pending){
      const s = selection();
      if(!s.length){ setMsg('Chưa chọn đối tượng nào. Esc để huỷ.'); return; }
      const c = pending; pending = null; execute(c); return;
    }
    if(mode === 'edit' && editTool === 'pline' && editPts && editPts.length){ finishEdit(); setMsg('Đã kết thúc đa tuyến.'); return; }
    if(mode === 'edit' && editPts && editPts.length){ editPts = []; updateEditUI(); draw(); setMsg('Đã kết thúc lệnh.'); return; }
    if(lastCmd){ execute(lastCmd); return; }
  }
  function cancelAll(){
    pending = null;
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

  /* ---------------- thanh dòng lệnh ---------------- */
  const CSS = `
  #dvdCmd{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:8;width:min(620px,calc(100% - 200px));display:none;flex-direction:column;gap:4px}
  #dvdCmd.show{display:flex}
  @media (max-width:700px){ #dvdCmd{width:calc(100% - 24px)} }
  #dvdCmd .msg{align-self:flex-start;max-width:100%;font-size:11.5px;color:var(--ink-dim);background:rgba(17,21,29,.88);border:1px solid var(--line);border-radius:8px;padding:4px 9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #dvdCmd .msg:empty{display:none}
  #dvdCmd .box{display:flex;align-items:center;gap:8px;background:rgba(10,12,17,.94);border:1px solid var(--line);border-radius:10px;padding:0 6px 0 11px;box-shadow:var(--shadow);backdrop-filter:blur(8px)}
  #dvdCmd .box:focus-within{border-color:var(--accent)}
  #dvdCmd .pr{font:600 12px ui-monospace,Menlo,Consolas,monospace;color:var(--accent);white-space:nowrap;max-width:52%;overflow:hidden;text-overflow:ellipsis}
  #dvdCmd input{flex:1;min-width:60px;background:transparent;border:none;outline:none;color:var(--ink);font:600 13.5px ui-monospace,Menlo,Consolas,monospace;padding:10px 2px;text-transform:uppercase}
  #dvdCmd input::placeholder{text-transform:none;color:var(--ink-faint);font-weight:500}
  #dvdCmd .ok{font-family:inherit;font-size:12px;font-weight:700;border-radius:8px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);padding:6px 10px;cursor:pointer;display:none}
  #dvdCmd .ok.show{display:block}
  #dvdCmd .sug{display:none;flex-direction:column;background:rgba(17,21,29,.98);border:1px solid var(--line);border-radius:10px;overflow:hidden;box-shadow:var(--shadow)}
  #dvdCmd .sug.show{display:flex}
  #dvdCmd .sug div{display:flex;gap:10px;padding:8px 11px;font-size:12.5px;cursor:pointer;color:var(--ink-dim)}
  #dvdCmd .sug div b{min-width:84px;color:var(--ink);font:700 12px ui-monospace,Menlo,Consolas,monospace}
  #dvdCmd .sug div.on,#dvdCmd .sug div:hover{background:rgba(56,189,248,.14);color:var(--ink)}
  #dvdProps{position:absolute;right:66px;top:62px;z-index:8;width:270px;max-height:calc(100% - 140px);overflow-y:auto;display:none;
    background:rgba(17,21,29,.96);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);backdrop-filter:blur(8px);font-size:12.5px}
  #dvdProps.show{display:block}
  @media (max-width:700px){ #dvdProps{left:12px;right:12px;width:auto;top:auto;bottom:62px;max-height:45%} }
  #dvdProps .hd{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);font-weight:700;position:sticky;top:0;background:rgba(17,21,29,.98)}
  #dvdProps .hd span{flex:1}
  #dvdProps .hd button{background:none;border:none;color:var(--ink-dim);font-size:18px;cursor:pointer;line-height:1}
  #dvdProps .grp{padding:6px 12px 2px;color:var(--ink-faint);font-size:10.5px;font-weight:700;letter-spacing:.7px}
  #dvdProps .r{display:flex;align-items:center;gap:8px;padding:4px 12px}
  #dvdProps .r label{flex:0 0 92px;color:var(--ink-dim)}
  #dvdProps .r input,#dvdProps .r select{flex:1;min-width:0;background:var(--bg-canvas);border:1px solid var(--line);border-radius:7px;color:var(--ink);font:500 12.5px ui-monospace,Menlo,Consolas,monospace;padding:6px 7px;outline:none}
  #dvdProps .r input:focus,#dvdProps .r select:focus{border-color:var(--accent)}
  #dvdProps .r input[readonly]{color:var(--ink-dim);background:transparent;border-color:transparent}
  #dvdProps .r input[type=color]{padding:1px;height:28px}
  #dvdProps .r input[type=checkbox]{flex:0 0 auto;width:18px;height:18px}
  #dvdProps .empty{padding:14px 12px;color:var(--ink-dim);line-height:1.5}
  body.dvd-cmd-on .toast{bottom:auto;top:calc(env(safe-area-inset-top) + 128px)}
  #dvdHelpList{max-height:56vh;overflow-y:auto;margin-top:6px}
  #dvdHelpList div{display:flex;gap:10px;padding:6px 2px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--ink-dim)}
  #dvdHelpList b{min-width:118px;color:var(--ink);font:700 12px ui-monospace,Menlo,Consolas,monospace}
  `;
  let bar, input, msgEl, prEl, sugEl, okBtn, sugIdx = -1, sugList = [], hist = [], histIdx = -1, barWanted = null;
  function buildBar(){
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    bar = document.createElement('div'); bar.id = 'dvdCmd';
    bar.innerHTML = '<div class="sug"></div><div class="msg"></div><div class="box"><span class="pr">Lệnh:</span><input autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="gõ lệnh: L, PL, C, M, CO, TR, E… (? = trợ giúp)"><button class="ok" type="button">✓ Xong chọn</button></div>';
    const stage = document.querySelector('.stage'); stage.appendChild(bar);
    input = bar.querySelector('input'); msgEl = bar.querySelector('.msg'); prEl = bar.querySelector('.pr'); sugEl = bar.querySelector('.sug'); okBtn = bar.querySelector('.ok');
    okBtn.addEventListener('click', () => { repeatOrFinish(); updateBar(); });
    input.addEventListener('input', renderSug);
    input.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        let v = input.value;
        if(sugIdx >= 0 && sugList[sugIdx] && !tryParseCoordOnly(v)) v = sugList[sugIdx].k[0];
        input.value = ''; hideSug();
        if(v.trim()){ hist.push(v.trim()); if(hist.length > 50) hist.shift(); }
        histIdx = -1;
        runCommand(v);
        if(!fine()) input.blur();
        return;
      }
      if(e.key === 'Escape'){ e.preventDefault(); if(input.value){ input.value = ''; hideSug(); } else { cancelAll(); setMsg('*Huỷ*'); input.blur(); } updateBar(); return; }
      if(e.key === 'ArrowUp'){ e.preventDefault(); if(sugEl.classList.contains('show')){ moveSug(-1); } else if(hist.length){ histIdx = histIdx < 0 ? hist.length - 1 : Math.max(0, histIdx - 1); input.value = hist[histIdx]; } return; }
      if(e.key === 'ArrowDown'){ e.preventDefault(); if(sugEl.classList.contains('show')){ moveSug(1); } else if(histIdx >= 0){ histIdx = Math.min(hist.length, histIdx + 1); input.value = hist[histIdx] || ''; if(histIdx >= hist.length) histIdx = -1; } return; }
      if(e.key === 'Tab'){ e.preventDefault(); if(sugList[sugIdx >= 0 ? sugIdx : 0]){ input.value = sugList[sugIdx >= 0 ? sugIdx : 0].k[0]; hideSug(); } return; }
      if((e.ctrlKey || e.metaKey) && /^[zZyY]$/.test(e.key) && !input.value){ e.preventDefault(); handleCtrl(e); }
    });
    input.addEventListener('blur', () => setTimeout(hideSug, 150));
    sugEl.addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if(!d) return; e.preventDefault(); const c = sugList[+d.dataset.i]; input.value = ''; hideSug(); if(c){ hist.push(c.k[0]); execute(c); } });
  }
  function tryParseCoordOnly(v){ return /^\s*@?-?[\d.]+\s*([,;<]\s*-?[\d.]+)?\s*$/.test(v); }
  function renderSug(){
    const q = input.value.trim().toUpperCase();
    if(!q || tryParseCoordOnly(q)){ hideSug(); return; }
    const dq = deaccent(q);
    const exact = [], pre = [], desc = [];
    for(const c of CMDS){
      if(c.k.includes(q)) exact.push(c);
      else if(c.k.some(k => k.startsWith(q))) pre.push(c);
      else if(dq.length >= 3 && deaccent(c.d).includes(dq)) desc.push(c);
    }
    sugList = [...exact, ...pre, ...desc].slice(0, 7); sugIdx = sugList.length ? 0 : -1;
    if(!sugList.length){ hideSug(); return; }
    sugEl.innerHTML = sugList.map((c, i) => '<div data-i="' + i + '" class="' + (i === sugIdx ? 'on' : '') + '"><b>' + esc(c.k.slice(0, 2).join(' · ')) + '</b><span>' + esc(c.d) + '</span></div>').join('');
    sugEl.classList.add('show');
  }
  function moveSug(d){ if(!sugList.length) return; sugIdx = (sugIdx + d + sugList.length) % sugList.length; sugEl.querySelectorAll('[data-i]').forEach((x, i) => x.classList.toggle('on', i === sugIdx)); }
  function hideSug(){ sugEl.classList.remove('show'); sugList = []; sugIdx = -1; }
  let msgT = 0;
  function setMsg(m){ if(!msgEl) return; msgEl.textContent = m || ''; msgT = Date.now(); }
  function promptText(){
    if(pending) return pending.k[0] + ' · chọn đối tượng:';
    if(mode === 'edit'){
      const n = (editPts || []).length;
      switch(editTool){
        case 'line': return n ? 'LINE · điểm tiếp (@dx,dy · dài<góc · dài):' : 'LINE · điểm đầu (bấm / x,y):';
        case 'pline': return n ? 'PLINE · điểm tiếp (Enter = xong):' : 'PLINE · điểm đầu:';
        case 'rect': return n ? 'REC · góc đối diện (@rộng,cao):' : 'REC · góc thứ nhất:';
        case 'circle': return n ? 'CIRCLE · bán kính:' : 'CIRCLE · tâm:';
        case 'text': return 'TEXT · điểm đặt chữ:';
        case 'fillet': case 'chamfer': return editTool.toUpperCase() + ' · chạm 2 đường:';
        case 'trim': case 'extend': return editTool.toUpperCase() + ' · chạm cạnh rồi đường:';
      }
    }
    if(mode === 'measure') return 'ĐO · bấm các điểm:';
    if(mode === 'note') return 'GHI CHÚ:';
    return 'Lệnh:';
  }
  function updateBar(){
    if(!bar) return;
    const want = barWanted !== null ? barWanted : fine();
    bar.classList.toggle('show', !!want && hasDrawing());
    document.body.classList.toggle('dvd-cmd-on', bar.classList.contains('show'));
    prEl.textContent = promptText();
    okBtn.classList.toggle('show', !!pending);
    if(msgEl.textContent && Date.now() - msgT > 9000 && !pending) msgEl.textContent = '';
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

  /* ---------------- trợ giúp ---------------- */
  let helpOv = null;
  function showHelp(){
    if(!helpOv){
      helpOv = document.createElement('div'); helpOv.className = 'overlay'; helpOv.id = 'dvdHelpOverlay';
      helpOv.innerHTML = '<div class="modal"><h3>Lệnh &amp; phím tắt</h3><p>Gõ lệnh rồi Enter (hoặc Space). Enter trống = lặp lệnh trước. Esc = huỷ. Khi vẽ có thể nhập toạ độ: <b>x,y</b> · <b>@dx,dy</b> · <b>dài&lt;góc</b> · hoặc chỉ <b>dài</b> (theo hướng con trỏ).</p><div id="dvdHelpList"></div><div class="modal-actions"><button class="btn-ghost" id="dvdHelpClose">Đóng</button></div></div>';
      document.body.appendChild(helpOv);
      helpOv.addEventListener('click', e => { if(e.target === helpOv) closeModal(helpOv); });
      helpOv.querySelector('#dvdHelpClose').onclick = () => closeModal(helpOv);
      const keys = [['Ctrl+Z / Ctrl+Y', 'Hoàn tác / làm lại'], ['Ctrl+S', 'Lưu (Drive hoặc DXF trên máy)'], ['Ctrl+Shift+S', 'Lưu thành DXF mới'], ['Ctrl+O', 'Mở bản vẽ'], ['Ctrl+A', 'Chọn tất cả'], ['Ctrl+P', 'Xuất / in'], ['Delete', 'Xoá đối tượng đã chọn'], ['Esc', 'Huỷ lệnh / bỏ chọn'], ['F1', 'Bảng này'], ['Ctrl+1', 'Bảng Thuộc tính']];
      helpOv.querySelector('#dvdHelpList').innerHTML = CMDS.map(c => '<div><b>' + esc(c.k.join(' · ')) + '</b><span>' + esc(c.d) + '</span></div>').join('') + keys.map(k => '<div><b>' + esc(k[0]) + '</b><span>' + esc(k[1]) + '</span></div>').join('');
    }
    openModal(helpOv);
  }

  /* ---------------- bảng Thuộc tính ---------------- */
  let pal, palBody, palWanted = false, palSig = '';
  function buildPalette(){
    pal = document.createElement('div'); pal.id = 'dvdProps';
    pal.innerHTML = '<div class="hd"><span>Thuộc tính</span><button type="button" title="Đóng">×</button></div><div class="bd"></div>';
    pal.querySelector('.hd button').onclick = () => togglePalette(false);
    palBody = pal.querySelector('.bd');
    document.querySelector('.stage').appendChild(pal);
    setInterval(() => { if(palWanted) refreshPalette(false); updateBar(); }, 450);
  }
  function togglePalette(on){
    palWanted = on === undefined ? !palWanted : !!on;
    try{ localStorage.setItem('dvd:props', palWanted ? '1' : '0'); }catch(_){}
    pal.classList.toggle('show', palWanted && hasDrawing());
    palSig = ''; if(palWanted) refreshPalette(true);
  }
  const TYPE_VN = { LINE: 'Đường thẳng', CIRCLE: 'Đường tròn', ARC: 'Cung tròn', POLYLINE: 'Đa tuyến', TEXT: 'Chữ', ELLIPSE: 'Elip', SOLID: 'Vùng tô', HATCH: 'Mặt cắt (hatch)', POINT: 'Điểm', INSERT: 'Khối' };
  let _uid = new WeakMap(), _uidN = 0; const uid = o => { if(!_uid.has(o)) _uid.set(o, ++_uidN); return _uid.get(o); };
  function polyLen(v, closed){ let s = 0; for(let i = 1; i < v.length; i++) s += Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y); if(closed && v.length > 2) s += Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y); return s; }
  function polyArea(v){ let s = 0; for(let i = 0; i < v.length; i++){ const a = v[i], b = v[(i + 1) % v.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
  function refreshPalette(force){
    if(!pal) return;
    pal.classList.toggle('show', palWanted && hasDrawing());
    if(!palWanted || !hasDrawing()) return;
    if(pal.contains(document.activeElement) && !force) return;   // đang gõ trong bảng -> không vẽ lại
    const s = selection();
    const sig = s.length + '|' + s.slice(0, 50).map(uid).join(',') + '|' + (s.length === 1 ? JSON.stringify(s[0]) : '') + '|' + isModelView();
    if(sig === palSig && !force) return; palSig = sig;
    if(!s.length){ palBody.innerHTML = '<div class="empty">Chưa chọn đối tượng. Bấm vào một nét ở chế độ Di chuyển (hoặc kéo khung) để xem và sửa thuộc tính.</div>'; return; }
    const editable = isModelView();
    const ro = editable ? '' : ' readonly';
    let layers = ['0']; try{ if(layerList && layerList.length) layers = layerList.map(l => l.name); }catch(_){}
    const lyOpts = cur => { const set = new Set(layers); set.add(cur); return [...set].map(n => '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>').join(''); };
    let h = '';
    if(s.length > 1){
      const by = {}; for(const e of s) by[e.type] = (by[e.type] || 0) + 1;
      h += '<div class="grp">ĐANG CHỌN ' + s.length + '</div>';
      h += Object.entries(by).map(([t, n]) => '<div class="r"><label>' + esc(TYPE_VN[t] || t) + '</label><input readonly value="' + n + '"></div>').join('');
      const ly = new Set(s.map(e => e.layer || '0')), col = new Set(s.map(e => e.col || ''));
      h += '<div class="grp">CHUNG</div>';
      h += '<div class="r"><label>Lớp</label><select data-m="layer"' + (editable ? '' : ' disabled') + '>' + (ly.size > 1 ? '<option selected>*nhiều*</option>' : '') + lyOpts(ly.size === 1 ? [...ly][0] : '') + '</select></div>';
      h += '<div class="r"><label>Màu</label><input type="color" data-m="col" value="' + esc(col.size === 1 && /^#[0-9a-f]{6}$/i.test([...col][0]) ? [...col][0] : '#ffffff') + '"' + (editable ? '' : ' disabled') + '></div>';
      palBody.innerHTML = h; bindMulti(s); return;
    }
    const e = s[0];
    h += '<div class="grp">' + esc(TYPE_VN[e.type] || e.type) + (e.userAdded ? ' · do bạn vẽ' : '') + '</div>';
    h += '<div class="r"><label>Lớp</label><select data-f="layer"' + (editable ? '' : ' disabled') + '>' + lyOpts(e.layer || '0') + '</select></div>';
    h += '<div class="r"><label>Màu</label><input type="color" data-f="col" value="' + esc(/^#[0-9a-f]{6}$/i.test(e.col || '') ? e.col : '#ffffff') + '"' + (editable ? '' : ' disabled') + '></div>';
    const F = (label, key, val, rdo) => '<div class="r"><label>' + label + '</label><input' + (rdo ? ' readonly' : ro) + ' data-f="' + (key || '') + '" value="' + esc(typeof val === 'number' ? fmt(val) : val) + '"></div>';
    h += '<div class="grp">HÌNH HỌC</div>';
    switch(e.type){
      case 'LINE':
        h += F('Đầu X', 'x1', e.x1) + F('Đầu Y', 'y1', e.y1) + F('Cuối X', 'x2', e.x2) + F('Cuối Y', 'y2', e.y2);
        h += F('Chiều dài', 'len', Math.hypot(e.x2 - e.x1, e.y2 - e.y1)) + F('Góc (°)', '', (Math.atan2(e.y2 - e.y1, e.x2 - e.x1) * 180 / Math.PI + 360) % 360, true);
        break;
      case 'CIRCLE':
        h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Bán kính', 'r', e.r) + F('Đường kính', 'dia', 2 * e.r);
        h += F('Chu vi', '', 2 * Math.PI * e.r, true) + F('Diện tích', '', Math.PI * e.r * e.r, true);
        break;
      case 'ARC':
        h += F('Tâm X', 'cx', e.cx) + F('Tâm Y', 'cy', e.cy) + F('Bán kính', 'r', e.r) + F('Góc đầu (°)', 'a1', e.a1) + F('Góc cuối (°)', 'a2', e.a2);
        { let sw = (e.a2 - e.a1) % 360; if(sw < 0) sw += 360; h += F('Dài cung', '', e.r * sw * Math.PI / 180, true); }
        break;
      case 'TEXT':
        h += F('Nội dung', 'text', e.text || '') + F('Cao chữ', 'h', e.h || 0) + F('Góc xoay (°)', 'rot', e.rot || 0) + F('Vị trí X', 'x', e.x) + F('Vị trí Y', 'y', e.y);
        break;
      case 'POLYLINE': {
        const v = e.vertices || [];
        h += '<div class="r"><label>Đóng kín</label><input type="checkbox" data-f="closed"' + (e.closed ? ' checked' : '') + (editable ? '' : ' disabled') + '></div>';
        h += F('Số đỉnh', '', String(v.length), true) + F('Chiều dài', '', polyLen(v, e.closed), true);
        if(e.closed && v.length > 2) h += F('Diện tích', '', polyArea(v), true);
        if(v[0]) h += F('Đỉnh 1 X', 'v0x', v[0].x) + F('Đỉnh 1 Y', 'v0y', v[0].y);
        break; }
      case 'POINT': h += F('X', 'x', e.x) + F('Y', 'y', e.y); break;
      default: { const bb = entBBox(e); if(bb) h += F('Rộng', '', bb.x1 - bb.x0, true) + F('Cao', '', bb.y1 - bb.y0, true); }
    }
    if(!editable) h += '<div class="empty">Đang xem layout — chuyển về Model để sửa.</div>';
    palBody.innerHTML = h; bindSingle(e);
  }
  function commitSingle(e, fn){
    if(!isModelView()) return;
    if(modelEntities.indexOf(e) < 0){ palSig = ''; return; }
    const work = _deepEnt(e); fn(work);
    if(JSON.stringify(work) === JSON.stringify(e)) return;
    const wasSel = selEnts.has(e), idx = infoIdx;
    if(replaceEntity(e, work)){
      if(wasSel) afterEditKeepSel(e, work); else if(idx >= 0){ const i = entities.indexOf(work); if(i >= 0) showObjectInfo(i); }
      palSig = ''; refreshPalette(true);
    }
  }
  function bindSingle(e){
    palBody.querySelectorAll('[data-f]').forEach(el => {
      const f = el.dataset.f; if(!f || el.readOnly) return;
      const apply = () => {
        if(f === 'layer'){ commitSingle(e, w => { w.layer = el.value; }); return; }
        if(f === 'col'){ commitSingle(e, w => { w.col = el.value; }); return; }
        if(f === 'closed'){ commitSingle(e, w => { w.closed = el.checked; }); return; }
        if(f === 'text'){ commitSingle(e, w => { w.text = el.value; }); return; }
        const v = num(el.value); if(!isFinite(v)){ say('Giá trị không hợp lệ.'); palSig = ''; refreshPalette(true); return; }
        commitSingle(e, w => {
          if(f === 'len'){ const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, k = v / L; w.x2 = w.x1 + (w.x2 - w.x1) * k; w.y2 = w.y1 + (w.y2 - w.y1) * k; }
          else if(f === 'dia'){ if(v > 0) w.r = v / 2; }
          else if(f === 'r'){ if(v > 0) w.r = v; }
          else if(f === 'h'){ if(v > 0) w.h = v; }
          else if(f === 'v0x' || f === 'v0y'){ if(w.vertices && w.vertices[0]) w.vertices[0][f === 'v0x' ? 'x' : 'y'] = v; }
          else w[f] = v;
        });
      };
      const tag = el.tagName;
      if(tag === 'SELECT' || el.type === 'color' || el.type === 'checkbox') el.addEventListener('change', apply);
      else { el.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } if(ev.key === 'Escape'){ palSig = ''; el.blur(); refreshPalette(true); } ev.stopPropagation(); });
             el.addEventListener('change', apply); }
    });
  }
  function bindMulti(s){
    palBody.querySelectorAll('[data-m]').forEach(el => el.addEventListener('change', () => {
      if(!isModelView()) return;
      const keep = new Set(selEnts); selEnts.clear(); for(const e of s) if(modelEntities.indexOf(e) >= 0) selEnts.add(e);
      if(el.dataset.m === 'layer'){ if(el.value === '*nhiều*') return; batchReplace(w => { w.layer = el.value; }); }
      else batchReplace(w => { w.col = el.value; });
      refreshPanSel(); palSig = ''; refreshPalette(true); say('Đã cập nhật ' + selEnts.size + ' đối tượng');
    }));
  }

  /* ---------------- phím tắt toàn cục ---------------- */
  function typing(t){ return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  function handleCtrl(e){
    const k = e.key.toLowerCase();
    if(k === 'z' && !e.shiftKey){ if(hasDrawing()) undoEdit(); return true; }
    if(k === 'y' || (k === 'z' && e.shiftKey)){ if(hasDrawing()) redoEdit(); return true; }
    if(k === 's'){ if(e.shiftKey) (window.DVDCloud ? DVDCloud.saveDxfLocal(true) : exportDXF(false)); else (window.DVDCloud ? DVDCloud.save() : say('Đã tự lưu trên máy.')); return true; }
    if(k === 'o'){ const b = $('openBtn'); if(b) b.click(); return true; }
    if(k === 'a'){ selectAll(); return true; }
    if(k === 'p'){ const b = $('exportBtn'); if(b) b.click(); return true; }
    if(k === '1'){ togglePalette(); return true; }
    return false;
  }
  window.addEventListener('keydown', e => {
    if(e.defaultPrevented) return;
    const t = e.target;
    if(e.key === 'F1'){ e.preventDefault(); showHelp(); return; }
    if(typing(t) && t !== input) return;
    if(document.querySelector('.overlay.show')) return;
    if(t === input) return;   // ô lệnh tự xử lý
    if((e.ctrlKey || e.metaKey) && !e.altKey){ if(handleCtrl(e)) e.preventDefault(); return; }
    if(e.altKey) return;
    if(e.key === 'Escape'){ if(cancelAll()) { e.preventDefault(); setMsg('*Huỷ*'); } return; }
    if(e.key === 'Delete' || (e.key === 'Backspace' && (selEnts.size || infoIdx >= 0))){
      const s = selection(); if(s.length){ e.preventDefault(); const n = deleteEntityObjects(s); if(n) say('Đã xoá ' + n + ' đối tượng'); }
      return;
    }
    if(!hasDrawing()) return;
    if(e.key === 'Enter' || e.key === ' '){
      if(searchNavOpen()) return;
      e.preventDefault(); repeatOrFinish(); updateBar(); return;
    }
    if(e.key.length === 1 && /[A-Za-z0-9@.,<\-?]/.test(e.key)){
      if(!bar.classList.contains('show')){ barWanted = true; updateBar(); }
      input.focus(); input.value += e.key.toUpperCase(); renderSug(); e.preventDefault();
    }
  });
  function searchNavOpen(){ const n = $('searchNav'); return n && n.style.display && n.style.display !== 'none'; }

  /* ---------------- khởi động ---------------- */
  buildBar(); buildPalette(); addMobileButton();
  try{ if(localStorage.getItem('dvd:props') === '1' && fine()) palWanted = true; }catch(_){}
  updateBar();
  window.DVDCmd = { run: runCommand, commands: CMDS, togglePalette, toggleBar, showHelp, parsePoint };
})();
