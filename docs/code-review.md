# Đánh giá và cải thiện Neon Dash

Đợt đánh giá ngày 25/09/2026 tập trung vào tính đúng đắn của gameplay, khả năng bảo trì, input, vòng đời trang, lưu trữ và giao diện. Dự án tiếp tục chạy trực tiếp bằng HTML/CSS/ES modules, không thêm thư viện runtime hoặc bước build.

Đây là báo cáo nền tảng trước bản 1.1.0. Ba đợt tiếp theo được ghi trong `docs/reports/`; bản 1.1.0 đã chuyển font sang phục vụ cục bộ và bổ sung E2E đa trình duyệt, offline/PWA. Các số lượng test và nhận xét Google Fonts bên dưới mô tả thời điểm đánh giá ban đầu.

## Phát hiện đã xử lý

P1 là lỗi ảnh hưởng kết quả hoặc có thể làm gián đoạn lượt chơi; P2 là lỗi tương tác/độ ổn định; P3 là cải thiện cấu trúc và bảo trì.

| Mức | Phát hiện và tình huống tái hiện                                                                                                                             | Cải thiện                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| P1  | `update()` vẫn thu thập orb sau khi va chạm kết thúc lượt: kết quả/kỷ lục là 100 nhưng HUD và API báo 125.                                                   | Dừng xử lý gameplay ngay sau va chạm; chốt HUD và kỷ lục cùng một kết quả.                                                   |
| P1  | Đổi kích thước khi đang chơi/pause chỉ dời vị trí ngang của cáo, không dời mặt đất của vật thể. Với 1000×700 → 400×500, cáo/barrier nằm dưới mặt đất 152 px. | Dời nhân vật và các vật thể theo chênh lệch mặt đất; giữ độ cao cú nhảy, vận tốc và khoảng cách tương đối đến chướng ngại.   |
| P1  | Chạy lại trong 380 ms chuyển cảnh game over có thể bị callback cũ mở overlay giữa lượt mới.                                                                  | Hủy timeout và flash cũ khi bắt đầu lượt hoặc dọn dẹp UI.                                                                    |
| P2  | Tích phân vật lý theo khoảng thời gian mỗi lần vẽ khiến quỹ đạo nhảy khác nhau theo tần số màn hình.                                                         | Tách `GameLoop`, chạy bước vật lý cố định 60 Hz; giới hạn khoảng ngắt dài, reset đồng hồ khi khởi động lại loop.             |
| P2  | Giữ phím gây lặp nhảy/pause; thả pointer ngoài nút hoặc nhả trượt trong lúc pause có thể giữ trạng thái không mong muốn.                                     | Bỏ qua key repeat, theo dõi từng phím/pointer, capture pointer và xử lý mất capture; lệnh nhả trượt luôn được chấp nhận.     |
| P2  | Rời tab/cửa sổ để lại input đang giữ và lượt chơi tiếp tục khi người chơi không nhìn thấy.                                                                   | Nhả input, tự pause khi blur/ẩn tab; dừng RAF khi ẩn và chỉ tiếp tục gameplay qua thao tác của người chơi.                   |
| P2  | Shake và frame nhân vật chưa reset khi chơi lại; particle chết đứng yên vì toàn bộ cập nhật dừng ở game over.                                                | Reset trạng thái lượt mới; cập nhật hiệu ứng sau game over mà không cộng thêm điểm; renderer không sửa trạng thái game.      |
| P2  | Dữ liệu kỷ lục âm/`Infinity`, lỗi truy cập storage hoặc lỗi đăng ký modelContext có thể gây kết quả sai hoặc gián đoạn tích hợp.                             | Kiểm tra dữ liệu hữu hạn, không âm; xử lý lỗi storage và từng lần đăng ký tùy chọn; cung cấp cleanup.                        |
| P2  | Chiều cao tối thiểu lớn hơn màn hình thấp làm nội dung/nút nằm ngoài vùng nhìn; điều khiển cảm ứng chỉ dựa vào chiều rộng.                                   | Giới hạn chiều cao theo viewport, cho overlay cuộn, thêm bố cục màn hình thấp và nhận diện pointer cảm ứng.                  |
| P3  | Lập lịch, luật chơi và thay đổi state khi render đan xen; thiếu kiểm thử tự động và quy trình kiểm tra import.                                               | Tách scheduler/engine/renderer; gom thông số vào cấu hình bất biến; thêm bộ kiểm thử và lệnh kiểm tra không dùng dependency. |
| P3  | HUD ghi lại DOM dù nội dung không đổi; thiếu focus rõ ràng và thông báo trạng thái truy cập được.                                                            | Chỉ ghi nội dung khi thay đổi, thêm focus-visible, thông báo trạng thái, `noscript` và cho phép zoom trang.                  |

Listener, timeout, animation và đăng ký công cụ đều có cơ chế dọn dẹp. Vòng đời trang xử lý `pagehide`/`pageshow` để giữ khả năng khôi phục từ back-forward cache.

## Gameplay được giữ lại

`config.js` ghi lại các thông số đang dùng; các cải thiện không cân bằng lại độ khó hoặc sửa cách tính thưởng:

