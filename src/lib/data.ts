

import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, Account, AccountType, AccountStatus, NextActionType, FailureReasonType, CrmEvent, CrmEventType, CrmEventStatus, PromotionalMaterial, PromotionalMaterialType, AssignedPromotionalMaterial, CanalOrigenColocacion, Purchase, PurchaseStatus, PaymentMethod, AddressDetails, SampleRequestStatus, SampleRequestPurpose, DirectSaleStatus, PurchaseCategory, DirectSaleChannel } from '@/types';
import { Package, Users, ShoppingBag, BarChart3 } from 'lucide-react';
import { format, addDays, subDays, isEqual, parseISO } from 'date-fns';
import { TrendingUp, Briefcase, CalendarPlus, Repeat } from "lucide-react";


export const mockKpis: Kpi[] = [
  { id: 'kpi1_old', title: 'Botellas Vendidas (Mes)', currentValue: 0, icon: Package, targetValue:10000, unit:"botellas" },
  { id: 'kpi2_old', title: 'Nuevos Clientes Adquiridos', currentValue: 0, icon: Users, targetValue:100, unit:"clientes" },
  { id: 'kpi3_old', title: 'Pedidos Procesados', currentValue: 0, icon: ShoppingBag, targetValue:400, unit:"pedidos" },
  { id: 'kpi4_old', title: 'Tasa de Conversión (Pedidos/Visitas)', currentValue: 0, icon: BarChart3, targetValue:30, unit:"%" },
];

export const mockTeamMembers: TeamMember[] = [];
export const mockOrders: Order[] = [];
export const mockAccounts: Account[] = [];
export const mockCrmEvents: CrmEvent[] = [];
export const mockPromotionalMaterials: PromotionalMaterial[] = [];
export const mockPurchases: Purchase[] = [];


export const orderStatusesList: OrderStatus[] = ['Programada', 'Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Cancelado', 'Fallido', 'Seguimiento', 'Completado'];
export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final'];

export const nextActionTypeList: NextActionType[] = ['Llamar al responsable de compras', 'Mandar información', 'Visitar de nuevo', 'Enviar muestra', 'Esperar decisión', 'Opción personalizada'];
export const failureReasonList: FailureReasonType[] = ['No interesado', 'Ya trabaja con otro proveedor', 'Sin presupuesto', 'Producto no encaja', 'Otro (especificar)'];


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

export const accountTypeList: AccountType[] = ['HORECA', 'Distribuidor', 'Retail Minorista', 'Gran Superficie', 'Evento Especial', 'Cliente Final Directo', 'Importador', 'Otro'];
export const accountStatusList: AccountStatus[] = ['Activo', 'Inactivo', 'Potencial', 'Bloqueado'];

export const promotionalMaterialTypeList: PromotionalMaterialType[] = ['Merchandising Físico', 'Material PLV', 'Servicio de Personal', 'Digital/Software'];

export const crmEventTypeList: CrmEventType[] = ['Activación en Tienda', 'Feria Comercial', 'Evento Corporativo', 'Degustación', 'Patrocinio', 'Activación', 'Otro'];
export const crmEventStatusList: CrmEventStatus[] = ['Planificado', 'Confirmado', 'En Curso', 'Completado', 'Cancelado', 'Pospuesto'];

export const purchaseStatusList: PurchaseStatus[] = ['Borrador', 'Proforma Recibida', 'Pagado', 'Pago a 30 días', 'Factura Recibida', 'Completado', 'Cancelado'];
export const purchaseCategoryList: PurchaseCategory[] = ['Materia Prima (COGS)', 'Material de Embalaje (COGS)', 'Gastos de Logística', 'Gasto de Marketing', 'Gasto Operativo', 'Otro'];

export const canalOrigenColocacionList: CanalOrigenColocacion[] = ['Equipo Santa Brisa', 'Iniciativa Importador', 'Marketing Digital', 'Referido', 'Otro'];

export const paymentMethodList: PaymentMethod[] = ['Adelantado', 'Contado', 'Transferencia 30 días', 'Giro Bancario'];

export const sampleRequestStatusList: SampleRequestStatus[] = ['Pendiente', 'Aprobada', 'Rechazada', 'Enviada'];
export const sampleRequestPurposeList: SampleRequestPurpose[] = ['Captación Cliente Nuevo', 'Seguimiento Cliente Existente', 'Material para Evento', 'Uso Interno/Formación', 'Otro'];

export const provincesSpainList: string[] = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres",
  "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "La Coruña", "Cuenca", "Gerona", "Granada", "Guadalajara",
  "Guipúzcoa", "Huelva", "Huesca", "Islas Baleares", "Jaén", "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia",
  "Navarra", "Orense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca", "Santa Cruz de Tenerife",
  "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"
];

export const directSaleStatusList: DirectSaleStatus[] = ['Borrador', 'Confirmada', 'Facturada', 'Pagada', 'Cancelada'];
export const directSaleChannelList: DirectSaleChannel[] = ['Importador', 'Online', 'Estratégica', 'Otro'];
