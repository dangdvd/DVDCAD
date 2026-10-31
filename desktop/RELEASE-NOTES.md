## DVDCAD 5.31.0 — IGES, DXB, đối tượng OLE, lịch sử bản vẽ, lệnh tiện ích

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.31.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.31.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **IGES**:
  - `IGESIMPORT` đọc tệp `.igs` / `.iges` từ các phần mềm CAD khác:
    - đường, cung, elip, NURBS, đường ghép (giữ cung chính xác);
    - mặt NURBS / mặt kẻ / tròn xoay / mặt cắt xén → lưới 3D;
    - chữ, mũi tên, kích thước, khối con, màu, tên lớp.
  - `IGESEXPORT` ghi IGES 5.3: đường, cung, elip, đa tuyến có cung, spline (NURBS), chữ, khối 3D / lưới (mặt), màu, lớp, kiểu nét.
- `DXBIN`: nhập tệp DXB (bản vẽ nhị phân do máy vẽ ADI xuất).
- **Đối tượng OLE** (thẻ Insert › Import):
  - `INSERTOBJ`: nhúng hoặc liên kết tệp. Ảnh, PDF (trang 1), văn bản, bảng CSV hiện đúng nội dung; tệp khác hiện biểu tượng. Có thể tạo mới ghi chú / bảng.
  - `OLESCALE`: đổi cỡ theo % hoặc kích thước.
  - `OLELINKS`: cập nhật, mở, đổi nguồn, ngắt liên kết. Bản Windows tự cập nhật liên kết khi mở bản vẽ.
- **Lịch sử bản vẽ** (thẻ Manage › Lịch sử):
  - `DWGHISTORY`: mỗi lần lưu tự chụp một phiên bản; mở lại hoặc **so sánh** với hiện tại (tô xanh chỗ thêm, đỏ chỗ mất). `SNAPSHOT` chụp kèm ghi chú.
  - `ACTIVITYINSIGHTS`: ai mở / lưu / sửa, lúc nào, lệnh gì; xuất CSV.
  - `MYINSIGHTS`: lệnh dùng nhiều nhất và gợi ý lệnh tắt. `VIEWPLOTDETAILS`: các lần in / xuất.
- `HATCHGAPTOL`: HATCH nhận vùng có khe hở nhỏ.
- `PSFILL`: tô xám / màu / chuyển màu / mẫu.
- `WMFCLIP`: chép đối tượng dạng hình để dán vào Word / Excel.
- `AUTOPUBLISH`: tự xuất PDF / DWFx mỗi khi lưu.
- `XREFCOMPARE`: so tham chiếu ngoài với bản mới.
- `SMARTBLOCKSREPLACE`: thay nhóm nét bằng khối giống nhất.
- `WHOHAS`: ai đang mở bản vẽ (tệp .dwl).
- `SIGVALIDATE`: chữ ký số + mã SHA-256.
- Lệnh khác: `CONVERT`, `CONVERTPSTYLES`, `ADCNAVIGATE`, `FILEOPEN`, `TRAYSETTINGS`, `REGENAUTO`, `TASKBAR`, `TABLET`, `TOOLPALETTESCLOSE`.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.30.0, thêm IGES ghi → đọc lại, DXB và các lệnh mới.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động (IGES / DXB 24 mục; OLE và lệnh tiện ích 37 mục):
  - IGES ghi rồi đọc lại:
    - đủ dòng 80 cột;
    - cung, tròn, elip (cung + đủ vòng), đa tuyến có cung (thuận + nghịch), spline → NURBS đúng hình;
    - đa tuyến 3D, màu riêng, tên lớp, chữ, khối 3D → lưới.
  - IGES viết tay:
    - ma trận xoay + dời, conic → elip, NURBS bậc 2, mặt tròn xoay;
    - mặt cắt xén theo biên tham số (diện tích đúng một nửa);
    - khối con 308 / 408, kích thước → chữ + mũi tên, màu 314, đơn vị inch → mm.
  - DXB: chế độ thực / nguyên, hệ số tỉ lệ, đường nối tiếp, cung, đa tuyến có cung, lớp, màu.
  - OLE: bảng tạo mới, ảnh liên kết (96 px = 25,4 mm), biểu tượng; OLESCALE 200 % / 50 %; OLELINKS ngắt liên kết; DXF giữ OLE.
  - Các lệnh khác:
    - WMFCLIP chép hình, PSFILL (xám 25 %, chuyển màu tròn, gạch);
    - HPGAPTOL: khe 0,5 với dung sai 1 → tìm được biên;
    - TRAYSETTINGS tắt / giữ thông báo; WHOHAS đọc .dwl / .dwl2; SIGVALIDATE;
    - CONVERT, CONVERTPSTYLES hai chiều;
    - VIEWPLOTDETAILS, ACTIVITYINSIGHTS, MYINSIGHTS;
    - SNAPSHOT + tự chụp khi lưu, DWGHISTORY so sánh;
    - SMARTBLOCKSREPLACE đúng chỗ, đúng tỉ lệ; AUTOPUBLISH lưu → PDF.
  - Các bộ kiểm thử của 5.24.0 → 5.30.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Còn khoảng 43 lệnh AutoCAD chưa có: nền DGN (7 lệnh), NURBS (`CONVTONURBS`, `SURFFILLET`, `INSERTCONTROLPOINT`), đánh dấu DWF (`MARKUP…`), đám mây và dịch vụ trực tuyến của Autodesk, một số lệnh nhỏ.
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
