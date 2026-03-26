"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const isImmersiveRoute =
    pathname === "/" ||
    pathname.startsWith("/design/") ||
    pathname.startsWith("/play-design/") ||
    pathname.startsWith("/games/");

  return (
    <div
      className={`page-grid flex min-h-screen flex-col${isImmersiveRoute ? " page-grid--immersive" : ""}`}
    >
      {isImmersiveRoute ? null : (
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
      )}
      {isImmersiveRoute ? null : <SiteHeader />}
      <main id="content" className="flex flex-1 flex-col">
        {children}
      </main>
      {isImmersiveRoute ? null : <SiteFooter />}
    </div>
  );
}
