import type { MetadataRoute } from "next";
import { getPublishedGames } from "@/lib/games/catalog";
import { resolveSiteUrl } from "@/lib/constants/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = resolveSiteUrl();
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  return routes.concat(
    getPublishedGames().map((game) => ({
      url: `${baseUrl}/games/${game.slug}`,
      lastModified: `${game.releaseDate}T00:00:00.000Z`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );
}
