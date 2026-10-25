# DVDCAD cho Windows — cài đặt và dùng offline

DVDCAD bản Windows là một phần mềm cài trên máy, chạy **hoàn toàn offline**: không cần mạng, không cần trình duyệt, không cần máy chủ.
Giao diện và cách dùng như bản web kiểu AutoCAD: ribbon, dòng lệnh, Quick Access Toolbar, tab bản vẽ, thanh trạng thái, bảng Properties / Layer, và hơn 500 lệnh (hơn 900 tên lệnh kể cả lệnh tắt) như `L`, `PL`, `C`, `TR`, `O`, `H`, `DLI`.

## Tải và cài đặt

1. Vào trang GitHub của dự án → **Actions** → **DVDCAD Windows** → chọn lần chạy mới nhất → mục **Artifacts** → tải `DVDCAD-Windows`.
   Khi có phiên bản chính thức, file cũng nằm ở **Releases**.
2. Chọn một trong hai file:
   - `DVDCAD-Setup-<phiên bản>.exe` — **bộ cài**. Cài cho tài khoản Windows đang dùng, không cần quyền quản trị, được chọn thư mục cài.
     Bộ cài tạo biểu tượng ở Desktop và Start Menu, và gắn file **.dwg / .dxf** với DVDCAD (nhấp đúp là mở).
   - `DVDCAD-<phiên bản>-portable.exe` — **bản chạy ngay**, không cần cài. Chép được vào USB.
     Bản này không tự gắn file .dwg / .dxf; dùng *Open with → DVDCAD* nếu muốn.
3. Windows SmartScreen có thể báo *"Windows protected your PC"* vì file chưa được ký số.
   Khi đó bấm **More info → Run anyway**.

Gỡ cài đặt: **Settings → Apps → DVDCAD → Uninstall**.

## Cách dùng giống AutoCAD

| Việc cần làm | Trong DVDCAD Windows |
|---|---|
| Trang bắt đầu | Tab **Start**: Bản vẽ mới (chọn mẫu mm / m / inch), Mở…, bản vẽ gần đây có ảnh thu nhỏ, tìm theo tên, ghim, xem dạng lưới / danh sách |
| Mở bản vẽ | `OPEN` / **Ctrl+O** mở hộp thoại *Select File* của Windows. Chọn được nhiều file, mỗi file một tab |
| Mở từ Explorer | Nhấp đúp file .dwg / .dxf, hoặc kéo thả file vào cửa sổ. Khi DVDCAD đang chạy, file mở thêm thành tab mới trong cùng cửa sổ |
| Lưu | `QSAVE` / **Ctrl+S**: lần đầu hỏi chỗ lưu, các lần sau ghi đè đúng file đó. `SAVEAS` / **Ctrl+Shift+S** lưu thành file DXF khác |
| Nhiều bản vẽ | Tab file phía trên khung vẽ, **Ctrl+Tab** chuyển tab, **Ctrl+F4** đóng tab |
| Phím chức năng | F1 trợ giúp, F2 lịch sử lệnh, F3 OSNAP, F7 GRID, F8 ORTHO, F9 SNAP, F10 POLAR, F11 OTRACK, F12 DYN |
| In | `PLOT` / **Ctrl+P**: xuất PDF đúng khổ giấy và tỉ lệ, hoặc in ra máy in |

**Lệnh tắt như AutoCAD:** bảng lệnh tắt mặc định giống `acad.pgp`, ví dụ `L`, `C`, `CO`/`CP`, `TR`, `EX`, `O`, `F`, `H`, `DLI`, `T` = MTEXT, `DT` = TEXT, `DO` = DONUT, `PA` = PASTESPEC, `RE` / `REA`.
File `acad.pgp` riêng của bạn nhập được bằng lệnh `ALIASEDIT`. Khi gõ lệnh, danh sách gợi ý hiện kèm biểu tượng như AutoComplete của AutoCAD.

