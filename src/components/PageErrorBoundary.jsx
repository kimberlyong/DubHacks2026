import { Component } from "react";

// If a page throws while rendering, show a way back instead of a blank white
// screen. App keys this by page, so switching pages clears the error.
export default class PageErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <section role="alert" className="py-18">
        <h1 className="text-2xl font-semibold">Something went wrong on this page</h1>
        <p className="mt-2 text-theme-muted">Your documents and plans are still saved. Try going back home.</p>
        <button
          type="button"
          onClick={this.props.onHome}
          className="mt-4 cursor-pointer rounded-lg bg-theme-accent px-4 py-2 text-sm font-medium text-theme-on-accent"
        >
          Back to home
        </button>
        <p className="mt-6 text-xs text-theme-muted">Details: {String(error?.message ?? error)}</p>
      </section>
    );
  }
}
