
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier, Purchase } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Edit, ArrowLeft, AlertTriangle, Mail, Phone, FileText, ShoppingCart, Loader2, MapPin, Truck } from "lucide-react";
import SupplierDialog from "@/components/app/supplier-dialog";
import type { SupplierFormValues } from "@/components/app/supplier-dialog";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getSupplierByIdFS, updateSupplierFS } from "@/services/supplier-service";
import { getPurchasesFS } from "@/services/purchase-service";

const formatAddress = (address?: any): string => {
  if (!address) return 'No especificada';
  const parts = [
    address.street,
    address.number,
    address.city,
    address.province,
    address.postalCode,
    address.country || 'España'
  ].filter(Boolean);
  if (parts.length === 0) return 'No especificada';
  return parts.join(', ');
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userRole, refreshDataSignature } = useAuth();
  const { toast } = useToast();

  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = React.useState(false);
  
  const supplierId = params.supplierId as string;
  const canEditSupplier = userRole === 'Admin';

  React.useEffect(() => {
    async function loadSupplierData() {
      if (!supplierId) {
        setIsLoading(false);
        setSupplier(null);
        return;
      }
      setIsLoading(true);
      try {
        const [foundSupplier, allPurchases] = await Promise.all([
          getSupplierByIdFS(supplierId),
          getPurchasesFS()
        ]);
        
        setSupplier(foundSupplier);

        if (foundSupplier) {
          const relatedPurchases = allPurchases.filter(p => p.supplierId === foundSupplier.id);
          setPurchases(relatedPurchases);
        }

      } catch (error) {
        console.error("Error fetching supplier details or related data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudo cargar la información del proveedor.", variant: "destructive" });
        setSupplier(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadSupplierData();
  }, [supplierId, toast, refreshDataSignature]);

  const handleEditSupplier = () => {
    if (!canEditSupplier || !supplier) return;
    setIsSupplierDialogOpen(true);
  };

  const handleSaveSupplierDetails = async (data: SupplierFormValues) => {
    if (!canEditSupplier || !supplier) return;
    setIsLoading(true);
    try {
      await updateSupplierFS(supplier.id, data);
      refreshDataSignature();
      toast({ title: "¡Proveedor Actualizado!", description: `El proveedor "${data.name}" ha sido actualizado.` });
      setIsSupplierDialogOpen(false);
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el proveedor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando detalles del proveedor...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Proveedor no Encontrado</h1>
        <p className="text-muted-foreground mb-6">El proveedor que buscas no existe o ha sido eliminado.</p>
        <Button onClick={() => router.push('/suppliers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Proveedores
        </Button>
      </div>
    );
  }
  
  const creationDate = supplier.createdAt && isValid(parseISO(supplier.createdAt)) ? format(parseISO(supplier.createdAt), "dd/MM/yyyy", { locale: es }) : 'N/D';
  const updateDate = supplier.updatedAt && isValid(parseISO(supplier.updatedAt)) ? format(parseISO(supplier.updatedAt), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/D';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/suppliers')} aria-label="Volver a proveedores">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-semibold">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">CIF/NIF: {supplier.cif || 'No especificado'}</p>
          </div>
        </div>
        {canEditSupplier && (
            <Button onClick={handleEditSupplier} disabled={isLoading}>
                <Edit className="mr-2 h-4 w-4" /> Editar Proveedor
            </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle className="text-lg">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplier.contactName && <div className="flex items-center gap-2"><Phone size={16} className="text-muted-foreground"/> <span>{supplier.contactName}</span></div>}
            {supplier.contactEmail && <div className="flex items-center gap-2"><Mail size={16} className="text-muted-foreground"/> <a href={`mailto:${supplier.contactEmail}`} className="text-primary hover:underline">{supplier.contactEmail}</a></div>}
            {supplier.contactPhone && <div className="flex items-center gap-2"><Phone size={16} className="text-muted-foreground"/> <span>{supplier.contactPhone}</span></div>}
            {!supplier.contactName && !supplier.contactEmail && !supplier.contactPhone && <p className="text-muted-foreground">No hay información de contacto.</p>}
          </CardContent>
        </Card>
        
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle className="text-lg">Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
             <div className="flex items-start gap-2"><MapPin size={16} className="text-muted-foreground mt-1"/> <p className="whitespace-pre-line">{formatAddress(supplier.address)}</p></div>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle className="text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground whitespace-pre-line">{supplier.notes || 'No hay notas para este proveedor.'}</p>
          </CardContent>
        </Card>

      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
          <CardDescription>Registro de todas las compras realizadas a este proveedor.</CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto Principal</TableHead>
                    <TableHead className="text-right">Importe Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map(purchase => (
                    <TableRow key={purchase.id}>
                      <TableCell>{format(parseISO(purchase.orderDate), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{purchase.items[0]?.description || 'Varios'}</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={purchase.totalAmount} options={{ style: 'currency', currency: 'EUR' }} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge type="purchase" status={purchase.status} />
                      </TableCell>
                      <TableCell className="text-right">
                         <Button asChild variant="outline" size="sm">
                            <Link href="/purchases">
                                Ver Compra
                            </Link>
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No hay compras registradas para este proveedor.</p>
          )}
        </CardContent>
      </Card>
      
      {canEditSupplier && supplier && (
          <SupplierDialog
            supplier={supplier}
            isOpen={isSupplierDialogOpen}
            onOpenChange={setIsSupplierDialogOpen}
            onSave={handleSaveSupplierDetails}
          />
      )}
    </div>
  );
}