| Thông số                        | Giá trị                                                   |
| ------------------------------- | --------------------------------------------------------- |
| Tốc độ ban đầu / tối đa         | 7 / 15 đơn vị mỗi bước                                    |
| Tăng tốc                        | `7 + score / 850`, giới hạn 15                            |
| Khoảng chờ sinh vật cản ban đầu | 560                                                       |
| Trọng lực                       | 0,72 mỗi bước                                             |
| Vận tốc nhảy lần đầu / nhảy đôi | −13,8 / −12,2; tối đa 2 lần trước khi chạm đất            |
| Mặt đất                         | 76% chiều cao canvas                                      |
| Điểm di chuyển                  | `dt × speed × 0.105`                                      |
| Vượt chướng ngại                | +11 energy; +`combo × 8` điểm                             |
| Thu thập orb                    | +14 energy; +`combo × 25` điểm                            |
| Energy / combo                  | Tối đa 100; giảm 0,018 mỗi bước; `1 + floor(energy / 25)` |
| Va chạm / trượt                 | Padding 8; chiều cao hitbox khi trượt 28                  |
| Bán kính thu thập orb           | 30                                                        |
| Kỷ lục                          | Khóa `neonDashBest`, giữ hợp đồng lưu trữ hiện có         |

Các loại chướng ngại, xác suất sinh, dao động drone, khoảng cách sinh và cách thu thập orb giữ theo mã module trước đợt cải thiện. Mô phỏng cố định dùng `dt = 1`, giữ cách chơi chuẩn 60 Hz đồng thời loại bỏ sai lệch do tốc độ vẽ. Chủ động pause khi mất focus và tiếp tục bằng thao tác người chơi là thay đổi hành vi tương tác có chủ đích.

## Bằng chứng kiểm chứng

### So sánh với mã monolith gốc

Đã chạy mã JavaScript gốc từ bản `work/neon-dash-source/dist/index.html` trong một Node VM riêng, dùng Canvas/DOM giả lập và `Math.random() = 0.5`. Cùng kịch bản được chạy trên engine cải tiến:

- 2.000 bước mô phỏng, mỗi bước `dt = 1`.
- Nhảy ở bước 10 và 15 để kiểm tra nhảy đôi; trượt từ sau bước 60.
- Có sinh drone/orb, vượt chướng ngại, thu thập, combo và tăng tốc.
- Sau mỗi bước, so sánh chính xác trạng thái, thời gian, điểm, kỷ lục, tốc độ, khoảng sinh, energy, combo, nhân vật, chướng ngại, orb và particle.

Kết quả khớp ở toàn bộ 2.000 bước; trạng thái cuối `play`, điểm `10442.7945865134`. Đây là kiểm tra hồi quy cho một kịch bản xác định, không phải chứng minh mọi chuỗi ngẫu nhiên đều tương đương. Phép so sánh được thực hiện một lần; bộ kiểm thử trong repository không phụ thuộc bản monolith ngoài dự án.

### Kiểm thử tự động

Đã chạy thành công `npm test` (31 trường hợp) và `npm run check` trên Node.js 22. Bộ kiểm thử gồm bốn nhóm:

- `game.test.js`: bắt đầu, nhảy đôi, tiếp đất, pause/resume, reset, điểm va chạm chết, kỷ lục, thưởng một lần, resize và hitbox trượt.
- `game-loop.test.js`: cùng số bước mô phỏng ở 30/60/120/144 Hz, start/stop, khoảng ngắt dài và dừng loop trong callback.
- `ui-controls.test.js`: phím giữ, nhiều nguồn input, pointer/keyboard, mất focus, dispose, hủy overlay/flash cũ và thiếu Web Animations API.
- `integration.test.js`: lưu/đọc kỷ lục, dữ liệu lỗi, storage bị chặn, modelContext vắng mặt hoặc đăng ký lỗi đồng bộ/bất đồng bộ.

Lệnh `check` xác nhận cú pháp của 10 module JavaScript cùng các import và tài nguyên HTML cục bộ.

### Kiểm tra trực tiếp trên trình duyệt

Đã kiểm tra trong trình duyệt với các kích thước viewport sau, không ghi nhận lỗi hoặc cảnh báo console:

- Desktop 1280×720: bắt đầu, nhảy đôi bằng bàn phím và pause hoạt động.
- Mobile 390×844: bấm nút nhảy tiếp tục được lượt đang pause; ở 320×568 giao diện vừa khung, không tràn ngang.
- Landscape 844×390: màn hình kết thúc và nút chạy lại nằm trong vùng nhìn.
- Sau va chạm, HUD và kết quả cùng hiển thị `00133`; kỷ lục `00163` vẫn còn sau khi tải lại trang.
- Sau khi chạy lại, pause tiếp tục hoạt động; công cụ đọc modelContext trả trạng thái `paused`, điểm 27 đúng với lượt hiện tại.

Các viewport mobile và thao tác pointer được kiểm tra bằng môi trường trình duyệt, chưa phải phần cứng cảm ứng thật.

## Giới hạn và kiểm tra tiếp theo

Kiểm thử tự động dùng mô phỏng môi trường; kiểm tra trình duyệt ở các viewport trên chưa bao phủ mọi trình duyệt, hệ điều hành hoặc thiết bị. Chưa kiểm tra điện thoại hoặc máy tính bảng vật lý. Khi nghiệm thu trên thiết bị thật nên kiểm tra bắt đầu/chơi lại nhanh, pause/đổi tab, nhảy đôi, thả ngón tay ngoài nút trượt, xoay màn hình và khôi phục trang từ lịch sử trình duyệt.

Google Fonts vẫn là tài nguyên mạng ngoài tùy chọn. Font không tải được chỉ ảnh hưởng kiểu chữ; muốn loại bỏ hoàn toàn yêu cầu mạng ngoài cần bỏ liên kết font hoặc tự phục vụ font. Cải thiện khả năng truy cập hiện có không đồng nghĩa gameplay Canvas đã có trải nghiệm tương đương hoàn toàn bằng trình đọc màn hình.
