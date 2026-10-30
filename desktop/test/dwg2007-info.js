// Chẩn đoán tệp DWG 2007 (AC1021): header, CRC-64, checksum từng trang — dùng trong CI để so tệp DVDCAD ghi với tệp ODA File Converter ghi.
// node test/dwg2007-info.js a.dwg [b.dwg …]
const fs = require('fs'), path = require('path');
const D = require(path.join(__dirname, '..', '..', 'dvd-dwg.js'));
const hex = v => '0x' + BigInt.asUintN(64, BigInt(v)).toString(16);
for(const f of process.argv.slice(2)){
  try{
    const u = new Uint8Array(fs.readFileSync(f)); const ver = String.fromCharCode(...u.subarray(0, 6));
    if(ver !== 'AC1021'){ console.log(path.basename(f) + ': ' + ver + ' (không phải DWG 2007)'); continue; }
    const deRS = (at, nb, k) => { const o = new Uint8Array(nb * k); for(let i = 0; i < nb; i++) for(let j = 0; j < k; j++) o[i * k + j] = u[at + i + j * nb]; return o; };
    const q = (b, at) => new DataView(b.buffer, b.byteOffset).getBigUint64(at, true);
    const pre = deRS(0x80, 3, 239), cl = new DataView(pre.buffer).getInt32(24, true);
    const hc = pre.subarray(32, 32 + Math.abs(cl)), hd = cl > 0 ? D.r21Decomp(hc, 0x110) : pre.slice(32, 32 + 0x110), H = i => q(hd, i * 8);
    const h0 = hd.slice(); h0.fill(0, 0x108, 0x110);
    const L = [path.basename(f) + ': ' + u.length + ' byte, header ' + (cl > 0 ? 'nén ' + cl : 'không nén') + ' byte',
      '  CRC header ' + (D.crc64(h0, 0x110) === H(33) ? 'khớp' : 'KHÔNG khớp') + ', CRC dữ liệu nén ' + (cl > 0 ? (D.crc64(hc, cl) === q(pre, 16) ? 'khớp' : 'KHÔNG khớp') : '—'),
      '  đầu khối: crc ' + hex(q(pre, 0)) + ' khoá ' + hex(q(pre, 8)) + ' len2 ' + new DataView(pre.buffer).getInt32(28, true),
      '  CRC bản đồ trang nén/gốc ' + hex(H(2)) + ' / ' + hex(H(16)) + ', bản đồ section nén/gốc ' + hex(H(26)) + ' / ' + hex(H(21)),
      '  hạt giống: trang ' + hex(H(4)) + ' section ' + hex(H(28)) + ' crc ' + hex(H(30)) + ' crc_mã ' + hex(H(31)) + ' ngẫu nhiên ' + hex(H(32)) + ', lặp ' + H(3) + ' / ' + H(27)];
    const sys = (at, comp, unc, rep) => { const nb = Math.ceil(((comp + 7) & ~7) * rep / 239); const p = deRS(at, nb, 239).subarray(0, comp); return comp < unc ? D.r21Decomp(p, unc) : p.slice(0, unc); };
    const pm = sys(0x480 + Number(H(7)), Number(H(10)), Number(H(11)), Number(H(3))); const pages = new Map(); let at = 0x480;
    for(let i = 0; i + 16 <= pm.length; i += 16){ const sz = Number(q(pm, i)), id = Math.abs(Number(BigInt.asIntN(64, q(pm, i + 8)))); pages.set(id, { at, sz }); at += sz; }
    const sp = pages.get(Number(H(24))), sm = sys(sp.at, Number(H(22)), Number(H(25)), Number(H(27)));
    let b = 0;
    while(b + 64 <= sm.length){ const g = []; for(let k = 0; k < 8; k++){ g.push(Number(q(sm, b))); b += 8; } const name = Buffer.from(sm.subarray(b, b + g[4])).toString('utf16le').replace(/\0/g, ''); b += g[4];
      let ok = 0, crc0 = 0, n = 0; const crcs = [];
      for(let i = 0; i < g[7]; i++){ const p = []; for(let k = 0; k < 7; k++){ p.push(q(sm, b)); b += 8; } const pg = pages.get(Number(p[2])), un = Number(p[3]), co = Number(p[4]); n++;
        const nb = Math.ceil(((co + 7) & ~7) / 251), rs = g[6] === 4 && pg.sz === ((nb * 255 + 31) & ~31);
        const raw = rs ? deRS(pg.at, nb, 251).subarray(0, co) : u.subarray(pg.at, pg.at + co); const data = co < un ? D.r21Decomp(raw, un) : raw;
        if(D.sum21(data, un) === Number(p[5])) ok++; if(!p[6]) crc0++; if(crcs.length < 2) crcs.push(hex(p[6])); }
      if(name || n) L.push('  ' + (name || '(rỗng)') + ': mã ' + g[6] + ', ' + n + ' trang, checksum đúng ' + ok + '/' + n + ', CRC = 0: ' + crc0 + (crcs.length ? ' (' + crcs.join(' ') + ')' : '')); }
    console.log(L.join('\n'));
  }catch(e){ console.log(path.basename(f) + ': lỗi ' + (e && e.message || e)); }
}
