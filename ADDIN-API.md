# Viết add-in cho DVDCAD

DVDCAD nạp được 2 loại add-in bằng lệnh `APPLOAD` (ribbon › thẻ **Add-ins** › Load Application):

| Loại | Đuôi file | Dùng khi |
|---|---|---|
| AutoLISP | `.lsp` | Đã có sẵn lisp dùng cho AutoCAD, cần chạy lại trên DVDCAD |
| JavaScript | `.js` | Viết mới, cần giao diện, tải file, tính toán nhiều |

Bộ tiện ích nhiều tệp (`.lsp` + `.dcl` + `.lin` / `.pat`…, kiểu bộ LISP cho kết cấu, kiến trúc, dự toán): APPLOAD › **Nạp cả thư mục…** hoặc chọn gói **.zip**. Mọi tệp được chép vào **thư mục hỗ trợ** (như Support File Search Path của AutoCAD), rồi chọn tệp `.lsp` nào nạp ngay và tự nạp khi mở DVDCAD.

Không chạy được: `.fas` / `.vlx` (LISP đã biên dịch và mã hoá), `.dll` / `.arx` / `.dbx` (add-in .NET / ObjectARX), `.dvb` (VBA). Đây là mã chỉ chạy bên trong AutoCAD. Muốn dùng thì xin tác giả bản mã nguồn `.lsp`, hoặc chuyển phần xử lý sang `.js`.

> ⚠ Add-in chạy với toàn quyền trong DVDCAD (sửa / xoá bản vẽ, gửi dữ liệu ra mạng). Chỉ nạp file từ nguồn tin cậy.

Startup Suite: đánh dấu **Khởi động** trong APPLOAD thì add-in tự nạp mỗi khi mở DVDCAD. Add-in được lưu trên máy (trong trình duyệt), không đi kèm bản vẽ.

---

## 1. AutoLISP

- `(defun c:TEN () ...)` tạo lệnh `TEN`, gõ ở dòng lệnh như lệnh thường.
- Gõ thẳng biểu thức ở dòng lệnh: `(+ 1 2)`, `(setq r 5)`. Khi lệnh đang hỏi, gõ `!r` để dùng giá trị biến `r`.
- Bảng gõ thử: lệnh `VLISP` (Ctrl+Enter = chạy, có nút Lưu thành add-in).
- `(load "ten")` nạp `ten.lsp` trong APPLOAD hoặc thư mục hỗ trợ. `(autoload "ten" '("LENH1" "LENH2"))` nạp tệp khi gõ lệnh lần đầu.
- `acad.lsp`, `acaddoc.lsp`, `*.mnl` trong thư mục hỗ trợ tự chạy khi mở DVDCAD, rồi tới Startup Suite, cuối cùng là `S::STARTUP` (thứ tự như AutoCAD).
- Tệp `.lsp` soạn trên Windows (bảng mã ANSI tiếng Việt Windows-1258) được đọc đúng dấu; tệp UTF-8 cũng được.

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
- INSERT `2 10 41 50 8 66`: `entmake` chèn khối có trong bản vẽ hoặc thư viện khối (kèm `ATTRIB` … `SEQEND`); `entmod` đổi được lớp / màu. `entmakex` trả về tên đối tượng mới.
- HATCH `2 41 52 91 92 72 10 11`, DIMENSION `10 13 14 70`, BLOCK `2 10` … ENDBLK, ATTDEF `1 2 3 10 40`. Nhóm `-3` (XDATA) đọc / ghi được.
- DIMENSION `1 42 13 14` (chỉ đọc).

### Tệp, thư mục hỗ trợ

| Nhóm | Hàm |
|---|---|
| Tìm / nạp | `findfile findtrustedfile load autoload getfiled` (chọn tệp trên máy, chép vào thư mục hỗ trợ) |
| Đọc / ghi | `open close read-line read-char peek-char write-line write-char` `princ prin1 print` có đối số tệp |
| Quản lý | `vl-file-size vl-file-delete vl-file-rename vl-file-copy vl-file-directory-p vl-file-systime vl-directory-files vl-mkdir` `vl-filename-base vl-filename-directory vl-filename-extension vl-filename-mktemp` |

Tệp do LISP ghi (`open … "w"`) nằm trong thư mục hỗ trợ của DVDCAD (lệnh `SUPPORTFILES` để xem / xoá), không ghi thẳng ra ổ đĩa.

