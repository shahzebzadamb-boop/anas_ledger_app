"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationEngine } from "@/components/layout/NotificationEngine";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg min-w-0 overflow-x-clip bg-background">
      <main className="px-4 pb-32 pt-4">{children}</main>
      <BottomNav />
      <NotificationEngine />
      <ServiceWorkerRegister />
    </div>
  );
}
