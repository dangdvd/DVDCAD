/* DVDCAD v5k — GHI DWG GỐC: AutoCAD 2000 (AC1015), không cần ODA File Converter
   v5t: thêm DWG 2004 (AC1018), 2010 (AC1024), 2013 (AC1027), 2018 (AC1032) — opt.version = 'R2004' | 'R2010' | 'R2013' | 'R2018'.
   Đầu vào là DXF do chính DVDCAD tạo (A.dxfR2000): đọc lại từng bản ghi rồi mã hoá thành đối tượng DWG,
   nên DWG giữ đúng những gì bản DXF giữ (lớp, kiểu nét, kiểu chữ, khối + thuộc tính, kích thước, hatch…).
   Định dạng theo tài liệu mở "Open Design Specification for .dwg files" (Open Design Alliance), mã nguồn LibreDWG
   (GPL-3.0, cùng giấy phép với DVDCAD) và ACadSharp (MIT): mã hoá bit (B/BB/BS/BL/BD/DD/BT/BE/H/MC/MS), CRC-16, thứ tự
   trường của từng đối tượng theo phiên bản, bố cục section. DWG 2000: header → AuxHeader → ảnh xem trước → biến hệ
   thống → lớp (class) → đối tượng → bản đồ handle → ObjFreeSpace → header phụ → Template.
   DWG 2004+: header 0x100 byte (phần mã hoá XOR + CRC-32) rồi các trang 0x20 byte căn lề — trang dữ liệu (đầu trang mã
   hoá theo địa chỉ, nén LZ77 kiểu AutoCAD, checksum Adler biến thể), bản đồ section (tên, id, trang), bản đồ trang.
   R2007+: chuỗi Unicode (TU) nằm trong luồng chuỗi riêng ở cuối mỗi đối tượng / biến hệ thống / lớp; R2010+: kiểu đối
   tượng BOT, cỡ luồng handle (UMC) ở đầu đối tượng.
   Dùng được cả trong trình duyệt (A.dwgFromDxf) lẫn Node (module.exports) để kiểm thử. */