### Hộp thoại DCL

`load_dialog unload_dialog new_dialog start_dialog done_dialog term_dialog action_tile set_tile get_tile get_attr mode_tile client_data_tile start_list add_list end_list dimx_tile dimy_tile start_image fill_image vector_image end_image`, biến `$key $value $reason $data $x $y`.

- Tệp `.dcl` đọc được: định nghĩa `name : dialog { … }`, kế thừa (`: my_button { … }`), tham chiếu tile có tên (`ok_cancel;`), `@include`.
- Tile: `row column boxed_row boxed_column radio_row radio_column boxed_radio_row boxed_radio_column text text_part paragraph concatenation spacer spacer_0 spacer_1 edit_box button toggle radio_button list_box popup_list slider image image_button errtile ok_only ok_cancel ok_cancel_help ok_cancel_help_info`.
- Thuộc tính: `label key value width height fixed_width edit_width alignment is_enabled is_default is_cancel action list multiple_select mnemonic color aspect_ratio min_value max_value small_increment`.
- Enter = nút `is_default`, Esc = nút `is_cancel`. Nhấp đúp `list_box` cho `$reason` 4.
- Chưa có: `slide_image` (ảnh .sld trong hộp thoại), `text_image`.

### ActiveX (vla- / vlax-)

`(vl-load-com)` rồi dùng như trong AutoCAD:

```lisp
(setq doc (vla-get-ActiveDocument (vlax-get-acad-object))
      ms  (vla-get-ModelSpace doc))
(setq ln (vla-AddLine ms (vlax-3d-point 0 0 0) (vlax-3d-point 3000 0 0)))
(vla-put-Layer ln "TRUC")
(princ (vla-get-Length ln))
(vlax-for l (vla-get-Layers doc) (princ (strcat "\n" (vla-get-Name l))))
```

- Đối tượng: `Application` › `ActiveDocument` › `ModelSpace` / `PaperSpace` / `Utility` / `Layers` / `Blocks` / `TextStyles` / `Linetypes` / `Layouts` / `Documents`.
- Thuộc tính (`vla-get-X` / `vla-put-X`, `vlax-get-property`, `vlax-get`, `getpropertyvalue`): `Layer Color Linetype LinetypeScale Lineweight EntityTransparency Visible Handle ObjectName ObjectID OwnerID StartPoint EndPoint Center Radius Diameter Circumference StartAngle EndAngle TotalAngle ArcLength Length Area Closed Coordinates ConstantWidth Elevation Normal Thickness TextString Height Rotation InsertionPoint TextAlignmentPoint StyleName Name EffectiveName XScaleFactor YScaleFactor ZScaleFactor HasAttributes Measurement PatternName`, lớp: `Name Color LayerOn Freeze Lock Linetype Lineweight`, tài liệu: `ActiveLayer Name FullName Path`.
- Phương thức (`vla-X`, `vlax-invoke-method`, `vlax-invoke`): `AddLine AddCircle AddArc AddPoint AddLightWeightPolyline AddPolyline AddText AddMText AddEllipse AddBlockReference Add` (lớp, khối…) `Item Delete Move Copy Rotate ScaleEntity Mirror Offset Explode GetBoundingBox IntersectWith GetBulge SetBulge GetWidth SetWidth AddVertex` `Utility: GetPoint GetEntity GetString GetReal GetInteger GetDistance GetAngle PolarPoint Prompt AngleToReal DistanceToReal RealToString` `SendCommand GetVariable SetVariable StartUndoMark EndUndoMark Regen`.
- Thuộc tính đúng / sai (`Closed LayerOn Freeze Lock Visible HasAttributes`…) trả `:vlax-true` / `:vlax-false` như AutoCAD; `vla-put-…` nhận `:vlax-true`, `:vlax-false`, `T`, `nil`, `-1`, `0`.
- Kiểu dữ liệu: `vlax-3d-point vlax-make-safearray vlax-make-variant vlax-safearray-fill vlax-safearray->list vlax-variant-value vlax-variant-type vlax-variant-change-type vlax-safearray-get-element/put-element/get-l-bound/get-u-bound/get-dim`, `vlax-ename->vla-object vlax-vla-object->ename vlax-property-available-p vlax-method-applicable-p vlax-erased-p vlax-release-object vlax-dump-object`, `vlax-ldata-put/get/delete`.
- Đường cong (`vlax-curve-`), nhận cả tên đối tượng lẫn VLA-object: `getStartParam getEndParam getStartPoint getEndPoint getDistAtParam getParamAtDist getPointAtParam getPointAtDist getDistAtPoint getParamAtPoint getClosestPointTo getClosestPointToProjection getFirstDeriv getSecondDeriv getArea isClosed isPeriodic isPlanar`. Tham số như AutoCAD: đoạn thẳng = khoảng cách, cung / tròn / elip = góc (radian), đa tuyến = chỉ số đỉnh (1,5 = giữa đoạn thứ 2, tính cả đoạn cung).

