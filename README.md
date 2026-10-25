# DVDCAD — PWA xem bản vẽ DWG/DXF (cài được, chạy offline)

> **Bản Windows** (cài như phần mềm, chạy offline, giao diện kiểu AutoCAD): xem **[HUONG-DAN-WINDOWS.md](HUONG-DAN-WINDOWS.md)**.

Ứng dụng web một trang: **xem** bản vẽ, **đo khoảng cách** (có bắt điểm), **thêm ghi chú**.
Đọc **DXF** trực tiếp và **DWG** trực tiếp (qua LibreDWG biên dịch WebAssembly); ghi DXF (2000 → 2018) và **DWG 2000** ngay trong app.
Sau lần nạp đầu, app **chạy hoàn toàn offline** và **cài lên màn hình chính** iPhone như một app.

## v5m: soạn chữ tại chỗ, tab Array Creation, các hộp thoại còn lại như AutoCAD 2027
- Bộ soạn chữ tại chỗ (`A.inplaceText`, `A.textFinish`, `A.textSrc` trong `dvd-acad-dlg.js`):
  - MTEXT / TEXT / DDEDIT soạn ngay trên bản vẽ, đúng vị trí, cỡ, góc, canh lề; tab ngữ cảnh **Text Editor**.
  - MTEXT ngắt dòng theo bề rộng khung; giữ nội dung gốc (`mtp`) và tỉ lệ khung (`mtwk`) để sửa lại.
  - Nhập từ script / LISP / dòng lệnh đi thẳng vào ô soạn (mỗi dòng một dòng chữ, dòng trống = xong).
- Tab ngữ cảnh **Array Creation** cho ARRAYRECT / ARRAYPOLAR (sửa số lượng, khoảng, xem trước tức thì); vòng lặp sửa mảng như AutoCAD (`A.getPoint` với `previewAlways`).
- **Select Color** (`A.selectColor`) cho COLOR và mọi ô chọn màu; `-COLOR` / `-PURGE` cho script, LISP gọi `(command "COLOR" …)` / `(command "PURGE" …)` chạy bản dòng lệnh.
- Hộp thoại theo bố cục AutoCAD: PURGE, RENAME, Layer States Manager, View Manager, Find and Replace (không phân biệt dấu), Enhanced Attribute Editor, Geometric Tolerance, Drawing Properties, Multileader Style Manager, Multiline Style, External References.
- Thư viện kiểu có tên mới: kiểu ghi chú dẫn (`dvd:mlslib`), kiểu đường đôi (`dvd:mlstylelib`, nắp đầu / cuối riêng `capS` / `capE`).

## v5l: hộp thoại và ribbon như AutoCAD 2027
- Khung hộp thoại chung (`A.dialog` trong `dvd-acad-cmds.js`):
  - thanh tiêu đề kéo được, nút **?** / **×**, nút OK · Cancel · Help ở góc dưới phải;
  - kiểu `modeless` cho bảng nổi (vẫn vẽ được phía sau).
  - Giao diện điện thoại giữ kiểu cũ (nút to, Huỷ bên trái).
- `dvd-acad-dlg.js` (mới):
  - bộ dựng điều khiển (khung nhóm, tab, listbox, ô màu / kiểu nét / bề rộng nét, canvas xem trước);
  - các hộp thoại theo bố cục AutoCAD: Dimension Style Manager (7 tab + xem trước + Compare), Text Style, Layer Properties Manager (bảng nổi), Drafting Settings, Drawing Units, bảng Blocks + CLASSICINSERT, Block Definition, Attribute Definition, Hatch and Gradient + tab ngữ cảnh Hatch Creation, Options.
- Lõi kích thước (`dvd-acad-cmds.js`):
  - thêm các biến kiểu như AutoCAD: DIMCLRD/E/T, DIMLWD/E, DIMLTYPE, DIMSD1/2, DIMSE1/2, DIMFXL, 20 mũi tên DIMBLK1/2, DIMCEN, DIMTAD, DIMJUST, DIMTIH, DIMSCALE, DIMLUNIT, DIMDSEP, DIMRND, DIMZIN, DIMAUNIT, DIMALT…, DIMTOL / DIMLIM;
  - thư viện kiểu có tên (`A.dimStyles`); sửa kiểu thì kích thước dùng kiểu đó dựng lại.
- Ribbon:
  - không còn thanh cuộn ngang; thu gọn bảng theo bề ngang thật (ResizeObserver, nạp phông);
  - bảng thu gọn bật ra đủ nút; tab ngữ cảnh (`A.ribbonCtx`).
- Viết lại theo AutoCAD: Plot, Insert Table, Quick Select, Linetype Manager, Lineweight Settings, Point Style.
- Sửa bảng mã `$INSUNITS` (7 = km, 10 = yard, 15 = decameter).

