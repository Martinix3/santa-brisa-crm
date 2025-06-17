
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { mockOrders, mockTeamMembers, clientTypeList } from "@/lib/data";
import { kpiDataLaunch } from "@/lib/launch-dashboard-data";
import type { Order, ClientType } from "@/types";

const orderFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  visitDate: z.date({ required_error: "La fecha de visita es obligatoria." }),
  outcome: z.enum(["successful", "failed", "follow-up"], { required_error: "Por favor, seleccione un resultado." }),
  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  productsOrdered: z.string().optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser un número positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser un número positivo.").optional(),
  orderValue: z.coerce.number().positive("El valor del pedido debe ser positivo.").optional(),
  reasonForFailure: z.string().optional(),
  nombreFiscal: z.string().optional(),
  cif: z.string().optional(),
  direccionFiscal: z.string().optional(),
  direccionEntrega: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email("El formato del correo electrónico no es válido.").optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  observacionesAlta: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === "successful") {
    if (!data.clientType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El tipo de cliente es obligatorio para un resultado exitoso.",
        path: ["clientType"],
      });
    }
    if (!data.productsOrdered || data.productsOrdered.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los productos pedidos son obligatorios para un resultado exitoso.",
        path: ["productsOrdered"],
      });
    }
    if (data.numberOfUnits === undefined || data.numberOfUnits <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de unidades es obligatorio y debe ser positivo para un resultado exitoso.",
        path: ["numberOfUnits"],
      });
    }
    if (data.unitPrice === undefined || data.unitPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio unitario es obligatorio y debe ser positivo para un resultado exitoso.",
        path: ["unitPrice"],
      });
    }
    if (data.orderValue === undefined || data.orderValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El valor del pedido es obligatorio y debe ser positivo para un resultado exitoso.",
        path: ["orderValue"],
      });
    }
    // Billing information
    if (!data.nombreFiscal || data.nombreFiscal.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El nombre fiscal es obligatorio.", path: ["nombreFiscal"] });
    }
    if (!data.cif || data.cif.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El CIF es obligatorio.", path: ["cif"] });
    }
    if (!data.direccionFiscal || data.direccionFiscal.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La dirección fiscal es obligatoria.", path: ["direccionFiscal"] });
    }
    if (!data.direccionEntrega || data.direccionEntrega.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La dirección de entrega es obligatoria.", path: ["direccionEntrega"] });
    }
    if (!data.contactoNombre || data.contactoNombre.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El nombre de contacto es obligatorio.", path: ["contactoNombre"] });
    }
    if (!data.contactoCorreo || data.contactoCorreo.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El correo de contacto es obligatorio.", path: ["contactoCorreo"] });
    } else {
        const emailValidation = z.string().email().safeParse(data.contactoCorreo);
        if (!emailValidation.success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El formato del correo de contacto no es válido.", path: ["contactoCorreo"] });
        }
    }
    if (!data.contactoTelefono || data.contactoTelefono.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El teléfono de contacto es obligatorio.", path: ["contactoTelefono"] });
    }
  }
  if (data.outcome === "failed" && (!data.reasonForFailure || data.reasonForFailure.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El motivo del fallo es obligatorio para un resultado fallido.",
      path: ["reasonForFailure"],
    });
  }
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderFormPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientName: "",
      visitDate: undefined,
      outcome: undefined,
      clientType: undefined,
      productsOrdered: "",
      numberOfUnits: undefined,
      unitPrice: undefined,
      orderValue: undefined,
      reasonForFailure: "",
      nombreFiscal: "",
      cif: "",
      direccionFiscal: "",
      direccionEntrega: "",
      contactoNombre: "",
      contactoCorreo: "",
      contactoTelefono: "",
      observacionesAlta: "",
      notes: "",
    },
  });

  const outcome = form.watch("outcome");

  async function onSubmit(values: OrderFormValues) {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (values.outcome === "successful" && values.visitDate && values.orderValue && values.productsOrdered && values.clientType && values.numberOfUnits && values.unitPrice) {
      const orderedProductsList = values.productsOrdered.split(/[,;\n]+/).map(p => p.trim()).filter(p => p.length > 0);
      const numberOfBottles = orderedProductsList.length; // This KPI logic remains for now

      const newOrder: Order = {
        id: `ORD${Date.now()}`,
        clientName: values.clientName,
        visitDate: format(values.visitDate, "yyyy-MM-dd"),
        clientType: values.clientType,
        products: orderedProductsList,
        numberOfUnits: values.numberOfUnits,
        unitPrice: values.unitPrice,
        value: values.orderValue,
        status: 'Confirmado', 
        salesRep: 'Nico', 
        lastUpdated: format(new Date(), "yyyy-MM-dd"),
        nombreFiscal: values.nombreFiscal,
        cif: values.cif,
        direccionFiscal: values.direccionFiscal,
        direccionEntrega: values.direccionEntrega,
        contactoNombre: values.contactoNombre,
        contactoCorreo: values.contactoCorreo,
        contactoTelefono: values.contactoTelefono,
        observacionesAlta: values.observacionesAlta,
        notes: values.notes,
      };
      mockOrders.unshift(newOrder);

      const salesRepToUpdate = 'Nico';
      const memberIndex = mockTeamMembers.findIndex(m => m.name === salesRepToUpdate);
      if (memberIndex !== -1) {
        mockTeamMembers[memberIndex].bottlesSold += numberOfBottles;
        mockTeamMembers[memberIndex].orders += 1;
        mockTeamMembers[memberIndex].visits += 1;
      }

      const kpiVentasTotales = kpiDataLaunch.find(k => k.id === 'kpi1');
      if (kpiVentasTotales) kpiVentasTotales.currentValue += numberOfBottles;

      const kpiVentasEquipo = kpiDataLaunch.find(k => k.id === 'kpi2');
      if (kpiVentasEquipo) kpiVentasEquipo.currentValue += numberOfBottles;

      if (values.nombreFiscal && values.nombreFiscal.trim() !== "") {
        const kpiCuentasAnual = kpiDataLaunch.find(k => k.id === 'kpi3');
        if (kpiCuentasAnual) kpiCuentasAnual.currentValue += 1;

        const kpiCuentasMensual = kpiDataLaunch.find(k => k.id === 'kpi4');
        if (kpiCuentasMensual) kpiCuentasMensual.currentValue += 1;
      }

      toast({
        title: "¡Pedido Registrado!",
        description: (
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
            <p>Pedido {newOrder.id} para {newOrder.clientName} registrado exitosamente. Datos actualizados.</p>
          </div>
        ),
        variant: "default",
      });

    } else if (values.outcome === "failed" || values.outcome === "follow-up") {
        const salesRepToUpdate = 'Nico';
        const memberIndex = mockTeamMembers.findIndex(m => m.name === salesRepToUpdate);
        if (memberIndex !== -1 && values.outcome === "failed") {
            // mockTeamMembers[memberIndex].visits += 1; // Decide if non-successful also count
        }
      console.log(values); 
      toast({
        title: "¡Formulario Enviado!",
        description: (
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
            <p>Visita al cliente {values.clientName} registrada (Resultado: {values.outcome}).</p>
          </div>
        ),
        variant: "default",
      });
    }

    form.reset();
    form.setValue("visitDate", undefined);
    form.setValue("outcome", undefined);
    form.setValue("clientType", undefined);
    form.setValue("productsOrdered", "");
    form.setValue("numberOfUnits", undefined);
    form.setValue("unitPrice", undefined);
    form.setValue("orderValue", undefined);
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Registrar Visita / Pedido de Cliente</h1>
      <Card className="max-w-2xl mx-auto shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Detalles de la Visita al Cliente</CardTitle>
          <CardDescription>Complete los detalles de la interacción con el cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="p. ej., Café Central" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Visita</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="successful" />
                          </FormControl>
                          <FormLabel className="font-normal">Pedido Exitoso</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="failed" />
                          </FormControl>
                          <FormLabel className="font-normal">Fallido / Sin Pedido</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="follow-up" />
                          </FormControl>
                          <FormLabel className="font-normal">Requiere Seguimiento</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {outcome === "successful" && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Detalles del Pedido</h3>
                    <p className="text-sm text-muted-foreground">Información sobre los productos y valor del pedido.</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="clientType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Cliente</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            {clientTypeList.map((type) => (
                              <FormItem key={type} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value={type} />
                                </FormControl>
                                <FormLabel className="font-normal">{type}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productsOrdered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Productos Pedidos</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Listar productos y cantidades, separados por coma o nueva línea..." {...field} />
                        </FormControl>
                        <FormDescription>Cada producto o línea contará como una botella para las estadísticas del equipo.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="numberOfUnits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Unidades</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="p. ej., 100"
                              {...field}
                              onChange={event => field.onChange(parseInt(event.target.value, 10))}
                              value={field.value === undefined ? '' : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Unitario (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="p. ej., 15.50"
                              {...field}
                              onChange={event => field.onChange(parseFloat(event.target.value))}
                              value={field.value === undefined ? '' : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="orderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total del Pedido (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="p. ej., 250.75"
                            {...field}
                            onChange={event => field.onChange(parseFloat(event.target.value))}
                            value={field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-6" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium">Información de Alta del Cliente</h3>
                    <p className="text-sm text-muted-foreground">Complete estos datos si es un cliente nuevo o necesita actualizar la información. Rellenar el nombre fiscal contará como una nueva cuenta.</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="nombreFiscal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Fiscal</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre legal completo de la empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cif"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIF</FormLabel>
                        <FormControl>
                          <Input placeholder="Número de Identificación Fiscal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="direccionFiscal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección Fiscal</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Calle, número, piso, ciudad, código postal, provincia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="direccionEntrega"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección de Entrega</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Si es diferente a la fiscal: calle, número, piso, ciudad, código postal, provincia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator className="my-4" />
                   <h4 className="text-md font-medium mb-2">Datos de Contacto</h4>
                  <FormField
                    control={form.control}
                    name="contactoNombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="Persona de contacto principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactoCorreo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico de Contacto</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="ejemplo@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactoTelefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono de Contacto</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Número de teléfono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <Separator className="my-4" />
                  <FormField
                    control={form.control}
                    name="observacionesAlta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones (Alta Cliente)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Cualquier detalle adicional para el alta del cliente..." {...field} />
                        </FormControl>
                        <FormDescription>Este campo es opcional.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {outcome === "failed" && (
                <FormField
                  control={form.control}
                  name="reasonForFailure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo del Fallo / Sin Pedido</FormLabel>
                      <FormControl>
                        <Textarea placeholder="p. ej., Precio demasiado alto, ya abastecido..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales Generales</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Cualquier otra información relevante sobre la visita o pedido..." {...field} />
                    </FormControl>
                     <FormDescription>Notas generales sobre la visita, independientemente del resultado.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <CardFooter className="p-0 pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Registro"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
