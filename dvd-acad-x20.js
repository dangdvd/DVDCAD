/* DVDCAD v5v — điểm đánh dấu vị trí địa lý (Position Marker) như AutoCAD
   · GEOMARKPOINT / GEOMARKPOSITION: điểm đánh dấu tại một điểm trên bản vẽ, ghi vĩ độ / kinh độ (hoặc ghi chú riêng)
   · GEOMARKLATLONG: nhập vĩ độ, kinh độ → đặt điểm đánh dấu đúng chỗ theo vị trí địa lý của bản vẽ
   · GEOMARKME: điểm đánh dấu tại vị trí hiện tại của máy (định vị của trình duyệt / Windows)
   · GEOLOCATEME: hiện / ẩn chấm vị trí hiện tại trên bản vẽ · GEOREORIENTMARKER: đổi điểm thiết kế + hướng bắc mà giữ vĩ độ / kinh độ
   Điểm đánh dấu là một nhóm (vòng tròn + đường dẫn + chữ) — AutoCAD thấy như đối tượng thường; DVDCAD đọc lại cả vĩ độ / kinh độ. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x20 || !window.DVDCmd) return; A._x20 = true;
  const log = m => { try{ A.log(m); }catch(_){} };
  const say = m => { try{ toast(m); }catch(_){} };
  const ecmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const redraw = () => { try{ draw(); }catch(_){} };

  /* ==================================================================
     GEOMARK… — điểm đánh dấu vị trí
     ================================================================== */
  const geo = () => (A.geoGet ? A.geoGet() : null);
  const needGeo = () => { if(geo() && A.geoToLL) return true; log('Bản vẽ chưa có vị trí địa lý — dùng GEOGRAPHICLOCATION trước.'); return false; };
  const llTxt = (lat, lon) => Math.abs(lat).toFixed(6) + '°' + (lat < 0 ? 'S' : 'N') + ', ' + Math.abs(lon).toFixed(6) + '°' + (lon < 0 ? 'W' : 'E');
  const parseDeg = t => { t = String(t || '').trim().replace(',', '.'); if(!t) return null; const neg = /[SWsw]|^-/.test(t); const n = t.match(/[\d.]+/g); if(!n) return null; const v = (+n[0] || 0) + (+n[1] || 0) / 60 + (+n[2] || 0) / 3600; return isFinite(v) ? (neg ? -v : v) : null; };
  const markSize = () => { let s = 12 / ((typeof view !== 'undefined' && view.scale) || 1); const ts = A.sysvar ? +A.sysvar.get('TEXTSIZE') : 0; if(ts > s) s = ts; return s; };
  function markEnts(p, info){
    const s = markSize(), gid = A.newGroupId('GM'), out = [], g = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lat: info.lat, lon: info.lon, z: info.z || 0, note: info.note || '' };
    const mk = o => { const e = A.newProps(o); e.grp = gid; e.blk = '*GEOMARK'; e.gmk = g; out.push(e); return e; };
    mk({ type: 'POINT', x: p.x, y: p.y });
    mk({ type: 'CIRCLE', cx: p.x, cy: p.y, r: s * 0.35 });
    const t0 = { x: p.x + s * 1.2, y: p.y + s * 1.2 };
    mk({ type: 'LINE', x1: p.x + s * 0.25, y1: p.y + s * 0.25, x2: t0.x, y2: t0.y });
    mk({ type: 'LINE', x1: t0.x, y1: t0.y, x2: t0.x + s * 0.6, y2: t0.y });
    const text = g.note || llTxt(g.lat, g.lon);
    mk({ type: 'TEXT', x: t0.x + s * 0.8, y: t0.y, h: s * 0.8, text, rot: 0, va: 'middle', mt: text.includes('\n') ? true : undefined });
    return out;
  }
  A.geoMarkEnts = markEnts;
  async function askNote(def){ const r = await A.getStr('Nhập ghi chú cho điểm đánh dấu (Enter = vĩ độ / kinh độ)', { def: '' }); const t = String(r.str || '').trim(); return t || def || ''; }
  async function placeAt(p, ll, cmdName){
    const z = await A.getNum('Chỉ định cao độ Z', { def: 0 }); const note = await askNote('');
    const L = markEnts(p, { lat: ll.lat, lon: ll.lon, z: z.num || 0, note });
    A.commit({ add: L }, cmdName + ': ' + llTxt(ll.lat, ll.lon)); log(cmdName + ': điểm đánh dấu tại ' + llTxt(ll.lat, ll.lon) + (z.num ? ', Z = ' + z.num : '') + '.');
  }
  async function markPoint(name){
    if(!needGeo()) return;
    for(;;){ const r = await A.getPoint('Chỉ định vị trí hoặc', { kw: [{ k: 'L', t: 'Vĩ độ-Kinh độ' }] });
      if(r.kw === 'L'){ await markLatLong(name); return; }
      if(!r.pt) return; const ll = A.geoToLL(r.pt); await placeAt(r.pt, ll, name); return; }
  }
  async function markLatLong(name){
    if(!needGeo()) return;
    const a = await A.getStr('Nhập vĩ độ (vd 21.0285 hoặc 21°01\'42"N)'); const lat = parseDeg(a.str); if(lat == null || Math.abs(lat) > 90){ log('Vĩ độ không hợp lệ.'); return; }
    const b = await A.getStr('Nhập kinh độ (vd 105.8542 hoặc 105°51\'15"E)'); const lon = parseDeg(b.str); if(lon == null || Math.abs(lon) > 180){ log('Kinh độ không hợp lệ.'); return; }
    const p = A.geoFromLL(lat, lon); await placeAt(p, { lat, lon }, name);
    try{ const m = markSize() * 30; zoomToWorldRect(p.x - m, p.y - m, p.x + m, p.y + m); }catch(_){}
  }
  ecmd(['GEOMARKPOINT', 'GEOMARK'], 'Điểm đánh dấu vị trí (Position Marker) tại một điểm trên bản vẽ: ghi vĩ độ / kinh độ hoặc ghi chú', () => markPoint('GEOMARKPOINT'));
  ecmd(['GEOMARKPOSITION'], 'Điểm đánh dấu vị trí tại điểm chỉ định trên bản vẽ / bản đồ nền (như GEOMARKPOINT)', () => markPoint('GEOMARKPOSITION'));
  ecmd(['GEOMARKLATLONG'], 'Điểm đánh dấu vị trí theo vĩ độ / kinh độ nhập vào', () => markLatLong('GEOMARKLATLONG'));
  const here = () => new Promise((res, rej) => { if(!navigator.geolocation){ rej(new Error('Thiết bị không hỗ trợ định vị.')); return; } navigator.geolocation.getCurrentPosition(p => res(p.coords), e => rej(new Error(e && e.message || 'Không lấy được vị trí')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }); });
  ecmd(['GEOMARKME'], 'Điểm đánh dấu tại vị trí hiện tại của máy (định vị)', async () => {
    if(!needGeo()) return; log('Đang lấy vị trí hiện tại…');
    let c; try{ c = await here(); }catch(err){ log('GEOMARKME: ' + err.message + ' — dùng GEOMARKLATLONG để nhập tay.'); return; }
    const p = A.geoFromLL(c.latitude, c.longitude); await placeAt(p, { lat: c.latitude, lon: c.longitude }, 'GEOMARKME');
  });
  // GEOLOCATEME: chấm xanh vị trí hiện tại (theo dõi liên tục) — chỉ hiện trên màn hình
  let LOC = null, watchId = null;
  plain(['GEOLOCATEME'], 'Hiện / ẩn vị trí hiện tại của máy trên bản vẽ (chấm xanh, cập nhật liên tục)', () => {
    if(watchId != null){ try{ navigator.geolocation.clearWatch(watchId); }catch(_){} watchId = null; LOC = null; redraw(); log('GEOLOCATEME: tắt.'); return; }
    if(!needGeo()) return; if(!navigator.geolocation){ log('Thiết bị không hỗ trợ định vị.'); return; }
    watchId = navigator.geolocation.watchPosition(p => { LOC = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; redraw(); }, e => { log('GEOLOCATEME: ' + (e && e.message || 'không lấy được vị trí')); try{ navigator.geolocation.clearWatch(watchId); }catch(_){} watchId = null; }, { enableHighAccuracy: true, maximumAge: 10000 });
    log('GEOLOCATEME: đang theo dõi vị trí hiện tại (gõ lại để tắt).');
  });
  { const _d = window.draw; window.draw = function(){ const r = _d.apply(this, arguments); try{ if(!LOC || !A.geoFromLL || (typeof plotMode !== 'undefined' && plotMode)) return r; const p = A.geoFromLL(LOC.lat, LOC.lon); if(!p) return r;
      const q = toScreen(p.x, p.y), dpr = window.devicePixelRatio || 1; ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const u = (typeof unitToMM === 'function' ? unitToMM() : 1) / 1000, ra = LOC.acc / (u || 1) * view.scale;
      if(ra > 8 && ra < 4000){ ctx.fillStyle = 'rgba(40,140,255,.15)'; ctx.beginPath(); ctx.arc(q.x, q.y, ra, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#2a8cff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }catch(_){} return r; }; }
  // GEOREORIENTMARKER: điểm thiết kế mới + hướng bắc mới, giữ vĩ độ / kinh độ; điểm đánh dấu đi theo
  ecmd(['GEOREORIENTMARKER'], 'Đổi điểm mốc địa lý (điểm thiết kế) và hướng bắc mà giữ nguyên vĩ độ / kinh độ', async () => {
    const g = geo(); if(!g){ log('Bản vẽ chưa có vị trí địa lý — dùng GEOGRAPHICLOCATION trước.'); return; }
    const r = await A.getPoint('Chỉ định điểm mốc mới (ứng với ' + llTxt(g.lat, g.lon) + ')', { def: '' }); const p = r.pt || { x: g.dx || 0, y: g.dy || 0 };
    const a = await A.getAngle('Chỉ định hướng bắc', { base: p, def: 90 + (g.north || 0) }); let north = g.north || 0;
    if(a.pt) north = Math.atan2(a.pt.y - p.y, a.pt.x - p.x) * 180 / Math.PI - 90; else if(a.num != null) north = a.num - 90;
    // giữ các điểm đánh dấu đúng vĩ độ / kinh độ: dời theo hệ mới
    const marks = new Map(); for(const e of ME()) if(e.gmk && e.grp){ let L = marks.get(e.grp); if(!L){ L = []; marks.set(e.grp, L); } L.push(e); }
    const old = {}; for(const [gid, L] of marks){ const pt = L.find(e => e.type === 'POINT'); if(pt) old[gid] = { x: pt.x, y: pt.y, m: pt.gmk }; }
    A.geoSet(Object.assign({}, g, { dx: p.x, dy: p.y, north }));
    const rep = []; for(const [gid, L] of marks){ const o = old[gid]; if(!o) continue; const q = A.geoFromLL(o.m.lat, o.m.lon); const dx = q.x - o.x, dy = q.y - o.y; if(Math.hypot(dx, dy) < 1e-12) continue;
      for(const e of L){ const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; try{ translateEnt(w, dx, dy); }catch(_){} rep.push([e, w]); } }
    if(rep.length) A.commit({ rep }, 'GEOREORIENTMARKER'); redraw();
    log('GEOREORIENTMARKER: điểm mốc (' + (+p.x.toFixed(4)) + ', ' + (+p.y.toFixed(4)) + '), hướng bắc ' + (+north.toFixed(4)) + '°' + (marks.size ? ', ' + marks.size + ' điểm đánh dấu dời theo' : '') + '.');
  });
  // mở lại: gom điểm đánh dấu thành nhóm theo dữ liệu gmk
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); try{ const by = new Map(); for(const e of ME()){ if(!e.gmk) continue; const k = e.gmk.id || JSON.stringify(e.gmk); let id = by.get(k); if(!id){ id = A.newGroupId('GM'); by.set(k, id); } e.grp = id; e.blk = '*GEOMARK'; } }catch(err){ console.warn('geomark', err); } }; })(A.onLoad);

  /* ==================================================================
     3DPOLY · PFACE · 3DMESH · EDGE — đối tượng 3D cổ điển của AutoCAD
     ================================================================== */
  const elev = () => { try{ return +(A.sysvar && A.sysvar.get('ELEVATION')) || 0; }catch(_){ return 0; } };
  ecmd(['3DPOLY', '3P'], 'Đa tuyến 3D: các đỉnh có cao độ riêng (gõ x,y,z), đoạn thẳng, Kín / Hoàn tác', async () => {
    const V = [];
    for(;;){
      const kw = V.length >= 2 ? [{ k: 'C', t: 'Kín' }, { k: 'U', t: 'Hoàn tác' }] : V.length ? [{ k: 'U', t: 'Hoàn tác' }] : [];
      const r = await A.getPoint(V.length ? 'Chỉ định điểm tiếp theo hoặc' : 'Chỉ định điểm đầu của đa tuyến', { base: V[V.length - 1], kw, preview: V.length ? (g, p) => g.ents([{ type: 'POLYLINE', vertices: V.concat([p]), closed: false }], '#9fd0ff') : null });
      if(r.kw === 'U'){ V.pop(); continue; }
      if(r.kw === 'C' || !r.pt){ if(V.length >= 2){ const e = A.newProps({ type: 'POLYLINE', p3: 1, closed: r.kw === 'C', vertices: V.map(q => ({ x: q.x, y: q.y, z: q.z })) }); A.commit({ add: [e] }, '3DPOLY'); log('3DPOLY: ' + V.length + ' đỉnh' + (r.kw === 'C' ? ', kín' : '') + ', cao độ ' + Math.min(...V.map(q => q.z)) + ' → ' + Math.max(...V.map(q => q.z)) + '.'); } return; }
      V.push({ x: r.pt.x, y: r.pt.y, z: r.pt.z != null ? r.pt.z : (V.length ? V[V.length - 1].z : elev()) });
    }
  });
  // PFACE: nhập các đỉnh, rồi mỗi mặt là danh sách số thứ tự đỉnh (số âm = cạnh ẩn như AutoCAD)
  ecmd(['PFACE'], 'Lưới đa diện (polyface mesh): nhập các đỉnh rồi từng mặt theo số thứ tự đỉnh', async () => {
    const P = [];
    for(;;){ const r = await A.getPoint('Chỉ định vị trí đỉnh ' + (P.length + 1) + (P.length >= 3 ? ' hoặc <xác định mặt>' : ''), { base: P[P.length - 1] }); if(!r.pt){ if(P.length >= 3) break; return; } P.push({ x: r.pt.x, y: r.pt.y, z: r.pt.z != null ? r.pt.z : elev() }); }
    const F = [];
    for(let f = 1; ; f++){ const cur = [];
      for(let k = 1; ; k++){ const r = await A.getNum('Mặt ' + f + ', đỉnh ' + k + (k > 3 ? ' (Enter = mặt kế tiếp)' : '') + (k === 1 && f > 1 ? ' (Enter = xong)' : '')); if(r.num == null){ break; } const i = Math.abs(Math.round(r.num)); if(i < 1 || i > P.length){ log('Số đỉnh phải từ 1 tới ' + P.length + '.'); k--; continue; } cur.push(i - 1); }
      if(cur.length < 3){ if(cur.length) log('Mặt cần ít nhất 3 đỉnh — bỏ qua.'); if(!cur.length) break; continue; } F.push(cur); }
    if(!F.length) return; const v = []; for(const q of P) v.push(q.x, q.y, q.z); const I = []; for(const f of F) for(let k = 1; k + 1 < f.length; k++) I.push(f[0], f[k], f[k + 1]);
    const e = A.meshEnt ? A.meshEnt(v, I, null) : null; if(!e){ log('Không tạo được lưới.'); return; } e.srf = 1; A.newProps(e); delete e.lt; A.commit({ add: [e] }, 'PFACE'); log('PFACE: ' + P.length + ' đỉnh, ' + F.length + ' mặt.');
  });
  // 3DMESH: lưới đa giác M×N theo từng đỉnh
  ecmd(['3DMESH'], 'Lưới đa giác 3D M × N: nhập cỡ lưới rồi toạ độ từng đỉnh (m, n)', async () => {
    const a = await A.getNum('Nhập cỡ lưới theo hướng M (2–256)'); const M = Math.round(a.num || 0); if(M < 2 || M > 256){ log('Cỡ lưới M từ 2 tới 256.'); return; }
    const b = await A.getNum('Nhập cỡ lưới theo hướng N (2–256)'); const N = Math.round(b.num || 0); if(N < 2 || N > 256){ log('Cỡ lưới N từ 2 tới 256.'); return; }
    const v = [];
    for(let m = 0; m < M; m++) for(let n = 0; n < N; n++){ const r = await A.getPoint('Chỉ định vị trí đỉnh (' + m + ', ' + n + ')'); if(!r.pt) return; v.push(r.pt.x, r.pt.y, r.pt.z != null ? r.pt.z : elev()); }
    const I = []; for(let m = 0; m < M - 1; m++) for(let n = 0; n < N - 1; n++){ const p0 = m * N + n, p1 = p0 + 1, p2 = p0 + N + 1, p3 = p0 + N; I.push(p0, p1, p2, p0, p2, p3); }
    const e = A.meshEnt ? A.meshEnt(v, I, null) : null; if(!e){ log('Không tạo được lưới.'); return; } e.srf = 1; A.newProps(e); delete e.lt; A.commit({ add: [e] }, '3DMESH'); log('3DMESH: lưới ' + M + ' × ' + N + '.');
  });
  // EDGE: ẩn / hiện cạnh của mặt 3D (3DFACE)
  const segD = (p, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1e-30; let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy); };
  ecmd(['EDGE'], 'Ẩn / hiện cạnh của mặt 3D (3DFACE): bấm vào cạnh cần ẩn; Hiện = hiện lại mọi cạnh', async () => {
    for(;;){ const r = await A.getEnt('Chỉ định cạnh mặt 3D cần ẩn hoặc', { filter: e => e.type === 'SOLID' && e.face, kw: [{ k: 'D', t: 'Hiện' }] });
      if(r.kw === 'D'){ const s = await A.getSel('Chọn mặt 3D để hiện lại mọi cạnh', { filter: e => e.type === 'SOLID' && e.face }); const L = (s.sel || []).filter(e => e.type === 'SOLID' && e.face && e.ie); if(L.length) A.commit({ rep: L.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; delete w.ie; return [e, w]; }) }, 'EDGE'); log('EDGE: hiện lại cạnh của ' + L.length + ' mặt.'); continue; }
      if(!r.ent) return; const e = r.ent, P = e.pts || [], p = r.pt || P[0]; let k = 0, bd = Infinity; for(let i = 0; i < P.length; i++){ const d = segD(p, P[i], P[(i + 1) % P.length]); if(d < bd){ bd = d; k = i; } }
      const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; w.ie = (w.ie || 0) ^ (1 << k); if(!w.ie) delete w.ie; A.commit({ rep: [[e, w]] }, 'EDGE'); log('EDGE: cạnh ' + (k + 1) + ' ' + ((w.ie || 0) & (1 << k) ? 'đã ẩn' : 'hiện lại') + '.'); }
  });

  /* ==================================================================
     SHAPE · LOAD · COMPILE — tệp hình AutoCAD (.shp nguồn / .shx đã dịch)
     Bộ dịch mã hình như AutoCAD: vectơ độ dài + hướng (16 hướng), bút lên / xuống, nhân / chia tỉ lệ, đẩy / lấy vị trí,
     hình con, độ dời X-Y, cung theo cung tám, cung lẻ, cung theo độ phồng. Hình chèn = nhóm đa tuyến (AutoCAD thấy như nét thường).
     ================================================================== */
  const SHX_HDR = 'AutoCAD-86 shapes 1.0\r\n\x1a';
  const SHK = 'dvd:shx:', SHL = 'dvd:shxlist';
  const SHP = new Map();   // TÊN TỆP (hoa) → { file, shapes: Map(TÊN → { num, name, b: Uint8Array }), byNum: Map }
  const b64 = u8 => { let s = ''; for(let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = t => { const s = atob(t), u = new Uint8Array(s.length); for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  // SHP: *số,số byte,tên  rồi các byte (số có 0 đứng đầu là hệ 16, có thể âm), kết thúc bằng 0
  function parseSHP(text){
    const out = []; let cur = null; const lines = String(text).replace(/\r/g, '').split('\n');
    for(let raw of lines){ const line = raw.replace(/;.*$/, '').trim(); if(!line) continue;
      if(line[0] === '*'){ const m = /^\*\s*([^,]+)\s*,\s*(\d+)\s*,?\s*(.*)$/.exec(line); if(!m) continue; let num = String(m[1]).trim(); if(/^UNIFONT$/i.test(num) || /^0$/.test(num)) num = 0; else num = /^0[0-9a-f]+$/i.test(num) ? parseInt(num, 16) : parseInt(num, 10);
        cur = { num, name: (m[3] || '').trim().toUpperCase() || ('*' + num), b: [] }; out.push(cur); continue; }
      if(!cur) continue;
      for(let tok of line.replace(/[()]/g, ' ').split(/[,\s]+/)){ if(!tok) continue; const neg = tok[0] === '-'; if(neg || tok[0] === '+') tok = tok.slice(1); let v = /^0[0-9a-f]+$/i.test(tok) ? parseInt(tok, 16) : /^0x[0-9a-f]+$/i.test(tok) ? parseInt(tok, 16) : parseInt(tok, 10); if(!isFinite(v)) continue; if(neg) v = -v; cur.b.push(v & 255); }
    }
    return out.map(x => ({ num: x.num, name: x.name, b: Uint8Array.from(x.b) }));
  }
  // SHX 1.0: tiêu đề, số đầu / cuối / số hình (uint16), bảng (số hình, số byte), dữ liệu (tên\0 + byte mã)
  function parseSHX(u8){
    const hdr = String.fromCharCode.apply(null, u8.subarray(0, 24)); if(!/^AutoCAD-86 shapes 1\.[01]/.test(hdr)) throw new Error(/unifont|bigfont/i.test(hdr) ? 'Tệp này là phông chữ SHX (unifont / bigfont), không phải tệp hình.' : 'Không phải tệp hình SHX (AutoCAD-86 shapes 1.0).');
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let o = 24; const n = dv.getUint16(o + 4, true); o += 6; const idx = [];
    for(let i = 0; i < n; i++){ idx.push([dv.getUint16(o, true), dv.getUint16(o + 2, true)]); o += 4; }
    const out = []; for(const [num, len] of idx){ const d = u8.subarray(o, o + len); o += len; let k = 0; while(k < d.length && d[k]) k++; const name = String.fromCharCode.apply(null, d.subarray(0, k)).toUpperCase(); out.push({ num, name: name || ('*' + num), b: Uint8Array.from(d.subarray(k + 1)) }); }
    return out;
  }
  function compileSHX(shapes){
    const L = shapes.filter(s => s.num > 0); const enc = new TextEncoder(); const parts = L.map(s => { const nm = enc.encode(s.name.startsWith('*') ? '' : s.name); const u = new Uint8Array(nm.length + 1 + s.b.length); u.set(nm, 0); u[nm.length] = 0; u.set(s.b, nm.length + 1); return u; });
    const hdr = Uint8Array.from(SHX_HDR, c => c.charCodeAt(0)); const size = hdr.length + 6 + L.length * 4 + parts.reduce((a, u) => a + u.length, 0);
    const out = new Uint8Array(size), dv = new DataView(out.buffer); out.set(hdr, 0); let o = hdr.length; const nums = L.map(s => s.num);
    dv.setUint16(o, Math.min(...nums, 0xffff) || 0, true); dv.setUint16(o + 2, Math.max(...nums, 0) || 0, true); dv.setUint16(o + 4, L.length, true); o += 6;
    L.forEach((s, i) => { dv.setUint16(o, s.num, true); dv.setUint16(o + 2, parts[i].length, true); o += 4; }); for(const u of parts){ out.set(u, o); o += u.length; }
    return out;
  }
  A.shpParse = parseSHP; A.shxParse = parseSHX; A.shxCompile = compileSHX;
  function register(file, shapes){ const F = String(file).toUpperCase(); const R = { file: F, shapes: new Map(), byNum: new Map() }; for(const s of shapes){ R.shapes.set(s.name, s); R.byNum.set(s.num, s); } SHP.set(F, R); return R; }
  function persist(file, u8){ try{ localStorage.setItem(SHK + file.toUpperCase(), b64(u8)); const L = new Set(JSON.parse(localStorage.getItem(SHL) || '[]')); L.add(file.toUpperCase()); localStorage.setItem(SHL, JSON.stringify([...L])); }catch(_){} }
  try{ for(const f of JSON.parse(localStorage.getItem(SHL) || '[]')){ const t = localStorage.getItem(SHK + f); if(t) try{ register(f, parseSHX(unb64(t))); }catch(_){} } }catch(_){}
  // hướng của mã vectơ (độ dài đơn vị tới điểm lưới)
  const DIR = [[1, 0], [1, .5], [1, 1], [.5, 1], [0, 1], [-.5, 1], [-1, 1], [-1, .5], [-1, 0], [-1, -.5], [-1, -1], [-.5, -1], [0, -1], [.5, -1], [1, -1], [1, -.5]];
  const sb = v => (v > 127 ? v - 256 : v);
  // byte mã → các nét (toạ độ hình, chưa nhân cỡ)
  function strokes(R, sh, depth){
    const out = []; let x = 0, y = 0, sc = 1, pen = true, line = null; const stack = []; const b = sh.b; let i = 0;
    const flush = () => { if(line && line.length >= 2) out.push(line); line = null; };
    const moveTo = (nx, ny) => { if(pen){ if(!line) line = [{ x, y }]; line.push({ x: nx, y: ny }); } x = nx; y = ny; };
    const arcTo = (cx, cy, r, a0, a1) => { const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 16))); for(let k = 1; k <= n; k++){ const a = a0 + (a1 - a0) * k / n; moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } };
    const bulge = (dx, dy, bg) => { const ex = x + dx, ey = y + dy; if(!bg){ moveTo(ex, ey); return; } const h = bg / 127, d = Math.hypot(dx, dy) || 1e-12; const th = 4 * Math.atan(h); const r = d / (2 * Math.sin(Math.abs(th) / 2)); const mx = (x + ex) / 2, my = (y + ey) / 2; const s2 = h > 0 ? 1 : -1; const off = r * Math.cos(Math.abs(th) / 2);
      const cx = mx - s2 * (dy / d) * off, cy = my + s2 * (dx / d) * off; const a0 = Math.atan2(y - cy, x - cx); arcTo(cx, cy, r, a0, a0 + th); x = ex; y = ey; };
    let skip = false;
    while(i < b.length){ const c = b[i++]; const doIt = !skip; skip = false;
      if(c === 0) break;
      if(c > 14 || c === 0){ const L = (c >> 4) * sc, d = DIR[c & 15]; if(doIt) moveTo(x + d[0] * L, y + d[1] * L); continue; }
      switch(c){
        case 1: if(doIt){ pen = true; } break;
        case 2: if(doIt){ flush(); pen = false; } break;
        case 3: { const v = b[i++] || 1; if(doIt) sc /= v; break; }
        case 4: { const v = b[i++] || 1; if(doIt) sc *= v; break; }
        case 5: if(doIt) stack.push([x, y]); break;
        case 6: if(doIt){ const q = stack.pop(); if(q){ flush(); x = q[0]; y = q[1]; } } break;
        case 7: { const nb = b[i++]; if(doIt && depth < 8){ const sub = R.byNum.get(nb); if(sub){ flush(); for(const s of strokes(R, sub, depth + 1)) out.push(s.map(p => ({ x: x + p.x * sc, y: y + p.y * sc }))); const e = subEnd(R, sub, depth + 1); x += e.x * sc; y += e.y * sc; } } break; }
        case 8: { const dx = sb(b[i++]), dy = sb(b[i++]); if(doIt) moveTo(x + dx * sc, y + dy * sc); break; }
        case 9: { for(;;){ const dx = sb(b[i++] || 0), dy = sb(b[i++] || 0); if(!dx && !dy) break; if(doIt) moveTo(x + dx * sc, y + dy * sc); } break; }
        case 10: { const r = b[i++] * sc, q = sb(b[i++]); if(!doIt) break; const cw = q < 0, aq = Math.abs(q), so = (aq >> 4) & 7, n = (aq & 7) || 8; const a0 = so * Math.PI / 4, a1 = a0 + (cw ? -1 : 1) * n * Math.PI / 4; const cx = x - r * Math.cos(a0), cy = y - r * Math.sin(a0); arcTo(cx, cy, r, a0, a1); break; }
        case 11: { const s0 = b[i++], e0 = b[i++], rh = b[i++], rl = b[i++], q = sb(b[i++]); if(!doIt) break; const r = (rh * 256 + rl) * sc, cw = q < 0, aq = Math.abs(q), so = (aq >> 4) & 7, n = (aq & 7) || 8;
          const a0 = (so + s0 / 256) * Math.PI / 4 * (1), sg = cw ? -1 : 1, a0s = cw ? (so * Math.PI / 4 - s0 / 256 * Math.PI / 4) : a0; const endOct = so + sg * (n - (e0 ? 1 : 0)); const a1 = endOct * Math.PI / 4 + sg * e0 / 256 * Math.PI / 4;
          const cx = x - r * Math.cos(a0s), cy = y - r * Math.sin(a0s); arcTo(cx, cy, r, a0s, a1); break; }
        case 12: { const dx = sb(b[i++]), dy = sb(b[i++]), bg = sb(b[i++]); if(doIt) bulge(dx * sc, dy * sc, bg); break; }
        case 13: { for(;;){ const dx = sb(b[i++] || 0), dy = sb(b[i++] || 0); if(!dx && !dy) break; const bg = sb(b[i++] || 0); if(doIt) bulge(dx * sc, dy * sc, bg); } break; }
        case 14: skip = true; break;
      }
    }
    flush(); return out;
  }
  // điểm cuối (bút dời tới đâu) của hình con — để tiếp tục sau mã 7
  function subEnd(R, sh, depth){ const S = strokes(R, Object.assign({}, sh), depth); let p = { x: 0, y: 0 }; for(const s of S) p = s[s.length - 1]; return p; }
  A.shapeStrokes = (file, name) => { const R = SHP.get(String(file).toUpperCase()); const s = R && R.shapes.get(String(name).toUpperCase()); return s ? strokes(R, s, 0) : null; };
  function findShape(name){ name = String(name || '').toUpperCase(); for(const R of SHP.values()){ const s = R.shapes.get(name); if(s) return { R, s }; } return null; }
  A.shapeFind = findShape;
  function shapeEnts(f, ins, size, rotDeg, info){
    const S = strokes(f.R, f.s, 0); const r = (rotDeg || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), wf = info && info.wf || 1, ob = (info && info.ob || 0) * Math.PI / 180;
    const T = p => { const px = (p.x + p.y * Math.tan(ob)) * wf * size, py = p.y * size; return { x: ins.x + px * c - py * s, y: ins.y + px * s + py * c }; };
    const gid = A.newGroupId('SH'), shp = { id: gid, name: f.s.name, file: f.R.file, size, rot: rotDeg || 0, x: ins.x, y: ins.y, wf, ob: info && info.ob || 0 };
    const out = S.map(L => { const e = A.newProps({ type: 'POLYLINE', closed: false, vertices: L.map(T) }); e.grp = gid; e.blk = '*SHAPE'; e.shp = shp; return e; });
    if(!out.length){ const e = A.newProps({ type: 'POINT', x: ins.x, y: ins.y }); e.grp = gid; e.blk = '*SHAPE'; e.shp = shp; out.push(e); }
    return out;
  }
  A.shapeEnts = (name, ins, size, rot, info) => { const f = findShape(name); return f ? shapeEnts(f, ins, size, rot, info) : []; };
  async function loadFile(f){
    if(!f) return null; const nm = f.name.replace(/^.*[\\/]/, ''); let shapes, u8;
    if(/\.shp$/i.test(nm)){ shapes = parseSHP(await f.text()); u8 = compileSHX(shapes); } else { u8 = new Uint8Array(await f.arrayBuffer()); shapes = parseSHX(u8); }
    const file = nm.replace(/\.(shp|shx)$/i, '.shx'); register(file, shapes); persist(file, u8); return { file, n: shapes.filter(s => s.num > 0).length, shapes, u8 };
  }
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); });
  A.shapeLoadFile = loadFile;
  plain(['LOAD'], 'Nạp tệp hình (.shx / .shp) để dùng với lệnh SHAPE', async () => {
    const f = await pickFile('.shx,.shp'); if(!f) return;
    if(/\.shx$/i.test(f.name) && A.shxFontAdd){ try{ const F = await A.shxFontAdd(new Uint8Array(await f.arrayBuffer()), f.name.replace(/^.*[\\/]/, '')); log('LOAD: ' + F.file.toLowerCase() + ' là phông chữ SHX (' + F.type + ', ' + F.glyph.size + ' ký tự) — đã nạp làm phông cho kiểu chữ (STYLE / SHXFONTS).'); return; }catch(_){ /* không phải phông → tệp hình */ } }
    try{ const r = await loadFile(f); log('LOAD: đã nạp ' + r.file + ' — ' + r.n + ' hình (' + r.shapes.filter(s => s.num > 0).slice(0, 12).map(s => s.name).join(', ') + (r.n > 12 ? '…' : '') + ').'); applyPending(); }catch(err){ log('LOAD: ' + err.message); }
  });
  plain(['COMPILE'], 'Dịch tệp hình nguồn .shp thành .shx (và nạp luôn để dùng với SHAPE)', async () => {
    const f = await pickFile('.shp'); if(!f) return; try{ const r = await loadFile(f); const nm = r.file; try{ await shareOrDownload(new Blob([r.u8], { type: 'application/octet-stream' }), nm, 'application/octet-stream'); }catch(_){}
      log('COMPILE: ' + f.name + ' → ' + nm + ' (' + r.n + ' hình, ' + r.u8.length + ' byte), đã nạp.'); applyPending(); }catch(err){ log('COMPILE: ' + err.message); }
  });
  ecmd(['SHAPE'], 'Chèn hình từ tệp hình đã nạp (LOAD): tên hình, điểm chèn, cỡ, góc xoay', async () => {
    if(!SHP.size){ log('Chưa nạp tệp hình nào — dùng LOAD (tệp .shx / .shp).'); return; }
    let f = null; const last = lsGet('dvd:shape:last', '');
    for(;;){ const r = await A.getStr('Nhập tên hình hoặc [?]', { def: last }); const v = String(r.str || last || '').trim(); if(!v) return;
      if(v === '?'){ for(const R of SHP.values()) log(R.file + ': ' + [...R.shapes.keys()].filter(k => !k.startsWith('*')).join(', ')); continue; }
      f = findShape(v); if(!f){ log('Không có hình "' + v + '" trong các tệp đã nạp.'); continue; } lsSet('dvd:shape:last', f.s.name); break; }
    let size = lsGet('dvd:shape:size', 1) || 1;
    const p = await A.getPoint('Chỉ định điểm chèn', { rubber: false, preview: (g, q) => g.ents(shapeEnts(f, q, size, 0)) }); if(!p.pt) return;
    const h = await A.getDist('Chỉ định cao', { base: p.pt, def: size, preview: (g, q) => g.ents(shapeEnts(f, p.pt, Math.hypot(q.x - p.pt.x, q.y - p.pt.y) || size, 0)) }); size = h.num || (h.pt ? Math.hypot(h.pt.x - p.pt.x, h.pt.y - p.pt.y) : size) || size; lsSet('dvd:shape:size', size);
    const a = await A.getAngle('Chỉ định góc xoay', { base: p.pt, def: 0 }); const rot = a.pt ? Math.atan2(a.pt.y - p.pt.y, a.pt.x - p.pt.x) * 180 / Math.PI : (a.num || 0);
    const L = shapeEnts(f, p.pt, size, rot); A.commit({ add: L }, 'SHAPE ' + f.s.name); log('SHAPE: ' + f.s.name + ' (' + f.R.file + '), cao ' + (+size.toPrecision(6)) + ', xoay ' + (+rot.toFixed(4)) + '°.');
  });
  const lsGet = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  // SHAPE của AutoCAD trong DXF (đọc thành điểm chờ): đã nạp tệp hình thì dựng nét ngay, chưa thì giữ điểm + nhắc LOAD
  function applyPending(){ const rep = [], add = [], del = []; for(const e of ME()){ if(!e.shpx) continue; const f = findShape(e.shpx.name); if(!f) continue; const L = shapeEnts(f, { x: e.x, y: e.y }, e.shpx.size || 1, e.shpx.rot || 0, e.shpx); for(const w of L){ w.layer = e.layer; if(e.bl || !e.col){ w.bl = 1; w.col = A.layerHex(e.layer); } else { delete w.bl; w.col = e.col; } delete w.userAdded; } del.push(e); add.push(...L); }
    void rep; if(del.length){ A.commit({ del, add }, 'SHAPE'); log('Đã dựng ' + del.length + ' hình (SHAPE) từ tệp hình vừa nạp.'); } }
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); try{ const by = new Map(); let pend = 0; for(const e of ME()){ if(e.shp && e.shp.id){ e.grp = e.shp.id; e.blk = '*SHAPE'; } if(e.shpx) pend++; }
      if(pend){ const miss = new Set(ME().filter(e => e.shpx && !findShape(e.shpx.name)).map(e => e.shpx.name)); if(miss.size) log('Bản vẽ có ' + pend + ' hình (SHAPE) — nạp tệp hình bằng LOAD để hiện: ' + [...miss].slice(0, 8).join(', ')); setTimeout(applyPending, 0); } void by; }catch(err){ console.warn('shape', err); } }; })(A.onLoad);

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
