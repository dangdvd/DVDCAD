## DVDCAD 5.10.0 — tự lưu DWG, dòng lệnh như AutoCAD 2027

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.10.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.10.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Tự lưu DWG, không cần ODA File Converter.**
  - `SAVEDWG` ghi thẳng file **DWG 2000 (AC1015)** — định dạng AutoCAD từ bản 2000 trở đi đều mở được.
  - `SAVEAS` / **Ctrl+Shift+S** chọn được *Bản vẽ AutoCAD (\*.dwg)*; **Ctrl+S** sau đó ghi đè đúng file DWG đó.
  - Giữ lớp, kiểu nét (cả kiểu nét có chữ / hình), kiểu chữ, khối + thuộc tính, kích thước, hatch đặc và hatch mẫu, đa tuyến có cung / độ rộng, MTEXT, vùng che, layout, ảnh xem trước.
  - Mở lại trong DVDCAD còn nguyên khối 3D tham số, vùng, thứ tự vẽ, ràng buộc, khối động.
  - Cần DWG 2004 → 2018 thì vẫn chọn được trong `DWGSERVER` (qua ODA File Converter); không có ODA thì DVDCAD tự ghi DWG 2000.
- **Dòng lệnh như AutoCAD 2027.**
  - Lời nhắc có tuỳ chọn bấm được, nhập động (x,y tương đối, `#` tuyệt đối, Tab khoá ô), khoá góc `<45`, bộ lọc điểm `.X`, `FROM`, `M2P`, `TT`.
  - Lệnh trong suốt (`'ZOOM`, `'CAL`…), chuột phải bấm nhanh = Enter / giữ = menu, gợi ý khi gõ (AutoComplete, sửa lỗi gõ, đồng nghĩa, biến hệ thống, nội dung bản vẽ).
  - Bản dòng lệnh cho script / LISP: `-LAYER`, `-INSERT`, `-BLOCK`, `-OSNAP`; `UNDO` BE/E/M/B; F1 mở trang cách dùng của lệnh đang chạy.
- **Mở DWG:** thuộc tính khối (ATTRIB) không còn bị đọc trùng hai lần.
- **Ký số bản dựng:** GitHub Actions tự ký bằng chứng thư .pfx hoặc Azure Trusted Signing khi repo có cấu hình (xem hướng dẫn).

### Kiểm thử
- 36 file DWG mẫu của LibreDWG (2000 → 2018) và một bản vẽ 10 nghìn đối tượng: mở → lưu DWG → mở lại, giống hệt từng đối tượng.
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh: mở DWG / DXF, hộp thoại Mở / Lưu, trang Start, lệnh tắt, dòng lệnh, lưu DWG gốc và mở lại.
  2. ODA File Converter đọc + audit lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- Khối động lưu ra thành khối thường ở trạng thái đang hiện (AutoCAD chưa đổi được tham số khối động do DVDCAD tạo).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
