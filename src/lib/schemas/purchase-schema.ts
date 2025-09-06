

"use client";

import * as z from "zod";

const expenseItemSchema = z.object({
    productoId: z.string().min(1, 'Debe seleccionar un artículo.'),
    newItemName: z.string().optional(),
    description: z.string().optional(),
    cantidad: z.coerce.number().positive('La cantidad debe ser positiva.'),
    costeUnitario: z.coerce.number().min(0, 'El coste debe ser un número positivo o cero.'),
    proveedorLote: z.string().min(1, 'El lote del proveedor es obligatorio.'),
    caducidad: z.date().optional(),
});

export const purchaseFormSchema = z.object({
  categoriaId: z.string({ required_error: 'Debe seleccionar una categoría.' }).min(1, 'Debe seleccionar una categoría.'),
  isInventoryPurchase: z.boolean().default(false),

  // States
  estadoDocumento: z.enum(['proforma', 'factura_pendiente', 'factura_recibida', 'factura_validada']),
  estadoPago: z.enum(['pendiente', 'parcial', 'pagado', 'pagado_adelantado']),

  // Core Details
  concepto: z.string().min(3, "El concepto es obligatorio."),
  monto: z.coerce.number().optional(),

  // Dates
  fechaEmision: z.date().optional(),
  fechaVencimiento: z.date().optional(),

  // Inventory Items (if applicable)
  items: z.array(expenseItemSchema).optional(),
  gastosEnvio: z.coerce.number().optional(),
  impuestos: z.coerce.number().optional(),

  // Supplier Info
  proveedorId: z.string().optional(),
  proveedorNombre: z.string().optional(),
  proveedorCif: z.string().optional(),

  // Invoice Details
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),

}).superRefine((data, ctx) => {
    if (data.isInventoryPurchase) {
        if (!data.items || data.items.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Debe añadir al menos un artículo para una compra de inventario.'});
        }
        
        data.items?.forEach((item, index) => {
            if (item.productoId === '##NEW##' && (!item.newItemName || item.newItemName.trim().length < 3)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: [`items.${index}.newItemName`], message: 'El nombre del nuevo artículo es obligatorio.' });
            }
        });
    } else {
        if (data.monto === undefined || data.monto <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['monto'], message: 'El importe es obligatorio para un gasto general.' });
        }
    }

    if(data.proveedorId === '##NEW##' && (!data.proveedorNombre || data.proveedorNombre.trim().length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proveedorNombre'], message: 'El nombre del nuevo proveedor es obligatorio.' });
    }
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
