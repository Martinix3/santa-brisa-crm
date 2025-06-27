
import * as z from "zod";
import { sampleRequestPurposeList, provincesSpainList } from "@/lib/data";
import type { SampleRequestPurpose } from "@/types";

export type Step = "client" | "details" | "verify";

export const sampleRequestWizardSchema = z.object({
  isNewClient: z.boolean().default(false),
  requesterId: z.string().optional(),
  
  // From Step 1: Client
  accountId: z.string().optional(),
  clientName: z.string().min(2, "El nombre de la cuenta debe tener al menos 2 caracteres."),

  // From Step 2: Details
  purpose: z.enum(sampleRequestPurposeList as [SampleRequestPurpose, ...SampleRequestPurpose[]], { required_error: "Debe seleccionar un propósito." }),
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
        const shippingFields = [data.shippingAddress_street, data.shippingAddress_city, data.shippingAddress_province, data.shippingAddress_postalCode];
        const someShippingFieldFilled = shippingFields.some(field => field && field.trim() !== "");
        // If user starts filling the address, make some fields mandatory.
        if (someShippingFieldFilled) {
            if (!data.shippingAddress_street?.trim()) ctx.addIssue({ path: ["shippingAddress_street"], message: "Calle es obligatoria si se rellena la dirección." });
            if (!data.shippingAddress_city?.trim()) ctx.addIssue({ path: ["shippingAddress_city"], message: "Ciudad es obligatoria." });
            if (!data.shippingAddress_province?.trim()) ctx.addIssue({ path: ["shippingAddress_province"], message: "Provincia es obligatoria." });
            if (!data.shippingAddress_postalCode?.trim()) ctx.addIssue({ path: ["shippingAddress_postalCode"], message: "Código postal es obligatorio." });
        }
    } else {
        // If existing client, accountId must be present
        if (!data.accountId) {
             ctx.addIssue({ path: ["accountId"], message: "Debe seleccionar una cuenta existente." });
        }
    }
});

export type SampleRequestWizardFormValues = z.infer<typeof sampleRequestWizardSchema>;
