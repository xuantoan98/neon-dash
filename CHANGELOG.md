# Changelog

## 1.1.1 — 2026-09-28

- Tăng độ sáng thành phố/mặt đường; vật cản có màu đặc sáng, viền rõ và họa tiết tương phản ở cả hai mức đồ họa.
- Cuộn nền theo quãng đường tích lũy, không nhân lại toàn bộ thời gian với tốc độ mới; mẫu cửa sổ cố định theo tòa nhà, chỉ tái xuất hiện sau khi tòa nhà ra khỏi khung.
- Nội suy vị trí hiển thị giữa các bước vật lý 60 Hz để chuyển động đều ở màn hình 120/144 Hz. Không thay đổi hitbox, nhảy, tốc độ hoặc cách tính điểm.
- Dọn entity/particle tại chỗ, bỏ lệnh vẽ vật thể ngoài khung; không tạo lại các mảng mỗi tick.
- Thêm 9 unit/regression tests và hai kịch bản canvas thực cho mỗi project trình duyệt.

## 1.1.0 — 2026-09-28

- Pause/resume và kết thúc lượt bằng nút, hướng dẫn trượt và hướng dẫn lần đầu.
- Âm thanh tổng hợp; âm lượng, giảm hiệu ứng và chế độ đồ họa nhẹ lưu bền.
- Thống kê lượt chơi; ba skin, ba chủ đề, ba thử thách phụ không đổi điểm Classic.
- Font cục bộ, manifest PWA, offline cache theo revision; người chơi chủ động cập nhật.
- Unit tests, E2E Chromium/Firefox/WebKit/mobile, lint/format và CI.
- Gói phát hành có mã băm, tài liệu nghiệm thu và rollback.

## 1.0.0 — 2026-09-25

- Tách ES modules, sửa lỗi score/resize/input; bước mô phỏng cố định 60 Hz.
