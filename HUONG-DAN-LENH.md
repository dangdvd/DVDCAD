# DVDCAD v4o — Lệnh & thao tác kiểu AutoCAD

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

## Lệnh bổ sung (v4j)
**Vẽ & sửa:**
- `MLINE ML` — đường đôi (tường): **J** canh lề Trên/Giữa/Dưới, **S** tỉ lệ = bề rộng (mặc định 220), **C** đóng, **U** bỏ đoạn. Kết quả là một nhóm, EXPLODE để tách. `MLSTYLE` đặt vị trí các đường (vd tường có lớp trát: `0.5, 0.42, -0.42, -0.5`) và bật/tắt nắp đầu.
- `ARRAYPATH` — mảng theo đường dẫn (đường, đa tuyến, cung, tròn): chia đều số lượng hoặc theo khoảng cách, có/không xoay theo hướng đường.
- `BLEND` — nối đầu 2 đường bằng đường cong trơn. `REVERSE` — đảo chiều. `SETBYLAYER` — đưa màu, kiểu nét, bề rộng nét về ByLayer.

**Kích thước:** `DIMORDINATE DOR` (toạ độ X/Y; kéo dọc ra X, kéo ngang ra Y; **G** đặt gốc), `DIMARC` (dài cung, có ký hiệu ⌒), `CENTERMARK CM` (dấu tâm + đường tâm), `CENTERLINE CL` (đường tâm giữa 2 đường).

**Chữ:** `SCALETEXT` (đổi cỡ nhiều chữ), `JUSTIFYTEXT` (đổi canh lề mà chữ không xê dịch), `TXT2MTXT` (gộp nhiều dòng chữ đơn thành chữ nhiều dòng).

**Lớp:** `LAYMRG` (gộp lớp), `LAYDEL` (xoá lớp và mọi đối tượng trên lớp).

**Khác:** `VIEW` (lưu/gọi góc nhìn 2D đặt tên), `CAL` (máy tính: `2*(3+4)^2`, `sqrt`, `sin/cos/tan` theo độ, `pi`; kết quả chép vào clipboard), `PUBLISH` (in nhiều layout ra một PDF nhiều trang).

**3D:** `SHELL` (làm rỗng khối: bể nước, hộp — hở mặt trên/dưới hoặc kín), `INTERFERE` (kiểm tra va chạm giữa các khối, tạo khối đỏ ở lớp VA_CHAM), `MASSPROP` (thể tích, diện tích mặt, trọng tâm, khối lượng theo vật liệu), `3DARRAY` (hàng × cột × tầng, hoặc tròn).

## Bổ sung (v5e) — lệnh AutoCAD còn thiếu
**Độ trong suốt** (như AutoCAD)
- Bảng **Thuộc tính** có dòng **Độ trong suốt**: ByLayer hoặc 0–90 %. Áp dụng được cho đối tượng đang chọn và cho đối tượng mới.
- `CETRANSPARENCY`: độ trong suốt cho đối tượng mới.
- `TRANSPARENCY` (hoặc nút **TP** trên thanh trạng thái): hiện / ẩn độ trong suốt.
- Lưu và mở DXF dùng mã 440 (DXF 2004 trở lên). AutoCAD đọc đúng.

**Sửa, vẽ**
- `MPEDIT`: sửa nhiều đa tuyến một lúc. Lệnh tự đổi đường, cung thành đa tuyến, rồi cho các tuỳ chọn: Đóng / Mở, **Nối** (có khoảng hở fuzz, giữ cung), Độ rộng, Đảo chiều.
- `DIMLAYER`: lớp cho kích thước mới (`.` = lớp hiện hành).
- `DCLINEAR`: ràng buộc kích thước ngang / dọc.
- `XDLIST`: xem toàn bộ dữ liệu của một đối tượng.
- `UNDEFINE` / `REDEFINE`: tắt / bật lại một lệnh có sẵn. Gõ `.TÊN` (vd `.LINE`) để vẫn dùng lệnh gốc. Hay dùng cùng AutoLISP.

**3D**
- `MESH`: khối lưới cơ bản (hộp, trụ, nón, cầu, nêm, xuyến, chóp).
- `CONVTOMESH`: đổi khối thành lưới. `CONVTOSOLID`: đổi lưới kín thành khối đặc. `CONVTOSURFACE`: đổi khối thành mặt.
- `3DFACE`: mặt 3D qua 3–4 điểm.
- `THICKEN`: làm dày mặt phẳng (PLANESURF, 3DFACE…) thành khối.
- Tên gọi khác của xem 3D: `3DFORBIT`, `3DCORBIT`, `3DPAN`, `3DZOOM`, `3DSWIVEL`, `3DDISTANCE` (= 3DORBIT), `3DFLY` (= 3DWALK), `3DCLIP` (= SECTIONPLANE).

**File**
- `REVERT`: bỏ mọi thay đổi, mở lại bản vẽ như lúc mở file. Dùng được với file đã mở trên máy này.
- `QUIT` / `EXIT` / `QQUIT`: đóng bản vẽ. `SAVEALL`: lưu. `PREVIEW`: xem trước bản in.
- `LOGFILEON` / `LOGFILEOFF`: ghi nhật ký dòng lệnh rồi tải file `.log`.

**Giao diện**
- `RIBBON` / `RIBBONCLOSE`, `COMMANDLINE` / `COMMANDLINEHIDE`, `PROPERTIESCLOSE`, `LAYERCLOSE`, `QCCLOSE`, `GRAPHSCR`.
- `HIDEPALETTES` / `SHOWPALETTES`: ẩn / hiện các bảng.
- `NAVBAR`: hiện / ẩn thanh điều hướng.
- `WORKSPACE`: đổi Vẽ 2D / Mô hình 3D.

**Tên gọi khác**
- `CLASSICLAYER` (= LAYER), `EATTEXT` (= trích thuộc tính), `GOTOURL` (= mở liên kết), `NEWVIEW` (= VIEW), `LAYOUTWIZARD` (= LAYOUT).
- `VIEWRES`, `LAYERPMODE`, `ARRAYCLOSE` có cho đủ lệnh như AutoCAD.

**Ribbon**
- Khối đặc › Mặt lưới thêm: MESH, CONVTOMESH, CONVTOSOLID, THICKEN, 3DFACE, CONVTOSURFACE.
- MPEDIT nằm trong menu thêm của bảng Sửa.

## Bổ sung (v5d) — add-in: AutoLISP và JavaScript
**`APPLOAD` (`AP`)** (ribbon › thẻ **Add-ins** › Nạp ứng dụng): nạp add-in giống AutoCAD.
- **Nạp file…**: chọn `.lsp` (AutoLISP) hoặc `.js` (JavaScript); nạp được nhiều file một lần. Có thể nạp từ đường link.
- Cột **Khởi động** (Startup Suite): add-in tự nạp mỗi khi mở DVDCAD. **Nạp lại** / **Gỡ** từng add-in.
- **Add-in mẫu**, bấm **Cài**:
  - *QS — khối lượng*: `TONGDAI` (tổng chiều dài theo lớp), `TONGDT` (tổng diện tích vùng kín). Kết quả chèn bảng vào bản vẽ hoặc tải file CSV mở bằng Excel.
  - *Tiện ích AutoLISP*: `STT` (đánh số thứ tự), `TL` (tổng chiều dài), `DTL` (đổi lớp theo đối tượng mẫu), `KHUNGTEN` (vẽ khung bản vẽ).
- Lệnh của add-in hiện ở thẻ **Add-ins** trên ribbon.

**AutoLISP**
- `(defun c:TEN () …)` thành lệnh `TEN`.
- Gõ thẳng biểu thức ở dòng lệnh: `(+ 1 2)`, `(setq r 5)`. Khi lệnh đang hỏi, gõ `!r` để dùng giá trị biến.
- `VLISP` (`VLIDE`): bảng gõ thử mã LISP (Ctrl+Enter = chạy), có nút lưu thành add-in.
- Có các hàm thông dụng:
  - nhập liệu: `getpoint`, `getdist`, `getstring`, `initget`, `entsel`, `ssget` (kèm bộ lọc);
  - đối tượng: `entget`, `entmod`, `entmake`;
  - chạy lệnh: `(command "LINE" p1 p2 "")`, `pause`;
  - hệ thống, danh sách, chuỗi: `getvar`, `setvar`, `vl-sort`, `vl-string-…`.
- Danh sách đầy đủ trong `ADDIN-API.md` (lệnh `ADDINAPI`).

**JavaScript**: file `.js` dùng API `DVDCAD` để:
- đăng ký lệnh: `DVDCAD.addCommand`;
- hỏi điểm / chọn đối tượng: `getPoint`, `getSelection`;
- thêm / sửa / xoá đối tượng (UNDO được): `addLine`, `addText`, `modify`, `erase`;
- chạy lệnh, xuất file: `command`, `download`.

