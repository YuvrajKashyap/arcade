import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="surface-panel w-full rounded-[2rem] px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-accent">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          That game cabinet does not exist.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-foreground-soft sm:text-lg">
          The requested route is missing or the game has not been published yet. Return to the
          arcade to browse the live catalog.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href="/" variant="primary">
            Return to Home
          </ButtonLink>
          <Link
            href="/#all-games"
            className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-medium text-foreground hover:border-line-strong hover:bg-surface-strong"
          >
            Browse All Games
          </Link>
        </div>
      </section>
    </div>
  );
}
