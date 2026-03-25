import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/utils/cn";

type ButtonLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: "primary" | "secondary";
  };

export function ButtonLink({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold",
        variant === "primary" &&
          "bg-accent text-background shadow-[0_14px_30px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:bg-accent-strong",
        variant === "secondary" &&
          "border border-line bg-surface text-foreground hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-strong",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
