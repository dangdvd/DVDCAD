# DVDCAD v4i — Lệnh & thao tác kiểu AutoCAD

Trên **máy tính** (màn hình rộng ≥ 900px, có chuột) DVDCAD hiện giao diện kiểu AutoCAD: ribbon, dòng lệnh, thanh trạng thái, bảng Thuộc tính, tab Model/Layout.
Trên **điện thoại** giữ giao diện gọn. Bấm nút **Công cụ** ở cột trái để mở bảng lệnh CAD, chạm lên bản vẽ để chọn điểm (tự bắt điểm). Thanh lệnh có nút **↵** (Enter) và **✕** (huỷ).

## Cách dùng chung (giống AutoCAD)
- Gõ lệnh hoặc lệnh tắt rồi bấm **Enter** hoặc **Space**. **Enter** khi trống sẽ lặp lại lệnh trước. **Esc** để huỷ.
- Lời nhắc hiện ở dòng lệnh. Bấm vào **chữ vàng** trong `[...]` hoặc gõ chữ tắt để chọn tuỳ chọn.
- Khi đang chạy lệnh, **chuột phải = Enter**. Khi rảnh, chuột phải mở menu (lặp lệnh, sao chép/dán, di chuyển…).
- **Chọn trước rồi gõ lệnh** cũng được: MOVE, COPY, ERASE… sẽ dùng luôn các đối tượng đang chọn.
- Nhập điểm:
  - `x,y` là toạ độ tuyệt đối.
  - `@dx,dy` là dời so với điểm trước.
  - `@dài<góc` (hoặc `dài<góc`) là theo chiều dài và góc.
  - Chỉ gõ **một số** thì đi theo hướng con trỏ, đúng như cách nhập khoảng cách trực tiếp của AutoCAD. Dùng chung với ORTHO hoặc POLAR rất tiện.
- Bắt điểm một lần: khi được hỏi điểm, gõ `END`, `MID`, `CEN`, `INT`, `PER`, `TAN`, `NEA`, `QUA`, `NOD`, `INS` hoặc `NON`.
- `FROM`: chọn điểm gốc rồi gõ độ lệch (`@500,200`) để lấy điểm cách gốc một khoảng.
- `M2P`: lấy trung điểm giữa 2 điểm bất kỳ.
- Khi chọn đối tượng, ngoài ALL, P, L, R còn gõ được:
  - `F`: hàng rào, chọn các đối tượng mà đường gấp khúc cắt qua.
  - `WP`: đa giác trùm, chỉ chọn đối tượng nằm trọn trong đa giác.
  - `CP`: đa giác cắt, chọn đối tượng nằm trong hoặc chạm đa giác.
  - Bấm các đỉnh rồi Enter.

## Nhiều bản vẽ cùng lúc
Mỗi file mở ra là một **tab** (như AutoCAD). Bấm tab để chuyển. **Ctrl+Tab** chuyển tab kế tiếp. Ctrl+F4, chữ × hoặc bấm chuột giữa vào tab để đóng tab đó. Mọi thay đổi tự lưu theo từng file.

## Chuột
- **Lăn chuột**: phóng to hoặc thu nhỏ tại con trỏ. **Giữ chuột giữa**: kéo màn hình. **Kích đúp chuột giữa**: phóng vừa bản vẽ.
- **Bấm đối tượng** để thêm vào vùng chọn. **Shift + bấm** để bỏ chọn.
- **Khung chọn**: bấm 2 góc, hoặc kéo giữ chuột.
  - Trái → phải (xanh dương) chỉ chọn đối tượng nằm trọn trong khung.
  - Phải → trái (xanh lá, nét đứt) chọn mọi đối tượng chạm khung.
- **Ô nắm xanh (grip)**: bấm vào một ô thì ô chuyển đỏ và bắt đầu **kéo giãn**. Bấm **Space** để đổi lần lượt sang Di chuyển, Xoay, Tỉ lệ, Đối xứng. Gõ `C` để tạo bản sao.
- **Đa tuyến** có thêm ô nắm ở giữa mỗi đoạn. Kéo ô giữa thì dời cả đoạn. Sau khi bấm ô giữa, chọn `[Thêm đỉnh]`. Sau khi bấm ô ở đỉnh, chọn `[Xoá đỉnh]`.
- **Kích đúp** vào chữ để sửa nội dung, vào đối tượng khác để mở Thuộc tính.
- **Khối và kích thước chọn theo cụm** như AutoCAD: bấm một nét trong khối là chọn cả khối. Khối chỉ có một ô nắm ở điểm chèn. **Ctrl+Shift+A** bật/tắt chế độ này (chọn từng nét).
- **Rê chuột** lên đối tượng khoảng 1 giây sẽ hiện ô gợi ý: loại, màu, lớp, kiểu nét. Rê chuột lên nút trên ribbon sẽ hiện tên lệnh, mô tả và lệnh tắt.

