// Đóng gói lại tệp DWG 2007 bằng vỏ tệp của DVDCAD (pack2007), giữ nguyên dữ liệu từng section — dùng trong CI để tách lỗi vỏ tệp / nội dung.
// node test/dwg2007-repack.js vao.dwg ra.dwg
const fs = require('fs'), path = require('path');
const D = require(path.join(__dirname, '..', '..', 'dvd-dwg.js'));
const [inp, outp] = process.argv.slice(2);
const u = new Uint8Array(fs.readFileSync(inp));
const deRS = (at, nb, k) => { const o = new Uint8Array(nb * k); for(let i = 0; i < nb; i++) for(let j = 0; j < k; j++) o[i * k + j] = u[at + i + j * nb]; return o; };
const q = (b, at) => Number(new DataView(b.buffer, b.byteOffset).getBigUint64(at, true));
const pre = deRS(0x80, 3, 239), cl = new DataView(pre.buffer).getInt32(24, true);
const hd = cl > 0 ? D.r21Decomp(pre.subarray(32, 32 + cl), 0x110) : pre.slice(32, 32 + 0x110), H = i => q(hd, i * 8), HB = i => new DataView(hd.buffer).getBigUint64(i * 8, true);
const sys = (at, comp, unc, rep) => { const nb = Math.ceil(((comp + 7) & ~7) * rep / 239); const p = deRS(at, nb, 239).subarray(0, comp); return comp < unc ? D.r21Decomp(p, unc) : p.slice(0, unc); };
const pm = sys(0x480 + H(7), H(10), H(11), H(3)); const pages = new Map(); let at = 0x480;
for(let i = 0; i + 16 <= pm.length; i += 16){ const sz = q(pm, i), id = Math.abs(new DataView(pm.buffer).getInt32(i + 8, true)); pages.set(id, { at, sz }); at += sz; }
const sp = pages.get(H(24)), sm = sys(sp.at, H(22), H(25), H(27));
const secs = []; let b = 0;
while(b + 64 <= sm.length){ const g = []; for(let k = 0; k < 8; k++){ g.push(q(sm, b)); b += 8; } const name = Buffer.from(sm.subarray(b, b + g[4])).toString('utf16le').replace(/\0/g, ''); b += g[4];
  const data = new Uint8Array(g[0]); let first = Infinity;
  for(let i = 0; i < g[7]; i++){ const p = []; for(let k = 0; k < 7; k++){ p.push(q(sm, b)); b += 8; } const pg = pages.get(p[2]), un = p[3], co = p[4]; first = Math.min(first, pg.at);
    const nb = Math.ceil(((co + 7) & ~7) / 251), rs = g[6] === 4 && pg.sz === ((nb * 255 + 31) & ~31);
    const raw = rs ? deRS(pg.at, nb, 251).subarray(0, co) : u.subarray(pg.at, pg.at + co); data.set((co < un ? D.r21Decomp(raw, un) : raw).subarray(0, Math.min(un, data.length - p[0])), p[0]); }
  if(name) secs.push({ name, data, first }); }
secs.sort((a, b) => a.first - b.first);
// --bien-the: thêm các bản chép từng phần của tệp gốc (CRC đầu khối + khoá, 0x28 byte kiểm tra, hạt giống, số lần lặp) để biết bộ đọc kiểm phần nào
const list = secs.map(s => [s.name, s.data]), base = { dwgv: u[0x11], maint: u[0x12] };
const V = { '': {} };
if(process.argv.includes('--bien-the')) Object.assign(V, { '-dau': { pre: pre.slice(0, 16) }, '-kt': { check: u.slice(0x458, 0x480) }, '-hg': { fields: { 4: HB(4), 28: HB(28), 31: HB(31), 32: HB(32) } },
  '-lap': { pmRep: H(3), smRep: H(27) }, '-ngaunhien': { pre: Uint8Array.from({ length: 16 }, () => Math.random() * 256 | 0) }, '-tatca': { pre: pre.slice(0, 16), check: u.slice(0x458, 0x480), fields: { 4: HB(4), 28: HB(28), 31: HB(31), 32: HB(32) }, pmRep: H(3), smRep: H(27) } });
for(const [suf, o] of Object.entries(V)){ const fn = outp.replace(/\.dwg$/i, suf + '.dwg'); fs.writeFileSync(fn, D.pack2007(list, Object.assign({}, base, o))); console.log('đóng gói lại ' + path.basename(inp) + ' → ' + path.basename(fn)); }
console.log('  section: ' + secs.map(s => s.name.replace('AcDb:', '') + ' ' + s.data.length).join(', '));
