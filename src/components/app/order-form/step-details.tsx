
import * as React from 'react';
import { CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Trash2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { paymentMethodList, nextActionTypeList, failureReasonList } from '@/lib/data';
import { NO_CLAVADISTA_VALUE, ADMIN_SELF_REGISTER_VALUE } from '@/lib/schemas/order-form-schema';

export const StepDetails = ({ form, handleBack, handleNextStep, availableMaterials, materialFields, appendMaterial, removeMaterial, userRole, clavadistas, salesRepsList }) => {
  const outcomeWatched = form.watch("outcome");
  const paymentMethodWatched = form.watch("paymentMethod");

  return (
    <>
      <CardHeader>
          <CardTitle>Paso 3: Completa los Detalles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
          {outcomeWatched === 'successful' && (
              <div className="space-y-4">
                  <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Número de Unidades</FormLabel><FormControl><Input type="number" placeholder="Ej: 12" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario (€ sin IVA)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 15.50" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago"/></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                   {paymentMethodWatched === 'Giro Bancario' && (
                      <FormField control={form.control} name="iban" render={({ field }) => (
                          <FormItem>
                              <FormLabel>IBAN</FormLabel>
                              <FormControl><Input placeholder="ES00 0000 0000 0000 0000 0000" {...field} value={field.value ?? ""} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}/>
                  )}
              </div>
          )}
          {outcomeWatched === 'follow-up' && (
              <div className="space-y-4">
                  <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""} ><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar próxima acción..." /></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                  {form.watch('nextActionType') === 'Opción personalizada' && <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Acción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>}
                  <FormField control={form.control} name="nextActionDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Fecha Próxima Acción (Opcional)</FormLabel> <Popover> <PopoverTrigger asChild> <FormControl> <Button type="button" variant={"outline"} className={cn( "w-full justify-start text-left font-normal", !field.value && "text-muted-foreground" )} > <CalendarIcon className="mr-2 h-4 w-4" /> {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione fecha</span>} </Button> </FormControl> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < subDays(new Date(),1) && !isEqual(date, subDays(new Date(),1))} initialFocus locale={es} /> </PopoverContent> </Popover> <FormMessage /> </FormItem> )}/>
                   {(userRole === 'Admin') && ( <FormField control={form.control} name="selectedSalesRepId" render={({ field }) => ( <FormItem> <FormLabel>Asignar Seguimiento a:</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccionar comercial..." /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value={ADMIN_SELF_REGISTER_VALUE}> Yo mismo/a (Admin) </SelectItem> {salesRepsList.map((rep) => ( <SelectItem key={rep.id} value={rep.id}> {rep.name} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} /> )}
                   {(userRole === 'Clavadista') && ( <FormField control={form.control} name="clavadistaSelectedSalesRepId" render={({ field }) => ( <FormItem> <FormLabel>Asignar Seguimiento a:</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccionar comercial..." /> </SelectTrigger> </FormControl> <SelectContent> {salesRepsList.map((rep) => ( <SelectItem key={rep.id} value={rep.id}> {rep.name} </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} /> )}
              </div>
          )}
            {outcomeWatched === 'failed' && (
              <div className="space-y-4">
                    <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo del Fallo</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar motivo..."/></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(r=>(<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                    {form.watch('failureReasonType') === 'Otro (especificar)' && <FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Motivo</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>}
              </div>
          )}
          <Separator/>
          <FormField
              control={form.control}
              name="assignedMaterials"
              render={() => (
                  <FormItem>
                      <FormLabel>Añadir Material Promocional (Opcional)</FormLabel>
                      <div className="space-y-2">
                          {materialFields.map((field, index) => (
                              <div key={field.id} className="flex items-end gap-2">
                                  <FormField control={form.control} name={`assignedMaterials.${index}.materialId`} render={({ field }) => ( <FormItem className="flex-grow"> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Seleccionar material..."/> </SelectTrigger> </FormControl> <SelectContent> {availableMaterials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (Stock: {m.stock})</SelectItem>)} </SelectContent> </Select> <FormMessage/> </FormItem> )}/>
                                  <FormField control={form.control} name={`assignedMaterials.${index}.quantity`} render={({ field }) => ( <FormItem> <FormControl> <Input type="number" placeholder="Cant." className="w-20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /> </FormControl> <FormMessage/> </FormItem> )}/>
                                  <Button type="button" variant="destructive" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4"/></Button>
                              </div>
                          ))}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => appendMaterial({ materialId: '', quantity: 1 })}>Añadir Material</Button>
                  </FormItem>
              )}
          />
      </CardContent>
      <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
          <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardFooter>
    </>
  );
};
