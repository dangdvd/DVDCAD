## DVDCAD 5.34.0 — Vết can, Design Feed, chia sẻ góc nhìn, xuất 3D glTF, thành phần mặt cắt

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.34.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.34.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Vết can** (thẻ Collaborate): `TRACE` như tờ giấy can đặt lên bản vẽ — vẽ, ghi chú, góp ý mà không sửa bản vẽ gốc.
  - `TRACEFRONT` (vẽ trên vết can, bản vẽ mờ và khoá), `TRACEBACK` (sửa bản vẽ, vết can mờ phía sau), `TRACECLOSE`, `-TRACE`.
  - Vết can lưu kèm DWG / DXF, không lẫn vào hình học bản vẽ, không in. Lệnh nét rộng cũ đổi tên thành `TRACEWIDE`.
- **Design Feed**: `DESIGNFEEDOPEN` / `DESIGNFEEDCLOSE` — bình luận, trả lời, gắn vị trí (bong bóng số trên bản vẽ), đánh dấu đã xong; lưu kèm bản vẽ.
- **Chia sẻ**:
  - `SHAREVIEW`: một tệp .html tự chứa (bản vẽ vector, phóng / kéo, các layout, bình luận) — người nhận mở bằng trình duyệt.
  - `PUSHTODOCS`: các layout → PDF vector (một tệp nhiều trang hoặc mỗi layout một tệp trong .zip).
  - `UPLOADTOCLOUD`, `PUSHTOWEB`: lên Google Drive của bạn / sang DVDCAD Web.
- `3DDWF`: xuất mô hình 3D ra **glTF .glb** (Windows 3D Viewer, Blender…) hoặc **trang 3D .html** xoay / phóng được trong trình duyệt.
- **Hình chiếu** (thẻ Layout):
  - `VIEWCOMPONENT`: chọn khối trên hình chiếu → không bị cắt / cắt / cắt lát (như trục, bu lông trong bản vẽ cơ khí).
  - `VIEWSYMBOLSKETCH` / `VIEWSKETCHCLOSE`: sửa đường cắt / biên hình trích bằng nét phác, hình chiếu dựng lại theo.
  - `VIEWSETPROJ`: chọn tệp dự án Inventor (.ipj).

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.33.0, thêm xuất glTF, vết can không vào hình học DXF và các lệnh mới.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động (36 mục):
  - Vết can:
    - nét mới thuộc vết can, khoá / mờ đúng ở trước / sau, đóng thì ẩn;
    - DXF chỉ ghi nét của bản vẽ, vết can mở lại được; bảng vết can, `-TRACE`.
  - Design Feed: đăng, trả lời, đã xong, gắn vị trí bằng điểm chọn; lưu / mở DXF giữ nguyên.
  - SHAREVIEW có SVG vector + bình luận; PUSHTODOCS ra PDF / .zip; UPLOADTOCLOUD và PUSHTOWEB khi chưa cấu hình Drive.
  - 3DDWF:
    - glTF 2.0 đọc lại đúng kích thước (mét, Y lên), số tam giác khớp;
    - trang 3D .html mở được (WebGL, không lỗi).
  - VIEWCOMPONENT:
    - chọn đúng khối qua hình chiếu mặt cắt;
    - Không / Lát / Cắt đổi đúng số vùng gạch;
    - lưu DXF mở lại + VIEWUPDATE vẫn giữ.
  - VIEWSYMBOLSKETCH: dời đường cắt → mặt cắt mới đúng; Bỏ giữ nguyên. VIEWSETPROJ đọc .ipj.
  - Các bộ kiểm thử của 5.24.0 → 5.33.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Danh sách lệnh AutoCAD 2027 nay đã có đủ (trừ `CAD` — không rõ chức năng, trợ giúp AutoCAD không mô tả).
- Các lệnh cộng tác chạy cục bộ, không dùng dịch vụ đám mây của Autodesk:
  - Vết can và Design Feed lưu kèm bản vẽ nhưng chỉ DVDCAD hiển thị — AutoCAD không thấy (định dạng Trace / Design Feed của Autodesk không công bố).
  - `SHAREVIEW` tạo tệp .html (không phải link Autodesk Viewer); `PUSHTODOCS` lưu PDF, tự đưa lên hệ thống tài liệu.
- `3DDWF` xuất glTF / trang 3D thay cho DWF 3D (định dạng HOOPS W3D không công bố).
- `VIEWCOMPONENT`: vùng gạch của khối bị cắt không bị khối "Không cắt" che (khi hai khối chồng lên nhau). `VIEWSETPROJ` chỉ ghi nhớ dự án — chưa đọc mô hình Inventor (.ipt / .iam).
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
