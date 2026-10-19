/* DVDCAD v5d — add-in (ứng dụng ngoài) cho DVDCAD
   · APPLOAD (AP): nạp / gỡ add-in AutoLISP (.lsp) và JavaScript (.js), Startup Suite (tự nạp khi mở app), add-in mẫu
   · VLISP / VLIDE: bảng gõ thử AutoLISP · thẻ ribbon "Add-ins"
   · API cho add-in JavaScript: window.DVDCAD (xem ADDIN-API.md)
   Add-in chạy với toàn quyền trong DVDCAD (như add-in của AutoCAD) — chỉ nạp file từ nguồn tin cậy. */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._addins || !window.DVDCmd) return; A._addins = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const KEY = 'dvd:addins';
  const VERSION = '1.0';
  const SAMPLES = [
    { file: 'addins/qs-khoi-luong.js', name: 'QS — khối lượng (JavaScript)', desc: 'TONGDAI: tổng chiều dài theo lớp · TONGDT: tổng diện tích vùng kín · xuất CSV / chèn bảng' },
    { file: 'addins/lisp-tien-ich.lsp', name: 'Tiện ích AutoLISP mẫu', desc: 'STT: đánh số thứ tự · TL: tổng chiều dài · DTL: đổi lớp theo đối tượng mẫu · KHUNGTEN: vẽ khung bằng (command)' }
  ];

  /* ---------------- kho add-in (trên máy) ---------------- */
  const list = () => { try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(_){ return []; } };
  const save = l => { try{ localStorage.setItem(KEY, JSON.stringify(l)); return true; }catch(err){ say('Không lưu được add-in (bộ nhớ trình duyệt đầy?)'); return false; } };
  const loaded = new Map();   // tên → { type, cmds: [] }
  const typeOf = n => /\.lsp$/i.test(n) ? 'lsp' : /\.js$/i.test(n) ? 'js' : /\.(fas|vlx)$/i.test(n) ? 'fas' : /\.(dll|arx|dbx|crx|dvb)$/i.test(n) ? 'native' : 'lsp';
  const baseName = n => String(n).split(/[\\/]/).pop();

  async function run(item){
    const before = new Set(DVDCmd.commands.flatMap(c => c.k));
    try{
      if(item.type === 'js'){ curAddin = item.name; const f = new Function('DVDCAD', '"use strict";\n' + item.code + '\n//# sourceURL=addin-' + item.name.replace(/[^\w.-]/g, '_')); await f(API); curAddin = null; }
      else { if(!window.DVDLisp) throw new Error('Thiếu bộ thông dịch AutoLISP'); await DVDLisp.load(item.code, baseName(item.name)); }
    }catch(err){ curAddin = null; log('Add-in "' + item.name + '" lỗi: ' + (err && err.message || err)); console.error(err); return false; }
    const cmds = DVDCmd.commands.flatMap(c => c.k).filter(k => !before.has(k));
    loaded.set(item.name, { type: item.type, cmds }); refreshRibbon();
    log('Đã nạp "' + item.name + '"' + (cmds.length ? ' · lệnh mới: ' + cmds.join(', ') : '') + '.');
    return true;
  }
  async function addFile(name, code, startup){
    const type = typeOf(name);
    if(type === 'fas'){ say('File .fas / .vlx là LISP đã biên dịch của AutoCAD — DVDCAD chỉ chạy được mã nguồn .lsp.'); return null; }
    if(type === 'native'){ say('File .dll / .arx / .dvb là add-in Windows cho riêng AutoCAD — trình duyệt không chạy được. Dùng .lsp hoặc .js.'); return null; }
    if(code.length > 1.5e6){ say('File quá lớn (giới hạn 1,5 MB).'); return null; }
    const l = list().filter(x => x.name !== name); const item = { name, type, code, startup: startup !== false, added: Date.now(), size: code.length };
    l.push(item); save(l); await run(item); return item;
  }
  A.addinAdd = addFile;
  const sourceOf = k => { const it = list().find(x => x.type === 'lsp' && baseName(x.name).toUpperCase().replace(/\.LSP$/, '') === String(k).toUpperCase()); return it ? it.code : null; };

  /* ---------------- API cho add-in JavaScript ---------------- */
  let curAddin = null;
  const isCurve = e => /^(LINE|ARC|CIRCLE|POLYLINE|ELLIPSE|SPLINE)$/.test(e.type);
  const lengthOf = e => { try{ const c = A.G.curveOf(e); if(!c) return 0; if(e.type === 'ARC') return Math.abs(c.u1 - c.u0) * e.r; if(e.type === 'CIRCLE') return 2 * Math.PI * e.r; return c.len || 0; }catch(_){ return 0; } };
  const areaOf = e => { try{ if(e.type === 'CIRCLE') return Math.PI * e.r * e.r; if(e.type === 'HATCH'){ let s = 0; for(const lp of e.loops || []) s += A.G.area(lp); return Math.abs(s); } if(e.type === 'POLYLINE' && (e.closed || (e.vertices || []).length > 2)) return Math.abs(A.G.area(e.vertices)); }catch(_){} return 0; };
  const P = p => p ? { x: +p.x, y: +p.y } : null;
  const mk = (o, props) => { const e = Object.assign({}, o); A.newProps(e); delete e.lt; if(props){ if(props.layer){ if(!A.layerNames().includes(props.layer)) A.addLayer(props.layer, props.layerColor); e.layer = props.layer; if(e.bl) e.col = A.layerHex(props.layer); } if(props.color){ e.col = /^#/.test(props.color) ? props.color : (typeof aciHex === 'function' ? aciHex(+props.color) : props.color); delete e.bl; } } return e; };
  const commit = (ch, msg) => { A.commit(ch, msg); return ch.add || null; };
  const API = {
    version: VERSION,
    /** đăng ký lệnh mới; fn(DVDCAD) chạy như lệnh DVDCAD (có lời nhắc, Esc để huỷ) */
    addCommand(name, description, fn, opt){
      const key = String(name).toUpperCase().trim(); if(!/^[A-Z0-9_\-]{1,32}$/.test(key)) throw new Error('Tên lệnh không hợp lệ: ' + name);
      const keys = [key].concat((opt && opt.aliases) || []).map(s => String(s).toUpperCase());
      DVDCmd.register(keys, (description || 'Lệnh add-in') + (curAddin ? ' — ' + curAddin : ''), () => A.run(key, async () => { await fn(API); }), { engine: true });
      const c = DVDCmd.commands.find(c => c.k.includes(key)); if(c){ c.addin = curAddin || 'JS'; if(opt && opt.icon) c.icon = opt.icon; }
      refreshRibbon(); return key;
    },
    getPoint: async (msg, o) => { const r = await A.getPoint(msg || 'Chỉ định điểm', o && o.base ? { base: P(o.base) } : {}); return r.pt ? P(r.pt) : null; },
    getDistance: async (msg, o) => { const r = await A.getDist(msg || 'Khoảng cách', Object.assign({}, o && o.base ? { base: P(o.base) } : {}, o && o.default != null ? { def: o.default } : {})); return r.num != null ? +r.num : null; },
    getNumber: async (msg, def) => { const r = await A.getNum(msg || 'Nhập số', def != null ? { def } : {}); return r.num != null ? +r.num : (def != null && r.none ? def : null); },
    getString: async (msg, def) => { const r = await A.getStr(msg || 'Nhập chuỗi', def != null ? { def: String(def) } : {}); return r.str != null && r.str !== '' ? r.str : (def != null ? String(def) : null); },
    getKeyword: async (msg, words, def) => { const kw = (words || []).map(w => ({ k: (String(w).replace(/[^A-Z0-9]/g, '') || String(w).toUpperCase()), t: String(w) })); const r = await A.getKw(msg || 'Chọn', { kw, def }); const o = kw.find(x => x.k === r.kw); return o ? o.t : (r.none && def ? def : null); },
    getEntity: async (msg, filter) => { const r = await A.getEnt(msg || 'Chọn đối tượng', filter ? { filter } : {}); return r.ent || null; },
    getSelection: async (msg, filter) => { const r = await A.getSel(msg || 'Chọn đối tượng', filter ? { filter } : {}); return r.sel || []; },
    entities: q => { let a = (window.modelEntities || (typeof modelEntities !== 'undefined' ? modelEntities : [])); if(q){ if(q.type) a = a.filter(e => e.type === String(q.type).toUpperCase()); if(q.layer) a = a.filter(e => (e.layer || '0') === q.layer); } return a.slice(); },
    selection: () => [...(window.selEnts || (typeof selEnts !== 'undefined' ? selEnts : []))],
    add: (ents, msg) => commit({ add: [].concat(ents).map(e => mk(e, e)) }, msg),
    addLine: (a, b, props) => commit({ add: [mk({ type: 'LINE', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, props)] })[0],
    addCircle: (c, r, props) => commit({ add: [mk({ type: 'CIRCLE', cx: c.x, cy: c.y, r: +r }, props)] })[0],
    addArc: (c, r, a1, a2, props) => commit({ add: [mk({ type: 'ARC', cx: c.x, cy: c.y, r: +r, a1: +a1, a2: +a2 }, props)] })[0],
    addText: (p, text, height, props) => commit({ add: [mk({ type: 'TEXT', x: p.x, y: p.y, h: +height || (A.MEM && A.MEM.th) || 2.5, text: String(text), rot: (props && props.rotation) || 0, ha: (props && props.align) || 'left', va: (props && props.valign) || 'alphabetic' }, props)] })[0],
    addPolyline: (pts, closed, props) => commit({ add: [mk({ type: 'POLYLINE', vertices: pts.map(P), closed: !!closed }, props)] })[0],
    modify: (e, changes, msg) => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; Object.assign(w, changes || {}); A.commit({ rep: [[e, w]] }, msg); return w; },
    erase: (ents, msg) => { const d = [].concat(ents).filter(e => !A.isLocked(e)); A.commit({ del: d }, msg); return d.length; },
    command: async (...args) => { if(!window.DVDLisp) return; const s = '(command ' + args.map(a => typeof a === 'string' ? DVDLisp.str(a) : (a && a.x != null) ? '\'(' + a.x + ' ' + a.y + ')' : String(a)).join(' ') + ')'; await DVDLisp.evalToString(s); },
    lisp: src => window.DVDLisp ? DVDLisp.evalToString(src) : null,
    log: m => log(String(m)), alert: m => A.dialog({ title: 'DVDCAD', html: '<div style="white-space:pre-wrap">' + esc(m) + '</div>', noCancel: true, ok: () => {} }), toast: m => say(m),
    dialog: o => A.dialog(o),
    layers: () => A.layerNames(), get currentLayer(){ return A.LS.cur; }, set currentLayer(n){ if(!A.layerNames().includes(n)) A.addLayer(n); A.setCurLayer(n); },
    addLayer: (n, hex) => A.addLayer(n, hex),
    length: lengthOf, area: areaOf, isCurve,
    copyText: t => { try{ navigator.clipboard.writeText(String(t)); return true; }catch(_){ return false; } },
    download: (name, text, mime) => { const b = new Blob([text], { type: mime || 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
    format: (v, d) => (+v).toLocaleString('vi-VN', { maximumFractionDigits: d == null ? 3 : d }),
    onDrawingLoaded: fn => { A.onLoad = (prev => function(){ if(prev) prev.apply(this, arguments); try{ fn(API); }catch(err){ console.warn(err); } })(A.onLoad); },
    engine: A
  };
  window.DVDCAD = API;

  /* ---------------- ribbon: thẻ Add-ins ---------------- */
  function refreshRibbon(){
    try{
      const R = A.ribbon; if(!R || !R.RIB) return;
      const cmds = DVDCmd.commands.filter(c => c.addin || c.lisp);
      const items = cmds.slice(0, 24).map(c => ({ t: 'sm', cmd: c.k[0], en: c.k[0], vi: c.k[0], icon: c.icon || (c.lisp ? 'LISPCMD' : 'ADDINCMD') }));
      const cols = []; for(let k = 0; k < items.length; k += 3) cols.push({ t: 'col', items: items.slice(k, k + 3) });
      R.RIB.addins = { en: 'Add-ins', vi: 'Add-in', panels: [
        { id: 'apps', en: 'Applications', vi: 'Ứng dụng', items: [{ t: 'big', cmd: 'APPLOAD', en: 'Load\nApplication', vi: 'Nạp\nứng dụng' }, { t: 'big', cmd: 'VLISP', en: 'Visual\nLISP', vi: 'Bảng\nLISP' }, { t: 'col', items: [{ t: 'sm', cmd: 'SCRIPT', en: 'Run Script', vi: 'Chạy script' }, { t: 'sm', cmd: 'ADDINAPI', en: 'Add-in API', vi: 'Hướng dẫn API' }] }] },
        { id: 'acmds', en: 'Add-in Commands', vi: 'Lệnh add-in', items: cols.length ? cols : [{ t: 'col', items: [{ t: 'sm', cmd: 'APPLOAD', en: 'No add-ins loaded', vi: 'Chưa nạp add-in', icon: 'ADDINCMD' }] }] }
      ] };
      for(const w of Object.values(R.WS)) if(!w.tabs.includes('addins')) w.tabs.push('addins');
      R.render();
    }catch(err){ console.warn('addins ribbon', err); }
  }

  /* ---------------- APPLOAD ---------------- */
  function pickFiles(){ return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.lsp,.js,.fas,.vlx,.dll,.arx,.dvb,.txt'; inp.onchange = async () => { const out = []; for(const f of inp.files) out.push({ name: f.name, code: await f.text() }); res(out); }; inp.click(); }); }
  async function confirmTrust(names){
    return new Promise(res => A.dialog({ title: 'Nạp add-in', html: '<div style="line-height:1.55">Nạp <b>' + names.map(esc).join(', ') + '</b>?<br><span style="color:#f6c445">⚠ Add-in chạy với toàn quyền trong DVDCAD (sửa / xoá bản vẽ, gửi dữ liệu ra mạng). Chỉ nạp file từ nguồn bạn tin cậy.</span><label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="adSt" checked style="width:auto"> Tự nạp mỗi khi mở DVDCAD (Startup Suite)</label></div>', ok: r => res({ startup: r.querySelector('#adSt').checked }), cancel: () => res(null) }));
  }
  function appload(){
    let root = null;
    const render = () => {
      if(!root) return; const l = list();
      root.querySelector('#adList').innerHTML = l.length ? '<table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="color:#aab3c0;text-align:left"><th>Add-in</th><th>Loại</th><th>Lệnh</th><th title="Tự nạp khi mở app">Khởi động</th><th></th></tr>' + l.map((x, i) => {
        const ld = loaded.get(x.name); return '<tr style="border-top:1px solid rgba(255,255,255,.08)"><td translate="no" style="padding:4px 4px">' + esc(x.name) + '<div style="color:#7c8696;font-size:11px">' + (x.size / 1024).toFixed(1) + ' KB' + (ld ? ' · đã nạp' : '') + '</div></td><td>' + (x.type === 'js' ? 'JavaScript' : 'AutoLISP') + '</td><td translate="no" style="max-width:180px;white-space:normal;color:#9fd0ff">' + esc(ld && ld.cmds.length ? ld.cmds.join(' ') : '—') + '</td><td style="text-align:center"><input type="checkbox" data-st="' + i + '"' + (x.startup ? ' checked' : '') + ' style="width:auto"></td><td style="white-space:nowrap"><button type="button" data-run="' + i + '">Nạp lại</button> <button type="button" data-rm="' + i + '">Gỡ</button></td></tr>'; }).join('') + '</table>' : '<div style="color:#7c8696;padding:8px 0">Chưa có add-in nào. Bấm "Nạp file…" hoặc cài add-in mẫu bên dưới.</div>';
      root.querySelectorAll('[data-st]').forEach(b => b.onchange = () => { const l2 = list(); l2[+b.dataset.st].startup = b.checked; save(l2); });
      root.querySelectorAll('[data-run]').forEach(b => b.onclick = async () => { await run(list()[+b.dataset.run]); render(); });
      root.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const l2 = list(); const it = l2.splice(+b.dataset.rm, 1)[0]; save(l2); log('Đã gỡ "' + it.name + '" khỏi danh sách (lệnh đã nạp vẫn dùng được tới khi mở lại app).'); render(); });
    };
    A.dialog({ title: 'Nạp ứng dụng (APPLOAD)', wide: true, noOk: true, cancelText: 'Đóng',
      html: '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" id="adFile">＋ Nạp file… (.lsp, .js)</button><button type="button" id="adUrl">＋ Nạp từ đường link…</button><button type="button" id="adCon">Bảng LISP (VLISP)</button><button type="button" id="adDoc">Hướng dẫn viết add-in</button></div>'
        + '<div id="adList"></div>'
        + '<div class="dvd-sub" style="margin-top:12px">Add-in mẫu</div>' + SAMPLES.map((s, i) => '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid rgba(255,255,255,.06)"><div style="flex:1"><b>' + esc(s.name) + '</b><div style="color:#9aa4b2;font-size:12px">' + esc(s.desc) + '</div></div><button type="button" data-smp="' + i + '">Cài</button></div>').join('')
        + '<div style="color:#7c8696;font-size:11.5px;margin-top:10px;line-height:1.5">DVDCAD chạy add-in AutoLISP dạng mã nguồn (.lsp) và JavaScript (.js). File .fas / .vlx (LISP đã biên dịch), .dll / .arx / .dvb (add-in Windows của AutoCAD) không chạy được trong trình duyệt. Có thể gõ thẳng biểu thức LISP ở dòng lệnh, ví dụ <code>(+ 1 2)</code>.</div>',
      onOpen: r => { root = r; render();
        r.querySelector('#adFile').onclick = async () => { const fs = await pickFiles(); if(!fs.length) return; const ok = await confirmTrust(fs.map(f => f.name)); if(!ok) return; for(const f of fs) await addFile(f.name, f.code, ok.startup); render(); };
        r.querySelector('#adUrl').onclick = async () => { const url = window.prompt('Đường link tới file .lsp hoặc .js (máy chủ phải cho phép tải chéo — CORS):', 'https://'); if(!url || !/^https?:\/\//.test(url)) return;
          try{ const t = await (await fetch(url)).text(); const name = baseName(url.split('?')[0]) || 'addin.lsp'; const ok = await confirmTrust([name]); if(!ok) return; await addFile(name, t, ok.startup); render(); }catch(err){ say('Không tải được: ' + (err.message || err)); } };
        r.querySelector('#adCon').onclick = () => { DVDCmd.run('VLISP'); };
        r.querySelector('#adDoc').onclick = () => { DVDCmd.run('ADDINAPI'); };
        r.querySelectorAll('[data-smp]').forEach(b => b.onclick = async () => { const s = SAMPLES[+b.dataset.smp]; try{ const t = await (await fetch(s.file)).text(); await addFile(baseName(s.file), t, true); render(); }catch(err){ say('Không tải được add-in mẫu: ' + (err.message || err)); } });
      } });
  }
  plain(['APPLOAD', 'AP', 'ADDINS', 'NAPADDIN'], 'Nạp ứng dụng: add-in AutoLISP (.lsp) / JavaScript (.js), Startup Suite, add-in mẫu', appload);

  /* ---------------- VLISP: bảng gõ thử AutoLISP ---------------- */
  plain(['VLISP', 'VLIDE', 'LISPCONSOLE'], 'Bảng AutoLISP: gõ và chạy mã LISP, nạp thành add-in', () => {
    const last = (() => { try{ return localStorage.getItem('dvd:vlisp') || ''; }catch(_){ return ''; } })();
    A.dialog({ title: 'Visual LISP (bảng gõ thử)', wide: true, noOk: true, cancelText: 'Đóng',
      html: '<textarea id="vlSrc" spellcheck="false" style="width:100%;height:220px;background:#1b2028;color:#e6eaf0;border:1px solid #454e5c;border-radius:6px;font:12.5px ui-monospace,Consolas,monospace;padding:8px">' + esc(last || ';; Ví dụ: gõ mã rồi bấm Chạy\n(defun c:XINCHAO ()\n  (princ "\\nXin chào từ AutoLISP!")\n  (princ))\n(+ 1 2.5)') + '</textarea>'
        + '<div style="display:flex;gap:6px;margin:6px 0"><button type="button" id="vlRun">▶ Chạy</button><button type="button" id="vlSave">Lưu thành add-in…</button><button type="button" id="vlStop">■ Dừng</button></div><pre id="vlOut" translate="no" style="background:#161a20;color:#9fd0ff;border-radius:6px;padding:8px;max-height:160px;overflow:auto;white-space:pre-wrap;margin:0;font:12px ui-monospace,monospace"></pre>',
      onOpen: r => {
        const src = r.querySelector('#vlSrc'), outEl = r.querySelector('#vlOut');
        src.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Tab'){ e.preventDefault(); const p = src.selectionStart; src.value = src.value.slice(0, p) + '  ' + src.value.slice(src.selectionEnd); src.selectionStart = src.selectionEnd = p + 2; } if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); r.querySelector('#vlRun').click(); } });
        r.querySelector('#vlRun').onclick = async () => { try{ localStorage.setItem('dvd:vlisp', src.value); }catch(_){} outEl.textContent = '…'; const res = await DVDLisp.evalToString(src.value); outEl.textContent = '_$ ' + (res == null ? '; lỗi (xem dòng lệnh)' : res); };
        r.querySelector('#vlStop').onclick = () => DVDLisp.stop();
        r.querySelector('#vlSave').onclick = async () => { const n = window.prompt('Tên file add-in (.lsp):', 'cua-toi.lsp'); if(!n) return; await addFile(/\.lsp$/i.test(n) ? n : n + '.lsp', src.value, true); outEl.textContent = 'Đã lưu "' + n + '" vào APPLOAD (tự nạp khi mở app).'; };
      } });
  });
  plain(['ADDINAPI'], 'Hướng dẫn viết add-in (JavaScript / AutoLISP)', () => { try{ window.open('./ADDIN-API.md', '_blank'); }catch(_){} });

  /* ---------------- Startup Suite ---------------- */
  window.DVDAddins = { list, add: addFile, run, sourceOf, refreshRibbon, API, loaded };
  setTimeout(async () => { refreshRibbon(); for(const it of list()) if(it.startup) await run(it); }, 0);
})();
