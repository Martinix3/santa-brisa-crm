import * as React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormValues } from '@/lib/schemas/order-form-schema';
import type { Account } from '@/types';

interface StepOutcomeProps {
    form: UseFormReturn<OrderFormValues>;
    client: Account | { id: 'new'; nombre: string } | null;
    setStep: (step: 'client' | 'outcome' | 'details' | 'verify') => void;
    handleBack: () => void;
}

export const StepOutcome: React.FC<StepOutcomeProps> = ({ form, client, setStep, handleBack }) => (
  <>
    <CardHeader>
      <CardTitle>Paso 2: ¿Cuál fue el resultado para "{client?.nombre}"?</CardTitle>
      <CardDescription>Selecciona el resultado de la interacción para continuar.</CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-1 gap-4">
        <Button type="button" variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "successful"); setStep("details"); }}>Pedido Exitoso</Button>
        <Button type="button" variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "follow-up"); setStep("details"); }}>Requiere Seguimiento</Button>
        <Button type="button" variant="outline" className="w-full h-16 text-lg" onClick={() => { form.setValue("outcome", "failed"); setStep("details"); }}>Visita Fallida / Sin Pedido</Button>
    </CardContent>
    <CardFooter>
        <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
    </CardFooter>
  </>
);
