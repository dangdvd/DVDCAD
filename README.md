# DVDCAD — PWA xem bản vẽ DWG/DXF (cài được, chạy offline)

Ứng dụng web một trang: **xem** bản vẽ, **đo khoảng cách** (có bắt điểm), **thêm ghi chú**.
Đọc **DXF** trực tiếp và **DWG** trực tiếp (qua LibreDWG biên dịch WebAssembly).
Sau lần nạp đầu, app **chạy hoàn toàn offline** và **cài lên màn hình chính** iPhone như một app.

## v4q: cải tiến các hạn chế còn lại
- Đa tuyến có cung (bulge) giữ đúng cung khi sửa, OFFSET, bắt điểm, lưu DXF; PLINE cung.
- Lưu DXF: khối thành BLOCK/INSERT + ATTDEF/ATTRIB, kích thước thẳng/bán kính/đường kính thành DIMENSION, vùng kèm XDATA.
- HATCH tự mở rộng vùng dò biên; kiểu nét phức có chữ (đọc DXF/DWG + vẽ); DATALINK theo dõi file Excel (File System Access); xuất file .ctb.

## v4p: kiểu in CTB, bảng Excel, vùng 2D, SNAPANG
- STYLESMANAGER / CTB: nhập file `.ctb` của AutoCAD, sửa màu in, bề rộng nét, độ đậm theo màu; chọn trong PLOT.
- DATALINK (bảng từ Excel/CSV, SheetJS 0.18.5 Apache-2.0, tải khi cần), DATALINKUPDATE, TABLEEXPORT (CSV/xlsx).
- REGION + UNION/SUBTRACT/INTERSECT cho vùng 2D (polygon-clipping, MIT), MASSPROP vùng.
- SNAPANG, SNAP, GRID, ORTHO; menu nắm kéo đa tuyến (thêm/xoá đỉnh, đoạn ↔ cung); OFFSET Xoá/Lớp/Nhiều lần.
- Tool Palettes kéo-thả; PDFIMPORT nhận cung/đường tròn và nhập PDF quét thành ảnh; MLEADERSTYLE, COUNT, DBLIST, COLOR, BASE, JPGOUT, CLEANSCREENON, COPYHIST.

## v4o: cải tiến giới hạn + Tool Palettes, DesignCenter, PDF Import
- SPELL tiếng Việt offline (quy tắc ghép vần + từ điển riêng + gợi ý); VPORTS xoay từng khung; hatch liên kết vùng ghép nhiều nét.
- DIMBREAK tự cập nhật, dùng được cho kích thước của file; MIRRTEXT 1.
- TOOLPALETTES (Ctrl+3) với ký hiệu kiến trúc, ADCENTER (Ctrl+2), PDFIMPORT (pdf.js v3.11, Apache-2.0, tải khi cần).

## v4n: các phần còn thiếu
- VPORTS (nhiều khung nhìn trong Model), mảng liên kết + ARRAYEDIT, hatch liên kết đường biên.
- SPELL, SETVAR + biến hệ thống (OSMODE, PDMODE…), PTYPE, ISODRAFT / ISOCIRCLE.
- XCLIP, IMAGECLIP, GROUPEDIT, HYPERLINK, DIMBREAK, PURGE (hộp thoại), OPTIONS, STATUS.

## v4m: bổ sung lệnh AutoCAD & Express Tools
- Bắt điểm EXT, PAR, GCE; CIRCLE TTR/TTT, SOLID, SKETCH, HELIX, BREAKLINE, GRADIENT.
- EXTRIM, COPYM, SPLINEDIT, HATCHEDIT, CHPROP, FLATTEN, BURST, NCOPY.
- FINDREPLACE, TCOUNT, TEXTMASK, ARCTEXT, TEXTALIGN, FIELD/UPDATEFIELD, bảng có công thức.
- DIMSPACE, DIMTEDIT, DIMEDIT, DIMJOGGED, TOLERANCE.
- LAYCUR, LAYMCH, COPYTOLAYER, LAYWALK, LAYERP, LAYERSTATE, RENAME, WBLOCK.
- ALIASEDIT (nhập acad.pgp), SCRIPT (.scr), AUDIT, DWGPROPS, TIME, PLAN; tab Express Tools.

## v4l: ribbon & biểu tượng giống AutoCAD
- Tab và bảng theo AutoCAD (Home, Insert, Annotate, Parametric, View, Manage, Output, Collaborate), 2 không gian làm việc Drafting & Annotation / 3D Modeling.
- Nút tách nhớ lựa chọn cuối, bảng mở rộng (▾), chú giải khi rê chuột, nhãn tiếng Anh hoặc tiếng Việt.
- Bộ biểu tượng màu mới (`dvd-icons.js`, ~260 biểu tượng tự vẽ).

