"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationEngine } from "@/components/layout/NotificationEngine";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const calculator = pathname === "/calculator";
  const home = pathname === "/";

  return (
    <div className={cn("mx-auto min-h-dvh w-full max-w-lg min-w-0", home ? "bg-transparent" : "bg-background")}>
      <main className={calculator ? "min-h-dvh px-0 pb-0 pt-0" : "px-4 pb-32 pt-4"}>{children}</main>
      {calculator ? null : <BottomNav />}
      {calculator ? null : <NotificationEngine />}
      <ServiceWorkerRegister />
    </div>
  );
}
