/* DVDCAD — cấu hình kết nối Google Drive.
   Điền 3 giá trị lấy từ Google Cloud Console (xem HUONG-DAN-GOOGLE-DRIVE.md), rồi tải file này lên repo.
   Để trống thì app vẫn chạy bình thường, chỉ ẩn các tính năng Drive / chia sẻ / cộng tác.
   (Có thể nhập tạm trong app: nút ☁ → Cài đặt Google — nhưng link chia sẻ cho người khác cần giá trị ở file này.) */
window.DVD_GOOGLE = {
  clientId: '',   // dạng 1234567890-abc...xyz.apps.googleusercontent.com
  apiKey:   '',   // dạng AIzaSy...
  appId:    ''    // "Project number" của dự án Google Cloud — chỉ gồm chữ số
};
