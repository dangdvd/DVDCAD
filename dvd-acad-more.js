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
    if(!b){ if(tipFor) hideTip(); return; }
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

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
