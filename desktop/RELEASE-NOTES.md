## DVDCAD 5.33.0 — Xuất ACIS, mặt NURBS, in dấu, nét khuất, đánh dấu, so sánh, kết nối dữ liệu

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.33.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.33.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Khối 3D**:
  - `ACISOUT` xuất khối ra tệp ACIS `.sat` (mặt phẳng, có lỗ, cạnh dùng chung).
  - `BREP` bỏ lịch sử khối.
  - `IMPRINT` in dấu đường lên mặt khối.
  - `HLSETTINGS` hiện nét khuất (đứt / chấm / liền, màu) khi xem kiểu Hidden.
- **Mặt NURBS** (thẻ Surface):
  - `CONVTONURBS`: khối / mặt → mặt NURBS; trụ, cầu đúng tròn tuyệt đối.
  - `3DEDITBAR`: kéo một điểm trên mặt tới vị trí mới.
  - `INSERTCONTROLPOINT`: thêm hàng điểm điều khiển, hình không đổi.
  - `SURFFILLET`: bo cung tròn giữa hai mặt phẳng và cắt mặt tới đường tiếp xúc.
- **Đánh dấu**:
  - `MARKUPIMPORT` nhập bản đánh dấu (PDF / ảnh / DWFx).
  - `MARKUPASSIST` tìm vết đánh dấu đỏ: phóng tới, chèn chữ ghi chú vào bản vẽ, vẽ đám mây sửa đổi, đánh dấu đã xong.
  - `OPENDWFMARKUP`, `MARKUPCLOSE`.
- **So sánh**: `COMPAREEXPORT` xuất kết quả so sánh ra DXF; `COMPAREIMPORT` lấy đối tượng của bản so sánh vào bản vẽ.
- `DBCONNECT`: nối bảng CSV / Excel với đối tượng — xem bản ghi, chọn đối tượng theo dòng, nhãn từ dữ liệu.
- `AMECONVERT`.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.32.0, thêm ACISOUT → ACISIN, trụ NURBS và các lệnh mới.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động (28 mục):
  - ACISOUT:
    - đầu tệp SAT 7.0; hộp 6 mặt + khung có lỗ 10 mặt;
    - mỗi cạnh đúng 2 coedge; đọc lại đúng thể tích.
  - BREP. IMPRINT trên mặt đáy, xoá / giữ đường gốc, DXF giữ nét in. HLSETTINGS: nét khuất đứt ở kiểu Hidden.
  - NURBS:
    - trụ / cầu đúng tròn (sai số < 10⁻⁹), hộp → 6 mặt song tuyến;
    - chèn nút U / V không đổi hình; 3DEDITBAR dời đúng +7;
    - SURFFILLET R = 2 đúng điểm giữa cung, cắt sàn / tường; DXF giữ mặt NURBS.
  - Đánh dấu:
    - 2 vết đỏ (nét + chữ), chèn chữ, đám mây, đã xong;
    - nhập ảnh đánh dấu đúng cỡ (192 px = 50,8 mm).
  - So sánh thêm 2 / mất 1, COMPAREEXPORT, COMPAREIMPORT đúng lớp / màu.
  - DBCONNECT liên kết, nhãn, bảng, chọn theo dòng.
  - Các bộ kiểm thử của 5.24.0 → 5.32.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Còn khoảng 14 lệnh AutoCAD chưa có: phần lớn là dịch vụ đám mây / trực tuyến của Autodesk (Trace, Shared Views, Design Feed, Docs) và hình chiếu liên kết Inventor (`VIEWCOMPONENT`, `VIEWSETPROJ`, `VIEWSYMBOLSKETCH`), `3DDWF`.
- ACISOUT ghi khối dạng mặt phẳng (mặt cong thành nhiều mặt phẳng nhỏ). Đã kiểm bằng bộ đọc ACIS của DVDCAD, chưa thử với AutoCAD.
- Mặt NURBS:
  - `SURFFILLET` chỉ bo giữa hai mặt phẳng.
  - `CONVTONURBS` với mặt cong khác trụ / nón / cầu cho mỗi tam giác một mặt.
  - Chưa có giao diện kéo điểm điều khiển bằng chuột (`3DEDITBAR` dùng dòng lệnh).
- `MARKUPASSIST` nhận vết đánh dấu theo màu đỏ / cam (không đọc chữ viết tay trong ảnh).
- DGN:
  - Chỉ đọc / ghi DGN V7. DGN V8 (MicroStation V8 / CONNECT) cần đổi sang V7 bằng MicroStation hoặc ODA File Converter.
  - V7 không lưu tên mức nên lớp xuất ra thành mức số (đặt tên bằng `DGNMAPPING`). B-spline, kích thước, ô dùng chung (shared cell) chưa đọc.
  - Bảng màu mặc định khi tệp không có bảng màu chỉ gần đúng.
  - Đọc / ghi theo mô tả định dạng V7 (giống GDAL), chưa thử với MicroStation.
- `PDFSHXTEXT` chỉ nhận đúng khi nét chữ dùng phông giống phông nét đơn kèm theo (txt / simplex / romans / iso / romand). Phông khác hoặc chữ bị cắt nét thì ký tự có thể sai — kiểm lại sau khi đổi.
- IGES: chưa đọc B-rep (186, khối đặc kiểu MSBO) — chỉ đọc dạng mặt (144 / 128…). Mặt cong cắt xén được lấy theo lưới nên mép hơi răng cưa. Chữ IGES chỉ có ASCII nên tiếng Việt bị bỏ dấu khi xuất.
- OLE không phải OLE thật của Windows: tài liệu Word / Excel hiện dạng biểu tượng, mở ra bằng chương trình ngoài, không sửa tại chỗ. AutoCAD mở bản vẽ thấy đối tượng OLE dạng ảnh. Dữ liệu tệp nhúng lưu trong máy.
- DXB đọc theo mô tả định dạng của AutoCAD R12, chưa thử với tệp do AutoCAD xuất. `SIGVALIDATE` chỉ biết tệp có chữ ký hay không, không kiểm được chứng thư.
- Kết xuất dùng bộ vẽ thời gian thực của khung 3D (bóng đổ, vật liệu PBR), chưa có dò tia (ray tracing) như AutoCAD. Tệp tập bản vẽ `.dst` của AutoCAD chưa đọc được. COM khác (Word, Access, ADODB…) chưa có.
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
