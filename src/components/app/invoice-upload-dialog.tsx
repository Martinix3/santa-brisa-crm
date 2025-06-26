
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
import { v4 as uuidv4 } from 'uuid';
import { storage } from "@/lib/firebase"; // Import client SDK
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/auth-context";

interface InvoiceUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: Partial<PurchaseFormValues>) => void;
}

const MimeTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export default function InvoiceUploadDialog({ isOpen, onOpenChange, onDataExtracted }: InvoiceUploadDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
        setError("Debes estar autenticado para subir archivos.");
        toast({ title: "Error de Autenticación", description: "Por favor, recarga la página e inicia sesión.", variant: "destructive"});
        return;
    }

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

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const dataUri = reader.result as string;
        try {
            // Step 1: Upload the file to Firebase Storage from the client
            toast({ title: "Subiendo factura...", description: "Por favor, espera." });
            
            const filePath = `invoices/purchases/${user.uid}/invoice_${Date.now()}_${uuidv4()}.${file.name.split('.').pop()}`;
            const storageRef = ref(storage, filePath);
            
            const uploadTask = await uploadString(storageRef, dataUri, 'data_url');
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            toast({ title: "Factura subida", description: "Analizando contenido con IA..." });

            // Step 2: Process the invoice with AI
            const extractedData: ProcessInvoiceOutput = await processInvoice({ invoiceDataUri: dataUri });
          
            const parsedDate = parse(extractedData.orderDate, 'yyyy-MM-dd', new Date());

            // Step 3: Prepare form data with extracted info and the final downloadUrl
            const purchaseFormData: Partial<PurchaseFormValues> = {
                supplier: extractedData.supplier,
                supplierCif: extractedData.supplierCif,
                supplierAddress_street: extractedData.supplierAddress?.street,
                supplierAddress_city: extractedData.supplierAddress?.city,
                supplierAddress_province: extractedData.supplierAddress?.province,
                supplierAddress_postalCode: extractedData.supplierAddress?.postalCode,
                supplierAddress_country: extractedData.supplierAddress?.country,
                orderDate: isValid(parsedDate) ? parsedDate : new Date(),
                items: extractedData.items.map(item => ({...item, unitPrice: item.unitPrice || 0, total: (item.quantity || 0) * (item.unitPrice || 0) })),
                shippingCost: extractedData.shippingCost,
                taxRate: extractedData.taxRate,
                notes: extractedData.notes,
                status: "Borrador",
                invoiceUrl: downloadUrl,
                storagePath: filePath,
            };
          
            toast({
                title: "Datos Extraídos",
                description: "La información de la factura se ha cargado en el formulario. Por favor, revísala.",
            });

            onDataExtracted(purchaseFormData);

        } catch (processError: any) {
            console.error("Client-side error:", processError);
             if (processError.code === 'storage/unauthorized') {
                setError("Error de permisos (CORS). Sigue los pasos para configurar tu bucket.");
                toast({ title: "Configuración Requerida", description: "Parece que falta configurar CORS en tu Firebase Storage. Por favor, sigue las instrucciones.", variant: "destructive", duration: 10000 });
            } else {
                setError(`Error al procesar: ${processError.message}`);
            }
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
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Subiendo y analizando factura...</span>
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
