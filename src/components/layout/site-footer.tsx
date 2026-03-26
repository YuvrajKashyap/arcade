import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-foreground-soft sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <p className="font-semibold text-foreground">{siteConfig.name}</p>
          <p className="mt-2 leading-7">
            A living browser arcade and product-grade portfolio system built by{" "}
            {siteConfig.creator}.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <Link href="/library" className="hover:text-foreground">
            Library
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
