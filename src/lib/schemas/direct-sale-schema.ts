

import * as z from "zod";
import type { PaymentMethod } from "@/types";
import { TipoPedido as OrderType, EstadoVentaDirecta as DirectSaleStatus } from "@ssot";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto."),
  batchId: z.string().optional(),
  quantity: z.coerce.number({ invalid_type_error: "La cantidad debe ser un número."}).positive({ message: "La cantidad debe ser positiva." }),
  netUnitPrice: z.coerce.number({ invalid_type_error: "El precio debe ser un número."}).positive({ message: "El precio debe ser positivo." }),
});

export const generateOrderSchema = (orderType: OrderType) => z.object({
  customerId: z.string().min(1, "Debes seleccionar un cliente."),
  issueDate: z.date({ required_error: "La fecha es obligatoria." }),
  dueDate: z.date().optional(),
  type: z.enum(['directa', 'deposito']),
  status: z.string().min(1, "El estado es obligatorio."),
  paymentMethod: z.string({ required_error: "La forma de pago es obligatoria." }),
  items: z.array(orderItemSchema).min(1, "Debes añadir al menos un producto."),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    // Both 'directa' and 'deposito' types require a batchId as the product is leaving our warehouse.
    data.items.forEach((item, index) => {
        if (!item.batchId) {
            ctx.addIssue({
                code: 'custom',
                path: [`items.${index}.batchId`],
                message: "El lote es obligatorio para cualquier salida de producto.",
            });
        }
    });

     if (data.dueDate && data.issueDate > data.dueDate) {
      ctx.addIssue({
        code: 'custom',
        path: ["dueDate"],
        message: "La fecha de vencimiento no puede ser anterior a la de emisión.",
      });
    }
});

export type GenerateOrderFormValues = z.infer<ReturnType<typeof generateOrderSchema>>;
