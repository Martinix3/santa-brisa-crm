
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendHorizonal, Loader2 } from "lucide-react";
import { useSampleRequestWizard } from "@/hooks/use-sample-request-wizard";
import { StepClient } from "@/components/app/sample-request-form/step-client";
import { StepSampleDetails } from "@/components/app/sample-request-form/step-sample-details";
import { StepVerify } from "@/components/app/sample-request-form/step-verify";
import { useAuth } from "@/contexts/auth-context";

export default function RequestSamplePage() {
  const wizard = useSampleRequestWizard();
  const { userRole } = useAuth();
  const { form, step, isSubmitting, isLoading } = wizard;
  
  if (!userRole || (userRole !== 'Admin' && userRole !== 'SalesRep' && userRole !== 'Clavadista')) {
     return <Card><CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader><CardContent><p>No tienes permiso para ver esta sección.</p></CardContent></Card>
  }
  
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
            <StepSampleDetails {...wizard} />
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
        <SendHorizonal className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Solicitar Muestras de Producto</h1>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(wizard.onSubmit)}>
          <Card className="max-w-3xl mx-auto shadow-lg mt-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </Card>
        </form>
      </Form>
    </div>
  );
}
