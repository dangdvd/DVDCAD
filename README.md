# DVDCAD — PWA xem bản vẽ DWG/DXF (cài được, chạy offline)

> **Bản Windows** (cài như phần mềm, chạy offline, giao diện kiểu AutoCAD): xem **[HUONG-DAN-WINDOWS.md](HUONG-DAN-WINDOWS.md)**.

Ứng dụng web một trang: **xem** bản vẽ, **đo khoảng cách** (có bắt điểm), **thêm ghi chú**.
Đọc **DXF** trực tiếp và **DWG** trực tiếp (qua LibreDWG biên dịch WebAssembly); ghi DXF (2000 → 2018) và **DWG 2018 / 2013 / 2010 / 2007 / 2004 / 2000** ngay trong app.
Sau lần nạp đầu, app **chạy hoàn toàn offline** và **cài lên màn hình chính** iPhone như một app.

## v6c: DWFx ePlot (XPS), thuộc tính máy in Windows
- **`dvd-acad-x25.js`** — `XpsCtx extends SvgCtx`: lệnh vẽ canvas → XAML của FixedPage (đơn vị 1/96 inch = px CSS):
  đường / Bézier → `<Path Data="F1 M… L… C… Z">` (F1 = nonzero, mặc định XPS là even-odd), nét đứt `StrokeDashArray` theo bội số bề dày, cắt → `<Canvas Clip>`,
  gradient → `LinearGradientBrush` / `RadialGradientBrush` (MappingMode Absolute + Transform), ảnh → phần PNG + `ImageBrush`, chữ → bản ghi, nối phông lúc đóng gói.
- **`A.dwfxBuild(pages, info)`**: chữ → `<Glyphs Indices="gid,advance…" FontUri>` với phông nhúng (`A.pdfSubset(F, used, true)`: cắt glyf/loca, giữ cmap / name / OS/2 / post để phông nạp được như phông thường);
  gói OPC: `[Content_Types].xml`, `_rels/.rels` (fixedrepresentation → FixedDocumentSequence.fdseq, documentsequence → DWFDocumentSequence.dwfseq, core-properties),
  `dwf/documents/<id>/manifest.xml` (section `com.autodesk.dwf.ePlot`, tài nguyên "2d streaming graphics" = trang .fpage), `descriptor.xml` (ePlot:Page, Paper mm). ZIP nén `deflate-raw` (`A.zipParts`).
- `plotRender(…, 'xps')` → `R.xps`; thiết bị `dwfx` trong PLOT; PUBLISH `pbTo = dwfx`.
- CI Windows: `.NET XpsDocument` (WPF, `powershell -STA`) mở tệp DWFx của kiểm thử nhanh, đếm trang + `Glyphs` (`ToGlyphRun` nạp phông nhúng), vẽ trang 1 ra PNG.
- **Máy in Windows**: `A.plotPrnOpts(dev)` (Thuộc tính… → `PS.prn[dev]`): `color`, `duplex` (simplex / longEdge / shortEdge), `dpi`, `collate` → `print:svg` → `webContents.print({ color, duplexMode, dpi, collate })`.

## v6b: Plot Preview vector zoom / pan, máy in Windows đã cài, khổ giấy như DWG To PDF.pc3, mọi PDF là vector
- **`plotPreview(onPlot)`** (`dvd-acad-more.js`, `A.plotPreview`, lệnh `PREVIEW`): `plotRender(0, false, 'svg')` → SVG đặt vào lớp phủ toàn màn hình;
  camera `{x, y, s}` đổi `viewBox` (không co giãn ảnh → luôn sắc nét). Lăn chuột `zoomAt`, kéo = Pan, chuột giữa = Pan, Zoom thời gian thực, Zoom Window (`zoomRect`), Zoom Original (`fit`), chụm hai ngón.
  Vùng bản vẽ `translate="no"` để bộ dịch giao diện không đổi chữ trong bản vẽ.
- **Khổ giấy** `PAPER_SIZES` sinh từ bảng ISO A / B / C, ANSI, ARCH (+ full bleed, expand), JIS, Legal: mỗi khổ có `media` (tên chuẩn AutoCAD), `mg` (lề mặc định), `grp` (nhóm trong `<optgroup>`).
  `A.paperMedia(k)` / `A.paperFromMedia(tên)` đổi qua lại; khổ `A3` nay ghi `ISO_A3_(420.00_x_297.00_MM)` (full bleed là `FB_A3`).
- **Máy in**: `DEVICES` thêm `pdfgd`, `pdfwm`, `defprn`; máy in Windows đã cài = `sys:<tên>`.
  `desktop/main.js`: `print:list` (`webContents.getPrintersAsync()`), `print:svg` (cửa sổ ẩn nạp trang SVG → `webContents.print({ silent, deviceName, copies, pageSize µm, landscape, margins none })`).
  `preload.js`: `dvdDesktop.printers()`, `dvdDesktop.printSVG(o)`. Thiết bị `sys:` / `defprn` → `doPlot('sys')`; trình duyệt (không có cầu nối) → hộp in.
- **PDF vector ở mọi đường xuất**: `renderForPDF(paper, region, vec)` (index.html) vẽ vào `DVDAcad.PdfCtx` thay canvas; `pagesToPDF(pages)` ghép bằng `pdfBuild`. PUBLISH bản cũ (`x2`) cũng dùng `plotRender(…, true)`.

## v6a: DWG 2007 gốc (AC1021), in vector cho máy in giảm màu
- **`dvd-dwg.js` `pack2007(secs, o)`** — vỏ tệp AC1021 (kiểm từng byte với tệp AutoCAD trong bộ thử LibreDWG):
  - 0x80 byte đầu như 2004; 0x80: khối 0x400 byte = header 0x110 byte (34 số 64 bit, nén LZ 2007) + CRC, mã RS(255,239) ×3 xen kẽ (trường 0x169, nghiệm α¹…α¹⁶); cuối file chép lại khối này.
  - 0x480: bản đồ trang (2 bản) → trang dữ liệu → bản đồ section (2 bản). Trang hệ thống: nén, lặp `rep` lần, RS(255,239) xen kẽ.
  - Trang dữ liệu mã 4: nén (nếu có lợi) → RS(255,251) xen kẽ (trường 0x11D, nghiệm α¹…α⁴). SummaryInfo / Preview / AppInfo: mã 1 (dữ liệu liền, để địa chỉ ở đầu file trỏ thẳng vào).
  - CRC-64: header 0x110 byte và dữ liệu header nén = ECMA (MSB trước, hạt giống `seed2(len)`, đảo bit cuối); trang dữ liệu + bản đồ = Jones 0xAD93D23594C935A9 phản xạ, hạt giống `seed1(len)`.
    Dữ liệu đọc theo khối 8 byte 6,7,4,5,2,3,0,1; phần dư 4…7 byte: 2,3,0,1 rồi tiếp theo thứ tự. Checksum trang = Adler biến thể cùng thứ tự.
  - Đầu khối header: cặp "CRC + khoá" (ODA kiểm cặp này, không phụ thuộc nội dung) — ghi một cặp hợp lệ của AutoCAD.
- **Nén LZ 2007 `r21Comp`**: đoạn chữ nguyên đầu ≥ 8 byte; lệnh chép 2 byte (dài 3…14, cách ≤ 0x200), 3 byte (≤ 18, ≤ 0x2000), 4 byte (≤ 255, ≤ 0xFFFF); ≤ 7 byte chữ sau lệnh chép nằm trong 3 bit thấp. `r21Decomp` giải nén.
- Đối tượng R2007: BS kiểu + RL bitsize (tới đầu luồng handle) + dữ liệu + luồng chuỗi (RS cỡ + bit có chuỗi) + handle.
- **`fix2007(buf)`** (bọc `dwg_read_data` của libredwg-web): giải xen kẽ sẵn các trang mã 4 không nén (cỡ trang = cỡ mã RS) vì bản libredwg-web kèm theo chép thẳng các trang đó.
- Công cụ CI: `desktop/test/dwg2007-info.js` (kiểm CRC / checksum từng trang), `desktop/test/dwg2007-repack.js` (đóng gói lại tệp 2007 của ODA bằng `pack2007`, có các biến thể để tách lỗi).
- **In vector giảm màu**: `A.plotVecQuant(ô)` (dlg4) → `SvgCtx` `opt.q`: màu (trộn giấy trắng nếu trong suốt) → màu gần nhất của bảng ACI / đen trắng;
  màu kiểu in bật dither, không có trong bảng → `<pattern>` Bayer 4×4 trộn 2 màu gần nhất (ô 0,254 mm); `plotColor` ghi lại màu nào thuộc kiểu in tắt dither; ảnh → Floyd–Steinberg.

## v5z: phông nét đơn thay SHX thiếu (FONTALT), in thẳng máy in bằng SVG vector, phông Liberation kèm theo
- **`vendor/lff/*.lff`** (LibreCAD, GPL v2+). `x23`: `parseLFF()` đọc tệp:
  - Nét `x,y` và cung `x,y,A<bulge>`, bulge áp cho đoạn từ đỉnh trước tới đỉnh này.
  - Glyph ghép `C<mã>`. Chữ hoa cao 9 đơn vị. Khoảng chữ 1.2 đơn vị, khoảng trắng = WordSpacing.
- **Thay phông thiếu:**
  - `altFont()` được gọi trong `fontsOf()` khi tệp `.shx` chưa nạp: txt → standard, simplex, romans, romand, iso*, italic → italicc, còn lại theo `FONTALT` (localStorage `dvd:fontalt`).
  - `lffGlyph()` ghép dấu tiếng Việt từ NFD: chữ gốc (dùng â / ê / ô / ă của phông nếu có) + dấu nét đơn; dấu móc của ơ / ư; gạch ngang của đ / Đ.
- **`vendor/fonts/Liberation*.ttf`** (SIL OFL 1.1). `x24` `bundled()` luôn thêm một phông này vào cuối chuỗi phông của PDF (Serif nếu họ phông giống Times).
- **`A.SvgCtx(w, h, { flip, imgMax })`**: kế thừa PdfCtx (trạng thái, ma trận, dựng đường), ghi phần tử SVG:
  - `path` (stroke / fill / clip-path lồng theo save / restore), `text` (matrix + text-anchor + độ lệch chân chữ), `image`, linear / radialGradient.
  - `toSVG(Wmm, Hmm)` trả SVG theo mm.
  - `plotRender(…, 'svg')` → `R.svg`. `printSVG()` in qua iframe với `@page` đúng khổ.

## v5y: PDF vector khi in (DWG To PDF), hộp PLOT đủ máy in / khổ giấy / tuỳ chọn
- Tệp mới `dvd-acad-x24.js` (nạp sau x23, có trong cache của `sw.js`).
- **`A.PdfCtx(w, h, f, { flip, imgMax })`**: ngữ cảnh vẽ giả lập `CanvasRenderingContext2D`. `draw()` vẽ vào đây như vào canvas:
  - Đường, cung, ellipse, Bézier, `rect` / `fillRect` / `clearRect` (giấy trắng), `clip`, `save` / `restore` → `q` / `Q`.
  - Nét đứt, đầu / nối nét, `globalAlpha` + rgba → ExtGState, gradient → Shading kiểu 2 / 3, `drawImage` → XObject RGB nén + SMask.
  - Toạ độ được nhân ma trận lúc thêm vào đường như canvas. Bề rộng nét nhân hệ số co giãn của ma trận lúc vẽ.
  - `fillText` ghi lại (font, canh lề, `alphabeticBaseline` đo bằng canvas thật). Ghép phông lúc xuất (bất đồng bộ).
- **`A.pdfBuild(pages, info)`**:
  - Nhiều trang. Phông Type0 / CIDFontType2 (Identity-H, CID = GID), bảng `W`, ToUnicode để tìm / chép chữ. Phông CFF nhúng dạng FontFile3 / OpenType.
  - Phông glyf được cắt gọn: giữ nguyên số glyph, chỉ giữ dữ liệu glyph dùng tới (kể cả glyph thành phần), loca dạng dài.
  - Nén Flate bằng `CompressionStream`. Ký tự không có trong phông đầu thì lấy phông sau trong chuỗi (phông của chữ → Arial → Segoe UI → …). Không có phông nào thì đoạn chữ thành ảnh độ phân giải cao.
- **Nguồn phông**: `A.pdfFontSource` (móc thử nghiệm) → `dvdDesktop.font(family, bold, italic)` (Electron) → Local Font Access (chỉ khi đã có quyền).
  - Electron: `font:find` trong `main.js` dò thư mục phông của hệ thống, đọc bảng `name` (ID 16/17 hoặc 1/2, cả .ttc) và chỉ trả tệp phông.
- **`plotRender(dpi, preview, vec)`**:
  - `vec = true` vẽ vào PdfCtx: không dither / giảm màu. Lộn ngược bằng ma trận trang (`unflip()` trước dấu in).
  - `__txtBar` / `__txtSkip` / `__txtMax` cho phép chữ nhỏ / lớn vẫn vẽ thành chữ.
  - `A.plotPDF(title)` cho PLOT. PUBLISH ghép nhiều trang vector.
- **PLOT**:
  - `A.PAPER_SIZES` (ISO / ANSI / ARCH), `A.paperMedia()` (tên khổ AutoCAD, khổ tự chọn `User_(W_x_H_MM)`), `A.PLOT_DEVICES`.
  - Tuỳ chọn mới `PS.tp`, `PS.ps`, `PS.slw`, `PS.toFile`, `PS.cw` / `PS.ch`. Áp cho layout lưu ở `dvd:lplot::<bản vẽ>::<layout>`.

