/* DVDCAD v5d — bộ thông dịch AutoLISP (tập con thông dụng)
   Chạy file .lsp nạp bằng APPLOAD / (load "ten"), gõ biểu thức ở dòng lệnh: (+ 1 2), !bien
   - (defun c:TEN () …) → thành lệnh TEN của DVDCAD
   - getpoint / getdist / getangle / getreal / getint / getstring / getkword / initget / entsel / ssget
   - (command "LINE" p1 p2 "") chạy lệnh DVDCAD, pause = chờ người dùng
   - entget / entmod / entmake / entdel / entlast / entnext, ssget "X" + bộ lọc, tblsearch, getvar / setvar
   Phạm vi biến động (dynamic scope) như AutoLISP; số nguyên và số thực tách riêng: (/ 5 2) = 2, (/ 5 2.0) = 2.5 */
(function(){
  'use strict';
  if(window.DVDLisp) return;
  const A = () => window.DVDAcad;
  const D2R = Math.PI / 180;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------- kiểu dữ liệu ---------------- */
  class Sym { constructor(n){ this.n = n; } toString(){ return this.n; } }
  const SYMS = new Map(); const sym = n => { n = String(n).toUpperCase(); let s = SYMS.get(n); if(!s){ s = new Sym(n); SYMS.set(n, s); } return s; };
  class LI { constructor(v){ this.v = Math.trunc(v) | 0; } }   // số nguyên AutoLISP (32 bit)
  class DP { constructor(a, d){ this.a = a; this.d = d; } }    // cặp chấm (a . d)
  class Ename { constructor(id){ this.id = id; } }             // tên đối tượng: id bền (_lid) hoặc 'G:' + nhóm (khối, kích thước)
  class SS { constructor(l){ this.l = l || []; } }             // tập chọn
  class Fn { constructor(name, params, locals, body){ this.name = name; this.params = params; this.locals = locals; this.body = body; } }
  class LispErr extends Error {}
  class Quit extends Error {}
  const T = sym('T'), NIL = null, QUOTE = sym('QUOTE'), LAMBDA = sym('LAMBDA');
  const isNum = x => typeof x === 'number' || x instanceof LI;
  const nv = x => x instanceof LI ? x.v : x;
  const isList = x => Array.isArray(x);
  const truthy = x => !(x === null || x === undefined || (Array.isArray(x) && x.length === 0));
  const L = x => x === null || x === undefined ? [] : (Array.isArray(x) ? x : (() => { throw new LispErr('bad argument type: listp ' + str(x)); })());
  const mkInt = v => new LI(v);
  const toReal = x => { if(!isNum(x)) throw new LispErr('bad argument type: numberp: ' + str(x)); return nv(x); };
  const toInt = x => { if(x instanceof LI) return x.v; if(typeof x === 'number') return Math.trunc(x); throw new LispErr('bad argument type: fixnump: ' + str(x)); };
  const toStr = x => { if(typeof x !== 'string') throw new LispErr('bad argument type: stringp ' + str(x)); return x; };
  const pt = p => { const l = L(p); if(l.length < 2 || !isNum(l[0]) || !isNum(l[1])) throw new LispErr('bad argument type: point ' + str(p)); return { x: nv(l[0]), y: nv(l[1]), z: l.length > 2 ? nv(l[2]) : 0 }; };
  const lpt = (p, z) => p ? [p.x, p.y, z || 0] : null;

  /* ---------------- in ra chuỗi ---------------- */
  function fmtReal(v){ if(!isFinite(v)) return v > 0 ? '1.#INF' : v < 0 ? '-1.#INF' : '-1.#IND'; if(v !== 0 && (Math.abs(v) >= 1e15 || Math.abs(v) < 1e-6)) return v.toExponential(5).replace(/\.?0+e/, 'e').replace(/e([+-])(\d)$/, 'e$10$2'); let s = String(+v.toPrecision(6)); if(/e/.test(s)) s = String(+v.toFixed(0)); if(!s.includes('.')) s += '.0'; return s; }   // như AutoLISP: 6 chữ số có nghĩa
  function str(x, princ){
    if(x === null || x === undefined) return 'nil';
    if(x instanceof Sym) return x.n;
    if(x instanceof LI) return String(x.v);
    if(typeof x === 'number') return fmtReal(x);
    if(typeof x === 'string') return princ ? x : '"' + x.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    if(x instanceof DP) return '(' + str(x.a, princ) + ' . ' + str(x.d, princ) + ')';
    if(x instanceof Ename) return '<Entity name: ' + String(x.id).replace(/^G:/, 'g') + '>';
    if(x instanceof SS) return '<Selection set: ' + x.l.length + '>';
    if(x instanceof Fn) return '#<USUBR @' + (x.name || 'lambda') + '>';
    if(typeof x === 'function') return '#<SUBR @' + (x.lname || 'fn') + '>';
    if(Array.isArray(x)){ if(!x.length) return 'nil'; if(x.length === 2 && x[0] === QUOTE) return "'" + str(x[1], princ); return '(' + x.map(e => str(e, princ)).join(' ') + ')'; }
    return String(x);
  }

  /* ---------------- đọc mã (reader) ---------------- */
  function tokenize(src){
    const out = []; let i = 0; const n = src.length;
    while(i < n){
      const c = src[i];
      if(c === ';'){ if(src[i + 1] === '|'){ const j = src.indexOf('|;', i + 2); i = j < 0 ? n : j + 2; } else { while(i < n && src[i] !== '\n') i++; } continue; }
      if(/\s/.test(c)){ i++; continue; }
      if(c === '(' || c === ')' || c === "'"){ out.push(c); i++; continue; }
      if(c === '"'){ let s = ''; i++; while(i < n && src[i] !== '"'){ if(src[i] === '\\' && i + 1 < n){ const e = src[i + 1]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e === 'e' ? '\x1b' : e; i += 2; continue; } s += src[i++]; } i++; out.push({ s }); continue; }
      let j = i; while(j < n && !/[\s()';"]/.test(src[j])) j++; out.push(src.slice(i, j)); i = j;
    }
    return out;
  }
  function atom(t){
    if(typeof t === 'object') return t.s;
    if(/^[+-]?\d+$/.test(t)) return mkInt(parseInt(t, 10));
    if(/^[+-]?(\d+\.\d*|\.\d+|\d+)(e[+-]?\d+)?$/i.test(t)) return parseFloat(t);
    if(t.toUpperCase() === 'NIL') return null;
    return sym(t);
  }
  function parse(src){
    const toks = tokenize(src); let p = 0; const forms = [];
    const read = () => {
      if(p >= toks.length) throw new LispErr('malformed list on input');
      const t = toks[p++];
      if(t === '('){ const l = []; let dot = null; while(true){ if(p >= toks.length) throw new LispErr('malformed list on input'); if(toks[p] === ')'){ p++; break; } if(toks[p] === '.'){ p++; dot = read(); continue; } l.push(read()); } if(dot !== null){ if(Array.isArray(dot)) return l.concat(dot); return l.length === 1 ? new DP(l[0], dot) : new DP(l[0], dot); } return l.length ? l : null; }
      if(t === ')') throw new LispErr('extra right paren on input');
      if(t === "'") return [QUOTE, read()];
      return atom(t);
    };
    while(p < toks.length) forms.push(read());
    return forms;
  }

  /* ---------------- môi trường (phạm vi động) ---------------- */
  const G = new Map();   // biến + hàm toàn cục (cùng không gian tên như AutoLISP)
  const getv = s => G.has(s.n) ? G.get(s.n) : (s === T ? T : null);
  const setv = (s, v) => { if(s === T) throw new LispErr('attempt to set constant T'); G.set(s.n, v); };
  async function withBindings(names, vals, fn){
    const saved = names.map(s => [s.n, G.has(s.n), G.get(s.n)]);
    names.forEach((s, k) => G.set(s.n, k < vals.length ? vals[k] : null));
    try{ return await fn(); }
    finally{ for(const [n, had, v] of saved){ if(had) G.set(n, v); else G.delete(n); } }
  }

  /* ---------------- bộ đánh giá ---------------- */
  const SPECIAL = new Map();
  let steps = 0, stopFlag = false;
  async function ev(x){
    if(x instanceof Sym) return getv(x);
    if(!Array.isArray(x)) return x;
    if(!x.length) return null;
    if(++steps % 2000 === 0){ await sleep(0); if(stopFlag){ stopFlag = false; throw new Quit('quit / exit abort'); } }
    const h = x[0];
    if(h instanceof Sym){ const sp = SPECIAL.get(h.n); if(sp) return sp(x); }
    const f = h instanceof Sym ? getv(h) : await ev(h);
    const args = []; for(let k = 1; k < x.length; k++) args.push(await ev(x[k]));
    return apply(f, args, h);
  }
  function toFn(f){
    if(f instanceof Fn || typeof f === 'function') return f;
    if(f instanceof Sym) return toFn(getv(f));
    if(Array.isArray(f) && f[0] === LAMBDA) return mkLambda(f);
    return null;
  }
  async function apply(f, args, h){
    const fn = toFn(f); if(!fn) throw new LispErr('no function definition: ' + (h ? str(h) : str(f)));
    if(typeof fn === 'function') return fn(...args);
    const nm = fn.params.concat(fn.locals);
    return withBindings(nm, args, async () => { let r = null; for(const b of fn.body) r = await ev(b); return r; });
  }
  async function progn(body){ let r = null; for(const b of body) r = await ev(b); return r; }
  function parseArgs(list){ const ps = [], ls = []; let loc = false; for(const a of L(list)){ if(a instanceof Sym && a.n === '/'){ loc = true; continue; } (loc ? ls : ps).push(a); } return [ps, ls]; }
  function mkLambda(x){ const [ps, ls] = parseArgs(x[1]); return new Fn(null, ps, ls, x.slice(2)); }

  SPECIAL.set('QUOTE', x => x[1]);
  SPECIAL.set('FUNCTION', async x => { const v = x[1]; return Array.isArray(v) && v[0] === LAMBDA ? mkLambda(v) : v instanceof Sym ? getv(v) : ev(v); });
  SPECIAL.set('LAMBDA', x => mkLambda(x));
  SPECIAL.set('SETQ', async x => { let r = null; for(let k = 1; k < x.length; k += 2){ if(!(x[k] instanceof Sym)) throw new LispErr('bad argument type: symbolp ' + str(x[k])); r = await ev(x[k + 1]); setv(x[k], r); } return r; });
  const defun = async x => {
    const name = x[1]; if(!(name instanceof Sym)) throw new LispErr('bad DEFUN syntax');
    const [ps, ls] = parseArgs(x[2]); const fn = new Fn(name.n, ps, ls, x.slice(3)); setv(name, fn);
    if(/^C:./.test(name.n)) regCmd(name.n.slice(2), fn);
    return name;
  };
  SPECIAL.set('DEFUN', defun); SPECIAL.set('DEFUN-Q', defun);
  SPECIAL.set('IF', async x => truthy(await ev(x[1])) ? ev(x[2]) : (x.length > 3 ? ev(x[3]) : null));
  SPECIAL.set('COND', async x => { for(const cl of x.slice(1)){ const c = L(cl); const t = await ev(c[0]); if(truthy(t)) return c.length > 1 ? progn(c.slice(1)) : t; } return null; });
  SPECIAL.set('WHILE', async x => { let r = null; while(truthy(await ev(x[1]))) r = await progn(x.slice(2)); return r; });
  SPECIAL.set('REPEAT', async x => { const n = toInt(await ev(x[1])); let r = null; for(let k = 0; k < n; k++) r = await progn(x.slice(2)); return r; });
  SPECIAL.set('FOREACH', async x => { const v = x[1], l = L(await ev(x[2])); let r = null; await withBindings([v], [null], async () => { for(const e of l){ G.set(v.n, e); r = await progn(x.slice(3)); } }); return r; });
  SPECIAL.set('PROGN', x => progn(x.slice(1)));
  SPECIAL.set('AND', async x => { for(const e of x.slice(1)) if(!truthy(await ev(e))) return null; return T; });
  SPECIAL.set('OR', async x => { for(const e of x.slice(1)) if(truthy(await ev(e))) return T; return null; });
  SPECIAL.set('VL-CATCH-ALL-APPLY', async x => { const f = await ev(x[1]), a = L(await ev(x[2])); try{ return await apply(f, a); }catch(err){ if(err instanceof Quit) throw err; return { catchErr: err.message || String(err) }; } });

  /* ---------------- hàm có sẵn ---------------- */
  const BI = (names, fn) => { for(const n of [].concat(names)){ fn.lname = n; G.set(n.toUpperCase(), fn); } };
  const allInt = a => a.every(x => x instanceof LI);
  const num = (a, f, fi) => { if(!a.every(isNum)) throw new LispErr('bad argument type: numberp: ' + str(a.find(x => !isNum(x)))); if(allInt(a) && fi) return mkInt(fi(a.map(nv))); return f(a.map(nv)); };
  BI('+', (...a) => num(a, v => v.reduce((s, x) => s + x, 0), v => v.reduce((s, x) => s + x, 0)));
  BI('-', (...a) => num(a, v => v.length === 1 ? -v[0] : v.slice(1).reduce((s, x) => s - x, v[0] || 0), v => v.length === 1 ? -v[0] : v.slice(1).reduce((s, x) => s - x, v[0] || 0)));
  BI('*', (...a) => num(a, v => v.reduce((s, x) => s * x, 1), v => v.reduce((s, x) => s * x, 1)));
  BI('/', (...a) => { if(!a.length) return mkInt(0); return num(a, v => v.slice(1).reduce((s, x) => { if(x === 0) throw new LispErr('divide by zero'); return s / x; }, v[0]), v => v.slice(1).reduce((s, x) => { if(x === 0) throw new LispErr('divide by zero'); return Math.trunc(s / x); }, v[0])); });
  BI('REM', (...a) => num(a, v => v.slice(1).reduce((s, x) => s % x, v[0]), v => v.slice(1).reduce((s, x) => s % x, v[0])));
  BI('1+', a => num([a], v => v[0] + 1, v => v[0] + 1)); BI('1-', a => num([a], v => v[0] - 1, v => v[0] - 1));
  BI('ABS', a => num([a], v => Math.abs(v[0]), v => Math.abs(v[0])));
  BI('MIN', (...a) => num(a, v => Math.min(...v), v => Math.min(...v))); BI('MAX', (...a) => num(a, v => Math.max(...v), v => Math.max(...v)));
  BI('SQRT', a => Math.sqrt(toReal(a))); BI('SIN', a => Math.sin(toReal(a))); BI('COS', a => Math.cos(toReal(a))); BI('EXP', a => Math.exp(toReal(a)));
  BI('LOG', a => { const v = toReal(a); if(v <= 0) throw new LispErr('function undefined for argument: ' + str(a)); return Math.log(v); });
  BI('ATAN', (a, b) => b === undefined ? Math.atan(toReal(a)) : Math.atan2(toReal(a), toReal(b)));
  BI('EXPT', (a, b) => (a instanceof LI && b instanceof LI && b.v >= 0) ? mkInt(Math.pow(a.v, b.v)) : Math.pow(toReal(a), toReal(b)));
  BI('FIX', a => mkInt(Math.trunc(toReal(a)))); BI('FLOAT', a => toReal(a));
  BI('GCD', (a, b) => { let x = Math.abs(toInt(a)), y = Math.abs(toInt(b)); while(y){ [x, y] = [y, x % y]; } return mkInt(x); });
  BI('LOGAND', (...a) => mkInt(a.map(toInt).reduce((s, x) => s & x, -1))); BI('LOGIOR', (...a) => mkInt(a.map(toInt).reduce((s, x) => s | x, 0)));
  BI('~', a => mkInt(~toInt(a))); BI('LSH', (a, b) => { const n = toInt(b); return mkInt(n >= 0 ? toInt(a) << n : toInt(a) >> -n); });
  BI('ZEROP', a => toReal(a) === 0 ? T : null); BI('MINUSP', a => toReal(a) < 0 ? T : null);
  BI('NUMBERP', a => isNum(a) ? T : null);
  const eqv = (a, b) => { if(isNum(a) && isNum(b)) return nv(a) === nv(b); if(a instanceof Ename && b instanceof Ename) return a.id === b.id; return a === b || (a === null && Array.isArray(b) && !b.length) || (b === null && Array.isArray(a) && !a.length); };
  const cmp = f => (...a) => { for(let k = 0; k + 1 < a.length; k++){ const x = a[k], y = a[k + 1]; const r = typeof x === 'string' && typeof y === 'string' ? f(x < y ? -1 : x > y ? 1 : 0, 0) : f(toReal(x), toReal(y)); if(!r) return null; } return T; };
  BI('=', (...a) => { for(let k = 0; k + 1 < a.length; k++) if(!(isNum(a[k]) && isNum(a[k + 1]) ? nv(a[k]) === nv(a[k + 1]) : a[k] === a[k + 1])) return null; return T; });
  BI('/=', (a, b) => (isNum(a) && isNum(b) ? nv(a) !== nv(b) : a !== b) ? T : null);
  BI('<', cmp((x, y) => x < y)); BI('>', cmp((x, y) => x > y)); BI('<=', cmp((x, y) => x <= y)); BI('>=', cmp((x, y) => x >= y));
  function equal(a, b, fz){
    if(isNum(a) && isNum(b)) return Math.abs(nv(a) - nv(b)) <= (fz || 0);
    if(Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, k) => equal(x, b[k], fz));
    if(a instanceof DP && b instanceof DP) return equal(a.a, b.a, fz) && equal(a.d, b.d, fz);
    return eqv(a, b);
  }
  BI('EQ', (a, b) => eqv(a, b) ? T : null); BI('EQUAL', (a, b, f) => equal(a, b, f === undefined ? 0 : toReal(f)) ? T : null);
  BI('NOT', a => truthy(a) ? null : T); BI('NULL', a => truthy(a) ? null : T);
  BI('ATOM', a => Array.isArray(a) && a.length ? null : T); BI('LISTP', a => (a === null || Array.isArray(a) || a instanceof DP) ? T : null);
  BI('VL-CONSP', a => (Array.isArray(a) && a.length) || a instanceof DP ? T : null);
  BI('TYPE', a => a === null ? null : a instanceof LI ? sym('INT') : typeof a === 'number' ? sym('REAL') : typeof a === 'string' ? sym('STR') : a instanceof Sym ? sym('SYM') : a instanceof Ename ? sym('ENAME') : a instanceof SS ? sym('PICKSET') : a instanceof Fn ? sym('USUBR') : typeof a === 'function' ? sym('SUBR') : sym('LIST'));
  BI('BOUNDP', a => a instanceof Sym && G.has(a.n) && G.get(a.n) !== null ? T : null);
  // danh sách
  const car = x => x instanceof DP ? x.a : L(x).length ? x[0] : null;
  const cdr = x => x instanceof DP ? x.d : L(x).length > 1 ? x.slice(1) : null;
  BI('CAR', car); BI('CDR', cdr);
  for(const path of ['AA', 'AD', 'DA', 'DD', 'AAA', 'AAD', 'ADA', 'ADD', 'DAA', 'DAD', 'DDA', 'DDD', 'ADDD']) BI('C' + path + 'R', x => { let v = x; for(const ch of path.split('').reverse()) v = ch === 'A' ? car(v) : cdr(v); return v; });
  BI('CONS', (a, b) => b === null ? [a] : Array.isArray(b) ? [a, ...b] : new DP(a, b));
  BI('LIST', (...a) => a.length ? a : null);
  BI('APPEND', (...a) => { const r = [].concat(...a.map(L)); return r.length ? r : null; });
  BI('REVERSE', a => { const r = L(a).slice().reverse(); return r.length ? r : null; });
  BI('LENGTH', a => mkInt(L(a).length)); BI('VL-LIST-LENGTH', a => mkInt(L(a).length));
  BI('NTH', (i, l) => { const k = toInt(i), a = L(l); return k >= 0 && k < a.length ? a[k] : null; });
  BI('LAST', a => { const l = L(a); return l.length ? l[l.length - 1] : null; });
  BI('ASSOC', (k, l) => { for(const e of L(l)){ const key = e instanceof DP ? e.a : Array.isArray(e) ? e[0] : undefined; if(key !== undefined && equal(key, k)) return e; } return null; });
  BI('MEMBER', (x, l) => { const a = L(l); const i = a.findIndex(e => equal(e, x)); return i < 0 ? null : a.slice(i); });
  BI('SUBST', (n, o, l) => { const r = L(l).map(e => equal(e, o) ? n : e); return r.length ? r : null; });
  BI('VL-POSITION', (x, l) => { const i = L(l).findIndex(e => equal(e, x)); return i < 0 ? null : mkInt(i); });
  BI('VL-REMOVE', (x, l) => { const r = L(l).filter(e => !equal(e, x)); return r.length ? r : null; });
  BI('ACAD_STRLSORT', l => { const r = L(l).slice().sort((a, b) => toStr(a).localeCompare(toStr(b))); return r.length ? r : null; });
  BI('MAPCAR', async (f, ...ls) => { const a = ls.map(L), n = Math.min(...a.map(x => x.length)); const r = []; for(let k = 0; k < n; k++) r.push(await apply(f, a.map(x => x[k]))); return r.length ? r : null; });
  BI('APPLY', (f, l) => apply(f, L(l)));
  BI('EVAL', x => ev(x));
  BI('VL-SORT', async (l, f) => { const a = L(l).slice(); for(let i = 1; i < a.length; i++){ const v = a[i]; let j = i - 1; while(j >= 0 && truthy(await apply(f, [v, a[j]]))){ a[j + 1] = a[j]; j--; } a[j + 1] = v; } return a.length ? a : null; });
  BI('VL-REMOVE-IF', async (f, l) => { const r = []; for(const e of L(l)) if(!truthy(await apply(f, [e]))) r.push(e); return r.length ? r : null; });
  BI('VL-REMOVE-IF-NOT', async (f, l) => { const r = []; for(const e of L(l)) if(truthy(await apply(f, [e]))) r.push(e); return r.length ? r : null; });
  BI('VL-SOME', async (f, l) => { for(const e of L(l)){ const r = await apply(f, [e]); if(truthy(r)) return r; } return null; });
  BI('VL-EVERY', async (f, l) => { for(const e of L(l)) if(!truthy(await apply(f, [e]))) return null; return T; });
  BI('VL-MEMBER-IF', async (f, l) => { const a = L(l); for(let i = 0; i < a.length; i++) if(truthy(await apply(f, [a[i]]))) return a.slice(i); return null; });
  // chuỗi
  BI('STRCAT', (...a) => a.map(toStr).join(''));
  BI('STRLEN', (...a) => mkInt(a.map(toStr).join('').length));
  BI('SUBSTR', (s, st, n) => { s = toStr(s); const i = toInt(st) - 1; return n === undefined || n === null ? s.slice(i) : s.substr(i, toInt(n)); });
  BI('STRCASE', (s, lo) => truthy(lo) ? toStr(s).toLowerCase() : toStr(s).toUpperCase());
  BI('ITOA', a => String(toInt(a))); BI('ATOI', s => mkInt(parseInt(toStr(s), 10) || 0)); BI('ATOF', s => parseFloat(toStr(s)) || 0);
  BI('CHR', a => String.fromCharCode(toInt(a))); BI('ASCII', s => mkInt(toStr(s).charCodeAt(0) || 0));
  BI('RTOS', (v, mode, prec) => { const x = toReal(v); const p = prec === undefined || prec === null ? 4 : toInt(prec); const m = mode === undefined || mode === null ? 2 : toInt(mode); if(m === 1) return x.toExponential(p).replace(/e([+-])(\d)$/, 'E$10$2'); return x.toFixed(p); });
  BI('DISTOF', (s) => { const v = parseFloat(toStr(s)); return isFinite(v) ? v : null; });
  BI('ANGTOS', (a, mode, prec) => { const d = toReal(a) / D2R; const p = prec === undefined || prec === null ? 4 : toInt(prec); const m = mode === undefined || mode === null ? 0 : toInt(mode); if(m === 3) return toReal(a).toFixed(p) + 'r'; return (((d % 360) + 360) % 360).toFixed(p); });
  BI('ANGTOF', (s) => { const v = parseFloat(toStr(s)); return isFinite(v) ? v * D2R : null; });
  BI('VL-STRING-SEARCH', (p, s, st) => { const i = toStr(s).indexOf(toStr(p), st === undefined ? 0 : toInt(st)); return i < 0 ? null : mkInt(i); });
  BI('VL-STRING-SUBST', (n, p, s) => toStr(s).replace(toStr(p), toStr(n)));
  BI('VL-STRING-TRIM', (c, s) => { const set = toStr(c); let a = toStr(s); while(a && set.includes(a[0])) a = a.slice(1); while(a && set.includes(a[a.length - 1])) a = a.slice(0, -1); return a; });
  BI('VL-STRING-LEFT-TRIM', (c, s) => { const set = toStr(c); let a = toStr(s); while(a && set.includes(a[0])) a = a.slice(1); return a; });
  BI('VL-STRING-RIGHT-TRIM', (c, s) => { const set = toStr(c); let a = toStr(s); while(a && set.includes(a[a.length - 1])) a = a.slice(0, -1); return a; });
  BI('VL-PRINC-TO-STRING', x => str(x, true)); BI('VL-PRIN1-TO-STRING', x => str(x));
  BI('VL-STRING->LIST', s => { const r = [...toStr(s)].map(c => mkInt(c.charCodeAt(0))); return r.length ? r : null; });
  BI('VL-LIST->STRING', l => L(l).map(c => String.fromCharCode(toInt(c))).join(''));
  BI('VL-SYMBOL-NAME', s => s instanceof Sym ? s.n : toStr(s));
  BI('READ', s => { const f = parse(toStr(s)); return f.length ? f[0] : null; });
  const wc = (p) => new RegExp('^(' + p.split(',').map(q => q.replace(/[.+^${}()|\\]/g, '\\$&').replace(/`(.)/g, '\\$1').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/#/g, '\\d').replace(/@/g, '[A-Za-z]').replace(/~/g, '(?!)')).join('|') + ')$', 'i');
  BI('WCMATCH', (s, p) => wc(toStr(p)).test(toStr(s)) ? T : null);
  // hình học
  BI('POLAR', (p, a, d) => { const q = pt(p), t = toReal(a), r = toReal(d); return [q.x + r * Math.cos(t), q.y + r * Math.sin(t), q.z]; });
  BI('DISTANCE', (a, b) => { const p = pt(a), q = pt(b); return Math.hypot(q.x - p.x, q.y - p.y, (q.z || 0) - (p.z || 0)); });
  BI('ANGLE', (a, b) => { const p = pt(a), q = pt(b); let t = Math.atan2(q.y - p.y, q.x - p.x); if(t < 0) t += 2 * Math.PI; return t; });
  BI('INTERS', (a, b, c, d, onseg) => { const p1 = pt(a), p2 = pt(b), p3 = pt(c), p4 = pt(d); const den = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x); if(Math.abs(den) < 1e-15) return null;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / den, u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / den;
    if(onseg !== null && (t < -1e-12 || t > 1 + 1e-12 || u < -1e-12 || u > 1 + 1e-12)) return null; return [p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y), 0]; });
  G.set('PI', Math.PI); G.set('PAUSE', '\\');
  // xuất / thông báo
  let lineBuf = '';
  const out = s => { lineBuf += s; const parts = lineBuf.split('\n'); lineBuf = parts.pop(); for(const p of parts) if(p.trim()) A().log(p); };
  const flushOut = () => { if(lineBuf.trim()) A().log(lineBuf); lineBuf = ''; };
  BI('PRINC', (x, f) => { if(x === undefined) return sym('');   /* (princ) im lặng */ out(str(x, true)); return x; });
  BI('PRIN1', (x) => { if(x === undefined) return sym(''); out(str(x)); return x; });
  BI('PRINT', (x) => { out('\n' + str(x) + ' '); return x; });
  BI('PROMPT', s => { out(toStr(s)); return null; });
  BI('TERPRI', () => { out('\n'); return null; });
  BI('ALERT', s => { flushOut(); try{ A().dialog({ title: 'AutoLISP', html: '<div style="white-space:pre-wrap">' + String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '</div>', noCancel: true, ok: () => {} }); }catch(_){ window.alert(s); } return null; });
  BI(['EXIT', 'QUIT'], () => { throw new Quit('quit / exit abort'); });
  BI('VL-LOAD-COM', () => null); BI('VL-CATCH-ALL-ERROR-P', x => x && x.catchErr ? T : null); BI('VL-CATCH-ALL-ERROR-MESSAGE', x => x && x.catchErr ? x.catchErr : null);
  BI('GETENV', n => { try{ return localStorage.getItem('dvd:lispenv:' + toStr(n)); }catch(_){ return null; } });
  BI('SETENV', (n, v) => { try{ localStorage.setItem('dvd:lispenv:' + toStr(n), toStr(v)); }catch(_){} return v; });
  BI('ATOMS-FAMILY', () => null);
  BI('SET', (s, v) => { if(!(s instanceof Sym)) throw new LispErr('bad argument type: symbolp'); setv(s, v); return v; });
  BI('GETCNAME', s => { const n = toStr(s).replace(/^[_.]+/, '').toUpperCase(); return window.DVDCmd && DVDCmd.commands.some(c => c.k.includes(n)) ? n : null; });

  /* ---------------- nhập từ người dùng ---------------- */
  let initKw = null;
  BI('INITGET', (a, b) => { const kws = typeof a === 'string' ? a : typeof b === 'string' ? b : ''; initKw = kws.trim() ? kws.trim().split(/\s+/) : null; return null; });
  const kwOpts = () => { if(!initKw) return null; return initKw.map(w => { const caps = w.replace(/[^A-Z0-9]/g, ''); return { k: caps || w.toUpperCase(), t: w, full: w }; }); };
  const kwBack = (opts, k) => { const o = (opts || []).find(o => o.k === k); return o ? o.full : k; };
  // chạy 1 lời nhắc của bộ máy lệnh trong ngữ cảnh lệnh tạm (Esc = huỷ hàm LISP như AutoCAD)
  function ask(kind, prompt, o){
    const opts = kwOpts(); initKw = null; flushOut();
    return new Promise((res, rej) => {
      if(A().busy && A().busy()) A().cancel(true);
      A().run('LISP', async () => {
        try{
          const p = Object.assign({}, o || {}); if(opts) p.kw = opts.map(x => ({ k: x.k, t: x.t }));
          const fn = { pt: A().getPoint, dist: A().getDist, ang: A().getAngle, num: A().getNum, str: A().getStr, kw: A().getKw, ent: A().getEnt, sel: A().getSel }[kind];
          const r = await fn(prompt || '', p); if(r && r.kw) r.kw = kwBack(opts, r.kw); res(r);
        }catch(err){ rej(new Quit('Function cancelled')); throw err; }
      }, { quiet: true });
    });
  }
  const promptArgs = (a, b) => { let base = null, msg = ''; for(const x of [a, b]){ if(typeof x === 'string') msg = x; else if(Array.isArray(x)) base = pt(x); } return { base, msg }; };
  BI('GETPOINT', async (a, b) => { const { base, msg } = promptArgs(a, b); const r = await ask('pt', msg || 'Chỉ định điểm', base ? { base } : {}); if(r.kw) return r.kw; return r.pt ? lpt(r.pt) : null; });
  BI('GETCORNER', async (a, b) => { const { base, msg } = promptArgs(a, b); const r = await ask('pt', msg || 'Góc đối diện', base ? { base, rubber: false, preview: (g, p) => g.ents([{ type: 'POLYLINE', closed: true, vertices: [base, { x: p.x, y: base.y }, p, { x: base.x, y: p.y }] }], '#9fd0ff') } : {}); if(r.kw) return r.kw; return r.pt ? lpt(r.pt) : null; });
  BI('GETDIST', async (a, b) => { const { base, msg } = promptArgs(a, b); const r = await ask('dist', msg || 'Khoảng cách', base ? { base } : {}); if(r.kw) return r.kw; return r.num != null ? +r.num : null; });
  BI(['GETANGLE', 'GETORIENT'], async (a, b) => { const { base, msg } = promptArgs(a, b); const r = await ask('ang', msg || 'Góc', base ? { base } : {}); if(r.kw) return r.kw; return r.num != null ? r.num * D2R : null; });
  BI('GETREAL', async (m) => { const r = await ask('num', typeof m === 'string' ? m : 'Nhập số'); if(r.kw) return r.kw; return r.num != null ? +r.num : null; });
  BI('GETINT', async (m) => { for(;;){ const r = await ask('num', typeof m === 'string' ? m : 'Nhập số nguyên'); if(r.kw) return r.kw; if(r.num == null) return null; if(Number.isInteger(+r.num)) return mkInt(+r.num); A().log('Cần số nguyên.'); } });
  BI('GETSTRING', async (a, b) => { const m = typeof a === 'string' ? a : typeof b === 'string' ? b : ''; const r = await ask('str', m || 'Nhập chuỗi'); return r.str != null ? r.str : ''; });
  BI('GETKWORD', async (m) => { const opts = kwOpts(); if(!opts){ initKw = null; const r = await ask('str', toStr(m || '')); return r.str || null; } const r = await ask('kw', typeof m === 'string' ? m : 'Chọn'); return r.kw || null; });

  /* ---------------- đối tượng (entity) ---------------- */
  let lidSeq = 0;
  const ME = () => window.modelEntities || (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const lidOf = e => { if(e.grp && (e.blk || String(e.grp).startsWith('D'))) return 'G:' + e.grp; if(!e._lid) e._lid = 'L' + (++lidSeq) + '_' + Date.now().toString(36); return e._lid; };
  const ename = e => e ? new Ename(lidOf(e)) : null;
  function entsOf(en){ if(!(en instanceof Ename)) throw new LispErr('bad argument type: lentityp ' + str(en)); const id = en.id; const all = ME();
    if(id.startsWith('G:')){ const g = id.slice(2); return all.filter(e => String(e.grp) === g); } const e = all.find(x => x._lid === id); return e ? [e] : []; }
  const isDimGrp = list => list.some(e => e.dimd || String(e.blk || '').startsWith('*DIM'));
  const DXFT = { LINE: 'LINE', CIRCLE: 'CIRCLE', ARC: 'ARC', POINT: 'POINT', POLYLINE: 'LWPOLYLINE', ELLIPSE: 'ELLIPSE', HATCH: 'HATCH', SOLID: 'SOLID', SOLID3D: '3DSOLID', IMAGE: 'IMAGE', SPLINE: 'SPLINE' };
  const typeName = list => { if(list.length > 1 || (list[0] && list[0].grp && list[0].blk)) return isDimGrp(list) ? 'DIMENSION' : (String(list[0].blk || '').startsWith('*') ? 'GROUP' : 'INSERT'); const e = list[0]; if(e.type === 'TEXT') return e.mt ? 'MTEXT' : e.att ? 'ATTRIB' : 'TEXT'; return DXFT[e.type] || e.type; };
  const aciOfE = e => e.bl ? 256 : (A().aciOf ? A().aciOf(e.col) : 7);
  const hexOfAci = n => typeof aciHex === 'function' ? aciHex(n) : '#ffffff';
  const R3 = (x, y) => [x, y, 0.0];
  function entget(en){
    const list = entsOf(en); if(!list.length) return null; const e = list[0], ty = typeName(list);
    const out = [new DP(mkInt(-1), en), new DP(mkInt(0), ty), new DP(mkInt(8), e.layer || '0')];
    if(!e.bl) out.push(new DP(mkInt(62), mkInt(aciOfE(e))));
    if(e.lt && e.lt !== 'BYLAYER') out.push(new DP(mkInt(6), String(e.lt)));
    const P = (c, x, y) => out.push([mkInt(c), x, y, 0.0]);
    if(ty === 'INSERT' || ty === 'GROUP'){ const bm = e.bm || {}; const sc = Math.hypot(bm.a || 1, bm.b || 0); out.push(new DP(mkInt(2), String(e.blk || ''))); P(10, (e.bip || { x: 0 }).x, (e.bip || { y: 0 }).y); out.push(new DP(mkInt(41), sc), new DP(mkInt(42), sc), new DP(mkInt(43), sc), new DP(mkInt(50), Math.atan2(bm.b || 0, bm.a || 1))); return out; }
    if(ty === 'DIMENSION'){ const t = list.find(x => x.dimd && !x.dimx) || list.find(x => x.type === 'TEXT'); if(t){ out.push(new DP(mkInt(1), t.dimd && t.dimd.ov ? t.dimd.ov : '')); out.push(new DP(mkInt(42), +(t.dimv != null ? t.dimv : parseFloat(t.text) || 0))); if(t.dimd && t.dimd.p1){ P(13, t.dimd.p1.x, t.dimd.p1.y); P(14, t.dimd.p2.x, t.dimd.p2.y); } P(11, t.x, t.y); } return out; }
    switch(e.type){
      case 'LINE': P(10, e.x1, e.y1); P(11, e.x2, e.y2); break;
      case 'CIRCLE': P(10, e.cx, e.cy); out.push(new DP(mkInt(40), e.r)); break;
      case 'ARC': P(10, e.cx, e.cy); out.push(new DP(mkInt(40), e.r), new DP(mkInt(50), e.a1 * D2R), new DP(mkInt(51), e.a2 * D2R)); break;
      case 'POINT': P(10, e.x, e.y); break;
      case 'ELLIPSE': P(10, e.cx, e.cy); out.push([mkInt(11), e.mx, e.my, 0.0], new DP(mkInt(40), e.ratio), new DP(mkInt(41), e.p1 || 0), new DP(mkInt(42), e.p2 != null ? e.p2 : 2 * Math.PI)); break;
      case 'TEXT': { P(10, e.x, e.y); out.push(new DP(mkInt(40), e.h || 2.5), new DP(mkInt(1), String(e.text || '')), new DP(mkInt(50), (e.rot || 0) * D2R), new DP(mkInt(7), e.style || 'Standard'));
        out.push(new DP(mkInt(72), mkInt(e.ha === 'center' ? 1 : (e.ha === 'right' || e.ha === 'end') ? 2 : 0)), new DP(mkInt(73), mkInt(e.va === 'bottom' ? 1 : e.va === 'middle' ? 2 : e.va === 'top' ? 3 : 0))); P(11, e.x, e.y); if(e.att) out.push(new DP(mkInt(2), e.att)); break; }
      case 'POLYLINE': { const B = (A().bvOf && A().bvOf(e)) || e.vertices || []; out.push(new DP(mkInt(90), mkInt(B.length)), new DP(mkInt(70), mkInt(e.closed ? 1 : 0)));
        B.forEach((v, k) => { out.push([mkInt(10), v.x, v.y]); if(e.pw && e.pw[k]){ out.push(new DP(mkInt(40), e.pw[k][2]), new DP(mkInt(41), e.pw[k][3])); } out.push(new DP(mkInt(42), v.bulge || 0)); }); break; }
      case 'HATCH': out.push(new DP(mkInt(2), String(e.pat || 'SOLID'))); break;
    }
    return out;
  }
  const gc = (al, code) => { for(const p of L(al)){ const k = p instanceof DP ? p.a : Array.isArray(p) ? p[0] : null; if(k !== null && nv(k) === code) return p instanceof DP ? p.d : p.slice(1); } return undefined; };
  const gcAll = (al, code) => L(al).filter(p => (p instanceof DP ? nv(p.a) : Array.isArray(p) ? nv(p[0]) : null) === code).map(p => p instanceof DP ? p.d : p.slice(1));
  const P2 = v => { const l = L(v); return { x: nv(l[0]), y: nv(l[1]) }; };
  function applyCommon(w, al){
    const lay = gc(al, 8); if(typeof lay === 'string'){ if(!A().layerNames().includes(lay)) A().addLayer(lay); w.layer = lay; if(w.bl) w.col = A().layerHex(lay); }
    const c = gc(al, 62); if(c !== undefined){ const n = toInt(c); if(n === 256 || n === 0){ w.bl = 1; w.col = A().layerHex(w.layer || '0'); } else { delete w.bl; w.col = hexOfAci(n); } }
    const lt = gc(al, 6); if(typeof lt === 'string') w.lt = lt.toUpperCase();
  }
  function applyGeom(w, al){
    const g = c => gc(al, c);
    switch(w.type){
      case 'LINE': { const a = g(10), b = g(11); if(a){ const p = P2(a); w.x1 = p.x; w.y1 = p.y; } if(b){ const p = P2(b); w.x2 = p.x; w.y2 = p.y; } break; }
      case 'CIRCLE': case 'ARC': { const c = g(10); if(c){ const p = P2(c); w.cx = p.x; w.cy = p.y; } if(g(40) !== undefined) w.r = toReal(g(40)); if(w.type === 'ARC'){ if(g(50) !== undefined) w.a1 = toReal(g(50)) / D2R; if(g(51) !== undefined) w.a2 = toReal(g(51)) / D2R; } break; }
      case 'POINT': { const c = g(10); if(c){ const p = P2(c); w.x = p.x; w.y = p.y; } break; }
      case 'TEXT': { const c = g(11) || g(10); const ha = g(72), va = g(73); if(ha !== undefined) w.ha = ['left', 'center', 'right', 'left', 'center', 'left'][toInt(ha)] || 'left'; if(va !== undefined) w.va = ['alphabetic', 'bottom', 'middle', 'top'][toInt(va)] || 'alphabetic';
        const ip = (w.ha && w.ha !== 'left') || (w.va && w.va !== 'alphabetic') ? (g(11) || g(10)) : (g(10) || g(11)); if(ip){ const p = P2(ip); w.x = p.x; w.y = p.y; }
        if(g(40) !== undefined) w.h = toReal(g(40)); if(typeof g(1) === 'string') w.text = g(1); if(g(50) !== undefined) w.rot = toReal(g(50)) / D2R; if(typeof g(7) === 'string') w.style = g(7); break; }
      case 'POLYLINE': { const vs = []; let cur = null; const wid = [];
        for(const p of L(al)){ const k = p instanceof DP ? nv(p.a) : Array.isArray(p) ? nv(p[0]) : null; const v = p instanceof DP ? p.d : Array.isArray(p) ? p.slice(1) : null;
          if(k === 10){ cur = { x: nv(v[0]), y: nv(v[1]), bulge: 0 }; vs.push(cur); wid.push([0, 0]); } else if(k === 42 && cur) cur.bulge = toReal(v); else if(k === 40 && cur) wid[wid.length - 1][0] = toReal(v); else if(k === 41 && cur) wid[wid.length - 1][1] = toReal(v); else if(k === 43){ const cw = toReal(v); for(const x of wid) x[0] = x[1] = cw; } }
        const fl = g(70); if(fl !== undefined) w.closed = (toInt(fl) & 1) === 1;
        if(vs.length >= 2){ delete w.bv; delete w.bvs; delete w.wq; delete w.pw;
          if(wid.some(x => x[0] > 0 || x[1] > 0) && typeof widePoly === 'function'){ widePoly(vs.map((v, k) => ({ x: v.x, y: v.y, bulge: v.bulge, sw: wid[k][0], ew: wid[k][1] })), !!w.closed, w); }
          else if(vs.some(v => v.bulge)){ w.vertices = vs.map(v => ({ x: v.x, y: v.y })); A().setBV(w, vs); } else w.vertices = vs.map(v => ({ x: v.x, y: v.y })); }
        break; }
    }
  }
  BI('ENTGET', en => entget(en));
  BI('ENTMOD', al => {
    const en = gc(al, -1); const list = entsOf(en); if(!list.length) return null; const e = list[0];
    if(list.length > 1 || e.grp && e.blk){ const lay = gc(al, 8), c = gc(al, 62); const rep = list.map(x => { const w = JSON.parse(JSON.stringify(x)); delete w.userAdded; applyCommon(w, al); return [x, w]; }); if(typeof lay === 'string' || c !== undefined) A().commit({ rep }); return al; }
    const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; applyCommon(w, al); applyGeom(w, al); A().commit({ rep: [[e, w]] }); return al;
  });
  const MAKE = { LINE: 'LINE', CIRCLE: 'CIRCLE', ARC: 'ARC', POINT: 'POINT', TEXT: 'TEXT', MTEXT: 'TEXT', LWPOLYLINE: 'POLYLINE', POLYLINE: 'POLYLINE' };
  BI('ENTMAKE', al => {
    if(al === null || al === undefined) return null; const ty = String(gc(al, 0) || '').toUpperCase(); const t = MAKE[ty]; if(!t) return null;
    const w = { type: t }; if(ty === 'MTEXT') w.mt = 1; if(t === 'TEXT'){ w.h = (A().MEM && A().MEM.th) || 2.5; w.text = ''; w.rot = 0; w.ha = 'left'; w.va = 'alphabetic'; }
    if(t === 'POLYLINE'){ w.vertices = []; w.closed = false; }
    A().newProps(w); delete w.lt; applyCommon(w, al); applyGeom(w, al);
    if(t === 'POLYLINE' && (w.vertices || []).length < 2) return null;
    A().commit({ add: [w] }); return al;
  });
  BI('ENTDEL', en => { const list = entsOf(en); if(!list.length) return null; A().commit({ del: list.filter(e => !A().isLocked(e)) }); return en; });
  BI('ENTUPD', en => en); BI('REDRAW', () => { try{ draw(); }catch(_){} return null; });
  BI('ENTLAST', () => { const a = ME(); return a.length ? ename(a[a.length - 1]) : null; });
  BI('ENTNEXT', en => { const a = ME(); if(en === undefined || en === null) return a.length ? ename(a[0]) : null; const list = entsOf(en); if(!list.length) return null; const last = list[list.length - 1]; let i = a.indexOf(last) + 1; const g = list[0].grp; while(i < a.length && g && a[i].grp === g) i++; return i < a.length ? ename(a[i]) : null; });
  BI('HANDENT', h => { const e = ME().find(x => x.h === h || x._lid === h); return e ? ename(e) : null; });
  BI('ENTSEL', async (m) => { const r = await ask('ent', typeof m === 'string' ? m : 'Chọn đối tượng'); if(!r || !r.ent) return null; return [ename(r.ent), lpt(r.pt || { x: 0, y: 0 })]; });
  BI('NENTSEL', async (m) => { const r = await ask('ent', typeof m === 'string' ? m : 'Chọn đối tượng'); if(!r || !r.ent) return null; const e = r.ent; if(!e._lid) e._lid = 'L' + (++lidSeq) + '_' + Date.now().toString(36); return [new Ename(e._lid), lpt(r.pt || { x: 0, y: 0 })]; });
  // bộ lọc ssget: 0 loại, 8 lớp, 62 màu, 2 tên khối (cho phép ký tự đại diện * ? ,)
  function filterFn(fl){
    if(!fl) return () => true; const conds = [];
    for(const p of L(fl)){ if(!(p instanceof DP)) continue; const k = nv(p.a), v = p.d;
      if(k === 0){ const re = wc(String(v)); conds.push((e, ty) => re.test(ty)); }
      else if(k === 8){ const re = wc(String(v)); conds.push(e => re.test(e.layer || '0')); }
      else if(k === 62){ const n = toInt(v); conds.push(e => aciOfE(e) === n); }
      else if(k === 2){ const re = wc(String(v)); conds.push(e => re.test(String(e.blk || e.pat || ''))); }
      else if(k === 1){ const re = wc(String(v)); conds.push(e => re.test(String(e.text || ''))); } }
    const tyOf = e => { if(e.grp && e.blk){ const b = String(e.blk); return (e.dimd || b.startsWith('*DIM')) ? 'DIMENSION' : b.startsWith('*') ? 'GROUP' : 'INSERT'; } return typeName([e]); };
    return e => { const ty = tyOf(e); return conds.every(f => f(e, ty)); };
  }
  const uniqEn = ents => { const seen = new Set(), out = []; for(const e of ents){ const id = lidOf(e); if(seen.has(id)) continue; seen.add(id); out.push(new Ename(id)); } return out; };
  const visible = e => !(A().isHiddenE && A().isHiddenE(e));
  BI('SSGET', async (...args) => {
    let mode = null, fl = null, p1 = null, p2 = null;
    for(const a of args){ if(typeof a === 'string') mode = a.replace(/^_/, '').toUpperCase(); else if(Array.isArray(a) && a.length && (a[0] instanceof DP)) fl = a; else if(Array.isArray(a)){ if(!p1) p1 = pt(a); else p2 = pt(a); } }
    const f = filterFn(fl);
    let ents;
    if(mode === 'X' || mode === 'A') ents = ME().filter(e => f(e));
    else if((mode === 'W' || mode === 'C') && p1 && p2){ const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);
      ents = ME().filter(e => { if(!visible(e) || !f(e)) return false; const b = typeof entBBox === 'function' ? entBBox(e) : null; if(!b) return false; return mode === 'W' ? (b.x0 >= x0 && b.x1 <= x1 && b.y0 >= y0 && b.y1 <= y1) : !(b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1); }); }
    else if(mode === 'L'){ const a = ME(); ents = a.length ? [a[a.length - 1]] : []; }
    else if(mode === 'I' || mode === 'P'){ ents = [...(window.selEnts || [])].filter(e => f(e)); if(!ents.length && mode === 'I') return null; }
    else { const r = await ask('sel', 'Chọn đối tượng', { filter: fl ? f : undefined }); ents = (r && r.sel) || []; }
    const l = uniqEn(ents); return l.length ? new SS(l) : null;
  });
  BI('SSLENGTH', s => s instanceof SS ? mkInt(s.l.length) : null);
  BI('SSNAME', (s, i) => { if(!(s instanceof SS)) throw new LispErr('bad argument type: lselsetp ' + str(s)); const k = toInt(i); return k >= 0 && k < s.l.length ? s.l[k] : null; });
  BI('SSADD', (en, s) => { if(en === undefined) return new SS([]); const ss = s instanceof SS ? s : new SS([]); if(en instanceof Ename && !ss.l.some(x => x.id === en.id)) ss.l.push(en); return ss; });
  BI('SSDEL', (en, s) => { if(s instanceof SS) s.l = s.l.filter(x => x.id !== en.id); return s; });
  BI('SSMEMB', (en, s) => s instanceof SS && s.l.some(x => x.id === en.id) ? en : null);
  BI('SSSETFIRST', (a, s) => { try{ selEnts.clear(); if(s instanceof SS) for(const en of s.l) for(const e of entsOf(en)) selEnts.add(e); draw(); }catch(_){} return null; });
  BI('TBLSEARCH', (t, n) => { const tb = toStr(t).toUpperCase(), nm = toStr(n);
    if(tb === 'LAYER'){ const ln = A().layerNames().find(x => x.toUpperCase() === nm.toUpperCase()); if(!ln) return null; const LS = A().LS; return [new DP(mkInt(0), 'LAYER'), new DP(mkInt(2), ln), new DP(mkInt(70), mkInt((LS.frozen.has(ln) ? 1 : 0) | (LS.locked.has(ln) ? 4 : 0))), new DP(mkInt(62), mkInt((LS.off.has(ln) ? -1 : 1) * (A().aciOf ? A().aciOf(A().layerHex(ln)) : 7))), new DP(mkInt(6), 'Continuous')]; }
    if(tb === 'BLOCK'){ const all = Object.keys(window._dvdBlocks || {}).concat(Object.keys((A().blockLib && A().blockLib()) || {})); const b = all.find(x => x.toUpperCase() === nm.toUpperCase()); return b ? [new DP(mkInt(0), 'BLOCK'), new DP(mkInt(2), b)] : null; }
    return null; });
  BI('GETVAR', n => { const k = toStr(n).toUpperCase(); if(k === 'CMDECHO' || k === 'NOMUTT' || k === 'BLIPMODE' || k === 'HIGHLIGHT') return mkInt(LV[k] != null ? LV[k] : (k === 'HIGHLIGHT' ? 1 : 0)); if(k === 'DWGPREFIX') return ''; if(k === 'ACADVER') return '24.0s (DVDCAD)'; if(k === 'LUNITS') return mkInt(2); if(k === 'ANGBASE') return 0.0; if(k === 'ANGDIR') return mkInt(0); if(k === 'VIEWCTR'){ try{ const c = toWorld(innerWidth / 2, innerHeight / 2); return [c.x, c.y, 0.0]; }catch(_){ return [0.0, 0.0, 0.0]; } }
    const v = A().sysvar ? A().sysvar.get(k) : undefined; if(v === undefined) return LV[k] !== undefined ? LV[k] : null; return typeof v === 'number' ? (Number.isInteger(v) ? mkInt(v) : v) : typeof v === 'boolean' ? mkInt(v ? 1 : 0) : String(v); });
  const LV = {};
  BI('SETVAR', (n, v) => { const k = toStr(n).toUpperCase(); const val = v instanceof LI ? v.v : v; if(A().sysvar && A().sysvar.set(k, val)) return v; LV[k] = v; return v; });

  /* ---------------- (command …) ---------------- */
  const argStr = a => { if(a === null || a === undefined) return ''; if(typeof a === 'string') return a; if(a instanceof LI) return String(a.v); if(typeof a === 'number') return String(+a.toPrecision(15)); if(Array.isArray(a) && a.length >= 2 && isNum(a[0])) return nv(a[0]) + ',' + nv(a[1]); if(a instanceof Ename){ return null; } if(a instanceof SS) return null; return str(a, true); };
  async function waitPrompt(seq, maxMs){ const t0 = Date.now(); for(;;){ if(!A().busy()) return 'done'; if(A().reqInfo() && (A().reqSeq || 0) !== seq) return 'req'; if(maxMs && Date.now() - t0 > maxMs) return 'timeout'; await sleep(8); } }
  // như AutoCAD: trong (command …) lệnh có bản dòng lệnh (-LAYER, -INSERT, -COLOR…) chạy bản đó thay cho hộp thoại
  const clName = n => DVDCmd.commands.some(c => c.k.includes('-' + n)) ? '-' + n : n;
  async function command(...args){
    flushOut();
    if(!args.length){ if(A().busy()) A().cancel(true); return null; }
    let i = 0;
    if(!A().busy()){
      const name = String(argStr(args[0]) || '').replace(/^[_.'-]+/, '').toUpperCase(); i = 1; if(!name) return null;
      const seq = A().reqSeq || 0; DVDCmd.run(clName(name)); await waitPrompt(seq, 1500);
    }
    for(; i < args.length; i++){
      const a = args[i];
      if(a === '\\' || (a instanceof Sym && a.n === 'PAUSE')){ const seq = A().reqSeq || 0; await waitPrompt(seq, 0); continue; }   // pause: chờ người dùng nhập
      if(a instanceof Ename || a instanceof SS){   // chọn đối tượng cho lời nhắc chọn
        const ri = A().reqInfo(); const ents = a instanceof Ename ? entsOf(a) : a.l.flatMap(entsOf); const seq = A().reqSeq || 0;
        if(ri && ri.single){ const e = ents[0]; if(e) A().pickEnt3D(e); await waitPrompt(seq, 1500); continue; }
        for(const e of ents) A().pickEnt3D(e); await sleep(5);
        if(i + 1 >= args.length || !(args[i + 1] instanceof SS || args[i + 1] instanceof Ename)){ A().input(''); await waitPrompt(seq, 1500); } continue; }
      if(!A().busy()){
        const name = String(argStr(a) || '').replace(/^[_.'-]+/, '').toUpperCase(); if(!name) continue; const seq = A().reqSeq || 0; DVDCmd.run(clName(name)); await waitPrompt(seq, 1500); continue; }
      const s = argStr(a); const seq = A().reqSeq || 0; A().input(s); await waitPrompt(seq, 1500);
    }
    return null;
  }
  BI(['COMMAND', 'VL-CMDF', 'COMMAND-S'], command);

  /* ---------------- lệnh c:XXX ---------------- */
  const cmdFns = new Map();
  function regCmd(name, fn){
    const key = name.toUpperCase(); cmdFns.set(key, fn);
    if(!window.DVDCmd) return;
    const exist = DVDCmd.commands.find(c => c.k.includes(key) && c.lisp); if(exist) return;
    if(DVDCmd.commands.some(c => c.k.includes(key) && !c.lisp)) A().log('LISP: định nghĩa lại lệnh ' + key + ' (lệnh gốc của DVDCAD bị che).');
    DVDCmd.register([key], 'Lệnh AutoLISP (' + key + ')', () => runTop(async () => { const f = cmdFns.get(key); return apply(f, []); }, key), {});
    const c = DVDCmd.commands.find(c => c.k.includes(key)); if(c) c.lisp = true;
  }
  let running = 0;
  async function runTop(fn, label){
    running++; steps = 0;
    try{ const r = await fn(); flushOut(); return r; }
    catch(err){
      flushOut();
      const msg = err instanceof Quit ? err.message : err instanceof LispErr ? err.message : ('lỗi trong mã: ' + (err && err.message || err));
      const eh = G.get('*ERROR*');
      if(eh instanceof Fn || typeof eh === 'function'){ try{ await apply(eh, [msg]); flushOut(); }catch(e2){ A().log('; lỗi: ' + (e2.message || e2)); } }
      else A().log('; lỗi: ' + msg);
      if(!(err instanceof Quit || err instanceof LispErr)) console.error(err);
      return undefined;
    }
    finally{ running--; if(running === 0 && A().busy && A().busy()){ const r = A().reqInfo && A().reqInfo(); if(!r) {} } }
  }

  /* ---------------- nạp mã ---------------- */
  const files = new Map();   // tên file → mã (để (load "ten") tìm được)
  async function loadSource(src, name){
    const forms = parse(src); let r = null;
    for(const f of forms) r = await ev(f);
    if(name) files.set(String(name).toUpperCase().replace(/\.LSP$/, ''), src);
    return r;
  }
  BI('LOAD', async (n, onFail) => { const k = toStr(n).toUpperCase().replace(/\\/g, '/').split('/').pop().replace(/\.LSP$/, ''); const src = files.get(k) || (window.DVDAddins && DVDAddins.sourceOf(k)); if(src == null){ if(onFail !== undefined) return onFail; throw new LispErr('LOAD failed: "' + n + '"'); } return loadSource(src, k); });

  /* ---------------- dòng lệnh ---------------- */
  function commandLine(raw){
    if(raw[0] === '!'){ const s = raw.slice(1).trim(); if(!/^[^\s()]+$/.test(s)) return false; const v = getv(sym(s));
      if(A().busy && A().busy() && A().reqInfo()){ const a = argStr(v); if(a != null) A().input(a); return true; }
      A().log(str(v)); return true; }
    if(raw[0] !== '('){ return false; }
    const busyReq = A().busy && A().busy() && A().reqInfo();
    runTop(async () => { const forms = parse(raw); let r = null; for(const f of forms) r = await ev(f); if(busyReq && A().busy() && A().reqInfo()){ const a = argStr(r); if(a != null) A().input(a); } else if(!(r instanceof Sym && r.n === '')) A().log(str(r)); return r; });
    return true;
  }

  window.DVDLisp = {
    eval: async src => { let r; await runTop(async () => { r = await loadSource(src); }); return r; },
    evalToString: async src => { let r; const ok = await runTop(async () => { const f = parse(src); for(const x of f) r = await ev(x); return true; }); return ok ? str(r) : null; },
    load: (src, name) => runTop(() => loadSource(src, name), name),
    commandLine, str, parse, sym, stop: () => { stopFlag = true; }, get commands(){ return [...cmdFns.keys()]; }, get files(){ return [...files.keys()]; }, G,
    // cho phần mở rộng (dvd-lisp2.js: DCL, vla / vlax, tệp…)
    ext: { BI, SPECIAL, G, ev, apply, progn, withBindings, toFn, Sym, LI, DP, Ename, SS, Fn, LispErr, Quit, T, mkInt, toReal, toInt, toStr, pt, lpt, L, nv, isNum, truthy, str, sym,
      entsOf, ename, entget, ME, typeName, ask, files, gc, out, flushOut, loadSource, runTop, getv, setv, parse }
  };
})();
