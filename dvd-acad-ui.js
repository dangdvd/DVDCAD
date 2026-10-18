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
    BHAND: '<path d="M4 4l7 16 2-7 7-2z"/>',
    LTYPE: '<path d="M3 6h5M11 6h3M17 6h4" /><path d="M3 12h9M15 12h1M19 12h2"/><path d="M3 18h2M8 18h2M13 18h2M18 18h2"/>',
    LINETYPE: '<path d="M3 6h5M11 6h3M17 6h4" /><path d="M3 12h9M15 12h1M19 12h2"/><path d="M3 18h2M8 18h2M13 18h2M18 18h2"/>',
    LTSCALE: '<path d="M3 8h4M10 8h4M17 8h4"/><path d="M3 16h8M14 16h7"/><path d="M12 10v4M10 12.5l2 2 2-2"/>',
    LWEIGHT: '<path d="M3 6h18" stroke-width="1"/><path d="M3 12h18" stroke-width="2.5"/><path d="M3 18h18" stroke-width="4"/>',
    QSELECT: '<path d="M4 4h16l-6 8v6l-4 2v-8z"/>',
    WIPEOUT: '<path d="M4 6h16v12H4z" stroke-dasharray="3 2"/><path d="M7 9h10v6H7z" fill="currentColor" fill-opacity=".15"/>',
    TEXTTOFRONT: '<rect x="3" y="8" width="13" height="12" fill="currentColor" fill-opacity=".2"/><path d="M8 4h12M14 4v10"/>',
    HATCHTOBACK: '<rect x="8" y="3" width="13" height="13"/><path d="M3 9l6-6M3 15l12-12M3 21l18-18" stroke-width="1" opacity=".6"/>',
    CANNOSCALE: '<path d="M4 18h16M4 18v-4M8 18v-2M12 18v-4M16 18v-2M20 18v-4"/><path d="M6 10l3-6 3 6M7 8h4"/>',
    ANNOTATIVE: '<path d="M5 18l4-12 4 12M6.5 14h5"/><path d="M15 14h6M18 11v6"/>',
    SAVEDWG: '<path d="M5 3h11l4 4v14H5z"/><path d="M8 14h2.5a2 2 0 0 1 0 4H8zM13 14l1 4 1-3 1 3 1-4"/>',
    DWGSERVER: '<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/><circle cx="8" cy="7" r=".8" fill="currentColor"/><circle cx="8" cy="17" r=".8" fill="currentColor"/>',
    GEOMCONSTRAINT: '<path d="M4 20L20 4"/><rect x="2" y="17" width="5" height="5"/><rect x="17" y="2" width="5" height="5"/>',
    GCHORIZONTAL: '<path d="M3 12h18"/><circle cx="4" cy="12" r="1.6" fill="currentColor"/><circle cx="20" cy="12" r="1.6" fill="currentColor"/>',
    GCVERTICAL: '<path d="M12 3v18"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/><circle cx="12" cy="20" r="1.6" fill="currentColor"/>',
    GCPARALLEL: '<path d="M4 18L14 4M10 20L20 6"/>',
    GCPERPENDICULAR: '<path d="M5 20h15M8 20V5"/><path d="M8 16h4v4"/>',
    GCCOINCIDENT: '<path d="M3 20l9-8M12 12l9 8M12 12V3"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
    GCCOLLINEAR: '<path d="M3 19l5-5M11 11l3-3M17 5l4-4"/>',
    GCEQUAL: '<path d="M5 9h14M5 15h14"/>',
    GCCONCENTRIC: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    GCTANGENT: '<circle cx="11" cy="13" r="7"/><path d="M3 6h18"/>',
    GCFIX: '<rect x="6" y="11" width="12" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    AUTOCONSTRAIN: '<path d="M4 20L20 4"/><path d="M15 15l2 4 2-4 4-2-4-2-2-4-2 4-4 2z" fill="currentColor" fill-opacity=".3" transform="scale(.6) translate(10 10)"/>',
    DIMCONSTRAINT: '<path d="M3 6v10M21 6v10M3 11h18"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M10.5 15v-1.5a1.5 1.5 0 0 1 3 0V15"/>',
    DCALIGNED: '<path d="M4 16L16 4M7 19L19 7"/><path d="M6 18l-2-2M18 6l-2-2"/>',
    DCRADIUS: '<circle cx="12" cy="12" r="8"/><path d="M12 12l6-6"/>',
    DCANGULAR: '<path d="M4 20h16M4 20L16 6"/><path d="M12 20a8 8 0 0 0-2-5"/>',
    PARAMETERS: '<path d="M4 5h4M4 12h4M4 19h4"/><path d="M11 5h9M11 12h9M11 19h9" stroke-dasharray="2 2"/>',
    DELCONSTRAINT: '<path d="M4 20L20 4"/><path d="M14 14l6 6M20 14l-6 6"/>',
    CONSTRAINTBAR: '<rect x="3" y="8" width="5" height="5"/><rect x="10" y="8" width="5" height="5"/><path d="M17 10.5h4"/>',
    BPARAMETER: '<rect x="3" y="3" width="12" height="12"/><path d="M15 15l6 6M18 21h3v-3"/><circle cx="15" cy="15" r="1.5" fill="currentColor"/>',
    BDYN: '<rect x="3" y="6" width="12" height="12"/><path d="M18 9v6M16 11l2-2 2 2M16 13l2 2 2-2"/>',
    DRAWORDER: '<rect x="3" y="3" width="11" height="11"/><rect x="10" y="10" width="11" height="11" fill="currentColor" fill-opacity=".35"/>',
    MLEADER: '<path d="M3 21l8-8h10"/><path d="M3 21l1.5-4.5L7.5 19.5z" fill="currentColor"/><path d="M13 9h8M13 5h8"/>',
    QLEADER: '<path d="M3 21l8-8h10"/><path d="M3 21l1.5-4.5L7.5 19.5z" fill="currentColor"/><path d="M13 9h8M13 5h8"/>',
    ALIGN: '<rect x="3" y="12" width="7" height="7"/><path d="M14 4l6 6-5 5-6-6z" stroke-dasharray="2 2"/><path d="M10 12l4-3"/>',
    DIMEDIT: '<path d="M3 5v10M21 5v10M3 11h18"/><path d="M14 20l6-6 2 2-6 6h-2z"/>',
    ISOLATE: '<circle cx="12" cy="12" r="4"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/>',
    ISOLATEOBJECTS: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
    HIDEOBJECTS: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><path d="M4 4l16 16"/>',
    UNISOLATEOBJECTS: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    OVERKILL: '<path d="M3 8h18M3 12h18" /><path d="M14 16l6 6M20 16l-6 6"/>',
    BOUNDARY: '<path d="M4 4h16v16H4z" stroke-width="2.4"/><circle cx="12" cy="12" r="1.5"/>',
    DONUT: '<circle cx="12" cy="12" r="8" stroke-width="5"/>',
    MEASUREGEOM: '<rect x="4" y="5" width="16" height="14"/><path d="M4 12h16M12 5v14" stroke-dasharray="2 2"/>',
    TABLE: '<rect x="3" y="4" width="18" height="16"/><path d="M3 9h18M3 14h18M9 9v11M15 9v11"/>',
    TABLEDIT: '<rect x="3" y="4" width="18" height="16"/><path d="M3 9h18M9 9v11"/>',
    QDIM: '<path d="M3 6v8M9 6v8M15 6v8M21 6v8M3 11h18"/><path d="M3 19h18" stroke-dasharray="2 2"/>',
    REFEDIT: '<rect x="3" y="3" width="10" height="10"/><path d="M14 20l6-6 2 2-6 6h-2z"/>',
    BEDIT: '<rect x="3" y="3" width="10" height="10"/><path d="M14 20l6-6 2 2-6 6h-2z"/>',
    ATTDEF: '<path d="M4 6h16M4 12h10"/><path d="M4 18h6"/><circle cx="17" cy="16" r="3"/>',
    EATTEDIT: '<path d="M4 6h16M4 12h10"/><path d="M13 20l6-6 2 2-6 6h-2z"/>',
    ATTEXPORT: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    XATTACH: '<rect x="3" y="3" width="12" height="12" stroke-dasharray="3 2"/><path d="M14 14l7 7M21 15v6h-6"/>',
    XREF: '<rect x="3" y="3" width="12" height="12" stroke-dasharray="3 2"/><path d="M9 21h12V9"/>',
    IMAGEATTACH: '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M3 18l6-5 4 3 3-2 5 4"/>',
    IMAGEADJUST: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 4v16" /><path d="M12 4h9v16h-9z" fill="currentColor" fill-opacity=".35"/>',
    LAYOUT: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><rect x="8" y="10" width="8" height="7"/>',
    MVIEW: '<rect x="3" y="4" width="18" height="16"/><rect x="6" y="7" width="8" height="6" stroke-dasharray="2 2"/>',
    VPEDIT: '<rect x="3" y="4" width="18" height="16"/><path d="M8 14l3-3 2 2 4-4"/>',
    PICKSTYLE: '<rect x="3" y="3" width="18" height="18" stroke-dasharray="3 2"/><path d="M8 8l7 9 1-4 4-1z"/>',
    BOX: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
    CYLINDER: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/>',
    CONE: '<path d="M12 3L5 18M12 3l7 15"/><ellipse cx="12" cy="18" rx="7" ry="2.5"/>',
    SPHERE: '<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/><path d="M12 4c-3 2.5-3 13.5 0 16" stroke-dasharray="2 2"/>',
    EXTRUDE: '<path d="M4 16l6-3 10 3-6 4z"/><path d="M10 13V5M12 7l-2-2-2 2"/>',
    PRESSPULL: '<rect x="4" y="12" width="16" height="7"/><path d="M12 12V3M9 6l3-3 3 3"/>',
    WALL3D: '<path d="M3 9l6-3 12 3v9l-12-3-6 3z"/><path d="M9 6v9"/>',
    '3DORBIT': '<circle cx="12" cy="12" r="3"/><path d="M3 12c0-3 4-5.5 9-5.5s9 2.5 9 5.5-4 5.5-9 5.5"/><path d="M8 15l-2 2.6L9 19"/>',
    EXPORTSTL: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M12 9v7M9 13l3 3 3-3"/>',
    EXPORTOBJ: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M8 11h8M8 14h5"/>',
    VIEWTOP: '<rect x="5" y="5" width="14" height="14"/><path d="M5 5l14 14" stroke-dasharray="2 2"/>',
    VIEWFRONT: '<rect x="4" y="9" width="16" height="11"/><path d="M4 9l3-4h13l-3 4"/>',
    VIEWSWISO: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z" stroke-dasharray="2 2"/><path d="M4 8l8 4 8-4M12 12v9"/>',
    UNION: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/><path d="M12 7v10" stroke-dasharray="2 2"/>',
    SUBTRACT: '<rect x="3" y="6" width="13" height="12"/><circle cx="16" cy="12" r="5" stroke-dasharray="2 2"/>',
    INTERSECT: '<circle cx="9" cy="12" r="6" stroke-dasharray="2 2"/><circle cx="15" cy="12" r="6" stroke-dasharray="2 2"/><path d="M12 7a6 6 0 0 1 0 10a6 6 0 0 1 0-10z" fill="currentColor" fill-opacity=".35"/>',
    SLICE: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M3 21L21 3" stroke-width="2"/>',
    REVOLVE: '<path d="M12 3v18" stroke-dasharray="3 2"/><path d="M12 5c4 0 5 3 3 6s0 7 2 8h-5"/><path d="M12 5c-4 0-5 3-3 6s0 7-2 8h5" opacity=".5"/>',
    SWEEP: '<path d="M3 18c4 0 5-12 9-12s5 8 9 8"/><circle cx="3" cy="18" r="2"/><circle cx="21" cy="14" r="2"/>',
    TORUS: '<ellipse cx="12" cy="12" rx="9" ry="5"/><ellipse cx="12" cy="12" rx="4" ry="1.8"/>',
    PYRAMID: '<path d="M12 3L3 18l9 3 9-3z"/><path d="M12 3v18"/>',
    WEDGE: '<path d="M3 18h18L3 6z"/><path d="M3 18l4 3h18l-4-3M21 18v0"/>',
    '3DMOVE': '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M22 12l-3-3M22 12l-3 3"/><path d="M5 19l14-14" stroke-dasharray="2 2"/>',
    '3DROTATE': '<ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M12 3v18"/><path d="M19 9l2 3-3 1"/>',
    MIRROR3D: '<path d="M3 12h18" stroke-dasharray="3 2"/><path d="M8 4l4 5 4-5zM8 20l4-5 4 5z"/>',
    ELEV: '<path d="M4 20h16M12 20V5M8 9l4-4 4 4"/>',
    MATERIALS: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="2" fill="currentColor"/><circle cx="15" cy="10" r="1.6"/><circle cx="10" cy="15" r="1.6"/>',
    RENDER: '<path d="M12 3l2.5 6 6.5.5-5 4 1.6 6.5L12 16.5 6.4 20l1.6-6.5-5-4 6.5-.5z"/>',
    SECTIONPLANE: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M2 13l10 4 10-4" stroke-width="2"/>',
    MLINE: '<path d="M3 8h14l4 4M3 14h11l3 3"/>',
    DIMORDINATE: '<path d="M5 20V8M5 8l4-4h10"/><path d="M3 20h4"/>',
    DIMARC: '<path d="M5 18a9 9 0 0 1 14 0"/><path d="M4 12a11 11 0 0 1 16 0" stroke-dasharray="2 2"/>',
    CENTERMARK: '<circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6M10 12h4M12 10v4"/>',
    CENTERLINE: '<path d="M4 6h16M4 18h16"/><path d="M3 12h4M9 12h2M13 12h2M17 12h4"/>',
    ARRAYPATH: '<path d="M3 18c5-12 13-12 18 0"/><rect x="4" y="12" width="3" height="3"/><rect x="10.5" y="6" width="3" height="3"/><rect x="17" y="12" width="3" height="3"/>',
    BLEND: '<path d="M3 6h6M15 18h6"/><path d="M9 6c6 0 0 12 6 12" stroke-dasharray="2 2"/>',
    REVERSE: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    SETBYLAYER: '<rect x="4" y="4" width="16" height="5"/><rect x="4" y="11" width="16" height="5"/><path d="M8 20h8"/>',
    VIEW: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="12" cy="12" r="3"/>',
    PUBLISH: '<path d="M6 3h9l3 3v6M6 3v18h6"/><path d="M15 15h6v6h-6zM17 13v2"/>',
    MASSPROP: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M9 12h6M12 9v6"/>',
    SHELL: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M7 9.5l5-2.5 5 2.5v5.5l-5 2.5-5-2.5z" stroke-dasharray="2 2"/>',
    INTERFERE: '<rect x="3" y="7" width="11" height="11"/><rect x="10" y="3" width="11" height="11"/><rect x="10" y="7" width="4" height="7" fill="currentColor" fill-opacity=".5"/>',
    '3DARRAY': '<rect x="3" y="13" width="5" height="5"/><rect x="10" y="13" width="5" height="5"/><rect x="3" y="6" width="5" height="5"/><rect x="10" y="6" width="5" height="5"/><path d="M17 4v16" stroke-dasharray="2 2"/>',
    CAL: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2"/>',
    UCS: '<path d="M5 19V5M5 19h14"/><path d="M5 19l7-7" stroke-dasharray="2 2"/><path d="M3 7l2-2 2 2M17 17l2 2-2 2"/>',
    LOFT: '<ellipse cx="12" cy="19" rx="8" ry="2.5"/><rect x="8" y="3" width="8" height="4"/><path d="M4 19L8 5M20 19L16 5"/>',
    FILLETEDGE: '<path d="M4 20V10a6 6 0 0 1 6-6h10"/><path d="M4 20h16" stroke-dasharray="2 2"/>',
    CHAMFEREDGE: '<path d="M4 20V9l5-5h11"/><path d="M4 20h16" stroke-dasharray="2 2"/>',
    LIGHT: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3A6 6 0 0 1 12 3z"/>',
    SUNPROPERTIES: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    CAMERA: '<rect x="3" y="7" width="12" height="10" rx="1"/><path d="M15 10l6-3v10l-6-3z"/>',
    '3DWALK': '<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6 3 3v3M11 15l1-6 4 3 3 1M12 9l-4 2-1 4"/>',
    FLATSHOT: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z" stroke-dasharray="2 2"/><rect x="7" y="9" width="10" height="8"/>'
  };
  const ICN = () => window.DVDIcons || {};
  const ico = (k, cls) => { const C = ICN(); const sv = C[k] || I[k] || C.TOOLS || I.TOOLS; return '<svg class="' + (cls || 'ic') + (C[k] ? ' cc' : '') + '" viewBox="0 0 24 24">' + sv + '</svg>'; };
  A.ICONS = Object.assign({}, I, window.DVDIcons || {}); A.ico = ico;

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
  .ac-p3{gap:3px}
  #acadStatus button.iso-on{color:#ff5b5b}
  .ac-p3 select{height:22px;font-size:11.5px}
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
  .lm-tbl .lk{cursor:pointer;color:#cfd6e0;border-bottom:1px dotted #6c7686}
  .lm-tbl .lk:hover{color:#fff}
  .lm-tbl canvas{display:block;position:static !important;width:140px;height:14px}
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
  
  /* ===== ribbon kiểu AutoCAD (giao diện tối) ===== */
  .ac-appbar{background:#20262f;height:34px}
  .ac-ws{display:flex;align-items:center;gap:5px;height:24px;margin-left:8px;padding:0 8px;border-radius:3px;border:1px solid #3c4553;background:#2a313b;color:#d6dde7;font:500 11.5px system-ui,sans-serif;cursor:pointer;white-space:nowrap}
  .ac-ws:hover{background:#38414e}
  .ac-ws .ic{width:14px;height:14px}
  .ac-ws i{font-style:normal;font-size:9px;opacity:.7}
  .ac-tabs{background:#2b323c;height:27px;padding:0 6px;border-top:1px solid #1a1f26}
  .ac-tabs button{font:500 12.5px "Segoe UI",system-ui,sans-serif;color:#c3cbd6;padding:5px 13px 5px;border:1px solid transparent;border-bottom:none;border-radius:3px 3px 0 0;margin-top:2px}
  .ac-tabs button:hover{color:#fff;background:#343c48}
  .ac-tabs button.on{color:#fff;background:#3b4452;border-color:#4a5463;border-bottom-color:#3b4452}
  .ac-tabsp{flex:1}
  .ac-tabs .ac-tabmin{padding:2px 8px;margin:0 0 2px;font-size:11px;color:#9aa4b2;border:none;background:none}
  .ac-ribbon{background:#3b4452;height:104px;border-top:1px solid #4a5463;border-bottom:1px solid #20262e}
  .ac-panel{border-right:1px solid #2c333e;box-shadow:inset -1px 0 0 #46505e}
  .ac-pbody{padding:3px 4px 1px;gap:1px}
  .ac-ptitle{height:20px;line-height:20px;font:500 11.5px "Segoe UI",system-ui,sans-serif;color:#c1c9d4;background:#323a46;border-top:1px solid #2c333e;padding:0 8px}
  .ac-ptitle.more{cursor:pointer}
  .ac-ptitle.more i{font-style:normal;font-size:9px;opacity:.75;margin-left:2px}
  .ac-ptitle.more:hover,.ac-ptitle.open{background:#3f6ea5;color:#fff}
  .ac-rbig{min-width:46px;max-width:76px;padding:2px 4px 3px;gap:2px;border-radius:2px;font:400 11.5px "Segoe UI",system-ui,sans-serif;color:#e4e9f0;justify-content:flex-start}
  .ac-rbig .ic{width:32px;height:32px;margin-top:1px}
  .ac-rbig span{white-space:nowrap;line-height:1.18}
  .ac-rbig .dd,.ac-dd{font-style:normal;font-size:8.5px;color:#aeb7c3}
  .ac-rbig .dd{display:block;line-height:9px}
  .ac-rbig.has-dd{padding-bottom:1px}
  .ac-rbig:hover,.ac-rbtn:hover,.ac-dd:hover{background:#4c5869;border-color:#61708a}
  .ac-col{gap:0;justify-content:space-around}
  .ac-sgrp{display:flex;align-items:stretch}
  .ac-rbtn{height:25px;gap:5px;padding:0 6px 0 3px;border-radius:2px;font:400 12px "Segoe UI",system-ui,sans-serif;color:#e4e9f0}
  .ac-rbtn .ic{width:16px;height:16px}
  .ac-rbtn.ac-ic{padding:0 4px;width:27px;justify-content:center}
  .ac-dd{width:13px;height:25px;padding:0;border:1px solid transparent;background:none;cursor:pointer;border-radius:2px;margin-left:-2px}
  .ac-rbtn.on,.ac-rbig.on{background:#2d6cb3;border-color:#4b8fdc}
  .ac-panel.ico-only .ac-rbtn:not(.ac-ic) span{display:none}
  .ac-panel.ico-only .ac-rbtn{padding:0 4px}
  .ac-ctl{min-width:190px}
  .ac-ctl select,.ac-laybtn{background:#2a313b;border-color:#566173;height:23px}
  .ac-ctl .ac-rbtn.ac-ic{width:24px;height:23px}
  .ac-slide{position:fixed;z-index:69;background:#3b4452;border:1px solid #5a6680;box-shadow:0 10px 26px rgba(0,0,0,.5);display:flex;flex-direction:column}
  .ac-slbody{display:grid;grid-template-columns:repeat(2,minmax(150px,auto));gap:1px;padding:4px}
  .ac-slide .ac-ptitle{cursor:pointer;background:#3f6ea5;color:#fff}
  .ac-rtip{position:fixed;z-index:90;max-width:340px;background:#f4f6f9;color:#1d232c;border:1px solid #8f9aaa;border-radius:2px;box-shadow:0 6px 18px rgba(0,0,0,.45);padding:8px 10px 6px;font:12px "Segoe UI",system-ui,sans-serif;pointer-events:none}
  .ac-rtip.sm{padding:3px 7px}
  .ac-rtip .tt{font-weight:700;font-size:13px;margin-bottom:3px}
  .ac-rtip .tt span{font-weight:400;color:#5b6676;font-size:12px;margin-left:8px}
  .ac-rtip .td{color:#2b333f;line-height:1.4;margin-bottom:6px}
  .ac-rtip .tk{display:flex;align-items:center;gap:6px;border-top:1px solid #d3d9e2;padding-top:5px;color:#3a4553}
  .ac-rtip .tk .ic{width:18px;height:18px;color:#46505e;--ic-bg:#f4f6f9}
  .ac-rtip .tf{color:#7a8594;font-size:11px;margin-top:4px}
  .ac-qat .ic{width:18px;height:18px}
  /* màu biểu tượng */
  .ic{--ia:#4ba7ff;--ir:#ff5f57;--iy:#f6c445;--ig:#5fd07a;--ic-bg:#3b4452}
  .ac-pop .ic,.mb-grid .ic,.dvd-dlg .ic,.lm-bar .ic,.lm-tbl .ic{--ic-bg:#2b313b}
  .ic .a{stroke:var(--ia)} .ic .r{stroke:var(--ir)} .ic .y{stroke:var(--iy)} .ic .g{stroke:var(--ig)} .ic .w{stroke:currentColor}
  .ic .p{fill:var(--ia);stroke:none} .ic .pd{fill:currentColor;stroke:none} .ic .pa{fill:var(--ia);stroke:none} .ic .py{fill:var(--iy);stroke:none} .ic .pg{fill:var(--ig);stroke:none}
  .ic .fa{fill:var(--ia);fill-opacity:.28;stroke:none} .ic .fa2{fill:var(--ia);stroke:none} .ic .fa3{fill:var(--ia);fill-opacity:.45;stroke:none}
  .ic .fy{fill:var(--iy);stroke:none} .ic .fy2{fill:#ffd977;stroke:currentColor;stroke-width:1} .ic .fr{fill:var(--ir);fill-opacity:.85;stroke:none} .ic .fr2{fill:var(--ir);fill-opacity:.32;stroke:none} .ic .fg2{fill:var(--ig);fill-opacity:.45;stroke:none}
  .ic .fd{fill:#dfe6ef;fill-opacity:.16} .ic .fbg{fill:var(--ic-bg);stroke:none} .ic .fz{fill:#7d8796;stroke:none} .ic .fk{fill:#1d232b;stroke:#17324f;stroke-width:.6}
  .ic .fl0{fill:#7d8796;stroke:#1d232b;stroke-width:.8} .ic .fl1{fill:#f6c445;stroke:#1d232b;stroke-width:.8} .ic .fl2{fill:#4ba7ff;stroke:#1d232b;stroke-width:.8} .ic .fl3{fill:#5fd07a;stroke:#1d232b;stroke-width:.8}
  .ic .f1{fill:#a8d4ff;stroke:#17324f;stroke-width:.8} .ic .f2{fill:#4b93dc;stroke:#17324f;stroke-width:.8} .ic .f3{fill:#2b62a0;stroke:#17324f;stroke-width:.8} .ic .f2n{fill:#4b93dc;stroke:none} .ic .f2s{fill:#4b93dc;fill-opacity:.35}
  .ac-rtip .ic .fd{fill:#dfe6ef;fill-opacity:1}
`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ---------------- RIBBON (bố cục theo AutoCAD) ----------------
     Mỗi nút: lệnh, nhãn tiếng Anh (như AutoCAD), nhãn tiếng Việt. Nút tách (split) nhớ lựa chọn cuối như AutoCAD.
     Bảng có `more` = phần mở rộng (bấm tên bảng ▾). Hai không gian làm việc: Drafting & Annotation, 3D Modeling. */
  const big = (cmd, en, vi, o) => Object.assign({ t: 'big', cmd, en, vi }, o || {});
  const sm = (cmd, en, vi, o) => Object.assign({ t: 'sm', cmd, en, vi }, o || {});
  const ic = (cmd, en, vi, o) => Object.assign({ t: 'ic', cmd, en, vi }, o || {});
  const col = (...items) => ({ t: 'col', items });
  const ctl = (kind) => ({ t: 'ctl', kind });
  const S = o => Object.assign({ split: true }, o);
  const M_CIRCLE = [['CIRCLE', 'Center, Radius', 'Tâm, bán kính'], ['CIRCLE|2P', '2-Point', '2 điểm'], ['CIRCLE|3P', '3-Point', '3 điểm'], ['CIRCLE|TTR', 'Tan, Tan, Radius', 'Tiếp, tiếp, bán kính'], ['CIRCLE|TTT', 'Tan, Tan, Tan', 'Tiếp xúc 3 đối tượng']];
  const M_ARC = [['ARC', '3-Point', '3 điểm'], ['ARC|C', 'Center, Start, End', 'Tâm, đầu, cuối']];
  const M_RECT = [['RECTANG', 'Rectangle', 'Chữ nhật'], ['POLYGON', 'Polygon', 'Đa giác đều']];
  const M_ELL = [['ELLIPSE', 'Axis, End', 'Elip theo trục'], ['ELLIPSE|C', 'Center', 'Elip theo tâm']];
  const M_HATCH = [['HATCH', 'Hatch', 'Tô vật liệu'], ['BOUNDARY', 'Boundary', 'Tạo đường biên'], ['GRADIENT', 'Gradient', 'Tô chuyển màu'], ['HATCHEDIT', 'Edit Hatch', 'Sửa hatch'], ['HATCHASSOC', 'Hatch Associativity', 'Liên kết đường biên'], ['HATCHSET', 'Hatch Settings', 'Mẫu & tỉ lệ hatch']];
  const M_TRIM = [['TRIM', 'Trim', 'Cắt'], ['EXTEND', 'Extend', 'Kéo dài']];
  const M_FIL = [['FILLET', 'Fillet', 'Bo góc'], ['CHAMFER', 'Chamfer', 'Vát góc'], ['BLEND', 'Blend Curves', 'Nối cong trơn']];
  const M_ARR = [['ARRAYRECT', 'Rectangular Array', 'Mảng chữ nhật'], ['ARRAYPATH', 'Path Array', 'Mảng theo đường'], ['ARRAYPOLAR', 'Polar Array', 'Mảng tròn']];
  const M_DO = [['DRAWORDER|F', 'Bring to Front', 'Đưa lên trên cùng'], ['DRAWORDER|B', 'Send to Back', 'Đưa xuống dưới cùng'], ['DRAWORDER|A', 'Bring Above Objects', 'Đưa lên trên đối tượng'], ['DRAWORDER|U', 'Send Under Objects', 'Đưa xuống dưới đối tượng'], ['TEXTTOFRONT', 'Bring Text and Dimensions to Front', 'Đưa chữ, kích thước lên trên'], ['HATCHTOBACK', 'Send Hatches to Back', 'Đưa hatch xuống dưới']];
  const M_TEXT = [['MTEXT', 'Multiline Text', 'Chữ nhiều dòng'], ['TEXT', 'Single Line', 'Chữ một dòng']];
  const M_DIM = [['DIMLINEAR', 'Linear', 'Ngang / dọc'], ['DIMALIGNED', 'Aligned', 'Chéo'], ['DIMANGULAR', 'Angular', 'Góc'], ['DIMARC', 'Arc Length', 'Dài cung'], ['DIMRADIUS', 'Radius', 'Bán kính'], ['DIMDIAMETER', 'Diameter', 'Đường kính'], ['DIMORDINATE', 'Ordinate', 'Toạ độ']];
  const M_LEAD = [['MLEADER', 'Multileader', 'Ghi chú dẫn'], ['QLEADER', 'Leader', 'Dẫn nhiều đoạn']];
  const M_CONT = [['DIMCONTINUE', 'Continue', 'Nối tiếp'], ['DIMBASELINE', 'Baseline', 'Cùng gốc']];
  const M_MEA = [['MEASUREGEOM', 'Quick', 'Đo nhanh'], ['DIST', 'Distance', 'Khoảng cách'], ['AREA', 'Area', 'Diện tích'], ['ID', 'ID Point', 'Toạ độ điểm'], ['LIST', 'List', 'Liệt kê']];
  const M_PASTE = [['PASTECLIP', 'Paste', 'Dán'], ['PASTEORIG', 'Paste to Original Coordinates', 'Dán đúng toạ độ']];
  const M_ZOOM = [['ZE', 'Extents', 'Vừa bản vẽ'], ['ZW', 'Window', 'Theo khung'], ['ZP', 'Previous', 'Khung trước'], ['ZIN', 'In', 'Phóng to'], ['ZOUT', 'Out', 'Thu nhỏ']];
  const M_PRIM = [['BOX', 'Box', 'Hộp'], ['CYLINDER', 'Cylinder', 'Trụ'], ['CONE', 'Cone', 'Nón'], ['SPHERE', 'Sphere', 'Cầu'], ['PYRAMID', 'Pyramid', 'Chóp'], ['WEDGE', 'Wedge', 'Nêm'], ['TORUS', 'Torus', 'Xuyến']];
  const M_EXT = [['EXTRUDE', 'Extrude', 'Đùn'], ['REVOLVE', 'Revolve', 'Xoay tròn'], ['SWEEP', 'Sweep', 'Quét'], ['LOFT', 'Loft', 'Chuyển tiếp']];
  const M_BOOL = [['UNION', 'Union', 'Cộng khối'], ['SUBTRACT', 'Subtract', 'Trừ khối'], ['INTERSECT', 'Intersect', 'Giao khối']];
  const M_LDC = [['DCHORIZONTAL', 'Horizontal', 'Ngang'], ['DCVERTICAL', 'Vertical', 'Dọc']];
  const M_REV = [['REVCLOUD', 'Revision Cloud', 'Khoanh mây'], ['WIPEOUT', 'Wipeout', 'Vùng che']];
  const LAYMORE = [sm('LAYOFF', 'Off', 'Tắt lớp'), sm('LAYFRZ', 'Freeze', 'Đóng băng lớp'), sm('LAYLCK', 'Lock', 'Khoá lớp'), sm('LAYULK', 'Unlock', 'Mở khoá lớp'), sm('LAYON', 'Turn All Layers On', 'Bật tất cả lớp'), sm('LAYTHW', 'Thaw All Layers', 'Rã băng tất cả'), sm('LAYMCUR', 'Make Current', 'Đặt làm hiện hành'), sm('LAYISO', 'Isolate', 'Cô lập lớp'), sm('LAYUNISO', 'Unisolate', 'Bỏ cô lập'), sm('LAYMRG', 'Merge', 'Gộp lớp'), sm('LAYDEL', 'Delete', 'Xoá lớp'), sm('SETBYLAYER', 'Set to ByLayer', 'Về ByLayer'), sm('LAYCUR', 'Change to Current Layer', 'Đổi sang lớp hiện hành'), sm('LAYMCH', 'Match Layer', 'Chuyển theo lớp đích'), sm('COPYTOLAYER', 'Copy Objects to New Layer', 'Sao chép sang lớp khác'), sm('LAYWALK', 'Layer Walk', 'Duyệt lớp'), sm('LAYERP', 'Previous', 'Thiết lập lớp trước'), sm('LAYERSTATE', 'Layer States', 'Trạng thái lớp')];
  const P_LAYERS = { id: 'layers', en: 'Layers', vi: 'Lớp', pri: 6, items: [big('LAYER', 'Layer\nProperties', 'Quản lý\nlớp'), ctl('layer')], more: LAYMORE };
  const P_PROPS = { id: 'props', en: 'Properties', vi: 'Thuộc tính', pri: 4, items: [big('MATCHPROP', 'Match\nProperties', 'Sao\nthuộc tính'), ctl('props3')], more: [sm('PROPERTIES', 'Properties Palette', 'Bảng thuộc tính'), sm('LIST', 'List', 'Liệt kê'), sm('LINETYPE', 'Linetype Manager', 'Quản lý kiểu nét'), sm('LWEIGHT', 'Lineweight Settings', 'Cài đặt bề rộng nét'), sm('LTSCALE', 'Linetype Scale', 'Tỉ lệ kiểu nét')] };
  const RIB = {
    home: { en: 'Home', vi: 'Trang chủ', panels: [
      { id: 'draw', en: 'Draw', vi: 'Vẽ', pri: 0, items: [big('LINE', 'Line', 'Đường\nthẳng'), big('PLINE', 'Polyline', 'Đa\ntuyến'), big('CIRCLE', 'Circle', 'Đường\ntròn', S({ menu: M_CIRCLE, keep: 1 })), big('ARC', 'Arc', 'Cung\ntròn', S({ menu: M_ARC, keep: 1 })),
        col(ic('RECTANG', 'Rectangle', 'Chữ nhật', S({ menu: M_RECT })), ic('ELLIPSE', 'Ellipse', 'Elip', S({ menu: M_ELL })), ic('HATCH', 'Hatch', 'Tô hatch', S({ menu: M_HATCH }))), col(ic('SPLINE', 'Spline Fit', 'Spline'), ic('XLINE', 'Construction Line', 'Đường dựng'), ic('POINT', 'Multiple Points', 'Nhiều điểm'))],
        more: [sm('SPLINE', 'Spline Fit', 'Đường cong spline'), sm('XLINE', 'Construction Line', 'Đường dựng'), sm('RAY', 'Ray', 'Tia'), sm('POINT', 'Multiple Points', 'Nhiều điểm'), sm('DIVIDE', 'Divide', 'Chia đều'), sm('MEASURE', 'Measure', 'Chia theo khoảng'), sm('BOUNDARY', 'Boundary', 'Tạo đường biên'), sm('REGION', 'Region', 'Tạo vùng 2D'), sm('WIPEOUT', 'Wipeout', 'Vùng che'), sm('REVCLOUD', 'Revision Cloud', 'Khoanh mây'), sm('DONUT', 'Donut', 'Vành khuyên'), sm('MLINE', 'Multiline', 'Đường đôi'), sm('POLYGON', 'Polygon', 'Đa giác đều'), sm('SOLID', '2D Solid', 'Tô đặc 2D'), sm('SKETCH', 'Sketch', 'Vẽ phác tay'), sm('HELIX', 'Helix', 'Xoắn ốc'), sm('BREAKLINE', 'Break-line Symbol', 'Đường cắt ngắn'), sm('GRADIENT', 'Gradient', 'Tô chuyển màu'), sm('ISOCIRCLE', 'Isocircle', 'Vòng tròn trục đo'), sm('PTYPE', 'Point Style', 'Kiểu điểm')] },
      { id: 'modify', en: 'Modify', vi: 'Sửa', pri: 0, items: [col(sm('MOVE', 'Move', 'Di chuyển'), sm('COPY', 'Copy', 'Sao chép'), sm('STRETCH', 'Stretch', 'Kéo giãn')), col(sm('ROTATE', 'Rotate', 'Xoay'), sm('MIRROR', 'Mirror', 'Đối xứng'), sm('SCALE', 'Scale', 'Tỉ lệ')),
        col(sm('TRIM', 'Trim', 'Cắt', S({ menu: M_TRIM })), sm('FILLET', 'Fillet', 'Bo góc', S({ menu: M_FIL })), sm('ARRAYRECT', 'Array', 'Mảng', S({ menu: M_ARR }))),
        col(ic('ERASE', 'Erase', 'Xoá'), ic('EXPLODE', 'Explode', 'Phá khối'), ic('OFFSET', 'Offset', 'Song song')), col(ic('DRAWORDER|F', 'Draworder', 'Thứ tự vẽ', S({ menu: M_DO })), ic('BREAKATPOINT', 'Break at Point', 'Tách tại điểm'), ic('JOIN', 'Join', 'Nối'))],
        more: [sm('BREAK', 'Break', 'Bẻ gãy'), sm('BREAKATPOINT', 'Break at Point', 'Tách tại điểm'), sm('JOIN', 'Join', 'Nối'), sm('CHAMFER', 'Chamfer', 'Vát góc'), sm('BLEND', 'Blend Curves', 'Nối cong trơn'), sm('LENGTHEN', 'Lengthen', 'Đổi chiều dài'), sm('PEDIT', 'Edit Polyline', 'Sửa đa tuyến'), sm('REVERSE', 'Reverse', 'Đảo chiều'), sm('SETBYLAYER', 'Set to ByLayer', 'Về ByLayer'), sm('ALIGN', 'Align', 'Căn chỉnh'), sm('OVERKILL', 'Delete Duplicate Objects', 'Xoá nét trùng'), sm('DRAWORDER|F', 'Draworder', 'Thứ tự vẽ', { menu: M_DO }), sm('EXTRIM', 'Extended Trim', 'Cắt theo đường kín'), sm('COPYM', 'Multiple Copy', 'Sao chép nhiều'), sm('SPLINEDIT', 'Edit Spline', 'Sửa spline'), sm('HATCHEDIT', 'Edit Hatch', 'Sửa hatch'), sm('CHPROP', 'Change Properties', 'Đổi thuộc tính'), sm('FLATTEN', 'Flatten', 'Làm phẳng'), sm('ARRAYEDIT', 'Edit Array', 'Sửa mảng'), sm('XCLIP', 'Clip Block / Xref', 'Cắt khối / XREF'), sm('GROUPEDIT', 'Group Edit', 'Sửa nhóm'), sm('UNION', 'Union (Region)', 'Cộng vùng'), sm('SUBTRACT', 'Subtract (Region)', 'Trừ vùng'), sm('INTERSECT', 'Intersect (Region)', 'Giao vùng')] },
      { id: 'annot', en: 'Annotation', vi: 'Chú thích', pri: 7, items: [big('MTEXT', 'Text', 'Chữ', S({ menu: M_TEXT })), big('DIMLINEAR', 'Dimension', 'Kích\nthước', S({ menu: M_DIM })),
        col(sm('MLEADER', 'Leader', 'Ghi chú dẫn', S({ menu: M_LEAD })), sm('TABLE', 'Table', 'Bảng'), sm('DIMSTYLE', 'Dimension Style', 'Kiểu kích thước'))],
        more: [sm('STYLE', 'Text Style', 'Kiểu chữ'), sm('QDIM', 'Quick Dimension', 'Kích thước nhanh'), sm('DIMCONTINUE', 'Continue', 'Nối tiếp'), sm('DIMBASELINE', 'Baseline', 'Cùng gốc'), sm('CENTERMARK', 'Center Mark', 'Dấu tâm'), sm('CENTERLINE', 'Centerline', 'Đường tâm'), sm('ANNOTATIVE', 'Annotative', 'Chú thích theo tỉ lệ'), sm('DIMJOGGED', 'Jogged', 'Bán kính gấp khúc'), sm('TOLERANCE', 'Tolerance', 'Dung sai hình học'), sm('FIELD', 'Field', 'Trường tự cập nhật')] },
      P_LAYERS,
      { id: 'block', en: 'Block', vi: 'Khối', pri: 8, items: [big('INSERT', 'Insert', 'Chèn\nkhối'), col(sm('BLOCK', 'Create', 'Tạo khối'), sm('REFEDIT', 'Edit', 'Sửa khối'), sm('EATTEDIT', 'Edit Attributes', 'Sửa thuộc tính'))],
        more: [sm('ATTDEF', 'Define Attributes', 'Định nghĩa thuộc tính'), sm('BLOCKLIB', 'Blocks Library', 'Thư viện khối'), sm('BPARAMETER', 'Block Parameters', 'Tham số khối động'), sm('BDYN', 'Dynamic State', 'Trạng thái khối động'), sm('WBLOCK', 'Write Block', 'Ghi khối ra file'), sm('RENAME', 'Rename', 'Đổi tên')] },
      P_PROPS,
      { id: 'groups', en: 'Groups', vi: 'Nhóm', pri: 9, items: [big('GROUP', 'Group', 'Nhóm'), col(sm('UNGROUP', 'Ungroup', 'Bỏ nhóm'), sm('PICKSTYLE', 'Group Selection', 'Chọn cả nhóm'))] },
      { id: 'util', en: 'Utilities', vi: 'Tiện ích', pri: 9, items: [big('MEASUREGEOM', 'Measure', 'Đo', S({ menu: M_MEA })), col(sm('QSELECT', 'Quick Select', 'Chọn nhanh'), sm('SELECTALL', 'Select All', 'Chọn tất cả'), sm('COUNT', 'Count', 'Đếm khối'))],
        more: [sm('ID', 'ID Point', 'Toạ độ điểm'), sm('LIST', 'List', 'Liệt kê'), sm('SELECTSIMILAR', 'Select Similar', 'Chọn tương tự'), sm('CAL', 'QuickCalc', 'Máy tính')] },
      { id: 'clip', en: 'Clipboard', vi: 'Bộ nhớ tạm', pri: 10, items: [big('PASTECLIP', 'Paste', 'Dán', S({ menu: M_PASTE })), col(sm('CUTCLIP', 'Cut', 'Cắt'), sm('COPYCLIP', 'Copy Clip', 'Sao chép'), sm('COPYBASE', 'Copy with Base Point', 'Sao chép kèm gốc'))] }
    ] },
    insert: { en: 'Insert', vi: 'Chèn', panels: [
      { id: 'iblock', en: 'Block', vi: 'Khối', items: [big('INSERT', 'Insert', 'Chèn\nkhối'), big('EATTEDIT', 'Edit\nAttribute', 'Sửa\nthuộc tính'), col(sm('BLOCKLIB', 'Blocks Library', 'Thư viện khối'), sm('GROUP', 'Group', 'Nhóm'), sm('UNGROUP', 'Ungroup', 'Bỏ nhóm'))] },
      { id: 'bdef', en: 'Block Definition', vi: 'Định nghĩa khối', items: [big('BLOCK', 'Create\nBlock', 'Tạo\nkhối'), big('WBLOCK', 'Write\nBlock', 'Ghi khối\nra file'), col(sm('ATTDEF', 'Define Attributes', 'Định nghĩa thuộc tính'), sm('REFEDIT', 'Block Editor', 'Sửa khối'), sm('ATTEXPORT', 'Extract Attributes', 'Xuất thuộc tính'))] },
      { id: 'bdyn', en: 'Dynamic Block', vi: 'Khối động', items: [big('BPARAMETER', 'Block\nParameters', 'Tham số\nđộng'), col(sm('BDYN', 'Dynamic State', 'Đổi trạng thái'), sm('REFCLOSE', 'Close Block Editor', 'Đóng sửa khối'))] },
      { id: 'imp', en: 'Import', vi: 'Nhập', items: [big('PDFIMPORT', 'PDF\nImport', 'Nhập\nPDF'), col(sm('ADCENTER', 'DesignCenter', 'Lấy từ bản vẽ khác'), sm('SYMBOL', 'Symbols', 'Ký hiệu kiến trúc'))] },
      { id: 'ref', en: 'Reference', vi: 'Tham chiếu', items: [big('XATTACH', 'Attach', 'Gắn\nXREF'), col(sm('IMAGEATTACH', 'Attach Image', 'Gắn ảnh nền'), sm('IMAGEADJUST', 'Adjust', 'Chỉnh ảnh'), sm('XREF', 'External References', 'Quản lý XREF')), col(sm('XCLIP', 'Clip', 'Cắt hiển thị'), sm('IMAGECLIP', 'Clip Image', 'Cắt ảnh'), sm('HYPERLINK', 'Hyperlink', 'Liên kết'))] },
      { id: 'data', en: 'Linking & Extraction', vi: 'Dữ liệu', items: [big('ATTEXPORT', 'Extract\nData', 'Trích\ndữ liệu'), big('TABLE', 'Table', 'Bảng'), big('DATALINK', 'Link\nData', 'Liên kết\nExcel'), big('FIELD', 'Field', 'Trường'), col(sm('DATALINKURL', 'Link from URL', 'Liên kết Google Sheets'), sm('DATALINKUPDATE', 'Download from Source', 'Cập nhật từ Excel')), col(sm('TABLEEXPORT', 'Export Table', 'Xuất bảng'), sm('UPDATEFIELD', 'Update Fields', 'Cập nhật trường'))] }
    ] },
    annotate: { en: 'Annotate', vi: 'Chú thích', panels: [
      { id: 'text', en: 'Text', vi: 'Chữ', pri: 1, items: [big('MTEXT', 'Multiline\nText', 'Chữ\nnhiều dòng', S({ menu: M_TEXT })), col(sm('FINDREPLACE', 'Find & Replace', 'Tìm & thay'), sm('SPELL', 'Check Spelling', 'Chính tả'), sm('STYLE', 'Text Style', 'Kiểu chữ')), col(sm('TEXTALIGN', 'Text Align', 'Căn thẳng chữ'), sm('FIELD', 'Field', 'Trường'), sm('UPDATEFIELD', 'Update Fields', 'Cập nhật trường'))],
        more: [sm('SCALETEXT', 'Scale Text', 'Đổi cỡ chữ'), sm('JUSTIFYTEXT', 'Justify Text', 'Canh lề chữ'), sm('TXT2MTXT', 'Convert to MText', 'Gộp thành chữ nhiều dòng'), sm('TCOUNT', 'Auto Number', 'Đánh số chữ'), sm('TEXTMASK', 'Text Mask', 'Che nền chữ'), sm('ARCTEXT', 'Arc Aligned Text', 'Chữ theo cung'), sm('FIND', 'Find Text', 'Tìm chữ'), sm('SPELL', 'Check Spelling', 'Kiểm tra chính tả'), sm('SPELLBROWSER', 'Spelling (Browser)', 'Chính tả trình duyệt')] },
      { id: 'dims', en: 'Dimensions', vi: 'Kích thước', pri: 0, items: [big('DIMLINEAR', 'Dimension', 'Kích\nthước', S({ menu: M_DIM })), col(sm('QDIM', 'Quick', 'Nhanh'), sm('DIMCONTINUE', 'Continue', 'Nối tiếp', S({ menu: M_CONT })), sm('DIMORDINATE', 'Ordinate', 'Toạ độ')), col(ic('DIMSPACE', 'Adjust Space', 'Giãn đều kích thước'), ic('DIMTEDIT', 'Text Position', 'Dời chữ kích thước'), ic('DIMEDIT', 'Dimension Edit', 'Sửa kích thước')), col(ic('DIMJOGGED', 'Jogged', 'Bán kính gấp khúc'), ic('TOLERANCE', 'Tolerance', 'Dung sai hình học'), ic('DIMBREAK', 'Dimension Break', 'Ngắt kích thước')), big('DIMSTYLE', 'Dimension\nStyle', 'Kiểu\nkích thước')],
        more: [sm('DIMALIGNED', 'Aligned', 'Chéo'), sm('DIMANGULAR', 'Angular', 'Góc'), sm('DIMARC', 'Arc Length', 'Dài cung'), sm('DIMRADIUS', 'Radius', 'Bán kính'), sm('DIMDIAMETER', 'Diameter', 'Đường kính')] },
      { id: 'cl', en: 'Centerlines', vi: 'Đường tâm', pri: 5, items: [big('CENTERMARK', 'Center\nMark', 'Dấu\ntâm'), big('CENTERLINE', 'Centerline', 'Đường\ntâm')] },
      { id: 'lead', en: 'Leaders', vi: 'Ghi chú dẫn', pri: 4, items: [big('MLEADER', 'Multileader', 'Ghi chú\ndẫn'), col(sm('QLEADER', 'Leader', 'Dẫn nhiều đoạn'), sm('MLEADERSTYLE', 'Multileader Style', 'Kiểu ghi chú dẫn'))] },
      { id: 'tables', en: 'Tables', vi: 'Bảng', pri: 6, items: [big('TABLE', 'Table', 'Bảng'), col(sm('TABLEDIT', 'Edit Table', 'Sửa bảng'), sm('DATALINK', 'Link Data', 'Liên kết Excel'), sm('TABLEEXPORT', 'Export', 'Xuất CSV / Excel'))] },
      { id: 'markup', en: 'Markup', vi: 'Đánh dấu', pri: 7, items: [big('REVCLOUD', 'Revision\nCloud', 'Khoanh\nmây', S({ menu: M_REV })), col(sm('WIPEOUT', 'Wipeout', 'Vùng che'), sm('NOTE', 'Markup Note', 'Ghi chú markup'), sm('DO', 'Quick Measure', 'Đo đánh dấu'))] },
      { id: 'ascale', en: 'Annotation Scaling', vi: 'Tỉ lệ chú thích', pri: 3, items: [big('CANNOSCALE', 'Annotation\nScale', 'Tỉ lệ\nchú thích'), col(sm('ANNOTATIVE', 'Annotative', 'Gán theo tỉ lệ'))] },
      { id: 'ahatch', en: 'Hatch', vi: 'Hatch', pri: 8, items: [big('HATCH', 'Hatch', 'Tô\nhatch', S({ menu: M_HATCH })), col(sm('HATCHTOBACK', 'Send to Back', 'Xuống dưới'))] }
    ] },
    param: { en: 'Parametric', vi: 'Tham số', panels: [
      { id: 'geo', en: 'Geometric', vi: 'Hình học', pri: 0, items: [big('AUTOCONSTRAIN', 'Auto\nConstrain', 'Tự\nràng buộc'),
        col(ic('GCCOINCIDENT', 'Coincident', 'Trùng điểm'), ic('GCPARALLEL', 'Parallel', 'Song song'), ic('GCTANGENT', 'Tangent', 'Tiếp xúc')), col(ic('GCCOLLINEAR', 'Collinear', 'Thẳng hàng'), ic('GCPERPENDICULAR', 'Perpendicular', 'Vuông góc'), ic('GCEQUAL', 'Equal', 'Bằng nhau')),
        col(ic('GCCONCENTRIC', 'Concentric', 'Đồng tâm'), ic('GCHORIZONTAL', 'Horizontal', 'Ngang')), col(ic('GCFIX', 'Fix', 'Cố định'), ic('GCVERTICAL', 'Vertical', 'Dọc')), col(sm('CONSTRAINTBAR', 'Show/Hide', 'Hiện/ẩn ký hiệu'))] },
      { id: 'dimc', en: 'Dimensional', vi: 'Kích thước', pri: 1, items: [big('DCHORIZONTAL', 'Linear', 'Ngang/dọc', S({ menu: M_LDC })), big('DCALIGNED', 'Aligned', 'Thẳng'), col(sm('DCRADIUS', 'Radius', 'Bán kính'), sm('DCDIAMETER', 'Diameter', 'Đường kính'), sm('DCANGULAR', 'Angular', 'Góc'))] },
      { id: 'cman', en: 'Manage', vi: 'Quản lý', pri: 2, items: [big('DELCONSTRAINT', 'Delete\nConstraints', 'Xoá\nràng buộc'), big('PARAMETERS', 'Parameters\nManager', 'Bảng\ntham số')] }
    ] },
    view: { en: 'View', vi: 'Hiển thị', panels: [
      { id: 'nav', en: 'Navigate 2D', vi: 'Điều hướng', pri: 0, items: [big('PAN', 'Pan', 'Kéo\nmàn hình'), big('ZE', 'Extents', 'Vừa\nbản vẽ', S({ menu: M_ZOOM })), col(sm('ROTVIEW', 'Rotate View 90°', 'Xoay 90°'), sm('ROTRESET', 'Reset Rotation', 'Về hướng gốc'), sm('BOOKMARK', 'Bookmarks', 'Vị trí đã lưu'))] },
      { id: 'mvp', en: 'Model Viewports', vi: 'Khung nhìn Model', pri: 2, items: [big('VPORTS', 'Viewport\nConfiguration', 'Chia\nkhung nhìn', { menu: [['VPORTS|1', 'Single', 'Một'], ['VPORTS|2V', 'Two: Vertical', 'Hai dọc'], ['VPORTS|2H', 'Two: Horizontal', 'Hai ngang'], ['VPORTS|3R', 'Three: Right', 'Ba (lớn bên phải)'], ['VPORTS|3L', 'Three: Left', 'Ba (lớn bên trái)'], ['VPORTS|4', 'Four: Equal', 'Bốn']] })] },
      { id: 'named', en: 'Named Views', vi: 'Góc nhìn', pri: 4, items: [big('VIEW', 'View\nManager', 'Góc nhìn\nđặt tên'), col(sm('PLAN', 'Plan View', 'Về mặt bằng'), sm('ISODRAFT', 'Isodraft', 'Vẽ trục đo'), sm('REGENALL', 'Regen All', 'Vẽ lại'))] },
      { id: 'disp', en: 'Visual', vi: 'Hiển thị', pri: 3, items: [col(sm('TGRID', 'Grid', 'Lưới', { icon: 'GRID', tog: 'grid' }), sm('TLWT', 'Lineweight', 'Bề rộng nét', { icon: 'LWT' }), sm('TBG', 'Background', 'Nền tối/trắng', { icon: 'BG' })), col(sm('LINETYPE', 'Linetypes', 'Kiểu nét'), sm('LTSCALE', 'Linetype Scale', 'Tỉ lệ nét'), sm('LWEIGHT', 'Lineweight Settings', 'Bề rộng nét…')), big('DISPLAY', 'Display\nOptions', 'Tuỳ chọn\nhiển thị')] },
      { id: 'iso', en: 'Isolate', vi: 'Cô lập', pri: 5, items: [big('ISOLATEOBJECTS', 'Isolate\nObjects', 'Cô lập\nđối tượng'), col(sm('HIDEOBJECTS', 'Hide Objects', 'Ẩn đối tượng'), sm('UNISOLATEOBJECTS', 'End Isolation', 'Hiện lại tất cả'))] },
      { id: 'pal', en: 'Palettes', vi: 'Bảng', pri: 6, items: [big('TOOLPALETTES', 'Tool\nPalettes', 'Bảng\ncông cụ'), big('PROPERTIES', 'Properties', 'Thuộc\ntính'), col(sm('LAYER', 'Layer Properties', 'Quản lý lớp'), sm('ADCENTER', 'DesignCenter', 'DesignCenter'), sm('CMDLINE', 'Command Line', 'Dòng lệnh')), col(sm('HISTORY', 'Command History', 'Lịch sử lệnh'))] },
      { id: 'lay', en: 'Layout Viewports', vi: 'Layout', pri: 7, items: [big('LAYOUT', 'New\nLayout', 'Layout\nmới'), col(sm('MVIEW', 'Rectangular', 'Khung nhìn'), sm('VPEDIT', 'Viewport Scale', 'Tỉ lệ khung nhìn'), sm('LAYOUTS', 'Layout List', 'Danh sách layout'))] },
      { id: 'ui', en: 'Interface', vi: 'Giao diện', pri: 8, items: [big('CLEAN', 'Clean\nScreen', 'Toàn\nmàn hình'), big('WSPACE', 'Workspace', 'Không gian\nlàm việc', { icon: 'SETTINGS' })] }
    ] },
    manage: { en: 'Manage', vi: 'Quản lý', panels: [
      { id: 'draft', en: 'Drafting', vi: 'Trợ giúp vẽ', items: [big('DSETTINGS', 'Drafting\nSettings', 'Cài đặt\nbắt điểm'), big('SETVAR', 'System\nVariables', 'Biến\nhệ thống'), col(sm('TOSNAP', 'Object Snap', 'Bắt điểm', { tog: 'osnap' }), sm('TORTHO', 'Ortho Mode', 'Vuông góc', { tog: 'ortho' }), sm('TPOLAR', 'Polar Tracking', 'Góc cực', { tog: 'polar' })), col(sm('SNAPANG', 'Snap Angle', 'Xoay lưới / ortho'), sm('SNAP', 'Snap', 'Bước nhảy'), sm('GRID', 'Grid', 'Lưới'))] },
      { id: 'units', en: 'Units', vi: 'Đơn vị', items: [big('UNITS', 'Units', 'Đơn vị'), col(sm('CALIB', 'Calibrate Scale', 'Tỉ lệ đo'), sm('CAL', 'QuickCalc', 'Máy tính'))] },
      { id: 'clean', en: 'Cleanup', vi: 'Dọn dẹp', items: [big('PURGE', 'Purge', 'Dọn\nlớp trống'), big('OVERKILL', 'Overkill', 'Xoá\nnét trùng'), big('AUDIT', 'Audit', 'Kiểm tra\nlỗi'), col(sm('LAYMRG', 'Layer Merge', 'Gộp lớp'), sm('LAYDEL', 'Layer Delete', 'Xoá lớp'), sm('SETBYLAYER', 'Set to ByLayer', 'Về ByLayer'))] },
      { id: 'mutil', en: 'Utilities', vi: 'Tiện ích', items: [big('COUNT', 'Count', 'Đếm\nkhối'), big('QSELECT', 'Quick\nSelect', 'Chọn\nnhanh'), col(sm('DBLIST', 'List Database', 'Liệt kê bản vẽ'), sm('JPGOUT', 'Export JPG', 'Xuất ảnh JPG'), sm('COPYHIST', 'Copy History', 'Chép lịch sử lệnh'))] },
      { id: 'apps', en: 'Applications', vi: 'Ứng dụng', items: [big('SCRIPT', 'Run\nScript', 'Chạy\nscript'), col(sm('ALIASEDIT', 'Edit Aliases', 'Lệnh tắt (PGP)'), sm('CAL', 'QuickCalc', 'Máy tính'))] },
      { id: 'dwg', en: 'Drawing', vi: 'Bản vẽ', items: [big('DWGPROPS', 'Drawing\nProperties', 'Thông tin\nbản vẽ'), col(sm('RENAME', 'Rename', 'Đổi tên'), sm('TIME', 'Time', 'Thời gian'), sm('STATUS', 'Status', 'Trạng thái')), col(sm('OPTIONS', 'Options', 'Tuỳ chọn'), sm('PTYPE', 'Point Style', 'Kiểu điểm'), sm('LAYERSTATE', 'Layer States', 'Trạng thái lớp'))] },
      { id: 'help', en: 'Help', vi: 'Trợ giúp', items: [big('HELP', 'Command\nList', 'Danh sách\nlệnh')] }
    ] },
    output: { en: 'Output', vi: 'Xuất', panels: [
      { id: 'plot', en: 'Plot', vi: 'In', items: [big('PLOT', 'Plot', 'In bản vẽ'), big('PUBLISH', 'Batch\nPlot', 'In\nhàng loạt'), col(sm('LAYOUTS', 'Page Setup', 'Layout & khổ giấy'), sm('STYLESMANAGER', 'Plot Style Manager', 'Kiểu in .ctb'), sm('EXPORT', 'Export Image', 'Xuất ảnh / PDF'))] },
      { id: 'exp', en: 'Export', vi: 'Xuất file', items: [big('EXPORT', 'Export\nPDF', 'Xuất\nPDF'), big('SAVEDWG', 'Save\nDWG', 'Lưu\nDWG'), col(sm('DXFOUT', 'Export DXF', 'Xuất DXF'), sm('SAVEAS', 'Save As DXF', 'Lưu thành DXF'), sm('DWGSERVER', 'DWG Server', 'Máy chủ DWG')), col(sm('DXFVERSION', 'DXF Version', 'Phiên bản DXF'))] },
      { id: 'exp3', en: '3D Print', vi: 'Xuất 3D', items: [col(sm('EXPORTSTL', 'Export STL', 'Xuất STL'), sm('EXPORTOBJ', 'Export OBJ', 'Xuất OBJ'))] }
    ] },
    collab: { en: 'Collaborate', vi: 'Cộng tác', panels: [
      { id: 'share', en: 'Share', vi: 'Chia sẻ', items: [big('SHARE', 'Share\nDrawing', 'Chia sẻ\nlink'), big('COLLAB', 'Co-Edit', 'Cùng\nsửa'), col(sm('SYNC', 'Sync Now', 'Đồng bộ ngay'), sm('DSET', 'Google Settings', 'Cài đặt Google'))] },
      { id: 'gdrive', en: 'Google Drive', vi: 'Google Drive', items: [big('DRIVE', 'Drive', 'Drive'), col(sm('DOPEN', 'Open from Drive', 'Mở từ Drive'), sm('DUP', 'Upload Drawing', 'Tải bản vẽ lên'), sm('DSAVE', 'Save DXF to Drive', 'Lưu DXF lên Drive'))] },
      { id: 'cmp', en: 'Compare', vi: 'So sánh', items: [big('COMPARE', 'DWG\nCompare', 'So sánh\nbản vẽ')] },
      { id: 'cmark', en: 'Markup', vi: 'Đánh dấu', items: [col(sm('NOTE', 'Markup Note', 'Ghi chú'), sm('DO', 'Quick Measure', 'Đo đánh dấu'), sm('REVCLOUD', 'Revision Cloud', 'Khoanh mây'))] }
    ] },
    express: { en: 'Express Tools', vi: 'Express Tools', panels: [
      { id: 'xblk', en: 'Blocks', vi: 'Khối', items: [big('BURST', 'Explode\nAttributes', 'Phá khối\ngiữ chữ'), col(sm('NCOPY', 'Copy Nested Objects', 'Chép nét trong khối'), sm('WBLOCK', 'Write Block', 'Ghi khối ra file'), sm('BLOCKLIB', 'Blocks Library', 'Thư viện khối'))] },
      { id: 'xtxt', en: 'Text', vi: 'Chữ', items: [big('TCOUNT', 'Auto\nNumber', 'Đánh số\nchữ'), col(sm('TEXTMASK', 'Mask', 'Che nền chữ'), sm('TEXTUNMASK', 'Unmask', 'Bỏ che'), sm('ARCTEXT', 'Arc-Aligned', 'Chữ theo cung')), col(sm('TXT2MTXT', 'Convert to MText', 'Gộp chữ'), sm('JUSTIFYTEXT', 'Justify', 'Canh lề'), sm('SCALETEXT', 'Scale Text', 'Đổi cỡ chữ'))] },
      { id: 'xmod', en: 'Modify', vi: 'Sửa', items: [big('EXTRIM', 'Extended\nTrim', 'Cắt theo\nđường kín'), col(sm('COPYM', 'Multiple Copy', 'Sao chép nhiều'), sm('FLATTEN', 'Flatten', 'Làm phẳng'), sm('OVERKILL', 'Delete Duplicates', 'Xoá nét trùng'))] },
      { id: 'xdraw', en: 'Draw', vi: 'Vẽ', items: [big('BREAKLINE', 'Break-line\nSymbol', 'Đường\ncắt ngắn'), col(sm('REVCLOUD', 'Revision Cloud', 'Khoanh mây'), sm('HELIX', 'Helix', 'Xoắn ốc'))] },
      { id: 'xlay', en: 'Layers', vi: 'Lớp', items: [big('LAYWALK', 'Layer\nWalk', 'Duyệt\nlớp'), col(sm('LAYMRG', 'Merge', 'Gộp lớp'), sm('LAYDEL', 'Delete', 'Xoá lớp'), sm('COPYTOLAYER', 'Copy to Layer', 'Chép sang lớp')), col(sm('LAYCUR', 'Change to Current', 'Về lớp hiện hành'), sm('LAYMCH', 'Match Layer', 'Theo lớp đích'), sm('LAYERP', 'Previous', 'Lớp trước'))] },
      { id: 'xlayout', en: 'Layout', vi: 'Layout', items: [col(sm('WIPEOUTFRAME', 'Toggle Frames', 'Khung vùng che', { icon: 'WIPEOUT' }), sm('TEXTMASK', 'Text Mask', 'Che nền chữ'))] },
      { id: 'xtools', en: 'Tools', vi: 'Công cụ', items: [big('ALIASEDIT', 'Command\nAliases', 'Lệnh\ntắt'), col(sm('SCRIPT', 'Run Script', 'Chạy script'), sm('AUDIT', 'Audit', 'Kiểm tra lỗi'), sm('FINDREPLACE', 'Find & Replace', 'Tìm & thay'))] }
    ] },
    /* ---------- không gian 3D Modeling ---------- */
    home3d: { en: 'Home', vi: 'Trang chủ', panels: [
      { id: 'model', en: 'Modeling', vi: 'Tạo khối', pri: 0, items: [big('BOX', 'Box', 'Hộp', S({ menu: M_PRIM })), big('EXTRUDE', 'Extrude', 'Đùn', S({ menu: M_EXT })), col(sm('PRESSPULL', 'Presspull', 'Kéo vùng'), sm('WALL3D', 'Polysolid Wall', 'Dựng tường'), sm('ELEV', 'Elevation', 'Cao độ Z'))] },
      { id: 'sedit', en: 'Solid Editing', vi: 'Sửa khối', pri: 1, items: [big('UNION', 'Union', 'Cộng', S({ menu: M_BOOL })), col(sm('SLICE', 'Slice', 'Cắt khối'), sm('SHELL', 'Shell', 'Làm rỗng'), sm('INTERFERE', 'Interfere', 'Va chạm')), col(sm('FILLETEDGE', 'Fillet Edge', 'Bo cạnh'), sm('CHAMFEREDGE', 'Chamfer Edge', 'Vát cạnh'), sm('MASSPROP', 'Mass Properties', 'Tính khối'))] },
      { id: 'draw3', en: 'Draw', vi: 'Vẽ', pri: 2, items: [col(ic('LINE', 'Line', 'Đường thẳng'), ic('PLINE', 'Polyline', 'Đa tuyến'), ic('CIRCLE', 'Circle', 'Tròn', { menu: M_CIRCLE })), col(ic('ARC', 'Arc', 'Cung', { menu: M_ARC }), ic('RECTANG', 'Rectangle', 'Chữ nhật', S({ menu: M_RECT })), ic('HATCH', 'Hatch', 'Hatch'))] },
      { id: 'mod3', en: 'Modify', vi: 'Sửa', pri: 2, items: [col(ic('3DMOVE', '3D Move', 'Dời 3D'), ic('3DROTATE', '3D Rotate', 'Xoay 3D'), ic('MIRROR3D', '3D Mirror', 'Đối xứng 3D')), col(ic('3DARRAY', '3D Array', 'Mảng 3D'), ic('ALIGN', 'Align', 'Căn chỉnh'), ic('ERASE', 'Erase', 'Xoá')), col(ic('MOVE', 'Move', 'Di chuyển'), ic('COPY', 'Copy', 'Sao chép'), ic('OFFSET', 'Offset', 'Song song'))] },
      { id: 'sect', en: 'Section', vi: 'Mặt cắt', pri: 4, items: [big('SECTIONPLANE', 'Section\nPlane', 'Mặt\ncắt'), col(sm('SECTION2D', 'Section to 2D', 'Mặt cắt ra 2D'), sm('FLATSHOT', 'Flatshot', 'Chiếu 2D'))] },
      { id: 'coord', en: 'Coordinates', vi: 'Toạ độ', pri: 5, items: [big('UCS', 'UCS', 'UCS'), col(sm('UCSICON', 'UCS Info', 'Thông tin UCS'))] },
      { id: 'view3', en: 'View', vi: 'Xem', pri: 3, items: [big('3DORBIT', '3D\nOrbit', 'Xem\n3D'), col(sm('VIEWTOP', 'Top', 'Trên'), sm('VIEWFRONT', 'Front', 'Trước'), sm('VIEWSWISO', 'SW Isometric', 'ISO Tây Nam'))] },
      Object.assign({}, P_LAYERS, { id: 'layers3', pri: 7 })
    ] },
    solid: { en: 'Solid', vi: 'Khối đặc', panels: [
      { id: 'prim', en: 'Primitive', vi: 'Khối cơ bản', items: [big('BOX', 'Box', 'Hộp'), big('CYLINDER', 'Cylinder', 'Trụ'), col(sm('CONE', 'Cone', 'Nón'), sm('SPHERE', 'Sphere', 'Cầu'), sm('PYRAMID', 'Pyramid', 'Chóp')), col(sm('WEDGE', 'Wedge', 'Nêm'), sm('TORUS', 'Torus', 'Xuyến'), sm('WALL3D', 'Polysolid Wall', 'Dựng tường'))] },
      { id: 'sol', en: 'Solid', vi: 'Tạo từ 2D', items: [big('EXTRUDE', 'Extrude', 'Đùn'), big('PRESSPULL', 'Presspull', 'Kéo\nvùng'), col(sm('REVOLVE', 'Revolve', 'Xoay tròn'), sm('SWEEP', 'Sweep', 'Quét'), sm('LOFT', 'Loft', 'Chuyển tiếp'))] },
      { id: 'bool', en: 'Boolean', vi: 'Cộng trừ khối', items: [big('UNION', 'Union', 'Cộng'), col(sm('SUBTRACT', 'Subtract', 'Trừ'), sm('INTERSECT', 'Intersect', 'Giao'), sm('INTERFERE', 'Interfere', 'Va chạm'))] },
      { id: 'sed2', en: 'Solid Editing', vi: 'Sửa khối', items: [col(sm('SLICE', 'Slice', 'Cắt khối'), sm('SHELL', 'Shell', 'Làm rỗng'), sm('MASSPROP', 'Mass Properties', 'Tính khối')), col(sm('FILLETEDGE', 'Fillet Edge', 'Bo cạnh'), sm('CHAMFEREDGE', 'Chamfer Edge', 'Vát cạnh'), sm('3DARRAY', '3D Array', 'Mảng 3D'))] },
      { id: 'sec2', en: 'Section', vi: 'Mặt cắt', items: [big('SECTIONPLANE', 'Section\nPlane', 'Mặt\ncắt'), col(sm('SECTION2D', 'Section to 2D', 'Mặt cắt ra 2D'), sm('FLATSHOT', 'Flatshot', 'Chiếu 2D'))] }
    ] },
    visualize: { en: 'Visualize', vi: 'Trình diễn', panels: [
      { id: 'views', en: 'Views', vi: 'Hướng nhìn', items: [col(sm('VIEWTOP', 'Top', 'Trên'), sm('VIEWFRONT', 'Front', 'Trước'), sm('VIEWRIGHT', 'Right', 'Phải')), col(sm('VIEWSWISO', 'SW Isometric', 'ISO Tây Nam'), sm('VIEWSEISO', 'SE Isometric', 'ISO Đông Nam'), sm('VIEWNEISO', 'NE Isometric', 'ISO Đông Bắc')), col(sm('VIEWNWISO', 'NW Isometric', 'ISO Tây Bắc'))] },
      { id: 'navi', en: 'Navigate', vi: 'Điều hướng', items: [big('3DORBIT', '3D\nOrbit', 'Xem\n3D'), big('3DWALK', 'Walk', 'Đi bộ')] },
      { id: 'lights', en: 'Lights', vi: 'Ánh sáng', items: [big('LIGHT', 'Point\nLight', 'Đèn\nđiểm'), big('SUNPROPERTIES', 'Sun &\nLocation', 'Mặt\ntrời')] },
      { id: 'mats', en: 'Materials', vi: 'Vật liệu', items: [big('MATERIALS', 'Materials\nBrowser', 'Vật\nliệu')] },
      { id: 'cam', en: 'Camera', vi: 'Camera', items: [big('CAMERA', 'Create\nCamera', 'Đặt\ncamera')] },
      { id: 'rend', en: 'Render', vi: 'Render', items: [big('RENDER', 'Render', 'Render')] },
      { id: 'x3', en: 'Export 3D', vi: 'Xuất 3D', items: [col(sm('EXPORTSTL', 'Export STL', 'Xuất STL'), sm('EXPORTOBJ', 'Export OBJ', 'Xuất OBJ'))] }
    ] }
  };
  const WS = {
    draft: { en: 'Drafting & Annotation', vi: 'Vẽ 2D & Chú thích', tabs: ['home', 'insert', 'annotate', 'param', 'view', 'manage', 'output', 'collab', 'express'] },
    m3d: { en: '3D Modeling', vi: 'Mô hình 3D', tabs: ['home3d', 'solid', 'visualize', 'param', 'insert', 'annotate', 'view', 'manage', 'output', 'collab', 'express'] }
  };
  let WSK = 'draft', LANG = 'en';
  try{ const w = localStorage.getItem('dvd:ws'); if(WS[w]) WSK = w; const l = localStorage.getItem('dvd:riblang'); if(l === 'vi' || l === 'en') LANG = l; }catch(_){}
  const L = o => (LANG === 'vi' ? (o.vi || o.en) : (o.en || o.vi)) || '';
  const L2 = o => (LANG === 'vi' ? o.en : o.vi) || '';
  // hành động ngoài dòng lệnh
  const ACT = {
    'CIRCLE|2P': () => { run('CIRCLE'); setTimeout(() => A.input('2P'), 30); },
    'CIRCLE|3P': () => { run('CIRCLE'); setTimeout(() => A.input('3P'), 30); },
    'ARC|C': () => { run('ARC'); setTimeout(() => A.input('C'), 30); },
    'ELLIPSE|C': () => { run('ELLIPSE'); setTimeout(() => A.input('C'), 30); },
    'CIRCLE|TTR': () => run('CIRCLETTR'), 'CIRCLE|TTT': () => run('CIRCLETTT'),
    'VPORTS|1': () => A.vports && A.vports.set('1'), 'VPORTS|2V': () => A.vports && A.vports.set('2V'), 'VPORTS|2H': () => A.vports && A.vports.set('2H'), 'VPORTS|3R': () => A.vports && A.vports.set('3R'), 'VPORTS|3L': () => A.vports && A.vports.set('3L'), 'VPORTS|4': () => A.vports && A.vports.set('4'),
    'DRAWORDER|F': () => runKw('DRAWORDER', 'F'), 'DRAWORDER|B': () => runKw('DRAWORDER', 'B'), 'DRAWORDER|A': () => runKw('DRAWORDER', 'A'), 'DRAWORDER|U': () => runKw('DRAWORDER', 'U'),
    WSPACE: () => { const b = document.querySelector('[data-c="WSPACE"]') || $('acWS'); const r = b.getBoundingClientRect(); wsMenu(r.left, r.bottom + 2); },
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
    BLOCKLIB: () => openBlockLib(), LAYER: () => openLayerManager(), NEW: () => A.newDrawing(), LINETYPE: () => openLinetypes(), LWEIGHT: () => openLweight()
  };
  // chạy lệnh rồi tự trả lời từ khoá ở lời nhắc chọn tuỳ chọn đầu tiên (vd DRAWORDER → F)
  function runKw(c, kw){ run(c); let n = 0; const t = setInterval(() => { const r = A.reqInfo ? A.reqInfo() : null; if(!A.busy() || ++n > 1200){ clearInterval(t); return; } if(r && r.type === 'kw'){ clearInterval(t); A.input(kw); } }, 50); }
  const doCmd = c => { if(ACT[c]) ACT[c](); else run(c.split('|')[0]); };
  A.doCmd = doCmd;

  /* ---------------- dựng khung trên ---------------- */
  const top = document.createElement('div'); top.id = 'acadTop';
  top.innerHTML = '<div class="ac-appbar"><button class="ac-logo" id="acLogo" title="Menu ứng dụng">DVD<span class="tri">▼</span></button>' +
    '<div class="ac-qat">' + [['NEW', 'Bản vẽ mới (Ctrl+N)'], ['OPEN', 'Mở (Ctrl+O)'], ['SAVE', 'Lưu (Ctrl+S)'], ['SAVEAS', 'Lưu thành'], ['PLOT', 'In / xuất (Ctrl+P)'], ['UNDO', 'Hoàn tác (Ctrl+Z)'], ['REDO', 'Làm lại (Ctrl+Y)']].map(([k, t]) => '<button data-q="' + k + '" title="' + t + '">' + ico(k) + '</button>').join('') + '</div>' +
    '<button class="ac-ws" id="acWS" title="Không gian làm việc · nhãn ribbon"></button>' + '<div class="ac-title" id="acTitle">DVDCAD</div>' +
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
  const wsTabs = () => WS[WSK].tabs;
  let curTab = 'home'; try{ curTab = localStorage.getItem('dvd:rtab') || 'home'; }catch(_){} if(!wsTabs().includes(curTab)) curTab = wsTabs()[0];
  const tabsEl = $('acTabs'), ribEl = $('acRibbon');
  function renderTabs(){ tabsEl.innerHTML = wsTabs().map(k => '<button data-t="' + k + '" class="' + (k === curTab ? 'on' : '') + '" data-tip="' + esc(L2(RIB[k])) + '">' + esc(L(RIB[k])) + '</button>').join('') + '<span class="ac-tabsp"></span><button class="ac-tabmin" id="acRibMin" title="Thu gọn / mở ribbon (bấm đúp tên tab)">' + (top.classList.contains('min') ? '▾' : '▴') + '</button>'; }
  tabsEl.addEventListener('click', e => { if(e.target.closest('#acRibMin')){ toggleMin(); return; } const b = e.target.closest('[data-t]'); if(!b) return;
    if(top.classList.contains('min')){ top.classList.remove('min'); } curTab = b.dataset.t; try{ localStorage.setItem('dvd:rtab', curTab); }catch(_){} renderTabs(); renderRibbon(); setTimeout(() => { try{ resize(); }catch(_){} }, 20); });
  function toggleMin(){ top.classList.toggle('min'); renderTabs(); setTimeout(() => { try{ resize(); }catch(_){} }, 20); }
  tabsEl.addEventListener('dblclick', e => { if(e.target.closest('[data-t]')) toggleMin(); });
  // nút tách: nhớ lựa chọn cuối
  let SPL = {}; try{ SPL = JSON.parse(localStorage.getItem('dvd:split') || '{}') || {}; }catch(_){}
  const splitKey = it => it._k || it.cmd;
  function face(it){ if(!it.split || !it.menu) return { cmd: it.cmd, en: it.en, vi: it.vi, icon: it.icon };
    const c = SPL[splitKey(it)]; const m = c && it.menu.find(x => x[0] === c); if(!m) return { cmd: it.cmd, en: it.en, vi: it.vi, icon: it.icon };
    if(it.keep) return { cmd: m[0], en: it.en, vi: it.vi, icon: null, sub: { en: m[1], vi: m[2] } };
    return { cmd: m[0], en: it.t === 'big' && it.en.includes('\n') ? m[1].replace(' ', '\n') : m[1], vi: m[2], icon: null }; }
  const iconOf = (cmd, icon) => { if(icon) return icon; const k = cmd.replace('|', '_'); return (window.DVDIcons && DVDIcons[k]) || I[k] ? k : cmd.split('|')[0]; };
  function cmdInfo(cmd){ const n = cmd.split('|')[0]; const c = DVDCmd.commands.find(x => x.k.includes(n)); return c || null; }
  function btnHTML(it, idx){
    const f = face(it); const lab = L(f); const tg = it.tog ? ' data-tog="' + it.tog + '"' : '';
    const on = it.tog && SET[it.tog] ? ' on' : '';
    const dd = it.menu ? ' data-menu="' + idx + '"' : '';
    const tip = ' data-tl="' + esc((L(f) + (f.sub ? ', ' + L(f.sub) : '')).replace(/\n/g, ' ')) + '" data-ts="' + esc(L2(f).replace(/\n/g, ' ')) + '"';
    if(it.t === 'big') return '<button class="ac-rbig' + on + (it.menu ? ' has-dd' : '') + '" data-c="' + f.cmd + '"' + dd + tg + tip + ' aria-label="' + esc(lab) + '">' + ico(iconOf(f.cmd, f.icon)) + '<span>' + esc(lab).replace(/\n/g, '<br>') + (it.menu ? '<i class="dd">▾</i>' : '') + '</span></button>';
    if(it.t === 'ic') return '<span class="ac-sgrp"><button class="ac-rbtn ac-ic' + on + '" data-c="' + f.cmd + '"' + tg + tip + ' aria-label="' + esc(lab) + '">' + ico(iconOf(f.cmd, f.icon)) + '</button>' + (it.menu ? '<button class="ac-dd" data-menu="' + idx + '" aria-label="▾">▾</button>' : '') + '</span>';
    return '<span class="ac-sgrp"><button class="ac-rbtn' + on + '" data-c="' + f.cmd + '"' + tg + tip + ' aria-label="' + esc(lab) + '">' + ico(iconOf(f.cmd, f.icon)) + '<span>' + esc(lab) + '</span></button>' + (it.menu ? '<button class="ac-dd" data-menu="' + idx + '" aria-label="▾">▾</button>' : '') + '</span>';
  }
  let ITEMS = [];   // các nút đang hiện (để mở menu tách)
  const reg = it => { ITEMS.push(it); return ITEMS.length - 1; };
  function itemsHTML(items){ let h = ''; for(const it of items){ if(it.t === 'col') h += '<div class="ac-col">' + it.items.map(x => btnHTML(x, reg(x))).join('') + '</div>'; else if(it.t === 'ctl') h += ctlHTML(it.kind); else h += btnHTML(it, reg(it)); } return h; }
  function renderRibbon(){
    const T = RIB[curTab]; let h = ''; ITEMS = []; closeSlide();
    T.panels.forEach((p, pi) => {
      p.items.forEach(it => { if(it.split) it._k = p.id + ':' + it.cmd; if(it.t === 'col') it.items.forEach(x => { if(x.split) x._k = p.id + ':' + x.cmd; }); });
      h += '<div class="ac-panel" data-p="' + pi + '"><div class="ac-pbody">' + itemsHTML(p.items) + '</div><div class="ac-ptitle' + (p.more ? ' more' : '') + '"' + (p.more ? ' data-more="' + pi + '" title="Thêm công cụ"' : '') + '>' + esc(L(p)) + (p.more ? ' <i>▾</i>' : '') + '</div></div>';
    });
    ribEl.innerHTML = h; syncCtl(); fitRibbon();
  }
  // màn hình hẹp: thu gọn bảng từ phải sang trái thành 1 nút (như AutoCAD)
  function fitRibbon(){
    const panels = [...ribEl.querySelectorAll('.ac-panel')];
    const over = () => ribEl.scrollWidth > ribEl.clientWidth + 2;
    const PP = RIB[curTab].panels;
    const collapse = i => { const P = PP[i]; const first = P.items.find(x => x.cmd) || (P.items[0] && P.items[0].items && P.items[0].items[0]) || {};
      panels[i].querySelector('.ac-pbody').innerHTML = '<button class="ac-rbig" data-panel="' + i + '" data-tl="' + esc(L(P)) + '">' + ico(iconOf(first.cmd || 'TOOLS', first.icon)) + '<span>' + esc(L(P)) + '<i class="dd">▾</i></span></button>'; panels[i].classList.add('collapsed'); };
    const pri = i => PP[i].pri == null ? 3 : PP[i].pri;
    const order = PP.map((_, i) => i).sort((a, b) => pri(b) - pri(a) || b - a);
    const done = new Set();
    for(const i of order){ if(!over()) return; if(pri(i) < 7) break; collapse(i); done.add(i); }
    for(const i of PP.map((_, i) => i)){ if(!over()) return; if(pri(i) === 0) panels[i].classList.add('ico-only'); }
    for(const i of order){ if(!over()) return; if(done.has(i) || pri(i) === 0) continue; collapse(i); done.add(i); }
    for(let i = PP.length - 1; i >= 1 && over(); i--){ if(!done.has(i)){ collapse(i); done.add(i); } }
  }
  // danh sách lệnh của 1 bảng (để mở menu khi bảng bị thu gọn)
  function panelItems(P, withMore){ const items = [];
    const add = it => { if(it.t === 'col') return it.items.forEach(add); if(it.t === 'ctl'){ if(it.kind === 'layer') ['LAYER', 'LAYMCUR', 'LAYISO', 'LAYUNISO', 'LAYON', 'LAYTHW'].forEach(c => items.push({ t: c === 'LAYER' ? 'Layer Properties' : ((cmdInfo(c) || { d: c }).d), ic: c, fn: () => doCmd(c) })); else { items.push({ t: L({ en: 'Properties', vi: 'Bảng thuộc tính' }), ic: 'PROPS', fn: () => run('PROPERTIES') }); items.push({ t: L({ en: 'Linetype…', vi: 'Kiểu nét…' }), ic: 'LINETYPE', fn: () => openLinetypes() }); items.push({ t: L({ en: 'Lineweight…', vi: 'Bề rộng nét…' }), ic: 'LWEIGHT', fn: () => openLweight() }); } return; }
      if(it.menu){ it.menu.forEach(([c, en, vi]) => items.push({ t: L({ en, vi }), ic: iconOf(c), fn: () => pickSplit(it, c) })); return; }
      items.push({ t: L(it).replace(/\n/g, ' '), ic: iconOf(it.cmd, it.icon), fn: () => doCmd(it.cmd) }); };
    P.items.forEach(add); if(withMore && P.more){ items.push({ sep: 1 }); P.more.forEach(add); } return items; }
  function panelMenu(i, el){ const r = el.getBoundingClientRect(); menu(r.left, r.bottom + 2, panelItems(RIB[curTab].panels[i], true)); }
  function pickSplit(it, c){ if(it.split){ SPL[splitKey(it)] = c; try{ localStorage.setItem('dvd:split', JSON.stringify(SPL)); }catch(_){} setTimeout(() => { const sl = slideOpen; renderRibbon(); if(sl != null) openSlide(sl); }, 0); } doCmd(c); }
  // phần mở rộng của bảng (bấm tên bảng ▾)
  let slideEl = null, slideOpen = null;
  function closeSlide(){ if(slideEl){ slideEl.remove(); slideEl = null; } slideOpen = null; ribEl.querySelectorAll('.ac-ptitle.open').forEach(x => x.classList.remove('open')); }
  function openSlide(pi){
    closeSlide(); const P = RIB[curTab].panels[pi]; if(!P || !P.more) return; const pan = ribEl.querySelector('.ac-panel[data-p="' + pi + '"]'); if(!pan) return;
    slideEl = document.createElement('div'); slideEl.className = 'ac-slide'; slideOpen = pi;
    slideEl.innerHTML = '<div class="ac-slbody">' + P.more.map(x => btnHTML(x, reg(x))).join('') + '</div><div class="ac-ptitle open">' + esc(L(P)) + ' <i>▴</i></div>';
    document.body.appendChild(slideEl); const r = pan.getBoundingClientRect(); slideEl.style.left = Math.max(2, Math.min(r.left, innerWidth - slideEl.offsetWidth - 4)) + 'px'; slideEl.style.top = (r.bottom - 20) + 'px'; slideEl.style.minWidth = r.width + 'px';
    const t = pan.querySelector('.ac-ptitle'); if(t) t.classList.add('open');
    slideEl.addEventListener('click', onRibClick); slideEl.addEventListener('pointerdown', e => e.stopPropagation());
    slideEl.querySelector('.ac-ptitle').onclick = closeSlide;
  }
  document.addEventListener('pointerdown', e => { if(slideEl && !slideEl.contains(e.target) && !e.target.closest('[data-more]')) closeSlide(); }, true);
  let _rbT = 0; window.addEventListener('resize', () => { clearTimeout(_rbT); _rbT = setTimeout(() => { if(document.documentElement.classList.contains('acad')) renderRibbon(); }, 150); });
  function onRibClick(e){
    hideTip();
    const mo = e.target.closest('[data-more]'); if(mo){ const pi = +mo.dataset.more; if(slideOpen === pi) closeSlide(); else openSlide(pi); return; }
    const pc0 = e.target.closest('[data-panel]'); if(pc0){ panelMenu(+pc0.dataset.panel, pc0); return; }
    const ddb = e.target.closest('.ac-dd'); if(ddb){ openSplit(ITEMS[+ddb.dataset.menu], ddb.closest('.ac-sgrp') || ddb); return; }
    const b = e.target.closest('[data-c]'); if(!b) return;
    if(b.classList.contains('has-dd')){ const r = b.getBoundingClientRect(); if((e.clientY - r.top) > r.height * 0.62){ openSplit(ITEMS[+b.dataset.menu], b); return; } }
    const inSlide = slideEl && slideEl.contains(b); if(inSlide) closeSlide();
    doCmd(b.dataset.c);
  }
  function openSplit(it, el){ if(!it || !it.menu) return; const r = el.getBoundingClientRect(); const cur = face(it).cmd;
    menu(r.left, r.bottom + 2, it.menu.map(([c, en, vi]) => ({ t: L({ en, vi }) + (it.split && c === cur ? '' : ''), cur: it.split && c === cur, fn: () => { if(slideEl) closeSlide(); pickSplit(it, c); }, ic: iconOf(c) }))); }
  ribEl.addEventListener('click', onRibClick);
  function findItem(cmd){ for(const T of Object.values(RIB)) for(const p of T.panels) for(const it of p.items.concat(p.more || [])){ if(it.t === 'col'){ for(const x of it.items) if(x.cmd === cmd) return x; } else if(it.cmd === cmd) return it; } return null; }
  // chú giải khi rê chuột (như AutoCAD): tên lệnh, mô tả, tên gõ lệnh
  let tipEl = null, tipT = 0;
  function hideTip(){ clearTimeout(tipT); if(tipEl){ tipEl.remove(); tipEl = null; } }
  function showTip(b){
    const c = b.dataset.c, tl = b.dataset.tl || '', ts = b.dataset.ts || ''; const info = c ? cmdInfo(c) : null;
    hideTip(); tipEl = document.createElement('div'); tipEl.className = 'ac-rtip';
    const keys = info ? info.k.filter(k => !k.startsWith('-')).slice(0, 4) : [];
    tipEl.innerHTML = '<div class="tt">' + esc(tl) + (ts && ts !== tl ? '<span>' + esc(ts) + '</span>' : '') + '</div>' + (info ? '<div class="td">' + esc(info.d) + '</div>' : '') +
      (keys.length ? '<div class="tk">' + ico(iconOf(c)) + '<b>' + esc(keys[0]) + '</b>' + (keys.length > 1 ? ' · ' + keys.slice(1).map(esc).join(', ') : '') + '</div>' : '') + '<div class="tf">F1 — danh sách lệnh</div>';
    document.body.appendChild(tipEl); const r = b.getBoundingClientRect(); tipEl.style.left = Math.max(4, Math.min(r.left, innerWidth - tipEl.offsetWidth - 6)) + 'px'; tipEl.style.top = Math.min(r.bottom + 6, innerHeight - tipEl.offsetHeight - 6) + 'px';
  }
  function tipOver(e){ const b = e.target.closest('[data-tl],[data-tip]'); if(!b){ return; } if(tipEl && tipEl._b === b) return; hideTip();
    tipT = setTimeout(() => { if(b.dataset.tip != null && !b.dataset.tl){ if(!b.dataset.tip) return; hideTip(); tipEl = document.createElement('div'); tipEl.className = 'ac-rtip sm'; tipEl.textContent = b.dataset.tip; document.body.appendChild(tipEl); const r = b.getBoundingClientRect(); tipEl.style.left = r.left + 'px'; tipEl.style.top = (r.bottom + 4) + 'px'; } else showTip(b); if(tipEl) tipEl._b = b; }, 550); }
  for(const el of [ribEl, tabsEl]){ el.addEventListener('pointerover', tipOver); el.addEventListener('pointerleave', hideTip); el.addEventListener('pointerdown', hideTip); }
  document.addEventListener('pointerover', e => { if(e.target.closest && e.target.closest('.ac-slide')) tipOver(e); });
  window.addEventListener('wheel', hideTip, { passive: true });
  // không gian làm việc + ngôn ngữ nhãn ribbon
  function wsMenu(x, y){ menu(x, y, [{ hd: 'KHÔNG GIAN LÀM VIỆC' }].concat(Object.entries(WS).map(([k, w]) => ({ t: (k === WSK ? '✓ ' : '   ') + w.en + ' — ' + w.vi, fn: () => setWS(k) })), [{ sep: 1 }, { hd: 'NHÃN RIBBON' },
    { t: (LANG === 'en' ? '✓ ' : '   ') + 'English (như AutoCAD)', fn: () => setLang('en') }, { t: (LANG === 'vi' ? '✓ ' : '   ') + 'Tiếng Việt', fn: () => setLang('vi') }])); }
  function setWS(k){ if(!WS[k]) return; WSK = k; try{ localStorage.setItem('dvd:ws', k); }catch(_){} if(!wsTabs().includes(curTab)) curTab = wsTabs()[0]; renderTabs(); renderRibbon(); syncWS(); }
  function setLang(l){ LANG = l; try{ localStorage.setItem('dvd:riblang', l); }catch(_){} renderTabs(); renderRibbon(); syncWS(); }
  function syncWS(){ const b = $('acWS'); if(b) b.innerHTML = ico('SETTINGS') + '<span>' + esc(L(WS[WSK])) + '</span><i>▾</i>'; }
  A.ribbon = { setWS, setLang, get ws(){ return WSK; }, get lang(){ return LANG; }, get tab(){ return curTab; }, RIB, WS, render: () => { renderTabs(); renderRibbon(); } };
  function ctlHTML(kind){
    if(kind === 'layer') return '<div class="ac-ctl"><button class="ac-laybtn" id="acLayBtn" title="Lớp hiện hành — bấm để chọn / bật tắt"><span class="sw"></span><span class="nm">0</span>▾</button><div style="display:flex;gap:2px">' + [['LAYMCUR', 'Make Current', 'Lấy lớp của đối tượng làm hiện hành'], ['LAYISO', 'Isolate', 'Cô lập lớp'], ['LAYUNISO', 'Unisolate', 'Bỏ cô lập'], ['LAYOFF', 'Off', 'Tắt lớp (bấm đối tượng)'], ['LAYFRZ', 'Freeze', 'Đóng băng lớp'], ['LAYLCK', 'Lock', 'Khoá lớp'], ['LAYON', 'Turn All Layers On', 'Bật tất cả lớp'], ['LAYTHW', 'Thaw All Layers', 'Rã băng tất cả']].map(([c, en, vi]) => '<button class="ac-rbtn ac-ic" data-c="' + c + '" data-tl="' + esc(L({ en, vi })) + '" data-ts="' + esc(L2({ en, vi })) + '">' + ico(c) + '</button>').join('') + '</div></div>';
    if(kind === 'color') return '<div class="ac-ctl" style="min-width:170px"><select id="acColSel" title="Màu cho đối tượng mới / đang chọn"></select><button class="ac-rbtn" data-c="PROPERTIES" title="Bảng thuộc tính (Ctrl+1)">' + ico('PROPS') + '<span>Bảng thuộc tính</span></button></div>';
    if(kind === 'props3') return '<div class="ac-ctl ac-p3" style="min-width:150px;max-width:170px"><select id="acColSel" title="Màu — đối tượng mới / đang chọn"></select><select id="acLwSel" title="Bề rộng nét — đối tượng mới / đang chọn"></select><select id="acLtSel" title="Kiểu nét — đối tượng mới / đang chọn"></select></div>';
    return '';
  }
  function syncCtl(){
    const lb = $('acLayBtn'); if(lb){ const n = A.LS.cur || '0'; lb.querySelector('.nm').textContent = n; lb.querySelector('.sw').style.background = A.layerHex(n); lb.onclick = () => { const r = lb.getBoundingClientRect(); layerDrop(r.left, r.bottom + 2); }; }
    syncColor(); syncP3();
    document.querySelectorAll('[data-tog]').forEach(b => b.classList.toggle('on', !!SET[b.dataset.tog]));
  }
  function syncColor(){
    const cs = $('acColSel'); if(cs){ const sel = A.LS.color; const COLS = [['BYLAYER', '■ ByLayer'], ['#ff0000', '■ Đỏ'], ['#ffff00', '■ Vàng'], ['#00ff00', '■ Xanh lá'], ['#00ffff', '■ Lục lam'], ['#0000ff', '■ Xanh dương'], ['#ff00ff', '■ Tím'], ['#ffffff', '■ Trắng'], ['#808080', '■ Xám'], ['#ff7f00', '■ Cam']];
      let h = COLS.map(([v, t]) => '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + t + '</option>').join(''); if(!COLS.some(c => c[0] === sel)) h += '<option value="' + esc(sel) + '" selected>■ ' + esc(sel) + '</option>'; h += '<option value="PICK">Chọn màu…</option>'; cs.innerHTML = h;
      if(selEnts.size){ const cl = new Set([...selEnts].slice(0, 3000).map(e => e.bl ? 'BYLAYER' : String(e.col || '').toLowerCase())); const v = cl.size === 1 ? [...cl][0] : ''; if(v && ![...cs.options].some(o => o.value === v)){ const o = document.createElement('option'); o.value = v; o.textContent = '■ ' + v; cs.insertBefore(o, cs.lastChild); } if(!v){ const o = document.createElement('option'); o.value = '*'; o.textContent = '*nhiều*'; cs.insertBefore(o, cs.firstChild); } cs.value = v || '*'; }
      cs.onchange = () => { const v = cs.value; if(v === '*') return; const apply = c => { if(selEnts.size){ const rep = [...selEnts].map(e => { const w = _deepEnt(e); delete w.userAdded; if(c === 'BYLAYER'){ w.bl = 1; w.col = A.layerHex(w.layer || '0'); } else { delete w.bl; w.col = c; } return [e, w]; }); A.commit({ rep }); selEnts.clear(); for(const [, w] of rep) selEnts.add(w); refreshPanSel(); } else A.setCurColor(c); syncCtl(); };
        if(v === 'PICK') aciPicker(cs.getBoundingClientRect(), c => apply(c)); else apply(v); }; }
  }
  // ---- ô Bề rộng nét / Kiểu nét trên ribbon (như AutoCAD: phản ánh đối tượng đang chọn) ----
  const NOLT = { TEXT: 1, HATCH: 1, SOLID: 1, POINT: 1 };
  function applyToSel(fn, msg){ const rep = [...selEnts].filter(e => !A.isLocked(e)).map(e => { const w = _deepEnt(e); delete w.userAdded; fn(w); return [e, w]; }); if(!rep.length) return; A.commit({ rep }, msg); selEnts.clear(); for(const [, w] of rep) selEnts.add(w); refreshPanSel(); }
  A.applyToSel = applyToSel;
  function syncP3(){
    const ls = $('acLtSel'), ws = $('acLwSel'); const S = selEnts.size ? [...selEnts].slice(0, 3000) : null;
    if(ls){ const names = ['BYLAYER', 'BYBLOCK'].concat(A.ltNames()); let cur = A.LS.lt || 'BYLAYER';
      if(S){ const v = new Set(S.filter(e => !NOLT[e.type]).map(e => e.lt || 'BYLAYER')); cur = v.size === 1 ? [...v][0] : '*'; }
      if(cur !== '*' && !names.includes(cur)) names.push(cur);
      ls.innerHTML = (cur === '*' ? '<option value="*">*nhiều*</option>' : '') + names.map(n => '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + (n === 'BYLAYER' ? '— ByLayer' : n === 'BYBLOCK' ? '— ByBlock' : n === 'CONTINUOUS' ? '——— Continuous' : '- - - ' + esc(n)) + '</option>').join('') + '<option value="OTHER">Khác… (tải kiểu nét)</option>';
      ls.value = cur;
      ls.onchange = () => { const v = ls.value; if(v === '*') return; if(v === 'OTHER'){ syncP3(); openLinetypes(); return; }
        if(selEnts.size){ if(!/^(BYLAYER|BYBLOCK|CONTINUOUS)$/.test(v) && !LTYPES[v]) A.loadLT(v); applyToSel(w => { if(NOLT[w.type]) return; if(v === 'BYLAYER') delete w.lt; else w.lt = v; }, 'Đã đổi kiểu nét'); }
        else A.setCurLT(v); syncP3(); try{ DVDCmd.refreshPalette(true); }catch(_){} }; }
    if(ws){ const L = A.LW_LIST.filter(v => v > 0); let cur = A.LS.lw > 0 ? A.LS.lw : 'BYLAYER';
      if(S){ const v = new Set(S.map(e => e.lw > 0 ? e.lw : 'BYLAYER')); cur = v.size === 1 ? [...v][0] : '*'; }
      ws.innerHTML = (cur === '*' ? '<option value="*">*nhiều*</option>' : '') + '<option value="BYLAYER">— ByLayer</option>' + L.map(v => '<option value="' + v + '">' + lwBar(v) + ' ' + (v / 100).toFixed(2) + ' mm</option>').join('');
      ws.value = String(cur);
      ws.onchange = () => { const v = ws.value; if(v === '*') return; if(selEnts.size) applyToSel(w => { if(v === 'BYLAYER') delete w.lw; else w.lw = +v; }, 'Đã đổi bề rộng nét'); else A.setCurLW(v); syncP3(); try{ DVDCmd.refreshPalette(true); }catch(_){} }; }
  }
  const lwBar = v => v >= 100 ? '▬▬' : v >= 50 ? '━━' : v >= 30 ? '──' : '──';
  A.onLayers = () => { syncCtl(); if(lmRoot) renderLM(); };
  A.onSelChange = () => {
    // chọn đối tượng -> hiện lớp của chúng trên ribbon (như AutoCAD)
    const lb = $('acLayBtn'); if(!lb) return;
    if(selEnts.size){ const ly = new Set([...selEnts].slice(0, 2000).map(e => e.layer || '0')); const n = ly.size === 1 ? [...ly][0] : '*nhiều lớp*'; lb.querySelector('.nm').textContent = n; lb.querySelector('.sw').style.background = ly.size === 1 ? A.layerHex(n) : 'transparent'; syncColor(); syncP3(); }
    else syncCtl();
  };
  // QAT + nút phải
  top.querySelector('.ac-qat').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if(!b) return; const q = b.dataset.q;
    if(q === 'NEW') A.newDrawing(); else if(q === 'OPEN') click('openBtn'); else if(q === 'SAVE') run('QSAVE'); else if(q === 'SAVEAS') run('SAVEAS'); else if(q === 'PLOT') run('PLOT'); else if(q === 'UNDO'){ if(A.busy()) A.input('U'); else undoEdit(); } else if(q === 'REDO') redoEdit(); });
  $('acDrive').onclick = () => { if(window.DVDCloud) DVDCloud.openSheet(); else say('Chưa nạp module Drive.'); };
  $('acHelp').onclick = () => DVDCmd.showHelp();
  const findIn = $('acFind');
  findIn.addEventListener('keydown', e => { e.stopPropagation(); if(e.key === 'Enter'){ e.preventDefault(); const q = findIn.value.trim(); findIn.value = ''; if(q){ const c = DVDCmd.commands.find(c => c.k.includes(q.toUpperCase())) || DVDCmd.commands.find(c => c.d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))); if(c){ if(A.busy()) A.cancel(true); DVDCmd.run(c.k[0]); } else say('Không tìm thấy lệnh "' + q + '"'); } findIn.blur(); } if(e.key === 'Escape') findIn.blur(); });
  // menu ứng dụng
  $('acLogo').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); menu(r.left, r.bottom + 2, [
    { t: 'Bản vẽ mới', k: 'Ctrl+N', ic: 'NEW', fn: () => A.newDrawing() }, { t: 'Mở…', k: 'Ctrl+O', ic: 'OPEN', fn: () => click('openBtn') }, { t: 'Mở từ Google Drive…', ic: 'DRIVE', fn: ACT.DOPEN },
    { sep: 1 }, { t: 'Lưu', k: 'Ctrl+S', ic: 'SAVE', fn: () => run('QSAVE') }, { t: 'Lưu thành DXF…', k: 'Ctrl+Shift+S', ic: 'SAVEAS', fn: () => run('SAVEAS') }, { t: 'Lưu DXF lên Drive', ic: 'DRIVE', fn: ACT.DSAVE },
    { sep: 1 }, { t: 'In bản vẽ (Plot)…', k: 'Ctrl+P', ic: 'PLOT', fn: () => run('PLOT') }, { t: 'Xuất ảnh / PDF theo màn hình…', ic: 'EXPORT', fn: () => click('exportBtn') }, { t: 'Chia sẻ link…', ic: 'SHARE', fn: () => run('SHARE') },
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
      '<div class="lm-bar"><button data-a="new">' + ico('LAYER') + 'Lớp mới</button><button data-a="cur">✓ Đặt hiện hành</button><button data-a="del">✕ Xoá</button><button data-a="allon">Bật tất cả</button><button data-a="thaw">Rã băng tất cả</button><button data-a="unlock">Mở khoá tất cả</button><input placeholder="Lọc tên lớp…" data-a="find"></div><div class="lm-tbl"><table><thead><tr><th>HH</th><th>Tên lớp</th><th>Bật</th><th>Băng</th><th>Khoá</th><th>Màu</th><th>Kiểu nét</th><th>Bề rộng</th><th style="text-align:right">Số nét</th></tr></thead><tbody></tbody></table></div><p style="margin:8px 0 0">Bấm đúp tên = đặt hiện hành · bấm ô màu / kiểu nét / bề rộng để đổi (đối tượng ByLayer đổi theo) · lớp khoá không chọn/sửa được.</p>',
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
        if(f === 'lt'){ const r = t.getBoundingClientRect(); ltMenu(r, A.layerLT(n), v => { A.setLayerLT(n, v); renderLM(selName); }, false); return; }
        if(f === 'lw'){ const r = t.getBoundingClientRect(); menu(r.left, r.bottom + 2, [{ t: 'Mặc định', fn: () => { A.setLayerLW(n, 0); renderLM(selName); } }].concat(A.LW_LIST.filter(v => v > 0).map(v => ({ t: (v / 100).toFixed(2) + ' mm', fn: () => { A.setLayerLW(n, v); renderLM(selName); } })))); return; }
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
      return '<tr data-n="' + esc(n) + '" class="' + (n === A.LS.cur ? 'cur' : '') + '" style="' + (n === selName ? 'outline:1px solid #3d9ae8' : '') + '"><td>' + (n === A.LS.cur ? '<b style="color:#7ee787">✓</b>' : '') + '</td><td class="nm' + (off || fz ? ' off' : '') + '">' + esc(n) + '</td><td><button class="tg" data-f="off">' + svg(BULB(!off)) + '</button></td><td><button class="tg" data-f="frozen">' + svg(SUN(fz)) + '</button></td><td><button class="tg" data-f="locked">' + svg(LOCK(lk)) + '</button></td><td><span class="sw" data-f="col" style="background:' + esc(A.layerHex(n)) + '"></span> <span style="color:#8f99a8">' + aci + '</span></td><td><span class="lk" data-f="lt">' + esc(A.layerLT(n) === 'CONTINUOUS' ? 'Continuous' : A.layerLT(n)) + '</span></td><td><span class="lk" data-f="lw">' + (A.layerLW(n) > 0 ? (A.layerLW(n) / 100).toFixed(2) + ' mm' : 'Mặc định') + '</span></td><td style="text-align:right;color:#aab3c0">' + (cnt[n] || 0) + '</td></tr>'; }).join('');
  }
  A.openLayerManager = openLayerManager;

  /* ---------------- kiểu nét (LINETYPE) ---------------- */
  // vẽ mẫu nét lên canvas nhỏ (bỏ qua tỉ lệ thật: co để thấy rõ mẫu)
  function ltPreview(cnv, pat, color){
    const g = cnv.getContext('2d'); const w = cnv.width, h = cnv.height; g.clearRect(0, 0, w, h); g.strokeStyle = color || '#e6eaf0'; g.lineWidth = 1.6; g.lineCap = 'round';
    const tot = (pat || []).reduce((a, b) => a + Math.abs(b), 0);
    if(!pat || !pat.length || !(tot > 0)){ g.beginPath(); g.moveTo(2, h / 2); g.lineTo(w - 2, h / 2); g.stroke(); return; }
    const k = Math.max(w / 2.6, 30) / tot; let x = 2, i = 0, guard = 0;
    while(x < w - 2 && guard++ < 500){ const v = pat[i % pat.length]; const L = Math.abs(v) * k; if(v >= 0){ g.beginPath(); g.moveTo(x, h / 2); g.lineTo(Math.min(w - 2, x + Math.max(L, 0.01)), h / 2); g.stroke(); } x += L; i++; }
  }
  A.ltPreview = ltPreview;
  function ltLabel(n){ return n === 'BYLAYER' ? 'ByLayer' : n === 'BYBLOCK' ? 'ByBlock' : n === 'CONTINUOUS' ? 'Continuous' : n; }
  function ltMenu(rect, cur, cb, withBy){
    const names = (withBy ? ['BYLAYER', 'BYBLOCK'] : []).concat(A.ltNames());
    const items = names.map(n => ({ t: (n === cur ? '✓ ' : '   ') + ltLabel(n), fn: () => cb(n) }));
    items.push({ sep: 1 }, { t: 'Tải thêm kiểu nét…', ic: 'LTYPE', fn: () => loadLtDialog(list => { if(list.length) cb(list[0]); }) });
    menu(rect.left, rect.bottom + 2, items);
  }
  function loadLtDialog(done){
    const all = Object.keys(STD_LT_ISO).filter(n => !LTYPES[n]);
    if(!all.length){ say('Đã tải đủ các kiểu nét chuẩn.'); if(done) done([]); return; }
    A.dialog({ title: 'Tải kiểu nét (acadiso.lin)', wide: true, okText: 'Tải', html: '<div class="lm-tbl"><table><thead><tr><th></th><th>Kiểu nét</th><th>Hình dạng</th><th>Mô tả</th></tr></thead><tbody>' + all.map(n => '<tr data-n="' + n + '"><td><input type="checkbox" data-n="' + n + '"></td><td>' + n + '</td><td><canvas width="140" height="14" data-n="' + n + '"></canvas></td><td style="color:#aab3c0">' + esc(STD_LT_ISO[n].d) + '</td></tr>').join('') + '</tbody></table></div>',
      onOpen: root => { root.querySelectorAll('canvas[data-n]').forEach(c => ltPreview(c, STD_LT_ISO[c.dataset.n].p)); root.querySelector('tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr || e.target.type === 'checkbox') return; const cb = tr.querySelector('input'); cb.checked = !cb.checked; }); },
      ok: root => { const list = [...root.querySelectorAll('input[type=checkbox]:checked')].map(i => i.dataset.n); for(const n of list) A.loadLT(n); if(list.length) say('Đã tải ' + list.length + ' kiểu nét.'); if(done) done(list); } });
  }
  let ltRoot = null;
  function openLinetypes(){
    let sel = A.LS.lt || 'BYLAYER';
    const d = A.dialog({ title: 'Quản lý kiểu nét (Linetype Manager)', wide: true, okText: 'Đóng', noCancel: true,
      html: '<div class="lm-bar"><button data-a="load">' + ico('LTYPE') + 'Tải…</button><button data-a="cur">✓ Đặt hiện hành</button><button data-a="del">✕ Xoá</button></div><div class="lm-tbl"><table><thead><tr><th>HH</th><th>Kiểu nét</th><th>Hình dạng</th><th>Mô tả</th><th style="text-align:right">Dùng</th></tr></thead><tbody></tbody></table></div>' +
        '<label class="dvd-frow"><span>Tỉ lệ toàn cục (LTSCALE)</span><span class="v"><input id="ltG" inputmode="decimal" style="width:110px"></span></label><label class="dvd-frow"><span>Tỉ lệ cho đối tượng mới (CELTSCALE)</span><span class="v"><input id="ltC" inputmode="decimal" style="width:110px"></span></label>' +
        '<p style="margin:6px 0 0">Nét đứt hiện theo <b>tỉ lệ toàn cục × tỉ lệ riêng của đối tượng</b>. Bản vẽ mm tỉ lệ 1:100 thường đặt LTSCALE khoảng 50–100. Kiểu nét được lưu khi xuất DXF.</p>',
      ok: root => { const g = +String(root.querySelector('#ltG').value).replace(',', '.'), c = +String(root.querySelector('#ltC').value).replace(',', '.'); if(g > 0 && g !== LTSCALE) A.setLTScale(g); if(c > 0) A.setCELTS(c); ltRoot = null; syncCtl(); try{ DVDCmd.refreshPalette(true); }catch(_){} },
      onOpen: root => { ltRoot = root; } });
    const root = d.root;
    root.querySelector('#ltG').value = +(+LTSCALE).toPrecision(6); root.querySelector('#ltC').value = +(+(A.LS.celts || 1)).toPrecision(6);
    const render = () => {
      const used = {}; for(const e of modelEntities){ if(e.lt) used[e.lt] = (used[e.lt] || 0) + 1; } for(const v of Object.values(LAYER_LT)) if(v) used[v] = (used[v] || 0) + 0;
      const names = ['BYLAYER', 'BYBLOCK'].concat(A.ltNames());
      root.querySelector('tbody').innerHTML = names.map(n => { const df = /^(BYLAYER|BYBLOCK)$/.test(n) ? null : A.ltDefOf(n);
        return '<tr data-n="' + esc(n) + '" class="' + (n === (A.LS.lt || 'BYLAYER') ? 'cur' : '') + '" style="' + (n === sel ? 'outline:1px solid #3d9ae8' : '') + '"><td>' + (n === (A.LS.lt || 'BYLAYER') ? '<b style="color:#7ee787">✓</b>' : '') + '</td><td>' + esc(ltLabel(n)) + '</td><td>' + (df ? '<canvas width="140" height="14" data-n="' + esc(n) + '"></canvas>' : '') + '</td><td style="color:#aab3c0">' + esc(df ? (df.desc || '') : '') + '</td><td style="text-align:right;color:#aab3c0">' + (used[n] || '') + '</td></tr>'; }).join('');
      root.querySelectorAll('canvas[data-n]').forEach(c => { const df = A.ltDefOf(c.dataset.n); ltPreview(c, df ? df.pat : []); });
    };
    render();
    root.querySelector('tbody').addEventListener('click', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; sel = tr.dataset.n; render(); });
    root.querySelector('tbody').addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-n]'); if(!tr) return; A.setCurLT(tr.dataset.n); sel = tr.dataset.n; render(); syncCtl(); });
    root.querySelector('.lm-bar').addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if(!b) return; const a = b.dataset.a;
      if(a === 'load') loadLtDialog(() => render());
      if(a === 'cur'){ A.setCurLT(sel); render(); syncCtl(); }
      if(a === 'del'){ if(/^(BYLAYER|BYBLOCK|CONTINUOUS)$/.test(sel)){ say('Không xoá được ' + ltLabel(sel) + '.'); return; }
        if(modelEntities.some(x => x.lt === sel) || Object.values(LAYER_LT).includes(sel) || A.LS.lt === sel){ say('Kiểu nét đang được dùng — không xoá được.'); return; }
        delete LTYPES[sel]; delete A.LS.ltd[sel]; A.lsSave(); sel = 'BYLAYER'; render(); } });
  }
  A.openLinetypes = openLinetypes;
  function openLweight(){
    const L = A.LW_LIST.filter(v => v > 0);
    A.dialog({ title: 'Bề rộng nét (Lineweight Settings)', html:
      '<label class="dvd-frow"><span>Hiện bề rộng nét (LWT)</span><span class="v"><input type="checkbox" id="lwShow"' + (showLW ? ' checked' : '') + '></span></label>' +
      '<label class="dvd-frow"><span>Bề rộng cho đối tượng mới</span><span class="v"><select id="lwCur"><option value="BYLAYER">ByLayer</option>' + L.map(v => '<option value="' + v + '"' + (A.LS.lw === v ? ' selected' : '') + '>' + (v / 100).toFixed(2) + ' mm</option>').join('') + '</select></span></label>' +
      '<p style="margin:6px 0 0">Bề rộng được hiển thị theo tỉ lệ in thật (mm trên giấy) khi bật LWT. Đổi bề rộng của lớp trong <b>Quản lý lớp</b>.</p>',
      ok: root => { const on = root.querySelector('#lwShow').checked; if(on !== !!showLW){ showLW = on; try{ syncDisplayToggles(); }catch(_){} draw(); } A.setCurLW(root.querySelector('#lwCur').value); syncCtl(); setTimeout(syncSB, 30); } });
  }
  A.openLweight = openLweight;

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
    const html = '<div class="ds-tabs">' + [['os', 'Bắt điểm (OSNAP)'], ['po', 'Truy bắt cực (POLAR)'], ['gr', 'Lưới & bước (GRID/SNAP)'], ['dy', 'Nhập động, con trỏ & chọn']].map(([k, t]) => '<button data-p="' + k + '" class="' + (k === (tab || 'os') ? 'on' : '') + '">' + t + '</button>').join('') + '</div>' +
      '<div class="ds-pane' + ((tab || 'os') === 'os' ? ' on' : '') + '" data-p="os">' + ck('dsOs', 'Bật bắt điểm (F3)', SET.osnap) + ck('dsOt', 'Bật truy bắt theo điểm OTRACK (F11)', SET.otrack) + '<div class="os-grid" style="margin-top:8px">' + A.OS_ALL.map(k => '<label><input type="checkbox" data-os="' + k + '"' + (SET.osm.includes(k) ? ' checked' : '') + '><img src="' + mk(osIcon[k]) + '" width="18" height="18"> ' + A.OS_NAME[k] + '</label>').join('') + '</div><div style="display:flex;gap:6px;margin-top:8px"><button type="button" class="btn-ghost" data-all="1" style="flex:1;padding:6px">Chọn tất cả</button><button type="button" class="btn-ghost" data-all="0" style="flex:1;padding:6px">Bỏ hết</button></div><p style="margin-top:8px">Mẹo: gõ END, MID, CEN, INT, PER, TAN, NEA, QUA, NOD, INS khi đang chọn điểm để bắt điểm 1 lần.</p></div>' +
      '<div class="ds-pane' + (tab === 'po' ? ' on' : '') + '" data-p="po">' + ck('dsPo', 'Bật POLAR (F10)', SET.polar) + ck('dsOr', 'Bật ORTHO — chỉ ngang/dọc (F8, giữ Shift = tạm thời)', SET.ortho) + '<label class="dvd-frow" style="margin-top:8px"><span>Bước góc</span><span class="v"><select id="dsPa">' + [5, 10, 15, 18, 22.5, 30, 45, 90].map(v => '<option' + (v == SET.polarAng ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></span></label></div>' +
      '<div class="ds-pane' + (tab === 'gr' ? ' on' : '') + '" data-p="gr">' + ck('dsGr', 'Hiện lưới (F7)', SET.grid) + ck('dsSn', 'Bước nhảy theo lưới SNAP (F9)', SET.snap) + '<label class="dvd-frow" style="margin-top:8px"><span>Bước SNAP (0 = theo mức phóng)</span><span class="v"><input id="dsSp" type="number" step="any" min="0" value="' + (SET.snapSp || 0) + '"></span></label></div>' +
      '<div class="ds-pane' + (tab === 'dy' ? ' on' : '') + '" data-p="dy">' + ck('dsDy', 'Nhập động cạnh con trỏ (F12)', SET.dyn) + ck('dsPg', 'Chọn cả nhóm / khối / kích thước (Ctrl+Shift+A)', SET.pickGroup !== false) + ck('dsRo', 'Gợi ý thuộc tính khi rê chuột lên đối tượng', SET.rollover !== false) + '<label class="dvd-frow" style="margin-top:8px"><span>Cỡ chữ thập (% màn hình, 100 = toàn màn)</span><span class="v"><input id="dsXh" type="number" min="3" max="100" value="' + SET.xhair + '"></span></label><label class="dvd-frow"><span>Ô chọn (pickbox, px)</span><span class="v"><input id="dsPb" type="number" min="2" max="15" value="' + SET.pickbox + '"></span></label><label class="dvd-frow"><span>Vùng bắt điểm (aperture, px)</span><span class="v"><input id="dsAp" type="number" min="4" max="30" value="' + SET.aperture + '"></span></label></div>';
    A.dialog({ title: 'Cài đặt trợ giúp vẽ', wide: true, html, onOpen: root => {
      root.querySelector('.ds-tabs').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if(!b) return; root.querySelectorAll('.ds-tabs button').forEach(x => x.classList.toggle('on', x === b)); root.querySelectorAll('.ds-pane').forEach(x => x.classList.toggle('on', x.dataset.p === b.dataset.p)); });
      root.querySelectorAll('[data-all]').forEach(b => b.onclick = () => root.querySelectorAll('[data-os]').forEach(c => c.checked = b.dataset.all === '1'));
    }, ok: root => {
      const g = id => root.querySelector('#' + id); SET.osnap = g('dsOs').checked; SET.otrack = g('dsOt').checked; SET.osm = [...root.querySelectorAll('[data-os]')].filter(c => c.checked).map(c => c.dataset.os);
      SET.polar = g('dsPo').checked; SET.ortho = g('dsOr').checked; if(SET.ortho) SET.polar = false; SET.polarAng = parseFloat(g('dsPa').value) || 45;
      SET.grid = g('dsGr').checked; SET.snap = g('dsSn').checked; SET.snapSp = Math.max(0, parseFloat(g('dsSp').value) || 0);
      SET.dyn = g('dsDy').checked; SET.pickGroup = g('dsPg').checked; SET.rollover = g('dsRo').checked; SET.xhair = Math.max(3, Math.min(100, parseInt(g('dsXh').value) || 100)); SET.pickbox = Math.max(2, Math.min(15, parseInt(g('dsPb').value) || 5)); SET.aperture = Math.max(4, Math.min(30, parseInt(g('dsAp').value) || 10));
      A.saveSet(); try{ draw(); }catch(_){} } });
  }
  A.openDrafting = openDrafting;

  /* ---------------- thanh trạng thái ---------------- */
  const sb = document.createElement('div'); sb.id = 'acadStatus';
  const TOG = [['grid', 'GRID', 'Lưới (F7)', 'GRID'], ['snap', 'SNAP', 'Bước lưới (F9)', 'ID'], ['ortho', 'ORTHO', 'Vuông góc (F8)', 'LINE'], ['polar', 'POLAR', 'Góc cực (F10)', 'DIMANGULAR'], ['osnap', 'OSNAP', 'Bắt điểm (F3)', 'RECTANG'], ['otrack', 'OTRACK', 'Truy bắt (F11)', 'XLINE'], ['dyn', 'DYN', 'Nhập động (F12)', 'CMDLINE']];
  sb.innerHTML = '<div class="ac-lt" id="acLT"></div><div class="ac-sb"><span class="ac-coord" id="acCoord">0.0000, 0.0000</span><span class="model" id="acModel">MODEL</span><span class="ac-sep"></span>' +
    TOG.map(([k, l, t]) => '<button data-k="' + k + '" title="' + t + ' — chuột phải: cài đặt">' + l + '</button>').join('') + '<span class="ac-sep"></span><button data-x="lwt" title="Hiện bề rộng nét">LWT</button><button data-x="ds" title="Cài đặt trợ giúp vẽ">' + ico('SETTINGS') + '</button><button data-x="iso" title="Cô lập / ẩn đối tượng">' + ico('ISOLATEOBJECTS') + '</button><button data-x="pr" title="Thuộc tính (Ctrl+1)">' + ico('PROPS') + '</button><button data-x="cl" title="Toàn màn hình (Ctrl+0)">' + ico('CLEAN') + '</button></div>';
  const nav = document.querySelector('nav.toolbar'); (nav || stageEl).insertAdjacentElement('afterend', sb);
  function syncSB(){ sb.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', !!SET[b.dataset.k])); const lw = sb.querySelector('[data-x="lwt"]'); try{ lw.classList.toggle('on', !!showLW); }catch(_){} syncCtl(); }
  sb.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; if(b.dataset.k){ A.toggle(b.dataset.k); syncSB(); return; }
    const x = b.dataset.x; if(x === 'lwt'){ ACT.TLWT(); setTimeout(syncSB, 60); } else if(x === 'ds') openDrafting(); else if(x === 'pr') DVDCmd.togglePalette(); else if(x === 'cl') ACT.CLEAN();
    else if(x === 'iso'){ const r = b.getBoundingClientRect(); menu(r.left - 120, r.top - 110, [{ t: 'Cô lập đối tượng', ic: 'ISOLATEOBJECTS', fn: () => run('ISOLATEOBJECTS') }, { t: 'Ẩn đối tượng', ic: 'HIDEOBJECTS', fn: () => run('HIDEOBJECTS') }, { t: 'Hiện lại tất cả', ic: 'UNISOLATEOBJECTS', dis: !(A.objIsolated && A.objIsolated()), fn: () => run('UNISOLATEOBJECTS') }]); } });
  A.onIsolate = () => { const b = sb.querySelector('[data-x="iso"]'); if(b) b.classList.toggle('iso-on', !!(A.objIsolated && A.objIsolated())); };
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
    if(A.hasDoc()) h += '<button data-l="new" title="Tạo layout mới (khổ giấy, khung tên, khung nhìn)" style="padding:0 8px">＋</button>';
    lt.innerHTML = h; $('acModel').textContent = isModelView() ? 'MODEL' : 'PAPER';
  }
  A.renderLT = renderLT;
  $('acLT').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if(!b) return; if(b.dataset.l === 'new'){ run('LAYOUT'); return; } const i = +b.dataset.l; if(i >= 0 && i !== currentLayout) switchLayout(i); setTimeout(renderLT, 30); });
  $('acLT').addEventListener('contextmenu', e => { const b = e.target.closest('[data-l]'); if(!b) return; e.preventDefault(); const i = +b.dataset.l; if(A.layoutMenu) A.layoutMenu(i, e.clientX, e.clientY); });

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
  $('acWS').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); wsMenu(r.left, r.bottom + 2); };
  applyMode(); syncWS(); renderTabs(); renderRibbon(); syncSB(); updTitle(); renderLT();
  // vẽ lại khi mở modal ở chế độ máy tính: các overlay của app canh giữa
  setTimeout(() => { try{ resize(); }catch(_){} }, 60);
})();
