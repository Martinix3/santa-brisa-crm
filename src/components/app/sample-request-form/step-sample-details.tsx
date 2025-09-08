import * as React from 'react';
import { useWatch } from 'react-hook-form';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Package, Users } from 'lucide-react';
import type { useSampleRequestWizard } from '@/hooks/use-sample-request-wizard';
import { PROPOSITOS_MUESTRA as sampleRequestPurposeList, PROVINCIAS_ES as provincesSpainList } from "@ssot";

type WizardHookReturn = ReturnType<typeof useSampleRequestWizard>;

interface StepSampleDetailsProps extends Pick<WizardHookReturn, 'form' | 'handleBack' | 'handleNextStep' | 'userRole' | 'requestersList'> {}

export const StepSampleDetails: React.FC<StepSampleDetailsProps> = ({ 
    form, 
    handleBack, 
    handleNextStep, 
    userRole,
    requestersList
}) => {
  const isNewClient = useWatch({ control: form.control, name: 'isNewClient' });

  return (
    <>
      <CardHeader>
          <CardTitle>Paso 2: Detalles de la Solicitud</CardTitle>
          <CardDescription>Completa la información sobre el propósito y la cantidad de muestras.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {userRole === 'Admin' && (
            <FormField
                control={form.control}
                name="requesterId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary"/> Solicitar en nombre de (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Yo mismo (Admin)" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {requestersList.map(req => (
                            <SelectItem key={req.id} value={req.id}>{req.name} ({req.role})</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormDescription>Si se deja en blanco, la solicitud se registrará a tu nombre.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Propósito de la Muestra</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccionar un propósito..." /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sampleRequestPurposeList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="numberOfSamples"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Package className="mr-2 h-4 w-4"/>Cantidad de Muestras</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="justificationNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Justificación / Notas</FormLabel>
                <FormControl>
                  <Textarea placeholder="Explica brevemente por qué se necesita la muestra, el potencial del cliente, etc." {...field} />
                </FormControl>
                <FormDescription>Esta información ayudará al administrador a tomar una decisión.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
        />
        {isNewClient && (
            <>
                <Separator className="my-4"/>
                <div className="space-y-1">
                    <h3 className="text-md font-medium">Dirección de Envío*</h3>
                    <p className="text-sm text-muted-foreground">
                        La dirección es obligatoria para el envío de muestras a nuevos clientes.
                    </p>
                </div>
                <FormField control={form.control} name="shippingAddress_street" render={({ field }) => (<FormItem><FormLabel>Calle *</FormLabel><FormControl><Input placeholder="Ej: Calle Principal" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="shippingAddress_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="Ej: 123" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="shippingAddress_postalCode" render={({ field }) => (<FormItem><FormLabel>Cód. Postal *</FormLabel><FormControl><Input placeholder="Ej: 28001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="shippingAddress_city" render={({ field }) => (<FormItem><FormLabel>Ciudad *</FormLabel><FormControl><Input placeholder="Ej: Madrid" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="shippingAddress_province" render={({ field }) => (<FormItem><FormLabel>Provincia *</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
            </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
          <Button type="button" onClick={handleNextStep}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </CardFooter>
    </>
  );
};