## Phím tắt
| Phím | Chức năng | Phím | Chức năng |
|---|---|---|---|
| F1 | Danh sách lệnh | F2 | Lịch sử dòng lệnh |
| F3 | OSNAP bắt điểm | F7 | GRID lưới |
| F8 | ORTHO (giữ Shift = tạm thời) | F9 | SNAP bước lưới |
| F10 | POLAR góc cực | F11 | OTRACK truy bắt |
| F12 | DYN nhập động | Ctrl+1 | Bảng Thuộc tính |
| Ctrl+P | In bản vẽ (Plot) | | |
| Ctrl+Z / Y | Hoàn tác / làm lại | Ctrl+C / X / V | Sao chép / cắt / dán (dùng được giữa các bản vẽ) |
| Ctrl+Shift+C / V | Sao chép kèm điểm gốc / dán đúng toạ độ | Ctrl+N / O / S | Mới / mở / lưu |
| Ctrl+Shift+S | Lưu thành DXF | Ctrl+P | In / xuất |
| Ctrl+A | Chọn tất cả | Ctrl+9 / Ctrl+0 | Ẩn/hiện dòng lệnh / toàn màn hình |
| Ctrl+Shift+A | Bật/tắt chọn cả nhóm/khối | | |
| Delete | Xoá đối tượng đang chọn | Esc | Huỷ / bỏ chọn |

Bấm chuột phải lên nút **POLAR** hoặc **OSNAP** ở thanh trạng thái để chọn nhanh bước góc hoặc loại điểm bắt.

## Danh sách lệnh
**Vẽ:** `BOUNDARY BO` (bấm trong vùng kín → đa tuyến kín) · `DONUT` · `LINE L` · `PLINE PL` (A = cung, C = đóng) · `RECTANG REC` (D = kích thước) · `CIRCLE C` (D, 2P, 3P) · `ARC A` (3 điểm, C = tâm) · `ELLIPSE EL` · `POLYGON POL` · `POINT PO` · `XLINE XL` · `RAY` · `SPLINE SPL` · `REVCLOUD RC` · `TEXT T/DT` · `MTEXT MT` · `HATCH H` (bấm điểm trong vùng kín; S = chọn đường kín; T = mẫu và tỉ lệ)

**Sửa:** `OVERKILL` (xoá nét trùng, gộp đoạn thẳng chồng nhau) · `ALIGN AL` (căn theo 2 cặp điểm: dời + xoay, có thể tỉ lệ) · `MOVE M` · `COPY CO` · `ROTATE RO` (C = sao chép, R = tham chiếu) · `SCALE SC` · `MIRROR MI` · `OFFSET O` (T = đi qua) · `ARRAY AR` (chữ nhật hoặc tròn) · `STRETCH S` (khung cắt) · `TRIM TR` · `EXTEND EX` (bấm phần cần bỏ hoặc kéo dài; giữ Shift để đổi qua lại) · `FILLET F` (R, P = cả đa tuyến, bán kính 0 = nối góc) · `CHAMFER CHA` · `BREAK BR` · `BREAKATPOINT BRP` · `JOIN J` · `EXPLODE X` · `LENGTHEN LEN` · `PEDIT PE` · `ERASE E` · `OOPS` · `MATCHPROP MA` · `DDEDIT ED`

