## DVDCAD 5.19.0 — Phông thay thế khi thiếu phông SHX (FONTALT), in thẳng máy in bằng nét vector, PDF trên trình duyệt có chữ thật

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.19.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.19.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý các hạn chế còn lại của 5.18.0.

- **Phông thay thế khi thiếu phông SHX** (biến `FONTALT`, như AutoCAD):
  - Bản vẽ dùng phông `.shx` mà máy chưa có thì chữ vẽ bằng phông nét đơn kèm theo DVDCAD (mã nguồn mở, LibreCAD), không còn đổi sang phông TrueType.
    - `txt` → standard; `simplex`, `romans`, `romand` → phông cùng tên; `isocp…` → iso; `italic` → italicc.
    - Phông khác theo `FONTALT` (mặc định `simplex.shx`).
  - Dấu tiếng Việt được ghép bằng nét đơn: sắc, huyền, hỏi, ngã, nặng, mũ, trăng, móc, đ.
  - Màn hình, in, PDF, `TXTEXP` đều theo nét của phông thay thế. Nạp phông `.shx` gốc bằng `SHXFONTS` thì dùng đúng phông gốc.
- **In thẳng ra máy in bằng nét vector**: `PLOT` → máy in Windows gửi đường nét và chữ, không còn là ảnh 300 dpi. Bản in sắc hơn, lệnh in nhẹ hơn.
- **PDF trên trình duyệt có chữ thật**: kèm phông Liberation Sans / Serif (cùng số đo với Arial / Times New Roman). Máy không cung cấp phông thì PDF nhúng các phông này, chữ tiếng Việt vẫn chọn / tìm / sao chép được.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.18.0, thêm: phông thay thế cho `.shx` chưa nạp (txt → standard, khác → simplex) có dấu tiếng Việt; phông Liberation có trong bản cài; bản in SVG vector.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.
- Bản in SVG được so với bản in ảnh: trùng khớp đường nét, chữ, chữ xoay, hatch, gradient, nét đứt.

### Giới hạn
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- Máy in đặt giảm màu (256 màu / đen trắng có dither trong **Thuộc tính…**) vẫn in ảnh như trước.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter. Không có ODA thì DVDCAD ghi DWG 2004. Định dạng này dùng mã hoá Reed–Solomon và nén riêng; chưa thư viện mã nguồn mở nào ghi được.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
