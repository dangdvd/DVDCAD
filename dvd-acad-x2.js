/* DVDCAD v4j — bổ sung lệnh còn thiếu so với AutoCAD
   2D: MLINE / MLSTYLE, DIMORDINATE, DIMARC, CENTERMARK, CENTERLINE, ARRAYPATH, BLEND, REVERSE, SETBYLAYER,
       SCALETEXT, JUSTIFYTEXT, TXT2MTXT, LAYMRG, LAYDEL, VIEW (góc nhìn 2D đặt tên), CAL, PUBLISH
   3D: MASSPROP, INTERFERE, 3DARRAY, SOLIDEDIT/SHELL */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x2 || !window.DVDCmd) return; A._x2 = true;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const MEM = A.MEM || (A.MEM = {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const fmtN = v => String(+(+v).toFixed(4));
  const ltIf = n => { try{ if(window.LTYPES && LTYPES[n]) return n; if(A.loadLT && A.loadLT(n)) return n; }catch(_){} return null; };

  /* ====================== MLINE (đường đôi: tường) ====================== */
  const MLS = Object.assign({ offs: [0.5, -0.5], caps: true, name: 'STANDARD' }, (() => { try{ return JSON.parse(localStorage.getItem('dvd:mlstyle') || '{}'); }catch(_){ return {}; } })());
  A.MLINESTYLE = MLS;
  function offsetOpen(P, o, closed){
    const n = P.length, out = [];
    for(let i = 0; i < n; i++){
      const prev = closed ? P[(i - 1 + n) % n] : P[i - 1], next = closed ? P[(i + 1) % n] : P[i + 1], p = P[i];
      const nrm = (a, b) => { const L = dist(a, b) || 1; return { x: -(b.y - a.y) / L, y: (b.x - a.x) / L }; };
      if(!prev){ const m = nrm(p, next); out.push({ x: p.x + m.x * o, y: p.y + m.y * o }); continue; }
      if(!next){ const m = nrm(prev, p); out.push({ x: p.x + m.x * o, y: p.y + m.y * o }); continue; }
      const n1 = nrm(prev, p), n2 = nrm(p, next), den = 1 + n1.x * n2.x + n1.y * n2.y;
      if(den < 0.05) out.push({ x: p.x + n1.x * o, y: p.y + n1.y * o }); else out.push({ x: p.x + (n1.x + n2.x) * o / den, y: p.y + (n1.y + n2.y) * o / den });
    }
    return out;
  }
  function mlineEnts(P, closed, S, just){
    const offs = MLS.offs.map(v => v * S), mx = Math.max(...offs), mn = Math.min(...offs);
    const sh = just === 'T' ? -mx : just === 'B' ? -mn : 0; const lines = offs.map(o => offsetOpen(P, o + sh, closed));
    const rk = offs.map((o, i) => i).sort((i, j) => offs[i] - offs[j]); const mlk = []; rk.forEach((i, r) => { mlk[i] = r; });   // mlk: thứ tự đường từ phải sang trái (cho MLEDIT)
    const out = lines.map((v, i) => ({ type: 'POLYLINE', closed, vertices: v, mlk: mlk[i] }));
    // nắp đầu / cuối (capS / capE như Caps Start / End của MLSTYLE; kiểu cũ chỉ có caps)
    if(!closed && lines.length > 1){ const iT = offs.indexOf(mx), iB = offs.indexOf(mn); for(const k of [0, P.length - 1]){ const on = k === 0 ? (MLS.capS != null ? MLS.capS : MLS.caps) : (MLS.capE != null ? MLS.capE : MLS.caps); if(on) out.push({ type: 'LINE', x1: lines[iT][k].x, y1: lines[iT][k].y, x2: lines[iB][k].x, y2: lines[iB][k].y }); } }
    return out;
  }
  cmd(['MLINE', 'ML'], 'Đường đôi (tường, đường ống) — canh lề, tỉ lệ, kiểu', async () => {
    let S = MEM.mlS || 220, J = MEM.mlJ || 'Z';
    const jN = { T: 'Trên', Z: 'Giữa', B: 'Dưới' };
    for(;;){
      log('MLINE: canh lề = ' + jN[J] + ', tỉ lệ = ' + S + ', kiểu = ' + MLS.name + ' (' + MLS.offs.join(', ') + ')');
      const r = await A.getPoint('Điểm đầu', { kw: [{ k: 'J', t: 'Canh lề' }, { k: 'S', t: 'Tỉ lệ' }, { k: 'ST', t: 'Kiểu' }] });
      if(r.kw === 'J'){ const k = await A.getKw('Canh lề', { kw: [{ k: 'T', t: 'Trên' }, { k: 'Z', t: 'Giữa' }, { k: 'B', t: 'Dưới' }], def: jN[J] }); if(k.kw) J = MEM.mlJ = k.kw; continue; }
      if(r.kw === 'S'){ const v = await A.getNum('Tỉ lệ (bề rộng = tỉ lệ × khoảng cách các đường)', { def: S }); if(v.num > 0) S = MEM.mlS = v.num; continue; }
      if(r.kw === 'ST'){ A.cancel(true); DVDCmd.run('MLSTYLE'); return; }
      if(!r.pt) return;
      const P = [r.pt]; let closed = false;
      for(;;){
        const q = await A.getPoint('Điểm tiếp theo', { base: P[P.length - 1], kw: P.length >= 3 ? [{ k: 'C', t: 'Đóng' }, { k: 'U', t: 'Bỏ đoạn' }] : [{ k: 'U', t: 'Bỏ đoạn' }],
          preview: (g, p) => { for(const e of mlineEnts(P.concat([p]), false, S, J)){ if(e.type === 'POLYLINE') g.poly(e.vertices, false); else g.line({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }); } } });
        if(q.kw === 'U'){ if(P.length > 1) P.pop(); continue; } if(q.kw === 'C'){ closed = true; break; } if(!q.pt) break; if(dist(q.pt, P[P.length - 1]) > 1e-9) P.push(q.pt);
      }
      if(P.length < 2) return;
      const gid = A.newGroupId('ML'); const ents = mlineEnts(P, closed, S, J).map(e => { A.newProps(e); e.grp = gid; e.blk = '*MLINE'; return e; });
      A.commit({ add: ents }, 'Đã vẽ đường đôi'); log('MLINE: ' + (P.length - (closed ? 0 : 1)) + ' đoạn (một nhóm — EXPLODE để sửa từng nét).'); return;
    }
  });
  plain(['MLSTYLE'], 'Kiểu đường đôi: khoảng cách các đường, nắp đầu', () => {
    A.dialog({ title: 'Kiểu đường đôi (MLSTYLE)', html: '<label style="display:block;margin:6px 0">Tên <input id="mlN" value="' + esc(MLS.name) + '" style="width:60%"></label><label style="display:block;margin:6px 0">Vị trí các đường (theo tỉ lệ 1, cách nhau bằng dấu phẩy) <input id="mlO" value="' + esc(MLS.offs.join(', ')) + '" style="width:100%"></label><label><input type="checkbox" id="mlC"' + (MLS.caps ? ' checked' : '') + '> Nắp đầu & cuối</label><p style="opacity:.75;font-size:12px">Ví dụ tường 2 lớp: 0.5, -0.5 · tường có lớp trát: 0.5, 0.42, -0.42, -0.5</p>',
      ok: root => { const o = root.querySelector('#mlO').value.split(/[,;\s]+/).map(Number).filter(isFinite); if(o.length < 1){ say('Cần ít nhất 1 đường.'); return false; } MLS.offs = o; MLS.caps = root.querySelector('#mlC').checked; MLS.name = root.querySelector('#mlN').value.trim() || 'STANDARD'; try{ localStorage.setItem('dvd:mlstyle', JSON.stringify(MLS)); }catch(_){} log('Kiểu MLINE "' + MLS.name + '": ' + MLS.offs.join(', ')); } });
  });

  /* ====================== kích thước bổ sung ====================== */
  const T = () => A.dimTxt ? A.dimTxt() : 2.5;
  const mkText = (x, y, text, rot, ha, va) => ({ type: 'TEXT', x, y, text, h: T(), rot: rot || 0, ha: ha || 'center', va: va || 'alphabetic' });
  cmd(['DIMORDINATE', 'DOR', 'DIMORD'], 'Kích thước toạ độ (X hoặc Y so với gốc)', async () => {
    const O = MEM.ordO || { x: 0, y: 0 };
    for(;;){
      const a = await A.getPoint('Điểm cần ghi toạ độ', { kw: [{ k: 'G', t: 'Đặt gốc' }] });
      if(a.kw === 'G'){ const g = await A.getPoint('Điểm gốc toạ độ (0,0)'); if(g.pt){ MEM.ordO = g.pt; log('Gốc toạ độ mới: (' + fmtN(g.pt.x) + ', ' + fmtN(g.pt.y) + ')'); } return; }
      if(!a.pt) return;
      const b = await A.getPoint('Điểm đặt chữ (kéo ngang → toạ độ Y, kéo dọc → toạ độ X)', { base: a.pt, kw: [{ k: 'X', t: 'Toạ độ X' }, { k: 'Y', t: 'Toạ độ Y' }] });
      let mode = null, end = b.pt; if(b.kw){ mode = b.kw; const c = await A.getPoint('Điểm đặt chữ', { base: a.pt }); if(!c.pt) return; end = c.pt; } if(!end) return;
      if(!mode) mode = Math.abs(end.x - a.pt.x) > Math.abs(end.y - a.pt.y) ? 'Y' : 'X';
      const t = T(), val = mode === 'X' ? a.pt.x - O.x : a.pt.y - O.y, txt = A.dimFmt ? A.dimFmt(val) : fmtN(val), ents = [];
      if(mode === 'X'){ const s = Math.sign(end.y - a.pt.y) || 1; ents.push({ type: 'POLYLINE', closed: false, vertices: [{ x: a.pt.x + 0, y: a.pt.y + s * t * 0.6 }, { x: a.pt.x, y: end.y }] }); ents.push(mkText(a.pt.x, end.y + s * t * 0.3, txt, 90, s > 0 ? 'left' : 'right', 'middle')); }
      else { const s = Math.sign(end.x - a.pt.x) || 1; ents.push({ type: 'POLYLINE', closed: false, vertices: [{ x: a.pt.x + s * t * 0.6, y: a.pt.y }, { x: end.x, y: a.pt.y }] }); ents.push(mkText(end.x + s * t * 0.3, a.pt.y, txt, 0, s > 0 ? 'left' : 'right', 'middle')); }
      A.commit({ add: A.finishDim(ents, val, 'toạ độ') }, 'Kích thước toạ độ ' + mode);
    }
  });
  cmd(['DIMARC', 'DAR'], 'Kích thước chiều dài cung', async () => {
    const r = await A.getEnt('Chọn cung tròn', { filter: e => e.type === 'ARC' }); const e = r.ent; if(!e || e.type !== 'ARC') return;
    const L = await A.getPoint('Vị trí đường kích thước', { base: { x: e.cx, y: e.cy }, rubber: false, preview: (g, p) => { const R = Math.hypot(p.x - e.cx, p.y - e.cy); g.poly(smpArc(e.cx, e.cy, R, e.a1, e.a2), false); } }); if(!L.pt) return;
    const t = T(), R = Math.max(Math.hypot(L.pt.x - e.cx, L.pt.y - e.cy), t), a1 = e.a1 * D2R; let a2 = e.a2 * D2R; while(a2 <= a1) a2 += TAU;
    const len = e.r * (a2 - a1), ents = [{ type: 'ARC', cx: e.cx, cy: e.cy, r: R, a1: e.a1, a2: e.a2 }], exo = t * 0.6, exe = t * 0.8;
    for(const a of [a1, a2]){ const d = R >= e.r ? 1 : -1; ents.push({ type: 'LINE', x1: e.cx + (e.r + d * exo) * Math.cos(a), y1: e.cy + (e.r + d * exo) * Math.sin(a), x2: e.cx + (R + d * exe) * Math.cos(a), y2: e.cy + (R + d * exe) * Math.sin(a) }); }
    if(A.arrowAt){ A.arrowAt({ x: e.cx + R * Math.cos(a1), y: e.cy + R * Math.sin(a1) }, Math.sin(a1), -Math.cos(a1), t, ents); A.arrowAt({ x: e.cx + R * Math.cos(a2), y: e.cy + R * Math.sin(a2) }, -Math.sin(a2), Math.cos(a2), t, ents); }
    const am = (a1 + a2) / 2, rot = A.dimReadable ? A.dimReadable(am * R2D - 90) : am * R2D - 90; const up = ((am * R2D - 90 - rot) % 360 + 360) % 360 > 90 ? -1 : 1;
    ents.push(mkText(e.cx + (R + up * t * 0.5) * Math.cos(am), e.cy + (R + up * t * 0.5) * Math.sin(am), '⌒' + (A.dimFmt ? A.dimFmt(len) : fmtN(len)), rot, 'center', 'alphabetic'));
    A.commit({ add: A.finishDim(ents, len, 'cung') }, 'Kích thước cung');
  });
  cmd(['CENTERMARK', 'CM', 'DIMCENTER', 'DCE'], 'Dấu tâm cho đường tròn / cung', async () => {
    const lt = ltIf('CENTER');
    for(;;){
      const r = await A.getEnt('Chọn đường tròn hoặc cung (Enter để xong)', { filter: e => e.type === 'CIRCLE' || e.type === 'ARC' }); const e = r.ent; if(!e) return;
      const s = Math.min(e.r * 0.25, T() * 1.2), ext = e.r + T() * 1.2, gid = A.newGroupId('CM'), out = [];
      out.push({ type: 'LINE', x1: e.cx - s, y1: e.cy, x2: e.cx + s, y2: e.cy }, { type: 'LINE', x1: e.cx, y1: e.cy - s, x2: e.cx, y2: e.cy + s });
      for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) out.push({ type: 'LINE', x1: e.cx + dx * s * 1.4, y1: e.cy + dy * s * 1.4, x2: e.cx + dx * ext, y2: e.cy + dy * ext, _ext: 1 });
      A.commit({ add: out.map(x => { A.newProps(x); x.grp = gid; x.blk = '*CENTERMARK'; if(x._ext){ delete x._ext; if(lt) x.lt = lt; } return x; }) }, 'Dấu tâm');
    }
  });
  cmd(['CENTERLINE', 'CL'], 'Đường tâm giữa 2 đường thẳng', async () => {
    const r1 = await A.getEnt('Chọn đường thứ nhất', { filter: e => e.type === 'LINE' }); if(!r1.ent) return;
    const r2 = await A.getEnt('Chọn đường thứ hai', { filter: e => e.type === 'LINE' && e !== r1.ent }); if(!r2.ent) return;
    const a = r1.ent, b = r2.ent; let b1 = { x: b.x1, y: b.y1 }, b2 = { x: b.x2, y: b.y2 };
    if((a.x2 - a.x1) * (b2.x - b1.x) + (a.y2 - a.y1) * (b2.y - b1.y) < 0){ const t = b1; b1 = b2; b2 = t; }
    const p = { x: (a.x1 + b1.x) / 2, y: (a.y1 + b1.y) / 2 }, q = { x: (a.x2 + b2.x) / 2, y: (a.y2 + b2.y) / 2 }, L = dist(p, q) || 1, ux = (q.x - p.x) / L, uy = (q.y - p.y) / L, ex = T() * 1.2;
    const e = { type: 'LINE', x1: p.x - ux * ex, y1: p.y - uy * ex, x2: q.x + ux * ex, y2: q.y + uy * ex }; A.newProps(e); const lt = ltIf('CENTER'); if(lt) e.lt = lt;
    A.commit({ add: [e] }, 'Đường tâm');
  });

  /* ====================== ARRAYPATH / BLEND / REVERSE / SETBYLAYER ====================== */
  function pathPts(e){
    if(e.type === 'LINE') return { P: [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }], closed: false };
    if(e.type === 'POLYLINE') return { P: (e.vertices || []).map(p => ({ x: p.x, y: p.y })), closed: !!e.closed };
    if(e.type === 'ARC') return { P: smpArc(e.cx, e.cy, e.r, e.a1, e.a2), closed: false };
    if(e.type === 'CIRCLE') return { P: smpCircle(e.cx, e.cy, e.r).slice(0, -1), closed: true };
    if(e.type === 'ELLIPSE'){ try{ return { P: smpEllipse(e), closed: false }; }catch(_){ return null; } }
    return null;
  }
  A.pathPts = e => pathPts(e); A.pathAt = pp => pathAt(pp);
  function pathAt(pp){ const P = pp.closed ? pp.P.concat([pp.P[0]]) : pp.P; const cum = [0]; for(let i = 1; i < P.length; i++) cum.push(cum[i - 1] + dist(P[i - 1], P[i]));
    const total = cum[cum.length - 1]; return { total, at(d){ d = Math.max(0, Math.min(total, d)); let i = 1; while(i < P.length - 1 && cum[i] < d) i++; const a = P[i - 1], b = P[i], seg = (cum[i] - cum[i - 1]) || 1, t = (d - cum[i - 1]) / seg; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ang: Math.atan2(b.y - a.y, b.x - a.x) }; } }; }
  cmd(['ARRAYPATH', 'ARPATH'], 'Mảng theo đường dẫn (cột dọc trục cong, cây dọc đường…)', async () => {
    const s = await A.getSel('Chọn đối tượng cần sao chép'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const pr = await A.getEnt('Chọn đường dẫn (đường thẳng, đa tuyến, cung, tròn)', { filter: e => !!pathPts(e) }); if(!pr.ent) return;
    const pp = pathPts(pr.ent), PA = pathAt(pp);
    let bx = Infinity, by = Infinity, cx = -Infinity, cy = -Infinity; for(const e of sel){ const b = entBBox(e); if(!b) continue; bx = Math.min(bx, b.x0); by = Math.min(by, b.y0); cx = Math.max(cx, b.x1); cy = Math.max(cy, b.y1); }
    const bp = await A.getPoint('Điểm gốc của đối tượng (Enter = tâm nhóm)'); const base = bp.pt || { x: (bx + cx) / 2, y: (by + cy) / 2 };
    const mk2 = await A.getKw('Cách chia', { kw: [{ k: 'D', t: 'Chia đều số lượng' }, { k: 'K', t: 'Theo khoảng cách' }], def: 'Chia đều số lượng' });
    let N, step;
    if(mk2.kw === 'K'){ const d = await A.getDist('Khoảng cách giữa các bản sao', { def: MEM.apd || PA.total / 5 }); step = d.num > 0 ? d.num : (MEM.apd || PA.total / 5); MEM.apd = step; N = Math.floor(PA.total / step + 1e-9) + 1; }
    else { const n = await A.getNum('Số bản sao (kể cả bản đầu)', { def: MEM.apn || 6 }); N = Math.max(2, Math.round(n.num || MEM.apn || 6)); MEM.apn = N; step = pp.closed ? PA.total / N : PA.total / (N - 1); }
    const al = await A.getKw('Xoay theo hướng đường dẫn?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Có' }); const align = al.kw !== 'K';
    const a0 = PA.at(0).ang, add = [];
    for(let i = 0; i < N; i++){ const q = PA.at(i * step); for(const e of sel){ const w = copy(e); delete w.grp; window.translateEnt(w, q.x - base.x, q.y - base.y); if(align && Math.abs(q.ang - a0) > 1e-12) window.rotateEnt(w, (q.ang - a0) * R2D, { x: q.x, y: q.y }); if(i === 0 && Math.abs(q.x - base.x) + Math.abs(q.y - base.y) < 1e-9 && !(align && Math.abs(q.ang - a0) > 1e-12)) continue; A.newProps(w); w.layer = e.layer; w.col = e.col; if(e.bl) w.bl = 1; add.push(w); } }
    if(!(A.arrCommit && A.arrCommit(sel, add, { k: 'A', N, step, align, base: { x: base.x, y: base.y }, pp: { P: pp.P.map(q => ({ x: q.x, y: q.y })), closed: !!pp.closed } }, 'Mảng theo đường: ' + N + ' bản'))) A.commit({ add }, 'Mảng theo đường: ' + N + ' bản'); log('ARRAYPATH: ' + N + ' vị trí, khoảng cách ' + fmtN(step) + ' dọc đường dài ' + fmtN(PA.total) + '.');
  });
  function endInfo(e, pick){ const pp = pathPts(e); if(!pp || pp.closed) return null; const P = pp.P, a = P[0], b = P[P.length - 1]; const atStart = dist(pick, a) < dist(pick, b);
    if(atStart){ const n = P[1]; const L = dist(a, n) || 1; return { p: a, d: { x: (a.x - n.x) / L, y: (a.y - n.y) / L } }; } const n = P[P.length - 2]; const L = dist(b, n) || 1; return { p: b, d: { x: (b.x - n.x) / L, y: (b.y - n.y) / L } }; }
  cmd(['BLEND', 'BLENDCURVES'], 'Nối 2 đường bằng đường cong trơn (tiếp tuyến)', async () => {
    const r1 = await A.getEnt('Chọn đường thứ nhất (gần đầu cần nối)', { filter: e => !!pathPts(e) && !pathPts(e).closed }); if(!r1.ent) return;
    const r2 = await A.getEnt('Chọn đường thứ hai (gần đầu cần nối)', { filter: e => !!pathPts(e) && !pathPts(e).closed && e !== r1.ent }); if(!r2.ent) return;
    const A1 = endInfo(r1.ent, r1.pt || { x: 0, y: 0 }), B1 = endInfo(r2.ent, r2.pt || { x: 0, y: 0 }); if(!A1 || !B1) return;
    const D = dist(A1.p, B1.p), k = D / 3, c1 = { x: A1.p.x + A1.d.x * k, y: A1.p.y + A1.d.y * k }, c2 = { x: B1.p.x + B1.d.x * k, y: B1.p.y + B1.d.y * k }, V = [];
    for(let i = 0; i <= 32; i++){ const t = i / 32, u = 1 - t; V.push({ x: u * u * u * A1.p.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * B1.p.x, y: u * u * u * A1.p.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * B1.p.y }); }
    const e = { type: 'POLYLINE', closed: false, vertices: V }; A.newProps(e); A.commit({ add: [e] }, 'Đã nối cong');
  });
  cmd(['REVERSE'], 'Đảo chiều đường / đa tuyến', async () => {
    const s = await A.getSel('Chọn đường, đa tuyến, cung'); const sel = (s.sel || []).filter(e => /^(LINE|POLYLINE|ARC)$/.test(e.type) && !A.isLocked(e)); if(!sel.length) return;
    A.commit({ rep: sel.map(e => { const w = copy(e); if(w.type === 'LINE'){ [w.x1, w.x2, w.y1, w.y2] = [w.x2, w.x1, w.y2, w.y1]; } else if(w.type === 'POLYLINE'){ if(!A.bvReverse(w, !!w.closed)) w.vertices.reverse(); } return [e, w]; }) }, 'Đã đảo chiều ' + sel.length);
  });
  cmd(['SETBYLAYER', 'SETBYL'], 'Đặt màu, kiểu nét, bề rộng nét về ByLayer', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    A.commit({ rep: sel.map(e => { const w = copy(e); w.bl = 1; w.col = A.layerHex(w.layer || '0'); delete w.lt; delete w.lw; delete w.lts; return [e, w]; }) }, 'ByLayer cho ' + sel.length + ' đối tượng');
  });

  /* ====================== chữ ====================== */
  cmd(['SCALETEXT'], 'Đổi cỡ nhiều chữ cùng lúc (giữ điểm đặt)', async () => {
    const s = await A.getSel('Chọn chữ', { filter: e => e.type === 'TEXT' }); const sel = (s.sel || []).filter(e => e.type === 'TEXT' && !A.isLocked(e)); if(!sel.length) return;
    const k = await A.getKw('Cách đổi', { kw: [{ k: 'H', t: 'Chiều cao mới' }, { k: 'S', t: 'Hệ số tỉ lệ' }], def: 'Chiều cao mới' });
    if(k.kw === 'S'){ const f = await A.getNum('Hệ số', { def: 1.5 }); if(!(f.num > 0)) return; A.commit({ rep: sel.map(e => { const w = copy(e); w.h *= f.num; return [e, w]; }) }, 'Đổi cỡ ' + sel.length + ' chữ'); }
    else { const h = await A.getDist('Chiều cao chữ mới', { def: sel[0].h }); const H = h.num > 0 ? h.num : sel[0].h; A.commit({ rep: sel.map(e => { const w = copy(e); w.h = H; return [e, w]; }) }, 'Đổi cỡ ' + sel.length + ' chữ'); }
  });
  cmd(['JUSTIFYTEXT'], 'Đổi canh lề chữ mà chữ không bị xê dịch', async () => {
    const s = await A.getSel('Chọn chữ', { filter: e => e.type === 'TEXT' }); const sel = (s.sel || []).filter(e => e.type === 'TEXT' && !A.isLocked(e)); if(!sel.length) return;
    const k = await A.getKw('Canh lề mới', { kw: [{ k: 'L', t: 'Trái' }, { k: 'C', t: 'Giữa' }, { k: 'R', t: 'Phải' }, { k: 'M', t: 'Chính giữa' }, { k: 'TL', t: 'Trên trái' }, { k: 'TC', t: 'Trên giữa' }, { k: 'BL', t: 'Chân trái' }] }); if(!k.kw) return;
    const J = { L: ['left', 'alphabetic'], C: ['center', 'alphabetic'], R: ['right', 'alphabetic'], M: ['center', 'middle'], TL: ['left', 'top'], TC: ['center', 'top'], BL: ['left', 'alphabetic'] }[k.kw];
    A.commit({ rep: sel.map(e => { const w = copy(e); const o = textExtent(e); w.ha = J[0]; w.va = J[1]; const n = textExtent(w); const dx = o.xmin - n.xmin, dy = o.ymin - n.ymin, r = (e.rot || 0) * D2R; w.x += dx * Math.cos(r) - dy * Math.sin(r); w.y += dx * Math.sin(r) + dy * Math.cos(r); return [e, w]; }) }, 'Đổi canh lề ' + sel.length + ' chữ');
  });
  cmd(['TXT2MTXT', 'T2M'], 'Gộp nhiều dòng chữ đơn thành một chữ nhiều dòng', async () => {
    const s = await A.getSel('Chọn các dòng chữ', { filter: e => e.type === 'TEXT' }); const sel = (s.sel || []).filter(e => e.type === 'TEXT' && !e.dimd && !A.isLocked(e)); if(sel.length < 2){ log('Cần ít nhất 2 dòng chữ.'); return; }
    const r = (sel[0].rot || 0) * D2R, c = Math.cos(r), sn = Math.sin(r); const loc = e => ({ u: e.x * c + e.y * sn, v: -e.x * sn + e.y * c });
    const srt = sel.slice().sort((a, b) => loc(b).v - loc(a).v || loc(a).u - loc(b).u);
    let u0 = Infinity; for(const e of srt){ const b = textExtent(e); u0 = Math.min(u0, loc(e).u + b.xmin); } const top = loc(srt[0]).v + textExtent(srt[0]).ymax;
    const w = copy(srt[0]); delete w.att; w.text = srt.map(e => e.text).join('\n'); w.ha = 'left'; w.va = 'top'; w.x = u0 * c - (top - 0.15 * w.h) * sn; w.y = u0 * sn + (top - 0.15 * w.h) * c;
    A.commit({ del: sel.slice(1), rep: [[srt[0], w]] }, 'Đã gộp ' + sel.length + ' dòng'); log('TXT2MTXT: gộp ' + sel.length + ' dòng thành một chữ nhiều dòng.');
  });

  /* ====================== lớp ====================== */
  cmd(['LAYMRG', 'LAYMERGE'], 'Gộp lớp: chuyển mọi đối tượng sang lớp đích rồi xoá lớp cũ', async () => {
    const s = await A.getSel('Chọn đối tượng thuộc các lớp cần gộp'); const lays = [...new Set((s.sel || []).map(e => e.layer || '0'))]; if(!lays.length) return;
    const t = await A.getEnt('Chọn đối tượng thuộc lớp đích', { kw: [{ k: 'N', t: 'Gõ tên lớp' }] }); let dst = t.ent ? (t.ent.layer || '0') : null;
    if(t.kw === 'N'){ const n = await A.getStr('Tên lớp đích', { def: '0' }); dst = (n.str || '0').trim(); if(!A.layerNames().includes(dst)) A.addLayer(dst); } if(!dst) return;
    const src = lays.filter(l => l !== dst); if(!src.length){ log('Các đối tượng đã ở lớp đích.'); return; }
    const rep = modelEntities.filter(e => src.includes(e.layer || '0') && !e.xr).map(e => { const w = copy(e); w.layer = dst; if(w.bl) w.col = A.layerHex(dst); return [e, w]; });
    A.commit({ rep }, 'Gộp ' + src.length + ' lớp vào "' + dst + '"'); for(const l of src) A.deleteLayer(l);
    log('LAYMRG: ' + rep.length + ' đối tượng từ lớp ' + src.join(', ') + ' → "' + dst + '".');
  });
  cmd(['LAYDEL', 'LAYDELETE'], 'Xoá lớp cùng toàn bộ đối tượng trên lớp', async () => {
    const s = await A.getSel('Chọn một đối tượng thuộc lớp cần xoá', { single: true }); const e = s.ent || (s.sel || [])[0]; if(!e) return; const L = e.layer || '0';
    if(L === '0'){ log('Không xoá được lớp 0.'); return; }
    const del = modelEntities.filter(x => (x.layer || '0') === L && !x.xr); const k = await A.getKw('Xoá lớp "' + L + '" và ' + del.length + ' đối tượng?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Không' }); if(k.kw !== 'C') return;
    if(A.LS && A.LS.cur === L) A.setCurLayer('0'); A.commit({ del }, 'Đã xoá lớp ' + L); A.deleteLayer(L); log('LAYDEL: đã xoá lớp "' + L + '" (' + del.length + ' đối tượng).');
  });

  /* ====================== VIEW (góc nhìn 2D đặt tên) ====================== */
  const vk = () => 'dvd:views2d::' + (window.currentName || (typeof currentName !== 'undefined' ? currentName : ''));
  const getViews = () => { try{ return JSON.parse(localStorage.getItem(vk()) || '[]'); }catch(_){ return []; } };
  const setViews = L => { try{ localStorage.setItem(vk(), JSON.stringify(L)); }catch(_){} };
  function restoreView(v){ try{ if(A.pushView) A.pushView(); }catch(_){} view.scale = v.s; view.offsetX = v.x; view.offsetY = v.y; if(v.r != null && typeof setRotation === 'function'){ try{ setRotation(v.r); }catch(_){ view.rot = v.r; } } draw(); try{ A.paint(); }catch(_){} }
  A.namedViews = { get: getViews, set: setViews, restore: restoreView };
  plain(['VIEW', 'V', 'DDVIEW'], 'Lưu / gọi lại góc nhìn 2D đặt tên', () => {
    const render = root => { const L = getViews(); root.querySelector('#vwL').innerHTML = L.length ? L.map((v, i) => '<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><span style="flex:1">' + esc(v.name) + '</span><button data-g="' + i + '">Xem</button><button data-d="' + i + '">Xoá</button></div>').join('') : '<p style="opacity:.7">Chưa có góc nhìn nào.</p>'; };
    A.dialog({ title: 'Góc nhìn đặt tên (VIEW)', html: '<div id="vwL"></div><div style="display:flex;gap:6px;margin-top:10px"><input id="vwN" placeholder="Tên góc nhìn mới" style="flex:1"><button id="vwS">Lưu góc nhìn hiện tại</button></div>', noOk: true, cancelText: 'Đóng',
      onOpen: root => { render(root);
        root.addEventListener('click', ev => { const g = ev.target.closest('[data-g]'), d = ev.target.closest('[data-d]'), sv = ev.target.closest('#vwS');
          if(g){ const v = getViews()[+g.dataset.g]; if(v){ restoreView(v); log('Góc nhìn "' + v.name + '".'); } }
          if(d){ const L = getViews(); L.splice(+d.dataset.d, 1); setViews(L); render(root); }
          if(sv){ const nm = root.querySelector('#vwN').value.trim() || ('Góc ' + (getViews().length + 1)); const L = getViews().filter(v => v.name !== nm); L.push({ name: nm, s: view.scale, x: view.offsetX, y: view.offsetY, r: view.rot || 0 }); setViews(L); root.querySelector('#vwN').value = ''; render(root); log('Đã lưu góc nhìn "' + nm + '".'); } }); } });
  });

  /* ====================== CAL ====================== */
  function calc(expr){
    let s = String(expr).toLowerCase().replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
    if(!/^[0-9+\-*/().\s%a-z]*$/.test(s)) throw new Error('Ký tự không hợp lệ');
    const F = { sqrt: 'Math.sqrt', abs: 'Math.abs', round: 'Math.round', floor: 'Math.floor', ceil: 'Math.ceil', log: 'Math.log10', ln: 'Math.log', exp: 'Math.exp', pi: 'Math.PI', min: 'Math.min', max: 'Math.max',
      sin: '((x)=>Math.sin(x*Math.PI/180))', cos: '((x)=>Math.cos(x*Math.PI/180))', tan: '((x)=>Math.tan(x*Math.PI/180))', asin: '((x)=>Math.asin(x)*180/Math.PI)', acos: '((x)=>Math.acos(x)*180/Math.PI)', atan: '((x)=>Math.atan(x)*180/Math.PI)' };
    s = s.replace(/[a-z]+/g, w => { if(F[w]) return F[w]; throw new Error('Không hiểu "' + w + '"'); });
    const v = Function('"use strict";return (' + s + ')')(); if(typeof v !== 'number' || !isFinite(v)) throw new Error('Kết quả không hợp lệ'); return v;
  }
  A.calc = calc;
  // gõ 'CAL khi đang ở lời nhắc của lệnh khác: tính một biểu thức rồi đưa kết quả vào lời nhắc đó (như AutoCAD)
  cmd(['CAL', 'QUICKCALC', 'QC', 'TINH'], 'Máy tính: + − × ÷ ^ ( ) sqrt sin cos tan (độ) pi…', async (A2, c) => {
    for(;;){ const r = await A.getStr(c && c.nest ? 'Biểu thức (kết quả đưa vào lời nhắc)' : 'Biểu thức (Enter để xong)', {}); const t = (r.str || '').trim(); if(!t) return;
      try{ const v = calc(t); MEM.calLast = v; log(t + ' = ' + (+v.toPrecision(12))); if(c && c.nest){ A._nestResult = String(+v.toPrecision(12)); return; } try{ if(navigator.clipboard) navigator.clipboard.writeText(String(+v.toPrecision(12))).catch(() => {}); }catch(_){} }catch(err){ log('CAL: ' + err.message); } }
  });

  /* ====================== PUBLISH (in nhiều layout ra 1 PDF) ====================== */
  plain(['PUBLISH', 'BATCHPLOT', 'INHANGLOAT'], 'In nhiều layout ra một file PDF nhiều trang', () => {
    if(A.busy()) A.cancel(true); if(!A.plotRender || typeof canvasesToPDF !== 'function'){ say('Chưa sẵn sàng.'); return; }
    const L = (typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).map((l, i) => ({ l, i }));
    if(!L.length){ say('Bản vẽ không có layout.'); return; }
    const html = '<p>Chọn các trang cần in (khổ giấy, kiểu in lấy theo hộp thoại PLOT):</p>' + L.map(({ l, i }) => '<label style="display:block;margin:4px 0"><input type="checkbox" data-i="' + i + '"' + (l.isModel ? '' : ' checked') + '> ' + esc(l.isModel ? 'Model' : l.name) + '</label>').join('');
    A.dialog({ title: 'In hàng loạt (PUBLISH)', html, okText: 'Xuất PDF', ok: root => {
      const idx = [...root.querySelectorAll('input[data-i]:checked')].map(x => +x.dataset.i); if(!idx.length){ say('Chưa chọn trang nào.'); return false; }
      (async () => { const cur = currentLayout, pages = []; say('Đang in ' + idx.length + ' trang…');
        try{ for(const i of idx){ switchLayout(i); await new Promise(r => setTimeout(r, 60)); const r = A.plotRender(200, false); pages.push({ canvas: r.canvas, pagePt: r.pagePt }); }
          const blob = await canvasesToPDF(pages); const nm = String(currentName || 'banve').replace(/\.[^.]+$/, '') + '_layouts.pdf'; await shareOrDownload(blob, nm, 'application/pdf'); log('PUBLISH: ' + pages.length + ' trang → ' + nm);
        }catch(err){ console.error(err); say('Không in được: ' + (err.message || err)); }
        finally { switchLayout(cur); } })();
    } });
  });

  /* ====================== 3D: MASSPROP, INTERFERE, 3DARRAY, SHELL ====================== */
  const is3D = e => e && e.type === 'SOLID3D';
  const DENS = { concrete: 2500, brick: 1800, tile: 2300, wood: 600, stone: 2600, roof: 1900, grass: 1500, paint: 2500, glass: 2500, metal: 7850, water: 1000 };
  function massOf(e){ const m = A.meshOf(e); if(!m) return null; const p = m.p, I = m.i; let V = 0, Ar = 0, cx = 0, cy = 0, cz = 0, a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity];
    for(let k = 0; k < p.length; k += 3) for(let j = 0; j < 3; j++){ a[j] = Math.min(a[j], p[k + j]); b[j] = Math.max(b[j], p[k + j]); }
    for(let k = 0; k + 2 < I.length; k += 3){ const i0 = I[k] * 3, i1 = I[k + 1] * 3, i2 = I[k + 2] * 3; const x0 = p[i0], y0 = p[i0 + 1], z0 = p[i0 + 2], x1 = p[i1], y1 = p[i1 + 1], z1 = p[i1 + 2], x2 = p[i2], y2 = p[i2 + 1], z2 = p[i2 + 2];
      const v = (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; V += v; cx += v * (x0 + x1 + x2) / 4; cy += v * (y0 + y1 + y2) / 4; cz += v * (z0 + z1 + z2) / 4;
      const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0, wx = x2 - x0, wy = y2 - y0, wz = z2 - z0; Ar += Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx) / 2; }
    return { V: Math.abs(V), A: Ar, c: V ? [cx / V, cy / V, cz / V] : [0, 0, 0], a, b }; }
  cmd(['MASSPROP', 'MP', 'TINHKHOI'], 'Tính chất khối 3D: thể tích, diện tích mặt, trọng tâm, khối lượng', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: is3D }); const sel = (s.sel || []).filter(is3D); if(!sel.length) return;
    const U = (typeof unitToMM === 'function' && unitToMM()) || 1, m3 = Math.pow(U / 1000, 3), m2 = Math.pow(U / 1000, 2); let tV = 0, tA = 0, tM = 0, rows = '';
    for(const e of sel){ const r = massOf(e); if(!r) continue; const V = e.k === 'mesh' ? r.V : (A.volumeOf(e) || r.V), M = V * m3 * (DENS[e.mat] || 2500); tV += V; tA += r.A; tM += M;
      rows += '<tr><td>' + esc((A.MATS && A.MATS[e.mat] ? A.MATS[e.mat].n : 'Theo màu') + ' · ' + (e.layer || '0')) + '</td><td>' + (V * m3).toFixed(4) + '</td><td>' + (r.A * m2).toFixed(3) + '</td><td>' + r.c.map(v => fmtN(v)).join(', ') + '</td><td>' + M.toFixed(1) + '</td></tr>'; }
    const html = '<table style="width:100%;border-collapse:collapse;font-size:12px" border="1" cellpadding="4"><tr><th>Khối</th><th>Thể tích (m³)</th><th>Diện tích mặt (m²)</th><th>Trọng tâm</th><th>Khối lượng (kg)</th></tr>' + rows + '<tr style="font-weight:700"><td>Tổng ' + sel.length + ' khối</td><td>' + (tV * m3).toFixed(4) + '</td><td>' + (tA * m2).toFixed(3) + '</td><td></td><td>' + tM.toFixed(1) + '</td></tr></table><p style="opacity:.75;font-size:12px">Khối lượng riêng theo vật liệu (bê tông 2500, gạch 1800, thép 7850, gỗ 600 kg/m³…). Chưa gán vật liệu: coi là bê tông.</p>';
    A.dialog({ title: 'Tính chất khối (MASSPROP)', html, wide: true, noCancel: true, okText: 'Đóng' });
    log('MASSPROP: ' + sel.length + ' khối, thể tích ' + (tV * m3).toFixed(4) + ' m³, khối lượng ≈ ' + tM.toFixed(1) + ' kg.'); A.lastMass = { V: tV * m3, A: tA * m2, M: tM };
  });
  cmd(['INTERFERE', 'INF', 'VACHAM'], 'Kiểm tra va chạm giữa các khối 3D (tạo khối phần chồng lấn)', async () => {
    const s1 = await A.getSel('Chọn nhóm khối thứ nhất', { filter: is3D }); const S1 = (s1.sel || []).filter(is3D); if(!S1.length) return;
    const s2 = await A.getSel('Chọn nhóm khối thứ hai (Enter = kiểm tra trong nhóm thứ nhất)', { filter: is3D, pre: false }); const S2 = (s2.sel || []).filter(e => is3D(e) && S1.indexOf(e) < 0);
    const pairs = []; if(S2.length){ for(const a of S1) for(const b of S2) pairs.push([a, b]); } else { for(let i = 0; i < S1.length; i++) for(let j = i + 1; j < S1.length; j++) pairs.push([S1[i], S1[j]]); }
    const box = e => { const m = A.meshOf(e); const a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity]; for(let k = 0; k < m.p.length; k += 3) for(let j = 0; j < 3; j++){ a[j] = Math.min(a[j], m.p[k + j]); b[j] = Math.max(b[j], m.p[k + j]); } return { a, b }; };
    const bx = new Map(); const B = e => { if(!bx.has(e)) bx.set(e, box(e)); return bx.get(e); };
    const hits = []; log('Đang kiểm tra ' + pairs.length + ' cặp…'); await new Promise(r => setTimeout(r, 20));
    for(const [a, b] of pairs){ const p = B(a), q = B(b); if(p.b[0] <= q.a[0] || q.b[0] <= p.a[0] || p.b[1] <= q.a[1] || q.b[1] <= p.a[1] || p.b[2] <= q.a[2] || q.b[2] <= p.a[2]) continue;
      let r = null; try{ r = A.csg.boolean('int', [a], [b]); }catch(_){ r = null; } if(r && Math.abs(A.volumeOf(r)) > 1e-9 * Math.pow(Math.max(p.b[0] - p.a[0], 1), 3)) hits.push(r); }
    if(!hits.length){ log('INTERFERE: không có va chạm giữa ' + pairs.length + ' cặp khối.'); say('Không có va chạm.'); A.lastInterfere = 0; return; }
    const U = (typeof unitToMM === 'function' && unitToMM()) || 1, m3 = Math.pow(U / 1000, 3); let tv = 0; for(const h of hits){ h.col = '#ff3b30'; delete h.bl; h.layer = 'VA_CHAM'; tv += Math.abs(A.volumeOf(h)); }
    if(!A.layerNames().includes('VA_CHAM')) A.addLayer('VA_CHAM', '#ff3b30');
    const k = await A.getKw(hits.length + ' chỗ va chạm (tổng ' + (tv * m3).toFixed(4) + ' m³). Tạo khối đỏ ở chỗ va chạm (lớp VA_CHAM)?', { kw: [{ k: 'C', t: 'Có' }, { k: 'K', t: 'Không' }], def: 'Có' });
    if(k.kw !== 'K') A.commit({ add: hits }, 'Khối va chạm'); A.lastInterfere = hits.length; log('INTERFERE: ' + hits.length + ' chỗ va chạm, tổng thể tích ' + (tv * m3).toFixed(4) + ' m³.');
  });
  function moveZ(w, dz){ if(!dz) return; if(w.type === 'SOLID' && w.face){ w.zs = (w.zs || []).map(z => (z || 0) + dz); return; } if(w.k === 'mesh'){ const v = w.v.slice(); for(let i = 2; i < v.length; i += 3) v[i] += dz; w.v = v; return; } if(w.type === 'SOLID3D') w.z0 = (w.z0 || 0) + dz; }
  cmd(['3DARRAY', '3A'], 'Mảng 3D: hàng × cột × tầng, hoặc mảng tròn', async () => {
    const s = await A.getSel('Chọn đối tượng'); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const k = await A.getKw('Kiểu mảng', { kw: [{ k: 'H', t: 'Hàng-cột-tầng' }, { k: 'T', t: 'Tròn' }], def: 'Hàng-cột-tầng' }); const add = [];
    const put = (e, dx, dy, dz, rot, c) => { const w = copy(e); delete w.grp; if(dx || dy) window.translateEnt(w, dx, dy); if(rot) window.rotateEnt(w, rot, c); moveZ(w, dz); A.newProps(w); w.layer = e.layer; w.col = e.col; if(e.bl) w.bl = 1; if(e.mat) w.mat = e.mat; add.push(w); };
    if(k.kw === 'T'){ const n = await A.getNum('Số bản (kể cả bản gốc)', { def: 6 }); const N = Math.max(2, Math.round(n.num || 6)); const a = await A.getNum('Góc phủ (độ)', { def: 360 }); const F = a.num || 360;
      const c = await A.getPoint('Tâm mảng (trục đứng Z)'); if(!c.pt) return; const st = Math.abs(F) >= 360 ? F / N : F / (N - 1);
      for(let i = 1; i < N; i++) for(const e of sel){ const w0 = copy(e); put(w0, 0, 0, 0, st * i, c.pt); add[add.length - 1].layer = e.layer; } }
    else { const r = await A.getNum('Số hàng (theo Y)', { def: 1 }), c = await A.getNum('Số cột (theo X)', { def: 3 }), l = await A.getNum('Số tầng (theo Z)', { def: 3 });
      const R = Math.max(1, Math.round(r.num || 1)), C = Math.max(1, Math.round(c.num || 3)), Lv = Math.max(1, Math.round(l.num || 3)); let dr = 0, dc = 0, dl = 0;
      if(R > 1){ const d = await A.getNum('Khoảng cách hàng', { def: MEM.a3r || 3000 }); dr = MEM.a3r = d.num || 3000; }
      if(C > 1){ const d = await A.getNum('Khoảng cách cột', { def: MEM.a3c || 3000 }); dc = MEM.a3c = d.num || 3000; }
      if(Lv > 1){ const d = await A.getNum('Khoảng cách tầng (Z)', { def: MEM.a3l || 3300 }); dl = MEM.a3l = d.num || 3300; }
      for(let i = 0; i < R; i++) for(let j = 0; j < C; j++) for(let q = 0; q < Lv; q++){ if(!i && !j && !q) continue; for(const e of sel) put(e, j * dc, i * dr, q * dl); } }
    if(!add.length) return; A.commit({ add }, 'Mảng 3D: ' + add.length + ' đối tượng'); log('3DARRAY: thêm ' + add.length + ' đối tượng. Đối tượng 2D chỉ nhân theo mặt bằng.');
  });
  function offsetPoly(P, d){ const n = P.length, out = []; for(let i = 0; i < n; i++){ const a = P[(i - 1 + n) % n], p = P[i], b = P[(i + 1) % n]; let e1x = p.x - a.x, e1y = p.y - a.y, e2x = b.x - p.x, e2y = b.y - p.y; const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1; e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2; const n1x = -e1y, n1y = e1x, n2x = -e2y, n2y = e2x, den = 1 + n1x * n2x + n1y * n2y; out.push(den < 0.05 ? { x: p.x + n1x * d, y: p.y + n1y * d } : { x: p.x + (n1x + n2x) * d / den, y: p.y + (n1y + n2y) * d / den }); } return out; }
  const area2 = p => { let s = 0; for(let i = 0; i < p.length; i++){ const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
  cmd(['SHELL', 'SOLIDEDIT', 'VOKHOI'], 'Làm rỗng khối (vỏ dày t), có thể bỏ mặt trên — bể nước, hộp, tường rỗng', async () => {
    const s = await A.getSel('Chọn khối hộp / khối đùn / trụ', { filter: e => is3D(e) && (e.k === 'ext' || e.k === 'cone') }); const sel = (s.sel || []).filter(e => is3D(e) && (e.k === 'ext' || (e.k === 'cone' && Math.abs((e.r2 != null ? e.r2 : e.r) - e.r) < 1e-9)) && !A.isLocked(e)); if(!sel.length){ log('Chỉ làm rỗng được khối hộp, khối đùn và trụ.'); return; }
    const t = await A.getDist('Bề dày vỏ', { def: MEM.shT || 100 }); const th = t.num > 0 ? t.num : (MEM.shT || 100); MEM.shT = th;
    const k = await A.getKw('Bỏ mặt nào', { kw: [{ k: 'T', t: 'Mặt trên (hở miệng)' }, { k: 'D', t: 'Mặt dưới' }, { k: 'K', t: 'Không (kín)' }], def: 'Mặt trên (hở miệng)' }); const open = k.kw || 'T';
    const rep = [];
    for(const e of sel){ let outer = e.k === 'ext' ? e.pts.slice() : (() => { const o = []; for(let q = 0; q < 64; q++){ const a = q / 64 * TAU; o.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } return o; })();
      if(area2(outer) < 0) outer.reverse(); const holes = (e.holes || []).map(l => area2(l) > 0 ? l.slice().reverse() : l.slice());
      const z0 = e.z0 || 0, h = e.h || 0; if(h <= 2 * th){ log('Khối quá mỏng so với bề dày vỏ.'); continue; }
      const iz0 = open === 'D' ? z0 - th : z0 + th, iz1 = open === 'T' ? z0 + h + th : z0 + h - th;
      const inner = await A.makeExt(offsetPoly(outer, th), holes.map(l => offsetPoly(l, th)), iz0, iz1 - iz0); if(!inner) continue;
      let r = null; try{ r = A.csg.boolean('sub', [e], [inner]); }catch(err){ console.warn(err); } if(r) rep.push([e, r]); }
    if(!rep.length){ log('Không làm rỗng được.'); return; }
    A.commit({ rep }, 'Đã làm rỗng ' + rep.length + ' khối'); log('SHELL: vỏ dày ' + th + (open === 'K' ? ', kín' : open === 'T' ? ', hở mặt trên' : ', hở mặt dưới') + '.');
  });
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
