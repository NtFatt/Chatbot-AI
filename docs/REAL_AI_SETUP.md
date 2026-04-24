# Real AI Setup

Mục tiêu của tài liệu này là chuyển workspace từ `fallback-only` sang `real AI`.

## 1. Điền API key thật

Mở file `apps/api/.env` và điền ít nhất một trong hai key:

```env
GEMINI_API_KEY=your_real_gemini_key
OPENAI_API_KEY=your_real_openai_key
```

Khuyến nghị cho local/demo:

```env
GEMINI_ENABLED=true
OPENAI_ENABLED=true
AI_PRIMARY_PROVIDER=GEMINI
AI_FALLBACK_PROVIDER=OPENAI
AI_LOCAL_FALLBACK_ENABLED=true
AI_STARTUP_STRICT=false
```

Nếu muốn server **không được phép khởi động** khi AI thật chưa sẵn sàng:

```env
AI_STARTUP_STRICT=true
```

## 2. Khởi động lại API

```powershell
pnpm dev:api
```

Hoặc nếu đang chạy full stack:

```powershell
pnpm dev
```

## 3. Kiểm tra chẩn đoán

Chạy lệnh:

```powershell
pnpm ai:doctor
```

Kỳ vọng:

- Có ít nhất một provider ở trạng thái `configured`
- `API /health` trả `Runtime AI mode: real`

Bạn cũng có thể mở `Settings` trong UI rồi bấm `Kiểm tra` để xem readiness, latency và incidents.

## 4. Khi nào app vẫn còn rơi về fallback

Fallback sẽ còn xuất hiện nếu:

- API key chưa có hoặc sai
- Model không hợp lệ
- Provider bị rate limit hoặc timeout
- Provider đang cooldown sau chuỗi lỗi retryable

Trong trường hợp đó:

- Xem `Settings -> Provider diagnostics`
- Xem API health tại [http://localhost:4000/health](http://localhost:4000/health)
- Chạy lại `pnpm ai:doctor`

## 5. Cấu hình production-minded

Khi chuẩn bị demo/nghiệm thu nghiêm túc:

- bật `AI_STARTUP_STRICT=true`
- giữ `AI_LOCAL_FALLBACK_ENABLED=true` cho chế độ degraded rõ ràng
- theo dõi `GET /api/providers/metrics`
- theo dõi `GET /api/providers/incidents`
- theo dõi `GET /api/chat/usage`

## 6. Kết luận

Nếu `pnpm ai:doctor` báo `no real AI provider is ready yet`, thì vấn đề không còn nằm ở UI hay chat flow nữa; lúc đó cần bổ sung API key thật hoặc sửa lại credential đã cấu hình.
