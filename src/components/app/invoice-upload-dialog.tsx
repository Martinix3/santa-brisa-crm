
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
import { Checkbox } from "@/components/ui/checkbox";

interface InvoiceUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: Partial<PurchaseFormValues>, file: File) => void;
}

const MimeTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

async function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

export default function InvoiceUploadDialog({ isOpen, onOpenChange, onDataExtracted }: InvoiceUploadDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveInvoiceFile, setSaveInvoiceFile] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) { 
        setError("El archivo es demasiado grande. El límite es 4MB.");
        return;
    }

    if (!MimeTypeMap[file.type]) {
        setError(`Tipo de archivo no soportado: ${file.type}. Por favor, sube un PDF, JPG, o PNG.`);
        return;
    }

    setIsProcessing(true);
    setError(null);

    try {
        const dataUri = await fileToDataUri(file);
        toast({ title: "Analizando contenido con IA...", description: "Por favor, espera." });

        const extractedData: ProcessInvoiceOutput = await processInvoice({ invoiceDataUri: dataUri });
      
        const parsedDate = parse(extractedData.orderDate, 'yyyy-MM-dd', new Date());

        const purchaseFormData: Partial<PurchaseFormValues> = {
            supplier: extractedData.supplier,
            supplierCif: extractedData.supplierCif,
            supplierAddress_street: extractedData.supplierAddress?.street,
            supplierAddress_city: extractedData.supplierAddress?.city,
            supplierAddress_province: extractedData.supplierAddress?.province,
            supplierAddress_postalCode: extractedData.supplierAddress?.postalCode,
            supplierAddress_country: extractedData.supplierAddress?.country,
            orderDate: isValid(parsedDate) ? parsedDate : new Date(),
            items: extractedData.items.map(item => ({
                materialId: "", // Set empty materialId for user to map
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                batchNumber: "", // Add batch number field
            })),
            shippingCost: extractedData.shippingCost,
            taxRate: extractedData.taxRate,
            notes: extractedData.notes,
            status: "Borrador",
            invoiceFile: saveInvoiceFile ? file : undefined,
        };
      
        toast({
            title: "Datos Extraídos",
            description: "La información de la factura se ha cargado en el formulario. Por favor, revísala.",
        });

        onDataExtracted(purchaseFormData, file);

    } catch (processError: any) {
        console.error("Error processing invoice with AI:", processError);
        setError(`Error al procesar: ${processError.message}`);
    } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                disabled={isProcessing}
                ref={fileInputRef}
            />
            <p className="text-xs text-muted-foreground">Límite: 4MB. Formatos: PDF, JPG, PNG.</p>
          </div>
           <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="save-invoice"
              checked={saveInvoiceFile}
              onCheckedChange={(checked) => setSaveInvoiceFile(Boolean(checked))}
              disabled={isProcessing}
            />
            <Label htmlFor="save-invoice" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Guardar el archivo de la factura en el sistema
            </Label>
          </div>
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Analizando factura...</span>
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