## v5k: tự ghi DWG (AutoCAD 2000), không cần ODA File Converter
- `dvd-dwg.js`: bộ ghi **DWG R2000 (AC1015)** bằng JavaScript, chạy trong trình duyệt, điện thoại và bản Windows.
  - Đầu vào là DXF 2000 của `dvd-acad-dxf.js` (`A.dxfR2000`), nên DWG giữ đúng những gì DXF giữ: bảng lớp / kiểu nét (cả kiểu nét có chữ, hình) / kiểu chữ / dimstyle / VPORT / APPID, khối + thuộc tính, DIMENSION (thẳng, chéo, góc 3 điểm, bán kính, đường kính), HATCH đặc và mẫu, LWPOLYLINE (cung, độ rộng), TEXT / MTEXT, SOLID / 3DFACE, ELLIPSE, XLINE / RAY, WIPEOUT, từ điển, LAYOUT, MLINESTYLE, XRECORD.
  - Viết theo tài liệu mở của Open Design Alliance và mã nguồn LibreDWG (cùng GPL-3.0): mã hoá bit, CRC-16, thứ tự trường, bố cục section giống AutoCAD 2000 (header → AuxHeader → ảnh xem trước BMP → biến hệ thống → lớp → đối tượng → bản đồ handle → ObjFreeSpace → header phụ → Template).
  - Dữ liệu riêng DVDCAD (XDATA "DVDCAD": khối 3D tham số, vùng, thứ tự vẽ, chú thích theo tỉ lệ; DVDCAD_DATA: ràng buộc, khối động) ghi thành EED chuẩn và một khối `DVDCADX1` giữa các section, vì bộ đọc WASM chưa đọc được EED của DWG 2000.
  - API: `A.dwgNative(ents)` → `Uint8Array`; `DVDDwg.dwgFromDxf(text, { bmp })` (chạy được trong Node để kiểm thử).
- `SAVEDWG` mặc định dùng bộ ghi gốc; DWG 2004 → 2018 vẫn qua ODA File Converter / máy chủ (`DWGSERVER`), không có thì tự ghi DWG 2000. `SAVEAS` / Ctrl+S chọn được `*.dwg`.
- Mở DWG: bỏ ATTRIB trùng (libredwg trả ATTRIB cả trong danh sách chung lẫn trong `INSERT.attribs`); đọc khối `DVDCADX1` của file do DVDCAD ghi.
- Kiểm tra:
  - 36 file DWG mẫu của LibreDWG (2000 → 2018) + `sample.dwg` (10 nghìn đối tượng): mở → ghi DWG gốc → mở lại, **giống hệt từng đối tượng** so với mở lại bản DXF 2000; LibreDWG đọc mọi file không cảnh báo.
  - `desktop/test/smoke.js` mục 7: SAVEDWG / SAVEAS *.dwg / bản vẽ tổng hợp (kích thước, hatch, chữ Việt, kiểu nét chữ/hình, khối 3D, vùng che) → DWG → mở lại.
  - GitHub Actions: ODA File Converter đọc + audit các file DWG do DVDCAD ghi (artifact `DVDCAD-DWG-kiem-tra`).
- Ký số bản Windows (không bắt buộc): secret `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (.pfx) hoặc Azure Trusted Signing; kiểm tra chữ ký sau khi dựng. Xem `HUONG-DAN-WINDOWS.md`.

## v5j: dòng lệnh và cách dùng lệnh như AutoCAD 2027
- `dvd-cmd.js` (thanh dòng lệnh):
  - Gợi ý khi gõ theo `INPUTSEARCHOPTIONS`: khớp đầu tên, giữa chuỗi, từ đồng nghĩa (`ROUND` → FILLET, `XOAY` → ROTATE), tự sửa lỗi gõ (sửa 3 lần thì tự chạy), biến hệ thống kèm giá trị, nội dung bản vẽ (lớp, khối, mẫu hatch, kiểu chữ). Xếp lệnh hay dùng lên đầu; phần còn lại của tên hiện mờ (→ / Tab để nhận).
  - Nút ✕ / Tuỳ chỉnh / Lệnh gần đây; `CLIPROMPTLINES`, độ trong suốt, neo ở đáy cửa sổ. Lời nhắc dài xuống dòng thay vì bị cắt.
  - ↑ / ↓ ở lời nhắc gọi lại nhập gần đây; ↓ mở danh sách tuỳ chọn cạnh con trỏ (DYNPROMPT); Tab khoá ô nhập động.
  - F1 theo ngữ cảnh: trang cách dùng của lệnh đang chạy (`dvd-help.js`) + **Tìm trên ribbon** (`A.ribbonFind`). Ctrl+F2 = cửa sổ chữ.
  - Lịch sử ghi "lời nhắc: câu trả lời" như AutoCAD, dạng mảnh để giao diện English dịch được (`log([...])`, `{ nt }` = giữ nguyên).
- `dvd-acad-core.js` (bộ nhập):
  - Nhập động: `x,y` của điểm thứ hai trở đi là tương đối (`DYNPICOORDS`), `#x,y` / `*x,y` tuyệt đối, `x,y,z`, `@` = LASTPOINT; số `1/2`, `3-1/2`, feet-inch `5'6"` (bản vẽ inch / feet).
  - Khoá góc `<45`, bộ lọc điểm `.X .Y .Z .XY .XZ .YZ`, `TT`, `FROM`, `M2P`; gõ số theo đường truy bắt (OTRACK / TT); Tab khoá độ dài / góc / X / Y.
  - Chọn đối tượng: `W`, `C`, `BOX`, `G`, `U`, `SI`, `M`, `AU`, `?` (thêm vào ALL / P / L / R / A / F / WP / CP có sẵn).
  - Lệnh trong suốt chạy lồng (`'CAL`, `'DIST`, `'ID`, `'ZOOM`, `'LAYER`, biến hệ thống…) rồi trở lại lệnh đang dở; `'CAL` trả kết quả cho lời nhắc.
  - Chuột phải: bấm nhanh = Enter, giữ = menu lệnh (`A.cmdMenu`); Shift + chuột phải = menu bắt điểm (`A.osnapMenu`).
