# Viết add-in cho DVDCAD

DVDCAD nạp được 2 loại add-in bằng lệnh `APPLOAD` (ribbon › thẻ **Add-ins** › Load Application):

| Loại | Đuôi file | Dùng khi |
|---|---|---|
| AutoLISP | `.lsp` | Đã có sẵn lisp dùng cho AutoCAD, cần chạy lại trên DVDCAD |
| JavaScript | `.js` | Viết mới, cần giao diện, tải file, tính toán nhiều |

Không chạy được: `.fas` / `.vlx` (LISP đã biên dịch), `.dll` / `.arx` / `.dbx` (add-in .NET / ObjectARX), `.dvb` (VBA). Đây là add-in Windows chỉ chạy bên trong AutoCAD, trình duyệt không chạy được. Muốn dùng thì chuyển phần xử lý sang `.js` hoặc dùng bản mã nguồn `.lsp`.

> ⚠ Add-in chạy với toàn quyền trong DVDCAD (sửa / xoá bản vẽ, gửi dữ liệu ra mạng). Chỉ nạp file từ nguồn tin cậy.

Startup Suite: đánh dấu **Khởi động** trong APPLOAD thì add-in tự nạp mỗi khi mở DVDCAD. Add-in được lưu trên máy (trong trình duyệt), không đi kèm bản vẽ.

---

## 1. AutoLISP

- `(defun c:TEN () ...)` tạo lệnh `TEN`, gõ ở dòng lệnh như lệnh thường.
- Gõ thẳng biểu thức ở dòng lệnh: `(+ 1 2)`, `(setq r 5)`. Khi lệnh đang hỏi, gõ `!r` để dùng giá trị biến `r`.
- Bảng gõ thử: lệnh `VLISP` (Ctrl+Enter = chạy, có nút Lưu thành add-in).
- `(load "ten")` nạp file `ten.lsp` đã có trong APPLOAD.

Hàm có sẵn:

| Nhóm | Hàm |
|---|---|
| Điều khiển | `defun` `lambda` `setq` `set` `if` `cond` `while` `repeat` `foreach` `progn` `and` `or` `not` `null` `quote` `function` `eval` `apply` `mapcar` `vl-catch-all-apply` `exit` `*error*` |
| Số | `+ - * /` (`/` của 2 số nguyên là chia nguyên, như AutoLISP) `rem 1+ 1- abs min max sqrt sin cos atan exp log expt fix float gcd logand logior lsh ~ zerop minusp numberp` `pi` |
| So sánh | `= /= < > <= >= eq equal` |
| Danh sách | `list cons car cdr cadr caddr …(đến 4 cấp) nth last length append reverse assoc member subst` `vl-position vl-remove vl-sort vl-remove-if vl-remove-if-not vl-some vl-every vl-member-if acad_strlsort` |
| Chuỗi | `strcat strlen substr strcase itoa atoi atof rtos distof angtos angtof chr ascii wcmatch read` `vl-string-search vl-string-subst vl-string-trim vl-string->list vl-list->string vl-princ-to-string` |
| Hình học | `polar distance angle inters` |
| Nhập liệu | `getpoint getcorner getdist getangle getorient getreal getint getstring getkword initget entsel nentsel` |
| Đối tượng | `entget entmod entmake entdel entlast entnext handent` `ssget` (chọn tay, `"X"`, `"W"`, `"C"`, `"L"`, `"I"` + bộ lọc mã 0 / 8 / 62 / 2 / 1, ký tự đại diện `* ? ,`) `sslength ssname ssadd ssdel ssmemb sssetfirst tblsearch` (LAYER, BLOCK) |
| Lệnh | `(command "LINE" p1 p2 "")`, `vl-cmdf`, `pause` (chờ người dùng), truyền điểm, số, chuỗi, tên đối tượng, tập chọn |
| Hệ thống | `getvar setvar` (CLAYER, OSMODE, ORTHOMODE, TEXTSIZE, CECOLOR… như lệnh SETVAR) `princ prin1 print prompt terpri alert getenv setenv vl-load-com type boundp` |

Mã DXF trong `entget` / `entmod` / `entmake`:
- `-1` tên, `0` loại, `8` lớp, `62` màu (256 = ByLayer), `6` kiểu nét.
- LINE `10 11`, CIRCLE `10 40`, ARC `10 40 50 51` (radian), POINT `10`.
- TEXT / MTEXT `10 11 40 1 50 7 72 73`.
- LWPOLYLINE `90 70 10 42 40 41 43`.
- INSERT `2 10 41 50` (chỉ đọc; `entmod` đổi được lớp / màu).
- DIMENSION `1 42 13 14` (chỉ đọc).

