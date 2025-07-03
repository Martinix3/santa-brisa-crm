import * as React from 'react';
import { useWatch, type UseFormReturn, type FieldArrayWithId } from 'react-hook-form';
import { CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Trash2, PlusCircle, Calendar as CalendarIcon, Award, Package, Info } from 'lucide-react';
import { format, subDays, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { paymentMethodList, nextActionTypeList, failureReasonList, canalOrigenColocacionList } from '@/lib/data';
import { ADMIN_SELF_REGISTER_VALUE, NO_CLAVADISTA_VALUE } from '@/lib/schemas/order-form-schema';
import type { OrderFormValues } from '@/lib/schemas/order-form-schema';
import type { PromotionalMaterial, TeamMember, UserRole } from '@/types';

interface StepDetailsProps {
    form: UseFormReturn<OrderFormValues>;
    handleBack: () => void;
    handleNextStep: () => void;
    availableMaterials: PromotionalMaterial[];
    materialFields: FieldArrayWithId<OrderFormValues, "assignedMaterials", "id">[];
    appendMaterial: (item: { materialId: string; quantity: number | undefined; }) => void;
    removeMaterial: (index: number) => void;
    userRole: UserRole | null;
    salesRepsList: TeamMember[];
    clavadistas: TeamMember[];
}

export const StepDetails: React.FC<StepDetailsProps> = ({ 
    form, 
    handleBack, 
    handleNextStep, 
    availableMaterials, 
    materialFields, 
    appendMaterial, 
    removeMaterial, 
    userRole, 
    salesRepsList,
    clavadistas
}) => {
  const outcomeWatched = useWatch({ control: form.control, name: 'outcome' });
  const paymentMethodWatched = useWatch({ control: form.control, name: 'paymentMethod' });
  const nextActionTypeWatched = useWatch({ control: form.control, name: 'nextActionType' });
  const failureReasonTypeWatched = useWatch({ control: form.control, name: 'failureReasonType' });
  const watchedMaterials = useWatch({ control: form.control, name: 'assignedMaterials' });

  React.useEffect(() => {
    if (watchedMaterials) {
        watchedMaterials.forEach((item, index) => {
            if (!item.quantity || !item.materialId) return;

            const material = availableMaterials.find(m => m.id === item.materialId);
            if (material && material.stock < item.quantity) {
                form.setError(`assignedMaterials.${index}.quantity`, {
                    type: 'manual',
                    message: `Stock: ${material.stock}. Pides: ${item.quantity}.`
                });
            } else {
                form.clearErrors(`assignedMaterials.${index}.quantity`);
            }
        });
    }
  }, [watchedMaterials, availableMaterials, form]);

  const salesRepFieldName = userRole === 'Admin' ? 'selectedSalesRepId' : 'clavadistaSelectedSalesRepId';
  const showSalesRepSelect = (userRole === 'Admin' || userRole === 'Clavadista') && outcomeWatched === 'follow-up';

  return (
    <>
      <CardHeader>
          <CardTitle>Paso 3: Completa los Detalles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="space-y-4">
              <h3 className="text-md font-semibold text-primary">Detalles del Pedido (Opcional si no hay venta)</h3>
              <div className="text-sm text-muted-foreground flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Si la visita resultó en un <strong className="text-foreground">pedido exitoso</strong>, estos campos son obligatorios. Para <strong className="text-foreground">seguimientos</strong> o <strong className="text-foreground">visitas fallidas</strong>, puedes dejarlos en blanco.
                </p>
              </div>
              <FormField control={form.control} name="numberOfUnits" render={({ field }) => (<FormItem><FormLabel>Número de Unidades</FormLabel><FormControl><Input type="number" min={1} step={1} placeholder="Ej: 12" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Precio Unitario (€ sin IVA)</FormLabel><FormControl><Input type="number" min={0.01} step={0.01} placeholder="Ej: 15.50" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar forma de pago"/></SelectTrigger></FormControl><SelectContent>{paymentMethodList.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
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
          
          {outcomeWatched === 'follow-up' && (
              <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-md font-semibold text-primary">Próxima Tarea de Seguimiento</h3>
                  <FormField control={form.control} name="nextActionType" render={({ field }) => (<FormItem><FormLabel>Próxima Acción</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""} ><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar próxima acción..." /></SelectTrigger></FormControl><SelectContent>{nextActionTypeList.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                  {nextActionTypeWatched === 'Opción personalizada' && <FormField control={form.control} name="nextActionCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Acción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>}
                  <FormField
                    control={form.control}
                    name="nextActionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha Próxima Acción (Opcional)</FormLabel>
                         <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    type="button"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                    aria-label="Abrir calendario para seleccionar fecha de próxima acción"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    <span>{field.value ? format(field.value, "PPP", { locale: es }) : "Seleccione fecha"}</span>
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < subDays(new Date(), 1) && !isEqual(date, subDays(new Date(),1))}
                                initialFocus
                                locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showSalesRepSelect && (
                    <FormField
                      control={form.control}
                      name={salesRepFieldName as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asignar Seguimiento a:</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar comercial..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userRole === 'Admin' && <SelectItem value={ADMIN_SELF_REGISTER_VALUE}>Yo mismo/a (Admin)</SelectItem>}
                              {salesRepsList.map((rep) => (
                                <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
              </div>
          )}
          {outcomeWatched === 'failed' && (
              <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-md font-semibold text-primary">Detalles del Fallo</h3>
                    <FormField control={form.control} name="failureReasonType" render={({ field }) => (<FormItem><FormLabel>Motivo del Fallo</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar motivo..."/></SelectTrigger></FormControl><SelectContent>{failureReasonList.map(r=>(<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent></Select><FormMessage/></FormItem>)}/>
                    {failureReasonTypeWatched === 'Otro (especificar)' && <FormField control={form.control} name="failureReasonCustom" render={({ field }) => (<FormItem><FormLabel>Especificar Motivo</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>}
              </div>
          )}
          
          <Separator className="!mt-8" />
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="canalOrigenColocacion"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Canal Origen Colocación</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                          <SelectTrigger>
                          <SelectValue placeholder="Seleccionar canal de origen" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {canalOrigenColocacionList.map((canal) => (
                          <SelectItem key={canal} value={canal}>
                              {canal}
                          </SelectItem>
                          ))}
                      </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="clavadistaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-primary" />Clavadista (Brand Ambassador)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? NO_CLAVADISTA_VALUE} disabled={userRole === 'Clavadista'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar clavadista..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CLAVADISTA_VALUE}>Ninguno</SelectItem>
                        {clavadistas.map((clava: TeamMember) => (
                          <SelectItem key={clava.id} value={clava.id}>{clava.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Si un Brand Ambassador participó en la visita, selecciónalo aquí.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>

          <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                      <FormControl>
                          <Textarea
                              placeholder="Añade cualquier comentario sobre esta interacción..."
                              {...field}
                          />
                      </FormControl>
                      <FormDescription>
                          Estas notas se guardarán con el registro de la interacción.
                      </FormDescription>
                      <FormMessage />
                  </FormItem>
              )}
          />

          <Separator className="!mt-8" />

          <div className="space-y-2">
            <h3 className="text-base font-semibold">Material Promocional</h3>
            <FormDescription>Añade los materiales que se han entregado durante esta interacción (Opcional).</FormDescription>
            
            {materialFields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-md bg-muted/50">
                  <div className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`assignedMaterials.${index}.materialId`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel className="text-xs">Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar material..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableMaterials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (Stock: {m.stock})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`assignedMaterials.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              placeholder="Cant."
                              className="w-24"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
            ))}
            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => appendMaterial({ materialId: '', quantity: undefined })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Material
              </Button>
            </div>
          </div>
      </CardContent>
      <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
          <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardFooter>
    </>
  );
};