## v5x: xoay nhìn khung nhìn (VIEWTWIST), MTEXT nhiều phông / SHX, PLOTSETTINGS có tên trong DXF / DWG, SYSWINDOWS cửa sổ con
- **Khung nhìn xoay** — `v.tw` (radian), DCS = R(tw)·(P − đích):
  - `index.html`: `_vpWorldC()` đổi tâm nhìn DCS (12/22 hoặc `VIEWCTR`) + đích (17/27, `targetPoint`) về toạ độ mô hình.
  - `vpMatrix(v)` (giấy = tâm + tỉ lệ·R(tw)·(P − tâm nhìn)), `vpToModel` / `vpToPaper` dùng chung cho `buildPaperEntities`, `CHSPACE`, `VPSYNC`, `ALIGNSPACE`.
  - DXF ghi mã 51 (độ), tâm nhìn 12/22 theo DCS. Bộ ghi DWG lấy từ DXF (BD radian).
  - Layout tự tạo lưu `tw` trong `D.vps[i]`. `VPEDIT` có cột Xoay nhìn.
- **Chữ có định dạng nhiều phông** (`dvd-acad-dlg.js`):
  - Đoạn `{ t, b, i, u, o, ff, f }` thêm `ff`: phông riêng của đoạn (TrueType hoặc `.shx`).
  - `segW()` đo bề rộng theo SHX (`A.shxRun`, `A.shxLine` của x23) hoặc theo canvas.
  - `drawRichText(ctx, e, px, T0)` vẽ đoạn SHX bằng nét (stroke theo `T0`).
  - `A.richShxStrokes(e)` trả nét khi mọi đoạn là SHX; `A.shxStrokes` gọi hàm này cho chữ có định dạng.
  - `A.mtextRuns` đọc `\F` / `\f`; `richPieces` ghi `{\Ftệp.shx;…}` / `{\fTên|b|i|c0|p34;…}`.
  - Tab Soạn chữ: có vùng bôi đen thì chọn phông = `setFont()` cho đoạn đó.
- **PLOTSETTINGS**:
  - `dvd-acad-dxf.js` ghi thiết lập trang có tên (`A.pageSetups()`) vào ACAD_PLOTSETTINGS. `dvd-dwg.js` mã hoá PLOTSETTINGS cùng phần AcDbPlotSettings với LAYOUT.
  - `libredwg-web.js` đọc PLOTSETTINGS tại `tio − 8`: cùng bố cục phần plotsettings của LAYOUT, đã đối chiếu với `gh109_1.dwg` (AutoCAD 2013, bộ thử libredwg).
  - `psFrom()` (x22): cờ 16 + mã 75 = 0 → vừa khổ giấy; cờ 16 với mã 75 khác 0 → tỉ lệ theo 147; không có cờ 16 → tỉ lệ 142 : 143. Mã 74 = 0 là Display.
- **SYSWINDOWS** (x23):
  - Ở chế độ lát / xếp chồng, `cvPlace()` đặt `#cv` và 2 lớp phủ (`#dvdOvS`, `#dvdOvC`) vào ô của bản vẽ hiện hành (`setProperty(…, 'important')`), rồi gọi `resize()` và giữ tâm nhìn.
  - Bấm ô khác → `A.switchTab()`; vòng kiểm 250 ms xếp lại khi đổi bản vẽ hoặc số tab. Nút □ hoặc gõ lại lệnh = một cửa sổ.

## v5w: WMFIN, mặt cắt nửa / bậc / xoay, phông SHX cho chữ, GCSMOOTH, ALIGNSPACE, SYSWINDOWS, PSETUPIN đọc DWG của AutoCAD
- Tệp mới `dvd-acad-x23.js` (nạp sau `dvd-acad-x22.js`, có trong cache của `sw.js`).
- **WMFIN** — `A.parseWMF(buf, { wire, wide })`:
  - Header placeable (0x9AC6CDD7, đơn vị / inch) hoặc header thường.
  - Bảng đối tượng GDI theo đúng chỗ trống: bút, chổi, font; bảng màu / chổi ảnh / vùng vẫn chiếm chỗ.
  - Hệ toạ độ theo SETWINDOWORG / EXT (OFFSET / SCALE), SAVEDC / RESTOREDC.
  - Chữ theo `lfCharSet` → TextDecoder (163 = windows-1258, chuẩn hoá NFC).
  - Khối lưu trong `window._dvdBlocks` (`src: 'file'`) rồi `A.instBlock`.
- **Mặt cắt** (`dvd-acad-x19.js`):
  - `rec.cut = { pts, type: 'F' | 'H' | 'O' | 'A' }`; bản 5.15 `{ a, b }` vẫn đọc được.
  - `sectionPlan(rec, par)` chia thành các dải; mỗi dải gồm mặt phẳng cắt hoặc không cắt, cùng khoảng `[lo, hi]` theo trục dọc đường cắt.
  - Cắt xoay: quay `d` / `u` quanh `par.d` (Rodrigues), trải phẳng bằng độ dời `off`.
  - `shootSection()` chụp từng dải bằng `shootOn` một mặt phẳng, rồi cắt nét theo dải và cắt vùng bằng Sutherland–Hodgman. Biên vùng chỉ vẽ cạnh thật (`edges`).
- **Phông SHX**:
  - `parseFont()` đọc shapes 1.0 (hình 0 = above / below / modes), unifont (int32 số hình, mã 2 byte) và bigfont (dải mã đầu, bảng chỉ mục 8 byte; bỏ tiền tố mã 2 byte).
  - `runGlyph()` dịch mã 0–14. Mã 7 lấy 1 byte, 2 byte (unifont) hoặc dạng mở rộng của bigfont.
  - Bảng ngược: Unicode → windows-1252 (°, ±, Ø → 127 / 128 / 129) và Unicode → GBK / Big5 / Shift-JIS / EUC-KR theo tên phông.
  - API: `A.shxText(ctx, e, size, col, T0)` (gọi trong `drawEntity`, bỏ qua chữ rich text), `A.shxExtent` (dùng cho `textExtent`), `A.shxStrokes` (`vecWalk`, TXTEXP).
  - Chữ mang `e.ff = 'romans.shx'` và `e.ffb` (bigfont), lấy từ STYLE mã 3 / 4 khi đọc DXF và từ `font` / `bigFont` của DWG. `shxOfStyle()` bỏ qua phông VNI / TCVN vì đã giải mã sang Unicode.
  - Phông lưu ở IndexedDB `dvdcad-pro` (`shxf:<TÊN>`, `shxf:list`).
- **GCSMOOTH** (`dvd-acad-x4.js`):
  - Ràng buộc `smooth` với khoá `s0` / `s1` (đầu spline = `e.spl`).
  - `endInfo()` cho điểm, tiếp tuyến đi ra và độ cong có dấu ở đầu đường kia.
  - `smoothSpl()` đặt P0, đặt P1 theo tiếp tuyến, rồi dời P2 vuông góc. Độ cong đầu của Catmull-Rom là κ = −4·((P2−P0)·n)/L².
  - Spline dưới 4 điểm khớp được lấy mẫu lại thành 4 điểm. `translate()` dời cả `e.spl`.
- **ALIGNSPACE**: `A.alignSpace(L, i, m1, p1, m2, p2)` đổi `vh` / `dcx` / `dcy` của khung nhìn; với layout DVDCAD thì lưu vào `D.vps[i].n` / `cx` / `cy`.
- **SYSWINDOWS**: lưu ảnh canvas của tab trước mỗi `loadDXF` / `loadDWG`, rồi lát các ô trên vùng vẽ. Ribbon: `A.ribbonAct('SYSWINDOWS|V')`…
- **PSETUPIN cho DWG**:
  - `libredwg-web.js` `readPlotSettingsAt(base)` đọc struct PLOTSETTINGS thẳng từ `HEAPU8`, vì dynapi của bản wasm không trả struct con.
  - Vị trí trường: `LAYOUT + 12` tên, `+16` máy in, `+20` khổ giấy, `+24` cờ, `+72` / `+80` khổ mm, `+136…140` đơn vị / xoay / kiểu in, `+144` / `+152` tỉ lệ, `+160` bảng kiểu in, `+164` / `+168` tỉ lệ chuẩn. Đã đối chiếu DWG 2000 / 2004 / 2018 của AutoCAD với DXF cùng bản vẽ.
  - Có kiểm tra giá trị hợp lệ; không đọc được thì báo `unreadable`.
  - Kết quả ra `layout.plot` và `window._dwgPageSetups`, rồi `A.setupsFromDWGFrame(w)` → `psFrom()` (dùng chung với DXF; DXF đọc thêm mã 44 / 45).

## v5v: Smart Blocks, hình chiếu từ mô hình 3D, ràng buộc đối xứng + DCCONVERT, GEOMARK, 3DPOLY / PFACE / 3DMESH / EDGE, SHP / SHX, EPS / WMF / web / DWGCONVERT
- Tệp mới nạp sau `dvd-acad-dlg4.js`: `dvd-acad-x18.js` … `dvd-acad-x22.js` (có trong danh sách cache của `sw.js`). Ribbon có thêm tab `layout` (*Bố cục*) trong cả 2 không gian làm việc.
- `dvd-acad-x18.js` (Smart Blocks):
  - Hình của khối → các đoạn mẫu. Tìm theo lưới băm các nét rời.
  - Mỗi ứng viên: ghép 2 điểm mốc → phép đồng dạng (`simM`), rồi so khớp từng đoạn theo dung sai.
  - API: `A.bconvertSearch(name, src, opt, pool)` / `A.bconvertApply(name, src, list)`. Cài đặt lưu ở `dvd:bconvert`.
- `dvd-acad-x19.js` (hình chiếu):
  - Sổ hình chiếu `A._dvRegistry` lưu trong DVDCAD_DATA (`dvw`). Nét mang XDATA `dvw` = `id` hoặc `id/a` (chú thích vẽ trên hình cha).
  - Hình con lấy hướng theo hình cha: ngang `d' = k·sh·r`, dọc `d' = k·sv·u`, với k = −1 (góc chiếu thứ nhất) / +1 (thứ ba). Hình có hướng nằm ngang giữ trục Z hướng lên.
  - Toạ độ tính từ gốc thế giới nên `VIEWUPDATE` giữ được vị trí đã dời; hình con dời theo hình cha.
- `dvd-acad-3d.js` `flatshot(o)` có thêm:
  - `o.dir` / `o.up`: hướng chiếu bất kỳ.
  - `o.hidden`: trả `out.hid` (nét khuất).
  - `o.caps`: mặt cắt đưa vào lượt chiều sâu.
  - `out.B` = {r, u, c}: hệ trục của hình chiếu.
  - `setCutPlane(n, o)`: mặt cắt tổng quát, giữ phía n·(P − o) ≥ 0. `buildCaps()` gộp vùng cắt theo từng đối tượng.
- `dvd-acad-x4.js` (ràng buộc):
  - Thêm loại `sym` cho bộ giải.
  - Cài đặt `dvd:conset` gồm `fmt`, `show` và `ac {coin, hv, par, perp, tolD, tolA}`.
  - Ràng buộc có thêm `c.hide` (`DCDISPLAY`) và `c.ann` (`DCFORM`, vẽ cả khi in).
  - `DCCONVERT` tìm đối tượng tại điểm định nghĩa của kích thước.
- `dvd-acad-x20.js`:
  - **GEOMARK**: nhóm `*GEOMARK` (POINT + CIRCLE + 2 LINE + TEXT) mang XDATA `gmk` {id, lat, lon, z, note}. `A.geoToLL` / `A.geoFromLL` nằm trong `dvd-acad-dlg4.js`.
  - **3DPOLY**: POLYLINE có `p3` (đỉnh có z).
    - DXF: AcDb3dPolyline (70 = 8) + VERTEX (70 = 32) + SEQEND.
    - DWG: `POLYLINE_3D` (16) / `VERTEX_3D` (11) + SEQEND trong `dvd-dwg.js`.
    - `libredwg-web.js` thêm đỉnh cuối qua `last_vertex`. LibreDWG bỏ sót đỉnh này khi đọc R13–R2000.
  - **EDGE**: đổi bit `e.ie` của 3DFACE (DXF mã 70). Chọn 3DFACE trong core theo đúng thứ tự đỉnh.
  - **SHP / SHX**:
    - Đọc: `parseSHP`, `parseSHX`. Ghi: `compileSHX`. Trình thông dịch mã hình 0–14 với vectơ 16 hướng.
    - SHAPE trong DXF → POINT mang `shpx`, dựng lại khi `LOAD` (`applyPending`).
    - Tệp đã nạp lưu ở `dvd:shx:<TÊN>`.
- `dvd-acad-x21.js`:
  - `A.epsOut`: điểm = mm × 72 / 25,4.
  - `A.wmfOut(list, opt)`: header placeable 0x9AC6CDD7, 254 đơn vị / inch.
  - `A.publishWeb(...)`.
  - `A.dwgConvertFiles(files, tgt, onEach, onLoaded)`:
    - Mở từng tệp trong iframe ẩn `?dwgconvert=1`, đọc bằng đúng bộ đọc của app, rồi ghi bằng `A.dwgNative` / DXF.
    - `PARTIALOAD` và `PSETUPIN` (với tệp DWG) cũng dùng iframe này.
  - `dvd-acad-dlg4.js` tách vòng vẽ vectơ của máy vẽ HPGL thành `A.vecWalk` / `A.vecRgb` (HPGL ra giống hệt từng byte).
- `dvd-acad-x22.js`: `CLOSEALLOTHER`, `ATTREDEF`, `PSETUPIN` (`A.setupsFromDXF` đọc đối tượng PLOTSETTINGS), `PARTIALOPEN` / `PARTIALOAD`, `SYSVARMONITOR` (`dvd:svmon`), `QUICKPROPERTIES` (`QPMODE`), `MVSETUP`, `PLOTTERMANAGER`, `UPDATETHUMBSNOW`.
- Thiết lập trang có tên:
  - `dvd-acad-more.js`: `A.pageSetups()` / `A.pageSetupApply()`; hộp PLOT có `#plSetup`.
  - Lưu trong DVDCAD_DATA (`psu`). Khi mở bản vẽ, các thiết lập này được chép vào `dvd:psetups::<tên>`.