Chưa có: hàm `vla-` / `vlax-` (ActiveX), DCL (`load_dialog` …), `grread`, `entmake` cho INSERT / HATCH / khối, bảng `tblnext`, reactor.

Ví dụ:

```lisp
(defun c:VUONG (/ p a)
  (setq p (getpoint "\nTâm hình vuông: "))
  (setq a (getdist p "\nCạnh: "))
  (command "RECTANG"
           (list (- (car p) (/ a 2)) (- (cadr p) (/ a 2)))
           (list (+ (car p) (/ a 2)) (+ (cadr p) (/ a 2))))
  (princ))
```

Add-in mẫu: `addins/lisp-tien-ich.lsp` (STT, TL, DTL, KHUNGTEN). Cài trong APPLOAD › Add-in mẫu.

---

## 2. JavaScript

File `.js` được chạy với biến `DVDCAD` (API dưới đây). Đăng ký lệnh bằng `DVDCAD.addCommand`. Lệnh mới tự hiện ở ribbon › thẻ **Add-ins**.

```js
DVDCAD.addCommand('DEMTRON', 'Đếm đường tròn theo bán kính', async C => {
  const sel = await C.getSelection('Chọn vùng cần đếm', e => e.type === 'CIRCLE');
  const dem = {};
  for (const e of sel) dem[e.r] = (dem[e.r] || 0) + 1;
  for (const r in dem) C.log('R = ' + r + ': ' + dem[r] + ' cái');
}, { aliases: ['DT0'] });
```

| API | Kết quả |
|---|---|
| `addCommand(ten, moTa, async fn, { aliases, icon })` | Đăng ký lệnh; `fn` nhận `DVDCAD`, Esc huỷ lệnh |
| `getPoint(msg, { base })` | `{x, y}` hoặc `null` |
| `getDistance(msg, { base, default })` · `getNumber(msg, def)` · `getString(msg, def)` | số / chuỗi hoặc `null` |
| `getKeyword(msg, ['Co', 'Khong'], def)` | từ khoá đã chọn |
| `getEntity(msg, filter)` · `getSelection(msg, filter)` | đối tượng / mảng đối tượng |
| `entities({ type, layer })` · `selection()` | danh sách đối tượng (chỉ đọc) |
| `add(dsDoiTuong, ghiChu)` | thêm nhiều đối tượng một lần (một lần UNDO) |
| `addLine(a, b, props)` · `addCircle(c, r, props)` · `addArc(c, r, gocDau, gocCuoi, props)` · `addText(p, chu, cao, props)` · `addPolyline(dsDiem, kin, props)` | thêm đối tượng; `props`: `{ layer, color }` (`color`: `#rrggbb` hoặc số ACI) |
| `modify(doiTuong, thayDoi)` · `erase(ds)` | sửa / xoá (UNDO được) |
| `command('LINE', {x:0,y:0}, {x:100,y:0}, '')` | chạy lệnh DVDCAD như `(command)` của LISP |
| `lisp('(+ 1 2)')` | chạy mã AutoLISP, trả về chuỗi kết quả |
| `length(e)` · `area(e)` · `isCurve(e)` | chiều dài, diện tích |
| `layers()` · `currentLayer` · `addLayer(ten, mau)` | lớp |
| `log(msg)` · `alert(msg)` · `toast(msg)` · `dialog({ title, html, ok, onOpen })` | thông báo, hộp thoại |
| `download(tenFile, noiDung, mime)` · `copyText(chu)` · `format(so, chuSoLe)` | tiện ích |
| `onDrawingLoaded(fn)` | chạy khi mở bản vẽ |
| `engine` | bộ máy DVDCAD đầy đủ (`DVDAcad`), dùng khi cần sâu hơn, có thể đổi giữa các phiên bản |

Dữ liệu đối tượng (toạ độ bản vẽ, góc theo độ):
- LINE `{x1, y1, x2, y2}`; CIRCLE `{cx, cy, r}`; ARC `{cx, cy, r, a1, a2}`.
- TEXT `{x, y, h, text, rot, ha, va}`; POLYLINE `{vertices: [{x, y}], closed}`.
- Thuộc tính chung: `layer`, `col` (#rrggbb), `bl` (ByLayer).

Add-in mẫu: `addins/qs-khoi-luong.js` (TONGDAI, TONGDT: tổng chiều dài / diện tích theo lớp, chèn bảng, xuất CSV).
