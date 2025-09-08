

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamMember, TeamMemberFormValues as TeamMemberFormValuesType, AmbassadorSettings, Account } from "@/types";
import { userRolesList } from "@/lib/data";
import { Loader2, UserPlus, Info } from "lucide-react";
import { getTeamMembersFS } from "@/services/team-member-service";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getAccountsFS } from "@/services/account-service";
import { RolUsuario as UserRole } from "@ssot";

const conditionSchema = z.object({
  pago_apertura: z.coerce.number().min(0),
  bonus_segundo_pedido: z.coerce.number().min(0),
  comision_inicial: z.coerce.number().min(0),
  comision_indefinida: z.coerce.number().min(0),
  min_pedido: z.coerce.number().min(0),
  segundo_pedido_plazo_dias: z.coerce.number().min(0),
});

const settingsSchema = z.object({
  horeca: conditionSchema.optional(),
  distribuidor_mediano: conditionSchema.optional(),
  distribuidor_grande: conditionSchema.optional(),
  distribuidor_top: conditionSchema.optional(),
});


const editUserFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  role: z.enum(userRolesList as [UserRole, ...UserRole[]], { required_error: "El rol es obligatorio." }),
  monthlyTargetAccounts: z.coerce.number().positive("El objetivo de cuentas debe ser un número positivo.").optional(),
  monthlyTargetVisits: z.coerce.number().positive("El objetivo de visitas debe ser un número positivo.").optional(),
  avatarUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal("")),
  authUid: z.string().optional(),
  email: z.string().email().optional(),
  liderId: z.string().optional(),
  uses_custom_conditions: z.boolean().default(false),
  condiciones_personalizadas: settingsSchema.optional(),
  accountId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "SalesRep") {
    if (data.monthlyTargetAccounts === undefined || data.monthlyTargetAccounts <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El objetivo mensual de cuentas es obligatorio y debe ser positivo para un Representante de Ventas.", path: ["monthlyTargetAccounts"] });
    }
    if (data.monthlyTargetVisits === undefined || data.monthlyTargetVisits <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El objetivo mensual de visitas es obligatorio y debe ser positivo para un Representante de Ventas.", path: ["monthlyTargetVisits"] });
    }
  }
  if (['Clavadista', 'Distributor', 'Admin', 'Líder Clavadista'].includes(data.role)) {
    data.monthlyTargetAccounts = undefined;
    data.monthlyTargetVisits = undefined;
  }
   if (data.role !== 'Clavadista') {
    data.liderId = undefined;
  }
  if (data.role === 'Distributor' && !data.accountId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe asociar una cuenta de distribuidor.", path: ["accountId"] });
  }
});

export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserDialogProps {
  user: TeamMember | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TeamMemberFormValuesType, userId: string) => void;
}

const customerTypeLabels: Record<keyof AmbassadorSettings, string> = {
    horeca: "HORECA",
    distribuidor_mediano: "Distribuidor Mediano",
    distribuidor_grande: "Distribuidor Grande",
    distribuidor_top: "Distribuidor Top",
};