- Khối động (`dvd-acad-x5.js`): `BVSTATE` / `BVSHOW` / `BVHIDE`. Thêm `REFSET` vào `dvd-acad-ext.js`.

## v5u: lật / kéo giãn là tham số AutoCAD, IMAGE + IMAGEDEF thật, in bản đồ nền + máy in có độ sâu màu, DWG 2007 → 2004
- `dvd-acad-dxf.js` `dynGraph(B, d)`: đồ thị đánh giá tổng quát (nút `{ t, h, i, id }`, cạnh `[từ, tới, số liên kết]`, danh sách vào / ra tự tính) cho tham số hiển thị, tuyến tính (`BLOCKLINEARPARAMETER` + `BLOCKLINEARGRIP` + `UpdatedEndX/Y` + `BLOCKSTRETCHACTION`: khung t > L0/2, LINE / LWPOLYLINE dời theo đỉnh, nét khác chỉ khi nằm trọn trong khung) và 2 tham số lật (`BLOCKFLIPPARAMETER` + `BLOCKFLIPGRIP` + `UpdatedFlip` / `UpdatedBaseX/Y` + `BLOCKFLIPACTION` chọn mọi nét, tham số / grip khác và các STRETCH như khối Door của AutoCAD; FLIP → STRETCH).
  - Bản chèn đang lật: INSERT = `bm · S` (không lật), *U = S · hình đã kéo; XDATA `dfl: [sx, sy]` → bộ đọc dựng `bm = Mi · S`.
  - XRECORD từng nút trong `ACAD_ENHANCEDBLOCKDATA` (giá trị đã đánh giá: điểm tham số sau lật, trạng thái lật, góc STRETCH) với mã 1071 cố định theo loại như tệp AutoCAD.
- `dvd-dwg.js`: mã hoá 6 lớp khối động mới (2 điểm: BS số liên kết + [BL id, TV tên] × 4, BL grip × 4, BS vị trí gốc; STRETCH: khung 2RD, nét + chỉ số điểm, BD hệ số, BD góc, RC cờ — theo IL của ACadSharp 3.8); `sub(r, lớp)` để biểu thức đánh giá không đọc nhầm mã 70 của AcDbBlockAction.
- Ảnh: `A.imgFile(id, tên)` (dvd-acad-pro.js) → tên ổn định `tên_<id>.png|jpg`; DXF ghi IMAGE (u / v của 1 điểm ảnh, fade, khung cắt đa giác theo toạ độ điểm ảnh gốc trên trái), IMAGEDEF `.\tên`, IMAGEDEF_REACTOR, `ACAD_IMAGE_DICT`, RASTERVARIABLES; `A.lastImgFiles` cho bản Windows (`dvdDesktop.writeSide` / `readSide`: chỉ thư mục của bản vẽ đã cấp quyền, chỉ đuôi ảnh) và ETRANSMIT. Đọc: `acadImage(...)` trong `index.html` (DXF: IMAGEDEF ở OBJECTS; DWG: `db.objects.IMAGEDEF`), `_imgRefs` → `onLoad` đọc tệp ảnh. `libredwg-web.js`: khung cắt IMAGE đọc là điểm 2D.
- In: `PC3.print` (máy in Windows) trong độ sâu màu; `A.geomapPlotPrep(box, px)` / `A.geomapPlotDraw()` (dvd-acad-dlg4.js) + `A.plotMapPrep()` (dvd-acad-more.js) — `drawGrid` của `plotRender` vẽ ảnh bản đồ của vùng in; `drawMap` cũng vẽ khi `renderExport`.
- `dvd-acad-x3.js` `A.dwgFallback(ver)`: không có ODA thì bản gốc cùng năm, không có thì bản mới nhất ≤ năm đó (2007 → 2004).
- 5.14.1 — `DWGSERVER` (bản Windows): nút *Tải ODA File Converter* gọi `dvdDesktop.openExternal` (chỉ http/https) tới trang tải chính thức của ODA — ODA không đóng gói kèm bộ cài; nút *Tìm lại* và sự kiện `focus` của cửa sổ gọi lại `dvdDesktop.odaInfo()` (`findODA()` trong `desktop/main.js`) để hiện đường dẫn vừa cài.
- Vỏ tệp DWG 2007 (AC1021): đã kiểm Reed-Solomon (255,239) đa thức 0x169 và (255,251) đa thức 0x11D, nghiệm α¹…α¹⁶ / α¹…α⁴, khớp tệp AutoCAD; CRC64 có seed và dữ liệu kiểm tra chưa khớp giả thuyết nào nên chưa ghi AC1021.

## v5t: DWG gốc 2004 → 2018, GEODATA, GEOMAPIMAGE, độ sâu màu + dither khi in, khối động như AutoCAD
- `dvd-dwg.js`: một bộ ghi cho 5 phiên bản (`DVDDwg.dwgFromDxf(text, { version: 'R2018' | 'R2013' | 'R2010' | 'R2004' | 'R2000' })`, `A.dwgNative(ents, { version })`, `A.dwgVersions`).
  - Bộ chứa R2004+: header 0x100 byte (khối 0x6C byte XOR theo dãy LCG + CRC-32), trang dữ liệu căn 0x20 (đầu trang XOR theo địa chỉ, checksum kiểu Adler 0x15B0 / 0xFFF1), nén LZ77 kiểu AutoCAD, bản đồ section / trang, bản sao header cuối file; SummaryInfo, AppInfo, RevHistory, AuxHeader.
  - Mã hoá đối tượng theo phiên bản: R2004 màu ENC / CMC, danh sách sở hữu; R2007+ luồng chuỗi UTF-16 riêng và luồng handle riêng của header; R2010+ BOT, cỡ handle UMC; R2013 / R2018 các trường thêm.
  - AuxHeader R2018 như AutoCAD 2018; mili-giây TDUPDATE trong AuxHeader bỏ bit 15 vì ACadSharp 3.8 đọc maint dạng RL (lệch 6 byte) và ném lỗi DateTime.
  - Khối động: lớp `ACAD_EVALUATION_GRAPH`, `BLOCKVISIBILITYPARAMETER`, `BLOCKVISIBILITYGRIP`, `BLOCKGRIPLOCATIONCOMPONENT`, `ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION`, `ACDB_BLOCKREPRESENTATION_DATA` (bố cục theo bộ đọc của ACadSharp, kiểm bằng tệp mẫu AutoCAD); từ điển mở rộng của INSERT; EED 1005; XRECORD điểm 3D / 1071.
- `dvd-acad-dxf.js`:
  - GEODATA (90 = 3 / 2) trong `ACAD_GEOGRAPHICDATA` của `*Model_Space` (DXF 2010+).
  - Khối động: khối gốc ở trạng thái mặc định (`A.dynStateCopy(list, 'default')`, nét ẩn 60 = 1, XDATA `AcDbBlockRepETag`), mỗi bản chèn một `*U` (`AcDbBlockRepBTag` → khối gốc, INSERT xdict `AcDbBlockRepresentation` → `AcDbRepData` + `AppDataCache` / `ACAD_ENHANCEDBLOCKDATA` / XRECORD trạng thái); R2018 thêm đồ thị đánh giá 4 nút (tham số hiển thị ← grip → 2 thành phần vị trí grip). XDATA DVDCAD: `dbn` (tên khối gốc) trên INSERT, `dvs` / `dyn` trên nét trong khối.
  - Dữ liệu ảnh nhúng (`imgs`, IMAGE → khung đa tuyến + `imgx`), vị trí địa lý (`geo`) trong DVDCAD_DATA.
- `index.html` (bộ đọc): cờ ẩn 60 / `isVisible` (nét ẩn không vẽ, trừ nét của khối động DVDCAD), `AcDbBlockRepBTag` → `trueName`, tham số hiển thị AutoCAD → `dynVis` (trạng thái theo XRECORD của INSERT hoặc theo các nét đang hiện) → `window._dxfDynVis` → định nghĩa khối động của `dvd-acad-x5.js`.
- `dvd-acad-dlg4.js`: `GEOMAPIMAGE` / `GEOMAPIMAGEUPDATE`; in giảm màu `A.plotQuantize(R, mask)` (Floyd–Steinberg quét rắn bò, bảng ACI 256 màu tra theo khối 32³, mặt nạ màu tắt dither), `A.pngIndexed(q, dpi)` (PNG color type 3 + pHYs), `A.plotterProps(dev)`.
- `dvd-acad-more.js` `plotRender`: giảm màu thì vẽ lên nền trong suốt (`window.__plotClear`) để biết độ phủ từng điểm ảnh; lượt vẽ mặt nạ khi bảng .ctb có màu tắt dither.
- CI Windows: bước ACadSharp (NuGet) đọc lại mọi DWG gốc, in đầu stack khi lỗi; bản vẽ tổng hợp của smoke test có khối động.

## v5s: hộp hỏi tên trên cùng, VPLAYER / VPCLIP trong tệp, chữ → đường bao (TXTEXP), MENUBAR + menu / ribbon / hình nút CUIX, GEODATA + GEOMAP, máy vẽ HPGL/2
- Tệp mới `dvd-acad-dlg4.js` (nạp sau `dvd-acad-dlg3.js`).
- `openModal(o)` đưa lớp phủ tĩnh (vd `#txtBar` của `askText`) xuống cuối `body` → nằm trên hộp thoại `A.dialog` đang mở (cùng `z-index: 50`).
- VIEWPORT: DXF ghi 331 (handle lớp đóng băng), 340 + cờ 90 bit 65536 (đường cắt LWPOLYLINE giấy, có reactor về khung nhìn); DWG 2000 ghi `frozen_layers` + `clip_boundary`. Đọc DXF: `_h` (handle) của đối tượng giấy, `layerByH`; đọc DWG: `frozenLayerIds` / `clipBoundaryId` (thêm vào `convertViewport` của `libredwg-web.js`). Kết quả gắn ở `viewport.vx = { frz, cp }`; `window.vpExtra` lấy bản riêng trên máy trước, không có thì `vx` của tệp.
- `A.textOutline(e, { px, tol })`: vẽ chữ ra canvas phụ bằng chính `drawEntity`, dò biên marching squares (nội suy theo alpha), Douglas–Peucker cho vòng kín → các vòng (ngoài + lỗ, tô evenodd). Dùng cho TXTEXP, `clipEnt` của EXPORTLAYOUT (HATCH `txo`), MSLIDE, HPGL/2.
- MENUBAR: `A.menuBarSet(menus)`, menu `{ t, items: [{ t, c } | { sep } | { t, sub }] }`; `dvd:cui.menus`. CUIX: `RibbonPanelSource` / `RibbonTabSource` → `tabs` (`rb: 1`), `SmallImage` / `LargeImage` → `cmds[].img` (data URL) → `DVDIcons['CUII_<lệnh>']` (`<image>` trong SVG). Nhãn của tệp CUI không qua bộ dịch (`translate="no"`, `it.nt`).
- `A.geodataParse(text)`, `A.utmToLL(E, N, zone, south)`; GEOMAP vẽ trong `drawGrid` (dưới bản vẽ) bằng ô Web Mercator, khung toạ độ địa phương (mét / đơn vị bản vẽ, hướng bắc); ghi chú bản quyền OSM góc dưới phải.
- `A.plotGeom()` (khổ, vùng in, tỉ lệ, gốc) trong `dvd-acad-more.js`; `A.hpglPlot()` → `{ data, pens, ents }`, thiết bị `plt` trong PLOT.

## v5r: layout của tệp sửa được, DXF / DWG ghi layout thật, DIESEL + MODEMACRO, nhập CUIX, nét in thích ứng, đầu nét thoi
- Đọc DXF: `parseDXF` trả thêm `layouts` (LAYOUT trong OBJECTS; khối giấy qua mã 340 của BLOCK_RECORD vì 330 bị bỏ khi đọc) và `paper` (đối tượng mã 67 = 1 của ENTITIES, tách khỏi Model; VIEWPORT gom ở `list.vports`). `dxfLayouts(r)` dựng `dwgLayouts` giống `buildLayouts` của DWG; `paper.lim` = tờ giấy (khổ giấy thiết lập in, hoặc LIMMIN / LIMMAX), viền `vpf` không in.
- Đọc DWG: LibreDWG gộp đối tượng `*Paper_Space*` vào `db.entities` → `dwgBuild` lọc theo handle để Model chỉ còn `*Model_Space`.
- Layout của tệp → layout DVDCAD: `A.layoutFromFile(i)` (`fileDef`: `ps` = đối tượng giấy của tệp, `vps` với `n = vh × mmU / h`, `org` gốc tờ giấy, `frame: false`, `tb: false`, `from` = tên layout tệp). `installLayouts` dựng lại tab từ ảnh chụp `dwgLayouts._file`: định nghĩa có `from` thay đúng chỗ, `gone` = đã xoá.
  - `A.commit` trong layout tệp tự chuyển (`A.ensurePaperLayout`); `A.canEdit` / `A.editList` coi layout tệp là sửa được.
- Ghi DXF (`A.dxfR2000(ents, { layouts })`, tự bật khi `ents === modelEntities`): mỗi layout một LAYOUT (40–45 khổ giấy, 10/20–11/21 giới hạn, 331 khung nhìn tổng), BLOCK_RECORD `*Paper_Space` / `*Paper_SpaceN`, VIEWPORT (ID 1 = tờ giấy), đối tượng giấy có mã 67. XRECORD DVDCAD1 thêm `lay` (định nghĩa layout) → `A.seedLayoutDefs` khi mở lại.
- DWG 2000 (`dvd-dwg.js`): thực thể VIEWPORT (kiểu 34) theo thứ tự trường của LibreDWG; LAYOUT ghi handle khung nhìn đang hoạt động.
- DIESEL: `A.diesel(str)`; `MODEMACRO` (biến phiên, hiện ở `#acMM` trên thanh trạng thái); `A.runMacro` tính `$M=` trước khi tách lệnh; lệnh DIESEL.
- CUIX: `A.cuiRead(file)` — giải nén zip bằng `DecompressionStream('deflate-raw')`, đọc `MenuGroup.cui` (MenuMacro, Toolbar, Accelerator, DoubleClickAction) → định dạng `.dvdcui`; `A.cuiImportFile` / `A.cuiLoadFile`.
- In theo .ctb: kiểu nét thích ứng (`ltDash` co mẫu theo `A.entLen(e)`, khoá nhóm kèm hệ số), đầu / nối hình thoi (`window._plotCJc` đổi sang butt / bevel, `window._plotDiamond` tô mũi thoi).
- EXPORTLAYOUT: ảnh giữ `clip` + `cpoly` (DXF ghi khung đã cắt), khối 3D → `A.solidPlan(e)` (cạnh lưới / biên dạng / đường tròn) rồi cắt như nét.

