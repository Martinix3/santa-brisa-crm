
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
import { Loader2, SendHorizonal, Package } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { sampleRequestPurposeList } from "@/lib/data";
import type { Account, SampleRequestPurpose, SampleRequestFormValues } from "@/types";
import { getAccountsFS } from "@/services/account-service";
import { addSampleRequestFS } from "@/services/sample-request-service";

const NEW_CLIENT_ACCOUNT_ID_PLACEHOLDER = "##NEW_CLIENT##";

const sampleRequestFormSchema = z.object({
  clientStatus: z.enum(["new", "existing"], { required_error: "Debe indicar si es un cliente nuevo o existente." }),
  accountId: z.string().optional(),
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  purpose: z.enum(sampleRequestPurposeList as [SampleRequestPurpose, ...SampleRequestPurpose[]], { required_error: "Debe seleccionar un propósito." }),
  numberOfSamples: z.coerce.number().min(1, "Debe solicitar al menos 1 muestra.").max(50, "No se pueden solicitar más de 50 muestras a la vez."),
  justificationNotes: z.string().min(10, "La justificación debe tener al menos 10 caracteres."),
});

export default function RequestSamplePage() {
  const { toast } = useToast();
  const { teamMember, userRole } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = React.useState(true);

  React.useEffect(() => {
    async function loadAccountsData() {
      setIsLoadingAccounts(true);
      try {
        const fetchedAccounts = await getAccountsFS();
        setAllAccounts(fetchedAccounts);
      } catch (error) {
        console.error("Error loading accounts:", error);
        toast({ title: "Error al Cargar Cuentas", description: "No se pudieron cargar las cuentas de clientes.", variant: "destructive" });
      } finally {
        setIsLoadingAccounts(false);
      }
    }
    loadAccountsData();
  }, [toast]);

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
    try {
      await addSampleRequestFS({
        ...values,
        requesterId: teamMember.id,
        requesterName: teamMember.name,
      });
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
              <FormField
                control={form.control}
                name="clientStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿La muestra es para un cliente nuevo o existente?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="new" /></FormControl>
                          <FormLabel className="font-normal">Cliente Nuevo</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="existing" /></FormControl>
                          <FormLabel className="font-normal">Cliente Existente</FormLabel>
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
                      <FormLabel>Seleccionar Cliente Existente</FormLabel>
                      <Select onValueChange={(value) => handleExistingClientSelected(value)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger disabled={isLoadingAccounts}>
                            <SelectValue placeholder={isLoadingAccounts ? "Cargando cuentas..." : "Buscar cliente..."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NEW_CLIENT_ACCOUNT_ID_PLACEHOLDER}>--- Registrar como Cliente Nuevo ---</SelectItem>
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
                      <FormLabel>Nombre del Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del local o cliente potencial" {...field} />
                      </FormControl>
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
                      <Input
                        type="number"
                        {...field}
                        value={field.value === undefined || isNaN(field.value) ? '' : field.value}
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando Solicitud...</> : 'Enviar Solicitud de Muestras'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
