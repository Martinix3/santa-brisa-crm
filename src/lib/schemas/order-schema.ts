import * as z from "zod";
import { OrderChannel, LineType, Currency } from "@ssot";

// Opciones para los Selects, importados desde el SSOT
export const orderChannelOptions = [
  { value: "propio", label: "Propio" },
  { value: "distribuidor", label: "Distribuidor" },
] as const;

export const lineTypeOptions = [
  { value: "product", label: "Producto" },
  { value: "plv", label: "PLV" }, // Material de Punto de Venta
] as const;

export const orderLineSchema = z.object({
  inventoryId: z.string(),
  lineType: z.custom<LineType>(),
  sku: z.string(),
  name: z.string(),
  uom: z.string().default("ud"),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  channel: z.custom<OrderChannel>(),
  distributorId: z.string().optional().nullable(),
  currency: z.custom<Currency>().default("EUR"),
  lines: z.array(orderLineSchema).min(1, "Debe añadir al menos una línea al pedido."),
  notes: z.string().optional().nullable(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
