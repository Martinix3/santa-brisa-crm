
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, Account, AccountType, AccountStatus, NextActionType, FailureReasonType } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';

export const mockKpis: Kpi[] = [
  { id: 'kpi1', title: 'Botellas Vendidas (Mes)', currentValue: 0, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2', title: 'Nuevos Clientes Adquiridos', currentValue: 0, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3', title: 'Pedidos Procesados', currentValue: 0, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 0, icon: BarChart3, targetValue:30, unit:"%" },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Nico', email: 'nico@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png', role: 'SalesRep',
    bottlesSold: 0,
    monthlyTargetAccounts: 20,
    monthlyTargetVisits: 100,
    orders: 0, visits: 0,
    performanceData: [],
  },
  {
    id: 'tm2', name: 'Alfonso', email: 'alfonso@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png', role: 'SalesRep',
    bottlesSold: 0,
    monthlyTargetAccounts: 15,
    monthlyTargetVisits: 80,
    orders: 0, visits: 0,
    performanceData: [],
  },
  {
    id: 'tm3', name: 'Federica', email: 'federica@santabrisa.com', avatarUrl: 'https://placehold.co/100x100.png', role: 'SalesRep',
    bottlesSold: 0,
    monthlyTargetAccounts: 10,
    monthlyTargetVisits: 60,
    orders: 0, visits: 0,
    performanceData: [],
  },
  {
    id: 'admin01', name: 'Admin User', email: 'admin@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  },
  {
    id: 'adminMJ', name: 'Martín (Admin)', email: 'mj@santabrisa.com', role: 'Admin', avatarUrl: 'https://placehold.co/100x100.png',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  },
  {
    id: 'dist01', name: 'Distribuidor Principal', email: 'distribuidor@example.com', role: 'Distributor', avatarUrl: 'https://placehold.co/100x100.png',
    bottlesSold: 0, orders: 0, visits: 0, performanceData: []
  }
];

export const orderStatusesList: OrderStatus[] = ['Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido', 'Seguimiento'];
export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final'];

export const nextActionTypeList: NextActionType[] = ['Llamar al responsable de compras', 'Mandar información', 'Visitar de nuevo', 'Enviar muestra', 'Esperar decisión', 'Opción personalizada'];
export const failureReasonList: FailureReasonType[] = ['No interesado', 'Ya trabaja con otro proveedor', 'Sin presupuesto', 'Producto no encaja', 'Otro (especificar)'];


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
];
