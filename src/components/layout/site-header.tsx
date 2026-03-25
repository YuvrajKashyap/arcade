"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigationLinks } from "@/lib/constants/site";
import { cn } from "@/lib/utils/cn";

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-full border border-line bg-white/80 px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-foreground hover:-translate-y-0.5 hover:border-line-strong hover:bg-white"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-xs text-white group-hover:bg-accent">
            GY
          </span>
          games.yuvrajkashyap.com
        </Link>

        <button
          type="button"
          className="inline-flex rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-foreground lg:hidden"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
        >
          Menu
        </button>

        <nav className="hidden items-center gap-2 lg:flex">
          {navigationLinks.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href.split("#")[0]);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-foreground-soft hover:bg-white/70 hover:text-foreground",
                  isActive && "bg-white text-foreground shadow-sm",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {isMenuOpen ? (
        <nav
          id="mobile-nav"
          className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 pb-4 sm:px-6 lg:hidden lg:px-8"
        >
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-line bg-white/75 px-4 py-3 text-sm font-medium text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
