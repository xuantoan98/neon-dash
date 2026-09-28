# Bản vá 1.1.1 — Dễ nhìn và chuyển động mượt hơn

Ngày thực hiện: 28/09/2026. Hai vấn đề do người dùng báo: cảnh/vật cản quá tối và giật khung hình khi vật cản rời màn hình.

## Nguyên nhân xác định trong mã

- Màu tô vật cản cũ (`#191b3c`, `#291942`, `#1a1937`) gần màu tòa nhà, trong khi viền khá mỏng. Người chơi phải dựa nhiều vào glow để nhận ra vật cản.
- Vị trí nền dùng `time × speed`, thậm chí nhân thêm speed ở parallax. Điểm thưởng khi vượt vật cản/nhặt lõi làm tốc độ đổi, kéo theo tính lại vị trí của toàn bộ quãng đường cũ và gây nhảy nền. Độ nhảy tăng theo thời gian chạy.
- Mẫu đèn cửa sổ dựa vào tọa độ màn hình đang thay đổi, nên cửa sổ nhấp nháy khi tòa nhà di chuyển. Một số tòa nhà rộng còn bị tái xuất hiện khi chưa ra hết mép trái.
- Vật lý 60 Hz được vẽ trực tiếp, nên màn hình 120/144 Hz có những frame lặp vị trí. Mỗi tick còn tạo mảng mới khi lọc vật cản, lõi và particle. Không có bằng chứng rằng garbage collection là nguyên nhân duy nhất của hiện tượng người dùng gặp; việc giảm cấp phát là cải thiện phụ.

## Thay đổi

1. Nâng độ sáng nền và mặt đường vừa phải, giữ phong cách neon. Rào chắn vàng sáng, cột nhọn hồng sáng, drone xanh sáng; viền gần trắng và chi tiết tối giúp nhận dạng bằng cả hình/họa tiết. Chế độ nhẹ vẫn có cùng màu tô và viền, chỉ bỏ glow.
2. Tích lũy quãng đường theo từng bước mô phỏng. Nền, parallax và lưới đường cuộn từ quãng đường này; thưởng điểm không làm nền nhảy. Mẫu cửa sổ cố định theo hàng/cột, wrap tòa nhà ở ngoài khung hoàn toàn.
3. `render-motion.js` giữ snapshot hiển thị trong WeakMap, tái dùng snapshot của entity còn sống và nội suy bằng phần dư của vòng lặp. Renderer không sửa tọa độ/vật lý. Reset snapshot khi chơi lại, resize và pause/resume để tránh kéo theo vị trí cũ.
4. Giữ nguyên ngưỡng dọn entity và luật thu thập/va chạm; lọc tại chỗ thay vì tạo mảng mới. Bỏ lệnh vẽ và shadow khi vật thể đã hoàn toàn ngoài vùng nhìn.

Không thay đổi công thức điểm, hitbox, vận tốc nhảy, trọng lực, tốc độ, khoảng sinh vật cản đang có trong workspace, kỷ lục hoặc cài đặt. Nội suy là thay đổi trình bày: hình ảnh có độ trễ tối đa một bước mô phỏng, khoảng 16,7 ms, để đổi lấy chuyển động đều giữa các lần cập nhật 60 Hz.

## Kiểm chứng

- `npm run verify`: đạt kiểm tra cú pháp/import/tài nguyên, ESLint, Prettier và unit tests.
- **51/51 unit/regression tests đạt**, gồm các trường hợp mới: thưởng điểm sau thời gian dài không làm nhảy quãng đường, nội suy ở 120/144 Hz, dọn entity không đổi mảng/không tác động entity còn lại, cửa sổ không nhấp nháy, renderer chỉ đọc state, wrap và culling ngoài màn hình.
- Màu tô vật cản có tỷ lệ tương phản tính từ RGB ít nhất 3,5:1 so với các màu nền/tòa nhà/mặt đất được kiểm tra; viền ít nhất 7:1. Đây là kiểm tra bảng màu, không phải chứng nhận toàn bộ khả năng truy cập của game Canvas.
- **21/21 bài kiểm tra trình duyệt đạt** trên Chromium, Firefox và Pixel 7 giả lập: 15 bài hồi quy sẵn có cùng 6 bài canvas mới. Kiểm tra canvas chạy chuỗi drone hợp lệ qua nhiều lần dọn vật cản ở mép màn hình; quãng đường vẫn liên tục và game tiếp tục chạy.
- Đã xem ảnh canvas desktop/mobile cho ba chủ đề × hai mức đồ họa: cả ba loại vật cản rõ trên nền, kể cả khi tắt glow. Ảnh nằm trong `test-results/renderer-*/hazards-all-themes.png` và được tạo lại mỗi lần chạy suite.
- Skill trình duyệt được dùng để kiểm tra cập nhật qua nút trong Cài đặt: UI chuyển từ 1.1.0 sang **1.1.1**, giữ kỷ lục/cài đặt. Toàn luồng start/pause/resume/end/retry vẫn đạt; không ghi nhận lỗi console trong lần kiểm tra này.

Chưa đo frame pacing/GPU trên máy và thiết bị thật của người dùng; kiểm tra xác định ở trên không phải cam kết hết mọi frame drop trên mọi phần cứng. WebKit/Safari vẫn chưa chạy được trong môi trường này do thiếu thư viện hệ thống. Không deploy công khai.

## Nhận bản vá

Mã phục vụ nằm trong `dist/`; precache đã sinh revision mới. Với tab đã lưu bản cũ, mở lại trang khi có mạng, vào **Cài đặt → Có bản mới — tải lại**, rồi kiểm tra dòng **Neon Dash v1.1.1**. Không cần xóa kỷ lục hoặc dữ liệu trình duyệt.

Gói phát hành được tạo bằng `npm run release`, giữ riêng bản 1.1.0 trước đó để đối chiếu/rollback theo `docs/release.md`.
