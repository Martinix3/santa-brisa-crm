
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SendHorizonal, Package, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { sampleRequestPurposeList, provincesSpainList } from "@/lib/data";
import type { Account, SampleRequestPurpose, SampleRequestFormValues, TeamMember } from "@/types";
import { getAccountsFS } from "@/services/account-service";
import { addSampleRequestFS } from "@/services/sample-request-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { Separator } from "@/components/ui/separator";


const NEW_CLIENT_ACCOUNT_ID_PLACEHOLDER = "##NEW_CLIENT##";

const sampleRequestFormSchema = z.object({
  requesterId: z.string().optional(),
  clientStatus: z.enum(["new", "existing"], { required_error: "Debe indicar si la muestra es para una cuenta nueva o existente." }),
  accountId: z.string().optional(),
  clientName: z.string().min(2, "El nombre de la cuenta debe tener al menos 2 caracteres."),
  purpose: z.enum(sampleRequestPurposeList as [SampleRequestPurpose, ...SampleRequestPurpose[]], { required_error: "Debe seleccionar un propósito." }),
  numberOfSamples: z.coerce.number().min(1, "Debe solicitar al menos 1 muestra.").max(50, "No se pueden solicitar más de 50 muestras a la vez."),
  justificationNotes: z.string().min(10, "La justificación debe tener al menos 10 caracteres."),
  shippingAddress_street: z.string().optional(),
  shippingAddress_number: z.string().optional(),
  shippingAddress_city: z.string().optional(),
  shippingAddress_province: z.string().optional(),
  shippingAddress_postalCode: z.string().optional(),
  shippingAddress_country: z.string().optional().default("España"),
}).superRefine((data, ctx) => {
    if (data.clientStatus === 'new') {
        const shippingFields = [data.shippingAddress_street, data.shippingAddress_city, data.shippingAddress_province, data.shippingAddress_postalCode];
        const someShippingFieldFilled = shippingFields.some(field => field && field.trim() !== "");
        if (someShippingFieldFilled) {
            if (!data.shippingAddress_street?.trim()) ctx.addIssue({ path: ["shippingAddress_street"], message: "Calle es obligatoria si se rellena la dirección de envío." });
            if (!data.shippingAddress_city?.trim()) ctx.addIssue({ path: ["shippingAddress_city"], message: "Ciudad es obligatoria." });
            if (!data.shippingAddress_province?.trim()) ctx.addIssue({ path: ["shippingAddress_province"], message: "Provincia es obligatoria." });
            if (!data.shippingAddress_postalCode?.trim()) ctx.addIssue({ path: ["shippingAddress_postalCode"], message: "Código postal es obligatorio." });
        }
    }
});

