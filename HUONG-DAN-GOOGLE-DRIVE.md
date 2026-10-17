# Hướng dẫn bật Google Drive · Chia sẻ · Cộng tác cho DVDCAD

DVDCAD chạy hoàn toàn trên trình duyệt (GitHub Pages), không có server riêng. Các tính năng online dùng chính Google Drive của người dùng để lưu bản vẽ và file đồng bộ. Bạn chỉ cần tạo **một lần** 3 mã miễn phí trong Google Cloud rồi điền vào `dvd-config.js`.

Thời gian: khoảng 15 phút. Không cần thẻ thanh toán.

---

## Bước 1 — Tạo dự án Google Cloud

1. Vào <https://console.cloud.google.com/> và đăng nhập bằng Gmail của bạn.
2. Bấm ô chọn dự án ở thanh trên cùng → **New Project** → đặt tên `DVDCAD` → **Create**.
3. Chọn dự án vừa tạo. Ở trang **Dashboard** (hoặc ☰ → *IAM & Admin* → *Settings*), chép lại **Project number** (chỉ gồm chữ số, ví dụ `123456789012`). Đây là `appId`.

## Bước 2 — Bật 2 API

☰ → **APIs & Services** → **Library**, tìm và bấm **Enable** cho:

- **Google Drive API**
- **Google Picker API**

## Bước 3 — Màn hình xin quyền (OAuth consent screen)

☰ → **APIs & Services** → **OAuth consent screen** (giao diện mới gọi là **Google Auth Platform**):

1. **User type**: chọn **External** → Create.
2. Điền **App name** `DVDCAD`, **User support email** và **Developer contact** là email của bạn → Save.
3. Mục **Scopes / Data access** → **Add or remove scopes** → chọn
   `.../auth/drive.file` (*See, edit, create and delete only the specific Google Drive files you use with this app*) → Save.
   Không cần thêm scope nào khác. `drive.file` là quyền hẹp nhất: app chỉ thấy những file người dùng tự mở/tạo bằng DVDCAD, không đọc được phần còn lại của Drive.
4. Mục **Audience / Publishing status** → bấm **Publish app** → **Confirm**.
   (Với riêng scope `drive.file`, Google cho phát hành mà không cần thẩm định. Nếu để ở chế độ *Testing* thì chỉ những email bạn thêm vào *Test users* mới đăng nhập được.)

## Bước 4 — Tạo OAuth Client ID (`clientId`)

☰ → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:

- **Application type**: *Web application*
- **Name**: `DVDCAD web`
- **Authorized JavaScript origins** → **Add URI**: `https://dangdvd.github.io`
  (đúng như vậy, không có `/DVDCAD`, không có dấu `/` ở cuối)
- **Authorized redirect URIs**: để trống.

Bấm **Create** và chép **Client ID** (dạng `1234...-abc.apps.googleusercontent.com`).

## Bước 5 — Tạo API key (`apiKey`)

**Credentials** → **Create credentials** → **API key** → chép key (dạng `AIzaSy...`). Sau đó bấm vào key để **giới hạn** lại cho an toàn:

- **Application restrictions** → *Websites* → thêm `https://dangdvd.github.io/*`
- **API restrictions** → *Restrict key* → chọn **Google Drive API** và **Google Picker API** → Save.

API key dùng để người không đăng nhập vẫn mở được bản vẽ đã chia sẻ "ai có link đều xem được".

## Bước 6 — Điền vào `dvd-config.js` và tải lên GitHub

Mở `dvd-config.js`, điền 3 giá trị:

```js
window.DVD_GOOGLE = {
  clientId: '1234567890-abcxyz.apps.googleusercontent.com',
  apiKey:   'AIzaSy....................',
  appId:    '123456789012'
};
```

Tải file lên repo `dangdvd/DVDCAD` (Add file → Upload files) cùng với các file khác. Mở lại app, thấy nút **☁ Drive** trên thanh trên cùng là xong.

> Thử nhanh trước khi sửa file: trong app bấm **☁ Drive → Cài đặt Google…**, dán 3 giá trị. Cách này chỉ lưu trên máy bạn; muốn người khác mở được link chia sẻ thì vẫn phải điền vào `dvd-config.js`.

---

## Cách dùng

### Mở và lưu trên Drive
- **☁ Drive → Đăng nhập Google**, rồi **Mở từ Google Drive** để chọn file `.dwg`/`.dxf`. Cũng có mục *Mở từ Google Drive* trong nút **Mở file**.
- File đang mở từ máy có thể **Tải bản vẽ này lên Drive**.
- **Lưu DXF lên Drive** ghi bản vẽ (kèm hình vẽ thêm, phần đã xoá) thành `<tên>_DVDCAD.dxf` cạnh file gốc. Những lần lưu sau sẽ ghi đè lên chính file đó. File DWG gốc không bị sửa.

