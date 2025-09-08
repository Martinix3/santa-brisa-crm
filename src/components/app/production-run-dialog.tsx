

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { ProductionRun, InventoryItem, BomLine, Tank, Shortage, ConsumptionPlanItem, ProductionRunFormValues } from "@/types";
import { Loader2, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStockDetailsForItem } from "@/services/batch-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getTeamMembersFS } from "@/services/team-member-service";
import { TipoEjecucion as RunType } from "@ssot";

const productionRunFormSchema = z.object({
  type: z.enum(["blend", "fill"], { required_error: "Debe seleccionar un tipo de orden." }),
  productSku: z.string().min(1, "Debe seleccionar un producto a fabricar."),
  productName: z.string(),
  qtyPlanned: z.coerce.number().min(0.001, "La cantidad debe ser mayor que cero."),
  lineId: z.string().min(1, "Debe seleccionar una línea de producción."),
  tankId: z.string().optional(),
  startPlanned: z.date({ required_error: "La fecha de inicio es obligatoria." }),
  notesPlan: z.string().optional(),
  shortages: z.array(z.any()).optional(),
  maquilaCost: z.coerce.number().min(0, "El coste debe ser positivo.").optional(),
  maquilaTax: z.coerce.number().min(0, "Los impuestos deben ser positivos.").optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'blend' && !data.tankId) {
        ctx.addIssue({ path: ["tankId"], message: "Debe seleccionar un tanque para una orden de mezcla." });
    }
});

interface MaterialNeed {
  componentId: string;
  componentName: string;
  componentSku?: string;
  uom: string;
  required: number;
  available: number;
  pending: number;
  shortage: number;
}

interface ProductionRunDialogProps {
  productionRun: ProductionRun | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProductionRunFormValues, runId?: string) => void;
  inventoryItems: InventoryItem[];
  bomLines: BomLine[];
  tanks: Tank[];
}

