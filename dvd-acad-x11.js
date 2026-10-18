/* DVDCAD v4x — REVCLOUD như AutoCAD (cung lồi ra ngoài, độ dài cung nhỏ nhất / lớn nhất, Chữ nhật / Đa giác / Tự do / Đối tượng,
   kiểu Thường / Thư pháp, đảo chiều) · REVCLOUDPROPERTIES · DIMOVERRIDE · BLOCKREPLACE · MOCORO · TCASE · CDORDER
   HATCHGENERATEBOUNDARY · HATCHSETBOUNDARY · LAYTRANS · SHOWURLS · GETSEL · SSX · XPLODE · ARRAYCLASSIC */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x11 || !window.DVDCmd) return; A._x11 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const deep = o => JSON.parse(JSON.stringify(o));
  const copy = e => { const o = deep(e); delete o.userAdded; return o; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const hl = arr => { try{ const c = A.cur(); if(c){ c.hl = arr || []; A.paint(); } }catch(_){} };
  const FR = (l, h) => A.formRow ? A.formRow(l, h) : '<label class="dvd-frow"><span>' + l + '</span><span class="v">' + h + '</span></label>';
  const area = P => { let s = 0; for(let i = 0, n = P.length; i < n; i++){ const a = P[i], b = P[(i + 1) % n]; s += a.x * b.y - b.x * a.y; } return s / 2; };

  /* =====================================================================
     1) REVCLOUD — khoanh mây sửa đổi như AutoCAD
     ===================================================================== */
  const RCK = 'dvd:revcloud';
  const RC = Object.assign({ min: 0, max: 0, style: 'N', type: 'R', bulge: 0.6 }, (() => { try{ return JSON.parse(localStorage.getItem(RCK) || '{}'); }catch(_){ return {}; } })());
  const rcSave = () => { try{ localStorage.setItem(RCK, JSON.stringify(RC)); }catch(_){} };
  const nice = v => { if(!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
  function autoArc(){ try{ const h = (window.innerHeight || 800) / (view.scale || 1); return nice(h / 30); }catch(_){ return 10; } }
  const arcMin = () => RC.min > 0 ? RC.min : autoArc();
  const arcMax = () => Math.max(arcMin(), RC.max > 0 ? RC.max : arcMin());
  A.revcloudSettings = RC;
  // mây từ đường dẫn P (đỉnh, không lặp đỉnh đầu): các điểm nhọn nằm trên đường dẫn, cung lồi ra ngoài
  function cloudFromPath(P, closed, rev, opt){
    opt = opt || {}; const mn = opt.min || arcMin(), mx = Math.max(mn, opt.max || arcMax()), style = opt.style || RC.style;
    P = P.filter((p, i) => i === 0 || dist(p, P[i - 1]) > 1e-12); if(closed && P.length > 2 && dist(P[0], P[P.length - 1]) < 1e-12) P.pop();
    if(P.length < 2 || (closed && P.length < 3)) return null;
    const Q = closed ? P.concat([P[0]]) : P.slice(); const S = [0]; for(let i = 1; i < Q.length; i++) S.push(S[i - 1] + dist(Q[i - 1], Q[i])); const T = S[S.length - 1]; if(!(T > 1e-9)) return null;
    let seed = 12345 + Math.round(T * 1000) % 100000; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const L = []; let acc = 0; while(acc < T - 1e-9){ const l = mn + (mx - mn) * rnd(); L.push(l); acc += l; }
    let n = Math.max(closed ? 3 : 1, Math.round(T / ((mn + mx) / 2))); while(L.length > n) L.pop(); while(L.length < n) L.push(mn + (mx - mn) * rnd());
    const k = T / L.reduce((a, b) => a + b, 0); const at = s => { let i = 1; while(i < S.length - 1 && S[i] < s) i++; const t = (s - S[i - 1]) / ((S[i] - S[i - 1]) || 1); return { x: Q[i - 1].x + (Q[i].x - Q[i - 1].x) * t, y: Q[i - 1].y + (Q[i].y - Q[i - 1].y) * t }; };
    const V = [{ x: Q[0].x, y: Q[0].y }]; let s = 0; for(let i = 0; i < L.length - 1; i++){ s += L[i] * k; V.push(at(s)); } if(!closed) V.push({ x: Q[Q.length - 1].x, y: Q[Q.length - 1].y });
    // dấu bulge: + = cung lồi về bên phải chiều đi; đa giác ngược kim đồng hồ có phía ngoài ở bên phải
    let sg = closed ? (area(P) >= 0 ? 1 : -1) : 1; if(rev) sg = -sg; const b = (opt.bulge || RC.bulge || 0.6) * sg;
    const m = closed ? V.length : V.length - 1;
    const BV = V.map((p, i) => ({ x: p.x, y: p.y, bulge: i < m ? b : 0 }));
    let e;
    if(style === 'C' && A.widthPoly){ const raw = BV.map((p, i) => { const q = BV[(i + 1) % BV.length], c = dist(p, q); return { x: p.x, y: p.y, bulge: p.bulge, sw: i < m ? c * 0.04 : 0, ew: i < m ? c * 0.12 : 0 }; }); e = A.widthPoly(raw, closed); }
    else { e = { type: 'POLYLINE', vertices: V.map(p => ({ x: p.x, y: p.y })), closed }; A.setBV(e, BV); }
    e.rc = { s: style === 'C' ? 'C' : 'N', mn, mx, r: rev ? 1 : 0, b: Math.abs(b) }; e.rcv = V.map(p => ({ x: p.x, y: p.y })); if(closed) e.rcc = 1;
    return e;
  }
  A.cloudFromPath = cloudFromPath;
  const rectP = (a, b) => [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }];
  function pathOf(e){   // đường dẫn của đối tượng (cho tuỳ chọn Đối tượng)
    if(e.type === 'CIRCLE'){ const n = 96; return { P: Array.from({ length: n }, (_, i) => ({ x: e.cx + e.r * Math.cos(i / n * TAU), y: e.cy + e.r * Math.sin(i / n * TAU) })), closed: true }; }
    if(e.type === 'ELLIPSE'){ const n = 96, R = Math.hypot(e.mx, e.my), a0 = Math.atan2(e.my, e.mx), r2 = R * (e.ratio || 1); const p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; const full = Math.abs(p2 - p1 - TAU) < 1e-6 || (p1 === 0 && p2 === TAU);
      const P = []; const m = full ? n : n + 1; for(let i = 0; i < m; i++){ const t = p1 + (p2 - p1) * i / n, x = R * Math.cos(t), y = r2 * Math.sin(t); P.push({ x: e.cx + x * Math.cos(a0) - y * Math.sin(a0), y: e.cy + x * Math.sin(a0) + y * Math.cos(a0) }); } return { P, closed: full }; }
    if(e.type === 'ARC'){ let s = (e.a2 - e.a1) % 360; if(s <= 0) s += 360; const n = Math.max(8, Math.round(s / 4)); return { P: Array.from({ length: n + 1 }, (_, i) => { const a = (e.a1 + s * i / n) * D2R; return { x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }; }), closed: false }; }
    if(e.type === 'LINE') return { P: [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }], closed: false };
    if(e.type === 'POLYLINE'){ if(e.rcv) return { P: e.rcv.map(p => ({ x: p.x, y: p.y })), closed: !!e.rcc }; const V = (e.vertices || []).map(p => ({ x: p.x, y: p.y })); let cl = !!e.closed; if(!cl && V.length > 3 && dist(V[0], V[V.length - 1]) < 1e-9){ cl = true; V.pop(); } return { P: V, closed: cl }; }
    if(e.type === 'HATCH' && e.loops && e.loops[0]) return { P: e.loops[0].map(p => ({ x: p.x, y: p.y })), closed: true };
    return null;
  }
  function rcStatus(){ return 'Cung nhỏ nhất: ' + A.fmt(arcMin()) + (RC.min > 0 ? '' : ' (tự động)') + '  Lớn nhất: ' + A.fmt(arcMax()) + '  Kiểu: ' + (RC.style === 'C' ? 'Thư pháp' : 'Thường') + '  Dạng: ' + ({ R: 'Chữ nhật', P: 'Đa giác', F: 'Tự do' })[RC.type]; }
  async function rcFinish(P, closed){
    let e = cloudFromPath(P, closed, false); if(!e) return false;
    if(!closed){ const k = await A.getKw('Đảo chiều cung?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Không', preview: null }); if(k.kw === 'C') e = cloudFromPath(P, closed, true); }
    A.newProps(e); A.commit({ add: [e] }, 'Đã vẽ khoanh mây'); log('REVCLOUD: khoanh mây ' + (closed ? 'kín' : 'hở') + ', ' + (e.rcv.length - (closed ? 0 : 1)) + ' cung.'); return true;
  }
  cmd(['REVCLOUD', 'RC'], 'Khoanh mây sửa đổi: Chữ nhật / Đa giác / Tự do / Đối tượng; độ dài cung, kiểu Thường / Thư pháp', async () => {
    for(;;){
      log(rcStatus());
      const kw = [{ k: 'A', t: 'Độ dài cung' }, { k: 'O', t: 'Đối tượng' }, { k: 'R', t: 'Chữ nhật' }, { k: 'P', t: 'Đa giác' }, { k: 'F', t: 'Tự do' }, { k: 'S', t: 'Kiểu' }, { k: 'M', t: 'Sửa mây' }];
      const pr = RC.type === 'R' ? 'Chỉ định góc thứ nhất' : RC.type === 'P' ? 'Chỉ định điểm đầu' : 'Chỉ định điểm đầu (rồi rê chuột / ngón tay theo đường mây)';
      const r = await A.getPoint(pr, { kw, def: 'Đối tượng' });
      if(r.kw === 'A'){ const a = await A.getDist('Độ dài cung nhỏ nhất', { def: +arcMin().toPrecision(6) }); if(!(a.num > 0)) continue; const b = await A.getDist('Độ dài cung lớn nhất', { def: Math.max(a.num, +arcMax().toPrecision(6)) }); RC.min = a.num; RC.max = b.num >= a.num ? b.num : a.num; rcSave(); continue; }
      if(r.kw === 'S'){ const s = await A.getKw('Kiểu cung', { kw: [{ k: 'N', t: 'Thường' }, { k: 'C', t: 'Thư pháp' }], def: RC.style === 'C' ? 'Thư pháp' : 'Thường' }); if(s.kw){ RC.style = s.kw; rcSave(); } continue; }
      if(r.kw === 'R' || r.kw === 'P' || r.kw === 'F'){ RC.type = r.kw; rcSave(); continue; }
      if(r.kw === 'M'){ A.cancel(true); setTimeout(() => DVDCmd.run('REVCLOUDPROPERTIES'), 0); return; }
      if(r.kw === 'O' || r.none){
        const s = await A.getEnt('Chọn đối tượng để đổi thành mây (tròn, elip, đa tuyến, spline, cung, đường)', { filter: e => /^(CIRCLE|ELLIPSE|POLYLINE|ARC|LINE|HATCH)$/.test(e.type) && !e.wipe }); if(!s.ent) return;
        const pth = pathOf(s.ent); if(!pth){ log('Không dùng được đối tượng này.'); continue; } hl([s.ent]);
        let e = cloudFromPath(pth.P, pth.closed, false); if(!e){ hl([]); log('Đối tượng quá nhỏ.'); continue; }
        const k = await A.getKw('Đảo chiều cung?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Không' }); hl([]); if(k.kw === 'C') e = cloudFromPath(pth.P, pth.closed, true);
        for(const key of ['layer', 'col', 'bl', 'lw', 'lt', 'lts']) if(s.ent[key] != null) e[key] = s.ent[key]; if(e.layer == null) A.newProps(e);
        if(s.ent.type === 'HATCH') A.commit({ add: [e] }, 'Đã tạo mây theo biên hatch'); else A.commit({ rep: [[s.ent, e]] }, 'Đã đổi thành khoanh mây'); log('REVCLOUD: đã đổi đối tượng thành mây (' + (e.rcv.length - (pth.closed ? 0 : 1)) + ' cung).'); return; }
      if(!r.pt) return;
      if(RC.type === 'R'){
        const b = await A.getPoint('Chỉ định góc đối diện', { base: r.pt, rubber: false, preview: (g, p) => { const e = cloudFromPath(rectP(r.pt, p), true, false); if(e) g.ent(e); } }); if(!b.pt) return;
        if(Math.abs(b.pt.x - r.pt.x) < 1e-9 || Math.abs(b.pt.y - r.pt.y) < 1e-9){ log('Hình chữ nhật suy biến.'); continue; }
        await rcFinish(rectP(r.pt, b.pt), true); return; }
      if(RC.type === 'P'){
        const P = [r.pt];
        for(;;){ const q = await A.getPoint(P.length < 3 ? 'Chỉ định điểm tiếp theo' : 'Chỉ định điểm tiếp theo (Enter = khép mây)', { base: P[P.length - 1], kw: P.length > 1 ? [{ k: 'U', t: 'Bỏ điểm' }] : [], preview: (g, p) => { const e = cloudFromPath(P.concat([p]), P.length >= 2, false); if(e) g.ent(e); } });
          if(q.kw === 'U'){ if(P.length > 1) P.pop(); continue; } if(!q.pt) break; if(dist(q.pt, P[P.length - 1]) > 1e-12) P.push(q.pt); }
        if(P.length < 2) return; await rcFinish(P, P.length >= 3); return; }
      // Tự do: điểm mây theo vết con trỏ; bấm lần nữa (hoặc quay về gần điểm đầu) để xong
      const P = [r.pt]; const step = arcMin() * 0.5; let closedHit = false;
      const q = await A.getPoint('Rê theo đường mây — bấm để kết thúc (về gần điểm đầu = mây kín)', { base: P[0], rubber: false, preview: (g, p) => { if(dist(p, P[P.length - 1]) >= step) P.push({ x: p.x, y: p.y }); const near = P.length > 6 && dist(p, P[0]) < arcMin(); closedHit = near; const e = cloudFromPath(near ? P : P.concat([p]), near, false); if(e) g.ent(e); } });
      if(q.pt && dist(q.pt, P[P.length - 1]) > 1e-9) P.push(q.pt);
      const closed = closedHit || (P.length > 3 && q.pt && dist(q.pt, P[0]) < arcMin());
      if(P.length < 2){ log('Chưa rê đủ đường mây.'); return; } await rcFinish(P, closed); return;
    }
  });
  cmd(['REVCLOUDPROPERTIES', 'RCP'], 'Đổi độ dài cung / kiểu / chiều cung của khoanh mây đã vẽ', async () => {
    const s = await A.getSel('Chọn khoanh mây', { filter: e => e.type === 'POLYLINE' && (e.rc || (A.bvOf && A.bvOf(e))) }); const sel = (s.sel || []).filter(e => e.type === 'POLYLINE' && !A.isLocked(e)); if(!sel.length) return;
    const f = sel.find(e => e.rc) || {}; const r0 = f.rc || { mn: arcMin(), mx: arcMax(), s: RC.style, r: 0 };
    const o = await new Promise(res => A.dialog({ title: 'Thuộc tính khoanh mây', html:
      FR('Độ dài cung nhỏ nhất', '<input id="rcMn" type="number" step="any" value="' + (+r0.mn.toPrecision(6)) + '">') +
      FR('Độ dài cung lớn nhất', '<input id="rcMx" type="number" step="any" value="' + (+r0.mx.toPrecision(6)) + '">') +
      FR('Kiểu', '<select id="rcSt"><option value="N"' + (r0.s !== 'C' ? ' selected' : '') + '>Thường</option><option value="C"' + (r0.s === 'C' ? ' selected' : '') + '>Thư pháp</option></select>') +
      '<label style="display:block;margin-top:6px"><input type="checkbox" id="rcRv"> Đảo chiều cung</label>',
      ok: root => { const mn = parseFloat(root.querySelector('#rcMn').value), mx = parseFloat(root.querySelector('#rcMx').value); if(!(mn > 0)){ say('Độ dài cung phải > 0'); return false; } res({ mn, mx: mx >= mn ? mx : mn, s: root.querySelector('#rcSt').value, flip: root.querySelector('#rcRv').checked }); }, cancel: () => res(null) }));
    if(!o) return;
    const rep = []; for(const e of sel){ const p = pathOf(e); if(!p) continue; const rv = (e.rc ? !!e.rc.r : false) !== o.flip; const w = cloudFromPath(p.P, p.closed, rv, { min: o.mn, max: o.mx, style: o.s, bulge: e.rc && e.rc.b }); if(!w) continue;
      for(const k of ['layer', 'col', 'bl', 'lw', 'lt', 'lts', 'grp', 'blk', 'dord']) if(e[k] != null) w[k] = e[k]; rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, 'Đã sửa ' + rep.length + ' khoanh mây'); log('REVCLOUDPROPERTIES: ' + rep.length + ' mây, cung ' + o.mn + '…' + o.mx + ', kiểu ' + (o.s === 'C' ? 'thư pháp' : 'thường') + (o.flip ? ', đảo chiều' : '') + '.');
  });
  // giữ điểm nhọn của mây (rcv) khi dời / xoay / tỉ lệ / đối xứng
  { const mv = (e, f) => { if(e && e.rcv) e.rcv = e.rcv.map(f); };
    const _t = window.translateEnt; window.translateEnt = function(e, dx, dy){ const r = _t.apply(this, arguments); mv(e, p => ({ x: p.x + dx, y: p.y + dy })); return r; };
    const _r = window.rotateEnt; window.rotateEnt = function(e, deg, c){ const r = _r.apply(this, arguments); const a = deg * D2R, co = Math.cos(a), si = Math.sin(a); mv(e, p => ({ x: c.x + (p.x - c.x) * co - (p.y - c.y) * si, y: c.y + (p.x - c.x) * si + (p.y - c.y) * co })); return r; };
    const _s = window.scaleEnt; window.scaleEnt = function(e, f, c){ const r = _s.apply(this, arguments); mv(e, p => ({ x: c.x + (p.x - c.x) * f, y: c.y + (p.y - c.y) * f })); if(e && e.rc){ e.rc.mn *= f; e.rc.mx *= f; } return r; };
    const _m = window.mirrorAcross; if(_m) window.mirrorAcross = function(e, P1, P2){ const r = _m.apply(this, arguments); let dx = P2.x - P1.x, dy = P2.y - P1.y; const L = Math.hypot(dx, dy); if(L > 1e-9){ dx /= L; dy /= L; mv(e, p => { const wx = p.x - P1.x, wy = p.y - P1.y, d = wx * dx + wy * dy; return { x: P1.x + 2 * d * dx - wx, y: P1.y + 2 * d * dy - wy }; }); if(e && e.rc) e.rc.r = e.rc.r ? 0 : 1; } return r; };
    if(A.xformEnt){ const _x = A.xformEnt; A.xformEnt = function(e, M){ const r = _x.apply(this, arguments); if(e && e.rcv) e.rcv = e.rcv.map(p => ({ x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f })); return r; }; } }
  // sửa đỉnh / kéo ô nắm làm mây không còn khớp → bỏ dấu mây (để REVCLOUDPROPERTIES dựng lại theo đỉnh mới)
  { const _c = A.commit; A.commit = function(ch, msg){ try{ if(ch && ch.rep) for(const [o, w] of ch.rep) if(w && w.rcv && w.type === 'POLYLINE' && o && o.rcv && w.vertices && o.vertices && w.vertices.length === o.vertices.length){ const dx = w.vertices[0].x - o.vertices[0].x, dy = w.vertices[0].y - o.vertices[0].y; const moved = w.vertices.some((p, i) => Math.abs(p.x - o.vertices[i].x - dx) > 1e-6 || Math.abs(p.y - o.vertices[i].y - dy) > 1e-6); const same = w.rcv.every((p, i) => o.rcv[i] && Math.abs(p.x - o.rcv[i].x) < 1e-12 && Math.abs(p.y - o.rcv[i].y) < 1e-12); if(moved && same){ delete w.rcv; delete w.rcc; } } }catch(_){} return _c.apply(this, arguments); }; }

  /* =====================================================================
     2) DIMOVERRIDE — ghi đè kiểu kích thước cho từng kích thước đã vẽ
     ===================================================================== */
  const isDim = e => e && e.grp && /^\*DIM/.test(String(e.blk || ''));
  const dimText = gid => A.groupMembers(gid).find(x => x.type === 'TEXT' && x.dimd);
  const OVR = [['T', 'Cao chữ', 'txt', 'n'], ['D', 'Số lẻ', 'dec', 'i'], ['M', 'Mũi tên', 'arrow', 'k'], ['F', 'Hệ số đo', 'lfac', 'n'], ['P', 'Tiền tố', 'prefix', 's'], ['S', 'Hậu tố', 'suffix', 's'], ['Z', 'Cỡ mũi tên', 'asz', 'n'], ['G', 'Khe chữ', 'gap', 'n']];
  function dimReplace(gid, mut){ const t = dimText(gid); if(!t || !A.dimRegenFrom) return null; const w = copy(t); w.dimd = deep(t.dimd); mut(w.dimd); const ents = A.dimRegenFrom(w); if(!ents || !ents.length) return null; return { del: A.groupMembers(gid), add: ents }; }
  A.dimOverride = (gids, key, val) => { const del = [], add = []; for(const g of gids){ const r = dimReplace(g, d => { d.s = Object.assign({}, d.s || {}); if(key === '*') d.s = Object.assign({}, A.DS); else d.s[key] = val; }); if(r){ del.push(...r.del); add.push(...r.add); } } if(add.length) A.commit({ del, add }, 'DIMOVERRIDE'); return add.length ? gids.length : 0; };
  cmd(['DIMOVERRIDE', 'DOV', 'DIMOVER'], 'Ghi đè kiểu cho kích thước đã vẽ (cao chữ, số lẻ, mũi tên, hệ số đo, tiền tố / hậu tố…) hoặc xoá ghi đè', async () => {
    const k = await A.getKw('Thuộc tính cần ghi đè', { kw: OVR.map(o => ({ k: o[0], t: o[1] })).concat([{ k: 'C', t: 'Xoá ghi đè (theo kiểu hiện hành)' }]) }); if(!k.kw) return;
    let key, val;
    if(k.kw === 'C') key = '*';
    else { const o = OVR.find(x => x[0] === k.kw); key = o[2];
      if(o[3] === 'k'){ const a = await A.getKw('Kiểu mũi tên', { kw: [{ k: 'T', t: 'Gạch chéo' }, { k: 'A', t: 'Mũi tên đặc' }, { k: 'D', t: 'Chấm tròn' }], def: 'Gạch chéo' }); val = ({ T: 'tick', A: 'arrow', D: 'dot' })[a.kw || 'T']; }
      else if(o[3] === 's'){ const a = await A.getStr(o[1] + ' (để trống = không có)'); val = a.str || ''; }
      else { const a = await A.getNum(o[1], { def: A.DS ? A.DS[key] : 1 }); if(a.num == null || a.num < 0) return; val = o[3] === 'i' ? Math.round(a.num) : a.num; } }
    const s = await A.getSel('Chọn kích thước', { filter: isDim }); const gids = [...new Set((s.sel || []).filter(isDim).map(e => e.grp))]; if(!gids.length){ log('Không có kích thước nào.'); return; }
    const n = A.dimOverride(gids, key, val); log('DIMOVERRIDE: ' + n + ' kích thước — ' + (key === '*' ? 'đã xoá ghi đè' : (OVR.find(x => x[2] === key) || [, , ''])[1] + ' = ' + val) + '.');
  });

  /* =====================================================================
     3) BLOCKREPLACE — thay mọi bản chèn của khối A bằng khối B (giữ vị trí, xoay, tỉ lệ, giá trị thuộc tính)
     ===================================================================== */
  const inv = m => { const det = m.a * m.d - m.b * m.c; if(Math.abs(det) < 1e-300) return null; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; };
  const mul = (M, N) => ({ a: M.a * N.a + M.c * N.b, b: M.b * N.a + M.d * N.b, c: M.a * N.c + M.c * N.d, d: M.b * N.c + M.d * N.d, e: M.a * N.e + M.c * N.f + M.e, f: M.b * N.e + M.d * N.f + M.f });
  const apM = (M, p) => ({ x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f });
  const isBlk = e => e && e.grp && e.bm && e.bm.name && !String(e.blk || '').startsWith('*');
  function blockReplace(srcName, sample){
    const mB = A.groupMembers(sample.grp), MB = sample.bm, iB = inv(MB); if(!iB) return 0;
    const loc = mB.map(x => { const w = A.xformEnt(copy(x), iB); delete w.grp; delete w.bm; delete w.bip; return w; }); const baseB = apM(iB, sample.bip || { x: MB.e, y: MB.f });
    const groups = new Map(); for(const e of modelEntities) if(e && e.grp && e.bm && e.bm.name === srcName){ let a = groups.get(e.grp); if(!a){ a = []; groups.set(e.grp, a); } a.push(e); }
    const del = [], add = [];
    for(const [gid, mem] of groups){ const MA = mem[0].bm, iA = inv(MA); if(!iA) continue; const bip = mem[0].bip || { x: MA.e, y: MA.f }; const baseA = apM(iA, bip);
      const M = mul(MA, { a: 1, b: 0, c: 0, d: 1, e: baseA.x - baseB.x, f: baseA.y - baseB.y }); const bm = Object.assign({}, MB, { a: M.a, b: M.b, c: M.c, d: M.d, e: M.e, f: M.f, lay: MA.lay || MB.lay });
      const vals = new Map(mem.filter(x => x.att).map(x => [x.att, x.text]));
      for(const x of loc){ const w = A.xformEnt(deep(x), M); w.grp = gid; w.blk = sample.blk; w.bm = bm; w.bip = { x: bip.x, y: bip.y }; if(w.att && vals.has(w.att)) w.text = vals.get(w.att); if(w.l0){ w.layer = mem[0].layer; if(w.bl) w.col = A.layerHex(w.layer); } add.push(w); }
      for(const x of mem) del.push(x); }
    if(add.length) A.commit({ del, add }, 'BLOCKREPLACE ' + srcName + ' → ' + MB.name);
    return groups.size;
  }
  A.blockReplace = blockReplace;
  cmd(['BLOCKREPLACE'], 'Thay mọi bản chèn của một khối bằng khối khác (giữ vị trí, xoay, tỉ lệ, giá trị thuộc tính)', async () => {
    const a = await A.getEnt('Chọn một khối cần thay', { filter: isBlk }); if(!a.ent) return; const src = a.ent.bm.name; hl(A.groupMembers(a.ent.grp));
    const b = await A.getEnt('Chọn khối thay thế', { filter: e => isBlk(e) && e.bm.name !== src }); hl([]); if(!b.ent) return;
    const n = blockReplace(src, b.ent); log('BLOCKREPLACE: thay ' + n + ' khối "' + src + '" bằng "' + b.ent.bm.name + '".');
  });

  /* =====================================================================
     4) MOCORO — dời / chép / xoay / tỉ lệ liên tiếp quanh một điểm gốc
     ===================================================================== */
  cmd(['MOCORO'], 'Dời, sao chép, xoay, tỉ lệ liên tiếp quanh một điểm gốc', async () => {
    const s = await A.getSel('Chọn đối tượng'); let sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const b = await A.getPoint('Điểm gốc'); if(!b.pt) return; let base = b.pt; let mode = 'M';
    const shift = (list, dx, dy) => list.map(e => { const w = copy(e); window.translateEnt(w, dx, dy); return w; });
    for(;;){
      const kw = [{ k: 'M', t: 'Dời' }, { k: 'C', t: 'Sao chép' }, { k: 'R', t: 'Xoay' }, { k: 'S', t: 'Tỉ lệ' }, { k: 'X', t: 'Thoát' }];
      if(mode === 'M' || mode === 'C'){
        const r = await A.getPoint(mode === 'M' ? 'Điểm đến (dời)' : 'Điểm đến (sao chép)', { base, kw, preview: (g, p) => g.shift(sel, p.x - base.x, p.y - base.y) });
        if(r.kw === 'X' || r.none) return; if(r.kw){ mode = r.kw; continue; } if(!r.pt) return;
        const dx = r.pt.x - base.x, dy = r.pt.y - base.y;
        if(mode === 'M'){ const ws = shift(sel, dx, dy); A.commit({ rep: sel.map((e, i) => [e, ws[i]]) }, 'MOCORO dời'); sel = ws; base = r.pt; }
        else { const ws = A.remapGroups ? A.remapGroups(shift(sel, dx, dy)) : shift(sel, dx, dy); A.commit({ add: ws }, 'MOCORO chép'); }
        continue; }
      if(mode === 'R'){ const a = await A.getAngle('Góc xoay', { base, kw }); if(a.kw === 'X' || a.none) return; if(a.kw){ mode = a.kw; continue; } if(a.num == null) return;
        const ws = sel.map(e => { const w = copy(e); window.rotateEnt(w, a.num, base); return w; }); A.commit({ rep: sel.map((e, i) => [e, ws[i]]) }, 'MOCORO xoay'); sel = ws; mode = 'M'; continue; }
      if(mode === 'S'){ const f = await A.getNum('Hệ số tỉ lệ', { def: 2, kw }); if(f.kw === 'X' || f.none) return; if(f.kw){ mode = f.kw; continue; } if(!(f.num > 0)) return;
        const ws = sel.map(e => { const w = copy(e); window.scaleEnt(w, f.num, base); return w; }); A.commit({ rep: sel.map((e, i) => [e, ws[i]]) }, 'MOCORO tỉ lệ'); sel = ws; mode = 'M'; continue; }
    }
  });

  /* =====================================================================
     5) TCASE — đổi chữ hoa / thường
     ===================================================================== */
  const vnLow = s => s.toLocaleLowerCase('vi'), vnUp = s => s.toLocaleUpperCase('vi');
  const CASES = { S: s => s.split('\n').map(l => { const t = vnLow(l); const i = t.search(/\p{L}/u); return i < 0 ? t : t.slice(0, i) + vnUp(t[i]) + t.slice(i + 1); }).join('\n'), L: vnLow, U: vnUp,
    T: s => vnLow(s).replace(/(^|[\s\-(/"'“])(\p{L})/gu, (m, a, c) => a + vnUp(c)), G: s => [...s].map(c => c === vnUp(c) ? vnLow(c) : vnUp(c)).join('') };
  A.tcase = (s, k) => (CASES[k] || (x => x))(String(s));
  cmd(['TCASE'], 'Đổi kiểu chữ: Câu / thường / HOA / Tiêu Đề / đẢO', async () => {
    const s = await A.getSel('Chọn chữ', { filter: e => e.type === 'TEXT' }); const sel = (s.sel || []).filter(e => e.type === 'TEXT' && !A.isLocked(e) && !e.dimd); if(!sel.length) return;
    const k = await A.getKw('Kiểu chữ', { kw: [{ k: 'S', t: 'Câu' }, { k: 'L', t: 'thường' }, { k: 'U', t: 'HOA' }, { k: 'T', t: 'Tiêu Đề' }, { k: 'G', t: 'đẢO' }], def: 'HOA' }); const key = k.kw || 'U';
    const rep = []; for(const e of sel){ const t = A.tcase(e.text || '', key); if(t !== e.text){ const w = copy(e); w.text = t; rep.push([e, w]); } }
    if(rep.length) A.commit({ rep }, 'TCASE'); log('TCASE: đổi ' + rep.length + ' chữ.');
  });

  /* =====================================================================
     6) CDORDER — sắp thứ tự vẽ theo màu
     ===================================================================== */
  cmd(['CDORDER'], 'Sắp thứ tự hiển thị theo màu (màu đứng đầu danh sách nằm trên cùng)', async () => {
    const s = await A.getSel('Chọn đối tượng (Enter = tất cả)'); let sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) sel = modelEntities.filter(e => e && !A.isLocked(e) && !e.xr);
    const aci = e => A.aciNear(e.col || '#ffffff'); const cols = [...new Set(sel.map(aci))].sort((a, b) => a - b);
    const r = await A.getStr('Thứ tự màu (ACI), màu đầu nằm trên cùng', { def: cols.join(',') }); const ord = String(r.str || cols.join(',')).split(/[,;\s]+/).map(Number).filter(n => n >= 0 && n <= 256);
    for(const c of cols) if(!ord.includes(c)) ord.push(c);
    const base = Math.max(0, ...modelEntities.map(e => e.dord | 0)) + ord.length + 1;
    const rep = sel.map(e => { const w = copy(e); w.dord = base - ord.indexOf(aci(e)); return [e, w]; });
    A.commit({ rep }, 'CDORDER'); log('CDORDER: ' + rep.length + ' đối tượng theo thứ tự màu ' + ord.join(', ') + ' (đầu = trên cùng).');
  });

  /* =====================================================================
     7) HATCH: tạo biên / đặt lại biên
     ===================================================================== */
  cmd(['HATCHGENERATEBOUNDARY', 'HGB'], 'Tạo đa tuyến kín theo biên của hatch', async () => {
    const s = await A.getSel('Chọn hatch', { filter: e => e.type === 'HATCH' }); const sel = (s.sel || []).filter(e => e.type === 'HATCH'); if(!sel.length) return;
    const add = []; for(const h of sel) for(const lp of (h.loops || [])){ if(lp.length < 3) continue; const e = { type: 'POLYLINE', closed: true, vertices: lp.map(p => ({ x: p.x, y: p.y })), layer: h.layer, col: h.col }; if(h.bl) e.bl = 1; add.push(e); }
    if(add.length) A.commit({ add }, 'Đã tạo ' + add.length + ' biên hatch'); log('HATCHGENERATEBOUNDARY: ' + add.length + ' đa tuyến biên.');
  });
  cmd(['HATCHSETBOUNDARY', 'HSB'], 'Đặt lại biên của hatch theo đối tượng kín khác (đối tượng đầu = biên ngoài, còn lại = lỗ)', async () => {
    const h = await A.getEnt('Chọn hatch', { filter: e => e.type === 'HATCH' }); if(!h.ent) return; hl([h.ent]);
    const s = await A.getSel('Chọn đối tượng kín làm biên mới', { filter: e => /^(CIRCLE|ELLIPSE|POLYLINE)$/.test(e.type) }); hl([]);
    const loops = []; for(const e of (s.sel || [])){ const p = pathOf(e); if(p && p.closed && p.P.length >= 3) loops.push(p.P); } if(!loops.length){ log('Cần chọn ít nhất 1 đối tượng kín.'); return; }
    loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
    const w = copy(h.ent); w.loops = loops; A.commit({ rep: [[h.ent, w]] }, 'Đã đặt lại biên hatch'); log('HATCHSETBOUNDARY: biên mới ' + loops.length + ' vòng.');
  });

  /* =====================================================================
     8) LAYTRANS — chuyển lớp theo bảng ánh xạ (chuẩn hoá tên lớp), lưu / dùng lại bảng
     ===================================================================== */
  const LTK = 'dvd:laytrans';
  const ltMaps = () => { try{ return JSON.parse(localStorage.getItem(LTK) || '{}'); }catch(_){ return {}; } };
  function layTrans(map){
    const lays = A.layerNames(); const rep = []; const moved = new Set();
    for(const [from, to0] of Object.entries(map)){ const to = String(to0 || '').trim(); if(!to || to === from || !lays.includes(from)) continue; if(!A.layerNames().includes(to)){ A.addLayer(to, A.layerHex(from)); } moved.add(from); }
    for(const e of modelEntities){ if(!e || e.xr) continue; const L = e.layer || '0'; if(!moved.has(L)) continue; const to = String(map[L]).trim(); const w = copy(e); w.layer = to; if(w.bl) w.col = A.layerHex(to); rep.push([e, w]); }
    if(rep.length) A.commit({ rep }, 'LAYTRANS'); for(const l of moved) if(l !== '0'){ try{ A.deleteLayer(l); }catch(_){} }
    return { n: rep.length, layers: moved.size };
  }
  A.layTrans = layTrans;
  plain(['LAYTRANS'], 'Chuyển lớp theo bảng ánh xạ (đổi tên / gộp lớp theo chuẩn), lưu bảng để dùng cho bản vẽ khác', () => { if(A.busy && A.busy()) A.cancel(true);
    const lays = A.layerNames(); const saved = ltMaps(); const cnt = {}; for(const e of modelEntities) if(e){ const L = e.layer || '0'; cnt[L] = (cnt[L] || 0) + 1; }
    A.dialog({ title: 'Chuyển lớp (LAYTRANS)', wide: true, okText: 'Chuyển', html:
      '<label class="dvd-frow"><span>Bảng đã lưu</span><span class="v"><select id="ltSaved"><option value="">—</option>' + Object.keys(saved).map(n => '<option>' + esc(n) + '</option>').join('') + '</select> <button type="button" id="ltSave">Lưu bảng…</button></span></label>' +
      '<div class="lm-tbl" style="max-height:50vh;overflow:auto"><table><thead><tr><th>Lớp hiện có</th><th>Số đối tượng</th><th style="width:50%">Chuyển sang lớp</th></tr></thead><tbody>' +
      lays.map(n => '<tr><td>' + esc(n) + '</td><td>' + (cnt[n] || 0) + '</td><td><input data-l="' + esc(n) + '" list="ltL" style="width:100%" placeholder="(giữ nguyên)"></td></tr>').join('') + '</tbody></table></div><datalist id="ltL">' + lays.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
      '<p style="opacity:.75;font-size:12px;margin:6px 0 0">Nhập tên lớp đích (có sẵn hoặc mới). Nhiều lớp cùng đích = gộp lớp. Lớp nguồn rỗng sau khi chuyển sẽ bị xoá.</p>',
      onOpen: root => { const get = () => { const m = {}; root.querySelectorAll('input[data-l]').forEach(i => { if(i.value.trim()) m[i.dataset.l] = i.value.trim(); }); return m; }; root._get = get;
        root.querySelector('#ltSaved').addEventListener('change', ev => { const m = ltMaps()[ev.target.value] || {}; root.querySelectorAll('input[data-l]').forEach(i => { i.value = m[i.dataset.l] || ''; }); });
        root.querySelector('#ltSave').addEventListener('click', () => { const n = prompt('Tên bảng ánh xạ:', root.querySelector('#ltSaved').value || 'Chuẩn lớp'); if(!n) return; const all = ltMaps(); all[n] = Object.assign({}, all[n] || {}, get()); try{ localStorage.setItem(LTK, JSON.stringify(all)); }catch(_){} say('Đã lưu bảng "' + n + '"'); }); },
      ok: root => { const r = layTrans(root._get()); log('LAYTRANS: chuyển ' + r.n + ' đối tượng từ ' + r.layers + ' lớp.'); say('Đã chuyển ' + r.layers + ' lớp'); } });
  });

  /* =====================================================================
     9) Lệnh nhỏ: SHOWURLS · GETSEL · SSX · XPLODE · ARRAYCLASSIC
     ===================================================================== */
  // đặt tập chọn sau khi lệnh kết thúc (lệnh xong sẽ xoá tập chọn tạm)
  const selectLater = hit => { const go = () => { selEnts.clear(); for(const e of hit) selEnts.add(e); try{ refreshPanSel(); }catch(_){} A.paint(); }; go(); setTimeout(go, 0); };
  plain(['SHOWURLS'], 'Danh sách đối tượng có siêu liên kết (URL): phóng tới, mở link', () => {
    const L = modelEntities.filter(e => e && e.url); if(!L.length){ say('Bản vẽ không có siêu liên kết nào (HYPERLINK để gắn).'); return; }
    A.dialog({ title: 'Siêu liên kết (SHOWURLS)', wide: true, html: '<div class="lm-tbl" style="max-height:55vh;overflow:auto"><table><thead><tr><th>Liên kết</th><th>Đối tượng</th><th>Lớp</th><th></th></tr></thead><tbody>' + L.map((e, i) => '<tr><td style="word-break:break-all">' + esc(e.url) + '</td><td>' + esc(e.type) + '</td><td>' + esc(e.layer || '0') + '</td><td><button type="button" data-z="' + i + '">Phóng tới</button> <button type="button" data-o="' + i + '">Mở</button></td></tr>').join('') + '</tbody></table></div>',
      onOpen: root => root.addEventListener('click', ev => { const z = ev.target.closest('[data-z]'), o = ev.target.closest('[data-o]');
        if(z){ const e = L[+z.dataset.z]; const b = entBBox(e); if(b){ const m = Math.max(b.x1 - b.x0, b.y1 - b.y0, 1) * 0.6; zoomToWorldRect(b.x0 - m, b.y0 - m, b.x1 + m, b.y1 + m); selEnts.clear(); selEnts.add(e); A.paint(); } }
        if(o){ const u = String(L[+o.dataset.o].url); if(/^(https?:|mailto:|tel:)/i.test(u)) window.open(u, '_blank', 'noopener'); else say('Liên kết không phải web: ' + u); } }) });
  });
  cmd(['GETSEL'], 'Chọn theo lớp và loại đối tượng mẫu', async () => {
    const a = await A.getEnt('Chọn đối tượng trên lớp cần lấy (Enter = mọi lớp)'); const lay = a.ent ? (a.ent.layer || '0') : null;
    const b = await A.getEnt('Chọn đối tượng mẫu cho loại (Enter = mọi loại)'); const ty = b.ent ? b.ent.type : null;
    const hit = (A.selectable ? A.selectable() : modelEntities).filter(e => e && (!lay || (e.layer || '0') === lay) && (!ty || e.type === ty) && !A.isLocked(e));
    selectLater(hit); log('GETSEL: ' + hit.length + ' đối tượng (' + (lay ? 'lớp ' + lay : 'mọi lớp') + ', ' + (ty || 'mọi loại') + ').');
  });
  cmd(['SSX'], 'Chọn theo đối tượng mẫu: cùng loại và cùng lớp / màu / kiểu nét (tuỳ chọn)', async () => {
    const a = await A.getEnt('Chọn đối tượng mẫu'); if(!a.ent) return; const m = a.ent;
    const k = await A.getKw('Lọc thêm theo', { kw: [{ k: 'L', t: 'Lớp' }, { k: 'C', t: 'Màu' }, { k: 'T', t: 'Kiểu nét' }, { k: 'A', t: 'Lớp + màu' }, { k: 'N', t: 'Chỉ loại' }], def: 'Lớp' }); const how = k.kw || 'L';
    const col = e => String(e.col || '').toLowerCase(); const lt = e => String(e.lt || '').toUpperCase();
    const hit = (A.selectable ? A.selectable() : modelEntities).filter(e => e && e.type === m.type && !A.isLocked(e) && (how === 'N' || ((how !== 'L' && how !== 'A') || (e.layer || '0') === (m.layer || '0')) && ((how !== 'C' && how !== 'A') || col(e) === col(m)) && (how !== 'T' || lt(e) === lt(m))));
    selectLater(hit); log('SSX: ' + hit.length + ' đối tượng.');
  });
  plain(['XPLODE'], 'Phá khối / đa tuyến / hatch (như EXPLODE)', () => DVDCmd.run('EXPLODE'));
  plain(['ARRAYCLASSIC'], 'Mảng kiểu cũ (hộp thoại chữ nhật / tròn)', () => DVDCmd.run('ARRAY'));

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
