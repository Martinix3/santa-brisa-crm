"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { DirectSale } from "@/types";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const regularizationFormSchema = z.object({
  unitsToInvoice: z.coerce.number().positive("La cantidad a facturar debe ser un número positivo."),
});

type RegularizationFormValues = z.infer<typeof regularizationFormSchema>;

interface RegularizationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (originalSaleId: string, unitsToInvoice: number) => void;
  sale: DirectSale | null;
}

export default function RegularizationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  sale,
}: RegularizationDialogProps) {
  
  const form = useForm<RegularizationFormValues>({
    resolver: zodResolver(regularizationFormSchema),
    defaultValues: { unitsToInvoice: undefined },
  });

  const [isLoading, setIsLoading] = React.useState(false);
  
  // Memoize values to avoid re-calculation on every render
  const { originalItem, qtyInConsignment } = React.useMemo(() => {
      if (!sale || !sale.items || sale.items.length === 0) {
          return { originalItem: null, qtyInConsignment: 0 };
      }
      const item = sale.items[0];
      const remaining = sale.qtyRemainingInConsignment?.[item.productId] ?? item.quantity;
      return { originalItem: item, qtyInConsignment: remaining };
  }, [sale]);

  const schemaWithMax = React.useMemo(() => {
    return regularizationFormSchema.refine(
      (data) => data.unitsToInvoice <= qtyInConsignment,
      {
          message: `No puedes facturar más de ${qtyInConsignment} unidades.`,
          path: ["unitsToInvoice"],
      }
    );
  }, [qtyInConsignment]);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ unitsToInvoice: undefined });
    }
  }, [isOpen, form]);

  const onSubmit = (data: RegularizationFormValues) => {
    if (!sale) return;
    setIsLoading(true);
    onConfirm(sale.id, data.unitsToInvoice);
    // setIsLoading is reset by the parent component
  };
  
  if (!isOpen || !sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regularizar Depósito para {sale.customerName}</DialogTitle>
          <DialogDescription>
            Crea una nueva factura a partir del stock en consigna. Esto reducirá el stock disponible en depósito.
          </DialogDescription>
        </DialogHeader>

        <Card className="my-4">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Stock Actual en Depósito</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                 {originalItem ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Unidades en Depósito</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             <TableRow>
                                <TableCell>{originalItem.productName}</TableCell>
                                <TableCell className="text-right font-bold">
                                    <FormattedNumericValue value={qtyInConsignment} />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay artículos en esta orden de depósito.</p>
                )}
            </CardContent>
        </Card>
        
        <Form {...form} resolver={zodResolver(schemaWithMax)}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="unitsToInvoice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unidades a Facturar</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value ?? ''} disabled={!originalItem} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />

                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading || !originalItem}>
                      {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Regularizando...</>
                      ) : "Crear Factura y Regularizar"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