- `dvd-acad-cmdline.js` (mới): menu chuột phải, `INPUTSEARCHOPTIONS`, `-LAYER`, `-INSERT`, `-OSNAP`, `UNDO` (số bước, BE/E, M/B), `MULTIPLE` hỏi trên dòng lệnh, 17 biến hệ thống mới (`A.sysvar.def`).
- `dvd-help.js` (mới): cách dùng của ~60 lệnh thông dụng + lời nhắc đầu của mọi lệnh (`tools/help/prompts.js` sinh tự động).
- Tuỳ chọn lệnh theo AutoCAD 2027: PLINE (Length, cung Angle / CEnter / CLose / Direction / Radius / Second pt), CIRCLE (Ttr), RECTANG (Chamfer / Fillet / Width / Area / Rotation), ELLIPSE (Arc), XLINE (Ang / Bisect / Offset), TEXT (Style, 15 kiểu canh lề), MTEXT (Height / Justify / Rotation / Style / Width), MOVE / COPY (Enter = độ dời, mOde, Exit), TRIM / EXTEND (Crossing / Fence / mOde / eRase, Boundary edges = B), FILLET (Trim, Shift = góc nhọn), CHAMFER (2 khoảng, Angle, Trim, mEthod), ZOOM (Center / Scale / 2X), AREA (Add / Subtract), DIST (Multiple), MEASUREGEOM (Distance / Radius / Angle / ARea), DIVIDE / MEASURE (Block), PEDIT (Fit / Spline / Decurve / Undo), OFFSET (Exit), DIMLINEAR (Mtext / Text), WIPEOUT (Polyline = P), `-BLOCK`.
- Kiểm thử: thêm mục 9 vào `desktop/test/smoke.js` (nhập động, khoá góc + `'CAL`, bộ lọc `.X`, script `-LAYER` + `UNDO BE/E`, gợi ý đồng nghĩa / sửa lỗi gõ / biến hệ thống, trợ giúp).

## v5i: bản Windows chạy offline + trang Start kiểu AutoCAD
- **DVDCAD cho Windows** (`desktop/`, Electron): bộ cài `DVDCAD-Setup-*.exe` và bản portable, chạy hoàn toàn offline. Hướng dẫn: **[HUONG-DAN-WINDOWS.md](HUONG-DAN-WINDOWS.md)**.
  - Toàn bộ app (cả bộ đọc DWG WASM) đọc thẳng từ ổ đĩa qua `dvdcad://app/`, không cần service worker hay mạng.
  - `OPEN` / Ctrl+O mở hộp thoại *Select File* của Windows (chọn nhiều file, mỗi file một tab). Ctrl+S ghi đè đúng file đã lưu; ghi qua file tạm nên không hỏng file cũ nếu lỗi giữa chừng.
  - Nhấp đúp file .dwg / .dxf trong Explorer (bộ cài gắn sẵn), kéo thả file vào cửa sổ. Chỉ một cửa sổ: file mở thêm thành tab mới.
  - Chỉ đọc / ghi file người dùng đã chọn; link web mở bằng trình duyệt mặc định.
  - GitHub Actions `.github/workflows/desktop-windows.yml` dựng bộ cài trên `windows-latest`; đẩy thẻ `v*` thì tạo Release.
- `dvd-desktop.js`: cầu nối trong giao diện (trên trình duyệt không làm gì).
- `dvd-acad-start.js`: tab **Start** là một trang riêng như AutoCAD (ẩn ribbon).
  - Bản vẽ mới theo mẫu: mm (acadiso), m, inch (acad). Ngoài ra có Mở…, Google Drive, Bản vẽ mẫu, và mục Tìm hiểu.
  - Bản vẽ gần đây dạng lưới ảnh thu nhỏ hoặc danh sách; tìm theo tên, sắp xếp, ghim, xoá khỏi danh sách, mở thư mục chứa file.
  - Tự hiện khi chưa mở bản vẽ nào; mở hoặc chuyển bản vẽ thì tự ẩn.
