/* DVDCAD v6h — thư viện LISP của Express Tools (acet-*) mà nhiều tiện ích gọi tới (nạp sau dvd-lisp4.js)
   Nhóm: lỗi / biến hệ thống, danh sách, chuỗi, tên tệp, hình học, tập chọn, lớp / bảng, khối / thuộc tính, giao diện. */
(function(){
  'use strict';
  if(!window.DVDLisp || !DVDLisp.ext || DVDLisp._v6h) return; DVDLisp._v6h = true;
  const X = DVDLisp.ext, AX = DVDLisp.ax;
  const { BI, G, Sym, LI, DP, Ename, SS, LispErr, T, mkInt, toReal, toInt, toStr, pt, lpt, L, nv, isNum, truthy, str, sym, entsOf, ename, ME, getv, setv, apply, toFn, gc } = X;
  const A = () => window.DVDAcad;
  const fn = n => getv(sym(n));
  const P3 = v => { const l = L(v) || []; return [nv(l[0] || 0), nv(l[1] || 0), l.length > 2 ? nv(l[2]) : 0.0]; };
  const lst = a => (a && a.length ? a : null);
  const eq = (a, b) => str(a) === str(b);
  const bb = e => typeof entBBox === 'function' ? entBBox(e) : null;

  /* ---- lỗi / biến hệ thống / undo ---- */
  const SVSTACK = [];
  BI('ACET-ERROR-INIT', (l) => { const a = L(l) || []; const vars = L(a[0]) || []; const saved = []; for(let i = 0; i + 1 < vars.length; i += 2){ const n = toStr(vars[i]); saved.push([n, fn('GETVAR')(n)]); if(vars[i + 1] != null) try{ fn('SETVAR')(n, vars[i + 1]); }catch(_){} } SVSTACK.push(saved); return T; });
  BI('ACET-ERROR-RESTORE', () => { const s = SVSTACK.pop() || []; for(const [n, v] of s) try{ fn('SETVAR')(n, v); }catch(_){} return null; });
  BI('ACET-SYSVAR-SET', l => { const a = L(l) || []; const saved = []; for(let i = 0; i + 1 < a.length; i += 2){ const n = toStr(a[i]); saved.push([n, fn('GETVAR')(n)]); try{ fn('SETVAR')(n, a[i + 1]); }catch(_){} } SVSTACK.push(saved); return T; });
  BI('ACET-SYSVAR-RESTORE', () => { const s = SVSTACK.pop() || []; for(const [n, v] of s) try{ fn('SETVAR')(n, v); }catch(_){} return null; });
  BI(['ACET-UNDO-BEGIN', 'ACET-UNDO-END', 'ACET-UNDO-MARK', 'ACET-UNDO-BACK'], () => null);
  BI('ACET-CMD-EXIT', () => { try{ if(A().busy()) A().cancel(true); }catch(_){} return null; });
  BI('ACET-SYS-COMMAND-MODE', () => mkInt(0)); BI('ACET-SYS-SHIFT-DOWN', () => null); BI('ACET-SYS-CONTROL-DOWN', () => null); BI('ACET-SYS-BEEP', () => null);
  BI('ACET-SYS-SLEEP', ms => new Promise(r => setTimeout(() => r(null), Math.min(10000, toInt(ms || mkInt(0))))));

  /* ---- danh sách ---- */
  BI('ACET-LIST-M-ASSOC', (k, l) => lst((L(l) || []).filter(p => { const a = p instanceof DP ? p.a : Array.isArray(p) ? p[0] : undefined; return a !== undefined && eq(a, k); })));
  BI('ACET-LIST-ASSOC-APPEND', (k, v, l) => { const a = (L(l) || []).slice(); const i = a.findIndex(p => (p instanceof DP ? eq(p.a, k) : Array.isArray(p) && eq(p[0], k))); if(i < 0) a.push([k, v]); else { const p = a[i]; a[i] = p instanceof DP ? [p.a, p.d, v] : p.concat([v]); } return lst(a); });
  BI('ACET-LIST-ASSOC-PUT', (p, l) => { const a = (L(l) || []).slice(); const k = p instanceof DP ? p.a : L(p)[0]; const i = a.findIndex(q => (q instanceof DP ? eq(q.a, k) : Array.isArray(q) && eq(q[0], k))); if(i < 0) a.push(p); else a[i] = p; return lst(a); });
  BI('ACET-LIST-ASSOC-REMOVE', (k, l) => lst((L(l) || []).filter(q => !(q instanceof DP ? eq(q.a, k) : Array.isArray(q) && eq(q[0], k)))));
  BI('ACET-LIST-PUT-NTH', (v, l, n) => { const a = (L(l) || []).slice(); const i = toInt(n); if(i >= 0 && i < a.length) a[i] = v; return lst(a); });
  BI('ACET-LIST-REMOVE-NTH', (n, l) => { const a = (L(l) || []).slice(); a.splice(toInt(n), 1); return lst(a); });
  BI('ACET-LIST-INSERT-NTH', (v, l, n) => { const a = (L(l) || []).slice(); a.splice(toInt(n), 0, v); return lst(a); });
  BI('ACET-LIST-REMOVE-DUPLICATES', (l, fz) => { const out = []; for(const x of L(l) || []) if(!out.some(y => eq(x, y))) out.push(x); return lst(out); });
  BI('ACET-LIST-SPLIT', (l, k) => { const a = L(l) || []; const i = a.findIndex(x => eq(x, k)); return i < 0 ? [lst(a), null] : [lst(a.slice(0, i)), lst(a.slice(i))]; });
  BI('ACET-LIST-IS-DOTTED-PAIR', x => x instanceof DP ? T : null);
  BI('ACET-LIST-GROUP-BY-ASSOC', l => { const m = new Map(); for(const p of L(l) || []){ const k = p instanceof DP ? str(p.a) : str(L(p)[0]); if(!m.has(k)) m.set(k, [p instanceof DP ? p.a : L(p)[0]]); m.get(k).push(p instanceof DP ? p.d : L(p)[1]); } return lst([...m.values()]); });
  BI('ACET-LIST-ISORT', (l, i) => { const a = (L(l) || []).slice(); const k = toInt(i); a.sort((x, y) => { const u = L(x)[k], v = L(y)[k]; return isNum(u) && isNum(v) ? nv(u) - nv(v) : String(str(u)).localeCompare(String(str(v))); }); return lst(a); });

  /* ---- chuỗi ---- */
  BI('ACET-STR-REPLACE', (a, b, s) => toStr(s).split(toStr(a)).join(toStr(b)));
  BI('ACET-STR-TO-LIST', (d, s) => lst(toStr(s).split(toStr(d))));
  BI('ACET-LIST-TO-STR', (l, d) => (L(l) || []).map(x => typeof x === 'string' ? x : str(x)).join(d == null ? ',' : toStr(d)));
  BI('ACET-STR-LR-TRIM', (c, s) => { const ch = toStr(c); let t = toStr(s); while(ch && t.startsWith(ch)) t = t.slice(ch.length); while(ch && t.endsWith(ch)) t = t.slice(0, -ch.length); return t; });
  BI('ACET-STR-SPACE-TRIM', s => toStr(s).trim());
  BI('ACET-STR-M-FIND', (a, s) => { const out = []; const t = toStr(s), f = toStr(a); let i = t.indexOf(f); while(f && i >= 0){ out.push(mkInt(i + 1)); i = t.indexOf(f, i + 1); } return lst(out); });
  BI('ACET-STR-FIND', (a, s) => { const i = toStr(s).indexOf(toStr(a)); return i >= 0 ? mkInt(i + 1) : null; });
  BI('ACET-STR-ESC-WILDCARDS', s => toStr(s).replace(/([#@.*?~\[\]\-,`])/g, '`$1'));
  BI('ACET-STR-FORMAT', (f, ...a) => { let i = 0; return toStr(f).replace(/%[0-9]*[sd]/g, () => { const v = a[i++]; return v == null ? '' : typeof v === 'string' ? v : str(v); }); });
  BI('ACET-STR-EQUAL', (a, b) => toStr(a).toUpperCase() === toStr(b).toUpperCase() ? T : null);
  BI('ACET-STR-IS-PRINTABLE', s => /^[\x20-\x7e\u00a0-\uffff]*$/.test(toStr(s)) ? T : null);
  BI('ACET-STR-PAREN-PAIR', s => null);

  /* ---- tên tệp ---- */
  const base = s => String(s).replace(/\\/g, '/').split('/').pop();
  BI('ACET-FILENAME-EXT-REMOVE', f => toStr(f).replace(/\.[^.\\/]*$/, ''));
  BI('ACET-FILENAME-EXTENSION', f => (/\.[^.\\/]*$/.exec(toStr(f)) || [''])[0]);
  BI('ACET-FILENAME-PATH-REMOVE', f => base(toStr(f)));
  BI('ACET-FILENAME-DIRECTORY', f => toStr(f).replace(/[^\\/]*$/, ''));
  BI('ACET-FILENAME-VALID', f => /[<>|"*?]/.test(toStr(f)) ? null : T);
  BI('ACET-FILE-FIND', f => fn('FINDFILE')(f)); BI('ACET-FILE-FIND-ON-PATH', f => fn('FINDFILE')(f));
  BI('ACET-FILE-BACKUP', f => f); BI('ACET-FILE-BACKUP-DELETE', () => T);
  BI('ACET-FILE-READDIR', () => { const l = (DVDLisp.fs ? DVDLisp.fs.list() : []).map(f => f.name); return lst(l); });
  BI('ACET-FILE-WRITEDIALOG', (t, def, ext) => fn('GETFILED')(t, def || '', ext || '*', mkInt(1)));
  BI('ACET-UI-GETFILE', (t, def, ext) => fn('GETFILED')(t, def || '', ext || '*', mkInt(0)));
  BI('ACET-UI-PICKDIR', () => 'C:\\DVDCAD\\Support');

  /* ---- hình học ---- */
  BI('ACET-GEOM-MIDPOINT', (a, b) => { const p = P3(a), q = P3(b); return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]; });
  BI('ACET-GEOM-VECTOR-ADD', (a, b) => { const p = P3(a), q = P3(b); return [p[0] + q[0], p[1] + q[1], p[2] + q[2]]; });
  BI('ACET-GEOM-VECTOR-SUBTRACT', (a, b) => { const p = P3(a), q = P3(b); return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; });
  BI('ACET-GEOM-VECTOR-SCALE', (a, s) => { const p = P3(a), k = toReal(s); return [p[0] * k, p[1] * k, p[2] * k]; });
  BI('ACET-GEOM-UNIT-VECTOR', (a, b) => { const p = P3(a), q = b == null ? [0, 0, 0] : P3(b); const v = b == null ? p : [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; const n = Math.hypot(...v) || 1; return v.map(x => x / n); });
  BI('ACET-GEOM-CROSS-PRODUCT', (a, b) => { const p = P3(a), q = P3(b); return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]; });
  BI('ACET-GEOM-DOT-PRODUCT', (a, b) => { const p = P3(a), q = P3(b); return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; });
  BI('ACET-GEOM-Z-AXIS', () => [0.0, 0.0, 1.0]);
  BI('ACET-GEOM-PIXEL-UNIT', () => { try{ return 1 / view.scale; }catch(_){ return 1.0; } });
  BI('ACET-GEOM-TEXTBOX', (al, off) => { const r = fn('TEXTBOX')(al); return r; });
  BI('ACET-GEOM-LIST-EXTENTS', l => { const a = (L(l) || []).map(P3); if(!a.length) return null; const xs = a.map(p => p[0]), ys = a.map(p => p[1]), zs = a.map(p => p[2]); return [[Math.min(...xs), Math.min(...ys), Math.min(...zs)], [Math.max(...xs), Math.max(...ys), Math.max(...zs)]]; });
  const ssEnts = ss => ss instanceof SS ? ss.l.flatMap(entsOf) : ss instanceof Ename ? entsOf(ss) : [];
  BI('ACET-GEOM-SS-EXTENTS', (ss, fast) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of ssEnts(ss)){ const b = bb(e); if(!b) continue; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); } return isFinite(x0) ? [[x0, y0, 0.0], [x1, y1, 0.0]] : null; });
  BI('ACET-ENT-GEOMEXTENTS', en => fn('ACET-GEOM-SS-EXTENTS')(en));
  BI('ACET-GEOM-OBJECT-END-POINTS', en => { const s = fn('VLAX-CURVE-GETSTARTPOINT')(en), e = fn('VLAX-CURVE-GETENDPOINT')(en); return s && e ? [s, e] : null; });
  BI('ACET-GEOM-VERTEX-LIST', en => { const e = entsOf(en)[0]; if(!e) return null; if(e.type === 'POLYLINE'){ const B = (A().bvOf && A().bvOf(e)) || e.vertices || []; return lst(B.map(v => [v.x, v.y, 0.0])); } if(e.type === 'LINE') return [[e.x1, e.y1, 0.0], [e.x2, e.y2, 0.0]]; return null; });
  BI('ACET-GEOM-ARC-3P-D-ANGLE', (a, b, c) => { const p = P3(a), q = P3(b), r = P3(c); const a1 = Math.atan2(p[1] - q[1], p[0] - q[0]), a2 = Math.atan2(r[1] - q[1], r[0] - q[0]); let d = a2 - a1; while(d < 0) d += 2 * Math.PI; return d; });
  BI('ACET-GEOM-IS-ARC', en => { const e = entsOf(en)[0]; return e && (e.type === 'ARC' || e.type === 'CIRCLE') ? T : null; });
  BI('ACET-GEOM-POINT-INSIDE', (p, l) => { const q = P3(p), P = (L(l) || []).map(P3); let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ if(((P[i][1] > q[1]) !== (P[j][1] > q[1])) && (q[0] < (P[j][0] - P[i][0]) * (q[1] - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c ? T : null; });
  BI('ACET-ANGLE-EQUAL', (a, b, f) => { const d = Math.abs(((toReal(a) - toReal(b)) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return d <= (f == null ? 1e-8 : toReal(f)) ? T : null; });

  /* ---- tập chọn ---- */
  const mkSS = ents => { const seen = new Set(), out = []; for(const e of ents){ const en = ename(e); if(seen.has(en.id)) continue; seen.add(en.id); out.push(en); } return out.length ? new SS(out) : null; };
  BI('ACET-SS-NEW', ss => { const l = ssEnts(ss); return mkSS(l); });
  BI('ACET-SS-UNION', l => mkSS((L(l) || []).flatMap(ssEnts)));
  BI('ACET-SS-INTERSECTION', (a, b) => { const B = new Set(ssEnts(b)); return mkSS(ssEnts(a).filter(e => B.has(e))); });
  BI('ACET-SS-SUBTRACT', (a, b) => { const B = new Set(ssEnts(b)); return mkSS(ssEnts(a).filter(e => !B.has(e))); });
  BI('ACET-SS-REMOVE-DUPS', (ss) => [ss, null]);
  BI('ACET-SS-TO-LIST', ss => lst(ss instanceof SS ? ss.l.slice() : []));
  BI('ACET-LIST-TO-SS', l => mkSS((L(l) || []).flatMap(en => en instanceof Ename ? entsOf(en) : [])));
  BI('ACET-SS-VISIBLE', (ss, flag) => { const hide = toInt(flag || mkInt(0)) === 1; const l = ssEnts(ss); if(!l.length) return null; A().commit({ rep: l.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; if(hide) w.vh = 1; else delete w.vh; return [e, w]; }) }); return ss; });
  BI('ACET-SS-REDRAW', (ss, m) => { try{ draw(); }catch(_){} return ss; });
  BI('ACET-SS-CLEAR-PREV', () => null);
  BI('ACET-SS-FLT-CSPACE', () => [new DP(mkInt(410), 'Model')]);
  BI('ACET-SS-SSGET-FILTER', (ss, fl) => { const r = fn('SSGET')('_X', fl); if(!r) return null; const S = new Set(ssEnts(ss)); return mkSS(ssEnts(r).filter(e => S.has(e))); });
  BI('ACET-SS-ZOOM-EXTENTS', ss => { const r = fn('ACET-GEOM-SS-EXTENTS')(ss); if(r){ try{ zoomToWorldRect(r[0][0], r[0][1], r[1][0], r[1][1]); }catch(_){} } return null; });
  // kéo dời / xoay / tỉ lệ tập chọn theo điểm người dùng bấm
  BI('ACET-SS-DRAG-MOVE', async (ss, base, msg) => { const p = base ? base : await fn('GETPOINT')(msg ? toStr(msg) : 'Điểm gốc'); if(!p) return null; const q = await fn('GETPOINT')(p, msg ? toStr(msg) : 'Điểm đích'); return q || null; });
  BI('ACET-SS-DRAG-ROTATE', async (ss, base, msg) => { const a = await fn('GETANGLE')(base, msg ? toStr(msg) : 'Góc xoay'); return a; });
  BI('ACET-SS-DRAG-SCALE', async (ss, base, msg) => { const d = await fn('GETDIST')(base, msg ? toStr(msg) : 'Hệ số tỉ lệ'); return d; });
  BI('ACET-UI-ENTSEL', async l => fn('ENTSEL')(L(l) ? toStr(L(l)[0]) : undefined));
  BI('ACET-UI-SINGLE-SELECT', async (fl, locked) => { const r = await fn('SSGET')(':S', ...(fl ? [fl] : [])); return r; });
  BI('ACET-UI-FENCE-SELECT', async () => { const pts = []; let p = await fn('GETPOINT')('Điểm đầu hàng rào'); while(p){ pts.push(p); p = await fn('GETPOINT')(p, 'Điểm tiếp theo'); } return pts.length > 1 ? lst(pts) : null; });
  BI('ACET-UI-POLYGON-SELECT', async (mode) => { const pts = []; let p = await fn('GETPOINT')('Điểm đầu đa giác'); while(p){ pts.push(p); p = await fn('GETPOINT')(p, 'Điểm tiếp theo'); } return pts.length > 2 ? lst(pts) : null; });

  /* ---- lớp / bảng ---- */
  BI('ACET-LAYER-LOCKED', n => A().LS && A().LS.locked.has(toStr(n)) ? T : null);
  BI('ACET-LAYER-UNLOCK-ALL', () => { try{ for(const n of [...A().LS.locked]) A().setLayerFlag(n, 'locked', false); }catch(_){} return T; });
  BI(['ACET-LAYERP-MODE', 'ACET-LAYERP-MARK'], () => T);
  BI('ACET-TBL-NAME-LIST', (t) => { const tb = toStr(L(t) ? L(t)[0] : t).toUpperCase(); const out = []; let r = fn('TBLNEXT')(tb, T); while(r){ const n = gc(r, 2); if(n != null) out.push(n); r = fn('TBLNEXT')(tb); } return lst(out); });
  BI('ACET-DICT-NAME-LIST', () => null); BI('ACET-DICT-ENSURE-EXISTS', n => n);
  BI('ACET-DXF', (c, al) => gc(al, toInt(c)));
  BI('ACET-PLINE-IS-2D', en => { const e = entsOf(en)[0]; return e && e.type === 'POLYLINE' && !e.p3 ? T : null; });
  BI('ACET-PLINE-MAKE', (l) => { const a = L(l) || []; const pts = L(a[0]) || a; const al = [new DP(mkInt(0), 'LWPOLYLINE'), new DP(mkInt(100), 'AcDbEntity'), new DP(mkInt(100), 'AcDbPolyline'), new DP(mkInt(90), mkInt(pts.length)), new DP(mkInt(70), mkInt(0))].concat(pts.map(p => [mkInt(10)].concat(P3(p).slice(0, 2)))); return fn('ENTMAKE')(al); });

  /* ---- khối / thuộc tính ---- */
  BI('ACET-INSERT-ATTRIB-GET', (en, mode) => { const l = entsOf(en).filter(e => e.att); if(!l.length) return null; return lst(l.map(e => new DP(String(e.att), String(e.text || '')))); });
  BI('ACET-INSERT-ATTRIB-SET', (en, l, upd) => { const vals = new Map((L(l) || []).map(p => [String(p instanceof DP ? str(p.a) : str(L(p)[0])).replace(/^"|"$/g, '').toUpperCase(), p instanceof DP ? p.d : L(p)[1]])); const ents = entsOf(en).filter(e => e.att && vals.has(String(e.att).toUpperCase())); if(!ents.length) return null; A().commit({ rep: ents.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; w.text = toStr(vals.get(String(e.att).toUpperCase())); return [e, w]; }) }); return T; });
  BI('ACET-BLOCK-PURGE', () => null); BI('ACET-BLOCK-MAKE-ANON', () => null);
  BI('ACET-BLINK-AND-SHOW-OBJECT', en => { try{ const l = entsOf(L(en) ? L(en)[0] : en); if(l.length && A().flashEnts) A().flashEnts(l); }catch(_){} return T; });

  /* ---- giao diện ---- */
  BI('ACET-UI-MESSAGE', (msg, title, flags) => fn('DOS_MSGBOX') ? fn('DOS_MSGBOX')(msg, title || 'DVDCAD', flags == null ? mkInt(0) : mkInt(toInt(flags) & 7)) : (fn('ALERT')(msg), mkInt(1)));
  BI('ACET-UI-TXTED', (s, title) => fn('DOS_GETSTRING') ? fn('DOS_GETSTRING')(title || 'DVDCAD', '', s) : s);
  BI('ACET-UI-STATUS', (msg, title) => { if(msg != null) try{ A().log(toStr(msg)); }catch(_){} return T; });
  BI('ACET-CALC-ROUND', (v, n) => { const k = Math.pow(10, toInt(n || mkInt(0))); return Math.round(toReal(v) * k) / k; });
  BI('ACET-CALC-TAN', a => Math.tan(toReal(a)));
  BI('ACET-REG-GET', (k) => fn('VL-REGISTRY-READ')('HKEY_CURRENT_USER\\Software\\DVDCAD\\ET', k)); BI('ACET-REG-PUT', (k, v) => fn('VL-REGISTRY-WRITE')('HKEY_CURRENT_USER\\Software\\DVDCAD\\ET', k, v));
  BI(['ACET-GETVAR', 'ACET-SETVAR'], (l, v) => { const a = L(l) || [l]; const n = toStr(a[0]); if(v === undefined) return fn('GETVAR')(n); return fn('SETVAR')(n, v); });
  BI('ACET-VAR-GETVAR', l => fn('GETVAR')(toStr(L(l) ? L(l)[0] : l)));
  BI('ACET-EXPRESSTOOLS-VERSION', () => '25.0'); BI('ACETUTIL-LOADED', () => T);
})();
