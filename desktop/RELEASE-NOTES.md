## DVDCAD 5.28.0 — Lưới và mặt 3D như AutoCAD: làm trơn, sửa lưới, SURF*, phân tích bề mặt

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.28.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.28.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Không gian **3D Modeling** có thêm hai thẻ ribbon **Mesh** và **Surface**, đủ các lệnh lưới, mặt và phân tích bề mặt của AutoCAD.

- **Làm trơn lưới**:
  - `MESHSMOOTH` đổi khối 3D / mặt thành lưới trơn.
  - `MESHSMOOTHMORE` / `MESHSMOOTHLESS` tăng / giảm độ trơn từng mức; lưới gốc được giữ nên giảm lại không mất hình.
  - `MESHREFINE` biến mặt đã làm trơn thành mặt sửa được.
  - `MESHCREASE` / `MESHUNCREASE` gấp cạnh để cạnh giữ sắc khi làm trơn.
- **Sửa lưới** (bấm lên mặt để chọn): `MESHEXTRUDE` đùn mặt, `MESHSPLIT` tách mặt, `MESHMERGE` gộp mặt, `MESHCOLLAPSE` thu mặt / cạnh, `MESHSPIN` đổi đường chéo, `MESHCAP` bịt lỗ. Lưới luôn giữ kín.
- **Tuỳ chọn**: `MESHOPTIONS` (mức trơn, giới hạn), `MESHPRIMITIVEOPTIONS` (số chia cạnh khối lưới). `MESH` tạo hộp lưới 3 × 3 × 3, làm trơn ra hộp bo tròn như AutoCAD.
- **Mặt**:
  - Tạo mặt: `SURFNETWORK` (qua lưới đường), `SURFBLEND` (chuyển tiếp liên tục tiếp tuyến), `SURFPATCH` (vá đường kín / lỗ), `SURFOFFSET` (mặt song song, cả hai phía, khối đặc).
  - Sửa mặt: `SURFEXTEND` (kéo dài), `SURFTRIM` / `SURFUNTRIM` (cắt bằng đường kín / trả lại), `SURFSCULPT` (ghép mặt kín thành khối).
  - Đường trên mặt: `SURFEXTRACTCURVE` (trích đường), `PROJECTGEOMETRY` (chiếu đường lên mặt), `OFFSETEDGE` (song song cạnh mặt).
- **Phân tích bề mặt** trong khung 3D: `ANALYSISZEBRA` (sọc ngựa vằn), `ANALYSISCURVATURE` (độ cong Gauss / trung bình), `ANALYSISDRAFT` (góc thoát khuôn), `ANALYSISOPTIONS`.
- Mức trơn, cạnh gấp, cờ "mặt" được lưu trong DXF / DWG, mở lại trong DVDCAD vẫn sửa tiếp được.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.27.0, thêm làm trơn lưới, đùn mặt kín, vá mặt, cắt lát mặt.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động (32 mục):
  - hộp lưới 3 × 3 kín, thể tích 1000;
  - làm trơn mức 1 / 2 (432 / 1728 tam giác), giảm về mức 0 đúng lồng;
  - gấp mọi cạnh giữ hộp sắc (thể tích 1000), bỏ gấp, làm mịn;
  - đùn ô mặt trên (thể tích +45), tách / thu mặt giữ lưới kín, xoay cạnh, gộp mặt, bịt lỗ;
  - DXF đọc lại giữ mức trơn và cờ mặt;
  - `SURFNETWORK`, `SURFOFFSET`, `SURFEXTEND`, `SURFTRIM` (khoét lỗ tròn) / `SURFUNTRIM`, `SURFPATCH`, `SURFBLEND`, `SURFEXTRACTCURVE`, `PROJECTGEOMETRY`, `SURFSCULPT` (thể tích 64), `OFFSETEDGE`;
  - zebra / độ cong / góc thoát khuôn bật / tắt trong khung 3D, không lỗi shader.
  - Các bộ kiểm thử của 5.24.0 → 5.27.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Còn khoảng 120 lệnh AutoCAD chưa có: kết xuất (render) nâng cao, đám mây điểm, nền DGN / DWF, NURBS (`CONVTONURBS`, `SURFFILLET`), đám mây và dịch vụ trực tuyến của Autodesk. COM khác (Word, Access, ADODB…) chưa có.
- Excel làm lại không tính công thức: công thức được ghi vào tệp, Excel tính khi mở.
- **Không chạy được `.fas` / `.vlx`**: đây là LISP đã biên dịch và mã hoá cho riêng AutoCAD, không có mã nguồn. Nhiều bộ tiện ích thương mại chỉ phát hành dạng này, kèm khoá bản quyền. Cần xin tác giả bản `.lsp` (hoặc bản dành cho DVDCAD).
- **Không chạy được `.dll` / `.arx` / `.dvb`**: đây là chương trình Windows (.NET, ObjectARX, VBA) chạy bên trong AutoCAD và gọi thẳng thư viện của Autodesk.
- **Chưa có DWF6 ePlot** (`.dwf`): không lấy được đặc tả WHIP / W2D, và không có bộ đọc chuẩn để kiểm chứng tệp ghi ra. Dùng DWFx thay.
- DWFx chưa thử bằng sản phẩm Autodesk (Design Review, Autodesk Viewer). Phần XPS đã kiểm bằng bộ đọc của Windows.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- Phông nét đơn thay thế giống kiểu phông AutoCAD nhưng bề rộng chữ có thể khác đôi chút. Muốn y hệt thì nạp phông `.shx` gốc (DVDCAD không kèm phông của Autodesk vì bản quyền).
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.
- Phông kèm theo: LibreCAD fonts (GPL v2+ / public domain), Liberation Fonts (SIL OFL 1.1). Giấy phép trong `vendor/lff/README.txt`, `vendor/fonts/OFL.txt`.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
