## DVDCAD 5.11.0 — layout sửa được và lưu đúng vào DWG / DXF, DIESEL, nhập CUIX, thêm nhiều lệnh và hộp thoại như AutoCAD 2027

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.11.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.11.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
- **Layout và không gian giấy.**
  - Vẽ / sửa thẳng trên giấy của layout (ghi chú, khung, ký hiệu); khung nhìn dời / kéo / xoá / sao chép như đối tượng; **CHSPACE** chuyển đối tượng giữa giấy và Model đúng tỉ lệ.
  - Layout đọc từ tệp DWG / DXF giờ **sửa được**: chỉ cần vẽ hoặc sửa, layout tự chuyển và giữ nguyên đối tượng giấy, khung nhìn của tệp. Chuột phải vào tab: Chuyển thành layout sửa được, Khôi phục layout gốc, Xoá layout.
  - Mở DXF có đủ các tab layout; đối tượng giấy không còn lẫn vào Model (cả DXF và DWG).
  - **Lưu DXF / DWG ghi layout thật**: khổ giấy, khung nhìn VIEWPORT theo tỉ lệ, khung tên và mọi đối tượng giấy. AutoCAD mở ra thấy đúng các tab layout; DVDCAD mở lại vẫn sửa tiếp được.
  - **EXPORTLAYOUT** xuất layout ra Model, cắt mọi đối tượng theo khung nhìn (kể cả ảnh và khối 3D).
- **Tuỳ biến giao diện (CUI).**
  - Lệnh tự tạo bằng macro, thanh truy cập nhanh, tab ribbon riêng, phím tắt, thao tác nhấp đúp.
  - **Nhập .cuix / .cui của AutoCAD** (CUIIMPORT, CUILOAD): macro, thanh công cụ, phím tắt, nhấp đúp.
  - **DIESEL** đủ hàm, **MODEMACRO** trên thanh trạng thái, macro `$M=`.
- **In.**
  - Bảng kiểu in .ctb đủ thuộc tính: kiểu nét in (có **thích ứng**), đầu / nối nét (có **hình thoi**), kiểu tô, chuyển xám, bảng bề rộng nét; Plot Style Table Editor và STYLESMANAGER như AutoCAD.
  - **PLOTSTAMP** (dấu in), in lộn ngược.
- **Lệnh và hộp thoại mới như AutoCAD 2027.**
  - Chữ: soạn MTEXT / TEXT ngay trên bản vẽ với tab **Text Editor**, đậm / nghiêng / gạch chân theo phần chữ, **trường (FIELD)**, **cột**.
  - Bảng: **TABLESTYLE**, Insert Table, viền đôi, **TINSERT** (khối trong ô).
  - Hatch đủ tuỳ chọn (mẫu tự định nghĩa, gốc mẫu, liên kết, thứ tự vẽ, dựng lại biên), Gradient 9 kiểu.
  - **STANDARDS / CHECKSTANDARDS** (đọc được cả .dws / .dwg nhị phân), LAYTRANS, LAYWALK.
  - **COUNT**, **BREPLACE**, **ADDSELECTED**, Action Recorder, HYPERLINK, SYSVDLG, SCALELISTEDIT, UCSMAN, BATTMAN, MLSTYLE (.mln), Visual Styles Manager có kiểu riêng.
  - **GEOGRAPHICLOCATION** (vị trí địa lý cho mặt trời / bóng đổ 3D), **MSLIDE / VSLIDE / SLIDELIB** (.sld / .slb như AutoCAD).
  - Dấu tâm / đường tâm liên kết, mảng có tab **Array Creation**, hộp **Select Color**.

### Kiểm thử
- Bộ kiểm thử trình duyệt cho từng nhóm lệnh: layout giấy, layout của tệp, ghi / đọc layout DXF + DWG, CHSPACE, EXPORTLAYOUT, kiểu in, CUI / CUIX, DIESEL, hatch, bảng, chuẩn CAD, slide, vị trí địa lý.
- DWG ghi ra được LibreDWG (dwgread) đọc lại không lỗi; vòng mở → lưu DWG → mở lại giống hệt từng đối tượng.
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh: mở DWG / DXF, hộp thoại Mở / Lưu, trang Start, lệnh tắt, dòng lệnh, lưu DWG gốc và mở lại.
  2. ODA File Converter đọc + audit lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.

### Giới hạn
- Khối động lưu ra thành khối thường ở trạng thái đang hiện (AutoCAD chưa đổi được tham số khối động do DVDCAD tạo).
- Lưu DWG gốc là DWG 2000; khung nhìn chưa ghi lớp đóng băng riêng (VPLAYER) và đường cắt đa giác (VPCLIP) vào tệp.
- EXPORTLAYOUT giữ chữ nguyên (lấy theo điểm đặt), khối 3D xuất theo hình chiếu bằng.
- Nhập CUIX lấy macro, thanh công cụ, phím tắt, nhấp đúp; chưa lấy menu, ribbon và hình nút của AutoCAD.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
