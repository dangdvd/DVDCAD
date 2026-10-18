/* DVDCAD v4s — GHI DXF R2000 (AC1015) · v4u: mặc định DXF 2018 (AC1032), chọn được 2013/2010/2007/2004/2000/R12
   Có handle, mã lớp con (subclass), BLOCK_RECORD, OBJECTS (dictionary, layout) như AutoCAD 2000 trở lên.
   Giữ được so với R12: bề rộng nét từng đối tượng / lớp (370), LWPOLYLINE có cung, MTEXT nhiều dòng, HATCH thật (đặc + mẫu),
   ELLIPSE, XLINE / RAY, kiểu nét phức (chữ / hình trong nét), khối + thuộc tính, kích thước DIMENSION, XDATA DVDCAD. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._dxf2000) return; A._dxf2000 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const VK = 'dvd:dxfver';
  // mã phiên bản; 'AUTO' = R2000, tự lên R2004 khi có màu RGB (kiểu cũ trước v4u)
  const ACV = { R2000: 'AC1015', R2004: 'AC1018', R2007: 'AC1021', R2010: 'AC1024', R2013: 'AC1027', R2018: 'AC1032' };
  const YR = { R2000: 2000, R2004: 2004, R2007: 2007, R2010: 2010, R2013: 2013, R2018: 2018 };
  const VOK = /^(R12|R2000|R2004|R2007|R2010|R2013|R2018|AUTO)$/;
  A.dxfVer = (() => { try{ let v = localStorage.getItem(VK); if(v === 'AUTO' && !localStorage.getItem(VK + '18')){ v = 'R2018'; localStorage.setItem(VK, v); }   // v4u: mặc định cũ (Tự động) → 2018
      try{ localStorage.setItem(VK + '18', '1'); }catch(_){} return v && VOK.test(v) ? v : 'R2018'; }catch(_){ return 'R2018'; } })();
  A.setDxfVer = v => { A.dxfVer = VOK.test(v) ? v : 'R2018'; try{ localStorage.setItem(VK, A.dxfVer); localStorage.setItem(VK + '18', '1'); }catch(_){} };
  const hexRGB = h => { let s = String(h || '').replace('#', ''); if(s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); return /^[0-9a-f]{6}$/i.test(s) ? n : null; };
  const isAciColor = h => { const n = hexRGB(h); if(n == null) return true; const a = A.aciNear(h); return (ACI_RGB[a] >>> 0) === n; };
  // thuộc tính riêng của DVDCAD ghi kèm (XDATA) để mở lại trong DVDCAD còn nguyên
  const XKEYS = ['cid', 'dord', 'anno', 'fld', 'url', 'dyn', 'dvs', 'mt'];

  let UTF8 = false;   // DXF R2007+: chữ ghi thẳng UTF-8 (không cần mã \U+)
  function dxfStr(s){ if(UTF8) return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/[\x00-\x1f]/g, ' '); return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, ch => { const cp = ch.codePointAt(0); return cp > 0xffff ? '?' : '\\U+' + cp.toString(16).toUpperCase().padStart(4, '0'); }); }
  function mtStr(s){ const t = String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/[{}]/g, c => '\\' + c).replace(/\r?\n/g, '\\P'); if(UTF8) return t.replace(/[\x00-\x1f]/g, ' '); return t.replace(/[^\x20-\x7e]/g, ch => { const cp = ch.codePointAt(0); return cp > 0xffff ? '?' : '\\U+' + cp.toString(16).toUpperCase().padStart(4, '0'); }); }
  const fr = v => { if(!isFinite(v)) v = 0; let s = (+v).toFixed(10); s = s.replace(/0+$/, '').replace(/\.$/, ''); return s === '-0' || s === '' ? '0' : s; };
  const isReal = c => (c >= 10 && c < 60) || (c >= 110 && c < 150) || (c >= 210 && c < 240) || (c >= 1010 && c < 1060) || c === 460 || c === 461 || c === 462;
  const bbox = ents => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of ents){ let b = null; try{ b = entBBox(e); }catch(_){} if(!b) continue; if(b.x0 < x0) x0 = b.x0; if(b.y0 < y0) y0 = b.y0; if(b.x1 > x1) x1 = b.x1; if(b.y1 > y1) y1 = b.y1; } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
  const LWV = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
  const lwStd = v => { if(!(v > 0)) return null; let b = LWV[0], bd = Infinity; for(const w of LWV){ const d = Math.abs(w - v); if(d < bd){ bd = d; b = w; } } return b; };
  const SHPN = { TRACK1: 130, ZIG: 131, BOX: 132, CIRC1: 133, BAT: 134, AMZIGZAG: 135 };   // số hình trong ltypeshp.shx chuẩn

  // dữ liệu riêng của bản vẽ (ràng buộc tham số, định nghĩa khối động) → XRECORD "DVDCAD_DATA" trong OBJECTS
  function dvdData(ents){
    const o = {}; try{ const cons = A.constraints ? A.constraints() : []; if(cons && cons.length) o.cons = cons; }catch(_){}
    try{ const D = A.dynDefs ? A.dynDefs() : null; if(D){ const names = new Set(); for(const e of ents){ if(e.blk) names.add(e.blk); if(e.bm && e.bm.name) names.add(e.bm.name); } const dd = {}; for(const n of names) if(D[n]) dd[n] = D[n]; if(Object.keys(dd).length) o.dyn = dd; } }catch(_){}
    return Object.keys(o).length ? JSON.stringify(o) : null;
  }
  // mở lại: áp dữ liệu DVDCAD (trước khi các mô-đun nạp ràng buộc)
  A.onLoad = (function(prev){ return function(){ try{ const d = window._dvdXData; window._dvdXData = null; if(d){ const o = JSON.parse(d); const nm = (typeof currentName !== 'undefined' && currentName) || '';
        if(o.cons && o.cons.length) localStorage.setItem('dvd:cons::' + nm, JSON.stringify(o.cons));
        if(o.dyn && A.dynDefs){ Object.assign(A.dynDefs(), o.dyn); try{ localStorage.setItem('dvd:dynblk', JSON.stringify(A.dynDefs())); }catch(_){} } } }catch(err){ console.warn(err); } if(prev) prev(); }; })(A.onLoad);
  function writeR2000(ents){
    ents = ents.filter(e => e && !e.xr && !e.vh);
    ents = ents.map((e, i) => [e, i]).sort((a, b) => ((a[0].dord | 0) - (b[0].dord | 0)) || (a[1] - b[1])).map(x => x[0]);   // thứ tự vẽ (DRAWORDER) = thứ tự trong file
    const needTC = ents.some(e => e.col && !e.bl && !isAciColor(e.col) && String(e.col).toLowerCase() !== String(A.layerHex(e.layer || '0')).toLowerCase()) || [...new Set(ents.map(e => e.layer || '0'))].some(l => !isAciColor(A.layerHex(l)));
    const VR = ACV[A.dxfVer] ? A.dxfVer : (A.dxfVer === 'AUTO' && needTC) ? 'R2004' : A.dxfVer === 'AUTO' ? 'R2000' : 'R2018';
    const yr = YR[VR]; const V2007 = yr >= 2007; UTF8 = V2007;   // R2007+: chữ UTF-8, vật liệu, kiểu ghi chú (MLEADERSTYLE)…
    const V2004 = yr >= 2004;
    A.lastDxfVer = VR;
    const hasWipe = ents.some(e => e.wipe && e.type === 'POLYLINE');
    const L = []; const P = (c, v) => { L.push(String(c)); L.push(typeof v === 'number' ? (isReal(c) ? fr(v) : String(Math.round(v))) : String(v)); };
    let hseq = 0x20; const H = () => (hseq++).toString(16).toUpperCase();
    const ext = bbox(ents) || { x0: 0, y0: 0, x1: 100, y1: 100 };
    // ---------- handles cố định ----------
    const hRoot = H(), hGroupD = H(), hLayoutD = H(), hMlsD = H(), hPsetD = H(), hPsnD = H(), hPsnNormal = H(), hMlsStd = H();
    // R2007+ (2010/2013/2018): từ điển & đối tượng bắt buộc như AutoCAD tạo
    const N7 = V2007 ? { color: H(), mat: H(), mByBlock: H(), mByLayer: H(), mGlobal: H(), mlds: H(), mldStd: H(), scl: H(), sc11: H(), tbs: H(), vis: H() } : null;
    const hT = {}; for(const t of ['VPORT', 'LTYPE', 'LAYER', 'STYLE', 'VIEW', 'UCS', 'APPID', 'DIMSTYLE', 'BLOCK_RECORD']) hT[t] = H();
    const hBRmodel = H(), hBRpaper = H(), hLayModel = H(), hLayPaper = H(), hBlkModel = H(), hEndModel = H(), hBlkPaper = H(), hEndPaper = H();
    // ---------- lớp / kiểu nét / kiểu chữ ----------
    const layers = new Set(['0']); for(const n of A.layerNames()) if(!String(n).includes('|')) layers.add(n); for(const e of ents) layers.add(String(e.layer || '0'));
    const ltUsed = new Set(); for(const ly of layers){ const v = A.layerLT(ly); if(v && !/^(CONTINUOUS|BYLAYER|BYBLOCK)$/i.test(v)) ltUsed.add(String(v).toUpperCase()); }
    for(const e of ents) if(e.lt && !/^(CONTINUOUS|BYBLOCK|BYLAYER)$/i.test(e.lt)) ltUsed.add(String(e.lt).toUpperCase());
    const ltDefs = [...ltUsed].map(n => { const d = A.ltDefOf(n) || (window.LTYPES && LTYPES[n]); return d && d.pat && d.pat.length ? { n, d, h: H() } : null; }).filter(Boolean);
    const ltOk = new Set(ltDefs.map(x => x.n));
    const hLtByBlock = H(), hLtByLayer = H(), hLtCont = H();
    const stUsed = new Map(); for(const e of ents){ if(e.type === 'TEXT' && e.style && e.ff && A.FONT_FILE && A.FONT_FILE[e.ff] && !stUsed.has(e.style) && String(e.style).toUpperCase() !== 'STANDARD') stUsed.set(e.style, { f: A.FONT_FILE[e.ff], h: H() }); }
    const hStStd = H(); const needShx = ltDefs.some(x => (x.d.txt || []).some(t => t.sh)); const hStShx = needShx ? H() : null;
    const hApAcad = H(), hApDvd = H(), hDsStd = H(), hVpAct = H();
    const layH = new Map(); for(const ly of layers) layH.set(ly, H());
    // ---------- khối, kích thước (như bản R12) ----------
    const byGrp = new Map(); for(const e of ents) if(e.grp){ let a = byGrp.get(e.grp); if(!a){ a = []; byGrp.set(e.grp, a); } a.push(e); }
    const grpCnt = new Map(); if(byGrp.size) for(const x of modelEntities) if(x.grp && byGrp.has(x.grp)) grpCnt.set(x.grp, (grpCnt.get(x.grp) || 0) + 1);
    const grpAll = gid => { const a = byGrp.get(gid) || []; const n = grpCnt.get(gid) || 0; return a.length === n || n === 0 ? a : null; };
    const inv = m => { const det = m.a * m.d - m.b * m.c; if(Math.abs(det) < 1e-300) return null; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; };
    const clone = o => JSON.parse(JSON.stringify(o));
    const blockDefs = new Map(), blockFam = new Map(), inserts = new Map(), dims = new Map(); const done = new Set();
    if(ents.length < 200000) for(const [gid] of byGrp){
      const mem = grpAll(gid); if(!mem || !mem.length) continue; const f = mem[0];
      if(f.bm && f.bm.name && !String(f.blk || '').startsWith('*') && !mem.some(x => x.vh || x.type === 'SOLID3D' || x.type === 'IMAGE')){
        const Mi = inv(f.bm); if(!Mi || mem.some(x => !x.bm || x.bm.name !== f.bm.name)) continue; const nm = String(f.bm.name).replace(/[<>\\/":;?*|=`]/g, '_').slice(0, 250); if(!nm) continue;
        const loc = mem.map(x => A.xformEnt(clone(x), Mi)); const bb = bbox(loc.filter(x => !x.att)) || { x0: 0, y0: 0, x1: 0, y1: 0 };
        const tol = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0, 1) * 1e-6; const same = D0 => D0.n === mem.length && Math.abs(D0.bb.x0 - bb.x0) <= tol && Math.abs(D0.bb.y0 - bb.y0) <= tol && Math.abs(D0.bb.x1 - bb.x1) <= tol && Math.abs(D0.bb.y1 - bb.y1) <= tol;
        const fam = blockFam.get(nm) || []; let D = fam.find(same);
        if(!D){ const vn = fam.length ? nm + '$' + fam.length : nm; D = { name: vn, ents: loc, n: mem.length, bb, atts: loc.filter(x => x.att), hBR: H(), hB: H(), hE: H() }; fam.push(D); blockFam.set(nm, fam); blockDefs.set(vn, D); }
        inserts.set(gid, { D, m: f.bm, mem }); for(const x of mem) done.add(x); continue; }
      if(String(f.blk || '').startsWith('*DIM')){ const t = mem.find(x => x.dimd && x.type === 'TEXT'); if(t && /^(lin|rad|dia|ang)$/.test(t.dimd.k)){ dims.set(gid, { t, mem, hBR: H(), hB: H(), hE: H() }); for(const x of mem) done.add(x); } }
    }
    let dn = 0; for(const d of dims.values()) d.bn = '*D' + (++dn);
    // ---------- HEADER ----------
    P(0, 'SECTION'); P(2, 'HEADER');
    P(9, '$ACADVER'); P(1, ACV[VR]); P(9, '$ACADMAINTVER'); if(yr >= 2018) P(90, 4); else P(70, { 2007: 25, 2010: 6, 2013: 105 }[yr] || 20); P(9, '$DWGCODEPAGE'); P(3, 'ANSI_1252');
    if(yr >= 2013){ P(9, '$REQUIREDVERSIONS'); P(160, 0); } P(9, '$LASTSAVEDBY'); P(1, 'DVDCAD');
    P(9, '$INSBASE'); P(10, (A.drawBase && A.drawBase.x) || 0); P(20, (A.drawBase && A.drawBase.y) || 0); P(30, 0);
    P(9, '$EXTMIN'); P(10, ext.x0); P(20, ext.y0); P(30, 0); P(9, '$EXTMAX'); P(10, ext.x1); P(20, ext.y1); P(30, 0);
    const LIM = A.limits || { x0: 0, y0: 0, x1: 420, y1: 297 }; P(9, '$LIMMIN'); P(10, LIM.x0); P(20, LIM.y0); P(9, '$LIMMAX'); P(10, LIM.x1); P(20, LIM.y1); if(A.limits && A.limits.on){ P(9, '$LIMCHECK'); P(70, 1); }
    P(9, '$LTSCALE'); P(40, LTSCALE || 1); P(9, '$CELTSCALE'); P(40, A.LS.celts || 1); P(9, '$CLAYER'); P(8, dxfStr(A.LS.cur || '0'));
    P(9, '$CELWEIGHT'); P(370, -1); P(9, '$LWDISPLAY'); P(290, 1); P(9, '$MEASUREMENT'); P(70, (typeof unitToMM === 'function' && (unitToMM() === 25.4 || unitToMM() === 304.8)) ? 0 : 1);
    if(typeof insunits !== 'undefined' && insunits){ P(9, '$INSUNITS'); P(70, insunits); }
    P(9, '$PSLTSCALE'); P(70, 1); P(9, '$HANDSEED'); const seedAt = L.length + 1; P(5, 'FFFF');
    P(0, 'ENDSEC');
    P(0, 'SECTION'); P(2, 'CLASSES');
    const cls = (n, cpp, app, fl, ent) => { P(0, 'CLASS'); P(1, n); P(2, cpp); P(3, app); P(90, fl); if(V2004) P(91, 0); P(280, 0); P(281, ent ? 1 : 0); };
    if(V2007){ const ODBX = 'ObjectDBX Classes';
      for(const c of [['ACDBDICTIONARYWDFLT', 'AcDbDictionaryWithDefault', ODBX, 0], ['SUN', 'AcDbSun', 'SCENEOE', 1153], ['VISUALSTYLE', 'AcDbVisualStyle', ODBX, 4095], ['MATERIAL', 'AcDbMaterial', ODBX, 1153],
        ['SCALE', 'AcDbScale', ODBX, 1153], ['TABLESTYLE', 'AcDbTableStyle', ODBX, 4095], ['MLEADERSTYLE', 'AcDbMLeaderStyle', 'ACDB_MLEADERSTYLE_CLASS', 4095], ['DICTIONARYVAR', 'AcDbDictionaryVar', ODBX, 0],
        ['CELLSTYLEMAP', 'AcDbCellStyleMap', ODBX, 1152], ['MENTALRAYRENDERSETTINGS', 'AcDbMentalRayRenderSettings', 'SCENEOE', 1024], ['ACDBDETAILVIEWSTYLE', 'AcDbDetailViewStyle', ODBX, 1025],
        ['ACDBSECTIONVIEWSTYLE', 'AcDbSectionViewStyle', ODBX, 1025], ['RASTERVARIABLES', 'AcDbRasterVariables', 'ISM', 0], ['ACDBPLACEHOLDER', 'AcDbPlaceHolder', ODBX, 0], ['LAYOUT', 'AcDbLayout', ODBX, 0]]) cls(c[0], c[1], c[2], c[3]); }
    if(hasWipe){ cls('WIPEOUTVARIABLES', 'AcDbWipeoutVariables', 'WipeOut|AutoCAD Express Tool|expresstools@autodesk.com', 0);
      cls('WIPEOUT', 'AcDbWipeout', 'WipeOut|AutoCAD Express Tool|expresstools@autodesk.com', 127, true); }
    P(0, 'ENDSEC');
    // ---------- TABLES ----------
    P(0, 'SECTION'); P(2, 'TABLES');
    const table = (name, n, rows, extra) => { P(0, 'TABLE'); P(2, name); P(5, hT[name]); P(330, '0'); P(100, 'AcDbSymbolTable'); P(70, n); if(extra) extra(); rows(); P(0, 'ENDTAB'); };
    const rec = (type, h, sub, hcode) => { P(0, type); P(hcode || 5, h); P(330, hT[type]); P(100, 'AcDbSymbolTableRecord'); P(100, sub); };
    table('VPORT', 1, () => { rec('VPORT', hVpAct, 'AcDbViewportTableRecord'); P(2, '*Active'); P(70, 0); P(10, 0); P(20, 0); P(11, 1); P(21, 1); P(12, (ext.x0 + ext.x1) / 2); P(22, (ext.y0 + ext.y1) / 2); P(13, 0); P(23, 0); P(14, 10); P(24, 10); P(15, 10); P(25, 10); P(16, 0); P(26, 0); P(36, 1); P(17, 0); P(27, 0); P(37, 0);
      P(40, Math.max(ext.y1 - ext.y0, (ext.x1 - ext.x0) / 1.6, 1) * 1.1); P(41, 1.6); P(42, 50); P(43, 0); P(44, 0); P(50, 0); P(51, 0); P(71, 0); P(72, 1000); P(73, 1); P(74, 3); P(75, 0); P(76, 0); P(77, 0); P(78, 0); P(281, 0); P(65, 1); P(110, 0); P(120, 0); P(130, 0); P(111, 1); P(121, 0); P(131, 0); P(112, 0); P(122, 1); P(132, 0); P(79, 0); P(146, 0); });
    table('LTYPE', 3 + ltDefs.length, () => {
      rec('LTYPE', hLtByBlock, 'AcDbLinetypeTableRecord'); P(2, 'ByBlock'); P(70, 0); P(3, ''); P(72, 65); P(73, 0); P(40, 0);
      rec('LTYPE', hLtByLayer, 'AcDbLinetypeTableRecord'); P(2, 'ByLayer'); P(70, 0); P(3, ''); P(72, 65); P(73, 0); P(40, 0);
      rec('LTYPE', hLtCont, 'AcDbLinetypeTableRecord'); P(2, 'Continuous'); P(70, 0); P(3, 'Solid line'); P(72, 65); P(73, 0); P(40, 0);
      for(const { n, d, h } of ltDefs){ rec('LTYPE', h, 'AcDbLinetypeTableRecord'); P(2, dxfStr(n)); P(70, 0); P(3, dxfStr(d.desc || n)); P(72, 65); P(73, d.pat.length); P(40, d.pat.reduce((a, b) => a + Math.abs(b), 0));
        d.pat.forEach((v, i) => { P(49, v); const t = (d.txt || []).find(q => q.i === i);
          if(t && t.sh){ const num = typeof t.sh === 'string' ? (SHPN[t.sh] || 133) : (t.n || 133); P(74, 4 | (t.abs ? 1 : 0)); P(75, num); P(340, hStShx); P(46, t.s || 1); P(50, t.r || 0); P(44, t.x || 0); P(45, t.y || 0); }
          else if(t && t.t){ P(74, 2 | (t.abs ? 1 : 0)); P(75, 0); P(340, hStStd); P(46, t.s || 1); P(50, t.r || 0); P(44, t.x || 0); P(45, t.y || 0); P(9, dxfStr(t.t)); }
          else P(74, 0); }); } });
    A.lsSync && A.lsSync();
    table('LAYER', layers.size, () => { for(const ly of layers){ const aci = A.aciNear(A.layerHex(ly)); let fl = 0; if(A.LS.frozen.has(ly)) fl |= 1; if(A.LS.locked.has(ly)) fl |= 4;
      rec('LAYER', layH.get(ly), 'AcDbLayerTableRecord'); P(2, dxfStr(ly)); P(70, fl); P(62, A.LS.off.has(ly) ? -aci : aci); if(V2004 && !isAciColor(A.layerHex(ly))) P(420, hexRGB(A.layerHex(ly))); const llt = String(A.layerLT(ly) || '').toUpperCase(); P(6, ltOk.has(llt) ? dxfStr(llt) : 'Continuous');
      const lw = lwStd(A.layerLW ? A.layerLW(ly) : 0); P(370, lw != null ? lw : -3); P(390, hPsnNormal); if(N7) P(347, N7.mGlobal); } });
    table('STYLE', 1 + stUsed.size + (hStShx ? 1 : 0), () => {
      rec('STYLE', hStStd, 'AcDbTextStyleTableRecord'); P(2, 'Standard'); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, 'arial.ttf'); P(4, '');
      for(const [n, o] of stUsed){ rec('STYLE', o.h, 'AcDbTextStyleTableRecord'); P(2, dxfStr(n)); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, o.f); P(4, ''); }
      if(hStShx){ rec('STYLE', hStShx, 'AcDbTextStyleTableRecord'); P(2, ''); P(70, 1); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, 'ltypeshp.shx'); P(4, ''); } });
    table('VIEW', 0, () => {}); table('UCS', 0, () => {});
    table('APPID', 2, () => { rec('APPID', hApAcad, 'AcDbRegAppTableRecord'); P(2, 'ACAD'); P(70, 0); rec('APPID', hApDvd, 'AcDbRegAppTableRecord'); P(2, 'DVDCAD'); P(70, 0); });
    const dt = A.dimTxt ? A.dimTxt() : 2.5;
    table('DIMSTYLE', 1, () => { rec('DIMSTYLE', hDsStd, 'AcDbDimStyleTableRecord', 105); P(2, 'Standard'); P(70, 0); P(40, 1); P(41, dt * ((A.DS && A.DS.asz) || 1)); P(42, dt * ((A.DS && A.DS.exo) || 0.6)); P(44, dt * ((A.DS && A.DS.exe) || 0.8)); P(140, dt); P(147, dt * ((A.DS && A.DS.gap) || 0.5)); P(77, 1); P(271, (A.DS && A.DS.dec) | 0); P(340, hStStd); },
      () => { P(100, 'AcDbDimStyleTable'); P(71, 1); P(340, hDsStd); });
    const allBlocks = [...blockDefs.values(), ...dims.values()];
    table('BLOCK_RECORD', 2 + allBlocks.length, () => {
      const brx = () => { if(V2007){ P(70, (typeof insunits !== 'undefined' && insunits) | 0); P(280, 1); P(281, 0); } };   // R2007+: đơn vị chèn, cho phép phá khối
      rec('BLOCK_RECORD', hBRmodel, 'AcDbBlockTableRecord'); P(2, '*Model_Space'); P(340, hLayModel); brx();
      rec('BLOCK_RECORD', hBRpaper, 'AcDbBlockTableRecord'); P(2, '*Paper_Space'); P(340, hLayPaper); brx();
      for(const D of blockDefs.values()){ rec('BLOCK_RECORD', D.hBR, 'AcDbBlockTableRecord'); P(2, dxfStr(D.name)); P(340, '0'); brx(); }
      for(const d of dims.values()){ rec('BLOCK_RECORD', d.hBR, 'AcDbBlockTableRecord'); P(2, d.bn); P(340, '0'); brx(); } });
    P(0, 'ENDSEC');
    // ---------- đối tượng ----------
    const span = Math.max(ext.x1 - ext.x0, ext.y1 - ext.y0, 1);
    function emit(e, owner, o){ o = o || {};
      const lyName = String(o.inBlock && e.l0 ? '0' : (e.layer || '0')); const ly = dxfStr(lyName);
      const byL = e.bl || String(e.col || '').toLowerCase() === String(A.layerHex(e.layer || '0')).toLowerCase();
      const aci = byL ? 256 : A.aciNear(e.col || '#ffffff');
      const ltn = e.lt ? String(e.lt).toUpperCase() : null; const elt = ltn ? (ltOk.has(ltn) ? dxfStr(ltn) : ltn === 'CONTINUOUS' ? 'Continuous' : ltn === 'BYBLOCK' ? 'ByBlock' : null) : null;
      const lw = e.lw > 0 ? lwStd(e.lw) : (e.lwb ? -2 : null);
      const tc = V2004 && aci !== 256 && !isAciColor(e.col) ? hexRGB(e.col) : null;
      let wrote = false;
      const head = (t, sub, hh) => { wrote = true; const h = hh || H(); P(0, t); P(5, h); P(330, owner); P(100, 'AcDbEntity'); P(8, ly); if(elt && t !== 'HATCH' && t !== 'TEXT' && t !== 'MTEXT') P(6, elt); if(aci !== 256) P(62, aci); if(tc != null) P(420, tc); if(lw != null) P(370, lw); if(e.lts && Math.abs(e.lts - 1) > 1e-9 && t !== 'TEXT' && t !== 'MTEXT') P(48, e.lts); if(sub) P(100, sub); return h; };
      const xd = () => { if(o.inBlock || o.dimBlock) return; const pr = {}; for(const k of XKEYS) if(e[k] != null && e[k] !== '' && !(k === 'mt' && e.type !== 'TEXT')) pr[k] = e[k]; const js = Object.keys(pr).length ? JSON.stringify(pr) : null;
        if(!e.rgn && !js) return; P(1001, 'DVDCAD'); if(e.rgn) P(1000, 'RGN' + (e.grp && e.blk === '*REGION' ? ':' + e.grp : '')); if(js){ for(let k = 0; k < js.length; k += 240) P(1000, (k ? 'P+' : 'P:') + js.slice(k, k + 240)); } };
      // đa tuyến có độ rộng: độ rộng đầu / cuối từng đỉnh (40 / 41) lấy lại từ các tứ giác tô
      const widthPoly = e2 => { const V = e2.vertices, q = e2.wq, key = p => Math.round(p.x * 1e5) + ',' + Math.round(p.y * 1e5); const m = new Map();
        for(const Q of q){ if(Q.length < 4) continue; const a = { x: (Q[0].x + Q[3].x) / 2, y: (Q[0].y + Q[3].y) / 2 }, b = { x: (Q[1].x + Q[2].x) / 2, y: (Q[1].y + Q[2].y) / 2 }; m.set(key(a) + '|' + key(b), [Math.hypot(Q[0].x - Q[3].x, Q[0].y - Q[3].y), Math.hypot(Q[1].x - Q[2].x, Q[1].y - Q[2].y)]); }
        let cl = !!e2.closed, n = V.length; if(!cl && n > 2 && Math.hypot(V[0].x - V[n - 1].x, V[0].y - V[n - 1].y) < 1e-9){ cl = true; n--; }
        head('LWPOLYLINE', 'AcDbPolyline'); P(90, n); P(70, cl ? 1 : 0);
        for(let i = 0; i < n; i++){ const a = V[i], b = V[(i + 1) % V.length]; const w = (i < n - 1 || cl) ? m.get(key(a) + '|' + key(b)) : null; P(10, a.x); P(20, a.y); if(w){ P(40, w[0]); P(41, w[1]); } } };
      const lwpoly = (verts, closed) => { if(verts.length < 2) return; head('LWPOLYLINE', 'AcDbPolyline'); P(90, verts.length); P(70, closed ? 1 : 0); P(43, 0); for(const v of verts){ P(10, v.x); P(20, v.y); if(v.bulge) P(42, v.bulge); } };
      const just = t => ({ hj: t.ha === 'center' ? 1 : (t.ha === 'right' || t.ha === 'end') ? 2 : 0, vj: t.va === 'bottom' ? 1 : t.va === 'middle' ? 2 : t.va === 'top' ? 3 : 0 });
      const textBody = (t, val) => { const { hj, vj } = just(t); P(10, t.x); P(20, t.y); P(30, 0); P(40, t.h || 2.5); P(1, dxfStr(val)); if(t.rot) P(50, t.rot); if(t.xs && Math.abs(Math.abs(t.xs) - 1) > 1e-3) P(41, Math.abs(t.xs)); if(t.style && stUsed.has(t.style)) P(7, dxfStr(t.style)); if(t.xs < 0) P(71, 2); if(hj) P(72, hj); if(hj || vj){ P(11, t.x); P(21, t.y); P(31, 0); } return { hj, vj }; };
      if(e.att && o.inBlock && e.type === 'TEXT'){ head('ATTDEF', 'AcDbText'); const { vj } = textBody(e, e.text || ''); P(100, 'AcDbAttributeDefinition'); P(3, dxfStr(e.attp || e.att)); P(2, dxfStr(e.att)); P(70, 0); if(vj) P(74, vj); return; }
      switch(e.type){
        case 'LINE': head('LINE', 'AcDbLine'); P(10, e.x1); P(20, e.y1); P(30, 0); P(11, e.x2); P(21, e.y2); P(31, 0); break;
        case 'CIRCLE': head('CIRCLE', 'AcDbCircle'); P(10, e.cx); P(20, e.cy); P(30, 0); P(40, e.r); break;
        case 'ARC': head('ARC', 'AcDbCircle'); P(10, e.cx); P(20, e.cy); P(30, 0); P(40, e.r); P(100, 'AcDbArc'); P(50, e.a1); P(51, e.a2); break;
        case 'POINT': head('POINT', 'AcDbPoint'); P(10, e.x); P(20, e.y); P(30, 0); break;
        case 'POLYLINE': { if(e.pw && e.wq && e.wq.length){ const B = (A.bvOf && A.bvOf(e)) || e.vertices || []; if(B.length === e.pw.length && B.length >= 2){   // đa tuyến rộng dạng gốc: đỉnh + cung + độ rộng 40/41 từng đỉnh
              head('LWPOLYLINE', 'AcDbPolyline'); P(90, B.length); P(70, e.closed ? 1 : 0); B.forEach((v, k) => { P(10, v.x); P(20, v.y); P(40, e.pw[k][2] || 0); P(41, e.pw[k][3] || 0); if(v.bulge) P(42, v.bulge); }); break; } }
          if(e.wq && e.wq.length && (e.vertices || []).length >= 2){ widthPoly(e); break; } if(e.wipe && !o.inBlock && (e.vertices || []).length >= 3){ wipeout(e, head); break; } const bv = A.bvOf ? A.bvOf(e) : null; lwpoly(bv && bv.length >= 2 ? bv : (e.vertices || []), !!e.closed); break; }
        case 'IMAGE': try{ lwpoly(imgCorners(e), true); }catch(_){} break;
        case 'TEXT': {
          if(!e.text) break; const txt = String(e.text);
          if(txt.includes('\n') || e.mt){ const { hj, vj } = just(e); const ap = (vj === 3 ? 0 : vj === 2 ? 3 : 6) + (hj === 1 ? 2 : hj === 2 ? 3 : 1);
            head('MTEXT', 'AcDbMText'); P(10, e.x); P(20, e.y); P(30, 0); P(40, e.h || 2.5); P(41, 0); P(71, ap); P(72, 1); const s = mtStr(txt); for(let k = 0; k < s.length; k += 250){ const part = s.slice(k, k + 250); if(k + 250 < s.length) P(3, part); else P(1, part); } if(!s.length) P(1, '');
            if(e.style && stUsed.has(e.style)) P(7, dxfStr(e.style)); const r = (e.rot || 0) * D2R; P(11, Math.cos(r)); P(21, Math.sin(r)); P(31, 0); P(73, 1); P(44, 1); break; }
          head('TEXT', 'AcDbText'); const { vj } = textBody(e, txt); P(100, 'AcDbText'); if(vj) P(73, vj); break; }
        case 'SOLID': if(e.face){ const p = e.pts || []; if(p.length >= 3){ const zs = e.zs || []; head('3DFACE', 'AcDbFace'); for(let j = 0; j < 4; j++){ const q = p[Math.min(j, p.length - 1)]; P(10 + j, q.x); P(20 + j, q.y); P(30 + j, zs[Math.min(j, p.length - 1)] || 0); } } break; } { const p = e.pts || []; if(p.length >= 3){ head('SOLID', 'AcDbTrace'); P(10, p[0].x); P(20, p[0].y); P(30, 0); P(11, p[1].x); P(21, p[1].y); P(31, 0); P(12, p[2].x); P(22, p[2].y); P(32, 0); const q = p[3] || p[2]; P(13, q.x); P(23, q.y); P(33, 0); } break; }
        case 'ELLIPSE': { let p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; head('ELLIPSE', 'AcDbEllipse'); P(10, e.cx); P(20, e.cy); P(30, 0); P(11, e.mx); P(21, e.my); P(31, 0); P(210, 0); P(220, 0); P(230, 1); P(40, e.ratio || 1); P(41, p1); P(42, p2); break; }
        case 'XLINE': { const Lx = Math.hypot(e.dx, e.dy) || 1; head(e.ray ? 'RAY' : 'XLINE', e.ray ? 'AcDbRay' : 'AcDbXline'); P(10, e.x); P(20, e.y); P(30, 0); P(11, e.dx / Lx); P(21, e.dy / Lx); P(31, 0); break; }
        case 'HATCH': hatch(e, head); break;
        case 'SOLID3D': solid3d(e, head, ly, aci); break;
      }
      if(wrote && e.type !== 'SOLID3D') xd();
    }
    // vùng che: thực thể WIPEOUT (như IMAGE, khung cắt theo đa giác; toạ độ khung trong ô ảnh 1×1, trục Y hướng xuống)
    function wipeout(e, head){
      const V = e.vertices; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const q of V){ x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
      const W = Math.max(x1 - x0, 1e-9), Hh = Math.max(y1 - y0, 1e-9);
      head('WIPEOUT', 'AcDbWipeout'); P(90, 0); P(10, x0); P(20, y0); P(30, 0); P(11, W); P(21, 0); P(31, 0); P(12, 0); P(22, Hh); P(32, 0); P(13, 1); P(23, 1); P(340, '0'); P(70, 7); P(280, 1); P(281, 50); P(282, 50); P(283, 0); P(360, '0'); P(71, 2);
      P(91, V.length + 1); for(const q of V.concat([V[0]])){ P(14, (q.x - x0) / W - 0.5); P(24, 0.5 - (q.y - y0) / Hh); }
    }
    // HATCH thật: tô đặc, hoặc mẫu đường song song (ANSI31, ANSI32, ANSI37, NET, LINE, BRICK); mẫu khác ghi thành nét
    function patLines(e){ const P0 = (A.PATS || {})[e.pat]; if(!P0) return null; const sc = e.psc || 1, rot = (e.pang || 0); const out = [];
      const add = (aDeg, base, dpat, dash) => { const a = (aDeg + rot) * D2R, c = Math.cos(a), s = Math.sin(a); const r0 = rot * D2R, cr = Math.cos(r0), sr = Math.sin(r0);
        out.push({ a: aDeg + rot, bx: (base[0] * cr - base[1] * sr) * sc, by: (base[0] * sr + base[1] * cr) * sc, ox: (dpat[0] * c - dpat[1] * s) * sc, oy: (dpat[0] * s + dpat[1] * c) * sc, dash: (dash || []).map(v => v * sc) }); };
      if(P0.fam){ for(const f of P0.fam){ const a = f.a * D2R; const off = f.off || 0; add(f.a, [-Math.sin(a) * off, Math.cos(a) * off], [0, f.sp]); } return out; }
      if(P0.brick){ const h = P0.brick.h, w = P0.brick.w; add(0, [0, 0], [0, h]); add(90, [0, 0], [h, -w / 2], [h, -h]); return out; }
      if(P0.dots){ const S = P0.dots; add(0, [0, 0], [S / 2, S], [0, -S]); return out; }
      if(P0.earth){ const k = P0.earth / 6.35; for(const y of [0, 2.38125, 4.7625]) add(0, [0, y * k], [6.35 * k, 6.35 * k], [6.35 * k, -6.35 * k]); for(const x of [0.79375, 3.175, 5.55625]) add(90, [x * k, 5.55625 * k], [6.35 * k, 6.35 * k], [6.35 * k, -6.35 * k]); return out; }
      if(P0.conc){ const k = P0.conc / 6; // bê tông: các cạnh đá + chấm (gần đúng mẫu AR-CONC)
        add(50, [0, 0], [4.12975 * k, -5.89789 * k], [0.75 * k, -8.25 * k]); add(355, [0, 0], [-2.03781 * k, 7.37237 * k], [0.6 * k, -6.6 * k]); add(100.45144, [0.59772 * k, -0.05229 * k], [5.73059 * k, -6.93977 * k], [0.6374 * k, -7.01142 * k]);
        add(46.1842, [0, 2 * k], [6.19463 * k, -8.84684 * k], [1.125 * k, -12.375 * k]); add(96.63556, [0.88937 * k, 1.86207 * k], [8.59588 * k, -10.40965 * k], [0.95610 * k, -10.51713 * k]); add(351.18415, [0, 2 * k], [7.74307 * k, 11.05855 * k], [0.9 * k, -9.9 * k]);
        add(21, [1 * k, 1.5 * k], [4.95325 * k, -6.32394 * k], [0.75 * k, -8.25 * k]); add(326, [1 * k, 1.5 * k], [3.33355 * k, -7.81413 * k], [0.3 * k, -3.3 * k]); add(0, [0.3 * k, 0.4 * k], [2.4 * k, 1.7 * k], [0, -3.1 * k]); add(0, [1.9 * k, 2.6 * k], [2.9 * k, 1.3 * k], [0, -4.1 * k]); return out; }
      return null; }
    function hatch(e, head){
      const loops = (e.loops || []).filter(l => l.length >= 3); if(!loops.length) return; const solid = e.pat === 'SOLID' || (!e.pat && e.solid);
      const PL = solid ? null : patLines(e);
      if(!solid && !PL){ // mẫu ngẫu nhiên (DOTS, AR-CONC, EARTH…) → nét, như bản cũ
        const bb = entBBox(e); const r = bb && A.patternSegs ? A.patternSegs(e, bb, 20000) : null; if(!r) return; const o2 = { };
        for(const s of r.segs) for(const c of A.clipSegToLoops(s[0], s[1], s[2], s[3], loops)) emit({ type: 'LINE', x1: c[0], y1: c[1], x2: c[2], y2: c[3], layer: e.layer, col: e.col, bl: e.bl }, curOwner, o2);
        for(const d of r.dots) if(G.ptInLoops({ x: d[0], y: d[1] }, loops)) emit({ type: 'POINT', x: d[0], y: d[1], layer: e.layer, col: e.col, bl: e.bl }, curOwner, o2); return; }
      head('HATCH', 'AcDbHatch'); P(10, 0); P(20, 0); P(30, 0); P(210, 0); P(220, 0); P(230, 1); P(2, solid ? 'SOLID' : dxfStr(e.pat)); P(70, solid ? 1 : 0); P(71, 0); P(91, loops.length);
      loops.forEach((lp, i) => { P(92, i === 0 ? 3 : 2); P(72, 0); P(73, 1); P(93, lp.length); for(const q of lp){ P(10, q.x); P(20, q.y); } P(97, 0); });
      P(75, 0); P(76, 1); if(!solid){ P(52, e.pang || 0); P(41, e.psc || 1); P(77, 0); P(78, PL.length); for(const l of PL){ P(53, l.a); P(43, l.bx); P(44, l.by); P(45, l.ox); P(46, l.oy); P(79, l.dash.length); for(const d of l.dash) P(49, d); } }
      P(98, 0);
    }
    // khối 3D → mặt 3DFACE + XDATA thông số (mở lại trong DVDCAD vẫn là khối)
    function solid3d(e, head){
      const m = A.meshOf ? A.meshOf(e) : null; if(!m) return; const nf = m.i.length / 3; let xd = null;
      const d = {}; for(const k of ['k', 'pts', 'holes', 'z0', 'h', 'tri', 'cx', 'cy', 'r', 'r2', 'mat']) if(e[k] != null && !(e.k === 'mesh' && k === 'pts')) d[k] = e[k];
      let js = JSON.stringify(d, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v); if(js.length > 15000) js = JSON.stringify({ k: 'mesh', mat: e.mat }); xd = []; for(let k = 0; k < js.length; k += 240) xd.push(js.slice(k, k + 240));
      for(let t = 0; t < m.i.length; t += 3){ const q = [m.i[t], m.i[t + 1], m.i[t + 2], m.i[t + 2]]; head('3DFACE', 'AcDbFace'); q.forEach((ix, j) => { P(10 + j, m.p[ix * 3]); P(20 + j, m.p[ix * 3 + 1]); P(30 + j, m.p[ix * 3 + 2]); });
        if(t === 0){ P(1001, 'DVDCAD'); P(1000, 'S3D'); P(1071, nf); for(const c of xd) P(1000, c); } }
    }
    let curOwner = hBRmodel;
    // ---------- BLOCKS ----------
    P(0, 'SECTION'); P(2, 'BLOCKS');
    const blk = (hB, hE, hBR, name, flags, body) => { P(0, 'BLOCK'); P(5, hB); P(330, hBR); P(100, 'AcDbEntity'); P(8, '0'); P(100, 'AcDbBlockBegin'); P(2, name); P(70, flags); P(10, 0); P(20, 0); P(30, 0); P(3, name); P(1, ''); if(body){ curOwner = hBR; body(); curOwner = hBRmodel; } P(0, 'ENDBLK'); P(5, hE); P(330, hBR); P(100, 'AcDbEntity'); P(8, '0'); P(100, 'AcDbBlockEnd'); };
    blk(hBlkModel, hEndModel, hBRmodel, '*Model_Space', 0, null);
    blk(hBlkPaper, hEndPaper, hBRpaper, '*Paper_Space', 0, null);
    for(const D of blockDefs.values()) blk(D.hB, D.hE, D.hBR, dxfStr(D.name), D.atts.length ? 2 : 0, () => { for(const x of D.ents) emit(x, D.hBR, { inBlock: true }); });
    for(const d of dims.values()) blk(d.hB, d.hE, d.hBR, d.bn, 1, () => { for(const x of d.mem) emit(x, d.hBR, { dimBlock: true }); });
    P(0, 'ENDSEC');
    // ---------- ENTITIES ----------
    P(0, 'SECTION'); P(2, 'ENTITIES');
    for(const e of ents){ if(done.has(e)) continue; emit(e, hBRmodel); }
    for(const ins of inserts.values()){ const m = ins.m; const sx = Math.hypot(m.a, m.b), det = m.a * m.d - m.b * m.c, sy = det / (sx || 1), rot = Math.atan2(m.b, m.a) * R2D; const f = ins.mem[0];
      const lyn = dxfStr(String(m.lay || f.layer || '0')); const atts = ins.mem.filter(x => x.att && x.type === 'TEXT'); const hI = H();
      P(0, 'INSERT'); P(5, hI); P(330, hBRmodel); P(100, 'AcDbEntity'); P(8, lyn); P(100, 'AcDbBlockReference'); if(atts.length) P(66, 1); P(2, dxfStr(ins.D.name)); P(10, m.e); P(20, m.f); P(30, 0); if(Math.abs(sx - 1) > 1e-12) P(41, sx); if(Math.abs(sy - 1) > 1e-12) P(42, sy); if(Math.abs(sx - 1) > 1e-12 || Math.abs(sy - 1) > 1e-12) P(43, 1); if(Math.abs(rot) > 1e-12) P(50, rot);
      if(atts.length){ for(const a of atts){ const al = a.layer || '0'; const byL2 = a.bl || String(a.col || '').toLowerCase() === String(A.layerHex(al)).toLowerCase(); const { hj, vj } = { hj: a.ha === 'center' ? 1 : (a.ha === 'right' || a.ha === 'end') ? 2 : 0, vj: a.va === 'bottom' ? 1 : a.va === 'middle' ? 2 : a.va === 'top' ? 3 : 0 };
          P(0, 'ATTRIB'); P(5, H()); P(330, hI); P(100, 'AcDbEntity'); P(8, dxfStr(al)); if(!byL2) P(62, A.aciNear(a.col || '#ffffff')); P(100, 'AcDbText'); P(10, a.x); P(20, a.y); P(30, 0); P(40, a.h || 2.5); P(1, dxfStr(a.text || '')); if(a.rot) P(50, a.rot); if(hj) P(72, hj); if(hj || vj){ P(11, a.x); P(21, a.y); P(31, 0); }
          P(100, 'AcDbAttribute'); P(2, dxfStr(a.att)); P(70, 0); if(vj) P(74, vj); }
        P(0, 'SEQEND'); P(5, H()); P(330, hI); P(100, 'AcDbEntity'); P(8, lyn); } }
    for(const d of dims.values()){ const t = d.t, D = t.dimd; const lyn = dxfStr(String(t.layer || '0'));
      P(0, 'DIMENSION'); P(5, H()); P(330, hBRmodel); P(100, 'AcDbEntity'); P(8, lyn); P(100, 'AcDbDimension'); P(2, d.bn);
      const common = (p10, type) => { P(10, p10.x); P(20, p10.y); P(30, 0); P(11, t.x); P(21, t.y); P(31, 0); P(70, 32 + type); if(D.ov) P(1, dxfStr(D.ov)); P(3, 'Standard'); };
      if(D.k === 'lin'){ const ph = (D.phi || 0) * D2R, ux = Math.cos(ph), uy = Math.sin(ph), nx = -uy, ny = ux; const d2 = (D.L.x - D.p2.x) * nx + (D.L.y - D.p2.y) * ny;
        common({ x: D.p2.x + nx * d2, y: D.p2.y + ny * d2 }, 0); P(100, 'AcDbAlignedDimension'); P(13, D.p1.x); P(23, D.p1.y); P(33, 0); P(14, D.p2.x); P(24, D.p2.y); P(34, 0); P(50, D.phi || 0); P(100, 'AcDbRotatedDimension'); }
      else if(D.k === 'ang'){ const R = Math.max(Math.hypot(D.L.x - D.V.x, D.L.y - D.V.y), 1e-9); const aL = Math.atan2(D.L.y - D.V.y, D.L.x - D.V.x); let r1 = D.d1, sw = 0;
        for(const [u1, u2] of [[D.d1, D.d2], [D.d2, D.d1]]) for(const a1 of [u1, u1 + Math.PI]) for(const a2 of [u2, u2 + Math.PI]){ const w = G.norm(a2 - a1); if(w < 1e-9 || w > Math.PI) continue; if(G.norm(aL - a1) <= w && !sw){ r1 = a1; sw = w; } }
        common(D.L, 5); P(100, 'AcDb3PointAngularDimension'); P(13, D.V.x + Math.cos(r1) * R); P(23, D.V.y + Math.sin(r1) * R); P(33, 0); P(14, D.V.x + Math.cos(r1 + sw) * R); P(24, D.V.y + Math.sin(r1 + sw) * R); P(34, 0); P(15, D.V.x); P(25, D.V.y); P(35, 0); }
      else { const ux0 = D.L.x - D.c.x, uy0 = D.L.y - D.c.y, L0 = Math.hypot(ux0, uy0) || 1, ux = ux0 / L0, uy = uy0 / L0; const q = { x: D.c.x + ux * D.r, y: D.c.y + uy * D.r };
        if(D.k === 'rad'){ common(D.c, 4); P(100, 'AcDbRadialDimension'); P(15, q.x); P(25, q.y); P(35, 0); P(40, Math.abs(L0 - D.r)); }
        else { common({ x: D.c.x - ux * D.r, y: D.c.y - uy * D.r }, 3); P(100, 'AcDbDiametricDimension'); P(15, q.x); P(25, q.y); P(35, 0); P(40, 0); } } }
    P(0, 'ENDSEC');
    // ---------- OBJECTS ----------
    P(0, 'SECTION'); P(2, 'OBJECTS');
    const dict = (h, owner, entries, hard) => { P(0, 'DICTIONARY'); P(5, h); if(owner !== '0'){ P(102, '{ACAD_REACTORS'); P(330, owner); P(102, '}'); } P(330, owner); P(100, 'AcDbDictionary'); if(hard) P(280, 1); P(281, 1); for(const [k, v] of entries){ P(3, k); P(350, v); } };
    const hWv = hasWipe ? H() : null; const xdat = dvdData(ents); const hXr = xdat ? H() : null;
    const rootE = [['ACAD_GROUP', hGroupD], ['ACAD_LAYOUT', hLayoutD], ['ACAD_MLINESTYLE', hMlsD], ['ACAD_PLOTSETTINGS', hPsetD], ['ACAD_PLOTSTYLENAME', hPsnD]]; if(hWv) rootE.push(['ACAD_WIPEOUT_VARS', hWv]); if(hXr) rootE.push(['DVDCAD_DATA', hXr]);
    if(N7) rootE.push(['ACAD_COLOR', N7.color], ['ACAD_MATERIAL', N7.mat], ['ACAD_MLEADERSTYLE', N7.mlds], ['ACAD_SCALELIST', N7.scl], ['ACAD_TABLESTYLE', N7.tbs], ['ACAD_VISUALSTYLE', N7.vis]);
    rootE.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    dict(hRoot, '0', rootE);
    if(hWv){ P(0, 'WIPEOUTVARIABLES'); P(5, hWv); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbWipeoutVariables'); P(70, (typeof WIPEFRAME !== 'undefined' && WIPEFRAME === 0) ? 0 : 1); }
    if(hXr){ P(0, 'XRECORD'); P(5, hXr); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbXrecord'); P(280, 1); P(1, 'DVDCAD1'); for(let k = 0; k < xdat.length; k += 240) P(300, xdat.slice(k, k + 240)); }
    dict(hGroupD, hRoot, []);
    dict(hLayoutD, hRoot, [['Layout1', hLayPaper], ['Model', hLayModel]]);
    dict(hMlsD, hRoot, [['Standard', hMlsStd]]);
    dict(hPsetD, hRoot, []);
    P(0, 'ACDBDICTIONARYWDFLT'); P(5, hPsnD); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbDictionary'); P(281, 1); P(3, 'Normal'); P(350, hPsnNormal); P(100, 'AcDbDictionaryWithDefault'); P(340, hPsnNormal);
    P(0, 'ACDBPLACEHOLDER'); P(5, hPsnNormal); P(102, '{ACAD_REACTORS'); P(330, hPsnD); P(102, '}'); P(330, hPsnD);
    P(0, 'MLINESTYLE'); P(5, hMlsStd); P(102, '{ACAD_REACTORS'); P(330, hMlsD); P(102, '}'); P(330, hMlsD); P(100, 'AcDbMlineStyle'); P(2, 'Standard'); P(70, 0); P(3, ''); P(62, 256); P(51, 90); P(52, 90); P(71, 2); P(49, 0.5); P(62, 256); P(6, 'BYLAYER'); P(49, -0.5); P(62, 256); P(6, 'BYLAYER');
    const layout = (h, name, flags, tab, br) => { P(0, 'LAYOUT'); P(5, h); P(102, '{ACAD_REACTORS'); P(330, hLayoutD); P(102, '}'); P(330, hLayoutD);
      P(100, 'AcDbPlotSettings'); P(1, ''); P(2, 'none_device'); P(4, ''); P(6, ''); P(40, 0); P(41, 0); P(42, 0); P(43, 0); P(44, 0); P(45, 0); P(46, 0); P(47, 0); P(48, 0); P(49, 0); P(140, 0); P(141, 0); P(142, 1); P(143, 1); P(70, name === 'Model' ? 1712 : 688); P(72, 1); P(73, 0); P(74, 5); P(7, ''); P(75, 16); P(147, 1); P(148, 0); P(149, 0);
      P(100, 'AcDbLayout'); P(1, name); P(70, flags); P(71, tab); P(10, 0); P(20, 0); P(11, 420); P(21, 297); P(12, 0); P(22, 0); P(32, 0); P(14, ext.x0); P(24, ext.y0); P(34, 0); P(15, ext.x1); P(25, ext.y1); P(35, 0); P(146, 0); P(13, 0); P(23, 0); P(33, 0); P(16, 1); P(26, 0); P(36, 0); P(17, 0); P(27, 1); P(37, 0); P(76, 0); P(330, br); };
    layout(hLayModel, 'Model', 1, 0, hBRmodel); layout(hLayPaper, 'Layout1', 1, 1, hBRpaper);
    if(N7){ dict(N7.color, hRoot, []); dict(N7.tbs, hRoot, []); dict(N7.vis, hRoot, []);
      dict(N7.mat, hRoot, [['ByBlock', N7.mByBlock], ['ByLayer', N7.mByLayer], ['Global', N7.mGlobal]]);
      const material = (h, name) => { P(0, 'MATERIAL'); P(5, h); P(102, '{ACAD_REACTORS'); P(330, N7.mat); P(102, '}'); P(330, N7.mat); P(100, 'AcDbMaterial'); P(1, name); P(2, '');
        P(70, 0); P(40, 1); P(71, 1); P(41, 1); P(91, -1023410177); P(42, 1); P(72, 1); P(3, ''); P(73, 1); P(74, 1); P(75, 1); P(44, 0.5); P(73, 0); P(45, 1); P(46, 1); P(77, 1); P(4, ''); P(78, 1); P(79, 1); P(170, 1); P(48, 1); P(171, 1); P(6, '');
        P(172, 1); P(173, 1); P(174, 1); P(140, 1); P(141, 1); P(175, 1); P(7, ''); P(176, 1); P(177, 1); P(178, 1); P(143, 1); P(179, 1); P(8, ''); P(270, 1); P(271, 1); P(272, 1); P(145, 1); P(146, 1); P(273, 1); P(9, ''); P(274, 1); P(275, 1); P(276, 1);
        P(42, 1); P(72, 1); P(3, ''); P(73, 1); P(74, 1); P(75, 1); P(94, 63); };
      material(N7.mByBlock, 'ByBlock'); material(N7.mByLayer, 'ByLayer'); material(N7.mGlobal, 'Global');
      dict(N7.mlds, hRoot, [['Standard', N7.mldStd]]);
      P(0, 'MLEADERSTYLE'); P(5, N7.mldStd); P(102, '{ACAD_REACTORS'); P(330, N7.mlds); P(102, '}'); P(330, N7.mlds); P(100, 'AcDbMLeaderStyle'); P(179, 2); P(170, 2); P(171, 1); P(172, 0); P(90, 2); P(40, 0); P(41, 0); P(173, 1); P(91, -1056964608); P(92, -2); P(290, 1); P(42, 2); P(291, 1); P(43, 8);
      P(3, 'Standard'); P(44, dt); P(300, ''); P(342, hStStd); P(174, 1); P(175, 1); P(176, 0); P(178, 1); P(93, -1056964608); P(45, dt); P(292, 0); P(297, 0); P(46, dt); P(94, -1056964608); P(47, 1); P(49, 1); P(140, 1); P(294, 1); P(141, 0); P(177, 0); P(142, 1); P(295, 0); P(296, 0); P(143, 3.75); P(271, 0); P(272, 9); P(273, 9);
      dict(N7.scl, hRoot, [['A0', N7.sc11]]);
      P(0, 'SCALE'); P(5, N7.sc11); P(102, '{ACAD_REACTORS'); P(330, N7.scl); P(102, '}'); P(330, N7.scl); P(100, 'AcDbScale'); P(70, 0); P(300, '1:1'); P(140, 1); P(141, 1); P(290, 1); }
    P(0, 'ENDSEC'); P(0, 'EOF');
    L[seedAt] = hseq.toString(16).toUpperCase();
    return L.join('\r\n') + '\r\n';
  }
  A.dxfR2000 = writeR2000;
  // lệnh chọn phiên bản DXF khi lưu
  DVDCmd.register(['DXFVERSION', 'DXFVER', 'PHIENBANDXF'], 'Phiên bản DXF khi lưu: 2018 (mặc định), 2013, 2010, 2007, 2004, 2000, Tự động (2000/2004), R12 (phần mềm cũ)', () => A.run('DXFVERSION', async () => {
    const lab = { R2018: 'DXF 2018', R2013: 'DXF 2013', R2010: 'DXF 2010', R2007: 'DXF 2007', R2004: 'DXF 2004', R2000: 'DXF 2000', AUTO: 'Tự động (2000/2004)', R12: 'R12 (cũ)' };
    const r = await A.getKw('Lưu DXF theo phiên bản', { kw: [{ k: '2018', t: '2018 (mặc định)' }, { k: '2013', t: '2013' }, { k: '2010', t: '2010' }, { k: '2007', t: '2007' }, { k: '2004', t: '2004' }, { k: '2000', t: '2000' }, { k: 'T', t: 'Tự động 2000/2004' }, { k: 'R12', t: 'R12 (cũ)' }], def: lab[A.dxfVer] || 'DXF 2018' });
    if(r.kw) A.setDxfVer(r.kw === 'R12' ? 'R12' : r.kw === 'T' ? 'AUTO' : 'R' + r.kw); A.log('Lưu DXF: ' + (lab[A.dxfVer] || A.dxfVer));
  }), { engine: true });
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
