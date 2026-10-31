/* DVDCAD v6f — AutoLISP: tương thích với tiện ích viết cho AutoCAD (nạp sau dvd-lisp.js, dvd-lisp2.js)
   · (getvar) / (setvar): đủ biến hệ thống tiện ích hay đọc (DIMSCALE, CDATE, CTAB, ATTREQ, USERI1…); biến điểm trả danh sách
   · XDATA: (regapp), (entget e '("APP")) có nhóm -3, (entmod) / (entmake) ghi -3 — lưu ra DXF như AutoCAD
   · (ssget): bộ lọc logic -4 (<OR <AND <NOT <XOR, so sánh < > <= >= != *), "_WP" / "_CP" / "_F" với danh sách điểm, ":L"
   · (entmake): HATCH, BLOCK … ENDBLK (định nghĩa khối), INSERT kèm ATTRIB … SEQEND, DIMENSION thẳng / thẳng hàng
   · ActiveX: hằng số vlax-vb* / ac*, InsertBlock, GetAttributes, GetDynamicBlockProperties, AddHatch, AddDimAligned / Rotated,
     AddTable, AddSpline, AddMLeader, SelectionSets, ActiveSelectionSet, TrueColor, Preferences.Files, TextStyles, Layouts, ZoomExtents…
   · Hàm còn thiếu: vl-sort-i, layerstate-*, nentselp, initdia, vlax-tmatrix, vlax-map-collection, vlax-add-cmd… */
