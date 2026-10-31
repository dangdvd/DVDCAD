/* DVDCAD v6h — Express Tools còn thiếu và lệnh soạn khối động như AutoCAD
   Express: ATTOUT / ATTIN, BSCALE, BTRIM / BEXTEND, FASTSEL, EXPLAN, EXPRESSTOOLS / EXPRESSMENU, JULIAN, EDITTIME, LSP, LSPSURF,
            MOVEBAK, PSTSCALE, PSBSCALE, QLATTACH / QLATTACHSET / QLDETACHSET, REDIR / REDIRMODE, REPURLS, RTEXT / RTEDIT, RTUCS,
            SUPERHATCH (khối), TFRAMES, TREX, CLIPIT, PLT2DWG (HPGL), BLOCKTOXREF, SHP2BLK, IMAGEAPP, LAYOUTMERGE
   Khối động: BACTION, BACTIONSET, BACTIONTOOL, BTABLE / BLOOKUPTABLE (bảng tra giá trị tham số), BTESTBLOCK, BAUTHORPALETTE(CLOSE),
              BCYCLEORDER, BGRIPSET, BESETTINGS, BCONSTRUCTION, BCPARAMETER */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x26 || !window.DVDCmd) return; A._x26 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const alias = (keys, to, desc) => plain(keys, desc, () => DVDCmd.run(to));
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const unlocked = l => (l || []).filter(e => !A.isLocked(e));
  const fmt = v => String(+(+v).toFixed(6));
  const groupOf = e => e && e.grp ? modelEntities.filter(x => x.grp === e.grp) : [e];
  const handleOf = e => "'" + String(e.grp || e._lid || ('H' + modelEntities.indexOf(e))).replace(/^'/, '');

  /* ===================== ATTOUT / ATTIN — xuất / nhập giá trị thuộc tính (tab) ===================== */
  cmd(['ATTOUT'], 'Xuất thuộc tính khối ra tệp văn bản (tab), sửa bằng Excel rồi ATTIN', async () => {
    const s = await A.getSel('Chọn khối có thuộc tính', { filter: e => !!(e.grp && e.bm) }); const blocks = [...new Set((s.sel || []).map(e => e.grp))]; if(!blocks.length) return;
    const rows = [], tags = []; for(const g of blocks){ const L = modelEntities.filter(x => x.grp === g); const at = L.filter(x => x.att); if(!at.length) continue; const r = { h: handleOf(L[0]), name: (L[0].bm && L[0].bm.name) || L[0].blk, v: {} }; for(const a of at){ const t = String(a.att).toUpperCase(); if(!tags.includes(t)) tags.push(t); r.v[t] = String(a.text || ''); } rows.push(r); }
    if(!rows.length){ log('Các khối đã chọn không có thuộc tính.'); return; }
    const txt = ['HANDLE', 'BLOCKNAME'].concat(tags).join('\t') + '\r\n' + rows.map(r => [r.h, r.name].concat(tags.map(t => r.v[t] != null ? r.v[t] : '<>')).join('\t')).join('\r\n') + '\r\n';
    const name = String((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '') + '.txt';
    try{ if(window.DVDLisp && DVDLisp.fs) await DVDLisp.fs.put(name, txt); }catch(_){}
    try{ await shareOrDownload(new Blob(['\ufeff' + txt], { type: 'text/plain' }), name, 'text/plain'); }catch(_){}
    log('ATTOUT: ' + rows.length + ' khối, ' + tags.length + ' thuộc tính → ' + name + ' (mở bằng Excel, sửa, lưu dạng văn bản tab, rồi ATTIN).');
  });
  cmd(['ATTIN'], 'Nhập lại giá trị thuộc tính từ tệp văn bản (tab) của ATTOUT', async () => {
    const f = await new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,.tsv,.csv'; inp.onchange = () => res(inp.files[0] || null); inp.click(); }); if(!f) return;
    const t = (await f.text()).replace(/^\ufeff/, ''); const lines = t.split(/\r?\n/).filter(Boolean); if(lines.length < 2) return;
    const sep = lines[0].includes('\t') ? '\t' : ','; const head = lines[0].split(sep).map(x => x.trim().toUpperCase()); const rep = [];
    for(const line of lines.slice(1)){ const c = line.split(sep); const h = String(c[0] || '').replace(/^'/, ''); const L = modelEntities.filter(x => String(x.grp || x._lid) === h); if(!L.length) continue;
      for(const a of L.filter(x => x.att)){ const i = head.indexOf(String(a.att).toUpperCase()); if(i < 2 || c[i] == null || c[i] === '<>') continue; if(String(a.text || '') === c[i]) continue; const w = copy(a); w.text = c[i]; rep.push([a, w]); } }
    if(rep.length) A.commit({ rep }, 'ATTIN: đã cập nhật ' + rep.length + ' thuộc tính'); else log('ATTIN: không có thay đổi.');
  });

  /* ===================== BSCALE — tỉ lệ khối quanh điểm chèn ===================== */
  cmd(['BSCALE'], 'Đổi tỉ lệ các khối, mỗi khối quanh điểm chèn của nó', async () => {
    const s = await A.getSel('Chọn khối', { filter: e => !!(e.grp && e.bm) }); const blocks = [...new Set(unlocked(s.sel).map(e => e.grp))]; if(!blocks.length) return;
    const k = await A.getNum('Hệ số tỉ lệ', { def: 1 }); if(!(k.num > 0) || k.num === 1) return;
    const rep = []; for(const g of blocks){ const L = modelEntities.filter(x => x.grp === g); const p = L[0].bip || { x: 0, y: 0 }; const M = { a: k.num, b: 0, c: 0, d: k.num, e: p.x * (1 - k.num), f: p.y * (1 - k.num) };
      for(const e of L){ const w = A.xformEnt(copy(e), M); if(w.bm){ w.bm = Object.assign({}, w.bm, { a: w.bm.a * k.num, b: w.bm.b * k.num, c: w.bm.c * k.num, d: w.bm.d * k.num }); } rep.push([e, w]); } }
    A.commit({ rep }, 'BSCALE: ' + blocks.length + ' khối × ' + fmt(k.num));
  });
  alias(['BTRIM'], 'TRIM', 'Cắt bằng nét trong khối / tham chiếu làm biên (như TRIM, chọn khối làm biên)');
  alias(['BEXTEND'], 'EXTEND', 'Kéo dài tới nét trong khối / tham chiếu (như EXTEND, chọn khối làm biên)');
  alias(['TREX'], 'TRIM', 'Cắt / kéo dài trong một lệnh (TRIM; giữ Shift khi bấm để kéo dài)');
  alias(['CLIPIT'], 'XCLIP', 'Cắt khối / tham chiếu / ảnh theo đường bao (như XCLIP)');
  alias(['EXPLAN'], 'PLAN', 'Về mặt bằng (Express PLAN)');
  alias(['RTUCS'], 'UCS', 'Xoay UCS (Express): dùng UCS › Z');
  alias(['BACTIONSET', 'BACTIONTOOL'], 'BPARAMETER', 'Gán lại hành động khối động: DVDCAD gộp tham số và hành động trong BPARAMETER');

  /* ===================== FASTSEL — chọn các đối tượng chạm đối tượng đã chọn ===================== */
  cmd(['FASTSEL'], 'Chọn nhanh mọi đối tượng chạm vào đối tượng đã chọn', async () => {
    const r = await A.getEnt('Chọn đối tượng gốc'); if(!r.ent) return; const c0 = A.G.curveOf(r.ent); if(!c0){ log('Đối tượng không phải đường cong.'); return; }
    const b0 = entBBox(r.ent); const hit = [r.ent];
    for(const e of modelEntities){ if(e === r.ent || e.vh) continue; const b = entBBox(e); if(!b || b.x1 < b0.x0 || b.x0 > b0.x1 || b.y1 < b0.y0 || b.y0 > b0.y1) continue; const c = A.G.curveOf(e); if(!c) continue; try{ if(A.G.xCurves(c0, c, null).length) hit.push(e); }catch(_){} }
    setTimeout(() => { try{ selEnts.clear(); for(const e of hit) selEnts.add(e); try{ refreshPanSel(); }catch(_){} A.paint && A.paint(); }catch(_){} }, 30);   // giữ tập chọn sau khi lệnh kết thúc (như AutoCAD)
    log('FASTSEL: chọn ' + hit.length + ' đối tượng.');
  });

  /* ===================== EXPRESSTOOLS / EXPRESSMENU / JULIAN / EDITTIME / LSP / LSPSURF / MOVEBAK / IMAGEAPP ===================== */
  plain(['EXPRESSTOOLS', 'EXPRESSMENU'], 'Hiện thẻ Express Tools trên ribbon', () => { try{ const t = [...document.querySelectorAll('#acadTop [data-tab], #acadTop .rb-tab')].find(x => /express/i.test(x.textContent)); if(t){ t.click(); return; } }catch(_){} log('Thẻ Express Tools nằm trên ribbon.'); });
  const julian = d => d.getTime() / 86400000 + 2440587.5;
  plain(['JULIAN'], 'Đổi ngày ↔ số ngày Julian (Express)', async () => { const r = await new Promise(res => A.dialog({ title: 'JULIAN', html: '<div class="acw"><label>Ngày (yyyy-mm-dd) hoặc số Julian <input id="jdI" value="' + new Date().toISOString().slice(0, 10) + '" style="width:100%"></label></div>', ok: rt => res(rt.querySelector('#jdI').value), cancel: () => res(null) })); if(!r) return;
    const n = parseFloat(r); if(isFinite(n) && !/-/.test(r)) log('Julian ' + n + ' = ' + new Date((n - 2440587.5) * 86400000).toLocaleString()); else { const d = new Date(r); if(isFinite(d)) log(r + ' = Julian ' + fmt(julian(d))); } });
  const t0 = Date.now();
  plain(['EDITTIME'], 'Thời gian đã sửa bản vẽ trong phiên này (Express)', () => { const m = Math.round((Date.now() - t0) / 60000); log('EDITTIME: ' + Math.floor(m / 60) + ' giờ ' + (m % 60) + ' phút trong phiên làm việc này.'); });
  plain(['LSP'], 'Liệt kê lệnh, hàm, biến AutoLISP đã nạp (Express)', () => { if(!window.DVDLisp) return; const cmds = DVDLisp.commands || []; const G = DVDLisp.G; const fns = [], vars = []; for(const [k, v] of G){ if(typeof v === 'function' && v.lname && /^C:/.test(k)) continue; if(v && typeof v === 'object' && v.params !== undefined) fns.push(k); else if(/^\*.*\*$/.test(k)) vars.push(k); }
    log('Lệnh LISP: ' + (cmds.join(', ') || '(không có)')); log('Hàm LISP người dùng: ' + (fns.slice(0, 200).join(', ') || '(không có)')); if(vars.length) log('Biến *…*: ' + vars.slice(0, 200).join(', ')); });
  plain(['LSPSURF'], 'Xem nhanh tệp LISP: danh sách defun trong một tệp của thư mục hỗ trợ (Express)', () => { const fs = window.DVDLisp && DVDLisp.fs; const L = fs ? fs.list().filter(f => /\.lsp$/i.test(f.name)) : []; if(!L.length){ log('Chưa có tệp .lsp trong thư mục hỗ trợ.'); return; }
    const html = '<div class="acw" style="width:min(720px,92vw)"><select id="lsF" style="width:100%">' + L.map((f, i) => '<option value="' + i + '">' + esc(f.name) + '</option>').join('') + '</select><div id="lsD" class="acw-list" style="height:300px;overflow:auto;margin-top:6px;padding:6px;font:12px ui-monospace,monospace" translate="no"></div></div>';
    const d = A.dialog({ title: 'LSPSURF', html, noCancel: true }); const r = d.root, show = () => { const f = L[+r.querySelector('#lsF').value]; const defs = [...String(f.text).matchAll(/\(\s*defun\s+([^\s()]+)\s*\(([^)]*)\)/gi)]; r.querySelector('#lsD').innerHTML = defs.length ? defs.map(m => '<div><b>' + esc(m[1]) + '</b> (' + esc(m[2].trim()) + ')</div>').join('') : '(không có defun)'; }; r.querySelector('#lsF').onchange = show; show(); });
  plain(['MOVEBAK'], 'Thư mục chứa tệp sao lưu .bak (Express)', async () => { const r = await A.getStr('Thư mục cho tệp .bak (. = cùng thư mục bản vẽ)', { def: localStorage.getItem('dvd:bakdir') || '.' }); if(r.str == null) return; try{ localStorage.setItem('dvd:bakdir', String(r.str).trim() || '.'); }catch(_){} log('MOVEBAK = ' + (String(r.str).trim() || '.')); });
  plain(['IMAGEAPP'], 'Chương trình sửa ảnh ngoài (Express)', async () => { const r = await A.getStr('Tên chương trình sửa ảnh (. = mặc định của hệ thống)', { def: localStorage.getItem('dvd:imageapp') || '.' }); if(r.str == null) return; try{ localStorage.setItem('dvd:imageapp', String(r.str).trim() || '.'); }catch(_){} });

  /* ===================== PSTSCALE / PSBSCALE — cỡ chữ / khối theo tỉ lệ khung nhìn ===================== */
  const vpScale = async () => { const r = await A.getNum('Tỉ lệ khung nhìn 1:', { def: (A.ANNO && A.ANNO.N) || 100 }); return r.num > 0 ? r.num : null; };
  cmd(['PSTSCALE'], 'Đặt cao chữ trong Model để in ra đúng cao trên giấy (Express)', async () => {
    const s = await A.getSel('Chọn chữ', { filter: e => e.type === 'TEXT' }); const sel = unlocked(s.sel); if(!sel.length) return;
    const h = await A.getNum('Cao chữ trên giấy (mm)', { def: 2.5 }); if(!(h.num > 0)) return; const N = await vpScale(); if(!N) return;
    A.commit({ rep: sel.map(e => { const w = copy(e); w.h = h.num * N; return [e, w]; }) }, 'PSTSCALE: cao chữ ' + fmt(h.num) + ' mm × 1:' + N); });
  cmd(['PSBSCALE'], 'Đặt tỉ lệ khối để in ra đúng cỡ trên giấy (Express)', async () => {
    const s = await A.getSel('Chọn khối', { filter: e => !!(e.grp && e.bm) }); const blocks = [...new Set(unlocked(s.sel).map(e => e.grp))]; if(!blocks.length) return;
    const k = await A.getNum('Tỉ lệ khối trên giấy', { def: 1 }); if(!(k.num > 0)) return; const N = await vpScale(); if(!N) return; const want = k.num * N;
    const rep = []; for(const g of blocks){ const L = modelEntities.filter(x => x.grp === g); const bm = L[0].bm, cur = Math.hypot(bm.a, bm.b) || 1, f = want / cur; if(Math.abs(f - 1) < 1e-12) continue; const p = L[0].bip; const M = { a: f, b: 0, c: 0, d: f, e: p.x * (1 - f), f: p.y * (1 - f) };
      for(const e of L){ const w = A.xformEnt(copy(e), M); if(w.bm) w.bm = Object.assign({}, w.bm, { a: w.bm.a * f, b: w.bm.b * f, c: w.bm.c * f, d: w.bm.d * f }); rep.push([e, w]); } }
    if(rep.length) A.commit({ rep }, 'PSBSCALE: ' + blocks.length + ' khối tỉ lệ ' + fmt(want)); });

  /* ===================== QLATTACH / QLATTACHSET / QLDETACHSET — gắn chú thích vào đường dẫn ===================== */
  cmd(['QLATTACH'], 'Gắn chữ vào đường dẫn ghi chú (Express): hai đối tượng thành một cụm', async () => {
    const a = await A.getEnt('Chọn đường dẫn (leader)'); if(!a.ent) return; const b = await A.getEnt('Chọn chữ / khối chú thích'); if(!b.ent) return;
    const g = a.ent.grp || A.newGroupId('L'); const L = groupOf(a.ent).concat(groupOf(b.ent)); A.commit({ rep: L.map(e => { const w = copy(e); w.grp = g; w.blk = w.blk && w.blk !== '*LEADER' && e.grp !== a.ent.grp ? w.blk : '*LEADER'; return [e, w]; }) }, 'QLATTACH: đã gắn'); });
  cmd(['QLATTACHSET'], 'Gắn hàng loạt chữ gần đầu đường dẫn (Express)', async () => {
    const s = await A.getSel('Chọn các đường dẫn và chữ'); const sel = unlocked(s.sel); const leaders = [...new Set(sel.filter(e => e.grp && /\*LEADER/.test(e.blk || '')).map(e => e.grp))]; const texts = sel.filter(e => e.type === 'TEXT' && !(e.grp && /\*LEADER/.test(e.blk || '')));
    const rep = []; for(const g of leaders){ const L = modelEntities.filter(x => x.grp === g); const b = L.map(entBBox).filter(Boolean); if(!b.length) continue; const cx = (Math.min(...b.map(q => q.x0)) + Math.max(...b.map(q => q.x1))) / 2, cy = (Math.min(...b.map(q => q.y0)) + Math.max(...b.map(q => q.y1))) / 2;
      let best = null, bd = Infinity; for(const t of texts){ const d = Math.hypot(t.x - cx, t.y - cy); if(d < bd){ bd = d; best = t; } } if(best){ const w = copy(best); w.grp = g; w.blk = '*LEADER'; rep.push([best, w]); texts.splice(texts.indexOf(best), 1); } }
    if(rep.length) A.commit({ rep }, 'QLATTACHSET: gắn ' + rep.length + ' chú thích'); else log('Không có cặp đường dẫn / chữ nào để gắn.'); });
  cmd(['QLDETACHSET'], 'Tách chữ khỏi đường dẫn (Express)', async () => {
    const s = await A.getSel('Chọn đường dẫn'); const gs = [...new Set(unlocked(s.sel).filter(e => e.grp && /\*LEADER/.test(e.blk || '')).map(e => e.grp))]; const rep = [];
    for(const g of gs) for(const e of modelEntities.filter(x => x.grp === g && x.type === 'TEXT')){ const w = copy(e); delete w.grp; delete w.blk; delete w.ldp; rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, 'QLDETACHSET: tách ' + rep.length + ' chữ'); });

  /* ===================== REDIR / REDIRMODE / REPURLS ===================== */
  plain(['REDIRMODE'], 'Loại đường dẫn REDIR đổi: Kiểu chữ, Tham chiếu, Ảnh, RTEXT', async () => { const cur = localStorage.getItem('dvd:redirmode') || 'STYLES,XREFS,IMAGES,RTEXT'; const r = await A.getStr('Loại cần đổi (STYLES,XREFS,IMAGES,RTEXT)', { def: cur }); if(r.str) try{ localStorage.setItem('dvd:redirmode', String(r.str).toUpperCase()); }catch(_){} });
  cmd(['REDIR'], 'Đổi đường dẫn trong tham chiếu ngoài, ảnh, kiểu chữ, RTEXT (Express)', async () => {
    const a = await A.getStr('Tìm đường dẫn cũ (vd C:\\Old\\ hoặc *)'); if(!a.str) return; const b = await A.getStr('Thay bằng'); if(b.str == null) return;
    const from = String(a.str), to = String(b.str); const mode = (localStorage.getItem('dvd:redirmode') || 'STYLES,XREFS,IMAGES,RTEXT').split(',');
    const sub = s => { s = String(s || ''); if(from === '*') return to + s.replace(/^.*[\\/]/, ''); return s.split(from).join(to); };
    const rep = []; for(const e of modelEntities){ const w = copy(e); let ch = false;
      if(mode.includes('IMAGES') && e.type === 'IMAGE' && e.name){ const v = sub(e.name); if(v !== e.name){ w.name = v; ch = true; } }
      if(mode.includes('XREFS') && e.xref){ const v = sub(e.xref); if(v !== e.xref){ w.xref = v; ch = true; } }
      if(mode.includes('RTEXT') && e.rtext && e.rtext.file){ const v = sub(e.rtext.file); if(v !== e.rtext.file){ w.rtext = Object.assign({}, e.rtext, { file: v }); ch = true; } }
      if(ch) rep.push([e, w]); }
    let n = rep.length; if(mode.includes('STYLES') && A.TS){ for(const st of Object.values(A.TS.list)){ if(st.font && String(st.font).includes(from)){ st.font = sub(st.font); n++; } } }
    if(rep.length) A.commit({ rep }, 'REDIR: đổi ' + n + ' đường dẫn'); else log('REDIR: đổi ' + n + ' đường dẫn.'); });
  cmd(['REPURLS'], 'Tìm và thay địa chỉ trong siêu liên kết (Express)', async () => {
    const a = await A.getStr('Tìm'); if(!a.str) return; const b = await A.getStr('Thay bằng'); if(b.str == null) return;
    const rep = modelEntities.filter(e => e.url && String(e.url).includes(a.str)).map(e => { const w = copy(e); w.url = String(e.url).split(a.str).join(b.str); return [e, w]; });
    if(rep.length) A.commit({ rep }, 'REPURLS: đổi ' + rep.length + ' liên kết'); else log('Không có liên kết chứa "' + a.str + '".'); });

  /* ===================== RTEXT / RTEDIT — chữ lấy từ tệp hoặc biểu thức DIESEL, tự cập nhật ===================== */
  const rtextValue = rt => { if(rt.diesel) return A.diesel ? A.diesel(rt.diesel) : rt.diesel; const f = window.DVDLisp && DVDLisp.fs && DVDLisp.fs.get(String(rt.file || '').replace(/^.*[\\/]/, '')); return f ? String(f.text) : '(không thấy tệp ' + rt.file + ')'; };
  cmd(['RTEXT'], 'Chữ tham chiếu (Express): nội dung lấy từ tệp hoặc biểu thức DIESEL, cập nhật bằng RTEDIT / REGEN', async () => {
    const k = await A.getKw('Nguồn chữ', { kw: [{ k: 'F', t: 'Tệp' }, { k: 'D', t: 'DIESEL' }], def: 'DIESEL' }); let rt;
    if(k.kw === 'F'){ const f = await new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,.csv'; inp.onchange = () => res(inp.files[0] || null); inp.click(); }); if(!f) return; if(window.DVDLisp && DVDLisp.fs) await DVDLisp.fs.put(f.name, await f.text()); rt = { file: f.name }; }
    else { const d = await A.getStr('Biểu thức DIESEL', { def: '$(getvar,dwgname) — $(edtime,$(getvar,date),DD/MO/YYYY)' }); if(!d.str) return; rt = { diesel: String(d.str) }; }
    const p = await A.getPoint('Điểm chèn'); if(!p.pt) return; const h = (A.MEM && A.MEM.th) || (A.dimTxt ? A.dimTxt() : 2.5);
    const e = A.newProps({ type: 'TEXT', mt: 1, x: p.pt.x, y: p.pt.y, h, rot: 0, ha: 'left', va: 'top', text: rtextValue(rt), rtext: rt }); A.commit({ add: [e] }, 'RTEXT');
  });
  const rtUpdate = () => { const rep = modelEntities.filter(e => e.rtext).map(e => { const v = rtextValue(e.rtext); if(v === e.text) return null; const w = copy(e); w.text = v; return [e, w]; }).filter(Boolean); if(rep.length) A.commit({ rep }, 'RTEXT: cập nhật ' + rep.length); return rep.length; };
  cmd(['RTEDIT'], 'Sửa / cập nhật chữ tham chiếu RTEXT', async () => {
    const r = await A.getEnt('Chọn RTEXT (Enter = cập nhật tất cả)', { filter: e => !!e.rtext }); if(!r.ent){ log('RTEXT: cập nhật ' + rtUpdate() + ' đối tượng.'); return; }
    const e = r.ent; const d = await A.getStr(e.rtext.diesel ? 'Biểu thức DIESEL' : 'Tên tệp', { def: e.rtext.diesel || e.rtext.file }); if(!d.str) return;
    const rt = e.rtext.diesel ? { diesel: String(d.str) } : { file: String(d.str) }; const w = copy(e); w.rtext = rt; w.text = rtextValue(rt); A.commit({ rep: [[e, w]] }, 'RTEDIT'); });
  A.rtextUpdate = rtUpdate;

  /* ===================== TFRAMES — bật / tắt khung ảnh và vùng che ===================== */
  plain(['TFRAMES'], 'Bật / tắt khung của ảnh và vùng che (Express)', () => { const sv = A.sysvar; if(!sv) return; const on = +(sv.get('IMAGEFRAME') || 0) > 0 || +(sv.get('WIPEOUTFRAME') || 0) > 0; const v = on ? 0 : 1; try{ sv.set('IMAGEFRAME', v); }catch(_){} try{ sv.set('WIPEOUTFRAME', v); }catch(_){} try{ draw(); }catch(_){} log('TFRAMES: khung ' + (v ? 'hiện' : 'ẩn') + '.'); });

  /* ===================== SUPERHATCH — tô bằng khối lặp lại trong vùng kín ===================== */
  cmd(['SUPERHATCH'], 'Tô vùng kín bằng khối lặp (Express): khối, khoảng cách X / Y, biên kín', async () => {
    const B = A.blockList ? A.blockList() : { file: [], lib: [] }; const names = (B.file || []).concat(B.lib || []); if(!names.length){ log('Chưa có khối nào.'); return; }
    const n = await A.getStr('Tên khối', { def: names[0] }); const name = String(n.str || names[0]).trim(); const src = (B.file || []).includes(name) ? 'file' : 'lib';
    const P = A.blockPrims && A.blockPrims(name, src); if(!P){ log('Không có khối "' + name + '".'); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of P.prims){ const b = entBBox(e); if(b){ x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); } }
    const dx0 = isFinite(x1) ? (x1 - x0) : 10, dy0 = isFinite(y1) ? (y1 - y0) : 10;
    const gx = await A.getNum('Khoảng cách theo X', { def: +dx0.toPrecision(4) }); const gy = await A.getNum('Khoảng cách theo Y', { def: +dy0.toPrecision(4) }); const sx = gx.num > 0 ? gx.num : dx0, sy = gy.num > 0 ? gy.num : dy0;
    const s = await A.getSel('Chọn biên kín', { filter: e => { const c = A.G.curveOf(e); return !!(c && c.closed); } }); const loops = (s.sel || []).map(e => A.hatchClosedLoop && A.hatchClosedLoop(e)).filter(Boolean); if(!loops.length) return;
    const inside = (q, lp) => { let c = false; for(let i = 0, j = lp.length - 1; i < lp.length; j = i++){ if(((lp[i].y > q.y) !== (lp[j].y > q.y)) && (q.x < (lp[j].x - lp[i].x) * (q.y - lp[i].y) / (lp[j].y - lp[i].y) + lp[i].x)) c = !c; } return c; };
    const add = []; let n2 = 0;
    for(const lp of loops){ const xs = lp.map(p => p.x), ys = lp.map(p => p.y); const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
      for(let y = Y0; y <= Y1 && n2 < 4000; y += sy) for(let x = X0; x <= X1 && n2 < 4000; x += sx){ const c = { x: x + sx / 2, y: y + sy / 2 }; if(!inside(c, lp)) continue; const corners = [[x, y], [x + sx, y], [x, y + sy], [x + sx, y + sy]]; if(!corners.every(([u, v]) => inside({ x: u, y: v }, lp))) continue;
          const N = A.instBlock(name, src, { x: x - x0 + P.base.x, y: y - y0 + P.base.y }, 1, 0); add.push(...N); n2++; } }
    if(add.length) A.commit({ add }, 'SUPERHATCH: ' + n2 + ' khối ' + name + ' (các ô nằm trọn trong biên)'); else log('Biên quá nhỏ so với khối.'); });

  /* ===================== PLT2DWG — nhập tệp in HPGL (.plt) thành nét ===================== */
  function hpgl(text){ const out = []; let pen = 1, down = false, x = 0, y = 0, rel = false; const s = String(text).replace(/\x1b[^A-Za-z]*[A-Za-z]/g, '');
    const cmds = s.split(/;|\n/); const col = p => typeof aciHex === 'function' ? aciHex(((p - 1) % 7) + 1) : '#ffffff';
    for(const c0 of cmds){ const c = c0.trim(); if(c.length < 2) continue; const op = c.slice(0, 2).toUpperCase(); const nums = (c.slice(2).match(/-?\d+(\.\d+)?/g) || []).map(Number);
      if(op === 'SP'){ pen = nums[0] || 1; continue; } if(op === 'PA') rel = false; if(op === 'PR') rel = true;
      if(op === 'PU' || op === 'PD' || op === 'PA' || op === 'PR'){ if(op === 'PU') down = false; if(op === 'PD') down = true;
        for(let i = 0; i + 1 < nums.length; i += 2){ const nx = rel ? x + nums[i] : nums[i], ny = rel ? y + nums[i + 1] : nums[i + 1]; if(down) out.push({ type: 'LINE', x1: x * 0.025, y1: y * 0.025, x2: nx * 0.025, y2: ny * 0.025, col: col(pen) }); x = nx; y = ny; } }
      if(op === 'CI'){ out.push({ type: 'CIRCLE', cx: x * 0.025, cy: y * 0.025, r: (nums[0] || 0) * 0.025, col: col(pen) }); } }
    return out; }
  A.hpglParse = hpgl;
  plain(['PLT2DWG'], 'Nhập tệp in HPGL (.plt) thành nét vẽ (Express; 1 đơn vị HPGL = 0,025 mm)', async () => {
    const f = await new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.plt,.hpgl,.hgl'; inp.onchange = () => res(inp.files[0] || null); inp.click(); }); if(!f) return;
    const ents = hpgl(await f.text()).map(e => { const w = A.newProps(e); delete w.bl; return w; }); if(!ents.length){ log('Tệp không có nét HPGL.'); return; }
    A.commit({ add: ents }, 'PLT2DWG: ' + ents.length + ' nét từ ' + f.name); try{ zoomExtents(); }catch(_){} });

  /* ===================== MKSHAPE — tạo hình SHP từ nét đã vẽ ===================== */
  cmd(['MKSHAPE'], 'Tạo hình (shape) từ nét đã vẽ: ghi tệp .shp và nạp để dùng với SHAPE (Express)', async () => {
    const fn0 = await A.getStr('Tên tệp hình (.shp)', { def: 'hinh-cua-toi' }); if(!fn0.str) return; const file = String(fn0.str).trim().replace(/\.shp$/i, '') + '.shp';
    const sn = await A.getStr('Tên hình', { def: 'HINH1' }); if(!sn.str) return; const name = String(sn.str).trim().toUpperCase().replace(/\W+/g, '_');
    const rs = await A.getNum('Độ phân giải (số ô lưới theo cạnh lớn)', { def: 128, int: true }); const res = Math.max(8, Math.min(1270, Math.round(rs.num || 128)));
    const b = await A.getPoint('Điểm chèn gốc'); if(!b.pt) return;
    const s2 = await A.getSel('Chọn đối tượng', { filter: e => !!A.G.curveOf(e) }); const sel = s2.sel || []; if(!sel.length) return;
    // nét → đoạn thẳng (cung chia nhỏ), quy về lưới số nguyên
    const segs = []; for(const e of sel){ const c = A.G.curveOf(e); for(const pc of c.pieces){ if(pc.t === 'a'){ const k = Math.max(4, Math.ceil(Math.abs(pc.sw) / (Math.PI / 12))); let px = pc.cx + pc.r * Math.cos(pc.a0), py = pc.cy + pc.r * Math.sin(pc.a0); for(let i = 1; i <= k; i++){ const t = pc.a0 + pc.sw * i / k, qx = pc.cx + pc.r * Math.cos(t), qy = pc.cy + pc.r * Math.sin(t); segs.push([px, py, qx, qy]); px = qx; py = qy; } } else segs.push([pc.ax, pc.ay, pc.bx, pc.by]); } }
    let ext = 0; for(const [x1, y1, x2, y2] of segs) ext = Math.max(ext, Math.abs(x1 - b.pt.x), Math.abs(y1 - b.pt.y), Math.abs(x2 - b.pt.x), Math.abs(y2 - b.pt.y)); if(!(ext > 0)) return;
    const k = res / ext, G2 = (x, y) => [Math.round((x - b.pt.x) * k), Math.round((y - b.pt.y) * k)];
    const bytes = []; let cx = 0, cy = 0, down = false;
    const move = (tx, ty) => { let dx = tx - cx, dy = ty - cy; while(dx || dy){ const sx = Math.max(-127, Math.min(127, dx)), sy = Math.max(-127, Math.min(127, dy)); bytes.push(8, '(' + sx + ',' + sy + ')'); dx -= sx; dy -= sy; } cx = tx; cy = ty; };
    for(const [x1, y1, x2, y2] of segs){ const [a1, b1] = G2(x1, y1), [a2, b2] = G2(x2, y2); if(a1 !== cx || b1 !== cy){ if(down){ bytes.push(2); down = false; } move(a1, b1); } if(!down){ bytes.push(1); down = true; } move(a2, b2); }
    bytes.push(2); move(0, 0); bytes.push(0);
    const body = bytes.map(String).join(','); const nb = bytes.reduce((n, x) => n + (typeof x === 'string' ? 2 : 1), 0);
    const shp = ';; Tạo bằng MKSHAPE (DVDCAD) — 1 đơn vị hình = ' + (1 / k).toPrecision(6) + ' đơn vị bản vẽ\r\n*130,' + nb + ',' + name + '\r\n' + body.replace(/(.{1,120})(,|$)/g, '$1$2\r\n');
    try{ if(A.shapeLoadFile) await A.shapeLoadFile(new File([shp], file)); }catch(err){ log('MKSHAPE: ' + (err.message || err)); }
    try{ if(window.DVDLisp && DVDLisp.fs) await DVDLisp.fs.put(file, shp); }catch(_){}
    try{ await shareOrDownload(new Blob([shp], { type: 'text/plain' }), file, 'text/plain'); }catch(_){}
    log('MKSHAPE: hình ' + name + ' (' + segs.length + ' đoạn, ' + nb + ' byte) ghi vào ' + file + ' và đã nạp — chèn bằng SHAPE ' + name + ', cỡ ' + (1 / k).toPrecision(4) + ' để đúng kích thước gốc.');
  });

  /* ===================== BLOCKTOXREF / SHP2BLK / LAYOUTMERGE ===================== */
  cmd(['BLOCKTOXREF'], 'Ghi khối ra tệp DWG rồi thay các bản chèn bằng tham chiếu ngoài (Express)', async () => {
    const r = await A.getEnt('Chọn một bản chèn của khối', { filter: e => !!(e.grp && e.bm) }); if(!r.ent) return; const name = r.ent.bm.name;
    await DVDLisp.evalToString('(command "_.-WBLOCK" "' + name + '.dwg" "' + name + '")');
    log('BLOCKTOXREF: đã ghi ' + name + '.dwg. Mở bằng XATTACH để thay các bản chèn bằng tham chiếu (DVDCAD giữ nguyên các bản chèn hiện có).'); });
  cmd(['SHP2BLK'], 'Đổi hình SHAPE thành khối (Express)', async () => {
    const r = await A.getEnt('Chọn hình (SHAPE)', { filter: e => e.type === 'SHAPE' || !!e.shp || !!e.shpx }); if(!r.ent) return; const L = groupOf(r.ent);
    const nm = await A.getStr('Tên khối', { def: String(r.ent.shp || 'SHAPE').replace(/\W+/g, '_') }); if(!nm.str) return; const b = (L[0].bip || { x: L[0].x || 0, y: L[0].y || 0 });
    A.makeBlock(L, b, String(nm.str).trim()); });
  plain(['LAYOUTMERGE'], 'Gộp các layout (Express): DVDCAD chuyển đối tượng giấy của layout nguồn sang layout đích', () => { try{ if(typeof dwgLayouts === 'undefined' || dwgLayouts.filter(l => !l.isModel).length < 2){ log('Cần ít nhất 2 layout giấy.'); return; } }catch(_){} log('LAYOUTMERGE: chọn layout đích, rồi dùng CHSPACE / COPYCLIP + PASTECLIP để đưa đối tượng giấy của layout khác sang (đổi tên khung nhìn nếu trùng).'); });

  /* ===================== Soạn khối động ===================== */
  const DKEY = 'dvd:dynblk';
  const defs = () => (A.dynDefs ? A.dynDefs() : {}); const saveDefs = () => { try{ localStorage.setItem(DKEY, JSON.stringify(defs())); }catch(_){} };
  alias(['BACTION'], 'BPARAMETER', 'Gán hành động cho khối động: Kéo giãn (độ dài), Lật, Hiển thị — DVDCAD gộp tham số + hành động trong BPARAMETER');
  // bảng tra: mỗi hàng là một bộ giá trị (trạng thái hiển thị + độ dài + lật)
  async function lookupTable(){
    const r = await A.getEnt('Chọn một bản chèn khối động', { filter: e => !!(e.grp && e.bm) }); if(!r.ent) return; const name = r.ent.bm.name, gid = r.ent.grp; const D = defs()[name];
    if(!D){ log('Khối "' + name + '" chưa có tham số động — dùng BPARAMETER trước.'); return; }
    const params = (D.lin || []).map(p => p.name); const hasVis = !!(D.vis && D.vis.states && D.vis.states.length);
    const T = D.lookup = D.lookup || { rows: [] };
    const rowHTML = (row, i) => '<tr data-i="' + i + '"><td><input data-k="label" value="' + esc(row.label || ('Hàng ' + (i + 1))) + '" style="width:110px"></td>' + (hasVis ? '<td><select data-k="st">' + D.vis.states.map(s => '<option' + (row.st === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></td>' : '') +
      params.map(p => '<td><input data-p="' + esc(p) + '" value="' + esc(row.L && row.L[p] != null ? row.L[p] : '') + '" style="width:70px"></td>').join('') + (D.flip ? '<td><input type="checkbox" data-k="fx"' + (row.fx ? ' checked' : '') + ' style="width:auto"></td>' : '') + '<td><button type="button" class="acw-btn" data-use="' + i + '">Áp dụng</button> <button type="button" class="acw-btn" data-del="' + i + '">✕</button></td></tr>';
    const head = '<tr><th>Tên hàng</th>' + (hasVis ? '<th>Hiển thị</th>' : '') + params.map(p => '<th translate="no">' + esc(p) + '</th>').join('') + (D.flip ? '<th>Lật</th>' : '') + '<th></th></tr>';
    const read = root => [...root.querySelectorAll('tbody tr[data-i]')].map(tr => { const o = { label: tr.querySelector('[data-k="label"]').value, L: {} }; const st = tr.querySelector('[data-k="st"]'); if(st) o.st = st.value; tr.querySelectorAll('[data-p]').forEach(i => { const v = parseFloat(String(i.value).replace(',', '.')); if(isFinite(v)) o.L[i.dataset.p] = v; }); const fx = tr.querySelector('[data-k="fx"]'); if(fx) o.fx = fx.checked ? 1 : 0; return o; });
    const d = A.dialog({ title: 'Bảng tra khối "' + name + '" (BTABLE)', html: '<div class="acw" style="width:min(760px,94vw)"><div class="acw-note" style="margin:0 0 6px">Mỗi hàng là một bộ giá trị tham số (như Block Properties Table / Lookup của AutoCAD). "Áp dụng" đặt bản chèn đã chọn theo hàng đó.</div><div class="acw-list" style="max-height:320px;overflow:auto;padding:4px"><table style="width:100%"><thead>' + head + '</thead><tbody id="btB">' + T.rows.map(rowHTML).join('') + '</tbody></table></div><div class="acw-row" style="margin-top:6px"><button type="button" class="acw-btn" id="btAdd">＋ Thêm hàng từ bản chèn</button></div></div>',
      ok: root => { T.rows = read(root); saveDefs(); log('BTABLE: lưu ' + T.rows.length + ' hàng cho khối "' + name + '".'); } });
    const root = d.root; root.querySelectorAll('input,select').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
    const wire = () => { root.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const row = read(root)[+b.dataset.use]; T.rows = read(root); saveDefs(); A.dynSetState && A.dynSetState(gid, { st: row.st, L: row.L, fx: row.fx }, 'BTABLE: ' + row.label); });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { b.closest('tr').remove(); }); };
    root.querySelector('#btAdd').onclick = () => { const L = modelEntities.filter(x => x.grp === gid); const s = (L.find(e => e.dyn) || {}).dyn || {}; const row = { label: 'Hàng ' + (root.querySelectorAll('tbody tr').length + 1), st: s.st || (D.vis && D.vis.def), L: Object.assign({}, (D.lin || []).reduce((o, p) => (o[p.name] = p.L0, o), {}), s.L || {}), fx: s.fx || 0 };
      const tb = root.querySelector('#btB'); tb.insertAdjacentHTML('beforeend', rowHTML(row, tb.querySelectorAll('tr').length)); wire(); };
    wire();
  }
  cmd(['BTABLE', 'BLOOKUPTABLE'], 'Bảng tra giá trị tham số khối động (Block Properties Table): tạo hàng, áp dụng hàng cho bản chèn', lookupTable);
  plain(['BTESTBLOCK'], 'Thử khối động: đổi trạng thái / độ dài / lật ngay trên bản chèn (U để quay lại)', () => DVDCmd.run('BDYN'));
  plain(['BCPARAMETER'], 'Tham số ràng buộc trong khối: dùng ràng buộc kích thước (DIMCONSTRAINT)', () => DVDCmd.run('DIMCONSTRAINT'));
  plain(['BCONSTRUCTION'], 'Hình dựng trong khối động: ẩn ở mọi trạng thái hiển thị (dùng BVHIDE cho từng trạng thái)', () => DVDCmd.run('BVHIDE'));
  plain(['BCYCLEORDER'], 'Thứ tự xoay vòng điểm chèn của khối: DVDCAD dùng điểm gốc của khối', () => log('BCYCLEORDER: DVDCAD dùng điểm gốc của khối làm điểm chèn; đổi điểm gốc bằng BEDIT › BASE.'));
  plain(['BGRIPSET'], 'Số ô nắm của tham số: DVDCAD hiện ô nắm theo từng tham số', () => log('BGRIPSET: mỗi tham số kéo giãn có một ô nắm ở đầu kéo; tham số hiển thị / lật đổi ở bảng Thuộc tính hoặc BDYN.'));
  plain(['BESETTINGS'], 'Cài đặt Block Editor', () => A.dialog({ title: 'Block Editor Settings', html: '<div class="acw" style="max-width:480px">DVDCAD soạn khối tại chỗ (BEDIT / REFEDIT). Tham số động: BPARAMETER, BVSTATE, BTABLE. Màu tham số theo giao diện.</div>', noCancel: true }));
  alias(['BASSOCIATE'], 'BPARAMETER', 'Gắn hành động với tham số (DVDCAD gộp trong BPARAMETER)');
  alias(['BWBLOCK'], 'WBLOCK', 'Ghi khối đang soạn ra tệp (như WBLOCK)');
  alias(['BXCLIP'], 'XCLIP', 'Cắt khối theo đường bao (như XCLIP)');
  plain(['BACTIONBAR'], 'Thanh hành động trong Block Editor: DVDCAD hiện tham số trong bảng Thuộc tính / BDYN', () => log('BACTIONBAR: tham số và hành động của khối động xem ở bảng Thuộc tính (chọn bản chèn) hoặc BDYN.'));
  plain(['BLOCKICON'], 'Tạo ảnh xem trước cho khối: DVDCAD tự vẽ ảnh xem trước khi chèn', () => log('BLOCKICON: DVDCAD tự tạo ảnh xem trước của khối trong INSERT / bảng Khối.'));
  let pal = null;
  plain(['BAUTHORPALETTE'], 'Bảng công cụ soạn khối động (tham số, hành động, trạng thái, bảng tra)', () => { if(pal){ try{ pal.close(); }catch(_){} }
    const B = [['BEDIT', 'Sửa khối'], ['BPARAMETER', 'Tham số + hành động'], ['BVSTATE', 'Trạng thái hiển thị'], ['BVSHOW', 'Hiện trong trạng thái'], ['BVHIDE', 'Ẩn trong trạng thái'], ['BTABLE', 'Bảng tra'], ['BDYN', 'Thử / đổi trạng thái'], ['BCONVERT', 'Đổi khối thường → khối động']];
    pal = A.dialog({ title: 'Block Authoring Palettes', html: '<div class="acw" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:360px">' + B.map(([k, t]) => '<button type="button" class="acw-btn" data-c="' + k + '"><b translate="no">' + k + '</b><br><small>' + esc(t) + '</small></button>').join('') + '</div>', noOk: true, cancelText: 'Đóng', cancel: () => { pal = null; } });
    pal.root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => DVDCmd.run(b.dataset.c)); });
  plain(['BAUTHORPALETTECLOSE'], 'Đóng bảng công cụ soạn khối', () => { if(pal){ try{ pal.close(); }catch(_){} pal = null; } });
})();
