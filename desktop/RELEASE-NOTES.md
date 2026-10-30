## DVDCAD 5.20.0 — Lưu DWG 2007 thật không cần ODA, máy in giảm màu in nét vector

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.20.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.20.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý các hạn chế còn lại của 5.19.0.

- **Lưu DWG 2007 thật (AC1021), không cần ODA File Converter**:
  - `SAVEDWG` / `DWGSERVER` có thêm **DWG 2007 — bộ ghi sẵn có**; `DWGCONVERT` đổi hàng loạt sang DWG 2007.
  - Trước đây không có ODA thì DVDCAD ghi DWG 2004; nay ghi đúng định dạng 2007 (AutoCAD 2007 / 2008 / 2009).
  - DVDCAD tự mã hoá đầy đủ vỏ tệp 2007: mã sửa lỗi Reed–Solomon, nén LZ kiểu 2007, CRC-64 và checksum từng trang — đã so từng byte với tệp AutoCAD thật.
- **Mở DWG 2007 lớn đúng hơn**: các trang dữ liệu không nén được (ảnh, dữ liệu nhị phân) trước đây làm mất đối tượng khi mở, nay đọc đúng.
- **Máy in đặt giảm màu cũng in nét vector**: máy in Windows đặt 256 màu / đen trắng trong **Thuộc tính…** nay gửi đường nét và chữ thay vì ảnh.
  - Màu theo bảng màu máy in. Màu không có trong bảng mà kiểu in bật dither thì giả bằng mẫu chấm vector; tắt dither thì lấy màu gần nhất, nét đặc.
  - Ảnh trong bản vẽ giảm màu từng điểm ảnh (Floyd–Steinberg).

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.19.0, thêm: DWG 2007 gốc (khung nhìn xoay, thiết lập trang, bản vẽ tổng hợp đủ loại đối tượng) mở lại giống hệt.
  2. **ODA File Converter** đọc + audit và **ACadSharp** đọc lại các file DWG 2007 (cùng 2018 / 2013 / 2010 / 2004 / 2000) do DVDCAD ghi: đều đạt, không lỗi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.
- Bộ ghi DWG 2007 thử vòng tròn trên 36 bản vẽ mẫu (mở DWG → ghi DWG 2007 → mở lại): kết quả giống ghi DWG 2004 / 2010.
- In giảm màu: 256 màu / đen trắng / kiểu in tắt dither đều ra SVG vector đúng màu bảng.

### Giới hạn
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- DWG 2007: ba section thông tin (SummaryInfo / Preview / AppInfo) được ghi dạng dữ liệu liền không kèm mã sửa lỗi của khối cuối (cách AutoCAD sinh dãy đệm cho khối này chưa được công bố). ODA File Converter, ACadSharp, LibreDWG đều đọc được.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