## v5q: không gian giấy + CHSPACE, DWS nhị phân, kiểu in đủ thuộc tính, cắt EXPORTLAYOUT, kiểu hiển thị riêng, vị trí địa lý, slide, CUI
- Tệp mới `dvd-acad-dlg3.js` (nạp sau `dvd-acad-dlg2.js`).
- Không gian giấy: layout tự tạo giữ `def.ps` (đối tượng giấy, giữ tham chiếu qua các lần dựng lại nhờ `PSLIVE` trong `dvd-acad-pro.js`; `A.sheetPrims`, `A.saveLayoutQuiet`).
  - `A.commit` trong layout tự tạo đổi tạm `modelEntities` sang danh sách giấy (`A.withPaper`), bước hoàn tác mang `psLay`; `applyEdit` áp lại vào đúng layout. Sửa khung nhìn (`vpf` + `vpi`) đổi `def.vps`.
  - `A.canEdit()` / `A.editList()` cho bảng Thuộc tính (`dvd-cmd.js`). CHSPACE dùng `scaleEnt` / `translateEnt` theo tỉ lệ khung nhìn, một bước hoàn tác kiểu `fn`.
- `A.dwgStdTables(buf)` đọc bảng LAYER / LTYPE / STYLE / DIMSTYLE từ DWG qua LibreDWG; `A.stdTablesOf(file)` chọn DXF hay DWG.
- .ctb: thêm `lt` (kiểu nét in 0–30), `es` / `js` (đầu / nối nét), `fs` (kiểu tô 64–72), `nd` (tắt dither), `pn` / `vp` (số bút / bút ảo), `na` (tắt thích ứng), `lwt` (bảng bề rộng nét tuỳ chỉnh), `af` / `sf` (hệ số tỉ lệ chung).
  - Khi in: `ltDash` trả mẫu nét in, nhóm nét mang `cj` (lineCap / lineJoin, `window._plotCJ`), `drawEntity` / `drawHatch` đặt mẫu tô (CanvasPattern) qua `CanvasRenderingContext2D.prototype.fill`.
- EXPORTLAYOUT: cắt đường cong bằng `G.curveOf(e).sub(a, b)` theo đa giác khung nhìn (lấy mẫu + chia đôi), hatch / vùng đặc bằng Sutherland–Hodgman (`A.clipToRegion`).
- 3D: `view3D.setVS(P)` ghi đè kiểu hiển thị (face, edges, edgeCol, opacity, shadow, bg); kiểu riêng lưu ở `dvd:vsuser`, kiểu đang dùng ở `dvd:vscur`.
- Vị trí địa lý: `dvd:geo::<bản vẽ>`, cập nhật `dvd:sun`; DXF thêm chú thích `999 DVDCAD-GEO {…}` và $LATITUDE / $LONGITUDE / $NORTHDIRECTION / $TIMEZONE.
- Slide: `A.slideMake()` / `A.slideParse()` / `A.slbParse()` / `A.slbBuild()` (định dạng slide cấp 2, byte thấp trước).
- CUI: `dvd:cui` = `{ cmds, qat, keys, dbl, tabs, partial }`; `A.cuiApply()` đăng ký lệnh macro (`A.runMacro`), dựng thanh truy cập nhanh, tab ribbon `cui_*` (qua `A.ribbon.RIB` / `WS`), phím tắt và nhấp đúp (`A.onDblEnt`).

## v5p: hatch đủ tuỳ chọn, TINSERT, PLOTSTAMP, STANDARDS / CHECKSTANDARDS, Plot Style Table Editor, dấu tâm liên kết
- Hatch: `PATS._USER` (mẫu tự định nghĩa: `e.usp` khoảng cách, `e.udbl` hai chiều), gốc mẫu `e.porg` (`A.hatchOrigin`, HATCHSETORIGIN), `e.hanno` chú thích, `e.nassoc` không liên kết, thứ tự vẽ (`A.hatchDrawOrder`). DXF ghi đúng mã 76 / 41 / 77 cho mẫu _USER.
- Bảng: viền `{ dbl, sp }` (viền đôi) trong kiểu ô; khối trong ô `tbld.cb['r,c'] = { name, src, sc, fit, rot, al }` (TINSERT), dựng lại cùng bảng (`_keep`).
- In: `A.plotPost(R, forPreview)` chạy sau `plotRender` — in lộn ngược (`PS.ud`) và dấu in (`PS.stamp`, cài đặt `dvd:plotstamp`, nhật ký `dvd:plotlog`). Biến LOGINNAME.
- Chuẩn CAD: tệp chuẩn theo bản vẽ ở `dvd:standards` (bảng LAYER / LTYPE / STYLE / DIMSTYLE đọc từ DXF bằng `A.dxfStdTables`), cài đặt `dvd:stdset`, lỗi bỏ qua `dvd:stdign`; `A.stdProblems()` liệt kê lỗi, biểu tượng ⚖ trên thanh trạng thái.
- Kiểu in .ctb: thêm thuộc tính `g` (chuyển xám, `color_policy` bit 2) và `d` (mô tả kiểu) khi đọc / ghi .ctb; Plot Style Table Editor mới (`A.plotStyleEditor`).
- Dấu tâm: đường số 0 của nhóm `*CENTERMARK` giữ `cmk = { c, r, s, e, na }` (+ `cmi` thứ tự nét); đường tâm `*CENTERLINE` giữ `cln = { a, b, e, na }`. Gói `A.commit` dựng lại khi đối tượng gốc đổi, cập nhật dữ liệu khi dấu tâm bị dời / xoay / co giãn.
- `A.runWithFile(cmd, file)` chạy một lệnh có hộp chọn tệp với tệp đã chọn sẵn (ATTACH). `A.refeditLocal()` lấy hình khối đang sửa ở toạ độ khối (BSAVEAS). `A.textWin(title, text)` cửa sổ văn bản (TEXTSCR, DBLIST).
- Kiểu hiển thị riêng (VSSAVE / Tạo kiểu mới) ở `dvd:vsuser`. Mọi hộp thoại còn kiểu cũ đã chuyển sang `A.acw`.

## v5o: lệnh mới và hộp thoại như AutoCAD 2027 (TABLESTYLE, COUNT, Action Recorder, hyperlink…)
- Tệp mới `dvd-acad-dlg2.js` (nạp sau `dvd-acad-dlg.js`), dùng bộ dựng hộp thoại `A.acw`.
- Kiểu bảng: thư viện `A.TBS` (localStorage `dvd:tblstyle`). Bảng mang ảnh chụp kiểu `tbld.tss` (+ `ts` tên kiểu, `rs` kiểu ô từng hàng, `cs` kiểu ô từng ô, `tsf` hệ số SCALE).
  - `A.tblBuild` dựng bảng theo kiểu: nền ô gộp vùng cùng màu, viền trong / ngoài theo kiểu ô, căn lề 9 vị trí, định dạng số (`A.tblFmt`). `A.tblCellAt` tìm ô theo điểm.
- COUNT: thanh đếm, bảng Count (`A.countBlocks`), trường đếm `fld = { k: 'count', blk }` tự cập nhật sau mỗi `A.commit`.
- Tỉ lệ chú thích: `A.scaleList` / `A.scaleName` (SCALELISTEDIT), `e.ascl` (OBJECTSCALE), cờ vẽ `e.avh` khi ANNOALLVISIBLE = 0. Biến mới ANNOALLVISIBLE, CTABLESTYLE.
- Siêu liên kết thống nhất ở `e.url` (+ `urld` chữ hiển thị, `urlsub` góc nhìn đích); XDATA lưu thêm `urld`, `urlsub`, `ascl`, `gns`, `gdsc`.
- Action Recorder: lõi gọi `A.onReqRes(req, v)` mỗi khi một lời nhắc nhận giá trị; macro lưu ở `dvd:actm`, đăng ký thành lệnh theo tên. Script ngắt được (Esc / Backspace) và chạy tiếp (`A.runScriptToks`).
- Nhóm: `e.gns` = nhóm không chọn cả nhóm (`A.expandGroups` bỏ qua), `e.gdsc` mô tả; nhóm đặt tên dùng `blk = '*G:<tên>'` (CLASSICGROUP).
- Gradient: `A.gradFill` vẽ 9 kiểu chuyển màu của AutoCAD; `HS.gmode` / `HS.grad` cho HATCH / GRADIENT; `A.applyHatchEdit` cho HATCHEDIT.
- Tham số người dùng của Parameters Manager lưu ở `dvd:userpar::<bản vẽ>` và tham gia giải biểu thức ràng buộc.
- Hộp thoại kiểu cũ đã làm lại: FILTER, ALIASEDIT, SPELL, APPLOAD, LAYTRANS, LAYWALK, PUBLISH, DDVPOINT, VPORTS, PARAMETERS, INPUTSEARCHOPTIONS, Load or Reload Linetypes (`A.parseLin`, `A.defineLT`), Hatch Edit.
- Ribbon: Manage → Action Recorder, Applications (APPLOAD, Graphics Performance), System Variables = SYSVDLG; Annotate → Tables (Table Style, Match Cell), Annotation Scaling (Add/Delete Scales, Scale List); View → Palettes (Count, Quick View); Express Tools → Blocks (Replace Block, Reset Block); Insert → Hyperlink.

## v5n: chữ định dạng, trường, cột, MLSTYLE đủ mục, BATTMAN như AutoCAD 2027
- Chữ có định dạng (`dvd-acad-dlg.js`):
  - Lưu theo từng đoạn: `e.rt` = `[{ t, b, i, u, o, f }]`; `e.rtx` = chữ lúc gán (chữ bị sửa ở nơi khác thì bỏ định dạng).
  - Phần dàn dòng / chia cột dùng chung cho vẽ (`A.drawRichText`), khung bao (`A.richExtent`) và xuất DXF / DWG (`A.richPieces`).
  - Đọc mã MTEXT của AutoCAD bằng `A.mtextRuns`. Lưu / mở lại qua XDATA "DVDCAD" (`rt`, `rtx`, `cols`, `mtp`, `mtwk`).
- Bộ soạn chữ tại chỗ dùng vùng soạn có định dạng (contenteditable):
  - B / I / U / O theo vùng chọn hoặc cho chữ gõ tiếp; hoàn tác riêng.
  - Có trường (khối nền xám), ngắt cột, dán chữ thuần.
- Trường: hộp thoại Field (`A.fieldDialog`) và lệnh FIELD mới. `A.fieldValue` có thêm ngày tạo / ngày lưu, định dạng ngày kiểu AutoCAD (`A.fmtDate`), chữ hoa / thường, thuộc tính tuỳ chỉnh. UPDATEFIELD cập nhật cả trường nằm trong chữ.
- Cột MTEXT (`e.cols = { n, w, g, h, dyn }`): mỗi cột xuất thành một MTEXT riêng. Các mảnh phụ mang `colx` và được bỏ khi mở lại.
- Chữ lộn ngược (`e.ud`) và góc nghiêng (`e.obl`): vẽ, khung bao, DXF (51 / 71 & 4), DWG, kiểu chữ.
- MLINE / MLSTYLE:
  - Thêm màu / kiểu nét từng thành phần, tô màu, mối nối, nắp cung ngoài / cung trong, góc nắp (`A.mlineEnts`).
  - Đọc / ghi file .mln (`A.mln.parse`, `A.mln.write`).
- BATTMAN (`A.battman`): Edit Attribute có xem trước (hoàn tác khi Cancel) và Settings. Chế độ thuộc tính (`ainv`, `acon`, `aver`, `apre`, `alock`, `aml`) đi qua `A.syncAtts`. ATTDISP có thêm Bật (ON).

## v5m: soạn chữ tại chỗ, tab Array Creation, các hộp thoại còn lại như AutoCAD 2027
- Bộ soạn chữ tại chỗ (`A.inplaceText`, `A.textFinish`, `A.textSrc` trong `dvd-acad-dlg.js`):
  - MTEXT / TEXT / DDEDIT soạn ngay trên bản vẽ, đúng vị trí, cỡ, góc, canh lề; tab ngữ cảnh **Text Editor**.
  - MTEXT ngắt dòng theo bề rộng khung; giữ nội dung gốc (`mtp`) và tỉ lệ khung (`mtwk`) để sửa lại.
  - Nhập từ script / LISP / dòng lệnh đi thẳng vào ô soạn (mỗi dòng một dòng chữ, dòng trống = xong).
- Tab ngữ cảnh **Array Creation** cho ARRAYRECT / ARRAYPOLAR (sửa số lượng, khoảng, xem trước tức thì); vòng lặp sửa mảng như AutoCAD (`A.getPoint` với `previewAlways`).
- **Select Color** (`A.selectColor`) cho COLOR và mọi ô chọn màu; `-COLOR` / `-PURGE` cho script, LISP gọi `(command "COLOR" …)` / `(command "PURGE" …)` chạy bản dòng lệnh.
- Hộp thoại theo bố cục AutoCAD: PURGE, RENAME, Layer States Manager, View Manager, Find and Replace (không phân biệt dấu), Enhanced Attribute Editor, Geometric Tolerance, Drawing Properties, Multileader Style Manager, Multiline Style, External References.
- Thư viện kiểu có tên mới: kiểu ghi chú dẫn (`dvd:mlslib`), kiểu đường đôi (`dvd:mlstylelib`, nắp đầu / cuối riêng `capS` / `capE`).

