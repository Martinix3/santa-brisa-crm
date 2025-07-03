
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FileText } from "lucide-react";
import { useOrderWizard } from "@/hooks/use-order-form-wizard";

// pasos
import { StepClient }       from "@/components/app/order-form/step-client";
import { StepOutcome }      from "@/components/app/order-form/step-outcome";
import { StepDetails }      from "@/components/app/order-form/step-details";
import { StepNewClientData } from "@/components/app/order-form/step-new-client-data";
import { StepVerify }       from "@/components/app/order-form/step-verify";

export default function OrderFormWizardPage() {
  const wizard = useOrderWizard();
  const {
    form, step, client, handleBack, availableMaterials,
    isSubmitting, teamMember, userRole, handleFinalSubmit,
    salesRepsList, clavadistas, materialFields,
    appendMaterial, removeMaterial, debouncedSearchTerm,
    searchTerm, setSearchTerm, filteredAccounts,
    handleClientSelect, setStep
  } = wizard;

  const renderStepContent = () => {
    switch (step) {
      case "client":
        return (
          <motion.div key="client" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepClient
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredAccounts={filteredAccounts}
              handleClientSelect={handleClientSelect}
              debouncedSearchTerm={debouncedSearchTerm}
            />
          </motion.div>
        );

      case "outcome":
        return (
          <motion.div key="outcome" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepOutcome form={form} client={client} setStep={setStep} handleBack={handleBack} />
          </motion.div>
        );

      case "details":
        return (
          <motion.div key="details" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepDetails
              form={form}
              handleBack={handleBack}
              handleNextStep={wizard.handleNextStep}
              availableMaterials={availableMaterials}
              materialFields={materialFields}
              appendMaterial={appendMaterial}
              removeMaterial={removeMaterial}
              userRole={userRole}
              salesRepsList={salesRepsList}
              clavadistas={clavadistas}
            />
          </motion.div>
        );

      case "new_client_data":
        return (
          <motion.div key="new_client_data" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepNewClientData
              form={form}
              client={client}
              handleBack={handleBack}
              handleNextStep={wizard.handleNextStep}
            />
          </motion.div>
        );

      case "verify":
        return (
          <motion.div key="verify" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <StepVerify
              form={form}
              client={client}
              handleBack={handleBack}
              isSubmitting={isSubmitting}
              availableMaterials={availableMaterials}
              teamMember={teamMember}
              userRole={userRole}
              handleFinalSubmit={handleFinalSubmit}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Registrar Interacción</h1>
      </header>
      
      <Form {...form}>
        <Card className="max-w-4xl mx-auto shadow-lg mt-6 overflow-hidden">
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
        </Card>
      </Form>
    </div>
  );
}
