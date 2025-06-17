
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
import { useAuth } from "@/contexts/auth-context"; // Import useAuth

const SINGLE_PRODUCT_NAME = "Santa Brisa 750ml";
const IVA_RATE = 21; // 21%

const orderFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres."),
  visitDate: z.date({ required_error: "La fecha de visita es obligatoria." }),
  outcome: z.enum(["successful", "failed", "follow-up"], { required_error: "Por favor, seleccione un resultado." }),
  clientType: z.enum(clientTypeList as [ClientType, ...ClientType[]]).optional(),
  numberOfUnits: z.coerce.number().positive("El número de unidades debe ser un número positivo.").optional(),
  unitPrice: z.coerce.number().positive("El precio unitario debe ser un número positivo.").optional(),
  orderValue: z.coerce.number().positive("El valor del pedido debe ser positivo.").optional(), // Incluye IVA
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
    if ((data.numberOfUnits && data.unitPrice) && (data.orderValue === undefined || data.orderValue <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El valor del pedido calculado (con IVA) debe ser positivo.",
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
  const { teamMember, userRole } = useAuth(); // Get current user info
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [subtotal, setSubtotal] = React.useState<number | undefined>(undefined);
  const [ivaAmount, setIvaAmount] = React.useState<number | undefined>(undefined);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientName: "",
      visitDate: undefined,
      outcome: undefined,
      clientType: undefined,
      numberOfUnits: undefined,
      unitPrice: undefined,
      orderValue: undefined, // Este será el total con IVA
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
  const numberOfUnits = form.watch("numberOfUnits");
  const unitPrice = form.watch("unitPrice");

  React.useEffect(() => {
    if (outcome === "successful" && typeof numberOfUnits === 'number' && typeof unitPrice === 'number' && numberOfUnits > 0 && unitPrice > 0) {
      const calculatedSubtotal = numberOfUnits * unitPrice;
      const calculatedIvaAmount = calculatedSubtotal * (IVA_RATE / 100);
      const calculatedTotalValue = calculatedSubtotal + calculatedIvaAmount;
      
      form.setValue("orderValue", parseFloat(calculatedTotalValue.toFixed(2)), { shouldValidate: true });
      setSubtotal(parseFloat(calculatedSubtotal.toFixed(2)));
      setIvaAmount(parseFloat(calculatedIvaAmount.toFixed(2)));

    } else if (outcome === "successful") {
       form.setValue("orderValue", undefined);
       setSubtotal(undefined);
       setIvaAmount(undefined);
    }
  }, [numberOfUnits, unitPrice, outcome, form, setSubtotal, setIvaAmount]);

  async function onSubmit(values: OrderFormValues) {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const salesRepName = teamMember?.name || "Usuario Desconocido";

    if (values.outcome === "successful" && values.visitDate && values.orderValue && values.clientType && values.numberOfUnits && values.unitPrice) {
      const numberOfBottles = values.numberOfUnits;

      const newOrder: Order = {
        id: `ORD${Date.now()}`,
        clientName: values.clientName,
        visitDate: format(values.visitDate, "yyyy-MM-dd"),
        clientType: values.clientType,
        products: [SINGLE_PRODUCT_NAME], 
        numberOfUnits: values.numberOfUnits,
        unitPrice: values.unitPrice,
        value: values.orderValue, // Este valor ya incluye IVA
        status: 'Confirmado', 
        salesRep: salesRepName, // Assign logged-in user's name
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

      // Update KPIs related to sales rep only if the user is a SalesRep
      if (userRole === 'SalesRep' && teamMember) {
        const memberIndex = mockTeamMembers.findIndex(m => m.id === teamMember.id);
        if (memberIndex !== -1) {
          mockTeamMembers[memberIndex].bottlesSold = (mockTeamMembers[memberIndex].bottlesSold || 0) + numberOfBottles;
          mockTeamMembers[memberIndex].orders = (mockTeamMembers[memberIndex].orders || 0) + 1;
          mockTeamMembers[memberIndex].visits = (mockTeamMembers[memberIndex].visits || 0) + 1; // Assuming a successful order also counts as a visit for the SalesRep
        }
        
        const kpiVentasEquipo = kpiDataLaunch.find(k => k.id === 'kpi2');
        if (kpiVentasEquipo) kpiVentasEquipo.currentValue += numberOfBottles;
      }

      // Update global KPIs regardless of user role
      const kpiVentasTotales = kpiDataLaunch.find(k => k.id === 'kpi1');
      if (kpiVentasTotales) kpiVentasTotales.currentValue += numberOfBottles;

      if (values.nombreFiscal && values.nombreFiscal.trim() !== "") { // New account
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
            <p>Pedido {newOrder.id} para {newOrder.clientName} (por {salesRepName}) registrado exitosamente. Datos actualizados.</p>
          </div>
        ),
        variant: "default",
      });

    } else if (values.outcome === "failed" || values.outcome === "follow-up") {
        // If the outcome is not successful, we might still want to count a visit for a SalesRep
        if (userRole === 'SalesRep' && teamMember && values.outcome === "failed") {
            const memberIndex = mockTeamMembers.findIndex(m => m.id === teamMember.id);
            if (memberIndex !== -1) {
                 // mockTeamMembers[memberIndex].visits = (mockTeamMembers[memberIndex].visits || 0) + 1;
            }
        }
      console.log(values); 
      toast({
        title: "¡Formulario Enviado!",
        description: (
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
            <p>Visita al cliente {values.clientName} (por {salesRepName}) registrada (Resultado: {values.outcome}).</p>
          </div>
        ),
        variant: "default",
      });
    }

    form.reset();
    form.setValue("visitDate", undefined);
    form.setValue("outcome", undefined);
    form.setValue("clientType", undefined);
    form.setValue("numberOfUnits", undefined);
    form.setValue("unitPrice", undefined);
    form.setValue("orderValue", undefined);
    setSubtotal(undefined);
    setIvaAmount(undefined);
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

                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <Input value={SINGLE_PRODUCT_NAME} readOnly disabled className="bg-muted/50" />
                    <FormDescription>Actualmente solo se gestiona el producto "{SINGLE_PRODUCT_NAME}".</FormDescription>
                  </FormItem>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="numberOfUnits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Unidades ({SINGLE_PRODUCT_NAME})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="p. ej., 100"
                              {...field}
                              onChange={event => {
                                const val = event.target.value;
                                field.onChange(val === "" ? undefined : parseInt(val, 10));
                              }}
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
                          <FormLabel>Precio Unitario (€ sin IVA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="p. ej., 15.50"
                              {...field}
                               onChange={event => {
                                const val = event.target.value;
                                field.onChange(val === "" ? undefined : parseFloat(val));
                              }}
                              value={field.value === undefined ? '' : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormItem>
                    <FormLabel>Subtotal (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        readOnly
                        disabled
                        className="bg-muted/50"
                        value={subtotal === undefined ? '' : subtotal.toFixed(2)}
                        placeholder="Cálculo automático"
                      />
                    </FormControl>
                  </FormItem>

                  <FormItem>
                    <FormLabel>IVA ({IVA_RATE}%) (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        readOnly
                        disabled
                        className="bg-muted/50"
                        value={ivaAmount === undefined ? '' : ivaAmount.toFixed(2)}
                        placeholder="Cálculo automático"
                      />
                    </FormControl>
                  </FormItem>
                  
                  <FormField
                    control={form.control}
                    name="orderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total del Pedido (€ con IVA)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Cálculo automático"
                            {...field}
                            readOnly
                            disabled
                            className="bg-muted/50"
                            value={field.value === undefined ? '' : field.value.toFixed(2)}
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
                <Button type="submit" className="w-full" disabled={isSubmitting || !teamMember}>
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


    
