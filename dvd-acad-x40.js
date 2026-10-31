/* DVDCAD v6o — xuất 3D để chia sẻ và hoàn thiện hình chiếu (Model Documentation)
   · 3DDWF: xuất mô hình 3D để xem / chia sẻ — glTF nhị phân (.glb, mở bằng Windows 3D Viewer, Blender, trình xem web…) hoặc
     trang .html tự chứa có trình xem 3D xoay / phóng (không cần cài gì). DWF 3D gốc của Autodesk dùng định dạng HOOPS W3D không công bố.
   · VIEWCOMPONENT: chọn một thành phần (khối 3D) trên hình chiếu → tham gia mặt cắt: Không (không bị cắt, vẽ nguyên khối) /
     Cắt (mặc định) / Lát (chỉ còn mặt cắt, không có phần phía sau) — mặt cắt dựng lại ngay
   · VIEWSYMBOLSKETCH / VIEWSKETCHCLOSE: sửa ký hiệu mặt cắt (đường cắt) hoặc biên hình trích bằng nét phác (grip, lệnh sửa
     thường), đóng phác thảo → hình chiếu dựng lại theo
   · VIEWSETPROJ: chọn tệp dự án Inventor (.ipj) — ghi nhớ thư mục làm việc / thư viện (DVDCAD chiếu khối 3D trong bản vẽ) */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x40 || !window.DVDCmd) return; A._x40 = true;
  const log = m => A.log(m), say = m => { try{ toast(m); }catch(_){ log(m); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const plain = (keys, desc, fn) => DVDCmd.register(keys, desc, fn, {});
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const copy = e => { const w = JSON.parse(JSON.stringify(e)); delete w.userAdded; return w; };
  const LS = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(_){ return d; } };
  const SV = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const docBase = () => String((typeof currentName === 'string' && currentName) || 'banve').replace(/\.[^.]+$/, '');
  const uMM = () => { try{ return (typeof unitToMM === 'function' && unitToMM()) || 1; }catch(_){ return 1; } };
  const save = (blob, name, mime) => (typeof shareOrDownload === 'function' ? shareOrDownload(blob, name, mime) : Promise.resolve());
  const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res(i.files && i.files[0] || null); i.remove(); }; i.click(); });

  /* ===================== 3DDWF: glTF (.glb) / trang 3D (.html) ===================== */
  const is3D = e => e && (e.type === 'SOLID3D' || (e.type === 'SOLID' && e.face));
  function meshList(sel){ const out = []; for(const e of (sel || ME())){ if(!is3D(e)) continue; try{ if(A.isHiddenE && A.isHiddenE(e)) continue; }catch(_){} let m = null; try{ m = A.meshOf(e); }catch(_){} if(m && m.i && m.i.length) out.push({ e, m }); } return out; }
  const hex = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '')); return m ? m[1].toLowerCase() : 'cccccc'; };
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  // gom theo màu: mỗi màu một lưới; Z lên (CAD) → Y lên (glTF), đơn vị mét
  function groups(L, k){ const G = new Map();
    for(const { e, m } of L){ const col = hex(e.col); let g = G.get(col); if(!g){ g = { col, P: [], N: [], I: [] }; G.set(col, g); }
      const p = m.p, I = m.i, b0 = g.P.length / 3;
      if(m.smooth){ const n = new Float64Array(p.length); for(let t = 0; t + 2 < I.length; t += 3){ const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]; const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for(const q of [a, b, c]){ n[q] += nx; n[q + 1] += ny; n[q + 2] += nz; } }
        for(let q = 0; q < p.length; q += 3){ g.P.push(p[q] * k, p[q + 2] * k, -p[q + 1] * k); const L2 = Math.hypot(n[q], n[q + 1], n[q + 2]) || 1; g.N.push(n[q] / L2, n[q + 2] / L2, -n[q + 1] / L2); } for(const t of I) g.I.push(t + b0); }
      else for(let t = 0; t + 2 < I.length; t += 3){ const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L2 = Math.hypot(nx, ny, nz) || 1; nx /= L2; ny /= L2; nz /= L2;
        for(const q of [a, b, c]){ g.I.push(g.P.length / 3); g.P.push(p[q] * k, p[q + 2] * k, -p[q + 1] * k); g.N.push(nx, nz, -ny); } } }
    return [...G.values()]; }
  function glbOf(L, opt){ opt = opt || {}; const k = uMM() / 1000; const G = groups(L, k); if(!G.length) return null;
    const bins = [], J = { asset: { version: '2.0', generator: 'DVDCAD 3DDWF' }, scene: 0, scenes: [{ name: opt.name || 'DVDCAD', nodes: [0] }], nodes: [{ name: opt.name || 'DVDCAD', mesh: 0 }], meshes: [{ name: 'model', primitives: [] }], materials: [], accessors: [], bufferViews: [], buffers: [] };
    let off = 0; const view = (arr, target) => { const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (u8.length % 4)) % 4; bins.push(u8); if(pad) bins.push(new Uint8Array(pad)); J.bufferViews.push(Object.assign({ buffer: 0, byteOffset: off, byteLength: u8.length }, target ? { target } : {})); off += u8.length + pad; return J.bufferViews.length - 1; };
    for(const g of G){ const P = new Float32Array(g.P), N = new Float32Array(g.N), nv = P.length / 3, I = nv > 65535 ? new Uint32Array(g.I) : new Uint16Array(g.I);
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for(let i = 0; i < P.length; i += 3) for(let c = 0; c < 3; c++){ mn[c] = Math.min(mn[c], P[i + c]); mx[c] = Math.max(mx[c], P[i + c]); }
      const vp = view(P, 34962), vn = view(N, 34962), vi = view(I, 34963);
      J.accessors.push({ bufferView: vp, componentType: 5126, count: nv, type: 'VEC3', min: mn, max: mx }); const ap = J.accessors.length - 1;
      J.accessors.push({ bufferView: vn, componentType: 5126, count: nv, type: 'VEC3' }); const an = J.accessors.length - 1;
      J.accessors.push({ bufferView: vi, componentType: nv > 65535 ? 5125 : 5123, count: I.length, type: 'SCALAR' }); const ai = J.accessors.length - 1;
      const c = parseInt(g.col, 16); J.materials.push({ name: '#' + g.col, doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [lin(c >> 16 & 255), lin(c >> 8 & 255), lin(c & 255), 1], metallicFactor: 0, roughnessFactor: 0.75 } });
      J.meshes[0].primitives.push({ attributes: { POSITION: ap, NORMAL: an }, indices: ai, material: J.materials.length - 1, mode: 4 }); }
    J.buffers.push({ byteLength: off });
    let js = new TextEncoder().encode(JSON.stringify(J)); const jp = (4 - js.length % 4) % 4; if(jp){ const t = new Uint8Array(js.length + jp); t.set(js); t.fill(0x20, js.length); js = t; }
    const total = 12 + 8 + js.length + 8 + off, out = new Uint8Array(total), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, js.length, true); dv.setUint32(16, 0x4E4F534A, true); out.set(js, 20);
    let o = 20 + js.length; dv.setUint32(o, off, true); dv.setUint32(o + 4, 0x004E4942, true); o += 8; for(const b of bins){ out.set(b, o); o += b.length; }
    return { glb: out, json: J, tris: G.reduce((s, g) => s + g.I.length / 3, 0), groups: G.length };
  }
  A.glbOf = glbOf;
  // đọc lại .glb (để kiểm tra): trả { json, bin }
  A.glbParse = u8 => { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); if(dv.getUint32(0, true) !== 0x46546C67) return null; const jl = dv.getUint32(12, true); const json = JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + jl))); const bl = dv.getUint32(20 + jl, true); return { json, bin: u8.subarray(28 + jl, 28 + jl + bl) }; };
  const b64 = u8 => { let s = ''; for(let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  let threeSrc = null; async function threeJs(){ if(threeSrc) return threeSrc; const r = await fetch('./vendor/three.min.js'); if(!r.ok) throw new Error('Không đọc được vendor/three.min.js'); threeSrc = await r.text(); return threeSrc; }
  async function html3D(L, name){ const G = groups(L, 1); if(!G.length) return null; const T = await threeJs();
    const data = G.map(g => ({ c: g.col, p: b64(new Uint8Array(new Float32Array(g.P).buffer)), n: b64(new Uint8Array(new Float32Array(g.N).buffer)), i: b64(new Uint8Array(new Uint32Array(g.I).buffer)) }));
    const page = '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="DVDCAD 3DDWF"><title>' + esc(name) + '</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#3a4150;font:13px system-ui,sans-serif;color:#e8ecf2}#h{position:absolute;left:10px;top:8px;pointer-events:none}#h b{font-size:15px}#t{position:absolute;right:10px;top:8px;display:flex;gap:4px}#t button{background:#1d2128;color:#fff;border:1px solid #445;border-radius:4px;padding:4px 8px;cursor:pointer}canvas{display:block;touch-action:none}</style></head><body><div id="h"><b>' + esc(name) + '</b><br><small>Kéo trái: xoay · kéo phải / Shift: dời · lăn: phóng — DVDCAD</small></div><div id="t"><button data-v="iso">ISO</button><button data-v="top">Trên</button><button data-v="front">Trước</button><button data-v="right">Phải</button><button data-v="fit">Vừa khung</button><button data-v="edge">Cạnh</button></div>\n<script>' + T.replace(/<\/script/gi, '<\\/script') + '</' + 'script>\n<script>(function(){var D=' + JSON.stringify(data) + ';' +
      'function dec(s,C){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new C(u.buffer)}' +
      'var R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(window.devicePixelRatio||1);document.body.appendChild(R.domElement);var S=new THREE.Scene();S.background=new THREE.Color(0x3a4150);' +
      'S.add(new THREE.HemisphereLight(0xffffff,0x445566,0.9));var dl=new THREE.DirectionalLight(0xffffff,0.8);dl.position.set(1,2,1.5);S.add(dl);var root=new THREE.Group();S.add(root);var edges=[];' +
      'D.forEach(function(g){var G=new THREE.BufferGeometry();G.setAttribute("position",new THREE.BufferAttribute(dec(g.p,Float32Array),3));G.setAttribute("normal",new THREE.BufferAttribute(dec(g.n,Float32Array),3));G.setIndex(new THREE.BufferAttribute(dec(g.i,Uint32Array),1));' +
      'root.add(new THREE.Mesh(G,new THREE.MeshStandardMaterial({color:new THREE.Color("#"+g.c),roughness:.75,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));var E=new THREE.LineSegments(new THREE.EdgesGeometry(G,25),new THREE.LineBasicMaterial({color:0x111418}));edges.push(E);root.add(E)});' +
      'var bb=new THREE.Box3().setFromObject(root),c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()).length()||1;var cam=new THREE.PerspectiveCamera(40,1,sz/1000,sz*100);var st={az:-0.785,el:0.6,d:sz*1.6,t:c.clone()};' +
      'function place(){cam.position.set(st.t.x+st.d*Math.cos(st.el)*Math.sin(st.az),st.t.y+st.d*Math.sin(st.el),st.t.z+st.d*Math.cos(st.el)*Math.cos(st.az));cam.lookAt(st.t);R.render(S,cam)}' +
      'function size(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();place()}addEventListener("resize",size);size();' +
      'var dr=null;R.domElement.addEventListener("contextmenu",function(e){e.preventDefault()});R.domElement.addEventListener("pointerdown",function(e){dr={x:e.clientX,y:e.clientY,b:e.button,s:e.shiftKey};R.domElement.setPointerCapture(e.pointerId)});' +
      'R.domElement.addEventListener("pointermove",function(e){if(!dr)return;var dx=e.clientX-dr.x,dy=e.clientY-dr.y;dr.x=e.clientX;dr.y=e.clientY;if(dr.b===0&&!dr.s){st.az-=dx*0.008;st.el=Math.max(-1.55,Math.min(1.55,st.el+dy*0.008))}else{var k=st.d*0.0015,r=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),u=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,1);st.t.addScaledVector(r,-dx*k).addScaledVector(u,dy*k)}place()});' +
      'R.domElement.addEventListener("pointerup",function(){dr=null});R.domElement.addEventListener("wheel",function(e){e.preventDefault();st.d*=Math.pow(1.0015,e.deltaY);place()},{passive:false});' +
      'var V={iso:[-0.785,0.6],top:[0,1.5707],front:[0,0],right:[1.5707,0]};document.getElementById("t").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var v=b.dataset.v;if(v==="edge"){edges.forEach(function(x){x.visible=!x.visible})}else if(v==="fit"){st.t.copy(c);st.d=sz*1.6}else{st.az=V[v][0];st.el=V[v][1];st.t.copy(c);st.d=sz*1.6}place()});' +
      '})();</' + 'script></body></html>';
    return { html: page, tris: G.reduce((s, g) => s + g.I.length / 3, 0) };
  }
  A.html3D = html3D;
  async function export3D(fmt, sel){ const L = meshList(sel); if(!L.length){ log('3DDWF: bản vẽ chưa có khối 3D.'); return null; } const name = docBase();
    if(fmt === 'html'){ const r = await html3D(L, name); if(!r) return null; const blob = new Blob([r.html], { type: 'text/html' }); await save(blob, name + '_3d.html', 'text/html'); log('3DDWF: ' + name + '_3d.html — ' + L.length + ' khối, ' + r.tris + ' tam giác; mở bằng trình duyệt (xoay / phóng / dời).'); return r; }
    const r = glbOf(L, { name }); if(!r) return null; await save(new Blob([r.glb], { type: 'model/gltf-binary' }), name + '.glb', 'model/gltf-binary'); log('3DDWF: ' + name + '.glb — ' + L.length + ' khối, ' + r.tris + ' tam giác, ' + r.groups + ' vật liệu (glTF 2.0, đơn vị mét, trục Y lên).'); return r; }
  A.export3D = export3D;
  plain(['3DDWF', '3DDWFPUBLISH'], 'Xuất mô hình 3D để xem / chia sẻ: glTF .glb (Windows 3D Viewer, Blender, web) hoặc trang .html có trình xem 3D tự chứa', () => {
    if(A.busy && A.busy()) A.cancel(true); const K = A.acw; const O = Object.assign({ fmt: 'html', sel: 0 }, LS('dvd:3ddwf', {}));
    const html = '<div class="acw" style="width:420px">' + K.grp('Xuất 3D', K.row('Định dạng:', K.sel('d3F', [['html', 'Trang web 3D (.html, tự chứa)'], ['glb', 'glTF nhị phân (.glb)']], O.fmt)) + '<div class="acw-row">' + K.chk('d3S', 'Chỉ đối tượng đang chọn', !!O.sel) + '</div>') +
      '<div class="acw-note" style="white-space:normal">DWF 3D của Autodesk dùng định dạng HOOPS W3D không công bố — DVDCAD xuất glTF (chuẩn mở) hoặc trang xem 3D mở bằng trình duyệt bất kỳ.</div></div>';
    A.dialog({ title: 'Xuất 3D (3DDWF)', html, okText: 'Xuất', ok: root => { O.fmt = root.querySelector('#d3F').value; O.sel = root.querySelector('#d3S').checked ? 1 : 0; SV('dvd:3ddwf', O); let sel = null; if(O.sel){ try{ sel = [...selEnts]; }catch(_){} if(!sel || !sel.length){ say('Chưa chọn đối tượng.'); return false; } } setTimeout(() => export3D(O.fmt, sel), 0); } });
  });

  /* ===================== VIEWCOMPONENT ===================== */
  const D = () => A._dvApi, DVR = () => A._dvRegistry;
  const bbOf = L => { try{ return A.bboxOf(L); }catch(_){ return null; } };
  // hình chiếu chứa điểm (hộp bao nhỏ nhất)
  function viewAt(pt){ const R = DVR(), API = D(); if(!R || !API) return null; let best = null, ba = Infinity;
    for(const r of R.values()){ const L = API.viewEnts(r.id).filter(e => e.type !== 'TEXT'); const b = bbOf(L); if(!b) continue; const m = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.02; if(pt.x < b.x0 - m || pt.x > b.x1 + m || pt.y < b.y0 - m || pt.y > b.y1 + m) continue; const ar = (b.x1 - b.x0) * (b.y1 - b.y0); if(ar < ba){ ba = ar; best = r; } }
    return best; }
  // tia từ điểm trên hình chiếu vào mô hình → khối 3D gần người nhìn nhất (mặt cắt: bỏ phần đã cắt đi)
  function pickSolid(rec, pt){ const R = DVR(), API = D(); let r = rec, p = pt, k = 0;
    while(r && r.k === 'det' && k++ < 10){ const par = R.get(r.par); if(!par) return null; const f = r.sc / par.sc; p = { x: r.det.c.x + (p.x - r.at.x) / f, y: r.det.c.y + (p.y - r.at.y) / f }; r = par; }
    if(!r || !r.d || !r.u) return null; const d = r.d, u = r.u, rr = API.unit(API.cross(u, d)); const x = (p.x - r.at.x) / r.sc, y = (p.y - r.at.y) / r.sc; const O = API.add(API.mul(rr, x), API.mul(u, y));
    let tc = Infinity; if(r.k === 'sec'){ const par = R.get(r.par), P0 = API.cutPts(r)[0]; if(par && P0){ const q = API.add(API.mul(par.r || API.unit(API.cross(par.u, par.d)), (P0.x - par.at.x) / par.sc), API.mul(par.u, (P0.y - par.at.y) / par.sc)); tc = API.dot(q, d); } }
    const comp = r.k === 'sec' ? (API.partMap(r) || new Map()) : new Map(); let best = null, bt = -Infinity;
    for(const e of ME()){ if(e.type !== 'SOLID3D') continue; let m = null; try{ m = A.meshOf(e); }catch(_){} if(!m) continue; const P = m.p, I = m.i, none = comp.get(e) === 'none';
      for(let t = 0; t + 2 < I.length; t += 3){ const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
        const h = API.cross(d, e2), det = API.dot(e1, h); if(Math.abs(det) < 1e-14) continue; const s = [O[0] - P[a], O[1] - P[a + 1], O[2] - P[a + 2]], f = 1 / det, uu = f * API.dot(s, h); if(uu < -1e-9 || uu > 1 + 1e-9) continue; const q = API.cross(s, e1), vv = f * API.dot(d, q); if(vv < -1e-9 || uu + vv > 1 + 1e-9) continue;
        const tt = f * API.dot(e2, q); if(!none && tt > tc + 1e-9) continue; if(tt > bt){ bt = tt; best = e; } } }
    return best ? { ent: best, rec: r } : null; }
  A.viewPickSolid = (pt) => { const v = viewAt(pt); return v ? pickSolid(v, pt) : null; };
  async function setPart(rec, ent, mode){ const R = DVR(), API = D(); if(!ent.pid) ent.pid = 'P' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    rec.comp = Object.assign({}, rec.comp || {}); if(mode === 'sec' && !(rec.par != null && API.partMap(R.get(rec.par)))) delete rec.comp[ent.pid]; else rec.comp[ent.pid] = mode;
    const L = API.descend([rec.id]).filter(r => r.k === 'sec' || r.id === rec.id || r.k === 'det'); const ok = await API.regen(L, 'VIEWCOMPONENT'); return ok ? L.length : 0; }
  A.viewSetPart = setPart;
  cmd(['VIEWCOMPONENT'], 'Chọn thành phần (khối 3D) trên hình chiếu → tham gia mặt cắt: Không (không bị cắt) / Cắt / Lát (chỉ mặt cắt) — mặt cắt dựng lại ngay', async () => {
    if(!D() || !DVR() || !DVR().size){ log('Bản vẽ chưa có hình chiếu (VIEWBASE).'); return; }
    for(;;){ const r = await A.getPoint('Chọn thành phần trên hình chiếu hoặc <thoát>'); if(!r.pt) return;
      const v = viewAt(r.pt); if(!v){ log('Điểm chọn không nằm trên hình chiếu nào.'); continue; } const hit = pickSolid(v, r.pt); if(!hit){ log('Không có thành phần tại điểm chọn.'); continue; }
      const cur = (D().partMap(v) || new Map()).get(hit.ent) || 'sec'; const T = { none: 'Không', sec: 'Cắt', slice: 'Lát' };
      const k = await A.getKw('Tham gia mặt cắt', { kw: [{ k: 'N', t: 'Không' }, { k: 'S', t: 'Cắt' }, { k: 'L', t: 'Lát' }], def: T[cur] }); const kw = k.kw || (k.str === '' ? null : null); if(!kw) return;
      const mode = kw === 'N' ? 'none' : kw === 'L' ? 'slice' : 'sec'; const n = await setPart(v, hit.ent, mode);
      log('VIEWCOMPONENT: thành phần (lớp ' + (hit.ent.layer || '0') + ') → tham gia mặt cắt: ' + T[mode] + (n ? ' — dựng lại ' + n + ' hình chiếu.' : '.')); }
  });

  /* ===================== VIEWSYMBOLSKETCH / VIEWSKETCHCLOSE ===================== */
  const SKL = 'MD_Sketch';
  const sketchEnts = () => ME().filter(e => e.vsk != null);
  cmd(['VIEWSYMBOLSKETCH'], 'Sửa ký hiệu mặt cắt (đường cắt) hoặc biên hình trích bằng nét phác — sửa bằng grip / lệnh thường rồi VIEWSKETCHCLOSE để dựng lại hình chiếu', async () => {
    const R = DVR(), API = D(); if(!R || !R.size){ log('Bản vẽ chưa có hình chiếu (VIEWBASE).'); return; }
    if(sketchEnts().length){ log('Đang có phác thảo ký hiệu — đóng bằng VIEWSKETCHCLOSE trước.'); return; }
    const r = await A.getEnt('Chọn ký hiệu mặt cắt hoặc biên hình trích', { filter: e => { const t = e && e.dvw != null ? String(e.dvw) : ''; if(!t.endsWith('/a')) return false; const q = R.get(parseInt(t, 10)); return !!q && (q.k === 'sec' || q.k === 'det'); } }); if(!r.ent) return;
    const rec = R.get(parseInt(String(r.ent.dvw), 10)); if(!rec) return;
    if(!A.layerNames().includes(SKL)){ A.addLayer(SKL, '#ff40ff'); try{ A.onLayers && A.onLayers(); }catch(_){} }
    let sk; if(rec.k === 'sec'){ const P = API.cutPts(rec); sk = { type: 'POLYLINE', closed: false, vertices: P.map(p => ({ x: p.x, y: p.y })) }; }
    else if(rec.det.shape === 'R'){ const c = rec.det.c, w = rec.det.w / 2, h = rec.det.h / 2; sk = { type: 'POLYLINE', closed: true, vertices: [{ x: c.x - w, y: c.y - h }, { x: c.x + w, y: c.y - h }, { x: c.x + w, y: c.y + h }, { x: c.x - w, y: c.y + h }] }; }
    else sk = { type: 'CIRCLE', cx: rec.det.c.x, cy: rec.det.c.y, r: rec.det.r };
    A.newProps(sk); sk.layer = SKL; sk.col = A.layerHex(SKL); sk.vsk = rec.id; A.commit({ add: [sk] }, 'VIEWSYMBOLSKETCH');
    try{ selEnts.clear(); selEnts.add(ME()[ME().length - 1]); DVDCmd.refreshPalette && DVDCmd.refreshPalette(true); }catch(_){}
    log('VIEWSYMBOLSKETCH: phác thảo ' + (rec.k === 'sec' ? 'đường cắt ' : 'biên hình trích ') + rec.lab + ' trên lớp ' + SKL + ' — sửa bằng grip / STRETCH / PEDIT…, xong gõ VIEWSKETCHCLOSE.');
  });
  async function sketchClose(keep){ const R = DVR(), API = D(); const L = sketchEnts(); if(!L.length){ log('Không có phác thảo ký hiệu nào đang mở.'); return 0; }
    const ids = [...new Set(L.map(e => e.vsk))]; const recs = [];
    if(keep) for(const id of ids){ const rec = R.get(id); if(!rec) continue; const e = L.find(x => x.vsk === id);
      if(rec.k === 'sec'){ const V = e.type === 'LINE' ? [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }] : (e.vertices || []).map(v => ({ x: v.x, y: v.y })); if(V.length < 2){ log('Đường cắt cần ít nhất 2 điểm — bỏ thay đổi.'); continue; } if(rec.k === 'sec' && rec.cut && rec.cut.type === 'F' && V.length > 2) rec.cut.type = 'O'; rec.cut = { pts: V, type: rec.cut ? rec.cut.type : 'F' }; recs.push(rec); }
      else { if(e.type === 'CIRCLE'){ rec.det = Object.assign({}, rec.det, { shape: 'C', c: { x: e.cx, y: e.cy }, r: e.r }); } else { const b = bbOf([e]); if(!b) continue; rec.det = Object.assign({}, rec.det, { shape: 'R', c: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }, w: b.x1 - b.x0, h: b.y1 - b.y0, r: Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 }); } recs.push(rec); } }
    A.commit({ del: L }, 'VIEWSKETCHCLOSE');
    if(recs.length){ const all = API.descend(recs.map(r => r.id)); await API.regen(all, 'VIEWSKETCHCLOSE'); log('VIEWSKETCHCLOSE: dựng lại ' + all.length + ' hình chiếu theo ký hiệu mới.'); return all.length; }
    log('VIEWSKETCHCLOSE: đã đóng phác thảo' + (keep ? '' : ' (bỏ thay đổi)') + '.'); return 0; }
  A.viewSketchClose = sketchClose;
  cmd(['VIEWSKETCHCLOSE'], 'Đóng phác thảo ký hiệu (VIEWSYMBOLSKETCH): Lưu → dựng lại mặt cắt / hình trích theo nét phác; Bỏ → giữ nguyên', async () => {
    if(!sketchEnts().length){ log('Không có phác thảo ký hiệu nào đang mở.'); return; }
    const k = await A.getKw('Đóng phác thảo', { kw: [{ k: 'S', t: 'Lưu' }, { k: 'D', t: 'Bỏ' }], def: 'Lưu' }); await sketchClose(k.kw !== 'D');
  });

  /* ===================== VIEWSETPROJ ===================== */
  function parseIPJ(txt){ const tag = n => { const m = new RegExp('<' + n + '[^>]*>([\\s\\S]*?)</' + n + '>', 'i').exec(txt); return m ? m[1].trim() : ''; };
    const libs = []; const re = /<Library[^>]*>([\s\S]*?)<\/Library>/gi; let m; while((m = re.exec(txt))){ const nm = /<Name>([^<]*)<\/Name>/i.exec(m[1]), pth = /<Path>([^<]*)<\/Path>/i.exec(m[1]); libs.push({ name: nm ? nm[1] : '', path: pth ? pth[1] : '' }); }
    const ws = (/<Workspace>[\s\S]*?<Path>([^<]*)<\/Path>/i.exec(txt) || [])[1] || tag('WorkspacePath') || ''; const type = tag('ProjectType') || tag('Type') || '';
    return { ws, libs, type, ok: /InventorProject|<ProjectType|<Workspace/i.test(txt) }; }
  A.parseIPJ = parseIPJ;
  plain(['VIEWSETPROJ'], 'Chọn tệp dự án Inventor (.ipj) cho hình chiếu từ mô hình Inventor — DVDCAD ghi nhớ dự án; hình chiếu dựng từ khối 3D trong bản vẽ', async () => {
    const cur = LS('dvd:ipj', null); if(cur) log('VIEWSETPROJ: dự án hiện tại ' + cur.name + (cur.ws ? ' (thư mục làm việc ' + cur.ws + ')' : '') + '.');
    const f = await pickFile('.ipj'); if(!f) return; const P = parseIPJ(await f.text()); if(!P.ok){ log('VIEWSETPROJ: ' + f.name + ' không phải tệp dự án Inventor.'); return; }
    SV('dvd:ipj', { name: f.name, ws: P.ws, libs: P.libs, type: P.type, t: Date.now() });
    log('VIEWSETPROJ: dự án ' + f.name + (P.ws ? ', thư mục làm việc ' + P.ws : '') + (P.libs.length ? ', ' + P.libs.length + ' thư viện' : '') + '. DVDCAD chưa đọc mô hình Inventor (.ipt / .iam) — xuất SAT (ACIS) từ Inventor rồi ACISIN, sau đó VIEWBASE.');
  });

  try{ DVDCmd.refresh && DVDCmd.refresh(); }catch(_){}
})();
