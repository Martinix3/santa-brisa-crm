import * as z from "zod";
import { 
    TIPOS_CUENTA as accountTypeOptions,
    OWNERSHIP_OPTIONS as ownershipOptions, 
    type TipoCuenta,
    type Ownership,
} from "@ssot";


// ✅ Esquema base (el estado de la cuenta NO se edita; se calculará después por interacciones/pedidos)
export const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  cif: z.string().optional().nullable(),
  type: z.enum(accountTypeOptions.map(o => o.value) as [TipoCuenta, ...TipoCuenta[]]),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ownership: z.enum(ownershipOptions.map(o => o.value) as [Ownership, ...Ownership[]]),
  distributorId: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if (val.ownership === "distribuidor" && !val.distributorId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona un distribuidor", path: ["distributorId"] });
  }
});

export type AccountFormValues = z.infer<typeof accountSchema>;

// Normalización para joins por nombre / búsqueda
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
