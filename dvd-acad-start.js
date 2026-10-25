/* DVDCAD — trang Bắt đầu (tab Start) kiểu AutoCAD (v5i)
   • Tab "Bắt đầu" là một trang riêng như AutoCAD: ẩn ribbon, bên trái Bản vẽ mới (chọn mẫu đơn vị) / Mở / Drive / Bản vẽ mẫu,
     giữa là danh sách bản vẽ gần đây dạng lưới (ảnh thu nhỏ) hoặc danh sách, tìm theo tên, sắp xếp, ghim.
   • Tự hiện khi chưa mở bản vẽ nào (chế độ máy tính); mở / chuyển sang bản vẽ thì trang tự ẩn.
   • Bản Windows (dvd-desktop.js): gần đây theo đường dẫn file (cả file lớn), mở thư mục chứa file.
     Bản web: gần đây lấy từ bộ nhớ của app (IndexedDB, file <= 2 MB). */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._start || !window.DVDCmd) return; A._start = true;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const desk = () => { try{ return A.deskUI(); }catch(_){ return false; } };
  const ico = k => (A.ico ? A.ico(k) : '');
  const DK = () => window.DVDDesktop || null;
  const deacc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const lsGet = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(_){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(_){ return false; } };
  const html = document.documentElement;

  /* ---------------- ảnh thu nhỏ (chụp khung vẽ khi mở / trước khi về trang Bắt đầu) ---------------- */
  const TH_KEY = 'dvd:thumbs', TH_MAX = 24;   // ~15 KB / ảnh: chừa chỗ localStorage cho dữ liệu khác của app
  const pathOf = new Map();   // khoá bản vẽ → đường dẫn file (bản Windows)
  function curKey(){ try{ return typeof baseKey === 'string' ? baseKey : null; }catch(_){ return null; } }
  function capture(extra){
    try{
      if(!A.hasDoc() || html.classList.contains('acad-start')) return;
      const cv = $('cv'); if(!cv || !cv.width || !cv.height) return;
      const k = curKey(); if(!k) return;
      const ids = [k, pathOf.get(k)];
      if(typeof extra === 'string'){ ids.push(extra); pathOf.set(k, extra); }   // Lưu thành: file mới cũng có ảnh
      const W = 256, H = 160, c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const bg = getComputedStyle(cv.parentNode || cv).backgroundColor;
      g.fillStyle = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#212830'; g.fillRect(0, 0, W, H);
      const s = Math.max(W / cv.width, H / cv.height), w = cv.width * s, h = cv.height * s;
      g.drawImage(cv, (W - w) / 2, (H - h) / 2, w, h);
      const url = c.toDataURL('image/jpeg', 0.7);
      const m = lsGet(TH_KEY, {}); const t = Date.now();
      for(const id of ids) if(id) m[id] = { d: url, t };
      const ks = Object.keys(m).sort((a, b) => (m[b].t || 0) - (m[a].t || 0));
      for(const x of ks.slice(TH_MAX)) delete m[x];
      if(!lsSet(TH_KEY, m)){ for(const x of ks.slice(TH_MAX / 2)) delete m[x]; lsSet(TH_KEY, m); }
    }catch(_){}
  }

  A.captureThumb = capture;
  // chụp bản vẽ đang xem trước khi mở / chuyển sang bản vẽ khác (khung vẽ còn hình cũ)
  for(const fn of ['loadDXF', 'loadDWG']){ const f0 = window[fn]; if(typeof f0 === 'function') window[fn] = function(){ capture(); return f0.apply(this, arguments); }; }

  /* ---------------- danh sách gần đây ---------------- */
  const PIN_KEY = 'dvd:startpins';
  const pins = () => new Set(lsGet(PIN_KEY, []));
  function togglePin(id){ const s = pins(); if(s.has(id)) s.delete(id); else s.add(id); lsSet(PIN_KEY, [...s]); render(); }
  async function items(){
    const out = [], names = new Set(), dk = DK();
    if(dk){ try{ for(const r of await dk.recentList()){ out.push({ id: r.path, path: r.path, name: r.name, size: r.size, time: r.time, exists: r.exists }); names.add(r.name.toLowerCase()); } }catch(_){} }
    let all = []; try{ all = typeof idbAll === 'function' ? await idbAll() : []; }catch(_){}
    for(const f of all){
      if(!f || !f.name || names.has(String(f.name).toLowerCase())) continue;
      const n = f.data ? (f.data.byteLength != null ? f.data.byteLength : f.data.length) : 0;
      out.push({ id: f.key, rec: f, name: f.name, size: n || 0, time: f.savedAt || 0, exists: true, drive: !!f.gd });
    }
    return out;
  }
  const fmtSize = n => !n ? '' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const ago = t => { try{ return fmtAgo(t); }catch(_){ return new Date(t).toLocaleString(); } };
  const dirOf = p => String(p || '').replace(/[\\/][^\\/]*$/, '');
  const extOf = n => (String(n).match(/\.(\w+)$/) || ['', ''])[1].toUpperCase();

  /* ---------------- giao diện ---------------- */
  const css = document.createElement('style'); css.textContent = `
  html.acad.acad-start .ac-tabs,html.acad.acad-start .ac-ribbon{display:none !important}
  #dvdStart{display:none}
  html.acad.acad-start #dvdStart{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:40;background:#1b1f26;color:#e6eaf0;font:13px system-ui,"Segoe UI",sans-serif}
  html.acad.acad-start #acStart{background:#1b1f26;color:#fff;border-top:2px solid #3d9ae8}
  html.acad.acad-start #acadFile .ft.doc.on{background:#2b313b;color:#e6eaf0;border-top:1px solid #3a414d}
  #dvdStart .st-side{width:250px;flex:0 0 auto;background:#15181e;border-right:1px solid #2b313b;padding:22px 18px;display:flex;flex-direction:column;gap:8px;overflow:auto}
  #dvdStart .st-brand{display:flex;align-items:center;gap:10px;margin:0 0 18px}
  #dvdStart .st-brand img{width:38px;height:38px;border-radius:8px}
  #dvdStart .st-brand b{font-size:19px;letter-spacing:.5px;display:block}
  #dvdStart .st-brand small{color:#8f99a8;font-size:11.5px}
  #dvdStart .st-btn{display:flex;align-items:center;gap:10px;width:100%;height:36px;padding:0 12px;border:1px solid #3a414d;border-radius:4px;background:#232832;color:#e6eaf0;font:500 13px system-ui,"Segoe UI",sans-serif;cursor:pointer;text-align:left}
  #dvdStart .st-btn:hover{background:#2d3440;border-color:#4a5463}
  #dvdStart .st-btn svg{width:18px;height:18px;flex:0 0 auto}
  #dvdStart .st-new{display:flex;gap:1px}
  #dvdStart .st-new .st-btn{background:#0d6fd1;border-color:#0d6fd1;color:#fff;font-weight:600}
  #dvdStart .st-new .st-btn:hover{background:#1a7fe3}
  #dvdStart .st-new .st-btn:first-child{border-radius:4px 0 0 4px}
  #dvdStart .st-new .st-dd{width:34px;flex:0 0 auto;justify-content:center;border-radius:0 4px 4px 0;padding:0}
  #dvdStart .st-sec{margin:20px 0 4px;font-size:11px;font-weight:700;letter-spacing:.8px;color:#7c8696}
  #dvdStart .st-link{color:#9cc8f5;cursor:pointer;padding:4px 2px;font-size:12.5px;background:none;border:none;text-align:left;font-family:inherit}
  #dvdStart .st-link:hover{color:#fff;text-decoration:underline}
  #dvdStart .st-foot{margin-top:auto;padding-top:16px;color:#7c8696;font-size:11.5px;line-height:1.5}
  #dvdStart .st-foot i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:6px;font-style:normal}
  #dvdStart .st-main{flex:1;min-width:0;display:flex;flex-direction:column;padding:22px 28px 0}
  #dvdStart .st-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
  #dvdStart .st-head h2{font-size:20px;font-weight:600;margin:0 16px 0 0}
  #dvdStart .st-head input,#dvdStart .st-head select{height:30px;background:#232832;border:1px solid #3a414d;border-radius:4px;color:#e6eaf0;padding:0 10px;font:13px system-ui,"Segoe UI",sans-serif}
  #dvdStart .st-head input{width:260px}
  #dvdStart .st-head .sp{flex:1}
  #dvdStart .st-vw{display:flex;border:1px solid #3a414d;border-radius:4px;overflow:hidden}
  #dvdStart .st-vw button{width:32px;height:28px;border:none;background:#232832;color:#aab3c0;cursor:pointer;font-size:15px}
  #dvdStart .st-vw button.on{background:#3d9ae8;color:#fff}
  #dvdStart .st-list{flex:1;overflow:auto;padding-bottom:24px}
  #dvdStart .st-list.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;align-content:start}
  #dvdStart .st-card{position:relative;background:#232832;border:1px solid #2f3642;border-radius:6px;overflow:hidden;cursor:pointer}
  #dvdStart .st-card:hover{border-color:#3d9ae8;box-shadow:0 0 0 1px #3d9ae8}
  #dvdStart .st-card.miss{opacity:.55}
  #dvdStart .st-th{height:132px;background:#212830 center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:#5d6777;font-size:26px;font-weight:700;letter-spacing:1px}
  #dvdStart .st-info{padding:8px 10px 10px}
  #dvdStart .st-nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #dvdStart .st-meta{color:#8f99a8;font-size:11.5px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #dvdStart .st-tag{display:inline-block;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;margin-right:6px;background:#3a414d;color:#cfd6e0}
  #dvdStart .st-tag.dwg{background:#7a2626;color:#ffd2d2} #dvdStart .st-tag.dxf{background:#1d4f86;color:#d2e6ff}
  #dvdStart .st-acts{position:absolute;top:6px;right:6px;display:none;gap:4px}
  #dvdStart .st-card:hover .st-acts,#dvdStart .st-card .st-acts.pin{display:flex}
  #dvdStart .st-acts button{width:26px;height:26px;border-radius:4px;border:1px solid #3a414d;background:rgba(21,24,30,.88);color:#cfd6e0;cursor:pointer;font-size:13px;line-height:1}
  #dvdStart .st-acts button:hover{background:#3d9ae8;color:#fff}
  #dvdStart .st-acts button.pinned{color:#ffcf4a}
  #dvdStart .st-list.rows .st-card{display:flex;align-items:center;border-radius:4px;margin-bottom:4px}
  #dvdStart .st-list.rows .st-th{width:64px;height:40px;flex:0 0 auto;font-size:11px}
  #dvdStart .st-list.rows .st-info{flex:1;min-width:0;display:flex;align-items:center;gap:16px;padding:6px 110px 6px 12px}
  #dvdStart .st-list.rows .st-nm{flex:0 0 32%} #dvdStart .st-list.rows .st-meta{margin:0}
  #dvdStart .st-list.rows .st-acts{top:50%;transform:translateY(-50%)}
  #dvdStart .st-empty{color:#8f99a8;padding:50px 10px;text-align:center;line-height:1.7}
  #dvdStart .st-empty b{display:block;color:#e6eaf0;font-size:16px;margin-bottom:4px}`;
  document.head.appendChild(css);

  const page = document.createElement('div'); page.id = 'dvdStart';
  page.innerHTML =
    '<aside class="st-side">' +
      '<div class="st-brand"><img src="./icon-192.png" alt=""><div><b translate="no">DVDCAD</b><small id="stVer">Bản vẽ DWG / DXF</small></div></div>' +
      '<div class="st-new"><button class="st-btn" data-a="new" title="Bản vẽ mới theo mẫu mặc định (Ctrl+N)">' + ico('NEW') + '<span>Bản vẽ mới</span></button><button class="st-btn st-dd" data-a="newmenu" title="Chọn mẫu bản vẽ">▾</button></div>' +
      '<button class="st-btn" data-a="open" title="Mở bản vẽ (Ctrl+O)">' + ico('OPEN') + '<span>Mở…</span></button>' +
      '<button class="st-btn" data-a="drive" id="stDrive">' + ico('DRIVE') + '<span>Mở từ Google Drive</span></button>' +
      '<button class="st-btn" data-a="sample">' + ico('INSERT') + '<span>Bản vẽ mẫu</span></button>' +
      '<div class="st-sec">TÌM HIỂU</div>' +
      '<button class="st-link" data-a="help">Danh sách lệnh và phím tắt (F1)</button>' +
      '<button class="st-link" data-a="guide">Hướng dẫn dùng các lệnh</button>' +
      '<button class="st-link" data-a="addin">Viết add-in AutoLISP / JavaScript</button>' +
      '<div class="st-foot"><i></i><span id="stOff">Chạy offline · bản vẽ nằm trên máy này</span></div>' +
    '</aside>' +
    '<main class="st-main">' +
      '<div class="st-head"><h2>Gần đây</h2><input id="stQ" type="search" placeholder="Tìm bản vẽ gần đây" autocomplete="off"><span class="sp"></span>' +
        '<select id="stSort" title="Sắp xếp"><option value="time">Mở gần nhất</option><option value="name">Tên</option><option value="size">Dung lượng</option></select>' +
        '<div class="st-vw"><button data-v="grid" title="Lưới ảnh thu nhỏ">▦</button><button data-v="rows" title="Danh sách">☰</button></div></div>' +
      '<div class="st-list grid" id="stList"></div>' +
    '</main>';
  document.body.appendChild(page);

  let shown = false, capT = 0, list = [], view = lsGet('dvd:startview', 'grid'), sort = lsGet('dvd:startsort', 'time');
  $('stSort').value = sort;
  function place(){ const fb = $('acadFile'); page.style.top = (fb ? Math.max(0, fb.getBoundingClientRect().bottom) : 0) + 'px'; }
  const relayout = () => setTimeout(() => { try{ resize(); }catch(_){} }, 20);

  async function render(){
    const box = $('stList'); if(!box) return;
    list = await items();
    const q = deacc($('stQ').value.trim()), P = pins();
    let L = list.filter(x => !q || deacc(x.name + ' ' + (x.path || '')).includes(q));
    const by = { time: (a, b) => (b.time || 0) - (a.time || 0), name: (a, b) => a.name.localeCompare(b.name), size: (a, b) => (b.size || 0) - (a.size || 0) }[sort] || (() => 0);
    L.sort((a, b) => (P.has(b.id) - P.has(a.id)) || by(a, b));
    box.className = 'st-list ' + (view === 'rows' ? 'rows' : 'grid');
    page.querySelectorAll('.st-vw button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    if(!L.length){
      box.innerHTML = '<div class="st-empty"><b>' + (q ? 'Không có bản vẽ nào khớp' : 'Chưa có bản vẽ gần đây') + '</b>' + (q ? '' : '<span>Tạo bản vẽ mới, mở file có sẵn, hoặc kéo thả file .dwg / .dxf vào đây.</span>') + '</div>';
      return;
    }
    const T = lsGet(TH_KEY, {});
    box.innerHTML = L.map(x => {
      const i = list.indexOf(x), ext = extOf(x.name), th = T[x.id] && T[x.id].d, pin = P.has(x.id);
      const where = x.path ? dirOf(x.path) : x.drive ? 'Google Drive' : 'Lưu trong app';
      return '<div class="st-card' + (x.exists ? '' : ' miss') + '" data-i="' + i + '" title="' + esc(x.path || x.name) + '">' +
        '<div class="st-th"' + (th ? ' style="background-image:url(' + th + ')"' : '') + '>' + (th ? '' : esc(ext)) + '</div>' +
        '<div class="st-info"><div class="st-nm" translate="no">' + esc(x.name) + '</div>' +
        '<div class="st-meta"><span class="st-tag ' + ext.toLowerCase() + '">' + esc(ext) + '</span>' + esc(ago(x.time)) + (x.size ? ' · ' + fmtSize(x.size) : '') + '</div>' +
        '<div class="st-meta" translate="no">' + esc(x.exists ? where : 'Không tìm thấy file') + '</div></div>' +
        '<div class="st-acts' + (pin ? ' pin' : '') + '"><button data-c="pin" class="' + (pin ? 'pinned' : '') + '" title="' + (pin ? 'Bỏ ghim' : 'Ghim lên đầu') + '">★</button><button data-c="more" title="Tuỳ chọn">⋯</button></div></div>';
    }).join('');
  }

  function openItem(x){
    if(!x) return;
    if(x.path){
      if(!x.exists){ say('Không tìm thấy file ở đường dẫn cũ: ' + x.path); return; }
      DK().openPath(x.path, x.name);
    }else if(x.rec){ try{ window.openRecent(x.rec); }catch(err){ say('Không mở lại được file này.'); } }
  }
  async function removeItem(x){
    if(x.path){ try{ await DK().recentRemove(x.path); }catch(_){} }
    else if(x.rec && typeof idbDel === 'function'){ await idbDel(x.rec.key); }
    render();
  }
  function cardMenu(x, ev){
    const r = ev && ev.currentTarget ? ev.currentTarget.getBoundingClientRect() : null;
    const it = [];
    if(x.exists) it.push({ t: 'Mở', ic: 'OPEN', fn: () => openItem(x) });
    it.push({ t: pins().has(x.id) ? 'Bỏ ghim' : 'Ghim lên đầu', fn: () => togglePin(x.id) });
    if(x.path && x.exists) it.push({ t: 'Mở thư mục chứa file', fn: () => DK().reveal(x.path) });
    it.push({ sep: 1 }, { t: 'Xoá khỏi danh sách', fn: () => removeItem(x) });
    const px = ev && ev.clientX != null && ev.type === 'contextmenu' ? ev.clientX : r ? r.left : innerWidth / 2, py = ev && ev.type === 'contextmenu' ? ev.clientY : r ? r.bottom + 2 : innerHeight / 2;
    A.menu(px, py, it);
  }
  function newMenu(ev){
    const r = ev.currentTarget.getBoundingClientRect();
    A.menu(r.left - 180, r.bottom + 2, [{ hd: 'MẪU BẢN VẼ' },
      { t: 'Hệ mét — milimét (acadiso)', ic: 'NEW', fn: () => A.newDrawing({ units: 4 }) },
      { t: 'Hệ mét — mét', ic: 'NEW', fn: () => A.newDrawing({ units: 6 }) },
      { t: 'Hệ inch (acad)', ic: 'NEW', fn: () => A.newDrawing({ units: 1 }) }]);
  }
  const ACTS = {
    new: () => A.newDrawing(),
    newmenu: newMenu,
    open: () => { const b = $('openBtn'); if(b) b.click(); },
    drive: () => { if(window.DVDCloud) DVDCloud.openFromDrive(); },
    sample: () => { try{ loadSample(); }catch(_){} },
    help: () => DVDCmd.showHelp(),
    guide: () => { try{ window.open('./HUONG-DAN-LENH.md', '_blank'); }catch(_){} },
    addin: () => { try{ window.open('./ADDIN-API.md', '_blank'); }catch(_){} }
  };
  page.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if(a && ACTS[a.dataset.a]){ ACTS[a.dataset.a]({ currentTarget: a }); return; }
    const v = e.target.closest('.st-vw [data-v]'); if(v){ view = v.dataset.v; lsSet('dvd:startview', view); render(); return; }
    const card = e.target.closest('.st-card'); if(!card) return;
    const x = list[+card.dataset.i]; const c = e.target.closest('[data-c]');
    if(c){ e.stopPropagation(); if(c.dataset.c === 'pin') togglePin(x.id); else cardMenu(x, { currentTarget: c }); return; }
    openItem(x);
  });
  page.addEventListener('contextmenu', e => { const card = e.target.closest('.st-card'); if(!card) return; e.preventDefault(); cardMenu(list[+card.dataset.i], e); });
  $('stQ').addEventListener('input', () => render());
  $('stSort').addEventListener('change', e => { sort = e.target.value; lsSet('dvd:startsort', sort); render(); });

  /* ---------------- hiện / ẩn ---------------- */
  function show(){
    if(!desk()) return;
    capture();
    shown = true; html.classList.add('acad-start'); place();
    const drv = $('stDrive'); if(drv) drv.style.display = (window.DVDCloud && DVDCloud.cfgOk && DVDCloud.cfgOk()) ? '' : 'none';
    try{ if(A.busy()) A.cancel(true); }catch(_){}
    render(); relayout();
  }
  function hide(){ if(!shown) return; shown = false; html.classList.remove('acad-start'); relayout(); }
  A.showStart = show; A.hideStart = hide; A.startShown = () => shown;
  const st = $('acStart'); if(st){ st.onclick = show; st.title = 'Trang bắt đầu'; }
  // bấm tab bản vẽ (không phải dấu ×) → về bản vẽ đó
  const bar = $('acadFile'); if(bar) bar.addEventListener('click', e => { if(e.target.closest('.ft.doc') && !e.target.closest('.x')) hide(); }, true);
  A.onLoad = (prev => function(){
    if(prev) prev.apply(this, arguments);
    const p = window.__dvdCurPath, k = curKey(); window.__dvdCurPath = null;
    if(p && k) pathOf.set(k, p);
    if(A.hasDoc()) hide();
    clearTimeout(capT); capT = setTimeout(capture, 1500);
  })(A.onLoad);
  // đang ở trang Bắt đầu: phím chữ không chạy lệnh vẽ (chỉ Ctrl+…, F1…)
  window.addEventListener('keydown', e => {
    if(!shown) return; const t = e.target, tag = t && t.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable) || document.querySelector('.overlay.show')) return;
    if(!e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace')){ e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('resize', () => { if(shown){ if(!desk()) hide(); else place(); } else if(!A.hasDoc() && desk()) show(); });
  if(DK() && DK().info) DK().info().then(i => { const v = $('stVer'); if(v && i) v.textContent = 'Windows · phiên bản ' + i.version; }).catch(() => {});
  setTimeout(() => { if(!A.hasDoc()) show(); }, 0);
})();
