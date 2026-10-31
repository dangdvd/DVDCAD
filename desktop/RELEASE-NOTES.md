## DVDCAD 5.27.0 — Express Tools đủ bộ, thư viện acet-* cho tiện ích LISP, bảng tra khối động

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.27.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.27.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này bổ sung các lệnh **Express Tools** còn thiếu và thư viện `acet-*` mà nhiều tiện ích LISP gọi tới.

- **Thẻ Express Tools** (`EXPRESSTOOLS`). Các lệnh mới:
  - **Thuộc tính khối**: `ATTOUT` xuất giá trị thuộc tính ra tệp văn bản (tab) để sửa bằng Excel; `ATTIN` nhập lại theo handle.
  - **Tô bằng khối**: `SUPERHATCH` lát một khối lặp lại trong vùng kín, chọn khoảng cách X / Y.
  - **Khối**: `BSCALE` đổi tỉ lệ từng khối quanh điểm chèn; `PSBSCALE` tỉ lệ khối theo khổ giấy; `BLOCKTOXREF` thay khối bằng tham chiếu ngoài; `SHP2BLK` đổi hình SHAPE thành khối.
  - **Chữ**: `RTEXT` / `RTEDIT` (chữ lấy từ tệp hoặc biểu thức DIESEL, tự cập nhật); `PSTSCALE` cao chữ đúng trên giấy; `QLATTACH` / `QLATTACHSET` / `QLDETACHSET` gắn / tách chữ với đường dẫn.
  - **Chọn và sửa**: `FASTSEL` chọn mọi đối tượng chạm vào đối tượng đã chọn; `BTRIM` / `BEXTEND` / `TREX`; `CLIPIT`.
  - **Tệp**: `PLT2DWG` nhập tệp in HPGL `.plt` thành nét; `MKSHAPE` tạo hình `.shp` từ nét đã vẽ; `REDIR` / `REDIRMODE` đổi đường dẫn; `REPURLS` thay địa chỉ siêu liên kết; `MOVEBAK`; `IMAGEAPP`.
  - **Khác**: `JULIAN`, `EDITTIME`, `LSP`, `LSPSURF`, `TFRAMES`, `EXPLAN`, `RTUCS`, `LAYOUTMERGE`.
- **Thư viện `acet-*`**: 116 hàm Express Tools, gọi giống AutoCAD. Gồm:
  - lỗi / biến hệ thống;
  - danh sách, chuỗi, tên tệp;
  - hình học, tập chọn (gộp / trừ / giao, kéo dời / xoay / tỉ lệ);
  - lớp, khối và thuộc tính, hộp thoại.
  
  Tiện ích viết cho AutoCAD có dùng Express Tools nay chạy được.
- **Soạn khối động**:
  - `BTABLE` / `BLOOKUPTABLE`: bảng tra giá trị tham số (Block Properties Table). Mỗi hàng là một bộ giá trị; bấm **Áp dụng** là bản chèn đổi theo.
  - `BAUTHORPALETTE`: bảng công cụ soạn khối.
  - `BACTION`, `BACTIONSET`, `BASSOCIATE`, `BTESTBLOCK`, `BCPARAMETER`, `BCONSTRUCTION`, `BWBLOCK`, `BXCLIP`, `BESETTINGS`… có lệnh như AutoCAD.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.26.0, thêm hàm `acet-*`, PLT2DWG và các lệnh Express mới.
  2. **ODA File Converter** và **ACadSharp** đọc lại các tệp DWG do DVDCAD ghi.
  3. Bộ đọc XPS của Windows mở tệp DWFx.
  4. Cài lặng bộ cài, chạy kiểm thử trên `DVDCAD.exe` đã cài, rồi gỡ cài.
- Kiểm thử giao diện tự động:
  - hàm `acet-str` / `list` / `filename` / `geom` / `ss`, `acet-error-init` trả lại biến hệ thống;
  - `FASTSEL` chọn đúng đối tượng chạm nhau; `RTEXT` với DIESEL;
  - `ATTOUT` → `ATTIN` cập nhật thuộc tính theo handle; `BSCALE`;
  - `PLT2DWG` đọc HPGL; `MKSHAPE` tạo và nạp hình;
  - `SUPERHATCH` lát đúng 16 khối trong khung 20 × 20; `BTABLE` thêm hàng và áp dụng giá trị tham số.
  - Các bộ kiểm thử LISP và cài đặt ứng dụng của 5.24.0 → 5.26.0 vẫn đạt đủ.

### Giới hạn
- **OpenDCL** (`dcl_…`, hộp thoại của thư viện OpenDCL) chưa có. Lệnh 3D nâng cao, kết xuất (render), đám mây và nền DGN / DWF / PDF của AutoCAD chưa có. COM khác (Word, Access, ADODB…) chưa có.
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
