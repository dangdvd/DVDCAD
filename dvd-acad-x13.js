/* DVDCAD v4z — bổ sung lệnh: TJUST · TORIENT · TSCALE · TEXTFIT · TCIRCLE (công cụ chữ Express) · MULTIPLE · HISTORY / TEXTSCR
   ATTIPEDIT · XLIST · DIMEX / DIMIM · VIEWBASE (3 hình chiếu từ khối 3D) · MSTRETCH · CHURLS · DELAY · BATTORDER · TEXTSTYLE */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x13 || !window.DVDCmd) return; A._x13 = true;
  const D2R = Math.PI / 180;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const isT = e => e && e.type === 'TEXT' && !e.dimd && !e.dimx && !A.isLocked(e);
  const pickTexts = async (pr) => { const s = await A.getSel(pr || 'Chọn chữ', { filter: e => e.type === 'TEXT' }); return (s.sel || []).filter(isT); };

  /* ---------- hình học chữ (theo textExtent của app: hộp chữ trong hệ toạ độ riêng của chữ) ---------- */
  const ext = (e, ha, va) => textExtent(Object.assign({}, e, ha ? { ha } : {}, va ? { va } : {}));
  const L2W = (e, lx, ly) => { const r = (e.rot || 0) * D2R, c = Math.cos(r), s = Math.sin(r); return { x: e.x + lx * c - ly * s, y: e.y + lx * s + ly * c }; };
  const boxW = e => { const b = ext(e); return [L2W(e, b.xmin, b.ymin), L2W(e, b.xmax, b.ymin), L2W(e, b.xmax, b.ymax), L2W(e, b.xmin, b.ymax)]; };
  const centerW = e => { const b = ext(e); return L2W(e, (b.xmin + b.xmax) / 2, (b.ymin + b.ymax) / 2); };
  A.textBoxW = boxW;

  /* 1) TJUST — đổi canh lề chữ, chữ đứng yên tại chỗ */
  const JU = { L: ['left', 'alphabetic'], C: ['center', 'alphabetic'], R: ['right', 'alphabetic'], TL: ['left', 'top'], TC: ['center', 'top'], TR: ['right', 'top'], ML: ['left', 'middle'], MC: ['center', 'middle'], MR: ['right', 'middle'], BL: ['left', 'bottom'], BC: ['center', 'bottom'], BR: ['right', 'bottom'] };
  function tjust(e, k){ const j = JU[k]; if(!j) return null; const b = ext(e), nb = ext(e, j[0], j[1]); const w = copy(e); const p = L2W(e, b.xmin - nb.xmin, (b.ymin + b.ymax) / 2 - (nb.ymin + nb.ymax) / 2);   /* giữ đầu chữ và tâm theo chiều cao */ w.x = p.x; w.y = p.y; w.ha = j[0]; w.va = j[1]; return w; }
  A.tjust = tjust;
  cmd(['TJUST'], 'Đổi canh lề chữ (Trái / Giữa / Phải / Trên / Giữa / Dưới…) mà chữ không bị dời', async () => {
    const sel = await pickTexts(); if(!sel.length) return;
    const k = await A.getKw('Canh lề', { kw: Object.keys(JU).map(x => ({ k: x, t: x })), def: 'MC' }); const key = k.kw || 'MC';
    const rep = sel.map(e => [e, tjust(e, key)]).filter(x => x[1]); A.commit({ rep }, 'TJUST ' + key); log('TJUST: ' + rep.length + ' chữ → ' + key + '.');
  });
  /* 2) TORIENT — xoay chữ về góc cho trước hoặc cho dễ đọc, giữ tâm chữ */
  function torient(e, ang){ const c0 = centerW(e); const w = copy(e); w.rot = ang; const c1 = centerW(w); w.x += c0.x - c1.x; w.y += c0.y - c1.y; return w; }
  cmd(['TORIENT'], 'Xoay chữ về góc cho trước, hoặc lật chữ ngược cho dễ đọc (giữ tâm chữ)', async () => {
    const sel = await pickTexts(); if(!sel.length) return;
    const a = await A.getNum('Góc mới (Enter = lật chữ ngược cho dễ đọc)'); const rep = [];
    for(const e of sel){ let ang; if(a.num != null) ang = a.num; else { let r = (((e.rot || 0) % 360) + 360) % 360; if(r > 90 && r <= 270) ang = r - 180; else continue; } rep.push([e, torient(e, ang)]); }
    if(rep.length) A.commit({ rep }, 'TORIENT'); log('TORIENT: ' + rep.length + ' chữ.');
  });
  /* 3) TSCALE — tỉ lệ cao chữ quanh điểm đặt của từng chữ */
  cmd(['TSCALE'], 'Đổi cỡ nhiều chữ: nhân hệ số hoặc đặt chiều cao, giữ điểm đặt từng chữ', async () => {
    const sel = await pickTexts(); if(!sel.length) return;
    const k = await A.getKw('Cách đổi', { kw: [{ k: 'F', t: 'Hệ số' }, { k: 'H', t: 'Chiều cao' }], def: 'Hệ số' });
    const v = await A.getNum(k.kw === 'H' ? 'Chiều cao chữ mới' : 'Hệ số tỉ lệ', { def: k.kw === 'H' ? sel[0].h : 2 }); if(!(v.num > 0)) return;
    const rep = sel.map(e => { const w = copy(e); w.h = k.kw === 'H' ? v.num : (e.h || 10) * v.num; return [e, w]; }); A.commit({ rep }, 'TSCALE'); log('TSCALE: ' + rep.length + ' chữ.');
  });
  /* 4) TEXTFIT — co / giãn bề rộng chữ cho vừa đoạn chỉ định */
  cmd(['TEXTFIT'], 'Co / giãn bề rộng chữ (hệ số rộng) cho vừa tới điểm chỉ định', async () => {
    const r = await A.getEnt('Chọn chữ', { filter: isT }); if(!r.ent) return; const e = r.ent; const b = ext(e); const st = L2W(e, b.xmin, 0);
    const p = await A.getPoint('Điểm cuối mới của chữ', { base: st }); if(!p.pt) return;
    const ro = (e.rot || 0) * D2R, len = (p.pt.x - st.x) * Math.cos(ro) + (p.pt.y - st.y) * Math.sin(ro); const W0 = b.xmax - b.xmin; if(!(len > 0) || !(W0 > 0)){ log('Điểm cuối phải nằm phía sau đầu chữ.'); return; }
    const w = copy(e); w.xs = (e.xs || 1) * len / W0; const nb = ext(w); const q = L2W(w, 0, 0); const s1 = L2W(w, nb.xmin, 0); w.x += st.x - s1.x; w.y += st.y - s1.y; void q;
    A.commit({ rep: [[e, w]] }, 'TEXTFIT'); log('TEXTFIT: hệ số rộng ' + (+w.xs.toFixed(3)) + '.');
  });
  /* 5) TCIRCLE — khung tròn / khe / chữ nhật quanh chữ */
  function tframe(e, shape, off){
    const b = ext(e), h = e.h || 10, o = off * h; const x0 = b.xmin - o, x1 = b.xmax + o, y0 = b.ymin - o, y1 = b.ymax + o;
    const P = (lx, ly) => L2W(e, lx, ly); const base = { layer: e.layer, col: e.col }; if(e.bl) base.bl = 1;
    if(shape === 'C'){ const c = P((x0 + x1) / 2, (y0 + y1) / 2); return Object.assign({ type: 'CIRCLE', cx: c.x, cy: c.y, r: Math.hypot(x1 - x0, y1 - y0) / 2 }, base); }
    if(shape === 'S'){ const r = (y1 - y0) / 2, xa = Math.min(x0 + r, (x0 + x1) / 2), xb = Math.max(x1 - r, (x0 + x1) / 2), ym = (y0 + y1) / 2; const BV = [Object.assign(P(xa, y0), { bulge: 0 }), Object.assign(P(xb, y0), { bulge: 1 }), Object.assign(P(xb, y1), { bulge: 0 }), Object.assign(P(xa, y1), { bulge: 1 })]; void ym;
      const w = Object.assign({ type: 'POLYLINE', closed: true, vertices: BV.map(p => ({ x: p.x, y: p.y })) }, base); A.setBV(w, BV); return w; }
    return Object.assign({ type: 'POLYLINE', closed: true, vertices: [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)] }, base);
  }
  A.tframe = tframe;
  cmd(['TCIRCLE'], 'Vẽ khung quanh chữ: Tròn / Khe (bo 2 đầu) / Chữ nhật', async () => {
    const sel = await pickTexts(); if(!sel.length) return;
    const k = await A.getKw('Kiểu khung', { kw: [{ k: 'C', t: 'Tròn' }, { k: 'S', t: 'Khe' }, { k: 'R', t: 'Chữ nhật' }], def: 'Chữ nhật' }); const sh = k.kw || 'R';
    const o = await A.getNum('Khoảng hở (× cao chữ)', { def: 0.35 }); const off = o.num != null && o.num >= 0 ? o.num : 0.35;
    const add = sel.map(e => tframe(e, sh, off)); A.commit({ add }, 'TCIRCLE'); log('TCIRCLE: ' + add.length + ' khung.');
  });

  /* 6) MULTIPLE — lặp lại lệnh tới khi Esc */
  let multi = null;
  { const _c = A.cancel; A.cancel = function(silent){ if(multi && !silent) multi.stop = true; return _c.apply(this, arguments); }; }
  plain(['MULTIPLE'], 'Lặp lại một lệnh liên tục tới khi bấm Esc', async () => {
    if(A.busy && A.busy()) A.cancel(true);
    const name = (prompt('MULTIPLE — lệnh cần lặp lại:', 'CIRCLE') || '').trim().toUpperCase(); if(!name) return;
    if(!DVDCmd.commands.some(c => c.k.includes(name))){ say('Không có lệnh ' + name); return; }
    A.multipleRun(name);
  });
  A.multipleRun = (name, maxN) => { const M = multi = { stop: false, n: 0 }; let quick = 0;
    const tick = () => { if(M.stop || multi !== M){ if(multi === M) multi = null; A.log('MULTIPLE: dừng sau ' + M.n + ' lần ' + name + '.'); return; }
      if(A.busy && A.busy()){ setTimeout(tick, 60); return; }
      if(maxN && M.n >= maxN){ multi = null; return; }
      const t0 = Date.now(); M.n++; DVDCmd.run(name); setTimeout(() => { if(!(A.busy && A.busy()) && Date.now() - t0 < 200){ if(++quick > 3){ M.stop = true; } } else quick = 0; tick(); }, 80); };
    tick(); return M; };

  /* 7) HISTORY / TEXTSCR — xem lịch sử dòng lệnh (F2) */
  plain(['HISTORY', 'TEXTSCR', 'COMMANDHISTORY'], 'Cửa sổ lịch sử dòng lệnh (sao chép được)', () => {
    const L = (DVDCmd.history ? DVDCmd.history() : []).slice(-1000);
    A.dialog({ title: 'Lịch sử dòng lệnh', wide: true, okText: 'Đóng', html: '<textarea id="hsT" readonly style="width:100%;height:55vh;font:12px ui-monospace,Menlo,monospace">' + esc(L.join('\n')) + '</textarea><button type="button" id="hsC">Sao chép</button>',
      onOpen: root => { const t = root.querySelector('#hsT'); t.scrollTop = t.scrollHeight; root.querySelector('#hsC').addEventListener('click', () => { try{ navigator.clipboard.writeText(t.value); say('Đã sao chép'); }catch(_){ t.select(); document.execCommand('copy'); } }); } });
  });

  /* 8) ATTIPEDIT · XLIST · CHURLS · DELAY */
  cmd(['ATTIPEDIT'], 'Sửa tại chỗ giá trị một thuộc tính khối', async () => {
    const r = await A.getEnt('Chọn chữ thuộc tính', { filter: e => e.type === 'TEXT' && e.att }); if(!r.ent) return;
    const v = await A.getStr('Giá trị "' + r.ent.att + '"', { def: r.ent.text || '' }); if(v.str == null) return; const w = copy(r.ent); w.text = v.str; A.commit({ rep: [[r.ent, w]] }, 'ATTIPEDIT');
  });
  const typeVN = { LINE: 'Đường thẳng', POLYLINE: 'Đa tuyến', CIRCLE: 'Đường tròn', ARC: 'Cung', ELLIPSE: 'Elip', TEXT: 'Chữ', HATCH: 'Hatch', POINT: 'Điểm', SOLID: 'Mặt tô', SOLID3D: 'Khối 3D', XLINE: 'Đường dựng', IMAGE: 'Ảnh' };
  cmd(['XLIST'], 'Xem thuộc tính đối tượng nằm trong khối / tham chiếu (loại, lớp, màu, kiểu nét, khối chứa)', async () => {
    const r = await A.getPoint('Bấm vào đối tượng bên trong khối'); if(!r.pt) return; let e = null;
    try{ const s = toScreen(r.pt.x, r.pt.y); e = A.pickAt(s, { allowLocked: true }); }catch(_){}
    if(!e){ log('Không có đối tượng ở đó.'); return; }
    const rows = [['Loại', typeVN[e.type] || e.type], ['Khối chứa', (e.bm && e.bm.name) || String(e.blk || '').replace(/^\*/, '') || '—'], ['Lớp', e.layer || '0'], ['Màu', e.bl ? 'ByLayer (' + A.layerHex(e.layer || '0') + ')' : (e.col || '—') + ' · ACI ' + A.aciNear(e.col || '#ffffff')], ['Kiểu nét', e.lt || 'ByLayer (' + (A.layerLT(e.layer || '0') || 'Continuous') + ')'], ['Bề rộng nét', e.lw > 0 ? (e.lw / 100).toFixed(2) + ' mm' : 'ByLayer']];
    if(e.att) rows.push(['Thuộc tính', e.att + ' = ' + (e.text || '')]); if(e.xr) rows.push(['Tham chiếu ngoài', String(e.xr)]);
    A.dialog({ title: 'XLIST', okText: 'Đóng', html: '<table class="lm-tbl" style="width:100%">' + rows.map(([a, b]) => '<tr><td style="opacity:.75">' + esc(a) + '</td><td>' + esc(b) + '</td></tr>').join('') + '</table>' });
    log('XLIST: ' + rows.map(x => x[0] + ' ' + x[1]).join(' · '));
  });
  cmd(['CHURLS'], 'Đổi / xoá siêu liên kết (URL) của đối tượng', async () => {
    const r = await A.getEnt('Chọn đối tượng có liên kết'); if(!r.ent) return;
    const v = await A.getStr('Liên kết mới (để trống = xoá)', { def: r.ent.url || '' }); if(v.str == null) return; const w = copy(r.ent); if(String(v.str).trim()) w.url = String(v.str).trim(); else delete w.url; A.commit({ rep: [[r.ent, w]] }, 'CHURLS');
  });
  cmd(['DELAY'], 'Tạm dừng (mili giây) — dùng trong file script .scr', async () => { const v = await A.getNum('Thời gian dừng (ms)', { def: 1000 }); const ms = Math.max(0, Math.min(60000, v.num || 0)); await new Promise(r => setTimeout(r, ms)); });

  /* 9) DIMEX / DIMIM — xuất / nhập kiểu kích thước ra file */
  plain(['DIMEX'], 'Xuất kiểu kích thước hiện hành ra file .dvddim (dùng cho máy / bản vẽ khác)', () => {
    const o = Object.assign({ kind: 'dvdcad-dimstyle', v: 1 }, A.DS || {}); const blob = new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' });
    const nm = 'kieu-kich-thuoc.dvddim'; try{ if(typeof shareOrDownload === 'function') shareOrDownload(blob, nm, 'application/json'); else downloadBlob(blob, nm); }catch(_){ } A.log('DIMEX: đã xuất kiểu kích thước.');
  });
  A.dimImport = obj => { if(!obj || typeof obj !== 'object') return false; const keys = ['txt', 'arrow', 'dec', 'lfac', 'exo', 'exe', 'gap', 'asz', 'dli', 'suffix', 'prefix', 'layer']; const o = {}; for(const k of keys) if(obj[k] != null) o[k] = obj[k]; if(!Object.keys(o).length) return false;
    Object.assign(A.DS, o); try{ const g = Object.assign({}, A.DS); delete g.txt; localStorage.setItem('dvd:dimstyle', JSON.stringify(g)); }catch(_){} return true; };
  plain(['DIMIM'], 'Nhập kiểu kích thước từ file .dvddim', () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.dvddim,.json'; i.style.display = 'none'; document.body.appendChild(i);
    i.onchange = async () => { const f = i.files && i.files[0]; i.remove(); if(!f) return; try{ const ok = A.dimImport(JSON.parse(await f.text())); say(ok ? 'Đã nhập kiểu kích thước' : 'File không đúng định dạng'); A.log('DIMIM: ' + (ok ? 'đã nhập ' + f.name : 'file không hợp lệ') + '.'); }catch(_){ say('File không đúng định dạng'); } };
    i.click();
  });

  /* 10) MSTRETCH — kéo giãn bằng nhiều khung cắt */
  cmd(['MSTRETCH'], 'Kéo giãn với nhiều khung cắt cùng lúc', async () => {
    const boxes = []; let sel = new Set();
    for(;;){ const r = await A.getSel(boxes.length ? 'Khung cắt tiếp theo (Enter = xong)' : 'Khung cắt thứ nhất (kéo phải → trái)', { wantWindow: true, pre: false }); if(!r.window){ if(r.sel && r.sel.length && !boxes.length) log('Cần chọn bằng khung.'); break; } boxes.push(r.window.box); for(const e of (r.sel || [])) sel.add(e); }
    if(!boxes.length || !sel.size) return; let L = [...sel].filter(e => !A.isLocked(e));
    { const dimG = new Set(L.filter(e => e.dimd || e.tbld).map(e => e.grp)); if(dimG.size) L = L.filter(e => !(e.grp && dimG.has(e.grp) && !e.dimd && !e.tbld)); }
    const box = { list: boxes };
    const b = await A.getPoint('Điểm gốc'); if(!b.pt) return;
    const t = await A.getPoint('Điểm thứ hai', { base: b.pt, preview: (g, p) => g.xform(L, w => A.stretchEnt(w, box, p.x - b.pt.x, p.y - b.pt.y)) }); if(!t.pt) return;
    const dx = t.pt.x - b.pt.x, dy = t.pt.y - b.pt.y; A.commit({ rep: L.map(e => { const w = copy(e); A.stretchEnt(w, box, dx, dy); return [e, w]; }) }, 'MSTRETCH'); log('MSTRETCH: ' + boxes.length + ' khung, ' + L.length + ' đối tượng.');
  });

  /* 11) VIEWBASE — hình chiếu đứng / bằng / cạnh từ khối 3D (khử nét khuất, đặt thẳng hàng theo góc chiếu) */
  async function viewSegs(az, el){ if(!A.view3D) await A.open3D({ keep: true }); if(!A.view3D) return null; const S = A.view3D.state; if(!S) return null; S.az = az * D2R; S.el = el * D2R; return A.view3D.flatshot(); }
  const segBB = s => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(let i = 0; i < s.length; i += 2){ x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } return { x0, y0, x1, y1 }; };
  async function viewBase(proj){
    if(!modelEntities.some(e => e.type === 'SOLID3D')) return null;
    const keep = A.view3D ? { az: A.view3D.state.az, el: A.view3D.state.el } : null; const wasOpen = !!A.view3D;
    const F = await viewSegs(-90, 0), T = await viewSegs(-90, 89.9), Sd = await viewSegs(proj === 3 ? 0 : 180, 0);
    if(wasOpen && keep){ A.view3D.state.az = keep.az; A.view3D.state.el = keep.el; } else if(A.view3D) A.close3D();
    if(!F || !T || !Sd) return null; return { F, T, S: Sd };
  }
  A.viewBase = viewBase;
  cmd(['VIEWBASE', 'VIEWS3', 'HINHCHIEU'], 'Tạo 3 hình chiếu 2D (đứng, bằng, cạnh) từ khối 3D — khử nét khuất, đặt thẳng hàng (góc chiếu 1 TCVN / góc chiếu 3)', async () => {
    if(!modelEntities.some(e => e.type === 'SOLID3D')){ log('Bản vẽ chưa có khối 3D.'); return; }
    const k = await A.getKw('Phương pháp chiếu', { kw: [{ k: '1', t: 'Góc chiếu thứ nhất (TCVN / ISO)' }, { k: '3', t: 'Góc chiếu thứ ba' }], def: 'Góc chiếu thứ nhất (TCVN / ISO)' }); const proj = k.kw === '3' ? 3 : 1;
    log('Đang dựng hình chiếu…'); const V = await viewBase(proj); if(!V){ log('Không dựng được hình chiếu.'); return; }
    const bf = segBB(V.F), bt = segBB(V.T), bs = segBB(V.S); const gap = Math.max(bf.x1 - bf.x0, bf.y1 - bf.y0) * 0.35;
    const offT = { x: 0, y: proj === 1 ? (bf.y0 - gap) - bt.y1 : (bf.y1 + gap) - bt.y0 };
    const offS = { x: proj === 1 ? (bf.x1 + gap) - bs.x0 : (bf.x1 + gap) - bs.x0, y: 0 };
    const r = await A.getPoint('Điểm đặt hình chiếu đứng (góc dưới trái)', { preview: (g, p) => { const dx = p.x - bf.x0, dy = p.y - bf.y0; for(const [S, o] of [[V.F, { x: 0, y: 0 }], [V.T, offT], [V.S, offS]]){ const n = Math.min(S.length, 8000); for(let i = 0; i < n; i += 4) g.line({ x: S[i] + dx + o.x, y: S[i + 1] + dy + o.y }, { x: S[i + 2] + dx + o.x, y: S[i + 3] + dy + o.y }); } } });
    if(!r.pt) return; const dx = r.pt.x - bf.x0, dy = r.pt.y - bf.y0; const add = [];
    for(const [S, o, nm] of [[V.F, { x: 0, y: 0 }, 'Hình chiếu đứng'], [V.T, offT, 'Hình chiếu bằng'], [V.S, offS, 'Hình chiếu cạnh']]){ const gid = A.newGroupId('V');
      for(let i = 0; i < S.length; i += 4){ const e = { type: 'LINE', x1: S[i] + dx + o.x, y1: S[i + 1] + dy + o.y, x2: S[i + 2] + dx + o.x, y2: S[i + 3] + dy + o.y }; A.newProps(e); e.grp = gid; e.blk = '*' + nm; add.push(e); } }
    A.commit({ add }, 'VIEWBASE'); log('VIEWBASE: 3 hình chiếu (' + (proj === 1 ? 'góc chiếu thứ nhất' : 'góc chiếu thứ ba') + '), ' + add.length + ' nét, tỉ lệ 1:1.');
  });

  /* 12) tên gọi khác */
  plain(['BATTORDER'], 'Đổi thứ tự thuộc tính khối (mở BATTMAN)', () => DVDCmd.run('BATTMAN'));
  plain(['TEXTSTYLE'], 'Kiểu chữ (như STYLE)', () => DVDCmd.run('STYLE'));

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
