## DVDCAD 5.17.0 — khung nhìn xoay (VIEWTWIST), MTEXT nhiều phông / SHX, thiết lập trang có tên trong DWG, SYSWINDOWS cửa sổ con

Phần mềm CAD mã nguồn mở (GPL-3.0) chạy hoàn toàn offline trên Windows. Tên lệnh, lệnh tắt và cách dùng giống AutoCAD để người dùng chuyển sang không bỡ ngỡ.

### Tải về
- **DVDCAD-Setup-5.17.0.exe** — bộ cài.
  - Cài cho tài khoản Windows đang dùng, không cần quyền quản trị.
  - Có lối tắt Desktop và Start Menu.
  - Nhấp đúp file .dwg / .dxf là mở bằng DVDCAD.
- **DVDCAD-5.17.0-portable.exe** — chạy ngay, không cần cài (dùng được trên USB).

Bản chưa ký số: Windows SmartScreen có thể cảnh báo, bấm **More info → Run anyway**.

### Có gì mới
Bản này xử lý các hạn chế còn lại của 5.16.0.

- **Khung nhìn xoay (VIEWTWIST)** trong layout:
  - Mở DXF / DWG có khung nhìn xoay thì mô hình hiện nghiêng đúng góc trên giấy. Lưu lại DXF / DWG 2000 / 2004 / 2018 vẫn giữ góc xoay.
  - `ALIGNSPACE`: hai cặp điểm lệch hướng thì khung nhìn **xoay theo**, các điểm trùng đúng chỗ.
  - `VPEDIT` có cột **Xoay nhìn (°)**. `VPSYNC`, `CHSPACE`, `VPMAX` tính cả góc xoay.
- **MTEXT nhiều phông, phông SHX trong chữ có định dạng**:
  - Bôi đen một đoạn chữ, chọn phông trong tab **Soạn chữ**: đoạn đó dùng phông riêng. Có cả phông `.shx` đã nạp.
  - Đoạn dùng phông SHX vẽ bằng nét phông. Bề rộng và xuống dòng tính theo phông thật.
  - Đọc và ghi đúng mã `\F` (SHX) và `\f` (TrueType) trong MTEXT của AutoCAD.
- **Thiết lập trang có tên lưu vào DWG / DXF**: thiết lập lưu trong hộp PLOT hoặc nhập bằng `PSETUPIN` có trong **Page Setup Manager** của AutoCAD (khổ giấy, hướng, vùng in, tỉ lệ, bảng kiểu in, máy in).
- **`PSETUPIN` đọc DWG của AutoCAD đã được kiểm chứng**:
  - Đối chiếu với tệp DWG 2013 thật do AutoCAD lưu.
  - Sửa lỗi: vùng in *Display* trước đây bị đọc thành *Extents*. "Vừa khổ giấy" đọc đúng như AutoCAD.
- **`SYSWINDOWS` thành cửa sổ con thật** (Lát dọc / Lát ngang / Xếp chồng):
  - Bản vẽ hiện hành vẽ và sửa ngay trong ô của nó. Bấm ô khác để chuyển bản vẽ, phần đã sửa vẫn giữ.
  - Nút **□** để trở về một cửa sổ.

### Kiểm thử
- GitHub Actions trên Windows:
  1. Kiểm thử nhanh như 5.16.0, thêm: đọc MTEXT nhiều phông; layout có khung nhìn xoay 30° cùng thiết lập trang có tên → DXF / DWG 2018 / 2000 → mở lại đúng.
  2. ODA File Converter đọc + audit các file DWG vừa ghi (cả file có khung nhìn xoay và PLOTSETTINGS). ACadSharp đọc lại.
  3. Cài lặng bộ cài, chạy kiểm thử trên chính `DVDCAD.exe` đã cài, gỡ cài.
- Đọc PLOTSETTINGS đã đối chiếu với tệp DWG 2013 thật do AutoCAD lưu (bộ tệp thử của LibreDWG): khổ, hướng, vùng in, tỉ lệ khớp với DXF của cùng bản vẽ.

### Giới hạn
- DVDCAD không kèm phông SHX của AutoCAD (thuộc bản quyền của Autodesk); bạn nạp phông có sẵn trên máy.
- `SYSWINDOWS`: mỗi lúc chỉ một bản vẽ hiện hành (như AutoCAD); ô của bản vẽ khác hiện ảnh lúc rời bản vẽ đó.
- Hình chiếu (VIEWBASE…) lưu cùng bản vẽ dạng nét thường: AutoCAD thấy đủ nét nhưng không coi là hình chiếu liên kết với mô hình. Định dạng liên kết này Autodesk không công bố.
- DWG 2007 thật (AC1021) vẫn cần ODA File Converter. Không có ODA thì DVDCAD ghi DWG 2004.
- DVDCAD không phải sản phẩm của Autodesk và không dùng logo, biểu tượng hay mã của Autodesk. AutoCAD là thương hiệu của Autodesk, Inc. ODA File Converter là sản phẩm của Open Design Alliance.

Hướng dẫn: [HUONG-DAN-WINDOWS.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-WINDOWS.md) · Danh sách lệnh: [HUONG-DAN-LENH.md](https://github.com/dangdvd/DVDCAD/blob/main/HUONG-DAN-LENH.md)
