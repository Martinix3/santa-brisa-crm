
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, Account, AccountType, AccountStatus, NextActionType, FailureReasonType, CrmEvent, CrmEventType, CrmEventStatus, PromotionalMaterial, PromotionalMaterialType, AssignedPromotionalMaterial } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';
import { format, addDays, subDays, isEqual, parseISO } from 'date-fns'; // Added parseISO

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Botellas Vendidas (Mes)', currentValue: 0, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2', title: 'Nuevos Clientes Adquiridos', currentValue: 0, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3', title: 'Pedidos Procesados', currentValue: 0, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 0, icon: BarChart3, targetValue:30, unit:"%" },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Nico (Rep)', email: 'nico@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=NI', role: 'SalesRep',
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
    id: 'tm2', name: 'Alfonso (Rep)', email: 'alfonso@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=AL', role: 'SalesRep',
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
    id: 'tm3', name: 'Federica (Rep)', email: 'federica@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=FE', role: 'SalesRep',
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
    bottlesSold: 0, orders: 0, visits: 0, performanceData: [],
    monthlyTargetAccounts: 10, 
    monthlyTargetVisits: 40,   
  },
  {
    id: 'adminMJ', name: 'Martín (Admin)', email: 'mj@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png?text=MJ',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: [],
    monthlyTargetAccounts: 15, 
    monthlyTargetVisits: 50,   
  },
  {
    id: 'dist01', name: 'Distribuidor Principal', email: 'distribuidor@example.com', role: 'Distributor', avatarUrl: 'https://placehold.co/100x100.png?text=DP',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  },
  {
    id: 'clv01', name: 'Laura (Clavadista)', email: 'laura.clava@example.com', role: 'Clavadista', avatarUrl: 'https://placehold.co/100x100.png?text=LC',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  },
  {
    id: 'clv02', name: 'Carlos (Clavadista)', email: 'carlos.clava@example.com', role: 'Clavadista', avatarUrl: 'https://placehold.co/100x100.png?text=CC',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  }
];

export const orderStatusesList: OrderStatus[] = ['Programada', 'Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido', 'Seguimiento'];
export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final'];

export const nextActionTypeList: NextActionType[] = ['Llamar al responsable de compras', 'Mandar información', 'Visitar de nuevo', 'Enviar muestra', 'Esperar decisión', 'Opción personalizada'];
export const failureReasonList: FailureReasonType[] = ['No interesado', 'Ya trabaja con otro proveedor', 'Sin presupuesto', 'Producto no encaja', 'Otro (especificar)'];

const today = new Date();

