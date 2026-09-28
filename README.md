# Neon Dash 1.1.1

Game endless runner thuần HTML/CSS/JavaScript, vẽ bằng Canvas 2D. Bản này giữ luật Classic và thêm âm thanh, cài đặt, ba skin, ba chủ đề, thử thách mỗi lượt và offline/PWA. Không có thư viện runtime; `dist/` chứa đầy đủ tài nguyên để phục vụ trực tiếp.

Bản 1.1.1 tăng độ sáng/tương phản vật cản, sửa cuộn nền bị giật khi thay đổi tốc độ và nội suy hình ảnh giữa các bước vật lý 60 Hz. Xem [báo cáo bản vá](docs/reports/04-visibility-motion.md).

## Chạy game

Tại thư mục dự án:

```bash
node tools/serve.mjs
```

Hoặc `python3 -m http.server 4173 --directory dist` (Windows: `py -m http.server 4173 --directory dist`). Mở [localhost:4173](http://localhost:4173). Dùng HTTP, không mở trực tiếp bằng `file://`, vì game dùng ES modules. Người chỉ muốn chơi không cần `npm install`.

Archive phát hành chỉ chứa game trong `dist/` và tài liệu, không chứa công cụ phát triển. Sau khi giải nén archive, dùng lệnh Python ở trên hoặc phục vụ `dist/` bằng static host. Các lệnh Node/npm bên dưới dành cho workspace mã nguồn đầy đủ.

## Điều khiển và tính năng

- Space/↑: bắt đầu hoặc chạy lại; khi đang chơi thì nhảy, tối đa hai lần trước khi chạm đất.
- Giữ ↓/S: trượt khi chạm đất. Nút cảm ứng ↓ cũng cần nhấn giữ.
- P hoặc nút Ⅱ: tạm dừng. Tiếp tục bằng nút trong overlay, P, Space, ↑ hoặc nút cảm ứng nhảy.
- Rời tab/cửa sổ: nhả input và tự pause; quay lại cần thao tác tiếp tục.
- ⚙ mở cài đặt: âm thanh, âm lượng, giảm hiệu ứng, đồ họa nhẹ, skin và chủ đề. Đóng hộp thoại không tự tiếp tục lượt đang pause.
- Hướng dẫn lần đầu có nút “Đã hiểu”; kết quả có thống kê thời gian, lõi, vật cản, combo và thử thách hoàn thành.
- Ba thử thách mỗi lượt: 500 điểm, 5 lõi, 8 vật cản. Chúng chỉ ghi nhận thành tích, không thay đổi điểm thưởng, tốc độ hay hitbox Classic.

Kỷ lục tiếp tục dùng `neonDashBest`; cài đặt lưu riêng ở `neonDashPreferencesV1`. Khi storage bị chặn, game vẫn chơi được với dữ liệu trong phiên.

## Kiến trúc

| Module                                | Trách nhiệm                                   |
| ------------------------------------- | --------------------------------------------- |
| `main.js`                             | Khởi tạo, nối module, vòng đời trang          |
| `game-loop.js`                        | Lập lịch, vật lý cố định 60 Hz                |
| `game.js`, `entities.js`, `config.js` | Trạng thái, vật lý, va chạm, điểm và cấu hình |
| `renderer.js`, `content.js`           | Canvas, skin/chủ đề và định nghĩa thử thách   |
| `render-motion.js`                    | Snapshot và nội suy chỉ phục vụ hiển thị      |
| `controls.js`, `ui.js`                | Input, HUD, overlay và kết quả                |
| `audio.js`                            | Web Audio, giới hạn voice và cleanup          |
| `preferences.js`, `settings-ui.js`    | Cài đặt, kiểm tra dữ liệu và giao diện        |
| `storage.js`, `model-context.js`      | Kỷ lục và công cụ tích hợp tùy chọn           |
| `performance.js`                      | Đo thời gian gọi render bằng vòng đệm cố định |
| `offline.js`, `version.js`, `sw.js`   | PWA, phiên bản, cache và cập nhật             |

Các module nằm trong `dist/scripts/`; worker ở `dist/sw.js`. `dist/` là mã được phục vụ trực tiếp, không phải thư mục build để xóa. Bộ test nằm trong `tests/`, công cụ phát triển trong `tools/`.

## Offline và cập nhật

Font được phục vụ cục bộ, có giấy phép trong `dist/assets/fonts/`. Sau lần tải online thành công qua HTTPS/localhost, Cài đặt hiển thị “Sẵn sàng chơi offline”. Có thể ngắt mạng, reload và chơi.

Khi có phiên bản mới, nút “Có bản mới — tải lại” xuất hiện trong Cài đặt. Không tự reload giữa lượt; người chơi quyết định khi nào cập nhật. Nếu trình duyệt hỗ trợ cài PWA, nút “Cài lên thiết bị” xuất hiện; iOS có thể dùng Add to Home Screen.

Nếu `document.modelContext` khả dụng, hai công cụ bắt đầu lượt và đọc trạng thái được đăng ký; tích hợp lỗi hoặc vắng mặt không cản trở game.

## Phát triển và kiểm thử

Node.js **22.13 trở lên**. Dependency chỉ dành cho phát triển:

```bash
npm ci
npm run verify
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

`verify` chạy kiểm tra cú pháp/import/font, ESLint, Prettier và unit tests. `npm run format` chuẩn hóa định dạng. Không đủ thư viện WebKit thì chạy các engine đã có:

```bash
npm run test:browser -- --project=chromium --project=firefox --project=mobile
```

CI được cấu hình tại `.github/workflows/check.yml`; chỉ hoạt động khi repo được đưa lên GitHub. Workspace hiện tại chưa có Git remote hoạt động.

Sau khi sửa `dist/`, chạy `npm run precache` để sinh revision mới. Tab đã cài offline cần bấm nút cập nhật hoặc đóng tất cả tab rồi mở lại. Khi thay font/icon, chạy `npm run assets` trước; giữ các file tài nguyên sinh ra trong repository để game chạy không cần npm.

Đóng gói bằng `npm run release`: tạo archive và SHA-256 trong `releases/`. Xem [hướng dẫn phát hành/rollback](docs/release.md) và [changelog](CHANGELOG.md).

## Báo cáo

- [Đợt 1 — Ổn định](docs/reports/01-stability.md)
- [Đợt 2 — Trải nghiệm](docs/reports/02-experience.md)
- [Đợt 3 — Nội dung và phát hành](docs/reports/03-release.md)
- [Đánh giá nền tảng trước đó](docs/code-review.md)

Viewport giả lập và test tự động không thay thế kiểm tra đa chạm/hiệu năng trên điện thoại vật lý. Các kết quả và giới hạn được ghi rõ trong báo cáo.
