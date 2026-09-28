# Kế hoạch thực thi ba đợt — 28/09/2026

Giữ chế độ Classic, nhảy đôi, trượt, tốc độ, điểm và khóa kỷ lục hiện tại. Không thêm thư viện runtime.

1. **Ổn định:** nút pause/resume, hướng dẫn trượt, kiểm thử toàn luồng trên trình duyệt; báo cáo `reports/01-stability.md`.
2. **Trải nghiệm:** âm thanh tổng hợp, cài đặt lưu bền, hướng dẫn lần đầu, thống kê; đo hiệu năng, tối ưu khi có bằng chứng; lint/format/CI; báo cáo `reports/02-experience.md`.
3. **Nội dung và phát hành:** skin/chủ đề chỉ thay đổi hình ảnh, thử thách không đổi luật Classic, PWA/offline, phiên bản và gói phát hành/rollback; báo cáo `reports/03-release.md`.

Mỗi đợt chạy lại test và kiểm tra import. Không thể thay thế kiểm tra điện thoại vật lý bằng viewport giả lập; giới hạn này phải được ghi rõ. Chuẩn bị bản phát hành cục bộ; cấu hình host hiện tại được giữ để người dùng triển khai theo quy trình của họ.
