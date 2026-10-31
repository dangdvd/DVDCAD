# DVDCAD v6d — Lệnh & thao tác kiểu AutoCAD

Trên **máy tính** (màn hình rộng ≥ 900px, có chuột) DVDCAD hiện giao diện kiểu AutoCAD: ribbon, dòng lệnh, thanh trạng thái, bảng Thuộc tính, tab Model/Layout.
Trên **điện thoại** giữ giao diện gọn. Bấm nút **Công cụ** ở cột trái để mở bảng lệnh CAD, chạm lên bản vẽ để chọn điểm (tự bắt điểm). Thanh lệnh có nút **↵** (Enter) và **✕** (huỷ).

## Cách dùng chung (giống AutoCAD)
- Gõ lệnh hoặc lệnh tắt rồi bấm **Enter** hoặc **Space**. **Enter** khi trống sẽ lặp lại lệnh trước. **Esc** để huỷ.
- Lời nhắc hiện ở dòng lệnh, kèm cả câu trả lời trong lịch sử (vd `Chỉ định điểm tiếp theo [Hoàn tác]: @100,0`) như AutoCAD.
  Bấm vào **chữ vàng** trong `[...]` hoặc gõ chữ tắt để chọn tuỳ chọn; chữ tắt hiện nhỏ sau tên tuỳ chọn, vd `Hoàn tác(U)`.
- Chuột phải khi đang chạy lệnh: **bấm nhanh = Enter**, **giữ chuột phải** = menu (Enter, Huỷ, nhập gần đây, tuỳ chọn, cách chọn, bắt điểm tạm, 'ZOOM, 'CAL).
  **Shift + chuột phải** = menu bắt điểm 1 lần. Khi rảnh, chuột phải mở menu (lặp lệnh, sao chép/dán, di chuyển…).
- **Chọn trước rồi gõ lệnh** cũng được: MOVE, COPY, ERASE… sẽ dùng luôn các đối tượng đang chọn (`PICKFIRST`).
- Tên lệnh: `_LINE` (tên quốc tế), `.LINE` (lệnh gốc, bỏ qua UNDEFINE), `-LAYER` (bản dòng lệnh, dùng cho script), `'ZOOM` (trong suốt).
- Nhập điểm:
  - `x,y` (hoặc `x,y,z`): khi gõ ở ô **nhập động** cạnh con trỏ, điểm thứ hai trở đi là **tương đối** như AutoCAD; `#x,y` (hoặc `*x,y`) là tuyệt đối. Gõ khi chuột không ở trên bản vẽ, trong script hoặc LISP thì `x,y` là tuyệt đối. `DYNPICOORDS = 1` để luôn tuyệt đối.
  - `@dx,dy` là dời so với điểm trước, `@dài<góc` theo chiều dài và góc, `@` một mình là chính điểm cuối cùng (`LASTPOINT`).
  - Chỉ gõ **một số** thì đi theo hướng con trỏ (ORTHO / POLAR), hoặc theo đường truy bắt đang hiện (OTRACK / TT) tính từ điểm truy bắt.
  - `<45` khoá hướng 45° cho điểm kế tiếp (Angle Override), rồi bấm hoặc gõ độ dài.
  - Số có thể viết `2,5` `1/2` `3-1/2`. Bản vẽ đơn vị inch / feet nhận `5'6"`, `5'-6 1/2"`, `6"`.
  - **Tab** trong nhập động: khoá ô đang gõ (độ dài / góc, hoặc X / Y) rồi sang ô kia — vd `100` Tab `30` Enter.
  - **↓** ở lời nhắc có tuỳ chọn mở danh sách tuỳ chọn cạnh con trỏ; **↑ / ↓** gọi lại giá trị đã nhập gần đây.
- Bắt điểm một lần: khi được hỏi điểm, gõ `END`, `MID`, `CEN`, `INT`, `PER`, `TAN`, `NEA`, `QUA`, `NOD`, `INS`, `EXT`, `PAR`, `GCE` hoặc `NON`.
- `FROM`: chọn điểm gốc rồi gõ độ lệch (`@500,200`). `M2P`: trung điểm giữa 2 điểm. `TT`: điểm truy bắt tạm thời.
- Bộ lọc điểm `.X` `.Y` `.Z` `.XY` `.XZ` `.YZ`: lấy một phần toạ độ từ điểm thứ nhất, phần còn lại từ điểm thứ hai (`.X` của … `(cần YZ)`).
- **Lệnh trong suốt** (gõ `'` trước tên khi đang ở lời nhắc của lệnh khác): `'ZOOM` `'PAN` `'CAL` `'DIST` `'ID` `'LAYER` `'OSNAP` `'SETVAR` và mọi biến hệ thống (`'OSMODE`).
  Lệnh lồng chạy xong thì trở lại lệnh đang dở (`>>CAL` … `Tiếp tục lệnh LINE.`). `'CAL` đưa kết quả thẳng vào lời nhắc; `'ID` đặt LASTPOINT để gõ `@dx,dy` tiếp.
- Khi chọn đối tượng gõ được (`?` = liệt kê): `W` khung trùm, `C` khung cắt, `BOX`, `ALL`, `F` hàng rào, `WP` đa giác trùm, `CP` đa giác cắt, `G` theo tên nhóm, `L` vừa vẽ, `P` lần trước, `R` bỏ, `A` thêm lại, `U` hoàn tác lần chọn, `SI` chọn 1 lần là xong.
- Gõ thẳng **tên biến hệ thống** ở dòng lệnh để xem / đổi giá trị (vd `OSMODE`, `PDMODE`, `CLIPROMPTLINES`).

## Bổ sung như AutoCAD 2027 (v6h) — Express Tools đầy đủ và soạn khối động
- **Express Tools** còn thiếu nay đã có. `EXPRESSTOOLS` mở thẻ Express trên ribbon.
  - **Khối và thuộc tính**:
    - `ATTOUT` / `ATTIN`: xuất giá trị thuộc tính ra tệp văn bản (tab), sửa bằng Excel, rồi nhập lại theo handle.
    - `BSCALE`: đổi tỉ lệ từng khối quanh điểm chèn của nó.
    - `PSBSCALE`: tỉ lệ khối theo khổ giấy.
    - `BLOCKTOXREF`: ghi khối ra DWG rồi thay bản chèn bằng tham chiếu ngoài.
    - `SHP2BLK`: đổi hình SHAPE thành khối.
  - **Tô bằng khối**: `SUPERHATCH` lát khối lặp lại (khoảng cách X / Y) trong biên kín; chỉ giữ các ô nằm trọn trong biên.
  - **Chữ**:
    - `RTEXT` / `RTEDIT`: chữ tham chiếu, nội dung lấy từ tệp hoặc biểu thức DIESEL, tự cập nhật.
    - `PSTSCALE`: cao chữ trong Model để in ra đúng cao trên giấy.
    - `QLATTACH` / `QLATTACHSET` / `QLDETACHSET`: gắn / tách chữ với đường dẫn.
  - **Chọn và sửa**:
    - `FASTSEL`: chọn mọi đối tượng chạm vào đối tượng đã chọn.
    - `BTRIM` / `BEXTEND` / `TREX`: cắt, kéo dài dùng khối làm biên.
    - `CLIPIT`: cắt khối / ảnh theo đường bao.
  - **Tệp và đường dẫn**:
    - `PLT2DWG`: nhập tệp in HPGL `.plt` thành nét.
    - `MKSHAPE`: tạo hình `.shp` từ nét đã vẽ.
    - `REDIR` / `REDIRMODE`: đổi đường dẫn tham chiếu / ảnh / kiểu chữ.
    - `REPURLS`: thay địa chỉ siêu liên kết.
    - `MOVEBAK`: thư mục chứa tệp .bak.
    - `IMAGEAPP`: chương trình sửa ảnh.
  - **Khác**: `JULIAN`, `EDITTIME`, `LSP`, `LSPSURF`, `TFRAMES`, `EXPLAN`, `RTUCS`, `LAYOUTMERGE`.
- **Thư viện LISP `acet-*`** của Express Tools (116 hàm) mà nhiều tiện ích gọi tới. Gồm:
  - lỗi và biến hệ thống (`acet-error-init`, `acet-sysvar-set`);
  - danh sách, chuỗi (`acet-str-replace`, `acet-str-to-list`), tên tệp;
  - hình học (`acet-geom-ss-extents`…), tập chọn (`acet-ss-union`, `acet-ss-drag-move`…);
  - lớp, khối và thuộc tính (`acet-insert-attrib-get` / `-set`), giao diện (`acet-ui-message`, `acet-ui-getfile`).
- **Soạn khối động**:
  - `BTABLE` / `BLOOKUPTABLE`: bảng tra (Block Properties Table). Mỗi hàng là một bộ giá trị tham số; bấm **Áp dụng** để đặt bản chèn theo hàng đó.
  - `BAUTHORPALETTE`: bảng công cụ soạn khối.
  - `BACTION`, `BACTIONSET`, `BASSOCIATE`: mở BPARAMETER, vì DVDCAD gộp tham số và hành động.
  - `BTESTBLOCK`: thử khối.
  - `BCPARAMETER`: ràng buộc kích thước.
  - `BCONSTRUCTION`: hình dựng, ẩn ở mọi trạng thái.
  - `BWBLOCK`, `BXCLIP`, `BESETTINGS`, `BCYCLEORDER`, `BGRIPSET`, `BACTIONBAR`, `BLOCKICON`.

## Bổ sung như AutoCAD 2027 (v6g) — cài ứng dụng ngoài: gói .bundle, menu, reactor, Excel
- **Gói ứng dụng `.bundle`** (cách cài của Autodesk App Store, thư mục `ApplicationPlugins`): `APPLOAD` › **Nạp cả thư mục…** chọn thư mục `.bundle` (hoặc gói .zip).
  - DVDCAD đọc `PackageContents.xml`: tệp `.lsp` tự nạp khi mở hoặc nạp khi gõ lệnh, menu `.cuix` / `.cui` kèm `.mnl`.
  - Thành phần `.dll` / `.arx` / `.fas` được bỏ qua; gõ lệnh của chúng thì DVDCAD báo rõ là cần AutoCAD.
  - `APPAUTOLOADER`: liệt kê gói đã cài.
- **`MENULOAD` / `MENUUNLOAD`**: nạp / gỡ menu bổ sung `.cuix` / `.cui` hoặc menu cũ `.mnu` / `.mns`. Tệp `.mnl` cùng tên tự nạp như AutoCAD.
- **OPTIONS › Tệp**: đường dẫn tìm tệp hỗ trợ, vị trí tin cậy (`TRUSTEDPATHS`), ứng dụng đã cài. `SECURITYOPTIONS` mở tab này.
- **`NETLOAD`, `ARX`, `VBALOAD`, `VBARUN`, `VBAMAN`, `VBAIDE`**: có lệnh như AutoCAD, giải thích vì sao tệp `.dll` / `.arx` / `.dvb` không chạy được và cách thay thế.
- AutoLISP:
  - **reactor** phát sinh sự kiện (lệnh, thêm / sửa / xoá đối tượng, biến hệ thống, nhấp đúp, lưu bản vẽ);
  - **Excel** qua COM (`vlax-get-or-create-object "Excel.Application"`) ghi được tệp `.xlsx` thật;
  - **`Scripting.FileSystemObject`**, **`Scripting.Dictionary`**, **`WScript.Shell`**;
  - các hàm **DOSLib** hay dùng (`dos_msgbox`, `dos_listbox`, `dos_strtokens`…).
  - Chi tiết: `ADDIN-API.md`.

## Bổ sung như AutoCAD 2027 (v6f) — tiện ích LISP chạy đúng như trên AutoCAD
- **Tuỳ chọn kiểu quốc tế** `_W`, `_J`, `_E`, `_END`… (dấu gạch dưới trước tuỳ chọn) và tên tuỳ chọn tiếng Anh đầy đủ (`Width`, `Justify`, `Rectangular`…) dùng được ở mọi lời nhắc, như AutoCAD. Script `.scr` và LISP viết cho AutoCAD bản tiếng Anh chạy được nguyên văn.
- **Lệnh bản dòng lệnh** (cho script / LISP), hỏi lần lượt như AutoCAD, không mở hộp thoại:
  - `-HATCH`: điểm bên trong / `S` chọn đối tượng / `P` mẫu (tên, tỉ lệ, góc) / `CO` màu / `LA` lớp; Enter = tô.
  - `-ARRAY`: mảng cổ điển (bản sao rời): `R` hàng, cột, khoảng cách hàng, cột; `P` tâm, số phần tử, góc điền, có xoay không.
  - `-ATTDEF`: chế độ (Ẩn / Cố định / Kiểm tra / Đặt sẵn), tag, lời nhắc, mặc định, điểm (Canh lề / Kiểu chữ), cao chữ, góc.
  - `-TABLE`: số cột, số hàng dữ liệu, điểm chèn (`W` rộng cột, `H` cao hàng).
  - `-WBLOCK`: tên tệp (`.dwg` ghi DWG 2018, còn lại DXF), rồi tên khối / `=` / `*` (cả bản vẽ) / Enter (chọn đối tượng).
  - `-INSERT`: `S` tỉ lệ, `R` góc ở lời nhắc điểm chèn (không hỏi lại); `*TÊN` chèn rồi phá khối.
- **`LEADER`** như AutoCAD: bấm các điểm, Enter, rồi gõ chữ từng dòng (dòng trống = xong). `MLEADER` vẫn là ghi chú dẫn nhiều dòng.
- **`CHANGE`** tách khỏi CHPROP như AutoCAD: điểm thay đổi (dời đầu đường thẳng gần nhất, đổi bán kính tròn, vị trí / kiểu / cao / góc / nội dung chữ) hoặc `P` để đổi thuộc tính.
- **XDATA** (dữ liệu riêng của tiện ích gắn vào đối tượng) đọc / ghi trong DXF và DWG như AutoCAD.
- AutoLISP: đủ biến hệ thống tiện ích hay đọc (`DIMSCALE`, `CDATE`, `CTAB`, `USERI1`…), `ssget` có bộ lọc logic, `entmake` tạo hatch / kích thước / định nghĩa khối / thuộc tính, ActiveX `InsertBlock`, `GetAttributes`, `AddHatch`, `AddDimAligned`, `AddTable`, `SelectionSets`, `TrueColor`… Chi tiết: `ADDIN-API.md`.

## Bổ sung như AutoCAD 2027 (v6e) — chạy bộ tiện ích LISP của AutoCAD
- **Nạp cả bộ tiện ích**: `APPLOAD` › **Nạp cả thư mục…** (chọn thư mục cài bộ LISP) hoặc **Nạp file…** chọn gói **.zip** / nhiều tệp cùng lúc.
  - Mọi tệp `.lsp`, `.dcl`, `.lin`, `.pat`, `.csv`, `.mnl`… được chép vào **thư mục hỗ trợ** của DVDCAD (như Support File Search Path của AutoCAD). Lệnh `SUPPORTFILES` để xem / xoá.
  - Hộp thoại liệt kê các tệp `.lsp` để chọn tệp nào **nạp ngay và tự nạp khi mở DVDCAD** (Startup Suite).
  - `acad.lsp`, `acaddoc.lsp`, `*.mnl` tự chạy khi mở DVDCAD, rồi Startup Suite, rồi `S::STARTUP` (thứ tự như AutoCAD). `(autoload "tep" '("LENH"))` nạp tệp khi gõ lệnh lần đầu.
  - Tệp soạn trên Windows theo bảng mã ANSI tiếng Việt (Windows-1258) đọc đúng dấu.
  - Tệp `.fas` / `.vlx` / `.dll` / `.arx` trong bộ được liệt kê và bỏ qua, có giải thích (xem cuối mục).
- **Hộp thoại DCL**: `load_dialog`, `new_dialog`, `start_dialog`, `action_tile`, `set_tile`, `get_tile`, `mode_tile`, `start_list` / `add_list` / `end_list`, `start_image` / `fill_image` / `vector_image`, `done_dialog`… Tile: hàng / cột / khung, `edit_box`, `popup_list`, `list_box`, `toggle`, `radio_button`, `button`, `slider`, `image`, `image_button`, `text`, `ok_cancel`… Enter = nút mặc định, Esc = Huỷ.
- **ActiveX (vla- / vlax-)**: `vlax-get-acad-object`, `vla-get-ActiveDocument`, `vla-get-ModelSpace`, `vla-AddLine` / `AddCircle` / `AddLightWeightPolyline` / `AddText` / `AddBlockReference`…, `vla-get-` / `vla-put-` thuộc tính (Layer, Color, Length, Area, Coordinates, TextString…), `vla-Move` / `Rotate` / `ScaleEntity` / `Mirror` / `Offset` / `Delete`, `vlax-for` duyệt lớp / khối, safearray / variant, `:vlax-true` / `:vlax-false`.
- **vlax-curve-**: chiều dài, điểm, tham số, điểm gần nhất, đạo hàm, diện tích cho đoạn thẳng, cung, tròn, elip, đa tuyến có cung. Tham số giống AutoCAD (đa tuyến = chỉ số đỉnh).
- **Hàm khác**: đọc / ghi tệp (`open`, `read-line`, `write-line`, `close`, `findfile`, `vl-file-…`), `getfiled`, `grread` (phím, di chuột, bấm chuột), `grdraw` / `grvecs`, `tblnext`, `tblobjname`, `entmake` INSERT (chèn khối), `entmakex`, `textbox`, `cvunit`, `acad_colordlg`, `vl-registry-…`, `getcfg` / `setcfg`, một số hàm Express Tools (`acet-…`) hay dùng. Danh sách đầy đủ: `ADDIN-API.md` (lệnh `ADDINAPI`).
- **Không chạy được**:
  - `.fas` / `.vlx`: LISP đã **biên dịch và mã hoá** cho riêng máy ảo LISP của AutoCAD, không có mã nguồn để đọc. Nhiều bộ tiện ích thương mại chỉ phát hành dạng này (kèm khoá bản quyền), nên cần xin tác giả bản `.lsp` hoặc bản dành cho DVDCAD.
  - `.dll` / `.arx` / `.crx` / `.dvb`: chương trình Windows (.NET, ObjectARX, VBA) chạy **bên trong tiến trình AutoCAD**, gọi thẳng thư viện của Autodesk. Phần mềm khác không nạp được.
  - Reactor (`vlr-…`) tạo được nhưng chưa phát sinh sự kiện; `trans` / `osnap` trả nguyên điểm; `entmake` HATCH / DIMENSION / định nghĩa khối chưa có (dùng `command`).

## Bổ sung như AutoCAD 2027 (v6d)
- **Độ trong suốt theo lớp** (Layer Transparency):
  - Cột **Độ trong suốt** trong bảng Lớp (bấm để nhập 0–90). `-LAYER` có tuỳ chọn **Trong suốt** (TR).
  - Đối tượng có độ trong suốt "ByLayer" lấy theo lớp. Bật **TPY** ở thanh trạng thái để thấy.
  - Đọc / ghi DXF và DWG 2004 → 2018 như AutoCAD: XDATA `AcCmTransparency` (mã 1071) trên lớp. Mở tệp DWG / DXF của AutoCAD cũng đọc được.
  - Trạng thái lớp (`LAYERSTATE`, `LAYERP`) lưu cả độ trong suốt.
- **ETRANSMIT / ARCHIVE**: hộp thoại chọn **định dạng bản vẽ trong gói**: DWG 2018 / 2013 / 2010 / 2007 / 2004 / 2000 hoặc DXF; **nén .zip** (deflate). `-ETRANSMIT`: không hỏi, DWG 2018, nén.
- **REVCLOUD › Sửa** (Modify): chọn mây → điểm đầu trên mây → các điểm mới → điểm cuối trên mây → Enter → chọn phía cần bỏ. Mây hở: bỏ đoạn giữa hai điểm.
- **POLYSOLID**: tuỳ chọn **Cung** khi vẽ theo điểm — cung tiếp tuyến đoạn trước, hoặc **Điểm thứ hai** (cung 3 điểm); **Đường thẳng** để quay lại. **Đóng** khi đang ở chế độ Cung thì khép bằng cung.
- **EXTEND** đa tuyến có đoạn **đầu hoặc cuối là cung**: kéo dài cung theo đúng đường tròn của nó tới ranh giới gần nhất, giữ chiều cung.

## Bổ sung như AutoCAD 2027 (v6c)
- **DWFx ePlot (XPS Compatible).pc3** trong danh sách máy in của `PLOT`:
  - Ghi tệp `.dwfx` vector: đường nét, tô, gradient, ảnh, chữ **nhúng phông TrueType** (chọn / tìm được chữ, đủ dấu tiếng Việt).
  - Gói gồm phần XPS (mở bằng trình xem XPS của Windows) và phần DWF (manifest, trang ePlot với khổ giấy mm) như tệp DWFx của AutoCAD.
  - `PUBLISH`: mục **Xuất ra: DWFx** — mỗi layout một trang trong cùng một tệp `.dwfx`.
- **Thuộc tính… của máy in Windows** (chọn máy in đã cài trong `PLOT` rồi bấm **Thuộc tính…**): ngoài độ sâu màu có thêm
  **In màu / Đen trắng**, **In hai mặt** (lật cạnh dài / cạnh ngắn), **Độ phân giải** (300 / 600 / 1200 dpi), **Xếp bộ** khi in nhiều bản. Các tuỳ chọn này gửi kèm lệnh in thẳng.
- **Chưa có**: DWF6 ePlot (`.dwf`, luồng W2D) — chưa có bộ đọc chuẩn để kiểm chứng tệp ghi ra; dùng DWFx thay.

## Bổ sung như AutoCAD 2027 (v6b)
- **Plot Preview** (nút **Xem trước…** trong hộp PLOT, bấm vào hình xem trước nhỏ, hoặc lệnh `PREVIEW` / `PRE`):
  - Trang in vẽ bằng **nét vector** — phóng to bao nhiêu chữ và đường nét vẫn sắc nét, bề dày nét đúng như khi in.
  - **Lăn chuột**: phóng to / thu nhỏ quanh con trỏ. **Kéo chuột trái** (chế độ Pan) hoặc **chuột giữa**: dời hình. Bấm đúp: phóng to ×2.
  - Thanh công cụ và **menu chuột phải** như AutoCAD: **In** (= OK), **Pan**, **Zoom** (kéo lên / xuống), **Zoom Window** (kéo khung), **Zoom Original** (vừa trang), **Thoát**.
  - Phím: **Esc / Enter** thoát, `+` / `-` phóng to / thu nhỏ, `Home` vừa trang. Màn hình cảm ứng: chụm hai ngón để zoom.
- **Máy in / máy vẽ** như danh sách của AutoCAD:
  - `DWG To PDF.pc3`, `AutoCAD PDF (General Documentation / High Quality Print / Smallest File / Web and Mobile).pc3`, `Default Windows System Printer.pc3`, `PublishToWeb PNG / JPG.pc3`, HPGL/2.
  - **Bản Windows**: thêm **mọi máy in đã cài trong Windows** (theo tên, như AutoCAD). Chọn máy in rồi OK là in thẳng nét vector ra máy đó, không qua hộp in của Windows. Ô **Số bản** dùng được.
  - **Máy in Windows (hộp in hệ thống)**: vẫn mở hộp in của Windows để chọn máy và tuỳ chọn.
- **Khổ giấy đầy đủ như DWG To PDF.pc3** (89 khổ, chia nhóm):
  - ISO A (4A0, 2A0, A0 → A6), ISO B (B0 → B5), ISO C (C0 → C6); **ISO full bleed** (không lề); **ISO expand** (A0 → A4).
  - ANSI A → F, ARCH A → E3, mỗi loại có bản **full bleed** và **expand**; JIS B4 / B5, Legal; khổ tự chọn.
  - Chọn khổ thì ô **Lề** tự đặt theo khổ: full bleed 0 mm, expand 3 mm, ISO 5 mm, ANSI / ARCH 6,35 mm (sửa lại được).
  - Tên khổ ghi vào DWG / DXF đúng tên chuẩn của AutoCAD (vd `ISO_A3_(420.00_x_297.00_MM)`, `ISO_full_bleed_A1_(...)`); `PSETUPIN` đọc lại đúng khổ.
- **Mọi cách xuất PDF đều là PDF vector** (đường nét + chữ nhúng phông, phóng to vẫn sắc nét):
  - PLOT với các máy in PDF, nút **Xuất → PDF** (chọn khổ A4 → A0 / khít nội dung), **Xuất mọi layout ra PDF**, `PUBLISH`.
  - Trước đây nút Xuất → PDF và PUBLISH bản cũ ghi ảnh JPEG 300 dpi (phóng to bị mờ).

## Bổ sung như AutoCAD 2027 (v6a)
- **Lưu DWG 2007 gốc (AC1021), không cần ODA File Converter**:
  - `SAVEDWG` / `DWGSERVER` có dòng **DWG 2007 — bộ ghi sẵn có**. `DWGCONVERT` đổi hàng loạt sang DWG 2007.
  - Chọn dòng "chuyển qua ODA" mà máy không có ODA thì DVDCAD tự ghi DWG 2007 gốc (trước đây ghi DWG 2004).
  - Kiểm tra: ODA File Converter, ACadSharp và LibreDWG đều đọc được bản vẽ DWG 2007 do DVDCAD ghi.
- **Mở DWG 2007**: các trang dữ liệu không nén được (ảnh, dữ liệu nhị phân lớn) nay đọc đúng — bản vẽ lớn không còn mất đối tượng.
- **Máy in đặt giảm màu** (256 màu / đen trắng trong **Thuộc tính…** của máy in Windows) nay cũng in **nét vector**:
  - Màu theo bảng màu của máy in; màu không có trong bảng mà kiểu in bật dither thì giả bằng mẫu chấm vector, tắt dither thì lấy màu gần nhất (nét đặc).
  - Ảnh trong bản vẽ giảm màu từng điểm ảnh (Floyd–Steinberg). Không còn độ trong suốt (như máy vẽ).
- **Chưa có**:
  - Hình chiếu lưu cùng bản vẽ dạng nét thường: AutoCAD không coi là hình chiếu liên kết (định dạng không công bố).
  - Phông nét đơn thay thế giống phông AutoCAD về kiểu dáng, nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc.

