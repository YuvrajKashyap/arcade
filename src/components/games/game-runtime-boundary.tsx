"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type GameRuntimeBoundaryProps = {
  children: ReactNode;
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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] border border-red-400/20 bg-[linear-gradient(180deg,rgba(25,11,13,0.98),rgba(62,14,18,0.96))] px-6 py-10 text-center text-sm leading-7 text-red-100/90">
          This game hit a runtime error. Refresh the page or switch back to the library.
        </div>
      );
    }

    return this.props.children;
  }
}
