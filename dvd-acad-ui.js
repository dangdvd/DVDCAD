/* DVDCAD — giao diện kiểu AutoCAD trên máy tính (ribbon, thanh truy cập nhanh, thanh trạng thái, tab Model/Layout,
   quản lý lớp, cài đặt trợ giúp vẽ, menu chuột phải). Điện thoại giữ giao diện gọn + bảng "Công cụ CAD". */
(function(){
  'use strict';
  const A = window.DVDAcad; if(!A || A._ui) return; A._ui = true;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = m => { try{ toast(m); }catch(_){} };
  const SET = A.SET;
  const run = name => { if(A.busy()) A.cancel(true); try{ DVDCmd.run(name); }catch(err){ console.error(err); } };
  const click = id => { const b = $(id); if(b) b.click(); };

  /* ---------------- biểu tượng (24×24, nét) ---------------- */
  const I = {
    LINE: '<path d="M4 20L20 4"/><rect x="2" y="18" width="4" height="4"/><rect x="18" y="2" width="4" height="4"/>',
    PLINE: '<path d="M3 18l5-9 5 6 4-9 4 4"/><circle cx="3" cy="18" r="1.4"/><circle cx="21" cy="10" r="1.4"/>',
    CIRCLE: '<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/><circle cx="12" cy="12" r="1"/>',
    ARC: '<path d="M4 18a10 10 0 0 1 16-8"/><circle cx="4" cy="18" r="1.5"/><circle cx="11" cy="9.6" r="1.5"/><circle cx="20" cy="10" r="1.5"/>',
    RECTANG: '<rect x="3" y="6" width="18" height="12"/>',
    POLYGON: '<path d="M12 3l8 5v8l-8 5-8-5V8z"/>',
    ELLIPSE: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/>',
    HATCH: '<rect x="3" y="4" width="18" height="16"/><path d="M3 12l8-8M3 20L19 4M11 20l10-10"/>',
    SPLINE: '<path d="M3 16c3-9 6-9 9 0s6 9 9 0"/>',
    XLINE: '<path d="M2 18L22 6"/><circle cx="12" cy="12" r="1.6"/>',
    POINT: '<circle cx="12" cy="12" r="2"/><path d="M12 5v3M12 16v3M5 12h3M16 12h3"/>',
    REVCLOUD: '<path d="M6 16a3 3 0 0 1 0-6 4 4 0 0 1 7-2 3.5 3.5 0 0 1 6 2.5 3 3 0 0 1-1 5.5z"/>',
    DIVIDE: '<path d="M3 16L21 8"/><circle cx="9" cy="13.3" r="1.3"/><circle cx="15" cy="10.7" r="1.3"/>',
    MOVE: '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    COPY: '<rect x="3" y="8" width="11" height="11"/><rect x="9" y="3" width="11" height="11"/>',
    ROTATE: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M18 2v4h-4"/>',
    MIRROR: '<path d="M12 2v20" stroke-dasharray="2 2"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/>',
    SCALE: '<rect x="3" y="11" width="10" height="10"/><path d="M8 3h13v13" /><path d="M13 11l7-7"/>',
    STRETCH: '<path d="M3 6h10v12H3"/><path d="M13 6l6 0v12h-6" stroke-dasharray="2 2"/><path d="M14 12h7M18 9l3 3-3 3"/>',
    TRIM: '<path d="M4 4l16 16"/><path d="M20 4L12 12" /><path d="M10 14L4 20" stroke-dasharray="2 2"/>',
    EXTEND: '<path d="M20 3v18"/><path d="M3 12h9"/><path d="M12 12h8" stroke-dasharray="2 2"/><path d="M16 9l3 3-3 3"/>',
    FILLET: '<path d="M4 4v8a8 8 0 0 0 8 8h8"/>',
    CHAMFER: '<path d="M4 4v10l6 6h10"/>',
    ARRAY: '<rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/><rect x="17" y="3" width="4" height="5"/><rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="3" y="17" width="5" height="4"/>',
    OFFSET: '<path d="M3 18c4-10 10-12 18-12"/><path d="M3 22c5-9 11-11 18-11" stroke-dasharray="2 2"/>',
    ERASE: '<path d="M4 16l9-9 6 6-7 7H8z"/><path d="M13 20h8"/>',
    EXPLODE: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
    BREAK: '<path d="M3 12h7M14 12h7"/><path d="M10 9v6M14 9v6"/>',
    JOIN: '<path d="M3 16l7-6M14 10l7 6"/><circle cx="12" cy="9.5" r="2"/>',
    LENGTHEN: '<path d="M3 12h18"/><path d="M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    MATCHPROP: '<path d="M14 3l7 7-4 4-7-7z"/><path d="M10 7L4 13a2 2 0 0 0 0 3l4 4a2 2 0 0 0 3 0l6-6"/>',
    TEXT: '<path d="M5 20L12 4l7 16M8 14h8"/>',
    MTEXT: '<path d="M4 15L8 5l4 10M5.5 11h5"/><path d="M14 8h7M14 12h7M4 19h17"/>',
    DIMLINEAR: '<path d="M3 5v10M21 5v10"/><path d="M3 11h18"/><path d="M6 8l-3 3 3 3M18 8l3 3-3 3"/><path d="M9 7h6"/>',
    DIMALIGNED: '<path d="M4 16L16 4"/><path d="M7 19L19 7"/><path d="M8 17l-2 3M17 8l3-2"/>',
    DIMRADIUS: '<circle cx="12" cy="12" r="8"/><path d="M12 12l6-5"/><path d="M16 6.5l2 .5-.5 2"/>',
    DIMDIAMETER: '<circle cx="12" cy="12" r="8"/><path d="M6 18L18 6"/>',
    DIMANGULAR: '<path d="M4 20h16M4 20L16 5"/><path d="M13 20a9 9 0 0 0-2.8-6.5"/>',
    DIMCONTINUE: '<path d="M3 6v10M12 6v10M21 6v10M3 12h18"/>',
    DIMBASELINE: '<path d="M3 4v16M12 8v6M21 8v12"/><path d="M3 11h9M3 17h18"/>',
    DIMSTYLE: '<path d="M3 6v8M21 6v8M3 10h18"/><circle cx="12" cy="18" r="3"/>',
    INSERT: '<rect x="3" y="3" width="10" height="10"/><path d="M13 13l8 8M21 15v6h-6"/>',
    BLOCK: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/><path d="M11 7h6v6"/>',
    GROUP: '<rect x="3" y="3" width="18" height="18" stroke-dasharray="3 2"/><rect x="6" y="6" width="5" height="5"/><circle cx="15.5" cy="15.5" r="2.5"/>',
    UNGROUP: '<rect x="3" y="3" width="8" height="8"/><circle cx="16" cy="16" r="4"/>',
    LAYER: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    DIST: '<path d="M3 16.5L16.5 3 21 7.5 7.5 21z"/><path d="M7 12.5l2 2M10 9.5l2 2M13 6.5l2 2"/>',
    AREA: '<path d="M4 18l3-12 10 2 3 10z"/><path d="M8 14l3-3 3 3" />',
    ID: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/>',
    LIST: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    PASTECLIP: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2h6v2"/><path d="M9 11h6M9 15h6"/>',
    COPYCLIP: '<rect x="8" y="8" width="12" height="13"/><path d="M4 16V3h12"/>',
    CUTCLIP: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L18 3M16 16L6 3"/>',
    COPYBASE: '<rect x="8" y="8" width="12" height="13"/><path d="M4 16V3h12"/><circle cx="8" cy="21" r="1.6"/>',
    ZE: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8" y="8" width="8" height="8"/>',
    ZW: '<rect x="3" y="5" width="18" height="14" stroke-dasharray="3 2"/><circle cx="11" cy="11" r="3"/><path d="M13 13l3 3"/>',
    ZIN: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21M10 7v6M7 10h6"/>',
    ZOUT: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21M7 10h6"/>',
    ZP: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21"/><path d="M8 8l-2 2 2 2M6 10h6"/>',
    PAN: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-3 7-7 7-2.5 0-4-1-5.5-3L3 14a1.5 1.5 0 0 1 2.5-1.6L8 15"/>',
    ROTVIEW: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 2v5h-5"/><rect x="9" y="11" width="8" height="8"/>',
    NEW: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M12 10v7M8.5 13.5h7"/>',
    OPEN: '<path d="M3 6h7l2 2h9v11H3z"/>',
    SAVE: '<path d="M5 3h12l4 4v14H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    SAVEAS: '<path d="M5 3h12l4 4v14H5z"/><path d="M8 3v6h8V3"/><path d="M10 17h8M14 13v8"/>',
    UNDO: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    REDO: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    PLOT: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8"/><path d="M6 14h12v7H6z"/>',
    DRIVE: '<path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18z"/>',
    SHARE: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>',
    COLLAB: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c1-4 4-6 6-6s5 2 6 6M14 15c1-1 2-1.5 3-1.5 2 0 4 1.5 5 5"/>',
    SYNC: '<path d="M20 11a8 8 0 0 0-14-4.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4.5l2-2.5"/><path d="M20 20v-5h-5"/>',
    FIND: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    COMPARE: '<rect x="3" y="6" width="8" height="12" rx="1"/><rect x="13" y="6" width="8" height="12" rx="1"/><path d="M12 3v18"/>',
    SETTINGS: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    GRID: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
    BG: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    LWT: '<path d="M3 6h18" stroke-width="1"/><path d="M3 12h18" stroke-width="2.5"/><path d="M3 18h18" stroke-width="4"/>',
    PROPS: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/>',
    CMDLINE: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 10l3 2-3 2M11 15h6"/>',
    HISTORY: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    BOOKMARK: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    CALIB: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    COUNT: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M15 17.5h5M17.5 15v5"/>',
    HELP: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7M12 17h.01"/>',
    CLEAN: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    NOTE: '<path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>',
    MEASURE: '<path d="M3 12h18"/><path d="M3 8v8M21 8v8"/><path d="M8 11v2M12 10v4M16 11v2"/>',
    LAYOUT: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><rect x="8" y="10" width="8" height="7"/>',
    EXPORT: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
    TOOLS: '<path d="M14 6l4-4 4 4-4 4zM3 21l9-9M8 3l3 3-5 5-3-3z"/>',
    BHAND: '<path d="M4 4l7 16 2-7 7-2z"/>'
  };
  const ico = (k, cls) => '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24">' + (I[k] || I.TOOLS) + '</svg>';
  A.ICONS = I; A.ico = ico;

  /* ---------------- CSS giao diện AutoCAD (tối) ---------------- */
  const CSS = `
  html.acad{--bg:#1f242c;--bg-canvas:#212830;--panel:#2b313b;--panel-2:#353c48;--line:#3f4754;--ink:#e6eaf0;--ink-dim:#aab3c0;--ink-faint:#7c8696;--accent:#3d9ae8}
  html.acad body{background:#1f242c}
  html.acad .topbar,html.acad nav.toolbar,html.acad .ctools,html.acad .infocard,html.acad #selBar,html.acad #panRow,html.acad #gripRow{display:none !important}
  html.acad .readout{display:none}
  html.acad body[data-mode=measure] .readout,html.acad body[data-mode=note] .readout,html.acad body[data-mode=del] .readout{display:flex;top:34px}
  html.acad .stage::after{display:none}
  html.acad .stage canvas#cv{cursor:none}
  html.acad body[data-mode=measure] .stage canvas#cv,html.acad body[data-mode=note] .stage canvas#cv{cursor:crosshair}
  html.acad .zoom{right:10px;top:40px;transform:none;border-radius:6px;background:#3f4754;box-shadow:0 2px 10px rgba(0,0,0,.4)}
  html.acad .zoom button{width:30px;height:30px;font-size:16px;background:#2b313b;color:#cfd6e0}
  html.acad .zoom button:hover{background:#3d4757}
  html.acad #gUndo,html.acad #gRedo{display:none}
  html.acad .subrow,html.acad .confirmrow{background:#2b313b;border-top:1px solid #3f4754;padding-top:6px;padding-bottom:6px}
  html.acad .confirmrow button{padding:8px 14px;font-size:13px;border-radius:7px}
  html.acad .subrow .pill{padding:6px 12px;font-size:12.5px}
  html.acad .overlay{align-items:center}
  html.acad .modal{border-radius:10px;max-width:520px;animation:none;box-shadow:0 18px 60px rgba(0,0,0,.6);padding:16px 18px 16px}
  html.acad .modal.wide{max-width:760px}
  html.acad body .toast{top:auto;bottom:118px}
  html.acad #dvdChip{top:30px !important;left:10px !important}
  html.acad #dvdProps{right:0;top:0;bottom:0;max-height:none;height:100%;width:290px;border-radius:0;border:none;border-left:1px solid #3f4754;background:#2b313b;box-shadow:none}
  html.acad.dvd-props-on .zoom{right:300px}
  html.acad.dvd-props-on #cv,html.acad.dvd-props-on #dvdOvS,html.acad.dvd-props-on #dvdOvC{width:calc(100% - 290px) !important}
  html.acad.dvd-props-on #dvdCmd{transform:translateX(calc(-50% - 145px))}
  html.acad #dvdProps .hd{background:#353c48}
  html.acad #dvdCmd .box{background:rgba(30,36,45,.96);border-radius:4px;border-color:#4a5363}
  html.acad #dvdCmd .hist div{border-radius:2px}
  html.acad .empty{background:#1f242c}
  html.acad.acad-clean #acadTop,html.acad.acad-clean #acadFile{display:none}
  #acadTop,#acadStatus,#acadFile,#acadVP{display:none}
  body[data-mode=acad] .readout{display:none !important}
  html.acad #acadTop{display:block;flex:0 0 auto;background:#2b313b;border-bottom:1px solid #161a20;user-select:none;-webkit-user-select:none;z-index:12;position:relative}
  .ac-appbar{display:flex;align-items:center;height:34px;background:#232830;gap:2px;padding:0 6px}
  .ac-logo{display:flex;align-items:center;gap:6px;padding:0 10px 0 4px;height:30px;border:none;background:#c0392b;color:#fff;font:800 13px system-ui,sans-serif;border-radius:4px;cursor:pointer;letter-spacing:.5px}
  .ac-logo:hover{background:#d24a3c}
  .ac-logo .tri{font-size:9px;opacity:.85}
  .ac-qat{display:flex;gap:1px;margin-left:8px}
  .ac-qat button,.ac-sb button,.ac-rbtn,.ac-rbig{font-family:inherit;color:#dfe5ee;background:none;border:1px solid transparent;cursor:pointer}
  .ac-qat button{width:28px;height:28px;border-radius:4px;display:grid;place-items:center}
  .ac-qat button:hover,.ac-sb button:hover{background:#3a4250;border-color:#4b5566}
  .ac-qat .ic{width:17px;height:17px}
  .ic{stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .ac-title{flex:1;text-align:center;color:#cfd6e0;font:500 12.5px system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 10px}
  .ac-title b{color:#fff;font-weight:600}
  .ac-right{display:flex;gap:4px;align-items:center}
  .ac-right button{height:26px;padding:0 9px;border-radius:4px;background:#353c48;border:1px solid #454e5c;color:#dfe5ee;font:600 12px system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;gap:5px}
  .ac-right button .ic{width:15px;height:15px}
  .ac-right button:hover{background:#414a58}
  .ac-tabs{display:flex;gap:0;padding:0 8px;height:28px;align-items:flex-end;background:#2b313b}
  .ac-tabs button{font:600 12.5px system-ui,sans-serif;color:#b9c2cf;background:none;border:none;padding:6px 14px 6px;cursor:pointer;border-bottom:2px solid transparent}
  .ac-tabs button:hover{color:#fff}
  .ac-tabs button.on{color:#fff;border-bottom-color:#3d9ae8;background:#353c48;border-radius:4px 4px 0 0}
  .ac-ribbon{display:flex;gap:0;height:100px;background:#353c48;border-top:1px solid #3f4754;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
  #acadTop.min .ac-ribbon{display:none}
  .ac-panel{display:flex;flex-direction:column;border-right:1px solid #2a3039;flex:0 0 auto}
  .ac-pbody{flex:1;display:flex;align-items:stretch;gap:2px;padding:4px 5px 2px}
  .ac-ptitle{height:19px;font:500 11px system-ui,sans-serif;color:#aab3c0;text-align:center;background:#2f3541;line-height:19px;padding:0 6px;white-space:nowrap}
  .ac-rbig{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;min-width:50px;padding:4px 5px;border-radius:4px;font-size:11px;line-height:1.15;text-align:center}
  .ac-rbig span{white-space:nowrap}
  .ac-rbig .ic{width:28px;height:28px;stroke-width:1.4}
  .ac-rbig:hover,.ac-rbtn:hover{background:#45505f;border-color:#56627a}
  .ac-col{display:flex;flex-direction:column;gap:1px;justify-content:flex-start}
  .ac-rbtn{display:flex;align-items:center;gap:5px;height:24px;padding:0 6px 0 3px;border-radius:3px;font-size:11.5px;white-space:nowrap;text-align:left}
  .ac-rbtn .ic{width:16px;height:16px;flex:0 0 auto}
  .ac-rbtn.on,.ac-rbig.on{background:#2f6db0;border-color:#4a8fd6}
  .ac-panel.ico-only .ac-rbtn span{display:none}
  .ac-panel.ico-only .ac-rbtn{padding:0 4px}
  .ac-ctl{display:flex;flex-direction:column;gap:4px;padding:2px 2px;min-width:200px}
  .ac-ctl select,.ac-laybtn{height:24px;background:#262b34;color:#e6eaf0;border:1px solid #4a5363;border-radius:3px;font:12px system-ui,sans-serif;padding:0 6px;cursor:pointer;width:100%}
  .ac-laybtn{display:flex;align-items:center;gap:6px;text-align:left}
  .ac-laybtn .sw,.ac-lrow .sw{width:12px;height:12px;border:1px solid rgba(255,255,255,.4);flex:0 0 auto}
  .ac-laybtn .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ac-laybtn .ic{width:14px;height:14px}
  .ac-pop{position:fixed;z-index:70;background:#2b313b;border:1px solid #4a5363;border-radius:4px;box-shadow:0 10px 30px rgba(0,0,0,.55);max-height:60vh;overflow-y:auto;min-width:220px;padding:3px 0;font:12.5px system-ui,sans-serif;color:#e6eaf0}
  .ac-pop .it{display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;white-space:nowrap}
  .ac-pop .it:hover{background:#3d6fa8}
  .ac-pop .it.dis{opacity:.45;pointer-events:none}
  .ac-pop .it .k{margin-left:auto;color:#9aa4b2;font-size:11px;padding-left:18px}
  .ac-pop .it .ic{width:15px;height:15px}
  .ac-pop .sep{height:1px;background:#454e5c;margin:3px 0}
  .ac-pop .hd{padding:5px 12px 3px;color:#8f99a8;font-size:11px;font-weight:700;letter-spacing:.4px}
  .ac-lrow{display:flex;align-items:center;gap:6px;padding:3px 8px;cursor:pointer}
  .ac-lrow:hover{background:#3a4250}
  .ac-lrow.cur{background:#30507a}
  .ac-lrow .t{width:20px;height:20px;display:grid;place-items:center;border-radius:3px;color:#cfd6e0}
  .ac-lrow .t:hover{background:#4b5566}
  .ac-lrow .t .ic{width:14px;height:14px}
  .ac-lrow .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  html.acad #acadFile{display:flex;align-items:flex-end;gap:2px;height:26px;padding:0 6px;background:#1f242c;border-bottom:1px solid #3a414d;flex:0 0 auto}
  #acadFile .ft{display:flex;align-items:center;gap:6px;height:24px;padding:0 10px;background:#2b313b;border:1px solid #3a414d;border-bottom:none;border-radius:4px 4px 0 0;color:#e6eaf0;font:500 12px system-ui,sans-serif;max-width:360px}
  #acadFile .ft.start{background:#262b34;color:#aab3c0;cursor:pointer}
  #acadFile .ft span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #acadFile .ft .x{color:#8f99a8;cursor:pointer;font-size:14px}
  #acadFile .plus{height:22px;width:24px;border:none;background:none;color:#aab3c0;font-size:17px;cursor:pointer}
  #acadFile .plus:hover{color:#fff}
  html.acad #acadVP{display:flex;position:absolute;left:10px;top:6px;z-index:6;gap:2px;font:12px system-ui,sans-serif;color:#b9c2cf}
  #acadVP span{cursor:pointer;padding:1px 3px;border-radius:3px}
  #acadVP span:hover{background:rgba(60,70,85,.8);color:#fff}
  html.acad #acadStatus{display:flex;align-items:center;height:28px;flex:0 0 auto;background:#2b313b;border-top:1px solid #161a20;padding:0 6px;gap:4px;font:12px system-ui,sans-serif;color:#cfd6e0;user-select:none;-webkit-user-select:none}
  .ac-lt{display:flex;align-items:stretch;height:24px;gap:1px;overflow-x:auto;max-width:42%;scrollbar-width:none}
  .ac-lt button{font:500 12px system-ui,sans-serif;color:#b9c2cf;background:#262b34;border:1px solid #3a414d;border-top:none;padding:0 12px;cursor:pointer;border-radius:0 0 4px 4px;white-space:nowrap}
  .ac-lt button.on{background:#3a4250;color:#fff;border-color:#55627a}
  .ac-sb{display:flex;align-items:center;gap:1px;margin-left:auto}
  .ac-coord{font:12px ui-monospace,Consolas,Menlo,monospace;color:#dfe5ee;min-width:210px;text-align:right;padding-right:8px;white-space:nowrap}
  .ac-sb button{height:24px;min-width:26px;padding:0 6px;border-radius:3px;display:flex;align-items:center;gap:4px;font:600 11px system-ui,sans-serif;color:#9aa4b2}
  .ac-sb button .ic{width:16px;height:16px}
  .ac-sb button.on{color:#5fb3ff;background:rgba(61,154,232,.16);border-color:rgba(61,154,232,.4)}
  .ac-sb .model{color:#fff;font-weight:700;padding:0 8px}
  .ac-sep{width:1px;height:16px;background:#454e5c;margin:0 4px}
  #dvdDyn{position:absolute;z-index:9;display:none;pointer-events:none;font:12px system-ui,sans-serif}
  #dvdDyn .pr{background:rgba(245,247,250,.96);color:#1a1f27;padding:3px 7px;border:1px solid #9aa4b2;border-radius:2px;margin-bottom:2px;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #dvdDyn .vals{display:flex;gap:3px}
  #dvdDyn .in{background:#fff;color:#0b4fa0;border:1px solid #3d9ae8;padding:2px 7px;border-radius:2px;font:600 12px ui-monospace,Consolas,monospace;min-width:54px}
  .dvd-dlg .modal{max-height:86vh}
  .dvd-form{display:flex;flex-direction:column;gap:6px}
  .dvd-frow{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-dim)}
  .dvd-frow > span:first-child{flex:0 0 46%}
  .dvd-frow .v{flex:1;display:flex;gap:6px}
  .dvd-frow input,.dvd-frow select,.dvd-dlg input,.dvd-dlg select{background:var(--bg-canvas);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:13px system-ui,sans-serif;outline:none;width:100%}
  .dvd-sub{font-size:11.5px;font-weight:700;color:var(--ink-faint);margin:8px 0 4px;text-transform:uppercase;letter-spacing:.5px}
  .dvd-pats,.dvd-blks{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;margin-bottom:10px;max-height:46vh;overflow-y:auto}
  .dvd-pat,.dvd-blk{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border-radius:7px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:11.5px system-ui,sans-serif;cursor:pointer;text-align:center}
  .dvd-pat.on,.dvd-blk.on{border-color:var(--accent);background:rgba(61,154,232,.18)}
  .dvd-blk span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dvd-blk canvas,.dvd-pat canvas,.dvd-dlg canvas{position:static;inset:auto;width:auto;height:auto;touch-action:auto;display:block}
  .lm-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .lm-bar button{display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:600 12px system-ui,sans-serif;cursor:pointer}
  .lm-bar button .ic{width:15px;height:15px}
  .lm-bar input{flex:1;min-width:120px}
  .lm-tbl{max-height:52vh;overflow:auto;border:1px solid var(--line);border-radius:6px}
  .lm-tbl table{width:100%;border-collapse:collapse;font:12.5px system-ui,sans-serif}
  .lm-tbl th{position:sticky;top:0;background:#353c48;color:#aab3c0;font-weight:600;text-align:left;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
  .lm-tbl td{padding:3px 6px;border-bottom:1px solid rgba(255,255,255,.04);color:var(--ink);white-space:nowrap}
  .lm-tbl tr.cur td{background:rgba(61,154,232,.16)}
  .lm-tbl tr:hover td{background:rgba(255,255,255,.04)}
  .lm-tbl .tg{width:24px;height:22px;display:grid;place-items:center;border-radius:4px;border:none;background:none;color:#cfd6e0;cursor:pointer}
  .lm-tbl .tg:hover{background:#4b5566}
  .lm-tbl .tg .ic{width:15px;height:15px}
  .lm-tbl .off{color:#6c7686}
  .lm-tbl .sw{display:inline-block;width:14px;height:14px;border:1px solid rgba(255,255,255,.45);vertical-align:middle;cursor:pointer}
  .lm-tbl .nm{cursor:pointer;max-width:260px;overflow:hidden;text-overflow:ellipsis}
  .aci-grid{display:grid;grid-template-columns:repeat(24,14px);gap:1px;margin:6px 0}
  .aci-grid button{width:14px;height:14px;border:1px solid rgba(0,0,0,.4);padding:0;cursor:pointer}
  .aci-grid button:hover{outline:2px solid #fff;z-index:1}
  .aci-std{display:flex;gap:3px;margin:6px 0}
  .aci-std button{width:22px;height:22px;border:1px solid rgba(255,255,255,.3);cursor:pointer}
  .ds-tabs{display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap}
  .ds-tabs button{padding:6px 12px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink-dim);font:600 12px system-ui,sans-serif;cursor:pointer}
  .ds-tabs button.on{color:#fff;background:#2f6db0;border-color:#4a8fd6}
  .ds-pane{display:none}.ds-pane.on{display:block}
  .os-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px}
  .os-grid label,.ds-pane label.ck{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);cursor:pointer;padding:3px 0}
  .os-grid input,.ds-pane label.ck input{width:16px;height:16px}
  .os-grid svg{width:18px;height:18px}
  .mb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .mb-grid button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:10px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:600 11px inherit;font-family:inherit;cursor:pointer}
  .mb-grid button .ic{width:24px;height:24px}
  .mb-grid button:active{transform:scale(.96)}
  .mb-sec{font-size:11.5px;font-weight:700;color:var(--ink-faint);margin:10px 0 6px;text-transform:uppercase}
  `;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ---------------- RIBBON ---------------- */
  const big = (cmd, label, opts) => Object.assign({ t: 'big', cmd, label }, opts || {});
  const sm = (cmd, label, opts) => Object.assign({ t: 'sm', cmd, label }, opts || {});
  const col = (...items) => ({ t: 'col', items });
  const ctl = (kind) => ({ t: 'ctl', kind });
  const act = fn => ({ fn });
  const RIB = {
    home: { name: 'Trang chủ', panels: [
      { pri: 0, title: 'Vẽ', items: [big('LINE', 'Line\nĐường'), big('PLINE', 'Polyline\nĐa tuyến'), big('CIRCLE', 'Circle\nTròn', { menu: [['CIRCLE', 'Tâm, bán kính'], ['CIRCLE|2P', '2 điểm'], ['CIRCLE|3P', '3 điểm']] }), big('ARC', 'Arc\nCung', { menu: [['ARC', '3 điểm'], ['ARC|C', 'Tâm, đầu, cuối']] }),
        col(sm('RECTANG', 'Chữ nhật'), sm('POLYGON', 'Đa giác'), sm('ELLIPSE', 'Elip')), col(sm('HATCH', 'Hatch'), sm('SPLINE', 'Spline'), sm('XLINE', 'Đường dựng')), col(sm('POINT', 'Điểm'), sm('REVCLOUD', 'Mây'), sm('DIVIDE', 'Chia đều'))] },
      { pri: 0, title: 'Sửa', items: [col(sm('MOVE', 'Move'), sm('ROTATE', 'Rotate'), sm('TRIM', 'Trim')), col(sm('COPY', 'Copy'), sm('MIRROR', 'Mirror'), sm('FILLET', 'Fillet')), col(sm('STRETCH', 'Stretch'), sm('SCALE', 'Scale'), sm('ARRAY', 'Array')),
        col(sm('ERASE', 'Erase'), sm('EXPLODE', 'Explode'), sm('OFFSET', 'Offset')), col(sm('EXTEND', 'Extend'), sm('BREAK', 'Break'), sm('MODMORE', 'Thêm ▾', { icon: 'TOOLS', menu: [['CHAMFER', 'Chamfer — vát góc'], ['JOIN', 'Join — nối'], ['LENGTHEN', 'Lengthen — đổi dài'], ['BREAKATPOINT', 'Break at point — tách tại điểm'], ['MATCHPROP', 'Match Properties — sao thuộc tính'], ['DIVIDE', 'Divide — chia đều'], ['MEASURE', 'Measure — đặt điểm theo khoảng'], ['DDEDIT', 'Sửa chữ']] }))] },
      { pri: 5, title: 'Chú thích', items: [big('TEXT', 'Text\nChữ', { menu: [['TEXT', 'Chữ 1 dòng'], ['MTEXT', 'Chữ nhiều dòng']] }), big('DIMLINEAR', 'Dimension\nKích thước', { menu: [['DIMLINEAR', 'Ngang / dọc'], ['DIMALIGNED', 'Chéo'], ['DIMANGULAR', 'Góc'], ['DIMRADIUS', 'Bán kính'], ['DIMDIAMETER', 'Đường kính'], ['DIMCONTINUE', 'Nối tiếp'], ['DIMBASELINE', 'Cùng gốc']] }), col(sm('DIMCONTINUE', 'Nối tiếp'), sm('DIMBASELINE', 'Cùng gốc'), sm('DIMSTYLE', 'Kiểu Dim'))] },
      { pri: 6, title: 'Lớp', items: [big('LAYER', 'Layer\nProperties'), { t: 'ctl', kind: 'layer' }] },
      { pri: 8, title: 'Khối', items: [big('INSERT', 'Insert\nChèn'), col(sm('BLOCK', 'Tạo khối'), sm('GROUP', 'Nhóm'), sm('UNGROUP', 'Bỏ nhóm'))] },
      { pri: 7, title: 'Thuộc tính', items: [big('MATCHPROP', 'Match\nProperties'), { t: 'ctl', kind: 'color' }] },
      { pri: 9, title: 'Tiện ích', items: [big('DIST', 'Measure\nĐo', { menu: [['DIST', 'Khoảng cách'], ['AREA', 'Diện tích'], ['ID', 'Toạ độ điểm'], ['LIST', 'Liệt kê đối tượng'], ['DO', 'Đo nhanh (đánh dấu)']] })] },
      { pri: 10, title: 'Clipboard', items: [big('PASTECLIP', 'Paste\nDán'), col(sm('COPYCLIP', 'Copy'), sm('CUTCLIP', 'Cut'), sm('COPYBASE', 'Copy gốc'))] }
    ] },
    insert: { name: 'Chèn', panels: [
      { title: 'Khối', items: [big('INSERT', 'Insert\nChèn khối'), big('BLOCK', 'Create\nTạo khối'), col(sm('BLOCKLIB', 'Thư viện khối', { icon: 'LIST' }), sm('GROUP', 'Nhóm'), sm('UNGROUP', 'Bỏ nhóm'))] },
      { title: 'Tham chiếu', items: [big('COMPARE', 'Compare\nSo sánh'), big('OPEN', 'Open\nMở')] },
      { title: 'Dán', items: [big('PASTECLIP', 'Paste\nDán'), col(sm('PASTEORIG', 'Dán đúng toạ độ', { icon: 'PASTECLIP' }), sm('COPYBASE', 'Copy kèm gốc'))] }
    ] },
    annotate: { name: 'Chú thích', panels: [
      { title: 'Chữ', items: [big('MTEXT', 'Multiline\nText'), col(sm('TEXT', 'Chữ 1 dòng'), sm('DDEDIT', 'Sửa chữ', { icon: 'TEXT' }), sm('FIND', 'Tìm chữ'))] },
      { title: 'Kích thước', items: [big('DIMLINEAR', 'Linear\nNgang/dọc'), col(sm('DIMALIGNED', 'Chéo'), sm('DIMANGULAR', 'Góc'), sm('DIMRADIUS', 'Bán kính')), col(sm('DIMDIAMETER', 'Đường kính'), sm('DIMCONTINUE', 'Nối tiếp'), sm('DIMBASELINE', 'Cùng gốc')), big('DIMSTYLE', 'Dim\nStyle')] },
      { title: 'Hatch', items: [big('HATCH', 'Hatch\nTô vật liệu'), col(sm('HATCHSET', 'Mẫu & tỉ lệ', { icon: 'SETTINGS' }))] },
      { title: 'Đánh dấu (không sửa file)', items: [big('DO', 'Quick\nĐo nhanh', { icon: 'MEASURE' }), big('NOTE', 'Markup\nGhi chú', { icon: 'NOTE' }), big('REVCLOUD', 'Revcloud\nMây')] }
    ] },
    view: { name: 'Hiển thị', panels: [
      { title: 'Điều hướng', items: [big('ZE', 'Extents\nVừa bản vẽ'), big('ZW', 'Window\nKhung'), col(sm('ZIN', 'Phóng to'), sm('ZOUT', 'Thu nhỏ'), sm('ZP', 'Khung trước')), col(sm('ROTVIEW', 'Xoay 90°'), sm('ROTRESET', 'Về hướng gốc', { icon: 'ROTVIEW' }), sm('BOOKMARK', 'Vị trí đã lưu'))] },
      { title: 'Hiển thị', items: [col(sm('TGRID', 'Lưới', { icon: 'GRID', tog: 'grid' }), sm('TLWT', 'Bề rộng nét', { icon: 'LWT' }), sm('TBG', 'Nền trắng/tối', { icon: 'BG' })), big('DISPLAY', 'Display\nTuỳ chọn', { icon: 'SETTINGS' })] },
      { title: 'Bảng', items: [big('PROPERTIES', 'Properties\nThuộc tính', { icon: 'PROPS' }), col(sm('LAYER', 'Lớp'), sm('CMDLINE', 'Dòng lệnh'), sm('HISTORY', 'Lịch sử lệnh'))] },
      { title: 'Layout', items: [big('LAYOUTS', 'Layouts\nKhung in', { icon: 'LAYOUT' }), big('CLEAN', 'Clean\nToàn màn hình')] }
    ] },
    manage: { name: 'Quản lý', panels: [
      { title: 'Trợ giúp vẽ', items: [big('DSETTINGS', 'Drafting\nSettings', { icon: 'SETTINGS' }), col(sm('TOSNAP', 'OSNAP', { icon: 'ID', tog: 'osnap' }), sm('TORTHO', 'ORTHO', { icon: 'LINE', tog: 'ortho' }), sm('TPOLAR', 'POLAR', { icon: 'DIMANGULAR', tog: 'polar' }))] },
      { title: 'Đơn vị & đo', items: [big('CALIB', 'Units\nTỉ lệ & đơn vị'), big('COUNT', 'Count\nĐếm khối')] },
      { title: 'Xuất', items: [big('EXPORT', 'Plot\nIn/Xuất', { icon: 'PLOT' }), col(sm('DXFOUT', 'Xuất DXF', { icon: 'EXPORT' }), sm('SAVEAS', 'Lưu thành DXF'))] },
      { title: 'Trợ giúp', items: [big('HELP', 'Commands\nDanh sách lệnh')] }
    ] },
    online: { name: 'Online · Drive', panels: [
      { title: 'Google Drive', items: [big('DRIVE', 'Drive\nMở/Lưu'), col(sm('DOPEN', 'Mở từ Drive', { icon: 'OPEN' }), sm('DUP', 'Tải bản vẽ lên', { icon: 'EXPORT' }), sm('DSAVE', 'Lưu DXF lên Drive', { icon: 'SAVE' }))] },
      { title: 'Chia sẻ & cộng tác', items: [big('SHARE', 'Share\nChia sẻ link'), big('COLLAB', 'Collaborate\nCùng sửa'), col(sm('SYNC', 'Đồng bộ ngay'), sm('DSET', 'Cài đặt Google', { icon: 'SETTINGS' }))] },
      { title: 'Máy tính', items: [big('SAVE', 'Save\nLưu (Ctrl+S)'), big('SAVEAS', 'Save As\nLưu thành')] }
    ] }
  };
  // hành động ngoài dòng lệnh
  const ACT = {
    'CIRCLE|2P': () => { run('CIRCLE'); setTimeout(() => A.input('2P'), 30); },
    'CIRCLE|3P': () => { run('CIRCLE'); setTimeout(() => A.input('3P'), 30); },
    'ARC|C': () => { run('ARC'); setTimeout(() => A.input('C'), 30); },
    ZE: () => { A.pushView && A.pushView(); fitView(); }, ZW: () => run('ZOOM'), ZP: () => A.prevView && A.prevView(),
    ZIN: () => { A.pushView && A.pushView(); applyZoom(1.5, W() / 2, H() / 2); draw(); }, ZOUT: () => { A.pushView && A.pushView(); applyZoom(1 / 1.5, W() / 2, H() / 2); draw(); },
    ROTVIEW: () => click('rotBtn'), ROTRESET: () => { try{ setRotation(0); }catch(_){} }, BOOKMARK: () => click('bookmarkBtn'),
    TGRID: () => A.toggle('grid'), TLWT: () => { click('displayBtn'); setTimeout(() => { click('togLW'); click('displayClose'); }, 20); }, TBG: () => click('themeBtn'),
    DISPLAY: () => click('displayBtn'), CMDLINE: () => DVDCmd.toggleBar(), HISTORY: () => DVDCmd.toggleHistory(),
    LAYOUTS: () => click('layoutBtn'), CLEAN: () => { document.documentElement.classList.toggle('acad-clean'); setTimeout(() => { try{ resize(); }catch(_){} }, 30); },
    DSETTINGS: () => openDrafting(), TOSNAP: () => A.toggle('osnap'), TORTHO: () => A.toggle('ortho'), TPOLAR: () => A.toggle('polar'),
    CALIB: () => { click('displayBtn'); setTimeout(() => click('openCalib'), 20); }, COUNT: () => { click('displayBtn'); setTimeout(() => click('openCount'), 20); },
    DOPEN: () => window.DVDCloud && DVDCloud.openFromDrive(), DUP: () => window.DVDCloud && DVDCloud.uploadCurrentToDrive(), DSAVE: () => window.DVDCloud && DVDCloud.saveDxfToDrive(),
    COLLAB: () => window.DVDCloud && (DVDCloud.state.collab ? DVDCloud.stopCollab() : DVDCloud.enableCollab()), DSET: () => window.DVDCloud && DVDCloud.openSettings(),
    BLOCKLIB: () => openBlockLib(), LAYER: () => openLayerManager(), NEW: () => A.newDrawing()
  };
  const doCmd = c => { if(ACT[c]) ACT[c](); else run(c.split('|')[0]); };
  A.doCmd = doCmd;

  /* ---------------- dựng khung trên ---------------- */
  const top = document.createElement('div'); top.id = 'acadTop';
  top.innerHTML = '<div class="ac-appbar"><button class="ac-logo" id="acLogo" title="Menu ứng dụng">DVD<span class="tri">▼</span></button>' +
    '<div class="ac-qat">' + [['NEW', 'Bản vẽ mới (Ctrl+N)'], ['OPEN', 'Mở (Ctrl+O)'], ['SAVE', 'Lưu (Ctrl+S)'], ['SAVEAS', 'Lưu thành'], ['PLOT', 'In / xuất (Ctrl+P)'], ['UNDO', 'Hoàn tác (Ctrl+Z)'], ['REDO', 'Làm lại (Ctrl+Y)']].map(([k, t]) => '<button data-q="' + k + '" title="' + t + '">' + ico(k) + '</button>').join('') + '</div>' +
    '<div class="ac-title" id="acTitle">DVDCAD</div>' +
    '<div class="ac-right"><input id="acFind" placeholder="Tìm lệnh…" style="height:24px;width:150px;background:#1b2028;border:1px solid #454e5c;border-radius:4px;color:#e6eaf0;padding:0 8px;font:12px system-ui"><button id="acDrive" title="Google Drive · chia sẻ · cộng tác">' + ico('DRIVE') + '<span>Drive</span></button><button id="acHelp" title="Trợ giúp (F1)">' + ico('HELP') + '</button></div></div>' +
    '<div class="ac-tabs" id="acTabs"></div><div class="ac-ribbon" id="acRibbon"></div>';
  const stageEl = document.querySelector('.stage');
  stageEl.parentNode.insertBefore(top, stageEl);
  const fileBar = document.createElement('div'); fileBar.id = 'acadFile';
  fileBar.innerHTML = '<div class="ft start" id="acStart" title="Trang bắt đầu"><span>Bắt đầu</span></div><div class="ft" id="acFileTab"><span id="acFileName">—</span><span class="x" id="acFileClose" title="Đóng">×</span></div><button class="plus" id="acNewTab" title="Bản vẽ mới">+</button>';
  stageEl.parentNode.insertBefore(fileBar, stageEl);
  const vp = document.createElement('div'); vp.id = 'acadVP';
  vp.innerHTML = '<span data-v="m">[−]</span><span data-v="t">[Trên]</span><span data-v="s">[Khung dây 2D]</span>';
  stageEl.appendChild(vp);
  vp.addEventListener('click', e => { const s = e.target.closest('span'); if(!s) return; const r = s.getBoundingClientRect();
    if(s.dataset.v === 's') menu(r.left, r.bottom + 2, [{ t: 'Nền tối / trắng', fn: () => click('themeBtn') }, { t: 'Hiện bề rộng nét', fn: ACT.TLWT }, { t: 'Lưới', fn: ACT.TGRID }]);
    else if(s.dataset.v === 't') menu(r.left, r.bottom + 2, [{ t: 'Hướng gốc (Bắc lên trên)', fn: ACT.ROTRESET }, { t: 'Xoay 90°', fn: ACT.ROTVIEW }]);
    else menu(r.left, r.bottom + 2, [{ t: 'Phóng vừa bản vẽ', fn: ACT.ZE }, { t: 'Toàn màn hình (Ctrl+0)', fn: ACT.CLEAN }, { t: 'Thanh dòng lệnh (Ctrl+9)', fn: ACT.CMDLINE }]); });
  // tab
  let curTab = 'home'; try{ curTab = localStorage.getItem('dvd:rtab') || 'home'; }catch(_){} if(!RIB[curTab]) curTab = 'home';
  const tabsEl = $('acTabs'), ribEl = $('acRibbon');
  function renderTabs(){ tabsEl.innerHTML = Object.entries(RIB).map(([k, v]) => '<button data-t="' + k + '" class="' + (k === curTab ? 'on' : '') + '">' + esc(v.name) + '</button>').join(''); }
  tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if(!b) return; if(b.dataset.t === curTab && !top.classList.contains('min')){ /* bấm lại: giữ */ } curTab = b.dataset.t; top.classList.remove('min'); try{ localStorage.setItem('dvd:rtab', curTab); }catch(_){} renderTabs(); renderRibbon(); });
  tabsEl.addEventListener('dblclick', () => { top.classList.toggle('min'); setTimeout(() => { try{ resize(); }catch(_){} }, 20); });
  function btnHTML(it){
    const icon = it.icon || it.cmd.split('|')[0];
    const tip = (it.label || '').replace('\n', ' — ') + ' (' + it.cmd.split('|')[0] + ')';
    const tg = it.tog ? ' data-tog="' + it.tog + '"' : '';
    if(it.t === 'big') return '<button class="ac-rbig' + (it.tog && SET[it.tog] ? ' on' : '') + '" data-c="' + it.cmd + '"' + (it.menu ? ' data-menu="1"' : '') + tg + ' title="' + esc(tip) + '">' + ico(icon) + '<span>' + esc(it.label).replace('\n', '<br>') + (it.menu ? ' ▾' : '') + '</span></button>';
    return '<button class="ac-rbtn' + (it.tog && SET[it.tog] ? ' on' : '') + '" data-c="' + it.cmd + '"' + tg + ' title="' + esc(tip) + '">' + ico(icon) + '<span>' + esc(it.label) + '</span></button>';
  }
  function renderRibbon(){
    const T = RIB[curTab]; let h = '';
    for(const p of T.panels){
      h += '<div class="ac-panel"><div class="ac-pbody">';
      for(const it of p.items){
        if(it.t === 'col') h += '<div class="ac-col">' + it.items.map(btnHTML).join('') + '</div>';
        else if(it.t === 'ctl') h += ctlHTML(it.kind);
        else h += btnHTML(it);
      }
      h += '</div><div class="ac-ptitle">' + esc(p.title) + '</div></div>';
    }
    ribEl.innerHTML = h; syncCtl(); fitRibbon();
  }
  // màn hình hẹp: thu gọn bảng từ phải sang trái thành 1 nút (như AutoCAD)
  function fitRibbon(){
    const panels = [...ribEl.querySelectorAll('.ac-panel')]; panels.forEach((p, i) => p.dataset.pi = i);
    const over = () => ribEl.scrollWidth > ribEl.clientWidth + 2;
    const PP = RIB[curTab].panels;
    const collapse = i => { const P = PP[i]; const first = P.items.find(x => x.cmd) || (P.items[0] && P.items[0].items && P.items[0].items[0]) || {};
      panels[i].querySelector('.ac-pbody').innerHTML = '<button class="ac-rbig" data-panel="' + i + '" title="' + esc(P.title) + '">' + ico(first.icon || (first.cmd || 'TOOLS').split('|')[0]) + '<span>' + esc(P.title) + ' ▾</span></button>'; };
    const pri = i => PP[i].pri == null ? 3 : PP[i].pri;
    const order = PP.map((_, i) => i).sort((a, b) => pri(b) - pri(a) || b - a);
    const done = new Set();
    for(const i of order){ if(!over()) return; if(pri(i) < 7) break; collapse(i); done.add(i); }
    for(const i of PP.map((_, i) => i)){ if(!over()) return; if(pri(i) === 0) panels[i].classList.add('ico-only'); }
    for(const i of order){ if(!over()) return; if(done.has(i) || pri(i) === 0) continue; collapse(i); done.add(i); }
    for(let i = PP.length - 1; i >= 1 && over(); i--){ if(!done.has(i)){ collapse(i); done.add(i); } }
  }
  function panelMenu(i, el){
    const P = RIB[curTab].panels[i]; const items = [];
    const add = it => { if(it.t === 'col') return it.items.forEach(add); if(it.t === 'ctl'){ if(it.kind === 'layer') ['LAYER', 'LAYMCUR', 'LAYISO', 'LAYUNISO', 'LAYON', 'LAYTHW'].forEach(c => items.push({ t: c === 'LAYER' ? 'Quản lý lớp' : (DVDCmd.commands.find(x => x.k[0] === c) || { d: c }).d, ic: 'LAYER', fn: () => doCmd(c) })); else items.push({ t: 'Bảng thuộc tính', ic: 'PROPS', fn: () => doCmd('PROPERTIES') }); return; }
      if(it.menu){ it.menu.forEach(([c, t]) => items.push({ t, ic: c.split('|')[0], fn: () => doCmd(c) })); return; }
      items.push({ t: String(it.label || it.cmd).replace('\n', ' — '), ic: it.icon || it.cmd.split('|')[0], fn: () => doCmd(it.cmd) }); };
    P.items.forEach(add); const r = el.getBoundingClientRect(); menu(r.left, r.bottom + 2, items);
  }
  let _rbT = 0; window.addEventListener('resize', () => { clearTimeout(_rbT); _rbT = setTimeout(() => { if(document.documentElement.classList.contains('acad')) renderRibbon(); }, 150); });
  ribEl.addEventListener('click', e => {
    const pc0 = e.target.closest('[data-panel]'); if(pc0){ panelMenu(+pc0.dataset.panel, pc0); return; }
    const b = e.target.closest('[data-c]'); if(!b) return;
    const it = findItem(b.dataset.c);
    const pc = e.target.closest('[data-panel]'); if(pc){ panelMenu(+pc.dataset.panel, pc); return; }
    if(it && it.menu){ const r = b.getBoundingClientRect(); const rect = { left: r.left, bottom: r.bottom };
      const lower = it.t === 'sm' || (e.clientY - r.top) > r.height * 0.62;
      if(lower){ menu(rect.left, rect.bottom + 2, it.menu.map(([c, t]) => ({ t, fn: () => doCmd(c), ic: c.split('|')[0] }))); return; } }
    doCmd(b.dataset.c);
  });
  function findItem(cmd){ for(const T of Object.values(RIB)) for(const p of T.panels) for(const it of p.items){ if(it.t === 'col'){ for(const x of it.items) if(x.cmd === cmd) return x; } else if(it.cmd === cmd) return it; } return null; }
  function ctlHTML(kind){
    if(kind === 'layer') return '<div class="ac-ctl"><button class="ac-laybtn" id="acLayBtn" title="Lớp hiện hành — bấm để chọn / bật tắt"><span class="sw"></span><span class="nm">0</span>▾</button><div style="display:flex;gap:2px">' + [['LAYMCUR', 'Lấy lớp của đối tượng làm hiện hành', 'BHAND'], ['LAYISO', 'Cô lập lớp', 'ZW'], ['LAYUNISO', 'Bỏ cô lập', 'ZE'], ['LAYOFF', 'Tắt lớp (bấm đối tượng)', 'BG'], ['LAYFRZ', 'Đóng băng lớp', 'SETTINGS'], ['LAYLCK', 'Khoá lớp', 'BLOCK'], ['LAYON', 'Bật tất cả lớp', 'LAYER'], ['LAYTHW', 'Rã băng tất cả', 'SYNC']].map(([c, t, i]) => '<button class="ac-rbtn" data-c="' + c + '" title="' + t + '" style="padding:0 4px">' + ico(i) + '</button>').join('') + '</div></div>';
    if(kind === 'color') return '<div class="ac-ctl" style="min-width:170px"><select id="acColSel" title="Màu cho đối tượng mới / đang chọn"></select><button class="ac-rbtn" data-c="PROPERTIES" title="Bảng thuộc tính (Ctrl+1)">' + ico('PROPS') + '<span>Bảng thuộc tính</span></button></div>';
    return '';
  }
  function syncCtl(){
    const lb = $('acLayBtn'); if(lb){ const n = A.LS.cur || '0'; lb.querySelector('.nm').textContent = n; lb.querySelector('.sw').style.background = A.layerHex(n); lb.onclick = () => { const r = lb.getBoundingClientRect(); layerDrop(r.left, r.bottom + 2); }; }
    const cs = $('acColSel'); if(cs){ const sel = A.LS.color; const COLS = [['BYLAYER', '■ ByLayer'], ['#ff0000', '■ Đỏ'], ['#ffff00', '■ Vàng'], ['#00ff00', '■ Xanh lá'], ['#00ffff', '■ Lục lam'], ['#0000ff', '■ Xanh dương'], ['#ff00ff', '■ Tím'], ['#ffffff', '■ Trắng'], ['#808080', '■ Xám'], ['#ff7f00', '■ Cam']];
      let h = COLS.map(([v, t]) => '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + t + '</option>').join(''); if(!COLS.some(c => c[0] === sel)) h += '<option value="' + esc(sel) + '" selected>■ ' + esc(sel) + '</option>'; h += '<option value="PICK">Chọn màu…</option>'; cs.innerHTML = h;
      cs.onchange = () => { const v = cs.value; const apply = c => { if(selEnts.size){ const rep = [...selEnts].map(e => { const w = _deepEnt(e); delete w.userAdded; if(c === 'BYLAYER'){ w.bl = 1; w.col = A.layerHex(w.layer || '0'); } else { delete w.bl; w.col = c; } return [e, w]; }); A.commit({ rep }); selEnts.clear(); for(const [, w] of rep) selEnts.add(w); refreshPanSel(); } else A.setCurColor(c); syncCtl(); };
        if(v === 'PICK') aciPicker(cs.getBoundingClientRect(), c => apply(c)); else apply(v); }; }
    document.querySelectorAll('[data-tog]').forEach(b => b.classList.toggle('on', !!SET[b.dataset.tog]));
  }
  A.onLayers = () => { syncCtl(); if(lmRoot) renderLM(); };
  A.onSelChange = () => {
    // chọn đối tượng -> hiện lớp của chúng trên ribbon (như AutoCAD)
    const lb = $('acLayBtn'); if(!lb) return;
    if(selEnts.size){ const ly = new Set([...selEnts].slice(0, 2000).map(e => e.layer || '0')); const n = ly.size === 1 ? [...ly][0] : '*nhiều lớp*'; lb.querySelector('.nm').textContent = n; lb.querySelector('.sw').style.background = ly.size === 1 ? A.layerHex(n) : 'transparent'; }
    else syncCtl();
  };
  // QAT + nút phải
  top.querySelector('.ac-qat').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if(!b) return; const q = b.dataset.q;
    if(q === 'NEW') A.newDrawing(); else if(q === 'OPEN') click('openBtn'); else if(q === 'SAVE') run('QSAVE'); else if(q === 'SAVEAS') run('SAVEAS'); else if(q === 'PLOT') click('exportBtn'); else if(q === 'UNDO'){ if(A.busy()) A.input('U'); else undoEdit(); } else if(q === 'REDO') redoEdit(); });
  $('acDrive').onclick = () => { if(window.DVDCloud) DVDCloud.openSheet(); else say('Chưa nạp module Drive.'); };
  $('acHelp').onclick = () => DVDCmd.showHelp();
  const findIn = $('acFind');
  findIn.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); const q = findIn.value.trim(); findIn.value = ''; if(q){ const c = DVDCmd.commands.find(c => c.k.includes(q.toUpperCase())) || DVDCmd.commands.find(c => c.d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))); if(c){ if(A.busy()) A.cancel(true); DVDCmd.run(c.k[0]); } else say('Không tìm thấy lệnh "' + q + '"'); } findIn.blur(); } if(e.key === 'Escape') findIn.blur(); });
  // menu ứng dụng
  $('acLogo').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); menu(r.left, r.bottom + 2, [
    { t: 'Bản vẽ mới', k: 'Ctrl+N', ic: 'NEW', fn: () => A.newDrawing() }, { t: 'Mở…', k: 'Ctrl+O', ic: 'OPEN', fn: () => click('openBtn') }, { t: 'Mở từ Google Drive…', ic: 'DRIVE', fn: ACT.DOPEN },
    { sep: 1 }, { t: 'Lưu', k: 'Ctrl+S', ic: 'SAVE', fn: () => run('QSAVE') }, { t: 'Lưu thành DXF…', k: 'Ctrl+Shift+S', ic: 'SAVEAS', fn: () => run('SAVEAS') }, { t: 'Lưu DXF lên Drive', ic: 'DRIVE', fn: ACT.DSAVE },
    { sep: 1 }, { t: 'In / xuất PDF, PNG…', k: 'Ctrl+P', ic: 'PLOT', fn: () => click('exportBtn') }, { t: 'Chia sẻ link…', ic: 'SHARE', fn: () => run('SHARE') },
    { sep: 1 }, { t: 'Bản vẽ mẫu', ic: 'LAYOUT', fn: () => click('sampleBtn') }, { t: 'Danh sách lệnh', k: 'F1', ic: 'HELP', fn: () => DVDCmd.showHelp() }
  ]); };

  /* ---------------- menu bật lên ---------------- */
  let popEl = null;
  function closePop(){ if(popEl){ popEl.remove(); popEl = null; } }
  function menu(x, y, items){
    closePop(); popEl = document.createElement('div'); popEl.className = 'ac-pop';
    popEl.innerHTML = items.map((it, i) => it.sep ? '<div class="sep"></div>' : it.hd ? '<div class="hd">' + esc(it.hd) + '</div>' : '<div class="it' + (it.dis ? ' dis' : '') + '" data-i="' + i + '">' + (it.ic ? ico(it.ic) : '<span style="width:15px"></span>') + '<span>' + esc(it.t) + '</span>' + (it.k ? '<span class="k">' + esc(it.k) + '</span>' : '') + '</div>').join('');
    document.body.appendChild(popEl);
    const r = popEl.getBoundingClientRect(); popEl.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 6)) + 'px'; popEl.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 6)) + 'px';
    popEl.addEventListener('pointerdown', e => e.stopPropagation());
    popEl.addEventListener('click', e => { const d = e.target.closest('[data-i]'); if(!d) return; const it = items[+d.dataset.i]; closePop(); if(it && it.fn) setTimeout(it.fn, 0); });
    return popEl;
  }
  A.menu = menu;
  document.addEventListener('pointerdown', e => { if(popEl && !popEl.contains(e.target)) closePop(); }, true);
  window.addEventListener('keydown', e => { if(e.key === 'Escape' && popEl){ closePop(); e.stopPropagation(); } }, true);
  window.addEventListener('blur', closePop);

  /* ---------------- danh sách lớp thả xuống ---------------- */
  const BULB = (on) => on ? '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" fill="#ffd24a" stroke="#ffd24a"/>' : '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>';
  const SUN = (fz) => fz ? '<path d="M12 2v20M4 6l16 12M20 6L4 18" stroke="#8fd3ff"/>' : '<circle cx="12" cy="12" r="4" stroke="#ffcf5a"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="#ffcf5a"/>';
  const LOCK = (lk) => lk ? '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' : '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>';
  const svg = inner => '<svg class="ic" viewBox="0 0 24 24">' + inner + '</svg>';
  function layerDrop(x, y){
    A.lsSync(); closePop(); popEl = document.createElement('div'); popEl.className = 'ac-pop'; popEl.style.minWidth = '300px';
    const cnt = {}; for(const e of modelEntities) cnt[e.layer || '0'] = (cnt[e.layer || '0'] || 0) + 1;
    const render = () => { popEl.innerHTML = '<div class="hd">Bấm tên = đặt lớp hiện hành' + (selEnts.size ? ' / chuyển ' + selEnts.size + ' đối tượng đang chọn' : '') + '</div>' + A.layerNames().map(n => '<div class="ac-lrow' + (n === A.LS.cur ? ' cur' : '') + '" data-n="' + esc(n) + '"><span class="t" data-f="off" title="Bật/tắt">' + svg(BULB(!A.LS.off.has(n))) + '</span><span class="t" data-f="frozen" title="Đóng băng">' + svg(SUN(A.LS.frozen.has(n))) + '</span><span class="t" data-f="locked" title="Khoá">' + svg(LOCK(A.LS.locked.has(n))) + '</span><span class="sw" style="background:' + esc(A.layerHex(n)) + '"></span><span class="nm">' + esc(n) + '</span><span style="color:#8f99a8;font-size:11px">' + (cnt[n] || 0) + '</span></div>').join(''); };
    render(); document.body.appendChild(popEl);
    const r = popEl.getBoundingClientRect(); popEl.style.left = Math.min(x, innerWidth - r.width - 6) + 'px'; popEl.style.top = y + 'px';
    popEl.addEventListener('pointerdown', e => e.stopPropagation());
    popEl.addEventListener('click', e => { const row = e.target.closest('.ac-lrow'); if(!row) return; const n = row.dataset.n; const t = e.target.closest('[data-f]');
      if(t){ const f = t.dataset.f; const set = f === 'off' ? A.LS.off : f === 'frozen' ? A.LS.frozen : A.LS.locked; A.setLayerFlag(n, f, !set.has(n)); render(); return; }
      if(selEnts.size){ const rep = [...selEnts].filter(x => !A.isLocked(x)).map(en => { const w = _deepEnt(en); delete w.userAdded; const wasBL = w.bl; w.layer = n; if(wasBL) w.col = A.layerHex(n); return [en, w]; }); A.commit({ rep }, 'Đã chuyển ' + rep.length + ' đối tượng sang lớp ' + n); selEnts.clear(); for(const [, w] of rep) selEnts.add(w); refreshPanSel(); }
      else A.setCurLayer(n);
      closePop(); syncCtl(); });
  }

  /* ---------------- bảng màu ACI ---------------- */
  function aciPicker(rect, cb){
    closePop(); popEl = document.createElement('div'); popEl.className = 'ac-pop'; popEl.style.padding = '8px';
    const hex = i => '#' + ((ACI_RGB[i] >>> 0) & 0xffffff).toString(16).padStart(6, '0');
    let h = '<div class="hd" style="padding:0 0 4px">Màu chỉ số (ACI)</div><div class="aci-grid">';
    for(let row = 0; row < 10; row++) for(let c = 0; c < 24; c++){ const i = 10 + c * 10 + row; if(i > 249) continue; h += '<button data-c="' + hex(i) + '" title="' + i + '" style="background:' + hex(i) + '"></button>'; }
    h += '</div><div class="aci-std">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => '<button data-c="' + hex(i) + '" title="' + i + '" style="background:' + hex(i) + '"></button>').join('') + [250, 251, 252, 253, 254, 255].map(i => '<button data-c="' + hex(i) + '" title="' + i + '" style="background:' + hex(i) + '"></button>').join('') + '</div><div class="it" data-c="BYLAYER"><span>ByLayer (theo lớp)</span></div><div class="it" data-c="CUSTOM"><span>Màu tuỳ ý…</span></div>';
    popEl.innerHTML = h; document.body.appendChild(popEl);
    const r = popEl.getBoundingClientRect(); popEl.style.left = Math.min(rect.left, innerWidth - r.width - 6) + 'px'; popEl.style.top = Math.min(rect.bottom + 2, innerHeight - r.height - 6) + 'px';
    popEl.addEventListener('pointerdown', e => e.stopPropagation());
    popEl.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if(!b) return; const c = b.dataset.c; closePop();
      if(c === 'CUSTOM'){ const i = document.createElement('input'); i.type = 'color'; i.style.cssText = 'position:fixed;left:-50px;opacity:0'; document.body.appendChild(i); i.onchange = () => { cb(i.value); i.remove(); }; i.click(); return; }
      cb(c); });
  }
  A.aciPicker = aciPicker;

  /* ---------------- quản lý lớp (Layer Properties Manager) ---------------- */
  let lmRoot = null, lmFilter = '';
  function openLayerManager(){
    if(!A.hasDoc()){ say('Mở bản vẽ trước.'); return; }
    A.lsSync();
    const d = A.dialog({ title: 'Quản lý lớp (Layer Properties)', wide: true, okText: 'Đóng', noCancel: true, html:
      '<div class="lm-bar"><button data-a="new">' + ico('LAYER') + 'Lớp mới</button><button data-a="cur">✓ Đặt hiện hành</button><button data-a="del">✕ Xoá</button><button data-a="allon">Bật tất cả</button><button data-a="thaw">Rã băng tất cả</button><button data-a="unlock">Mở khoá tất cả</button><input placeholder="Lọc tên lớp…" data-a="find"></div><div class="lm-tbl"><table><thead><tr><th>HH</th><th>Tên lớp</th><th>Bật</th><th>Băng</th><th>Khoá</th><th>Màu</th><th style="text-align:right">Số nét</th></tr></thead><tbody></tbody></table></div><p style="margin:8px 0 0">Bấm đúp tên = đặt hiện hành · bấm ô màu để đổi màu lớp (đối tượng ByLayer đổi theo) · lớp khoá không chọn/sửa được.</p>',
      ok: () => { lmRoot = null; }, onOpen: root => { lmRoot = root; } });
    let selName = A.LS.cur;
    const root = d.root;
    root.querySelector('.lm-bar').addEventListener('click', async e => { const b = e.target.closest('button[data-a]'); if(!b) return; const a = b.dataset.a;
      if(a === 'new'){ let i = 1; const names = A.layerNames(); while(names.includes('Layer' + i)) i++; const nm = await askText({ title: 'Tên lớp mới', value: 'Layer' + i }); if(nm == null) return; const n = nm.trim(); if(!n) return; if(!A.addLayer(n, '#ffffff')){ say('Tên lớp đã có.'); return; } selName = n; renderLM(selName); }
      if(a === 'cur'){ if(selName){ A.setCurLayer(selName); renderLM(selName); } }
      if(a === 'del'){ const m = A.deleteLayer(selName); if(m) say(m); else { selName = A.LS.cur; renderLM(selName); } }
      if(a === 'allon'){ A.LS.off.clear(); A.setLayerFlag('0', 'off', false); renderLM(selName); }
      if(a === 'thaw'){ A.LS.frozen.clear(); A.setLayerFlag('0', 'frozen', false); renderLM(selName); }
      if(a === 'unlock'){ A.LS.locked.clear(); A.setLayerFlag('0', 'locked', false); renderLM(selName); } });
    root.querySelector('[data-a="find"]').addEventListener('input', e => { lmFilter = e.target.value.trim().toLowerCase(); renderLM(selName); });
    root.querySelector('tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; const n = tr.dataset.n; selName = n; const t = e.target.closest('[data-f]');
      if(t){ const f = t.dataset.f; if(f === 'col'){ aciPicker(t.getBoundingClientRect(), c => { if(c === 'BYLAYER') return; A.setLayerColor(n, c); renderLM(selName); }); return; }
        const set = f === 'off' ? A.LS.off : f === 'frozen' ? A.LS.frozen : A.LS.locked; A.setLayerFlag(n, f, !set.has(n)); }
      renderLM(selName); });
    root.querySelector('tbody').addEventListener('dblclick', async e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; const n = tr.dataset.n;
      if(e.target.closest('.nm') && e.altKey){ return; }
      A.setCurLayer(n); renderLM(n); });
    renderLM(selName);
  }
  function renderLM(selName){
    if(!lmRoot) return; const tb = lmRoot.querySelector('tbody'); if(!tb) return; A.lsSync();
    const cnt = {}; for(const e of modelEntities) cnt[e.layer || '0'] = (cnt[e.layer || '0'] || 0) + 1;
    const rows = A.layerNames().filter(n => !lmFilter || n.toLowerCase().includes(lmFilter));
    tb.innerHTML = rows.map(n => { const off = A.LS.off.has(n), fz = A.LS.frozen.has(n), lk = A.LS.locked.has(n); const aci = A.aciNear ? A.aciNear(A.layerHex(n)) : '';
      return '<tr data-n="' + esc(n) + '" class="' + (n === A.LS.cur ? 'cur' : '') + '" style="' + (n === selName ? 'outline:1px solid #3d9ae8' : '') + '"><td>' + (n === A.LS.cur ? '<b style="color:#7ee787">✓</b>' : '') + '</td><td class="nm' + (off || fz ? ' off' : '') + '">' + esc(n) + '</td><td><button class="tg" data-f="off">' + svg(BULB(!off)) + '</button></td><td><button class="tg" data-f="frozen">' + svg(SUN(fz)) + '</button></td><td><button class="tg" data-f="locked">' + svg(LOCK(lk)) + '</button></td><td><span class="sw" data-f="col" style="background:' + esc(A.layerHex(n)) + '"></span> <span style="color:#8f99a8">' + aci + '</span></td><td style="text-align:right;color:#aab3c0">' + (cnt[n] || 0) + '</td></tr>'; }).join('');
  }
  A.openLayerManager = openLayerManager;

  /* ---------------- thư viện khối ---------------- */
  function openBlockLib(){
    let L; try{ L = JSON.parse(localStorage.getItem('dvd:blocklib') || '{}'); }catch(_){ L = {}; }
    const names = Object.keys(L).sort();
    A.dialog({ title: 'Thư viện khối của tôi', wide: true, okText: 'Đóng', noCancel: true,
      html: names.length ? '<div class="lm-tbl"><table><thead><tr><th>Tên khối</th><th>Số nét</th><th>Tạo lúc</th><th></th></tr></thead><tbody>' + names.map(n => '<tr data-n="' + esc(n) + '"><td>' + esc(n) + '</td><td>' + (L[n].ents || []).length + '</td><td>' + (L[n].t ? new Date(L[n].t).toLocaleString('vi-VN') : '') + '</td><td><button class="tg" data-a="ins" title="Chèn">' + ico('INSERT') + '</button><button class="tg" data-a="del" title="Xoá khỏi thư viện">✕</button></td></tr>').join('') + '</tbody></table></div>' : '<p>Chưa có khối nào. Chọn đối tượng rồi dùng lệnh <b>BLOCK</b> (B) để lưu vào thư viện — dùng lại được ở mọi bản vẽ trên máy này.</p>',
      onOpen: root => root.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if(!b) return; const tr = b.closest('tr'); const n = tr.dataset.n;
        if(b.dataset.a === 'del'){ if(!confirm('Xoá khối "' + n + '" khỏi thư viện?')) return; delete L[n]; try{ localStorage.setItem('dvd:blocklib', JSON.stringify(L)); }catch(_){} tr.remove(); }
        else { root.remove(); run('INSERT'); } }) });
  }

  /* ---------------- cài đặt trợ giúp vẽ (Drafting Settings) ---------------- */
  function openDrafting(tab){
    const osIcon = { end: 'end', mid: 'mid', cen: 'cen', qua: 'qua', int: 'int', per: 'per', tan: 'tan', nea: 'nea', nod: 'nod', ins: 'ins' };
    const mk = t => { const c = document.createElement('canvas'); c.width = 36; c.height = 36; const g = c.getContext('2d'); g.scale(2, 2); g.strokeStyle = '#ffcf1a'; g.lineWidth = 1.5; g.beginPath(); const P = { x: 9, y: 9 }, s = 5;
      switch(t){ case 'end': g.rect(P.x - s, P.y - s, 2 * s, 2 * s); break; case 'mid': g.moveTo(P.x, P.y - s); g.lineTo(P.x + s, P.y + s); g.lineTo(P.x - s, P.y + s); g.closePath(); break; case 'cen': g.arc(P.x, P.y, s, 0, 7); break; case 'qua': g.moveTo(P.x, P.y - s); g.lineTo(P.x + s, P.y); g.lineTo(P.x, P.y + s); g.lineTo(P.x - s, P.y); g.closePath(); break; case 'int': g.moveTo(P.x - s, P.y - s); g.lineTo(P.x + s, P.y + s); g.moveTo(P.x + s, P.y - s); g.lineTo(P.x - s, P.y + s); break; case 'per': g.moveTo(P.x - s, P.y - s); g.lineTo(P.x - s, P.y + s); g.lineTo(P.x + s, P.y + s); g.moveTo(P.x - s, P.y); g.lineTo(P.x, P.y); g.lineTo(P.x, P.y + s); break; case 'tan': g.arc(P.x, P.y, s, 0, 7); g.moveTo(P.x - s, P.y - s); g.lineTo(P.x + s, P.y - s); break; case 'nea': g.moveTo(P.x - s, P.y - s); g.lineTo(P.x + s, P.y - s); g.lineTo(P.x - s, P.y + s); g.lineTo(P.x + s, P.y + s); g.closePath(); break; case 'nod': g.arc(P.x, P.y, s, 0, 7); g.moveTo(P.x - 3, P.y - 3); g.lineTo(P.x + 3, P.y + 3); g.moveTo(P.x + 3, P.y - 3); g.lineTo(P.x - 3, P.y + 3); break; case 'ins': g.rect(P.x - s, P.y - s, s, s); g.rect(P.x, P.y, s, s); break; }
      g.stroke(); return c.toDataURL(); };
    const ck = (id, lab, on) => '<label class="ck"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + lab + '</label>';
    const html = '<div class="ds-tabs">' + [['os', 'Bắt điểm (OSNAP)'], ['po', 'Truy bắt cực (POLAR)'], ['gr', 'Lưới & bước (GRID/SNAP)'], ['dy', 'Nhập động & con trỏ']].map(([k, t]) => '<button data-p="' + k + '" class="' + (k === (tab || 'os') ? 'on' : '') + '">' + t + '</button>').join('') + '</div>' +
      '<div class="ds-pane' + ((tab || 'os') === 'os' ? ' on' : '') + '" data-p="os">' + ck('dsOs', 'Bật bắt điểm (F3)', SET.osnap) + ck('dsOt', 'Bật truy bắt theo điểm OTRACK (F11)', SET.otrack) + '<div class="os-grid" style="margin-top:8px">' + A.OS_ALL.map(k => '<label><input type="checkbox" data-os="' + k + '"' + (SET.osm.includes(k) ? ' checked' : '') + '><img src="' + mk(osIcon[k]) + '" width="18" height="18"> ' + A.OS_NAME[k] + '</label>').join('') + '</div><div style="display:flex;gap:6px;margin-top:8px"><button type="button" class="btn-ghost" data-all="1" style="flex:1;padding:6px">Chọn tất cả</button><button type="button" class="btn-ghost" data-all="0" style="flex:1;padding:6px">Bỏ hết</button></div><p style="margin-top:8px">Mẹo: gõ END, MID, CEN, INT, PER, TAN, NEA, QUA, NOD, INS khi đang chọn điểm để bắt điểm 1 lần.</p></div>' +
      '<div class="ds-pane' + (tab === 'po' ? ' on' : '') + '" data-p="po">' + ck('dsPo', 'Bật POLAR (F10)', SET.polar) + ck('dsOr', 'Bật ORTHO — chỉ ngang/dọc (F8, giữ Shift = tạm thời)', SET.ortho) + '<label class="dvd-frow" style="margin-top:8px"><span>Bước góc</span><span class="v"><select id="dsPa">' + [5, 10, 15, 18, 22.5, 30, 45, 90].map(v => '<option' + (v == SET.polarAng ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></span></label></div>' +
      '<div class="ds-pane' + (tab === 'gr' ? ' on' : '') + '" data-p="gr">' + ck('dsGr', 'Hiện lưới (F7)', SET.grid) + ck('dsSn', 'Bước nhảy theo lưới SNAP (F9)', SET.snap) + '<label class="dvd-frow" style="margin-top:8px"><span>Bước SNAP (0 = theo mức phóng)</span><span class="v"><input id="dsSp" type="number" step="any" min="0" value="' + (SET.snapSp || 0) + '"></span></label></div>' +
      '<div class="ds-pane' + (tab === 'dy' ? ' on' : '') + '" data-p="dy">' + ck('dsDy', 'Nhập động cạnh con trỏ (F12)', SET.dyn) + '<label class="dvd-frow" style="margin-top:8px"><span>Cỡ chữ thập (% màn hình, 100 = toàn màn)</span><span class="v"><input id="dsXh" type="number" min="3" max="100" value="' + SET.xhair + '"></span></label><label class="dvd-frow"><span>Ô chọn (pickbox, px)</span><span class="v"><input id="dsPb" type="number" min="2" max="15" value="' + SET.pickbox + '"></span></label><label class="dvd-frow"><span>Vùng bắt điểm (aperture, px)</span><span class="v"><input id="dsAp" type="number" min="4" max="30" value="' + SET.aperture + '"></span></label></div>';
    A.dialog({ title: 'Cài đặt trợ giúp vẽ', wide: true, html, onOpen: root => {
      root.querySelector('.ds-tabs').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if(!b) return; root.querySelectorAll('.ds-tabs button').forEach(x => x.classList.toggle('on', x === b)); root.querySelectorAll('.ds-pane').forEach(x => x.classList.toggle('on', x.dataset.p === b.dataset.p)); });
      root.querySelectorAll('[data-all]').forEach(b => b.onclick = () => root.querySelectorAll('[data-os]').forEach(c => c.checked = b.dataset.all === '1'));
    }, ok: root => {
      const g = id => root.querySelector('#' + id); SET.osnap = g('dsOs').checked; SET.otrack = g('dsOt').checked; SET.osm = [...root.querySelectorAll('[data-os]')].filter(c => c.checked).map(c => c.dataset.os);
      SET.polar = g('dsPo').checked; SET.ortho = g('dsOr').checked; if(SET.ortho) SET.polar = false; SET.polarAng = parseFloat(g('dsPa').value) || 45;
      SET.grid = g('dsGr').checked; SET.snap = g('dsSn').checked; SET.snapSp = Math.max(0, parseFloat(g('dsSp').value) || 0);
      SET.dyn = g('dsDy').checked; SET.xhair = Math.max(3, Math.min(100, parseInt(g('dsXh').value) || 100)); SET.pickbox = Math.max(2, Math.min(15, parseInt(g('dsPb').value) || 5)); SET.aperture = Math.max(4, Math.min(30, parseInt(g('dsAp').value) || 10));
      A.saveSet(); try{ draw(); }catch(_){} } });
  }
  A.openDrafting = openDrafting;

  /* ---------------- thanh trạng thái ---------------- */
  const sb = document.createElement('div'); sb.id = 'acadStatus';
  const TOG = [['grid', 'GRID', 'Lưới (F7)', 'GRID'], ['snap', 'SNAP', 'Bước lưới (F9)', 'ID'], ['ortho', 'ORTHO', 'Vuông góc (F8)', 'LINE'], ['polar', 'POLAR', 'Góc cực (F10)', 'DIMANGULAR'], ['osnap', 'OSNAP', 'Bắt điểm (F3)', 'RECTANG'], ['otrack', 'OTRACK', 'Truy bắt (F11)', 'XLINE'], ['dyn', 'DYN', 'Nhập động (F12)', 'CMDLINE']];
  sb.innerHTML = '<div class="ac-lt" id="acLT"></div><div class="ac-sb"><span class="ac-coord" id="acCoord">0.0000, 0.0000</span><span class="model" id="acModel">MODEL</span><span class="ac-sep"></span>' +
    TOG.map(([k, l, t]) => '<button data-k="' + k + '" title="' + t + ' — chuột phải: cài đặt">' + l + '</button>').join('') + '<span class="ac-sep"></span><button data-x="lwt" title="Hiện bề rộng nét">LWT</button><button data-x="ds" title="Cài đặt trợ giúp vẽ">' + ico('SETTINGS') + '</button><button data-x="pr" title="Thuộc tính (Ctrl+1)">' + ico('PROPS') + '</button><button data-x="cl" title="Toàn màn hình (Ctrl+0)">' + ico('CLEAN') + '</button></div>';
  const nav = document.querySelector('nav.toolbar'); (nav || stageEl).insertAdjacentElement('afterend', sb);
  function syncSB(){ sb.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', !!SET[b.dataset.k])); const lw = sb.querySelector('[data-x="lwt"]'); try{ lw.classList.toggle('on', !!showLW); }catch(_){} syncCtl(); }
  sb.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; if(b.dataset.k){ A.toggle(b.dataset.k); syncSB(); return; }
    const x = b.dataset.x; if(x === 'lwt'){ ACT.TLWT(); setTimeout(syncSB, 60); } else if(x === 'ds') openDrafting(); else if(x === 'pr') DVDCmd.togglePalette(); else if(x === 'cl') ACT.CLEAN(); });
  sb.addEventListener('contextmenu', e => { const b = e.target.closest('[data-k]'); e.preventDefault(); if(!b) return; const k = b.dataset.k;
    if(k === 'polar'){ menu(e.clientX, e.clientY - 220, [5, 10, 15, 22.5, 30, 45, 90].map(v => ({ t: v + '°' + (SET.polarAng == v ? '  ✓' : ''), fn: () => { SET.polarAng = v; SET.polar = true; SET.ortho = false; A.saveSet(); syncSB(); } })).concat([{ sep: 1 }, { t: 'Cài đặt…', fn: () => openDrafting('po') }])); return; }
    if(k === 'osnap'){ menu(e.clientX, e.clientY - 300, A.OS_ALL.map(m => ({ t: (SET.osm.includes(m) ? '✓ ' : '   ') + A.OS_NAME[m], fn: () => { const i = SET.osm.indexOf(m); if(i >= 0) SET.osm.splice(i, 1); else SET.osm.push(m); SET.osnap = true; A.saveSet(); syncSB(); } })).concat([{ sep: 1 }, { t: 'Cài đặt…', fn: () => openDrafting('os') }])); return; }
    openDrafting(k === 'grid' || k === 'snap' ? 'gr' : k === 'dyn' ? 'dy' : 'os'); });
  A.onSetChange = syncSB;
  const coordEl = $('acCoord');
  A.onMouse = m => { if(!coordEl) return; try{ const w = toWorld(m.x, m.y); const p = A.SET.snap ? { x: Math.round(w.x / A.gridSpacing()) * A.gridSpacing(), y: Math.round(w.y / A.gridSpacing()) * A.gridSpacing() } : w; coordEl.textContent = A.fmt(p.x) + ', ' + A.fmt(p.y) + ', 0'; }catch(_){} };
  function renderLT(){
    const lt = $('acLT'); if(!lt) return; let h = '';
    if(!dwgLayouts.length) h = '<button class="on" data-l="-1">Model</button>';
    else dwgLayouts.forEach((L, i) => { if(!L.isModel && (!L.paper || (!L.paper.viewports.length && !L.paper.paperPrims.length))) return; h += '<button data-l="' + i + '" class="' + (i === currentLayout ? 'on' : '') + '">' + esc(L.isModel ? 'Model' : L.name) + '</button>'; });
    lt.innerHTML = h; $('acModel').textContent = isModelView() ? 'MODEL' : 'PAPER';
  }
  $('acLT').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if(!b) return; const i = +b.dataset.l; if(i >= 0 && i !== currentLayout) switchLayout(i); setTimeout(renderLT, 30); });

  /* ---------------- menu chuột phải ---------------- */
  A.contextMenu = function(ev){
    const has = selEnts.size > 0; const recent = []; const last = DVDCmd.commands; void last;
    const items = [];
    const lc = window.__dvdLastCmd; if(lc) items.push({ t: 'Lặp lại ' + lc, ic: 'SYNC', fn: () => run(lc) });
    items.push({ sep: 1 });
    if(has){ items.push({ hd: 'Đã chọn ' + selEnts.size + ' đối tượng' }); for(const [c, t, k] of [['MOVE', 'Di chuyển', 'M'], ['COPY', 'Sao chép', 'CO'], ['ROTATE', 'Xoay', 'RO'], ['SCALE', 'Tỉ lệ', 'SC'], ['MIRROR', 'Đối xứng', 'MI'], ['ERASE', 'Xoá', 'Del']]) items.push({ t: t, k, ic: c, fn: () => run(c) }); items.push({ sep: 1 }); }
    items.push({ t: 'Cắt', k: 'Ctrl+X', ic: 'CUTCLIP', fn: () => run('CUTCLIP'), dis: !has }, { t: 'Sao chép', k: 'Ctrl+C', ic: 'COPYCLIP', fn: () => run('COPYCLIP'), dis: !has }, { t: 'Sao chép kèm gốc', k: 'Ctrl+Shift+C', ic: 'COPYBASE', fn: () => run('COPYBASE'), dis: !has }, { t: 'Dán', k: 'Ctrl+V', ic: 'PASTECLIP', fn: () => run('PASTECLIP') }, { t: 'Dán đúng toạ độ', k: 'Ctrl+Shift+V', ic: 'PASTECLIP', fn: () => run('PASTEORIG') });
    items.push({ sep: 1 });
    if(has) items.push({ t: 'Bỏ chọn', ic: 'ERASE', fn: () => clearSel() });
    items.push({ t: 'Chọn tất cả', k: 'Ctrl+A', fn: () => DVDCmd.run('ALL') }, { t: 'Thuộc tính', k: 'Ctrl+1', ic: 'PROPS', fn: () => DVDCmd.togglePalette(true) }, { sep: 1 }, { t: 'Phóng vừa bản vẽ', ic: 'ZE', fn: ACT.ZE }, { t: 'Phóng khung', ic: 'ZW', fn: ACT.ZW }, { t: 'Khung nhìn trước', ic: 'ZP', fn: ACT.ZP });
    menu(ev.clientX, ev.clientY, items.filter((x, i, a) => !(x.sep && (i === 0 || a[i - 1].sep))));
  };
  // ghi nhớ lệnh cuối
  (function(){ const _r = DVDCmd.run; DVDCmd.run = function(t){ const n = String(t || '').trim().split(/\s+/)[0].toUpperCase(); if(n && !A.busy()){ const c = DVDCmd.commands.find(c => c.k.includes(n)); if(c && !/^(UNDO|U|REDO|HELP|\?)$/.test(c.k[0])) window.__dvdLastCmd = c.k[0]; } return _r.apply(this, arguments); }; })();

  /* ---------------- điện thoại: bảng "Công cụ CAD" ---------------- */
  function mobileSheet(){
    const groups = [['Vẽ', ['LINE', 'PLINE', 'CIRCLE', 'ARC', 'RECTANG', 'POLYGON', 'ELLIPSE', 'SPLINE', 'TEXT', 'HATCH', 'POINT', 'REVCLOUD']], ['Sửa', ['MOVE', 'COPY', 'ROTATE', 'SCALE', 'MIRROR', 'OFFSET', 'TRIM', 'EXTEND', 'FILLET', 'CHAMFER', 'STRETCH', 'BREAK', 'JOIN', 'EXPLODE', 'ARRAY', 'ERASE']], ['Kích thước', ['DIMLINEAR', 'DIMALIGNED', 'DIMANGULAR', 'DIMRADIUS', 'DIMCONTINUE', 'DIST', 'AREA']], ['Khác', ['INSERT', 'BLOCK', 'COPYCLIP', 'PASTECLIP', 'LAYER', 'MATCHPROP', 'LIST', 'NEW']]];
    const lab = c => { const x = DVDCmd.commands.find(k => k.k[0] === c); return x ? x.k[0] : c; };
    const short = { LINE: 'Đường', PLINE: 'Đa tuyến', CIRCLE: 'Tròn', ARC: 'Cung', RECTANG: 'Chữ nhật', POLYGON: 'Đa giác', ELLIPSE: 'Elip', SPLINE: 'Spline', TEXT: 'Chữ', HATCH: 'Hatch', POINT: 'Điểm', REVCLOUD: 'Mây', MOVE: 'Di chuyển', COPY: 'Sao chép', ROTATE: 'Xoay', SCALE: 'Tỉ lệ', MIRROR: 'Đối xứng', OFFSET: 'Offset', TRIM: 'Cắt', EXTEND: 'Kéo dài', FILLET: 'Bo góc', CHAMFER: 'Vát', STRETCH: 'Kéo giãn', BREAK: 'Bẻ gãy', JOIN: 'Nối', EXPLODE: 'Phá', ARRAY: 'Mảng', ERASE: 'Xoá', DIMLINEAR: 'Dim thẳng', DIMALIGNED: 'Dim chéo', DIMANGULAR: 'Dim góc', DIMRADIUS: 'Dim R', DIMCONTINUE: 'Dim nối', DIST: 'Khoảng cách', AREA: 'Diện tích', INSERT: 'Chèn khối', BLOCK: 'Tạo khối', COPYCLIP: 'Copy', PASTECLIP: 'Dán', LAYER: 'Lớp', MATCHPROP: 'Sao thuộc tính', LIST: 'Thông tin', NEW: 'Bản vẽ mới' };
    const html = groups.map(([g, cs]) => '<div class="mb-sec">' + g + '</div><div class="mb-grid">' + cs.map(c => '<button data-c="' + c + '">' + ico(c) + '<span>' + esc(short[c] || lab(c)) + '</span></button>').join('') + '</div>').join('') + '<p style="margin-top:10px">Chạm điểm trên bản vẽ (tự bắt điểm), nhập số ở thanh lệnh, ↵ = Enter, ✕ = huỷ.</p>';
    A.dialog({ title: 'Công cụ CAD', html, noOk: true, cancelText: 'Đóng', onOpen: root => root.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if(!b) return; root.remove(); doCmd(b.dataset.c); }) });
  }
  A.mobileSheet = mobileSheet;
  (function(){ const ct = $('ctools'); if(!ct) return; const b = document.createElement('button'); b.className = 'ctool'; b.id = 'dvdToolsBtn'; b.innerHTML = ico('TOOLS', '') + 'Công cụ'; b.querySelector('svg').setAttribute('style', 'width:20px;height:20px;stroke:currentColor;stroke-width:1.7;fill:none'); b.addEventListener('click', mobileSheet); ct.insertBefore(b, ct.firstChild); })();

  /* ---------------- trang trống: thêm "Bản vẽ mới" ---------------- */
  (function(){ const row = document.querySelector('#empty .row'); if(!row) return; const b = document.createElement('button'); b.className = 'top-btn'; b.style.fontSize = '13px'; b.textContent = '＋ Bản vẽ mới'; b.addEventListener('click', () => A.newDrawing()); row.appendChild(b); })();
  // ô nhập chữ: Enter = xong (Shift+Enter xuống dòng), Esc = huỷ
  (function(){ const ta = $('txtInput'); if(!ta) return; ta.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); try{ txtOk(); }catch(_){} } else if(e.key === 'Escape'){ e.preventDefault(); try{ txtCancel(); }catch(_){} } e.stopPropagation(); }); })();
  window.addEventListener('keydown', e => { if(e.key === 'Escape'){ const nb = $('numBar'); if(nb && nb.classList.contains('show')){ e.preventDefault(); try{ numCancel(); }catch(_){} } } }, true);

  /* ---------------- bật/tắt chế độ máy tính ---------------- */
  function applyMode(){
    const on = A.deskUI(); const was = document.documentElement.classList.contains('acad');
    document.documentElement.classList.toggle('acad', on);
    if(on !== was){ setTimeout(() => { try{ resize(); }catch(_){} try{ DVDCmd.refresh(); }catch(_){} }, 20); }
  }
  function updTitle(){ const n = (typeof currentName === 'string' && currentName) ? currentName : ''; $('acTitle').innerHTML = 'DVDCAD' + (n ? ' — <b>' + esc(n) + '</b>' : ''); $('acFileName').textContent = n || 'Chưa mở bản vẽ'; $('acFileTab').style.display = A.hasDoc() ? '' : 'none'; try{ document.title = (n ? n + ' — ' : '') + 'DVDCAD'; }catch(_){} }
  A.onLoad = (function(prev){ return function(){ if(prev) prev(); updTitle(); renderLT(); syncCtl(); syncSB(); }; })(A.onLoad);
  $('acNewTab').onclick = () => A.newDrawing();
  $('acStart').onclick = () => click('openBtn');
  $('acFileClose').onclick = () => { if(!confirm('Đóng bản vẽ? (các thay đổi đã tự lưu trên máy)')) return; location.href = location.pathname; };
  window.addEventListener('resize', applyMode);
  applyMode(); renderTabs(); renderRibbon(); syncSB(); updTitle(); renderLT();
  // vẽ lại khi mở modal ở chế độ máy tính: các overlay của app canh giữa
  setTimeout(() => { try{ resize(); }catch(_){} }, 60);
})();