**Kích thước** (nét thật trong bản vẽ, xuất DXF được): `DIMLINEAR DLI` · `DIMALIGNED DAL` · `DIMRADIUS DRA` · `DIMDIAMETER DDI` · `DIMANGULAR DAN` · `DIMCONTINUE DCO` · `DIMBASELINE DBA` · `DIMSTYLE D` (cao chữ, gạch chéo hoặc mũi tên, số lẻ, hệ số, lớp)
- Kích thước vẽ bằng DVDCAD **sửa được như AutoCAD**:
  - Chọn kích thước sẽ hiện ô nắm ở gốc đường gióng, đường kích thước và chữ. Kéo ô nắm thì số đo tự cập nhật.
  - **STRETCH** (khung cắt qua đầu đường và gốc kích thước), **MOVE**, **ROTATE**, **SCALE**, **MIRROR** đều dựng lại kích thước với số đo mới.
  - Sửa chữ kích thước trong bảng Thuộc tính hoặc `DDEDIT` để ghi đè. Để trống thì quay về số đo tự động.

**Ghi chú dẫn:** `MLEADER MLD` (mũi tên + đường dẫn + chữ) · `QLEADER LE` (đường dẫn nhiều đoạn)

**Lớp:** `LAYER LA` (quản lý: tạo lớp, bật/tắt, đóng băng, khoá, màu lớp, **kiểu nét lớp, bề rộng lớp**, lớp hiện hành) · `LAYMCUR` · `LAYISO` / `LAYUNISO` · `LAYOFF` / `LAYON` · `LAYFRZ` / `LAYTHW` · `LAYLCK` / `LAYULK` · `PURGE`

**Sửa khối:** `REFEDIT` / `BEDIT` (hoặc **kích đúp** vào khối)
- Các đối tượng khác tạm ẩn, chỉ còn khối đang sửa.
- Sửa, xoá hoặc vẽ thêm bằng mọi lệnh. Nét vẽ thêm sẽ thuộc khối.
- Bấm **Lưu cho mọi khối** thì **mọi khối cùng tên** trong bản vẽ được cập nhật, kể cả khối xoay hoặc tỉ lệ khác. Bấm **Huỷ thay đổi** để bỏ.

**Thuộc tính khối:**
- `ATTDEF` định nghĩa thuộc tính (tên, lời nhắc, giá trị mặc định) rồi gộp vào khối bằng `BLOCK`.
- Khi `INSERT` khối có thuộc tính, app hỏi giá trị cho từng thuộc tính.
- **Kích đúp** vào khối, hoặc dùng `EATTEDIT`, để sửa giá trị.
- `ATTEXPORT` xuất toàn bộ thuộc tính ra CSV (mở bằng Excel).
- Thuộc tính trong file DWG/DXF gốc (ATTRIB) cũng sửa và xuất được.

**Ảnh nền:**
- `IMAGEATTACH` chèn ảnh (ảnh chụp, bản scan): bấm điểm chèn rồi chiều rộng.
- Di chuyển, xoay, tỉ lệ ảnh như đối tượng thường.
- `IMAGEADJUST` chỉnh độ đậm và bật/tắt khung viền.
- Ảnh lưu trong trình duyệt của máy này. Khi xuất DXF chỉ ghi khung ảnh.

**Tham chiếu ngoài (XREF):**
- `XATTACH` gắn một file DWG/DXF khác làm nền. Nền này hiện mờ, chỉ xem và bắt điểm, không sửa được, không ghi vào file khi lưu. Lớp của nó có dạng `TÊNFILE|LỚP`.
- `XREF` mở bảng quản lý: nạp lại, làm mờ/rõ, gộp vào bản vẽ (Bind), mở file tham chiếu, gỡ.
- Tham chiếu tự nạp lại khi mở bản vẽ.

**Layout giấy:**
- `LAYOUT`, hoặc bấm **＋** cạnh tab Model, để tạo layout mới:
  - Chọn khổ A4 đến A0, ngang hoặc dọc.
  - Có khung bản vẽ và khung tên điền sẵn: công trình, tên bản vẽ, tỉ lệ, ngày, người thiết kế và kiểm tra, số bản vẽ.
  - Có sẵn một khung nhìn theo tỉ lệ 1:N.
- `MVIEW` thêm khung nhìn: chỉ 2 góc trên giấy, rồi nhập tỉ lệ.
- `VPEDIT` đổi tỉ lệ và vùng hiển thị (nút ⌖ = về Model bấm tâm).
- Chuột phải vào tab layout để đổi khổ giấy và khung tên, chỉnh khung nhìn, in hoặc xoá layout.
- `PLOT` khi đang ở layout in đúng khổ giấy của layout, tỉ lệ 1:1. Mép giấy và khung nhìn không in ra.