## Bổ sung như AutoCAD 2027 (v5z)
- **Phông thay thế khi thiếu phông SHX (`FONTALT`)**, như AutoCAD:
  - DVDCAD kèm các phông nét đơn mã nguồn mở của LibreCAD (GPL v2+). Bản vẽ dùng phông `.shx` chưa nạp thì vẽ bằng phông nét đơn tương ứng thay cho phông TrueType: `txt` → standard, `simplex`, `romans`, `romand`, `isocp…` → iso, `italic` → italicc. Phông khác dùng phông đặt trong `FONTALT` (mặc định `simplex.shx`).
  - Dấu tiếng Việt (sắc, huyền, hỏi, ngã, nặng, mũ, trăng, móc, đ) được ghép bằng nét đơn.
  - In, PDF, EPS / WMF / HPGL, `TXTEXP` đều theo nét của phông thay thế.
  - `FONTALT` = `.` thì không thay thế (vẽ bằng phông TrueType như trước). Nạp phông `.shx` gốc bằng `SHXFONTS` thì dùng đúng phông gốc.
- **In thẳng ra máy in bằng nét vector**:
  - `PLOT` → máy in Windows gửi bản in dạng vector (đường nét, chữ là chữ) thay cho ảnh 300 dpi. Bản in sắc nét hơn, tệp in nhỏ hơn.
  - Nếu đã đặt máy in giảm màu (256 màu / đen trắng có dither trong **Thuộc tính…**) thì vẫn in ảnh như trước.
- **PDF trên trình duyệt có chữ thật**: kèm phông Liberation Sans / Serif (SIL OFL, cùng số đo với Arial / Times New Roman). Máy không cung cấp phông thì PDF nhúng các phông này, chữ tiếng Việt vẫn chọn / tìm / sao chép được.
- **Chưa có**:
  - Hình chiếu lưu cùng bản vẽ dạng nét thường: AutoCAD không coi là hình chiếu liên kết (định dạng không công bố).
  - DWG 2007 gốc (AC1021) vẫn cần ODA File Converter.
  - Phông nét đơn thay thế giống phông AutoCAD về kiểu dáng, nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc.

## Bổ sung như AutoCAD 2027 (v5y)
- **PDF vector khi in** (`PLOT` → **DWG To PDF.pc3**, và `PUBLISH`):
  - Bản vẽ ghi thành đường nét PDF thật (đường, cung, hatch, vùng tô, gradient, nét đứt, bề rộng nét), không còn là ảnh chụp. Phóng to bao nhiêu cũng sắc nét, tệp nhỏ hơn.
  - Chữ là chữ thật: nhúng phông TrueType / OpenType của Windows (chỉ các ký tự dùng tới), đủ dấu tiếng Việt; chọn, tìm, sao chép được trong trình đọc PDF.
  - Chữ phông SHX in bằng nét đơn của phông. Chữ rất nhỏ vẫn in thành chữ, không thay bằng vạch như bản in ảnh.
  - Ảnh (IMAGE, bản đồ nền) nhúng đúng chỗ. Layout in đúng khung nhìn (cả khung nhìn xoay, đa giác cắt). Dấu in, in lộn ngược như bản in ảnh.
- **Hộp `PLOT` đủ như AutoCAD**:
  - Máy in / máy vẽ: DWG To PDF.pc3, AutoCAD PDF (High Quality Print).pc3, AutoCAD PDF (Smallest File).pc3 (ảnh nén nhỏ), máy in Windows, PublishToWeb PNG.pc3, PublishToWeb JPG.pc3, HP DesignJet (HPGL/2).pc3.
  - Khổ giấy: ISO A0–A5, ANSI A–E, ARCH A–E1, **Khổ tự chọn…** (nhập rộng × cao, mm).
  - **In ra file**: với máy in Windows thì ghi ra tệp PDF thay vì gửi máy in. Các thiết bị khác luôn ra tệp như AutoCAD.
  - **In độ trong suốt**, **In theo kiểu in** (tắt = in đúng màu bản vẽ), **Co giãn bề rộng nét** (bề rộng nét theo tỉ lệ in) đều dùng được.
  - **Áp cho layout**: lưu thiết lập in cho Model / layout hiện hành, mở `PLOT` lần sau tự dùng lại.
  - Thiết lập trang có tên ghi vào DXF / DWG đúng tên khổ của AutoCAD (vd `ANSI_full_bleed_D_(34.00_x_22.00_Inches)`, `User_(500.00_x_350.00_MM)`) và đúng máy in .pc3.
- Các hạn chế của v5y đã được xử lý ở v5z (xem mục trên).

## Bổ sung như AutoCAD 2027 (v5x)
- **Xoay nhìn khung nhìn (VIEWTWIST)** trong layout:
  - Đọc và ghi góc xoay khung nhìn của tệp DXF (mã 51) và DWG 2000 / 2004 / 2018 như AutoCAD. Mô hình hiện nghiêng đúng góc trên giấy.
  - `VPEDIT` có cột **Xoay nhìn (°)**, đo ngược chiều kim đồng hồ.
  - `ALIGNSPACE` với hai cặp điểm lệch hướng: khung nhìn **xoay theo**, rồi đổi tỉ lệ và vị trí để cả hai cặp điểm trùng nhau.
  - Khi xoay nhìn, `VPSYNC`, `CHSPACE` và `VPMAX` đều tính cả góc xoay. `VPMAX` xoay khung Model theo khung nhìn.
- **MTEXT nhiều phông, phông SHX trong chữ có định dạng**:
  - Mỗi đoạn chữ có thể dùng phông riêng: bôi đen đoạn chữ rồi chọn phông trong tab **Soạn chữ**. Hộp phông có cả phông `.shx` đã nạp.
  - Đoạn dùng phông SHX vẽ bằng nét phông. Bề rộng, xuống dòng và cột tính theo phông thật.
  - Đọc mã `\F` (phông SHX) và `\f` (phông TrueType) trong MTEXT của AutoCAD. Lưu DXF / DWG ghi lại đúng mã đó.
  - Nếu mọi đoạn đều dùng phông SHX thì in, xuất EPS / WMF / HPGL và `TXTEXP` theo nét đơn của phông.
- **Thiết lập trang có tên ghi vào DXF / DWG** (PLOTSETTINGS trong từ điển ACAD_PLOTSETTINGS):
  - Thiết lập lưu bằng PLOT / PAGESETUP / `PSETUPIN` có trong Page Setup Manager của AutoCAD: khổ ISO, hướng, vùng in, tỉ lệ, giữa trang, bảng kiểu in, máy in (.pc3).
  - `PSETUPIN` đọc thiết lập trang có tên trong DWG của AutoCAD. Đã đối chiếu với tệp DWG 2013 thật do AutoCAD lưu.
  - Đã sửa: vùng in **Display** (màn hình) trước đây bị đọc thành Extents. Tỉ lệ chuẩn "vừa khổ giấy" đọc đúng như AutoCAD.
- **`SYSWINDOWS` thành cửa sổ con thật**:
  - **Lát dọc / Lát ngang / Xếp chồng**: bản vẽ hiện hành vẽ và sửa ngay trong ô của nó (lệnh, chọn, bắt điểm như thường). Các ô khác hiện ảnh bản vẽ.
  - Bấm một ô khác: bản vẽ đó thành hiện hành ngay trong ô của nó. Phần sửa ở bản vẽ trước vẫn giữ.
  - Nút **□** trên thanh tên, hoặc gõ `SYSWINDOWS` lần nữa: trở về một cửa sổ. **Thu nhỏ**: các thanh tên ở đáy, bấm để mở.
- **Chưa có**:
  - Hình chiếu lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình.
  - Mỗi lúc chỉ một bản vẽ hiện hành (như AutoCAD). Ô của bản vẽ khác hiện ảnh lúc rời bản vẽ đó.

## Bổ sung như AutoCAD 2027 (v5w)
- **`WMFIN`**: nhập Windows Metafile (`.wmf`) thành khối `WMF0`, `WMF1`… như AutoCAD.
  - Hỏi điểm chèn (góc trên trái), tỉ lệ, góc xoay.
  - Đọc được nét, đa giác, chữ nhật, elip, cung, hình quạt, chữ (cả bảng mã tiếng Việt 1258), vùng tô đặc và tô gạch.
  - `WMFOPTS`: **Khung dây** (bỏ vùng tô), **Nét rộng** (giữ bề rộng bút).
- **`VIEWSECTION` → Kiểu (T)**: đủ 4 loại mặt cắt như AutoCAD:
  - **Toàn phần**: 2 điểm.
  - **Nửa**: điểm đầu → điểm giữa → điểm cuối. Nửa có đoạn cắt được gạch, nửa còn lại vẽ hình nhìn ngoài.
  - **Bậc** (offset): đường cắt gấp khúc, các đoạn song song / vuông góc. Mỗi đoạn cắt qua chỗ của nó, không vẽ đường ghép giữa các dải.
  - **Cắt xoay** (aligned): đoạn xiên được xoay trải phẳng về cùng mặt phẳng với đoạn đầu.
  - Đường cắt gãy có nét đậm ở mỗi chỗ gãy, mũi tên vuông góc từng đầu. `VIEWUPDATE` và lưu / mở lại giữ đúng kiểu mặt cắt.
- **Phông SHX cho chữ** (`SHXFONTS`, hoặc STYLE → **Phông SHX…**, hoặc `LOAD` tệp phông):
  - Nạp phông `.shx` có sẵn trên máy: phông thường (txt, simplex, romans…), **unifont** và **bigfont** (chữ Trung / Nhật / Hàn).
  - Kiểu chữ dùng phông `.shx` thì chữ vẽ bằng nét của phông như AutoCAD (cỡ chữ = chiều cao chữ hoa). Áp cho cả chữ trong tệp DXF / DWG của AutoCAD.
  - Ký tự phông không có → lấy từ big font → không có nữa thì vẽ bằng phông TrueType.
  - Hộp STYLE: chọn phông `.shx`, **Dùng Big Font**, xem trước bằng nét phông.
  - Lưu DXF / DWG ghi tên phông và bigfont vào bảng STYLE. In, xuất PDF / EPS / WMF / HPGL, `TXTEXP` đều theo nét phông.
  - Phông đã nạp được nhớ lại cho lần sau. Mở bản vẽ dùng phông chưa nạp thì dòng lệnh báo tên phông còn thiếu.
- **`GCSMOOTH`**: ràng buộc trơn (G2).
  - Chọn spline (gần đầu cần nối), rồi đường thứ hai (đường thẳng, cung, đa tuyến hoặc spline khác).
  - Đầu spline nối liền, cùng tiếp tuyến và cùng độ cong. Sửa đường kia thì spline tự chỉnh theo.
  - `GEOMCONSTRAINT` có thêm tuỳ chọn **Trơn** và **Đối xứng**.
- **`ALIGNSPACE`** (Express Tools, tab Bố cục):
  - Bấm 1–2 điểm của mô hình trong khung nhìn, rồi 1–2 điểm tương ứng trên giấy.
  - Khung nhìn đổi tỉ lệ và vị trí nhìn cho các điểm trùng nhau.
- **`SYSWINDOWS`**: xếp các bản vẽ đang mở **Lát dọc / Lát ngang / Xếp chồng / Thu nhỏ** (tab Hiển thị → Xếp bản vẽ).
  - Mỗi ô là ảnh bản vẽ ở góc nhìn đang dùng; bấm ô để làm bản vẽ hiện hành, Esc để trở lại.
- **`PSETUPIN` đọc DWG của AutoCAD**:
  - Liệt kê thiết lập trang có tên và thiết lập riêng của từng layout (`*Layout1*`… như Page Setup Manager). Khổ giấy, hướng, vùng in, tỉ lệ, máy in, bảng kiểu in.
  - Kết quả giống như khi đọc bản DXF của cùng bản vẽ.
- Các hạn chế còn lại của v5w đã được xử lý ở v5x (xem mục trên).

## Bổ sung như AutoCAD 2027 (v5v)
- Ribbon có thêm tab **Bố cục** (*Layout*): **Hình chiếu**, **Layout**, **Thiết lập trang**. Các lệnh mới khác nằm trong tab Chèn, Tham số, Hiển thị, Quản lý, Xuất và tab Trang chủ của không gian 3D.
- **Smart Blocks**:
  - `BCONVERT` (`SMARTBLOCKSCONVERT`): chọn một bản chèn khối làm mẫu, hoặc **Đối tượng** để tạo khối mới từ các nét rời. DVDCAD tìm các nhóm nét rời có cùng hình (kể cả đã xoay, khác tỉ lệ nếu bật) rồi hiện danh sách để chọn. **Đổi** thay các nhóm đó bằng bản chèn khối.
  - `SMARTBLOCKSDETECT`: chỉ tìm và chọn các vị trí giống khối.
  - **Cài đặt tìm**: có xoay, có khác tỉ lệ, dung sai.
- **Đếm**: `COUNTNEXT` / `COUNTPREV` phóng tới bản chèn kế tiếp / trước của khối đang đếm. `COUNTREFRESH` đếm lại thanh đếm, bảng Count, trường và bảng đếm.
- **Hình chiếu từ mô hình 3D** (*Model Documentation*, tab Bố cục):
  - `VIEWBASE`: hình chiếu cơ sở từ khối 3D. Tuỳ chọn: hướng (Trên / Dưới / Trái / Phải / Trước / Sau / ISO), nét khuất, tỉ lệ, kiểu chiếu. Đặt xong là đặt tiếp các **hình chiếu phụ**: sang phải / trái / trên / dưới, kéo chéo là hình ISO.
  - `VIEWPROJ`: thêm hình chiếu phụ từ một hình chiếu có sẵn.
  - `VIEWSECTION`: mặt cắt toàn phần qua 2 điểm. Có đường cắt, mũi tên, chữ A, B…, mặt cắt gạch ANSI31 và nhãn **MẶT CẮT A-A**.
  - `VIEWDETAIL`: hình trích. Khoanh vùng tròn / chữ nhật, phóng theo hệ số; nhãn **HÌNH TRÍCH B** và **TỈ LỆ 2 : 1**.
  - `VIEWEDIT` sửa tỉ lệ / nét khuất / ký hiệu. `VIEWUPDATE` dựng lại sau khi sửa mô hình 3D; vị trí đã dời được giữ, hình chiếu con đi theo hình chiếu cha.
  - `VIEWSTD`: góc chiếu thứ nhất (TCVN / ISO, mặc định) hoặc thứ ba (ANSI). `VIEWSECTIONSTYLE`, `VIEWDETAILSTYLE`: kiểu mặt cắt / hình trích.
  - Nét nằm trên các lớp `MD_Visible`, `MD_Hidden` (nét HIDDEN), `MD_Annotation`, `MD_Hatch`. Liên kết hình chiếu – mô hình lưu cùng bản vẽ (DXF / DWG của DVDCAD).
- **Ràng buộc**:
  - `GCSYMMETRIC`: hai đối tượng (hoặc hai điểm, tuỳ chọn **Điểm**) đối xứng qua một đường thẳng.
  - `DCCONVERT`: đổi kích thước thường (thẳng, ngang, dọc, bán kính, đường kính, góc) thành ràng buộc kích thước.
  - `DCDISPLAY`: hiện / ẩn ràng buộc kích thước.
  - `DCFORM`: dạng **Động** (chỉ trên màn hình) hoặc **Chú thích** (vẽ như kích thước, in ra được).
  - `CONSTRAINTSETTINGS`: 3 thẻ **Hình học** / **Kích thước** / **Tự ràng buộc**. `AUTOCONSTRAIN` dùng các loại và dung sai chọn ở thẻ Tự ràng buộc (có cả song song, vuông góc).
