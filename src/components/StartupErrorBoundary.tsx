import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface StartupErrorBoundaryProps {
  children: ReactNode;
}

interface StartupErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class StartupErrorBoundary extends Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  constructor(props: StartupErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Beklenmeyen bir açılış hatası oluştu.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[StartupErrorBoundary] Uygulama render hatası yakalandı:', error, info);
  }

  private handleSafeRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleSafeReload = () => {
    try {
      window.location.reload();
    } catch {
      this.handleSafeRetry();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#181F29] px-5 text-center text-slate-100">
        <div className="w-full max-w-md rounded-[20px] border border-[#334155] bg-[#222B38] p-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#B86B5E]/50 bg-[#181F29] text-[#B86B5E]">
            <AlertCircle className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h1 className="text-base font-bold text-slate-100">
            Açılış Koruması Devreye Girdi
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Cihazınızda geçici bir açılış hatası algılandı. Kayıtlı verileriniz korunarak oyunu
            yeniden başlatabilirsiniz.
          </p>
          {this.state.errorMessage && (
            <p className="mt-3 rounded-[12px] border border-[#334155] bg-[#181F29] px-3 py-2 font-mono text-[10px] text-slate-400 break-words">
              {this.state.errorMessage}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleSafeRetry}
              className="min-h-[40px] rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
            >
              Oyunu Tekrar Aç
            </button>
            <button
              type="button"
              onClick={this.handleSafeReload}
              className="min-h-[40px] rounded-[14px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-200 hover:bg-[#2A3444]"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }
}
