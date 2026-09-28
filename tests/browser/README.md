# Kiểm thử trình duyệt

Các kiểm thử chỉ tương tác qua giao diện và trạng thái trình duyệt công khai, không cần API debug của game. Server PWA riêng tự khởi động tại `http://127.0.0.1:4175`, tách khỏi server dev ở cổng 4173 để kiểm tra offline đúng như bản phát hành.

## Chạy

```bash
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

Nếu môi trường chưa có thư viện hệ thống cho WebKit:

```bash
npm run test:browser -- --project=chromium --project=firefox --project=mobile --workers=2
```

## Phạm vi

Mỗi project chạy năm kịch bản:

1. Bắt đầu → pause → tiếp tục → kết thúc → đối chiếu HUD/kết quả → chạy lại; kỷ lục còn sau reload và không có page error.
2. Điều khiển bàn phím, bỏ qua phím giữ lặp và hiển thị pause.
3. Tắt âm thanh, chọn skin/thành phố rồi reload để kiểm tra lưu cài đặt.
4. Đợi cache sẵn sàng, ngắt mạng thật trong browser context, reload và chạy lại toàn luồng.
5. Viewport 320×568 và 844×390: tiêu đề/nút chính trong vùng nhìn; ảnh pause chụp sau khi chuyển cảnh đã hoàn tất.

`scenarios.mjs` chứa luồng dùng chung. `test-results/` chứa ảnh landscape và trace khi lỗi; thư mục này không đưa vào bản phát hành. CI thử lại một lần nếu có lỗi và lưu artifact thất bại.

## Kết quả nghiệm thu 1.1.0

15/15 đạt trên Chromium, Firefox và mobile (Chromium giả lập Pixel 7). WebKit đã được cấu hình nhưng chưa chạy được ở máy hiện tại vì thiếu thư viện hệ thống; không tính là đạt. CI có bước cài thư viện nhưng chưa được thực thi trên GitHub từ workspace này.

Viewport giả lập không thay thế điện thoại vật lý. Đa chạm thật, cài PWA qua giao diện hệ điều hành, khóa máy và đo hiệu năng trên thiết bị yếu vẫn cần nghiệm thu riêng. Xem `docs/reports/03-release.md` để biết giới hạn đầy đủ.

## Bổ sung ở 1.1.1

`renderer.spec.mjs` thêm hai test dùng canvas thật trong trang fixture độc lập, import đúng module production:

- Chụp ba loại vật cản trên ba chủ đề và hai mức đồ họa; đọc pixel trong phần tô đặc để kiểm tra màu sáng không phụ thuộc glow.
- 240 lượt requestAnimationFrame, mỗi lượt bốn bước mô phỏng, với chuỗi drone và giữ trượt hợp lệ. Kiểm tra nhiều lần vật cản bị dọn khỏi màn hình, quãng đường liên tục và mảng không bị cấp phát lại. Dữ liệu CPU update/render được đính kèm kết quả test; không dùng làm khẳng định FPS/GPU trên thiết bị thật.

Kết quả bản vá: 21/21 bài kiểm tra trình duyệt đạt trên Chromium, Firefox và Pixel 7 giả lập. Giới hạn WebKit/thiết bị thật không thay đổi.
