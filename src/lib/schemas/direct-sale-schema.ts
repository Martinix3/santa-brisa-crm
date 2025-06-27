
"use client";

import * as z from "zod";
import { directSaleChannelList, directSaleStatusList, provincesSpainList } from "@/lib/data";
import type { DirectSaleChannel, DirectSaleStatus } from "@/types";

export type Step = "client" | "details" | "items" | "address" | "verify";

const directSaleItemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1, "El nombre del producto es obligatorio."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1.").optional(),
  netUnitPrice: z.coerce.number().min(0.01, "El precio debe ser positivo.").optional(),
}).superRefine((data, ctx) => {
    if (data.quantity === undefined || data.quantity <= 0) {
        ctx.addIssue({ path: ["quantity"], message: "Cantidad es obligatoria." });
    }
    if (data.netUnitPrice === undefined || data.netUnitPrice <= 0) {
        ctx.addIssue({ path: ["netUnitPrice"], message: "Precio es obligatorio." });
    }
});

export const directSaleWizardSchema = z.object({
  isNewClient: z.boolean().default(false),
  customerId: z.string().optional(),
  customerName: z.string().min(1, "El nombre del cliente es obligatorio."),
  channel: z.enum(directSaleChannelList as [DirectSaleChannel, ...DirectSaleChannel[]], { required_error: "El canal de venta es obligatorio." }),
  items: z.array(directSaleItemSchema).min(1, "Debe añadir al menos un producto a la venta."),
  dueDate: z.date().optional(),
  invoiceNumber: z.string().optional(),
  status: z.enum(directSaleStatusList as [DirectSaleStatus, ...DirectSaleStatus[]]),
  relatedPlacementOrders: z.string().optional(),
  notes: z.string().optional(),
  
  // Fields for new client address
  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal_street: z.string().optional(),
  direccionFiscal_number: z.string().optional(),
  direccionFiscal_city: z.string().optional(),
  direccionFiscal_province: z.string().optional(),
  direccionFiscal_postalCode: z.string().optional(),
  direccionFiscal_country: z.string().optional().default("España"),
  
  sameAsBilling: z.boolean().optional().default(true),
  direccionEntrega_street: z.string().optional(),
  direccionEntrega_number: z.string().optional(),
  direccionEntrega_city: z.string().optional(),
  direccionEntrega_province: z.string().optional(),
  direccionEntrega_postalCode: z.string().optional(),
  direccionEntrega_country: z.string().optional().default("España"),

}).superRefine((data, ctx) => {
    if (data.isNewClient) {
        if (!data.nombreFiscal?.trim()) ctx.addIssue({ path: ["nombreFiscal"], message: "Nombre fiscal es obligatorio." });
        
        if (!data.cif?.trim()) {
            ctx.addIssue({ path: ["cif"], message: "CIF es obligatorio." });
        } else {
            const cifRegex = /^([A-Z]{1}|[0-9]{1})[0-9]{7}[A-Z0-9]{1}$/i;
            if (!cifRegex.test(data.cif)) {
                ctx.addIssue({ path: ["cif"], message: "Formato de CIF/NIF no válido." });
            }
        }

        if (!data.direccionFiscal_street?.trim()) ctx.addIssue({ path: ["direccionFiscal_street"], message: "Calle fiscal es obligatoria." });
        if (!data.direccionFiscal_city?.trim()) ctx.addIssue({ path: ["direccionFiscal_city"], message: "Ciudad fiscal es obligatoria." });
        if (!data.direccionFiscal_province?.trim()) ctx.addIssue({ path: ["direccionFiscal_province"], message: "Provincia fiscal es obligatoria." });
        if (!data.direccionFiscal_postalCode?.trim()) ctx.addIssue({ path: ["direccionFiscal_postalCode"], message: "Código postal fiscal es obligatorio." });
        
        if (!data.sameAsBilling) {
          if (!data.direccionEntrega_street?.trim()) ctx.addIssue({ path: ["direccionEntrega_street"], message: "Calle de entrega es obligatoria." });
          if (!data.direccionEntrega_city?.trim()) ctx.addIssue({ path: ["direccionEntrega_city"], message: "Ciudad de entrega es obligatoria." });
          if (!data.direccionEntrega_province?.trim()) ctx.addIssue({ path: ["direccionEntrega_province"], message: "Provincia de entrega es obligatoria." });
          if (!data.direccionEntrega_postalCode?.trim()) ctx.addIssue({ path: ["direccionEntrega_postalCode"], message: "Código postal de entrega es obligatorio." });
        }
    }
});

export type DirectSaleWizardFormValues = z.infer<typeof directSaleWizardSchema>;
