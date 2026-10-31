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
      else { if(!window.DVDLisp) throw new Error('Thiếu bộ thông dịch AutoLISP'); await DVDLisp.load(codeOf(item), baseName(item.name)); }
    }catch(err){ curAddin = null; log('Add-in "' + item.name + '" lỗi: ' + (err && err.message || err)); console.error(err); return false; }
    const cmds = DVDCmd.commands.flatMap(c => c.k).filter(k => !before.has(k));
    loaded.set(item.name, { type: item.type, cmds }); refreshRibbon();
    log('Đã nạp "' + item.name + '"' + (cmds.length ? ' · lệnh mới: ' + cmds.join(', ') : '') + '.');
    return true;
  }
  // mã của add-in: lưu thẳng trong danh sách, hoặc (nạp từ thư mục / gói zip) nằm trong kho tệp hỗ trợ của AutoLISP
  function codeOf(item){ if(item.code != null) return item.code; const f = window.DVDLisp && DVDLisp.fs && DVDLisp.fs.get(item.name); if(!f) throw new Error('Không thấy "' + item.name + '" trong thư mục hỗ trợ'); return f.text; }
  async function addFile(name, code, startup, inFs){
    const type = typeOf(name);
    if(type === 'fas'){ say('File .fas / .vlx là LISP đã biên dịch của AutoCAD — DVDCAD chỉ chạy được mã nguồn .lsp.'); return null; }
    if(type === 'native'){ say('File .dll / .arx / .dvb là add-in Windows cho riêng AutoCAD — trình duyệt không chạy được. Dùng .lsp hoặc .js.'); return null; }
    if(code.length > 1.5e6){ say('File quá lớn (giới hạn 1,5 MB).'); return null; }
    const l = list().filter(x => x.name !== name); const item = { name, type, code, startup: startup !== false, added: Date.now(), size: code.length };
    // .lsp cũng được chép vào kho tệp hỗ trợ để (load "ten") / autoload tìm thấy; tệp lớn chỉ giữ ở đó
    if(type === 'lsp' && window.DVDLisp && DVDLisp.fs){ await DVDLisp.fs.put(name, code); if(inFs || code.length > 200000) delete item.code; }
    l.push(item); save(l); await run(item); return item;
  }
  A.addinAdd = addFile;
  const sourceOf = k => { const it = list().find(x => x.type === 'lsp' && baseName(x.name).toUpperCase().replace(/\.LSP$/, '') === String(k).toUpperCase()); return it ? (() => { try{ return codeOf(it); }catch(_){ return null; } })() : null; };

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
  // byte → chữ: UTF-8, nếu không hợp lệ thì theo bảng mã ANSI tiếng Việt (Windows-1258) như LISP soạn trên Windows
  const decode = u8 => { try{ return new TextDecoder('utf-8', { fatal: true }).decode(u8).replace(/^\uFEFF/, ''); }catch(_){ try{ return new TextDecoder('windows-1258').decode(u8); }catch(__){ return new TextDecoder('latin1').decode(u8); } } };
  const SUPPORT = /\.(dcl|txt|lin|pat|csv|mnl|scr|ini|dat|cfg|xml|json|mnu|mns|shp|sld|lsp)$/i;
  function pickFiles(dir){ return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; if(dir) inp.webkitdirectory = true; else inp.accept = '.lsp,.js,.dcl,.zip,.xml,.cuix,.cui,.mnu,.mns,.fas,.vlx,.dll,.arx,.dvb,.txt,.lin,.pat,.csv,.mnl,.scr,.ini,.dat,.cfg,.sld';
    inp.onchange = async () => { const out = []; for(const f of inp.files) out.push({ name: f.name, path: f.webkitRelativePath || f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); res(out); }; inp.click(); }); }
  // giải các gói .zip thành danh sách tệp như khi chọn cả thư mục
  async function expand(files){ const out = [];
    for(const f of files){ if(/\.zip$/i.test(f.name) && A.unzip){ try{ const z = await A.unzip(f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength)); for(const n of z.names){ if(/\/$/.test(n)) continue; const b = await z.get(n); if(b) out.push({ name: baseName(n), path: f.name + '/' + n, bytes: b }); } }catch(err){ say('Không mở được ' + f.name + ': ' + (err.message || err)); } }
      else out.push(f); }
    return out; }
  // nạp một bộ tiện ích (cả thư mục / gói zip): tệp hỗ trợ vào kho, chọn .lsp nào nạp và tự nạp
  async function installSet(files){
    files = await expand(files); if(!files.length) return;
    // gói ứng dụng Autodesk (.bundle có PackageContents.xml): cài theo danh sách thành phần như APPAUTOLOADER
    const pkg = files.find(f => /(^|[\\/])PackageContents\.xml$/i.test(f.path || f.name));
    if(pkg) return installBundle(files, pkg);
    const lsp = [], js = [], sup = [], fas = [], nat = [];
    for(const f of files){ const t = typeOf(f.name); if(/\.lsp$/i.test(f.name)) lsp.push(f); else if(t === 'js') js.push(f); else if(t === 'fas') fas.push(f); else if(t === 'native') nat.push(f); else if(SUPPORT.test(f.name)) sup.push(f); }
    if(!lsp.length && !js.length && !sup.length){ say('Không có tệp .lsp / .dcl / .js nào' + (fas.length ? ' — chỉ có .fas / .vlx (LISP đã biên dịch, DVDCAD không chạy được).' : '.')); return; }
    const auto = lsp.filter(f => /^(acad|acaddoc)\.lsp$/i.test(f.name)).length;
    const rows = lsp.concat(js).map((f, i) => '<tr><td><input type="checkbox" data-ld="' + i + '"' + (/^(acad|acaddoc)\.lsp$/i.test(f.name) ? '' : ' checked') + ' style="width:auto"></td><td translate="no">' + esc(f.path) + '</td><td style="color:#9aa4b2">' + (f.bytes.length / 1024).toFixed(1) + ' KB</td></tr>').join('');
    const ok = await new Promise(res => A.dialog({ title: 'Nạp bộ tiện ích', wide: true,
      html: '<div class="acw" style="width:640px;max-width:100%"><div style="line-height:1.55;margin-bottom:6px">Tìm thấy <b>' + lsp.length + '</b> tệp .lsp, <b>' + js.length + '</b> tệp .js, <b>' + sup.length + '</b> tệp hỗ trợ (.dcl, .lin, .pat…)' + (fas.length ? ', <b style="color:#f6c445">' + fas.length + '</b> tệp .fas/.vlx' : '') + (nat.length ? ', <b style="color:#f6c445">' + nat.length + '</b> tệp .dll/.arx' : '') + '.</div>'
        + (lsp.length + js.length ? '<div style="max-height:240px;overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:6px"><table style="width:100%;font-size:12.5px"><tr style="color:#aab3c0;text-align:left"><th><input type="checkbox" id="isAll" checked style="width:auto"></th><th>Nạp ngay và đưa vào Startup Suite</th><th></th></tr>' + rows + '</table></div>' : '')
        + (auto ? '<div style="color:#9aa4b2;font-size:12px;margin-top:6px">acad.lsp / acaddoc.lsp tự chạy mỗi khi mở DVDCAD (như AutoCAD), không cần đánh dấu.</div>' : '')
        + '<div style="color:#9aa4b2;font-size:12px;margin-top:6px">Mọi tệp .lsp và .dcl được chép vào <b>thư mục hỗ trợ</b> của DVDCAD để <code>load</code>, <code>load_dialog</code>, <code>findfile</code> tìm thấy như trong Support File Search Path của AutoCAD.</div>'
        + (fas.length || nat.length ? '<div style="color:#f6c445;font-size:12px;margin-top:6px">⚠ Bỏ qua ' + fas.concat(nat).map(f => esc(f.name)).slice(0, 8).join(', ') + (fas.length + nat.length > 8 ? '…' : '') + ': .fas / .vlx là LISP đã biên dịch và mã hoá cho riêng AutoCAD; .dll / .arx là chương trình Windows nối vào bên trong AutoCAD. Cần bản mã nguồn .lsp từ tác giả.</div>' : '')
        + '<div style="color:#f6c445;font-size:12px;margin-top:6px">⚠ Tiện ích chạy với toàn quyền trong DVDCAD. Chỉ nạp từ nguồn bạn tin cậy.</div></div>',
      onOpen: r => { const all = r.querySelector('#isAll'); if(all) all.onchange = () => r.querySelectorAll('[data-ld]').forEach(b => { b.checked = all.checked; }); },
      ok: r => res([...r.querySelectorAll('[data-ld]')].filter(b => b.checked).map(b => +b.dataset.ld)), cancel: () => res(null) }));
    if(!ok) return;
    for(const f of sup.concat(lsp)) await DVDLisp.fs.put(f.name, decode(f.bytes), f.path.replace(/[\\/][^\\/]*$/, ''));
    const pick = lsp.concat(js); let n = 0;
    for(const i of ok){ const f = pick[i]; if(!f) continue; if(/\.lsp$/i.test(f.name)){ await addFile(f.name, decode(f.bytes), true, true); n++; } else { await addFile(f.name, decode(f.bytes), true); n++; } }
    if(auto) await DVDLisp.startup();
    // menu đi kèm bộ tiện ích (.cuix / .cui / .mnu): nạp như CUILOAD / MENULOAD, kèm .mnl cùng tên
    for(const f of files.filter(x => /\.(cuix|cui|mnu|mns)$/i.test(x.name))){ try{ if(/\.mn[us]$/i.test(f.name)){ const o = mnuToCui(decode(f.bytes), f.name.replace(/\.[^.]+$/, '')); await A.cuiLoadFile(new File([JSON.stringify(o)], f.name.replace(/\.[^.]+$/, '') + '.mnu')); } else await A.cuiLoadFile(new File([f.bytes], f.name)); }catch(err){ log('Không nạp được menu ' + f.name + ': ' + (err.message || err)); } }
    log('Đã chép ' + (sup.length + lsp.length) + ' tệp vào thư mục hỗ trợ, nạp ' + n + ' tệp.' + (fas.length + nat.length ? ' Bỏ qua ' + (fas.length + nat.length) + ' tệp đã biên dịch / native.' : ''));
  }
  A.addinInstallSet = installSet;

  /* ---------------- APPAUTOLOADER: gói .bundle (PackageContents.xml) ---------------- */
  const BKEY = 'dvd:bundles';
  const bundles = () => { try{ return JSON.parse(localStorage.getItem(BKEY) || '[]'); }catch(_){ return []; } };
  const saveBundles = l => { try{ localStorage.setItem(BKEY, JSON.stringify(l)); }catch(_){} };
  function parsePackage(xml){
    const doc = new DOMParser().parseFromString(xml, 'application/xml'); const root = doc.documentElement; if(!root || doc.getElementsByTagName('parsererror').length) throw new Error('PackageContents.xml lỗi');
    const at = (el, n) => { for(const a of el.attributes) if(a.name.toLowerCase() === n.toLowerCase()) return a.value; return ''; };
    const comps = [];
    for(const ce of root.getElementsByTagName('ComponentEntry')){ const cmds = [...ce.getElementsByTagName('Command')].map(c => (at(c, 'Global') || at(c, 'Local')).toUpperCase()).filter(Boolean);
      comps.push({ app: at(ce, 'AppName'), module: at(ce, 'ModuleName').replace(/\\/g, '/'), startup: /true/i.test(at(ce, 'LoadOnAutoCADStartup')), onCmd: /true/i.test(at(ce, 'LoadOnCommandInvocation')), cmds }); }
    return { name: at(root, 'Name') || at(root, 'AppNameSpace') || 'Ứng dụng', company: (root.getElementsByTagName('CompanyDetails')[0] && at(root.getElementsByTagName('CompanyDetails')[0], 'Name')) || '', version: at(root, 'AppVersion'), comps };
  }
  async function installBundle(files, pkg){
    let P; try{ P = parsePackage(decode(pkg.bytes)); }catch(err){ say(err.message); return; }
    const byPath = new Map(files.map(f => [String(f.path || f.name).replace(/\\/g, '/').toLowerCase(), f]));
    const dir = String(pkg.path || pkg.name).replace(/\\/g, '/').replace(/[^/]*$/, '').toLowerCase();
    const find = m => byPath.get((dir + m.replace(/^\.\//, '')).toLowerCase()) || files.find(f => f.name.toLowerCase() === m.replace(/^.*\//, '').toLowerCase());
    const ok = await confirmTrust([P.name + (P.version ? ' ' + P.version : '') + (P.company ? ' (' + P.company + ')' : '')]); if(!ok) return;
    // mọi tệp hỗ trợ (dcl, lin, pat, mnl…) vào thư mục hỗ trợ trước
    for(const f of files) if(SUPPORT.test(f.name)) await DVDLisp.fs.put(f.name, decode(f.bytes), String(f.path || '').replace(/[\\/][^\\/]*$/, ''));
    const res = { lsp: [], cui: [], skip: [] };
    for(const c of P.comps){ const f = find(c.module); const ext = (/\.([^.]+)$/.exec(c.module) || [, ''])[1].toLowerCase();
      if(!f){ res.skip.push(c.module + ' (thiếu tệp)'); continue; }
      if(ext === 'lsp' || ext === 'mnl'){ if(c.onCmd && c.cmds.length && !c.startup){ await DVDLisp.fs.put(f.name, decode(f.bytes)); try{ await DVDLisp.eval('(autoload "' + f.name.replace(/\.lsp$/i, '') + '" (list ' + c.cmds.map(x => '"' + x + '"').join(' ') + '))'); }catch(_){} }
        else await addFile(f.name, decode(f.bytes), true, true); res.lsp.push(f.name); continue; }
      if(ext === 'cuix' || ext === 'cui'){ try{ await A.cuiLoadFile(new File([f.bytes], f.name)); res.cui.push(f.name); await loadMnl(f.name); }catch(err){ res.skip.push(f.name + ' (' + (err.message || err) + ')'); } continue; }
      if(/^(fas|vlx)$/.test(ext)){ res.skip.push(f.name + ' (LISP đã biên dịch)'); stubCmds(c.cmds, P.name, f.name); continue; }
      if(/^(dll|arx|dbx|crx|dvb)$/.test(ext)){ res.skip.push(f.name + ' (chương trình chạy trong AutoCAD)'); stubCmds(c.cmds, P.name, f.name); continue; }
    }
    const l = bundles().filter(b => b.name !== P.name); l.push({ name: P.name, version: P.version, company: P.company, comps: P.comps.map(c => c.module), t: Date.now() }); saveBundles(l);
    log('Đã cài "' + P.name + '": ' + res.lsp.length + ' tệp LISP, ' + res.cui.length + ' tệp giao diện' + (res.skip.length ? '; bỏ qua: ' + res.skip.join(', ') : '') + '.');
    return res;
  }
  A.addinInstallBundle = (files) => installBundle(files, files.find(f => /PackageContents\.xml$/i.test(f.path || f.name)));
  // lệnh của phần .dll / .arx / .fas trong gói: gõ thì báo rõ thay vì "lệnh không biết"
  function stubCmds(cmds, app, file){ for(const k of cmds || []){ if(DVDCmd.commands.some(c => c.k.includes(k))) continue; DVDCmd.register([k], 'Lệnh của ' + app + ' (' + file + ') — không chạy được trong DVDCAD', () => { log('Lệnh ' + k + ' thuộc ' + file + ' của "' + app + '": đây là mã chạy bên trong AutoCAD (.dll / .arx / .fas), DVDCAD không chạy được. Cần bản .lsp từ tác giả.'); say('Lệnh ' + k + ' cần ' + file + ' — chỉ chạy trong AutoCAD.'); }, {}); } }
  // .mnl cùng tên tệp menu: tự nạp khi nạp menu (như AutoCAD)
  async function loadMnl(menuName){ const b = String(menuName).replace(/\.[^.]+$/, ''); const f = window.DVDLisp && DVDLisp.fs && DVDLisp.fs.get(b + '.mnl'); if(f){ try{ await DVDLisp.load(f.text, f.name); log('Đã nạp ' + f.name + ' (đi kèm menu).'); }catch(_){} } }
  { const cl0 = A.cuiLoadFile; if(cl0) A.cuiLoadFile = async function(f){ const r = await cl0.apply(this, arguments); try{ await loadMnl(f.name); }catch(_){} return r; }; }
  plain(['APPAUTOLOADER'], 'Ứng dụng đã cài dạng gói .bundle: LIST liệt kê, RELOAD nạp lại tệp LISP khởi động', async () => {
    const l = bundles(); if(!l.length){ log('Chưa cài gói .bundle nào. APPLOAD › Nạp cả thư mục… rồi chọn thư mục .bundle (có PackageContents.xml).'); return; }
    for(const b of l) log('🧩 ' + b.name + (b.version ? ' ' + b.version : '') + (b.company ? ' — ' + b.company : '') + ': ' + (b.comps || []).join(', '));
  });

  /* ---------------- MENULOAD / MENUUNLOAD: menu .mnu / .mns (AutoCAD cũ) và .cuix / .cui ---------------- */
  function mnuToCui(text, name){
    const out = { dvdcui: 1, cmds: [], keys: [], dbl: {}, tabs: [], menus: [], qat: null }; const byMac = new Map(); let n = 0;
    const cmdOf = (label, macro) => { const m = macro.trim(); if(!m) return null; if(byMac.has(m)) return byMac.get(m); const k = 'MNU_' + String(name).replace(/\W+/g, '').toUpperCase().slice(0, 8) + '_' + (++n); out.cmds.push({ name: k, desc: label.replace(/&/g, '') + ' (' + name + ')', macro: m }); byMac.set(m, k); return k; };
    let sec = null, cur = null, stack = [];
    for(const raw of String(text).split(/\r?\n/)){ const line = raw.replace(/\s+$/, ''); if(!line || /^\/\//.test(line)) continue;
      const s = /^\*\*\*(\w+)/.exec(line); if(s){ sec = s[1].toUpperCase(); cur = null; stack = []; continue; }
      if(!/^POP\d+$/.test(sec || '')) continue; if(/^\*\*/.test(line)) continue;
      const m = /^\s*(?:(\w+)\s+)?\[(.*?)\](.*)$/.exec(line); if(!m) continue; let label = m[2], macro = m[3] || '';
      if(!cur){ cur = { t: label.replace(/&/g, '') || 'Menu', items: [] }; out.menus.push(cur); stack = [cur]; continue; }
      const top = stack[stack.length - 1];
      if(/^-+$/.test(label) || label === '--'){ top.items.push({ sep: 1 }); continue; }
      if(label.startsWith('->')){ const sub = { t: label.slice(2).replace(/&/g, ''), items: [] }; top.items.push(sub); stack.push(sub); continue; }
      let pop = 0; while(label.startsWith('<-')){ label = label.slice(2); pop++; }
      const c = cmdOf(label, macro); if(c) top.items.push({ t: label.replace(/&/g, ''), c });
      while(pop-- > 0 && stack.length > 1) stack.pop(); }
    out.menus = out.menus.filter(mm => mm.items.length);
    out.stat = { macros: byMac.size, cmds: out.cmds.length, keys: 0, dbl: 0, panels: 0, menus: out.menus.length, imgs: 0 };
    return out; }
  A.mnuToCui = mnuToCui;
  plain(['MENULOAD'], 'Nạp menu bổ sung: .cuix / .cui hoặc menu cũ .mnu / .mns (kèm .mnl cùng tên)', async () => {
    const F = await new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.cuix,.cui,.mnu,.mns,.mnl'; inp.multiple = true; inp.onchange = () => res([...inp.files]); inp.click(); });
    for(const f of F.filter(x => /\.mnl$/i.test(x.name))) await DVDLisp.fs.put(f.name, decode(new Uint8Array(await f.arrayBuffer())));
    for(const f of F.filter(x => !/\.mnl$/i.test(x.name))){
      if(/\.mn[us]$/i.test(f.name)){ const o = mnuToCui(decode(new Uint8Array(await f.arrayBuffer())), f.name.replace(/\.[^.]+$/, '')); await A.cuiLoadFile(new File([JSON.stringify(o)], f.name.replace(/\.[^.]+$/, '') + '.mnu')); }
      else await A.cuiLoadFile(f); }
  });
  plain(['MENUUNLOAD'], 'Gỡ menu bổ sung (như CUIUNLOAD)', () => DVDCmd.run('CUIUNLOAD'));

  /* ---------------- NETLOAD / ARX / VBA: báo rõ vì sao không chạy được ---------------- */
  const nativeMsg = (kind, ext) => '<div class="acw" style="line-height:1.6;max-width:520px">' + kind + ' (<code>' + ext + '</code>) là chương trình Windows được nạp <b>vào bên trong tiến trình AutoCAD</b> và gọi thẳng thư viện của Autodesk (ObjectARX / .NET API / VBA). Phần mềm khác không nạp được loại tệp này.<br><br>Muốn dùng tiện ích trên DVDCAD: xin tác giả bản <b>AutoLISP (.lsp)</b> — DVDCAD chạy được .lsp kèm hộp thoại .dcl, hàm vla- / vlax-, Excel, reactor — hoặc viết lại phần xử lý bằng <b>JavaScript</b> (xem ADDIN-API.md).</div>';
  const nativeDlg = (title, kind, ext) => A.dialog({ title, html: nativeMsg(kind, ext), noCancel: true, help: false });
  plain(['NETLOAD'], 'Nạp ứng dụng .NET (.dll) — chỉ chạy trong AutoCAD; DVDCAD giải thích cách thay thế', () => nativeDlg('NETLOAD', 'Ứng dụng .NET', '.dll'));
  plain(['ARX', 'ARXLOAD'], 'Ứng dụng ObjectARX (.arx / .dbx / .crx) — chỉ chạy trong AutoCAD', () => nativeDlg('ARX', 'Ứng dụng ObjectARX', '.arx / .dbx / .crx'));
  plain(['VBALOAD', 'VBARUN', 'VBAMAN', 'VBAIDE', 'VBASTMT', 'VBAUNLOAD', '-VBARUN'], 'Macro VBA (.dvb) — chỉ chạy trong AutoCAD có VBA Enabler', () => nativeDlg('VBA', 'Dự án VBA', '.dvb'));
  plain(['SECURITYOPTIONS'], 'Bảo mật khi nạp tiện ích: vị trí tin cậy (TRUSTEDPATHS)', () => { if(A.openOptions) A.openOptions('files'); else DVDCmd.run('OPTIONS'); });
  // xem / xoá tệp trong thư mục hỗ trợ
  function supportDlg(){ let root = null; const fs = DVDLisp.fs;
    const render = () => { const L = fs.list().sort((a, b) => a.name.localeCompare(b.name)); root.querySelector('#sfList').innerHTML = L.length ? '<table style="width:100%;font-size:12.5px"><tr style="color:#aab3c0;text-align:left"><th>Tệp</th><th>Thư mục gốc</th><th></th></tr>' + L.map(f => '<tr style="border-top:1px solid rgba(255,255,255,.06)"><td translate="no">' + esc(f.name) + '</td><td translate="no" style="color:#9aa4b2">' + esc(f.folder || '') + '</td><td><button type="button" class="acw-btn" data-del="' + esc(f.name) + '">Xoá</button></td></tr>').join('') + '</table>' : '<div style="color:#7c8696">Chưa có tệp nào.</div>';
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await fs.del(b.dataset.del); render(); }); };
    A.dialog({ title: 'Thư mục hỗ trợ (Support File Search Path)', wide: true, noOk: true, cancelText: 'Đóng',
      html: '<div class="acw" style="width:600px;max-width:100%"><div style="color:#9aa4b2;font-size:12px;margin-bottom:6px">Các tệp .lsp, .dcl, .lin, .pat… mà tiện ích LISP tìm bằng <code>findfile</code>, <code>load</code>, <code>load_dialog</code>, <code>open</code>. Lưu trong máy, giữ qua các lần mở DVDCAD.</div><div id="sfList" class="acw-list" style="max-height:320px;overflow:auto;padding:4px"></div></div>',
      onOpen: r => { root = r; fs.ready.then(render); } }); }
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
      html: '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" id="adFile">＋ Nạp file… (.lsp, .js, .dcl, .zip)</button><button type="button" id="adDir">＋ Nạp cả thư mục…</button><button type="button" id="adSup">Thư mục hỗ trợ</button><button type="button" id="adUrl">＋ Nạp từ đường link…</button><button type="button" id="adCon">Bảng LISP (VLISP)</button><button type="button" id="adDoc">Hướng dẫn viết add-in</button></div>'
        + '<div id="adList"></div>'
        + '<div class="dvd-sub" style="margin-top:12px">Add-in mẫu</div>' + SAMPLES.map((s, i) => '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-top:1px solid rgba(255,255,255,.06)"><div style="flex:1"><b>' + esc(s.name) + '</b><div style="color:#9aa4b2;font-size:12px">' + esc(s.desc) + '</div></div><button type="button" data-smp="' + i + '">Cài</button></div>').join('')
        + '<div style="color:#7c8696;font-size:11.5px;margin-top:10px;line-height:1.5">DVDCAD chạy add-in AutoLISP dạng mã nguồn (.lsp, kèm hộp thoại .dcl, hàm vla- / vlax-) và JavaScript (.js). Bộ tiện ích nhiều tệp: bấm "Nạp cả thư mục…" hoặc chọn gói .zip. File .fas / .vlx (LISP đã biên dịch, mã hoá), .dll / .arx / .dvb (chương trình Windows nối vào AutoCAD) không chạy được — cần bản .lsp từ tác giả. Có thể gõ thẳng biểu thức LISP ở dòng lệnh, ví dụ <code>(+ 1 2)</code>.</div>',
      onOpen: r => { root = r; render();
        r.querySelector('#adFile').onclick = async () => { const fs = await pickFiles(); if(!fs.length) return;
          // nhiều tệp, có .dcl hoặc gói .zip → coi như một bộ tiện ích
          if(fs.length > 1 || fs.some(f => /\.(zip|dcl)$/i.test(f.name)) || typeOf(fs[0].name) === 'fas'){ await installSet(fs); render(); return; }
          const ok = await confirmTrust(fs.map(f => f.name)); if(!ok) return; for(const f of fs) await addFile(f.name, decode(f.bytes), ok.startup); render(); };
        r.querySelector('#adDir').onclick = async () => { const fs = await pickFiles(true); if(fs.length) await installSet(fs); render(); };
        r.querySelector('#adSup').onclick = () => supportDlg();
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
  plain(['SUPPORTFILES', 'THUMUCHOTRO'], 'Thư mục hỗ trợ của AutoLISP: tệp .lsp / .dcl / .lin / .pat dùng chung cho add-in', () => { if(window.DVDLisp && DVDLisp.fs) supportDlg(); });
  plain(['ADDINAPI'], 'Hướng dẫn viết add-in (JavaScript / AutoLISP)', () => { try{ window.open('./ADDIN-API.md', '_blank'); }catch(_){} });

  /* ---------------- Startup Suite ---------------- */
  window.DVDAddins = { list, save, add: addFile, run, sourceOf, refreshRibbon, API, loaded };
  const suite = async () => { for(const it of list()) if(it.startup) await run(it); };
  setTimeout(async () => { refreshRibbon(); if(window.DVDLisp && DVDLisp.startup) await DVDLisp.startup(suite); else await suite(); }, 0);
})();
