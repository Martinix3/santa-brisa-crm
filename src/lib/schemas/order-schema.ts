
import * as z from "zod";
import { Currency, LineType, OrderChannel, ORDER_CHANNEL_VALUES, LINE_TYPE_VALUES, MONEDAS } from "@ssot";

export const orderLineSchema = z.object({
  inventoryId: z.string(),
  lineType: z.enum(LINE_TYPE_VALUES),
  sku: z.string(),
  name: z.string(),
  uom: z.string().default("ud"),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderSchema = z.object({
  // cuenta por ID o por nombre (al menos uno)
  accountId: z.string().optional(),
  accountName: z.string().optional(),

  channel: z.enum(ORDER_CHANNEL_VALUES as [OrderChannel,...OrderChannel[]]),
  distributorId: z.string().optional().nullable(),
  currency: z.enum(MONEDAS).default("EUR"),
  lines: z.array(orderLineSchema).min(1, "Debe añadir al menos una línea al pedido."),
  notes: z.string().optional().nullable(),

  // pistas para creación implícita
  ownershipHint: z.enum(["propio","distribuidor"]).optional(),
}).superRefine((data, ctx) => {
    if (!data.accountId && !data.accountName) {
        ctx.addIssue({
            path: ["accountName"],
            message: "Se requiere el nombre de la cuenta o un ID.",
            code: z.ZodIssueCode.custom
        });
    }
});

export type OrderFormValues = z.infer<typeof orderSchema>;
