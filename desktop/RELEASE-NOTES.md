## DVDCAD 5.9.0 — bản Windows đầu tiên

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.9.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.9.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Windows SmartScreen có thể cảnh báo vì file chưa ký số: bấm **More info → Run anyway**.

### Có gì mới
- **Chạy offline trên Windows.**
  - Mở bằng hộp thoại *Select File* (Ctrl+O, chọn nhiều file thành nhiều tab), hoặc kéo thả file vào cửa sổ.
  - Ctrl+S ghi đè đúng file đã lưu.
  - Chỉ có một cửa sổ: file mở thêm từ Explorer thành tab mới.
- **Tab Start** kiểu AutoCAD:
  - Bản vẽ mới theo mẫu mm / m / inch.
  - Bản vẽ gần đây có ảnh thu nhỏ, tìm theo tên, ghim.
- **Lệnh tắt giống `acad.pgp`:**
  - 207 lệnh tắt chuẩn của AutoCAD, như `L`, `C`, `CO`, `TR`, `PA`, `REA`, `EXP`.
  - Thay đổi so với bản trước: `DO` = DONUT (đo nhanh nay là `QM`), `T` = MTEXT (chữ một dòng là `DT`).
- **Phục hồi các lệnh trước đây không chạy:**
  - Thứ tự vẽ: `DRAWORDER`, `TEXTTOFRONT`, `HATCHTOBACK`.
  - Vùng che: `WIPEOUT`.
  - Chú thích theo tỉ lệ: `CANNOSCALE` (ô ▲ 1:N ở thanh trạng thái), `ANNOTATIVE`.
  - Ràng buộc hình học `GC*`.
  - Ràng buộc kích thước `DC*`, có biểu thức: `d1*2`.
  - `AUTOCONSTRAIN`, `PARAMETERS`.
  - Khối động: `BPARAMETER`, `BDYN`.
- **Lưu DWG trên máy** (`SAVEDWG`): nếu đã cài ODA File Converter (miễn phí), DVDCAD tự chuyển sang DWG mà không cần mạng.
- **Biểu tượng:**
  - Mọi lệnh đều có biểu tượng tự vẽ theo quy ước quen thuộc của CAD.
  - Danh sách gợi ý khi gõ lệnh có biểu tượng như AutoComplete.

### Kiểm thử
GitHub Actions chạy trên Windows:
1. Cài lặng bộ cài.
2. Kiểm tra file, gắn .dwg / .dxf, lối tắt.
3. Chạy kiểm thử trên chính `DVDCAD.exe` đã cài: mở DWG / DXF, hộp thoại Mở / Lưu, trang Start, lệnh tắt, lưu DWG.
4. Gỡ cài.

### Giới hạn
- Lưu DXF 2018 trong app. Muốn có .dwg cần ODA File Converter, hoặc máy chủ `server-dwg.js`.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