export const mockOrders: Order[] = [
  {
    id: 'ORD001', clientName: 'Restaurante Sol Naciente', visitDate: format(subDays(today, 15), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 350.75, status: 'Entregado', salesRep: 'Nico (Rep)', lastUpdated: format(subDays(today, 10), 'yyyy-MM-dd'),
    clientType: 'HORECA', numberOfUnits: 20, unitPrice: 14.50, clavadistaId: 'clv01',
    nombreFiscal: 'Restaurante Sol Naciente SL', cif: 'B12345678', direccionFiscal: 'Calle Falsa 123, Madrid', direccionEntrega: 'Calle Falsa 123, Madrid',
    contactoNombre: 'Ana Pérez', contactoCorreo: 'ana.perez@solnaciente.es', contactoTelefono: '600111222',
    assignedMaterials: [{ materialId: 'mat_002', quantity: 2 }]
  },
  {
    id: 'ORD002', clientName: 'Supermercado La Compra Feliz', visitDate: format(subDays(today, 5), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 1200.50, status: 'Confirmado', salesRep: 'Alfonso (Rep)', lastUpdated: format(subDays(today, 2), 'yyyy-MM-dd'),
    clientType: 'Retail', numberOfUnits: 80, unitPrice: 12.50, clavadistaId: 'clv01',
    nombreFiscal: 'La Compra Feliz SA', cif: 'A87654321', direccionFiscal: 'Avenida Comercial 5, Valencia', direccionEntrega: 'Avenida Comercial 5, Valencia',
    contactoNombre: 'Luisa Gerente', contactoCorreo: 'luisa@comprafeliz.com', contactoTelefono: '600222333',
    assignedMaterials: []
  },
  {
    id: 'VISFLW001', clientName: 'Restaurante La Tertulia', visitDate: format(subDays(today, 8), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Nico (Rep)', lastUpdated: format(subDays(today, 8), 'yyyy-MM-dd'), clavadistaId: 'clv02',
    nextActionType: 'Llamar al responsable de compras', nextActionDate: format(addDays(today, 2), 'yyyy-MM-dd'),
    notes: 'El responsable estaba de vacaciones, volver a contactar esta semana.',
    assignedMaterials: [{ materialId: 'mat_007', quantity: 1 }] 
  },
  {
    id: 'VISFLW002', clientName: 'Hotel Vista Hermosa', visitDate: format(subDays(today, 3), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Federica (Rep)', lastUpdated: format(subDays(today, 3), 'yyyy-MM-dd'), clavadistaId: undefined,
    nextActionType: 'Enviar muestra', nextActionDate: format(addDays(today, 5), 'yyyy-MM-dd'),
    notes: 'Pidieron muestra del nuevo etiquetado.',
    assignedMaterials: []
  },
  {
    id: 'VISFLD001', clientName: 'Tienda Gourmet El Rincón Sibarita', visitDate: format(subDays(today, 12), 'yyyy-MM-dd'),
    status: 'Fallido', salesRep: 'Alfonso (Rep)', lastUpdated: format(subDays(today, 12), 'yyyy-MM-dd'), clavadistaId: undefined,
    nextActionType: 'Visitar de nuevo', nextActionDate: format(addDays(today, 20), 'yyyy-MM-dd'),
    failureReasonType: 'Ya trabaja con otro proveedor',
    notes: 'Tienen exclusividad con otra marca, pero abiertos a revisar en 1 mes.',
    assignedMaterials: []
  },
  {
    id: 'ORD003', clientName: 'Distribuciones Rápidas SL', visitDate: format(subDays(today, 25), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 2500.00, status: 'Entregado', salesRep: 'Admin User', lastUpdated: format(subDays(today, 20), 'yyyy-MM-dd'),
    clientType: 'Distribuidor', numberOfUnits: 200, unitPrice: 10.00, clavadistaId: undefined,
    nombreFiscal: 'Distribuciones Rápidas SL', cif: 'B33333333', direccionFiscal: 'Polígono Industrial El Viento, Parcela 10, Zaragoza',
    contactoNombre: 'Carlos Almacén', contactoCorreo: 'calmacen@rapidas.es', contactoTelefono: '600333444',
    assignedMaterials: [{ materialId: 'mat_001', quantity: 5 }]
  },
  {
    id: 'VISFLW003', clientName: 'Catering Los Eventos Felices', visitDate: format(subDays(today, 1), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Nico (Rep)', lastUpdated: format(subDays(today, 1), 'yyyy-MM-dd'), clavadistaId: 'clv01',
    nextActionType: 'Opción personalizada', nextActionCustom: 'Preparar propuesta para boda de 200 pax',
    nextActionDate: format(addDays(today, 7), 'yyyy-MM-dd'),
    notes: 'Necesitan presupuesto ajustado para un evento grande.',
    assignedMaterials: []
  },
   {
    id: 'ORD004', clientName: 'Bar El Estudiante', visitDate: format(subDays(today, 2), 'yyyy-MM-dd'), 
    products: ['Santa Brisa 750ml'], value: 175.50, status: 'Confirmado', salesRep: 'Nico (Rep)', lastUpdated: format(subDays(today, 1), 'yyyy-MM-dd'),
    clientType: 'HORECA', numberOfUnits: 10, unitPrice: 14.50, clavadistaId: undefined,
    nombreFiscal: 'Bar El Estudiante SL', cif: 'B12345678', direccionFiscal: 'Calle Falsa 123, Madrid', direccionEntrega: 'Calle Falsa 123, Madrid',
    contactoNombre: 'Ana Pérez', contactoCorreo: 'ana.perez@solnaciente.es', contactoTelefono: '600111222',
    assignedMaterials: []
  },
  {
    id: 'VISFLD002', clientName: 'Nuevo Bar Plaza', visitDate: format(subDays(today, 6), 'yyyy-MM-dd'),
    status: 'Fallido', salesRep: 'Federica (Rep)', lastUpdated: format(subDays(today, 6), 'yyyy-MM-dd'), clavadistaId: undefined,
    nextActionType: 'Mandar información', nextActionDate: format(addDays(today, 1), 'yyyy-MM-dd'),
    failureReasonType: 'No interesado',
    notes: 'Acaban de abrir, de momento no quieren más proveedores.',
    assignedMaterials: []
  },
  {
    id: 'ORD005', clientName: 'Restaurante La Tertulia', visitDate: format(subDays(today, 1), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 290.00, status: 'Procesando', salesRep: 'Nico (Rep)', lastUpdated: format(subDays(today, 1), 'yyyy-MM-dd'),
    clientType: 'HORECA', numberOfUnits: 15, unitPrice: 16.00,
    nombreFiscal: 'La Tertulia Gastronómica SLU', cif: 'B44444444', direccionFiscal: 'Calle Poeta 12, Sevilla', direccionEntrega: 'Calle Poeta 12, Sevilla',
    contactoNombre: 'Elena Chef', contactoCorreo: 'elena.chef@latertulia.es', contactoTelefono: '600444555', clavadistaId: 'clv02',
    assignedMaterials: [{ materialId: 'mat_004', quantity: 1 }]
  },
  {
    id: 'VISFLW004', clientName: 'Vinoteca El Buen Gusto', visitDate: format(subDays(today, 4), 'yyyy-MM-dd'),
    status: 'Seguimiento', salesRep: 'Alfonso (Rep)', lastUpdated: format(subDays(today, 4), 'yyyy-MM-dd'), clavadistaId: undefined,
    nextActionType: 'Visitar de nuevo', nextActionDate: format(addDays(today, 10), 'yyyy-MM-dd'),
    notes: 'Interesados, pero quieren comparar con su proveedor actual. Nueva visita para cerrar.',
    assignedMaterials: []
  },
  {
    id: 'ORD006', clientName: 'Hotel Vista Hermosa', visitDate: format(subDays(today, 9), 'yyyy-MM-dd'),
    products: ['Santa Brisa 750ml'], value: 600.00, status: 'Entregado', salesRep: 'Federica (Rep)', lastUpdated: format(subDays(today, 3), 'yyyy-MM-dd'),
    clientType: 'HORECA', numberOfUnits: 40, unitPrice: 12.50, clavadistaId: 'clv02',
    nombreFiscal: 'Hotel Vista Hermosa SA', cif: 'A55555555', direccionFiscal: 'Carretera de la Costa km 25, Marbella',
    contactoNombre: 'Roberto Director', contactoCorreo: 'director@vistahotel.com', contactoTelefono: '600555666',
    assignedMaterials: []
  },
   {
    id: 'ORD007', clientName: 'Supermercado La Compra Feliz', visitDate: format(addDays(today, -1), 'yyyy-MM-dd'), 
    products: ['Santa Brisa 750ml'], value: 1500.00, status: 'Enviado', salesRep: 'Alfonso (Rep)', lastUpdated: format(addDays(today, -1), 'yyyy-MM-dd'),
    clientType: 'Retail', numberOfUnits: 100, unitPrice: 12.50, clavadistaId: 'clv01',
    nombreFiscal: 'La Compra Feliz SA', cif: 'A22222222', direccionFiscal: 'Avenida Comercial 5, Valencia',
    contactoNombre: 'Luisa Gerente', contactoCorreo: 'luisa@comprafeliz.com', contactoTelefono: '600222333',
    assignedMaterials: []
  },
  {
    id: 'VISFLD003', clientName: 'Gastrobar Innova', visitDate: format(addDays(today, -10), 'yyyy-MM-dd'),
    status: 'Fallido', salesRep: 'Nico (Rep)', lastUpdated: format(addDays(today, -10), 'yyyy-MM-dd'), clavadistaId: 'clv01',
    nextActionType: 'Opción personalizada', nextActionCustom: 'Revisar contacto en 6 meses, cambio de gerencia',
    nextActionDate: format(addDays(today, 170), 'yyyy-MM-dd'), 
    failureReasonType: 'Otro (especificar)', failureReasonCustom: 'Cambio reciente de propietario, no toman decisiones ahora.',
    notes: 'Nuevo dueño revisará proveedores más adelante.',
    assignedMaterials: []
  }
];

mockTeamMembers.forEach(member => {
    if (member.role === 'SalesRep' || member.role === 'Admin') { 
        member.bottlesSold = 0;
        member.orders = 0;
        member.visits = 0; 

        const salesRepOrdersAndVisits = mockOrders.filter(order => order.salesRep === member.name);
        
        salesRepOrdersAndVisits.forEach(record => {
            if (['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(record.status) && record.numberOfUnits) {
                member.bottlesSold = (member.bottlesSold || 0) + record.numberOfUnits;
                member.orders = (member.orders || 0) + 1;
            }
            if (record.status !== 'Programada' || (record.status === 'Programada' && record.salesRep === member.name)) {
                 member.visits = (member.visits || 0) + 1;
            }
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

export const userRolesList: UserRole[] = ['Admin', 'SalesRep', 'Distributor', 'Clavadista'];

export const accountTypeList: AccountType[] = ['HORECA', 'Distribuidor', 'Retail Minorista', 'Gran Superficie', 'Evento Especial', 'Otro'];
export const accountStatusList: AccountStatus[] = ['Activo', 'Inactivo', 'Potencial', 'Bloqueado'];

// mockAccounts will now be used primarily for initial Firestore seeding or as a fallback.
// The application will fetch accounts from Firestore.
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
   // Cuentas adicionales inferidas de mockOrders
  {
    id: 'acc_ord_ORD002',
    name: 'Supermercado La Compra Feliz',
    legalName: 'La Compra Feliz SA',
    cif: 'A22222222',
    type: 'Retail',
    status: 'Activo',
    addressBilling: 'Avenida Comercial 5, Valencia',
    addressShipping: 'Avenida Comercial 5, Valencia',
    mainContactName: 'Luisa Gerente',
    mainContactEmail: 'luisa@comprafeliz.com',
    mainContactPhone: '600222333',
    notes: 'Cliente desde ' + format(subDays(today, 5), 'yyyy-MM-dd'),
    salesRepId: 'tm2',
    createdAt: format(subDays(today, 5), 'yyyy-MM-dd'),
    updatedAt: format(subDays(today, 2), 'yyyy-MM-dd'),
  },
  {
    id: 'acc_ord_ORD003',
    name: 'Distribuciones Rápidas SL',
    legalName: 'Distribuciones Rápidas SL',
    cif: 'B33333333',
    type: 'Distribuidor',
    status: 'Activo',
    addressBilling: 'Polígono Industrial El Viento, Parcela 10, Zaragoza',
    addressShipping: 'Polígono Industrial El Viento, Parcela 10, Zaragoza',
    mainContactName: 'Carlos Almacén',
    mainContactEmail: 'calmacen@rapidas.es',
    mainContactPhone: '600333444',
    notes: 'Cliente desde ' + format(subDays(today, 25), 'yyyy-MM-dd'),
    salesRepId: 'admin01',
    createdAt: format(subDays(today, 25), 'yyyy-MM-dd'),
    updatedAt: format(subDays(today, 20), 'yyyy-MM-dd'),
  },
  {
    id: 'acc_ord_ORD005',
    name: 'Restaurante La Tertulia',
    legalName: 'La Tertulia Gastronómica SLU',
    cif: 'B44444444',
    type: 'HORECA',
    status: 'Activo',
    addressBilling: 'Calle Poeta 12, Sevilla',
    addressShipping: 'Calle Poeta 12, Sevilla',
    mainContactName: 'Elena Chef',
    mainContactEmail: 'elena.chef@latertulia.es',
    mainContactPhone: '600444555',
    notes: 'Cliente desde ' + format(subDays(today, 1), 'yyyy-MM-dd'),
    salesRepId: 'tm1',
    createdAt: format(subDays(today, 1), 'yyyy-MM-dd'),
    updatedAt: format(subDays(today, 1), 'yyyy-MM-dd'),
  },
  {
    id: 'acc_ord_ORD006',
    name: 'Hotel Vista Hermosa',
    legalName: 'Hotel Vista Hermosa SA',
    cif: 'A55555555',
    type: 'HORECA',
    status: 'Activo',
    addressBilling: 'Carretera de la Costa km 25, Marbella',
    addressShipping: 'Carretera de la Costa km 25, Marbella',
    mainContactName: 'Roberto Director',
    mainContactEmail: 'director@vistahotel.com',
    mainContactPhone: '600555666',
    notes: 'Cliente desde ' + format(subDays(today, 9), 'yyyy-MM-dd'),
    salesRepId: 'tm3',
    createdAt: format(subDays(today, 9), 'yyyy-MM-dd'),
    updatedAt: format(subDays(today, 3), 'yyyy-MM-dd'),
  }
];


export const promotionalMaterialTypeList: PromotionalMaterialType[] = ['Merchandising Físico', 'Material PLV', 'Servicio de Personal', 'Digital/Software'];

export const mockPromotionalMaterials: PromotionalMaterial[] = [
  { 
    id: 'mat_001', name: 'Cubitera Metálica Santa Brisa', type: 'Merchandising Físico', description: 'Cubitera elegante con logo grabado.',
    latestPurchase: { quantityPurchased: 100, totalPurchaseCost: 1250, purchaseDate: '2024-01-15', calculatedUnitCost: 12.50, notes: 'Compra inicial.' }
  },
  { 
    id: 'mat_002', name: 'Bandeja de Camarero Santa Brisa', type: 'Merchandising Físico', description: 'Bandeja antideslizante con marca.',
    latestPurchase: { quantityPurchased: 200, totalPurchaseCost: 1600, purchaseDate: '2024-02-01', calculatedUnitCost: 8.00, notes: 'Pedido grande para stock.' }
  },
  { 
    id: 'mat_003', name: 'Set 6 Copas Grabadas Santa Brisa', type: 'Merchandising Físico', description: 'Copas de cristal de alta calidad.',
    latestPurchase: { quantityPurchased: 50, totalPurchaseCost: 1250, purchaseDate: '2024-03-10', calculatedUnitCost: 25.00, notes: 'Edición limitada.' }
  },
  { 
    id: 'mat_004', name: 'Expositor de Mesa (PLV)', type: 'Material PLV', description: 'Pequeño expositor para mostrador o mesa.',
    latestPurchase: { quantityPurchased: 30, totalPurchaseCost: 450, purchaseDate: '2024-04-05', calculatedUnitCost: 15.00 }
  },
  { 
    id: 'mat_005', name: 'Roll-up Promocional (PLV)', type: 'Material PLV', description: 'Banner enrollable para eventos o tiendas.',
    latestPurchase: { quantityPurchased: 10, totalPurchaseCost: 600, purchaseDate: '2024-04-20', calculatedUnitCost: 60.00 }
  },
  { 
    id: 'mat_006', name: 'Servicio de Camarero/Coctelero (por hora)', type: 'Servicio de Personal', description: 'Personal cualificado para eventos.',
    latestPurchase: { quantityPurchased: 1, totalPurchaseCost: 20, purchaseDate: '2024-01-01', calculatedUnitCost: 20.00, notes: 'Tarifa estándar hora.' }
  },
  { 
    id: 'mat_007', name: 'Flyers Promocionales (pack 100u)', type: 'Material PLV', description: 'Folletos A6 a color.',
    latestPurchase: { quantityPurchased: 10, totalPurchaseCost: 100, purchaseDate: '2024-05-01', calculatedUnitCost: 10.00, notes: 'Impresión digital, 10 packs.' }
  },
];

export const crmEventTypeList: CrmEventType[] = ['Activación en Tienda', 'Feria Comercial', 'Evento Corporativo', 'Degustación', 'Patrocinio', 'Activación', 'Otro'];
export const crmEventStatusList: CrmEventStatus[] = ['Planificado', 'Confirmado', 'En Curso', 'Completado', 'Cancelado', 'Pospuesto'];

export const mockCrmEvents: CrmEvent[] = [
  {
    id: 'evt_001',
    name: 'Lanzamiento Cosecha - Tienda Gourmet Central',
    type: 'Activación en Tienda',
    status: 'Planificado',
    startDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    location: 'Tienda Gourmet Central, Calle Mayor 1',
    assignedTeamMemberIds: ['tm1', 'tm3'], 
    assignedMaterials: [
        { materialId: 'mat_003', quantity: 2 }, 
        { materialId: 'mat_007', quantity: 1 }  
    ],
    createdAt: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    updatedAt: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    description: 'Evento de degustación y presentación de la nueva cosecha para clientes de la tienda.'
  },
  {
    id: 'evt_002',
    name: 'Feria Alimentaria Barcelona 2024',
    type: 'Feria Comercial',
    status: 'Confirmado',
    startDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 33), 'yyyy-MM-dd'),
    location: 'Fira de Barcelona, Gran Vía',
    assignedTeamMemberIds: ['tm2', 'adminMJ'], 
    assignedMaterials: [
        { materialId: 'mat_005', quantity: 1 }, 
        { materialId: 'mat_001', quantity: 10 }, 
        { materialId: 'mat_006', quantity: 16 } 
    ],
    notes: 'Stand H2. Reuniones clave ya agendadas.',
    createdAt: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
    updatedAt: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
  },
   {
    id: 'evt_003',
    name: 'Cata Maridaje Restaurante Fusión',
    type: 'Degustación',
    status: 'Completado',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    location: 'Restaurante Fusión, Calle Innova 5',
    assignedTeamMemberIds: ['tm1'], 
    assignedMaterials: [
        { materialId: 'mat_003', quantity: 3 } 
    ],
    description: 'Evento exclusivo para sumilleres y prensa especializada. Gran éxito.',
    notes: 'Se generaron 3 leads HORECA importantes.',
    createdAt: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    updatedAt: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  },
  {
    id: 'evt_004',
    name: 'Activación Navidad - Supermercado Principal',
    type: 'Activación en Tienda',
    status: 'Planificado',
    startDate: format(addDays(new Date(), 45), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 46), 'yyyy-MM-dd'),
    location: 'Supermercado Principal, Av. Comercial',
    assignedTeamMemberIds: ['tm2'], 
    assignedMaterials: [
        { materialId: 'mat_004', quantity: 2 },
        { materialId: 'mat_007', quantity: 5 }
    ],
    description: 'Promoción de packs navideños.',
    createdAt: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    updatedAt: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
  },
];
