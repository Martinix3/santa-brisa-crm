
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, Account, AccountType, AccountStatus, NextActionType, FailureReasonType, CrmEvent, CrmEventType, CrmEventStatus, PromotionalMaterial, PromotionalMaterialType, AssignedPromotionalMaterial } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';
import { format, addDays, subDays, isEqual, parseISO } from 'date-fns'; 
import { TrendingUp, Briefcase, CalendarPlus, Repeat } from "lucide-react";


export const mockKpis: Kpi[] = [ // These are general mock KPIs, not used for the launch dashboard directly
  { id: 'kpi1_old', title: 'Botellas Vendidas (Mes)', currentValue: 0, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2_old', title: 'Nuevos Clientes Adquiridos', currentValue: 0, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3_old', title: 'Pedidos Procesados', currentValue: 0, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4_old', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 0, icon: BarChart3, targetValue:30, unit:"%" },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Nico (Rep)', email: 'nico@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=NI', role: 'SalesRep',
    monthlyTargetAccounts: 20,
    monthlyTargetVisits: 100,
    performanceData: [
        { month: 'Ene', bottles: 150 }, { month: 'Feb', bottles: 200 }, { month: 'Mar', bottles: 180 },
        { month: 'Abr', bottles: 220 }, { month: 'May', bottles: 250 }, { month: 'Jun', bottles: 210 }
    ],
  },
  {
    id: 'tm2', name: 'Alfonso (Rep)', email: 'alfonso@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=AL', role: 'SalesRep',
    monthlyTargetAccounts: 15,
    monthlyTargetVisits: 80,
    performanceData: [
        { month: 'Ene', bottles: 120 }, { month: 'Feb', bottles: 160 }, { month: 'Mar', bottles: 140 },
        { month: 'Abr', bottles: 180 }, { month: 'May', bottles: 200 }, { month: 'Jun', bottles: 170 }
    ],
  },
  {
    id: 'tm3', name: 'Federica (Rep)', email: 'federica@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png?text=FE', role: 'SalesRep',
    monthlyTargetAccounts: 10,
    monthlyTargetVisits: 60,
    performanceData: [
        { month: 'Ene', bottles: 90 }, { month: 'Feb', bottles: 110 }, { month: 'Mar', bottles: 100 },
        { month: 'Abr', bottles: 130 }, { month: 'May', bottles: 150 }, { month: 'Jun', bottles: 120 }
    ],
  },
  {
    id: 'admin01', name: 'Admin User', email: 'admin@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png?text=AU',
    monthlyTargetAccounts: 10, 
    monthlyTargetVisits: 40,   
    performanceData: [],
  },
  {
    id: 'adminMJ', name: 'Martín (Admin)', email: 'mj@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png?text=MJ',
    monthlyTargetAccounts: 15, 
    monthlyTargetVisits: 50,   
    performanceData: [],
  },
  {
    id: 'dist01', name: 'Distribuidor Principal', email: 'distribuidor@example.com', role: 'Distributor', avatarUrl: 'https://placehold.co/100x100.png?text=DP',
    performanceData: []
  },
  {
    id: 'clv01', name: 'Laura (Clavadista)', email: 'laura.clava@example.com', role: 'Clavadista', avatarUrl: 'https://placehold.co/100x100.png?text=LC',
    performanceData: []
  },
  {
    id: 'clv02', name: 'Carlos (Clavadista)', email: 'carlos.clava@example.com', role: 'Clavadista', avatarUrl: 'https://placehold.co/100x100.png?text=CC',
    performanceData: []
  }
];
// Note: bottlesSold, orders, visits for TeamMember are now calculated dynamically from Firestore data in components.

export const orderStatusesList: OrderStatus[] = ['Programada', 'Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido', 'Seguimiento'];
export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final'];

export const nextActionTypeList: NextActionType[] = ['Llamar al responsable de compras', 'Mandar información', 'Visitar de nuevo', 'Enviar muestra', 'Esperar decisión', 'Opción personalizada'];
export const failureReasonList: FailureReasonType[] = ['No interesado', 'Ya trabaja con otro proveedor', 'Sin presupuesto', 'Producto no encaja', 'Otro (especificar)'];

// mockOrders is now an empty array. Data will be fetched from Firestore.
export const mockOrders: Order[] = [];


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

// mockAccounts is used for initial Firestore seeding or as a fallback.
// The application primarily fetches accounts from Firestore.
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
  {
    id: 'acc_ord_ORD002', // Keep ID convention for potential mapping if original mockOrders were seeded
    name: 'Supermercado La Compra Feliz',
    legalName: 'La Compra Feliz SA',
    cif: 'A22222222', // Ensure unique CIF if used as key
    type: 'Retail',
    status: 'Activo',
    addressBilling: 'Avenida Comercial 5, Valencia',
    addressShipping: 'Avenida Comercial 5, Valencia',
    mainContactName: 'Luisa Gerente',
    mainContactEmail: 'luisa@comprafeliz.com',
    mainContactPhone: '600222333',
    notes: 'Cliente desde ' + format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    salesRepId: 'tm2',
    createdAt: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    updatedAt: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
  },
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
