
"use client";

import * as z from "zod";
import { directSaleChannelList, directSaleStatusList } from "@/lib/data";
import type { DirectSaleChannel, DirectSaleStatus } from "@/types";

export type Step = "client" | "details" | "items" | "optional" | "verify";

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
  customerId: z.string().optional(),
  customerName: z.string().min(1, "El nombre del cliente es obligatorio."),
  channel: z.enum(directSaleChannelList as [DirectSaleChannel, ...DirectSaleChannel[]], { required_error: "El canal de venta es obligatorio." }),
  items: z.array(directSaleItemSchema).min(1, "Debe añadir al menos un producto a la venta."),
  issueDate: z.date({ required_error: "La fecha de emisión es obligatoria." }),
  dueDate: z.date().optional(),
  invoiceNumber: z.string().optional(),
  status: z.enum(directSaleStatusList as [DirectSaleStatus, ...DirectSaleStatus[]]),
  relatedPlacementOrders: z.string().optional(),
  notes: z.string().optional(),
});

export type DirectSaleWizardFormValues = z.infer<typeof directSaleWizardSchema>;