## v4k: ràng buộc tham số, khối động, vùng che, chú thích theo tỉ lệ, lưu DWG
- **Ràng buộc tham số:** GCHORIZONTAL/VERTICAL/PARALLEL/PERPENDICULAR/COLLINEAR/COINCIDENT/EQUAL/CONCENTRIC/TANGENT/FIX, DCALIGNED/HORIZONTAL/VERTICAL/RADIUS/DIAMETER/ANGULAR, AUTOCONSTRAIN, PARAMETERS (biểu thức), DELCONSTRAINT. Bộ giải giữ ràng buộc khi sửa bằng mọi lệnh.
- **Khối động:** BPARAMETER (trạng thái hiển thị, kéo giãn, lật), BDYN, đổi ngay trong bảng Thuộc tính.
- **DRAWORDER**, TEXTTOFRONT, HATCHTOBACK; **WIPEOUT** (đọc từ DWG/DXF), WIPEOUTFRAME.
- **Chú thích theo tỉ lệ:** CANNOSCALE (ô ▲ 1:N ở thanh trạng thái), ANNOTATIVE; khung nhìn layout hiện đúng cao chữ trên giấy.
- **SAVEDWG / DWGSERVER:** lưu DWG qua `server-dwg.js` + ODA File Converter.

## v4j: bổ sung lệnh AutoCAD
- MLINE/MLSTYLE, ARRAYPATH, BLEND, REVERSE, SETBYLAYER; DIMORDINATE, DIMARC, CENTERMARK, CENTERLINE.
- SCALETEXT, JUSTIFYTEXT, TXT2MTXT; LAYMRG, LAYDEL; VIEW (góc nhìn 2D), CAL, PUBLISH (PDF nhiều trang).
- 3D: SHELL, INTERFERE, MASSPROP, 3DARRAY.

## v4i: dùng lệnh trong khung 3D
- Mọi lệnh chạy được khi đang xem 3D: bấm điểm (bắt đỉnh khối, nét 2D, mặt phẳng cao độ), bấm chọn khối / nét 2D, Enter / chuột phải để xong, Esc để huỷ.
- Cảnh 3D tự cập nhật sau mỗi lệnh, Undo/Redo. Dòng lệnh hiện trên khung 3D.

## v4h: UCS, LOFT, bo cạnh, ánh sáng, mặt cắt, đọc ACIS
- **UCS 3D:** mặt đứng qua 2 điểm, trước/bên, theo mặt khối, xoay X/Y, cao độ gốc. Lệnh tạo khối đặt khối lên mặt phẳng UCS.
- **LOFT**, **FILLETEDGE**, **CHAMFEREDGE**.
- **Mặt trời** theo ngày giờ & toạ độ (bóng đổ trong ngày), **đèn điểm** (`LIGHT`), **CAMERA**, góc nhìn đã lưu, **đi bộ** (`3DWALK`).
- **Mặt cắt** ngang/đứng tô kín, xuất ra đa tuyến + hatch 2D (`SECTION2D`).
- **Đọc khối ACIS (3DSOLID)** của AutoCAD trong DXF: SAT (R2000–R2010) và SAB (R2013+).

## v4g: 3D nâng cao
- **Cộng/trừ/giao khối:** `UNION`, `SUBTRACT`, `INTERSECT`, `SLICE`.
- **Khối mới:** `REVOLVE`, `SWEEP`, `PYRAMID`, `WEDGE`, `TORUS`. Đặt cao độ bằng `ELEV`.
- **Sửa 3D:** `3DMOVE` (theo Z), `3DROTATE` (trục X/Y/Z/2 điểm), `MIRROR3D`.
- **Vật liệu & render:** `MATERIALS` (11 vật liệu có vân), `RENDER` (bóng đổ), `SECTIONPLANE` (mặt cắt ngang).
- **FLATSHOT:** chiếu mô hình 3D thành mặt đứng/ISO 2D, đã bỏ nét khuất.
- DXF lưu khối kèm XDATA nên mở lại vẫn sửa được. Đọc lưới POLYFACE / POLYGON MESH / MESH.

