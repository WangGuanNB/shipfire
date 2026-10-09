"use client";

import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { useAppContext } from "@/contexts/app";
import { cn } from "@/lib/utils";

export default function HeaderCredits({ className }: { className?: string }) {
  const { user } = useAppContext();

  if (!user) {
    return null;
  }

  const leftCredits = user.credits?.left_credits ?? 0;

  return (
    <Link
      href="/my-credits"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70",
        className
      )}
      aria-label={`${leftCredits} credits remaining`}
    >
      <Icon name="RiFlashlightLine" className="size-4 text-amber-400" />
      <span>{leftCredits}</span>
    </Link>
  );
}
