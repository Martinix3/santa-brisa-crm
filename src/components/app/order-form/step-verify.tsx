import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import FormattedNumericValue from '@/components/lib/formatted-numeric-value';

export const StepVerify = ({ form, client, handleBack, isSubmitting, availableMaterials, teamMember, userRole }) => {
  const formValuesWatched = form.watch();
  const outcomeWatched = formValuesWatched.outcome;
  
  const subtotal = (formValuesWatched.numberOfUnits || 0) * (formValuesWatched.unitPrice || 0);
  const ivaAmount = subtotal * 0.21;
  const totalAmount = subtotal + ivaAmount;

  const canSubmit = !isSubmitting && !!teamMember && !!userRole;

  return (
    <>
      <CardHeader>
          <CardTitle>Paso Final: Verifica y Confirma</CardTitle>
          <CardDescription>Comprueba que todos los datos son correctos. Puedes volver atrás para editar si es necesario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <Card>
              <CardHeader><CardTitle className="text-lg">Resumen de la Interacción</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                  <p><strong>Cliente:</strong> {client?.nombre} {client?.id === 'new' && <span className="text-primary font-bold">(Nuevo)</span>}</p>
                  <p><strong>Resultado:</strong> <span className="font-semibold">{outcomeWatched === 'successful' ? 'Pedido Exitoso' : outcomeWatched === 'follow-up' ? 'Requiere Seguimiento' : 'Visita Fallida'}</span></p>
                  
                  {outcomeWatched === 'successful' && (
                    <>
                      <p><strong>Unidades:</strong> {formValuesWatched.numberOfUnits}</p>
                      <p><strong>Forma de Pago:</strong> {formValuesWatched.paymentMethod} {formValuesWatched.paymentMethod === 'Giro Bancario' && `- ${formValuesWatched.iban}`}</p>
                      <p><strong>Valor Total (IVA incl.):</strong> <FormattedNumericValue value={totalAmount} options={{style: 'currency', currency: 'EUR'}}/></p>
                    </>
                  )}
                  {outcomeWatched === 'follow-up' && (
                    <p><strong>Próxima Acción:</strong> {formValuesWatched.nextActionType || 'N/A'}</p>
                  )}
                  {outcomeWatched === 'failed' && (
                    <p><strong>Motivo Fallo:</strong> {formValuesWatched.failureReasonType || 'N/A'}</p>
                  )}

                  {formValuesWatched.notes && (
                    <p><strong>Notas:</strong> {formValuesWatched.notes}</p>
                  )}

                  {formValuesWatched.assignedMaterials && formValuesWatched.assignedMaterials.length > 0 && (
                    <div>
                      <strong>Materiales Entregados:</strong>
                      <ul className="list-disc pl-5 mt-1">
                        {formValuesWatched.assignedMaterials.map((mat, index) => {
                           const materialInfo = availableMaterials.find(m => m.id === mat.materialId);
                           return <li key={index}>{materialInfo?.name || 'Material desconocido'} - Cantidad: {mat.quantity}</li>
                        })}
                      </ul>
                    </div>
                  )}
              </CardContent>
          </Card>

          {client?.id === 'new' && outcomeWatched === 'successful' && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Datos de la Nueva Cuenta</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                      <p><strong>Nombre Fiscal:</strong> {formValuesWatched.nombreFiscal}</p>
                      <p><strong>CIF:</strong> {formValuesWatched.cif}</p>
                      <p><strong>Dirección Fiscal:</strong> {`${formValuesWatched.direccionFiscal_street || ''}, ${formValuesWatched.direccionFiscal_city || ''}`}</p>
                      <p><strong>Dirección Entrega:</strong> {formValuesWatched.sameAsBilling ? '(Misma que facturación)' : `${formValuesWatched.direccionEntrega_street || ''}, ${formValuesWatched.direccionEntrega_city || ''}`}</p>
                  </CardContent>
              </Card>
          )}
      </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
          <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : <><Send className="mr-2 h-4 w-4"/> Confirmar y Guardar</>}
          </Button>
      </CardFooter>
    </>
  );
};