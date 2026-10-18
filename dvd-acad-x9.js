/* DVDCAD v4p — tiếp tục bổ sung các chức năng còn thiếu so với AutoCAD
   CTB / STYLESMANAGER (kiểu in theo màu: nhập file .ctb, sửa, áp dụng khi PLOT) · DATALINK / TABLEEXPORT (bảng từ Excel / CSV)
   REGION + UNION / SUBTRACT / INTERSECT cho vùng 2D · MASSPROP vùng · SNAPANG / SNAP / GRID / ORTHO
   Đa tuyến: menu nắm kéo (thêm / xoá đỉnh, đổi đoạn thẳng ↔ cung) · OFFSET: Xoá / Lớp / Nhiều lần
   Tool Palettes kéo-thả lên bản vẽ · MLEADERSTYLE · COUNT · SELECT · DBLIST · COPYHIST · JPGOUT · CLEANSCREENON · BASE · COLOR */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x9 || !window.DVDCmd) return; A._x9 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const o = JSON.parse(JSON.stringify(e)); delete o.userAdded; return o; };
  const deep = o => JSON.parse(JSON.stringify(o));
  const ico = k => A.ico ? A.ico(k) : '';
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
  const baseName = () => { try{ return String(currentName || 'banve').replace(/\.[^.]+$/, ''); }catch(_){ return 'banve'; } };
  const saveBlob = (blob, name) => { try{ if(typeof shareOrDownload === 'function') return shareOrDownload(blob, name, blob.type); }catch(_){} try{ downloadBlob(blob, name); }catch(_){} };
  const fmtN = v => (+v).toFixed(Math.abs(v) >= 1000 ? 1 : 3).replace(/\.?0+$/, '');

  /* =====================================================================
     1) KIỂU IN THEO MÀU (CTB) — STYLESMANAGER / PLOTSTYLE / CONVERTCTB
     ===================================================================== */
  const CTBK = 'dvd:ctbs';
  const LWS = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];   // 1/100 mm như AutoCAD
  // st[aci] = { c: null | '#rrggbb', lw: 0 (= theo đối tượng) | 1/100 mm, sc: 100 (screening %) } — chỉ lưu mục khác mặc định
  const PRESETS = {
    'monochrome': { d: 'Mọi màu in đen, bề rộng theo đối tượng', mk: () => { const s = {}; for(let i = 1; i <= 255; i++) s[i] = { c: '#000000' }; return s; } },
    'DVD-VN (màu → nét)': { d: 'In đen, bề rộng nét theo màu như thói quen văn phòng VN (1 đỏ 0.13 · 2 vàng 0.18 · 3 lá 0.25 · 4 lam 0.35 · 5 xanh 0.50 · 6 tím 0.30 · 7 trắng 0.20 · 8/9 0.09)', mk: () => { const s = {}; const W = { 1: 13, 2: 18, 3: 25, 4: 35, 5: 50, 6: 30, 7: 20, 8: 9, 9: 9 }; for(let i = 1; i <= 255; i++) s[i] = { c: '#000000', lw: W[i] || (i >= 250 ? 13 : 18) }; s[8].sc = 100; s[250] = { c: '#000000', lw: 9, sc: 60 }; s[251] = { c: '#000000', lw: 9, sc: 40 }; s[252] = { c: '#000000', lw: 9, sc: 25 }; return s; } },
    'Screening 50%': { d: 'Màu theo đối tượng, mờ 50% (bản nền)', mk: () => { const s = {}; for(let i = 1; i <= 255; i++) s[i] = { sc: 50 }; return s; } },
    'Màu 8/9 xám nhạt': { d: 'In màu theo đối tượng, riêng màu 8, 9, 250–254 in xám mờ (nét phụ)', mk: () => { const s = {}; for(const i of [8, 9, 250, 251, 252, 253, 254]) s[i] = { c: '#000000', sc: 35, lw: 9 }; return s; } }
  };
  function ctbAll(){ try{ return JSON.parse(localStorage.getItem(CTBK) || '{}'); }catch(_){ return {}; } }
  function ctbSave(all){ try{ localStorage.setItem(CTBK, JSON.stringify(all)); }catch(_){ say('Không lưu được kiểu in (bộ nhớ đầy).'); } ctbCache.clear(); }
  function ctbPut(name, T){ const all = ctbAll(); all[name] = T; ctbSave(all); return T; }
  function ctbGet(name){ return ctbAll()[name] || null; }
  const ctbCache = new Map();
  // .ctb: "PIAFILEVERSION_2.0,CTBVER1,compress\r\npmzlibcodec" + 12 byte + luồng zlib (văn bản cấu hình)
  async function inflate(bytes){
    if(typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt không hỗ trợ giải nén');
    const ds = new DecompressionStream('deflate'); const w = ds.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {});
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  async function ctbParse(buf){
    const u8 = new Uint8Array(buf); let text = null;
    const head = new TextDecoder('latin1').decode(u8.slice(0, 64));
    if(/^PIAFILEVERSION/.test(head)){
      let st = 60; for(let i = 48; i < Math.min(u8.length - 1, 120); i++){ if(u8[i] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(u8[i + 1])){ st = i; break; } }
      text = new TextDecoder('latin1').decode(await inflate(u8.slice(st)));
    } else text = new TextDecoder('utf-8').decode(u8);
    if(!/plot_style\s*\{/.test(text)) throw new Error('Không phải file kiểu in .ctb');
    const lwt = []; const lt = /custom_lineweight_table\s*\{([\s\S]*?)\}/.exec(text); if(lt) for(const m of lt[1].matchAll(/(\d+)\s*=\s*([\d.]+)/g)) lwt[+m[1]] = parseFloat(m[2]);
    const ps = text.slice(text.search(/plot_style\s*\{/)); const st = {}; const desc = (/^\s*description="?(.*)$/m.exec(text) || [])[1] || '';
    const blocks = ps.matchAll(/\n\s*(\d+)\s*\{([\s\S]*?)\n\s*\}/g);
    for(const m of blocks){ const idx = +m[1]; if(idx > 254) continue; const aci = idx + 1; const b = m[2]; const num = k => { const r = new RegExp('\\b' + k + '\\s*=\\s*(-?[\\d.]+)').exec(b); return r ? parseFloat(r[1]) : null; };
      const o = {}; const c = num('color'); if(c != null){ const u = c >>> 0; if((u >>> 24) !== 0xC3) o.c = '#' + (u & 0xFFFFFF).toString(16).padStart(6, '0'); }
      const li = num('lineweight'); if(li != null && li !== 255 && li < 255){ const mm = lwt[li] != null ? lwt[li] : null; if(mm != null) o.lw = Math.round(mm * 100); }
      const sc = num('screen'); if(sc != null && sc < 100) o.sc = Math.max(0, sc);
      if(Object.keys(o).length) st[aci] = o; }
    return { st, desc: desc.replace(/^"|"$/g, ''), src: 'ctb' };
  }
  // ghi file .ctb mà AutoCAD đọc được (cùng định dạng: văn bản cấu hình nén zlib + đầu tệp PIAFILEVERSION)
  const LWMM = [0.00, 0.05, 0.09, 0.10, 0.13, 0.15, 0.18, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.53, 0.60, 0.65, 0.70, 0.80, 0.90, 1.00, 1.06, 1.20, 1.40, 1.58, 2.00, 2.11];
  function adler32(u8){ let a = 1, b = 0; for(let i = 0; i < u8.length; i++){ a = (a + u8[i]) % 65521; b = (b + a) % 65521; } return ((b << 16) | a) >>> 0; }
  async function deflate(u8){ if(typeof CompressionStream === 'undefined') throw new Error('Trình duyệt không hỗ trợ nén'); const cs = new CompressionStream('deflate'); const w = cs.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }
  function ctbText(T){
    const L = ['description="' + String(T.desc || '').replace(/[\r\n"]/g, ' '), 'aci_table_available=TRUE', 'scale_factor=1.0', 'apply_factor=FALSE', 'custom_lineweight_display_units=0', 'aci_table{'];
    for(let i = 0; i < 255; i++) L.push(' ' + i + '="Color_' + (i + 1));
    L.push('}', 'plot_style{');
    for(let i = 0; i < 255; i++){ const st = T.st[i + 1] || {}; let col = -1006632961; if(st.c){ const n = parseInt(st.c.slice(1), 16) & 0xFFFFFF; col = (0xC2000000 | n) | 0; }
      let li = 255; if(st.lw > 0){ let bi = 0, bd = Infinity; LWMM.forEach((mm, k) => { const d = Math.abs(mm * 100 - st.lw); if(d < bd){ bd = d; bi = k; } }); li = bi; }
      L.push(' ' + i + '{', '  name="Color_' + (i + 1), '  localized_name="Color_' + (i + 1), '  description="', '  color=' + col, '  mode_color=' + col, '  color_policy=1', '  physical_pen_number=0', '  virtual_pen_number=0', '  screen=' + Math.round(st.sc != null ? st.sc : 100), '  linepattern_size=0.5', '  linetype=31', '  adaptive_linetype=TRUE', '  lineweight=' + li, '  fill_style=73', '  end_style=4', '  join_style=5', ' }'); }
    L.push('}', 'custom_lineweight_table{'); LWMM.forEach((mm, k) => L.push(' ' + k + '=' + mm.toFixed(2))); L.push('}');
    return L.join('\n') + '\n';
  }
  async function ctbBuild(T){
    const raw = new TextEncoder().encode(ctbText(T)); const body = new Uint8Array(raw.length + 1); body.set(raw); // kết thúc bằng NUL như AutoCAD
    const comp = await deflate(body); const head = new TextEncoder().encode('PIAFILEVERSION_2.0,CTBVER1,compress\r\npmzlibcodec');
    const out = new Uint8Array(head.length + 12 + comp.length); out.set(head, 0); const dv = new DataView(out.buffer); dv.setUint32(head.length, adler32(comp), true); dv.setUint32(head.length + 4, body.length, true); dv.setUint32(head.length + 8, comp.length, true); out.set(comp, head.length + 12); return out;
  }
  A.ctb = { all: ctbAll, build: ctbBuild, text: ctbText, get: ctbGet, put: ctbPut, parse: ctbParse, presets: PRESETS, del: n => { const a = ctbAll(); delete a[n]; ctbSave(a); } };
  // màu hex → ACI gần nhất (có bộ nhớ đệm)
  const aciMemo = new Map();
  function aciOf(hex){
    let h = String(hex || '').trim().toLowerCase(); if(aciMemo.has(h)) return aciMemo.get(h);
    let s = h.replace('#', ''); if(s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); let best = 7;
    if(/^[0-9a-f]{6}$/.test(s)){ const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; let bd = Infinity; for(let i = 1; i <= 255; i++){ const v = ACI_RGB[i]; const d = (((v >> 16) & 255) - r) ** 2 + (((v >> 8) & 255) - g) ** 2 + ((v & 255) - b) ** 2; if(d < bd){ bd = d; best = i; if(!d) break; } } }
    aciMemo.set(h, best); return best;
  }
  A.aciOf = aciOf;
  const curCtb = () => { if(!plotMode || typeof _plotStyle !== 'string' || !_plotStyle.startsWith('ctb:')) return null; const n = _plotStyle.slice(4); if(!ctbCache.has(n)) ctbCache.set(n, ctbGet(n)); return ctbCache.get(n); };
  const screenHex = (hex, sc) => { let s = String(hex).replace('#', ''); if(s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); if(!isFinite(n)) return hex; const f = Math.max(0, Math.min(100, sc)) / 100; const m = v => Math.round(255 - (255 - v) * f); return 'rgb(' + m((n >> 16) & 255) + ',' + m((n >> 8) & 255) + ',' + m(n & 255) + ')'; };
  const _plotColor = window.plotColor;
  window.plotColor = function(hex){
    const T = curCtb(); if(!T) return _plotColor.apply(this, arguments);
    const st = T.st[aciOf(hex)] || {}; let out;
    if(st.c) out = st.c; else { const sv = _plotStyle; _plotStyle = ''; try{ out = _plotColor.call(this, hex); }finally{ _plotStyle = sv; } }
    if(st.sc != null && st.sc < 100){ if(/^rgb/.test(out)){ const m = out.match(/\d+/g).map(Number); out = '#' + m.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''); } out = screenHex(out, st.sc); }
    return out;
  };
  const _lwOf = window.lwOf;
  window.lwOf = function(e){ const T = curCtb(); if(T && e){ const st = T.st[aciOf(e.col || A.layerHex(e.layer || '0'))]; if(st && st.lw > 0) return st.lw; } return _lwOf.apply(this, arguments); };

  function ctbEditor(name0){
    const all = ctbAll(); let names = Object.keys(all).sort(); let cur = name0 && all[name0] ? name0 : names[0] || null; let work = cur ? deep(all[cur]) : null;
    const lwOpt = v => '<option value="0"' + (!v ? ' selected' : '') + '>Theo đối tượng</option>' + LWS.slice(1).map(w => '<option value="' + w + '"' + (w === v ? ' selected' : '') + '>' + (w / 100).toFixed(2) + ' mm</option>').join('');
    const rowH = i => { const s = (work && work.st[i]) || {}; const hx = aciHex(i); return '<tr data-a="' + i + '"><td><span style="display:inline-block;width:12px;height:12px;background:' + hx + ';border:1px solid #555;vertical-align:middle"></span> ' + i + '</td>' +
      '<td><select data-k="cm"><option value="o"' + (!s.c ? ' selected' : '') + '>Theo đối tượng</option><option value="b"' + (s.c === '#000000' ? ' selected' : '') + '>Đen</option><option value="x"' + (s.c && s.c !== '#000000' ? ' selected' : '') + '>Màu khác…</option></select> <input type="color" data-k="c" value="' + (s.c || hx) + '" style="width:30px;height:20px;padding:0;border:none;' + (s.c && s.c !== '#000000' ? '' : 'display:none') + '"></td>' +
      '<td><select data-k="lw">' + lwOpt(s.lw || 0) + '</select></td><td><input data-k="sc" value="' + (s.sc != null ? s.sc : 100) + '" style="width:44px"> %</td></tr>'; };
    const d = A.dialog({ title: 'Kiểu in theo màu (Plot Style Table — .ctb)', wide: true, okText: 'Lưu', html:
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><select id="ctN" style="min-width:180px"></select><button type="button" class="btn-ghost" id="ctNew">Mới…</button><button type="button" class="btn-ghost" id="ctImp">Nhập .ctb…</button><button type="button" class="btn-ghost" id="ctExp">Xuất .ctb</button><button type="button" class="btn-ghost" id="ctDel">Xoá</button><button type="button" class="btn-ghost" id="ctAll">Áp cho mọi màu…</button></div>' +
      '<div id="ctDesc" style="font-size:12px;color:#aab3c0;margin-bottom:4px"></div><div class="lm-tbl" style="max-height:340px"><table><thead><tr><th>Màu ACI</th><th>Màu in</th><th>Bề rộng nét</th><th>Độ đậm</th></tr></thead><tbody id="ctB"></tbody></table></div>' +
      '<div style="font-size:12px;color:#aab3c0;margin-top:6px">Chọn kiểu in trong hộp thoại PLOT (mục “Kiểu in”). Bề rộng nét chỉ in khi bật “In bề rộng nét”.</div>',
      onOpen: root => {
        root.addEventListener('keydown', e => e.stopPropagation(), true);
        const tb = root.querySelector('#ctB'), sN = root.querySelector('#ctN');
        const fillN = () => { names = Object.keys(ctbAll()).concat(cur && !ctbAll()[cur] ? [cur] : []).filter((v, i, a) => a.indexOf(v) === i).sort(); sN.innerHTML = names.length ? names.map(n => '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>').join('') : '<option value="">(chưa có — bấm Mới hoặc Nhập .ctb)</option>'; };
        const render = () => { fillN(); root.querySelector('#ctDesc').textContent = work ? (work.desc || '') : ''; let h = ''; if(work) for(let i = 1; i <= 255; i++) h += rowH(i); tb.innerHTML = h; };
        const pull = () => { if(!work) return; tb.querySelectorAll('tr[data-a]').forEach(tr => { const i = +tr.dataset.a; const cm = tr.querySelector('[data-k=cm]').value, c = tr.querySelector('[data-k=c]').value, lw = +tr.querySelector('[data-k=lw]').value, sc = parseFloat(tr.querySelector('[data-k=sc]').value);
          const o = {}; if(cm === 'b') o.c = '#000000'; else if(cm === 'x') o.c = c; if(lw > 0) o.lw = lw; if(isFinite(sc) && sc < 100) o.sc = Math.max(0, sc); if(Object.keys(o).length) work.st[i] = o; else delete work.st[i]; }); };
        tb.addEventListener('change', e => { const s = e.target.closest('[data-k=cm]'); if(s){ const c = s.parentNode.querySelector('[data-k=c]'); c.style.display = s.value === 'x' ? '' : 'none'; } });
        sN.onchange = () => { pull(); if(cur && work) ctbPut(cur, work); cur = sN.value; work = cur ? deep(ctbGet(cur)) : null; render(); };
        root.querySelector('#ctNew').onclick = () => { const keys = Object.keys(PRESETS); const t = prompt('Tên kiểu in mới (.ctb).\nMẫu khởi tạo: ' + keys.map((k, i) => (i + 1) + ' = ' + k).join(' · ') + '\nNhập: tên | số mẫu', 'KieuIn1 | 2'); if(!t) return; const [nm, pi] = t.split('|').map(s => s.trim()); if(!nm) return; pull(); if(cur && work) ctbPut(cur, work); const P = PRESETS[keys[(+pi || 1) - 1]] || PRESETS.monochrome; work = { st: P.mk(), desc: P.d }; cur = nm.replace(/\.ctb$/i, ''); ctbPut(cur, work); render(); };
        root.querySelector('#ctImp').onclick = async () => { const f = await pickFile('.ctb'); if(!f) return; try{ const T = await ctbParse(await f.arrayBuffer()); pull(); if(cur && work) ctbPut(cur, work); cur = f.name.replace(/\.ctb$/i, ''); work = T; ctbPut(cur, T); render(); say('Đã nhập ' + f.name + ' (' + Object.keys(T.st).length + ' màu có thiết lập)'); }catch(err){ say('Không đọc được: ' + err.message); } };
        root.querySelector('#ctExp').onclick = async () => { if(!work || !cur) return; pull(); ctbPut(cur, work); try{ const u = await ctbBuild(work); saveBlob(new Blob([u], { type: 'application/octet-stream' }), cur + '.ctb'); log('Đã xuất ' + cur + '.ctb — chép vào thư mục Plot Styles của AutoCAD để dùng.'); }catch(err){ say('Không xuất được: ' + err.message); } };
        root.querySelector('#ctDel').onclick = () => { if(!cur || !confirm('Xoá kiểu in "' + cur + '"?')) return; A.ctb.del(cur); cur = Object.keys(ctbAll())[0] || null; work = cur ? deep(ctbGet(cur)) : null; render(); };
        root.querySelector('#ctAll').onclick = () => { if(!work) return; pull(); const v = prompt('Áp cho mọi màu: màu in (o = theo đối tượng, b = đen) | bề rộng mm (0 = theo đối tượng) | độ đậm %', 'b | 0 | 100'); if(!v) return; const [c, w, s] = v.split('|').map(x => x.trim()); const lw = Math.round(parseFloat(w) * 100) || 0, sc = parseFloat(s);
          for(let i = 1; i <= 255; i++){ const o = Object.assign({}, work.st[i] || {}); if(c === 'b') o.c = '#000000'; else if(c === 'o') delete o.c; if(w !== undefined && w !== '') { if(lw > 0) o.lw = lw; else delete o.lw; } if(isFinite(sc)){ if(sc < 100) o.sc = sc; else delete o.sc; } if(Object.keys(o).length) work.st[i] = o; else delete work.st[i]; } render(); };
        render(); root._pull = pull;
      },
      ok: root => { root._pull && root._pull(); if(cur && work){ ctbPut(cur, work); log('Đã lưu kiểu in "' + cur + '.ctb"'); } refreshPlotOpts(); }
    });
    return d;
  }
  A.ctbEditor = ctbEditor;
  plain(['STYLESMANAGER', 'PLOTSTYLE', 'CTB', 'CONVERTCTB', 'KIEUIN'], 'Kiểu in theo màu (.ctb): nhập file CTB của AutoCAD, sửa màu in / bề rộng nét / độ đậm theo màu', () => { if(A.busy()) A.cancel(true); ctbEditor(); });
  // gắn vào hộp thoại PLOT: thêm các kiểu in đã lưu + nút sửa
  let plotRoot = null;
  function refreshPlotOpts(){
    const root = plotRoot; if(!root || !document.body.contains(root)) return; const s = root.querySelector('#plStyle'); if(!s) return;
    s.querySelectorAll('option[data-ctb]').forEach(o => o.remove()); const cur = (A.PS && A.PS.style) || s.value;
    for(const n of Object.keys(ctbAll()).sort()){ const o = document.createElement('option'); o.value = 'ctb:' + n; o.textContent = n + '.ctb'; o.dataset.ctb = 1; s.appendChild(o); }
    if([...s.options].some(o => o.value === cur)) s.value = cur;
  }
  const _dialog = A.dialog;
  A.dialog = function(o){
    const d = _dialog.apply(this, arguments);
    try{ const root = d && d.root; const s = root && root.querySelector('#plStyle');
      if(s){ plotRoot = root; refreshPlotOpts(); if(!root.querySelector('#plCtbEd')){ const b = document.createElement('button'); b.type = 'button'; b.id = 'plCtbEd'; b.className = 'btn-ghost'; b.textContent = '✎'; b.title = 'Sửa / nhập kiểu in .ctb (STYLESMANAGER)'; b.style.cssText = 'margin-left:4px;padding:3px 8px'; s.after(b); b.onclick = () => ctbEditor(s.value.startsWith('ctb:') ? s.value.slice(4) : null); } } }catch(_){}
    return d;
  };

  /* =====================================================================
     2) DATALINK / TABLEIMPORT / DATALINKUPDATE / TABLEEXPORT
     ===================================================================== */
  let xlsxP = null;
  function loadXLSX(){ if(window.XLSX) return Promise.resolve(window.XLSX); if(xlsxP) return xlsxP;
    xlsxP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = './vendor/xlsx/xlsx.mini.min.js'; s.onload = () => window.XLSX ? res(window.XLSX) : rej(new Error('xlsx')); s.onerror = () => { xlsxP = null; rej(new Error('Không tải được bộ đọc Excel')); }; document.head.appendChild(s); });
    return xlsxP; }
  A.loadXLSX = loadXLSX;
  function parseCSV(text){
    text = String(text).replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || ''; const cnt = ch => (first.match(new RegExp('\\' + ch, 'g')) || []).length;
    const dl = cnt('\t') > 0 ? '\t' : cnt(';') > cnt(',') ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for(let i = 0; i < text.length; i++){ const c = text[i];
      if(q){ if(c === '"'){ if(text[i + 1] === '"'){ f += '"'; i++; } else q = false; } else f += c; continue; }
      if(c === '"' && f === ''){ q = true; continue; }
      if(c === dl){ row.push(f); f = ''; continue; }
      if(c === '\n' || c === '\r'){ if(c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; continue; }
      f += c; }
    if(f !== '' || row.length){ row.push(f); rows.push(row); }
    while(rows.length && rows[rows.length - 1].every(v => !String(v).trim())) rows.pop();
    return rows;
  }
  A.parseCSV = parseCSV;
  // đọc file → { sheets: {tên: [[...]]}, names }
  async function readTableFile(file){
    const nm = file.name || ''; if(/\.(csv|txt|tsv)$/i.test(nm)){ const rows = parseCSV(await file.text()); return { names: ['CSV'], sheets: { CSV: rows } }; }
    const X = await loadXLSX(); const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true });
    const sheets = {}; for(const sn of wb.SheetNames){ const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '', blankrows: false }); sheets[sn] = rows.map(r => r.map(v => v == null ? '' : String(v))); }
    return { names: wb.SheetNames.slice(), sheets };
  }
  A.readTableFile = readTableFile;
  const colIdx = s => { let n = 0; for(const ch of s.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  function cutRange(rows, range){
    const m = /^\s*([A-Z]+)(\d+)\s*(?::\s*([A-Z]+)(\d+))?\s*$/i.exec(range || ''); let out = rows;
    if(m){ const c0 = colIdx(m[1]), r0 = +m[2] - 1, c1 = m[3] ? colIdx(m[3]) : 1e9, r1 = m[4] ? +m[4] - 1 : 1e9; out = rows.slice(r0, r1 + 1).map(r => r.slice(c0, c1 + 1)); }
    const nc = Math.max(0, ...out.map(r => r.length)); out = out.map(r => { const o = r.slice(); while(o.length < nc) o.push(''); return o; });
    // bỏ cột trống ở cuối
    while(out.length && out[0].length && out.every(r => !String(r[r.length - 1]).trim())) out.forEach(r => r.pop());
    return out.slice(0, 500).map(r => r.slice(0, 60));
  }
  function tableDefFrom(data, o){
    const th = o.th, nc = Math.max(1, ...data.map(r => r.length)); const title = !!o.title;
    const cells = (title ? [[o.titleText || '']] : []).concat(data).map(r => { const a = r.map(v => String(v == null ? '' : v).trim()); while(a.length < nc) a.push(''); return a; });
    const cw = []; for(let c = 0; c < nc; c++){ let mx = 0; for(const r of data) mx = Math.max(mx, [...String(r[c] || '')].length); cw.push(Math.max(th * 4, mx * th * 0.62 + th * 1.4)); }
    return { o: { x: 0, y: 0 }, rot: 0, cw, rh: cells.map(() => th * 2.2), cells, th, title, head: !!o.head };
  }
  function tableEnts(T, gid){ const w = A.newProps({ type: 'LINE' }); delete w.lt; w.tbld = T; w.grp = gid; const ents = A.tblRegenFrom(w); for(const e of ents){ delete e.lt; } return ents; }
  A.tableFromRows = (rows, pt, o) => { const T = tableDefFrom(rows, Object.assign({ th: (A.dimTxt ? A.dimTxt() : 2.5), head: true }, o || {})); T.o = { x: pt.x, y: pt.y }; if(o && o.link) T.link = o.link; const ents = tableEnts(T, A.newGroupId('T')); A.commit({ add: ents }, 'Đã chèn bảng ' + T.cells.length + '×' + T.cw.length); return ents; };
  // giữ "tay cầm" file (File System Access API — Chrome/Edge máy tính) để cập nhật bảng không cần chọn lại file
  const LH = new Map(); let ldb = null;
  const lidb = () => ldb || (ldb = new Promise((res, rej) => { try{ const r = indexedDB.open('dvd-links', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }catch(err){ rej(err); } }));
  async function hPut(id, h){ LH.set(id, h); try{ const d = await lidb(); await new Promise((res, rej) => { const t = d.transaction('h', 'readwrite'); t.objectStore('h').put(h, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); }catch(_){} }
  async function hGet(id){ if(LH.has(id)) return LH.get(id); try{ const d = await lidb(); const h = await new Promise(res => { const q = d.transaction('h').objectStore('h').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); if(h) LH.set(id, h); return h; }catch(_){ return null; } }
  A.linkHandles = { put: hPut, get: hGet, map: LH };
  async function pickLinked(){
    if(typeof window.showOpenFilePicker === 'function'){
      try{ const [h] = await window.showOpenFilePicker({ multiple: false, types: [{ description: 'Bảng tính Excel / CSV', accept: { 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'], 'application/vnd.oasis.opendocument.spreadsheet': ['.ods'], 'text/csv': ['.csv', '.tsv', '.txt'] } }] });
        if(!h) return null; return { file: await h.getFile(), handle: h }; }catch(err){ if(err && err.name === 'AbortError') return null; }
    }
    const f = await pickFile('.xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt'); return f ? { file: f, handle: null } : null;
  }
  A.pickLinked = pickLinked;
  async function handleFile(h, ask){ try{ let p = h.queryPermission ? await h.queryPermission({ mode: 'read' }) : 'granted'; if(p !== 'granted' && ask && h.requestPermission) p = await h.requestPermission({ mode: 'read' }); if(p !== 'granted') return null; return await h.getFile(); }catch(_){ return null; } }
  // nguồn dữ liệu là đường link (Google Sheets chia sẻ công khai, file CSV / XLSX trên mạng) — cập nhật được cả trên iPhone / iPad
  function sheetUrl(u){ u = String(u || '').trim(); const m = /docs\.google\.com\/spreadsheets\/d\/([^/?#]+)/.exec(u); if(m && !/[?&](output|format)=/.test(u)){ const g = /[#&?]gid=(\d+)/.exec(u); return 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv' + (g ? '&gid=' + g[1] : ''); } return u; }
  A.sheetUrl = sheetUrl;
  const hashStr = t => { let h = 2166136261; for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  async function readUrl(url){
    const r = await fetch(sheetUrl(url), { cache: 'no-store' }); if(!r.ok) throw new Error('HTTP ' + r.status); const ct = r.headers.get('content-type') || ''; const buf = new Uint8Array(await r.arrayBuffer());
    const isX = /spreadsheetml|ms-excel|opendocument/.test(ct) || /\.(xlsx|xls|ods)(\?|$)/i.test(url) || /format=xlsx|output=xlsx/.test(url) || (buf[0] === 0x50 && buf[1] === 0x4b);
    let hs = 0; for(let i = 0; i < buf.length; i += Math.max(1, buf.length >> 12)) hs = (hs * 31 + buf[i]) >>> 0;
    const book = await readTableFile(new File([buf], isX ? 'link.xlsx' : 'link.csv')); book.hash = buf.length + ':' + hs.toString(36); return book;
  }
  A.readUrl = readUrl;
  async function dataLink(fromUrl){
    let pk = null, f = null, book, url = null;
    if(fromUrl){ const r = await A.getStr('Đường link Google Sheets (chia sẻ “Bất kỳ ai có liên kết”) hoặc file CSV / XLSX', {}); url = String(r.str || '').trim(); if(!url) return; if(!/^https?:\/\//i.test(url)){ say('Đường link phải bắt đầu bằng http:// hoặc https://'); return; }
      try{ log('Đang tải ' + url + '…'); book = await readUrl(url); }catch(err){ console.error(err); say('Không tải được dữ liệu từ link (' + err.message + '). Kiểm tra quyền chia sẻ của trang tính.'); return; }
      f = { name: /docs\.google\.com/.test(url) ? 'Google Sheets' : decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || 'link'), lastModified: 0 }; }
    else { pk = await pickLinked(); if(!pk) return; f = pk.file;
      try{ log('Đang đọc ' + f.name + '…'); book = await readTableFile(f); }catch(err){ console.error(err); say('Không đọc được file: ' + err.message); return; } }
    const th0 = (A.dimTxt ? A.dimTxt() : 2.5);
    const o = await new Promise(res => {
      A.dialog({ title: 'Liên kết dữ liệu (Data Link) — ' + esc(f.name), wide: true, okText: 'Chèn bảng', html:
        '<label class="dvd-frow"><span>Trang tính</span><span class="v"><select id="dlS">' + book.names.map(n => '<option>' + esc(n) + '</option>').join('') + '</select></span></label>' +
        '<label class="dvd-frow"><span>Vùng ô (vd A1:F20, trống = toàn bộ)</span><span class="v"><input id="dlR" style="width:120px"></span></label>' +
        '<label class="dvd-frow"><span>Cao chữ</span><span class="v"><input id="dlTh" value="' + (+th0.toPrecision(3)) + '" style="width:80px"></span></label>' +
        '<label class="dvd-frow"><span>Hàng đầu là tên cột</span><span class="v"><input type="checkbox" id="dlH" checked></span></label>' +
        '<label class="dvd-frow"><span>Thêm hàng tiêu đề</span><span class="v"><input id="dlT" placeholder="(bỏ trống = không)" style="width:200px"></span></label>' +
        '<div style="font-size:12px;color:#aab3c0;margin:6px 0 3px">Xem trước:</div><div class="lm-tbl" style="max-height:220px"><table id="dlP"></table></div>',
        onOpen: root => { root.addEventListener('keydown', e => e.stopPropagation(), true); const pv = () => { const rows = cutRange(book.sheets[root.querySelector('#dlS').value] || [], root.querySelector('#dlR').value); root.querySelector('#dlP').innerHTML = rows.slice(0, 30).map((r, i) => '<tr>' + r.map(v => (i === 0 && root.querySelector('#dlH').checked ? '<th>' : '<td>') + esc(v)).join('') + '</tr>').join('') + (rows.length > 30 ? '<tr><td colspan="99">… ' + rows.length + ' hàng</td></tr>' : ''); };
          ['#dlS', '#dlR', '#dlH'].forEach(id => { root.querySelector(id).addEventListener('change', pv); root.querySelector(id).addEventListener('input', pv); }); pv(); },
        ok: root => { const sheet = root.querySelector('#dlS').value, range = root.querySelector('#dlR').value.trim(); const th = parseFloat(String(root.querySelector('#dlTh').value).replace(',', '.')); const tt = root.querySelector('#dlT').value.trim();
          res({ sheet, range, th: th > 0 ? th : th0, head: root.querySelector('#dlH').checked, title: !!tt, titleText: tt }); },
        cancel: () => res(null) });
    });
    if(!o) return;
    const rows = cutRange(book.sheets[o.sheet] || [], o.range); if(!rows.length){ say('Vùng dữ liệu trống.'); return; }
    const T = tableDefFrom(rows, o); T.link = { file: f.name, sheet: o.sheet, range: o.range, t: Date.now(), mt: f.lastModified || 0 }; if(url){ T.link.url = url; T.link.h = book.hash; } if(pk && pk.handle){ T.link.id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await hPut(T.link.id, pk.handle); }
    const r = await A.getPoint('Chỉ định điểm chèn (góc trên trái của bảng)', { rubber: false, preview: (g, p) => { const t2 = deep(T); t2.o = p; g.ents(A.tblRegenFrom({ tbld: t2 })); } }); if(!r.pt) return;
    T.o = { x: r.pt.x, y: r.pt.y }; const ents = tableEnts(T, A.newGroupId('T'));
    A.commit({ add: ents }, 'DATALINK: chèn bảng ' + T.cells.length + '×' + T.cw.length + ' từ ' + f.name + (o.sheet !== 'CSV' ? ' [' + o.sheet + ']' : ''));
  }
  cmd(['DATALINK', 'DL', 'TABLEIMPORT', 'NHAPBANG'], 'Chèn bảng liên kết từ Excel (.xlsx/.xls/.ods) hoặc CSV — chọn trang tính, vùng ô', () => dataLink());
  cmd(['DATALINKURL', 'DLURL', 'NHAPBANGLINK'], 'Chèn bảng liên kết từ đường link Google Sheets / CSV / XLSX trên mạng (tự cập nhật, dùng được trên iPhone)', () => dataLink(true));
  const carrierOf = e => { if(!e) return null; if(e.tbld) return e; if(e.grp && e.blk === '*TABLE') return modelEntities.find(x => x.grp === e.grp && x.tbld) || null; return null; };
  A.tableCarrierOf = carrierOf;
  function updateLinked(c, book, mt, hash){
    const T = c.tbld, L = T.link; if(!L) return false; const rows = cutRange(book.sheets[L.sheet] || book.sheets[book.names[0]] || [], L.range); if(!rows.length) return false;
    const N = deep(T); const off = T.title ? 1 : 0; const nc = Math.max(1, ...rows.map(r => r.length));
    N.cells = (T.title ? [T.cells[0].slice(0, 1).concat(Array(nc - 1).fill(''))] : []).concat(rows.map(r => { const a = r.map(v => String(v).trim()); while(a.length < nc) a.push(''); return a; }));
    while(N.cw.length < nc) N.cw.push(N.cw[N.cw.length - 1] || T.th * 8); N.cw.length = nc;
    while(N.rh.length < N.cells.length) N.rh.push(N.rh[N.rh.length - 1] || T.th * 2.2); N.rh.length = N.cells.length;
    N.link = Object.assign({}, L, { t: Date.now() }); if(mt) N.link.mt = mt; if(hash) N.link.h = hash; const w = copy(c); w.tbld = N; return [c, w];
  }
  A.dataLinkUpdate = async (book, list, mt, hash) => { const rep = []; for(const c of list){ const r = updateLinked(c, book, mt, hash); if(r) rep.push(r); } if(rep.length) A.commit({ rep }, 'Đã cập nhật ' + rep.length + ' bảng liên kết'); return rep.length; };
  cmd(['DATALINKUPDATE', 'DLU'], 'Cập nhật bảng liên kết từ file Excel / CSV đã sửa', async () => {
    const linked = modelEntities.filter(e => e.tbld && e.tbld.link); if(!linked.length){ say('Bản vẽ không có bảng liên kết dữ liệu (tạo bằng DATALINK).'); return; }
    // 0) bảng liên kết đường link: tải lại
    let nUrl = 0; const urls = new Map(); for(const e of linked) if(e.tbld.link.url){ const a = urls.get(e.tbld.link.url) || []; a.push(e); urls.set(e.tbld.link.url, a); }
    for(const [u, list] of urls){ try{ const book = await readUrl(u); nUrl += await A.dataLinkUpdate(book, list.filter(e => modelEntities.includes(e)), 0, book.hash); }catch(err){ log('Không tải được ' + u + ': ' + err.message); } }
    if(urls.size){ const rest0 = linked.filter(e => !e.tbld.link.url); if(!rest0.length){ say(nUrl ? 'Đã cập nhật ' + nUrl + ' bảng từ đường link' : 'Không cập nhật được bảng nào'); return; } linked.length = 0; linked.push(...rest0.map(e => modelEntities.find(x => x === e) || e)); }
    // 1) bảng có tay cầm file: tự đọc lại file gốc
    const byId = new Map(); for(const e of linked) if(e.tbld.link.id){ const a = byId.get(e.tbld.link.id) || []; a.push(e); byId.set(e.tbld.link.id, a); }
    let nAuto = 0; const left = new Set(linked);
    for(const [id, list] of byId){ const h = await hGet(id); if(!h) continue; const f = await handleFile(h, true); if(!f) continue; let book; try{ book = await readTableFile(f); }catch(_){ continue; }
      const n = await A.dataLinkUpdate(book, list.filter(e => modelEntities.includes(e)), f.lastModified); nAuto += n; for(const e of list) left.delete(e); }
    if(nAuto) log('Đã đọc lại file gốc và cập nhật ' + nAuto + ' bảng.');
    const rest = linked.filter(e => left.has(e) && modelEntities.includes(e)); if(!rest.length){ say(nAuto ? 'Đã cập nhật ' + nAuto + ' bảng từ file gốc' : 'Không có bảng nào cần cập nhật'); return; }
    const files = [...new Set(rest.map(e => e.tbld.link.file))]; log('Bảng liên kết tới: ' + files.join(', ') + ' — chọn lại file để cập nhật.');
    const pk = await pickLinked(); if(!pk) return; const f = pk.file; let book; try{ book = await readTableFile(f); }catch(err){ say('Không đọc được file.'); return; }
    if(pk.handle){ const id = 'L' + Date.now().toString(36); await hPut(id, pk.handle); for(const e of rest) if(e.tbld.link.file === f.name) e.tbld.link.id = id; }
    const linked2 = rest;
    let list = linked2.filter(e => e.tbld.link.file === f.name); if(!list.length){ if(!confirm('Không có bảng nào liên kết tới "' + f.name + '". Cập nhật mọi bảng liên kết bằng file này?')) return; list = linked2; }
    const n = await A.dataLinkUpdate(book, list, f.lastModified); say(n ? 'Đã cập nhật ' + n + ' bảng' : 'Không cập nhật được bảng nào');
  });
  // như AutoCAD: báo khi file Excel liên kết đã đổi (kiểm tra khi quay lại cửa sổ)
  let chkBusy = false, lastNote = 0, lastUrlChk = 0;
  async function checkLinks(){
    if(chkBusy || document.hidden) return 0; chkBusy = true; let changed = 0;
    try{ const seen = new Set(); if(Date.now() - lastUrlChk > 60000 || A._forceLinkChk){ lastUrlChk = Date.now(); for(const e of modelEntities){ const L = e.tbld && e.tbld.link; if(!L || !L.url || seen.has(L.url)) continue; seen.add(L.url); try{ const b = await readUrl(L.url); if(L.h && b.hash !== L.h) changed++; }catch(_){} } }
      for(const e of modelEntities){ const L = e.tbld && e.tbld.link; if(!L || !L.id || seen.has(L.id)) continue; seen.add(L.id); const h = await hGet(L.id); if(!h) continue; const f = await handleFile(h, false); if(f && f.lastModified && L.mt && f.lastModified > L.mt + 500) changed++; } }catch(_){} finally { chkBusy = false; }
    if(changed && Date.now() - lastNote > 4000){ lastNote = Date.now(); showLinkNote(changed); } return changed; }
  A.checkLinks = checkLinks;
  function showLinkNote(n){ let el = document.getElementById('dvdLinkNote'); if(!el){ el = document.createElement('div'); el.id = 'dvdLinkNote'; el.style.cssText = 'position:fixed;right:16px;bottom:48px;z-index:40;background:#2b313b;color:#e6eaf0;border:1px solid #4a5363;border-left:4px solid #f5b400;border-radius:6px;padding:10px 12px;font:13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:320px'; document.body.appendChild(el); }
    el.innerHTML = '<b>Liên kết dữ liệu đã thay đổi</b><div style="margin:4px 0 8px;opacity:.85">' + n + ' file Excel/CSV liên kết vừa được sửa.</div><button type="button" class="btn-ok" style="padding:4px 10px">Cập nhật bảng</button> <button type="button" class="btn-ghost" style="padding:4px 10px">Để sau</button>';
    const [b1, b2] = el.querySelectorAll('button'); b1.onclick = () => { el.remove(); DVDCmd.run('DATALINKUPDATE'); }; b2.onclick = () => el.remove(); }
  window.addEventListener('focus', () => setTimeout(checkLinks, 300)); document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(checkLinks, 300); });
  function tableRows(c){ return c.tbld.cells.map(r => r.map(v => String(v == null ? '' : v))); }
  A.tableCSV = c => '﻿' + tableRows(c).map(r => r.map(v => /[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(',')).join('\r\n');
  cmd(['TABLEEXPORT', 'XUATBANG'], 'Xuất bảng ra CSV / Excel (.xlsx)', async () => {
    const r = await A.getEnt('Chọn bảng cần xuất', { filter: e => !!carrierOf(e) }); const c = carrierOf(r.ent); if(!c) return;
    const k = await A.getKw('Định dạng', { kw: [{ k: 'C', t: 'CSV' }, { k: 'X', t: 'Excel xlsx' }], def: 'CSV' });
    if(k.kw === 'X'){ try{ const X = await loadXLSX(); const ws = X.utils.aoa_to_sheet(tableRows(c)); ws['!cols'] = c.tbld.cw.map(w => ({ wch: Math.max(6, Math.round(w / c.tbld.th * 1.4)) })); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Bang'); const out = X.write(wb, { type: 'array', bookType: 'xlsx' }); saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), baseName() + '_bang.xlsx'); log('Đã xuất bảng ' + c.tbld.cells.length + ' hàng ra Excel.'); }catch(err){ console.error(err); say('Không xuất được Excel: ' + err.message); } return; }
    saveBlob(new Blob([A.tableCSV(c)], { type: 'text/csv;charset=utf-8' }), baseName() + '_bang.csv'); log('Đã xuất bảng ' + c.tbld.cells.length + ' hàng ra CSV.');
  });

  /* =====================================================================
     3) REGION — vùng 2D + phép cộng / trừ / giao (thư viện polygon-clipping)
     ===================================================================== */
  let pcP = null;
  function loadPC(){ if(window.polygonClipping) return Promise.resolve(window.polygonClipping); if(pcP) return pcP;
    pcP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = './vendor/polyclip/polygon-clipping.umd.min.js'; s.onload = () => window.polygonClipping ? res(window.polygonClipping) : rej(new Error('polyclip')); s.onerror = () => { pcP = null; rej(new Error('Không tải được thư viện phép toán vùng')); }; document.head.appendChild(s); });
    return pcP; }
  const isRgn = e => !!(e && e.rgn && e.type === 'POLYLINE');
  // đường cong → đa tuyến có bulge (mở hoặc kín)
  function bulgePoly(e){
    if(e.type === 'POLYLINE') return { v: VB(e).map(p => ({ x: p.x, y: p.y, bulge: p.bulge || 0 })), closed: !!e.closed };
    if(e.type === 'CIRCLE') return { v: [{ x: e.cx + e.r, y: e.cy, bulge: 1 }, { x: e.cx - e.r, y: e.cy, bulge: 1 }], closed: true };
    const c = G.curveOf(e); if(!c || !c.pieces || !c.pieces.length) return null; const v = [];
    for(const p of c.pieces){ if(p.t === 's') v.push({ x: p.ax, y: p.ay, bulge: 0 });
      else if(p.t === 'a'){ const n = Math.abs(p.sw) > Math.PI * 1.5 ? 2 : 1; for(let k = 0; k < n; k++){ const a = p.a0 + p.sw * k / n; v.push({ x: p.cx + p.r * Math.cos(a), y: p.cy + p.r * Math.sin(a), bulge: Math.tan(p.sw / n / 4) }); } } }
    const L = c.pieces[c.pieces.length - 1]; if(!c.closed){ if(L.t === 's') v.push({ x: L.bx, y: L.by, bulge: 0 }); else { const a = L.a0 + L.sw; v.push({ x: L.cx + L.r * Math.cos(a), y: L.cy + L.r * Math.sin(a), bulge: 0 }); } }
    return { v, closed: !!c.closed };
  }
  function revPoly(v){ const n = v.length; const o = []; for(let i = n - 1; i >= 0; i--) o.push({ x: v[i].x, y: v[i].y, bulge: i > 0 ? -(v[i - 1].bulge || 0) : 0 }); return o; }
  // nối các đường hở đầu-cuối thành vòng kín
  function chainLoops(items, tol){
    const loops = [], open = items.slice(); const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
    while(open.length){ let cur = open.shift().slice(); let grown = true;
      while(grown && !same(cur[0], cur[cur.length - 1])){ grown = false;
        for(let i = 0; i < open.length; i++){ const o = open[i]; const end = cur[cur.length - 1];
          if(same(end, o[0])){ cur[cur.length - 1].bulge = cur[cur.length - 1].bulge || 0; cur = cur.slice(0, -1).concat([Object.assign({}, end, { bulge: o[0].bulge || 0 })]).concat(o.slice(1)); open.splice(i, 1); grown = true; break; }
          if(same(end, o[o.length - 1])){ const r = revPoly(o); cur = cur.slice(0, -1).concat([Object.assign({}, end, { bulge: r[0].bulge || 0 })]).concat(r.slice(1)); open.splice(i, 1); grown = true; break; } } }
      if(cur.length >= 3 && same(cur[0], cur[cur.length - 1])){ cur.pop(); loops.push(cur); } }
    return loops;
  }
  const VB = e => (A.bvOf && A.bvOf(e)) || e.vertices;
  A.plVB = VB;
  function rgnEnt(v, props){ const e = Object.assign({ type: 'POLYLINE', vertices: [], closed: true, rgn: 1 }, props); A.setBV(e, v); return e; }
  function makeRegions(sel){
    const closed = [], opens = [], used = []; let span = 1;
    for(const e of sel){ if(isRgn(e)) continue; const b = bulgePoly(e); if(!b || b.v.length < 2) continue; const bb = entBBox(e); if(bb) span = Math.max(span, bb.x1 - bb.x0, bb.y1 - bb.y0);
      if(b.closed){ if(b.v.length >= 2){ closed.push(b.v); used.push(e); } } else { opens.push({ v: b.v, e }); } }
    const tol = span * 1e-7 + 1e-9; const lp = chainLoops(opens.map(o => o.v), tol * 100);
    if(lp.length) for(const o of opens) used.push(o.e);
    return { loops: closed.concat(lp), used: lp.length ? used : used.filter(e => !opens.some(o => o.e === e)) };
  }
  cmd(['REGION', 'REG', 'VUNG'], 'Tạo vùng 2D (region) từ đường kín hoặc các nét nối kín (đa tuyến, tròn, elip, đoạn + cung)', async () => {
    const s = await A.getSel('Chọn đối tượng tạo vùng', { filter: e => /^(LINE|ARC|CIRCLE|POLYLINE|ELLIPSE|SPLINE)$/.test(e.type) && !isRgn(e) && !e.grp }); const sel = (s.sel || []).filter(e => !A.isLocked(e)); if(!sel.length) return;
    const { loops, used } = makeRegions(sel); if(!loops.length){ log('Không có vòng kín nào — 0 vùng được tạo.'); return; }
    const pr = { layer: used[0].layer || '0', col: used[0].col }; if(used[0].bl) pr.bl = 1;
    const add = loops.map(v => rgnEnt(v, pr)); A.commit({ add, del: used }, 'Đã tạo ' + add.length + ' vùng (region)'); log(add.length + ' vòng → ' + add.length + ' vùng.');
  });
  // vùng → tập vòng (mỗi vùng = 1 đa tuyến kín hoặc 1 nhóm *REGION gồm biên ngoài + lỗ)
  function regionsOf(sel){ const seen = new Set(), out = []; for(const e of sel){ if(!isRgn(e)) continue; if(e.grp && e.blk === '*REGION'){ if(seen.has(e.grp)) continue; seen.add(e.grp); out.push(modelEntities.filter(x => x.grp === e.grp && isRgn(x))); } else out.push([e]); } return out; }
  A.regionsOf = regionsOf;
  function sampleLoop(v, stepDeg){ const o = []; for(let i = 0; i < v.length; i++){ const a = v[i], b = v[(i + 1) % v.length]; o.push([a.x, a.y]); if(a.bulge){ const sw = 4 * Math.atan(a.bulge); const n = Math.max(2, Math.ceil(Math.abs(sw) / ((stepDeg || 2.5) * D2R))); const pts = arcPts(a, b, a.bulge, n); for(let j = 1; j < pts.length - 1; j++) o.push([pts[j].x, pts[j].y]); } } o.push(o[0].slice()); return o; }
  function arcInfo(a, b, bulge){ const ch = Math.hypot(b.x - a.x, b.y - a.y); const th = 4 * Math.atan(bulge); const r = ch / (2 * Math.sin(th / 2)); const ux = (b.x - a.x) / ch, uy = (b.y - a.y) / ch; const d = r * Math.cos(th / 2); return { cx: (a.x + b.x) / 2 - uy * d, cy: (a.y + b.y) / 2 + ux * d, r: Math.abs(r), th }; }
  function arcPts(a, b, bulge, n){ const I = arcInfo(a, b, bulge); const a0 = Math.atan2(a.y - I.cy, a.x - I.cx); const o = []; for(let i = 0; i <= n; i++){ const t = a0 + I.th * i / n; o.push({ x: I.cx + I.r * Math.cos(t), y: I.cy + I.r * Math.sin(t) }); } return o; }
  const geomOf = (PC, ents) => { let g = null; for(const e of ents){ const ring = sampleLoop(VB(e)); const p = [[ring]]; g = g ? PC.xor(g, p) : p; } return g || []; };
  // dựng lại cung từ các điểm mẫu nằm trên đường tròn gốc
  function refit(ring, circles){
    const v = ring.slice(0, -1).map(p => ({ x: p[0], y: p[1], bulge: 0 })); const n = v.length; if(n < 3 || !circles.length) return v;
    const onC = (p, c) => Math.abs(Math.hypot(p.x - c.cx, p.y - c.cy) - c.r) <= c.r * 2.5e-3 + 1e-9;
    const cid = v.map(p => circles.findIndex(c => onC(p, c)));
    // bắt đầu tại điểm không thuộc dải cung (hoặc điểm 0)
    let st = 0; for(let i = 0; i < n; i++){ const pv = (i - 1 + n) % n; if(cid[i] < 0 || cid[pv] !== cid[i]){ st = i; break; } }
    const out = []; let i = 0;
    while(i < n){ const k = (st + i) % n; const c = cid[k];
      if(c >= 0){ let j = i; while(j + 1 < n + 1 && cid[(st + j + 1) % n] === c && j + 1 - i < n) j++;
        if(j - i >= 2){ const C = circles[c]; const pts = []; for(let q = i; q <= j; q++) pts.push(v[(st + q) % n]); let sw = 0; for(let q = 1; q < pts.length; q++){ let d = Math.atan2(pts[q].y - C.cy, pts[q].x - C.cx) - Math.atan2(pts[q - 1].y - C.cy, pts[q - 1].x - C.cx); while(d > Math.PI) d -= TAU; while(d < -Math.PI) d += TAU; sw += d; }
          const full = j - i + 1 >= n; const segs = Math.abs(sw) > Math.PI * 1.2 ? (Math.abs(sw) > Math.PI * 2.4 ? 3 : 2) : 1;
          if(full){ const a0 = Math.atan2(pts[0].y - C.cy, pts[0].x - C.cx); const tot = sw >= 0 ? TAU : -TAU; return [0, 1].map(m => ({ x: C.cx + C.r * Math.cos(a0 + tot * m / 2), y: C.cy + C.r * Math.sin(a0 + tot * m / 2), bulge: Math.tan(tot / 8) })); }
          for(let m = 0; m < segs; m++){ const idx = Math.round((pts.length - 1) * m / segs), idx2 = Math.round((pts.length - 1) * (m + 1) / segs); let s2 = 0; for(let q = idx + 1; q <= idx2; q++){ let d = Math.atan2(pts[q].y - C.cy, pts[q].x - C.cx) - Math.atan2(pts[q - 1].y - C.cy, pts[q - 1].x - C.cx); while(d > Math.PI) d -= TAU; while(d < -Math.PI) d += TAU; s2 += d; } out.push({ x: pts[idx].x, y: pts[idx].y, bulge: Math.tan(s2 / 4) }); }
          i = j; continue; } }
      out.push({ x: v[k].x, y: v[k].y, bulge: 0 }); i++; }
    // bỏ điểm thẳng hàng thừa
    return out.filter((p, k) => { if(p.bulge) return true; const a = out[(k - 1 + out.length) % out.length], b = out[(k + 1) % out.length]; if(a.bulge) return true; const cr = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x); return Math.abs(cr) > 1e-9 * Math.max(1, Math.hypot(b.x - a.x, b.y - a.y) ** 2); });
  }
  function circlesOf(ents){ const C = []; for(const e of ents){ const v = VB(e); for(let i = 0; i < v.length; i++){ if(!v[i].bulge) continue; const b = v[(i + 1) % v.length]; const I = arcInfo(v[i], b, v[i].bulge); if(!C.some(c => Math.hypot(c.cx - I.cx, c.cy - I.cy) < I.r * 1e-6 && Math.abs(c.r - I.r) < I.r * 1e-6)) C.push(I); } } return C; }
  function resultEnts(mp, props, circles){
    const add = []; let n = 0;
    for(const poly of mp){ const ents = poly.map(ring => rgnEnt(refit(ring, circles), props)).filter(e => e.vertices.length >= 2); if(!ents.length) continue; n++;
      if(ents.length > 1){ const gid = A.newGroupId('R'); for(const e of ents){ e.grp = gid; e.blk = '*REGION'; } } add.push(...ents); }
    return { add, n };
  }
  async function regionBool(op, A1, B1){
    const PC = await loadPC(); const all = A1.flat().concat(B1.flat()); const circles = circlesOf(all);
    const ga = A1.map(r => geomOf(PC, r)), gb = B1.map(r => geomOf(PC, r)); let res;
    if(op === 'union') res = PC.union(...ga.concat(gb));
    else if(op === 'int') res = PC.intersection(...ga.concat(gb));
    else { const base = ga.length > 1 ? PC.union(...ga) : ga[0]; res = gb.length ? PC.difference(base, ...gb) : base; }
    const f = all[0]; const props = { layer: f.layer || '0', col: f.col }; if(f.bl) props.bl = 1;
    const out = resultEnts(res, props, circles); A.commit({ add: out.add, del: all }, (op === 'union' ? 'Đã cộng ' : op === 'int' ? 'Đã lấy giao ' : 'Đã trừ ') + 'vùng → ' + out.n + ' vùng'); return out;
  }
  A.regionBool = regionBool;
  // thay UNION / SUBTRACT / INTERSECT: vùng 2D → tính 2D; khối 3D → chuyển cho lệnh 3D gốc
  const is3D = e => e && e.type === 'SOLID3D';
  const orig = {}; for(const k of ['UNION', 'SUBTRACT', 'INTERSECT', 'MASSPROP']){ const c = DVDCmd.commands.find(x => x.k[0] === k); if(c) orig[k] = c; }
  for(const k of Object.keys(orig)) DVDCmd.register([k + '3D'], orig[k].d, orig[k].run, { engine: true });
  const busyRun = fn => { log('Đang tính…'); return new Promise(res => setTimeout(() => { let r = null; try{ r = fn(); }catch(err){ console.error(err); log('Lỗi khi tính khối: ' + (err && err.message || err)); } res(r); }, 20)); };
  async function solidBool(op, a, b){ const C = A.csg; if(!C) return;
    if(op === 'union'){ if(a.length < 2){ log('Cần chọn ít nhất 2 khối.'); return; } const r = await busyRun(() => C.boolean('union', [a[0]], a.slice(1))); if(!r){ log('Không cộng được các khối này.'); return; } A.commit({ add: [r], del: a }, 'Đã cộng ' + a.length + ' khối'); return; }
    if(op === 'int'){ if(a.length < 2){ log('Cần chọn ít nhất 2 khối.'); return; } const r = await busyRun(() => C.boolean('int', [a[0]], a.slice(1))); if(!r){ log('Các khối không giao nhau.'); return; } A.commit({ add: [r], del: a }, 'Đã lấy phần giao'); return; }
    const base = a.length > 1 ? await busyRun(() => C.boolean('union', [a[0]], a.slice(1))) : a[0]; if(!base) return;
    const r = await busyRun(() => C.boolean('sub', [base], b)); if(!r){ A.commit({ del: a.concat(b) }, 'Đã trừ khối'); log('Kết quả rỗng — khối trừ bao trùm hết khối gốc.'); return; } A.commit({ add: [r], del: a.concat(b) }, 'Đã trừ khối'); }
  const hand3D = (k, sel) => { setTimeout(() => { try{ selEnts.clear(); for(const e of sel) selEnts.add(e); }catch(_){} DVDCmd.run(k + '3D'); }, 30); };
  cmd(['UNION', 'UNI'], 'Cộng vùng 2D (region) hoặc khối 3D thành một', async () => {
    const s = await A.getSel('Chọn vùng / khối cần cộng', { filter: e => isRgn(e) || is3D(e) }); const sel = (s.sel || []).filter(e => !A.isLocked(e));
    const R = regionsOf(sel); if(R.length){ if(R.length < 2){ log('Cần chọn ít nhất 2 vùng.'); return; } await regionBool('union', R, []); return; }
    const S = sel.filter(is3D); if(S.length) await solidBool('union', S);
  });
  cmd(['SUBTRACT', 'SU'], 'Trừ vùng 2D (region) hoặc khối 3D', async () => {
    const s = await A.getSel('Chọn vùng / khối bị trừ (giữ lại)', { filter: e => isRgn(e) || is3D(e) }); const sel = (s.sel || []).filter(e => !A.isLocked(e));
    const R = regionsOf(sel); if(R.length){ const s2 = await A.getSel('Chọn vùng dùng để trừ (sẽ mất)', { filter: isRgn, pre: false }); const sel2 = new Set((s2.sel || []).filter(e => !sel.includes(e))); const R2 = regionsOf([...sel2]); if(!R2.length){ log('Chưa chọn vùng để trừ.'); return; } await regionBool('sub', R, R2); return; }
    const S = sel.filter(is3D); if(!S.length) return; const s2 = await A.getSel('Chọn khối dùng để trừ (sẽ mất)', { filter: is3D, pre: false }); const B = (s2.sel || []).filter(e => is3D(e) && !S.includes(e) && !A.isLocked(e)); if(!B.length){ log('Chưa chọn khối để trừ.'); return; } await solidBool('sub', S, B);
  });
  cmd(['INTERSECT', 'IN'], 'Lấy phần giao của các vùng 2D (region) hoặc khối 3D', async () => {
    const s = await A.getSel('Chọn các vùng / khối', { filter: e => isRgn(e) || is3D(e) }); const sel = (s.sel || []).filter(e => !A.isLocked(e));
    const R = regionsOf(sel); if(R.length){ if(R.length < 2){ log('Cần chọn ít nhất 2 vùng.'); return; } const o = await regionBool('int', R, []); if(!o.n) log('Các vùng không giao nhau.'); return; }
    const S = sel.filter(is3D); if(S.length) await solidBool('int', S);
  });
  // tính chất hình học của vùng (diện tích, chu vi, trọng tâm, mô men quán tính)
  function regionProps(ents){
    let Ar = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0, Ixy = 0, P = 0; let bb = null;
    for(const e of ents){ const r = sampleLoop(VB(e), 0.1); for(let i = 0; i < r.length - 1; i++){ const [x0, y0] = r[i], [x1, y1] = r[i + 1]; const c = x0 * y1 - x1 * y0; Ar += c / 2; Sx += (x0 + x1) * c / 6; Sy += (y0 + y1) * c / 6; Iyy += (x0 * x0 + x0 * x1 + x1 * x1) * c / 12; Ixx += (y0 * y0 + y0 * y1 + y1 * y1) * c / 12; Ixy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * c / 24; }
      const v = VB(e); for(let i = 0; i < v.length; i++){ const a = v[i], b = v[(i + 1) % v.length]; if(a.bulge){ const I = arcInfo(a, b, a.bulge); P += Math.abs(I.th) * I.r; } else P += Math.hypot(b.x - a.x, b.y - a.y); }
      const b = entBBox(e); if(b) bb = bb ? { x0: Math.min(bb.x0, b.x0), y0: Math.min(bb.y0, b.y0), x1: Math.max(bb.x1, b.x1), y1: Math.max(bb.y1, b.y1) } : b; }
    // hướng các vòng có thể ngược nhau: chuẩn hoá bằng dấu tổng (vòng lỗ được xử lý qua XOR khi tạo — ở đây cộng có dấu theo chiều)
    const sg = Ar < 0 ? -1 : 1; Ar *= sg; Sx *= sg; Sy *= sg; Ixx *= sg; Iyy *= sg; Ixy *= sg;
    const cx = Ar ? Sx / Ar : 0, cy = Ar ? Sy / Ar : 0;
    return { area: Ar, perim: P, cx, cy, bb, Ixx, Iyy, Ixy, Icx: Ixx - Ar * cy * cy, Icy: Iyy - Ar * cx * cx, Icxy: Ixy - Ar * cx * cy };
  }
  function regionPropsGroup(ents){ // xử lý lỗ: diện tích lỗ trừ đi bất kể chiều vẽ
    if(ents.length === 1) return regionProps(ents);
    const parts = ents.map(e => ({ e, p: regionProps([e]) })); parts.sort((a, b) => b.p.area - a.p.area);
    const outer = parts[0]; const R = Object.assign({}, outer.p); R.bb = outer.p.bb;
    for(const h of parts.slice(1)){ for(const k of ['area', 'Ixx', 'Iyy', 'Ixy']) R[k] -= h.p[k]; R.perim += h.p.perim; }
    const Sx = outer.p.cx * outer.p.area - parts.slice(1).reduce((s, h) => s + h.p.cx * h.p.area, 0), Sy = outer.p.cy * outer.p.area - parts.slice(1).reduce((s, h) => s + h.p.cy * h.p.area, 0);
    R.cx = Sx / R.area; R.cy = Sy / R.area; R.Icx = R.Ixx - R.area * R.cy * R.cy; R.Icy = R.Iyy - R.area * R.cx * R.cx; R.Icxy = R.Ixy - R.area * R.cx * R.cy; return R;
  }
  A.regionProps = regionPropsGroup;
  cmd(['MASSPROP', 'MP', 'TINHKHOI'], 'Tính chất vùng 2D (diện tích, chu vi, trọng tâm, mô men quán tính) hoặc khối 3D (thể tích, khối lượng)', async () => {
    const s = await A.getSel('Chọn vùng / khối', { filter: e => isRgn(e) || is3D(e) }); const sel = s.sel || [];
    const R = regionsOf(sel); if(!R.length){ const S = sel.filter(is3D); if(S.length) hand3D('MASSPROP', S); return; }
    let html = '', tA = 0; const f = v => fmtN(v);
    R.forEach((ents, i) => { const p = regionPropsGroup(ents); tA += p.area; const rg = v => Math.sqrt(Math.abs(v) / p.area);
      html += '<div class="pl-sec">Vùng ' + (i + 1) + (ents.length > 1 ? ' (' + (ents.length - 1) + ' lỗ)' : '') + '</div><table style="width:100%;font-size:12px;border-collapse:collapse" cellpadding="3">' +
        [['Diện tích', f(p.area)], ['Chu vi', f(p.perim)], ['Hộp bao', 'X: ' + f(p.bb.x0) + ' — ' + f(p.bb.x1) + ' · Y: ' + f(p.bb.y0) + ' — ' + f(p.bb.y1)], ['Trọng tâm', 'X: ' + f(p.cx) + ' · Y: ' + f(p.cy)], ['Mô men quán tính (gốc toạ độ)', 'X: ' + f(p.Ixx) + ' · Y: ' + f(p.Iyy)], ['Tích quán tính', 'XY: ' + f(p.Ixy)], ['Mô men quán tính qua trọng tâm', 'X: ' + f(p.Icx) + ' · Y: ' + f(p.Icy) + ' · XY: ' + f(p.Icxy)], ['Bán kính quán tính', 'X: ' + f(rg(p.Icx)) + ' · Y: ' + f(rg(p.Icy))]].map(([k, v]) => '<tr><td style="opacity:.75">' + k + '</td><td>' + v + '</td></tr>').join('') + '</table>'; A.lastRegion = p; });
    A.dialog({ title: 'Tính chất vùng (MASSPROP — region)', html, wide: true, noCancel: true, okText: 'Đóng' });
    log('MASSPROP: ' + R.length + ' vùng, tổng diện tích ' + f(tA));
  });
  A.isRegion = isRgn;
  // mở lại DXF do DVDCAD ghi: vùng có lỗ được nhóm lại
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); try{ for(const e of modelEntities) if(e._rgnG){ e.grp = 'RX' + e._rgnG; e.blk = '*REGION'; delete e._rgnG; } }catch(_){} }; })(A.onLoad);

  /* =====================================================================
     4) SNAPANG / SNAP / GRID / ORTHO
     ===================================================================== */
  const SET = A.SET;
  cmd(['SNAPANG', 'GOCLUOI'], 'Xoay lưới, SNAP, ORTHO và POLAR theo một góc (vẽ theo hướng nghiêng của công trình)', async () => {
    const r = await A.getNum('Góc xoay lưới / ortho (độ)', { def: +(SET.snapAng || 0).toFixed(4), kw: [{ k: 'D', t: 'Theo đối tượng' }, { k: 'B', t: 'Điểm gốc' }] });
    if(r.kw === 'D'){ const e = await A.getEnt('Chọn đường thẳng / đoạn đa tuyến làm hướng'); if(!e.ent) return; const c = G.curveOf(e.ent); if(!c) return; const q = G.nearOnCurve(c, e.pt || { x: 0, y: 0 }); let best = null, bd = Infinity; for(const p of c.pieces){ const n = G.nearOnPiece(p, e.pt); const d = Math.hypot(n.x - e.pt.x, n.y - e.pt.y); if(d < bd){ bd = d; best = p; } }
      if(!best || best.t !== 's'){ log('Hãy chọn đoạn thẳng.'); return; } let a = Math.atan2(best.by - best.ay, best.bx - best.ax) * R2D; a = ((a % 180) + 180) % 180; if(a > 90) a -= 180; SET.snapAng = +a.toFixed(6); SET.snapBase = { x: best.ax, y: best.ay }; void q; }
    else if(r.kw === 'B'){ const p = await A.getPoint('Điểm gốc lưới (SNAPBASE)'); if(!p.pt) return; SET.snapBase = { x: p.pt.x, y: p.pt.y }; }
    else if(r.num != null) SET.snapAng = ((r.num % 360) + 360) % 360 > 180 ? ((r.num % 360) + 360) % 360 - 360 : ((r.num % 360) + 360) % 360;
    else return;
    A.saveSet(); try{ draw(); }catch(_){} log('SNAPANG = ' + fmtN(SET.snapAng || 0) + '°' + (SET.snapBase ? ' · gốc ' + fmtN(SET.snapBase.x) + ',' + fmtN(SET.snapBase.y) : ''));
  });
  cmd(['SNAPBASE'], 'Đặt điểm gốc của lưới bước (SNAP)', async () => { const p = await A.getPoint('Điểm gốc lưới <0,0>'); SET.snapBase = p.pt ? { x: p.pt.x, y: p.pt.y } : null; A.saveSet(); try{ draw(); }catch(_){} });
  cmd(['SNAP', 'SN'], 'Bước nhảy con trỏ: Bật / Tắt / khoảng bước / góc xoay', async () => {
    const r = await A.getNum('Khoảng bước SNAP (0 = tự theo lưới)', { def: SET.snapSp || 0, kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }, { k: 'R', t: 'Xoay' }] });
    if(r.kw === 'ON') SET.snap = true; else if(r.kw === 'OFF') SET.snap = false; else if(r.kw === 'R'){ setTimeout(() => DVDCmd.run('SNAPANG'), 0); return; } else if(r.num != null){ SET.snapSp = Math.max(0, r.num); SET.snap = true; } else return;
    A.saveSet(); log('SNAP ' + (SET.snap ? 'bật' : 'tắt') + (SET.snapSp ? ', bước ' + fmtN(SET.snapSp) : ''));
  });
  cmd(['GRID'], 'Lưới nền: Bật / Tắt / khoảng lưới', async () => {
    const r = await A.getNum('Khoảng lưới (0 = tự động)', { def: SET.snapSp || 0, kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }] });
    if(r.kw === 'ON') SET.grid = true; else if(r.kw === 'OFF') SET.grid = false; else if(r.num != null){ SET.snapSp = Math.max(0, r.num); SET.grid = true; } else return; A.saveSet(); try{ draw(); }catch(_){}
  });
  cmd(['ORTHO'], 'Chế độ vuông góc: Bật / Tắt (F8)', async () => { const r = await A.getKw('ORTHO', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OFF', t: 'Tắt' }], def: SET.ortho ? 'Tắt' : 'Bật' }); const on = r.kw ? r.kw === 'ON' : !SET.ortho; if(on !== !!SET.ortho) A.toggle('ortho'); });

  /* =====================================================================
     5) ĐA TUYẾN: menu nắm kéo (thêm / xoá đỉnh, đoạn thẳng ↔ cung)
     ===================================================================== */
  const plv = {
    add(e, i, pt){ const w = copy(e); const V = VB(e).map(p => Object.assign({}, p)); if(V[i]) delete V[i].bulge; V.splice(i + 1, 0, { x: pt.x, y: pt.y }); A.setBV(w, V); A.commit({ rep: [[e, w]] }, 'Đã thêm đỉnh'); return w; },
    del(e, i){ const w = copy(e); const V = VB(e).map(p => Object.assign({}, p)); if(V.length <= (w.closed ? 3 : 2)){ log('Đa tuyến cần ít nhất ' + (w.closed ? 3 : 2) + ' đỉnh.'); return null; } V.splice(i, 1); if(V[i - 1]) delete V[i - 1].bulge; A.setBV(w, V); A.commit({ rep: [[e, w]] }, 'Đã xoá đỉnh'); return w; },
    arc(e, i, pt){ const w = copy(e); const V = VB(e).map(p => Object.assign({}, p)); const a = V[i], b = V[(i + 1) % V.length]; if(!a || !b) return null; a.bulge = G.bulge3(a, pt, b); A.setBV(w, V); A.commit({ rep: [[e, w]] }, 'Đã đổi đoạn thành cung'); return w; },
    line(e, i){ const w = copy(e); const V = VB(e).map(p => Object.assign({}, p)); if(V[i]) delete V[i].bulge; A.setBV(w, V); A.commit({ rep: [[e, w]] }, 'Đã đổi cung thành đoạn thẳng'); return w; }
  };
  A.plVertex = plv;
  function plGripAt(p){
    if(A.busy() || !selEnts.size || selEnts.size > 200) return null; const tol = 7;
    for(const e of selEnts){ if(e.type !== 'POLYLINE' || A.isLocked(e) || e.rgn && e.grp) continue; const v = VB(e); if(!v || v.length > 100) continue;
      for(let i = 0; i < v.length; i++){ const P = toScreen(v[i].x, v[i].y); if(Math.abs(P.x - p.x) <= tol && Math.abs(P.y - p.y) <= tol) return { e, i, kind: 'v' }; }
      const n = e.closed ? v.length : v.length - 1; for(let i = 0; i < n; i++){ const a = v[i], b = v[(i + 1) % v.length]; let m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if(a.bulge){ const pts = arcPts(a, b, a.bulge, 2); m = pts[1]; } const P = toScreen(m.x, m.y); if(Math.abs(P.x - p.x) <= tol && Math.abs(P.y - p.y) <= tol) return { e, i, kind: 'm', m }; } }
    return null;
  }
  A.plGripAt = plGripAt;
  function plGripMenu(h, cx, cy){
    const e = h.e, i = h.i; const items = [{ hd: h.kind === 'v' ? 'Đỉnh ' + (i + 1) + ' của đa tuyến' : 'Đoạn ' + (i + 1) + ' của đa tuyến' }];
    if(h.kind === 'v'){
      items.push({ t: 'Thêm đỉnh', ic: 'PLINE', fn: () => A.run('PLVERTEX', async () => { const v = VB(e); const r = await A.getPoint('Vị trí đỉnh mới (sau đỉnh ' + (i + 1) + ')', { base: v[i], preview: (g, q) => { const nx = v[(i + 1) % v.length]; g.poly([v[i], q].concat(i + 1 < v.length || e.closed ? [nx] : []), false, '#cfe3ff'); } }); if(r.pt) plv.add(e, i, r.pt); }) });
      items.push({ t: 'Xoá đỉnh', ic: 'ERASE', fn: () => plv.del(e, i) });
    } else {
      items.push({ t: 'Thêm đỉnh', ic: 'PLINE', fn: () => A.run('PLVERTEX', async () => { const v = VB(e); const r = await A.getPoint('Vị trí đỉnh mới', { base: v[i], preview: (g, q) => g.poly([v[i], q, v[(i + 1) % v.length]], false, '#cfe3ff') }); if(r.pt) plv.add(e, i, r.pt); }) });
      if(VB(e)[i].bulge) items.push({ t: 'Đổi thành đoạn thẳng', ic: 'LINE', fn: () => plv.line(e, i) });
      else items.push({ t: 'Đổi thành cung', ic: 'ARC', fn: () => A.run('PLVERTEX', async () => { const v = VB(e); const a = v[i], b = v[(i + 1) % v.length]; const r = await A.getPoint('Điểm cung đi qua', { preview: (g, q) => { const t = { type: 'POLYLINE', vertices: [Object.assign({}, a), { x: b.x, y: b.y }], closed: false }; const w2 = copy({ type: 'POLYLINE', vertices: [{ x: a.x, y: a.y }, { x: q.x, y: q.y }, { x: b.x, y: b.y }] }); g.ent(w2); void t; } }); if(r.pt) plv.arc(e, i, r.pt); }) });
    }
    A.menu(cx, cy, items);
  }
  window.addEventListener('pointerdown', ev => {
    try{ if(ev.button !== 2) return; const cvEl = document.getElementById('cv'); if(ev.target !== cvEl || !document.documentElement.classList.contains('acad')) return;
      const r = cvEl.getBoundingClientRect(); const h = plGripAt({ x: ev.clientX - r.left, y: ev.clientY - r.top }); if(!h) return;
      ev.preventDefault(); ev.stopPropagation(); plGripMenu(h, ev.clientX + 4, ev.clientY + 4); }catch(err){ console.warn(err); }
  }, true);

  /* =====================================================================
     6) OFFSET — Xoá nguồn / Lớp / Nhiều lần / Hoàn tác (như AutoCAD)
     ===================================================================== */
  const MEM = A.MEM || (A.MEM = {}); const rememb = () => { try{ sessionStorage.setItem('dvd:mem', JSON.stringify(MEM)); }catch(_){} };
  const canOff = e => /^(LINE|CIRCLE|ARC|POLYLINE|ELLIPSE)$/.test(e.type);
  const hl = arr => { const c = A.cur(); if(c){ c.hl = arr || []; A.paint(); } };
  cmd(['OFFSET', 'O'], 'Tạo bản song song cách đều (T = qua điểm, E = xoá nguồn, L = lớp, M = nhiều lần)', async () => {
    let d = MEM.offset; let through = false; let erase = !!MEM.offE, layerCur = !!MEM.offL;
    const info = () => log('Cài đặt: Xoá nguồn = ' + (erase ? 'Có' : 'Không') + ' · Lớp = ' + (layerCur ? 'Hiện hành' : 'Theo nguồn') + ' · OFFSETGAPTYPE = 0');
    info();
    for(;;){ const r = await A.getDist('Chỉ định khoảng offset', { kw: [{ k: 'T', t: 'Đi qua điểm' }, { k: 'E', t: 'Xoá' }, { k: 'L', t: 'Lớp' }], def: d != null ? d : undefined });
      if(r.kw === 'T'){ through = true; break; }
      if(r.kw === 'E'){ const k = await A.getKw('Xoá đối tượng nguồn sau khi offset?', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: erase ? 'Có' : 'Không' }); if(k.kw) erase = k.kw === 'Y'; MEM.offE = erase; rememb(); continue; }
      if(r.kw === 'L'){ const k = await A.getKw('Lớp của đối tượng mới', { kw: [{ k: 'C', t: 'Hiện hành' }, { k: 'S', t: 'Theo nguồn' }], def: layerCur ? 'Hiện hành' : 'Theo nguồn' }); if(k.kw) layerCur = k.kw === 'C'; MEM.offL = layerCur; rememb(); continue; }
      if(r.num != null){ d = Math.abs(r.num); break; } if(r.none && d != null) break; return; }
    if(!through){ MEM.offset = d; rememb(); }
    const mk = (e, side) => { const o = G.offsetEntity(e, through ? null : d, side); if(!o) return null; delete o.userAdded; if(layerCur){ const p = A.newProps({ type: o.type }); o.layer = p.layer; o.col = p.col; if(p.bl) o.bl = 1; else delete o.bl; } return o; };
    const hist = [];
    for(;;){
      const rs = await A.getEnt('Chọn đối tượng cần offset (Enter để thôi)', { filter: canOff, kw: [{ k: 'U', t: 'Hoàn tác' }] });
      if(rs.kw === 'U'){ if(hist.length){ hist.pop(); try{ undoEdit(); }catch(_){ DVDCmd.run('U'); } } else log('Không còn gì để hoàn tác.'); continue; }
      if(!rs.ent) break; let e = rs.ent; hl([e]);
      const rp = await A.getPoint(through ? 'Chỉ định điểm đi qua' : 'Chỉ định điểm ở phía cần offset', { kw: [{ k: 'M', t: 'Nhiều lần' }, { k: 'E', t: 'Thoát' }], preview: (g, p) => { const o = mk(e, p); if(o) g.ent(o); } });
      if(rp.kw === 'E'){ hl([]); break; }
      if(rp.kw === 'M'){ // nhiều lần: mỗi lần bấm tạo thêm 1 bản từ bản vừa tạo
        let src = e; let n = 0; const stk = [e];
        for(;;){ const q = await A.getPoint('Chỉ định điểm ở phía cần offset (Enter = xong)', { kw: [{ k: 'U', t: 'Hoàn tác' }], preview: (g, p) => { const o = mk(src, p); if(o) g.ent(o); } });
          if(q.kw === 'U'){ if(n){ try{ undoEdit(); }catch(_){} n--; stk.pop(); src = stk[stk.length - 1]; } continue; }
          if(!q.pt) break; const o = mk(src, q.pt); if(!o){ log('Không offset được.'); break; } A.commit({ add: [o] }); src = o; stk.push(o); n++; hist.push(1); }
        if(erase && n) A.commit({ del: [e] }, 'Đã xoá đối tượng nguồn'); hl([]); continue; }
      hl([]); if(!rp.pt) break;
      const o = mk(e, rp.pt); if(!o){ log('Không offset được (bán kính ≤ 0?).'); continue; }
      A.commit(erase ? { add: [o], del: [e] } : { add: [o] }); hist.push(1);
    }
  });

  /* =====================================================================
     7) TOOL PALETTES — kéo-thả mục lên bản vẽ
     ===================================================================== */
  const unitMM = () => { try{ return unitToMM() || 1; }catch(_){ return 1; } };
  const annoN = () => (A.ANNO && A.ANNO.N) || 100;
  async function symbolAt(s, pt){
    const vals = []; for(const [p, dv] of (s.ask || [])){ const r = await A.getStr(p, { def: dv }); vals.push(r.str != null && r.str !== '' ? r.str : dv); }
    const k = s.real ? 1 / unitMM() : annoN() / unitMM(); const M = { a: k, b: 0, c: 0, d: k, e: pt.x, f: pt.y };
    const gid = A.newGroupId('S'); const add = s.make(vals).map(e => { const w = A.xformEnt(deep(e), M); A.newProps(w); if(w.type === 'TEXT' || w.type === 'HATCH' || w.type === 'SOLID') delete w.lt; w.grp = gid; w.blk = s.n; return w; });
    A.commit({ add }, 'Đã chèn ' + s.n); return add;
  }
  A.symbolAt = symbolAt;
  async function feed(name, inputs){ DVDCmd.run(name); for(const t of inputs){ for(let k = 0; k < 40 && !(A.cur() && A.cur().req); k++) await new Promise(r => setTimeout(r, 25)); if(!A.cur()) return; A.input(t); await new Promise(r => setTimeout(r, 30)); } }
  A.feedCmd = feed;
  async function tpDrop(b, w){
    if(A.busy()) A.cancel(true); await new Promise(r => setTimeout(r, 20));
    const P = w.x + ',' + w.y;
    if(b.dataset.s){ const s = (A.symbols || [])[+b.dataset.s]; if(s) A.run('SYMBOL', () => symbolAt(s, w)); return; }
    if(b.dataset.b){ const nm = b.dataset.b; const ents = A.instBlock(nm, 'lib', w, 1, 0); if(ents.length) A.commit({ add: ents }, 'Đã chèn khối ' + nm); return; }
    if(b.dataset.h){ if(b.dataset.h === '__grad'){ feed('GRADIENT', [P, '']); return; } if(A.HS){ A.HS.pat = b.dataset.h; try{ localStorage.setItem('dvd:hatch', JSON.stringify(A.HS)); }catch(_){} } feed('HATCH', [P, '']); return; }
    if(b.dataset.c){ DVDCmd.run(b.dataset.c); }
  }
  A.tpDrop = tpDrop;
  let dnd = null, ghost = null, swallow = false;
  document.addEventListener('pointerdown', ev => { const b = ev.target.closest && ev.target.closest('#dvdTP .tp-b button'); if(!b || ev.button !== 0) return; dnd = { b, x: ev.clientX, y: ev.clientY, on: false, id: ev.pointerId }; }, true);
  document.addEventListener('pointermove', ev => { if(!dnd || ev.pointerId !== dnd.id) return; if(!dnd.on && Math.hypot(ev.clientX - dnd.x, ev.clientY - dnd.y) > 8){ dnd.on = true; ghost = document.createElement('div'); ghost.style.cssText = 'position:fixed;z-index:99;pointer-events:none;padding:4px 8px;background:#3b4452;color:#fff;border:1px solid #61708a;border-radius:4px;font:12px system-ui;opacity:.92;display:flex;gap:6px;align-items:center'; ghost.innerHTML = dnd.b.innerHTML; document.body.appendChild(ghost); }
    if(dnd.on && ghost){ ghost.style.left = (ev.clientX + 10) + 'px'; ghost.style.top = (ev.clientY + 8) + 'px'; } }, true);
  document.addEventListener('pointerup', ev => { if(!dnd || ev.pointerId !== dnd.id) return; const d = dnd; dnd = null; if(ghost){ ghost.remove(); ghost = null; } if(!d.on) return; swallow = true; setTimeout(() => { swallow = false; }, 50);
    const cvEl = document.getElementById('cv'); const el = document.elementFromPoint(ev.clientX, ev.clientY); if(el !== cvEl) return; const r = cvEl.getBoundingClientRect(); const w = toWorld(ev.clientX - r.left, ev.clientY - r.top); tpDrop(d.b, w); }, true);
  document.addEventListener('click', ev => { if(swallow && ev.target.closest && ev.target.closest('#dvdTP')){ ev.stopPropagation(); ev.preventDefault(); swallow = false; } }, true);

  /* =====================================================================
     8) MLEADERSTYLE — kiểu ghi chú dẫn (mũi tên, cỡ, gờ, khung chữ)
     ===================================================================== */
  const MLS = A.MLS = Object.assign({ arrow: 'closed', asz: 0, land: 1.2, th: 0, frame: false }, (() => { try{ return JSON.parse(localStorage.getItem('dvd:mls') || '{}'); }catch(_){ return {}; } })());
  plain(['MLEADERSTYLE', 'MLS'], 'Kiểu ghi chú dẫn: loại / cỡ mũi tên, độ dài gờ, cao chữ, khung chữ', () => {
    const sel = (id, opts, v) => '<select id="' + id + '">' + opts.map(([k, t]) => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>';
    A.dialog({ title: 'Kiểu ghi chú dẫn (Multileader Style)', html:
      '<label class="dvd-frow"><span>Mũi tên</span><span class="v">' + sel('mlA', [['closed', 'Tam giác đặc'], ['open', 'Tam giác rỗng'], ['dot', 'Chấm tròn'], ['tick', 'Gạch chéo'], ['none', 'Không']], MLS.arrow) + '</span></label>' +
      '<label class="dvd-frow"><span>Cỡ mũi tên (0 = theo kiểu kích thước)</span><span class="v"><input id="mlS" value="' + (MLS.asz || 0) + '" style="width:80px"></span></label>' +
      '<label class="dvd-frow"><span>Độ dài gờ (× cao chữ)</span><span class="v"><input id="mlL" value="' + MLS.land + '" style="width:80px"></span></label>' +
      '<label class="dvd-frow"><span>Cao chữ (0 = theo kiểu kích thước)</span><span class="v"><input id="mlT" value="' + (MLS.th || 0) + '" style="width:80px"></span></label>' +
      '<label class="dvd-frow"><span>Khung quanh chữ</span><span class="v"><input type="checkbox" id="mlF"' + (MLS.frame ? ' checked' : '') + '></span></label>',
      onOpen: root => root.addEventListener('keydown', e => e.stopPropagation(), true),
      ok: root => { const n = id => { const v = parseFloat(String(root.querySelector(id).value).replace(',', '.')); return isFinite(v) && v >= 0 ? v : 0; }; MLS.arrow = root.querySelector('#mlA').value; MLS.asz = n('#mlS'); MLS.land = n('#mlL') || 1.2; MLS.th = n('#mlT'); MLS.frame = root.querySelector('#mlF').checked; try{ localStorage.setItem('dvd:mls', JSON.stringify(MLS)); }catch(_){} log('Đã lưu kiểu ghi chú dẫn.'); } });
  });

  /* =====================================================================
     9) Lệnh nhỏ: COUNT · SELECT · DBLIST · COPYHIST · JPGOUT · CLEANSCREENON · BASE · COLOR
     ===================================================================== */
  function blockCounts(list){ const m = new Map(); const seen = new Set(); for(const e of list){ if(!e.grp || !e.blk || String(e.blk).startsWith('*') || seen.has(e.grp)) continue; seen.add(e.grp); const n = String(e.blk); m.set(n, (m.get(n) || 0) + 1); } return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi')); }
  A.blockCounts = blockCounts;
  cmd(['COUNT', 'DEMKHOI', 'BCOUNT'], 'Đếm số lượng khối theo tên (cả bản vẽ hoặc vùng chọn) — có thể chèn bảng thống kê', async () => {
    const k = await A.getKw('Phạm vi đếm', { kw: [{ k: 'A', t: 'Toàn bản vẽ' }, { k: 'S', t: 'Chọn vùng' }], def: 'Toàn bản vẽ' });
    let list = modelEntities; if(k.kw === 'S'){ const s = await A.getSel('Chọn vùng cần đếm'); list = s.sel || []; }
    const rows = blockCounts(list); if(!rows.length){ say('Không có khối nào.'); return; }
    const tot = rows.reduce((s, r) => s + r[1], 0);
    const html = '<div class="lm-tbl" style="max-height:340px"><table><thead><tr><th>Tên khối</th><th>Số lượng</th><th></th></tr></thead><tbody>' + rows.map(([n, c]) => '<tr><td>' + esc(n) + '</td><td style="text-align:right">' + c + '</td><td><button type="button" class="btn-ghost" data-sel="' + esc(n) + '" style="padding:1px 8px">Chọn</button></td></tr>').join('') + '<tr><td><b>Tổng</b></td><td style="text-align:right"><b>' + tot + '</b></td><td></td></tr></tbody></table></div>';
    const ins = await new Promise(res => A.dialog({ title: 'Đếm khối (COUNT) — ' + rows.length + ' loại', html, wide: true, okText: 'Chèn bảng thống kê', cancelText: 'Đóng',
      onOpen: root => root.addEventListener('click', e => { const b = e.target.closest('[data-sel]'); if(!b) return; const n = b.dataset.sel; selEnts.clear(); for(const x of list) if(x.blk === n) selEnts.add(x); try{ refreshPanSel(); }catch(_){} root.remove(); res(false); say('Đã chọn ' + rows.find(r => r[0] === n)[1] + ' khối ' + n); }),
      ok: () => res(true), cancel: () => res(false) }));
    if(!ins) return; const data = [['STT', 'Tên khối', 'Số lượng']].concat(rows.map(([n, c], i) => [String(i + 1), n, String(c)])).concat([['', 'Tổng', String(tot)]]);
    const th = (A.dimTxt ? A.dimTxt() : 2.5); const T = tableDefFrom(data, { th, head: true, title: true, titleText: 'THỐNG KÊ KHỐI' });
    const r = await A.getPoint('Điểm chèn bảng (góc trên trái)', { rubber: false, preview: (g, p) => { const t2 = deep(T); t2.o = p; g.ents(A.tblRegenFrom({ tbld: t2 })); } }); if(!r.pt) return; T.o = { x: r.pt.x, y: r.pt.y };
    A.commit({ add: tableEnts(T, A.newGroupId('T')) }, 'Đã chèn bảng thống kê ' + rows.length + ' loại khối');
  });
  cmd(['SELECT'], 'Chọn đối tượng (để dùng cho lệnh sau — Previous)', async () => { const s = await A.getSel('Chọn đối tượng'); const sel = s.sel || []; if(!sel.length) return; setTimeout(() => { selEnts.clear(); for(const e of sel) selEnts.add(e); try{ refreshPanSel(); }catch(_){} }, 0); log('Đã chọn ' + sel.length + ' đối tượng.'); });
  const TYPEVN = { LINE: 'Đường thẳng', POLYLINE: 'Đa tuyến', CIRCLE: 'Đường tròn', ARC: 'Cung tròn', ELLIPSE: 'Elip', TEXT: 'Chữ', HATCH: 'Mặt tô', SOLID: 'Vùng đặc', POINT: 'Điểm', IMAGE: 'Ảnh', SPLINE: 'Spline', SOLID3D: 'Khối 3D' };
  plain(['DBLIST'], 'Liệt kê toàn bộ đối tượng của bản vẽ (theo loại, lớp)', () => {
    const byT = new Map(), byL = new Map(); for(const e of modelEntities){ const t = (e.rgn ? 'REGION' : e.type); byT.set(t, (byT.get(t) || 0) + 1); byL.set(e.layer || '0', (byL.get(e.layer || '0') || 0) + 1); }
    const tb = (m, h) => '<table style="width:100%;font-size:12px" cellpadding="3"><tr><th style="text-align:left">' + h + '</th><th style="text-align:right">Số</th></tr>' + [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => '<tr><td>' + esc(TYPEVN[k] ? k + ' — ' + TYPEVN[k] : k) + '</td><td style="text-align:right">' + n + '</td></tr>').join('') + '</table>';
    A.dialog({ title: 'DBLIST — ' + modelEntities.length + ' đối tượng', wide: true, noCancel: true, okText: 'Đóng', html: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div>' + tb(byT, 'Loại') + '</div><div class="lm-tbl" style="max-height:360px">' + tb(byL, 'Lớp') + '</div></div>' });
  });
  plain(['COPYHIST'], 'Sao chép lịch sử dòng lệnh vào clipboard', () => { const t = DVDCmd.history ? DVDCmd.history().join('\n') : ''; if(!t){ say('Lịch sử trống.'); return; } (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => say('Đã sao chép lịch sử lệnh'), () => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); say('Đã sao chép lịch sử lệnh'); }catch(_){} ta.remove(); }); });
  const imgOut = png => { const c = document.getElementById('cv'); const t = png ? 'image/png' : 'image/jpeg';
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.fillStyle = getComputedStyle(c).backgroundColor && getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)' ? getComputedStyle(c).backgroundColor : '#1e232b'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0);
    o.toBlob(b => { if(b) saveBlob(b, baseName() + (t === 'image/png' ? '.png' : '.jpg')); }, t, 0.92); log('Đã xuất ảnh khung nhìn ' + o.width + '×' + o.height + ' px.'); return o; };
  A.imgOut = imgOut;
  plain(['JPGOUT', 'BMPOUT'], 'Xuất khung nhìn hiện tại thành ảnh JPG', () => imgOut(false));
  plain(['PNGOUT'], 'Xuất khung nhìn hiện tại thành ảnh PNG', () => imgOut(true));
  const clean = on => { const h = document.documentElement; h.classList.toggle('acad-clean', on == null ? !h.classList.contains('acad-clean') : on); setTimeout(() => { try{ resize(); }catch(_){ try{ window.dispatchEvent(new Event('resize')); }catch(__){} } }, 30); };
  plain(['CLEANSCREENON', 'CLEANSCREEN'], 'Màn hình sạch: ẩn / hiện ribbon và thanh tab (Ctrl+0)', () => clean());
  plain(['CLEANSCREENOFF'], 'Tắt màn hình sạch: hiện lại ribbon', () => clean(false));
  if(!document.getElementById('dvdX9css')){ const st = document.createElement('style'); st.id = 'dvdX9css'; st.textContent = 'html.acad-clean #dvdTP{display:none!important}'; document.head.appendChild(st); }
  cmd(['BASE'], 'Đặt điểm gốc chèn của bản vẽ (dùng khi chèn bản vẽ này làm khối / xref)', async () => { const cur = A.drawBase || { x: 0, y: 0 }; const p = await A.getPoint('Điểm gốc chèn <' + fmtN(cur.x) + ',' + fmtN(cur.y) + '>'); if(!p.pt) return; A.drawBase = { x: p.pt.x, y: p.pt.y }; try{ localStorage.setItem('dvd:base:' + baseName(), JSON.stringify(A.drawBase)); }catch(_){} log('INSBASE = ' + fmtN(p.pt.x) + ',' + fmtN(p.pt.y)); });
  cmd(['COLOR', 'COL', 'COLOUR'], 'Màu hiện hành cho đối tượng mới (số ACI 1–255, ByLayer, tên màu, #rrggbb)', async () => {
    const LS = A.LS; const cur = LS && LS.color; const r = await A.getStr('Màu mới (1–255, BYLAYER, đỏ/vàng/xanh…, #rrggbb)', { def: cur === 'BYLAYER' || !cur ? 'BYLAYER' : String(cur) }); let v = String(r.str || '').trim(); if(!v) return;
    const NAMES = { red: 1, do: 1, 'đỏ': 1, yellow: 2, vang: 2, 'vàng': 2, green: 3, xanhla: 3, 'xanh lá': 3, cyan: 4, blue: 5, xanh: 5, 'xanh dương': 5, magenta: 6, tim: 6, 'tím': 6, white: 7, trang: 7, 'trắng': 7, gray: 8, xam: 8, 'xám': 8 };
    let col = null; if(/^bylayer$/i.test(v)) col = 'BYLAYER'; else if(/^#[0-9a-f]{6}$/i.test(v)) col = v.toLowerCase(); else if(/^\d+$/.test(v) && +v >= 1 && +v <= 255) col = aciHex(+v); else if(NAMES[v.toLowerCase()]) col = aciHex(NAMES[v.toLowerCase()]);
    if(!col){ log('Màu không hợp lệ.'); return; } if(A.setCurColor) A.setCurColor(col); else { LS.color = col; try{ A.lsSave(); }catch(_){} } try{ A.onSetChange && A.onSetChange(); }catch(_){} log('Màu hiện hành: ' + (col === 'BYLAYER' ? 'ByLayer' : col + ' (ACI ' + aciOf(col) + ')'));
  });

  /* =====================================================================
     10) KIỂU NÉT PHỨC — chữ chèn trong nét (GAS_LINE, đường cấp / thoát nước, điện…)
     ===================================================================== */
  const CLT = { GAS_LINE: ['Gas line ----GAS----GAS----', 'GAS'], HOT_WATER_SUPPLY: ['Hot water supply ---- HW ---- HW ----', 'HW'], CAP_NUOC: ['Cấp nước ---- CN ---- CN ----', 'CN'], THOAT_NUOC: ['Thoát nước ---- TN ---- TN ----', 'TN'], DIEN: ['Điện ---- Đ ---- Đ ----', 'Đ'], PCCC: ['PCCC ---- CC ---- CC ----', 'CC'] };
  // kiểu nét có hình (ltypeshp.shx) — hình vẽ gần đúng
  const SLT = { FENCELINE1: ['Fenceline circle ----0-----0----0-----0----', [6.35, -2.54, -2.54, 25.4], { i: 1, sh: 'CIRC1', s: 2.54, x: -2.54 }], FENCELINE2: ['Fenceline square ----[]-----[]----[]-----[]---', [6.35, -2.54, -2.54, 25.4], { i: 1, sh: 'BOX', s: 2.54, x: -2.54 }],
    TRACKS: ['Tracks -|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-', [3.81, 3.81], { i: 0, sh: 'TRACK1', s: 6.35, x: 0 }], ZIGZAG: ['Zig zag /\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/', [0.0001, -5.08, -10.16, -5.08], { i: 1, sh: 'ZIG', s: 5.08, x: -5.08 }, { i: 2, sh: 'ZIG', s: 5.08, x: 5.08, r: 180 }],
    BATTING: ['Batting SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', [0.0001, -2.54, -5.08, -2.54], { i: 1, sh: 'BAT', s: 2.54, x: -2.54 }, { i: 2, sh: 'BAT', s: 2.54, x: 2.54, r: 180 }] };
  try{ for(const k in SLT){ const [d, p, ...t] = SLT[k]; STD_LT_ISO[k] = { d, p, t: t.map(o => Object.assign({ t: '', r: 0, y: 0, abs: false }, o)) }; } }catch(_){}
  const SHP = { CIRC1: { c: [1, 0, 1] }, BOX: { p: [[0, -1], [2, -1], [2, 1], [0, 1], [0, -1]] }, TRACK1: { p: [[0, -0.5], [0, 0.5]] }, ZIG: { p: [[0, 0], [0.5, 1], [1.5, -1], [2, 0]] },
    BAT: { p: Array.from({ length: 17 }, (_, i) => [i / 8, Math.sin(i / 8 * Math.PI) * 0.8 * (i <= 8 ? 1 : -1) * (i <= 8 ? 1 : 1)]) } };
  const SHPN = { 130: 'TRACK1', 131: 'ZIG', 132: 'BOX', 133: 'CIRC1', 134: 'BAT' };
  function shapeOf(t, ltName){ if(typeof t.sh === 'string' && SHP[t.sh]) return SHP[t.sh]; const n = String(ltName || '');
    if(/TRACK/i.test(n)) return SHP.TRACK1; if(/ZIG/i.test(n)) return SHP.ZIG; if(/BATT/i.test(n)) return SHP.BAT; if(/FENCE.*2|BOX|SQUARE/i.test(n)) return SHP.BOX; if(/FENCE|CIRC/i.test(n)) return SHP.CIRC1; return SHP[SHPN[t.n]] || SHP.CIRC1; }
  A.ltShapeOf = shapeOf;
  try{ for(const k in CLT){ const [d, t] = CLT[k]; const w = Math.max(1, [...t].length); STD_LT_ISO[k] = { d, p: [12.7, -5.08 - (w - 3) * 0.8, -6.35 - (w - 3) * 0.8], t: [{ i: 1, t, s: 2.54, r: 0, x: -2.54 - (w - 3) * 0.8, y: -1.27, abs: false }] }; } }catch(_){}
  const _stdLT = window.stdLT;
  window.stdLT = function(name){ const d = _stdLT.apply(this, arguments); if(d){ const S = STD_LT_ISO[d.name]; if(S && S.t){ const k = S.p[0] ? d.pat[0] / S.p[0] : 1; d.txt = S.t.map(t => Object.assign({}, t, { s: t.s * k, x: t.x * k, y: t.y * k })); } } return d; };
  const _loadLT = A.loadLT; A.loadLT = function(name){ const r = _loadLT.apply(this, arguments); try{ const d = stdLT(name); if(r && d && d.txt && LTYPES[d.name]){ LTYPES[d.name].txt = d.txt; if(A.LS.ltd[d.name]) A.LS.ltd[d.name].txt = d.txt; A.lsSave(); } }catch(_){} return r; };
  let ltTextN = 0; A.ltTextCount = () => ltTextN;
  function pathPts(e){ const c = G.curveOf(e); if(!c || !c.pieces) return null; const o = []; for(const p of c.pieces){ if(p.t === 's'){ if(!o.length) o.push({ x: p.ax, y: p.ay }); o.push({ x: p.bx, y: p.by }); } else if(p.t === 'a'){ const n = Math.max(8, Math.ceil(Math.abs(p.sw) / (5 * D2R))); for(let i = o.length ? 1 : 0; i <= n; i++){ const a = p.a0 + p.sw * i / n; o.push({ x: p.cx + p.r * Math.cos(a), y: p.cy + p.r * Math.sin(a) }); } } } return o.length > 1 ? o : null; }
  function drawLtText(){
    ltTextN = 0; let any = false; for(const k in LTYPES){ if(LTYPES[k] && LTYPES[k].txt){ any = true; break; } } if(!any) return;
    let vb; try{ vb = viewWorldAABB(); }catch(_){ return; } const list = A.queryBox ? A.queryBox(vb.minX, vb.minY, vb.maxX, vb.maxY, 60000) : modelEntities;
    const c2 = ctx; c2.save(); c2.textBaseline = 'alphabetic'; c2.textAlign = 'left'; let budget = 20000;
    try{ for(const e of list){ if(budget <= 0) break; if(e.vh || e.type === 'TEXT' || e.type === 'HATCH' || e.type === 'IMAGE' || e.type === 'POINT') continue; let n; try{ n = ltNameOf(e); }catch(_){ n = null; } if(!n) continue; const d = ltDef(n) || LTYPES[n]; if(!d || !d.txt || !d.pat) continue;
        const k = (LTSCALE || 1) * (e.lts || 1); const tot = d.pat.reduce((a, b) => a + Math.abs(b), 0) * k; if(!(tot * view.scale >= 12)) continue;
        const P = pathPts(e); if(!P) continue; const cum = [0]; for(let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y)); const L = cum[cum.length - 1]; if(L < tot * 0.5) continue;
        const at = s => { let lo = 0, hi = cum.length - 1; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(cum[m] <= s) lo = m; else hi = m; } const a = P[lo], b = P[hi], f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
        let col; try{ col = plotColor(e.col || getCSS('--entity')); }catch(_){ col = e.col || '#fff'; } c2.fillStyle = col;
        for(const t of d.txt){ const off = d.pat.slice(0, t.i + 1).reduce((a, b) => a + Math.abs(b), 0) * k; const h = t.s * k; const hp = h * view.scale; if(hp < 3) continue;
          if(t.sh){ const S = shapeOf(t, n); c2.strokeStyle = col; c2.lineWidth = 1.15;
            for(let s0 = off; s0 < L && budget > 0; s0 += tot){ const q = at(Math.min(L, s0)); const ang = (t.abs ? 0 : q.ang) + (t.r || 0) * D2R; const ca = Math.cos(ang), sa = Math.sin(ang), cq = Math.cos(q.ang), sq = Math.sin(q.ang);
              const ox = q.x + cq * t.x * k - sq * t.y * k, oy = q.y + sq * t.x * k + cq * t.y * k; const W = (u, v) => toScreen(ox + (ca * u - sa * v) * h, oy + (sa * u + ca * v) * h);
              c2.beginPath(); if(S.c){ const C = W(S.c[0], S.c[1]); c2.arc(C.x, C.y, S.c[2] * hp, 0, TAU); } else { S.p.forEach(([u, v], i) => { const Q = W(u, v); if(i) c2.lineTo(Q.x, Q.y); else c2.moveTo(Q.x, Q.y); }); } c2.stroke(); ltTextN++; budget--; }
            continue; }
          c2.font = Math.round(hp * 100) / 100 + 'px ' + (A.fontCss ? A.fontCss() : 'Arial, sans-serif'); const wpx = c2.measureText(t.t).width; const wW = wpx / view.scale;
          for(let s0 = off; s0 < L && budget > 0; s0 += tot){ const q = at(Math.min(L, s0)); let ang = t.abs ? t.r * D2R : q.ang + t.r * D2R; let ox = t.x * k, oy = t.y * k; let flip = false; if(!t.abs && Math.cos(ang) < -1e-9){ ang += Math.PI; flip = true; }
            const dx = Math.cos(q.ang), dy = Math.sin(q.ang), nx = -dy, ny = dx; let x = q.x + dx * ox + nx * oy, y = q.y + dy * ox + ny * oy;
            if(flip){ x = q.x + dx * (ox + wW) + nx * (oy + h); y = q.y + dy * (ox + wW) + ny * (oy + h); }
            const S = toScreen(x, y); c2.save(); c2.translate(S.x, S.y); c2.rotate(-ang + (view.rot || 0)); c2.fillText(t.t, 0, 0); c2.restore(); ltTextN++; budget--; } } } }
    finally { c2.restore(); }
  }
  A.drawLtText = drawLtText;
  const _drawX = window.draw; window.draw = function(){ const r = _drawX.apply(this, arguments); try{ drawLtText(); }catch(err){ console.warn(err); } return r; };

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
