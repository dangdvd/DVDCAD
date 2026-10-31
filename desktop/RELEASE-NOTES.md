## DVDCAD 5.26.0 — Cài ứng dụng ngoài như AutoCAD: gói .bundle, menu, reactor, Excel, DOSLib

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.26.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.26.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này bổ sung phần hạ tầng mà các ứng dụng / tiện ích cài thêm cho AutoCAD hay dùng.

- **Cài gói ứng dụng `.bundle`** (cách cài của Autodesk App Store, thư mục `ApplicationPlugins`): `APPLOAD` → **Nạp cả thư mục…**, chọn thư mục `.bundle` hoặc gói .zip.
  - DVDCAD đọc `PackageContents.xml`: tệp LISP tự nạp khi mở hoặc nạp khi gõ lệnh; menu `.cuix` nạp kèm `.mnl`.
  - Phần `.dll` / `.arx` / `.fas` bị bỏ qua; gõ lệnh của phần đó thì DVDCAD báo rõ là cần AutoCAD.
  - Lệnh `APPAUTOLOADER` liệt kê gói đã cài.
- **Menu**: `MENULOAD` / `MENUUNLOAD` nạp và gỡ menu `.cuix` / `.cui` và menu cũ `.mnu` / `.mns`. Tệp `.mnl` cùng tên tự nạp như AutoCAD.
- **Reactor** phát sinh sự kiện thật: lệnh bắt đầu / kết thúc / huỷ; thêm / sửa / xoá đối tượng; đối tượng sở hữu bị sửa / xoá; đổi biến hệ thống; nhấp đúp / chuột phải; lưu bản vẽ. Tiện ích tự cập nhật (đánh số, bảng khối lượng, nhãn liên kết) chạy được.
- **Xuất Excel từ LISP**: `(vlax-get-or-create-object "Excel.Application")` với `Workbooks`, `Worksheets`, `Cells`, `Range`, `Value`, `Formula`, `SaveAs` ghi ra **tệp .xlsx thật**, mở bằng Excel được. Máy không cần cài Excel.
- **`Scripting.FileSystemObject`**, **`Scripting.Dictionary`**, **`WScript.Shell`** dùng được trong LISP.
- **DOSLib**: các hàm hay dùng (`dos_msgbox`, `dos_listbox`, `dos_checklist`, `dos_getstring`, `dos_strtokens`, `dos_strreplace`…).
- **OPTIONS › Tệp**: đường dẫn tìm tệp hỗ trợ, vị trí tin cậy (`TRUSTEDPATHS`), ứng dụng đã cài. `SECURITYOPTIONS` mở tab này.
- **`NETLOAD`, `ARX`, `VBALOAD` / `VBARUN` / `VBAMAN` / `VBAIDE`**: có lệnh như AutoCAD, giải thích vì sao tệp `.dll` / `.arx` / `.dvb` không chạy và cách thay thế.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.25.0, thêm reactor lệnh, Excel qua COM, DOSLib.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động:
  - reactor lệnh / CSDL / đối tượng / biến hệ thống phát sinh đúng;
  - Excel: ghi ô, đọc lại `Value` / `Text`, `SaveAs` ra tệp `.xlsx` (gói zip hợp lệ);
  - FileSystemObject ghi / đọc tệp; Dictionary; `vlax-import-type-library` với tiền tố `msxl-`;
  - DOSLib `dos_listbox`, `dos_msgbox`, hàm chuỗi;
  - gói `.bundle` mẫu: LISP khởi động, `autoload` theo lệnh, menu `.cuix` + `.mnl`, lệnh của `.dll` báo rõ;
  - `MENULOAD` đọc menu `.mnu`; OPTIONS › Tệp.
  - Các bộ kiểm thử LISP của 5.24.0 và 5.25.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. COM khác (Word, Access, ADODB…) chưa có.
- Excel làm lại không tính công thức: công thức được ghi vào tệp, Excel tính khi mở.
- **Không chạy được `.fas` / `.vlx`**: đây là LISP đã biên dịch và mã hoá cho riêng AutoCAD, không có mã nguồn. Nhiều bộ tiện ích thương mại chỉ phát hành dạng này, kèm khoá bản quyền. Cần xin tác giả bản `.lsp` (hoặc bản dành cho DVDCAD).
- **Không chạy được `.dll` / `.arx` / `.dvb`**: đây là chương trình Windows (.NET, ObjectARX, VBA) chạy bên trong AutoCAD và gọi thẳng thư viện của Autodesk.
- **Chưa có DWF6 ePlot** (`.dwf`): không lấy được đặc tả WHIP / W2D, và không có bộ đọc chuẩn để kiểm chứng tệp ghi ra. Dùng DWFx thay.
- DWFx chưa thử bằng sản phẩm Autodesk (Design Review, Autodesk Viewer). Phần XPS đã kiểm bằng bộ đọc của Windows.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
