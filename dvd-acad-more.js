/* DVDCAD — bổ sung kiểu AutoCAD (v4b)
   Lệnh: LINETYPE LTSCALE CELTSCALE LWEIGHT PICKSTYLE QSELECT MLEADER QLEADER ALIGN
   Giao diện: chú thích (tooltip) ribbon kiểu AutoCAD, gợi ý thuộc tính khi rê chuột lên đối tượng */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._more || !window.DVDCmd) return; A._more = true;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => A.log(m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const deep = e => JSON.parse(JSON.stringify(e));
  const copyOf = e => { const w = deep(e); delete w.userAdded; return w; };
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const hasDoc = () => { try{ return A.hasDoc ? A.hasDoc() : entities.length > 0; }catch(_){ return false; } };
  const TYPE_VN = { LINE: 'Đường thẳng', CIRCLE: 'Đường tròn', ARC: 'Cung tròn', POLYLINE: 'Đa tuyến', TEXT: 'Chữ', ELLIPSE: 'Elip', SOLID: 'Vùng tô', HATCH: 'Hatch', POINT: 'Điểm', XLINE: 'Đường dựng' };
  const NOLT = { TEXT: 1, HATCH: 1, SOLID: 1, POINT: 1 };

  /* ===================== KIỂU NÉT / BỀ RỘNG ===================== */
  plain(['LINETYPE', 'LT', 'LTYPE', 'DDLTYPE'], 'Quản lý kiểu nét (nét đứt, nét tâm…), LTSCALE', () => { if(A.openLinetypes) A.openLinetypes(); });
  plain(['LWEIGHT', 'LW', 'LINEWEIGHT'], 'Cài đặt bề rộng nét (hiện LWT, bề rộng hiện hành)', () => { if(A.openLweight) A.openLweight(); });
  cmd(['LTSCALE', 'LTS'], 'Tỉ lệ kiểu nét toàn cục', async () => {
    const r = await A.getNum('Nhập hệ số tỉ lệ kiểu nét mới', { def: +(+LTSCALE).toPrecision(6) }); if(r.num == null) return;
    if(!(r.num > 0)){ log('Tỉ lệ phải > 0.'); return; } A.setLTScale(r.num); log('LTSCALE = ' + r.num + ' — đang dựng lại hình.');
  });
  cmd(['CELTSCALE'], 'Tỉ lệ kiểu nét cho đối tượng mới', async () => {
    const r = await A.getNum('Nhập giá trị mới cho CELTSCALE', { def: A.LS.celts || 1 }); if(r.num == null) return;
    if(!(r.num > 0)){ log('Tỉ lệ phải > 0.'); return; } A.setCELTS(r.num); log('CELTSCALE = ' + r.num);
  });
  plain(['PICKSTYLE'], 'Bật/tắt chọn cả nhóm/khối (Ctrl+Shift+A)', () => A.toggle('pickGroup'));

  /* ===================== QSELECT (chọn nhanh theo thuộc tính) ===================== */
  const PROPS = [
    ['layer', 'Lớp', e => e.layer || '0'],
    ['color', 'Màu', e => e.bl ? 'ByLayer' : String(e.col || '').toLowerCase()],
    ['lt', 'Kiểu nét', e => NOLT[e.type] ? '' : (e.lt || 'ByLayer')],
    ['lw', 'Bề rộng nét (mm)', e => e.lw > 0 ? (e.lw / 100).toFixed(2) : 'ByLayer'],
    ['blk', 'Thuộc khối', e => e.blk ? String(e.blk).replace(/^\*/, '') : ''],
    ['text', 'Nội dung chữ', e => e.type === 'TEXT' ? String(e.text || '') : ''],
    ['h', 'Cao chữ', e => e.type === 'TEXT' ? +(e.h || 0) : NaN],
    ['len', 'Chiều dài', e => { try{ const c = A.G.curveOf(e); return c ? (c.kind === 'arc' ? c.u1 * e.r : c.len) : NaN; }catch(_){ return NaN; } }],
    ['r', 'Bán kính', e => (e.type === 'CIRCLE' || e.type === 'ARC') ? e.r : NaN]
  ];
  function qselect(){
    if(!hasDoc()){ say('Mở bản vẽ trước.'); return; }
    const src = () => { const pre = selEnts.size ? [...selEnts] : null; return pre; };
    const types = {}; for(const e of modelEntities) types[e.type] = (types[e.type] || 0) + 1;
    const opt = (v, t, s) => '<option value="' + esc(v) + '"' + (s ? ' selected' : '') + '>' + esc(t) + '</option>';
    const html = '<label class="dvd-frow"><span>Áp dụng cho</span><span class="v"><select id="qsScope">' + opt('all', 'Toàn bản vẽ', !selEnts.size) + (selEnts.size ? opt('sel', 'Tập đang chọn (' + selEnts.size + ')', true) : '') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Loại đối tượng</span><span class="v"><select id="qsType">' + opt('*', 'Mọi loại (' + modelEntities.length + ')') + Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => opt(t, (TYPE_VN[t] || t) + ' (' + n + ')')).join('') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Thuộc tính</span><span class="v"><select id="qsProp">' + PROPS.map(p => opt(p[0], p[1])).join('') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Toán tử</span><span class="v"><select id="qsOp">' + opt('=', '= Bằng') + opt('!=', '≠ Khác') + opt('>', '> Lớn hơn') + opt('<', '< Nhỏ hơn') + opt('~', 'Chứa') + opt('*', 'Chọn tất cả') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Giá trị</span><span class="v"><input id="qsVal" list="qsList" style="width:190px"><datalist id="qsList"></datalist></span></label>' +
      '<label class="dvd-frow"><span>Cách áp dụng</span><span class="v"><select id="qsHow">' + opt('in', 'Chọn các đối tượng khớp') + opt('out', 'Chọn các đối tượng KHÔNG khớp') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Gộp vào tập đang chọn</span><span class="v"><input type="checkbox" id="qsAppend"></span></label>';
    A.dialog({ title: 'Chọn nhanh (Quick Select)', wide: true, html, okText: 'Chọn',
      onOpen: root => {
        const fill = () => { const pk = root.querySelector('#qsProp').value, ty = root.querySelector('#qsType').value; const P = PROPS.find(p => p[0] === pk); const vals = new Map();
          const base = root.querySelector('#qsScope').value === 'sel' ? [...selEnts] : modelEntities;
          for(const e of base){ if(ty !== '*' && e.type !== ty) continue; let v = P[2](e); if(v === '' || (typeof v === 'number' && !isFinite(v))) continue; if(typeof v === 'number') v = +v.toPrecision(6); vals.set(String(v), (vals.get(String(v)) || 0) + 1); if(vals.size > 400) break; }
          const arr = [...vals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 200);
          root.querySelector('#qsList').innerHTML = arr.map(([v, n]) => '<option value="' + esc(v) + '">' + n + ' đối tượng</option>').join('');
          const inp = root.querySelector('#qsVal'); if(!inp.value && arr.length) inp.value = arr[0][0]; };
        ['#qsProp', '#qsType', '#qsScope'].forEach(id => root.querySelector(id).addEventListener('change', () => { root.querySelector('#qsVal').value = ''; fill(); }));
        fill(); },
      ok: root => {
        const g = id => root.querySelector(id).value; const P = PROPS.find(p => p[0] === g('#qsProp')); const ty = g('#qsType'), op = g('#qsOp'), how = g('#qsHow'); const raw = g('#qsVal').trim(); const vn = parseFloat(raw.replace(',', '.'));
        const base = (g('#qsScope') === 'sel' ? [...selEnts] : A.selectable ? A.selectable() : modelEntities).filter(e => !A.isLocked(e));
        const test = e => { if(ty !== '*' && e.type !== ty) return false; if(op === '*') return true; const v = P[2](e);
          if(typeof v === 'number'){ if(!isFinite(v)) return false; if(op === '=') return Math.abs(v - vn) <= Math.max(1e-6, Math.abs(vn) * 1e-6); if(op === '!=') return Math.abs(v - vn) > Math.max(1e-6, Math.abs(vn) * 1e-6); if(op === '>') return v > vn; if(op === '<') return v < vn; return String(v).includes(raw); }
          const a = String(v).toLowerCase(), b = raw.toLowerCase(); if(op === '=') return a === b; if(op === '!=') return a !== b; if(op === '~') return a.includes(b); const x = parseFloat(a); if(!isFinite(x) || !isFinite(vn)) return false; return op === '>' ? x > vn : x < vn; };
        const hit = base.filter(e => (ty === '*' || e.type === ty) ? (how === 'in' ? test(e) : !test(e)) : false);
        if(!root.querySelector('#qsAppend').checked) selEnts.clear();
        for(const e of hit) selEnts.add(e);
        try{ refreshPanSel(); }catch(_){} A.paint(); log('Chọn nhanh: ' + hit.length + ' đối tượng' + (selEnts.size !== hit.length ? ' (tổng ' + selEnts.size + ')' : ''));
        say('Đã chọn ' + selEnts.size + ' đối tượng');
      } });
  }
  plain(['QSELECT', 'QSE'], 'Chọn nhanh theo loại & thuộc tính (lớp, màu, kiểu nét, chữ…)', () => { if(A.busy()) A.cancel(true); qselect(); });

  /* ===================== MLEADER / QLEADER (ghi chú có mũi tên) ===================== */
  function txtH(){ try{ const d = A.DS; if(d && d.txt > 0) return d.txt; }catch(_){} try{ return +defaultTextH().toPrecision(3); }catch(_){ return 2.5; } }
  function leaderEnts(pts, text, h){
    const out = []; const s = h * ((A.DS && A.DS.asz) || 1);
    const a = pts[0], b = pts[1]; const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    const bx = a.x + ux * s, by = a.y + uy * s, nx = -uy * s / 6, ny = ux * s / 6;
    out.push({ type: 'SOLID', pts: [{ x: a.x, y: a.y }, { x: bx + nx, y: by + ny }, { x: bx - nx, y: by - ny }, { x: bx - nx, y: by - ny }] });
    out.push({ type: 'POLYLINE', vertices: [{ x: bx, y: by }].concat(pts.slice(1).map(p => ({ x: p.x, y: p.y }))), closed: false });
    const last = pts[pts.length - 1], prev = pts[pts.length - 2]; const dir = last.x >= prev.x ? 1 : -1; const land = h * 1.2;
    const lx = last.x + dir * land; out.push({ type: 'LINE', x1: last.x, y1: last.y, x2: lx, y2: last.y });
    if(text) out.push({ type: 'TEXT', x: lx + dir * h * 0.4, y: last.y, h, rot: 0, text, ha: dir > 0 ? 'left' : 'right', va: 'middle', mt: true });
    return out;
  }
  async function leaderCmd(multi){
    const h = txtH();
    const r1 = await A.getPoint('Chỉ định vị trí đầu mũi tên'); if(!r1.pt) return;
    const pts = [r1.pt];
    for(;;){
      const r = await A.getPoint(pts.length === 1 ? 'Chỉ định vị trí đường dẫn (gờ chữ)' : 'Chỉ định điểm tiếp theo (Enter = viết chữ)', { base: pts[pts.length - 1], preview: (g, p) => g.ents(leaderEnts(pts.concat([p]), '', h)) });
      if(r.none){ if(pts.length >= 2) break; return; }
      if(!r.pt) return; pts.push(r.pt);
      if(!multi && pts.length >= 2) break;
      if(pts.length >= 6) break;
    }
    let text = null;
    try{ text = await askText({ title: 'Nội dung ghi chú', value: '', multiline: true }); }catch(_){ text = prompt('Nội dung ghi chú', ''); }
    if(text == null) return;
    const ents = leaderEnts(pts, String(text).replace(/\r/g, ''), h); const gid = A.newGroupId('L');
    for(const e of ents){ A.newProps(e); delete e.lt; e.grp = gid; e.blk = '*LEADER'; }
    A.commit({ add: ents }, 'Đã thêm ghi chú dẫn');
  }
  cmd(['MLEADER', 'MLD', 'LEADER', 'LEAD'], 'Ghi chú có mũi tên (multileader)', () => leaderCmd(false));
  cmd(['QLEADER', 'LE'], 'Ghi chú dẫn nhiều đoạn', () => leaderCmd(true));

  /* ===================== ALIGN ===================== */
  cmd(['ALIGN', 'AL'], 'Căn chỉnh: dời + xoay (+ tỉ lệ) theo 2 cặp điểm', async () => {
    const s = await A.getSel('Chọn đối tượng cần căn chỉnh'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const s1 = await A.getPoint('Chỉ định điểm nguồn thứ nhất'); if(!s1.pt) return;
    const d1 = await A.getPoint('Chỉ định điểm đích thứ nhất', { base: s1.pt, preview: (g, p) => g.xform(sel, w => translateEnt(w, p.x - s1.pt.x, p.y - s1.pt.y)) }); if(!d1.pt) return;
    const s2 = await A.getPoint('Chỉ định điểm nguồn thứ hai (Enter = chỉ dời)');
    const dx = d1.pt.x - s1.pt.x, dy = d1.pt.y - s1.pt.y;
    if(!s2.pt){ A.commit({ rep: sel.map(e => { const w = copyOf(e); translateEnt(w, dx, dy); return [e, w]; }) }, 'Đã dời'); return; }
    const d2 = await A.getPoint('Chỉ định điểm đích thứ hai', { base: d1.pt }); if(!d2.pt) return;
    const a0 = Math.atan2(s2.pt.y - s1.pt.y, s2.pt.x - s1.pt.x), a1 = Math.atan2(d2.pt.y - d1.pt.y, d2.pt.x - d1.pt.x);
    const L0 = Math.hypot(s2.pt.x - s1.pt.x, s2.pt.y - s1.pt.y), L1 = Math.hypot(d2.pt.x - d1.pt.x, d2.pt.y - d1.pt.y);
    let scale = false;
    if(L0 > 1e-12 && Math.abs(L1 / L0 - 1) > 1e-9){ const k = await A.getKw('Tỉ lệ đối tượng theo điểm căn chỉnh?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'N' }); scale = k.kw === 'Y'; }
    const rep = sel.map(e => { const w = copyOf(e); translateEnt(w, dx, dy); rotateEnt(w, (a1 - a0) * R2D, d1.pt); if(scale && L0 > 1e-12) scaleEnt(w, L1 / L0, d1.pt); return [e, w]; });
    A.commit({ rep }, 'Đã căn chỉnh ' + sel.length + ' đối tượng');
  });

  /* ===================== TOOLTIP RIBBON KIỂU AUTOCAD ===================== */
  const CSS = `
  .ac-tip{position:fixed;z-index:4000;max-width:300px;background:#f3f5f8;color:#1b2027;border:1px solid #9aa4b2;border-radius:3px;box-shadow:0 6px 20px rgba(0,0,0,.45);padding:8px 10px 6px;font:12px system-ui,sans-serif;pointer-events:none}
  .ac-tip b{display:block;font-size:13px;margin-bottom:3px}
  .ac-tip .d{color:#333b46;line-height:1.35}
  .ac-tip .c{margin-top:6px;padding-top:5px;border-top:1px solid #c9d0da;color:#4e5866;font-size:11px;display:flex;justify-content:space-between;gap:12px}
  .ac-tip .c code{font:600 11px ui-monospace,Menlo,monospace;color:#1b2027}
  .ac-roll{position:fixed;z-index:3500;background:rgba(36,41,50,.96);color:#e6eaf0;border:1px solid #4a5363;border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.45);padding:6px 9px;font:12px system-ui,sans-serif;pointer-events:none;min-width:170px}
  .ac-roll b{display:block;color:#fff;margin-bottom:3px;font-size:12.5px}
  .ac-roll div{display:flex;justify-content:space-between;gap:14px;line-height:1.5}
  .ac-roll span:first-child{color:#9aa4b2}
  .ac-roll .sw{display:inline-block;width:10px;height:10px;border:1px solid rgba(255,255,255,.5);margin-right:5px;vertical-align:-1px}
  `;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  let tipEl = null, tipT = 0, tipFor = null;
  function hideTip(){ clearTimeout(tipT); tipFor = null; if(tipEl){ tipEl.remove(); tipEl = null; } }
  function cmdInfo(c){ const k = String(c || '').split('|')[0].toUpperCase(); return DVDCmd.commands.find(x => x.k.includes(k)) || null; }
  document.addEventListener('mouseover', e => {
    if(!document.documentElement.classList.contains('acad')) return;
    const b = e.target.closest && e.target.closest('#acadTop [data-c], #acadTop [data-q], #acadStatus button[data-k], #acadStatus button[data-x]');
    if(!b || b.dataset.tl != null){ if(tipFor) hideTip(); return; }
    if(b === tipFor) return; hideTip(); tipFor = b;
    if(b.title){ b.dataset.tip = b.title; b.removeAttribute('title'); }
    tipT = setTimeout(() => {
      if(tipFor !== b || !document.body.contains(b)) return;
      const raw = b.dataset.tip || ''; const c = b.dataset.c || ''; const info = c ? cmdInfo(c) : null;
      const name = raw.replace(/\s*\([A-Z0-9|]+\)\s*$/, '') || (info ? info.k[0] : '');
      let h = '<b>' + esc(name) + '</b>';
      if(info && info.d && info.d !== name) h += '<div class="d">' + esc(info.d) + '</div>';
      if(info) h += '<div class="c"><span>Lệnh: <code>' + esc(info.k[0]) + '</code>' + (info.k.length > 1 ? ' · tắt: <code>' + esc(info.k.slice(1, 3).join(', ')) + '</code>' : '') + '</span><span>F1 = trợ giúp</span></div>';
      tipEl = document.createElement('div'); tipEl.className = 'ac-tip'; tipEl.innerHTML = h; document.body.appendChild(tipEl);
      const r = b.getBoundingClientRect(), tr = tipEl.getBoundingClientRect();
      let x = r.left, y = r.bottom + 6; if(b.closest('#acadStatus')) y = r.top - tr.height - 6;
      tipEl.style.left = Math.max(4, Math.min(x, innerWidth - tr.width - 6)) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
    }, 650);
  }, true);
  document.addEventListener('pointerdown', hideTip, true);
  window.addEventListener('blur', hideTip);

  /* ===================== GỢI Ý THUỘC TÍNH KHI RÊ CHUỘT (rollover tooltip) ===================== */
  let rollEl = null, rollT = 0, rollFor = null;
  function hideRoll(){ clearTimeout(rollT); rollFor = null; if(rollEl){ rollEl.remove(); rollEl = null; } }
  A.onHover = (e, m) => {
    if(!e || !m || A.SET.rollover === false || !document.documentElement.classList.contains('acad')){ hideRoll(); return; }
    if(e === rollFor){ if(rollEl){ const r = cv.getBoundingClientRect(); rollEl.style.left = Math.min(r.left + m.x + 16, innerWidth - rollEl.offsetWidth - 6) + 'px'; rollEl.style.top = Math.min(r.top + m.y + 18, innerHeight - rollEl.offsetHeight - 6) + 'px'; } return; }
    hideRoll(); rollFor = e;
    rollT = setTimeout(() => {
      if(rollFor !== e) return;
      const ly = e.layer || '0', col = e.col || '#ffffff';
      let ttl = TYPE_VN[e.type] || e.type;
      if(e.blk){ const b = String(e.blk); ttl = b.startsWith('*DIM') ? 'Kích thước' : b === '*LEADER' ? 'Ghi chú dẫn' : 'Khối: ' + b.replace(/^\*/, ''); }
      const row = (k, v) => '<div><span>' + esc(k) + '</span><span>' + v + '</span></div>';
      let h = '<b>' + esc(ttl) + '</b>' + row('Màu', '<i class="sw" style="background:' + esc(col) + '"></i>' + (e.bl ? 'ByLayer' : esc(col))) + row('Lớp', esc(ly));
      if(!NOLT[e.type]) h += row('Kiểu nét', esc(e.lt ? e.lt : 'ByLayer'));
      if(e.type === 'TEXT' && !e.blk) h += row('Cao chữ', esc(A.fmt ? A.fmt(e.h || 0) : e.h));
      if(e.dimv != null || (e.dimd && e.type === 'TEXT')) h += row('Giá trị', esc(e.text || ''));
      rollEl = document.createElement('div'); rollEl.className = 'ac-roll'; rollEl.innerHTML = h; document.body.appendChild(rollEl);
      const r = cv.getBoundingClientRect(); rollEl.style.left = Math.min(r.left + m.x + 16, innerWidth - rollEl.offsetWidth - 6) + 'px'; rollEl.style.top = Math.min(r.top + m.y + 18, innerHeight - rollEl.offsetHeight - 6) + 'px';
    }, 900);
  };
  cv.addEventListener('pointerdown', hideRoll, true);
  window.addEventListener('wheel', hideRoll, { passive: true, capture: true });

  /* ===================== PLOT (in theo khổ giấy & tỉ lệ như AutoCAD) ===================== */
  const PAPERS = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };
  const SCALES = [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000, 2000, 5000];
  const PS = Object.assign({ paper: 'A3', land: true, area: 'extents', fit: true, scale: 100, center: true, style: 'mono', lw: true, margin: 5, win: null, fmt: 'pdf' }, (() => { try{ return JSON.parse(localStorage.getItem('dvd:plot') || '{}'); }catch(_){ return {}; } })());
  PS.win = null;
  const psSave = () => { try{ const o = Object.assign({}, PS); delete o.win; localStorage.setItem('dvd:plot', JSON.stringify(o)); }catch(_){} };
  const mmPerUnit = () => { try{ return unitToMM() || 1; }catch(_){ return 1; } };   // không rõ đơn vị: coi là mm
  const LYT = () => { try{ const U = A.curUserLayout && A.curUserLayout(); return U ? U.def : null; }catch(_){ return null; } };   // layout giấy do người dùng tạo
  function plotArea(){
    const D = LYT(); if(D) return { x0: 0, y0: 0, x1: D.size[0], y1: D.size[1] };
    if(PS.area === 'window' && PS.win) return PS.win;
    if(PS.area === 'display'){ const b = viewWorldAABB(); return { x0: b.minX, y0: b.minY, x1: b.maxX, y1: b.maxY }; }
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for(const e of entities){ if(A.isHiddenE(e)) continue; const bb = entBBox(e); if(!bb) continue; if(bb.x0 < a) a = bb.x0; if(bb.y0 < b) b = bb.y0; if(bb.x1 > c) c = bb.x1; if(bb.y1 > d) d = bb.y1; }
    if(!isFinite(a)){ const v = viewWorldAABB(); return { x0: v.minX, y0: v.minY, x1: v.maxX, y1: v.maxY }; }
    return { x0: a, y0: b, x1: c, y1: d };
  }
  function paperMM(){ const D = LYT(); if(D) return [D.size[0], D.size[1]]; const p = PAPERS[PS.paper] || PAPERS.A3; return PS.land ? [p[1], p[0]] : [p[0], p[1]]; }
  // tỉ lệ thực: mm giấy trên 1 đơn vị bản vẽ
  function plotK(area, pw, ph){
    if(LYT()) return 1;
    const aw = Math.max(1e-9, area.x1 - area.x0), ah = Math.max(1e-9, area.y1 - area.y0);
    if(PS.fit) return Math.min(pw / aw, ph / ah);
    return mmPerUnit() / (PS.scale || 1);
  }
  function plotRender(dpi, forPreview){
    const [Wmm, Hmm] = paperMM(); const mg = LYT() ? 0 : Math.max(0, +PS.margin || 0); const pw = Wmm - 2 * mg, ph = Hmm - 2 * mg;
    const area = plotArea(); const k = plotK(area, pw, ph);
    const pxPerMM = dpi / 25.4; let pxW = Math.round(Wmm * pxPerMM), pxH = Math.round(Hmm * pxPerMM);
    const MAX = forPreview ? 400000 : 30000000; let sc = 1; if(pxW * pxH > MAX){ sc = Math.sqrt(MAX / (pxW * pxH)); pxW = Math.round(pxW * sc); pxH = Math.round(pxH * sc); }
    const realPxPerMM = pxW / Wmm, CSS_PER_MM = 96 / 25.4, dpr = realPxPerMM / CSS_PER_MM;
    const out = document.createElement('canvas'); out.width = pxW; out.height = pxH; const octx = out.getContext('2d');
    const aw = area.x1 - area.x0, ah = area.y1 - area.y0;
    // vị trí vùng in trên giấy (mm, gốc trên-trái)
    let ox = mg, oy = mg; if(PS.center || PS.fit){ ox = (Wmm - aw * k) / 2; oy = (Hmm - ah * k) / 2; } else { oy = Hmm - mg - ah * k; }
    const sv = { ctx, rtw: _RTW, rth: _RTH, dpr: window.devicePixelRatio, plot: plotMode, lw: showLW, style: _plotStyle, cpm: _plotCssPerMM, v: { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY, rot: view.rot }, grid: window.drawGrid, sb: window.drawScaleBar };
    _exporting = true; ctx = octx; _RTW = Wmm * CSS_PER_MM; _RTH = Hmm * CSS_PER_MM; view.rot = 0; plotMode = true;
    _plotStyle = PS.style === 'color' ? '' : PS.style; showLW = !!PS.lw; _plotCssPerMM = PS.lw ? CSS_PER_MM : 0;
    window.drawGrid = () => {}; window.drawScaleBar = () => {};
    const _oh = OBJ_HIDE; if(LYT()){ const h = new Set(OBJ_HIDE || []); for(const e of entities) if(e.vpf) h.add(e); OBJ_HIDE = h; }   // khung nhìn & mép giấy: không in
    try{
      Object.defineProperty(window, 'devicePixelRatio', { value: dpr, configurable: true });
      view.scale = k * CSS_PER_MM; view.offsetX = ox * CSS_PER_MM - area.x0 * view.scale; view.offsetY = (oy + ah * k) * CSS_PER_MM + area.y0 * view.scale;
      bbDirty = true; buildBBoxCache(); draw();
      // cắt bỏ phần ngoài vùng in (như AutoCAD)
      octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillStyle = '#ffffff';
      const X0 = ox * realPxPerMM - 2, Y0 = oy * realPxPerMM - 2, X1 = (ox + aw * k) * realPxPerMM + 2, Y1 = (oy + ah * k) * realPxPerMM + 2;
      octx.fillRect(0, 0, pxW, Math.max(0, Y0)); octx.fillRect(0, Y1, pxW, pxH - Y1); octx.fillRect(0, 0, Math.max(0, X0), pxH); octx.fillRect(X1, 0, pxW - X1, pxH);
    } finally {
      OBJ_HIDE = _oh; ctx = sv.ctx; _RTW = sv.rtw; _RTH = sv.rth; _exporting = false; plotMode = sv.plot; showLW = sv.lw; _plotStyle = sv.style; _plotCssPerMM = sv.cpm;
      view.scale = sv.v.scale; view.offsetX = sv.v.offsetX; view.offsetY = sv.v.offsetY; view.rot = sv.v.rot; window.drawGrid = sv.grid; window.drawScaleBar = sv.sb;
      Object.defineProperty(window, 'devicePixelRatio', { value: sv.dpr, configurable: true }); bbDirty = true;
    }
    return { canvas: out, pagePt: [Wmm * 72 / 25.4, Hmm * 72 / 25.4], k, area, Wmm, Hmm, ox, oy };
  }
  A.plotRender = plotRender; A.PS = PS;
  function plotInfo(){ const [Wmm, Hmm] = paperMM(); const mg = +PS.margin || 0; const area = plotArea(); const k = plotK(area, Wmm - 2 * mg, Hmm - 2 * mg); const N = mmPerUnit() / k;
    const fits = (area.x1 - area.x0) * k <= Wmm - 2 * mg + 0.01 && (area.y1 - area.y0) * k <= Hmm - 2 * mg + 0.01;
    return { N, fits, wmm: (area.x1 - area.x0) * k, hmm: (area.y1 - area.y0) * k }; }
  function printCanvas(canvas, Wmm, Hmm){
    const url = canvas.toDataURL('image/png'); const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(fr);
    const d = fr.contentWindow.document; d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:' + Wmm + 'mm ' + Hmm + 'mm;margin:0}html,body{margin:0;padding:0}img{width:' + Wmm + 'mm;height:' + Hmm + 'mm;display:block}</style></head><body><img src="' + url + '"></body></html>'); d.close();
    const fire = () => { try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(_){ say('Trình duyệt không cho in trực tiếp — hãy xuất PDF.'); } setTimeout(() => { try{ fr.remove(); }catch(_){} }, 2000); };
    const im = d.querySelector('img'); if(im.complete) setTimeout(fire, 150); else im.onload = () => setTimeout(fire, 120);
  }
  async function doPlot(fmt){
    say('Đang tạo bản in…'); await new Promise(r => setTimeout(r, 40));
    try{
      const r = plotRender(fmt === 'png' ? 200 : 300, false);
      const name = (typeof exportFilename === 'function') ? exportFilename(fmt === 'png' ? 'png' : 'pdf') : 'banve.' + fmt;
      if(fmt === 'pdf'){ const blob = await canvasToPDFPaper(r.canvas, r.pagePt); await shareOrDownload(blob, name, 'application/pdf'); }
      else if(fmt === 'png'){ const blob = await new Promise(res => r.canvas.toBlob(res, 'image/png')); await shareOrDownload(blob, name, 'image/png'); }
      else printCanvas(r.canvas, r.Wmm, r.Hmm);
      log('Đã in: khổ ' + PS.paper + (PS.land ? ' ngang' : ' dọc') + ', tỉ lệ ' + (PS.fit ? 'khít giấy (≈1:' + (+(mmPerUnit() / r.k).toPrecision(4)) + ')' : '1:' + PS.scale));
    }catch(err){ console.error(err); say('Không tạo được bản in.'); }
  }
  function openPlot(){
    if(!hasDoc()){ say('Mở bản vẽ trước.'); return; }
    const opt = (v, t, s) => '<option value="' + esc(v) + '"' + (s ? ' selected' : '') + '>' + esc(t) + '</option>';
    const html = '<div class="pl-wrap"><div class="pl-left">' +
      '<div class="pl-sec">Khổ giấy</div><label class="dvd-frow"><span>Khổ</span><span class="v"><select id="plPaper">' + Object.keys(PAPERS).map(k => opt(k, k + ' (' + PAPERS[k][0] + '×' + PAPERS[k][1] + ' mm)', k === PS.paper)).join('') + '</select></span></label>' +
      '<label class="dvd-frow"><span>Hướng giấy</span><span class="v"><select id="plLand">' + opt('1', 'Ngang (Landscape)', PS.land) + opt('0', 'Dọc (Portrait)', !PS.land) + '</select></span></label>' +
      '<div class="pl-sec">Vùng in</div><label class="dvd-frow"><span>In gì</span><span class="v"><select id="plArea">' + opt('extents', 'Toàn bản vẽ (Extents)', PS.area === 'extents') + opt('display', 'Đang hiện trên màn hình (Display)', PS.area === 'display') + opt('window', 'Khung chọn (Window)', PS.area === 'window') + '</select></span></label>' +
      '<div class="dvd-frow"><span></span><span class="v"><button type="button" class="btn-ghost" id="plWin" style="padding:5px 10px">Chọn khung trên bản vẽ &lt;</button></span></div>' +
      '<div class="pl-sec">Tỉ lệ in</div><label class="dvd-frow"><span>Khít khổ giấy</span><span class="v"><input type="checkbox" id="plFit"' + (PS.fit ? ' checked' : '') + '></span></label>' +
      '<label class="dvd-frow"><span>Tỉ lệ 1 :</span><span class="v"><input id="plScale" list="plScales" inputmode="decimal" style="width:90px" value="' + esc(PS.scale) + '"><datalist id="plScales">' + SCALES.map(v => '<option value="' + v + '">').join('') + '</datalist></span></label>' +
      '<label class="dvd-frow"><span>Căn giữa trang</span><span class="v"><input type="checkbox" id="plCenter"' + (PS.center ? ' checked' : '') + '></span></label>' +
      '<label class="dvd-frow"><span>Lề giấy (mm)</span><span class="v"><input id="plMargin" inputmode="decimal" style="width:70px" value="' + esc(PS.margin) + '"></span></label>' +
      '<div class="pl-sec">Kiểu in</div><label class="dvd-frow"><span>Màu nét</span><span class="v"><select id="plStyle">' + opt('mono', 'Đen trắng (monochrome.ctb)', PS.style === 'mono') + opt('color', 'Màu (theo bản vẽ)', PS.style === 'color') + opt('gray', 'Thang xám (grayscale.ctb)', PS.style === 'gray') + '</select></span></label>' +
      '<label class="dvd-frow"><span>In bề rộng nét</span><span class="v"><input type="checkbox" id="plLw"' + (PS.lw ? ' checked' : '') + '></span></label>' +
      '</div><div class="pl-right"><div class="pl-sec">Xem trước</div><div class="pl-prev"><canvas id="plPrev"></canvas></div><div class="pl-info" id="plInfo"></div>' +
      '<div class="pl-btns"><button type="button" class="btn-ok" data-f="pdf">Xuất PDF</button><button type="button" class="btn-ghost" data-f="print">In…</button><button type="button" class="btn-ghost" data-f="png">Ảnh PNG</button></div></div></div>';
    const d = A.dialog({ title: 'In bản vẽ (Plot)', wide: true, html, noOk: true, cancelText: 'Đóng' });
    const root = d.root; root.querySelector('.modal').classList.add('pl-modal');
    const g = id => root.querySelector('#' + id);
    const read = () => { PS.paper = g('plPaper').value; PS.land = g('plLand').value === '1'; PS.area = g('plArea').value; PS.fit = g('plFit').checked; const sc = parseFloat(String(g('plScale').value).replace(',', '.')); if(sc > 0) PS.scale = sc; PS.center = g('plCenter').checked; const m = parseFloat(g('plMargin').value); PS.margin = m >= 0 ? Math.min(m, 40) : 5; PS.style = g('plStyle').value; PS.lw = g('plLw').checked; g('plScale').disabled = PS.fit; psSave(); };
    let pvT = 0;
    const preview = () => { clearTimeout(pvT); pvT = setTimeout(() => {
      read(); const c = g('plPrev'); if(!c) return; const [Wmm, Hmm] = paperMM(); const box = 300; const s = Math.min(box / Wmm, (box * 0.78) / Hmm);
      try{ const r = plotRender(Math.max(20, s * 25.4 * 1.6), true); c.width = Math.round(Wmm * s * 1.6); c.height = Math.round(Hmm * s * 1.6); c.style.width = Math.round(Wmm * s) + 'px'; c.style.height = Math.round(Hmm * s) + 'px';
        const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(r.canvas, 0, 0, c.width, c.height);
        const mg = +PS.margin || 0; cx.strokeStyle = 'rgba(30,120,220,.55)'; cx.setLineDash([4, 3]); cx.strokeRect(mg * s * 1.6, mg * s * 1.6, (Wmm - 2 * mg) * s * 1.6, (Hmm - 2 * mg) * s * 1.6);
        const inf = plotInfo(); if(LYT()){ g('plInfo').innerHTML = 'Đang in <b>layout "' + esc(LYT().name) + '"</b>: khổ ' + LYT().paper + ' ' + Wmm + '×' + Hmm + ' mm, tỉ lệ 1:1 trên giấy (tỉ lệ khung nhìn đặt trong layout).'; return; } g('plInfo').innerHTML = 'Khổ ' + PS.paper + ' ' + (PS.land ? 'ngang' : 'dọc') + ' · ' + Wmm + '×' + Hmm + ' mm<br>Tỉ lệ ' + (PS.fit ? 'khít giấy ≈ <b>1:' + (+inf.N.toPrecision(4)) + '</b>' : '<b>1:' + PS.scale + '</b>') + ' · hình in ' + Math.round(inf.wmm) + '×' + Math.round(inf.hmm) + ' mm' + (!inf.fits ? '<br><span style="color:#ffb347">⚠ Hình lớn hơn khổ giấy — sẽ bị cắt. Chọn tỉ lệ nhỏ hơn hoặc khổ lớn hơn.</span>' : '') + (mmPerUnit() === 1 && !unitToMM() ? '<br><span style="color:#8f99a8">Bản vẽ không ghi đơn vị — coi 1 đơn vị = 1 mm.</span>' : '');
      }catch(err){ console.warn(err); }
    }, 60); };
    root.querySelectorAll('select,input').forEach(el => { el.addEventListener('change', preview); el.addEventListener('input', preview); });
    g('plScale').disabled = PS.fit;
    g('plWin').onclick = () => { read(); d.close(); pickWindow(); };
    root.querySelector('.pl-btns').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if(!b) return; read(); if(PS.area === 'window' && !PS.win){ say('Chưa chọn khung in.'); return; } d.close(); doPlot(b.dataset.f); });
    preview();
  }
  function pickWindow(){
    A.run('PLOTWIN', async () => {
      const a = await A.getPoint('Chỉ định góc thứ nhất của khung in'); if(!a.pt){ openPlot(); return; }
      const b = await A.getPoint('Chỉ định góc đối diện', { base: a.pt, rubber: false, preview: (g, p) => g.poly([a.pt, { x: p.x, y: a.pt.y }, p, { x: a.pt.x, y: p.y }], true, '#ffcf33', [6, 4]) });
      if(b.pt) { PS.win = { x0: Math.min(a.pt.x, b.pt.x), y0: Math.min(a.pt.y, b.pt.y), x1: Math.max(a.pt.x, b.pt.x), y1: Math.max(a.pt.y, b.pt.y) }; PS.area = 'window'; }
      setTimeout(openPlot, 30);
    });
  }
  A.openPlot = openPlot;
  plain(['PLOT', 'PRINT'], 'In bản vẽ theo khổ giấy & tỉ lệ (PDF / máy in / PNG) — Ctrl+P', () => { if(A.busy()) A.cancel(true); if(A.deskUI && A.deskUI()) openPlot(); else { const b = document.getElementById('exportBtn'); if(b) b.click(); } });
  const plotCSS = document.createElement('style'); plotCSS.textContent = `
  .pl-modal{max-width:780px !important;width:min(780px,calc(100vw - 24px))}
  .pl-wrap{display:flex;gap:16px;flex-wrap:wrap}
  .pl-left{flex:1 1 320px;min-width:280px}
  .pl-right{flex:0 0 320px;display:flex;flex-direction:column;gap:8px}
  .pl-sec{font:700 11px system-ui,sans-serif;color:#8f99a8;text-transform:uppercase;margin:8px 0 4px;letter-spacing:.03em}
  .pl-prev{background:#3a414d;border-radius:6px;min-height:240px;display:grid;place-items:center;padding:10px}
  .pl-prev canvas{position:static !important;box-shadow:0 3px 12px rgba(0,0,0,.5);background:#fff}
  .pl-info{font:12px system-ui,sans-serif;color:#cfd6e0;line-height:1.5}
  .pl-btns{display:flex;gap:6px;flex-wrap:wrap}
  .pl-btns button{flex:1;padding:9px 10px}`;
  document.head.appendChild(plotCSS);

  /* ===================== CÔ LẬP / ẨN ĐỐI TƯỢNG (ISOLATEOBJECTS / HIDEOBJECTS) ===================== */
  function setObjHide(set, msg){ OBJ_HIDE = set && set.size ? set : null; try{ for(const e of [...selEnts]) if(OBJ_HIDE && OBJ_HIDE.has(e)) selEnts.delete(e); refreshPanSel(); }catch(_){} try{ invalidateSnap(); }catch(_){} draw(); A.paint(); if(msg) log(msg); if(A.onIsolate) A.onIsolate(); }
  async function pickSet(prompt){ const s = await A.getSel(prompt); return s.sel || []; }
  cmd(['ISOLATEOBJECTS', 'ISOLATE'], 'Chỉ hiện các đối tượng đã chọn (tạm thời)', async () => {
    const sel = await pickSet('Chọn đối tượng cần cô lập'); if(!sel.length) return; const keep = new Set(sel);
    const hide = new Set(); for(const e of entities) if(!keep.has(e)) hide.add(e); if(OBJ_HIDE) for(const e of OBJ_HIDE) hide.add(e);
    setObjHide(hide, 'Đã cô lập ' + sel.length + ' đối tượng — UNISOLATEOBJECTS để hiện lại');
  });
  cmd(['HIDEOBJECTS', 'HIDEOBJ'], 'Ẩn tạm thời các đối tượng đã chọn', async () => {
    const sel = await pickSet('Chọn đối tượng cần ẩn'); if(!sel.length) return; const hide = new Set(OBJ_HIDE || []); for(const e of sel) hide.add(e);
    setObjHide(hide, 'Đã ẩn ' + sel.length + ' đối tượng — UNISOLATEOBJECTS để hiện lại');
  });
  plain(['UNISOLATEOBJECTS', 'UNISOLATE', 'UNHIDE'], 'Hiện lại các đối tượng đã ẩn / cô lập', () => { const n = OBJ_HIDE ? OBJ_HIDE.size : 0; setObjHide(null, n ? 'Đã hiện lại ' + n + ' đối tượng' : 'Không có đối tượng nào đang bị ẩn'); });
  A.objIsolated = () => !!OBJ_HIDE;
  const _afterLoadIso = A.onLoad; A.onLoad = function(){ OBJ_HIDE = null; if(_afterLoadIso) _afterLoadIso.apply(this, arguments); if(A.onIsolate) A.onIsolate(); };

  /* ===================== OVERKILL (xoá nét trùng / chồng) ===================== */
  cmd(['OVERKILL', 'OK'], 'Xoá đối tượng trùng nhau và gộp đoạn thẳng chồng lên nhau', async () => {
    const s = await A.getSel('Chọn đối tượng (ALL = tất cả)'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const bb = A.bboxOf ? A.bboxOf(sel) : null; const span = bb ? Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) : 1; const tol = Math.max(span * 1e-9, 1e-6);
    const seen = new Map(), del = [];
    for(const e of sel){ if(e.grp) continue; const k = e.type + '|' + (e.layer || '0') + '|' + entSig(e, tol); if(seen.has(k)) del.push(e); else seen.set(k, e); }
    // đoạn thẳng thẳng hàng chồng nhau -> gộp
    const dset = new Set(del); const lines = sel.filter(e => e.type === 'LINE' && !e.grp && !dset.has(e));
    const groups = new Map(); const at = tol * 10;
    for(const L of lines){ let dx = L.x2 - L.x1, dy = L.y2 - L.y1; const len = Math.hypot(dx, dy); if(len < tol) continue; dx /= len; dy /= len; if(dx < -1e-12 || (Math.abs(dx) < 1e-12 && dy < 0)){ dx = -dx; dy = -dy; }
      const c = -dy * L.x1 + dx * L.y1; const key = (L.layer || '0') + '|' + Math.round(Math.atan2(dy, dx) * 1e6) + '|' + Math.round(c / at); let gL = groups.get(key); if(!gL){ gL = { dx, dy, list: [] }; groups.set(key, gL); } gL.list.push(L); }
    const rep = [];
    for(const gL of groups.values()){ if(gL.list.length < 2) continue; const { dx, dy } = gL;
      const items = gL.list.map(L => { const t1 = L.x1 * dx + L.y1 * dy, t2 = L.x2 * dx + L.y2 * dy; return { L, a: Math.min(t1, t2), b: Math.max(t1, t2) }; }).sort((p, q) => p.a - q.a);
      let cur = null;
      const flush = () => { if(!cur || cur.members.length < 2) return; const base = cur.members[0].L; const w = copyOf(base); const o = { x: base.x1 - (base.x1 * dx + base.y1 * dy) * dx, y: base.y1 - (base.x1 * dx + base.y1 * dy) * dy };
        w.x1 = o.x + dx * cur.a; w.y1 = o.y + dy * cur.a; w.x2 = o.x + dx * cur.b; w.y2 = o.y + dy * cur.b; rep.push([base, w]); for(const m of cur.members.slice(1)) del.push(m.L); };
      for(const it of items){ if(cur && it.a <= cur.b + at){ cur.b = Math.max(cur.b, it.b); cur.members.push(it); } else { flush(); cur = { a: it.a, b: it.b, members: [it] }; } }
      flush(); }
    if(!del.length && !rep.length){ log('Không có đối tượng trùng.'); return; }
    A.commit({ del, rep }, 'OVERKILL: xoá ' + del.length + ' đối tượng trùng/chồng');
    log('Đã xoá ' + del.length + ' đối tượng trùng hoặc chồng' + (rep.length ? ', gộp ' + rep.length + ' đoạn' : ''));
  });

  /* ===================== BOUNDARY / DONUT ===================== */
  cmd(['BOUNDARY', 'BO', 'BPOLY'], 'Tạo đa tuyến kín theo vùng kín (bấm điểm bên trong)', async () => {
    let n = 0;
    for(;;){
      const r = await A.getPoint('Chọn điểm bên trong vùng kín (Enter để xong)'); if(!r.pt) break;
      const b = A.findBoundary ? A.findBoundary(r.pt) : null;
      if(!b || !b.loops || !b.loops.length){ log('Không tìm thấy vùng kín bao quanh điểm này (phóng tới vùng cần lấy rồi thử lại).'); continue; }
      const add = b.loops.map(lp => mkE('POLYLINE', { vertices: lp.map(p => ({ x: p.x, y: p.y })), closed: true }));
      A.commit({ add }); n += add.length; log('Đã tạo ' + add.length + ' đường biên.');
    }
    if(n) say('Đã tạo ' + n + ' đường biên kín');
  });
  function mkE(type, props){ return A.newProps(Object.assign({ type }, props)); }
  cmd(['DONUT', 'DOUGHNUT'], 'Vẽ vành khuyên / chấm tròn đặc', async () => {
    const MEM = A.MEM || {};
    const r1 = await A.getDist('Đường kính trong', { def: MEM.dnI != null ? MEM.dnI : 0 }); const di = r1.num != null ? r1.num : (MEM.dnI || 0);
    const r2 = await A.getDist('Đường kính ngoài', { def: MEM.dnO || 10 }); const dO = r2.num != null ? r2.num : (MEM.dnO || 10); if(!(dO > 0)) return;
    MEM.dnI = di; MEM.dnO = dO;
    const ring = (c) => { const R = dO / 2, ri = Math.max(0, Math.min(di, dO) / 2), N = 48; const outer = [], inner = []; for(let i = 0; i < N; i++){ const a = i / N * Math.PI * 2; outer.push({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) }); if(ri > 0) inner.push({ x: c.x + ri * Math.cos(a), y: c.y + ri * Math.sin(a) }); } return mkE('HATCH', { loops: ri > 0 ? [outer, inner.reverse()] : [outer], pat: 'SOLID', solid: true }); };
    for(;;){ const p = await A.getPoint('Chỉ định tâm vành khuyên (Enter để xong)', { preview: (g, q) => g.ents([ring(q)]) }); if(!p.pt) break; A.commit({ add: [ring(p.pt)] }); }
  });

  /* ===================== ĐO NHANH (MEASUREGEOM - Quick) ===================== */
  function rayHits(p){
    const vb = viewWorldAABB(); const L = Math.max(vb.maxX - vb.minX, vb.maxY - vb.minY) * 2; const e1 = 2 / view.scale;
    const res = {};
    const dirs = { r: [1, 0], l: [-1, 0], u: [0, 1], d: [0, -1] };
    const hb = A.queryBox(vb.minX, p.y - e1, vb.maxX, p.y + e1, 4000), vbx = A.queryBox(p.x - e1, vb.minY, p.x + e1, vb.maxY, 4000);
    for(const [k, [dx, dy]] of Object.entries(dirs)){
      const ray = { t: 's', ax: p.x, ay: p.y, bx: p.x + dx * L, by: p.y + dy * L, u0: 0, u1: 1 }; let best = null;
      for(const e of (dy === 0 ? hb : vbx)){ if(e.type === 'TEXT' || e.type === 'HATCH') continue; let c; try{ c = A.G.curveOf(e); }catch(_){ c = null; } if(!c) continue;
        for(const pc of c.pieces){ for(const q of A.G.xPieces(ray, pc)){ const t = q.fa * L; if(t > 1e-7 * L && (!best || t < best.t)) best = { t, x: q.x, y: q.y }; } } }
      if(best) res[k] = best;
    }
    return res;
  }
  cmd(['MEASUREGEOM', 'MEA', 'QUICKMEASURE'], 'Đo nhanh: rê chuột để thấy khoảng cách tới các cạnh xung quanh', async () => {
    const lbl = v => { try{ return formatDist(v); }catch(_){ return (A.fmt ? A.fmt(v) : String(v)); } };
    for(;;){
      const r = await A.getPoint('Rê chuột lên hình để đo nhanh (Enter / Esc để thoát)', { rubber: false, preview: (g, p) => {
        const h = rayHits(p); const C = '#ff9f1a';
        if(h.l && h.r){ g.line({ x: h.l.x, y: p.y }, { x: h.r.x, y: p.y }, C); g.label({ x: (h.l.x + h.r.x) / 2, y: p.y }, lbl(h.r.x - h.l.x), C); }
        else { for(const k of ['l', 'r']) if(h[k]){ g.line(p, h[k], C, [4, 3]); g.label(h[k], lbl(h[k].t), C); } }
        if(h.u && h.d){ g.line({ x: p.x, y: h.d.y }, { x: p.x, y: h.u.y }, '#5fd3ff'); g.label({ x: p.x, y: (h.d.y + h.u.y) / 2 }, lbl(h.u.y - h.d.y), '#5fd3ff'); }
        else { for(const k of ['u', 'd']) if(h[k]){ g.line(p, h[k], '#5fd3ff', [4, 3]); g.label(h[k], lbl(h[k].t), '#5fd3ff'); } }
        for(const k of ['l', 'r', 'u', 'd']) if(h[k]) g.dot(h[k], k === 'l' || k === 'r' ? C : '#5fd3ff');
      } });
      if(!r.pt) return;
      const h = rayHits(r.pt); const parts = []; if(h.l && h.r) parts.push('Ngang = ' + lbl(h.r.x - h.l.x)); if(h.u && h.d) parts.push('Dọc = ' + lbl(h.u.y - h.d.y)); if(parts.length) log(parts.join(' · '));
    }
  });

  /* ===================== KIỂU CHỮ (STYLE) ===================== */
  const FONTS = ['Arial', 'Times New Roman', 'Tahoma', 'Verdana', 'Segoe UI', 'Calibri', 'Arial Narrow', 'Courier New', 'Cambria', 'Georgia'];
  const FONT_FILE = { 'Arial': 'arial.ttf', 'Times New Roman': 'times.ttf', 'Tahoma': 'tahoma.ttf', 'Verdana': 'verdana.ttf', 'Segoe UI': 'segoeui.ttf', 'Calibri': 'calibri.ttf', 'Arial Narrow': 'arialn.ttf', 'Courier New': 'cour.ttf', 'Cambria': 'cambria.ttc', 'Georgia': 'georgia.ttf' };
  A.FONT_FILE = FONT_FILE;
  const TS = A.TS = (() => { let o = null; try{ o = JSON.parse(localStorage.getItem('dvd:tstyle') || 'null'); }catch(_){} if(!o || !o.list || !o.list.Standard) o = { cur: 'Standard', list: { Standard: { font: 'Arial', wf: 1 } } }; if(!o.list[o.cur]) o.cur = 'Standard'; return o; })();
  const tsSave = () => { try{ localStorage.setItem('dvd:tstyle', JSON.stringify(TS)); }catch(_){} if(A.onTStyle) A.onTStyle(); };
  A.tsApply = (w, name) => { const st = TS.list[name]; if(!st) return; w.style = name; w.ff = st.font; if(st.wf && Math.abs(st.wf - 1) > 1e-3) w.xs = st.wf; else delete w.xs; };
  const _np = A.newProps;
  A.newProps = function(e){ const r = _np.apply(this, arguments); if(e && e.type === 'TEXT' && e.ff == null){ const st = TS.list[TS.cur]; if(st){ e.style = TS.cur; e.ff = st.font; if(st.wf && Math.abs(st.wf - 1) > 1e-3 && e.xs == null) e.xs = st.wf; } } return r; };
  function openStyles(){
    let sel = TS.cur;
    const d = A.dialog({ title: 'Kiểu chữ (Text Style)', wide: true, okText: 'Đóng', noCancel: true,
      html: '<div class="lm-bar"><button data-a="new">＋ Kiểu mới</button><button data-a="cur">✓ Đặt hiện hành</button><button data-a="del">✕ Xoá</button></div>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap"><div class="lm-tbl" style="flex:1 1 200px;min-width:180px"><table><thead><tr><th>HH</th><th>Kiểu chữ</th></tr></thead><tbody id="tsList"></tbody></table></div>' +
        '<div style="flex:2 1 300px"><label class="dvd-frow"><span>Font</span><span class="v"><select id="tsFont">' + FONTS.map(f => '<option>' + esc(f) + '</option>').join('') + '</select></span></label>' +
        '<label class="dvd-frow"><span>Hệ số rộng (width factor)</span><span class="v"><input id="tsWf" inputmode="decimal" style="width:90px"></span></label>' +
        '<div id="tsPrev" style="margin-top:8px;height:64px;border:1px solid var(--line);border-radius:6px;background:#1b2028;display:grid;place-items:center;overflow:hidden;font-size:28px;color:#e6eaf0;white-space:nowrap">AaBb Việt Nam 123</div>' +
        '<label class="dvd-frow" style="margin-top:6px"><span>Áp cho chữ đang chọn</span><span class="v"><button type="button" class="btn-ghost" id="tsApply" style="padding:5px 10px">Áp dụng</button></span></label></div></div>' +
        '<p style="margin:8px 0 0">Kiểu hiện hành dùng cho TEXT, MTEXT, ghi chú dẫn và chữ kích thước mới. Kiểu chữ được lưu khi xuất DXF (font TrueType).</p>' });
    const root = d.root, g = id => root.querySelector('#' + id);
    const render = () => {
      g('tsList').innerHTML = Object.keys(TS.list).map(n => '<tr data-n="' + esc(n) + '" class="' + (n === TS.cur ? 'cur' : '') + '" style="cursor:pointer;' + (n === sel ? 'outline:1px solid #3d9ae8' : '') + '"><td>' + (n === TS.cur ? '<b style="color:#7ee787">✓</b>' : '') + '</td><td>' + esc(n) + '</td></tr>').join('');
      const st = TS.list[sel] || TS.list.Standard; g('tsFont').value = st.font; g('tsWf').value = st.wf || 1;
      g('tsPrev').style.fontFamily = '"' + st.font + '",sans-serif'; g('tsPrev').style.transform = 'scaleX(' + (st.wf || 1) + ')';
    };
    render();
    g('tsList').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; render(); });
    g('tsList').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; TS.cur = tr.dataset.n; sel = TS.cur; tsSave(); render(); });
    g('tsFont').onchange = () => { TS.list[sel].font = g('tsFont').value; tsSave(); render(); };
    g('tsWf').onchange = () => { const v = parseFloat(String(g('tsWf').value).replace(',', '.')); if(v > 0.1 && v < 10){ TS.list[sel].wf = v; tsSave(); } render(); };
    g('tsApply').onclick = () => { const t = [...selEnts].filter(e => e.type === 'TEXT' && !A.isLocked(e)); if(!t.length){ say('Chọn chữ trên bản vẽ trước.'); return; } A.commit({ rep: t.map(e => { const w = copyOf(e); A.tsApply(w, sel); return [e, w]; }) }, 'Đã áp kiểu ' + sel + ' cho ' + t.length + ' chữ'); };
    root.querySelector('.lm-bar').addEventListener('click', async e => { const b = e.target.closest('button[data-a]'); if(!b) return; const a = b.dataset.a;
      if(a === 'new'){ let i = 1; while(TS.list['Style' + i]) i++; const nm = await askText({ title: 'Tên kiểu chữ mới', value: 'Style' + i }); if(nm == null) return; const n = nm.trim(); if(!n || TS.list[n]){ say('Tên trống hoặc đã có.'); return; } TS.list[n] = Object.assign({}, TS.list[sel]); sel = n; tsSave(); render(); }
      if(a === 'cur'){ TS.cur = sel; tsSave(); render(); }
      if(a === 'del'){ if(sel === 'Standard' || sel === TS.cur){ say('Không xoá được Standard hoặc kiểu hiện hành.'); return; } delete TS.list[sel]; sel = TS.cur; tsSave(); render(); } });
  }
  A.openStyles = openStyles;
  plain(['STYLE', 'ST', 'DDSTYLE'], 'Kiểu chữ: font, hệ số rộng, kiểu hiện hành', () => openStyles());

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
