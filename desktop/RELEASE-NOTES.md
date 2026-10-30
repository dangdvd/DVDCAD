## DVDCAD 5.18.0 — In ra PDF vector (DWG To PDF), hộp PLOT đủ máy in / khổ giấy / tuỳ chọn như AutoCAD

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.18.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.18.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **PDF vector khi in** (`PLOT` → DWG To PDF.pc3, và `PUBLISH`). Trước đây PDF là ảnh chụp nên phóng to bị nhòe; nay:
  - Đường, cung, hatch, vùng tô, gradient, nét đứt, bề rộng nét đều là nét vector. Phóng to bao nhiêu cũng sắc nét, tệp nhỏ hơn.
  - Chữ là chữ thật: nhúng phông của Windows (Arial, Times New Roman…), đủ dấu tiếng Việt; chọn, tìm, sao chép được trong trình đọc PDF.
  - Chữ phông SHX in bằng nét của phông. Chữ rất nhỏ vẫn in thành chữ đọc được khi phóng to.
  - Ảnh, layout và khung nhìn (cả khung nhìn xoay, đa giác cắt), dấu in, in lộn ngược đều như bản in trước.
- **Hộp `PLOT` đủ như AutoCAD**:
  - Máy in / máy vẽ: DWG To PDF.pc3, AutoCAD PDF (High Quality Print).pc3, AutoCAD PDF (Smallest File).pc3, máy in Windows, PublishToWeb PNG.pc3, PublishToWeb JPG.pc3, HP DesignJet (HPGL/2).pc3.
  - Khổ giấy: ISO A0–A5, ANSI A–E, ARCH A–E1 và **khổ tự chọn** (rộng × cao, mm).
  - Các tuỳ chọn trước đây bị khoá nay dùng được:
    - **In ra file**: máy in Windows ghi ra tệp PDF.
    - **In độ trong suốt**.
    - **In theo kiểu in**: tắt thì in đúng màu bản vẽ.
    - **Co giãn bề rộng nét**.
    - **Áp cho layout**: lưu thiết lập in cho Model / layout, mở PLOT lần sau tự dùng lại.
  - Thiết lập trang có tên lưu vào DWG / DXF đúng tên khổ và tên máy in của AutoCAD.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.17.0, thêm: đọc phông Arial của Windows; PLOT DWG To PDF ra PDF vector, chữ tiếng Việt nhúng phông; hộp PLOT đủ 7 máy in.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.
- PDF vector đã kiểm bằng Poppler (`pdfinfo`, `pdftotext`, `pdfimages`, `pdftoppm`):
  - Đúng khổ giấy, chữ trích ra được, không có ảnh raster.
  - So từng vùng với bản in ảnh: trùng vị trí đường nét, chữ, canh lề, chữ xoay, hatch, gradient, ảnh.

### Giới hạn
- In thẳng ra máy in Windows vẫn gửi ảnh 300 dpi (đủ nét trên giấy). Muốn tệp vector thì chọn DWG To PDF hoặc **In ra file**.
- Bản chạy trên trình duyệt (không phải bản Windows) không đọc được phông của máy: chữ trong PDF thành ảnh nét mịn, phần còn lại vẫn vector.
- DVDCAD không kèm phông SHX của AutoCAD (thuộc bản quyền của Autodesk); bạn nạp phông có sẵn trên máy.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter. Không có ODA thì DVDCAD ghi DWG 2004.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
