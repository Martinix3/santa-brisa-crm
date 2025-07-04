
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Purchase, PurchaseStatus, UserRole, InventoryItem, PurchaseCategory, Currency } from "@/types";
import { purchaseStatusList, purchaseCategoryList } from "@/lib/data";
import { useAuth } from "@/contexts/auth-context";
import { PlusCircle, MoreHorizontal, Filter, ChevronDown, Edit, Trash2, Receipt, Loader2, UploadCloud, Download, TestTube2 } from "lucide-react";
import PurchaseDialog from "@/components/app/purchase-dialog";
import type { PurchaseFormValues } from "@/components/app/purchase-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { addPurchaseFS, updatePurchaseFS, deletePurchaseFS, getPurchasesFS } from "@/services/purchase-service";
import Link from "next/link";
import InvoiceUploadDialog from "@/components/app/invoice-upload-dialog";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { testUpload } from "@/services/test-upload-service";
import { initializeMockCategoriesInFirestore } from "@/services/category-service";

export default function PurchasesPage() {
  const { toast } = useToast();
  const { userRole, dataSignature, refreshDataSignature } = useAuth();
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [materials, setMaterials] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingPurchase, setEditingPurchase] = React.useState<Purchase | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = React.useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = React.useState<Purchase | null>(null);
  const [prefilledData, setPrefilledData] = React.useState<Partial<PurchaseFormValues> | null>(null);
  const [prefilledFile, setPrefilledFile] = React.useState<File | null>(null);
  const [isInvoiceUploadOpen, setIsInvoiceUploadOpen] = React.useState(false);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<PurchaseStatus | "Todos">("Todos");
  const [categoryFilter, setCategoryFilter] = React.useState<PurchaseCategory | "Todas">("Todas");

  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [isTestingUpload, setIsTestingUpload] = React.useState(false);

  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        try {
            // Seed categories if needed before fetching other data
            await initializeMockCategoriesInFirestore();
            
            const [fetchedPurchases, fetchedMaterials] = await Promise.all([
              getPurchasesFS(),
              getInventoryItemsFS()
            ]);
            setPurchases(fetchedPurchases);
            setMaterials(fetchedMaterials);
        } catch (error) {
            console.error("Failed to load purchases:", error);
            toast({ title: "Error", description: "No se pudieron cargar las órdenes de compra.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    if (isAdmin) {
        loadInitialData();
    } else {
        setIsLoading(false);
    }
  }, [toast, isAdmin, dataSignature]);

  const handleAddNewPurchase = () => {
    if (!isAdmin) return;
    setEditingPurchase(null);
    setPrefilledData(null);
    setPrefilledFile(null);
    setIsPurchaseDialogOpen(true);
  };
  
  const handleEditPurchase = (purchase: Purchase) => {
    if (!isAdmin) return;
    setEditingPurchase(purchase);
    setPrefilledData(null);
    setPrefilledFile(null);
    setIsPurchaseDialogOpen(true);
  };

  const handleDataFromInvoice = (extractedData: Partial<PurchaseFormValues>, file: File) => {
    setEditingPurchase(null);
    setPrefilledData(extractedData);
    setPrefilledFile(extractedData.invoiceFile ? file : null);
    setIsInvoiceUploadOpen(false);
    setIsPurchaseDialogOpen(true);
  };

  const handleSavePurchase = async (data: PurchaseFormValues, purchaseId?: string) => {
    if (!isAdmin) return;
    setIsLoading(true);
    
    try {
      let successMessage = "";
      if (purchaseId) {
        await updatePurchaseFS(purchaseId, data);
        successMessage = `El gasto a "${data.supplier}" ha sido actualizado.`;
      } else {
        await addPurchaseFS(data);
        successMessage = `El gasto a "${data.supplier}" ha sido añadido.`;
      }
      refreshDataSignature();
      const updatedPurchases = await getPurchasesFS();
      setPurchases(updatedPurchases);
      toast({ title: "¡Operación Exitosa!", description: successMessage });
    } catch (error: any) {
      console.error("Error saving purchase:", error);
      toast({ title: "Error al Guardar", description: `No se pudo guardar el gasto. Error: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsPurchaseDialogOpen(false);
      setEditingPurchase(null);
      setPrefilledData(null);
      setPrefilledFile(null);
    }
  };

  const handleDeletePurchase = (purchase: Purchase) => {
    if (!isAdmin) return;
    setPurchaseToDelete(purchase);
  };

  const confirmDeletePurchase = async () => {
    if (!isAdmin || !purchaseToDelete) return;
    setIsLoading(true);
    try {
      await deletePurchaseFS(purchaseToDelete.id);
      setPurchases(prev => prev.filter(p => p.id !== purchaseToDelete.id));
      toast({ title: "¡Gasto Eliminado!", description: `El gasto de "${purchaseToDelete.supplier}" ha sido eliminado.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting purchase:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el gasto.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setPurchaseToDelete(null);
    }
  };

  const handleTestUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'text/plain,image/png,image/jpeg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 1 * 1024 * 1024) { // 1MB limit for test
        toast({ title: 'Archivo de prueba demasiado grande', description: 'Por favor, selecciona un archivo menor de 1MB.', variant: 'destructive' });
        return;
      }
      
      setIsTestingUpload(true);
      setTestResult(null);

      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const dataUri = reader.result as string;
          const result = await testUpload({ dataUri, contentType: file.type });

          if ('url' in result) {
            setTestResult(`¡Éxito! Archivo subido a: ${result.url}`);
            toast({ title: 'Prueba de subida exitosa', description: 'El archivo de prueba se ha subido correctamente.' });
          } else {
            setTestResult(`Error: ${result.error}`);
            toast({ title: 'Error en la prueba de subida', description: result.error, variant: 'destructive' });
          }
          setIsTestingUpload(false);
        };
        reader.onerror = () => {
           toast({ title: 'Error', description: 'No se pudo leer el archivo.', variant: 'destructive' });
           setIsTestingUpload(false);
        }
      } catch (error: any) {
        setTestResult(`Error en el cliente: ${error.message}`);
        toast({ title: 'Error en la prueba', description: error.message, variant: 'destructive' });
        setIsTestingUpload(false);
      }
    };
    input.click();
  };

  const materialsMap = React.useMemo(() => new Map(materials.map(m => [m.id, m])), [materials]);

  const filteredPurchases = purchases
    .filter(purchase =>
      (purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (purchase.items && purchase.items.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))))
    )
    .filter(purchase => statusFilter === "Todos" || purchase.status === statusFilter)
    .filter(purchase => categoryFilter === "Todas" || purchase.categoryId === categoryFilter);

  if (!isAdmin) {
    return (
      <Card className="shadow-subtle">
        <CardHeader><CardTitle className="flex items-center">Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permiso para acceder a esta sección.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <Receipt className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Gestión de Gastos</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button onClick={handleAddNewPurchase} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gasto Manual
          </Button>
           <Button onClick={() => setIsInvoiceUploadOpen(true)} disabled={isLoading} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" /> Crear desde Factura (IA)
          </Button>
           <Button onClick={handleTestUpload} disabled={isLoading || isTestingUpload} variant="secondary">
            <TestTube2 className="mr-2 h-4 w-4" />
            {isTestingUpload ? 'Probando...' : 'Probar Subida'}
          </Button>
        </div>
      </header>

       {testResult && (
        <Card className="mt-4 bg-muted/50">
          <CardHeader><CardTitle className="text-base">Resultado de la Prueba de Subida</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm break-all">{testResult}</p>
            {testResult.startsWith('¡Éxito!') && (
              <Button asChild variant="link" className="p-0 mt-1 h-auto">
                <Link href={testResult.replace('¡Éxito! Archivo subido a: ', '')} target="_blank" rel="noopener noreferrer">
                  Abrir archivo
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Listado de Gastos Registrados</CardTitle>
          <CardDescription>Administra las compras a proveedores, los gastos generales y sigue el estado de los pagos y facturas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por proveedor o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                 <DropdownMenuCheckboxItem onSelect={() => setStatusFilter("Todos")} checked={statusFilter === "Todos"}>Todos</DropdownMenuCheckboxItem>
                {purchaseStatusList.map(status => (
                   <DropdownMenuCheckboxItem key={status} onSelect={() => setStatusFilter(status)} checked={statusFilter === status}>
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Categoría: {categoryFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem onSelect={() => setCategoryFilter("Todas")} checked={categoryFilter === "Todas"}>Todas</DropdownMenuCheckboxItem>
                {purchaseCategoryList.map(cat => (
                  <DropdownMenuCheckboxItem key={cat} onSelect={() => setCategoryFilter(cat)} checked={categoryFilter === cat}>{cat}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando gastos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Proveedor</TableHead>
                    <TableHead className="w-[15%]">Categoría</TableHead>
                    <TableHead className="w-[15%]">Fecha Pedido</TableHead>
                    <TableHead className="text-right w-[15%]">Importe Total</TableHead>
                    <TableHead className="text-center w-[15%]">Estado</TableHead>
                    <TableHead className="text-right w-[20%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.length > 0 ? filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">
                        {purchase.supplierId ? (
                          <Link href={`/suppliers/${purchase.supplierId}`} className="hover:underline text-primary">
                            {purchase.supplier}
                          </Link>
                        ) : (
                          purchase.supplier
                        )}
                      </TableCell>
                      <TableCell>{purchase.categoryId}</TableCell>
                      <TableCell>{format(parseISO(purchase.orderDate), "dd/MM/yy", { locale: es })}</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={purchase.totalAmount} options={{ style: 'currency', currency: purchase.currency }} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge type="purchase" status={purchase.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEditPurchase(purchase)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar / Ver Detalles
                            </DropdownMenuItem>
                            {purchase.invoiceUrl && (
                               <DropdownMenuItem asChild>
                                <Link href={purchase.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="mr-2 h-4 w-4" /> Descargar Factura
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => { e.preventDefault(); handleDeletePurchase(purchase); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Gasto
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              {purchaseToDelete && purchaseToDelete.id === purchase.id && (
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto de:
                                          <br />
                                          <strong className="mt-2 block">{purchaseToDelete.supplier} - {purchaseToDelete.items[0]?.description}</strong>
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setPurchaseToDelete(null)}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={confirmDeletePurchase} variant="destructive">Sí, eliminar</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              )}
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron gastos que coincidan con tu búsqueda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && filteredPurchases.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de gastos mostrados: {filteredPurchases.length} de {purchases.length}</p>
            </CardFooter>
        )}
      </Card>

      <PurchaseDialog
          purchase={editingPurchase}
          prefilledData={prefilledData}
          prefilledFile={prefilledFile}
          isOpen={isPurchaseDialogOpen}
          onOpenChange={(open) => {
              setIsPurchaseDialogOpen(open);
              if (!open) {
                setEditingPurchase(null);
                setPrefilledData(null);
                setPrefilledFile(null);
              }
          }}
          onSave={handleSavePurchase}
      />

       <InvoiceUploadDialog
        isOpen={isInvoiceUploadOpen}
        onOpenChange={setIsInvoiceUploadOpen}
        onDataExtracted={handleDataFromInvoice}
      />
    </div>
  );
}
