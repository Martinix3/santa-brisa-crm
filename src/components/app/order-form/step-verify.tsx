"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import type { useOrderWizard } from "@/hooks/use-order-form-wizard";

type WizardHookReturn = ReturnType<typeof useOrderWizard>;
type StepVerifyProps  = Pick<
  WizardHookReturn,
  "form" | "client" | "handleBack" | "isSubmitting" | "availableMaterials" | "teamMember" | "userRole"
>;

export const StepVerify: React.FC<StepVerifyProps> = ({
  form, client, handleBack, isSubmitting, availableMaterials, teamMember, userRole
}) => {
  const v          = form.watch();
  const isSuccess  = v.outcome === "successful";
  const isFollowUp = v.outcome === "follow-up";

  const subtotal   = (v.numberOfUnits || 0) * (v.unitPrice || 0);
  const total      = subtotal * 1.21;

  // ✅ usa el estado interno de RHF – no dependas de props externas
  const canSubmit = !form.formState.isSubmitting && !!teamMember && !!userRole;

  return (
    <>
      <CardHeader>
        <CardTitle>Paso Final: Verifica y Confirma</CardTitle>
        <CardDescription>Revisa los datos antes de guardar.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* RESUMEN */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen de la Interacción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Cliente:</strong> {client?.nombre}{client?.id === "new" && <> <span className="text-primary font-bold">(Nuevo)</span></>}</p>
            <p><strong>Resultado:</strong>{" "}
              <span className="font-semibold">
                {isSuccess ? "Pedido Exitoso" : isFollowUp ? "Requiere Seguimiento" : "Visita Fallida"}
              </span>
            </p>

            {isSuccess && (
              <>
                <p><strong>Unidades:</strong> {v.numberOfUnits}</p>
                <p><strong>Forma de Pago:</strong> {v.paymentMethod}{v.paymentMethod === "Giro Bancario" && ` – ${v.iban}`}</p>
                <p><strong>Valor Total (IVA incl.):</strong>{" "}
                  <FormattedNumericValue value={total} options={{ style: "currency", currency: "EUR" }} />
                </p>
              </>
            )}

            {isFollowUp && <p><strong>Próxima Acción:</strong> {v.nextActionType}</p>}
            {v.outcome === "failed" && <p><strong>Motivo:</strong> {v.failureReasonType}</p>}
            {v.notes && <p><strong>Notas:</strong> {v.notes}</p>}

            {v.assignedMaterials?.length > 0 && (
              <div>
                <strong>Materiales Entregados:</strong>
                <ul className="list-disc pl-5 mt-1">
                  {v.assignedMaterials.map((m, i) => {
                    const info = availableMaterials.find(x => x.id === m.materialId);
                    return <li key={i}>{info?.name ?? "Material"} – {m.quantity}</li>;
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DATOS NUEVA CUENTA */}
        {client?.id === "new" && isSuccess && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Datos de la Nueva Cuenta</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Nombre Fiscal:</strong> {v.nombreFiscal}</p>
              <p><strong>CIF:</strong> {v.cif}</p>
              <p><strong>Dirección Fiscal:</strong> {`${v.direccionFiscal_street}, ${v.direccionFiscal_city}`}</p>
              <p><strong>Dirección Entrega:</strong>{" "}
                {v.sameAsBilling ? "(Misma que facturación)" : `${v.direccionEntrega_street}, ${v.direccionEntrega_city}`}
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>

        {/* 🔑 botón submit real */}
        <Button type="submit" disabled={!canSubmit}>
          {form.formState.isSubmitting
            ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>)
            : (<><Send className="mr-2 h-4 w-4" /> Confirmar y Guardar</>)}
        </Button>
      </CardFooter>
    </>
  );
};
