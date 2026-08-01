import { Component, type ErrorInfo, type ReactNode } from "react";
import { BrandMark } from "../components/ui/BrandMark";
import { Button } from "../components/ui/Button";

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("KJVenture recovered from a render error.", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-shell completion-screen">
        <section className="completion-card" role="alert">
          <BrandMark large />
          <span className="eyebrow">Recoverable error</span>
          <h1>KJVenture could not open this screen.</h1>
          <p>Your locally saved session has not been deleted.</p>
          <Button onClick={() => window.location.assign("/")}>Return to Library</Button>
        </section>
      </main>
    );
  }
}
