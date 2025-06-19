
import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, Account, AccountType, AccountStatus, NextActionType, FailureReasonType, CrmEvent, CrmEventType, CrmEventStatus, PromotionalMaterial, PromotionalMaterialType, AssignedPromotionalMaterial } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';
import { format, addDays, subDays, isEqual, parseISO } from 'date-fns';
import { TrendingUp, Briefcase, CalendarPlus, Repeat } from "lucide-react";


export const mockKpis: Kpi[] = [
  { id: 'kpi1_old', title: 'Botellas Vendidas (Mes)', currentValue: 0, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2_old', title: 'Nuevos Clientes Adquiridos', currentValue: 0, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3_old', title: 'Pedidos Procesados', currentValue: 0, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4_old', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 0, icon: BarChart3, targetValue:30, unit:"%" },
];

// mockTeamMembers is now primarily for seeding Firestore.
// The application will fetch TeamMember data from Firestore.
export const mockTeamMembers: TeamMember[] = [];


export const orderStatusesList: OrderStatus[] = ['Programada', 'Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Cancelado', 'Fallido', 'Seguimiento'];
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

export const userRolesList: UserRole[] = ['Admin', 'SalesRep', 'Distributor', 'Clavadista'];

export const accountTypeList: AccountType[] = ['HORECA', 'Distribuidor', 'Retail Minorista', 'Gran Superficie', 'Evento Especial', 'Otro'];
export const accountStatusList: AccountStatus[] = ['Activo', 'Inactivo', 'Potencial', 'Bloqueado'];

export const mockAccounts: Account[] = [];


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

export const mockCrmEvents: CrmEvent[] = [];
