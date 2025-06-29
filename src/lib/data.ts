

import type { Kpi, StrategicObjective, TeamMember, Order, MarketingResourceCategory, OrderStatus, MarketingResourceType, UserRole, ClientType, AccountType, AccountStatus, NextActionType, FailureReasonType, CrmEvent, CrmEventType, CrmEventStatus, PromotionalMaterial, PromotionalMaterialType, CanalOrigenColocacion, Purchase, PurchaseStatus, PaymentMethod, SampleRequestStatus, SampleRequestPurpose, DirectSaleStatus, PurchaseCategory, DirectSaleChannel, PotencialType, InteractionType, InteractionResult } from '@/types';

// Mock data is kept for potential future use or seeding, but is mostly replaced by Firestore services.
export const mockKpis: Kpi[] = [];
export const mockTeamMembers: TeamMember[] = [];
export const mockOrders: Order[] = [];
export const mockAccounts: any[] = []; // Use `any` to avoid TS errors during transition
export const mockCrmEvents: CrmEvent[] = [];
export const mockPromotionalMaterials: PromotionalMaterial[] = [];
export const mockPurchases: Purchase[] = [];

// New Enums from Spec
export const potencialTypeList: PotencialType[] = ['alto', 'medio', 'bajo'];
export const interactionTypeList: InteractionType[] = ['Visita', 'Llamada', 'Mail', 'Otro'];
export const interactionResultList: InteractionResult[] = ['Programada', 'Requiere seguimiento', 'Pedido Exitoso', 'Fallida'];

// Legacy/Existing Enums
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
];

export const userRolesList: UserRole[] = ['Admin', 'SalesRep', 'Distributor', 'Clavadista'];
export const accountTypeList: AccountType[] = ['HORECA', 'Distribuidor', 'Retail Minorista', 'Gran Superficie', 'Evento Especial', 'Cliente Final Directo', 'Importador', 'Otro'];
export const accountStatusList: AccountStatus[] = ['Programada', 'Seguimiento', 'Pedido', 'Repetición', 'Fallido'];
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
