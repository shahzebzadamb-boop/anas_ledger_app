import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-neutral-100 text-neutral-700",
        tone === "danger" && "bg-red-50 text-danger",
        tone === "warning" && "bg-amber-50 text-warning",
        tone === "success" && "bg-emerald-50 text-success",
      )}
    >
      {children}
    </span>
  );
}