## v4f: 3D
- **Khối 3D:** `BOX`, `CYLINDER`, `CONE`, `SPHERE`, `EXTRUDE` (đa tuyến/tròn/elip/hatch có lỗ), `PRESSPULL`, `WALL3D` (dựng tường từ mặt bằng).
- **Xem 3D** (`3DORBIT`, nút 3D): xoay/dời/phóng bằng chuột hoặc ngón tay, ViewCube, góc nhìn chuẩn, khung dây/tô bóng/X-quang, phối cảnh/song song.
- **Xuất:** PNG, STL, OBJ+MTL; DXF ghi 3DFACE. Đọc 3DFACE (có cao độ Z) từ DXF/DWG.
- Bộ vẽ 3D (three.js r160, MIT) chỉ tải khi mở khung nhìn 3D.

## v4e: thuộc tính khối, ảnh nền, XREF, layout giấy
- **Thuộc tính khối:** `ATTDEF`, `EATTEDIT` (kích đúp), `ATTEXPORT` ra CSV. Đọc được ATTRIB của file gốc.
- **Ảnh nền:** `IMAGEATTACH`, `IMAGEADJUST`.
- **Tham chiếu ngoài:** `XATTACH`, `XREF`. Nền mờ, bắt điểm được, tự nạp lại khi mở bản vẽ.
- **Layout giấy:** `LAYOUT` (khổ giấy + khung tên), `MVIEW` (khung nhìn theo tỉ lệ), `VPEDIT`. PLOT in layout đúng khổ.
- Kích thước thẳng/chéo của file DWG/DXF kéo ô nắm và STRETCH được.

## v4d: nhiều bản vẽ, sửa khối, bảng
- **Nhiều bản vẽ mở cùng lúc** dạng tab (Ctrl+Tab chuyển, Ctrl+F4 đóng).
- **Sửa khối tại chỗ** (REFEDIT / BEDIT, kích đúp vào khối): mọi khối cùng tên được cập nhật.
- **Bảng (TABLE)**: tạo từ dữ liệu dán từ Excel, kích đúp để sửa.
- **QDIM** (kích thước nhanh hàng loạt), bắt điểm **FROM** và **M2P**, chọn bằng **hàng rào (F)**, **đa giác trùm (WP)** và **đa giác cắt (CP)**.

## v4c: in theo tỉ lệ, kiểu chữ, công cụ sửa
- **PLOT (Ctrl+P)** như AutoCAD:
  - Khổ A4 đến A0, ngang hoặc dọc.
  - Vùng in: Extents, Display hoặc Window.
  - In **đúng tỉ lệ 1:N** hoặc khít giấy.
  - Kiểu in đen trắng, màu hoặc thang xám, có in bề rộng nét.
  - Xem trước; xuất PDF đúng khổ, gửi máy in hoặc ảnh PNG.
- **Kiểu chữ (STYLE):** chọn font và hệ số rộng. Đọc và ghi kiểu chữ TrueType trong DXF. Chữ VNI-Times / .VnTime hiện bằng Times New Roman.
- **Đa tuyến:** ô nắm giữa đoạn, thêm đỉnh và xoá đỉnh.
- **Lệnh mới:** `OVERKILL`, `BOUNDARY`, `DONUT`, `MEASUREGEOM` (đo nhanh khi rê chuột), `ISOLATEOBJECTS` / `HIDEOBJECTS` / `UNISOLATEOBJECTS`.

## v4b: kiểu nét, khối & kích thước giống AutoCAD hơn
- **Kiểu nét (linetype)**: đọc bảng LTYPE, LTSCALE, kiểu nét theo lớp, ByBlock và tỉ lệ riêng từng đối tượng từ DWG/DXF. Nét tâm, nét khuất, nét đứt hiện đúng. Có Linetype Manager, LTSCALE, và 3 ô Màu, Bề rộng, Kiểu nét trên ribbon. Kiểu nét được ghi khi xuất DXF.
- **Khối/kích thước của file chọn theo cụm**, mỗi khối một ô nắm ở điểm chèn. **Ctrl+Shift+A** chuyển sang chọn từng nét. Đối tượng lớp 0 trong khối mang lớp của khối.
- **Kích thước vẽ bằng DVDCAD sửa được bằng ô nắm, STRETCH, MOVE hoặc SCALE**, số đo tự cập nhật.
- Lệnh mới: `QSELECT`, `MLEADER`/`QLEADER`, `ALIGN`, `LINETYPE`, `LTSCALE`, `LWEIGHT`. Tooltip kiểu AutoCAD trên ribbon và khi rê chuột lên đối tượng.

