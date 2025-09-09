
import * as z from "zod";
import { TIPOS_CUENTA_VALUES, type TipoCuenta } from "@ssot";

export const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "El nombre es obligatorio"),
  accountType: z.custom<TipoCuenta>(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  salesRepId: z.string().optional().nullable(),
  mainContactName: z.string().optional().nullable(),
  mainContactEmail: z.string().email("Email no válido").optional().or(z.literal("")).nullable(),
  mainContactPhone: z.string().optional().nullable(),
  distributorId: z.string().optional().nullable(),
  parentAccountId: z.string().optional().nullable(),
  addressBilling: z.string().optional().nullable(),
  addressShipping: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export function toSearchName(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "_");
}
