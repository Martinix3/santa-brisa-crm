
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import type { useSampleRequestWizard } from '@/hooks/use-sample-request-wizard';

type WizardHookReturn = ReturnType<typeof useSampleRequestWizard>;

interface StepVerifyProps extends Pick<WizardHookReturn, 'form' | 'client' | 'handleBack' | 'isSubmitting'> {}

export const StepVerify: React.FC<StepVerifyProps> = ({ form, client, handleBack, isSubmitting }) => {
  const formValues = form.watch();

  return (
    <>
      <CardHeader>
          <CardTitle>Paso 3: Verifica y Confirma la Solicitud</CardTitle>
          <CardDescription>Comprueba que todos los datos son correctos. Puedes volver atrás para editar si es necesario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <Card>
              <CardHeader><CardTitle className="text-lg">Resumen de la Solicitud</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                  <p><strong>Cliente:</strong> {client?.nombre} {client?.id === 'new' && <span className="text-primary font-bold">(Nuevo)</span>}</p>
                  <p><strong>Propósito:</strong> <span className="font-semibold">{formValues.purpose || 'N/D'}</span></p>
                  <p><strong>Cantidad de Muestras:</strong> <span className="font-semibold">{formValues.numberOfSamples || 'N/D'}</span></p>
                  
                  {formValues.isNewClient && (formValues.shippingAddress_street || formValues.shippingAddress_city) && (
                     <div>
                        <strong>Dirección de Envío:</strong>
                        <p className="pl-2">{formValues.shippingAddress_street}, {formValues.shippingAddress_number || 's/n'}</p>
                        <p className="pl-2">{formValues.shippingAddress_postalCode}, {formValues.shippingAddress_city} ({formValues.shippingAddress_province})</p>
                     </div>
                  )}

                  {formValues.justificationNotes && (
                    <p><strong>Justificación:</strong> {formValues.justificationNotes}</p>
                  )}
              </CardContent>
          </Card>
      </CardContent>
      <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
          <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : <><Send className="mr-2 h-4 w-4"/> Confirmar y Enviar Solicitud</>}
          </Button>
      </CardFooter>
    </>
  );
};
