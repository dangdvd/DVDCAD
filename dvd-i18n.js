/* DVDCAD — ngôn ngữ giao diện (v5c)
   Một công tắc chung cho toàn bộ giao diện: ribbon, bảng, hộp thoại, dòng lệnh, lời nhắc, thông báo.
   Chuỗi gốc trong mã là tiếng Việt; khi chọn English, chữ hiển thị được thay bằng từ điển DVD_I18N_EN (dvd-i18n-en.js):
   - khớp nguyên câu trước, không có thì thay từng mảnh (câu ghép bằng 'Đã tạo ' + n + ' khối')
   - chỉ đổi chữ hiển thị (nút chữ, title, placeholder…), KHÔNG đổi dữ liệu bản vẽ: tên lớp / khối / chữ trong bản vẽ giữ nguyên
   - phần trong ngoặc kép "…" (tên lớp, tên khối) không dịch; phần tử có translate="no" hoặc class noi18n bỏ qua */
(function(){
  'use strict';
  if(window.DVDI18N) return;
  const KEY = 'dvd:riblang';
  const VIC = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const VI = new RegExp('[' + VIC + VIC.toUpperCase() + ']');
  let LANG = (() => { try{ const l = localStorage.getItem(KEY); if(l === 'vi' || l === 'en') return l; }catch(_){} return /^vi\b/i.test(navigator.language || '') ? 'vi' : 'en'; })();
  const DICT = Object.create(null); let buckets = null;
  const ASCIIVI = /^\s*(Cao|Canh|Xem|Sau|Cung|Nhanh|Xoay|Hai ngang|Theo khung)\b/;   /* vài chữ Việt không dấu */
  const SAFE1 = new Set(['Đo']);   /* từ đơn luôn dịch được (đầu câu ghép: `Đo ${tên}: …`) */
  const need = s => VI.test(s) || ASCIIVI.test(s);
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  function load(d){
    for(const k in d){ const v = d[k]; if(typeof v === 'string' && v) DICT[norm(k)] = v; }
    // biến thể chữ thường đầu câu ('Vuông góc' → 'vuông góc'), dùng khi mã ghép 'Ràng buộc ' + tên.toLowerCase()
    for(const k of Object.keys(DICT)){ const lk = k.toLowerCase(); if(lk !== k && !(lk in DICT) && k.length < 40 && !/[A-Z]{2}/.test(DICT[k])) DICT[lk] = DICT[k].charAt(0).toLowerCase() + DICT[k].slice(1); }
    buckets = null; }
  load(window.DVD_I18N_EN || {});
  // giữ nguyên tên ngôn ngữ trong menu chọn
  DICT['Tiếng Việt'] = 'Tiếng Việt';

  /* ---------- dịch một chuỗi ---------- */
  const isL = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
  function build(){ buckets = new Map(); for(const k of Object.keys(DICT)){ if(!/[A-Za-z\u00C0-\u1EF9]/.test(k)) continue; const c = k[0]; let b = buckets.get(c); if(!b){ b = []; buckets.set(c, b); } b.push(k); } for(const b of buckets.values()) b.sort((a, b2) => b2.length - a.length); }
  const protectedNames = new Set();
  function quotedRanges(s){ const R = []; const re = /"[^"\n]*"|“[^”\n]*”|«[^»\n]*»/g; let m; while((m = re.exec(s))) R.push([m.index, m.index + m[0].length]); return R; }
  const nearNum = (s, i, end) => { let a = i - 1; while(a >= 0 && s[a] === ' ') a--; let z = end; while(z < s.length && s[z] === ' ') z++; return (a >= 0 && /[\d=:·)]/.test(s[a])) || (z < s.length && /[\d=:·(]/.test(s[z])) || /^\S*\d/.test(s.slice(z, z + 12)) || (a < 0 && z >= s.length); };   /* cạnh số, '=', ':', '·', ngoặc, hoặc đứng một mình */
  function fragments(s){
    if(!buckets) build();
    const Q = quotedRanges(s); let out = '', i = 0, changed = false;
    const inQ = (a, b) => Q.some(([q0, q1]) => a > q0 && b < q1);
    while(i < s.length){
      const ch = s[i], b = buckets.get(ch);
      if(b){
        const prevL = isL(s[i - 1]); let hit = null;
        for(const k of b){ if(!s.startsWith(k, i)) continue; const end = i + k.length; if(!/[\s\d.,:;!?()"'\/=+\-–—·…\[\]]/.test(k) && !SAFE1.has(k) && !nearNum(s, i, end) && !(changed && /^[\s.,:;!?)]*$/.test(s.slice(end)))) continue;   /* từ đơn (vd 'khối'): chỉ dịch khi đứng cạnh số (đếm), tránh dịch nhầm giữa câu */ if(isL(k[0]) && prevL) continue; if(isL(k[k.length - 1]) && isL(s[end])) continue; if(inQ(i, end)) continue; hit = k; break; }
        if(hit){ out += DICT[hit]; i += hit.length; changed = true; continue; }
      }
      out += ch; i++;
    }
    return changed ? out : s;
  }
  function T(s){
    if(LANG !== 'en' || s == null) return s; s = String(s); if(!VI.test(s) && !ASCIIVI.test(s)) return s;
    const t = norm(s); if(!t) return s; if(protectedNames.has(t)) return s;
    const ex = DICT[t]; if(ex != null){ const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0]; return lead + ex + tail; }
    return fragments(s);
  }

  /* ---------- dịch giao diện (DOM) ---------- */
  const ATTRS = ['title', 'placeholder', 'aria-label', 'data-tl', 'alt'];
  const origText = new WeakMap(), setText = new WeakMap(), origAttr = new WeakMap();
  const skipEl = el => { for(let e = el; e && e.nodeType === 1; e = e.parentElement){ const tn = e.tagName; if(tn === 'SCRIPT' || tn === 'STYLE' || tn === 'TEXTAREA' || tn === 'CODE') return true; if(e.isContentEditable) return true; if(e.getAttribute('translate') === 'no' || (e.classList && (e.classList.contains('noi18n') || e.classList.contains('nm'))) || e.id === 'acFileName') return true;   /* .nm = ô tên (lớp, layout, khối…): dữ liệu người dùng */ } return false; };
  function doText(n){
    const d = n.data; if(!d || setText.get(n) === d) return; if(!need(d)) return;
    if(skipEl(n.parentElement)) return;
    const t = T(d); origText.set(n, d); if(t !== d){ setText.set(n, t); n.data = t; } else setText.set(n, d);
  }
  function doAttrs(el){
    if(!el.getAttribute || skipEl(el)) return;
    for(const a of ATTRS){ const v = el.getAttribute(a); if(!v || !need(v)) continue; const t = T(v); if(t === v) continue; let o = origAttr.get(el); if(!o){ o = {}; origAttr.set(el, o); } o[a] = v; el.setAttribute(a, t); }
    if(el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && VI.test(el.value)){ let o = origAttr.get(el); if(!o){ o = {}; origAttr.set(el, o); } o.value = el.value; el.value = T(el.value); }
  }
  function walk(root){
    if(!root) return;
    if(root.nodeType === 3){ doText(root); return; }
    if(root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if(root.nodeType === 1){ if(skipEl(root)) return; doAttrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while((n = tw.nextNode())){ if(n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  let mo = null, queue = new Set(), sched = false;
  function flush(){ sched = false; const q = [...queue]; queue.clear(); if(LANG !== 'en') return; for(const n of q) if(n.isConnected) walk(n); }
  function onMut(list){
    for(const m of list){
      if(m.type === 'characterData'){ if(setText.get(m.target) !== m.target.data) queue.add(m.target); }
      else if(m.type === 'attributes'){ const v = m.target.getAttribute(m.attributeName); const o = origAttr.get(m.target); if(v && need(v)) queue.add(m.target); else if(o && o[m.attributeName] && v !== T(o[m.attributeName])) delete o[m.attributeName]; }
      else for(const a of m.addedNodes) queue.add(a);
    }
    if(!sched && queue.size){ sched = true; Promise.resolve().then(flush); }
  }
  function start(){ if(mo) return; mo = new MutationObserver(onMut); mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value']) }); walk(document.documentElement); if(document.title && VI.test(document.title)) document.title = T(document.title); }
  function stop(){ if(mo){ mo.disconnect(); mo = null; } queue.clear(); }
  function restore(){
    const tw = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
    while((n = tw.nextNode())){
      if(n.nodeType === 3){ const o = origText.get(n); if(o != null && setText.get(n) === n.data && n.data !== o){ n.data = o; } setText.delete(n); }
      else { const o = origAttr.get(n); if(o){ for(const a in o){ if(a === 'value') n.value = o[a]; else n.setAttribute(a, o[a]); } origAttr.delete(n); } }
    }
  }
  const listeners = [];
  function set(l){
    if(l !== 'vi' && l !== 'en') return; if(l === LANG) return; LANG = l; try{ localStorage.setItem(KEY, l); }catch(_){}
    document.documentElement.lang = l;
    if(l === 'en') start(); else { stop(); restore(); }
    for(const f of listeners) try{ f(l); }catch(err){ console.warn(err); }
  }
  // hộp thoại có sẵn của trình duyệt
  for(const fn of ['alert', 'confirm', 'prompt']){ const o = window[fn]; if(typeof o !== 'function') continue; window[fn] = function(msg){ const a = [].slice.call(arguments); if(a.length) a[0] = T(a[0]); return o.apply(window, a); }; }

  window.DVDI18N = { get lang(){ return LANG; }, set, t: T, load, onChange: f => listeners.push(f), protect: names => { protectedNames.clear(); for(const n of names || []) if(n) protectedNames.add(norm(n)); }, refresh: () => { if(LANG === 'en') walk(document.documentElement); }, dict: DICT };
  window.__T = T;
  document.documentElement.lang = LANG;
  if(LANG === 'en') start();
})();
