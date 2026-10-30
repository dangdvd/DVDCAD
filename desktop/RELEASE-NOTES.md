## DVDCAD 5.24.0 — Chạy bộ tiện ích AutoLISP như AutoCAD: hộp thoại DCL, vla- / vlax-, nạp cả thư mục

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.24.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.24.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này giúp cài và chạy các **bộ tiện ích AutoLISP viết cho AutoCAD** (dạng mã nguồn `.lsp` kèm hộp thoại `.dcl`) gần như trên AutoCAD.

- **Nạp cả bộ tiện ích**: `APPLOAD` → **Nạp cả thư mục…** (chọn thư mục cài bộ LISP), hoặc **Nạp file…** rồi chọn gói **.zip** hay nhiều tệp cùng lúc.
  - Các tệp `.lsp`, `.dcl`, `.lin`, `.pat`, `.mnl`… được chép vào **thư mục hỗ trợ** của DVDCAD, giống Support File Search Path của AutoCAD. Vì vậy `load`, `load_dialog`, `findfile` tìm thấy chúng.
  - Chọn tệp `.lsp` nào **nạp ngay và tự nạp khi mở DVDCAD**.
  - `acad.lsp`, `acaddoc.lsp`, `S::STARTUP`, `autoload` chạy theo đúng thứ tự như AutoCAD.
  - Tệp soạn trên Windows theo bảng mã tiếng Việt (Windows-1258) đọc đúng dấu.
  - Lệnh `SUPPORTFILES` để xem / xoá các tệp trong thư mục hỗ trợ.
- **Hộp thoại DCL**: hiện được hộp thoại của tiện ích, gồm:
  - ô nhập, danh sách, danh sách thả xuống, ô đánh dấu, nút chọn, thanh trượt, ảnh, nút OK / Huỷ;
  - các hàm `action_tile`, `set_tile`, `get_tile`, `start_list`, `start_image`, `done_dialog`…
- **Hàm ActiveX `vla-` / `vlax-`**:
  - `vla-AddLine`, `vla-AddCircle`, `vla-AddLightWeightPolyline`, `vla-AddText`, `vla-AddBlockReference`…;
  - `vla-get-` / `vla-put-` thuộc tính (lớp, màu, chiều dài, diện tích, toạ độ, nội dung chữ…), có `:vlax-true` / `:vlax-false`;
  - `vla-Move`, `vla-Rotate`, `vla-Mirror`, `vla-Offset`…, `vlax-for` duyệt lớp / khối, safearray / variant.
- **`vlax-curve-`**: chiều dài, điểm, tham số, điểm gần nhất trên đường thẳng, cung, tròn, elip, đa tuyến có cung. Kết quả giống AutoCAD.
- **Hàm khác**:
  - đọc / ghi tệp (`open`, `read-line`, `write-line`), `getfiled`;
  - `grread`, `grdraw`, `tblnext`;
  - `entmake` chèn khối, `entmakex`;
  - `textbox`, `cvunit`, `acad_colordlg`, vài hàm Express Tools (`acet-…`) hay dùng.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.23.0, thêm hai phần mới:
     - hộp thoại DCL hiện lên và trả giá trị;
     - `vla-AddLine`, `vla-get-Length`, `vlax-curve` trả đúng.
  2. **ODA File Converter** và **ACadSharp** đọc lại các file DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động, chạy một bộ LISP mẫu:
  - Hộp thoại DCL: dựng đủ các ô, `action_tile` chạy khi chọn, OK trả 1 và đọc đúng giá trị, Huỷ trả 0.
  - `vla-` dựng đường, dời, xoay, đối xứng, offset đường tròn đúng kích thước.
  - `vlax-curve` trên đa tuyến có cung: chiều dài 25,707, điểm giữa cung (15; 5), tham số tại khoảng cách 5 là 0,5.
  - Nạp thư mục mẫu: `.dcl` vào thư mục hỗ trợ, `autoload` nạp tệp khi gõ lệnh, `acaddoc.lsp` + `S::STARTUP` tự chạy, tệp Windows-1258 đúng dấu, `.fas` được báo bỏ qua.
  - Mở lại DVDCAD: thư mục hỗ trợ và Startup Suite còn nguyên.

### Giới hạn
- **Không chạy được `.fas` / `.vlx`**: đây là LISP đã biên dịch và mã hoá cho riêng AutoCAD, không có mã nguồn. Nhiều bộ tiện ích thương mại chỉ phát hành dạng này, kèm khoá bản quyền. Cần xin tác giả bản `.lsp` (hoặc bản dành cho DVDCAD).
- **Không chạy được `.dll` / `.arx` / `.dvb`**: đây là chương trình Windows (.NET, ObjectARX, VBA) chạy bên trong AutoCAD và gọi thẳng thư viện của Autodesk.
- Reactor (`vlr-…`) tạo được nhưng chưa phát sinh sự kiện. `trans` / `osnap` trả nguyên điểm. `entmake` cho HATCH / DIMENSION / định nghĩa khối chưa có (tiện ích dùng `command` thì vẫn chạy).
- **Chưa có DWF6 ePlot** (`.dwf`): không lấy được đặc tả WHIP / W2D, và không có bộ đọc chuẩn để kiểm chứng tệp ghi ra. Dùng DWFx thay.
- DWFx chưa thử bằng sản phẩm Autodesk (Design Review, Autodesk Viewer). Phần XPS đã kiểm bằng bộ đọc của Windows.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
