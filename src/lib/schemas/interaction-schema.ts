
import * as z from "zod";
import { 
    TIPOS_INTERACCION_VALUES,
    RESULTADOS_INTERACCION_VALUES,
    OWNERSHIP_VALUES,
} from "@ssot";

export const interactionSchema = z.object({
  accountId: z.string().optional(),
  accountName: z.string().optional().default(""),
  
  ownershipHint: z.enum(OWNERSHIP_VALUES).default("propio"),

  type: z.enum(TIPOS_INTERACCION_VALUES),
  date: z.coerce.date().default(() => new Date()),
  outcome: z.enum(RESULTADOS_INTERACCION_VALUES).optional().nullable(),
  note: z.string().optional().nullable(),
  nextActionAt: z.coerce.date().optional().nullable(),
  originatingTaskId: z.string().optional().nullable(),
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
