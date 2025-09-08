

import * as z from "zod";
import { 
    TIPOS_INTERACCION_VALUES,
    RESULTADOS_INTERACCION_VALUES,
} from "@ssot";
import { OWNERSHIP_VALUES } from "./account-schema";

export const interactionSchema = z.object({
  // Puede ser un ID existente o un nombre nuevo
  accountId: z.string().optional(),
  accountName: z.string().optional().default(""), // Default to empty string to avoid undefined issues
  
  // Hint de ownership para creación implícita
  ownershipHint: z.enum(OWNERSHIP_VALUES).default("propio"),

  type: z.enum(TIPOS_INTERACCION_VALUES),
  date: z.coerce.date().default(() => new Date()),
  outcome: z.enum(RESULTADOS_INTERACCION_VALUES).optional().nullable(),
  note: z.string().optional().nullable(),
  nextActionAt: z.coerce.date().optional().nullable(), // próxima cita/recordatorio
  originatingTaskId: z.string().optional().nullable(), // si viene de una tarea programada
}).superRefine((data, ctx) => {
  if (!data.accountId && !data.accountName) {
    ctx.addIssue({
      path: ["accountName"],
      message: "Se requiere el nombre de la cuenta o un ID de cuenta.",
      code: z.ZodIssueCode.custom,
    });
  }
});

export type InteractionFormValues = z.infer<typeof interactionSchema>;