- `NEW` nhận mẫu đơn vị (`A.newDrawing({ units })`).
- `dvd-acad-pgp.js`: lệnh tắt mặc định giống `acad.pgp` của AutoCAD.
  - 207 / 226 lệnh tắt trỏ đúng lệnh. 19 lệnh tắt còn lại chưa có lệnh trong DVDCAD (render, sheet set, chuẩn bản vẽ…).
  - `DO` = DONUT (đo nhanh nay là `QM`), `T` = MTEXT (chữ một dòng vẫn là `DT`).
  - Thêm 26 lệnh tắt còn thiếu, như `PA`, `REA`, `RA`, `EXP`, `EPDF`, `ADC`, `ATI`, `BC`, `CLI`, `XB`, `TI`, `VSM`.
  - Lệnh tắt riêng của người dùng (ALIASEDIT) vẫn được ưu tiên.
- Biểu tượng: vẽ thêm cho mọi lệnh còn thiếu, như REGEN, OOPS, CLOSE, QUIT, GOTO và các lệnh đóng bảng.
  Biến hệ thống dùng chung một biểu tượng. Gợi ý lệnh ở dòng lệnh có biểu tượng như AutoComplete của AutoCAD.
- `LICENSE`: GPL-3.0 (mã nguồn mở, bắt buộc vì có LibreDWG).
- **Viết lại 3 mô-đun v4k bị thiếu** (`index.html` vẫn nạp nhưng chưa từng có trong repo, nên các lệnh dưới đây không chạy):
  - `dvd-acad-x3.js`:
    - Thứ tự vẽ: `DRAWORDER` / `DR` (F B A U), `TEXTTOFRONT`, `HATCHTOBACK`.
    - Vùng che: `WIPEOUT` / `WO` (điểm, D đa tuyến, F khung).
    - Chú thích theo tỉ lệ: `CANNOSCALE` (ô ▲ 1:N ở thanh trạng thái), `ANNOTATIVE`.
    - Lưu DWG: `SAVEDWG` / `DWGOUT`, `DWGSERVER`. Bản Windows chuyển bằng ODA File Converter trên máy (từ v5k: mặc định tự ghi DWG 2000).
  - `dvd-acad-x4.js`: ràng buộc tham số.
    - Lệnh: GC* (10 lệnh), DC* (6 lệnh), `GEOMCONSTRAINT`, `DIMCONSTRAINT`, `AUTOCONSTRAIN`, `PARAMETERS`, `DELCONSTRAINT`, `CONSTRAINTBAR`.
    - Bộ giải lan từ đối tượng vừa sửa ra ngoài và móc vào `A.commit`, nên mọi cách sửa đều giữ ràng buộc, U hoàn tác cả nhóm.
    - Giá trị là biểu thức (`d1*2`, `sqrt(d1^2+d2^2)`). Ràng buộc lưu kèm DXF.
  - `dvd-acad-x5.js`: khối động.
    - `BPARAMETER`: V hiển thị, L kéo giãn, F lật, X bỏ.
    - Đổi trạng thái bằng `BDYN` hoặc mục "Khối động" trong bảng Thuộc tính. Bản chèn mới tự nhận định nghĩa.
- Kiểm thử bộ cài thật: `desktop/test/installed.js` chạy trên `windows-latest` (cài lặng → kiểm tra file / gắn .dwg .dxf / lối tắt → chạy `smoke.js` trên `DVDCAD.exe` đã cài → gỡ cài).
- Bản phát hành: đẩy thẻ `v*` (vd `v5.9.0`), hoặc **Actions → DVDCAD Windows → Run workflow** trên `main` với `release_tag` = `v5.9.0`; ghi chú lấy từ `desktop/RELEASE-NOTES.md`.
- `sw.js`: nạp từng file riêng. Trước đây thiếu một file (404) làm hỏng cả bộ nhớ offline.
- Kiểm thử: `desktop/test/smoke.js` (29 bước). Gồm: mở DWG từ dòng lệnh, OPEN / SAVEAS / QSAVE qua hộp thoại, lưu lỗi, trang Start, lần chạy thứ 2, an toàn file / link, lệnh phục hồi + SAVEDWG, lệnh tắt acad.pgp.

