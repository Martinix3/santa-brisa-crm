import * as z from "zod";
import { 
    interactionTypeOptions, 
    interactionOutcomeOptions,
    type InteractionType,
    type InteractionOutcome
} from "@ssot";

export const interactionSchema = z.object({
  accountId: z.string().min(1, "Selecciona una cuenta"),
  type: z.enum(interactionTypeOptions.map(o => o.value) as [InteractionType, ...InteractionType[]]),
  date: z.coerce.date().default(() => new Date()),
  outcome: z.enum(interactionOutcomeOptions.map(o => o.value) as [InteractionOutcome, ...InteractionOutcome[]]).optional().nullable(),
  note: z.string().optional().nullable(),
  nextActionAt: z.coerce.date().optional().nullable(), // próxima cita/recordatorio
  originatingTaskId: z.string().optional().nullable(), // si viene de una tarea programada
});

export type InteractionFormValues = z.infer<typeof interactionSchema>;
