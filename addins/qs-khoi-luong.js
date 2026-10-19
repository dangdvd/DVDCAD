/* Add-in mẫu DVDCAD — QS khối lượng
   TONGDAI: tổng chiều dài đường / đa tuyến / cung / tròn theo lớp
   TONGDT : tổng diện tích vùng kín (đa tuyến kín, tròn, hatch) theo lớp
   Kết quả: in ra dòng lệnh, chọn B = chèn bảng vào bản vẽ, C = tải file CSV (mở bằng Excel).
   Nạp bằng lệnh APPLOAD. Xem ADDIN-API.md để viết add-in của bạn. */

function tongHop(C, sel, f){
  const by = {}; let tong = 0, n = 0;
  for(const e of sel){ const v = f(e); if(!(v > 0)) continue; const k = e.layer || '0'; if(!by[k]) by[k] = { n: 0, v: 0 }; by[k].n++; by[k].v += v; tong += v; n++; }
  const rows = Object.keys(by).sort().map(k => [k, by[k].n, by[k].v]);
  return { rows, tong, n };
}

async function xuat(C, tieuDe, donVi, kq){
  for(const r of kq.rows) C.log('  ' + r[0] + ': ' + r[1] + ' đối tượng · ' + C.format(r[2]) + ' ' + donVi);
  C.log(tieuDe + ': ' + C.format(kq.tong) + ' ' + donVi + ' (' + kq.n + ' đối tượng)');
  const k = await C.getKeyword('Kết quả', ['Bang', 'Csv', 'Thoat'], 'Thoat');
  if(k === 'Csv'){
    const csv = '﻿Lớp;Số lượng;' + tieuDe + '\n' + kq.rows.map(r => r[0] + ';' + r[1] + ';' + String(+r[2].toFixed(4)).replace('.', ',')).join('\n') + '\nTổng;' + kq.n + ';' + String(+kq.tong.toFixed(4)).replace('.', ',');
    C.download(tieuDe.replace(/\s+/g, '-').toLowerCase() + '.csv', csv, 'text/csv;charset=utf-8'); C.log('Đã tải file CSV.');
  }
  if(k === 'Bang'){
    const p = await C.getPoint('Góc trên trái của bảng'); if(!p) return;
    const h = await C.getDistance('Cao chữ', { default: 2.5 }) || 2.5; const dy = h * 1.8, w = [h * 14, h * 6, h * 10];
    const ents = []; let y = p.y;
    const dong = (cols) => { let x = p.x; cols.forEach((t, i) => { ents.push({ type: 'TEXT', x: x + h * 0.5, y: y - dy * 0.7, h, text: String(t), rot: 0, ha: 'left', va: 'alphabetic' }); x += w[i]; }); y -= dy; };
    dong(['Lớp', 'Số lượng', tieuDe + ' (' + donVi + ')']);
    for(const r of kq.rows) dong([r[0], r[1], C.format(r[2])]);
    dong(['TỔNG', kq.n, C.format(kq.tong)]);
    const W = w.reduce((a, b) => a + b, 0), H = p.y - y;
    ents.push({ type: 'POLYLINE', closed: true, vertices: [{ x: p.x, y: p.y }, { x: p.x + W, y: p.y }, { x: p.x + W, y }, { x: p.x, y }] });
    for(let i = 1; i <= kq.rows.length + 1; i++) ents.push({ type: 'LINE', x1: p.x, y1: p.y - i * dy, x2: p.x + W, y2: p.y - i * dy });
    let x = p.x; for(let i = 0; i < w.length - 1; i++){ x += w[i]; ents.push({ type: 'LINE', x1: x, y1: p.y, x2: x, y2: p.y - H }); }
    C.add(ents, 'Bảng ' + tieuDe);
  }
}

DVDCAD.addCommand('TONGDAI', 'Tổng chiều dài đường / đa tuyến / cung / tròn theo lớp', async C => {
  const sel = await C.getSelection('Chọn các đường cần cộng chiều dài', C.isCurve);
  if(!sel.length) return;
  await xuat(C, 'Tổng chiều dài', 'đv', tongHop(C, sel, C.length));
}, { aliases: ['TD'] });

DVDCAD.addCommand('TONGDT', 'Tổng diện tích vùng kín (đa tuyến kín, tròn, hatch) theo lớp', async C => {
  const sel = await C.getSelection('Chọn các vùng kín cần cộng diện tích', e => C.area(e) > 0);
  if(!sel.length) return;
  await xuat(C, 'Tổng diện tích', 'đv²', tongHop(C, sel, C.area));
});
