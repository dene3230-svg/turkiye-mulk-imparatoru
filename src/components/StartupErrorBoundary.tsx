import { Component, type ErrorInfo, type ReactNode } from 'react';

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
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080E1C] px-5 text-center text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-700/90 bg-slate-900/95 p-5 shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xl font-black">
            !
          </div>
          <h1 className="text-base font-extrabold text-white">
            Açılış Koruması Devreye Girdi
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Cihazınızda geçici bir açılış hatası algılandı. Kayıtlı verileriniz korunarak oyunu
            yeniden başlatabilirsiniz.
          </p>
          {this.state.errorMessage && (
            <p className="mt-2 rounded-lg bg-slate-950/80 px-2.5 py-1.5 font-mono text-[10px] text-slate-400 break-words">
              {this.state.errorMessage}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleSafeRetry}
              className="min-h-[40px] rounded-xl bg-amber-400 px-4 text-xs font-black text-slate-950 hover:bg-amber-300"
            >
              Oyunu Tekrar Aç
            </button>
            <button
              type="button"
              onClick={this.handleSafeReload}
              className="min-h-[40px] rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }
}
