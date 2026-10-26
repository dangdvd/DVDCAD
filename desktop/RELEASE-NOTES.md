## DVDCAD 5.12.0 — sửa hộp STYLE New bị che, VPLAYER / VPCLIP lưu vào tệp, TXTEXP, thanh menu cổ điển, nhập menu / ribbon CUIX, bản đồ nền, máy vẽ HPGL/2

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.12.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.12.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Sửa lỗi
- **STYLE → New…**: hộp nhập tên kiểu chữ mới hiện trên cùng, không còn bị hộp Text Style che. Mọi hộp hỏi tên / nhập chữ mở từ một hộp thoại khác cũng vậy.

### Có gì mới
- **Khung nhìn layout lưu đủ vào tệp.**
  - Lớp đóng băng riêng từng khung nhìn (**VPLAYER**) và đường cắt đa giác (**VPCLIP**) ghi vào DXF và DWG; AutoCAD mở ra thấy đúng.
  - Mở tệp của AutoCAD cũng đọc được hai thông tin này. Layout của tệp hiện khung của từng khung nhìn.
- **Chữ → đường bao.**
  - **TXTEXP** (Express Tools): nổ chữ thành đa tuyến đường bao, đủ dấu tiếng Việt, chữ xoay, phông TrueType.
  - **EXPORTLAYOUT** cắt đúng chữ nằm vắt ngang khung nhìn.
  - **MSLIDE** ghi cạnh chữ thành vector.
- **Thanh menu cổ điển** (**MENUBAR** = 1): Tệp, Sửa, Xem, Chèn, Định dạng, Công cụ, Vẽ, Kích thước, Hiệu chỉnh, Tham số, Cửa sổ, Trợ giúp như AutoCAD.
- **Nhập tệp CUI của AutoCAD (.cuix / .cui)** lấy thêm menu (có menu con), ribbon (tab → bảng → nút lớn / nhỏ) và hình nút trong gói.
- **Vị trí địa lý.**
  - Mở DXF có **GEODATA** của AutoCAD: lấy đủ điểm thiết kế, điểm tham chiếu, hướng bắc; hệ toạ độ địa lý hoặc **UTM** (vd VN-2000 UTM 48N) tự đổi ra vĩ độ / kinh độ.
  - **GEOMAP**: bản đồ nền dưới bản vẽ — Đường (OpenStreetMap, cần mạng), Ảnh vệ tinh (dịch vụ ô bản đồ riêng qua biến GEOMAPURL), Tắt.
- **Máy vẽ HPGL/2**: hộp PLOT → *HP DesignJet (HPGL/2).pc3* in ra tệp **.plt**.
  - Chọn bút theo bảng kiểu in: bút vật lý, rồi bút ảo, rồi số màu.
  - Bề rộng nét, màu bút, kiểu nét, hatch, vùng tô và chữ (đa giác tô), cắt theo vùng in.

### Kiểm thử
- Bộ kiểm thử trình duyệt cho từng nhóm lệnh, thêm: hộp hỏi tên trên cùng, VPLAYER / VPCLIP qua DXF và DWG, TXTEXP / EXPORTLAYOUT cắt chữ / MSLIDE, thanh menu + CUIX (menu, ribbon, hình nút), GEODATA (LL84, UTM) + GEOMAP (máy chủ ô bản đồ giả lập), HPGL/2.
- DWG ghi ra được LibreDWG (dwgread) đọc lại không lỗi, kể cả khung nhìn có lớp đóng băng và đường cắt.
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh: mở DWG / DXF, hộp thoại Mở / Lưu, trang Start, lệnh tắt, dòng lệnh, lưu DWG gốc và mở lại.
  2. ODA File Converter đọc + audit lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- Lưu DWG gốc là DWG 2000 (mọi bản AutoCAD từ 2000 trở đi đều mở được); cần DWG 2004 → 2018 thì dùng ODA File Converter qua `DWGSERVER`.
- Vị trí địa lý khi lưu DXF ghi bằng biến $LATITUDE / $LONGITUDE / $NORTHDIRECTION / $TIMEZONE (AutoCAD đọc được), chưa ghi đối tượng GEODATA.
- Bản đồ nền không in; dùng OpenStreetMap theo điều khoản sử dụng của OSM (có ghi chú bản quyền trên màn hình).
- Dither không có tác dụng với PDF / PNG / máy in Windows (AutoCAD cũng vậy); số bút / bút ảo có tác dụng khi in ra HPGL/2.
- Khối động lưu ra thành khối thường ở trạng thái đang hiện.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