### Hàm khác

`grread` (phím, di chuột, bấm chuột) `grdraw grvecs grclear grtext redraw` `tblnext tblobjname regapp xdroom xdsize namedobjdict dictsearch dictnext dictadd dictremove dictrename` `osnap trans textbox ssnamex ssgetfirst layoutlist cvunit ver getcfg setcfg vl-registry-read vl-registry-write vl-registry-delete vl-registry-descendents` `vl-string-position vl-string-translate vl-string-elt vl-string-mismatch vl-symbol-value vl-symbolp vl-list* vl-bb-ref vl-bb-set vl-doc-ref vl-doc-set vl-propagate vl-exit-with-value vl-exit-with-error` `acad_colordlg acad_truecolordlg` `acet-error-init acet-error-restore acet-sysvar-set acet-sysvar-restore acet-ui-progress acet-str-replace acet-geom-midpoint acet-list-remove-duplicates` (vài hàm Express Tools hay dùng) `snvalid menucmd setview startapp help`.

### Tương thích với tiện ích viết cho AutoCAD (v6f)

- **`(command …)`**:
  - Tuỳ chọn viết kiểu quốc tế `"_W"`, `"_J"`, `"_E"`, `"_END"`… và tên tuỳ chọn tiếng Anh đầy đủ (`"_Width"`, `"_Justify"`) đều được hiểu.
  - Lệnh có hộp thoại chạy bản dòng lệnh như AutoCAD: `HATCH` (tên mẫu, tỉ lệ, góc, chọn đối tượng), `-HATCH`, `-INSERT` (`"_S"`, `"_R"`, `"*TÊN"`), `-ARRAY` (mảng cổ điển), `-ATTDEF` / `ATTDEF`, `-TABLE` / `TABLE`, `-WBLOCK`, `LEADER` / `QLEADER` / `MLEADER` (chữ nhập từng dòng), `TEXT` (một dòng rồi kết thúc), `MTEXT` (các dòng, `""` = xong), `CHANGE` (điểm thay đổi / `"_P"` thuộc tính), `POINT` (một điểm), `BREAK` (tên đối tượng + `"_F"`).
  - Chọn bằng tên đối tượng / tập chọn rồi `""` kết thúc chọn như AutoCAD.
- **Biến hệ thống** (`getvar` / `setvar`): đủ các biến tiện ích hay đọc, đúng kiểu dữ liệu:
  - `DIMSCALE DIMTXT DIMASZ DIMSTYLE DIMDEC DIMLFAC CANNOSCALE CANNOSCALEVALUE`;
  - `CDATE DATE TDCREATE TDUPDATE MILLISECS CTAB DWGTITLED`;
  - `ATTREQ ATTDIA FILEDIA CMDDIA EXPERT PICKADD PLINEWID LUPREC AUNITS AUPREC`;
  - `USERI1…5 USERR1…5 USERS1…5`;
  - biến điểm trả danh sách: `EXTMIN EXTMAX LIMMIN LIMMAX INSBASE VIEWCTR UCSORG UCSXDIR UCSYDIR VIEWDIR SCREENSIZE VSMIN VSMAX`;
  - `ACADVER` = `"25.0s (DVDCAD)"`, `PRODUCT` = `"DVDCAD"`, `LOCALE`, `SYSCODEPAGE`, `ACADPREFIX`, `TEMPPREFIX`…
- **XDATA**:
  - `(regapp "APP")`, `(entget e '("APP"))` có nhóm `-3`, `(entmod …)` / `(entmake …)` ghi `-3`; `vla-SetXData` / `vla-GetXData`.
  - Lưu ra DXF đúng chuẩn AutoCAD (1001 / 1000 / 1040 / 1070 / 1010…) và DWG (EED). Mở lại bằng DVDCAD còn nguyên.
