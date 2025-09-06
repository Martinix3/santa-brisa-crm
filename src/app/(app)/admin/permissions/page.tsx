"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type PermissionLevel = "none" | "read" | "edit";

interface Permission {
    feature: string;
    admin: { read: boolean; write: boolean };
    salesRep: { read: boolean; write: boolean };
    distributor: { read: boolean; write: boolean };
    clavadista: { read: boolean; write: boolean };
}

interface Section {
    name: string;
    permissions: Permission[];
}

const initialPermissionsData: Section[] = [
    { 
        name: 'General', 
        permissions: [
            { feature: 'Panel Principal', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: true, write: true }, clavadista: { read: true, write: true } },
            { feature: 'Mi Agenda', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: true, write: true } },
            { feature: 'Asistente IA', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: true, write: true } },
            { feature: 'Recursos de Marketing', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: true, write: false }, clavadista: { read: true, write: false } },
            { feature: 'Eventos', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: true, write: false }, clavadista: { read: true, write: false } },
        ]
    },
    {
        name: 'Ventas y CRM',
        permissions: [
            { feature: 'Registrar Interacción/Pedido', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: true, write: true } },
            { feature: 'Panel de Pedidos (Colocación)', admin: { read: true, write: true }, salesRep: { read: true, write: false }, distributor: { read: true, write: true }, clavadista: { read: true, write: false } },
            { feature: 'Panel de Cuentas', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: true, write: false } },
            { feature: 'Panel Equipo Ventas', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: false, write: false } },
            { feature: 'Panel Clavadistas', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: true, write: false } },
        ]
    },
     { 
        name: 'Facturación Propia (SB)', 
        permissions: [
            { feature: 'Ver/Crear Ventas Propias', admin: { read: true, write: true }, salesRep: { read: true, write: true }, distributor: { read: false, write: false }, clavadista: { read: false, write: false } },
        ]
    },
    {
        name: 'Administración',
        permissions: [
            { feature: 'Gestión de Usuarios', admin: { read: true, write: true }, salesRep: { read: false, write: false }, distributor: { read: false, write: false }, clavadista: { read: false, write: false } },
            { feature: 'Gestión de Inventario/Costes', admin: { read: true, write: true }, salesRep: { read: false, write: false }, distributor: { read: false, write: false }, clavadista: { read: false, write: false } },
            { feature: 'Gestión de Producción', admin: { read: true, write: true }, salesRep: { read: false, write: false }, distributor: { read: false, write: false }, clavadista: { read: false, write: false } },
            { feature: 'Configuración General', admin: { read: true, write: true }, salesRep: { read: false, write: false }, distributor: { read: false, write: false }, clavadista: { read: false, write: false } },
        ]
    }
];

type Role = "admin" | "salesRep" | "distributor" | "clavadista";
type PermissionType = "read" | "write";

export default function PermissionsPage() {
    const [permissions, setPermissions] = React.useState<Section[]>(initialPermissionsData);
    const { toast } = useToast();

    const handlePermissionChange = (sectionIndex: number, permissionIndex: number, role: Role, type: PermissionType, checked: boolean) => {
        const newPermissions = [...permissions];
        const permission = newPermissions[sectionIndex].permissions[permissionIndex];
        
        permission[role][type] = checked;

        // Logic: if write is enabled, read must be enabled.
        if (type === 'write' && checked) {
            permission[role].read = true;
        }
        // Logic: if read is disabled, write must be disabled.
        if (type === 'read' && !checked) {
            permission[role].write = false;
        }

        setPermissions(newPermissions);
    };
    
    const handleSave = () => {
        // En una aplicación real, aquí se llamaría a un servicio para guardar los permisos en la base de datos.
        console.log("Saving permissions:", JSON.stringify(permissions, null, 2));
        toast({
            title: "Permisos Guardados",
            description: "Los cambios en los permisos han sido guardados (simulado).",
        });
    };

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between space-x-2">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-headline font-semibold">Gestión de Permisos</h1>
                </div>
                 <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/> Guardar Cambios</Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Matriz de Permisos por Rol</CardTitle>
                    <CardDescription>
                        Marca las casillas para conceder permisos de lectura o edición/gestión para cada rol y funcionalidad.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%] font-semibold text-foreground">Funcionalidad</TableHead>
                                    <TableHead className="text-center font-semibold text-foreground w-[17.5%]">Admin</TableHead>
                                    <TableHead className="text-center font-semibold text-foreground w-[17.5%]">SalesRep</TableHead>
                                    <TableHead className="text-center font-semibold text-foreground w-[17.5%]">Distributor</TableHead>
                                    <TableHead className="text-center font-semibold text-foreground w-[17.5%]">Clavadista</TableHead>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                    <TableHead></TableHead>
                                    {(["admin", "salesRep", "distributor", "clavadista"] as Role[]).map(role => (
                                        <TableHead key={role} className="text-center text-xs p-1">
                                            <div className="flex justify-around">
                                                <span className="font-medium">Lectura</span>
                                                <span className="font-medium">Edición</span>
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissions.map((section, sectionIndex) => (
                                    <React.Fragment key={section.name}>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableCell colSpan={5} className="font-bold text-primary">{section.name}</TableCell>
                                        </TableRow>
                                        {section.permissions.map((p, permIndex) => (
                                            <TableRow key={p.feature}>
                                                <TableCell>{p.feature}</TableCell>
                                                {(["admin", "salesRep", "distributor", "clavadista"] as Role[]).map(role => (
                                                    <TableCell key={role} className="text-center">
                                                         <div className="flex justify-around items-center">
                                                            <Checkbox
                                                                checked={p[role].read}
                                                                onCheckedChange={(checked) => handlePermissionChange(sectionIndex, permIndex, role, 'read', !!checked)}
                                                                aria-label={`${p.feature} - ${role} - Lectura`}
                                                            />
                                                            <Checkbox
                                                                checked={p[role].write}
                                                                onCheckedChange={(checked) => handlePermissionChange(sectionIndex, permIndex, role, 'write', !!checked)}
                                                                aria-label={`${p.feature} - ${role} - Escritura`}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