## v5h: XCLIP giống AutoCAD
- `index.html`:
  - Bản ghi đường cắt `XCLIPS` (mã → `{bp: đa giác toạ độ khối, on, inv, cache}`); `xclipNew`, `xclipFor(R, bm)` (đường cắt WCS theo ma trận chèn, dùng chung 1 đối tượng), `xclipApply(list, R)`.
  - Thành viên khối: `xcl` (mã bản ghi), `xo` + `xh` (nằm ngoài, ẩn nhưng giữ trong bản vẽ), `xp` + `clip` (cắt ngang). Vẽ, bắt điểm (`isHiddenE`), phạm vi, chọn, khung nhìn layout bỏ qua `xh`.
  - Đường cắt đảo ngược: cắt canvas theo chẵn-lẻ (`clip('evenodd')`), đa giác có lỗ kiểu AutoCAD.
  - `drawXclipFrames` + `XCLIPFRAME` (đọc `$XCLIPFRAME` của DXF / DWG). Hoàn tác thao tác tự định nghĩa: `{op: 'fn', undo, redo}`.
- `dvd-acad-x17.js`: lệnh XCLIP (Bật / Tắt / Xoá / Tạo đa tuyến / Khung cắt mới: đa tuyến, đa giác, chữ nhật, đảo ngược), XCLIPFRAME; bọc `A.commit` để đường cắt đi theo khối khi dời / xoay / chép, bỏ khi phá khối.
- `dvd-acad-core.js`: `isHiddenB` (ẩn không tính XCLIP) cho chọn theo nhóm, `gripSel` bỏ phần ẩn.
- `dvd-acad-dxf.js`: khối ghi đủ thành viên + xdict → ACAD_FILTER → SPATIAL_FILTER (đỉnh WCS, ma trận nghịch đảo của INSERT). `dvd-acad-cmds.js` (R12): bỏ phần ẩn.
- Kiểm thử: `v5h_test.py` (25 bước, đọc lại DXF bằng ezdxf).

## v5g: XCLIP của file DWG / DXF
- `index.html`:
  - DWG: `dwgXclipMap(db)` đọc `db.objects.SPATIAL_FILTER` qua từ điển mở rộng của INSERT (`ownerDictionaryHardId` → ACAD_FILTER → SPATIAL); INSERT có `xc` (đa giác trong toạ độ khối).
  - DXF: đọc DICTIONARY / SPATIAL_FILTER trong OBJECTS; giữ mã 360 (`_DXF_SKIP`) để lấy xdict của INSERT.
  - `xclipBlockPoly`: đỉnh × ma trận nghịch đảo INSERT lúc cắt (12 số 40 đầu), 2 đỉnh = chữ nhật, mã 71 = 0 → bỏ.
  - `explodeInto` → `xclipRange`: bỏ đối tượng nằm hẳn ngoài, gắn `e.clip` `{x,y,w,h,poly,xc:1}` cho đối tượng cắt ngang.
  - `applyClip` cắt thêm `c.sub` (XCLIP trong khung nhìn layout); `ptInClip` dùng khi bấm chọn (`A.pickAt`).
- Kiểm thử: `v5g_test.py` (14 bước), file mẫu `test/xclip_test.dxf` (ezdxf: chữ nhật, tam giác, khối xoay kiểu AutoCAD, đường cắt tắt).

## v5f: lệnh AutoCAD còn thiếu
- `dvd-acad-x16.js`:
  - Khung nhìn layout: VPLAYER, LAYVPI, VPCLIP, VPSYNC, SPACETRANS. Dữ liệu riêng từng khung nhìn (`frz`, `cp`) lưu ở `localStorage` `dvd:vpx` theo bản vẽ + layout + số thứ tự khung nhìn, đọc qua `window.vpExtra(L, i)`.
  - Nhập / xuất: IMPORT, ATTACH, ACISIN, ETRANSMIT / ARCHIVE (`A.zipStore`: zip không nén, CRC32), TIFOUT, BMPOUT, XOPEN, REINIT, 3DPRINT, EXPORTTOAUTOCAD, RECOVERALL, XBIND.
  - MKLTYPE (`A.mkltPattern`), IMAGEFRAME, IMAGEQUALITY, SPOTLIGHT, DISTANTLIGHT, LIGHTLIST, SEPARATE (`A.meshParts`), AUTOCOMPLETE, DRAGMODE và các tên gọi khác.
- `index.html`: `buildPaperEntities` bỏ lớp đóng băng theo khung nhìn, thay khung bằng đường cắt; `applyClip` / `drawViewportFrames` cắt theo đa giác; `drawImageEnt` theo IMAGEFRAME / IMAGEQUALITY.
- `dvd-acad-pro.js`: xuất `A.saveLayoutDef`, `A.proIdbGet`, `A.xrefList`, `A.refreshLayout`; khung khung nhìn có `vpi`.
- `dvd-acad-3d.js`: đèn rọi (`SpotLight`), đèn song song (`DirectionalLight`), đèn tắt (`light.off`); dựng lại đèn khi bản vẽ đổi (`view3D.rebuildLights`).
- `dvd-cmd.js`: gợi ý lệnh theo `window.DVD_AUTOCOMPLETE`.
- Kiểm thử: `v5f_test.py` (45 bước kiểm tra).

