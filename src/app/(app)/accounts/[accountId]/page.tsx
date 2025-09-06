
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Account, Order, UserRole, AddressDetails, OrderStatus, TeamMember, AccountStatus, CrmEvent } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Building2, Edit, ArrowLeft, AlertTriangle, UserCircle, Mail, Phone, FileText, ShoppingCart, CalendarDays, Send, Info, Euro, Printer, Loader2, MapPin, Link as LinkIcon, CheckCircle, PartyPopper, Award, Truck } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getAccountByIdFS, updateAccountFS, getAccountsFS } from "@/services/account-service";
import { getInteractionsForAccountFS } from "@/services/order-service"; 
import { getEventsForAccountFS } from "@/services/event-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import { calculateCommercialStatus } from "@/lib/account-logic";

type InteractionItem = (Order | CrmEvent) & { itemType: 'order' | 'event' };

const formatAddress = (address?: AddressDetails): string => {
  if (!address) return 'No especificada';

  const parts = [
    (address.street ? `${address.street}${address.number ? `, ${address.number}` : ''}` : null),
    address.city,
    address.province,
    address.postalCode,
    (address.street || address.city || address.postalCode || address.province) && (address.country || 'España')
  ].filter(Boolean); 

  if (parts.length === 0) {
      return 'No especificada';
  }

  return parts.join(',\n');
};

