/* DVDCAD v6m — điều hướng, bắt điểm 3D, mặt cắt gấp khúc, nhận chữ SHX từ PDF
   · NAVSWHEEL: vòng điều hướng (SteeringWheels) — Thu phóng, Lia, Quay quanh, Tua lại, Tâm, Đi bộ, Nhìn quanh, Lên / xuống; dùng cho mặt bằng 2D và khung 3D
   · 3DOSNAP (3DOSMODE): bắt điểm khi chọn điểm trong khung 3D — đỉnh, giữa cạnh, tâm mặt, gần nhất trên mặt
   · SECTIONPLANEJOG / JOGSECTION: thêm bậc gấp vào đường cắt; SECTIONPLANESETTINGS: tên, mẫu hatch, tỉ lệ, màu, hướng nhìn, tạo mặt cắt 2D (cắt khối 3D theo từng đoạn, chiếu lên mặt phẳng đoạn đầu)
   · PDFSHXTEXT: nhận dạng nét chữ SHX (từ PDF nhập vào) thành đối tượng TEXT — so khớp từng ký tự với phông nét đơn (txt, simplex, romans, iso…) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x35 || !window.DVDCmd) return; A._x35 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const D2R = Math.PI / 180;

  /* ===================== 3DOSNAP ===================== */
  let M3 = +LS('dvd:3dosmode', 14) | 0;
  A.snap3DMode = () => M3;
  const setM3 = v => { M3 = Math.max(0, Math.min(255, v | 0)); SV('dvd:3dosmode', M3); };
  if(A.sysvar) A.sysvar.def('3DOSMODE', { d: 'Bắt điểm 3D: 1 tắt hết, 2 đỉnh, 4 giữa cạnh, 8 tâm mặt, 64 gần nhất trên mặt (cộng các bit)', get: () => M3, set: v => setM3(+v) });
  plain(['3DOSNAP', '-3DOSNAP'], 'Bắt điểm 3D (khi chọn điểm trong khung 3D): đỉnh, giữa cạnh, tâm mặt, gần nhất trên mặt; bật / tắt', () => {
    const B = [[2, 'Đỉnh (Vertex)'], [4, 'Giữa cạnh (Midpoint on Edge)'], [8, 'Tâm mặt (Center of Face)'], [64, 'Gần nhất trên mặt (Nearest to Face)']];
    A.dialog({ title: 'Bắt điểm 3D (3DOSNAP)', help: '3DOSNAP', html: '<div class="acw" style="width:320px"><label style="display:block;margin-bottom:6px"><input type="checkbox" id="o3On"' + (M3 & 1 ? '' : ' checked') + '> Bật bắt điểm 3D (F4)</label><fieldset class="acw-grp"><legend>Chế độ</legend>' +
      B.map(([b, t]) => '<label style="display:block"><input type="checkbox" data-b="' + b + '"' + (M3 & b ? ' checked' : '') + '> ' + esc(t) + '</label>').join('') + '</fieldset></div>',
      ok: root => { let v = root.querySelector('#o3On').checked ? 0 : 1; root.querySelectorAll('[data-b]').forEach(c => { if(c.checked) v |= +c.dataset.b; }); setM3(v); log('3DOSMODE = ' + v + (v & 1 ? ' (tắt)' : '') + '.'); } }); });
  // F4: bật / tắt bắt điểm 3D (như AutoCAD)
  document.addEventListener('keydown', ev => { if(ev.key !== 'F4' || ev.ctrlKey || ev.altKey) return; const t = ev.target; if(t && (/TEXTAREA|SELECT/.test(t.tagName) || (t.closest && t.closest('.dvd-dlg')))) return; ev.preventDefault(); setM3(M3 ^ 1); log('Bắt điểm 3D ' + (M3 & 1 ? 'tắt' : 'bật') + '.'); }, true);

  /* ===================== NAVSWHEEL ===================== */
  const WEDGES = [['ZOOM', 'Thu phóng'], ['REWIND', 'Tua lại'], ['PAN', 'Lia'], ['ORBIT', 'Quay quanh'], ['CENTER', 'Tâm'], ['WALK', 'Đi bộ'], ['LOOK', 'Nhìn quanh'], ['UPDOWN', 'Lên / xuống']];
  let NW = null; const hist3 = [];
  const cvEl = () => document.getElementById('cv'); const W2 = () => { try{ return W(); }catch(_){ return 800; } }, H2 = () => { try{ return H(); }catch(_){ return 600; } };
  const V3 = () => (A.view3D && A.view3D.state ? A.view3D : null);
  const rerender = () => { const V = V3(); if(V){ try{ V.render(); }catch(_){} } else { try{ draw(); }catch(_){} } };
  function save3(){ const V = V3(); if(!V) return; const S = V.state; hist3.push({ az: S.az, el: S.el, dist: S.dist, t: [S.target.x, S.target.y, S.target.z] }); if(hist3.length > 40) hist3.shift(); }
  // thao tác (dx, dy: px kéo chuột; cx, cy: điểm tâm trên khung vẽ)
  function act(name, dx, dy, cx, cy){ const V = V3();
    if(V){ const S = V.state, el = S.el, az = S.az;
      if(name === 'ZOOM'){ S.dist = Math.max(1e-6, S.dist * Math.exp(dy / 120)); }
      else if(name === 'PAN'){ const k = S.dist * 0.0015, rx = -Math.sin(az), ry = Math.cos(az), ux = -Math.sin(el) * Math.cos(az), uy = -Math.sin(el) * Math.sin(az), uz = Math.cos(el); S.target.x -= (rx * dx - ux * dy) * k; S.target.y -= (ry * dx - uy * dy) * k; S.target.z += uz * dy * k; }
      else if(name === 'ORBIT'){ S.az = az - dx * 0.01; S.el = Math.max(-89.9 * D2R, Math.min(89.9 * D2R, el + dy * 0.01)); }
      else if(name === 'LOOK'){ const pos = [S.target.x + Math.cos(el) * Math.cos(az) * S.dist, S.target.y + Math.cos(el) * Math.sin(az) * S.dist, S.target.z + Math.sin(el) * S.dist]; const naz = az - dx * 0.006, nel = Math.max(-89.9 * D2R, Math.min(89.9 * D2R, el - dy * 0.006));
        S.az = naz; S.el = nel; S.target.set(pos[0] - Math.cos(nel) * Math.cos(naz) * S.dist, pos[1] - Math.cos(nel) * Math.sin(naz) * S.dist, pos[2] - Math.sin(nel) * S.dist); }
      else if(name === 'UPDOWN'){ S.target.z -= dy * S.dist * 0.002; }
      try{ V.render(); }catch(_){} return true; }
    if(name === 'ZOOM'){ try{ applyZoom(Math.exp(-dy / 120), cx, cy); }catch(_){} }
    else if(name === 'PAN'){ view.offsetX += dx; view.offsetY += dy; }
    else if(name === 'ORBIT' || name === 'LOOK'){ view.rot = (view.rot || 0) + dx * 0.005; try{ updateCompass(); }catch(_){} }
    else return false;
    rerender(); return true; }
  A.navWheelAct = act;
  function rewind(){ const V = V3(); if(V){ const s = hist3.pop(); if(!s){ log('Không còn góc nhìn trước.'); return; } const S = V.state; S.az = s.az; S.el = s.el; S.dist = s.dist; S.target.set(s.t[0], s.t[1], s.t[2]); try{ V.render(); }catch(_){} return; } if(A.prevView) A.prevView(); }
  function centerAt(clientX, clientY){ const V = V3(); if(V){ const q = V.pointAtXY ? V.pointAtXY(clientX, clientY) : null; if(!q) return false; save3(); V.state.target.set(q[0], q[1], q[2] || 0); try{ V.render(); }catch(_){} return true; }
    const c = cvEl(); if(!c) return false; const r = c.getBoundingClientRect(); const w = toWorld(clientX - r.left, clientY - r.top); try{ A.pushView(); }catch(_){} const s = toScreen(w.x, w.y); view.offsetX += W2() / 2 - s.x; view.offsetY += H2() / 2 - s.y; rerender(); return true; }
  A.navWheelCenter = centerAt;
  function closeWheel(){ if(NW){ NW.el.remove(); document.removeEventListener('keydown', NW.key, true); NW = null; } }
  function openWheel(px, py){ closeWheel(); const R = 92, r0 = 30; const host = document.body; const el = document.createElement('div'); el.id = 'dvdNavWheel';
    const x = px != null ? px : (() => { const c = (V3() && V3().ov) || cvEl(); const b = c ? c.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }; return b.left + b.width / 2; })();
    const y = py != null ? py : (() => { const c = (V3() && V3().ov) || cvEl(); const b = c ? c.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }; return b.top + b.height / 2; })();
    el.style.cssText = 'position:fixed;left:' + (x - R) + 'px;top:' + (y - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;z-index:9000;user-select:none;touch-action:none;filter:drop-shadow(0 3px 8px rgba(0,0,0,.45))';
    const is3 = !!V3(); let svg = '<svg viewBox="' + (-R) + ' ' + (-R) + ' ' + 2 * R + ' ' + 2 * R + '" width="' + 2 * R + '" height="' + 2 * R + '">';
    WEDGES.forEach(([k, t], i) => { const a0 = (i * 45 - 112.5) * D2R, a1 = a0 + 45 * D2R; const P = (a, rr) => (Math.cos(a) * rr).toFixed(2) + ' ' + (Math.sin(a) * rr).toFixed(2); const dis = !is3 && /WALK|UPDOWN/.test(k);
      svg += '<path data-w="' + k + '" d="M' + P(a0, r0) + ' L' + P(a0, R - 2) + ' A' + (R - 2) + ' ' + (R - 2) + ' 0 0 1 ' + P(a1, R - 2) + ' L' + P(a1, r0) + ' A' + r0 + ' ' + r0 + ' 0 0 0 ' + P(a0, r0) + 'Z" fill="' + (dis ? '#3a414c' : '#2c3542') + '" stroke="#8fa3bb" stroke-width="1" style="cursor:' + (dis ? 'not-allowed' : 'pointer') + '"><title>' + esc(t) + '</title></path>';
      const am = (a0 + a1) / 2, rm = (R + r0) / 2; svg += '<text x="' + (Math.cos(am) * rm).toFixed(1) + '" y="' + (Math.sin(am) * rm + 3).toFixed(1) + '" text-anchor="middle" font-size="9" font-family="Arial" fill="' + (dis ? '#7a8290' : '#e6ecf3') + '" pointer-events="none">' + esc(t) + '</text>'; });
    svg += '<circle data-w="CLOSE" r="' + (r0 - 3) + '" fill="#1b2129" stroke="#8fa3bb"><title>Đóng</title></circle><text y="4" text-anchor="middle" font-size="12" fill="#e6ecf3" pointer-events="none">×</text></svg>';
    el.innerHTML = svg; host.appendChild(el);
    let drag = null; const tip = msg => { try{ DVDCmd.log ? DVDCmd.log(msg) : log(msg); }catch(_){} };
    el.addEventListener('pointerdown', ev => { const w = ev.target.closest('[data-w]'); if(!w) return; ev.preventDefault(); ev.stopPropagation(); const k = w.dataset.w;
      if(k === 'CLOSE'){ closeWheel(); return; } if(!is3 && /WALK|UPDOWN/.test(k)){ tip('NAVSWHEEL: ' + k + ' chỉ dùng trong khung 3D.'); return; }
      if(k === 'REWIND'){ rewind(); return; } if(k === 'WALK'){ const V = V3(); closeWheel(); if(V && V.setWalk) V.setWalk(true); return; }
      if(k === 'CENTER'){ tip('NAVSWHEEL: bấm điểm làm tâm khung nhìn.'); const once = e2 => { if(e2.target.closest && e2.target.closest('#dvdNavWheel')) return; document.removeEventListener('pointerdown', once, true); e2.preventDefault(); e2.stopPropagation(); centerAt(e2.clientX, e2.clientY); }; document.addEventListener('pointerdown', once, true); return; }
      if(V3()) save3(); else try{ A.pushView(); }catch(_){}
      const c = cvEl(), b = c ? c.getBoundingClientRect() : { left: 0, top: 0 }; drag = { k, x: ev.clientX, y: ev.clientY, cx: x - b.left, cy: y - b.top }; try{ el.setPointerCapture(ev.pointerId); }catch(_){} });
    el.addEventListener('pointermove', ev => { if(!drag) return; const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y; drag.x = ev.clientX; drag.y = ev.clientY; act(drag.k, dx, dy, drag.cx, drag.cy); });
    const end = () => { drag = null; }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    const key = ev => { if(ev.key === 'Escape'){ closeWheel(); } }; document.addEventListener('keydown', key, true);
    NW = { el, key }; return el; }
  A.navWheel = { open: openWheel, close: closeWheel, get on(){ return !!NW; }, rewind };
  plain(['NAVSWHEEL', 'WHEEL'], 'Vòng điều hướng (SteeringWheels): thu phóng, lia, quay quanh, tua lại, tâm, đi bộ, nhìn quanh, lên / xuống — kéo trên từng múi', () => { if(NW){ closeWheel(); return; } openWheel(); log('NAVSWHEEL: kéo trên múi để thu phóng / lia / quay; Tua lại = góc nhìn trước; Esc hoặc × để đóng.'); });

  /* ===================== đường cắt gấp khúc ===================== */
  const isSec = e => !!e && e.type === 'POLYLINE' && !!e.secl;
  const secDef = () => Object.assign({ name: 'A', pat: 'ANSI31', psc: 1, col: '#ff3b30', flip: false }, LS('dvd:secdef', {}));
  function makeSecLine(a, b){ const e = A.newProps({ type: 'POLYLINE', vertices: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], closed: false }); e.secl = secDef(); e.col = e.secl.col; delete e.bl; e.lw = 50; try{ if(A.loadLT) A.loadLT('PHANTOM'); e.lt = 'PHANTOM'; }catch(_){} return e; }
  A.sectionLineMake = makeSecLine;
  async function pickSec(prompt){ const L = ME().filter(isSec); if(!L.length){ log('Chưa có đường cắt — tạo mới: chọn 2 điểm.'); const a = await A.getPoint('Điểm đầu đường cắt'); if(!a.pt) return null; const b = await A.getPoint('Điểm cuối đường cắt', { base: a.pt }); if(!b.pt) return null; const e = makeSecLine(a.pt, b.pt); A.commit({ add: [e] }, 'Đã tạo đường cắt ' + e.secl.name); return e; }
    if(L.length === 1) return L[0]; const r = await A.getEnt(prompt || 'Chọn đường cắt', { filter: isSec }); return r.ent || null; }
  // thêm bậc gấp tại điểm Q trên đoạn i: …, Q, Q + n·d, phần còn lại dời n·d
  function jog(e, q, d){ const V = e.vertices.map(v => ({ x: v.x, y: v.y })); let bi = 0, bd = Infinity, bq = null;
    for(let i = 0; i + 1 < V.length; i++){ const a = V[i], b = V[i + 1], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / L2)); const p = { x: a.x + dx * t, y: a.y + dy * t }; const dd = Math.hypot(p.x - q.x, p.y - q.y); if(dd < bd){ bd = dd; bi = i; bq = p; } }
    const a = V[bi], b = V[bi + 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    const out = V.slice(0, bi + 1).concat([{ x: bq.x, y: bq.y }, { x: bq.x + nx * d, y: bq.y + ny * d }], V.slice(bi + 1).map(v => ({ x: v.x + nx * d, y: v.y + ny * d })));
    const w = copy(e); w.vertices = out.filter((v, i) => i === 0 || Math.hypot(v.x - out[i - 1].x, v.y - out[i - 1].y) > 1e-12); return w; }
  A.sectionJog = jog;
  cmd(['SECTIONPLANEJOG', 'JOGSECTION'], 'Thêm bậc gấp vào đường cắt (mặt cắt gấp khúc): chọn đường cắt, điểm thêm bậc, độ lệch', async () => {
    const e = await pickSec('Chọn đường cắt cần thêm bậc'); if(!e) return; const q = await A.getPoint('Điểm thêm bậc gấp trên đường cắt'); if(!q.pt) return;
    let tot = 0; for(let i = 0; i + 1 < e.vertices.length; i++) tot += Math.hypot(e.vertices[i + 1].x - e.vertices[i].x, e.vertices[i + 1].y - e.vertices[i].y);
    const d = numOr(await A.getNum('Độ lệch bậc (dương = sang trái hướng đường cắt) <' + +(tot / 4).toFixed(4) + '>', { def: tot / 4 }), tot / 4); if(!d) return;
    const w = jog(e, q.pt, d); A.commit({ rep: [[e, w]] }, 'SECTIONPLANEJOG: đường cắt ' + e.secl.name + ' có ' + (w.vertices.length - 1) + ' đoạn.'); });
  // mặt cắt 2D: cắt lưới khối theo mặt phẳng đứng của từng đoạn, cắt phần ngoài đoạn, chiếu lên phương đoạn đầu (u = khoảng dọc đoạn đầu, v = cao độ)
  function meshOfE(e){ if(e.k === 'mesh' && e.v && e.f) return { p: e.v, i: e.f }; return A.meshOf ? A.meshOf(e) : null; }
  function sectionRegions(sec, ents){ const V = sec.vertices; if(!V || V.length < 2) return [];
    const d0x = V[1].x - V[0].x, d0y = V[1].y - V[0].y, L0 = Math.hypot(d0x, d0y) || 1, ux = d0x / L0, uy = d0y / L0, flip = sec.secl && sec.secl.flip ? -1 : 1; const out = [];
    for(const e of ents){ if(e.type !== 'SOLID3D' || e.vh) continue; const m = meshOfE(e); if(!m) continue; const p = m.p, I = m.i;
      for(let k = 0; k + 1 < V.length; k++){ const a = V[k], b = V[k + 1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy); if(L < 1e-12) continue; const tx = dx / L, ty = dy / L, nx = -ty, ny = tx;
        if(Math.abs(tx * ux + ty * uy) < 1e-6) continue;   // đoạn bậc vuông góc: không có bề rộng trên hình chiếu
        const D = q => (p[q * 3] - a.x) * nx + (p[q * 3 + 1] - a.y) * ny; const segs = [];
        for(let t = 0; t + 2 < I.length; t += 3){ const ix = [I[t], I[t + 1], I[t + 2]], dd = ix.map(D); const P = [];
          for(let j = 0; j < 3; j++){ const i1 = ix[j], i2 = ix[(j + 1) % 3], d1 = dd[j], d2 = dd[(j + 1) % 3]; if((d1 >= 0) !== (d2 >= 0)){ const s = d1 / (d1 - d2); P.push([p[i1 * 3] + (p[i2 * 3] - p[i1 * 3]) * s, p[i1 * 3 + 1] + (p[i2 * 3 + 1] - p[i1 * 3 + 1]) * s, p[i1 * 3 + 2] + (p[i2 * 3 + 2] - p[i1 * 3 + 2]) * s]); } }
          if(P.length === 2) segs.push(P); }
        if(!segs.length) continue; const sz = Math.max(1e-9, L) * 1e-7, key = v => Math.round(v[0] / sz) + ',' + Math.round(v[1] / sz) + ',' + Math.round(v[2] / sz); const adj = new Map();
        segs.forEach((sg, i) => { for(const w of [0, 1]){ const kk = key(sg[w]); let l = adj.get(kk); if(!l) adj.set(kk, l = []); l.push([i, w]); } });
        const used = new Uint8Array(segs.length), loops = [];
        for(let i = 0; i < segs.length; i++){ if(used[i]) continue; used[i] = 1; const Lp = [segs[i][0], segs[i][1]]; let endK = key(segs[i][1]), g = 0;
          while(g++ < 1e6){ const l = adj.get(endK) || []; const nx2 = l.find(([j]) => !used[j]); if(!nx2) break; used[nx2[0]] = 1; const o = segs[nx2[0]][1 - nx2[1]]; endK = key(o); if(endK === key(Lp[0])) break; Lp.push(o); } if(Lp.length >= 3) loops.push(Lp); }
        // toạ độ trong mặt cắt (t dọc đoạn, z), cắt theo 0 ≤ t ≤ L (Sutherland–Hodgman), rồi chiếu: u = (A + t·d − V0)·u0
        const clip = (poly, f) => { const o2 = []; for(let i = 0; i < poly.length; i++){ const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q); if(fp >= 0) o2.push(P); if((fp >= 0) !== (fq >= 0)){ const s = fp / (fp - fq); o2.push([P[0] + (Q[0] - P[0]) * s, P[1] + (Q[1] - P[1]) * s]); } } return o2; };
        const regs = []; for(const Lp of loops){ let q2 = Lp.map(v => [(v[0] - a.x) * tx + (v[1] - a.y) * ty, v[2]]); q2 = clip(q2, v => v[0]); q2 = clip(q2, v => L - v[0]); if(q2.length < 3) continue;
          const uv = q2.map(v => [flip * ((a.x + tx * v[0] - V[0].x) * ux + (a.y + ty * v[0] - V[0].y) * uy), v[1]]); let ar = 0; for(let i = 0; i < uv.length; i++){ const P = uv[i], Q = uv[(i + 1) % uv.length]; ar += P[0] * Q[1] - Q[0] * P[1]; } if(Math.abs(ar) < 1e-12) continue; regs.push(uv); }
        if(regs.length) out.push({ e, seg: k, loops: regs }); } }
    return out; }
  A.sectionRegions = sectionRegions;
  async function genSection(sec){ const R = sectionRegions(sec, ME()); if(!R.length){ log('Mặt cắt không cắt qua khối 3D nào.'); return null; }
    let x0 = Infinity, y0 = Infinity; for(const r of R) for(const l of r.loops) for(const q of l){ x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); }
    const pr = await A.getPoint('Điểm đặt mặt cắt ' + sec.secl.name + '–' + sec.secl.name + ' (góc dưới trái)', { preview: (g, p) => { let n = 0; for(const r of R) for(const l of r.loops){ if(n++ > 300) return; g.poly(l.map(q => ({ x: q[0] - x0 + p.x, y: q[1] - y0 + p.y })), true); } } }); if(!pr.pt) return null;
    const dx = pr.pt.x - x0, dy = pr.pt.y - y0, gid = A.newGroupId ? A.newGroupId('B') : 'sec' + Date.now(), add = []; const S = sec.secl;
    for(const r of R){ const L = r.loops.map(l => l.map(q => ({ x: q[0] + dx, y: q[1] + dy })));
      for(const l of L){ const e = A.newProps({ type: 'POLYLINE', vertices: l, closed: true }); e.grp = gid; e.blk = '*SECTION'; add.push(e); }
      const h = A.newProps({ type: 'HATCH', loops: L, pat: S.pat || 'ANSI31', psc: S.psc || 1, pang: 0, solid: S.pat === 'SOLID' }); h.grp = gid; h.blk = '*SECTION'; add.push(h); }
    const ys = Math.max(...add.filter(e => e.type === 'POLYLINE').flatMap(e => e.vertices.map(v => v.y))); const t = A.newProps({ type: 'TEXT', x: pr.pt.x, y: ys + 3 * ((A.dimTxt && A.dimTxt()) || 2.5), h: 1.4 * ((A.dimTxt && A.dimTxt()) || 2.5), rot: 0, text: 'MẶT CẮT ' + S.name + '-' + S.name }); t.grp = gid; t.blk = '*SECTION'; add.push(t);
    A.commit({ add }, 'Mặt cắt ' + S.name + '-' + S.name + ': ' + R.length + ' vùng cắt (' + (sec.vertices.length - 1) + ' đoạn đường cắt).'); return add; }
  A.sectionGenerate = genSection;
  cmd(['SECTIONPLANESETTINGS', 'SECTIONSETTINGS'], 'Thiết lập đường cắt: tên, mẫu hatch, tỉ lệ, màu, hướng nhìn; tạo mặt cắt 2D (cắt khối 3D theo đường cắt gấp khúc)', async () => {
    const e = await pickSec('Chọn đường cắt'); if(!e) return; const S = e.secl; const pats = Object.keys(A.PATS || { ANSI31: 1, SOLID: 1 });
    const r = await new Promise(res => A.dialog({ title: 'Thiết lập mặt cắt (SECTIONPLANESETTINGS)', help: 'SECTIONPLANESETTINGS', html: '<div class="acw" style="width:360px"><div class="acw-row"><label>Tên mặt cắt</label><input id="ssN" value="' + esc(S.name) + '" style="width:80px"></div>' +
        '<fieldset class="acw-grp"><legend>Vùng cắt</legend><div class="acw-row"><label>Mẫu hatch</label><select id="ssP">' + pats.map(n => '<option' + (n === S.pat ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></div><div class="acw-row"><label>Tỉ lệ</label><input id="ssS" type="number" step="any" value="' + (S.psc || 1) + '" style="width:80px"></div></fieldset>' +
        '<fieldset class="acw-grp"><legend>Đường cắt</legend><div class="acw-row"><label>Màu</label><input id="ssC" type="color" value="' + esc(S.col || '#ff3b30') + '"></div><label><input type="checkbox" id="ssF"' + (S.flip ? ' checked' : '') + '> Đảo hướng nhìn</label></fieldset>' +
        '<label><input type="checkbox" id="ssG" checked> Tạo mặt cắt 2D sau khi đóng</label><br><label><input type="checkbox" id="ssD"> Dùng làm mặc định cho đường cắt mới</label></div>',
      onOpen: root => (root.root || root).querySelectorAll('input,select').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation())),
      ok: root => { const q = s => root.querySelector(s); res({ name: q('#ssN').value.trim() || 'A', pat: q('#ssP').value, psc: +q('#ssS').value || 1, col: q('#ssC').value, flip: q('#ssF').checked, gen: q('#ssG').checked, def: q('#ssD').checked }); }, cancel: () => res(null) }));
    if(!r) return; const w = copy(e); w.secl = { name: r.name, pat: r.pat, psc: r.psc, col: r.col, flip: r.flip }; w.col = r.col; A.commit({ rep: [[e, w]] }, 'SECTIONPLANESETTINGS: ' + r.name);
    if(r.def) SV('dvd:secdef', w.secl); if(r.gen) await genSection(w); });

  /* ===================== PDFSHXTEXT ===================== */
  const FONTS = [['txt.shx', 'standard'], ['simplex.shx', 'simplex'], ['romans.shx', 'romans'], ['isocp.shx', 'iso'], ['romand.shx', 'romand']];
  const CHARS = (() => { let s = ''; for(let c = 33; c < 127; c++) s += String.fromCharCode(c); return s + 'ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđƠơƯư'; })();
  const sampleStrokes = (L, step) => { const P = []; for(const ln of L){ for(let i = 0; i + 1 < ln.length; i++){ const a = ln[i], b = ln[i + 1], d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / step)); for(let k = 0; k < n; k++) P.push([a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n]); } if(ln.length){ const z = ln[ln.length - 1]; P.push([z.x, z.y]); } } return P; };
  const gCache = new Map();
  function glyph(ff, ch){ const k = ff + '|' + ch; if(gCache.has(k)) return gCache.get(k); let st = null; try{ st = A.shxStrokes ? A.shxStrokes({ type: 'TEXT', x: 0, y: 0, h: 1, rot: 0, text: ch, ff }) : null; }catch(_){} let g = null;
    if(st && st.length){ let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for(const l of st) for(const q of l){ x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      g = { pts: sampleStrokes(st, 0.04).map(q => [q[0] - x0, q[1]]), x0, w: x1 - x0, y0, y1 }; }
    gCache.set(k, g); return g; }
  const chamfer = (P, Q) => { let s = 0; for(const a of P){ let m = Infinity; for(const b of Q){ const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; if(d < m) m = d; } s += Math.sqrt(m); } return s / (P.length || 1); };
  // nhận dạng: nét (đa tuyến / đường) → dòng chữ
  function recognize(ents, opt){ opt = opt || {}; const strokes = [];
    for(const e of ents){ if(e.type === 'LINE') strokes.push([{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }]); else if(e.type === 'POLYLINE' && (e.vertices || []).length >= 2){ const v = e.vertices.map(q => ({ x: q.x, y: q.y })); if(e.closed) v.push(v[0]); strokes.push(v); } }
    if(!strokes.length) return { rows: [] };
    // hướng dòng chữ: trục chính của các điểm (dòng 1 hàng) — làm tròn về 0 nếu gần ngang
    let mx = 0, my = 0, n = 0; for(const s of strokes) for(const q of s){ mx += q.x; my += q.y; n++; } mx /= n; my /= n; let sxx = 0, syy = 0, sxy = 0; for(const s of strokes) for(const q of s){ sxx += (q.x - mx) ** 2; syy += (q.y - my) ** 2; sxy += (q.x - mx) * (q.y - my); }
    let rot = opt.rot != null ? opt.rot * D2R : 0.5 * Math.atan2(2 * sxy, sxx - syy);
    if(opt.rot == null){ // tinh chỉnh: góc làm nhiều nét chạm cùng một đường chân chữ nhất (chân chữ SHX thẳng hàng tuyệt đối)
      const ext = Math.sqrt(Math.max(sxx, syy) / n) || 1; const score = a => { const c2 = Math.cos(a), s2 = Math.sin(a); const B = strokes.map(st => Math.min(...st.map(q => -(q.x - mx) * s2 + (q.y - my) * c2))).sort((x, y) => x - y); const eps = ext * 2e-4; let best = 0; for(let i = 0, j = 0; i < B.length; i++){ while(B[i] - B[j] > eps) j++; best = Math.max(best, i - j + 1); } return best; };
      let ba = 0, bs = -1; for(let d = -89.5; d <= 90.0001; d += 0.5){ const a = d * D2R; const sc = score(a); if(sc > bs || (sc === bs && Math.abs(d) < Math.abs(ba / D2R))){ bs = sc; ba = a; } }   // quét mọi góc, ưu tiên góc gần 0
      { const b0 = ba; for(let d = -0.5; d <= 0.5001; d += 0.02){ const a = b0 + d * D2R; const sc = score(a); if(sc > bs){ bs = sc; ba = a; } } }
      for(let d = -0.02; d <= 0.02001; d += 0.001){ const a = ba + d * D2R; const sc = score(a); if(sc > bs){ bs = sc; ba = a; } } rot = ba; const deg = rot / D2R; if(Math.abs(deg - Math.round(deg)) < 0.3) rot = Math.round(deg) * D2R; }
    if(Math.abs(rot) < 0.3 * D2R) rot = 0; const c = Math.cos(rot), s = Math.sin(rot);
    const loc = q => ({ x: (q.x - mx) * c + (q.y - my) * s, y: -(q.x - mx) * s + (q.y - my) * c }), wld = (x, y) => ({ x: mx + x * c - y * s, y: my + x * s + y * c });
    // thành phần liên thông (nét chạm nhau / khung bao chồng nhau)
    const comps = strokes.map(st => { const L = st.map(loc); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for(const q of L){ x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } return { L: [L], x0, x1, y0, y1 }; });
    const Hmax = Math.max(...comps.map(q => q.y1 - q.y0)) || 1; const tol = Hmax * 0.02;
    const dSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0; return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); };
    const near = (LA, LB) => LA.some(l1 => l1.some(p => LB.some(l2 => { for(let k = 0; k + 1 < l2.length; k++) if(dSeg(p, l2[k], l2[k + 1]) <= tol) return true; return l2.length === 1 && Math.hypot(p.x - l2[0].x, p.y - l2[0].y) <= tol; })));   // đỉnh của nét này chạm đoạn của nét kia
    let merged = true; while(merged){ merged = false; for(let i = 0; i < comps.length && !merged; i++) for(let j = i + 1; j < comps.length; j++){ const a = comps[i], b = comps[j]; if(a.x0 <= b.x1 + tol && b.x0 <= a.x1 + tol && a.y0 <= b.y1 + tol && b.y0 <= a.y1 + tol){ const ov = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0); const touch = near(a.L, b.L) || near(b.L, a.L); if(touch || ov > 0.3 * Math.min(a.x1 - a.x0 || tol, b.x1 - b.x0 || tol)){ a.L = a.L.concat(b.L); a.x0 = Math.min(a.x0, b.x0); a.x1 = Math.max(a.x1, b.x1); a.y0 = Math.min(a.y0, b.y0); a.y1 = Math.max(a.y1, b.y1); comps.splice(j, 1); merged = true; break; } } } }
    // hàng: theo chồng lấn chiều đứng
    comps.sort((a, b) => b.y1 - a.y1); const rows = []; for(const q of comps){ const r = rows.find(R => Math.min(R.y1, q.y1) - Math.max(R.y0, q.y0) > 0.3 * Math.min(R.y1 - R.y0, q.y1 - q.y0)); if(r){ r.c.push(q); r.y0 = Math.min(r.y0, q.y0); r.y1 = Math.max(r.y1, q.y1); } else rows.push({ c: [q], y0: q.y0, y1: q.y1 }); }
    const fonts = opt.fonts || FONTS; const out = [];
    for(const R of rows){ R.c.sort((a, b) => a.x0 - b.x0);
      const hs = R.c.map(q => q.y1 - q.y0).sort((a, b) => a - b); const big = R.c.filter(q => q.y1 - q.y0 > 0.6 * hs[hs.length - 1]); const bot = big.map(q => q.y0).sort((a, b) => a - b); const base = bot[Math.floor(bot.length / 2)];
      let best = null;
      for(const [ff] of fonts){ const Hc = (() => { const t = big.map(q => q.y1 - base).sort((a, b) => a - b); return t[Math.floor(t.length / 2)] || 1; })();
        // cỡ chữ: chữ hoa trong phông cao 1 → H = chiều cao chữ hoa đo được
        const H = Hc; let txt = '', sc = 0, nC = 0, x0f = null;
        for(let i = 0; i < R.c.length; i++){ const C = R.c[i]; if(i){ const gap = C.x0 - R.c[i - 1].x1; if(gap > 0.5 * H) txt += ' '.repeat(Math.max(1, Math.round(gap / (0.85 * H)))); }
          const P = sampleStrokes(C.L, H * 0.04).map(q => [(q[0] - C.x0) / H, (q[1] - base) / H]); let bc = '?', bs = Infinity, bg = null;
          for(const ch of CHARS){ const g = glyph(ff, ch); if(!g || !g.pts.length) continue; if(Math.abs(g.w - (C.x1 - C.x0) / H) > 0.35 || Math.abs(g.y1 - (C.y1 - base) / H) > 0.3 || Math.abs(g.y0 - (C.y0 - base) / H) > 0.3) continue;
            const sc2 = (chamfer(P, g.pts) + chamfer(g.pts, P)) / 2 + Math.abs(g.w - (C.x1 - C.x0) / H) * 0.2; if(sc2 < bs){ bs = sc2; bc = ch; bg = g; } }
          txt += bc; sc += isFinite(bs) ? bs : 1; nC++; if(i === 0 && bg) x0f = C.x0 - bg.x0 * H; else if(i === 0) x0f = C.x0; }
        const avg = sc / (nC || 1); if(!best || avg < best.avg) best = { ff, txt, avg, H, x0: x0f }; }
      const p = wld(best.x0, base); out.push({ text: best.txt.replace(/\s+$/, ''), ff: best.ff, h: best.H, x: p.x, y: p.y, rot: rot / D2R, score: Math.max(0, Math.round((1 - best.avg / 0.15) * 100)) }); }
    return { rows: out }; }
  A.shxRecognize = recognize;
  cmd(['PDFSHXTEXT'], 'Nhận dạng chữ SHX trong hình nhập từ PDF thành đối tượng chữ (so khớp với phông nét đơn txt / simplex / romans / iso / romand)', async () => {
    const s = await A.getSel('Chọn hình chữ SHX (nét từ PDF)'); const L = (s && s.sel || []).filter(e => e.type === 'LINE' || e.type === 'POLYLINE'); if(!L.length){ log('PDFSHXTEXT: không có nét để nhận dạng.'); return; }
    if(A.lffReady){ for(const [, n] of FONTS){ try{ await A.lffReady(n); }catch(_){} } }
    const R = recognize(L); if(!R.rows.length){ log('PDFSHXTEXT: không nhận được chữ.'); return; }
    const add = R.rows.filter(r => r.text).map(r => { const t = A.newProps({ type: 'TEXT', x: r.x, y: r.y, h: r.h, rot: Math.abs(r.rot) < 1e-9 ? 0 : r.rot, text: r.text }); t.ff = r.ff; t.layer = L[0].layer || t.layer; return t; });
    A.commit({ add, del: L }, 'PDFSHXTEXT: ' + add.length + ' dòng chữ — ' + R.rows.map(r => '"' + r.text + '" (' + r.ff + ', khớp ' + r.score + ' %)').join(', ')); });
})();