(function(){
  'use strict';
  if(!window.DVDLisp || !DVDLisp.ext || !DVDLisp.ax || DVDLisp._v6f) return; DVDLisp._v6f = true;
  const X = DVDLisp.ext, AX = DVDLisp.ax;
  const { BI, SPECIAL, G, ev, apply, Sym, LI, DP, Ename, SS, LispErr, T, mkInt, toReal, toInt, toStr, pt, lpt, L, nv, isNum, truthy, str, sym, entsOf, ename, entget, ME, typeName, ask, gc, getv, setv, parse, toFn } = X;
  const { VObj, Variant, SArr, METHODS, XGET, XPUT, XCOLL, entOf, toObj, vpt, unV, ptOf, commitRep, insertBlock, COLL, DOC, aci, aciOf, setAci, VT, VF, cleanV } = AX;
  const A = () => window.DVDAcad;
  const D2R = Math.PI / 180;
  const log = m => { try{ A().log(m); }catch(_){} };
  const fn = name => getv(sym(name));
  const wc = p => new RegExp('^(?:' + String(p).split(',').map(s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/`(.)/g, '\\$1').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/#/g, '\\d').replace(/@/g, '[A-Za-z]').replace(/~(.*)/, '(?!$1$).*')).join('|') + ')$', 'i');

  /* ==================================================================
     1) BIẾN HỆ THỐNG
     ================================================================== */
  const g0 = fn('GETVAR'), s0 = fn('SETVAR');
  const PTV = new Set(['EXTMIN', 'EXTMAX', 'LIMMIN', 'LIMMAX', 'INSBASE', 'LASTPOINT', 'VIEWCTR', 'UCSORG', 'UCSXDIR', 'UCSYDIR', 'VIEWDIR', 'SCREENSIZE', 'VSMAX', 'VSMIN', 'TARGET', 'SNAPBASE', 'SNAPUNIT', 'GRIDUNIT']);
  const julian = d => d.getTime() / 86400000 + 2440587.5;
  const t0 = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const DS = () => (A() && A().DS) || {};
  const viewH = () => { try{ return document.getElementById('cv').clientHeight / view.scale; }catch(_){ return 1000; } };
  const COMP = {
    DATE: () => julian(new Date()), TDCREATE: () => julian(t0), TDUPDATE: () => julian(new Date()), TDINDWG: () => (Date.now() - t0.getTime()) / 86400000, TDUSRTIMER: () => (Date.now() - t0.getTime()) / 86400000,
    CDATE: () => { const d = new Date(); return parseFloat(d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '.' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()) + String(d.getMilliseconds()).padStart(3, '0')); },
    MILLISECS: () => mkInt(Date.now() % 2147483647),
    ACADVER: () => '25.0s (DVDCAD)', PRODUCT: () => 'DVDCAD', PROGRAM: () => 'dvdcad', PLATFORM: () => (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'Windows',
    LOCALE: () => (window.DVDI18N && DVDI18N.lang === 'en') ? 'ENU' : 'VIT', SYSCODEPAGE: () => 'ANSI_1258', DWGCODEPAGE: () => 'ANSI_1258', MENUNAME: () => 'ACAD',
    ACADPREFIX: () => 'C:\\DVDCAD\\Support\\;', ROAMABLEROOTPREFIX: () => 'C:\\DVDCAD\\', LOCALROOTPREFIX: () => 'C:\\DVDCAD\\', MYDOCUMENTSPREFIX: () => 'C:\\DVDCAD\\Documents', TEMPPREFIX: () => 'C:\\DVDCAD\\Temp\\',
    DWGTITLED: () => mkInt(typeof currentName === 'string' && currentName && !/^Drawing\d*\./i.test(currentName) ? 1 : 0),
    CTAB: () => { try{ return isModelView() ? 'Model' : String(dwgLayouts[currentLayout].name); }catch(_){ return 'Model'; } },
    DIMSCALE: () => +(DS().scl || 1), DIMTXT: () => +(DS().txt || 2.5), DIMASZ: () => +(DS().asz || 1) * (DS().txt || 2.5) / 2.5, DIMSTYLE: () => String(DS().name || 'Standard'), DIMDEC: () => mkInt(DS().dec | 0),
    DIMLFAC: () => +(DS().lfac || 1), DIMEXE: () => +(DS().exe || 0.8), DIMEXO: () => +(DS().exo || 0.6), DIMGAP: () => +(DS().gap || 0.5), DIMCLRD: () => mkInt(0), DIMCLRE: () => mkInt(0), DIMCLRT: () => mkInt(0),
    CANNOSCALE: () => '1:' + ((A().ANNO && A().ANNO.N) || 1), CANNOSCALEVALUE: () => 1 / ((A().ANNO && A().ANNO.N) || 1),
    VIEWSIZE: () => viewH(), SCREENSIZE: () => { try{ const c = document.getElementById('cv'); return [c.clientWidth * 1.0, c.clientHeight * 1.0]; }catch(_){ return [1280.0, 720.0]; } },
    VSMIN: () => { const c = fn('GETVAR')('VIEWCTR'), h = viewH(); const p = L(c); return [nv(p[0]) - h, nv(p[1]) - h, 0.0]; },
    VSMAX: () => { const c = fn('GETVAR')('VIEWCTR'), h = viewH(); const p = L(c); return [nv(p[0]) + h, nv(p[1]) + h, 0.0]; },
  };
  const DEF = { ACADLSPASDOC: 0, ATTDIA: 0, ATTREQ: 1, ATTMODE: 1, AUNITS: 0, AUPREC: 0, LUPREC: 4, EXPERT: 0, FILEDIA: 1, CMDDIA: 1, PICKADD: 2, PICKAUTO: 5, PLINEWID: 0.0, PLINEGEN: 0, PEDITACCEPT: 0, QAFLAGS: 0,
    REGENMODE: 1, WORLDUCS: 1, ELEVATION: 0.0, THICKNESS: 0.0, LWDISPLAY: 0, MEASUREMENT: 1, SHORTCUTMENU: 11, SELECTIONPREVIEW: 3, MAXSORT: 1000, TRUSTEDPATHS: '', SECURELOAD: 0, LISPSYS: 0, ERRNO: 0,
    DIMZIN: 8, UNITMODE: 0, INSUNITS: 4, DELOBJ: 1, MIRRTEXT: 0, OFFSETDIST: -1.0, FILLETRAD: 0.0, CHAMFERA: 0.0, CHAMFERB: 0.0, TEXTEVAL: 0, DRAGMODE: 2, GRIDMODE: 0, SNAPANG: 0.0, PELLIPSE: 0,
    UCSFOLLOW: 0, UCSICON: 3, VISRETAIN: 1, XREFNOTIFY: 2, DEMANDLOAD: 3, PROXYNOTICE: 1, SAVETIME: 10, ISAVEPERCENT: 50, TILEMODE: 1, MAXACTVP: 64, PSLTSCALE: 1, MSLTSCALE: 1, PLQUIET: 0, BACKGROUNDPLOT: 0,
    LIMMIN: [0.0, 0.0], LIMMAX: [420.0, 297.0], INSBASE: [0.0, 0.0, 0.0], UCSORG: [0.0, 0.0, 0.0], UCSXDIR: [1.0, 0.0, 0.0], UCSYDIR: [0.0, 1.0, 0.0], VIEWDIR: [0.0, 0.0, 1.0], TARGET: [0.0, 0.0, 0.0],
    SNAPBASE: [0.0, 0.0], SNAPUNIT: [10.0, 10.0], GRIDUNIT: [10.0, 10.0], DWGPREFIX: '', DIMBLK: '', DIMADEC: 0, HPASSOC: 1, HPGAPTOL: 0.0, FIELDEVAL: 31, OSNAPCOORD: 2, SORTENTS: 127 };
  for(let i = 1; i <= 5; i++){ DEF['USERI' + i] = 0; DEF['USERR' + i] = 0.0; DEF['USERS' + i] = ''; }
  const UV = {};   // giá trị LISP đặt cho biến DVDCAD không quản lý
  const toPt = s => { const a = String(s).split(',').map(parseFloat); return a.every(isFinite) && a.length >= 2 ? a.map(Number) : null; };
  const fix = (k, v) => { if(typeof v === 'number' && Number.isInteger(v) && !/(PLINEWID|ELEVATION|THICKNESS|OFFSETDIST|FILLETRAD|CHAMFER|SNAPANG|USERR|HPGAPTOL)/.test(k)) return mkInt(v); return v; };
  BI('GETVAR', n => { const k = toStr(n).toUpperCase().replace(/^_/, '');
    if(COMP[k]) return COMP[k]();
    if(k in UV) return UV[k];
    let v = g0(n);
    if(v == null && k in DEF) v = fix(k, DEF[k]);
    if(typeof v === 'string' && PTV.has(k)){ const q = toPt(v); if(q) v = q.map(x => x * 1.0); }
    return v === undefined ? null : v; });
  BI('SETVAR', (n, v) => { const k = toStr(n).toUpperCase().replace(/^_/, '');
    const D = DS();
    if(k === 'DIMSCALE'){ D.scl = toReal(v); return v; } if(k === 'DIMTXT'){ D.txt = toReal(v); return v; } if(k === 'DIMDEC'){ D.dec = toInt(v); return v; } if(k === 'DIMLFAC'){ D.lfac = toReal(v); return v; }
    if(k === 'DIMEXE'){ D.exe = toReal(v); return v; } if(k === 'DIMEXO'){ D.exo = toReal(v); return v; } if(k === 'DIMGAP'){ D.gap = toReal(v); return v; }
    if(k === 'CANNOSCALE'){ const m = /1\s*:\s*([\d.]+)/.exec(toStr(v)); if(m && A().setAnnoScale) A().setAnnoScale(+m[1]); return v; }
    if(COMP[k]) throw new LispErr('AutoCAD variable setting rejected: "' + k + '" (chỉ đọc)');
    if(A().sysvar && A().sysvar.get(k) !== undefined){ const val = Array.isArray(v) ? v.map(nv).join(',') : v; return s0(n, val); }
    UV[k] = v; return v; });

  /* ==================================================================
     2) XDATA — regapp, entget với ứng dụng, entmod / entmake nhóm -3
     ================================================================== */
  const APPS = new Set(['ACAD']);
  A().regApps = () => [...APPS];
  BI('REGAPP', n => { const s = toStr(n).toUpperCase(); if(!s || /[<>\/\\":;?*|,=`]/.test(s)) return null; if(APPS.has(s)) return null; APPS.add(s); return s; });
  const tbl0 = fn('TBLSEARCH');
  BI('TBLSEARCH', (t, n, nx) => { const tb = toStr(t).toUpperCase(); if(tb === 'APPID'){ const s = toStr(n).toUpperCase(); return APPS.has(s) ? [new DP(mkInt(0), 'APPID'), new DP(mkInt(2), s), new DP(mkInt(70), mkInt(0))] : null; }
    if(tb === 'STYLE'){ const TS = A().TS && A().TS.list || { Standard: {} }; const k = Object.keys(TS).find(x => x.toUpperCase() === toStr(n).toUpperCase()); if(!k) return null; const st = TS[k] || {}; return [new DP(mkInt(0), 'STYLE'), new DP(mkInt(2), k), new DP(mkInt(70), mkInt(0)), new DP(mkInt(40), +(st.h || 0)), new DP(mkInt(41), +(st.wf || 1)), new DP(mkInt(3), String(st.font || 'txt.shx'))]; }
    if(tb === 'LTYPE'){ const LT = A().ltNames ? A().ltNames() : ['CONTINUOUS']; const k = LT.find(x => x.toUpperCase() === toStr(n).toUpperCase()); return k ? [new DP(mkInt(0), 'LTYPE'), new DP(mkInt(2), k), new DP(mkInt(70), mkInt(0))] : null; }
    if(tb === 'DIMSTYLE'){ const nm = String(DS().name || 'Standard'); return toStr(n).toUpperCase() === nm.toUpperCase() ? [new DP(mkInt(0), 'DIMSTYLE'), new DP(mkInt(2), nm), new DP(mkInt(40), +(DS().scl || 1)), new DP(mkInt(140), +(DS().txt || 2.5))] : null; }
    return tbl0(t, n, nx); });
  // danh sách -3 của đối tượng theo mẫu tên ứng dụng
  const xdList = (e, pats) => { if(!e || !e.xd || !e.xd.length) return null; const res = pats.map(p => wc(p)); const out = [];
    for(const [app, items] of e.xd){ if(!res.some(r => r.test(app))) continue;
      out.push([app].concat(items.map(([c, v]) => (c >= 1010 && c <= 1013) ? [mkInt(c), +v[0], +v[1], +(v[2] || 0)] : new DP(mkInt(c), (c === 1070 || c === 1071) ? mkInt(v) : v)))); }
    return out.length ? [mkInt(-3)].concat(out) : null; };
  // đọc -3 trong danh sách DXF của LISP
  const xdParse = al => { const g = L(al).find(p => Array.isArray(p) && isNum(p[0]) && nv(p[0]) === -3); if(!g) return null; const out = [];
    for(const a of g.slice(1)){ const l = L(a); const app = toStr(l[0]).toUpperCase(); if(!APPS.has(app)) throw new LispErr('Ứng dụng "' + app + '" chưa đăng ký (regapp)'); const items = [];
      for(const p of l.slice(1)){ if(p instanceof DP){ const c = toInt(p.a); const v = p.d; items.push([c, isNum(v) ? (c === 1070 || c === 1071 ? toInt(v) : toReal(v)) : toStr(v)]); } else if(Array.isArray(p)){ const c = toInt(p[0]); items.push([c, p.slice(1).map(nv).concat([0, 0]).slice(0, 3)]); } }
      out.push([app, items]); }
    return out; };
  const setXd = (e, xd) => { const m = new Map((e.xd || []).map(x => [x[0], x[1]])); for(const [app, items] of xd){ if(items.length) m.set(app, items); else m.delete(app); } const a = [...m.entries()]; if(a.length) e.xd = a; else delete e.xd; };
  const eg0 = fn('ENTGET');
  BI('ENTGET', (en, apps) => { const r = eg0(en); if(!r || apps == null) return r; const l = entsOf(en); const e = l.find(x => x.xd) || l[0]; const x = xdList(e, L(apps).map(toStr)); return x ? r.concat([x]) : r; });
  const em0 = fn('ENTMOD');
  BI('ENTMOD', async al => { const xd = xdParse(al); const base = L(al).filter(p => !(Array.isArray(p) && isNum(p[0]) && nv(p[0]) === -3)); const r = await em0(base); if(!r) return r;
    if(xd){ const en = gc(al, -1); const l = en instanceof Ename ? entsOf(en) : []; if(l.length){ const e = l[0]; const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; setXd(w, xd); A().commit({ rep: [[e, w]] }); } }
    return al; });

  /* ==================================================================
     3) entmake: HATCH, BLOCK … ENDBLK, INSERT + ATTRIB … SEQEND, DIMENSION; -3
     ================================================================== */
  const emk0 = fn('ENTMAKE');
  let BLK = null, INS = null;   // đang định nghĩa khối / đang thêm thuộc tính cho INSERT
  const capture = async f => { const A0 = A(); const c0 = A0.commit; const got = []; A0.commit = ch => { if(ch && ch.add) got.push(...ch.add); return true; }; try{ await f(); } finally { A0.commit = c0; } return got; };
  const P2 = v => { const l = L(v); return { x: nv(l[0]), y: nv(l[1]) }; };
  async function makeOne(al){
    const ty = String(gc(al, 0) || '').toUpperCase();
    if(ty === 'HATCH'){
      // biên: các vòng 92 với cạnh 72 = 1 (đoạn thẳng: 10, 11) hoặc vòng đa tuyến (72 = 1 có bulge, 93 đỉnh, 10)
      const loops = []; let cur = null, poly = false, inPolyVerts = 0; const all = L(al);
      for(let i = 0; i < all.length; i++){ const p = all[i]; const c = p instanceof DP ? nv(p.a) : Array.isArray(p) ? nv(p[0]) : null; const v = p instanceof DP ? p.d : Array.isArray(p) ? p.slice(1) : null;
        if(c === 92){ cur = []; loops.push(cur); poly = (toInt(v) & 2) !== 0; continue; }
        if(!cur) continue;
        if(c === 10 && Array.isArray(p)){ cur.push({ x: nv(v[0]), y: nv(v[1]) }); continue; }
        if(c === 11 && Array.isArray(p) && !poly){ continue; } }
      const lp = loops.map(l => l.filter((q, i) => i === 0 || Math.hypot(q.x - l[i - 1].x, q.y - l[i - 1].y) > 1e-9)).filter(l => l.length >= 3);
      if(!lp.length) return null;
      const pat = String(gc(al, 2) || 'SOLID').toUpperCase(); const e = A().newProps({ type: 'HATCH', loops: lp, solid: pat === 'SOLID', pat: (A().PATS && A().PATS[pat]) ? pat : 'SOLID', psc: gc(al, 41) != null ? toReal(gc(al, 41)) : 1, pang: gc(al, 52) != null ? toReal(gc(al, 52)) / D2R : 0 });
      const lay = gc(al, 8); if(typeof lay === 'string'){ if(!A().layerNames().includes(lay)) A().addLayer(lay); e.layer = lay; if(e.bl) e.col = A().layerHex(lay); }
      const c62 = gc(al, 62); if(c62 != null){ const n = toInt(c62); if(n > 0 && n < 256){ delete e.bl; e.col = aci(n); } }
      A().commit({ add: [e] }); return e; }
    if(ty === 'DIMENSION'){
      const p13 = gc(al, 13), p14 = gc(al, 14), p10 = gc(al, 10); if(!p13 || !p14) return null; const a = P2(p13), b = P2(p14), d = p10 ? P2(p10) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const kind = (toInt(gc(al, 70) || mkInt(0)) & 7) === 1 ? 'DIMALIGNED' : 'DIMLINEAR';
      const got = await capture(() => X.ev(parse('(command "_.' + kind + '" (list ' + a.x + ' ' + a.y + ') (list ' + b.x + ' ' + b.y + ') (list ' + d.x + ' ' + d.y + '))')[0]));
      if(got.length){ A().commit({ add: got }); return got[0]; } return null; }
    const r = await emk0(al); if(!r) return null; const a = ME(); return a[a.length - 1] || null;
  }
  BI('ENTMAKE', async al => { if(al == null){ if(BLK){ BLK = null; } return null; }
    const ty = String(gc(al, 0) || '').toUpperCase(); const xd = xdParse(al);
    if(ty === 'BLOCK'){ BLK = { name: toStr(gc(al, 2) || ''), base: gc(al, 10) ? P2(gc(al, 10)) : { x: 0, y: 0 }, ents: [] }; return al; }
    if(ty === 'ENDBLK'){ if(!BLK) return null; const B = BLK; BLK = null; if(!B.name || !B.ents.length) return null; A().makeBlock(B.ents, B.base, B.name.replace(/[<>\/\\":;?*|=`]/g, '_'), 'retain'); return B.name; }
    if(ty === 'ATTDEF' && BLK){ const p = gc(al, 10) ? P2(gc(al, 10)) : { x: 0, y: 0 }; const tag = toStr(gc(al, 2) || 'TAG').toUpperCase();
      BLK.ents.push(A().newProps({ type: 'TEXT', x: p.x, y: p.y, h: gc(al, 40) != null ? toReal(gc(al, 40)) : 2.5, rot: gc(al, 50) != null ? toReal(gc(al, 50)) / D2R : 0, text: tag, ha: 'left', va: 'alphabetic', attdef: { tag, prompt: toStr(gc(al, 3) || tag), def: toStr(gc(al, 1) || '') } })); return al; }
    if(ty === 'ATTRIB' && INS){ INS.att.set(toStr(gc(al, 2) || '').toUpperCase(), toStr(gc(al, 1) || '')); return al; }
    if(ty === 'SEQEND' && INS){ const I = INS; INS = null; const grp = I.ents[0] && I.ents[0].grp; if(grp){ const rep = []; for(const e of ME().filter(x => x.grp === grp && x.att)){ if(I.att.has(String(e.att).toUpperCase())){ const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; w.text = I.att.get(String(e.att).toUpperCase()); rep.push([e, w]); } } if(rep.length) A().commit({ rep }); } return al; }
    if(BLK){ const got = await capture(() => makeOne(al)); BLK.ents.push(...got); return got.length ? al : null; }
    const e = await makeOne(al); if(!e) return null;
    if(ty === 'INSERT' && toInt(gc(al, 66) || mkInt(0)) === 1){ const grp = e.grp; INS = { ents: grp ? ME().filter(x => x.grp === grp) : [e], att: new Map() }; }
    if(xd){ const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; setXd(w, xd); A().commit({ rep: [[e, w]] }); }
    return al; });
  BI('ENTMAKEX', async al => { const n0 = ME().length; const r = await fn('ENTMAKE')(al); if(!r) return null; if(BLK) return null; const a = ME(); return a.length > n0 ? ename(a[n0]) : (a.length ? ename(a[a.length - 1]) : null); });

  /* ==================================================================
     4) ssget: bộ lọc đầy đủ (-4 logic / so sánh), WP / CP / F với danh sách điểm
     ================================================================== */
  const ss0 = fn('SSGET');
  const ptInPoly = (p, P) => { let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ if(((P[i].y > p.y) !== (P[j].y > p.y)) && (p.x < (P[j].x - P[i].x) * (p.y - P[i].y) / (P[j].y - P[i].y) + P[i].x)) c = !c; } return c; };
  const segX = (a, b, c, d) => { const r = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x); if(Math.abs(r) < 1e-12) return false; const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / r, u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / r; return t >= 0 && t <= 1 && u >= 0 && u <= 1; };
  const bbOf = e => typeof entBBox === 'function' ? entBBox(e) : null;
  const corners = b => [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }];
  const hitsPath = (b, P, closed) => { const C = corners(b); for(let i = 0; i < P.length - (closed ? 0 : 1); i++){ const a = P[i], q = P[(i + 1) % P.length]; for(let k = 0; k < 4; k++) if(segX(a, q, C[k], C[(k + 1) % 4])) return true; if(a.x >= b.x0 && a.x <= b.x1 && a.y >= b.y0 && a.y <= b.y1) return true; } return false; };
  const visibleE = e => { const LS = A().LS; const ly = e.layer || '0'; return !e.vh && !(LS && (LS.off.has(ly) || LS.frozen.has(ly))); };
  // so khớp danh sách DXF của đối tượng với bộ lọc
  function cmpVal(op, a, b){ if(a == null) return op === '!=' || op === '/=' || op === '<>';
    if(Array.isArray(b)){ const A0 = L(a).map(nv), B0 = L(b).map(nv); const ops = String(op).split(','); return B0.every((v, i) => cmpVal(ops[i] || ops[0], A0[i], v)); }
    if(isNum(b) && isNum(a)){ const x = nv(a), y = nv(b); switch(op){ case '*': return true; case '=': return Math.abs(x - y) < 1e-9; case '!=': case '/=': case '<>': return Math.abs(x - y) >= 1e-9; case '<': return x < y; case '<=': return x <= y; case '>': return x > y; case '>=': return x >= y; case '&': return (x & y) !== 0; case '&=': return (x & y) === y; } return false; }
    const sa = String(a), sb = String(b); if(op === '*') return true; if(op === '!=' || op === '/=' || op === '<>') return !wc(sb).test(sa); return wc(sb).test(sa); }
  function filterTest(fl){
    const items = L(fl).map(p => p instanceof DP ? { c: nv(p.a), v: p.d } : Array.isArray(p) ? { c: nv(p[0]), v: p.slice(1) } : null).filter(Boolean);
    let i = 0;
    const parseSeq = end => { const out = []; while(i < items.length){ const it = items[i];
        if(it.c === -4){ const s = String(it.v).toUpperCase().trim();
          if(s.endsWith('>') && s.length > 1 && /^(AND|OR|XOR|NOT)>$/.test(s)){ if(end === s){ i++; return out; } throw new LispErr('bộ lọc ssget sai: ' + s); }
          if(/^<(AND|OR|XOR|NOT)$/.test(s)){ i++; const kind = s.slice(1); const kids = parseSeq(kind + '>'); out.push({ kind, kids }); continue; }
          i++; const nx = items[i++]; if(nx) out.push({ kind: 'CMP', op: s, c: nx.c, v: nx.v }); continue; }
        i++; out.push({ kind: 'CMP', op: '=', c: it.c, v: it.v }); }
      return out; };
    const tree = parseSeq(null);
    const evalNode = (n, al) => { if(n.kind === 'AND') return n.kids.every(k => evalNode(k, al)); if(n.kind === 'OR') return n.kids.some(k => evalNode(k, al)); if(n.kind === 'XOR') return n.kids.filter(k => evalNode(k, al)).length === 1; if(n.kind === 'NOT') return !n.kids.every(k => evalNode(k, al));
      if(n.c === -3){ const apps = L(n.v).map(x => toStr(L(x)[0])); const x3 = L(al).find(p => Array.isArray(p) && isNum(p[0]) && nv(p[0]) === -3); if(!x3) return false; return apps.every(a => x3.slice(1).some(g => wc(a).test(toStr(L(g)[0])))); }
      if(n.c === 410){ return cmpVal(n.op, 'Model', n.v); }
      if(n.c === 62 && !L(al).some(p => p instanceof DP && nv(p.a) === 62)) return cmpVal(n.op, mkInt(256), n.v);
      if(n.c === 6 && !L(al).some(p => p instanceof DP && nv(p.a) === 6)) return cmpVal(n.op, 'BYLAYER', n.v);
      const vals = L(al).filter(p => (p instanceof DP ? nv(p.a) : Array.isArray(p) ? nv(p[0]) : null) === n.c).map(p => p instanceof DP ? p.d : p.slice(1));
      if(!vals.length) return n.op === '!=' || n.op === '/=' || n.op === '<>';
      return vals.some(v => cmpVal(n.op, v, n.v)); };
    return en => { let al; try{ al = fn('ENTGET')(en, ['*']); }catch(_){ return false; } if(!al) return false; return tree.every(n => evalNode(n, al)); };
  }
  const uniqEn = ents => { const seen = new Set(), out = []; for(const e of ents){ const en = ename(e); if(seen.has(en.id)) continue; seen.add(en.id); out.push(en); } return out; };
  BI('SSGET', async (...args) => {
    let mode = null, fl = null, pts = [], plist = null;
    for(const a of args){ if(typeof a === 'string'){ mode = a.replace(/^_/, '').toUpperCase(); continue; }
      if(Array.isArray(a) && a.length && a.some(x => x instanceof DP)){ fl = a; continue; }
      if(Array.isArray(a) && a.length && a.every(x => Array.isArray(x) && x.length >= 2 && x.every(isNum))){ plist = a.map(P2); continue; }
      if(Array.isArray(a) && a.length >= 2 && a.every(isNum)){ pts.push(P2(a)); continue; } }
    const test = fl ? filterTest(fl) : () => true;
    const md = mode ? mode.replace(/^[+.]+/, '') : null;
    let ents = null;
    if(md && /^(WP|CP|F)$/.test(md) && plist){ const P = plist;
      ents = ME().filter(e => { if(!visibleE(e)) return false; const b = bbOf(e); if(!b) return false; if(md === 'WP') return corners(b).every(q => ptInPoly(q, P)); if(md === 'F') return hitsPath(b, P, false); return corners(b).some(q => ptInPoly(q, P)) || hitsPath(b, P, true); }); }
    else if(md === 'X' || md === 'A') ents = ME();
    else if(md === ':L' || md === 'L:'){ const r = await ss0(); if(!r) return null; ents = r.l.flatMap(entsOf).filter(e => !A().isLocked(e)); }
    if(ents){ const out = uniqEn(ents).filter(test); return out.length ? new SS(out) : null; }
    // các kiểu còn lại: để bản gốc chọn (không bộ lọc), rồi lọc theo bộ lọc đầy đủ
    const passed = args.filter(a => a !== fl);
    const r = await ss0(...passed); if(!r || !fl) return r; const out = r.l.filter(test); return out.length ? new SS(out) : null; });

  /* ==================================================================
     5) ActiveX bổ sung
     ================================================================== */
  // hằng số kiểu dữ liệu và enum hay dùng
  const CONST = { 'VLAX-VBEMPTY': 0, 'VLAX-VBNULL': 1, 'VLAX-VBINTEGER': 2, 'VLAX-VBLONG': 3, 'VLAX-VBSINGLE': 4, 'VLAX-VBDOUBLE': 5, 'VLAX-VBCURRENCY': 6, 'VLAX-VBDATE': 7, 'VLAX-VBSTRING': 8, 'VLAX-VBOBJECT': 9, 'VLAX-VBERROR': 10, 'VLAX-VBBOOLEAN': 11, 'VLAX-VBVARIANT': 12, 'VLAX-VBDECIMAL': 14, 'VLAX-VBBYTE': 17, 'VLAX-VBARRAY': 8192,
    ACBYBLOCK: 0, ACRED: 1, ACYELLOW: 2, ACGREEN: 3, ACCYAN: 4, ACBLUE: 5, ACMAGENTA: 6, ACWHITE: 7, ACBYLAYER: 256,
    ACSELECTIONSETWINDOW: 0, ACSELECTIONSETCROSSING: 1, ACSELECTIONSETPREVIOUS: 3, ACSELECTIONSETLAST: 4, ACSELECTIONSETALL: 5, ACSELECTIONSETFENCE: 2, ACSELECTIONSETWINDOWPOLYGON: 6, ACSELECTIONSETCROSSINGPOLYGON: 7,
    ACHATCHPATTERNTYPEUSERDEFINED: 0, ACHATCHPATTERNTYPEPREDEFINED: 1, ACHATCHPATTERNTYPECUSTOMDEFINED: 2, ACHATCHSTYLENORMAL: 0, ACHATCHSTYLEOUTER: 1, ACHATCHSTYLEIGNORE: 2,
    ACEXTENDNONE: 0, ACEXTENDTHISENTITY: 1, ACEXTENDOTHERENTITY: 2, ACEXTENDBOTH: 3, ACACTIVEVIEWPORT: 0, ACALLVIEWPORTS: 1,
    ACMODELSPACE: 1, ACPAPERSPACE: 0, ACALIGNMENTLEFT: 0, ACALIGNMENTCENTER: 1, ACALIGNMENTRIGHT: 2, ACALIGNMENTALIGNED: 3, ACALIGNMENTMIDDLE: 4, ACALIGNMENTFIT: 5, ACALIGNMENTTOPLEFT: 6, ACALIGNMENTTOPCENTER: 7, ACALIGNMENTTOPRIGHT: 8, ACALIGNMENTMIDDLELEFT: 9, ACALIGNMENTMIDDLECENTER: 10, ACALIGNMENTMIDDLERIGHT: 11, ACALIGNMENTBOTTOMLEFT: 12, ACALIGNMENTBOTTOMCENTER: 13, ACALIGNMENTBOTTOMRIGHT: 14,
    ACATTACHMENTPOINTTOPLEFT: 1, ACATTACHMENTPOINTTOPCENTER: 2, ACATTACHMENTPOINTTOPRIGHT: 3, ACATTACHMENTPOINTMIDDLELEFT: 4, ACATTACHMENTPOINTMIDDLECENTER: 5, ACATTACHMENTPOINTMIDDLERIGHT: 6, ACATTACHMENTPOINTBOTTOMLEFT: 7, ACATTACHMENTPOINTBOTTOMCENTER: 8, ACATTACHMENTPOINTBOTTOMRIGHT: 9,
    ACLNWTBYLAYER: -1, ACLNWTBYBLOCK: -2, ACLNWTBYLWDEFAULT: -3, ACLNWT000: 0, ACLNWT013: 13, ACLNWT018: 18, ACLNWT025: 25, ACLNWT030: 30, ACLNWT035: 35, ACLNWT050: 50, ACLNWT070: 70, ACLNWT100: 100,
    ACCOLORMETHODBYLAYER: 192, ACCOLORMETHODBYBLOCK: 193, ACCOLORMETHODBYRGB: 194, ACCOLORMETHODBYACI: 195, ACLEFTTORIGHT: 1, ACTOPTOBOTTOM: 3, ACMIDDLECENTER: 5, ACTABLETOPTOBOTTOM: 0, ACTABLEBOTTOMTOTOP: 1,
    ACZOOMSCALEDABSOLUTE: 0, ACZOOMSCALEDRELATIVE: 1, ACZOOMSCALEDRELATIVEPSPACE: 2, ACNATIVE: 36, ACR2018_DWG: 64, ACR2013_DWG: 60, ACR2010_DWG: 48, ACR2007_DWG: 36, ACR2004_DWG: 24, ACR2000_DWG: 12, ACR2018_DXF: 65, ACR2013_DXF: 61, ACR2010_DXF: 49, ACR2007_DXF: 37, ACR2004_DXF: 25, ACR2000_DXF: 13,
    ACCENTER: 1, ACOK: 1, ACON: 1, ACOFF: 0, ACTRUE: 1, ACFALSE: 0, ACUNKNOWN: -1 };
  for(const [k, v] of Object.entries(CONST)){ const s = k.startsWith('VLAX-') ? k : k; G.set(s, Number.isInteger(v) ? mkInt(v) : v); }

  // tập chọn ActiveX
  const SSETS = new Map();
  const ssObj = n => new VObj('sset', n);
  const ssEnts = o => (SSETS.get(o.ref) || []).filter(en => entsOf(en).length);
  // màu ActiveX (AcCmColor)
  const colorObj = e => new VObj('color', { e: e ? ename(e) : null, method: e ? (e.bl ? 192 : 195) : 195, aci: e ? aciOf(e) : 7, rgb: e && !e.bl ? String(e.col || '#ffffff') : '#ffffff' });
  const hexToRgb = h => { const s = String(h || '#ffffff').replace('#', ''); return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0]; };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x | 0)).toString(16).padStart(2, '0')).join('');
  // thuộc tính khối
  // thuộc tính là một nét trong cụm khối: tham chiếu riêng nét đó (không phải cả khối)
  let lidSeq = 0; const attObj = e => { if(!e._lid) e._lid = 'A' + (++lidSeq) + '_' + Date.now().toString(36); return new VObj('attrib', new Ename(e._lid)); };
  const blkDefItem = name => new VObj('item', { coll: 'Blocks', name });
  const tsItem = name => new VObj('item', { coll: 'TextStyles', name });

  XCOLL.push((o, n) => { if(n === 'TextStyles'){ const TS = A().TS && A().TS.list; return Object.keys(TS || { Standard: 1 }).map(tsItem); }
    if(n === 'SelectionSets') return [...SSETS.keys()].map(ssObj);
    if(n === 'DimStyles') return [new VObj('item', { coll: 'DimStyles', name: String(DS().name || 'Standard') })];
    if(n === 'RegisteredApplications') return [...APPS].map(a => new VObj('item', { coll: 'RegisteredApplications', name: a }));
    return null; });
  XGET.push((o, p) => {
    if(o.kind === 'app'){ if(p === 'PREFERENCES') return new VObj('prefs'); if(p === 'FULLNAME') return 'C:\\DVDCAD\\DVDCAD.exe'; if(p === 'PATH') return 'C:\\DVDCAD'; if(p === 'CAPTION') return document.title; if(p === 'VISIBLE') return VT; if(p === 'WINDOWSTATE') return mkInt(3); if(p === 'LOCALEID') return mkInt(1066); }
    if(o.kind === 'prefs'){ if(p === 'FILES') return new VObj('prefs-files'); if(p === 'DISPLAY' || p === 'OPENSAVE' || p === 'SYSTEM' || p === 'USER' || p === 'DRAFTING' || p === 'SELECTION' || p === 'OUTPUT' || p === 'PROFILES') return new VObj('prefs-x', p); }
    if(o.kind === 'prefs-files'){ if(p === 'SUPPORTPATH') return 'C:\\DVDCAD\\Support'; if(p === 'TEMPFILEPATH') return 'C:\\DVDCAD\\Temp\\'; if(p === 'PRINTERCONFIGPATH' || p === 'PRINTERSTYLESHEETPATH' || p === 'TEMPLATEDWGPATH' || p === 'TOOLPALETTEPATH' || p === 'AUTOSAVEPATH') return 'C:\\DVDCAD\\Support'; if(p === 'TRUSTEDPATHS') return ''; return ''; }
    if(o.kind === 'prefs-x') return p === 'ACTIVEPROFILE' ? '<<DVDCAD>>' : mkInt(0);
    if(o.kind === 'doc'){ if(p === 'ACTIVESELECTIONSET'){ const pre = [...(window.selEnts || [])]; SSETS.set('ACTIVESELECTIONSET', uniqEn(pre)); return ssObj('ACTIVESELECTIONSET'); }
      if(p === 'SELECTIONSETS') return COLL('SelectionSets'); if(p === 'ACTIVEDIMSTYLE') return new VObj('item', { coll: 'DimStyles', name: String(DS().name || 'Standard') });
      if(p === 'ACTIVETEXTSTYLE') return tsItem(A().TS ? A().TS.cur : 'Standard'); if(p === 'ACTIVELINETYPE') return new VObj('item', { coll: 'Linetypes', name: 'ByLayer' });
      if(p === 'SAVED') return VT; if(p === 'READONLY') return VF; if(p === 'ACTIVEUCS') return new VObj('item', { coll: 'UserCoordinateSystems', name: 'World' }); if(p === 'ACTIVEVIEWPORT') return new VObj('item', { coll: 'Viewports', name: '*Active' });
      if(p === 'LIMITS') return new Variant(8197, new SArr(5, 0, 3, [0, 0, 420, 297])); if(p === 'HWND' || p === 'WINDOWSTATE') return mkInt(0);
      if(p === 'PATH'){ try{ const fp = window.DVDDesktop && DVDDesktop.currentPath && DVDDesktop.currentPath(); return fp ? String(fp).replace(/[\\/][^\\/]*$/, '') : ''; }catch(_){ return ''; } } }
    if(o.kind === 'sset'){ const l = ssEnts(o); if(p === 'COUNT') return mkInt(l.length); if(p === 'NAME') return o.ref; }
    if(o.kind === 'color'){ const c = o.ref, rgb = hexToRgb(c.rgb); if(p === 'COLORINDEX') return mkInt(c.method === 192 ? 256 : c.method === 193 ? 0 : c.aci); if(p === 'COLORMETHOD') return mkInt(c.method); if(p === 'RED') return mkInt(rgb[0]); if(p === 'GREEN') return mkInt(rgb[1]); if(p === 'BLUE') return mkInt(rgb[2]); if(p === 'ENTITYCOLOR') return mkInt(((c.method & 0xff) << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]); if(p === 'COLORNAME' || p === 'BOOKNAME') return ''; }
    if(o.kind === 'attrib'){ const e = entsOf(o.ref)[0]; if(!e) throw new LispErr('Automation Error. Object was erased'); if(p === 'TAGSTRING') return String(e.att || ''); if(p === 'TEXTSTRING') return String(e.text || ''); if(p === 'PROMPTSTRING') return String(e.attp || e.att || ''); if(p === 'HEIGHT') return e.h || 2.5; if(p === 'INSERTIONPOINT' || p === 'TEXTALIGNMENTPOINT') return vpt({ x: e.x, y: e.y }); if(p === 'ROTATION') return (e.rot || 0) * D2R; if(p === 'LAYER') return e.layer || '0'; if(p === 'INVISIBLE') return e.ainv ? VT : VF; if(p === 'CONSTANT') return e.acon ? VT : VF; if(p === 'OBJECTNAME') return 'AcDbAttribute'; if(p === 'HANDLE') return String(o.ref.id); if(p === 'STYLENAME') return e.style || 'Standard'; if(p === 'COLOR') return mkInt(aciOf(e)); }
    if(o.kind === 'hatchnew'){ const w = o.ref; if(p === 'PATTERNNAME') return String(w.pat || 'SOLID'); if(p === 'PATTERNSCALE') return +(w.psc || 1); if(p === 'PATTERNANGLE') return (w.pang || 0) * D2R; if(p === 'NUMBEROFLOOPS') return mkInt(0); if(p === 'LAYER') return w.layer || '0'; if(p === 'OBJECTNAME') return 'AcDbHatch'; }
    if(o.kind === 'dynprop'){ const d = o.ref; if(p === 'PROPERTYNAME') return d.name; if(p === 'VALUE') return new Variant(8, d.value); if(p === 'READONLY') return d.ro ? VT : VF; if(p === 'ALLOWEDVALUES') return d.allowed ? new Variant(8204, new SArr(12, 0, d.allowed.length - 1, d.allowed.map(x => new Variant(8, x)))) : null; if(p === 'DESCRIPTION') return ''; if(p === 'SHOW') return VT; if(p === 'UNITSTYPE') return mkInt(0); }
    if(o.kind === 'item'){ const it = o.ref;
      if(it.coll === 'TextStyles'){ const st = (A().TS && A().TS.list[it.name]) || {}; if(p === 'FONTFILE') return String(st.font || 'txt.shx'); if(p === 'HEIGHT') return +(st.h || 0); if(p === 'WIDTH') return +(st.wf || 1); if(p === 'OBLIQUEANGLE') return +(st.obl || 0) * D2R; if(p === 'BIGFONTFILE') return String(st.big || ''); if(p === 'LASTHEIGHT') return 2.5; if(p === 'TEXTGENERATIONFLAG') return mkInt(0); }
      if(it.coll === 'Blocks'){ if(p === 'ISLAYOUT') return /^\*(Model|Paper)_Space/i.test(it.name) ? VT : VF; if(p === 'ISXREF') return VF; if(p === 'ISDYNAMICBLOCK') return VF; if(p === 'ORIGIN') return vpt({ x: 0, y: 0 }); if(p === 'COUNT'){ const B = A().blockPrims && (A().blockPrims(it.name, 'file') || A().blockPrims(it.name, 'lib')); return mkInt(B ? B.prims.length : 0); } if(p === 'EXPLODABLE') return VT; if(p === 'BLOCKSCALING') return mkInt(0); if(p === 'COMMENTS') return ''; }
      if(it.coll === 'Layouts'){ if(p === 'BLOCK') return blkDefItem(it.name === 'Model' ? '*Model_Space' : '*Paper_Space'); if(p === 'MODELTYPE') return it.name === 'Model' ? VT : VF; if(p === 'TABORDER') return mkInt(0); if(p === 'CANONICALMEDIANAME') return 'ISO_A3_(420.00_x_297.00_MM)'; if(p === 'PLOTROTATION') return mkInt(0); if(p === 'CONFIGNAME') return 'DWG To PDF.pc3'; if(p === 'STYLESHEET') return 'monochrome.ctb'; }
      if(it.coll === 'DimStyles' && p === 'NAME') return it.name;
      if(p === 'HANDLE' || p === 'OBJECTID') return String(Math.abs(AX.hash(it.coll + ':' + it.name))); if(p === 'OBJECTNAME') return 'AcDb' + String(it.coll).replace(/s$/, '') + 'TableRecord'; }
    if(o.kind === 'ent'){ const l = entOf(o), e = l[0], ty = typeName(l);
      if(p === 'TRUECOLOR') return colorObj(e); if(p === 'EFFECTIVENAME' && ty === 'INSERT') return String(e.dynName || (e.bm && e.bm.name) || e.blk || '');
      if(p === 'ISDYNAMICBLOCK' && ty === 'INSERT') return (e.dvs || e.dyn || l.some(x => x.dvs)) ? VT : VF;
      if(p === 'XEFFECTIVESCALEFACTOR' || p === 'YEFFECTIVESCALEFACTOR' || p === 'ZEFFECTIVESCALEFACTOR'){ const bm = e.bm || { a: 1, b: 0 }; return Math.hypot(bm.a, bm.b); }
      if(p === 'INSUNITS') return 'Millimeters'; if(p === 'PLOTSTYLENAME') return 'ByLayer'; if(p === 'MATERIAL') return 'ByLayer'; if(p === 'HYPERLINKS') return new VObj('coll', 'Hyperlinks');
      if(p === 'OWNERID32' || p === 'OBJECTID32') return mkInt(Math.abs(AX.hash(o.ref.id)) & 0x7fffffff);
      if(p === 'DOCUMENT') return DOC; if(p === 'APPLICATION') return AX.APP;
      if(ty === 'HATCH'){ if(p === 'PATTERNSCALE') return +(e.psc || 1); if(p === 'PATTERNANGLE') return (e.pang || 0) * D2R; if(p === 'PATTERNTYPE') return mkInt(1); if(p === 'NUMBEROFLOOPS') return mkInt((e.loops || []).length); if(p === 'AREA'){ let s = 0; for(const lp of e.loops || []){ let a = 0; for(let i = 0; i < lp.length; i++){ const q = lp[i], r = lp[(i + 1) % lp.length]; a += q.x * r.y - r.x * q.y; } s += Math.abs(a / 2); } return s; } if(p === 'ASSOCIATIVEHATCH') return VF; if(p === 'HATCHSTYLE') return mkInt(0); if(p === 'ISOPENWIDTH') return 0; }
      { const tb = l.find(x => x.tbld); if(tb){ const T2 = tb.tbld; if(p === 'ROWS') return mkInt(T2.cells.length); if(p === 'COLUMNS') return mkInt(T2.cw.length); if(p === 'HEIGHT') return T2.rh.reduce((a, b) => a + b, 0); if(p === 'WIDTH') return T2.cw.reduce((a, b) => a + b, 0); if(p === 'INSERTIONPOINT') return vpt(T2.o); if(p === 'OBJECTNAME') return 'AcDbTable'; } }
      if(ty === 'MTEXT'){ if(p === 'WIDTH') return +(e.mw || e.w || 0); if(p === 'ATTACHMENTPOINT') return mkInt(1); if(p === 'LINESPACINGFACTOR') return 1.0; }
      if(ty === 'TEXT'){ if(p === 'ALIGNMENT') return mkInt(e.ha === 'center' ? (e.va === 'middle' ? 10 : 1) : e.ha === 'right' ? 2 : 0); if(p === 'SCALEFACTOR') return +(e.xs || 1); if(p === 'OBLIQUEANGLE') return 0.0; }
      if(ty === 'DIMENSION'){ if(p === 'TEXTOVERRIDE'){ const t = l.find(x => x.dimd); return t && t.dimd.ov ? String(t.dimd.ov) : ''; } if(p === 'STYLENAME') return String(DS().name || 'Standard'); if(p === 'SCALEFACTOR') return +(DS().scl || 1); if(p === 'TEXTHEIGHT') return +(DS().txt || 2.5); if(p === 'PRIMARYUNITSPRECISION') return mkInt(DS().dec | 0); }
      if(ty === 'LWPOLYLINE' || e.type === 'POLYLINE'){ if(p === 'LINETYPEGENERATION') return VF; } }
    return undefined; });
  XPUT.push((o, p, v) => {
    if(o.kind === 'color'){ const c = o.ref; if(p === 'COLORINDEX'){ const n = toInt(v); c.method = n === 256 ? 192 : n === 0 ? 193 : 195; c.aci = n; c.rgb = aci(n); return v; } if(p === 'COLORMETHOD'){ c.method = toInt(v); return v; } if(p === 'ENTITYCOLOR'){ const n = toInt(v); c.rgb = rgbToHex((n >> 16) & 255, (n >> 8) & 255, n & 255); c.method = 194; return v; } }
    if(o.kind === 'attrib'){ const l = entsOf(o.ref); if(!l.length) throw new LispErr('Automation Error. Object was erased'); commitRep(l, w => { if(p === 'TEXTSTRING') w.text = toStr(v); else if(p === 'HEIGHT') w.h = toReal(v); else if(p === 'ROTATION') w.rot = toReal(v) / D2R; else if(p === 'LAYER') w.layer = toStr(v); else if(p === 'COLOR') setAci(w, toInt(v)); else if(p === 'INVISIBLE'){ if(truthy(v) && v !== VF) w.ainv = 1; else delete w.ainv; } else if(p === 'INSERTIONPOINT' || p === 'TEXTALIGNMENTPOINT'){ const q = ptOf(v); w.x = q.x; w.y = q.y; } else if(p === 'TAGSTRING') w.att = toStr(v).toUpperCase(); }); return v; }
    if(o.kind === 'hatchnew'){ const w = o.ref; if(p === 'PATTERNSCALE') w.psc = toReal(v); else if(p === 'PATTERNANGLE') w.pang = toReal(v) / D2R; else if(p === 'LAYER'){ w.layer = toStr(v); if(w.bl) w.col = A().layerHex(w.layer); } else if(p === 'COLOR') setAci(w, toInt(v)); return v; }
    if(o.kind === 'dynprop'){ const d = o.ref; if(d.set){ d.set(String(unV(v))); d.value = String(unV(v)); return v; } throw new LispErr('Thuộc tính khối động chỉ đọc'); }
    if(o.kind === 'prefs-files' || o.kind === 'prefs-x' || o.kind === 'prefs') return v;   // chấp nhận, không đổi gì (đường dẫn của AutoCAD)
    if(o.kind === 'item' && o.ref.coll === 'TextStyles'){ const n = o.ref.name; if(p === 'FONTFILE' && A().TS && A().TS.list[n]){ A().TS.list[n].font = toStr(v).replace(/^.*[\\/]/, '').replace(/\.(ttf|shx)$/i, ''); return v; } if(p === 'HEIGHT' && A().TS && A().TS.list[n]){ A().TS.list[n].h = toReal(v); return v; } return v; }
    if(o.kind === 'ent'){ const l = entOf(o);
      if(p === 'TRUECOLOR'){ const c = v instanceof VObj && v.kind === 'color' ? v.ref : null; if(!c) return v; commitRep(l, w => { if(c.method === 192){ w.bl = 1; w.col = A().layerHex(w.layer || '0'); } else if(c.method === 194){ delete w.bl; w.col = c.rgb; } else setAci(w, c.aci); }); return v; }
      if(p === 'PATTERNSCALE'){ commitRep(l, w => { if(w.type === 'HATCH') w.psc = toReal(v); }); return v; } if(p === 'PATTERNANGLE'){ commitRep(l, w => { if(w.type === 'HATCH') w.pang = toReal(v) / D2R; }); return v; }
      if(p === 'TEXTOVERRIDE'){ commitRep(l.filter(x => x.dimd), w => { w.dimd.ov = toStr(v); w.text = toStr(v) || w.text; }); return v; }
      if(p === 'XSCALEFACTOR' || p === 'YSCALEFACTOR' || p === 'ZSCALEFACTOR'){ const e = l[0]; const bm = e.bm; if(!bm) return v; const s0 = Math.hypot(bm.a, bm.b) || 1, k = toReal(v) / s0; if(Math.abs(k - 1) > 1e-12) AX.xform(o, 'SCALE', [{ x: e.bip.x, y: e.bip.y }, k]); return v; }
      if(p === 'ROTATION' && l[0].bm){ const e = l[0], bm = e.bm, cur = Math.atan2(bm.b, bm.a); AX.xform(o, 'ROTATE', [{ x: e.bip.x, y: e.bip.y }, toReal(v) - cur]); return v; }
      if(p === 'INSERTIONPOINT' && l[0].bip){ const e = l[0], q = ptOf(v); AX.xform(o, 'MOVE', [{ x: e.bip.x, y: e.bip.y }, q]); return v; } }
    return undefined; });

  const arr = (type, list) => new Variant(8192 + type, new SArr(type, 0, list.length - 1, list));
  const loopOf = objs => { const out = []; for(const ob of L(unV(objs)) || []){ const e = entOf(ob)[0]; const lp = A().hatchClosedLoop && A().hatchClosedLoop(e); if(lp) out.push(lp); } return out; };
  Object.assign(METHODS, {
    INSERTBLOCK: (o, p0, name, xs, ys, zs, rot) => { const nm = toStr(name).replace(/^.*[\\/]/, '').replace(/\.dwg$/i, ''); const N = insertBlock(nm, ptOf(p0), xs == null ? 1 : toReal(xs), rot == null ? 0 : toReal(rot) / D2R); if(!N) throw new LispErr('Không có khối "' + nm + '"'); A().commit({ add: N }); return new VObj('ent', ename(N[0])); },
    GETATTRIBUTES: o => { const l = entOf(o).filter(e => e.att && !e.acon); return arr(9, l.map(attObj)); },
    GETCONSTANTATTRIBUTES: o => { const l = entOf(o).filter(e => e.att && e.acon); return arr(9, l.map(attObj)); },
    GETDYNAMICBLOCKPROPERTIES: o => { const l = entOf(o), e = l[0]; const out = [];
      const D = A().dynDefs && A().dynDefs()[(e.bm && e.bm.name) || '']; const V = D && D.vis;
      if(V && V.states && V.states.length){ const cur = (l.find(x => x.dyn && x.dyn.st) || {}).dyn; out.push(new VObj('dynprop', { name: 'Visibility1', value: (cur && cur.st) || V.def || V.states[0], allowed: V.states.slice(), set: v => A().dynSetState && A().dynSetState(e.grp, v) })); }
      if(D && D.lin) for(const q of D.lin){ const cur = (l.find(x => x.dyn && x.dyn.L) || {}).dyn; out.push(new VObj('dynprop', { name: q.name, value: String(cur && cur.L && cur.L[q.name] != null ? cur.L[q.name] : q.L0), ro: true })); }
      out.push(new VObj('dynprop', { name: 'Origin', value: '0,0', ro: true }));
      return arr(9, out); },
    ADDHATCH: (o, type, name, assoc) => { const pat = toStr(name).toUpperCase(); const w = A().newProps({ type: 'HATCH', loops: [], solid: pat === 'SOLID', pat: (A().PATS && A().PATS[pat]) ? pat : 'SOLID', psc: 1, pang: 0 }); w._pendingHatch = 1; return new VObj('hatchnew', w); },
    APPENDOUTERLOOP: (o, objs) => { if(o.kind === 'hatchnew'){ const w = o.ref; w.loops.push(...loopOf(objs)); if(w.loops.length){ delete w._pendingHatch; A().commit({ add: [w] }); o.kind = 'ent'; o.ref = ename(w); } return null; } const l = entOf(o); commitRep(l, w => { w.loops = (w.loops || []).concat(loopOf(objs)); }); return null; },
    APPENDINNERLOOP: (o, objs) => METHODS.APPENDOUTERLOOP(o, objs),
    EVALUATE: o => { if(o.kind === 'hatchnew'){ const w = o.ref; if(!w.loops.length) return null; if(!w._done){ delete w._pendingHatch; w._done = 1; A().commit({ add: [w] }); o.kind = 'ent'; o.ref = ename(w); } } return null; },
    ADDDIMALIGNED: async (o, a, b, c) => { const p = ptOf(a), q = ptOf(b), t = ptOf(c); const got = await capture(() => X.ev(parse('(command "_.DIMALIGNED" (list ' + p.x + ' ' + p.y + ') (list ' + q.x + ' ' + q.y + ') (list ' + t.x + ' ' + t.y + '))')[0])); if(!got.length) return null; A().commit({ add: got }); return new VObj('ent', ename(got[0])); },
    ADDDIMROTATED: async (o, a, b, c, ang) => { const p = ptOf(a), q = ptOf(b), t = ptOf(c); const r = toReal(ang || 0) / D2R; const got = await capture(() => X.ev(parse('(command "_.DIMLINEAR" (list ' + p.x + ' ' + p.y + ') (list ' + q.x + ' ' + q.y + ') "_R" ' + r + ' (list ' + t.x + ' ' + t.y + '))')[0])); if(!got.length) return null; A().commit({ add: got }); return new VObj('ent', ename(got[0])); },
    ADDDIMRADIAL: async (o, c, ch) => METHODS.ADDDIMALIGNED(o, c, ch, ch), ADDDIMDIAMETRIC: async (o, a, b) => METHODS.ADDDIMALIGNED(o, a, b, b),
    ADDTABLE: (o, p0, rows, cols, rh, cw) => { if(!A().makeTable) throw new LispErr('Bảng: chưa sẵn sàng'); const ents = A().makeTable({ rows: toInt(rows), cols: toInt(cols), rh: toReal(rh), cw: toReal(cw), title: false, head: false, th: toReal(rh) / 2.2 }, ptOf(p0)); A().commit({ add: ents }); return new VObj('ent', ename(ents[0])); },
    SETTEXT: (o, r, c, s) => { const l = entOf(o); const carrier = l.find(e => e.tbld); if(!carrier) throw new LispErr('Không phải bảng'); const T2 = JSON.parse(JSON.stringify(carrier.tbld)); if(!T2.cells[toInt(r)]) return null; T2.cells[toInt(r)][toInt(c)] = toStr(s); if(A().tableRebuild) A().tableRebuild(carrier, T2); else { commitRep([carrier], w => { w.tbld = T2; }); } return null; },
    GETTEXT: (o, r, c) => { const carrier = entOf(o).find(e => e.tbld); return carrier && carrier.tbld.cells[toInt(r)] ? String(carrier.tbld.cells[toInt(r)][toInt(c)] || '') : ''; },
    ADDSPLINE: (o, pts, t1, t2) => { const a = unV(pts).map(nv); const P = []; for(let i = 0; i + 2 < a.length; i += 3) P.push({ x: a[i], y: a[i + 1] }); const w = A().newProps({ type: 'SPLINE', fit: P, vertices: P.map(q => ({ x: q.x, y: q.y })) }); A().commit({ add: [w] }); return new VObj('ent', ename(w)); },
    ADDMLEADER: async (o, pts) => { const a = unV(pts).map(nv); if(a.length < 6) return null; const got = await capture(() => X.ev(parse('(command "_.MLEADER" (list ' + a[0] + ' ' + a[1] + ') (list ' + a[a.length - 3] + ' ' + a[a.length - 2] + ') "" "")')[0])); if(!got.length) return null; A().commit({ add: got }); return new VObj('ent', ename(got[0])); },
    ADDREGION: (o, objs) => { const out = []; for(const ob of L(unV(objs)) || []){ const e = entOf(ob)[0]; const lp = A().hatchClosedLoop && A().hatchClosedLoop(e); if(!lp) continue; const w = A().newProps({ type: 'POLYLINE', vertices: lp, closed: true, rgn: 1 }); A().commit({ add: [w] }); out.push(new VObj('ent', ename(w))); } return arr(9, out); },
    ADDXLINE: (o, a, b) => { const p = ptOf(a), q = ptOf(b), L0 = Math.hypot(q.x - p.x, q.y - p.y) || 1; const w = A().newProps({ type: 'XLINE', x: p.x, y: p.y, dx: (q.x - p.x) / L0, dy: (q.y - p.y) / L0 }); A().commit({ add: [w] }); return new VObj('ent', ename(w)); },
    ADDSOLID: (o, a, b, c, d) => { const w = A().newProps({ type: 'SOLID', pts: [a, b, c, d].map(ptOf).map(q => ({ x: q.x, y: q.y })) }); A().commit({ add: [w] }); return new VObj('ent', ename(w)); },
    ADDRAY: (o, a, b) => METHODS.ADDXLINE(o, a, b),
    EXPLODE: o => { const l = entOf(o); if(l.length < 2 && !l[0].grp) return arr(9, []); const N = l.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w._lid; delete w.userAdded; delete w.grp; delete w.blk; delete w.bm; delete w.bip; delete w.l0; if(w.att){ delete w.att; delete w.attp; } return w; }); A().commit({ add: N }); return arr(9, N.map(w => new VObj('ent', ename(w)))); },
    // tập chọn
    ADD: (o, name) => { if(o.kind === 'coll' && /^selectionsets$/i.test(o.ref)){ const n = toStr(name); if(SSETS.has(n)) throw new LispErr('Automation Error. Duplicate record name'); SSETS.set(n, []); return ssObj(n); }
      if(o.kind === 'coll' && o.ref === 'Layers'){ const n = toStr(name); A().addLayer(n); return new VObj('item', { coll: 'Layers', name: n }); }
      if(o.kind === 'coll' && o.ref === 'Blocks'){ return blkDefItem(toStr(arguments[2] != null ? arguments[2] : name)); }
      if(o.kind === 'coll' && /^registeredapplications$/i.test(o.ref)){ fn('REGAPP')(name); return new VObj('item', { coll: 'RegisteredApplications', name: toStr(name).toUpperCase() }); }
      if(o.kind === 'coll' && /^textstyles$/i.test(o.ref)){ const n = toStr(name); if(A().TS && !A().TS.list[n]){ A().TS.list[n] = Object.assign({}, A().TS.list.Standard || {}); } return tsItem(n); }
      throw new LispErr('Add: chưa hỗ trợ cho ' + AX.objName(o)); },
    SELECT: async (o, mode, p1, p2, ft, fd) => { const m = toInt(mode); const ftl = ft ? unV(ft).map(nv) : null, fdl = fd ? unV(fd) : null; const flt = ftl && fdl ? ftl.map((c, i) => new DP(mkInt(c), fdl[i] instanceof Variant ? fdl[i].v : fdl[i])) : null;
      const M = { 0: 'W', 1: 'C', 3: 'P', 4: 'L', 5: 'X' }[m] || 'X'; const args = [M]; if(m === 0 || m === 1){ args.push(lpt(ptOf(p1)), lpt(ptOf(p2))); } if(flt) args.push(flt);
      const r = await fn('SSGET')(...args); SSETS.set(o.ref, r ? r.l.slice() : []); return null; },
    SELECTONSCREEN: async (o, ft, fd) => { const ftl = ft ? unV(ft).map(nv) : null, fdl = fd ? unV(fd) : null; const flt = ftl && fdl ? ftl.map((c, i) => new DP(mkInt(c), fdl[i] instanceof Variant ? fdl[i].v : fdl[i])) : null; const r = await fn('SSGET')(...(flt ? [flt] : [])); SSETS.set(o.ref, r ? r.l.slice() : []); return null; },
    SELECTBYPOLYGON: async (o, mode, pts, ft, fd) => { const a = unV(pts).map(nv); const P = []; for(let i = 0; i + 2 < a.length; i += 3) P.push(lpt({ x: a[i], y: a[i + 1] })); const M = { 2: 'F', 6: 'WP', 7: 'CP' }[toInt(mode)] || 'CP'; const r = await fn('SSGET')(M, P); SSETS.set(o.ref, r ? r.l.slice() : []); return null; },
    CLEAR: o => { if(o.kind === 'sset') SSETS.set(o.ref, []); return null; },
    ADDITEMS: (o, objs) => { if(o.kind === 'sset'){ const l = SSETS.get(o.ref) || []; for(const ob of L(unV(objs)) || []) if(ob instanceof VObj && ob.kind === 'ent') l.push(ob.ref); SSETS.set(o.ref, l); } return null; },
    REMOVEITEMS: (o, objs) => { if(o.kind === 'sset'){ const ids = new Set((L(unV(objs)) || []).map(ob => ob.ref && ob.ref.id)); SSETS.set(o.ref, (SSETS.get(o.ref) || []).filter(en => !ids.has(en.id))); } return null; },
    ERASE: o => { if(o.kind === 'sset'){ const ents = ssEnts(o).flatMap(entsOf); A().commit({ del: ents.filter(e => !A().isLocked(e)) }); SSETS.set(o.ref, []); return null; } return METHODS.DELETE(o); },
    // ứng dụng / tài liệu
    ZOOMEXTENTS: () => { try{ DVDCmd.run('ZOOM'); A().input('E'); }catch(_){ try{ zoomExtents(); }catch(__){} } return null; },
    ZOOMALL: () => METHODS.ZOOMEXTENTS(), ZOOMPREVIOUS: () => { try{ DVDCmd.run('ZOOM'); A().input('P'); }catch(_){} return null; },
    ZOOMWINDOW: (o, a, b) => { const p = ptOf(a), q = ptOf(b); try{ zoomToWorldRect(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.max(p.x, q.x), Math.max(p.y, q.y)); }catch(_){} return null; },
    ZOOMCENTER: (o, c, h) => { const p = ptOf(c), hh = toReal(h) / 2; try{ zoomToWorldRect(p.x - hh, p.y - hh, p.x + hh, p.y + hh); }catch(_){} return null; },
    ZOOMSCALED: () => null,
    EVAL: (o, s) => { const t = toStr(s).trim(); if(/^[\d.\-+*/() ]+$/.test(t)) return null; return null; },
    SAVE: () => { try{ DVDCmd.run('QSAVE'); }catch(_){} return null; },
    SAVEAS: (o, name) => { try{ DVDCmd.run('SAVEAS'); }catch(_){} return null; },
    PURGEALL: () => { try{ DVDLisp.eval('(command "_.-PURGE" "_A" "*" "_N")'); }catch(_){} return null; },
    SETRGB: (o, r, g, b) => { if(o.kind === 'color'){ o.ref.rgb = rgbToHex(toInt(r), toInt(g), toInt(b)); o.ref.method = 194; } return null; },
    SETNAMES: () => null, SETCOLORBOOKCOLOR: () => null,
    GETOBJECT: (o, name) => null, LOADSHX: () => null,
    SETXDATA: (o, types, vals) => { const l = entOf(o); const t = unV(types).map(nv), v = unV(vals).map(x => x instanceof Variant ? unV(x) : x); const groups = []; let cur = null;
      t.forEach((c, i) => { if(c === 1001){ const app = String(v[i]).toUpperCase(); APPS.add(app); cur = [app, []]; groups.push(cur); } else if(cur){ cur[1].push([c, (c >= 1010 && c <= 1013) ? (Array.isArray(v[i]) ? v[i].map(nv) : [0, 0, 0]) : (c === 1070 || c === 1071) ? Math.trunc(nv(v[i])) : (typeof v[i] === 'number' || isNum(v[i])) ? nv(v[i]) : String(v[i])]); } });
      commitRep([l[0]], w => setXd(w, groups)); return null; },
    GETXDATA: (o, app, tS, dS) => { const e = entOf(o)[0]; const pats = [toStr(app) || '*']; const types = [], vals = [];
      for(const [a, items] of e.xd || []){ if(!pats.some(p => wc(p).test(a))) continue; types.push(1001); vals.push(new Variant(8, a)); for(const [c, v] of items){ types.push(c); vals.push((c >= 1010 && c <= 1013) ? vpt({ x: v[0], y: v[1], z: v[2] }) : new Variant(typeof v === 'string' ? 8 : (c === 1070 || c === 1071) ? 2 : 5, v)); } }
      if(tS instanceof Sym) setv(tS, types.length ? new Variant(8194, new SArr(2, 0, types.length - 1, types)) : null); if(dS instanceof Sym) setv(dS, vals.length ? new Variant(8204, new SArr(12, 0, vals.length - 1, vals)) : null); return null; },
    GETBOUNDINGBOX0: () => null,
  });
  // ITEM của tập chọn: phần tử thứ i
  const item0 = METHODS.ITEM; METHODS.ITEM = (o, i) => { if(o.kind === 'sset'){ const l = ssEnts(o); const k = toInt(i); if(k < 0 || k >= l.length) throw new LispErr('Automation Error. Invalid index'); return new VObj('ent', l[k]); }
    if(o.kind === 'coll' && /^selectionsets$/i.test(o.ref)){ const n = isNum(i) ? [...SSETS.keys()][toInt(i)] : toStr(i); if(!SSETS.has(n)) throw new LispErr('Automation Error. Key not found'); return ssObj(n); }
    return item0(o, i); };
  const del0 = METHODS.DELETE; METHODS.DELETE = o => { if(o.kind === 'sset'){ SSETS.delete(o.ref); return null; } if(o.kind === 'item' && o.ref.coll === 'Layers'){ try{ DVDLisp.eval('(command "_.-PURGE" "_LA" "' + o.ref.name + '" "_N")'); }catch(_){} return null; } return del0(o); };
  // vlax-for trên tập chọn ActiveX
  const vfor0 = SPECIAL.get('VLAX-FOR');
  SPECIAL.set('VLAX-FOR', async x => { const coll = await ev(x[2]); if(coll instanceof VObj && coll.kind === 'sset'){ const v = x[1]; let r = null; await X.withBindings([v], [null], async () => { for(const en of ssEnts(coll)){ G.set(v.n, new VObj('ent', en)); r = await X.progn(x.slice(3)); } }); return r; }
    if(coll instanceof VObj && coll.kind === 'item' && coll.ref.coll === 'Blocks'){ const v = x[1]; let r = null; const nm = coll.ref.name; const items = /^\*Model_Space$/i.test(nm) ? ME().map(e => ename(e)).filter((en, i, a) => a.findIndex(q => q.id === en.id) === i) : [];
      await X.withBindings([v], [null], async () => { for(const en of items){ G.set(v.n, new VObj('ent', en)); r = await X.progn(x.slice(3)); } }); return r; }
    return vfor0(x); });

  /* ==================================================================
     6) Hàm còn thiếu
     ================================================================== */
  BI('VL-SORT-I', async (l, f) => { const a = L(l).map((v, i) => [v, i]); const F = toFn(f); const out = []; for(const x of a){ let k = 0; while(k < out.length && !truthy(await apply(F, [x[0], out[k][0]]))) k++; out.splice(k, 0, x); }   // chèn trước phần tử đầu tiên mà (f x y) đúng
    return out.map(x => mkInt(x[1])); });
  BI('VL-MEMBER-IF-NOT', async (f, l) => { const a = L(l); const F = toFn(f); for(let i = 0; i < a.length; i++) if(!truthy(await apply(F, [a[i]]))) return a.slice(i); return null; });
  BI('CDDDDR', l => { let a = L(l); for(let i = 0; i < 4 && a; i++) a = a.length > 1 ? a.slice(1) : null; return a; });
  BI('NENTSELP', async (m, p) => fn('NENTSEL')(typeof m === 'string' ? m : undefined));
  BI(['INITDIA', 'INITCOMMANDVERSION'], () => null);
  BI('ACAD_HELPDLG', () => { try{ DVDCmd.run('HELP'); }catch(_){} return null; });
  BI(['TRACE', 'UNTRACE'], (...a) => a.length ? a[a.length - 1] : null);
  BI(['TEXTPAGE', 'TEXTSCR', 'GRAPHSCR'], () => null); BI('TABLET', () => null); BI(['MEM', 'GC'], () => null); BI(['ALLOC', 'EXPAND'], n => n);
  BI('VPORTS', () => { const c = fn('GETVAR')('VIEWCTR'); return [[mkInt(2), [0.0, 0.0], [1.0, 1.0]]]; });
  BI('VLAX-TMATRIX', l => L(l));
  BI('VLAX-MAP-COLLECTION', async (coll, f) => { const F = toFn(f); const items = coll instanceof VObj ? (coll.kind === 'sset' ? ssEnts(coll).map(en => new VObj('ent', en)) : AX.collItems(coll)) : []; for(const it of items) await apply(F, [it]); return coll; });
  BI('VLAX-ADD-CMD', (name, f) => { const n = toStr(name).toUpperCase(); const F = f; try{ DVDCmd.register([n], 'Lệnh LISP (vlax-add-cmd)', () => DVDLisp.eval('(' + (F instanceof Sym ? F.n : 'C:' + n) + ')'), {}); }catch(_){} return n; });
  BI('VLAX-REMOVE-CMD', () => T);
  BI('VLAX-LDATA-LIST', () => null); BI('VLAX-LDATA-TEST', () => T);
  BI(['VL-LIST-LOADED-VLX', 'VL-LIST-EXPORTED-FUNCTIONS'], () => null); BI('VL-VLX-LOADED-P', () => null); BI('VL-UNLOAD-VLX', () => null);
  BI('VL-LOAD-ALL', async f => fn('LOAD')(f)); BI(['VL-LOAD-REACTORS'], () => T); BI('VLAX-PRODUCT-KEY', () => 'Software\\DVDCAD\\R25.0\\DVDCAD');
  BI('VLAX-REG-APP', () => null); BI('VLAX-IMPORT-TYPE-LIBRARY', () => T);
  BI(['DEFUN-Q-LIST-REF'], s => { const f = G.get((s instanceof Sym ? s.n : toStr(s)).toUpperCase()); return f && f.body ? [f.params || null].concat(f.body) : null; });
  BI(['DEFUN-Q-LIST-SET'], (s, l) => { const name = s instanceof Sym ? s.n : toStr(s); const a = L(l); return X.ev([sym('DEFUN'), sym(name), a[0] || null].concat(a.slice(1))); });
  BI(['VLR-BEEP-REACTION', 'VLR-TRACE-REACTION'], () => null); BI(['VLR-PERS-P'], () => null); BI('VLR-REACTION-NAMES', () => null); BI('VLR-NOTIFICATION', () => sym(':VLR-ACTIVE-DOCUMENT-ONLY'));
  BI(['VLR-DXF-REACTOR', 'VLR-WINDOW-REACTOR'], (d, r) => [sym('VLR-REACTOR'), d, r]);
  BI('ACAD_TRUECOLORCLI', (c) => c);
  BI('ISPROPHYLACTIC', () => null);
  // layerstate-*
  const LST = () => A().layerState;
  BI('LAYERSTATE-GETNAMES', () => { const l = LST() ? LST().list() : []; return l.length ? l : null; });
  BI('LAYERSTATE-HAS', n => LST() && LST().list().some(x => x.toUpperCase() === toStr(n).toUpperCase()) ? T : null);
  BI('LAYERSTATE-SAVE', (n, mask) => { if(!LST()) return null; LST().save(toStr(n)); return T; });
  BI('LAYERSTATE-RESTORE', (n) => { if(!LST()) return null; const k = LST().list().find(x => x.toUpperCase() === toStr(n).toUpperCase()); return k && LST().restore(k) ? T : null; });
  BI('LAYERSTATE-DELETE', n => { if(!LST()) return null; const k = LST().list().find(x => x.toUpperCase() === toStr(n).toUpperCase()); if(!k) return null; LST().del(k); return T; });
  BI('LAYERSTATE-RENAME', (a, b) => { if(!LST()) return null; return LST().rename(toStr(a), toStr(b)) ? null : T; });
  BI('LAYERSTATE-GETLAYERS', n => { if(!LST()) return null; const S = LST().all()[toStr(n)]; return S && S.layers && S.layers.length ? S.layers : null; });
  BI(['LAYERSTATE-COMPARE'], n => LST() && LST().same(toStr(n)) ? T : null);
  BI(['LAYERSTATE-UPDATE', 'LAYERSTATE-ADDLAYERS', 'LAYERSTATE-REMOVELAYERS', 'LAYERSTATE-IMPORT', 'LAYERSTATE-EXPORT', 'LAYERSTATE-IMPORTFROMDB'], () => T);
  BI('LAYERSTATE-GETLASTRESTORED', () => null);
})();
