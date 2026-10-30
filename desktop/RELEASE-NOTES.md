## DVDCAD 5.23.0 — Độ trong suốt theo lớp, ETRANSMIT gói DWG, REVCLOUD Sửa, POLYSOLID Cung

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.23.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.23.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý các hạn chế còn ghi trong mục "Khác với AutoCAD" của hướng dẫn.

- **Độ trong suốt theo lớp** (như cột Transparency trong bảng Lớp của AutoCAD):
  - Bảng Lớp có cột **Độ trong suốt** (bấm để nhập 0–90). `-LAYER` có tuỳ chọn **Trong suốt**.
  - Đối tượng có độ trong suốt "ByLayer" lấy theo lớp.
  - **Đọc và ghi được trong DXF và DWG 2004 → 2018** theo đúng cách AutoCAD lưu, nên mở bản vẽ của AutoCAD cũng thấy được độ trong suốt của lớp.
  - Trạng thái lớp (`LAYERSTATE`) lưu cả độ trong suốt.
- **ETRANSMIT / ARCHIVE**:
  - Chọn định dạng bản vẽ trong gói: **DWG 2018 / 2013 / 2010 / 2007 / 2004 / 2000** hoặc DXF. Trước đây gói luôn dùng DXF.
  - Gói `.zip` được **nén**: bản vẽ mẫu từ 3 MB giảm còn khoảng 0,7 MB.
- **REVCLOUD › Sửa**: vẽ lại một đoạn mây như AutoCAD. Chọn mây, bấm điểm đầu trên mây, các điểm mới, rồi điểm cuối trên mây, sau đó chọn phía cần bỏ.
- **POLYSOLID** có tuỳ chọn **Cung** khi vẽ tường theo điểm:
  - Cung tiếp tuyến với đoạn trước, hoặc cung qua **Điểm thứ hai**.
  - **Đường thẳng** để quay lại vẽ đoạn thẳng.
- **EXTEND** kéo dài được đa tuyến có **đoạn đầu hoặc đoạn cuối là cung**: cung được kéo dài theo đúng đường tròn của nó tới ranh giới.
- Hướng dẫn: cập nhật các mục đã lỗi thời. Ví dụ, mục PLOT trước ghi chỉ có khổ A4 → A0, và DWG 2007 trước ghi là cần ODA.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.22.0, thêm hai phần mới:
     - Độ trong suốt lớp 40% ghi vào DXF, rồi ghi DWG 2018 và đọc lại vẫn đúng 40%.
     - ETRANSMIT tạo gói .zip đã nén, có bản vẽ DWG bên trong.
  2. **ODA File Converter** và **ACadSharp** đọc lại các file DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động:
  - Độ trong suốt lớp đọc lại đúng qua DXF và DWG 2018 / 2013 / 2010 / 2007 / 2004.
  - ETRANSMIT ra DWG 2018 (nén), DWG 2007 (không nén) và DXF; DWG trong gói mở lại đủ 9996 / 9996 đối tượng.
  - REVCLOUD Sửa thay đúng phía trên của mây; U trả lại mây cũ.
  - POLYSOLID có đoạn cung một phần tư đường tròn.
  - EXTEND cung đầu / cuối đa tuyến tới đúng giao điểm (71,414; −70).

### Giới hạn
- **Chưa có DWF6 ePlot** (`.dwf`): không lấy được đặc tả WHIP / W2D, và không có bộ đọc chuẩn để kiểm chứng tệp ghi ra. Dùng DWFx thay.
- DWFx chưa thử bằng sản phẩm Autodesk (Design Review, Autodesk Viewer). Phần XPS đã kiểm bằng bộ đọc của Windows.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