export default function EditUserDialog({ user, isOpen, onOpenChange, onSave }: EditUserDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [lideres, setLideres] = React.useState<TeamMember[]>([]);
  const [distributorAccounts, setDistributorAccounts] = React.useState<any[]>([]);


  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { name: "", email: "", role: undefined, monthlyTargetAccounts: undefined, monthlyTargetVisits: undefined, avatarUrl: "", authUid: "", liderId: undefined, uses_custom_conditions: false, condiciones_personalizadas: {}, accountId: undefined },
  });

  const selectedRole = form.watch("role");
  const useCustomConditions = form.watch("uses_custom_conditions");

  React.useEffect(() => {
    async function loadLideres() {
        if (selectedRole === 'Clavadista') {
            const fetchedLideres = await getTeamMembersFS(['Líder Clavadista']);
            setLideres(fetchedLideres);
        } else {
            setLideres([]);
        }
    }
    async function loadDistributors() {
        if (selectedRole === 'Distributor') {
            const accounts = await getAccountsFS();
            setDistributorAccounts(accounts.filter(acc => acc.type === 'Distribuidor' || acc.type === 'Importador'));
        } else {
            setDistributorAccounts([]);
        }
    }
    if(isOpen) {
      loadLideres();
      loadDistributors();
    }
  }, [selectedRole, isOpen]);

  React.useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        monthlyTargetAccounts: user.role === 'SalesRep' ? user.monthlyTargetAccounts : undefined,
        monthlyTargetVisits: user.role === 'SalesRep' ? user.monthlyTargetVisits : undefined,
        avatarUrl: user.avatarUrl || "",
        authUid: user.authUid || user.id,
        liderId: user.liderId || undefined,
        uses_custom_conditions: !!user.condiciones_personalizadas,
        condiciones_personalizadas: user.condiciones_personalizadas || {},
        accountId: user.accountId || undefined,
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (data: EditUserFormValues) => {
    if (!user) return;
    setIsSaving(true);
    
    const dataToSave: TeamMemberFormValuesType = {
        name: data.name,
        email: user.email,
        role: data.role,
        monthlyTargetAccounts: data.monthlyTargetAccounts,
        monthlyTargetVisits: data.monthlyTargetVisits,
        avatarUrl: data.avatarUrl,
        authUid: user.authUid || user.id,
        liderId: data.liderId,
        uses_custom_conditions: data.uses_custom_conditions,
        condiciones_personalizadas: data.uses_custom_conditions ? data.condiciones_personalizadas : undefined,
        accountId: data.accountId,
    };
    await new Promise(resolve => setTimeout(resolve, 700));
    onSave(dataToSave, user.id);
    setIsSaving(false);
    onOpenChange(false); 
  };

  if (!user) return null;

  const getRoleDisplayName = (role: UserRole): string => {
    const roleMap: Record<UserRole, string> = {
        'Admin': 'Admin',
        'SalesRep': 'Rep. Ventas',
        'Distributor': 'Distribuidor',
        'Clavadista': 'Clavadista',
        'Líder Clavadista': 'Líder Clavadista'
    };
    return roleMap[role];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario: {user.name}</DialogTitle>
          <DialogDescription>
            Modifique los detalles del usuario. El correo electrónico no se puede cambiar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Nombre y apellidos" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico (Login)</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} disabled /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rol del Usuario</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl><SelectContent>{userRolesList.map(roleValue => (<SelectItem key={roleValue} value={roleValue}>{getRoleDisplayName(roleValue)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="avatarUrl" render={({ field }) => (<FormItem><FormLabel>URL del Avatar (Opcional)</FormLabel><FormControl><Input placeholder="https://example.com/avatar.png" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
            
            {selectedRole === 'Distributor' && (
              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta de Distribuidor Asociada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {distributorAccounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {selectedRole === "SalesRep" && (
              <>
                <FormField control={form.control} name="monthlyTargetAccounts" render={({ field }) => (<FormItem><FormLabel>Objetivo Mensual de Cuentas</FormLabel><FormControl><Input type="number" placeholder="p. ej., 20" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="monthlyTargetVisits" render={({ field }) => (<FormItem><FormLabel>Objetivo Mensual de Visitas</FormLabel><FormControl><Input type="number" placeholder="p. ej., 80" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
              </>
            )}

            {(selectedRole === "Clavadista" || selectedRole === "Líder Clavadista") && (
                <>
                <Separator/>
                <h3 className="text-md font-medium flex items-center gap-2 pt-2"><UserPlus/> Opciones de Clavadista</h3>
                </>
            )}

            {selectedRole === "Clavadista" && (
                <FormField control={form.control} name="liderId" render={({ field }) => (<FormItem><FormLabel>Líder de Equipo (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? "##NONE##"}><FormControl><SelectTrigger><SelectValue placeholder="Asignar un líder..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="##NONE##">Sin líder</SelectItem>{lideres.map(lider => (<SelectItem key={lider.id} value={lider.id}>{lider.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            )}

             {(selectedRole === "Clavadista" || selectedRole === "Líder Clavadista") && (
              <div className="space-y-4 rounded-lg border p-4">
                  <FormField
                      control={form.control}
                      name="uses_custom_conditions"
                      render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                  <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                  />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                  <FormLabel>Usar Condiciones Personalizadas</FormLabel>
                                  <FormMessage/>
                                  <p className="text-sm text-muted-foreground">
                                    Activa esta opción para sobreescribir las condiciones globales solo para este usuario.
                                  </p>
                              </div>
                          </FormItem>
                      )}
                  />

                  {useCustomConditions && (
                      <div className="space-y-6 pl-2 pt-4 border-t">
                          {(Object.keys(customerTypeLabels) as Array<keyof typeof customerTypeLabels>).map((key) => {
                              const fieldName = key;
                              return (
                                  <div key={fieldName} className="space-y-3 p-3 border rounded-md bg-background">
                                      <h3 className="font-semibold text-base">{customerTypeLabels[fieldName]}</h3>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                          <FormField control={form.control} name={`condiciones_personalizadas.${fieldName}.pago_apertura`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Fee Apertura (€)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField control={form.control} name={`condiciones_personalizadas.${fieldName}.bonus_segundo_pedido`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Bonus 2º Pedido (€)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                                          <FormField control={form.control} name={`condiciones_personalizadas.${fieldName}.min_pedido`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Cajas Mín.</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField control={form.control} name={`condiciones_personalizadas.${fieldName}.comision_inicial`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Comisión Inicial (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                                          <FormField control={form.control} name={`condiciones_personalizadas.${fieldName}.comision_indefinida`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Comisión Indef. (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)}/></FormControl><FormMessage /></FormItem>)} />
                                          <FormField control={form.control} name={`condiciones_personalizadas.${fieldName}.segundo_pedido_plazo_dias`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Plazo 2º Ped. (días)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </div>
          )}


            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving || !form.formState.isDirty}><>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : ("Guardar Cambios")}</></Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
