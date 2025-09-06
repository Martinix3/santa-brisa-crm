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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Trash2, PlusCircle, Calendar as CalendarIcon, Award, Package, Info, Truck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, subDays, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { paymentMethodList, nextActionTypeList, failureReasonList, canalOrigenColocacionList, provincesSpainList } from '@/lib/data';
import { ADMIN_SELF_REGISTER_VALUE, NO_CLAVADISTA_VALUE } from '@/lib/schemas/order-form-schema';
import type { OrderFormValues } from '@/lib/schemas/order-form-schema';
import type { InventoryItem, TeamMember, UserRole, Account } from '@/types';

interface StepDetailsProps {
    form: UseFormReturn<OrderFormValues>;
    handleBack: () => void;
    handleNextStep: () => void;
    availableMaterials: InventoryItem[];
    materialFields: FieldArrayWithId<OrderFormValues, "assignedMaterials", "id">[];
    appendMaterial: (item: { materialId: string; quantity: number | undefined; }) => void;
    removeMaterial: (index: number) => void;
    userRole: UserRole | null;
    salesRepsList: TeamMember[];
    clavadistas: TeamMember[];
    distributorAccounts: Account[];
}

const DIRECT_SALE_VALUE = "##DIRECT##";

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
    clavadistas,
    distributorAccounts
}) => {
  const outcomeWatched = useWatch({ control: form.control, name: 'outcome' });
  const paymentMethodWatched = useWatch({ control: form.control, name: 'paymentMethod' });
  const nextActionTypeWatched = useWatch({ control: form.control, name: 'nextActionType' });
  const failureReasonTypeWatched = useWatch({ control: form.control, name: 'failureReasonType' });
  const watchedMaterials = useWatch({ control: form.control, name: 'assignedMaterials' });

  const isNewClient = useWatch({ control: form.control, name: 'isNewClient' });
  const watchSameAsBilling = useWatch({ control: form.control, name: 'sameAsBilling' });
  
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
               {outcomeWatched === 'successful' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-md font-semibold text-primary">Detalles del Pedido Exitoso</h3>
                  {isNewClient && (
                    <FormField control={form.control} name="distributorId" render={({ field }) => (
                      <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Truck className="h-4 w-4"/>Gestionado Por</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""} >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar distribuidor..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={DIRECT_SALE_VALUE}>Venta Directa (Gestiona Santa Brisa)</SelectItem>
                                <Separator className="my-1"/>
                                {distributorAccounts.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                              Al ser un cliente nuevo, debes asignar quién gestionará sus pedidos.
                          </FormDescription>
                          <FormMessage/>
                      </FormItem>
                    )} />
                  )}
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

           {isNewClient && (
            <>
                <Separator className="!mt-8" />
                <h3 className="text-lg font-semibold text-primary">Información de la Nueva Cuenta</h3>
                <p className="text-sm text-muted-foreground">
                  Completa los datos de facturación y entrega. Son obligatorios si el resultado fue un pedido exitoso.
                </p>

                <Separator/><h3 className="font-semibold text-base mt-2">Datos de Facturación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="nombreFiscal" render={({ field }) => (<FormItem><FormLabel>Nombre Fiscal</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="cif" render={({ field }) => (<FormItem><FormLabel>CIF</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <FormField control={form.control} name="direccionFiscal_street" render={({ field }) => (<FormItem><FormLabel>Calle Fiscal</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <FormField control={form.control} name="direccionFiscal_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="direccionFiscal_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="direccionFiscal_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="direccionFiscal_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                
                <Separator/><h3 className="font-semibold text-base mt-2">Datos de Entrega</h3>
                <FormField control={form.control} name="sameAsBilling" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">La dirección de entrega es la misma que la de facturación</FormLabel></FormItem>
                )} />

                {!watchSameAsBilling && (
                    <div className="space-y-4 pt-2 border-l-2 pl-4 border-primary">
                        <FormField control={form.control} name="direccionEntrega_street" render={({ field }) => (<FormItem><FormLabel>Calle Entrega</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <FormField control={form.control} name="direccionEntrega_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionEntrega_postalCode" render={({ field }) => (<FormItem><FormLabel>C.P.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionEntrega_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="direccionEntrega_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                )}
                <Separator/><h3 className="font-semibold text-base mt-2">Datos de Contacto (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactoNombre" render={({ field }) => (<FormItem><FormLabel>Nombre Contacto</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="contactoTelefono" render={({ field }) => (<FormItem><FormLabel>Teléfono Contacto</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <FormField control={form.control} name="contactoCorreo" render={({ field }) => (<FormItem><FormLabel>Email Contacto</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="observacionesAlta" render={({ field }) => (<FormItem><FormLabel>Observaciones sobre el Alta</FormLabel><FormControl><Textarea placeholder="Ej: Condiciones especiales acordadas..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </>
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