Xem `ADDIN-API.md`.

**Không chạy được:**
- `.fas` / `.vlx` (LISP đã biên dịch);
- `.dll` / `.arx` (.NET, ObjectARX);
- `.dvb` (VBA).

Đây là add-in Windows chỉ chạy trong AutoCAD. Với add-in .NET, cần viết lại phần xử lý bằng JavaScript.

## Bổ sung (v5c) — ngôn ngữ giao diện đồng bộ
- Bấm nút **Không gian làm việc** (cạnh nút Lưu) › **Ngôn ngữ giao diện** để chọn **English** hoặc **Tiếng Việt**. Lựa chọn áp dụng cho toàn bộ giao diện:
  - ribbon, thẻ, thanh trạng thái, bảng Thuộc tính, bảng Lớp;
  - dòng lệnh, lời nhắc, tuỳ chọn lệnh;
  - thông báo, hộp thoại, menu chuột phải, khung 3D, trợ giúp F1.
- Lần đầu mở app, ngôn ngữ theo trình duyệt (trình duyệt tiếng Việt → Tiếng Việt, khác → English). Chọn lại thì app nhớ cho lần sau.
- Dữ liệu bản vẽ **không** bị dịch: tên lớp, tên khối, layout, tên file và chữ trong bản vẽ giữ nguyên.
- Tên lệnh, phím tắt và chữ cái tuỳ chọn giữ như AutoCAD ở cả hai ngôn ngữ.

## Bổ sung (v5b) — giống AutoCAD hơn
**Kích thước liên kết** (như DIMASSOC = 2 của AutoCAD)
- Nếu gốc đường gióng của kích thước nằm đúng điểm đặc trưng của đường hình, kích thước tự cập nhật theo khi sửa riêng đường hình. Điểm đặc trưng gồm: đầu mút, trung điểm, tâm, góc phần tư, đỉnh đa tuyến.
- Các thao tác áp dụng: kéo ô nắm, MOVE, ROTATE, SCALE, STRETCH, MIRROR.
- Dời cả đối tượng: đường kích thước dời theo, giữ nguyên khoảng cách.
- Kích thước chéo (DIMALIGNED) xoay theo đường hình.
- Kích thước bán kính / đường kính bám theo đường tròn hoặc cung.
- Lệnh liên quan:
  - `DIMDISASSOCIATE` (`DDA`): bỏ liên kết, kích thước đứng yên.
  - `DIMREASSOCIATE` (`DRE`): chọn lại điểm gốc. Enter để giữ điểm cũ.
  - `DIMASSOC`: 2 = bám theo (mặc định), 0 / 1 = không bám.
- `DIMROTATED`: kích thước thẳng đo theo góc cho trước.

**Đa tuyến có độ rộng** (PLINE W / H, PEDIT W, TRACE, mây thư pháp, file DWG / DXF)
- Giữ đúng đỉnh thật, cung và cờ kín. Trước đây bị đổi thành đường hở nhiều đỉnh.
- Góc được lấp kiểu vát nhọn (miter) như AutoCAD.
- Vẫn giữ độ rộng khi kéo ô nắm, thêm / xoá đỉnh, FILLET / CHAMFER, OFFSET, BREAK, MOVE, ROTATE và MIRROR.
- SCALE nhân cả độ rộng. Đảo chiều (PEDIT R, REVERSE) đổi độ rộng đầu ↔ cuối.
- Lưu DXF ghi độ rộng 40 / 41 theo từng đỉnh, kèm cung.

**FILLET / CHAMFER đa tuyến (P):** góc bo thành cung thật (bulge) ngay cả với đa tuyến thẳng.

**EXPLODE đa tuyến có cung:** ra cung ARC và đoạn LINE, không còn hàng trăm đoạn nhỏ.

**3D**
- `POLYSOLID` (`PSOLID`): tường 3D như AutoCAD. Vẽ theo điểm (C = khép kín) hoặc chọn **Đối tượng** (đường, cung, tròn, đa tuyến; đối tượng gốc bị xoá như AutoCAD).
  - Tuỳ chọn **Cao / Rộng / Canh** (Trái / Giữa / Phải).
  - Góc tường nối kiểu vát nhọn. Phòng khép kín thành một khối có lỗ.
- Mặt lưới (số chia theo `SURFTAB1` / `SURFTAB2`, mặc định 6 như AutoCAD):
  - `RULESURF`: mặt kẻ giữa 2 đường. Điểm bấm trên mỗi đường quyết định đầu nào nối với đầu nào.
  - `TABSURF`: đường dẫn trượt theo đoạn thẳng chỉ hướng, hoặc **Cao** (dựng mặt đứng theo Z).
  - `REVSURF`: xoay đường biên dạng quanh một trục (đoạn thẳng), có góc đầu và góc quay. Ví dụ dùng cho chậu, bình, mái vòm.
  - `EDGESURF`: mặt Coons giới hạn bởi 4 cạnh nối đầu nhau.
  - `PLANESURF`: mặt phẳng từ 2 góc chữ nhật hoặc từ đối tượng kín.
- Hướng nhìn 3D:
  - `VPOINT`: nhập véc-tơ x,y,z, ví dụ `0,-1,0` = nhìn đứng, `1,-1,1` = ISO Tây Nam. Tuỳ chọn Xoay để nhập 2 góc.
  - `DDVPOINT`: hộp thoại 2 góc.
  - `HIDE`: khuất nét, chỉ hiện cạnh thấy được. Trong khung 3D có thêm kiểu "Khuất nét (HIDE)".

**Khác**
- `MINSERT`: chèn khối thành mảng hàng × cột.
- `ABOUT`: thông tin phiên bản.
- Tên gọi khác như AutoCAD: `EXOFFSET` (= OFFSET có E / L / M), `SAVEIMG` (PNG), `MTEDIT`, `EXCHPROP`.
- Ribbon:
  - Annotate › Kích thước: Liên kết lại / Bỏ liên kết / Xoay góc.
  - Solid: thêm bảng Mặt lưới.
  - Visualize › Điều hướng: VPOINT, DDVPOINT, HIDE.
  - Polysolid thay cho nút Dựng tường cũ. `WALL3D` vẫn dùng được.

## Bổ sung (v5a) — xem 3D cập nhật theo lớp
Khi đang xem 3D, khung nhìn tự vẽ lại sau khoảng 0,3 giây nếu có một trong các thay đổi sau:
- Bật / tắt, đóng băng / rã băng lớp: ô Lớp trên ribbon, bảng Quản lý lớp, bảng Lớp trên điện thoại, `LAYOFF`, `LAYFRZ`, `LAYON`, `LAYTHW`, `LAYISO`, `LAYUNISO`, `LAYERP`, `LAYERSTATE`.
- Đổi màu lớp. Khối đọc từ file DWG/DXF cũng đổi màu theo.
- Ẩn / hiện đối tượng: `HIDEOBJECTS`, `ISOLATEOBJECTS`, `UNISOLATEOBJECTS`.
- Mở bản vẽ khác khi 3D đang mở: khung 3D tự mở lại với bản vẽ mới.

Sửa lỗi lớp (cả ở màn hình 2D):
- `LAYISO` trước đây không tắt được lớp nào.
- `LAYUNISO` không khôi phục được trạng thái lớp.
- `LAYON` / `LAYTHW` sau khi cô lập bị bật ngược lại.

Nguyên nhân: các lệnh này sửa thẳng danh sách lớp, rồi bị trạng thái cũ của bảng Lớp ghi đè.

## Bổ sung (v4z)
**Công cụ chữ** (như Express Tools)
- `TJUST`: đổi canh lề (L, C, R, TL…BR, MC) mà chữ không dời.
- `TORIENT`: xoay chữ về góc cho trước, hoặc Enter để lật chữ bị ngược cho dễ đọc. Giữ tâm chữ.
- `TSCALE`: đổi cỡ nhiều chữ theo hệ số hoặc chiều cao mới, giữ điểm đặt.
- `TEXTFIT`: co / giãn bề rộng chữ cho vừa tới điểm chỉ định.
- `TCIRCLE`: khung tròn / khe bo 2 đầu / chữ nhật quanh chữ (ghi số hiệu trục, phòng…).

**Thuộc tính, liên kết**
- `ATTIPEDIT`: sửa tại chỗ một thuộc tính khối. `BATTORDER`: mở BATTMAN để đổi thứ tự.
- `XLIST`: xem loại / lớp / màu / kiểu nét / khối chứa của đối tượng nằm trong khối.
- `CHURLS`: đổi / xoá siêu liên kết.

**Kích thước, sửa hình**
- `DIMEX` / `DIMIM`: xuất / nhập kiểu kích thước ra file `.dvddim` để dùng chung giữa các máy.
- `MSTRETCH`: kéo giãn bằng nhiều khung cắt cùng lúc (VD nới cả 2 đầu bản vẽ một lần).

