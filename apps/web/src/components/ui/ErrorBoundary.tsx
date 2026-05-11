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
            <button
              className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl border border-ocean/20 bg-ocean/10 px-5 py-2.5 text-sm font-medium text-ocean transition hover:bg-ocean/15 dark:border-cyan/20 dark:bg-cyan/10 dark:text-cyan dark:hover:bg-cyan/15"
              onClick={() => window.location.reload()}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
