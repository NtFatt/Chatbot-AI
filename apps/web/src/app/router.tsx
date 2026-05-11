import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';
import { useAuthStore } from '../store/auth-store';

const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const PublicArtifactPage = lazy(() =>
  import('../features/public/PublicArtifactPage').then((module) => ({ default: module.PublicArtifactPage })),
);
const AiLabPage = lazy(() =>
  import('../features/ai-lab/AiLabPage').then((module) => ({ default: module.AiLabPage })),
);

const RouteLoader = ({ title, description }: { title: string; description?: string }) => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="glass-panel w-full max-w-lg p-10 text-center">
      <p className="font-display text-3xl font-semibold">{title}</p>
      {description ? <p className="mt-4 text-sm text-ink/70 dark:text-slate-300">{description}</p> : null}
    </div>
  </div>
);

const renderLazyRoute = (element: ReactNode, title: string, description?: string) => (
  <Suspense fallback={<RouteLoader description={description} title={title} />}>{element}</Suspense>
);

const AppGate = ({ children }: { children: ReactNode }) => {
  const { bootstrapped } = useAuthBootstrap();
  const user = useAuthStore((state) => state.user);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-panel w-full max-w-lg p-10 text-center">
          <p className="font-display text-3xl font-semibold">Đang khởi động không gian học tập...</p>
          <p className="mt-4 text-sm text-ink/70 dark:text-slate-300">
            Hệ thống đang khôi phục phiên học gần nhất và kết nối lại workspace của bạn.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
};

const LoginGate = () => {
  const { bootstrapped } = useAuthBootstrap();
  const user = useAuthStore((state) => state.user);

  if (!bootstrapped) {
    return null;
  }

  if (user) {
    return <Navigate replace to="/app" />;
  }

  return renderLazyRoute(
    <LoginPage />,
    'Đang mở cổng đăng nhập...',
    'Workspace đang chuẩn bị biểu mẫu đăng nhập và khôi phục phiên gần nhất.',
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate replace to="/app" />,
  },
  {
    path: '/login',
    element: <LoginGate />,
  },
  {
    path: '/shared/artifacts/:shareToken',
    element: renderLazyRoute(
      <PublicArtifactPage />,
      'Đang mở artifact được chia sẻ...',
      'Chế độ chỉ đọc đang được chuẩn bị để hiển thị nội dung an toàn.',
    ),
  },
  {
    path: '/app',
    element: (
      <AppGate>
        {renderLazyRoute(
          <DashboardPage />,
          'Đang mở không gian học tập...',
          'Hệ thống đang tải các công cụ chat, artifact workspace, và bối cảnh học tập của bạn.',
        )}
      </AppGate>
    ),
  },
  {
    path: '/app/ai-lab',
    element: (
      <AppGate>
        {renderLazyRoute(
          <AiLabPage />,
          'Đang mở AI lab...',
          'Workspace đang tải dataset manager, eval harness, và model registry.',
        )}
      </AppGate>
    ),
  },
]);