**3D → bản vẽ 2D**
- `VIEWBASE` (`HINHCHIEU`): dựng 3 hình chiếu đứng / bằng / cạnh từ khối 3D. Đã khử nét khuất, tỉ lệ 1:1.
  - **Góc chiếu thứ nhất (TCVN / ISO):** hình bằng đặt dưới, hình cạnh (nhìn từ trái) đặt bên phải.
  - **Góc chiếu thứ ba:** hình bằng đặt trên.

**Dòng lệnh, script**
- `MULTIPLE`: lặp lại một lệnh liên tục tới khi bấm Esc.
- `HISTORY` / `TEXTSCR`: cửa sổ lịch sử dòng lệnh, sao chép được.
- `DELAY`: tạm dừng trong file script `.scr`. `TEXTSTYLE`: như STYLE.

## Bổ sung (v4y) — mở file dung lượng lớn
**Tối ưu file lớn** (thử với file DXF 37 MB: 200 nghìn đối tượng, nổ khối thành 600 nghìn nét; mở trong khoảng 3 giây trên máy thử)
- Đọc DXF không còn tách cả file thành mảng dòng, bỏ các mã không dùng (100, 102, 330, 360) → bộ nhớ tạm khi đọc giảm khoảng một nửa (file 37 MB: 174 MB còn 86 MB). Quan trọng nhất trên iPhone.
- **Trước đây bản vẽ bị cắt im lặng ở 200 nghìn đối tượng.** Nay máy tính hiện tới 2 triệu, iPhone / iPad tới 400 nghìn. Vượt giới hạn thì **có thông báo** chỉ hiện phần đầu.
- **Phóng / dời mượt** với bản vẽ nặng: trong lúc thao tác dùng ảnh tạm của lớp nét (vài ms mỗi khung). Ngừng tay khoảng 0,16 giây thì vẽ lại đầy đủ, nét sắc.
- Vẽ nhanh hơn:
  - Nét cùng màu / bề rộng / kiểu nét được gom thành một lần vẽ, kể cả khi các lớp xen kẽ nhau.
  - Đường tròn / cung dùng hàm vẽ cung của trình duyệt.
  - Chữ không còn lưu / khôi phục trạng thái canvas từng chữ.
  - Chữ nhỏ dưới 4 px hiện thành vệt mờ.
  - Bản vẽ trên 300 nghìn nét bỏ qua nét nhỏ hơn 1 px.
- File DXF trên 3 MB: hiện thông báo "Đang mở file … MB" trong lúc đọc.
- `QTEXT` (chữ hiện thành khung) và `FILL` Tắt (hatch chỉ hiện biên) giúp vẽ còn nhanh hơn với bản vẽ rất nặng.

**Lệnh mới**
- `QTEXT`, `FILL`: xem ở trên. `ATTDISP`: ẩn / hiện thuộc tính khối.
- `RECOVER`: mở file DXF / DWG bị lỗi rồi tự chạy `AUDIT` kiểm tra và sửa.
- `DIMJOGLINE`: ký hiệu gấp khúc trên đường kích thước (kích thước không đúng tỉ lệ). Bấm vị trí đặt; từ khoá Bỏ để xoá.
- `DIMINSPECT`: khung kiểm tra cho kích thước (nhãn | giá trị | tần suất, VD "KT | 1000 | 100%"); Bỏ khung.
- `DIMREGEN`: dựng lại toàn bộ kích thước. Ký hiệu gấp khúc và khung kiểm tra vẫn giữ khi kéo nắm, DIMREGEN, lưu DXF.
- `GATTE`: đổi giá trị một thuộc tính cho mọi bản chèn cùng khối (VD đổi mác bê tông cho mọi cột).
- `XEDGES`: lấy cạnh khối 3D thành đường 2D (hình chiếu bằng).
- `VPMAX` / `VPMIN`: phóng khung nhìn của layout ra cả màn hình để xem / sửa ở Model, rồi quay lại layout.
- `MSPACE` / `PSPACE`: chuyển Model ↔ layout giấy. `PAGESETUP`: mở hộp thoại In.

## Bổ sung (v4x)
**REVCLOUD — khoanh mây như AutoCAD**
- Sửa lỗi cung bị lật vào trong: cung luôn **lồi ra ngoài**. Mây là đa tuyến có cung thật, lưu DXF ra LWPOLYLINE có cung.
- Từ khoá:
  - **Độ dài cung**: nhập độ dài cung nhỏ nhất và lớn nhất; khác nhau thì cung dài ngắn xen kẽ như vẽ tay. Chưa đặt thì tự lấy theo mức phóng.
  - **Chữ nhật**: 2 góc. **Đa giác**: bấm các đỉnh, Enter để khép.
  - **Tự do**: bấm điểm đầu rồi rê chuột / ngón tay theo đường mây; về gần điểm đầu là mây kín.
  - **Đối tượng** (mặc định khi Enter): đổi đường tròn, elip, đa tuyến, cung, đường thẳng thành mây. Biên hatch thì tạo thêm mây theo biên, hatch giữ nguyên. Có hỏi **đảo chiều cung**.
  - **Kiểu**: Thường / Thư pháp (nét đậm nhạt).
  - **Sửa mây**: mở `REVCLOUDPROPERTIES`.
- Cài đặt được nhớ cho lần sau.
- `REVCLOUDPROPERTIES` (RCP): chọn mây đã vẽ để đổi độ dài cung, kiểu, đảo chiều. Mây đã dời / xoay / tỉ lệ vẫn sửa được.

**Lệnh mới khác**
- `DIMOVERRIDE`: ghi đè cho từng kích thước đã vẽ: cao chữ, số lẻ, mũi tên, hệ số đo, tiền tố / hậu tố, cỡ mũi tên, khe chữ. **Xoá ghi đè** đưa kích thước về kiểu hiện hành.
- `BLOCKREPLACE`: thay mọi bản chèn của khối A bằng khối B, giữ vị trí, góc xoay, tỉ lệ và giá trị thuộc tính cùng tên.
- `MOCORO`: dời / sao chép / xoay / tỉ lệ liên tiếp quanh một điểm gốc.
- `TCASE`: đổi kiểu chữ Câu / thường / HOA / Tiêu Đề / đẢO, đúng cả chữ tiếng Việt có dấu.
- `CDORDER`: sắp thứ tự hiển thị theo màu, màu ghi trước nằm trên cùng.
- `HATCHGENERATEBOUNDARY`: tạo đa tuyến biên từ hatch. `HATCHSETBOUNDARY`: đặt lại biên hatch theo đối tượng kín khác.
- `LAYTRANS`: chuyển lớp theo bảng ánh xạ (đổi tên hoặc gộp lớp theo chuẩn công ty). Lưu được bảng để dùng cho bản vẽ khác. Lớp nguồn được xoá sau khi chuyển.
- `SHOWURLS`: danh sách đối tượng có siêu liên kết, có nút phóng tới và mở link.
- `GETSEL`: chọn theo lớp + loại đối tượng mẫu. `SSX`: chọn cùng loại với mẫu, lọc thêm theo lớp / màu / kiểu nét.
- `XPLODE`, `ARRAYCLASSIC`: gọi lại EXPLODE, ARRAY.
- Đa tuyến có độ rộng, đoạn cong: phần tô liền mạch, không còn răng cưa.

## Bổ sung (v4w)
**Kích thước**
- `DIM` — kích thước thông minh như AutoCAD 2016+: bấm vào đường → kích thước thẳng / chéo; đường tròn → đường kính; cung → bán kính; bấm tiếp đường thứ hai (hoặc từ khoá Góc) → kích thước góc; bấm chỗ trống hoặc bắt điểm → kích thước theo 2 điểm (tự ngang / dọc theo vị trí đặt). Lặp lại tới khi Enter / Esc.
- `DIMANGULAR`: chọn đường nào trước cũng được.

**Tường MLINE**
- `MLEDIT` — sửa chỗ giao của đường đôi: **Chữ thập kín / hở / liền**, **Chữ T kín / hở** (thân chữ T tự kéo dài / tỉa tới mép tường ngang, mép tường ngang được mở đúng bề rộng), **Góc** (2 tường gặp nhau, mép ngoài nối mép ngoài, mép trong nối mép trong). Nắp đầu tường ở chỗ nối được bỏ.
- **MLINE trong file AutoCAD** (DXF / DWG) nay hiện đúng thành đường đôi (trước đây bị bỏ qua) và dùng được MLEDIT.

**Thuộc tính khối**
- `ATTSYNC` — đồng bộ mọi bản chèn của khối theo định nghĩa: thêm thuộc tính mới (giá trị mặc định), bỏ thuộc tính thừa, giữ giá trị đã nhập; vị trí / cỡ theo tỉ lệ từng bản chèn.
- `BATTMAN` — bảng quản lý thuộc tính khối: sửa lời nhắc, giá trị mặc định, đổi thứ tự, xoá thuộc tính → áp dụng cho mọi bản chèn (và định nghĩa trong thư viện của tôi).
- Mở DXF: giữ định nghĩa thuộc tính (ATTDEF) của khối → `INSERT` khối của file có hỏi giá trị thuộc tính như AutoCAD.

