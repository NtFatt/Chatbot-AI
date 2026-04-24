# Chatbot AI hỗ trợ học tập cho sinh viên

Hệ thống fullstack production-minded cho trải nghiệm học tập thời gian thực: sinh viên vào nhanh bằng guest session, chat với AI theo kiểu streaming, xem lại lịch sử hội thoại, đổi AI provider và nhận gợi ý tài liệu học tập theo đúng ngữ cảnh vừa hỏi.

## AI thật

- Điền `GEMINI_API_KEY` và/hoặc `OPENAI_API_KEY` trong `apps/api/.env`
- Chạy `pnpm ai:doctor` để kiểm tra readiness
- Xem hướng dẫn chi tiết ở [docs/REAL_AI_SETUP.md](docs/REAL_AI_SETUP.md)

## PHẦN A — Product Vision

### Mô tả ngắn sản phẩm
- Một workspace học tập hiện đại cho sinh viên: chat AI thời gian thực, lưu lịch sử theo phiên, gợi ý tài liệu, và hỗ trợ nhiều nhà cung cấp AI.

### Mục tiêu
- Trả lời câu hỏi học thuật rõ ràng, dễ hiểu.
- Cung cấp trải nghiệm chat mượt, có retry, reconnect và fallback.
- Tạo nền tảng đủ sạch để phát triển thành sản phẩm demo hoặc v1 thực tế.

### Đối tượng sử dụng
- Sinh viên đại học, câu lạc bộ học thuật, nhóm đồ án, đội ngũ demo edtech nội bộ.

### Giá trị cốt lõi
- `Realtime`: phản hồi streaming qua Socket.IO.
- `Reliable`: fallback provider, retry có giới hạn, error envelope chuẩn.
- `Practical`: seed data tài liệu đủ đẹp để demo ngay.
- `Extensible`: monorepo TypeScript, contract dùng chung, Prisma schema rõ ràng.

## PHẦN B — Chức năng chi tiết

### Chức năng chính
- Quick entry guest login có backend-issued token/session.
- Chat real-time với optimistic UI, trạng thái `sending / streaming / sent / failed`.
- Markdown AI an toàn với code block, heading, bullet và link.
- Tạo, đổi tên, mở lại, xóa chat session.
- Gemini-first, OpenAI fallback.
- Recommendation tài liệu theo query, subject, topic và recent chat context.
- Responsive dashboard 3 vùng, dark mode, loading/empty/error states.

### Luồng người dùng chính
1. Vào trang login và nhập tên hiển thị.
2. Tạo session mới hoặc mở session cũ.
3. Gửi câu hỏi bằng Enter, Shift+Enter để xuống dòng.
4. Nhận chunk trả lời AI theo thời gian thực.
5. Xem tài liệu gợi ý ở panel phải theo đúng thread hiện tại.
6. Đổi provider cho session khi muốn so sánh hoặc fallback thủ công.

## PHẦN C — Kiến trúc kỹ thuật

### Frontend architecture
- `React + Vite + TypeScript`
- `TanStack Query` cho server state
- `Zustand` cho auth/UI state
- `Socket.IO client` cho realtime
- `Tailwind CSS + Framer Motion`
- `react-markdown + rehype-sanitize`

### Backend architecture
- `Node.js + Express + TypeScript`
- `Prisma + PostgreSQL`
- Module hóa theo `auth`, `chat`, `materials`, `providers`, `integrations/ai`, `sockets`
- Middleware chung cho request id, auth, validation, error handling

### Realtime architecture
- Client kết nối Socket.IO bằng access token.
- Room theo `sessionId`.
- Event ACK cho `chat:send_message`, `chat:retry_message`, `chat:join_session`, `chat:sync_state`.
- Client có `clientMessageId` để chống duplicate khi retry/reconnect.

### AI provider architecture
- `AIProvider` interface chung.
- `GeminiAdapter` dùng `@google/genai`.
- `OpenAIAdapter` dùng `openai` Responses API.
- `AIOrchestratorService` xử lý thứ tự provider, timeout, retry, fallback, compact context.

### Database choice + lý do
- Chọn `PostgreSQL` vì domain quan hệ rõ giữa user, session, message, materials, recommendation history.
- Prisma schema/migration giúp local setup và mở rộng analytics ổn định hơn NoSQL trong bài toán này.