## v5l: hộp thoại và ribbon như AutoCAD 2027
- Khung hộp thoại chung (`A.dialog` trong `dvd-acad-cmds.js`):
  - thanh tiêu đề kéo được, nút **?** / **×**, nút OK · Cancel · Help ở góc dưới phải;
  - kiểu `modeless` cho bảng nổi (vẫn vẽ được phía sau).
  - Giao diện điện thoại giữ kiểu cũ (nút to, Huỷ bên trái).
- `dvd-acad-dlg.js` (mới):
  - bộ dựng điều khiển (khung nhóm, tab, listbox, ô màu / kiểu nét / bề rộng nét, canvas xem trước);
  - các hộp thoại theo bố cục AutoCAD: Dimension Style Manager (7 tab + xem trước + Compare), Text Style, Layer Properties Manager (bảng nổi), Drafting Settings, Drawing Units, bảng Blocks + CLASSICINSERT, Block Definition, Attribute Definition, Hatch and Gradient + tab ngữ cảnh Hatch Creation, Options.
- Lõi kích thước (`dvd-acad-cmds.js`):
  - thêm các biến kiểu như AutoCAD: DIMCLRD/E/T, DIMLWD/E, DIMLTYPE, DIMSD1/2, DIMSE1/2, DIMFXL, 20 mũi tên DIMBLK1/2, DIMCEN, DIMTAD, DIMJUST, DIMTIH, DIMSCALE, DIMLUNIT, DIMDSEP, DIMRND, DIMZIN, DIMAUNIT, DIMALT…, DIMTOL / DIMLIM;
  - thư viện kiểu có tên (`A.dimStyles`); sửa kiểu thì kích thước dùng kiểu đó dựng lại.
- Ribbon:
  - không còn thanh cuộn ngang; thu gọn bảng theo bề ngang thật (ResizeObserver, nạp phông);
  - bảng thu gọn bật ra đủ nút; tab ngữ cảnh (`A.ribbonCtx`).
- Viết lại theo AutoCAD: Plot, Insert Table, Quick Select, Linetype Manager, Lineweight Settings, Point Style.
- Sửa bảng mã `$INSUNITS` (7 = km, 10 = yard, 15 = decameter).

## v5k: tự ghi DWG (AutoCAD 2000), không cần ODA File Converter
- `dvd-dwg.js`: bộ ghi **DWG R2000 (AC1015)** bằng JavaScript, chạy trong trình duyệt, điện thoại và bản Windows.
  - Đầu vào là DXF 2000 của `dvd-acad-dxf.js` (`A.dxfR2000`), nên DWG giữ đúng những gì DXF giữ: bảng lớp / kiểu nét (cả kiểu nét có chữ, hình) / kiểu chữ / dimstyle / VPORT / APPID, khối + thuộc tính, DIMENSION (thẳng, chéo, góc 3 điểm, bán kính, đường kính), HATCH đặc và mẫu, LWPOLYLINE (cung, độ rộng), TEXT / MTEXT, SOLID / 3DFACE, ELLIPSE, XLINE / RAY, WIPEOUT, từ điển, LAYOUT, MLINESTYLE, XRECORD.
  - Viết theo tài liệu mở của Open Design Alliance và mã nguồn LibreDWG (cùng GPL-3.0): mã hoá bit, CRC-16, thứ tự trường, bố cục section giống AutoCAD 2000 (header → AuxHeader → ảnh xem trước BMP → biến hệ thống → lớp → đối tượng → bản đồ handle → ObjFreeSpace → header phụ → Template).
  - Dữ liệu riêng DVDCAD (XDATA "DVDCAD": khối 3D tham số, vùng, thứ tự vẽ, chú thích theo tỉ lệ; DVDCAD_DATA: ràng buộc, khối động) ghi thành EED chuẩn và một khối `DVDCADX1` giữa các section, vì bộ đọc WASM chưa đọc được EED của DWG 2000.
  - API: `A.dwgNative(ents)` → `Uint8Array`; `DVDDwg.dwgFromDxf(text, { bmp })` (chạy được trong Node để kiểm thử).
- `SAVEDWG` mặc định dùng bộ ghi gốc (từ v5t: DWG 2018, chọn 2013 / 2010 / 2004 / 2000 trong `DWGSERVER`; DWG 2007 qua ODA File Converter / máy chủ, không có thì ghi DWG 2004). `SAVEAS` / Ctrl+S chọn được `*.dwg`.
- Mở DWG: bỏ ATTRIB trùng (libredwg trả ATTRIB cả trong danh sách chung lẫn trong `INSERT.attribs`); đọc khối `DVDCADX1` của file do DVDCAD ghi.
- Kiểm tra:
  - 36 file DWG mẫu của LibreDWG (2000 → 2018) + `sample.dwg` (10 nghìn đối tượng): mở → ghi DWG gốc → mở lại, **giống hệt từng đối tượng** so với mở lại bản DXF 2000; LibreDWG đọc mọi file không cảnh báo.
  - `desktop/test/smoke.js` mục 7: SAVEDWG / SAVEAS *.dwg / bản vẽ tổng hợp (kích thước, hatch, chữ Việt, kiểu nét chữ/hình, khối 3D, vùng che) → DWG → mở lại.
  - GitHub Actions: ODA File Converter đọc + audit các file DWG do DVDCAD ghi (artifact `DVDCAD-DWG-kiem-tra`).
- Ký số bản Windows (không bắt buộc): secret `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (.pfx) hoặc Azure Trusted Signing; kiểm tra chữ ký sau khi dựng. Xem `HUONG-DAN-WINDOWS.md`.

## v5j: dòng lệnh và cách dùng lệnh như AutoCAD 2027
- `dvd-cmd.js` (thanh dòng lệnh):
  - Gợi ý khi gõ theo `INPUTSEARCHOPTIONS`: khớp đầu tên, giữa chuỗi, từ đồng nghĩa (`ROUND` → FILLET, `XOAY` → ROTATE), tự sửa lỗi gõ (sửa 3 lần thì tự chạy), biến hệ thống kèm giá trị, nội dung bản vẽ (lớp, khối, mẫu hatch, kiểu chữ). Xếp lệnh hay dùng lên đầu; phần còn lại của tên hiện mờ (→ / Tab để nhận).
  - Nút ✕ / Tuỳ chỉnh / Lệnh gần đây; `CLIPROMPTLINES`, độ trong suốt, neo ở đáy cửa sổ. Lời nhắc dài xuống dòng thay vì bị cắt.
  - ↑ / ↓ ở lời nhắc gọi lại nhập gần đây; ↓ mở danh sách tuỳ chọn cạnh con trỏ (DYNPROMPT); Tab khoá ô nhập động.
  - F1 theo ngữ cảnh: trang cách dùng của lệnh đang chạy (`dvd-help.js`) + **Tìm trên ribbon** (`A.ribbonFind`). Ctrl+F2 = cửa sổ chữ.
  - Lịch sử ghi "lời nhắc: câu trả lời" như AutoCAD, dạng mảnh để giao diện English dịch được (`log([...])`, `{ nt }` = giữ nguyên).
- `dvd-acad-core.js` (bộ nhập):
  - Nhập động: `x,y` của điểm thứ hai trở đi là tương đối (`DYNPICOORDS`), `#x,y` / `*x,y` tuyệt đối, `x,y,z`, `@` = LASTPOINT; số `1/2`, `3-1/2`, feet-inch `5'6"` (bản vẽ inch / feet).
  - Khoá góc `<45`, bộ lọc điểm `.X .Y .Z .XY .XZ .YZ`, `TT`, `FROM`, `M2P`; gõ số theo đường truy bắt (OTRACK / TT); Tab khoá độ dài / góc / X / Y.
  - Chọn đối tượng: `W`, `C`, `BOX`, `G`, `U`, `SI`, `M`, `AU`, `?` (thêm vào ALL / P / L / R / A / F / WP / CP có sẵn).
  - Lệnh trong suốt chạy lồng (`'CAL`, `'DIST`, `'ID`, `'ZOOM`, `'LAYER`, biến hệ thống…) rồi trở lại lệnh đang dở; `'CAL` trả kết quả cho lời nhắc.
  - Chuột phải: bấm nhanh = Enter, giữ = menu lệnh (`A.cmdMenu`); Shift + chuột phải = menu bắt điểm (`A.osnapMenu`).
- `dvd-acad-cmdline.js` (mới): menu chuột phải, `INPUTSEARCHOPTIONS`, `-LAYER`, `-INSERT`, `-OSNAP`, `UNDO` (số bước, BE/E, M/B), `MULTIPLE` hỏi trên dòng lệnh, 17 biến hệ thống mới (`A.sysvar.def`).
- `dvd-help.js` (mới): cách dùng của ~60 lệnh thông dụng + lời nhắc đầu của mọi lệnh (`tools/help/prompts.js` sinh tự động).
- Tuỳ chọn lệnh theo AutoCAD 2027: PLINE (Length, cung Angle / CEnter / CLose / Direction / Radius / Second pt), CIRCLE (Ttr), RECTANG (Chamfer / Fillet / Width / Area / Rotation), ELLIPSE (Arc), XLINE (Ang / Bisect / Offset), TEXT (Style, 15 kiểu canh lề), MTEXT (Height / Justify / Rotation / Style / Width), MOVE / COPY (Enter = độ dời, mOde, Exit), TRIM / EXTEND (Crossing / Fence / mOde / eRase, Boundary edges = B), FILLET (Trim, Shift = góc nhọn), CHAMFER (2 khoảng, Angle, Trim, mEthod), ZOOM (Center / Scale / 2X), AREA (Add / Subtract), DIST (Multiple), MEASUREGEOM (Distance / Radius / Angle / ARea), DIVIDE / MEASURE (Block), PEDIT (Fit / Spline / Decurve / Undo), OFFSET (Exit), DIMLINEAR (Mtext / Text), WIPEOUT (Polyline = P), `-BLOCK`.
- Kiểm thử: thêm mục 9 vào `desktop/test/smoke.js` (nhập động, khoá góc + `'CAL`, bộ lọc `.X`, script `-LAYER` + `UNDO BE/E`, gợi ý đồng nghĩa / sửa lỗi gõ / biến hệ thống, trợ giúp).

## v5i: bản Windows chạy offline + trang Start kiểu AutoCAD
- **DVDCAD cho Windows** (`desktop/`, Electron): bộ cài `DVDCAD-Setup-*.exe` và bản portable, chạy hoàn toàn offline. Hướng dẫn: **[HUONG-DAN-WINDOWS.md](HUONG-DAN-WINDOWS.md)**.
  - Toàn bộ app (cả bộ đọc DWG WASM) đọc thẳng từ ổ đĩa qua `dvdcad://app/`, không cần service worker hay mạng.
  - `OPEN` / Ctrl+O mở hộp thoại *Select File* của Windows (chọn nhiều file, mỗi file một tab). Ctrl+S ghi đè đúng file đã lưu; ghi qua file tạm nên không hỏng file cũ nếu lỗi giữa chừng.
  - Nhấp đúp file .dwg / .dxf trong Explorer (bộ cài gắn sẵn), kéo thả file vào cửa sổ. Chỉ một cửa sổ: file mở thêm thành tab mới.
  - Chỉ đọc / ghi file người dùng đã chọn; link web mở bằng trình duyệt mặc định.
  - GitHub Actions `.github/workflows/desktop-windows.yml` dựng bộ cài trên `windows-latest`; đẩy thẻ `v*` thì tạo Release.
- `dvd-desktop.js`: cầu nối trong giao diện (trên trình duyệt không làm gì).
- `dvd-acad-start.js`: tab **Start** là một trang riêng như AutoCAD (ẩn ribbon).
  - Bản vẽ mới theo mẫu: mm (acadiso), m, inch (acad). Ngoài ra có Mở…, Google Drive, Bản vẽ mẫu, và mục Tìm hiểu.
  - Bản vẽ gần đây dạng lưới ảnh thu nhỏ hoặc danh sách; tìm theo tên, sắp xếp, ghim, xoá khỏi danh sách, mở thư mục chứa file.
  - Tự hiện khi chưa mở bản vẽ nào; mở hoặc chuyển bản vẽ thì tự ẩn.
- `NEW` nhận mẫu đơn vị (`A.newDrawing({ units })`).
- `dvd-acad-pgp.js`: lệnh tắt mặc định giống `acad.pgp` của AutoCAD.
  - 207 / 226 lệnh tắt trỏ đúng lệnh. 19 lệnh tắt còn lại chưa có lệnh trong DVDCAD (render, sheet set, chuẩn bản vẽ…).
  - `DO` = DONUT (đo nhanh nay là `QM`), `T` = MTEXT (chữ một dòng vẫn là `DT`).
  - Thêm 26 lệnh tắt còn thiếu, như `PA`, `REA`, `RA`, `EXP`, `EPDF`, `ADC`, `ATI`, `BC`, `CLI`, `XB`, `TI`, `VSM`.
  - Lệnh tắt riêng của người dùng (ALIASEDIT) vẫn được ưu tiên.
- Biểu tượng: vẽ thêm cho mọi lệnh còn thiếu, như REGEN, OOPS, CLOSE, QUIT, GOTO và các lệnh đóng bảng.
  Biến hệ thống dùng chung một biểu tượng. Gợi ý lệnh ở dòng lệnh có biểu tượng như AutoComplete của AutoCAD.
