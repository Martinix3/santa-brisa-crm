

import * as z from "zod";
import { PROPOSITOS_MUESTRA as sampleRequestPurposeList, PROVINCIAS_ES as provincesSpainList, PropositoMuestra as SampleRequestPurpose } from "@ssot";

export type Step = "client" | "details" | "verify";

export const sampleRequestWizardSchema = z.object({
  isNewClient: z.boolean().default(false),
  requesterId: z.string().optional(),
  
  // From Step 1: Client
  accountId: z.string().optional(),
  clientName: z.string().min(2, "El nombre de la cuenta debe tener al menos 2 caracteres."),

  // From Step 2: Details
  purpose: z.string({ required_error: "Debe seleccionar un propósito." }).min(1, "Debe seleccionar un propósito."),
  numberOfSamples: z.coerce.number().min(1, "Debe solicitar al menos 1 muestra.").max(50, "No se pueden solicitar más de 50 muestras a la vez."),
  justificationNotes: z.string().min(10, "La justificación debe tener al menos 10 caracteres."),
  
  // Address for new clients
  shippingAddress_street: z.string().optional(),
  shippingAddress_number: z.string().optional(),
  shippingAddress_city: z.string().optional(),
  shippingAddress_province: z.string().optional(),
  shippingAddress_postalCode: z.string().optional(),
  shippingAddress_country: z.string().optional().default("España"),
}).superRefine((data, ctx) => {
    if (data.isNewClient) {
      if (!data.shippingAddress_street?.trim()) {
        ctx.addIssue({ code: 'custom', path: ["shippingAddress_street"], message: "La calle es obligatoria para nuevos clientes." });
      }
      if (!data.shippingAddress_city?.trim()) {
        ctx.addIssue({ code: 'custom', path: ["shippingAddress_city"], message: "La ciudad es obligatoria para nuevos clientes." });
      }
      if (!data.shippingAddress_province?.trim()) {
        ctx.addIssue({ code: 'custom', path: ["shippingAddress_province"], message: "La provincia es obligatoria para nuevos clientes." });
      }
      if (!data.shippingAddress_postalCode?.trim()) {
        ctx.addIssue({ code: 'custom', path: ["shippingAddress_postalCode"], message: "El código postal es obligatorio para nuevos clientes." });
      }
    } else {
        // If existing client, accountId must be present
        if (!data.accountId) {
             ctx.addIssue({ code: 'custom', path: ["accountId"], message: "Debe seleccionar una cuenta existente." });
        }
    }
});

export type SampleRequestWizardFormValues = z.infer<typeof sampleRequestWizardSchema>;
