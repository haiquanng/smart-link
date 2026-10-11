# Quy tắc nghiệp vụ

Dùng làm nguồn chuẩn khi viết test và code.

## Lưu
1. Lưu phải thành công nhanh, kể cả khi không lấy được tiêu đề, nội dung hay ảnh xem trước.
2. Cần ít nhất một trong: URL, ghi chú, ảnh. Rỗng cả ba thì từ chối.
3. Ghi chú của người dùng là tín hiệu tìm kiếm mạnh nhất, trọng số cao hơn tiêu đề và tóm tắt AI.
4. URL được chuẩn hoá trước khi lưu: theo redirect (link `facebook.com/share/...`), bỏ tham số theo dõi (`mibextid`, `utm_*`, `fbclid`, `igshid`), hạ chữ thường tên miền.
5. Cùng URL chuẩn hoá của cùng một người dùng thì không tạo bản ghi mới. Ghi chú mới được nối vào bản ghi cũ. Ngoại lệ: lưu ảnh kèm URL đã có ảnh thì tạo mục riêng (giữ URL, không dùng để chống trùng); nếu mục cũ chưa có ảnh thì gắn ảnh vào mục cũ.
6. Mỗi lần lưu ghi lại kênh (`shortcut`, `paste`, `upload`, `share_target`, `manual`).

## Làm giàu (enrich)
7. Làm giàu chạy sau khi lưu, có thể thất bại. Thất bại thì `status = enrich_failed`, bản ghi vẫn tìm được bằng ghi chú. Cho phép thử lại.
8. Tóm tắt, tag và OCR do AI sinh ra phải gắn `origin = ai`. Người dùng sửa được và xoá được.
9. Không để AI ghi đè ghi chú của người dùng.
10. Ảnh chụp màn hình: đọc chữ trong ảnh, lưu vào `content_text`, ảnh giữ ở bucket riêng.

## Tìm kiếm
11. Gõ không dấu vẫn ra kết quả có dấu ("dinh gia" tìm được "định giá").
12. Tìm theo nghĩa khi có embedding, nếu chưa có thì chỉ tìm văn bản.
13. Lọc theo nguồn, thẻ, bộ sưu tập, khoảng thời gian.
14. Kết quả hiển thị ghi chú của người dùng đầu tiên, rồi tiêu đề, rồi tóm tắt.

## Nhắc lại (Resurface)
15. Mỗi ngày chọn tối đa 3 mục cũ nhất chưa `seen_at`, ít nhất 3 ngày tuổi.
16. Mở hoặc bấm "bỏ qua" thì đặt `seen_at`. Mục đã xem không được nhắc lại trừ khi người dùng đặt lại.
17. Tuỳ chọn gửi nhắc bằng Web Push, chỉ khi PWA đã cài lên màn hình chính (iOS 16.4 trở lên). Không có thì chỉ nhắc trong tab Nhắc lại.

## Bộ sưu tập
18. Một mục có thể thuộc nhiều bộ sưu tập.
19. Bộ sưu tập công khai dùng đường dẫn chỉ đọc có mã ngẫu nhiên. Tắt chia sẻ thì đường dẫn cũ vô hiệu.
20. Người xem công khai chỉ thấy URL, tiêu đề, tóm tắt, ghi chú đã chọn chia sẻ. Không thấy ảnh chụp màn hình riêng tư trừ khi bật.

## Bảo mật và quyền
21. Mỗi người chỉ thấy dữ liệu của mình. Token ingest thu hồi được, hiển thị một lần.
