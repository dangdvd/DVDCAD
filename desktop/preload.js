/* DVDCAD Desktop — cầu nối an toàn giữa giao diện (dvd-desktop.js) và Windows.
   Chỉ mở ra window.dvdDesktop với vài hàm cần thiết; trang web không chạm được Node.js. */
'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// lỗi từ tiến trình chính: bỏ tiền tố "Error invoking remote method 'fs:read': Error:" để thông báo dễ đọc
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a).catch(e => { throw new Error(String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')); });

let openCb = null;
const queued = [];
ipcRenderer.on('desktop:open-files', (_e, list) => { if(openCb) openCb(list); else queued.push(...list); });

contextBridge.exposeInMainWorld('dvdDesktop', {
  isDesktop: true,
  platform: process.platform,
  info: () => call('desktop:info'),
  // gọi 1 lần khi giao diện đã sẵn sàng: trả về các file được mở từ Explorer lúc khởi động
  ready: () => call('desktop:ready'),
  onOpenFiles: cb => { openCb = cb; if(queued.length) cb(queued.splice(0)); },
  openDialog: o => call('dlg:open', o || {}),
  saveDialog: o => call('dlg:save', o || {}),
  readFile: p => call('fs:read', p),
  writeFile: (p, data) => call('fs:write', p, data instanceof ArrayBuffer ? new Uint8Array(data) : data),
  // tệp ảnh cạnh bản vẽ (IMAGE như AutoCAD): đọc theo đường dẫn trong IMAGEDEF, ghi kèm khi lưu
  readSide: (cad, rel) => call('fs:readSide', cad, rel),
  writeSide: (cad, name, data) => call('fs:writeSide', cad, name, data instanceof ArrayBuffer ? new Uint8Array(data) : data),
  droppedPaths: files => call('fs:dropped', Array.from(files || []).map(f => { try{ return webUtils.getPathForFile(f); }catch(_){ return ''; } })),
  recentList: () => call('recent:list'),
  recentRemove: p => call('recent:remove', p),
  dwgConvert: (dxf, ver) => call('dwg:convert', dxf, ver),
  odaInfo: () => call('dwg:oda'),
  // phông hệ thống (theo tên họ phông) để nhúng vào PDF vector khi in
  font: (fam, bold, italic) => call('font:find', fam, !!bold, !!italic),
  odaPick: () => call('dwg:odaPick'),
  // máy in Windows đã cài; in SVG vector thẳng ra máy in theo tên (deviceName), khổ mm, số bản
  printers: () => call('print:list'),
  printSVG: o => call('print:svg', o || {}),
  openExternal: url => call('shell:external', url),
  reveal: p => call('shell:reveal', p)
});
