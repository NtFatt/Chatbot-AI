import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-panel max-w-xl p-10 text-center">
            <p className="font-display text-3xl font-semibold text-ink dark:text-white">
              Có lỗi xảy ra trong phiên học này.
            </p>
            <p className="mt-4 text-sm leading-7 text-ink/70 dark:text-slate-300">
              Trang vừa gặp lỗi ngoài dự kiến. Hãy tải lại để tiếp tục học tập, hoặc mở lại workspace
              nếu bạn đang ở giữa buổi trao đổi.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
