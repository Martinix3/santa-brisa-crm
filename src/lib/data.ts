
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, Account, AccountType, AccountStatus, NextActionType, FailureReasonType } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Botellas Vendidas (Mes)', currentValue: 0, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2', title: 'Nuevos Clientes Adquiridos', currentValue: 0, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3', title: 'Pedidos Procesados', currentValue: 0, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 0, icon: BarChart3, targetValue:30, unit:"%" },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Nico', email: 'nico@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=NI', role: 'SalesRep',
    bottlesSold: 0,
    monthlyTargetAccounts: 20,
    monthlyTargetVisits: 100,
    orders: 0, visits: 0,
    performanceData: [
        { month: 'Ene', bottles: 150 }, { month: 'Feb', bottles: 200 }, { month: 'Mar', bottles: 180 },
        { month: 'Abr', bottles: 220 }, { month: 'May', bottles: 250 }, { month: 'Jun', bottles: 210 }
    ],
  },
  {
    id: 'tm2', name: 'Alfonso', email: 'alfonso@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=AL', role: 'SalesRep',
    bottlesSold: 0,
    monthlyTargetAccounts: 15,
    monthlyTargetVisits: 80,
    orders: 0, visits: 0,
    performanceData: [
        { month: 'Ene', bottles: 120 }, { month: 'Feb', bottles: 160 }, { month: 'Mar', bottles: 140 },
        { month: 'Abr', bottles: 180 }, { month: 'May', bottles: 200 }, { month: 'Jun', bottles: 170 }
    ],
  },
  {
    id: 'tm3', name: 'Federica', email: 'federica@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=FE', role: 'SalesRep',
    bottlesSold: 0,
    monthlyTargetAccounts: 10,
    monthlyTargetVisits: 60,
    orders: 0, visits: 0,
    performanceData: [
        { month: 'Ene', bottles: 90 }, { month: 'Feb', bottles: 110 }, { month: 'Mar', bottles: 100 },
        { month: 'Abr', bottles: 130 }, { month: 'May', bottles: 150 }, { month: 'Jun', bottles: 120 }
    ],
  },
  {
    id: 'admin01', name: 'Admin User', email: 'admin@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png?text=AU',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  },
  {
    id: 'adminMJ', name: 'Martín (Admin)', email: 'mj@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png?text=MJ',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  },
  {
    id: 'dist01', name: 'Distribuidor Principal', email: 'distribuidor@example.com', role: 'Distributor', avatarUrl: 'https://placehold.co/100x100.png?text=DP',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  }
];

export const orderStatusesList: OrderStatus[] = ['Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido', 'Seguimiento'];
export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final'];

export const nextActionTypeList: NextActionType[] = ['Llamar al responsable de compras', 'Mandar información', 'Visitar de nuevo', 'Enviar muestra', 'Esperar decisión', 'Opción personalizada'];
export const failureReasonList: FailureReasonType[] = ['No interesado', 'Ya trabaja con otro proveedor', 'Sin presupuesto', 'Producto no encaja', 'Otro (especificar)'];

const today = new Date();