Danh sách lệnh đầy đủ: [HUONG-DAN-LENH.md](HUONG-DAN-LENH.md), hoặc bấm **F1** trong chương trình.

## Dữ liệu nằm ở đâu

- Cài đặt, danh sách gần đây, vị trí cửa sổ: `%APPDATA%\DVDCAD`.
  Muốn dùng thư mục khác (ví dụ bản portable trên USB), đặt biến môi trường `DVDCAD_USER_DATA` trước khi chạy.
- Bản vẽ chỉ được đọc và ghi ở những file bạn tự chọn: hộp thoại Mở / Lưu, nhấp đúp, kéo thả, danh sách gần đây.
- Google Drive, chia sẻ và cùng sửa vẫn dùng được khi có mạng. Mọi phần khác chạy offline.

## Giới hạn

- **Lưu DWG**: `Ctrl+S` lưu ra **DXF 2018**; AutoCAD và các phần mềm CAD khác mở được file này.
  Muốn có file .dwg: cài **ODA File Converter** (miễn phí, opendesign.com) rồi dùng lệnh `SAVEDWG`. DVDCAD tự tìm ODA trong `C:\Program Files\ODA`, chuyển ngay trên máy, không cần mạng.
  Nếu cài ODA chỗ khác, chọn đường dẫn trong lệnh `DWGSERVER`; ở đó cũng chọn được phiên bản DWG (2000 → 2018).
- Đây là phần mềm mã nguồn mở có **tên lệnh và cách dùng giống AutoCAD**, **không phải** sản phẩm của Autodesk.
  Biểu tượng là hình DVDCAD tự vẽ theo quy ước quen thuộc của phần mềm CAD; DVDCAD không dùng logo, biểu tượng hay mã nguồn của Autodesk.

## Dành cho người phát triển

Mã bản Windows nằm trong thư mục `desktop/` (Electron). Phần giao diện dùng chung với bản web:

- `desktop/main.js` — tiến trình chính.
  Phục vụ file của app qua giao thức `dvdcad://app/` từ ổ đĩa.
  Chỉ cho chạy một cửa sổ; file mở từ Explorer được chuyển vào cửa sổ đó.
  Lo hộp thoại Mở / Lưu, nhớ vị trí cửa sổ, và giữ danh sách gần đây trong `recent.json`.
- `desktop/preload.js` — cầu nối `window.dvdDesktop`. `contextIsolation` bật, giao diện không chạm được Node.js.
- `dvd-desktop.js` — chạy trong giao diện. Thay `showOpenFilePicker` / `showSaveFilePicker` bằng hộp thoại Windows và lo kéo thả file.
  Trên trình duyệt file này không làm gì.
- `dvd-acad-start.js` — trang Start kiểu AutoCAD (dùng cho cả bản web).

Chạy thử và đóng gói:

```
cd desktop
npm ci
npm start                 # chạy thử từ mã nguồn (thư mục cha là mã web)
npm test                  # kiểm thử nhanh, cần Playwright: npm i --no-save playwright
npm run dist              # tạo dist/DVDCAD-Setup-*.exe và dist/DVDCAD-*-portable.exe
python3 scripts/make-icons.py   # tạo lại biểu tượng từ icon-512.png (cần Pillow)
```

- Nên dựng bộ cài trên Windows. Trên Linux cần cài `wine` (cả bản 32-bit) thì mới dựng được bộ cài NSIS.
- GitHub Actions (`.github/workflows/desktop-windows.yml`) dựng sẵn trên `windows-latest` mỗi khi mã thay đổi.

DVDCAD là mã nguồn mở theo GPL-3.0 hoặc mới hơn ([LICENSE](LICENSE)). Bản Windows có chứa LibreDWG (GPL-3.0); khi phân phát lại, giữ thông báo giấy phép và cung cấp mã nguồn (chính repo này).
