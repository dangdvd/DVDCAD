/* DVDCAD v4k — thứ tự hiển thị (DRAWORDER), vùng che (WIPEOUT), chú thích theo tỉ lệ (annotative), lưu DWG qua máy chủ chuyển đổi */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x3 || !window.DVDCmd) return; A._x3 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const docName = () => { try{ return currentName || ''; }catch(_){ return ''; } };

  /* ====================== DRAWORDER ====================== */
  const lvRange = () => { let mn = 0, mx = 0; for(const e of modelEntities){ const d = e.dord | 0; if(d < mn) mn = d; if(d > mx) mx = d; } return { mn, mx }; };
  function setOrder(list, val){ A.commit({ rep: list.map(e => { const w = copy(e); if(val) w.dord = val; else delete w.dord; return [e, w]; }) }, 'Đổi thứ tự hiển thị'); }
  cmd(['DRAWORDER', 'DR'], 'Thứ tự hiển thị: đưa lên trên / xuống dưới / trên-dưới một đối tượng', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const k = await A.getKw('Đưa', { kw: [{ k: 'F', t: 'Lên trên cùng' }, { k: 'B', t: 'Xuống dưới cùng' }, { k: 'A', t: 'Trên một đối tượng' }, { k: 'U', t: 'Dưới một đối tượng' }], def: 'Lên trên cùng' });
    const R = lvRange(); let v;
    if(k.kw === 'B') v = R.mn - 1; else if(k.kw === 'A' || k.kw === 'U'){ const r = await A.getEnt('Chọn đối tượng tham chiếu'); if(!r.ent) return; v = (r.ent.dord | 0) + (k.kw === 'A' ? 1 : -1); } else v = R.mx + 1;
    setOrder(sel, v); log('DRAWORDER: ' + sel.length + ' đối tượng → tầng ' + v + '.');
  });
  cmd(['TEXTTOFRONT'], 'Đưa chữ và kích thước lên trên cùng', async () => {
    const k = await A.getKw('Đưa lên trên', { kw: [{ k: 'T', t: 'Chữ' }, { k: 'D', t: 'Kích thước' }, { k: 'A', t: 'Cả hai' }], def: 'Cả hai' }); const o = k.kw || 'A';
    const list = modelEntities.filter(e => !e.xr && ((o !== 'D' && e.type === 'TEXT' && !e.dimv && !e.dimd) || (o !== 'T' && e.blk && String(e.blk).startsWith('*DIM'))));
    if(!list.length){ log('Không có chữ / kích thước.'); return; } setOrder(list, lvRange().mx + 1); log('TEXTTOFRONT: ' + list.length + ' đối tượng lên trên cùng.');
  });
  plain(['HATCHTOBACK'], 'Đưa toàn bộ hatch xuống dưới cùng', () => { const list = modelEntities.filter(e => e.type === 'HATCH' && !e.xr); if(!list.length){ log('Không có hatch.'); return; } setOrder(list, lvRange().mn - 1); log('HATCHTOBACK: ' + list.length + ' hatch.'); });

  /* ====================== WIPEOUT ====================== */
  cmd(['WIPEOUT', 'WO', 'CHE'], 'Vùng che: che các nét nằm dưới (nền khung tên, chỗ ghi chú)', async () => {
    const r = await A.getPoint('Điểm đầu tiên', { kw: [{ k: 'F', t: 'Khung (bật/tắt)' }, { k: 'D', t: 'Từ đa tuyến kín' }] });
    if(r.kw === 'F'){ const k = await A.getKw('Khung vùng che', { kw: [{ k: 'B', t: 'Bật' }, { k: 'T', t: 'Tắt' }, { k: 'H', t: 'Hiện nhưng không in' }], def: 'Bật' }); WIPEFRAME = k.kw === 'T' ? 0 : k.kw === 'H' ? 2 : 1; try{ localStorage.setItem('dvd:wipeframe', String(WIPEFRAME)); }catch(_){} draw(); A.paint(); return; }
    let pts = null, del = [];
    if(r.kw === 'D'){ const e = await A.getEnt('Chọn đa tuyến kín', { filter: x => x.type === 'POLYLINE' && (x.closed || (x.vertices.length > 3)) }); if(!e.ent) return; pts = e.ent.vertices.map(p => ({ x: p.x, y: p.y }));
      const k = await A.getKw('Xoá đa tuyến gốc?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Có' }); if(k.kw !== 'K') del = [e.ent]; }
    else { if(!r.pt) return; pts = [r.pt];
      for(;;){ const q = await A.getPoint('Điểm tiếp theo (Enter để đóng)', { base: pts[pts.length - 1], preview: (g, p) => g.poly(pts.concat([p]), true) }); if(!q.pt) break; pts.push(q.pt); } }
    if(!pts || pts.length < 3){ log('Cần ít nhất 3 điểm.'); return; }
    const e = { type: 'POLYLINE', closed: true, vertices: pts, wipe: 1, dord: lvRange().mx + 1 }; A.newProps(e); delete e.lt;
    A.commit({ add: [e], del }, 'Vùng che'); log('WIPEOUT: vùng che ở trên cùng. Đưa chữ lên trên nó bằng DRAWORDER hoặc TEXTTOFRONT.');
  });
  try{ const v = parseInt(localStorage.getItem('dvd:wipeframe'), 10); if(v === 0 || v === 1 || v === 2) WIPEFRAME = v; }catch(_){}
  plain(['WIPEOUTFRAME', 'TFRAMES'], 'Bật/tắt khung vùng che', () => { WIPEFRAME = WIPEFRAME ? 0 : 1; try{ localStorage.setItem('dvd:wipeframe', String(WIPEFRAME)); }catch(_){} draw(); log('Khung vùng che: ' + (WIPEFRAME ? 'hiện' : 'ẩn')); });
  // vùng che trong file: các đối tượng đứng sau vùng che trong file được vẽ trên nó (như AutoCAD)
  function orderFromFile(){ if(!modelEntities.some(e => e.wipe) || modelEntities.some(e => e.dord)) return; let lv = 0; for(const e of modelEntities){ if(e.wipe) lv++; if(lv) e.dord = lv; } try{ draw(); }catch(_){} }
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); orderFromFile(); loadAnno(); }; })(A.onLoad);

  /* ====================== chú thích theo tỉ lệ (ANNOTATIVE) ====================== */
  const ANNO = { N: 100, auto: false };
  const aKey = () => 'dvd:anno::' + docName();
  function loadAnno(){ Object.assign(ANNO, { N: 100, auto: false }); try{ Object.assign(ANNO, JSON.parse(localStorage.getItem(aKey()) || '{}')); }catch(_){} chip(); }
  const saveAnno = () => { try{ localStorage.setItem(aKey(), JSON.stringify(ANNO)); }catch(_){} chip(); };
  const U = () => { try{ return unitToMM() || 1; }catch(_){ return 1; } };
  const modelH = hp => hp * ANNO.N / U();      // cao chữ trên bản vẽ (đơn vị bản vẽ) từ cao trên giấy (mm)
  A.ANNO = ANNO;
  function rescale(){
    const rep = [];
    for(const e of modelEntities){
      if(e.type !== 'TEXT' || A.isLocked(e)) continue;
      if(e.dimd && e.dimd.anno > 0){ const w = copy(e); w.dimd.s = Object.assign({}, w.dimd.s || {}, { txt: modelH(e.dimd.anno) }); if(Math.abs((e.dimd.s && e.dimd.s.txt || 0) - w.dimd.s.txt) > 1e-9) rep.push([e, w]); continue; }
      if(e.anno > 0 && !e.dimd){ const h = modelH(e.anno); if(Math.abs(h - e.h) > 1e-9){ const w = copy(e); const k = h / (e.h || 1); w.h = h; if(w.ew) w.ew *= k; rep.push([e, w]); } }
    }
    if(rep.length) A.commit({ rep }, 'Tỉ lệ chú thích 1:' + ANNO.N); return rep.length;
  }
  const SCALES = [1, 2, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000];
  function setScale(N){ if(!(N > 0)) return; ANNO.N = N; saveAnno(); const n = rescale(); log('Tỉ lệ chú thích 1:' + N + (n ? ' — cập nhật ' + n + ' chữ / kích thước chú thích.' : '.')); }
  cmd(['CANNOSCALE', 'ANNOSCALE', 'TILECHUTHICH'], 'Tỉ lệ chú thích hiện hành (1:N) — chữ/kích thước chú thích tự đổi cỡ', async () => {
    const r = await A.getNum('Tỉ lệ 1:N, nhập N (đang 1:' + ANNO.N + ')', { def: ANNO.N, kw: [{ k: 'A', t: 'Đối tượng mới là chú thích: ' + (ANNO.auto ? 'Bật' : 'Tắt') }] });
    if(r.kw === 'A'){ ANNO.auto = !ANNO.auto; saveAnno(); log('Chữ / kích thước mới ' + (ANNO.auto ? 'sẽ là' : 'không là') + ' chú thích theo tỉ lệ.'); return; }
    if(r.num > 0) setScale(r.num);
  });
  cmd(['ANNOTATIVE', 'ANNO'], 'Bật/tắt "chú thích theo tỉ lệ" cho chữ và kích thước', async () => {
    const s = await A.getSel('Chọn chữ / kích thước'); const sel = (s.sel || []).filter(e => e.type === 'TEXT' && !A.isLocked(e)); if(!sel.length){ log('Không có chữ / kích thước.'); return; }
    const k = await A.getKw('Chú thích theo tỉ lệ', { kw: [{ k: 'B', t: 'Bật' }, { k: 'T', t: 'Tắt' }], def: 'Bật' }); const on = k.kw !== 'T';
    const rep = sel.map(e => { const w = copy(e); if(w.dimd){ if(on) w.dimd.anno = +(((w.dimd.s && w.dimd.s.txt) || e.h) * U() / ANNO.N).toPrecision(6); else delete w.dimd.anno; w.dimd = Object.assign({}, w.dimd); } else { if(on) w.anno = +(e.h * U() / ANNO.N).toPrecision(6); else delete w.anno; } return [e, w]; });
    A.commit({ rep }, 'Chú thích theo tỉ lệ');
    log('ANNOTATIVE: ' + (on ? 'bật' : 'tắt') + ' cho ' + sel.length + ' đối tượng (cao trên giấy = cao hiện tại ÷ ' + ANNO.N + ').');
  });
  // đối tượng mới tự là chú thích khi bật ANNO.auto
  const _commit = A.commit;
  A.commit = function(ch, msg){
    if(ANNO.auto && ch && ch.add) for(const e of ch.add){ if(!e || e.type !== 'TEXT' || e.att) continue; if(e.dimd){ if(!(e.dimd.anno > 0)) e.dimd.anno = +(((e.dimd.s && e.dimd.s.txt) || e.h) * U() / ANNO.N).toPrecision(6); } else if(!(e.anno > 0) && !e.dimv) e.anno = +(e.h * U() / ANNO.N).toPrecision(6); }
    return _commit.apply(this, arguments);
  };
  function chip(){ try{ const sb = document.querySelector('#acadSB .ac-sb') || document.querySelector('.ac-sb'); if(!sb) return; let c = document.getElementById('acAnno'); if(!c){ c = document.createElement('span'); c.id = 'acAnno'; c.className = 'model'; c.style.cursor = 'pointer'; c.title = 'Tỉ lệ chú thích (CANNOSCALE) — bấm để đổi';
        c.addEventListener('click', ev => { const r = c.getBoundingClientRect(); A.menu(r.left, r.top - 4 - SCALES.length * 26, SCALES.map(N => ({ t: '1:' + N + (N === ANNO.N ? '  ✓' : ''), fn: () => setScale(N) })).concat([{ t: (ANNO.auto ? '✓ ' : '') + 'Đối tượng mới là chú thích', fn: () => { ANNO.auto = !ANNO.auto; saveAnno(); } }])); });
        const m = document.getElementById('acModel'); if(m && m.parentNode === sb) sb.insertBefore(c, m.nextSibling); else sb.appendChild(c); }
      c.textContent = '▲ 1:' + ANNO.N; }catch(_){} }
  setTimeout(loadAnno, 0);

  /* ====================== LƯU DWG qua máy chủ chuyển đổi (ODA File Converter) ====================== */
  const SRV = () => { try{ return localStorage.getItem('dvd:dwgsrv') || ''; }catch(_){ return ''; } };
  function srvDialog(after){
    A.dialog({ title: 'Lưu DWG — máy chủ chuyển đổi', wide: true, html: '<p>Trình duyệt không tự ghi được DWG. DVDCAD gửi bản vẽ (DXF) tới <b>máy chủ chuyển đổi của bạn</b>, máy chủ dùng <b>ODA File Converter</b> (miễn phí) để tạo DWG chuẩn AutoCAD rồi trả về.</p>' +
      '<ol style="padding-left:18px;line-height:1.6"><li>Cài <b>ODA File Converter</b> (opendesign.com → Guest Files) và <b>Node.js</b> trên máy tính.</li><li>Tải file <code>server-dwg.js</code> trong repo DVDCAD, chạy:<br><code>set ODA="C:\\Program Files\\ODA\\ODAFileConverter 25.x\\ODAFileConverter.exe"</code><br><code>node server-dwg.js</code></li><li>Nhập địa chỉ máy chủ bên dưới (cùng máy: <code>http://localhost:8787/convert</code>).</li></ol>' +
      '<label>Địa chỉ máy chủ <input id="dwgSrv" style="width:100%" value="' + esc(SRV() || 'http://localhost:8787/convert') + '"></label><p id="dwgSt" style="opacity:.8"></p>',
      okText: 'Lưu & thử kết nối', ok: root => { const u = root.querySelector('#dwgSrv').value.trim(); try{ localStorage.setItem('dvd:dwgsrv', u); }catch(_){}
        fetch(u.replace(/\/convert\/?$/, '/'), { method: 'GET' }).then(r => r.text()).then(t => { say('Máy chủ DWG đã sẵn sàng.'); log('Máy chủ DWG: ' + t.slice(0, 80)); if(after) after(); }).catch(() => say('Chưa kết nối được máy chủ — kiểm tra đã chạy node server-dwg.js chưa.')); } });
  }
  async function saveDWG(){
    if(!modelEntities.length){ say('Chưa có bản vẽ.'); return; }
    const url = SRV(); if(!url){ srvDialog(() => saveDWG()); return; }
    let dxf; try{ dxf = entitiesToDXF(modelEntities); }catch(err){ say('Không tạo được DXF.'); return; }
    say('Đang chuyển sang DWG…');
    try{
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/dxf' }, body: dxf });
      if(!r.ok){ const t = await r.text().catch(() => ''); throw new Error(t || ('HTTP ' + r.status)); }
      const b = await r.blob(); const head = new Uint8Array(await b.slice(0, 6).arrayBuffer()); const sig = String.fromCharCode(...head);
      if(!/^AC10\d\d/.test(sig)) throw new Error('Máy chủ không trả về file DWG');
      const nm = String(docName() || 'banve').replace(/\.[^.]+$/, '') + '.dwg';
      await shareOrDownload(new Blob([b], { type: 'application/acad' }), nm, 'application/acad'); log('Đã lưu DWG (' + sig + '): ' + nm);
      A.lastDWG = { sig, size: b.size };
    }catch(err){ console.warn(err); say('Không lưu được DWG: ' + (err.message || err)); log('DWG: ' + (err.message || err) + ' — lệnh DWGSERVER để đặt lại máy chủ.'); }
  }
  A.saveDWG = saveDWG;
  plain(['SAVEDWG', 'DWGOUT', 'LUUDWG'], 'Lưu ra file DWG (qua máy chủ chuyển đổi ODA)', () => saveDWG());
  plain(['DWGSERVER', 'DWGSRV'], 'Cài đặt máy chủ chuyển DWG', () => srvDialog());
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
