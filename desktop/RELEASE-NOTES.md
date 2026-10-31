## DVDCAD 5.25.0 — Tiện ích LISP của AutoCAD chạy đúng hơn: tuỳ chọn "_X", lệnh dòng lệnh, biến hệ thống, XDATA

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.25.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.25.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này sửa và bổ sung những chỗ khiến tiện ích LISP viết cho AutoCAD chạy sai trên DVDCAD (kết quả kiểm tra ở bản 5.24.0).

- **Tuỳ chọn kiểu quốc tế `"_W"`, `"_J"`, `"_E"`…** (dấu gạch dưới trước tuỳ chọn) và tên tuỳ chọn tiếng Anh đầy đủ được hiểu ở mọi lời nhắc.
  - Đây là cách hầu hết tiện ích LISP chuyên nghiệp viết; bản trước báo "Điểm không hợp lệ".
- **Lệnh gọi từ `(command …)` chạy và kết thúc như AutoCAD**:
  - `HATCH` (tên mẫu, tỉ lệ, góc, chọn biên), `-HATCH`, `-INSERT` có `S` / `R`, `-ARRAY` (mảng cổ điển), `ATTDEF`, `TABLE`, `-WBLOCK` dùng bản dòng lệnh, không mở hộp thoại;
  - `LEADER`, `QLEADER`, `MLEADER`, `MTEXT` nhận chữ từng dòng; `TEXT` một dòng rồi kết thúc; `POINT` một điểm;
  - `CHANGE` (điểm thay đổi hoặc Thuộc tính), `BREAK` với tên đối tượng, `DRAWORDER` sau khi chọn bằng tên đối tượng.
- **Biến hệ thống**: `DIMSCALE`, `CDATE`, `CTAB`, `ATTREQ`, `FILEDIA`, `USERI1`…, cùng các biến điểm (`EXTMIN`, `INSBASE`…) trả đúng kiểu như AutoCAD. Bản trước có 62 biến trả `nil` làm tiện ích báo lỗi khi tính toán.
- **XDATA** (dữ liệu riêng tiện ích gắn vào đối tượng):
  - `regapp`, `entget` với tên ứng dụng, `entmod` / `entmake` nhóm `-3`, `vla-SetXData` / `vla-GetXData`;
  - lưu trong DXF và DWG như AutoCAD, mở lại vẫn còn.
- **`ssget`**: bộ lọc logic `<OR` / `<AND` / `<NOT`, so sánh `>` `<` `>=`…, lọc theo XDATA, `"_WP"` / `"_CP"` / `"_F"` với danh sách điểm.
- **`entmake`**: tạo được hatch, kích thước, định nghĩa khối (`BLOCK` … `ENDBLK`), khối có thuộc tính (`INSERT` + `ATTRIB` … `SEQEND`).
- **ActiveX**:
  - hằng số `vlax-vbDouble`, `acRed`, `acSelectionSetAll`…;
  - `vla-InsertBlock`, `GetAttributes` (đọc / sửa giá trị thuộc tính), `GetDynamicBlockProperties`;
  - `AddHatch`, `AddDimAligned`, `AddDimRotated`, `AddTable`, `SelectionSets`, `TrueColor`, `Preferences.Files`…
- **Lệnh mới / sửa** (dùng được cả khi gõ tay): `-HATCH`, `-ARRAY`, `-ATTDEF`, `-TABLE`, `-WBLOCK`, `CHANGE`, `LEADER` cổ điển.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.24.0, thêm `(command)` với `"_E"` / `"_W"` và XDATA.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG 2018 / 2013 / 2007 / 2000 có XDATA do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động:
  - 30 câu `(command …)` viết theo AutoCAD (PLINE `_W` / `_A`, TEXT `_J _MC`, HATCH, -HATCH, -INSERT `_S`, -ARRAY R / P, LEADER, QLEADER, MLEADER, TABLE, ATTDEF, -PURGE, BREAK `_F`, CHANGE `_P`, DRAWORDER, UNDO `_BE` / `_E`…): đều tạo đúng số đối tượng và kết thúc lệnh.
  - Biến hệ thống đúng kiểu; XDATA qua DXF và DWG; `ssget` lọc logic; `entmake` khối có thuộc tính; `vla-AddHatch`, `vla-AddTable`, `SelectionSets`.
  - Bộ kiểm thử AutoLISP / DCL của 5.24.0 vẫn đạt đủ.

### Giới hạn
- **Chưa có COM ngoài AutoCAD**: `vlax-create-object "Excel.Application"` (xuất bảng khối lượng ra Excel), `Scripting.FileSystemObject`. Chưa có thư viện DOSLib (`dos_…`), OpenDCL (`dcl_…`). Dự kiến ở bản sau.
- Reactor (`vlr-…`) tạo được nhưng chưa phát sinh sự kiện. Dự kiến ở bản sau.
- **Không chạy được `.fas` / `.vlx`**: đây là LISP đã biên dịch và mã hoá cho riêng AutoCAD, không có mã nguồn. Nhiều bộ tiện ích thương mại chỉ phát hành dạng này, kèm khoá bản quyền. Cần xin tác giả bản `.lsp` (hoặc bản dành cho DVDCAD).
- **Không chạy được `.dll` / `.arx` / `.dvb`**: đây là chương trình Windows (.NET, ObjectARX, VBA) chạy bên trong AutoCAD và gọi thẳng thư viện của Autodesk.
- **Chưa có DWF6 ePlot** (`.dwf`): không lấy được đặc tả WHIP / W2D, và không có bộ đọc chuẩn để kiểm chứng tệp ghi ra. Dùng DWFx thay.
- DWFx chưa thử bằng sản phẩm Autodesk (Design Review, Autodesk Viewer). Phần XPS đã kiểm bằng bộ đọc của Windows.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