export default function ProductionRunDialog({ productionRun, isOpen, onOpenChange, onSave, inventoryItems, bomLines, tanks }: ProductionRunDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [materialNeeds, setMaterialNeeds] = React.useState<MaterialNeed[]>([]);
  const [teamMembersMap, setTeamMembersMap] = React.useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  const form = useForm<ProductionRunFormValues>({
    resolver: zodResolver(productionRunFormSchema),
    defaultValues: {
      type: undefined,
      productSku: "",
      productName: "",
      qtyPlanned: 1,
      lineId: "",
      tankId: undefined,
      startPlanned: new Date(),
      notesPlan: "",
      maquilaCost: undefined,
      maquilaTax: undefined,
    },
  });

  const watchType = form.watch("type");
  const watchProductSku = form.watch("productSku");
  const watchQtyPlanned = form.watch("qtyPlanned");

  const filteredBoms = React.useMemo(() => {
    if (!watchType) return [];
    const skusWithBoms = new Set(bomLines.filter(bom => bom.type === watchType).map(bom => bom.productSku));
    return inventoryItems.filter(item => skusWithBoms.has(item.sku || ''));
  }, [watchType, bomLines, inventoryItems]);

  const freeTanks = React.useMemo(() => tanks.filter(tank => tank.status === 'Libre'), [tanks]);

  React.useEffect(() => {
    const calculateNeeds = async () => {
      if (!watchProductSku || !watchQtyPlanned || watchQtyPlanned <= 0) {
        setMaterialNeeds([]);
        return;
      }
      setIsCalculating(true);
      try {
        const productBom = bomLines.filter(bom => bom.productSku === watchProductSku);
        if (productBom.length === 0) {
          setMaterialNeeds([]);
          return;
        }
        
        const needsPromises = productBom.map(async (line) => {
          const required = line.quantity * watchQtyPlanned;
          const { available, pending } = await getStockDetailsForItem(line.componentId);
          
          return {
            componentId: line.componentId,
            componentName: line.componentName,
            componentSku: line.componentSku,
            uom: line.uom,
            required,
            available,
            pending,
            shortage: Math.max(0, required - available),
          };
        });
        const needs = await Promise.all(needsPromises);
        setMaterialNeeds(needs);
      } catch (error: any) {
        console.error("Error calculating material needs:", error);
        toast({ title: "Error de Cálculo", description: `No se pudieron calcular las necesidades de material: ${error.message}`, variant: "destructive" });
      } finally {
        setIsCalculating(false);
      }
    };
    calculateNeeds();
  }, [watchProductSku, watchQtyPlanned, bomLines, toast]);

  const hasShortage = React.useMemo(() => materialNeeds.some(need => need.shortage > 0), [materialNeeds]);

  React.useEffect(() => {
    if (isOpen) {
        getTeamMembersFS().then(members => {
            const map = new Map(members.map(m => [m.id, m.name]));
            setTeamMembersMap(map);
        });

      if (productionRun) {
        form.reset({
          type: productionRun.type,
          productSku: productionRun.productSku,
          productName: productionRun.productName,
          qtyPlanned: productionRun.qtyPlanned,
          lineId: productionRun.lineId,
          tankId: productionRun.tankId,
          startPlanned: productionRun.startPlanned && isValid(parseISO(productionRun.startPlanned)) ? parseISO(productionRun.startPlanned) : new Date(),
          notesPlan: productionRun.notesPlan || "",
          shortages: productionRun.shortages,
          maquilaCost: productionRun.maquilaCost,
          maquilaTax: productionRun.maquilaTax,
        });
      } else {
        form.reset({
          type: undefined,
          productSku: "",
          productName: "",
          qtyPlanned: 1,
          lineId: "",
          tankId: undefined,
          startPlanned: new Date(),
          notesPlan: "",
          maquilaCost: undefined,
          maquilaTax: undefined,
        });
      }
    }
  }, [productionRun, isOpen, form]);
  
  const onSubmit = async (data: ProductionRunFormValues) => {
    setIsSaving(true);
    const shortagesToSave = materialNeeds
        .filter(need => need.shortage > 0)
        .map(need => ({
            componentId: need.componentId,
            qtyShort: need.shortage,
        }));
    
    await onSave({ ...data, shortages: shortagesToSave }, productionRun?.id);
    setIsSaving(false);
  };

  const isReadOnly = !!productionRun && productionRun.status !== 'Draft';
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{productionRun ? "Editar Orden" : "Nueva Orden de Producción"}</DialogTitle>
          <DialogDescription>Planifica la producción de un nuevo lote de producto terminado o intermedio.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <fieldset disabled={isSaving || isReadOnly} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              
              <div className="space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Paso 1: Tipo de Orden</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="blend" id="type-blend" disabled={isReadOnly} /></FormControl><FormLabel htmlFor="type-blend" className="font-normal">Mezcla (Granel)</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="fill" id="type-fill" disabled={isReadOnly} /></FormControl><FormLabel htmlFor="type-fill" className="font-normal">Embotellado</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="productSku" render={({ field }) => (
                  <FormItem><FormLabel>Paso 2: Producto a Fabricar</FormLabel>
                    <Select onValueChange={(value) => {
                      const product = filteredBoms.find(p => p.sku === value);
                      field.onChange(value);
                      form.setValue('productName', product?.name || '');
                    }} value={field.value} disabled={!watchType || isReadOnly}>
                      <FormControl><SelectTrigger><SelectValue placeholder={!watchType ? "Selecciona un tipo de orden" : "Seleccionar producto..."} /></SelectTrigger></FormControl>
                      <SelectContent><ScrollArea className="h-48">{filteredBoms.map(p => <SelectItem key={p.id} value={p.sku!}>{p.name} ({p.sku})</SelectItem>)}</ScrollArea></SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="qtyPlanned" render={({ field }) => (
                    <FormItem><FormLabel>Cantidad Planificada</FormLabel><FormControl><Input type="number" step="any" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="lineId" render={({ field }) => (
                    <FormItem><FormLabel>Línea</FormLabel><FormControl><Input placeholder="Ej: 1" {...field} disabled={isReadOnly} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="maquilaCost" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Coste Maquila (€)</FormLabel>
                            <FormControl><Input type="number" step="any" placeholder="Ej: 250.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} disabled={isReadOnly} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="maquilaTax" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Impuestos Maquila (€)</FormLabel>
                            <FormControl><Input type="number" step="any" placeholder="Ej: 52.50" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} disabled={isReadOnly} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                {watchType === 'blend' && (
                  <FormField control={form.control} name="tankId" render={({ field }) => (
                    <FormItem><FormLabel>Tanque de Mezcla</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger disabled={isReadOnly}><SelectValue placeholder="Seleccionar tanque libre..." /></SelectTrigger></FormControl>
                        <SelectContent>{freeTanks.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.capacity}L)</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )}/>
                )}
                 <FormField control={form.control} name="startPlanned" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Fecha de Inicio Planificada</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button disabled={isReadOnly} variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es}/></PopoverContent></Popover><FormMessage /></FormItem>
                )}/>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg h-full flex flex-col">
                  <h4 className="text-md font-semibold mb-2">Necesidades de Material</h4>
                  {isCalculating && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin"/>Calculando stock...</div>}
                  
                  {!isCalculating && hasShortage && (
                    <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800 mb-2">
                        <AlertTriangle className="h-4 w-4 !text-amber-500" />
                        <AlertTitle className="font-semibold text-amber-900">Faltan Componentes</AlertTitle>
                        <AlertDescription>
                            Puedes guardar la orden como "Borrador", pero no podrás iniciarla hasta que se reciba y libere el material. Revisa el stock en el módulo de Inventario.
                        </AlertDescription>
                    </Alert>
                  )}
                  {!isCalculating && !hasShortage && materialNeeds.length > 0 && (
                      <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 mb-2">
                        <CheckCircle className="h-4 w-4 !text-green-600" />
                        <AlertTitle className="font-semibold text-green-900">Stock Disponible</AlertTitle>
                        <AlertDescription>
                            Hay stock suficiente para todos los componentes de esta orden de producción.
                        </AlertDescription>
                    </Alert>
                  )}

                  {!isCalculating && materialNeeds.length > 0 && (
                    <div className="flex-grow space-y-2">
                       <ScrollArea className="h-[200px] pr-3">
                         <Table>
                          <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead className="text-right">Necesario</TableHead><TableHead className="text-right">Disponible</TableHead></TableRow></TableHeader>
                           <TableBody>
                            {materialNeeds.map(need => (
                                <TableRow key={need.componentId} className={cn(need.shortage > 0 && "bg-amber-50 text-amber-900")}>
                                  <TableCell className="font-medium">{need.componentName}</TableCell>
                                  <TableCell className="text-right"><FormattedNumericValue value={need.required} /> {need.uom}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                      <span className={cn(need.shortage > 0 && "font-bold text-destructive")}>
                                          <FormattedNumericValue value={need.available} />
                                      </span>
                                      {need.pending > 0 && (
                                          <span className="text-xs text-yellow-600">(+{need.pending} pend.)</span>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                            ))}
                           </TableBody>
                         </Table>
                       </ScrollArea>
                    </div>
                  )}
                   {!isCalculating && materialNeeds.length === 0 && (
                      <div className="flex-grow flex items-center justify-center text-center text-muted-foreground text-sm">
                          <p>Selecciona un producto y una cantidad para ver las necesidades de material.</p>
                      </div>
                  )}
                </div>
              </div>

            </fieldset>

            {isReadOnly && productionRun?.status === 'Finalizada' && (
              <>
                <Separator className="my-4" />
                <h3 className="text-md font-semibold text-primary">Resultados de la Producción</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm p-3 border rounded-md bg-muted/50">
                    <div>
                        <p className="font-semibold text-muted-foreground">Lote de Salida</p>
                        <p className="font-mono text-xs font-bold">{productionRun.outputBatchId || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">Coste Unitario</p>
                        <p className="font-bold">
                            <FormattedNumericValue value={productionRun.cost?.unit} options={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 4 }} />
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">Rendimiento</p>
                        <p className="font-bold">
                            <FormattedNumericValue value={(productionRun.yieldPct || 0) / 100} options={{ style: 'percent', minimumFractionDigits: 2 }} />
                        </p>
                    </div>
                    {productionRun.type === 'fill' && (
                        <div>
                            <p className="font-semibold text-muted-foreground">Eficiencia</p>
                            <p className="font-bold">
                                <FormattedNumericValue value={productionRun.bottlesPerHour} /> u/hora
                            </p>
                        </div>
                    )}
                </div>
              </>
            )}

            {isReadOnly && productionRun && productionRun.cleaningLogs?.length > 0 && (
                <>
                <Separator className="my-4" />
                <h3 className="text-md font-semibold text-primary">Historial de Limpieza</h3>
                <div className="p-3 border rounded-md bg-muted/50 text-sm space-y-2">
                    {productionRun.cleaningLogs.map((log, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2">
                            <p><strong>Fecha:</strong> {format(parseISO(log.date), 'dd/MM/yy HH:mm', { locale: es })}</p>
                            <p><strong>Operario:</strong> {teamMembersMap.get(log.userId) || 'ID: ' + log.userId.substring(0,5)}</p>
                            <p><strong>Tipo:</strong> {log.type === 'initial' ? 'Inicial' : 'Final'} ({log.material})</p>
                        </div>
                    ))}
                </div>
                </>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
              {!isReadOnly && (
                <Button type="submit" disabled={isSaving || isCalculating}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Orden"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