const getInteractionType = (item: InteractionItem): string => {
    if (item.itemType === 'event') {
        const eventItem = item as CrmEvent;
        return `Evento: ${eventItem.name}`;
    }
    const interaction = item as Order;
    const { status, nextActionType, failureReasonType } = interaction;
    if (status === 'Programada') return "Visita Programada";
    if (status === 'Seguimiento') return `Seguimiento (${nextActionType || 'N/D'})`;
    if (status === 'Fallido') return `Visita Fallida (${failureReasonType || 'N/D'})`;
    
    if (status === 'Completado') {
        if (nextActionType || failureReasonType) {
            return `Tarea Completada`;
        }
        return `Interacción Completada`;
    }
    
    return `Pedido (${status})`;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userRole, teamMember, dataSignature, refreshDataSignature } = useAuth();
  const { toast } = useToast();

  const [account, setAccount] = React.useState<Account | null>(null);
  const [calculatedStatus, setCalculatedStatus] = React.useState<AccountStatus | null>(null);
  const [allAccountsForValidation, setAllAccountsForValidation] = React.useState<Account[]>([]);
  const [allTeamMembers, setAllTeamMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [relatedInteractions, setRelatedInteractions] = React.useState<InteractionItem[]>([]);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [distributor, setDistributor] = React.useState<Account | null>(null);
  
  const accountId = params.accountId as string;
  const canEditAccount = userRole === 'Admin' || userRole === 'SalesRep';
  const isAdmin = userRole === 'Admin';


  React.useEffect(() => {
    async function loadAccountData() {
      if (!accountId) {
        setIsLoading(false);
        setAccount(null);
        return;
      }
      setIsLoading(true);
      try {
        // OPTIMIZED: Fetch only the necessary data.
        const [foundAccount, allMembers] = await Promise.all([
          getAccountByIdFS(accountId),
          getTeamMembersFS() // This is usually small and needed for dropdowns
        ]);
        
        if (!foundAccount) {
            setAccount(null);
            setIsLoading(false);
            toast({ title: "Cuenta no encontrada", variant: "destructive" });
            return;
        }

        setAccount(foundAccount);
        setAllTeamMembers(allMembers);

        // Fetch related data only after confirming the account exists
        const [ordersForAccount, eventsForAccount] = await Promise.all([
            getInteractionsForAccountFS(accountId, foundAccount.nombre),
            getEventsForAccountFS(accountId)
        ]);

        if (foundAccount.distributorId) {
            const foundDistributor = await getAccountByIdFS(foundAccount.distributorId);
            setDistributor(foundDistributor || null);
        } else {
            setDistributor(null);
        }

        const combinedInteractions: InteractionItem[] = [
            ...ordersForAccount.map(o => ({ ...o, itemType: 'order' as const })),
            ...eventsForAccount.map(e => ({ ...e, itemType: 'event' as const }))
        ];
        
        combinedInteractions.sort((a, b) => {
            const dateAValue = (a as any).createdAt || (a as any).startDate;
            const dateBValue = (b as any).createdAt || (b as any).startDate;
            const dateA = dateAValue ? parseISO(dateAValue) : new Date(0);
            const dateB = dateBValue ? parseISO(dateBValue) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setRelatedInteractions(combinedInteractions);
        
        const openTasks = ordersForAccount.filter(o => o.status === 'Programada' || o.status === 'Seguimiento');
        openTasks.sort((a, b) => {
            const dateAString = (a.status === 'Programada' ? a.visitDate : a.nextActionDate);
            const dateBString = (b.status === 'Programada' ? b.visitDate : b.nextActionDate);
            if(!dateAString) return 1; if(!dateBString) return -1;
            const dateA = parseISO(dateAString);
            const dateB = parseISO(dateBString);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            if (a.status === 'Programada' && b.status !== 'Programada') return -1;
            if (b.status === 'Programada' && a.status !== 'Programada') return 1;
            return 0;
        });
        const nextInteraction = openTasks[0];
        
        if (nextInteraction) {
            setCalculatedStatus(nextInteraction.status as 'Programada' | 'Seguimiento');
        } else {
            const commercialStatus = await calculateCommercialStatus(ordersForAccount || []);
            setCalculatedStatus(commercialStatus);
        }

        if (canEditAccount) {
          // OPTIMIZED: We only fetch all accounts if the edit dialog is likely to be opened
          getAccountsFS().then(setAllAccountsForValidation);
        }

      } catch (error) {
        console.error("Error fetching account details or related data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudo cargar la información de la cuenta o su historial.", variant: "destructive" });
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccountData();
  }, [accountId, toast, canEditAccount, dataSignature]);

  React.useEffect(() => {
    if (canEditAccount && searchParams.get('edit') === 'true' && account && !isLoading) {
      setIsAccountDialogOpen(true);
    }
  }, [searchParams, account, canEditAccount, isLoading]);


  const handleEditAccount = () => {
    if (!canEditAccount || !account) return;
    setIsAccountDialogOpen(true);
  };

  const handleSaveAccountDetails = async (data: AccountFormValues) => {
    if (!canEditAccount || !account) return;
    
    try {
      await updateAccountFS(account.id, data); 
      refreshDataSignature(); // This will trigger a full data reload via useEffect
      toast({ title: "¡Cuenta Actualizada!", description: `La cuenta "${data.name}" ha sido actualizada.` });
      setIsAccountDialogOpen(false);
      router.replace(`/accounts/${accountId}`); 
    } catch (error) {
      console.error("Error updating account:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar la cuenta.", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando detalles de la cuenta...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Cuenta no Encontrada</h1>
        <p className="text-muted-foreground mb-6">La cuenta que estás buscando no existe o ha sido eliminada.</p>
        <Button onClick={() => router.push('/accounts')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Cuentas
        </Button>
      </div>
    );
  }

  const salesRepAssigned = account.salesRepId ? allTeamMembers.find(tm => tm.id === account.salesRepId) : null;
  const embajadorAssigned = account.embajadorId ? allTeamMembers.find(tm => tm.id === account.embajadorId) : null;
  const creationDate = account.createdAt && isValid(parseISO(account.createdAt)) ? format(parseISO(account.createdAt), "dd/MM/yyyy", { locale: es }) : 'N/D';
  const updateDate = account.updatedAt && isValid(parseISO(account.updatedAt)) ? format(parseISO(account.updatedAt), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/D';

  const isOpenTask = (item: InteractionItem) => item.itemType === 'order' && ['Programada', 'Seguimiento', 'Fallido'].includes((item as Order).status);

  return (
    <div className="space-y-6" id="printable-account-details">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-hide">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/accounts')} aria-label="Volver a la lista de cuentas">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-semibold">{account.nombre}</h1>
            <p className="text-sm text-muted-foreground">{account.legalName || 'Nombre fiscal no especificado'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {canEditAccount && (
            <Button onClick={handleEditAccount} disabled={isLoading}>
              <Edit className="mr-2 h-4 w-4" /> Editar Cuenta
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Ficha
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-subtle">
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span>CIF/NIF:</span> <strong className="font-medium">{account.cif || 'No especificado'}</strong></div>
              <Separator />
              <div className="flex justify-between"><span>Tipo:</span> <strong className="font-medium">{account.type}</strong></div>
              <Separator />
              <div className="flex justify-between items-center"><span>Estado:</span> {calculatedStatus ? <StatusBadge type="account" status={calculatedStatus} /> : <span className="text-muted-foreground">Calculando...</span>}</div>
              <Separator />
              <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><Truck className="h-4 w-4"/>Distribuidor:</span>
                  <strong className="font-medium text-right">{distributor ? distributor.nombre : 'Venta Directa SB'}</strong>
              </div>
              <Separator />
              <div className="flex justify-between"><span>Comercial:</span> <strong className="font-medium">{salesRepAssigned ? salesRepAssigned.name : 'No asignado'}</strong></div>
              {embajadorAssigned && <><Separator /><div className="flex justify-between"><span>Clavadista:</span> <strong className="font-medium flex items-center gap-1"><Award size={14}/>{embajadorAssigned.name}</strong></div></>}
              <Separator />
              <div className="flex justify-between"><span>Creada:</span> <span className="text-muted-foreground">{creationDate}</span></div>
              <div className="flex justify-between"><span>Actualizada:</span> <span className="text-muted-foreground">{updateDate}</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-subtle">
            <CardHeader>
              <CardTitle className="text-lg">Contacto Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                {account.mainContactName || account.mainContactEmail || account.mainContactPhone ? (
                    <>
                        {account.mainContactName && <div className="flex items-center space-x-2"><UserCircle size={16} className="text-muted-foreground"/> <span>{account.mainContactName}</span></div>}
                        {account.mainContactEmail && <div className="flex items-center space-x-2"><Mail size={16} className="text-muted-foreground"/> <a href={`mailto:${account.mainContactEmail}`} className="text-primary hover:underline">{account.mainContactEmail}</a></div>}
                        {account.mainContactPhone && <div className="flex items-center space-x-2"><Phone size={16} className="text-muted-foreground"/> <span>{account.mainContactPhone}</span></div>}
                    </>
                ) : <p className="text-muted-foreground">No hay información de contacto principal.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
            <Card className="shadow-subtle">
                <CardHeader>
                <CardTitle className="text-lg">Direcciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <h4 className="font-medium mb-1 flex items-center"><MapPin size={16} className="mr-1.5 text-muted-foreground"/>Dirección Fiscal:</h4>
                        <p className="text-muted-foreground whitespace-pre-line pl-6">{formatAddress(account.addressBilling)}</p>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-medium mb-1 flex items-center"><MapPin size={16} className="mr-1.5 text-muted-foreground"/>Dirección de Entrega Principal:</h4>
                        <p className="text-muted-foreground whitespace-pre-line pl-6">{formatAddress(account.addressShipping)}</p>
                    </div>
                </CardContent>
            </Card>
             <Card className="shadow-subtle">
                <CardHeader>
                <CardTitle className="text-lg">Notas de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                <p className="text-muted-foreground whitespace-pre-line">{account.notes || 'No hay notas para esta cuenta.'}</p>
                </CardContent>
            </Card>
            {(userRole === 'Admin' || userRole === 'SalesRep') && account.internalNotes && (
              <Card className="shadow-subtle bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                  <CardHeader>
                  <CardTitle className="text-lg flex items-center"><Info className="mr-2 h-5 w-5 text-amber-600"/>Notas Internas</CardTitle>
                  <CardDescription>Esta información solo es visible para el equipo de ventas y administradores.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                  <p className="text-amber-800 dark:text-amber-200 whitespace-pre-line">{account.internalNotes}</p>
                  </CardContent>
              </Card>
            )}
        </div>
      </div>

      <Card className="shadow-subtle print-section">
        <CardHeader>
          <CardTitle>Historial de Interacciones y Pedidos</CardTitle>
          <CardDescription>Registro de todas las visitas, seguimientos y pedidos asociados a esta cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          {relatedInteractions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[5%]"></TableHead>
                    <TableHead className="w-[15%]">Fecha</TableHead>
                    <TableHead className="w-[20%]">Tipo / Próxima Acción</TableHead>
                    <TableHead className="w-[10%] text-right">Valor</TableHead>
                    <TableHead className="w-[15%] text-center">Estado</TableHead>
                    <TableHead className="w-[15%]">Comercial</TableHead>
                    <TableHead className="w-[15%]">Notas / Objetivo Visita</TableHead>
                    <TableHead className="w-[10%] text-right print-hide">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedInteractions.map(interaction => {
                    const interactionType = getInteractionType(interaction);
                    const canRegisterResult = userRole === 'Admin' || (interaction.itemType === 'order' && ((userRole === 'SalesRep' && teamMember?.name === (interaction as Order).salesRep) || (userRole === 'Clavadista' && (interaction as Order).clavadistaId === teamMember?.id)));
                    const isOrder = interaction.itemType === 'order';
                    const orderData = isOrder ? (interaction as Order) : null;
                    const eventData = interaction.itemType === 'event' ? (interaction as CrmEvent) : null;
                    
                    const displayDateRaw = orderData?.createdAt || eventData!.startDate;
                    const displayDate = displayDateRaw && isValid(parseISO(displayDateRaw)) ? format(parseISO(displayDateRaw), "dd/MM/yy HH:mm", { locale: es }) : 'N/A';

                    return (
                      <TableRow key={interaction.id} className={orderData?.status === 'Completado' ? 'bg-muted/40' : ''}>
                        <TableCell>
                           {interaction.itemType === 'order' ? <ShoppingCart className="h-4 w-4 text-muted-foreground" /> : <PartyPopper className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>{displayDate}</TableCell>
                        <TableCell>{interactionType}</TableCell>
                        <TableCell className="text-right">
                          {orderData?.value !== undefined ? (
                             <FormattedNumericValue value={orderData.value} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {interaction.itemType === 'order' && <StatusBadge type="order" status={orderData!.status} />}
                          {interaction.itemType === 'event' && <StatusBadge type="event" status={eventData!.status} />}
                        </TableCell>
                        <TableCell>{orderData?.salesRep || 'N/A'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={interaction.notes}>
                          {interaction.notes || 'N/D'}
                        </TableCell>
                        <TableCell className="text-right print-hide">
                           {isOpenTask(interaction) && canRegisterResult ? (
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/order-form?originatingTaskId=${interaction.id}`}>
                                    <Send className="mr-1 h-3 w-3" /> Registrar Resultado
                                  </Link>
                                </Button>
                           ) : (
                                <Button variant="ghost" size="sm" disabled>
                                    <CheckCircle className="mr-1 h-3 w-3 text-green-500" /> Gestionado
                                </Button>
                           )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No hay interacciones ni pedidos registrados para esta cuenta.</p>
          )}
        </CardContent>
      </Card>

      {canEditAccount && account && (
        <AccountDialog
          account={account} 
          isOpen={isAccountDialogOpen}
          onOpenChange={(open) => {
            setIsAccountDialogOpen(open);
            if (!open) router.replace(`/accounts/${accountId}`, undefined);
          }}
          onSave={handleSaveAccountDetails}
          allAccounts={allAccountsForValidation}
        />
      )}
    </div>
  );
}
