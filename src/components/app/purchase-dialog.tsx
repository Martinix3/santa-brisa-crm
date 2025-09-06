"use client";

import * as React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { addDirectSaleFS } from "@/services/venta-directa-sb-service";
import { getAccountsFS } from "@/services/account-service";
import { getInventoryItemsFS } from "@/services/inventory-item-service";
import { getAllBatchesFS } from "@/services/batch-service";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Loader2, Calendar as CalendarIcon, Briefcase, PlusCircle, Trash2, Check, ChevronsUpDown, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Account, InventoryItem, ItemBatch, OrderType, DirectSaleStatus, AccountType } from "@/types";
import { NewCustomerDialog } from "@/components/app/new-customer-dialog";
import { useCategories } from "@/contexts/categories-context";
import { generateOrderSchema } from '@/lib/schemas/direct-sale-schema';
import { paymentMethodList, directSaleStatusList } from '@/lib/data';

type GenerateOrderFormValues = z.infer<ReturnType<typeof generateOrderSchema>>;

const RELEVANT_ACCOUNT_TYPES: AccountType[] = [
    'Distribuidor', 
    'Importador', 
    'Gran Superficie',
    'distribuidor_mediano',
    'distribuidor_grande',
    'distribuidor_top',
];


export default function NewDirectSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { teamMember, dataSignature } = useAuth();
  const { allCategories, isLoading: isLoadingCategories } = useCategories();

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [finishedGoods, setFinishedGoods] = React.useState<InventoryItem[]>([]);
  const [allBatches, setAllBatches] = React.useState<ItemBatch[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const [openCustomerPopover, setOpenCustomerPopover] = React.useState(false);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = React.useState(false);
  
  const form = useForm<GenerateOrderFormValues>({
    resolver: zodResolver(generateOrderSchema('directa')), 
    defaultValues: {
      customerId: "",
      issueDate: new Date(),
      type: 'directa',
      status: 'borrador',
      paymentMethod: 'Adelantado',
      items: [],
      notes: "",
    },
  });
  
  const watchedOrderType = useWatch({ control: form.control, name: 'type' });

  React.useEffect(() => {
    form.trigger();
  }, [watchedOrderType, form]);


  React.useEffect(() => {
    async function loadData() {
        if (isLoadingCategories) return;
        setIsLoading(true);
        try {
            const [fetchedAccounts, fetchedInventoryItems, fetchedBatches] = await Promise.all([
                getAccountsFS(),
                getInventoryItemsFS(),
                getAllBatchesFS(),
            ]);
            
            setAccounts(fetchedAccounts.filter(acc => RELEVANT_ACCOUNT_TYPES.includes(acc.type)));
            setAllBatches(fetchedBatches);
            
            const normalizedTargetName = "producto terminado".normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
            const fgCategory = allCategories.find(c => c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === normalizedTargetName);
            
            if (fgCategory) {
                setFinishedGoods(fetchedInventoryItems.filter(i => i.categoryId === fgCategory.id));
            } else {
                toast({ title: "Advertencia de Configuración", description: "No se encontró la categoría 'Producto Terminado' para filtrar los productos.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error de Carga", description: "No se pudieron cargar los datos necesarios para el formulario.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [toast, allCategories, isLoadingCategories, dataSignature]);


  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({ control: form.control, name: 'items' });

  const { subtotal, tax, totalAmount } = React.useMemo(() => {
    const currentSubtotal = (watchedItems || []).reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.netUnitPrice) || 0;
        return sum + quantity * unitPrice;
    }, 0);
    const currentTax = currentSubtotal * 0.21;
    const currentTotalAmount = currentSubtotal + currentTax;
    return { subtotal: currentSubtotal, tax: currentTax, totalAmount: currentTotalAmount };
  }, [watchedItems]);

  const batchesByProductId = React.useMemo(() => {
    return allBatches.reduce((acc, batch) => {
      if (batch.qtyRemaining > 0) {
        if (!acc[batch.inventoryItemId]) acc[batch.inventoryItemId] = [];
        acc[batch.inventoryItemId].push(batch);
      }
      return acc;
    }, {} as Record<string, ItemBatch[]>);
  }, [allBatches]);

  const handleProductChange = (index: number, newProductId: string) => {
    const product = finishedGoods.find(p => p.id === newProductId);
    if(product) {
      update(index, {
        productId: product.id,
        batchId: "",
        quantity: 1,
        netUnitPrice: 0,
      });
    }
  };

  const onFormError = (errors: any) => {
    console.error("Validation Errors", errors);
    toast({
        title: "Error de Validación",
        description: "Por favor, revisa los campos marcados en rojo.",
        variant: "destructive"
    });
  };

  const onSubmit = async (data: GenerateOrderFormValues) => {
    setIsSaving(true);
    try {
        const customer = accounts.find(acc => acc.id === data.customerId);
        if(!customer) throw new Error("Cliente no encontrado");
        
        const enrichedItems = data.items.map(item => {
          const product = finishedGoods.find(p => p.id === item.productId);
          const batch = allBatches.find(b => b.id === item.batchId);
          return {
            ...item,
            productName: product?.name || 'Producto Desconocido',
            batchNumber: batch?.internalBatchCode || 'Lote Desconocido',
            total: (item.quantity || 0) * (item.netUnitPrice || 0),
          };
        });

        await addDirectSaleFS({ 
            ...data, 
            items: enrichedItems,
            customerName: customer.nombre, 
            subtotal, 
            tax, 
            totalAmount 
        });
        toast({ title: "Pedido Guardado", description: `El pedido para ${customer.nombre} se ha guardado correctamente.`});
        router.push('/direct-sales-sb');
    } catch (error: any) {
        toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
        <header className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Generar Pedido</h1>
        </header>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onFormError)}>
          <Card className="max-w-4xl mx-auto shadow-lg">
            <CardContent className="p-6 space-y-6">
                 <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Cliente</FormLabel>
                            <div className="flex gap-2">
                            <Popover open={openCustomerPopover} onOpenChange={setOpenCustomerPopover}>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {field.value ? accounts.find((acc) => acc.id === field.value)?.nombre : "Seleccionar cliente"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                    <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                    <CommandGroup>
                                        {accounts.map((acc) => (
                                        <CommandItem value={acc.nombre} key={acc.id} onSelect={() => { form.setValue("customerId", acc.id); setOpenCustomerPopover(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", acc.id === field.value ? "opacity-100" : "opacity-0")} />
                                            {acc.nombre}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                            <Button type="button" variant="secondary" onClick={() => setIsNewCustomerDialogOpen(true)}>
                                <PlusCircle className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Nuevo</span>
                            </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Tipo de venta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="directa">Directa</SelectItem><SelectItem value="deposito">En Depósito</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado..."/></SelectTrigger></FormControl><SelectContent>{directSaleStatusList.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                </div>
                 <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1"><CreditCard className="h-4 w-4"/>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>


                <div className="space-y-2">
                    <FormLabel>Productos</FormLabel>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[35%]">Producto</TableHead>
                                    <TableHead className="w-[25%]">Lote</TableHead>
                                    <TableHead className="w-[10%]">Cantidad</TableHead>
                                    <TableHead className="w-[15%]">Precio Neto</TableHead>
                                    <TableHead className="w-[15%] text-right">Importe</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="align-top">
                                        <TableCell className="pt-2 pb-0">
                                            <FormField control={form.control} name={`items.${index}.productId`} render={({ field: selectField }) => (
                                                <FormItem><Select onValueChange={(value) => handleProductChange(index, value)} value={selectField.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{finishedGoods.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage className="text-xs mt-1" /></FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="pt-2 pb-0">
                                            <FormField control={form.control} name={`items.${index}.batchId`} render={({ field: selectField }) => {
                                                const selectedProductId = form.watch(`items.${index}.productId`);
                                                const availableBatches = selectedProductId ? (batchesByProductId[selectedProductId] || []) : [];
                                                return <FormItem><Select onValueChange={selectField.onChange} value={selectField.value ?? ""} disabled={!selectedProductId}><FormControl><SelectTrigger><SelectValue placeholder="Lote..." /></SelectTrigger></FormControl><SelectContent>{availableBatches.map(b => (<SelectItem key={b.id} value={b.id}>{b.internalBatchCode} ({b.qtyRemaining})</SelectItem>))}</SelectContent></Select><FormMessage className="text-xs mt-1" /></FormItem>
                                            }} />
                                        </TableCell>
                                        <TableCell className="pt-2 pb-0">
                                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                <FormItem><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage className="text-xs mt-1" /></FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="pt-2 pb-0">
                                            <FormField control={form.control} name={`items.${index}.netUnitPrice`} render={({ field }) => (
                                                <FormItem><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage className="text-xs mt-1" /></FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="text-right align-middle pt-4">
                                            <FormattedNumericValue value={(form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.netUnitPrice`) || 0)} options={{ style: 'currency', currency: 'EUR' }} />
                                        </TableCell>
                                        <TableCell className="align-middle pt-4">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", batchId: "", quantity: 1, netUnitPrice: 0 })}><PlusCircle className="mr-2 h-4 w-4"/>Añadir producto</Button>
                    <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                </div>
                
                 <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                     <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <div className="p-4 bg-muted/50 rounded-md space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><FormattedNumericValue value={subtotal} options={{ style: 'currency', currency: 'EUR' }} /></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (21%):</span><FormattedNumericValue value={tax} options={{ style: 'currency', currency: 'EUR' }} /></div>
                        <div className="flex justify-between text-lg font-bold"><span className="text-foreground">TOTAL:</span><FormattedNumericValue value={totalAmount} options={{ style: 'currency', currency: 'EUR' }} /></div>
                    </div>
                 </div>


            </CardContent>
            <CardFooter className="flex flex-row justify-end gap-2 border-t pt-6">
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</> : "Guardar Pedido"}
                </Button>
            </CardFooter>
          </Card>
        </form>
        </Form>
        <NewCustomerDialog
            isOpen={isNewCustomerDialogOpen}
            onOpenChange={setIsNewCustomerDialogOpen}
            onCustomerCreated={(newAccount) => {
                setAccounts(prev => [newAccount, ...prev]);
                form.setValue("customerId", newAccount.id);
                setIsNewCustomerDialogOpen(false);
            }}
        />
    </div>
  );
}