- **`ssget`**:
  - Bộ lọc logic `(-4 . "<OR")` … `(-4 . "OR>")`, `<AND`, `<NOT`, `<XOR`; so sánh `(-4 . ">")` `"<"` `">="` `"<="` `"!="` `"*"` cho số, chuỗi, điểm.
  - Lọc theo XDATA `(-3 ("APP"))`.
  - `"_WP"` / `"_CP"` / `"_F"` với danh sách điểm; `":L"` bỏ đối tượng trên lớp khoá.
- **`entmake`**:
  - `HATCH` (biên đường thẳng / đa tuyến), `DIMENSION` (thẳng, thẳng hàng);
  - định nghĩa khối `BLOCK` … `ATTDEF` … `ENDBLK`;
  - `INSERT` có `(66 . 1)` rồi `ATTRIB` … `SEQEND` (gán giá trị thuộc tính).
- **ActiveX bổ sung**:
  - hằng số `vlax-vbInteger` / `vlax-vbDouble` / `vlax-vbString` / `vlax-vbObject` / `vlax-vbVariant`…, `acRed`…`acByLayer`, `acSelectionSetAll`…, `acHatchPatternTypePreDefined`, `acAlignment…`, `acLnWt…`;
  - `InsertBlock`, `GetAttributes` / `GetConstantAttributes` (thuộc tính: `TagString`, `TextString` đọc / ghi), `GetDynamicBlockProperties` (trạng thái hiển thị), `EffectiveName`, `Explode`;
  - `AddHatch` + `AppendOuterLoop` / `AppendInnerLoop` / `Evaluate`, `PatternScale` / `PatternAngle`;
  - `AddDimAligned`, `AddDimRotated`, `AddTable` (+ `SetText` / `GetText`, `Rows`, `Columns`), `AddSpline`, `AddMLeader`, `AddRegion`, `AddXline`, `AddSolid`;
  - `SelectionSets`: `Add`, `Item`, `Select` (có bộ lọc), `SelectOnScreen`, `SelectByPolygon`, `AddItems`, `Erase`, `Delete`, `vlax-for`; `ActiveSelectionSet`;
  - `TrueColor` (`SetRGB`, `ColorIndex`, `Red/Green/Blue`), `Preferences.Files.SupportPath`, `TextStyles` (`FontFile`, `Height`), `Layouts` (`Block`), `ZoomExtents` / `ZoomWindow`.
- **Hàm thêm**: `vl-sort-i vl-member-if-not cddddr nentselp initdia acad_helpdlg vlax-tmatrix vlax-map-collection vlax-add-cmd layerstate-getnames / save / restore / delete / has / rename / getlayers`.

### Reactor, COM, DOSLib, gói ứng dụng (v6g)

- **Reactor** (`vlr-…`) phát sinh sự kiện thật:
  - `vlr-command-reactor` / `vlr-editor-reactor`: `:vlr-commandWillStart`, `:vlr-commandEnded`, `:vlr-commandCancelled`, `:vlr-commandFailed`, `:vlr-beginSave`, `:vlr-saveComplete`;
  - `vlr-acdb-reactor`: `:vlr-objectAppended`, `:vlr-objectModified`, `:vlr-objectErased`;
  - `vlr-object-reactor` (đối tượng sở hữu): `:vlr-modified`, `:vlr-erased`;
  - `vlr-sysvar-reactor`: `:vlr-sysVarWillChange`, `:vlr-sysVarChanged`;
  - `vlr-mouse-reactor`: `:vlr-beginDoubleClick`, `:vlr-beginRightClick`;
  - `vlr-lisp-reactor`: `:vlr-lispWillStart`, `:vlr-lispEnded`, `:vlr-lispCancelled`.
  - Quản lý: `vlr-add`, `vlr-remove`, `vlr-remove-all`, `vlr-added-p`, `vlr-reactors`, `vlr-reactions`, `vlr-reaction-set`, `vlr-data`, `vlr-data-set`, `vlr-owners`, `vlr-owner-add`, `vlr-owner-remove`, `vlr-type`, `vlr-types`, `vlr-pers`, `vlr-current-reaction-name`.
  - Từ khoá `:vlr-…`, `:vlax-true`… tự trả về chính nó như AutoLISP.
