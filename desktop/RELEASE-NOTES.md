## DVDCAD 5.21.0 — Plot Preview phóng to được, máy in Windows đã cài, khổ giấy như DWG To PDF, mọi PDF là vector

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.21.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.21.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý góp ý về hộp PLOT: cửa sổ xem trước chưa phóng to được, ít máy in / khổ giấy, PDF bị mờ khi phóng to.

- **Plot Preview như AutoCAD** (nút **Xem trước…**, bấm vào hình xem trước nhỏ, hoặc lệnh `PREVIEW`):
  - Trang in vẽ bằng **nét vector**: phóng to bao nhiêu chữ và đường nét vẫn sắc nét.
  - **Lăn chuột** để phóng to / thu nhỏ quanh con trỏ, **kéo chuột** (hoặc chuột giữa) để dời hình, chạm hai ngón để zoom trên màn hình cảm ứng.
  - Thanh công cụ và **menu chuột phải**: In, Pan, Zoom, Zoom Window, Zoom Original, Thoát. **Esc / Enter** để thoát.
- **Máy in như AutoCAD**:
  - Thêm `AutoCAD PDF (General Documentation)`, `AutoCAD PDF (Web and Mobile)`, `Default Windows System Printer.pc3`.
  - **Mọi máy in đã cài trong Windows** hiện trong danh sách theo tên. Chọn máy in rồi OK là in thẳng nét vector ra máy đó (không qua hộp in của Windows). Ô **Số bản** dùng được.
  - Trình quản lý máy vẽ (`PLOTTERMANAGER`) cũng liệt kê máy in Windows.
- **89 khổ giấy như DWG To PDF.pc3**, chia nhóm:
  - ISO A (4A0 → A6), ISO B, ISO C; **ISO full bleed** (không lề), **ISO expand**.
  - ANSI A → F, ARCH A → E3, mỗi loại có full bleed / expand; JIS B4 / B5, Legal; khổ tự chọn.
  - Chọn khổ thì ô Lề tự đặt theo khổ (full bleed = 0). Tên khổ ghi vào DWG / DXF theo tên chuẩn của AutoCAD.
- **Mọi cách xuất PDF đều là PDF vector** (đường nét + chữ thật, phóng to vẫn sắc nét):
  - Ngoài PLOT, nay cả nút **Xuất → PDF**, **Xuất mọi layout ra PDF** và `PUBLISH` (trước đây các đường này ghi ảnh JPEG nên phóng to bị mờ).
- Sửa: chữ trong bản vẽ ở cửa sổ xem trước không còn bị bộ dịch giao diện tiếng Anh dịch theo.
- Sửa: đổi từ máy in PDF sang máy in Windows thì tự bỏ **In ra file**.

> Nếu bạn đang dùng bản cũ hơn 5.18.0: các bản đó xuất PDF dạng ảnh và chỉ có khổ ISO A0 → A4. Hãy cài bản này.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.20.0, thêm: đọc danh sách máy in Windows qua cầu nối; in tới máy in không tồn tại phải báo lỗi chứ không treo; 89 khổ giấy và tên khổ chuẩn AutoCAD; Plot Preview là SVG vector phóng to ×40; bảng Xuất → PDF ra trang vector.
  2. **ODA File Converter** và **ACadSharp** đọc lại các file DWG (2018 / 2013 / 2010 / 2007 / 2004 / 2000) do DVDCAD ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.
- Thử giao diện bằng trình duyệt tự động: lăn chuột phóng to ×650, kéo dời đúng từng điểm ảnh, Zoom Window, menu chuột phải, nút In trong xem trước ra PDF không có ảnh raster; máy in Windows giả lập nhận đúng tên máy, 3 bản, khổ 420 × 297 mm.

### Giới hạn
- In thẳng ra máy in Windows dùng khổ giấy và hướng do DVDCAD gửi; các tuỳ chọn riêng của trình điều khiển máy in (khay giấy, chất lượng…) chỉnh trong **Máy in Windows (hộp in hệ thống)**.
- Chưa có DWF6 ePlot / DWFx ePlot.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