## v5e: lệnh AutoCAD còn thiếu
- `dvd-acad-x15.js`:
  - Độ trong suốt: `e.tp` (CETRANSPARENCY, TRANSPARENCY, nút TP).
  - Giao diện: RIBBON / RIBBONCLOSE, COMMANDLINE(HIDE), PROPERTIESCLOSE, LAYERCLOSE, HIDE / SHOWPALETTES, GRAPHSCR, NAVBAR, WORKSPACE, QCCLOSE.
  - File: QUIT / EXIT / QQUIT, SAVEALL, REVERT, PREVIEW, LOGFILEON / OFF.
  - Lệnh: UNDEFINE / REDEFINE, MPEDIT, DIMLAYER, XDLIST, DCLINEAR, VIEWRES, LAYERPMODE, ARRAYCLOSE và các tên gọi khác.
  - 3D: MESH, CONVTOMESH / SOLID / SURFACE, 3DFACE, THICKEN.
- `index.html`: vẽ trong suốt (globalAlpha, không gộp nét), đọc DXF 440. `dvd-acad-dxf.js`: ghi 440.
- `dvd-cmd.js`:
  - Dòng "Độ trong suốt" trong bảng Thuộc tính (đối tượng mới / một / nhiều đối tượng).
  - UNDEFINE: danh sách lưu ở `dvd:undef`, tiền tố `.`.
- Kiểm thử: `v5e_test.py` (29 bước kiểm tra).

## v5d: add-in AutoLISP / JavaScript (APPLOAD)
- `dvd-lisp.js`: bộ thông dịch AutoLISP chạy bất đồng bộ.
  - Kiểu dữ liệu: số nguyên / số thực tách riêng, cặp chấm, tên đối tượng, tập chọn.
  - Phạm vi biến động (dynamic scope); `defun c:` thành lệnh DVDCAD.
  - Hỏi người dùng (`getpoint`…) chạy trong ngữ cảnh lệnh tạm, Esc thì huỷ hàm.
  - `(command …)` chờ từng lời nhắc qua `A.reqSeq`.
  - `entget` / `entmod` / `entmake` dùng mã DXF; tên đối tượng bền qua `_lid`, khối / kích thước theo nhóm.
  - Gõ được `(…)` và `!bien` ở dòng lệnh.
- `dvd-addins.js`:
  - APPLOAD: kho add-in lưu trong `localStorage` `dvd:addins`, Startup Suite.
  - VLISP (bảng gõ thử), API `window.DVDCAD` cho add-in `.js`, thẻ ribbon Add-ins.
- `addins/`: `qs-khoi-luong.js`, `lisp-tien-ich.lsp`. `ADDIN-API.md`: hướng dẫn viết add-in.
- `dvd-acad-core.js`: `A.run(…, { quiet })`, `A.reqSeq`. `dvd-cmd.js`: phím cách trong biểu thức LISP.
- Kiểm thử: `v5d_test.py` (36 bước kiểm tra).

## v5c: ngôn ngữ giao diện đồng bộ English / Tiếng Việt
- `dvd-i18n.js`: một công tắc ngôn ngữ chung (`DVDI18N`, khoá `dvd:riblang`, mặc định theo trình duyệt).
  - Khi chọn English, `MutationObserver` thay chữ hiển thị: nút chữ, `title`, `placeholder`, `aria-label`, `data-tl`, nút `<input>`, `alert` / `confirm` / `prompt`.
  - Cách thay: khớp nguyên câu trước. Không khớp thì thay từng mảnh, theo thứ tự dài trước.
  - Từ đơn chỉ dịch khi đứng cạnh số, `=`, `:`, `·` hoặc ngoặc.
  - Không dịch: phần trong "…", ô `.nm`, phần tử `translate="no"`, tên lớp / khối / layout.
  - Chuyển về Tiếng Việt thì trả lại chữ gốc.
- `dvd-i18n-en.js`: từ điển khoảng 4.100 mục, sinh từ chuỗi tiếng Việt trong mã bằng `tools/i18n/extract.py` + `build.py` (bản dịch gốc: `tools/i18n/translations.json`).
- `dvd-acad-ui.js`: ribbon dùng chung ngôn ngữ đó; menu Không gian làm việc có mục "Ngôn ngữ giao diện"; chú thích phụ tiếng Việt không còn hiện ở giao diện English.
- `manifest.webmanifest`: tên app "DVDCAD — DWG/DXF".
- Kiểm thử:
  - `v5c_test.py`: duyệt các thẻ ribbon, bảng Thuộc tính, khoảng 20 lệnh, 25 hộp thoại, menu, khung 3D, lịch sử lệnh; yêu cầu không còn chữ tiếng Việt và chuyển qua lại được.
  - Các bài cũ chạy với trình duyệt `vi-VN`.

