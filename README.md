# ❤️ Linh Tuấn & Ngô Minh - Góc Kỷ Niệm & Thiệp Cưới Online (Bản cập nhật bảo mật)

Dự án lưu giữ kỷ niệm tình yêu lãng mạn kết hợp cùng nền tảng thiết kế thiệp cưới trực tuyến, khảo sát ý kiến khách mời (RSVP) và hộp mừng cưới thông minh.

## 🚀 Tính năng nổi bật

### 1. ❤️ Góc Kỷ Niệm Cặp Đôi (Memory Corner)
- **Đếm ngày yêu nhau**: Đồng bộ thời gian thực từ máy chủ chuẩn xác để tính số ngày chung đôi.
- **Trình phát nhạc lãng mạn**: Phát nhạc nền du dương ("Một đời" - Nguyễn Trung Dũng) với hiệu ứng đĩa than xoay tròn.
- **Sổ tay sức khỏe em yêu**: Lưu trữ các triệu chứng bị ốm, tự động phân tích từ khóa gán emoji siêu dễ thương, ghi nhớ nhắc nhở ấm áp từ nửa kia.
- **Bông hoa tình yêu**: Các bông hoa lãng mạn bay lơ lửng trên màn hình và hiệu ứng vỡ tim lấp lánh khi chạm tay vào màn hình.

### 2. 💒 Thiệp Cưới & RSVP Trực Tuyến
- **Thiết kế thiệp cưới**: Cặp đôi có thể tự tạo cấu hình thiệp cưới, đăng tải ảnh polaroid, địa điểm lễ thành hôn/tiệc cưới kèm bản đồ Google Maps.
- **Bức tường chúc phúc**: Khách mời có thể gửi lời chúc tốt đẹp nhất để hiển thị trực tiếp trên thiệp.
- **VietQR thông minh**: Khách mời điền thông tin và chọn số tiền mừng cưới, hệ thống sẽ tự động sinh mã VietQR động không dấu để quét thanh toán an toàn, chuẩn xác trên mọi ứng dụng ngân hàng tại Việt Nam.

## 🛠️ Công nghệ sử dụng
- **Vite & React (SPA)**
- **React Router v6**
- **Supabase (Database & Authentication)**
- **CSS Vanilla (Glassmorphism & Responsive Design)**

## 📦 Hướng dẫn chạy cục bộ

1. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```

2. Cấu hình biến môi trường (`.env`):
   ```env
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   VITE_ALLOWED_COUPLE_EMAILS=your_email@gmail.com,partner_email@gmail.com
   ```

3. Khởi động môi trường phát triển:
   ```bash
   npm run dev
   ```
