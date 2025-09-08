

import type { Kpi, StrategicObjective, OrderStatus, MarketingResourceType, UserRole, ClientType, AccountType, AccountStatus, NextActionType, FailureReasonType, CrmEvent, CrmEventType, CrmEventStatus, PromotionalMaterial, CanalOrigenColocacion, Purchase, PurchaseStatus, PaymentMethod, SampleRequestStatus, SampleRequestPurpose, DirectSaleStatus, PurchaseCategory, DirectSaleChannel, PotencialType, InteractionType, InteractionResult, Category, CategoryKind, Tank, RunStatus, RunType, TankStatus, UoM } from '@/types';
import { TrendingUp, Users, Briefcase, CalendarPlus, Repeat } from "lucide-react"; 

export const mockInitialAccounts = [
  "Sello Copil", "Grupo Tragaluz", "MARRIOT", "AC HOTELES", "Bokaxankla Bar", 
  "Florida Park", "Restaurante Bajio", "Restaurante Trompo", "NH HOTELES", "Casa de Mexico", 
  "Grupo Dejate Llevar", "Chiton", "Martina por el Norte", "Boheme", "4 Latas", 
  "Vineci Hoteles", "Catering Ciboulette", "Los pefiotes", "Restaurante Fondeo", "Morris Club", 
  "Floren Domezain", "Taberna Jimmys", "Casa Ortega", "Cafe de Paris", "CRISTINA ORIA", 
  "Salvador Bachiller", "Restaurante Lanteo", "Fuerte Group Hotels", "Noname", "Bar Nuevo M40", 
  "Tienda El enemigo", "Discoteca Maracaibo", "La Oficina Maracaibo", "Liquor shop", "Casa de Siempre", 
  "Filemon", "La Rubia", "Restaurante Meneo", "Ke Sotogrande", "Polo Sotogrande", 
  "Agora Sotogrande", "Nueva Taberna", "Restaurante Aurea", "Chambao", "Gkg Sky Bar", 
  "ella Sky Bar", "Botania", "Dofia Tomasa", "Mantequerias Bravo", "Catering Samantha", 
  "Grupo Mentidero", "Catering Laurel", "Cristine Bedfor", "Estrella Galicia", "Tierra del Queiles", 
  "Restaurante Her", "Noneta", "Makila", "Golda", "Vinoteca Collado", "Petit Apetit"
].map(name => ({
  nombre: name,
  type: 'HORECA' as AccountType,
  potencial: 'medio' as PotencialType,
}));


// Mock data is kept for potential future use or seeding, but is mostly replaced by Firestore services.
export const mockKpis: Kpi[] = [];
export const mockTeamMembers: TeamMember[] = [];
export const mockOrders: Order[] = [];
export const mockAccounts: any[] = []; // Use `any` to avoid TS errors during transition
export const mockCrmEvents: CrmEvent[] = [];
export const mockPromotionalMaterials: PromotionalMaterial[] = [];
export const mockPurchases: Purchase[] = [];
export const mockTanks: Omit<Tank, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Tanque Mezcla 1', capacity: 1000, status: 'Libre', location: 'Zona de Mezcla' },
    { name: 'Tanque Mezcla 2', capacity: 1000, status: 'Libre', location: 'Zona de Mezcla' },
    { name: 'Tanque Pulmón 1', capacity: 500, status: 'Libre', location: 'Línea 1' },
];

// New: Default categories to seed the database if it's empty
export const mockCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // ---------- COSTES FIJOS ----------
  { name: 'Nóminas',              kind: 'cost', costType: 'fixed',     isConsumable: false, idOverride: 'NOMINAS' },
  { name: 'Consultores',          kind: 'cost', costType: 'fixed',     isConsumable: false, idOverride: 'CONSULTORES' },
  { name: 'Almacenamiento',       kind: 'cost', costType: 'fixed',     isConsumable: false, idOverride: 'ALMACEN' },
  { name: 'Gastos Administrativos',kind: 'cost', costType: 'fixed',    isConsumable: false, idOverride: 'ADMIN' },
  { name: 'Impuestos & Tasas',    kind: 'cost', costType: 'fixed',     isConsumable: false, idOverride: 'IMPUESTOS' },

  // ---------- SUB-CATEGORÍAS IMPUESTOS ----------
  { name: 'Impuestos Especiales (Alcohol)', kind: 'cost', costType: 'variable', isConsumable: false, parentId: 'IMPUESTOS', idOverride: 'IIEE' },
  { name: 'IVA Soportado No Recuperable',   kind: 'cost', costType: 'variable', isConsumable: false, parentId: 'IMPUESTOS', idOverride: 'IVA_SOPORTADO' },

  // ---------- COSTES VARIABLES ----------
  { name: 'Logística',            kind: 'cost', costType: 'variable',  isConsumable: false, idOverride: 'LOGISTICA' },
  { name: 'Viajes y Dietas',      kind: 'cost', costType: 'variable',  isConsumable: false, idOverride: 'VIAJES' },
  { name: 'Ventas & Marketing',   kind: 'cost', costType: 'variable',  isConsumable: false, idOverride: 'MKT' },

  // ---------- INVENTARIO ----------
  { name: 'Inventario General',   kind: 'inventory', isConsumable: true, idOverride: 'INV_GENERAL' },
  { name: 'Materia Prima (COGS)', kind: 'inventory', isConsumable: true, parentId: 'INV_GENERAL', idOverride: 'INV_MATERIA_PRIMA' },
  { name: 'Material Embalaje (COGS)', kind: 'inventory', isConsumable: true, parentId: 'INV_GENERAL', idOverride: 'INV_EMBALAJE' },
  { name: 'Producto Terminado',   kind: 'inventory', isConsumable: true, parentId: 'INV_GENERAL', idOverride: 'INV_PRODUCTO_TERMINADO' },
  { name: 'Producto Intermedio',  kind: 'inventory', isConsumable: true, parentId: 'INV_GENERAL', idOverride: 'INV_PRODUCTO_INTERMEDIO' },
  { name: 'Material Promocional', kind: 'inventory', isConsumable: true, parentId: 'INV_GENERAL', idOverride: 'INV_PROMO_MATERIAL' },
];


