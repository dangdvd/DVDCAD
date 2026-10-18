/* DVDCAD v4o — cải tiến các giới hạn + chức năng còn thiếu
   SPELL có từ điển âm tiết tiếng Việt riêng (không phụ thuộc máy) · VPORTS xoay từng khung · hatch liên kết vùng ghép nhiều nét
   DIMBREAK cho kích thước có sẵn trong file + tự cập nhật khi nét cắt qua bị dời · MIRRTEXT = 1
   TOOLPALETTES (Ctrl+3: lệnh, ký hiệu kiến trúc, hatch, khối) · ADCENTER (Ctrl+2: lấy khối / lớp / kiểu nét từ bản vẽ khác) · PDFIMPORT */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x8 || !window.DVDCmd) return; A._x8 = true;
  const G = A.G, D2R = Math.PI / 180, R2D = 180 / Math.PI, TAU = Math.PI * 2;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const copy = e => { const o = JSON.parse(JSON.stringify(e)); delete o.userAdded; return o; };
  const docName = () => { try{ return currentName || ''; }catch(_){ return ''; } };
  const newCid = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const bbOverlap = (a, b) => a && b && !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
  const ico = k => A.ico ? A.ico(k) : '';

  /* =====================================================================
     1) SPELL — từ điển âm tiết tiếng Việt (chạy offline) + từ điển riêng + gợi ý
     ===================================================================== */
  const RHY = ('a ai ao au ay ac ach am an ang anh ap at ăc ăm ăn ăng ăp ăt âc âm ân âng âp ât âu ây e eo ec em en eng ep et ê êu êch êm ên ênh êp êt ' +
    'i ia iu ich im in inh ip it iêc iêm iên iêng iêp iêt iêu o oa oai oao oay oac oach oam oan oang oanh oap oat oăc oăm oăn oăng oăt oe oeo oen oet oc oi om on ong oong ooc op ot ' +
    'ô ôi ôc ôm ôn ông ôp ôt ơ ơi ơm ơn ơp ơt u ua ui uy uya uyu uân uâng uât uây uê uêch uênh uơ uc um un ung up ut uôc uôi uôm uôn uông uôt uyên uyêt uynh uych uyt ' +
    'ư ưa ưi ưu ưc ưm ưn ưng ưt ươc ươi ươm ươn ương ươp ươt ươu y yêm yên yêng yêt yêu').split(' ');
  const RSET = new Set(RHY);
  const ONS = ['ngh', 'ng', 'nh', 'ch', 'gh', 'gi', 'kh', 'ph', 'qu', 'th', 'tr', 'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x'];
  const TONES = { '̀': 'huyen', '́': 'sac', '̃': 'nga', '̉': 'hoi', '̣': 'nang' };
  const VNCHR = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
  function splitTone(w){ const d = w.toLowerCase().normalize('NFD'); let tone = null, n = 0, base = ''; for(const ch of d){ if(TONES[ch]){ tone = TONES[ch]; n++; } else base += ch; } return { base: base.normalize('NFC'), tone, n }; }
  const FRONT = /^[ieêy]/;
  function validSyllable(word){
    const { base, tone, n } = splitTone(word); if(n > 1) return false; if(!base) return false;
    if(/[^a-zăâđêôơưy]/.test(base)) return null;           // có ký tự ngoài tiếng Việt (f, j, w, z…) → không kiểm tra
    const tryOn = (on, rh) => {
      if(on && !base.startsWith(on)) return false;
      if(!rh){ return on === 'gi'; }
      if(!RSET.has(rh)) return false;
      if(/(c|ch|p|t)$/.test(rh) && tone && tone !== 'sac' && tone !== 'nang') return false;
      if(/(c|ch|p|t)$/.test(rh) && !tone) return false;
      if(on === 'c' && FRONT.test(rh)) return false; if(on === 'k' && !FRONT.test(rh)) return false;
      if(on === 'g' && /^[eê]/.test(rh)) return false; if(on === 'gh' && !/^[ieê]/.test(rh)) return false;
      if(on === 'ng' && /^[ieê]/.test(rh)) return false; if(on === 'ngh' && !/^[ieê]/.test(rh)) return false;
      if(on === 'qu' && /^[uoư]/.test(rh)) return false;
      if(on === 'c' && /^u[yâêe]/.test(rh)) return false;
      if(on === 'gi' && /^i/.test(rh) && rh !== 'in' && rh !== 'it') { /* gìn, git */ }
      return true;
    };
    for(const on of ONS){ if(base.startsWith(on) && tryOn(on, base.slice(on.length))) return true; }
    if(base.startsWith('gi') && tryOn('g', base.slice(1))) return true;
    return tryOn('', base);
  }
  A.validSyllable = validSyllable;
  const COMMON = ('mặt bằng tầng trệt lầu mái cao độ cột dầm sàn tường cửa đi sổ phòng khách ngủ bếp ăn vệ sinh cầu thang hiên ban công lan can kết cấu kiến trúc móng cọc đài giằng thép bê tông cốt gạch vữa trát lát ốp sơn trần thạch cao nhôm kính gỗ inox ' +
    'chi tiết bản vẽ ghi chú tỷ tỉ lệ kích thước khung tên thiết kế kiểm tra chủ trì công trình hạng mục địa điểm chủ đầu tư nhà ở phố biệt thự văn chung cư điện nước cấp thoát điều hoà hòa chiếu sáng ổ cắm công tắc ' +
    'đứng cắt ngang dọc trục lưới hệ thống đường ống bể phốt ngầm nền đất đá cát xi măng hoàn thiện chống thấm mạ kẽm sắt hộp vuông tròn chữ nhật dày rộng dài số lượng khối đơn vị tổng cộng ghi hướng bắc nam đông tây ' +
    'trên dưới trái phải trong ngoài trước sau giữa lên xuống mới cũ phá dỡ xây sửa chữa cải tạo mở rộng ngày tháng năm người vẽ duyệt hồ sơ thi giai đoạn phương án').split(' ');
  const UDK = 'dvd:spelldict';
  const userDict = () => { try{ return new Set(JSON.parse(localStorage.getItem(UDK) || '[]')); }catch(_){ return new Set(); } };
  const lev = (a, b) => { const m = a.length, n = b.length; if(Math.abs(m - n) > 2) return 9; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for(let j = 1; j <= n; j++) d[0][j] = j;
    for(let i = 1; i <= m; i++) for(let j = 1; j <= n; j++){ d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if(i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); } return d[m][n]; };
  const WORD_RE = /[A-Za-zÀ-ỹĐđ]+/g;
  function spellScan(texts, opt){
    const ud = userDict(), freq = new Map(), bad = new Map();
    for(const e of texts) for(const m of String(e.text).matchAll(WORD_RE)){ const w = m[0], lw = w.toLowerCase(); freq.set(lw, (freq.get(lw) || 0) + 1); }
    for(const [lw, f] of freq){
      if(ud.has(lw)) continue; const hasVN = VNCHR.test(lw); if(!hasVN && !opt.ascii) continue; if(lw.length === 1 && !hasVN) continue;
      const v = validSyllable(lw); if(v === false) bad.set(lw, f);
    }
    const good = [...freq.keys()].filter(w => !bad.has(w) && validSyllable(w) !== false); const pool = new Set(good.concat(COMMON));
    const out = [];
    for(const [w, f] of bad){ const cands = []; for(const g of pool){ const d = lev(w, g); if(d <= 2) cands.push([g, d, freq.get(g) || 0]); }
      cands.sort((a, b) => a[1] - b[1] || b[2] - a[2]); out.push({ w, n: f, sug: cands.slice(0, 6).map(c => c[0]) }); }
    return out.sort((a, b) => b.n - a.n);
  }
  A.spellScan = spellScan;
  function replaceWord(text, w, r){ return String(text).replace(new RegExp('(^|[^A-Za-zÀ-ỹĐđ])(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^A-Za-zÀ-ỹĐđ])', 'gi'), (m, pre, word) => { let rr = r; if(word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) rr = r[0].toUpperCase() + r.slice(1); if(word === word.toUpperCase() && word.length > 1) rr = r.toUpperCase(); return pre + rr; }); }
  A.spellReplace = replaceWord;
  plain(['SPELL', 'SP', 'CHINHTA'], 'Kiểm tra chính tả tiếng Việt (từ điển âm tiết có sẵn, không cần mạng) + từ điển riêng', () => {
    if(!A.hasDoc()){ say('Chưa mở bản vẽ.'); return; }
    const texts = (selEnts.size ? [...selEnts] : modelEntities).filter(e => e.type === 'TEXT' && !e.tbld && !A.isLocked(e) && String(e.text || '').trim() && !e.fld);
    let opt = { ascii: false }; let list = spellScan(texts, opt); const fixes = new Map();
    const render = root => {
      list = spellScan(texts, opt);
      root.querySelector('#spN').textContent = list.length ? list.length + ' từ nghi sai trong ' + texts.length + ' chữ' + (selEnts.size ? ' (vùng chọn)' : '') : 'Không phát hiện từ sai trong ' + texts.length + ' chữ.';
      root.querySelector('#spT').innerHTML = list.map((it, i) => { const ctxT = texts.find(e => new RegExp('(^|[^A-Za-zÀ-ỹĐđ])' + it.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-zÀ-ỹĐđ])', 'i').test(e.text)); const f = fixes.get(it.w);
        return '<tr' + (f != null ? ' style="opacity:.55"' : '') + '><td><b style="color:#ff8a80">' + esc(it.w) + '</b> <span style="opacity:.6">×' + it.n + '</span><div style="opacity:.6;font-size:11px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(ctxT ? ctxT.text : '') + '</div></td>' +
          '<td><input data-i="' + i + '" list="spS' + i + '" value="' + esc(f != null ? f : (it.sug[0] || '')) + '" style="width:140px"><datalist id="spS' + i + '">' + it.sug.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist></td>' +
          '<td style="white-space:nowrap"><button data-fix="' + i + '">Thay</button> <button data-ign="' + i + '" title="Bỏ qua lần này">Bỏ qua</button> <button data-add="' + i + '" title="Thêm vào từ điển riêng">+ Từ điển</button></td></tr>'; }).join('');
    };
    A.dialog({ title: 'Kiểm tra chính tả', wide: true, okText: 'Áp dụng các chỗ thay', html: '<p id="spN" style="margin:0 0 6px"></p><label style="font-size:12.5px"><input type="checkbox" id="spA"> Kiểm tra cả từ không dấu (có thể báo nhầm từ tiếng Anh, mã hiệu)</label>' +
      '<div class="lm-tbl" style="margin-top:6px"><table><thead><tr><th>Từ nghi sai</th><th>Sửa thành</th><th></th></tr></thead><tbody id="spT"></tbody></table></div><p style="opacity:.7;font-size:12px">Kiểm tra theo quy tắc ghép vần tiếng Việt (âm đầu, vần, dấu thanh, c/k, g/gh, ng/ngh…). Gợi ý lấy từ các từ đúng trong bản vẽ và từ vựng xây dựng thường dùng. Từ điển riêng lưu trên máy này.</p>',
      onOpen: root => { render(root); root.addEventListener('keydown', e => e.stopPropagation(), true);
        root.querySelector('#spA').onchange = ev => { opt.ascii = ev.target.checked; render(root); };
        root.addEventListener('click', e => { const f = e.target.closest('[data-fix]'), g = e.target.closest('[data-ign]'), a = e.target.closest('[data-add]');
          if(f){ const i = +f.dataset.fix; const v = root.querySelector('input[data-i="' + i + '"]').value.trim(); if(v){ fixes.set(list[i].w, v); f.closest('tr').style.opacity = '.55'; } }
          if(g){ fixes.delete(list[+g.dataset.ign].w); g.closest('tr').remove(); }
          if(a){ const s = userDict(); s.add(list[+a.dataset.add].w); localStorage.setItem(UDK, JSON.stringify([...s])); a.closest('tr').remove(); } }); },
      ok: root => { root.querySelectorAll('input[data-i]').forEach(inp => { const i = +inp.dataset.i; if(fixes.has(list[i] && list[i].w)) fixes.set(list[i].w, inp.value.trim() || fixes.get(list[i].w)); });
        if(!fixes.size){ log('Chính tả: không có thay đổi.'); return; } const rep = [];
        for(const e of texts){ let t = String(e.text); for(const [w, r] of fixes) t = replaceWord(t, w, r); if(t !== e.text){ const w = copy(e); w.text = t; if(w.dimd) w.dimd.ov = t; rep.push([e, w]); } }
        if(rep.length) A.commit({ rep }, 'Chính tả: đã sửa ' + rep.length + ' chữ'); } });
  });
  plain(['SPELLBROWSER', 'SPELL2'], 'Kiểm tra chính tả bằng bộ kiểm tra của trình duyệt (sửa trực tiếp từng chữ)', () => {
    const texts = (selEnts.size ? [...selEnts] : modelEntities).filter(e => e.type === 'TEXT' && !e.dimd && !e.tbld && !A.isLocked(e) && String(e.text || '').trim());
    const uniq = new Map(); for(const e of texts){ const t = String(e.text); if(!uniq.has(t)) uniq.set(t, []); uniq.get(t).push(e); } const keys = [...uniq.keys()].slice(0, 600);
    A.dialog({ title: 'Chính tả (trình duyệt)', wide: true, okText: 'Áp dụng', html: '<div style="max-height:56vh;overflow:auto">' + keys.map((t, i) => '<textarea data-i="' + i + '" spellcheck="true" lang="vi" rows="1" style="width:100%;margin-bottom:4px;background:var(--bg-canvas);color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:4px 6px;font:13px system-ui">' + esc(t) + '</textarea>').join('') + '</div>',
      onOpen: root => root.addEventListener('keydown', e => e.stopPropagation(), true),
      ok: root => { const rep = []; root.querySelectorAll('textarea[data-i]').forEach(ta => { const o = keys[+ta.dataset.i]; if(ta.value !== o) for(const e of uniq.get(o)){ const w = copy(e); w.text = ta.value; rep.push([e, w]); } }); if(rep.length) A.commit({ rep }, 'Chính tả: đã sửa ' + rep.length + ' chữ'); } });
  });

  /* =====================================================================
     2) VPORTS: xoay từng khung quanh tâm khung
     ===================================================================== */
  const _setRot = window.setRotation;
  if(typeof _setRot === 'function') window.setRotation = function(rad){
    const VP = A.vports && A.vports.state; const multi = VP && VP.tiles && VP.tiles.length > 1;
    if(!multi) return _setRot.apply(this, arguments);
    const t = VP.tiles[VP.active], Wd = W(), Hd = H(); const T = { x: (t.fx + t.fw / 2) * Wd, y: (t.fy + t.fh / 2) * Hd }; const Wc = toWorld(T.x, T.y);
    view.rot = ((rad % TAU) + TAU) % TAU; const S = toScreen(Wc.x, Wc.y); const dx = T.x - S.x, dy = T.y - S.y, c = Math.cos(view.rot), s = Math.sin(view.rot);
    view.offsetX += dx * c + dy * s; view.offsetY += -dx * s + dy * c; try{ updateCompass(); }catch(_){} draw();
  };

  /* =====================================================================
     3) COMMIT ngoài cùng: hình học chờ áp dụng, hatch liên kết vùng ghép nhiều nét,
        DIMBREAK tự cập nhật khi nét cắt qua thay đổi
     ===================================================================== */
  const loopTol = loop => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const p of loop){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return { bb: { x0, y0, x1, y1 }, tol: Math.max(x1 - x0, y1 - y0, 1e-9) * 2e-3 }; };
  const distToLoop = (p, loop) => { let d = Infinity; for(let i = 0; i < loop.length; i++){ const a = loop[i], b = loop[(i + 1) % loop.length]; const q = G.nearOnPiece({ t: 's', ax: a.x, ay: a.y, bx: b.x, by: b.y, u0: 0, u1: 1 }, p); d = Math.min(d, Math.hypot(q.x - p.x, q.y - p.y)); } return d; };
  function samples(e, n){ const c = G.curveOf(e); if(!c) return []; const o = []; if(c.at && c.u1 > c.u0){ for(let i = 0; i <= n; i++) o.push(c.at(c.u0 + (c.u1 - c.u0) * i / n)); } else for(const p of c.pieces) if(p.t === 's'){ o.push({ x: p.ax, y: p.ay }, { x: (p.ax + p.bx) / 2, y: (p.ay + p.by) / 2 }, { x: p.bx, y: p.by }); } return o; }
  function interiorPt(loop){ let cx = 0, cy = 0; for(const p of loop){ cx += p.x; cy += p.y; } cx /= loop.length; cy /= loop.length; if(G.ptInPoly({ x: cx, y: cy }, loop)) return { x: cx, y: cy };
    const { tol } = loopTol(loop); for(let i = 0; i < loop.length; i++){ const a = loop[i], b = loop[(i + 1) % loop.length], L = Math.hypot(b.x - a.x, b.y - a.y); if(L < tol) continue; const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, n = { x: -(b.y - a.y) / L, y: (b.x - a.x) / L };
      for(const s of [1, -1]){ const q = { x: m.x + n.x * tol * 4 * s, y: m.y + n.y * tol * 4 * s }; if(G.ptInPoly(q, loop)) return q; } } return null; }
  function singleMatch(loop, pool){
    const { bb, tol } = loopTol(loop);
    for(const e of pool){ if(!/^(POLYLINE|CIRCLE|ELLIPSE)$/.test(e.type) || e.wipe) continue; const b = entBBox(e); if(!b || Math.abs(b.x0 - bb.x0) > tol || Math.abs(b.y0 - bb.y0) > tol || Math.abs(b.x1 - bb.x1) > tol || Math.abs(b.y1 - bb.y1) > tol) continue;
      const c = G.curveOf(e); if(!c) continue; let ok = true; for(let i = 0; i < loop.length; i += Math.max(1, Math.floor(loop.length / 40))){ const q = G.nearOnCurve(c, loop[i]); if(!q || q.d > tol){ ok = false; break; } } if(ok) return e; }
    return null;
  }
  function multiMatch(loop, pool){
    const { tol } = loopTol(loop); const cand = [];
    for(const e of pool){ if(!/^(LINE|ARC|POLYLINE|CIRCLE|ELLIPSE)$/.test(e.type) || e.wipe || e.type === 'HATCH') continue; const sm = samples(e, 24); let on = 0; for(const p of sm) if(distToLoop(p, loop) <= tol) on++; if(on >= 2) cand.push(e); }
    if(cand.length < 2) return null; const curves = cand.map(e => G.curveOf(e));
    let per = 0; for(let i = 0; i < loop.length; i++) per += Math.hypot(loop[(i + 1) % loop.length].x - loop[i].x, loop[(i + 1) % loop.length].y - loop[i].y);
    const N = 60; let acc = 0, k = 0; for(let i = 0; i < loop.length && k < N; i++){ const a = loop[i], b = loop[(i + 1) % loop.length], L = Math.hypot(b.x - a.x, b.y - a.y); acc += L;
      while(k < N && (k + 0.5) * per / N <= acc){ const f = L > 0 ? ((k + 0.5) * per / N - (acc - L)) / L : 0; const p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; if(!curves.some(c => { const q = c && G.nearOnCurve(c, p); return q && q.d <= tol * 1.5; })) return null; k++; } }
    const used = cand.filter((e, i) => curves[i]); return used.length ? used : null;
  }
  A.hatchMultiMatch = multiMatch;
  const _cmO = A.commit;
  A.commit = function(ch, msg){
    if(!ch) return _cmO.apply(this, arguments);
    const pend = { rep: new Map(), del: new Set(ch.del || []), add: (ch.add || []).slice() }; for(const [o, w] of (ch.rep || [])) pend.rep.set(o, w);
    const hadRep = !!ch.rep;
    try{
      ch.rep = ch.rep || [];
      const repOf = o => ch.rep.find(([x]) => x === o);
      const ensureCid = (m) => { if(m.cid) return m.cid; if((ch.add || []).includes(m)){ m.cid = newCid(); return m.cid; } const pr = repOf(m); if(pr){ if(!pr[1].cid) pr[1].cid = newCid(); return pr[1].cid; } const w = copy(m); w.cid = newCid(); ch.rep.push([m, w]); pend.rep.set(m, w); return w.cid; };
      // (a) hatch mới: liên kết 1 đối tượng kín hoặc nhiều nét ghép
      for(const h of (ch.add || []).filter(e => e && e.type === 'HATCH' && !e.hassoc && e.loops && e.loops.length && !e.grp)){
        const b = entBBox(h); if(!b) continue; const pad = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.02; const pool = A.queryBox(b.x0 - pad, b.y0 - pad, b.x1 + pad, b.y1 + pad, 3000).filter(e => e.type !== 'HATCH' && e.type !== 'TEXT').concat((ch.add || []).filter(e => e !== h && e.type !== 'HATCH'));
        const ids = h.loops.map(lp => { if(!lp || lp.length < 3) return null; const s = singleMatch(lp, pool); if(s) return ensureCid(s); const m = multiMatch(lp, pool); if(!m) return null; const p = interiorPt(lp); return p ? { m: m.map(ensureCid), p } : null; });
        if(ids.some(Boolean)) h.hassoc = ids;
      }
      // (b) nét thành phần của vùng ghép thay đổi → dựng lại vùng
      const changed = new Map(); for(const [o, w] of ch.rep) if(w && w.cid) changed.set(w.cid, w);
      const gone = new Set(); for(const e of (ch.del || [])) if(e && e.cid) gone.add(e.cid);
      if((changed.size || gone.size) && A.findBoundaryIn){
        const byCid = new Map(); for(const e of modelEntities) if(e.cid) byCid.set(e.cid, e);
        for(const h of modelEntities){ if(h.type !== 'HATCH' || !h.hassoc || pend.del.has(h)) continue; const idx = h.hassoc.map((a, i) => a && typeof a === 'object' && a.m.some(c => changed.has(c) || gone.has(c)) ? i : -1).filter(i => i >= 0); if(!idx.length) continue;
          let pr = repOf(h); if(!pr){ pr = [h, copy(h)]; ch.rep.push(pr); pend.rep.set(h, pr[1]); } const w = pr[1]; w.hassoc = (w.hassoc || h.hassoc).slice();
          for(const i of idx){ const a = h.hassoc[i]; if(a.m.some(c => gone.has(c) && !changed.has(c))){ w.hassoc[i] = null; continue; }
            const ents = a.m.map(c => changed.get(c) || byCid.get(c)).filter(Boolean); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const e of ents){ const bb = entBBox(e); if(!bb) continue; x0 = Math.min(x0, bb.x0); y0 = Math.min(y0, bb.y0); x1 = Math.max(x1, bb.x1); y1 = Math.max(y1, bb.y1); }
            const pd = Math.max(x1 - x0, y1 - y0) * 0.05; let res = null; let p = a.p;
            try{ res = A.findBoundaryIn(p, { minX: x0 - pd, minY: y0 - pd, maxX: x1 + pd, maxY: y1 + pd }, ents); }catch(_){}
            if(!(res && res.loops && res.loops.length)){ const q = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }; try{ res = A.findBoundaryIn(q, { minX: x0 - pd, minY: y0 - pd, maxX: x1 + pd, maxY: y1 + pd }, ents); p = q; }catch(_){} }
            if(res && res.loops && res.loops.length){ w.loops[i] = res.loops[0]; w.hassoc[i] = { m: a.m, p: interiorPt(res.loops[0]) || p }; } else w.hassoc[i] = null; }
          if(!w.hassoc.some(Boolean)) delete w.hassoc; }
      }
      // (c) kích thước có ngắt (DIMBREAK) bị nét thay đổi cắt qua → dựng lại
      const boxes = []; for(const [o, w] of ch.rep){ if(o.grp && (o.dimd || o.blk === '*DIM' || String(o.blk || '').startsWith('*DIM'))) continue; boxes.push(entBBox(o), entBBox(w)); } for(const e of (ch.del || [])) if(!e.grp) boxes.push(entBBox(e)); for(const e of (ch.add || [])) if(!e.grp) boxes.push(entBBox(e));
      const bx = boxes.filter(Boolean);
      if(bx.length){
        const repG = new Set(ch.rep.map(([o]) => o.grp).filter(Boolean));
        for(const t of modelEntities){ if(!t.dimd || !t.dimd.brk || repG.has(t.grp) || pend.del.has(t)) continue; const d = t.dimd; const pts = [d.p1, d.p2, d.L, d.c, d.V].filter(Boolean); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for(const p of pts){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
          const db = { x0, y0, x1, y1 }; if(bx.some(b => bbOverlap(b, db))){ const w = copy(t); w.dimd._rv = (t.dimd._rv || 0) + 1; ch.rep.push([t, w]); pend.rep.set(t, w); } }
        // kích thước của file đã ngắt (DIMBREAK tĩnh) → ngắt lại
        const gids = new Set(); for(const e of modelEntities) if(e.brkId && !pend.del.has(e) && !repG.has(e.grp)){ const b = entBBox(JSON.parse(e.brk0)); if(bx.some(x => bbOverlap(x, b))) gids.add(e.brkId); }
        if(gids.size){ ch.del = (ch.del || []).slice(); ch.add = (ch.add || []).slice(); A._pend = pend; try{ for(const id of gids){ const old = modelEntities.filter(e => e.brkId === id); const orig = JSON.parse(old[0].brk0); const ps = breakLine(orig, orig.grp, id); for(const o of old) if(!pend.del.has(o)){ ch.del.push(o); pend.del.add(o); } for(const p of ps) ch.add.push(p); } } finally { A._pend = null; } }
      }
    }catch(err){ console.warn('commit x8', err); }
    if(!hadRep && ch.rep && !ch.rep.length) delete ch.rep;
    A._pend = pend;
    try{ return _cmO.apply(this, [ch, msg]); } finally { A._pend = null; }
  };

  /* =====================================================================
     4) DIMBREAK cho cả kích thước có sẵn trong file (nét rời) + bỏ ngắt
     ===================================================================== */
  function breakLine(e, gid, id){
    const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1); const mk = (a, b) => { const o = copy(e); const ux = (e.x2 - e.x1) / L, uy = (e.y2 - e.y1) / L; o.x1 = e.x1 + ux * a; o.y1 = e.y1 + uy * a; o.x2 = e.x1 + ux * b; o.y2 = e.y1 + uy * b; o.brkId = id; o.brk0 = JSON.stringify(e); return o; };
    if(L < 1e-9) return [mk(0, 0)];
    const txt = modelEntities.find(m => m.grp === gid && m.type === 'TEXT'); const gap = ((txt && txt.h) || L * 0.05) * 0.6;
    const seg = { t: 's', ax: e.x1, ay: e.y1, bx: e.x2, by: e.y2, u0: 0, u1: L }; const bb = [Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.max(e.x1, e.x2), Math.max(e.y1, e.y2)];
    const ts = []; for(const o of (A.pendQuery ? A.pendQuery(bb) : A.queryBox(bb[0], bb[1], bb[2], bb[3], 3000))){ if(o.grp === gid || o.type === 'TEXT' || o.type === 'HATCH' || o.brkId === id) continue; const c = G.curveOf(o); if(!c) continue; for(const p of c.pieces) for(const q of G.xPieces(seg, p)) if(q.ua > gap * 0.3 && q.ua < L - gap * 0.3) ts.push(q.ua); }
    ts.sort((a, b) => a - b); const out = []; let s0 = 0; for(const t of ts){ if(t - gap / 2 > s0) out.push(mk(s0, t - gap / 2)); s0 = Math.max(s0, t + gap / 2); } if(L > s0) out.push(mk(s0, L));
    return out.length ? out : [mk(0, L)];
  }
  cmd(['DIMBREAK'], 'Ngắt đường kích thước / gióng tại chỗ cắt nét khác — cả kích thước có sẵn trong file (R = bỏ ngắt)', async () => {
    const k = await A.getKw('Tuỳ chọn', { kw: [{ k: 'A', t: 'Tự động ngắt' }, { k: 'R', t: 'Bỏ ngắt' }], def: 'Tự động ngắt' });
    const s = await A.getSel('Chọn kích thước', { filter: e => !!e.grp }); const gids = [...new Set((s.sel || []).map(e => e.grp).filter(Boolean))]; if(!gids.length){ log('Chưa chọn kích thước.'); return; }
    const rep = [], del = [], add = []; let n = 0;
    for(const g of gids){
      const mem = modelEntities.filter(m => m.grp === g); const t = mem.find(m => m.dimd);
      if(t){ const w = copy(t); if(k.kw === 'R') delete w.dimd.brk; else w.dimd.brk = 1; rep.push([t, w]); n++; continue; }
      if(!mem.some(m => /^\*DIM/.test(m.blk || '') || m.blk === '*DIM')) continue;
      const ids = new Set(mem.filter(m => m.brkId).map(m => m.brkId));
      for(const id of ids){ const ps = mem.filter(m => m.brkId === id); del.push(...ps); const o = JSON.parse(ps[0].brk0); if(k.kw === 'R') add.push(o); }
      if(k.kw !== 'R'){ const lines = mem.filter(m => m.type === 'LINE' && !m.brkId).concat([...ids].map(id => JSON.parse(mem.find(m => m.brkId === id).brk0)));
        for(const l of lines){ const id = 'b' + Math.random().toString(36).slice(2, 9); const src = mem.includes(l) ? l : null; const ps = breakLine(src ? copy(l) : l, g, id); if(ps.length === 1 && Math.abs(Math.hypot(ps[0].x2 - ps[0].x1, ps[0].y2 - ps[0].y1) - Math.hypot(l.x2 - l.x1, l.y2 - l.y1)) < 1e-9){ if(!src) add.push(l); continue; } if(src) del.push(src); add.push(...ps); } }
      n++;
    }
    if(rep.length || del.length || add.length) A.commit({ rep, del, add }, 'DIMBREAK: ' + n + ' kích thước'); else log('Không có chỗ nào cần ngắt.');
  });

  /* =====================================================================
     5) MIRRTEXT = 1: lật cả chữ khi MIRROR
     ===================================================================== */
  try{ window.MIRRTEXT = +(localStorage.getItem('dvd:mirrtext') || 0) ? 1 : 0; }catch(_){ window.MIRRTEXT = 0; }
  const _mir = window.mirrorAcross;
  if(typeof _mir === 'function') window.mirrorAcross = function(e, P, Q){
    const isT = e && e.type === 'TEXT' && window.MIRRTEXT; const rot0 = isT ? (e.rot || 0) : 0; const r = _mir.apply(this, arguments);
    if(isT && r !== false){ const th = Math.atan2(Q.y - P.y, Q.x - P.x) * R2D; e.rot = ((2 * th - rot0) % 360 + 360) % 360; e.xs = -(e.xs || 1); }
    return r;
  };

  /* =====================================================================
     6) TOOL PALETTES (Ctrl+3)
     ===================================================================== */
  const unitMM = () => { try{ return unitToMM() || 1; }catch(_){ return 1; } };
  const annoN = () => (A.ANNO && A.ANNO.N) || 100;
  const PS = () => annoN() / unitMM();            // mm trên giấy → đơn vị bản vẽ
  const RS = () => 1 / unitMM();                   // mm thật → đơn vị bản vẽ
  const T = (x, y, h, text, o) => Object.assign({ type: 'TEXT', x, y, h, rot: 0, text, ha: 'center', va: 'middle' }, o || {});
  const PL = (v, closed, o) => Object.assign({ type: 'POLYLINE', vertices: v.map(([x, y]) => ({ x, y })), closed: !!closed }, o || {});
  const SO = v => ({ type: 'SOLID', pts: v.map(([x, y]) => ({ x, y })) });
  const SYMS = [
    { k: 'north', n: 'Mũi tên Bắc', ic: 'ROTRESET', make: () => [{ type: 'CIRCLE', cx: 0, cy: 0, r: 6 }, PL([[0, 8], [-3, -5], [0, -2], [3, -5]], true), SO([[0, 8], [0, -2], [-3, -5]]), T(0, 11, 3, 'N')] },
    { k: 'grid', n: 'Đầu trục', ic: 'CENTERMARK', ask: [['Tên trục', '1']], make: a => [{ type: 'CIRCLE', cx: 0, cy: 0, r: 4.5 }, T(0, 0, 4, a[0])] },
    { k: 'level', n: 'Cao độ', ic: 'ELEV', ask: [['Cao độ', '±0.000']], make: a => [PL([[0, 0], [-2.2, 3], [2.2, 3]], true), SO([[0, 0], [0, 3], [-2.2, 3]]), { type: 'LINE', x1: -2.2, y1: 3, x2: 16, y2: 3 }, T(3, 4.6, 2.5, a[0], { ha: 'left' })] },
    { k: 'levelp', n: 'Cao độ mặt bằng', ic: 'ELEV', ask: [['Cao độ', '+0.000']], make: a => [{ type: 'CIRCLE', cx: 0, cy: 0, r: 2.5 }, { type: 'LINE', x1: -2.5, y1: 0, x2: 2.5, y2: 0 }, { type: 'LINE', x1: 0, y1: -2.5, x2: 0, y2: 2.5 }, SO([[0, 0], [2.5, 0], [0, 2.5]]), SO([[0, 0], [-2.5, 0], [0, -2.5]]), T(4, 0, 2.5, a[0], { ha: 'left' })] },
    { k: 'section', n: 'Ký hiệu mặt cắt', ic: 'SECTIONPLANE', ask: [['Tên mặt cắt', 'A']], make: a => [PL([[0, 0], [0, 8]], false, { lw: 70 }), PL([[0, 8], [5, 8]]), SO([[5, 9.3], [8, 8], [5, 6.7]]), T(6, 12, 4, a[0])] },
    { k: 'detail', n: 'Chi tiết (callout)', ic: 'CENTERMARK', ask: [['Số chi tiết', '1'], ['Bản vẽ', 'KT-01']], make: a => [{ type: 'CIRCLE', cx: 0, cy: 0, r: 6 }, { type: 'LINE', x1: -6, y1: 0, x2: 6, y2: 0 }, T(0, 2.8, 3.2, a[0]), T(0, -2.8, 2.2, a[1])] },
    { k: 'slope', n: 'Mũi tên độ dốc', ic: 'DIMALIGNED', ask: [['Độ dốc', 'i=2%']], make: a => [{ type: 'LINE', x1: -8, y1: 0, x2: 6, y2: 0 }, SO([[6, 1], [9, 0], [6, -1]]), T(0, 2, 2.5, a[0], { va: 'bottom' })] },
    { k: 'stair', n: 'Mũi tên cầu thang', ic: 'PLINE', ask: [['Chữ', 'LÊN']], make: a => [{ type: 'CIRCLE', cx: -10, cy: 0, r: 0.8 }, { type: 'LINE', x1: -10, y1: 0, x2: 8, y2: 0 }, SO([[8, 1.2], [11, 0], [8, -1.2]]), T(-1, 2, 2.5, a[0], { va: 'bottom' })] },
    { k: 'rev', n: 'Tam giác sửa đổi', ic: 'REVCLOUD', ask: [['Lần sửa', '1']], make: a => [PL([[0, 5], [-4.3, -2.5], [4.3, -2.5]], true), T(0, 0, 3, a[0])] },
    { k: 'door', n: 'Cửa đi 1 cánh', ic: 'ARC', real: 1, ask: [['Rộng cửa (mm)', '900']], make: a => { const w = parseFloat(a[0]) || 900; return [{ type: 'LINE', x1: 0, y1: 0, x2: 0, y2: w }, { type: 'ARC', cx: 0, cy: 0, r: w, a1: 0, a2: 90 }, { type: 'LINE', x1: 0, y1: 0, x2: w, y2: 0 }]; } },
    { k: 'door2', n: 'Cửa đi 2 cánh', ic: 'ARC', real: 1, ask: [['Rộng cửa (mm)', '1400']], make: a => { const w = (parseFloat(a[0]) || 1400) / 2; return [{ type: 'LINE', x1: -w, y1: 0, x2: -w, y2: w }, { type: 'ARC', cx: -w, cy: 0, r: w, a1: 0, a2: 90 }, { type: 'LINE', x1: w, y1: 0, x2: w, y2: w }, { type: 'ARC', cx: w, cy: 0, r: w, a1: 90, a2: 180 }, { type: 'LINE', x1: -w, y1: 0, x2: w, y2: 0 }]; } },
    { k: 'window', n: 'Cửa sổ', ic: 'MLINE', real: 1, ask: [['Rộng (mm)', '1200'], ['Dày tường (mm)', '220']], make: a => { const w = parseFloat(a[0]) || 1200, t = parseFloat(a[1]) || 220; return [PL([[0, 0], [w, 0], [w, t], [0, t]], true), { type: 'LINE', x1: 0, y1: t / 2 - 15, x2: w, y2: t / 2 - 15 }, { type: 'LINE', x1: 0, y1: t / 2 + 15, x2: w, y2: t / 2 + 15 }]; } },
    { k: 'col', n: 'Cột vuông (tô đặc)', ic: 'RECTANG', real: 1, ask: [['Cạnh (mm)', '220']], make: a => { const s = (parseFloat(a[0]) || 220) / 2; return [PL([[-s, -s], [s, -s], [s, s], [-s, s]], true), { type: 'HATCH', loops: [[{ x: -s, y: -s }, { x: s, y: -s }, { x: s, y: s }, { x: -s, y: s }]], solid: true }]; } },
    { k: 'wc', n: 'Bàn cầu', ic: 'ELLIPSE', real: 1, make: () => [PL([[-250, 0], [250, 0], [250, 180], [-250, 180]], true), { type: 'ELLIPSE', cx: 0, cy: -230, mx: 0, my: 230, ratio: 0.8, p1: Math.PI, p2: 2 * Math.PI }, { type: 'LINE', x1: -185, y1: 0, x2: -185, y2: -230 }, { type: 'LINE', x1: 185, y1: 0, x2: 185, y2: -230 }] },
    { k: 'lav', n: 'Lavabo', ic: 'ELLIPSE', real: 1, make: () => [PL([[-280, 0], [280, 0], [280, -450], [-280, -450]], true), { type: 'ELLIPSE', cx: 0, cy: -230, mx: 200, my: 0, ratio: 0.7 }, { type: 'CIRCLE', cx: 0, cy: -80, r: 18 }] }
  ];
  A.symbols = SYMS;
  async function placeSymbol(s){
    const vals = []; for(const [p, d] of (s.ask || [])){ const r = await A.getStr(p, { def: d }); vals.push(r.str != null && r.str !== '' ? r.str : d); }
    const k = s.real ? RS() : PS(); const base = s.make(vals);
    const build = (pt, rot) => { const c = Math.cos(rot * D2R), sn = Math.sin(rot * D2R); const M = { a: c * k, b: sn * k, c: -sn * k, d: c * k, e: pt.x, f: pt.y }; return base.map(e => { const w = A.xformEnt(JSON.parse(JSON.stringify(e)), M); return w; }); };
    const p = await A.getPoint('Điểm chèn ' + s.n.toLowerCase(), { rubber: false, preview: (g, q) => g.ents(build(q, 0), '#cfe3ff') }); if(!p.pt) return;
    const r = await A.getPoint('Góc xoay <0>', { base: p.pt, preview: (g, q) => g.ents(build(p.pt, Math.atan2(q.y - p.pt.y, q.x - p.pt.x) * R2D), '#cfe3ff') }); const rot = r.pt ? Math.atan2(r.pt.y - p.pt.y, r.pt.x - p.pt.x) * R2D : 0;
    const gid = A.newGroupId('S'); const add = build(p.pt, rot).map(e => { A.newProps(e); if(e.type === 'TEXT' || e.type === 'HATCH' || e.type === 'SOLID') delete e.lt; e.grp = gid; e.blk = s.n; return e; });
    A.commit({ add }, 'Đã chèn ' + s.n);
  }
  A.placeSymbol = placeSymbol;
  const PCMDS = ['LINE', 'PLINE', 'CIRCLE', 'ARC', 'RECTANG', 'POLYGON', 'HATCH', 'MTEXT', 'DIMLINEAR', 'MLEADER', 'MOVE', 'COPY', 'ROTATE', 'MIRROR', 'OFFSET', 'TRIM', 'EXTEND', 'FILLET', 'ARRAYRECT', 'MATCHPROP', 'MEASUREGEOM', 'TABLE', 'REVCLOUD', 'WIPEOUT'];
  let tp = null, tpTab = 'sym'; try{ tpTab = localStorage.getItem('dvd:tptab') || 'sym'; }catch(_){}
  function tpRender(){
    if(!tp) return; const body = tp.querySelector('.tp-b'); tp.querySelectorAll('.tp-t button').forEach(b => b.classList.toggle('on', b.dataset.t === tpTab));
    const item = (attr, ic, label) => '<button ' + attr + ' title="' + esc(label) + '">' + ico(ic) + '<span>' + esc(label) + '</span></button>';
    body.style.gridTemplateColumns = tpTab === 'cmd' ? '1fr 1fr' : '1fr';
    if(tpTab === 'cmd') body.innerHTML = PCMDS.map(c => item('data-c="' + c + '"', c, ((DVDCmd.commands.find(x => x.k[0] === c) || {}).k || [c])[0])).join('');
    else if(tpTab === 'sym') body.innerHTML = SYMS.map((s, i) => item('data-s="' + i + '"', s.ic, s.n)).join('');
    else if(tpTab === 'hat'){ const P = A.PATS || {}; body.innerHTML = Object.keys(P).map(k => item('data-h="' + esc(k) + '"', 'HATCH', (P[k] && P[k].name) || k)).join('') + item('data-h="__grad"', 'GRADIENT', 'Chuyển màu'); }
    else { let L = {}; try{ L = JSON.parse(localStorage.getItem('dvd:blocklib') || '{}'); }catch(_){} const ks = Object.keys(L).sort(); body.innerHTML = ks.length ? ks.map(n => item('data-b="' + esc(n) + '"', 'INSERT', n)).join('') : '<p style="padding:8px;opacity:.7;font-size:12px">Thư viện khối trống. Chọn đối tượng rồi dùng lệnh BLOCK (B) để thêm.</p>'; }
  }
  function toolPalettes(force){
    if(tp && force !== true){ tp.remove(); tp = null; return; } if(tp) return;
    if(!document.getElementById('dvdTPcss')){ const st = document.createElement('style'); st.id = 'dvdTPcss'; st.textContent = '#dvdTP{position:absolute;left:8px;top:36px;width:236px;max-height:calc(100% - 120px);display:flex;flex-direction:column;background:#2b313b;border:1px solid #4a5363;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.45);z-index:8;font:12px system-ui,sans-serif;color:#e6eaf0}#dvdTP .tp-h{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:#353c48;border-radius:6px 6px 0 0;font-weight:600;cursor:move}#dvdTP .tp-h button{background:none;border:none;color:#aab3c0;font-size:15px;cursor:pointer}#dvdTP .tp-t{display:flex;gap:2px;padding:4px 4px 0}#dvdTP .tp-t button{flex:1;padding:4px 2px;border:1px solid #454e5c;border-bottom:none;border-radius:4px 4px 0 0;background:#262b34;color:#aab3c0;font:600 11px system-ui;cursor:pointer}#dvdTP .tp-t button.on{background:#3b4452;color:#fff}#dvdTP .tp-b{overflow:auto;padding:4px;display:grid;grid-template-columns:1fr 1fr;gap:3px;background:#3b4452;border-top:1px solid #454e5c}#dvdTP .tp-b button{display:flex;align-items:center;gap:6px;padding:5px 6px;border:1px solid transparent;border-radius:3px;background:none;color:#e6eaf0;font:11.5px system-ui;cursor:pointer;text-align:left;min-width:0}#dvdTP .tp-b button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dvdTP .tp-b button:hover{background:#4c5869;border-color:#61708a}#dvdTP .tp-b .ic{width:18px;height:18px;flex:0 0 auto}'; document.head.appendChild(st); }
    tp = document.createElement('div'); tp.id = 'dvdTP';
    tp.innerHTML = '<div class="tp-h"><span>Tool Palettes</span><button title="Đóng (Ctrl+3)">×</button></div><div class="tp-t">' + [['cmd', 'Lệnh'], ['sym', 'Ký hiệu'], ['hat', 'Hatch'], ['blk', 'Khối']].map(([k, t]) => '<button data-t="' + k + '">' + t + '</button>').join('') + '</div><div class="tp-b"></div>';
    (document.querySelector('.stage') || document.body).appendChild(tp); tpRender();
    tp.querySelector('.tp-h button').onclick = () => toolPalettes();
    tp.querySelector('.tp-t').onclick = e => { const b = e.target.closest('[data-t]'); if(!b) return; tpTab = b.dataset.t; try{ localStorage.setItem('dvd:tptab', tpTab); }catch(_){} tpRender(); };
    tp.querySelector('.tp-b').onclick = e => { const b = e.target.closest('button'); if(!b) return; if(A.busy()) A.cancel(true);
      if(b.dataset.c) DVDCmd.run(b.dataset.c);
      else if(b.dataset.s) A.run('SYMBOL', () => placeSymbol(SYMS[+b.dataset.s]));
      else if(b.dataset.h){ if(b.dataset.h === '__grad') DVDCmd.run('GRADIENT'); else { if(A.HS){ A.HS.pat = b.dataset.h; try{ localStorage.setItem('dvd:hatch', JSON.stringify(A.HS)); }catch(_){} } DVDCmd.run('HATCH'); log('Mẫu hatch: ' + b.dataset.h); } }
      else if(b.dataset.b){ const nm = b.dataset.b; A.run('INSERT', async () => { const r = await A.getPoint('Điểm chèn khối "' + nm + '"', { rubber: false, preview: (g, p) => g.ents(A.instBlock(nm, 'lib', p, 1, 0).slice(0, 1500), '#cfe3ff') }); if(!r.pt) return; const ents = A.instBlock(nm, 'lib', r.pt, 1, 0); if(ents.length) A.commit({ add: ents }, 'Đã chèn khối ' + nm); }); } };
    // kéo để dời bảng
    const h = tp.querySelector('.tp-h'); let drag = null; h.addEventListener('pointerdown', e => { if(e.target.closest('button')) return; drag = { x: e.clientX - tp.offsetLeft, y: e.clientY - tp.offsetTop }; h.setPointerCapture(e.pointerId); });
    h.addEventListener('pointermove', e => { if(!drag) return; tp.style.left = Math.max(0, e.clientX - drag.x) + 'px'; tp.style.top = Math.max(0, e.clientY - drag.y) + 'px'; }); h.addEventListener('pointerup', () => { drag = null; });
  }
  A.toolPalettes = toolPalettes;
  plain(['TOOLPALETTES', 'TP', 'TOOLPALETTE'], 'Bảng công cụ (Ctrl+3): lệnh, ký hiệu kiến trúc, mẫu hatch, khối', () => toolPalettes());
  cmd(['SYMBOL', 'KYHIEU'], 'Chèn ký hiệu kiến trúc (mũi tên Bắc, đầu trục, cao độ, mặt cắt, cửa…)', async () => {
    const k = await A.getKw('Ký hiệu', { kw: SYMS.map((s, i) => ({ k: String(i + 1), t: s.n })), def: SYMS[0].n }); const s = SYMS[(+k.kw || 1) - 1]; if(s) await placeSymbol(s);
  });

  /* =====================================================================
     7) DESIGNCENTER (Ctrl+2): lấy khối, lớp, kiểu nét từ bản vẽ khác
     ===================================================================== */
  const pick = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
  let DC = null;
  async function dcOpen(file){
    if(!A.dcLoad){ say('Chưa nạp module tham chiếu.'); return; }
    const kind = /\.dwg$/i.test(file.name) ? 'dwg' : 'dxf'; log('DesignCenter: đang đọc ' + file.name + '…');
    try{ DC = await A.dcLoad(kind, kind === 'dwg' ? await file.arrayBuffer() : await file.text()); DC.name = file.name; }catch(err){ console.error(err); say('Không đọc được ' + file.name); return; }
    dcDialog();
  }
  A.dcOpenData = async (name, kind, data) => { DC = await A.dcLoad(kind, data); DC.name = name; return DC; };
  async function dcInsert(name){
    if(!DC) return; const sc0 = 1;
    const r = await A.getPoint('Điểm chèn khối "' + name + '"', { rubber: false, preview: (g, p) => g.ents(DC.make(name, p.x, p.y, sc0, 0).slice(0, 1500), '#cfe3ff') }); if(!r.pt) return;
    const s = await A.getNum('Tỉ lệ', { def: 1 }); const sc = s.num > 0 ? s.num : 1;
    const ents = DC.make(name, r.pt.x, r.pt.y, sc, 0); if(!ents.length){ log('Khối rỗng.'); return; }
    const gmap = new Map(); const L = new Set(A.layerNames());
    for(const e of ents){ if(e.grp){ if(!gmap.has(e.grp)) gmap.set(e.grp, A.newGroupId('B')); e.grp = gmap.get(e.grp); } const ly = e.layer || '0'; if(!L.has(ly)){ A.addLayer(ly, DC.layers[ly] && (DC.layers[ly].hex || DC.layers[ly])); L.add(ly); } }
    A.commit({ add: ents }, 'DesignCenter: đã chèn khối ' + name + ' (' + ents.length + ' nét)');
  }
  A.dcInsert = (name, pt, sc) => { const ents = DC.make(name, pt.x, pt.y, sc || 1, 0); const gmap = new Map(); for(const e of ents) if(e.grp){ if(!gmap.has(e.grp)) gmap.set(e.grp, A.newGroupId('B')); e.grp = gmap.get(e.grp); } A.commit({ add: ents }); return ents.length; };
  function dcDialog(){
    const D = DC; const lay = Object.keys(D.layers || {}).sort(); const lts = Object.keys(D.ltypes || {}).sort(); const cur = new Set(A.layerNames());
    const hexOf = v => typeof v === 'string' ? v : (v && (v.hex || v.color)) || '#ffffff';
    A.dialog({ title: 'DesignCenter — ' + esc(D.name), wide: true, noOk: true, cancelText: 'Đóng',
      html: '<div class="ds-tabs" id="dcT"><button class="on" data-t="b">Khối (' + D.names.length + ')</button><button data-t="l">Lớp (' + lay.length + ')</button><button data-t="t">Kiểu nét (' + lts.length + ')</button><button data-t="o">Mở bản vẽ khác…</button></div>' +
        '<div data-p="b"><input id="dcF" placeholder="Tìm khối…" style="width:100%;margin-bottom:6px"><div class="lm-tbl"><table><tbody>' + (D.names.length ? D.names.map(n => '<tr data-n="' + esc(n) + '"><td>' + esc(n) + '</td><td style="opacity:.6">' + D.count(n) + ' nét</td><td><button data-ins="' + esc(n) + '">Chèn</button></td></tr>').join('') : '<tr><td>File không có khối.</td></tr>') + '</tbody></table></div></div>' +
        '<div data-p="l" style="display:none"><div class="lm-tbl"><table><tbody>' + lay.map(n => '<tr><td><label><input type="checkbox" data-l="' + esc(n) + '"' + (cur.has(n) ? ' disabled' : ' checked') + '> <span style="display:inline-block;width:10px;height:10px;background:' + esc(hexOf(D.layers[n])) + '"></span> ' + esc(n) + '</label></td><td style="opacity:.6">' + (cur.has(n) ? 'đã có' : '') + '</td></tr>').join('') + '</tbody></table></div><button id="dcAddL" style="margin-top:6px">Thêm các lớp đã chọn vào bản vẽ</button></div>' +
        '<div data-p="t" style="display:none"><div class="lm-tbl"><table><tbody>' + lts.map(n => '<tr><td><label><input type="checkbox" data-t2="' + esc(n) + '" checked> ' + esc(n) + '</label></td></tr>').join('') + '</tbody></table></div><button id="dcAddT" style="margin-top:6px">Nạp các kiểu nét đã chọn</button></div>',
      onOpen: root => {
        root.addEventListener('keydown', e => e.stopPropagation(), true);
        root.querySelector('#dcT').onclick = e => { const b = e.target.closest('[data-t]'); if(!b) return; if(b.dataset.t === 'o'){ root.remove(); pick('.dwg,.dxf').then(f => f && dcOpen(f)); return; } root.querySelectorAll('#dcT button').forEach(x => x.classList.toggle('on', x === b)); root.querySelectorAll('[data-p]').forEach(p => p.style.display = p.dataset.p === b.dataset.t ? '' : 'none'); };
        const f = root.querySelector('#dcF'); if(f) f.addEventListener('input', () => { const q = f.value.toLowerCase(); root.querySelectorAll('tr[data-n]').forEach(tr => tr.style.display = tr.dataset.n.toLowerCase().includes(q) ? '' : 'none'); });
        root.addEventListener('click', e => { const b = e.target.closest('[data-ins]'); if(b){ const n = b.dataset.ins; root.remove(); A.run('ADCENTER', () => dcInsert(n)); } });
        const al = root.querySelector('#dcAddL'); if(al) al.onclick = () => { let n = 0; root.querySelectorAll('[data-l]:checked:not(:disabled)').forEach(c => { const nm = c.dataset.l; if(A.addLayer(nm, hexOf(D.layers[nm]))){ n++; if(D.layerLT && D.layerLT[nm]) try{ A.setLayerLT(nm, D.layerLT[nm]); }catch(_){} } c.disabled = true; }); say('Đã thêm ' + n + ' lớp.'); };
        const at = root.querySelector('#dcAddT'); if(at) at.onclick = () => { let n = 0; root.querySelectorAll('[data-t2]:checked').forEach(c => { const nm = c.dataset.t2, d = D.ltypes[nm]; if(d && d.pat){ LTYPES[nm] = d; A.LS.ltd[nm] = d; n++; } }); A.lsSave(); say('Đã nạp ' + n + ' kiểu nét.'); };
      } });
  }
  plain(['ADCENTER', 'DC', 'DESIGNCENTER'], 'DesignCenter (Ctrl+2): lấy khối, lớp, kiểu nét từ bản vẽ DWG/DXF khác', () => { if(DC){ dcDialog(); return; } pick('.dwg,.dxf').then(f => f && dcOpen(f)); });

  /* =====================================================================
     8) PDFIMPORT — nhập nét, chữ, vùng tô từ file PDF vector
     ===================================================================== */
  let pdfjsP = null;
  function loadPdfJs(){ if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib); if(pdfjsP) return pdfjsP;
    pdfjsP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = './vendor/pdfjs/pdf.min.js'; s.onload = () => { const L = window.pdfjsLib || window['pdfjs-dist/build/pdf']; if(!L){ rej(new Error('pdfjs')); return; } L.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.js'; window.pdfjsLib = L; res(L); }; s.onerror = () => { pdfjsP = null; rej(new Error('Không tải được bộ đọc PDF')); }; document.head.appendChild(s); });
    return pdfjsP; }
  A.loadPdfJs = loadPdfJs;
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const hexC = c => { if(!c) return null; if(typeof c === 'string') return c.startsWith('#') ? c.toLowerCase() : null; if(c.length >= 3){ const v = [c[0], c[1], c[2]].map(x => +x <= 1 && !Number.isInteger(+x) ? Math.round(+x * 255) : Math.round(+x)); return '#' + v.map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join(''); } return null; };
  async function pdfToEnts(data, pageNo, opt){
    const L = await loadPdfJs(); const doc = await L.getDocument({ data, isEvalSupported: false }).promise; const page = await doc.getPage(Math.max(1, Math.min(doc.numPages, pageNo || 1)));
    const OPS = L.OPS; const ol = await page.getOperatorList(); const vb = page.view || [0, 0, 0, 0]; const k = opt.k; const org = opt.org || { x: 0, y: 0 };
    const map = p => { const q = { x: org.x + (p.x - vb[0]) * k, y: org.y + (p.y - vb[1]) * k }; if(p.bulge) q.bulge = p.bulge; return q; };
    const flat = v => { if(!v.some(p => p.bulge)) return v; const o = []; for(let i = 0; i < v.length; i++){ const a = v[i], b = v[(i + 1) % v.length]; o.push({ x: a.x, y: a.y }); if(a.bulge && (i < v.length - 1 || true)){ try{ const arc = bulgeArcPoints(a, b, a.bulge); for(let j = 1; j < arc.length - 1; j++) o.push({ x: arc[j].x, y: arc[j].y }); }catch(_){} } } return o; };
    // cung Bezier bậc 3 gần đúng cung tròn → trả bulge (null nếu không phải cung)
    const arcFit = (p0, p1, p2, p3) => { const B = t => { const u = 1 - t; return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }; };
      const m = B(0.5); const ax = p0.x, ay = p0.y, bx = m.x, by = m.y, cx = p3.x, cy = p3.y; const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); const chord = Math.hypot(cx - ax, cy - ay); if(Math.abs(d) < 1e-12 || chord < 1e-9) return null;
      const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d; const r = Math.hypot(ax - ux, ay - uy); if(!(r > 1e-9) || r > chord * 1e3) return null;
      for(const t of [0.12, 0.25, 0.38, 0.62, 0.75, 0.88]){ const q = B(t); if(Math.abs(Math.hypot(q.x - ux, q.y - uy) - r) > Math.max(r * 4e-3, 1e-6)) return null; }
      const a0 = Math.atan2(ay - uy, ax - ux), am = Math.atan2(by - uy, bx - ux), a1 = Math.atan2(cy - uy, cx - ux); const nrm = a => { while(a <= -Math.PI) a += TAU; while(a > Math.PI) a -= TAU; return a; };
      const s1 = nrm(am - a0), s2 = nrm(a1 - am); if(Math.sign(s1) !== Math.sign(s2)) return null; const sw = s1 + s2; if(Math.abs(sw) < 1e-6 || Math.abs(sw) > Math.PI * 1.01) return null; return Math.tan(sw / 4); };
    const addCurve = (p0, p1, p2, p3) => { const b = opt.arcs !== false ? arcFit(p0, p1, p2, p3) : null; if(b != null){ p0.bulge = b; curS.pts.push(p3); } else curS.pts.push(...bez(p0, p1, p2, p3, 8)); };
    let ctm = [1, 0, 0, 1, 0, 0]; const stack = []; let stroke = '#000000', fill = '#000000'; let subs = [], curS = null; const out = []; let nSkip = 0;
    const col = h => (!h || h === '#000000') ? '#ffffff' : h;
    const flush = (doStroke, doFill, evenOdd) => {
      const closedS = subs.filter(s => s.pts.length >= 3 || (s.pts.length >= 2 && s.pts.some(p => p.bulge)));
      if(doFill && opt.fill && closedS.length && out.length < opt.max){ const loops = closedS.map(s => flat(s.pts.map(map))); const e = { type: 'HATCH', loops, solid: true, col: col(fill), layer: 'PDF_Solid Fills' }; out.push(e); }
      if(doStroke || (doFill && !opt.fill)) for(const s of subs){ if(s.pts.length < 2) continue; if(out.length >= opt.max){ nSkip++; continue; } const v = s.pts.map(map);
        if(v.length === 2 && !v[0].bulge) out.push({ type: 'LINE', x1: v[0].x, y1: v[0].y, x2: v[1].x, y2: v[1].y, col: col(doStroke ? stroke : fill), layer: 'PDF_Geometry' });
        else out.push({ type: 'POLYLINE', vertices: v, closed: !!s.closed, col: col(doStroke ? stroke : fill), layer: 'PDF_Geometry' }); }
      subs = []; curS = null;
    };
    const bez = (p0, p1, p2, p3, n) => { const o = []; for(let i = 1; i <= n; i++){ const t = i / n, u = 1 - t; o.push({ x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }); } return o; };
    for(let i = 0; i < ol.fnArray.length; i++){
      const fn = ol.fnArray[i], args = ol.argsArray[i];
      if(fn === OPS.save) stack.push([ctm, stroke, fill]);
      else if(fn === OPS.restore){ const s = stack.pop(); if(s){ [ctm, stroke, fill] = s; } }
      else if(fn === OPS.transform) ctm = mul(ctm, args);
      else if(fn === OPS.setStrokeRGBColor) stroke = hexC(args) || stroke;
      else if(fn === OPS.setFillRGBColor) fill = hexC(args) || fill;
      else if(fn === OPS.setStrokeGray) stroke = hexC([args[0], args[0], args[0]]) || stroke;
      else if(fn === OPS.setFillGray) fill = hexC([args[0], args[0], args[0]]) || fill;
      else if(fn === OPS.constructPath){ const ops = args[0], co = args[1]; let j = 0;
        for(const op of ops){
          if(op === OPS.moveTo){ curS = { pts: [ap(ctm, co[j], co[j + 1])] }; subs.push(curS); j += 2; }
          else if(op === OPS.lineTo){ if(!curS){ curS = { pts: [] }; subs.push(curS); } curS.pts.push(ap(ctm, co[j], co[j + 1])); j += 2; }
          else if(op === OPS.curveTo){ const p0 = curS && curS.pts[curS.pts.length - 1]; const p1 = ap(ctm, co[j], co[j + 1]), p2 = ap(ctm, co[j + 2], co[j + 3]), p3 = ap(ctm, co[j + 4], co[j + 5]); j += 6; if(p0) addCurve(p0, p1, p2, p3); }
          else if(op === OPS.curveTo2){ const p0 = curS && curS.pts[curS.pts.length - 1]; const p2 = ap(ctm, co[j], co[j + 1]), p3 = ap(ctm, co[j + 2], co[j + 3]); j += 4; if(p0) addCurve(p0, p0, p2, p3); }
          else if(op === OPS.curveTo3){ const p0 = curS && curS.pts[curS.pts.length - 1]; const p1 = ap(ctm, co[j], co[j + 1]), p3 = ap(ctm, co[j + 2], co[j + 3]); j += 4; if(p0) addCurve(p0, p1, p3, p3); }
          else if(op === OPS.closePath){ if(curS){ curS.closed = true; const f = curS.pts[0]; curS = { pts: [{ x: f.x, y: f.y }] }; subs.push(curS); } }
          else if(op === OPS.rectangle){ const x = co[j], y = co[j + 1], w = co[j + 2], h = co[j + 3]; j += 4; subs.push({ pts: [ap(ctm, x, y), ap(ctm, x + w, y), ap(ctm, x + w, y + h), ap(ctm, x, y + h)], closed: true }); curS = null; }
        }
      }
      else if(fn === OPS.stroke || fn === OPS.closeStroke){ if(fn === OPS.closeStroke && subs.length) subs[subs.length - 1].closed = true; flush(true, false); }
      else if(fn === OPS.fill || fn === OPS.eoFill) flush(false, true, fn === OPS.eoFill);
      else if(fn === OPS.fillStroke || fn === OPS.eoFillStroke || fn === OPS.closeFillStroke || fn === OPS.closeEOFillStroke) flush(true, true);
      else if(fn === OPS.endPath){ subs = []; curS = null; }
    }
    // gộp: bỏ đa tuyến chỉ còn 1 điểm, sửa đa tuyến kín trùng điểm đầu
    for(const e of out) if(e.type === 'POLYLINE'){ const v = e.vertices; if(v.length > 2 && Math.hypot(v[0].x - v[v.length - 1].x, v[0].y - v[v.length - 1].y) < 1e-7 * Math.max(1, Math.abs(v[0].x) + Math.abs(v[0].y))){ v.pop(); e.closed = true; } }
    // gộp các cung liền nhau cùng tâm; đa tuyến toàn cung cùng tâm → CIRCLE / ARC
    let nArc = 0;
    const segArc = (a, b) => { const th = 4 * Math.atan(a.bulge), ch = Math.hypot(b.x - a.x, b.y - a.y); if(ch < 1e-12) return null; const r = ch / (2 * Math.abs(Math.sin(th / 2))); const h = r * Math.cos(th / 2) * Math.sign(a.bulge); const nx = -(b.y - a.y) / ch, ny = (b.x - a.x) / ch; return { x: (a.x + b.x) / 2 + nx * h, y: (a.y + b.y) / 2 + ny * h, r, th }; };
    const sameC = (p, q) => p && q && Math.sign(p.th) === Math.sign(q.th) && Math.hypot(p.x - q.x, p.y - q.y) <= Math.max(p.r, q.r) * 0.01 && Math.abs(p.r - q.r) <= Math.max(p.r, q.r) * 0.01;
    for(let i = 0; i < out.length; i++){ const e = out[i]; if(e.type !== 'POLYLINE' || !e.vertices.some(v => v.bulge)) continue; const v = e.vertices; const n = v.length, nSeg = e.closed ? n : n - 1;
      const S = []; for(let j = 0; j < nSeg; j++){ const a = v[j], b = v[(j + 1) % n]; S.push(a.bulge ? segArc(a, b) : null); }
      // toàn bộ là cung cùng tâm?
      if(S.every(x => x) && S.every(x => sameC(x, S[0]))){ let sw = 0, cx = 0, cy = 0; for(const x of S){ sw += x.th; cx += x.x * Math.abs(x.th); cy += x.y * Math.abs(x.th); } const tw = S.reduce((t, x) => t + Math.abs(x.th), 0); cx /= tw; cy /= tw; let r = 0; for(const p of v) r += Math.hypot(p.x - cx, p.y - cy); r /= n; const base = { col: e.col, layer: e.layer };
        if(e.closed && Math.abs(Math.abs(sw) - TAU) < 0.05){ out[i] = Object.assign({ type: 'CIRCLE', cx, cy, r }, base); nArc++; continue; }
        if(!e.closed && Math.abs(sw) < TAU - 1e-3){ let a1 = Math.atan2(v[0].y - cy, v[0].x - cx) * R2D, a2 = Math.atan2(v[n - 1].y - cy, v[n - 1].x - cx) * R2D; if(sw < 0){ const t = a1; a1 = a2; a2 = t; } out[i] = Object.assign({ type: 'ARC', cx, cy, r, a1: (a1 + 360) % 360, a2: (a2 + 360) % 360 }, base); nArc++; continue; } }
      // gộp cung liền kề cùng tâm (bo góc, cung nhiều đoạn)
      const nv = [Object.assign({}, v[0])]; let acc = S[0], accSw = S[0] ? S[0].th : 0;
      for(let j = 1; j < nSeg; j++){ const sj = S[j]; if(acc && sj && sameC(acc, sj) && Math.abs(accSw + sj.th) < Math.PI * 1.5){ accSw += sj.th; continue; }
        if(acc) nv[nv.length - 1].bulge = Math.tan(accSw / 4); else delete nv[nv.length - 1].bulge; nv.push(Object.assign({}, v[j])); acc = sj; accSw = sj ? sj.th : 0; }
      if(acc) nv[nv.length - 1].bulge = Math.tan(accSw / 4); else delete nv[nv.length - 1].bulge;
      if(!e.closed){ const last = Object.assign({}, v[n - 1]); delete last.bulge; nv.push(last); }
      if(nv.length < v.length){ e.vertices = nv; nArc++; } }
    for(const e of out) if(e.type === 'POLYLINE' && e.vertices.some(v => v.bulge) && A.setBV) A.setBV(e, e.vertices);
    if(opt.text){ const tc = await page.getTextContent(); for(const it of tc.items){ if(!it.str || !it.str.trim()) continue; const t = it.transform; const h = Math.hypot(t[2], t[3]) * k; const p = map({ x: t[4], y: t[5] }); const rot = Math.atan2(t[1], t[0]) * R2D; out.push({ type: 'TEXT', x: p.x, y: p.y, h: Math.max(h * 0.75, 1e-6), rot: Math.abs(rot) < 1e-6 ? 0 : rot, text: it.str, layer: 'PDF_Text', col: '#ffffff' }); } }
    return { ents: out, pages: doc.numPages, skipped: nSkip, arcs: nArc, size: [(vb[2] - vb[0]) * k, (vb[3] - vb[1]) * k], page, vb };
  }
  A.pdfToEnts = pdfToEnts;
  async function pdfImport(file){
    const data = new Uint8Array(await file.arrayBuffer());
    const L = await loadPdfJs().catch(err => { say(err.message); return null; }); if(!L) return;
    let pages = 1; try{ const d = await L.getDocument({ data: data.slice(0), isEvalSupported: false }).promise; pages = d.numPages; }catch(err){ say('Không đọc được PDF.'); return; }
    let pg = 1; if(pages > 1){ const r = await A.getNum('Trang cần nhập (1–' + pages + ')', { def: 1 }); pg = Math.max(1, Math.min(pages, Math.round(r.num || 1))); }
    const s = await A.getNum('Tỉ lệ bản vẽ trong PDF 1:N, nhập N (1 = đúng kích thước giấy)', { def: annoN() }); const N = s.num > 0 ? s.num : annoN();
    const k = (25.4 / 72) * N / unitMM();
    const o = await A.getKw('Nhập', { kw: [{ k: 'T', t: 'Nét + chữ + vùng tô' }, { k: 'N', t: 'Chỉ nét + chữ' }, { k: 'G', t: 'Chỉ nét' }, { k: 'A', t: 'Ảnh (bản quét)' }], def: 'Nét + chữ + vùng tô' });
    if(o.kw === 'A') return pdfRaster(data, pg, k);
    log('PDFIMPORT: đang đọc trang ' + pg + '…');
    let R; try{ R = await pdfToEnts(data, pg, { k, fill: !o.kw || o.kw === 'T', text: o.kw !== 'G', max: 200000 }); }catch(err){ console.error(err); say('Lỗi đọc PDF: ' + err.message); return; }
    if(!R.ents.filter(e => e.type !== 'TEXT').length){ log('Trang PDF không có nét vector (bản quét) → chèn trang thành ảnh nền.'); return pdfRaster(data, pg, k); }
    let mn = { x: Infinity, y: Infinity }; for(const e of R.ents){ const b = entBBox(e); if(b){ mn.x = Math.min(mn.x, b.x0); mn.y = Math.min(mn.y, b.y0); } }
    const p = await A.getPoint('Điểm chèn (góc dưới trái) <0,0>', { rubber: false }); const ins = p.pt || { x: 0, y: 0 };
    const dx = ins.x - (isFinite(mn.x) ? mn.x : 0), dy = ins.y - (isFinite(mn.y) ? mn.y : 0);
    for(const ly of ['PDF_Geometry', 'PDF_Text', 'PDF_Solid Fills']) if(R.ents.some(e => e.layer === ly)) A.addLayer(ly);
    const add = R.ents.map(e => { A.xformEnt(e, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }); return e; });
    A.commit({ add }, 'PDFIMPORT: ' + add.length + ' đối tượng từ trang ' + pg + (R.arcs ? ', ' + R.arcs + ' cung/đường tròn' : '') + (R.skipped ? ' (bỏ ' + R.skipped + ' do quá nhiều)' : ''));
    try{ A.pushView && A.pushView(); fitView(); }catch(_){}
  }
  A.pdfImport = pdfImport;
  // PDF quét (không có nét vector): kết xuất trang thành ảnh nền đúng tỉ lệ
  async function pdfRaster(data, pg, k, pt){
    const L = await loadPdfJs(); const doc = await L.getDocument({ data: data.slice ? data.slice(0) : data, isEvalSupported: false }).promise; const page = await doc.getPage(pg);
    const vb = page.view; const wPt = vb[2] - vb[0], hPt = vb[3] - vb[1]; const dpi = Math.min(200, Math.floor(Math.sqrt(24e6 / (wPt * hPt / 5184)))); const vp = page.getViewport({ scale: dpi / 72 });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
    log('PDFIMPORT: đang kết xuất trang ' + pg + ' (' + dpi + ' dpi)…'); await page.render({ canvasContext: cx, viewport: vp }).promise;
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); if(!blob || !A.imgAdd){ say('Không tạo được ảnh.'); return; }
    const im = await A.imgAdd(blob, 'pdf-trang-' + pg + '.png');
    let ins = pt; if(!ins){ const p = await A.getPoint('Điểm chèn (góc dưới trái) <0,0>', { rubber: false }); ins = p.pt || { x: 0, y: 0 }; }
    const e = A.newProps({ type: 'IMAGE', x: ins.x, y: ins.y, w: wPt * k, h: hPt * k, rot: 0, img: im.id, name: im.name, op: 1 }); delete e.lt;
    A.commit({ add: [e] }, 'PDFIMPORT: chèn trang ' + pg + ' thành ảnh ' + c.width + '×' + c.height + ' px'); try{ fitView(); }catch(_){} return e;
  }
  A.pdfRaster = pdfRaster;
  plain(['PDFIMPORT', 'PDFATTACH', 'NHAPPDF'], 'Nhập bản vẽ PDF vector thành nét, chữ, vùng tô (lớp PDF_Geometry / PDF_Text)', () => pick('.pdf').then(f => f && A.run('PDFIMPORT', () => pdfImport(f))));

  // phím tắt như AutoCAD
  window.addEventListener('keydown', e => { if(!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return; const t = e.target; if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; if(!document.documentElement.classList.contains('acad')) return;
    if(e.key === '3'){ e.preventDefault(); toolPalettes(); } else if(e.key === '2'){ e.preventDefault(); DVDCmd.run('ADCENTER'); } }, true);
  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
