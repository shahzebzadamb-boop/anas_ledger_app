import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  className,
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-foreground text-white",
        variant === "secondary" && "border border-border bg-surface text-foreground",
        variant === "ghost" && "bg-transparent text-foreground",
        variant === "danger" && "bg-danger text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
