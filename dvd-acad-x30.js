/* DVDCAD v6k — kết xuất, đèn, vật liệu, cảnh quay, hoạt hình như AutoCAD
   · RENDERWINDOW / RENDERWIN / RENDERWINDOWCLOSE (ảnh kết xuất, lịch sử, lưu PNG, cắt vùng), RENDERCROP, RENDERPRESETS / RPREF,
     RENDEREXPOSURE (phơi sáng EV), RENDERENVIRONMENT (sương mù, nền), RENDERONLINE
   · Đèn: TARGETPOINT, FREESPOT, WEBLIGHT, FREEWEB (đọc tệp IES), CONVERTOLDLIGHTS · Vật liệu: MATEDITOROPEN, MATERIALATTACH, MATERIALMAP, CONVERTOLDMATERIALS
   · Cảnh quay: NEWSHOT, EDITSHOT, NAVSMOTION / NAVSMOTIONCLOSE (chạy chuyển cảnh), VTOPTIONS · ANIPATH (camera theo đường → video WebM)
   · Khung 3D: 3DORBITCTR (tâm quay), LIVESECTION (bật / tắt mặt cắt) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x30 || !window.DVDCmd) return; A._x30 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const numOr = (r, d) => r && r.num != null && isFinite(r.num) ? r.num : d;
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const U = () => (typeof unitToMM === 'function' && unitToMM()) || 1;
  const noKey = d => d && d.root && d.root.querySelectorAll('input,select,textarea').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation()));
  const open3 = async () => { if(!A.open3D) return null; await A.open3D({ keep: true }); return A.view3D || null; };

  /* ===================== thiết lập kết xuất ===================== */
  const PRESETS = { L: { n: 'Thấp (Low)', sc: 1 }, M: { n: 'Trung bình (Medium)', sc: 1.5 }, H: { n: 'Cao (High)', sc: 2 }, P: { n: 'Trình chiếu (Presentation)', sc: 3 } };
  const RS = () => Object.assign({ preset: 'M', ev: 0, fog: { on: false, col: '#c8d0da', near: 60, far: 300 }, bg: { kind: 'none', c1: '#cfe3ff', c2: '#ffffff' } }, LS('dvd:render', {}));
  A.renderSettings = RS;
  let _bgTex = null;
  function applyEnv(V){ const T = window.THREE; if(!V || !T) return; const S = RS();
    try{ V.renderer.toneMappingExposure = Math.pow(2, +S.ev || 0); }catch(_){}
    const d = (V.state && V.state.dist) || 100;
    if(S.fog && S.fog.on) V.scene.fog = new T.Fog(new T.Color(S.fog.col), d * (S.fog.near / 100), d * Math.max(S.fog.near + 1, S.fog.far) / 100); else V.scene.fog = null;
    if(_bgTex){ _bgTex.dispose(); _bgTex = null; }
    if(S.bg && S.bg.kind === 'color') V.scene.background = new T.Color(S.bg.c1);
    else if(S.bg && S.bg.kind === 'grad'){ const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, S.bg.c1); gr.addColorStop(1, S.bg.c2); g.fillStyle = gr; g.fillRect(0, 0, 2, 256); _bgTex = new T.CanvasTexture(c); V.scene.background = _bgTex; }
    else V.scene.background = null; }
  A.renderApplyEnv = applyEnv;
  const HIST = [];
  async function renderNow(scale){ const V = await open3(); if(!V){ say('Không mở được khung 3D.'); return null; } const t0 = performance.now();
    if(V.setStyle) V.setStyle('real'); applyEnv(V); const S = RS(), k = scale || (PRESETS[S.preset] || PRESETS.M).sc;
    const pr = V.renderer.getPixelRatio(); V.renderer.setPixelRatio(pr * k); V.render(); const url = V.canvas.toDataURL('image/png'); const w = V.canvas.width, h = V.canvas.height; V.renderer.setPixelRatio(pr); V.render();
    const r = { url, w, h, ms: Math.round(performance.now() - t0), preset: S.preset, t: new Date() }; HIST.unshift(r); if(HIST.length > 8) HIST.pop(); return r; }
  A.renderNow = renderNow;
  let RW = null;
  function cropImage(src, x0, y0, x1, y1){ return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = Math.max(1, x1 - x0); c.height = Math.max(1, y1 - y0); c.getContext('2d').drawImage(im, -x0, -y0); res({ url: c.toDataURL('image/png'), w: c.width, h: c.height }); }; im.src = src; }); }
  function renderWindow(r, crop){ if(RW){ try{ RW.close(); }catch(_){} RW = null; } if(!r) return;
    const name = ((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
    const d = A.dialog({ title: 'Render Window', noCancel: true, okText: 'Đóng', html: '<div class="acw" style="width:min(900px,92vw)"><div class="acw-row" style="gap:6px;margin-bottom:6px"><button type="button" class="acw-btn" id="rwSave">Lưu PNG…</button><button type="button" class="acw-btn" id="rwAgain">Kết xuất lại</button><button type="button" class="acw-btn" id="rwCrop">Cắt vùng</button><span id="rwInfo" style="margin-left:auto;opacity:.75"></span></div>' +
      '<div id="rwBox" style="position:relative;display:inline-block;max-width:100%;cursor:default"><img id="rwImg" style="max-width:100%;max-height:60vh;display:block"><div id="rwSel" style="position:absolute;border:1px dashed #ffb347;display:none;pointer-events:none"></div></div><div class="acw-note" style="margin-top:6px">Lịch sử</div><div id="rwHist" style="display:flex;gap:4px;flex-wrap:wrap"></div></div>' });
    RW = d; const R = d.root, img = R.querySelector('#rwImg'); let cur = r, cropOn = !!crop;
    const show = x => { cur = x; img.src = x.url; R.querySelector('#rwInfo').textContent = x.w + ' × ' + x.h + ' px · ' + (PRESETS[x.preset] ? PRESETS[x.preset].n : '') + ' · ' + (x.ms != null ? x.ms + ' ms' : 'cắt vùng'); R.querySelector('#rwHist').innerHTML = HIST.map((h, i) => '<img data-i="' + i + '" src="' + h.url + '" style="height:54px;border:2px solid ' + (h === x ? '#3d9bff' : 'transparent') + ';cursor:pointer">').join(''); };
    show(r);
    R.querySelector('#rwHist').onclick = ev => { const t = ev.target.closest('[data-i]'); if(t) show(HIST[+t.dataset.i]); };
    R.querySelector('#rwSave').onclick = async () => { const b = await (await fetch(cur.url)).blob(); try{ await shareOrDownload(b, name + '-render.png', 'image/png'); }catch(_){} log('Đã lưu ảnh kết xuất ' + cur.w + ' × ' + cur.h + ' px.'); };
    R.querySelector('#rwAgain').onclick = async () => { const x = await renderNow(); if(x) show(x); };
    R.querySelector('#rwCrop').onclick = () => { cropOn = true; img.style.cursor = 'crosshair'; log('RENDERCROP: kéo chuột trên ảnh để chọn vùng.'); };
    if(cropOn) img.style.cursor = 'crosshair';
    let st = null; const sel = R.querySelector('#rwSel');
    img.addEventListener('mousedown', ev => { if(!cropOn) return; ev.preventDefault(); const b = img.getBoundingClientRect(); st = { x: ev.clientX - b.left, y: ev.clientY - b.top, b }; sel.style.display = 'block'; sel.style.left = st.x + 'px'; sel.style.top = st.y + 'px'; sel.style.width = sel.style.height = '0px'; });
    window.addEventListener('mousemove', ev => { if(!st) return; const x = ev.clientX - st.b.left, y = ev.clientY - st.b.top; sel.style.left = Math.min(x, st.x) + 'px'; sel.style.top = Math.min(y, st.y) + 'px'; sel.style.width = Math.abs(x - st.x) + 'px'; sel.style.height = Math.abs(y - st.y) + 'px'; });
    window.addEventListener('mouseup', async ev => { if(!st) return; const b = st.b, x = ev.clientX - b.left, y = ev.clientY - b.top, k = cur.w / b.width; const s0 = st; st = null; sel.style.display = 'none'; cropOn = false; img.style.cursor = 'default';
      if(Math.abs(x - s0.x) < 4 || Math.abs(y - s0.y) < 4) return; const c = await cropImage(cur.url, Math.round(Math.min(x, s0.x) * k), Math.round(Math.min(y, s0.y) * k), Math.round(Math.max(x, s0.x) * k), Math.round(Math.max(y, s0.y) * k)); const h = Object.assign({ preset: cur.preset, ms: null, t: new Date() }, c); HIST.unshift(h); show(h); });
    A._renderWindow = { show, get cur(){ return cur; }, crop: async (x0, y0, x1, y1) => { const c = await cropImage(cur.url, x0, y0, x1, y1); const h = Object.assign({ preset: cur.preset, ms: null, t: new Date() }, c); HIST.unshift(h); show(h); return h; } };
    return d; }
  plain(['RENDERWINDOW', 'RENDERWIN'], 'Kết xuất khung 3D ra ảnh (Render Window): lịch sử, lưu PNG, cắt vùng', async () => { const r = await renderNow(); if(r){ renderWindow(r); log('Kết xuất ' + r.w + ' × ' + r.h + ' px trong ' + r.ms + ' ms (' + PRESETS[r.preset].n + ').'); } });
  plain(['RENDERWINDOWCLOSE'], 'Đóng cửa sổ kết xuất', () => { if(RW){ try{ RW.close(); }catch(_){} RW = null; } });
  plain(['RENDERCROP', 'RC'], 'Kết xuất rồi cắt lấy một vùng của ảnh (kéo chuột trên ảnh)', async () => { const r = await renderNow(); if(r) renderWindow(r, true); });
  plain(['RENDERONLINE'], 'Kết xuất trực tuyến của Autodesk: DVDCAD kết xuất ngay trên máy (RENDERWINDOW)', async () => { log('RENDERONLINE: dịch vụ kết xuất đám mây là của Autodesk — DVDCAD kết xuất ngay trên máy.'); const r = await renderNow(); if(r) renderWindow(r); });
  function presetsDialog(){ const S = RS(); const d = A.dialog({ title: 'Render Presets Manager', html: '<div class="acw" style="min-width:360px"><fieldset class="acw-grp"><legend>Mức kết xuất</legend>' + Object.entries(PRESETS).map(([k, p]) => '<label style="display:block"><input type="radio" name="rp" value="' + k + '"' + (S.preset === k ? ' checked' : '') + '> ' + p.n + ' — ' + p.sc + '× độ phân giải khung 3D</label>').join('') + '</fieldset>' +
      '<fieldset class="acw-grp"><legend>Phơi sáng</legend><div class="acw-row"><label>EV (−3 … +3)</label><input id="rpEv" type="number" step="0.25" min="-3" max="3" value="' + S.ev + '" style="width:80px"></div></fieldset><div class="acw-note">Ánh sáng, bóng đổ, vật liệu: kiểu hiển thị Thực tế của khung 3D. Môi trường: RENDERENVIRONMENT.</div></div>',
      ok: root => { const v = root.querySelector('input[name="rp"]:checked'); S.preset = v ? v.value : 'M'; S.ev = Math.max(-3, Math.min(3, +root.querySelector('#rpEv').value || 0)); SV('dvd:render', S); if(A.view3D) applyEnv(A.view3D); log('Mức kết xuất: ' + PRESETS[S.preset].n + ', EV ' + S.ev + '.'); } }); noKey(d); }
  plain(['RENDERPRESETS', 'RPREF', 'RPR'], 'Mức kết xuất (Thấp / Trung bình / Cao / Trình chiếu) và phơi sáng', presetsDialog);
  cmd(['RENDEREXPOSURE'], 'Phơi sáng của ảnh kết xuất (EV −3 … +3)', async () => { const S = RS(); const r = await A.getNum('Phơi sáng EV (−3 … +3)', { def: S.ev }); const v = numOr(r, S.ev); S.ev = Math.max(-3, Math.min(3, v)); SV('dvd:render', S); if(A.view3D){ applyEnv(A.view3D); A.view3D.render(); } log('RENDEREXPOSURE = ' + S.ev + ' EV.'); });
  plain(['RENDERENVIRONMENT'], 'Môi trường kết xuất: sương mù (gần / xa), nền (màu / chuyển màu)', () => { const S = RS(); const d = A.dialog({ title: 'Render Environment', html: '<div class="acw" style="min-width:360px"><fieldset class="acw-grp"><legend>Sương mù (Fog)</legend><label style="display:block"><input id="reF" type="checkbox"' + (S.fog.on ? ' checked' : '') + '> Bật</label><div class="acw-row"><label>Màu</label><input id="reFc" type="color" value="' + esc(S.fog.col) + '"></div><div class="acw-row"><label>Gần / xa (% khoảng nhìn)</label><input id="reFn" type="number" value="' + S.fog.near + '" style="width:70px"> <input id="reFf" type="number" value="' + S.fog.far + '" style="width:70px"></div></fieldset>' +
      '<fieldset class="acw-grp"><legend>Nền</legend><select id="reB"><option value="none"' + (S.bg.kind === 'none' ? ' selected' : '') + '>Mặc định (trời)</option><option value="color"' + (S.bg.kind === 'color' ? ' selected' : '') + '>Một màu</option><option value="grad"' + (S.bg.kind === 'grad' ? ' selected' : '') + '>Chuyển màu</option></select> <input id="reB1" type="color" value="' + esc(S.bg.c1) + '"> <input id="reB2" type="color" value="' + esc(S.bg.c2) + '"></fieldset></div>',
      ok: root => { const q = s => root.querySelector(s); S.fog = { on: q('#reF').checked, col: q('#reFc').value, near: Math.max(0, +q('#reFn').value || 0), far: Math.max(1, +q('#reFf').value || 300) }; S.bg = { kind: q('#reB').value, c1: q('#reB1').value, c2: q('#reB2').value }; SV('dvd:render', S); if(A.view3D){ applyEnv(A.view3D); A.view3D.render(); } log('RENDERENVIRONMENT: sương mù ' + (S.fog.on ? 'bật' : 'tắt') + ', nền ' + S.bg.kind + '.'); } }); noKey(d); });
  // khung 3D mở lại: áp dụng phơi sáng / môi trường
  if(A.open3D){ const _o = A.open3D; A.open3D = async function(){ const r = await _o.apply(this, arguments); try{ if(A.view3D) applyEnv(A.view3D); }catch(_){} return r; }; }

  /* ===================== đèn ===================== */
  const refreshL = () => { try{ if(A.view3D && A.view3D.rebuildLights) A.view3D.rebuildLights(); }catch(_){} };
  const colKw = async () => { const k = await A.getKw('Màu ánh sáng [Vàng ấm / Trắng / Lạnh]', { kw: [{ k: 'V', t: 'Vàng ấm' }, { k: 'T', t: 'Trắng' }, { k: 'L', t: 'Lạnh' }], def: 'Trắng' }); return k.kw === 'V' ? '#ffd9a0' : k.kw === 'L' ? '#cfe2ff' : '#ffffff'; };
  const askZ = async (p, def) => numOr(await A.getNum(p, { def }), def);
  // IES LM-63: góc đứng, cường độ (cd) → góc chùm sáng (nơi còn ≥ 50% cực đại) và cường độ quy đổi
  function parseIES(txt){ const s = String(txt); const i = s.search(/TILT\s*=/i); if(i < 0) throw new Error('Không phải tệp IES'); const after = s.slice(i).split(/\r?\n/); let rest = after.slice(1).join(' ');
    if(/TILT\s*=\s*INCLUDE/i.test(after[0])){ const t = rest.trim().split(/[\s,]+/).map(Number); const n = t[1]; rest = t.slice(2 + 2 * n).join(' '); }
    const v = rest.trim().split(/[\s,]+/).map(Number).filter(x => isFinite(x)); if(v.length < 13) throw new Error('IES thiếu số liệu');
    const lamps = v[0], lm = v[1], mul = v[2], nv = v[3], nh = v[4]; let k = 13; const va = v.slice(k, k + nv); k += nv; k += nh; const cd = v.slice(k, k + nv).map(c => c * mul);
    if(cd.length < nv) throw new Error('IES thiếu cường độ'); const mx = Math.max(...cd); let half = 0; for(let j = 0; j < nv; j++) if(cd[j] >= mx * 0.5) half = Math.max(half, va[j]);
    return { lamps, lm, maxCd: mx, beam: Math.min(360, half * 2), omni: half >= 85 }; }
  A.parseIES = parseIES;
  const pickIES = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.ies,.txt'; i.onchange = () => res(i.files[0] || null); i.click(); });
  async function webInfo(){ const k = await A.getKw('Tệp IES phân bố ánh sáng [Chọn tệp / Không]', { kw: [{ k: 'F', t: 'Chọn tệp' }, { k: 'N', t: 'Không' }], def: 'Chọn tệp' }); if(k.kw === 'N') return null;
    const f = await pickIES(); if(!f) return null; try{ const r = parseIES(await f.text()); r.name = f.name; return r; }catch(err){ say(err.message); return null; } }
  function addLight(p, li, msg){ const e = { type: 'POINT', x: p.x, y: p.y, light: li }; A.newProps(e); A.commit({ add: [e] }, msg); refreshL(); return e; }
  cmd(['TARGETPOINT'], 'Đèn điểm có điểm nhắm (target point light)', async () => {
    const p = await A.getPoint('Vị trí đèn'); if(!p.pt) return; const t = await A.getPoint('Điểm nhắm', { base: p.pt }); if(!t.pt) return; const z = await askZ('Cao độ đèn (Z)', Math.round(2600 / U() * 1000) / 1000), tz = await askZ('Cao độ điểm nhắm', 0);
    const I = numOr(await A.getNum('Cường độ (1–50)', { def: 6 }), 6), col = await colKw();
    addLight(p.pt, { z, tz, dx: t.pt.x - p.pt.x, dy: t.pt.y - p.pt.y, int: I, col, tgt: 1 }, 'TARGETPOINT: đèn điểm có điểm nhắm'); });
  async function freeDir(z){ const k = await A.getKw('Hướng chiếu [Thẳng xuống / Góc]', { kw: [{ k: 'D', t: 'Thẳng xuống' }, { k: 'A', t: 'Góc' }], def: 'Thẳng xuống' }); if(k.kw !== 'A') return { dx: 0, dy: 0, tz: z - 1 };
    const az = numOr(await A.getNum('Góc phương vị trên mặt bằng (độ)', { def: 0 }), 0) * Math.PI / 180, el = numOr(await A.getNum('Góc chúc xuống (độ, 90 = thẳng xuống)', { def: 45 }), 45) * Math.PI / 180; const L = 1000 / U();
    return { dx: Math.cos(el) * Math.cos(az) * L, dy: Math.cos(el) * Math.sin(az) * L, tz: z - Math.sin(el) * L }; }
  cmd(['FREESPOT'], 'Đèn rọi tự do (không có điểm nhắm): vị trí, hướng, góc chiếu', async () => {
    const p = await A.getPoint('Vị trí đèn'); if(!p.pt) return; const z = await askZ('Cao độ đèn (Z)', Math.round(2600 / U() * 1000) / 1000); const D = await freeDir(z);
    const ang = Math.max(5, Math.min(160, numOr(await A.getNum('Góc chiếu (độ)', { def: 45 }), 45))); const I = numOr(await A.getNum('Cường độ (1–50)', { def: 8 }), 8), col = await colKw();
    addLight(p.pt, Object.assign({ kind: 'spot', z, ang, int: I, col, free: 1 }, D), 'FREESPOT: đèn rọi tự do'); });
  const webLight = (ies, base) => { if(!ies) return Object.assign({ kind: 'spot', ang: 90, int: 8, web: 1 }, base); const int = Math.max(1, Math.min(50, ies.maxCd / 150)); return Object.assign(ies.omni ? { int, web: 1 } : { kind: 'spot', ang: Math.max(5, Math.min(160, ies.beam)), int, web: 1 }, { ies: ies.name, iesCd: Math.round(ies.maxCd), iesLm: Math.round(ies.lm) }, base); };
  cmd(['WEBLIGHT'], 'Đèn trắc quang (web light) có điểm nhắm: phân bố ánh sáng từ tệp IES', async () => {
    const p = await A.getPoint('Vị trí đèn'); if(!p.pt) return; const t = await A.getPoint('Điểm nhắm', { base: p.pt }); if(!t.pt) return; const z = await askZ('Cao độ đèn (Z)', Math.round(2600 / U() * 1000) / 1000), tz = await askZ('Cao độ điểm nhắm', 0);
    const ies = await webInfo(); const col = await colKw(); const li = webLight(ies, { z, tz, dx: t.pt.x - p.pt.x, dy: t.pt.y - p.pt.y, col });
    addLight(p.pt, li, 'WEBLIGHT: ' + (ies ? ies.name + ' — cực đại ' + Math.round(ies.maxCd) + ' cd, chùm ' + Math.round(ies.beam) + '°' : 'đèn web mặc định')); });
  cmd(['FREEWEB'], 'Đèn trắc quang tự do (không điểm nhắm): tệp IES', async () => {
    const p = await A.getPoint('Vị trí đèn'); if(!p.pt) return; const z = await askZ('Cao độ đèn (Z)', Math.round(2600 / U() * 1000) / 1000); const D = await freeDir(z);
    const ies = await webInfo(); const col = await colKw(); addLight(p.pt, webLight(ies, Object.assign({ z, col, free: 1 }, D)), 'FREEWEB: ' + (ies ? ies.name : 'đèn web mặc định')); });
  plain(['CONVERTOLDLIGHTS'], 'Đổi đèn kiểu cũ sang đèn trắc quang: đèn của DVDCAD đã theo kiểu mới', () => { const n = ME().filter(e => e.type === 'POINT' && e.light).length; log('CONVERTOLDLIGHTS: ' + n + ' đèn trong bản vẽ đã là đèn theo cường độ thật (không cần đổi).'); });
  plain(['CONVERTOLDMATERIALS'], 'Đổi vật liệu kiểu cũ: vật liệu của DVDCAD đã theo kiểu mới', () => { const n = new Set(ME().filter(e => e.mat).map(e => e.mat)).size; log('CONVERTOLDMATERIALS: ' + n + ' vật liệu đang dùng đã theo kiểu mới (PBR: màu, độ nhám, kim loại, trong suốt).'); });

  /* ===================== vật liệu ===================== */
  const TEXK = { '': 'Không vân', noise: 'Bê tông', brick: 'Gạch', tile: 'Gạch lát', wood: 'Gỗ', stone: 'Đá', roof: 'Ngói', grass: 'Cỏ' };
  { const M = LS('dvd:mats', {}); if(A.MATS) for(const k of Object.keys(M)) A.MATS[k] = M[k]; }
  const reopen3D = async () => { if(A.view3D && A.close3D){ A.close3D(); await A.open3D({ keep: true }); } };
  plain(['MATEDITOROPEN', 'MATEDITOR', 'MATEDITORCLOSE'], 'Trình sửa vật liệu: tạo / sửa màu, độ nhám, kim loại, trong suốt, vân, cỡ vân', () => {
    const M = A.MATS || {}; const keys = Object.keys(M); const d = A.dialog({ title: 'Materials Editor', html: '<div class="acw" style="min-width:380px"><div class="acw-row"><label>Vật liệu</label><select id="meK"><option value="">(vật liệu mới)</option>' + keys.map(k => '<option value="' + esc(k) + '">' + esc(M[k].n || k) + '</option>').join('') + '</select></div>' +
      '<div class="acw-row"><label>Tên</label><input id="meN" style="width:180px"></div><div class="acw-row"><label>Màu</label><input id="meC" type="color" value="#cccccc"></div><div class="acw-row"><label>Độ nhám 0 – 1</label><input id="meR" type="number" step="0.05" min="0" max="1" value="0.6" style="width:70px"></div><div class="acw-row"><label>Kim loại 0 – 1</label><input id="meM" type="number" step="0.05" min="0" max="1" value="0" style="width:70px"></div>' +
      '<div class="acw-row"><label>Độ đục 0.05 – 1</label><input id="meO" type="number" step="0.05" min="0.05" max="1" value="1" style="width:70px"></div><div class="acw-row"><label>Vân</label><select id="meT">' + Object.entries(TEXK).map(([k, t]) => '<option value="' + k + '">' + t + '</option>').join('') + '</select> <label>cỡ vân (mm)</label><input id="meS" type="number" value="1000" style="width:80px"></div></div>',
      ok: async root => { const q = s => root.querySelector(s); let k = q('#meK').value; const n = q('#meN').value.trim() || 'Vật liệu'; if(!k){ k = 'u_' + n.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36).slice(-4); }
        const o = { n, c: q('#meC').value, r: Math.max(0, Math.min(1, +q('#meR').value)), m: Math.max(0, Math.min(1, +q('#meM').value)) }; const op = Math.max(0.05, Math.min(1, +q('#meO').value || 1)); if(op < 1) o.op = op; const tx = q('#meT').value; if(tx){ o.tex = tx; o.ts = Math.max(1, +q('#meS').value || 1000); }
        M[k] = o; const st = LS('dvd:mats', {}); st[k] = o; SV('dvd:mats', st); log('Đã lưu vật liệu "' + n + '" (' + k + '). Gán: MATERIALS hoặc MATERIALATTACH.'); await reopen3D(); } });
    noKey(d); const R = d.root; R.querySelector('#meK').onchange = () => { const m = M[R.querySelector('#meK').value]; if(!m) return; R.querySelector('#meN').value = m.n || ''; R.querySelector('#meC').value = m.c || '#cccccc'; R.querySelector('#meR').value = m.r != null ? m.r : 0.6; R.querySelector('#meM').value = m.m || 0; R.querySelector('#meO').value = m.op || 1; R.querySelector('#meT').value = m.tex || ''; R.querySelector('#meS').value = m.ts || 1000; }; });
  const MLAY = () => LS('dvd:matlayer', {});
  plain(['MATERIALATTACH'], 'Gán vật liệu theo lớp: khối 3D trên lớp dùng vật liệu của lớp', () => {
    const M = A.MATS || {}, map = MLAY(), lays = A.layerNames ? A.layerNames() : ['0']; const opt = v => '<option value="">(theo màu)</option>' + Object.keys(M).map(k => '<option value="' + esc(k) + '"' + (v === k ? ' selected' : '') + '>' + esc(M[k].n || k) + '</option>').join('');
    const d = A.dialog({ title: 'Material Attachment Options', html: '<div class="acw" style="min-width:380px"><div class="acw-list" style="max-height:360px;overflow:auto;padding:4px"><table style="width:100%"><tr><th>Lớp</th><th>Vật liệu</th></tr>' + lays.map(l => '<tr><td>' + esc(l) + '</td><td><select data-l="' + esc(l) + '">' + opt(map[l] || '') + '</select></td></tr>').join('') + '</table></div><div class="acw-note">Khối 3D trên lớp chưa gán vật liệu riêng sẽ dùng vật liệu của lớp (cả khối vẽ sau).</div></div>',
      ok: root => { const m2 = {}; root.querySelectorAll('[data-l]').forEach(s => { if(s.value) m2[s.dataset.l] = s.value; }); SV('dvd:matlayer', m2); const rep = [];
        for(const e of ME()){ if(e.type !== 'SOLID3D' || A.isLocked(e)) continue; const want = m2[e.layer || '0']; if(e.matL && e.mat !== want){ const w = copy(e); if(want){ w.mat = want; } else { delete w.mat; delete w.matL; } rep.push([e, w]); continue; } if(!e.mat && want){ const w = copy(e); w.mat = want; w.matL = 1; rep.push([e, w]); } }
        if(rep.length) A.commit({ rep }, 'MATERIALATTACH: ' + rep.length + ' khối nhận vật liệu theo lớp'); else log('MATERIALATTACH: đã lưu (' + Object.keys(m2).length + ' lớp).'); } }); void d; });
  { const _c = A.commit; A.commit = function(ch){ try{ const m = ch && ch.add && ch.add.length ? MLAY() : null; if(m && Object.keys(m).length) for(const e of ch.add){ if(e && e.type === 'SOLID3D' && !e.mat && m[e.layer || '0']){ e.mat = m[e.layer || '0']; e.matL = 1; } } }catch(_){} return _c.apply(this, arguments); }; }
  // kiểu ánh xạ vân: hộp / phẳng / trụ / cầu + hệ số tỉ lệ (khung 3D dùng A.uvMap)
  A.uvMap = function(T, g, ts, e){ const P = g.attributes.position, N = g.attributes.normal, n = P.count, uv = new Float32Array(n * 2), k = e && e.mapk || 'B'; let cx = 0, cy = 0, cz = 0, z0 = Infinity, z1 = -Infinity;
    for(let i = 0; i < n; i++){ cx += P.getX(i); cy += P.getY(i); cz += P.getZ(i); z0 = Math.min(z0, P.getZ(i)); z1 = Math.max(z1, P.getZ(i)); } cx /= n || 1; cy /= n || 1; cz /= n || 1;
    for(let i = 0; i < n; i++){ const x = P.getX(i), y = P.getY(i), z = P.getZ(i); let u, v;
      if(k === 'P'){ u = x / ts; v = y / ts; }
      else if(k === 'C'){ const a = Math.atan2(y - cy, x - cx); const r = Math.hypot(x - cx, y - cy) || 1; u = a * r / ts; v = z / ts; }
      else if(k === 'S'){ const dx = x - cx, dy = y - cy, dz = z - cz, r = Math.hypot(dx, dy, dz) || 1; u = Math.atan2(dy, dx) * r / ts; v = Math.asin(dz / r) * r / ts; }
      else { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)); if(az >= ax && az >= ay){ u = x / ts; v = y / ts; } else if(ax >= ay){ u = y / ts; v = z / ts; } else { u = x / ts; v = z / ts; } }
      uv[i * 2] = u; uv[i * 2 + 1] = v; }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); };
  cmd(['MATERIALMAP', 'SETUV'], 'Kiểu ánh xạ vân vật liệu cho khối: hộp / phẳng / trụ / cầu, tỉ lệ vân', async () => {
    const s = await A.getSel('Chọn khối 3D', { filter: e => e.type === 'SOLID3D' }); const L = (s.sel || []).filter(e => !A.isLocked(e)); if(!L.length) return;
    const k = await A.getKw('Kiểu ánh xạ [Hộp / Phẳng / Trụ / Cầu / Đặt lại]', { kw: [{ k: 'B', t: 'Hộp' }, { k: 'P', t: 'Phẳng' }, { k: 'C', t: 'Trụ' }, { k: 'S', t: 'Cầu' }, { k: 'R', t: 'Đặt lại' }], def: 'Hộp' });
    const sc = k.kw === 'R' ? 1 : Math.max(0.01, numOr(await A.getNum('Tỉ lệ vân (1 = theo vật liệu)', { def: 1 }), 1));
    const rep = L.map(e => { const w = copy(e); if(k.kw === 'R'){ delete w.mapk; delete w.mapsc; } else { w.mapk = k.kw || 'B'; if(sc !== 1) w.mapsc = sc; else delete w.mapsc; } return [e, w]; });
    A.commit({ rep }, 'MATERIALMAP: ' + rep.length + ' khối — ' + ({ B: 'hộp', P: 'phẳng', C: 'trụ', S: 'cầu', R: 'mặc định' }[k.kw || 'B'])); await reopen3D(); });

  /* ===================== cảnh quay (ShowMotion) ===================== */
  const VT = () => Object.assign({ on: true, ms: 1200 }, LS('dvd:vt', {}));
  const shotKey = () => 'dvd:shots:' + String((typeof currentName === 'string' && currentName) || 'banve');
  const SHOTS = () => LS(shotKey(), []); const saveShots = L => SV(shotKey(), L);
  A.shots = SHOTS;
  const view2D = () => { const cx = (W() / 2 - view.offsetX) / view.scale, cy = (view.offsetY - H() / 2) / view.scale; return { cx, cy, sc: view.scale, rot: view.rot || 0 }; };
  const setView2D = v => { view.scale = v.sc; view.offsetX = W() / 2 - v.cx * v.sc; view.offsetY = H() / 2 + v.cy * v.sc; try{ draw(); }catch(_){} };
  const view3 = () => { const V = A.view3D; if(!V || !V.state) return null; const S = V.state; return { az: S.az, el: S.el, dist: S.dist, t: [S.target.x, S.target.y, S.target.z] }; };
  const setView3 = v => { const V = A.view3D; if(!V || !V.state) return; const S = V.state; S.az = v.az; S.el = v.el; S.dist = v.dist; S.target.set(v.t[0], v.t[1], v.t[2]); V.render(); };
  let anim = null;
  function animateTo(sh, ms){ return new Promise(res => { if(anim) cancelAnimationFrame(anim.id);
    const t0 = performance.now(), D = Math.max(0, ms != null ? ms : VT().ms); const e = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    if(sh.v3){ const a = view3(); if(!a || !D){ setView3(sh.v3); res(); return; } const b = sh.v3; let da = b.az - a.az; while(da > Math.PI) da -= 2 * Math.PI; while(da < -Math.PI) da += 2 * Math.PI;
      const step = now => { const t = Math.min(1, (now - t0) / D), k = e(t); setView3({ az: a.az + da * k, el: a.el + (b.el - a.el) * k, dist: Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * k), t: a.t.map((x, i) => x + (b.t[i] - x) * k) }); if(t < 1) anim = { id: requestAnimationFrame(step) }; else { anim = null; res(); } }; anim = { id: requestAnimationFrame(step) }; return; }
    const a = view2D(), b = sh.v2; if(!D){ setView2D(b); res(); return; }
    const step = now => { const t = Math.min(1, (now - t0) / D), k = e(t); setView2D({ cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, sc: Math.exp(Math.log(a.sc) + (Math.log(b.sc) - Math.log(a.sc)) * k) }); if(t < 1) anim = { id: requestAnimationFrame(step) }; else { anim = null; res(); } };
    anim = { id: requestAnimationFrame(step) }; }); }
  A.shotGo = animateTo;
  function thumb(){ try{ const src = A.view3D ? A.view3D.canvas : document.querySelector('#cv') || document.querySelector('canvas'); const c = document.createElement('canvas'); c.width = 160; c.height = 100; const g = c.getContext('2d'); g.fillStyle = '#20242c'; g.fillRect(0, 0, 160, 100); const k = Math.min(160 / src.width, 100 / src.height); g.drawImage(src, (160 - src.width * k) / 2, (100 - src.height * k) / 2, src.width * k, src.height * k); return c.toDataURL('image/jpeg', 0.7); }catch(_){ return ''; } }
  cmd(['NEWSHOT'], 'Cảnh quay mới (ShowMotion): lưu góc nhìn hiện tại (2D hoặc khung 3D), thời lượng, chuyển cảnh', async () => {
    const L = SHOTS(); const n = await A.getStr('Tên cảnh', { def: 'Cảnh ' + (L.length + 1) }); const name = String(n.str || ('Cảnh ' + (L.length + 1))).trim();
    const dur = Math.max(0, numOr(await A.getNum('Thời lượng giữ cảnh (giây)', { def: 2 }), 2)); const tr = await A.getKw('Chuyển cảnh [Mượt / Cắt]', { kw: [{ k: 'S', t: 'Mượt' }, { k: 'C', t: 'Cắt' }], def: 'Mượt' });
    const sh = { name, dur, tr: tr.kw === 'C' ? 'cut' : 'smooth', img: thumb() }; const v3 = A.view3D ? view3() : null; if(v3) sh.v3 = v3; else sh.v2 = view2D();
    const i = L.findIndex(x => x.name === name); if(i >= 0) L[i] = sh; else L.push(sh); saveShots(L); log('NEWSHOT: "' + name + '" (' + (v3 ? 'khung 3D' : 'mặt bằng 2D') + ', ' + dur + ' s). NAVSMOTION để xem.'); if(NM) navsmotion(); });
  cmd(['EDITSHOT'], 'Sửa cảnh quay: tên, thời lượng, chuyển cảnh, cập nhật góc nhìn hiện tại', async () => {
    const L = SHOTS(); if(!L.length){ log('Chưa có cảnh quay (NEWSHOT).'); return; } const r = await A.getStr('Tên cảnh cần sửa <' + L[0].name + '>', { def: L[0].name }); const sh = L.find(x => x.name === String(r.str || L[0].name).trim()); if(!sh){ log('Không có cảnh "' + r.str + '".'); return; }
    const k = await A.getKw('Sửa [Tên / Thời lượng / Chuyển cảnh / Lấy góc nhìn hiện tại / Xoá]', { kw: [{ k: 'N', t: 'Tên' }, { k: 'D', t: 'Thời lượng' }, { k: 'T', t: 'Chuyển cảnh' }, { k: 'V', t: 'Lấy góc nhìn hiện tại' }, { k: 'X', t: 'Xoá' }], def: 'Lấy góc nhìn hiện tại' });
    if(k.kw === 'N'){ const t = await A.getStr('Tên mới', { def: sh.name }); if(t.str) sh.name = t.str.trim(); }
    else if(k.kw === 'D') sh.dur = Math.max(0, numOr(await A.getNum('Thời lượng (giây)', { def: sh.dur }), sh.dur));
    else if(k.kw === 'T') sh.tr = sh.tr === 'cut' ? 'smooth' : 'cut';
    else if(k.kw === 'X') L.splice(L.indexOf(sh), 1);
    else { delete sh.v2; delete sh.v3; const v3 = A.view3D ? view3() : null; if(v3) sh.v3 = v3; else sh.v2 = view2D(); sh.img = thumb(); }
    saveShots(L); log('EDITSHOT: đã sửa "' + sh.name + '".'); if(NM) navsmotion(); });
  let NM = null, playing = false;
  async function playAll(loop){ const L = SHOTS(); if(!L.length) return; playing = true; do { for(const sh of L){ if(!playing) return; if(sh.v3 && !A.view3D) await open3(); await animateTo(sh, sh.tr === 'cut' ? 0 : VT().on ? VT().ms : 0); await new Promise(r => setTimeout(r, (sh.dur || 0) * 1000)); } } while(loop && playing); playing = false; }
  A.shotsPlay = playAll;
  function navsmotion(){ if(NM) NM.remove(); const L = SHOTS(); const el = document.createElement('div'); el.className = 'acw'; el.id = 'dvdNavsmotion'; el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:64px;z-index:60;background:var(--panel,#262b34);border:1px solid #444;border-radius:6px;padding:6px;display:flex;gap:6px;align-items:center;max-width:92vw;overflow:auto';
    el.innerHTML = '<button type="button" class="acw-btn" data-a="play" title="Chạy tất cả">▶</button><button type="button" class="acw-btn" data-a="loop" title="Chạy lặp">⟳</button><button type="button" class="acw-btn" data-a="stop" title="Dừng">■</button>' + (L.length ? L.map((s, i) => '<div data-i="' + i + '" style="cursor:pointer;text-align:center;font-size:11px"><img src="' + (s.img || '') + '" style="width:96px;height:60px;object-fit:cover;border:1px solid #555;display:block">' + esc(s.name) + '</div>').join('') : '<i style="padding:0 8px">Chưa có cảnh — NEWSHOT</i>') + '<button type="button" class="acw-btn" data-a="new" title="Cảnh mới">＋</button><button type="button" class="acw-btn" data-a="close" title="Đóng">✕</button>';
    el.addEventListener('click', ev => { const a = ev.target.closest('[data-a]'), t = ev.target.closest('[data-i]'); if(t){ const sh = L[+t.dataset.i]; (sh.v3 && !A.view3D ? open3() : Promise.resolve()).then(() => animateTo(sh)); return; } if(!a) return;
      if(a.dataset.a === 'play') playAll(false); if(a.dataset.a === 'loop') playAll(true); if(a.dataset.a === 'stop') playing = false; if(a.dataset.a === 'new') DVDCmd.run('NEWSHOT'); if(a.dataset.a === 'close'){ playing = false; el.remove(); NM = null; } });
    document.body.appendChild(el); NM = el; }
  plain(['NAVSMOTION'], 'Thanh ShowMotion: các cảnh quay, chạy lần lượt / lặp, bấm cảnh để chuyển tới', navsmotion);
  plain(['NAVSMOTIONCLOSE'], 'Đóng thanh ShowMotion', () => { playing = false; if(NM){ NM.remove(); NM = null; } });
  plain(['VTOPTIONS'], 'Chuyển cảnh mượt (view transitions): bật / tắt, thời gian', () => { const v = VT(); const d = A.dialog({ title: 'View Transitions', html: '<div class="acw" style="min-width:320px"><label style="display:block"><input id="vtOn" type="checkbox"' + (v.on ? ' checked' : '') + '> Chuyển cảnh mượt khi đổi góc nhìn (cảnh quay, tâm quay 3D)</label><div class="acw-row"><label>Thời gian (ms)</label><input id="vtMs" type="number" min="0" max="10000" step="100" value="' + v.ms + '" style="width:90px"></div></div>',
    ok: root => { const o = { on: root.querySelector('#vtOn').checked, ms: Math.max(0, Math.min(10000, +root.querySelector('#vtMs').value || 0)) }; SV('dvd:vt', o); log('VTOPTIONS: ' + (o.on ? 'mượt, ' + o.ms + ' ms' : 'tắt') + '.'); } }); noKey(d); });

  /* ===================== khung 3D: tâm quay, mặt cắt ===================== */
  cmd(['3DORBITCTR'], 'Đặt tâm quay của khung 3D (bấm điểm trong khung 3D hoặc gõ x,y,z)', async () => {
    const V = await open3(); if(!V || !V.state) return; const p = await A.getPoint('Tâm quay'); if(!p.pt) return; const L = A._last3D; const z = p.pt.z != null ? p.pt.z : (L && Math.abs(L.x - p.pt.x) + Math.abs(L.y - p.pt.y) < 1e-3 * (1 + Math.abs(p.pt.x)) ? L.z : 0);
    const S = V.state, cur = view3(); const tgt = [p.pt.x, p.pt.y, z]; await animateTo({ v3: { az: cur.az, el: cur.el, dist: cur.dist, t: tgt } }, VT().on ? Math.min(800, VT().ms) : 0); void S; log('3DORBITCTR: tâm quay ' + tgt.map(v => (+v).toFixed(3)).join(', ') + '.'); });
  let liveSec = false;
  plain(['LIVESECTION'], 'Bật / tắt mặt cắt sống (cắt mô hình trong khung 3D)', async () => { const V = await open3(); if(!V || !V.setCut) return; liveSec = !liveSec; V.setCut(liveSec, liveSec ? 0.5 : undefined); V.render(); log('LIVESECTION: ' + (liveSec ? 'bật' : 'tắt') + '.'); });

  /* ===================== ANIPATH: camera theo đường → video ===================== */
  function pathPts(e){ const q = A.curvePts3 ? A.curvePts3(e) : null; if(!q) return null; const P = q.closed ? q.pts.concat([q.pts[0]]) : q.pts; return P.length >= 2 ? P : null; }
  function along(P, s){ let acc = 0; for(let i = 1; i < P.length; i++){ const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); if(acc + L >= s || i === P.length - 1){ const t = L ? Math.max(0, Math.min(1, (s - acc) / L)) : 0; return [0, 1, 2].map(k => P[i - 1][k] + (P[i][k] - P[i - 1][k]) * t); } acc += L; } return P[P.length - 1]; }
  const plen = P => { let s = 0; for(let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); return s; };
  async function animate(o){ const V = await open3(); if(!V) return null; if(o.real && V.setStyle) V.setStyle('real'); applyEnv(V);
    const P = o.path, L = plen(P), N = Math.max(2, Math.round(o.sec * o.fps)); let rec = null, chunks = [];
    if(o.record && V.canvas.captureStream && window.MediaRecorder){ const st = V.canvas.captureStream(o.fps); const mt = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || ''; rec = new MediaRecorder(st, mt ? { mimeType: mt, videoBitsPerSecond: 6e6 } : {}); rec.ondataavailable = ev => { if(ev.data && ev.data.size) chunks.push(ev.data); }; rec.start(250); }
    const dt = 1000 / o.fps;
    for(let i = 0; i < N; i++){ const s = L * i / (N - 1); const pos = along(P, s); pos[2] += o.eye; let tgt;
      if(o.target) tgt = o.target; else { const ahead = along(P, Math.min(L, s + L / 50 + 1e-9)); tgt = [ahead[0], ahead[1], ahead[2] + o.eye]; if(Math.hypot(tgt[0] - pos[0], tgt[1] - pos[1]) < 1e-9){ const b = along(P, Math.max(0, s - L / 50)); tgt = [2 * pos[0] - b[0], 2 * pos[1] - b[1], pos[2]]; } }
      V.camTo(pos, tgt); V.render(); await new Promise(r => setTimeout(r, dt)); }
    if(!rec) return { frames: N };
    await new Promise(r => { rec.onstop = r; rec.stop(); }); const blob = new Blob(chunks, { type: 'video/webm' }); return { frames: N, blob }; }
  A.aniPath = animate;
  cmd(['ANIPATH'], 'Hoạt hình theo đường: camera đi dọc đường (đa tuyến / 3D / cung), nhìn theo hướng đi hoặc một điểm → video WebM', async () => {
    const r = await A.getEnt('Chọn đường đi của camera', { filter: e => !!pathPts(e) }); if(!r.ent) return; const P = pathPts(r.ent);
    const k = await A.getKw('Camera nhìn [Theo hướng đi / Một điểm]', { kw: [{ k: 'F', t: 'Theo hướng đi' }, { k: 'P', t: 'Một điểm' }], def: 'Theo hướng đi' }); let target = null;
    if(k.kw === 'P'){ const t = await A.getPoint('Điểm nhìn tới'); if(!t.pt) return; target = [t.pt.x, t.pt.y, numOr(await A.getNum('Cao độ điểm nhìn', { def: 0 }), 0)]; }
    const eye = numOr(await A.getNum('Cao độ mắt trên đường', { def: Math.round(1600 / U() * 1000) / 1000 }), 1600 / U()); const sec = Math.max(1, Math.min(600, numOr(await A.getNum('Thời lượng (giây)', { def: 10 }), 10))); const fps = Math.max(5, Math.min(60, Math.round(numOr(await A.getNum('Số hình / giây', { def: 25 }), 25))));
    const out = await A.getKw('Kết quả [Video WebM / Chỉ xem]', { kw: [{ k: 'V', t: 'Video WebM' }, { k: 'X', t: 'Chỉ xem' }], def: 'Video WebM' });
    log('ANIPATH: đang chạy ' + sec + ' s, ' + fps + ' hình/s…'); const R = await animate({ path: P, target, eye, sec, fps, record: out.kw !== 'X', real: true }); if(!R) return;
    if(R.blob){ const nm = ((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '') + '-anipath.webm'; try{ await shareOrDownload(R.blob, nm, 'video/webm'); }catch(_){} A._lastAnim = R.blob; log('ANIPATH: video ' + nm + ' (' + Math.round(R.blob.size / 1024) + ' KB, ' + R.frames + ' hình).'); } else log('ANIPATH: đã chạy ' + R.frames + ' hình.'); });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