## PHẦN D — Thiết kế dữ liệu

### Thực thể chính
- `users`: guest profile, language preference, timestamps.
- `auth_sessions`: refresh token hash, session expiry, user agent, ip.
- `chat_sessions`: title, provider preference, context summary.
- `messages`: sender type, status, provider, model, latency, dedupe by `clientMessageId`.
- `subjects`, `topics`, `study_materials`: catalog tài liệu học tập.
- `recommendation_history`: log điểm số và lý do gợi ý.
- `ai_provider_configs`: enable/disable, model, timeout, retry count.

### Index đáng chú ý
- `chat_sessions(user_id, updated_at desc)`
- `messages(session_id, created_at)`
- unique `messages(client_message_id)`
- `study_materials(subject_id, topic_id, level, type)`
- GIN index cho `study_materials.tags`
- `recommendation_history(session_id, created_at)`

## PHẦN E — API + Socket design

### REST endpoints
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/chat/sessions`
- `POST /api/chat/sessions`
- `PATCH /api/chat/sessions/:id`
- `DELETE /api/chat/sessions/:id`
- `GET /api/chat/sessions/:id/messages`
- `POST /api/chat/ask`
- `GET /api/materials/search`
- `GET /api/materials/recommend`
- `GET /api/providers`
- `GET /health`

### Socket events
- Client -> Server:
  - `chat:join_session`
  - `chat:send_message`
  - `chat:typing`
  - `chat:retry_message`
  - `chat:sync_state`
- Server -> Client:
  - `chat:message_accepted`
  - `chat:message_received`
  - `chat:ai_started`
  - `chat:ai_chunk`
  - `chat:ai_done`
  - `chat:message_failed`
  - `chat:session_updated`
  - `chat:error`

### Error format chuẩn
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload.",
    "details": {}
  },
  "requestId": "uuid",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

## PHẦN F — UI/UX design

### Layout
- Sidebar trái: lịch sử hội thoại.
- Khu giữa: header + luồng chat + composer.
- Panel phải: provider switch + material recommendations.

### Components chính
- Quick entry login surface
- Session sidebar
- Chat bubbles + markdown renderer
- Composer multiline
- Provider pills
- Recommendation cards
- Reconnect banner / empty state / skeleton state

### Responsive
- Desktop: 3 cột rõ ràng.
- Mobile/tablet: sidebar collapse, materials panel rơi xuống dưới.

### Trải nghiệm
- Typography `Space Grotesk + Manrope`
- Accent `teal-cyan`
- Soft motion ở login, stream answer, panel reveal
- Dark mode và focus ring rõ cho accessibility cơ bản

## PHẦN G — Hardening + Polish

### Security
- `helmet`, `cors`, route-specific rate limiting
- Input validation bằng `zod`
- Frontend không bao giờ gọi AI provider trực tiếp
- Refresh token hash lưu DB, access token JWT ngắn hạn

### Stability
- Centralized error handler
- Request ID logging
- Timeout + retry cho provider
- Fallback provider nếu primary fail

### Realtime resilience
- Auto reconnect
- ACK cho send/retry/join/sync
- Dedupe theo `clientMessageId`
- `chat:sync_state` để kéo lại message sau reconnect

### UX polish
- Optimistic user message
- Loading/skeleton/error/empty states
- Retry message fail
- Offline fallback sang HTTP ask route khi socket không sẵn sàng

### Maintainability
- Shared contracts trong `packages/shared`
- Prisma schema + migration + seed
- Module hoá rõ ở cả frontend/backend

## PHẦN H — Folder structure đề xuất

```text
apps/
  api/
    src/
      config/
      integrations/ai/
      middlewares/
      modules/{auth,chat,materials,providers}/
      sockets/
      utils/
    test/
  web/
    src/
      app/
      components/
      features/{auth,dashboard}/
      hooks/
      services/
      store/
      styles/
      utils/
    test/
packages/
  shared/
prisma/
  migrations/
  schema.prisma
  seed.ts
infra/
  docker-compose.yml
