## DVDCAD 5.14.1 — nút tải ODA File Converter trong DWGSERVER

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.14.1.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.14.1-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **`DWGSERVER` → Tải ODA File Converter**: mở trang tải chính thức của ODA trong trình duyệt. ODA File Converter miễn phí, cài riêng, không đóng gói kèm DVDCAD.
  - Cài xong quay lại cửa sổ DVDCAD: hộp `DWGSERVER` tự dò lại và hiện **✓ Đã tìm thấy**. Nút **Tìm lại** dò ngay; **Chọn…** nếu cài ODA ở chỗ khác ngoài `C:\Program Files\ODA`.
  - Chỉ cần ODA cho **DWG 2007** thật. DWG 2018 / 2013 / 2010 / 2004 / 2000 DVDCAD vẫn tự ghi, không cần ODA.
- Lưu DWG 2007 khi chưa có ODA: thông báo chỉ tới nút tải trong `DWGSERVER` (DVDCAD vẫn tự ghi DWG 2004 để AutoCAD 2007, 2008, 2009 mở được).

Các tính năng của 5.14.0 (lật / kéo giãn có grip trong AutoCAD, ảnh hiện trong AutoCAD, in bản đồ nền, độ sâu màu cho máy in Windows) giữ nguyên.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.14.0, thêm: `DWGSERVER` có nút *Tải ODA File Converter* và *Tìm lại*; nút tải mở đúng trang của ODA bằng trình duyệt ngoài; *Tìm lại* hiện đúng trạng thái ODA trên máy.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter: vỏ tệp 2007 dùng mã kiểm tra chưa có tài liệu công khai. Không có ODA thì DVDCAD ghi DWG 2004 (AutoCAD 2007 → 2027 đều mở). AutoCAD 2017 trở về trước không mở được DWG 2018 — chọn DWG 2013 trong `DWGSERVER`.
- Nút tải cần mạng để mở trang của ODA; chuyển đổi bằng ODA sau khi cài thì chạy trên máy, không cần mạng. ODA File Converter dùng theo điều khoản của Open Design Alliance.
- Khối động do AutoCAD tạo: DVDCAD đổi được trạng thái hiển thị; lật / kéo giãn của các khối đó chỉ đổi trong AutoCAD (DVDCAD hiện đúng hình đang lưu).
- Bản web không ghi được tệp ảnh cạnh bản vẽ — dùng `ETRANSMIT` để có gói bản vẽ + ảnh.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
