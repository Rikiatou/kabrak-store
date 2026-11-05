import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error.message, { stack: `${error.stack || ''}\n\nComponent stack:${info.componentStack || ''}` });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const fr = localStorage.getItem('kabrak_lang') !== 'en';
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6 text-center space-y-4">
          <img src="/logo.png" alt="KABRAK Store" className="h-10 mx-auto" />
          <h1 className="text-lg font-bold">{fr ? 'Oups, un problème est survenu' : 'Oops, something went wrong'}</h1>
          <p className="text-sm text-gray-500">
            {fr
              ? "L'erreur a été envoyée automatiquement à l'équipe KABRAK. Rechargez la page pour continuer."
              : 'The error was sent automatically to the KABRAK team. Reload the page to continue.'}
          </p>
          <button
            onClick={() => { window.location.href = '/dashboard'; }}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold"
          >
            {fr ? 'Recharger' : 'Reload'}
          </button>
        </div>
      </div>
    );
  }
}