**Bảng:** `TABLE`
- Nhập số hàng, số cột, hoặc **dán vùng ô copy từ Excel**.
- Sửa bảng bằng **kích đúp** hoặc `TABLEDIT`. Trong hộp sửa có thể thêm/bớt hàng cột, đổi độ rộng cột, dán Excel vào một ô để trải ra nhiều ô.
- Bảng di chuyển, xoay, tỉ lệ như một khối.

**Kích thước nhanh:** `QDIM` — chọn hình rồi đặt vị trí, tự ghi chuỗi kích thước liên tục qua mọi điểm đầu mút. Gõ H/V để chọn ngang/dọc.

**Kích đúp** vào kích thước để sửa chữ ghi đè.

**Khối, nhóm, bộ nhớ tạm:** `INSERT I` · `BLOCK B` (lưu vào thư viện khối của bạn, chèn được vào bản vẽ khác) · `GROUP G` · `UNGROUP` · `COPYCLIP` · `CUTCLIP` · `COPYBASE` · `PASTECLIP` · `PASTEORIG` · `SELECTSIMILAR`

**Kiểu nét & bề rộng:** `LINETYPE LT` (quản lý kiểu nét: tải nét đứt, nét tâm, nét khuất… từ thư viện chuẩn, đặt hiện hành, LTSCALE) · `LTSCALE LTS` · `CELTSCALE` · `LWEIGHT LW` (bật hiện bề rộng, bề rộng hiện hành)
- Ribbon **Trang chủ › Thuộc tính** có 3 ô Màu · Bề rộng · Kiểu nét như AutoCAD. Đang chọn đối tượng thì đổi cho đối tượng đó, không chọn gì thì đặt cho đối tượng vẽ mới.
- Bản vẽ DWG/DXF mở ra **hiện đúng nét đứt** theo bảng kiểu nét và LTSCALE của file, gồm cả kiểu nét theo lớp, ByBlock trong khối và tỉ lệ riêng từng đối tượng.

**Chọn:** `QSELECT` (chọn nhanh theo loại, lớp, màu, kiểu nét, nội dung chữ, cao chữ, chiều dài, bán kính) · `SELECTSIMILAR` · `PICKSTYLE`

**Kiểu chữ:** `STYLE ST`
- Chọn font (Arial, Times New Roman, Tahoma…) và hệ số rộng. Kiểu hiện hành dùng cho TEXT, MTEXT, ghi chú dẫn và kích thước mới.
- Bảng Thuộc tính đổi được kiểu chữ và hệ số rộng của từng chữ.
- Chữ trong file DWG/DXF dùng font TrueType (kể cả VNI-Times, .VnTime) hiện theo đúng họ font.

**Ẩn tạm:**
- `ISOLATEOBJECTS` chỉ hiện các đối tượng đã chọn. `HIDEOBJECTS` ẩn các đối tượng đã chọn. `UNISOLATEOBJECTS` hiện lại tất cả.
- Thanh trạng thái có biểu tượng bóng đèn. Bóng đèn chuyển đỏ khi đang ẩn bớt đối tượng.

**Hỏi / đo:** `MEASUREGEOM MEA` (đo nhanh: rê chuột thấy ngay khoảng cách ngang/dọc tới các cạnh xung quanh) · `DIST DI` · `AREA AA` (O = chọn đối tượng) · `ID` · `LIST LI` · `DIVIDE DIV` · `MEASURE ME` · `DO` (đo nhanh, lưu dạng đánh dấu)

**Xem / file:** `ZOOM Z` (E, W, P, số, O) · `PAN` · `REGEN RE` · `NEW` · `OPEN` · `QSAVE` · `SAVEAS` · `EXPORT/PLOT` · `DSETTINGS DS` · `UNITS` · `FIND` · `COMPARE` · `DRIVE` · `SHARE`

## 3D (tab ribbon "3D", nút **3D** cạnh nút phóng to)
**Tạo khối:**
- `BOX` — hộp: 2 góc đáy + chiều cao.
- `CYLINDER CYL` — trụ. `CONE` — nón (bán kính đỉnh > 0 thành nón cụt). `SPHERE` — cầu.
- `EXTRUDE EXT` — đùn hình kín: đa tuyến kín, đường tròn, elip, hatch (giữ lỗ). Chiều cao âm thì đùn xuống.
- `PRESSPULL PP` — bấm vào trong một vùng kín rồi nhập chiều cao.
- `WALL3D` (`TUONG`) — chọn đường trục tường trên mặt bằng, nhập bề dày và chiều cao, ra tường 3D.