**Ghi chú dẫn**
- `MLEADEREDIT` — thêm / bỏ mũi tên của ghi chú dẫn (một nội dung chỉ vào nhiều chỗ).
- `MLEADERALIGN` — căn các ghi chú thẳng hàng theo ghi chú mẫu (mặc định dọc, hoặc theo hướng chỉ định).
- `MLEADERCOLLECT` — gom nhiều ghi chú thành một (nối các dòng chữ, giữ đủ mũi tên).

**Đa tuyến có độ rộng**
- `PLINE` thêm **W** (độ rộng đầu / cuối) và **H** (nửa độ rộng) — vẽ nét đậm, mũi tên vát như AutoCAD.
- `PEDIT` → **W**: đổi độ rộng cả đa tuyến (0 = nét mảnh). `TRACE` vẽ nét rộng.
- Lưu DXF giữ độ rộng (mã 40 / 41); đa tuyến rộng di chuyển / xoay / tỉ lệ / đối xứng đúng phần tô.

**3D và tiện ích**
- `3DSCALE` — tỉ lệ khối 3D cả chiều cao quanh điểm gốc (X, Y, Z).
- `FILTER` — lọc chọn nhiều điều kiện cùng lúc: loại, lớp (dùng * ?), màu (ACI / #rrggbb / bylayer), kiểu nét, tên khối, chữ chứa, chiều dài, bán kính, cao chữ; đảo ngược; lưu bộ lọc để dùng lại.
- `PASTEBLOCK` — dán bộ nhớ tạm thành một khối (tên A$C…).
- `LIMITS` — giới hạn bản vẽ; **BẬT** thì không cho bấm điểm ngoài giới hạn; ghi vào $LIMMIN / $LIMMAX khi lưu DXF.
- `POLAR` — bật / tắt bắt góc cực, đặt góc bước. `VISUALSTYLES` — chọn kiểu hiển thị 3D. `DWGCOMPARE` — so sánh 2 bản vẽ.

## Bổ sung (v4v) — xem 3D file DWG 2007 trở lên
- Khối 3D (3DSOLID) trong file **DWG 2007 trở lên** nay đọc được (trước đây bị bỏ qua nên bấm 3D chỉ thấy nét 2D). Ví dụ một bản vẽ tầng có 196 khối tường, sàn, cột, cầu thang: hiện đủ trong chế độ 3D.
- Khối trên lớp đóng băng / tắt vẫn ẩn như AutoCAD (bật lớp trong bảng Lớp để thấy).

## Bổ sung (v4u) — lưu DXF 2018
Lưu DXF (Ctrl+S, SAVEAS, xuất DXF, gửi máy chủ DWG) nay mặc định ghi **DXF 2018 (AC1032)** — đúng định dạng AutoCAD 2018–2025 lưu ra.
- Có đủ phần AutoCAD 2018 cần: CLASSES, vật liệu ByBlock / ByLayer / Global, kiểu ghi chú dẫn MLEADERSTYLE Standard, danh sách tỉ lệ (1:1), từ điển màu / kiểu bảng / kiểu hiển thị; lớp gắn vật liệu, khối ghi đơn vị chèn.
- **Chữ tiếng Việt ghi thẳng UTF-8** (không còn mã \U+), **màu RGB** luôn ghi được (không phải đổi phiên bản).
- `DXFVERSION` chọn: **2018** (mặc định), 2013, 2010, 2007, 2004, 2000, Tự động (2000 / 2004 như bản cũ), R12. Máy đang để "Tự động" (mặc định cũ) được chuyển sang 2018 một lần; đã chọn phiên bản khác thì giữ nguyên.
- **Mở DXF:** đọc **màu RGB của lớp** (đối tượng theo lớp hiện đúng màu RGB) và giữ cả **lớp rỗng** (lớp chưa có đối tượng) như AutoCAD.

## Bổ sung (v4t)
**DXF giữ thêm:**
- **Màu RGB** (true color, mã 420): bản vẽ có màu RGB thì tự lưu DXF **R2004**; mở lại giữ đúng màu.
- **Vùng che** ghi thành thực thể **WIPEOUT** thật (AutoCAD che đúng, sửa được).
- **Thứ tự vẽ** (DRAWORDER, TEXTTOFRONT…) ghi theo thứ tự trong file → AutoCAD hiện đúng trên / dưới.
- **HATCH DOTS, EARTH, AR-CONC** ghi thành HATCH có định nghĩa đường mẫu (không còn nổ thành nét / điểm).
- **Ràng buộc tham số, khối động, chú thích theo tỉ lệ, trường (field)…** ghi kèm (XDATA + XRECORD `DVDCAD_DATA`) → mở lại file DXF bằng DVDCAD, ràng buộc vẫn hoạt động.
- **Kiểu nét có hình**: số hình ltypeshp.shx đúng chuẩn, hình vẽ đúng theo định nghĩa SHP (TRACK1, ZIG, BOX, CIRC1, BAT, AMZIGZAG).
- `DXFVERSION` thêm **R2007**: chữ tiếng Việt ghi thẳng UTF-8 (phần mềm khác ngoài AutoCAD đọc đúng dấu).

## Bổ sung (v4s) — lưu DXF R2000
Lưu DXF (Ctrl+S, SAVEAS, xuất DXF, gửi máy chủ DWG) nay ghi **DXF R2000 (AC1015)** — đầy đủ cấu trúc của AutoCAD 2000+: handle, BLOCK_RECORD, OBJECTS (dictionary, layout Model / Layout1).
- **Bề rộng nét** từng đối tượng và từng lớp (mã 370) — in ra đúng nét đậm / mảnh.
- **LWPOLYLINE** có cung; **MTEXT** cho chữ nhiều dòng (giữ xuống dòng, ký tự { } \\); **TEXT** tiếng Việt dạng \U+.
- **HATCH thật**: tô đặc, mẫu ANSI31 / ANSI32 / ANSI37 / NET / LINE / BRICK kèm định nghĩa đường mẫu (AutoCAD sửa hatch được). DOTS, EARTH, AR-CONC (v4t) cũng ghi thành HATCH có đường mẫu.
- **ELLIPSE**, **XLINE**, **RAY**, **3DFACE** (khối 3D, mở lại trong DVDCAD vẫn là khối).
- **Kiểu nét phức**: chữ trong nét (GAS…) và hình (ltypeshp.shx).
- Khối + thuộc tính (BLOCK / INSERT / ATTDEF / ATTRIB), kích thước thẳng / bán kính / đường kính / góc (DIMENSION) như bản trước.
- Đã kiểm tra bằng 2 bộ đọc độc lập: ezdxf (0 lỗi cấu trúc) và LibreCAD.

Khi mở file: hatch có mẫu cùng tên trong DVDCAD (ANSI31, NET, BRICK…) nay hiện đúng mẫu, tỉ lệ, góc; đường tròn / cung / elip trong khối giữ nguyên là đường tròn / cung / elip (trước đây thành đa tuyến).

`DXFVERSION`: chọn R2000 (mặc định) hoặc R12 (phần mềm cũ). Output → Export.

## Bổ sung (v4r)
**Cắt, nối, bo góc giữ cung:** TRIM, BREAK / BREAKATPOINT, EXTEND (đầu thẳng), JOIN (nối đoạn thẳng + cung + đa tuyến), FILLET / CHAMFER đa tuyến (một góc hoặc **P** cả đa tuyến) và REVERSE / PEDIT đảo chiều đều giữ cung thật — cung cắt ra vẫn đúng tâm, bán kính; bo góc tạo cung thật (bulge) thay vì nhiều đoạn nhỏ.

**Từ khoá ưu tiên hơn lệnh trong suốt:** trong lời nhắc có từ khoá **P** (FILLET → Đa tuyến…), gõ P chọn từ khoá thay vì PAN.

**Lưu DXF:** kích thước góc lưu thành DIMENSION 3 điểm. Bản khối bị sửa riêng lưu thành khối biến thể (`COT$1`…) thay vì nét rời.

**Kiểu nét có hình:** đọc hình (shape) trong kiểu nét từ DXF / DWG và vẽ gần đúng; LINETYPE → Tải có thêm FENCELINE1 (tròn), FENCELINE2 (vuông), TRACKS, ZIGZAG, BATTING. Nét đứt nay bắt đầu đúng vị trí mẫu như AutoCAD (mẫu bắt đầu bằng khoảng hở hoặc có hai đoạn liền ở hai đầu).

**DATALINKURL** (Insert → Linking & Extraction): bảng lấy từ đường link Google Sheets (chia sẻ “Bất kỳ ai có liên kết”) hoặc file CSV / XLSX trên mạng. `DATALINKUPDATE` tải lại ngay — dùng được trên iPhone / iPad; khi quay lại cửa sổ, DVDCAD kiểm tra (tối đa 1 lần / phút) và báo nếu trang tính đã đổi.

## Bổ sung (v4q)
**Đa tuyến có cung giữ đúng cung:** đa tuyến từ file DWG/DXF, PLINE chế độ cung (**A**), vùng, PDF nhập vào… giữ đỉnh gốc và cung (bulge):
- MOVE, COPY, ROTATE, MIRROR, SCALE, ô nắm giữ nguyên cung. Ô nắm giữa cung kéo để đổi độ cong.
- OFFSET đa tuyến có cung ra đúng cung (bán kính tăng/giảm), góc vuông nối đúng.
- Bắt điểm tâm (CEN) và điểm giữa cung (MID) trên đa tuyến.
- Lưu DXF ghi bulge (mã 42) — AutoCAD mở ra là cung thật.

**Lưu DXF giữ khối và kích thước:**
- Khối lưu thành BLOCK + INSERT (đúng điểm chèn, tỉ lệ, góc xoay), thuộc tính thành ATTDEF / ATTRIB → AutoCAD nhận ra khối, sửa thuộc tính được.
- Kích thước thẳng, bán kính, đường kính lưu thành DIMENSION (khối *D + điểm định nghĩa) → AutoCAD nhận là kích thước.
- Vùng (REGION) có lỗ ghi kèm dữ liệu DVDCAD, mở lại vẫn là vùng.

**HATCH tự mở rộng vùng dò:** bấm trong vùng kín lớn hơn màn hình vẫn tìm đúng biên, không cần phóng ra trước.

**Kiểu nét phức có chữ:** đọc chữ trong kiểu nét từ DXF / DWG (GAS_LINE, HOT_WATER_SUPPLY…) và vẽ chữ dọc theo nét, tự lật cho dễ đọc. LINETYPE → Tải có thêm GAS_LINE, HOT_WATER_SUPPLY, CAP_NUOC (CN), THOAT_NUOC (TN), DIEN (Đ), PCCC (CC).

**DATALINK theo dõi file Excel** (Chrome / Edge máy tính): chọn file một lần, DVDCAD nhớ file gốc. Khi quay lại cửa sổ mà file Excel đã sửa, góc màn hình hiện **“Liên kết dữ liệu đã thay đổi”** → bấm **Cập nhật bảng** là bảng đọc lại file, không phải chọn lại. `DATALINKUPDATE` cũng tự đọc file gốc.

**Kiểu in .ctb xuất ra file:** trong `STYLESMANAGER` bấm **Xuất .ctb** → được file `.ctb` đúng định dạng AutoCAD, chép vào thư mục Plot Styles để dùng chung với AutoCAD.

## Bổ sung (v4p)
**Kiểu in theo màu (.ctb):** `STYLESMANAGER` (hoặc `CTB`, `PLOTSTYLE`; Output → Plot → Kiểu in .ctb):
- **Nhập .ctb** — đọc file kiểu in của AutoCAD (monochrome.ctb, file của công ty…): màu in, bề rộng nét, độ đậm (screening) cho từng màu 1–255.
- **Mới…** — tạo từ mẫu: monochrome, DVD-VN (màu → bề rộng nét kiểu văn phòng VN: đỏ 0.13, vàng 0.18, xanh lá 0.25, lục lam 0.35, xanh dương 0.50, tím 0.30, trắng 0.20, 8/9 0.09), Screening 50%, Màu 8/9 xám nhạt.
- Sửa từng màu: màu in (theo đối tượng / đen / màu khác), bề rộng nét, độ đậm %. **Áp cho mọi màu…** để đổi hàng loạt.
- Trong hộp thoại **PLOT**, mục **Kiểu in** có thêm các kiểu `.ctb` đã lưu và nút ✎ để sửa. Bề rộng nét theo CTB chỉ in khi bật “In bề rộng nét”.

**Bảng từ Excel / CSV:**
- `DATALINK` (`TABLEIMPORT`; Insert → Linking & Extraction, Annotate → Tables): chọn file .xlsx / .xls / .ods / .csv, chọn trang tính, vùng ô (vd `A1:F20`), cao chữ, hàng tên cột, hàng tiêu đề; xem trước rồi chèn bảng.
- `DATALINKUPDATE`: sửa file Excel xong, chạy lệnh và chọn lại file → các bảng liên kết tới file đó cập nhật nội dung (giữ bề rộng cột, thêm/bớt hàng).
- `TABLEEXPORT`: xuất bảng ra CSV hoặc Excel (.xlsx).

**Vùng 2D (region):**
- `REGION`: chọn đa tuyến kín, đường tròn, elip, hoặc các đoạn thẳng / cung / đa tuyến hở nối đầu-cuối thành vòng kín → mỗi vòng thành một vùng (xoá nét gốc).
- `UNION`, `SUBTRACT`, `INTERSECT`: chọn vùng 2D thì cộng / trừ / lấy giao vùng (kết quả có lỗ được nhóm lại, cung tròn được dựng lại thành cung); chọn khối 3D thì làm như trước.
- `MASSPROP` chọn vùng: diện tích, chu vi, hộp bao, trọng tâm, mô men quán tính, tích quán tính, bán kính quán tính (tính cả lỗ).

**Xoay lưới / ortho:** `SNAPANG` — nhập góc, **D** lấy theo một đoạn thẳng, **B** đặt điểm gốc. Lưới, SNAP, ORTHO (F8), POLAR và truy bắt đều theo góc mới (vẽ công trình nằm xiên). `SNAPANG 0` để trả về. Thêm lệnh `SNAP` (bật/tắt/bước), `GRID` (bật/tắt/khoảng), `ORTHO`, `SNAPBASE`.

**Sửa đa tuyến bằng nắm kéo:** chọn đa tuyến, **chuột phải** lên ô nắm:
- Ô nắm đỉnh: **Thêm đỉnh** (sau đỉnh đó), **Xoá đỉnh**.
- Ô nắm giữa đoạn: **Thêm đỉnh**, **Đổi thành cung** (bấm điểm cung đi qua) / **Đổi thành đoạn thẳng**.

**OFFSET** có thêm tuỳ chọn như AutoCAD: **E** Xoá nguồn (Có/Không), **L** Lớp (Hiện hành / Theo nguồn), **M** Nhiều lần (mỗi lần bấm tạo thêm một bản cách đều từ bản vừa tạo), **U** Hoàn tác. Cài đặt được nhớ cho lần sau.

**Tool Palettes:** kéo một mục thả lên bản vẽ — ký hiệu chèn đúng chỗ thả, khối chèn tại chỗ thả, mẫu hatch thả vào trong vùng kín thì tô vùng đó, lệnh thì chạy lệnh. Bấm như cũ vẫn dùng được.

**PDFIMPORT:** cung và đường tròn trong PDF thành ARC / CIRCLE thật (bắt điểm tâm được), đa tuyến có bo góc giữ đoạn cong. PDF ảnh quét (không có nét vector) tự chèn thành ảnh nền đúng tỉ lệ; hoặc chọn **Ảnh (bản quét)**.

**MLEADERSTYLE:** kiểu ghi chú dẫn — mũi tên tam giác đặc / rỗng / chấm / gạch chéo / không có, cỡ mũi tên, độ dài gờ, cao chữ, khung quanh chữ.

**Lệnh nhỏ:**
- `COUNT` đếm khối theo tên (cả bản vẽ hoặc vùng chọn), bấm **Chọn** để chọn các khối đó, hoặc chèn bảng thống kê.
- `DBLIST` (thống kê đối tượng theo loại / lớp), `COLOR` (màu hiện hành: số ACI, ByLayer, tên màu, #rrggbb), `BASE` (điểm gốc chèn).
- `SELECT`, `JPGOUT` / `PNGOUT` (xuất khung nhìn thành ảnh), `CLEANSCREENON` (**Ctrl+0**), `COPYHIST` (chép lịch sử lệnh).

## Bổ sung (v4o)
**Kiểm tra chính tả tiếng Việt chạy offline:** `SPELL` kiểm tra theo quy tắc ghép vần tiếng Việt (âm đầu, vần, dấu thanh, c/k, g/gh, ng/ngh, qu…) — không cần từ điển của máy. Gợi ý lấy từ các từ đúng trong bản vẽ và từ vựng xây dựng thường dùng. Mỗi từ: **Thay** / **Bỏ qua** / **+ Từ điển** (từ điển riêng lưu trên máy). Có tuỳ chọn kiểm tra cả từ không dấu. `SPELLBROWSER` dùng bộ kiểm tra của trình duyệt như trước.

**VPORTS:** mỗi khung nhìn xoay được riêng (xoay quanh tâm khung), giữ góc xoay khi chuyển khung.

**Hatch liên kết vùng ghép:** hatch trong vùng kín ghép từ nhiều đoạn thẳng / cung / đa tuyến cũng tự liên kết; sửa một trong các nét biên thì vùng tô dựng lại theo.

**DIMBREAK:**
- Chỗ ngắt tự cập nhật khi nét cắt qua bị dời / sửa / xoá.
- Dùng được cho cả kích thước có sẵn trong file DWG/DXF dạng nét rời; **R** trả lại nét gốc.

**MIRRTEXT:** `MIRRTEXT 1` thì MIRROR lật cả chữ như AutoCAD (ghi ra DXF đúng cờ chữ ngược); mặc định 0.

**Tool Palettes** (`TOOLPALETTES`, **Ctrl+3**, tab View): bảng nổi kéo được với 4 thẻ:
- **Lệnh** — lệnh hay dùng.
- **Ký hiệu** — mũi tên Bắc, đầu trục, cao độ (mặt đứng / mặt bằng), ký hiệu mặt cắt, chi tiết, độ dốc, mũi tên cầu thang, tam giác sửa đổi, cửa đi 1 / 2 cánh, cửa sổ, cột, bàn cầu, lavabo. Ký hiệu chú thích tự theo tỉ lệ chú thích (CANNOSCALE); cửa, thiết bị theo kích thước thật.
- **Hatch** — bấm mẫu để tô ngay. **Khối** — thư viện khối của bạn.
- Lệnh `SYMBOL` để chèn ký hiệu từ dòng lệnh.

**DesignCenter** (`ADCENTER`, `DC`, **Ctrl+2**): mở một bản vẽ DWG/DXF khác, chèn **khối** của file đó vào bản vẽ hiện hành (giữ đúng màu, lớp), thêm **lớp**, nạp **kiểu nét**.

**Nhập PDF** (`PDFIMPORT`, tab Insert → Import): đọc PDF vector (bản in từ AutoCAD, Revit…) thành nét (lớp PDF_Geometry), chữ (PDF_Text), vùng tô (PDF_Solid Fills); chọn trang, tỉ lệ 1:N, điểm chèn. Giữ màu nét. Cung / đường tròn nhập thành ARC / CIRCLE; PDF ảnh quét chèn thành ảnh nền (v4p).

## Bổ sung (v4n)
**Nhiều khung nhìn trong Model:** `VPORTS` — chia màn hình 1, 2 (dọc/ngang), 3, 4 khung (View → Model Viewports). Bấm vào khung để làm hiện hành; mỗi khung phóng, kéo, ZE riêng. **J** = gộp về một khung.

**Mảng liên kết (như AutoCAD 2012+):** `ARRAYRECT`, `ARRAYPOLAR`, `ARRAYPATH` tạo mảng liên kết (một nhóm). Sửa bằng `ARRAYEDIT` (số cột, số hàng, khoảng cách, số phần tử, góc lấp đầy, xoay) hoặc ngay trong **bảng Thuộc tính** khi chọn mảng. Dời / sao chép mảng vẫn sửa được. `ARRAYASSOCIATIVITY 0` để tạo đối tượng rời. EXPLODE để tách.

**Hatch liên kết đường biên:** hatch trong đa tuyến kín / đường tròn / elip tự liên kết; sửa, kéo nắm, STRETCH đường biên thì hatch đổi theo. Xoá đường biên thì hatch thôi liên kết. `HATCHASSOC` gắn lại / bỏ liên kết.

**Kiểm tra chính tả:** `SPELL` (`SP`) — liệt kê chữ trong bản vẽ (hoặc vùng chọn), gạch đỏ từ sai theo từ điển của trình duyệt (tiếng Việt / tiếng Anh), sửa trực tiếp rồi Áp dụng.

**Biến hệ thống:** `SETVAR` (hộp thoại) hoặc gõ thẳng tên biến: `OSMODE` (mã bit như AutoCAD), `ORTHOMODE`, `SNAPMODE`, `GRIDMODE`, `POLARANG`, `APERTURE`, `PICKBOX`, `CLAYER`, `CECOLOR`, `CELTYPE`, `CELWEIGHT`, `TEXTSIZE`, `OFFSETDIST`, `FILLETRAD`, `PDMODE`, `PDSIZE`, `INSUNITS`, `WIPEOUTFRAME`… `PTYPE` — chọn kiểu điểm.

**Vẽ trục đo:** `ISODRAFT` (mặt Trái / Trên / Phải, **F5** đổi mặt, nút ISO ở thanh trạng thái) — ORTHO đi theo trục 30° / 90° / 150°. `ISOCIRCLE` vẽ vòng tròn trục đo (elip) theo mặt hiện hành.

**Khác:** `XCLIP` (cắt hiển thị khối / XREF theo khung), `IMAGECLIP`, `GROUPEDIT` (thêm / bớt / đổi tên nhóm), `HYPERLINK` + `OPENLINK` (Ctrl + bấm để mở liên kết), `DIMBREAK` (ngắt đường kích thước chỗ cắt nét khác), `PURGE` (hộp thoại: lớp, kiểu nét, khối động không dùng), `OPTIONS` (`OP`), `STATUS`, `REGENALL`.

## Lệnh bổ sung (v4m)
**Bắt điểm mới:** `EXT` (Kéo dài — rê qua đầu mút một đoạn rồi đi theo phần kéo dài của nó), `PAR` (Song song — rê qua một đoạn, rồi vẽ song song với đoạn đó), `GCE` (Tâm hình học của đa tuyến kín). Gõ trong lúc chọn điểm hoặc bật trong Drafting Settings.

**Vẽ:**
- `CIRCLE` ▾ thêm **Tan, Tan, Radius** (`CIRCLETTR`, `TTR`) và **Tan, Tan, Tan** (`CIRCLETTT`, đường tròn tiếp xúc 3 đối tượng).
- `SOLID` (`SO`) — tô đặc tam giác/tứ giác nối tiếp như AutoCAD. `SKETCH` — vẽ phác tay. `HELIX` — xoắn ốc. `BREAKLINE` — đường cắt ngắn có ký hiệu gãy.
- `GRADIENT` (`GD`) — tô chuyển màu (tuyến tính / toả tròn, chọn 2 màu, góc).

**Sửa:**
- `EXTRIM` — chọn đường kín, bấm phía cần cắt: mọi nét cắt qua đường kín bị cắt bỏ phía đó.
- `COPYM` — sao chép nhiều: **R** lặp lại, **D** chia đều, **M** theo khoảng, **A** mảng.
- `SPLINEDIT` (`SPE`) — đóng/mở, sửa/thêm/xoá điểm qua, đảo chiều, chuyển thành đa tuyến.
- `HATCHEDIT` (`HE`) — đổi mẫu, tỉ lệ, góc, tô đặc, chuyển màu của hatch có sẵn.
- `CHPROP` (`CHANGE`) — đổi màu (số ACI / tên / #rrggbb), lớp, kiểu nét, tỉ lệ nét, bề rộng nét qua dòng lệnh.
- `FLATTEN` — khối 3D thành nét 2D hình chiếu bằng. `BURST` — phá khối, thuộc tính thành chữ thường. `NCOPY` — chép nét nằm trong khối ra ngoài.

**Chữ & bảng:**
- `FINDREPLACE` (`REPLACE`) — tìm và thay thế chữ trong chữ, thuộc tính khối, kích thước, bảng.
- `TCOUNT` — đánh số thứ tự (theo X, Y hoặc thứ tự chọn; thay / thêm trước / thêm sau / thay ký tự #).
- `TEXTMASK` / `TEXTUNMASK` — che nền dưới chữ. `ARCTEXT` — chữ uốn theo cung. `TEXTALIGN` (`TA`) — căn thẳng nhiều chữ.
- `FIELD` — chèn trường tự cập nhật: ngày, tên bản vẽ, người vẽ, tiêu đề, **diện tích / chiều dài đối tượng** (đổi ra m², m). Sửa đối tượng rồi gõ `UPDATEFIELD`. Trường có nền xám (không in).
- **Bảng có công thức** như AutoCAD: ô bắt đầu bằng `=`, vd `=B2*C2`, `=SUM(D2:D8)`, `=AVERAGE(A1:B4)`, `MIN`, `MAX`, `COUNT`.

**Kích thước:** `DIMSPACE` (giãn đều các kích thước song song, A = tự động), `DIMTEDIT` (dời chữ / canh trái, phải, giữa), `DIMEDIT` (chữ mới với `<>` = số đo, về gốc, khôi phục số đo), `DIMJOGGED` (bán kính gấp khúc), `TOLERANCE` (khung dung sai hình học GD&T).

**Lớp:** `LAYCUR` (đổi sang lớp hiện hành), `LAYMCH` (theo lớp đối tượng đích), `COPYTOLAYER` (sao chép sang lớp khác, có thể dời), `LAYWALK` (duyệt lớp — chỉ hiện lớp đang chọn), `LAYERP` (trả lại thiết lập lớp trước), `LAYERSTATE` (`LAS` — lưu / gọi lại trạng thái lớp).

**Khối & file:** `WBLOCK` (`W` — ghi đối tượng / khối / toàn bản vẽ ra DXF riêng), `RENAME` (đổi tên lớp, khối).

**Tiện ích:**
- `ALIASEDIT` — đặt lệnh tắt riêng hoặc **nhập file acad.pgp** của bạn (dòng `CC, *COPY`).
- `SCRIPT` — chạy file script AutoCAD `.scr` (dấu cách = Enter như AutoCAD).
- `AUDIT` (kiểm tra & sửa lỗi bản vẽ), `DWGPROPS` (tiêu đề, người vẽ, thống kê), `TIME`, `PLAN`.
- Tab ribbon **Express Tools** gom các lệnh Express quen thuộc (BURST, NCOPY, TCOUNT, TEXTMASK, ARCTEXT, EXTRIM, COPYM, FLATTEN, BREAKLINE, LAYWALK, ALIASEDIT…).

## Giao diện ribbon giống AutoCAD (v4l)
Bố cục tab, bảng và biểu tượng theo AutoCAD để người dùng AutoCAD tìm lệnh ở đúng chỗ quen thuộc.
- **Không gian làm việc** (nút cạnh thanh truy cập nhanh, hoặc View → Interface → Workspace):
  - **Drafting & Annotation:** Home · Insert · Annotate · Parametric · View · Manage · Output · Collaborate.
  - **3D Modeling:** Home (Modeling, Solid Editing, Draw, Modify, Section, Coordinates, View, Layers) · Solid · Visualize · và các tab chung.
- **Tab Home** như AutoCAD: Draw (Line, Polyline, Circle ▾, Arc ▾…), Modify (Move, Rotate, Trim ▾ / Copy, Mirror, Fillet ▾ / Stretch, Scale, Array ▾ + Erase, Explode, Offset, Draworder ▾), Annotation, Layers, Block, Properties, Groups, Utilities, Clipboard.
- **Nút tách (▾):** bấm nửa dưới hoặc mũi tên để chọn kiểu (Circle: tâm-bán kính / 2 điểm / 3 điểm; Trim/Extend; Fillet/Chamfer/Blend; mảng chữ nhật/đường/tròn; Draworder…). Nút nhớ lựa chọn cuối như AutoCAD.
- **Bảng mở rộng:** tên bảng có ▾ (Draw ▾, Modify ▾, Layers ▾…) — bấm để hiện thêm lệnh (Spline, Xline, Ray, Divide, Measure, Wipeout, Break, Join, Lengthen, Edit Polyline, Align, Overkill…).
- **Chú giải khi rê chuột:** tên lệnh tiếng Anh + tiếng Việt, mô tả, tên gõ lệnh và lệnh tắt.
- **Nhãn ribbon:** mặc định tiếng Anh như AutoCAD; đổi sang tiếng Việt trong menu không gian làm việc.
- Bấm đúp tên tab (hoặc nút ▴ bên phải) để thu gọn ribbon. Màn hình hẹp: các bảng tự thu thành nút như AutoCAD.
- Biểu tượng mới theo quy ước màu của CAD: nét có sẵn màu sáng, nét tạo ra màu xanh, phần cắt bỏ màu đỏ, hướng di chuyển màu vàng, điểm nắm ô vuông xanh, khối 3D tô 3 sắc độ. Bộ biểu tượng do DVDCAD tự vẽ (không sao chép biểu tượng của Autodesk).

## Lệnh bổ sung (v4k)
**Thứ tự vẽ & vùng che:**
- `DRAWORDER DR` — đưa đối tượng lên trên cùng (**F**), xuống dưới cùng (**B**), trên (**A**) hoặc dưới (**U**) một đối tượng khác. `TEXTTOFRONT` đưa chữ / kích thước lên trên, `HATCHTOBACK` đưa mọi hatch xuống dưới.
- `WIPEOUT WO` — vùng che: bấm các điểm, hoặc **D** chọn đa tuyến kín có sẵn. Vùng che tô bằng màu nền, che các nét nằm dưới nó (nền khung tên, chỗ ghi chú). `WIPEOUTFRAME` bật/tắt khung viền (**F** trong WIPEOUT: bật / tắt / hiện nhưng không in). Đọc được WIPEOUT trong file DWG/DXF.

**Chú thích theo tỉ lệ (annotative):**
- `CANNOSCALE` — đặt tỉ lệ chú thích 1:N (hoặc bấm ô **▲ 1:N** ở thanh trạng thái). Chữ / kích thước chú thích tự đổi cỡ để luôn cao đúng số mm trên giấy. **A** = chữ, kích thước mới tự là chú thích.
- `ANNOTATIVE` — bật/tắt chú thích cho chữ, kích thước chọn (cao trên giấy = cao hiện tại ÷ N). Trong khung nhìn của layout, chữ chú thích hiện đúng cao trên giấy theo tỉ lệ của khung nhìn đó.

**Ràng buộc tham số (tab ribbon "Tham số"):**
- Hình học: `GCHORIZONTAL` (ngang), `GCVERTICAL` (dọc), `GCPARALLEL` (song song), `GCPERPENDICULAR` (vuông góc), `GCCOLLINEAR` (thẳng hàng), `GCCOINCIDENT` (trùng điểm — bấm gần đầu đoạn hoặc tâm), `GCEQUAL` (bằng nhau), `GCCONCENTRIC` (đồng tâm), `GCTANGENT` (tiếp xúc), `GCFIX` (cố định). Lệnh chung `GEOMCONSTRAINT`. Như AutoCAD: đối tượng chọn trước đứng yên, đối tượng chọn sau dời theo.
- Kích thước: `DCALIGNED` (dài thẳng), `DCHORIZONTAL`, `DCVERTICAL`, `DCRADIUS`, `DCDIAMETER`, `DCANGULAR`. Lệnh chung `DIMCONSTRAINT`. Mỗi ràng buộc có tên (d1, rad1, ang1…). Giá trị có thể là biểu thức theo tên khác, vd `d1*2`, `d1+300`.
- `AUTOCONSTRAIN` — tự thêm ràng buộc trùng điểm và ngang/dọc cho các đối tượng chọn.
- `PARAMETERS` — bảng tham số: sửa giá trị hoặc biểu thức rồi bấm Áp dụng, hình vẽ đổi theo. Xoá từng ràng buộc bằng nút ✕.
- `DELCONSTRAINT` — xoá mọi ràng buộc của đối tượng chọn. `CONSTRAINTBAR` — hiện/ẩn ký hiệu ràng buộc.
- Sau khi có ràng buộc, mọi cách sửa (MOVE, ô nắm, STRETCH, bảng Thuộc tính…) đều giữ ràng buộc: đối tượng liên quan tự điều chỉnh. Undo hoàn tác cả nhóm. Ràng buộc dùng cho đường thẳng, đa tuyến (không cong), đường tròn, cung.

**Khối động (tab Chèn → Khối động):**
- `BPARAMETER` — chọn khối rồi thêm tham số:
  - **V** Hiển thị: đặt tên trạng thái, chọn các nét của khối sẽ hiện ở trạng thái đó. Chạy lại để thêm trạng thái khác. Các bản khác cùng tên tự nhận.
  - **L** Kéo giãn: chỉ điểm gốc (phần cố định) và điểm đầu kéo, đặt tên (vd Dai). Khi đổi giá trị, các điểm nằm quá nửa đoạn sẽ dời theo hướng kéo.
  - **F** Lật: cho phép lật ngang / dọc quanh điểm gốc khối.
  - **X** Bỏ mọi tham số động của khối.
- Đổi trạng thái: chọn khối → bảng **Thuộc tính** có mục "Khối động" (danh sách trạng thái, ô độ dài, nút Lật); hoặc lệnh `BDYN`.
- Định nghĩa khối động lưu trên máy theo tên khối nên dùng được cho mọi bản vẽ chèn khối đó.

**Lưu DWG:**
- `SAVEDWG` (`DWGOUT`) — lưu ra file **DWG** qua máy chủ chuyển đổi của bạn. `DWGSERVER` để đặt địa chỉ máy chủ.
- Chuẩn bị một lần trên máy tính: cài **ODA File Converter** (miễn phí) và **Node.js**, chạy `node server-dwg.js` (file có trong repo; đặt biến `ODA` trỏ tới ODAFileConverter). Điện thoại dùng được nếu cùng mạng với máy tính đó (nhập `http://<IP máy tính>:8787/convert`).

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
- Lưu DXF ngay trong app. Lưu **DWG** cần máy chủ chuyển đổi (`SAVEDWG`, xem trên).
- Khối lưu ra DXF thành BLOCK + INSERT (kèm thuộc tính ATTDEF/ATTRIB); kích thước thẳng, bán kính, đường kính lưu thành DIMENSION. Kích thước góc lưu thành DIMENSION 3 điểm; bản khối bị sửa riêng lưu thành khối biến thể (TÊN$1…). Kích thước tự cập nhật khi dùng STRETCH, ô nắm, MOVE hoặc SCALE lên chính kích thước, và bám theo đường hình khi gốc đường gióng nằm đúng điểm đặc trưng (v5b). Kích thước góc chưa bám theo đường hình. AutoCAD đọc lại thấy kích thước thường (không liên kết).
- Kích thước thẳng/chéo có sẵn trong file DWG/DXF cũng kéo ô nắm và STRETCH được. Khi sửa, kích thước được vẽ lại theo kiểu của DVDCAD: giữ cao chữ, số lẻ, mũi tên/gạch chéo. Kích thước góc và bán kính của file gốc chỉ chọn theo cụm.
- DXF lưu mặc định **2018 (AC1032)**, chữ UTF-8, màu RGB. `DXFVERSION` chọn 2013 / 2010 / 2007 / 2004 / 2000, Tự động (2000/2004) hoặc R12 (phần mềm rất cũ). AutoCAD 2017 trở về trước không mở được file 2018 — chọn phiên bản thấp hơn.
- Hatch dò biên trong màn hình trước, không thấy biên kín thì tự mở rộng phạm vi dò (tới 40 lần màn hình).
- Đa tuyến có cung giữ đúng cung khi di chuyển, xoay, lật, tỉ lệ, OFFSET, sửa bằng ô nắm và lưu DXF. TRIM, BREAK, EXTEND, JOIN, FILLET / CHAMFER đa tuyến, REVERSE cũng giữ cung. Cung ở đầu đa tuyến chưa EXTEND được (kéo ô nắm hoặc LENGTHEN).
- Vùng (REGION) lưu ra DXF dạng đa tuyến kín kèm dữ liệu DVDCAD (mở lại trong DVDCAD vẫn là vùng; AutoCAD thấy đa tuyến). Spline / elip trong phép toán vùng được chia thành đoạn thẳng nhỏ.
- DATALINK tự đọc lại file Excel trên Chrome / Edge máy tính. Trên iPhone / iPad / Safari: dùng `DATALINKURL` (Google Sheets / link CSV) để tự cập nhật, hoặc chọn lại file khi chạy DATALINKUPDATE.
- Trình duyệt không tự ghi được DWG: `SAVEDWG` gửi DXF tới máy chủ ODA của bạn. Không có máy chủ thì lưu DXF, AutoCAD mở bình thường.
- Ràng buộc tham số và định nghĩa khối động ghi kèm trong DXF (R2000+, mục DVDCAD_DATA) — mở lại bằng DVDCAD còn nguyên; AutoCAD bỏ qua phần này. Khối động lưu ra thành khối thường ở trạng thái hiện tại. Khối động trong file AutoCAD hiện đúng trạng thái đang lưu nhưng chưa đổi được tham số gốc của AutoCAD.
- Vùng che ghi thành WIPEOUT, thứ tự vẽ ghi theo thứ tự trong file (AutoCAD hiện đúng trên/dưới). Chú thích theo tỉ lệ ghi thành chữ thường cho AutoCAD (DVDCAD mở lại vẫn theo tỉ lệ). Màu RGB ghi đúng, cả màu RGB của lớp khi mở lại. Màu sách màu (color book) đọc theo màu RGB tương ứng.
- 3D chưa có: bo cạnh tuỳ ý trên khối sau cộng/trừ (chỉ bo được hộp, khối đùn, trụ), render dò tia chất lượng ảnh chụp.
- Khối sau UNION/SUBTRACT là lưới tam giác: mặt cong hiện dạng nhiều mặt phẳng nhỏ.
- Khối ACIS (3DSOLID) của AutoCAD trong DXF đọc được: mặt phẳng, mặt trụ, nón, cầu, xuyến. Mặt cong tự do (spline, bo cạnh của AutoCAD) hiện gần đúng theo đường biên. Khối đọc vào thành khối lưới, lưu lại là 3DFACE. Đọc 3DSOLID từ file **DWG** được (đã thử file DWG 2007); khối mặt cong tự do hiện gần đúng.
- UCS ở DVDCAD chỉ dùng cho lệnh tạo khối 3D. Nét 2D luôn vẽ trên mặt bằng XY.
- Layout chỉ chứa khung tên và khung nhìn. Muốn ghi chú thêm thì vẽ ở Model.
- Ảnh nền và file tham chiếu lưu trong trình duyệt của từng máy, không đi kèm khi chia sẻ qua Drive.
- Kiểu nét phức: chữ và hình trong nét hiện đúng (hình của ltypeshp.shx vẽ gần đúng: tròn, vuông, gạch, zigzag, batting; hình SHX khác hiện dạng vòng tròn nhỏ).. Lưu DXF R2000 ghi đủ chữ trong nét; hình trong nét ghi đúng số hình chuẩn của ltypeshp.shx (130 TRACK1, 131 ZIG, 132 BOX, 133 CIRC1, 134 BAT, 135 AMZIGZAG) và vẽ đúng hình theo định nghĩa SHP.
- MLEDIT dùng cho đường đôi vẽ bằng `MLINE` của DVDCAD và MLINE trong file AutoCAD (DXF đã thử; DWG đọc theo dữ liệu LibreDWG). Đường đôi khép kín chưa sửa được. Chưa có kiểu nối Chữ T liền, Cắt bỏ / Nối lại đoạn, thêm / bớt đỉnh. Nắp đầu theo kiểu MLINESTYLE của file AutoCAD chưa vẽ.
- Đa tuyến có độ rộng: độ rộng mỗi đoạn giữ khi sửa. Thêm / xoá đỉnh trên đoạn có độ rộng thay đổi (thon) thì đỉnh mới lấy độ rộng của đỉnh gần nhất. Đa tuyến rộng trong khối bị kéo giãn không đều chỉ tô gần đúng.
- REVCLOUD: chưa có tuỳ chọn Sửa kiểu AutoCAD (vẽ lại một đoạn mây). Dùng `REVCLOUDPROPERTIES` để đổi cung, hoặc vẽ mây mới. Sửa đỉnh mây bằng ô nắm thì mây không còn dựng lại được từ đường dẫn gốc.
- File rất lớn trên iPhone / iPad chỉ hiện 400 nghìn đối tượng đầu (sau khi nổ khối) để tránh Safari bị tắt vì hết bộ nhớ. Muốn xem đủ, mở trên máy tính hoặc tách bản vẽ. File DWG lớn vẫn tốn bộ nhớ hơn DXF (bộ giải mã LibreDWG).
- Vẽ lại đầy đủ bản vẽ hàng trăm nghìn nét vẫn mất khoảng 1–2 giây (máy thử không có GPU, máy thật thường nhanh hơn). Phóng / dời thì dùng ảnh tạm nên mượt.
- Xem 3D theo dõi thay đổi lớp / ẩn hiện đối tượng mỗi 0,3 giây rồi dựng lại toàn cảnh. Với bản vẽ rất nhiều khối, sau mỗi lần bật / tắt lớp có thể phải chờ một chút mới thấy kết quả.
- Mặt lưới RULESURF / TABSURF / REVSURF / EDGESURF / PLANESURF là khối lưới tam giác: lưu DXF thành 3DFACE và UNION / SUBTRACT không dùng cho mặt hở. Đường 2D của DVDCAD luôn nằm trên mặt bằng XY (cao độ theo ELEV), nên RULESURF / EDGESURF giữa các đường 2D ra mặt phẳng.
- POLYSOLID chưa có tuỳ chọn Cung khi vẽ theo điểm. Muốn có đoạn cong, vẽ đa tuyến có cung rồi dùng POLYSOLID › Đối tượng.
- Giao diện English dịch từ chuỗi tiếng Việt gốc khi hiển thị. Một vài câu ghép có thể đọc chưa trơn như AutoCAD bản tiếng Anh. Chữ do lệnh ghi vào bản vẽ (trường ngày tháng, nhãn ký hiệu, khung tên mẫu) vẫn là tiếng Việt.
- AutoLISP của DVDCAD chạy mã nguồn `.lsp`. Chưa có: hàm `vla-` / `vlax-` (ActiveX), hộp thoại DCL, `grread`, `entmake` cho khối / hatch, reactor. Add-in lưu trên từng máy (trong trình duyệt), không đi kèm bản vẽ hay Google Drive.
- Độ trong suốt đặt cho từng đối tượng. Độ trong suốt theo lớp (trong bảng Lớp của AutoCAD) chưa đọc / ghi. THICKEN chỉ làm dày được mặt phẳng; mặt cong (REVSURF…) chưa làm dày được. 3DFACE nằm ở cao độ ELEV (chưa nhập Z riêng từng đỉnh).
