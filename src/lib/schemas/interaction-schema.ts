
import * as z from "zod";
import { nextActionTypeList } from "@/lib/data";

const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1.").optional(),
});

export const interactionFormSchema = z.object({
  // Internal state
  accountId: z.string().optional(),
  clientName: z.string().optional(),
  distributorId: z.string().optional(),

  // Step 1: Outcome
  outcome: z.enum(['Visita', 'Llamada', 'Email', 'Seguimiento', 'Pedido', 'Otro']),
  notes: z.string().optional(),
  
  // For 'Pedido' outcome
  unidades: z.coerce.number().positive().optional(),
  precioUnitario: z.coerce.number().positive().optional(),

  // For all outcomes
  assignedMaterials: z.array(assignedMaterialSchema).optional(),

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
