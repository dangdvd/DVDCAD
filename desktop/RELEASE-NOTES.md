## DVDCAD 5.14.0 — lật / kéo giãn có grip trong AutoCAD, ảnh hiện trong AutoCAD, in bản đồ nền, độ sâu màu cho máy in Windows

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.14.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.14.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Khối động: lật và kéo giãn là tham số thật của AutoCAD** (DXF / DWG 2018).
  - Lật (`BPARAMETER` → Lật) ghi thành 2 tham số lật *Flip state1* (ngang) và *Flip state2* (dọc), có grip mũi tên.
  - Kéo giãn ghi thành tham số tuyến tính có grip ở điểm cuối và hành động kéo giãn như trong DVDCAD.
  - AutoCAD mở ra bấm vào bản chèn là kéo / lật được; bảng Properties hiện đủ tham số.
- **Mở DWG của AutoCAD có khối động**:
  - Bản chèn hiện tên khối gốc thay cho `*U…`.
  - Đổi được trạng thái hiển thị (bảng Thuộc tính hoặc `BDYN`), cả khối lồng trong từng trạng thái.
- **Ảnh hiện trong AutoCAD**: ảnh (IMAGEATTACH, GEOMAPIMAGE…) lưu thành IMAGE thật kèm tệp ảnh cạnh bản vẽ.
  - Giữ góc xoay, độ đậm, khung cắt (`IMAGECLIP`).
  - Lưu bản vẽ là DVDCAD ghi luôn tệp ảnh vào cùng thư mục. `ETRANSMIT` đóng gói bản vẽ và tệp ảnh.
  - Mở bản vẽ AutoCAD có ảnh: DVDCAD hiện ảnh thật, đọc tệp ảnh trong thư mục bản vẽ.
- **In bản đồ nền**: bản đồ đang hiện (`GEOMAP`) được in luôn khi PLOT ra PDF, PNG hoặc máy in. Không cần chụp bằng GEOMAPIMAGE trước.
- **Máy in Windows có độ sâu màu**: hộp PLOT → nút **Thuộc tính…** cạnh máy in → 24-bit / 256 màu / đen trắng, dither theo bảng kiểu in .ctb như khi in PDF / PNG.
- **DWG 2007 không có ODA File Converter**: DVDCAD ghi DWG 2004 — AutoCAD 2007, 2008, 2009 mở thẳng. Trước đây ghi DWG 2018 nên AutoCAD 2007 không mở được.

### Kiểm thử
- Bộ kiểm thử trình duyệt cho từng nhóm lệnh, thêm:
  - Khối động lật / kéo giãn: lưu rồi mở lại qua DXF và DWG 5 phiên bản; bản chèn đang lật bỏ lật, kéo giãn, lật lại đúng chỗ.
  - Ảnh: lưu / mở lại qua DXF và DWG 5 phiên bản (vị trí, cỡ, góc, độ đậm, khung cắt); mở ảnh trong tệp mẫu của AutoCAD.
  - PLOT có bản đồ nền; máy in Windows đen trắng / 256 màu.
- DWG ghi ra: LibreDWG và ACadSharp đọc không lỗi, nhận đúng tham số lật, tham số tuyến tính, hành động kéo giãn / lật, IMAGE và IMAGEDEF.
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh: mở DWG / DXF, hộp thoại Mở / Lưu, trang Start, lệnh tắt, dòng lệnh, lưu DWG gốc 5 phiên bản (có khối động đang lật, ảnh) và mở lại; lưu bản vẽ có ảnh ghi kèm tệp ảnh; mở DXF có IMAGE đọc tệp ảnh trong thư mục.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter: vỏ tệp 2007 dùng mã kiểm tra chưa có tài liệu công khai. Không có ODA thì DVDCAD ghi DWG 2004 (AutoCAD 2007 → 2027 đều mở). AutoCAD 2017 trở về trước không mở được DWG 2018 — chọn DWG 2013 trong `DWGSERVER`.
- Khối động do AutoCAD tạo: DVDCAD đổi được trạng thái hiển thị; lật / kéo giãn của các khối đó chỉ đổi trong AutoCAD (DVDCAD hiện đúng hình đang lưu).
- Bản web không ghi được tệp ảnh cạnh bản vẽ — dùng `ETRANSMIT` để có gói bản vẽ + ảnh.
- In bản đồ nền cần mạng (OpenStreetMap hoặc dịch vụ riêng GEOMAPURL). Dùng OpenStreetMap theo điều khoản sử dụng của OSM.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
