; DVDCAD — bổ sung cho bộ cài NSIS của electron-builder (tự nạp từ build/installer.nsh).
; Gỡ cài: electron-builder xoá lớp DVDCAD.dwg / DVDCAD.dxf nhưng để lại .dwg / .dxf trỏ về lớp đã xoá.
; Ở đây xoá luôn giá trị đó — chỉ khi nó vẫn là của DVDCAD (không đụng tới phần mềm khác đã nhận lại đuôi file).
!macro customUnInstall
  ReadRegStr $0 SHCTX "Software\Classes\.dwg" ""
  StrCmp $0 "DVDCAD.dwg" 0 +2
    DeleteRegValue SHCTX "Software\Classes\.dwg" ""
  ReadRegStr $0 SHCTX "Software\Classes\.dxf" ""
  StrCmp $0 "DVDCAD.dxf" 0 +2
    DeleteRegValue SHCTX "Software\Classes\.dxf" ""
!macroend
