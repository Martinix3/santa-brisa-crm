
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
import { Printer, MapPin } from "lucide-react";
import type { SampleRequest, Account, AddressDetails } from "@/types";

interface ShippingLabelDialogProps {
  request: SampleRequest | null;
  account: Account | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatAddress = (address?: AddressDetails): React.ReactNode => {
    if (!address) return <p className="text-muted-foreground">Dirección no disponible.</p>;
  
    return (
      <div className="space-y-1">
        <p>{address.street}{address.number ? `, ${address.number}` : ''}</p>
        <p>{address.postalCode} {address.city}</p>
        <p>{address.province}</p>
        <p>{address.country || 'España'}</p>
      </div>
    );
};
  

export default function ShippingLabelDialog({ request, account, isOpen, onOpenChange }: ShippingLabelDialogProps) {
  
  const handlePrint = () => {
    setTimeout(() => { 
        window.print();
    }, 100);
  };
  
  if (!isOpen || !request) return null;

  // Determine the correct shipping address
  const shippingAddress = request.shippingAddress || account?.addressShipping || account?.addressBilling;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shipping-label-dialog">
        <DialogHeader className="print-hide">
          <DialogTitle>Etiqueta de Envío</DialogTitle>
        </DialogHeader>
        
        <div id="shipping-label-content" className="shipping-label-dialog-content my-4">
            <h3 className="text-lg font-semibold mb-2">Enviar a:</h3>
            <p className="font-bold text-xl mb-4">{request.clientName}</p>
            
            <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="text-base">
                    {formatAddress(shippingAddress)}
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold">Notas de la Solicitud:</h4>
                <p className="text-sm text-muted-foreground mt-1">Propósito: {request.purpose}</p>
                <p className="text-sm text-muted-foreground">Cantidad: {request.numberOfSamples} muestras</p>
                <p className="text-sm text-muted-foreground">Solicitado por: {request.requesterName}</p>
            </div>
        </div>

        <DialogFooter className="print-hide">
          <DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose>
          <Button onClick={handlePrint} disabled={!shippingAddress}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
