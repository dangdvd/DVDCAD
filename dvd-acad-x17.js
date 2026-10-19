/* DVDCAD v5h — XCLIP như AutoCAD
   · Phần khối nằm ngoài đường cắt được ẩn nhưng vẫn giữ trong bản vẽ: XCLIP Tắt / Bật / Xoá hiện lại đủ, lưu DXF ghi đủ khối + SPATIAL_FILTER
   · XCLIP: Bật / Tắt / Xoá / Tạo đa tuyến / Khung cắt mới [Chọn đa tuyến / Đa giác / Chữ nhật / Đảo ngược]
   · XCLIPFRAME 0 / 1 / 2 (khung đường cắt) · dời / xoay / co giãn / chép khối: đường cắt đi theo khối; phá khối (EXPLODE): bỏ đường cắt */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._x17 || !window.DVDCmd || typeof XCLIPS === 'undefined') return; A._x17 = true;
  const log = m => A.log(m);
  const cmd = (keys, desc, fn) => DVDCmd.register(keys, desc, () => A.run(keys[0], fn), { engine: true });
  const ME = () => (typeof modelEntities !== 'undefined' ? modelEntities : []);
  const redraw = () => { try{ bbDirty = true; invalidateSnap(); }catch(_){} try{ draw(); }catch(_){} };
  const strip = w => { delete w.xcl; delete w.xo; delete w.xp; delete w.xh; if(w.clip && w.clip.xc) delete w.clip; };

  /* ---- sửa / dời / chép khối: đường cắt đi theo khối (theo ma trận chèn bm), phá khối thì bỏ ---- */
  const _commit = A.commit;
  A.commit = function(ch){
    try{ if(ch){ const fix = w => { if(!w || !w.xcl) return; if(!w.grp){ strip(w); return; } const R = XCLIPS.get(w.xcl); if(!R){ strip(w); return; } xclipApply([w], R); };
      for(const p of ch.rep || []) fix(p && p[1]); for(const e of ch.add || []) fix(e); } }catch(err){ console.warn('XCLIP', err); }
    return _commit.apply(this, arguments);
  };

  /* ---- đổi trạng thái cắt của cả khối, có hoàn tác ---- */
  const snap = mem => mem.map(e => ({ e, xcl: e.xcl, xo: e.xo, xp: e.xp, xh: e.xh, clip: e.clip }));
  const restore = S => { for(const s of S){ const e = s.e; for(const k of ['xcl', 'xo', 'xp', 'xh', 'clip']){ if(s[k] === undefined) delete e[k]; else e[k] = s[k]; } } _xcTick++; redraw(); };
  function setState(mem, R, msg){
    const before = snap(mem);
    if(R) xclipApply(mem, R); else { for(const e of mem) strip(e); _xcTick++; }
    const after = snap(mem);
    pushUndo({ op: 'fn', undo: () => restore(before), redo: () => restore(after) });
    redraw(); if(msg) log(msg);
  }
  A.xclipSet = setState;
  const derive = (R, o) => { const N = xclipNew([{ x: 0, y: 0 }], null, {}); Object.assign(N, { bp: R.bp, inv: R.inv, hole: R.hole, on: R.on }, o || {}); N.cache = new Map(); return N; };   // bản ghi mới, không sửa bản ghi cũ (hoàn tác đúng, bản chép khác của khối không bị ảnh hưởng)
  const bboxOf = list => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for(const e of list){ let q = null; try{ q = entBBox(e); }catch(_){} if(!q) continue; if(q.x0 < a) a = q.x0; if(q.y0 < b) b = q.y0; if(q.x1 > c) c = q.x1; if(q.y1 > d) d = q.y1; } return isFinite(a) ? { x0: a, y0: b, x1: c, y1: d } : null; };
  const area2 = P => { let s = 0; for(let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j].x * P[i].y - P[i].x * P[j].y); return s; };
  // đường cắt đảo ngược kiểu AutoCAD: khung ngoài + lỗ, nối bằng 1 đường cắt hẹp (vẽ / chọn theo chẵn-lẻ)
  function slit(hole, list){
    const b = bboxOf(list) || { x0: 0, y0: 0, x1: 1, y1: 1 }; for(const q of hole){ b.x0 = Math.min(b.x0, q.x); b.y0 = Math.min(b.y0, q.y); b.x1 = Math.max(b.x1, q.x); b.y1 = Math.max(b.y1, q.y); }
    const g = Math.max(b.x1 - b.x0, b.y1 - b.y0, 1) * 0.05; const O = [{ x: b.x0 - g, y: b.y0 - g }, { x: b.x1 + g, y: b.y0 - g }, { x: b.x1 + g, y: b.y1 + g }, { x: b.x0 - g, y: b.y1 + g }];
    let H = hole.slice(); if(area2(H) > 0) H.reverse();
    return O.concat([O[0], H[0]], H.slice(1), [H[0], O[0]]).filter((q, i, a) => i === 0 || q.x !== a[i - 1].x || q.y !== a[i - 1].y);
  }
  const holeOf = (R, bm) => { const src = R.hole || null; if(!src) return null; return bm ? src.map(p => ({ x: bm.a * p.x + bm.c * p.y + bm.e, y: bm.b * p.x + bm.d * p.y + bm.f })) : src; };

  async function askBoundary(mem){
    let inv = false;
    for(;;){
      const k = await A.getPoint('Khung cắt mới (' + (inv ? 'giữ phần bên ngoài' : 'giữ phần bên trong') + '): góc thứ nhất hoặc [Chọn đa tuyến / Đa giác / Chữ nhật / Đảo ngược]', { kw: [{ k: 'S', t: 'Chọn đa tuyến' }, { k: 'P', t: 'Đa giác' }, { k: 'R', t: 'Chữ nhật' }, { k: 'I', t: 'Đảo ngược' }] });
      let first = k.pt || null; const op = first ? 'R' : k.kw; if(!op) return null;
      if(op === 'I'){ inv = !inv; continue; }
      let P = null;
      if(op === 'S'){ const r = await A.getEnt('Chọn đa tuyến kín / đường tròn làm đường cắt', { filter: e => e.type === 'CIRCLE' || (e.type === 'POLYLINE' && (e.vertices || []).length >= 3) }); if(!r.ent) return null; const e = r.ent;
        if(e.type === 'CIRCLE'){ P = []; for(let j = 0; j < 72; j++){ const a = j / 72 * Math.PI * 2; P.push({ x: e.cx + e.r * Math.cos(a), y: e.cy + e.r * Math.sin(a) }); } } else P = e.vertices.map(v => ({ x: v.x, y: v.y })); }
      else if(op === 'P'){ P = []; for(;;){ const r = await A.getPoint(P.length < 3 ? 'Điểm thứ ' + (P.length + 1) + ' của đường cắt' : 'Điểm tiếp theo (Enter = đóng)', { base: P.length ? P[P.length - 1] : undefined, preview: (g, p) => { if(P.length) g.poly(P.concat([p]), true); } }); if(!r.pt) break; P.push(r.pt); } }
      else { if(!first){ const a = await A.getPoint('Góc thứ nhất của khung cắt'); if(!a.pt) return null; first = a.pt; } const a0 = first;
        const b = await A.getPoint('Góc đối diện', { base: a0, rubber: false, preview: (g, p) => g.poly([a0, { x: p.x, y: a0.y }, p, { x: a0.x, y: p.y }], true) }); if(!b.pt) return null;
        const x0 = Math.min(a0.x, b.pt.x), y0 = Math.min(a0.y, b.pt.y), x1 = Math.max(a0.x, b.pt.x), y1 = Math.max(a0.y, b.pt.y); if(!(x1 > x0 && y1 > y0)) return null; P = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]; }
      if(!P || P.length < 3){ log('Đường cắt cần ít nhất 3 điểm.'); return null; }
      return { P, inv };
    }
  }

  cmd(['XCLIP', 'XC', 'CLIP'], 'Cắt hiển thị khối / tham chiếu ngoài: chữ nhật, đa giác, đa tuyến, đảo ngược; bật / tắt / xoá', async () => {
    const r = await A.getEnt('Chọn khối / tham chiếu ngoài', { filter: e => !!(e.grp || e.xr) }); if(!r.ent) return;
    const e0 = r.ent; const mem = e0.xr ? ME().filter(m => m.xr === e0.xr) : ME().filter(m => m.grp === e0.grp);
    const q = mem.find(m => m.xcl && XCLIPS.get(m.xcl)); const R = q ? XCLIPS.get(q.xcl) : null; const bm = (mem.find(m => m.bm) || {}).bm || null;
    const k = await A.getKw('Tuỳ chọn XCLIP [Bật / Tắt / Xoá / Tạo đa tuyến / Khung cắt mới]', { kw: [{ k: 'ON', t: 'Bật' }, { k: 'OF', t: 'Tắt' }, { k: 'D', t: 'Xoá' }, { k: 'P', t: 'Tạo đa tuyến' }, { k: 'N', t: 'Khung cắt mới' }], def: 'Khung cắt mới' });
    const op = k.kw || 'N';
    if(op !== 'N' && !R){ log('Khối này chưa có đường cắt.'); return; }
    if(op === 'ON'){ if(R.on){ log('Đường cắt đang bật.'); return; } setState(mem, derive(R, { on: true }), 'XCLIP: đã bật đường cắt.'); return; }
    if(op === 'OF'){ if(!R.on){ log('Đường cắt đang tắt.'); return; } setState(mem, derive(R, { on: false }), 'XCLIP: đã tắt đường cắt, hiện đủ khối.'); return; }
    if(op === 'D'){ setState(mem, null, 'XCLIP: đã xoá đường cắt.'); return; }
    if(op === 'P'){ const c = xclipFor(R, bm); const H = holeOf(R, bm); const P = H || c.poly || [{ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y }, { x: c.x + c.w, y: c.y + c.h }, { x: c.x, y: c.y + c.h }];
      const e = { type: 'POLYLINE', vertices: P.map(p => ({ x: p.x, y: p.y })), closed: true }; A.newProps(e); A.commit({ add: [e] }, 'XCLIP: đã tạo đa tuyến theo đường cắt'); return; }
    if(R){ const d = await A.getKw('Xoá đường cắt cũ? [Có / Không]', { kw: [{ k: 'Y', t: 'Có' }, { k: 'N', t: 'Không' }], def: 'Có' }); if(d.kw === 'N') return; }
    const B = await askBoundary(mem); if(!B) return;
    const P = B.inv ? slit(B.P, mem) : B.P;
    const N = xclipNew(P, bm, { inv: B.inv }); if(B.inv){ const iv = bm ? _xcInv(bm) : null; N.hole = iv ? B.P.map(p => mApply(iv, p.x, p.y)) : B.P.map(p => ({ x: p.x, y: p.y })); }
    setState(mem, N, 'XCLIP: đã cắt ' + (B.inv ? '(giữ phần bên ngoài) ' : '') + 'theo ' + B.P.length + ' đỉnh.');
  });

  cmd(['XCLIPFRAME'], 'Khung đường cắt XCLIP: 0 ẩn, 1 hiện và in, 2 hiện nhưng không in', async () => {
    const r = await A.getNum('XCLIPFRAME (0 = ẩn, 1 = hiện & in, 2 = hiện, không in)', { def: XCLIPFRAME }); if(r.num == null) return; const v = Math.round(r.num); if(v < 0 || v > 2){ log('Nhập 0, 1 hoặc 2.'); return; }
    XCLIPFRAME = v; _xcTick++; redraw(); log('XCLIPFRAME = ' + v + '.');
  });
})();