export default function RequestSamplePage() {
  const { toast } = useToast();
  const { teamMember, userRole } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [requestersList, setRequestersList] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const promises = [getAccountsFS()];
        if (userRole === 'Admin') {
            promises.push(getTeamMembersFS(['SalesRep', 'Clavadista']));
        }
        const [fetchedAccounts, fetchedRequesters] = await Promise.all(promises);
        setAllAccounts(fetchedAccounts as Account[]);
        if(fetchedRequesters) {
            setRequestersList(fetchedRequesters as TeamMember[]);
        }
      } catch (error) {
        console.error("Error loading data for sample request form:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los datos necesarios.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast, userRole]);


  const form = useForm<SampleRequestFormValues>({
    resolver: zodResolver(sampleRequestFormSchema),
    defaultValues: {
      clientStatus: undefined,
      clientName: "",
      purpose: undefined,
      numberOfSamples: 1,
      justificationNotes: "",
    },
  });

  const clientStatusWatched = form.watch("clientStatus");

  const handleExistingClientSelected = (accountId: string) => {
    if (accountId === NEW_CLIENT_ACCOUNT_ID_PLACEHOLDER) {
      form.setValue("accountId", undefined);
      form.setValue("clientName", "");
      form.setValue("clientStatus", "new");
      return;
    }
    const selectedAccount = allAccounts.find(acc => acc.id === accountId);
    if (selectedAccount) {
      form.setValue("clientName", selectedAccount.name, { shouldValidate: true });
      form.setValue("accountId", selectedAccount.id, { shouldValidate: true });
    }
  };

  async function onSubmit(values: SampleRequestFormValues) {
    if (!teamMember) {
      toast({ title: "Error de Usuario", description: "No se pudo identificar tu usuario. Recarga la página.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    let finalRequesterId = teamMember.id;
    let finalRequesterName = teamMember.name;

    if (userRole === 'Admin' && values.requesterId && values.requesterId !== "") {
        const selectedRequester = requestersList.find(r => r.id === values.requesterId);
        if (selectedRequester) {
            finalRequesterId = selectedRequester.id;
            finalRequesterName = selectedRequester.name;
        }
    }

    const dataForService: SampleRequestFormValues & { requesterId: string; requesterName: string } = {
        ...values,
        requesterId: finalRequesterId,
        requesterName: finalRequesterName,
    };

    try {
      await addSampleRequestFS(dataForService);
      toast({
        title: "¡Solicitud Enviada!",
        description: "Tu solicitud de muestras ha sido enviada para su revisión.",
        variant: "default",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting sample request:", error);
      toast({ title: "Error al Enviar", description: "No se pudo enviar la solicitud.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (!userRole || (userRole !== 'Admin' && userRole !== 'SalesRep' && userRole !== 'Clavadista')) {
     return <Card><CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader><CardContent><p>No tienes permiso para ver esta sección.</p></CardContent></Card>
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <SendHorizonal className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Solicitar Muestras de Producto</h1>
      </header>
      <Card className="max-w-2xl mx-auto shadow-subtle">
        <CardHeader>
          <CardTitle>Formulario de Solicitud</CardTitle>
          <CardDescription>Completa los detalles para solicitar muestras. Todas las solicitudes serán revisadas por un administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

             {userRole === 'Admin' && (
                <FormField
                    control={form.control}
                    name="requesterId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary"/> Solicitar en nombre de (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                            <SelectTrigger disabled={isLoading}>
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
                name="clientStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿La muestra es para una cuenta nueva o existente?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="new" /></FormControl>
                          <FormLabel className="font-normal">Para Cuenta Nueva</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="existing" /></FormControl>
                          <FormLabel className="font-normal">Para Cuenta Existente</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {clientStatusWatched === 'existing' ? (
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleccionar Cuenta Existente</FormLabel>
                      <Select onValueChange={(value) => handleExistingClientSelected(value)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger disabled={isLoading}>
                            <SelectValue placeholder={isLoading ? "Cargando cuentas..." : "Buscar cuenta..."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NEW_CLIENT_ACCOUNT_ID_PLACEHOLDER}>--- Registrar como Cuenta Nueva ---</SelectItem>
                          {allAccounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>{account.name} ({account.cif || 'Sin CIF'})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Cuenta/Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del local o cliente potencial" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            {clientStatusWatched === 'new' && (
                <>
                  <Separator className="my-4"/>
                  <div className="space-y-1">
                      <h3 className="text-md font-medium">Dirección de Envío (Opcional)</h3>
                      <p className="text-sm text-muted-foreground">
                          Si conoces la dirección de envío para esta nueva cuenta, puedes añadirla aquí para facilitar el envío.
                      </p>
                  </div>
                   <FormField control={form.control} name="shippingAddress_street" render={({ field }) => (<FormItem><FormLabel>Calle</FormLabel><FormControl><Input placeholder="Ej: Calle Principal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="shippingAddress_number" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="Ej: 123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress_postalCode" render={({ field }) => (<FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input placeholder="Ej: 28001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Ej: Madrid" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress_province" render={({ field }) => (<FormItem><FormLabel>Provincia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger></FormControl><SelectContent>{provincesSpainList.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                  <Separator className="my-4"/>
                </>
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
                      <Input
                        type="number"
                        {...field}
                        value={field.value === undefined || isNaN(field.value) ? '' : field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
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

              <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando Solicitud...</> : 'Enviar Solicitud de Muestras'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    