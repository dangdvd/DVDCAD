/* DVDCAD v4y — bổ sung lệnh: QTEXT · FILL · ATTDISP · RECOVER · DIMREGEN · DIMJOGLINE · DIMINSPECT · GATTE · XEDGES
   VPMAX / VPMIN · MSPACE / PSPACE · PAGESETUP */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x12 || !window.DVDCmd) return; A._x12 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const redraw = () => { try{ bbDirty = true; draw(); A.paint(); }catch(_){} };
  const store = (k, v) => { try{ localStorage.setItem(k, v); }catch(_){} };

  /* ---------- 1) QTEXT · FILL · ATTDISP (hiển thị nhanh cho bản vẽ nặng) ---------- */
  cmd(['QTEXT'], 'Chữ hiện thành khung (vẽ nhanh với bản vẽ nhiều chữ): Bật / Tắt', async () => {
    const k = await A.getKw('QTEXT đang ' + (QTEXT ? 'BẬT' : 'TẮT'), { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: QTEXT ? 'Tắt' : 'Bật' });
    const on = k.kw ? k.kw === 'ON' : !QTEXT; QTEXT = on; store('dvd:qtext', on ? '1' : '0'); redraw(); log('QTEXT ' + (on ? 'BẬT — chữ hiện thành khung.' : 'TẮT.'));
  });
  cmd(['FILL', 'FILLMODE'], 'Tô hatch / mặt đặc / nét có độ rộng: Bật / Tắt (tắt = vẽ nhanh, chỉ hiện biên)', async () => {
    const k = await A.getKw('FILL đang ' + (FILLMODE ? 'BẬT' : 'TẮT'), { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: FILLMODE ? 'Tắt' : 'Bật' });
    const on = k.kw ? k.kw === 'ON' : !FILLMODE; FILLMODE = on; store('dvd:fill', on ? '1' : '0'); redraw(); log('FILL ' + (on ? 'BẬT.' : 'TẮT — hatch chỉ hiện đường biên.'));
  });
  cmd(['ATTDISP'], 'Hiển thị thuộc tính khối: Bình thường / Tắt', async () => {
    const k = await A.getKw('Thuộc tính khối đang ' + (ATTDISP === 'F' ? 'TẮT' : 'hiện'), { kw: [{ k: 'N', t: 'Bình thường' }, { k: 'F', t: 'Tắt' }], def: ATTDISP === 'F' ? 'Bình thường' : 'Tắt' });
    ATTDISP = k.kw === 'F' ? 'F' : k.kw === 'N' ? 'N' : (ATTDISP === 'F' ? 'N' : 'F'); store('dvd:attdisp', ATTDISP); redraw(); log('ATTDISP: ' + (ATTDISP === 'F' ? 'ẩn thuộc tính khối.' : 'hiện bình thường.'));
  });

  /* ---------- 2) RECOVER — mở file hỏng rồi kiểm tra / sửa (AUDIT) ---------- */
  plain(['RECOVER', 'DRAWINGRECOVERY'], 'Mở file DXF / DWG bị lỗi rồi tự kiểm tra và sửa (AUDIT)', () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.dxf,.dwg'; i.style.display = 'none'; document.body.appendChild(i);
    i.onchange = () => { const f = i.files && i.files[0]; i.remove(); if(!f) return; const isDwg = /\.dwg$/i.test(f.name); const rd = new FileReader();
      rd.onload = async () => { try{ if(isDwg) await loadDWG(rd.result, f.name); else loadDXF(rd.result, f.name); }catch(err){ console.error(err); say('Không mở được file.'); return; }
        setTimeout(() => { try{ DVDCmd.run('AUDIT'); setTimeout(() => A.input && A.input('C'), 120); }catch(_){} }, 300); };
      if(isDwg) rd.readAsArrayBuffer(f); else rd.readAsText(f); };
    i.click();
  });

  /* ---------- 3) Kích thước: DIMREGEN · DIMJOGLINE · DIMINSPECT ---------- */
  const isDim = e => e && e.grp && /^\*DIM/.test(String(e.blk || ''));
  const dimText = gid => A.groupMembers(gid).find(x => x.type === 'TEXT' && x.dimd && !x.dimx);
  function regen(gids, mut){ const del = [], add = []; for(const g of gids){ const t = dimText(g); if(!t) continue; const w = copy(t); w.dimd = deep(t.dimd); if(mut) mut(w.dimd); const ents = A.dimRegenFrom(w); if(!ents || !ents.length) continue; del.push(...A.groupMembers(g)); add.push(...ents); } return { del, add }; }
  A.dimRegenAll = () => { const gids = [...new Set(modelEntities.filter(e => e && e.dimd && e.grp).map(e => e.grp))]; const r = regen(gids); if(r.add.length) A.commit(r, 'DIMREGEN'); return gids.length; };
  cmd(['DIMREGEN'], 'Dựng lại toàn bộ kích thước theo định nghĩa (sau khi đổi kiểu, dời, phóng…)', async () => { const n = A.dimRegenAll(); log('DIMREGEN: dựng lại ' + n + ' kích thước.'); });
  cmd(['DIMJOGLINE', 'DJL'], 'Thêm / bỏ ký hiệu gấp khúc trên đường kích thước (kích thước không đúng tỉ lệ)', async () => {
    const r = await A.getEnt('Chọn kích thước (Enter = bỏ ký hiệu)', { filter: isDim, kw: [{ k: 'R', t: 'Bỏ ký hiệu' }] });
    if(r.kw === 'R'){ const s = await A.getEnt('Chọn kích thước cần bỏ ký hiệu', { filter: isDim }); if(!s.ent) return; const g = s.ent.grp; const res = regen([g], d => { delete d.jog; }); if(res.add.length) A.commit(res, 'Bỏ ký hiệu gấp khúc'); return; }
    if(!r.ent) return; const g = r.ent.grp; const t = dimText(g); if(!t){ log('Không đọc được kích thước này.'); return; }
    const b = A.dimBuild ? A.dimBuild(t.dimd) : null; if(!b || !b.a){ log('Chỉ thêm được cho kích thước thẳng / chéo.'); return; }
    const p = await A.getPoint('Vị trí ký hiệu gấp khúc (Enter = giữa)', { base: null }); let f = 0.5;
    if(p.pt){ const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, L2 = dx * dx + dy * dy; if(L2 > 0) f = ((p.pt.x - b.a.x) * dx + (p.pt.y - b.a.y) * dy) / L2; }
    const res = regen([g], d => { d.jog = Math.max(0.05, Math.min(0.95, f)); }); if(res.add.length) A.commit(res, 'Thêm ký hiệu gấp khúc'); log('DIMJOGLINE: đã thêm ký hiệu gấp khúc.');
  });
  cmd(['DIMINSPECT'], 'Kích thước kiểm tra: khung chữ có nhãn và tần suất kiểm tra (hoặc bỏ khung)', async () => {
    const s = await A.getSel('Chọn kích thước', { filter: isDim }); const gids = [...new Set((s.sel || []).filter(isDim).map(e => e.grp))]; if(!gids.length) return;
    const k = await A.getKw('Thao tác', { kw: [{ k: 'A', t: 'Thêm / sửa khung kiểm tra' }, { k: 'R', t: 'Bỏ khung' }], def: 'Thêm / sửa khung kiểm tra' });
    if(k.kw === 'R'){ const res = regen(gids, d => { delete d.insp; }); if(res.add.length) A.commit(res, 'Bỏ khung kiểm tra'); log('DIMINSPECT: bỏ khung ' + gids.length + ' kích thước.'); return; }
    const t0 = dimText(gids[0]); const cur = (t0 && t0.dimd.insp) || { lab: '', rate: '100%' };
    const lab = await A.getStr('Nhãn (để trống = không có)', { def: cur.lab || '' }); const rate = await A.getStr('Tần suất kiểm tra (VD 100%, để trống = không có)', { def: cur.rate || '100%' });
    const res = regen(gids, d => { d.insp = { lab: (lab.str || '').trim(), rate: (rate.str != null ? rate.str : cur.rate || '').trim() }; }); if(res.add.length) A.commit(res, 'DIMINSPECT'); log('DIMINSPECT: ' + gids.length + ' kích thước có khung kiểm tra.');
  });

  /* ---------- 4) GATTE — sửa đồng loạt một thuộc tính của mọi bản chèn cùng khối ---------- */
  cmd(['GATTE'], 'Đổi giá trị một thuộc tính cho mọi bản chèn của khối', async () => {
    const r = await A.getEnt('Chọn khối (hoặc chọn đúng chữ thuộc tính)', { filter: e => e.grp && e.bm && e.bm.name }); if(!r.ent) return; const name = r.ent.bm.name;
    const tags = [...new Set(modelEntities.filter(e => e && e.att && e.bm && e.bm.name === name).map(e => e.att))]; if(!tags.length){ log('Khối "' + name + '" không có thuộc tính.'); return; }
    let tag = r.ent.att || null;
    if(!tag){ if(tags.length === 1) tag = tags[0]; else { const k = await A.getKw('Thuộc tính', { kw: tags.slice(0, 12).map((t, i) => ({ k: String(i + 1), t })), def: tags[0] }); tag = k.kw ? tags[+k.kw - 1] : tags[0]; } }
    const v = await A.getStr('Giá trị mới cho "' + tag + '"'); if(v.str == null) return;
    const rep = modelEntities.filter(e => e && e.att === tag && e.bm && e.bm.name === name && !A.isLocked(e)).map(e => { const w = copy(e); w.text = v.str; return [e, w]; });
    if(rep.length) A.commit({ rep }, 'GATTE ' + tag); log('GATTE: đổi "' + tag + '" = "' + v.str + '" cho ' + rep.length + ' khối "' + name + '".');
  });

  /* ---------- 5) XEDGES — lấy cạnh khối 3D thành đường 2D (mặt bằng) ---------- */
  cmd(['XEDGES'], 'Lấy cạnh của khối 3D thành đường thẳng 2D (hình chiếu bằng)', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: e => e.type === 'SOLID3D' }); const sel = (s.sel || []).filter(e => e.type === 'SOLID3D'); if(!sel.length) return;
    const add = []; for(const e of sel){ const m = e.v ? e : (A.toMesh ? A.toMesh(e) : null); if(!m || !A.planEdges) continue; const L = A.planEdges(m);
      for(let k = 0; k < L.length; k += 4){ const ln = { type: 'LINE', x1: L[k], y1: L[k + 1], x2: L[k + 2], y2: L[k + 3] }; A.newProps(ln); for(const key of ['layer', 'col', 'bl']) if(e[key] != null) ln[key] = e[key]; add.push(ln); } }
    if(add.length) A.commit({ add }, 'XEDGES'); log('XEDGES: ' + add.length + ' đường cạnh từ ' + sel.length + ' khối.');
  });

  /* ---------- 6) Khung nhìn / không gian: VPMAX · VPMIN · MSPACE · PSPACE · PAGESETUP ---------- */
  let vpRet = null;
  const modelIdx = () => dwgLayouts.findIndex(L => L.isModel);
  const paperIdx = () => dwgLayouts.findIndex(L => !L.isModel && L.paper && (L.paper.viewports.length || L.paper.paperPrims.length));
  function vpMax(L, v){
    const mi = modelIdx(); if(mi < 0) return false; vpRet = { layout: currentLayout, view: { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot } };
    switchLayout(mi); const mw = v.vh * (v.w / v.h); zoomToWorldRect(v.dcx - mw / 2, v.dcy - v.vh / 2, v.dcx + mw / 2, v.dcy + v.vh / 2); draw();
    log('VPMAX: đang xem phóng to khung nhìn của "' + L.name + '" — sửa trực tiếp ở Model. VPMIN để quay lại layout.'); return true;
  }
  cmd(['VPMAX'], 'Phóng to khung nhìn của layout ra cả màn hình để xem / sửa (VPMIN để quay lại)', async () => {
    const L = dwgLayouts[currentLayout]; if(!L || L.isModel || !L.paper || !L.paper.viewports.length){ log('VPMAX: hãy mở một layout có khung nhìn trước.'); return; }
    let v = L.paper.viewports[0];
    if(L.paper.viewports.length > 1){ const p = await A.getPoint('Bấm vào trong khung nhìn cần phóng to'); if(!p.pt) return; v = L.paper.viewports.find(q => Math.abs(p.pt.x - q.vcx) <= q.w / 2 && Math.abs(p.pt.y - q.vcy) <= q.h / 2); if(!v){ log('Điểm không nằm trong khung nhìn nào.'); return; } }
    setTimeout(() => vpMax(L, v), 0);
  });
  plain(['VPMIN'], 'Quay lại layout sau VPMAX', () => { if(!vpRet){ say('Chưa phóng to khung nhìn nào (VPMAX).'); return; } const r = vpRet; vpRet = null; switchLayout(r.layout); Object.assign(view, r.view); draw(); A.log('VPMIN: đã về layout.'); });
  plain(['MSPACE', 'MS', 'MODEL'], 'Chuyển sang không gian mô hình (Model)', () => { const i = modelIdx(); if(i < 0 || !dwgLayouts.length){ say('Đang ở Model.'); return; } switchLayout(i); });
  plain(['PSPACE', 'PS'], 'Chuyển sang layout giấy (Paper space)', () => { const i = paperIdx(); if(i < 0){ say('Bản vẽ chưa có layout giấy — dùng LAYOUT để tạo.'); return; } switchLayout(i); });
  plain(['PAGESETUP'], 'Thiết lập trang in (khổ giấy, hướng, tỉ lệ, kiểu in) — mở hộp thoại In', () => DVDCmd.run('PLOT'));

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
