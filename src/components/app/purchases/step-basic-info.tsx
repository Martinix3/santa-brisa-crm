
"use client";

import React from 'react';
import { useFormContext, useWatch } from "react-hook-form";
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, FileText, Wallet, ChevronsUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { useCategories } from "@/contexts/categories-context";
import type { PurchaseFormValues } from "@/lib/schemas/purchase-schema";

const documentStatusList = ['proforma', 'factura_pendiente', 'factura_recibida', 'factura_validada'];
const paymentStatusList = ['pendiente', 'parcial', 'pagado', 'pagado_adelantado'];

export function StepBasicInfo() {
  const { control, setValue, trigger } = useFormContext<PurchaseFormValues>();
  const { inventoryCategories, costCategories, isLoading, categoriesMap } = useCategories();
  const [openCategoryPopover, setOpenCategoryPopover] = React.useState(false);
  
  const isInventoryPurchase = useWatch({
    control,
    name: "isInventoryPurchase",
  });

  return (
    <div className="space-y-6">
       <FormField
        control={control}
        name="categoriaId"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Categoría *</FormLabel>
            <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    disabled={isLoading}
                  >
                    {isLoading ? "Cargando..." : (field.value ? categoriesMap.get(field.value) : "Selecciona una categoría...")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar categoría..." />
                  <CommandEmpty>No se encontró la categoría.</CommandEmpty>
                  <CommandList>
                    <CommandGroup heading="Gastos Generales">
                      {costCategories.map((cat) => (
                        <CommandItem
                          value={cat.name}
                          key={cat.id}
                          onSelect={() => {
                            setValue("categoriaId", cat.id);
                            setValue("isInventoryPurchase", false);
                            trigger("categoriaId");
                            setOpenCategoryPopover(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", cat.id === field.value ? "opacity-100" : "opacity-0")} />
                          {cat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Compras de Inventario">
                      {inventoryCategories.map((cat) => (
                        <CommandItem
                          value={cat.name}
                          key={cat.id}
                          onSelect={() => {
                            setValue("categoriaId", cat.id);
                            setValue("isInventoryPurchase", true);
                            trigger("categoriaId");
                            setOpenCategoryPopover(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", cat.id === field.value ? "opacity-100" : "opacity-0")} />
                          {cat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField control={control} name="concepto" render={({ field }) => (
        <FormItem>
          <FormLabel>Concepto *</FormLabel>
          <FormControl><Input placeholder="Ej: Compra de botellas, Licencia Adobe" {...field} value={field.value ?? ""} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={control} name="invoiceNumber" render={({ field }) => (
          <FormItem>
              <FormLabel>Nº de Factura / Proforma (Opcional)</FormLabel>
              <FormControl><Input placeholder="Ej: F2024-123" {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
          </FormItem>
      )} />

      {!isInventoryPurchase && (
         <FormField
            control={control}
            name="monto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe Total (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={control} name="fechaEmision" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Fecha Emisión</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="fechaVencimiento" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento (Opcional)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={control} name="estadoDocumento" render={({ field }) => (
          <FormItem><FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4"/>Estado Documento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{documentStatusList.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="estadoPago" render={({ field }) => (
          <FormItem><FormLabel className="flex items-center gap-2"><Wallet className="h-4 w-4"/>Estado Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{paymentStatusList.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
        )} />
      </div>
    </div>
  );
}
