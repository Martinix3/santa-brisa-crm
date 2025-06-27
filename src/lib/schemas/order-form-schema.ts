
import * as z from "zod";
import { accountTypeList, canalOrigenColocacionList, clientTypeList, failureReasonList, nextActionTypeList, paymentMethodList, provincesSpainList } from "@/lib/data";
import type { PromotionalMaterial } from "@/types";

export const NO_CLAVADISTA_VALUE = "##NONE##";
export const ADMIN_SELF_REGISTER_VALUE = "##ADMIN_SELF##";

export type Step = "client" | "outcome" | "details" | "new_client_data" | "verify";

const assignedMaterialSchema = z.object({
  materialId: z.string().min(1, "Debe seleccionar un material."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1.").optional(),
});

// Base schema object with all fields
const baseOrderFormSchema = z.object({
  outcome: z.enum(["successful", "failed", "follow-up"]).optional(),
  clavadistaId: z.string().optional(),
  selectedSalesRepId: z.string().optional(),
  clavadistaSelectedSalesRepId: z.string().optional(),
  canalOrigenColocacion: z.enum(canalOrigenColocacionList as [string, ...string[]]).optional(),
  paymentMethod: z.enum(paymentMethodList as [string, ...string[]]).optional(),
  iban: z.string().optional(),
  clientType: z.enum(clientTypeList as [string, ...string[]]).optional(),
  numberOfUnits: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  
  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal_street: z.string().optional(),
  direccionFiscal_number: z.string().optional(),
  direccionFiscal_city: z.string().optional(),
  direccionFiscal_province: z.string().optional(),
  direccionFiscal_postalCode: z.string().optional(),
  direccionFiscal_country: z.string().optional(),
  
  sameAsBilling: z.boolean().optional(),
  direccionEntrega_street: z.string().optional(),
  direccionEntrega_number: z.string().optional(),
  direccionEntrega_city: z.string().optional(),
  direccionEntrega_province: z.string().optional(),
  direccionEntrega_postalCode: z.string().optional(),
  direccionEntrega_country: z.string().optional(),
  
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("Formato de correo no válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(),

  nextActionType: z.enum(nextActionTypeList as [string, ...string[]]).optional(),
  nextActionCustom: z.string().optional(),
  nextActionDate: z.date().optional(),
  failureReasonType: z.enum(failureReasonList as [string, ...string[]]).optional(),
  failureReasonCustom: z.string().optional(),
  notes: z.string().optional(),
  assignedMaterials: z.array(assignedMaterialSchema).optional(),
});

// Export the type inferred from the base schema
export type OrderFormValues = z.infer<typeof baseOrderFormSchema>;

// Export a factory function that adds contextual validations
export const createOrderFormSchema = (availableMaterials: PromotionalMaterial[], isNewClient: boolean) => {
  return baseOrderFormSchema.superRefine((data, ctx) => {
    // Validations for 'successful' outcome
    if (data.outcome === 'successful') {
      if (!data.numberOfUnits || data.numberOfUnits <= 0) { ctx.addIssue({ path: ["numberOfUnits"], message: 'Unidades son obligatorias' }); }
      if (!data.unitPrice || data.unitPrice <= 0) { ctx.addIssue({ path: ["unitPrice"], message: 'Precio es obligatorio' }); }
      if (!data.paymentMethod) { ctx.addIssue({ path: ["paymentMethod"], message: "Forma de pago es obligatoria." }); }
      if (data.paymentMethod === 'Giro Bancario' && (!data.iban || !/^[A-Z]{2}[0-9]{2}[0-9A-Z]{1,30}$/.test(data.iban.replace(/\s/g, '')))) {
        ctx.addIssue({ path: ["iban"], message: "IBAN válido es obligatorio para el Giro Bancario." });
      }
    }
    
    // Validations for 'new' client on 'successful' outcome
    if (data.outcome === 'successful' && isNewClient) {
        if (!data.nombreFiscal?.trim()) ctx.addIssue({ path: ["nombreFiscal"], message: "Nombre fiscal es obligatorio." });
        if (!data.cif?.trim()) ctx.addIssue({ path: ["cif"], message: "CIF es obligatorio." });
        if (!data.direccionFiscal_street?.trim()) ctx.addIssue({ path: ["direccionFiscal_street"], message: "Calle es obligatoria." });
        if (!data.direccionFiscal_city?.trim()) ctx.addIssue({ path: ["direccionFiscal_city"], message: "Ciudad es obligatoria." });
        if (!data.direccionFiscal_province?.trim()) ctx.addIssue({ path: ["direccionFiscal_province"], message: "Provincia es obligatoria." });
        if (!data.direccionFiscal_postalCode?.trim()) ctx.addIssue({ path: ["direccionFiscal_postalCode"], message: "Código postal es obligatorio." });
    }

    // Validations for 'follow-up' outcome
    if (data.outcome === 'follow-up') {
      if (!data.nextActionType) {
         ctx.addIssue({ path: ["nextActionType"], message: "La próxima acción es obligatoria." });
      } else if (data.nextActionType === 'Opción personalizada' && (!data.nextActionCustom || data.nextActionCustom.trim() === '')) {
         ctx.addIssue({ path: ["nextActionCustom"], message: "Debe especificar la próxima acción." });
      }
    }
    
    // Validations for 'failed' outcome
    if (data.outcome === 'failed') {
       if (!data.failureReasonType) {
         ctx.addIssue({ path: ["failureReasonType"], message: "El motivo del fallo es obligatorio." });
      } else if (data.failureReasonType === 'Otro (especificar)' && (!data.failureReasonCustom || data.failureReasonCustom.trim() === '')) {
         ctx.addIssue({ path: ["failureReasonCustom"], message: "Debe especificar el motivo del fallo." });
      }
    }

    // Stock validation
    if (data.assignedMaterials) {
        data.assignedMaterials.forEach((item, index) => {
            if (!item.quantity) return; // Skip if quantity is not set
            const material = availableMaterials.find(m => m.id === item.materialId);
            if (material && material.stock < item.quantity) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Stock: ${material.stock}. Pides: ${item.quantity}.`,
                    path: [`assignedMaterials`, index, 'quantity'],
                });
            }
        });
    }
  });
};
