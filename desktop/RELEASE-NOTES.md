## DVDCAD 5.22.0 — Xuất DWFx (XPS) như AutoCAD, thêm thuộc tính cho máy in Windows

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.22.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.22.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý các hạn chế còn lại của 5.21.0.

- **DWFx ePlot (XPS Compatible).pc3** trong hộp `PLOT`:
  - Ghi tệp `.dwfx` dạng vector: đường nét, vùng tô, gradient, ảnh.
  - Chữ dùng **phông TrueType nhúng sẵn trong tệp**: chọn và tìm được chữ, đủ dấu tiếng Việt, phóng to vẫn sắc nét.
  - Tệp gồm phần XPS (mở bằng trình xem XPS của Windows) và phần mô tả DWF (danh sách trang, khổ giấy mm) như tệp DWFx của AutoCAD.
  - `PUBLISH` có thêm **Xuất ra: DWFx**: mỗi layout một trang, chung một tệp.
- **Thuộc tính… của máy in Windows**: chọn máy in đã cài trong `PLOT` rồi bấm **Thuộc tính…**. Ngoài độ sâu màu, nay có thêm:
  - **In màu** hoặc **Đen trắng**.
  - **In hai mặt** (lật cạnh dài hoặc cạnh ngắn).
  - **Độ phân giải** 300 / 600 / 1200 dpi.
  - **Xếp bộ** khi in nhiều bản.
  - Các tuỳ chọn này gửi kèm lệnh in thẳng ra máy in.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.21.0, thêm phần DWFx: tạo gói OPC / XPS và kiểm tra chữ được nhúng phông, không bị chuyển thành ảnh.
  2. **Bộ đọc XPS của Windows** (.NET `XpsDocument` / WPF) mở tệp DWFx do DVDCAD ghi: phân trang, nạp phông nhúng của từng đoạn chữ, vẽ trang ra ảnh.
  3. **ODA File Converter** và **ACadSharp** đọc lại các file DWG (2018 / 2013 / 2010 / 2007 / 2004 / 2000) do DVDCAD ghi.
  4. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, rồi gỡ cài.
- Thử giao diện bằng trình duyệt tự động:
  - Tệp DWFx từ `PLOT` và `PUBLISH` mở được bằng MuPDF.
  - Đúng khổ A3 / A4, nhiều trang.
  - Chữ tiếng Việt đọc ra đúng, không có ảnh raster.
  - Với máy in Windows giả lập: lệnh in nhận đúng màu, chế độ hai mặt, dpi và xếp bộ.

### Giới hạn
- **DWFx chưa thử bằng sản phẩm Autodesk** (Design Review, Autodesk Viewer, AutoCAD). Phần XPS đã kiểm bằng bộ đọc của Windows. Phần mô tả DWF viết theo cấu trúc tệp DWFx của AutoCAD, nhưng Autodesk chưa công bố đặc tả đầy đủ.
- **Chưa có DWF6 ePlot** (`.dwf`, luồng W2D): chưa có bộ đọc chuẩn để kiểm chứng tệp ghi ra. Dùng DWFx thay.
- Khay giấy và các tuỳ chọn riêng khác của trình điều khiển máy in chỉnh trong **Máy in Windows (hộp in hệ thống)**.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
