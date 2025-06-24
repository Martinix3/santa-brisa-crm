
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Account, Order, UserRole, AddressDetails } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Building2, Edit, ArrowLeft, AlertTriangle, UserCircle, Mail, Phone, FileText, ShoppingCart, CalendarDays, ListChecks, Info, Euro, Printer, Loader2, MapPin } from "lucide-react";
import AccountDialog, { type AccountFormValues } from "@/components/app/account-dialog";
import { format, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import StatusBadge from "@/components/app/status-badge";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getAccountByIdFS, updateAccountFS, getAccountsFS } from "@/services/account-service";
import { getOrdersFS } from "@/services/order-service"; 
import { mockTeamMembers } from "@/lib/data";


const formatAddress = (address?: AddressDetails): string => {
  if (!address) return 'No especificada';

  const parts = [
    (address.street ? `${address.street}${address.number ? `, ${address.number}` : ''}` : null),
    address.city,
    address.province,
    address.postalCode,
    // Solo añade el país por defecto si hay alguna otra parte de la dirección presente
    (address.street || address.city || address.postalCode || address.province) && (address.country || 'España')
  ].filter(Boolean); // Filtra valores null, undefined, o strings vacíos

  if (parts.length === 0) {
      return 'No especificada';
  }

  return parts.join(',\n');
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const [account, setAccount] = React.useState<Account | null>(null);
  const [allAccountsForValidation, setAllAccountsForValidation] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [relatedInteractions, setRelatedInteractions] = React.useState<Order[]>([]);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  
  const accountId = params.accountId as string;
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
        const foundAccount = await getAccountByIdFS(accountId);
        setAccount(foundAccount);

        if (foundAccount) {
          const allOrders = await getOrdersFS();
          
          const interactions = allOrders.filter(order => {
            if (order.accountId && order.accountId === foundAccount.id) return true;
            if (!order.accountId && order.cif && foundAccount.cif && order.cif.trim().toLowerCase() === foundAccount.cif.trim().toLowerCase()) return true;
            if (!order.accountId && !order.cif && order.clientName && foundAccount.name && order.clientName.trim().toLowerCase() === foundAccount.name.trim().toLowerCase()) return true;
            return false;
          }).sort((a,b) => parseISO(b.visitDate).getTime() - parseISO(a.visitDate).getTime());
          
          setRelatedInteractions(interactions);

          if (isAdmin) {
            const allFsAccounts = await getAccountsFS();
            setAllAccountsForValidation(allFsAccounts);
          }
        }
      } catch (error) {
        console.error("Error fetching account details or orders:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudo cargar la información de la cuenta o su historial.", variant: "destructive" });
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccountData();
  }, [accountId, toast, isAdmin]);

  React.useEffect(() => {
    if (isAdmin && searchParams.get('edit') === 'true' && account && !isLoading) {
      setIsAccountDialogOpen(true);
    }
  }, [searchParams, account, isAdmin, isLoading]);


  const handleEditAccount = () => {
    if (!isAdmin || !account) return;
    setIsAccountDialogOpen(true);
  };

  const handleSaveAccountDetails = async (data: AccountFormValues) => {
    if (!isAdmin || !account) return;
    setIsLoading(true);
    try {
      // El servicio updateAccountFS ahora espera los campos de dirección desglosados
      await updateAccountFS(account.id, data); 
      const updatedAccount = await getAccountByIdFS(account.id);
      setAccount(updatedAccount);
      
      toast({ title: "¡Cuenta Actualizada!", description: `La cuenta "${data.name}" ha sido actualizada.` });
      setIsAccountDialogOpen(false);
      router.replace(`/accounts/${accountId}`, undefined); 
    } catch (error) {
      console.error("Error updating account:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar la cuenta.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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

  const salesRepAssigned = account.salesRepId ? mockTeamMembers.find(tm => tm.id === account.salesRepId) : null; // TODO: Fetch actual team member name if needed for display
  const creationDate = account.createdAt && isValid(parseISO(account.createdAt)) ? format(parseISO(account.createdAt), "dd/MM/yyyy", { locale: es }) : 'N/D';
  const updateDate = account.updatedAt && isValid(parseISO(account.updatedAt)) ? format(parseISO(account.updatedAt), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/D';

  return (
    <div className="space-y-6" id="printable-account-details">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-hide">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/accounts')} aria-label="Volver a la lista de cuentas">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-headline font-semibold">{account.name}</h1>
            <p className="text-sm text-muted-foreground">{account.legalName || 'Nombre fiscal no especificado'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
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
              <div className="flex justify-between"><span>CIF/NIF:</span> <strong className="font-medium">{account.cif}</strong></div>
              <Separator />
              <div className="flex justify-between"><span>Tipo:</span> <strong className="font-medium">{account.type}</strong></div>
              <Separator />
              <div className="flex justify-between items-center"><span>Estado:</span> <StatusBadge type="account" status={account.status} /></div>
              <Separator />
              <div className="flex justify-between"><span>Comercial:</span> <strong className="font-medium">{salesRepAssigned ? salesRepAssigned.name : 'No asignado'}</strong></div>
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
                    <TableHead className="w-[15%]">ID / Referencia</TableHead>
                    <TableHead className="w-[15%]">Fecha Interacción</TableHead>
                    <TableHead className="w-[20%]">Tipo / Próxima Acción</TableHead>
                    <TableHead className="w-[10%] text-right">Valor</TableHead>
                    <TableHead className="w-[15%] text-center">Estado</TableHead>
                    <TableHead className="w-[15%]">Comercial</TableHead>
                    <TableHead className="w-[10%] text-right print-hide">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedInteractions.map(interaction => {
                    const interactionType = interaction.status === 'Programada' ? "Visita Programada"
                                            : (interaction.status === 'Seguimiento' || interaction.status === 'Fallido') ? `Seguimiento (${interaction.nextActionType || 'N/D'})`
                                            : "Pedido";
                    return (
                      <TableRow key={interaction.id}>
                        <TableCell className="font-medium">{interaction.id}</TableCell>
                        <TableCell>{interaction.visitDate && isValid(parseISO(interaction.visitDate)) ? format(parseISO(interaction.visitDate), "dd/MM/yy", { locale: es }) : 'N/D'}</TableCell>
                        <TableCell>{interactionType}</TableCell>
                        <TableCell className="text-right">
                          {interaction.status !== 'Programada' && interaction.status !== 'Seguimiento' && interaction.status !== 'Fallido' && interaction.value !== undefined ? (
                             <FormattedNumericValue value={interaction.value} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} />
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge type="order" status={interaction.status} />
                        </TableCell>
                        <TableCell>{interaction.salesRep}</TableCell>
                        <TableCell className="text-right print-hide">
                           {interaction.status === 'Programada' || interaction.status === 'Seguimiento' || interaction.status === 'Fallido' ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/order-form?updateVisitId=${interaction.id}`}>
                                        <ListChecks className="mr-1 h-3 w-3" /> Registrar Resultado
                                    </Link>
                                </Button>
                           ) : (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/orders-dashboard`}> 
                                        <ShoppingCart className="mr-1 h-3 w-3" /> Ver Pedido
                                    </Link>
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

      {isAdmin && account && (
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
