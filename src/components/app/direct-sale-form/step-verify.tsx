
"use client";

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';
import type { useDirectSaleWizard } from '@/hooks/use-direct-sale-wizard';
import type { Account, AddressDetails } from '@/types';

type WizardHookReturn = ReturnType<typeof useDirectSaleWizard>;

interface StepVerifyProps extends Pick<WizardHookReturn, 'form' | 'client' | 'handleBack' | 'isSubmitting' | 'totalAmount'> {}

const formatAddressForDisplay = (address?: AddressDetails): string => {
  if (!address) return "No especificada";
  const parts = [
    (address.street ? `${address.street}${address.number ? `, ${address.number}` : ''}` : null),
    address.city,
    address.province,
    address.postalCode,
  ].filter(Boolean); 
  if (parts.length === 0) return 'No especificada';
  return parts.join(', ');
};

export const StepVerify: React.FC<StepVerifyProps> = ({ form, client, handleBack, isSubmitting, totalAmount }) => {
  const formValues = form.watch();

  const isNewClient = client?.id === 'new';
  const existingClient = isNewClient ? null : client as Account | null;

  return (
    <>
      <CardHeader>
          <CardTitle>Paso Final: Verifica y Confirma la Venta</CardTitle>
          <CardDescription>Comprueba que todos los datos son correctos. Puedes volver atrás para editar si es necesario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <Card>
              <CardHeader><CardTitle className="text-lg">Resumen de la Venta</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                  <p><strong>Cliente:</strong> {client?.nombre} {isNewClient && <span className="text-primary font-bold">(Nuevo)</span>}</p>
                  <p><strong>Canal de Venta:</strong> <span className="font-semibold">{formValues.channel || 'N/D'}</span></p>
                  <p><strong>Estado:</strong> <span className="font-semibold">{formValues.status}</span></p>

                  <div className="pt-2">
                    <h4 className="font-semibold">Artículos:</h4>
                    <ul className="list-disc pl-5 mt-1">
                        {formValues.items.map((item, index) => (
                            <li key={index}>
                                {item.productName}: {item.quantity} x <FormattedNumericValue value={item.netUnitPrice} options={{style: 'currency', currency: 'EUR'}} />
                            </li>
                        ))}
                    </ul>
                  </div>

                  <p className="font-bold pt-2"><strong>Total (IVA incl.):</strong> <FormattedNumericValue value={totalAmount} options={{style: 'currency', currency: 'EUR'}}/></p>
                  {formValues.notes && <p><strong>Notas:</strong> {formValues.notes}</p>}
              </CardContent>
          </Card>
          
          {isNewClient && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Datos de la Nueva Cuenta</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Nombre Fiscal:</strong> {formValues.nombreFiscal}</p>
                <p><strong>CIF:</strong> {formValues.cif}</p>
                <p><strong>Dirección Fiscal:</strong> {`${formValues.direccionFiscal_street || ''}, ${formValues.direccionFiscal_city || ''}`}</p>
                <p><strong>Dirección Entrega:</strong> {formValues.sameAsBilling ? '(Misma que facturación)' : `${formValues.direccionEntrega_street || ''}, ${formValues.direccionEntrega_city || ''}`}</p>
              </CardContent>
            </Card>
          )}

          {!isNewClient && existingClient && (
             <Card>
              <CardHeader><CardTitle className="text-lg">Datos de Envío y Facturación</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Dirección de Envío:</strong> {formatAddressForDisplay(existingClient.addressShipping)}</p>
                <p><strong>Dirección Fiscal:</strong> {formatAddressForDisplay(existingClient.addressBilling)}</p>
              </CardContent>
            </Card>
          )}
      </CardContent>
      <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
          <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Send className="mr-2 h-4 w-4"/> Confirmar y Guardar</>}
          </Button>
      </CardFooter>
    </>
  );
};
