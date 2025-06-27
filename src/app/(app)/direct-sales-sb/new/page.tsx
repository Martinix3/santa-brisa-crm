
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Briefcase, Loader2 } from "lucide-react";
import { useDirectSaleWizard } from "@/hooks/use-direct-sale-wizard";

// Step Components
import { StepClient } from "@/components/app/direct-sale-form/step-client";
import { StepDetails } from "@/components/app/direct-sale-form/step-details";
import { StepVerify } from "@/components/app/direct-sale-form/step-verify";

export default function NewDirectSalePage() {
  const wizard = useDirectSaleWizard();
  const { form, step, isSubmitting, isLoading } = wizard;

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Cargando datos para el formulario...</p>
        </div>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case "client":
        return (
          <motion.div key="client" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepClient {...wizard} />
          </motion.div>
        );
      case "details":
        return (
          <motion.div key="details" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepDetails {...wizard} />
          </motion.div>
        );
       case "verify":
        return (
          <motion.div key="verify" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepVerify {...wizard} />
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <Briefcase className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Registrar Nueva Venta Directa</h1>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(wizard.onSubmit)}>
          <Card className="max-w-4xl mx-auto shadow-lg mt-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </Card>
        </form>
      </Form>
    </div>
  );
}
