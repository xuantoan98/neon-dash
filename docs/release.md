# Phát hành và quay lui

## Tạo bản phát hành

1. Cài dependency bằng `npm ci` trên Node >=22.13.
2. Nếu cập nhật font/icon, chạy `npm run assets`; giữ các giấy phép kèm theo.
3. Đồng bộ phiên bản trong `package.json` và `dist/scripts/version.js`; cập nhật changelog. Chạy `npm run format`, rồi `npm run precache`.
4. Chạy `npm run verify` và `npm run test:browser`. WebKit cần thư viện hệ thống; CI Ubuntu dùng `playwright install --with-deps` để chuẩn bị.
5. Chạy `npm run release`. Archive `releases/neon-dash-<version>-<revision>.tar.gz` gồm thư mục `dist`, README, changelog và báo cáo; file `.sha256` để kiểm tra toàn vẹn. Archive trùng revision không bị ghi đè.

## Triển khai nguyên bộ

Phục vụ toàn bộ `dist/` từ HTTPS, không chỉ `index.html`. MIME cho `.js` là JavaScript, `.webmanifest` là `application/manifest+json`, `.woff2` là `font/woff2`. Không cấu hình SPA fallback cho file JS/font bị thiếu.

`sw.js` và `precache-manifest.js` phải được kiểm tra bản mới (Cache-Control: no-cache). Cơ chế đăng ký dùng updateViaCache=none. Manifest cache chứa hash nội dung của mọi tài nguyên; worker cũ tiếp tục phục vụ trọn phiên bản cũ trong khi phiên bản mới chờ. Người dùng chủ động bấm cập nhật trong Cài đặt; thao tác này tải lại và kết thúc lượt đang mở. Nút chỉ nằm trong cài đặt đã pause.

Cấu hình Sites hiện có trong `.openai/hosting.json` tiếp tục trỏ tới `dist`. Lần thực thi này tạo bản phát hành cục bộ, không thay deployment công khai hoặc truy cập host. Workflow CI được chuẩn bị nhưng workspace hiện không có Git repository/remote hoạt động.

## Quay lui

- Giữ artifact đã nghiệm thu và checksum của từng phiên bản. Giải nén vào thư mục staging riêng, không chép đè từng file trong bản đang chạy.
- Với rollback giữa các phiên bản hỗ trợ offline, triển khai nguyên bộ artifact trước đó gồm cả worker và manifest. Revision thay đổi nên trình duyệt phát hiện lại bản đó; người dùng bấm cập nhật sau khi pause.
- Không rollback trực tiếp về bộ file không có worker: worker cũ có thể tiếp tục phục vụ cache. Nếu phải khôi phục gameplay trước PWA, đưa mã gameplay đó vào một bản phát hành mới, giữ cơ chế worker/update hiện tại và tạo lại manifest.
- Kỷ lục `neonDashBest` và cài đặt `neonDashPreferencesV1` không bị xóa khi đổi phiên bản. Cache cleanup chỉ xóa cache Neon Dash cùng scope, không xóa cache ứng dụng khác.

## Checklist nghiệm thu

- Start/pause/resume/end/retry; kết quả HUD trùng final; kỷ lục còn sau reload.
- Cài đặt âm thanh, volume, motion, skin/theme còn sau reload; settings không gây nhảy ngoài ý muốn.
- Mở online đợi “Sẵn sàng chơi offline”, ngắt mạng, reload và chơi.
- Cập nhật phiên bản khi đang chơi: không bị reload tự động; bản mới chỉ áp dụng sau thao tác.
- Thiết bị thật Android/iOS: đa chạm, thả ngón tay ngoài nút trượt, xoay màn hình, chuyển tab/khóa máy và restore history.
- Kiểm tra PWA install trên trình duyệt hỗ trợ; không coi viewport mobile là kiểm tra điện thoại vật lý.
