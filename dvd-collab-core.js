/* DVDCAD — lõi đồng bộ cộng tác (không phụ thuộc giao diện, chạy được cả trong Node để kiểm thử).

   Tài liệu dùng chung (lưu thành 1 file JSON trên Google Drive, cạnh bản vẽ):
   {
     app:'dvdcad', kind:'collab', v:2,
     drawing:{id,name},
     items:{ <id>: { k:'m'|'a'|'g'|'x', d:<chuỗi JSON dữ liệu> | null, c:<thời điểm tạo>, t:<thời điểm sửa>, by:<người sửa>, del:0|1 } },
     presence:{ <email>: { n:<tên>, t:<lần cuối thấy> } }
   }
   k: m = phép đo, a = ghi chú, g = hình vẽ thêm, x = đối tượng gốc của file đã xoá (d = chữ ký đối tượng).

   Hợp nhất: theo từng id, bản có t lớn hơn thắng (last-writer-wins); xoá = đánh dấu del:1 (giữ lại để người khác biết).
   Không bao giờ coi "thiếu trong file từ xa" là xoá — nhờ vậy hai người ghi đè lẫn nhau vẫn hội tụ, không mất dữ liệu. */
(function(root){
  'use strict';

  let _seq = 0;
  function newId(){
    _seq = (_seq + 1) % 1679616;
    return Date.now().toString(36) + '-' + _seq.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function fnv(str){ let h = 0x811c9dc5; for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  // id cố định cho "đối tượng gốc đã xoá": mọi máy tính ra cùng một id -> không cần dò khớp
  function xId(sig){ return 'x' + fnv(String(sig)) + '-' + String(sig).length.toString(36); }

  function emptyDoc(drawing){ return { app:'dvdcad', kind:'collab', v:2, drawing: drawing || null, items:{}, presence:{} }; }

  function isDoc(o){ return !!(o && o.app === 'dvdcad' && o.kind === 'collab' && o.items && typeof o.items === 'object'); }

  function newer(a, b){            // a có mới hơn b không (b có thể undefined)
    if(!b) return true;
    if(!a) return false;
    if((a.t || 0) !== (b.t || 0)) return (a.t || 0) > (b.t || 0);
    // cùng thời điểm: phân xử cố định để mọi máy chọn giống nhau
    const ka = (a.by || '') + '|' + (a.del ? 1 : 0) + '|' + (a.d || '');
    const kb = (b.by || '') + '|' + (b.del ? 1 : 0) + '|' + (b.d || '');
    return ka > kb;
  }

  // Hợp nhất 2 tài liệu -> tài liệu mới (không sửa đầu vào)
  function mergeDocs(a, b){
    a = isDoc(a) ? a : emptyDoc(); b = isDoc(b) ? b : emptyDoc();
    const out = emptyDoc(a.drawing || b.drawing);
    const ids = new Set([...Object.keys(a.items), ...Object.keys(b.items)]);
    for(const id of ids){
      const x = a.items[id], y = b.items[id];
      const win = newer(x, y) ? x : y;
      const c = Math.min((x && x.c) || Infinity, (y && y.c) || Infinity);
      out.items[id] = Object.assign({}, win, { c: isFinite(c) ? c : (win.t || 0) });
    }
    const ps = Object.assign({}, a.presence || {});
    for(const [u, p] of Object.entries(b.presence || {})){ if(!ps[u] || (p && p.t > ps[u].t)) ps[u] = p; }
    out.presence = ps;
    return out;
  }

  /* Gán id cho các đối tượng cục bộ.
     local: mảng {obj, k, d} (obj = tham chiếu đối tượng trong app, hoặc chuỗi chữ ký với k='x')
     ids:   WeakMap obj -> id (giữ qua các lần đồng bộ)
     pools: các tài liệu/ảnh chụp dùng để dò lại id theo nội dung (sau khi tải lại trang id bị mất)
     Trả về Map id -> {k,d,obj} */
  function assignIds(local, ids, pools){
    const out = new Map();
    const taken = new Set();
    // 1) đối tượng đã có id
    for(const it of local){
      if(it.k === 'x'){ const id = xId(it.d); if(!out.has(id)){ out.set(id, it); taken.add(id); } continue; }
      const id = ids.get(it.obj);
      if(id && !taken.has(id)){ out.set(id, it); taken.add(id); }
    }
    // 2) dò theo nội dung trong các nguồn đã biết
    const byKey = new Map();
    for(const pool of pools){
      if(!pool) continue;
      for(const [id, item] of Object.entries(pool)){
        if(!item || item.del || item.k === 'x' || taken.has(id)) continue;
        const key = item.k + '\u0001' + item.d;
        if(!byKey.has(key)) byKey.set(key, []);
        const arr = byKey.get(key); if(arr.indexOf(id) < 0) arr.push(id);
      }
    }
    for(const it of local){
      if(it.k === 'x') continue;
      if(ids.get(it.obj) && out.get(ids.get(it.obj)) === it) continue;
      const key = it.k + '\u0001' + it.d;
      let id = null; const arr = byKey.get(key);
      while(arr && arr.length){ const cand = arr.shift(); if(!taken.has(cand)){ id = cand; break; } }
      if(!id) id = newId();
      ids.set(it.obj, id); out.set(id, it); taken.add(id);
    }
    return out;
  }

  /* So sánh ảnh chụp lần đồng bộ trước (base: id -> {k,d}) với trạng thái hiện tại (localMap) -> các thay đổi cục bộ */
  function diff(base, localMap, now, me){
    const ops = {};
    for(const [id, it] of localMap){
      const b = base[id];
      if(!b || b.del || b.d !== it.d || b.k !== it.k){ ops[id] = { k: it.k, d: it.d, c: (b && b.c) || now, t: now, by: me, del: 0 }; }
    }
    for(const [id, b] of Object.entries(base)){
      if(b && !b.del && !localMap.has(id)) ops[id] = { k: b.k, d: null, c: b.c || now, t: now, by: me, del: 1 };
    }
    return ops;
  }

  function applyOps(doc, ops){
    const out = mergeDocs(doc, emptyDoc());
    for(const [id, op] of Object.entries(ops)){ const cur = out.items[id]; out.items[id] = Object.assign({}, op, { c: (cur && cur.c) || op.c }); }
    return out;
  }

  // Ảnh chụp các mục còn sống của tài liệu (dùng làm base cho lần sau)
  function liveSnapshot(doc){
    const s = {};
    for(const [id, it] of Object.entries((doc && doc.items) || {})){ if(it && !it.del) s[id] = { k: it.k, d: it.d, c: it.c }; }
    return s;
  }

  // Danh sách mục còn sống theo loại, sắp theo thời điểm tạo (giữ thứ tự hiển thị ổn định giữa các máy)
  function liveByKind(doc){
    const r = { m: [], a: [], g: [], x: [] };
    for(const [id, it] of Object.entries((doc && doc.items) || {})){
      if(!it || it.del || !r[it.k]) continue;
      r[it.k].push({ id, d: it.d, c: it.c || 0 });
    }
    for(const k of Object.keys(r)) r[k].sort((p, q) => (p.c - q.c) || (p.id < q.id ? -1 : 1));
    return r;
  }

  // Nội dung 2 tài liệu có giống nhau không (bỏ qua presence)
  function sameItems(a, b){
    const ia = (a && a.items) || {}, ib = (b && b.items) || {};
    const ka = Object.keys(ia), kb = Object.keys(ib);
    if(ka.length !== kb.length) return false;
    for(const k of ka){ const x = ia[k], y = ib[k]; if(!y || x.t !== y.t || (x.del ? 1 : 0) !== (y.del ? 1 : 0) || x.d !== y.d || x.by !== y.by) return false; }
    return true;
  }

  // Dọn mục đã xoá quá lâu để file không phình mãi
  function gc(doc, maxAgeMs, now){
    const out = mergeDocs(doc, emptyDoc());
    for(const [id, it] of Object.entries(out.items)){ if(it.del && now - (it.t || 0) > maxAgeMs) delete out.items[id]; }
    for(const [u, p] of Object.entries(out.presence)){ if(!p || now - (p.t || 0) > 7 * 864e5) delete out.presence[u]; }
    return out;
  }

  const api = { newId, xId, emptyDoc, isDoc, mergeDocs, assignIds, diff, applyOps, liveSnapshot, liveByKind, sameItems, gc };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DVDCollabCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
