import { Component, type ReactNode } from 'react'

interface State {
  hasError: boolean
  error?: Error
}

interface Props {
  children: ReactNode
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-app-bg">
          <div className="bg-app-surface border border-border rounded-[14px] p-8 max-w-md w-full text-center shadow-lg">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-400 text-xl font-bold">!</span>
            </div>
            <h2 className="text-base font-bold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-muted mb-1">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p className="text-xs text-text-hint mb-6">
              Your data is safe. Reload the page to continue.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-lg bg-[#1c1917] dark:bg-[#2a2d4a] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Reload page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-5 py-2 rounded-lg border border-border text-text-muted text-sm hover:bg-app-bg transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
