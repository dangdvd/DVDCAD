## DVDCAD 5.32.0 — MicroStation DGN, vòng điều hướng, bắt điểm 3D, mặt cắt gấp khúc, nhận chữ SHX

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.32.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.32.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **MicroStation DGN (V7)**:
  - `DGNIMPORT`: nhập tệp `.dgn`.
    - Đối tượng: đường, chuỗi đường, hình kín (có tô), cung, elip, đường cong, chuỗi / hình phức, chữ (cả tiếng Việt 16 bit), ô (cell).
    - Mức → lớp; giữ màu theo bảng màu của tệp, kiểu nét, bề rộng nét.
    - Đổi đơn vị theo bản vẽ (chọn đơn vị chính hoặc phụ).
  - `DGNATTACH`: gắn DGN làm nền tham chiếu. `DGNLAYERS` bật / tắt mức, `DGNCLIP` cắt, `DGNADJUST` mờ / đơn sắc.
  - `DGNEXPORT`: ghi DGN V7 2D.
    - Lớp → mức, bảng màu riêng (giữ đúng màu), kiểu nét, bề rộng.
    - Cung, elip, chữ tiếng Việt, hình tô.
  - `DGNMAPPING`: đặt tên lớp cho từng mức, ánh xạ kiểu nét.
- `NAVSWHEEL`: vòng điều hướng 8 múi — thu phóng, lia, quay quanh, tua lại, tâm, đi bộ, nhìn quanh, lên / xuống; dùng cho 2D và khung 3D.
- `3DOSNAP` (phím **F4**): bắt đỉnh, giữa cạnh, tâm mặt, điểm trên mặt khi chọn điểm trong khung 3D.
- **Mặt cắt gấp khúc**:
  - `SECTIONPLANEJOG` / `JOGSECTION`: thêm bậc gấp vào đường cắt.
  - `SECTIONPLANESETTINGS`: tên, hatch, màu, hướng nhìn; tạo mặt cắt 2D qua các khối 3D theo đường cắt gấp khúc.
- `PDFSHXTEXT`: nét chữ SHX trong bản vẽ nhập từ PDF → đối tượng chữ thật.
  - Tự nhận hướng dòng, cỡ chữ, khoảng trắng.
  - So khớp với phông txt / simplex / romans / iso / romand.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.31.0, thêm DGN ghi → đọc lại và các lệnh mới.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động (DGN 29 mục; điều hướng / bắt điểm / mặt cắt / chữ SHX 18 mục):
  - DGN dựng tay:
    - số thực VAX D; đơn vị M / CM; đường có màu / kiểu nét / bề rộng; hình kín có tô;
    - cung thuận và chiều kim; elip xoay; tròn; chữ 8 bit + 16 bit;
    - chuỗi phức → một đa tuyến; chuỗi điểm; bỏ phần tử đã xoá.
  - DGNIMPORT đổi đơn vị M → mm, đơn vị phụ; DGNATTACH + DGNLAYERS; DGN V8 báo rõ.
  - DGNEXPORT rồi đọc lại:
    - đường, tròn, cung qua 0°, cung elip;
    - đa tuyến có cung, đa tuyến 250 đỉnh;
    - SOLID có tô màu riêng, chữ tiếng Việt, điểm.
  - DGNMAPPING.
  - 3DOSNAP: tâm mặt, giữa cạnh, đỉnh, tắt, gần nhất trên mặt.
  - NAVSWHEEL 2D / 3D: thu phóng, quay quanh, nhìn quanh giữ chỗ đứng, tua lại.
  - Mặt cắt gấp khúc qua 2 khối (khối thứ 3 không cắt), tạo 2D + tên, thiết lập.
  - PDFSHXTEXT: "AB 12" (txt), chữ xoay 30°, "KHOI 3" (romans), lệnh thay nét bằng chữ.
  - Các bộ kiểm thử của 5.24.0 → 5.31.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Còn khoảng 30 lệnh AutoCAD chưa có: NURBS (`CONVTONURBS`, `SURFFILLET`, `INSERTCONTROLPOINT`), đánh dấu DWF (`MARKUP…`), `ACISOUT`, `IMPRINT`, đám mây và dịch vụ trực tuyến của Autodesk, một số lệnh nhỏ.
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