- `PYRAMID` — chóp đáy đa giác đều. `WEDGE` — nêm (ram dốc). `TORUS` — xuyến.
- `REVOLVE REV` — xoay biên dạng kín quanh trục. Mặc định **Đứng**: trục vẽ trên mặt bằng thành phương Z (cột, chậu, con tiện). Chọn **Nằm** để giống AutoCAD.
- `SWEEP` — quét biên dạng (tròn, đa tuyến kín) dọc đường dẫn: ống, dầm, lan can, gờ chỉ. Căn tâm hoặc đáy biên dạng vào đường dẫn.
- `ELEV` — cao độ Z đặt khối mới (ví dụ 3000 để dựng mái trên tường).

**Sửa khối:**
- `UNION UNI` (cộng), `SUBTRACT SU` (trừ: khoét lỗ, cắt bớt), `INTERSECT IN` (lấy phần giao).
- `SLICE SL` — cắt khối bằng mặt phẳng đứng qua 2 điểm, giữ một phía hoặc cả hai.
- `3DMOVE` — dời cả theo phương Z. `3DROTATE` — xoay quanh trục X, Y, Z hoặc trục nằm qua 2 điểm. `MIRROR3D` — lật trên/dưới qua mặt ngang hoặc đối xứng qua mặt đứng.
- Khối sau khi cộng/trừ/xoay 3D thành **khối lưới**: vẫn dời, xoay, tỉ lệ, đối xứng, cộng/trừ tiếp được.

**Vật liệu & hiển thị:**
- `MATERIALS` (`MAT`) — gán vật liệu: bê tông, gạch xây, gạch lát, gỗ, đá, ngói, cỏ, sơn trắng, kính, kim loại, nước. Bảng thuộc tính cũng đổi được.
- `RENDER` — khung 3D kiểu **Thực tế**: vân vật liệu, ánh sáng, bóng đổ.
- `SECTIONPLANE` — mặt cắt ngang, kéo thanh trượt để đổi cao độ cắt (xem bên trong nhà).
- `FLATSHOT` hoặc nút **Chiếu 2D** trong khung 3D — chiếu mô hình thành nét 2D theo góc nhìn hiện tại (mặt đứng, mặt bên, ISO), **đã bỏ nét khuất**, đúng tỉ lệ 1:1. Bấm điểm đặt là xong.

**Mặt phẳng làm việc (UCS):**
- `UCS` → **Mặt đứng qua 2 điểm**, **Trước**, **Bên**, **Mặt khối** (bấm vào mặt trong khung 3D), **Xoay quanh X/Y**, **Cao độ gốc**, **Điểm neo**, **Thế giới**.
- Khi UCS bật, các lệnh BOX, CYLINDER, EXTRUDE, REVOLVE, SWEEP, LOFT, PYRAMID… đặt khối lên mặt phẳng UCS. Biên dạng vẫn vẽ trên mặt bằng, quanh điểm neo, như đang nhìn thẳng vào mặt phẳng đó (X sang phải, Y lên trên). Ví dụ: vẽ ô cửa trên mặt bằng rồi EXTRUDE, ô cửa sẽ dựng đứng trên tường.
- Góc trên trái bản vẽ hiện `[UCS: …]` hoặc `[WCS]`. Khung 3D vẽ mũi tên trục UCS.

**Khối nâng cao:**
- `LOFT` — chọn các mặt cắt kín từ dưới lên (tròn, vuông, elip…), nhập khoảng cách đều hoặc danh sách cao độ (`0,800,2500`).
- `FILLETEDGE` / `CHAMFEREDGE` — bo/vát cạnh trên, dưới, cạnh đứng hoặc tất cả, cho khối hộp, khối đùn, tường và khối trụ.

**Ánh sáng, camera:**
- `SUNPROPERTIES` (`SUN`) — mặt trời theo **ngày, giờ, vĩ độ, kinh độ, múi giờ, hướng Bắc**. Mặc định là TP.HCM. Nút **▶ Bóng đổ trong ngày** chạy bóng từ 6h đến 18h.
- `LIGHT` — đặt đèn điểm: vị trí, cao độ, cường độ, màu. Đèn sáng trong kiểu xem **Thực tế**.
- `CAMERA` — bấm điểm đứng, điểm nhìn, nhập cao mắt và tên. Khung 3D mở phối cảnh từ đúng vị trí đó. Camera được lưu trong danh sách **Đã lưu…** cùng các góc nhìn bạn lưu.
- `3DWALK` hoặc nút **Đi bộ**: dùng W A S D để đi, Q/E để xuống/lên, Shift để đi nhanh, kéo chuột để nhìn quanh. Trên điện thoại có bàn phím mũi tên trên màn hình.