- `LICENSE`: GPL-3.0 (mã nguồn mở, bắt buộc vì có LibreDWG).
- **Viết lại 3 mô-đun v4k bị thiếu** (`index.html` vẫn nạp nhưng chưa từng có trong repo, nên các lệnh dưới đây không chạy):
  - `dvd-acad-x3.js`:
    - Thứ tự vẽ: `DRAWORDER` / `DR` (F B A U), `TEXTTOFRONT`, `HATCHTOBACK`.
    - Vùng che: `WIPEOUT` / `WO` (điểm, D đa tuyến, F khung).
    - Chú thích theo tỉ lệ: `CANNOSCALE` (ô ▲ 1:N ở thanh trạng thái), `ANNOTATIVE`.
    - Lưu DWG: `SAVEDWG` / `DWGOUT`, `DWGSERVER`. Bản Windows chuyển bằng ODA File Converter trên máy (từ v5k: mặc định tự ghi DWG 2000).
  - `dvd-acad-x4.js`: ràng buộc tham số.
    - Lệnh: GC* (10 lệnh), DC* (6 lệnh), `GEOMCONSTRAINT`, `DIMCONSTRAINT`, `AUTOCONSTRAIN`, `PARAMETERS`, `DELCONSTRAINT`, `CONSTRAINTBAR`.
    - Bộ giải lan từ đối tượng vừa sửa ra ngoài và móc vào `A.commit`, nên mọi cách sửa đều giữ ràng buộc, U hoàn tác cả nhóm.
    - Giá trị là biểu thức (`d1*2`, `sqrt(d1^2+d2^2)`). Ràng buộc lưu kèm DXF.
  - `dvd-acad-x5.js`: khối động.
    - `BPARAMETER`: V hiển thị, L kéo giãn, F lật, X bỏ.
    - Đổi trạng thái bằng `BDYN` hoặc mục "Khối động" trong bảng Thuộc tính. Bản chèn mới tự nhận định nghĩa.
- Kiểm thử bộ cài thật: `desktop/test/installed.js` chạy trên `windows-latest` (cài lặng → kiểm tra file / gắn .dwg .dxf / lối tắt → chạy `smoke.js` trên `DVDCAD.exe` đã cài → gỡ cài).
- Bản phát hành: đẩy thẻ `v*` (vd `v5.9.0`), hoặc **Actions → DVDCAD Windows → Run workflow** trên `main` với `release_tag` = `v5.9.0`; ghi chú lấy từ `desktop/RELEASE-NOTES.md`.
- `sw.js`: nạp từng file riêng. Trước đây thiếu một file (404) làm hỏng cả bộ nhớ offline.
- Kiểm thử: `desktop/test/smoke.js` (29 bước). Gồm: mở DWG từ dòng lệnh, OPEN / SAVEAS / QSAVE qua hộp thoại, lưu lỗi, trang Start, lần chạy thứ 2, an toàn file / link, lệnh phục hồi + SAVEDWG, lệnh tắt acad.pgp.

## v5h: XCLIP giống AutoCAD
- `index.html`:
  - Bản ghi đường cắt `XCLIPS` (mã → `{bp: đa giác toạ độ khối, on, inv, cache}`); `xclipNew`, `xclipFor(R, bm)` (đường cắt WCS theo ma trận chèn, dùng chung 1 đối tượng), `xclipApply(list, R)`.
  - Thành viên khối: `xcl` (mã bản ghi), `xo` + `xh` (nằm ngoài, ẩn nhưng giữ trong bản vẽ), `xp` + `clip` (cắt ngang). Vẽ, bắt điểm (`isHiddenE`), phạm vi, chọn, khung nhìn layout bỏ qua `xh`.
  - Đường cắt đảo ngược: cắt canvas theo chẵn-lẻ (`clip('evenodd')`), đa giác có lỗ kiểu AutoCAD.
  - `drawXclipFrames` + `XCLIPFRAME` (đọc `$XCLIPFRAME` của DXF / DWG). Hoàn tác thao tác tự định nghĩa: `{op: 'fn', undo, redo}`.
- `dvd-acad-x17.js`: lệnh XCLIP (Bật / Tắt / Xoá / Tạo đa tuyến / Khung cắt mới: đa tuyến, đa giác, chữ nhật, đảo ngược), XCLIPFRAME; bọc `A.commit` để đường cắt đi theo khối khi dời / xoay / chép, bỏ khi phá khối.
- `dvd-acad-core.js`: `isHiddenB` (ẩn không tính XCLIP) cho chọn theo nhóm, `gripSel` bỏ phần ẩn.
- `dvd-acad-dxf.js`: khối ghi đủ thành viên + xdict → ACAD_FILTER → SPATIAL_FILTER (đỉnh WCS, ma trận nghịch đảo của INSERT). `dvd-acad-cmds.js` (R12): bỏ phần ẩn.
- Kiểm thử: `v5h_test.py` (25 bước, đọc lại DXF bằng ezdxf).

## v5g: XCLIP của file DWG / DXF
- `index.html`:
  - DWG: `dwgXclipMap(db)` đọc `db.objects.SPATIAL_FILTER` qua từ điển mở rộng của INSERT (`ownerDictionaryHardId` → ACAD_FILTER → SPATIAL); INSERT có `xc` (đa giác trong toạ độ khối).
  - DXF: đọc DICTIONARY / SPATIAL_FILTER trong OBJECTS; giữ mã 360 (`_DXF_SKIP`) để lấy xdict của INSERT.
  - `xclipBlockPoly`: đỉnh × ma trận nghịch đảo INSERT lúc cắt (12 số 40 đầu), 2 đỉnh = chữ nhật, mã 71 = 0 → bỏ.
  - `explodeInto` → `xclipRange`: bỏ đối tượng nằm hẳn ngoài, gắn `e.clip` `{x,y,w,h,poly,xc:1}` cho đối tượng cắt ngang.
  - `applyClip` cắt thêm `c.sub` (XCLIP trong khung nhìn layout); `ptInClip` dùng khi bấm chọn (`A.pickAt`).
- Kiểm thử: `v5g_test.py` (14 bước), file mẫu `test/xclip_test.dxf` (ezdxf: chữ nhật, tam giác, khối xoay kiểu AutoCAD, đường cắt tắt).

## v5f: lệnh AutoCAD còn thiếu
- `dvd-acad-x16.js`:
  - Khung nhìn layout: VPLAYER, LAYVPI, VPCLIP, VPSYNC, SPACETRANS. Dữ liệu riêng từng khung nhìn (`frz`, `cp`) lưu ở `localStorage` `dvd:vpx` theo bản vẽ + layout + số thứ tự khung nhìn, đọc qua `window.vpExtra(L, i)`.
  - Nhập / xuất: IMPORT, ATTACH, ACISIN, ETRANSMIT / ARCHIVE (`A.zipStore`: zip không nén, CRC32), TIFOUT, BMPOUT, XOPEN, REINIT, 3DPRINT, EXPORTTOAUTOCAD, RECOVERALL, XBIND.
  - MKLTYPE (`A.mkltPattern`), IMAGEFRAME, IMAGEQUALITY, SPOTLIGHT, DISTANTLIGHT, LIGHTLIST, SEPARATE (`A.meshParts`), AUTOCOMPLETE, DRAGMODE và các tên gọi khác.
- `index.html`: `buildPaperEntities` bỏ lớp đóng băng theo khung nhìn, thay khung bằng đường cắt; `applyClip` / `drawViewportFrames` cắt theo đa giác; `drawImageEnt` theo IMAGEFRAME / IMAGEQUALITY.
- `dvd-acad-pro.js`: xuất `A.saveLayoutDef`, `A.proIdbGet`, `A.xrefList`, `A.refreshLayout`; khung khung nhìn có `vpi`.
- `dvd-acad-3d.js`: đèn rọi (`SpotLight`), đèn song song (`DirectionalLight`), đèn tắt (`light.off`); dựng lại đèn khi bản vẽ đổi (`view3D.rebuildLights`).
- `dvd-cmd.js`: gợi ý lệnh theo `window.DVD_AUTOCOMPLETE`.
- Kiểm thử: `v5f_test.py` (45 bước kiểm tra).

## v5e: lệnh AutoCAD còn thiếu
- `dvd-acad-x15.js`:
  - Độ trong suốt: `e.tp` (CETRANSPARENCY, TRANSPARENCY, nút TP).
  - Giao diện: RIBBON / RIBBONCLOSE, COMMANDLINE(HIDE), PROPERTIESCLOSE, LAYERCLOSE, HIDE / SHOWPALETTES, GRAPHSCR, NAVBAR, WORKSPACE, QCCLOSE.
  - File: QUIT / EXIT / QQUIT, SAVEALL, REVERT, PREVIEW, LOGFILEON / OFF.
  - Lệnh: UNDEFINE / REDEFINE, MPEDIT, DIMLAYER, XDLIST, DCLINEAR, VIEWRES, LAYERPMODE, ARRAYCLOSE và các tên gọi khác.
  - 3D: MESH, CONVTOMESH / SOLID / SURFACE, 3DFACE, THICKEN.
- `index.html`: vẽ trong suốt (globalAlpha, không gộp nét), đọc DXF 440. `dvd-acad-dxf.js`: ghi 440.
- `dvd-cmd.js`:
  - Dòng "Độ trong suốt" trong bảng Thuộc tính (đối tượng mới / một / nhiều đối tượng).
  - UNDEFINE: danh sách lưu ở `dvd:undef`, tiền tố `.`.
- Kiểm thử: `v5e_test.py` (29 bước kiểm tra).

## v5d: add-in AutoLISP / JavaScript (APPLOAD)
- `dvd-lisp.js`: bộ thông dịch AutoLISP chạy bất đồng bộ.
  - Kiểu dữ liệu: số nguyên / số thực tách riêng, cặp chấm, tên đối tượng, tập chọn.
  - Phạm vi biến động (dynamic scope); `defun c:` thành lệnh DVDCAD.
  - Hỏi người dùng (`getpoint`…) chạy trong ngữ cảnh lệnh tạm, Esc thì huỷ hàm.
  - `(command …)` chờ từng lời nhắc qua `A.reqSeq`.
  - `entget` / `entmod` / `entmake` dùng mã DXF; tên đối tượng bền qua `_lid`, khối / kích thước theo nhóm.
  - Gõ được `(…)` và `!bien` ở dòng lệnh.
- `dvd-addins.js`:
  - APPLOAD: kho add-in lưu trong `localStorage` `dvd:addins`, Startup Suite.
  - VLISP (bảng gõ thử), API `window.DVDCAD` cho add-in `.js`, thẻ ribbon Add-ins.
- `addins/`: `qs-khoi-luong.js`, `lisp-tien-ich.lsp`. `ADDIN-API.md`: hướng dẫn viết add-in.
- `dvd-acad-core.js`: `A.run(…, { quiet })`, `A.reqSeq`. `dvd-cmd.js`: phím cách trong biểu thức LISP.
- Kiểm thử: `v5d_test.py` (36 bước kiểm tra).

## v5c: ngôn ngữ giao diện đồng bộ English / Tiếng Việt
- `dvd-i18n.js`: một công tắc ngôn ngữ chung (`DVDI18N`, khoá `dvd:riblang`, mặc định theo trình duyệt).
  - Khi chọn English, `MutationObserver` thay chữ hiển thị: nút chữ, `title`, `placeholder`, `aria-label`, `data-tl`, nút `<input>`, `alert` / `confirm` / `prompt`.
  - Cách thay: khớp nguyên câu trước. Không khớp thì thay từng mảnh, theo thứ tự dài trước.
  - Từ đơn chỉ dịch khi đứng cạnh số, `=`, `:`, `·` hoặc ngoặc.
  - Không dịch: phần trong "…", ô `.nm`, phần tử `translate="no"`, tên lớp / khối / layout.
  - Chuyển về Tiếng Việt thì trả lại chữ gốc.
- `dvd-i18n-en.js`: từ điển khoảng 4.100 mục, sinh từ chuỗi tiếng Việt trong mã bằng `tools/i18n/extract.py` + `build.py` (bản dịch gốc: `tools/i18n/translations.json`).
- `dvd-acad-ui.js`: ribbon dùng chung ngôn ngữ đó; menu Không gian làm việc có mục "Ngôn ngữ giao diện"; chú thích phụ tiếng Việt không còn hiện ở giao diện English.
- `manifest.webmanifest`: tên app "DVDCAD — DWG/DXF".
- Kiểm thử:
  - `v5c_test.py`: duyệt các thẻ ribbon, bảng Thuộc tính, khoảng 20 lệnh, 25 hộp thoại, menu, khung 3D, lịch sử lệnh; yêu cầu không còn chữ tiếng Việt và chuyển qua lại được.
  - Các bài cũ chạy với trình duyệt `vi-VN`.

## v5b: giống AutoCAD hơn — kích thước liên kết, đa tuyến rộng, POLYSOLID, mặt lưới
- `dvd-acad-x14.js`:
  - Kích thước liên kết (DIMASSOC 2, DIMDISASSOCIATE, DIMREASSOCIATE). Khi sửa đường hình, `A.commit` thêm các kích thước có gốc trùng điểm đặc trưng vào danh sách sửa, nên UNDO một lần trả lại cả hai.
  - Đa tuyến rộng: lưu `pw` = [x, y, rộng đầu, rộng cuối] theo đỉnh thật, dựng lại `wq` sau mỗi lần commit. `scaleEnt` nhân độ rộng.
  - Lệnh mới: POLYSOLID, RULESURF / TABSURF / REVSURF / EDGESURF / PLANESURF, SURFTAB1/2, VPOINT, DDVPOINT, HIDE, MINSERT, DIMROTATED, ABOUT, EXOFFSET, SAVEIMG, MTEDIT, EXCHPROP.
- `index.html`:
  - `widePoly()`: đọc LWPOLYLINE / POLYLINE có độ rộng (DXF, DWG), giữ kín + cung.
  - `polyWidthQuads` thêm phần lấp góc kiểu miter; mọi mảnh tô cùng chiều vòng nên tô không bị thủng.
