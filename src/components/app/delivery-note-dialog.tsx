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

interface DeliveryNoteDialogProps {
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

export default function DeliveryNoteDialog({ sale, account, isOpen, onOpenChange }: DeliveryNoteDialogProps) {
  
  const handlePrint = () => {
    const dialogContent = document.getElementById("printable-dialog-content");
    if (dialogContent) {
      dialogContent.classList.add("print-dialog");
      window.print();
      dialogContent.classList.remove("print-dialog");
    }
  };
  
  if (!isOpen || !sale) return null;

  const shippingAddress = account?.addressShipping || account?.addressBilling;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent id="printable-dialog-content" className="sm:max-w-3xl">
        <DialogHeader className="print-hide-in-dialog">
          <DialogTitle>Albarán para Venta {sale.id?.substring(0, 8)}...</DialogTitle>
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
                    <h1 className="font-bold text-lg">ALBARÁN DE ENTREGA</h1>
                    <p><span className="font-semibold">Nº Albarán:</span> {sale.id}</p>
                    <p><span className="font-semibold">Fecha:</span> {format(parseISO(sale.issueDate), "dd/MM/yyyy", { locale: es })}</p>
                </div>
            </header>

            {/* Recipient */}
            <div className="mb-6 p-3 border rounded-md">
                <h3 className="font-semibold mb-1">Datos del Cliente:</h3>
                <p className="font-bold">{sale.customerName}</p>
                {account?.cif && <p>CIF: {account.cif}</p>}
                {shippingAddress && (
                    <div className="mt-1">
                        <p className="font-semibold">Dirección de Entrega:</p>
                        {formatAddressForNote(shippingAddress)}
                    </div>
                )}
            </div>

            {/* Items Table */}
            <div className="mb-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50%]">Producto / Descripción</TableHead>
                            <TableHead className="w-[25%]">Lote</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sale.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.productName}</TableCell>
                                <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={item.quantity}/></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            {/* Notes */}
            {sale.notes && (
                <div className="mb-6 p-2 border-t text-xs">
                    <h4 className="font-semibold">Notas:</h4>
                    <p className="text-muted-foreground">{sale.notes}</p>
                </div>
            )}

            {/* Signature */}
            <footer className="mt-12 pt-8 flex justify-between items-end">
                <div className="w-2/5">
                    <p className="font-semibold">Firma del Transportista:</p>
                    <div className="h-12 border-b mt-1"></div>
                </div>
                 <div className="w-2/5">
                    <p className="font-semibold">Recibí Conforme (Firma y Sello):</p>
                    <div className="h-12 border-b mt-1"></div>
                </div>
            </footer>
        </div>

        <DialogFooter className="print-hide-in-dialog">
          <DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose>
          <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Albarán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
