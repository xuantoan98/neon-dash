# Đợt 3 — Nội dung, offline và bản phát hành 1.1.0

Ngày thực hiện: 28/09/2026. Trạng thái: hoàn tất triển khai ba đợt và chuẩn bị bản phát hành cục bộ. Không triển khai lên host công khai trong lần thực thi này.

## Kết quả

- Ba skin: Kitsune hồng, Cáo băng, Cáo mặt trời; ba chủ đề: Neo-Sài Gòn, Bình minh, Cực quang. Chỉ thay bảng màu, không đổi hitbox hoặc vật lý.
- Ba thử thách theo từng lượt: 500 điểm, 5 lõi và 8 chướng ngại. Theo dõi tiến độ trên HUD, tổng hợp ở kết quả; không cộng thưởng hoặc thay luật Classic.
- Offline/PWA: manifest tương đối, icon 192/512, toàn bộ font cục bộ kèm giấy phép. Worker cache trọn phiên bản theo revision, giới hạn cleanup vào cache Neon Dash cùng scope.
- Bản cập nhật chờ người dùng bấm “Có bản mới — tải lại” trong Cài đặt; không tự tải lại giữa lượt. Nút cài PWA chỉ xuất hiện khi trình duyệt cung cấp khả năng này.
- Phiên bản đồng bộ `1.1.0`, changelog, hướng dẫn phát hành/rollback và công cụ đóng gói archive kèm SHA-256. Tài nguyên web tự chứa trong `dist/`, không có dependency runtime.
- Mã nguồn có 17 ES modules với trách nhiệm riêng; HTML chỉ giữ cấu trúc giao diện, stylesheet và điểm khởi tạo module. Game engine, renderer, input, UI, âm thanh, lưu trữ và offline được nối ở lớp khởi tạo.

## Kết quả kiểm chứng cuối

| Nhóm                    | Kết quả                        | Bằng chứng/phạm vi                                                                                                                                 |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/regression         | 42/42 đạt                      | Gameplay, loop, input/UI, storage/integration, preferences/audio/performance, nội dung và worker                                                   |
| Kiểm tra mã             | Đạt                            | Cú pháp/import, tài nguyên HTML/font, ESLint và Prettier qua `npm run verify`                                                                      |
| Chromium desktop        | 5/5 E2E đạt                    | Toàn luồng, phím, cài đặt, offline, bố cục                                                                                                         |
| Firefox desktop         | 5/5 E2E đạt                    | Cùng năm kịch bản                                                                                                                                  |
| Mobile Chromium         | 5/5 E2E đạt                    | Pixel 7 giả lập; không phải điện thoại vật lý                                                                                                      |
| Bố cục                  | Đạt trong các viewport đã thử  | 320×568, 390×844, 844×390; ảnh landscape kiểm tra sau khi transition kết thúc                                                                      |
| Offline thật trong test | Đạt trên cả ba project đã chạy | Ngắt mạng trong browser context, reload từ cache, chơi/pause/kết thúc/chơi lại                                                                     |
| Cập nhật worker         | Kiểm tra thủ công đạt          | Bản mới hiện nút chờ, không tự reload; bấm cập nhật tải giao diện mới; kiểm tra lại phiên bản 1.1.0, skin/thành phố đã lưu và không có lỗi console |
| WebKit/Safari           | Chưa kiểm chứng                | Browser không khởi động được do thiếu thư viện hệ thống                                                                                            |

Lệnh E2E nghiệm thu: `npm run test:browser -- --project=chromium --project=firefox --project=mobile --workers=2`; lần chạy cuối đạt 15/15. Luồng UI chung nằm ở `tests/browser/scenarios.mjs`, cấu hình đầy đủ gồm cả WebKit nằm ở `playwright.config.mjs`.

Các thông số tốc độ, nhảy đôi, trượt, energy/combo, thưởng và khóa `neonDashBest` giữ nguyên. Skin/chủ đề chỉ chứa giá trị trình bày; thử thách chỉ đọc dữ liệu. Thêm tính năng không đồng nghĩa đã chứng minh mọi chuỗi chơi ngẫu nhiên đều tương đương; phạm vi hồi quy có bằng chứng được ghi tại báo cáo nền tảng và bộ test.

## Bàn giao

- Game và tài nguyên: `dist/`, khoảng 604 KiB dung lượng chiếm trên đĩa; manifest precache có 62 mục. Đây không phải số byte tải qua mạng sau nén.
- Gói phát hành: `releases/neon-dash-1.1.0-2848f905025b49f0.tar.gz` và file `.sha256` cùng tên. Archive chứa `dist`, README, changelog và tài liệu; không chứa dependency hay công cụ phát triển. Workspace giữ đầy đủ mã nguồn, test và scripts.
- [Báo cáo đợt 1](01-stability.md), [báo cáo đợt 2](02-experience.md), [hướng dẫn phát hành/rollback](../release.md).
- Không thay cấu hình hosting hiện tại, không xóa kỷ lục/cài đặt và không công bố bản mới ra bên ngoài.

## Giới hạn và việc cần nghiệm thu ngoài môi trường này

1. WebKit cần các thư viện hệ thống còn thiếu; lệnh cài đã bị chặn bởi yêu cầu mật khẩu quản trị. Không yêu cầu hay lưu mật khẩu trong dự án. Cần môi trường có đủ dependency để chạy project `webkit`.
2. Chưa có thiết bị Android/iOS thật để kiểm tra đa chạm, thả tay ngoài nút, xoay/khóa máy, restore history, cài PWA và hành vi tiết kiệm pin. Nút/cơ chế PWA đã triển khai nhưng thao tác cài lên hệ điều hành chưa được nghiệm thu thực tế.
3. Đo CPU render P95 0,7 ms được ghi ở đợt 2; không phải cam kết FPS/GPU hoặc kết quả điện thoại yếu. Chưa thực hiện heap snapshot trên thiết bị thật.
4. Workflow CI đã chuẩn bị nhưng chưa chạy trên GitHub: workspace không có Git repository/remote hoạt động. Kiểm tra cục bộ không được gọi là CI đã chạy.
5. Chưa deploy công khai và chưa diễn tập rollback trên host thật. Tài liệu yêu cầu triển khai nguyên bộ artifact và giữ worker khi rollback để tránh cache cũ.

Các giới hạn này không bị tính vào hạng mục đã kiểm thử đạt; chúng là checklist nghiệm thu trước khi phát hành rộng rãi.
