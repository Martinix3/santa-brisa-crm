
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import QuickHubDialog from "./quick-hub-dialog";
import { Plus, Zap } from "lucide-react";

export default function QuickLauncher({
  initialAccount,
  defaultMode = "cuenta",
}: {
  initialAccount?: { id: string; name: string } | null;
  defaultMode?: "cuenta" | "interaccion" | "pedido";
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = navigator.platform.toLowerCase().includes("mac") ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Zap className="size-4" /> Acciones rápidas
      </Button>

      <QuickHubDialog
        open={open}
        onOpenChange={setOpen}
        initialAccount={initialAccount ?? null}
        defaultMode={defaultMode}
      />
    </>
  );
}
