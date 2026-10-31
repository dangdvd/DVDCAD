## DVDCAD 5.29.0 — PDF / DWFx có lớp, nền PDF / DWF, đám mây điểm

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.29.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.29.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **PDF và DWFx xuất ra có lớp** như AutoCAD.
  - Mở PDF bằng Acrobat / trình xem PDF là bật / tắt được từng lớp bản vẽ.
  - `EXPORTSETTINGS` bật / tắt việc ghi lớp.
- **Nền PDF** (`PDFATTACH`): gắn trang PDF làm nền tham chiếu, giữ lớp của PDF.
  - `PDFLAYERS`: bật / tắt lớp. `PDFCLIP`: cắt nền theo khung. `PDFADJUST`: độ mờ, đơn sắc. `PDFFRAME`: khung.
  - Mở lại bản vẽ (DXF / DWG) vẫn giữ nguyên các lớp đã tắt.
  - `PDFIMPORT` (nhập thành nét) nay đưa lớp trong PDF thành lớp bản vẽ.
- **Nền DWF** (`DWFATTACH`): gắn trang DWFx / XPS làm nền (nét, vùng tô, chữ, lớp). Có thêm `DWFLAYERS`, `DWFCLIP`, `DWFADJUST`, `DWFFRAME`.
- `ULAYERS`: lớp của mọi nền trong bản vẽ. `UFRAMES`: khung nền.
- `EXPORTDWFX`, `EXPORTDWF`, `DWFFORMAT`.
- **Đám mây điểm** (thẻ Insert › Point Cloud):
  - `POINTCLOUDATTACH` gắn `.las`, `.xyz` / `.pts` / `.txt` / `.csv`, `.ply`; giữ toạ độ thật, màu RGB, cường độ, phân loại LAS.
  - Hiện từng điểm trên màn hình và trong khung 3D.
  - `POINTCLOUDCOLORMAP`: tô màu RGB / cường độ / cao độ / phân loại.
  - `POINTCLOUDCROP` / `POINTCLOUDUNCROP`: cắt / bỏ cắt. `POINTCLOUDPOINTSIZE`: cỡ điểm.
  - **Trích hình học**:
    - `PCEXTRACTSECTION`: mặt cắt đứng → đa tuyến 3D;
    - `PCEXTRACTEDGE` / `PCEXTRACTCORNER`: cạnh, góc giữa 2 tường và sàn;
    - `PCEXTRACTCENTERLINE`: tâm ống đứng.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.28.0, thêm đọc trang DWFx có lớp, đọc LAS.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động:
  - PDF xuất ra có OCG theo lớp; PDFIMPORT đọc lại thành lớp;
  - PDFATTACH giữ lớp; PDFLAYERS tắt lớp; PDFADJUST mờ + đơn sắc;
  - DXF mở lại giữ lớp nền, lớp tắt, màu gốc; PDFCLIP;
  - EXPORTDWFX có lớp → DWFATTACH đọc lại nét, chữ, lớp; tệp DWF6 báo rõ; UFRAMES;
  - đám mây điểm .xyz (15 441 điểm) giữ toạ độ; đọc LAS (RGB 16 bit, phân loại, cường độ) và PLY nhị phân;
  - tô màu cao độ; cắt / bỏ cắt;
  - mặt cắt đứng, cạnh / góc 2 tường, tâm ống đúng vị trí;
  - DXF mở lại giữ đám mây điểm; khung 3D hiện điểm; .laz báo rõ.
  - Các bộ kiểm thử của 5.24.0 → 5.28.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Còn khoảng 99 lệnh AutoCAD chưa có: kết xuất (render) nâng cao, nền DGN, NURBS (`CONVTONURBS`, `SURFFILLET`), tập bản vẽ (`NEWSHEETSET`), đám mây và dịch vụ trực tuyến của Autodesk. COM khác (Word, Access, ADODB…) chưa có.
- Excel làm lại không tính công thức: công thức được ghi vào tệp, Excel tính khi mở.
- **Không chạy được `.fas` / `.vlx`**: đây là LISP đã biên dịch và mã hoá cho riêng AutoCAD, không có mã nguồn. Nhiều bộ tiện ích thương mại chỉ phát hành dạng này, kèm khoá bản quyền. Cần xin tác giả bản `.lsp` (hoặc bản dành cho DVDCAD).
- **Không chạy được `.dll` / `.arx` / `.dvb`**: đây là chương trình Windows (.NET, ObjectARX, VBA) chạy bên trong AutoCAD và gọi thẳng thư viện của Autodesk.
- **Chưa đọc / ghi DWF6** (`.dwf` nhị phân): không lấy được đặc tả WHIP / W2D. Dùng DWFx thay (DWFATTACH / EXPORTDWFX).
- Đám mây điểm: chưa đọc `.laz` (LAS nén), `.e57`, `.rcp` / `.rcs` (ReCap). Điểm lưu trong bộ nhớ của máy; trên máy khác chỉ thấy ảnh nhìn từ trên.
- DWFx chưa thử bằng sản phẩm Autodesk (Design Review, Autodesk Viewer). Phần XPS đã kiểm bằng bộ đọc của Windows.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
