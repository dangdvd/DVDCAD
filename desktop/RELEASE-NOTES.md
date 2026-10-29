## DVDCAD 5.15.0 — Smart Blocks, hình chiếu từ mô hình 3D, đa tuyến 3D, đổi DWG hàng loạt

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.15.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.15.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Khoảng 50 lệnh mới giống AutoCAD 2027. Ribbon có thêm tab **Bố cục** (*Layout*).

- **Smart Blocks** — `BCONVERT`:
  - Chọn một khối làm mẫu. DVDCAD tìm các nhóm nét rời có cùng hình, kể cả bản đã xoay hoặc khác tỉ lệ.
  - Chọn trong danh sách những vị trí cần đổi, rồi đổi chúng thành bản chèn khối.
  - `SMARTBLOCKSDETECT` chỉ tìm và chọn, không đổi.
  - `COUNTNEXT` / `COUNTPREV` / `COUNTREFRESH` dùng cho bảng đếm khối.
- **Hình chiếu từ mô hình 3D** (tab Bố cục):
  - `VIEWBASE`: hình chiếu cơ sở và các hình chiếu phụ. Có nét khuất; chọn góc chiếu thứ nhất (TCVN / ISO) hoặc thứ ba.
  - `VIEWSECTION`: mặt cắt có gạch vật liệu và nhãn **MẶT CẮT A-A**.
  - `VIEWDETAIL`: hình trích tròn hoặc chữ nhật, nhãn **TỈ LỆ 2 : 1**.
  - `VIEWUPDATE` dựng lại các hình chiếu sau khi sửa khối 3D.
  - Sửa và định kiểu hình chiếu: `VIEWEDIT`, `VIEWSTD`, `VIEWSECTIONSTYLE`, `VIEWDETAILSTYLE`.
- **Ràng buộc**:
  - `GCSYMMETRIC`: ràng buộc đối xứng.
  - `DCCONVERT`: đổi kích thước thường thành ràng buộc kích thước.
  - `DCDISPLAY`: hiện / ẩn ràng buộc kích thước.
  - `DCFORM`: chọn dạng động hoặc dạng chú thích. Dạng chú thích in ra được.
  - `CONSTRAINTSETTINGS`: hộp cài đặt ràng buộc.
- **Điểm đánh dấu vị trí**: `GEOMARKPOINT`, `GEOMARKLATLONG`, `GEOMARKME`, `GEOLOCATEME`, `GEOREORIENTMARKER`.
- **3D**:
  - `3DPOLY`: đa tuyến 3D. Lưu thành POLYLINE 3D thật trong DXF / DWG.
  - `PFACE`, `3DMESH`: lưới 3D.
  - `EDGE`: ẩn / hiện cạnh của mặt 3D.
- **Shape**:
  - `LOAD`: nạp tệp hình `.shx`.
  - `COMPILE`: dịch `.shp` thành `.shx`.
  - `SHAPE`: chèn hình.
  - Mở DXF có SHAPE: hình hiện ra sau khi `LOAD` tệp hình tương ứng.
- **Xuất file**:
  - `PSOUT`: xuất `.eps`.
  - `WMFOUT`: xuất `.wmf`.
  - `PUBLISHTOWEB`: tạo trang web gồm `index.html` và ảnh các layout.
  - `DWGCONVERT`: đổi hàng loạt DWG / DXF sang DWG 2018 / 2013 / 2010 / 2004 / 2000 hoặc DXF, tải về một `.zip`. Bản vẽ đang mở không bị ảnh hưởng.
- **Khối động**: `BVSTATE` (hộp *Trạng thái hiển thị*), `BVSHOW`, `BVHIDE`.
- **Lệnh nhỏ khác**:
  - Khối: `REFSET`, `ATTREDEF`.
  - Bản vẽ: `CLOSEALLOTHER`, `PARTIALOPEN` / `PARTIALOAD`, `UPDATETHUMBSNOW`.
  - In: `PSETUPIN`; hộp `PLOT` có thêm thiết lập trang có tên (nút Thêm… / Nhập…); `PLOTTERMANAGER`.
  - Hệ thống: `SYSVARMONITOR`, `QUICKPROPERTIES` (`QPMODE`).
  - Bố cục: `MVSETUP` (khung bản vẽ + khung tên A0–A4).
- **Sửa lỗi**:
  - Mở DWG 2000 do AutoCAD lưu: đa tuyến 3D không còn mất đỉnh cuối.
  - Chọn mặt 3D (3DFACE) bằng chuột nay đúng theo các cạnh của mặt.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.14.1, thêm các mục sau:
     - Có đủ lệnh v5v.
     - Bản vẽ tổng hợp có đa tuyến 3D và mặt 3D có cạnh ẩn, lưu DWG 2018 / 2013 / 2010 / 2004 / 2000 rồi mở lại giống hệt.
     - `DWGCONVERT` đổi tệp trong khung ẩn, bản vẽ đang mở giữ nguyên.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi (có cả đa tuyến 3D).
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- Chưa có: `SYSWINDOWS`, `ALIGNSPACE`, `GCSMOOTH`, `WMFIN`.
- Mặt cắt `VIEWSECTION` mới có loại toàn phần (chưa có nửa / bậc / xoay).
- Hình chiếu lưu cùng bản vẽ dạng nét thường. AutoCAD mở thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình.
- `LOAD` chỉ nạp tệp hình. Phông chữ SHX chưa dùng được cho chữ.
- `PSETUPIN` đọc DXF (của AutoCAD hoặc DVDCAD) và DWG do DVDCAD lưu. Với DWG do AutoCAD lưu: lưu thành DXF trong AutoCAD trước.
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter. Không có ODA thì DVDCAD ghi DWG 2004.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
