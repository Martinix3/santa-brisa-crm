import * as z from "zod";
import { TIPOS_CUENTA_VALUES, type TipoCuenta } from "@ssot";

export const AccountStage = z.enum([
  "Prospect","Qualified","Negotiation","Won","Lost","Paused"
]);
export type AccountStage = z.infer<typeof AccountStage>;

export const AddressSchema = z.object({
  street: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  zip: z.string().trim().optional().nullable(),
}).partial();

export const AccountSchema = z.object({
  id: z.string().optional(),             // no se persiste, sólo lectura
  name: z.string().min(2).max(200).trim(),
  type: z.custom<TipoCuenta>((v) => TIPOS_CUENTA_VALUES.includes(v as any), "TipoCuenta inválido"),
  stage: AccountStage.default("Prospect"),
  searchName: z.string().default(""),
  tags: z.array(z.string()).default([]),

  // relación
  ownerId: z.string().optional().nullable(),

  // contacto mínimo
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),

  // dirección
  address: AddressSchema.default({}),

  // derivados / métricas
  firstOrderAt: z.date().optional().nullable(),
  lastOrderAt: z.date().optional().nullable(),
  ordersCount: z.number().int().nonnegative().default(0),
  lifetimeValue: z.number().nonnegative().default(0),

  // timestamps
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AccountFormValues = z.infer<typeof AccountSchema>;

// Helpers
export const toSearchName = (s: string) =>
  s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
