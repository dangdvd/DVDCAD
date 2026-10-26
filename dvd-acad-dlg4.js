/* DVDCAD — bổ sung như AutoCAD 2027 (v5s)
   Chữ → đường bao (TXTEXP, EXPORTLAYOUT, MSLIDE) · thanh menu cổ điển (MENUBAR) · bản đồ nền (GEOMAP) · máy vẽ HPGL/2.
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || !A.dialog || !A.acw || !window.DVDCmd || A._dlg4) return; A._dlg4 = true;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const deep = o => JSON.parse(JSON.stringify(o));
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };

  /* ==================================================================
     CHỮ → ĐƯỜNG BAO: vẽ chữ đúng như trên màn hình ra canvas phụ, dò biên (marching squares, nội suy theo độ trong),
     đơn giản hoá (Douglas–Peucker) rồi đổi về toạ độ bản vẽ. Vòng ngoài + lỗ (o, a, e…) → tô evenodd.
     ================================================================== */
  function rdp(P, tol){ if(P.length < 4) return P.slice(); const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1; const st = [[0, P.length - 1]];
    while(st.length){ const [a, b] = st.pop(); const A0 = P[a], B0 = P[b]; const dx = B0.x - A0.x, dy = B0.y - A0.y, L = Math.hypot(dx, dy) || 1e-12; let mi = -1, md = tol;
      for(let i = a + 1; i < b; i++){ const d = Math.abs((P[i].x - A0.x) * dy - (P[i].y - A0.y) * dx) / L; if(d > md){ md = d; mi = i; } }
      if(mi >= 0){ keep[mi] = 1; st.push([a, mi], [mi, b]); } }
    return P.filter((_, i) => keep[i]); }
  // vòng kín: tách tại điểm xa đỉnh đầu nhất rồi đơn giản hoá hai nửa (tránh hai đầu trùng nhau)
  function rdpClosed(L, tol){ if(L.length < 4) return L.slice(); let k = 0, md = -1; for(let i = 1; i < L.length; i++){ const d = Math.hypot(L[i].x - L[0].x, L[i].y - L[0].y); if(d > md){ md = d; k = i; } }
    const a = rdp(L.slice(0, k + 1), tol), b = rdp(L.slice(k).concat([L[0]]), tol); return a.slice(0, -1).concat(b.slice(0, -1)); }
  // dò biên ngưỡng 0.5 trên ảnh độ trong (alpha 0–1), trả các vòng kín theo toạ độ điểm ảnh (tâm điểm ảnh = i + 0.5)
  function traceAlpha(al, W, H){
    const v = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? 0 : al[j * W + i];
    const T = 0.5, adj = new Map(), pos = new Map();
    const hid = (i, j) => 'h' + i + ',' + j, vid = (i, j) => 'v' + i + ',' + j;
    const ptH = (i, j) => { const a = v(i, j), b = v(i + 1, j); const t = Math.abs(b - a) > 1e-9 ? (T - a) / (b - a) : 0.5; return { x: i + 0.5 + Math.max(0, Math.min(1, t)), y: j + 0.5 }; };
    const ptV = (i, j) => { const a = v(i, j), b = v(i, j + 1); const t = Math.abs(b - a) > 1e-9 ? (T - a) / (b - a) : 0.5; return { x: i + 0.5, y: j + 0.5 + Math.max(0, Math.min(1, t)) }; };
    const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
    for(let j = -1; j < H; j++) for(let i = -1; i < W; i++){
      const tl = v(i, j) > T, tr = v(i + 1, j) > T, br = v(i + 1, j + 1) > T, bl = v(i, j + 1) > T;
      const c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0); if(c === 0 || c === 15) continue;
      const Te = hid(i, j), Be = hid(i, j + 1), Le = vid(i, j), Re = vid(i + 1, j);
      if(!pos.has(Te)) pos.set(Te, () => ptH(i, j)); if(!pos.has(Be)) pos.set(Be, () => ptH(i, j + 1)); if(!pos.has(Le)) pos.set(Le, () => ptV(i, j)); if(!pos.has(Re)) pos.set(Re, () => ptV(i + 1, j));
      const mid = (v(i, j) + v(i + 1, j) + v(i + 1, j + 1) + v(i, j + 1)) / 4 > T;
      switch(c){
        case 1: case 14: link(Le, Be); break; case 2: case 13: link(Be, Re); break; case 3: case 12: link(Le, Re); break;
        case 4: case 11: link(Te, Re); break; case 6: case 9: link(Te, Be); break; case 7: case 8: link(Te, Le); break;
        case 5: if(mid){ link(Te, Le); link(Be, Re); } else { link(Te, Re); link(Le, Be); } break;
        case 10: if(mid){ link(Te, Re); link(Le, Be); } else { link(Te, Le); link(Be, Re); } break;
      } }
    const loops = [], seen = new Set();
    for(const start of adj.keys()){ if(seen.has(start)) continue; const L = []; let prev = null, cur = start;
      for(let g = 0; g < 1e6; g++){ seen.add(cur); L.push(pos.get(cur)()); const nb = adj.get(cur) || []; let nx = nb[0] === prev ? nb[1] : nb[0]; if(nx == null || nx === start || seen.has(nx)){ break; } prev = cur; cur = nx; }
      if(L.length >= 3) loops.push(L); }
    return loops; }
  const area = P => { let a = 0; for(let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j].x + P[i].x) * (P[j].y - P[i].y); return a / 2; };
  // đường bao chữ (TEXT / MTEXT / chữ có định dạng) theo toạ độ bản vẽ; px = số điểm ảnh cho một chiều cao chữ
  function textOutline(e, opt){ opt = opt || {}; if(!e || e.type !== 'TEXT' || !String(e.text || '').trim()) return [];
    let bb = null; try{ bb = entBBox(e); }catch(_){} if(!bb || !(bb.x1 > bb.x0) || !(bb.y1 > bb.y0)) return [];
    const h = Math.max(1e-9, e.h || 2.5), pad = h * 0.6; const x0 = bb.x0 - pad, y0 = bb.y0 - pad, x1 = bb.x1 + pad, y1 = bb.y1 + pad;
    let s = (opt.px || 56) / h; const MAXD = 6000, MAXA = 9e6; if((x1 - x0) * s > MAXD) s = MAXD / (x1 - x0); if((y1 - y0) * s > MAXD) s = MAXD / (y1 - y0); if((x1 - x0) * (y1 - y0) * s * s > MAXA) s = Math.sqrt(MAXA / ((x1 - x0) * (y1 - y0)));
    const Wp = Math.max(4, Math.ceil((x1 - x0) * s)), Hp = Math.max(4, Math.ceil((y1 - y0) * s));
    const cvs = document.createElement('canvas'); cvs.width = Wp; cvs.height = Hp; const g = cvs.getContext('2d');
    const sv = { ctx, plot: plotMode, st: _plotStyle, rtw: _RTW, rth: _RTH, ex: _exporting, v: { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot }, dpr: window.devicePixelRatio, q: (typeof QTEXT !== 'undefined') ? QTEXT : false };
    try{ ctx = g; plotMode = true; _plotStyle = 'mono'; _RTW = Wp; _RTH = Hp; _exporting = true; try{ QTEXT = false; }catch(_){}
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
      view.scale = s; view.offsetX = -x0 * s; view.offsetY = y1 * s; view.rot = 0;
      const w = Object.assign({}, e); delete w.clip; w.col = '#000000'; drawEntity(w); }
    catch(err){ console.warn('textOutline', err); }
    finally { ctx = sv.ctx; plotMode = sv.plot; _plotStyle = sv.st; _RTW = sv.rtw; _RTH = sv.rth; _exporting = sv.ex; try{ QTEXT = sv.q; }catch(_){} view.scale = sv.v.scale; view.offsetX = sv.v.offsetX; view.offsetY = sv.v.offsetY; view.rot = sv.v.rot; Object.defineProperty(window, 'devicePixelRatio', { value: sv.dpr, configurable: true }); }
    const D = g.getImageData(0, 0, Wp, Hp).data, al = new Float32Array(Wp * Hp); let any = false; for(let i = 0; i < al.length; i++){ al[i] = D[i * 4 + 3] / 255; if(al[i] > 0.5) any = true; } if(!any) return [];
    const tol = opt.tol != null ? opt.tol : 0.35, minA = opt.minArea != null ? opt.minArea : 1.2;
    const out = []; for(const L of traceAlpha(al, Wp, Hp)){ const P = rdpClosed(L, tol); if(P.length < 3 || Math.abs(area(P)) < minA) continue; out.push(P.map(q => ({ x: x0 + q.x / s, y: y1 - q.y / s }))); }
    return out; }
  A.textOutline = textOutline;
  // chữ → hatch đặc theo đường bao (giữ lớp / màu), dùng cho EXPORTLAYOUT khi chữ cắt ngang khung nhìn
  A.textToHatch = (e, loops) => { loops = loops || textOutline(e); if(!loops.length) return null; return { type: 'HATCH', solid: true, layer: e.layer, col: e.col, bl: e.bl, loops: loops.map(L => L.map(q => ({ x: q.x, y: q.y }))) }; };

  // TXTEXP (Express Tools): nổ chữ thành đa tuyến đường bao
  ecmd(['TXTEXP'], 'Nổ chữ thành đường bao đa tuyến (Express Tools — Explode Text)', async (_, cur) => {
    let sel = cur && cur.pre && cur.pre.length ? cur.pre.filter(e => e.type === 'TEXT') : []; if(cur) cur.pre = [];
    if(!sel.length){ const r = await A.getSel('Chọn chữ cần nổ', { filter: e => e.type === 'TEXT' }); sel = (r.sel || []).filter(e => e.type === 'TEXT'); }
    if(!sel.length) return; const L = (A.editList ? A.editList() : modelEntities); sel = sel.filter(e => L.includes(e)); if(!sel.length){ log('Đối tượng không sửa được ở đây.'); return; }
    const add = [], del = []; let nl = 0;
    for(const e of sel){ const loops = textOutline(e); if(!loops.length) continue; del.push(e); for(const P of loops){ const w = { type: 'POLYLINE', closed: true, vertices: P, layer: e.layer || '0', col: e.col }; if(e.bl) w.bl = 1; if(e.lw) w.lw = e.lw; add.push(w); nl++; } }
    if(!add.length){ log('TXTEXP: không có chữ nào nổ được.'); return; }
    A.commit({ del, add }, 'TXTEXP: ' + del.length + ' chữ → ' + nl + ' đa tuyến'); log('TXTEXP: ' + del.length + ' chữ → ' + nl + ' đa tuyến đường bao.'); });

  /* ==================================================================
     THANH MENU CỔ ĐIỂN (MENUBAR = 1) — menu như AutoCAD + menu nhập từ tệp CUI (.cuix / .cui)
     ================================================================== */
  const M = (t, c) => ({ t, c }), SEP = { sep: 1 };
  const MENU0 = [
    ['Tệp', [M('Mới…', 'NEW'), M('Mở…', 'OPEN'), M('Đóng', 'CLOSE'), SEP, M('Lưu', 'QSAVE'), M('Lưu thành…', 'SAVEAS'), M('Lưu DWG', 'SAVEDWG'), M('Xuất…', 'EXPORT'), M('eTransmit…', 'ETRANSMIT'), SEP, M('Thiết lập trang…', 'PAGESETUP'), M('Dấu in…', 'PLOTSTAMP'), M('In…', 'PLOT'), M('Xuất bản…', 'PUBLISH'), SEP, M('Thuộc tính bản vẽ…', 'DWGPROPS'), M('Thoát', 'QUIT')]],
    ['Sửa', [M('Hoàn tác', 'U'), M('Làm lại', 'REDO'), SEP, M('Cắt', 'CUTCLIP'), M('Sao chép', 'COPYCLIP'), M('Chép kèm điểm gốc', 'COPYBASE'), M('Dán', 'PASTECLIP'), M('Dán thành khối', 'PASTEBLOCK'), M('Dán đặc biệt…', 'PASTESPEC'), SEP, M('Xoá', 'ERASE'), M('Chọn tất cả', 'SELECTALL'), SEP, M('Tìm và thay thế…', 'FIND')]],
    ['Xem', [M('Vẽ lại', 'REDRAW'), M('Tái tạo', 'REGEN'), M('Tái tạo tất cả', 'REGENALL'), SEP, M('Phóng to / thu nhỏ', 'ZOOM'), M('Dời hình', 'PAN'), M('Khung nhìn…', 'VPORTS'), M('Góc nhìn có tên…', 'VIEW'), SEP, M('Kiểu hiển thị…', 'VISUALSTYLES'), M('Che khuất', 'HIDE'), SEP, M('Thanh menu', 'MENUBAR')]],
    ['Chèn', [M('Khối…', 'INSERT'), M('Tham chiếu DWG…', 'XATTACH'), M('Ảnh…', 'IMAGEATTACH'), M('PDF…', 'PDFIMPORT'), SEP, M('Trường…', 'FIELD'), M('Bảng…', 'TABLE'), M('Siêu liên kết…', 'HYPERLINK'), SEP, M('Layout mới', 'LAYOUT'), M('Tham chiếu ngoài…', 'XREF')]],
    ['Định dạng', [M('Lớp…', 'LAYER'), M('Trạng thái lớp…', 'LAYERSTATE'), SEP, M('Màu…', 'COLOR'), M('Kiểu nét…', 'LINETYPE'), M('Bề rộng nét…', 'LWEIGHT'), SEP, M('Kiểu chữ…', 'STYLE'), M('Kiểu kích thước…', 'DIMSTYLE'), M('Kiểu bảng…', 'TABLESTYLE'), M('Kiểu ghi chú dẫn…', 'MLEADERSTYLE'), M('Kiểu đường đôi…', 'MLSTYLE'), M('Kiểu in…', 'STYLESMANAGER'), M('Kiểu điểm…', 'PTYPE'), SEP, M('Đơn vị…', 'UNITS'), M('Giới hạn bản vẽ', 'LIMITS'), M('Đổi tên…', 'RENAME')]],
    ['Công cụ', [M('Thuộc tính', 'PROPERTIES'), M('Bảng khối', 'BLOCKSPALETTE'), M('Tham số…', 'PARAMETERS'), SEP, M('Ghi thao tác', 'ACTRECORD'), M('Quản lý thao tác…', 'ACTMANAGER'), M('Nạp ứng dụng…', 'APPLOAD'), M('Chạy script…', 'SCRIPT'), SEP, M('Đo khoảng cách', 'DIST'), M('Diện tích', 'AREA'), M('Toạ độ điểm', 'ID'), M('Liệt kê', 'LIST'), SEP, M('Chuẩn CAD…', 'STANDARDS'), M('Kiểm tra chuẩn…', 'CHECKSTANDARDS'), M('Vị trí địa lý…', 'GEOGRAPHICLOCATION'), SEP, M('Tuỳ biến giao diện…', 'CUI'), M('Biến hệ thống…', 'SYSVDLG'), M('Cài đặt vẽ…', 'DSETTINGS'), M('Tuỳ chọn…', 'OPTIONS')]],
    ['Vẽ', [M('Đường thẳng', 'LINE'), M('Tia', 'RAY'), M('Đường dựng', 'XLINE'), M('Đường đôi', 'MLINE'), M('Đa tuyến', 'PLINE'), M('Đa giác đều', 'POLYGON'), M('Hình chữ nhật', 'RECTANG'), M('Cung', 'ARC'), M('Đường tròn', 'CIRCLE'), M('Hình vành khăn', 'DONUT'), M('Spline', 'SPLINE'), M('Elip', 'ELLIPSE'), SEP, M('Tạo khối…', 'BLOCK'), M('Bảng…', 'TABLE'), M('Điểm', 'POINT'), M('Chia đều', 'DIVIDE'), M('Chia theo khoảng', 'MEASURE'), SEP, M('Hatch…', 'HATCH'), M('Gradient…', 'GRADIENT'), M('Biên…', 'BOUNDARY'), M('Vùng', 'REGION'), M('Vùng che', 'WIPEOUT'), M('Đám mây sửa', 'REVCLOUD'), SEP, M('Chữ một dòng', 'TEXT'), M('Chữ nhiều dòng', 'MTEXT')]],
    ['Kích thước', [M('Kích thước nhanh', 'QDIM'), SEP, M('Thẳng', 'DIMLINEAR'), M('Thẳng hàng', 'DIMALIGNED'), M('Chiều dài cung', 'DIMARC'), M('Toạ độ', 'DIMORDINATE'), M('Bán kính', 'DIMRADIUS'), M('Bán kính gãy', 'DIMJOGGED'), M('Đường kính', 'DIMDIAMETER'), M('Góc', 'DIMANGULAR'), SEP, M('Đường cơ sở', 'DIMBASELINE'), M('Nối tiếp', 'DIMCONTINUE'), SEP, M('Ghi chú dẫn', 'MLEADER'), M('Dung sai…', 'TOLERANCE'), M('Dấu tâm', 'CENTERMARK'), SEP, M('Kiểu kích thước…', 'DIMSTYLE')]],
    ['Hiệu chỉnh', [M('Sao chép thuộc tính', 'MATCHPROP'), SEP, M('Xoá', 'ERASE'), M('Sao chép', 'COPY'), M('Đối xứng', 'MIRROR'), M('Dời song song', 'OFFSET'), M('Mảng', 'ARRAY'), SEP, M('Di chuyển', 'MOVE'), M('Xoay', 'ROTATE'), M('Co giãn', 'SCALE'), M('Kéo giãn', 'STRETCH'), M('Kéo dài thêm', 'LENGTHEN'), SEP, M('Cắt xén', 'TRIM'), M('Kéo dài', 'EXTEND'), M('Cắt đứt', 'BREAK'), M('Nối', 'JOIN'), M('Vát góc', 'CHAMFER'), M('Bo tròn', 'FILLET'), SEP, M('Phá khối', 'EXPLODE'), M('Sửa đa tuyến', 'PEDIT'), M('Sửa spline', 'SPLINEDIT'), M('Nổ chữ', 'TXTEXP')]],
    ['Tham số', [M('Tự ràng buộc', 'AUTOCONSTRAIN'), M('Nằm ngang', 'GCHORIZONTAL'), M('Thẳng đứng', 'GCVERTICAL'), M('Song song', 'GCPARALLEL'), M('Vuông góc', 'GCPERPENDICULAR'), M('Trùng điểm', 'GCCOINCIDENT'), SEP, M('Kích thước ràng buộc', 'DCLINEAR'), M('Quản lý tham số…', 'PARAMETERS')]],
    ['Cửa sổ', [M('Trang Bắt đầu', 'GOTOSTART'), M('Thẻ tệp', 'FILETAB'), M('Xem nhanh bản vẽ', 'QVDRAWING'), M('Xem nhanh layout', 'QVLAYOUT')]],
    ['Trợ giúp', [M('Trợ giúp', 'HELP'), M('Giới thiệu DVDCAD', 'ABOUT')]] ];
  const MEN = { 'Tệp': 'File', 'Sửa': 'Edit', 'Xem': 'View', 'Chèn': 'Insert', 'Định dạng': 'Format', 'Công cụ': 'Tools', 'Vẽ': 'Draw', 'Kích thước': 'Dimension', 'Hiệu chỉnh': 'Modify', 'Tham số': 'Parametric', 'Cửa sổ': 'Window', 'Trợ giúp': 'Help' };
  const isEN = () => { try{ return window.DVDI18N && DVDI18N.lang === 'en'; }catch(_){ return false; } };
  const hasCmd = c => !!c && DVDCmd.commands.some(x => x.k.includes(String(c).toUpperCase()));
  let MBUSER = [], mbEl = null;
  const MBK = 'dvd:menubar'; let MENUBAR = (() => { try{ return localStorage.getItem(MBK) === '1' ? 1 : 0; }catch(_){ return 0; } })();
  const runC = c => { if(A.busy && A.busy()) A.cancel(true); setTimeout(() => { if(A.runMacro && /[;\\^ ]|\$M=/.test(c)) A.runMacro(c); else DVDCmd.run(c); }, 0); };
  function menuItems(L, out, depth){ out = out || []; for(const it of L || []){ if(!it) continue; if(it.sep){ if(out.length && !out[out.length - 1].sep) out.push({ sep: 1 }); continue; }
      if(it.sub){ out.push({ hd: (depth ? '› ' : '') + it.t }); menuItems(it.sub, out, (depth || 0) + 1); continue; }
      const c = it.c; if(c === 'MENUBAR'){ out.push({ t: it.t + (MENUBAR ? '  ✓' : ''), fn: () => A.sysvar.set('MENUBAR', MENUBAR ? 0 : 1) }); continue; }
      const base = String(c || '').replace(/^\*?(\^C)+/i, '').replace(/^[_.']+/, '').split(/[;\s\\]/)[0]; if(!c || !(hasCmd(base) || /[;\\]|\^C|\$M=/i.test(c))) continue;
      const cn = base.toUpperCase(); out.push({ t: it.t, ic: (A.ICONS && (A.ICONS[cn] || (window.DVDIcons && DVDIcons[cn]))) ? cn : (it.ic || null), fn: () => runC(c) }); }
    while(out.length && out[out.length - 1].sep) out.pop(); return out; }
  function mbRender(){ const top = document.getElementById('acadTop'); if(!top) return; const tabs = top.querySelector('#acTabs');
    if(!mbEl || !top.contains(mbEl)){ mbEl = document.createElement('div'); mbEl.id = 'acMenuBar'; mbEl.className = 'ac-menubar'; if(tabs) top.insertBefore(mbEl, tabs); else top.appendChild(mbEl);
      mbEl.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if(!b) return; const all = MENU0.map(([t, L]) => ({ t, L })).concat(MBUSER.map(m => ({ t: m.t, L: m.items, u: 1 }))); const m = all[+b.dataset.m]; if(!m) return;
        mbEl.querySelectorAll('.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); const r = b.getBoundingClientRect(); const pop = A.menu(r.left, r.bottom, menuItems(m.L));
        if(m.u && pop){ pop.setAttribute('translate', 'no'); pop.classList.add('notranslate'); }   // nhãn của tệp CUI: giữ nguyên, không dịch
        const off = () => { if(!pop || !document.body.contains(pop)){ b.classList.remove('on'); return; } setTimeout(off, 200); }; setTimeout(off, 200); }); }
    const all = MENU0.map(([t]) => isEN() ? (MEN[t] || t) : t).concat(MBUSER.map(m => m.t));
    mbEl.innerHTML = all.map((t, i) => '<button type="button" data-m="' + i + '" translate="no" class="notranslate">' + esc(t) + '</button>').join('');
    mbEl.style.display = MENUBAR ? '' : 'none'; try{ window.dispatchEvent(new Event('resize')); }catch(_){} }
  A.menuBarSet = menus => { MBUSER = (menus || []).filter(m => m && m.t && (m.items || []).length); mbRender(); };
  A.menuBarMenus = () => MENU0.map(([t, L]) => ({ t, items: L })).concat(MBUSER);
  { const st = document.createElement('style'); st.textContent = '.ac-menubar{display:flex;align-items:center;height:22px;padding:0 6px;background:#262b34;border-top:1px solid #1c2027;font:12px system-ui,"Segoe UI",sans-serif;color:#dfe5ee;user-select:none}.ac-menubar button{background:none;border:1px solid transparent;color:inherit;font:inherit;height:20px;padding:0 8px;border-radius:2px;cursor:default}.ac-menubar button:hover,.ac-menubar button.on{background:#3a4250;border-color:#4b5566}html:not(.acad) .ac-menubar{display:none!important}'; document.head.appendChild(st); }
  if(A.sysvar && A.sysvar.def) A.sysvar.def('MENUBAR', { d: 'Hiện thanh menu cổ điển (1) hay ẩn (0)', get: () => MENUBAR, set: v => { MENUBAR = +v ? 1 : 0; try{ localStorage.setItem(MBK, MENUBAR ? '1' : '0'); }catch(_){} mbRender(); } });
  setTimeout(() => { try{ mbRender(); }catch(err){ console.warn('menubar', err); } }, 0);
  try{ if(window.DVDI18N && DVDI18N.onChange) DVDI18N.onChange(() => setTimeout(mbRender, 0)); }catch(_){}

  /* ==================================================================
     GEODATA (DXF của AutoCAD): điểm thiết kế, điểm tham chiếu theo hệ toạ độ (địa lý LL84 / WGS84, hoặc UTM) → vĩ độ / kinh độ
     ================================================================== */
  function utmToLL(E, N, zone, south){ const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
    const x = E - 500000, y = south ? N - 10000000 : N, M0 = y / k0, mu = M0 / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256)), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
    const sn = Math.sin(p1), cs = Math.cos(p1), N1 = a / Math.sqrt(1 - e2 * sn * sn), T1 = Math.tan(p1) ** 2, C1 = ep2 * cs * cs, R1 = a * (1 - e2) / Math.pow(1 - e2 * sn * sn, 1.5), D = x / (N1 * k0);
    const lat = p1 - (N1 * Math.tan(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
    const lon = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / cs;
    return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI }; }
  A.utmToLL = utmToLL;
  A.geodataParse = text => { const t = String(text); const m = /\n[ \t]*0[ \t]*\r?\n[ \t]*GEODATA[ \t]*\r?\n/.exec(t); if(!m) return null;
    const L = t.slice(m.index + m[0].length).split(/\r?\n/); const g = []; for(let i = 0; i + 1 < L.length; i += 2){ const c = parseInt(L[i], 10); if(c === 0) break; g.push([c, L[i + 1]]); }
    const n = c => { const x = g.find(q => q[0] === c); return x ? parseFloat(x[1]) : null; };
    const xml = g.filter(q => q[0] === 301 || q[0] === 303).map(q => q[1]).join('');
    const id = ((/<(?:Alias|CoordinateSystem)[^>]*\bid="([^"]+)"/.exec(xml) || [])[1] || (/<ObjectId>([^<]+)</.exec(xml) || [])[1] || (/(?:PROJCS|GEOGCS)\["([^"]+)"/.exec(xml) || [])[1] || xml.trim().slice(0, 60)).trim();
    const dx = n(10) || 0, dy = n(20) || 0, rx = n(11), ry = n(21), rz = n(31) || 0, nx = n(12), ny = n(22); if(rx == null || ry == null) return null;
    let ll = null; const cs = (id + ' ' + xml.slice(0, 4000)).toUpperCase();
    const utm = /UTM(?:84|83|27)?[^0-9A-Z]{0,3}(?:ZONE[ _-]?)?(\d{1,2})\s*([NS])(?![A-Z])/.exec(cs);
    if(utm) ll = utmToLL(rx, ry, +utm[1], utm[2] === 'S');
    else if(/^LL|LL84|WGS ?84|4326|GEOGCS|LAT.?LON|LATLONG/.test(cs) || (n(70) === 3) || (Math.abs(rx) <= 180 && Math.abs(ry) <= 90)) ll = { lat: ry, lon: rx };
    if(!ll || !isFinite(ll.lat) || !isFinite(ll.lon) || Math.abs(ll.lat) > 90 || Math.abs(ll.lon) > 180) return null;
    const north = nx != null && ny != null && (nx || ny) ? +(Math.atan2(-nx, ny) * 180 / Math.PI).toFixed(6) : 0;
    return { lat: +ll.lat.toFixed(8), lon: +ll.lon.toFixed(8), elev: rz, cs: id || 'GEODATA', dx, dy, north, src: 'GEODATA' }; };

  /* ==================================================================
     GEOMAP — bản đồ nền dưới bản vẽ theo vị trí địa lý (ô bản đồ Web Mercator, OpenStreetMap hoặc dịch vụ riêng GEOMAPURL)
     ================================================================== */
  const R_E = 6378137, OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const GMK = 'dvd:geomapurl'; let GEOMAPURL = (() => { try{ return localStorage.getItem(GMK) || ''; }catch(_){ return ''; } })();
  const mpu = () => { try{ return (unitToMM() || 1) / 1000; }catch(_){ return 0.001; } };   // mét trên một đơn vị bản vẽ
  const frame = g => { const th = (g.north || 0) * Math.PI / 180; return { N: { x: -Math.sin(th), y: Math.cos(th) }, E: { x: Math.cos(th), y: Math.sin(th) }, u: mpu(), D: { x: g.dx || 0, y: g.dy || 0 }, lat0: g.lat, lon0: g.lon, c0: Math.cos(g.lat * Math.PI / 180) }; };
  const toLL = (F, p) => { const vx = p.x - F.D.x, vy = p.y - F.D.y; const e = (vx * F.E.x + vy * F.E.y) * F.u, nn = (vx * F.N.x + vy * F.N.y) * F.u; return { lat: F.lat0 + nn / R_E * 180 / Math.PI, lon: F.lon0 + e / (R_E * F.c0) * 180 / Math.PI }; };
  const fromLL = (F, lat, lon) => { const nn = (lat - F.lat0) * Math.PI / 180 * R_E, e = (lon - F.lon0) * Math.PI / 180 * R_E * F.c0; return { x: F.D.x + (e * F.E.x + nn * F.N.x) / F.u, y: F.D.y + (e * F.E.y + nn * F.N.y) / F.u }; };
  const lon2t = (lon, z) => (lon + 180) / 360 * 2 ** z, lat2t = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z; };
  const t2lon = (x, z) => x / 2 ** z * 360 - 180, t2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / 2 ** z; return 180 / Math.PI * Math.atan(Math.sinh(n)); };
  const TILE = new Map(); let gmTimer = 0; A.geomapTiles = TILE;
  const tileUrl = (mode, z, x, y) => (mode === 'aerial' ? GEOMAPURL : (mode === 'custom' ? GEOMAPURL : OSM)).replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{s}', 'abc'[(x + y) % 3]);
  function tileImg(url){ let im = TILE.get(url); if(im) return im; im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { clearTimeout(gmTimer); gmTimer = setTimeout(() => { try{ draw(); }catch(_){} }, 60); }; im.onerror = () => { im._bad = 1; }; im.src = url; TILE.set(url, im); if(TILE.size > 600){ const k = TILE.keys().next().value; TILE.delete(k); } return im; }
  const mapMode = () => { try{ const g = A.geoGet ? A.geoGet() : null; return g && g.map ? g.map : null; }catch(_){ return null; } };
  function drawMap(){ const g = A.geoGet ? A.geoGet() : null; if(!g || !g.map || plotMode || (typeof _exporting !== 'undefined' && _exporting)) return; try{ if(!isModelView()) return; }catch(_){ return; }
    if(g.map !== 'road' && !GEOMAPURL) return;
    const F = frame(g), bb = viewWorldAABB(); const C = [{ x: bb.minX, y: bb.minY }, { x: bb.maxX, y: bb.minY }, { x: bb.maxX, y: bb.maxY }, { x: bb.minX, y: bb.maxY }].map(p => toLL(F, p));
    const la0 = Math.min(...C.map(c => c.lat)), la1 = Math.max(...C.map(c => c.lat)), lo0 = Math.min(...C.map(c => c.lon)), lo1 = Math.max(...C.map(c => c.lon)); if(!(la1 > -85 && la0 < 85)) return;
    const mppScreen = F.u / Math.max(1e-12, view.scale); let z = Math.round(Math.log2(156543.03392 * Math.cos(g.lat * Math.PI / 180) / Math.max(1e-6, mppScreen))); z = Math.max(1, Math.min(19, z));
    let x0, x1, y0, y1; for(;;){ x0 = Math.floor(lon2t(lo0, z)); x1 = Math.floor(lon2t(lo1, z)); y0 = Math.floor(lat2t(Math.min(85, la1), z)); y1 = Math.floor(lat2t(Math.max(-85, la0), z)); if((x1 - x0 + 1) * (y1 - y0 + 1) <= 80 || z <= 1) break; z--; }
    const g2 = ctx; g2.save(); g2.globalAlpha = 0.92; const n = 2 ** z;
    for(let ty = y0; ty <= y1; ty++) for(let tx = x0; tx <= x1; tx++){ if(ty < 0 || ty >= n) continue; const xx = ((tx % n) + n) % n; const im = tileImg(tileUrl(g.map, z, xx, ty)); if(!im.complete || !im.naturalWidth || im._bad) continue;
      const P = (ix, iy) => toScreen(...Object.values(fromLL(F, t2lat(iy, z), t2lon(ix, z)))); const a = P(tx, ty), b = P(tx + 1, ty), c = P(tx, ty + 1);
      const dpr = window.devicePixelRatio || 1; g2.setTransform(dpr * (b.x - a.x) / 256, dpr * (b.y - a.y) / 256, dpr * (c.x - a.x) / 256, dpr * (c.y - a.y) / 256, dpr * a.x, dpr * a.y); try{ g2.drawImage(im, 0, 0, 256, 256); }catch(_){} }
    g2.restore(); const dpr = window.devicePixelRatio || 1; g2.save(); g2.setTransform(dpr, 0, 0, dpr, 0, 0); const txt = g.map === 'road' ? '© OpenStreetMap contributors' : (GEOMAPURL.replace(/^https?:\/\//, '').split('/')[0] || 'map'); g2.font = '11px system-ui,sans-serif'; const w = g2.measureText(txt).width + 10, cw = W(), ch = H();
    g2.fillStyle = 'rgba(255,255,255,.75)'; g2.fillRect(cw - w - 4, ch - 20, w, 16); g2.fillStyle = '#333'; g2.fillText(txt, cw - w + 1, ch - 8); g2.restore(); }
  A.geomapDraw = drawMap;
  { const _dg = window.drawGrid; if(typeof _dg === 'function') window.drawGrid = function(){ try{ drawMap(); }catch(err){ console.warn('geomap', err); } return _dg.apply(this, arguments); }; }
  ecmd(['GEOMAP'], 'Bản đồ nền theo vị trí địa lý: Đường (OpenStreetMap) / Ảnh vệ tinh (dịch vụ GEOMAPURL) / Tắt', async () => {
    const g = A.geoGet ? A.geoGet() : null; if(!g){ log('Bản vẽ chưa có vị trí địa lý — dùng GEOGRAPHICLOCATION trước.'); return; }
    const k = await A.getKw('Bản đồ nền [Đường / Ảnh vệ tinh / Tắt]', { kw: [{ k: 'R', t: 'Đường' }, { k: 'A', t: 'Ảnh vệ tinh' }, { k: 'O', t: 'Tắt' }], def: g.map ? 'Tắt' : 'Đường' }); if(k.cancel) return;
    const mode = k.kw === 'A' ? 'aerial' : k.kw === 'O' ? null : 'road';
    if(mode === 'aerial' && !GEOMAPURL){ const r = await A.getStr('URL mẫu dịch vụ ảnh vệ tinh ({z}/{x}/{y})', { def: '' }); const u = String(r.str || '').trim(); if(!/\{z\}/.test(u) || !/\{x\}/.test(u) || !/\{y\}/.test(u)){ log('Cần URL có {z}, {x}, {y} (đặt bằng biến GEOMAPURL).'); return; } GEOMAPURL = u; try{ localStorage.setItem(GMK, u); }catch(_){} }
    const g2 = Object.assign({}, g); if(mode) g2.map = mode; else delete g2.map; A.geoSet(g2); try{ draw(); }catch(_){}
    log(mode ? 'GEOMAP: bản đồ ' + (mode === 'road' ? 'đường (OpenStreetMap)' : 'ảnh vệ tinh') + ' hiện dưới bản vẽ (Model).' : 'GEOMAP: tắt bản đồ nền.'); });
  if(A.sysvar && A.sysvar.def){ A.sysvar.def('GEOMAPMODE', { d: 'Bản đồ nền: 0 tắt, 1 ảnh vệ tinh, 2 đường', get: () => { const m = mapMode(); return m === 'road' ? 2 : m ? 1 : 0; }, set: v => { const g = A.geoGet && A.geoGet(); if(!g) return; const g2 = Object.assign({}, g); const n = +v; if(n === 2) g2.map = 'road'; else if(n === 1) g2.map = 'aerial'; else delete g2.map; A.geoSet(g2); } });
    A.sysvar.def('GEOMAPURL', { d: 'URL mẫu ô bản đồ ảnh vệ tinh / riêng ({z}/{x}/{y}) cho GEOMAP', s: 1, get: () => GEOMAPURL, set: v => { GEOMAPURL = String(v || '').trim(); try{ localStorage.setItem(GMK, GEOMAPURL); }catch(_){} try{ draw(); }catch(_){} } }); }

  /* ==================================================================
     MÁY VẼ HPGL/2 (.plt): nét, cung (theo dây cung), kiểu nét, vùng tô / chữ (đa giác FP), bề rộng nét (PW), màu bút (PC)
     Bút = bút vật lý (physical pen) của bảng kiểu in → bút ảo (virtual pen) → số màu ACI
     ================================================================== */
  function hpglPlot(){ if(!A.plotGeom) return null; const G = A.plotGeom(), PSx = A.PS || {}, k = G.k, PLU = 40;
    const X = x => Math.round((G.ox + (x - G.area.x0) * k) * PLU), Y = y => Math.round((G.Hmm - G.oy - (G.area.y1 - y) * k) * PLU);
    const sv = { plot: plotMode, st: _plotStyle }; plotMode = true; _plotStyle = PSx.style === 'color' ? '' : (PSx.style || 'mono');
    const out = ['IN;', 'BP1,"DVDCAD";', 'PS' + Math.round(G.Wmm * PLU) + ',' + Math.round(G.Hmm * PLU) + ';', 'RO0;', 'IP;', 'SC;', 'NP256;', 'CR0,255,0,255,0,255;', 'PA;', 'LA1,4,2,4;', 'FT1;', 'WU0;',
      'IW' + X(G.area.x0) + ',' + Y(G.area.y0) + ',' + X(G.area.x1) + ',' + Y(G.area.y1) + ';'];
    const pens = new Map(); let curPen = -1, curW = -1;
    const rgbOf = c => { c = String(c || '#000'); let m = /^#([0-9a-f]{3})$/i.exec(c); if(m) c = '#' + m[1].split('').map(x => x + x).join(''); m = /^#([0-9a-f]{6})/i.exec(c); if(m){ const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } m = /rgba?\(([^)]+)\)/.exec(c); if(m){ const q = m[1].split(',').map(v => parseFloat(v)); return [q[0] | 0, q[1] | 0, q[2] | 0]; } return [0, 0, 0]; };
    const penOf = e => { const src = e.col || A.layerHex(e.layer || '0'); let aci = 7; try{ aci = A.aciOf ? A.aciOf(src) : A.aciNear(src); }catch(_){} const st = A.ctbStyleOf ? A.ctbStyleOf(e) : null;
      const pen = Math.max(1, Math.min(255, st && st.pn > 0 ? st.pn : st && st.vp > 0 ? st.vp : (aci || 7))); let col = '#000000'; try{ col = plotColor(src); }catch(_){}
      const lw = st && st.lw > 0 ? st.lw : (PSx.lw ? (lwOf(e) || 25) : 25); return { pen, rgb: rgbOf(col), w: Math.max(0.05, lw / 100), st }; };
    const sel = P => { if(!pens.has(P.pen)){ pens.set(P.pen, P.rgb); out.push('PC' + P.pen + ',' + P.rgb.join(',') + ';'); } if(P.pen !== curPen){ out.push('SP' + P.pen + ';'); curPen = P.pen; curW = -1; } if(Math.abs(P.w - curW) > 1e-6){ out.push('PW' + (+P.w.toFixed(3)) + ',' + P.pen + ';'); curW = P.w; } };
    // kiểu nét: mẫu bảng kiểu in (mm) hoặc kiểu nét của đối tượng (đơn vị bản vẽ → mm giấy)
    const dashOf = (e, P) => { if(P.st && P.st.lt != null && A.PSLT && A.PSLT[P.st.lt]){ const pat = A.PSLT[P.st.lt][1]; return pat && pat.length ? pat.map(v => Math.abs(v) || 0.1).map((v, i) => i % 2 ? -v : v) : null; }
      let n = null; try{ n = ltNameOf(e); }catch(_){} if(!n) return null; const d = ltDef(n); if(!d || !d.pat || !d.pat.length) return null; const s0 = (typeof LTSCALE !== 'undefined' ? LTSCALE : 1) * (e.lts || 1) * k; return d.pat.map(v => v * s0); };
    const stroke = (pts, closed, P, dash) => { if(pts.length < 2) return; sel(P); const Q = pts.map(p => [X(p.x), Y(p.y)]); if(closed) Q.push(Q[0]);
      if(!dash){ out.push('PU' + Q[0].join(',') + ';PD' + Q.slice(1).map(q => q.join(',')).join(',') + ';'); return; }
      const pat = dash.map(v => v * PLU), tot = pat.reduce((a, v) => a + Math.max(Math.abs(v), 1), 0); if(!(tot > 2)){ out.push('PU' + Q[0].join(',') + ';PD' + Q.slice(1).map(q => q.join(',')).join(',') + ';'); return; }
      let pi = 0, left = Math.max(Math.abs(pat[0]), pat[0] === 0 ? 2 : 0), on = pat[0] >= 0, buf = [];
      const flush = () => { if(buf.length >= 2) out.push('PU' + buf[0].join(',') + ';PD' + buf.slice(1).map(q => q.join(',')).join(',') + ';'); buf = []; };
      for(let i = 1; i < Q.length; i++){ let [ax, ay] = Q[i - 1]; const [bx, by] = Q[i]; let L = Math.hypot(bx - ax, by - ay); if(on && !buf.length) buf.push([ax, ay]);
        while(L > 1e-9){ const d = Math.min(L, left); const t = d / L; const nx = Math.round(ax + (bx - ax) * t), ny = Math.round(ay + (by - ay) * t); if(on) buf.push([nx, ny]); ax = nx; ay = ny; L -= d; left -= d;
          if(left <= 1e-9){ if(on) flush(); pi = (pi + 1) % pat.length; on = pat[pi] >= 0; left = Math.abs(pat[pi]) || 2; if(on) buf.push([ax, ay]); } } }
      if(on) flush(); };
    const fill = (loops, P) => { const L = loops.filter(l => l && l.length >= 3); if(!L.length) return; sel(P); L.forEach((l, i) => { const Q = l.map(p => [X(p.x), Y(p.y)]); out.push((i ? 'PM1;' : 'PU' + Q[0].join(',') + ';PM0;') + (i ? 'PU' + Q[0].join(',') + ';' : '') + 'PD' + Q.slice(1).map(q => q.join(',')).join(',') + ',' + Q[0].join(',') + ';'); }); out.push('PM2;FP0;'); };
    const sample = e => { const c = A.G && A.G.curveOf ? A.G.curveOf(e) : null; if(!c || !c.at) return null; const lenMM = (c.len || 0) * k, n = Math.max(8, Math.min(4000, Math.max(Math.ceil(lenMM / 0.3), (e.vertices || []).length * 2))); const P = []; for(let i = 0; i <= n; i++) P.push(c.at(c.u0 + (c.u1 - c.u0) * i / n)); return P; };
    const one = (e, P) => { const t = e.type;
      if(t === 'LINE'){ stroke([{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }], false, P, dashOf(e, P)); return; }
      if(t === 'POINT'){ sel(P); out.push('PU' + X(e.x) + ',' + Y(e.y) + ';PD;'); return; }
      if(t === 'TEXT'){ const L = A.textOutline ? A.textOutline(e, { px: Math.max(24, Math.min(140, (e.h || 2.5) * k * 12)) }) : []; fill(L, P); return; }
      if(t === 'HATCH'){ const loops = (e.loops || []).filter(l => l && l.length >= 3); if(e.solid || e.grad){ fill(loops, P); return; } const bb = entBBox(e); const r = bb && A.patternSegs ? A.patternSegs(e, bb, 40000) : null; if(!r) return;
        for(const sg of r.segs) for(const c of (A.clipSegToLoops ? A.clipSegToLoops(sg[0], sg[1], sg[2], sg[3], loops) : [sg])) stroke([{ x: c[0], y: c[1] }, { x: c[2], y: c[3] }], false, P, null); return; }
      if(t === 'SOLID'){ const p = e.pts || []; if(p.length >= 3) fill([p.length === 4 ? [p[0], p[1], p[3], p[2]] : p], P); return; }
      if(t === 'IMAGE'){ try{ stroke(e.cpoly || imgCorners(e), true, P, null); }catch(_){} return; }
      if(t === 'SOLID3D'){ for(const x of (A.solidPlan ? A.solidPlan(e) || [] : [])) one(x, P); return; }
      if(t === 'XLINE'){ const big = Math.max(G.area.x1 - G.area.x0, G.area.y1 - G.area.y0) * 4, L = Math.hypot(e.dx, e.dy) || 1; stroke([{ x: e.x - (e.ray ? 0 : e.dx / L * big), y: e.y - (e.ray ? 0 : e.dy / L * big) }, { x: e.x + e.dx / L * big, y: e.y + e.dy / L * big }], false, P, null); return; }
      if(e.wq && e.wq.length){ fill(e.wq, P); return; }
      const pts = sample(e); if(pts) stroke(pts, false, P, dashOf(e, P)); };
    let n = 0;
    try{ for(const e of entities){ if(!e || e.vpf || e.vh || e.xh || e.avh || (A.isHiddenE && A.isHiddenE(e))) continue; let bb = null; try{ bb = entBBox(e); }catch(_){} if(bb && (bb.x1 < G.area.x0 || bb.x0 > G.area.x1 || bb.y1 < G.area.y0 || bb.y0 > G.area.y1)) continue;
        const P = penOf(e); const parts = e.clip && A.clipToRegion ? A.clipToRegion(Object.assign({}, e, { clip: undefined }), e.clip) : [e];
        for(const x of parts){ try{ one(x, P); n++; }catch(err){ console.warn('hpgl', err); } } } }
    finally { plotMode = sv.plot; _plotStyle = sv.st; }
    out.push('PU;SP0;PG;');
    return { data: out.join('\n') + '\n', pens: pens.size, ents: n }; }
  A.hpglPlot = hpglPlot;

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
