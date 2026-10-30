/* DVDCAD — chạy trong bản Windows (desktop/, Electron).
   Trên trình duyệt file này không làm gì (không có window.dvdDesktop).
   • Hộp thoại Mở / Lưu của Windows thay cho File System Access API của trình duyệt.
   • OPEN / Ctrl+O mở thẳng hộp thoại chọn file như AutoCAD (chọn nhiều file = nhiều tab).
   • Nhấp đúp file .dwg / .dxf trong Explorer, kéo thả file vào cửa sổ để mở.
   • Danh sách bản vẽ gần đây theo đường dẫn (cả file lớn), dùng ở trang Bắt đầu. */
(function(){
  'use strict';
  const D = window.dvdDesktop; if(!D || window.DVDDesktop) return;
  const say = m => { try{ toast(m); }catch(_){} };
  const tr = s => { try{ return window.DVDI18N ? DVDI18N.t(s) : s; }catch(_){ return s; } };   // hộp thoại Windows theo ngôn ngữ giao diện
  const CAD = /\.(dwg|dxf)$/i;
  const CAD_TYPES = [{ description: 'Bản vẽ (*.dwg; *.dxf)', accept: { 'application/octet-stream': ['.dwg', '.dxf'] } }];
  const dlgOpts = o => ({ ...o, title: o.title ? tr(o.title) : undefined, allFiles: tr('Tất cả file (*.*)'),
    types: (o.types || []).map(t => ({ ...t, description: t.description ? tr(t.description) : t.description })) });
  const abort = () => new DOMException('The user aborted a request.', 'AbortError');

  /* ---------------- File System Access API bằng hộp thoại Windows ---------------- */
  function handle(p, name){
    return {
      kind: 'file', name, path: p,
      async getFile(){ const r = await D.readFile(p); return new File([r.data], r.name, { lastModified: r.mtime || Date.now() }); },
      async createWritable(){
        const parts = [];
        return {
          async write(x){ if(x && typeof x === 'object' && x.type === 'write') x = x.data; parts.push(x); },
          async seek(){}, async truncate(){}, async abort(){ parts.length = 0; },
          async close(){
            const buf = new Uint8Array(await new Blob(parts).arrayBuffer()); await D.writeFile(p, buf);
            if(CAD.test(p)){ try{ DVDAcad.captureThumb(p); }catch(_){}   // ảnh thu nhỏ cho file vừa lưu (trang Bắt đầu)
              // ảnh trong bản vẽ (IMAGE → IMAGEDEF ".\tên"): ghi tệp ảnh cạnh bản vẽ để AutoCAD thấy ảnh
              for(const f of (window.DVDAcad && DVDAcad.lastImgFiles) || []){ try{ const r = await fetch(f.url); await D.writeSide(p, f.name, new Uint8Array(await r.arrayBuffer())); }catch(e){ say('Không ghi được ảnh ' + f.name + ': ' + (e && e.message || e)); } } }
          }
        };
      },
      async queryPermission(){ return 'granted'; },
      async requestPermission(){ return 'granted'; },
      async isSameEntry(o){ return !!o && o.path === p; }
    };
  }
  window.showOpenFilePicker = async function(o){
    o = o || {}; const r = await D.openDialog(dlgOpts({ title: 'Mở', types: o.types, multiple: !!o.multiple }));
    if(!r || !r.length) throw abort(); return r.map(f => handle(f.path, f.name));
  };
  window.showSaveFilePicker = async function(o){
    o = o || {}; const r = await D.saveDialog(dlgOpts({ title: 'Lưu thành', suggestedName: o.suggestedName, types: o.types }));
    if(!r) throw abort(); return handle(r.path, r.name);
  };

  /* ---------------- mở file theo đường dẫn ---------------- */
  let chain = Promise.resolve();
  function openPath(p, name){
    chain = chain.then(async () => {
      try{
        const r = await D.readFile(p);
        window.__dvdCurPath = p;
        await DVDCloud.openLocalFile(new File([r.data], name || r.name));
      }catch(e){ say('Không mở được ' + (name || p) + ': ' + (e && e.message || e)); }
      finally{ window.__dvdCurPath = null; }
    });
    return chain;
  }
  function openList(list){ for(const f of list || []) if(f && CAD.test(f.path || f.name || '')) openPath(f.path, f.name); }
  async function openDialog(){
    try{ const r = await D.openDialog(dlgOpts({ title: 'Chọn file', types: CAD_TYPES, multiple: true })); if(r) openList(r); }
    catch(e){ say('Không mở được file: ' + (e && e.message || e)); }
  }
  // OPEN / Ctrl+O / nút Mở: hộp thoại Windows ngay (như AutoCAD), không qua bảng "Mở bản vẽ" của bản web.
  for(const id of ['openBtn', 'openBtn2']){
    const b = document.getElementById(id);
    if(b) b.addEventListener('click', e => { e.stopImmediatePropagation(); e.preventDefault(); openDialog(); }, true);
  }
  // <input type=file> còn lại (XREF, so sánh bản vẽ…): ghi file .dwg/.dxf vào danh sách gần đây
  document.addEventListener('change', e => { const t = e.target; if(t && t.type === 'file' && t.files && t.files.length) D.droppedPaths(t.files).catch(() => {}); }, true);

  /* ---------------- kéo thả file vào cửa sổ ---------------- */
  const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragover', e => { if(hasFiles(e)){ e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  window.addEventListener('drop', async e => {
    if(!hasFiles(e) || e.defaultPrevented) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => CAD.test(f.name));
    if(!files.length){ say('Chỉ mở được file .dwg hoặc .dxf.'); return; }
    let paths = []; try{ paths = await D.droppedPaths(files); }catch(_){}
    files.forEach((f, i) => { chain = chain.then(async () => { window.__dvdCurPath = paths[i] || null; try{ await DVDCloud.openLocalFile(f); }catch(err){ say('Không mở được ' + f.name); } finally{ window.__dvdCurPath = null; } }); });
  });

  /* ---------------- file mở từ Explorer (nhấp đúp, "Open with") ---------------- */
  D.onOpenFiles(openList);
  // chờ các mô-đun dựng xong giao diện (một số dựng bằng setTimeout 0) rồi mới mở file khởi động
  window.addEventListener('load', () => setTimeout(() => { D.ready().then(openList).catch(() => {}); }, 150));

  window.DVDDesktop = { openPath, openDialog, recentList: D.recentList, recentRemove: D.recentRemove, reveal: D.reveal, info: D.info };
})();
