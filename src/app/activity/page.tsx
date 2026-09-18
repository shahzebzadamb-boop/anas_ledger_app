"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ActivityPage() {
  const { state, dispatch } = useLedger();
  const [tab, setTab] = useState<"notifications" | "audit">("notifications");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        subtitle="Due notices and a history of financial changes."
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={tab === "notifications" ? "primary" : "secondary"}
          onClick={() => setTab("notifications")}
        >
          Notifications
        </Button>
        <Button
          variant={tab === "audit" ? "primary" : "secondary"}
          onClick={() => setTab("audit")}
        >
          Audit log
        </Button>
      </div>
      {tab === "notifications"
        ? state.notifications.map((item) => (
            <Card key={item.id} className={cn(!item.isRead && "border-foreground/20")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                  <p className="mt-2 text-xs text-muted">{formatDate(item.createdAt)}</p>
                </div>
                {!item.isRead ? (
                  <Button
                    className="shrink-0 px-3"
                    onClick={() =>
                      dispatch({ type: "MARK_NOTIFICATION_READ", id: item.id })
                    }
                  >
                    Read
                  </Button>
                ) : null}
              </div>
            </Card>
          ))
        : state.auditLogs.map((item) => (
            <Card key={item.id}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {item.action.replace(/_/g, " ")}
              </p>
              <p className="mt-2 text-sm">{item.summary}</p>
              <p className="mt-2 text-xs text-muted">{formatDate(item.createdAt)}</p>
            </Card>
          ))}
    </div>
  );
}