## v5b: giống AutoCAD hơn — kích thước liên kết, đa tuyến rộng, POLYSOLID, mặt lưới
- `dvd-acad-x14.js`:
  - Kích thước liên kết (DIMASSOC 2, DIMDISASSOCIATE, DIMREASSOCIATE). Khi sửa đường hình, `A.commit` thêm các kích thước có gốc trùng điểm đặc trưng vào danh sách sửa, nên UNDO một lần trả lại cả hai.
  - Đa tuyến rộng: lưu `pw` = [x, y, rộng đầu, rộng cuối] theo đỉnh thật, dựng lại `wq` sau mỗi lần commit. `scaleEnt` nhân độ rộng.
  - Lệnh mới: POLYSOLID, RULESURF / TABSURF / REVSURF / EDGESURF / PLANESURF, SURFTAB1/2, VPOINT, DDVPOINT, HIDE, MINSERT, DIMROTATED, ABOUT, EXOFFSET, SAVEIMG, MTEDIT, EXCHPROP.
- `index.html`:
  - `widePoly()`: đọc LWPOLYLINE / POLYLINE có độ rộng (DXF, DWG), giữ kín + cung.
  - `polyWidthQuads` thêm phần lấp góc kiểu miter; mọi mảnh tô cùng chiều vòng nên tô không bị thủng.
- `dvd-acad-dxf.js`: ghi đa tuyến rộng thành LWPOLYLINE với 40 / 41 / 42 theo đỉnh.
- `dvd-acad-cmds.js`:
  - FILLET / CHAMFER P dùng cung thật cho mọi đa tuyến.
  - EXPLODE đa tuyến có cung ra ARC + LINE.
  - `A.chooseBlock`.
- `dvd-acad-3d.js`: kiểu xem "Khuất nét (HIDE)"; `view3D.setAzEl()` và `setStyle()`.
- Kiểm thử: `v5b_test.py`.

## v5a: xem 3D cập nhật khi bật / tắt lớp
- `dvd-acad-3d.js`: khi đang xem 3D, khung nhìn tự dựng lại nếu có một trong các thay đổi sau:
  - lớp ẩn / hiện;
  - màu lớp;
  - đối tượng bị ẩn (HIDEOBJECTS / ISOLATEOBJECTS);
  - số đối tượng.

  Nếu mở bản vẽ khác, khung 3D mở lại với bản vẽ mới. Trước đây chỉ sửa hình mới dựng lại.
- `dvd-acad-core.js`: chỉ đồng bộ trạng thái lớp từ bảng Lớp khi bảng đó thực sự đổi. Sửa được 3 lỗi:
  - LAYISO không tắt lớp nào;
  - LAYUNISO không khôi phục được;
  - LAYON sau cô lập bị bật lại.
- Kiểm thử: `v5a_test.py` dùng bản vẽ 3D của người dùng, gồm 15 bước kiểm tra; `d3.py` gồm 13 bước kiểm tra. Các bài cũ so nhãn phiên bản theo thứ tự (`>= v4x`) nên chạy được với v5.

## v4z: công cụ chữ, VIEWBASE, MSTRETCH…
- `dvd-acad-x13.js`: TJUST, TORIENT, TSCALE, TEXTFIT, TCIRCLE, MULTIPLE, HISTORY/TEXTSCR, ATTIPEDIT, XLIST, CHURLS, DELAY, DIMEX/DIMIM, MSTRETCH, VIEWBASE (3 hình chiếu, góc chiếu 1 / 3), BATTORDER, TEXTSTYLE.
- Kiểm thử: e2e_v4 sửa phép so sánh chữ (bảng Thuộc tính hiện tên loại bằng chữ HOA qua CSS); e2e_test cũ (giao diện trước v4) đã thay bằng e2e_v4.

## v4y: mở file dung lượng lớn + lệnh mới
- Đọc DXF không tách dòng, bỏ mã thừa (bộ nhớ tạm khi đọc file 37 MB: 174 → 86 MB). Giới hạn 2 triệu (máy tính) / 400 nghìn (điện thoại) đối tượng, có thông báo (trước bị cắt im lặng ở 200 nghìn).
- Phóng / dời bằng ảnh tạm của lớp nét rồi vẽ lại khi ngừng. Gom nét theo kiểu, ctx.arc cho tròn / cung, chữ không save/restore, chữ nhỏ thành vệt.
- `dvd-acad-x12.js`: QTEXT, FILL, ATTDISP, RECOVER, DIMREGEN, DIMJOGLINE, DIMINSPECT, GATTE, XEDGES, VPMAX/VPMIN, MSPACE/PSPACE, PAGESETUP.

