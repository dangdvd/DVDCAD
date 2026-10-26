/* DVDCAD v4k (viết lại ở v5i) — thứ tự vẽ, vùng che, chú thích theo tỉ lệ, lưu DWG
   · DRAWORDER (DR): F lên trên cùng / B xuống dưới cùng / A trên đối tượng / U dưới đối tượng · TEXTTOFRONT · HATCHTOBACK
   · WIPEOUT (WO): bấm các điểm, D chọn đa tuyến kín có sẵn, F khung viền (bật / tắt / hiện nhưng không in)
   · CANNOSCALE (ô ▲ 1:N ở thanh trạng thái) · ANNOTATIVE: chữ / kích thước luôn cao đúng số mm trên giấy
   · SAVEDWG (DWGOUT): mặc định ghi DWG 2018 gốc (dvd-dwg.js, không cần ODA; v5t có thêm 2013 / 2010 / 2004 / 2000); DWG 2007 qua
     ODA File Converter trên máy (bản Windows) hoặc máy chủ chuyển đổi (server-dwg.js) · DWGSERVER */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x3 || !window.DVDCmd) return; A._x3 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MEM = A.MEM || (A.MEM = {});
  const docName = () => (typeof currentName === 'string' && currentName) || '';
  const isDimPart = e => !!(e && (e.dimd || e.dimx || (e.blk && String(e.blk).startsWith('*DIM'))));
  const isText = e => e && e.type === 'TEXT' && !isDimPart(e);
  const isHatch = e => e && (e.type === 'HATCH' || (e.type === 'SOLID' && !isDimPart(e)));

  /* =====================================================================
     1) THỨ TỰ VẼ — e.dord: số tầng, tầng lớn vẽ sau (nằm trên). Bộ vẽ và DXF đã đọc e.dord.
     ===================================================================== */
  const ordOf = e => e.dord | 0;
  // nhóm chọn chiếm các tầng lo … lo+span-1 (giữ thứ tự tương đối trong nhóm); bump: dồn các đối tượng khác lên / xuống để chừa chỗ
  function setOrder(sel, lo, bump, msg){
    const S = new Set(sel), levels = [...new Set(sel.map(ordOf))].sort((a, b) => a - b), rank = new Map(levels.map((d, i) => [d, i])), span = levels.length, hi = lo + span - 1;
    const put = (e, d) => { const w = copy(e); if(d) w.dord = d; else delete w.dord; rep.push([e, w]); };
    const rep = [];
    for(const e of sel) put(e, lo + rank.get(ordOf(e)));
    if(bump) for(const e of modelEntities){ if(S.has(e)) continue; const d = ordOf(e);
      if(bump === 'up' && d >= lo) put(e, d + span);
      else if(bump === 'down' && d <= hi) put(e, d - span); }
    if(rep.length) A.commit({ rep }, msg);
  }
  const maxOrd = () => { let m = 0; for(const e of modelEntities) m = Math.max(m, ordOf(e)); return m; };
  const minOrd = () => { let m = 0; for(const e of modelEntities) m = Math.min(m, ordOf(e)); return m; };
  const span = sel => new Set(sel.map(ordOf)).size;
  cmd(['DRAWORDER', 'DR'], 'Thứ tự vẽ: đưa đối tượng lên trên / xuống dưới', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = A.filterSel(s.sel || []); if(!sel.length) return;
    const k = await A.getKw('Nhập tuỳ chọn thứ tự', { kw: [{ k: 'A', t: 'Trên đối tượng' }, { k: 'U', t: 'Dưới đối tượng' }, { k: 'F', t: 'Trên cùng' }, { k: 'B', t: 'Dưới cùng' }], def: MEM.dro || 'B' });
    const kw = k.kw || (k.none ? (MEM.dro || 'B') : null); if(!kw) return; MEM.dro = kw;
    if(kw === 'F') return setOrder(sel, maxOrd() + 1, null, 'Đã đưa ' + sel.length + ' đối tượng lên trên cùng');
    if(kw === 'B') return setOrder(sel, minOrd() - span(sel), null, 'Đã đưa ' + sel.length + ' đối tượng xuống dưới cùng');
    const r = await A.getSel('Chọn đối tượng tham chiếu', { pre: false }); const ref = (r.sel || []).filter(e => !sel.includes(e)); if(!ref.length) return;
    const ords = ref.map(ordOf);
    if(kw === 'A') setOrder(sel, Math.max(...ords) + 1, 'up', 'Đã đưa ' + sel.length + ' đối tượng lên trên đối tượng tham chiếu');
    else setOrder(sel, Math.min(...ords) - span(sel), 'down', 'Đã đưa ' + sel.length + ' đối tượng xuống dưới đối tượng tham chiếu');
  });
  cmd(['TEXTTOFRONT'], 'Đưa chữ / kích thước lên trên mọi đối tượng khác', async () => {
    const k = await A.getKw('Đưa lên trên', { kw: [{ k: 'T', t: 'Chữ' }, { k: 'D', t: 'Kích thước' }, { k: 'B', t: 'Cả hai' }], def: 'B' });
    const kw = k.kw || (k.none ? 'B' : null); if(!kw) return;
    const sel = modelEntities.filter(e => !A.isLocked(e) && ((kw !== 'D' && isText(e)) || (kw !== 'T' && isDimPart(e))));
    if(!sel.length){ log('Không có đối tượng nào.'); return; }
    setOrder(sel, maxOrd() + 1, null, 'Đã đưa ' + sel.length + ' đối tượng lên trên');
  });
  cmd(['HATCHTOBACK'], 'Đưa mọi hatch xuống dưới cùng', async () => {
    const sel = modelEntities.filter(e => isHatch(e) && !A.isLocked(e));
    if(!sel.length){ log('Không có hatch nào.'); return; }
    setOrder(sel, minOrd() - span(sel), null, 'Đã đưa ' + sel.length + ' hatch xuống dưới cùng');
  });

  /* =====================================================================
     2) VÙNG CHE — đa tuyến kín có wipe:1 (bộ vẽ tô màu nền, DXF ghi thành WIPEOUT)
     ===================================================================== */
  const area2 = P => { let s = 0; for(let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j].x + P[i].x) * (P[j].y - P[i].y); return s / 2; };
  function makeWipe(P){ const w = { type: 'POLYLINE', closed: true, vertices: P.map(p => ({ x: p.x, y: p.y })), wipe: 1, dord: maxOrd() + 1 }; A.newProps(w); delete w.lt; delete w.lw; return w; }
  cmd(['WIPEOUT', 'WO'], 'Vùng che: bấm các điểm, P = chọn đa tuyến kín, F = khung viền', async () => {
    const P = [];
    for(;;){
      const kw = P.length ? (P.length > 1 ? [{ k: 'U', t: 'Bỏ điểm' }] : []) : [{ k: 'F', t: 'Khung' }, { k: 'P', t: 'Đa tuyến' }];
      const r = await A.getPoint(P.length ? (P.length < 3 ? 'Chỉ định điểm tiếp theo' : 'Chỉ định điểm tiếp theo (Enter = xong)') : 'Chỉ định điểm đầu', {
        kw, def: P.length ? undefined : 'Đa tuyến', base: P[P.length - 1],
        preview: P.length ? (g, p) => { const Q = P.concat([p]); g.fill([Q], 'rgba(90,169,255,.18)'); g.poly(Q, true); } : null });
      if(r.kw === 'U'){ P.pop(); continue; }
      if(r.kw === 'F'){
        const v = await A.getKw('Khung vùng che', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }, { k: 'D', t: 'Hiện nhưng không in' }], def: 'ON' });
        const m = v.kw === 'OFF' ? 0 : v.kw === 'D' ? 2 : (v.kw === 'ON' || v.none) ? 1 : null;
        if(m != null && A.sysvar){ A.sysvar.set('WIPEOUTFRAME', m); log('WIPEOUTFRAME = ' + m); } return;
      }
      if(r.kw === 'P' || (!P.length && r.none)){
        const s = await A.getEnt('Chọn đa tuyến kín', { filter: e => e.type === 'POLYLINE' && (e.closed || (e.vertices && e.vertices.length > 2)) });
        if(!s.ent) return; const pl = s.ent, V = pl.vertices;
        if(!V || V.length < 3){ log('Đa tuyến cần ít nhất 3 đỉnh.'); return; }
        const d = await A.getKw('Xoá đa tuyến gốc?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'N' });
        const add = [makeWipe(V)]; add[0].layer = pl.layer;
        A.commit({ add, del: d.kw === 'Y' ? [pl] : [] }, 'Đã tạo vùng che'); return;
      }
      if(r.pt){ P.push(r.pt); continue; }
      break;
    }
    if(P.length < 3){ log('Vùng che cần ít nhất 3 điểm.'); return; }
    if(Math.abs(area2(P)) < 1e-12){ log('Các điểm thẳng hàng — không tạo được vùng che.'); return; }
    A.commit({ add: [makeWipe(P)] }, 'Đã tạo vùng che');
  });

  /* =====================================================================
     3) CHÚ THÍCH THEO TỈ LỆ — A.ANNO = { N, auto }
        chữ: e.anno = cao trên giấy (mm); kích thước: dimd.anno = cao chữ trên giấy.
        Cao trong Model = cao trên giấy × N. Khung nhìn layout dùng thẳng e.anno (index.html).
     ===================================================================== */
  const ANNO = A.ANNO = { N: 100, auto: false };
  const annoKey = () => 'dvd:anno::' + docName();
  function annoLoad(){ let o = null; try{ o = JSON.parse(localStorage.getItem(annoKey()) || localStorage.getItem('dvd:anno') || 'null'); }catch(_){}
    ANNO.N = o && o.N > 0 ? +o.N : 100; ANNO.auto = !!(o && o.auto); syncAnnoBtn(); }
  function annoSave(){ try{ const s = JSON.stringify({ N: ANNO.N, auto: ANNO.auto }); localStorage.setItem(annoKey(), s); localStorage.setItem('dvd:anno', s); }catch(_){} syncAnnoBtn(); }
  const dimText = e => (e && e.dimd && !e.dimx) ? e : null;
  // đổi tỉ lệ: mọi chữ / kích thước chú thích đổi cỡ trong Model để giữ cao trên giấy
  function rescaleAll(){
    const rep = [];
    for(const e of modelEntities){
      if(isText(e) && e.anno > 0){ const h = e.anno * ANNO.N; if(Math.abs((e.h || 0) - h) > 1e-9 * h){ const w = copy(e); const k = h / (e.h || h); w.h = h; if(w.ew) w.ew *= k; rep.push([e, w]); } }
      else if(dimText(e) && e.dimd.anno > 0 && e.dimd.s){ const t = e.dimd.anno * ANNO.N; if(Math.abs((e.dimd.s.txt || 0) - t) > 1e-9 * t){ const w = copy(e); w.dimd.s.txt = t; rep.push([e, w]); } }
    }
    if(rep.length) A.commit({ rep }, 'Tỉ lệ chú thích 1:' + ANNO.N + ' — đã đổi cỡ ' + rep.length + ' chú thích');
    return rep.length;
  }
  function setScale(N){ N = +N; if(!(N > 0)) return; ANNO.N = N; annoSave(); const n = A.hasDoc() ? rescaleAll() : 0; log('Tỉ lệ chú thích hiện hành: 1:' + N + (n ? ' (' + n + ' chú thích đổi cỡ)' : '')); }
  A.setAnnoScale = setScale;
  cmd(['CANNOSCALE'], 'Tỉ lệ chú thích hiện hành 1:N (A = đối tượng mới tự là chú thích)', async () => {
    const r = await A.getNum('Tỉ lệ chú thích 1:', { def: ANNO.N, kw: [{ k: 'A', t: ANNO.auto ? 'Tắt tự gán chú thích' : 'Bật tự gán chú thích' }] });
    if(r.kw === 'A'){ ANNO.auto = !ANNO.auto; annoSave(); log('Chữ / kích thước mới ' + (ANNO.auto ? 'tự là chú thích theo tỉ lệ.' : 'là đối tượng thường.')); return; }
    const N = r.num != null ? r.num : (r.none ? ANNO.N : null); if(N == null) return;
    if(!(N > 0)){ log('Tỉ lệ phải lớn hơn 0.'); return; } setScale(N);
  });
  cmd(['ANNOTATIVE'], 'Bật / tắt chú thích theo tỉ lệ cho chữ, kích thước đã chọn', async () => {
    const s = await A.getSel('Chọn chữ / kích thước', { filter: e => isText(e) || isDimPart(e) }); const sel = A.filterSel(s.sel || []); if(!sel.length) return;
    const T = sel.filter(isText), D = [...new Set(sel.filter(isDimPart).map(e => e.grp))].map(g => modelEntities.find(x => x.grp === g && dimText(x))).filter(Boolean);
    const on = [...T, ...D].some(e => !(e.dimd ? e.dimd.anno > 0 : e.anno > 0));
    const rep = [];
    for(const e of T){ const w = copy(e); if(on) w.anno = (e.h || 2.5) / ANNO.N; else delete w.anno; rep.push([e, w]); }
    for(const e of D){ const w = copy(e); if(on) w.dimd.anno = ((e.dimd.s && e.dimd.s.txt) || 2.5) / ANNO.N; else delete w.dimd.anno; rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, (on ? 'Đã gán chú thích theo tỉ lệ 1:' + ANNO.N + ' cho ' : 'Đã bỏ chú thích theo tỉ lệ của ') + rep.length + ' đối tượng');
  });
  // đối tượng mới: tự gán chú thích khi bật (CANNOSCALE A)
  { const _c = A.commit;
    A.commit = function(ch, msg){
      try{ if(ANNO.auto && ch && ch.add) for(const e of ch.add){ if(!e) continue;
        if(isText(e) && !(e.anno > 0)) e.anno = (e.h || 2.5) / ANNO.N;
        else if(dimText(e) && e.dimd && !(e.dimd.anno > 0) && !(ch.rep && ch.rep.length)) e.dimd.anno = ((e.dimd.s && e.dimd.s.txt) || 2.5) / ANNO.N; } }catch(err){ console.warn('x3 anno', err); }
      return _c.apply(this, arguments);
    }; }
  // ô ▲ 1:N trên thanh trạng thái (như Annotation Scale của AutoCAD)
  const SCALES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  let annoBtn = null;
  function syncAnnoBtn(){ if(annoBtn){ const nm = A.scaleName ? A.scaleName(ANNO.N) : '1:' + (+ANNO.N.toFixed(4)); annoBtn.innerHTML = '▲ ' + nm; annoBtn.classList.toggle('on', ANNO.auto); } try{ if(A.annoVis) A.annoVis(); }catch(_){} }
  A.syncAnnoBtn = () => syncAnnoBtn();
  function buildAnnoBtn(){
    const sb = document.querySelector('#acadStatus .ac-sb'); if(!sb || annoBtn) return;
    annoBtn = document.createElement('button'); annoBtn.dataset.x = 'anno'; annoBtn.title = 'Tỉ lệ chú thích (CANNOSCALE) — bấm để chọn';
    const lwt = sb.querySelector('[data-x="lwt"]'); sb.insertBefore(annoBtn, lwt ? lwt.previousSibling : null);
    annoBtn.addEventListener('click', e => { e.stopPropagation(); const r = annoBtn.getBoundingClientRect();
      const SL = A.scaleList ? A.scaleList().map(s => [s.d / s.p, s.name]) : SCALES.map(N => [N, '1:' + N]);   // danh sách tỉ lệ (SCALELISTEDIT)
      A.menu(r.left - 60, Math.max(4, r.top - 24 - SL.length * 26), [{ hd: 'TỈ LỆ CHÚ THÍCH' }].concat(SL.map(([N, t]) => ({ t: t + (Math.abs(N - ANNO.N) < 1e-9 ? '  ✓' : ''), fn: () => setScale(N) })),
        [{ sep: 1 }, { t: 'Tuỳ chỉnh…', fn: () => DVDCmd.run('CANNOSCALE') }, { t: (ANNO.auto ? '✓ ' : '') + 'Tự gán chú thích cho đối tượng mới', fn: () => { ANNO.auto = !ANNO.auto; annoSave(); } }])); }, true);
    syncAnnoBtn();
  }
  setTimeout(buildAnnoBtn, 0);
  A.onLoad = (prev => function(){ if(prev) prev.apply(this, arguments); annoLoad(); })(A.onLoad);
  annoLoad();

  /* =====================================================================
     4) LƯU DWG — mặc định DWG 2000 gốc (dvd-dwg.js); bản mới hơn: DXF 2018 → DWG bằng ODA File Converter / máy chủ
     ===================================================================== */
  // bộ ghi gốc của DVDCAD (v5t: 2018 / 2013 / 2010 / 2004 / 2000); khoá cũ 'ACAD2000N' = DWG 2000 gốc
  const NAT = { N2018: 'R2018', N2013: 'R2013', N2010: 'R2010', N2004: 'R2004', ACAD2000N: 'R2000' };
  const DEF = 'N2018';
  const DWG_VERS = ['N2018', 'N2013', 'N2010', 'N2004', 'ACAD2000N', 'ACAD2007', 'ACAD2018', 'ACAD2013', 'ACAD2010', 'ACAD2004', 'ACAD2000'];
  const VYR = v => NAT[v] ? NAT[v].slice(1) : v.replace('ACAD', '');
  const VLAB = v => NAT[v] ? 'DWG ' + VYR(v) + ' — bộ ghi sẵn có (không cần ODA)' : 'DWG ' + VYR(v) + ' — chuyển qua ODA File Converter';
  const cfg = () => { try{ return Object.assign({ url: '', ver: DEF }, JSON.parse(localStorage.getItem('dvd:dwgsrv') || '{}')); }catch(_){ return { url: '', ver: DEF }; } };
  const cfgSave = o => { try{ localStorage.setItem('dvd:dwgsrv', JSON.stringify(o)); }catch(_){} };
  const DK = () => window.dvdDesktop || null;
  const native = ver => { if(!A.dwgNative) throw new Error('Thiếu bộ ghi DWG (dvd-dwg.js).'); return A.dwgNative(modelEntities, { version: NAT[ver] || 'R2018' }); };
  A.dwgSaveVersion = () => { const v = cfg().ver; return { key: v, year: VYR(v), native: !!NAT[v] }; };
  async function viaODA(ver){
    const c = cfg(), dk = DK(); const dxf = entitiesToDXF(modelEntities);
    if(dk && dk.dwgConvert){
      const r = await dk.dwgConvert(dxf, ver);
      if(r && r.data) return r.data;
      if(!c.url) throw new Error(r && r.error || 'Chưa có ODA File Converter trên máy.');
    }
    if(!c.url) throw new Error('Chưa có ODA File Converter / máy chủ chuyển DWG.');
    const res = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'application/dxf' }, body: dxf });
    if(!res.ok) throw new Error('Máy chủ trả lỗi ' + res.status + ': ' + (await res.text()).slice(0, 200));
    return new Uint8Array(await res.arrayBuffer());
  }
  // trả { data, ver }: ODA không chuyển được thì tự ghi bằng bộ ghi sẵn có (cùng năm nếu có, không thì DWG 2018)
  async function toDWG(){
    const ver = cfg().ver;
    if(!NAT[ver]){ try{ return { data: await viaODA(ver), ver }; }catch(err){
      const fb = Object.keys(NAT).find(k => VYR(k) === VYR(ver)) || DEF; log('ODA: ' + (err.message || err) + ' → ghi DWG ' + VYR(fb) + ' bằng bộ ghi sẵn có.'); return { data: native(fb), ver: fb }; } }
    return { data: native(ver), ver };
  }
  A.dwgBytes = async () => (await toDWG()).data;
  async function saveDWG(){
    if(!A.hasDoc() || !modelEntities.length){ say('Chưa có bản vẽ.'); return; }
    log('Đang ghi DWG…'); say('Đang ghi DWG…');
    let r; try{ r = await toDWG(); }catch(err){ log('Không lưu được DWG: ' + (err.message || err)); say('Không lưu được DWG: ' + (err.message || err)); return; }
    const data = r.data;
    if(!data || data.length < 32 || String.fromCharCode(data[0], data[1]) !== 'AC'){ say('Kết quả chuyển đổi không phải file DWG.'); return; }
    const name = docName().replace(/\.(dwg|dxf)$/i, '') + (NAT[r.ver] ? '_DVDCAD' : '') + '.dwg', lab = 'DWG ' + VYR(r.ver);
    if(typeof window.showSaveFilePicker === 'function'){
      try{ const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Bản vẽ AutoCAD (*.dwg)', accept: { 'application/acad': ['.dwg'] } }] });
        const w = await h.createWritable(); await w.write(data); await w.close(); log('Đã lưu ' + h.name + ' (' + lab + ').'); say('Đã lưu ' + h.name); return; }
      catch(err){ if(err && err.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/acad' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    log('Đã tải xuống ' + name + ' (' + lab + ').');
  }
  plain(['SAVEDWG', 'DWGOUT'], 'Lưu ra file DWG: DWG 2018 / 2013 / 2010 / 2004 / 2000 bằng bộ ghi sẵn có (không cần ODA); DWG 2007 qua ODA File Converter', saveDWG);
  plain(['DWGSERVER'], 'Cài đặt lưu DWG: phiên bản DWG (2018 → 2000 ghi sẵn có) hoặc qua ODA File Converter / máy chủ chuyển đổi', async () => {
    const c = cfg(), dk = DK(), K = A.acw; let oda = null; if(dk && dk.odaInfo){ try{ oda = await dk.odaInfo(); }catch(_){} }
    // bố cục hộp thoại kiểu AutoCAD: nhóm "Định dạng lưu", "Bộ chuyển đổi trên máy", "Máy chủ chuyển đổi"
    const html = '<div class="acw" style="width:500px">' +
      K.grp('Định dạng lưu', K.row('Phiên bản DWG:', K.sel('dwV', DWG_VERS.map(v => [v, VLAB(v)]), c.ver)) + '<div class="acw-note" style="white-space:normal">DWG 2018, 2013, 2010, 2004 và 2000 ghi thẳng bằng bộ ghi của DVDCAD, không cần cài thêm gì (DWG 2018 = định dạng của AutoCAD 2018 → 2027). DWG 2007 cần ODA File Converter (hoặc máy chủ) — nếu không có, DVDCAD tự ghi bằng bộ ghi sẵn có.</div>') +
      (dk ? K.grp('ODA File Converter trên máy', '<div class="acw-row">' + K.txt('dwO', oda && oda.path || '', { dis: 1, ph: 'Chưa tìm thấy — bấm Chọn…' }) + K.btn('dwOp', 'Chọn…') + '</div><div class="acw-note" style="white-space:normal">Bản Windows tự chuyển DXF → DWG bằng ODA File Converter (miễn phí, tải tại opendesign.com). Không cần mạng.</div>') : '') +
      K.grp('Máy chủ chuyển đổi (tuỳ chọn)', K.row('Địa chỉ:', K.txt('dwU', c.url, { ph: 'http://localhost:8787/convert' })) + '<div class="acw-row">' + K.btn('dwT', 'Thử kết nối') + '<span id="dwS" style="margin-left:6px"></span></div><div class="acw-note" style="white-space:normal">Máy chủ: chạy node server-dwg.js trên máy có ODA File Converter (xem hướng dẫn trong file).</div>') + '</div>';
    A.dialog({ title: 'Lưu DWG', cls: 'acw-free', help: 'DWGSERVER', html, okText: 'Lưu cài đặt',
      onOpen: root => {
        const op = root.querySelector('#dwOp'); if(op) op.onclick = async () => { const r = await dk.odaPick(); if(r && r.path) root.querySelector('#dwO').value = r.path; };
        root.querySelector('#dwT').onclick = async () => { const s = root.querySelector('#dwS'), u = root.querySelector('#dwU').value.trim(); if(!u){ s.textContent = 'Chưa nhập địa chỉ.'; return; }
          s.textContent = 'Đang thử…'; try{ const r = await fetch(u, { method: 'GET' }); s.textContent = r.ok ? '✓ Máy chủ đang chạy' : 'Máy chủ trả lỗi ' + r.status; }catch(err){ s.textContent = '✗ Không kết nối được'; } };
      },
      ok: root => { cfgSave({ url: root.querySelector('#dwU').value.trim(), ver: root.querySelector('#dwV').value }); say('Đã lưu cài đặt DWG.'); } });
  });
})();
