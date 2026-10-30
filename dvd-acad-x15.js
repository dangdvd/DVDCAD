/* DVDCAD v5e — bổ sung lệnh AutoCAD còn thiếu
   · Độ trong suốt: TRANSPARENCY (hiện / ẩn trong suốt) · CETRANSPARENCY · thuộc tính "Độ trong suốt" trong bảng Thuộc tính · DXF mã 440
   · Giao diện: RIBBON / RIBBONCLOSE · COMMANDLINE / COMMANDLINEHIDE · PROPERTIESCLOSE · LAYERCLOSE · HIDEPALETTES / SHOWPALETTES · GRAPHSCR · NAVBAR · WORKSPACE · QCCLOSE
   · File: QUIT / EXIT / QQUIT · SAVEALL · REVERT · PREVIEW · LOGFILEON / LOGFILEOFF
   · Lệnh: UNDEFINE / REDEFINE · MPEDIT · DIMLAYER · XDLIST · DCLINEAR · VIEWRES · LAYERPMODE · ARRAYCLOSE
   · Tên gọi khác: CLASSICLAYER · EATTEXT · GOTOURL · NEWVIEW · LAYOUTWIZARD · 3DFORBIT / 3DCORBIT / 3DPAN / 3DZOOM / 3DSWIVEL / 3DDISTANCE · 3DFLY · 3DCLIP
   · 3D: MESH (khối lưới cơ bản) · CONVTOMESH · CONVTOSOLID · CONVTOSURFACE · 3DFACE · THICKEN */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x15 || !window.DVDCmd) return; A._x15 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const alias = (keys, target, desc) => plain(keys, desc, () => DVDCmd.run(target));
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const later = fn => setTimeout(fn, 0);
  const MEM = A.MEM || (A.MEM = {});
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);

  /* =====================================================================
     1) ĐỘ TRONG SUỐT
     ===================================================================== */
  { const _np = A.newProps; A.newProps = function(e){ const r = _np.apply(this, arguments); try{ if(A.SET.cetp != null && e) e.tp = A.SET.cetp; }catch(_){} return r; }; }
  const tpParse = s => { const t = String(s == null ? '' : s).trim().toUpperCase(); if(t === 'BYLAYER' || t === 'BL' || t === '') return null; const v = +t.replace(',', '.'); return isFinite(v) ? Math.max(0, Math.min(90, Math.round(v))) : undefined; };
  cmd(['CETRANSPARENCY'], 'Độ trong suốt cho đối tượng mới (ByLayer hoặc 0–90 %)', async () => {
    const cur = A.SET.cetp == null ? 'ByLayer' : String(A.SET.cetp); const r = await A.getStr('Độ trong suốt cho đối tượng mới (ByLayer, 0–90) <' + cur + '>', { def: cur }); if(r.none) return;
    const v = tpParse(r.str); if(v === undefined){ log('Nhập ByLayer hoặc số 0–90.'); return; } A.SET.cetp = v; A.saveSet(); log('CETRANSPARENCY = ' + (v == null ? 'ByLayer' : v));
  });
  cmd(['TRANSPARENCY', 'TPDISPLAY', 'TRANSPARENCYDISPLAY'], 'Hiện / ẩn độ trong suốt của đối tượng (như nút trên thanh trạng thái AutoCAD)', async () => {
    const k = await A.getKw('Hiển thị độ trong suốt [Bật / Tắt]', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: TPDISPLAY ? 'OFF' : 'ON' }); const on = k.kw ? k.kw === 'ON' : !TPDISPLAY;
    TPDISPLAY = on; try{ localStorage.setItem('dvd:tpdisp', on ? '1' : '0'); }catch(_){} try{ bbDirty = true; draw(); }catch(_){} log('Độ trong suốt: ' + (on ? 'hiện' : 'ẩn') + '.');
  });
  A.setTransparency = (ents, v) => { const rep = ents.filter(e => !A.isLocked(e)).map(e => { const w = copy(e); if(v == null) delete w.tp; else w.tp = v; return [e, w]; }); if(rep.length) A.commit({ rep }, 'Độ trong suốt'); return rep.length; };

  /* =====================================================================
     2) GIAO DIỆN
     ===================================================================== */
  const top = () => document.getElementById('acadTop');
  plain(['RIBBON'], 'Hiện ribbon', () => { const t = top(); if(t) t.classList.remove('min'); document.documentElement.classList.remove('acad-clean'); try{ localStorage.setItem('dvd:ribmin', '0'); }catch(_){} });
  plain(['RIBBONCLOSE'], 'Ẩn ribbon (gõ RIBBON để hiện lại)', () => { const t = top(); if(t) t.classList.add('min'); try{ localStorage.setItem('dvd:ribmin', '1'); }catch(_){} });
  const barShown = () => { const b = document.getElementById('dvdCmd'); return !!(b && b.classList.contains('show')); };
  plain(['COMMANDLINE'], 'Hiện dòng lệnh (Ctrl+9)', () => { if(!barShown()) DVDCmd.toggleBar(); });
  plain(['COMMANDLINEHIDE'], 'Ẩn dòng lệnh (Ctrl+9 để hiện lại)', () => { if(barShown()) DVDCmd.toggleBar(); });
  plain(['PROPERTIESCLOSE', 'PRCLOSE'], 'Đóng bảng Thuộc tính', () => DVDCmd.togglePalette(false));
  const closeDlg = test => { let n = 0; document.querySelectorAll('.dvd-dlg').forEach(d => { if(test(d)){ const b = d.querySelector('.dvd-cancel'); if(b) b.click(); else d.remove(); n++; } }); return n; };
  plain(['LAYERCLOSE'], 'Đóng bảng Quản lý lớp', () => closeDlg(d => !!d.querySelector('.lm-tbl')));
  plain(['QCCLOSE'], 'Đóng máy tính QuickCalc', () => closeDlg(d => /CAL|QuickCalc|Máy tính/i.test((d.querySelector('h3') || {}).textContent || '')));
  plain(['GRAPHSCR'], 'Đóng cửa sổ lịch sử dòng lệnh (về màn hình vẽ)', () => closeDlg(d => /HISTORY|TEXTSCR|Lịch sử/i.test((d.querySelector('h3') || {}).textContent || '')));
  let hidden = null;
  plain(['HIDEPALETTES', 'POFF'], 'Ẩn các bảng (Thuộc tính, Tool Palettes, dòng lệnh)', () => {
    const tp = document.getElementById('dvdTP'); hidden = { props: document.documentElement.classList.contains('dvd-props-on'), tp: !!(tp && tp.style.display !== 'none'), bar: barShown() };
    DVDCmd.togglePalette(false); if(tp) tp.style.display = 'none'; if(hidden.bar) DVDCmd.toggleBar(); log('Đã ẩn các bảng — SHOWPALETTES để hiện lại.');
  });
  plain(['SHOWPALETTES', 'PON'], 'Hiện lại các bảng đã ẩn bằng HIDEPALETTES', () => { const h = hidden || { props: true, bar: true }; if(h.props) DVDCmd.togglePalette(true); const tp = document.getElementById('dvdTP'); if(tp && h.tp) tp.style.display = ''; if(h.bar && !barShown()) DVDCmd.toggleBar(); hidden = null; });
  const navOn = () => { try{ return localStorage.getItem('dvd:navbar') !== '0'; }catch(_){ return true; } };
  const applyNav = () => { const z = document.querySelector('.zoom'); if(z) z.style.display = navOn() ? '' : 'none'; };
  later(applyNav);
  cmd(['NAVBAR'], 'Hiện / ẩn thanh điều hướng (phóng, xoay, la bàn) bên phải', async () => {
    const k = await A.getKw('Thanh điều hướng [Bật / Tắt]', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: navOn() ? 'OFF' : 'ON' }); const on = k.kw ? k.kw === 'ON' : !navOn();
    try{ localStorage.setItem('dvd:navbar', on ? '1' : '0'); }catch(_){} applyNav();
  });
  cmd(['WORKSPACE', 'WSCURRENT'], 'Đổi không gian làm việc (Vẽ 2D & Chú thích / Mô hình 3D)', async () => {
    const k = await A.getKw('Không gian làm việc [Vẽ 2D / 3D]', { kw: [{ k: '2D', t: 'Vẽ 2D & Chú thích' }, { k: '3D', t: 'Mô hình 3D' }] }); if(!k.kw) return; A.ribbon.setWS(k.kw === '3D' ? 'm3d' : 'draft'); log('Không gian làm việc: ' + (k.kw === '3D' ? '3D Modeling' : 'Drafting & Annotation'));
  });

  /* =====================================================================
     3) FILE
     ===================================================================== */
  alias(['QUIT', 'EXIT'], 'CLOSEALL', 'Đóng bản vẽ (hỏi lưu nếu có thay đổi)');
  alias(['QQUIT'], 'CLOSEALL', 'Đóng nhanh bản vẽ');
  alias(['SAVEALL'], 'QSAVE', 'Lưu bản vẽ đang mở');
  plain(['PREVIEW'], 'Xem trước bản in (Plot Preview): nét vector, lăn chuột phóng to / thu nhỏ, kéo để dời', () => { if(A.plotPreview) A.plotPreview(); else DVDCmd.run('PLOT'); });
  plain(['REVERT'], 'Mở lại bản vẽ như lúc mở file, bỏ mọi thay đổi chưa lưu', async () => {
    const name = typeof currentName === 'string' ? currentName : ''; if(!name){ say('Chưa mở bản vẽ.'); return; }
    let rec = null; try{ rec = (await idbAll()).filter(f => f.name === name).sort((a, b) => b.savedAt - a.savedAt)[0]; }catch(_){}
    if(!rec){ say('Không tìm thấy file gốc của "' + name + '" trên máy (bản vẽ mới hoặc mở từ nơi khác).'); return; }
    const ok = await new Promise(res => A.dialog({ title: 'REVERT', html: '<div>Bỏ mọi thay đổi và mở lại <b translate="no">' + esc(name) + '</b> như lúc mở file?</div>', ok: () => res(true), cancel: () => res(false) })); if(!ok) return;
    try{ const k = geomKey(); if(k) localStorage.removeItem(k); }catch(_){}
    try{ openRecent(rec); log('REVERT: đã mở lại ' + name + '.'); }catch(err){ say('Không mở lại được: ' + err.message); }
  });
  let logStart = null;
  plain(['LOGFILEON'], 'Bắt đầu ghi nhật ký dòng lệnh', () => { logStart = DVDCmd.history().length; try{ localStorage.setItem('dvd:logon', '1'); }catch(_){} log('Đang ghi nhật ký dòng lệnh — LOGFILEOFF để dừng và tải file.'); });
  plain(['LOGFILEOFF'], 'Dừng ghi nhật ký và tải file .log', () => {
    if(logStart == null){ say('Chưa bật LOGFILEON.'); return; } const lines = DVDCmd.history().slice(logStart); logStart = null;
    const t = '[' + new Date().toLocaleString() + '] ' + (typeof currentName === 'string' ? currentName : '') + '\n' + lines.join('\n') + '\n';
    const b = new Blob([t], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'dvdcad-' + new Date().toISOString().slice(0, 10) + '.log'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    log('Đã tải nhật ký (' + lines.length + ' dòng).');
  });

  /* =====================================================================
     4) LỆNH
     ===================================================================== */
  cmd(['UNDEFINE'], 'Tắt một lệnh có sẵn (gõ .TÊN để vẫn dùng lệnh gốc)', async () => {
    const r = await A.getStr('Tên lệnh cần tắt'); const n = (r.str || '').trim().toUpperCase(); if(!n) return;
    if(['UNDEFINE', 'REDEFINE'].includes(n)){ log('Không tắt được lệnh này.'); return; }
    if(DVDCmd.undefine(n)) log('Đã tắt ' + n + '. Gõ .' + n + ' để dùng lệnh gốc, REDEFINE ' + n + ' để bật lại.'); else log('Không có lệnh ' + n + '.');
  });
  cmd(['REDEFINE'], 'Bật lại lệnh đã tắt bằng UNDEFINE', async () => {
    const u = DVDCmd.undefined; const r = await A.getStr('Tên lệnh cần bật lại' + (u.length ? ' (' + u.join(', ') + ')' : '')); const n = (r.str || '').trim().toUpperCase(); if(!n) return;
    log(DVDCmd.redefine(n) ? 'Đã bật lại ' + n + '.' : n + ' không bị tắt.');
  });
  plain(['ARRAYCLOSE'], 'Đóng chế độ sửa mảng', () => log('Không có mảng nào đang sửa (ARRAYEDIT áp dụng ngay khi bấm OK).'));
  plain(['LAYERPMODE'], 'Theo dõi thay đổi lớp cho LAYERP', () => log('LAYERPMODE: luôn bật — LAYERP về trạng thái lớp trước.'));
  cmd(['VIEWRES'], 'Độ mịn đường cong khi hiển thị', async () => { await A.getNum('Độ mịn (1–20000)', { def: MEM.viewres || 1000 }).then(r => { if(r.num > 0) MEM.viewres = r.num; }); log('DVDCAD vẽ cung / tròn bằng đường cong thật của trình duyệt: luôn mịn ở mọi mức phóng.'); });

  /* DIMLAYER — lớp mặc định cho kích thước mới */
  cmd(['DIMLAYER'], 'Lớp cho kích thước mới ("." = lớp hiện hành)', async () => {
    const cur = A.DS.layer || '.'; const r = await A.getStr('Lớp cho kích thước mới ("." = lớp hiện hành) <' + cur + '>', { def: cur }); if(r.none) return;
    const n = (r.str || '').trim(); if(!n || n === '.'){ A.DS.layer = ''; } else { if(!A.layerNames().includes(n)) A.addLayer(n); A.DS.layer = n; }
    A.dsSave(); log('DIMLAYER = ' + (A.DS.layer || 'lớp hiện hành'));
  });

  /* XDLIST — xem dữ liệu mở rộng / thuộc tính đầy đủ của đối tượng */
  cmd(['XDLIST', 'XDATA'], 'Xem dữ liệu mở rộng và thuộc tính đầy đủ của đối tượng', async () => {
    const r = await A.getEnt('Chọn đối tượng'); if(!r.ent) return; const e = r.ent;
    const o = {}; for(const [k, v] of Object.entries(e)){ if(k === 'userAdded') continue; if(Array.isArray(v) && v.length > 12) o[k] = '[' + v.length + ' phần tử]'; else o[k] = v; }
    A.dialog({ title: 'XDLIST — ' + e.type, wide: true, noCancel: true, html: '<pre translate="no" style="max-height:60vh;overflow:auto;background:#161a20;color:#cfe3ff;padding:8px;border-radius:6px;font:12px ui-monospace,monospace;white-space:pre-wrap">' + esc(JSON.stringify(o, null, 2)) + '</pre>', ok: () => {} });
  });

  /* DCLINEAR — ràng buộc kích thước thẳng (ngang / dọc theo vị trí đặt) */
  cmd(['DCLINEAR'], 'Ràng buộc kích thước thẳng: ngang hoặc dọc', async () => {
    const k = await A.getKw('Ràng buộc kích thước thẳng [Ngang / Dọc]', { kw: [{ k: 'H', t: 'Ngang' }, { k: 'V', t: 'Dọc' }], def: 'H' }); const c = k.kw === 'V' ? 'DCVERTICAL' : 'DCHORIZONTAL'; later(() => DVDCmd.run(c));
  });

  /* MPEDIT — sửa nhiều đa tuyến một lúc */
  const toPoly = e => {
    if(e.type === 'POLYLINE') return e;
    if(e.type === 'LINE'){ const w = copy(e); delete w.x1; delete w.y1; delete w.x2; delete w.y2; w.type = 'POLYLINE'; w.closed = false; w.vertices = [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }]; return w; }
    if(e.type === 'ARC'){ const a1 = e.a1 * Math.PI / 180; let sw = (e.a2 - e.a1) * Math.PI / 180; while(sw <= 0) sw += 2 * Math.PI; const p = { x: e.cx + e.r * Math.cos(a1), y: e.cy + e.r * Math.sin(a1) }, q = { x: e.cx + e.r * Math.cos(a1 + sw), y: e.cy + e.r * Math.sin(a1 + sw) };
      const w = copy(e); for(const k of ['cx', 'cy', 'r', 'a1', 'a2']) delete w[k]; w.type = 'POLYLINE'; w.closed = false; w.vertices = [p, q]; A.setBV(w, [{ x: p.x, y: p.y, bulge: Math.tan(sw / 4) }, { x: q.x, y: q.y }]); return w; }
    return null;
  };
  const bvList = w => ((A.bvOf && A.bvOf(w)) || w.vertices).map(p => ({ x: p.x, y: p.y, bulge: p.bulge || 0 }));
  function joinPolys(list, fuzz){
    const segs = list.map(w => ({ w, v: bvList(w), used: false })); const out = [];
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const rev = v => { const r = v.slice().reverse().map(p => ({ x: p.x, y: p.y, bulge: 0 })); for(let i = 0; i < v.length - 1; i++) r[v.length - 2 - i].bulge = -(v[i].bulge || 0); return r; };
    for(const s of segs){ if(s.used || s.w.closed) continue; s.used = true; let V = s.v.slice(); let grew = true;
      while(grew){ grew = false; for(const t of segs){ if(t.used || t.w.closed) continue; const a = V[0], b = V[V.length - 1], c = t.v[0], e2 = t.v[t.v.length - 1];
        if(d(b, c) <= fuzz){ V = V.slice(0, -1).concat([{ x: b.x, y: b.y, bulge: 0 }]); V[V.length - 1].bulge = t.v[0].bulge; V = V.concat(t.v.slice(1)); }
        else if(d(b, e2) <= fuzz){ const r = rev(t.v); V[V.length - 1].bulge = r[0].bulge; V = V.concat(r.slice(1)); }
        else if(d(a, e2) <= fuzz){ V = t.v.slice(0, -1).concat(V); }
        else if(d(a, c) <= fuzz){ V = rev(t.v).slice(0, -1).concat(V); }
        else continue; t.used = true; grew = true; } }
      const w = copy(s.w); const cl = V.length > 2 && d(V[0], V[V.length - 1]) <= fuzz; if(cl) V.pop(); w.closed = cl || !!s.w.closed; delete w.bv; delete w.bvs; w.vertices = V.map(p => ({ x: p.x, y: p.y })); if(V.some(p => p.bulge)) A.setBV(w, V); out.push({ src: segs.filter(x => x.used && !x.done).map(x => { x.done = true; return x.w; }), w }); }
    return out;
  }
  cmd(['MPEDIT'], 'Sửa nhiều đa tuyến: đóng / mở, nối, độ rộng, đảo chiều (đổi đường, cung thành đa tuyến)', async () => {
    const s = await A.getSel('Chọn đường / cung / đa tuyến', { filter: e => /^(LINE|ARC|POLYLINE)$/.test(e.type) }); let sel = (s.sel || []).filter(e => !A.isLocked(e) && !e.grp); if(!sel.length) return;
    if(sel.some(e => e.type !== 'POLYLINE')){ const k = await A.getKw('Đổi đường, cung thành đa tuyến? [Có / Không]', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Y' }); if(k.kw === 'N') sel = sel.filter(e => e.type === 'POLYLINE'); }
    let cur = sel.map(e => [e, toPoly(e)]).filter(x => x[1]); if(cur.some(([e, w]) => e !== w)) A.commit({ rep: cur.filter(([e, w]) => e !== w) }, 'MPEDIT: đổi thành đa tuyến');
    let items = cur.map(([e, w]) => w);
    for(;;){
      const k = await A.getKw('Tuỳ chọn [Đóng / Mở / Nối / Độ rộng / Đảo chiều / Thoát]', { kw: [{ k: 'C', t: 'Đóng' }, { k: 'O', t: 'Mở' }, { k: 'J', t: 'Nối' }, { k: 'W', t: 'Độ rộng' }, { k: 'R', t: 'Đảo chiều' }, { k: 'X', t: 'Thoát' }], def: 'X' });
      if(!k.kw || k.kw === 'X') break; items = items.filter(e => ME().indexOf(e) >= 0);
      if(k.kw === 'C' || k.kw === 'O'){ const rep = items.map(e => { const w = copy(e); w.closed = k.kw === 'C'; delete w.wq; return [e, w]; }); A.commit({ rep }); items = rep.map(x => x[1]); log((k.kw === 'C' ? 'Đã đóng ' : 'Đã mở ') + rep.length + ' đa tuyến.'); }
      if(k.kw === 'R'){ const rep = items.map(e => { const w = copy(e); if(!A.bvReverse || !A.bvReverse(w, !!w.closed)){ w.vertices = w.vertices.slice().reverse(); delete w.wq; } return [e, w]; }); A.commit({ rep }); items = rep.map(x => x[1]); log('Đã đảo chiều ' + rep.length + ' đa tuyến.'); }
      if(k.kw === 'W'){ const r = await A.getDist('Độ rộng mới cho mọi đa tuyến (0 = nét mảnh)', { def: 0 }); if(r.num == null || r.num < 0) continue;
        const rep = items.map(e => { const w = copy(e); delete w.wq; delete w.pw; if(r.num > 0){ const raw = bvList(e).map(p => ({ x: p.x, y: p.y, bulge: p.bulge, sw: r.num, ew: r.num })); delete w.bv; delete w.bvs; widePoly(raw, !!e.closed, w); } return [e, w]; }); A.commit({ rep }, 'MPEDIT: độ rộng'); items = rep.map(x => x[1]); log('Độ rộng = ' + r.num + ' cho ' + rep.length + ' đa tuyến.'); }
      if(k.kw === 'J'){ const f = await A.getDist('Khoảng hở tối đa để nối (fuzz)', { def: MEM.mpfuzz || 0 }); const fuzz = f.num != null ? Math.max(0, f.num) : (MEM.mpfuzz || 0); MEM.mpfuzz = fuzz;
        const res = joinPolys(items, Math.max(fuzz, 1e-9)); const del = [], add = []; for(const g of res){ if(g.src.length > 1){ del.push(...g.src); add.push(g.w); } }
        if(add.length){ A.commit({ del, add }, 'MPEDIT: nối'); items = items.filter(e => !del.includes(e)).concat(add); } log('Nối: ' + del.length + ' đa tuyến thành ' + add.length + '.'); }
    }
  });

  /* tên gọi khác như AutoCAD */
  alias(['CLASSICLAYER'], 'LAYER', 'Quản lý lớp (kiểu cổ điển)');
  alias(['EATTEXT'], 'ATTEXPORT', 'Trích dữ liệu thuộc tính khối');
  alias(['GOTOURL'], 'OPENLINK', 'Mở liên kết gắn trên đối tượng');
  alias(['NEWVIEW'], 'VIEW', 'Lưu góc nhìn mới');
  alias(['LAYOUTWIZARD'], 'LAYOUT', 'Tạo layout mới (khổ giấy, khung tên, khung nhìn)');
  for(const k of ['3DFORBIT', '3DCORBIT', '3DPAN', '3DZOOM', '3DSWIVEL', '3DDISTANCE']) alias([k], '3DORBIT', 'Xem 3D (' + k + ')');
  alias(['3DFLY'], '3DWALK', 'Bay / đi trong mô hình 3D');
  alias(['3DCLIP'], 'SECTIONPLANE', 'Cắt mô hình 3D bằng mặt phẳng');

  /* =====================================================================
     5) 3D: MESH · CONVTOMESH · CONVTOSOLID · CONVTOSURFACE · 3DFACE · THICKEN
     ===================================================================== */
  const isSolid = e => e && e.type === 'SOLID3D';
  cmd(['CONVTOMESH'], 'Đổi khối 3D thành khối lưới tam giác', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: e => isSolid(e) && e.k !== 'mesh' }); const rep = (s.sel || []).filter(e => !A.isLocked(e)).map(e => [e, A.toMesh(e)]).filter(x => x[1]);
    if(rep.length) A.commit({ rep }, 'CONVTOMESH'); log('Đã đổi ' + rep.length + ' khối thành lưới.');
  });
  function boundary(e){ const ed = A.edgeData({ p: e.v, i: e.f || [] }); let n = 0; for(let k = 0; k < ed.E.length; k += 4) if(ed.E[k + 3] < 0) n++; return n; }
  cmd(['CONVTOSOLID'], 'Đổi mặt lưới kín thành khối đặc', async () => {
    const s = await A.getSel('Chọn mặt lưới (kín)', { filter: e => isSolid(e) && (e.srf || e.k === 'mesh') }); const rep = []; let open = 0;
    for(const e of (s.sel || [])){ if(A.isLocked(e)) continue; let b = 0; try{ b = e.v ? boundary(e) : 0; }catch(_){ b = 0; } if(b > 0){ open++; continue; } const w = copy(e); delete w.srf; rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, 'CONVTOSOLID'); log('Đã đổi ' + rep.length + ' thành khối đặc' + (open ? ' · ' + open + ' mặt hở không đổi được (dùng THICKEN)' : '') + '.');
  });
  cmd(['CONVTOSURFACE'], 'Đổi khối 3D thành mặt (lưới)', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: e => isSolid(e) && !e.srf }); const rep = (s.sel || []).filter(e => !A.isLocked(e)).map(e => { const m = e.k === 'mesh' ? copy(e) : A.toMesh(e); if(m) m.srf = 1; return [e, m]; }).filter(x => x[1]);
    if(rep.length) A.commit({ rep }, 'CONVTOSURFACE'); log('Đã đổi ' + rep.length + ' khối thành mặt.');
  });
  const PRIM = { B: 'BOX', C: 'CYLINDER', O: 'CONE', S: 'SPHERE', W: 'WEDGE', T: 'TORUS', P: 'PYRAMID' };
  cmd(['MESH'], 'Khối lưới cơ bản (hộp, trụ, nón, cầu, nêm, xuyến, chóp)', async () => {
    const k = await A.getKw('Loại khối lưới [Hộp / Trụ / nÓn / Cầu / Nêm / Xuyến / Chóp]', { kw: [{ k: 'B', t: 'Hộp' }, { k: 'C', t: 'Trụ' }, { k: 'O', t: 'Nón' }, { k: 'S', t: 'Cầu' }, { k: 'W', t: 'Nêm' }, { k: 'T', t: 'Xuyến' }, { k: 'P', t: 'Chóp' }], def: 'B' }); const c = PRIM[k.kw || 'B'];
    const before = new Set(ME());
    later(() => { DVDCmd.run(c); const t0 = Date.now(); const iv = setInterval(() => { if(A.busy() && Date.now() - t0 < 600000) return; clearInterval(iv);
      const rep = ME().filter(e => !before.has(e) && isSolid(e) && e.k !== 'mesh').map(e => [e, A.toMesh(e)]).filter(x => x[1]); if(rep.length){ A.commit({ rep }, 'MESH'); log('Đã tạo ' + rep.length + ' khối lưới.'); } }, 120); });
  });
  cmd(['3DFACE'], 'Mặt 3D qua 3 hoặc 4 điểm (ở cao độ ELEV)', async () => {
    const P = []; for(let i = 0; i < 4; i++){ const r = await A.getPoint(i < 3 ? 'Điểm thứ ' + (i + 1) : 'Điểm thứ tư hoặc <tam giác>', { base: P[P.length - 1], preview: P.length ? (g, p) => g.ents([{ type: 'POLYLINE', closed: true, vertices: P.concat([p]) }], '#9fd0ff') : null }); if(!r.pt){ if(i === 3) break; return; } P.push(r.pt); }
    const z = MEM.z03 || 0; const Pf = []; for(const p of P) Pf.push(p.x, p.y, z); const I = P.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
    const e = A.meshEnt(Pf, I, null); if(!e){ log('Các điểm thẳng hàng.'); return; } e.srf = 1; A.newProps(e); delete e.lt; A.commit({ add: [A.ucsApply ? A.ucsApply(e) : e] }, '3DFACE'); log('Đã tạo mặt 3D (' + P.length + ' đỉnh).');
  });
  function loopsOf(e){
    const ed = A.edgeData({ p: e.v, i: e.f || [] }); const p = ed.p || ed.P || e.v; const nb = new Map();
    for(let k = 0; k < ed.E.length; k += 4){ if(ed.E[k + 3] >= 0) continue; const a = ed.E[k], b = ed.E[k + 1]; if(!nb.has(a)) nb.set(a, []); if(!nb.has(b)) nb.set(b, []); nb.get(a).push(b); nb.get(b).push(a); }
    const seen = new Set(), loops = [];
    for(const s of nb.keys()){ if(seen.has(s)) continue; const L = []; let cur = s, prev = -1; while(cur != null && !seen.has(cur)){ seen.add(cur); L.push({ x: p[cur * 3], y: p[cur * 3 + 1], z: p[cur * 3 + 2] }); const nx = (nb.get(cur) || []).find(x => x !== prev && !seen.has(x)); prev = cur; cur = nx; } if(L.length >= 3) loops.push(L); }
    return loops;
  }
  cmd(['THICKEN'], 'Làm dày mặt phẳng thành khối đặc', async () => {
    const s = await A.getSel('Chọn mặt cần làm dày', { filter: e => isSolid(e) && e.srf && e.v }); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const h = await A.getDist('Bề dày (âm = về phía dưới)', { def: MEM.thick || 100 }); if(!h.num){ return; } MEM.thick = h.num;
    const rep = []; let skip = 0;
    for(const e of sel){ let zs = []; for(let k = 2; k < e.v.length; k += 3) zs.push(e.v[k]); const z0 = Math.min(...zs), z1 = Math.max(...zs); if(z1 - z0 > 1e-6 * (1 + Math.abs(z0))){ skip++; continue; }
      let L = []; try{ L = loopsOf(e); }catch(_){ L = []; } if(!L.length){ skip++; continue; }
      const area = l => { let a = 0; for(let i = 0; i < l.length; i++){ const p = l[i], q = l[(i + 1) % l.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a) / 2; };
      L.sort((a, b) => area(b) - area(a)); const so = await A.makeExt(L[0], L.slice(1), z0, h.num); if(!so){ skip++; continue; } for(const k of ['layer', 'col', 'bl', 'mat', 'tp']) if(e[k] != null) so[k] = e[k]; rep.push([e, so]); }
    if(rep.length) A.commit({ rep }, 'THICKEN'); log('Đã làm dày ' + rep.length + ' mặt' + (skip ? ' · ' + skip + ' mặt không phẳng chưa làm dày được' : '') + '.');
  });
})();