- `dvd-acad-dxf.js`: ghi đa tuyến rộng thành LWPOLYLINE với 40 / 41 / 42 theo đỉnh.
- `dvd-acad-cmds.js`:
  - FILLET / CHAMFER P dùng cung thật cho mọi đa tuyến.
  - EXPLODE đa tuyến có cung ra ARC + LINE.
  - `A.chooseBlock`.
- `dvd-acad-3d.js`: kiểu xem "Khuất nét (HIDE)"; `view3D.setAzEl()` và `setStyle()`.
- Kiểm thử: `v5b_test.py`.

## v5a: xem 3D cập nhật khi bật / tắt lớp
- `dvd-acad-3d.js`: khi đang xem 3D, khung nhìn tự dựng lại nếu có một trong các thay đổi sau:
  - lớp ẩn / hiện;
  - màu lớp;
  - đối tượng bị ẩn (HIDEOBJECTS / ISOLATEOBJECTS);
  - số đối tượng.

  Nếu mở bản vẽ khác, khung 3D mở lại với bản vẽ mới. Trước đây chỉ sửa hình mới dựng lại.
- `dvd-acad-core.js`: chỉ đồng bộ trạng thái lớp từ bảng Lớp khi bảng đó thực sự đổi. Sửa được 3 lỗi:
  - LAYISO không tắt lớp nào;
  - LAYUNISO không khôi phục được;
  - LAYON sau cô lập bị bật lại.
- Kiểm thử: `v5a_test.py` dùng bản vẽ 3D của người dùng, gồm 15 bước kiểm tra; `d3.py` gồm 13 bước kiểm tra. Các bài cũ so nhãn phiên bản theo thứ tự (`>= v4x`) nên chạy được với v5.

## v4z: công cụ chữ, VIEWBASE, MSTRETCH…
- `dvd-acad-x13.js`: TJUST, TORIENT, TSCALE, TEXTFIT, TCIRCLE, MULTIPLE, HISTORY/TEXTSCR, ATTIPEDIT, XLIST, CHURLS, DELAY, DIMEX/DIMIM, MSTRETCH, VIEWBASE (3 hình chiếu, góc chiếu 1 / 3), BATTORDER, TEXTSTYLE.
- Kiểm thử: e2e_v4 sửa phép so sánh chữ (bảng Thuộc tính hiện tên loại bằng chữ HOA qua CSS); e2e_test cũ (giao diện trước v4) đã thay bằng e2e_v4.

## v4y: mở file dung lượng lớn + lệnh mới
- Đọc DXF không tách dòng, bỏ mã thừa (bộ nhớ tạm khi đọc file 37 MB: 174 → 86 MB). Giới hạn 2 triệu (máy tính) / 400 nghìn (điện thoại) đối tượng, có thông báo (trước bị cắt im lặng ở 200 nghìn).
- Phóng / dời bằng ảnh tạm của lớp nét rồi vẽ lại khi ngừng. Gom nét theo kiểu, ctx.arc cho tròn / cung, chữ không save/restore, chữ nhỏ thành vệt.
- `dvd-acad-x12.js`: QTEXT, FILL, ATTDISP, RECOVER, DIMREGEN, DIMJOGLINE, DIMINSPECT, GATTE, XEDGES, VPMAX/VPMIN, MSPACE/PSPACE, PAGESETUP.

## v4x: REVCLOUD như AutoCAD + lệnh mới
- `dvd-acad-x11.js`: REVCLOUD (cung lồi ra ngoài, cung nhỏ nhất / lớn nhất, Chữ nhật / Đa giác / Tự do / Đối tượng, Thường / Thư pháp, đảo chiều), REVCLOUDPROPERTIES, DIMOVERRIDE, BLOCKREPLACE, MOCORO, TCASE, CDORDER, HATCHGENERATEBOUNDARY, HATCHSETBOUNDARY, LAYTRANS, SHOWURLS, GETSEL, SSX, XPLODE, ARRAYCLASSIC.
- Đa tuyến rộng có cung: tứ giác tô khít nhau (không răng cưa).

## v4w: bổ sung lệnh còn thiếu so với AutoCAD
- `dvd-acad-x10.js`: DIM (kích thước thông minh), MLEDIT (chữ thập / chữ T / góc cho tường MLINE), ATTSYNC + BATTMAN, MLEADEREDIT / MLEADERALIGN / MLEADERCOLLECT, TRACE, 3DSCALE, FILTER, PASTEBLOCK, LIMITS, POLAR, VISUALSTYLES, DWGCOMPARE.
- PLINE W/H, PEDIT W (độ rộng), lưu DXF giữ độ rộng 40/41; đọc ATTDEF của khối trong DXF; đọc MLINE (DXF/DWG) thành đường đôi; DIMANGULAR chọn đường theo thứ tự nào cũng được.

## v4v: xem 3D file DWG 2007+
- Đọc dữ liệu ACIS nhị phân (SAB) của 3DSOLID trong DWG 2007 trở lên (`libredwg-web.js`: chép theo `sab_size` từ bộ nhớ WASM) → chế độ 3D hiện đủ khối.

## v4u: lưu DXF 2018
- Mặc định ghi DXF 2018 (AC1032): CLASSES, MATERIAL, MLEADERSTYLE, SCALELIST… như AutoCAD 2018; chữ UTF-8, màu RGB. `DXFVERSION`: 2018 / 2013 / 2010 / 2007 / 2004 / 2000 / Tự động / R12.
- Đọc DXF: màu RGB của lớp, giữ lớp rỗng.

## v4t: DXF giữ thêm màu RGB, WIPEOUT, thứ tự vẽ, ràng buộc
- Màu RGB (420, tự lên R2004), WIPEOUT thật, thứ tự vẽ theo thứ tự file, HATCH DOTS/EARTH/AR-CONC có đường mẫu.
- XDATA + XRECORD DVDCAD_DATA: ràng buộc tham số, khối động, chú thích theo tỉ lệ… mở lại còn nguyên.
- Hình ltypeshp.shx đúng số hiệu & hình; DXFVERSION thêm R2007 (UTF-8).

## v4s: lưu DXF R2000
- `dvd-acad-dxf.js`: ghi DXF AC1015 đầy đủ handle / BLOCK_RECORD / OBJECTS; bề rộng nét 370, LWPOLYLINE, MTEXT, HATCH (đặc + mẫu), ELLIPSE, XLINE/RAY, kiểu nét phức, khối + thuộc tính, DIMENSION. `DXFVERSION` để chọn lại R12.
- Đọc DXF/DWG: hatch giữ mẫu / tỉ lệ / góc; đường tròn, cung, elip trong khối giữ nguyên loại.

## v4r: cải tiến các giới hạn còn lại
- TRIM / BREAK / EXTEND / JOIN / FILLET / CHAMFER / REVERSE giữ cung của đa tuyến; từ khoá P không bị PAN chiếm.
- DXF: kích thước góc thành DIMENSION, bản khối sửa riêng thành khối biến thể.
- Kiểu nét có hình (FENCELINE, TRACKS, ZIGZAG, BATTING), nét đứt bắt đầu đúng mẫu; DATALINKURL (Google Sheets / CSV online, dùng được trên iPhone).

## v4q: cải tiến các hạn chế còn lại
- Đa tuyến có cung (bulge) giữ đúng cung khi sửa, OFFSET, bắt điểm, lưu DXF; PLINE cung.
- Lưu DXF: khối thành BLOCK/INSERT + ATTDEF/ATTRIB, kích thước thẳng/bán kính/đường kính thành DIMENSION, vùng kèm XDATA.
- HATCH tự mở rộng vùng dò biên; kiểu nét phức có chữ (đọc DXF/DWG + vẽ); DATALINK theo dõi file Excel (File System Access); xuất file .ctb.

## v4p: kiểu in CTB, bảng Excel, vùng 2D, SNAPANG
- STYLESMANAGER / CTB: nhập file `.ctb` của AutoCAD, sửa màu in, bề rộng nét, độ đậm theo màu; chọn trong PLOT.
- DATALINK (bảng từ Excel/CSV, SheetJS 0.18.5 Apache-2.0, tải khi cần), DATALINKUPDATE, TABLEEXPORT (CSV/xlsx).
- REGION + UNION/SUBTRACT/INTERSECT cho vùng 2D (polygon-clipping, MIT), MASSPROP vùng.
- SNAPANG, SNAP, GRID, ORTHO; menu nắm kéo đa tuyến (thêm/xoá đỉnh, đoạn ↔ cung); OFFSET Xoá/Lớp/Nhiều lần.
- Tool Palettes kéo-thả; PDFIMPORT nhận cung/đường tròn và nhập PDF quét thành ảnh; MLEADERSTYLE, COUNT, DBLIST, COLOR, BASE, JPGOUT, CLEANSCREENON, COPYHIST.

## v4o: cải tiến giới hạn + Tool Palettes, DesignCenter, PDF Import
- SPELL tiếng Việt offline (quy tắc ghép vần + từ điển riêng + gợi ý); VPORTS xoay từng khung; hatch liên kết vùng ghép nhiều nét.
- DIMBREAK tự cập nhật, dùng được cho kích thước của file; MIRRTEXT 1.
- TOOLPALETTES (Ctrl+3) với ký hiệu kiến trúc, ADCENTER (Ctrl+2), PDFIMPORT (pdf.js v3.11, Apache-2.0, tải khi cần).

## v4n: các phần còn thiếu
- VPORTS (nhiều khung nhìn trong Model), mảng liên kết + ARRAYEDIT, hatch liên kết đường biên.
- SPELL, SETVAR + biến hệ thống (OSMODE, PDMODE…), PTYPE, ISODRAFT / ISOCIRCLE.
- XCLIP, IMAGECLIP, GROUPEDIT, HYPERLINK, DIMBREAK, PURGE (hộp thoại), OPTIONS, STATUS.

## v4m: bổ sung lệnh AutoCAD & Express Tools
- Bắt điểm EXT, PAR, GCE; CIRCLE TTR/TTT, SOLID, SKETCH, HELIX, BREAKLINE, GRADIENT.
- EXTRIM, COPYM, SPLINEDIT, HATCHEDIT, CHPROP, FLATTEN, BURST, NCOPY.
- FINDREPLACE, TCOUNT, TEXTMASK, ARCTEXT, TEXTALIGN, FIELD/UPDATEFIELD, bảng có công thức.
- DIMSPACE, DIMTEDIT, DIMEDIT, DIMJOGGED, TOLERANCE.
- LAYCUR, LAYMCH, COPYTOLAYER, LAYWALK, LAYERP, LAYERSTATE, RENAME, WBLOCK.
- ALIASEDIT (nhập acad.pgp), SCRIPT (.scr), AUDIT, DWGPROPS, TIME, PLAN; tab Express Tools.

## v4l: ribbon & biểu tượng giống AutoCAD
- Tab và bảng theo AutoCAD (Home, Insert, Annotate, Parametric, View, Manage, Output, Collaborate), 2 không gian làm việc Drafting & Annotation / 3D Modeling.
- Nút tách nhớ lựa chọn cuối, bảng mở rộng (▾), chú giải khi rê chuột, nhãn tiếng Anh hoặc tiếng Việt.
- Bộ biểu tượng màu mới (`dvd-icons.js`, ~260 biểu tượng tự vẽ).

## v4k: ràng buộc tham số, khối động, vùng che, chú thích theo tỉ lệ, lưu DWG
- **Ràng buộc tham số:** GCHORIZONTAL/VERTICAL/PARALLEL/PERPENDICULAR/COLLINEAR/COINCIDENT/EQUAL/CONCENTRIC/TANGENT/FIX, DCALIGNED/HORIZONTAL/VERTICAL/RADIUS/DIAMETER/ANGULAR, AUTOCONSTRAIN, PARAMETERS (biểu thức), DELCONSTRAINT. Bộ giải giữ ràng buộc khi sửa bằng mọi lệnh.
- **Khối động:** BPARAMETER (trạng thái hiển thị, kéo giãn, lật), BDYN, đổi ngay trong bảng Thuộc tính.
- **DRAWORDER**, TEXTTOFRONT, HATCHTOBACK; **WIPEOUT** (đọc từ DWG/DXF), WIPEOUTFRAME.
- **Chú thích theo tỉ lệ:** CANNOSCALE (ô ▲ 1:N ở thanh trạng thái), ANNOTATIVE; khung nhìn layout hiện đúng cao chữ trên giấy.
- **SAVEDWG / DWGSERVER:** lưu DWG qua `server-dwg.js` + ODA File Converter.

## v4j: bổ sung lệnh AutoCAD
- MLINE/MLSTYLE, ARRAYPATH, BLEND, REVERSE, SETBYLAYER; DIMORDINATE, DIMARC, CENTERMARK, CENTERLINE.
- SCALETEXT, JUSTIFYTEXT, TXT2MTXT; LAYMRG, LAYDEL; VIEW (góc nhìn 2D), CAL, PUBLISH (PDF nhiều trang).
- 3D: SHELL, INTERFERE, MASSPROP, 3DARRAY.

## v4i: dùng lệnh trong khung 3D
- Mọi lệnh chạy được khi đang xem 3D: bấm điểm (bắt đỉnh khối, nét 2D, mặt phẳng cao độ), bấm chọn khối / nét 2D, Enter / chuột phải để xong, Esc để huỷ.
- Cảnh 3D tự cập nhật sau mỗi lệnh, Undo/Redo. Dòng lệnh hiện trên khung 3D.

## v4h: UCS, LOFT, bo cạnh, ánh sáng, mặt cắt, đọc ACIS
- **UCS 3D:** mặt đứng qua 2 điểm, trước/bên, theo mặt khối, xoay X/Y, cao độ gốc. Lệnh tạo khối đặt khối lên mặt phẳng UCS.
- **LOFT**, **FILLETEDGE**, **CHAMFEREDGE**.
- **Mặt trời** theo ngày giờ & toạ độ (bóng đổ trong ngày), **đèn điểm** (`LIGHT`), **CAMERA**, góc nhìn đã lưu, **đi bộ** (`3DWALK`).
- **Mặt cắt** ngang/đứng tô kín, xuất ra đa tuyến + hatch 2D (`SECTION2D`).
- **Đọc khối ACIS (3DSOLID)** của AutoCAD trong DXF: SAT (R2000–R2010) và SAB (R2013+).

