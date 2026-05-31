# CAD Xem — PWA xem bản vẽ DWG/DXF (cài được, chạy offline)

Ứng dụng web một trang: **xem** bản vẽ, **đo khoảng cách** (có bắt điểm), **thêm ghi chú**.
Đọc **DXF** trực tiếp và **DWG** trực tiếp (qua LibreDWG biên dịch WebAssembly).
Sau lần nạp đầu, app **chạy hoàn toàn offline** và **cài lên màn hình chính** iPhone như một app.

## Có gì trong thư mục này
- `index.html` — toàn bộ ứng dụng (parser DXF + bộ vẽ + đo + ghi chú).
- `libredwg-web.js`, `libredwg-web.wasm` — bộ giải mã **DWG** (LibreDWG, giấy phép **GPL-3.0**, ~15MB tổng).
- `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon-180.png` — phần PWA (cài đặt + offline).

> ⚠️ App phải được chạy qua **HTTPS** (hoặc localhost) thì service worker mới hoạt động.
> Mở thẳng file `index.html` bằng `file://` sẽ KHÔNG cài/offline được. Hãy đưa lên một host (hướng dẫn dưới).

---

## Cách đưa lên mạng MIỄN PHÍ

### Cách A — GitHub Pages (khuyên dùng)
1. Tạo tài khoản GitHub, tạo repo mới (ví dụ tên `cadxem`), để **Public**.
2. Tải toàn bộ file trong thư mục này lên repo (nút **Add file → Upload files**), commit.
3. Vào **Settings → Pages**. Mục *Build and deployment*: chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`. Lưu.
4. Đợi ~1 phút, GitHub cho địa chỉ dạng `https://<tên-bạn>.github.io/cadxem/`. Mở địa chỉ này bằng **Safari trên iPhone**.

> Vì app chạy trong thư mục con (`/cadxem/`), mọi đường dẫn đã để **tương đối** (`./…`) nên hoạt động đúng.

### Cách B — Netlify (kéo–thả, không cần Git)
1. Vào app.netlify.com → **Add new site → Deploy manually**.
2. Kéo–thả cả thư mục này vào. Netlify cho ngay một địa chỉ HTTPS để mở.

---

## Cài lên iPhone + dùng offline
1. Mở địa chỉ HTTPS ở trên bằng **Safari**.
2. Bấm nút **Chia sẻ** → **Thêm vào MH chính** (Add to Home Screen). Giờ có icon app riêng, mở toàn màn hình.
3. **Offline:** ngay lần mở đầu, app đã được lưu cache; sau đó tắt mạng vẫn mở và xem **DXF** được.
4. **DWG offline:** bộ giải mã DWG nặng ~15MB nên chỉ tải khi bạn **mở một file .dwg lần đầu (cần mạng)**.
   Sau lần đó nó được lưu cache → các lần sau mở DWG **không cần mạng** nữa.

## Mở file trên iPhone
Bấm **Mở file** trong app → chọn `.dxf` hoặc `.dwg` từ ứng dụng **Files**/iCloud Drive.
File được đọc **ngay trên máy**, không tải lên máy chủ nào.

---

## Định dạng & giới hạn
- **DXF:** đọc trực tiếp, không phụ thuộc thư viện ngoài. Hỗ trợ LINE, CIRCLE, ARC, ELLIPSE,
  LWPOLYLINE/POLYLINE, TEXT/MTEXT, POINT, SOLID/3DFACE, **INSERT**, **DIMENSION**, **SPLINE** và **HATCH**.
- **DWG:** đọc qua **LibreDWG (WASM)** — đã thử với R11, R14, R2000, R2004, R2007, R2013.
- **INSERT & DIMENSION:** block được "explode" và biến đổi đúng (vị trí, tỉ lệ, góc xoay),
  kể cả **block lồng nhau** và **mảng** (rows/cols). DIMENSION vẽ theo khối `*D…` nên có đủ đường gióng,
  **mũi tên** và **chữ số đo**. Layer `Defpoints` (điểm dựng hình) được bỏ qua.
- **SPLINE:** dựng đúng đường cong — **NURBS/B-spline** (thuật toán Cox–de Boor, có hỗ trợ trọng số)
  khi có control points; **nội suy Catmull-Rom** (đi qua điểm) khi chỉ có fit points.
- **HATCH:** lấy biên (polyline có *bulge*, hoặc cạnh line/arc/ellipse/spline) rồi **tô mờ** vùng đó
  (đặc hơn nếu là tô đặc), dùng quy tắc even-odd để chừa lỗ. *Lưu ý:* các mẫu gạch (ANSI31…)
  được đơn giản hoá thành tô nền mờ, không vẽ từng nét gạch.
- **Polyline cong (bulge):** đoạn polyline có *bulge* được dựng đúng thành **cung tròn** (toán chính xác,
  điểm nằm đúng trên cung), áp dụng cho cả polyline thường lẫn biên của HATCH.
- **Còn lại:** đây là trình xem **2D** — các đối tượng khối 3D thực thụ (3DSOLID, REGION, MESH, mặt cong)
  không được dựng hình 3D. Phần lớn bản vẽ kỹ thuật 2D nay đã hiển thị đầy đủ.

## Cập nhật app
Nếu bạn sửa file rồi upload lại mà máy vẫn hiện bản cũ: mở `sw.js`, đổi `const CACHE = 'cadxem-v1'`
thành `'cadxem-v2'` (tăng số), upload lại. Service worker sẽ xoá cache cũ và nạp bản mới.

## Giấy phép
- Mã ứng dụng (phần `index.html`, `sw.js`…) bạn tự do dùng/sửa.
- **LibreDWG** (`libredwg-web.js`, `libredwg-web.wasm`) theo **GPL-3.0**. Nếu bạn **phân phối** app này,
  cần tuân thủ điều khoản GPL (giữ thông báo giấy phép và cung cấp mã nguồn khi được yêu cầu).
  Nguồn: https://github.com/mlightcad/libredwg-web và https://github.com/LibreDWG/libredwg
