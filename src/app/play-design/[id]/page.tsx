import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { playDesignComponents } from "@/components/play-designs/play-design-component-registry";
import {
  playDesignCatalog,
  getPlayDesignById,
} from "@/lib/play-designs/catalog";

export function generateStaticParams() {
  return playDesignCatalog.map((d) => ({ id: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const design = getPlayDesignById(id);
  if (!design) return {};
  return { title: `Play Design ${id}: ${design.name}` };
}

export default async function PlayDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const Component = playDesignComponents[id];
  if (!Component) notFound();

  return <Component />;
}
