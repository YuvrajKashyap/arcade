import Link from "next/link";
import { GameCard } from "@/components/cards/game-card";
import { GamePlayer } from "@/components/games/game-player";
import { formatReleaseDate } from "@/lib/utils/date";
import type { GamePageData } from "@/types/game";

type GamePageViewProps = {
  data: GamePageData;
};

function createMetaLine(data: GamePageData) {
  return [
    data.game.genre,
    data.game.difficulty,
    data.game.sessionLength,
    formatReleaseDate(data.game.releaseDate),
    data.game.status,
  ].join(" • ");
}

export function GamePageView({ data }: GamePageViewProps) {
  const { game, mobileSupportCopy, relatedGames } = data;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <Link
          href="/#all-games"
          className="text-sm font-medium text-foreground-soft hover:text-foreground"
        >
          Back to library
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.28em] text-accent">
          {createMetaLine(data)}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {game.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-foreground-soft sm:text-lg">
          {game.shortDescription}
        </p>
      </section>

      <section className="surface-panel rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 border-b border-line pb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
              Instant play
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Launch the game in place
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-foreground-soft">
            {game.controls.summary} {mobileSupportCopy}
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-line-strong bg-background-strong p-4 sm:p-5">
          <GamePlayer slug={game.slug} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <section className="surface-panel rounded-[2rem] px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-accent">
            Controls
          </p>
          <ul className="mt-5 space-y-3">
            {game.controls.items.map((item) => (
              <li
                key={item.label}
                className="rounded-[1.35rem] border border-line bg-surface px-4 py-4"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-soft">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{item.action}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-panel rounded-[2rem] px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-accent">
            Details
          </p>
          <p className="mt-5 text-sm leading-8 text-foreground-soft sm:text-base">
            {game.description}
          </p>
          <dl className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-soft">
                Inputs
              </dt>
              <dd className="mt-2 text-sm font-medium text-foreground">
                {game.supports.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-soft">
                Mobile support
              </dt>
              <dd className="mt-2 text-sm font-medium text-foreground">{game.mobileSupport}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-soft">
                Version
              </dt>
              <dd className="mt-2 text-sm font-medium text-foreground">
                {game.version ?? "1.0.0"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-soft">
                Tags
              </dt>
              <dd className="mt-2 text-sm font-medium text-foreground">
                {game.tags.join(", ")}
              </dd>
            </div>
          </dl>
          {game.developerNotes ? (
            <div className="mt-8 rounded-[1.5rem] border border-line bg-surface px-5 py-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-soft">
                Developer notes
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground-soft">
                {game.developerNotes}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {relatedGames.length > 0 ? (
        <section className="pb-2">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-accent">
            Related games
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Keep playing
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {relatedGames.map((relatedGame) => (
              <GameCard key={relatedGame.slug} game={relatedGame} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