// --- STANDARDIZED ENUMS AND LISTS ---

export const potencialTypeList: PotencialType[] = ['alto', 'medio', 'bajo'];

export const interactionTypeList: InteractionType[] = ['Visita', 'Llamada', 'Mail', 'Otro'];
export const interactionResultList: InteractionResult[] = ['Programada', 'Requiere seguimiento', 'Pedido Exitoso', 'Fallida'];

export const runStatusList: RunStatus[] = ["Borrador", "Programada", "En curso", "Pausada", "Finalizada", "Cancelada"];
export const runTypeList: RunType[] = ["blend", "fill"];
export const tankStatusList: TankStatus[] = ["Libre", "Ocupado", "Limpieza"];
export const uomList: UoM[] = ['unit', 'kg', 'g', 'l', 'ml'];

export const orderStatusesList: OrderStatus[] = [
  'Programada', 'Pendiente', 'Confirmado', 'Procesando', 'Enviado', 'Entregado',
  'Facturado', 'Pagado', 'Cancelado', 'Fallido', 'Seguimiento', 'Completado'
];

export const clientTypeList: ClientType[] = ['Distribuidor', 'HORECA', 'Retail', 'Cliente Final', 'Otro'];

export const nextActionTypeList: NextActionType[] = [
  'Llamar al responsable de compras', 'Mandar información', 'Visitar de nuevo',
  'Enviar muestra', 'Esperar decisión', 'Opción personalizada'
];

export const failureReasonList: FailureReasonType[] = [
  'No interesado', 'Ya trabaja con otro proveedor', 'Sin presupuesto',
  'Producto no encaja', 'Otro (especificar)'
];

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

export const userRolesList: UserRole[] = ['Admin', 'Ventas', 'Distributor', 'Marketing', 'Manager', 'Operaciones', 'Finanzas', 'Clavadista', 'Líder Clavadista'];
export const accountTypeList: AccountType[] = [
  'HORECA', 'Retail Minorista', 'Gran Superficie', 'Distribuidor', 'Importador', 'Cliente Final Directo', 'Otro'
];
export const accountStatusList: AccountStatus[] = ['Activo', 'Repetición', 'Seguimiento', 'Inactivo', 'Pendiente', 'Fallido', 'Programada'];
export const crmEventTypeList: CrmEventType[] = [
  'Activación en Tienda', 'Feria Comercial', 'Evento Corporativo',
  'Degustación', 'Patrocinio', 'Activación', 'Otro'
];
export const crmEventStatusList: CrmEventStatus[] = [
  'Planificado', 'Confirmado', 'En Curso', 'Completado', 'Cancelado', 'Pospuesto'
];

export const canalOrigenColocacionList: CanalOrigenColocacion[] = [
  'Equipo Santa Brisa', 'Iniciativa Importador', 'Marketing Digital', 'Referido', 'Evento Especial', 'Otro'
];
export const paymentMethodList: PaymentMethod[] = ['Adelantado', 'Contado', 'Transferencia 30 días', 'Giro Bancario'];
export const sampleRequestStatusList: SampleRequestStatus[] = ['Pendiente', 'Aprobada', 'Rechazada', 'Enviada'];
export const sampleRequestPurposeList: SampleRequestPurpose[] = [
  'Captación Cliente Nuevo', 'Seguimiento Cliente Existente',
  'Material para Evento', 'Uso Interno/Formación', 'Otro'
];
export const provincesSpainList: string[] = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres",
  "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "La Coruña", "Cuenca", "Gerona", "Granada", "Guadalajara",
  "Guipúzcoa", "Huelva", "Huesca", "Islas Baleares", "Jaén", "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia",
  "Navarra", "Orense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca", "Santa Cruz de Tenerife",
  "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"
];
export const directSaleStatusList: DirectSaleStatus[] = ['borrador', 'confirmado', 'en depósito', 'facturado', 'pagado', 'cancelado'];
export const directSaleChannelList: DirectSaleChannel[] = ['Importador', 'Online', 'Estratégica', 'Depósito/Consigna', 'Otro'];
