# DVDCAD — ghi chú cho Claude

- Trả lời người dùng bằng **tiếng Việt**.
- Làm việc trên nhánh `claude/windows-desktop`; đẩy bằng `git push -u origin claude/windows-desktop`.

## Quy trình mỗi đợt ("Tiếp tục xử lý các hạn chế còn lại")
1. Sửa mã + kiểm thử (trình duyệt tự động, `desktop/test/smoke.js` dưới xvfb).
2. Bản dịch English: `python3 tools/i18n/extract.py && python3 tools/i18n/build.py` → thêm vào `tools/i18n/translations.json` tới khi "missing 0".
3. Tài liệu: `HUONG-DAN-LENH.md` (mục "Bổ sung như AutoCAD 2027 (v…)"), `README.md` (mục kỹ thuật), `HUONG-DAN-WINDOWS.md`, `desktop/RELEASE-NOTES.md` (nội dung bản phát hành).
4. Phiên bản: `desktop/package.json` + `package-lock.json`, chuỗi AppInfo trong `dvd-dwg.js`, `CACHE` trong `sw.js`.
5. Commit, push, rồi phát hành: chạy workflow `desktop-windows.yml` trên `claude/windows-desktop` với `release_tag = vX.Y.Z` (GitHub Release lấy nội dung từ `desktop/RELEASE-NOTES.md`).
6. **Sau khi phát hành thành công: tạo Pull Request `claude/windows-desktop` → `main` và gộp luôn** (người dùng đã đồng ý).
   Bản Web (GitHub Pages, https://dangdvd.github.io/DVDCAD/) chạy từ `main`; gộp xong Pages tự dựng lại.
   Sau khi gộp, `git merge origin/main` vào nhánh làm việc để hai nhánh không lệch.