**Mặt cắt:**
- `SECTIONPLANE` → **Ngang** (kéo thanh để đổi cao độ) hoặc **Đứng qua 2 điểm**. Chỗ cắt được tô kín bằng gạch chéo.
- Nút **Mặt cắt → 2D** (`SECTION2D`) chèn mặt cắt thành đa tuyến + hatch ANSI31. Mặt cắt ngang có thể đặt đúng vị trí trên mặt bằng.

Trên mặt bằng, khối hiện dạng hình chiếu. MOVE, COPY, ROTATE, SCALE, MIRROR, ARRAY, ERASE dùng được như hình 2D. Bảng thuộc tính sửa được cao độ đáy, chiều cao, bán kính và xem thể tích.

**Xem 3D:** `3DORBIT` (`3DO`, `VIEW3D`) hoặc nút **3D**.
- Chuột: kéo trái để xoay, kéo phải/giữa hoặc Shift+kéo để dời, lăn để phóng, kích đúp để vừa màn hình.
- Điện thoại: 1 ngón xoay, 2 ngón dời và phóng.
- ViewCube: bấm mặt để xem Trên, Trước, Phải… Nút ⌂ về góc ISO.
- Góc nhìn chuẩn: Trên, Trước, Phải, Trái, Sau, 4 góc ISO. Gõ thẳng được `VIEWTOP`, `VIEWFRONT`, `VIEWSWISO`…
- Kiểu hiển thị: Khung dây, Tô bóng, Tô bóng + cạnh, X-quang.
- Phối cảnh hoặc song song. Bật/tắt nét 2D ở cao độ 0.
- Esc hoặc "✕ 2D" để về bản vẽ.

**Dùng lệnh ngay trong khung 3D:** bấm nút trên ribbon hoặc gõ lệnh khi đang xem 3D, không cần về 2D.
- Khi lệnh hỏi **điểm**: bấm vào khung 3D. Điểm tự bắt vào **đỉnh khối** gần con trỏ (ô vàng), hoặc điểm đặc biệt của nét 2D, hoặc điểm trên mặt phẳng cao độ hiện hành (`ELEV`). Vòng xanh và nét đứt cho thấy điểm sẽ chọn.
- Khi lệnh hỏi **chọn đối tượng**: bấm vào khối hoặc nét 2D trên mặt đất. Đối tượng được chọn viền xanh. **Enter** hoặc **chuột phải** để xong.
- Số (chiều cao, bán kính…) gõ thẳng, hiện ở dòng lệnh phía dưới.
- Không có lệnh: bấm khối để chọn (Shift để chọn thêm), rồi gọi lệnh (MOVE, ERASE, SUBTRACT…).
- **Esc** huỷ lệnh đang chạy. Bấm Esc lần nữa để về 2D. Cảnh 3D tự cập nhật sau mỗi lệnh và sau Undo/Redo.

**Xuất:** ảnh PNG, `EXPORTSTL` (in 3D, đơn vị mm), `EXPORTOBJ` (+ file MTL màu, mở bằng SketchUp, Blender, 3ds Max). Lưu DXF thì khối 3D thành mặt **3DFACE**, AutoCAD mở được. File DXF lưu từ DVDCAD mở lại vẫn là khối (sửa tiếp chiều cao, bán kính, vật liệu). File DXF/DWG có 3DFACE, file DXF có lưới POLYFACE / POLYGON MESH / MESH (SketchUp, Revit, AutoCAD xuất ra) cũng xem 3D được.

## In bản vẽ (PLOT, Ctrl+P)
Hộp thoại giống AutoCAD:
- **Khổ giấy:** A4 đến A0, chọn ngang hoặc dọc.
- **Vùng in:**
  - Toàn bản vẽ (Extents).
  - Đang hiện trên màn hình (Display).
  - Khung chọn (Window): bấm "Chọn khung trên bản vẽ" rồi chỉ 2 góc.
