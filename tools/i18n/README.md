# Từ điển giao diện English

Chạy lại khi thêm hoặc sửa chuỗi tiếng Việt trong mã:

```
python3 tools/i18n/extract.py   # gom chuỗi tiếng Việt hiển thị -> segs.json
python3 tools/i18n/build.py     # ghép với translations.json -> dvd-i18n-en.js, in danh sách còn thiếu
```

Chuỗi còn thiếu: thêm cặp "tiếng Việt": "English" vào `translations.json` rồi chạy lại `build.py`.
