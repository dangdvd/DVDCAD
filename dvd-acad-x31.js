/* DVDCAD v6k — tập bản vẽ (Sheet Set) như AutoCAD
   · NEWSHEETSET: tạo tập bản vẽ (tên, mô tả, thông tin dự án), lấy tờ từ các layout của bản vẽ đang mở
   · OPENSHEETSET: mở tập đã lưu hoặc tệp .dvdsst (JSON); .dst của AutoCAD báo rõ
   · SHEETSET / SSM / SHEETSETHIDE: bảng Sheet Set Manager — mở tờ (chuyển layout), sửa số / tên, thêm layout, xoá, đánh số lại,
     bảng danh mục bản vẽ (TABLE), chèn trường tập bản vẽ (số tờ, tên tờ, tên dự án… — tự cập nhật), xuất bản (PUBLISH), lưu .dvdsst */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x31 || !window.DVDCmd) return; A._x31 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const noKey = d => d && d.root && d.root.querySelectorAll('input,select,textarea').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation()));
  const docName = () => String((typeof currentName === 'string' && currentName) || 'banve');
  const layouts = () => (typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).map((L, i) => ({ i, name: L && L.name, model: !!(L && L.isModel) })).filter(L => L.name && !L.model && !/^model$/i.test(L.name));
  const curLayoutName = () => { try{ const L = dwgLayouts[currentLayout]; return L && !L.isModel ? L.name : null; }catch(_){ return null; } };

  /* ===================== dữ liệu ===================== */
  const ALL = () => LS('dvd:sheetsets', {}); const saveAll = o => SV('dvd:sheetsets', o);
  const curName = () => { try{ return localStorage.getItem('dvd:ssCur') || ''; }catch(_){ return ''; } };
  const cur = () => ALL()[curName()] || null;
  function save(ss){ const o = ALL(); o[ss.name] = ss; saveAll(o); try{ localStorage.setItem('dvd:ssCur', ss.name); }catch(_){} refreshFields(); refreshPal(); }
  A.sheetSet = cur;
  // trường tập bản vẽ nằm ở mọi layout (không gian giấy) và Model: cập nhật tại chỗ
  function refreshFields(){ let n = 0; const lists = [typeof modelEntities !== 'undefined' ? modelEntities : []]; try{ for(const L of dwgLayouts) if(L && L.paper && L.paper.paperPrims) lists.push(L.paper.paperPrims); }catch(_){}
    for(const arr of lists) for(const e of arr){ if(!e || !e.fld || e.fld.k !== 'ss') continue; const v = (e.fld.pre || '') + ssValue(e.fld.p, e.fld.lay) + (e.fld.suf || ''); if(e.text !== v){ e.text = v; n++; } }
    if(n){ try{ bbDirty = true; }catch(_){} try{ draw(); }catch(_){} } return n; }
  A.sheetSetRefreshFields = () => refreshFields();
  const pad = (n, w) => String(n).padStart(w || 2, '0');
  const sheetOf = ss => { if(!ss) return null; const ln = curLayoutName(), dn = docName(); return ss.sheets.find(s => s.layout === ln && (s.file === dn || !s.file)) || null; };
  A.sheetCurrent = () => sheetOf(cur());
  const PROPS = { set: 'Tên tập bản vẽ', num: 'Số tờ', title: 'Tên tờ', count: 'Tổng số tờ', proj: 'Tên dự án', projNo: 'Số dự án', client: 'Chủ đầu tư', desc: 'Mô tả tập', file: 'Tệp của tờ' };
  function ssValue(p, lay){ const ss = cur(); if(!ss) return '----'; const sh = lay ? (ss.sheets.find(s => s.layout === lay && (s.file === docName() || !s.file)) || null) : sheetOf(ss);
    switch(p){ case 'set': return ss.name; case 'count': return String(ss.sheets.length); case 'desc': return ss.desc || ''; case 'proj': case 'projNo': case 'client': return (ss.props || {})[p] || '';
      case 'num': return sh ? sh.num : '--'; case 'title': return sh ? sh.title : '--'; case 'file': return sh ? (sh.file || docName()) : ''; default: return (ss.props || {})[p] || ''; } }
  // trường "tập bản vẽ" trong FIELD / chữ: { k: 'ss', p: 'num' | 'title' | … }
  if(A.fieldValue){ const _fv = A.fieldValue; A.fieldValue = function(f){ if(f && f.k === 'ss'){ const v = ssValue(f.p, f.lay); return f.cs === 'up' ? v.toUpperCase() : v; } return _fv.apply(this, arguments); }; }
  // chuyển layout: cập nhật trường số tờ / tên tờ
  if(typeof window.switchLayout === 'function'){ const _sw = window.switchLayout; window.switchLayout = function(){ const r = _sw.apply(this, arguments); setTimeout(() => { try{ if(cur()) refreshFields(); }catch(_){} refreshPal(); }, 50); return r; }; }

  /* ===================== NEWSHEETSET ===================== */
  function newSheetSet(){ const L = layouts(); const d = A.dialog({ title: 'Create Sheet Set', html: '<div class="acw" style="min-width:400px"><div class="acw-row"><label>Tên tập bản vẽ</label><input id="nsN" value="' + esc(docName().replace(/\.[^.]+$/, '')) + '" style="width:220px"></div><div class="acw-row"><label>Mô tả</label><input id="nsD" style="width:220px"></div>' +
      '<fieldset class="acw-grp"><legend>Thông tin dự án</legend><div class="acw-row"><label>Tên dự án</label><input id="nsP" style="width:200px"></div><div class="acw-row"><label>Số dự án</label><input id="nsPN" style="width:120px"></div><div class="acw-row"><label>Chủ đầu tư</label><input id="nsC" style="width:200px"></div></fieldset>' +
      '<fieldset class="acw-grp"><legend>Tờ bản vẽ</legend><label style="display:block"><input id="nsL" type="checkbox"' + (L.length ? ' checked' : ' disabled') + '> Lấy từ ' + L.length + ' layout của "' + esc(docName()) + '"</label><div class="acw-row"><label>Số tờ bắt đầu</label><input id="nsS" type="number" value="1" style="width:70px"> <label>tiền tố</label><input id="nsPre" placeholder="vd KT-" style="width:80px"></div></fieldset></div>',
      ok: root => { const q = s => root.querySelector(s); const name = q('#nsN').value.trim().replace(/[<>\/\\":;?*|=`]/g, '_'); if(!name){ say('Cần đặt tên tập bản vẽ.'); return false; }
        if(ALL()[name] && !confirm('Đã có tập "' + name + '". Ghi đè?')) return false;
        const st = +q('#nsS').value || 1, pre = q('#nsPre').value; const sheets = q('#nsL').checked ? L.map((l, i) => ({ num: pre + pad(st + i), title: l.name, file: docName(), layout: l.name })) : [];
        const ss = { name, desc: q('#nsD').value, props: { proj: q('#nsP').value, projNo: q('#nsPN').value, client: q('#nsC').value }, sheets, created: Date.now() };
        save(ss); log('NEWSHEETSET: "' + name + '" — ' + sheets.length + ' tờ.'); openPal(); } }); noKey(d); }
  plain(['NEWSHEETSET'], 'Tạo tập bản vẽ (Sheet Set): thông tin dự án, các tờ lấy từ layout', newSheetSet);

  /* ===================== OPENSHEETSET ===================== */
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
  async function openFile(f){ if(!f) return; if(/\.dst$/i.test(f.name)){ say('Tệp .dst là định dạng mã hoá riêng của AutoCAD — DVDCAD chưa đọc được. Dùng NEWSHEETSET tạo lại tập từ các layout (hoặc tệp .dvdsst).'); return; }
    let ss; try{ ss = JSON.parse(await f.text()); }catch(_){ say('Tệp không hợp lệ.'); return; } if(!ss || !ss.name || !Array.isArray(ss.sheets)){ say('Không phải tệp tập bản vẽ .dvdsst.'); return; }
    save(ss); log('OPENSHEETSET: "' + ss.name + '" — ' + ss.sheets.length + ' tờ.'); openPal(); }
  A.sheetSetOpenFile = openFile;
  plain(['OPENSHEETSET'], 'Mở tập bản vẽ đã lưu hoặc tệp .dvdsst', () => { const all = Object.keys(ALL());
    const d = A.dialog({ title: 'Open Sheet Set', html: '<div class="acw" style="min-width:340px">' + (all.length ? '<div class="acw-list" style="max-height:260px;overflow:auto;padding:4px">' + all.map(n => '<label style="display:block"><input type="radio" name="osN" value="' + esc(n) + '"' + (n === curName() ? ' checked' : '') + '> ' + esc(n) + ' <span style="opacity:.6">(' + ALL()[n].sheets.length + ' tờ)</span></label>').join('') + '</div>' : '<i>Chưa có tập bản vẽ nào.</i>') + '<div class="acw-row" style="margin-top:6px"><button type="button" class="acw-btn" id="osF">Mở tệp .dvdsst…</button></div></div>',
      ok: root => { const v = root.querySelector('input[name="osN"]:checked'); if(v){ try{ localStorage.setItem('dvd:ssCur', v.value); }catch(_){} refreshFields(); openPal(); } } });
    d.root.querySelector('#osF').onclick = async () => { const f = await pickFile('.dvdsst,.json,.dst'); if(f){ try{ d.close(); }catch(_){} openFile(f); } }; });

  /* ===================== Sheet Set Manager ===================== */
  let PAL = null;
  function refreshPal(){ if(PAL) render(); }
  function render(){ const ss = cur(), cs = sheetOf(ss); const P = PAL;
    P.innerHTML = '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid #444"><b style="flex:1">Sheet Set Manager</b><button type="button" class="acw-btn" data-a="close" title="Đóng">✕</button></div>' +
      (ss ? '<div style="padding:6px 8px"><div style="font-weight:600">' + esc(ss.name) + '</div><div style="opacity:.7;font-size:12px">' + esc((ss.props || {}).proj || '') + (ss.props && ss.props.projNo ? ' · ' + esc(ss.props.projNo) : '') + '</div></div>' +
        '<div style="flex:1;overflow:auto;padding:0 4px">' + (ss.sheets.length ? ss.sheets.map((s, i) => '<div data-i="' + i + '" style="display:flex;align-items:center;gap:4px;padding:3px 4px;border-radius:4px;' + (s === cs ? 'background:rgba(61,155,255,.25)' : '') + '"><span style="min-width:48px;font-variant-numeric:tabular-nums">' + esc(s.num) + '</span><span style="flex:1;cursor:pointer" data-a="open" title="' + esc((s.file || '') + ' › ' + (s.layout || '')) + '">' + esc(s.title) + '</span><button type="button" class="acw-btn" data-a="edit" title="Sửa">✎</button><button type="button" class="acw-btn" data-a="up" title="Lên">↑</button><button type="button" class="acw-btn" data-a="del" title="Xoá">✕</button></div>').join('') : '<i style="padding:8px;display:block">Chưa có tờ — thêm layout hiện tại.</i>') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-top:1px solid #444"><button type="button" class="acw-btn" data-a="add">＋ Layout hiện tại</button><button type="button" class="acw-btn" data-a="addall">＋ Mọi layout</button><button type="button" class="acw-btn" data-a="renum">Đánh số lại</button><button type="button" class="acw-btn" data-a="list">Bảng danh mục</button><button type="button" class="acw-btn" data-a="field">Chèn trường</button><button type="button" class="acw-btn" data-a="pub">Xuất bản</button><button type="button" class="acw-btn" data-a="props">Thuộc tính</button><button type="button" class="acw-btn" data-a="save">Lưu .dvdsst</button><button type="button" class="acw-btn" data-a="openset">Mở tập…</button></div>'
      : '<div style="padding:10px"><p>Chưa mở tập bản vẽ.</p><button type="button" class="acw-btn" data-a="new">Tạo tập mới…</button> <button type="button" class="acw-btn" data-a="openset">Mở tập…</button></div>'); }
  function openPal(){ if(!PAL){ PAL = document.createElement('div'); PAL.id = 'dvdSSM'; PAL.className = 'acw'; PAL.style.cssText = 'position:fixed;right:8px;top:180px;bottom:80px;width:320px;z-index:55;background:var(--panel,#262b34);border:1px solid #444;border-radius:6px;display:flex;flex-direction:column;font-size:13px'; document.body.appendChild(PAL); PAL.addEventListener('click', onPal); } render(); }
  A.sheetSetPalette = openPal;
  function closePal(){ if(PAL){ PAL.remove(); PAL = null; } }
  function editSheet(ss, i){ const s = ss.sheets[i]; const d = A.dialog({ title: 'Sheet Properties', html: '<div class="acw" style="min-width:340px"><div class="acw-row"><label>Số tờ</label><input id="spN" value="' + esc(s.num) + '" style="width:100px"></div><div class="acw-row"><label>Tên tờ</label><input id="spT" value="' + esc(s.title) + '" style="width:220px"></div><div class="acw-row"><label>Mô tả</label><input id="spD" value="' + esc(s.desc || '') + '" style="width:220px"></div><div class="acw-note">Tệp: ' + esc(s.file || '') + ' · Layout: ' + esc(s.layout || '') + '</div></div>',
    ok: root => { s.num = root.querySelector('#spN').value.trim(); s.title = root.querySelector('#spT').value.trim(); s.desc = root.querySelector('#spD').value; save(ss); log('Đã sửa tờ ' + s.num + ' — ' + s.title + '.'); } }); noKey(d); }
  function propsDialog(ss){ const p = ss.props || (ss.props = {}); const d = A.dialog({ title: 'Sheet Set Properties — ' + ss.name, html: '<div class="acw" style="min-width:360px"><div class="acw-row"><label>Mô tả</label><input id="ppD" value="' + esc(ss.desc || '') + '" style="width:220px"></div><div class="acw-row"><label>Tên dự án</label><input id="ppP" value="' + esc(p.proj || '') + '" style="width:220px"></div><div class="acw-row"><label>Số dự án</label><input id="ppN" value="' + esc(p.projNo || '') + '" style="width:120px"></div><div class="acw-row"><label>Chủ đầu tư</label><input id="ppC" value="' + esc(p.client || '') + '" style="width:220px"></div></div>',
    ok: root => { ss.desc = root.querySelector('#ppD').value; p.proj = root.querySelector('#ppP').value; p.projNo = root.querySelector('#ppN').value; p.client = root.querySelector('#ppC').value; save(ss); log('Đã lưu thuộc tính tập bản vẽ (trường đã cập nhật).'); } }); noKey(d); }
  function onPal(ev){ const b = ev.target.closest('[data-a]'); if(!b) return; const a = b.dataset.a, ss = cur(), row = b.closest('[data-i]'), i = row ? +row.dataset.i : -1;
    if(a === 'close') return closePal(); if(a === 'new') return newSheetSet(); if(a === 'openset') return DVDCmd.run('OPENSHEETSET'); if(!ss) return;
    if(a === 'open'){ const s = ss.sheets[i]; if(s.file && s.file !== docName()){ say('Tờ nằm trong bản vẽ "' + s.file + '" — mở bản vẽ đó rồi bấm lại.'); return; } const L = layouts().find(l => l.name === s.layout); if(!L){ say('Bản vẽ không có layout "' + s.layout + '".'); return; } try{ switchLayout(L.i); }catch(err){ console.warn(err); } log('Mở tờ ' + s.num + ' — ' + s.title + '.'); return; }
    if(a === 'edit') return editSheet(ss, i);
    if(a === 'del'){ const s = ss.sheets[i]; if(!confirm('Bỏ tờ "' + s.num + ' — ' + s.title + '" khỏi tập? (layout vẫn còn trong bản vẽ)')) return; ss.sheets.splice(i, 1); save(ss); return; }
    if(a === 'up'){ if(i > 0){ const t = ss.sheets[i - 1]; ss.sheets[i - 1] = ss.sheets[i]; ss.sheets[i] = t; save(ss); } return; }
    if(a === 'add' || a === 'addall'){ const ls = a === 'add' ? [curLayoutName()].filter(Boolean) : layouts().map(l => l.name); if(!ls.length){ say('Đang ở Model — chuyển sang một layout rồi thêm.'); return; } let n = 0;
      for(const ln of ls){ if(ss.sheets.some(s => s.layout === ln && s.file === docName())) continue; const num = pad(ss.sheets.length + 1); ss.sheets.push({ num, title: ln, file: docName(), layout: ln }); n++; } save(ss); log('Đã thêm ' + n + ' tờ.'); return; }
    if(a === 'renum'){ const pre = (prompt('Tiền tố số tờ (vd KT-):', (ss.sheets[0] && /^(\D*)/.exec(ss.sheets[0].num)[1]) || '') || ''); ss.sheets.forEach((s, k) => s.num = pre + pad(k + 1)); save(ss); log('Đã đánh số lại ' + ss.sheets.length + ' tờ.'); return; }
    if(a === 'props') return propsDialog(ss);
    if(a === 'save'){ const b2 = new Blob([JSON.stringify(ss, null, 1)], { type: 'application/json' }); try{ shareOrDownload(b2, ss.name + '.dvdsst', 'application/json'); }catch(_){} log('Đã lưu ' + ss.name + '.dvdsst.'); return; }
    if(a === 'pub'){ DVDCmd.run('PUBLISH'); return; }
    if(a === 'list'){ A.run('SHEETLISTTABLE', async () => { const p = await A.getPoint('Điểm chèn bảng danh mục'); if(!p.pt) return; const th = A.dimTxt ? A.dimTxt() : 2.5;
      const data = [['DANH MỤC BẢN VẼ — ' + ss.name], ['Số tờ', 'Tên tờ']].concat(ss.sheets.map(s => [s.num, s.title]));
      const ents = A.makeTable({ rows: data.length, cols: 2, th, cw: th * 18, data }, p.pt); A.commit({ add: ents }, 'Bảng danh mục bản vẽ: ' + ss.sheets.length + ' tờ'); }); return; }
    if(a === 'field'){ A.run('SHEETSETFIELD', async () => { const k = await A.getKw('Trường [Số tờ / Tên tờ / Tổng số tờ / Tên tập / Tên dự án / Số dự án / Chủ đầu tư]', { kw: [{ k: 'N', t: 'Số tờ' }, { k: 'T', t: 'Tên tờ' }, { k: 'C', t: 'Tổng số tờ' }, { k: 'S', t: 'Tên tập' }, { k: 'P', t: 'Tên dự án' }, { k: 'PN', t: 'Số dự án' }, { k: 'CL', t: 'Chủ đầu tư' }], def: 'Số tờ' });
      const p = { N: 'num', T: 'title', C: 'count', S: 'set', P: 'proj', PN: 'projNo', CL: 'client' }[k.kw || 'N']; const pt = await A.getPoint('Điểm chèn'); if(!pt.pt) return; const hr = await A.getDist('Cao chữ', { base: pt.pt, def: A.dimTxt ? A.dimTxt() : 2.5 }); const h = hr.num > 0 ? hr.num : (A.dimTxt ? A.dimTxt() : 2.5);
      const f = { k: 'ss', p }; const ly = curLayoutName(); if(ly && (p === 'num' || p === 'title' || p === 'file')) f.lay = ly; const e = A.newProps({ type: 'TEXT', x: pt.pt.x, y: pt.pt.y, h, rot: 0, text: ssValue(p, f.lay), fld: f }); A.commit({ add: [e] }, 'Trường tập bản vẽ: ' + PROPS[p]); }); return; } }
  plain(['SHEETSET', 'SSM'], 'Sheet Set Manager: các tờ của tập bản vẽ, mở tờ, số / tên tờ, bảng danh mục, trường, xuất bản', openPal);
  plain(['SHEETSETHIDE'], 'Đóng Sheet Set Manager', closePal);

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
