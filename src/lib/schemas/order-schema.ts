import * as z from "zod";
import { Currency, LineType, OrderChannel, orderChannelOptions, lineTypeOptions } from "@ssot";

export const orderLineSchema = z.object({
  inventoryId: z.string(),
  lineType: z.enum(lineTypeOptions.map(o=>o.value) as [LineType,...LineType[]]),
  sku: z.string(),
  name: z.string(),
  uom: z.string().default("ud"),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderSchema = z.object({
  accountId: z.string().optional(),
  accountName: z.string().min(1, "El nombre de la cuenta es obligatorio."),
  channel: z.enum(orderChannelOptions.map(o=>o.value) as [OrderChannel,...OrderChannel[]]),
  distributorId: z.string().optional().nullable(),
  currency: z.enum(["EUR","USD","MXN"]).default("EUR"),
  lines: z.array(orderLineSchema).min(1, "Debe añadir al menos una línea al pedido."),
  notes: z.string().optional().nullable(),
  ownershipHint: z.string().optional(), // Hint for account creation
});

export type OrderFormValues = z.infer<typeof orderSchema>;
