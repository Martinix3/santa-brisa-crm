
import * as z from "zod";
import { Currency, LineType, OrderChannel, orderChannelOptions, lineTypeOptions, LINE_TYPE_VALUES, ORDER_CHANNEL_VALUES, MONEDAS } from "@ssot";

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
  accountId: z.string().optional(),
  accountName: z.string().min(1, "El nombre de la cuenta es obligatorio."),
  channel: z.enum(ORDER_CHANNEL_VALUES),
  distributorId: z.string().optional().nullable(),
  currency: z.enum(MONEDAS).default("EUR"),
  lines: z.array(orderLineSchema).min(1, "Debe añadir al menos una línea al pedido."),
  notes: z.string().optional().nullable(),
  ownershipHint: z.string().optional(), // Hint for account creation
});

export type OrderFormValues = z.infer<typeof orderSchema>;
