import * as z from "zod";
import { 
    TIPOS_INTERACCION_VALUES,
    RESULTADOS_INTERACCION_VALUES,
    type TipoInteraccion,
    type ResultadoInteraccion
} from "@ssot";
import { OWNERSHIP_VALUES, type Ownership } from "./account-schema";

export const interactionSchema = z.object({
  // Puede ser un ID existente o un nombre nuevo
  accountId: z.string().optional(),
  accountName: z.string().min(2, "El nombre de la cuenta es obligatorio."),
  
  // Hint de ownership para creación implícita
  ownershipHint: z.enum(OWNERSHIP_VALUES as [Ownership, ...Ownership[]]).default("propio"),

  type: z.enum(TIPOS_INTERACCION_VALUES as [TipoInteraccion, ...TipoInteraccion[]]),
  date: z.coerce.date().default(() => new Date()),
  outcome: z.enum(RESULTADOS_INTERACCION_VALUES as [ResultadoInteraccion, ...ResultadoInteraccion[]]).optional().nullable(),
  note: z.string().optional().nullable(),
  nextActionAt: z.coerce.date().optional().nullable(), // próxima cita/recordatorio
  originatingTaskId: z.string().optional().nullable(), // si viene de una tarea programada
});

export type InteractionFormValues = z.infer<typeof interactionSchema>;
