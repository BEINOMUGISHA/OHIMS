/**
 * src/components/ui/ErrorBoundary.tsx
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — React Error Boundary.
 * Wraps each dashboard root so uncaught render errors show a
 * friendly "Something went wrong — Reload" card instead of a
 * white-screen crash.
 * ─────────────────────────────────────────────────────────────
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback — if provided, replaces the default error card */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Section name shown in the error card (e.g. "Member Dashboard") */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback, section } = this.props;

    if (!hasError) return children;

    // Custom fallback
    if (fallback && error) {
      return fallback(error, this.handleReset);
    }

    // Default error card
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-800/40 shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-900/30 mb-5 mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h2>

          {/* Message */}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {section
              ? `The ${section} encountered an unexpected error. `
              : 'An unexpected error occurred. '}
            You can try reloading the page or resetting this section.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
            >
              Reset Section
            </button>
          </div>

          {/* Collapsible error details (dev aid) */}
          {error && (
            <div className="mt-5 text-left">
              <button
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1 transition-colors"
              >
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showDetails ? 'Hide' : 'Show'} error details
              </button>
              {showDetails && (
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-[10px] text-red-600 dark:text-red-400 overflow-auto max-h-40 leading-relaxed font-mono">
                  {error.message}
                  {errorInfo?.componentStack && `\n\n${errorInfo.componentStack}`}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
