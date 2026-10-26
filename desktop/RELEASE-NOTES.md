## DVDCAD 5.13.0 — lưu DWG gốc 2004 → 2018, vị trí địa lý GEODATA, in bản đồ nền, độ sâu màu + dither khi in, khối động như AutoCAD

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.13.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.13.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Lưu DWG gốc 2018 / 2013 / 2010 / 2004 / 2000**, không cần ODA File Converter.
  - `SAVEDWG` và `SAVEAS` *.dwg* mặc định ghi **DWG 2018**; chọn phiên bản khác trong `DWGSERVER`.
  - Tệp ghi ra được mở lại không lỗi bằng LibreDWG, ODA File Converter (audit) và ACadSharp.
- **Vị trí địa lý lưu thành đối tượng GEODATA** (DXF / DWG 2010 trở lên): AutoCAD mở ra thấy đúng vị trí, hướng bắc, điểm tham chiếu.
- **In được bản đồ nền**: lệnh **GEOMAPIMAGE** chụp bản đồ nền thành ảnh trong bản vẽ.
  - Chọn vùng (hoặc cả khung nhìn) và độ phân giải Thô / Tối ưu / Mịn / Rất mịn.
  - **GEOMAPIMAGEUPDATE** chụp lại ảnh theo bản đồ hiện tại.
  - Ảnh lưu kèm DXF / DWG, mở lại còn nguyên.
- **Dither có tác dụng khi in PNG / PDF**: hộp PLOT → nút **Thuộc tính…** cạnh máy in → *Độ sâu màu*.
  - Chọn 24-bit (mặc định), 256 màu (bảng màu AutoCAD) hoặc Đen trắng.
  - Khi giảm màu, mục *Bật dither* của từng màu trong bảng kiểu in .ctb quyết định: bật thì giả màu bằng chấm, tắt thì lấy màu gần nhất.
  - PNG ghi đúng ảnh bảng màu 8-bit / 1-bit. Nét mảnh vẫn liền nét.
- **Khối động lưu như AutoCAD** (DXF và DWG): mỗi bản chèn là một khối `*U` trỏ về khối gốc, như cách AutoCAD lưu.
  - Bản 2018: trạng thái hiển thị (`BPARAMETER` → Hiển thị) là **khối động thật trong AutoCAD**, có grip đổi trạng thái.
  - Kéo giãn / lật: AutoCAD thấy đúng hình đang hiện.
- **Mở khối động của AutoCAD**:
  - Bản chèn hiện tên khối gốc thay cho `*U12`.
  - Với DXF: đổi được trạng thái hiển thị bằng bảng Thuộc tính hoặc `BDYN`.
  - Nét của trạng thái đang ẩn không còn vẽ chồng lên nhau (cả DXF và DWG).

### Sửa lỗi
- Khối động lưu DXF bị tách thành nét rời, và nét của trạng thái đang ẩn bị mất sau khi lưu. Giờ mở lại vẫn đổi trạng thái được.
- Nét ẩn (cờ *invisible*) trong tệp của AutoCAD bị hiện ra.
- SOLID 2D khi in chỉ tô mờ 20%; giờ in đặc như AutoCAD.

### Kiểm thử
- Bộ kiểm thử trình duyệt cho từng nhóm lệnh, thêm:
  - GEODATA qua DXF / DWG, GEOMAPIMAGE (máy chủ ô bản đồ giả lập).
  - Độ sâu màu + dither (tỉ lệ chấm, màu tắt dither, PNG 1-bit / 8-bit).
  - Khối động: lưu / mở lại qua DXF và DWG 5 phiên bản; mở tệp mẫu của AutoCAD rồi lưu lại.
- DWG ghi ra:
  - Mở lại trong DVDCAD giống hệt từng đối tượng (9 tệp mẫu, tới 76 nghìn đối tượng, đủ 5 phiên bản).
  - LibreDWG đọc không lỗi.
  - ACadSharp đọc không lỗi và nhận ra khối động (tham số hiển thị, trạng thái, liên kết `*U` → khối gốc).
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh: mở DWG / DXF, hộp thoại Mở / Lưu, trang Start, lệnh tắt, dòng lệnh, lưu DWG gốc 5 phiên bản (có khối động) và mở lại.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- DWG 2007 vẫn cần ODA File Converter (không có ODA thì DVDCAD tự ghi DWG 2018). AutoCAD 2017 trở về trước không mở được DWG 2018 — chọn DWG 2013 trong `DWGSERVER`.
- Khối động:
  - Trong AutoCAD, chỉ tham số hiển thị đổi được. Kéo giãn và lật hiện đúng hình đang lưu nhưng chưa có grip trong AutoCAD; vẫn đổi được trong DVDCAD.
  - Khối động trong tệp **DWG** của AutoCAD hiện đúng trạng thái đang lưu nhưng tên là `*U…` và chưa đổi được trạng thái (tệp DXF thì được).
- Bản đồ nền đang hiện (GEOMAP) không in trực tiếp; dùng GEOMAPIMAGE để có ảnh in được. Dùng OpenStreetMap theo điều khoản sử dụng của OSM.
- Ảnh (IMAGEATTACH, GEOMAPIMAGE) lưu kèm tệp để DVDCAD mở lại; AutoCAD thấy khung ảnh.
- Độ sâu màu và dither áp dụng cho PNG / PDF; máy in Windows nhận ảnh màu đầy đủ.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
