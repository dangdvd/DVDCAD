# Máy chủ chuyển DXF → DWG cho DVDCAD

App DVDCAD không tạo được file `.dwg` ngay trong trình duyệt (DWG là định dạng độc quyền của Autodesk).
Máy chủ nhỏ này nhận DXF từ app và trả về DWG — **chỉ chạy trên máy có internet** (hoặc trong mạng LAN).

## Cần chuẩn bị

- **Node.js** (<https://nodejs.org>) — không cần cài thư viện npm nào.
- **Một bộ chuyển đổi**, chọn 1 trong 2:
  - **ODA File Converter** — MIỄN PHÍ, khuyên dùng (chất lượng tốt, mọi phiên bản DWG):
    <https://www.opendesign.com/guestfiles/oda_file_converter>
  - **LibreDWG** (lệnh `dxf2dwg`) — dự phòng; chỉ tạo DWG tới bản r2000 và đôi khi AutoCAD không mở được.

## Chạy

### Windows (dùng ODA File Converter)

```
set ODA=C:\Program Files\ODA\ODAFileConverter 25.11.0\ODAFileConverter.exe
node server-dwg.js
```

### Linux/macOS (dùng ODA File Converter)

```
export ODA=/usr/bin/ODAFileConverter
node server-dwg.js
# Linux không có màn hình có thể cần: xvfb-run -a node server-dwg.js
```

### Dùng LibreDWG dự phòng (không đặt biến ODA)

```
node server-dwg.js
```

Mặc định chạy ở cổng **8787**. Đổi cổng: `set PORT=9000` (Windows) / `export PORT=9000` (Linux/macOS).
Đổi phiên bản DWG xuất ra: `set ODA_VER=ACAD2013` (mặc định `ACAD2018`).

## Kết nối từ app

Mở **DVDCAD → Xuất → “Cài đặt máy chủ chuyển DWG…”** rồi dán địa chỉ:

```
http://localhost:8787/convert
```

- Cùng máy: dùng `localhost`.
- Máy khác/điện thoại trong cùng mạng LAN: thay `localhost` bằng IP máy chủ, ví dụ `http://192.168.1.50:8787/convert`.

Sau đó: **Xuất → “Lưu DWG — cả bản vẽ”** (hoặc “chỉ phần tôi vẽ”). Khi máy có internet/kết nối tới máy chủ, app sẽ tải về file `.dwg`. Khi offline, nút sẽ mờ đi và app báo cần internet.

## Lưu ý bảo mật

Mã mẫu đặt CORS mở (`*`) cho dễ thử. Khi chạy thật, nên giới hạn CORS theo tên miền app của bạn,
và đặt máy chủ sau HTTPS nếu app chạy trên HTTPS (trình duyệt chặn gọi http từ trang https).