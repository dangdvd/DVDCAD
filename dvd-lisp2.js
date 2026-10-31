/* DVDCAD v6e — mở rộng AutoLISP để chạy các bộ tiện ích LISP viết cho AutoCAD:
   · Kho tệp hỗ trợ (support files): .lsp / .dcl / .txt / .lin / .pat … nạp cả thư mục, lưu trên máy (IndexedDB)
     → findfile, load, load_dialog, open / read-line / write-line, vl-file-*, vl-directory-files, getfiled
   · DCL: load_dialog, new_dialog, start_dialog, done_dialog, action_tile, set_tile, get_tile, mode_tile, start_list / add_list / end_list,
     start_image / fill_image / vector_image / end_image, dimx_tile / dimy_tile, get_attr, client_data_tile, term_dialog (tile của base.dcl)
   · ActiveX tập con: vlax-get-acad-object, vla-get-* / vla-put-* (thuộc tính), vla-Add* / vla-Move / vla-Delete… (phương thức), vlax-for,
     vlax-get / vlax-put / vlax-invoke, safearray / variant, vlax-ename->vla-object, vlax-curve-* (tham số như AutoCAD)
   · Hàm còn thiếu: grread, grdraw, tblnext, tblobjname, trans, osnap, textbox, getcfg / setcfg, acad_colordlg, autoload, vl-string-*,
     getpropertyvalue / setpropertyvalue, vlr-* (chưa phát sinh sự kiện) …
   Không chạy được: LISP đã biên dịch (.fas / .vlx) và add-in nhị phân (.arx / .dll / .dvb) — chỉ chạy trên AutoCAD. */
