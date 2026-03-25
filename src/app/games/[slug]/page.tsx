import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePageView } from "@/components/games/game-page-view";
import { getGamePageData, getPublishedGameBySlug, getPublishedGameSlugs } from "@/lib/games/catalog";
import { resolveSiteUrl } from "@/lib/constants/site";

type GamePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getPublishedGameSlugs();
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = getPublishedGameBySlug(slug);

  if (!game) {
    return {
      title: "Game not found",
    };
  }

  return {
    title: game.title,
    description: game.shortDescription,
    alternates: {
      canonical: `/games/${game.slug}`,
    },
    openGraph: {
      title: `${game.title} | games.yuvrajkashyap.com`,
      description: game.shortDescription,
      url: `${resolveSiteUrl()}/games/${game.slug}`,
      images: [
        {
          url: `${resolveSiteUrl()}${game.thumbnail}`,
          width: 1200,
          height: 800,
        },
      ],
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const data = getGamePageData(slug);

  if (!data) {
    notFound();
  }

  return <GamePageView data={data} />;
}
