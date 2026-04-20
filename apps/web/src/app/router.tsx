import type { ReactNode } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LoginPage } from '../features/auth/LoginPage';
import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';
import { useAuthStore } from '../store/auth-store';

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

  return <LoginPage />;
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
    path: '/app',
    element: (
      <AppGate>
        <DashboardPage />
      </AppGate>
    ),
  },
]);
