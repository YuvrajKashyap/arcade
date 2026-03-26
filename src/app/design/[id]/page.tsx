import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { designComponents } from "@/components/designs/design-component-registry";
import { designCatalog, getDesignById } from "@/lib/designs/catalog";

export function generateStaticParams() {
  return designCatalog.map((design) => ({ id: design.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const design = getDesignById(id);
  if (!design) return {};
  return { title: `Design ${id}: ${design.name}` };
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const Component = designComponents[id];
  if (!Component) notFound();

  return <Component />;
}
