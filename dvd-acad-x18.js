/* DVDCAD v5v — bổ sung như AutoCAD 2027
   · BCONVERT (Smart Blocks: Search and Convert): tìm nhóm đối tượng rời giống hình một khối (dời / xoay / tỉ lệ) và đổi thành bản chèn
     Nguồn: chọn bản chèn khối, gõ tên khối hoặc chọn đối tượng rời (tạo khối mới rồi tìm các chỗ giống) · SMARTBLOCKSDETECT = BCONVERT
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x18 || !A.dialog || !A.acw || !window.DVDCmd) return; A._x18 = true;
  const K = A.acw;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const deep = o => JSON.parse(JSON.stringify(o));
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const redraw = () => { try{ bbDirty = true; invalidateSnap(); }catch(_){} try{ draw(); }catch(_){} };
  const bbOf = L => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of L){ let b = null; try{ b = entBBox(e); }catch(_){} if(!b) continue; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
  const isRef = e => !!(e && e.grp && e.bm && e.blk && !String(e.blk).startsWith('*'));
  const selShow = L => { try{ selEnts.clear(); for(const e of L) selEnts.add(e); refreshPanSel(); }catch(_){ redraw(); } };
  const zoomTo = (L, k) => { const b = bbOf(L); if(!b) return; const m = Math.max(b.x1 - b.x0, b.y1 - b.y0) * (k || 1.6) / 2 + 1e-6, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; try{ zoomToWorldRect(cx - m, cy - m, cx + m, cy + m); }catch(_){} };

  /* ==================================================================
     BCONVERT — Smart Blocks: Search and Convert
     Khuôn = hình của khối trong toạ độ khối; tìm phép biến đổi (dời, xoay, tỉ lệ đều) đưa khuôn trùng đúng một nhóm đối tượng rời
     ================================================================== */
  const SB_K = 'dvd:bconvert';
  const SB = Object.assign({ rot: 1, scale: 0, tol: 0.0001 }, lsGet(SB_K, {}));
  const D2 = Math.PI / 180;
  const SUP = new Set(['LINE', 'CIRCLE', 'ARC', 'ELLIPSE', 'POINT', 'TEXT', 'POLYLINE', 'SOLID', 'HATCH']);
  const loose = e => e && !e.grp && !e.dimd && !e.tbld && !e.att && !e.attdef && SUP.has(e.type) && !(e.type === 'POLYLINE' && (e.wipe || e._img || e.rgn));
  // đoạn thẳng của nét (LINE, cạnh thẳng của POLYLINE) — để chọn cặp điểm neo
  function segsOf(e){
    if(e.type === 'LINE') return [[{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }]];
    if(e.type !== 'POLYLINE') return [];
    const V = e.bv || e.vertices || [], n = V.length, out = [];
    for(let i = 0; i < n - 1 + (e.closed ? 1 : 0); i++){ const a = V[i], b = V[(i + 1) % n]; if(e.bv && a.bulge) continue; out.push([a, b]); }
    return out;
  }
  // điểm đặc trưng để tra lưới (bất biến với cách lưu: trung điểm đoạn, tâm, trọng tâm đỉnh)
  function refPt(e){
    switch(e.type){
      case 'LINE': return { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2 };
      case 'CIRCLE': case 'ARC': case 'ELLIPSE': return { x: e.cx, y: e.cy };
      case 'POINT': case 'TEXT': return { x: e.x, y: e.y };
      case 'POLYLINE': case 'SOLID': { const V = e.type === 'SOLID' ? (e.pts || []) : (e.bv || e.vertices || []); let n = V.length; if(e.type === 'POLYLINE' && e.closed && n > 1 && Math.hypot(V[0].x - V[n - 1].x, V[0].y - V[n - 1].y) < 1e-12) n--;
        let x = 0, y = 0; const m = Math.max(1, n); for(let i = 0; i < n; i++){ x += V[i].x; y += V[i].y; } return { x: x / m, y: y / m }; }
      case 'HATCH': { let x = 0, y = 0, n = 0; for(const lp of e.loops || []) for(const q of lp){ x += q.x; y += q.y; n++; } return n ? { x: x / n, y: y / n } : null; }
    }
    const b = entBBox(e); return b ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : null;
  }
  // ghép tập điểm (không theo thứ tự) trong dung sai
  function setMatch(P, Q, tol){
    if(P.length !== Q.length) return false; const used = new Uint8Array(Q.length);
    for(const p of P){ let k = -1; for(let j = 0; j < Q.length; j++){ if(!used[j] && Math.abs(p.x - Q[j].x) <= tol && Math.abs(p.y - Q[j].y) <= tol){ k = j; break; } } if(k < 0) return false; used[k] = 1; }
    return true;
  }
  const angDiff = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };
  const near = (p, q, tol) => Math.abs(p.x - q.x) <= tol && Math.abs(p.y - q.y) <= tol;
  const ellPt = (e, t) => { const rx = e.mx, ry = e.my, k = e.ratio || 1; return { x: e.cx + Math.cos(t) * rx - Math.sin(t) * ry * k, y: e.cy + Math.cos(t) * ry + Math.sin(t) * rx * k }; };
  // t = khuôn đã biến đổi, c = đối tượng rời: cùng hình trong dung sai
  function same(t, c, tol){
    if(t.type !== c.type) return false;
    switch(t.type){
      case 'LINE': { const a1 = { x: t.x1, y: t.y1 }, a2 = { x: t.x2, y: t.y2 }, b1 = { x: c.x1, y: c.y1 }, b2 = { x: c.x2, y: c.y2 }; return (near(a1, b1, tol) && near(a2, b2, tol)) || (near(a1, b2, tol) && near(a2, b1, tol)); }
      case 'CIRCLE': return Math.abs(t.cx - c.cx) <= tol && Math.abs(t.cy - c.cy) <= tol && Math.abs(t.r - c.r) <= tol;
      case 'ARC': { if(Math.abs(t.cx - c.cx) > tol || Math.abs(t.cy - c.cy) > tol || Math.abs(t.r - c.r) > tol) return false;
        const P = (e, a) => ({ x: e.cx + e.r * Math.cos(a * D2), y: e.cy + e.r * Math.sin(a * D2) }); return near(P(t, t.a1), P(c, c.a1), tol) && near(P(t, t.a2), P(c, c.a2), tol); }
      case 'ELLIPSE': { if(Math.abs(t.cx - c.cx) > tol || Math.abs(t.cy - c.cy) > tol || Math.abs((t.ratio || 1) - (c.ratio || 1)) > 1e-6) return false;
        if(!(near({ x: t.mx, y: t.my }, { x: c.mx, y: c.my }, tol) || near({ x: t.mx, y: t.my }, { x: -c.mx, y: -c.my }, tol))) return false;
        const full = e => e.p1 == null || Math.abs(((e.p2 == null ? 2 * Math.PI : e.p2) - e.p1) - 2 * Math.PI) < 1e-6 || Math.abs((e.p2 == null ? 2 * Math.PI : e.p2) - e.p1) < 1e-9;
        if(full(t) && full(c)) return true; if(full(t) !== full(c)) return false;
        return near(ellPt(t, t.p1 || 0), ellPt(c, c.p1 || 0), tol) && near(ellPt(t, t.p2), ellPt(c, c.p2), tol); }
      case 'POINT': return near(t, c, tol);
      case 'TEXT': return near(t, c, tol) && String(t.text || '') === String(c.text || '') && Math.abs((t.h || 0) - (c.h || 0)) <= tol && angDiff(t.rot || 0, c.rot || 0) < 0.01 && !!t.mt === !!c.mt;
      case 'SOLID': return setMatch(t.pts || [], c.pts || [], tol);
      case 'HATCH': { const L1 = t.loops || [], L2 = c.loops || []; if(L1.length !== L2.length || !!t.solid !== !!c.solid || (t.pat || '') !== (c.pat || '')) return false;
        const used = new Uint8Array(L2.length); for(const lp of L1){ let k = -1; for(let j = 0; j < L2.length; j++) if(!used[j] && setMatch(lp, L2[j], tol)){ k = j; break; } if(k < 0) return false; used[k] = 1; } return true; }
      case 'POLYLINE': { if(!!t.closed !== !!c.closed) return false;
        const S = e => { const V = e.bv || e.vertices || [], n = V.length, o = []; for(let i = 0; i < n - 1 + (e.closed ? 1 : 0); i++){ const a = V[i], b = V[(i + 1) % n]; if(Math.hypot(a.x - b.x, a.y - b.y) < 1e-12) continue; o.push([a, b, e.bv ? (a.bulge || 0) : 0]); } return o; };
        const s1 = S(t), s2 = S(c); if(s1.length !== s2.length) return false; const used = new Uint8Array(s2.length);
        for(const [a, b, g] of s1){ let k = -1; for(let j = 0; j < s2.length; j++){ if(used[j]) continue; const [p, q, h] = s2[j];
            if((near(a, p, tol) && near(b, q, tol) && Math.abs(g - h) < 1e-6) || (near(a, q, tol) && near(b, p, tol) && Math.abs(g + h) < 1e-6)){ k = j; break; } }
          if(k < 0) return false; used[k] = 1; }
        return true; }
    }
    return false;
  }
  // lưới ô vuông tra nhanh đối tượng rời theo điểm đặc trưng
  function makeGrid(list, cell){
    const G = new Map(), key = (i, j) => i + ',' + j;
    for(const e of list){ const p = refPt(e); if(!p) continue; const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell)); let a = G.get(k); if(!a){ a = []; G.set(k, a); } a.push(e); }
    return { near(p, r){ const out = []; const i0 = Math.floor((p.x - r) / cell), i1 = Math.floor((p.x + r) / cell), j0 = Math.floor((p.y - r) / cell), j1 = Math.floor((p.y + r) / cell);
      for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){ const a = G.get(key(i, j)); if(a) out.push(...a); } return out; } };
  }
  const simM = (p0, p1, u0, u1) => { const dx = p1.x - p0.x, dy = p1.y - p0.y, ux = u1.x - u0.x, uy = u1.y - u0.y; const L = Math.hypot(dx, dy); if(L < 1e-12) return null;
    const s = Math.hypot(ux, uy) / L, th = Math.atan2(uy, ux) - Math.atan2(dy, dx); const c = Math.cos(th) * s, si = Math.sin(th) * s;
    return { a: c, b: si, c: -si, d: c, e: u0.x - (c * p0.x - si * p0.y), f: u0.y - (si * p0.x + c * p0.y), s, th }; };
  /* tìm: T = khuôn (toạ độ khối), pool = đối tượng rời. Trả [{ M, ents }] */
  function search(T, pool, opt){
    T = T.filter(e => SUP.has(e.type) && !e.attdef && !e.att); if(!T.length) return { err: 'nosup' };
    const bb = bbOf(T), diag = bb ? Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) : 1; const tolR = Math.max(1e-9, (opt.tol || 1e-4)) * Math.max(diag, 1e-9);
    const byType = new Map(); for(const e of pool){ let a = byType.get(e.type); if(!a){ a = []; byType.set(e.type, a); } a.push(e); }
    for(const e of T) if(!byType.has(e.type)) return { found: [] };
    // cặp neo: đoạn thẳng dài nhất trong khuôn; không có đoạn thẳng thì tâm / điểm đặc trưng của 2 đối tượng xa nhau nhất
    let anc = null;
    for(const e of T) for(const [a, b] of segsOf(e)){ const L = Math.hypot(b.x - a.x, b.y - a.y); if(L > 1e-12 && (!anc || L > anc.L)) anc = { e, a, b, L, seg: 1 }; }
    if(!anc){ const R = T.map(e => ({ e, p: refPt(e) })).filter(o => o.p); let best = null;
      for(let i = 0; i < R.length; i++) for(let j = i + 1; j < R.length; j++){ const L = Math.hypot(R[i].p.x - R[j].p.x, R[i].p.y - R[j].p.y); if(L > 1e-9 && (!best || L > best.L)) best = { e: R[i].e, e2: R[j].e, a: R[i].p, b: R[j].p, L }; }
      anc = best; }
    const cell = Math.max(diag, tolR * 10, 1e-6);
    const grid = makeGrid(pool, cell);
    const used = new Set(), found = [];
    const order = T.slice().sort((x, y) => (x === anc.e ? -1 : y === anc.e ? 1 : 0));
    const tryM = M => {
      if(!M) return false; if(!opt.scale && Math.abs(M.s - 1) > 1e-6) return false; if(opt.scale && (M.s < 1e-6 || M.s > 1e6)) return false;
      if(!opt.rot && angDiff(M.th / D2, 0) > 1e-4) return false;
      const tol = tolR * Math.max(1, M.s); const hit = [], got = new Set();
      for(const t0 of order){ const t = transformPrim(t0, M); if(!t) return false; const p = refPt(t); if(!p) return false;
        let m = null; for(const c of grid.near(p, tol * 2 + 1e-9)){ if(used.has(c) || got.has(c)) continue; if(same(t, c, tol)){ m = c; break; } }
        if(!m) return false; hit.push(m); got.add(m); }
      for(const c of hit) used.add(c); found.push({ M, ents: hit }); return true;
    };
    if(!anc){   // một đối tượng duy nhất không có hướng (tròn / điểm): chỉ dời
      const t0 = T[0], p0 = refPt(t0); for(const c of byType.get(t0.type) || []){ if(used.has(c)) continue; const q = refPt(c); if(!q) continue; const M = { a: 1, b: 0, c: 0, d: 1, e: q.x - p0.x, f: q.y - p0.y, s: 1, th: 0 }; tryM(M); }
      return { found };
    }
    if(anc.seg){
      const cand = []; for(const c of byType.get(anc.e.type) || []) for(const [u, v] of segsOf(c)){ const L = Math.hypot(v.x - u.x, v.y - u.y); if(L < 1e-12) continue; if(!opt.scale && Math.abs(L - anc.L) > tolR * 2) continue; cand.push([c, u, v]); }
      for(const [c, u, v] of cand){ if(used.has(c)) continue; if(tryM(simM(anc.a, anc.b, u, v))) continue; tryM(simM(anc.a, anc.b, v, u)); }
    } else {
      const t2 = anc.e2;
      for(const c of byType.get(anc.e.type) || []){ if(used.has(c)) continue; const u = refPt(c); if(!u) continue;
        const R = opt.scale ? Infinity : anc.L + tolR * 2;
        const L2 = isFinite(R) ? grid.near(u, R) : (byType.get(t2.type) || []);
        for(const c2 of L2){ if(c2 === c || c2.type !== t2.type || used.has(c) || used.has(c2)) continue; const v = refPt(c2); if(!v) continue; const L = Math.hypot(v.x - u.x, v.y - u.y); if(!opt.scale && Math.abs(L - anc.L) > tolR * 2) continue;
          if(tryM(simM(anc.a, anc.b, u, v))) break; } }
    }
    return { found };
  }
  A.bconvertSearch = (name, src, opt, pool) => { const B = A.blockPrims(name, src); if(!B) return { found: [] }; return search(B.prims, pool || ME().filter(loose), Object.assign({}, SB, opt || {})); };
  const srcOf = n => (A.fileBlockNames ? A.fileBlockNames() : []).includes(n) ? 'file' : 'lib';
  function blockNames(){ const s = new Set(); try{ for(const n of A.fileBlockNames()) s.add(n); }catch(_){} try{ for(const n of Object.keys(A.blockLib())) s.add(n); }catch(_){} return [...s].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true })); }
  // đổi các nhóm tìm được thành bản chèn: giữ lớp chiếm đa số của nhóm
  function convert(name, src, list){
    const B = A.blockPrims(name, src); if(!B || !list.length) return 0; const del = [], add = [], sv = A.LS.cur;
    for(const f of list){ const cnt = new Map(); for(const e of f.ents) cnt.set(e.layer || '0', (cnt.get(e.layer || '0') || 0) + 1); const lay = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const ip = { x: f.M.a * B.base.x + f.M.c * B.base.y + f.M.e, y: f.M.b * B.base.x + f.M.d * B.base.y + f.M.f };
      try{ A.LS.cur = lay; const N = A.instBlock(name, src, ip, f.M.s, f.M.th / D2); if(!N.length) continue; for(const e of N) delete e.userAdded; del.push(...f.ents); add.push(...N); }finally{ A.LS.cur = sv; } }
    if(!add.length) return 0;
    A.commit({ del, add }, 'BCONVERT: đổi ' + list.length + ' nhóm đối tượng thành bản chèn "' + name + '"');
    return list.length;
  }
  A.bconvertApply = convert;
  function results(name, src, pool){
    let R = search(A.blockPrims(name, src).prims, pool, SB), on = [];
    const html = '<div class="acw" style="width:440px"><div class="acw-cols"><div class="c1" style="flex:0 0 150px">' + K.canvas('bcPv', 150, 110) + '<div class="acw-note" translate="no" id="bcNm"></div></div><div class="c1">' +
      '<div id="bcCnt" style="font-weight:600;margin-bottom:4px"></div><div class="acw-list" id="bcL" style="height:150px"></div>' +
      '<div class="acw-row" style="margin-top:4px">' + K.btn('bcAll', 'Chọn hết') + K.btn('bcNone', 'Bỏ hết') + K.btn('bcZ', 'Phóng tới') + '</div></div></div>' +
      K.grp('Cài đặt tìm', '<div class="acw-row">' + K.chk('bcRot', 'Gồm cả hình đã xoay', SB.rot) + K.chk('bcSc', 'Gồm cả hình khác tỉ lệ', SB.scale) + '</div>' + K.row('Dung sai (phần nghìn cỡ khối):', K.num('bcTol', +(SB.tol * 1000).toPrecision(4), { min: 0.0001 })) + '<div class="acw-row">' + K.btn('bcRe', 'Tìm lại') + '</div>') +
      '<div class="acw-note" style="white-space:normal">Chỉ đổi các đối tượng rời (không thuộc khối, nhóm, bảng, kích thước) trùng đúng hình của khối. Bản chèn mới lấy lớp chiếm đa số của nhóm.</div></div>';
    return new Promise(res => {
      const d = A.dialog({ title: 'Đổi thành bản chèn khối', cls: 'acw-free', help: 'BCONVERT', html, okText: 'Đổi', ok: () => { const L = R.found.filter((_, i) => on[i]); if(!L.length){ say('Chưa chọn vị trí nào.'); return false; } selShow([]); res(convert(name, src, L)); }, cancel: () => { selShow([]); res(0); } });
      const root = d.root, $ = id => root.querySelector('#' + id); let cur = -1;
      $('bcNm').textContent = name; try{ K.paint($('bcPv'), A.instBlock(name, src, { x: 0, y: 0 }, 1, 0)); }catch(_){}
      const paint = () => { on = R.found.map((_, i) => on[i] !== false); const n = on.filter(Boolean).length;
        $('bcCnt').textContent = R.err === 'nosup' ? 'Khối không có hình tìm được (chỉ có thuộc tính / đối tượng 3D…).' : R.found.length ? 'Tìm thấy ' + R.found.length + ' vị trí giống khối — đã chọn ' + n : 'Không tìm thấy nhóm đối tượng rời nào giống khối.';
        $('bcL').innerHTML = R.found.map((f, i) => '<div class="it' + (i === cur ? ' on' : '') + '" data-v="' + i + '"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-i="' + i + '"' + (on[i] ? ' checked' : '') + '>Vị trí ' + (i + 1) + ' <span style="color:#9aa6ba">(' + f.ents.length + ' đối tượng' + (Math.abs(f.M.th) > 1e-6 ? ', xoay ' + (+(f.M.th / D2).toFixed(2)) + '°' : '') + (Math.abs(f.M.s - 1) > 1e-6 ? ', tỉ lệ ' + (+f.M.s.toPrecision(5)) : '') + ')</span></label></div>').join('');
        selShow(R.found.filter((_, i) => on[i]).flatMap(f => f.ents)); };
      $('bcL').addEventListener('change', e => { const i = +e.target.dataset.i; if(isFinite(i)){ on[i] = e.target.checked; paint(); } });
      $('bcL').addEventListener('click', e => { const it = e.target.closest('.it'); if(!it || e.target.tagName === 'INPUT') return; cur = +it.dataset.v; $('bcL').querySelectorAll('.it').forEach(x => x.classList.toggle('on', x === it)); zoomTo(R.found[cur].ents, 3); });
      $('bcAll').onclick = () => { on = R.found.map(() => true); paint(); }; $('bcNone').onclick = () => { on = R.found.map(() => false); paint(); };
      $('bcZ').onclick = () => { const L = R.found.filter((_, i) => on[i]).flatMap(f => f.ents); if(L.length) zoomTo(L, 1.15); };
      $('bcRe').onclick = () => { SB.rot = $('bcRot').checked ? 1 : 0; SB.scale = $('bcSc').checked ? 1 : 0; const t = parseFloat(String($('bcTol').value).replace(',', '.')); if(t > 0) SB.tol = t / 1000; lsSet(SB_K, SB);
        R = search(A.blockPrims(name, src).prims, pool, SB); on = []; cur = -1; paint(); };
      paint(); if(R.found.length) zoomTo(R.found.flatMap(f => f.ents), 1.15);
    });
  }
  async function bconvert(_, cur){
    const pre = cur && cur.pre ? cur.pre.find(isRef) : null; if(cur) cur.pre = [];
    let name = null, src = null;
    if(pre){ name = pre.blk; src = pre.bm && pre.bm.src || srcOf(name); }
    while(!name){
      const r = await A.getEnt('Chọn bản chèn khối nguồn hoặc', { filter: isRef, kw: [{ k: 'N', t: 'Tên khối' }, { k: 'O', t: 'Đối tượng' }, { k: 'S', t: 'Cài đặt' }] });
      if(r.kw === 'S'){ const k = await A.getKw('Gồm cả hình đã xoay?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: SB.rot ? 'Có' : 'Không' }); if(k.kw) SB.rot = k.kw === 'Y' ? 1 : 0;
        const k2 = await A.getKw('Gồm cả hình khác tỉ lệ?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: SB.scale ? 'Có' : 'Không' }); if(k2.kw) SB.scale = k2.kw === 'Y' ? 1 : 0; lsSet(SB_K, SB); continue; }
      if(r.kw === 'N'){ const N = blockNames(); const s = await A.getStr('Nhập tên khối hoặc [?]'); const v = String(s.str || '').trim(); if(!v) return;
        if(v === '?'){ log('Khối: ' + N.join(', ')); continue; } const m = N.find(n => n.toLowerCase() === v.toLowerCase()); if(!m){ log('Không có khối "' + v + '".'); continue; } name = m; src = srcOf(m); break; }
      if(r.kw === 'O'){ // tạo khối từ một nhóm đối tượng rời rồi tìm các chỗ giống
        const s = await A.getSel('Chọn đối tượng làm mẫu', { filter: loose, pre: false }); const sel = s.sel || []; if(!sel.length) return;
        const b = await A.getPoint('Chỉ định điểm gốc của khối'); if(!b.pt) return;
        const nm0 = await A.getStr('Nhập tên khối mới'); const nm = String(nm0.str || '').trim().replace(/[<>\/\\":;?*|=`]/g, '_'); if(!nm) return;
        if(blockNames().includes(nm)){ log('Đã có khối "' + nm + '" — đặt tên khác.'); continue; }
        A.makeBlock(sel, b.pt, nm); name = nm; src = 'lib'; break; }
      if(!r.ent) return; name = r.ent.blk; src = r.ent.bm && r.ent.bm.src || srcOf(name);
    }
    if(!A.blockPrims(name, src)){ log('Không đọc được định nghĩa khối "' + name + '".'); return; }
    const sc = await A.getSel('Chọn vùng / đối tượng để tìm hoặc <Toàn bản vẽ>', { filter: loose, pre: false });
    const pool = sc.sel && sc.sel.length ? sc.sel.filter(loose) : ME().filter(loose);
    const n = await results(name, src, pool);
    if(n) log('BCONVERT: ' + n + ' nhóm đối tượng → bản chèn "' + name + '".');
  }
  ecmd(['BCONVERT', 'SMARTBLOCKSDETECT', 'SMARTBLOCKSCONVERT'], 'Smart Blocks — Tìm và đổi: tìm các nhóm đối tượng rời giống hình một khối (kể cả đã xoay / khác tỉ lệ) và đổi thành bản chèn khối', bconvert);
})();
