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
  const XKEYS = ['cid', 'dord', 'anno', 'fld', 'url', 'urld', 'urlsub', 'ascl', 'gns', 'gdsc', 'dyn', 'dvs', 'mt', 'rt', 'rtx', 'cols', 'mtp', 'mtwk', 'dvw', 'gmk', 'shp', 'shpx'];   // dvw: thuộc hình chiếu (VIEWBASE…)   // rt / cols: chữ có định dạng, cột (đọc lại đúng trong DVDCAD)

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
  function dvdData(ents, full){
    const o = {}; try{ const cons = A.constraints ? A.constraints() : []; if(cons && cons.length) o.cons = cons; }catch(_){}
    if(full) try{ const L = A.userLayoutDefs ? A.userLayoutDefs() : []; const live = new Set((typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).filter(x => x && x.user).map(x => x.name)); const keep = L.filter(D => D && !D.gone && live.has(D.name)).map(D => { const X = dwgLayouts.find(x => x && x.user && x.name === D.name); return Object.assign({}, D, { vps: (D.vps || []).map((v, k) => { let vx = null; try{ vx = window.vpExtra ? window.vpExtra(X, k) : null; }catch(_){} return vx ? Object.assign({}, v, { vx }) : v; }) }); }); if(keep.length) o.lay = keep; }catch(_){}   // layout DVDCAD (khung tên, khung nhìn, đối tượng giấy) — mở lại sửa tiếp được
    if(full) try{ const g = A.geoGet ? A.geoGet() : null; if(g) o.geo = g; }catch(_){}
    try{ const im = {}; for(const e of ents) if(e.type === 'IMAGE' && e.img && !im[e.img] && A.imgDataURL){ const u = A.imgDataURL(e.img); if(u) im[e.img] = u; } if(Object.keys(im).length) o.imgs = im; }catch(_){}   // dữ liệu ảnh nhúng (IMAGEATTACH, GEOMAPIMAGE)   // vị trí địa lý (cả hệ toạ độ, điểm thiết kế, bản đồ nền)
    try{ const D = A.dynDefs ? A.dynDefs() : null; if(D){ const names = new Set(); for(const e of ents){ if(e.blk) names.add(e.blk); if(e.bm && e.bm.name) names.add(e.bm.name); } const dd = {}; for(const n of names) if(D[n]) dd[n] = D[n]; if(Object.keys(dd).length) o.dyn = dd; } }catch(_){}
    try{ const V = A.dviewsGet ? A.dviewsGet() : null; if(V && ents.some(e => e.dvw != null)) o.dvw = V; }catch(_){}
    if(full) try{ const U = A.pageSetups ? A.pageSetups() : null; if(U && Object.keys(U).length) o.psu = U; }catch(_){}   // thiết lập trang có tên (PAGESETUP / PSETUPIN)   // thông số hình chiếu (Model Documentation)
    return Object.keys(o).length ? JSON.stringify(o) : null;
  }
  // mở lại: áp dữ liệu DVDCAD (trước khi các mô-đun nạp ràng buộc)
  A.onLoad = (function(prev){ return function(){ try{ const d = window._dvdXData; window._dvdXData = null; if(d){ const o = JSON.parse(d); const nm = (typeof currentName !== 'undefined' && currentName) || '';
        if(o.cons && o.cons.length) localStorage.setItem('dvd:cons::' + nm, JSON.stringify(o.cons));
        if(o.dyn && A.dynDefs){ Object.assign(A.dynDefs(), o.dyn); try{ localStorage.setItem('dvd:dynblk', JSON.stringify(A.dynDefs())); }catch(_){} }
        if(o.lay && o.lay.length && A.seedLayoutDefs) A.seedLayoutDefs(o.lay);
        if(o.geo && A.geoSet) A._geoFromFile = o.geo;
        if(o.dvw) A._dvwFromFile = o.dvw;
        if(o.psu && typeof o.psu === 'object') try{ localStorage.setItem('dvd:psetups::' + nm, JSON.stringify(o.psu)); }catch(_){}
        if(o.imgs && A.imgPut) for(const [id, u] of Object.entries(o.imgs)) fetch(u).then(r => r.blob()).then(b => A.imgPut(id, b)).then(() => { try{ draw(); }catch(_){} }).catch(() => {}); } }catch(err){ console.warn(err); }
      // khung đa tuyến mang thông số ảnh (imgx) → ảnh IMAGE như trước khi lưu
      try{ if(typeof modelEntities !== 'undefined') for(const e of modelEntities){ if((e.type !== 'POLYLINE' && e.type !== 'IMAGE') || !e.imgx) continue; const q = e.imgx; delete e.imgx; delete e.vertices; delete e.closed; delete e.bulges; e.type = 'IMAGE'; Object.assign(e, q); } }catch(_){}
      // ảnh IMAGE của AutoCAD (IMAGEDEF trỏ tệp ảnh): bản Windows đọc tệp trong thư mục bản vẽ; bản web dùng ảnh đã nạp trước đó (nếu có)
      try{ const R = typeof _imgRefs !== 'undefined' ? _imgRefs.splice(0) : []; const used = new Set((typeof modelEntities !== 'undefined' ? modelEntities : []).filter(e => e.type === 'IMAGE' && e.img).map(e => e.img)), seen = new Set();
        const D = window.dvdDesktop; for(const r of R){ if(!used.has(r.id) || seen.has(r.id) || !r.base || !D || !D.readSide || !A.imgPut) continue; seen.add(r.id);
          D.readSide(r.base, r.file).then(f => f ? A.imgPut(r.id, new Blob([f.data])) : null).then(el => { if(el) try{ draw(); }catch(_){} }).catch(() => {}); } }catch(_){}
      if(prev) prev(); }; })(A.onLoad);
  function writeR2000(ents, opt){
    const full = !!(opt && opt.layouts) || (typeof modelEntities !== 'undefined' && ents === modelEntities);   // lưu cả bản vẽ → ghi kèm các layout giấy
    ents = ents.filter(e => e && !e.xr && (!e.vh || e.dvs || e.ull));   // nét ẩn của khối động (trạng thái hiển thị khác) vẫn ghi — cờ ẩn 60
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
    // vị trí địa lý (R2010+): đối tượng GEODATA trong từ điển mở rộng ACAD_GEOGRAPHICDATA của *Model_Space (như AutoCAD)
    const geo = yr >= 2010 && A.geoGet ? A.geoGet() : null, hGeoD = geo ? H() : null, hGeo = geo ? H() : null;
    // ---------- layout giấy: đối tượng giấy + khung nhìn → *Paper_Space (layout đầu, trong ENTITIES với mã 67) / khối *Paper_SpaceN ----------
    const lays = (() => { let PL = []; if(full) try{ PL = (typeof dwgLayouts !== 'undefined' ? dwgLayouts : []).filter(x => x && !x.isModel && x.paper && !x.hidden); }catch(_){}
      return PL.map((X, i) => { const D = X.user ? X.def : null; let r = null;
        const list = (X.paper.paperPrims || []).filter(e => e && !e.vpf && !e.xr && !e.vh && !e.xh);
        if(D && D.size){ const o = D.org || [0, 0]; r = { x0: o[0], y0: o[1], x1: o[0] + D.size[0], y1: o[1] + D.size[1] }; } else if(X.paper.lim) r = X.paper.lim;
        if(!r){ const b = bbox(list); r = b ? { x0: b.x0 - 10, y0: b.y0 - 10, x1: b.x1 + 10, y1: b.y1 + 10 } : { x0: 0, y0: 0, x1: 420, y1: 297 }; }
        const vxOf = k => { try{ return window.vpExtra ? window.vpExtra(X, k) : null; }catch(_){ return null; } };   // VPLAYER (lớp đóng băng riêng), VPCLIP (đa giác cắt)
        return { name: String(X.name || ('Layout' + (i + 1))), tab: i + 1, ents: list, vps: (X.paper.viewports || []).map((v, k) => v && v.w > 0 && v.h > 0 && v.vh > 0 ? Object.assign({}, v, { vx: vxOf(k) }) : null).filter(Boolean), sheet: r,
          hLay: i ? H() : hLayPaper, hBR: i ? H() : hBRpaper, hB: i ? H() : hBlkPaper, hE: i ? H() : hEndPaper, bn: i ? '*Paper_Space' + (i - 1) : '*Paper_Space', hVp: H() }; }); })();
    // thiết lập trang có tên (PAGESETUP / PSETUPIN) → PLOTSETTINGS trong ACAD_PLOTSETTINGS: AutoCAD thấy trong Page Setup Manager
    const psets = (() => { if(!full) return []; let U = {}; try{ U = (A.pageSetups && A.pageSetups()) || {}; }catch(_){} const seen = new Set(), out = [];
      for(const k of Object.keys(U)){ const nm = String(k).replace(/[<>\/\\":;?*|,=`]/g, '').trim(); if(!nm || seen.has(nm.toUpperCase()) || !U[k]) continue; seen.add(nm.toUpperCase()); out.push({ name: nm, P: U[k], h: H() }); } return out; })();
    if(!lays.length) lays.push({ name: 'Layout1', tab: 1, ents: [], vps: [], sheet: null, hLay: hLayPaper, hBR: hBRpaper, hB: hBlkPaper, hE: hEndPaper, bn: '*Paper_Space', hVp: null });
    const scanE = ents.concat(...lays.map(l => l.ents));
    // ---------- lớp / kiểu nét / kiểu chữ ----------
    const layers = new Set(['0']); for(const n of A.layerNames()) if(!String(n).includes('|')) layers.add(n); for(const e of scanE) layers.add(String(e.layer || '0')); for(const Lp of lays) for(const v of Lp.vps) for(const n of (v.vx && v.vx.frz) || []) if(!String(n).includes('|')) layers.add(String(n));
    const ltUsed = new Set(); for(const ly of layers){ const v = A.layerLT(ly); if(v && !/^(CONTINUOUS|BYLAYER|BYBLOCK)$/i.test(v)) ltUsed.add(String(v).toUpperCase()); }
    for(const e of scanE) if(e.lt && !/^(CONTINUOUS|BYBLOCK|BYLAYER)$/i.test(e.lt)) ltUsed.add(String(e.lt).toUpperCase());
    const ltDefs = [...ltUsed].map(n => { const d = A.ltDefOf(n) || (window.LTYPES && LTYPES[n]); return d && d.pat && d.pat.length ? { n, d, h: H() } : null; }).filter(Boolean);
    const ltOk = new Set(ltDefs.map(x => x.n));
    const hLtByBlock = H(), hLtByLayer = H(), hLtCont = H();
    const stUsed = new Map(); for(const e of scanE){ if(e.type !== 'TEXT' || !e.style || !e.ff || stUsed.has(e.style) || String(e.style).toUpperCase() === 'STANDARD') continue;
      if(/\.shx$/i.test(e.ff)) stUsed.set(e.style, { f: String(e.ff).toLowerCase(), b: e.ffb && /\.shx$/i.test(e.ffb) ? String(e.ffb).toLowerCase() : '', h: H() });   // phông SHX (+ bigfont)
      else if(A.FONT_FILE && A.FONT_FILE[e.ff]) stUsed.set(e.style, { f: A.FONT_FILE[e.ff], h: H() }); }
    const hStStd = H(); const needShx = ltDefs.some(x => (x.d.txt || []).some(t => t.sh)); const hStShx = needShx ? H() : null;
    const hApAcad = H(), hApDvd = H(), hDsStd = H(), hVpAct = H();
    const layH = new Map(); for(const ly of layers) layH.set(ly, H());
    // ảnh (IMAGEATTACH, GEOMAPIMAGE…): thực thể IMAGE + IMAGEDEF như AutoCAD, trỏ tới tệp ".\tên.jpg" cạnh bản vẽ
    // (bản Windows ghi kèm tệp ảnh khi lưu — A.lastImgFiles; ETRANSMIT đóng gói cùng tên); ảnh chưa nạp xong → chỉ khung như trước
    const imgDefs = new Map(); A.lastImgFiles = [];
    for(const e of ents){ if(e.type !== 'IMAGE' || !e.img || imgDefs.has(e.img) || !A.imgFile || !(e.w > 0 && e.h > 0)) continue; let f = null; try{ f = A.imgFile(e.img, e.name); }catch(_){} if(!f) continue;
      let nm = f.name, k = 1; while([...imgDefs.values()].some(D => D.name.toLowerCase() === nm.toLowerCase())) nm = f.name.replace(/(\.[^.]+)$/, '_' + (++k) + '$1');
      imgDefs.set(e.img, { h: H(), name: nm, key: nm.replace(/\.[^.]+$/, ''), pw: f.w, ph: f.h, px: e.w / f.w, png: f.png, rs: [] }); A.lastImgFiles.push({ id: e.img, name: nm, url: f.url }); }
    // ---------- khối, kích thước (như bản R12) ----------
    const byGrp = new Map(); for(const e of ents) if(e.grp){ let a = byGrp.get(e.grp); if(!a){ a = []; byGrp.set(e.grp, a); } a.push(e); }
    const grpCnt = new Map(); if(byGrp.size) for(const x of modelEntities) if(x.grp && byGrp.has(x.grp)) grpCnt.set(x.grp, (grpCnt.get(x.grp) || 0) + 1);
    const grpAll = gid => { const a = byGrp.get(gid) || []; const n = grpCnt.get(gid) || 0; return a.length === n || n === 0 ? a : null; };
    const inv = m => { const det = m.a * m.d - m.b * m.c; if(Math.abs(det) < 1e-300) return null; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; };
    const clone = o => JSON.parse(JSON.stringify(o));
    const blockDefs = new Map(), blockFam = new Map(), inserts = new Map(), dims = new Map(); const done = new Set();
    // khối động (như AutoCAD): khối gốc ở trạng thái mặc định chứa mọi nét (nét ngoài trạng thái mặc định có cờ ẩn), mỗi bản chèn trỏ tới khối ẩn danh *U
    // là bản sao đủ nét theo trạng thái của nó; R2007+: liên kết AcDbBlockRepETag / BTag + AcDbRepData, R2018: thêm đồ thị đánh giá + tham số hiển thị
    const DYN = A.dynDefs ? A.dynDefs() : null, dynBase = new Map(); let nU = 0; const DYNX = yr >= 2007, DYNG = yr >= 2018;
    const bnm = n => String(n).replace(/[<>\\/":;?*|=`]/g, '_').slice(0, 250);
    const guidOf = n => { const t = [0, 1, 2, 3].map(r => { let h = (0x811c9dc5 ^ Math.imul(r + 1, 0x9e3779b9)) >>> 0; for(const c of String(n)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).toUpperCase().padStart(8, '0'); }).join('');
      return '{' + t.slice(0, 8) + '-' + t.slice(8, 12) + '-' + t.slice(12, 16) + '-' + t.slice(16, 20) + '-' + t.slice(20, 32) + '}'; };   // GUID ổn định theo tên khối
    // đồ thị đánh giá của khối động (R2018, như AutoCAD): nút = tham số / grip / thành phần vị trí grip / hành động, cạnh theo thứ tự AutoCAD ghi
    //   hiển thị: grip → tham số → UpdatedX / UpdatedY
    //   kéo giãn: tham số tuyến tính (gốc cố định, grip ở điểm cuối) → UpdatedEndX / Y + hành động STRETCH, khung = nửa phía điểm cuối (t > L0/2) như DVDCAD
    //   lật: tham số lật (trục qua gốc khối: dọc = lật ngang, ngang = lật dọc) → UpdatedBaseX / Y, UpdatedFlip + hành động FLIP chọn mọi nét
    //        và các tham số / hành động khác (như khối Door của AutoCAD), FLIP → STRETCH để khung kéo giãn lật theo
    const LOC = 'BLOCKGRIPLOCATIONCOMPONENT';
    const stretchPts = x => { switch(x.type){   // các điểm kéo giãn (thứ tự đỉnh như nét LINE / LWPOLYLINE ghi ra)
      case 'LINE': return [{ x: x.x1, y: x.y1 }, { x: x.x2, y: x.y2 }];
      case 'POLYLINE': { if(x.wq && x.wq.length && !(x.pw && x.pw.length)){ const V = x.vertices || []; let n = V.length; if(!x.closed && n > 2 && Math.hypot(V[0].x - V[n - 1].x, V[0].y - V[n - 1].y) < 1e-9) n--; return V.slice(0, n); }
        const bv = A.bvOf ? A.bvOf(x) : null; return bv && bv.length >= 2 ? bv : (x.vertices || []); } }
      return null; };
    function dynGraph(B, d){
      const vis = d.vis && d.vis.states && d.vis.states.length ? d.vis : null, lins = (d.lin || []).filter(p => p && p.b && p.d && p.L0 > 1e-12), bb = B.bb;
      if(!vis && !lins.length && !d.flip) return null;
      const G = { hXD: H(), hG: H(), hPP: H(), N: [], E: [], vis: null, lin: [], flip: [] };
      const node = (t, o) => { const n = Object.assign({ t, h: H(), i: G.N.length, id: G.N.length + 1 }, o || {}); G.N.push(n); return n; };
      const edge = (a, b, tc) => G.E.push([a.i, b.i, tc]);
      const W = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0, 1e-6), pad = W * 0.02 + 1e-6;
      if(vis){ const P = node('BLOCKVISIBILITYPARAMETER'), Gr = node('BLOCKVISIBILITYGRIP'), Lx = node(LOC, { nm: 'UpdatedX', of: P }), Ly = node(LOC, { nm: 'UpdatedY', of: P });
        G.vis = { P, Gr, Lx, Ly, states: vis.states.slice(), def: vis.def || vis.states[0], pt: { x: bb.x0, y: bb.y1 } }; edge(Gr, P, 1); edge(P, Lx, 1); edge(P, Ly, 1); }
      for(const p of lins){ const P = node('BLOCKLINEARPARAMETER'), Gr = node('BLOCKLINEARGRIP'), Ex = node(LOC, { nm: 'UpdatedEndX', of: P }), Ey = node(LOC, { nm: 'UpdatedEndY', of: P });
        const ux = p.d.x, uy = p.d.y, tm = p.L0 / 2, T = q => (q.x - p.b.x) * ux + (q.y - p.b.y) * uy, Sd = q => (q.y - p.b.y) * ux - (q.x - p.b.x) * uy;
        const cs = [{ x: bb.x0, y: bb.y0 }, { x: bb.x1, y: bb.y0 }, { x: bb.x1, y: bb.y1 }, { x: bb.x0, y: bb.y1 }];
        const t1 = Math.max(p.L0, ...cs.map(T)) + pad, s0 = Math.min(0, ...cs.map(Sd)) - pad, s1 = Math.max(0, ...cs.map(Sd)) + pad;
        const at = (t, s) => ({ x: p.b.x + ux * t - uy * s, y: p.b.y + uy * t + ux * s });
        const ax = Math.abs(ux) < 1e-9 || Math.abs(uy) < 1e-9, fr = ax ? [at(tm, s0), at(t1, s1)] : [at(tm, s0), at(t1, s0), at(t1, s1), at(tm, s1)];   // trục song song X / Y: khung chữ nhật 2 góc
        const sel = [];   // LINE / LWPOLYLINE: các đỉnh nằm trong khung (dời từng đỉnh); loại khác: chỉ khi nằm trọn trong khung (dời cả nét)
        for(const x of B.ents){ const pts = stretchPts(x);
          if(pts){ const idx = []; pts.forEach((q, k) => { if(T(q) > tm + 1e-9) idx.push(k); }); if(idx.length) sel.push({ x, idx }); continue; }
          let b2 = null; try{ b2 = entBBox(x); }catch(_){} if(b2 && Math.min(...[{ x: b2.x0, y: b2.y0 }, { x: b2.x1, y: b2.y0 }, { x: b2.x1, y: b2.y1 }, { x: b2.x0, y: b2.y1 }].map(T)) > tm + 1e-9) sel.push({ x, idx: null }); }
        const e = at(p.L0, 0), L = { p, P, Gr, Ex, Ey, nm: String(p.name || 'Distance' + (G.lin.length + 1)), b: { x: p.b.x, y: p.b.y }, e, fr, sel, S: null };
        edge(P, Ex, 1); edge(P, Ey, 1); edge(Gr, P, 2); G.lin.push(L); }
      if(d.flip) for(const ax of ['x', 'y']){ const P = node('BLOCKFLIPPARAMETER'), Gr = node('BLOCKFLIPGRIP'), UF = node(LOC, { nm: 'UpdatedFlip', of: P, v70: 1 }), UBx = node(LOC, { nm: 'UpdatedBaseX', of: P }), UBy = node(LOC, { nm: 'UpdatedBaseY', of: P });
        let b, e; if(ax === 'x'){ b = { x: 0, y: bb.y0 }; e = { x: 0, y: bb.y1 > bb.y0 + 1e-9 ? bb.y1 : bb.y0 + 1 }; } else { b = { x: bb.x0, y: 0 }; e = { x: bb.x1 > bb.x0 + 1e-9 ? bb.x1 : bb.x0 + 1, y: 0 }; }
        const k = G.flip.length + 1; G.flip.push({ ax, P, Gr, UF, UBx, UBy, b, e, nm: 'Flip' + (k > 1 ? k : ''), label: 'Flip state' + k, anm: 'Flip' + k });
        edge(P, UBx, 1); edge(P, UBy, 1); edge(P, UF, 1); edge(Gr, P, 1); }
      for(const L of G.lin) if(L.sel.length){ L.S = node('BLOCKSTRETCHACTION'); L.snm = 'Stretch' + (G.lin.indexOf(L) + 1); edge(L.P, L.S, 2); }
      for(const F of G.flip){ F.A = node('BLOCKFLIPACTION'); edge(F.P, F.A, 4); for(const L of G.lin) if(L.S) edge(F.A, L.S, 1); }
      return G; }
    if(ents.length < 200000) for(const [gid] of byGrp){
      const mem = grpAll(gid); if(!mem || !mem.length) continue; const f = mem[0];
      const xR = (() => { const q = mem.find(x => x.xcl); return q && typeof XCLIPS !== 'undefined' ? XCLIPS.get(q.xcl) : null; })();   // XCLIP: ghi đủ khối + SPATIAL_FILTER
      if(f.bm && f.bm.name && DYN && A.dynStateCopy && A.dynIsDyn && A.dynIsDyn(f.bm.name) && !String(f.blk || '').startsWith('*') && !xR && !mem.some(x => x.type === 'SOLID3D' || x.type === 'IMAGE') && mem.every(x => x.bm && x.bm.name === f.bm.name)){
        // bản chèn đang lật: INSERT ghi không lật, hình đã lật nằm trong *U (như AutoCAD); XDATA dfl để DVDCAD dựng lại ma trận khối
        const st0 = (mem.find(x => x.dyn) || {}).dyn || null, dd = DYN[f.bm.name], sx = dd.flip && st0 && st0.fx ? -1 : 1, sy = dd.flip && st0 && st0.fy ? -1 : 1;
        const m1 = sx < 0 || sy < 0 ? Object.assign({}, f.bm, { a: f.bm.a * sx, b: f.bm.b * sx, c: f.bm.c * sy, d: f.bm.d * sy }) : f.bm;
        const Mi = inv(m1), nm = bnm(f.bm.name);
        if(Mi && nm){ let B = dynBase.get(nm);
          if(!B){ const d0 = A.dynStateCopy(mem, 'default'), M0 = d0.length && d0[0].bm ? inv(d0[0].bm) : null;
            if(M0){ const loc0 = d0.map((x, i) => Object.assign(A.xformEnt(clone(x), M0), { _et: i }));
              const bb0 = bbox(loc0.filter(x => !x.att)) || { x0: 0, y0: 0, x1: 0, y1: 0 };
              B = { name: nm, ents: loc0, n: mem.length, bb: bb0, atts: loc0.filter(x => x.att), hBR: H(), hB: H(), hE: H(), dyn: dd, dynName: f.bm.name };
              B.g = DYNG ? dynGraph(B, dd) : null;
              blockDefs.set(nm, B); dynBase.set(nm, B); } }
          if(B && B.n === mem.length){
            const loc = mem.map((x, i) => Object.assign(A.xformEnt(clone(x), Mi), { _et: i }));
            const U = { name: '*U' + (++nU), ents: loc, n: mem.length, bb: bbox(loc.filter(x => !x.att)) || { x0: 0, y0: 0, x1: 0, y1: 0 }, atts: loc.filter(x => x.att), hBR: H(), hB: H(), hE: H(), anon: 1, rep: B };
            blockDefs.set(U.name, U);
            inserts.set(gid, { D: U, m: m1, mem, xR: null, dyn: B, st: st0, fl: sx < 0 || sy < 0 ? [sx, sy] : null }); for(const x of mem) done.add(x); continue; } } }
      if(f.bm && f.bm.name && !String(f.blk || '').startsWith('*') && !(xR && xR.inv) && !mem.some(x => (x.vh && !x.ull) || x.type === 'SOLID3D' || x.type === 'IMAGE')){
        const Mi = inv(f.bm); if(!Mi || mem.some(x => !x.bm || x.bm.name !== f.bm.name)) continue; const nm = String(f.bm.name).replace(/[<>\\/":;?*|=`]/g, '_').slice(0, 250); if(!nm) continue;
        const loc = mem.map(x => A.xformEnt(clone(x), Mi)); const bb = bbox(loc.filter(x => !x.att)) || { x0: 0, y0: 0, x1: 0, y1: 0 };
        const tol = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0, 1) * 1e-6; const same = D0 => D0.n === mem.length && Math.abs(D0.bb.x0 - bb.x0) <= tol && Math.abs(D0.bb.y0 - bb.y0) <= tol && Math.abs(D0.bb.x1 - bb.x1) <= tol && Math.abs(D0.bb.y1 - bb.y1) <= tol;
        const fam = blockFam.get(nm) || []; let D = fam.find(same);
        if(!D){ const vn = fam.length ? nm + '$' + fam.length : nm; D = { name: vn, ents: loc, n: mem.length, bb, atts: loc.filter(x => x.att), hBR: H(), hB: H(), hE: H() }; fam.push(D); blockFam.set(nm, fam); blockDefs.set(vn, D); }
        inserts.set(gid, { D, m: f.bm, mem, xR }); for(const x of mem) done.add(x); continue; }
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
    if(A.geoHeader && A.geoGet && A.geoGet()){ A.geoHeader(P); }
    P(9, '$PSLTSCALE'); P(70, 1); P(9, '$HANDSEED'); const seedAt = L.length + 1; P(5, 'FFFF');
    P(0, 'ENDSEC');
    P(0, 'SECTION'); P(2, 'CLASSES');
    const cls = (n, cpp, app, fl, ent) => { P(0, 'CLASS'); P(1, n); P(2, cpp); P(3, app); P(90, fl); if(V2004) P(91, 0); P(280, 0); P(281, ent ? 1 : 0); };
    if(V2007){ const ODBX = 'ObjectDBX Classes';
      for(const c of [['ACDBDICTIONARYWDFLT', 'AcDbDictionaryWithDefault', ODBX, 0], ['SUN', 'AcDbSun', 'SCENEOE', 1153], ['VISUALSTYLE', 'AcDbVisualStyle', ODBX, 4095], ['MATERIAL', 'AcDbMaterial', ODBX, 1153],
        ['SCALE', 'AcDbScale', ODBX, 1153], ['TABLESTYLE', 'AcDbTableStyle', ODBX, 4095], ['MLEADERSTYLE', 'AcDbMLeaderStyle', 'ACDB_MLEADERSTYLE_CLASS', 4095], ['DICTIONARYVAR', 'AcDbDictionaryVar', ODBX, 0],
        ['CELLSTYLEMAP', 'AcDbCellStyleMap', ODBX, 1152], ['MENTALRAYRENDERSETTINGS', 'AcDbMentalRayRenderSettings', 'SCENEOE', 1024], ['ACDBDETAILVIEWSTYLE', 'AcDbDetailViewStyle', ODBX, 1025],
        ['ACDBSECTIONVIEWSTYLE', 'AcDbSectionViewStyle', ODBX, 1025], ['RASTERVARIABLES', 'AcDbRasterVariables', 'ISM', 0], ['ACDBPLACEHOLDER', 'AcDbPlaceHolder', ODBX, 0], ['LAYOUT', 'AcDbLayout', ODBX, 0]]) cls(c[0], c[1], c[2], c[3]); }
    if(geo) cls('GEODATA', 'AcDbGeoData', 'ObjectDBX Classes', 4095);
    if(psets.length) cls('PLOTSETTINGS', 'AcDbPlotSettings', 'ObjectDBX Classes', 0);
    if(imgDefs.size){ cls('IMAGE', 'AcDbRasterImage', 'ISM', 127, true); cls('IMAGEDEF', 'AcDbRasterImageDef', 'ISM', 0); cls('IMAGEDEF_REACTOR', 'AcDbRasterImageDefReactor', 'ISM', 1); if(!V2007) cls('RASTERVARIABLES', 'AcDbRasterVariables', 'ISM', 0); }
    if(DYNX && dynBase.size){ const O = 'ObjectDBX Classes', used = new Set(); for(const B of dynBase.values()) if(B.g){ used.add('ACAD_EVALUATION_GRAPH'); used.add('ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION'); for(const n of B.g.N) used.add(n.t); }
      for(const c of [['ACAD_EVALUATION_GRAPH', 'AcDbEvalGraph'], ['BLOCKVISIBILITYPARAMETER', 'AcDbBlockVisibilityParameter'], ['BLOCKVISIBILITYGRIP', 'AcDbBlockVisibilityGrip'],
        ['BLOCKLINEARPARAMETER', 'AcDbBlockLinearParameter'], ['BLOCKLINEARGRIP', 'AcDbBlockLinearGrip'], ['BLOCKSTRETCHACTION', 'AcDbBlockStretchAction'],
        ['BLOCKFLIPPARAMETER', 'AcDbBlockFlipParameter'], ['BLOCKFLIPGRIP', 'AcDbBlockFlipGrip'], ['BLOCKFLIPACTION', 'AcDbBlockFlipAction'],
        ['BLOCKGRIPLOCATIONCOMPONENT', 'AcDbBlockGripExpr'], ['ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION', 'AcDbDynamicBlockPurgePreventer']]) if(used.has(c[0])) cls(c[0], c[1], O, 1153);
      cls('ACDB_BLOCKREPRESENTATION_DATA', 'AcDbBlockRepresentationData', O, 1153); }
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
      const lw = lwStd(A.layerLW ? A.layerLW(ly) : 0); P(370, lw != null ? lw : -3); P(390, hPsnNormal); if(N7) P(347, N7.mGlobal);
      const ltp = A.layerTP ? A.layerTP(ly) : 0; if(ltp > 0 && V2004){ P(1001, 'AcCmTransparency'); P(1071, (0x02000000 | Math.round(255 * (1 - Math.min(90, ltp) / 100))) >>> 0); } } });   // độ trong suốt lớp (như AutoCAD 2011+)
    table('STYLE', 1 + stUsed.size + (hStShx ? 1 : 0), () => {
      rec('STYLE', hStStd, 'AcDbTextStyleTableRecord'); P(2, 'Standard'); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, 'arial.ttf'); P(4, '');
      for(const [n, o] of stUsed){ rec('STYLE', o.h, 'AcDbTextStyleTableRecord'); P(2, dxfStr(n)); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, o.f); P(4, o.b || ''); }
      if(hStShx){ rec('STYLE', hStShx, 'AcDbTextStyleTableRecord'); P(2, ''); P(70, 1); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, 'ltypeshp.shx'); P(4, ''); } });
    table('VIEW', 0, () => {}); table('UCS', 0, () => {});
    const dynApps = (DYNX && dynBase.size ? ['AcDbDynamicBlockTrueName', 'AcDbDynamicBlockGUID', 'AcDbBlockRepETag', 'AcDbBlockRepBTag'] : []).concat([...new Set(ents.flatMap(e => e.xd ? e.xd.map(x => String(x[0])) : []).concat(A.regApps ? A.regApps() : []))].filter(n => !/^(ACAD|DVDCAD|AcCmTransparency|AcDbDynamicBlockTrueName|AcDbDynamicBlockGUID|AcDbBlockRepETag|AcDbBlockRepBTag)$/i.test(n)).map(dxfStr));
    table('APPID', 3 + dynApps.length, () => { rec('APPID', hApAcad, 'AcDbRegAppTableRecord'); P(2, 'ACAD'); P(70, 0); rec('APPID', hApDvd, 'AcDbRegAppTableRecord'); P(2, 'DVDCAD'); P(70, 0); rec('APPID', H(), 'AcDbRegAppTableRecord'); P(2, 'AcCmTransparency'); P(70, 0);
      for(const n of dynApps){ rec('APPID', H(), 'AcDbRegAppTableRecord'); P(2, n); P(70, 0); } });
    const dt = A.dimTxt ? A.dimTxt() : 2.5;
    table('DIMSTYLE', 1, () => { rec('DIMSTYLE', hDsStd, 'AcDbDimStyleTableRecord', 105); P(2, 'Standard'); P(70, 0); P(40, 1); P(41, dt * ((A.DS && A.DS.asz) || 1)); P(42, dt * ((A.DS && A.DS.exo) || 0.6)); P(44, dt * ((A.DS && A.DS.exe) || 0.8)); P(140, dt); P(147, dt * ((A.DS && A.DS.gap) || 0.5)); P(77, 1); P(271, (A.DS && A.DS.dec) | 0); P(340, hStStd); },
      () => { P(100, 'AcDbDimStyleTable'); P(71, 1); P(340, hDsStd); });
    const allBlocks = [...blockDefs.values(), ...dims.values()];
    table('BLOCK_RECORD', 1 + lays.length + allBlocks.length, () => {
      const brx = () => { if(V2007){ P(70, (typeof insunits !== 'undefined' && insunits) | 0); P(280, 1); P(281, 0); } };   // R2007+: đơn vị chèn, cho phép phá khối
      P(0, 'BLOCK_RECORD'); P(5, hBRmodel); if(geo){ P(102, '{ACAD_XDICTIONARY'); P(360, hGeoD); P(102, '}'); } P(330, hT.BLOCK_RECORD); P(100, 'AcDbSymbolTableRecord'); P(100, 'AcDbBlockTableRecord'); P(2, '*Model_Space'); P(340, hLayModel); brx();
      for(const Lp of lays){ rec('BLOCK_RECORD', Lp.hBR, 'AcDbBlockTableRecord'); P(2, Lp.bn); P(340, Lp.hLay); brx(); }
      for(const D of blockDefs.values()){ P(0, 'BLOCK_RECORD'); P(5, D.hBR); if(D.g){ P(102, '{ACAD_XDICTIONARY'); P(360, D.g.hXD); P(102, '}'); } P(330, hT.BLOCK_RECORD); P(100, 'AcDbSymbolTableRecord'); P(100, 'AcDbBlockTableRecord'); P(2, dxfStr(D.name)); P(340, '0'); brx();
        if(DYNX && D.dyn){ if(D.g){ P(1001, 'AcDbDynamicBlockTrueName'); P(1000, dxfStr(D.name)); P(1001, 'AcDbDynamicBlockGUID'); P(1000, guidOf(D.name)); } P(1001, 'AcDbBlockRepETag'); P(1070, 1); P(1071, D.n); }
        if(DYNX && D.anon){ P(1001, 'AcDbBlockRepBTag'); P(1070, 1); P(1005, D.rep.hBR); } }
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
      const head = (t, sub, hh) => { wrote = true; const h = hh || H(); if(o.hs) o.hs.push(h); P(0, t); P(5, h); P(330, owner); P(100, 'AcDbEntity'); if(curPS) P(67, 1); P(8, ly); if(e.vh) P(60, 1); if(elt && t !== 'HATCH' && t !== 'TEXT' && t !== 'MTEXT') P(6, elt); if(aci !== 256) P(62, aci); if(tc != null) P(420, tc); if(lw != null) P(370, lw); if(e.tp > 0 && V2004) P(440, (0x02000000 | Math.round(255 * (1 - Math.min(90, e.tp) / 100))) >>> 0); if(e.lts && Math.abs(e.lts - 1) > 1e-9 && t !== 'TEXT' && t !== 'MTEXT') P(48, e.lts); if(sub) P(100, sub); return h; };
      const xd = () => { if(o.dimBlock) return;
        // XDATA của ứng dụng / LISP (regapp + entmod -3): ghi lại nguyên như AutoCAD
        if(e.xd && !o.inBlock) for(const [app, items] of e.xd){ P(1001, dxfStr(app)); for(const [c, v] of items){ if(c >= 1010 && c <= 1013){ const q = Array.isArray(v) ? v : [0, 0, 0]; P(c, +q[0] || 0); P(c + 10, +q[1] || 0); P(c + 20, +q[2] || 0); } else P(c, typeof v === 'string' ? dxfStr(v) : v); } }
        if(o.inBlock){ if(!o.dyn && !e.ull) return; if(o.dyn && DYNX && e._et != null){ P(1001, 'AcDbBlockRepETag'); P(1070, 1); P(1071, e._et); }
          const q = {}; if(e.dvs) q.dvs = e.dvs; if(o.dyn === 2 && e.dyn) q.dyn = e.dyn; if(e.ull){ q.ull = e.ull; if(e.vh) q.ulh = 1; if(e.ulc) q.ulc = e.ulc; } if(Object.keys(q).length){ const js = JSON.stringify(q); P(1001, 'DVDCAD'); for(let k = 0; k < js.length; k += 240) P(1000, (k ? 'P+' : 'P:') + js.slice(k, k + 240)); } return; }
        const pr = {}; for(const k of XKEYS) if(e[k] != null && e[k] !== '' && !(k === 'mt' && e.type !== 'TEXT')) pr[k] = e[k];
        if(e.type === 'IMAGE'){ const q = {}; for(const k of ['x', 'y', 'w', 'h', 'rot', 'op', 'name', 'frame', 'img', 'gmi', 'cpoly', 'pc']) if(e[k] != null) q[k] = e[k]; pr.imgx = q; }   // ảnh: khung đa tuyến + thông số ảnh (dữ liệu ảnh ở DVDCAD_DATA)
        const js = Object.keys(pr).length ? JSON.stringify(pr) : null;
        if(!e.rgn && !js) return; P(1001, 'DVDCAD'); if(e.rgn) P(1000, 'RGN' + (e.grp && e.blk === '*REGION' ? ':' + e.grp : '')); if(js){ for(let k = 0; k < js.length; k += 240) P(1000, (k ? 'P+' : 'P:') + js.slice(k, k + 240)); } };
      // đa tuyến có độ rộng: độ rộng đầu / cuối từng đỉnh (40 / 41) lấy lại từ các tứ giác tô
      const widthPoly = e2 => { const V = e2.vertices, q = e2.wq, key = p => Math.round(p.x * 1e5) + ',' + Math.round(p.y * 1e5); const m = new Map();
        for(const Q of q){ if(Q.length < 4) continue; const a = { x: (Q[0].x + Q[3].x) / 2, y: (Q[0].y + Q[3].y) / 2 }, b = { x: (Q[1].x + Q[2].x) / 2, y: (Q[1].y + Q[2].y) / 2 }; m.set(key(a) + '|' + key(b), [Math.hypot(Q[0].x - Q[3].x, Q[0].y - Q[3].y), Math.hypot(Q[1].x - Q[2].x, Q[1].y - Q[2].y)]); }
        let cl = !!e2.closed, n = V.length; if(!cl && n > 2 && Math.hypot(V[0].x - V[n - 1].x, V[0].y - V[n - 1].y) < 1e-9){ cl = true; n--; }
        head('LWPOLYLINE', 'AcDbPolyline'); P(90, n); P(70, cl ? 1 : 0);
        for(let i = 0; i < n; i++){ const a = V[i], b = V[(i + 1) % V.length]; const w = (i < n - 1 || cl) ? m.get(key(a) + '|' + key(b)) : null; P(10, a.x); P(20, a.y); if(w){ P(40, w[0]); P(41, w[1]); } } };
      const lwpoly = (verts, closed) => { if(verts.length < 2) return; head('LWPOLYLINE', 'AcDbPolyline'); P(90, verts.length); P(70, closed ? 1 : 0); P(43, 0); for(const v of verts){ P(10, v.x); P(20, v.y); if(v.bulge) P(42, v.bulge); } };
      const just = t => ({ hj: t.ha === 'center' ? 1 : (t.ha === 'right' || t.ha === 'end') ? 2 : 0, vj: t.va === 'bottom' ? 1 : t.va === 'middle' ? 2 : t.va === 'top' ? 3 : 0 });
      const textBody = (t, val) => { const { hj, vj } = just(t); P(10, t.x); P(20, t.y); P(30, 0); P(40, t.h || 2.5); P(1, dxfStr(val)); if(t.rot) P(50, t.rot); if(t.xs && Math.abs(Math.abs(t.xs) - 1) > 1e-3) P(41, Math.abs(t.xs)); if(t.obl) P(51, t.obl); if(t.style && stUsed.has(t.style)) P(7, dxfStr(t.style)); if(t.xs < 0 || t.ud) P(71, (t.xs < 0 ? 2 : 0) | (t.ud ? 4 : 0)); if(hj) P(72, hj); if(hj || vj){ P(11, t.x); P(21, t.y); P(31, 0); } return { hj, vj }; };
      if(e.att && o.inBlock && e.type === 'TEXT'){ head('ATTDEF', 'AcDbText'); const { vj } = textBody(e, e.text || ''); P(100, 'AcDbAttributeDefinition'); P(3, dxfStr(e.attp || e.att)); P(2, dxfStr(e.att)); P(70, 0); if(vj) P(74, vj); return; }
      switch(e.type){
        case 'LINE': head('LINE', 'AcDbLine'); P(10, e.x1); P(20, e.y1); P(30, 0); P(11, e.x2); P(21, e.y2); P(31, 0); break;
        case 'CIRCLE': head('CIRCLE', 'AcDbCircle'); P(10, e.cx); P(20, e.cy); P(30, 0); P(40, e.r); break;
        case 'ARC': head('ARC', 'AcDbCircle'); P(10, e.cx); P(20, e.cy); P(30, 0); P(40, e.r); P(100, 'AcDbArc'); P(50, e.a1); P(51, e.a2); break;
        case 'POINT': head('POINT', 'AcDbPoint'); P(10, e.x); P(20, e.y); P(30, 0); break;
        case 'POLYLINE': { if(e.p3 && (e.vertices || []).length >= 2){   // đa tuyến 3D (3DPOLY): POLYLINE cờ 8 + VERTEX 3D + SEQEND
            const hp = head('POLYLINE', 'AcDb3dPolyline'); P(66, 1); P(10, 0); P(20, 0); P(30, 0); P(70, 8 | (e.closed ? 1 : 0)); xd(); wrote = false;
            for(const v of e.vertices){ const hv = H(); if(o.hs) o.hs.push(hv); P(0, 'VERTEX'); P(5, hv); P(330, hp); P(100, 'AcDbEntity'); if(curPS) P(67, 1); P(8, ly); P(100, 'AcDbVertex'); P(100, 'AcDb3dPolylineVertex'); P(10, v.x); P(20, v.y); P(30, v.z || 0); P(70, 32); }
            { const hs = H(); if(o.hs) o.hs.push(hs); P(0, 'SEQEND'); P(5, hs); P(330, hp); P(100, 'AcDbEntity'); if(curPS) P(67, 1); P(8, ly); } break; }
          if(e.pw && e.wq && e.wq.length){ const B = (A.bvOf && A.bvOf(e)) || e.vertices || []; if(B.length === e.pw.length && B.length >= 2){   // đa tuyến rộng dạng gốc: đỉnh + cung + độ rộng 40/41 từng đỉnh
              head('LWPOLYLINE', 'AcDbPolyline'); P(90, B.length); P(70, e.closed ? 1 : 0); B.forEach((v, k) => { P(10, v.x); P(20, v.y); P(40, e.pw[k][2] || 0); P(41, e.pw[k][3] || 0); if(v.bulge) P(42, v.bulge); }); break; } }
          if(e.wq && e.wq.length && (e.vertices || []).length >= 2){ widthPoly(e); break; } if(e.wipe && !o.inBlock && (e.vertices || []).length >= 3){ wipeout(e, head); break; } const bv = A.bvOf ? A.bvOf(e) : null; lwpoly(bv && bv.length >= 2 ? bv : (e.vertices || []), !!e.closed); break; }
        case 'IMAGE': { const D = !o.inBlock && !o.dimBlock && imgDefs.get(e.img); if(D){ imageEnt(e, D, head); break; }
          try{ lwpoly(e.cpoly && e.cpoly.length >= 3 ? e.cpoly : imgCorners(e), true); }catch(_){} break; }   // ảnh chưa có dữ liệu: khung (ảnh đã cắt — EXPORTLAYOUT: theo đường cắt)
        case 'TEXT': {
          if(!e.text) break; const txt = String(e.text);
          if(A.richPieces && (e.cols || (e.rt && e.rtx === e.text))){   // chữ có định dạng / có cột: mã MTEXT (\L \O {\f…|b1|i1;}), mỗi cột một MTEXT
            const ps = A.richPieces(e, mtStr); if(!ps.length) break;
            const mtx = (q, main) => { head('MTEXT', 'AcDbMText'); P(10, q.x); P(20, q.y); P(30, 0); P(40, e.h || 2.5); P(41, 0); P(71, q.ap); P(72, 1); const s = q.str; for(let k = 0; k < s.length; k += 250){ const part = s.slice(k, k + 250); if(k + 250 < s.length) P(3, part); else P(1, part); } if(!s.length) P(1, '');
              if(e.style && stUsed.has(e.style)) P(7, dxfStr(e.style)); const r = (e.rot || 0) * D2R; P(11, Math.cos(r)); P(21, Math.sin(r)); P(31, 0); P(73, 1); P(44, 1);
              if(!main && !o.inBlock && !o.dimBlock){ P(1001, 'DVDCAD'); P(1000, 'P:{"colx":1}'); } };   // cột phụ: DVDCAD bỏ khi mở lại (đã gộp trong cột đầu)
            for(let k = 1; k < ps.length; k++) mtx(ps[k], false); mtx(ps[0], true); break; }
          if(txt.includes('\n') || e.mt){ const { hj, vj } = just(e); const ap = (vj === 3 ? 0 : vj === 2 ? 3 : 6) + (hj === 1 ? 2 : hj === 2 ? 3 : 1);
            head('MTEXT', 'AcDbMText'); P(10, e.x); P(20, e.y); P(30, 0); P(40, e.h || 2.5); P(41, 0); P(71, ap); P(72, 1); const s = mtStr(txt); for(let k = 0; k < s.length; k += 250){ const part = s.slice(k, k + 250); if(k + 250 < s.length) P(3, part); else P(1, part); } if(!s.length) P(1, '');
            if(e.style && stUsed.has(e.style)) P(7, dxfStr(e.style)); const r = (e.rot || 0) * D2R; P(11, Math.cos(r)); P(21, Math.sin(r)); P(31, 0); P(73, 1); P(44, 1); break; }
          head('TEXT', 'AcDbText'); const { vj } = textBody(e, txt); P(100, 'AcDbText'); if(vj) P(73, vj); break; }
        case 'SOLID': if(e.face){ const p = e.pts || []; if(p.length >= 3){ const zs = e.zs || []; head('3DFACE', 'AcDbFace'); for(let j = 0; j < 4; j++){ const q = p[Math.min(j, p.length - 1)]; P(10 + j, q.x); P(20 + j, q.y); P(30 + j, zs[Math.min(j, p.length - 1)] || 0); } if(e.ie) P(70, e.ie & 15); } break; } { const p = e.pts || []; if(p.length >= 3){ head('SOLID', 'AcDbTrace'); P(10, p[0].x); P(20, p[0].y); P(30, 0); P(11, p[1].x); P(21, p[1].y); P(31, 0); P(12, p[2].x); P(22, p[2].y); P(32, 0); const q = p[3] || p[2]; P(13, q.x); P(23, q.y); P(33, 0); } break; }
        case 'ELLIPSE': { let p1 = e.p1 || 0, p2 = e.p2 == null ? TAU : e.p2; head('ELLIPSE', 'AcDbEllipse'); P(10, e.cx); P(20, e.cy); P(30, 0); P(11, e.mx); P(21, e.my); P(31, 0); P(210, 0); P(220, 0); P(230, 1); P(40, e.ratio || 1); P(41, p1); P(42, p2); break; }
        case 'XLINE': { const Lx = Math.hypot(e.dx, e.dy) || 1; head(e.ray ? 'RAY' : 'XLINE', e.ray ? 'AcDbRay' : 'AcDbXline'); P(10, e.x); P(20, e.y); P(30, 0); P(11, e.dx / Lx); P(21, e.dy / Lx); P(31, 0); break; }
        case 'HATCH': hatch(e, head); break;
        case 'SOLID3D': solid3d(e, head, ly, aci); break;
      }
      if(wrote && e.type !== 'SOLID3D') xd();
    }
    // ảnh: gốc = góc dưới trái, vector u / v của 1 điểm ảnh, cỡ ảnh (điểm ảnh), IMAGEDEF + IMAGEDEF_REACTOR; độ đậm → fade;
    // khung cắt (IMAGECLIP, đường cắt EXPORTLAYOUT) → đa giác toạ độ điểm ảnh (gốc góc trên trái, trục Y hướng xuống, điểm đầu lặp lại ở cuối)
    function imageEnt(e, D, head){
      const r = (e.rot || 0) * D2R, c = Math.cos(r), s = Math.sin(r), W = D.pw, Hh = D.ph;
      const toPx = q => { const dx = q.x - e.x, dy = q.y - e.y; return { x: (dx * c + dy * s) / e.w * W - 0.5, y: Hh - (-dx * s + dy * c) / e.h * Hh - 0.5 }; };
      const cp = e.cpoly && e.cpoly.length >= 3 ? e.cpoly : e.clip && e.clip.w > 0 && e.clip.h > 0 ? [{ x: e.clip.x, y: e.clip.y }, { x: e.clip.x + e.clip.w, y: e.clip.y }, { x: e.clip.x + e.clip.w, y: e.clip.y + e.clip.h }, { x: e.clip.x, y: e.clip.y + e.clip.h }] : null;
      const hI = head('IMAGE', 'AcDbRasterImage'), hR = H(); D.rs.push([hR, hI]);
      P(90, 0); P(10, e.x); P(20, e.y); P(30, 0); P(11, c * e.w / W); P(21, s * e.w / W); P(31, 0); P(12, -s * e.h / Hh); P(22, c * e.h / Hh); P(32, 0); P(13, W); P(23, Hh); P(340, D.h);
      P(70, 7 | (D.png ? 8 : 0)); P(280, cp ? 1 : 0); P(281, 50); P(282, 50); P(283, Math.max(0, Math.min(100, Math.round((1 - (e.op != null ? +e.op : 1)) * 100)))); P(360, hR);
      if(cp){ const V = cp.map(toPx); V.push(V[0]); P(71, 2); P(91, V.length); for(const q of V){ P(14, q.x); P(24, q.y); } } else { P(71, 1); P(91, 2); P(14, -0.5); P(24, -0.5); P(14, W - 0.5); P(24, Hh - 0.5); }
      if(yr >= 2010) P(290, 0); }
    // vùng che: thực thể WIPEOUT (như IMAGE, khung cắt theo đa giác; toạ độ khung trong ô ảnh 1×1, trục Y hướng xuống)
    function wipeout(e, head){
      const V = e.vertices; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const q of V){ x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
      const W = Math.max(x1 - x0, 1e-9), Hh = Math.max(y1 - y0, 1e-9);
      head('WIPEOUT', 'AcDbWipeout'); P(90, 0); P(10, x0); P(20, y0); P(30, 0); P(11, W); P(21, 0); P(31, 0); P(12, 0); P(22, Hh); P(32, 0); P(13, 1); P(23, 1); P(340, '0'); P(70, 7); P(280, 1); P(281, 50); P(282, 50); P(283, 0); P(360, '0'); P(71, 2);
      P(91, V.length + 1); for(const q of V.concat([V[0]])){ P(14, (q.x - x0) / W - 0.5); P(24, 0.5 - (q.y - y0) / Hh); }
    }
    // HATCH thật: tô đặc, hoặc mẫu đường song song (ANSI31, ANSI32, ANSI37, NET, LINE, BRICK); mẫu khác ghi thành nét
    function patLines(e){ const P0 = (A.PATS || {})[e.pat]; if(!P0) return null; const an = e.hanno && A.ANNO && A.ANNO.N > 0 ? A.ANNO.N : 1, sc = P0.user ? 1 : (A.hatchSc ? A.hatchSc(e) : (e.psc || 1)), rot = (e.pang || 0); const out = []; const og = e.porg || { x: 0, y: 0 };
      const add = (aDeg, base, dpat, dash) => { const a = (aDeg + rot) * D2R, c = Math.cos(a), s = Math.sin(a); const r0 = rot * D2R, cr = Math.cos(r0), sr = Math.sin(r0);
        out.push({ a: aDeg + rot, bx: (base[0] * cr - base[1] * sr) * sc + og.x, by: (base[0] * sr + base[1] * cr) * sc + og.y, ox: (dpat[0] * c - dpat[1] * s) * sc, oy: (dpat[0] * s + dpat[1] * c) * sc, dash: (dash || []).map(v => v * sc) }); };
      if(P0.user){ const sp = (e.usp > 0 ? e.usp : 1) * an; add(0, [0, 0], [0, sp]); if(e.udbl) add(90, [0, 0], [0, sp]); return out; }
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
      P(75, 0); P(76, e.pat === '_USER' ? 0 : 1); if(!solid){ P(52, e.pang || 0); P(41, e.pat === '_USER' ? (e.usp || 1) : (A.hatchSc ? A.hatchSc(e) : (e.psc || 1))); P(77, e.udbl ? 1 : 0); P(78, PL.length); for(const l of PL){ P(53, l.a); P(43, l.bx); P(44, l.by); P(45, l.ox); P(46, l.oy); P(79, l.dash.length); for(const d of l.dash) P(49, d); } }
      P(98, 0);
    }
    // khối 3D → mặt 3DFACE + XDATA thông số (mở lại trong DVDCAD vẫn là khối)
    function solid3d(e, head){
      const m = A.meshOf ? A.meshOf(e) : null; if(!m) return; const nf = m.i.length / 3; let xd = null;
      const d = {}; for(const k of ['k', 'pts', 'holes', 'z0', 'h', 'tri', 'cx', 'cy', 'r', 'r2', 'mat', 'srf', 'ms', 'mapk', 'mapsc', 'matL']) if(e[k] != null && !(e.k === 'mesh' && k === 'pts')) d[k] = e[k];
      let js = JSON.stringify(d, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v); if(js.length > 15000){ delete d.ms; js = JSON.stringify(d, (k, v) => typeof v === 'number' ? +v.toFixed(6) : v); } if(js.length > 15000) js = JSON.stringify({ k: 'mesh', mat: e.mat, srf: e.srf }); xd = []; for(let k = 0; k < js.length; k += 240) xd.push(js.slice(k, k + 240));
      for(let t = 0; t < m.i.length; t += 3){ const q = [m.i[t], m.i[t + 1], m.i[t + 2], m.i[t + 2]]; head('3DFACE', 'AcDbFace'); q.forEach((ix, j) => { P(10 + j, m.p[ix * 3]); P(20 + j, m.p[ix * 3 + 1]); P(30 + j, m.p[ix * 3 + 2]); });
        if(t === 0){ P(1001, 'DVDCAD'); P(1000, 'S3D'); P(1071, nf); for(const c of xd) P(1000, c); } }
    }
    let curOwner = hBRmodel, curPS = false;
    // khung nhìn: ID 1 = khung nhìn tổng của tờ giấy; còn lại = khung nhìn Model (tâm giấy 10/20, cỡ 40/41, tâm nhìn 12/22, cao vùng nhìn 45)
    const vport = (owner, h, id, cx, cy, w, hh, vx, vy, vh, X, tw) => { tw = tw || 0; if(tw){ const c = Math.cos(tw), s = Math.sin(tw); [vx, vy] = [c * vx - s * vy, s * vx + c * vy]; }   // xoay nhìn: tâm nhìn ghi theo DCS (đích = 0)
      P(0, 'VIEWPORT'); P(5, h || H()); P(330, owner); P(100, 'AcDbEntity'); P(67, 1); P(8, '0'); P(100, 'AcDbViewport');
      P(10, cx); P(20, cy); P(30, 0); P(40, w); P(41, hh); P(68, id === 1 ? 1 : 2); P(69, id); P(12, vx); P(22, vy); P(13, 0); P(23, 0); P(14, 10); P(24, 10); P(15, 10); P(25, 10);
      P(16, 0); P(26, 0); P(36, 1); P(17, 0); P(27, 0); P(37, 0); P(42, 50); P(43, 0); P(44, 0); P(45, vh); P(50, 0); P(51, tw * 180 / Math.PI); P(72, 1000);
      for(const n of (X && X.frz) || []){ const hl = layH.get(String(n)); if(hl) P(331, hl); }   // lớp đóng băng riêng khung nhìn (VPLAYER)
      P(90, X && X.clipH ? 32864 | 65536 : 32864); if(X && X.clipH) P(340, X.clipH);   // đa giác cắt (VPCLIP)
      P(1, ''); P(281, 0); P(71, 1); P(74, 0);
      P(110, 0); P(120, 0); P(130, 0); P(111, 1); P(121, 0); P(131, 0); P(112, 0); P(122, 1); P(132, 0); P(79, 0); P(146, 0); if(V2004) P(170, 0); };
    const paperBody = Lp => { curPS = true; try{ if(Lp.sheet){ const S = Lp.sheet, w = S.x1 - S.x0, hh = S.y1 - S.y0; vport(Lp.hBR, Lp.hVp, 1, (S.x0 + S.x1) / 2, (S.y0 + S.y1) / 2, w * 1.05, hh * 1.05, (S.x0 + S.x1) / 2, (S.y0 + S.y1) / 2, hh * 1.05); }
        Lp.vps.forEach((v, k) => { const X = v.vx ? { frz: v.vx.frz || [], clipH: null } : null; const hv = H(), cp = v.vx && Array.isArray(v.vx.cp) && v.vx.cp.length >= 3 ? v.vx.cp : null;
          if(cp){ X.clipH = H(); P(0, 'LWPOLYLINE'); P(5, X.clipH); P(102, '{ACAD_REACTORS'); P(330, hv); P(102, '}'); P(330, Lp.hBR); P(100, 'AcDbEntity'); P(67, 1); P(8, '0'); P(100, 'AcDbPolyline'); P(90, cp.length); P(70, 1); P(43, 0); for(const q of cp){ P(10, q.x); P(20, q.y); } }
          vport(Lp.hBR, hv, k + 2, v.vcx, v.vcy, v.w, v.h, v.dcx, v.dcy, v.vh, X, v.tw || 0); });
        for(const e of Lp.ents) emit(e, Lp.hBR); } finally { curPS = false; } };
    // ---------- BLOCKS ----------
    P(0, 'SECTION'); P(2, 'BLOCKS');
    const blk = (hB, hE, hBR, name, flags, body) => { P(0, 'BLOCK'); P(5, hB); P(330, hBR); P(100, 'AcDbEntity'); P(8, '0'); P(100, 'AcDbBlockBegin'); P(2, name); P(70, flags); P(10, 0); P(20, 0); P(30, 0); P(3, name); P(1, ''); if(body){ curOwner = hBR; body(); curOwner = hBRmodel; } P(0, 'ENDBLK'); P(5, hE); P(330, hBR); P(100, 'AcDbEntity'); P(8, '0'); P(100, 'AcDbBlockEnd'); };
    blk(hBlkModel, hEndModel, hBRmodel, '*Model_Space', 0, null);
    lays.forEach((Lp, i) => blk(Lp.hB, Lp.hE, Lp.hBR, Lp.bn, 0, i ? () => paperBody(Lp) : null));
    for(const D of blockDefs.values()) blk(D.hB, D.hE, D.hBR, dxfStr(D.name), (D.atts.length ? 2 : 0) | (D.anon ? 1 : 0), () => { for(const x of D.ents){ const o2 = { inBlock: true, dyn: D.dyn ? 1 : D.anon ? 2 : 0, hs: D.g ? [] : null }; emit(x, D.hBR, o2); if(o2.hs) x._hs = o2.hs; } });
    for(const d of dims.values()) blk(d.hB, d.hE, d.hBR, d.bn, 1, () => { for(const x of d.mem) emit(x, d.hBR, { dimBlock: true }); });
    P(0, 'ENDSEC');
    // ---------- ENTITIES ----------
    P(0, 'SECTION'); P(2, 'ENTITIES');
    for(const e of ents){ if(done.has(e) || e.xh) continue; emit(e, hBRmodel); }
    const xcl = [], dynIns = [];
    for(const ins of inserts.values()){ const m = ins.m; const sx = Math.hypot(m.a, m.b), det = m.a * m.d - m.b * m.c, sy = det / (sx || 1), rot = Math.atan2(m.b, m.a) * R2D; const f = ins.mem[0];
      const lyn = dxfStr(String(m.lay || f.layer || '0')); const atts = ins.mem.filter(x => x.att && x.type === 'TEXT'); const hI = H();
      P(0, 'INSERT'); P(5, hI); if(ins.dyn && DYNX){ ins.hI = hI; ins.hIX = H(); dynIns.push(ins); P(102, '{ACAD_XDICTIONARY'); P(360, ins.hIX); P(102, '}'); } if(ins.xR && window.xclipFor){ const X = { hI, hXD: H(), hFD: H(), hSF: H(), R: ins.xR, m }; xcl.push(X); P(102, '{ACAD_XDICTIONARY'); P(360, X.hXD); P(102, '}'); } P(330, hBRmodel); P(100, 'AcDbEntity'); P(8, lyn); P(100, 'AcDbBlockReference'); if(atts.length) P(66, 1); P(2, dxfStr(ins.D.name)); P(10, m.e); P(20, m.f); P(30, 0); if(Math.abs(sx - 1) > 1e-12) P(41, sx); if(Math.abs(sy - 1) > 1e-12) P(42, sy); if(Math.abs(sx - 1) > 1e-12 || Math.abs(sy - 1) > 1e-12) P(43, 1); if(Math.abs(rot) > 1e-12) P(50, rot);
      if(ins.dyn){ const js = JSON.stringify(ins.fl ? { dbn: ins.dyn.dynName, dfl: ins.fl } : { dbn: ins.dyn.dynName }); P(1001, 'DVDCAD'); for(let k = 0; k < js.length; k += 240) P(1000, (k ? 'P+' : 'P:') + js.slice(k, k + 240)); }   // tên khối động gốc (DVDCAD đọc lại)
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
    paperBody(lays[0]);
    P(0, 'ENDSEC');
    // ---------- OBJECTS ----------
    P(0, 'SECTION'); P(2, 'OBJECTS');
    const dict = (h, owner, entries, hard) => { P(0, 'DICTIONARY'); P(5, h); if(owner !== '0'){ P(102, '{ACAD_REACTORS'); P(330, owner); P(102, '}'); } P(330, owner); P(100, 'AcDbDictionary'); if(hard) P(280, 1); P(281, 1); for(const [k, v] of entries){ P(3, k); P(350, v); } };
    const hWv = hasWipe ? H() : null; const xdat = dvdData(ents, full); const hXr = xdat ? H() : null;
    const rootE = [['ACAD_GROUP', hGroupD], ['ACAD_LAYOUT', hLayoutD], ['ACAD_MLINESTYLE', hMlsD], ['ACAD_PLOTSETTINGS', hPsetD], ['ACAD_PLOTSTYLENAME', hPsnD]]; if(hWv) rootE.push(['ACAD_WIPEOUT_VARS', hWv]); if(hXr) rootE.push(['DVDCAD_DATA', hXr]);
    const hImgD = imgDefs.size ? H() : null, hImgV = hImgD ? H() : null; if(hImgD) rootE.push(['ACAD_IMAGE_DICT', hImgD], ['ACAD_IMAGE_VARS', hImgV]);
    if(N7) rootE.push(['ACAD_COLOR', N7.color], ['ACAD_MATERIAL', N7.mat], ['ACAD_MLEADERSTYLE', N7.mlds], ['ACAD_SCALELIST', N7.scl], ['ACAD_TABLESTYLE', N7.tbs], ['ACAD_VISUALSTYLE', N7.vis]);
    rootE.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    dict(hRoot, '0', rootE);
    if(hImgD){ dict(hImgD, hRoot, [...imgDefs.values()].map(D => [dxfStr(D.key), D.h]));
      for(const D of imgDefs.values()){ P(0, 'IMAGEDEF'); P(5, D.h); P(102, '{ACAD_REACTORS'); P(330, hImgD); for(const [hR] of D.rs) P(330, hR); P(102, '}'); P(330, hImgD);
        P(100, 'AcDbRasterImageDef'); P(90, 0); P(1, dxfStr('.\\' + D.name)); P(10, D.pw); P(20, D.ph); P(11, D.px); P(21, D.px); P(280, 1); P(281, 0);
        for(const [hR, hI] of D.rs){ P(0, 'IMAGEDEF_REACTOR'); P(5, hR); P(330, hI); P(100, 'AcDbRasterImageDefReactor'); P(90, 2); P(330, hI); } }
      const un = { 4: 1, 5: 2, 6: 3, 7: 4, 1: 5, 2: 6, 10: 7, 3: 8 }[(typeof insunits !== 'undefined' && insunits) | 0] || 0;
      P(0, 'RASTERVARIABLES'); P(5, hImgV); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbRasterVariables'); P(90, 0);
      P(70, typeof IMAGEFRAME !== 'undefined' && IMAGEFRAME === 0 ? 0 : 1); P(71, typeof IMAGEQUALITY !== 'undefined' && IMAGEQUALITY === 0 ? 0 : 1); P(72, un); }
    if(hWv){ P(0, 'WIPEOUTVARIABLES'); P(5, hWv); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbWipeoutVariables'); P(70, (typeof WIPEFRAME !== 'undefined' && WIPEFRAME === 0) ? 0 : 1); }
    if(hXr){ P(0, 'XRECORD'); P(5, hXr); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbXrecord'); P(280, 1); P(1, 'DVDCAD1'); for(let k = 0; k < xdat.length; k += 240) P(300, xdat.slice(k, k + 240)); }
    if(geo){ const r6 = v => Math.round((+v || 0) * 1e8) / 1e8, nr = (+geo.north || 0) * Math.PI / 180, un = { 1: 1, 2: 2, 4: 4, 5: 5, 6: 6 }[(typeof insunits !== 'undefined' && insunits) | 0] || 6;
      P(0, 'DICTIONARY'); P(5, hGeoD); P(330, hBRmodel); P(100, 'AcDbDictionary'); P(280, 1); P(281, 1); P(3, 'ACAD_GEOGRAPHICDATA'); P(360, hGeo);
      P(0, 'GEODATA'); P(5, hGeo); P(102, '{ACAD_REACTORS'); P(330, hGeoD); P(102, '}'); P(330, hGeoD); P(100, 'AcDbGeoData'); P(90, yr >= 2013 ? 3 : 2); P(330, hBRmodel); P(70, 1);
      P(10, r6(geo.dx)); P(20, r6(geo.dy)); P(30, 0); P(11, r6(geo.lon)); P(21, r6(geo.lat)); P(31, r6(geo.elev)); P(40, 1); P(91, un); P(41, 1); P(92, un); P(210, 0); P(220, 0); P(230, 1);
      P(12, r6(-Math.sin(nr))); P(22, r6(Math.cos(nr))); P(95, 1); P(141, 1); P(294, 0); P(142, 0); P(143, 6378137); P(301, ''); P(302, '<georss:point>' + (+geo.lat).toFixed(6) + ' ' + (+geo.lon).toFixed(6) + '</georss:point>');
      P(305, ''); P(306, ''); P(307, ''); P(93, 0); P(96, 0); }
    dict(hGroupD, hRoot, []);
    dict(hLayoutD, hRoot, lays.map(Lp => [dxfStr(Lp.name), Lp.hLay]).concat([['Model', hLayModel]]));
    dict(hMlsD, hRoot, [['Standard', hMlsStd]]);
    dict(hPsetD, hRoot, psets.map(q => [dxfStr(q.name), q.h]));
    // thiết lập DVDCAD → mã AutoCAD: máy in (.pc3), khổ ISO (ngang), xoay 90° = dọc, vùng in (74), cờ 70: 4 giữa trang, 16 tỉ lệ chuẩn (75 = 0: vừa giấy), 32 + 128 in nét dày, 1024 cho Model
    const ISO = { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] };
    const DEV = { pdf: 'DWG To PDF.pc3', pdfgd: 'AutoCAD PDF (General Documentation).pc3', pdfhq: 'AutoCAD PDF (High Quality Print).pc3', pdfsm: 'AutoCAD PDF (Smallest File).pc3', pdfwm: 'AutoCAD PDF (Web and Mobile).pc3', dwfx: 'DWFx ePlot (XPS Compatible).pc3', dwf: 'DWF6 ePlot.pc3', defprn: 'Default Windows System Printer.pc3', png: 'PublishToWeb PNG.pc3', jpg: 'PublishToWeb JPG.pc3', plt: 'DesignJet 750C C4708B.pc3' };
    for(const q of psets){ const S = q.P, fit = S.fit !== false, sc = +S.scale > 0 ? +S.scale : 1; const PZ = A.PAPER_SIZES && A.PAPER_SIZES[S.paper];
      const pk = ISO[S.paper] ? S.paper : 'A3'; let [W, Hh] = ISO[pk]; if(PZ){ W = Math.max(PZ.w, PZ.h); Hh = Math.min(PZ.w, PZ.h); } else if(S.paper === 'custom' && S.cw > 0 && S.ch > 0){ W = Math.max(S.cw, S.ch); Hh = Math.min(S.cw, S.ch); }
      const media = A.paperMedia && (PZ || S.paper === 'custom') ? A.paperMedia(S.paper, S.cw, S.ch) : 'ISO_full_bleed_' + pk + '_(' + W.toFixed(2) + '_x_' + Hh.toFixed(2) + '_MM)';
      const dev = DEV[S.dev] || (/^sys:/.test(S.dev || '') ? S.dev.slice(4) : 'none_device');   // máy in Windows: tên máy in như AutoCAD ghi
      P(0, 'PLOTSETTINGS'); P(5, q.h); P(102, '{ACAD_REACTORS'); P(330, hPsetD); P(102, '}'); P(330, hPsetD); P(100, 'AcDbPlotSettings');
      P(1, dxfStr(q.name)); P(2, dev); P(4, media); P(6, ''); P(40, 0); P(41, 0); P(42, 0); P(43, 0); P(44, W); P(45, Hh); P(46, 0); P(47, 0); P(48, 0); P(49, 0); P(140, 0); P(141, 0);
      P(142, 1); P(143, fit ? 1 : sc); P(70, 1024 | 32 | (S.lw === false ? 0 : 128) | (S.center === false ? 0 : 4) | (fit ? 16 : 0)); P(72, 1); P(73, S.land === false ? 1 : 0); P(74, S.area === 'display' ? 0 : S.area === 'window' ? 4 : 1);
      P(7, S.ps === false ? '' : S.style === 'mono' ? 'monochrome.ctb' : S.style === 'gray' ? 'Grayscale.ctb' : ''); P(75, 0); P(147, fit ? 1 : 1 / sc); P(148, 0); P(149, 0); }
    P(0, 'ACDBDICTIONARYWDFLT'); P(5, hPsnD); P(102, '{ACAD_REACTORS'); P(330, hRoot); P(102, '}'); P(330, hRoot); P(100, 'AcDbDictionary'); P(281, 1); P(3, 'Normal'); P(350, hPsnNormal); P(100, 'AcDbDictionaryWithDefault'); P(340, hPsnNormal);
    P(0, 'ACDBPLACEHOLDER'); P(5, hPsnNormal); P(102, '{ACAD_REACTORS'); P(330, hPsnD); P(102, '}'); P(330, hPsnD);
    P(0, 'MLINESTYLE'); P(5, hMlsStd); P(102, '{ACAD_REACTORS'); P(330, hMlsD); P(102, '}'); P(330, hMlsD); P(100, 'AcDbMlineStyle'); P(2, 'Standard'); P(70, 0); P(3, ''); P(62, 256); P(51, 90); P(52, 90); P(71, 2); P(49, 0.5); P(62, 256); P(6, 'BYLAYER'); P(49, -0.5); P(62, 256); P(6, 'BYLAYER');
    const layout = (h, name, flags, tab, br, S, hv) => { P(0, 'LAYOUT'); P(5, h); P(102, '{ACAD_REACTORS'); P(330, hLayoutD); P(102, '}'); P(330, hLayoutD);
      P(100, 'AcDbPlotSettings'); P(1, ''); P(2, 'none_device'); P(4, S ? 'Custom_' + Math.round(S.x1 - S.x0) + 'x' + Math.round(S.y1 - S.y0) + '_mm' : ''); P(6, ''); P(40, S ? -S.x0 : 0); P(41, S ? -S.y0 : 0); P(42, 0); P(43, 0); P(44, S ? S.x1 - S.x0 : 0); P(45, S ? S.y1 - S.y0 : 0); P(46, 0); P(47, 0); P(48, 0); P(49, 0); P(140, 0); P(141, 0); P(142, 1); P(143, 1); P(70, name === 'Model' ? 1712 : 688); P(72, 1); P(73, 0); P(74, 5); P(7, ''); P(75, 16); P(147, 1); P(148, 0); P(149, 0);
      const E = S || ext; P(100, 'AcDbLayout'); P(1, dxfStr(name)); P(70, flags); P(71, tab); P(10, S ? S.x0 : 0); P(20, S ? S.y0 : 0); P(11, S ? S.x1 : 420); P(21, S ? S.y1 : 297); P(12, 0); P(22, 0); P(32, 0); P(14, E.x0); P(24, E.y0); P(34, 0); P(15, E.x1); P(25, E.y1); P(35, 0); P(146, 0); P(13, 0); P(23, 0); P(33, 0); P(16, 1); P(26, 0); P(36, 0); P(17, 0); P(27, 1); P(37, 0); P(76, 0); P(330, br); if(hv) P(331, hv); };
    layout(hLayModel, 'Model', 1, 0, hBRmodel); for(const Lp of lays) layout(Lp.hLay, Lp.name, 1, Lp.tab, Lp.hBR, Lp.sheet, Lp.sheet ? Lp.hVp : null);
    // khối động: từ điển mở rộng của khối gốc → ACAD_ENHANCEDBLOCK (đồ thị đánh giá, xem dynGraph) + chống purge;
    // bản chèn → AcDbBlockRepresentation → AcDbRepData (trỏ khối gốc) + AppDataCache → ACAD_ENHANCEDBLOCKDATA → XRECORD giá trị hiện tại theo id nút
    const own = (t, h, ow) => { P(0, t); P(5, h); P(102, '{ACAD_REACTORS'); P(330, ow); P(102, '}'); P(330, ow); };
    const hdict = (h, ow, entries, rx) => { if(rx) own('DICTIONARY', h, ow); else { P(0, 'DICTIONARY'); P(5, h); P(330, ow); } P(100, 'AcDbDictionary'); P(280, 1); P(281, 1); for(const [k, v] of entries){ P(3, k); P(360, v); } };
    const expr = (t, h, ow, id) => { P(0, t); P(5, h); P(330, ow); P(100, 'AcDbEvalExpr'); P(90, id); P(98, 33); P(99, 329); };
    const elem = nm => { P(100, 'AcDbBlockElement'); P(300, dxfStr(nm)); P(98, 33); P(99, 329); P(1071, 0); };
    const p3 = (c, q) => { P(c, q.x); P(c + 10, q.y); P(c + 20, 0); };
    // tham số 2 điểm: 4 grip (gốc, cuối, …) + 4 nhóm liên kết dời điểm (gốc X / Y, cuối X / Y)
    const pt2 = (b, e, grips, conns) => { P(100, 'AcDbBlockParameter'); P(280, 1); P(281, 0); P(100, 'AcDbBlock2PtParameter'); p3(1010, b); p3(1011, e); P(170, 4); for(const g of grips) P(91, g);
      conns.forEach((cs, k) => { P(171 + k, cs.length); for(const [id, nm] of cs){ P(92 + k, id); P(301 + k, nm); } }); P(177, 0); };
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), W0 = B => Math.max(B.bb.x1 - B.bb.x0, B.bb.y1 - B.bb.y0, 1);
    for(const B of dynBase.values()){ const G = B.g; if(!G) continue; const eh = x => x._hs || [], allH = B.ents.flatMap(eh);
      hdict(G.hXD, B.hBR, [['ACAD_ENHANCEDBLOCK', G.hG], ['AcDbDynamicBlockRoundTripPurgePreventer', G.hPP]]);
      const ins = G.N.map(n => G.E.map((e, k) => e[1] === n.i ? k : -1).filter(k => k >= 0)), outs = G.N.map(n => G.E.map((e, k) => e[0] === n.i ? k : -1).filter(k => k >= 0));
      const ends = a => a.length ? [a[0], a[a.length - 1]] : [-1, -1], nb = (a, k) => { const j = a.indexOf(k); return [j > 0 ? a[j - 1] : -1, j >= 0 && j < a.length - 1 ? a[j + 1] : -1]; };
      own('ACAD_EVALUATION_GRAPH', G.hG, G.hXD); P(100, 'AcDbEvalGraph'); P(96, G.N.length); P(97, G.N.length);
      for(const n of G.N){ P(91, n.i); P(93, 32); P(95, n.id); P(360, n.h); for(const v of [...ends(ins[n.i]), ...ends(outs[n.i])]) P(92, v); }   // nút: cạnh vào đầu / cuối, cạnh ra đầu / cuối
      G.E.forEach(([a, b, tc], k) => { P(92, k); P(93, 0); P(94, tc); P(91, a); P(91, b); for(const v of [...nb(ins[b], k), ...nb(outs[a], k), -1]) P(92, v); });   // cạnh: trước / sau trong danh sách vào, ra
      own('ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION', G.hPP, G.hXD); P(100, 'AcDbDynamicBlockPurgePreventer'); P(70, 1);
      const V = G.vis;
      if(V){ const hasV = B.ents.filter(x => Array.isArray(x.dvs));
        expr('BLOCKVISIBILITYPARAMETER', V.P.h, G.hG, V.P.id); elem('Visibility State'); P(100, 'AcDbBlockParameter'); P(280, 1); P(281, 0);
        P(100, 'AcDbBlock1PtParameter'); p3(1010, V.pt); P(93, V.Gr.id); P(170, 0); P(171, 0);
        P(100, 'AcDbBlockVisibilityParameter'); P(281, 1); P(301, 'Visibility1'); P(302, ''); P(91, 0);
        const all = hasV.flatMap(eh); P(93, all.length); for(const h of all) P(331, h);
        P(92, V.states.length); for(const st of V.states){ const hs = hasV.filter(x => x.dvs.includes(st)).flatMap(eh); P(303, dxfStr(st)); P(94, hs.length); for(const h of hs) P(332, h); P(95, 0); }
        expr('BLOCKVISIBILITYGRIP', V.Gr.h, G.hG, V.Gr.id); elem('Grip'); P(100, 'AcDbBlockGrip'); P(91, V.Lx.id); P(92, V.Ly.id); p3(1010, V.pt); P(280, 0); P(93, -1); P(100, 'AcDbBlockVisibilityGrip'); }
      for(const L of G.lin){
        expr('BLOCKLINEARPARAMETER', L.P.h, G.hG, L.P.id); elem(L.nm); pt2(L.b, L.e, [0, L.Gr.id, 0, 0], [[], [], [[L.Gr.id, 'DisplacementX']], [[L.Gr.id, 'DisplacementY']]]);
        P(100, 'AcDbBlockLinearParameter'); P(305, dxfStr(L.nm)); P(306, ''); P(140, 0); P(307, ''); P(96, 0); P(141, 0); P(142, 0); P(143, 0); P(175, 0);
        expr('BLOCKLINEARGRIP', L.Gr.h, G.hG, L.Gr.id); elem('End Grip'); P(100, 'AcDbBlockGrip'); P(91, L.Ex.id); P(92, L.Ey.id); p3(1010, L.e); P(280, 0); P(93, -1);
        P(100, 'AcDbBlockLinearGrip'); P(140, L.e.x - L.b.x); P(141, L.e.y - L.b.y); P(142, 0);
        if(L.S){ const hs = L.sel.flatMap(q => eh(q.x)), bd = L.sel.filter(q => q.idx && eh(q.x).length === 1), lp = { x: L.e.x + (L.e.x - L.b.x) * 0.15, y: L.e.y + (L.e.y - L.b.y) * 0.15 };
          expr('BLOCKSTRETCHACTION', L.S.h, G.hG, L.S.id); elem(L.snm); P(100, 'AcDbBlockAction'); P(70, 0); P(71, hs.length); for(const h of hs) P(330, h); p3(1010, lp);
          P(100, 'AcDbBlockStretchAction'); P(92, L.P.id); P(301, 'EndXDelta'); P(93, L.P.id); P(302, 'EndYDelta'); P(72, L.fr.length); for(const q of L.fr){ P(1011, q.x); P(1021, q.y); }
          P(73, bd.length); for(const q of bd){ P(331, eh(q.x)[0]); P(74, q.idx.length); for(const k of q.idx) P(94, k); } P(75, 0); P(140, 1); P(141, 0); P(280, 0); } }
      for(const F of G.flip){ const o = G.flip.filter(q => q !== F);
        expr('BLOCKFLIPPARAMETER', F.P.h, G.hG, F.P.id); elem(F.nm); pt2(F.b, F.e, [F.Gr.id, 0, 0, 0], [[], [], [], []]);
        P(100, 'AcDbBlockFlipParameter'); P(305, F.label); P(306, ''); P(307, 'Not flipped'); P(308, 'Flipped'); p3(1012, mid(F.b, F.e)); P(309, 'UpdatedFlip'); P(96, F.Gr.id);
        expr('BLOCKFLIPGRIP', F.Gr.h, G.hG, F.Gr.id); elem('Grip'); P(100, 'AcDbBlockGrip'); P(91, F.UBx.id); P(92, F.UBy.id); p3(1010, F.b); P(280, 0); P(93, -1);
        P(100, 'AcDbBlockFlipGrip'); P(140, F.e.x - F.b.x); P(141, F.e.y - F.b.y); P(142, 0); P(93, F.UF.id);
        // FLIP chọn mọi nét + tham số / grip khác + hành động STRETCH (lật cùng hình), danh sách id = tham số và hành động được chọn
        const objs = [...o.flatMap(q => [q.P, q.Gr]), ...G.lin.flatMap(L => [L.P, L.Gr]), ...(V ? [V.P, V.Gr] : [])], acts = G.lin.filter(L => L.S).map(L => L.S);
        const ids = [...acts.map(n => n.id), ...G.lin.map(L => L.P.id), ...o.map(q => q.P.id), ...(V ? [V.P.id] : [])], hs = [...objs.map(n => n.h), ...allH, ...acts.map(n => n.h)];
        const lp = F.ax === 'x' ? { x: F.b.x - W0(B) * 0.1, y: F.b.y } : { x: F.b.x, y: F.b.y - W0(B) * 0.1 };
        expr('BLOCKFLIPACTION', F.A.h, G.hG, F.A.id); elem(F.anm); P(100, 'AcDbBlockAction'); P(70, ids.length); for(const id of ids) P(91, id); P(71, hs.length); for(const h of hs) P(330, h); p3(1010, lp);
        P(100, 'AcDbBlockFlipAction'); for(const c of [92, 93, 94, 95]) P(c, F.P.id); P(301, 'Flip'); P(302, 'UpdatedFlip'); P(303, 'UpdatedBase'); P(304, 'UpdatedEnd'); }
      for(const n of G.N) if(n.t === LOC){ expr(LOC, n.h, G.hG, n.id); P(1, ''); if(n.v70){ P(70, 70); P(70, 0); } else { P(70, 40); P(140, 0); } P(100, 'AcDbBlockGripExpr'); P(91, n.of.id); P(300, n.nm); } }
    for(const ins of dynIns){ const B = ins.dyn, G = B.g, hRD = H(), hRep = H(), hAC = G ? H() : null, hEB = G ? H() : null;
      hdict(ins.hIX, ins.hI, [['AcDbBlockRepresentation', hRD]]);
      hdict(hRD, ins.hIX, [['AcDbRepData', hRep]].concat(G ? [['AppDataCache', hAC]] : []), true);
      own('ACDB_BLOCKREPRESENTATION_DATA', hRep, hRD); P(100, 'AcDbBlockRepresentationData'); P(70, 1); P(340, B.hBR);
      if(G){ const st = ins.st || {}, sx = ins.fl ? ins.fl[0] : 1, sy = ins.fl ? ins.fl[1] : 1, S = q => ({ x: q.x * sx, y: q.y * sy });
        const head = (a, b) => { P(100, 'AcDbXrecord'); P(280, 1); P(1071, a); P(1071, b); P(70, 25); P(70, 104); }, xr = [];   // giá trị đã đánh giá (sau lật / kéo giãn), toạ độ trong khối gốc
        if(G.vis){ const V = G.vis, s = st.st && V.states.includes(st.st) ? st.st : V.def; xr.push([V.P.id, () => { head(135625452, 184556386); p3(10, S(V.pt)); P(1, dxfStr(s)); }]); }
        for(const L of G.lin){ const lv = st.L && st.L[L.p.name] != null && isFinite(+st.L[L.p.name]) ? +st.L[L.p.name] : L.p.L0, e = { x: L.b.x + L.p.d.x * lv, y: L.b.y + L.p.d.y * lv };
          xr.push([L.P.id, () => { head(18597260, 25303744); p3(10, S(L.b)); p3(10, S(e)); P(10, 0); P(20, 0); P(30, -1); }]);
          if(L.S) xr.push([L.S.id, () => { head(6895636, 9291323); P(40, 0); }]); }
        for(const F of G.flip){ const on = F.ax === 'x' ? sx < 0 : sy < 0, O = F.ax === 'x' ? (q => ({ x: q.x, y: q.y * sy })) : (q => ({ x: q.x * sx, y: q.y }));   // trục lật bị lật theo tham số lật kia
          xr.push([F.P.id, () => { head(6887019, 9372877); p3(10, O(F.b)); p3(10, O(F.e)); P(10, 0); P(20, 0); P(30, -1); P(70, on ? 1 : 0); }]);
          xr.push([F.Gr.id, () => { head(575085, 763560); P(70, 0); P(70, on ? 1 : 0); }]); }
        xr.sort((a, b) => String(a[0]) < String(b[0]) ? -1 : 1); const hx = xr.map(() => H());
        hdict(hAC, hRD, [['ACAD_ENHANCEDBLOCKDATA', hEB]], true); hdict(hEB, hAC, xr.map((q, k) => [String(q[0]), hx[k]]), true);
        xr.forEach((q, k) => { own('XRECORD', hx[k], hEB); q[1](); }); } }
    // XCLIP: xdict của INSERT → ACAD_FILTER → SPATIAL (đỉnh WCS + ma trận nghịch đảo của INSERT, như AutoCAD)
    for(const X of xcl){ const c = xclipFor(X.R, X.m); const Mi = inv(X.m); if(!Mi) continue;
      let V = c.poly || [{ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y + c.h }];
      dict(X.hXD, X.hI, [['ACAD_FILTER', X.hFD]], true); dict(X.hFD, X.hXD, [['SPATIAL', X.hSF]], true);
      P(0, 'SPATIAL_FILTER'); P(5, X.hSF); P(102, '{ACAD_REACTORS'); P(330, X.hFD); P(102, '}'); P(330, X.hFD); P(100, 'AcDbFilter'); P(100, 'AcDbSpatialFilter');
      P(70, V.length); for(const v of V){ P(10, v.x); P(20, v.y); } P(210, 0); P(220, 0); P(230, 1); P(11, 0); P(21, 0); P(31, 0); P(71, X.R.on ? 1 : 0); P(72, 0); P(73, 0);
      for(const v of [Mi.a, Mi.c, 0, Mi.e, Mi.b, Mi.d, 0, Mi.f, 0, 0, 1, 0]) P(40, v);
      for(const v of [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]) P(40, v); }
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