## v4g: 3D nâng cao
- **Cộng/trừ/giao khối:** `UNION`, `SUBTRACT`, `INTERSECT`, `SLICE`.
- **Khối mới:** `REVOLVE`, `SWEEP`, `PYRAMID`, `WEDGE`, `TORUS`. Đặt cao độ bằng `ELEV`.
- **Sửa 3D:** `3DMOVE` (theo Z), `3DROTATE` (trục X/Y/Z/2 điểm), `MIRROR3D`.
- **Vật liệu & render:** `MATERIALS` (11 vật liệu có vân), `RENDER` (bóng đổ), `SECTIONPLANE` (mặt cắt ngang).
- **FLATSHOT:** chiếu mô hình 3D thành mặt đứng/ISO 2D, đã bỏ nét khuất.
- DXF lưu khối kèm XDATA nên mở lại vẫn sửa được. Đọc lưới POLYFACE / POLYGON MESH / MESH.

## v4f: 3D
- **Khối 3D:** `BOX`, `CYLINDER`, `CONE`, `SPHERE`, `EXTRUDE` (đa tuyến/tròn/elip/hatch có lỗ), `PRESSPULL`, `WALL3D` (dựng tường từ mặt bằng).
- **Xem 3D** (`3DORBIT`, nút 3D): xoay/dời/phóng bằng chuột hoặc ngón tay, ViewCube, góc nhìn chuẩn, khung dây/tô bóng/X-quang, phối cảnh/song song.
- **Xuất:** PNG, STL, OBJ+MTL; DXF ghi 3DFACE. Đọc 3DFACE (có cao độ Z) từ DXF/DWG.
- Bộ vẽ 3D (three.js r160, MIT) chỉ tải khi mở khung nhìn 3D.

## v4e: thuộc tính khối, ảnh nền, XREF, layout giấy
- **Thuộc tính khối:** `ATTDEF`, `EATTEDIT` (kích đúp), `ATTEXPORT` ra CSV. Đọc được ATTRIB của file gốc.
- **Ảnh nền:** `IMAGEATTACH`, `IMAGEADJUST`.
- **Tham chiếu ngoài:** `XATTACH`, `XREF`. Nền mờ, bắt điểm được, tự nạp lại khi mở bản vẽ.
- **Layout giấy:** `LAYOUT` (khổ giấy + khung tên), `MVIEW` (khung nhìn theo tỉ lệ), `VPEDIT`. PLOT in layout đúng khổ.
- Kích thước thẳng/chéo của file DWG/DXF kéo ô nắm và STRETCH được.

## v4d: nhiều bản vẽ, sửa khối, bảng
- **Nhiều bản vẽ mở cùng lúc** dạng tab (Ctrl+Tab chuyển, Ctrl+F4 đóng).
- **Sửa khối tại chỗ** (REFEDIT / BEDIT, kích đúp vào khối): mọi khối cùng tên được cập nhật.
- **Bảng (TABLE)**: tạo từ dữ liệu dán từ Excel, kích đúp để sửa.
- **QDIM** (kích thước nhanh hàng loạt), bắt điểm **FROM** và **M2P**, chọn bằng **hàng rào (F)**, **đa giác trùm (WP)** và **đa giác cắt (CP)**.

## v4c: in theo tỉ lệ, kiểu chữ, công cụ sửa
- **PLOT (Ctrl+P)** như AutoCAD:
  - Khổ A4 đến A0, ngang hoặc dọc.
  - Vùng in: Extents, Display hoặc Window.
  - In **đúng tỉ lệ 1:N** hoặc khít giấy.
  - Kiểu in đen trắng, màu hoặc thang xám, có in bề rộng nét.
  - Xem trước; xuất PDF đúng khổ, gửi máy in hoặc ảnh PNG.
- **Kiểu chữ (STYLE):** chọn font và hệ số rộng. Đọc và ghi kiểu chữ TrueType trong DXF. Chữ VNI-Times / .VnTime hiện bằng Times New Roman.
- **Đa tuyến:** ô nắm giữa đoạn, thêm đỉnh và xoá đỉnh.
- **Lệnh mới:** `OVERKILL`, `BOUNDARY`, `DONUT`, `MEASUREGEOM` (đo nhanh khi rê chuột), `ISOLATEOBJECTS` / `HIDEOBJECTS` / `UNISOLATEOBJECTS`.

## v4b: kiểu nét, khối & kích thước giống AutoCAD hơn
- **Kiểu nét (linetype)**: đọc bảng LTYPE, LTSCALE, kiểu nét theo lớp, ByBlock và tỉ lệ riêng từng đối tượng từ DWG/DXF. Nét tâm, nét khuất, nét đứt hiện đúng. Có Linetype Manager, LTSCALE, và 3 ô Màu, Bề rộng, Kiểu nét trên ribbon. Kiểu nét được ghi khi xuất DXF.
- **Khối/kích thước của file chọn theo cụm**, mỗi khối một ô nắm ở điểm chèn. **Ctrl+Shift+A** chuyển sang chọn từng nét. Đối tượng lớp 0 trong khối mang lớp của khối.
- **Kích thước vẽ bằng DVDCAD sửa được bằng ô nắm, STRETCH, MOVE hoặc SCALE**, số đo tự cập nhật.
- Lệnh mới: `QSELECT`, `MLEADER`/`QLEADER`, `ALIGN`, `LINETYPE`, `LTSCALE`, `LWEIGHT`. Tooltip kiểu AutoCAD trên ribbon và khi rê chuột lên đối tượng.

## v4: giao diện & lệnh kiểu AutoCAD
- Trên máy tính: **ribbon**, dòng lệnh, thanh trạng thái (GRID · SNAP · ORTHO · POLAR · OSNAP · OTRACK · DYN), tab Model/Layout, bảng Thuộc tính, quản lý **Lớp** (Layer Properties), ô nắm (grip) kiểu AutoCAD, chọn khung window/crossing, chuột phải = Enter.
- Hơn 100 lệnh: vẽ (LINE, PLINE, ARC, ELLIPSE, HATCH, TEXT…), sửa (TRIM, EXTEND, FILLET, STRETCH, BREAK, JOIN, EXPLODE, LENGTHEN…), kích thước (DIMLINEAR…), khối (INSERT/BLOCK), sao chép/dán giữa các bản vẽ, bản vẽ mới (NEW).
- Điện thoại giữ giao diện gọn; nút **Công cụ** mở bảng lệnh CAD.
- Xem đầy đủ: **[HUONG-DAN-LENH.md](HUONG-DAN-LENH.md)**.

## Bản online (v3): Google Drive · chia sẻ · cộng tác · dòng lệnh kiểu AutoCAD
- Mở/lưu bản vẽ trên **Google Drive**, **chia sẻ link xem**, **nhiều người cùng sửa** (đồng bộ qua Drive, không cần server).
- **Dòng lệnh** như AutoCAD (`L`, `PL`, `C`, `M`, `TR`, `O`…, nhập toạ độ `x,y` / `@dx,dy` / `dài<góc`), phím tắt, bảng **Thuộc tính** (Ctrl+1).
- Mở/lưu file trên máy (Edge/Chrome: Ctrl+S ghi thẳng file DXF, nhấp đúp file .dwg/.dxf để mở khi đã cài app).
- Cài đặt Google (miễn phí, làm 1 lần): xem **[HUONG-DAN-GOOGLE-DRIVE.md](HUONG-DAN-GOOGLE-DRIVE.md)**.

## Có gì trong thư mục này
- `dvd-config.js` — 3 mã Google (Client ID, API key, Project number). Để trống = tắt phần Drive.
- `dvd-cloud.js` — Google Drive, chia sẻ, cộng tác. `dvd-collab-core.js` — lõi hợp nhất dữ liệu cộng tác.
- `dvd-cmd.js` — dòng lệnh, phím tắt, bảng Thuộc tính.
- `dvd-acad-core.js` (bắt điểm, chọn, grip, lớp), `dvd-acad-cmds.js` (các lệnh vẽ/sửa/kích thước/hatch/khối), `dvd-acad-ui.js` (ribbon, thanh trạng thái, hộp thoại), `dvd-acad-more.js` (QSELECT, MLEADER, ALIGN, kiểu nét, PLOT, tooltip), `dvd-acad-ext.js` (tab nhiều bản vẽ, sửa khối, bảng, QDIM), `dvd-acad-pro.js` (thuộc tính khối, ảnh nền, XREF, layout giấy) — phần AutoCAD v4.
- `index.html` — toàn bộ ứng dụng (parser DXF + bộ vẽ + đo + ghi chú).
- `libredwg-web.js`, `libredwg-web.wasm` — bộ giải mã **DWG** (LibreDWG, giấy phép **GPL-3.0**, ~15MB tổng).
- `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon-180.png` — phần PWA (cài đặt + offline).

> ⚠️ App phải được chạy qua **HTTPS** (hoặc localhost) thì service worker mới hoạt động.
> Mở thẳng file `index.html` bằng `file://` sẽ KHÔNG cài/offline được. Hãy đưa lên một host (hướng dẫn dưới).

---

## Cách đưa lên mạng MIỄN PHÍ

### Cách A — GitHub Pages (khuyên dùng)
1. Tạo tài khoản GitHub, tạo repo mới (ví dụ `DVDCAD`), để **Public**.
2. Tải toàn bộ file trong thư mục này lên repo (nút **Add file → Upload files**), commit.
3. Vào **Settings → Pages**. Mục *Build and deployment*: chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`. Lưu.
4. Đợi ~1 phút, GitHub cho địa chỉ dạng `https://dangdvd.github.io/DVDCAD/`. Mở địa chỉ này bằng **Safari trên iPhone**.

> Vì app chạy trong thư mục con (`/DVDCAD/`), mọi đường dẫn đã để **tương đối** (`./…`) nên hoạt động đúng.

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
  LWPOLYLINE/POLYLINE, TEXT/MTEXT, POINT, SOLID/3DFACE, **INSERT**, **DIMENSION**, **SPLINE**, **HATCH**,
  **LEADER** (đường chỉ dẫn) và **ATTRIB** (chữ thuộc tính trong khối/khung tên).
- **DWG:** đọc qua **LibreDWG (WASM)** — đã thử với R11, R14, R2000, R2004, R2007, R2013.
- **Màu sắc:** vẽ đúng **màu theo layer** và **màu riêng của đối tượng** dùng bảng **ACI** (AutoCAD Color Index)
  chuẩn, xử lý cả **BYLAYER** và **BYBLOCK**. Layer bị **tắt/đóng băng** sẽ được ẩn như trong AutoCAD.
- **INSERT & DIMENSION:** block được "explode" và biến đổi đúng (vị trí, tỉ lệ, góc xoay),
  kể cả **block lồng nhau** và **mảng** (rows/cols). DIMENSION vẽ theo khối `*D…` nên có đủ đường gióng,
  **mũi tên** và **chữ số đo**. Layer `Defpoints` (điểm dựng hình) được bỏ qua.
- **SPLINE:** dựng đúng đường cong — **NURBS/B-spline** (thuật toán Cox–de Boor, có hỗ trợ trọng số)
  khi có control points; **nội suy Catmull-Rom** (đi qua điểm) khi chỉ có fit points.
- **HATCH:** lấy biên (polyline có *bulge*, hoặc cạnh line/arc/ellipse/spline) rồi **tô mờ** vùng đó
  (theo màu layer/đối tượng), dùng quy tắc even-odd để chừa lỗ. *Lưu ý:* các mẫu gạch (ANSI31…)
  được đơn giản hoá thành tô nền mờ, không vẽ từng nét gạch.
- **Polyline cong (bulge):** đoạn polyline có *bulge* được dựng đúng thành **cung tròn** (toán chính xác,
  điểm nằm đúng trên cung), áp dụng cho cả polyline thường lẫn biên của HATCH.
- **Còn lại:** đây là trình xem **2D** — các đối tượng khối 3D thực thụ (3DSOLID, REGION, MESH, mặt cong)
  không được dựng hình 3D; đường dựng vô hạn (XLINE), khung nhìn layout (VIEWPORT) cũng được bỏ qua.
  Phần lớn bản vẽ kỹ thuật 2D nay đã hiển thị đầy đủ và đúng màu.

## Cập nhật app
Nếu bạn sửa file rồi upload lại mà máy vẫn hiện bản cũ: mở `sw.js`, đổi `const CACHE = 'dvdcad-v1'`
thành `'dvdcad-v2'` (tăng số), upload lại. Service worker sẽ xoá cache cũ và nạp bản mới.

## Giấy phép
DVDCAD là phần mềm **mã nguồn mở** theo giấy phép **GNU GPL phiên bản 3 hoặc mới hơn** (xem [LICENSE](LICENSE)).
- Ai cũng được dùng, sửa và phân phối lại DVDCAD, kể cả cho mục đích thương mại. Bản phân phối lại phải giữ giấy phép GPL và kèm mã nguồn.
- **LibreDWG** (`libredwg-web.js`, `libredwg-web.wasm`) theo **GPL-3.0**, nên bản đóng gói (web và Windows) cũng phải theo GPL-3.0.
  Nguồn: https://github.com/mlightcad/libredwg-web và https://github.com/LibreDWG/libredwg
- Thư viện kèm theo giữ giấy phép riêng: three.js (MIT), pdf.js (Apache-2.0), SheetJS (Apache-2.0), polygon-clipping (MIT) — xem `vendor/`.
- DVDCAD dùng **tên lệnh và cách dùng giống AutoCAD** để người dùng chuyển sang không bỡ ngỡ, nhưng biểu tượng và mã nguồn là của riêng DVDCAD.
  DVDCAD không liên quan tới Autodesk; AutoCAD là thương hiệu của Autodesk, Inc.
