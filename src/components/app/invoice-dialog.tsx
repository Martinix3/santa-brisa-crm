"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import type { DirectSale, Account, AddressDetails } from "@/types";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

interface InvoiceDialogProps {
  sale: DirectSale | null;
  account: Account | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatAddressForNote = (address?: AddressDetails): React.ReactNode => {
    if (!address) return <p className="text-muted-foreground">Dirección no disponible.</p>;
  
    return (
      <div className="space-y-0.5">
        <p>{address.street}{address.number ? `, ${address.number}` : ''}</p>
        <p>{address.postalCode} {address.city}, {address.province}</p>
      </div>
    );
};

export default function InvoiceDialog({ sale, account, isOpen, onOpenChange }: InvoiceDialogProps) {
  
  const handlePrint = () => {
     const dialogContent = document.getElementById("printable-dialog-content");
    if (dialogContent) {
      dialogContent.classList.add("print-dialog");
      window.print();
      dialogContent.classList.remove("print-dialog");
    }
  };
  
  if (!isOpen || !sale) return null;

  const billingAddress = account?.addressBilling;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent id="printable-dialog-content" className="sm:max-w-4xl">
        <DialogHeader className="print-hide-in-dialog">
          <DialogTitle>Factura para Venta {sale.invoiceNumber || sale.id?.substring(0, 8)}...</DialogTitle>
        </DialogHeader>
        
        <div className="my-4 text-xs">
            {/* Header */}
            <header className="flex justify-between items-start mb-6">
                 <div className="flex items-center space-x-3">
                    <Image src="/logo-santa-brisa-crm.png" alt="Santa Brisa Logo" width={120} height={30} unoptimized />
                    <div className="pl-4 border-l">
                        <h2 className="font-bold text-base">Santa Brisa</h2>
                        <p>CIF: B00000000</p>
                        <p>Calle Ficticia 123, 28001 Madrid</p>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="font-bold text-lg">FACTURA</h1>
                    <p><span className="font-semibold">Nº Factura:</span> {sale.invoiceNumber || sale.id}</p>
                    <p><span className="font-semibold">Fecha Factura:</span> {format(parseISO(sale.issueDate), "dd/MM/yyyy", { locale: es })}</p>
                    {sale.dueDate && <p><span className="font-semibold">Vencimiento:</span> {format(parseISO(sale.dueDate), "dd/MM/yyyy", { locale: es })}</p>}
                </div>
            </header>

            {/* Recipient */}
            <div className="mb-6 p-3 border rounded-md">
                <h3 className="font-semibold mb-1">Facturar a:</h3>
                <p className="font-bold">{account?.legalName || sale.customerName}</p>
                {account?.cif && <p>CIF: {account.cif}</p>}
                {billingAddress && (
                    <div className="mt-1">
                        <p className="font-semibold">Dirección Fiscal:</p>
                        {formatAddressForNote(billingAddress)}
                    </div>
                )}
            </div>

            {/* Items Table */}
            <div className="mb-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[45%]">Concepto</TableHead>
                            <TableHead className="w-[15%]">Lote</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Precio Unitario</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sale.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.productName}</TableCell>
                                <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={item.quantity}/></TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={item.netUnitPrice} options={{ style: 'currency', currency: 'EUR' }} /></TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={item.quantity * item.netUnitPrice} options={{ style: 'currency', currency: 'EUR' }} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2 mt-2">
                    <Separator/>
                    <div className="flex justify-between"><span>Subtotal:</span> <FormattedNumericValue value={sale.subtotal} options={{ style: 'currency', currency: 'EUR' }}/></div>
                    <div className="flex justify-between"><span>IVA (21%):</span> <FormattedNumericValue value={sale.tax} options={{ style: 'currency', currency: 'EUR' }}/></div>
                    <Separator/>
                    <div className="flex justify-between font-bold text-base"><span>TOTAL:</span> <FormattedNumericValue value={sale.totalAmount} options={{ style: 'currency', currency: 'EUR' }}/></div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-4 border-t text-center text-gray-500">
                <p>Gracias por su confianza en Santa Brisa.</p>
                <p>Forma de Pago: {sale.paymentMethod || 'No especificado'}</p>
            </footer>
        </div>

        <DialogFooter className="print-hide-in-dialog">
          <DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose>
          <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