### Chia sẻ link xem
- **☁ Drive → Chia sẻ…**: chép hoặc gửi link (`...?gd=<id>`).
- Bật **Ai có link đều xem được** thì người nhận mở là xem ngay, không cần đăng nhập.
- Hoặc **Mời theo email** với quyền *Xem* hay *Sửa*. Google sẽ gửi email kèm link mở bằng DVDCAD.

### Nhiều người cùng sửa
- **☁ Drive → Bật cộng tác**: app tạo file `<tên>.dvdcad.json` cạnh bản vẽ trên Drive. Mọi phép đo, ghi chú, hình vẽ thêm, đối tượng bị xoá, sửa… được đồng bộ qua file này.
- Người được mời quyền **Sửa** mở link, đăng nhập Google, rồi cùng vẽ. Thay đổi tự đồng bộ khoảng 4 giây/lần; chip góc trái hiện trạng thái và số người đang mở.
- Người chỉ có quyền xem thấy mọi thay đổi nhưng không ghi được lên bản chung (ghi chú của họ chỉ nằm trên máy họ).
- Hai người sửa cùng lúc: bản sửa sau cùng của từng đối tượng được giữ, không mất dữ liệu của người khác.

### Dòng lệnh kiểu AutoCAD
- Trên máy tính: gõ thẳng lệnh khi đang xem bản vẽ (ô **Lệnh:** ở dưới). Trên điện thoại: nút **Lệnh** ở cột trái.
- Lệnh tắt quen thuộc: `L` `PL` `REC` `C` `T` `M` `CO` `RO` `SC` `MI` `O` `AR` `TR` `EX` `F` `CHA` `E` `MA` `PR` `LA` `DI` `DLI` `DAL` `DRA` `DAN` `AA` `Z` (`Z E`, `Z W`…) `RE` `U` `REDO`…
- Nhập toạ độ khi vẽ: `x,y` · `@dx,dy` (tương đối) · `dài<góc` · gõ một số = độ dài theo hướng con trỏ (hoặc bán kính với `C`).
- Enter/Space để thực hiện; Enter trống = lặp lệnh trước hoặc kết thúc polyline; Esc huỷ; ↑↓ xem lịch sử; Tab tự hoàn thành; `?` hoặc F1 xem toàn bộ lệnh.
- Phím tắt: Ctrl+Z/Y, Ctrl+S (lưu), Ctrl+Shift+S (lưu thành), Ctrl+O, Ctrl+A, Ctrl+P, Ctrl+1 (bảng **Thuộc tính**), Delete.
- Bảng **Thuộc tính** (Ctrl+1 hoặc nút *Thuộc tính*): sửa trực tiếp toạ độ, chiều dài, bán kính, nội dung chữ, lớp, màu của đối tượng đang chọn.

### Mở và lưu file trên máy (không cần mạng)
- Edge/Chrome trên máy tính: **Mở file** dùng hộp thoại hệ thống. **Ctrl+S** ghi DXF trực tiếp vào file đã chọn (lần đầu hỏi chỗ lưu).
- Cài app (biểu tượng *Cài đặt* trên thanh địa chỉ Edge/Chrome) để có thể **nhấp đúp file .dwg/.dxf** mở thẳng bằng DVDCAD.
- iPhone/iPad: Mở file → Tệp; khi xuất DXF dùng *Lưu vào Tệp*.

---

## Lưu ý và giới hạn
- **iPhone (app đã thêm vào màn hình chính)**: cửa sổ đăng nhập Google có thể không quay lại app. Hãy đăng nhập và dùng Drive trong **Safari**; xem file đã chia sẻ công khai thì không cần đăng nhập.
- Trình duyệt chặn popup thì cho phép popup với `dangdvd.github.io`.
- Lưu ra định dạng **DXF** (AutoCAD mở được bình thường). Không ghi lại DWG.
- Đồng bộ theo chu kỳ khoảng 4 giây, không hiện từng nét đang vẽ theo thời gian thực như AutoCAD Web.
- Người cộng tác cần tài khoản Google và phải được mời (hoặc file để công khai thì chỉ xem).
- Có lỗi "access_denied / app chưa được xác minh": kiểm tra lại Bước 3 (đã *Publish app*, scope chỉ có `drive.file`). Lỗi "origin_mismatch": kiểm tra Bước 4 (origin đúng `https://dangdvd.github.io`).
