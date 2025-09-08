
"use client";
import * as React from "react";
import QuickLauncher from "@/features/hub/quick-launcher";

export default function QuickHubSandbox() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Sandbox · Tramo 4 — Hub de Introducción Rápida</h1>
      <p className="text-sm text-muted-foreground">
        Pulsa <kbd>⌘K</kbd>/<kbd>Ctrl+K</kbd> o haz clic para abrir el Hub.
      </p>
      <QuickLauncher />
    </div>
  );
}