- **COM** (`vlax-create-object` / `vlax-get-or-create-object` / `vlax-get-object`, gọi bằng `vlax-get-property`, `vlax-put-property`, `vlax-invoke-method`, `vlax-invoke`, `vlax-get`, `vlax-put`):
  - `Excel.Application`: `Workbooks.Add` / `Open` (.csv), `Worksheets` / `Sheets` (`Add`, `Item`), `ActiveSheet`, `Cells.Item(r, c)`, `Range("A1")` / `Range("A1:C3")`, `Value` / `Value2` / `Formula` / `Text`, `Offset`, `Resize`, `UsedRange`, `ColumnWidth`, `SaveAs` / `Save` → ghi **tệp .xlsx thật** (hoặc .csv), `Visible = True` → giao tệp .xlsx để mở bằng Excel, `Quit`.
  - `Scripting.FileSystemObject` (tệp trong thư mục hỗ trợ): `CreateTextFile`, `OpenTextFile`, `WriteLine`, `ReadLine`, `ReadAll`, `AtEndOfStream`, `FileExists`, `GetFile`, `DeleteFile`, `CopyFile`, `GetBaseName`, `GetExtensionName`, `BuildPath`…
  - `Scripting.Dictionary` (`Add`, `Item`, `Exists`, `Keys`, `Items`, `Count`, `Remove`), `WScript.Shell` (`ExpandEnvironmentStrings`, `RegRead` / `RegWrite`, `Popup`, `SpecialFolders`, `Run` mở đường link), `Shell.Application`.
  - `vlax-import-type-library` với `:methods-prefix` / `:properties-prefix` (vd `msxl-`) → `msxl-get-Cells`, `msxl-put-Value`, `msxl-Add`…
- **DOSLib** (hay dùng): `dos_msgbox`, `dos_getstring`, `dos_getint`, `dos_getreal`, `dos_listbox`, `dos_multilist`, `dos_checklist`, `dos_getdir`, `dos_getfiled`, `dos_filep`, `dos_dir`, `dos_delete`, `dos_copy`, `dos_strtokens`, `dos_strreplace`, `dos_strtrim`, `dos_strcase`, `dos_proper`, `dos_strleft` / `right` / `mid`, `dos_sortlist`, `dos_clipboard`, `dos_version`, `dos_username`, `dos_computer`…
- **Gói ứng dụng `.bundle`** (cách cài của Autodesk App Store, `ApplicationPlugins`): APPLOAD › Nạp cả thư mục… chọn thư mục `.bundle` (hoặc gói .zip). DVDCAD đọc `PackageContents.xml`:
  - `.lsp` `LoadOnAutoCADStartup` → nạp và tự nạp khi mở; `LoadOnCommandInvocation` + `Commands` → `autoload`;
  - `.cuix` / `.cui` → nạp menu / ribbon (kèm `.mnl` cùng tên);
  - `.dll` / `.arx` / `.fas` → bỏ qua, các lệnh của chúng báo rõ "chỉ chạy trong AutoCAD".
  - Lệnh `APPAUTOLOADER` liệt kê gói đã cài; OPTIONS › Tệp cũng hiện.
- **Menu**: `MENULOAD` nạp `.cuix` / `.cui` hoặc menu cũ `.mnu` / `.mns` (POP, menu con `->` / `<-`, macro `^C^C…`); tệp `.mnl` cùng tên tự nạp như AutoCAD. Bộ tiện ích nạp bằng thư mục / zip có menu thì menu cũng được nạp.
- **OPTIONS › Tệp**: đường dẫn tìm tệp hỗ trợ (thư mục hỗ trợ), vị trí tin cậy (`TRUSTEDPATHS`), ứng dụng đã cài. `SECURITYOPTIONS` mở tab này.
- `NETLOAD`, `ARX`, `VBALOAD` / `VBARUN` / `VBAMAN` / `VBAIDE`: có lệnh, giải thích vì sao .dll / .arx / .dvb không chạy và cách thay thế.

Chưa làm được như AutoCAD:
- `trans` trả nguyên điểm (DVDCAD vẽ trên một hệ toạ độ WCS); `osnap` trả nguyên điểm.
- OpenDCL (`dcl_…`) chưa có. COM khác ngoài các lớp kể trên (Word, Access, ADODB…) chưa có. Excel làm lại không tính công thức (ghi công thức vào tệp, Excel tính khi mở).
- XDATA của khối chèn (INSERT) đọc từ tệp chưa giữ lại; XDATA trên đường, tròn, chữ, đa tuyến… thì giữ.
- Registry, `getcfg` lưu trong máy (trình duyệt), không phải registry Windows.

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
