"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApartmentsSettings } from "@/components/settings/ApartmentsSettings";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Add and manage apartments"
        actions={
          <Button variant="primary" className="px-4" onClick={() => setAddOpen(true)}>
            + Add Property
          </Button>
        }
      />
      <ApartmentsSettings addOpen={addOpen} onAddOpenChange={setAddOpen} />
    </div>
  );
}
