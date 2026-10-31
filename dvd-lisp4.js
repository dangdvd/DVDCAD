/* DVDCAD v6g — AutoLISP: hạ tầng cho tiện ích cài thêm (nạp sau dvd-lisp3.js)
   · Reactor (vlr-*): lệnh (bắt đầu / xong / huỷ / lỗi), CSDL (thêm / sửa / xoá đối tượng), đối tượng (sửa / xoá đối tượng sở hữu),
     biến hệ thống, chuột (nhấp đúp / chuột phải), LISP; vlr-add / remove / data / owners / reactions…
   · COM thường dùng trong tiện ích, làm lại không cần Windows:
     - Excel.Application: Workbooks / Worksheets / Cells / Range (Value, Formula…), SaveAs → tệp .xlsx / .csv thật
     - Scripting.FileSystemObject (tệp trong thư mục hỗ trợ), Scripting.Dictionary, WScript.Shell, Shell.Application
     - vlax-import-type-library: tiền tố tự đặt (msxl-…) gọi thuộc tính / phương thức như trên
   · DOSLib: dos_msgbox, dos_getstring, dos_listbox, dos_multilist, dos_checklist, dos_getdir, dos_getfiled, dos_str…, dos_file… */
(function(){
  'use strict';
  if(!window.DVDLisp || !DVDLisp.ext || !DVDLisp.ax || DVDLisp._v6g) return; DVDLisp._v6g = true;
  const X = DVDLisp.ext, AX = DVDLisp.ax;
  const { BI, G, Sym, LI, DP, Ename, SS, LispErr, T, mkInt, toReal, toInt, toStr, pt, lpt, L, nv, isNum, truthy, str, sym, entsOf, ename, ME, getv, setv, apply, toFn, runTop } = X;
  const { VObj, Variant, SArr, unV, VT, VF, getProp, putProp, METHODS } = AX;
  const A = () => window.DVDAcad;
  const log = m => { try{ A().log(m); }catch(_){} };
  const fn = n => getv(sym(n));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const base = n => String(n || '').replace(/\\/g, '/').split('/').pop();
  const FS = () => DVDLisp.fs;

  /* ==================================================================
     1) REACTOR
     ================================================================== */
  const TYPES = ['VLR-ACDB-REACTOR', 'VLR-COMMAND-REACTOR', 'VLR-DEEPCLONE-REACTOR', 'VLR-DOCMANAGER-REACTOR', 'VLR-DWG-REACTOR', 'VLR-DXF-REACTOR', 'VLR-EDITOR-REACTOR', 'VLR-INSERT-REACTOR', 'VLR-LINKER-REACTOR', 'VLR-LISP-REACTOR', 'VLR-MISCELLANEOUS-REACTOR', 'VLR-MOUSE-REACTOR', 'VLR-OBJECT-REACTOR', 'VLR-SYSVAR-REACTOR', 'VLR-TOOLBAR-REACTOR', 'VLR-UNDO-REACTOR', 'VLR-WBLOCK-REACTOR', 'VLR-WINDOW-REACTOR', 'VLR-XREF-REACTOR'];
  const RX = [];   // các reactor đang hoạt động
  class Reactor { constructor(type, data, reactions, owners){ this.type = type; this.data = data; this.reactions = new Map(); for(const p of L(reactions) || []){ if(p instanceof DP) this.reactions.set(String(p.a instanceof Sym ? p.a.n : p.a).toUpperCase(), p.d); else if(Array.isArray(p) && p.length >= 2) this.reactions.set(String(p[0] instanceof Sym ? p[0].n : p[0]).toUpperCase(), p[1]); } this.owners = owners || []; this.on = true; this.pers = false; } }
  const strX = X.str; X.str = (x, p) => x instanceof Reactor ? '#<' + x.type.replace(/^VLR-/, 'VLR-').replace(/-REACTOR$/, '-Reactor') + '>' : strX(x, p);
  const typeOf0 = G.get('TYPE'); BI('TYPE', a => a instanceof Reactor ? sym(a.type.replace(/-REACTOR$/, '-REACTOR')) : typeOf0(a));
  for(const t of TYPES){
    if(t === 'VLR-OBJECT-REACTOR') BI(t, (owners, data, reactions) => { const R = new Reactor(t, data, reactions, (L(owners) || []).filter(Boolean)); RX.push(R); return R; });
    else BI(t, (data, reactions) => { const R = new Reactor(t, data, reactions); RX.push(R); return R; });
  }
  let curReaction = null, firing = 0;
  // gọi các hàm phản hồi (không chặn lệnh; lỗi trong hàm phản hồi chỉ báo ở dòng lệnh như AutoCAD)
  function fire(types, ev, mkArgs, filter){
    const list = RX.filter(R => R.on && types.includes(R.type) && R.reactions.has(ev) && (!filter || filter(R)));
    if(!list.length || firing > 3) return;
    for(const R of list){ const f = R.reactions.get(ev);
      setTimeout(() => { firing++; curReaction = sym(':' + ev.toUpperCase().replace(/^:/, '')); const args = mkArgs(R);
        runTop(async () => apply(toFn(f), [R, args]), 'reactor').finally(() => { firing--; curReaction = null; }); }, 0); }
  }
  DVDLisp.fireReactor = fire;
  BI('VLR-ADD', R => { if(R instanceof Reactor){ R.on = true; if(!RX.includes(R)) RX.push(R); } return R; });
  BI('VLR-REMOVE', R => { if(R instanceof Reactor){ R.on = false; const i = RX.indexOf(R); if(i >= 0) RX.splice(i, 1); } return R; });
  BI('VLR-REMOVE-ALL', t => { const k = t ? String(t instanceof Sym ? t.n : t).toUpperCase().replace(/^:/, '') : null; for(let i = RX.length - 1; i >= 0; i--) if(!k || RX[i].type === k){ RX[i].on = false; RX.splice(i, 1); } return null; });
  BI('VLR-ADDED-P', R => R instanceof Reactor && R.on && RX.includes(R) ? T : null);
  BI('VLR-REACTORS', (...ts) => { const ks = ts.map(t => String(t instanceof Sym ? t.n : t).toUpperCase().replace(/^:/, '')); const grp = new Map(); for(const R of RX){ if(ks.length && !ks.includes(R.type)) continue; if(!grp.has(R.type)) grp.set(R.type, []); grp.get(R.type).push(R); } const out = [...grp].map(([k, l]) => [sym(':' + k)].concat(l)); return out.length ? out : null; });
  BI('VLR-REACTIONS', R => R instanceof Reactor ? [...R.reactions].map(([k, f]) => new DP(sym(k.startsWith(':') ? k : ':' + k), f)) : null);
  BI('VLR-REACTION-SET', (R, ev, f) => { if(R instanceof Reactor) R.reactions.set(String(ev instanceof Sym ? ev.n : ev).toUpperCase(), f); return f; });
  BI('VLR-DATA', R => R instanceof Reactor ? R.data : null); BI('VLR-DATA-SET', (R, d) => { if(R instanceof Reactor) R.data = d; return d; });
  BI('VLR-OWNERS', R => R instanceof Reactor && R.owners.length ? R.owners.slice() : null);
  BI('VLR-OWNER-ADD', (R, o) => { if(R instanceof Reactor) R.owners.push(o); return o; }); BI('VLR-OWNER-REMOVE', (R, o) => { if(R instanceof Reactor){ const id = idOf(o); R.owners = R.owners.filter(x => idOf(x) !== id); } return o; });
  BI('VLR-TYPE', R => R instanceof Reactor ? sym(':' + R.type) : null); BI('VLR-TYPES', () => TYPES.map(t => sym(':' + t)));
  BI('VLR-PERS', R => { if(R instanceof Reactor) R.pers = true; return R; }); BI('VLR-PERS-RELEASE', R => { if(R instanceof Reactor) R.pers = false; return R; }); BI('VLR-PERS-P', R => R instanceof Reactor && R.pers ? T : null);
  BI('VLR-PERS-LIST', () => { const l = RX.filter(R => R.pers); return l.length ? l : null; });
  BI('VLR-CURRENT-REACTION-NAME', () => curReaction);
  BI('VLR-SET-NOTIFICATION', (R, w) => R); BI('VLR-NOTIFICATION', () => sym(':ALL-DOCUMENTS'));
  BI('VLR-REACTION-NAMES', t => { const k = String(t instanceof Sym ? t.n : t).toUpperCase().replace(/^:/, ''); const N = { 'VLR-COMMAND-REACTOR': ['VLR-COMMANDWILLSTART', 'VLR-COMMANDENDED', 'VLR-COMMANDCANCELLED', 'VLR-COMMANDFAILED', 'VLR-UNKNOWNCOMMAND'], 'VLR-ACDB-REACTOR': ['VLR-OBJECTAPPENDED', 'VLR-OBJECTMODIFIED', 'VLR-OBJECTERASED', 'VLR-OBJECTUNERASED'], 'VLR-OBJECT-REACTOR': ['VLR-MODIFIED', 'VLR-ERASED', 'VLR-COPIED', 'VLR-OPENEDFORMODIFY'], 'VLR-SYSVAR-REACTOR': ['VLR-SYSVARWILLCHANGE', 'VLR-SYSVARCHANGED'], 'VLR-MOUSE-REACTOR': ['VLR-BEGINDOUBLECLICK', 'VLR-BEGINRIGHTCLICK'], 'VLR-LISP-REACTOR': ['VLR-LISPWILLSTART', 'VLR-LISPENDED', 'VLR-LISPCANCELLED'], 'VLR-DWG-REACTOR': ['VLR-BEGINSAVE', 'VLR-SAVECOMPLETE', 'VLR-BEGINCLOSE'] }[k] || []; return N.length ? N.map(n => sym(':' + n)) : null; });
  const idOf = o => o instanceof VObj && o.kind === 'ent' ? o.ref.id : o instanceof Ename ? o.id : null;
  const EVN = s => s.toUpperCase();
  const CMD_R = ['VLR-COMMAND-REACTOR', 'VLR-EDITOR-REACTOR'];
  // lệnh (A.run: lệnh vẽ / sửa / mọi lệnh có lời nhắc)
  { const run0 = A().run; A().run = async function(name, fn0, opt){ const N = String(name || '').toUpperCase().replace(/^[-_.]+/, (m) => m.includes('-') ? '-' : '');
      fire(CMD_R, EVN(':VLR-COMMANDWILLSTART'), () => [N]);
      let failed = null, cancelled = false;
      const r = await run0.call(this, name, async (...a) => { try{ return await fn0(...a); }catch(err){ if(err && err.cancel) cancelled = true; else failed = err; throw err; } }, opt);
      fire(CMD_R, EVN(cancelled ? ':VLR-COMMANDCANCELLED' : failed ? ':VLR-COMMANDFAILED' : ':VLR-COMMANDENDED'), () => [N]);
      return r; }; }
  // CSDL / đối tượng (mọi thay đổi bản vẽ đi qua A.commit)
  { const c0 = A().commit; A().commit = function(ch){ const r = c0.apply(this, arguments);
      try{ if(r !== false && RX.length && ch){ const add = ch.add || [], rep = ch.rep || [], del = ch.del || [];
          const ens = list => { const seen = new Set(), out = []; for(const e of list){ if(!e) continue; const en = ename(e); if(seen.has(en.id)) continue; seen.add(en.id); out.push(en); } return out; };
          for(const en of ens(add)) fire(['VLR-ACDB-REACTOR'], ':VLR-OBJECTAPPENDED', () => [null, en]);
          const modE = ens(rep.map(x => x[1])), delE = ens(del);
          for(const en of modE) fire(['VLR-ACDB-REACTOR'], ':VLR-OBJECTMODIFIED', () => [null, en]);
          for(const en of delE) fire(['VLR-ACDB-REACTOR'], ':VLR-OBJECTERASED', () => [null, en]);
          // vlr-object-reactor: đối tượng sở hữu bị sửa / xoá — hàm phản hồi nhận (đối-tượng reactor tham-số)
          for(const en of modE) fire(['VLR-OBJECT-REACTOR'], ':VLR-MODIFIED', null, R => { const h = R.owners.find(o => idOf(o) === en.id); if(h){ R._pend = R._pend || []; R._pend.push([':VLR-MODIFIED', h]); } return false; });
          for(const en of delE) fire(['VLR-OBJECT-REACTOR'], ':VLR-ERASED', null, R => { const h = R.owners.find(o => idOf(o) === en.id); if(h){ R._pend = R._pend || []; R._pend.push([':VLR-ERASED', h]); } return false; });
          for(const R of RX) if(R._pend && R._pend.length){ const P = R._pend.splice(0); for(const [ev, h] of P){ const f = R.reactions.get(ev); if(f) setTimeout(() => { firing++; curReaction = sym(ev); runTop(async () => apply(toFn(f), [h, R, null]), 'reactor').finally(() => { firing--; curReaction = null; }); }, 0); } } } }catch(_){}
      return r; }; }
  // biến hệ thống
  { const sv0 = fn('SETVAR'); BI('SETVAR', (n, v) => { const k = toStr(n).toUpperCase(); fire(['VLR-SYSVAR-REACTOR'], ':VLR-SYSVARWILLCHANGE', () => [k]); const r = sv0(n, v); fire(['VLR-SYSVAR-REACTOR'], ':VLR-SYSVARCHANGED', () => [k, T]); return r; }); }
  // chuột: nhấp đúp / chuột phải trên khung vẽ (khi không chạy lệnh)
  setTimeout(() => { const cv = document.getElementById('cv'); if(!cv) return;
    const wpt = e => { try{ const b = cv.getBoundingClientRect(); const w = toWorld(e.clientX - b.left, e.clientY - b.top); return [w.x, w.y, 0.0]; }catch(_){ return [0.0, 0.0, 0.0]; } };
    cv.addEventListener('dblclick', e => fire(['VLR-MOUSE-REACTOR'], ':VLR-BEGINDOUBLECLICK', () => [wpt(e)]));
    cv.addEventListener('contextmenu', e => { if(!(A().busy && A().busy())) fire(['VLR-MOUSE-REACTOR'], ':VLR-BEGINRIGHTCLICK', () => [wpt(e)]); }); }, 0);
  // LISP: lệnh c:XXX bắt đầu / kết thúc
  { const ev0 = DVDLisp.evalToString; DVDLisp.evalToString = async function(src){ const s = String(src); const lw = /^\s*\(c:/i.test(s); if(lw) fire(['VLR-LISP-REACTOR'], ':VLR-LISPWILLSTART', () => [s.slice(0, 60)]); const r = await ev0.apply(this, arguments); if(lw) fire(['VLR-LISP-REACTOR'], r == null ? ':VLR-LISPCANCELLED' : ':VLR-LISPENDED', () => []); return r; }; }
  // tệp: lưu bản vẽ
  { const hook = name => { const c = window.DVDCmd && DVDCmd.commands.find(x => x.k.includes(name)); if(!c || c._rx) return; const r0 = c.run; c._rx = 1; c.run = function(){ fire(['VLR-DWG-REACTOR', 'VLR-EDITOR-REACTOR'], ':VLR-BEGINSAVE', () => [String(window.currentName || '')]); const r = r0.apply(this, arguments); Promise.resolve(r).then(() => fire(['VLR-DWG-REACTOR', 'VLR-EDITOR-REACTOR'], ':VLR-SAVECOMPLETE', () => [String(window.currentName || '')])); return r; }; };
    setTimeout(() => ['QSAVE', 'SAVE', 'SAVEAS', 'SAVEDWG'].forEach(hook), 0); }

  /* ==================================================================
     2) COM: Excel, FileSystemObject, Dictionary, WScript.Shell, Shell.Application
     ================================================================== */
  const COM = (cls, ref) => new VObj('com', Object.assign({ cls }, ref || {}));
  const V8 = v => v == null ? new Variant(0, null) : typeof v === 'number' ? new Variant(5, v) : new Variant(8, String(v));
  const plain = v => { const u = unV(v); if(u instanceof LI) return Number(u.v); if(u === VT) return true; if(u === VF) return false; return u; };
  // ---- Excel ----
  const colNum = s => { let n = 0; for(const ch of String(s).toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
  const colName = n => { let s = ''; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const parseRef = r => { const m = /^\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/i.exec(String(r).trim()); if(!m) throw new LispErr('Excel: ô không hợp lệ "' + r + '"'); const c1 = colNum(m[1]), r1 = +m[2]; return { r1, c1, r2: m[3] ? +m[4] : r1, c2: m[3] ? colNum(m[3]) : c1 }; };
  let xlApp = null;
  const newSheet = (wb, name) => { const sh = { name: name || ('Sheet' + (wb.sheets.length + 1)), cells: new Map(), wb, widths: {} }; wb.sheets.push(sh); return sh; };
  const newBook = app => { const wb = { name: 'Book' + (app.books.length + 1), sheets: [], app, saved: false, path: '' }; newSheet(wb); app.books.push(wb); app.active = wb; return wb; };
  const rng = (sh, r1, c1, r2, c2) => COM('Excel.Range', { sh, r1, c1, r2: r2 || r1, c2: c2 || c1 });
  const cellGet = (sh, r, c) => sh.cells.get(r + ',' + c);
  const cellSet = (sh, r, c, v) => { if(v == null || v === '') sh.cells.delete(r + ',' + c); else sh.cells.set(r + ',' + c, v); sh.wb.saved = false; };
  const xmlE = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  async function xlsxBlob(wb){
    const files = [];
    files.push({ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + wb.sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' });
    files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
    files.push({ name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + wb.sheets.map((s, i) => '<sheet name="' + xmlE(s.name).slice(0, 31) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + wb.sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '</Relationships>' });
    wb.sheets.forEach((sh, i) => { const rows = new Map(); for(const [k, v] of sh.cells){ const [r, c] = k.split(',').map(Number); if(!rows.has(r)) rows.set(r, []); rows.get(r).push([c, v]); }
      const cols = Object.keys(sh.widths).length ? '<cols>' + Object.entries(sh.widths).map(([c, w]) => '<col min="' + c + '" max="' + c + '" width="' + (+w || 10) + '" customWidth="1"/>').join('') + '</cols>' : '';
      const body = [...rows.keys()].sort((a, b) => a - b).map(r => '<row r="' + r + '">' + rows.get(r).sort((a, b) => a[0] - b[0]).map(([c, v]) => { const ref = colName(c) + r;
        if(typeof v === 'string' && v[0] === '=') return '<c r="' + ref + '"><f>' + xmlE(v.slice(1)) + '</f></c>';
        if(typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"><v>' + v + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlE(v) + '</t></is></c>'; }).join('') + '</row>').join('');
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + cols + '<sheetData>' + body + '</sheetData></worksheet>' }); });
    const parts = await A().zipParts(files); return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const csvOf = sh => { let R = 0, C = 0; for(const k of sh.cells.keys()){ const [r, c] = k.split(',').map(Number); R = Math.max(R, r); C = Math.max(C, c); } const out = []; for(let r = 1; r <= R; r++){ const row = []; for(let c = 1; c <= C; c++){ const v = cellGet(sh, r, c); const s = v == null ? '' : String(v); row.push(/[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s); } out.push(row.join(',')); } return out.join('\r\n'); };
  async function saveBook(wb, path){ const nm = base(path || wb.path || (wb.name + '.xlsx')); const csv = /\.csv$/i.test(nm);
    const blob = csv ? new Blob(['\ufeff' + csvOf(wb.sheets[0])], { type: 'text/csv' }) : await xlsxBlob(wb);
    try{ if(csv && FS()) await FS().put(nm, csvOf(wb.sheets[0])); }catch(_){}
    try{ await shareOrDownload(blob, csv ? nm : nm.replace(/\.(xls|xlsm|xlsb)$/i, '.xlsx').replace(/^([^.]*)$/, '$1.xlsx'), blob.type); }catch(_){}
    wb.saved = true; wb.path = nm; log('Excel (DVDCAD): đã ghi ' + nm + ' — ' + wb.sheets.reduce((s, x) => s + x.cells.size, 0) + ' ô.'); }
  // Excel hiện ra (Visible = True) mà chưa lưu: DVDCAD giao tệp .xlsx để mở bằng Excel thật
  let visT = null; const showBooks = app => { clearTimeout(visT); visT = setTimeout(() => { for(const wb of app.books) if(!wb.saved && wb.sheets.some(s => s.cells.size)) saveBook(wb); }, 400); };
  function xlGet(o, p, args){ const r = o.ref;
    switch(r.cls){
      case 'Excel.Application': { const app = r.app;
        if(p === 'WORKBOOKS') return COM('Excel.Workbooks', { app }); if(p === 'ACTIVEWORKBOOK') return app.active ? COM('Excel.Workbook', { wb: app.active }) : null;
        if(p === 'ACTIVESHEET' || p === 'WORKSHEETS' || p === 'SHEETS'){ const wb = app.active || newBook(app); return p === 'ACTIVESHEET' ? COM('Excel.Worksheet', { sh: wb.act || wb.sheets[0] }) : COM('Excel.Sheets', { wb }); }
        if(p === 'CELLS' || p === 'RANGE'){ const wb = app.active || newBook(app); return xlGet(COM('Excel.Worksheet', { sh: wb.act || wb.sheets[0] }), p, args); }
        if(p === 'VISIBLE') return app.visible ? VT : VF; if(p === 'VERSION') return '16.0'; if(p === 'NAME') return 'Microsoft Excel'; if(p === 'DISPLAYALERTS' || p === 'SCREENUPDATING' || p === 'INTERACTIVE') return VT; if(p === 'APPLICATION') return o;
        break; }
      case 'Excel.Workbooks': { const app = r.app; if(p === 'COUNT') return mkInt(app.books.length); if(p === 'ITEM'){ const k = plain(args[0]); const wb = typeof k === 'number' ? app.books[k - 1] : app.books.find(b => b.name.toUpperCase() === String(k).toUpperCase()); if(!wb) throw new LispErr('Excel: không có sổ ' + k); return COM('Excel.Workbook', { wb }); } break; }
      case 'Excel.Workbook': { const wb = r.wb; if(p === 'SHEETS' || p === 'WORKSHEETS') return COM('Excel.Sheets', { wb }); if(p === 'ACTIVESHEET') return COM('Excel.Worksheet', { sh: wb.act || wb.sheets[0] }); if(p === 'NAME') return wb.name; if(p === 'FULLNAME' || p === 'PATH') return wb.path; if(p === 'SAVED') return wb.saved ? VT : VF; break; }
      case 'Excel.Sheets': { const wb = r.wb; if(p === 'COUNT') return mkInt(wb.sheets.length); if(p === 'ITEM'){ const k = plain(args[0]); const sh = typeof k === 'number' ? wb.sheets[k - 1] : wb.sheets.find(s => s.name.toUpperCase() === String(k).toUpperCase()); if(!sh) throw new LispErr('Excel: không có trang ' + k); return COM('Excel.Worksheet', { sh }); } break; }
      case 'Excel.Worksheet': { const sh = r.sh; if(p === 'NAME') return sh.name; if(p === 'CELLS'){ if(args.length >= 2) return rng(sh, toInt(args[0]), toInt(args[1])); return COM('Excel.Range', { sh, r1: 1, c1: 1, r2: 1048576, c2: 16384, all: true }); }
        if(p === 'RANGE'){ const a = parseRef(plain(args[0])); if(args[1] != null){ const b = parseRef(plain(args[1])); return rng(sh, a.r1, a.c1, b.r2, b.c2); } return rng(sh, a.r1, a.c1, a.r2, a.c2); }
        if(p === 'USEDRANGE'){ let R = 1, C = 1; for(const k of sh.cells.keys()){ const [a, b] = k.split(',').map(Number); R = Math.max(R, a); C = Math.max(C, b); } return rng(sh, 1, 1, R, C); }
        if(p === 'COLUMNS' || p === 'ROWS') return COM('Excel.Range', { sh, r1: 1, c1: 1, r2: 1048576, c2: 16384, all: true }); if(p === 'INDEX') return mkInt(sh.wb.sheets.indexOf(sh) + 1); break; }
      case 'Excel.Range': { const { sh, r1, c1, r2, c2 } = r;
        if(p === 'VALUE' || p === 'VALUE2' || p === 'FORMULA' || p === 'TEXT'){ if(r1 === r2 && c1 === c2){ const v = cellGet(sh, r1, c1); return p === 'TEXT' ? String(v == null ? '' : v) : V8(v); }
          const rows = []; for(let i = r1; i <= Math.min(r2, r1 + 999); i++){ const row = []; for(let j = c1; j <= Math.min(c2, c1 + 255); j++) row.push(V8(cellGet(sh, i, j))); rows.push(row); } return new Variant(8204, new SArr(12, 0, rows.length - 1, rows.map(rw => new Variant(8204, new SArr(12, 0, rw.length - 1, rw))))); }
        if(p === 'ITEM' || p === 'CELLS'){ if(args.length >= 2) return rng(sh, r1 + toInt(args[0]) - 1, c1 + toInt(args[1]) - 1); if(args.length === 1){ const k = toInt(args[0]) - 1, w = c2 - c1 + 1; return rng(sh, r1 + Math.floor(k / w), c1 + k % w); } return o; }
        if(p === 'OFFSET') return rng(sh, r1 + toInt(args[0] || mkInt(0)), c1 + toInt(args[1] || mkInt(0)), r2 + toInt(args[0] || mkInt(0)), c2 + toInt(args[1] || mkInt(0)));
        if(p === 'RESIZE') return rng(sh, r1, c1, r1 + toInt(args[0]) - 1, c1 + toInt(args[1] || mkInt(c2 - c1 + 1)) - 1);
        if(p === 'ROW') return mkInt(r1); if(p === 'COLUMN') return mkInt(c1); if(p === 'COUNT') return mkInt((r2 - r1 + 1) * (c2 - c1 + 1)); if(p === 'ADDRESS') return '$' + colName(c1) + '$' + r1 + (r1 !== r2 || c1 !== c2 ? ':$' + colName(c2) + '$' + r2 : '');
        if(p === 'END') return o; if(p === 'COLUMNWIDTH') return +(sh.widths[c1] || 8.43);
        if(['FONT', 'INTERIOR', 'BORDERS', 'ENTIRECOLUMN', 'ENTIREROW', 'COLUMNS', 'ROWS', 'WORKSHEET', 'CHARACTERS'].includes(p)) return COM('Excel.Misc', { sh, r1, c1, r2, c2, p });
        if(p === 'HORIZONTALALIGNMENT' || p === 'VERTICALALIGNMENT' || p === 'NUMBERFORMAT' || p === 'WRAPTEXT' || p === 'MERGECELLS') return null; break; }
      case 'Excel.Misc': return COM('Excel.Misc', r);
    }
    return undefined; }
  function xlPut(o, p, args, v){ const r = o.ref;
    if(r.cls === 'Excel.Application'){ if(p === 'VISIBLE'){ r.app.visible = !!plain(v) && plain(v) !== 0; if(r.app.visible) showBooks(r.app); } return v; }
    if(r.cls === 'Excel.Worksheet' && p === 'NAME'){ r.sh.name = toStr(plain(v)); return v; }
    if(r.cls === 'Excel.Worksheet' && (p === 'CELLS' || p === 'RANGE')){ const tgt = xlGet(o, p, args); return xlPut(tgt, 'VALUE', [], v); }
    if(r.cls === 'Excel.Range'){ const { sh, r1, c1, r2, c2 } = r;
      if(p === 'ITEM' && args.length >= 2) return xlPut(rng(sh, r1 + toInt(args[0]) - 1, c1 + toInt(args[1]) - 1), 'VALUE', [], v);
      if(p === 'VALUE' || p === 'VALUE2' || p === 'FORMULA'){ const val = unV(v); const P = x => { const u = plain(x); return typeof u === 'number' ? u : u == null ? '' : String(u); };
        if(Array.isArray(val) && Array.isArray(val[0])){ val.forEach((row, i) => row.forEach((x, j) => cellSet(sh, r1 + i, c1 + j, P(x)))); }
        else if(Array.isArray(val)){ val.forEach((x, j) => cellSet(sh, r1, c1 + j, P(x))); }
        else for(let i = r1; i <= Math.min(r2, r1 + 9999); i++) for(let j = c1; j <= Math.min(c2, c1 + 255); j++) cellSet(sh, i, j, P(val));
        return v; }
      if(p === 'COLUMNWIDTH'){ for(let j = c1; j <= Math.min(c2, c1 + 255); j++) sh.widths[j] = toReal(plain(v)); return v; }
      return v; }
    return v; }
  function xlCall(o, m, args){ const r = o.ref;
    switch(r.cls){
      case 'Excel.Application': if(m === 'QUIT'){ for(const wb of r.app.books) if(!wb.saved && wb.sheets.some(s => s.cells.size) && r.app.visible) saveBook(wb); xlApp = null; return null; } if(m === 'CALCULATE') return null; break;
      case 'Excel.Workbooks': if(m === 'ADD') return COM('Excel.Workbook', { wb: newBook(r.app) });
        if(m === 'OPEN'){ const nm = base(toStr(plain(args[0]))); const wb = newBook(r.app); wb.name = nm; wb.path = nm; const f = FS() && FS().get(nm); if(f && /\.csv$/i.test(nm)){ String(f.text).split(/\r?\n/).forEach((line, i) => line.split(',').forEach((x, j) => { const n = parseFloat(x); cellSet(wb.sheets[0], i + 1, j + 1, x !== '' && isFinite(n) && String(n) === x.trim() ? n : x.replace(/^"|"$/g, '')); })); } wb.saved = true; return COM('Excel.Workbook', { wb }); }
        if(m === 'CLOSE'){ r.app.books.length = 0; return null; } if(m === 'ITEM') return xlGet(o, 'ITEM', args); break;
      case 'Excel.Workbook': if(m === 'SAVEAS'){ return saveBook(r.wb, toStr(plain(args[0]))).then(() => null); } if(m === 'SAVE') return saveBook(r.wb).then(() => null);
        if(m === 'CLOSE'){ const sv = args.length && plain(args[0]); const pth = args[1] != null ? toStr(plain(args[1])) : null; const done = () => { const i = r.wb.app.books.indexOf(r.wb); if(i >= 0) r.wb.app.books.splice(i, 1); return null; }; if(sv && sv !== 0 && !r.wb.saved) return saveBook(r.wb, pth).then(done); return done(); }
        if(m === 'ACTIVATE'){ r.wb.app.active = r.wb; return null; } break;
      case 'Excel.Sheets': if(m === 'ADD'){ const sh = newSheet(r.wb); r.wb.act = sh; return COM('Excel.Worksheet', { sh }); } if(m === 'ITEM') return xlGet(o, 'ITEM', args); break;
      case 'Excel.Worksheet': if(m === 'ACTIVATE' || m === 'SELECT'){ r.sh.wb.act = r.sh; return null; } if(m === 'CELLS' || m === 'RANGE') return xlGet(o, m, args); if(m === 'DELETE'){ const s = r.sh.wb.sheets; s.splice(s.indexOf(r.sh), 1); return null; } break;
      case 'Excel.Range': if(m === 'ITEM' || m === 'CELLS' || m === 'OFFSET' || m === 'RESIZE') return xlGet(o, m, args); if(m === 'CLEARCONTENTS' || m === 'CLEAR'){ const { sh, r1, c1, r2, c2 } = r; for(const k of [...sh.cells.keys()]){ const [a, b] = k.split(',').map(Number); if(a >= r1 && a <= r2 && b >= c1 && b <= c2) sh.cells.delete(k); } return null; } return null;
      case 'Excel.Misc': return null;
    }
    return undefined; }
  // ---- FileSystemObject (tệp trong thư mục hỗ trợ của DVDCAD) ----
  const tsNew = (name, mode, text) => COM('TextStream', { name, mode, buf: mode === 'r' ? String(text || '').replace(/\r?\n$/, '').split(/\r?\n/).filter((x, i, a) => a.length > 1 || x !== '') : [], pos: 0, out: mode === 'a' ? String(text || '') : '' });
  async function fsoCall(o, m, args){ const r = o.ref, a0 = args.length ? toStr(plain(args[0])) : '', nm = base(a0);
    if(r.cls === 'Scripting.FileSystemObject'){
      switch(m){ case 'FILEEXISTS': return FS() && FS().get(nm) ? VT : VF; case 'FOLDEREXISTS': return VT;
        case 'CREATETEXTFILE': return tsNew(nm, 'w');
        case 'OPENTEXTFILE': { const md = args[1] != null ? toInt(args[1]) : 1; const f = FS() && FS().get(nm); if(md === 1 && !f){ if(args[2] && plain(args[2])) return tsNew(nm, 'w'); throw new LispErr('Không tìm thấy tệp ' + nm); } return tsNew(nm, md === 8 ? 'a' : md === 2 ? 'w' : 'r', f ? f.text : ''); }
        case 'DELETEFILE': if(FS()) await FS().del(nm); return null; case 'COPYFILE': { const f = FS() && FS().get(nm); if(f) await FS().put(base(toStr(plain(args[1]))), f.text); return null; }
        case 'MOVEFILE': { const f = FS() && FS().get(nm); if(f){ await FS().put(base(toStr(plain(args[1]))), f.text); await FS().del(nm); } return null; }
        case 'CREATEFOLDER': case 'DELETEFOLDER': return null;
        case 'GETFILE': { const f = FS() && FS().get(nm); if(!f) throw new LispErr('Không tìm thấy tệp ' + nm); return COM('File', { f }); }
        case 'GETFOLDER': return COM('Folder', { path: a0 });
        case 'GETFILENAME': return nm; case 'GETBASENAME': return nm.replace(/\.[^.]*$/, ''); case 'GETEXTENSIONNAME': return (/\.([^.]*)$/.exec(nm) || [, ''])[1];
        case 'GETPARENTFOLDERNAME': return a0.replace(/[\\/][^\\/]*$/, ''); case 'BUILDPATH': return a0.replace(/[\\/]$/, '') + '\\' + toStr(plain(args[1]));
        case 'GETSPECIALFOLDER': return COM('Folder', { path: ['C:\\Windows', 'C:\\Windows\\System32', 'C:\\DVDCAD\\Temp'][toInt(args[0] || mkInt(2))] || 'C:\\DVDCAD' });
        case 'GETTEMPNAME': return 'rad' + Math.random().toString(36).slice(2, 7).toUpperCase() + '.tmp'; case 'GETABSOLUTEPATHNAME': return a0; }
    }
    if(r.cls === 'TextStream'){
      switch(m){ case 'WRITELINE': r.out += (args.length ? toStr(plain(args[0])) : '') + '\r\n'; return null; case 'WRITE': r.out += toStr(plain(args[0])); return null; case 'WRITEBLANKLINES': r.out += '\r\n'.repeat(toInt(args[0])); return null;
        case 'READLINE': return r.pos < r.buf.length ? r.buf[r.pos++] : null; case 'READALL': { const s = r.buf.slice(r.pos).join('\r\n'); r.pos = r.buf.length; return s; } case 'READ': { const s = r.buf.slice(r.pos).join('\n').slice(0, toInt(args[0])); return s; } case 'SKIPLINE': r.pos++; return null;
        case 'CLOSE': if(r.mode !== 'r' && FS()) await FS().put(r.name, r.out); return null; }
    }
    if(r.cls === 'File'){ if(m === 'DELETE'){ if(FS()) await FS().del(r.f.name); return null; } if(m === 'OPENASTEXTSTREAM') return tsNew(r.f.name, toInt(args[0] || mkInt(1)) === 1 ? 'r' : 'w', r.f.text); }
    return undefined; }
  function fsoGet(o, p){ const r = o.ref;
    if(r.cls === 'TextStream'){ if(p === 'ATENDOFSTREAM' || p === 'ATENDOFLINE') return r.pos >= r.buf.length ? VT : VF; if(p === 'LINE') return mkInt(r.pos + 1); }
    if(r.cls === 'File'){ if(p === 'NAME') return r.f.name; if(p === 'PATH') return 'C:\\DVDCAD\\Support\\' + r.f.name; if(p === 'SIZE') return mkInt(String(r.f.text).length); if(p === 'DATELASTMODIFIED' || p === 'DATECREATED') return new Date().toLocaleString(); if(p === 'TYPE') return 'File'; }
    if(r.cls === 'Folder'){ if(p === 'PATH') return r.path; if(p === 'NAME') return base(r.path); if(p === 'FILES') return COM('Files', { list: FS() ? FS().list() : [] }); if(p === 'SUBFOLDERS') return COM('Files', { list: [] }); if(p === 'SELF') return o; }
    if(r.cls === 'Files'){ if(p === 'COUNT') return mkInt(r.list.length); }
    return undefined; }
  // ---- Dictionary ----
  function dictCall(o, m, args){ const D = o.ref.map, k = args.length ? JSON.stringify(plain(args[0])) : null;
    switch(m){ case 'ADD': if(D.has(k)) throw new LispErr('Khoá đã có'); D.set(k, [args[0], args[1]]); return null; case 'EXISTS': return D.has(k) ? VT : VF; case 'REMOVE': D.delete(k); return null; case 'REMOVEALL': D.clear(); return null;
      case 'KEYS': return new Variant(8204, new SArr(12, 0, D.size - 1, [...D.values()].map(x => x[0]))); case 'ITEMS': return new Variant(8204, new SArr(12, 0, D.size - 1, [...D.values()].map(x => x[1]))); case 'ITEM': return D.has(k) ? D.get(k)[1] : null; }
    return undefined; }
  // ---- WScript.Shell / Shell.Application ----
  const ENV = { USERNAME: 'User', COMPUTERNAME: 'DVDCAD-PC', USERPROFILE: 'C:\\Users\\User', APPDATA: 'C:\\Users\\User\\AppData\\Roaming', LOCALAPPDATA: 'C:\\Users\\User\\AppData\\Local', TEMP: 'C:\\DVDCAD\\Temp', TMP: 'C:\\DVDCAD\\Temp', PROGRAMFILES: 'C:\\Program Files', WINDIR: 'C:\\Windows', SYSTEMROOT: 'C:\\Windows' };
  async function shellCall(o, m, args){ const a0 = args.length ? toStr(plain(args[0])) : '';
    switch(m){
      case 'RUN': case 'EXEC': case 'SHELLEXECUTE': case 'OPEN': if(/^https?:\/\//i.test(a0.trim())){ try{ window.open(a0.trim(), '_blank'); }catch(_){} return mkInt(0); } log('DVDCAD không chạy chương trình Windows: ' + a0); return mkInt(0);
      case 'EXPANDENVIRONMENTSTRINGS': return a0.replace(/%([^%]+)%/g, (m0, k) => ENV[k.toUpperCase()] || m0);
      case 'REGREAD': return fn('VL-REGISTRY-READ')(a0.replace(/\\[^\\]*$/, ''), a0.replace(/^.*\\/, ''));
      case 'REGWRITE': return fn('VL-REGISTRY-WRITE')(a0.replace(/\\[^\\]*$/, ''), a0.replace(/^.*\\/, ''), args[1]);
      case 'REGDELETE': return null;
      case 'POPUP': await new Promise(res => A().dialog({ title: args[2] ? toStr(plain(args[2])) : 'DVDCAD', html: '<div class="acw" style="white-space:pre-wrap;max-width:460px">' + esc(a0) + '</div>', noCancel: true, ok: () => res(), cancel: () => res() })); return mkInt(1);
      case 'BROWSEFORFOLDER': return COM('Folder', { path: 'C:\\DVDCAD\\Support' });
      case 'NAMESPACE': return COM('Folder', { path: a0 });
    }
    return undefined; }
  function shellGet(o, p, args){ if(p === 'SPECIALFOLDERS'){ const k = args.length ? toStr(plain(args[0])).toUpperCase() : ''; return { DESKTOP: 'C:\\Users\\User\\Desktop', MYDOCUMENTS: 'C:\\Users\\User\\Documents', APPDATA: ENV.APPDATA, TEMPLATES: 'C:\\DVDCAD\\Template' }[k] || 'C:\\DVDCAD'; }
    if(p === 'ENVIRONMENT') return COM('Env', {}); if(p === 'CURRENTDIRECTORY') return 'C:\\DVDCAD'; return undefined; }
  // ---- tạo đối tượng COM ----
  function create(progid){ const id = String(toStr(progid)).trim().toLowerCase().replace(/\.\d+$/, '');
    if(id === 'excel.application'){ if(!xlApp) xlApp = { books: [], active: null, visible: false }; return COM('Excel.Application', { app: xlApp }); }
    if(id === 'scripting.filesystemobject') return COM('Scripting.FileSystemObject');
    if(id === 'scripting.dictionary') return COM('Scripting.Dictionary', { map: new Map() });
    if(id === 'wscript.shell') return COM('WScript.Shell'); if(id === 'shell.application') return COM('Shell.Application');
    if(id === 'wscript.network') return COM('WScript.Network');
    if(/^autocad\.application/.test(id)) return AX.APP;
    return null; }
  BI(['VLAX-CREATE-OBJECT', 'VLAX-GET-OR-CREATE-OBJECT'], p => { const o = create(p); if(!o) log('COM "' + toStr(p) + '" không có trong DVDCAD (chỉ Excel.Application, Scripting.FileSystemObject, Scripting.Dictionary, WScript.Shell, Shell.Application).'); return o; });
  BI('VLAX-GET-OBJECT', p => { const id = String(toStr(p)).toLowerCase(); if(/^excel\.application/.test(id)) return xlApp ? COM('Excel.Application', { app: xlApp }) : null; if(/^autocad\.application/.test(id)) return AX.APP; return null; });
  // điều phối: đối tượng COM thì xử lý ở đây, còn lại để ActiveX của AutoCAD
  const isCom = o => o instanceof VObj && o.kind === 'com';
  const PN = p => String(p instanceof Sym ? p.n : toStr(p)).toUpperCase();
  async function comGet(o, p, args){ const r = o.ref; let v;
    if(/^Excel\./.test(r.cls)) v = xlGet(o, p, args); else if(r.cls === 'WScript.Shell' || r.cls === 'Shell.Application') v = shellGet(o, p, args); else if(r.cls === 'WScript.Network') v = p === 'USERNAME' ? ENV.USERNAME : p === 'COMPUTERNAME' ? ENV.COMPUTERNAME : undefined;
    else if(r.cls === 'Scripting.Dictionary'){ if(p === 'COUNT') v = mkInt(r.map.size); else if(p === 'ITEM') v = dictCall(o, 'ITEM', args); else if(p === 'KEYS' || p === 'ITEMS') v = dictCall(o, p, []); }
    else v = fsoGet(o, p);
    if(v === undefined) throw new LispErr('COM ' + r.cls + ': không có thuộc tính ' + p); return v; }
  async function comPut(o, p, args, v){ const r = o.ref; if(/^Excel\./.test(r.cls)) return xlPut(o, p, args, v); if(r.cls === 'Scripting.Dictionary' && p === 'ITEM'){ const k = JSON.stringify(plain(args[0])); r.map.set(k, [args[0], v]); return v; } return v; }
  async function comCall(o, m, args){ const r = o.ref; let v;
    if(/^Excel\./.test(r.cls)) v = xlCall(o, m, args); else if(r.cls === 'Scripting.Dictionary') v = dictCall(o, m, args); else if(r.cls === 'WScript.Shell' || r.cls === 'Shell.Application') v = await shellCall(o, m, args); else v = await fsoCall(o, m, args);
    if(v === undefined){ v = await comGet(o, m, args).catch(() => undefined); if(v === undefined) throw new LispErr('COM ' + r.cls + ': không có phương thức ' + m); }
    return await v; }
  const gp0 = fn('VLAX-GET-PROPERTY'), pp0 = fn('VLAX-PUT-PROPERTY'), im0 = fn('VLAX-INVOKE-METHOD'), iv0 = fn('VLAX-INVOKE'), g0 = fn('VLAX-GET'), p0 = fn('VLAX-PUT');
  BI('VLAX-GET-PROPERTY', (o, p, ...a) => isCom(o) ? comGet(o, PN(p), a) : gp0(o, p, ...a));
  BI('VLAX-PUT-PROPERTY', (o, p, ...a) => { if(!isCom(o)) return pp0(o, p, ...a); const v = a.pop(); return comPut(o, PN(p), a, v); });
  BI('VLAX-INVOKE-METHOD', (o, m, ...a) => isCom(o) ? comCall(o, PN(m), a) : im0(o, m, ...a));
  BI('VLAX-INVOKE', (o, m, ...a) => isCom(o) ? comCall(o, PN(m), a).then(AX.cleanV) : iv0(o, m, ...a));
  BI('VLAX-GET', (o, p, ...a) => isCom(o) ? comGet(o, PN(p), a).then(AX.cleanV) : g0(o, p, ...a));
  BI('VLAX-PUT', (o, p, ...a) => { if(!isCom(o)) return p0(o, p, ...a); const v = a.pop(); return comPut(o, PN(p), a, v); });
  { const rl0 = fn('VLAX-RELEASE-OBJECT'); BI('VLAX-RELEASE-OBJECT', o => isCom(o) ? null : rl0(o)); }
  BI('VLAX-OBJECT-RELEASED-P', () => null);
  // vlax-import-type-library: tiền tố tự đặt → hàm get / put / phương thức
  const PREF = [];
  BI('VLAX-IMPORT-TYPE-LIBRARY', (...a) => { const o = {}; for(let i = 0; i < a.length - 1; i++){ const k = a[i] instanceof Sym ? a[i].n : ''; if(/^:(METHODS|PROPERTIES|CONSTANTS)-PREFIX$/.test(k)) o[k.slice(1, -7)] = toStr(a[i + 1]).toUpperCase(); } if(o.METHODS || o.PROPERTIES) PREF.push(o); return T; });
  { const gHas = G.has.bind(G), gGet = G.get.bind(G);
    const synth = k => { for(const o of PREF){ if(o.PROPERTIES && k.startsWith(o.PROPERTIES + 'GET-')){ const P = k.slice(o.PROPERTIES.length + 4); return (ob, ...a) => fn('VLAX-GET-PROPERTY')(ob, P, ...a); } if(o.PROPERTIES && k.startsWith(o.PROPERTIES + 'PUT-')){ const P = k.slice(o.PROPERTIES.length + 4); return (ob, ...a) => fn('VLAX-PUT-PROPERTY')(ob, P, ...a); } if(o.METHODS && k.startsWith(o.METHODS) && k.length > o.METHODS.length){ const M = k.slice(o.METHODS.length); return (ob, ...a) => fn('VLAX-INVOKE-METHOD')(ob, M, ...a); } } return undefined; };
    G.has = k => gHas(k) || (typeof k === 'string' && PREF.length > 0 && synth(k) !== undefined);
    G.get = k => { let v = gGet(k); if(v === undefined && typeof k === 'string' && PREF.length){ v = synth(k); if(v !== undefined){ v.lname = k; G.set(k, v); } } return v; }; }
  const strO = X.str; X.str = (x, p) => isCom(x) ? '#<VLA-OBJECT _' + String(x.ref.cls).replace(/^.*\./, '') + '>' : strO(x, p);

  /* ==================================================================
     3) DOSLib (các hàm hay dùng)
     ================================================================== */
  const ask = (title, html, onOk) => new Promise(res => A().dialog({ title, html: '<div class="acw" style="min-width:320px;max-width:560px">' + html + '</div>', ok: r => res(onOk(r)), cancel: () => res(null) }));
  const optList = (l, multi, sel) => '<select id="dsL"' + (multi ? ' multiple' : '') + ' size="' + Math.min(14, Math.max(4, l.length)) + '" style="width:100%">' + l.map((x, i) => '<option value="' + i + '"' + ((sel || []).includes(i) ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
  BI('DOS_MSGBOX', (msg, title, btn, icon) => new Promise(res => { const b = btn == null ? 0 : toInt(btn); const sets = [[['OK', 1]], [['OK', 1], ['Cancel', 2]], [['Abort', 3], ['Retry', 4], ['Ignore', 5]], [['Yes', 6], ['No', 7], ['Cancel', 2]], [['Yes', 6], ['No', 7]], [['Retry', 4], ['Cancel', 2]]][b] || [['OK', 1]];
    const d = A().dialog({ title: title ? toStr(title) : 'DVDCAD', html: '<div class="acw"><div style="white-space:pre-wrap;max-width:480px;margin-bottom:10px">' + esc(toStr(msg)) + '</div><div style="display:flex;gap:6px;justify-content:flex-end">' + sets.map(([t, v]) => '<button type="button" class="acw-btn" data-v="' + v + '">' + t + '</button>').join('') + '</div></div>', noOk: true, noCancel: true, cancel: () => res(mkInt(2)) });
    const r = d && d.root; if(r) r.querySelectorAll('[data-v]').forEach(btn0 => btn0.onclick = () => { try{ d.close(); }catch(_){} res(mkInt(+btn0.dataset.v)); }); }));
  BI('DOS_GETSTRING', (title, prompt, def) => ask(toStr(title || 'DVDCAD'), '<label>' + esc(toStr(prompt || '')) + '<input id="dsS" style="width:100%" value="' + esc(def == null ? '' : toStr(def)) + '"></label>', r => r.querySelector('#dsS').value));
  BI(['DOS_GETINT', 'DOS_GETREAL'], (title, prompt, flags, def) => ask(toStr(title || 'DVDCAD'), '<label>' + esc(toStr(prompt || '')) + '<input id="dsS" style="width:100%" value="' + esc(def == null ? '' : str(def)) + '"></label>', r => { const n = parseFloat(String(r.querySelector('#dsS').value).replace(',', '.')); return isFinite(n) ? (Number.isInteger(n) ? mkInt(n) : n) : null; }));
  BI('DOS_LISTBOX', (title, prompt, l, def) => { const a = (L(l) || []).map(toStr); return ask(toStr(title || 'DVDCAD'), '<div>' + esc(toStr(prompt || '')) + '</div>' + optList(a, false, def != null ? [a.indexOf(toStr(def))] : [0]), r => { const i = r.querySelector('#dsL').selectedIndex; return i >= 0 ? a[i] : null; }); });
  BI('DOS_MULTILIST', (title, prompt, l, def) => { const a = (L(l) || []).map(toStr); return ask(toStr(title || 'DVDCAD'), '<div>' + esc(toStr(prompt || '')) + '</div>' + optList(a, true), r => { const s = [...r.querySelector('#dsL').selectedOptions].map(o => a[+o.value]); return s.length ? s : null; }); });
  BI('DOS_CHECKLIST', (title, prompt, l) => { const items = (L(l) || []).map(p => p instanceof DP ? [toStr(p.a), truthy(p.d) && !(p.d instanceof LI && Number(p.d.v) === 0)] : [toStr(p), false]);
    return ask(toStr(title || 'DVDCAD'), '<div>' + esc(toStr(prompt || '')) + '</div><div style="max-height:320px;overflow:auto">' + items.map(([t, on], i) => '<label style="display:block"><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + ' style="width:auto"> ' + esc(t) + '</label>').join('') + '</div>', r => items.map(([t], i) => new DP(t, r.querySelector('[data-i="' + i + '"]').checked ? T : null))); });
  BI(['DOS_GETDIR'], () => 'C:\\DVDCAD\\Support\\');
  BI(['DOS_GETFILED', 'DOS_GETFILENAV', 'DOS_GETFILEM'], (title, dir, filter) => fn('GETFILED')(title || 'Chọn tệp', '', String(toStr(filter || '*')).replace(/^.*\|/, '').replace(/\*\./g, '').replace(/;/g, ';'), mkInt(0)));
  BI(['DOS_FILEP'], f => FS() && FS().get(base(toStr(f))) ? T : null); BI(['DOS_DIRP'], () => T);
  BI('DOS_DIR', (spec) => { const re = new RegExp('^' + base(toStr(spec || '*.*')).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); const l = (FS() ? FS().list() : []).map(f => f.name).filter(n => re.test(n)); return l.length ? l : null; });
  BI('DOS_DELETE', async f => { if(FS()) await FS().del(base(toStr(f))); return T; }); BI('DOS_COPY', async (a, b) => { const f = FS() && FS().get(base(toStr(a))); if(!f) return null; await FS().put(base(toStr(b)), f.text); return T; });
  BI('DOS_STRTOKENS', (s, d) => { const l = toStr(s).split(new RegExp('[' + String(toStr(d || ' ')).replace(/[\]\\^-]/g, '\\$&') + ']+')).filter(x => x !== ''); return l.length ? l : null; });
  BI('DOS_STRREPLACE', (s, a, b) => toStr(s).split(toStr(a)).join(toStr(b))); BI('DOS_STRTRIM', s => toStr(s).trim()); BI('DOS_STRTRIMLEFT', s => toStr(s).replace(/^\s+/, '')); BI('DOS_STRTRIMRIGHT', s => toStr(s).replace(/\s+$/, ''));
  BI('DOS_STRCASE', (s, m) => { const t = toStr(s); const k = m == null ? 0 : toInt(m); return k === 1 ? t.toLowerCase() : k === 2 ? t.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) : t.toUpperCase(); });
  BI('DOS_PROPER', s => toStr(s).replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()));
  BI('DOS_STRLEFT', (s, n) => toStr(s).slice(0, toInt(n))); BI('DOS_STRRIGHT', (s, n) => toStr(s).slice(-toInt(n))); BI('DOS_STRMID', (s, i, n) => toStr(s).substr(toInt(i), n == null ? undefined : toInt(n)));
  BI('DOS_STRREVERSE', s => [...toStr(s)].reverse().join('')); BI('DOS_STRFIND', (s, t) => { const i = toStr(s).indexOf(toStr(t)); return i >= 0 ? mkInt(i) : null; });
  BI('DOS_STRISALPHA', s => /^[A-Za-zÀ-ỹ]+$/.test(toStr(s)) ? T : null); BI('DOS_STRISDIGIT', s => /^\d+$/.test(toStr(s)) ? T : null);
  BI('DOS_SORTLIST', (l, m) => { const a = (L(l) || []).slice(); a.sort((x, y) => String(str(x)).localeCompare(String(str(y)), undefined, { numeric: true })); return a.length ? a : null; });
  BI('DOS_VERSION', () => [mkInt(9), mkInt(0), mkInt(0), mkInt(0)]); BI('DOS_COMPUTER', () => ENV.COMPUTERNAME); BI('DOS_USERNAME', () => ENV.USERNAME);
  BI('DOS_CLIPBOARD', async s => { if(s != null){ try{ await navigator.clipboard.writeText(toStr(s)); }catch(_){} return T; } try{ return await navigator.clipboard.readText(); }catch(_){ return null; } });
  BI('DOS_SPLASH', () => T); BI('DOS_BEEP', () => T); BI('DOS_PAUSE', ms => new Promise(r => setTimeout(() => r(T), Math.min(10000, toInt(ms || mkInt(0)))))); BI('DOS_WAITCURSOR', () => T);
  BI('DOS_SHELLEXE', f => { const s = toStr(f); if(/^https?:/i.test(s)) try{ window.open(s, '_blank'); }catch(_){} return T; });
  BI('DOS_ISAPPLOADED', () => null); BI('DOS_HTMLBOX', (t, html) => ask(toStr(t || 'DVDCAD'), '<div style="max-height:420px;overflow:auto">' + esc(toStr(html)).replace(/\n/g, '<br>') + '</div>', () => T));
  BI('DOS_GETCOLOR', c => fn('ACAD_COLORDLG')(c));
  BI('DOS_PROGBAR', () => T); BI('DOS_GETPROGBAR', () => T);

  // TRUSTEDPATHS: theo OPTIONS › Tệp › Vị trí tin cậy
  { const gv0 = fn('GETVAR'), sv1 = fn('SETVAR'); BI('GETVAR', n => toStr(n).toUpperCase() === 'TRUSTEDPATHS' ? (() => { try{ return localStorage.getItem('dvd:trusted') || ''; }catch(_){ return ''; } })() : gv0(n));
    BI('SETVAR', (n, v) => { if(toStr(n).toUpperCase() === 'TRUSTEDPATHS'){ try{ localStorage.setItem('dvd:trusted', toStr(v)); }catch(_){} return v; } return sv1(n, v); }); }
  // STARTAPP: mở đường link (ứng dụng Windows thì báo)
  BI('STARTAPP', (app, f) => { const s = toStr(app) + (f ? ' ' + toStr(f) : ''); const m = /https?:\/\/\S+/i.exec(s); if(m){ try{ window.open(m[0], '_blank'); }catch(_){} return mkInt(33); } log('DVDCAD không chạy chương trình Windows: ' + s); return null; });
})();
