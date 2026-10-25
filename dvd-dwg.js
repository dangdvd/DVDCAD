/* DVDCAD v5k — GHI DWG GỐC: AutoCAD 2000 (AC1015), không cần ODA File Converter
   Đầu vào là DXF R2000 do chính DVDCAD tạo (A.dxfR2000): đọc lại từng bản ghi rồi mã hoá thành đối tượng DWG,
   nên DWG giữ đúng những gì bản DXF 2000 giữ (lớp, kiểu nét, kiểu chữ, khối + thuộc tính, kích thước, hatch…).
   Định dạng theo tài liệu mở "Open Design Specification for .dwg files" (Open Design Alliance) và mã nguồn LibreDWG
   (GPL-3.0, cùng giấy phép với DVDCAD): mã hoá bit (B/BB/BS/BL/BD/DD/BT/BE/H/MC/MS), CRC-16, thứ tự trường của
   từng đối tượng, bố cục section. Bố cục file giống AutoCAD 2000: header → AuxHeader → ảnh xem trước → biến hệ
   thống → lớp (class) → đối tượng → bản đồ handle → ObjFreeSpace → header phụ → Template.
   Dùng được cả trong trình duyệt (A.dwgFromDxf) lẫn Node (module.exports) để kiểm thử. */
(function(root){
  'use strict';
  const D2R = Math.PI / 180;
  const fin = v => { v = +v; return isFinite(v) ? v : 0; };

  /* ---------------- CRC-16 (đa thức 0xA001; table[1] = 0xC0C1) ---------------- */
  const CRCT = (() => { const t = new Uint16Array(256); for(let i = 0; i < 256; i++){ let c = i; for(let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xA001 : c >>> 1; t[i] = c; } return t; })();
  function crc16(seed, u, from, to){ let dx = seed & 0xffff; for(let i = from; i < to; i++) dx = (dx >>> 8) ^ CRCT[(u[i] ^ dx) & 0xff]; return dx; }

  /* ---------------- bộ ghi bit (bit cao trước; số nhiều byte little-endian) ---------------- */
  const F64 = new DataView(new ArrayBuffer(8));
  // chuỗi TV (R2000): BS độ dài + byte theo trang mã ANSI_1252; ký tự ngoài bảng → \U+XXXX như AutoCAD
  function tvBytes(s){ s = s == null ? '' : String(s); const b = [];
    for(const ch of s){ const c = ch.codePointAt(0);
      if(c < 0x80 || (c >= 0xa0 && c <= 0xff)) b.push(c);
      else { const e = '\\U+' + (c > 0xffff ? 0x3f : c).toString(16).toUpperCase().padStart(4, '0'); for(let k = 0; k < e.length; k++) b.push(e.charCodeAt(k)); } }
    return b; }
  class BW {
    constructor(n){ this.u = new Uint8Array(Math.max(16, n | 0)); this.p = 0; }
    need(bits){ const nb = ((this.p + bits) >> 3) + 2; if(nb > this.u.length){ let n = this.u.length * 2; while(n < nb) n *= 2; const v = new Uint8Array(n); v.set(this.u); this.u = v; } }
    B(b){ this.need(1); if(b) this.u[this.p >> 3] |= 0x80 >> (this.p & 7); this.p++; }
    BB(v){ this.B(v & 2); this.B(v & 1); }
    B4(v){ this.B(v & 8); this.B(v & 4); this.B(v & 2); this.B(v & 1); }
    RC(v){ this.need(8); v &= 255; const i = this.p >> 3, o = this.p & 7; if(!o) this.u[i] = v; else { this.u[i] |= v >> o; this.u[i + 1] = (v << (8 - o)) & 255; } this.p += 8; }
    RS(v){ this.RC(v); this.RC(v >> 8); }
    RL(v){ v >>>= 0; this.RC(v); this.RC(v >>> 8); this.RC(v >>> 16); this.RC(v >>> 24); }
    RD(v){ F64.setFloat64(0, fin(v), true); for(let k = 0; k < 8; k++) this.RC(F64.getUint8(k)); }
    BS(v){ v &= 0xffff; if(v === 0) this.BB(2); else if(v === 256) this.BB(3); else if(v < 256){ this.BB(1); this.RC(v); } else { this.BB(0); this.RS(v); } }
    BL(v){ v >>>= 0; if(v === 0) this.BB(2); else if(v < 256){ this.BB(1); this.RC(v); } else { this.BB(0); this.RL(v); } }
    BD(v){ v = fin(v); if(v === 0) this.BB(2); else if(v === 1) this.BB(1); else { this.BB(0); this.RD(v); } }
    DD(v, d){ v = fin(v); if(v === d) this.BB(0); else { this.BB(3); this.RD(v); } }
    BT(v){ v = fin(v); if(v === 0) this.B(1); else { this.B(0); this.BD(v); } }
    BE(p){ const x = fin(p[0]), y = fin(p[1]), z = fin(p[2]); if(x === 0 && y === 0 && z === 1) this.B(1); else { this.B(0); this.BD(x); this.BD(y); this.BD(z); } }
    RD2(p){ this.RD(p[0]); this.RD(p[1]); }
    BD2(p){ this.BD(p[0]); this.BD(p[1]); }
    BD3(p){ this.BD(p[0]); this.BD(p[1]); this.BD(p[2]); }
    CMC(i){ this.BS(i); }
    TV(s){ const b = tvBytes(s); this.BS(b.length); for(const x of b) this.RC(x); }
    // handle: byte (mã << 4 | số byte) + giá trị big-endian
    H(code, v){ v = Math.max(0, Math.floor(+v || 0)); if(!v){ this.RC(code << 4); return; } const b = []; while(v > 0){ b.unshift(v % 256); v = Math.floor(v / 256); } this.RC((code << 4) | b.length); for(const x of b) this.RC(x); }
    MS(v){ if(v > 0x7fff){ this.RS((v & 0x7fff) | 0x8000); this.RS(v >>> 15); } else this.RS(v); }
    MC(v){ const neg = v < 0; v = Math.abs(v); for(;;){ let b = v & 0x7f; v = Math.floor(v / 128); if(v === 0 && !(b & 0x40)){ if(neg) b |= 0x40; this.RC(b); return; } this.RC(b | 0x80); } }
    UMC(v){ for(;;){ const b = v & 0x7f; v = Math.floor(v / 128); if(v === 0){ if(b & 0x40){ this.RC(b | 0x80); this.RC(0); } else this.RC(b); return; } this.RC(b | 0x80); } }
    TF(a){ for(let i = 0; i < a.length; i++) this.RC(a[i]); }
    append(w){ const n = w.p; if(!n) return;
      if(!(this.p & 7)){ this.need(n); this.u.set(w.u.subarray(0, (n + 7) >> 3), this.p >> 3); this.p += n; return; }
      const full = n >> 3; for(let i = 0; i < full; i++) this.RC(w.u[i]); const last = w.u[full]; for(let k = 0; k < (n & 7); k++) this.B((last >> (7 - k)) & 1); }
    pad(){ this.p = (this.p + 7) & ~7; this.need(0); }
    get byte(){ return this.p >> 3; }
    bytes(){ return this.u.slice(0, (this.p + 7) >> 3); }
    setRL(at, v){ v >>>= 0; this.u[at] = v & 255; this.u[at + 1] = (v >>> 8) & 255; this.u[at + 2] = (v >>> 16) & 255; this.u[at + 3] = (v >>> 24) & 255; }
    // CRC-16 từ byte `from` tới vị trí hiện tại (đã căn byte), ghi RS little-endian (hoặc big-endian cho bản đồ handle)
    crc(from, be){ this.pad(); const c = crc16(0xC0C1, this.u, from, this.p >> 3); if(be){ this.RC(c >> 8); this.RC(c); } else this.RS(c); return c; }
  }

  const SENT = {
    HEADER_END: '95A04E2899821AE55E41E05F9D3A4D00', THUMB_BEGIN: '1F256D07D43628289D57CA3F9D44102B', THUMB_END: 'E0DA92F82BC9D7D762A835C062BBEFD4',
    VAR_BEGIN: 'CF7B1F23FDDE38A95F7C68B84E6D335F', VAR_END: '3084E0DC0221C756A0839747B192CCA0', CLASS_BEGIN: '8DA1C4B8C4A9F8C5C0DCF45FE7CFB68A',
    CLASS_END: '725E3B473B56073A3F230BA018304975', H2_BEGIN: 'D47B21CE28939FBF53244009123CAA01', H2_END: '2B84DE31D76C6040ACDBBFF6EDC355FE' };
  const sentinel = (w, hex) => { for(let i = 0; i < 32; i += 2) w.RC(parseInt(hex.substr(i, 2), 16)); };

  /* ---------------- đọc DXF thành các bản ghi (mã nhóm, giá trị) ---------------- */
  class Rec {
    constructor(type){ this.type = type; this.g = []; }
    get(c, d){ for(const x of this.g) if(x[0] === c) return x[1]; return d; }
    num(c, d){ const v = this.get(c); if(v == null) return d == null ? 0 : d; const n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); }
    int(c, d){ const v = this.get(c); if(v == null) return d == null ? 0 : d; const n = parseInt(v, 10); return isFinite(n) ? n : (d == null ? 0 : d); }
    has(c){ return this.g.some(x => x[0] === c); }
    all(c){ return this.g.filter(x => x[0] === c).map(x => x[1]); }
    pt(c, z){ return [this.num(c), this.num(c + 10), z === false ? 0 : this.num(c + 20)]; }
    // phần sau mốc subclass 100 (ví dụ 330 / 10 của AcDbLayout)
    after(v){ const r = new Rec(this.type); let on = false; for(const x of this.g){ if(on) r.g.push(x); else if(x[0] === 100 && x[1] === v) on = true; } return r; }
    group102(name){ const out = []; let on = false; for(const x of this.g){ if(x[0] === 102){ on = x[1] === '{' + name; continue; } if(on) out.push(x[1]); } return out; }
    plain(){ const r = new Rec(this.type); let on = false; for(const x of this.g){ if(x[0] === 102){ on = String(x[1]).startsWith('{'); continue; } if(!on) r.g.push(x); } return r; }
  }
  function parseDxf(text){
    const L = String(text).split(/\r?\n/); const secs = {}; let sec = null, cur = null, want = false;
    for(let i = 0; i + 1 < L.length; i += 2){
      const c = parseInt(L[i], 10); if(!isFinite(c)) continue; const v = L[i + 1];
      if(c === 0){
        if(v === 'SECTION'){ sec = null; cur = null; want = true; continue; }
        if(v === 'ENDSEC'){ sec = null; cur = null; continue; }
        if(v === 'EOF') break;
        if(sec){ cur = new Rec(v); sec.push(cur); }
        continue;
      }
      if(c === 2 && want){ want = false; sec = secs[v] = []; if(v === 'HEADER'){ cur = new Rec('HEADER'); sec.push(cur); } continue; }
      if(cur) cur.g.push([c, v]);
    }
    return secs;
  }
  function headerVars(rec){ const m = new Map(); if(!rec) return m; let k = null; for(const x of rec.g){ if(x[0] === 9){ k = x[1]; m.set(k, new Rec(k)); } else if(k) m.get(k).g.push(x); } return m; }

  /* ---------------- mã kiểu đối tượng DWG ---------------- */
  const T = { TEXT: 1, ATTRIB: 2, ATTDEF: 3, BLOCK: 4, ENDBLK: 5, SEQEND: 6, INSERT: 7, ARC: 17, CIRCLE: 18, LINE: 19,
    DIM_LIN: 21, DIM_ALI: 22, DIM_ANG3: 23, DIM_RAD: 25, DIM_DIA: 26, POINT: 27, FACE3D: 28, SOLID: 31, ELLIPSE: 35, RAY: 40, XLINE: 41,
    DICT: 42, MTEXT: 44, BLOCK_CONTROL: 48, BLOCK_HEADER: 49, LAYER_CONTROL: 50, LAYER: 51, STYLE_CONTROL: 52, STYLE: 53,
    LTYPE_CONTROL: 56, LTYPE: 57, VIEW_CONTROL: 60, UCS_CONTROL: 62, VPORT_CONTROL: 64, VPORT: 65, APPID_CONTROL: 66, APPID: 67,
    DIMSTYLE_CONTROL: 68, DIMSTYLE: 69, VX_CONTROL: 70, MLINESTYLE: 73, LWPOLYLINE: 77, HATCH: 78, XRECORD: 79,
    DICTWDFLT: 500, PLACEHOLDER: 501, LAYOUT: 502 };
  const ODBX = 'ObjectDBX Classes';
  const CLASSES = [[500, 'ACDBDICTIONARYWDFLT', 'AcDbDictionaryWithDefault', ODBX, 0, 0], [501, 'ACDBPLACEHOLDER', 'AcDbPlaceHolder', ODBX, 0, 0], [502, 'LAYOUT', 'AcDbLayout', ODBX, 0, 0]];
  // vùng che (như AutoCAD): thực thể WIPEOUT (cùng bố cục IMAGE) + đối tượng WIPEOUTVARIABLES
  const WIPE_CLASSES = [[503, 'WIPEOUT', 'AcDbWipeout', 'WipeOut|Product Desc: Object Enabler for WipeOut entity | Company: Autodesk, Inc. | WEB Address: www.autodesk.com', 2175, 1],
    [504, 'WIPEOUTVARIABLES', 'AcDbWipeoutVariables', 'WipeOut|Product Desc:     WipeOut Dbx Application|Company:          Autodesk, Inc.|WEB Address:      www.autodesk.com', 0, 0]];
  const LWV = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
  const lwIndex = v => { if(v == null || !isFinite(v)) return 29; v = Math.round(v); if(v === -1) return 29; if(v === -2) return 30; if(v === -3) return 31; let b = 0, bd = Infinity; LWV.forEach((w, i) => { const d = Math.abs(w - v); if(d < bd){ bd = d; b = i; } }); return b; };
  const up = s => String(s == null ? '' : s).toUpperCase();

  /* =====================================================================
     DXF (R2000, của DVDCAD) → DWG AC1015
     ===================================================================== */
  function dwgFromDxf(text, opt){
    opt = opt || {};
    const S = parseDxf(text);
    const HV = headerVars((S.HEADER || [])[0]);
    const hv = (k, c, d) => { const r = HV.get(k); return r ? r.num(c, d) : d; };
    const hvs = (k, c, d) => { const r = HV.get(k); return r ? r.get(c, d) : d; };
    const metric = hv('$MEASUREMENT', 70, 1) !== 0;
    const hasWipe = [...(S.ENTITIES || []), ...(S.BLOCKS || [])].some(r => r.type === 'WIPEOUT');

    /* ---------- handle: giữ handle của DXF; bảng điều khiển / từ điển gốc đổi về số chuẩn như AutoCAD ---------- */
    const hmap = new Map(); let maxH = 0x20;
    const ref = hex => { if(hex == null) return 0; const k = String(hex).trim().toUpperCase(); if(!k || k === '0') return 0; if(hmap.has(k)) return hmap.get(k); const n = parseInt(k, 16); if(isFinite(n) && n > maxH) maxH = n; return isFinite(n) ? n : 0; };
    const CTRL = { BLOCK_RECORD: 1, LAYER: 2, STYLE: 3, LTYPE: 5, VIEW: 6, UCS: 7, VPORT: 8, APPID: 9, DIMSTYLE: 0xA };
    const H_VX = 0xB, H_NOD = 0xC;

    // ---- bảng ----
    const tables = {}; { let cur = null;
      for(const r of (S.TABLES || [])){
        if(r.type === 'TABLE'){ const name = r.get(2); cur = tables[name] = { head: r, recs: [] }; const h = r.get(5); if(h && CTRL[name]) hmap.set(up(h), CTRL[name]); continue; }
        if(r.type === 'ENDTAB'){ cur = null; continue; }
        if(cur) cur.recs.push(r);
      } }
    const objsDxf = S.OBJECTS || [];
    const nodRec = objsDxf.find(r => r.type === 'DICTIONARY' && (r.plain().get(330, '0') === '0'));
    if(nodRec && nodRec.get(5)) hmap.set(up(nodRec.get(5)), H_NOD);
    for(const r of [...Object.values(tables).flatMap(t => t.recs), ...objsDxf, ...(S.BLOCKS || []), ...(S.ENTITIES || [])]) ref(r.get(r.type === 'DIMSTYLE' ? 105 : 5));   // cập nhật maxH
    let seed = Math.max(maxH + 1, parseInt(hvs('$HANDSEED', 5, '0'), 16) || 0, 0x30);
    const newH = () => seed++;

    // ---- tra cứu theo tên ----
    const byName = (tname, hcode) => { const m = new Map(); for(const r of ((tables[tname] || {}).recs || [])) m.set(up(r.get(2)), ref(r.get(hcode || 5))); return m; };
    const LAYERS = byName('LAYER'), LTYPES = byName('LTYPE'), STYLES = byName('STYLE'), DIMSTYLES = byName('DIMSTYLE', 105), BLOCKREC = byName('BLOCK_RECORD');
    const hLayer0 = LAYERS.get('0') || 0, hStd = STYLES.get('STANDARD') || 0, hDimStd = DIMSTYLES.get('STANDARD') || 0;
    const hLtByLayer = LTYPES.get('BYLAYER') || 0, hLtByBlock = LTYPES.get('BYBLOCK') || 0, hLtCont = LTYPES.get('CONTINUOUS') || 0;
    const hMS = BLOCKREC.get('*MODEL_SPACE') || 0, hPS = BLOCKREC.get('*PAPER_SPACE') || 0;
    const nodItems = new Map(); if(nodRec){ const p = nodRec.plain(); let k = null; for(const x of p.g){ if(x[0] === 3) k = x[1]; else if((x[0] === 350 || x[0] === 360) && k != null){ nodItems.set(k, ref(x[1])); k = null; } } }
    const hMlStd = (() => { const r = objsDxf.find(o => o.type === 'MLINESTYLE'); return r ? ref(r.get(5)) : 0; })();

    /* ---------- đối tượng đầu ra ---------- */
    const out = [], PRIV = {};
    const APPIDS = byName('APPID');
    // EED (XDATA 1001…): BS cỡ + H appid + các mục (RC mã: 0 chuỗi = RC dài + RS_BE trang mã + byte; 70 RS; 71 RL; 40 RD; 2 ngoặc)
    function eedOf(r){ const L = []; let cur = null;
      for(const [c, v] of (r ? r.g : [])){
        if(c === 1001){ const h = APPIDS.get(up(v)); cur = h ? { h, w: new BW(64) } : null; if(cur) L.push(cur); continue; }
        if(!cur || c < 1000) continue; const w = cur.w;
        if(c === 1000){ const b = tvBytes(v).slice(0, 255); w.RC(c - 1000); w.RC(b.length); w.RC(0); w.RC(30); w.TF(b); }
        else if(c === 1002){ w.RC(2); w.RC(String(v).trim() === '}' ? 1 : 0); }
        else if(c === 1070){ w.RC(70); w.RS(parseInt(v, 10) || 0); }
        else if(c === 1071){ w.RC(71); w.RL(parseInt(v, 10) || 0); }
        else if(c >= 1040 && c <= 1042){ w.RC(c - 1000); w.RD(parseFloat(v) || 0); }
      }
      return L.filter(x => x.w.p); }
    const obj = (type, h, src) => { const o = { type, h, d: new BW(64), hd: new BW(32) }; o.d.H(0, h);
      for(const x of eedOf(src)){ o.d.BS(x.w.byte); o.d.H(5, x.h); o.d.append(x.w); }
      o.d.BS(0); out.push(o); return o; };
    const objCommon = (o, owner, reactors, xdic) => { o.d.BL(reactors.length); o.hd.H(4, owner); for(const r of reactors) o.hd.H(4, r); o.hd.H(3, xdic || 0); };
    const tableRec = (o, owner, name) => { objCommon(o, owner, []); o.d.TV(name); o.d.B(1); o.d.BS(0); o.d.B(0); o.hd.H(5, 0); };
    const reactorsOf = r => r.group102('ACAD_REACTORS').map(ref).filter(Boolean);

    // ---- đối tượng điều khiển bảng ----
    const ctrl = (type, h, bl, entries, more) => { const o = obj(type, h); objCommon(o, 0, []); if(bl) o.d.BL(entries.length); else o.d.BS(entries.length); if(more) more.pre(o); for(const e of entries) o.hd.H(2, e); if(more) more.post(o); return o; };
    const recsOf = n => ((tables[n] || {}).recs || []);
    const blockRecs = recsOf('BLOCK_RECORD');
    ctrl(T.BLOCK_CONTROL, 1, true, blockRecs.map(r => ref(r.get(5))).filter(h => h !== hMS && h !== hPS), { pre(){}, post(o){ o.hd.H(3, hMS); o.hd.H(3, hPS); } });
    ctrl(T.LAYER_CONTROL, 2, true, recsOf('LAYER').map(r => ref(r.get(5))));
    ctrl(T.STYLE_CONTROL, 3, true, recsOf('STYLE').map(r => ref(r.get(5))));
    ctrl(T.LTYPE_CONTROL, 5, false, recsOf('LTYPE').map(r => ref(r.get(5))).filter(h => h !== hLtByLayer && h !== hLtByBlock), { pre(){}, post(o){ o.hd.H(3, hLtByBlock); o.hd.H(3, hLtByLayer); } });
    ctrl(T.VIEW_CONTROL, 6, true, []);
    ctrl(T.UCS_CONTROL, 7, false, []);
    ctrl(T.VPORT_CONTROL, 8, false, recsOf('VPORT').map(r => ref(r.get(5))));
    ctrl(T.APPID_CONTROL, 9, false, recsOf('APPID').map(r => ref(r.get(5))));
    { const dsH = (tables.DIMSTYLE ? tables.DIMSTYLE.head.after('AcDbDimStyleTable').all(340) : []).map(ref).filter(Boolean);
      ctrl(T.DIMSTYLE_CONTROL, 0xA, false, recsOf('DIMSTYLE').map(r => ref(r.get(105))), { pre(o){ o.d.RC(dsH.length); }, post(o){ for(const h of dsH) o.hd.H(5, h); } }); }
    ctrl(T.VX_CONTROL, H_VX, false, []);

    // ---- bản ghi bảng ----
    for(const r of recsOf('LAYER')){
      const o = obj(T.LAYER, ref(r.get(5))); tableRec(o, 2, r.get(2, '0'));
      const fl = r.int(70), c = r.int(62, 7), off = c < 0, lw = lwIndex(r.has(370) ? r.int(370) : -3);
      o.d.BS((fl & 1 ? 1 : 0) | (off ? 2 : 0) | (fl & 2 ? 4 : 0) | (fl & 4 ? 8 : 0) | (r.int(290, 1) ? 16 : 0) | ((lw & 0x1f) << 5));
      o.d.CMC(off ? (-Math.abs(c)) & 0xffff : Math.abs(c) || 7);
      o.hd.H(5, ref(r.get(390))); o.hd.H(5, LTYPES.get(up(r.get(6, 'Continuous'))) || hLtCont);
    }
    for(const r of recsOf('STYLE')){
      const o = obj(T.STYLE, ref(r.get(5))); tableRec(o, 3, r.get(2, '')); const fl = r.int(70);
      o.d.B(fl & 1); o.d.B(fl & 4); o.d.BD(r.num(40)); o.d.BD(r.num(41, 1)); o.d.BD(r.num(50) * D2R); o.d.RC(r.int(71)); o.d.BD(r.num(42, 2.5)); o.d.TV(r.get(3, '')); o.d.TV(r.get(4, ''));
    }
    for(const r of recsOf('LTYPE')){
      const o = obj(T.LTYPE, ref(r.get(5))); tableRec(o, 5, r.get(2, ''));
      // các nét: 49 chiều dài, 74 cờ (2 chữ, 4 hình, 1 góc tuyệt đối), 75 số hình, 340 kiểu chữ, 46 tỉ lệ, 50 góc, 44/45 lệch, 9 chữ
      const dashes = []; let d = null;
      for(const x of r.g){ const c = x[0], v = x[1];
        if(c === 49){ d = { len: parseFloat(v) || 0, fl: 0, sh: 0, st: 0, sc: 1, rot: 0, x: 0, y: 0, txt: '' }; dashes.push(d); }
        else if(d){ if(c === 74) d.fl = parseInt(v, 10) || 0; else if(c === 75) d.sh = parseInt(v, 10) || 0; else if(c === 340) d.st = ref(v); else if(c === 46) d.sc = parseFloat(v) || 1; else if(c === 50) d.rot = (parseFloat(v) || 0) * D2R; else if(c === 44) d.x = parseFloat(v) || 0; else if(c === 45) d.y = parseFloat(v) || 0; else if(c === 9) d.txt = v; } }
      const area = new Uint8Array(256); let ap = 0;
      for(const q of dashes) if(q.fl & 2){ q.sh = ap; const b = tvBytes(q.txt); for(const x of b){ if(ap < 255) area[ap++] = x; } if(ap < 256) area[ap++] = 0; }
      o.d.TV(r.get(3, '')); o.d.BD(r.num(40, dashes.reduce((a, q) => a + Math.abs(q.len), 0))); o.d.RC(r.int(72, 65)); o.d.RC(dashes.length);
      for(const q of dashes){ o.d.BD(q.len); o.d.BS(q.sh); o.hd.H(5, q.st); o.d.RD(q.x); o.d.RD(q.y); o.d.BD(q.sc); o.d.BD(q.rot); o.d.BS(q.fl); }
      o.d.TF(area);
    }
    for(const r of recsOf('VPORT')){
      const o = obj(T.VPORT, ref(r.get(5))); tableRec(o, 8, r.get(2, '*Active'));
      const vs = r.num(40, 100), ar = r.num(41, 1.6);
      o.d.BD(vs); o.d.BD(vs * ar); o.d.RD2([r.num(12), r.num(22)]); o.d.BD3(r.pt(17)); o.d.BD3([r.num(16), r.num(26), r.num(36, 1)]);
      o.d.BD(r.num(51) * D2R); o.d.BD(r.num(42, 50)); o.d.BD(r.num(43)); o.d.BD(r.num(44)); o.d.B4(r.int(71)); o.d.RC(r.int(281));
      o.d.RD2([r.num(10), r.num(20)]); o.d.RD2([r.num(11, 1), r.num(21, 1)]); o.d.B(r.int(71) & 8); o.d.BS(r.int(72, 1000)); o.d.B(r.int(73, 1)); o.d.BB(r.int(74, 3));
      o.d.B(r.int(76)); o.d.RD2([r.num(15, 10), r.num(25, 10)]); o.d.B(r.int(75)); o.d.B(r.int(77)); o.d.BS(r.int(78)); o.d.BD(r.num(50) * D2R); o.d.RD2([r.num(13), r.num(23)]); o.d.RD2([r.num(14, 10), r.num(24, 10)]);
      o.d.B(0); o.d.B(r.int(65, 1)); o.d.BD3(r.pt(110)); o.d.BD3([r.num(111, 1), r.num(121), r.num(131)]); o.d.BD3([r.num(112), r.num(122, 1), r.num(132)]); o.d.BD(r.num(146)); o.d.BS(r.int(79));
      o.hd.H(5, 0); o.hd.H(5, 0);
    }
    for(const r of recsOf('APPID')){ const o = obj(T.APPID, ref(r.get(5))); tableRec(o, 9, r.get(2, '')); o.d.RC(0); }
    for(const r of recsOf('DIMSTYLE')){
      const o = obj(T.DIMSTYLE, ref(r.get(105))); tableRec(o, 0xA, r.get(2, 'Standard'));
      const dt = r.num(140, metric ? 2.5 : 0.18), N = (c, d) => r.num(c, d), I = (c, d) => r.int(c, d);
      o.d.TV(r.get(3, '')); o.d.TV(r.get(4, ''));
      for(const [c, d] of [[40, 1], [41, metric ? 2.5 : 0.18], [42, metric ? 0.625 : 0.0625], [43, metric ? 3.75 : 0.38], [44, metric ? 1.25 : 0.18], [45, 0], [46, 0], [47, 0], [48, 0]]) o.d.BD(N(c, d));
      for(const [c, d] of [[71, 0], [72, 0], [73, metric ? 0 : 1], [74, metric ? 0 : 1], [75, 0], [76, 0]]) o.d.B(I(c, d));
      o.d.BS(I(77, metric ? 1 : 0)); o.d.BS(I(78, metric ? 8 : 0)); o.d.BS(I(79, 0));
      o.d.BD(dt); o.d.BD(N(141, metric ? 2.5 : 0.09)); o.d.BD(N(142, 0)); o.d.BD(N(143, 25.4)); o.d.BD(N(144, 1)); o.d.BD(N(145, 0)); o.d.BD(N(146, 1)); o.d.BD(N(147, metric ? 0.625 : 0.09)); o.d.BD(N(148, 0));
      o.d.B(I(170, 0)); o.d.BS(I(171, 2)); o.d.B(I(172, metric ? 1 : 0)); o.d.B(I(173, 0)); o.d.B(I(174, 0)); o.d.B(I(175, 0));
      o.d.CMC(I(176, 0)); o.d.CMC(I(177, 0)); o.d.CMC(I(178, 0));
      o.d.BS(I(179, 0)); o.d.BS(I(271, metric ? 2 : 4)); o.d.BS(I(272, metric ? 2 : 4)); o.d.BS(I(273, 2)); o.d.BS(I(274, 2)); o.d.BS(I(275, 0)); o.d.BS(I(276, 0)); o.d.BS(I(277, 2)); o.d.BS(I(278, metric ? 44 : 46)); o.d.BS(I(279, 0)); o.d.BS(I(280, 0));
      o.d.B(I(281, 0)); o.d.B(I(282, 0)); o.d.BS(I(283, 1)); o.d.BS(I(284, metric ? 8 : 0)); o.d.BS(I(285, 0)); o.d.BS(I(286, 0)); o.d.B(I(288, 0)); o.d.BS(I(289, 3));
      o.hd.H(5, ref(r.get(340)) || hStd);
      o.d.BS(I(371, -2) & 0xffff); o.d.BS(I(372, -2) & 0xffff); o.d.B(0);
      o.hd.H(5, 0); o.hd.H(5, 0); o.hd.H(5, 0); o.hd.H(5, 0);
    }

    /* ---------- thực thể: gom theo khối ---------- */
    const SUP = new Set(['LINE', 'CIRCLE', 'ARC', 'POINT', 'LWPOLYLINE', 'TEXT', 'MTEXT', 'SOLID', '3DFACE', 'ELLIPSE', 'XLINE', 'RAY', 'HATCH', 'INSERT', 'ATTDEF', 'DIMENSION', 'WIPEOUT']);
    const blocks = []; { let cur = null;
      for(const r of (S.BLOCKS || [])){
        if(r.type === 'BLOCK'){ cur = { blk: r, ents: [], end: null, br: ref(r.plain().get(330)) }; blocks.push(cur); continue; }
        if(r.type === 'ENDBLK'){ if(cur) cur.end = r; cur = null; continue; }
        if(cur) cur.ents.push(r);
      } }
    const ownerOf = r => ref(r.plain().get(330));
    const brEnts = new Map(); for(const b of blocks) brEnts.set(b.br, b.ents.slice());
    if(!brEnts.has(hMS)) brEnts.set(hMS, []); if(!brEnts.has(hPS)) brEnts.set(hPS, []);
    { let lastOw = hMS;   // ATTRIB / SEQEND (chủ = INSERT) đi theo INSERT đứng trước
      for(const r of (S.ENTITIES || [])){ const ow = (r.type === 'ATTRIB' || r.type === 'SEQEND') ? lastOw : r.int(67) === 1 ? hPS : (ownerOf(r) || hMS); lastOw = ow; if(!brEnts.has(ow)) brEnts.set(ow, []); brEnts.get(ow).push(r); } }
    // thực thể chính của mỗi khối + ATTRIB/SEQEND gắn vào INSERT
    const entH = new Set(), blockInfo = new Map();
    for(const [br, list] of brEnts){
      const main = [], attOf = new Map(); let lastIns = null;
      for(const r of list){
        if(r.type === 'ATTRIB' || r.type === 'SEQEND'){ if(lastIns){ const a = attOf.get(lastIns) || { atts: [], seq: 0 }; attOf.set(lastIns, a); if(r.type === 'ATTRIB') a.atts.push(r); else { a.seq = r; lastIns = null; } } continue; }
        if(!SUP.has(r.type)) continue;
        if(r.type === 'HATCH' && !r.has(91)) continue;
        main.push(r); lastIns = r.type === 'INSERT' && r.int(66) === 1 ? r : null;
      }
      for(const r of main){ entH.add(ref(r.get(5))); }
      blockInfo.set(br, { main, attOf });
    }

    // ---- BLOCK_HEADER + BLOCK/ENDBLK ----
    const blkOfBr = new Map(); for(const b of blocks) blkOfBr.set(b.br, b);
    for(const r of blockRecs){
      const h = ref(r.get(5)), name = r.get(2, ''), b = blkOfBr.get(h), info = blockInfo.get(h) || { main: [] };
      const fl = b ? b.blk.int(70) : 0; const base = b ? b.blk.pt(10) : [0, 0, 0];
      let hB = b ? ref(b.blk.get(5)) : 0, hE = b && b.end ? ref(b.end.get(5)) : 0; if(!hB) hB = newH(); if(!hE) hE = newH();
      const o = obj(T.BLOCK_HEADER, h); tableRec(o, 1, name);
      o.d.B(fl & 1); o.d.B(fl & 2); o.d.B(fl & 4); o.d.B(fl & 8); o.d.B(0); o.d.BD3(base); o.d.TV(b ? b.blk.get(1, '') : ''); o.d.RC(0); o.d.TV(b ? b.blk.get(4, '') : ''); o.d.BL(0);
      const first = info.main.length ? ref(info.main[0].get(5)) : 0, last = info.main.length ? ref(info.main[info.main.length - 1].get(5)) : 0;
      o.hd.H(3, hB); o.hd.H(4, first); o.hd.H(4, last); o.hd.H(3, hE); o.hd.H(5, ref(r.get(340)));
      const mode = h === hMS ? 2 : h === hPS ? 1 : 0;
      const ly = b ? (LAYERS.get(up(b.blk.get(8, '0'))) || hLayer0) : hLayer0;
      const eb = obj(T.BLOCK, hB); entCommon(eb, { mode, owner: h, layer: ly }); eb.d.TV(name);
      const ee = obj(T.ENDBLK, hE); entCommon(ee, { mode, owner: h, layer: b && b.end ? (LAYERS.get(up(b.end.get(8, '0'))) || hLayer0) : hLayer0 });
      // thực thể của khối, nối trước / sau
      info.main.forEach((e, i) => { const pv = i ? ref(info.main[i - 1].get(5)) : 0, nx = i + 1 < info.main.length ? ref(info.main[i + 1].get(5)) : 0;
        entity(e, { mode, owner: h, prev: pv, next: nx }, info.attOf.get(e)); });
    }

    /* ---------- thuộc tính chung của thực thể ---------- */
    function entProps(r){ const p = r.plain(); const lt = p.get(6);
      let ltf = 0, lth = 0; if(lt != null){ const u = up(lt); if(u === 'BYLAYER') ltf = 0; else if(u === 'BYBLOCK') ltf = 1; else if(u === 'CONTINUOUS') ltf = 2; else { lth = LTYPES.get(u) || 0; ltf = lth ? 3 : 0; } }
      return { layer: LAYERS.get(up(p.get(8, '0'))) || hLayer0, color: p.has(62) ? p.int(62) : 256, ltf, lth, lts: p.num(48, 1), lw: lwIndex(p.has(370) ? p.int(370) : -1), inv: p.int(60) }; }
    function entCommon(o, c){
      const P = c.props || { layer: c.layer || hLayer0, color: 256, ltf: 0, lth: 0, lts: 1, lw: 29, inv: 0 };
      o.d.B(0); o.d.BB(c.mode); o.d.BL(0); o.d.B(0); o.d.CMC(P.color & 0xffff); o.d.BD(P.lts); o.d.BB(P.ltf); o.d.BB(0); o.d.BS(P.inv); o.d.RC(P.lw);
      if(c.mode === 0) o.hd.H(4, c.owner); o.hd.H(3, 0); o.hd.H(4, c.prev || 0); o.hd.H(4, c.next || 0); o.hd.H(5, P.layer); if(P.ltf === 3) o.hd.H(5, P.lth);
    }
    function styleH(r){ return STYLES.get(up(r.get(7, 'Standard'))) || hStd; }
    function textData(o, r, sub2){   // TEXT / ATTRIB / ATTDEF (R2000: dataflags)
      const ins = r.pt(10), al = r.has(11) ? r.pt(11) : ins.slice(), hj = r.int(72), vj = sub2.int(sub2 === r ? 73 : 74), rot = r.num(50) * D2R, wf = r.num(41, 1), ob = r.num(51) * D2R, gen = r.int(71);
      let df = 0xff; if(ins[2] !== 0) df &= ~1; if(al[0] !== ins[0] || al[1] !== ins[1] || hj || vj) df &= ~2; if(ob) df &= ~4; if(rot) df &= ~8; if(wf !== 1) df &= ~0x10; if(gen) df &= ~0x20; if(hj) df &= ~0x40; if(vj) df &= ~0x80;
      o.d.RC(df); if(!(df & 1)) o.d.RD(ins[2]); o.d.RD2(ins); if(!(df & 2)){ o.d.DD(al[0], ins[0]); o.d.DD(al[1], ins[1]); }
      o.d.BE([r.num(210), r.num(220), r.num(230, 1)]); o.d.BT(r.num(39));
      if(!(df & 4)) o.d.RD(ob); if(!(df & 8)) o.d.RD(rot); o.d.RD(r.num(40, 2.5)); if(!(df & 0x10)) o.d.RD(wf);
      o.d.TV(r.get(1, '')); if(!(df & 0x20)) o.d.BS(gen); if(!(df & 0x40)) o.d.BS(hj); if(!(df & 0x80)) o.d.BS(vj);
    }

    // dữ liệu riêng DVDCAD (XDATA "DVDCAD" từng đối tượng) — DVDCAD đọc lại từ khối DVDCADX1 (bộ đọc DWG trong trình duyệt không đọc được EED R2000)
    function keepX(r, h){ let on = false; const it = []; for(const [c, v] of r.g){ if(c === 1001){ on = up(v) === 'DVDCAD'; continue; } if(on && c >= 1000) it.push([c, v]); } if(it.length) PRIV[h.toString(16).toUpperCase()] = it; }
    function entity(r, link, att){
      const h = ref(r.get(5)), P = entProps(r), c = Object.assign({ props: P }, link); let o; keepX(r, h);
      const t = r.type;
      if(t === 'LINE'){ o = obj(T.LINE, h, r); entCommon(o, c); const a = r.pt(10), b = r.pt(11); const zz = a[2] === 0 && b[2] === 0;
        o.d.B(zz); o.d.RD(a[0]); o.d.DD(b[0], a[0]); o.d.RD(a[1]); o.d.DD(b[1], a[1]); if(!zz){ o.d.RD(a[2]); o.d.DD(b[2], a[2]); } o.d.BT(r.num(39)); o.d.BE([r.num(210), r.num(220), r.num(230, 1)]); }
      else if(t === 'CIRCLE' || t === 'ARC'){ o = obj(t === 'ARC' ? T.ARC : T.CIRCLE, h, r); entCommon(o, c); o.d.BD3(r.pt(10)); o.d.BD(r.num(40)); o.d.BT(r.num(39)); o.d.BE([r.num(210), r.num(220), r.num(230, 1)]);
        if(t === 'ARC'){ o.d.BD(r.num(50) * D2R); o.d.BD(r.num(51) * D2R); } }
      else if(t === 'POINT'){ o = obj(T.POINT, h, r); entCommon(o, c); const p = r.pt(10); o.d.BD(p[0]); o.d.BD(p[1]); o.d.BD(p[2]); o.d.BT(r.num(39)); o.d.BE([r.num(210), r.num(220), r.num(230, 1)]); o.d.BD(r.num(50) * D2R); }
      else if(t === 'LWPOLYLINE'){ o = obj(T.LWPOLYLINE, h, r); entCommon(o, c);
        const V = []; let v = null; for(const x of r.g){ const k = x[0], val = parseFloat(x[1]) || 0; if(k === 10){ v = { x: val, y: 0, sw: 0, ew: 0, b: 0 }; V.push(v); } else if(v){ if(k === 20) v.y = val; else if(k === 40) v.sw = val; else if(k === 41) v.ew = val; else if(k === 42) v.b = val; } }
        const f70 = r.int(70), cw = r.num(43), hasB = V.some(q => q.b), hasW = V.some(q => q.sw || q.ew);
        let fl = 0; if(f70 & 1) fl |= 512; if(f70 & 128) fl |= 256; if(cw) fl |= 4; if(r.num(38)) fl |= 8; if(r.num(39)) fl |= 2; if(hasB) fl |= 16; if(hasW) fl |= 32;
        o.d.BS(fl); if(fl & 4) o.d.BD(cw); if(fl & 8) o.d.BD(r.num(38)); if(fl & 2) o.d.BD(r.num(39));
        o.d.BL(V.length); if(hasB) o.d.BL(V.length); if(hasW) o.d.BL(V.length);
        V.forEach((q, i) => { if(!i) o.d.RD2([q.x, q.y]); else { o.d.DD(q.x, V[i - 1].x); o.d.DD(q.y, V[i - 1].y); } });
        if(hasB) for(const q of V) o.d.BD(q.b); if(hasW) for(const q of V){ o.d.BD(q.sw); o.d.BD(q.ew); } }
      else if(t === 'WIPEOUT'){ o = obj(503, h, r); entCommon(o, c);   // như IMAGE: gốc, vector u/v của 1 điểm ảnh, cỡ ảnh, khung cắt (toạ độ điểm ảnh)
        const V = []; let k = null; for(const x of r.g){ if(x[0] === 14) k = [parseFloat(x[1]) || 0, 0]; else if(x[0] === 24 && k){ k[1] = parseFloat(x[1]) || 0; V.push(k); k = null; } }
        o.d.BL(r.int(90)); o.d.BD3(r.pt(10)); o.d.BD3(r.pt(11)); o.d.BD3(r.pt(12)); o.d.RD2([r.num(13, 1), r.num(23, 1)]);
        o.d.BS(r.int(70, 7)); o.d.B(r.int(280, 1)); o.d.RC(r.int(281, 50)); o.d.RC(r.int(282, 50)); o.d.RC(r.int(283, 0));
        const ct = V.length === 2 ? 1 : 2; o.d.BS(ct); if(ct === 2) o.d.BL(V.length); for(const q of V) o.d.RD2(q);
        o.hd.H(5, 0); o.hd.H(3, 0); }
      else if(t === 'TEXT'){ o = obj(T.TEXT, h, r); entCommon(o, c); textData(o, r, r); o.hd.H(5, styleH(r)); }
      else if(t === 'ATTDEF'){ o = obj(T.ATTDEF, h, r); entCommon(o, c); const s2 = r.after('AcDbAttributeDefinition'); textData(o, r, s2);
        o.d.TV(s2.get(2, '')); o.d.BS(s2.int(73)); o.d.RC(s2.int(70)); o.d.TV(s2.get(3, '')); o.hd.H(5, styleH(r)); }
      else if(t === 'MTEXT'){ o = obj(T.MTEXT, h, r); entCommon(o, c); const txt = r.all(3).join('') + r.get(1, ''); const ht = r.num(40, 2.5), lines = txt.split('\\P').length;
        o.d.BD3(r.pt(10)); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.BD3(r.has(11) ? r.pt(11) : [1, 0, 0]); o.d.BD(r.num(41)); o.d.BD(ht); o.d.BS(r.int(71, 1)); o.d.BS(r.int(72, 1));
        o.d.BD(ht * (lines * 1.6667 - 0.6667)); o.d.BD(Math.max(...txt.split('\\P').map(s => s.length), 1) * ht * 0.7); o.d.TV(txt); o.hd.H(5, styleH(r)); o.d.BS(r.int(73, 1)); o.d.BD(r.num(44, 1)); o.d.B(0); }
      else if(t === 'SOLID'){ o = obj(T.SOLID, h, r); entCommon(o, c); o.d.BT(r.num(39)); o.d.BD(r.num(30)); for(const k of [10, 11, 12, 13]) o.d.RD2([r.num(k), r.num(k + 10)]); o.d.BE([r.num(210), r.num(220), r.num(230, 1)]); }
      else if(t === '3DFACE'){ o = obj(T.FACE3D, h, r); entCommon(o, c); const q = [10, 11, 12, 13].map(k => r.pt(k)); const inv = r.int(70);
        o.d.B(inv ? 0 : 1); const zz = q[0][2] === 0; o.d.B(zz); o.d.RD(q[0][0]); o.d.RD(q[0][1]); if(!zz) o.d.RD(q[0][2]);
        for(let i = 1; i < 4; i++) for(let k = 0; k < 3; k++) o.d.DD(q[i][k], q[i - 1][k]); if(inv) o.d.BS(inv); }
      else if(t === 'ELLIPSE'){ o = obj(T.ELLIPSE, h, r); entCommon(o, c); o.d.BD3(r.pt(10)); o.d.BD3(r.pt(11)); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.BD(r.num(40, 1)); o.d.BD(r.num(41)); o.d.BD(r.num(42, Math.PI * 2)); }
      else if(t === 'XLINE' || t === 'RAY'){ o = obj(t === 'RAY' ? T.RAY : T.XLINE, h, r); entCommon(o, c); o.d.BD3(r.pt(10)); o.d.BD3(r.pt(11)); }
      else if(t === 'HATCH'){ o = obj(T.HATCH, h, r); entCommon(o, c); hatch(o, r.after('AcDbHatch')); }
      else if(t === 'INSERT'){ o = obj(T.INSERT, h, r); entCommon(o, c);
        const s = [r.num(41, 1), r.num(42, 1), r.num(43, 1)]; o.d.BD3(r.pt(10));
        if(s[0] === 1 && s[1] === 1 && s[2] === 1) o.d.BB(3);
        else if(s[0] === s[1] && s[0] === s[2]){ o.d.BB(2); o.d.RD(s[0]); }
        else if(s[0] === 1){ o.d.BB(1); o.d.DD(s[1], 1); o.d.DD(s[2], 1); }
        else { o.d.BB(0); o.d.RD(s[0]); o.d.DD(s[1], s[0]); o.d.DD(s[2], s[0]); }
        o.d.BD(r.num(50) * D2R); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); const A = att && att.atts.length ? att : null; o.d.B(A ? 1 : 0);
        o.hd.H(5, BLOCKREC.get(up(r.get(2))) || 0);
        if(A){ const hs = A.atts.map(a => ref(a.get(5))); let hq = A.seq ? ref(A.seq.get(5)) : 0; if(!hq) hq = newH();
          o.hd.H(4, hs[0]); o.hd.H(4, hs[hs.length - 1]); o.hd.H(3, hq);
          A.atts.forEach((a, i) => { const oa = obj(T.ATTRIB, hs[i]); entCommon(oa, { props: entProps(a), mode: 0, owner: h, prev: i ? hs[i - 1] : 0, next: i + 1 < hs.length ? hs[i + 1] : 0 });
            const s2 = a.after('AcDbAttribute'); textData(oa, a, s2); oa.d.TV(s2.get(2, '')); oa.d.BS(s2.int(73)); oa.d.RC(s2.int(70)); oa.hd.H(5, styleH(a)); });
          const os = obj(T.SEQEND, hq); entCommon(os, { props: A.seq ? entProps(A.seq) : P, mode: 0, owner: h }); } }
      else if(t === 'DIMENSION'){ dimension(r, h, c); return; }
      return o;
    }
    function hatch(o, r){
      const g = r.g; let i = 0; const nx = c => { while(i < g.length && g[i][0] !== c) i++; return i < g.length ? g[i++][1] : null; };
      const num = v => parseFloat(v) || 0, int = v => parseInt(v, 10) || 0;
      const solid = r.int(70) === 1;
      o.d.BD(r.num(30)); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.TV(r.get(2, 'SOLID')); o.d.B(solid); o.d.B(r.int(71));
      const np = int(nx(91)); o.d.BL(np); let derived = false; const bh = [];
      for(let p = 0; p < np; p++){
        const fl = int(nx(92)); o.d.BL(fl); if(fl & 4) derived = true;
        if(fl & 2){ const hasB = int(g[i] && g[i][0] === 72 ? g[i++][1] : 0), cl = int(g[i] && g[i][0] === 73 ? g[i++][1] : 1), n = int(nx(93));
          o.d.B(hasB); o.d.B(cl); o.d.BL(n);
          for(let k = 0; k < n; k++){ const x = num(nx(10)), y = num(nx(20)); o.d.RD2([x, y]); if(hasB){ const b = g[i] && g[i][0] === 42 ? num(g[i++][1]) : 0; o.d.BD(b); } } }
        else { const n = int(nx(93)); o.d.BL(n);
          for(let k = 0; k < n; k++){ const ty = int(nx(72)); o.d.RC(ty);
            if(ty === 1){ o.d.RD2([num(nx(10)), num(nx(20))]); o.d.RD2([num(nx(11)), num(nx(21))]); }
            else if(ty === 2){ o.d.RD2([num(nx(10)), num(nx(20))]); o.d.BD(num(nx(40))); o.d.BD(num(nx(50)) * D2R); o.d.BD(num(nx(51)) * D2R); o.d.B(int(nx(73))); }
            else if(ty === 3){ o.d.RD2([num(nx(10)), num(nx(20))]); o.d.RD2([num(nx(11)), num(nx(21))]); o.d.BD(num(nx(40))); o.d.BD(num(nx(50)) * D2R); o.d.BD(num(nx(51)) * D2R); o.d.B(int(nx(73))); }
            else { o.d.RD2([0, 0]); o.d.RD2([0, 0]); } } }
        const nb = int(nx(97)); o.d.BL(nb); for(let k = 0; k < nb; k++) bh.push(ref(nx(330)));
      }
      o.d.BS(int(nx(75))); o.d.BS(int(nx(76)) || 1);
      if(!solid){ o.d.BD(num(nx(52)) * D2R); o.d.BD(num(nx(41)) || 1); o.d.B(int(nx(77))); const nl = int(nx(78)); o.d.BS(nl);
        for(let k = 0; k < nl; k++){ o.d.BD(num(nx(53)) * D2R); o.d.BD2([num(nx(43)), num(nx(44))]); o.d.BD2([num(nx(45)), num(nx(46))]); const nd = int(nx(79)); o.d.BS(nd); for(let q = 0; q < nd; q++) o.d.BD(num(nx(49))); } }
      if(derived) o.d.BD(r.num(47, 1));
      o.d.BL(0);
      for(const b of bh) o.hd.H(4, b);
    }
    function dimension(r, h, c){
      const ty = r.int(70) & 7, t11 = r.pt(11), def = r.pt(10);
      const D = { 0: T.DIM_LIN, 1: T.DIM_ALI, 3: T.DIM_DIA, 4: T.DIM_RAD, 5: T.DIM_ANG3 }[ty]; if(!D) return;
      const o = obj(D, h, r); entCommon(o, c);
      const s = r.g.some(x => x[0] === 100 && x[1] === 'AcDbAlignedDimension') ? r.after('AcDbAlignedDimension') : r.after('AcDb3PointAngularDimension').g.length ? r.after('AcDb3PointAngularDimension') : r.after('AcDbRadialDimension').g.length ? r.after('AcDbRadialDimension') : r.after('AcDbDiametricDimension');
      const p13 = s.pt(13), p14 = s.pt(14), p15 = s.pt(15), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      let meas = 0; const rot = s.num(50) * D2R;
      if(D === T.DIM_LIN) meas = Math.abs((p14[0] - p13[0]) * Math.cos(rot) + (p14[1] - p13[1]) * Math.sin(rot));
      else if(D === T.DIM_ALI) meas = dist(p13, p14);
      else if(D === T.DIM_RAD) meas = dist(def, p15);
      else if(D === T.DIM_DIA) meas = dist(def, p15);
      else { let a = Math.atan2(p14[1] - p15[1], p14[0] - p15[0]) - Math.atan2(p13[1] - p15[1], p13[0] - p15[0]); a = Math.abs(a) % (Math.PI * 2); meas = a > Math.PI ? Math.PI * 2 - a : a; }
      o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.RD2(t11); o.d.BD(t11[2]); o.d.RC((r.int(70) & 128 ? 0 : 1) | 2);
      o.d.TV(r.get(1, '')); o.d.BD(r.num(53) * D2R); o.d.BD(r.num(51) * D2R); o.d.BD3([1, 1, 1]); o.d.BD(r.num(54) * D2R);
      o.d.BS(r.int(71, 5)); o.d.BS(r.int(72, 1)); o.d.BD(r.num(41, 1)); o.d.BD(r.num(42, meas)); o.d.RD2([r.num(12), r.num(22)]);
      if(D === T.DIM_LIN || D === T.DIM_ALI){ o.d.BD3(p13); o.d.BD3(p14); o.d.BD3(def); o.d.BD(s.num(52) * D2R); if(D === T.DIM_LIN) o.d.BD(rot); }
      else if(D === T.DIM_ANG3){ o.d.BD3(def); o.d.BD3(p13); o.d.BD3(p14); o.d.BD3(p15); }
      else if(D === T.DIM_RAD){ o.d.BD3(def); o.d.BD3(p15); o.d.BD(s.num(40)); }
      else { o.d.BD3(p15); o.d.BD3(def); o.d.BD(s.num(40)); }
      o.hd.H(5, DIMSTYLES.get(up(r.get(3, 'Standard'))) || hDimStd); o.hd.H(5, BLOCKREC.get(up(r.get(2))) || 0);
    }

    /* ---------- OBJECTS: từ điển, layout, kiểu đa tuyến, XRECORD… ---------- */
    const outObjH = new Set([H_NOD]); const keep = [];
    { const dropped = new Set(); let changed = true; const isEnt = h => entH.has(h);
      const cand = objsDxf.filter(r => ['DICTIONARY', 'ACDBDICTIONARYWDFLT', 'ACDBPLACEHOLDER', 'MLINESTYLE', 'LAYOUT', 'XRECORD'].includes(r.type) || (hasWipe && r.type === 'WIPEOUTVARIABLES'));
      for(const r of objsDxf) if(!cand.includes(r)) dropped.add(ref(r.get(5)));
      while(changed){ changed = false; for(const r of cand){ const h = ref(r.get(5)); if(dropped.has(h)) continue; const ow = ref(r.plain().get(330)); if(h !== H_NOD && (isEnt(ow) || dropped.has(ow))){ dropped.add(h); changed = true; } } }
      for(const r of cand){ const h = ref(r.get(5)); if(!dropped.has(h)){ keep.push(r); outObjH.add(h); } } }
    for(const r of keep){
      const h = ref(r.get(5)), p = r.plain(), owner = h === H_NOD ? 0 : ref(p.get(330)), rx = h === H_NOD ? [] : reactorsOf(r);
      if(r.type === 'DICTIONARY' || r.type === 'ACDBDICTIONARYWDFLT'){
        const o = obj(r.type === 'DICTIONARY' ? T.DICT : T.DICTWDFLT, h); objCommon(o, owner, rx);
        const items = []; let k = null; for(const x of p.g){ if(x[0] === 3) k = x[1]; else if((x[0] === 350 || x[0] === 360) && k != null){ const v = ref(x[1]); if(outObjH.has(v) || entH.has(v)) items.push([k, v]); k = null; } }
        o.d.BL(items.length); o.d.BS(p.int(281, 1)); o.d.RC(p.int(280, 0)); for(const [n] of items) o.d.TV(n); for(const [, v] of items) o.hd.H(2, v);
        if(r.type === 'ACDBDICTIONARYWDFLT') o.hd.H(5, ref(r.after('AcDbDictionaryWithDefault').get(340)));
      }
      else if(r.type === 'ACDBPLACEHOLDER'){ const o = obj(T.PLACEHOLDER, h); objCommon(o, owner, rx); }
      else if(r.type === 'WIPEOUTVARIABLES'){ const o = obj(504, h); objCommon(o, owner, rx); o.d.BS(r.after('AcDbWipeoutVariables').int(70, 1)); }
      else if(r.type === 'MLINESTYLE'){ const o = obj(T.MLINESTYLE, h); objCommon(o, owner, rx); const s = r.after('AcDbMlineStyle');
        o.d.TV(s.get(2, 'Standard')); o.d.TV(s.get(3, '')); o.d.BS(s.int(70)); o.d.CMC(s.int(62, 256)); o.d.BD(s.num(51, 90) * D2R); o.d.BD(s.num(52, 90) * D2R);
        const ls = []; let L = null; for(const x of s.g){ if(x[0] === 49){ L = { off: parseFloat(x[1]) || 0, col: 256, lt: 'BYLAYER' }; ls.push(L); } else if(L && x[0] === 62) L.col = parseInt(x[1], 10) || 0; else if(L && x[0] === 6) L.lt = x[1]; }
        o.d.RC(ls.length); for(const q of ls){ o.d.BD(q.off); o.d.CMC(q.col & 0xffff); const u = up(q.lt); o.d.BS(u === 'BYBLOCK' ? 32766 : u === 'BYLAYER' ? 32767 : 0); } }
      else if(r.type === 'LAYOUT'){ const o = obj(T.LAYOUT, h); objCommon(o, owner, rx); const s = r.after('AcDbPlotSettings'), l = r.after('AcDbLayout');
        o.d.TV(s.get(1, '')); o.d.TV(s.get(2, '')); o.d.BS(s.int(70)); for(const k of [40, 41, 42, 43, 44, 45]) o.d.BD(s.num(k)); o.d.TV(s.get(4, ''));
        o.d.BD2([s.num(46), s.num(47)]); o.d.BS(s.int(72)); o.d.BS(s.int(73)); o.d.BS(s.int(74)); o.d.BD2([s.num(48), s.num(49)]); o.d.BD2([s.num(140), s.num(141)]); o.d.TV(s.get(6, ''));
        o.d.BD(s.num(142, 1)); o.d.BD(s.num(143, 1)); o.d.TV(s.get(7, '')); o.d.BS(s.int(75)); o.d.BD(s.num(147, 1)); o.d.BD2([s.num(148), s.num(149)]);
        o.d.TV(l.get(1, '')); o.d.BS(l.int(71)); o.d.BS(l.int(70)); o.d.BD3(l.pt(12)); o.d.RD2([l.num(10), l.num(20)]); o.d.RD2([l.num(11), l.num(21)]);
        o.d.BD3(l.pt(13)); o.d.BD3([l.num(16, 1), l.num(26), l.num(36)]); o.d.BD3([l.num(17), l.num(27, 1), l.num(37)]); o.d.BD(l.num(146)); o.d.BS(l.int(76)); o.d.BD3(l.pt(14)); o.d.BD3(l.pt(15));
        o.hd.H(4, ref(l.get(330))); o.hd.H(4, 0); o.hd.H(5, 0); o.hd.H(5, 0); }
      else if(r.type === 'XRECORD'){ const o = obj(T.XRECORD, h); objCommon(o, owner, rx); const s = r.after('AcDbXrecord'); const items = s.g.filter(x => x[0] !== 280);
        const xd = new BW(256); for(const [c, v] of items){ xd.RS(c); if((c >= 0 && c <= 9) || (c >= 300 && c <= 309) || c === 1000){ const b = tvBytes(v); xd.RS(b.length); xd.RC(30); xd.TF(b); } else if(c >= 280 && c <= 289){ xd.RC(parseInt(v, 10) || 0); } else if(c >= 90 && c <= 99){ xd.RL(parseInt(v, 10) || 0); } else if(c >= 60 && c <= 79){ xd.RS(parseInt(v, 10) || 0); } else xd.RD(parseFloat(v) || 0); }
        o.d.BL(xd.byte); o.d.append(xd); o.d.BS(s.int(280, 1)); }
    }

    /* ---------- mã hoá từng đối tượng: MS cỡ + [BS kiểu, RL bitsize, dữ liệu, handle] + CRC ---------- */
    const enc = o => { const w = new BW(((o.d.p + o.hd.p) >> 3) + 16); w.BS(o.type); w.RL(w.p + 32 + o.d.p); w.append(o.d); w.append(o.hd); w.pad();
      const n = w.p >> 3, f = new BW(n + 8); f.MS(n); f.append(w); f.crc(0); return f.bytes(); };
    out.sort((a, b) => a.h - b.h);
    for(let i = 1; i < out.length; i++) if(out[i].h === out[i - 1].h) throw new Error('DWG: trùng handle ' + out[i].h.toString(16));
    seed = Math.max(seed, out.length ? out[out.length - 1].h + 1 : 1);

    /* ---------- biến hệ thống ---------- */
    const now = opt.now ? new Date(opt.now) : new Date();
    const jd = (d => { const t = d.getTime() / 86400000 + 2440587.5 - d.getTimezoneOffset() / 1440; const days = Math.floor(t); return [days, Math.round((t - days) * 86400000)]; })(now);
    const lim0 = [hv('$LIMMIN', 10, 0), hv('$LIMMIN', 20, 0)], lim1 = [hv('$LIMMAX', 10, metric ? 420 : 12), hv('$LIMMAX', 20, metric ? 297 : 9)];
    const ext0 = [hv('$EXTMIN', 10, 1e20), hv('$EXTMIN', 20, 1e20), hv('$EXTMIN', 30, 0)], ext1 = [hv('$EXTMAX', 10, -1e20), hv('$EXTMAX', 20, -1e20), hv('$EXTMAX', 30, 0)];
    const dsRec = recsOf('DIMSTYLE').find(r => up(r.get(2)) === 'STANDARD');
    const DS = (c, d) => dsRec ? dsRec.num(c, d) : d;
    const guid = () => { const b = []; for(let i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256)); b[6] = (b[6] & 15) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; const x = b.map(v => v.toString(16).toUpperCase().padStart(2, '0')).join(''); return '{' + x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20) + '}'; };
    function headerData(w){
      const z3 = [0, 0, 0];
      w.BD(412148564080.0); w.BD(1); w.BD(1); w.BD(1); w.TV('m'); w.TV(''); w.TV(''); w.TV(''); w.BL(0); w.BL(0); w.H(5, 0);
      for(const b of [1, 1, 0, 0, 1, 1, 0, hv('$PSLTSCALE', 70, 1), hv('$LIMCHECK', 70, 0), 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0]) w.B(b);   // DIMASO … PELLIPSE
      for(const s of [1, 3020, 2, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 8, 6, 6, 6, 6, 6, 6, 3, 70, 0, 64, 4, 0, 50]) w.BS(s);   // PROXYGRAPHICS … TEXTQLTY
      w.BD(hv('$LTSCALE', 40, 1)); w.BD(metric ? 2.5 : 0.2); w.BD(metric ? 1 : 0.05); w.BD(metric ? 1 : 0.1); for(let i = 0; i < 10; i++) w.BD(0);   // TEXTSIZE … USERR5
      for(let i = 0; i < 4; i++) w.BD(0); w.BD(0.5); w.BD(metric ? 20 : 1); w.BD(hv('$CELTSCALE', 40, 1));   // CHAMFERA … CELTSCALE
      w.TV('acad'); w.BL(jd[0]); w.BL(jd[1]); w.BL(jd[0]); w.BL(jd[1]); w.BL(0); w.BL(0); w.BL(0); w.BL(0);
      w.CMC(256); w.H(0, seed);
      w.H(5, LAYERS.get(up(hvs('$CLAYER', 8, '0'))) || hLayer0); w.H(5, hStd); w.H(5, hLtByLayer); w.H(5, hDimStd); w.H(5, hMlStd);
      w.BD(0); w.BD3(z3); w.BD3([1e20, 1e20, 1e20]); w.BD3([-1e20, -1e20, -1e20]); w.RD2([0, 0]); w.RD2(metric ? [420, 297] : [12, 9]); w.BD(0);
      w.BD3(z3); w.BD3([1, 0, 0]); w.BD3([0, 1, 0]); w.H(5, 0); w.H(5, 0); w.BS(0); w.H(5, 0); for(let i = 0; i < 6; i++) w.BD3(z3);
      w.BD3([hv('$INSBASE', 10, 0), hv('$INSBASE', 20, 0), hv('$INSBASE', 30, 0)]); w.BD3(ext0); w.BD3(ext1); w.RD2(lim0); w.RD2(lim1); w.BD(0);
      w.BD3(z3); w.BD3([1, 0, 0]); w.BD3([0, 1, 0]); w.H(5, 0); w.H(5, 0); w.BS(0); w.H(5, 0); for(let i = 0; i < 6; i++) w.BD3(z3);
      w.TV(''); w.TV('');
      const dt = DS(140, metric ? 2.5 : 0.18);
      w.BD(DS(40, 1)); w.BD(DS(41, metric ? 2.5 : 0.18)); w.BD(DS(42, metric ? 0.625 : 0.0625)); w.BD(DS(43, metric ? 3.75 : 0.38)); w.BD(DS(44, metric ? 1.25 : 0.18)); w.BD(0); w.BD(0); w.BD(0); w.BD(0);
      for(const b of [0, 0, metric ? 0 : 1, metric ? 0 : 1, 0, 0]) w.B(b); w.BS(DS(77, metric ? 1 : 0)); w.BS(metric ? 8 : 0); w.BS(0);
      w.BD(dt); w.BD(metric ? 2.5 : 0.09); w.BD(0); w.BD(25.4); w.BD(1); w.BD(0); w.BD(1); w.BD(DS(147, metric ? 0.625 : 0.09)); w.BD(0);
      w.B(0); w.BS(2); w.B(metric ? 1 : 0); w.B(0); w.B(0); w.B(0); w.CMC(0); w.CMC(0); w.CMC(0);
      for(const s of [0, DS(271, metric ? 2 : 4), metric ? 2 : 4, 2, 2, 0, 0, 2, metric ? 44 : 46, 0, 0]) w.BS(s); w.B(0); w.B(0); w.BS(1); w.BS(metric ? 8 : 0); w.BS(0); w.BS(0); w.B(0); w.BS(3);
      w.H(5, hStd); w.H(5, 0); w.H(5, 0); w.H(5, 0); w.H(5, 0); w.BS(0xfffe); w.BS(0xfffe);
      for(const c of [1, 2, 3, 5, 6, 7, 8, 9, 0xA, H_VX]) w.H(3, c);
      w.H(5, nodItems.get('ACAD_GROUP') || 0); w.H(5, nodItems.get('ACAD_MLINESTYLE') || 0); w.H(3, H_NOD);
      w.BS(1); w.BS(70); w.TV(''); w.TV('');
      w.H(5, nodItems.get('ACAD_LAYOUT') || 0); w.H(5, nodItems.get('ACAD_PLOTSETTINGS') || 0); w.H(5, nodItems.get('ACAD_PLOTSTYLENAME') || 0);
      w.BL(lwIndex(hv('$CELWEIGHT', 370, -1)) | (hv('$LWDISPLAY', 290, 0) ? 0 : 0x200) | 0x800 | 0x2000);
      w.BS(hv('$INSUNITS', 70, metric ? 4 : 1)); w.BS(0); w.TV(guid()); w.TV(guid());
      w.H(5, hPS); w.H(5, hMS); w.H(5, hLtByLayer); w.H(5, hLtByBlock); w.H(5, hLtCont);
      w.BS(0); w.BS(0); w.BS(0); w.BS(0);
    }

    /* ---------- ghép file ---------- */
    const F = new BW(1 << 16);
    const sec = []; for(let i = 0; i < 6; i++) sec.push({ nr: i, addr: 0, size: 0 });
    for(const c of 'AC1015') F.RC(c.charCodeAt(0)); for(let i = 0; i < 5; i++) F.RC(0);
    F.RC(6); F.RC(1); const thumbAt = F.byte; F.RL(0); F.RC(0x17); F.RC(6); F.RS(30); F.RL(6);
    const locAt = F.byte; for(let i = 0; i < 6; i++){ F.RC(0); F.RL(0); F.RL(0); }
    const hdrCrcAt = F.byte; F.RS(0); sentinel(F, SENT.HEADER_END);
    // AuxHeader (123 byte như AutoCAD 2000)
    sec[5].addr = F.byte;
    F.RC(0xff); F.RC(0x77); F.RC(0x01); F.RS(0x17); F.RS(6); F.RL(1); F.RL(0xffffffff); F.RS(1); F.RS(0); F.RL(0); F.RS(0x17); F.RS(6); F.RS(0x17); F.RS(6);
    for(const v of [518, 9200, 518, 9200, 0, 1]) F.RS(v); for(let i = 0; i < 5; i++) F.RL(0);
    F.RL(jd[0]); F.RL(jd[1]); F.RL(jd[0]); F.RL(jd[1]); F.RL(seed); F.RL(0); F.RS(0); F.RS(1); F.RL(0); F.RL(0); F.RL(0); F.RL(1); F.RL(0); F.RL(0); F.RL(0); F.RL(0);
    sec[5].size = F.byte - sec[5].addr;
    // ảnh xem trước (BMP tuỳ chọn)
    const thumb = F.byte; F.setRL(thumbAt, thumb); sentinel(F, SENT.THUMB_BEGIN);
    if(opt.bmp && opt.bmp.length){ const at = F.byte + 4 + 1 + 9; F.RL(1 + 9 + opt.bmp.length); F.RC(1); F.RC(2); F.RL(at); F.RL(opt.bmp.length); F.TF(opt.bmp); }
    else { F.RL(1); F.RC(0); }
    sentinel(F, SENT.THUMB_END);
    // biến hệ thống
    { sec[0].addr = F.byte; sentinel(F, SENT.VAR_BEGIN); const sz = F.byte; F.RL(0); const w = new BW(2048); headerData(w); w.pad(); F.append(w); F.setRL(sz, F.byte - sz - 4); F.crc(sz); sentinel(F, SENT.VAR_END); sec[0].size = F.byte - sec[0].addr; }
    // lớp (class)
    { sec[1].addr = F.byte; sentinel(F, SENT.CLASS_BEGIN); const sz = F.byte; F.RL(0); const w = new BW(512);
      for(const [n, dxf, cpp, app, px, ent] of CLASSES.concat(hasWipe ? WIPE_CLASSES : [])){ w.BS(n); w.BS(px); w.TV(app); w.TV(cpp); w.TV(dxf); w.B(0); w.BS(ent ? 0x1f2 : 0x1f3); }
      w.pad(); F.append(w); F.setRL(sz, F.byte - sz - 4); F.crc(sz); sentinel(F, SENT.CLASS_END); sec[1].size = F.byte - sec[1].addr; }
    // khối dữ liệu riêng DVDCAD nằm giữa các section (mọi trình đọc DWG bỏ qua; DVDCAD mở lại đủ khối 3D, vùng, thứ tự vẽ, ràng buộc, khối động…)
    { const xr = objsDxf.find(r => r.type === 'XRECORD' && r.g.some(x => x[0] === 1 && x[1] === 'DVDCAD1'));
      const d = xr ? xr.all(300).join('') : '';
      if(Object.keys(PRIV).length || d){ const js = JSON.stringify({ v: 1, x: PRIV, d }); const b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(js) : Uint8Array.from(Buffer.from(js, 'utf8'));
        for(const c of 'DVDCADX1') F.RC(c.charCodeAt(0)); F.RL(b.length); F.need(b.length * 8); F.u.set(b, F.byte); F.p += b.length * 8; } }
    // đối tượng
    const objStart = F.byte; const map = [];
    for(const o of out){ const b = enc(o); map.push([o.h, F.byte]); F.need(b.length * 8); F.u.set(b, F.byte); F.p += b.length * 8; }
    // bản đồ handle: các trang ≤ 2032 byte, CRC big-endian
    { sec[2].addr = F.byte; let ps = F.byte; F.RS(0); let lh = 0, la = 0;
      const close = () => { const n = F.byte - ps; F.u[ps] = n >> 8; F.u[ps + 1] = n & 255; F.crc(ps, true); };
      for(const [h, a] of map){ F.UMC(h - lh); F.MC(a - la); lh = h; la = a; if(F.byte - ps > 2030){ close(); ps = F.byte; F.RS(0); lh = 0; la = 0; } }
      close(); ps = F.byte; F.RC(0); F.RC(2); F.crc(ps, true); sec[2].size = F.byte - sec[2].addr; }
    // ObjFreeSpace (53 byte)
    sec[3].addr = F.byte; F.RL(0); F.RL(out.length); F.RL(jd[0]); F.RL(jd[1]); F.RL(objStart); F.RC(4); F.RL(0x32); F.RL(0); F.RL(0x64); F.RL(0); F.RL(0x200); F.RL(0); F.RL(0xffffffff); F.RL(0); sec[3].size = F.byte - sec[3].addr;
    // header phụ (2nd header): bản sao bảng section + 14 handle gốc; Template ghi 0 như AutoCAD
    { const h2 = F.byte; sentinel(F, SENT.H2_BEGIN); const sz = F.byte; F.RL(0); const w = new BW(512);
      w.BL(h2); for(const c of 'AC1015') w.RC(c.charCodeAt(0)); for(let i = 0; i < 5; i++) w.RC(0); w.RC(6); w.RC(1); w.BS(0x0617); w.RS(30); w.BS(6);
      for(const s of sec) { w.RC(s.nr); w.BL(s.nr === 4 ? 0 : s.addr); w.BL(s.nr === 4 ? 0 : s.size); }
      const hh = [seed, 1, 2, 3, 5, 6, 7, 8, 9, 0xA, H_VX, H_NOD, nodItems.get('ACAD_MLINESTYLE') || 0, nodItems.get('ACAD_GROUP') || 0];
      w.BS(14); hh.forEach((v, i) => { const b = []; let x = v; while(x > 0){ b.unshift(x % 256); x = Math.floor(x / 256); } if(!b.length) b.push(0); w.RC(b.length); w.RC(i); for(const q of b) w.RC(q); });
      w.pad(); F.append(w); F.setRL(sz, F.byte + 2 + 8 - sz); F.crc(sz); F.RL(0x74AE8021); F.RL(0x989543D0); sentinel(F, SENT.H2_END); }
    // Template: mô tả rỗng (T16) + MEASUREMENT
    sec[4].addr = F.byte; F.RS(0); F.RS(metric ? 1 : 0); sec[4].size = F.byte - sec[4].addr;
    // điền bảng vị trí section + CRC header (hạt giống 0xC0C1 = 0 xor hằng số 6 section của ODA)
    for(let i = 0; i < 6; i++){ const at = locAt + i * 9; F.u[at] = sec[i].nr; F.setRL(at + 1, sec[i].addr); F.setRL(at + 5, sec[i].size); }
    { const c = crc16(0xC0C1, F.u, 0, hdrCrcAt); F.u[hdrCrcAt] = c & 255; F.u[hdrCrcAt + 1] = c >> 8; }
    return F.bytes();
  }

  /* ---------------- ảnh xem trước: BMP 8 bit (bảng màu 3-3-2) từ khung vẽ, như ảnh AutoCAD hiện trong hộp thoại Mở ---------------- */
  function previewBmp(cv, W, H){
    try{
      if(!cv || !cv.width || !cv.height || typeof document === 'undefined') return null;
      W = W || 180; H = H || 135; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const s = Math.min(W / cv.width, H / cv.height), w = cv.width * s, h = cv.height * s;
      g.drawImage(cv, (W - w) / 2, (H - h) / 2, w, h); const px = g.getImageData(0, 0, W, H).data;
      const row = (W + 3) & ~3, img = row * H, b = new Uint8Array(40 + 1024 + img), v = new DataView(b.buffer);
      v.setUint32(0, 40, true); v.setInt32(4, W, true); v.setInt32(8, H, true); v.setUint16(12, 1, true); v.setUint16(14, 8, true); v.setUint32(16, 0, true); v.setUint32(20, img, true); v.setUint32(32, 256, true);
      for(let i = 0; i < 256; i++){ const r = (i >> 5) & 7, gg = (i >> 2) & 7, bb = i & 3; b[40 + i * 4] = Math.round(bb * 255 / 3); b[41 + i * 4] = Math.round(gg * 255 / 7); b[42 + i * 4] = Math.round(r * 255 / 7); }
      for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const k = ((H - 1 - y) * W + x) * 4; b[1064 + y * row + x] = (Math.round(px[k] * 7 / 255) << 5) | (Math.round(px[k + 1] * 7 / 255) << 2) | Math.round(px[k + 2] * 3 / 255); }
      return b;
    }catch(_){ return null; }
  }

  const api = { BW, crc16, parseDxf, headerVars, Rec, tvBytes, dwgFromDxf, previewBmp };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DVDDwg = api;

  /* ---------------- trong DVDCAD: A.dwgNative(ents) → Uint8Array (DWG 2000) ---------------- */
  const A = root.DVDAcad;
  if(A && !A._dwgNative){
    A._dwgNative = true;
    A.dwgNative = (ents, opt) => {
      if(!A.dxfR2000) throw new Error('Thiếu bộ ghi DXF 2000.');
      const pv = A.dxfVer, pl = A.lastDxfVer; A.dxfVer = 'R2000'; let dxf;
      try{ dxf = A.dxfR2000(ents || (typeof modelEntities !== 'undefined' ? modelEntities : [])); } finally { A.dxfVer = pv; A.lastDxfVer = pl; }
      const o = Object.assign({}, opt); if(o.bmp === undefined) o.bmp = previewBmp(document.getElementById('cv'));
      return dwgFromDxf(dxf, o);
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
