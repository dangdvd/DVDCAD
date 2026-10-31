/* DVDCAD v6j — đám mây điểm (point cloud) như AutoCAD
   · POINTCLOUDATTACH: .las (1.0 – 1.4, chưa nén), .xyz / .txt / .csv / .pts, .ply (ascii / nhị phân); .laz / .e57 / .rcp / .rcs báo rõ
   · Đối tượng: ảnh IMAGE mang pc = { id, n, b, cm, crop… } — màn hình vẽ từng điểm, bản in / AutoCAD thấy ảnh nhìn từ trên; điểm lưu ở IndexedDB
   · POINTCLOUD, POINTCLOUDCOLORMAP (RGB / cường độ / cao độ / phân loại / một màu), POINTCLOUDCROP / POINTCLOUDUNCROP, POINTCLOUDPOINTSIZE
   · PCEXTRACTSECTION (mặt cắt đứng → đa tuyến 3D), PCEXTRACTEDGE / PCEXTRACTCORNER (giao 2 mặt tường), PCEXTRACTCENTERLINE (ống đứng)
   · PCINWIZARD, RECAP: giải thích (DVDCAD đọc thẳng tệp, không cần lập chỉ mục) · khung 3D: điểm hiện cùng mô hình */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x29 || !window.DVDCmd) return; A._x29 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const isPC = e => !!(e && e.type === 'IMAGE' && e.pc && e.pc.id);
  const MAXP = 4000000;
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });

  /* ===================== kho điểm (IndexedDB) ===================== */
  let _db = null; const db = () => _db || (_db = new Promise((res, rej) => { const r = indexedDB.open('dvdcad-pc', 1); r.onupgradeneeded = () => r.result.createObjectStore('c'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const put = async (k, v) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('c', 'readwrite'); t.objectStore('c').put(v, k); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }); };
  const get = async k => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('c', 'readonly'); const q = t.objectStore('c').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
  const PC = new Map(), loading = new Set();
  function cloud(id){ const c = PC.get(id); if(c) return c; if(id && !loading.has(id)){ loading.add(id); get(id).then(v => { if(v){ PC.set(id, v); try{ draw(); }catch(_){} sync3D(); } }).catch(() => {}); } return null; }
  A.pcCloud = cloud;

  /* ===================== đọc tệp ===================== */
  function finish(X, n, rgb, int, cls){ // X: Float64Array xyz → toạ độ tương đối (Float32) + gốc
    if(!n) throw new Error('Không có điểm');
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for(let i = 0; i < n; i++){ const x = X[i * 3], y = X[i * 3 + 1], z = X[i * 3 + 2]; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; if(z < z0) z0 = z; if(z > z1) z1 = z; }
    const xyz = new Float32Array(n * 3); for(let i = 0; i < n; i++){ xyz[i * 3] = X[i * 3] - x0; xyz[i * 3 + 1] = X[i * 3 + 1] - y0; xyz[i * 3 + 2] = X[i * 3 + 2] - z0; }
    return { n, xyz, o: [x0, y0, z0], b: [0, 0, 0, x1 - x0, y1 - y0, z1 - z0], rgb: rgb || null, int: int || null, cls: cls || null }; }
  function parseText(txt, isPts){ const L = txt.split(/\r?\n/); let n = 0; const X = new Float64Array(Math.min(L.length, MAXP) * 3); let rgb = null, int = null; let step = Math.max(1, Math.ceil(L.length / MAXP));
    for(let li = 0; li < L.length; li += step){ const s = L[li].trim(); if(!s || /^[#/%a-z]/i.test(s)) continue; const f = s.split(/[\s,;]+/).map(Number); if(f.length < 3 || !f.slice(0, 3).every(isFinite)){ continue; }
      if(isPts && f.length === 1) continue; const i = n++; X[i * 3] = f[0]; X[i * 3 + 1] = f[1]; X[i * 3 + 2] = f[2];
      if(f.length >= 7){ if(!rgb){ rgb = new Uint8Array(X.length); int = new Uint16Array(X.length / 3); } int[i] = Math.max(0, f[3] + (isPts ? 2048 : 0)); rgb[i * 3] = f[4]; rgb[i * 3 + 1] = f[5]; rgb[i * 3 + 2] = f[6]; }
      else if(f.length === 6){ if(!rgb) rgb = new Uint8Array(X.length); rgb[i * 3] = f[3]; rgb[i * 3 + 1] = f[4]; rgb[i * 3 + 2] = f[5]; }
      else if(f.length === 4){ if(!int) int = new Uint16Array(X.length / 3); int[i] = Math.max(0, f[3] + (isPts ? 2048 : 0)); } }
    return finish(X, n, rgb && rgb.subarray(0, n * 3), int && int.subarray(0, n), null); }
  function parsePLY(buf){ const u = new Uint8Array(buf); const td = new TextDecoder(); let he = -1; for(let i = 0; i < Math.min(u.length, 65536) - 10; i++){ if(u[i] === 101 && td.decode(u.subarray(i, i + 10)) === 'end_header'){ he = i + 10; while(u[he] === 13 || u[he] === 10 || u[he] === 32) he++; if(u[he - 1] !== 10) he++; break; } }
    if(he < 0) throw new Error('PLY thiếu end_header'); const H = td.decode(u.subarray(0, he)).split(/\r?\n/); const fmt = (H.find(l => /^format /.test(l)) || '').split(/\s+/)[1];
    const els = []; let cur = null; for(const l of H){ const t = l.trim().split(/\s+/); if(t[0] === 'element'){ cur = { name: t[1], n: +t[2], props: [] }; els.push(cur); } else if(t[0] === 'property' && cur){ if(t[1] === 'list') cur.props.push({ list: true, ct: t[2], it: t[3], name: t[4] }); else cur.props.push({ type: t[1], name: t[2] }); } }
    const V = els.find(e => e.name === 'vertex'); if(!V) throw new Error('PLY không có vertex'); const n = Math.min(V.n, MAXP);
    const SZ = { char: 1, int8: 1, uchar: 1, uint8: 1, short: 2, int16: 2, ushort: 2, uint16: 2, int: 4, int32: 4, uint: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 };
    const idx = nm => V.props.findIndex(p => p.name === nm); const ix = idx('x'), iy = idx('y'), iz = idx('z'); const ir = idx('red') >= 0 ? idx('red') : idx('r'), ig = idx('green') >= 0 ? idx('green') : idx('g'), ib = idx('blue') >= 0 ? idx('blue') : idx('b'); const ii = idx('intensity') >= 0 ? idx('intensity') : idx('scalar_intensity');
    const X = new Float64Array(n * 3), rgb = ir >= 0 ? new Uint8Array(n * 3) : null, int = ii >= 0 ? new Uint16Array(n) : null;
    if(fmt === 'ascii'){ const lines = td.decode(u.subarray(he)).split(/\r?\n/); let li = 0; const pre = els.slice(0, els.indexOf(V)).reduce((s, e) => s + e.n, 0); li = pre; let k = 0;
      for(; k < n && li < lines.length; li++){ const f = lines[li].trim().split(/\s+/).map(Number); if(f.length < 3) continue; X[k * 3] = f[ix]; X[k * 3 + 1] = f[iy]; X[k * 3 + 2] = f[iz]; if(rgb){ rgb[k * 3] = f[ir]; rgb[k * 3 + 1] = f[ig]; rgb[k * 3 + 2] = f[ib]; } if(int) int[k] = Math.max(0, f[ii]); k++; }
      return finish(X, k, rgb, int, null); }
    const le = fmt === 'binary_little_endian'; const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = he;
    // bỏ qua các element đứng trước vertex (hiếm) — chỉ hỗ trợ khi không có list
    for(const e of els){ if(e === V) break; if(e.props.some(q => q.list)) throw new Error('PLY: element trước vertex có list'); p += e.n * e.props.reduce((s, q) => s + SZ[q.type], 0); }
    const rd = (t, o) => { switch(t){ case 'char': case 'int8': return dv.getInt8(o); case 'uchar': case 'uint8': return dv.getUint8(o); case 'short': case 'int16': return dv.getInt16(o, le); case 'ushort': case 'uint16': return dv.getUint16(o, le); case 'int': case 'int32': return dv.getInt32(o, le); case 'uint': case 'uint32': return dv.getUint32(o, le); case 'float': case 'float32': return dv.getFloat32(o, le); default: return dv.getFloat64(o, le); } };
    if(V.props.some(q => q.list)) throw new Error('PLY: vertex có list'); const off = []; let rs = 0; for(const q of V.props){ off.push(rs); rs += SZ[q.type]; }
    const step = Math.max(1, Math.ceil(V.n / MAXP)); let k = 0;
    for(let i = 0; i < V.n && k < n; i += step){ const o = p + i * rs; if(o + rs > u.length) break; X[k * 3] = rd(V.props[ix].type, o + off[ix]); X[k * 3 + 1] = rd(V.props[iy].type, o + off[iy]); X[k * 3 + 2] = rd(V.props[iz].type, o + off[iz]);
      if(rgb){ rgb[k * 3] = rd(V.props[ir].type, o + off[ir]); rgb[k * 3 + 1] = rd(V.props[ig].type, o + off[ig]); rgb[k * 3 + 2] = rd(V.props[ib].type, o + off[ib]); } if(int) int[k] = Math.max(0, rd(V.props[ii].type, o + off[ii])); k++; }
    return finish(X, k, rgb && rgb.subarray(0, k * 3), int && int.subarray(0, k), null); }
  function parseLAS(buf){ const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength); if(String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'LASF') throw new Error('Không phải LAS');
    const vmin = u[25], hs = dv.getUint16(94, true), off0 = dv.getUint32(96, true), fmtRaw = u[104], fmt = fmtRaw & 0x3f, rl = dv.getUint16(105, true); let N = dv.getUint32(107, true);
    if(fmtRaw & 0x80) throw new Error('LAZ');
    if(!N && vmin >= 4 && hs >= 255) N = Number(dv.getBigUint64(247, true));
    const sx = dv.getFloat64(131, true), sy = dv.getFloat64(139, true), sz = dv.getFloat64(147, true), ox = dv.getFloat64(155, true), oy = dv.getFloat64(163, true), oz = dv.getFloat64(171, true);
    const RGBO = { 2: 20, 3: 28, 5: 28, 7: 30, 8: 30, 10: 30 }[fmt]; const CLS = fmt >= 6 ? 16 : 15;
    N = Math.min(N, Math.floor((u.length - off0) / rl)); const step = Math.max(1, Math.ceil(N / MAXP)), n = Math.ceil(N / step);
    const X = new Float64Array(n * 3), int = new Uint16Array(n), cls = new Uint8Array(n), rgb = RGBO != null ? new Uint8Array(n * 3) : null; let k = 0, mx = 0;
    for(let i = 0; i < N && k < n; i += step){ const o = off0 + i * rl; X[k * 3] = dv.getInt32(o, true) * sx + ox; X[k * 3 + 1] = dv.getInt32(o + 4, true) * sy + oy; X[k * 3 + 2] = dv.getInt32(o + 8, true) * sz + oz; int[k] = dv.getUint16(o + 12, true); cls[k] = fmt >= 6 ? u[o + CLS] : (u[o + CLS] & 31);
      if(rgb){ const r = dv.getUint16(o + RGBO, true), g = dv.getUint16(o + RGBO + 2, true), b = dv.getUint16(o + RGBO + 4, true); rgb[k * 3] = r >> 8 || r; rgb[k * 3 + 1] = g >> 8 || g; rgb[k * 3 + 2] = b >> 8 || b; mx = Math.max(mx, r, g, b); } k++; }
    if(rgb && mx < 256){ /* màu 8 bit ghi thẳng */ let k2 = 0; for(let i = 0; i < N && k2 < k; i += step){ const o = off0 + i * rl; rgb[k2 * 3] = dv.getUint16(o + RGBO, true); rgb[k2 * 3 + 1] = dv.getUint16(o + RGBO + 2, true); rgb[k2 * 3 + 2] = dv.getUint16(o + RGBO + 4, true); k2++; } }
    const R = finish(X, k, rgb, int, cls); R.las = { ver: u[24] + '.' + vmin, fmt, N }; return R; }
  async function parseFile(file){ const nm = String(file.name || '').toLowerCase(); const ext = (/\.([a-z0-9]+)$/.exec(nm) || [])[1] || '';
    if(ext === 'laz') throw new Error('LAZ (LAS nén LASzip) chưa đọc được — giải nén thành .las (laszip / CloudCompare) rồi gắn.');
    if(ext === 'e57') throw new Error('E57 chưa đọc được — xuất thành .las / .ply / .pts (CloudCompare, ReCap) rồi gắn.');
    if(ext === 'rcp' || ext === 'rcs') throw new Error('.rcp / .rcs là định dạng riêng của Autodesk ReCap — trong ReCap xuất ra .pts / .e57 → chuyển .las / .ply rồi gắn.');
    const buf = await file.arrayBuffer();
    if(ext === 'las') return parseLAS(buf);
    if(ext === 'ply') return parsePLY(buf);
    return parseText(new TextDecoder().decode(buf), ext === 'pts'); }
  A.pcParse = { las: parseLAS, ply: parsePLY, text: parseText };

  /* ===================== màu ===================== */
  const ramp = t => { t = Math.max(0, Math.min(1, t)); const s = [[0, [40, 70, 220]], [0.25, [0, 190, 230]], [0.5, [40, 200, 70]], [0.75, [240, 220, 40]], [1, [230, 50, 40]]]; for(let i = 1; i < s.length; i++) if(t <= s[i][0]){ const a = s[i - 1], b = s[i], u = (t - a[0]) / (b[0] - a[0]); return [0, 1, 2].map(j => Math.round(a[1][j] + (b[1][j] - a[1][j]) * u)); } return s[s.length - 1][1]; };
  const CLSCOL = { 0: [160, 160, 160], 1: [170, 170, 170], 2: [150, 110, 60], 3: [120, 200, 90], 4: [60, 170, 60], 5: [20, 120, 30], 6: [230, 100, 60], 7: [255, 0, 255], 8: [255, 255, 0], 9: [40, 110, 230], 10: [200, 200, 0], 11: [90, 90, 90], 17: [200, 60, 200], 18: [255, 120, 200] };
  const pctl = (arr, n, q) => { const step = Math.max(1, Math.floor(n / 20000)); const s = []; for(let i = 0; i < n; i += step) s.push(arr[i]); s.sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * q))] || 0; };
  function colorsOf(C, cm, single){ C._c = C._c || {}; const key = cm + (cm === 'single' ? single : ''); if(C._c[key]) return C._c[key]; const n = C.n, out = new Uint8Array(n * 3);
    if(cm === 'rgb' && C.rgb) out.set(C.rgb.subarray(0, n * 3));
    else if(cm === 'int' && C.int){ const lo = pctl(C.int, n, 0.02), hi = Math.max(lo + 1, pctl(C.int, n, 0.98)); for(let i = 0; i < n; i++){ const v = Math.round(Math.max(0, Math.min(1, (C.int[i] - lo) / (hi - lo))) * 235 + 20); out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = v; } }
    else if(cm === 'cls' && C.cls){ for(let i = 0; i < n; i++){ const c = CLSCOL[C.cls[i]] || [200, 200, 200]; out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; } }
    else if(cm === 'single'){ const m = /^#?([0-9a-f]{6})$/i.exec(single || '') || [0, 'e0e0e0']; const v = parseInt(m[1], 16); for(let i = 0; i < n; i++){ out[i * 3] = v >> 16 & 255; out[i * 3 + 1] = v >> 8 & 255; out[i * 3 + 2] = v & 255; } }
    else { const z1 = C.b[5] || 1; for(let i = 0; i < n; i++){ const c = ramp(C.xyz[i * 3 + 2] / z1); out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; } }
    C._c[key] = out; return out; }
  const defCM = C => C.rgb ? 'rgb' : C.cls && C.cls.some(v => v > 1) ? 'cls' : 'elev';
  // vùng cắt: đa giác trong toạ độ điểm (tương đối); inv = giữ phần ngoài
  const inPoly = (x, y, P) => { let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ if(((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; };
  function maskOf(C, crop){ if(!crop || !crop.length) return null; C._m = C._m || {}; const key = JSON.stringify(crop); if(C._m[key]) return C._m[key]; const n = C.n, m = new Uint8Array(n);
    for(let i = 0; i < n; i++){ let keep = true; for(const c of crop){ const ins = inPoly(C.xyz[i * 3], C.xyz[i * 3 + 1], c.p); if(c.inv ? ins : !ins){ keep = false; break; } } m[i] = keep ? 1 : 0; } C._m[key] = m; return m; }

  /* ===================== biến đổi: điểm (tương đối) ↔ bản vẽ ===================== */
  function xf(e){ const pc = e.pc, bw = pc.b[3] || 1, bh = pc.b[4] || 1, r = (e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), su = e.w / bw, sv = e.h / bh;
    return { a: c * su, b: s * su, c: -s * sv, d: c * sv, e: e.x, f: e.y, sz: su }; }
  const toW = (M, x, y) => ({ x: M.a * x + M.c * y + M.e, y: M.b * x + M.d * y + M.f });
  const toL = (M, X, Y) => { const det = M.a * M.d - M.b * M.c; const x = X - M.e, y = Y - M.f; return { x: (M.d * x - M.c * y) / det, y: (-M.b * x + M.a * y) / det }; };
  const zW = (e, C, z) => (C.o[2] + z) * xf(e).sz;   // cao độ theo toạ độ gốc, nhân tỉ lệ

  /* ===================== ảnh nhìn từ trên (cho bản in, AutoCAD, khi chưa có điểm) ===================== */
  async function raster(C, pc, col){ const bw = C.b[3] || 1, bh = C.b[4] || 1, M = 1600; const W = Math.max(8, Math.round(bw >= bh ? M : M * bw / bh)), H = Math.max(8, Math.round(bw >= bh ? M * bh / bw : M));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); const id = g.createImageData(W, H), D = new Uint32Array(id.data.buffer);
    const cols = colorsOf(C, pc.cm || defCM(C), col), m = maskOf(C, pc.crop); const zbuf = new Float32Array(W * H).fill(-Infinity);
    for(let i = 0; i < C.n; i++){ if(m && !m[i]) continue; const px = Math.min(W - 1, Math.floor(C.xyz[i * 3] / bw * W)), py = Math.min(H - 1, Math.floor((1 - C.xyz[i * 3 + 1] / bh) * H)); const k = py * W + px; const z = C.xyz[i * 3 + 2]; if(z < zbuf[k]) continue; zbuf[k] = z; D[k] = 0xff000000 | cols[i * 3 + 2] << 16 | cols[i * 3 + 1] << 8 | cols[i * 3]; }
    g.putImageData(id, 0, 0); const blob = await new Promise(r => cv.toBlob(r, 'image/png')); return A.imgAdd(blob, (pc.name || 'pointcloud') + '.png'); }

  /* ===================== vẽ điểm trên màn hình ===================== */
  let PSIZE = (() => { try{ return +localStorage.getItem('dvd:pcsize') || 2; }catch(_){ return 2; } })();
  let _off = null;
  function drawCloud(e, C){ const cs = imgCorners(e), S = cs.map(p => toScreen(p.x, p.y)); const M = xf(e);
    const S0 = toScreen(M.e, M.f), S1 = toScreen(M.e + M.a, M.f + M.b), S2 = toScreen(M.e + M.c, M.f + M.d); const a = S1.x - S0.x, b = S1.y - S0.y, c = S2.x - S0.x, d = S2.y - S0.y;
    let X0 = Math.min(...S.map(p => p.x)), X1 = Math.max(...S.map(p => p.x)), Y0 = Math.min(...S.map(p => p.y)), Y1 = Math.max(...S.map(p => p.y)); X0 = Math.max(X0, 0); Y0 = Math.max(Y0, 0); X1 = Math.min(X1, W()); Y1 = Math.min(Y1, H()); if(X1 <= X0 || Y1 <= Y0) return;
    const dpr = window.devicePixelRatio || 1, w = Math.ceil((X1 - X0) * dpr), h = Math.ceil((Y1 - Y0) * dpr); if(w * h > 40e6) return;
    if(!_off) _off = document.createElement('canvas'); if(_off.width !== w || _off.height !== h){ _off.width = w; _off.height = h; } const g = _off.getContext('2d'); const id = g.createImageData(w, h), D = new Uint32Array(id.data.buffer);
    const cols = colorsOf(C, e.pc.cm || defCM(C), e.col), m = maskOf(C, e.pc.crop); const step = Math.max(1, Math.ceil(C.n / 2e6)), ps = Math.max(1, Math.min(4, Math.round(PSIZE * dpr / 2) || 1));
    const ka = a * dpr, kb = b * dpr, kc = c * dpr, kd = d * dpr, ke = (S0.x - X0) * dpr, kf = (S0.y - Y0) * dpr; const xyz = C.xyz;
    for(let i = 0; i < C.n; i += step){ if(m && !m[i]) continue; const x = xyz[i * 3], y = xyz[i * 3 + 1]; const sx = (ka * x + kc * y + ke) | 0, sy = (kb * x + kd * y + kf) | 0; if(sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const col = 0xff000000 | cols[i * 3 + 2] << 16 | cols[i * 3 + 1] << 8 | cols[i * 3]; if(ps === 1) D[sy * w + sx] = col; else for(let yy = 0; yy < ps && sy + yy < h; yy++) for(let xx = 0; xx < ps && sx + xx < w; xx++) D[(sy + yy) * w + sx + xx] = col; }
    g.putImageData(id, 0, 0); ctx.save(); ctx.globalAlpha = e.op != null ? e.op : 1; ctx.imageSmoothingEnabled = false; ctx.drawImage(_off, X0, Y0, w / dpr, h / dpr); ctx.restore(); }
  if(typeof window.drawImageEnt === 'function'){ const _di = window.drawImageEnt;
    window.drawImageEnt = function(e){ try{ if(isPC(e) && ctx && !ctx.setOC && ctx.getImageData){ const C = cloud(e.pc.id); if(C){ drawCloud(e, C); return; } } }catch(err){ console.warn('pointcloud', err); } return _di.apply(this, arguments); }; }

  /* ===================== khung 3D ===================== */
  function sync3D(){ const V = A.view3D, T = window.THREE; if(!V || !V.scene || !T) return;
    for(const o of V.scene.children.filter(o => o.userData && o.userData.dvdPC)){ V.scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
    for(const e of ME()){ if(!isPC(e) || e.vh) continue; try{ if(A.isHiddenE && A.isHiddenE(e)) continue; }catch(_){} const C = cloud(e.pc.id); if(!C) continue; const M = xf(e), cols = colorsOf(C, e.pc.cm || defCM(C), e.col), m = maskOf(C, e.pc.crop);
      const step = Math.max(1, Math.ceil(C.n / 1.5e6)); const P = [], Q = []; for(let i = 0; i < C.n; i += step){ if(m && !m[i]) continue; const p = toW(M, C.xyz[i * 3], C.xyz[i * 3 + 1]); P.push(p.x, p.y, (C.o[2] + C.xyz[i * 3 + 2]) * M.sz); Q.push(cols[i * 3] / 255, cols[i * 3 + 1] / 255, cols[i * 3 + 2] / 255); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(Q, 3));
      const pts = new T.Points(g, new T.PointsMaterial({ size: PSIZE, sizeAttenuation: false, vertexColors: true })); pts.userData.dvdPC = 1; V.scene.add(pts); }
    try{ V.render && V.render(); }catch(_){} }
  A.pcSync3D = sync3D;
  // mở khung 3D: thêm điểm; bản vẽ không có khối 3D thì đưa camera tới đám mây điểm
  function frame3D(){ const V = A.view3D; if(!V || !V.camTo || V.solids) return; let a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity];
    for(const e of ME()){ if(!isPC(e) || e.vh) continue; const C = cloud(e.pc.id); if(!C) continue; const M = xf(e); for(const c of imgCorners(e)){ a[0] = Math.min(a[0], c.x); a[1] = Math.min(a[1], c.y); b[0] = Math.max(b[0], c.x); b[1] = Math.max(b[1], c.y); } a[2] = Math.min(a[2], C.o[2] * M.sz); b[2] = Math.max(b[2], (C.o[2] + C.b[5]) * M.sz); }
    if(!isFinite(a[0])) return; const c = a.map((v, i) => (v + b[i]) / 2), sz = Math.max(b[0] - a[0], b[1] - a[1], b[2] - a[2], 1e-6); V.camTo([c[0] - sz * 0.9, c[1] - sz * 1.1, c[2] + sz * 0.8], c); try{ V.render(); }catch(_){} }
  if(A.open3D){ const _o = A.open3D; A.open3D = async function(){ const r = await _o.apply(this, arguments); setTimeout(() => { sync3D(); frame3D(); }, 50); return r; }; }
  { const _c = A.commit; A.commit = function(ch){ const r = _c.apply(this, arguments); try{ if(A.view3D && ch && [...(ch.add || []), ...(ch.del || []), ...(ch.rep || []).map(x => x[1])].some(isPC)) setTimeout(sync3D, 30); }catch(_){} return r; }; }

  /* ===================== POINTCLOUDATTACH ===================== */
  async function attach(file){
    log('POINTCLOUDATTACH: đang đọc ' + file.name + '…'); let C; try{ C = await parseFile(file); }catch(err){ say(err.message); return null; }
    const k = await A.getPoint('Điểm chèn hoặc [Toạ độ trong tệp] <Toạ độ trong tệp>', { kw: [{ k: 'G', t: 'Toạ độ trong tệp' }], rubber: false });
    const sc = numOr(await A.getNum('Tỉ lệ', { def: 1 }), 1) || 1, rot = numOr(await A.getNum('Góc xoay (độ)', { def: 0 }), 0);
    const ins = k.pt ? { x: k.pt.x, y: k.pt.y } : { x: C.o[0] * sc, y: C.o[1] * sc };
    const id = 'PC' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const name = String(file.name || 'pointcloud').replace(/\.[^.]+$/, '');
    try{ await put(id, C); }catch(err){ console.warn(err); say('Không lưu được điểm vào bộ nhớ trình duyệt (quá lớn?) — điểm chỉ dùng trong phiên này.'); }
    PC.set(id, C); const pc = { id, name, n: C.n, b: C.b, o: C.o, cm: defCM(C), has: [C.rgb ? 'rgb' : '', C.int ? 'int' : '', C.cls ? 'cls' : ''].filter(Boolean) };
    const im = await raster(C, pc, '#e0e0e0');
    const e = A.newProps({ type: 'IMAGE', x: ins.x, y: ins.y, w: (C.b[3] || 1) * sc, h: (C.b[4] || 1) * sc, rot, img: im.id, name: name + '.png', op: 1, frame: false }); delete e.lt; e.pc = pc;
    A.commit({ add: [e] }, 'POINTCLOUDATTACH: ' + name + ' — ' + C.n.toLocaleString('vi-VN') + ' điểm' + (C.las ? ' (LAS ' + C.las.ver + ', định dạng ' + C.las.fmt + (C.las.N > C.n ? ', lấy mẫu từ ' + C.las.N.toLocaleString('vi-VN') : '') + ')' : '') + ', cao độ ' + C.o[2].toFixed(2) + ' → ' + (C.o[2] + C.b[5]).toFixed(2));
    try{ A.pushView && A.pushView(); fitView(); }catch(_){} return e; }
  A.pcAttach = attach;
  plain(['POINTCLOUDATTACH', 'PCATTACH'], 'Gắn đám mây điểm: .las, .xyz / .txt / .csv / .pts, .ply', () => pickFile('.las,.laz,.xyz,.txt,.csv,.pts,.ply,.e57,.rcp,.rcs').then(f => f && A.run('POINTCLOUDATTACH', () => attach(f))));
  async function regen(e, patch, msg){ const C = cloud(e.pc.id); if(!C){ say('Dữ liệu điểm của "' + (e.pc.name || '') + '" không có trong máy này — gắn lại tệp điểm.'); return; } const w = copy(e); Object.assign(w.pc, patch); const im = await raster(C, w.pc, w.col); w.img = im.id; A.commit({ rep: [[e, w]] }, msg); return w; }
  const pickPC = async p => { const r = await A.getEnt(p || 'Chọn đám mây điểm', { filter: isPC }); return r.ent || null; };

  /* ===================== POINTCLOUD · COLORMAP · CROP · POINT SIZE ===================== */
  const CMN = { rgb: 'Màu RGB', int: 'Cường độ', elev: 'Cao độ', cls: 'Phân loại', single: 'Một màu' };
  async function colormap(e){ const C = cloud(e.pc.id); const has = C ? ['rgb', 'int', 'cls'].filter(k => C[k]) : (e.pc.has || []);
    const opts = ['rgb', 'int', 'elev', 'cls', 'single'].filter(k => k === 'elev' || k === 'single' || has.includes(k));
    const r = await A.getKw('Tô màu [' + opts.map(k => CMN[k]).join(' / ') + ']', { kw: opts.map(k => ({ k: { rgb: 'RGB', int: 'I', elev: 'E', cls: 'C', single: 'S' }[k], t: CMN[k] })), def: CMN[e.pc.cm || 'elev'] });
    const map = { RGB: 'rgb', I: 'int', E: 'elev', C: 'cls', S: 'single' }; const cm = map[r.kw] || e.pc.cm; if(!cm || cm === e.pc.cm) return; await regen(e, { cm }, 'POINTCLOUDCOLORMAP: ' + CMN[cm]); }
  cmd(['POINTCLOUDCOLORMAP', 'PCCOLORMAP'], 'Tô màu đám mây điểm: RGB, cường độ, cao độ, phân loại (LAS), một màu', async () => { const e = await pickPC(); if(e) await colormap(e); });
  async function crop(e){ const k = await A.getKw('Cắt [Chữ nhật / Đa giác]', { kw: [{ k: 'R', t: 'Chữ nhật' }, { k: 'P', t: 'Đa giác' }], def: 'Chữ nhật' }); let W = [];
    if(k.kw === 'P'){ for(;;){ const p = await A.getPoint(W.length ? 'Điểm tiếp theo (Enter = xong)' : 'Điểm đầu đa giác', { base: W[W.length - 1], preview: W.length ? (g, q) => g.ents([{ type: 'POLYLINE', closed: true, vertices: W.concat([q]) }], '#ffb347') : null }); if(!p.pt) break; W.push(p.pt); } if(W.length < 3) return; }
    else { const p1 = await A.getPoint('Góc thứ nhất'); if(!p1.pt) return; const p2 = await A.getCorner ? await A.getCorner('Góc đối diện', { base: p1.pt }) : await A.getPoint('Góc đối diện', { base: p1.pt, preview: (g, q) => g.ents([{ type: 'POLYLINE', closed: true, vertices: [p1.pt, { x: q.x, y: p1.pt.y }, q, { x: p1.pt.x, y: q.y }] }], '#ffb347') }); if(!p2.pt) return; const a = p1.pt, b = p2.pt; W = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]; }
    const s = await A.getKw('Giữ [Bên trong / Bên ngoài]', { kw: [{ k: 'I', t: 'Bên trong' }, { k: 'O', t: 'Bên ngoài' }], def: 'Bên trong' });
    const M = xf(e); const P = W.map(q => { const l = toL(M, q.x, q.y); return [l.x, l.y]; }); const cr = (e.pc.crop || []).concat([{ p: P, inv: s.kw === 'O' }]);
    const w = await regen(e, { crop: cr }, 'POINTCLOUDCROP: cắt ' + (s.kw === 'O' ? 'giữ bên ngoài' : 'giữ bên trong') + ' (' + cr.length + ' vùng cắt)'); if(w){ const C = cloud(e.pc.id), m = C && maskOf(C, cr); if(m){ let n = 0; for(const v of m) n += v; log('Còn ' + n.toLocaleString('vi-VN') + ' / ' + C.n.toLocaleString('vi-VN') + ' điểm.'); } } }
  cmd(['POINTCLOUDCROP', 'PCCROP'], 'Cắt đám mây điểm theo chữ nhật / đa giác (giữ trong hoặc ngoài)', async () => { const e = await pickPC(); if(e) await crop(e); });
  cmd(['POINTCLOUDUNCROP', 'PCUNCROP'], 'Bỏ mọi vùng cắt của đám mây điểm', async () => { const e = await pickPC(); if(!e) return; if(!(e.pc.crop || []).length){ log('Đám mây điểm chưa bị cắt.'); return; } await regen(e, { crop: null }, 'POINTCLOUDUNCROP: đã bỏ vùng cắt'); });
  cmd(['POINTCLOUDPOINTSIZE', 'PCPOINTSIZE'], 'Cỡ điểm khi hiện đám mây điểm (1 – 8 điểm ảnh)', async () => { const r = await A.getNum('Cỡ điểm (1 – 8)', { def: PSIZE }); const v = Math.round(numOr(r, PSIZE)); if(!(v >= 1 && v <= 8)) return; PSIZE = v; try{ localStorage.setItem('dvd:pcsize', String(v)); }catch(_){} try{ draw(); }catch(_){} sync3D(); log('POINTCLOUDPOINTSIZE = ' + v); });
  cmd(['POINTCLOUD', 'PC'], 'Đám mây điểm: thông tin, tô màu, cắt, bỏ cắt, cỡ điểm, gắn mới', async () => {
    const k = await A.getKw('Đám mây điểm [Gắn / Tô màu / Cắt / Bỏ cắt / Cỡ điểm / Thông tin]', { kw: [{ k: 'A', t: 'Gắn' }, { k: 'C', t: 'Tô màu' }, { k: 'R', t: 'Cắt' }, { k: 'U', t: 'Bỏ cắt' }, { k: 'S', t: 'Cỡ điểm' }, { k: 'I', t: 'Thông tin' }], def: 'Thông tin' });
    const go = c => setTimeout(() => DVDCmd.run(c), 0);
    if(k.kw === 'A') return go('POINTCLOUDATTACH'); if(k.kw === 'S') return go('POINTCLOUDPOINTSIZE');
    const e = await pickPC(); if(!e) return; if(k.kw === 'C') return colormap(e); if(k.kw === 'R') return crop(e); if(k.kw === 'U') return regen(e, { crop: null }, 'Đã bỏ vùng cắt');
    const C = cloud(e.pc.id), p = e.pc; log('Đám mây điểm "' + p.name + '": ' + (p.n || 0).toLocaleString('vi-VN') + ' điểm, rộng ' + (e.w).toFixed(2) + ' × ' + (e.h).toFixed(2) + ', cao ' + ((p.b[5] || 0) * xf(e).sz).toFixed(2) + ', tô màu: ' + CMN[p.cm || 'elev'] + ', có: ' + ((p.has || []).join(', ') || 'chỉ XYZ') + (p.crop && p.crop.length ? ', ' + p.crop.length + ' vùng cắt' : '') + (C ? '' : ' — dữ liệu điểm không có trong máy này (chỉ hiện ảnh)')); });

  /* ===================== trích hình học ===================== */
  // điểm (toạ độ bản vẽ, đã cắt) trong vùng gần (x, y), bán kính r
  function near(e, C, x, y, r){ const M = xf(e), m = maskOf(C, e.pc.crop), l = toL(M, x, y), rl = r / M.sz, out = []; const xyz = C.xyz;
    for(let i = 0; i < C.n; i++){ if(m && !m[i]) continue; const dx = xyz[i * 3] - l.x, dy = xyz[i * 3 + 1] - l.y; if(dx * dx + dy * dy > rl * rl) continue; const p = toW(M, xyz[i * 3], xyz[i * 3 + 1]); out.push([p.x, p.y, (C.o[2] + xyz[i * 3 + 2]) * M.sz]); } return out; }
  // đường thẳng khớp nhất (2D) qua các điểm: tâm + hướng (PCA)
  function fitLine(P){ let cx = 0, cy = 0; for(const p of P){ cx += p[0]; cy += p[1]; } cx /= P.length; cy /= P.length; let sxx = 0, sxy = 0, syy = 0; for(const p of P){ const dx = p[0] - cx, dy = p[1] - cy; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy); return { c: [cx, cy], d: [Math.cos(th), Math.sin(th)] }; }
  const isect = (L1, L2) => { const det = L1.d[0] * (-L2.d[1]) - L1.d[1] * (-L2.d[0]); if(Math.abs(det) < 1e-9) return null; const bx = L2.c[0] - L1.c[0], by = L2.c[1] - L1.c[1]; const t = (bx * (-L2.d[1]) - by * (-L2.d[0])) / det; return [L1.c[0] + L1.d[0] * t, L1.c[1] + L1.d[1] * t]; };
  const zq = (P, q) => { const z = P.map(p => p[2]).sort((a, b) => a - b); return z[Math.min(z.length - 1, Math.max(0, Math.floor(z.length * q)))]; };
  const R0 = e => Math.max(e.w, e.h) / 60;
  async function pickRad(e){ return numOr(await A.getDist('Bán kính lấy mẫu', { def: +R0(e).toPrecision(3) }), R0(e)); }
  cmd(['PCEXTRACTSECTION'], 'Mặt cắt đứng qua đám mây điểm: 2 điểm + bề dày lát → đa tuyến 3D theo mặt cắt', async () => {
    const e = await pickPC(); if(!e) return; const C = cloud(e.pc.id); if(!C){ say('Không có dữ liệu điểm.'); return; }
    const p1 = await A.getPoint('Điểm đầu đường cắt'); if(!p1.pt) return; const p2 = await A.getPoint('Điểm cuối đường cắt', { base: p1.pt }); if(!p2.pt) return;
    const t = numOr(await A.getDist('Bề dày lát cắt', { def: +R0(e).toPrecision(3) }), R0(e)) / 2; const dx = p2.pt.x - p1.pt.x, dy = p2.pt.y - p1.pt.y, L = Math.hypot(dx, dy); if(L < 1e-9) return; const ux = dx / L, uy = dy / L;
    const M = xf(e), m = maskOf(C, e.pc.crop); const pts = [];
    for(let i = 0; i < C.n; i++){ if(m && !m[i]) continue; const p = toW(M, C.xyz[i * 3], C.xyz[i * 3 + 1]); const ax = p.x - p1.pt.x, ay = p.y - p1.pt.y; const s = ax * ux + ay * uy, d = -ax * uy + ay * ux; if(s < 0 || s > L || Math.abs(d) > t) continue; pts.push([s, (C.o[2] + C.xyz[i * 3 + 2]) * M.sz]); }
    if(pts.length < 3){ log('Lát cắt không trúng điểm nào.'); return; }
    // chia theo chiều dài: mỗi ô lấy điểm cao nhất (đường bao trên như mặt đất / mái)
    const nb = Math.max(10, Math.min(1000, Math.round(L / (t * 2)))); const top = new Array(nb).fill(-Infinity); for(const [s, z] of pts){ const k = Math.min(nb - 1, Math.floor(s / L * nb)); if(z > top[k]) top[k] = z; }
    const V = []; for(let k = 0; k < nb; k++){ if(!isFinite(top[k])) continue; const s = (k + 0.5) / nb * L; V.push({ x: p1.pt.x + ux * s, y: p1.pt.y + uy * s, z: top[k] }); }
    const pl = A.newProps({ type: 'POLYLINE', p3: 1, closed: false, vertices: V }); A.commit({ add: [pl] }, 'PCEXTRACTSECTION: đa tuyến 3D ' + V.length + ' đỉnh từ ' + pts.length.toLocaleString('vi-VN') + ' điểm trong lát cắt'); });
  async function twoWalls(e, C){ const r = await pickRad(e); const a = await A.getPoint('Bấm lên mặt tường thứ nhất'); if(!a.pt) return null; const b = await A.getPoint('Bấm lên mặt tường thứ hai'); if(!b.pt) return null;
    const P1 = near(e, C, a.pt.x, a.pt.y, r), P2 = near(e, C, b.pt.x, b.pt.y, r); if(P1.length < 5 || P2.length < 5){ log('Quá ít điểm quanh chỗ bấm — tăng bán kính lấy mẫu.'); return null; }
    const L1 = fitLine(P1), L2 = fitLine(P2), X = isect(L1, L2); if(!X){ log('Hai mặt song song, không có giao tuyến.'); return null; } return { X, P: P1.concat(P2) }; }
  cmd(['PCEXTRACTEDGE'], 'Trích cạnh giao của hai mặt tường (đứng) trong đám mây điểm → đoạn thẳng 3D', async () => { const e = await pickPC(); if(!e) return; const C = cloud(e.pc.id); if(!C) return; const R = await twoWalls(e, C); if(!R) return;
    const z0 = zq(R.P, 0.02), z1 = zq(R.P, 0.98); const ln = A.newProps({ type: 'POLYLINE', p3: 1, vertices: [{ x: R.X[0], y: R.X[1], z: z0 }, { x: R.X[0], y: R.X[1], z: z1 }] }); A.commit({ add: [ln] }, 'PCEXTRACTEDGE: cạnh tại ' + R.X.map(v => v.toFixed(3)).join(', ') + ', cao độ ' + z0.toFixed(2) + ' → ' + z1.toFixed(2)); });
  cmd(['PCEXTRACTCORNER'], 'Trích góc: giao hai mặt tường và mặt sàn trong đám mây điểm → điểm', async () => { const e = await pickPC(); if(!e) return; const C = cloud(e.pc.id); if(!C) return; const R = await twoWalls(e, C); if(!R) return;
    const z = zq(R.P, 0.02); const pt = A.newProps({ type: 'POINT', x: R.X[0], y: R.X[1], z }); A.commit({ add: [pt] }, 'PCEXTRACTCORNER: góc tại ' + R.X.map(v => v.toFixed(3)).join(', ') + ', cao độ ' + z.toFixed(3)); });
  cmd(['PCEXTRACTCENTERLINE'], 'Trích tâm ống / cột đứng trong đám mây điểm → đường tâm 3D + bán kính', async () => { const e = await pickPC(); if(!e) return; const C = cloud(e.pc.id); if(!C) return; const r = await pickRad(e);
    const a = await A.getPoint('Bấm lên ống / cột'); if(!a.pt) return; const P = near(e, C, a.pt.x, a.pt.y, r); if(P.length < 8){ log('Quá ít điểm quanh chỗ bấm.'); return; }
    // đường tròn khớp nhất (Kåsa): x² + y² + Dx + Ey + F = 0
    let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0; const n = P.length; for(const p of P){ const x = p[0] - a.pt.x, y = p[1] - a.pt.y, z = x * x + y * y; Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; Sxz += x * z; Syz += y * z; Sz += z; }
    const Mx = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, n]], rhs = [-Sxz, -Syz, -Sz]; const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D0 = det3(Mx); if(Math.abs(D0) < 1e-18){ log('Không khớp được đường tròn.'); return; } const sol = [0, 1, 2].map(j => det3(Mx.map((row, i) => row.map((v, k) => k === j ? rhs[i] : v))) / D0);
    const cx = -sol[0] / 2 + a.pt.x, cy = -sol[1] / 2 + a.pt.y, rr = Math.sqrt(Math.max(0, sol[0] * sol[0] / 4 + sol[1] * sol[1] / 4 - sol[2])); const z0 = zq(P, 0.02), z1 = zq(P, 0.98);
    const ln = A.newProps({ type: 'POLYLINE', p3: 1, vertices: [{ x: cx, y: cy, z: z0 }, { x: cx, y: cy, z: z1 }] }); A.commit({ add: [ln] }, 'PCEXTRACTCENTERLINE: tâm ' + cx.toFixed(3) + ', ' + cy.toFixed(3) + ', bán kính ' + rr.toFixed(3) + ', cao độ ' + z0.toFixed(2) + ' → ' + z1.toFixed(2)); });
  plain(['PCINWIZARD'], 'Lập chỉ mục đám mây điểm: DVDCAD đọc thẳng .las / .ply / .xyz / .pts nên không cần', () => log('PCINWIZARD: DVDCAD đọc thẳng tệp .las / .ply / .xyz / .pts (không cần lập chỉ mục .rcp như AutoCAD). Dùng POINTCLOUDATTACH. Tệp quá 4 triệu điểm được lấy mẫu đều.'));
  plain(['RECAP'], 'Autodesk ReCap là chương trình riêng — DVDCAD gắn thẳng tệp điểm', () => log('RECAP: Autodesk ReCap là phần mềm riêng của Autodesk. Từ ReCap xuất ra .pts / .e57 (rồi .las / .ply) để gắn vào DVDCAD bằng POINTCLOUDATTACH.'));

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
