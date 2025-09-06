
import * as z from "zod";
import { nextActionTypeList } from "@/lib/data";

export const interactionFormSchema = z.object({
  // Step 1: Client Info (internal)
  isNewClient: z.boolean().default(false),
  accountId: z.string().optional(),
  clientName: z.string().optional(),
  distributorId: z.string().optional(),

  // Step 2: Outcome
  outcome: z.enum(['Visita', 'Llamada', 'Email', 'Seguimiento', 'Pedido', 'Otro']),
  notes: z.string().optional(),
  nextActionDate: z.date().optional(),
  
  // Step 3: Pedido
  unidades: z.coerce.number().positive().optional(),
  precioUnitario: z.coerce.number().positive().optional(),

}).superRefine((data, ctx) => {
  if (data.outcome === "Pedido") {
    if (!data.unidades) {
      ctx.addIssue({ path: ["unidades"], message: "Las unidades son obligatorias." });
    }
    if (!data.precioUnitario) {
      ctx.addIssue({ path: ["precioUnitario"], message: "El precio es obligatorio." });
    }
  }
});

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;