## v4: giao diện & lệnh kiểu AutoCAD
- Trên máy tính: **ribbon**, dòng lệnh, thanh trạng thái (GRID · SNAP · ORTHO · POLAR · OSNAP · OTRACK · DYN), tab Model/Layout, bảng Thuộc tính, quản lý **Lớp** (Layer Properties), ô nắm (grip) kiểu AutoCAD, chọn khung window/crossing, chuột phải = Enter.
- Hơn 100 lệnh: vẽ (LINE, PLINE, ARC, ELLIPSE, HATCH, TEXT…), sửa (TRIM, EXTEND, FILLET, STRETCH, BREAK, JOIN, EXPLODE, LENGTHEN…), kích thước (DIMLINEAR…), khối (INSERT/BLOCK), sao chép/dán giữa các bản vẽ, bản vẽ mới (NEW).
- Điện thoại giữ giao diện gọn; nút **Công cụ** mở bảng lệnh CAD.
- Xem đầy đủ: **[HUONG-DAN-LENH.md](HUONG-DAN-LENH.md)**.

## Bản online (v3): Google Drive · chia sẻ · cộng tác · dòng lệnh kiểu AutoCAD
- Mở/lưu bản vẽ trên **Google Drive**, **chia sẻ link xem**, **nhiều người cùng sửa** (đồng bộ qua Drive, không cần server).
- **Dòng lệnh** như AutoCAD (`L`, `PL`, `C`, `M`, `TR`, `O`…, nhập toạ độ `x,y` / `@dx,dy` / `dài<góc`), phím tắt, bảng **Thuộc tính** (Ctrl+1).
- Mở/lưu file trên máy (Edge/Chrome: Ctrl+S ghi thẳng file DXF, nhấp đúp file .dwg/.dxf để mở khi đã cài app).
- Cài đặt Google (miễn phí, làm 1 lần): xem **[HUONG-DAN-GOOGLE-DRIVE.md](HUONG-DAN-GOOGLE-DRIVE.md)**.

## Có gì trong thư mục này
- `dvd-config.js` — 3 mã Google (Client ID, API key, Project number). Để trống = tắt phần Drive.
- `dvd-cloud.js` — Google Drive, chia sẻ, cộng tác. `dvd-collab-core.js` — lõi hợp nhất dữ liệu cộng tác.
- `dvd-cmd.js` — dòng lệnh, phím tắt, bảng Thuộc tính.
- `dvd-acad-core.js` (bắt điểm, chọn, grip, lớp), `dvd-acad-cmds.js` (các lệnh vẽ/sửa/kích thước/hatch/khối), `dvd-acad-ui.js` (ribbon, thanh trạng thái, hộp thoại), `dvd-acad-more.js` (QSELECT, MLEADER, ALIGN, kiểu nét, PLOT, tooltip), `dvd-acad-ext.js` (tab nhiều bản vẽ, sửa khối, bảng, QDIM), `dvd-acad-pro.js` (thuộc tính khối, ảnh nền, XREF, layout giấy) — phần AutoCAD v4.
- `index.html` — toàn bộ ứng dụng (parser DXF + bộ vẽ + đo + ghi chú).
- `libredwg-web.js`, `libredwg-web.wasm` — bộ giải mã **DWG** (LibreDWG, giấy phép **GPL-3.0**, ~15MB tổng).
- `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon-180.png` — phần PWA (cài đặt + offline).

> ⚠️ App phải được chạy qua **HTTPS** (hoặc localhost) thì service worker mới hoạt động.
> Mở thẳng file `index.html` bằng `file://` sẽ KHÔNG cài/offline được. Hãy đưa lên một host (hướng dẫn dưới).

---

## Cách đưa lên mạng MIỄN PHÍ

### Cách A — GitHub Pages (khuyên dùng)
1. Tạo tài khoản GitHub, tạo repo mới (ví dụ `DVDCAD`), để **Public**.
2. Tải toàn bộ file trong thư mục này lên repo (nút **Add file → Upload files**), commit.
3. Vào **Settings → Pages**. Mục *Build and deployment*: chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`. Lưu.
4. Đợi ~1 phút, GitHub cho địa chỉ dạng `https://dangdvd.github.io/DVDCAD/`. Mở địa chỉ này bằng **Safari trên iPhone**.

> Vì app chạy trong thư mục con (`/DVDCAD/`), mọi đường dẫn đã để **tương đối** (`./…`) nên hoạt động đúng.

### Cách B — Netlify (kéo–thả, không cần Git)
1. Vào app.netlify.com → **Add new site → Deploy manually**.
2. Kéo–thả cả thư mục này vào. Netlify cho ngay một địa chỉ HTTPS để mở.

