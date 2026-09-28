# Đợt 1 — Ổn định và điều khiển

Ngày thực hiện: 28/09/2026. Trạng thái: hoàn tất phần triển khai và kiểm tra trong môi trường hiện có.

## Kết quả

- Nút tạm dừng luôn có khi đang chơi; overlay DOM có nút tiếp tục và kết thúc lượt, dùng được trên điện thoại.
- Hướng dẫn giữ nút trượt; nhảy đôi, điểm thưởng, tốc độ và kỷ lục Classic giữ nguyên.
- Kịch bản toàn luồng dùng lại được trong `tests/browser/scenarios.mjs`; bộ Playwright cấu hình Chromium, Firefox, WebKit và viewport mobile.
- Server phát triển dùng Node, chỉ phục vụ `dist`, kiểm soát đường dẫn và phương thức HTTP.

## Kiểm chứng

- 31 test Node hiện có đạt; kiểm tra cú pháp/import đạt.
- Kịch bản tự động trên trình duyệt trong ứng dụng đạt: start → pause → resume → finish → đối chiếu điểm → retry. Kết quả 00025; không có lỗi/cảnh báo console.
- Viewport mobile 390×844 kiểm tra overlay và nút. Kiểm tra cuối đạt 15/15 E2E trên Chromium, Firefox và viewport Pixel 7, bao gồm bố cục hẹp 320×568 và ngang 844×390; xem [báo cáo đợt 3](03-release.md).

## Giới hạn

Không có điện thoại Android/iOS vật lý trong môi trường này. Kiểm tra đa chạm thật, bàn phím hệ điều hành và hành vi tiết kiệm pin vẫn cần nghiệm thu trên thiết bị. Không đánh dấu các mục này là đã kiểm chứng vật lý.