(function(root){
  'use strict';
  const D2R = Math.PI / 180;
  const fin = v => { v = +v; return isFinite(v) ? v : 0; };
  // phiên bản đang ghi (đặt ở đầu dwgFromDxf): 15 = AC1015 (2000), 18 = AC1018 (2004), 21 = AC1021 (2007), 24 = AC1024 (2010), 27 = AC1027 (2013), 32 = AC1032 (2018)
  let VER = 15;
  const VCODE = { R2000: 15, R2004: 18, R2007: 21, R2010: 24, R2013: 27, R2018: 32 };
  const ACV = { 15: 'AC1015', 18: 'AC1018', 21: 'AC1021', 24: 'AC1024', 27: 'AC1027', 32: 'AC1032' };

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
    constructor(n){ this.u = new Uint8Array(Math.max(16, n | 0)); this.p = 0; this.v = VER; }
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
    // màu (CMC): R2004+ = BS 0 + BL (0xC0 BYLAYER, 0xC1 BYBLOCK, 0xC2 RGB, 0xC3 số màu ACI) + RC cờ tên
    CMC(i, rgb){ if(this.v < 18){ this.BS(i); return; }
      this.BS(0); this.BL(rgb != null ? (0xC2000000 | (rgb & 0xffffff)) >>> 0 : i === 256 ? 0xC0000000 : i === 0 ? 0xC1000000 : (0xC3000000 | (Math.abs(i) & 0xff)) >>> 0); this.RC(0); }
    // màu thực thể (ENC, R2004+): BS cờ (0x8000 RGB, 0x2000 độ trong suốt) | số màu, rồi BL RGB, BL trong suốt
    ENC(i, rgb, alpha){ if(this.v < 18){ this.BS(i & 0xffff); return; }
      this.BS((i & 0x1ff) | (rgb != null ? 0x8000 : 0) | (alpha != null ? 0x2000 : 0));
      if(rgb != null) this.BL((0xC2000000 | (rgb & 0xffffff)) >>> 0); if(alpha != null) this.BL(alpha >>> 0); }
    TV(s){ const b = tvBytes(s); this.BS(b.length); for(const x of b) this.RC(x); }
    // TU (R2007+): BS số ký tự gồm cả ký tự 0 kết thúc + UTF-16LE; chuỗi rỗng = BS 0
    TU(s){ s = s == null ? '' : String(s); if(!s.length){ this.BS(0); return; } this.BS(s.length + 1); for(let i = 0; i < s.length; i++) this.RS(s.charCodeAt(i)); this.RS(0); }
    // kiểu đối tượng R2010+ (BOT): 00 + RC, 01 + RC (+0x1F0), 10 + RS
    BOT(t){ if(t <= 255){ this.BB(0); this.RC(t); } else if(t >= 0x1f0 && t <= 0x2ef){ this.BB(1); this.RC(t - 0x1f0); } else { this.BB(2); this.RS(t); } }
    // BLL: 3 bit số byte + các byte (little-endian)
    BLL(v){ v = Math.max(0, Math.floor(+v || 0)); const b = []; while(v > 0 && b.length < 7){ b.push(v % 256); v = Math.floor(v / 256); } this.B(b.length & 4); this.B(b.length & 2); this.B(b.length & 1); for(const x of b) this.RC(x); }
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

  /* ---------------- DWG 2004+: dãy XOR, checksum trang, CRC-32, nén LZ77 ---------------- */
  // dãy giả ngẫu nhiên (hạt 1, LCG 0x343FD/0x269EC3) dùng mã hoá header 0x6C byte và lấp chỗ trống
  const MAGIC = (() => { const m = new Uint8Array(256); let s = 1; for(let i = 0; i < 256; i++){ s = (Math.imul(s, 0x343FD) + 0x269EC3) >>> 0; m[i] = (s >>> 16) & 0xff; } return m; })();
  // checksum trang (biến thể Adler-32, khối 0x15B0)
  function pageSum(seed, u, from, to){ let s1 = seed & 0xffff, s2 = seed >>> 16, i = from, n = to - from;
    while(n > 0){ const c = Math.min(0x15b0, n); n -= c; for(let k = 0; k < c; k++){ s1 += u[i++]; s2 += s1; } s1 %= 0xfff1; s2 %= 0xfff1; }
    return ((s2 << 16) | (s1 & 0xffff)) >>> 0; }
  const CRC32T = (() => { const t = new Uint32Array(256); for(let i = 0; i < 256; i++){ let c = i; for(let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; t[i] = c >>> 0; } return t; })();
  function crc32(u){ let c = 0xffffffff; for(let i = 0; i < u.length; i++) c = (CRC32T[(c ^ u[i]) & 0xff] ^ (c >>> 8)) >>> 0; return (~c) >>> 0; }
  // nén LZ77 kiểu AutoCAD R2004 (theo ACadSharp DwgLZ77AC18Compressor, MIT): bảng băm 0x8000 ô, khớp ≥ 3 byte, khoảng lùi ≤ 0xBFFF
  function lz77(src){
    const total = src.length, out = []; if(total < 0x18){ litRun(out, src, 0, total); out.push(0x11, 0, 0); return Uint8Array.from(out); }
    const block = new Int32Array(0x8000).fill(-1); let curOff = 0, pos = 4, co = 0, mpos = 0;
    const writeLen = len => { while(len > 0xff){ len -= 0xff; out.push(0); } out.push(len); };
    const opcode = (op, c, v) => { if(c <= v){ out.push(op | (c - 2)); } else { out.push(op); writeLen(c - v); } };
    const literal = n => { if(n <= 0) return; if(n > 3) opcode(0, n - 1, 0x11); for(let i = 0; i < n; i++) out.push(src[curOff + i]); };
    const mask = (mp, c, m) => { let a, b;
      if(c >= 0x0f || mp > 0x400){ if(mp <= 0x4000){ mp--; opcode(0x20, c, 0x21); } else { mp -= 0x4000; opcode(0x10 | ((mp >> 11) & 8), c, 0x09); } a = (mp & 0xff) << 2; b = mp >> 6; }
      else { mp--; a = ((c + 1) << 4) | ((mp & 3) << 2); b = mp >> 2; }
      if(m < 4) a |= m; out.push(a & 0xff, b & 0xff); };
    const chunk = () => {
      const v1 = src[pos + 3] << 6, v2 = v1 ^ src[pos + 2], v3 = (v2 << 5) ^ src[pos + 1], v4 = (v3 << 5) ^ src[pos];
      let vi = (v4 + (v4 >> 5)) & 0x7fff, val = block[vi], mp = pos - val, len = 0;
      if(val >= 0 && mp <= 0xbfff){
        if(mp > 0x400 && src[pos + 3] !== src[val + 3]){ vi = (vi & 0x7ff) ^ 0x401f; val = block[vi]; mp = pos - val;
          if(val < 0 || mp > 0xbfff || (mp > 0x400 && src[pos + 3] !== src[val + 3])){ block[vi] = pos; return null; } }
        if(src[pos] === src[val] && src[pos + 1] === src[val + 1] && src[pos + 2] === src[val + 2]){ len = 3; let a = val + 3, b = pos + 3; while(b < total && src[a++] === src[b++]) len++; }
      }
      block[vi] = pos; return len >= 3 ? [len, mp] : null; };
    while(pos < total - 0x13){ const m = chunk(); if(!m){ pos++; continue; }
      const lit = pos - curOff; if(co) mask(mpos, co, lit); literal(lit); pos += m[0]; curOff = pos; co = m[0]; mpos = m[1]; }
    const lit = total - curOff; if(co) mask(mpos, co, lit); literal(lit); out.push(0x11, 0, 0);
    return Uint8Array.from(out);
  }
  // chuỗi byte nguyên (không nén) cho dữ liệu rất ngắn: mã độ dài + byte
  function litRun(out, src, from, n){ if(n <= 0) return; if(n < 4){ const t = new Uint8Array(4); t.set(src.subarray(from, from + n)); src = t; from = 0; n = 4; }
    if(n <= 0x12) out.push(n - 3); else { out.push(0); let r = n - 0x12; while(r > 0xff){ r -= 0xff; out.push(0); } out.push(r); }
    for(let i = 0; i < n; i++) out.push(src[from + i]); }

  /* ---------------- DWG 2007 (AC1021): mã Reed–Solomon, nén LZ kiểu 2007, CRC-64, checksum ---------------- */
  // RS(255, k) hệ thống: k byte dữ liệu ở đầu khối, 255-k byte chẵn lẻ ở cuối; nghiệm α^1…α^(255-k).
  // Trang hệ thống / header: trường 0x169, k = 239; trang dữ liệu: trường 0x11D, k = 251.
  const RS = (() => { const C = {};
    return (poly, k) => { const key = poly + ':' + k; if(C[key]) return C[key];
      const EXP = new Uint8Array(512), LOG = new Uint8Array(256); let x = 1; for(let i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if(x & 256) x ^= poly; } for(let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
      const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0, inv = a => EXP[255 - LOG[a]], n = 255 - k;
      // ma trận A[j][t] = α^((j+1)(k+t)); giải A·p = D (D_j = dữ liệu tại α^(j+1)) bằng khử Gauss một lần
      const A = []; for(let j = 0; j < n; j++){ const r = new Uint8Array(2 * n); for(let t = 0; t < n; t++) r[t] = EXP[((j + 1) * (k + t)) % 255]; r[n + j] = 1; A.push(r); }
      for(let c = 0; c < n; c++){ let p = c; while(!A[p][c]) p++; [A[c], A[p]] = [A[p], A[c]]; const iv = inv(A[c][c]); for(let t = 0; t < 2 * n; t++) A[c][t] = mul(A[c][t], iv);
        for(let r = 0; r < n; r++) if(r !== c && A[r][c]){ const f = A[r][c]; for(let t = 0; t < 2 * n; t++) A[r][t] ^= mul(f, A[c][t]); } }
      const I = A.map(r => r.slice(n)), D = new Uint8Array(n);
      // mã hoá xen kẽ: byte j của khối i nằm ở vị trí i + j·nb
      const enc = (data, nb, out, at) => { for(let i = 0; i < nb; i++){
          for(let j = 0; j < n; j++){ const a = EXP[j + 1]; let y = 0; for(let q = k - 1; q >= 0; q--){ const v = data[i * k + q] || 0; y = mul(y, a) ^ v; } D[j] = y; }
          for(let q = 0; q < k; q++) out[at + i + q * nb] = data[i * k + q] || 0;
          for(let t = 0; t < n; t++){ let s = 0; for(let j = 0; j < n; j++) s ^= mul(I[t][j], D[j]); out[at + i + (k + t) * nb] = s; } } };
      return (C[key] = { enc, k }); }; })();
  // thứ tự byte của một đoạn chữ nguyên (literal) khi giải nén: theo khối 32 byte (4 nhóm 8 byte đảo thứ tự) + phần dư theo bảng riêng
  const LIT_TAIL = [[], [[1, 0]], [[2, 0]], [[3, 0]], [[4, 0]], [[1, 4], [4, 0]], [[1, 5], [4, 1], [1, 0]], [[2, 5], [4, 1], [1, 0]], [[8, 0]], [[1, 8], [8, 0]], [[1, 9], [8, 1], [1, 0]], [[2, 9], [8, 1], [1, 0]],
    [[4, 8], [8, 0]], [[1, 12], [4, 8], [8, 0]], [[1, 13], [4, 9], [8, 1], [1, 0]], [[2, 13], [4, 9], [8, 1], [1, 0]], [[16, 0]], [[8, 9], [1, 8], [8, 0]], [[1, 17], [16, 1], [1, 0]], [[3, 16], [16, 0]],
    [[4, 16], [16, 0]], [[1, 20], [4, 16], [16, 0]], [[2, 20], [4, 16], [16, 0]], [[3, 20], [4, 16], [16, 0]], [[8, 16], [16, 0]], [[8, 17], [1, 16], [16, 0]], [[1, 25], [8, 17], [1, 16], [16, 0]],
    [[2, 25], [8, 17], [1, 16], [16, 0]], [[4, 24], [8, 16], [16, 0]], [[1, 28], [4, 24], [8, 16], [16, 0]], [[2, 28], [4, 24], [8, 16], [16, 0]], [[1, 30], [4, 26], [8, 18], [16, 2], [2, 0]]];
  // đặt n byte data[from…] vào out sao cho bộ giải nén chép ra đúng thứ tự: src[P[i]] = data[i]
  function litPut(out, at, data, from, n){ let d = 0, s = 0;
    const put = (cnt, o, rev) => { for(let t = 0; t < cnt; t++) out[at + s + o + (rev ? cnt - 1 - t : t)] = data[from + d++]; };
    const p16 = o => { put(8, o + 8); put(8, o); };
    while(n - d >= 32){ p16(16); p16(0); s += 32; }
    for(const [c, o] of LIT_TAIL[n - d]){ if(c === 16) p16(o); else put(c, o, c === 2 || c === 3); } }
  function litLen(out, L){ if(L < 0x17){ out.push(L - 8); return; } let r = L - 0x17; out.push(0x0f); if(r < 0xff){ out.push(r); return; } out.push(0xff); r -= 0xff;
    while(r >= 0xffff){ out.push(0xff, 0xff); r -= 0xffff; } out.push(r & 0xff, r >> 8); }
  // nén LZ kiểu 2007: đoạn đầu ≥ 8 byte chữ nguyên; lệnh chép 2 / 3 / 4 byte (mã 0x3_…0xE_ / 0x1_ / 0x2_); ≤ 7 byte chữ sau lệnh chép nằm ở 3 bit thấp
  function r21Comp(src, force){ const n = src.length; if(n < 16 && !force) return null;
    const out = [], head = new Int32Array(1 << 15).fill(-1), prev = new Int32Array(n).fill(-1);
    const hash = i => ((src[i] * 0x9E3779B1 ^ src[i + 1] * 0x85EBCA77 ^ src[i + 2] * 0xC2B2AE3D ^ src[i + 3] * 0x27D4EB2F) >>> 17) & 0x7fff;
    let lit = 0, i = 0, last = -1;
    const flushLit = to => { const L = to - lit; if(last < 0){ litLen(out, L); } else if(L === 0) return; else if(L <= 7) out[last] |= L; else litLen(out, L);
      const at = out.length; for(let t = 0; t < L; t++) out.push(0); litPut(out, at, src, lit, L); };
    const ins = p => { if(p + 3 < n){ const h = hash(p); prev[p] = head[h]; head[h] = p; } };
    while(i < n){ let bl = 0, bo = 0;
      if(i - lit >= (last < 0 ? 8 : 0) && i + 4 <= n){ let c = head[hash(i)], depth = 32;
        while(c >= 0 && i - c <= 0xffff && depth--){ let l = 0; while(i + l < n && src[c + l] === src[i + l] && l < 0x4000) l++; if(l > bl){ bl = l; bo = i - c; } c = prev[c]; } }
      if(bl >= 3 && (bl >= 5 || bo <= 0x2000)){ flushLit(i); let L = bl;
        while(L > 0){ let l = Math.min(L, 255); if(L - l > 0 && L - l < 3) l -= 3;   // phần dư ≥ 3 byte
          if(l <= 14 && bo <= 0x200) out.push((l << 4) | ((bo - 1) & 15), ((bo - 1) >> 4) << 3);   // 2 byte: dài 3…14, cách ≤ 0x200
          else if(l <= 18 && bo <= 0x2000) out.push(0x10 | (l - 3), (bo - 1) & 0xff, ((bo - 1) >> 8) << 3);   // 3 byte: dài 3…18, cách ≤ 0x2000
          else out.push(0x20 | (l & 7), bo & 0xff, bo >> 8, l & 0xf8);   // 4 byte: dài ≤ 255, cách ≤ 0xFFFF
          last = out.length - 1; L -= l; }
        for(let t = 0; t < bl; t++) ins(i + t); i += bl; lit = i; }
      else { ins(i); i++; } }
    if(lit < n || last < 0) flushLit(n);
    return out.length < n || force ? Uint8Array.from(out) : null; }
  // CRC-64 của DWG 2007: dữ liệu đọc theo khối 8 byte thứ tự 6,7,4,5,2,3,0,1; phần dư 4…7 byte: 2,3,0,1 rồi tiếp theo thứ tự (như checksum)
  const ORD64 = n => { const o = []; let p = 0; while(n - p >= 8){ o.push(p + 6, p + 7, p + 4, p + 5, p + 2, p + 3, p, p + 1); p += 8; }
    for(const t of [[], [0], [0, 1], [0, 1, 2], [2, 3, 0, 1], [2, 3, 0, 1, 4], [2, 3, 0, 1, 4, 5], [2, 3, 0, 1, 4, 5, 6]][n - p]) o.push(p + t); return o; };
  const M64 = (1n << 64n) - 1n;
  // ECMA 0x42F0E1EBA9EA3693 (MSB trước, đảo bit cuối): CRC header 0x110 byte và CRC dữ liệu header nén
  const CRC64T = (() => { const t = []; for(let i = 0n; i < 256n; i++){ let v = i << 56n; for(let b = 0; b < 8; b++) v = (v & (1n << 63n)) ? ((v << 1n) ^ 0x42f0e1eba9ea3693n) & M64 : (v << 1n) & M64; t.push(v); } return t; })();
  function crc64(u, n){ let c = BigInt.asUintN(64, (BigInt(n) * 0x343fdn + 0x269ec3n));
    c = BigInt.asUintN(64, c * ((1n << 32n) + 0x343fdn) + (BigInt(n) + 0x269ec3n)); c = ~c & M64;   // hạt giống theo độ dài (như AutoCAD)
    for(const i of ORD64(n)) c = CRC64T[Number(((c >> 56n) ^ BigInt(u[i])) & 0xffn)] ^ ((c << 8n) & M64);
    return ~c & M64; }
  // Jones 0xAD93D23594C935A9 (phản xạ, không đảo bit cuối): CRC từng trang dữ liệu (dữ liệu nén) và bản đồ trang / section
  const CRCJT = (() => { const t = [], R = 0x95ac9329ac4bc9b5n; for(let i = 0n; i < 256n; i++){ let w = i; for(let b = 0; b < 8; b++) w = (w & 1n) ? (w >> 1n) ^ R : w >> 1n; t.push(w); } return t; })();
  // hạt giống CRC dạng mã hoá (10 bit rải trong số 64 bit)
  const seedDec = e => { e = BigInt.asUintN(64, BigInt(e)); const hi = Number(e >> 32n) >>> 0, lo = Number(e & 0xffffffffn) >>> 0; let r = 0;
    [[hi, 0x08000000], [hi, 0x00200000], [hi, 0x00008000], [hi, 0x200], [hi, 8], [lo, 0x20000000], [lo, 0x00800000], [lo, 0x00020000], [lo, 0x800], [lo, 0x20]].forEach(([w, m], b) => { if(w & m) r |= 1 << b; }); return r; };
  function crcJ(u, n, seed){ let s = BigInt.asUintN(64, (BigInt(seed || 0) + BigInt(n)) * 0x343fdn + 0x269ec3n); s = BigInt.asUintN(64, s | BigInt.asUintN(64, s * (0x343fdn << 32n) + (0x269ec3n << 32n)));
    let c = ~s & M64; for(const i of ORD64(n)) c = CRCJT[Number((c ^ BigInt(u[i])) & 0xffn)] ^ (c >> 8n); return c; }
  // checksum trang dữ liệu 2007: tổng Adler (mod 0xFFF1) từng cặp byte theo thứ tự 6,4,2,0 trong mỗi 8 byte, hạt giống từ độ dài
  function sum21(u, n){ const s0 = BigInt.asUintN(64, BigInt(n) * 0x343fdn + 0x269ec3n); let s1 = Number(s0 & 0xffffn), s2 = Number((s0 >> 16n) & 0xffffn), p = 0, left = n;
    const b = v => { s1 += v; s2 += s1; }, pr = o => { b(u[p + o]); b(u[p + o + 1]); };
    while(left){ const ch = Math.min(0x15b0, left); for(let i = 0, m = ch >> 3; i < m; i++){ pr(6); pr(4); pr(2); pr(0); p += 8; }
      switch(ch & 7){ case 7: pr(2); pr(0); pr(4); b(u[p + 6]); break; case 6: pr(2); pr(0); pr(4); break; case 5: pr(2); pr(0); b(u[p + 4]); break; case 4: pr(2); pr(0); break; case 3: pr(0); b(u[p + 2]); break; case 2: pr(0); break; case 1: b(u[p]); break; }
      p += ch & 7; left -= ch; s1 %= 0xfff1; s2 %= 0xfff1; }
    return ((s2 << 16) | (s1 & 0xffff)) >>> 0; }

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
  const T = { TEXT: 1, ATTRIB: 2, ATTDEF: 3, BLOCK: 4, ENDBLK: 5, SEQEND: 6, INSERT: 7, VERTEX_3D: 11, POLYLINE_3D: 16, ARC: 17, CIRCLE: 18, LINE: 19,
    DIM_LIN: 21, DIM_ALI: 22, DIM_ANG3: 23, DIM_RAD: 25, DIM_DIA: 26, POINT: 27, FACE3D: 28, SOLID: 31, VIEWPORT: 34, ELLIPSE: 35, RAY: 40, XLINE: 41,
    DICT: 42, MTEXT: 44, BLOCK_CONTROL: 48, BLOCK_HEADER: 49, LAYER_CONTROL: 50, LAYER: 51, STYLE_CONTROL: 52, STYLE: 53,
    LTYPE_CONTROL: 56, LTYPE: 57, VIEW_CONTROL: 60, UCS_CONTROL: 62, VPORT_CONTROL: 64, VPORT: 65, APPID_CONTROL: 66, APPID: 67,
    DIMSTYLE_CONTROL: 68, DIMSTYLE: 69, VX_CONTROL: 70, MLINESTYLE: 73, LWPOLYLINE: 77, HATCH: 78, XRECORD: 79,
    DICTWDFLT: 500, PLACEHOLDER: 501, LAYOUT: 502 };
  const ODBX = 'ObjectDBX Classes';
  // lớp (class) dùng được: tên DXF → [lớp C++, ứng dụng, cờ proxy, là thực thể]; số lớp (500, 501…) cấp theo thứ tự dùng
  const CLASSDEF = { ACDBDICTIONARYWDFLT: ['AcDbDictionaryWithDefault', ODBX, 0, 0], ACDBPLACEHOLDER: ['AcDbPlaceHolder', ODBX, 0, 0], LAYOUT: ['AcDbLayout', ODBX, 0, 0], PLOTSETTINGS: ['AcDbPlotSettings', ODBX, 0, 0],
    // khối động (như AutoCAD): đồ thị đánh giá, tham số hiển thị + grip, chống purge, dữ liệu biểu diễn của bản chèn
    ACAD_EVALUATION_GRAPH: ['AcDbEvalGraph', ODBX, 1153, 0], BLOCKVISIBILITYPARAMETER: ['AcDbBlockVisibilityParameter', ODBX, 1153, 0], BLOCKVISIBILITYGRIP: ['AcDbBlockVisibilityGrip', ODBX, 1153, 0],
    BLOCKLINEARPARAMETER: ['AcDbBlockLinearParameter', ODBX, 1153, 0], BLOCKLINEARGRIP: ['AcDbBlockLinearGrip', ODBX, 1153, 0], BLOCKSTRETCHACTION: ['AcDbBlockStretchAction', ODBX, 1153, 0],
    BLOCKFLIPPARAMETER: ['AcDbBlockFlipParameter', ODBX, 1153, 0], BLOCKFLIPGRIP: ['AcDbBlockFlipGrip', ODBX, 1153, 0], BLOCKFLIPACTION: ['AcDbBlockFlipAction', ODBX, 1153, 0],
    BLOCKGRIPLOCATIONCOMPONENT: ['AcDbBlockGripExpr', ODBX, 1153, 0], ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION: ['AcDbDynamicBlockPurgePreventer', ODBX, 1153, 0], ACDB_BLOCKREPRESENTATION_DATA: ['AcDbBlockRepresentationData', ODBX, 1153, 0],
    // vùng che (như AutoCAD): thực thể WIPEOUT (cùng bố cục IMAGE) + đối tượng WIPEOUTVARIABLES
    WIPEOUT: ['AcDbWipeout', 'WipeOut|Product Desc: Object Enabler for WipeOut entity | Company: Autodesk, Inc. | WEB Address: www.autodesk.com', 2175, 1],
    WIPEOUTVARIABLES: ['AcDbWipeoutVariables', 'WipeOut|Product Desc:     WipeOut Dbx Application|Company:          Autodesk, Inc.|WEB Address:      www.autodesk.com', 0, 0],
    // vị trí địa lý (GEOGRAPHICLOCATION, R2010+)
    GEODATA: ['AcDbGeoData', ODBX, 4095, 0],
    // ảnh (như AutoCAD): thực thể IMAGE → IMAGEDEF (tệp ảnh) + IMAGEDEF_REACTOR, biến RASTERVARIABLES
    IMAGE: ['AcDbRasterImage', 'ISM', 127, 1], IMAGEDEF: ['AcDbRasterImageDef', 'ISM', 0, 0], IMAGEDEF_REACTOR: ['AcDbRasterImageDefReactor', 'ISM', 1, 0], RASTERVARIABLES: ['AcDbRasterVariables', 'ISM', 0, 0] };
  const LWV = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211];
  const lwIndex = v => { if(v == null || !isFinite(v)) return 29; v = Math.round(v); if(v === -1) return 29; if(v === -2) return 30; if(v === -3) return 31; let b = 0, bd = Infinity; LWV.forEach((w, i) => { const d = Math.abs(w - v); if(d < bd){ bd = d; b = i; } }); return b; };
  const up = s => String(s == null ? '' : s).toUpperCase();

  /* =====================================================================
     DXF (R2000, của DVDCAD) → DWG AC1015
     ===================================================================== */
  function dwgFromDxf(text, opt){
    opt = opt || {};
    VER = VCODE[opt.version] || (ACV[opt.version] ? +opt.version : 15);
    const R04 = VER >= 18, R07 = VER >= 21, R10 = VER >= 24, R13 = VER >= 27, R18 = VER >= 32;
    // biến thể 2010/2013 có ghi bản bảo trì > 3 → section header/lớp thêm RL cao của cỡ (như AutoCAD)
    const MAINT = { 15: 6, 18: 0x68, 21: 0, 24: 0x6d, 27: 0x7d, 32: 0x1d }[VER], DWGV = { 15: 0x17, 18: 0x19, 21: 0x1b, 24: 0x1d, 27: 0x1f, 32: 0x21 }[VER], HI32 = VER >= 32 || (VER >= 24 && MAINT > 3);
    // số lớp: cấp theo thứ tự dùng (500, 501…); R2004+ LAYOUT là kiểu cố định 82
    const clsUsed = [];
    const cls = n => { if(n === 'LAYOUT' && R04) return 82; let i = clsUsed.indexOf(n); if(i < 0){ clsUsed.push(n); i = clsUsed.length - 1; } return 500 + i; };
    const S = parseDxf(text);
    const HV = headerVars((S.HEADER || [])[0]);
    const hv = (k, c, d) => { const r = HV.get(k); return r ? r.num(c, d) : d; };
    const hvs = (k, c, d) => { const r = HV.get(k); return r ? r.get(c, d) : d; };
    const metric = hv('$MEASUREMENT', 70, 1) !== 0;
    const hasWipe = [...(S.ENTITIES || []), ...(S.BLOCKS || [])].some(r => r.type === 'WIPEOUT');
    for(const n of ['ACDBDICTIONARYWDFLT', 'ACDBPLACEHOLDER', 'LAYOUT'].concat(hasWipe ? ['WIPEOUT', 'WIPEOUTVARIABLES'] : [])) cls(n);

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
        if(c === 1000 && R07){ const s = String(v).slice(0, 255); w.RC(0); w.RS(s.length); for(let i = 0; i < s.length; i++) w.RS(s.charCodeAt(i)); }   // R2007+: RS số ký tự + UTF-16
        else if(c === 1000){ const b = tvBytes(v).slice(0, 255); w.RC(c - 1000); w.RC(b.length); w.RC(0); w.RC(30); w.TF(b); }
        else if(c === 1002){ w.RC(2); w.RC(String(v).trim() === '}' ? 1 : 0); }
        else if(c === 1070){ w.RC(70); w.RS(parseInt(v, 10) || 0); }
        else if(c === 1071){ w.RC(71); w.RL(parseInt(v, 10) || 0); }
        else if(c === 1005){ w.RC(5); let n = BigInt('0x' + (String(v).trim() || '0')); for(let i = 7; i >= 0; i--) w.RC(Number((n >> BigInt(i * 8)) & 0xffn)); }   // handle: 8 byte big-endian
        else if(c >= 1040 && c <= 1042){ w.RC(c - 1000); w.RD(parseFloat(v) || 0); }
      }
      return L.filter(x => x.w.p); }
    // mỗi đối tượng: d = dữ liệu, s = luồng chuỗi (R2007+), hd = luồng handle; o.T(chuỗi) ghi vào đúng luồng theo phiên bản
    const obj = (type, h, src) => { const o = { type, h, d: new BW(64), s: new BW(32), hd: new BW(32) }; o.d.H(0, h);
      o.T = str => { if(R07) o.s.TU(str); else o.d.TV(str); };
      for(const x of eedOf(src)){ o.d.BS(x.w.byte); o.d.H(5, x.h); o.d.append(x.w); }
      o.d.BS(0); out.push(o); return o; };
    // phần chung của đối tượng: số reactor, (R2004+) bit "không có từ điển mở rộng", (R2013+) bit dữ liệu DS
    const objCommon = (o, owner, reactors, xdic) => { o.d.BL(reactors.length); if(R04) o.d.B(xdic ? 0 : 1); if(R13) o.d.B(0);
      o.hd.H(4, owner); for(const r of reactors) o.hd.H(4, r); if(!R04 || xdic) o.hd.H(3, xdic || 0); };
    // bản ghi bảng: tên + cờ xref (R2007+: một BS, 256 = phụ thuộc xref)
    const tableRec = (o, owner, name, xdic) => { objCommon(o, owner, [], xdic); o.T(name); if(R07) o.d.BS(0); else { o.d.B(1); o.d.BS(0); o.d.B(0); } o.hd.H(5, 0); };
    const rgbOf = r => r.has(420) ? (r.int(420) & 0xffffff) : null;
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
    if(!R04) ctrl(T.VX_CONTROL, H_VX, false, []);   // R2004+ bỏ bảng VX

    // ---- bản ghi bảng ----
    for(const r of recsOf('LAYER')){
      const o = obj(T.LAYER, ref(r.get(5))); tableRec(o, 2, r.get(2, '0'));
      const fl = r.int(70), c = r.int(62, 7), off = c < 0, lw = lwIndex(r.has(370) ? r.int(370) : -3);
      o.d.BS((fl & 1 ? 1 : 0) | (off ? 2 : 0) | (fl & 2 ? 4 : 0) | (fl & 4 ? 8 : 0) | (r.int(290, 1) ? 16 : 0) | ((lw & 0x1f) << 5));
      if(R04) o.d.CMC(Math.abs(c) || 7, rgbOf(r)); else o.d.CMC(off ? (-Math.abs(c)) & 0xffff : Math.abs(c) || 7);
      o.hd.H(5, ref(r.get(390))); if(R07) o.hd.H(5, 0); o.hd.H(5, LTYPES.get(up(r.get(6, 'Continuous'))) || hLtCont); if(R13) o.hd.H(5, 0);   // kiểu in, (R2007+) vật liệu, kiểu nét, (R2013+) handle rỗng
    }
    for(const r of recsOf('STYLE')){
      const o = obj(T.STYLE, ref(r.get(5))); tableRec(o, 3, r.get(2, '')); const fl = r.int(70);
      o.d.B(fl & 1); o.d.B(fl & 4); o.d.BD(r.num(40)); o.d.BD(r.num(41, 1)); o.d.BD(r.num(50) * D2R); o.d.RC(r.int(71)); o.d.BD(r.num(42, 2.5)); o.T(r.get(3, '')); o.T(r.get(4, ''));
    }
    for(const r of recsOf('LTYPE')){
      const o = obj(T.LTYPE, ref(r.get(5))); tableRec(o, 5, r.get(2, ''));
      // các nét: 49 chiều dài, 74 cờ (2 chữ, 4 hình, 1 góc tuyệt đối), 75 số hình, 340 kiểu chữ, 46 tỉ lệ, 50 góc, 44/45 lệch, 9 chữ
      const dashes = []; let d = null;
      for(const x of r.g){ const c = x[0], v = x[1];
        if(c === 49){ d = { len: parseFloat(v) || 0, fl: 0, sh: 0, st: 0, sc: 1, rot: 0, x: 0, y: 0, txt: '' }; dashes.push(d); }
        else if(d){ if(c === 74) d.fl = parseInt(v, 10) || 0; else if(c === 75) d.sh = parseInt(v, 10) || 0; else if(c === 340) d.st = ref(v); else if(c === 46) d.sc = parseFloat(v) || 1; else if(c === 50) d.rot = (parseFloat(v) || 0) * D2R; else if(c === 44) d.x = parseFloat(v) || 0; else if(c === 45) d.y = parseFloat(v) || 0; else if(c === 9) d.txt = v; } }
      // vùng chữ của nét: R2004 trở về trước 256 byte (ANSI); R2007+ chỉ khi có nét chữ, 512 byte UTF-16
      const hasTxt = dashes.some(q => q.fl & 2), AN = R07 ? 512 : 256, area = new Uint8Array(AN); let ap = 0;
      for(const q of dashes) if(q.fl & 2){ q.sh = ap;
        if(R07){ const s = String(q.txt); for(let i = 0; i < s.length && ap + 3 < AN; i++){ const c = s.charCodeAt(i); area[ap++] = c & 255; area[ap++] = c >> 8; } ap += 2; }
        else { const b = tvBytes(q.txt); for(const x of b){ if(ap < 255) area[ap++] = x; } if(ap < 256) area[ap++] = 0; } }
      o.T(r.get(3, '')); o.d.BD(r.num(40, dashes.reduce((a, q) => a + Math.abs(q.len), 0))); o.d.RC(r.int(72, 65)); o.d.RC(dashes.length);
      for(const q of dashes){ o.d.BD(q.len); o.d.BS(q.sh); o.hd.H(5, q.st); o.d.RD(q.x); o.d.RD(q.y); o.d.BD(q.sc); o.d.BD(q.rot); o.d.BS(q.fl); }
      if(!R07 || hasTxt) o.d.TF(area);
    }
    for(const r of recsOf('VPORT')){
      const o = obj(T.VPORT, ref(r.get(5))); tableRec(o, 8, r.get(2, '*Active'));
      const vs = r.num(40, 100), ar = r.num(41, 1.6);
      o.d.BD(vs); o.d.BD(vs * ar); o.d.RD2([r.num(12), r.num(22)]); o.d.BD3(r.pt(17)); o.d.BD3([r.num(16), r.num(26), r.num(36, 1)]);
      o.d.BD(r.num(51) * D2R); o.d.BD(r.num(42, 50)); o.d.BD(r.num(43)); o.d.BD(r.num(44)); o.d.B4(r.int(71)); o.d.RC(r.int(281));
      if(R07){ o.d.B(1); o.d.RC(1); o.d.BD(0); o.d.BD(0); o.d.CMC(250); }   // đèn mặc định, kiểu chiếu sáng, độ sáng, tương phản, màu môi trường
      o.d.RD2([r.num(10), r.num(20)]); o.d.RD2([r.num(11, 1), r.num(21, 1)]); o.d.B(r.int(71) & 8); o.d.BS(r.int(72, 1000)); o.d.B(r.int(73, 1)); o.d.BB(r.int(74, 3));
      o.d.B(r.int(76)); o.d.RD2([r.num(15, 10), r.num(25, 10)]); o.d.B(r.int(75)); o.d.B(r.int(77)); o.d.BS(r.int(78)); o.d.BD(r.num(50) * D2R); o.d.RD2([r.num(13), r.num(23)]); o.d.RD2([r.num(14, 10), r.num(24, 10)]);
      o.d.B(0); o.d.B(r.int(65, 1)); o.d.BD3(r.pt(110)); o.d.BD3([r.num(111, 1), r.num(121), r.num(131)]); o.d.BD3([r.num(112), r.num(122, 1), r.num(132)]); o.d.BD(r.num(146)); o.d.BS(r.int(79));
      if(R07){ o.d.BS(r.int(60, 7)); o.d.BS(r.int(61, 5)); o.hd.H(4, 0); o.hd.H(5, 0); o.hd.H(3, 0); }   // lưới (cờ, mỗi bao nhiêu ô có đường chính); nền, kiểu hiển thị, mặt trời
      o.hd.H(5, 0); o.hd.H(5, 0);
    }
    for(const r of recsOf('APPID')){ const o = obj(T.APPID, ref(r.get(5))); tableRec(o, 9, r.get(2, '')); o.d.RC(0); }
    for(const r of recsOf('DIMSTYLE')){
      const o = obj(T.DIMSTYLE, ref(r.get(105))); tableRec(o, 0xA, r.get(2, 'Standard'));
      const dt = r.num(140, metric ? 2.5 : 0.18), N = (c, d) => r.num(c, d), I = (c, d) => r.int(c, d);
      o.T(r.get(3, '')); o.T(r.get(4, ''));
      for(const [c, d] of [[40, 1], [41, metric ? 2.5 : 0.18], [42, metric ? 0.625 : 0.0625], [43, metric ? 3.75 : 0.38], [44, metric ? 1.25 : 0.18], [45, 0], [46, 0], [47, 0], [48, 0]]) o.d.BD(N(c, d));
      if(R07){ o.d.BD(N(49, 1)); o.d.BD(N(50, 45) * D2R); o.d.BS(I(69, 0)); o.d.CMC(I(70, 0)); }   // DIMFXL, DIMJOGANG, DIMTFILL, DIMTFILLCLR
      for(const [c, d] of [[71, 0], [72, 0], [73, metric ? 0 : 1], [74, metric ? 0 : 1], [75, 0], [76, 0]]) o.d.B(I(c, d));
      o.d.BS(I(77, metric ? 1 : 0)); o.d.BS(I(78, metric ? 8 : 0)); o.d.BS(I(79, 0));
      if(R07) o.d.BS(I(90, 0));   // DIMARCSYM
      o.d.BD(dt); o.d.BD(N(141, metric ? 2.5 : 0.09)); o.d.BD(N(142, 0)); o.d.BD(N(143, 25.4)); o.d.BD(N(144, 1)); o.d.BD(N(145, 0)); o.d.BD(N(146, 1)); o.d.BD(N(147, metric ? 0.625 : 0.09)); o.d.BD(N(148, 0));
      o.d.B(I(170, 0)); o.d.BS(I(171, 2)); o.d.B(I(172, metric ? 1 : 0)); o.d.B(I(173, 0)); o.d.B(I(174, 0)); o.d.B(I(175, 0));
      o.d.CMC(I(176, 0)); o.d.CMC(I(177, 0)); o.d.CMC(I(178, 0));
      o.d.BS(I(179, 0)); o.d.BS(I(271, metric ? 2 : 4)); o.d.BS(I(272, metric ? 2 : 4)); o.d.BS(I(273, 2)); o.d.BS(I(274, 2)); o.d.BS(I(275, 0)); o.d.BS(I(276, 0)); o.d.BS(I(277, 2)); o.d.BS(I(278, metric ? 44 : 46)); o.d.BS(I(279, 0)); o.d.BS(I(280, 0));
      o.d.B(I(281, 0)); o.d.B(I(282, 0)); o.d.BS(I(283, 1)); o.d.BS(I(284, metric ? 8 : 0)); o.d.BS(I(285, 0)); o.d.BS(I(286, 0)); o.d.B(I(288, 0)); o.d.BS(I(289, 3));
      if(R07) o.d.B(I(290, 0));   // DIMFXLON
      if(R10){ o.d.B(I(295, 0)); o.d.BD(0); o.T(''); o.d.BD(0); o.T(''); }   // DIMTXTDIRECTION, DIMALTMZF/S, DIMMZF/S
      o.hd.H(5, ref(r.get(340)) || hStd);
      o.d.BS(I(371, -2) & 0xffff); o.d.BS(I(372, -2) & 0xffff); o.d.B(0);
      o.hd.H(5, 0); o.hd.H(5, 0); o.hd.H(5, 0); o.hd.H(5, 0);
      if(R07){ o.hd.H(5, 0); o.hd.H(5, 0); o.hd.H(5, 0); }   // DIMLTYPE, DIMLTEX1, DIMLTEX2
    }

    /* ---------- thực thể: gom theo khối ---------- */
    const SUP = new Set(['LINE', 'CIRCLE', 'ARC', 'POINT', 'LWPOLYLINE', 'TEXT', 'MTEXT', 'SOLID', '3DFACE', 'ELLIPSE', 'XLINE', 'RAY', 'HATCH', 'INSERT', 'ATTDEF', 'DIMENSION', 'WIPEOUT', 'VIEWPORT', 'IMAGE', 'POLYLINE']);
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
      for(const r of (S.ENTITIES || [])){ const ow = (r.type === 'ATTRIB' || r.type === 'SEQEND' || r.type === 'VERTEX') ? lastOw : r.int(67) === 1 ? hPS : (ownerOf(r) || hMS); lastOw = ow; if(!brEnts.has(ow)) brEnts.set(ow, []); brEnts.get(ow).push(r); } }
    // thực thể chính của mỗi khối + ATTRIB/SEQEND gắn vào INSERT
    const entH = new Set(), blockInfo = new Map();
    for(const [br, list] of brEnts){
      const main = [], attOf = new Map(); let lastIns = null, lastPl = null;
      for(const r of list){
        // đa tuyến 3D: VERTEX … SEQEND đi theo POLYLINE đứng trước
        if(lastPl && (r.type === 'VERTEX' || r.type === 'SEQEND')){ const a = attOf.get(lastPl); if(r.type === 'VERTEX') a.verts.push(r); else { a.seq = r; lastPl = null; } continue; }
        if(r.type === 'VERTEX') continue;
        if(r.type === 'POLYLINE'){ if(!(r.int(70) & 8)) continue; main.push(r); attOf.set(r, { verts: [], seq: 0, atts: [] }); lastPl = r; lastIns = null; continue; }
        if(r.type === 'ATTRIB' || r.type === 'SEQEND'){ if(lastIns){ const a = attOf.get(lastIns) || { atts: [], seq: 0 }; attOf.set(lastIns, a); if(r.type === 'ATTRIB') a.atts.push(r); else { a.seq = r; lastIns = null; } } continue; }
        if(!SUP.has(r.type)) continue;
        if(r.type === 'HATCH' && !r.has(91)) continue;
        main.push(r); lastIns = r.type === 'INSERT' && r.int(66) === 1 ? r : null;
      }
      for(const r of main){ entH.add(ref(r.get(5))); }
      blockInfo.set(br, { main, attOf });
    }

    // ---- đối tượng OBJECTS được giữ (bỏ loại chưa hỗ trợ và những gì thuộc chúng / thuộc thực thể) ----
    const outObjH = new Set([H_NOD]); const keep = [];
    const DYNT = ['ACAD_EVALUATION_GRAPH', 'BLOCKVISIBILITYPARAMETER', 'BLOCKVISIBILITYGRIP', 'BLOCKGRIPLOCATIONCOMPONENT', 'ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION', 'ACDB_BLOCKREPRESENTATION_DATA',
      'BLOCKLINEARPARAMETER', 'BLOCKLINEARGRIP', 'BLOCKSTRETCHACTION', 'BLOCKFLIPPARAMETER', 'BLOCKFLIPGRIP', 'BLOCKFLIPACTION'];
    // từ điển mở rộng của thực thể (INSERT của khối động → AcDbBlockRepresentation) được giữ, các đối tượng khác thuộc thực thể thì bỏ
    const entXd = new Set(); if(R07) for(const [, bi] of blockInfo) for(const r of bi.main) for(const v of r.group102('ACAD_XDICTIONARY')) entXd.add(ref(v));
    { const dropped = new Set(); let changed = true; const isEnt = h => entH.has(h);
      const cand = objsDxf.filter(r => ['DICTIONARY', 'ACDBDICTIONARYWDFLT', 'ACDBPLACEHOLDER', 'MLINESTYLE', 'LAYOUT', 'PLOTSETTINGS', 'XRECORD', 'IMAGEDEF', 'IMAGEDEF_REACTOR', 'RASTERVARIABLES'].includes(r.type) || (hasWipe && r.type === 'WIPEOUTVARIABLES') || (R10 && r.type === 'GEODATA') || (R07 && DYNT.includes(r.type)));
      for(const r of objsDxf) if(!cand.includes(r)) dropped.add(ref(r.get(5)));
      while(changed){ changed = false; for(const r of cand){ const h = ref(r.get(5)); if(dropped.has(h)) continue; const ow = ref(r.plain().get(330)); if(h !== H_NOD && ((isEnt(ow) && !entXd.has(h) && r.type !== 'IMAGEDEF_REACTOR') || dropped.has(ow))){ dropped.add(h); changed = true; } } }
      for(const r of cand){ const h = ref(r.get(5)); if(!dropped.has(h)){ keep.push(r); outObjH.add(h); } } }
    // từ điển mở rộng (102 {ACAD_XDICTIONARY) của bản ghi khối — chỉ khi từ điển đó được giữ
    const xdicOf = new Map(); for(const r of blockRecs){ const x = r.group102('ACAD_XDICTIONARY').map(ref).find(v => outObjH.has(v)); if(x) xdicOf.set(ref(r.get(5)), x); }

    // ---- BLOCK_HEADER + BLOCK/ENDBLK ----
    const blkOfBr = new Map(); for(const b of blocks) blkOfBr.set(b.br, b);
    for(const r of blockRecs){
      const h = ref(r.get(5)), name = r.get(2, ''), b = blkOfBr.get(h), info = blockInfo.get(h) || { main: [] };
      const fl = b ? b.blk.int(70) : 0; const base = b ? b.blk.pt(10) : [0, 0, 0];
      let hB = b ? ref(b.blk.get(5)) : 0, hE = b && b.end ? ref(b.end.get(5)) : 0; if(!hB) hB = newH(); if(!hE) hE = newH();
      const xdh = xdicOf.get(h) || 0;   // từ điển mở rộng của bản ghi khối (vd ACAD_GEOGRAPHICDATA của *Model_Space)
      const o = obj(T.BLOCK_HEADER, h, r); tableRec(o, 1, name, xdh);
      o.d.B(fl & 1); o.d.B(fl & 2); o.d.B(fl & 4); o.d.B(fl & 8); o.d.B(0);
      if(R04 && !(fl & 4)) o.d.BL(info.main.length);   // R2004+: số thực thể sở hữu (thay cho handle đầu/cuối)
      o.d.BD3(base); o.T(b ? b.blk.get(1, '') : ''); o.d.RC(0); o.T(b ? b.blk.get(4, '') : ''); o.d.BL(0);
      if(R07){ o.d.BS(r.int(70, 0)); o.d.B(r.has(280) ? r.int(280) : 1); o.d.RC(r.int(281, 0)); }   // đơn vị chèn, cho phép nổ, co giãn đều
      o.hd.H(3, hB);
      if(R04){ if(!(fl & 4)) for(const e of info.main) o.hd.H(3, ref(e.get(5))); }
      else { const first = info.main.length ? ref(info.main[0].get(5)) : 0, last = info.main.length ? ref(info.main[info.main.length - 1].get(5)) : 0; o.hd.H(4, first); o.hd.H(4, last); }
      o.hd.H(3, hE); o.hd.H(5, ref(r.get(340)));
      const mode = h === hMS ? 2 : h === hPS ? 1 : 0;
      const ly = b ? (LAYERS.get(up(b.blk.get(8, '0'))) || hLayer0) : hLayer0;
      const eb = obj(T.BLOCK, hB); entCommon(eb, { mode, owner: h, layer: ly }); eb.T(name);
      const ee = obj(T.ENDBLK, hE); entCommon(ee, { mode, owner: h, layer: b && b.end ? (LAYERS.get(up(b.end.get(8, '0'))) || hLayer0) : hLayer0 });
      // thực thể của khối, nối trước / sau
      info.main.forEach((e, i) => { const pv = i ? ref(info.main[i - 1].get(5)) : 0, nx = i + 1 < info.main.length ? ref(info.main[i + 1].get(5)) : 0;
        entity(e, { mode, owner: h, prev: pv, next: nx }, info.attOf.get(e)); });
    }

    /* ---------- thuộc tính chung của thực thể ---------- */
    function entProps(r){ const p = r.plain(); const lt = p.get(6);
      let ltf = 0, lth = 0; if(lt != null){ const u = up(lt); if(u === 'BYLAYER') ltf = 0; else if(u === 'BYBLOCK') ltf = 1; else if(u === 'CONTINUOUS') ltf = 2; else { lth = LTYPES.get(u) || 0; ltf = lth ? 3 : 0; } }
      return { layer: LAYERS.get(up(p.get(8, '0'))) || hLayer0, color: p.has(62) ? p.int(62) : 256, ltf, lth, lts: p.num(48, 1), lw: lwIndex(p.has(370) ? p.int(370) : -1), inv: p.int(60),
        rgb: rgbOf(p), alpha: p.has(440) ? p.int(440) >>> 0 : null }; }
    function entCommon(o, c){
      const P = c.props || { layer: c.layer || hLayer0, color: 256, ltf: 0, lth: 0, lts: 1, lw: 29, inv: 0 };
      const xd = c.xdic || 0;
      o.d.B(0); o.d.BB(c.mode); o.d.BL(0);
      if(R04) o.d.B(xd ? 0 : 1); if(R13) o.d.B(0); if(!R04) o.d.B(0);   // R2004+: có / không có từ điển mở rộng; R2013+: không có dữ liệu DS; R2000: nolinks = 0 (có handle trước/sau)
      if(R04) o.d.ENC(P.color, P.rgb, P.alpha); else o.d.CMC(P.color & 0xffff);
      o.d.BD(P.lts); o.d.BB(P.ltf);
      if(R07){ o.d.BB(0); o.d.BB(0); o.d.RC(0); } else o.d.BB(0);   // (R2007+ vật liệu, ) kiểu in, (R2007+ bóng đổ) — đều theo lớp
      if(R10){ o.d.B(0); o.d.B(0); o.d.B(0); }   // không gán kiểu hiển thị riêng
      o.d.BS(P.inv); o.d.RC(P.lw);
      if(c.mode === 0) o.hd.H(4, c.owner); if(!R04){ o.hd.H(3, xd); o.hd.H(4, c.prev || 0); o.hd.H(4, c.next || 0); } else if(xd) o.hd.H(3, xd); o.hd.H(5, P.layer); if(P.ltf === 3) o.hd.H(5, P.lth);
    }
    function styleH(r){ return STYLES.get(up(r.get(7, 'Standard'))) || hStd; }
    function textData(o, r, sub2){   // TEXT / ATTRIB / ATTDEF (R2000: dataflags)
      const ins = r.pt(10), al = r.has(11) ? r.pt(11) : ins.slice(), hj = r.int(72), vj = sub2.int(sub2 === r ? 73 : 74), rot = r.num(50) * D2R, wf = r.num(41, 1), ob = r.num(51) * D2R, gen = r.int(71);
      let df = 0xff; if(ins[2] !== 0) df &= ~1; if(al[0] !== ins[0] || al[1] !== ins[1] || hj || vj) df &= ~2; if(ob) df &= ~4; if(rot) df &= ~8; if(wf !== 1) df &= ~0x10; if(gen) df &= ~0x20; if(hj) df &= ~0x40; if(vj) df &= ~0x80;
      o.d.RC(df); if(!(df & 1)) o.d.RD(ins[2]); o.d.RD2(ins); if(!(df & 2)){ o.d.DD(al[0], ins[0]); o.d.DD(al[1], ins[1]); }
      o.d.BE([r.num(210), r.num(220), r.num(230, 1)]); o.d.BT(r.num(39));
      if(!(df & 4)) o.d.RD(ob); if(!(df & 8)) o.d.RD(rot); o.d.RD(r.num(40, 2.5)); if(!(df & 0x10)) o.d.RD(wf);
      o.T(r.get(1, '')); if(!(df & 0x20)) o.d.BS(gen); if(!(df & 0x40)) o.d.BS(hj); if(!(df & 0x80)) o.d.BS(vj);
    }
    // phần chung ATTRIB / ATTDEF sau dữ liệu chữ: (R2010+) phiên bản, (R2018+) kiểu một dòng, thẻ, độ dài trường, cờ, (R2007+) khoá vị trí
    function attData(o, s2){ if(R10) o.d.RC(0); if(R18) o.d.RC(1); o.T(s2.get(2, '')); o.d.BS(s2.int(73)); o.d.RC(s2.int(70)); if(R07) o.d.B(0); }

    // dữ liệu riêng DVDCAD (XDATA "DVDCAD" từng đối tượng) — DVDCAD đọc lại từ khối DVDCADX1 (bộ đọc DWG trong trình duyệt không đọc được EED R2000)
    function keepX(r, h){ let on = false; const it = []; for(const [c, v] of r.g){ if(c === 1001){ on = up(v) === 'DVDCAD'; continue; } if(on && c >= 1000) it.push([c, v]); } if(it.length) PRIV[h.toString(16).toUpperCase()] = it; }
    function entity(r, link, att){
      const h = ref(r.get(5)), P = entProps(r), c = Object.assign({ props: P }, link); let o; keepX(r, h);
      { const x = r.group102('ACAD_XDICTIONARY').map(ref).find(v => outObjH.has(v)); if(x) c.xdic = x; }
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
      else if(t === 'WIPEOUT' || t === 'IMAGE'){ o = obj(cls(t), h, r); entCommon(o, c);   // IMAGE / WIPEOUT: gốc, vector u/v của 1 điểm ảnh, cỡ ảnh, khung cắt (toạ độ điểm ảnh)
        const V = []; let k = null; for(const x of r.g){ if(x[0] === 14) k = [parseFloat(x[1]) || 0, 0]; else if(x[0] === 24 && k){ k[1] = parseFloat(x[1]) || 0; V.push(k); k = null; } }
        o.d.BL(r.int(90)); o.d.BD3(r.pt(10)); o.d.BD3(r.pt(11)); o.d.BD3(r.pt(12)); o.d.RD2([r.num(13, 1), r.num(23, 1)]);
        o.d.BS(r.int(70, 7)); o.d.B(r.int(280, 1)); o.d.RC(r.int(281, 50)); o.d.RC(r.int(282, 50)); o.d.RC(r.int(283, 0));
        if(R10) o.d.B(r.int(290));   // R2010+: cắt phía trong/ngoài
        const ct = V.length === 2 ? 1 : 2; o.d.BS(ct); if(ct === 2) o.d.BL(V.length); for(const q of V) o.d.RD2(q);
        if(t === 'IMAGE'){ const d = ref(r.get(340)), x = ref(r.get(360)); o.hd.H(5, outObjH.has(d) ? d : 0); o.hd.H(3, outObjH.has(x) ? x : 0); } else { o.hd.H(5, 0); o.hd.H(3, 0); } }
      else if(t === 'TEXT'){ o = obj(T.TEXT, h, r); entCommon(o, c); textData(o, r, r); o.hd.H(5, styleH(r)); }
      else if(t === 'ATTDEF'){ o = obj(T.ATTDEF, h, r); entCommon(o, c); const s2 = r.after('AcDbAttributeDefinition'); textData(o, r, s2);
        attData(o, s2); if(R10) o.d.RC(0); o.T(s2.get(3, '')); o.hd.H(5, styleH(r)); }
      else if(t === 'MTEXT'){ o = obj(T.MTEXT, h, r); entCommon(o, c); const txt = r.all(3).join('') + r.get(1, ''); const ht = r.num(40, 2.5), lines = txt.split('\\P').length;
        const ins = r.pt(10), xd = r.has(11) ? r.pt(11) : [1, 0, 0], rw = r.num(41), rh = r.num(46), eh = ht * (lines * 1.6667 - 0.6667), ew = Math.max(...txt.split('\\P').map(s => s.length), 1) * ht * 0.7;
        o.d.BD3(ins); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.BD3(xd); o.d.BD(rw); if(R07) o.d.BD(rh); o.d.BD(ht); o.d.BS(r.int(71, 1)); o.d.BS(r.int(72, 1));
        o.d.BD(eh); o.d.BD(ew); o.T(txt); o.hd.H(5, styleH(r)); o.d.BS(r.int(73, 1)); o.d.BD(r.num(44, 1)); o.d.B(0);
        if(R04){ const bg = r.int(90); o.d.BL(bg); if(bg & 1){ o.d.BD(r.num(45, 1.5)); o.d.CMC(r.int(63, 256), r.has(421) ? r.int(421) & 0xffffff : null); o.d.BL(r.int(441)); } }   // nền chữ
        if(R18){ o.d.B(1); o.d.BS(4); o.d.B(1); o.hd.H(5, 0); o.d.BL(r.int(71, 1)); o.d.BD3(xd); o.d.BD3(ins); o.d.BD(rw); o.d.BD(rh); o.d.BD(ew); o.d.BD(eh); o.d.BS(0); } }   // R2018+: không chú thích (annotative) → các trường nhắc lại, không chia cột
      else if(t === 'SOLID'){ o = obj(T.SOLID, h, r); entCommon(o, c); o.d.BT(r.num(39)); o.d.BD(r.num(30)); for(const k of [10, 11, 12, 13]) o.d.RD2([r.num(k), r.num(k + 10)]); o.d.BE([r.num(210), r.num(220), r.num(230, 1)]); }
      else if(t === '3DFACE'){ o = obj(T.FACE3D, h, r); entCommon(o, c); const q = [10, 11, 12, 13].map(k => r.pt(k)); const inv = r.int(70);
        o.d.B(inv ? 0 : 1); const zz = q[0][2] === 0; o.d.B(zz); o.d.RD(q[0][0]); o.d.RD(q[0][1]); if(!zz) o.d.RD(q[0][2]);
        for(let i = 1; i < 4; i++) for(let k = 0; k < 3; k++) o.d.DD(q[i][k], q[i - 1][k]); if(inv) o.d.BS(inv); }
      else if(t === 'ELLIPSE'){ o = obj(T.ELLIPSE, h, r); entCommon(o, c); o.d.BD3(r.pt(10)); o.d.BD3(r.pt(11)); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.BD(r.num(40, 1)); o.d.BD(r.num(41)); o.d.BD(r.num(42, Math.PI * 2)); }
      else if(t === 'XLINE' || t === 'RAY'){ o = obj(t === 'RAY' ? T.RAY : T.XLINE, h, r); entCommon(o, c); o.d.BD3(r.pt(10)); o.d.BD3(r.pt(11)); }
      else if(t === 'VIEWPORT'){ o = obj(T.VIEWPORT, h, r); entCommon(o, c);   // khung nhìn của layout (R2000): tâm/cỡ trên giấy, đích + hướng nhìn, cao vùng nhìn, tâm nhìn DCS
        o.d.BD3(r.pt(10)); o.d.BD(r.num(40)); o.d.BD(r.num(41));
        o.d.BD3(r.pt(17)); o.d.BD3([r.num(16), r.num(26), r.num(36, 1)]); o.d.BD(r.num(51) * D2R); o.d.BD(r.num(45, 1)); o.d.BD(r.num(42, 50)); o.d.BD(r.num(43)); o.d.BD(r.num(44)); o.d.BD(r.num(50) * D2R);
        o.d.RD2([r.num(12), r.num(22)]); o.d.RD2([r.num(13), r.num(23)]); o.d.RD2([r.num(14, 10), r.num(24, 10)]); o.d.RD2([r.num(15, 10), r.num(25, 10)]); o.d.BS(r.int(72, 1000));
        if(R07) o.d.BS(r.int(61, 5));   // lưới chính
        const frz = r.g.filter(x => x[0] === 331 || x[0] === 341).map(x => ref(x[1])).filter(Boolean), clip = ref(r.get(340));   // lớp đóng băng riêng (VPLAYER), đường cắt (VPCLIP)
        o.d.BL(frz.length); o.d.BL(r.int(90, 32864)); o.T(r.get(1, '')); o.d.RC(r.int(281)); o.d.B(r.int(74)); o.d.B(r.int(71)); o.d.BD3(r.pt(110)); o.d.BD3([r.num(111, 1), r.num(121), r.num(131)]); o.d.BD3([r.num(112), r.num(122, 1), r.num(132)]); o.d.BD(r.num(146)); o.d.BS(r.int(79));
        if(R04) o.d.BS(r.int(170));   // kiểu in tô bóng
        if(R07){ o.d.B(1); o.d.RC(1); o.d.BD(0); o.d.BD(0); o.d.CMC(250); }   // đèn mặc định, kiểu chiếu sáng, độ sáng, tương phản, màu môi trường
        // lớp đóng băng (R2000 hard pointer, R2004+ soft pointer), đường cắt (340), đầu VX (chỉ R2000), UCS tên (345), UCS gốc (346); R2007+: nền, kiểu hiển thị, tô bóng, mặt trời
        for(const h of frz) o.hd.H(R04 ? 4 : 5, h); o.hd.H(5, clip && entH.has(clip) ? clip : 0); if(!R04) o.hd.H(5, 0); o.hd.H(5, 0); o.hd.H(5, 0);
        if(R07){ o.hd.H(4, 0); o.hd.H(5, 0); o.hd.H(4, 0); o.hd.H(3, 0); } }
      else if(t === 'HATCH'){ o = obj(T.HATCH, h, r); entCommon(o, c); hatch(o, r.after('AcDbHatch')); }
      else if(t === 'INSERT'){ o = obj(T.INSERT, h, r); entCommon(o, c);
        const s = [r.num(41, 1), r.num(42, 1), r.num(43, 1)]; o.d.BD3(r.pt(10));
        if(s[0] === 1 && s[1] === 1 && s[2] === 1) o.d.BB(3);
        else if(s[0] === s[1] && s[0] === s[2]){ o.d.BB(2); o.d.RD(s[0]); }
        else if(s[0] === 1){ o.d.BB(1); o.d.DD(s[1], 1); o.d.DD(s[2], 1); }
        else { o.d.BB(0); o.d.RD(s[0]); o.d.DD(s[1], s[0]); o.d.DD(s[2], s[0]); }
        o.d.BD(r.num(50) * D2R); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); const A = att && att.atts.length ? att : null; o.d.B(A ? 1 : 0);
        if(R04 && A) o.d.BL(A.atts.length);   // R2004+: số ATTRIB sở hữu
        o.hd.H(5, BLOCKREC.get(up(r.get(2))) || 0);
        if(A){ const hs = A.atts.map(a => ref(a.get(5))); let hq = A.seq ? ref(A.seq.get(5)) : 0; if(!hq) hq = newH();
          if(R04) for(const x of hs) o.hd.H(4, x); else { o.hd.H(4, hs[0]); o.hd.H(4, hs[hs.length - 1]); } o.hd.H(3, hq);
          A.atts.forEach((a, i) => { const oa = obj(T.ATTRIB, hs[i]); entCommon(oa, { props: entProps(a), mode: 0, owner: h, prev: i ? hs[i - 1] : 0, next: i + 1 < hs.length ? hs[i + 1] : 0 });
            const s2 = a.after('AcDbAttribute'); textData(oa, a, s2); attData(oa, s2); if(R10) oa.d.RC(0); oa.hd.H(5, styleH(a)); });
          const os = obj(T.SEQEND, hq); entCommon(os, { props: A.seq ? entProps(A.seq) : P, mode: 0, owner: h }); } }
      else if(t === 'POLYLINE'){ const P3 = att || { verts: [] }; const V = P3.verts; o = obj(T.POLYLINE_3D, h, r); entCommon(o, c);   // đa tuyến 3D: kiểu đường cong (75), cờ (70: bit 1 = kín)
        o.d.RC(r.int(75)); o.d.RC(r.int(70) & 1); if(R04) o.d.BL(V.length);
        const hs = V.map(v => ref(v.get(5)) || newH()); let hq = P3.seq ? ref(P3.seq.get(5)) : 0; if(!hq) hq = newH();
        if(R04) for(const x of hs) o.hd.H(3, x); else { o.hd.H(4, hs[0] || 0); o.hd.H(4, hs[hs.length - 1] || 0); } o.hd.H(3, hq);
        // R2000: chuỗi trước / sau VERTEX … SEQEND (đỉnh cuối trỏ tới SEQEND như AutoCAD — bộ đọc đi theo chuỗi này)
        V.forEach((v, i) => { const ov = obj(T.VERTEX_3D, hs[i]); entCommon(ov, { props: entProps(v), mode: 0, owner: h, prev: i ? hs[i - 1] : 0, next: i + 1 < hs.length ? hs[i + 1] : hq }); ov.d.RC(v.int(70, 32)); ov.d.BD3(v.pt(10)); });
        const os = obj(T.SEQEND, hq); entCommon(os, { props: P3.seq ? entProps(P3.seq) : P, mode: 0, owner: h, prev: hs.length ? hs[hs.length - 1] : 0 }); }
      else if(t === 'DIMENSION'){ dimension(r, h, c); return; }
      return o;
    }
    function hatch(o, r){
      const g = r.g; let i = 0; const nx = c => { while(i < g.length && g[i][0] !== c) i++; return i < g.length ? g[i++][1] : null; };
      const num = v => parseFloat(v) || 0, int = v => parseInt(v, 10) || 0;
      const solid = r.int(70) === 1;
      if(R04){ o.d.BL(0); o.d.BL(0); o.d.BD(0); o.d.BD(0); o.d.BL(0); o.d.BD(0); o.d.BL(0); o.T(''); }   // R2004+: tô chuyển màu (không dùng)
      o.d.BD(r.num(30)); o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.T(r.get(2, 'SOLID')); o.d.B(solid); o.d.B(r.int(71));
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
      if(R10) o.d.RC(0);   // R2010+: phiên bản lớp
      o.d.BD3([r.num(210), r.num(220), r.num(230, 1)]); o.d.RD2(t11); o.d.BD(t11[2]); o.d.RC((r.int(70) & 128 ? 0 : 1) | 2);
      o.T(r.get(1, '')); o.d.BD(r.num(53) * D2R); o.d.BD(r.num(51) * D2R); o.d.BD3([1, 1, 1]); o.d.BD(r.num(54) * D2R);
      o.d.BS(r.int(71, 5)); o.d.BS(r.int(72, 1)); o.d.BD(r.num(41, 1)); o.d.BD(r.num(42, meas));
      if(R07){ o.d.B(0); o.d.B(r.int(74)); o.d.B(r.int(75)); }   // R2007+: (không rõ), lật mũi tên 1, 2
      o.d.RD2([r.num(12), r.num(22)]);
      if(D === T.DIM_LIN || D === T.DIM_ALI){ o.d.BD3(p13); o.d.BD3(p14); o.d.BD3(def); o.d.BD(s.num(52) * D2R); if(D === T.DIM_LIN) o.d.BD(rot); }
      else if(D === T.DIM_ANG3){ o.d.BD3(def); o.d.BD3(p13); o.d.BD3(p14); o.d.BD3(p15); }
      else if(D === T.DIM_RAD){ o.d.BD3(def); o.d.BD3(p15); o.d.BD(s.num(40)); }
      else { o.d.BD3(p15); o.d.BD3(def); o.d.BD(s.num(40)); }
      o.hd.H(5, DIMSTYLES.get(up(r.get(3, 'Standard'))) || hDimStd); o.hd.H(5, BLOCKREC.get(up(r.get(2))) || 0);
    }

    /* ---------- OBJECTS: từ điển, layout, kiểu đa tuyến, XRECORD… ---------- */
    // GEODATA (R2010+, lớp AcDbGeoData bản 2/3): khối chủ, kiểu toạ độ, điểm thiết kế / tham chiếu, đơn vị, hướng lên, hướng bắc, hệ toạ độ (XML)
    function geodata(r, h, owner, rx){ const s = r.after('AcDbGeoData'), o = obj(cls('GEODATA'), h); objCommon(o, owner, rx);
      o.d.BL(R13 ? 3 : 2); o.hd.H(4, ref(s.get(330)) || hMS); o.d.BS(s.int(70, 3)); o.d.BD3(s.pt(10)); o.d.BD3(s.pt(11));
      o.d.BD(s.num(40, 1)); o.d.BL(s.int(91, 6)); o.d.BD(s.num(41, 1)); o.d.BL(s.int(92, 6)); o.d.BD3([s.num(210), s.num(220), s.num(230, 1)]); o.d.RD2([s.num(12), s.num(22, 1)]);
      o.d.BL(s.int(95, 1)); o.d.BD(s.num(141, 1)); o.d.B(s.int(294)); o.d.BD(s.num(142)); o.d.BD(s.num(143, 6378137));
      o.T(s.all(303).join('') + s.get(301, '')); o.T(s.get(302, '')); o.T(s.get(305, '')); o.T(s.get(306, '')); o.T(s.get(307, ''));
      o.d.BL(0); o.d.BL(0); }   // không có lưới nắn
    // khối động (R2007+, bố cục như AutoCAD 2018): biểu thức đánh giá = BL -1, BL 98, BL 99, BS mã giá trị (-9999 = không có) [+ giá trị], BL id
    const brOfXd = new Map(); for(const [b, x] of xdicOf) brOfXd.set(x, b);
    const sub = (r, v) => { const a = r.after(v), q = new Rec(r.type); for(const x of a.g){ if(x[0] === 100) break; q.g.push(x); } return q; };   // nhóm mã của đúng 1 subclass
    const evalExpr = (o, r) => { const s = sub(r, 'AcDbEvalExpr'); o.d.BL(-1); o.d.BL(s.int(98, 33)); o.d.BL(s.int(99, 329));
      if(s.has(70)){ const c = s.int(70); o.d.BS(c); if(c >= 40 && c <= 59) o.d.BD(s.num(140)); else if(c >= 90 && c <= 99) o.d.BL(s.int(140)); else if(c === 70) o.d.BS(parseInt(s.all(70)[1], 10) || 0); else o.d.BS(s.int(140)); } else o.d.BS(-9999);
      o.d.BL(s.int(90)); };
    const blockElem = (o, r) => { const s = sub(r, 'AcDbBlockElement'); o.T(s.get(300, '')); o.d.BL(s.int(98, 33)); o.d.BL(s.int(99, 329)); o.d.BL(s.int(1071)); };
    const known = h => entH.has(h) || outObjH.has(h);
    // grip: phần tử khối + BL id thành phần vị trí X / Y, 3BD vị trí, B xoay vòng, BL trọng số
    const blockGrip = (o, r) => { evalExpr(o, r); blockElem(o, r); const g = sub(r, 'AcDbBlockGrip'); o.d.BL(g.int(91)); o.d.BL(g.int(92)); o.d.BD3(g.pt(1010)); o.d.B(g.int(280)); o.d.BL(g.int(93, -1)); };
    // tham số 2 điểm: B hiện thuộc tính, B nối hành động, 3BD gốc / cuối, 4 nhóm liên kết dời điểm (BS số + [BL id, TV tên]), 4 BL id grip, BS vị trí gốc
    const block2Pt = (o, r) => { evalExpr(o, r); blockElem(o, r); const bp = sub(r, 'AcDbBlockParameter'), s = sub(r, 'AcDbBlock2PtParameter'); o.d.B(bp.int(280, 1)); o.d.B(bp.int(281)); o.d.BD3(s.pt(1010)); o.d.BD3(s.pt(1011));
      const grips = [], cs = [[], [], [], []]; let cur = -1, id = 0; for(const [c, v] of s.g){ if(c === 91 && grips.length < 4) grips.push(parseInt(v, 10) || 0); else if(c >= 171 && c <= 174) cur = c - 171; else if(cur >= 0 && c === 92 + cur) id = parseInt(v, 10) || 0; else if(cur >= 0 && c === 301 + cur) cs[cur].push([id, v]); }
      for(const q of cs){ o.d.BS(q.length); for(const [k, nm] of q){ o.d.BL(k); o.T(nm); } } for(let k = 0; k < 4; k++) o.d.BL(grips[k] || 0); o.d.BS(s.int(177)); };
    // hành động: phần tử khối + 3BD vị trí nhãn, BL số đối tượng chọn + handle, BL số id tham số / hành động được chọn + các id
    const blockAction = (o, r) => { evalExpr(o, r); blockElem(o, r); const a = sub(r, 'AcDbBlockAction'); o.d.BD3(a.pt(1010)); const hs = a.all(330).map(ref).filter(known);
      o.d.BL(hs.length); for(const x of hs) o.hd.H(4, x); const ids = a.all(91); o.d.BL(ids.length); for(const v of ids) o.d.BL(parseInt(v, 10) || 0); };
    function dynObj(r, h, owner, rx){ const o = obj(cls(r.type), h); objCommon(o, owner, rx);
      if(r.type === 'ACAD_EVALUATION_GRAPH'){ const g = r.after('AcDbEvalGraph').g; let i = 0; const nx = () => g[i++] || [0, '0'], iv = () => parseInt(nx()[1], 10) || 0;
        while(i < g.length && (g[i][0] === 96 || g[i][0] === 97)) o.d.BL(iv());
        const nodes = [], edges = []; while(i < g.length && g[i][0] === 91){ nodes.push([iv(), iv(), iv(), ref(nx()[1]), iv(), iv(), iv(), iv()]); }
        while(i < g.length && g[i][0] === 92){ edges.push([iv(), iv(), iv(), iv(), iv(), iv(), iv(), iv(), iv(), iv()]); }
        o.d.BL(nodes.length); for(const n of nodes){ o.d.BL(n[0]); o.d.BL(n[1]); o.d.BL(n[2]); o.hd.H(3, n[3]); for(let k = 4; k < 8; k++) o.d.BL(n[k]); }
        o.d.BL(edges.length); for(const e of edges) for(const v of e) o.d.BL(v); }
      else if(r.type === 'BLOCKVISIBILITYPARAMETER'){ evalExpr(o, r); blockElem(o, r); const bp = r.after('AcDbBlockParameter'), p1 = r.after('AcDbBlock1PtParameter'), v = r.after('AcDbBlockVisibilityParameter');
        o.d.B(bp.int(280, 1)); o.d.B(bp.int(281)); o.d.BD3(p1.pt(1010)); o.d.BS(0); o.d.BS(0); o.d.BL(p1.int(93));
        o.d.B(v.int(281, 1)); o.T(v.get(301, '')); o.T(v.get(302, '')); o.d.B(v.int(91));
        const all = [], st = []; let cur = null; for(const [c, x] of v.g){ if(c === 331) all.push(ref(x)); else if(c === 303){ cur = { n: x, hs: [] }; st.push(cur); } else if(c === 332 && cur) cur.hs.push(ref(x)); }
        o.d.BL(all.length); for(const x of all) o.hd.H(4, x);
        o.d.BL(st.length); for(const q of st){ o.T(q.n); o.d.BL(q.hs.length); for(const x of q.hs) o.hd.H(4, x); o.d.BL(0); } }
      else if(r.type === 'BLOCKVISIBILITYGRIP') blockGrip(o, r);
      else if(r.type === 'BLOCKLINEARPARAMETER'){ block2Pt(o, r); const f = sub(r, 'AcDbBlockLinearParameter'); o.T(f.get(305, '')); o.T(f.get(306, '')); o.d.BD(f.num(140));
        o.d.BL(f.int(96)); o.d.BD(f.num(141)); o.d.BD(f.num(142)); o.d.BD(f.num(143)); const vs = f.all(144); o.d.BS(vs.length); for(const v of vs) o.d.BD(parseFloat(v) || 0); }   // tập giá trị: BL kiểu, BD min / max / bước, BS số + BD
      else if(r.type === 'BLOCKFLIPPARAMETER'){ block2Pt(o, r); const f = sub(r, 'AcDbBlockFlipParameter'); for(const c of [305, 306, 307, 308]) o.T(f.get(c, '')); o.d.BD3(f.pt(1012)); o.d.BL(f.int(96)); o.T(f.get(309, '')); }
      else if(r.type === 'BLOCKLINEARGRIP'){ blockGrip(o, r); const g = sub(r, 'AcDbBlockLinearGrip'); o.d.BD(g.num(140)); o.d.BD(g.num(141)); o.d.BD(g.num(142)); }
      else if(r.type === 'BLOCKFLIPGRIP'){ blockGrip(o, r); const g = sub(r, 'AcDbBlockFlipGrip'); o.d.BL(g.int(93)); o.d.BD(g.num(140)); o.d.BD(g.num(141)); o.d.BD(g.num(142)); }
      else if(r.type === 'BLOCKFLIPACTION'){ blockAction(o, r); const f = sub(r, 'AcDbBlockFlipAction'); for(let k = 0; k < 4; k++){ o.d.BL(f.int(92 + k)); o.T(f.get(301 + k, '')); } }
      else if(r.type === 'BLOCKSTRETCHACTION'){ blockAction(o, r); const s = sub(r, 'AcDbBlockStretchAction'); o.d.BL(s.int(92)); o.T(s.get(301, '')); o.d.BL(s.int(93)); o.T(s.get(302, ''));
        // khung (2RD), các nét được dời điểm (handle + BL số + BL chỉ số điểm), các tham số được dời (BL id + BL số + BL chỉ số), BD hệ số, BD góc lệch, RC cờ
        const pts = [], binds = [], nodes = []; let mode = 0, cur = null;
        for(const [c, v] of s.g){ if(c === 1011) pts.push([parseFloat(v) || 0, 0]); else if(c === 1021 && pts.length) pts[pts.length - 1][1] = parseFloat(v) || 0; else if(c === 73) mode = 1; else if(c === 75) mode = 2;
          else if(c === 331 && mode === 1){ cur = { h: ref(v), ix: [] }; binds.push(cur); } else if(c === 95 && mode === 2){ cur = { id: parseInt(v, 10) || 0, ix: [] }; nodes.push(cur); } else if(c === 94 && cur) cur.ix.push(parseInt(v, 10) || 0); }
        o.d.BL(pts.length); for(const q of pts) o.d.RD2(q);
        const bs = binds.filter(b => known(b.h)); o.d.BL(bs.length); for(const b of bs){ o.hd.H(4, b.h); o.d.BL(b.ix.length); for(const x of b.ix) o.d.BL(x); }
        o.d.BL(nodes.length); for(const n of nodes){ o.d.BL(n.id); o.d.BL(n.ix.length); for(const x of n.ix) o.d.BL(x); }
        o.d.BD(s.num(140, 1)); o.d.BD(s.num(141)); o.d.RC(s.int(280)); }
      else if(r.type === 'BLOCKGRIPLOCATIONCOMPONENT'){ evalExpr(o, r); const g = r.after('AcDbBlockGripExpr'); o.d.BL(g.int(91)); o.T(g.get(300, '')); }
      else if(r.type === 'ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION'){ o.d.BS(r.after('AcDbDynamicBlockPurgePreventer').int(70, 1)); o.hd.H(5, brOfXd.get(owner) || 0); }
      else if(r.type === 'ACDB_BLOCKREPRESENTATION_DATA'){ const s = r.after('AcDbBlockRepresentationData'); o.d.BS(s.int(70, 1)); o.hd.H(5, ref(s.get(340))); } }
    for(const r of keep){
      const h = ref(r.get(5)), p = r.plain(), owner = h === H_NOD ? 0 : ref(p.get(330)), rx = h === H_NOD ? [] : reactorsOf(r);
      if(DYNT.includes(r.type)){ dynObj(r, h, owner, rx); continue; }
      if(r.type === 'DICTIONARY' || r.type === 'ACDBDICTIONARYWDFLT'){
        const o = obj(r.type === 'DICTIONARY' ? T.DICT : cls('ACDBDICTIONARYWDFLT'), h); objCommon(o, owner, rx);
        const items = []; let k = null; for(const x of p.g){ if(x[0] === 3) k = x[1]; else if((x[0] === 350 || x[0] === 360) && k != null){ const v = ref(x[1]); if(outObjH.has(v) || entH.has(v)) items.push([k, v]); k = null; } }
        o.d.BL(items.length); o.d.BS(p.int(281, 1)); o.d.RC(p.int(280, 0)); for(const [n] of items) o.T(n); for(const [, v] of items) o.hd.H(2, v);
        if(r.type === 'ACDBDICTIONARYWDFLT') o.hd.H(5, ref(r.after('AcDbDictionaryWithDefault').get(340)));
      }
      else if(r.type === 'ACDBPLACEHOLDER'){ const o = obj(cls('ACDBPLACEHOLDER'), h); objCommon(o, owner, rx); }
      else if(r.type === 'IMAGEDEF'){ const o = obj(cls('IMAGEDEF'), h); objCommon(o, owner, rx); const s = r.after('AcDbRasterImageDef');   // BL bản, 2RD cỡ (điểm ảnh), TV tệp, B đã nạp, RC đơn vị, 2RD cỡ 1 điểm ảnh
        o.d.BL(s.int(90)); o.d.RD2([s.num(10, 1), s.num(20, 1)]); o.T(s.get(1, '')); o.d.B(s.int(280, 1)); o.d.RC(s.int(281)); o.d.RD2([s.num(11, 1), s.num(21, 1)]); }
      else if(r.type === 'IMAGEDEF_REACTOR'){ const o = obj(cls('IMAGEDEF_REACTOR'), h); objCommon(o, owner, rx); o.d.BL(r.after('AcDbRasterImageDefReactor').int(90, 2)); }
      else if(r.type === 'RASTERVARIABLES'){ const o = obj(cls('RASTERVARIABLES'), h); objCommon(o, owner, rx); const s = r.after('AcDbRasterVariables'); o.d.BL(s.int(90)); o.d.BS(s.int(70, 1)); o.d.BS(s.int(71, 1)); o.d.BS(s.int(72)); }
      else if(r.type === 'WIPEOUTVARIABLES'){ const o = obj(cls('WIPEOUTVARIABLES'), h); objCommon(o, owner, rx); o.d.BS(r.after('AcDbWipeoutVariables').int(70, 1)); }
      else if(r.type === 'GEODATA') geodata(r, h, owner, rx);
      else if(r.type === 'MLINESTYLE'){ const o = obj(T.MLINESTYLE, h); objCommon(o, owner, rx); const s = r.after('AcDbMlineStyle');
        o.T(s.get(2, 'Standard')); o.T(s.get(3, '')); o.d.BS(s.int(70)); o.d.CMC(s.int(62, 256)); o.d.BD(s.num(51, 90) * D2R); o.d.BD(s.num(52, 90) * D2R);
        const ls = []; let L = null; for(const x of s.g){ if(x[0] === 49){ L = { off: parseFloat(x[1]) || 0, col: 256, lt: 'BYLAYER' }; ls.push(L); } else if(L && x[0] === 62) L.col = parseInt(x[1], 10) || 0; else if(L && x[0] === 6) L.lt = x[1]; }
        o.d.RC(ls.length); for(const q of ls){ o.d.BD(q.off); o.d.CMC(q.col & 0xffff); const u = up(q.lt);
          if(R18) o.hd.H(5, LTYPES.get(u) || hLtByLayer); else o.d.BS(u === 'BYBLOCK' ? 32766 : u === 'BYLAYER' ? 32767 : 0); } }   // R2018+: handle kiểu nét thay cho số
      else if(r.type === 'LAYOUT' || r.type === 'PLOTSETTINGS'){ const o = obj(cls(r.type), h); objCommon(o, owner, rx); const s = r.after('AcDbPlotSettings'), l = r.after('AcDbLayout');
        // AcDbPlotSettings: chung cho LAYOUT và thiết lập trang có tên (PLOTSETTINGS trong ACAD_PLOTSETTINGS)
        o.T(s.get(1, '')); o.T(s.get(2, '')); o.d.BS(s.int(70)); for(const k of [40, 41, 42, 43, 44, 45]) o.d.BD(s.num(k)); o.T(s.get(4, ''));
        o.d.BD2([s.num(46), s.num(47)]); o.d.BS(s.int(72)); o.d.BS(s.int(73)); o.d.BS(s.int(74)); o.d.BD2([s.num(48), s.num(49)]); o.d.BD2([s.num(140), s.num(141)]);
        if(R04) o.hd.H(4, 0); else o.T(s.get(6, ''));   // khung nhìn in: R2004+ là handle VIEW
        o.d.BD(s.num(142, 1)); o.d.BD(s.num(143, 1)); o.T(s.get(7, '')); o.d.BS(s.int(75)); o.d.BD(s.num(147, 1)); o.d.BD2([s.num(148), s.num(149)]);
        if(R04){ o.d.BS(s.int(76)); o.d.BS(s.int(77, 2)); o.d.BS(s.int(78, 300)); } if(R07) o.hd.H(4, 0);   // in tô bóng: kiểu, độ phân giải, DPI; (R2007+) kiểu hiển thị khi in
        if(r.type === 'PLOTSETTINGS') continue;
        o.T(l.get(1, '')); o.d.BS(l.int(71)); o.d.BS(l.int(70)); o.d.BD3(l.pt(12)); o.d.RD2([l.num(10), l.num(20)]); o.d.RD2([l.num(11), l.num(21)]);
        o.d.BD3(l.pt(13)); o.d.BD3([l.num(16, 1), l.num(26), l.num(36)]); o.d.BD3([l.num(17), l.num(27, 1), l.num(37)]); o.d.BD(l.num(146)); o.d.BS(l.int(76)); o.d.BD3(l.pt(14)); o.d.BD3(l.pt(15));
        const lbr = ref(l.get(330)), vps = R04 ? ((blockInfo.get(lbr) || { main: [] }).main.filter(e => e.type === 'VIEWPORT').map(e => ref(e.get(5)))) : [];
        if(R04) o.d.BL(vps.length);   // R2004+: danh sách khung nhìn của layout
        const av = ref(l.get(331)); o.hd.H(4, lbr); o.hd.H(4, entH.has(av) ? av : 0); o.hd.H(5, 0); o.hd.H(5, 0); for(const v of vps) o.hd.H(4, v); }
      else if(r.type === 'XRECORD'){ const o = obj(T.XRECORD, h); objCommon(o, owner, rx); const s = r.after('AcDbXrecord'); const items = s.g.filter(x => x[0] !== 280);
        const xd = new BW(256); for(let q = 0; q < items.length; q++){ const [c, v] = items[q];
          if((c >= 20 && c <= 39) || (c >= 1020 && c <= 1039)) continue;   // Y / Z đã ghi cùng X
          xd.RS(c);
          if((c >= 10 && c <= 19) || (c >= 1010 && c <= 1019)){ const fy = items.find((x, k) => k > q && x[0] === c + 10), fz = items.find((x, k) => k > q && x[0] === c + 20); xd.RD(parseFloat(v) || 0); xd.RD(fy ? parseFloat(fy[1]) || 0 : 0); xd.RD(fz ? parseFloat(fz[1]) || 0 : 0); continue; }
          if(c === 1071 || (c >= 420 && c <= 459)){ xd.RL(parseInt(v, 10) || 0); continue; } if(c >= 1060 && c <= 1070){ xd.RS(parseInt(v, 10) || 0); continue; }
          if((c >= 0 && c <= 9) || (c >= 300 && c <= 309) || c === 1000){ if(R07){ const t = String(v); xd.RS(t.length); for(let i = 0; i < t.length; i++) xd.RS(t.charCodeAt(i)); } else { const b = tvBytes(v); xd.RS(b.length); xd.RC(30); xd.TF(b); } }   // R2007+: RS số ký tự + UTF-16
          else if(c >= 280 && c <= 289){ xd.RC(parseInt(v, 10) || 0); } else if(c >= 90 && c <= 99){ xd.RL(parseInt(v, 10) || 0); } else if(c >= 60 && c <= 79){ xd.RS(parseInt(v, 10) || 0); } else xd.RD(parseFloat(v) || 0); }
        o.d.BL(xd.byte); o.d.append(xd); o.d.BS(s.int(280, 1)); }
    }

    /* ---------- mã hoá từng đối tượng ----------
       R2000/R2004: MS cỡ + [BS kiểu, RL bitsize, dữ liệu, handle] + CRC
       R2007:       MS cỡ + [BS kiểu, RL bitsize, dữ liệu, luồng chuỗi + RS cỡ + bit có chuỗi, handle] + CRC
       R2010+:      MS cỡ + UMC số bit luồng handle + [BOT kiểu, dữ liệu, luồng chuỗi + RS cỡ + bit có chuỗi, handle] + CRC */
    const enc = o => {
      if(!R07){ const w = new BW(((o.d.p + o.hd.p) >> 3) + 16); w.BS(o.type); w.RL(w.p + 32 + o.d.p); w.append(o.d); w.append(o.hd); w.pad();
        const n = w.p >> 3, f = new BW(n + 8); f.MS(n); f.append(w); f.crc(0); return f.bytes(); }
      if(!R10){ // R2007: BS kiểu + RL bitsize (tới đầu luồng handle) + dữ liệu + luồng chuỗi (RS cỡ + bit có chuỗi) + handle
        const sn = o.s.p, st = sn ? sn + (sn >= 0x8000 ? 32 : 16) + 1 : 1, w = new BW(((o.d.p + sn + o.hd.p) >> 3) + 24); w.BS(o.type); w.RL(w.p + 32 + o.d.p + st); w.append(o.d);
        if(sn){ w.append(o.s); if(sn >= 0x8000){ w.RS((sn >> 15) & 0xffff); w.RS((sn & 0x7fff) | 0x8000); } else w.RS(sn); w.B(1); } else w.B(0);
        w.append(o.hd); w.pad(); const n = w.p >> 3, f = new BW(n + 8); f.MS(n); f.append(w); f.crc(0); return f.bytes(); }
      const w = new BW(((o.d.p + o.s.p + o.hd.p) >> 3) + 24); w.BOT(o.type); w.append(o.d);
      if(o.s.p){ const n = o.s.p; w.append(o.s); if(n >= 0x8000){ w.RS((n >> 15) & 0xffff); w.RS((n & 0x7fff) | 0x8000); } else w.RS(n); w.B(1); } else w.B(0);
      const hs = w.p; w.append(o.hd); w.pad();
      const n = w.p >> 3, f = new BW(n + 12); f.MS(n); f.UMC(w.p - hs); f.append(w); f.crc(0); return f.bytes(); };
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
    // ws = luồng chuỗi, wh = luồng handle (R2007+; trước đó mọi thứ nằm trong w)
    function headerData(w, ws, wh){
      const z3 = [0, 0, 0];
      const T = s => { if(R07) ws.TU(s); else w.TV(s); }, H = (c, v) => (R07 ? wh : w).H(c, v);
      if(R13) w.BLL(0);   // REQUIREDVERSIONS
      w.BD(412148564080.0); w.BD(1); w.BD(1); w.BD(1); T('m'); T(''); T(''); T(''); w.BL(0); w.BL(0); if(!R04) H(5, 0);   // (R2000) đầu VX hiện hành
      const bits = [1, 1, 0, 0, 1, 1, 0, hv('$PSLTSCALE', 70, 1), hv('$LIMCHECK', 70, 0), 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0]; if(R04) bits.splice(9, 0, 0);
      for(const b of bits) w.B(b);   // DIMASO … PELLIPSE (R2004+: thêm 1 bit sau LIMCHECK)
      const shorts = [1, 3020, 2, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 8, 6, 6, 6, 6, 6, 6, 3, 70, 0, 64, 4, 0, 50];
      shorts.forEach((s, i) => { if(R04 && i === 8){ w.BL(0); w.BL(0); w.BL(0); } w.BS(s); });   // PROXYGRAPHICS … TEXTQLTY (R2004+: 3 BL trước USERI1)
      w.BD(hv('$LTSCALE', 40, 1)); w.BD(metric ? 2.5 : 0.2); w.BD(metric ? 1 : 0.05); w.BD(metric ? 1 : 0.1); for(let i = 0; i < 10; i++) w.BD(0);   // TEXTSIZE … USERR5
      for(let i = 0; i < 4; i++) w.BD(0); w.BD(0.5); w.BD(metric ? 20 : 1); w.BD(hv('$CELTSCALE', 40, 1));   // CHAMFERA … CELTSCALE
      T('acad'); w.BL(jd[0]); w.BL(jd[1]); w.BL(jd[0]); w.BL(jd[1]); if(R04){ w.BL(0); w.BL(0); w.BL(0); } w.BL(0); w.BL(0); w.BL(0); w.BL(0);
      w.CMC(256); w.H(0, seed);   // HANDSEED luôn ở luồng chính
      H(5, LAYERS.get(up(hvs('$CLAYER', 8, '0'))) || hLayer0); H(5, hStd); H(5, hLtByLayer); if(R07) H(5, 0); H(5, hDimStd); H(5, hMlStd);
      w.BD(0); w.BD3(z3); w.BD3([1e20, 1e20, 1e20]); w.BD3([-1e20, -1e20, -1e20]); w.RD2([0, 0]); w.RD2(metric ? [420, 297] : [12, 9]); w.BD(0);
      w.BD3(z3); w.BD3([1, 0, 0]); w.BD3([0, 1, 0]); H(5, 0); H(5, 0); w.BS(0); H(5, 0); for(let i = 0; i < 6; i++) w.BD3(z3);
      w.BD3([hv('$INSBASE', 10, 0), hv('$INSBASE', 20, 0), hv('$INSBASE', 30, 0)]); w.BD3(ext0); w.BD3(ext1); w.RD2(lim0); w.RD2(lim1); w.BD(0);
      w.BD3(z3); w.BD3([1, 0, 0]); w.BD3([0, 1, 0]); H(5, 0); H(5, 0); w.BS(0); H(5, 0); for(let i = 0; i < 6; i++) w.BD3(z3);
      T(''); T('');
      const dt = DS(140, metric ? 2.5 : 0.18);
      w.BD(DS(40, 1)); w.BD(DS(41, metric ? 2.5 : 0.18)); w.BD(DS(42, metric ? 0.625 : 0.0625)); w.BD(DS(43, metric ? 3.75 : 0.38)); w.BD(DS(44, metric ? 1.25 : 0.18)); w.BD(0); w.BD(0); w.BD(0); w.BD(0);
      if(R07){ w.BD(1); w.BD(45 * D2R); w.BS(0); w.CMC(0); }   // DIMFXL, DIMJOGANG, DIMTFILL, DIMTFILLCLR
      for(const b of [0, 0, metric ? 0 : 1, metric ? 0 : 1, 0, 0]) w.B(b); w.BS(DS(77, metric ? 1 : 0)); w.BS(metric ? 8 : 0); w.BS(0);
      if(R07) w.BS(0);   // DIMARCSYM
      w.BD(dt); w.BD(metric ? 2.5 : 0.09); w.BD(0); w.BD(25.4); w.BD(1); w.BD(0); w.BD(1); w.BD(DS(147, metric ? 0.625 : 0.09)); w.BD(0);
      w.B(0); w.BS(2); w.B(metric ? 1 : 0); w.B(0); w.B(0); w.B(0); w.CMC(0); w.CMC(0); w.CMC(0);
      for(const s of [0, DS(271, metric ? 2 : 4), metric ? 2 : 4, 2, 2, 0, 0, 2, metric ? 44 : 46, 0, 0]) w.BS(s); w.B(0); w.B(0); w.BS(1); w.BS(metric ? 8 : 0); w.BS(0); w.BS(0); w.B(0); w.BS(3);
      if(R07) w.B(0);   // DIMFXLON
      if(R10){ w.B(0); w.BD(0); T(''); w.BD(0); T(''); }   // DIMTXTDIRECTION, DIMALTMZF/S, DIMMZF/S
      H(5, hStd); H(5, 0); H(5, 0); H(5, 0); H(5, 0); if(R07){ H(5, 0); H(5, 0); H(5, 0); } w.BS(0xfffe); w.BS(0xfffe);
      for(const c of [1, 2, 3, 5, 6, 7, 8, 9, 0xA].concat(R04 ? [] : [H_VX])) H(3, c);
      H(5, nodItems.get('ACAD_GROUP') || 0); H(5, nodItems.get('ACAD_MLINESTYLE') || 0); H(3, H_NOD);
      w.BS(1); w.BS(70); T(''); T('');
      H(5, nodItems.get('ACAD_LAYOUT') || 0); H(5, nodItems.get('ACAD_PLOTSETTINGS') || 0); H(5, nodItems.get('ACAD_PLOTSTYLENAME') || 0);
      if(R04){ H(5, nodItems.get('ACAD_MATERIAL') || 0); H(5, nodItems.get('ACAD_COLOR') || 0); } if(R07) H(5, nodItems.get('ACAD_VISUALSTYLE') || 0); if(R13) H(5, 0);
      w.BL(lwIndex(hv('$CELWEIGHT', 370, -1)) | (hv('$LWDISPLAY', 290, 0) ? 0 : 0x200) | 0x800 | 0x2000);
      w.BS(hv('$INSUNITS', 70, metric ? 4 : 1)); w.BS(0); T(guid()); T(guid());
      if(R04){ w.RC(127); w.RC(0); w.RC(1); w.RC(R10 ? 2 : 0); w.RC(2); w.RC(0); w.BS(257); w.BS(257); w.RC(0); w.RC(0); T(''); }   // SORTENTS … PROJECTNAME
      H(5, hPS); H(5, hMS); H(5, hLtByLayer); H(5, hLtByBlock); H(5, hLtCont);
      if(R07){ w.B(0); w.BL(0); w.BL(0); w.BD(0); w.BD(2); w.BD(metric ? 50 : 6); w.BD(2); w.BD(50); w.BD(0); w.RC(1); w.RC(1); w.BD(metric ? 5 : 0.25); w.BD(metric ? 80 : 4);   // CAMERADISPLAY … PSOLHEIGHT
        w.BD(Math.PI / 2); w.BD(Math.PI / 2); w.BD(0); w.BD(0); w.BS(7); w.RC(1);   // LOFT*
        w.BD(hv('$LATITUDE', 40, 37.795)); w.BD(hv('$LONGITUDE', 40, -122.394)); w.BD(hv('$NORTHDIRECTION', 40, 0)); w.BL(hv('$TIMEZONE', 70, -8000) | 0);
        w.RC(1); w.RC(1); w.RC(2); w.RC(0); w.B(1); w.CMC(1); H(5, 0); H(5, 0); H(5, 0); w.RC(0); w.BD(0); }   // đèn, khung DWF/DGN, tỉ lệ thực, màu giao, kiểu hiển thị, bóng
      w.BS(0); w.BS(0); w.BS(0); w.BS(0);
      if(R04){ w.BL(0); w.BL(0); w.B(0); }
    }

    // khối dữ liệu riêng DVDCAD ("DVDCADX1" + RL cỡ + JSON) — mọi trình đọc DWG bỏ qua; DVDCAD mở lại đủ khối 3D, vùng, thứ tự vẽ, ràng buộc, khối động…
    const privBlock = () => { const xr = objsDxf.find(r => r.type === 'XRECORD' && r.g.some(x => x[0] === 1 && x[1] === 'DVDCAD1'));
      const d = xr ? xr.all(300).join('') : ''; if(!Object.keys(PRIV).length && !d) return null;
      const js = JSON.stringify({ v: 1, x: PRIV, d }); const b = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(js) : Uint8Array.from(Buffer.from(js, 'utf8'));
      const u = new Uint8Array(12 + b.length); for(let i = 0; i < 8; i++) u[i] = 'DVDCADX1'.charCodeAt(i); new DataView(u.buffer).setUint32(8, b.length, true); u.set(b, 12); return u; };

    /* ---------- ghép file DWG 2004+ ---------- */
    if(R04) return fileR2004();
    function fileR2004(){
      const cat = parts => { let n = 0; for(const p of parts) n += p.length; const u = new Uint8Array(n); let o = 0; for(const p of parts){ u.set(p, o); o += p.length; } return u; };
      const le = (u, at, v) => new DataView(u.buffer, u.byteOffset).setUint32(at, v >>> 0, true);
      // đuôi luồng chuỗi (R2007+): dữ liệu chuỗi + RS cỡ (bit) + bit "có chuỗi"
      const strTail = (w, ws) => { if(ws.p){ const n = ws.p; w.append(ws); if(n >= 0x8000){ w.RS((n >> 15) & 0xffff); w.RS((n & 0x7fff) | 0x8000); } else w.RS(n); w.B(1); } else w.B(0); };
      // section có mốc: mốc đầu + RL cỡ (+ RL cao, R2010+) + dữ liệu + CRC-16 + mốc cuối (+ byte 0 thêm)
      const wrap = (b0, b1, data, tail) => { const F = new BW(data.length + 64); sentinel(F, b0); const st = F.byte; F.RL(data.length); if(HI32) F.RL(0);
        F.need(data.length * 8); F.u.set(data, F.byte); F.p += data.length * 8; F.crc(st); sentinel(F, b1); for(let i = 0; i < (tail || 0); i++) F.RC(0); return F.bytes(); };
      const T16 = (w, s) => { s = String(s == null ? '' : s); if(R07){ w.RS(s.length + 1); for(let i = 0; i < s.length; i++) w.RS(s.charCodeAt(i)); w.RS(0); } else { const b = tvBytes(s); w.RS(b.length + 1); w.TF(b); w.RC(0); } };
      const U16 = (w, s) => { w.RS(s.length + 1); for(let i = 0; i < s.length; i++) w.RS(s.charCodeAt(i)); w.RS(0); };
      // --- biến hệ thống ---
      const secHeader = (() => { const w = new BW(4096), ws = new BW(256), wh = new BW(512); if(R07) w.RL(0); headerData(w, ws, wh);
        if(R07){ strTail(w, ws); w.setRL(0, w.p); w.append(wh); } w.pad(); return wrap(SENT.VAR_BEGIN, SENT.VAR_END, w.bytes()); })();
      // --- lớp ---
      const cnt = {}; for(const o of out) cnt[o.type] = (cnt[o.type] || 0) + 1;
      const secClasses = (() => { const w = new BW(2048), ws = new BW(1024); if(R07) w.RL(0); const T = s => { if(R07) ws.TU(s); else w.TV(s); };
        w.BS(500 + clsUsed.length - 1); w.RC(0); w.RC(0); w.B(1);
        clsUsed.forEach((dxf, i) => { const [cpp, app, px, ent] = CLASSDEF[dxf]; w.BS(500 + i); w.BS(px); T(app); T(cpp); T(dxf); w.B(0); w.BS(ent ? 0x1f2 : 0x1f3); w.BL(cnt[500 + i] || 0); w.BL(DWGV); w.BL(MAINT); w.BL(0); w.BL(0); });
        if(R07){ strTail(w, ws); w.setRL(0, w.p); } w.pad(); return wrap(SENT.CLASS_BEGIN, SENT.CLASS_END, w.bytes(), 8); })();
      // --- đối tượng (bắt đầu bằng RL 0x0DCA; địa chỉ trong bản đồ handle tính từ đầu section) ---
      const parts = [Uint8Array.of(0xca, 0x0d, 0, 0)], map = []; let off = 4;
      for(const o of out){ const b = enc(o); map.push([o.h, off]); parts.push(b); off += b.length; }
      const secObjects = cat(parts);
      // --- bản đồ handle: trang ≤ 2032 byte, CRC big-endian ---
      const secHandles = (() => { const F = new BW(map.length * 8 + 64); let ps = 0; F.RS(0); let lh = 0, la = 0;
        const close = () => { const n = F.byte - ps; F.u[ps] = n >> 8; F.u[ps + 1] = n & 255; F.crc(ps, true); };
        for(const [h, a] of map){ F.UMC(h - lh); F.MC(a - la); lh = h; la = a; if(F.byte - ps > 2030){ close(); ps = F.byte; F.RS(0); lh = 0; la = 0; } }
        close(); ps = F.byte; F.RC(0); F.RC(2); F.crc(ps, true); return F.bytes(); })();
      // --- ObjFreeSpace (R2007+: các số 64 bit / 128 bit) ---
      const secFree = (() => { const F = new BW(96);
        if(R07){ F.RL(0); F.RL(0); F.RL(out.length); F.RL(0); F.RL(jd[0]); F.RL(jd[1]); F.RC(4); for(const v of [0x32, 0x64, 0x200, 0xffffffff]){ F.RL(v); F.RL(0); F.RL(0); F.RL(0); } }
        else { F.RL(0); F.RL(out.length); F.RL(jd[0]); F.RL(jd[1]); F.RL(0); F.RC(4); for(const v of [0x32, 0x64, 0x200, 0xffffffff]){ F.RL(v); F.RL(0); } }
        return F.bytes(); })();
      const secTemplate = R07 ? Uint8Array.of(1, 0, 0, 0, metric ? 1 : 0, 0) : Uint8Array.of(0, 0, metric ? 1 : 0, 0);
      // --- AuxHeader ---
      const secAux = (() => { const F = new BW(160);
        F.RC(0xff); F.RC(0x77); F.RC(0x01); F.RS(DWGV); F.RS(MAINT); F.RL(1); F.RL(0xffffffff); F.RS(1); F.RS(0); F.RL(0); F.RS(DWGV); F.RS(MAINT); F.RS(DWGV); F.RS(MAINT);
        for(const v of R18 ? [5, 0x893, 5, 0x893, 0, 1] : [4, 0x565, 0, 0, 2, 1]) F.RS(v); for(const v of R18 ? [0, 0, 0, 0, 0] : [0, 0, 0, 256, 393218]) F.RL(v);
        // AC1032: ACadSharp đọc 3 số maint dạng RL (AutoCAD ghi RS) nên lệch 6 byte và lấy byte thứ 2 của mili-giây TDUPDATE làm dấu —
        // xoá bit 15 (lệch ≤ 33 giây, chỉ ở AuxHeader) để bộ đọc đó không ném lỗi DateTime
        F.RL(jd[0]); F.RL(jd[1]); F.RL(jd[0]); F.RL(R18 ? jd[1] & ~0x8000 : jd[1]); F.RL(seed); F.RL(0); F.RS(0); F.RS(1); F.RL(0); F.RL(0); F.RL(0); F.RL(1); F.RL(0); F.RL(0); F.RL(0); F.RL(0);
        if(R18){ F.RS(0); F.RS(0); F.RS(0); } return F.bytes(); })();
      // --- SummaryInfo, AppInfo, RevHistory (không nén) ---
      const secSummary = (() => { const F = new BW(256); for(const s of ['', '', '', '', '', 'DVDCAD', '', '']) T16(F, s);
        F.RL(0); F.RL(0); F.RL(jd[0]); F.RL(jd[1]); F.RL(jd[0]); F.RL(jd[1]); F.RS(0); F.RL(0); F.RL(0); return F.bytes(); })();
      const secAppInfo = (() => { const F = new BW(1024), z16 = () => { for(let i = 0; i < 16; i++) F.RC(0); };
        F.RL(3); U16(F, 'AppInfoDataList'); F.RL(3); z16(); U16(F, '5.21.0'); z16(); U16(F, 'This file was last saved by DVDCAD (open source, GPL-3.0).'); z16();
        U16(F, '<ProductInformation name ="DVDCAD" build_version="5.21.0" registry_version="5.21" install_id_string="DVDCAD" registry_localeID="1033"/>'); return F.bytes(); })();
      const secRev = Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0);
      if(VER === 21) return file2007();
      const up32 = (n, q) => Math.max(q, Math.ceil(n / q) * q);
      // DWG 2007: các section theo thứ tự trang trong file như AutoCAD (Preview cần địa chỉ tuyệt đối của chính nó → hàm)
      function file2007(){
        const prev = pvAt => { const bmp = opt.bmp && opt.bmp.length ? opt.bmp : null; const F = new BW(96 + (bmp ? bmp.length : 0)); sentinel(F, SENT.THUMB_BEGIN);
          if(bmp){ F.RL(1 + 9 + bmp.length); F.RC(1); F.RC(2); F.RL(pvAt + 16 + 4 + 1 + 9); F.RL(bmp.length); F.need(bmp.length * 8); F.u.set(bmp, F.byte); F.p += bmp.length * 8; }
          else { F.RL(1); F.RC(0); } sentinel(F, SENT.THUMB_END); for(let i = 0; i < 32; i++) F.RC(0); return F.bytes(); };   // + 32 byte đệm như AutoCAD (bộ đọc tính cỡ ảnh theo cỡ section)
        return pack2007([['AcDb:SummaryInfo', secSummary], ['AcDb:Preview', prev], ['AcDb:AppInfo', secAppInfo], ['AcDb:RevHistory', secRev], ['AcDb:AcDbObjects', secObjects],
          ['AcDb:ObjFreeSpace', secFree], ['AcDb:Template', secTemplate], ['AcDb:Handles', secHandles], ['AcDb:Classes', secClasses], ['AcDb:AuxHeader', secAux], ['AcDb:Header', secHeader]],
          { dwgv: DWGV, maint: MAINT, tail: privBlock() });
      }
      // --- trang dữ liệu: đầu 32 byte (mã hoá XOR theo địa chỉ) + dữ liệu (nén / nguyên) + lấp dãy MAGIC tới bội 0x20 ---
      const pages = [], fileParts = [], descs = []; let pos = 0x100;
      const addSec = (name, id, data, comp, max) => { const d = { name, id, size: data.length, comp: comp ? 2 : 1, max, pages: [] }; descs.push(d);
        const nP = Math.max(1, Math.ceil(data.length / max));
        for(let k = 0; k < nP; k++){ const o0 = k * max; const chunk = new Uint8Array(max); chunk.set(data.subarray(o0, Math.min(data.length, o0 + max)));
          if(k && chunk.every(x => !x)) continue;   // như AutoCAD: trang toàn 0 không ghi
          const body = comp ? lz77(chunk) : chunk, psz = (32 + body.length + 31) & ~31, n = pages.length + 1, addr = pos;
          const pg = new Uint8Array(psz); pg.set(body, 32); for(let i = 32 + body.length, j = 0; i < psz; i++, j++) pg[i] = MAGIC[j & 255];
          le(pg, 0, 0x4163043b); le(pg, 4, id); le(pg, 8, body.length); le(pg, 12, psz); le(pg, 16, o0); le(pg, 20, 0);
          const dck = pageSum(0, body, 0, body.length); le(pg, 28, dck); le(pg, 24, 0); le(pg, 24, pageSum(dck, pg, 0, 32));
          const mk = (0x4164536B ^ addr) >>> 0; for(let i = 0; i < 32; i += 4){ const v = new DataView(pg.buffer).getUint32(i, true); le(pg, i, v ^ mk); }
          pages.push({ n, addr, size: psz }); fileParts.push(pg); pos += psz; d.pages.push({ n, csz: body.length, off: o0 }); }
        return d; };
      // thứ tự trang như AutoCAD: SummaryInfo, Preview, AppInfo, RevHistory, AcDbObjects…, ObjFreeSpace, Template, Handles, Classes, AuxHeader, Header
      const sumMax = up32(secSummary.length, 0x80), pvData0 = 0x100 + 32 + sumMax + 32;   // vị trí tuyệt đối của dữ liệu ảnh xem trước
      const secPreview = (() => { const bmp = opt.bmp && opt.bmp.length ? opt.bmp : null; const F = new BW(64 + (bmp ? bmp.length : 0)); sentinel(F, SENT.THUMB_BEGIN);
        if(bmp){ F.RL(1 + 9 + bmp.length); F.RC(1); F.RC(2); F.RL(pvData0 + 16 + 4 + 1 + 9); F.RL(bmp.length); F.need(bmp.length * 8); F.u.set(bmp, F.byte); F.p += bmp.length * 8; }
        else { F.RL(1); F.RC(0); } sentinel(F, SENT.THUMB_END); return F.bytes(); })();
      const dSum = addSec('AcDb:SummaryInfo', 9, secSummary, false, sumMax);
      const dPrev = addSec('AcDb:Preview', 10, secPreview, false, up32(secPreview.length, 0x400));
      const dApp = addSec('AcDb:AppInfo', 11, secAppInfo, false, up32(secAppInfo.length, 0x80));
      addSec('AcDb:RevHistory', 8, secRev, true, 0x7400);
      addSec('AcDb:AcDbObjects', 7, secObjects, true, 0x7400);
      addSec('AcDb:ObjFreeSpace', 6, secFree, true, 0x7400);
      addSec('AcDb:Template', 5, secTemplate, true, 0x7400);
      addSec('AcDb:Handles', 4, secHandles, true, 0x7400);
      addSec('AcDb:Classes', 3, secClasses, true, 0x7400);
      addSec('AcDb:AuxHeader', 2, secAux, true, 0x7400);
      addSec('AcDb:Header', 1, secHeader, true, 0x7400);
      // --- trang hệ thống: đầu 20 byte (kiểu, cỡ gốc, cỡ nén, 2, checksum) + dữ liệu nén ---
      const sysPage = (type, data, minSize) => { const body = lz77(data); const psz = Math.max(minSize || 0, (20 + body.length + 31) & ~31); const pg = new Uint8Array(psz);
        le(pg, 0, type); le(pg, 4, data.length); le(pg, 8, body.length); le(pg, 12, 2); le(pg, 16, 0); pg.set(body, 20);
        le(pg, 16, pageSum(pageSum(0, pg, 0, 20), body, 0, body.length)); for(let i = 20 + body.length, j = 0; i < psz; i++, j++) pg[i] = MAGIC[j & 255]; return { pg, need: 20 + body.length }; };
      // bản đồ section: section rỗng (id 0) rồi các section theo id giảm dần
      const secMap = (() => { const all = [{ name: '', id: 0, size: 0, comp: 2, max: 0x7400, pages: [] }].concat(descs.slice().sort((a, b) => b.id - a.id));
        const F = new BW(4096); F.RL(all.length); F.RL(2); F.RL(0x7400); F.RL(0); F.RL(all.length);
        for(const d of all){ F.RL(d.size); F.RL(0); F.RL(d.pages.length); F.RL(d.max); F.RL(1); F.RL(d.comp); F.RL(d.id); F.RL(0);
          const nm = new Uint8Array(64); for(let i = 0; i < d.name.length && i < 63; i++) nm[i] = d.name.charCodeAt(i); F.TF(nm);
          for(const p of d.pages){ F.RL(p.n); F.RL(p.csz); F.RL(p.off); F.RL(0); } }
        return F.bytes(); })();
      const smN = pages.length + 1, smAddr = pos, sm = sysPage(0x4163003b, secMap); pages.push({ n: smN, addr: smAddr, size: sm.pg.length }); fileParts.push(sm.pg); pos += sm.pg.length;
      // bản đồ trang (gồm cả chính nó): cỡ khai báo phải chứa vừa trang nén
      const pmN = pages.length + 1, pmAddr = pos; let pmSize = (20 + (pmN * 8) + 16 + 31) & ~31, pm;
      for(;;){ const F = new BW(pmN * 8 + 8); for(const p of pages){ F.RL(p.n); F.RL(p.size); } F.RL(pmN); F.RL(pmSize); pm = sysPage(0x41630e3b, F.bytes(), pmSize); if(pm.need <= pmSize) break; pmSize += 32; }
      pages.push({ n: pmN, addr: pmAddr, size: pmSize }); fileParts.push(pm.pg); pos += pm.pg.length;
      // --- header mã hoá 0x6C byte (ghi ở 0x80 và bản sao cuối file) ---
      const secondAt = pos;
      const eh = new Uint8Array(0x6c); for(let i = 0; i < 11; i++) eh[i] = 'AcFssFcAJMB'.charCodeAt(i);
      le(eh, 0x0c, 0); le(eh, 0x10, 0x6c); le(eh, 0x14, 4); le(eh, 0x24, 1); le(eh, 0x28, pmN); le(eh, 0x2c, pmAddr + pmSize - 0x100); le(eh, 0x34, secondAt); le(eh, 0x40, pages.length);
      le(eh, 0x44, 0x20); le(eh, 0x48, 0x80); le(eh, 0x4c, 0x40); le(eh, 0x50, pmN); le(eh, 0x54, pmAddr - 0x100); le(eh, 0x5c, smN); le(eh, 0x60, pages.length); le(eh, 0x68, 0);
      le(eh, 0x68, crc32(eh)); for(let i = 0; i < 0x6c; i++) eh[i] ^= MAGIC[i];
      // --- 0x100 byte đầu file ---
      const H0 = new Uint8Array(0x100); const vs = ACV[VER]; for(let i = 0; i < 6; i++) H0[i] = vs.charCodeAt(i);
      H0[0x0b] = MAINT; H0[0x0c] = 3; le(H0, 0x0d, dPrev.pages[0] ? pages[dPrev.pages[0].n - 1].addr + 0x20 : 0); H0[0x11] = DWGV; H0[0x12] = MAINT; H0[0x13] = 30; H0[0x14] = 0;
      le(H0, 0x18, 0); le(H0, 0x1c, 0); le(H0, 0x20, pages[dSum.pages[0].n - 1].addr + 0x20); le(H0, 0x24, 0); le(H0, 0x28, 0x80); le(H0, 0x2c, pages[dApp.pages[0].n - 1].addr + 0x20);
      H0.set(eh, 0x80); H0.set(MAGIC.subarray(236, 256), 0xec);
      const pv = privBlock();
      return cat([H0].concat(fileParts, [eh], pv ? [pv] : []));
    }

    /* ---------- ghép file DWG 2000 ---------- */
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
      clsUsed.forEach((dxf, i) => { const [cpp, app, px, ent] = CLASSDEF[dxf]; w.BS(500 + i); w.BS(px); w.TV(app); w.TV(cpp); w.TV(dxf); w.B(0); w.BS(ent ? 0x1f2 : 0x1f3); });
      w.pad(); F.append(w); F.setRL(sz, F.byte - sz - 4); F.crc(sz); sentinel(F, SENT.CLASS_END); sec[1].size = F.byte - sec[1].addr; }
    // khối dữ liệu riêng DVDCAD nằm giữa các section (mọi trình đọc DWG bỏ qua)
    { const pv = privBlock(); if(pv){ F.need(pv.length * 8); F.u.set(pv, F.byte); F.p += pv.length * 8; } }
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

  /* ---------------- vỏ tệp DWG 2007 (AC1021) ----------------
     0x00: 0x80 byte đầu file (như 2004); 0x80: khối 0x400 byte (header 0x110 byte nén + CRC-64, RS(255,239) ×3 xen kẽ + 0x28 byte kiểm tra);
     0x480: bản đồ trang (2 bản), các trang dữ liệu, bản đồ section (2 bản); cuối file: bản sao khối 0x400 byte.
     secs = [[tên, dữ liệu | (địa chỉ tuyệt đối của trang) => dữ liệu], …] theo thứ tự trang trong file. */
  const SEC21 = { 'AcDb:SummaryInfo': [0x717a060f, 0x80, 1], 'AcDb:Preview': [0x40aa0473, 0x400, 1], 'AcDb:AppInfo': [0x3fa0043e, 0x80, 1], 'AcDb:AppInfoHistory': [0x96de0737, 0x80, 1],
    'AcDb:FileDepList': [0x6c4205ca, 0x80, 1], 'AcDb:RevHistory': [0x60a205b3, 0x1000, 4], 'AcDb:AcDbObjects': [0x674c05a9, 0xf800, 4], 'AcDb:ObjFreeSpace': [0x77e2061f, 0xf800, 4],
    'AcDb:Template': [0x4a1404ce, 0x400, 4], 'AcDb:Handles': [0x3f6e0450, 0xf800, 4], 'AcDb:Classes': [0x3f54045f, 0xf800, 4], 'AcDb:AuxHeader': [0x54f0050a, 0x800, 4], 'AcDb:Header': [0x32b803d9, 0x800, 4] };
  function pack2007(secs, o){
    o = o || {};
    const L64 = (u, at, v) => { const dv = new DataView(u.buffer, u.byteOffset); v = BigInt.asUintN(64, BigInt(v)); dv.setUint32(at, Number(v & 0xffffffffn), true); dv.setUint32(at + 4, Number(v >> 32n), true); };
    const le = (u, at, v) => new DataView(u.buffer, u.byteOffset).setUint32(at, v >>> 0, true);
    const a8 = n => (n + 7) & ~7, a32 = n => (n + 31) & ~31;
    const cat = parts => { let n = 0; for(const p of parts) n += p.length; const u = new Uint8Array(n); let q = 0; for(const p of parts){ u.set(p, q); q += p.length; } return u; };
    const pages = [];   // { id, bytes } theo thứ tự trong file (địa chỉ = 0x480 + tổng cỡ trang trước)
    let nextId = 1; const newId = () => nextId++;
    // trang dữ liệu: nén (nếu có lợi) → RS(255,251) xen kẽ, cỡ trên đĩa bội 32 — hoặc trang nguyên (mã hoá 1: SummaryInfo / Preview / AppInfo, để địa chỉ trỏ thẳng vào dữ liệu)
    const dataPage = (chunk, raw) => { const id = newId(); let comp = raw ? null : r21Comp(chunk); if(!comp) comp = chunk;
      let bytes;
      if(raw){ let sz = a32(chunk.length + 4); const nb0 = Math.ceil(a8(chunk.length) / 251); if(sz === a32(nb0 * 255)) sz += 32; bytes = new Uint8Array(sz); bytes.set(chunk); }
      else { const nb = Math.ceil(a8(comp.length) / 251); const pe = new Uint8Array(nb * 251); pe.set(comp); bytes = new Uint8Array(a32(nb * 255)); RS(0x11D, 251).enc(pe, nb, bytes, 0); }
      pages.push({ id, bytes }); return { id, uncomp: chunk.length, comp: comp.length, sum: sum21(chunk, chunk.length), crc: crcJ(comp, comp.length) }; };
    // trang hệ thống: nén, lặp lại `rep` lần (đệm bội 8), RS(255,239) xen kẽ
    const sysPage = (data, rep) => { const comp = r21Comp(data, true); const step = a8(comp.length), nb = Math.ceil(step * rep / 239);
      const pe = new Uint8Array(nb * 239); for(let r = 0; r < rep; r++) pe.set(comp, r * step);
      const bytes = new Uint8Array(a32(nb * 255)); RS(0x169, 239).enc(pe, nb, bytes, 0); return { comp, bytes }; };
    let pmSize = 0x400;   // 2 bản bản đồ trang đứng đầu; cỡ cố định (tăng dần nếu không vừa)
    for(;;){
      pages.length = 0; nextId = 1; const SECS = [], at = {};
      const pmId1 = newId(), pmId2 = newId(); pages.push({ id: pmId1, bytes: null }, { id: pmId2, bytes: null });
      let pos = 0x480 + 2 * pmSize;
      for(const [name, src] of secs){ const [hash, max0, enc] = SEC21[name] || [0, 0xf800, 4]; at[name] = pos;
        const data = typeof src === 'function' ? src(pos) : src, raw = enc === 1, max = raw ? Math.max(max0, a32(data.length)) : max0;
        const d = { name, hash, size: data.length, max, enc, pages: [] }; SECS.push(d);
        for(let k = 0, nP = Math.max(1, Math.ceil(data.length / max)); k < nP; k++){ const o0 = k * max, r = dataPage(data.subarray(o0, Math.min(data.length, o0 + max)), raw); r.off = o0; d.pages.push(r); pos += pages[pages.length - 1].bytes.length; } }
      // bản đồ section: các section (như AutoCAD: từ cuối lên) + một bản ghi rỗng
      const recs = SECS.slice().reverse().concat([{ name: '', hash: 0, size: 0, max: 0xf800, enc: 4, pages: [] }]);
      let smLen = 0; for(const d of recs) smLen += 64 + (d.name ? (d.name.length + 1) * 2 : 0) + d.pages.length * 56;
      const sm = new Uint8Array(smLen); let q = 0;
      for(const d of recs){ const nl = d.name ? (d.name.length + 1) * 2 : 0;
        for(const v of [d.size, d.max, 0, d.hash, nl, 0, d.enc, d.pages.length]){ L64(sm, q, v); q += 8; }
        for(let i = 0; i < d.name.length; i++){ sm[q] = d.name.charCodeAt(i); q += 2; } if(nl) q += 2;
        for(const pg of d.pages){ for(const v of [pg.off, d.pages.length > 1 ? pg.uncomp : d.max, pg.id, pg.uncomp, pg.comp, pg.sum, pg.crc]){ L64(sm, q, v); q += 8; } } }
      const smRep = o.smRep || 4, smP = sysPage(sm, smRep), smId1 = newId(), smId2 = newId(); pages.push({ id: smId1, bytes: smP.bytes }, { id: smId2, bytes: smP.bytes.slice() });
      // bản đồ trang: (cỡ, id) mỗi trang theo thứ tự trong file
      const pm = new Uint8Array(pages.length * 16); pages.forEach((p, i) => { L64(pm, i * 16, p.bytes ? p.bytes.length : pmSize); L64(pm, i * 16 + 8, p.id); });
      const pmRep = o.pmRep || 3, pmP = sysPage(pm, pmRep);
      if(pmP.bytes.length > pmSize){ pmSize = a32(pmP.bytes.length + 0x100); continue; }
      const pmB = new Uint8Array(pmSize); pmB.set(pmP.bytes); pages[0].bytes = pmB; pages[1].bytes = pmB.slice();
      let body = 0; for(const p of pages) body += p.bytes.length;
      // header 0x110 byte (34 số 64 bit); hạt giống CRC = 0 (dạng mã hoá 0); o.fields: ghi đè trường (chẩn đoán)
      const hd = new Uint8Array(0x110), rnd = () => BigInt(Math.floor(Math.random() * 0x7fffffff)) * 0x100000000n + BigInt(Math.floor(Math.random() * 0xffffffff));
      const F = o.fields || {}, sd = i => F[i] != null ? seedDec(F[i]) : 0, s1 = sd(4), s2 = sd(28);
      [0x70, 0x480 + body + 0x400, crcJ(pmP.comp, pmP.comp.length, s1), pmRep, 0, pmSize, pmId2, 0, pmId1, body, pmP.comp.length, pm.length, pages.length, nextId - 1, 0x20, 0x40, crcJ(pm, pm.length, s1), 0xf800, 4, 1,
        recs.length, crcJ(sm, sm.length, s2), smP.comp.length, smId2, smId1, sm.length, crcJ(smP.comp, smP.comp.length, s2), smRep, 0, 0x60100, 0, 0, rnd(), 0].forEach((v, i) => L64(hd, i * 8, F[i] != null && [4, 28, 31, 32].includes(i) ? F[i] : v));
      L64(hd, 0x108, crc64(hd, 0x110));
      const hc = r21Comp(hd, true), pre = new Uint8Array(3 * 239), dv = new DataView(pre.buffer);
      // đầu khối: cặp "CRC + khoá" (AutoCAD / ODA kiểm cặp này, không phụ thuộc nội dung header) — dùng một cặp hợp lệ của AutoCAD
      L64(pre, 0, 0xc0730c2b38f28956n); L64(pre, 8, 0x11541ab5ef6c671bn);
      L64(pre, 16, crc64(hc, hc.length)); dv.setInt32(24, hc.length, true); pre.set(hc, 32); if(o.pre) pre.set(o.pre.subarray(0, 16), 0);
      const blk = new Uint8Array(0x400); RS(0x169, 239).enc(pre, 3, blk, 0); if(o.check) blk.set(o.check.subarray(0, 0x28), 0x3d8);
      // 0x80 byte đầu file
      const H0 = new Uint8Array(0x80); for(let i = 0; i < 6; i++) H0[i] = 'AC1021'.charCodeAt(i);
      H0[0x0b] = 0x32; H0[0x0c] = 3; le(H0, 0x0d, at['AcDb:Preview'] || 0); H0[0x11] = o.dwgv || 0x1b; H0[0x12] = o.maint || 0; H0[0x13] = 30; H0[0x16] = o.dwgv || 0x1b; H0[0x17] = o.maint || 0;
      le(H0, 0x20, at['AcDb:SummaryInfo'] || 0); le(H0, 0x28, 0x80); le(H0, 0x2c, at['AcDb:AppInfo'] || 0);
      return cat([H0, blk].concat(pages.map(p => p.bytes), [blk], o.tail ? [o.tail] : []));
    }
  }

  /* ---------------- đọc DWG 2007: giải nén LZ kiểu 2007 + sửa trang "không nén" cho libredwg-web ----------------
     AutoCAD (và DVDCAD) ghi trang không nén được vẫn mã Reed–Solomon xen kẽ; bản libredwg-web kèm theo lại chép thẳng
     các trang đó → hỏng dữ liệu. fix2007 giải xen kẽ các trang ấy ngay trong bộ nhớ trước khi đưa cho libredwg-web. */
  function r21Decomp(src, size){ const dst = new Uint8Array(size); let s = 0, d = 0, len = 0, off = 0, op = src[s++]; const end = src.length;
    const litCopy = n => { const ix = new Array(n), id = new Int32Array(n); for(let i = 0; i < n; i++) id[i] = i; litPut(ix, 0, id, 0, n);   // ix[k] = vị trí đích của byte nguồn k
      for(let k = 0; k < n; k++){ const i = ix[k]; if(d + i < size) dst[d + i] = src[s + k]; } d += n; s += n; };
    const instr = () => { switch(op >> 4){
      case 0: len = (op & 0xf) + 0x13; off = src[s++]; op = src[s++]; len += (op >> 3) & 0x10; off = ((op & 0x78) << 5) + 1 + off; break;
      case 1: len = (op & 0xf) + 3; off = src[s++]; op = src[s++]; off = ((op & 0xf8) << 5) + 1 + off; break;
      case 2: off = src[s++]; off |= (src[s++] << 8) & 0xff00; len = op & 7; if(!(op & 8)){ op = src[s++]; len += op & 0xf8; } else { off++; len += src[s++] << 3; op = src[s++]; len += ((op & 0xf8) << 8) + 0x100; } break;
      default: len = op >> 4; off = op & 15; op = src[s++]; off = ((op & 0xf8) << 1) + off + 1; } };
    if((op & 0xf0) === 0x20){ s += 2; len = src[s++] & 7; }
    while(s < end){
      if(!len){ len = op + 8; if(len === 0x17){ let n = src[s++]; len += n; if(n === 0xff){ do { n = src[s++] | (src[s++] << 8); len += n; } while(n === 0xffff); } } }
      litCopy(len); len = 0; if(s >= end) break;
      op = src[s++]; instr();
      for(;;){ for(let t = 0; t < len && d < size; t++, d++) dst[d] = dst[d - off]; len = op & 7; if(len || s >= end) break;
        op = src[s++]; if(!(op >> 4)) break; if((op >> 4) === 0xf) op &= 0xf; instr(); } }
    return dst; }
  function fix2007(buf){ try{
    const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if(u.length < 0x500 || String.fromCharCode(u[0], u[1], u[2], u[3], u[4], u[5]) !== 'AC1021') return buf;
    const deRS = (at, nb, k) => { const o = new Uint8Array(nb * k); for(let i = 0; i < nb; i++) for(let j = 0; j < k; j++) o[i * k + j] = u[at + i + j * nb]; return o; };
    const q64 = (b, at) => { const dv = new DataView(b.buffer, b.byteOffset); return dv.getUint32(at, true) + dv.getUint32(at + 4, true) * 4294967296; };
    const pre = deRS(0x80, 3, 239), cl = new DataView(pre.buffer).getInt32(24, true);
    const hd = cl > 0 ? r21Decomp(pre.subarray(32, 32 + cl), 0x110) : pre.slice(32, 32 + 0x110), H = i => q64(hd, i * 8);
    const sys = (at, comp, unc, rep) => { const nb = Math.ceil(((comp + 7) & ~7) * rep / 239); const p = deRS(at, nb, 239).subarray(0, comp); return comp < unc ? r21Decomp(p, unc) : p.slice(0, unc); };
    const pm = sys(0x480 + H(7), H(10), H(11), H(3)); const pages = new Map(); let at = 0x480;
    for(let i = 0; i + 16 <= pm.length; i += 16){ const sz = q64(pm, i), id = Math.abs(new DataView(pm.buffer).getInt32(i + 8, true)); pages.set(id, { at, sz }); at += sz; }
    const smp = pages.get(H(24)); if(!smp) return buf; const sm = sys(smp.at, H(22), H(25), H(27));
    let b = 0, out = null;
    while(b + 64 <= sm.length){ const f = []; for(let k = 0; k < 8; k++){ f.push(q64(sm, b)); b += 8; } b += f[4];
      for(let i = 0; i < f[7]; i++){ const g = []; for(let k = 0; k < 7; k++){ g.push(q64(sm, b)); b += 8; }
        const pg = pages.get(g[2]), un = g[3], co = g[4]; if(!pg || f[6] !== 4 || co !== un) continue;
        const nb = Math.ceil(((co + 7) & ~7) / 251); if(pg.sz !== ((nb * 255 + 31) & ~31)) continue;
        if(!out) out = u.slice(); const d = deRS(pg.at, nb, 251); out.set(d.subarray(0, un), pg.at); } }
    return out ? out.buffer : buf; }catch(_){ return buf; } }

  const api = { BW, crc16, parseDxf, headerVars, Rec, tvBytes, dwgFromDxf, previewBmp, fix2007, pack2007, r21Comp, r21Decomp, crc64, crcJ, sum21 };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DVDDwg = api;

  /* ---------------- trong DVDCAD: A.dwgNative(ents, { version: 'R2000' | 'R2004' | 'R2007' | 'R2010' | 'R2013' | 'R2018' }) → Uint8Array ---------------- */
  const A = root.DVDAcad;
  if(A && !A._dwgNative){
    A._dwgNative = true;
    A.dwgVersions = ['R2018', 'R2013', 'R2010', 'R2007', 'R2004', 'R2000'];
    A.dwg2007Fix = fix2007;
    A.dwgNative = (ents, opt) => {
      if(!A.dxfR2000) throw new Error('Thiếu bộ ghi DXF.');
      const o = Object.assign({}, opt); if(!VCODE[o.version]) o.version = 'R2000';
      // DXF trung gian cùng phiên bản (R2004+: màu RGB 420, độ trong suốt 440; R2007+: chuỗi Unicode)
      const pv = A.dxfVer, pl = A.lastDxfVer; A.dxfVer = o.version; let dxf;
      try{ dxf = A.dxfR2000(ents || (typeof modelEntities !== 'undefined' ? modelEntities : [])); } finally { A.dxfVer = pv; A.lastDxfVer = pl; }
      if(o.bmp === undefined) o.bmp = previewBmp(document.getElementById('cv'));
      return dwgFromDxf(dxf, o);
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
