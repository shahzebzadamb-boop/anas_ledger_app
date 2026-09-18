"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background">
      <main className="px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}