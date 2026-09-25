# Neon Dash

Game endless runner thuần HTML, CSS và JavaScript. Không cần cài dependency.

## Cách chạy nhanh

### Python

Mở Terminal tại thư mục này và chạy:

```bash
python3 -m http.server 4173 --directory dist
```

Sau đó mở: <http://localhost:4173>

Trên Windows, nếu lệnh `python3` không tồn tại, thử:

```powershell
py -m http.server 4173 --directory dist
```

### Node.js

Nếu máy đã có Node.js:

```bash
npx serve dist
```

Mở địa chỉ được hiển thị trong Terminal.

## Cấu trúc mã nguồn

Game không cần bước build. Mỗi phần được tách theo trách nhiệm và nối với nhau bằng ES modules:

```text
dist/
├── index.html                 # Khung HTML và các màn hình UI
├── styles/main.css            # Toàn bộ style và responsive layout
└── scripts/
    ├── main.js                # Điểm khởi tạo ứng dụng
    ├── game.js                # Vòng lặp và luật chơi
    ├── renderer.js            # Vẽ canvas
    ├── entities.js            # Tạo entity và kiểm tra va chạm
    ├── controls.js            # Bàn phím, cảm ứng và resize
    ├── ui.js                  # Đồng bộ HUD/overlay
    ├── storage.js             # Đọc/ghi điểm kỷ lục
    ├── model-context.js       # Tích hợp công cụ modelContext
    └── config.js              # Hằng số dùng chung
```

Vì JavaScript dùng ES modules, hãy chạy game qua HTTP server theo hướng dẫn ở trên thay vì mở trực tiếp `index.html`. Sau khi lưu thay đổi, tải lại trình duyệt. Điểm kỷ lục được lưu trong `localStorage` của trình duyệt.

## Điều khiển

- `Space` hoặc `↑`: nhảy / nhảy đôi
- `↓` hoặc `S`: trượt
- `P`: tạm dừng
- Điện thoại: dùng hai nút cảm ứng ở cuối màn hình
