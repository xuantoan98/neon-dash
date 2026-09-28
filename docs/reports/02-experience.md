# Đợt 2 — Trải nghiệm, hiệu năng và quy trình

Ngày thực hiện: 28/09/2026. Trạng thái: hoàn tất tính năng; kiểm chứng đa trình duyệt được tổng hợp trong [báo cáo đợt 3](03-release.md).

## Kết quả

- Web Audio tổng hợp hiệu ứng bắt đầu, nhảy, nhặt lõi, vượt vật cản và kết thúc. Chỉ khởi tạo sau thao tác người dùng; giới hạn tám voice, tắt sạch khi pause/mute/dispose.
- Cài đặt âm thanh, âm lượng, giảm hiệu ứng theo hệ thống/bật/tắt, đồ họa nhẹ. Dữ liệu lưu riêng, không đổi khóa kỷ lục Classic; storage bị chặn vẫn dùng được trong phiên.
- Hướng dẫn lần đầu có nút đã hiểu và lưu trạng thái. Kết quả hiển thị thời gian, số lõi, chướng ngại và combo cao nhất.
- Không vẽ lại canvas không thay đổi ở menu/pause hoặc sau khi hiệu ứng game-over kết thúc. Bộ đo dùng vòng đệm cố định 300 mẫu; chế độ nhẹ tắt canvas glow.
- ESLint, Prettier, lockfile, server phát triển, kịch bản `verify`; workflow CI chạy kiểm tra mã và E2E đa trình duyệt khi repo được đẩy lên GitHub.

## Kiểm chứng

- 38 test Node: thêm cài đặt hỏng/blocked storage, audio lifecycle/voice cap, vòng đệm hiệu năng, kết thúc lượt paused và 100 lượt chơi liên tiếp không tích tụ entity/particle.
- `npm run verify` đạt: cú pháp/import, lint, format và unit tests.
- Cài đặt âm thanh tắt và giảm hiệu ứng bật vẫn được giữ sau reload, kiểm tra qua giao diện thật. Kịch bản toàn luồng vẫn đạt, không có lỗi console.
- Trình duyệt desktop hiện tại đo P95 thời gian gọi render **0,7 ms trên 90 mẫu** sau lượt kiểm tra. Đây là CPU submission time của canvas, không phải cam kết FPS/GPU trên mọi thiết bị; không suy diễn thành kết quả điện thoại thật.

## Giới hạn

Chưa đo heap bằng profiler trên thiết bị vật lý. Test 100 lượt chứng minh các collection game được thu hồi theo logic, không thay thế heap snapshot. Bộ đo hiện tại và tùy chọn đồ họa nhẹ giúp nghiệm thu thiết bị sau này.
