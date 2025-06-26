"use client";

import * as React from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { processInvoice, type ProcessInvoiceOutput } from "@/ai/flows/invoice-processing-flow";
import type { PurchaseFormValues } from "@/components/app/purchase-dialog";
import { parse, isValid } from "date-fns";

interface InvoiceUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: Partial<PurchaseFormValues>) => void;
}

export default function InvoiceUploadDialog({ isOpen, onOpenChange, onDataExtracted }: InvoiceUploadDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
        setError("El archivo es demasiado grande. El límite es 4MB.");
        return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const dataUri = reader.result as string;
        try {
          const extractedData: ProcessInvoiceOutput = await processInvoice({ invoiceDataUri: dataUri });
          
          const parsedDate = parse(extractedData.orderDate, 'yyyy-MM-dd', new Date());

          const purchaseFormData: Partial<PurchaseFormValues> = {
            supplier: extractedData.supplier,
            orderDate: isValid(parsedDate) ? parsedDate : new Date(),
            items: extractedData.items.map(item => ({...item, unitPrice: item.unitPrice || 0})),
            shippingCost: extractedData.shippingCost,
            taxRate: extractedData.taxRate,
            notes: extractedData.notes,
            status: "Borrador"
          };
          
          toast({
            title: "Datos Extraídos",
            description: "La información de la factura se ha cargado en el formulario. Por favor, revísala.",
          });
          onDataExtracted(purchaseFormData);

        } catch (aiError: any) {
          console.error("AI processing error:", aiError);
          setError(`La IA no pudo procesar la factura. Error: ${aiError.message || "Desconocido"}`);
        } finally {
            setIsProcessing(false);
             if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
      };
      reader.onerror = (error) => {
        console.error("File reading error:", error);
        setError("No se pudo leer el archivo seleccionado.");
        setIsProcessing(false);
      };
    } catch (e) {
      console.error("File processing setup error:", e);
      setError("Ocurrió un error inesperado al procesar el archivo.");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Compra desde Factura</DialogTitle>
          <DialogDescription>
            Sube un archivo de factura (PDF o imagen) y la IA intentará extraer los datos para rellenar el formulario de compra.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="invoice-file">Archivo de Factura</Label>
            <Input 
                id="invoice-file" 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                disabled={isProcessing}
                ref={fileInputRef}
            />
            <p className="text-xs text-muted-foreground">Límite de tamaño: 4MB.</p>
          </div>
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Procesando factura con IA, por favor espera...</span>
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5"/>
                <span className="text-sm font-medium">{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
