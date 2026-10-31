## DVDCAD 5.30.0 — Kết xuất ảnh, đèn IES, vật liệu, cảnh quay, hoạt hình, tập bản vẽ

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.30.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.30.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Kết xuất ảnh** (thẻ Visualize › Render):
  - `RENDERWINDOW` kết xuất khung 3D ra ảnh. Cửa sổ có lịch sử, lưu PNG, cắt vùng (`RENDERCROP`).
  - `RENDERPRESETS`: mức Thấp → Trình chiếu (tới 3× độ phân giải).
  - `RENDEREXPOSURE`: phơi sáng. `RENDERENVIRONMENT`: sương mù, nền một màu / chuyển màu.
- **Đèn**: `WEBLIGHT` / `FREEWEB` đọc tệp **IES** của nhà sản xuất đèn (cường độ, góc chùm). `FREESPOT`: đèn rọi tự do. `TARGETPOINT`: đèn điểm có điểm nhắm.
- **Vật liệu**:
  - `MATEDITOROPEN`: tạo / sửa vật liệu (màu, độ nhám, kim loại, độ đục, vân).
  - `MATERIALATTACH`: vật liệu theo lớp.
  - `MATERIALMAP`: ánh xạ vân hộp / phẳng / trụ / cầu.
- **Cảnh quay (ShowMotion)**: `NEWSHOT` / `EDITSHOT` lưu góc nhìn 2D hoặc camera 3D. Thanh `NAVSMOTION` chạy lần lượt / lặp với chuyển cảnh mượt (`VTOPTIONS`).
- **Hoạt hình** `ANIPATH`: camera đi dọc đường (nhìn theo hướng đi hoặc nhìn một điểm), ghi ra **video WebM**.
- `3DORBITCTR` (tâm quay khung 3D), `LIVESECTION` (bật / tắt mặt cắt).
- **Tập bản vẽ** (thẻ Output › Sheet Set):
  - `NEWSHEETSET`: tạo tập từ các layout, đánh số tờ có tiền tố, thông tin dự án.
  - Bảng **Sheet Set Manager** (`SHEETSET`):
    - mở tờ, sửa số / tên tờ, sắp xếp;
    - bảng danh mục bản vẽ;
    - trường số tờ / tên tờ / tên dự án… tự cập nhật khi đổi;
    - xuất bản; lưu / mở tệp `.dvdsst` (`OPENSHEETSET`).

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.29.0, thêm đọc tệp IES và các lệnh mới.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động (30 mục):
  - cửa sổ kết xuất, cắt vùng, phơi sáng +1 EV, sương mù + nền chuyển màu, mức kết xuất;
  - đèn có điểm nhắm / rọi tự do / IES (cực đại 1000 cd, chùm 60°);
  - vật liệu tự tạo, theo lớp, ánh xạ trụ; DXF giữ vật liệu;
  - cảnh quay 2D / 3D, chuyển cảnh mượt 300 ms, thanh ShowMotion, sửa cảnh;
  - tâm quay 3D; ANIPATH ghi video WebM;
  - tập bản vẽ từ 2 layout: mở tờ chuyển layout, trường số tờ tự cập nhật khi đổi số, bảng danh mục, lưu / mở `.dvdsst`, `.dst` báo rõ.
  - Các bộ kiểm thử của 5.24.0 → 5.29.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Còn khoảng 71 lệnh AutoCAD chưa có: nền DGN, IGES, NURBS (`CONVTONURBS`, `SURFFILLET`), OLE, đám mây và dịch vụ trực tuyến của Autodesk, một số lệnh nhỏ.
- Kết xuất dùng bộ vẽ thời gian thực của khung 3D (bóng đổ, vật liệu PBR), chưa có dò tia (ray tracing) như AutoCAD. Tệp tập bản vẽ `.dst` của AutoCAD chưa đọc được; tập bản vẽ của DVDCAD lưu trong máy hoặc tệp `.dvdsst`. COM khác (Word, Access, ADODB…) chưa có.
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