(function(){
  'use strict';
  const X = window.DVDLisp && DVDLisp.ext; if(!X || DVDLisp._v6e) return; DVDLisp._v6e = true;
  const { BI, SPECIAL, G, ev, apply, progn, withBindings, Sym, LI, DP, Ename, SS, LispErr, T, mkInt, toReal, toInt, toStr, pt, lpt, L, nv, isNum, truthy, str, sym, entsOf, ename, entget, ME, typeName, ask, gc, getv, setv, parse, loadSource } = X;
  const A = () => window.DVDAcad;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const log = m => { try{ A().log(m); }catch(_){} };
  const base = n => String(n || '').replace(/\\/g, '/').split('/').pop();
  const key = n => base(n).toLowerCase();

  /* ==================================================================
     1) KHO TỆP HỖ TRỢ (support files) — như các thư mục Support File Search Path của AutoCAD
     ================================================================== */
  const VFS = new Map();   // tên thường (không đường dẫn) → { name, text, folder }
  const IDB = 'dvdcad-lispfs'; let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => { try{ const r = indexedDB.open(IDB, 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }catch(err){ rej(err); } }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('f', mode), s = t.objectStore('f'); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
  async function fsPut(name, text, folder){ const o = { name: base(name), text: String(text), folder: folder || '' }; VFS.set(key(name), o); try{ await tx('readwrite', s => s.put(o, key(name))); }catch(_){} return o; }
  async function fsDel(name){ VFS.delete(key(name)); try{ await tx('readwrite', s => s.delete(key(name))); }catch(_){} }
  const fsReady = (async () => { try{ const d = await db(); await new Promise(res => { const t = d.transaction('f', 'readonly'), q = t.objectStore('f').openCursor(); q.onsuccess = () => { const c = q.result; if(!c){ res(); return; } VFS.set(c.key, c.value); c.continue(); }; q.onerror = () => res(); }); }catch(_){} })();
  const fsGet = n => VFS.get(key(n)) || null;
  const TEXT_EXT = /\.(lsp|dcl|txt|lin|pat|csv|mnl|scr|ini|dat|cfg|xml|json|mnu|mns|shp|sld?)$/i;
  DVDLisp.fs = { put: fsPut, get: fsGet, del: fsDel, list: () => [...VFS.values()], ready: fsReady, TEXT_EXT };

  BI('FINDFILE', n => { const s = toStr(n); const f = fsGet(s); if(f) return (f.folder ? f.folder + '/' : '') + f.name; const k = base(s).toUpperCase().replace(/\.LSP$/, ''); if(X.files.has(k)) return base(s); return null; });
  BI('FINDTRUSTEDFILE', n => getv(sym('FINDFILE'))(n));
  // (load "ten") tìm trong kho tệp hỗ trợ trước, rồi tới các tệp đã nạp / add-in
  const load0 = G.get('LOAD');
  BI('LOAD', async (n, onFail) => { const s = toStr(n); const cand = [s, s + '.lsp', s + '.LSP']; for(const c of cand){ const f = fsGet(c); if(f && /\.lsp$/i.test(f.name)) return loadSource(f.text, f.name); }
    if(/\.(fas|vlx)$/i.test(s)){ const msg = 'LOAD: "' + base(s) + '" là LISP đã biên dịch của AutoCAD (.fas / .vlx) — DVDCAD chỉ chạy được mã nguồn .lsp.'; if(onFail !== undefined) return onFail; throw new LispErr(msg); }
    return load0(n, onFail); });
  // autoload: lệnh được đăng ký ngay, gọi lần đầu thì nạp tệp rồi chạy
  BI('AUTOLOAD', (f, cmds) => { const file = toStr(f); for(const c of L(cmds)){ const nm = toStr(c).toUpperCase(); if(getv(sym('C:' + nm))) continue;
      try{ DVDCmd.register([nm], 'AutoLISP (tự nạp ' + base(file) + ')', async () => { await DVDLisp.load('(load ' + JSON.stringify(file) + ')', null); const fn = getv(sym('C:' + nm)); if(fn) await DVDLisp.eval('(C:' + nm + ')'); }, { lisp: true }); }catch(_){} } return null; });
  BI(['AUTOARXLOAD', 'ARXLOAD', 'ARX', 'ARXUNLOAD', 'VL-ARX-IMPORT', 'VL-VBALOAD', 'VL-VBARUN', 'DOTNETLOAD'], (...a) => { log('AutoLISP: add-in nhị phân (.arx / .dll / .dvb) chỉ chạy trên AutoCAD — bỏ qua ' + (a[0] != null ? str(a[0]) : '') + '.'); return null; });

  // tệp: open / close / read-line / read-char / write-line / write-char (ghi vào kho tệp, lưu trên máy)
  class LFile { constructor(name, mode, text){ this.name = name; this.mode = mode; this.text = text || ''; this.pos = 0; this.open = true; } }
  BI('OPEN', (n, m) => { const name = toStr(n), mode = toStr(m).toLowerCase(); const f = fsGet(name);
    if(mode[0] === 'r'){ if(!f) return null; return new LFile(name, 'r', f.text.replace(/\r\n/g, '\n')); }
    if(mode[0] === 'a') return new LFile(name, 'a', f ? f.text.replace(/\r\n/g, '\n') : ''); return new LFile(name, 'w', ''); });
  const fileArg = f => { if(!(f instanceof LFile) || !f.open) throw new LispErr('bad argument type: streamp ' + str(f)); return f; };
  BI('CLOSE', f => { fileArg(f); f.open = false; if(f.mode !== 'r') fsPut(f.name, f.text, (fsGet(f.name) || {}).folder); return null; });
  BI('READ-LINE', f => { if(f === undefined) return null; fileArg(f); if(f.pos >= f.text.length) return null; let j = f.text.indexOf('\n', f.pos); if(j < 0) j = f.text.length; const s = f.text.slice(f.pos, j); f.pos = j + 1; return s; });
  BI('READ-CHAR', f => { if(f === undefined) return mkInt(10); fileArg(f); if(f.pos >= f.text.length) return null; return mkInt(f.text.charCodeAt(f.pos++)); });
  BI('PEEK-CHAR', f => { fileArg(f); return f.pos < f.text.length ? mkInt(f.text.charCodeAt(f.pos)) : null; });
  BI('WRITE-LINE', (s, f) => { if(f instanceof LFile){ fileArg(f); f.text += toStr(s) + '\n'; } else X.out(toStr(s) + '\n'); return s; });
  BI('WRITE-CHAR', (c, f) => { const ch = String.fromCharCode(toInt(c)); if(f instanceof LFile){ fileArg(f); f.text += ch; } else X.out(ch); return c; });
  const princ0 = G.get('PRINC'), prin10 = G.get('PRIN1'), print0 = G.get('PRINT');
  BI('PRINC', (x, f) => { if(f instanceof LFile){ fileArg(f); f.text += str(x, true); return x; } return princ0(x); });
  BI('PRIN1', (x, f) => { if(f instanceof LFile){ fileArg(f); f.text += str(x); return x; } return prin10(x); });
  BI('PRINT', (x, f) => { if(f instanceof LFile){ fileArg(f); f.text += '\n' + str(x) + ' '; return x; } return print0(x); });
  BI('VL-FILE-DELETE', n => { if(!fsGet(toStr(n))) return null; fsDel(toStr(n)); return T; });
  BI('VL-FILE-RENAME', (a, b) => { const f = fsGet(toStr(a)); if(!f || fsGet(toStr(b))) return null; fsPut(toStr(b), f.text, f.folder); fsDel(toStr(a)); return T; });
  BI('VL-FILE-COPY', (a, b, app) => { const f = fsGet(toStr(a)); if(!f) return null; const g = fsGet(toStr(b)); fsPut(toStr(b), (truthy(app) && g ? g.text : '') + f.text, f.folder); return mkInt(f.text.length); });
  BI('VL-FILE-SIZE', n => { const f = fsGet(toStr(n)); return f ? mkInt(new TextEncoder().encode(f.text).length) : null; });
  BI('VL-FILE-DIRECTORY-P', n => { const s = toStr(n).replace(/[\\/]+$/, ''); return [...VFS.values()].some(f => f.folder && (f.folder === s || f.folder.endsWith('/' + base(s)))) ? T : null; });
  BI('VL-FILE-SYSTIME', n => fsGet(toStr(n)) ? (() => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDay(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), 0].map(mkInt); })() : null);
  BI('VL-DIRECTORY-FILES', (dir, pat, mode) => { const md = mode === undefined ? 0 : toInt(mode); if(md < 0) return null; const p = pat == null ? '*.*' : toStr(pat); const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    const r = [...VFS.values()].filter(f => re.test(f.name)).map(f => f.name); return r.length ? r : null; });
  BI('VL-MKDIR', () => T);
  BI('VL-FILENAME-BASE', n => base(toStr(n)).replace(/\.[^.]*$/, ''));
  BI('VL-FILENAME-EXTENSION', n => { const m = /(\.[^.\\/]*)$/.exec(base(toStr(n))); return m ? m[1] : null; });
  BI('VL-FILENAME-DIRECTORY', n => { const s = toStr(n), i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\')); return i >= 0 ? s.slice(0, i) : ''; });
  BI('VL-FILENAME-MKTEMP', (p, d, e) => 'tmp' + Date.now().toString(36) + (e != null ? toStr(e) : ''));
  // hộp chọn tệp: đọc (flag 0 / 2…) → chọn tệp trên máy, đưa vào kho; ghi (flag 1) → tên tệp trong kho
  BI('GETFILED', async (title, def, ext, flags) => { const fl = flags == null ? 0 : toInt(flags), e = ext == null ? '' : toStr(ext);
    if(fl & 1){ const r = await ask('str', toStr(title) + ' — tên tệp', { def: toStr(def || '') }); const s = r.str || toStr(def || ''); return s ? (s.includes('.') || !e ? s : s + '.' + e) : null; }
    return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; if(e) inp.accept = e.split(';').map(x => '.' + x.replace(/^\*?\.?/, '')).join(','); let done = false;
      inp.onchange = async () => { done = true; const f = inp.files[0]; if(!f){ res(null); return; } await fsPut(f.name, await f.text()); res(f.name); }; window.addEventListener('focus', () => setTimeout(() => { if(!done) res(null); }, 800), { once: true }); inp.click(); }); });

  /* ==================================================================
     2) DCL — Dialog Control Language
     ================================================================== */
  function dclTokens(src){ const t = []; let i = 0; const n = src.length;
    while(i < n){ const c = src[i];
      if(/\s/.test(c)){ i++; continue; }
      if(c === '/' && src[i + 1] === '/'){ while(i < n && src[i] !== '\n') i++; continue; }
      if(c === '/' && src[i + 1] === '*'){ const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
      if(c === '"'){ let s = ''; i++; while(i < n && src[i] !== '"'){ if(src[i] === '\\' && i + 1 < n){ const d = src[++i]; s += d === 'n' ? '\n' : d === 't' ? '\t' : d; } else s += src[i]; i++; } i++; t.push({ s }); continue; }
      if('{}:=;'.includes(c)){ t.push({ p: c }); i++; continue; }
      let j = i; while(j < n && !/[\s{}:=;"]/.test(src[j])) j++; t.push({ w: src.slice(i, j) }); i = j; }
    return t; }
  // định nghĩa: { name, proto, attrs, kids } (kids: { proto, attrs, kids } hoặc { ref })
  function dclParse(src, defs){ const t = dclTokens(src); let i = 0;
    const val = () => { const x = t[i++]; if(!x) return ''; if(x.s != null) return x.s; const w = x.w; return /^-?\d+(\.\d+)?$/.test(w) ? +w : w.toLowerCase(); };
    function body(){ const attrs = {}, kids = [];
      while(i < t.length && !(t[i].p === '}')){ const x = t[i];
        if(x.p === ';'){ i++; continue; }
        if(x.p === ':'){ i++; const proto = (t[i++].w || '').toLowerCase(); let a = {}, k = []; if(t[i] && t[i].p === '{'){ i++; const b = body(); a = b.attrs; k = b.kids; i++; } kids.push({ proto, attrs: a, kids: k }); continue; }
        if(x.w && t[i + 1] && t[i + 1].p === '='){ i += 2; attrs[x.w.toLowerCase()] = val(); continue; }
        if(x.w && t[i + 1] && t[i + 1].p === ':'){ const nm = x.w.toLowerCase(); i += 2; const proto = (t[i++].w || '').toLowerCase(); let a = {}, k = []; if(t[i] && t[i].p === '{'){ i++; const b = body(); a = b.attrs; k = b.kids; i++; } kids.push({ proto, attrs: Object.assign({ key: nm }, a), kids: k }); continue; }
        if(x.w){ i++; kids.push({ ref: x.w.toLowerCase() }); continue; }
        i++; }
      return { attrs, kids }; }
    while(i < t.length){ const x = t[i];
      if(x.w === '@include'){ i++; const f = t[i++]; const inc = f && f.s != null ? fsGet(f.s) : null; if(inc) dclParse(inc.text, defs); continue; }
      if(x.w && t[i + 1] && t[i + 1].p === ':'){ const name = x.w.toLowerCase(); i += 2; const proto = (t[i++].w || '').toLowerCase(); let attrs = {}, kids = []; if(t[i] && t[i].p === '{'){ i++; const b = body(); attrs = b.attrs; kids = b.kids; i++; } defs[name] = { name, proto, attrs, kids }; continue; }
      i++; }
    return defs; }
  // base.dcl (rút gọn): nút OK / Huỷ / Trợ giúp, ô báo lỗi
  // nút chuẩn của base.dcl theo ngôn ngữ giao diện (chữ trong hộp thoại LISP không bị tự dịch)
  const BASE_EN = { 'Huỷ': 'Cancel', 'Trợ giúp…': 'Help…', 'Thông tin…': 'Info…' };
  const baseLab = l => (window.DVDI18N && DVDI18N.lang === 'en' && BASE_EN[l]) || l;
  const BASE = dclParse(`
    ok_button : retirement_button { label = "OK"; key = "accept"; is_default = true; }
    cancel_button : retirement_button { label = "Huỷ"; key = "cancel"; is_cancel = true; }
    help_button : retirement_button { label = "Trợ giúp…"; key = "help"; is_help = true; }
    info_button : retirement_button { label = "Thông tin…"; key = "info"; }
    retirement_button : button { fixed_width = true; width = 8; alignment = centered; }
    errtile : text { label = ""; key = "error"; width = 35; is_error_tile = true; }
    ok_only : column { : row { fixed_width = true; alignment = centered; ok_button; } }
    ok_cancel : column { : row { fixed_width = true; alignment = centered; ok_button; cancel_button; } }
    ok_cancel_help : column { : row { fixed_width = true; alignment = centered; ok_button; cancel_button; help_button; } }
    ok_cancel_help_info : column { : row { fixed_width = true; alignment = centered; ok_button; cancel_button; help_button; info_button; } }
    ok_cancel_help_errtile : column { ok_cancel_help; errtile; }
    spacer_0 : spacer { width = 0; height = 0; } spacer_1 : spacer { width = 1; height = 1; }
    default_button : button { is_default = true; } default_dcl_settings : dialog { }`, {});
  const PRIM = new Set(['dialog', 'row', 'column', 'boxed_row', 'boxed_column', 'radio_row', 'radio_column', 'boxed_radio_row', 'boxed_radio_column', 'button', 'edit_box', 'list_box', 'popup_list', 'toggle', 'radio_button', 'text', 'text_part', 'paragraph', 'concatenation', 'spacer', 'image', 'image_button', 'slider']);
  // giải tile: theo chuỗi nguyên mẫu (người dùng → base.dcl → kiểu gốc), gộp thuộc tính, con
  function resolve(node, defs, depth){ if(depth > 40) return null;
    if(node.ref){ const d = defs[node.ref] || BASE[node.ref]; if(!d){ if(PRIM.has(node.ref)) return { type: node.ref, attrs: {}, kids: [] }; return null; } return resolve({ proto: d.proto, attrs: d.attrs, kids: d.kids }, defs, depth + 1); }
    let type = node.proto, attrs = Object.assign({}, node.attrs), kids = node.kids || [];
    while(!PRIM.has(type)){ const d = defs[type] || BASE[type]; if(!d) return null; attrs = Object.assign({}, d.attrs, attrs); if(!kids.length && d.kids.length) kids = d.kids; type = d.proto; if(++depth > 40) return null; }
    return { type, attrs, kids: kids.map(k => resolve(k, defs, depth + 1)).filter(Boolean) }; }

  const DCLS = new Map(); let dclSeq = 0, CUR = null;
  BI('LOAD_DIALOG', n => { const f = fsGet(toStr(n)) || fsGet(toStr(n) + '.dcl'); if(!f){ log('load_dialog: không tìm thấy "' + base(toStr(n)) + '" — nạp tệp .dcl cùng tệp .lsp (APPLOAD › Thư mục hỗ trợ).'); return mkInt(-1); }
    const id = ++dclSeq; DCLS.set(id, dclParse(f.text, {})); return mkInt(id); });
  BI('UNLOAD_DIALOG', id => { DCLS.delete(toInt(id)); return null; });
  const CH = 7.2, LH = 22;   // 1 đơn vị bề rộng DCL ≈ bề rộng ký tự, 1 đơn vị cao ≈ 1 dòng
  function build(tile, D, radioName){ const a = tile.attrs, k = a.key != null ? String(a.key) : null, lab = a.label != null ? String(a.label) : '', dis = a.is_enabled === 'false', w = +a.width || 0, h = +a.height || 0;
    const st = []; if(w) st.push((a.fixed_width === 'true' ? 'width:' : 'min-width:') + Math.round(w * CH) + 'px'); if(h && !/^(row|column|boxed_|radio_)/.test(tile.type)) st.push('min-height:' + Math.round(h * LH) + 'px');
    if(a.alignment === 'centered') st.push('align-self:center'); else if(a.alignment === 'right' || a.alignment === 'bottom') st.push('align-self:flex-end');
    const reg = (el, kind) => { if(k == null) return el; D.tiles.set(k, { el, kind, attrs: a, tile }); el.dataset.dclKey = k; return el; };
    const mk = (tag, cls, html) => { const e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; if(st.length) e.style.cssText += st.join(';'); return e; };
    const kidsOf = (el, rn) => { for(const c of tile.kids){ const x = build(c, D, rn); if(x) el.appendChild(x); } return el; };
    switch(tile.type){
      case 'row': case 'column': case 'boxed_row': case 'boxed_column': case 'radio_row': case 'radio_column': case 'boxed_radio_row': case 'boxed_radio_column': case 'concatenation': case 'paragraph': {
        const boxed = /^boxed_/.test(tile.type), radio = /radio_/.test(tile.type), horiz = /row$/.test(tile.type) || tile.type === 'concatenation';
        const el = mk(boxed ? 'fieldset' : 'div', 'dcl-grp ' + (horiz ? 'dcl-row' : 'dcl-col') + (boxed ? ' acw-grp' : '')); if(boxed && lab) el.innerHTML = '<legend>' + esc(lab) + '</legend>';
        const rn = radio ? (k || 'r' + (++D.seq)) : radioName; kidsOf(el, rn); if(radio && k != null) reg(el, 'radio'); if(dis) el.querySelectorAll('input,button,select').forEach(x => x.disabled = true); return el; }
      case 'button': { const el = mk('button', 'acw-btn dcl-btn', esc(baseLab(lab))); el.type = 'button'; if(a.is_default === 'true') el.dataset.def = '1'; if(a.is_cancel === 'true') el.dataset.cancel = '1'; el.disabled = dis; return reg(el, 'button'); }
      case 'edit_box': { const el = mk('label', 'dcl-field'); el.innerHTML = (lab ? '<span>' + esc(lab) + '</span>' : '') + '<input type="text">'; const i = el.querySelector('input'); if(a.edit_width) i.style.width = Math.round(+a.edit_width * CH + 12) + 'px'; else i.style.flex = '1';
        if(a.value != null) i.value = String(a.value); if(a.password_char) i.type = 'password'; i.disabled = dis; return reg(el, 'edit'); }
      case 'list_box': case 'popup_list': { const el = mk('label', 'dcl-field' + (tile.type === 'list_box' ? ' dcl-vert' : '')); el.innerHTML = (lab ? '<span>' + esc(lab) + '</span>' : '') + '<select></select>'; const s = el.querySelector('select');
        if(tile.type === 'list_box'){ s.size = Math.max(3, Math.round(h || 8) - (lab ? 1 : 0)); if(a.multiple_select === 'true') s.multiple = true; } if(a.edit_width) s.style.width = Math.round(+a.edit_width * CH + 24) + 'px'; else s.style.flex = '1';
        s.disabled = dis; const items = a.list != null ? String(a.list).split('\n') : []; const t = reg(el, tile.type === 'list_box' ? 'list' : 'popup'); D.lists.set(k, items); fillSel(s, items); if(a.value != null) setSel(s, String(a.value)); return t; }
      case 'toggle': { const el = mk('label', 'acw-ck dcl-ck'); el.innerHTML = '<input type="checkbox"' + (String(a.value) === '1' ? ' checked' : '') + (dis ? ' disabled' : '') + '><span>' + esc(lab) + '</span>'; return reg(el, 'toggle'); }
      case 'radio_button': { const el = mk('label', 'acw-ck dcl-ck'); el.innerHTML = '<input type="radio" name="' + esc(radioName || 'r0') + '"' + (String(a.value) === '1' ? ' checked' : '') + (dis ? ' disabled' : '') + '><span>' + esc(lab) + '</span>'; if(k != null) el.querySelector('input').value = k; return reg(el, 'radio_button'); }
      case 'text': case 'text_part': { const el = mk('div', 'dcl-text' + (a.is_error_tile === 'true' ? ' dcl-err' : ''), esc(a.value != null ? String(a.value) : lab)); return reg(el, 'text'); }
      case 'spacer': { const el = mk('div', 'dcl-sp'); el.style.width = Math.round((w || 1) * CH) + 'px'; el.style.height = Math.round((h || 0.5) * LH * 0.5) + 'px'; return el; }
      case 'image': case 'image_button': { const cw = Math.round((w || 10) * CH), chh = Math.round((h || 3) * LH * 0.75); const el = mk(tile.type === 'image_button' ? 'button' : 'div', 'dcl-img'); if(tile.type === 'image_button') el.type = 'button';
        el.innerHTML = '<canvas width="' + cw + '" height="' + chh + '"></canvas>'; const c = el.querySelector('canvas'); const g = c.getContext('2d'); g.fillStyle = String(a.color) === '-2' ? '#1e232b' : aci(+a.color || 0); g.fillRect(0, 0, cw, chh); if(dis) el.disabled = true; return reg(el, tile.type === 'image_button' ? 'image_button' : 'image'); }
      case 'slider': { const el = mk('label', 'dcl-field'); el.innerHTML = (lab ? '<span>' + esc(lab) + '</span>' : '') + '<input type="range" style="flex:1">'; const i = el.querySelector('input'); i.min = a.min_value != null ? a.min_value : 0; i.max = a.max_value != null ? a.max_value : 10000; i.step = a.small_increment || 1; if(a.value != null) i.value = a.value; i.disabled = dis; return reg(el, 'slider'); }
    }
    return null; }
  const aci = n => { try{ return (A().aciHex || window.aciHex)(n) || '#000'; }catch(_){ return ['#000000', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff'][n] || '#808080'; } };
  function fillSel(s, items){ s.innerHTML = items.map((t, i) => '<option value="' + i + '">' + esc(t) + '</option>').join(''); }
  function setSel(s, v){ const idx = String(v).trim().split(/\s+/).filter(x => x !== ''); for(const o of s.options) o.selected = idx.includes(o.value); if(!s.multiple && idx.length) s.value = idx[0]; }
  function tileVal(T0){ if(!T0) return null; const el = T0.el; switch(T0.kind){
    case 'edit': return el.querySelector('input').value; case 'toggle': return el.querySelector('input').checked ? '1' : '0';
    case 'radio_button': return el.querySelector('input').checked ? '1' : '0';
    case 'radio': { const r = el.querySelector('input[type=radio]:checked'); return r ? r.value : ''; }
    case 'list': case 'popup': { const s = el.querySelector('select'); const v = [...s.options].filter(o => o.selected).map(o => o.value).join(' '); return v; }
    case 'slider': return el.querySelector('input').value; case 'text': return el.textContent; default: return T0.attrs.value != null ? String(T0.attrs.value) : ''; } }

  BI('NEW_DIALOG', (name, id, act, pos) => { const defs = DCLS.get(toInt(id)); if(!defs) return null; const d = defs[toStr(name).toLowerCase()]; if(!d || d.proto !== 'dialog' && !(defs[d.proto] || BASE[d.proto])) return null;
    const tile = resolve({ proto: d.proto, attrs: d.attrs, kids: d.kids }, defs, 0); if(!tile) return null;
    const D = { name: toStr(name), tile, tiles: new Map(), lists: new Map(), actions: new Map(), defAct: act != null ? toStr(act) : null, seq: 0, status: null, client: new Map(), img: null, list: null };
    D.root = document.createElement('div'); D.root.className = 'dcl-root dcl-col'; D.root.setAttribute('translate', 'no'); for(const c of tile.kids){ const x = build(c, D, null); if(x) D.root.appendChild(x); }
    for(const [k, T0] of D.tiles) if(T0.attrs.action != null) D.actions.set(k, String(T0.attrs.action));
    CUR = D; DCLSTACK.push(D); return T; });
  const DCLSTACK = [];
  const tileArg = k => { const D = CUR; if(!D) throw new LispErr('DCL: chưa có hộp thoại (new_dialog)'); return D.tiles.get(toStr(k)); };
  BI('ACTION_TILE', (k, s) => { if(!CUR) return null; CUR.actions.set(toStr(k), toStr(s)); return T; });
  BI('SET_TILE', (k, v) => { const T0 = tileArg(k); if(!T0) return null; const s = toStr(v), el = T0.el;
    switch(T0.kind){ case 'edit': el.querySelector('input').value = s; break; case 'toggle': case 'radio_button': el.querySelector('input').checked = s === '1'; break;
      case 'radio': { const r = el.querySelector('input[value="' + CSS.escape(s) + '"]'); if(r) r.checked = true; break; }
      case 'list': case 'popup': setSel(el.querySelector('select'), s); break; case 'slider': el.querySelector('input').value = s; break;
      case 'text': el.textContent = s; break; case 'button': el.textContent = s; break; } return v; });
  BI('GET_TILE', k => { const T0 = tileArg(k); return T0 ? tileVal(T0) : null; });
  BI('GET_ATTR', (k, at) => { const T0 = tileArg(k); if(!T0) return null; const v = T0.attrs[toStr(at).toLowerCase()]; return v == null ? null : String(v); });
  BI('MODE_TILE', (k, m) => { const T0 = tileArg(k); if(!T0) return null; const md = toInt(m), ctl = T0.el.matches('input,button,select') ? [T0.el] : [...T0.el.querySelectorAll('input,button,select')];
    if(md === 0 || md === 1) ctl.forEach(c => c.disabled = md === 1); else if(md === 2 || md === 3){ const c = ctl[0]; if(c){ c.focus(); if(md === 3 && c.select) c.select(); } } else if(md === 4) T0.el.classList.toggle('dcl-hl'); return null; });
  BI('CLIENT_DATA_TILE', (k, d) => { if(CUR) CUR.client.set(toStr(k), d); return null; });
  BI('START_LIST', (k, op, idx) => { const T0 = tileArg(k); if(!T0) return null; CUR.list = { k: toStr(k), op: op == null ? 3 : toInt(op), idx: idx == null ? -1 : toInt(idx), items: [] }; return k; });
  BI('ADD_LIST', s => { if(!CUR || !CUR.list) return null; CUR.list.items.push(toStr(s)); return s; });
  BI('END_LIST', () => { const D = CUR; if(!D || !D.list) return null; const { k, op, idx, items } = D.list; const T0 = D.tiles.get(k); let arr = D.lists.get(k) || [];
    if(op === 1 && idx >= 0) arr[idx] = items[0]; else if(op === 2) arr = arr.concat(items); else arr = items; D.lists.set(k, arr); if(T0){ const s = T0.el.querySelector('select'); const v = tileVal(T0); fillSel(s, arr); if(op !== 3) setSel(s, v); else if(T0.kind === 'popup' && arr.length) s.value = '0'; } D.list = null; return null; });
  // ảnh trong hộp thoại (màu ACI, nét vector)
  BI('DIMX_TILE', k => { const T0 = tileArg(k); const c = T0 && T0.el.querySelector('canvas'); return mkInt(c ? c.width : 0); });
  BI('DIMY_TILE', k => { const T0 = tileArg(k); const c = T0 && T0.el.querySelector('canvas'); return mkInt(c ? c.height : 0); });
  BI('START_IMAGE', k => { const T0 = tileArg(k); const c = T0 && T0.el.querySelector('canvas'); if(!c) return null; CUR.img = c.getContext('2d'); return k; });
  BI('FILL_IMAGE', (x, y, w, h, c) => { const g = CUR && CUR.img; if(!g) return null; const n = toInt(c); g.fillStyle = n === -2 ? '#1e232b' : n === -15 ? '#2b3038' : aci(n); g.fillRect(toInt(x), toInt(y), toInt(w), toInt(h)); return c; });
  BI('VECTOR_IMAGE', (x1, y1, x2, y2, c) => { const g = CUR && CUR.img; if(!g) return null; g.strokeStyle = aci(toInt(c)); g.lineWidth = 1; g.beginPath(); g.moveTo(toInt(x1) + 0.5, toInt(y1) + 0.5); g.lineTo(toInt(x2) + 0.5, toInt(y2) + 0.5); g.stroke(); return c; });
  BI(['SLIDE_IMAGE', 'TEXT_IMAGE'], () => null);
  BI('END_IMAGE', () => { if(CUR) CUR.img = null; return null; });
  BI('DONE_DIALOG', st => { const D = CUR; if(!D) return null; D.status = st === undefined || st === null ? (D._lastKey === 'cancel' ? 0 : 1) : toInt(st); if(D.finish) D.finish(); return lpt({ x: 0, y: 0 }).slice(0, 2).map(v => mkInt(v)); });
  BI('TERM_DIALOG', () => { for(const D of DCLSTACK.slice()){ D.status = 0; if(D.finish) D.finish(); } return null; });
  // hiện hộp thoại, chạy action theo sự kiện, trả trạng thái của done_dialog
  BI('START_DIALOG', () => { const D = CUR; if(!D) return mkInt(-1);
    return new Promise(res => {
      let closed = false; const dlg = A().dialog({ title: String(D.tile.attrs.label || D.name), cls: 'acw-free dcl-dlg', help: false, noOk: true, noCancel: true, html: '<div class="acw dcl-host"></div>', onOpen: r => { r.querySelector('.dcl-host').appendChild(D.root); try{ const h = r.closest('.modal').querySelector('.dvd-tb h3'); if(h) h.setAttribute('translate', 'no'); }catch(_){} }, cancel: () => { if(!closed){ D._lastKey = 'cancel'; fire('cancel', '', 1); } return false; } });
      D.finish = () => { if(closed) return; closed = true; try{ dlg.close(); }catch(_){} DCLSTACK.splice(DCLSTACK.indexOf(D), 1); CUR = DCLSTACK[DCLSTACK.length - 1] || null; res(mkInt(D.status == null ? 0 : D.status)); };
      async function fire(k, val, reason){ D._lastKey = k; const code = D.actions.get(k) || D.defAct;
        if(!code){ if(k === 'accept'){ D.status = 1; D.finish(); } else if(k === 'cancel'){ D.status = 0; D.finish(); } return; }
        const prev = CUR; CUR = D;
        try{ await withBindings([sym('$KEY'), sym('$VALUE'), sym('$REASON'), sym('$DATA'), sym('$X'), sym('$Y')], [k, val, mkInt(reason || 1), D.client.get(k) || null, mkInt(0), mkInt(0)], async () => { for(const f of parse(code)) await ev(f); }); }
        catch(err){ log('DCL action "' + k + '": ' + (err && err.message || err)); if(k === 'cancel'){ D.status = 0; D.finish(); } }
        finally{ if(!closed) CUR = prev === D || !prev ? D : prev; } }
      D.root.addEventListener('click', e => { const el = e.target.closest('[data-dcl-key]'); if(!el) return; const T0 = D.tiles.get(el.dataset.dclKey); if(!T0) return;
        if(T0.kind === 'button' || T0.kind === 'image_button'){ let x = 0, y = 0; const c = el.querySelector('canvas'); if(c){ const b = c.getBoundingClientRect(); x = Math.round(e.clientX - b.left); y = Math.round(e.clientY - b.top); } setv(sym('$X'), mkInt(x)); setv(sym('$Y'), mkInt(y)); fire(T0.attrs.key, '', 1); } });
      D.root.addEventListener('change', e => { const el = e.target.closest('[data-dcl-key]'); if(!el) return; const T0 = D.tiles.get(el.dataset.dclKey); if(!T0) return;
        if(e.target.type === 'radio'){ const rb = e.target.closest('[data-dcl-key]'); const cl = rb && rb.parentElement && rb.parentElement.closest('[data-dcl-key]'); fire(T0.attrs.key, '1', 1); if(cl && D.tiles.get(cl.dataset.dclKey)) fire(cl.dataset.dclKey, tileVal(D.tiles.get(cl.dataset.dclKey)), 1); return; }
        fire(T0.attrs.key, tileVal(T0), T0.kind === 'edit' ? 2 : 1); });
      D.root.addEventListener('dblclick', e => { const el = e.target.closest('[data-dcl-key]'); const T0 = el && D.tiles.get(el.dataset.dclKey); if(T0 && T0.kind === 'list') fire(T0.attrs.key, tileVal(T0), 4); });
      D.root.addEventListener('input', e => { if(e.target.type !== 'range') return; const el = e.target.closest('[data-dcl-key]'); const T0 = el && D.tiles.get(el.dataset.dclKey); if(T0) fire(T0.attrs.key, tileVal(T0), 3); });
      D.root.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter' && e.target.tagName !== 'BUTTON'){ const b = D.root.querySelector('[data-def="1"]'); if(b){ e.preventDefault(); fire(b.dataset.dclKey, '', 1); } } if(e.key === 'Escape'){ e.preventDefault(); const b = D.root.querySelector('[data-cancel="1"]'); fire(b ? b.dataset.dclKey : 'cancel', '', 1); } });
    }); });

  // chèn khối: định nghĩa trong bản vẽ trước, rồi thư viện khối; lớp tuỳ chọn
  function insertBlock(name, p, sc, rotDeg, layer){ if(!A().instBlock) return null; const LS = A().LS, oc = LS.cur;
    if(layer && A().layerNames().includes(layer)) LS.cur = layer;
    try{ for(const src of ['file', 'lib']){ const N = A().instBlock(name, src, p, sc || 1, rotDeg || 0); if(N && N.length) return N; } return null; } finally{ LS.cur = oc; } }
  // entmake thêm INSERT (chèn khối); entmakex trả về tên đối tượng
  const entmake0 = getv(sym('ENTMAKE'));
  BI('ENTMAKE', al => { if(al == null) return null; const ty = String(gc(al, 0) || '').toUpperCase();
    if(ty === 'INSERT'){ const q = gc(al, 10), sx = gc(al, 41), r = gc(al, 50); const N = insertBlock(toStr(gc(al, 2) || ''), q ? { x: nv(L(q)[0]), y: nv(L(q)[1]) } : { x: 0, y: 0 }, sx == null ? 1 : toReal(sx), r == null ? 0 : toReal(r) / D2R, typeof gc(al, 8) === 'string' ? gc(al, 8) : null);
      if(!N) return null; A().commit({ add: N }); return al; }
    return entmake0(al); });
  BI('ENTMAKEX', async al => { const n0 = ME().length; const r = await getv(sym('ENTMAKE'))(al); if(!r) return null; const a = ME(); return a.length ? ename(a[Math.min(n0, a.length - 1)]) : null; });

  /* ==================================================================
     3) ActiveX (vla- / vlax-) — tập con thường dùng trong các tiện ích LISP
     ================================================================== */
  class VObj { constructor(kind, ref, owner){ this.kind = kind; this.ref = ref; this.owner = owner; } }
  class Variant { constructor(vt, v){ this.vt = vt; this.v = v; } }
  class SArr { constructor(type, lo, hi, data){ this.type = type; this.lo = lo; this.hi = hi; this.data = data || new Array(hi - lo + 1).fill(type === 5 ? 0 : null); } }
  const strX = X.str; X.str = (x, p) => x instanceof VObj ? '#<VLA-OBJECT ' + objName(x) + '>' : x instanceof Variant ? '#<variant ' + x.vt + ' ' + strX(x.v, p) + '>' : x instanceof SArr ? '#<safearray...>' : x instanceof LFile ? '#<file "' + x.name + '">' : strX(x, p);
  const APP = new VObj('app'), DOC = new VObj('doc'), MS = new VObj('space', 'model'), PSP = new VObj('space', 'paper'), UTIL = new VObj('util');
  const COLL = n => new VObj('coll', n);
  const objName = o => ({ app: 'IAcadApplication', doc: 'IAcadDocument', space: o.ref === 'model' ? 'IAcadModelSpace' : 'IAcadPaperSpace', util: 'IAcadUtility', coll: 'IAcad' + o.ref, item: 'IAcad' + String(o.ref.coll).replace(/s$/, ''), ent: 'IAcad' + entClass(o) }[o.kind] || 'IAcadObject');
  const entOf = o => { if(o instanceof VObj && o.kind === 'ent'){ const l = entsOf(o.ref); if(!l.length) throw new LispErr('Automation Error. Object was erased'); return l; } if(o instanceof Ename){ const l = entsOf(o); if(!l.length) throw new LispErr('bad argument: erased'); return l; } throw new LispErr('bad argument type: VLA-OBJECT ' + str(o)); };
  const toObj = en => en instanceof Ename ? new VObj('ent', en) : en;
  const entClass = o => { const l = entsOf(o.ref); const t = l.length ? typeName(l) : 'Entity'; return ({ LWPOLYLINE: 'LWPolyline', LINE: 'Line', CIRCLE: 'Circle', ARC: 'Arc', TEXT: 'Text', MTEXT: 'MText', INSERT: 'BlockReference', POINT: 'Point', ELLIPSE: 'Ellipse', SPLINE: 'Spline', HATCH: 'Hatch', DIMENSION: 'Dimension' })[t] || t; };
  // biến thể / mảng an toàn
  const vpt = p => new Variant(8197, new SArr(5, 0, 2, [p.x, p.y, p.z || 0]));
  const unV = v => v instanceof Variant ? unV(v.v) : v instanceof SArr ? v.data.map(unV) : v;
  const ptOf = v => { const u = unV(v); if(Array.isArray(u)) return { x: nv(u[0]), y: nv(u[1]), z: u.length > 2 ? nv(u[2]) : 0 }; return pt(u); };
  const toL = v => { const u = unV(v); return Array.isArray(u) ? (u.length ? u : null) : u; };
  BI('VLAX-3D-POINT', (a, b, c) => { const p = b === undefined ? pt(a) : { x: toReal(a), y: toReal(b), z: c === undefined ? 0 : toReal(c) }; return vpt(p); });
  BI('VLAX-MAKE-SAFEARRAY', (type, ...dims) => { const d = dims[0]; const lo = toInt(d instanceof DP ? d.a : L(d)[0]), hi = toInt(d instanceof DP ? d.d : L(d)[1]); return new SArr(toInt(type), lo, hi); });
  BI('VLAX-SAFEARRAY-FILL', (a, l) => { if(!(a instanceof SArr)) throw new LispErr('bad argument type: safearrayp'); L(l).forEach((v, i) => { if(i < a.data.length) a.data[i] = isNum(v) ? nv(v) : v; }); return a; });
  BI('VLAX-SAFEARRAY->LIST', a => { const u = unV(a); return Array.isArray(u) && u.length ? u : null; });
  BI('VLAX-SAFEARRAY-GET-ELEMENT', (a, i) => (a instanceof SArr ? a.data[toInt(i) - a.lo] : null));
  BI('VLAX-SAFEARRAY-PUT-ELEMENT', (a, i, v) => { if(a instanceof SArr) a.data[toInt(i) - a.lo] = isNum(v) ? nv(v) : v; return v; });
  BI('VLAX-SAFEARRAY-GET-L-BOUND', a => mkInt(a instanceof SArr ? a.lo : 0)); BI('VLAX-SAFEARRAY-GET-U-BOUND', a => mkInt(a instanceof SArr ? a.hi : -1));
  BI('VLAX-SAFEARRAY-GET-DIM', () => mkInt(1)); BI('VLAX-SAFEARRAY-TYPE', a => mkInt(a instanceof SArr ? a.type : 0));
  BI('VLAX-MAKE-VARIANT', (v, t) => new Variant(t === undefined ? (v instanceof SArr ? 8192 + v.type : typeof v === 'string' ? 8 : v instanceof LI ? 3 : isNum(v) ? 5 : 0) : toInt(t), v));
  BI('VLAX-VARIANT-VALUE', v => v instanceof Variant ? v.v : v); BI('VLAX-VARIANT-TYPE', v => mkInt(v instanceof Variant ? v.vt : 0));
  BI('VLAX-VARIANT-CHANGE-TYPE', (v, t) => new Variant(toInt(t), v instanceof Variant ? v.v : v));
  // đối tượng
  BI('VLAX-GET-ACAD-OBJECT', () => APP);
  BI('VLAX-ENAME->VLA-OBJECT', en => { entOf(en); return new VObj('ent', en); });
  BI('VLAX-VLA-OBJECT->ENAME', o => (o instanceof VObj && o.kind === 'ent' ? o.ref : null));
  BI(['VLAX-RELEASE-OBJECT'], () => null);
  BI('VLAX-OBJECT-RELEASED-P', () => null);
  BI('VLAX-ERASED-P', o => { try{ entOf(o); return null; }catch(_){ return T; } });
  BI(['VLAX-READ-ENABLED-P', 'VLAX-WRITE-ENABLED-P', 'VLAX-TYPEINFO-AVAILABLE-P'], () => T);
  BI('VLAX-PROPERTY-AVAILABLE-P', (o, p) => { try{ getProp(o, propName(p)); return T; }catch(_){ return null; } });
  BI('VLAX-METHOD-APPLICABLE-P', (o, m) => METHODS[propName(m).toUpperCase()] ? T : null);
  const propName = p => p instanceof Sym ? p.n : toStr(p);
  const typeOf0 = G.get('TYPE'); BI('TYPE', a => a instanceof VObj ? sym('VLA-OBJECT') : a instanceof Variant ? sym('VARIANT') : a instanceof SArr ? sym('SAFEARRAY') : a instanceof LFile ? sym('FILE') : typeOf0(a));

  // màu / lớp chung của đối tượng
  const aciOf = e => e.bl ? 256 : (A().aciOf ? A().aciOf(e.col) : 7);
  const setAci = (w, n) => { if(n === 256){ w.bl = 1; w.col = A().layerHex(w.layer || '0'); } else { delete w.bl; w.col = typeof aciHex === 'function' ? aciHex(n) : w.col; } };
  const commitRep = (list, fn) => { const rep = list.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; fn(w, e); return [e, w]; }); A().commit({ rep }); };
  function curve(o){ const l = entOf(o); return pathOf(l[0]); }
  // thuộc tính (tên như ActiveX, không phân biệt hoa thường)
  // thuộc tính đúng/sai trả :vlax-true / :vlax-false như ActiveX của AutoCAD
  const BOOLP = new Set(['CLOSED', 'LAYERON', 'FREEZE', 'LOCK', 'VISIBLE', 'HASATTRIBUTES', 'PLOTTABLE', 'ISXREF', 'ISLAYOUT', 'ISDYNAMICBLOCK', 'UPSIDEDOWN', 'BACKWARD']);
  const VT = sym(':VLAX-TRUE'), VF = sym(':VLAX-FALSE'); G.set(VT.n, VT); G.set(VF.n, VF);
  const getProp = (o, P) => { const v = getProp0(o, P); return BOOLP.has(String(P).toUpperCase()) ? (v === VT || v === VF ? v : truthy(v) && v !== 0 && !(v instanceof LI && Number(v.v) === 0) ? VT : VF) : v; };
  const putProp = (o, P, v) => putProp0(o, P, v === VT ? T : v === VF ? null : BOOLP.has(String(P).toUpperCase()) && isNum(v) ? (nv(v) !== 0 ? T : null) : v);
  function getProp0(o, P){ const p = P.toUpperCase();
    if(!(o instanceof VObj)) o = toObj(o); if(!(o instanceof VObj)) throw new LispErr('bad argument type: VLA-OBJECT ' + str(o));
    switch(o.kind){
      case 'app': if(p === 'ACTIVEDOCUMENT') return DOC; if(p === 'DOCUMENTS') return COLL('Documents'); if(p === 'VERSION') return '25.0s (DVDCAD)'; if(p === 'NAME') return 'DVDCAD'; if(p === 'PREFERENCES') return new VObj('prefs'); break;
      case 'doc': if(p === 'MODELSPACE') return MS; if(p === 'PAPERSPACE') return PSP; if(p === 'UTILITY') return UTIL; if(p === 'APPLICATION') return APP;
        { const CN = { LAYERS: 'Layers', BLOCKS: 'Blocks', TEXTSTYLES: 'TextStyles', LINETYPES: 'Linetypes', DIMSTYLES: 'DimStyles', LAYOUTS: 'Layouts', GROUPS: 'Groups', DICTIONARIES: 'Dictionaries', VIEWS: 'Views', REGISTEREDAPPLICATIONS: 'RegisteredApplications', SELECTIONSETS: 'SelectionSets', MATERIALS: 'Materials', PLOTCONFIGURATIONS: 'PlotConfigurations', USERCOORDINATESYSTEMS: 'UserCoordinateSystems', VIEWPORTS: 'Viewports' }; if(CN[p]) return COLL(CN[p]); }
        if(p === 'ACTIVELAYER') return new VObj('item', { coll: 'Layers', name: A().LS.cur });
        if(p === 'ACTIVESPACE') return mkInt(1); if(p === 'NAME') return (typeof currentName === 'string' && currentName) || 'Drawing1.dwg'; if(p === 'FULLNAME') return (typeof currentName === 'string' && currentName) || ''; if(p === 'PATH') return '';
        if(p === 'ACTIVETEXTSTYLE') return new VObj('item', { coll: 'TextStyles', name: 'Standard' }); if(p === 'ACTIVELAYOUT') return new VObj('item', { coll: 'Layouts', name: 'Model' }); break;
      case 'space': if(p === 'COUNT') return mkInt(ME().length); if(p === 'NAME') return o.ref === 'model' ? '*Model_Space' : '*Paper_Space'; break;
      case 'coll': if(p === 'COUNT') return mkInt(collItems(o).length); if(p === 'NAME') return o.ref; break;
      case 'item': { const it = o.ref; if(p === 'NAME') return it.name;
        if(it.coll === 'Layers'){ const n = it.name, LS = A().LS; if(p === 'COLOR') return mkInt(A().aciOf ? A().aciOf(A().layerHex(n)) : 7); if(p === 'LAYERON') return LS.off.has(n) ? null : T; if(p === 'FREEZE') return LS.frozen.has(n) ? T : null; if(p === 'LOCK') return LS.locked.has(n) ? T : null;
          if(p === 'LINETYPE') return A().layerLT(n); if(p === 'LINEWEIGHT') return mkInt(A().layerLW(n) || -3); if(p === 'PLOTTABLE') return T; if(p === 'DESCRIPTION') return ''; if(p === 'TRANSPARENCY') return mkInt(A().layerTP ? A().layerTP(n) : 0); }
        if(p === 'COUNT') return mkInt(0); break; }
      case 'util': break;
      case 'ent': { const l = entOf(o), e = l[0], ty = typeName(l), C = () => curve(o);
        switch(p){
          case 'OBJECTNAME': return 'AcDb' + ({ LWPOLYLINE: 'Polyline', INSERT: 'BlockReference', TEXT: 'Text', MTEXT: 'MText', DIMENSION: 'RotatedDimension' }[ty] || ty[0] + ty.slice(1).toLowerCase());
          case 'HANDLE': return String(o.ref.id).replace(/^G:/, ''); case 'LAYER': return e.layer || '0'; case 'COLOR': return mkInt(aciOf(e)); case 'LINETYPE': return e.lt || 'ByLayer';
          case 'LINETYPESCALE': return e.lts || 1.0; case 'LINEWEIGHT': return mkInt(e.lw > 0 ? e.lw : -1); case 'VISIBLE': return e.vh ? null : T; case 'ENTITYTRANSPARENCY': return e.tp != null ? String(e.tp) : 'ByLayer';
          case 'OWNERID': return mkInt(0); case 'OBJECTID': return mkInt(Math.abs(hash(o.ref.id)));
          case 'STARTPOINT': return vpt(C().pointAt(C().p0)); case 'ENDPOINT': return vpt(C().pointAt(C().p1));
          case 'LENGTH': if(ty === 'LINE' || ty === 'LWPOLYLINE' || ty === 'SPLINE') return C().len; break;
          case 'ARCLENGTH': return C().len; case 'CIRCUMFERENCE': return C().len;
          case 'AREA': return C().area; case 'CLOSED': return C().closed ? T : null;
          case 'CENTER': if(e.cx != null) return vpt({ x: e.cx, y: e.cy }); break; case 'RADIUS': if(e.r != null) return e.r; break; case 'DIAMETER': if(e.r != null) return 2 * e.r; break;
          case 'STARTANGLE': if(ty === 'ARC') return e.a1 * D2R; break; case 'ENDANGLE': if(ty === 'ARC') return e.a2 * D2R; break; case 'TOTALANGLE': if(ty === 'ARC'){ let s = (e.a2 - e.a1) % 360; if(s <= 0) s += 360; return s * D2R; } break;
          case 'COORDINATES': { if(ty === 'LWPOLYLINE'){ const B = (A().bvOf && A().bvOf(e)) || e.vertices; return new Variant(8197, new SArr(5, 0, B.length * 2 - 1, B.flatMap(v => [v.x, v.y]))); } if(ty === 'LINE') return new Variant(8197, new SArr(5, 0, 5, [e.x1, e.y1, 0, e.x2, e.y2, 0])); break; }
          case 'CONSTANTWIDTH': return (e.pw && e.pw[0]) ? e.pw[0][2] || 0 : 0; case 'ELEVATION': return e.z || 0; case 'THICKNESS': return 0; case 'NORMAL': return vpt({ x: 0, y: 0, z: 1 });
          case 'TEXTSTRING': case 'CONTENTS': if(e.type === 'TEXT') return String(e.text || ''); break;
          case 'HEIGHT': if(e.type === 'TEXT') return e.h || 2.5; break; case 'ROTATION': if(e.type === 'TEXT') return (e.rot || 0) * D2R; if(ty === 'INSERT') return (e.irot || 0) * D2R; break;
          case 'INSERTIONPOINT': if(e.type === 'TEXT') return vpt({ x: e.x, y: e.y }); if(ty === 'INSERT'){ const q = entget(o.ref); const p10 = gc(q, 10); return vpt(ptOf(p10)); } break;
          case 'TEXTALIGNMENTPOINT': if(e.type === 'TEXT') return vpt({ x: e.x, y: e.y }); break; case 'STYLENAME': return e.style || 'Standard';
          case 'NAME': case 'EFFECTIVENAME': if(ty === 'INSERT') return String(e.blk || ''); break;
          case 'XSCALEFACTOR': case 'YSCALEFACTOR': case 'ZSCALEFACTOR': if(ty === 'INSERT') return e.isc || 1.0; break;
          case 'HASATTRIBUTES': return l.some(x => x.att) ? T : null;
          case 'MEASUREMENT': if(ty === 'DIMENSION'){ const t = l.find(x => x.dimd); return t ? parseFloat(String(t.text).replace(',', '.')) || 0 : 0; } break;
          case 'PATTERNNAME': if(ty === 'HATCH') return String(e.pat || 'SOLID'); break;
        } break; }
    }
    for(const f of XGET){ const r = f(o, p, P); if(r !== undefined) return r; }   // phần mở rộng (dvd-lisp3.js)
    throw new LispErr('ActiveX Server returned the error: unknown name: ' + P); }
  const XGET = [], XPUT = [], XCOLL = [];
  const hash = s => { let h = 0; for(const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
  function putProp0(o, P, v){ const p = P.toUpperCase(); if(!(o instanceof VObj)) o = toObj(o);
    if(o.kind === 'doc' && p === 'ACTIVELAYER'){ const n = o.ref && v instanceof VObj ? v.ref.name : toStr(v); A().setCurLayer(n); return v; }
    if(o.kind === 'item' && o.ref.coll === 'Layers'){ const n = o.ref.name; if(p === 'COLOR'){ A().setLayerColor(n, aci(toInt(v))); return v; } if(p === 'LAYERON'){ A().setLayerFlag(n, 'off', !truthy(v)); return v; } if(p === 'FREEZE'){ A().setLayerFlag(n, 'frozen', truthy(v)); return v; } if(p === 'LOCK'){ A().setLayerFlag(n, 'locked', truthy(v)); return v; } if(p === 'LINETYPE'){ A().setLayerLT(n, toStr(v)); return v; } if(p === 'LINEWEIGHT'){ A().setLayerLW(n, Math.max(0, toInt(v))); return v; } if(p === 'TRANSPARENCY' && A().setLayerTP){ A().setLayerTP(n, toInt(v)); return v; } }
    for(const f of XPUT){ const r = f(o, p, v); if(r !== undefined) return r; }
    if(o.kind !== 'ent') throw new LispErr('ActiveX: không ghi được thuộc tính ' + P);
    const l = entOf(o), e = l[0];
    const geo = (fn) => commitRep([e], fn), all = fn => commitRep(l, fn);
    switch(p){
      case 'LAYER': all(w => { w.layer = toStr(v); if(w.bl) w.col = A().layerHex(w.layer); }); return v;
      case 'COLOR': all(w => setAci(w, toInt(v))); return v; case 'LINETYPE': all(w => { const s = toStr(v); if(/^bylayer$/i.test(s)) delete w.lt; else w.lt = s.toUpperCase(); }); return v;
      case 'LINETYPESCALE': all(w => { w.lts = toReal(v); }); return v; case 'LINEWEIGHT': all(w => { const n = toInt(v); if(n > 0) w.lw = n; else delete w.lw; }); return v;
      case 'VISIBLE': all(w => { if(truthy(v) && v !== mkInt(0)) delete w.vh; else w.vh = 1; }); return v;
      case 'ENTITYTRANSPARENCY': all(w => { const s = String(unV(v)); if(/bylayer/i.test(s)) delete w.tp; else w.tp = Math.max(0, Math.min(90, parseInt(s, 10) || 0)); }); return v;
      case 'STARTPOINT': geo(w => { const q = ptOf(v); if(w.type === 'LINE'){ w.x1 = q.x; w.y1 = q.y; } }); return v;
      case 'ENDPOINT': geo(w => { const q = ptOf(v); if(w.type === 'LINE'){ w.x2 = q.x; w.y2 = q.y; } }); return v;
      case 'CENTER': geo(w => { const q = ptOf(v); if(w.cx != null){ w.cx = q.x; w.cy = q.y; } }); return v;
      case 'RADIUS': geo(w => { if(w.r != null) w.r = toReal(v); }); return v; case 'DIAMETER': geo(w => { if(w.r != null) w.r = toReal(v) / 2; }); return v;
      case 'STARTANGLE': geo(w => { if(w.type === 'ARC') w.a1 = toReal(v) / D2R; }); return v; case 'ENDANGLE': geo(w => { if(w.type === 'ARC') w.a2 = toReal(v) / D2R; }); return v;
      case 'TEXTSTRING': geo(w => { if(w.type === 'TEXT') w.text = toStr(v); }); return v; case 'HEIGHT': geo(w => { if(w.type === 'TEXT') w.h = toReal(v); }); return v;
      case 'ROTATION': geo(w => { if(w.type === 'TEXT') w.rot = toReal(v) / D2R; }); return v;
      case 'INSERTIONPOINT': case 'TEXTALIGNMENTPOINT': geo(w => { if(w.type === 'TEXT'){ const q = ptOf(v); w.x = q.x; w.y = q.y; } }); return v;
      case 'CLOSED': geo(w => { if(w.type === 'POLYLINE'){ w.closed = truthy(v) && !(v instanceof LI && v.v === 0); const B = A().bvOf && A().bvOf(w); if(B) A().setBV(w, B); } }); return v;
      case 'COORDINATES': geo(w => { const a = unV(v).map(nv); if(w.type === 'POLYLINE'){ const V = []; for(let i = 0; i + 1 < a.length; i += 2) V.push({ x: a[i], y: a[i + 1], bulge: 0 }); A().setBV(w, V); } }); return v;
      case 'CONSTANTWIDTH': geo(w => { if(w.type === 'POLYLINE'){ const n = (w.vertices || []).length, c = toReal(v); w.pw = Array.from({ length: n }, () => [0, 0, c, c]); } }); return v;
      case 'STYLENAME': all(w => { if(w.type === 'TEXT') w.style = toStr(v); }); return v;
    }
    throw new LispErr('ActiveX: không ghi được thuộc tính ' + P); }
  function collItems(o){ const n = String(o.ref);
    if(n === 'Layers') return A().layerNames().map(x => new VObj('item', { coll: 'Layers', name: x }));
    if(n === 'Blocks'){ const B = A().blockList ? A().blockList() : { file: [], lib: [] }; return ['*Model_Space', '*Paper_Space'].concat([...(B.file || []), ...(B.lib || [])].map(b => b.name || b)).map(x => new VObj('item', { coll: 'Blocks', name: x })); }
    if(n === 'TextStyles') return ['Standard'].map(x => new VObj('item', { coll: 'TextStyles', name: x }));
    if(n === 'Linetypes') return (A().ltNames ? A().ltNames() : ['CONTINUOUS']).map(x => new VObj('item', { coll: 'Linetypes', name: x }));
    if(n === 'Layouts'){ const LL = (typeof dwgLayouts !== 'undefined' && dwgLayouts.length) ? dwgLayouts : [{ isModel: true }]; return LL.map(L0 => new VObj('item', { coll: 'Layouts', name: L0.isModel ? 'Model' : L0.name })); }
    if(n === 'Documents') return [DOC];
    for(const f of XCOLL){ const r = f(o, n); if(r) return r; }
    return []; }
  const spaceEnts = () => { const seen = new Set(), out = []; for(const e of ME()){ const en = ename(e); if(seen.has(en.id)) continue; seen.add(en.id); out.push(new VObj('ent', en)); } return out; };
  SPECIAL.set('VLAX-FOR', async x => { const v = x[1], coll = await ev(x[2]); const items = coll instanceof VObj ? (coll.kind === 'space' ? spaceEnts() : coll.kind === 'coll' ? collItems(coll) : coll.kind === 'item' && coll.ref.coll === 'Blocks' ? [] : []) : L(unV(coll));
    let r = null; await withBindings([v], [null], async () => { for(const it of items){ G.set(v.n, it); r = await progn(x.slice(3)); } }); return r; });
  // phương thức
  const ent2 = w => { A().newProps(w); delete w.lt; A().commit({ add: [w] }); return new VObj('ent', ename(w)); };
  const METHODS = {
    ITEM: (o, i) => { if(o.kind === 'coll'){ const it = collItems(o); if(isNum(i)){ const k = toInt(i); if(k < 0 || k >= it.length) throw new LispErr('Automation Error. Key not found'); return it[k]; } const s = toStr(i).toUpperCase(); const f = it.find(q => String(q.ref.name || '').toUpperCase() === s); if(!f) throw new LispErr('Automation Error. Key not found'); return f; } if(o.kind === 'space'){ return spaceEnts()[toInt(i)] || null; } throw new LispErr('Item: không áp dụng'); },
    ADD: (o, name) => { if(o.kind === 'coll' && o.ref === 'Layers'){ const n = toStr(name); A().addLayer(n); return new VObj('item', { coll: 'Layers', name: n }); } throw new LispErr('Add: chưa hỗ trợ cho ' + objName(o)); },
    ADDLINE: (o, a, b) => { const p = ptOf(a), q = ptOf(b); return ent2({ type: 'LINE', x1: p.x, y1: p.y, x2: q.x, y2: q.y }); },
    ADDCIRCLE: (o, c, r) => { const p = ptOf(c); return ent2({ type: 'CIRCLE', cx: p.x, cy: p.y, r: toReal(r) }); },
    ADDARC: (o, c, r, a1, a2) => { const p = ptOf(c); return ent2({ type: 'ARC', cx: p.x, cy: p.y, r: toReal(r), a1: toReal(a1) / D2R, a2: toReal(a2) / D2R }); },
    ADDPOINT: (o, a) => { const p = ptOf(a); return ent2({ type: 'POINT', x: p.x, y: p.y }); },
    ADDLIGHTWEIGHTPOLYLINE: (o, arr) => { const a = unV(arr).map(nv); const V = []; for(let i = 0; i + 1 < a.length; i += 2) V.push({ x: a[i], y: a[i + 1], bulge: 0 }); const w = { type: 'POLYLINE', vertices: V.map(v => ({ x: v.x, y: v.y })), closed: false }; A().setBV(w, V); return ent2(w); },
    ADDPOLYLINE: (o, arr) => { const a = unV(arr).map(nv); const V = []; for(let i = 0; i + 2 < a.length; i += 3) V.push({ x: a[i], y: a[i + 1], bulge: 0 }); const w = { type: 'POLYLINE', vertices: V.map(v => ({ x: v.x, y: v.y })), closed: false }; A().setBV(w, V); return ent2(w); },
    ADDTEXT: (o, s, p0, h) => { const p = ptOf(p0); return ent2({ type: 'TEXT', x: p.x, y: p.y, h: toReal(h), text: toStr(s), rot: 0, ha: 'left', va: 'alphabetic' }); },
    ADDMTEXT: (o, p0, wd, s) => { const p = ptOf(p0); return ent2({ type: 'TEXT', mt: 1, x: p.x, y: p.y, h: (A().MEM && A().MEM.th) || 2.5, text: toStr(s), rot: 0, ha: 'left', va: 'top', mw: toReal(wd) }); },
    ADDELLIPSE: (o, c, maj, ratio) => { const p = ptOf(c), m = ptOf(maj); return ent2({ type: 'ELLIPSE', cx: p.x, cy: p.y, mx: m.x, my: m.y, ratio: toReal(ratio), p1: 0, p2: TAU }); },
    ADDBLOCKREFERENCE: (o, p0, name, xs, ys, zs, rot) => { const N = insertBlock(toStr(name), ptOf(p0), toReal(xs), toReal(rot) / D2R); if(!N) throw new LispErr('Không có khối "' + toStr(name) + '"'); A().commit({ add: N }); return new VObj('ent', ename(N[0])); },
    DELETE: o => { const l = entOf(o); A().commit({ del: l.filter(e => !A().isLocked(e)) }); return null; },
    MOVE: (o, a, b) => { const p = ptOf(a), q = ptOf(b); return xform(o, 'MOVE', [p, q]); },
    COPY: o => { const l = entOf(o); const N = l.map(e => { const w = JSON.parse(JSON.stringify(e)); delete w._lid; delete w.userAdded; return w; }); A().commit({ add: N }); return new VObj('ent', ename(N[0])); },
    ROTATE: (o, b, a) => xform(o, 'ROTATE', [ptOf(b), toReal(a)]), SCALEENTITY: (o, b, f) => xform(o, 'SCALE', [ptOf(b), toReal(f)]), MIRROR: (o, a, b) => xform(o, 'MIRROR', [ptOf(a), ptOf(b)]),
    UPDATE: () => null, HIGHLIGHT: () => null, REGEN: () => { try{ draw(); }catch(_){} return null; },
    STARTUNDOMARK: () => null, ENDUNDOMARK: () => null, AUDITINFO: () => null,
    SENDCOMMAND: async (o, s) => { const cmdl = toStr(s).replace(/\r?\n/g, ' ').trim(); for(const part of cmdl.split(/\s+(?=[A-Z_\-'][A-Z0-9_\-]*\s)/i)) try{ await DVDLisp.eval('(command ' + part.split(/\s+/).filter(Boolean).map(t => JSON.stringify(t)).join(' ') + ')'); }catch(_){} return null; },
    GETVARIABLE: (o, n) => getv(sym('GETVAR'))(n), SETVARIABLE: (o, n, v) => getv(sym('SETVAR'))(n, v),
    GETBOUNDINGBOX: (o, mn, mx) => { const l = entOf(o); let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for(const e of l){ const bb = typeof entBBox === 'function' ? entBBox(e) : null; if(bb){ a = Math.min(a, bb.x0); b = Math.min(b, bb.y0); c = Math.max(c, bb.x1); d = Math.max(d, bb.y1); } }
      if(mn instanceof Sym) setv(mn, vpt({ x: a, y: b })); if(mx instanceof Sym) setv(mx, vpt({ x: c, y: d })); return null; },
    INTERSECTWITH: (o, o2, mode) => { const c1 = A().G.curveOf(entOf(o)[0]), c2 = A().G.curveOf(entOf(o2)[0]); const md = toInt(mode || mkInt(0)); const ext = md === 0 ? null : { a: md === 1 || md === 3, b: md === 2 || md === 3 };
      const xs = c1 && c2 ? A().G.xCurves(c1, c2, ext) : []; return new Variant(8197, new SArr(5, 0, xs.length * 3 - 1, xs.flatMap(q => [q.x, q.y, 0]))); },
    OFFSET: (o, d) => { const e = entOf(o)[0], dist = toReal(d), off = A().G && A().G.offsetEntity; if(!off) throw new LispErr('Offset: chưa hỗ trợ');
      // như AutoCAD: d > 0 → đường tròn/cung to ra, đa tuyến kín ra ngoài, đoạn thẳng/đa tuyến hở sang trái theo chiều vẽ
      let side; const c = A().G.curveOf(e); const ad = Math.abs(dist);
      if(e.type === 'CIRCLE' || e.type === 'ARC'){ const a = (e.a1 != null ? (e.a1 + (((e.a2 - e.a1) % 360) + 360) % 360 / 2) : 0) * D2R; const R = dist > 0 ? e.r + ad : Math.max(e.r - ad, 0) * 0.5; side = { x: e.cx + R * Math.cos(a), y: e.cy + R * Math.sin(a) }; }
      else if(c && c.pieces && c.pieces.length){ const P = c.pieces[0], mx = (P.ax + P.bx) / 2, my = (P.ay + P.by) / 2, L = Math.hypot(P.bx - P.ax, P.by - P.ay) || 1; let nx = -(P.by - P.ay) / L, ny = (P.bx - P.ax) / L;
        if(c.closed){ let ar = 0; for(const q of c.pieces) ar += q.ax * q.by - q.bx * q.ay; if(ar > 0){ nx = -nx; ny = -ny; } }   // kín ngược chiều kim đồng hồ: trái là bên trong
        const sg = dist >= 0 ? 1 : -1; side = { x: mx + nx * sg * Math.max(ad, 1e-6) * 0.5, y: my + ny * sg * Math.max(ad, 1e-6) * 0.5 }; }
      else throw new LispErr('Offset: đối tượng không hỗ trợ');
      const r = off(e, ad, side); if(!r) return new Variant(8201, new SArr(9, 0, -1, [])); delete r._lid; A().commit({ add: [r] }); return new Variant(8201, new SArr(9, 0, 0, [new VObj('ent', ename(r))])); },
    EXPLODE: o => { const en = o.ref; DVDLisp.eval('(command "_.EXPLODE" ' + '(handent "' + en.id + '") "")'); return null; },
    GETPOINT: async (o, b, m) => { const r = await getv(sym('GETPOINT'))(b == null ? (m == null ? undefined : unV(m)) : unV(b), m == null ? undefined : m); return r ? vpt(pt(r)) : null; },
    GETENTITY: async (o, e, p, m) => { const r = await getv(sym('ENTSEL'))(m); if(!r) throw new LispErr('Automation Error. Null extents'); if(e instanceof Sym) setv(e, new VObj('ent', r[0])); if(p instanceof Sym) setv(p, vpt(pt(r[1]))); return null; },
    GETSTRING: async (o, sp, m) => getv(sym('GETSTRING'))(sp, m), GETREAL: async (o, m) => getv(sym('GETREAL'))(m), GETINTEGER: async (o, m) => getv(sym('GETINT'))(m),
    GETDISTANCE: async (o, b, m) => getv(sym('GETDIST'))(b == null ? m : unV(b), m), GETANGLE: async (o, b, m) => getv(sym('GETANGLE'))(b == null ? m : unV(b), m),
    PROMPT: (o, s) => { X.out(toStr(s)); return null; },
    ANGLETOREAL: (o, s, u) => getv(sym('ANGTOF'))(s, u), DISTANCETOREAL: (o, s, u) => getv(sym('DISTOF'))(s, u), REALTOSTRING: (o, v, u, pr) => getv(sym('RTOS'))(v, u, pr),
    POLARPOINT: (o, p, a, d) => vpt(pt(getv(sym('POLAR'))(unV(p), a, d))),
    GETWIDTH: () => 0, SETWIDTH: (o, i, s, e) => { const l = entOf(o); commitRep([l[0]], w => { const n = (w.vertices || []).length; w.pw = w.pw || Array.from({ length: n }, () => [0, 0, 0, 0]); const k = toInt(i); if(w.pw[k]){ w.pw[k][2] = toReal(s); w.pw[k][3] = toReal(e); } }); return null; },
    GETBULGE: (o, i) => { const B = A().bvOf(entOf(o)[0]); return B && B[toInt(i)] ? B[toInt(i)].bulge || 0 : 0; },
    SETBULGE: (o, i, b) => { commitRep([entOf(o)[0]], w => { const B = A().bvOf(w); if(B && B[toInt(i)]){ B[toInt(i)].bulge = toReal(b); A().setBV(w, B); } }); return null; },
    ADDVERTEX: (o, i, p) => { commitRep([entOf(o)[0]], w => { const B = A().bvOf(w) || w.vertices.map(v => ({ x: v.x, y: v.y, bulge: 0 })); const a = unV(p).map(nv); B.splice(toInt(i), 0, { x: a[0], y: a[1], bulge: 0 }); A().setBV(w, B); }); return null; },
  };
  // ma trận x' = a·x + c·y + e, y' = b·x + d·y + f — dùng chung A.xformEnt của lệnh MOVE/ROTATE/SCALE/MIRROR
  function xform(o, kind, args){ const l = entOf(o); const [p, q] = args; let M;
    if(kind === 'MOVE') M = { a: 1, b: 0, c: 0, d: 1, e: q.x - p.x, f: q.y - p.y };
    else if(kind === 'ROTATE'){ const c = Math.cos(q), s = Math.sin(q); M = { a: c, b: s, c: -s, d: c, e: p.x - c * p.x + s * p.y, f: p.y - s * p.x - c * p.y }; }
    else if(kind === 'SCALE') M = { a: q, b: 0, c: 0, d: q, e: p.x * (1 - q), f: p.y * (1 - q) };
    else { const L = Math.hypot(q.x - p.x, q.y - p.y) || 1, ux = (q.x - p.x) / L, uy = (q.y - p.y) / L, a = ux * ux - uy * uy, b = 2 * ux * uy; M = { a, b, c: b, d: -a, e: p.x - (a * p.x + b * p.y), f: p.y - (b * p.x - a * p.y) }; }
    if(!A().xformEnt) throw new LispErr('Biến đổi đối tượng: chưa hỗ trợ');
    if(kind === 'MIRROR'){ const N = l.map(e => A().xformEnt(JSON.parse(JSON.stringify(e)), M)); N.forEach(w => { delete w._lid; }); A().commit({ add: N }); return N.length ? new VObj('ent', ename(N[0])) : null; }
    commitRep(l, w => A().xformEnt(w, M)); return null; }
  // tên hàm vla-get-X / vla-put-X / vla-X được sinh khi gọi lần đầu (không cần khai báo trước từng thuộc tính)
  const VNAMES = name => {
    let m = /^VLA-GET-(.+)$/.exec(name); if(m){ const P = m[1]; const f = o => getProp(o, P); f.lname = name; return f; }
    m = /^VLA-PUT-(.+)$/.exec(name); if(m){ const P = m[1]; const f = (o, v) => putProp(o, P, v); f.lname = name; return f; }
    m = /^VLA-(.+)$/.exec(name); if(m && METHODS[m[1]]){ const M = METHODS[m[1]]; const f = (o, ...a) => M(o instanceof VObj ? o : toObj(o), ...a); f.lname = name; return f; }
    return undefined; };
  const gHas = G.has.bind(G), gGet = G.get.bind(G);
  G.has = k => gHas(k) || (typeof k === 'string' && /^VLA-/.test(k) && VNAMES(k) !== undefined);
  G.get = k => { let v = gGet(k); if(v === undefined && typeof k === 'string' && /^VLA-/.test(k)){ v = VNAMES(k); if(v !== undefined) G.set(k, v); } return v; };
  const cleanV = v => v === VT ? mkInt(-1) : v === VF ? mkInt(0) : v instanceof Variant || v instanceof SArr ? toL(v) : v;
  BI('VLAX-GET-PROPERTY', (o, p) => getProp(o, propName(p))); BI('VLAX-PUT-PROPERTY', (o, p, v) => putProp(o, propName(p), v));
  BI('VLAX-GET', (o, p) => cleanV(getProp(o, propName(p)))); BI('VLAX-PUT', (o, p, v) => putProp(o, propName(p), Array.isArray(v) && v.every(isNum) ? (propName(p).toUpperCase() === 'COORDINATES' ? new Variant(8197, new SArr(5, 0, v.length - 1, v.map(nv))) : vpt(pt(v))) : v));
  BI('VLAX-INVOKE-METHOD', (o, m, ...a) => { const M = METHODS[propName(m).toUpperCase()]; if(!M) throw new LispErr('ActiveX: không có phương thức ' + propName(m)); return M(o instanceof VObj ? o : toObj(o), ...a); });
  BI('VLAX-INVOKE', async (o, m, ...a) => { const M = METHODS[propName(m).toUpperCase()]; if(!M) throw new LispErr('ActiveX: không có phương thức ' + propName(m)); const conv = a.map(x => Array.isArray(x) && x.every(isNum) ? (x.length <= 3 ? vpt(pt(x)) : new Variant(8197, new SArr(5, 0, x.length - 1, x.map(nv)))) : x); return cleanV(await M(o instanceof VObj ? o : toObj(o), ...conv)); });
  BI('VLAX-DUMP-OBJECT', o => { X.out('; ' + objName(o instanceof VObj ? o : toObj(o)) + '\n'); return T; });
  BI(['VLAX-LDATA-GET'], (o, k, d) => { const m = LD.get(ldKey(o)); return m && m.has(String(unV(k))) ? m.get(String(unV(k))) : d === undefined ? null : d; });
  BI(['VLAX-LDATA-PUT'], (o, k, v) => { const kk = ldKey(o); if(!LD.has(kk)) LD.set(kk, new Map()); LD.get(kk).set(String(unV(k)), v); return v; });
  BI(['VLAX-LDATA-DELETE'], (o, k) => { const m = LD.get(ldKey(o)); return m && m.delete(String(unV(k))) ? T : null; });
  const LD = new Map(); const ldKey = o => o instanceof VObj && o.kind === 'ent' ? o.ref.id : o instanceof Ename ? o.id : typeof o === 'string' ? 'D:' + o : 'X';
  // getpropertyvalue / setpropertyvalue (AutoCAD 2012+)
  BI('GETPROPERTYVALUE', (en, p) => { const v = getProp(toObj(en), toStr(p)); return v === VT ? mkInt(1) : cleanV(v); }); BI('SETPROPERTYVALUE', (en, p, v) => { putProp(toObj(en), toStr(p), Array.isArray(v) && v.every(isNum) ? vpt(pt(v)) : v); return null; });
  BI('ISPROPERTYREADONLY', () => null); BI('DUMPALLPROPERTIES', en => { log('; ' + str(en)); return null; });

  // cho phần mở rộng ActiveX (dvd-lisp3.js)
  DVDLisp.ax = { VObj, Variant, SArr, METHODS, XGET, XPUT, XCOLL, entOf, toObj, vpt, unV, ptOf, toL, ent2, commitRep, insertBlock, collItems, spaceEnts, COLL, APP, DOC, MS, PSP, UTIL, aci, aciOf, setAci, VT, VF, getProp, putProp, cleanV, propName, objName, xform, hash, LFile };

  /* ---- vlax-curve-* : tham số như AutoCAD (đường: khoảng cách; cung / tròn / elip: góc; đa tuyến: số thứ tự đỉnh) ---- */
  function pathOf(e){
    const segs = []; let closed = false, kind = 'poly', p0 = 0;
    const seg = (s) => { s.len = s.t === 'l' ? Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) : Math.abs(s.sw) * s.r; segs.push(s); };
    if(e.type === 'LINE'){ kind = 'line'; seg({ t: 'l', a: { x: e.x1, y: e.y1 }, b: { x: e.x2, y: e.y2 } }); }
    else if(e.type === 'ARC'){ kind = 'arc'; const a1 = e.a1 * D2R; let sw = (e.a2 - e.a1) * D2R; while(sw <= 0) sw += TAU; seg({ t: 'a', c: { x: e.cx, y: e.cy }, r: e.r, a0: a1, sw }); p0 = a1; }
    else if(e.type === 'CIRCLE'){ kind = 'arc'; closed = true; seg({ t: 'a', c: { x: e.cx, y: e.cy }, r: e.r, a0: 0, sw: TAU }); }
    else if(e.type === 'POLYLINE'){ const B = (A().bvOf && A().bvOf(e)) || (e.vertices || []).map(v => ({ x: v.x, y: v.y, bulge: 0 })); closed = !!e.closed; const n = closed ? B.length : B.length - 1;
      for(let i = 0; i < n; i++){ const a = B[i], b = B[(i + 1) % B.length], bu = a.bulge || 0;
        if(Math.abs(bu) < 1e-12) seg({ t: 'l', a, b }); else { const th = 4 * Math.atan(bu), dx = b.x - a.x, dy = b.y - a.y, c = Math.hypot(dx, dy), d = c * (1 - bu * bu) / (4 * bu), C = { x: (a.x + b.x) / 2 - dy / c * d, y: (a.y + b.y) / 2 + dx / c * d };
          seg({ t: 'a', c: C, r: Math.hypot(a.x - C.x, a.y - C.y), a0: Math.atan2(a.y - C.y, a.x - C.x), sw: th }); } } }
    else { const c = A().G && A().G.curveOf(e); if(!c) throw new LispErr('vlax-curve: đối tượng không phải đường cong'); kind = e.type === 'ELLIPSE' ? 'ell' : 'frac'; closed = !!c.closed;
      for(const q of c.pieces) if(q.t === 's') seg({ t: 'l', a: { x: q.ax, y: q.ay }, b: { x: q.bx, y: q.by } }); else seg({ t: 'a', c: { x: q.cx, y: q.cy }, r: q.r, a0: q.a0, sw: q.sw });
      if(e.type === 'ELLIPSE'){ p0 = e.p1 || 0; } }
    const cum = [0]; for(const s of segs) cum.push(cum[cum.length - 1] + s.len); const len = cum[cum.length - 1];
    const atSeg = (s, f) => s.t === 'l' ? { x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f } : { x: s.c.x + s.r * Math.cos(s.a0 + s.sw * f), y: s.c.y + s.r * Math.sin(s.a0 + s.sw * f) };
    // tham số ↔ khoảng cách
    let p1, d2p, p2d;
    if(kind === 'line'){ p1 = len; d2p = d => d; p2d = p => p; }
    else if(kind === 'arc'){ const s = segs[0]; p1 = p0 + s.sw; d2p = d => p0 + d / s.r; p2d = p => (p - p0) * s.r; }
    else if(kind === 'poly'){ p1 = segs.length; d2p = d => { let i = 0; while(i < segs.length - 1 && cum[i + 1] < d) i++; return i + (segs[i].len ? (d - cum[i]) / segs[i].len : 0); }; p2d = p => { const i = Math.min(segs.length - 1, Math.max(0, Math.floor(p))); return cum[i] + (p - i) * (segs[i] ? segs[i].len : 0); }; }
    else if(kind === 'ell'){ const e2 = e.p2 != null ? e.p2 : TAU; p1 = e2; d2p = d => p0 + (e2 - p0) * (len ? d / len : 0); p2d = p => (p - p0) / ((e2 - p0) || 1) * len; }
    else { p1 = 1; d2p = d => len ? d / len : 0; p2d = p => p * len; }
    const ptAtDist = d => { d = Math.max(0, Math.min(len, d)); let i = 0; while(i < segs.length - 1 && cum[i + 1] < d) i++; const s = segs[i]; return atSeg(s, s.len ? (d - cum[i]) / s.len : 0); };
    const closest = q => { let best = null; segs.forEach((s, i) => { let f; if(s.t === 'l'){ const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, L2 = dx * dx + dy * dy; f = L2 ? ((q.x - s.a.x) * dx + (q.y - s.a.y) * dy) / L2 : 0; }
      else { let t = Math.atan2(q.y - s.c.y, q.x - s.c.x) - s.a0; if(s.sw > 0){ t = ((t % TAU) + TAU) % TAU; if(t > s.sw) t = (t - s.sw < TAU - t) ? s.sw : 0; } else { t = -((((-t) % TAU) + TAU) % TAU); if(t < s.sw) t = (s.sw - t < TAU + t) ? s.sw : 0; } f = s.sw ? t / s.sw : 0; }
      f = Math.max(0, Math.min(1, f)); const p = atSeg(s, f), dd = Math.hypot(p.x - q.x, p.y - q.y); if(!best || dd < best.dd) best = { p, dd, dist: cum[i] + f * s.len }; }); return best; };
    let area = 0; { const P = []; for(let k = 0; k <= 256; k++) P.push(ptAtDist(len * k / 256)); for(let k = 0; k + 1 < P.length; k++) area += P[k].x * P[k + 1].y - P[k + 1].x * P[k].y; area = Math.abs(area / 2); }
    if(kind === 'poly' && segs.every(s => s.t === 'l')){ const B = segs.map(s => s.a).concat(closed ? [] : [segs[segs.length - 1].b]); let s2 = 0; for(let k = 0; k < B.length; k++){ const a = B[k], b = B[(k + 1) % B.length]; s2 += a.x * b.y - b.x * a.y; } area = Math.abs(s2 / 2); }
    if(kind === 'arc' && e.type === 'CIRCLE') area = Math.PI * e.r * e.r;
    return { segs, closed, len, p0, p1, d2p, p2d, ptAtDist, closest, area, pointAt: p => ptAtDist(p2d(p)),
      deriv: p => { const d = p2d(p), h = Math.max(1e-6, len * 1e-6), a = ptAtDist(Math.max(0, d - h)), b = ptAtDist(Math.min(len, d + h)), dd = Math.hypot(b.x - a.x, b.y - a.y) || 1; const scale = kind === 'arc' ? segs[0].r : kind === 'poly' ? (segs[Math.min(segs.length - 1, Math.floor(p))] || { len: 1 }).len : 1; return { x: (b.x - a.x) / dd * scale, y: (b.y - a.y) / dd * scale }; } };
  }
  const cv = o => pathOf(entOf(o instanceof VObj ? o : o)[0]);
  BI('VLAX-CURVE-GETSTARTPARAM', o => cv(o).p0); BI('VLAX-CURVE-GETENDPARAM', o => cv(o).p1);
  BI('VLAX-CURVE-GETSTARTPOINT', o => { const c = cv(o); return lpt(c.ptAtDist(0)); }); BI('VLAX-CURVE-GETENDPOINT', o => { const c = cv(o); return lpt(c.ptAtDist(c.len)); });
  BI('VLAX-CURVE-GETPOINTATPARAM', (o, p) => { const c = cv(o), v = toReal(p); if(v < c.p0 - 1e-9 || v > c.p1 + 1e-9) return null; return lpt(c.pointAt(v)); });
  BI('VLAX-CURVE-GETPOINTATDIST', (o, d) => { const c = cv(o), v = toReal(d); if(v < -1e-9 || v > c.len + 1e-9) return null; return lpt(c.ptAtDist(v)); });
  BI('VLAX-CURVE-GETDISTATPARAM', (o, p) => { const c = cv(o), v = toReal(p); if(v < c.p0 - 1e-9 || v > c.p1 + 1e-9) return null; return c.p2d(v); });
  BI('VLAX-CURVE-GETPARAMATDIST', (o, d) => { const c = cv(o), v = toReal(d); if(v < -1e-9 || v > c.len + 1e-9) return null; return c.d2p(v); });
  BI('VLAX-CURVE-GETDISTATPOINT', (o, p) => { const c = cv(o), q = pt(p), b = c.closest(q); return b && b.dd < Math.max(1e-6, c.len * 1e-7) ? b.dist : null; });
  BI('VLAX-CURVE-GETPARAMATPOINT', (o, p) => { const c = cv(o), q = pt(p), b = c.closest(q); return b && b.dd < Math.max(1e-6, c.len * 1e-7) ? c.d2p(b.dist) : null; });
  BI(['VLAX-CURVE-GETCLOSESTPOINTTO', 'VLAX-CURVE-GETCLOSESTPOINTTOPROJECTION'], (o, p) => { const c = cv(o), b = c.closest(pt(p)); return b ? lpt(b.p) : null; });
  BI('VLAX-CURVE-GETFIRSTDERIV', (o, p) => { const d = cv(o).deriv(toReal(p)); return [d.x, d.y, 0]; });
  BI('VLAX-CURVE-GETSECONDDERIV', () => [0, 0, 0]);
  BI('VLAX-CURVE-GETAREA', o => cv(o).area); BI('VLAX-CURVE-ISCLOSED', o => cv(o).closed ? T : null); BI('VLAX-CURVE-ISPLANAR', () => T); BI('VLAX-CURVE-ISPERIODIC', o => cv(o).closed ? T : null);

  /* ==================================================================
     4) Hàm AutoLISP còn thiếu
     ================================================================== */
  // grread: (grread [track [allkeys [curtype]]]) → (5 điểm) khi rê chuột (track), (3 điểm) khi bấm, (2 mã phím), (25 …) chuột phải
  BI('GRREAD', (track) => new Promise(res => { const cvs = document.getElementById('cv'); const w = p => { try{ return A().screenToWorld ? A().screenToWorld(p.x, p.y) : toWorld(p.x, p.y); }catch(_){ return { x: 0, y: 0 }; } };
    const loc = e => { const b = cvs.getBoundingClientRect(); return w({ x: e.clientX - b.left, y: e.clientY - b.top }); };
    const off = () => { cvs.removeEventListener('pointermove', mv); window.removeEventListener('pointerdown', dn, true); window.removeEventListener('keydown', kd, true); };
    const mv = e => { if(!truthy(track)) return; off(); res([mkInt(5), lpt(loc(e))]); };
    const dn = e => { if(e.target !== cvs) return; e.stopPropagation(); e.preventDefault(); off(); res(e.button === 2 ? [mkInt(25), mkInt(0)] : [mkInt(3), lpt(loc(e))]); };
    const kd = e => { if(e.key.length !== 1 && !['Enter', 'Escape', 'Backspace', 'Tab', ' '].includes(e.key)) return; e.stopPropagation(); e.preventDefault(); off(); const c = e.key === 'Enter' ? 13 : e.key === 'Escape' ? 27 : e.key === 'Backspace' ? 8 : e.key === 'Tab' ? 9 : e.key.charCodeAt(0); res([mkInt(2), mkInt(c)]); };
    cvs.addEventListener('pointermove', mv); window.addEventListener('pointerdown', dn, true); /* trước bộ xử lý chuột của .stage */ window.addEventListener('keydown', kd, true); }));
  const TMP = []; const tmpDraw = () => { try{ draw(); const c = document.getElementById('cv'), g = c.getContext('2d'); const toS = (x, y) => typeof toScreen === 'function' ? toScreen(x, y) : { x, y }; for(const v of TMP){ const a = toS(v.a.x, v.a.y), b = toS(v.b.x, v.b.y); g.save(); g.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0); g.strokeStyle = v.col; if(v.hl) g.setLineDash([6, 4]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.restore(); } }catch(_){} };
  BI('GRDRAW', (a, b, c, hl) => { TMP.push({ a: pt(a), b: pt(b), col: toInt(c) < 0 ? '#ffffff' : aci(toInt(c)), hl: hl !== undefined && toInt(hl) !== 0 }); tmpDraw(); return null; });
  BI('GRVECS', (vl) => { const l = L(vl); let col = '#ffffff'; for(let i = 0; i < l.length; i++){ if(isNum(l[i])){ col = aci(toInt(l[i])); continue; } if(i + 1 < l.length){ TMP.push({ a: pt(l[i]), b: pt(l[i + 1]), col }); i++; } } tmpDraw(); return null; });
  BI('GRCLEAR', () => { TMP.length = 0; try{ draw(); }catch(_){} return null; });
  BI('GRTEXT', (box, s) => { if(box !== undefined && s !== undefined) log(toStr(s)); return s === undefined ? null : s; });
  const redraw0 = G.get('REDRAW'); BI('REDRAW', (...a) => { if(!a.length){ TMP.length = 0; } return redraw0(...a); });
  // bảng (tblnext / tblobjname)
  const TBL = { LAYER: () => A().layerNames(), LTYPE: () => (A().ltNames ? A().ltNames() : ['CONTINUOUS']), STYLE: () => ['Standard'], DIMSTYLE: () => ['Standard', 'ISO-25'], BLOCK: () => { const B = A().blockList ? A().blockList() : { file: [], lib: [] }; return [...(B.file || []), ...(B.lib || [])].map(b => b.name || b); }, APPID: () => ['ACAD', 'DVDCAD'], VIEW: () => [], UCS: () => [], VPORT: () => ['*Active'] };
  const tblPos = {};
  BI('TBLNEXT', (t, rew) => { const nm = toStr(t).toUpperCase(); const f = TBL[nm]; if(!f) return null; if(truthy(rew) || tblPos[nm] == null) tblPos[nm] = 0; const l = f(); const i = tblPos[nm]++; if(i >= l.length) return null; return getv(sym('TBLSEARCH'))(nm, l[i]) || [new DP(mkInt(0), nm), new DP(mkInt(2), l[i]), new DP(mkInt(70), mkInt(0))]; });
  BI('TBLOBJNAME', (t, n) => { const r = getv(sym('TBLSEARCH'))(t, n); return r ? new Ename('T:' + toStr(t).toUpperCase() + ':' + toStr(n)) : null; });
  BI('NAMEDOBJDICT', () => new Ename('D:ROOT')); BI(['DICTSEARCH', 'DICTNEXT', 'DICTADD', 'DICTREMOVE', 'DICTRENAME'], () => null);
  BI('REGAPP', n => toStr(n)); BI(['XDROOM'], () => mkInt(16383)); BI('XDSIZE', l => mkInt(str(l).length));
  BI('TRANS', (p, from, to, disp) => p); BI('OSNAP', (p, m) => { try{ const q = pt(p); if(A().snapPoint){ const r = A().snapPoint(q, toStr(m)); if(r) return lpt(r); } return lpt(q); }catch(_){ return p; } });
  BI('TEXTBOX', el => { const h = toReal(gc(el, 40) || 2.5), s = String(gc(el, 1) || ''); const w = s.length * h * 0.75; return [[0.0, -0.2 * h, 0.0], [w, h, 0.0]]; });
  BI('SSNAMEX', (ss, i) => { const l = ss instanceof SS ? ss.l : []; const pick = i === undefined ? l : [l[toInt(i)]].filter(Boolean); return pick.length ? pick.map(e => [mkInt(0), e, mkInt(0)]) : null; });
  BI('SSGETFIRST', () => { try{ const s = [...(window.selEnts || [])]; return [null, s.length ? new SS(s.map(e => ename(e))) : null]; }catch(_){ return [null, null]; } });
  BI('VL-STRING-POSITION', (c, s, st, fe) => { const ch = String.fromCharCode(toInt(c)), x = toStr(s), from = st == null ? 0 : toInt(st); const i = truthy(fe) ? x.lastIndexOf(ch) : x.indexOf(ch, from); return i < 0 ? null : mkInt(i); });
  BI('VL-STRING-TRANSLATE', (a, b, s) => { const f = toStr(a), t = toStr(b); return [...toStr(s)].map(ch => { const i = f.indexOf(ch); return i < 0 ? ch : (t[i] != null ? t[i] : ''); }).join(''); });
  BI('VL-STRING-ELT', (s, i) => mkInt(toStr(s).charCodeAt(toInt(i))));
  BI('VL-STRING-MISMATCH', (a, b, p1, p2, ic) => { let x = toStr(a).slice(p1 == null ? 0 : toInt(p1)), y = toStr(b).slice(p2 == null ? 0 : toInt(p2)); if(truthy(ic)){ x = x.toUpperCase(); y = y.toUpperCase(); } let k = 0; while(k < x.length && k < y.length && x[k] === y[k]) k++; return mkInt(k); });
  BI('VL-SYMBOL-VALUE', s => getv(s)); BI('VL-SYMBOLP', s => s instanceof Sym ? T : null);
  BI(['VL-BB-REF', 'VL-DOC-REF'], s => getv(s)); BI(['VL-BB-SET', 'VL-DOC-SET'], (s, v) => { setv(s, v); return v; }); BI(['VL-PROPAGATE', 'VL-DOC-EXPORT', 'VL-DOC-IMPORT', 'VL-ACAD-DEFUN', 'VL-ACAD-UNDEFUN'], () => null);
  BI('VL-EXIT-WITH-VALUE', v => { throw new X.Quit('exit'); }); BI('VL-EXIT-WITH-ERROR', m => { throw new LispErr(toStr(m)); });
  BI('VER', () => 'Visual LISP 2027 (vi) — DVDCAD'); BI('GETPID', () => mkInt(1));
  BI('CVUNIT', (v, a, b) => { const U = { mm: 1, millimeter: 1, millimeters: 1, cm: 10, centimeter: 10, m: 1000, meter: 1000, meters: 1000, km: 1e6, inch: 25.4, inches: 25.4, in: 25.4, foot: 304.8, feet: 304.8, ft: 304.8, yard: 914.4, mile: 1609344, degree: 1, degrees: 1, radian: 180 / Math.PI, radians: 180 / Math.PI };
    const f = U[toStr(a).toLowerCase()], t = U[toStr(b).toLowerCase()]; if(!f || !t) return null; const cvt = x => nv(x) * f / t; return Array.isArray(v) ? v.map(cvt) : cvt(v); });
  BI('GETCFG', n => { try{ return localStorage.getItem('dvd:lispcfg:' + toStr(n)) || ''; }catch(_){ return ''; } }); BI('SETCFG', (n, v) => { try{ localStorage.setItem('dvd:lispcfg:' + toStr(n), toStr(v)); }catch(_){} return v; });
  BI(['VL-REGISTRY-READ', 'VL-REGISTRY-DESCENDENTS'], (k, n) => { try{ const v = localStorage.getItem('dvd:reg:' + toStr(k) + '|' + (n == null ? '' : toStr(n))); return v == null ? null : JSON.parse(v); }catch(_){ return null; } });
  BI('VL-REGISTRY-WRITE', (k, n, v) => { try{ localStorage.setItem('dvd:reg:' + toStr(k) + '|' + (n == null ? '' : toStr(n)), JSON.stringify(v)); }catch(_){} return v; }); BI('VL-REGISTRY-DELETE', () => T);
  BI(['MENUCMD', 'MENUGROUP', 'SETFUNHELP', 'HELP', 'STARTAPP', 'ACAD-PUSH-DBMOD', 'ACAD-POP-DBMOD', 'VL-GET-RESOURCE', 'SETVIEW'], () => null);
  BI('LAYOUTLIST', () => { try{ const l = dwgLayouts.filter(x => !x.isModel).map(x => x.name); return l.length ? l : null; }catch(_){ return null; } });
  BI('VL-LIST*', (...a) => { if(a.length === 1) return a[0]; const last = a[a.length - 1]; const head = a.slice(0, -1); return last === null ? head : Array.isArray(last) ? head.concat(last) : head.reduceRight((d, x) => new DP(x, d), last); });
  BI('SNVALID', s => /^[^<>/\\":;?*|,=`]+$/.test(toStr(s)) ? T : null);
  BI('ACAD_COLORDLG', (c) => new Promise(res => { const cur = c == null ? 7 : toInt(c); try{ A().aciPicker(null, h => { if(!h){ res(null); return; } if(h === 'BYLAYER'){ res(mkInt(256)); return; } res(mkInt(A().aciOf ? A().aciOf(h) : cur)); }); }catch(_){ res(mkInt(cur)); } }));
  BI('ACAD_TRUECOLORDLG', (c) => new Promise(res => { try{ A().aciPicker(null, h => { if(!h){ res(null); return; } res([new DP(mkInt(62), mkInt(A().aciOf ? A().aciOf(h) : 7)), new DP(mkInt(420), mkInt(parseInt(String(h).replace('#', ''), 16) || 0))]); }); }catch(_){ res(null); } }));
  // reactor (vlr-*): tạo được đối tượng nhưng chưa phát sinh sự kiện
  let vlrWarn = false; const vlr = () => { if(!vlrWarn){ vlrWarn = true; log('AutoLISP: reactor (vlr-*) được tạo nhưng DVDCAD chưa phát sinh sự kiện cho reactor.'); } return new VObj('reactor'); };
  for(const n of ['VLR-COMMAND-REACTOR', 'VLR-EDITOR-REACTOR', 'VLR-OBJECT-REACTOR', 'VLR-DWG-REACTOR', 'VLR-DOCMANAGER-REACTOR', 'VLR-SYSVAR-REACTOR', 'VLR-ACDB-REACTOR', 'VLR-MOUSE-REACTOR', 'VLR-LISP-REACTOR', 'VLR-MISCELLANEOUS-REACTOR', 'VLR-TOOLBAR-REACTOR', 'VLR-UNDO-REACTOR', 'VLR-XREF-REACTOR', 'VLR-LINKER-REACTOR', 'VLR-WBLOCK-REACTOR', 'VLR-INSERT-REACTOR', 'VLR-DEEPCLONE-REACTOR']) BI(n, vlr);
  BI(['VLR-REMOVE', 'VLR-REMOVE-ALL', 'VLR-ADD', 'VLR-PERS', 'VLR-PERS-RELEASE', 'VLR-OWNER-ADD', 'VLR-OWNER-REMOVE', 'VLR-DATA-SET', 'VLR-REACTION-SET', 'VLR-SET-NOTIFICATION'], () => null);
  BI(['VLR-REACTORS', 'VLR-PERS-LIST', 'VLR-OWNERS', 'VLR-DATA', 'VLR-ADDED-P', 'VLR-TYPE', 'VLR-TYPES', 'VLR-REACTIONS', 'VLR-CURRENT-REACTION-NAME'], () => null);
  // acet- (Express Tools) thông dụng
  BI('ACET-STR-REPLACE', (a, b, s) => toStr(s).split(toStr(a)).join(toStr(b)));
  BI(['ACET-UI-PROGRESS', 'ACET-UI-PROGRESS-INIT', 'ACET-UI-PROGRESS-SAFE', 'ACET-UI-PROGRESS-DONE', 'ACET-ERROR-INIT', 'ACET-ERROR-RESTORE', 'ACET-SYSVAR-SET', 'ACET-SYSVAR-RESTORE', 'ACET-UI-STATUS'], () => null);
  BI('ACET-LIST-REMOVE-DUPLICATES', (l) => { const out = []; for(const x of L(l)) if(!out.some(y => getv(sym('EQUAL'))(x, y))) out.push(x); return out.length ? out : null; });
  BI('ACET-GEOM-MIDPOINT', (a, b) => { const p = pt(a), q = pt(b); return [(p.x + q.x) / 2, (p.y + q.y) / 2, ((p.z || 0) + (q.z || 0)) / 2]; });

  /* ==================================================================
     5) acad.lsp / acaddoc.lsp / S::STARTUP trong kho tệp hỗ trợ: tự nạp khi mở app (như AutoCAD)
     ================================================================== */
  // thứ tự như AutoCAD: acad.lsp → acaddoc.lsp → *.mnl → Startup Suite (suite) → S::STARTUP
  DVDLisp.startup = async (suite) => { await fsReady; for(const n of ['acad.lsp', 'acaddoc.lsp']){ const f = fsGet(n); if(f){ try{ await DVDLisp.load(f.text, f.name); log('Đã tự nạp ' + f.name + ' (thư mục hỗ trợ).'); }catch(_){} } }
    for(const f of VFS.values()) if(/\.mnl$/i.test(f.name)) try{ await DVDLisp.load(f.text, f.name); }catch(_){}
    if(suite) try{ await suite(); }catch(_){}
    if(getv(sym('S::STARTUP'))) try{ await DVDLisp.eval('(S::STARTUP)'); }catch(_){} };

  const css = document.createElement('style'); css.textContent = `
  .dcl-host{min-width:220px;max-width:min(900px,92vw)} .dcl-root{gap:6px}
  .dcl-row{display:flex;flex-direction:row;gap:6px;align-items:flex-start;flex-wrap:wrap} .dcl-col{display:flex;flex-direction:column;gap:5px}
  fieldset.dcl-grp{margin:2px 0;padding:6px 8px} .dcl-field{display:flex;align-items:center;gap:6px} .dcl-field.dcl-vert{flex-direction:column;align-items:stretch}
  .dcl-field>span{white-space:nowrap} .dcl-field select,.dcl-field input[type=text]{min-width:60px} .dcl-btn{min-width:72px}
  .dcl-text{min-height:16px;white-space:pre-wrap} .dcl-err{color:#ff8a8a} .dcl-img{padding:0;border:1px solid #454e5c;background:none;line-height:0} .dcl-hl{outline:2px solid #3d6fb6}`;
  document.head.appendChild(css);
})();
