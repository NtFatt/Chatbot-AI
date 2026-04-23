import { zodResolver } from '@hookform/resolvers/zod';
import { APP_LANGUAGES, MAX_DISPLAY_NAME_CHARS } from '@chatbot-ai/shared';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, GraduationCap, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { loginGuest } from '../../services/auth-service';
import { useAuthStore } from '../../store/auth-store';
import { getTransportErrorInfo } from '../../utils/transport-errors';

const guestLoginSchema = z.object({
  displayName: z.string().trim().min(2).max(MAX_DISPLAY_NAME_CHARS),
  preferredLanguage: z.enum(APP_LANGUAGES),
});

type LoginFormValues = z.infer<typeof guestLoginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(guestLoginSchema),
    defaultValues: {
      displayName: '',
      preferredLanguage: 'bilingual',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await loginGuest(values);
      setSession({
        user: response.user,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      });
      toast.success('Workspace đã sẵn sàng. Chúc bạn học tốt!');
      await navigate('/app');
    } catch (error) {
      const info = getTransportErrorInfo(error, 'Không thể vào workspace lúc này.');
      toast.error(info.message, {
        description: info.description,
      });
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel relative overflow-hidden p-8 sm:p-10 lg:p-14"
          initial={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.55 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(67,212,200,0.28),transparent_32%),radial-gradient(circle_at_80%_22%,rgba(12,109,122,0.22),transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/65 px-4 py-2 text-xs uppercase tracking-[0.16em] text-ink/65 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300">
                <Bot className="h-4 w-4" />
                Chatbot AI học tập / Study copilot
              </div>
              <h1 className="mt-8 max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] text-ink dark:text-white sm:text-6xl">
                Học nhanh hơn, hiểu sâu hơn, và luôn có một trợ lý AI ngay cạnh bạn.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/72 dark:text-slate-300">
                Dành cho sinh viên cần lời giải thích rõ ràng, chat theo thời gian thực và gợi ý tài
                liệu đủ tốt để dùng như một sản phẩm thật.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: GraduationCap,
                  title: 'Trả lời có cấu trúc',
                  body: 'Giải thích ngắn gọn, phân tích chi tiết, ví dụ minh họa và gợi ý học tiếp.',
                },
                {
                  icon: Sparkles,
                  title: 'Phản hồi realtime',
                  body: 'Nhận từng phần câu trả lời ngay khi AI đang sinh nội dung.',
                },
                {
                  icon: Bot,
                  title: 'Nhiều AI provider',
                  body: 'Gemini-first với OpenAI fallback để demo ổn định và dễ mở rộng.',
                },
              ].map((item) => (
                <div
                  className="rounded-[28px] border border-black/8 bg-white/55 p-5 dark:border-white/10 dark:bg-slate-900/40"
                  key={item.title}
                >
                  <item.icon className="h-5 w-5 text-ocean dark:text-cyan" />
                  <p className="mt-4 font-display text-lg font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel flex items-center p-8 sm:p-10"
          initial={{ opacity: 0, x: 24 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="w-full">
            <p className="text-sm uppercase tracking-[0.2em] text-ink/55 dark:text-slate-400">
              Vào nhanh
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">
              Vào workspace trong vài giây để bắt đầu học ngay.
            </h2>
            <p className="mt-4 text-sm leading-7 text-ink/70 dark:text-slate-300">
              Không cần đăng ký đầy đủ cho v1. Hệ thống vẫn cấp token backend và lưu phiên để bạn có
              thể tiếp tục trao đổi sau khi tải lại trang.
            </p>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold">Tên hiển thị / Display name</label>
                <input
                  className="focus-ring w-full rounded-[22px] border border-black/8 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/55"
                  data-testid="guest-login-name"
                  placeholder="Nguyen Lan Anh"
                  {...form.register('displayName')}
                />
                {form.formState.errors.displayName ? (
                  <p className="mt-2 text-xs text-red-500">{form.formState.errors.displayName.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Ngôn ngữ ưu tiên / Preferred language</label>
                <select
                  className="focus-ring w-full rounded-[22px] border border-black/8 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/55"
                  data-testid="guest-login-language"
                  {...form.register('preferredLanguage')}
                >
                  <option value="bilingual">Song ngữ VI-EN / Bilingual</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              <Button
                className="w-full justify-between px-5 py-3.5"
                data-testid="guest-login-submit"
                disabled={form.formState.isSubmitting}
                type="submit"
              >
                <span>{form.formState.isSubmitting ? 'Đang chuẩn bị workspace...' : 'Bắt đầu học / Enter workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