## v4x: REVCLOUD như AutoCAD + lệnh mới
- `dvd-acad-x11.js`: REVCLOUD (cung lồi ra ngoài, cung nhỏ nhất / lớn nhất, Chữ nhật / Đa giác / Tự do / Đối tượng, Thường / Thư pháp, đảo chiều), REVCLOUDPROPERTIES, DIMOVERRIDE, BLOCKREPLACE, MOCORO, TCASE, CDORDER, HATCHGENERATEBOUNDARY, HATCHSETBOUNDARY, LAYTRANS, SHOWURLS, GETSEL, SSX, XPLODE, ARRAYCLASSIC.
- Đa tuyến rộng có cung: tứ giác tô khít nhau (không răng cưa).

## v4w: bổ sung lệnh còn thiếu so với AutoCAD
- `dvd-acad-x10.js`: DIM (kích thước thông minh), MLEDIT (chữ thập / chữ T / góc cho tường MLINE), ATTSYNC + BATTMAN, MLEADEREDIT / MLEADERALIGN / MLEADERCOLLECT, TRACE, 3DSCALE, FILTER, PASTEBLOCK, LIMITS, POLAR, VISUALSTYLES, DWGCOMPARE.
- PLINE W/H, PEDIT W (độ rộng), lưu DXF giữ độ rộng 40/41; đọc ATTDEF của khối trong DXF; đọc MLINE (DXF/DWG) thành đường đôi; DIMANGULAR chọn đường theo thứ tự nào cũng được.

## v4v: xem 3D file DWG 2007+
- Đọc dữ liệu ACIS nhị phân (SAB) của 3DSOLID trong DWG 2007 trở lên (`libredwg-web.js`: chép theo `sab_size` từ bộ nhớ WASM) → chế độ 3D hiện đủ khối.

## v4u: lưu DXF 2018
- Mặc định ghi DXF 2018 (AC1032): CLASSES, MATERIAL, MLEADERSTYLE, SCALELIST… như AutoCAD 2018; chữ UTF-8, màu RGB. `DXFVERSION`: 2018 / 2013 / 2010 / 2007 / 2004 / 2000 / Tự động / R12.
- Đọc DXF: màu RGB của lớp, giữ lớp rỗng.

## v4t: DXF giữ thêm màu RGB, WIPEOUT, thứ tự vẽ, ràng buộc
- Màu RGB (420, tự lên R2004), WIPEOUT thật, thứ tự vẽ theo thứ tự file, HATCH DOTS/EARTH/AR-CONC có đường mẫu.
- XDATA + XRECORD DVDCAD_DATA: ràng buộc tham số, khối động, chú thích theo tỉ lệ… mở lại còn nguyên.
- Hình ltypeshp.shx đúng số hiệu & hình; DXFVERSION thêm R2007 (UTF-8).

## v4s: lưu DXF R2000
- `dvd-acad-dxf.js`: ghi DXF AC1015 đầy đủ handle / BLOCK_RECORD / OBJECTS; bề rộng nét 370, LWPOLYLINE, MTEXT, HATCH (đặc + mẫu), ELLIPSE, XLINE/RAY, kiểu nét phức, khối + thuộc tính, DIMENSION. `DXFVERSION` để chọn lại R12.
- Đọc DXF/DWG: hatch giữ mẫu / tỉ lệ / góc; đường tròn, cung, elip trong khối giữ nguyên loại.

## v4r: cải tiến các giới hạn còn lại
- TRIM / BREAK / EXTEND / JOIN / FILLET / CHAMFER / REVERSE giữ cung của đa tuyến; từ khoá P không bị PAN chiếm.
- DXF: kích thước góc thành DIMENSION, bản khối sửa riêng thành khối biến thể.
- Kiểu nét có hình (FENCELINE, TRACKS, ZIGZAG, BATTING), nét đứt bắt đầu đúng mẫu; DATALINKURL (Google Sheets / CSV online, dùng được trên iPhone).

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
DVDCAD là phần mềm **mã nguồn mở** theo giấy phép **GNU GPL phiên bản 3 hoặc mới hơn** (xem [LICENSE](LICENSE)).
- Ai cũng được dùng, sửa và phân phối lại DVDCAD, kể cả cho mục đích thương mại. Bản phân phối lại phải giữ giấy phép GPL và kèm mã nguồn.
- **LibreDWG** (`libredwg-web.js`, `libredwg-web.wasm`) theo **GPL-3.0**, nên bản đóng gói (web và Windows) cũng phải theo GPL-3.0.
  Nguồn: https://github.com/mlightcad/libredwg-web và https://github.com/LibreDWG/libredwg
- Thư viện kèm theo giữ giấy phép riêng: three.js (MIT), pdf.js (Apache-2.0), SheetJS (Apache-2.0), polygon-clipping (MIT) — xem `vendor/`.
- DVDCAD dùng **tên lệnh và cách dùng giống AutoCAD** để người dùng chuyển sang không bỡ ngỡ, nhưng biểu tượng và mã nguồn là của riêng DVDCAD.
  DVDCAD không liên quan tới Autodesk; AutoCAD là thương hiệu của Autodesk, Inc.