- **Điểm đánh dấu vị trí** (*Position Marker*, cần vị trí địa lý `GEOGRAPHICLOCATION`):
  - Tạo: `GEOMARKPOINT` / `GEOMARKPOSITION` (điểm trên bản vẽ), `GEOMARKLATLONG` (nhập vĩ / kinh độ, nhận cả dạng 21°01'42"N), `GEOMARKME` (vị trí hiện tại của máy).
  - `GEOLOCATEME`: chấm xanh theo dõi vị trí hiện tại.
  - `GEOREORIENTMARKER`: đổi điểm mốc và hướng bắc mà giữ nguyên vĩ / kinh độ; điểm đánh dấu dời theo.
  - Mở DXF có POSITIONMARKER của AutoCAD: hiện điểm và ghi chú.
- **3D**:
  - `3DPOLY` (`3P`): đa tuyến 3D, mỗi đỉnh một cao độ. Lưu DXF / DWG là POLYLINE 3D thật, AutoCAD mở đúng.
  - `PFACE`: lưới đa diện. `3DMESH`: lưới M × N.
  - `EDGE`: ẩn / hiện cạnh của mặt 3D. Cạnh ẩn ghi vào mã 70 của 3DFACE.
- **Shape**:
  - `LOAD` nạp tệp hình `.shx` (hoặc `.shp`). `COMPILE` dịch `.shp` → `.shx` thật (*AutoCAD-86 shapes 1.0*) và tải về.
  - `SHAPE` chèn hình: tên, điểm, cỡ, góc.
  - Mở DXF có SHAPE: hình hiện ra khi đã `LOAD` tệp hình đó. Tệp đã nạp được nhớ lại cho lần sau.
- **Xuất file**:
  - `PSOUT` (`EXPORTEPS`): PostScript đóng gói `.eps`, theo thiết lập PLOT.
  - `WMFOUT`: Windows Metafile `.wmf` của các đối tượng chọn.
  - `PUBLISHTOWEB`: chọn layout, kiểu ảnh, độ phân giải → `.zip` gồm `index.html` + ảnh.
  - `DWGCONVERT`: đổi hàng loạt DWG / DXF sang DWG 2018 / 2013 / 2010 / 2004 / 2000 hoặc DXF. Bản vẽ đang mở không bị ảnh hưởng; nhiều tệp thì tải về một `.zip`.
- **Khối động**: `BVSTATE` (hộp *Trạng thái hiển thị*: mới, đổi tên, xoá, lên / xuống, mặc định, đặt hiện hành), `BVSHOW` / `BVHIDE` (hiện / ẩn nét chọn ở trạng thái hiện hành hoặc mọi trạng thái).
- **Lệnh nhỏ**:
  - `REFSET`: thêm / bớt đối tượng khi đang `REFEDIT`.
  - `ATTREDEF`: định nghĩa lại khối có thuộc tính, giữ giá trị theo thẻ.
  - `CLOSEALLOTHER`: đóng mọi bản vẽ khác.
  - `PSETUPIN`: nhập thiết lập trang có tên từ bản vẽ khác.
  - Thiết lập trang có tên trong hộp `PLOT`: nút **Thêm…** / **Nhập…**; lưu cùng bản vẽ.
  - `PARTIALOPEN` / `PARTIALOAD`: mở một phần bản vẽ theo lớp, nạp thêm lớp sau.
  - `SYSVARMONITOR`: theo dõi biến hệ thống, báo khi khác giá trị mong muốn, **Đặt lại tất cả**.
  - `QUICKPROPERTIES` (`QP`, biến `QPMODE`): bảng thuộc tính nhanh cạnh đối tượng chọn.
  - `MVSETUP`: khung bản vẽ + khung tên 180 × 56 theo khổ A0–A4 và tỉ lệ.
  - `PLOTTERMANAGER`: danh sách máy in / máy vẽ và thuộc tính.
  - `UPDATETHUMBSNOW`: cập nhật ảnh thu nhỏ của bản vẽ.
- Các hạn chế còn lại của bản này đã được xử lý ở v5w (mục trên).

## Bổ sung như AutoCAD 2027 (v5u)
- **Khối động: lật và kéo giãn là tham số thật của AutoCAD** (DXF / DWG 2018):
  - Lật (`BPARAMETER` → F) ghi thành 2 **tham số lật** (*Flip state1* lật ngang, *Flip state2* lật dọc) + grip mũi tên + hành động FLIP; kéo giãn (L) ghi thành **tham số tuyến tính** (grip ở điểm cuối) + hành động STRETCH với khung kéo giãn như DVDCAD (nửa phía điểm cuối).
  - Trong AutoCAD bấm vào bản chèn là có grip lật / kéo; bảng Properties hiện *Flip state1*, *Flip state2*, độ dài.
  - Bản chèn đang lật: INSERT ghi không lật, hình đã lật nằm trong khối `*U` như AutoCAD. Mở lại trong DVDCAD vẫn bỏ lật / lật lại đúng chỗ.
- **Mở DWG của AutoCAD có khối động**: bản chèn hiện tên khối gốc (thay cho `*U…`), đổi được trạng thái hiển thị (bảng Thuộc tính / `BDYN`), cả khối lồng trong từng trạng thái.
- **Ảnh lưu thành IMAGE thật** (DXF / DWG 2000 → 2018): AutoCAD mở ra **thấy ảnh** (trước chỉ thấy khung).
  - Mỗi ảnh có IMAGEDEF trỏ tới tệp `.\tên_xxxxxx.jpg` (ảnh PNG giữ PNG) **cạnh bản vẽ**; giữ góc xoay, độ đậm (→ *Fade*), khung cắt `IMAGECLIP`.
  - **Bản Windows**: lưu bản vẽ (SAVE / SAVEAS / SAVEDWG) là ghi luôn tệp ảnh vào cùng thư mục. Bản web: dùng `ETRANSMIT` — gói .zip có bản vẽ và tệp ảnh cùng tên, giải nén ra là AutoCAD thấy ảnh.
  - **Mở DXF / DWG của AutoCAD có ảnh**: IMAGE thành ảnh thật của DVDCAD (giữ khung cắt); bản Windows tự đọc tệp ảnh trong thư mục bản vẽ (như AutoCAD tìm ảnh).
- **In**:
  - **Máy in Windows** cũng có nút **Thuộc tính…** → *Độ sâu màu* (24-bit / 256 màu / đen trắng) + dither theo bảng .ctb như PNG / PDF.
  - **Bản đồ nền đang hiện (GEOMAP)** được in luôn khi PLOT ra PDF / PNG / máy in (tải ô bản đồ cho đúng vùng in, ~200 dpi); xuất ảnh / in theo màn hình cũng có bản đồ. Không cần chụp bằng GEOMAPIMAGE trước.
- **DWG 2007**: không có ODA File Converter thì ghi **DWG 2004** bằng bộ ghi sẵn có (AutoCAD 2007, 2008, 2009 mở thẳng) — trước đây ghi DWG 2018 nên AutoCAD 2007 không mở được.
  - Bản Windows (5.14.1): `DWGSERVER` có nút **Tải ODA File Converter** (mở trang tải chính thức của ODA) và **Tìm lại**. Cài xong quay lại DVDCAD là tự tìm thấy — không cần chọn đường dẫn.

## Bổ sung như AutoCAD 2027 (v5t)
- **Lưu DWG gốc 2018 / 2013 / 2010 / 2004 / 2000** — không cần ODA File Converter.
  - `SAVEDWG`, `SAVEAS` *.dwg* mặc định ghi **DWG 2018 (AC1032)**. Chọn phiên bản khác trong `DWGSERVER`; DWG 2007 vẫn qua ODA (không có ODA: v5t ghi DWG 2018, từ v5u ghi DWG 2004).
  - Bộ chứa R2004+ như AutoCAD: trang nén LZ77, checksum, bản đồ section / trang, header mã hoá; chữ Unicode (2007+); dữ liệu theo đúng từng phiên bản.
  - Kiểm tra: mở lại trong DVDCAD giống hệt; LibreDWG, ODA File Converter (audit) và ACadSharp đọc không lỗi.
- **Vị trí địa lý lưu thành đối tượng GEODATA** (DXF / DWG 2010 trở lên) trong từ điển `ACAD_GEOGRAPHICDATA` của Model: điểm thiết kế, điểm tham chiếu, cao độ, hướng bắc, đơn vị. AutoCAD mở ra thấy đúng vị trí; DVDCAD mở lại lấy đủ cả múi giờ, hệ toạ độ.
- **GEOMAPIMAGE** — chụp bản đồ nền thành ảnh nằm trong bản vẽ, **in được**:
  - Chỉ định 2 góc, hoặc Enter / `V` (*Khung nhìn*) lấy cả khung nhìn; độ phân giải `C` Thô / `O` Tối ưu / `F` Mịn / `V` Rất mịn (1024 → 4096 điểm ảnh).
  - Ảnh nằm dưới cùng (DRAWORDER), lưu kèm DXF / DWG (DVDCAD mở lại còn nguyên ảnh). **GEOMAPIMAGEUPDATE** chụp lại ảnh đã chọn theo bản đồ hiện tại.
- **In PNG / PDF: độ sâu màu + dither** — hộp PLOT → nút **Thuộc tính…** cạnh máy in (*PublishToWeb PNG.pc3*, *DWG To PDF.pc3*):
  - *24-bit (True color)* (mặc định), *256 màu (8-bit, bảng màu AutoCAD)*, *Đen trắng (1-bit)*.
  - Khi giảm màu, mục **Bật dither** của từng màu trong bảng kiểu in .ctb có tác dụng: bật — giả màu bằng chấm (Floyd–Steinberg); tắt — lấy màu gần nhất, nét / mảng đặc.
  - Nét mảnh không đứt chấm (làm tròn độ phủ ở mép nét như máy vẽ). PNG ghi đúng ảnh bảng màu 8-bit / 1-bit.
  - SOLID 2D in đặc (trên màn hình vẫn tô mờ như trước).
- **Khối động lưu như AutoCAD** (DXF và DWG):
  - Khối gốc chứa mọi nét ở trạng thái mặc định (nét thuộc trạng thái khác có cờ ẩn); mỗi bản chèn là khối ẩn danh `*U…` theo trạng thái của nó, liên kết về khối gốc.
  - Bản 2018: tham số hiển thị (`BPARAMETER` → V) ghi thành **tham số Visibility của AutoCAD** — AutoCAD mở ra là khối động, có grip đổi trạng thái.
  - Kéo giãn (L) và lật (F): AutoCAD thấy đúng hình đang kéo / lật; đổi tham số tiếp trong DVDCAD.
  - Mở lại trong DVDCAD còn đủ nét của mọi trạng thái (trước đây nét đang ẩn bị bỏ khi lưu, khối động lưu DXF bị tách rời).
- **Mở khối động của AutoCAD**:
  - Bản chèn hiện **tên khối gốc** thay cho `*U12`.
  - DXF: đọc tham số hiển thị và trạng thái từng bản chèn → đổi trạng thái được bằng bảng **Thuộc tính** hoặc `BDYN`.
  - Nét ẩn (cờ invisible) không còn vẽ chồng lên nhau — cả DXF và DWG.

## Bổ sung như AutoCAD 2027 (v5s)
- **Sửa lỗi:** STYLE → *New…* (và mọi hộp hỏi tên / nhập chữ mở từ một hộp thoại) giờ hiện trên cùng, không bị hộp thoại đang mở che.
- **VPLAYER / VPCLIP lưu vào tệp**: lớp đóng băng riêng từng khung nhìn và đường cắt đa giác ghi vào DXF (VIEWPORT 331 / 340) và DWG 2000; mở tệp của AutoCAD cũng đọc được hai thông tin này. Layout của tệp hiện khung của từng khung nhìn.
- **TXTEXP** (Express Tools → Chữ → *Nổ chữ*): nổ chữ thành đa tuyến đường bao (đủ dấu tiếng Việt, chữ xoay, hệ số rộng, phông TrueType).
  - **EXPORTLAYOUT**: chữ cắt ngang khung nhìn được cắt đúng theo khung (đường bao chữ, tô đặc); chữ nằm trọn trong khung giữ nguyên là chữ.
  - **MSLIDE**: cạnh chữ ghi thành vector theo đường bao (sắc nét khi phóng to slide).
- **Thanh menu cổ điển** (biến **MENUBAR** = 1, hoặc menu Xem → Thanh menu): Tệp, Sửa, Xem, Chèn, Định dạng, Công cụ, Vẽ, Kích thước, Hiệu chỉnh, Tham số, Cửa sổ, Trợ giúp như AutoCAD.
- **CUIIMPORT / CUILOAD (.cuix / .cui)** lấy thêm:
  - **Menu** (PopMenu POP1…, có menu con) → thêm vào thanh menu cổ điển.
  - **Ribbon** (RibbonRoot.cui: tab → bảng → nút lớn / nhỏ) → tab ribbon riêng.
  - **Hình nút** trong gói (.png / .bmp / .ico) → biểu tượng của lệnh tự tạo trên ribbon, thanh truy cập nhanh.
- **Vị trí địa lý:**
  - Mở DXF của AutoCAD có **GEODATA**: lấy điểm thiết kế, điểm tham chiếu, cao độ, hướng bắc; hệ toạ độ địa lý (LL84 / WGS84) hoặc **UTM** (vd UTM84-48N, VN-2000 UTM 48N) tự đổi ra vĩ độ / kinh độ.
  - **GEOMAP** (tab Hiển thị → Ánh sáng): bản đồ nền dưới bản vẽ trong Model — *Đường* (OpenStreetMap, cần mạng), *Ảnh vệ tinh* (dịch vụ ô bản đồ riêng: biến **GEOMAPURL** `…/{z}/{x}/{y}.png`), *Tắt*; biến **GEOMAPMODE**. Bản đồ không in.
- **Máy vẽ HPGL/2**: hộp PLOT → *HP DesignJet (HPGL/2).pc3* in ra tệp **.plt**.
  - Bút theo bảng kiểu in: **bút vật lý** (physical pen), không có thì **bút ảo** (virtual pen), không có nữa thì số màu ACI; màu bút (PC), bề rộng nét (PW).
  - Nét, cung (theo dây cung 0,3 mm), kiểu nét (của bảng kiểu in hoặc của đối tượng), hatch mẫu, vùng tô / chữ thành đa giác tô (FP), cắt theo vùng in (IW), khung nhìn layout cắt theo khung.

## Bổ sung như AutoCAD 2027 (v5r)
- **Layout đọc từ tệp DWG / DXF sửa được** như layout tự tạo.
  - Vẽ / sửa trên layout của tệp (hoặc chạy MVIEW, VPEDIT, CHSPACE, bảng Thuộc tính): layout tự chuyển thành layout sửa được, giữ nguyên chỗ tab, đối tượng giấy và khung nhìn của tệp.
  - Chuột phải vào tab layout của tệp: **Chuyển thành layout sửa được**, In, **Xoá layout**. Layout đã chuyển có thêm **Khôi phục layout gốc của tệp**.
  - Mở DXF giờ có đủ các tab layout (layout đang mở, khối `*Paper_SpaceN`, khung nhìn, khổ giấy của thiết lập in). Đối tượng giấy không còn lẫn vào Model (cả DXF lẫn DWG).
  - Layout của tệp hiện tờ giấy theo khổ giấy. Hộp Khổ giấy & khung tên có thêm **Khung viền** và khổ giấy riêng của tệp.
- **Lưu DXF / DWG ghi layout giấy thật**: mỗi layout có LAYOUT (khổ giấy, giới hạn), khối giấy, khung nhìn **VIEWPORT** và mọi đối tượng giấy (khung, khung tên, ghi chú…).
  - AutoCAD mở ra thấy đúng các tab layout và khung nhìn theo tỉ lệ.
  - DVDCAD mở lại còn nguyên layout sửa được (khung tên, tham số khung nhìn, đối tượng giấy), kể cả trên máy khác.
  - DWG 2000 có thực thể VIEWPORT thật (LibreDWG đọc lại đúng).
- **DIESEL** như AutoCAD: `$(hàm,đối,…)` lồng nhau, đủ hàm `+ - * / = < > != <= >= and or xor eq if index nth strlen substr upper fix rtos angtos edtime eval getenv getvar linelen`.
  - **MODEMACRO**: chuỗi DIESEL hiện trên thanh trạng thái, tự cập nhật (vd `MODEMACRO` → `Lớp: $(getvar,clayer) | $(edtime,0,DD/MO/YYYY)`; `.` để xoá).
  - Macro bắt đầu bằng **`$M=`** được tính DIESEL trước khi chạy (dùng trong lệnh tự tạo của CUI, Action Recorder…). Lệnh **DIESEL** để thử biểu thức.
- **Nhập tệp CUI của AutoCAD**: **CUIIMPORT** / **CUILOAD** đọc **.cuix** (gói zip) và **.cui** (XML), ngoài .dvdcui.
  - Macro chỉ gọi một lệnh có sẵn → dùng thẳng lệnh đó; macro khác → lệnh tự tạo (giữ `^C^C`, `;`, `\`, `$M=`).
  - Phím tắt (Accelerators), thao tác nhấp đúp theo loại đối tượng, thanh công cụ → tab ribbon riêng (mỗi thanh một bảng).
- **In theo bảng kiểu in (.ctb)**:
  - **Kiểu nét thích ứng** (adaptive): mẫu nét co giãn cho vừa số nguyên lần trên mỗi đối tượng (đường, đa tuyến, cung, đường tròn), tắt được theo từng kiểu.
  - **Đầu nét / nối nét hình thoi** vẽ đúng mũi thoi ở hai đầu và ở mỗi đỉnh nối (trước đây dùng tạm vuông / vát).
- **EXPORTLAYOUT** cắt thêm **ảnh** (giữ ảnh + đường cắt theo khung nhìn; DXF ghi khung ảnh đã cắt) và **khối 3D** (đổi thành hình chiếu bằng như khi xem trong khung nhìn — cạnh lưới, biên dạng đùn, đường tròn trụ / nón — rồi cắt theo khung).

## Bổ sung như AutoCAD 2027 (v5q)
- **Không gian giấy (paper space)** trong layout do bạn tạo (lệnh LAYOUT): mọi lệnh vẽ / sửa đều ghi lên giấy (ghi chú, khung, ký hiệu…), có hoàn tác / làm lại, lưu cùng layout.
  - Khung nhìn sửa như đối tượng: **dời / kéo giãn** (giữ tỉ lệ và vùng nhìn), **xoá**, **sao chép** khung nhìn.
  - Bảng Thuộc tính sửa được đối tượng trên giấy. **PSOBJ** chọn mọi đối tượng giấy của layout.
- **CHSPACE** (Change Space): chuyển đối tượng **giấy → Model** (qua khung nhìn chứa nó) hoặc **Model → giấy** (tuỳ chọn M: chọn khung nhìn, chọn đối tượng trong Model), đổi cỡ đúng theo tỉ lệ khung nhìn, một bước hoàn tác.
- **STANDARDS / LAYTRANS** đọc được tệp chuẩn **DWS / DWG / DWT nhị phân** (qua LibreDWG), ngoài DXF.
- **Kiểu in (.ctb)** đủ thuộc tính trong Trình sửa bảng kiểu in (Dạng bảng và Dạng biểu mẫu):
  - Có tác dụng khi in: màu, chuyển xám, độ đậm, **kiểu nét** (31 kiểu nét in cố định như AutoCAD), **kiểu đầu nét**, **kiểu nối nét**, **kiểu tô** (ô cờ, lưới ô vuông, hình thoi, sọc ngang / dọc, xiên trái / phải, chấm vuông), bề rộng nét, hệ số tỉ lệ chung cho kiểu nét không theo ISO.
  - Lưu và ghi vào .ctb cho AutoCAD: dither, số bút, bút ảo, thích ứng, mô tả.
  - **Sửa bề rộng nét…**: sửa bảng bề rộng nét tuỳ chỉnh (mm / inch, sắp xếp); kiểu đang dùng giá trị cũ đổi theo.
- **EXPORTLAYOUT** cắt mọi đối tượng theo khung nhìn (chữ nhật, đa giác VPCLIP, XCLIP): đường, đa tuyến cong, cung, đường tròn, elip, spline (thành từng đoạn), hatch, vùng đặc; chữ / điểm giữ khi điểm đặt nằm trong khung.
- **Visual Styles Manager**: kiểu riêng có thuộc tính sửa được — kiểu gốc, kiểu mặt (không tô), hiện cạnh (không / cạnh mặt / đường đẳng tham số), màu cạnh, độ mờ (%), bóng đổ (tắt / trên nền / đầy đủ), màu nền; áp dụng ngay vào khung nhìn 3D và giữ khi mở lại 3D.
- **GEOGRAPHICLOCATION** (hộp Vị trí địa lý): vĩ độ / kinh độ (độ thập phân hoặc độ-phút-giây, Bắc / Nam, Đông / Tây), chọn nhanh thành phố, cao độ, hệ toạ độ, **điểm thiết kế** (Chọn điểm <), hướng bắc (la bàn xem trước), múi giờ.
  - Lưu theo bản vẽ, dùng cho mặt trời / bóng đổ 3D, ghi $LATITUDE / $LONGITUDE / $NORTHDIRECTION / $TIMEZONE vào DXF và đọc lại khi mở.
  - Điểm mốc đỏ trên bản vẽ (**GEOMARKERVISIBILITY**). **GEOREMOVE** xoá vị trí. Biến LATITUDE, LONGITUDE, NORTHDIRECTION, TIMEZONE.
- **MSLIDE / VSLIDE**: tạo tệp slide **.sld** đúng định dạng AutoCAD (vector theo điểm ảnh, màu ACI; chữ và vùng tô quét thành nét), xem .sld (cả định dạng cũ) và slide trong thư viện **.slb**; REDRAW / Esc để trở lại. **SLIDELIB** gộp nhiều .sld thành .slb.
- **CUI** (Customize User Interface) — cũng mở bằng CUSTOMIZE, TOOLBAR, MENU:
  - **Lệnh tự tạo** bằng macro kiểu AutoCAD (`^C^C`, `;` / dấu cách = Enter, `\` chờ người dùng nhập, `_`, `'`), mô tả, biểu tượng, Chạy thử.
  - **Thanh truy cập nhanh**: thêm / bỏ / sắp xếp lệnh. **QUICKCUI** mở thẳng phần này.
  - **Tab ribbon riêng**: tên tab, tên bảng, nút lớn / nhỏ, nhãn nút, hiện trong mọi không gian làm việc.
  - **Phím tắt**: gán tổ hợp Ctrl / Alt / F1–F12 cho lệnh (kèm danh sách phím tắt có sẵn).
  - **Thao tác nhấp đúp** theo loại đối tượng (đường, đa tuyến, chữ, hatch, khối, kích thước, bảng…).
  - Tab **Chuyển (Transfer)**: xuất / nhập tệp **.dvdcui**, đặt lại mặc định, tệp tuỳ biến bổ sung. Lệnh **CUIEXPORT**, **CUIIMPORT**, **CUILOAD**, **CUIUNLOAD**, **CUIAPPLY**.

## Lệnh mới và hộp thoại như AutoCAD 2027 (v5p)
- **HATCH / HATCHEDIT** (hộp Hatch and Gradient) đủ các mục trước đây còn mờ:
  - Loại **Định sẵn / Tự định nghĩa (_USER)**: khoảng cách nét và **Hai chiều** (lưới ô vuông) cho mẫu tự định nghĩa.
  - **Gốc mẫu**: Dùng gốc hiện hành, hoặc Chỉ định gốc mới (bấm điểm, hay Mặc định theo phạm vi biên: dưới trái / dưới phải / trên phải / trên trái / tâm), Lưu làm gốc mặc định.
  - Tuỳ chọn: **Chú thích theo tỉ lệ**, **Liên kết** với biên, **Tạo hatch riêng** cho từng vùng, **Thứ tự vẽ** (Không gán / Dưới cùng / Trên cùng / Sau biên / Trước biên).
  - Khi sửa hatch: thêm biên (bấm điểm / chọn đối tượng), **Bỏ biên** (đảo), **Dựng lại biên** (tạo đa tuyến biên, hỏi có liên kết không).
  - **HATCHSETORIGIN** (HSO) đặt lại gốc mẫu cho hatch đã chọn. Biến mới: HPORIGIN, HPNAME, HPSCALE, HPANG, HPSPACE, HPDOUBLE, HPASSOC, HPANNOTATIVE, HPSEPARATE, HPDRAWORDER.
- **Bảng**: kiểu ô có **viền đôi** (Double line + Spacing trong tab Đường viền của TABLESTYLE).
  - **TINSERT** chèn khối vào ô bảng: tên khối, xem trước, tỉ lệ hoặc **Tự khớp**, góc, căn lề trong ô; khối đi theo bảng khi sửa / dời bảng; "Bỏ khối khỏi ô".
- **PLOTSTAMP** (hộp Plot Stamp): trường dấu in (tên bản vẽ, layout, ngày giờ, tên đăng nhập, thiết bị, khổ giấy, tỉ lệ in), 2 **trường người dùng** (Thêm / Sửa), tệp tham số **.pss** (Nạp / Lưu thành), xem trước vị trí.
  - **Nâng cao…**: vị trí (4 góc), hướng ngang / dọc, dấu in lộn ngược, dời X / Y theo vùng in được hoặc mép giấy, phông, cao chữ, một dòng, đơn vị (mm / inch / pixel), tệp nhật ký in (tải / xoá).
  - Hộp **PLOT**: bật **Bật dấu in** (nút ⚙ mở PLOTSTAMP) và **In lộn ngược** (xoay bản in 180°). Biến **LOGINNAME**.
- **STANDARDS** (Configure Standards): gắn tệp chuẩn **DXF** (hoặc .dws lưu dạng DXF) với bản vẽ, + Thêm / − Bỏ / ↑ ↓ (tệp trên được ưu tiên khi trùng tên), mô tả tệp; tab **Trình cắm**: Kiểu kích thước, Lớp, Kiểu nét, Kiểu chữ.
  - **Cài đặt…**: tắt thông báo / hiện cảnh báo khi có vi phạm / biểu tượng ⚖ trên thanh trạng thái; tự động sửa thuộc tính không chuẩn; hiện lỗi đã bỏ qua; tệp chuẩn ưu tiên để thay thế.
  - **CHECKSTANDARDS** (CHK): từng **Vấn đề**, danh sách **Thay bằng** (✓ = gợi ý), **Xem trước thay đổi** (thuộc tính / giá trị hiện tại / giá trị chuẩn), **Sửa lỗi**, **Lỗi tiếp theo**, **Đánh dấu bỏ qua**, bảng kết quả khi xong.
  - Sửa được: thuộc tính lớp (màu, kiểu nét, bề rộng nét), lớp không chuẩn (chuyển đối tượng sang lớp chuẩn rồi xoá lớp cũ), kiểu nét (thay / định nghĩa lại), kiểu chữ (thay / sửa phông, hệ số rộng), kiểu kích thước (thay / sửa và dựng lại kích thước).
- **STYLESMANAGER** (Kiểu in): các bảng .ctb dạng biểu tượng + **Trình thêm bảng kiểu in** (bắt đầu từ đầu / dùng bảng có sẵn / mẫu / nhập .ctb của AutoCAD), Sửa, Nhập / Xuất .ctb, Đổi tên, Xoá.
  - **Trình sửa bảng kiểu in** (Plot Style Table Editor): tab Tổng quát (mô tả, thông tin tệp), **Dạng bảng** (mỗi cột một kiểu, bấm ô để sửa), **Dạng biểu mẫu** (chọn nhiều kiểu bằng Ctrl / Shift; màu, **chuyển xám**, độ đậm, bề rộng nét, mô tả; Lưu thành… .ctb). Chuyển xám áp dụng khi in và ghi vào tệp .ctb.
- **VISUALSTYLES** (Visual Styles Manager, bảng nổi): ảnh mẫu 2D khung dây / Khung dây / Khuất nét / Thực tế / Tô bóng / Tô bóng + cạnh / Xuyên thấu, thuộc tính, Áp dụng cho khung nhìn hiện hành, Tạo kiểu mới, Xoá kiểu.
  - **VSCURRENT** (VS, SHADEMODE) hỏi theo dòng lệnh như AutoCAD; **VSSAVE** lưu kiểu hiện hành thành kiểu có tên.
- **CENTERMARK / CENTERLINE** giờ là đối tượng **liên kết**: dời, đổi bán kính đường tròn / sửa đường thẳng gốc thì dấu tâm, đường tâm bám theo; dời / xoay / co giãn cùng nhau vẫn giữ liên kết.
  - **CENTERDISASSOCIATE**, **CENTERREASSOCIATE**, **CENTERRESET**; biến **CENTEREXE**, **CENTERLTYPE**, **CENTERLAYER**.
- Hộp thoại làm lại theo bố cục AutoCAD: **PTYPE** (Point Style), **ATTACH** (chọn tệp DWG / DXF / ảnh / PDF rồi mở lệnh gắn tương ứng), **REINIT** (Re-initialization: nạp lại acad.pgp), **TEXTSCR / HISTORY** (Cửa sổ văn bản: sao chép, dán vào dòng lệnh, tìm), **DBLIST** (liệt kê mọi đối tượng vào cửa sổ văn bản), **DWGSERVER**, **ABOUT**, **SPELLBROWSER**.
- Lệnh nhỏ: **BSAVEAS** (lưu khối đang sửa thành khối mới, có thể lưu ra .dxf), **EXPORTLAYOUT** (xuất layout ra không gian mô hình của bản vẽ mới, nét trong khung nhìn cắt theo khung), **TREESTAT**, **COMPARECLOSE**.

## Lệnh mới và hộp thoại như AutoCAD 2027 (v5o)
- **TABLESTYLE** (hộp Table Style): danh sách kiểu, xem trước, Đặt hiện hành / Mới… / Sửa… / Xoá (không xoá được kiểu đang dùng).
  - Hộp New / Modify Table Style: bảng bắt đầu (lấy định dạng từ bảng có sẵn), hướng bảng Xuống / Lên, xem trước.
  - Kiểu ô **Tiêu đề / Tên cột / Dữ liệu** và kiểu ô riêng (Tạo kiểu ô mới, Quản lý kiểu ô). Mỗi kiểu ô có 3 tab:
    - Chung: màu nền, căn lề (9 vị trí), định dạng (Chung, Số thập phân, Phần trăm, Tiền tệ, Số nguyên, Văn bản), loại, lề ngang / dọc, gộp ô.
    - Chữ: kiểu chữ, cao chữ, màu chữ, góc chữ.
    - Đường viền: bề rộng nét, kiểu nét, màu và 8 nút Mọi / Ngoài / Trong / Dưới / Trái / Trên / Phải / Không.
  - Sửa kiểu thì mọi bảng dùng kiểu đó cập nhật theo. SCALE bảng thì chữ và lề đổi cỡ theo.
- **TABLE** (hộp Insert Table): chọn kiểu bảng (nút … mở TABLESTYLE), bảng rỗng / dán từ Excel / liên kết dữ liệu / Data Extraction, xem trước, chèn theo điểm hoặc theo khung, cột × rộng cột, hàng dữ liệu × cao hàng (số dòng), kiểu ô hàng 1 / hàng 2 / các hàng còn lại. Hộp sửa bảng chọn được kiểu ô cho từng hàng. **MATCHCELL** chép kiểu ô sang ô khác.
- **COUNT**: chọn một khối → thanh đếm trên bản vẽ (số bản chèn, ◀ ▶ duyệt từng bản chèn, Chèn trường, Tạo bảng, ✕). Tuỳ chọn Vùng / Model / Danh sách / Bảng.
  - **COUNTLIST** mở bảng Count (ảnh khối, tên, số lượng; bấm để đếm, kích đúp để phóng tới). **COUNTFIELD** chèn trường đếm tự cập nhật khi thêm / xoá khối. **COUNTCLOSE** đóng.
- **BREPLACE** (Express Tools): thay mọi bản chèn khối A bằng khối B, giữ điểm chèn, tỉ lệ, góc, lớp; có xem trước và tuỳ chọn dọn định nghĩa khối cũ.
- **ADDSELECTED**: chọn một đối tượng → vẽ đối tượng mới cùng loại và cùng lớp, màu, kiểu nét, bề rộng nét, kiểu chữ, mẫu hatch, kiểu bảng (khối thì chèn đúng khối đó).
- **SYSVDLG** (System Variables): nhóm biến, tìm, sửa giá trị tại chỗ, mô tả, khôi phục giá trị đầu phiên. **SETVAR** hỏi theo dòng lệnh như AutoCAD (`?` = mở SYSVDLG).
- **SCALELISTEDIT** (Edit Drawing Scales): thêm / sửa / lên / xuống / xoá / đặt lại danh sách tỉ lệ; ô ▲ tỉ lệ chú thích trên thanh trạng thái dùng danh sách này.
  - **OBJECTSCALE**: thêm / xoá tỉ lệ hỗ trợ cho đối tượng chú thích. **ANNOALLVISIBLE** = 0 chỉ hiện đối tượng hỗ trợ tỉ lệ hiện hành. **ANNORESET**, **ANNOUPDATE**.
- **UCSMAN** (hộp UCS): UCS đặt tên (Đặt hiện hành, Lưu UCS hiện hành, Đổi tên, Xoá, Chi tiết), UCS trực giao (Trên / Dưới / Trước / Sau / Trái / Phải, độ sâu), Cài đặt.
- **HYPERLINK** (Insert / Edit Hyperlink): liên kết tới tệp hoặc trang web (tệp gần đây, trang đã duyệt, liên kết đã chèn), góc nhìn của bản vẽ, e-mail; chữ hiển thị; đích trong bản vẽ; Bỏ liên kết.
  - Rê chuột lên đối tượng có liên kết hiện gợi ý; **Ctrl + bấm** để mở. **ATTACHURL** (đối tượng / vùng), **DETACHURL**, **PASTEASHYPERLINK**, **HYPERLINKOPTIONS**, **-HYPERLINK**, **OPENLINK** / **GOTOURL**.
- **Action Recorder** (ribbon Manage → Ghi thao tác): **ACTRECORD** ghi lệnh và điểm / số / chữ / từ khoá đã nhập; khi ghi có thanh nổi (Thông báo, Yêu cầu nhập, Điểm gốc, Dừng).
  - **ACTSTOP** lưu macro (tên lệnh, mô tả, khôi phục góc nhìn, danh sách bước, đánh dấu bước "Hỏi" người dùng). Gõ tên macro để chạy lại.
  - **ACTMANAGER**: Chạy, Sao chép, Đổi tên, Sửa, Xoá, Xuất / Nhập .actm. **ACTUSERMESSAGE**, **ACTUSERINPUT**, **ACTBASEPOINT**.
- Script: **RSCRIPT** lặp lại script, **Esc / Backspace** ngắt script, **RESUME** chạy tiếp, **SCRIPTCALL** chạy script lồng.
- Lệnh nhỏ: **GOTOSTART**, **FILETAB / FILETABCLOSE**, **QVDRAWING / QVLAYOUT** (+ CLOSE), **BROWSER**, **VIEWGO**, **VIEWPLAY**, **GRAPHICSCONFIG**, **WSSAVE / WSSETTINGS / WORKSPACE** (Đặt hiện hành / Lưu thành / Đổi tên / Xoá / Cài đặt), **CLASSICXREF**, **CLASSICIMAGE**, **CLASSICGROUP** (hộp Object Grouping: tạo nhóm tên / không tên, chọn được, thêm / bớt, đổi tên, mô tả, rã nhóm), **RESETBLOCK**, **BSAVE**, **ADJUST**, **EXTERNALREFERENCESCLOSE**, **VISUALSTYLESCLOSE**, **PARAMETERSCLOSE**, **ADCCLOSE**, **DRAWINGRECOVERYHIDE**.
- Hộp thoại làm lại theo bố cục AutoCAD:
  - **FILTER** (Object Selection Filters): danh sách điều kiện, chọn điều kiện + toán tử (= != < <= > >= *), X / Y cho điểm, nhóm `** Begin/End AND / OR / XOR / NOT`, Thêm đối tượng đã chọn, bộ lọc đặt tên. Apply rồi chọn vùng cần lọc.
  - **ALIASEDIT** (acad.pgp – Alias Editor): mọi lệnh tắt acad.pgp + lệnh tắt riêng, Thêm / Xoá / Sửa, nhập / xuất acad.pgp.
  - **SPELL** (Check Spelling): nơi kiểm tra, từ không có trong từ điển, gợi ý, ngữ cảnh (phóng tới chữ), Bỏ qua / Bỏ qua tất cả / Thay / Thay tất cả / Thêm vào từ điển, Hoàn tác, Cài đặt, Từ điển riêng.
  - **APPLOAD** (Load / Unload Applications): nạp tệp, Ứng dụng đã nạp / Lịch sử, Gỡ nạp, Startup Suite.
  - **LAYTRANS** (Layer Translator): Chuyển từ / Chuyển sang, Ánh xạ / Ánh xạ cùng tên, nạp lớp chuẩn từ DXF, lớp mới, bảng ánh xạ, Cài đặt (đổi màu / kiểu nét về BYLAYER).
  - **LAYWALK** (LayerWalk): bảng nổi, chọn lớp (Ctrl / Shift) chỉ hiện lớp đó, kích đúp để giữ lớp (*), lọc, Chọn đối tượng, Dọn lớp, chuột phải (Giữ / Bỏ giữ / Chọn tất cả / Đảo chọn / Lớp không dùng / Lưu trạng thái lớp), Khôi phục khi thoát.
  - **PUBLISH**: danh sách trang (thêm / bỏ / lên / xuống, lưu / nạp danh sách), xem trước, dấu in, mở PDF khi xong.
  - **DDVPOINT** (Viewpoint Presets): 2 vòng chọn góc (từ trục X, so với mặt XY), Đặt về mặt bằng.
  - **VPORTS** (Viewports): khung nhìn chuẩn có xem trước, lưu / gọi khung nhìn đặt tên (bản dòng lệnh: **-VPORTS**).
  - **PARAMETERS** (Parameters Manager): bảng nổi gồm tham số ràng buộc kích thước và **tham số người dùng** (dùng được trong biểu thức), sửa tên / biểu thức tại chỗ, đổi tên thì biểu thức đổi theo.
  - **INPUTSEARCHOPTIONS** (Input Search Options), **Load or Reload Linetypes** (đọc thêm tệp **.lin** riêng).
  - **Hatch và Gradient**: tab Gradient đủ 9 kiểu chuyển màu (Linear, Cylinder, Spherical, Hemispherical, Curved và kiểu ngược), một màu (Đậm — Nhạt) / hai màu, căn giữa, góc. **GRADIENT** tô chuyển màu như HATCH; **HATCHEDIT** mở chính hộp này để sửa hatch đã chọn.

## Chữ định dạng, trường, cột, MLSTYLE và BATTMAN như AutoCAD 2027 (v5n)
- **MTEXT có định dạng như AutoCAD:** bôi đen rồi bấm **B / I / U / Ō** (hoặc **Ctrl+B / Ctrl+I / Ctrl+U**) để đậm, nghiêng, gạch chân, gạch trên đúng phần chữ đã chọn.
  - Chưa bôi đen thì áp cho chữ gõ tiếp.
  - Nút trên tab Text Editor sáng theo định dạng ở con trỏ.
  - Ô soạn có hoàn tác riêng (Ctrl+Z / Ctrl+Y).
  - Lưu DXF / DWG thành mã MTEXT chuẩn (`{\fArial|b1|i0;…}`, `\L…\l`, `\O…\o`) nên AutoCAD hiện đúng. Mở file MTEXT có định dạng của AutoCAD cũng giữ được đậm / nghiêng / gạch chân / gạch trên.
- **Trường (Field)** — tab Text Editor → Field, chuột phải → Chèn trường…, hoặc lệnh **FIELD**:
  - Hộp thoại Field gồm nhóm trường, tên trường, định dạng, giá trị xem trước và biểu thức trường (`%<\AcVar Title>%`).
  - Các trường có:
    - ngày hiện tại / ngày tạo / ngày lưu (định dạng `dd/MM/yyyy`, `d MMMM yyyy`, `HH:mm`…);
    - tiêu đề, chủ đề, tác giả, từ khoá, ghi chú, người kiểm, đường dẫn gốc siêu liên kết, tên file, thuộc tính tuỳ chỉnh (DWGPROPS);
    - diện tích / chiều dài đối tượng (bấm "Chọn đối tượng"; đơn vị bản vẽ, m², cm²; số lẻ);
    - số đối tượng.
  - Trường nằm ngay trong chữ (nền xám, không in) và tự cập nhật khi mở bản vẽ, khi đổi DWGPROPS và khi chạy UPDATEFIELD.
- **Cột (Columns)** — tab Text Editor → Columns:
  - Không chia cột, Cột động, 2–6 cột tĩnh, Chèn ngắt cột (**Alt+Enter**), Cài đặt cột… (kiểu cột, số cột, chiều cao, bề rộng cột, khoảng cách, tổng).
  - Chữ tự chảy sang cột sau khi đầy chiều cao.
  - Khi lưu DXF / DWG, mỗi cột là một MTEXT nên AutoCAD hiện đúng. DVDCAD mở lại vẫn là một chữ có cột.
- **Chữ lộn ngược và góc nghiêng:** Text Style (Lộn ngược, Góc nghiêng), Enhanced Attribute Editor và BATTMAN. Đọc / ghi DXF và DWG (mã 51, 71). "Viết dọc" chỉ có với phông SHX, như AutoCAD.
- **MLSTYLE** đủ các mục như AutoCAD:
  - Mỗi thành phần có khoảng lệch, màu, kiểu nét.
  - Nắp đầu / cuối gồm đoạn thẳng, cung ngoài, cung trong, góc nắp.
  - Có màu tô (Fill) và hiện mối nối (Display joints).
  - **Tải… / Lưu…** file **.mln** đúng định dạng AutoCAD (đọc được acad.mln).
- **BATTMAN (Block Attribute Manager)**:
  - Chọn khối (bấm trên bản vẽ hoặc chọn trong danh sách); bảng Nhãn / Lời nhắc / Mặc định / Chế độ; Đồng bộ, Lên, Xuống, Sửa…, Xoá; Có trong bản vẽ: N.
  - Sửa… mở hộp **Edit Attribute**:
    - Thuộc tính khối: chế độ Ẩn / Hằng số / Xác nhận / Đặt sẵn / Khoá vị trí / Nhiều dòng; Nhãn, Lời nhắc, Mặc định.
    - Tuỳ chọn chữ: kiểu, canh lề, cao, góc, chú thích, viết ngược, lộn ngược, hệ số rộng, góc nghiêng, bề rộng khung.
    - Thuộc tính đối tượng: lớp, kiểu nét, màu, bề rộng nét.
    - Có **Xem trước thay đổi** ngay trên bản vẽ; Cancel thì trả lại như cũ.
  - Cài đặt…: chọn cột hiện trong danh sách, tô đỏ nhãn trùng, áp thay đổi cho các bản chèn đã có.
  - Thuộc tính **Ẩn** không hiện trên bản vẽ (ATTDISP Bình thường). **ATTDISP Bật** hiện cả thuộc tính ẩn.
  - Thuộc tính **Hằng số** không sửa được trong EATTEDIT. Thuộc tính **Đặt sẵn** không hỏi khi chèn khối.
- **Enhanced Attribute Editor (EATTEDIT):** bật thêm góc nghiêng, chú thích, viết ngược, lộn ngược, kiểu nét, bề rộng nét. Giá trị nhiều dòng dùng được với thuộc tính Nhiều dòng.
  - Ô "Kiểu in" (Plot style) vẫn tắt khi bản vẽ dùng bảng in theo màu (.ctb), như AutoCAD.
- **PURGE / RENAME** gọi tên nhóm theo AutoCAD: Blocks, Dimension Styles, Layers, Linetypes, Multileader Styles, Multiline Styles, Text Styles.

## Soạn chữ, mảng và các hộp thoại còn lại như AutoCAD 2027 (v5m)
- **MTEXT / TEXT / DDEDIT soạn ngay trên bản vẽ** (máy tính), như AutoCAD:
  - Ô soạn nằm đúng chỗ chữ, đúng cỡ, góc xoay và canh lề. MTEXT có khung (ngắt dòng theo bề rộng khung) và thước phía trên.
  - MTEXT: **Enter** = xuống dòng, **Ctrl+Enter** hoặc bấm ra ngoài = lưu, **Esc** = bỏ.
  - TEXT (DTEXT): **Enter** = dòng mới (mỗi dòng là một chữ riêng, cách 1,5 lần cao chữ), **Enter ở dòng trống** = xong, **Esc** = giữ phần đã gõ.
  - DDEDIT / bấm đúp chữ: sửa tại chỗ; MTEXT mở lại đúng nội dung gốc trước khi ngắt dòng.
  - Tab ribbon **Text Editor** hiện khi đang soạn:
    - Style: kiểu chữ, cao chữ.
    - Formatting: phông, màu, CHỮ HOA / chữ thường.
    - Paragraph: canh lề 9 kiểu, đánh số / đầu dòng.
    - Insert: ký hiệu (°, ±, Ø, ≈, ∠, Δ, ², ³, ≠, Ω, µ…), nhập chữ từ file .txt.
    - Tools: Tìm và thay thế. Options: thước, hoàn tác / làm lại. Close Text Editor.
  - Chuột phải trong ô soạn: hoàn tác, cắt / chép / dán, ký hiệu, chữ hoa / thường, tìm và thay thế.
  - Script và LISP vẫn dùng được: `TEXT 10,10 2.5 0 Dòng 1` rồi dòng trống; `(command "TEXT" "0,0" "3" "0" "Chữ" "")`.
- **ARRAYRECT / ARRAYPOLAR** có tab ribbon **Array Creation**: sửa số cột / hàng / khoảng / tổng, số phần tử / góc lấp đầy, liên kết, xoay phần tử ngay trên ribbon, bản xem trước cập nhật tức thì. Dòng lệnh vẫn có đủ tuỳ chọn (`COU`, `S`, `COL`, `R`, `I`, `A`, `F`, `ROT`…).
- **COLOR** mở hộp **Select Color** (Index Color · True Color · Color Books). `-COLOR` là bản dòng lệnh cho script / LISP. Ô "Chọn màu…" ở các hộp thoại và bảng Thuộc tính cũng mở hộp này.
- Hộp thoại mới theo bố cục AutoCAD:
  - **PURGE**: hai chế độ *Mục dọn được* / *Tìm mục không dọn được* (kèm lý do), cây mục có tên (khối, kiểu kích thước, lớp, kiểu nét, kiểu ghi chú dẫn, kiểu đường đôi, kiểu chữ, khối động), dọn hình độ dài 0 và chữ rỗng, dọn cả mục lồng nhau. `-PURGE` cho script: `-PURGE A * N`.
  - **RENAME**: Named Objects · Items · Old Name · Rename To — khối, kiểu kích thước, lớp, trạng thái lớp, kiểu ghi chú dẫn, kiểu đường đôi, kiểu chữ, góc nhìn.
  - **LAYERSTATE** (Layer States Manager): Mới / Lưu / Đổi tên / Xoá / Nhập / Xuất (.las.json), chọn thuộc tính cần gọi lại (bật tắt, đóng băng, khoá, màu, kiểu nét, bề rộng nét, lớp hiện hành), tắt lớp không có trong trạng thái.
  - **VIEW** (View Manager): cây Hiện tại / Góc nhìn mô hình / Góc nhìn mẫu, bảng thuộc tính sửa được (tên, nhóm, tâm, chiều cao, góc xoay), New (hiển thị hiện tại hoặc chọn cửa sổ, lưu ảnh chụp lớp), Update Layers, Delete, Set Current.
  - **FIND** (Find and Replace): danh sách kết quả, phóng tới chữ tìm thấy, Replace / Replace All / Find Next, tìm trong vùng chọn; thêm tuỳ chọn: hoa thường, nguyên từ, ký tự đại diện `* ?`, **không phân biệt dấu** (tìm `thep` ra `thép`), loại chữ (thuộc tính, kích thước, chữ, bảng).
  - **EATTEDIT** (Enhanced Attribute Editor, cũng mở khi bấm đúp khối có thuộc tính): tab Attribute / Text Options / Properties — sửa giá trị, kiểu chữ, canh lề, cao chữ, góc, hệ số rộng, lớp, màu; Apply; Select block.
  - **TOLERANCE** (Geometric Tolerance): 2 hàng Sym · Tolerance 1/2 (Ø, điều kiện vật liệu Ⓜ Ⓛ Ⓢ) · Datum 1/2/3, Height + Projected Tolerance Zone Ⓟ, Datum Identifier.
  - **DWGPROPS** (Drawing Properties): tab General / Summary / Statistics / Custom (thuộc tính tuỳ chỉnh Thêm / Xoá).
  - **MLEADERSTYLE** (Multileader Style Manager): nhiều kiểu có tên, xem trước, Set Current / New / Modify / Delete; Modify có tab Leader Format / Leader Structure / Content.
  - **MLSTYLE** (Multiline Style): nhiều kiểu có tên, xem trước; New / Modify với nắp đầu / cuối riêng và danh sách thành phần (khoảng lệch) Thêm / Xoá.
  - **XREF** (External References): bảng nổi File References + Details; chuột phải: Mở, Gắn, Gỡ nạp, Nạp lại, Gỡ, Gộp; bật / tắt làm mờ.

## Hộp thoại và ribbon như AutoCAD 2027 (v5l)
- **Mọi hộp thoại** có khung như AutoCAD:
  - thanh tiêu đề kéo được, nút **?** (trợ giúp, cũng mở bằng **F1**) và **×**;
  - nút **OK · Cancel · Help** ở góc dưới phải; ô nhập, hộp chọn gọn kiểu Windows.
  - Bấm ra ngoài hộp thoại không đóng hộp (khung nháy lên như AutoCAD).
  - Mục nào DVDCAD chưa làm được thì hiện mờ, để biết trước là chưa dùng được.
- **Ribbon không còn thanh cuộn ngang.**
  - Màn hình hẹp hoặc Windows phóng to 125–150%: các bảng tự thu gọn từ phải sang trái (Clipboard, Utilities, Groups, Block, Annotation…) rồi mới bỏ chữ ở nút nhỏ.
  - Bấm bảng đã thu gọn → bảng bật ra ngay bên dưới, đủ các nút như khi ribbon rộng.
  - Ribbon tự đo lại khi đổi cỡ cửa sổ, đổi tỉ lệ màn hình hay khi tên lớp dài.
  - Tab **Home** xếp lại như AutoCAD 2027:
    - Annotation: Text, Dimension, Leader, Table (Dimension Style, Multileader Style nằm trong phần mở rộng ▾).
    - Clipboard: Paste kèm 3 nút biểu tượng.
- **DIMSTYLE** (`D`) — *Dimension Style Manager*:
  - Danh sách kiểu, ô xem trước, mô tả; các nút **Set Current · New… · Modify… · Override… · Compare…**.
  - Chuột phải trên tên kiểu: đổi tên, xoá. Lọc *All styles / Styles in use*.
  - Hộp **New / Modify / Override** có 7 tab như AutoCAD, xem trước cập nhật ngay khi sửa:
    - **Lines**: màu, kiểu nét, bề rộng nét đường kích thước / đường gióng; vượt quá gạch chéo; khoảng bậc; ẩn đường 1 / 2; gióng dài cố định.
    - **Symbols and Arrows**: 20 kiểu mũi tên (riêng mũi thứ nhất / thứ hai / ghi chú dẫn), cỡ mũi tên, dấu tâm Mark / Line.
    - **Text**: kiểu chữ, màu chữ, cao chữ, khung quanh chữ; chữ phía trên / giữa / dưới đường kích thước; sát gióng 1 / 2; nằm ngang / theo đường / ISO.
    - **Fit**: đưa mũi tên ra ngoài khi không lọt, tỉ lệ toàn cục (`DIMSCALE`).
    - **Primary Units**: Decimal, Scientific, Engineering, Architectural, Fractional; độ chính xác, dấu thập phân, làm tròn, tiền tố / hậu tố, hệ số đo, bỏ số 0; đơn vị góc (độ, độ-phút-giây, grad, radian).
    - **Alternate Units**: hiện đơn vị thay thế (×25.4…) sau hoặc dưới giá trị chính.
    - **Tolerances**: Symmetrical, Deviation, Limits, Basic.
  - Sửa một kiểu thì **mọi kích thước đang dùng kiểu đó trong bản vẽ đổi theo**, như AutoCAD.
  - Kích thước vẽ từ bản cũ vẫn giữ nguyên hình (không ăn theo các mục mới).
- **LAYER** (`LA`) — *Layer Properties Manager* dạng bảng nổi: vẽ tiếp được khi bảng đang mở.
  - Thanh công cụ: New Layer (**Alt+N**), Delete (**Alt+D**), Set Current (**Alt+C**), Layer States, Refresh.
  - Bộ lọc *All / All Used Layers*, đảo bộ lọc, ô tìm lớp (`*`, `?`).
  - Cột Status · Name · On · Freeze · Lock · Color · Linetype · Lineweight, bấm tiêu đề cột để sắp xếp.
  - Chọn nhiều lớp (Ctrl / Shift, **Ctrl+A**) rồi bấm biểu tượng bóng đèn / tuyết / khoá là đổi cả nhóm.
  - Bấm đúp tên = đặt hiện hành; **F2** hoặc bấm lại tên = đổi tên tại chỗ.
  - Chuột phải: đặt hiện hành, lớp mới, đổi tên, xoá, chọn tất cả / đảo vùng chọn, bật / rã băng / mở khoá tất cả, chọn đối tượng trên lớp.
  - Bấm ô Linetype mở *Select Linetype* (có **Load…**); bấm ô Lineweight mở *Lineweight*.
- **INSERT** (`I`) mở **bảng Blocks** như AutoCAD 2027 (bảng nổi):
  - Tab *Current Drawing · Recent · Libraries* (thư viện khối của tôi), lọc theo tên, ảnh xem trước từng khối.
  - Tuỳ chọn: điểm chèn (chỉ định trên màn hình hoặc nhập X, Y), tỉ lệ, góc xoay, **Repeat Placement**, **Explode**.
  - Bấm khối để chèn. `CLASSICINSERT` mở hộp *Insert* cổ điển.
- **BLOCK** (`B`) — *Block Definition*:
  - Tên, Base point (**Pick point** hoặc X / Y), Objects (**Select objects**, Retain / Convert to block / Delete), mô tả.
  - Hộp thoại ẩn đi khi chọn điểm / đối tượng rồi hiện lại. Đối tượng chọn sẵn trước khi gọi lệnh được dùng luôn.
- **ATTDEF** — *Attribute Definition*: Tag, Prompt, Default, canh lề (13 kiểu), kiểu chữ, cao chữ, góc xoay, điểm chèn trên màn hình hoặc nhập toạ độ, *Align below previous attribute definition*.
- **HATCH** (`H`): trong lúc chọn vùng, ribbon hiện **tab ngữ cảnh "Hatch Creation"** như AutoCAD 2027:
  - Boundaries: Pick Points, Select, Undo, Boundary.
  - Pattern: bảng mẫu.
  - Properties: Pattern / Solid, màu, góc, tỉ lệ.
  - Options: Hatch Settings, Associative, Send to Back.
  - Close Hatch Creation.
  - Tuỳ chọn `T` hoặc `HATCHSET` mở hộp *Hatch and Gradient*: mẫu kèm bảng mẫu **…**, màu, góc, tỉ lệ, nút Add: Pick points / Select objects.
- **DSETTINGS** (`DS`, `OS`, `SE`) — *Drafting Settings*:
  - Tab *Snap and Grid · Polar Tracking · Object Snap · Dynamic Input*.
  - Object Snap có biểu tượng AutoSnap từng kiểu, Select All / Clear All.
  - Dynamic Input có *Pointer Input Settings* (toạ độ tương đối / tuyệt đối).
  - Nút **Options…** mở OPTIONS.
- **OPTIONS** (`OP`) — *Options*:
  - Tab *Display · Open and Save · Plot and Publish · System · User Preferences · Drafting · Selection*.
  - Đổi được: cỡ chữ thập, cỡ ô bắt điểm, cỡ ô chọn, chọn trước rồi gọi lệnh, chọn cả nhóm, xem trước khi rê chuột, thanh tỉ lệ, hiện bề rộng nét, định dạng DXF khi lưu, thiết bị in mặc định, thời gian giữ chuột phải.
- **Các hộp thoại khác theo bố cục AutoCAD:**
  - **STYLE** (*Text Style*): Styles, Font, Size (cao chữ cố định — TEXT không hỏi cao chữ nữa), Effects (Width Factor, Backwards), Set Current / New / Delete / Apply. Sửa kiểu thì chữ đang dùng kiểu đó đổi theo.
  - **UNITS** (*Drawing Units*): độ chính xác, đơn vị chèn (`INSUNITS`), ví dụ hiển thị; nút **Tỉ lệ đo…** mở cân chỉnh tỉ lệ của DVDCAD.
  - **PLOT** (*Plot - Model*): Printer/plotter (DWG To PDF, máy in Windows, PNG), Paper size, Plot area, Plot scale, Plot offset, Plot style table, Plot options, Drawing orientation, **Preview…**.
  - **TABLE** (*Insert Table*): bảng rỗng hoặc dán từ Excel, xem trước, số cột / hàng dữ liệu, kiểu ô hàng 1 / hàng 2.
  - **QSELECT** (*Quick Select*): danh sách thuộc tính, *Include / Exclude from new selection set*.
  - **LINETYPE** (*Linetype Manager*): lọc, Load / Delete / Current / Show details, khung Details (LTSCALE, CELTSCALE).
  - **LWEIGHT** (*Lineweight Settings*): danh sách bề rộng, đơn vị mm / in, Display Lineweight.
  - **PTYPE** (*Point Style*).
- Mã `$INSUNITS` sửa đúng theo AutoCAD: 7 = km, 15 = decameter (trước đây 15 bị hiểu nhầm là km).

## Lưu DWG gốc (v5k)
- `SAVEDWG` ghi thẳng file DWG bằng bộ ghi có sẵn của DVDCAD — không cần ODA File Converter, chạy cả trên trình duyệt và điện thoại. Từ v5t mặc định **DWG 2018**, chọn được 2013 / 2010 / 2004 / 2000 (v5k: DWG 2000).
- `SAVEAS` / **Ctrl+Shift+S** chọn được *Bản vẽ AutoCAD (\*.dwg)*; **Ctrl+S** sau đó ghi đè đúng định dạng đó.
- Mở DWG: thuộc tính khối (ATTRIB) không còn bị đọc trùng hai lần.
- Chi tiết các phiên bản: mục **Lưu DWG** trong phần khối động bên dưới.

## Dòng lệnh (v5j) — như AutoCAD 2027
- **Gợi ý khi gõ** (AutoComplete) có biểu tượng, gồm:
  - lệnh khớp đầu tên, lệnh chứa chuỗi gõ (tìm giữa chuỗi: `LINE` thấy `PLINE`, `XLINE`…), xếp lệnh hay dùng lên đầu;
  - **từ đồng nghĩa**: `ROUND` → FILLET, `SYMBOL` → INSERT, `XOAY` → ROTATE, `CHUNHAT` → RECTANG…;
  - **tự sửa lỗi gõ** (AutoCorrect): `LNIE` → LINE; sửa cùng một lỗi 3 lần thì lần sau tự chạy đúng lệnh;
  - **biến hệ thống** kèm giá trị hiện tại;
  - **nội dung bản vẽ**: lớp (bấm = đặt hiện hành), khối (chèn), mẫu hatch (tô), kiểu chữ (đặt hiện hành).
  - Phần còn lại của tên lệnh hiện mờ (AutoAppend): **→** hoặc **Tab** để nhận.
- Nút bên trái dòng lệnh: **✕** ẩn (Ctrl+9), **🔧 Tuỳ chỉnh** (bật / tắt từng loại gợi ý, số dòng lời nhắc, độ trong suốt, neo ở đáy cửa sổ, lịch sử), **▾ Lệnh gần đây**.
- `INPUTSEARCHOPTIONS`: hộp thoại cài đặt gợi ý. Biến: `AUTOCOMPLETEMODE`, `AUTOCOMPLETEDELAY`, `INPUTSEARCHDELAY`, `CLIPROMPTLINES`, `DYNPICOORDS`, `DYNPROMPT`, `SHORTCUTMENUDURATION`, `PICKFIRST`, `LASTPOINT`, `CMDACTIVE`, `CMDNAMES`, `HPNAME`, `HPSCALE`, `HPANG`, `TEXTSTYLE`, `EXTMIN`, `EXTMAX`.
- **F1** khi đang chạy lệnh mở thẳng trang trợ giúp của lệnh đó: cách dùng, tuỳ chọn, lời nhắc đầu, nút **Tìm trên ribbon** (chuyển tới tab và nhấp nháy nút lệnh).
- **F2** mở rộng lịch sử ngay trên dòng lệnh, **Ctrl+F2** cửa sổ chữ (sao chép được).
- `MULTIPLE` hỏi tên lệnh ngay trên dòng lệnh. `UNDO` nhận số bước, `BE`/`E` (gộp nhóm), `M`/`B` (đánh dấu / lùi về); `U` hoàn tác 1 bước.
- Bản dòng lệnh cho script `.scr` và LISP: `-LAYER` (? M S N ON OFF C L LW F T LO U), `-INSERT`, `-BLOCK`, `-OSNAP`. Ví dụ:
  ```
  -LAYER M TUONG C 1 TUONG L DASHED TUONG
  
  -OSNAP END,MID,INT
  LINE 0,0 100,0 100,50
  
  ```
- Tuỳ chọn lệnh theo AutoCAD 2027:
  - `PLINE`: Arc / Close / Halfwidth / **Length** / Undo / Width; khi vẽ cung: **Angle / CEnter / CLose / Direction** / Halfwidth / Line / **Radius / Second pt** / Undo / Width.
  - `CIRCLE`: 3P / 2P / **Ttr**; `ELLIPSE`: **Arc** / Center; `XLINE`: Hor / Ver / **Ang / Bisect / Offset**.
  - `RECTANG`: **Chamfer / Fillet / Width** rồi **Area** / Dimensions / **Rotation**.
  - `TEXT`: Justify (đủ TL … BR) / **Style**; `MTEXT`: **Height / Justify / Rotation / Style / Width** (không hỏi lại cao chữ sau khung).
  - `MOVE` / `COPY`: Enter ở điểm thứ hai = dùng điểm thứ nhất làm độ dời; `COPY` có **mOde** (Một lần / Nhiều lần), Array, **Exit**, Undo.
  - `TRIM`: cuTting edges / **Crossing / Fence / mOde / eRase** / Undo; `EXTEND`: **Boundary edges** / Crossing / Fence / mOde / Undo; Shift + chọn để đổi cắt ↔ kéo dài.
  - `FILLET`: Undo / Polyline / Radius / **Trim** / Multiple, Shift + chọn = góc nhọn; `CHAMFER`: Undo / Polyline / **Distance (2 khoảng) / Angle / Trim / mEthod** / Multiple.
  - `ZOOM`: All / **Center** / Extents / Previous / **Scale** / Window / Object, gõ `2X` = so với màn hình hiện tại.
  - `AREA`: Object / **Add area / Subtract area** (cộng dồn tổng diện tích); `DIST`: **Multiple points**; `MEASUREGEOM`: Distance / Radius / Angle / ARea / Quick / eXit.
  - `DIVIDE` / `MEASURE`: **Block** (chèn khối, có xoay theo đối tượng); `PEDIT`: Close / Join / Width / **Fit / Spline / Decurve** / Reverse / **Undo**.
  - `OFFSET`: thêm **Exit**; `DIMLINEAR`: **Mtext** / Text / Horizontal / Vertical / Rotated; `WIPEOUT`: Frames / **Polyline** (`P`).

## Nhiều bản vẽ cùng lúc
Mỗi file mở ra là một **tab** (như AutoCAD). Bấm tab để chuyển. **Ctrl+Tab** chuyển tab kế tiếp. Ctrl+F4, chữ × hoặc bấm chuột giữa vào tab để đóng tab đó. Mọi thay đổi tự lưu theo từng file.

## Chuột
- **Lăn chuột**: phóng to hoặc thu nhỏ tại con trỏ. **Giữ chuột giữa**: kéo màn hình. **Kích đúp chuột giữa**: phóng vừa bản vẽ.
- **Bấm đối tượng** để thêm vào vùng chọn. **Shift + bấm** để bỏ chọn.
- **Khung chọn**: bấm 2 góc, hoặc kéo giữ chuột.
  - Trái → phải (xanh dương) chỉ chọn đối tượng nằm trọn trong khung.
  - Phải → trái (xanh lá, nét đứt) chọn mọi đối tượng chạm khung.
- **Ô nắm xanh (grip)**: bấm vào một ô thì ô chuyển đỏ và bắt đầu **kéo giãn**. Bấm **Space** để đổi lần lượt sang Di chuyển, Xoay, Tỉ lệ, Đối xứng. Gõ `C` để tạo bản sao.
- **Đa tuyến** có thêm ô nắm ở giữa mỗi đoạn. Kéo ô giữa thì dời cả đoạn. Sau khi bấm ô giữa, chọn `[Thêm đỉnh]`. Sau khi bấm ô ở đỉnh, chọn `[Xoá đỉnh]`.
- **Kích đúp** vào chữ để sửa nội dung, vào đối tượng khác để mở Thuộc tính.
- **Khối và kích thước chọn theo cụm** như AutoCAD: bấm một nét trong khối là chọn cả khối. Khối chỉ có một ô nắm ở điểm chèn. **Ctrl+Shift+A** bật/tắt chế độ này (chọn từng nét).
- **Rê chuột** lên đối tượng khoảng 1 giây sẽ hiện ô gợi ý: loại, màu, lớp, kiểu nét. Rê chuột lên nút trên ribbon sẽ hiện tên lệnh, mô tả và lệnh tắt.

## Phím tắt
| Phím | Chức năng | Phím | Chức năng |
|---|---|---|---|
| F1 | Trợ giúp (đang chạy lệnh: trang của lệnh đó) | F2 / Ctrl+F2 | Lịch sử dòng lệnh / cửa sổ chữ |
| F3 | OSNAP bắt điểm | F7 | GRID lưới |
| F8 | ORTHO (giữ Shift = tạm thời) | F9 | SNAP bước lưới |
| F10 | POLAR góc cực | F11 | OTRACK truy bắt |
| F12 | DYN nhập động | Ctrl+1 | Bảng Thuộc tính |
| Ctrl+P | In bản vẽ (Plot) | | |
| Ctrl+Z / Y | Hoàn tác / làm lại | Ctrl+C / X / V | Sao chép / cắt / dán (dùng được giữa các bản vẽ) |
| Ctrl+Shift+C / V | Sao chép kèm điểm gốc / dán đúng toạ độ | Ctrl+N / O / S | Mới / mở / lưu |
| Ctrl+Shift+S | Lưu thành DXF | Ctrl+P | In / xuất |
| Ctrl+A | Chọn tất cả | Ctrl+9 / Ctrl+0 | Ẩn/hiện dòng lệnh / toàn màn hình |
| Ctrl+Shift+A | Bật/tắt chọn cả nhóm/khối | Tab | Nhập động: khoá ô, sang ô kia |
| ↑ / ↓ | Lệnh trước / nhập gần đây; ↓ = danh sách tuỳ chọn | → | Nhận phần tên lệnh đang hiện mờ |
| Delete | Xoá đối tượng đang chọn | Esc | Huỷ / bỏ chọn |

Bấm chuột phải lên nút **POLAR** hoặc **OSNAP** ở thanh trạng thái để chọn nhanh bước góc hoặc loại điểm bắt.

## Danh sách lệnh
**Vẽ:** `BOUNDARY BO` (bấm trong vùng kín → đa tuyến kín) · `DONUT DO` · `LINE L` · `PLINE PL` (A = cung, C = đóng) · `RECTANG REC` (D = kích thước) · `CIRCLE C` (D, 2P, 3P) · `ARC A` (3 điểm, C = tâm) · `ELLIPSE EL` · `POLYGON POL` · `POINT PO` · `XLINE XL` · `RAY` · `SPLINE SPL` · `REVCLOUD RC` · `TEXT DT` · `MTEXT MT/T` · `HATCH H` (bấm điểm trong vùng kín; S = chọn đường kín; T = mẫu và tỉ lệ)

**Sửa:** `OVERKILL` (xoá nét trùng, gộp đoạn thẳng chồng nhau) · `ALIGN AL` (căn theo 2 cặp điểm: dời + xoay, có thể tỉ lệ) · `MOVE M` · `COPY CO` · `ROTATE RO` (C = sao chép, R = tham chiếu) · `SCALE SC` · `MIRROR MI` · `OFFSET O` (T = đi qua) · `ARRAY AR` (chữ nhật hoặc tròn) · `STRETCH S` (khung cắt) · `TRIM TR` · `EXTEND EX` (bấm phần cần bỏ hoặc kéo dài; giữ Shift để đổi qua lại) · `FILLET F` (R, P = cả đa tuyến, bán kính 0 = nối góc) · `CHAMFER CHA` · `BREAK BR` · `BREAKATPOINT BRP` · `JOIN J` · `EXPLODE X` · `LENGTHEN LEN` · `PEDIT PE` · `ERASE E` · `OOPS` · `MATCHPROP MA` · `DDEDIT ED`

**Kích thước** (nét thật trong bản vẽ, xuất DXF được): `DIMLINEAR DLI` · `DIMALIGNED DAL` · `DIMRADIUS DRA` · `DIMDIAMETER DDI` · `DIMANGULAR DAN` · `DIMCONTINUE DCO` · `DIMBASELINE DBA` · `DIMSTYLE D` (cao chữ, gạch chéo hoặc mũi tên, số lẻ, hệ số, lớp)
- Kích thước vẽ bằng DVDCAD **sửa được như AutoCAD**:
  - Chọn kích thước sẽ hiện ô nắm ở gốc đường gióng, đường kích thước và chữ. Kéo ô nắm thì số đo tự cập nhật.
  - **STRETCH** (khung cắt qua đầu đường và gốc kích thước), **MOVE**, **ROTATE**, **SCALE**, **MIRROR** đều dựng lại kích thước với số đo mới.
  - Sửa chữ kích thước trong bảng Thuộc tính hoặc `DDEDIT` để ghi đè. Để trống thì quay về số đo tự động.

**Ghi chú dẫn:** `MLEADER MLD` (mũi tên + đường dẫn + chữ) · `QLEADER LE` (đường dẫn nhiều đoạn)

**Lớp:** `LAYER LA` (quản lý: tạo lớp, bật/tắt, đóng băng, khoá, màu lớp, **kiểu nét lớp, bề rộng lớp**, lớp hiện hành) · `LAYMCUR` · `LAYISO` / `LAYUNISO` · `LAYOFF` / `LAYON` · `LAYFRZ` / `LAYTHW` · `LAYLCK` / `LAYULK` · `PURGE`

**Sửa khối:** `REFEDIT` / `BEDIT` (hoặc **kích đúp** vào khối)
- Các đối tượng khác tạm ẩn, chỉ còn khối đang sửa.
- Sửa, xoá hoặc vẽ thêm bằng mọi lệnh. Nét vẽ thêm sẽ thuộc khối.
- Bấm **Lưu cho mọi khối** thì **mọi khối cùng tên** trong bản vẽ được cập nhật, kể cả khối xoay hoặc tỉ lệ khác. Bấm **Huỷ thay đổi** để bỏ.

**Thuộc tính khối:**
- `ATTDEF` định nghĩa thuộc tính (tên, lời nhắc, giá trị mặc định) rồi gộp vào khối bằng `BLOCK`.
- Khi `INSERT` khối có thuộc tính, app hỏi giá trị cho từng thuộc tính.
- **Kích đúp** vào khối, hoặc dùng `EATTEDIT`, để sửa giá trị.
- `ATTEXPORT` xuất toàn bộ thuộc tính ra CSV (mở bằng Excel).
- Thuộc tính trong file DWG/DXF gốc (ATTRIB) cũng sửa và xuất được.

**Ảnh nền:**
- `IMAGEATTACH` chèn ảnh (ảnh chụp, bản scan): bấm điểm chèn rồi chiều rộng.
- Di chuyển, xoay, tỉ lệ ảnh như đối tượng thường.
- `IMAGEADJUST` chỉnh độ đậm và bật/tắt khung viền.
- Ảnh lưu trong trình duyệt của máy này. Khi xuất DXF chỉ ghi khung ảnh.

**Tham chiếu ngoài (XREF):**
- `XATTACH` gắn một file DWG/DXF khác làm nền. Nền này hiện mờ, chỉ xem và bắt điểm, không sửa được, không ghi vào file khi lưu. Lớp của nó có dạng `TÊNFILE|LỚP`.
- `XREF` mở bảng quản lý: nạp lại, làm mờ/rõ, gộp vào bản vẽ (Bind), mở file tham chiếu, gỡ.
- Tham chiếu tự nạp lại khi mở bản vẽ.

**Layout giấy:**
- `LAYOUT`, hoặc bấm **＋** cạnh tab Model, để tạo layout mới:
  - Chọn khổ A4 đến A0, ngang hoặc dọc.
  - Có khung bản vẽ và khung tên điền sẵn: công trình, tên bản vẽ, tỉ lệ, ngày, người thiết kế và kiểm tra, số bản vẽ.
  - Có sẵn một khung nhìn theo tỉ lệ 1:N.
- `MVIEW` thêm khung nhìn: chỉ 2 góc trên giấy, rồi nhập tỉ lệ.
- `VPEDIT` đổi tỉ lệ và vùng hiển thị (nút ⌖ = về Model bấm tâm).
- Chuột phải vào tab layout để đổi khổ giấy và khung tên, chỉnh khung nhìn, in hoặc xoá layout.
- `PLOT` khi đang ở layout in đúng khổ giấy của layout, tỉ lệ 1:1. Mép giấy và khung nhìn không in ra.

**Bảng:** `TABLE`
- Nhập số hàng, số cột, hoặc **dán vùng ô copy từ Excel**.
- Sửa bảng bằng **kích đúp** hoặc `TABLEDIT`. Trong hộp sửa có thể thêm/bớt hàng cột, đổi độ rộng cột, dán Excel vào một ô để trải ra nhiều ô.
- Bảng di chuyển, xoay, tỉ lệ như một khối.

**Kích thước nhanh:** `QDIM` — chọn hình rồi đặt vị trí, tự ghi chuỗi kích thước liên tục qua mọi điểm đầu mút. Gõ H/V để chọn ngang/dọc.

**Kích đúp** vào kích thước để sửa chữ ghi đè.

**Khối, nhóm, bộ nhớ tạm:** `INSERT I` · `BLOCK B` (lưu vào thư viện khối của bạn, chèn được vào bản vẽ khác) · `GROUP G` · `UNGROUP` · `COPYCLIP` · `CUTCLIP` · `COPYBASE` · `PASTECLIP` · `PASTEORIG` · `SELECTSIMILAR`

**Kiểu nét & bề rộng:** `LINETYPE LT` (quản lý kiểu nét: tải nét đứt, nét tâm, nét khuất… từ thư viện chuẩn, đặt hiện hành, LTSCALE) · `LTSCALE LTS` · `CELTSCALE` · `LWEIGHT LW` (bật hiện bề rộng, bề rộng hiện hành)
- Ribbon **Trang chủ › Thuộc tính** có 3 ô Màu · Bề rộng · Kiểu nét như AutoCAD. Đang chọn đối tượng thì đổi cho đối tượng đó, không chọn gì thì đặt cho đối tượng vẽ mới.
- Bản vẽ DWG/DXF mở ra **hiện đúng nét đứt** theo bảng kiểu nét và LTSCALE của file, gồm cả kiểu nét theo lớp, ByBlock trong khối và tỉ lệ riêng từng đối tượng.

**Chọn:** `QSELECT` (chọn nhanh theo loại, lớp, màu, kiểu nét, nội dung chữ, cao chữ, chiều dài, bán kính) · `SELECTSIMILAR` · `PICKSTYLE`

**Kiểu chữ:** `STYLE ST`
- Chọn font (Arial, Times New Roman, Tahoma…) và hệ số rộng. Kiểu hiện hành dùng cho TEXT, MTEXT, ghi chú dẫn và kích thước mới.
- Bảng Thuộc tính đổi được kiểu chữ và hệ số rộng của từng chữ.
- Chữ trong file DWG/DXF dùng font TrueType (kể cả VNI-Times, .VnTime) hiện theo đúng họ font.

**Ẩn tạm:**
- `ISOLATEOBJECTS` chỉ hiện các đối tượng đã chọn. `HIDEOBJECTS` ẩn các đối tượng đã chọn. `UNISOLATEOBJECTS` hiện lại tất cả.
- Thanh trạng thái có biểu tượng bóng đèn. Bóng đèn chuyển đỏ khi đang ẩn bớt đối tượng.

**Hỏi / đo:** `MEASUREGEOM MEA` (đo nhanh: rê chuột thấy ngay khoảng cách ngang/dọc tới các cạnh xung quanh) · `DIST DI` · `AREA AA` (O = chọn đối tượng) · `ID` · `LIST LI` · `DIVIDE DIV` · `MEASURE ME` · `QM` (đo nhanh, lưu dạng đánh dấu)

**Xem / file:** `ZOOM Z` (E, W, P, số, O) · `PAN` · `REGEN RE` · `NEW` · `OPEN` · `QSAVE` · `SAVEAS` · `EXPORT/PLOT` · `DSETTINGS DS` · `UNITS` · `FIND` · `COMPARE` · `DRIVE` · `SHARE`

## 3D (tab ribbon "3D", nút **3D** cạnh nút phóng to)
**Tạo khối:**
- `BOX` — hộp: 2 góc đáy + chiều cao.
- `CYLINDER CYL` — trụ. `CONE` — nón (bán kính đỉnh > 0 thành nón cụt). `SPHERE` — cầu.
- `EXTRUDE EXT` — đùn hình kín: đa tuyến kín, đường tròn, elip, hatch (giữ lỗ). Chiều cao âm thì đùn xuống.
- `PRESSPULL PP` — bấm vào trong một vùng kín rồi nhập chiều cao.
- `WALL3D` (`TUONG`) — chọn đường trục tường trên mặt bằng, nhập bề dày và chiều cao, ra tường 3D.

- `PYRAMID` — chóp đáy đa giác đều. `WEDGE` — nêm (ram dốc). `TORUS` — xuyến.
- `REVOLVE REV` — xoay biên dạng kín quanh trục. Mặc định **Đứng**: trục vẽ trên mặt bằng thành phương Z (cột, chậu, con tiện). Chọn **Nằm** để giống AutoCAD.
- `SWEEP` — quét biên dạng (tròn, đa tuyến kín) dọc đường dẫn: ống, dầm, lan can, gờ chỉ. Căn tâm hoặc đáy biên dạng vào đường dẫn.
- `ELEV` — cao độ Z đặt khối mới (ví dụ 3000 để dựng mái trên tường).

**Sửa khối:**
- `UNION UNI` (cộng), `SUBTRACT SU` (trừ: khoét lỗ, cắt bớt), `INTERSECT IN` (lấy phần giao).
- `SLICE SL` — cắt khối bằng mặt phẳng đứng qua 2 điểm, giữ một phía hoặc cả hai.
- `3DMOVE` — dời cả theo phương Z. `3DROTATE` — xoay quanh trục X, Y, Z hoặc trục nằm qua 2 điểm. `MIRROR3D` — lật trên/dưới qua mặt ngang hoặc đối xứng qua mặt đứng.
- Khối sau khi cộng/trừ/xoay 3D thành **khối lưới**: vẫn dời, xoay, tỉ lệ, đối xứng, cộng/trừ tiếp được.

**Vật liệu & hiển thị:**
- `MATERIALS` (`MAT`) — gán vật liệu: bê tông, gạch xây, gạch lát, gỗ, đá, ngói, cỏ, sơn trắng, kính, kim loại, nước. Bảng thuộc tính cũng đổi được.
- `RENDER` — khung 3D kiểu **Thực tế**: vân vật liệu, ánh sáng, bóng đổ.
- `SECTIONPLANE` — mặt cắt ngang, kéo thanh trượt để đổi cao độ cắt (xem bên trong nhà).
- `FLATSHOT` hoặc nút **Chiếu 2D** trong khung 3D — chiếu mô hình thành nét 2D theo góc nhìn hiện tại (mặt đứng, mặt bên, ISO), **đã bỏ nét khuất**, đúng tỉ lệ 1:1. Bấm điểm đặt là xong.

**Mặt phẳng làm việc (UCS):**
- `UCS` → **Mặt đứng qua 2 điểm**, **Trước**, **Bên**, **Mặt khối** (bấm vào mặt trong khung 3D), **Xoay quanh X/Y**, **Cao độ gốc**, **Điểm neo**, **Thế giới**.
- Khi UCS bật, các lệnh BOX, CYLINDER, EXTRUDE, REVOLVE, SWEEP, LOFT, PYRAMID… đặt khối lên mặt phẳng UCS. Biên dạng vẫn vẽ trên mặt bằng, quanh điểm neo, như đang nhìn thẳng vào mặt phẳng đó (X sang phải, Y lên trên). Ví dụ: vẽ ô cửa trên mặt bằng rồi EXTRUDE, ô cửa sẽ dựng đứng trên tường.
- Góc trên trái bản vẽ hiện `[UCS: …]` hoặc `[WCS]`. Khung 3D vẽ mũi tên trục UCS.

**Khối nâng cao:**
- `LOFT` — chọn các mặt cắt kín từ dưới lên (tròn, vuông, elip…), nhập khoảng cách đều hoặc danh sách cao độ (`0,800,2500`).
- `FILLETEDGE` / `CHAMFEREDGE` — bo/vát cạnh trên, dưới, cạnh đứng hoặc tất cả, cho khối hộp, khối đùn, tường và khối trụ.

**Ánh sáng, camera:**
- `SUNPROPERTIES` (`SUN`) — mặt trời theo **ngày, giờ, vĩ độ, kinh độ, múi giờ, hướng Bắc**. Mặc định là TP.HCM. Nút **▶ Bóng đổ trong ngày** chạy bóng từ 6h đến 18h.
- `LIGHT` — đặt đèn điểm: vị trí, cao độ, cường độ, màu. Đèn sáng trong kiểu xem **Thực tế**.
- `CAMERA` — bấm điểm đứng, điểm nhìn, nhập cao mắt và tên. Khung 3D mở phối cảnh từ đúng vị trí đó. Camera được lưu trong danh sách **Đã lưu…** cùng các góc nhìn bạn lưu.
- `3DWALK` hoặc nút **Đi bộ**: dùng W A S D để đi, Q/E để xuống/lên, Shift để đi nhanh, kéo chuột để nhìn quanh. Trên điện thoại có bàn phím mũi tên trên màn hình.

**Mặt cắt:**
- `SECTIONPLANE` → **Ngang** (kéo thanh để đổi cao độ) hoặc **Đứng qua 2 điểm**. Chỗ cắt được tô kín bằng gạch chéo.
- Nút **Mặt cắt → 2D** (`SECTION2D`) chèn mặt cắt thành đa tuyến + hatch ANSI31. Mặt cắt ngang có thể đặt đúng vị trí trên mặt bằng.

Trên mặt bằng, khối hiện dạng hình chiếu. MOVE, COPY, ROTATE, SCALE, MIRROR, ARRAY, ERASE dùng được như hình 2D. Bảng thuộc tính sửa được cao độ đáy, chiều cao, bán kính và xem thể tích.

**Xem 3D:** `3DORBIT` (`3DO`, `VIEW3D`) hoặc nút **3D**.
- Chuột: kéo trái để xoay, kéo phải/giữa hoặc Shift+kéo để dời, lăn để phóng, kích đúp để vừa màn hình.
- Điện thoại: 1 ngón xoay, 2 ngón dời và phóng.
- ViewCube: bấm mặt để xem Trên, Trước, Phải… Nút ⌂ về góc ISO.
- Góc nhìn chuẩn: Trên, Trước, Phải, Trái, Sau, 4 góc ISO. Gõ thẳng được `VIEWTOP`, `VIEWFRONT`, `VIEWSWISO`…
- Kiểu hiển thị: Khung dây, Tô bóng, Tô bóng + cạnh, X-quang.
- Phối cảnh hoặc song song. Bật/tắt nét 2D ở cao độ 0.
- Esc hoặc "✕ 2D" để về bản vẽ.

**Dùng lệnh ngay trong khung 3D:** bấm nút trên ribbon hoặc gõ lệnh khi đang xem 3D, không cần về 2D.
- Khi lệnh hỏi **điểm**: bấm vào khung 3D. Điểm tự bắt vào **đỉnh khối** gần con trỏ (ô vàng), hoặc điểm đặc biệt của nét 2D, hoặc điểm trên mặt phẳng cao độ hiện hành (`ELEV`). Vòng xanh và nét đứt cho thấy điểm sẽ chọn.
- Khi lệnh hỏi **chọn đối tượng**: bấm vào khối hoặc nét 2D trên mặt đất. Đối tượng được chọn viền xanh. **Enter** hoặc **chuột phải** để xong.
- Số (chiều cao, bán kính…) gõ thẳng, hiện ở dòng lệnh phía dưới.
- Không có lệnh: bấm khối để chọn (Shift để chọn thêm), rồi gọi lệnh (MOVE, ERASE, SUBTRACT…).
- **Esc** huỷ lệnh đang chạy. Bấm Esc lần nữa để về 2D. Cảnh 3D tự cập nhật sau mỗi lệnh và sau Undo/Redo.

**Xuất:** ảnh PNG, `EXPORTSTL` (in 3D, đơn vị mm), `EXPORTOBJ` (+ file MTL màu, mở bằng SketchUp, Blender, 3ds Max). Lưu DXF thì khối 3D thành mặt **3DFACE**, AutoCAD mở được. File DXF lưu từ DVDCAD mở lại vẫn là khối (sửa tiếp chiều cao, bán kính, vật liệu). File DXF/DWG có 3DFACE, file DXF có lưới POLYFACE / POLYGON MESH / MESH (SketchUp, Revit, AutoCAD xuất ra) cũng xem 3D được.

## Lệnh bổ sung (v4j)
**Vẽ & sửa:**
- `MLINE ML` — đường đôi (tường): **J** canh lề Trên/Giữa/Dưới, **S** tỉ lệ = bề rộng (mặc định 220), **C** đóng, **U** bỏ đoạn. Kết quả là một nhóm, EXPLODE để tách. `MLSTYLE` đặt vị trí các đường (vd tường có lớp trát: `0.5, 0.42, -0.42, -0.5`) và bật/tắt nắp đầu.
- `ARRAYPATH` — mảng theo đường dẫn (đường, đa tuyến, cung, tròn): chia đều số lượng hoặc theo khoảng cách, có/không xoay theo hướng đường.
- `BLEND` — nối đầu 2 đường bằng đường cong trơn. `REVERSE` — đảo chiều. `SETBYLAYER` — đưa màu, kiểu nét, bề rộng nét về ByLayer.

**Kích thước:** `DIMORDINATE DOR` (toạ độ X/Y; kéo dọc ra X, kéo ngang ra Y; **G** đặt gốc), `DIMARC` (dài cung, có ký hiệu ⌒), `CENTERMARK CM` (dấu tâm + đường tâm), `CENTERLINE CL` (đường tâm giữa 2 đường).

**Chữ:** `SCALETEXT` (đổi cỡ nhiều chữ), `JUSTIFYTEXT` (đổi canh lề mà chữ không xê dịch), `TXT2MTXT` (gộp nhiều dòng chữ đơn thành chữ nhiều dòng).

**Lớp:** `LAYMRG` (gộp lớp), `LAYDEL` (xoá lớp và mọi đối tượng trên lớp).

**Khác:** `VIEW` (lưu/gọi góc nhìn 2D đặt tên), `CAL` (máy tính: `2*(3+4)^2`, `sqrt`, `sin/cos/tan` theo độ, `pi`; kết quả chép vào clipboard), `PUBLISH` (in nhiều layout ra một PDF nhiều trang).

**3D:** `SHELL` (làm rỗng khối: bể nước, hộp — hở mặt trên/dưới hoặc kín), `INTERFERE` (kiểm tra va chạm giữa các khối, tạo khối đỏ ở lớp VA_CHAM), `MASSPROP` (thể tích, diện tích mặt, trọng tâm, khối lượng theo vật liệu), `3DARRAY` (hàng × cột × tầng, hoặc tròn).

## Bổ sung (v5h) — XCLIP giống AutoCAD
- Phần khối nằm ngoài đường cắt chỉ bị **ẩn**, vẫn còn trong bản vẽ. Không bấm chọn, không bắt điểm vào phần ẩn được. Chọn khối thì chọn cả khối: dời, xoay, xoá, phá khối đều tác động lên toàn bộ khối.
- `XCLIP` có đủ tuỳ chọn như AutoCAD:
  - **Bật** / **Tắt**: tắt thì hiện đủ khối, bật lại thì cắt như cũ. Khối có đường cắt đang tắt trong file cũng bật lại được.
  - **Xoá**: bỏ đường cắt.
  - **Tạo đa tuyến**: vẽ đa tuyến theo đường cắt.
  - **Khung cắt mới**: Chọn đa tuyến (đa tuyến kín, đường tròn), Đa giác, Chữ nhật, Đảo ngược (giữ phần bên ngoài, ẩn phần bên trong). Có hỏi xoá đường cắt cũ.
  - Hoàn tác / Làm lại được.
- Dời, xoay, co giãn, chép khối: đường cắt đi theo khối. Phá khối (`EXPLODE`): hiện đủ, bỏ đường cắt.
- `XCLIPFRAME`: 0 = ẩn khung đường cắt, 1 = hiện và in, 2 = hiện nhưng không in (mặc định, đọc theo file).
- Lưu DXF (2000 trở lên): khối được ghi đủ (cả phần bị cắt) kèm đường cắt (SPATIAL_FILTER). Mở bằng AutoCAD vẫn thấy khối bị cắt, XCLIP Tắt trong AutoCAD hiện lại đủ.
- Ribbon › Chèn › Tham chiếu: XCLIPFRAME.

## Bổ sung (v5g) — XCLIP của file DWG / DXF
- Khối đã cắt bằng `XCLIP` trong AutoCAD nay hiển thị đúng khi mở file DWG / DXF: phần nằm ngoài đường cắt được ẩn, nét cắt ngang đường cắt chỉ hiện phần bên trong.
- Hỗ trợ đường cắt chữ nhật và đa giác, khối xoay / co giãn, khối lồng nhau. Khối có đường cắt đang tắt (`XCLIP` › Tắt trong AutoCAD) hiện đầy đủ.
- Phần bị cắt không bấm chọn được, không tính vào phạm vi bản vẽ (Zoom Extents).
- Trên layout, khối đã cắt hiển thị đúng trong khung nhìn (cắt theo cả khung nhìn và đường cắt của khối).
- Bản vẽ nặng mở nhanh hơn vì phần bị cắt không còn phải vẽ.

## Bổ sung (v5f) — lệnh AutoCAD còn thiếu
**Khung nhìn trên layout** (bấm vào trong khung nhìn để chọn; khung chồng nhau thì lấy khung nhỏ hơn)
- `VPLAYER`: đóng băng / làm tan lớp riêng trong từng khung nhìn. Nhập tên lớp (`*`, `?`, dấu phẩy) hoặc Enter rồi chọn đối tượng. Tuỳ chọn Đặt lại (làm tan hết), Liệt kê.
- `LAYVPI`: lớp của đối tượng chọn chỉ còn hiện ở một khung nhìn, các khung nhìn khác đóng băng.
- `VPCLIP`: cắt khung nhìn theo đa giác hoặc đối tượng kín (đa tuyến, đường tròn). Khung nhìn đổi theo đường cắt. Xoá = bỏ cắt.
- `VPSYNC`: các khung nhìn theo tỉ lệ của khung nhìn chính và căn thẳng hàng với nó (Enter = tất cả khung còn lại).
- `SPACETRANS`: đổi chiều dài giấy ↔ mô hình theo tỉ lệ khung nhìn (vd chữ cao 2,5 mm trên giấy ở 1:50 = 125). Kết quả được chép vào bộ nhớ tạm.

**Nhập / xuất file**
- `IMPORT`: chọn loại file cần nhập (PDF, ACIS, ảnh, bảng CSV / Excel, DWG / DXF tham chiếu, add-in).
- `ATTACH`: gắn tham chiếu (DWG / DXF, ảnh, PDF, liên kết dữ liệu bảng).
- `ACISIN`: nhập khối 3D từ file ACIS `.sat` / `.sab`.
- `ETRANSMIT`: đóng gói bản vẽ (DXF) kèm ảnh nền, file tham chiếu và báo cáo thành một file `.zip` để gửi. `ARCHIVE`: như ETRANSMIT, dùng để lưu trữ.
- `TIFOUT`: xuất khung nhìn thành ảnh TIFF. `BMPOUT` nay xuất ảnh BMP thật (trước đây là JPG).
- `XOPEN`: chọn một đối tượng của tham chiếu ngoài để mở file đó ra sửa.
- `3DPRINT` (= EXPORTSTL), `EXPORTTOAUTOCAD` (= SAVEAS), `RECOVERALL` (= RECOVER), `XBIND` (= XREF, nút Gộp).
- `REINIT`: nạp lại DVDCAD.

**Kiểu nét**
- `MKLTYPE`: tạo kiểu nét từ các đoạn thẳng và điểm đã vẽ. Nhập tên, mô tả, bấm điểm đầu và điểm cuối của một chu kỳ mẫu, rồi chọn các đoạn thẳng / điểm nằm trên đường đó. Kiểu nét mới dùng ngay, lưu cùng thiết lập, và tải được file `.lin` cho AutoCAD.

**Ảnh nền**
- `IMAGEFRAME`: 0 = ẩn khung ảnh, 1 = hiện và in, 2 = hiện nhưng không in.
- `IMAGEQUALITY`: Cao (mịn) / Nháp (nhanh).

**Đèn**
- `SPOTLIGHT`: đèn rọi (vị trí, điểm rọi, cao độ, góc chiếu, cường độ, màu).
- `DISTANTLIGHT`: đèn song song như mặt trời, theo hướng và góc chiếu xuống.
- `LIGHTLIST`: danh sách đèn: bật / tắt, sửa cao độ, cường độ, màu, xoá, phóng tới đèn.
- Đèn hiện trong khung xem 3D ở kiểu Thực tế (RENDER) và cập nhật ngay khi sửa.

**3D**
- `SEPARATE`: tách một khối gồm nhiều phần rời nhau (vd sau UNION hai khối không chạm) thành các khối riêng.

**Thiết lập**
- `AUTOCOMPLETE`: bật / tắt gợi ý lệnh khi gõ ở dòng lệnh.
- `DRAGMODE`: Tắt = không hiện hình xem trước khi kéo / di chuyển đối tượng.

**Tên gọi khác**
- `DVIEW` (= 3DORBIT), `SOLPROF` (= FLATSHOT), `SOLVIEW` / `SOLDRAW` (= VIEWBASE), `PASTESPEC` (= PASTECLIP), `COPYLINK` (= COPYCLIP), `TPNAVIGATE` (= TOOLPALETTES), `MATBROWSEROPEN` (= MATERIALS), `SHEETSET` / `SSM` (= PUBLISH), `3DALIGN` (= ALIGN).

**Ribbon**
- Hiển thị › Layout: VPCLIP, VPLAYER, VPSYNC, LAYVPI, SPACETRANS.
- Chèn › Nhập: IMPORT, ACISIN. Chèn › Tham chiếu: ATTACH, XOPEN, IMAGEFRAME.
- Xuất › Xuất file: ETRANSMIT, ARCHIVE, TIFOUT, BMPOUT. Xuất 3D: 3DPRINT.
- Trình diễn › Ánh sáng: SPOTLIGHT, DISTANTLIGHT, LIGHTLIST. Trang chủ (Mô hình 3D) › Sửa khối: SEPARATE.
- Thuộc tính (menu thêm): MKLTYPE. Quản lý › Bản vẽ: AUTOCOMPLETE, DRAGMODE, REINIT.

## Bổ sung (v5e) — lệnh AutoCAD còn thiếu
**Độ trong suốt** (như AutoCAD)
- Bảng **Thuộc tính** có dòng **Độ trong suốt**: ByLayer hoặc 0–90 %. Áp dụng được cho đối tượng đang chọn và cho đối tượng mới.
- `CETRANSPARENCY`: độ trong suốt cho đối tượng mới.
- `TRANSPARENCY` (hoặc nút **TP** trên thanh trạng thái): hiện / ẩn độ trong suốt.
- Lưu và mở DXF dùng mã 440 (DXF 2004 trở lên). AutoCAD đọc đúng.

**Sửa, vẽ**
- `MPEDIT`: sửa nhiều đa tuyến một lúc. Lệnh tự đổi đường, cung thành đa tuyến, rồi cho các tuỳ chọn: Đóng / Mở, **Nối** (có khoảng hở fuzz, giữ cung), Độ rộng, Đảo chiều.
- `DIMLAYER`: lớp cho kích thước mới (`.` = lớp hiện hành).
- `DCLINEAR`: ràng buộc kích thước ngang / dọc.
- `XDLIST`: xem toàn bộ dữ liệu của một đối tượng.
- `UNDEFINE` / `REDEFINE`: tắt / bật lại một lệnh có sẵn. Gõ `.TÊN` (vd `.LINE`) để vẫn dùng lệnh gốc. Hay dùng cùng AutoLISP.

**3D**
- `MESH`: khối lưới cơ bản (hộp, trụ, nón, cầu, nêm, xuyến, chóp).
- `CONVTOMESH`: đổi khối thành lưới. `CONVTOSOLID`: đổi lưới kín thành khối đặc. `CONVTOSURFACE`: đổi khối thành mặt.
- `3DFACE`: mặt 3D qua 3–4 điểm.
- `THICKEN`: làm dày mặt phẳng (PLANESURF, 3DFACE…) thành khối.
- Tên gọi khác của xem 3D: `3DFORBIT`, `3DCORBIT`, `3DPAN`, `3DZOOM`, `3DSWIVEL`, `3DDISTANCE` (= 3DORBIT), `3DFLY` (= 3DWALK), `3DCLIP` (= SECTIONPLANE).

**File**
- `REVERT`: bỏ mọi thay đổi, mở lại bản vẽ như lúc mở file. Dùng được với file đã mở trên máy này.
- `QUIT` / `EXIT` / `QQUIT`: đóng bản vẽ. `SAVEALL`: lưu. `PREVIEW`: xem trước bản in.
- `LOGFILEON` / `LOGFILEOFF`: ghi nhật ký dòng lệnh rồi tải file `.log`.

**Giao diện**
- `RIBBON` / `RIBBONCLOSE`, `COMMANDLINE` / `COMMANDLINEHIDE`, `PROPERTIESCLOSE`, `LAYERCLOSE`, `QCCLOSE`, `GRAPHSCR`.
- `HIDEPALETTES` / `SHOWPALETTES`: ẩn / hiện các bảng.
- `NAVBAR`: hiện / ẩn thanh điều hướng.
- `WORKSPACE`: đổi Vẽ 2D / Mô hình 3D.

**Tên gọi khác**
- `CLASSICLAYER` (= LAYER), `EATTEXT` (= trích thuộc tính), `GOTOURL` (= mở liên kết), `NEWVIEW` (= VIEW), `LAYOUTWIZARD` (= LAYOUT).
- `VIEWRES`, `LAYERPMODE`, `ARRAYCLOSE` có cho đủ lệnh như AutoCAD.

**Ribbon**
- Khối đặc › Mặt lưới thêm: MESH, CONVTOMESH, CONVTOSOLID, THICKEN, 3DFACE, CONVTOSURFACE.
- MPEDIT nằm trong menu thêm của bảng Sửa.

## Bổ sung (v5d) — add-in: AutoLISP và JavaScript
**`APPLOAD` (`AP`)** (ribbon › thẻ **Add-ins** › Nạp ứng dụng): nạp add-in giống AutoCAD.
- **Nạp file…**: chọn `.lsp` (AutoLISP) hoặc `.js` (JavaScript); nạp được nhiều file một lần. Có thể nạp từ đường link. Bộ tiện ích nhiều tệp (`.lsp` + `.dcl`): **Nạp cả thư mục…** hoặc gói `.zip` (từ v6e).
- Cột **Khởi động** (Startup Suite): add-in tự nạp mỗi khi mở DVDCAD. **Nạp lại** / **Gỡ** từng add-in.
- **Add-in mẫu**, bấm **Cài**:
  - *QS — khối lượng*: `TONGDAI` (tổng chiều dài theo lớp), `TONGDT` (tổng diện tích vùng kín). Kết quả chèn bảng vào bản vẽ hoặc tải file CSV mở bằng Excel.
  - *Tiện ích AutoLISP*: `STT` (đánh số thứ tự), `TL` (tổng chiều dài), `DTL` (đổi lớp theo đối tượng mẫu), `KHUNGTEN` (vẽ khung bản vẽ).
- Lệnh của add-in hiện ở thẻ **Add-ins** trên ribbon.

**AutoLISP**
- `(defun c:TEN () …)` thành lệnh `TEN`.
- Gõ thẳng biểu thức ở dòng lệnh: `(+ 1 2)`, `(setq r 5)`. Khi lệnh đang hỏi, gõ `!r` để dùng giá trị biến.
- `VLISP` (`VLIDE`): bảng gõ thử mã LISP (Ctrl+Enter = chạy), có nút lưu thành add-in.
- Có các hàm thông dụng:
  - nhập liệu: `getpoint`, `getdist`, `getstring`, `initget`, `entsel`, `ssget` (kèm bộ lọc);
  - đối tượng: `entget`, `entmod`, `entmake`;
  - chạy lệnh: `(command "LINE" p1 p2 "")`, `pause`;
  - hệ thống, danh sách, chuỗi: `getvar`, `setvar`, `vl-sort`, `vl-string-…`.
- Danh sách đầy đủ trong `ADDIN-API.md` (lệnh `ADDINAPI`).

**JavaScript**: file `.js` dùng API `DVDCAD` để:
- đăng ký lệnh: `DVDCAD.addCommand`;
- hỏi điểm / chọn đối tượng: `getPoint`, `getSelection`;
- thêm / sửa / xoá đối tượng (UNDO được): `addLine`, `addText`, `modify`, `erase`;
- chạy lệnh, xuất file: `command`, `download`.

Xem `ADDIN-API.md`.

**Không chạy được:**
- `.fas` / `.vlx` (LISP đã biên dịch và mã hoá);
- `.dll` / `.arx` (.NET, ObjectARX);
- `.dvb` (VBA).

Đây là mã chỉ chạy trong AutoCAD. Cần bản mã nguồn `.lsp`; với add-in .NET, cần viết lại phần xử lý bằng JavaScript. Hộp thoại DCL và hàm `vla-` / `vlax-` dùng được từ v6e.

## Bổ sung (v5c) — ngôn ngữ giao diện đồng bộ
- Bấm nút **Không gian làm việc** (cạnh nút Lưu) › **Ngôn ngữ giao diện** để chọn **English** hoặc **Tiếng Việt**. Lựa chọn áp dụng cho toàn bộ giao diện:
  - ribbon, thẻ, thanh trạng thái, bảng Thuộc tính, bảng Lớp;
  - dòng lệnh, lời nhắc, tuỳ chọn lệnh;
  - thông báo, hộp thoại, menu chuột phải, khung 3D, trợ giúp F1.
- Lần đầu mở app, ngôn ngữ theo trình duyệt (trình duyệt tiếng Việt → Tiếng Việt, khác → English). Chọn lại thì app nhớ cho lần sau.
- Dữ liệu bản vẽ **không** bị dịch: tên lớp, tên khối, layout, tên file và chữ trong bản vẽ giữ nguyên.
- Tên lệnh, phím tắt và chữ cái tuỳ chọn giữ như AutoCAD ở cả hai ngôn ngữ.

## Bổ sung (v5b) — giống AutoCAD hơn
**Kích thước liên kết** (như DIMASSOC = 2 của AutoCAD)
- Nếu gốc đường gióng của kích thước nằm đúng điểm đặc trưng của đường hình, kích thước tự cập nhật theo khi sửa riêng đường hình. Điểm đặc trưng gồm: đầu mút, trung điểm, tâm, góc phần tư, đỉnh đa tuyến.
- Các thao tác áp dụng: kéo ô nắm, MOVE, ROTATE, SCALE, STRETCH, MIRROR.
- Dời cả đối tượng: đường kích thước dời theo, giữ nguyên khoảng cách.
- Kích thước chéo (DIMALIGNED) xoay theo đường hình.
- Kích thước bán kính / đường kính bám theo đường tròn hoặc cung.
- Lệnh liên quan:
  - `DIMDISASSOCIATE` (`DDA`): bỏ liên kết, kích thước đứng yên.
  - `DIMREASSOCIATE` (`DRE`): chọn lại điểm gốc. Enter để giữ điểm cũ.
  - `DIMASSOC`: 2 = bám theo (mặc định), 0 / 1 = không bám.
- `DIMROTATED`: kích thước thẳng đo theo góc cho trước.

**Đa tuyến có độ rộng** (PLINE W / H, PEDIT W, TRACE, mây thư pháp, file DWG / DXF)
- Giữ đúng đỉnh thật, cung và cờ kín. Trước đây bị đổi thành đường hở nhiều đỉnh.
- Góc được lấp kiểu vát nhọn (miter) như AutoCAD.
- Vẫn giữ độ rộng khi kéo ô nắm, thêm / xoá đỉnh, FILLET / CHAMFER, OFFSET, BREAK, MOVE, ROTATE và MIRROR.
- SCALE nhân cả độ rộng. Đảo chiều (PEDIT R, REVERSE) đổi độ rộng đầu ↔ cuối.
- Lưu DXF ghi độ rộng 40 / 41 theo từng đỉnh, kèm cung.

**FILLET / CHAMFER đa tuyến (P):** góc bo thành cung thật (bulge) ngay cả với đa tuyến thẳng.

**EXPLODE đa tuyến có cung:** ra cung ARC và đoạn LINE, không còn hàng trăm đoạn nhỏ.

**3D**
- `POLYSOLID` (`PSOLID`): tường 3D như AutoCAD. Vẽ theo điểm (C = khép kín) hoặc chọn **Đối tượng** (đường, cung, tròn, đa tuyến; đối tượng gốc bị xoá như AutoCAD).
  - Tuỳ chọn **Cao / Rộng / Canh** (Trái / Giữa / Phải).
  - Góc tường nối kiểu vát nhọn. Phòng khép kín thành một khối có lỗ.
- Mặt lưới (số chia theo `SURFTAB1` / `SURFTAB2`, mặc định 6 như AutoCAD):
  - `RULESURF`: mặt kẻ giữa 2 đường. Điểm bấm trên mỗi đường quyết định đầu nào nối với đầu nào.
  - `TABSURF`: đường dẫn trượt theo đoạn thẳng chỉ hướng, hoặc **Cao** (dựng mặt đứng theo Z).
  - `REVSURF`: xoay đường biên dạng quanh một trục (đoạn thẳng), có góc đầu và góc quay. Ví dụ dùng cho chậu, bình, mái vòm.
  - `EDGESURF`: mặt Coons giới hạn bởi 4 cạnh nối đầu nhau.
  - `PLANESURF`: mặt phẳng từ 2 góc chữ nhật hoặc từ đối tượng kín.
- Hướng nhìn 3D:
  - `VPOINT`: nhập véc-tơ x,y,z, ví dụ `0,-1,0` = nhìn đứng, `1,-1,1` = ISO Tây Nam. Tuỳ chọn Xoay để nhập 2 góc.
  - `DDVPOINT`: hộp thoại 2 góc.
  - `HIDE`: khuất nét, chỉ hiện cạnh thấy được. Trong khung 3D có thêm kiểu "Khuất nét (HIDE)".

**Khác**
- `MINSERT`: chèn khối thành mảng hàng × cột.
- `ABOUT`: thông tin phiên bản.
- Tên gọi khác như AutoCAD: `EXOFFSET` (= OFFSET có E / L / M), `SAVEIMG` (PNG), `MTEDIT`, `EXCHPROP`.
- Ribbon:
  - Annotate › Kích thước: Liên kết lại / Bỏ liên kết / Xoay góc.
  - Solid: thêm bảng Mặt lưới.
  - Visualize › Điều hướng: VPOINT, DDVPOINT, HIDE.
  - Polysolid thay cho nút Dựng tường cũ. `WALL3D` vẫn dùng được.

## Bổ sung (v5a) — xem 3D cập nhật theo lớp
Khi đang xem 3D, khung nhìn tự vẽ lại sau khoảng 0,3 giây nếu có một trong các thay đổi sau:
- Bật / tắt, đóng băng / rã băng lớp: ô Lớp trên ribbon, bảng Quản lý lớp, bảng Lớp trên điện thoại, `LAYOFF`, `LAYFRZ`, `LAYON`, `LAYTHW`, `LAYISO`, `LAYUNISO`, `LAYERP`, `LAYERSTATE`.
- Đổi màu lớp. Khối đọc từ file DWG/DXF cũng đổi màu theo.
- Ẩn / hiện đối tượng: `HIDEOBJECTS`, `ISOLATEOBJECTS`, `UNISOLATEOBJECTS`.
- Mở bản vẽ khác khi 3D đang mở: khung 3D tự mở lại với bản vẽ mới.

Sửa lỗi lớp (cả ở màn hình 2D):
- `LAYISO` trước đây không tắt được lớp nào.
- `LAYUNISO` không khôi phục được trạng thái lớp.
- `LAYON` / `LAYTHW` sau khi cô lập bị bật ngược lại.

Nguyên nhân: các lệnh này sửa thẳng danh sách lớp, rồi bị trạng thái cũ của bảng Lớp ghi đè.

## Bổ sung (v4z)
**Công cụ chữ** (như Express Tools)
- `TJUST`: đổi canh lề (L, C, R, TL…BR, MC) mà chữ không dời.
- `TORIENT`: xoay chữ về góc cho trước, hoặc Enter để lật chữ bị ngược cho dễ đọc. Giữ tâm chữ.
- `TSCALE`: đổi cỡ nhiều chữ theo hệ số hoặc chiều cao mới, giữ điểm đặt.
- `TEXTFIT`: co / giãn bề rộng chữ cho vừa tới điểm chỉ định.
- `TCIRCLE`: khung tròn / khe bo 2 đầu / chữ nhật quanh chữ (ghi số hiệu trục, phòng…).

**Thuộc tính, liên kết**
- `ATTIPEDIT`: sửa tại chỗ một thuộc tính khối. `BATTORDER`: mở BATTMAN để đổi thứ tự.
- `XLIST`: xem loại / lớp / màu / kiểu nét / khối chứa của đối tượng nằm trong khối.
- `CHURLS`: đổi / xoá siêu liên kết.

**Kích thước, sửa hình**
- `DIMEX` / `DIMIM`: xuất / nhập kiểu kích thước ra file `.dvddim` để dùng chung giữa các máy.
- `MSTRETCH`: kéo giãn bằng nhiều khung cắt cùng lúc (VD nới cả 2 đầu bản vẽ một lần).

**3D → bản vẽ 2D**
- `VIEWBASE` (`HINHCHIEU`): dựng 3 hình chiếu đứng / bằng / cạnh từ khối 3D. Đã khử nét khuất, tỉ lệ 1:1.
  - **Góc chiếu thứ nhất (TCVN / ISO):** hình bằng đặt dưới, hình cạnh (nhìn từ trái) đặt bên phải.
  - **Góc chiếu thứ ba:** hình bằng đặt trên.

**Dòng lệnh, script**
- `MULTIPLE`: lặp lại một lệnh liên tục tới khi bấm Esc.
- `HISTORY` / `TEXTSCR`: cửa sổ lịch sử dòng lệnh, sao chép được.
- `DELAY`: tạm dừng trong file script `.scr`. `TEXTSTYLE`: như STYLE.

## Bổ sung (v4y) — mở file dung lượng lớn
**Tối ưu file lớn** (thử với file DXF 37 MB: 200 nghìn đối tượng, nổ khối thành 600 nghìn nét; mở trong khoảng 3 giây trên máy thử)
- Đọc DXF không còn tách cả file thành mảng dòng, bỏ các mã không dùng (100, 102, 330, 360) → bộ nhớ tạm khi đọc giảm khoảng một nửa (file 37 MB: 174 MB còn 86 MB). Quan trọng nhất trên iPhone.
- **Trước đây bản vẽ bị cắt im lặng ở 200 nghìn đối tượng.** Nay máy tính hiện tới 2 triệu, iPhone / iPad tới 400 nghìn. Vượt giới hạn thì **có thông báo** chỉ hiện phần đầu.
- **Phóng / dời mượt** với bản vẽ nặng: trong lúc thao tác dùng ảnh tạm của lớp nét (vài ms mỗi khung). Ngừng tay khoảng 0,16 giây thì vẽ lại đầy đủ, nét sắc.
- Vẽ nhanh hơn:
  - Nét cùng màu / bề rộng / kiểu nét được gom thành một lần vẽ, kể cả khi các lớp xen kẽ nhau.
  - Đường tròn / cung dùng hàm vẽ cung của trình duyệt.
  - Chữ không còn lưu / khôi phục trạng thái canvas từng chữ.
  - Chữ nhỏ dưới 4 px hiện thành vệt mờ.
  - Bản vẽ trên 300 nghìn nét bỏ qua nét nhỏ hơn 1 px.
- File DXF trên 3 MB: hiện thông báo "Đang mở file … MB" trong lúc đọc.
- `QTEXT` (chữ hiện thành khung) và `FILL` Tắt (hatch chỉ hiện biên) giúp vẽ còn nhanh hơn với bản vẽ rất nặng.

**Lệnh mới**
- `QTEXT`, `FILL`: xem ở trên. `ATTDISP`: ẩn / hiện thuộc tính khối.
- `RECOVER`: mở file DXF / DWG bị lỗi rồi tự chạy `AUDIT` kiểm tra và sửa.
- `DIMJOGLINE`: ký hiệu gấp khúc trên đường kích thước (kích thước không đúng tỉ lệ). Bấm vị trí đặt; từ khoá Bỏ để xoá.
- `DIMINSPECT`: khung kiểm tra cho kích thước (nhãn | giá trị | tần suất, VD "KT | 1000 | 100%"); Bỏ khung.
- `DIMREGEN`: dựng lại toàn bộ kích thước. Ký hiệu gấp khúc và khung kiểm tra vẫn giữ khi kéo nắm, DIMREGEN, lưu DXF.
- `GATTE`: đổi giá trị một thuộc tính cho mọi bản chèn cùng khối (VD đổi mác bê tông cho mọi cột).
- `XEDGES`: lấy cạnh khối 3D thành đường 2D (hình chiếu bằng).
- `VPMAX` / `VPMIN`: phóng khung nhìn của layout ra cả màn hình để xem / sửa ở Model, rồi quay lại layout.
- `MSPACE` / `PSPACE`: chuyển Model ↔ layout giấy. `PAGESETUP`: mở hộp thoại In.

## Bổ sung (v4x)
**REVCLOUD — khoanh mây như AutoCAD**
- Sửa lỗi cung bị lật vào trong: cung luôn **lồi ra ngoài**. Mây là đa tuyến có cung thật, lưu DXF ra LWPOLYLINE có cung.
- Từ khoá:
  - **Độ dài cung**: nhập độ dài cung nhỏ nhất và lớn nhất; khác nhau thì cung dài ngắn xen kẽ như vẽ tay. Chưa đặt thì tự lấy theo mức phóng.
  - **Chữ nhật**: 2 góc. **Đa giác**: bấm các đỉnh, Enter để khép.
  - **Tự do**: bấm điểm đầu rồi rê chuột / ngón tay theo đường mây; về gần điểm đầu là mây kín.
  - **Đối tượng** (mặc định khi Enter): đổi đường tròn, elip, đa tuyến, cung, đường thẳng thành mây. Biên hatch thì tạo thêm mây theo biên, hatch giữ nguyên. Có hỏi **đảo chiều cung**.
  - **Kiểu**: Thường / Thư pháp (nét đậm nhạt).
  - **Sửa mây**: mở `REVCLOUDPROPERTIES`.
- Cài đặt được nhớ cho lần sau.
- `REVCLOUDPROPERTIES` (RCP): chọn mây đã vẽ để đổi độ dài cung, kiểu, đảo chiều. Mây đã dời / xoay / tỉ lệ vẫn sửa được.

**Lệnh mới khác**
- `DIMOVERRIDE`: ghi đè cho từng kích thước đã vẽ: cao chữ, số lẻ, mũi tên, hệ số đo, tiền tố / hậu tố, cỡ mũi tên, khe chữ. **Xoá ghi đè** đưa kích thước về kiểu hiện hành.
- `BLOCKREPLACE`: thay mọi bản chèn của khối A bằng khối B, giữ vị trí, góc xoay, tỉ lệ và giá trị thuộc tính cùng tên.
- `MOCORO`: dời / sao chép / xoay / tỉ lệ liên tiếp quanh một điểm gốc.
- `TCASE`: đổi kiểu chữ Câu / thường / HOA / Tiêu Đề / đẢO, đúng cả chữ tiếng Việt có dấu.
- `CDORDER`: sắp thứ tự hiển thị theo màu, màu ghi trước nằm trên cùng.
- `HATCHGENERATEBOUNDARY`: tạo đa tuyến biên từ hatch. `HATCHSETBOUNDARY`: đặt lại biên hatch theo đối tượng kín khác.
- `LAYTRANS`: chuyển lớp theo bảng ánh xạ (đổi tên hoặc gộp lớp theo chuẩn công ty). Lưu được bảng để dùng cho bản vẽ khác. Lớp nguồn được xoá sau khi chuyển.
- `SHOWURLS`: danh sách đối tượng có siêu liên kết, có nút phóng tới và mở link.
- `GETSEL`: chọn theo lớp + loại đối tượng mẫu. `SSX`: chọn cùng loại với mẫu, lọc thêm theo lớp / màu / kiểu nét.
- `XPLODE`, `ARRAYCLASSIC`: gọi lại EXPLODE, ARRAY.
- Đa tuyến có độ rộng, đoạn cong: phần tô liền mạch, không còn răng cưa.

## Bổ sung (v4w)
**Kích thước**
- `DIM` — kích thước thông minh như AutoCAD 2016+: bấm vào đường → kích thước thẳng / chéo; đường tròn → đường kính; cung → bán kính; bấm tiếp đường thứ hai (hoặc từ khoá Góc) → kích thước góc; bấm chỗ trống hoặc bắt điểm → kích thước theo 2 điểm (tự ngang / dọc theo vị trí đặt). Lặp lại tới khi Enter / Esc.
- `DIMANGULAR`: chọn đường nào trước cũng được.

**Tường MLINE**
- `MLEDIT` — sửa chỗ giao của đường đôi: **Chữ thập kín / hở / liền**, **Chữ T kín / hở** (thân chữ T tự kéo dài / tỉa tới mép tường ngang, mép tường ngang được mở đúng bề rộng), **Góc** (2 tường gặp nhau, mép ngoài nối mép ngoài, mép trong nối mép trong). Nắp đầu tường ở chỗ nối được bỏ.
- **MLINE trong file AutoCAD** (DXF / DWG) nay hiện đúng thành đường đôi (trước đây bị bỏ qua) và dùng được MLEDIT.

**Thuộc tính khối**
- `ATTSYNC` — đồng bộ mọi bản chèn của khối theo định nghĩa: thêm thuộc tính mới (giá trị mặc định), bỏ thuộc tính thừa, giữ giá trị đã nhập; vị trí / cỡ theo tỉ lệ từng bản chèn.
- `BATTMAN` — bảng quản lý thuộc tính khối: sửa lời nhắc, giá trị mặc định, đổi thứ tự, xoá thuộc tính → áp dụng cho mọi bản chèn (và định nghĩa trong thư viện của tôi).
- Mở DXF: giữ định nghĩa thuộc tính (ATTDEF) của khối → `INSERT` khối của file có hỏi giá trị thuộc tính như AutoCAD.

**Ghi chú dẫn**
- `MLEADEREDIT` — thêm / bỏ mũi tên của ghi chú dẫn (một nội dung chỉ vào nhiều chỗ).
- `MLEADERALIGN` — căn các ghi chú thẳng hàng theo ghi chú mẫu (mặc định dọc, hoặc theo hướng chỉ định).
- `MLEADERCOLLECT` — gom nhiều ghi chú thành một (nối các dòng chữ, giữ đủ mũi tên).

**Đa tuyến có độ rộng**
- `PLINE` thêm **W** (độ rộng đầu / cuối) và **H** (nửa độ rộng) — vẽ nét đậm, mũi tên vát như AutoCAD.
- `PEDIT` → **W**: đổi độ rộng cả đa tuyến (0 = nét mảnh). `TRACE` vẽ nét rộng.
- Lưu DXF giữ độ rộng (mã 40 / 41); đa tuyến rộng di chuyển / xoay / tỉ lệ / đối xứng đúng phần tô.

**3D và tiện ích**
- `3DSCALE` — tỉ lệ khối 3D cả chiều cao quanh điểm gốc (X, Y, Z).
- `FILTER` — lọc chọn nhiều điều kiện cùng lúc: loại, lớp (dùng * ?), màu (ACI / #rrggbb / bylayer), kiểu nét, tên khối, chữ chứa, chiều dài, bán kính, cao chữ; đảo ngược; lưu bộ lọc để dùng lại.
- `PASTEBLOCK` — dán bộ nhớ tạm thành một khối (tên A$C…).
- `LIMITS` — giới hạn bản vẽ; **BẬT** thì không cho bấm điểm ngoài giới hạn; ghi vào $LIMMIN / $LIMMAX khi lưu DXF.
- `POLAR` — bật / tắt bắt góc cực, đặt góc bước. `VISUALSTYLES` — chọn kiểu hiển thị 3D. `DWGCOMPARE` — so sánh 2 bản vẽ.

## Bổ sung (v4v) — xem 3D file DWG 2007 trở lên
- Khối 3D (3DSOLID) trong file **DWG 2007 trở lên** nay đọc được (trước đây bị bỏ qua nên bấm 3D chỉ thấy nét 2D). Ví dụ một bản vẽ tầng có 196 khối tường, sàn, cột, cầu thang: hiện đủ trong chế độ 3D.
- Khối trên lớp đóng băng / tắt vẫn ẩn như AutoCAD (bật lớp trong bảng Lớp để thấy).

## Bổ sung (v4u) — lưu DXF 2018
Lưu DXF (Ctrl+S, SAVEAS, xuất DXF, gửi máy chủ DWG) nay mặc định ghi **DXF 2018 (AC1032)** — đúng định dạng AutoCAD 2018–2025 lưu ra.
- Có đủ phần AutoCAD 2018 cần: CLASSES, vật liệu ByBlock / ByLayer / Global, kiểu ghi chú dẫn MLEADERSTYLE Standard, danh sách tỉ lệ (1:1), từ điển màu / kiểu bảng / kiểu hiển thị; lớp gắn vật liệu, khối ghi đơn vị chèn.
- **Chữ tiếng Việt ghi thẳng UTF-8** (không còn mã \U+), **màu RGB** luôn ghi được (không phải đổi phiên bản).
- `DXFVERSION` chọn: **2018** (mặc định), 2013, 2010, 2007, 2004, 2000, Tự động (2000 / 2004 như bản cũ), R12. Máy đang để "Tự động" (mặc định cũ) được chuyển sang 2018 một lần; đã chọn phiên bản khác thì giữ nguyên.
- **Mở DXF:** đọc **màu RGB của lớp** (đối tượng theo lớp hiện đúng màu RGB) và giữ cả **lớp rỗng** (lớp chưa có đối tượng) như AutoCAD.

## Bổ sung (v4t)
**DXF giữ thêm:**
- **Màu RGB** (true color, mã 420): bản vẽ có màu RGB thì tự lưu DXF **R2004**; mở lại giữ đúng màu.
- **Vùng che** ghi thành thực thể **WIPEOUT** thật (AutoCAD che đúng, sửa được).
- **Thứ tự vẽ** (DRAWORDER, TEXTTOFRONT…) ghi theo thứ tự trong file → AutoCAD hiện đúng trên / dưới.
- **HATCH DOTS, EARTH, AR-CONC** ghi thành HATCH có định nghĩa đường mẫu (không còn nổ thành nét / điểm).
- **Ràng buộc tham số, khối động, chú thích theo tỉ lệ, trường (field)…** ghi kèm (XDATA + XRECORD `DVDCAD_DATA`) → mở lại file DXF bằng DVDCAD, ràng buộc vẫn hoạt động.
- **Kiểu nét có hình**: số hình ltypeshp.shx đúng chuẩn, hình vẽ đúng theo định nghĩa SHP (TRACK1, ZIG, BOX, CIRC1, BAT, AMZIGZAG).
- `DXFVERSION` thêm **R2007**: chữ tiếng Việt ghi thẳng UTF-8 (phần mềm khác ngoài AutoCAD đọc đúng dấu).

## Bổ sung (v4s) — lưu DXF R2000
Lưu DXF (Ctrl+S, SAVEAS, xuất DXF, gửi máy chủ DWG) nay ghi **DXF R2000 (AC1015)** — đầy đủ cấu trúc của AutoCAD 2000+: handle, BLOCK_RECORD, OBJECTS (dictionary, layout Model / Layout1).
- **Bề rộng nét** từng đối tượng và từng lớp (mã 370) — in ra đúng nét đậm / mảnh.
- **LWPOLYLINE** có cung; **MTEXT** cho chữ nhiều dòng (giữ xuống dòng, ký tự { } \\); **TEXT** tiếng Việt dạng \U+.
- **HATCH thật**: tô đặc, mẫu ANSI31 / ANSI32 / ANSI37 / NET / LINE / BRICK kèm định nghĩa đường mẫu (AutoCAD sửa hatch được). DOTS, EARTH, AR-CONC (v4t) cũng ghi thành HATCH có đường mẫu.
- **ELLIPSE**, **XLINE**, **RAY**, **3DFACE** (khối 3D, mở lại trong DVDCAD vẫn là khối).
- **Kiểu nét phức**: chữ trong nét (GAS…) và hình (ltypeshp.shx).
- Khối + thuộc tính (BLOCK / INSERT / ATTDEF / ATTRIB), kích thước thẳng / bán kính / đường kính / góc (DIMENSION) như bản trước.
- Đã kiểm tra bằng 2 bộ đọc độc lập: ezdxf (0 lỗi cấu trúc) và LibreCAD.

Khi mở file: hatch có mẫu cùng tên trong DVDCAD (ANSI31, NET, BRICK…) nay hiện đúng mẫu, tỉ lệ, góc; đường tròn / cung / elip trong khối giữ nguyên là đường tròn / cung / elip (trước đây thành đa tuyến).

`DXFVERSION`: chọn R2000 (mặc định) hoặc R12 (phần mềm cũ). Output → Export.

## Bổ sung (v4r)
**Cắt, nối, bo góc giữ cung:** TRIM, BREAK / BREAKATPOINT, EXTEND (đầu thẳng), JOIN (nối đoạn thẳng + cung + đa tuyến), FILLET / CHAMFER đa tuyến (một góc hoặc **P** cả đa tuyến) và REVERSE / PEDIT đảo chiều đều giữ cung thật — cung cắt ra vẫn đúng tâm, bán kính; bo góc tạo cung thật (bulge) thay vì nhiều đoạn nhỏ.

**Từ khoá ưu tiên hơn lệnh trong suốt:** trong lời nhắc có từ khoá **P** (FILLET → Đa tuyến…), gõ P chọn từ khoá thay vì PAN.

**Lưu DXF:** kích thước góc lưu thành DIMENSION 3 điểm. Bản khối bị sửa riêng lưu thành khối biến thể (`COT$1`…) thay vì nét rời.

**Kiểu nét có hình:** đọc hình (shape) trong kiểu nét từ DXF / DWG và vẽ gần đúng; LINETYPE → Tải có thêm FENCELINE1 (tròn), FENCELINE2 (vuông), TRACKS, ZIGZAG, BATTING. Nét đứt nay bắt đầu đúng vị trí mẫu như AutoCAD (mẫu bắt đầu bằng khoảng hở hoặc có hai đoạn liền ở hai đầu).

**DATALINKURL** (Insert → Linking & Extraction): bảng lấy từ đường link Google Sheets (chia sẻ “Bất kỳ ai có liên kết”) hoặc file CSV / XLSX trên mạng. `DATALINKUPDATE` tải lại ngay — dùng được trên iPhone / iPad; khi quay lại cửa sổ, DVDCAD kiểm tra (tối đa 1 lần / phút) và báo nếu trang tính đã đổi.

## Bổ sung (v4q)
**Đa tuyến có cung giữ đúng cung:** đa tuyến từ file DWG/DXF, PLINE chế độ cung (**A**), vùng, PDF nhập vào… giữ đỉnh gốc và cung (bulge):
- MOVE, COPY, ROTATE, MIRROR, SCALE, ô nắm giữ nguyên cung. Ô nắm giữa cung kéo để đổi độ cong.
- OFFSET đa tuyến có cung ra đúng cung (bán kính tăng/giảm), góc vuông nối đúng.
- Bắt điểm tâm (CEN) và điểm giữa cung (MID) trên đa tuyến.
- Lưu DXF ghi bulge (mã 42) — AutoCAD mở ra là cung thật.

**Lưu DXF giữ khối và kích thước:**
- Khối lưu thành BLOCK + INSERT (đúng điểm chèn, tỉ lệ, góc xoay), thuộc tính thành ATTDEF / ATTRIB → AutoCAD nhận ra khối, sửa thuộc tính được.
- Kích thước thẳng, bán kính, đường kính lưu thành DIMENSION (khối *D + điểm định nghĩa) → AutoCAD nhận là kích thước.
- Vùng (REGION) có lỗ ghi kèm dữ liệu DVDCAD, mở lại vẫn là vùng.

**HATCH tự mở rộng vùng dò:** bấm trong vùng kín lớn hơn màn hình vẫn tìm đúng biên, không cần phóng ra trước.

**Kiểu nét phức có chữ:** đọc chữ trong kiểu nét từ DXF / DWG (GAS_LINE, HOT_WATER_SUPPLY…) và vẽ chữ dọc theo nét, tự lật cho dễ đọc. LINETYPE → Tải có thêm GAS_LINE, HOT_WATER_SUPPLY, CAP_NUOC (CN), THOAT_NUOC (TN), DIEN (Đ), PCCC (CC).

**DATALINK theo dõi file Excel** (Chrome / Edge máy tính): chọn file một lần, DVDCAD nhớ file gốc. Khi quay lại cửa sổ mà file Excel đã sửa, góc màn hình hiện **“Liên kết dữ liệu đã thay đổi”** → bấm **Cập nhật bảng** là bảng đọc lại file, không phải chọn lại. `DATALINKUPDATE` cũng tự đọc file gốc.

**Kiểu in .ctb xuất ra file:** trong `STYLESMANAGER` bấm **Xuất .ctb** → được file `.ctb` đúng định dạng AutoCAD, chép vào thư mục Plot Styles để dùng chung với AutoCAD.

## Bổ sung (v4p)
**Kiểu in theo màu (.ctb):** `STYLESMANAGER` (hoặc `CTB`, `PLOTSTYLE`; Output → Plot → Kiểu in .ctb):
- **Nhập .ctb** — đọc file kiểu in của AutoCAD (monochrome.ctb, file của công ty…): màu in, bề rộng nét, độ đậm (screening) cho từng màu 1–255.
- **Mới…** — tạo từ mẫu: monochrome, DVD-VN (màu → bề rộng nét kiểu văn phòng VN: đỏ 0.13, vàng 0.18, xanh lá 0.25, lục lam 0.35, xanh dương 0.50, tím 0.30, trắng 0.20, 8/9 0.09), Screening 50%, Màu 8/9 xám nhạt.
- Sửa từng màu: màu in (theo đối tượng / đen / màu khác), bề rộng nét, độ đậm %. **Áp cho mọi màu…** để đổi hàng loạt.
- Trong hộp thoại **PLOT**, mục **Kiểu in** có thêm các kiểu `.ctb` đã lưu và nút ✎ để sửa. Bề rộng nét theo CTB chỉ in khi bật “In bề rộng nét”.

**Bảng từ Excel / CSV:**
- `DATALINK` (`TABLEIMPORT`; Insert → Linking & Extraction, Annotate → Tables): chọn file .xlsx / .xls / .ods / .csv, chọn trang tính, vùng ô (vd `A1:F20`), cao chữ, hàng tên cột, hàng tiêu đề; xem trước rồi chèn bảng.
- `DATALINKUPDATE`: sửa file Excel xong, chạy lệnh và chọn lại file → các bảng liên kết tới file đó cập nhật nội dung (giữ bề rộng cột, thêm/bớt hàng).
- `TABLEEXPORT`: xuất bảng ra CSV hoặc Excel (.xlsx).

**Vùng 2D (region):**
- `REGION`: chọn đa tuyến kín, đường tròn, elip, hoặc các đoạn thẳng / cung / đa tuyến hở nối đầu-cuối thành vòng kín → mỗi vòng thành một vùng (xoá nét gốc).
- `UNION`, `SUBTRACT`, `INTERSECT`: chọn vùng 2D thì cộng / trừ / lấy giao vùng (kết quả có lỗ được nhóm lại, cung tròn được dựng lại thành cung); chọn khối 3D thì làm như trước.
- `MASSPROP` chọn vùng: diện tích, chu vi, hộp bao, trọng tâm, mô men quán tính, tích quán tính, bán kính quán tính (tính cả lỗ).

**Xoay lưới / ortho:** `SNAPANG` — nhập góc, **D** lấy theo một đoạn thẳng, **B** đặt điểm gốc. Lưới, SNAP, ORTHO (F8), POLAR và truy bắt đều theo góc mới (vẽ công trình nằm xiên). `SNAPANG 0` để trả về. Thêm lệnh `SNAP` (bật/tắt/bước), `GRID` (bật/tắt/khoảng), `ORTHO`, `SNAPBASE`.

**Sửa đa tuyến bằng nắm kéo:** chọn đa tuyến, **chuột phải** lên ô nắm:
- Ô nắm đỉnh: **Thêm đỉnh** (sau đỉnh đó), **Xoá đỉnh**.
- Ô nắm giữa đoạn: **Thêm đỉnh**, **Đổi thành cung** (bấm điểm cung đi qua) / **Đổi thành đoạn thẳng**.

**OFFSET** có thêm tuỳ chọn như AutoCAD: **E** Xoá nguồn (Có/Không), **L** Lớp (Hiện hành / Theo nguồn), **M** Nhiều lần (mỗi lần bấm tạo thêm một bản cách đều từ bản vừa tạo), **U** Hoàn tác. Cài đặt được nhớ cho lần sau.

**Tool Palettes:** kéo một mục thả lên bản vẽ — ký hiệu chèn đúng chỗ thả, khối chèn tại chỗ thả, mẫu hatch thả vào trong vùng kín thì tô vùng đó, lệnh thì chạy lệnh. Bấm như cũ vẫn dùng được.

**PDFIMPORT:** cung và đường tròn trong PDF thành ARC / CIRCLE thật (bắt điểm tâm được), đa tuyến có bo góc giữ đoạn cong. PDF ảnh quét (không có nét vector) tự chèn thành ảnh nền đúng tỉ lệ; hoặc chọn **Ảnh (bản quét)**.

**MLEADERSTYLE:** kiểu ghi chú dẫn — mũi tên tam giác đặc / rỗng / chấm / gạch chéo / không có, cỡ mũi tên, độ dài gờ, cao chữ, khung quanh chữ.

**Lệnh nhỏ:**
- `COUNT` đếm khối theo tên (cả bản vẽ hoặc vùng chọn), bấm **Chọn** để chọn các khối đó, hoặc chèn bảng thống kê.
- `DBLIST` (thống kê đối tượng theo loại / lớp), `COLOR` (màu hiện hành: số ACI, ByLayer, tên màu, #rrggbb), `BASE` (điểm gốc chèn).
- `SELECT`, `JPGOUT` / `PNGOUT` (xuất khung nhìn thành ảnh), `CLEANSCREENON` (**Ctrl+0**), `COPYHIST` (chép lịch sử lệnh).

## Bổ sung (v4o)
**Kiểm tra chính tả tiếng Việt chạy offline:** `SPELL` kiểm tra theo quy tắc ghép vần tiếng Việt (âm đầu, vần, dấu thanh, c/k, g/gh, ng/ngh, qu…) — không cần từ điển của máy. Gợi ý lấy từ các từ đúng trong bản vẽ và từ vựng xây dựng thường dùng. Mỗi từ: **Thay** / **Bỏ qua** / **+ Từ điển** (từ điển riêng lưu trên máy). Có tuỳ chọn kiểm tra cả từ không dấu. `SPELLBROWSER` dùng bộ kiểm tra của trình duyệt như trước.

**VPORTS:** mỗi khung nhìn xoay được riêng (xoay quanh tâm khung), giữ góc xoay khi chuyển khung.

**Hatch liên kết vùng ghép:** hatch trong vùng kín ghép từ nhiều đoạn thẳng / cung / đa tuyến cũng tự liên kết; sửa một trong các nét biên thì vùng tô dựng lại theo.

**DIMBREAK:**
- Chỗ ngắt tự cập nhật khi nét cắt qua bị dời / sửa / xoá.
- Dùng được cho cả kích thước có sẵn trong file DWG/DXF dạng nét rời; **R** trả lại nét gốc.

**MIRRTEXT:** `MIRRTEXT 1` thì MIRROR lật cả chữ như AutoCAD (ghi ra DXF đúng cờ chữ ngược); mặc định 0.

**Tool Palettes** (`TOOLPALETTES`, **Ctrl+3**, tab View): bảng nổi kéo được với 4 thẻ:
- **Lệnh** — lệnh hay dùng.
- **Ký hiệu** — mũi tên Bắc, đầu trục, cao độ (mặt đứng / mặt bằng), ký hiệu mặt cắt, chi tiết, độ dốc, mũi tên cầu thang, tam giác sửa đổi, cửa đi 1 / 2 cánh, cửa sổ, cột, bàn cầu, lavabo. Ký hiệu chú thích tự theo tỉ lệ chú thích (CANNOSCALE); cửa, thiết bị theo kích thước thật.
- **Hatch** — bấm mẫu để tô ngay. **Khối** — thư viện khối của bạn.
- Lệnh `SYMBOL` để chèn ký hiệu từ dòng lệnh.

**DesignCenter** (`ADCENTER`, `DC`, **Ctrl+2**): mở một bản vẽ DWG/DXF khác, chèn **khối** của file đó vào bản vẽ hiện hành (giữ đúng màu, lớp), thêm **lớp**, nạp **kiểu nét**.

**Nhập PDF** (`PDFIMPORT`, tab Insert → Import): đọc PDF vector (bản in từ AutoCAD, Revit…) thành nét (lớp PDF_Geometry), chữ (PDF_Text), vùng tô (PDF_Solid Fills); chọn trang, tỉ lệ 1:N, điểm chèn. Giữ màu nét. Cung / đường tròn nhập thành ARC / CIRCLE; PDF ảnh quét chèn thành ảnh nền (v4p).

## Bổ sung (v4n)
**Nhiều khung nhìn trong Model:** `VPORTS` — chia màn hình 1, 2 (dọc/ngang), 3, 4 khung (View → Model Viewports). Bấm vào khung để làm hiện hành; mỗi khung phóng, kéo, ZE riêng. **J** = gộp về một khung.

**Mảng liên kết (như AutoCAD 2012+):** `ARRAYRECT`, `ARRAYPOLAR`, `ARRAYPATH` tạo mảng liên kết (một nhóm). Sửa bằng `ARRAYEDIT` (số cột, số hàng, khoảng cách, số phần tử, góc lấp đầy, xoay) hoặc ngay trong **bảng Thuộc tính** khi chọn mảng. Dời / sao chép mảng vẫn sửa được. `ARRAYASSOCIATIVITY 0` để tạo đối tượng rời. EXPLODE để tách.

**Hatch liên kết đường biên:** hatch trong đa tuyến kín / đường tròn / elip tự liên kết; sửa, kéo nắm, STRETCH đường biên thì hatch đổi theo. Xoá đường biên thì hatch thôi liên kết. `HATCHASSOC` gắn lại / bỏ liên kết.

**Kiểm tra chính tả:** `SPELL` (`SP`) — liệt kê chữ trong bản vẽ (hoặc vùng chọn), gạch đỏ từ sai theo từ điển của trình duyệt (tiếng Việt / tiếng Anh), sửa trực tiếp rồi Áp dụng.

**Biến hệ thống:** `SETVAR` (hộp thoại) hoặc gõ thẳng tên biến: `OSMODE` (mã bit như AutoCAD), `ORTHOMODE`, `SNAPMODE`, `GRIDMODE`, `POLARANG`, `APERTURE`, `PICKBOX`, `CLAYER`, `CECOLOR`, `CELTYPE`, `CELWEIGHT`, `TEXTSIZE`, `OFFSETDIST`, `FILLETRAD`, `PDMODE`, `PDSIZE`, `INSUNITS`, `WIPEOUTFRAME`… `PTYPE` — chọn kiểu điểm.

**Vẽ trục đo:** `ISODRAFT` (mặt Trái / Trên / Phải, **F5** đổi mặt, nút ISO ở thanh trạng thái) — ORTHO đi theo trục 30° / 90° / 150°. `ISOCIRCLE` vẽ vòng tròn trục đo (elip) theo mặt hiện hành.

**Khác:** `XCLIP` (cắt hiển thị khối / XREF theo khung), `IMAGECLIP`, `GROUPEDIT` (thêm / bớt / đổi tên nhóm), `HYPERLINK` + `OPENLINK` (Ctrl + bấm để mở liên kết), `DIMBREAK` (ngắt đường kích thước chỗ cắt nét khác), `PURGE` (hộp thoại: lớp, kiểu nét, khối động không dùng), `OPTIONS` (`OP`), `STATUS`, `REGENALL`.

## Lệnh bổ sung (v4m)
**Bắt điểm mới:** `EXT` (Kéo dài — rê qua đầu mút một đoạn rồi đi theo phần kéo dài của nó), `PAR` (Song song — rê qua một đoạn, rồi vẽ song song với đoạn đó), `GCE` (Tâm hình học của đa tuyến kín). Gõ trong lúc chọn điểm hoặc bật trong Drafting Settings.

**Vẽ:**
- `CIRCLE` ▾ thêm **Tan, Tan, Radius** (`CIRCLETTR`, `TTR`) và **Tan, Tan, Tan** (`CIRCLETTT`, đường tròn tiếp xúc 3 đối tượng).
- `SOLID` (`SO`) — tô đặc tam giác/tứ giác nối tiếp như AutoCAD. `SKETCH` — vẽ phác tay. `HELIX` — xoắn ốc. `BREAKLINE` — đường cắt ngắn có ký hiệu gãy.
- `GRADIENT` (`GD`) — tô chuyển màu (tuyến tính / toả tròn, chọn 2 màu, góc).

**Sửa:**
- `EXTRIM` — chọn đường kín, bấm phía cần cắt: mọi nét cắt qua đường kín bị cắt bỏ phía đó.
- `COPYM` — sao chép nhiều: **R** lặp lại, **D** chia đều, **M** theo khoảng, **A** mảng.
- `SPLINEDIT` (`SPE`) — đóng/mở, sửa/thêm/xoá điểm qua, đảo chiều, chuyển thành đa tuyến.
- `HATCHEDIT` (`HE`) — đổi mẫu, tỉ lệ, góc, tô đặc, chuyển màu của hatch có sẵn.
- `CHPROP` (`CHANGE`) — đổi màu (số ACI / tên / #rrggbb), lớp, kiểu nét, tỉ lệ nét, bề rộng nét qua dòng lệnh.
- `FLATTEN` — khối 3D thành nét 2D hình chiếu bằng. `BURST` — phá khối, thuộc tính thành chữ thường. `NCOPY` — chép nét nằm trong khối ra ngoài.

**Chữ & bảng:**
- `FINDREPLACE` (`REPLACE`) — tìm và thay thế chữ trong chữ, thuộc tính khối, kích thước, bảng.
- `TCOUNT` — đánh số thứ tự (theo X, Y hoặc thứ tự chọn; thay / thêm trước / thêm sau / thay ký tự #).
- `TEXTMASK` / `TEXTUNMASK` — che nền dưới chữ. `ARCTEXT` — chữ uốn theo cung. `TEXTALIGN` (`TA`) — căn thẳng nhiều chữ.
- `FIELD` — chèn trường tự cập nhật: ngày, tên bản vẽ, người vẽ, tiêu đề, **diện tích / chiều dài đối tượng** (đổi ra m², m). Sửa đối tượng rồi gõ `UPDATEFIELD`. Trường có nền xám (không in).
- **Bảng có công thức** như AutoCAD: ô bắt đầu bằng `=`, vd `=B2*C2`, `=SUM(D2:D8)`, `=AVERAGE(A1:B4)`, `MIN`, `MAX`, `COUNT`.

**Kích thước:** `DIMSPACE` (giãn đều các kích thước song song, A = tự động), `DIMTEDIT` (dời chữ / canh trái, phải, giữa), `DIMEDIT` (chữ mới với `<>` = số đo, về gốc, khôi phục số đo), `DIMJOGGED` (bán kính gấp khúc), `TOLERANCE` (khung dung sai hình học GD&T).

**Lớp:** `LAYCUR` (đổi sang lớp hiện hành), `LAYMCH` (theo lớp đối tượng đích), `COPYTOLAYER` (sao chép sang lớp khác, có thể dời), `LAYWALK` (duyệt lớp — chỉ hiện lớp đang chọn), `LAYERP` (trả lại thiết lập lớp trước), `LAYERSTATE` (`LAS` — lưu / gọi lại trạng thái lớp).

**Khối & file:** `WBLOCK` (`W` — ghi đối tượng / khối / toàn bản vẽ ra DXF riêng), `RENAME` (đổi tên lớp, khối).

**Tiện ích:**
- `ALIASEDIT` — đặt lệnh tắt riêng hoặc **nhập file acad.pgp** của bạn (dòng `CC, *COPY`).
- `SCRIPT` — chạy file script AutoCAD `.scr` (dấu cách = Enter như AutoCAD).
- `AUDIT` (kiểm tra & sửa lỗi bản vẽ), `DWGPROPS` (tiêu đề, người vẽ, thống kê), `TIME`, `PLAN`.
- Tab ribbon **Express Tools** gom các lệnh Express quen thuộc (BURST, NCOPY, TCOUNT, TEXTMASK, ARCTEXT, EXTRIM, COPYM, FLATTEN, BREAKLINE, LAYWALK, ALIASEDIT…).

## Giao diện ribbon giống AutoCAD (v4l)
Bố cục tab, bảng và biểu tượng theo AutoCAD để người dùng AutoCAD tìm lệnh ở đúng chỗ quen thuộc.
- **Không gian làm việc** (nút cạnh thanh truy cập nhanh, hoặc View → Interface → Workspace):
  - **Drafting & Annotation:** Home · Insert · Annotate · Parametric · View · Manage · Output · Collaborate.
  - **3D Modeling:** Home (Modeling, Solid Editing, Draw, Modify, Section, Coordinates, View, Layers) · Solid · Visualize · và các tab chung.
- **Tab Home** như AutoCAD: Draw (Line, Polyline, Circle ▾, Arc ▾…), Modify (Move, Rotate, Trim ▾ / Copy, Mirror, Fillet ▾ / Stretch, Scale, Array ▾ + Erase, Explode, Offset, Draworder ▾), Annotation, Layers, Block, Properties, Groups, Utilities, Clipboard.
- **Nút tách (▾):** bấm nửa dưới hoặc mũi tên để chọn kiểu (Circle: tâm-bán kính / 2 điểm / 3 điểm; Trim/Extend; Fillet/Chamfer/Blend; mảng chữ nhật/đường/tròn; Draworder…). Nút nhớ lựa chọn cuối như AutoCAD.
- **Bảng mở rộng:** tên bảng có ▾ (Draw ▾, Modify ▾, Layers ▾…) — bấm để hiện thêm lệnh (Spline, Xline, Ray, Divide, Measure, Wipeout, Break, Join, Lengthen, Edit Polyline, Align, Overkill…).
- **Chú giải khi rê chuột:** tên lệnh tiếng Anh + tiếng Việt, mô tả, tên gõ lệnh và lệnh tắt.
- **Nhãn ribbon:** mặc định tiếng Anh như AutoCAD; đổi sang tiếng Việt trong menu không gian làm việc.
- Bấm đúp tên tab (hoặc nút ▴ bên phải) để thu gọn ribbon. Màn hình hẹp: các bảng tự thu thành nút như AutoCAD.
- Biểu tượng mới theo quy ước màu của CAD: nét có sẵn màu sáng, nét tạo ra màu xanh, phần cắt bỏ màu đỏ, hướng di chuyển màu vàng, điểm nắm ô vuông xanh, khối 3D tô 3 sắc độ. Bộ biểu tượng do DVDCAD tự vẽ (không sao chép biểu tượng của Autodesk).

## Lệnh bổ sung (v4k)
**Thứ tự vẽ & vùng che:**
- `DRAWORDER DR` — đưa đối tượng lên trên cùng (**F**), xuống dưới cùng (**B**), trên (**A**) hoặc dưới (**U**) một đối tượng khác. `TEXTTOFRONT` đưa chữ / kích thước lên trên, `HATCHTOBACK` đưa mọi hatch xuống dưới.
- `WIPEOUT WO` — vùng che: bấm các điểm, hoặc **D** chọn đa tuyến kín có sẵn. Vùng che tô bằng màu nền, che các nét nằm dưới nó (nền khung tên, chỗ ghi chú). `WIPEOUTFRAME` bật/tắt khung viền (**F** trong WIPEOUT: bật / tắt / hiện nhưng không in). Đọc được WIPEOUT trong file DWG/DXF.

**Chú thích theo tỉ lệ (annotative):**
- `CANNOSCALE` — đặt tỉ lệ chú thích 1:N (hoặc bấm ô **▲ 1:N** ở thanh trạng thái). Chữ / kích thước chú thích tự đổi cỡ để luôn cao đúng số mm trên giấy. **A** = chữ, kích thước mới tự là chú thích.
- `ANNOTATIVE` — bật/tắt chú thích cho chữ, kích thước chọn (cao trên giấy = cao hiện tại ÷ N). Trong khung nhìn của layout, chữ chú thích hiện đúng cao trên giấy theo tỉ lệ của khung nhìn đó.

**Ràng buộc tham số (tab ribbon "Tham số"):**
- Hình học: `GCHORIZONTAL` (ngang), `GCVERTICAL` (dọc), `GCPARALLEL` (song song), `GCPERPENDICULAR` (vuông góc), `GCCOLLINEAR` (thẳng hàng), `GCCOINCIDENT` (trùng điểm — bấm gần đầu đoạn hoặc tâm), `GCEQUAL` (bằng nhau), `GCCONCENTRIC` (đồng tâm), `GCTANGENT` (tiếp xúc), `GCFIX` (cố định). Lệnh chung `GEOMCONSTRAINT`. Như AutoCAD: đối tượng chọn trước đứng yên, đối tượng chọn sau dời theo.
- Kích thước: `DCALIGNED` (dài thẳng), `DCHORIZONTAL`, `DCVERTICAL`, `DCRADIUS`, `DCDIAMETER`, `DCANGULAR`. Lệnh chung `DIMCONSTRAINT`. Mỗi ràng buộc có tên (d1, rad1, ang1…). Giá trị có thể là biểu thức theo tên khác, vd `d1*2`, `d1+300`.
- `AUTOCONSTRAIN` — tự thêm ràng buộc trùng điểm và ngang/dọc cho các đối tượng chọn.
- `PARAMETERS` — bảng tham số: sửa giá trị hoặc biểu thức rồi bấm Áp dụng, hình vẽ đổi theo. Xoá từng ràng buộc bằng nút ✕.
- `DELCONSTRAINT` — xoá mọi ràng buộc của đối tượng chọn. `CONSTRAINTBAR` — hiện/ẩn ký hiệu ràng buộc.
- Sau khi có ràng buộc, mọi cách sửa (MOVE, ô nắm, STRETCH, bảng Thuộc tính…) đều giữ ràng buộc: đối tượng liên quan tự điều chỉnh. Undo hoàn tác cả nhóm. Ràng buộc dùng cho đường thẳng, đa tuyến (không cong), đường tròn, cung.

**Khối động (tab Chèn → Khối động):**
- `BPARAMETER` — chọn khối rồi thêm tham số:
  - **V** Hiển thị: đặt tên trạng thái, chọn các nét của khối sẽ hiện ở trạng thái đó. Chạy lại để thêm trạng thái khác. Các bản khác cùng tên tự nhận.
  - **L** Kéo giãn: chỉ điểm gốc (phần cố định) và điểm đầu kéo, đặt tên (vd Dai). Khi đổi giá trị, các điểm nằm quá nửa đoạn sẽ dời theo hướng kéo.
  - **F** Lật: cho phép lật ngang / dọc quanh điểm gốc khối.
  - **X** Bỏ mọi tham số động của khối.
- Đổi trạng thái: chọn khối → bảng **Thuộc tính** có mục "Khối động" (danh sách trạng thái, ô độ dài, nút Lật); hoặc lệnh `BDYN`.
- Định nghĩa khối động lưu trên máy theo tên khối nên dùng được cho mọi bản vẽ chèn khối đó.

**Lưu DWG:**
- `SAVEDWG` (`DWGOUT`) — lưu ra file **DWG 2018** (AC1032, mặc định), 2013, 2010, 2004 hoặc 2000 bằng bộ ghi có sẵn trong DVDCAD: chạy cả trên trình duyệt, điện thoại và bản Windows, không cần mạng hay cài thêm.
  - Giữ: lớp (màu, bật/tắt, đóng băng, khoá, bề rộng nét, kiểu nét), kiểu nét có chữ / hình, kiểu chữ, khối + thuộc tính, kích thước (thẳng, chéo, góc, bán kính, đường kính), hatch đặc và hatch mẫu, đa tuyến có cung / độ rộng, MTEXT, elip, XLINE / RAY, vùng che (WIPEOUT), layout Model / Layout1, ảnh xem trước trong hộp thoại Mở.
  - Khối động ghi như AutoCAD (khối gốc + `*U`, bản 2018 có tham số hiển thị của AutoCAD); vị trí địa lý ghi thành GEODATA (2010+).
  - Dữ liệu riêng của DVDCAD (khối 3D tham số, vùng, thứ tự vẽ, chú thích theo tỉ lệ, ràng buộc, kéo giãn / lật của khối động) ghi kèm trong file: mở lại bằng DVDCAD còn nguyên; AutoCAD bỏ qua phần này.
- `SAVEAS` / **Ctrl+Shift+S**: chọn *Bản vẽ AutoCAD (\*.dwg)* hoặc *DXF* trong hộp thoại lưu. Bản vẽ mở từ DWG thì hộp thoại gợi ý DWG trước. **Ctrl+S** sau đó ghi đè đúng định dạng đã chọn.
- `DWGSERVER` — chọn phiên bản: **DWG 2018 / 2013 / 2010 / 2007 / 2004 / 2000 (bộ ghi sẵn có, mặc định 2018)**, hoặc qua **ODA File Converter** (không bắt buộc).
  - Bản Windows: nút **Tải ODA File Converter** mở trang tải của ODA; cài xong quay lại DVDCAD là tự tìm thấy (hoặc bấm **Tìm lại**, **Chọn…** nếu cài chỗ khác). Chuyển ngay trên máy, không cần mạng. Bản web: qua máy chủ chuyển đổi của bạn: cài ODA File Converter và **Node.js**, chạy `node server-dwg.js` (đặt biến `ODA` trỏ tới ODAFileConverter); điện thoại cùng mạng nhập `http://<IP máy tính>:8787/convert`.
  - Không có ODA / máy chủ thì DVDCAD tự ghi bằng bộ ghi sẵn có, cùng phiên bản (từ v6a có cả DWG 2007).

## In bản vẽ (PLOT, Ctrl+P)
Hộp thoại giống AutoCAD:
- **Máy in / máy vẽ:**
  - `DWG To PDF.pc3` và các bản `AutoCAD PDF`.
  - `DWFx ePlot`.
  - `PublishToWeb PNG / JPG`, HPGL/2.
  - `Default Windows System Printer` và mọi máy in đã cài trong Windows (bản Windows). Nút **Thuộc tính…** chỉnh độ sâu màu, màu / đen trắng, in hai mặt, dpi.
- **Khổ giấy:** 89 khổ như DWG To PDF.pc3 (ISO A / B / C, full bleed, expand, ANSI, ARCH, JIS) hoặc khổ tự chọn; ngang hoặc dọc.
- **Vùng in:** Phạm vi (Extents), Màn hình (Display), Khung (Window).
- **Tỉ lệ:** khít khổ giấy, hoặc in **đúng tỉ lệ 1:N** (1:50, 1:100…). Bản vẽ đơn vị mm thì 1:100 nghĩa là 1 m thật = 10 mm trên giấy. Nếu hình lớn hơn khổ giấy, hộp thoại báo trước.
- **Bảng kiểu in:** monochrome.ctb, grayscale.ctb, bảng .ctb tự tạo (STYLESMANAGER), hoặc in theo màu bản vẽ; in bề rộng nét, độ trong suốt, dấu in, lộn ngược.
- **Xem trước…** (`PREVIEW`): trang vector, lăn chuột phóng to / thu nhỏ, kéo để dời, Zoom Window, menu chuột phải như AutoCAD.
- **Xuất:** PDF vector, DWFx, máy in (nét vector), ảnh PNG / JPG, tệp HPGL/2.
Trên điện thoại vẫn dùng nút Xuất như cũ (PDF xuất ra cũng là PDF vector).

## Lưu & mở
- Mọi thay đổi **tự lưu trên máy**, gắn với đúng file đó.
- **Ctrl+S** ghi ra DWG hoặc DXF (chọn trong hộp thoại lần đầu). Trên Edge/Chrome máy tính, sau lần chọn chỗ lưu đầu tiên, các lần sau ghi thẳng vào file. Bản vẽ đang mở từ Drive thì đồng bộ lên Drive.
- File DXF xuất ra giữ:
  - Bảng lớp (màu, bật/tắt, đóng băng, khoá, kiểu nét) và màu ByLayer.
  - Bảng kiểu nét, kiểu nét từng đối tượng và LTSCALE.
  - Kiểu chữ (font TrueType) của chữ.
  - Chữ tiếng Việt (mã Unicode).
  - Hatch, được tách thành nét hoặc vùng đặc.
  - Kích thước và khối, dạng nét rời.
- **Bản vẽ mới** (`NEW`, Ctrl+N) dùng đơn vị mm và được lưu trong mục "Gần đây".

## Khác với AutoCAD
- Lưu **DWG 2018 / 2013 / 2010 / 2007 / 2004 / 2000** và DXF ngay trong app (`SAVEDWG`, `SAVEAS`), không cần ODA File Converter.
- Khối lưu ra DXF thành BLOCK + INSERT (kèm thuộc tính ATTDEF/ATTRIB); kích thước thẳng, bán kính, đường kính lưu thành DIMENSION. Kích thước góc lưu thành DIMENSION 3 điểm; bản khối bị sửa riêng lưu thành khối biến thể (TÊN$1…). Kích thước tự cập nhật khi dùng STRETCH, ô nắm, MOVE hoặc SCALE lên chính kích thước, và bám theo đường hình khi gốc đường gióng nằm đúng điểm đặc trưng (v5b). Kích thước góc chưa bám theo đường hình. AutoCAD đọc lại thấy kích thước thường (không liên kết).
- Kích thước thẳng/chéo có sẵn trong file DWG/DXF cũng kéo ô nắm và STRETCH được. Khi sửa, kích thước được vẽ lại theo kiểu của DVDCAD: giữ cao chữ, số lẻ, mũi tên/gạch chéo. Kích thước góc và bán kính của file gốc chỉ chọn theo cụm.
- DXF lưu mặc định **2018 (AC1032)**, chữ UTF-8, màu RGB. `DXFVERSION` chọn 2013 / 2010 / 2007 / 2004 / 2000, Tự động (2000/2004) hoặc R12 (phần mềm rất cũ). AutoCAD 2017 trở về trước không mở được file 2018 — chọn phiên bản thấp hơn.
- Hatch dò biên trong màn hình trước, không thấy biên kín thì tự mở rộng phạm vi dò (tới 40 lần màn hình).
- Đa tuyến có cung giữ đúng cung khi di chuyển, xoay, lật, tỉ lệ, OFFSET, sửa bằng ô nắm và lưu DXF. TRIM, BREAK, EXTEND, JOIN, FILLET / CHAMFER đa tuyến, REVERSE cũng giữ cung. EXTEND đa tuyến có đoạn đầu / cuối là cung thì kéo dài cung theo đường tròn của nó (như AutoCAD).
- Vùng (REGION) lưu ra DXF dạng đa tuyến kín kèm dữ liệu DVDCAD (mở lại trong DVDCAD vẫn là vùng; AutoCAD thấy đa tuyến). Spline / elip trong phép toán vùng được chia thành đoạn thẳng nhỏ.
- DATALINK tự đọc lại file Excel trên Chrome / Edge máy tính. Trên iPhone / iPad / Safari: dùng `DATALINKURL` (Google Sheets / link CSV) để tự cập nhật, hoặc chọn lại file khi chạy DATALINKUPDATE.
- Ràng buộc tham số và định nghĩa khối động ghi kèm trong DXF (R2000+, mục DVDCAD_DATA) — mở lại bằng DVDCAD còn nguyên; AutoCAD bỏ qua phần này. Khối động lưu ra (DXF và DWG) như AutoCAD: khối gốc + khối ẩn danh `*U` cho từng bản chèn; bản 2018 ghi tham số hiển thị của AutoCAD (AutoCAD đổi trạng thái được). Kéo giãn / lật chỉ ghi thành hình đang hiện (AutoCAD chưa có grip kéo giãn / lật). Khối động của AutoCAD: DXF đọc được tham số hiển thị (đổi trạng thái trong DVDCAD); DWG hiện đúng trạng thái đang lưu, tên khối là `*U…`; tham số khác (kéo giãn, lật, xoay, bảng tra…) chưa đổi được.
- Vùng che ghi thành WIPEOUT, thứ tự vẽ ghi theo thứ tự trong file (AutoCAD hiện đúng trên/dưới). Chú thích theo tỉ lệ ghi thành chữ thường cho AutoCAD (DVDCAD mở lại vẫn theo tỉ lệ). Màu RGB ghi đúng, cả màu RGB của lớp khi mở lại. Màu sách màu (color book) đọc theo màu RGB tương ứng.
- 3D chưa có: bo cạnh tuỳ ý trên khối sau cộng/trừ (chỉ bo được hộp, khối đùn, trụ), render dò tia chất lượng ảnh chụp.
- Khối sau UNION/SUBTRACT là lưới tam giác: mặt cong hiện dạng nhiều mặt phẳng nhỏ.
- Khối ACIS (3DSOLID) của AutoCAD trong DXF đọc được: mặt phẳng, mặt trụ, nón, cầu, xuyến. Mặt cong tự do (spline, bo cạnh của AutoCAD) hiện gần đúng theo đường biên. Khối đọc vào thành khối lưới, lưu lại là 3DFACE. Đọc 3DSOLID từ file **DWG** được (đã thử file DWG 2007); khối mặt cong tự do hiện gần đúng.
- UCS ở DVDCAD chỉ dùng cho lệnh tạo khối 3D. Nét 2D luôn vẽ trên mặt bằng XY.
- Layout chứa khung nhìn, khung tên và đối tượng giấy (vẽ thẳng trên layout, hoặc chuyển giữa Model và giấy bằng `CHSPACE`).
- Ảnh (IMAGE) lưu thành tệp ảnh cạnh bản vẽ như AutoCAD (bản Windows); trên trình duyệt, ảnh nền và tệp tham chiếu lưu trong trình duyệt của từng máy. `ETRANSMIT` đóng gói bản vẽ cùng ảnh và tham chiếu để gửi đi.
- Kiểu nét phức: chữ và hình trong nét hiện đúng (hình của ltypeshp.shx vẽ gần đúng: tròn, vuông, gạch, zigzag, batting; hình SHX khác hiện dạng vòng tròn nhỏ).. Lưu DXF R2000 ghi đủ chữ trong nét; hình trong nét ghi đúng số hình chuẩn của ltypeshp.shx (130 TRACK1, 131 ZIG, 132 BOX, 133 CIRC1, 134 BAT, 135 AMZIGZAG) và vẽ đúng hình theo định nghĩa SHP.
- MLEDIT dùng cho đường đôi vẽ bằng `MLINE` của DVDCAD và MLINE trong file AutoCAD (DXF đã thử; DWG đọc theo dữ liệu LibreDWG). Đường đôi khép kín chưa sửa được. Chưa có kiểu nối Chữ T liền, Cắt bỏ / Nối lại đoạn, thêm / bớt đỉnh. Nắp đầu theo kiểu MLINESTYLE của file AutoCAD chưa vẽ.
- Đa tuyến có độ rộng: độ rộng mỗi đoạn giữ khi sửa. Thêm / xoá đỉnh trên đoạn có độ rộng thay đổi (thon) thì đỉnh mới lấy độ rộng của đỉnh gần nhất. Đa tuyến rộng trong khối bị kéo giãn không đều chỉ tô gần đúng.
- REVCLOUD › **Sửa** vẽ lại một đoạn mây như AutoCAD (điểm đầu trên mây, các điểm mới, điểm cuối trên mây, chọn phía bỏ đi). `REVCLOUDPROPERTIES` đổi độ dài cung / kiểu. Sửa đỉnh mây bằng ô nắm thì mây không còn dựng lại được từ đường dẫn gốc.
- File rất lớn trên iPhone / iPad chỉ hiện 400 nghìn đối tượng đầu (sau khi nổ khối) để tránh Safari bị tắt vì hết bộ nhớ. Muốn xem đủ, mở trên máy tính hoặc tách bản vẽ. File DWG lớn vẫn tốn bộ nhớ hơn DXF (bộ giải mã LibreDWG).
- Vẽ lại đầy đủ bản vẽ hàng trăm nghìn nét vẫn mất khoảng 1–2 giây (máy thử không có GPU, máy thật thường nhanh hơn). Phóng / dời thì dùng ảnh tạm nên mượt.
- Xem 3D theo dõi thay đổi lớp / ẩn hiện đối tượng mỗi 0,3 giây rồi dựng lại toàn cảnh. Với bản vẽ rất nhiều khối, sau mỗi lần bật / tắt lớp có thể phải chờ một chút mới thấy kết quả.
- Mặt lưới RULESURF / TABSURF / REVSURF / EDGESURF / PLANESURF là khối lưới tam giác: lưu DXF thành 3DFACE và UNION / SUBTRACT không dùng cho mặt hở. Đường 2D của DVDCAD luôn nằm trên mặt bằng XY (cao độ theo ELEV), nên RULESURF / EDGESURF giữa các đường 2D ra mặt phẳng.
- POLYSOLID vẽ theo điểm có tuỳ chọn **Cung** (cung tiếp tuyến đoạn trước, hoặc qua Điểm thứ hai) và **Đường thẳng** để quay lại đoạn thẳng, như AutoCAD.
- Giao diện English dịch từ chuỗi tiếng Việt gốc khi hiển thị. Một vài câu ghép có thể đọc chưa trơn như AutoCAD bản tiếng Anh. Chữ do lệnh ghi vào bản vẽ (trường ngày tháng, nhãn ký hiệu, khung tên mẫu) vẫn là tiếng Việt.
- AutoLISP của DVDCAD chạy mã nguồn `.lsp` kèm hộp thoại `.dcl` và các hàm `vla-` / `vlax-` / `vlax-curve-` thường dùng. Không chạy được `.fas` / `.vlx` (đã biên dịch, mã hoá) và `.dll` / `.arx` (chương trình chạy trong AutoCAD). Chưa có OpenDCL; COM chỉ có Excel, FileSystemObject, Dictionary, WScript.Shell. Add-in và thư mục hỗ trợ lưu trên từng máy (trong trình duyệt), không đi kèm bản vẽ hay Google Drive.
- Độ trong suốt đặt cho từng đối tượng. Độ trong suốt theo lớp: cột Độ trong suốt trong bảng Lớp, `-LAYER` › Trong suốt; đọc / ghi DXF và DWG như AutoCAD (XDATA AcCmTransparency). THICKEN chỉ làm dày được mặt phẳng; mặt cong (REVSURF…) chưa làm dày được. 3DFACE nằm ở cao độ ELEV (chưa nhập Z riêng từng đỉnh).
- Lớp đóng băng riêng khung nhìn (VPLAYER, LAYVPI) và đường cắt khung nhìn (VPCLIP) ghi vào DXF / DWG. ETRANSMIT / ARCHIVE đóng gói bản vẽ DWG (chọn phiên bản 2018 → 2000) hoặc DXF, nén .zip. MKLTYPE chỉ tạo kiểu nét đơn giản (nét, khoảng hở, chấm), chưa có chữ / hình trong nét.
- XCLIP: khối có đường cắt đảo ngược khi lưu DXF được ghi thành các đối tượng rời (phần nhìn thấy), không còn là khối có đường cắt, vì AutoCAD không nhận đường cắt đảo ngược do phần mềm khác tạo. Lưu DXF R12 chỉ ghi phần nhìn thấy. Trên iPhone / iPad (không giữ nhóm khối để tiết kiệm bộ nhớ), phần ngoài đường cắt bị bỏ hẳn khi mở file. Chưa có Clipdepth (cắt theo chiều sâu 3D).