export const mockOrders: Order[] = [
  {
    id: 'ORD001', clientName: 'Bar El Estudiante', visitDate: format(subDays(today, 15), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 350.75, status: 'Entregado', salesRep: 'Nico', lastUpdated: format(subDays(today, 10), 'yyyy-MM-dd'),
    clientType: 'HORECA', numberOfUnits: 20, unitPrice: 14.50,
    nombreFiscal: 'Bar El Estudiante SL', cif: 'B11111111', direccionFiscal: 'Calle Universidad 1, Madrid', direccionEntrega: 'Calle Universidad 1, Madrid',
    contactoNombre: 'Juan Dueño', contactoCorreo: 'juan@estudiante.es', contactoTelefono: '600111222'
  },
  {
    id: 'ORD002', clientName: 'Supermercado La Compra Feliz', visitDate: format(subDays(today, 5), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 1200.50, status: 'Confirmado', salesRep: 'Alfonso', lastUpdated: format(subDays(today, 2), 'yyyy-MM-dd'),
    clientType: 'Retail', numberOfUnits: 80, unitPrice: 12.50,
    nombreFiscal: 'La Compra Feliz SA', cif: 'A22222222', direccionFiscal: 'Avenida Comercial 5, Valencia', direccionEntrega: 'Avenida Comercial 5, Valencia',
    contactoNombre: 'Luisa Gerente', contactoCorreo: 'luisa@comprafeliz.com', contactoTelefono: '600222333'
  },
  {
    id: 'VISFLW001', clientName: 'Restaurante La Tertulia', visitDate: format(subDays(today, 8), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Nico', lastUpdated: format(subDays(today, 8), 'yyyy-MM-dd'),
    nextActionType: 'Llamar al responsable de compras', nextActionDate: format(addDays(today, 2), 'yyyy-MM-dd'),
    notes: 'El responsable estaba de vacaciones, volver a contactar esta semana.'
  },
  {
    id: 'VISFLW002', clientName: 'Hotel Vista Hermosa', visitDate: format(subDays(today, 3), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Federica', lastUpdated: format(subDays(today, 3), 'yyyy-MM-dd'),
    nextActionType: 'Enviar muestra', nextActionDate: format(addDays(today, 5), 'yyyy-MM-dd'),
    notes: 'Pidieron muestra del nuevo etiquetado.'
  },
  {
    id: 'VISFLD001', clientName: 'Tienda Gourmet El Rincón Sibarita', visitDate: format(subDays(today, 12), 'yyyy-MM-dd'),
    status: 'Fallido', salesRep: 'Alfonso', lastUpdated: format(subDays(today, 12), 'yyyy-MM-dd'),
    nextActionType: 'Visitar de nuevo', nextActionDate: format(addDays(today, 20), 'yyyy-MM-dd'),
    failureReasonType: 'Ya trabaja con otro proveedor',
    notes: 'Tienen exclusividad con otra marca, pero abiertos a revisar en 1 mes.'
  },
  {
    id: 'ORD003', clientName: 'Distribuciones Rápidas SL', visitDate: format(subDays(today, 25), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 2500.00, status: 'Entregado', salesRep: 'Admin User', lastUpdated: format(subDays(today, 20), 'yyyy-MM-dd'),
    clientType: 'Distribuidor', numberOfUnits: 200, unitPrice: 10.00, //Example price for distributor
    nombreFiscal: 'Distribuciones Rápidas SL', cif: 'B33333333', direccionFiscal: 'Polígono Industrial El Viento, Parcela 10, Zaragoza',
    contactoNombre: 'Carlos Almacén', contactoCorreo: 'calmacen@rapidas.es', contactoTelefono: '600333444'
  },
  {
    id: 'VISFLW003', clientName: 'Catering Los Eventos Felices', visitDate: format(subDays(today, 1), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Nico', lastUpdated: format(subDays(today, 1), 'yyyy-MM-dd'),
    nextActionType: 'Opción personalizada', nextActionCustom: 'Preparar propuesta para boda de 200 pax',
    nextActionDate: format(addDays(today, 7), 'yyyy-MM-dd'),
    notes: 'Necesitan presupuesto ajustado para un evento grande.'
  },
   {
    id: 'ORD004', clientName: 'Bar El Estudiante', visitDate: format(subDays(today, 2), 'yyyy-MM-dd'), // Repeated client
    products: ['Santa Brisa 750ml'], value: 175.50, status: 'Confirmado', salesRep: 'Nico', lastUpdated: format(subDays(today, 1), 'yyyy-MM-dd'),
    clientType: 'HORECA', numberOfUnits: 10, unitPrice: 14.50,
    nombreFiscal: 'Bar El Estudiante SL', cif: 'B11111111', direccionFiscal: 'Calle Universidad 1, Madrid', direccionEntrega: 'Calle Universidad 1, Madrid',
    contactoNombre: 'Juan Dueño', contactoCorreo: 'juan@estudiante.es', contactoTelefono: '600111222'
  },
  {
    id: 'VISFLD002', clientName: 'Nuevo Bar Plaza', visitDate: format(subDays(today, 6), 'yyyy-MM-dd'),
    status: 'Fallido', salesRep: 'Federica', lastUpdated: format(subDays(today, 6), 'yyyy-MM-dd'),
    nextActionType: 'Mandar información', nextActionDate: format(addDays(today, 1), 'yyyy-MM-dd'),
    failureReasonType: 'No interesado',
    notes: 'Acaban de abrir, de momento no quieren más proveedores.'
  },
];

// Initialize some performance data for SalesReps based on mockOrders
mockTeamMembers.forEach(member => {
    if (member.role === 'SalesRep') {
        member.bottlesSold = 0;
        member.orders = 0;
        member.visits = 0; // Initialize visits

        const salesRepOrders = mockOrders.filter(order => order.salesRep === member.name);
        
        salesRepOrders.forEach(order => {
            if (['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(order.status) && order.numberOfUnits) {
                member.bottlesSold = (member.bottlesSold || 0) + order.numberOfUnits;
                member.orders = (member.orders || 0) + 1;
            }
            // Every entry in mockOrders for this salesRep counts as a visit for simplicity here
            member.visits = (member.visits || 0) + 1;
        });
    }
});


const marketingResourceTypes: MarketingResourceType[] = ['Folleto', 'Presentación', 'Imagen', 'Guía'];

export const mockMarketingResources: MarketingResourceCategory[] = [
  {
    id: 'cat1', name: 'Folletos y Catálogos de Botellas',
    resources: [
      { id: 'res1', title: 'Catálogo de Botellas 2024', description: 'Catálogo completo de nuestras botellas.', link: '#', type: 'Folleto' },
      { id: 'res2', title: 'Folleto de Botellas Premium', description: 'Destacando nuestras botellas de alta gama.', link: '#', type: 'Folleto' },
    ],
  },
  {
    id: 'cat2', name: 'Presentaciones de Ventas',
    resources: [
      { id: 'res3', title: 'Presentación de Ventas Q3 2024 (Enfoque Botellas)', description: 'Presentación de ventas estándar.', link: '#', type: 'Presentación' },
      { id: 'res4', title: 'Iniciativas de Sostenibilidad (Packaging)', description: 'Nuestro compromiso con el packaging sostenible.', link: '#', type: 'Presentación' },
    ],
  },
  {
    id: 'cat3', name: 'Imágenes de Botellas',
    resources: [
      { id: 'res5', title: 'Fotos de Botellas en Alta Resolución', description: 'Galería de imágenes de botellas.', link: '#', type: 'Imagen' },
    ],
  },
  {
    id: 'cat4', name: 'Guías de Marca',
    resources: [
      { id: 'res6', title: 'Manual de Marca Santa Brisa', description: 'Guías oficiales de uso de la marca.', link: '#', type: 'Guía' },
    ],
  },
];

export const userRolesList: UserRole[] = ['Admin', 'SalesRep', 'Distributor'];

// CRM Account Data
export const accountTypeList: AccountType[] = ['HORECA', 'Distribuidor', 'Retail Minorista', 'Gran Superficie', 'Evento Especial', 'Otro'];
export const accountStatusList: AccountStatus[] = ['Activo', 'Inactivo', 'Potencial', 'Bloqueado'];

export const mockAccounts: Account[] = [
  {
    id: 'acc_001',
    name: 'Restaurante Sol Naciente',
    legalName: 'Sol Naciente Gastronomía S.L.',
    cif: 'B12345678',
    type: 'HORECA',
    status: 'Activo',
    addressBilling: 'Calle Falsa 123, Local A, 28001 Madrid, España',
    addressShipping: 'Calle Falsa 123, Local A, 28001 Madrid, España',
    mainContactName: 'Ana Pérez',
    mainContactEmail: 'ana.perez@solnaciente.es',
    mainContactPhone: '+34 912 345 678',
    notes: 'Cliente leal, pedidos semanales. Interesado en nuevas promociones.',
    salesRepId: 'tm1', 
    createdAt: '2023-01-15',
    updatedAt: '2024-05-10',
  },
  {
    id: 'acc_002',
    name: 'Distribuciones Gourmet del Sur',
    legalName: 'Distribuciones Gourmet del Sur S.A.',
    cif: 'A87654321',
    type: 'Distribuidor',
    status: 'Activo',
    addressBilling: 'Avenida Principal 45, Polígono Industrial La Estrella, 41001 Sevilla, España',
    addressShipping: 'Almacén Central, Nave 7, Polígono Industrial La Estrella, 41001 Sevilla, España',
    mainContactName: 'Carlos López',
    mainContactEmail: 'compras@gourmetdelsur.com',
    mainContactPhone: '+34 954 123 456',
    notes: 'Distribuidor principal para Andalucía. Gran volumen.',
    salesRepId: 'tm2', 
    createdAt: '2022-11-01',
    updatedAt: '2024-04-20',
  },
  {
    id: 'acc_003',
    name: 'Bodega Delicatessen Hermanos García',
    legalName: 'Hermanos García C.B.',
    cif: 'E00001111',
    type: 'Retail Minorista',
    status: 'Potencial',
    addressBilling: 'Plaza Mayor 5, 49001 Zamora, España',
    mainContactName: 'Lucía García',
    mainContactEmail: 'lucia.garcia@delicatessenhg.es',
    mainContactPhone: '+34 980 555 666',
    notes: 'Mostraron interés en la feria. Contactar para seguimiento.',
    salesRepId: 'tm3', 
    createdAt: '2024-03-01',
    updatedAt: '2024-05-15',
  },
  { // Add accounts from mockOrders if they don't exist by CIF
    id: 'acc_BarEstudiante', name: 'Bar El Estudiante', legalName: 'Bar El Estudiante SL', cif: 'B11111111', type: 'HORECA', status: 'Activo',
    salesRepId: 'tm1', createdAt: format(subDays(today, 15), 'yyyy-MM-dd'), updatedAt: format(subDays(today, 1), 'yyyy-MM-dd')
  },
  {
    id: 'acc_CompraFeliz', name: 'Supermercado La Compra Feliz', legalName: 'La Compra Feliz SA', cif: 'A22222222', type: 'Retail', status: 'Activo',
    salesRepId: 'tm2', createdAt: format(subDays(today, 5), 'yyyy-MM-dd'), updatedAt: format(subDays(today, 2), 'yyyy-MM-dd')
  },
  {
    id: 'acc_DistRapidas', name: 'Distribuciones Rápidas SL', legalName: 'Distribuciones Rápidas SL', cif: 'B33333333', type: 'Distribuidor', status: 'Activo',
    salesRepId: 'admin01', createdAt: format(subDays(today, 25), 'yyyy-MM-dd'), updatedAt: format(subDays(today, 20), 'yyyy-MM-dd')
  }
];

// Ensure all clients from mockOrders that should be accounts are in mockAccounts
mockOrders.forEach(order => {
    if (order.cif && order.nombreFiscal && !mockAccounts.find(acc => acc.cif === order.cif)) {
        mockAccounts.push({
            id: `acc_ord_${order.id}`,
            name: order.clientName,
            legalName: order.nombreFiscal,
            cif: order.cif,
            type: order.clientType || 'Otro',
            status: 'Activo', // Assuming active if they placed an order
            addressBilling: order.direccionFiscal,
            addressShipping: order.direccionEntrega,
            mainContactName: order.contactoNombre,
            mainContactEmail: order.contactoCorreo,
            mainContactPhone: order.contactoTelefono,
            notes: order.observacionesAlta || order.notes,
            salesRepId: mockTeamMembers.find(tm => tm.name === order.salesRep)?.id,
            createdAt: order.visitDate,
            updatedAt: order.lastUpdated,
        });
    }
});
