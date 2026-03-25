"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="surface-panel w-full rounded-[2rem] px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-accent">
          Something broke
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          The arcade shell hit an unexpected error.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
          Refresh the route or retry the render. Game-specific failures are isolated separately, so
          this page should only appear for broader application issues.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-foreground/90"
        >
          Retry render
        </button>
      </section>
    </div>
  );
}
