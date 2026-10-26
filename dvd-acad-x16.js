/* DVDCAD v5f — bổ sung lệnh AutoCAD còn thiếu
   · Khung nhìn layout: VPLAYER (đóng băng lớp riêng từng khung nhìn) · LAYVPI · VPCLIP (cắt khung nhìn theo đa giác) · VPSYNC · SPACETRANS
   · Nhập / xuất: IMPORT · ATTACH · ACISIN (.sat / .sab) · ETRANSMIT / ARCHIVE (gói .zip: bản vẽ + ảnh + xref) · 3DPRINT · EXPORTTOAUTOCAD
                 TIFOUT · BMPOUT (ảnh BMP thật) · XOPEN · RECOVERALL · REINIT
   · Kiểu nét: MKLTYPE (tạo kiểu nét từ đoạn thẳng / điểm vẽ sẵn, xuất .lin)
   · Ảnh: IMAGEFRAME (0/1/2) · IMAGEQUALITY
   · Đèn: SPOTLIGHT · DISTANTLIGHT · LIGHTLIST (bật / tắt, cường độ, màu)
   · 3D: SEPARATE (tách khối rời thành nhiều khối)
   · Thiết lập: AUTOCOMPLETE · DRAGMODE
   · Tên gọi khác: DVIEW · XBIND · SOLPROF · SOLVIEW · PASTESPEC · COPYLINK · TPNAVIGATE · MATBROWSEROPEN · SHEETSET / SSM · 3DALIGN */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x16 || !window.DVDCmd) return; A._x16 = true;
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
  const has = k => (DVDCmd.commands || []).some(c => c.k && c.k.includes(k));
  const kwOnOff = (msg, on) => A.getKw(msg + ' [Bật / Tắt]', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: on ? 'OFF' : 'ON' });
  const lsGet = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(_){} };
  const redraw = () => { try{ bbDirty = true; invalidateSnap(); }catch(_){} try{ draw(); }catch(_){} };
  function pickFile(accept){ return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); }); }
  const baseName = () => String((typeof currentName !== 'undefined' && currentName) || 'banve').replace(/\.(dwg|dxf)$/i, '').replace(/[\\/:*?"<>|]+/g, '_') || 'banve';
  const save = (blob, name, mime) => { try{ return shareOrDownload(blob, name, mime); }catch(_){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } };
  const wild = s => new RegExp('^' + String(s).trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');

  /* =====================================================================
     1) KHUNG NHÌN LAYOUT: VPLAYER · LAYVPI · VPCLIP · VPSYNC · SPACETRANS
        Dữ liệu riêng của khung nhìn (lớp đóng băng, đa giác cắt) lưu trên máy theo bản vẽ + layout + số thứ tự khung nhìn.
     ===================================================================== */
  const VPK = 'dvd:vpx'; let _vx = null;
  const vxAll = () => { if(!_vx){ try{ _vx = JSON.parse(localStorage.getItem(VPK) || '{}') || {}; }catch(_){ _vx = {}; } } return _vx; };
  const docKey = () => { try{ return (typeof baseKey !== 'undefined' && baseKey) || currentName || '_'; }catch(_){ return '_'; } };
  window.vpExtra = (L, vi) => { const d = vxAll()[docKey()]; const l = d && L && d[L.name]; const v = L && L.paper && L.paper.viewports && L.paper.viewports[vi]; return (l && l[vi]) || (v && v.vx) || null; };   // bản riêng trên máy, nếu không thì lấy từ tệp (VIEWPORT 331 / 340)
  function vxSet(L, vi, patch){
    const all = vxAll(), dk = docKey(); const d = all[dk] || (all[dk] = {}); const l = d[L.name] || (d[L.name] = {}); const o = Object.assign({}, l[vi] || {}, patch);
    for(const k of Object.keys(o)) if(o[k] == null || (Array.isArray(o[k]) && !o[k].length)) delete o[k];
    if(Object.keys(o).length) l[vi] = o; else delete l[vi];
    if(!Object.keys(l).length) delete d[L.name]; if(!Object.keys(d).length) delete all[dk];
    lsSet(VPK, JSON.stringify(all));
  }
  function paperL(){ try{ const L = dwgLayouts[currentLayout]; if(L && !L.isModel && L.paper && L.paper.viewports && L.paper.viewports.length) return L; }catch(_){} log('Mở một layout có khung nhìn trước (tab layout phía dưới).'); return null; }
  function rebuild(){ try{ const L = dwgLayouts[currentLayout]; if(L && !L.isModel && L.paper){ entities = buildPaperEntities(L); } }catch(_){} redraw(); try{ A.paint(); }catch(_){} }
  const vpIndexAt = (L, p) => { let best = -1, ba = Infinity; L.paper.viewports.forEach((v, i) => { if(Math.abs(p.x - v.vcx) <= v.w / 2 + 1e-9 && Math.abs(p.y - v.vcy) <= v.h / 2 + 1e-9 && v.w * v.h < ba){ ba = v.w * v.h; best = i; } }); return best; };   /* khung chồng nhau: lấy khung nhỏ nhất (nằm trên) */
  async function pickVP(L, msg, allowNone){
    if(L.paper.viewports.length === 1 && !allowNone) return 0;
    for(;;){ const r = await A.getPoint(msg || 'Bấm vào trong khung nhìn', { noLim: true }); if(!r.pt) return -1; const i = vpIndexAt(L, r.pt); if(i >= 0) return i; log('Điểm không nằm trong khung nhìn nào.'); }
  }
  async function pickVPs(L, msg){
    const out = new Set(); for(;;){ const r = await A.getPoint(msg + (out.size ? ' (' + out.size + ' đã chọn, Enter = xong)' : ''), { noLim: true }); if(!r.pt) break; const i = vpIndexAt(L, r.pt); if(i >= 0){ out.add(i); log('Khung nhìn #' + (i + 1) + ' đã chọn.'); } else log('Điểm không nằm trong khung nhìn nào.'); }
    return [...out];
  }
  const allLayers = () => { const s = new Set(['0']); for(const e of ME()) if(e.layer) s.add(String(e.layer)); try{ for(const n of Object.keys(LAYER_COLOR || {})) s.add(n); }catch(_){} return [...s]; };
  async function askLayers(msg){
    const r = await A.getStr(msg + ' (tên, dấu phẩy, ký tự * ?) hoặc Enter để chọn đối tượng', { def: '' }); if(r.none && r.str == null) return null;
    const t = String(r.str || '').trim();
    if(t){ const pats = t.split(',').map(wild); const L = allLayers().filter(n => pats.some(re => re.test(n))); if(!L.length){ log('Không có lớp nào khớp "' + t + '".'); return []; } return L; }
    const s = await A.getSel('Chọn đối tượng thuộc lớp cần đổi'); return [...new Set((s.sel || []).map(e => String(e.layer || '0')))];
  }
  cmd(['VPLAYER'], 'Đóng băng / làm tan lớp riêng trong từng khung nhìn của layout', async () => {
    const L = paperL(); if(!L) return;
    const k = await A.getKw('VPLAYER [Đóng băng / Làm tan / Đặt lại / Liệt kê]', { kw: [{ k: 'F', t: 'Đóng băng' }, { k: 'T', t: 'Làm tan' }, { k: 'R', t: 'Đặt lại' }, { k: 'L', t: 'Liệt kê' }], def: 'Đóng băng' }); const op = k.kw || 'F';
    if(op === 'L'){ const i = await pickVP(L, 'Bấm vào khung nhìn cần xem'); if(i < 0) return; const X = vpExtra(L, i); log('Khung nhìn #' + (i + 1) + ' — lớp đóng băng: ' + (X && X.frz && X.frz.length ? X.frz.join(', ') : '(không có)')); return; }
    let lays = null; if(op !== 'R'){ lays = await askLayers(op === 'F' ? 'Lớp cần đóng băng' : 'Lớp cần làm tan'); if(!lays || !lays.length) return; }
    const sc = await A.getKw('Áp dụng cho [Chọn khung nhìn / Tất cả]', { kw: [{ k: 'S', t: 'Chọn khung nhìn' }, { k: 'A', t: 'Tất cả' }], def: 'Chọn khung nhìn' });
    const idx = sc.kw === 'A' ? L.paper.viewports.map((_, i) => i) : (L.paper.viewports.length === 1 ? [0] : await pickVPs(L, 'Bấm vào khung nhìn'));
    if(!idx.length) return;
    for(const i of idx){ const X = vpExtra(L, i) || {}; const f = new Set(X.frz || []); if(op === 'R') f.clear(); else for(const n of lays) op === 'F' ? f.add(n) : f.delete(n); vxSet(L, i, { frz: [...f] }); }
    rebuild(); log('VPLAYER: ' + (op === 'R' ? 'đã làm tan mọi lớp' : (op === 'F' ? 'đóng băng ' : 'làm tan ') + lays.join(', ')) + ' — ' + idx.length + ' khung nhìn.');
  });
  cmd(['LAYVPI'], 'Đóng băng lớp của đối tượng chọn trong mọi khung nhìn khác (chỉ hiện ở khung nhìn đang chọn)', async () => {
    const L = paperL(); if(!L) return; if(L.paper.viewports.length < 2){ log('Layout chỉ có 1 khung nhìn.'); return; }
    const i = await pickVP(L, 'Bấm vào khung nhìn giữ lại các lớp'); if(i < 0) return;
    const s = await A.getSel('Chọn đối tượng (lớp của chúng sẽ bị đóng băng ở các khung nhìn khác)'); const lays = [...new Set((s.sel || []).map(e => String(e.layer || '0')))]; if(!lays.length) return;
    L.paper.viewports.forEach((_, j) => { if(j === i) return; const X = vpExtra(L, j) || {}; const f = new Set(X.frz || []); for(const n of lays) f.add(n); vxSet(L, j, { frz: [...f] }); });
    rebuild(); log('LAYVPI: lớp ' + lays.join(', ') + ' chỉ còn hiện ở khung nhìn #' + (i + 1) + '.');
  });
  cmd(['VPCLIP'], 'Cắt khung nhìn layout theo đa giác (hoặc đối tượng kín), Xoá để bỏ cắt', async () => {
    const L = paperL(); if(!L) return; const i = await pickVP(L, 'Bấm vào khung nhìn cần cắt'); if(i < 0) return;
    const k = await A.getKw('Đường cắt [Đa giác / Đối tượng / Xoá]', { kw: [{ k: 'P', t: 'Đa giác' }, { k: 'O', t: 'Đối tượng' }, { k: 'D', t: 'Xoá' }], def: 'Đa giác' });
    if(k.kw === 'D'){ vxSet(L, i, { cp: null }); rebuild(); log('VPCLIP: đã bỏ đường cắt khung nhìn #' + (i + 1) + '.'); return; }
    let pts = [];
    if(k.kw === 'O'){
      const r = await A.getEnt('Chọn đối tượng kín (đa tuyến kín, đường tròn) trên giấy', { filter: e => e.type === 'CIRCLE' || (e.type === 'POLYLINE' && (e.vertices || []).length >= 3) }); if(!r.ent) return; const e = r.ent;
      if(e.type === 'CIRCLE') for(let j = 0; j < 72; j++){ const a = j / 72 * Math.PI * 2; pts.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); }
      else pts = e.vertices.map(v => ({ x: v.x, y: v.y }));
    } else {
      for(;;){ const r = await A.getPoint(pts.length < 3 ? 'Điểm thứ ' + (pts.length + 1) + ' của đa giác cắt' : 'Điểm tiếp theo (Enter = đóng)', { base: pts.length ? pts[pts.length - 1] : undefined, noLim: true, preview: (g, p) => { if(pts.length) g.poly(pts.concat([p]), true, '#5fa8ff', [6, 4]); } }); if(!r.pt) break; pts.push(r.pt); }
    }
    if(pts.length < 3){ log('Cần ít nhất 3 điểm.'); return; }
    vxSet(L, i, { cp: pts.map(p => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })) }); rebuild(); log('VPCLIP: khung nhìn #' + (i + 1) + ' đã cắt theo ' + pts.length + ' đỉnh.');
  });
  cmd(['VPSYNC'], 'Đồng bộ tỉ lệ và căn thẳng vùng nhìn của các khung nhìn theo khung nhìn chính', async () => {
    const L = paperL(); if(!L) return; if(L.paper.viewports.length < 2){ log('Layout chỉ có 1 khung nhìn.'); return; }
    const m = await pickVP(L, 'Bấm vào khung nhìn chính', true); if(m < 0) return;
    let sl = await pickVPs(L, 'Bấm vào khung nhìn cần đồng bộ'); if(!sl.length) sl = L.paper.viewports.map((_, i) => i); sl = sl.filter(i => i !== m); if(!sl.length) return;
    const M = L.paper.viewports[m]; const s = M.h / M.vh;
    const D = L.user && L.def ? deep(L.def) : null;
    for(const i of sl){ const v = L.paper.viewports[i]; v.vh = v.h / s; v.dcx = M.dcx + (v.vcx - M.vcx) / s; v.dcy = M.dcy + (v.vcy - M.vcy) / s;
      if(D && D.vps[i] && D.vps[m]){ D.vps[i].n = D.vps[m].n; D.vps[i].cx = v.dcx; D.vps[i].cy = v.dcy; } }
    if(D && A.saveLayoutDef) A.saveLayoutDef(D); else rebuild();
    log('VPSYNC: ' + sl.length + ' khung nhìn đã theo tỉ lệ và vị trí của khung nhìn #' + (m + 1) + (D ? '.' : ' (layout của file DWG: giữ đến khi mở lại file).'));
  });
  cmd(['SPACETRANS'], 'Đổi chiều dài giữa không gian giấy và mô hình theo tỉ lệ khung nhìn', async () => {
    const L = paperL(); if(!L) return; const i = await pickVP(L, 'Bấm vào khung nhìn lấy tỉ lệ'); if(i < 0) return; const v = L.paper.viewports[i]; const s = v.h / v.vh;
    const k = await A.getKw('Đổi [Giấy → Mô hình / Mô hình → Giấy]', { kw: [{ k: 'P', t: 'Giấy → Mô hình' }, { k: 'M', t: 'Mô hình → Giấy' }], def: 'Giấy → Mô hình' });
    const toModel = k.kw !== 'M'; const r = await A.getNum(toModel ? 'Chiều dài trên giấy' : 'Chiều dài trong mô hình', { def: toModel ? 2.5 : 1000 }); if(!(r.num > 0)) return;
    const out = toModel ? r.num / s : r.num * s; MEM.spacetrans = out;
    log('SPACETRANS: ' + r.num + (toModel ? ' (giấy) = ' : ' (mô hình) = ') + (+out.toPrecision(6)) + (toModel ? ' (mô hình)' : ' (giấy)') + ' · tỉ lệ khung nhìn #' + (i + 1) + ' = ' + (+s.toPrecision(6)) + '.');
    try{ navigator.clipboard && navigator.clipboard.writeText(String(+out.toPrecision(6))).catch(() => {}); }catch(_){}
  });

  /* =====================================================================
     2) NHẬP / XUẤT
     ===================================================================== */
  cmd(['ACISIN'], 'Nhập khối 3D từ file ACIS (.sat / .sab)', async () => {
    if(!window.DVDAcis){ log('Thiếu bộ đọc ACIS.'); return; }
    const f = await pickFile('.sat,.sab'); if(!f) return;
    let e = null; try{ if(/\.sab$/i.test(f.name)) e = DVDAcis.fromSAB(new Uint8Array(await f.arrayBuffer())); else e = DVDAcis.fromSAT((await f.text()).split(/\r?\n/)); }catch(err){ console.warn(err); }
    const ents = (Array.isArray(e) ? e : [e]).filter(Boolean); if(!ents.length){ log('ACISIN: không đọc được khối nào trong ' + f.name + '.'); return; }
    for(const x of ents) A.newProps(x); A.commit({ add: ents }, 'ACISIN'); log('ACISIN: đã nhập ' + ents.length + ' khối 3D từ ' + f.name + '.');
  });
  function chooser(title, rows){
    const list = rows.filter(r => has(r[0]));
    A.dialog({ title, noOk: true, html: '<div class="x16-ch" style="display:grid;gap:6px">' + list.map(r => '<button class="tg" data-c="' + r[0] + '" style="text-align:left;padding:8px 10px"><b translate="no">' + r[0] + '</b> — ' + esc(r[1]) + '</button>').join('') + '</div>',
      onOpen: root => root.addEventListener('click', ev => { const b = ev.target.closest('[data-c]'); if(!b) return; const c = b.dataset.c; const d = b.closest('.dvd-dlg, .dvd-modal, [role="dialog"]') || root; try{ (d.remove ? d : root).remove(); }catch(_){} later(() => DVDCmd.run(c)); }) });
  }
  plain(['IMPORT', 'IMP'], 'Nhập file khác vào bản vẽ (PDF, ACIS, ảnh, bảng, DWG/DXF)', () => { if(A.busy()) A.cancel(true); chooser('Nhập file (IMPORT)', [
    ['PDFIMPORT', 'PDF → nét vẽ, chữ'], ['ACISIN', 'ACIS .sat / .sab → khối 3D'], ['IMAGEATTACH', 'Ảnh (JPG, PNG…) làm nền'], ['TABLEIMPORT', 'Bảng CSV / Excel → bảng'], ['XATTACH', 'DWG / DXF làm tham chiếu ngoài'], ['ADCENTER', 'Lấy khối, lớp… từ bản vẽ khác'], ['APPLOAD', 'Add-in (.lsp / .js)']]); });
  plain(['ATTACH'], 'Gắn file tham chiếu: DWG/DXF, ảnh, PDF', () => { if(A.busy()) A.cancel(true); chooser('Gắn tham chiếu (ATTACH)', [
    ['XATTACH', 'DWG / DXF (XREF)'], ['IMAGEATTACH', 'Ảnh (JPG, PNG…)'], ['PDFATTACH', 'PDF làm nền'], ['DATALINK', 'Liên kết dữ liệu bảng (CSV / Excel)']]); });

  /* ---- ETRANSMIT / ARCHIVE: gói .zip (không nén) ---- */
  const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for(let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files){
    const enc = new TextEncoder(), parts = [], cds = []; let off = 0; const d = new Date();
    const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    for(const f of files){ const nm = enc.encode(f.name), data = f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      parts.push(new Uint8Array(h.buffer), nm, data); cds.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length; }
    const cdSize = cds.reduce((s, u) => s + u.length, 0); const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cds, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  A.zipStore = zipStore;
  const toU8 = async x => x == null ? null : x instanceof Uint8Array ? x : x instanceof ArrayBuffer ? new Uint8Array(x) : x instanceof Blob ? new Uint8Array(await x.arrayBuffer()) : new TextEncoder().encode(String(x));
  async function transmit(archive){
    if(!ME().length){ say('Chưa có bản vẽ.'); return; }
    const nm = baseName(), files = [], rep = [], used = new Set();
    const uniq = n => { let s = n, k = 1; while(used.has(s.toLowerCase())) s = n.replace(/(\.[^.]*)?$/, m => '_' + (k++) + (m || '')); used.add(s.toLowerCase()); return s; };
    let dxf; try{ dxf = entitiesToDXF(ME().filter(e => !e.xr), { layouts: true }); }catch(err){ console.warn(err); log('Không tạo được DXF.'); return; }
    files.push({ name: uniq(nm + '.dxf'), data: await toU8(dxf) }); rep.push('Bản vẽ: ' + nm + '.dxf (' + ME().filter(e => !e.xr).length + ' đối tượng)');
    const imgs = new Map(); for(const e of ME()) if(e.type === 'IMAGE' && e.img && !imgs.has(e.img)) imgs.set(e.img, e.name || e.img);
    for(const [id, n] of imgs){ let b = null; try{ b = A.proIdbGet ? await A.proIdbGet('img:' + id) : null; }catch(_){} if(b){ const fn = uniq('images/' + String(n).replace(/[\\/:*?"<>|]+/g, '_')); files.push({ name: fn, data: await toU8(b) }); rep.push('Ảnh: ' + fn); } else rep.push('Ảnh (thiếu dữ liệu): ' + n); }
    const X = (A.xrefList ? A.xrefList() : []) || [];
    for(const x of X){ let b = null; try{ b = A.proIdbGet ? await A.proIdbGet('xref:' + x.id) : null; }catch(_){} if(b){ const fn = uniq('xref/' + String(x.name).replace(/[\\/:*?"<>|]+/g, '_')); files.push({ name: fn, data: await toU8(b) }); rep.push('Tham chiếu: ' + fn); } else rep.push('Tham chiếu (thiếu dữ liệu): ' + x.name); }
    const now = new Date(); const txt = (archive ? 'ARCHIVE' : 'ETRANSMIT') + ' — DVDCAD\r\nBản vẽ gốc: ' + ((typeof currentName !== 'undefined' && currentName) || nm) + '\r\nNgày: ' + now.toLocaleString() + '\r\n\r\n' + rep.join('\r\n') + '\r\n';
    files.push({ name: uniq(nm + '_' + (archive ? 'archive' : 'transmittal') + '.txt'), data: new TextEncoder().encode(txt) });
    const blob = zipStore(files); await save(blob, nm + (archive ? '_archive' : '_etransmit') + '.zip', 'application/zip');
    log((archive ? 'ARCHIVE' : 'ETRANSMIT') + ': đã đóng gói ' + files.length + ' file (' + (blob.size / 1024).toFixed(0) + ' KB): bản vẽ, ' + imgs.size + ' ảnh, ' + X.length + ' tham chiếu.');
    return blob;
  }
  A.transmit = transmit;
  plain(['ETRANSMIT'], 'Đóng gói bản vẽ kèm ảnh, file tham chiếu thành .zip để gửi', () => transmit(false));
  plain(['ARCHIVE'], 'Lưu trữ bản vẽ cùng mọi file liên quan thành .zip', () => transmit(true));
  alias(['3DPRINT', '3DPRINTSERVICE', 'SENDTO3DPRINT'], 'EXPORTSTL', 'Gửi khối 3D đi in 3D (xuất STL)');
  alias(['EXPORTTOAUTOCAD', 'AECTOACAD'], 'SAVEAS', 'Xuất bản vẽ thuần AutoCAD (DXF)');
  alias(['RECOVERALL'], 'RECOVER', 'Khôi phục bản vẽ lỗi (RECOVER + AUDIT)');
  alias(['XBIND'], 'XREF', 'Gộp tham chiếu ngoài vào bản vẽ (nút ⤓ trong XREF)');
  plain(['REINIT'], 'Khởi động lại giao diện (nạp lại DVDCAD)', () => { A.dialog({ title: 'REINIT', html: '<div>Nạp lại DVDCAD? Thay đổi chưa lưu của bản vẽ sẽ mất (bản vẽ đã lưu / tự lưu vẫn mở lại được ở "Gần đây").</div>', ok: () => { try{ location.reload(); }catch(_){} } }); });
  cmd(['XOPEN'], 'Mở bản vẽ tham chiếu (XREF) đang chọn để sửa', async () => {
    const r = await A.getEnt('Chọn đối tượng thuộc tham chiếu ngoài', { filter: e => !!e.xr }); if(!r.ent) return; const id = r.ent.xr;
    const X = ((A.xrefList ? A.xrefList() : []) || []).find(x => x.id === id); if(!X){ log('Không tìm thấy tham chiếu.'); return; }
    let blob = null; try{ blob = await A.proIdbGet('xref:' + id); }catch(_){} if(!blob){ log('Không còn dữ liệu file ' + X.name + '.'); return; }
    later(async () => { if(X.kind === 'dwg' || /\.dwg$/i.test(X.name)) loadDWG(await blob.arrayBuffer(), X.name); else loadDXF(await new Response(blob).text(), X.name); });
    log('XOPEN: mở ' + X.name + '.');
  });
  /* ảnh BMP / TIFF từ khung nhìn */
  function viewCanvas(){ const c = document.getElementById('cv'); const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); const bg = getComputedStyle(c).backgroundColor; x.fillStyle = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : (plotMode ? '#ffffff' : '#1e232b'); x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0); return o; }
  function bmpOf(cv){ const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data; const row = (w * 3 + 3) & ~3, size = 54 + row * h; const b = new DataView(new ArrayBuffer(size));
    b.setUint16(0, 0x4d42, true); b.setUint32(2, size, true); b.setUint32(10, 54, true); b.setUint32(14, 40, true); b.setInt32(18, w, true); b.setInt32(22, h, true); b.setUint16(26, 1, true); b.setUint16(28, 24, true); b.setUint32(34, row * h, true); b.setInt32(38, 2835, true); b.setInt32(42, 2835, true);
    for(let y = 0; y < h; y++){ let o = 54 + (h - 1 - y) * row; for(let x = 0; x < w; x++){ const i = (y * w + x) * 4; b.setUint8(o++, d[i + 2]); b.setUint8(o++, d[i + 1]); b.setUint8(o++, d[i]); } }
    return new Blob([b.buffer], { type: 'image/bmp' }); }
  function tifOf(cv){ const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data; const n = 11, ifd = 8, ifdLen = 2 + n * 12 + 4, bpsOff = ifd + ifdLen, resOff = bpsOff + 6, dataOff = resOff + 16, size = dataOff + w * h * 3;
    const b = new DataView(new ArrayBuffer(size)); b.setUint16(0, 0x4949, true); b.setUint16(2, 42, true); b.setUint32(4, ifd, true); b.setUint16(ifd, n, true); let p = ifd + 2;
    const tag = (t, ty, c, v) => { b.setUint16(p, t, true); b.setUint16(p + 2, ty, true); b.setUint32(p + 4, c, true); if(ty === 3 && c === 1) b.setUint16(p + 8, v, true); else b.setUint32(p + 8, v, true); p += 12; };
    tag(256, 4, 1, w); tag(257, 4, 1, h); tag(258, 3, 3, bpsOff); tag(259, 3, 1, 1); tag(262, 3, 1, 2); tag(273, 4, 1, dataOff); tag(277, 3, 1, 3); tag(278, 4, 1, h); tag(279, 4, 1, w * h * 3); tag(282, 5, 1, resOff); tag(283, 5, 1, resOff + 8); b.setUint32(p, 0, true);
    for(let k = 0; k < 3; k++) b.setUint16(bpsOff + k * 2, 8, true); b.setUint32(resOff, 72, true); b.setUint32(resOff + 4, 1, true); b.setUint32(resOff + 8, 72, true); b.setUint32(resOff + 12, 1, true);
    // thẻ ResolutionUnit không bắt buộc (mặc định inch)
    let o = dataOff; for(let i = 0; i < d.length; i += 4){ b.setUint8(o++, d[i]); b.setUint8(o++, d[i + 1]); b.setUint8(o++, d[i + 2]); }
    return new Blob([b.buffer], { type: 'image/tiff' }); }
  A.bmpOf = bmpOf; A.tifOf = tifOf;
  plain(['BMPOUT'], 'Xuất khung nhìn hiện tại thành ảnh BMP', () => { const cv = viewCanvas(); save(bmpOf(cv), baseName() + '.bmp', 'image/bmp'); log('Đã xuất ảnh BMP ' + cv.width + '×' + cv.height + ' px.'); });
  plain(['TIFOUT', 'TIFFOUT'], 'Xuất khung nhìn hiện tại thành ảnh TIFF', () => { const cv = viewCanvas(); save(tifOf(cv), baseName() + '.tif', 'image/tiff'); log('Đã xuất ảnh TIFF ' + cv.width + '×' + cv.height + ' px.'); });

  /* =====================================================================
     3) MKLTYPE — tạo kiểu nét từ nét vẽ sẵn
     ===================================================================== */
  function patFrom(a, b, ents){
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy); if(len < 1e-9) return null; const ux = dx / len, uy = dy / len; const tol = len * 1e-4;
    const t = p => (p.x - a.x) * ux + (p.y - a.y) * uy, off = p => Math.abs(-(p.x - a.x) * uy + (p.y - a.y) * ux);
    const ev = [];
    for(const e of ents){
      if(e.type === 'LINE'){ const p = { x: e.x1, y: e.y1 }, q = { x: e.x2, y: e.y2 }; if(off(p) > len * 0.02 || off(q) > len * 0.02) continue; let s = Math.max(0, Math.min(t(p), t(q))), f = Math.min(len, Math.max(t(p), t(q))); if(f - s > tol) ev.push([s, f]); else if(f >= s) ev.push([s, s]); }
      else if(e.type === 'POINT'){ const p = { x: e.x, y: e.y }; if(off(p) > len * 0.02) continue; const s = t(p); if(s >= -tol && s <= len + tol) ev.push([Math.max(0, s), Math.max(0, s)]); }
    }
    if(!ev.length) return null; ev.sort((p, q) => p[0] - q[0]);
    const m = []; for(const e of ev){ const l = m[m.length - 1]; if(l && e[0] <= l[1] + tol && (e[1] > e[0] || l[1] > l[0])) l[1] = Math.max(l[1], e[1]); else m.push(e.slice()); }
    const pat = []; let cur = 0; const r = v => +v.toFixed(6);
    for(const [s, f] of m){ if(s > cur + tol) pat.push(-r(s - cur)); pat.push(f - s > tol ? r(f - s) : 0); cur = Math.max(cur, f); }
    if(len > cur + tol) pat.push(-r(len - cur));
    if(pat[0] < 0){ const g = pat.shift(); if(pat[pat.length - 1] < 0) pat[pat.length - 1] = r(pat[pat.length - 1] + g); else pat.push(g); }
    for(let i = 1; i < pat.length; i++) if(pat[i] <= 0 && pat[i - 1] <= 0 && pat[i] !== 0 && pat[i - 1] !== 0){ pat[i - 1] = r(pat[i - 1] + pat[i]); pat.splice(i--, 1); }
    return pat.length ? pat : null;
  }
  A.mkltPattern = patFrom;
  const linText = (n, d, pat) => '*' + n + ',' + (d || n) + '\r\nA,' + pat.map(v => String(v)).join(',') + '\r\n';
  cmd(['MKLTYPE'], 'Tạo kiểu nét mới từ đoạn thẳng / điểm vẽ sẵn (lưu kèm file .lin)', async () => {
    const n = await A.getStr('Tên kiểu nét mới', { def: MEM.mklt || 'NET_MOI' }); const name = String(n.str || '').trim().toUpperCase().replace(/\s+/g, '_'); if(!name) return;
    if(/^(CONTINUOUS|BYLAYER|BYBLOCK)$/.test(name) || !/^[\w$\-]+$/.test(name)){ log('Tên kiểu nét không hợp lệ.'); return; } MEM.mklt = name;
    if(LTYPES[name]){ const k = await A.getKw('Kiểu nét ' + name + ' đã có. Ghi đè? [Có / Không]', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Không' }); if(k.kw !== 'Y') return; }
    const d = await A.getStr('Mô tả', { def: name }); const desc = String(d.str || name).trim() || name;
    const a = await A.getPoint('Điểm đầu của một chu kỳ mẫu nét'); if(!a.pt) return;
    const b = await A.getPoint('Điểm cuối của chu kỳ', { base: a.pt }); if(!b.pt) return;
    const s = await A.getSel('Chọn các đoạn thẳng / điểm tạo mẫu nét', { filter: e => e.type === 'LINE' || e.type === 'POINT' }); const pat = patFrom(a.pt, b.pt, s.sel || []);
    if(!pat || !pat.some(v => v >= 0)){ log('MKLTYPE: không có đoạn thẳng / điểm nào nằm trên trục mẫu.'); return; }
    const def = { name, desc, pat }; LTYPES[name] = def; A.LS.ltd[name] = def; A.lsSave(); redraw();
    log('MKLTYPE: đã tạo kiểu nét ' + name + ' = ' + pat.join(', ') + ' (dương = nét, âm = khoảng hở, 0 = chấm).');
    const k = await A.getKw('Tải file .lin? [Có / Không]', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Không' });
    if(k.kw === 'Y') save(new Blob([linText(name, desc, pat)], { type: 'text/plain' }), name.toLowerCase() + '.lin', 'text/plain');
  });

  /* =====================================================================
     4) ẢNH: IMAGEFRAME · IMAGEQUALITY
     ===================================================================== */
  cmd(['IMAGEFRAME'], 'Khung ảnh nền: 0 ẩn, 1 hiện và in, 2 hiện nhưng không in', async () => {
    const r = await A.getNum('IMAGEFRAME (0 = ẩn, 1 = hiện & in, 2 = hiện, không in)', { def: IMAGEFRAME }); if(r.num == null) return; const v = Math.round(r.num); if(v < 0 || v > 2){ log('Nhập 0, 1 hoặc 2.'); return; }
    IMAGEFRAME = v; lsSet('dvd:imgframe', String(v)); try{ A.sysvar && A.sysvar.set && A.sysvar.set('IMAGEFRAME', v, true); }catch(_){} redraw(); log('IMAGEFRAME = ' + v + '.');
  });
  cmd(['IMAGEQUALITY'], 'Chất lượng hiển thị ảnh nền: Cao (mịn) / Nháp (nhanh)', async () => {
    const k = await A.getKw('Chất lượng ảnh [Cao / Nháp]', { kw: [{ k: 'H', t: 'Cao' }, { k: 'D', t: 'Nháp' }], def: IMAGEQUALITY ? 'Cao' : 'Nháp' }); if(!k.kw) return;
    IMAGEQUALITY = k.kw === 'H' ? 1 : 0; lsSet('dvd:imgq', String(IMAGEQUALITY)); redraw(); log('IMAGEQUALITY: ' + (IMAGEQUALITY ? 'cao' : 'nháp') + '.');
  });

  /* =====================================================================
     5) ĐÈN: SPOTLIGHT · DISTANTLIGHT · LIGHTLIST
     ===================================================================== */
  const U = () => (typeof unitToMM === 'function' && unitToMM()) || 1;
  const colKw = () => A.getKw('Màu ánh sáng [Vàng ấm / Trắng / Lạnh]', { kw: [{ k: 'V', t: 'Vàng ấm' }, { k: 'T', t: 'Trắng' }, { k: 'L', t: 'Lạnh' }], def: 'Trắng' }).then(k => k.kw === 'V' ? '#ffd9a0' : k.kw === 'L' ? '#cfe2ff' : '#ffffff');
  const refresh3D = () => { try{ if(A.view3D && A.view3D.rebuildLights) A.view3D.rebuildLights(); }catch(_){} };
  cmd(['SPOTLIGHT'], 'Đặt đèn rọi (vị trí, điểm rọi, góc chiếu) — hiện ở kiểu xem Thực tế', async () => {
    const p = await A.getPoint('Vị trí đèn'); if(!p.pt) return; const t = await A.getPoint('Điểm rọi tới', { base: p.pt }); if(!t.pt) return;
    const z = await A.getNum('Cao độ đèn (Z)', { def: MEM.lz || Math.round(2600 / U() * 1000) / 1000 }); const Z = z.num != null ? z.num : (MEM.lz || 2600 / U()); MEM.lz = Z;
    const tz = await A.getNum('Cao độ điểm rọi', { def: 0 }); const TZ = tz.num || 0;
    const ang = await A.getNum('Góc chiếu (độ)', { def: MEM.spang || 45 }); const AG = Math.max(5, Math.min(160, ang.num > 0 ? ang.num : (MEM.spang || 45))); MEM.spang = AG;
    const it = await A.getNum('Cường độ (1–50)', { def: MEM.li || 8 }); const I = it.num > 0 ? it.num : (MEM.li || 8); const col = await colKw();
    const e = { type: 'POINT', x: p.pt.x, y: p.pt.y, light: { kind: 'spot', z: Z, tz: TZ, dx: t.pt.x - p.pt.x, dy: t.pt.y - p.pt.y, ang: AG, int: I, col } }; A.newProps(e); A.commit({ add: [e] }, 'Đã đặt đèn rọi'); refresh3D(); log('Đã đặt đèn rọi, góc ' + AG + '°. Xem bằng RENDER (kiểu Thực tế).');
  });
  cmd(['DISTANTLIGHT'], 'Đặt đèn song song (như mặt trời) theo hướng chiếu', async () => {
    const a = await A.getPoint('Hướng chiếu: từ điểm'); if(!a.pt) return; const b = await A.getPoint('tới điểm', { base: a.pt }); if(!b.pt) return;
    const el = await A.getNum('Góc chiếu xuống so với mặt bằng (độ)', { def: MEM.dlel || 45 }); const EL = Math.max(1, Math.min(90, el.num > 0 ? el.num : (MEM.dlel || 45))); MEM.dlel = EL;
    const it = await A.getNum('Cường độ (1–50)', { def: 5 }); const I = it.num > 0 ? it.num : 5; const col = await colKw();
    const h = Math.hypot(b.pt.x - a.pt.x, b.pt.y - a.pt.y) || 1;
    const e = { type: 'POINT', x: a.pt.x, y: a.pt.y, light: { kind: 'dist', z: h * Math.tan(EL * Math.PI / 180), tz: 0, dx: b.pt.x - a.pt.x, dy: b.pt.y - a.pt.y, int: I, col } }; A.newProps(e); A.commit({ add: [e] }, 'Đã đặt đèn song song'); refresh3D(); log('Đã đặt đèn song song, chiếu xuống ' + EL + '°.');
  });
  plain(['LIGHTLIST', 'LIGHTLISTCLOSE'], 'Danh sách đèn trong bản vẽ: bật / tắt, cường độ, màu, xoá', () => {
    if(A.busy()) A.cancel(true); const Ls = ME().filter(e => e.type === 'POINT' && e.light);
    if(!Ls.length){ log('Bản vẽ chưa có đèn (LIGHT, SPOTLIGHT, DISTANTLIGHT).'); return; }
    const kind = e => e.light.kind === 'spot' ? 'Đèn rọi' : e.light.kind === 'dist' ? 'Đèn song song' : 'Đèn điểm';
    const del = new Set();
    A.dialog({ title: 'Đèn trong bản vẽ (' + Ls.length + ')', wide: true, html: '<div class="lm-tbl"><table><thead><tr><th>#</th><th>Loại</th><th>Vị trí</th><th>Z</th><th>Cường độ</th><th>Màu</th><th>Bật</th><th></th></tr></thead><tbody>' +
      Ls.map((e, i) => '<tr data-i="' + i + '"><td>' + (i + 1) + '</td><td>' + kind(e) + '</td><td translate="no">' + (+e.x.toFixed(1)) + ', ' + (+e.y.toFixed(1)) + '</td><td><input data-f="z" value="' + (+(e.light.z || 0).toFixed(3)) + '" style="width:70px"></td><td><input data-f="int" value="' + (e.light.int || 5) + '" style="width:50px"></td><td><input type="color" data-f="col" value="' + (e.light.col || '#ffd9a0') + '"></td><td><input type="checkbox" data-f="on"' + (e.light.off ? '' : ' checked') + '></td><td><button class="tg" data-a="zoom" title="Phóng tới">⌖</button><button class="tg" data-a="del" title="Xoá đèn">✕</button></td></tr>').join('') + '</tbody></table></div>',
      onOpen: root => root.addEventListener('click', ev => { const b = ev.target.closest('[data-a]'); if(!b) return; const tr = b.closest('tr'); const i = +tr.dataset.i, e = Ls[i];
        if(b.dataset.a === 'del'){ del.add(i); tr.style.opacity = .35; tr.querySelectorAll('input').forEach(x => x.disabled = true); }
        if(b.dataset.a === 'zoom'){ try{ view.offsetX = W() / 2 - e.x * view.scale; view.offsetY = H() / 2 + e.y * view.scale; redraw(); }catch(_){} } }),
      ok: root => { const rep = [], dl = [];
        root.querySelectorAll('tr[data-i]').forEach(tr => { const i = +tr.dataset.i, e = Ls[i]; if(del.has(i)){ dl.push(e); return; } const w = copy(e); const L = w.light; const g = f => tr.querySelector('[data-f="' + f + '"]');
          const z = parseFloat(String(g('z').value).replace(',', '.')), it = parseFloat(String(g('int').value).replace(',', '.')); if(isFinite(z)) L.z = z; if(it > 0) L.int = it; L.col = g('col').value; if(g('on').checked) delete L.off; else L.off = 1;
          if(JSON.stringify(L) !== JSON.stringify(e.light)) rep.push([e, w]); });
        if(rep.length || dl.length){ A.commit({ rep, del: dl }, 'Sửa đèn'); refresh3D(); log('LIGHTLIST: sửa ' + rep.length + ', xoá ' + dl.length + ' đèn.'); } } });
  });

  /* =====================================================================
     6) 3D: SEPARATE — tách khối gồm nhiều phần rời
     ===================================================================== */
  function components(m){
    const w = A.weld(m.p, m.i); const nv = w.p.length / 3, par = new Int32Array(nv).map((_, i) => i);
    const f = x => { while(par[x] !== x){ par[x] = par[par[x]]; x = par[x]; } return x; }, u = (a, b) => { a = f(a); b = f(b); if(a !== b) par[a] = b; };
    for(let k = 0; k < w.i.length; k += 3){ u(w.i[k], w.i[k + 1]); u(w.i[k], w.i[k + 2]); }
    const G = new Map(); for(let k = 0; k < w.i.length; k += 3){ const r = f(w.i[k]); let g = G.get(r); if(!g){ g = []; G.set(r, g); } g.push(w.i[k], w.i[k + 1], w.i[k + 2]); }
    return [...G.values()].map(I => { const map = new Map(), P = [], J = []; for(const v of I){ let n = map.get(v); if(n === undefined){ n = P.length / 3; map.set(v, n); P.push(w.p[v * 3], w.p[v * 3 + 1], w.p[v * 3 + 2]); } J.push(n); } return { p: P, i: J }; });
  }
  A.meshParts = components;
  cmd(['SEPARATE', 'SOLIDSEPARATE'], 'Tách khối 3D gồm nhiều phần rời nhau thành các khối riêng (SOLIDEDIT › Body › Separate)', async () => {
    const s = await A.getSel('Chọn khối 3D cần tách', { filter: e => e.type === 'SOLID3D' }); const src = (s.sel || []).filter(e => !A.isLocked(e)); if(!src.length) return;
    const add = [], del = [];
    for(const e of src){ const m = e.k === 'mesh' ? { p: e.v, i: e.f } : (A.meshOf ? A.meshOf(e) : null); if(!m) continue; const parts = components(m); if(parts.length < 2) continue; for(const p of parts){ const n = A.meshEnt(p.p, p.i, e); if(n) add.push(n); } del.push(e); }
    if(!del.length){ log('SEPARATE: khối đã chọn chỉ có một phần liền.'); return; }
    A.commit({ add, del }, 'Đã tách khối'); log('SEPARATE: ' + del.length + ' khối → ' + add.length + ' khối riêng.');
  });

  /* =====================================================================
     7) THIẾT LẬP: AUTOCOMPLETE · DRAGMODE
     ===================================================================== */
  window.DVD_AUTOCOMPLETE = lsGet('dvd:autocomp', '1') !== '0';
  cmd(['AUTOCOMPLETE'], 'Gợi ý lệnh khi gõ ở dòng lệnh: bật / tắt', async () => {
    const k = await kwOnOff('Gợi ý lệnh khi gõ', window.DVD_AUTOCOMPLETE); const on = k.kw ? k.kw === 'ON' : !window.DVD_AUTOCOMPLETE;
    window.DVD_AUTOCOMPLETE = on; lsSet('dvd:autocomp', on ? '1' : '0'); log('AUTOCOMPLETE: ' + (on ? 'bật' : 'tắt') + '.');
  });
  A.dragMode = lsGet('dvd:dragmode', 'A');
  { const _gp = A.getPoint; A.getPoint = function(prompt, o){ if(A.dragMode === 'OFF' && o && o.preview){ o = Object.assign({}, o); delete o.preview; } return _gp.call(this, prompt, o); }; }
  cmd(['DRAGMODE'], 'Hiện hình xem trước khi kéo đối tượng (Bật / Tắt / Tự động)', async () => {
    const k = await A.getKw('DRAGMODE [Bật / Tắt / Tự động]', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }, { k: 'A', t: 'Tự động' }], def: A.dragMode === 'OFF' ? 'Tự động' : 'Tắt' }); if(!k.kw) return;
    A.dragMode = k.kw; lsSet('dvd:dragmode', k.kw); log('DRAGMODE = ' + (k.kw === 'A' ? 'Tự động' : k.kw === 'ON' ? 'Bật' : 'Tắt') + '.');
  });

  /* =====================================================================
     8) TÊN GỌI KHÁC
     ===================================================================== */
  alias(['DVIEW', 'DV'], '3DORBIT', 'Xem phối cảnh động (mở khung xem 3D)');
  alias(['SOLPROF'], 'FLATSHOT', 'Nét bao khối 3D ra 2D (FLATSHOT)');
  alias(['SOLVIEW', 'SOLDRAW'], 'VIEWBASE', 'Tạo hình chiếu khối 3D trên bản vẽ (VIEWBASE)');
  alias(['PASTESPEC'], 'PASTECLIP', 'Dán đặc biệt (dán từ bộ nhớ tạm)');
  alias(['COPYLINK'], 'COPYCLIP', 'Sao chép vào bộ nhớ tạm');
  alias(['TPNAVIGATE'], 'TOOLPALETTES', 'Mở bảng công cụ');
  alias(['MATBROWSEROPEN', 'MATBROWSERCLOSE'], 'MATERIALS', 'Thư viện vật liệu');
  alias(['SHEETSET', 'SSM', 'SHEETSETHIDE'], 'PUBLISH', 'Tập bản vẽ: in hàng loạt các layout');
  alias(['3DALIGN'], 'ALIGN', 'Căn chỉnh đối tượng theo cặp điểm');
})();