- **Tỉ lệ:** khít khổ giấy, hoặc in **đúng tỉ lệ 1:N** (1:50, 1:100…). Bản vẽ đơn vị mm thì 1:100 nghĩa là 1 m thật = 10 mm trên giấy. Nếu hình lớn hơn khổ giấy, hộp thoại báo trước.
- **Kiểu in:** đen trắng (monochrome), màu, hoặc thang xám. Tuỳ chọn **in bề rộng nét** theo mm thật trên giấy (mặc định 0.25 mm).
- **Xem trước** ngay trong hộp thoại.
- **Xuất:** PDF đúng khổ giấy, gửi máy in, hoặc ảnh PNG.

Trên điện thoại vẫn dùng nút Xuất như cũ.

## Lưu & mở
- Mọi thay đổi **tự lưu trên máy**, gắn với đúng file đó.
- **Ctrl+S** ghi ra DXF. Trên Edge/Chrome máy tính, sau lần chọn chỗ lưu đầu tiên, các lần sau ghi thẳng vào file. Bản vẽ đang mở từ Drive thì đồng bộ lên Drive.
- File DXF xuất ra giữ:
  - Bảng lớp (màu, bật/tắt, đóng băng, khoá, kiểu nét) và màu ByLayer.
  - Bảng kiểu nét, kiểu nét từng đối tượng và LTSCALE.
  - Kiểu chữ (font TrueType) của chữ.
  - Chữ tiếng Việt (mã Unicode).
  - Hatch, được tách thành nét hoặc vùng đặc.
  - Kích thước và khối, dạng nét rời.
- **Bản vẽ mới** (`NEW`, Ctrl+N) dùng đơn vị mm và được lưu trong mục "Gần đây".

## Khác với AutoCAD
- Chỉ lưu được **DXF**. File DWG mở để xem và sửa được, nhưng khi lưu sẽ thành DXF.
- Kích thước và khối được lưu ra DXF dạng nét rời. Kích thước tự cập nhật khi dùng STRETCH, ô nắm, MOVE hoặc SCALE lên chính kích thước. Kích thước không bám theo khi chỉ sửa riêng đường hình.
- Kích thước thẳng/chéo có sẵn trong file DWG/DXF cũng kéo ô nắm và STRETCH được. Khi sửa, kích thước được vẽ lại theo kiểu của DVDCAD: giữ cao chữ, số lẻ, mũi tên/gạch chéo. Kích thước góc và bán kính của file gốc chỉ chọn theo cụm.
- Bề rộng nét theo từng đối tượng không ghi được vào DXF R12 (AutoCAD vẫn đọc được kiểu nét).
- Hatch dò biên theo các nét **đang hiện trên màn hình**. Phóng tới vùng cần tô trước khi bấm.
- Đa tuyến có đoạn cong được lưu dạng nhiều đoạn thẳng nhỏ.
- **Không lưu được DWG.** Chưa có bộ ghi DWG miễn phí nào chạy trong trình duyệt đủ tin cậy. AutoCAD mở file DXF bình thường và lưu lại thành DWG được (Save As).
- 3D chưa có: bo cạnh tuỳ ý trên khối sau cộng/trừ (chỉ bo được hộp, khối đùn, trụ), render dò tia chất lượng ảnh chụp.
- Khối sau UNION/SUBTRACT là lưới tam giác: mặt cong hiện dạng nhiều mặt phẳng nhỏ.
- Khối ACIS (3DSOLID) của AutoCAD trong DXF đọc được: mặt phẳng, mặt trụ, nón, cầu, xuyến. Mặt cong tự do (spline, bo cạnh của AutoCAD) hiện gần đúng theo đường biên. Khối đọc vào thành khối lưới, lưu lại là 3DFACE. Đọc 3DSOLID từ file **DWG** đang thử nghiệm.
- UCS ở DVDCAD chỉ dùng cho lệnh tạo khối 3D. Nét 2D luôn vẽ trên mặt bằng XY.
- Layout chỉ chứa khung tên và khung nhìn. Muốn ghi chú thêm thì vẽ ở Model.
- Ảnh nền và file tham chiếu lưu trong trình duyệt của từng máy, không đi kèm khi chia sẻ qua Drive.
- Kiểu nét phức (chèn chữ/hình trong nét) hiện dạng nét đứt thường.
