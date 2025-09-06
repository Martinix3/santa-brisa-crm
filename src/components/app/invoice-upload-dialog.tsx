
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, File, AlertTriangle } from "lucide-react";
import type { Order } from "@/types";

const invoiceUploadFormSchema = z.object({
  invoiceFile: z.instanceof(File, { message: "Se requiere un archivo." })
    .refine(file => file.size < 5 * 1024 * 1024, "El archivo debe ser menor de 5MB.")
    .refine(file => ["application/pdf", "image/jpeg", "image/png"].includes(file.type), "Debe ser un PDF o una imagen (JPG, PNG)."),
});

type InvoiceUploadFormValues = z.infer<typeof invoiceUploadFormSchema>;

interface InvoiceUploadDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (orderId: string, file: File) => Promise<void>;
}

export default function InvoiceUploadDialog({ order, isOpen, onOpenChange, onUpload }: InvoiceUploadDialogProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<InvoiceUploadFormValues>({
    resolver: zodResolver(invoiceUploadFormSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset();
      setFileName(null);
    }
  }, [isOpen, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      form.setValue("invoiceFile", file);
      form.clearErrors("invoiceFile");
    }
  };

  const onSubmit = async (data: InvoiceUploadFormValues) => {
    if (!order || !data.invoiceFile) return;

    setIsUploading(true);
    try {
      await onUpload(order.id, data.invoiceFile);
      toast({
        title: "¡Factura Subida!",
        description: `El archivo ${data.invoiceFile.name} se ha subido correctamente.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error al Subir",
        description: `No se pudo subir la factura: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Factura para Pedido</DialogTitle>
          <DialogDescription>
            Selecciona el archivo PDF o imagen de la factura para el pedido de <strong className="font-semibold text-foreground">{order?.clientName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="invoiceFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Archivo de la Factura</FormLabel>
                   <FormControl>
                    <div className="relative">
                      <Button asChild variant="outline" className="w-full justify-start">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <UploadCloud className="mr-2 h-4 w-4" />
                          <span>{fileName || "Seleccionar un archivo..."}</span>
                        </label>
                      </Button>
                      <Input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="application/pdf,image/jpeg,image/png"
                        disabled={isUploading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.invoiceFile && (
                <div className="flex items-center text-sm text-destructive">
                    <AlertTriangle className="mr-2 h-4 w-4"/>
                    <p>{form.formState.errors.invoiceFile.message}</p>
                </div>
            )}
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isUploading}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isUploading || !form.formState.isValid}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  "Subir y Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