```

## PHẦN I — Lộ trình triển khai

### MVP
1. Quick entry auth
2. Chat session CRUD
3. Socket streaming
4. AI fallback
5. Materials recommendation
6. Responsive dashboard

### Nâng cao tiếp theo
1. Auth đầy đủ email/OAuth/SSO
2. Redis cho socket scale-out
3. Embedding-based recommendation
4. Analytics dashboard
5. Multi-tenant classroom / instructor mode

## PHẦN J — Code mẫu / scaffold

### File cốt lõi backend
- `apps/api/src/app.ts`: wiring toàn bộ app, rate limit, routes.
- `apps/api/src/modules/chat/chat.service.ts`: session lifecycle + AI flow.
- `apps/api/src/integrations/ai/ai-orchestrator.service.ts`: provider routing, retry, fallback.
- `apps/api/src/sockets/chat.socket.ts`: realtime event orchestration.

### File cốt lõi frontend
- `apps/web/src/features/dashboard/DashboardPage.tsx`: dashboard shell.
- `apps/web/src/hooks/use-chat-socket.ts`: đồng bộ realtime vào React Query cache.
- `apps/web/src/components/materials/MaterialsPanel.tsx`: recommendation UI.
- `apps/web/src/features/auth/LoginPage.tsx`: quick entry product surface.

## PHẦN K — Test plan

### Unit / Integration / E2E hiện có
- `apps/api/test/auth.routes.test.ts`
- `apps/api/test/materials.service.test.ts`
- `apps/api/test/chat.socket.test.ts`
- `apps/web/test/login-page.test.tsx`

### Test cases tiêu biểu
- Guest login thành công và validation lỗi.
- Recommendation boost đúng khi query + context trùng.
- Socket send message nhận ACK và stream chunk.
- Login page render đúng microcopy cốt lõi.

### Edge cases nên tiếp tục mở rộng
- Provider timeout -> fallback success.
- Socket disconnect giữa chừng -> sync lại message.
- Duplicate submit cùng `clientMessageId`.
- Empty recommendation result.
- Reopen session cũ sau refresh token rotation.

## PHẦN L — README / Setup

### Yêu cầu môi trường
- Node.js `22+`
- pnpm `10+`
- Docker Desktop

### Cài đặt local
```bash
pnpm install
copy .env.example .env
copy apps\\api\\.env.example apps\\api\\.env
copy apps\\web\\.env.example apps\\web\\.env
pnpm db:up
pnpm exec prisma generate --schema prisma/schema.prisma
pnpm db:push
pnpm db:seed
pnpm dev
```

### Chạy từng phần
```bash
pnpm --filter @chatbot-ai/api dev
pnpm --filter @chatbot-ai/web dev
```

### Build và test
```bash
pnpm typecheck
pnpm build
pnpm test
```

### Seed data mẫu
- 4 subject groups:
  - Data Structures
  - Calculus
  - Database Systems
  - Machine Learning
- Mỗi nhóm có topic và 3 loại material khác nhau để recommendation dễ demo.

### Lưu ý phát triển
- Nếu chưa có API key AI, app vẫn build và UI vẫn chạy; chỉ phần AI ask thực tế sẽ fallback sang thông báo lỗi thân thiện.
- `pnpm exec prisma migrate deploy` có thể dùng sau khi đã có DB và migration.
- Nếu muốn demo nhanh phần UI trước, chỉ cần chạy web + mock backend hoặc seed DB sẵn.

## API payload mẫu

### `POST /api/auth/login`
```json
{
  "mode": "guest",
  "displayName": "Lan Anh",
  "preferredLanguage": "bilingual"
}
```

### `POST /api/chat/ask`
```json
{
  "sessionId": "uuid",
  "clientMessageId": "uuid",
  "message": "Explain SQL joins with simple examples",
  "provider": "GEMINI"
}
```

## Seed / migration files
- Migration SQL: [prisma/migrations/20260416190000_init/migration.sql](./prisma/migrations/20260416190000_init/migration.sql)
- Seed script: [prisma/seed.ts](./prisma/seed.ts)
- Prisma schema: [prisma/schema.prisma](./prisma/schema.prisma)

## Danh sách cải tiến tương lai
- Streaming OpenAI adapter đầy đủ thay vì final chunk fallback.
- Conversation summarization bằng model riêng thay cho heuristic summary local.
- Subject/topic extraction thông minh hơn bằng structured output.
- Saved prompts và study mode templates theo môn học.
- Instructor dashboard và analytics usage theo lớp học.
