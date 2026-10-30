/* DVDCAD — bổ sung như AutoCAD 2027 (v5q)
   Không gian giấy (paper space) cho layout tự tạo: vẽ / sửa trên giấy, sửa khung nhìn, CHSPACE (đổi không gian qua khung nhìn) …
   Chuỗi gốc tiếng Việt, giao diện English dịch qua dvd-i18n-en.js. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || !A.dialog || !A.acw || !window.DVDCmd || A._dlg3) return; A._dlg3 = true;
  const K = A.acw;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const log = m => { try{ A.log(m); }catch(_){} };
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : null; };
  const r6 = v => +(+v).toPrecision(6);
  const deep = o => JSON.parse(JSON.stringify(o));
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const docNm = () => { try{ return currentName || 'Drawing1.dwg'; }catch(_){ return 'Drawing1.dwg'; } };

  /* ==================================================================
     KHÔNG GIAN GIẤY — layout tự tạo (LAYOUT) có danh sách đối tượng giấy riêng (def.ps)
     • Lệnh vẽ / sửa trong layout ghi vào giấy: A.commit, hoàn tác / làm lại đổi tạm modelEntities sang danh sách giấy
     • Khung nhìn (viewport) dời / kéo giãn / xoá / sao chép như đối tượng — cập nhật định nghĩa khung nhìn
     ================================================================== */
  let PSMODE = null;
  const userLayout = () => { try{ if(isModelView()) return null; return A.curUserLayout ? A.curUserLayout() : null; }catch(_){ return null; } };
  const layoutByName = n => { try{ return dwgLayouts.find(L => L.user && L.name === n) || null; }catch(_){ return null; } };
  const psOf = L => { const D = L.def; if(!Array.isArray(D.ps)) D.ps = []; return D.ps; };
  A.paperLayout = userLayout;
  // layout đọc từ tệp (DWG/DXF): sửa được — lần sửa đầu tiên tự chuyển thành layout DVDCAD (giữ đối tượng giấy + khung nhìn của tệp)
  const fileLayout = () => { try{ if(isModelView()) return null; const L = dwgLayouts[currentLayout]; return A.isFileLayout && A.isFileLayout(L) ? L : null; }catch(_){ return null; } };
  const ensureUser = () => { const U = userLayout(); if(U) return U; if(!fileLayout() || !A.layoutFromFile) return null; return A.layoutFromFile(currentLayout) || null; };
  // thay đổi có chạm tới giấy của layout tệp không (thêm mới, hoặc sửa / xoá đối tượng giấy của tệp) — chỉ khi đó mới chuyển layout
  const touchesPaper = ch => { const F = fileLayout(); if(!F || !ch) return false; if((ch.add || []).length) return true; const P = new Set(F.paper.paperPrims); return (ch.rep || []).some(x => x && P.has(x[0])) || (ch.del || []).some(e => P.has(e)); };
  A.ensurePaperLayout = ensureUser;
  A.canEdit = () => { try{ return isModelView() || !!userLayout() || !!fileLayout(); }catch(_){ return true; } };
  A.editList = () => { const L = userLayout(); if(L) return psOf(L); const F = fileLayout(); return F ? F.paper.paperPrims.filter(e => e && !e.vpf) : modelEntities; };
  A.inPaper = () => !!userLayout();
  function psAfter(L){ try{ const D = L.def; L.paper.paperPrims = (A.sheetPrims ? A.sheetPrims(D) : L.paper.paperPrims.filter(e => !psOf(L).includes(e))).concat(psOf(L));
      if(dwgLayouts[currentLayout] === L){ entities = buildPaperEntities(L); bbDirty = true; try{ invalidateSnap(); }catch(_){} }
      if(A.saveLayoutQuiet) A.saveLayoutQuiet(D); }catch(err){ console.warn('paper space', err); } }
  // chạy fn với modelEntities = danh sách giấy của layout L
  function withPaper(L, fn){ if(PSMODE) return fn(); const ps = psOf(L), svM = modelEntities, svV = window.isModelView, svS = window.saveGeomEdits;
    modelEntities = ps; window.isModelView = () => true; window.saveGeomEdits = () => {}; PSMODE = { L, ps };
    try{ return fn(); } finally { modelEntities = svM; window.isModelView = svV; window.saveGeomEdits = svS; PSMODE = null; psAfter(L); try{ draw(); }catch(_){} } }
  A.withPaper = withPaper;
  const bbPts = P => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const p of P || []){ if(p.x < x0) x0 = p.x; if(p.y < y0) y0 = p.y; if(p.x > x1) x1 = p.x; if(p.y > y1) y1 = p.y; } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
  function setVps(name, vps, msg){ const L = layoutByName(name); if(!L || !A.saveLayoutDef) return; const D = deep(L.def); D.vps = deep(vps); A.saveLayoutDef(D); if(msg) log(msg); }
  // khung nhìn bị dời / kéo / xoá / chép trong một lần commit → đổi định nghĩa khung nhìn (hoàn tác được)
  function vpEdits(L, ch){ const isVp = e => e && e.vpf && e.vpi != null;
    const vrep = (ch.rep || []).filter(x => x && isVp(x[0])), vdel = (ch.del || []).filter(isVp), vadd = (ch.add || []).filter(isVp);
    if(!vrep.length && !vdel.length && !vadd.length) return ch;
    const old = deep(L.def.vps || []), nv = deep(old);
    for(const [o, w] of vrep){ const b = bbPts(w.vertices), v = nv[o.vpi]; if(v && b && b.x1 - b.x0 > 1 && b.y1 - b.y0 > 1){ v.x = b.x0; v.y = b.y0; v.w = b.x1 - b.x0; v.h = b.y1 - b.y0; } }
    for(const w of vadd){ const b = bbPts(w.vertices), v = old[w.vpi]; if(v && b) nv.push(Object.assign(deep(v), { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 })); }
    const gone = new Set(vdel.map(e => e.vpi)); const fin = nv.filter((v, i) => !gone.has(i)); const name = L.name;
    setVps(name, fin, 'Khung nhìn: ' + (vrep.length ? vrep.length + ' sửa ' : '') + (vadd.length ? vadd.length + ' thêm ' : '') + (vdel.length ? vdel.length + ' xoá' : '').trim());
    pushUndo({ op: 'fn', undo: () => setVps(name, old), redo: () => setVps(name, fin) });
    const R = new Set(vrep.map(x => x[0])), Dl = new Set(vdel), Ad = new Set(vadd);
    return Object.assign({}, ch, { rep: (ch.rep || []).filter(x => !(x && R.has(x[0]))), del: (ch.del || []).filter(e => !Dl.has(e)), add: (ch.add || []).filter(e => !Ad.has(e)) }); }
  { const _c = A.commit; A.commit = function(ch, msg){ if(PSMODE) return _c.apply(this, arguments); const L0 = touchesPaper(ch) ? ensureUser() : userLayout(); if(!L0 || !ch) return _c.apply(this, arguments);
      const ch2 = vpEdits(L0, ch); const L = userLayout() || L0; const nothing = !(ch2.rep || []).length && !(ch2.del || []).length && !(ch2.add || []).length;
      if(nothing){ try{ draw(); }catch(_){} return ch2 !== ch; }
      const top0 = editUndoStack[editUndoStack.length - 1]; let r;
      const args = [ch2, msg].concat([].slice.call(arguments, 2));
      withPaper(L, () => { r = _c.apply(this, args); });
      const top = editUndoStack[editUndoStack.length - 1]; if(r && top && top !== top0) top.psLay = L.name;
      return r; }; }
  // hoàn tác / làm lại bước vẽ trên giấy: áp vào danh sách giấy của đúng layout
  { const _ae = window.applyEdit; if(typeof _ae === 'function') window.applyEdit = function(a, fwd){ if(!a || !a.psLay || PSMODE) return _ae.apply(this, arguments); const L = layoutByName(a.psLay); if(!L){ log('Layout "' + a.psLay + '" không còn — bỏ qua bước hoàn tác này.'); return; }
      return withPaper(L, () => _ae.apply(this, [a, fwd])); }; }

  /* ==================================================================
     Tệp chuẩn / lớp chuẩn dạng DWG nhị phân (.dws / .dwg / .dwt) — đọc bảng LAYER, LTYPE, STYLE, DIMSTYLE bằng LibreDWG
     ================================================================== */
  A.isDwgBytes = buf => { try{ const h = new TextDecoder('latin1').decode(new Uint8Array(buf.slice ? buf.slice(0, 6) : buf).subarray(0, 6)); return /^AC10\d\d$/.test(h); }catch(_){ return false; } };
  A.dwgStdTables = async function(buf){
    if(typeof getLibreDwg !== 'function') throw new Error('Thiếu bộ đọc DWG');
    const lib = await getLibreDwg(); const ptr = lib.dwg_read_data(buf, _DwgType.DWG); if(ptr == null) throw new Error('Không đọc được tệp DWG');
    let db; try{ db = lib.convert(ptr); } finally { try{ lib.dwg_free(ptr); }catch(_){} }
    const E = t => (db && db.tables && db.tables[t] && db.tables[t].entries) || [], fin = v => typeof v === 'number' && isFinite(v);
    const T = { LAYER: [], LTYPE: [], STYLE: [], DIMSTYLE: [] };
    for(const L of E('LAYER')){ if(L.name == null || L.name === '') continue; let lw = 0; try{ lw = dwgLW(L.lineweight); }catch(_){} T.LAYER.push({ name: String(L.name), aci: fin(L.colorIndex) ? Math.abs(L.colorIndex) || 7 : 7, lt: (typeof ltNorm === 'function' ? ltNorm(L.lineType) : null) || 'CONTINUOUS', lw: lw > 0 ? lw : 0 }); }
    for(const t of E('LTYPE')){ const n = String(t.name || '').toUpperCase(); if(!n || /^BY(LAYER|BLOCK)$/.test(n)) continue; T.LTYPE.push({ name: n, desc: t.description || '', pat: (t.pattern || []).map(p => +p.elementLength).filter(isFinite) }); }
    for(const s of E('STYLE')){ if(s.name == null || s.name === '') continue; const w = s.widthFactor != null ? s.widthFactor : (s.width_factor != null ? s.width_factor : s.xScale); T.STYLE.push({ name: String(s.name), font: String(s.font || s.primaryFont || s.fontFile || ''), wf: fin(w) && w > 0 ? w : 1 }); }
    for(const d of E('DIMSTYLE')){ if(d.name == null || d.name === '') continue; const r = { name: String(d.name) }; for(const [k, f] of [['txt', 'DIMTXT'], ['asz', 'DIMASZ'], ['exo', 'DIMEXO'], ['exe', 'DIMEXE'], ['gap', 'DIMGAP'], ['dec', 'DIMDEC']]) if(fin(d[f])) r[k] = d[f]; T.DIMSTYLE.push(r); }
    return T; };

  /* ==================================================================
     BẢNG KIỂU IN (.ctb) khi in: kiểu nét, đầu nét, nối nét, kiểu tô (mẫu tô), hệ số tỉ lệ kiểu nét
     ================================================================== */
  const CTBM = new Map(); let ctbT = 0;
  const ctbTable = () => { if(!plotMode || typeof _plotStyle !== 'string' || !_plotStyle.startsWith('ctb:') || !A.ctb) return null; const now = Date.now(); if(now - ctbT > 1500){ CTBM.clear(); ctbT = now; } const n = _plotStyle.slice(4); if(!CTBM.has(n)) CTBM.set(n, A.ctb.get(n)); return CTBM.get(n); };
  const ctbSt = e => { const T = ctbTable(); if(!T || !T.st || !e) return null; return T.st[A.aciOf ? A.aciOf(e.col || A.layerHex(e.layer || '0')) : 7] || null; };
  A.ctbStyleOf = ctbSt;
  const CAP = ['butt', 'square', 'round', 'diamond'], JOIN = ['miter', 'bevel', 'round', 'diamond'];
  const capJoin = st => st && (st.es != null || st.js != null) ? (st.es != null ? CAP[st.es] || 'round' : 'round') + ',' + (st.js != null ? JOIN[st.js] || 'round' : 'round') : '';
  window._plotCJ = e => capJoin(ctbSt(e));
  // canvas chưa có đầu / nối hình thoi: vẽ nét với butt / bevel rồi tô thêm mũi thoi ở hai đầu và ở mỗi đỉnh nối
  const cjCanvas = cj => { const q = String(cj || '').split(','); return [q[0] === 'diamond' ? 'butt' : (q[0] || 'round'), q[1] === 'diamond' ? 'bevel' : (q[1] || 'round')]; };
  window._plotCJc = cjCanvas;
  function diamondDeco(e, w, cj){ const q = String(cj || '').split(','), cap = q[0] === 'diamond', join = q[1] === 'diamond'; if(!(cap || join) || !(w > 1.2)) return;
    let P = null, closed = false;
    if(e.type === 'LINE') P = [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }];
    else if(e.type === 'POLYLINE'){ P = (e.vertices || []).slice(); closed = !!e.closed; }
    else if(e.type === 'ARC'){ const r = e.r, a1 = e.a1 * Math.PI / 180, a2 = e.a2 * Math.PI / 180, d = 1e-3, pt = t => ({ x: e.cx + r * Math.cos(t), y: e.cy + r * Math.sin(t) }); P = [pt(a1), pt(a1 + d), pt(a2 - d), pt(a2)]; }
    if(!P || P.length < 2) return; const S = P.map(p => toScreen(p.x, p.y)), h = w / 2, g = ctx; const sv = g.fillStyle; g.fillStyle = g.strokeStyle;
    const unit = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return { x: dx / L, y: dy / L }; };
    g.beginPath();
    if(cap && !closed){ const ends = [[S[0], unit(S[1], S[0])], [S[S.length - 1], unit(S[S.length - 2], S[S.length - 1])]];
      for(const [p, u] of ends){ const n = { x: -u.y, y: u.x }; g.moveTo(p.x + n.x * h, p.y + n.y * h); g.lineTo(p.x + u.x * h, p.y + u.y * h); g.lineTo(p.x - n.x * h, p.y - n.y * h); g.closePath(); } }
    if(join && e.type !== 'ARC'){ const n = S.length; for(let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++){ const a = S[(i - 1 + n) % n], v = S[i], b = S[(i + 1) % n]; const d1 = unit(a, v), d2 = unit(v, b); const cr = d1.x * d2.y - d1.y * d2.x; if(Math.abs(cr) < 1e-6) continue;
        const sg = cr > 0 ? -1 : 1, n1 = { x: -d1.y * sg, y: d1.x * sg }, n2 = { x: -d2.y * sg, y: d2.x * sg }; let bx = n1.x + n2.x, by = n1.y + n2.y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
        g.moveTo(v.x, v.y); g.lineTo(v.x + n1.x * h, v.y + n1.y * h); g.lineTo(v.x + bx * h, v.y + by * h); g.lineTo(v.x + n2.x * h, v.y + n2.y * h); g.closePath(); } }
    g.fill(); g.fillStyle = sv; }
  window._plotDiamond = diamondDeco;
  // kiểu nét thích ứng (adaptive): co giãn mẫu cho vừa số nguyên lần trên chiều dài đối tượng — đối tượng kết thúc bằng mẫu đủ
  const entLen = e => { const t = e.type; if(t === 'LINE') return Math.hypot(e.x2 - e.x1, e.y2 - e.y1); if(t === 'CIRCLE') return 2 * Math.PI * e.r;
    if(t === 'ARC'){ let sw = ((e.a2 - e.a1) % 360 + 360) % 360; if(sw < 1e-9) sw = 360; return e.r * sw * Math.PI / 180; }
    if(t === 'POLYLINE'){ const V = e.vertices || []; let L = 0; for(let i = 1; i < V.length; i++) L += Math.hypot(V[i].x - V[i - 1].x, V[i].y - V[i - 1].y); if(e.closed && V.length > 2) L += Math.hypot(V[0].x - V[V.length - 1].x, V[0].y - V[V.length - 1].y); return L; }
    return 0; };
  A.entLen = entLen;
  // kiểu nét của bảng kiểu in: mẫu cố định theo mm giấy (ISO không theo hệ số tỉ lệ chung)
  { const _lt = window.ltDash; if(typeof _lt === 'function') window.ltDash = function(e){ const st = plotMode ? ctbSt(e) : null; if(st && st.lt != null && A.PSLT && A.PSLT[st.lt]){ const pat = A.PSLT[st.lt][1]; if(!pat.length) return null;
        const T = ctbTable(), iso = st.lt >= 17, k = 96 / 25.4 * (T && T.af && !iso && T.sf > 0 ? T.sf : 1); let arr = pat.map(v => Math.max(0.4, Math.abs(v) || 0.3) * k), tot = arr.reduce((a, b) => a + b, 0), f = 1;
        if(!st.na){ const Lw = entLen(e), per0 = tot / (view.scale || 1); if(Lw > 0 && per0 > 0){ const n = Math.max(1, Math.round(Lw / per0)); f = +(Lw / n / per0).toFixed(3); if(f > 0 && f !== 1){ arr = arr.map(v => v * f); tot *= f; } else f = 1; } }
        return { arr, key: 'PS' + st.lt + '|' + k + '|' + f, per: tot / (view.scale || 1), off: 0, ad: f }; }
      return _lt.apply(this, arguments); }; }
  // kiểu tô: mẫu tô (pattern) cho vùng tô đặc khi in
  let FILLST = null; const PATM = new Map();
  function fillPat(g, kind, col){ const key = kind + '|' + col; if(PATM.has(key)) return PATM.get(key); const n = 6, c = document.createElement('canvas'); c.width = c.height = n * 2; const q = c.getContext('2d'); q.scale(2, 2);
    q.fillStyle = col; q.strokeStyle = col; q.lineWidth = 0.9; q.beginPath();
    if(kind === 65){ q.fillRect(0, 0, n / 2, n / 2); q.fillRect(n / 2, n / 2, n / 2, n / 2); }
    else if(kind === 66){ q.moveTo(0, n / 2); q.lineTo(n, n / 2); q.moveTo(n / 2, 0); q.lineTo(n / 2, n); }
    else if(kind === 67){ q.moveTo(0, 0); q.lineTo(n, n); q.moveTo(n, 0); q.lineTo(0, n); }
    else if(kind === 68){ q.fillRect(0, n / 2 - 0.6, n, 1.2); }
    else if(kind === 69){ q.moveTo(0, 0); q.lineTo(n, n); q.moveTo(-1, n - 1); q.lineTo(1, n + 1); q.moveTo(n - 1, -1); q.lineTo(n + 1, 1); }
    else if(kind === 70){ q.moveTo(n, 0); q.lineTo(0, n); q.moveTo(-1, 1); q.lineTo(1, -1); q.moveTo(n - 1, n + 1); q.lineTo(n + 1, n - 1); }
    else if(kind === 71){ q.fillRect(n / 2 - 0.8, n / 2 - 0.8, 1.6, 1.6); }
    else if(kind === 72){ q.fillRect(n / 2 - 0.6, 0, 1.2, n); }
    q.stroke(); let p = null; try{ p = g.createPattern(c, 'repeat'); if(p && p.setTransform && typeof DOMMatrix === 'function') p.setTransform(new DOMMatrix().scale(0.5)); }catch(_){} PATM.set(key, p); if(PATM.size > 200) PATM.clear(); return p; }
  { const P = CanvasRenderingContext2D.prototype, _fill = P.fill; P.fill = function(){ if(FILLST != null && plotMode && FILLST !== 64 && FILLST !== 73 && typeof this.fillStyle === 'string'){ const pat = fillPat(this, FILLST, this.fillStyle); if(pat){ const sv = this.fillStyle; this.fillStyle = pat; try{ return _fill.apply(this, arguments); } finally { this.fillStyle = sv; } } } return _fill.apply(this, arguments); }; }
  const styled = fn => function(e){ if(!plotMode) return fn.apply(this, arguments); const st = ctbSt(e); if(!st || (st.es == null && st.js == null && st.fs == null)) return fn.apply(this, arguments);
    const g = ctx, sc = g.lineCap, sj = g.lineJoin, sf = FILLST, cj = capJoin(st); if(cj){ const q = cjCanvas(cj); g.lineCap = q[0]; g.lineJoin = q[1]; } FILLST = st.fs != null ? st.fs : null;
    try{ const r = fn.apply(this, arguments); if(cj && cj.includes('diamond') && e && e.type !== 'HATCH') try{ diamondDeco(e, g.lineWidth, cj); }catch(_){} return r; } finally { g.lineCap = sc; g.lineJoin = sj; FILLST = sf; } };
  if(typeof window.drawEntity === 'function') window.drawEntity = styled(window.drawEntity);
  if(typeof window.drawHatch === 'function') window.drawHatch = styled(window.drawHatch);

  /* ==================================================================
     EXPORTLAYOUT — xuất layout ra không gian mô hình của bản vẽ mới, cắt mọi đối tượng theo khung nhìn (chữ nhật hoặc đa giác VPCLIP / XCLIP)
     ================================================================== */
  const ptIn = (p, P) => { let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ const a = P[i], b = P[j]; if((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
  const clipPolys = c => { const R = c.poly && c.poly.length >= 3 ? c.poly : [{ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y }, { x: c.x + c.w, y: c.y + c.h }, { x: c.x, y: c.y + c.h }]; return c.sub && c.sub.length >= 3 ? [R, c.sub] : [R]; };
  const insideAll = (p, Ps) => Ps.every(P => ptIn(p, P));
  // Sutherland–Hodgman (vùng tô)
  function shClip(poly, clip){ let out = poly; const area = P => { let a = 0; for(let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; a += p.x * q.y - q.x * p.y; } return a / 2; }; const C = area(clip) < 0 ? clip.slice().reverse() : clip;
    for(let i = 0; i < C.length && out.length; i++){ const a = C[i], b = C[(i + 1) % C.length], inp = out; out = []; const side = p => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
      const X = (p, q) => { const d1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x), d2 = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x), t = d1 / (d1 - d2); return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; };
      for(let k = 0; k < inp.length; k++){ const p = inp[k], q = inp[(k + 1) % inp.length], ip = side(p), iq = side(q); if(ip){ out.push(p); if(!iq) out.push(X(p, q)); } else if(iq) out.push(X(p, q)); } }
    return out; }
  // cắt một đường cong theo vùng: lấy mẫu theo tham số, tinh chỉnh điểm ra / vào bằng chia đôi, rồi c.sub(a, b)
  function clipCurve(e, Ps){ const c = A.G && A.G.curveOf ? A.G.curveOf(e) : null; if(!c || !c.at) return null; const u0 = c.u0, u1 = c.u1, nv = (e.vertices || []).length;
    const N = Math.min(6000, Math.max(240, nv * 12)), du = (u1 - u0) / N, inn = u => insideAll(c.at(Math.min(u1, Math.max(u0, u))), Ps);
    const edge = (a, b, ia) => { for(let k = 0; k < 40; k++){ const m = (a + b) / 2; if(inn(m) === ia) a = m; else b = m; } return (a + b) / 2; };
    const iv = []; let prev = inn(u0), st = prev ? u0 : null;
    for(let i = 1; i <= N; i++){ const u = u0 + du * i, cur = inn(u); if(cur !== prev){ const t = edge(u - du, u, prev); if(cur) st = t; else { iv.push([st, t]); st = null; } prev = cur; } }
    if(st != null) iv.push([st, u1]);
    if(!iv.length) return [];
    if(iv.length === 1 && iv[0][0] <= u0 + 1e-12 && iv[0][1] >= u1 - 1e-12) return [e];
    if(!c.sub) return iv.length ? [e] : [];
    const out = []; for(const [a, b] of iv){ if(b - a < (u1 - u0) * 1e-9) continue; try{ const w = c.sub(a, b); if(w){ const q = Array.isArray(w) ? w : [w]; for(const x of q) if(x) out.push(x); } }catch(_){} } return out; }
  function clipEnt(e, Ps){ const t = e.type;
    if(t === 'TEXT' && A.textOutline){ const b = entBBox(e); const C = b ? [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }] : [];
      const vIn = b && Ps.some(P => P.some(q => q.x > b.x0 && q.x < b.x1 && q.y > b.y0 && q.y < b.y1));
      if(b && !vIn && C.every(q => insideAll(q, Ps))) return [e];   // nằm trọn trong khung: giữ chữ
      const loops = A.textOutline(e); if(!loops.length) return insideAll({ x: e.x, y: e.y }, Ps) ? [e] : [];
      const ar = P => { let a = 0; for(let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j].x + P[i].x) * (P[j].y - P[i].y); return Math.abs(a / 2); };
      let a0 = 0, a1 = 0; const L = []; for(const lp of loops){ a0 += ar(lp); let q = lp; for(const P of Ps) q = shClip(q, P); if(q.length >= 3){ a1 += ar(q); L.push(q); } }
      if(!L.length) return []; if(a1 >= a0 * 0.998) return [e];
      return [{ type: 'HATCH', solid: true, layer: e.layer, col: e.col, bl: e.bl, loops: L, txo: 1 }]; }   // chữ cắt ngang khung: đường bao chữ cắt theo khung, tô đặc
    if(t === 'TEXT' || t === 'POINT' || t === 'MTEXT'){ return insideAll({ x: e.x, y: e.y }, Ps) ? [e] : []; }
    if(t === 'HATCH'){ const L = []; for(const lp of e.loops || []){ let q = lp; for(const P of Ps) q = shClip(q, P); if(q.length >= 3) L.push(q); } if(!L.length) return []; return [Object.assign({}, e, { loops: L })]; }
    if(t === 'SOLID'){ let q = (e.pts || []).length === 4 ? [e.pts[0], e.pts[1], e.pts[3], e.pts[2]] : (e.pts || []).slice(); for(const P of Ps) q = shClip(q, P); if(q.length < 3) return []; return [{ type: 'HATCH', solid: true, layer: e.layer, col: e.col, bl: e.bl, loops: [q] }]; }
    if(t === 'IMAGE'){ const b = entBBox(e); if(!b) return []; let q = (typeof imgCorners === 'function') ? imgCorners(e) : null; if(!q) return [e]; for(const P of Ps) q = shClip(q, P); if(q.length < 3) return [];   // ảnh: giữ ảnh + đường cắt theo khung nhìn
      return [Object.assign({}, e, { cpoly: q, _kc: 1 })]; }
    if(t === 'SOLID3D'){ const L = solidPlan(e); if(L) return L.flatMap(x => clipEnt(x, Ps)); }   // khối 3D: hình chiếu bằng (cạnh / biên dạng) rồi cắt như nét
    if(t === 'IMAGE' || t === 'SOLID3D' || t === 'XLINE'){ const b = entBBox(e); if(!b) return []; const P = Ps[0]; const bb = { x0: Math.min(...P.map(p => p.x)), y0: Math.min(...P.map(p => p.y)), x1: Math.max(...P.map(p => p.x)), y1: Math.max(...P.map(p => p.y)) }; return (b.x1 < bb.x0 || b.x0 > bb.x1 || b.y1 < bb.y0 || b.y0 > bb.y1) ? [] : [e]; }
    const r = clipCurve(e, Ps); return r == null ? [e] : r; }
  A.clipToRegion = (e, clip) => clipEnt(e, clipPolys(clip));
  // hình chiếu bằng của khối 3D như khi vẽ trong khung nhìn: lưới → cạnh nhìn thấy; đùn → biên dạng + lỗ; trụ / nón / cầu → đường tròn
  function solidPlan(e){ const base = { layer: e.layer, col: e.col, bl: e.bl, lt: e.lt, lw: e.lw };
    if(e.k === 'mesh' && A.planEdges){ const L = A.planEdges(e) || [], out = []; for(let i = 0; i + 3 < L.length; i += 4) out.push(Object.assign({ type: 'LINE', x1: L[i], y1: L[i + 1], x2: L[i + 2], y2: L[i + 3] }, base)); return out; }
    if(e.k === 'ext' && e.pts && e.pts.length >= 3) return [e.pts].concat(e.holes || []).filter(l => l && l.length >= 3).map(l => Object.assign({ type: 'POLYLINE', closed: true, vertices: l.map(p => ({ x: p.x, y: p.y })) }, base));
    if(e.cx != null && e.r > 0){ const o = [Object.assign({ type: 'CIRCLE', cx: e.cx, cy: e.cy, r: e.r }, base)]; if(e.k === 'cone' && e.r2 > 0 && Math.abs(e.r2 - e.r) > 1e-9) o.push(Object.assign({ type: 'CIRCLE', cx: e.cx, cy: e.cy, r: e.r2 }, base)); return o; }
    return null; }
  A.solidPlan = solidPlan;
  plain(['EXPORTLAYOUT'], 'Xuất layout hiện hành ra bản vẽ mới ở không gian mô hình (DXF): khung tên, đối tượng giấy, nội dung khung nhìn cắt đúng theo khung (chữ nhật / đa giác)', async () => {
    let L = null; try{ L = dwgLayouts[currentLayout]; }catch(_){} if(!L || L.isModel){ log('EXPORTLAYOUT chỉ dùng được khi đang ở một layout (không phải Model).'); return; }
    const out = [], vpo = []; let cut = 0, drop = 0;
    for(const e of entities){ if(!e || e.vpf || (A.isHiddenE && A.isHiddenE(e))) continue; const c = e.clip;
      if(!c){ const w = deep(e); delete w.userAdded; out.push(w); continue; }
      const P = clipPolys(c), b = entBBox(e); if(b){ const R = P[0], x0 = Math.min(...R.map(p => p.x)), x1 = Math.max(...R.map(p => p.x)), y0 = Math.min(...R.map(p => p.y)), y1 = Math.max(...R.map(p => p.y)); if(b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1){ drop++; continue; }
        if(b.x0 >= x0 && b.x1 <= x1 && b.y0 >= y0 && b.y1 <= y1 && !c.poly && !c.sub){ const w = deep(e); delete w.userAdded; delete w.clip; out.push(w); continue; } }
      const src = deep(e); delete src.userAdded; delete src.clip; let r = []; try{ r = clipEnt(src, P); }catch(err){ console.warn('clip', err); r = [src]; }
      if(r.length !== 1 || r[0] !== src) cut++; for(const w of r){ const x = deep(w); if(x._kc){ x.clip = { x: Math.min(...x.cpoly.map(p => p.x)), y: Math.min(...x.cpoly.map(p => p.y)), w: 0, h: 0, poly: x.cpoly }; x.clip.w = Math.max(...x.cpoly.map(p => p.x)) - x.clip.x; x.clip.h = Math.max(...x.cpoly.map(p => p.y)) - x.clip.y; delete x._kc; } else delete x.clip; out.push(x); vpo.push(x); } }
    if(!out.length){ log('Layout không có đối tượng nhìn thấy.'); return; }
    let txt; try{ txt = entitiesToDXF(out); }catch(err){ console.error(err); log('Không tạo được DXF.'); return; }
    const base = docNm().replace(/\.[^.]+$/, ''); await shareOrDownload(new Blob([txt], { type: 'application/dxf' }), base + '_' + String(L.name || 'Layout').replace(/[\\/:*?"<>|]+/g, '_') + '.dxf', 'application/dxf');
    log('EXPORTLAYOUT: đã xuất ' + out.length + ' đối tượng của layout "' + L.name + '" ra không gian mô hình (' + cut + ' đối tượng cắt theo khung nhìn, ' + drop + ' nằm ngoài khung bị bỏ).'); A.lastExportLayout = out; A.lastExportVp = vpo; });

  /* ==================================================================
     GEOGRAPHICLOCATION — Vị trí địa lý theo bản vẽ (vĩ độ / kinh độ, cao độ, hệ toạ độ, điểm thiết kế, hướng bắc, múi giờ)
     dùng cho mặt trời / bóng đổ 3D; điểm mốc (geo marker) trên bản vẽ; GEOREMOVE xoá
     ================================================================== */
  const GEOK = () => { try{ return 'dvd:geo::' + (baseKey || docNm()); }catch(_){ return 'dvd:geo::' + docNm(); } };
  let GEOMK = lsGet('dvd:geomk', 1) ? 1 : 0, geoMemo = null;   // { k, v } — điểm mốc vẽ mỗi khung hình: không đọc localStorage mỗi lần
  const geoGet = () => { const k = GEOK(); if(!geoMemo || geoMemo.k !== k) geoMemo = { k, v: lsGet(k, null) }; return geoMemo.v; };
  const geoSet = g => { if(g) lsSet(GEOK(), g); else { try{ localStorage.removeItem(GEOK()); }catch(_){} } geoMemo = null; geoSun(); try{ draw(); }catch(_){} };
  A.geoGet = geoGet; A.geoSet = geoSet;
  function geoSun(){ const g = geoGet(); if(!g) return; const o = { lat: g.lat, lon: g.lon, tz: g.tz, north: g.north || 0 }; try{ const S = Object.assign(lsGet('dvd:sun', {}), o); lsSet('dvd:sun', S); }catch(_){} try{ if(A.view3D && A.view3D.setSun) A.view3D.setSun(o); }catch(_){} }
  const TZS = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];
  const TZN = { 7: 'Hà Nội, TP Hồ Chí Minh, Bangkok, Jakarta', 8: 'Bắc Kinh, Singapore, Đài Bắc, Perth', 9: 'Tokyo, Seoul', 0: 'London, Lisbon (giờ quốc tế)', 1: 'Paris, Berlin, Rome', 3: 'Moskva, Istanbul', 5.5: 'New Delhi, Mumbai', 10: 'Sydney, Melbourne', '-5': 'New York, Toronto', '-8': 'Los Angeles, Vancouver' };
  const tzLab = t => { const sg = t < 0 ? '-' : '+', a = Math.abs(t), h = Math.floor(a), m = Math.round((a - h) * 60); return '(UTC' + sg + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ')' + (TZN[t] ? ' ' + TZN[t] : ''); };
  const CITIES = [['Hà Nội', 21.0285, 105.8542, 7], ['TP Hồ Chí Minh', 10.7769, 106.7009, 7], ['Đà Nẵng', 16.0544, 108.2022, 7], ['Hải Phòng', 20.8449, 106.6881, 7], ['Cần Thơ', 10.0452, 105.7469, 7], ['Huế', 16.4637, 107.5909, 7],
    ['Nha Trang', 12.2388, 109.1967, 7], ['Đà Lạt', 11.9404, 108.4583, 7], ['Vinh', 18.6796, 105.6813, 7], ['Quy Nhơn', 13.7830, 109.2196, 7], ['Vũng Tàu', 10.3460, 107.0843, 7], ['Hạ Long', 20.9599, 107.0425, 7],
    ['Bangkok', 13.7563, 100.5018, 7], ['Singapore', 1.3521, 103.8198, 8], ['Tokyo', 35.6762, 139.6503, 9], ['Seoul', 37.5665, 126.9780, 9], ['Bắc Kinh', 39.9042, 116.4074, 8], ['Sydney', -33.8688, 151.2093, 10],
    ['London', 51.5074, -0.1278, 0], ['Paris', 48.8566, 2.3522, 1], ['New York', 40.7128, -74.0060, -5], ['San Francisco', 37.7749, -122.4194, -8]];
  const dms = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), sec = (mf - m) * 60; return d + '°' + String(m).padStart(2, '0') + "'" + sec.toFixed(3).padStart(6, '0') + '" ' + (v < 0 ? neg : pos); };
  const parseDeg = t => { t = String(t || '').trim().replace(',', '.'); const neg = /[SWsw]|^-/.test(t); const n = t.match(/[\d.]+/g); if(!n) return null; const v = (+n[0] || 0) + (+n[1] || 0) / 60 + (+n[2] || 0) / 3600; return isFinite(v) ? (neg ? -v : v) : null; };
  function geoDlg(){ return new Promise(res => { const g0 = geoGet() || {}; const S0 = lsGet('dvd:sun', {}); const G = Object.assign({ lat: S0.lat != null ? S0.lat : 21.0285, lon: S0.lon != null ? S0.lon : 105.8542, elev: 0, cs: 'WGS84', dx: 0, dy: 0, north: S0.north || 0, tz: S0.tz != null ? S0.tz : 7, fmt: 'dd' }, g0);
    const html = '<div class="acw" style="width:520px">' +
      K.grp('Vĩ độ & kinh độ', K.row('Định dạng:', K.sel('geF', [['dd', 'Độ thập phân'], ['dms', 'Độ / phút / giây']], G.fmt)) + '<div class="acw-cols"><div class="c1">' + K.row('Vĩ độ:', K.txt('geLa', '')) + K.row('Kinh độ:', K.txt('geLo', '')) + '</div><div class="c2" style="width:120px">' +
        K.sel('geNS', [['N', 'Bắc (N)'], ['S', 'Nam (S)']], G.lat < 0 ? 'S' : 'N') + '<div style="height:4px"></div>' + K.sel('geEW', [['E', 'Đông (E)'], ['W', 'Tây (W)']], G.lon < 0 ? 'W' : 'E') + '</div></div><div class="acw-row">' + K.sel('geC', [['', '— Chọn thành phố —']].concat(CITIES.map((c, i) => [String(i), c[0]])), '') + '</div>') +
      '<div class="acw-cols"><div class="c1">' + K.grp('Toạ độ & cao độ', K.row('Cao độ:', K.num('geEl', G.elev)) + K.row('Hệ toạ độ:', K.txt('geCs', G.cs, { ph: 'WGS84 / VN-2000 UTM 48N' }))) +
        K.grp('Điểm thiết kế trong bản vẽ', K.row('X:', K.num('geX', G.dx)) + K.row('Y:', K.num('geY', G.dy)) + K.btn('gePk', 'Chọn điểm <')) + '</div><div class="c1">' +
        K.grp('Hướng bắc', K.row('Góc (độ):', K.num('geN', G.north)) + '<canvas id="geNC" width="160" height="160" style="width:80px;height:80px;display:block;margin:4px auto"></canvas>') + K.grp('Múi giờ', K.sel('geTz', TZS.map(t => [String(t), tzLab(t)]), String(G.tz))) + '</div></div></div>';
    const d = A.dialog({ title: 'Vị trí địa lý', cls: 'acw-free', help: 'GEOGRAPHICLOCATION', html, ok: r => { const g = read(); if(g.lat == null || g.lon == null || Math.abs(g.lat) > 90 || Math.abs(g.lon) > 180){ say('Vĩ độ / kinh độ không hợp lệ.'); return false; } res(g); }, cancel: () => res(null) });
    const root = d.root, $ = id => root.querySelector('#' + id);
    const show = () => { const f = $('geF').value, la = Math.abs(G.lat), lo = Math.abs(G.lon); $('geLa').value = f === 'dms' ? dms(la, '', '').trim() : +la.toFixed(7); $('geLo').value = f === 'dms' ? dms(lo, '', '').trim() : +lo.toFixed(7); $('geNS').value = G.lat < 0 ? 'S' : 'N'; $('geEW').value = G.lon < 0 ? 'W' : 'E'; };
    const read = () => { const la = parseDeg($('geLa').value), lo = parseDeg($('geLo').value); if(la != null) G.lat = Math.abs(la) * ($('geNS').value === 'S' ? -1 : 1); if(lo != null) G.lon = Math.abs(lo) * ($('geEW').value === 'W' ? -1 : 1);
      G.elev = num($('geEl').value) || 0; G.cs = $('geCs').value.trim() || 'WGS84'; G.dx = num($('geX').value) || 0; G.dy = num($('geY').value) || 0; G.north = num($('geN').value) || 0; G.tz = +$('geTz').value; G.fmt = $('geF').value; return Object.assign({}, G); };
    const comp = () => { const c = $('geNC'), g = c.getContext('2d'), a = (num($('geN').value) || 0) * Math.PI / 180; g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 80, 80); g.strokeStyle = '#8a94a6'; g.beginPath(); g.arc(40, 40, 34, 0, 7); g.stroke();
      const x = 40 - Math.sin(a) * 30, y = 40 - Math.cos(a) * 30; g.strokeStyle = '#ff5050'; g.lineWidth = 2; g.beginPath(); g.moveTo(40 + Math.sin(a) * 18, 40 + Math.cos(a) * 18); g.lineTo(x, y); g.stroke(); g.fillStyle = '#ff5050'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('N', 40 - Math.sin(a) * 22, 40 - Math.cos(a) * 22 + 4); };
    $('geF').onchange = () => { read(); show(); }; $('geN').addEventListener('input', comp);
    $('geC').onchange = () => { const c = CITIES[+$('geC').value]; if(!c) return; G.lat = c[1]; G.lon = c[2]; G.tz = c[3]; $('geTz').value = String(c[3]); show(); };
    $('gePk').onclick = () => { read(); root.style.display = 'none'; A.run('GEOPOINT', async () => { try{ const r = await A.getPoint('Chỉ định điểm thiết kế (vị trí ứng với vĩ độ / kinh độ)'); if(r.pt){ G.dx = r.pt.x; G.dy = r.pt.y; $('geX').value = r6(r.pt.x); $('geY').value = r6(r.pt.y); } } finally { root.style.display = ''; } }); };
    root.addEventListener('keydown', e => e.stopPropagation(), true);
    show(); comp(); }); }
  plain(['GEOGRAPHICLOCATION', 'GEO'], 'Vị trí địa lý (Geographic Location): vĩ độ / kinh độ, cao độ, hệ toạ độ, điểm thiết kế, hướng bắc, múi giờ — dùng cho mặt trời và bóng đổ', async () => {
    if(A.busy && A.busy()) A.cancel(true); const g = await geoDlg(); if(!g) return; geoSet(g);
    log('Vị trí địa lý: ' + dms(g.lat, 'N', 'S') + ', ' + dms(g.lon, 'E', 'W') + ' · ' + tzLab(g.tz) + ' · hướng bắc ' + r6(g.north) + '°'); });
  plain(['GEOREMOVE'], 'Xoá mọi thông tin vị trí địa lý khỏi bản vẽ', () => { if(!geoGet()){ log('Bản vẽ chưa có vị trí địa lý.'); return; } geoSet(null); log('GEOREMOVE: đã xoá vị trí địa lý của bản vẽ.'); });
  plain(['GEOMARKERVISIBILITY'], 'Hiện / ẩn điểm mốc vị trí địa lý trên bản vẽ', () => { const v = lsGet('dvd:geomk', 1) ? 0 : 1; lsSet('dvd:geomk', v); GEOMK = v; try{ draw(); }catch(_){} log('GEOMARKERVISIBILITY = ' + v); });
  if(A.sysvar && A.sysvar.def){ const gv = (k, d) => () => { const g = geoGet(); return g ? g[k] : d; };
    A.sysvar.def('LATITUDE', { d: 'Vĩ độ của bản vẽ (GEOGRAPHICLOCATION)', get: gv('lat', 0), set: v => { const g = geoGet() || {}; if(isFinite(+v) && Math.abs(+v) <= 90){ g.lat = +v; if(g.lon == null) g.lon = 0; if(g.tz == null) g.tz = 7; geoSet(g); } } });
    A.sysvar.def('LONGITUDE', { d: 'Kinh độ của bản vẽ (GEOGRAPHICLOCATION)', get: gv('lon', 0), set: v => { const g = geoGet() || {}; if(isFinite(+v) && Math.abs(+v) <= 180){ g.lon = +v; if(g.lat == null) g.lat = 0; if(g.tz == null) g.tz = 7; geoSet(g); } } });
    A.sysvar.def('NORTHDIRECTION', { d: 'Góc hướng bắc so với trục Y (độ)', get: gv('north', 0), set: v => { const g = geoGet(); if(g && isFinite(+v)){ g.north = +v; geoSet(g); } } });
    A.sysvar.def('TIMEZONE', { d: 'Múi giờ (mã AutoCAD: giờ × 1000, vd 7000 = UTC+7)', get: () => { const g = geoGet(); return Math.round((g ? g.tz : 7) * 1000); }, set: v => { const g = geoGet(); if(g && isFinite(+v)){ g.tz = +v / 1000; geoSet(g); } } });
    A.sysvar.def('GEOMARKERVISIBILITY', { d: 'Hiện điểm mốc vị trí địa lý (0/1)', get: () => lsGet('dvd:geomk', 1) ? 1 : 0, set: v => { lsSet('dvd:geomk', +v ? 1 : 0); GEOMK = +v ? 1 : 0; try{ draw(); }catch(_){} } }); }
  // điểm mốc địa lý trên bản vẽ (như geo marker của AutoCAD)
  { const _draw = window.draw; if(typeof _draw === 'function') window.draw = function(){ const r = _draw.apply(this, arguments); try{ const g = (!(typeof _exporting !== 'undefined' && _exporting) && !plotMode && isModelView() && GEOMK) ? geoGet() : null;
        if(g){ const q = toScreen(g.dx || 0, g.dy || 0), c = ctx; c.save(); const dpr = window.devicePixelRatio || 1; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#e8453c'; c.strokeStyle = '#fff'; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(q.x, q.y); c.bezierCurveTo(q.x - 9, q.y - 12, q.x - 8, q.y - 24, q.x, q.y - 24); c.bezierCurveTo(q.x + 8, q.y - 24, q.x + 9, q.y - 12, q.x, q.y); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(q.x, q.y - 16, 3, 0, 7); c.fill(); c.restore(); } }catch(_){} return r; }; }
  // DXF: ghi $LATITUDE / $LONGITUDE / $NORTHDIRECTION / $TIMEZONE (+ v5t: đối tượng GEODATA ở DXF/DWG 2010+); đọc lại khi mở tệp có GEODATA
  A.geoHeader = P => { const g = geoGet(); if(!g) return; P(999, 'DVDCAD-GEO ' + JSON.stringify({ lat: g.lat, lon: g.lon, elev: g.elev || 0, cs: g.cs || 'WGS84', dx: g.dx || 0, dy: g.dy || 0, north: g.north || 0, tz: g.tz })); P(9, '$LATITUDE'); P(40, g.lat); P(9, '$LONGITUDE'); P(40, g.lon); P(9, '$NORTHDIRECTION'); P(40, (g.north || 0) * Math.PI / 180); P(9, '$TIMEZONE'); P(70, Math.round((g.tz || 0) * 1000)); };
  let geoPend = null;
  { const _pd = window.parseDXF; if(typeof _pd === 'function') window.parseDXF = function(text){ try{ geoPend = null; const t = String(text);
        const hv = (n, c) => { const m = new RegExp('\\n\\s*9\\s*\\r?\\n\\' + n + '\\s*\\r?\\n\\s*' + c + '\\s*\\r?\\n\\s*([-+\\d.eE]+)').exec(t); return m ? +m[1] : null; };
        const dv = /\n\s*999\s*\r?\nDVDCAD-GEO (\{[^\r\n]*\})/.exec(t); if(dv){ try{ const o = JSON.parse(dv[1]); if(isFinite(o.lat) && isFinite(o.lon)) geoPend = o; }catch(_){} }
        if(!geoPend && A.geodataParse){ try{ const gd = A.geodataParse(t); if(gd) geoPend = Object.assign({ tz: (() => { const tz = hv('$TIMEZONE', 70); return tz != null ? tz / 1000 : 7; })() }, gd); }catch(_){} }   // GEODATA của AutoCAD: điểm thiết kế, điểm tham chiếu, hệ toạ độ (địa lý / UTM), hướng bắc
        if(!geoPend && /\n\s*0\s*\r?\n\s*GEODATA\s*\r?\n/.test(t)){ const la = hv('$LATITUDE', 40), lo = hv('$LONGITUDE', 40); if(la != null && lo != null){ const nd = hv('$NORTHDIRECTION', 40), tz = hv('$TIMEZONE', 70); geoPend = { lat: la, lon: lo, north: nd != null ? r6(nd * 180 / Math.PI) : 0, tz: tz != null ? tz / 1000 : 7, elev: 0, cs: 'WGS84', dx: 0, dy: 0 }; } } }catch(_){} return _pd.apply(this, arguments); }; }
  A.onLoad = (function(prev){ return function(){ if(prev) prev.apply(this, arguments); try{ geoMemo = null; const gf = A._geoFromFile; A._geoFromFile = null; const g1 = gf && isFinite(gf.lat) && isFinite(gf.lon) ? gf : geoPend;   // dữ liệu riêng DVDCAD (DXF/DWG) đủ nhất, rồi GEODATA / $LATITUDE
    if(g1 && !geoGet()){ lsSet(GEOK(), g1); geoMemo = null; } geoPend = null; geoSun(); }catch(_){} }; })(A.onLoad);

  /* ==================================================================
     MSLIDE / VSLIDE — tệp slide .sld của AutoCAD (định dạng mới, cấp 2): nét vẽ là vector theo điểm ảnh màn hình,
     chữ / vùng tô quét thành các đoạn ngang; VSLIDE đọc .sld (cấp 1 & 2) và thư viện .slb; SLIDELIB gộp nhiều .sld thành .slb
     ================================================================== */
  function slideMake(){ const cvEl = document.getElementById('cv'); const Wd = Math.max(2, Math.round(cvEl.clientWidth)), Hd = Math.max(2, Math.round(cvEl.clientHeight)), hx = Math.min(32767, Wd - 1), hy = Math.min(32767, Hd - 1);
    const V = []; const push = (c, x1, y1, x2, y2) => V.push([c, x1, y1, x2, y2]);
    const bb = viewWorldAABB(); const vis = entities.filter(e => { if(!e || e.vh || e.xh || e.avh || e.vpf || (A.isHiddenE && A.isHiddenE(e))) return false; const b = entBBox(e); return b && !(b.x1 < bb.minX || b.x0 > bb.maxX || b.y1 < bb.minY || b.y0 > bb.maxY); });
    const aciOf = e => { try{ return A.aciNear(e.col || A.layerHex(e.layer || '0')) || 7; }catch(_){ return 7; } };
    const clip = (p, q) => { let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y, P = [-dx, dx, -dy, dy], Q = [p.x, hx - p.x, p.y, hy - p.y]; for(let i = 0; i < 4; i++){ if(P[i] === 0){ if(Q[i] < 0) return null; } else { const t = Q[i] / P[i]; if(P[i] < 0){ if(t > t1) return null; if(t > t0) t0 = t; } else { if(t < t0) return null; if(t < t1) t1 = t; } } } return [p.x + t0 * dx, p.y + t0 * dy, p.x + t1 * dx, p.y + t1 * dy]; };
    const sc = (x, y) => { const q = toScreen(x, y); return { x: q.x, y: hy - q.y }; };
    const raster = new Map();
    for(const e of vis){ const t = e.type;
      if(t === 'TEXT' && A.textOutline){ const c = aciOf(e); try{ const px = Math.max(24, Math.min(160, (e.h || 2.5) * view.scale * 2)); for(const L of A.textOutline(e, { px, tol: 0.25 })) for(let i = 0; i < L.length; i++){ const r = clip(sc(L[i].x, L[i].y), sc(L[(i + 1) % L.length].x, L[(i + 1) % L.length].y)); if(r) push(c, ...r); } }catch(_){} }   // cạnh chữ: vector theo đường bao
      if(t === 'TEXT' || t === 'HATCH' || t === 'SOLID' || t === 'MTEXT' || e.pw || e.wq || t === 'SOLID3D'){ const c = aciOf(e); if(!raster.has(c)) raster.set(c, []); raster.get(c).push(e); continue; }
      if(t === 'IMAGE') continue;
      const c = aciOf(e);
      if(t === 'POINT'){ const q = sc(e.x, e.y); if(q.x >= 0 && q.y >= 0 && q.x <= hx && q.y <= hy) push(c, q.x, q.y, q.x, q.y); continue; }
      if(t === 'LINE'){ const r = clip(sc(e.x1, e.y1), sc(e.x2, e.y2)); if(r) push(c, ...r); continue; }
      const cv = A.G && A.G.curveOf ? A.G.curveOf(e) : null; if(!cv || !cv.at) continue;
      const lenPx = (cv.len || 0) * view.scale, nv = (e.vertices || []).length, n = Math.min(4000, Math.max(nv * 2, Math.ceil(lenPx / 3), 8)); let pv = sc(...Object.values(cv.at(cv.u0)));
      for(let i = 1; i <= n; i++){ const w = cv.at(cv.u0 + (cv.u1 - cv.u0) * i / n), q = sc(w.x, w.y); const r = clip(pv, q); if(r) push(c, ...r); pv = q; } }
    // chữ, vùng tô: vẽ ra canvas phụ rồi quét theo hàng điểm ảnh
    if(raster.size){ const off = document.createElement('canvas'); off.width = Wd; off.height = Hd; const g = off.getContext('2d');
      const sv = { ctx, plot: plotMode, st: _plotStyle, dpr: window.devicePixelRatio };
      try{ ctx = g; plotMode = true; _plotStyle = 'mono'; Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
        for(const [c, L] of raster){ g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wd, Hd);
          for(const e of L){ try{ if(e.type === 'HATCH') drawHatch(e); else drawEntity(e); }catch(_){} }
          const D = g.getImageData(0, 0, Wd, Hd).data;
          for(let y = 0; y < Hd; y++){ let x0 = -1; for(let x = 0; x <= Wd; x++){ const on = x < Wd && D[(y * Wd + x) * 4 + 3] > 96; if(on && x0 < 0) x0 = x; else if(!on && x0 >= 0){ const yy = hy - y; if(yy >= 0 && yy <= hy) push(c, x0, yy, Math.min(hx, x - 1), yy); x0 = -1; } } } } }
      finally { ctx = sv.ctx; plotMode = sv.plot; _plotStyle = sv.st; Object.defineProperty(window, 'devicePixelRatio', { value: sv.dpr, configurable: true }); try{ draw(); }catch(_){} } }
    // ghi tệp: đầu tệp 31 byte + bản ghi màu (FF) / vector (4 × 2 byte) / kết thúc (FC)
    V.sort((a, b) => a[0] - b[0]); const n = V.length; const buf = new ArrayBuffer(31 + n * 8 + 256 * 2 + 2), dv = new DataView(buf), u8 = new Uint8Array(buf);
    const sig = 'AutoCAD Slide\r\n\x1a'; for(let i = 0; i < sig.length; i++) u8[i] = sig.charCodeAt(i); u8[16] = 0; u8[17] = 0x56; u8[18] = 2; dv.setUint16(19, hx, true); dv.setUint16(21, hy, true); dv.setUint32(23, Math.round(Wd / Hd * 1e7), true); dv.setUint16(27, 0, true); dv.setUint16(29, 0x1234, true);
    let o = 31, cur = -1; const R = v => Math.max(0, Math.min(32767, Math.round(v)));
    for(const [c, x1, y1, x2, y2] of V){ if(c !== cur){ dv.setUint16(o, 0xFF00 | (c & 255), true); o += 2; cur = c; } dv.setUint16(o, R(x1), true); dv.setUint16(o + 2, R(y1), true); dv.setUint16(o + 4, R(x2), true); dv.setUint16(o + 6, R(y2), true); o += 8; }
    dv.setUint16(o, 0xFC00, true); o += 2; return { bytes: u8.slice(0, o), vectors: n, w: hx + 1, h: hy + 1 }; }
  A.slideMake = slideMake;
  function slideParse(buf){ const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); const head = String.fromCharCode(...u8.slice(0, 13)); if(head !== 'AutoCAD Slide') throw new Error('Không phải tệp slide (.sld)');
    const lvl = u8[18]; let o, le = true, hx, hy, asp;
    if(lvl >= 2){ hx = dv.getUint16(19, true); hy = dv.getUint16(21, true); asp = dv.getUint32(23, true) / 1e7; const tn = dv.getUint16(29, true); le = tn === 0x1234; if(!le){ hx = dv.getUint16(19, false); hy = dv.getUint16(21, false); } o = 31; }
    else { hx = dv.getUint16(19, true); hy = dv.getUint16(21, true); asp = dv.getFloat64(23, true); o = 34; }
    const rd = () => { const v = dv.getUint16(o, le); o += 2; return v; }, sb = () => { const v = dv.getInt8(o); o += 1; return v; };
    const L = []; let col = 7, lf = { x: 0, y: 0 }, lt = { x: 0, y: 0 }, fill = null;
    while(o + 2 <= u8.length){ const w = rd(), hi = w >> 8;
      if(hi <= 0x7F){ if(o + 6 > u8.length) break; const fx = w, fy = rd(), tx = rd(), ty = rd(); lf = { x: fx, y: fy }; lt = { x: tx, y: ty }; L.push([col, fx, fy, tx, ty]); }
      else if(hi === 0xFB){ const dfx = (w & 0xFF) << 24 >> 24, dfy = sb(), dtx = sb(), dty = sb(); const f = { x: lf.x + dfx, y: lf.y + dfy }, t = { x: lf.x + dtx, y: lf.y + dty }; L.push([col, f.x, f.y, t.x, t.y]); lf = f; lt = t; }
      else if(hi === 0xFC) break;
      else if(hi === 0xFD){ const x = dv.getInt16(o, le), y = dv.getInt16(o + 2, le); o += 4; if(y < 0){ if(fill && fill.pts.length){ L.push([col, 'F', fill.pts]); fill = null; } else fill = { pts: [] }; } else if(fill) fill.pts.push({ x, y }); }
      else if(hi === 0xFE){ const dx = (w & 0xFF) << 24 >> 24, dy = sb(); const t = { x: lt.x + dx, y: lt.y + dy }; L.push([col, lt.x, lt.y, t.x, t.y]); lf = lt; lt = t; }
      else if(hi === 0xFF) col = w & 0xFF;
      else break; }
    return { w: hx + 1, h: hy + 1, asp: asp || (hx + 1) / (hy + 1), items: L, level: lvl }; }
  A.slideParse = slideParse;
  function slbParse(buf){ const u8 = new Uint8Array(buf); const head = String.fromCharCode(...u8.slice(0, 25)); if(head !== 'AutoCAD Slide Library 1.0') return null; const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), out = [];
    for(const [nl, step] of [[32, 36], [31, 36]]){ out.length = 0; let o = 32, okAll = true; while(o + step <= u8.length){ let name = ''; for(let i = 0; i < nl; i++){ const c = u8[o + i]; if(!c) break; name += String.fromCharCode(c); } if(!name) break; const addr = dv.getUint32(o + nl + (step - nl - 4), true);
        if(addr <= 0 || addr + 13 > u8.length || String.fromCharCode(...u8.slice(addr, addr + 13)) !== 'AutoCAD Slide'){ okAll = false; break; } out.push({ name, addr }); o += step; }
      if(okAll && out.length) break; }
    return out.map((s, i) => ({ name: s.name, bytes: u8.slice(s.addr, i + 1 < out.length ? out[i + 1].addr : u8.length) })); }
  A.slbParse = slbParse;
  function slbBuild(list){ const enc = n => String(n).toUpperCase().replace(/\.SLD$/i, '').replace(/[^\x20-\x7e]/g, '_').slice(0, 31); const dirLen = 32 + (list.length + 1) * 36; let total = dirLen; for(const s of list) total += s.bytes.length;
    const u8 = new Uint8Array(total), dv = new DataView(u8.buffer); const sig = 'AutoCAD Slide Library 1.0\r\n\x1a'; for(let i = 0; i < sig.length; i++) u8[i] = sig.charCodeAt(i);
    let o = 32, a = dirLen; for(const s of list){ const nm = enc(s.name); for(let i = 0; i < nm.length; i++) u8[o + i] = nm.charCodeAt(i); dv.setUint32(o + 32, a, true); u8.set(s.bytes, a); a += s.bytes.length; o += 36; } return u8; }
  A.slbBuild = slbBuild;
  let slideEl = null; const slideClose = () => { if(slideEl){ slideEl.remove(); slideEl = null; } };
  A.slideClose = slideClose;
  function slideShow(S, name){ slideClose(); const cvEl = document.getElementById('cv'); if(!cvEl) return; const r = cvEl.getBoundingClientRect(), W0 = cvEl.clientWidth, H0 = cvEl.clientHeight;
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + W0 + 'px;height:' + H0 + 'px;z-index:40;pointer-events:none';
    const c = document.createElement('canvas'); const dpr = window.devicePixelRatio || 1; c.width = Math.round(W0 * dpr); c.height = Math.round(H0 * dpr); c.style.cssText = 'width:100%;height:100%;display:block'; wrap.appendChild(c);
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '✕ ' + (name || 'Slide') + ' — REDRAW để đóng'; b.style.cssText = 'position:absolute;right:8px;top:8px;pointer-events:auto;background:#2c323d;color:#e6eaf0;border:1px solid #5a6578;border-radius:3px;font:12px system-ui;padding:3px 8px;cursor:pointer'; b.onclick = slideClose; wrap.appendChild(b);
    document.body.appendChild(wrap); slideEl = wrap; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = (typeof getCSS === 'function' && getCSS('--bg-canvas')) || '#1e232b'; g.fillRect(0, 0, W0, H0);
    const k = Math.min(W0 / S.w, H0 / S.h), ox = (W0 - S.w * k) / 2, oy = (H0 - S.h * k) / 2, X = x => ox + (x + 0.5) * k, Y = y => oy + (S.h - 1 - y + 0.5) * k; g.lineWidth = Math.max(1, k * 0.9); g.lineCap = 'square';
    let cur = null; for(const it of S.items){ const col = typeof aciHex === 'function' ? aciHex(it[0] || 7) : '#fff';
      if(it[1] === 'F'){ g.fillStyle = col; g.beginPath(); it[2].forEach((p, i) => i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))); g.closePath(); g.fill(); continue; }
      if(col !== cur){ if(cur) g.stroke(); g.strokeStyle = col; g.beginPath(); cur = col; } g.moveTo(X(it[1]), Y(it[2])); if(it[1] === it[3] && it[2] === it[4]) g.lineTo(X(it[3]) + 0.01, Y(it[4])); else g.lineTo(X(it[3]), Y(it[4])); }
    if(cur) g.stroke(); }
  { const _fr = window.forceRedraw; if(typeof _fr === 'function') window.forceRedraw = function(){ slideClose(); return _fr.apply(this, arguments); }; }
  window.addEventListener('keydown', e => { if(e.key === 'Escape' && slideEl) slideClose(); }, true);
  plain(['MSLIDE'], 'Tạo tệp slide .sld từ khung nhìn hiện hành (Make Slide)', async () => { if(!entities.length){ say('Chưa có bản vẽ.'); return; } const r = slideMake(); const nm = docNm().replace(/\.[^.]+$/, '') + '.sld';
    await shareOrDownload(new Blob([r.bytes], { type: 'application/octet-stream' }), nm, 'application/octet-stream'); log('MSLIDE: đã tạo ' + nm + ' (' + r.vectors + ' vector, ' + r.w + '×' + r.h + ' điểm ảnh).'); });
  const pickF = (accept, multi) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multi; i.onchange = () => res([...i.files]); i.click(); });
  async function vslide(){ const F = await pickF('.sld,.slb'); const f = F && F[0]; if(!f) return; const buf = await f.arrayBuffer();
    const lib = slbParse(buf); if(lib){ if(!lib.length){ say('Thư viện slide trống.'); return; }
      const nm = await new Promise(res => { const d = A.dialog({ title: 'Chọn slide trong thư viện', cls: 'acw-free', help: 'VSLIDE', html: '<div class="acw" style="width:320px"><div class="acw-lab">' + esc(f.name) + ' (' + lib.length + ' slide)</div>' + K.list('vsL', lib.map(s => ({ v: s.name, t: s.name })), lib[0].name, 'height:200px') + '</div>', ok: r => { const it = r.querySelector('#vsL .it.on'); res(it ? it.dataset.v : null); }, cancel: () => res(null) }); K.bindList(d.root.querySelector('#vsL'), () => {}, () => d.root.querySelector('.dvd-ok').click()); });
      const s = lib.find(x => x.name === nm); if(!s) return; const S = slideParse(s.bytes); slideShow(S, f.name + '(' + nm + ')'); log('VSLIDE: ' + f.name + '(' + nm + ') — ' + S.items.length + ' vector. REDRAW để trở lại bản vẽ.'); return; }
    let S; try{ S = slideParse(buf); }catch(err){ say(err.message || 'Không đọc được slide.'); return; } slideShow(S, f.name); log('VSLIDE: ' + f.name + ' — ' + S.items.length + ' vector (slide cấp ' + S.level + '). REDRAW để trở lại bản vẽ.'); }
  plain(['VSLIDE'], 'Xem tệp slide .sld hoặc một slide trong thư viện .slb (View Slide); REDRAW để trở lại bản vẽ', () => { if(A.busy && A.busy()) A.cancel(true); vslide(); });
  plain(['SLIDELIB'], 'Gộp nhiều tệp slide .sld thành thư viện slide .slb (như tiện ích SLIDELIB của AutoCAD)', async () => { const F = await pickF('.sld', true); if(!F || !F.length) return; const list = [];
    for(const f of F){ const b = new Uint8Array(await f.arrayBuffer()); if(String.fromCharCode(...b.slice(0, 13)) === 'AutoCAD Slide') list.push({ name: f.name, bytes: b }); }
    if(!list.length){ say('Không có tệp .sld hợp lệ.'); return; } await shareOrDownload(new Blob([slbBuild(list)], { type: 'application/octet-stream' }), 'slides.slb', 'application/octet-stream'); log('SLIDELIB: đã gộp ' + list.length + ' slide vào slides.slb.'); });

  /* ==================================================================
     CUI — Customize User Interface (như AutoCAD): lệnh tự tạo (macro), thanh truy cập nhanh, tab ribbon riêng,
     phím tắt, thao tác nhấp đúp theo loại đối tượng, tệp tuỳ biến bổ sung (CUILOAD / CUIUNLOAD), xuất / nhập (CUIEXPORT / CUIIMPORT)
     ================================================================== */
  const CUIK = 'dvd:cui';
  const QAT0 = ['NEW', 'OPEN', 'SAVE', 'SAVEAS', 'PLOT', 'UNDO', 'REDO'];
  const cuiNorm = o => Object.assign({ cmds: [], qat: null, keys: [], dbl: {}, tabs: [], menus: [], partial: [] }, o && typeof o === 'object' ? o : {});
  const cuiGet = () => cuiNorm(lsGet(CUIK, {}));
  const cuiEff = C => { const E = { cmds: C.cmds.slice(), qat: C.qat, keys: C.keys.slice(), dbl: Object.assign({}, C.dbl), tabs: C.tabs.slice(), menus: (C.menus || []).slice() };
    for(const P of C.partial || []){ const d = cuiNorm(P.data); for(const c of d.cmds) if(!E.cmds.some(x => x.name === c.name)) E.cmds.push(c); for(const k of d.keys) if(!E.keys.some(x => x.key === k.key)) E.keys.push(k); for(const k of Object.keys(d.dbl)) if(!E.dbl[k]) E.dbl[k] = d.dbl[k]; for(const t of d.tabs) E.tabs.push(Object.assign({}, t, { id: 'p' + t.id })); for(const m of d.menus || []) E.menus.push(m); }
    return E; };
  // chạy macro kiểu AutoCAD: ^C huỷ, ; hoặc dấu cách = Enter, \ = chờ người dùng nhập, _ . ' tiền tố, * lặp
  let pauseRes = null;
  { const _rr = A.onReqRes; A.onReqRes = function(){ if(_rr) try{ _rr.apply(this, arguments); }catch(_){} if(pauseRes){ const r = pauseRes; pauseRes = null; setTimeout(r, 0); } }; }
  const waitUser = () => new Promise(res => { pauseRes = res; const t = setInterval(() => { if(!(A.busy && A.busy())){ clearInterval(t); if(pauseRes === res){ pauseRes = null; res(); } } else if(!pauseRes){ clearInterval(t); } }, 150); });
  async function runMacro(m){ let s = String(m || '').trim(); if(/^\$M=/i.test(s)) s = (A.diesel ? A.diesel(s.slice(3)) : s.slice(3)).trim();   // $M= : tính DIESEL trước khi chạy
    if(s.startsWith('*')) s = s.slice(1); let cancel = false; while(/^\^C/i.test(s)){ s = s.slice(2); cancel = true; } if(cancel && A.busy && A.busy()) A.cancel(true);
    s = s.replace(/\^M/gi, ';'); const toks = []; let cur = ''; for(const ch of s){ if(ch === ';' || ch === ' '){ toks.push(cur); cur = ''; } else if(ch === '\\'){ if(cur) toks.push(cur); toks.push('\\'); cur = ''; } else cur += ch; } if(cur) toks.push(cur);
    const wait = ms => new Promise(r => setTimeout(r, ms)); let started = false;
    for(let i = 0; i < toks.length; i++){ const t = toks[i];
      if(t === '\\'){ if(A.busy && A.busy()) await waitUser(); continue; }
      if(!started || !(A.busy && A.busy())){ if(t === '') continue; DVDCmd.run(t.replace(/^['_.]+/, '')); started = true; }
      else A.input(t);
      await wait(30); } }
  A.runMacro = runMacro;
  let CUIREG = new Set(), CUIKEYS = new Map(), CUIDBL = {};
  function cuiApply(){ const C = cuiEff(cuiGet());
    // lệnh tự tạo
    const now = new Set(C.cmds.map(c => String(c.name).toUpperCase()));
    for(const n of CUIREG) if(!now.has(n)){ const i = DVDCmd.commands.findIndex(c => c.k[0] === n && c.cui); if(i >= 0) DVDCmd.commands.splice(i, 1); }
    const DI = window.DVDIcons || (window.DVDIcons = {}); const imgIcon = c => { if(!c.img) return null; const k = 'CUII_' + String(c.name).toUpperCase(); DI[k] = '<image href="' + c.img + '" x="2" y="2" width="20" height="20" preserveAspectRatio="xMidYMid meet"/>'; if(A.ICONS) A.ICONS[k] = DI[k]; return k; };   // hình nút trong gói .cuix
    CUIREG = now; for(const c of C.cmds){ const n = String(c.name).toUpperCase(); if(!/^[A-Z0-9_\-]+$/.test(n)) continue; DVDCmd.register([n], (c.desc || 'Lệnh tự tạo') + ' — macro: ' + c.macro, () => runMacro(c.macro), { cui: 1, icon: imgIcon(c) || c.icon || null }); }
    try{ if(A.menuBarSet) A.menuBarSet(C.menus || []); }catch(_){}
    DVDCmd.register(['CUIAPPLY'], 'Áp dụng lại tuỳ biến giao diện (CUI)', () => { cuiApply(); log('Đã áp dụng tuỳ biến giao diện.'); });
    // phím tắt, nhấp đúp
    CUIKEYS = new Map(C.keys.filter(k => k.key && k.cmd).map(k => [k.key.toUpperCase(), k.cmd])); CUIDBL = C.dbl || {};
    // thanh truy cập nhanh
    const box = document.querySelector('#acadTop .ac-qat'); if(box){ if(!box._def){ box._def = [...box.querySelectorAll('[data-q]')]; box.addEventListener('click', e => { const b = e.target.closest('[data-uq]'); if(b){ if(A.busy && A.busy()) A.cancel(true); DVDCmd.run(b.dataset.uq); } }); }
      const def = new Map(box._def.map(b => [b.dataset.q, b])); box.innerHTML = '';
      for(const k of (C.qat || QAT0)){ if(def.has(k)){ box.appendChild(def.get(k)); continue; } const c = DVDCmd.commands.find(x => x.k.includes(k)); const b = document.createElement('button'); b.type = 'button'; b.dataset.uq = k; b.title = k + (c ? ' — ' + c.d : '');
        const ic = (c && c.icon) || k; b.innerHTML = (A.ico && A.ICONS && A.ICONS[ic] ? A.ico(ic) : '') || '<span style="font:700 9px system-ui">' + esc(k.slice(0, 4)) + '</span>'; box.appendChild(b); } }
    // tab ribbon riêng
    const R = A.ribbon; if(R && R.RIB && R.WS){ for(const k of Object.keys(R.RIB)) if(k.startsWith('cui_')) delete R.RIB[k]; for(const w of Object.values(R.WS)) if(w && Array.isArray(w.tabs)) w.tabs = w.tabs.filter(t => !String(t).startsWith('cui_'));
      for(const t of C.tabs){ const id = 'cui_' + t.id; R.RIB[id] = { en: t.name, vi: t.name, panels: (t.panels || []).map((p, i) => ({ id: id + '_' + i, en: p.name, vi: p.name, items: (p.items || []).map(it => { const cc = DVDCmd.commands.find(x => x.k[0] === String(it.cmd).toUpperCase()); const o = { t: it.big ? 'big' : 'sm', cmd: it.cmd, en: it.label || it.cmd, vi: it.label || it.cmd, nt: 1 }; if(cc && cc.icon) o.icon = cc.icon; return o; }) })) };
        for(const w of Object.values(R.WS)) if(w && Array.isArray(w.tabs) && t.ws !== false) w.tabs.push(id); }
      try{ R.setWS(R.ws); const rt = localStorage.getItem('dvd:rtab'); if(rt && rt.startsWith('cui_') && R.tab !== rt){ const b = document.querySelector('#acTabs [data-t="' + rt + '"]'); if(b) b.click(); } }catch(_){} }
    try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){} }
  A.cuiApply = cuiApply;
  const comboOf = e => { const k = e.key; if(!k || ['Control', 'Shift', 'Alt', 'Meta'].includes(k)) return ''; const n = k.length === 1 ? k.toUpperCase() : k.toUpperCase(); return (e.ctrlKey || e.metaKey ? 'CTRL+' : '') + (e.altKey ? 'ALT+' : '') + (e.shiftKey ? 'SHIFT+' : '') + n; };
  window.addEventListener('keydown', e => { if(!CUIKEYS.size) return; const k = comboOf(e); if(!k) return; const fk = /^(CTRL\+|ALT\+|SHIFT\+)*F\d{1,2}$/.test(k); if(!(e.ctrlKey || e.metaKey || e.altKey || fk)) return;
    const t = e.target; if(t && t.closest && t.closest('.dvd-dlg')) return; const c = CUIKEYS.get(k); if(!c) return; e.preventDefault(); e.stopPropagation(); if(A.busy && A.busy()) A.cancel(true); setTimeout(() => DVDCmd.run(c), 0); }, true);
  const dblKey = e => e.tbld || String(e.blk || '') === '*TABLE' ? 'TABLE' : (e.dimd || String(e.blk || '').startsWith('*DIM')) ? 'DIMENSION' : e.att ? 'ATTRIB' : e.bm ? 'INSERT' : e.type === 'TEXT' && (e.mt || e.rt) ? 'MTEXT' : e.type;
  { const _od = A.onDblEnt; A.onDblEnt = function(e){ const c = e && CUIDBL[dblKey(e)]; if(c){ try{ selEnts.clear(); for(const x of (e.grp && A.groupMembers ? A.groupMembers(e.grp) : [e])) selEnts.add(x); }catch(_){} if(A.busy && A.busy()) A.cancel(true); setTimeout(() => DVDCmd.run(c), 0); return true; } return _od ? _od.apply(this, arguments) : false; }; }
  const DBLT = [['LINE', 'Đường thẳng'], ['POLYLINE', 'Đa tuyến'], ['CIRCLE', 'Đường tròn'], ['ARC', 'Cung'], ['ELLIPSE', 'Elip'], ['SPLINE', 'Spline'], ['TEXT', 'Chữ một dòng'], ['MTEXT', 'Chữ nhiều dòng'], ['HATCH', 'Hatch'], ['INSERT', 'Khối'], ['ATTRIB', 'Thuộc tính khối'], ['DIMENSION', 'Kích thước'], ['TABLE', 'Bảng'], ['IMAGE', 'Ảnh'], ['POINT', 'Điểm'], ['SOLID3D', 'Khối 3D']];
  const SHORT0 = [['CTRL+N', 'NEW'], ['CTRL+O', 'OPEN'], ['CTRL+S', 'QSAVE'], ['CTRL+SHIFT+S', 'SAVEAS'], ['CTRL+P', 'PLOT'], ['CTRL+Z', 'U'], ['CTRL+Y', 'REDO'], ['CTRL+C', 'COPYCLIP'], ['CTRL+V', 'PASTECLIP'], ['CTRL+X', 'CUTCLIP'], ['CTRL+A', 'Chọn tất cả'], ['CTRL+1', 'PROPERTIES'], ['CTRL+0', 'CLEANSCREENON'], ['F1', 'HELP'], ['F2', 'TEXTSCR'], ['F3', 'OSNAP'], ['F7', 'GRID'], ['F8', 'ORTHO'], ['F9', 'SNAP'], ['F10', 'POLAR'], ['F11', 'OTRACK'], ['F12', 'DYN']];
  function cuiDlg(start){ return new Promise(res => { const C = cuiGet(); let node = start || 'cmds', selCmd = '', selItem = -1, tabSel = C.tabs[0] ? C.tabs[0].id : null;
    const allCmds = () => DVDCmd.commands.map(c => ({ n: c.k[0], d: c.d || '', cui: !!c.cui })).filter(x => x.n && /^[A-Z0-9\-_]/.test(x.n)).sort((a, b) => a.n.localeCompare(b.n));
    const html = '<div class="acw" style="width:900px">' + K.tabs('cui', [['cus', 'Tuỳ biến'], ['tr', 'Chuyển (Transfer)']], 'cus') +
      K.pane('cui', 'cus', 'cus', '<div class="acw-cols"><div class="c1" style="flex:0 0 330px"><div class="acw-lab">Tuỳ biến trong mọi tệp</div><div class="acw-list" id="cuT" style="height:210px"></div>' +
        '<div class="acw-lab" style="margin-top:6px">Danh sách lệnh</div><div class="acw-row">' + K.txt('cuF', '', { ph: 'Tìm lệnh…' }) + K.btn('cuNew', 'Lệnh mới') + '</div><div class="acw-list" id="cuL" style="height:230px"></div></div>' +
        '<div class="c1" style="flex:1 1 auto;min-width:0"><div class="acw-lab" id="cuPT">Thuộc tính</div><div id="cuP" style="height:490px;overflow:auto;border:1px solid #4a5363;padding:8px;box-sizing:border-box"></div></div></div>') +
      K.pane('cui', 'tr', 'cus', K.grp('Tệp tuỳ biến chính', '<div class="acw-row">' + K.btn('cuExp', 'Xuất tệp tuỳ biến…') + K.btn('cuImp', 'Nhập tệp tuỳ biến…') + K.btn('cuRst', 'Đặt lại mặc định') + '</div><div class="acw-note" style="white-space:normal">Tệp .dvdcui (JSON) chứa lệnh tự tạo, thanh truy cập nhanh, tab ribbon riêng, phím tắt và thao tác nhấp đúp — dùng để chép sang máy khác.</div>') +
        K.grp('Tệp tuỳ biến bổ sung (partial)', '<div class="acw-list" id="cuPa" style="height:140px"></div><div class="acw-row">' + K.btn('cuPl', 'Nạp… (CUILOAD)') + K.btn('cuPu', 'Gỡ (CUIUNLOAD)') + '</div>')) + '</div>';
    const d = A.dialog({ title: 'Tuỳ biến giao diện người dùng', cls: 'acw-free', help: 'CUI', html, left: K.btn('cuAp', 'Áp dụng'), ok: () => { save(); res(true); }, cancel: () => res(false) });
    const root = d.root, $ = id => root.querySelector('#' + id); K.bindTabs(root);
    root.addEventListener('keydown', e => { if(!e.target.closest('#cuKeyCap')) e.stopPropagation(); }, true);
    const save = () => { lsSet(CUIK, C); cuiApply(); };
    $('cuAp').onclick = () => { save(); say('Đã áp dụng tuỳ biến.'); };
    const NODES = () => [['ws', '🗂 Không gian làm việc'], ['qat', '⚡ Thanh truy cập nhanh'], ['rib', '▤ Ribbon — tab riêng (' + C.tabs.length + ')'], ['keys', '⌨ Phím tắt (' + C.keys.length + ')'], ['dbl', '🖱 Thao tác nhấp đúp (' + Object.keys(C.dbl).length + ')'], ['cmds', '★ Lệnh tự tạo (' + C.cmds.length + ')'], ['alias', '⌁ Lệnh tắt (acad.pgp)'], ['part', '📎 Tệp tuỳ biến bổ sung (' + C.partial.length + ')']];
    function renderT(){ $('cuT').innerHTML = NODES().map(([k, t]) => '<div class="it' + (k === node ? ' on' : '') + '" data-v="' + k + '">' + esc(t) + '</div>').join(''); }
    function renderL(){ const q = $('cuF').value.trim().toUpperCase(); const L = allCmds().filter(c => !q || c.n.includes(q) || c.d.toUpperCase().includes(q)).slice(0, 600);
      $('cuL').innerHTML = L.map(c => '<div class="it' + (c.n === selCmd ? ' on' : '') + '" data-v="' + esc(c.n) + '" title="' + esc(c.d) + '"><b>' + (c.cui ? '★ ' : '') + esc(c.n) + '</b> <span style="opacity:.65">' + esc(c.d.slice(0, 60)) + '</span></div>').join(''); }
    const lst = (id, items, cur) => '<div class="acw-list" id="' + id + '" style="height:200px">' + items.map((t, i) => '<div class="it' + (i === cur ? ' on' : '') + '" data-v="' + i + '">' + t + '</div>').join('') + '</div>';
    const needCmd = () => { if(!selCmd){ say('Chọn một lệnh trong Danh sách lệnh trước.'); return false; } return true; };
    function renderP(){ const P = $('cuP'); const T = { ws: 'Không gian làm việc', qat: 'Thanh truy cập nhanh', rib: 'Tab ribbon riêng', keys: 'Phím tắt', dbl: 'Thao tác nhấp đúp', cmds: 'Lệnh tự tạo', alias: 'Lệnh tắt', part: 'Tệp tuỳ biến bổ sung' }; $('cuPT').textContent = 'Thuộc tính — ' + T[node];
      if(node === 'ws'){ const R = A.ribbon; P.innerHTML = (R ? Object.keys(R.WS).map(k => '<div class="acw-row"><b style="min-width:220px">' + esc(R.WS[k].vi || R.WS[k].en || k) + '</b>' + (R.ws === k ? '<span class="acw-note" style="margin:0">(hiện hành)</span>' : K.btn('cuWs_' + k, 'Đặt hiện hành')) + '</div>').join('') : '') + '<div class="acw-note" style="white-space:normal;margin-top:8px">Tab ribbon riêng được thêm vào mọi không gian làm việc (bỏ chọn "Hiện trong mọi không gian làm việc" để ẩn).</div>';
        P.querySelectorAll('[id^="cuWs_"]').forEach(b => b.onclick = () => { A.ribbon.setWS(b.id.slice(5)); renderP(); }); return; }
      if(node === 'qat'){ const Q = C.qat || QAT0.slice(); P.innerHTML = lst('cuQ', Q.map(k => '<b>' + esc(k) + '</b>'), selItem) + '<div class="acw-row" style="margin-top:6px">' + K.btn('cuQa', '+ Thêm lệnh đã chọn') + K.btn('cuQu', '↑ Lên') + K.btn('cuQd', '↓ Xuống') + K.btn('cuQr', '− Bỏ') + K.btn('cuQ0', 'Đặt lại mặc định') + '</div>';
        K.bindList($('cuQ'), v => { selItem = +v; });
        $('cuQa').onclick = () => { if(!needCmd()) return; const L = C.qat || QAT0.slice(); if(!L.includes(selCmd)) L.push(selCmd); C.qat = L; selItem = L.length - 1; renderP(); };
        const mv = k => { const L = C.qat || QAT0.slice(), j = selItem + k; if(selItem < 0 || j < 0 || j >= L.length) return; [L[selItem], L[j]] = [L[j], L[selItem]]; C.qat = L; selItem = j; renderP(); };
        $('cuQu').onclick = () => mv(-1); $('cuQd').onclick = () => mv(1); $('cuQr').onclick = () => { const L = C.qat || QAT0.slice(); if(selItem < 0) return; L.splice(selItem, 1); C.qat = L; selItem = Math.min(selItem, L.length - 1); renderP(); }; $('cuQ0').onclick = () => { C.qat = null; selItem = -1; renderP(); }; return; }
      if(node === 'rib'){ const t = C.tabs.find(x => x.id === tabSel) || null;
        P.innerHTML = '<div class="acw-row">' + K.sel('cuTb', C.tabs.map(x => [x.id, x.name]), tabSel || '') + K.btn('cuTn', 'Tab mới') + K.btn('cuTd', 'Xoá tab', { dis: !t }) + '</div>' + (t ? K.row('Tên tab:', K.txt('cuTname', t.name)) + K.row('Tên bảng (panel):', K.txt('cuPname', (t.panels[0] || {}).name || 'Lệnh của tôi')) + K.chk('cuTws', 'Hiện trong mọi không gian làm việc', t.ws !== false) +
          '<div class="acw-lab" style="margin-top:6px">Nút trong bảng</div>' + lst('cuTi', ((t.panels[0] || {}).items || []).map(it => (it.big ? '⬛ ' : '▫ ') + '<b>' + esc(it.cmd) + '</b>' + (it.label ? ' — ' + esc(it.label) : '')), selItem) +
          '<div class="acw-row" style="margin-top:6px">' + K.btn('cuTa', '+ Thêm lệnh đã chọn') + K.btn('cuTu', '↑') + K.btn('cuTdn', '↓') + K.btn('cuTr', '− Bỏ') + K.btn('cuTsz', 'Nút lớn / nhỏ') + '</div>' + K.row('Nhãn nút:', K.txt('cuTlab', '', { ph: 'để trống = tên lệnh' })) : '<div class="acw-note">Chưa có tab riêng — bấm "Tab mới".</div>');
        $('cuTb').onchange = () => { tabSel = $('cuTb').value; selItem = -1; renderP(); };
        $('cuTn').onclick = () => { const id = 't' + Date.now().toString(36); C.tabs.push({ id, name: 'Tab của tôi', panels: [{ name: 'Lệnh của tôi', items: [] }] }); tabSel = id; selItem = -1; renderT(); renderP(); };
        $('cuTd').onclick = () => { C.tabs = C.tabs.filter(x => x.id !== tabSel); tabSel = C.tabs[0] ? C.tabs[0].id : null; renderT(); renderP(); };
        if(!t) return; const items = () => (t.panels[0] || (t.panels[0] = { name: 'Lệnh của tôi', items: [] })).items;
        $('cuTname').onchange = () => { t.name = $('cuTname').value.trim() || 'Tab của tôi'; renderP(); }; $('cuPname').onchange = () => { (t.panels[0] || (t.panels[0] = { items: [] })).name = $('cuPname').value.trim() || 'Lệnh của tôi'; };
        $('cuTws').onchange = () => { t.ws = $('cuTws').checked ? undefined : false; };
        K.bindList($('cuTi'), v => { selItem = +v; const it = items()[selItem]; $('cuTlab').value = it && it.label || ''; });
        $('cuTlab').onchange = () => { const it = items()[selItem]; if(it){ it.label = $('cuTlab').value.trim() || undefined; renderP(); } };
        $('cuTa').onclick = () => { if(!needCmd()) return; items().push({ cmd: selCmd, big: items().length < 1 ? 1 : 0 }); selItem = items().length - 1; renderP(); };
        const mv = k => { const L = items(), j = selItem + k; if(selItem < 0 || j < 0 || j >= L.length) return; [L[selItem], L[j]] = [L[j], L[selItem]]; selItem = j; renderP(); };
        $('cuTu').onclick = () => mv(-1); $('cuTdn').onclick = () => mv(1); $('cuTr').onclick = () => { if(selItem < 0) return; items().splice(selItem, 1); selItem = -1; renderP(); };
        $('cuTsz').onclick = () => { const it = items()[selItem]; if(it){ it.big = it.big ? 0 : 1; renderP(); } }; return; }
      if(node === 'keys'){ P.innerHTML = '<div class="lm-grid" style="height:200px"><table class="acw-cmp"><thead><tr><th>Phím</th><th>Lệnh</th><th></th></tr></thead><tbody>' + C.keys.map((k, i) => '<tr><td><b>' + esc(k.key) + '</b></td><td>' + esc(k.cmd) + '</td><td><button type="button" class="acw-btn" data-kd="' + i + '">Bỏ</button></td></tr>').join('') + '</tbody></table></div>' +
          '<div class="acw-row" style="margin-top:6px">' + K.btn('cuKa', '+ Gán phím cho lệnh đã chọn') + '<input id="cuKeyCap" placeholder="bấm tổ hợp phím…" readonly style="width:170px"></div>' +
          '<div class="acw-lab" style="margin-top:8px">Phím tắt có sẵn</div><div class="lm-grid" style="height:170px"><table class="acw-cmp"><tbody>' + SHORT0.map(([k, c]) => '<tr><td>' + k + '</td><td>' + esc(c) + '</td></tr>').join('') + '</tbody></table></div>';
        P.querySelectorAll('[data-kd]').forEach(b => b.onclick = () => { C.keys.splice(+b.dataset.kd, 1); renderT(); renderP(); });
        const cap = $('cuKeyCap'); let combo = ''; cap.addEventListener('keydown', e => { e.preventDefault(); e.stopPropagation(); const k = comboOf(e); if(k){ combo = k; cap.value = k; } });
        $('cuKa').onclick = () => { if(!needCmd()) return; if(!combo){ cap.focus(); say('Bấm vào ô bên phải rồi nhấn tổ hợp phím (có Ctrl / Alt hoặc F1–F12).'); return; }
          if(!/^(CTRL\+|ALT\+)|(^|\+)F\d{1,2}$/.test(combo)){ say('Phím tắt cần có Ctrl hoặc Alt, hoặc là F1–F12.'); return; } C.keys = C.keys.filter(k => k.key !== combo); C.keys.push({ key: combo, cmd: selCmd }); renderT(); renderP(); }; return; }
      if(node === 'dbl'){ const ids = allCmds().map(c => c.n); P.innerHTML = '<datalist id="cuDl">' + ids.slice(0, 1500).map(n => '<option value="' + esc(n) + '">').join('') + '</datalist><div class="lm-grid" style="height:440px"><table class="acw-cmp"><thead><tr><th>Loại đối tượng</th><th>Lệnh khi nhấp đúp (trống = mặc định)</th></tr></thead><tbody>' +
          DBLT.map(([k, t]) => '<tr><td>' + esc(t) + ' <span style="opacity:.6">(' + k + ')</span></td><td><input list="cuDl" data-db="' + k + '" value="' + esc(C.dbl[k] || '') + '" style="width:200px" placeholder="mặc định"></td></tr>').join('') + '</tbody></table></div>';
        P.querySelectorAll('[data-db]').forEach(x => x.onchange = () => { const v = x.value.trim().toUpperCase(); if(v) C.dbl[x.dataset.db] = v; else delete C.dbl[x.dataset.db]; renderT(); }); return; }
      if(node === 'cmds'){ const c = C.cmds[selItem];
        P.innerHTML = lst('cuCl', C.cmds.map(x => '★ <b>' + esc(x.name) + '</b> <span style="opacity:.65">' + esc(x.macro) + '</span>'), selItem) + (c ? K.grp('Lệnh', K.row('Tên lệnh:', K.txt('cuCn', c.name)) + K.row('Mô tả:', K.txt('cuCd', c.desc || '')) + K.vrow('Macro:', '<textarea id="cuCm" rows="3" style="width:100%;box-sizing:border-box;font:12px ui-monospace,Consolas,monospace">' + esc(c.macro) + '</textarea>') +
          K.row('Biểu tượng:', '<input id="cuCi" list="cuIl" value="' + esc(c.icon || '') + '" style="width:160px"><datalist id="cuIl">' + Object.keys(A.ICONS || {}).slice(0, 2000).map(n => '<option value="' + esc(n) + '">').join('') + '</datalist> <span id="cuCiv"></span>') +
          '<div class="acw-note" style="white-space:normal">^C huỷ lệnh đang chạy · ; hoặc dấu cách = Enter · \\ = chờ người dùng nhập · _ tên quốc tế · \' lệnh trong suốt. Ví dụ: ^C^C_RECTANG;0,0;\\</div><div class="acw-row">' + K.btn('cuCt', 'Chạy thử') + K.btn('cuCx', 'Xoá lệnh') + '</div>') : '<div class="acw-note">Bấm "Lệnh mới" để tạo lệnh từ macro, rồi đưa vào thanh truy cập nhanh / tab ribbon / phím tắt.</div>');
        K.bindList($('cuCl'), v => { selItem = +v; renderP(); }); if(!c) return;
        const iv = () => { const s = $('cuCiv'); if(s) s.innerHTML = A.ICONS && A.ICONS[$('cuCi').value] ? A.ico($('cuCi').value) : ''; }; iv();
        $('cuCn').onchange = () => { const n = $('cuCn').value.trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, ''); if(!n){ $('cuCn').value = c.name; return; } if(n !== c.name && DVDCmd.commands.some(x => x.k.includes(n) && !x.cui)){ say('Tên trùng lệnh có sẵn.'); $('cuCn').value = c.name; return; } c.name = n; renderP(); renderL(); };
        $('cuCd').onchange = () => { c.desc = $('cuCd').value; }; $('cuCm').onchange = () => { c.macro = $('cuCm').value.trim(); }; $('cuCi').oninput = () => { c.icon = $('cuCi').value.trim() || undefined; iv(); };
        $('cuCt').onclick = () => { c.macro = $('cuCm').value.trim(); d.root.style.display = 'none'; runMacro(c.macro).finally(() => setTimeout(() => { if(!(A.busy && A.busy())) d.root.style.display = ''; else { const t = setInterval(() => { if(!(A.busy && A.busy())){ clearInterval(t); d.root.style.display = ''; } }, 200); } }, 50)); };
        $('cuCx').onclick = () => { C.cmds.splice(selItem, 1); selItem = -1; renderT(); renderP(); }; return; }
      if(node === 'alias'){ P.innerHTML = '<div class="acw-note" style="white-space:normal">Lệnh tắt (acad.pgp) sửa trong trình sửa lệnh tắt.</div>' + K.btn('cuAl', 'Mở trình sửa lệnh tắt (ALIASEDIT)…'); $('cuAl').onclick = () => DVDCmd.run('ALIASEDIT'); return; }
      if(node === 'part'){ P.innerHTML = '<div class="acw-note" style="white-space:normal">Tệp tuỳ biến bổ sung được ghép thêm vào tuỳ biến chính (lệnh, phím tắt, nhấp đúp, tab ribbon). Quản lý ở tab "Chuyển (Transfer)".</div>' + C.partial.map(p => '<div>📎 ' + esc(p.name) + '</div>').join(''); return; } }
    function renderPa(){ $('cuPa').innerHTML = C.partial.map((p, i) => '<div class="it" data-v="' + i + '">📎 ' + esc(p.name) + ' <span style="opacity:.6">(' + cuiNorm(p.data).cmds.length + ' lệnh)</span></div>').join('') || '<div class="acw-note" style="padding:6px">(chưa nạp tệp bổ sung)</div>'; }
    K.bindList($('cuT'), v => { node = v; selItem = -1; renderT(); renderP(); });
    K.bindList($('cuL'), v => { selCmd = v; });
    $('cuF').addEventListener('input', renderL);
    $('cuNew').onclick = () => { let i = 1; while(C.cmds.some(c => c.name === 'LENH' + i) || DVDCmd.commands.some(c => c.k.includes('LENH' + i) && !c.cui)) i++; C.cmds.push({ name: 'LENH' + i, desc: 'Lệnh tự tạo', macro: '^C^C' }); node = 'cmds'; selItem = C.cmds.length - 1; renderT(); renderP(); };
    $('cuExp').onclick = () => { const o = { dvdcui: 1, cmds: C.cmds, qat: C.qat, keys: C.keys, dbl: C.dbl, tabs: C.tabs }; shareOrDownload(new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' }), 'dvdcad.dvdcui', 'application/json'); };
    const readCui = async () => { const F = await pickF('.dvdcui,.json'); const f = F && F[0]; if(!f) return null; let o = null; try{ o = JSON.parse(await f.text()); }catch(_){} if(!o || !o.dvdcui){ say('Tệp tuỳ biến không hợp lệ (cần tệp .dvdcui do DVDCAD xuất).'); return null; } return { name: f.name, o }; };
    $('cuImp').onclick = async () => { const r = await readCui(); if(!r) return; const o = cuiNorm(r.o); for(const c of o.cmds) if(!C.cmds.some(x => x.name === c.name)) C.cmds.push(c); for(const k of o.keys){ C.keys = C.keys.filter(x => x.key !== k.key); C.keys.push(k); } Object.assign(C.dbl, o.dbl); if(o.qat) C.qat = o.qat; for(const t of o.tabs) if(!C.tabs.some(x => x.id === t.id)) C.tabs.push(t); renderT(); renderP(); log('Đã nhập tuỳ biến từ ' + r.name); };
    $('cuRst').onclick = () => { if(!confirm('Xoá mọi tuỳ biến (lệnh tự tạo, phím tắt, thanh truy cập nhanh, tab riêng, nhấp đúp)?')) return; const keep = C.partial; Object.assign(C, cuiNorm({}), { partial: keep }); selItem = -1; renderT(); renderP(); };
    $('cuPl').onclick = async () => { const r = await readCui(); if(!r) return; C.partial = C.partial.filter(p => p.name !== r.name); C.partial.push({ name: r.name, data: r.o }); renderPa(); renderT(); };
    $('cuPu').onclick = () => { const it = $('cuPa').querySelector('.it.on'); if(!it) { say('Chọn tệp bổ sung cần gỡ.'); return; } C.partial.splice(+it.dataset.v, 1); renderPa(); renderT(); };
    K.bindList($('cuPa'), () => {});
    renderT(); renderL(); renderP(); renderPa(); }); }
  plain(['CUI', 'CUSTOMIZE', 'TOOLBAR', 'MENU'], 'Tuỳ biến giao diện (Customize User Interface): lệnh tự tạo bằng macro, thanh truy cập nhanh, tab ribbon riêng, phím tắt, thao tác nhấp đúp, tệp tuỳ biến bổ sung', () => { if(A.busy && A.busy()) A.cancel(true); cuiDlg(); });
  plain(['QUICKCUI'], 'Tuỳ biến nhanh thanh truy cập nhanh (Quick Access Toolbar) trong hộp CUI', () => { if(A.busy && A.busy()) A.cancel(true); cuiDlg('qat'); });
  plain(['CUIEXPORT'], 'Xuất tuỳ biến giao diện ra tệp .dvdcui', () => { const C = cuiGet(); shareOrDownload(new Blob([JSON.stringify({ dvdcui: 1, cmds: C.cmds, qat: C.qat, keys: C.keys, dbl: C.dbl, tabs: C.tabs, menus: C.menus }, null, 1)], { type: 'application/json' }), 'dvdcad.dvdcui', 'application/json'); log('CUIEXPORT: đã xuất ' + C.cmds.length + ' lệnh tự tạo, ' + C.keys.length + ' phím tắt, ' + C.tabs.length + ' tab riêng.'); });
  /* ---------- DIESEL (như AutoCAD): $(hàm,đối,…) — dùng trong MODEMACRO (thanh trạng thái) và macro $M= ---------- */
  const DIESEL = (() => {
    const N = s => { const v = parseFloat(String(s == null ? '' : s).trim()); return isFinite(v) ? v : 0; };
    const F = v => { if(!isFinite(v)) return '0'; const r = Math.round(v * 1e8) / 1e8; return String(Object.is(r, -0) ? 0 : r); };
    const julian = d => d.getTime() / 86400000 + 2440587.5 - d.getTimezoneOffset() / 1440;
    const fromJulian = j => { const t = (j - 2440587.5) * 86400000; const d = new Date(t); return new Date(t + d.getTimezoneOffset() * 60000); };
    const sv = n => { const u = String(n || '').trim().toUpperCase(); if(u === 'DATE') return F(julian(new Date()));
      if(u === 'CDATE'){ const d = new Date(), p = (v, k) => String(v).padStart(k, '0'); return d.getFullYear() + p(d.getMonth() + 1, 2) + p(d.getDate(), 2) + '.' + p(d.getHours(), 2) + p(d.getMinutes(), 2) + p(d.getSeconds(), 2) + p(d.getMilliseconds(), 3); }
      if(u === 'DWGNAME'){ return docNm(); } if(u === 'TILEMODE'){ try{ return isModelView() ? '1' : '0'; }catch(_){ return '1'; } }
      let v; try{ v = A.sysvar && A.sysvar.get(u); }catch(_){} return v == null ? '' : typeof v === 'number' ? F(v) : String(v); };
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DAYF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    function edtime(t, pic){ const d = +t ? fromJulian(+t) : new Date(); const p2 = v => String(v).padStart(2, '0');
      const ampm = /AM\/PM|am\/pm|A\/P|a\/p/.test(pic), hr = ampm ? ((d.getHours() + 11) % 12) + 1 : d.getHours();
      const T = [['DDDD', () => DAYF[d.getDay()]], ['DDD', () => DAY[d.getDay()]], ['DD', () => p2(d.getDate())], ['D', () => String(d.getDate())], ['MONTH', () => MONTH[d.getMonth()]], ['MON', () => MON[d.getMonth()]], ['MO', () => p2(d.getMonth() + 1)],
        ['MSEC', () => String(d.getMilliseconds()).padStart(3, '0')], ['MM', () => p2(d.getMinutes())], ['M', () => String(d.getMonth() + 1)], ['YYYY', () => String(d.getFullYear())], ['YY', () => p2(d.getFullYear() % 100)], ['HH', () => p2(hr)], ['H', () => String(hr)], ['SS', () => p2(d.getSeconds())],
        ['AM/PM', () => d.getHours() < 12 ? 'AM' : 'PM'], ['am/pm', () => d.getHours() < 12 ? 'am' : 'pm'], ['A/P', () => d.getHours() < 12 ? 'A' : 'P'], ['a/p', () => d.getHours() < 12 ? 'a' : 'p']];
      let out = '', i = 0; const s = String(pic); while(i < s.length){ const m = T.find(([k]) => s.startsWith(k, i)); if(m){ out += m[1](); i += m[0].length; } else { out += s[i]; i++; } } return out; }
    function rtos(v, mode, prec){ v = N(v); mode = mode === '' || mode == null ? 2 : N(mode) | 0; prec = prec === '' || prec == null ? 4 : Math.max(0, Math.min(8, N(prec) | 0));
      if(mode === 1){ const s = v.toExponential(prec).toUpperCase(); return s.replace(/E([+-])(\d)$/, 'E$1' + '0$2'); }
      if(mode === 3 || mode === 4){ const neg = v < 0, a = Math.abs(v), ft = Math.floor(a / 12), inch = a - ft * 12; const ii = mode === 3 ? inch.toFixed(prec) : (() => { const den = 2 ** prec, n = Math.round(inch * den); const w = Math.floor(n / den), f = n % den; if(!f) return String(w); let g = f, h = den; while(g % 2 === 0){ g /= 2; h /= 2; } return (w ? w + '-' : '') + g + '/' + h; })(); return (neg ? '-' : '') + (ft ? ft + "'-" : '') + ii + '"'; }
      if(mode === 5){ const den = 2 ** prec, n = Math.round(Math.abs(v) * den), w = Math.floor(n / den), f = n % den; let g = f, h = den; while(g && g % 2 === 0){ g /= 2; h /= 2; } return (v < 0 ? '-' : '') + (f ? (w ? w + ' ' : '') + g + '/' + h : String(w)); }
      return v.toFixed(prec); }
    function angtos(v, mode, prec){ v = N(v); mode = mode === '' || mode == null ? 0 : N(mode) | 0; prec = prec === '' || prec == null ? 0 : Math.max(0, Math.min(8, N(prec) | 0)); const deg = ((v * 180 / Math.PI) % 360 + 360) % 360;
      if(mode === 1){ const D = Math.floor(deg), mf = (deg - D) * 60, Mi = Math.floor(mf), S = (mf - Mi) * 60; return D + 'd' + Mi + "'" + S.toFixed(Math.max(0, prec - 4)) + '"'; }
      if(mode === 2) return (deg / 0.9).toFixed(prec) + 'g'; if(mode === 3) return (deg * Math.PI / 180).toFixed(prec) + 'r';
      if(mode === 4){ const b = (90 - deg + 360) % 360; const ns = b <= 90 || b >= 270 ? 'N' : 'S', ew = b < 180 ? 'E' : 'W'; const a = ns === 'N' ? (b <= 90 ? b : 360 - b) : Math.abs(180 - b); return a < 1e-9 ? ns : Math.abs(a - 90) < 1e-9 ? ew : ns + ' ' + a.toFixed(prec) + 'd ' + ew; }
      return deg.toFixed(prec); }
    const ERR = f => '$(' + f + ',??)';
    const FN = {
      '+': a => F(a.reduce((s, x) => s + N(x), 0)), '-': a => F(a.slice(1).reduce((s, x) => s - N(x), N(a[0]))), '*': a => F(a.reduce((s, x) => s * N(x), 1)),
      '/': a => { let s = N(a[0]); for(const x of a.slice(1)){ if(N(x) === 0) return null; s /= N(x); } return F(s); },
      '=': a => N(a[0]) === N(a[1]) ? '1' : '0', '<': a => N(a[0]) < N(a[1]) ? '1' : '0', '>': a => N(a[0]) > N(a[1]) ? '1' : '0', '!=': a => N(a[0]) !== N(a[1]) ? '1' : '0', '<=': a => N(a[0]) <= N(a[1]) ? '1' : '0', '>=': a => N(a[0]) >= N(a[1]) ? '1' : '0',
      and: a => String(a.reduce((s, x) => s & (N(x) | 0), -1)), or: a => String(a.reduce((s, x) => s | (N(x) | 0), 0)), xor: a => String(a.reduce((s, x) => s ^ (N(x) | 0), 0)),
      eq: a => String(a[0]) === String(a[1]) ? '1' : '0', if: a => a.length < 2 ? null : (N(a[0]) !== 0 ? a[1] : (a[2] == null ? '' : a[2])),
      index: a => { const L = String(a[1] == null ? '' : a[1]).split(','), i = N(a[0]) | 0; return i >= 0 && i < L.length ? L[i] : ''; }, nth: a => { const i = N(a[0]) | 0; return i >= 0 && i + 1 < a.length ? a[i + 1] : ''; },
      strlen: a => String(String(a[0] == null ? '' : a[0]).length), upper: a => String(a[0] == null ? '' : a[0]).toUpperCase(), fix: a => String(Math.trunc(N(a[0]))),
      substr: a => { const s = String(a[0] == null ? '' : a[0]), st = Math.max(1, N(a[1]) | 0) - 1; return a[2] == null || a[2] === '' ? s.slice(st) : s.substr(st, Math.max(0, N(a[2]) | 0)); },
      rtos: a => rtos(a[0], a[1], a[2]), angtos: a => angtos(a[0], a[1], a[2]), edtime: a => edtime(a[0], a[1] == null ? '' : a[1]),
      getvar: a => sv(a[0]), getenv: a => { try{ return localStorage.getItem('dvd:env:' + String(a[0] || '').trim().toUpperCase()) || ''; }catch(_){ return ''; } },
      linelen: () => '80', eval: (a, d) => run(String(a[0] == null ? '' : a[0]), d + 1) };
    function call(s, i, d){   // s[i] ngay sau "$(": tách đối số (giữ nguyên $(...) lồng nhau và "…"), tính đối số rồi gọi hàm
      const raw = []; let cur = '', lvl = 0, q = false;
      for(; i < s.length; i++){ const c = s[i];
        if(q){ cur += c; if(c === '"') q = false; continue; }
        if(c === '"'){ q = true; cur += c; continue; }
        if(c === '$' && s[i + 1] === '('){ lvl++; cur += '$('; i++; continue; }
        if(c === ')'){ if(lvl){ lvl--; cur += c; continue; } raw.push(cur); return { end: i + 1, v: apply(raw, d) }; }
        if(c === ',' && !lvl){ raw.push(cur); cur = ''; continue; }
        cur += c; }
      return { end: s.length, v: '$?' }; }
    function apply(raw, d){ const fn = String(raw[0] || '').trim().toLowerCase(); const f = FN[fn]; if(!f) return ERR(fn);
      const args = raw.slice(1).map(x => { const t = x.trim(); if(t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') return t.slice(1, -1).replace(/""/g, '"'); return run(x, d + 1); });
      let r; try{ r = f(args, d); }catch(_){ r = null; } return r == null ? ERR(fn) : String(r); }
    function run(s, d){ s = String(s == null ? '' : s); d = d || 0; if(d > 40) return '$?'; let out = '', i = 0;
      while(i < s.length){ if(s[i] === '$' && s[i + 1] === '('){ const r = call(s, i + 2, d); out += r.v; i = r.end; } else { out += s[i]; i++; } } return out; }
    return s => run(s, 0);
  })();
  A.diesel = DIESEL;
  ecmd(['DIESEL'], 'Thử biểu thức DIESEL (như trong MODEMACRO / macro $M=)', async () => { const r = await A.getStr('Biểu thức DIESEL', { def: '$(getvar,clayer)' }); if(r.str == null || r.str === '') return; log(DIESEL(r.str)); });
  // MODEMACRO: chuỗi DIESEL hiện trên thanh trạng thái (không lưu theo bản vẽ, như AutoCAD)
  let MODEMACRO = '', mmEl = null;
  const mmPaint = () => { try{ if(!mmEl || !document.body.contains(mmEl)){ const c = document.getElementById('acCoord'); if(!c || !c.parentNode) return; mmEl = document.createElement('span'); mmEl.id = 'acMM'; mmEl.className = 'ac-mm notranslate'; mmEl.setAttribute('translate', 'no'); mmEl.style.cssText = 'font:600 11px system-ui,sans-serif;color:#dfe5ee;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px'; c.parentNode.insertBefore(mmEl, c); }
      const t = MODEMACRO ? DIESEL(MODEMACRO) : ''; if(mmEl.textContent !== t) mmEl.textContent = t; mmEl.style.display = t ? '' : 'none'; mmEl.title = MODEMACRO; }catch(_){} };
  A.modemacroPaint = mmPaint;
  if(A.sysvar && A.sysvar.def) A.sysvar.def('MODEMACRO', { d: 'Chuỗi hiện trên thanh trạng thái, tính bằng DIESEL — ví dụ $(getvar,clayer)', s: 1, get: () => MODEMACRO, set: v => { MODEMACRO = String(v == null ? '' : v) === '.' ? '' : String(v == null ? '' : v); mmPaint(); } });
  setInterval(() => { if(MODEMACRO) mmPaint(); }, 1000);
  { const _ol = A.onLoad; A.onLoad = function(){ if(_ol) _ol.apply(this, arguments); if(MODEMACRO) mmPaint(); }; }

  /* ---------- Nhập tệp CUI của AutoCAD (.cuix = gói zip, .cui = XML): lệnh (macro), thanh công cụ → tab ribbon, phím tắt, nhấp đúp ---------- */
  async function unzip(buf){ const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let e = -1;
    for(let i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) if(dv.getUint32(i, true) === 0x06054b50){ e = i; break; } if(e < 0) throw new Error('Không phải tệp zip');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = new Map(), td = new TextDecoder();
    for(let k = 0; k < n; k++){ if(dv.getUint32(p, true) !== 0x02014b50) break; const meth = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = td.decode(u.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); const raw = u.subarray(ds, ds + csz);
      out.set(name, { meth, raw }); }
    const get = async name => { let x = out.get(name); if(!x){ const k = [...out.keys()].find(q => q.toLowerCase() === String(name).toLowerCase()); x = k ? out.get(k) : null; } if(!x) return null;
      if(x.meth === 0) return x.raw; if(x.meth !== 8 || typeof DecompressionStream === 'undefined') throw new Error('Không giải nén được ' + name);
      const st = new Blob([x.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return new Uint8Array(await new Response(st).arrayBuffer()); };
    return { names: [...out.keys()], get }; }
  const DXFDBL = { LINE: 'LINE', LWPOLYLINE: 'POLYLINE', POLYLINE: 'POLYLINE', '2DPOLYLINE': 'POLYLINE', CIRCLE: 'CIRCLE', ARC: 'ARC', ELLIPSE: 'ELLIPSE', SPLINE: 'SPLINE', TEXT: 'TEXT', MTEXT: 'MTEXT', HATCH: 'HATCH', INSERT: 'INSERT', ATTBLOCKREF: 'ATTRIB', ATTDYNBLOCKREF: 'ATTRIB', DYNBLOCKREF: 'INSERT', ATTRIB: 'ATTRIB', ATTDEF: 'ATTRIB', DIMENSION: 'DIMENSION', ACAD_TABLE: 'TABLE', IMAGE: 'IMAGE', POINT: 'POINT', '3DSOLID': 'SOLID3D' };
  // XML MenuGroup (.cui) → tuỳ biến DVDCAD: macro chỉ gọi một lệnh có sẵn → dùng thẳng lệnh đó; macro khác → lệnh tự tạo
  function cuiFromXml(xml, fname, more){
    const doc = new DOMParser().parseFromString(xml, 'application/xml'); if(doc.getElementsByTagName('parsererror').length) throw new Error('XML lỗi');
    const docs = [doc].concat(((more && more.xml) || []).map(x => { try{ const d = new DOMParser().parseFromString(x, 'application/xml'); return d.getElementsByTagName('parsererror').length ? null : d; }catch(_){ return null; } }).filter(Boolean));
    const allTag = tag => docs.flatMap(d => [...d.getElementsByTagName(tag)]);
    const kid = (el, tag) => { if(!el) return null; for(const c of el.children) if(c.tagName === tag) return c; return null; };
    const txt = (el, tag) => { const c = kid(el, tag); return c ? String(c.textContent || '').trim() : ''; };
    const has = n => DVDCmd.commands.some(c => c.k.includes(n) && !c.cui);
    const out = { dvdcui: 1, cmds: [], keys: [], dbl: {}, tabs: [], qat: null }; const byId = new Map(); const used = new Set();
    const grp = (doc.getElementsByTagName('MenuGroup')[0] || null); const gname = grp ? (grp.getAttribute('Name') || '') : '';
    for(const mm of doc.getElementsByTagName('MenuMacro')){ const uid = mm.getAttribute('UID') || ''; const M = kid(mm, 'Macro'); if(!M) continue;
      const name = txt(M, 'Name') || uid, macro = txt(M, 'Command'), help = txt(M, 'HelpString'); if(!macro) continue;
      const body = macro.replace(/^\*/, '').replace(/^(\^C)+/i, '').trim(), one = body.replace(/^[_.'"]+/g, '').replace(/[;\s]+$/, '');
      const u1 = one.toUpperCase(); let cmd; if(/^[A-Z0-9\-]+$/.test(u1) && has(u1.replace(/^-/, ''))) cmd = has(u1) ? u1 : u1.replace(/^-/, '');
      else { let n = String(name).replace(/[đĐ]/g, 'D').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'MACRO'; if(has(n)) n = 'CUI_' + n; let m = n, k = 2; while(used.has(m)) m = n + '_' + (k++); used.add(m); cmd = m;
        const im = kid(M, 'SmallImage') || kid(M, 'LargeImage'); const c = { name: m, desc: (help || name) + (gname ? ' (' + gname + ')' : ''), macro }; if(im && im.getAttribute('Name')) c._img = im.getAttribute('Name'); out.cmds.push(c); }
      byId.set(uid, cmd); }
    const refOf = el => { const r = el && (el.getElementsByTagName('MacroRef')[0]); return r ? byId.get(r.getAttribute('MenuMacroID')) || null : null; };
    for(const a of doc.getElementsByTagName('Accelerator')){ const key = (txt(a, 'AcceleratorShortcutKey') || a.getAttribute('ShortcutKey') || '').toUpperCase().replace(/\s+/g, ''); const c = refOf(a); if(key && c) out.keys.push({ key, cmd: c }); }
    for(const a of doc.getElementsByTagName('DoubleClickAction')){ const dx = txt(a, 'DxfName').toUpperCase(), k = DXFDBL[dx]; const c = refOf(kid(a, 'DoubleClickCmd') || a); if(k && c) out.dbl[k] = c; }
    const tbs = [...doc.getElementsByTagName('Toolbar')]; if(tbs.length){ const panels = [];
      for(const t of tbs){ const items = []; for(const b of t.getElementsByTagName('ToolbarButton')){ const c = refOf(b); if(c) items.push({ cmd: c, label: txt(b, 'Name') || c }); } if(items.length) panels.push({ name: txt(t, 'Name') || 'Toolbar', items: items.slice(0, 40) }); }
      if(panels.length) out.tabs.push({ id: 'x' + Date.now().toString(36), name: (gname || String(fname || 'CUIX').replace(/\.[^.]+$/, '')), panels: panels.slice(0, 30) }); }
    // ribbon (RibbonRoot.cui trong gói .cuix, hoặc trong chính tệp .cui): tab → bảng → nút lệnh
    { const at = (el, a) => el.getAttribute(a) || ''; const pan = new Map();
      for(const P of allTag('RibbonPanelSource')){ const items = []; for(const b of P.getElementsByTagName('RibbonCommandButton')){ const c = byId.get(at(b, 'MenuMacroID')) || refOf(b); if(!c) continue; items.push({ cmd: c, label: (at(b, 'Text') || txt(b, 'Name') || c).replace(/&/g, ''), big: /^Large/i.test(at(b, 'ButtonStyle')) }); }
        if(items.length) pan.set(at(P, 'UID'), { name: (at(P, 'Text') || txt(P, 'Name') || 'Panel').replace(/&/g, ''), items: items.slice(0, 40) }); }
      for(const T of allTag('RibbonTabSource')){ const panels = [...T.getElementsByTagName('RibbonPanelSourceReference')].map(r => pan.get(at(r, 'PanelId'))).filter(Boolean); if(panels.length) out.tabs.push({ id: 'r' + Math.random().toString(36).slice(2, 8), name: (at(T, 'Text') || txt(T, 'Name') || 'Tab').replace(/&/g, ''), panels: panels.slice(0, 30), rb: 1 }); } }
    // menu thả xuống (PopMenu POP1…) → thanh menu cổ điển (MENUBAR)
    { const lab = v => String(v || '').replace(/&(?!&)/g, '').replace(/&&/g, '&').trim(); const popById = new Map(); for(const pm of allTag('PopMenu')) if(pm.getAttribute('UID')) popById.set(pm.getAttribute('UID'), pm);
      const popItems = (pm, depth) => { const items = []; if(depth > 4) return items;
        for(const ch of pm.children){ const tg = ch.tagName;
          if(tg === 'PopMenuItem'){ const sep = /true/i.test(ch.getAttribute('IsSeparator') || ch.getAttribute('Separator') || txt(ch, 'IsSeparator') || ''); const nmEl = kid(ch, 'Name') || ch.getElementsByTagName('Name')[0]; const nm = lab(nmEl ? nmEl.textContent : ''); const c = refOf(ch);
            if(sep || (!c && !nm)) items.push({ sep: 1 }); else if(c) items.push({ t: nm || c, c }); }
          else if(tg === 'PopMenuRef' || tg === 'PopMenu'){ const sub = tg === 'PopMenu' ? ch : popById.get(ch.getAttribute('MenuItemID') || ch.getAttribute('MenuID') || ch.getAttribute('PopMenuID') || ''); const nmEl = kid(ch, 'Name'); const L = sub ? popItems(sub, depth + 1) : []; if(L.length) items.push({ t: lab((nmEl && nmEl.textContent) || (sub && txt(sub, 'Name'))) || 'Menu', sub: L }); } }
        return items; };
      const tops = allTag('PopMenu').filter(pm => { const al = [...pm.children].filter(c => c.tagName === 'Alias').map(c => c.textContent.trim().toUpperCase()); return al.length ? al.some(a => /^POP[1-9]\d*$/.test(a)) : (pm.parentElement && pm.parentElement.tagName === 'PopMenuRoot'); });
      out.menus = tops.map(pm => ({ t: lab(txt(pm, 'Name')) || 'Menu', items: popItems(pm, 0) })).filter(m => m.items.some(x => !x.sep)); }
    out.stat = { macros: byId.size, cmds: out.cmds.length, keys: out.keys.length, dbl: Object.keys(out.dbl).length, panels: out.tabs.reduce((s, t) => s + t.panels.length, 0), menus: out.menus.length, imgs: 0 };
    return out; }
  // hình nút: tên ảnh trong gói (.bmp / .png / .ico) → data URL
  async function cuiImages(o, z){ if(!z) { for(const c of o.cmds) delete c._img; return; } const base = n => String(n).split('/').pop().toLowerCase().replace(/\.[^.]+$/, '');
    const map = new Map(); for(const n of z.names) if(/\.(bmp|png|ico|jpe?g|gif)$/i.test(n)) map.set(base(n), n);
    for(const c of o.cmds){ const want = c._img && map.get(base(c._img)); delete c._img; if(!want) continue; try{ const b = await z.get(want); if(!b || b.length > 120000) continue; let bin = ''; for(let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        const ext = want.split('.').pop().toLowerCase(); c.img = 'data:' + (ext === 'png' ? 'image/png' : ext === 'ico' ? 'image/x-icon' : ext === 'gif' ? 'image/gif' : /jpe?g/.test(ext) ? 'image/jpeg' : 'image/bmp') + ';base64,' + btoa(bin); o.stat.imgs++; }catch(_){} } }
  async function readCui(f){ const nm = f.name || '';
    if(/\.cuix$/i.test(nm)){ const z = await unzip(await f.arrayBuffer()); const xmlName = z.names.find(n => /(^|\/)MenuGroup\.cui$/i.test(n)) || z.names.find(n => /\.cui$/i.test(n) && !/ribbon|qat|workspace/i.test(n)); if(!xmlName) throw new Error('Gói .cuix không có MenuGroup.cui');
      const b = await z.get(xmlName); const extra = []; for(const n of z.names) if(n !== xmlName && /\.cui$/i.test(n) && /ribbon/i.test(n)){ try{ extra.push(new TextDecoder().decode(await z.get(n))); }catch(_){} }
      const o = cuiFromXml(new TextDecoder().decode(b), nm, { xml: extra }); await cuiImages(o, z); return o; }
    const t = await f.text(); if(/^\s*</.test(t)){ const o = cuiFromXml(t, nm); await cuiImages(o, null); return o; } const o = JSON.parse(t); return o && o.dvdcui ? o : null; }
  A.cuiRead = readCui;
  const cuiStat = o => o && o.stat ? ' (' + o.stat.macros + ' macro → ' + o.stat.cmds + ' lệnh tự tạo, ' + o.stat.keys + ' phím tắt, ' + o.stat.dbl + ' nhấp đúp, ' + o.stat.panels + ' bảng ribbon / thanh công cụ, ' + (o.stat.menus || 0) + ' menu, ' + (o.stat.imgs || 0) + ' hình nút)' : '';
  const cuiImport = async f => { let o = null; try{ o = await readCui(f); }catch(err){ console.warn('cui', err); } if(!o || !o.dvdcui){ say('Tệp tuỳ biến không hợp lệ.'); return; }
    const C = cuiGet(), N = cuiNorm(o); for(const c of N.cmds) if(!C.cmds.some(x => x.name === c.name)) C.cmds.push(c); for(const k of N.keys){ C.keys = C.keys.filter(x => x.key !== k.key); C.keys.push(k); } Object.assign(C.dbl, N.dbl); if(N.qat) C.qat = N.qat; for(const t of N.tabs) if(!C.tabs.some(x => x.id === t.id)) C.tabs.push(t); for(const m of N.menus || []){ C.menus = (C.menus || []).filter(x => x.t !== m.t); C.menus.push(m); } lsSet(CUIK, C); cuiApply(); log('CUIIMPORT: đã nhập ' + f.name + cuiStat(o)); };
  const cuiLoad = async f => { let o = null; try{ o = await readCui(f); }catch(err){ console.warn('cui', err); } if(!o || !o.dvdcui){ say('Tệp tuỳ biến không hợp lệ.'); return; }
    const C = cuiGet(); C.partial = C.partial.filter(p => p.name !== f.name); C.partial.push({ name: f.name, data: o }); lsSet(CUIK, C); cuiApply(); log('CUILOAD: đã nạp ' + f.name + cuiStat(o)); };
  A.cuiImportFile = cuiImport; A.cuiLoadFile = cuiLoad;
  plain(['CUIIMPORT'], 'Nhập tuỳ biến giao diện từ tệp .cuix / .cui của AutoCAD hoặc .dvdcui (ghép vào tuỳ biến hiện có)', async () => { const F = await pickF('.cuix,.cui,.dvdcui,.json'); const f = F && F[0]; if(f) await cuiImport(f); });
  plain(['CUILOAD'], 'Nạp tệp tuỳ biến bổ sung (.cuix / .cui / .dvdcui) vào giao diện', async () => { const F = await pickF('.cuix,.cui,.dvdcui,.json'); const f = F && F[0]; if(f) await cuiLoad(f); });
  ecmd(['CUIUNLOAD'], 'Gỡ tệp tuỳ biến bổ sung đã nạp', async () => { const C = cuiGet(); if(!C.partial.length){ log('Chưa nạp tệp tuỳ biến bổ sung nào.'); return; } const s = await A.getStr('Tên tệp tuỳ biến cần gỡ (' + C.partial.map(p => p.name).join(', ') + ')'); const n = String(s.str || '').trim().toLowerCase(); if(!n) return;
    const i = C.partial.findIndex(p => p.name.toLowerCase() === n || p.name.toLowerCase().replace(/\.[^.]+$/, '') === n); if(i < 0){ log('Không có tệp "' + s.str + '".'); return; } const nm = C.partial[i].name; C.partial.splice(i, 1); lsSet(CUIK, C); cuiApply(); log('CUIUNLOAD: đã gỡ ' + nm); });
  setTimeout(() => { try{ cuiApply(); }catch(err){ console.warn('cui', err); } }, 0);

  /* ---------- CHSPACE — Change Space (Model ↔ Paper qua khung nhìn) ---------- */
  const vpOf = (L, i) => { const v = L.paper.viewports[i]; return v ? { v, s: v.h / v.vh } : null; };
  function vpAt(L, p){ const V = L.paper.viewports || []; for(let i = V.length - 1; i >= 0; i--){ const v = V[i]; if(Math.abs(p.x - v.vcx) <= v.w / 2 && Math.abs(p.y - v.vcy) <= v.h / 2) return i; } return -1; }
  // xoay nhìn của khung nhìn (VIEWTWIST): giấy = tâm khung + tỉ lệ·R(tw)·(P − tâm nhìn)
  const twD = q => (q.v.tw || 0) * 180 / Math.PI;
  const toPaperXf = (w, q) => { const c = { x: q.v.dcx, y: q.v.dcy }; if(twD(q)) window.rotateEnt(w, twD(q), c); window.scaleEnt(w, q.s, c); window.translateEnt(w, q.v.vcx - q.v.dcx, q.v.vcy - q.v.dcy); return w; };
  const toModelXf = (w, q) => { const c = { x: q.v.vcx, y: q.v.vcy }; window.scaleEnt(w, 1 / q.s, c); if(twD(q)) window.rotateEnt(w, -twD(q), c); window.translateEnt(w, q.v.dcx - q.v.vcx, q.v.dcy - q.v.vcy); return w; };
  const clean = e => { const w = deep(e); delete w.userAdded; delete w.clip; delete w._src; return w; };
  // một bước hoàn tác cho cả 2 không gian
  function moveSpace(name, fromModel, toPaper, fromPaper, toModel, label){
    const sigs = fromModel.map(e => ({ e, sig: entSig(e), was: !!e.userAdded }));
    const apply = fwd => { const L = layoutByName(name);
      if(fwd){ for(const it of sigs){ const i = modelEntities.indexOf(it.e); if(i >= 0) modelEntities.splice(i, 1); if(!it.was) geomDel.add(it.sig); } for(const e of toModel){ e.userAdded = true; if(modelEntities.indexOf(e) < 0) modelEntities.push(e); } }
      else { for(const e of toModel){ const i = modelEntities.indexOf(e); if(i >= 0) modelEntities.splice(i, 1); } for(const it of sigs){ if(modelEntities.indexOf(it.e) < 0) modelEntities.push(it.e); if(!it.was) geomDel.delete(it.sig); } }
      if(L){ const ps = psOf(L), add = fwd ? toPaper : fromPaper, rem = fwd ? fromPaper : toPaper; for(const e of rem){ const i = ps.indexOf(e); if(i >= 0) ps.splice(i, 1); } for(const e of add){ e.userAdded = true; if(ps.indexOf(e) < 0) ps.push(e); } psAfter(L); }
      bbDirty = true; snapDirty = true; try{ saveGeomEdits(); }catch(_){} };
    apply(true); pushUndo({ op: 'fn', undo: () => apply(false), redo: () => apply(true) }); try{ selEnts.clear(); }catch(_){} try{ draw(); A.paint(); }catch(_){} log(label); }
  async function pickVp(L, pr){ for(;;){ const r = await A.getPoint(pr || 'Chọn khung nhìn (bấm bên trong khung)'); if(!r.pt) return -1; const i = vpAt(L, r.pt); if(i >= 0) return i; log('Điểm không nằm trong khung nhìn nào.'); } }
  ecmd(['CHSPACE'], 'Chuyển đối tượng giữa không gian giấy và không gian mô hình qua khung nhìn (Change Space), giữ đúng tỉ lệ khung nhìn', async (_, cur) => {
    const L = ensureUser(); if(!L){ log('CHSPACE dùng trong layout do bạn tạo (lệnh LAYOUT): chọn đối tượng trên giấy để đưa vào Model, hoặc M để lấy đối tượng Model đưa ra giấy.'); return; }
    if(!(L.paper.viewports || []).length){ log('Layout chưa có khung nhìn — dùng MVIEW.'); return; }
    const name = L.name, ps = psOf(L); let pre = cur && cur.pre && cur.pre.length ? cur.pre.filter(e => ps.includes(e)) : []; if(cur) cur.pre = [];
    let mode = pre.length ? 'P' : null;
    if(!mode){ const k = await A.getKw('Hướng chuyển', { kw: [{ k: 'P', t: 'Giấy sang Model' }, { k: 'M', t: 'Model sang giấy' }], def: 'Giấy sang Model' }); if(k.cancel) return; mode = k.kw === 'M' ? 'M' : 'P'; }
    if(mode === 'P'){
      let sel = pre; if(!sel.length){ const s = await A.getSel('Chọn đối tượng trên giấy', { filter: e => ps.includes(e) }); sel = (s.sel || []).filter(e => ps.includes(e)); } if(!sel.length) return;
      const c = bbPts(sel.map(e => { const b = entBBox(e); return b ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : null; }).filter(Boolean)); let vi = c ? vpAt(L, { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 }) : -1;
      if(vi < 0){ vi = await pickVp(L, 'Đối tượng nằm ngoài khung nhìn — chọn khung nhìn dùng để chuyển'); if(vi < 0) return; }
      const q = vpOf(userLayout() || L, vi); const toM = sel.map(e => toModelXf(clean(e), q));
      moveSpace(name, [], [], sel, toM, 'CHSPACE: đã chuyển ' + sel.length + ' đối tượng từ giấy vào Model (tỉ lệ 1:' + r6(1 / q.s * (typeof unitToMM === 'function' ? (unitToMM() || 1) : 1)) + ').');
      return; }
    const vi = await pickVp(L); if(vi < 0) return; const q0 = vpOf(L, vi), v = q0.v, tc = Math.abs(Math.cos(v.tw || 0)), ts = Math.abs(Math.sin(v.tw || 0)), mw0 = v.vh * (v.w / v.h), mw = mw0 * tc + v.vh * ts, mh = mw0 * ts + v.vh * tc;
    // chuyển sang Model để chọn (đổi tab huỷ lệnh đang chạy → chạy tiếp bằng lệnh thứ hai), xong quay lại layout
    setTimeout(() => { const mi = dwgLayouts.findIndex(x => x.isModel); if(mi < 0) return; switchLayout(mi); try{ zoomToWorldRect(v.dcx - mw / 2, v.dcy - mh / 2, v.dcx + mw / 2, v.dcy + mh / 2); draw(); }catch(_){}
      const back = () => setTimeout(() => { const j = dwgLayouts.findIndex(x => x.user && x.name === name); if(j >= 0 && j !== currentLayout) switchLayout(j); }, 0);
      A.run('CHSPACE', async () => { let sel = [];
        try{ const s = await A.getSel('Chọn đối tượng Model cần đưa ra giấy (khung nhìn #' + (vi + 1) + ')'); sel = (s.sel || []).filter(e => !A.isLocked(e) && modelEntities.includes(e)); }
        catch(err){ back(); throw err; }
        const L2 = layoutByName(name); if(!sel.length || !L2){ back(); return; } const q = vpOf(L2, vi);
        const toP = sel.map(e => toPaperXf(clean(e), q));
        moveSpace(name, sel, toP, [], [], 'CHSPACE: đã chuyển ' + sel.length + ' đối tượng từ Model ra giấy (khung nhìn #' + (vi + 1) + ').'); back(); }); }, 0);
  });
  plain(['PSPACEOBJ', 'PSOBJ'], 'Liệt kê / chọn đối tượng trên giấy của layout hiện hành', () => { const L = ensureUser(); if(!L){ log('Không ở layout giấy.'); return; } const ps = psOf(L); try{ selEnts.clear(); for(const e of ps) selEnts.add(e); draw(); }catch(_){} log('Layout "' + L.name + '": ' + ps.length + ' đối tượng trên giấy (đã chọn).'); });
})();