---

## Cài lên iPhone + dùng offline
1. Mở địa chỉ HTTPS ở trên bằng **Safari**.
2. Bấm nút **Chia sẻ** → **Thêm vào MH chính** (Add to Home Screen). Giờ có icon app riêng, mở toàn màn hình.
3. **Offline:** ngay lần mở đầu, app đã được lưu cache; sau đó tắt mạng vẫn mở và xem **DXF** được.
4. **DWG offline:** bộ giải mã DWG nặng ~15MB nên chỉ tải khi bạn **mở một file .dwg lần đầu (cần mạng)**.
   Sau lần đó nó được lưu cache → các lần sau mở DWG **không cần mạng** nữa.

## Mở file trên iPhone
Bấm **Mở file** trong app → chọn `.dxf` hoặc `.dwg` từ ứng dụng **Files**/iCloud Drive.
File được đọc **ngay trên máy**, không tải lên máy chủ nào.

---

## Định dạng & giới hạn
- **DXF:** đọc trực tiếp, không phụ thuộc thư viện ngoài. Hỗ trợ LINE, CIRCLE, ARC, ELLIPSE,
  LWPOLYLINE/POLYLINE, TEXT/MTEXT, POINT, SOLID/3DFACE, **INSERT**, **DIMENSION**, **SPLINE**, **HATCH**,
  **LEADER** (đường chỉ dẫn) và **ATTRIB** (chữ thuộc tính trong khối/khung tên).
- **DWG:** đọc qua **LibreDWG (WASM)** — đã thử với R11, R14, R2000, R2004, R2007, R2013.
- **Màu sắc:** vẽ đúng **màu theo layer** và **màu riêng của đối tượng** dùng bảng **ACI** (AutoCAD Color Index)
  chuẩn, xử lý cả **BYLAYER** và **BYBLOCK**. Layer bị **tắt/đóng băng** sẽ được ẩn như trong AutoCAD.
- **INSERT & DIMENSION:** block được "explode" và biến đổi đúng (vị trí, tỉ lệ, góc xoay),
  kể cả **block lồng nhau** và **mảng** (rows/cols). DIMENSION vẽ theo khối `*D…` nên có đủ đường gióng,
  **mũi tên** và **chữ số đo**. Layer `Defpoints` (điểm dựng hình) được bỏ qua.
- **SPLINE:** dựng đúng đường cong — **NURBS/B-spline** (thuật toán Cox–de Boor, có hỗ trợ trọng số)
  khi có control points; **nội suy Catmull-Rom** (đi qua điểm) khi chỉ có fit points.
- **HATCH:** lấy biên (polyline có *bulge*, hoặc cạnh line/arc/ellipse/spline) rồi **tô mờ** vùng đó
  (theo màu layer/đối tượng), dùng quy tắc even-odd để chừa lỗ. *Lưu ý:* các mẫu gạch (ANSI31…)
  được đơn giản hoá thành tô nền mờ, không vẽ từng nét gạch.
- **Polyline cong (bulge):** đoạn polyline có *bulge* được dựng đúng thành **cung tròn** (toán chính xác,
  điểm nằm đúng trên cung), áp dụng cho cả polyline thường lẫn biên của HATCH.
- **Còn lại:** đây là trình xem **2D** — các đối tượng khối 3D thực thụ (3DSOLID, REGION, MESH, mặt cong)
  không được dựng hình 3D; đường dựng vô hạn (XLINE), khung nhìn layout (VIEWPORT) cũng được bỏ qua.
  Phần lớn bản vẽ kỹ thuật 2D nay đã hiển thị đầy đủ và đúng màu.

## Cập nhật app
Nếu bạn sửa file rồi upload lại mà máy vẫn hiện bản cũ: mở `sw.js`, đổi `const CACHE = 'dvdcad-v1'`
thành `'dvdcad-v2'` (tăng số), upload lại. Service worker sẽ xoá cache cũ và nạp bản mới.

## Giấy phép
- Mã ứng dụng (phần `index.html`, `sw.js`…) bạn tự do dùng/sửa.
- **LibreDWG** (`libredwg-web.js`, `libredwg-web.wasm`) theo **GPL-3.0**. Nếu bạn **phân phối** app này,
  cần tuân thủ điều khoản GPL (giữ thông báo giấy phép và cung cấp mã nguồn khi được yêu cầu).
  Nguồn: https://github.com/mlightcad/libredwg-web và https://github.com/LibreDWG/libredwg
