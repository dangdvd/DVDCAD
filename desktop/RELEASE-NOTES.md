## DVDCAD 5.16.0 — WMFIN, mặt cắt nửa / bậc / xoay, phông SHX cho chữ, GCSMOOTH, ALIGNSPACE, SYSWINDOWS

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.16.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.16.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý các hạn chế còn lại của 5.15.0.

- **Phông SHX cho chữ** (`SHXFONTS`, hoặc STYLE → **Phông SHX…**):
  - Nạp các tệp `.shx` có trên máy, ví dụ thư mục `Fonts` của AutoCAD đã cài. Đọc được phông thường (txt, simplex, romans…), unifont và bigfont (chữ Trung / Nhật / Hàn).
  - Chữ của kiểu chữ dùng phông `.shx` vẽ bằng nét của phông như AutoCAD, kể cả chữ trong DXF / DWG của AutoCAD.
  - In, xuất PDF / EPS / WMF / HPGL và `TXTEXP` đều theo nét phông.
  - Ký tự phông không có thì lấy từ big font, không có nữa thì vẽ bằng phông TrueType.
  - Hộp STYLE có **Dùng Big Font** và xem trước bằng nét phông.
  - Phông đã nạp được nhớ cho lần sau. Mở bản vẽ thiếu phông thì dòng lệnh báo tên phông.
- **`VIEWSECTION`** đủ 4 kiểu mặt cắt như AutoCAD:
  - **Toàn phần**.
  - **Nửa**: nửa cắt, nửa nhìn ngoài.
  - **Bậc** (offset): đường cắt gấp khúc, mỗi đoạn cắt đúng chỗ của nó.
  - **Cắt xoay** (aligned): đoạn xiên được trải phẳng.
- **`WMFIN` / `WMFOPTS`**: nhập Windows Metafile (`.wmf`) thành khối `WMF0`… Có nét, hình, chữ (cả tiếng Việt), vùng tô đặc và tô gạch.
- **`GCSMOOTH`**: ràng buộc trơn G2. Spline nối liền đầu đường thẳng / cung / đa tuyến / spline khác, cùng tiếp tuyến và độ cong; sửa đường kia thì spline tự chỉnh theo.
- **`ALIGNSPACE`**: căn tỉ lệ và vị trí khung nhìn layout theo cặp điểm mô hình ↔ giấy.
- **`SYSWINDOWS`**: xếp các bản vẽ đang mở Lát dọc / Lát ngang / Xếp chồng / Thu nhỏ. Bấm một ô để làm bản vẽ hiện hành.
- **`PSETUPIN` đọc DWG của AutoCAD**: lấy thiết lập trang của từng layout (`*Layout1*`…) và thiết lập trang có tên. Kết quả giống khi đọc bản DXF của cùng bản vẽ.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.15.0, thêm: có đủ lệnh v5w; WMFIN đọc Windows Metafile; phông SHX nạp được và chữ có bề rộng đúng theo phông.
  2. ODA File Converter đọc + audit, ACadSharp đọc lại các file DWG vừa ghi.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.
- Thiết lập trang đọc từ DWG 2000 / 2004 / 2018 do AutoCAD lưu được đối chiếu với tệp DXF của cùng bản vẽ.

### Giới hạn
- DVDCAD không kèm phông SHX của AutoCAD (thuộc bản quyền của Autodesk); bạn nạp phông có sẵn trên máy. Chữ có định dạng nhiều phông trong một MTEXT vẫn vẽ bằng phông TrueType.
- `SYSWINDOWS`: các ô chỉ để xem và chọn bản vẽ, chưa sửa song song nhiều cửa sổ.
- `ALIGNSPACE` chưa xoay khung nhìn (VIEWTWIST).
- `PSETUPIN` với DWG của AutoCAD: thiết lập trang có tên nào không đọc được thì có thông báo — lưu tệp thành DXF trong AutoCAD rồi nhập.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình.
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter. Không có ODA thì DVDCAD ghi DWG 2004.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
