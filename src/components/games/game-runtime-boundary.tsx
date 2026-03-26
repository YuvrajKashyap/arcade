"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type GameRuntimeBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type GameRuntimeBoundaryState = {
  hasError: boolean;
};

export class GameRuntimeBoundary extends Component<
  GameRuntimeBoundaryProps,
  GameRuntimeBoundaryState
> {
  public state: GameRuntimeBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Game runtime error", error, errorInfo);
  }

  public componentDidUpdate(previousProps: GameRuntimeBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] border border-line-strong bg-background-strong px-6 py-10 text-center text-sm leading-7 text-foreground-soft">
          This game hit a runtime error. Refresh the page or switch back to the library.
        </div>
      );
    }

    return this.props.children;
  }
}
