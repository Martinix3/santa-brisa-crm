
import { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista' | 'Líder Clavadista' | 'finance';

export interface Kpi {
  id: string;
  title: string;
  currentValue: number; 
  targetValue: number;
  unit: string; 
  icon?: React.ElementType;
}

export interface StrategicObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface StickyNote {
  id: string;
  content: string;
  creatorId: string;
  assignedToId: string;
  isCompleted: boolean;
  createdAt: string; // ISO String
}

export interface TeamMember {
  id: string; 
  authUid?: string; 
  name: string;
  email: string; 
  avatarUrl?: string; 
  role: UserRole; 
  monthlyTargetAccounts?: number; 
  monthlyTargetVisits?: number; 
  bottlesSold?: number; 
  orders?: number; 
  visits?: number; 
  performanceData?: { month: string; bottles: number }[]; 
  createdAt?: string; 
  updatedAt?: string; 
  // Ambassador Program Fields
  liderId?: string;
  equipoIds?: string[];
  condiciones_personalizadas?: AmbassadorSettings;
  total_comisiones?: number;
  total_bonus?: number;
  total_pedidos?: number;
  // Distributor link
  accountId?: string;
}

// --- EARNINGS CONFIG TYPES ---
export interface HorecaRule {
  stage: 'openAccount' | 'repeat45d' | 'months1to3' | 'afterMonth4';
  label: string;
  condition?: string;
  minOrderCases?: number;
  fixedFee?: number;
  days?: number;
  percentage?: number;
}

export interface DistributorRule {
  tier: 'medium' | 'large' | 'top';
  label: string;
  initialMinCases: number;
  activationFee: number;
  secondOrderMinCases: number;
  consolidationBonus: number;
  percentageFirst3M: number;
  percentageAfter: number;
}

export interface EarningsConfig {
  horecaRules: HorecaRule[];
  distributorRules: DistributorRule[];
  lastEdited?: Timestamp;
  editedBy?: string;
}

// --- ERP DATA MODELS ---

export type CategoryKind = 'inventory' | 'cost';
export interface Category {
  id: string;
  idOverride?: string; // For seeding specific IDs
  name: string;
  kind: CategoryKind;
  isConsumable: boolean;
  costType?: 'fixed' | 'variable';
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostCenter {
    id: string;
    name: string;
    type: 'Marketing' | 'Event' | 'COGS' | 'Incentive' | 'General';
    parentId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type UoM = 'unit' | 'kg' | 'g' | 'l' | 'ml';
export type QcStatus = 'Pending' | 'Released' | 'Rejected';

export interface ItemBatch {
  id: string;
  inventoryItemId: string; // FK to inventoryItems
  supplierBatchCode?: string; // The original batch code from the supplier's invoice
  internalBatchCode: string; // Our own generated code (M... or B...)
  qtyInitial: number;
  qtyRemaining: number;
  uom: UoM;
  unitCost: number;
  expiryDate?: string; // ISO String
  locationId?: string;
  isClosed: boolean;
  createdAt: string; 
  updatedAt?: string;
  qcStatus: QcStatus;
  isLegacy?: boolean;
  costLayers?: { qty: number; cost: number }[];
}

export type StockTxnType = 'recepcion' | 'consumo' | 'produccion' | 'ajuste' | 'desperdicio' | 'venta';
export type StockTxnRefCollection = 'purchases' | 'productionRuns' | 'directSales' | 'inventoryAdjustments' | 'expenses';

export interface StockTxn {
  id: string;
  date: Timestamp; 
  inventoryItemId: string;
  batchId: string;
  qtyDelta: number;
  newStock: number;
  unitCost?: number;
  refCollection?: StockTxnRefCollection;
  refId?: string;
  notes?: string;
  txnType: StockTxnType;
  createdAt?: Timestamp;
}


export type RunType   = "blend" | "fill";
export type RunStatus = "Draft" | "Programada" | "En curso" | "Pausada" | "Finalizada" | "Cancelada";
export type BomKind = "blend" | "fill";

export interface Reservation {
  componentId: string;
  batchId: string;
  qtyReserved: number;
  uom: "l" | "u";
}

export interface Shortage {
  componentId: string;
  qtyShort: number;
  supplierSuggested?: string;
}

export interface CleaningLog {
  date: string; // ISO
  type: "initial" | "final";
  userId: string;
  runId?: string;
  material?: string;
}

export interface ProductionRun {
  id: string;
  opCode: string;
  type: RunType;
  status: RunStatus;
  productSku: string;
  productName: string;
  qtyPlanned: number;
  qtyActual?: number;
  lineId: string;
  tankId?: string;
  startPlanned: string; // ISO
  startActual?: string; // ISO
  endActual?: string; // ISO
  lastPausedAt?: string; // ISO
  totalPauseDuration?: number; // Total milliseconds in pause
  reservations: Reservation[];
  shortages: Shortage[];
  consumedComponents?: {
    componentId: string;
    batchId: string;
    componentName: string;
    componentSku?: string;
    quantity: number;
    supplierBatchCode?: string;
    unitCost?: number;
  }[];
  outputBatchId?: string;
  cleaningLogs: CleaningLog[];
  yieldPct?: number;
  bottlesPerHour?: number;
  cost?: { 
    total: number; 
    unit: number; 
  };
  notesPlan?: string;
  notesProd?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  maquilaCost?: number;
  maquilaTax?: number;
}

export type TankStatus = "Libre" | "Ocupado" | "Limpieza";
export interface Tank {
  id: string;
  name: string;
  capacity: number;
  status: TankStatus;
  currentBatchId?: string;
  currentQuantity?: number;
  currentUom?: UoM;
  location: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface BomLine {
  id: string;
  productSku: string;
  componentId: string;
  componentName: string;
  componentSku?: string;
  quantity: number;
  uom: UoM;
  type: BomKind;
  createdAt?: string;
  updatedAt?: string;
}

export type PaidStatus = 'Pendiente' | 'Pagado' | 'Parcial';

export interface IncentiveTxn {
    id: string;
    repId: string;
    period: string; // e.g., "2024-07"
    amount: number;
    currency: Currency;
    notes?: string;
    costCenterId: string;
    paidStatus: PaidStatus;
}

export interface ProductCostSnapshot {
  id: string;
  date: Timestamp;
  productionRunId: string;
  productSku: string;
  unitCost: number;
}

export interface AmbassadorCondition {
    pago_apertura: number;
    bonus_segundo_pedido: number;
    comision_inicial: number;
    comision_indefinida: number;
    min_pedido: number;
    segundo_pedido_plazo_dias: number;
}

export interface AmbassadorSettings {
    horeca: AmbassadorCondition;
    distribuidor_mediano: AmbassadorCondition;
    distribuidor_grande: AmbassadorCondition;
    distribuidor_top: AmbassadorCondition;
}


// --- EXISTING TYPES WITH EXTENSIONS ---

export type PotencialType = 'alto' | 'medio' | 'bajo';
export type AccountStatus = 'Repetición' | 'Activo' | 'Inactivo' | 'Programada' | 'Seguimiento' | 'Fallido' | 'Pendiente';


export interface Account {
  id: string;
  nombre: string;
  ciudad?: string;
  potencial: PotencialType;
  responsableId: string; // FK to TeamMember
  brandAmbassadorId?: string; // FK to TeamMember (Clavadista)
  distributorId?: string; // FK to another Account of type 'Distributor'
  
  status: AccountStatus;
  leadScore: number;
  
  legalName?: string;
  cif?: string; 
  type: AccountType;
  addressBilling?: AddressDetails;
  addressShipping?: AddressDetails;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  iban?: string;
  notes?: string; 
  internalNotes?: string;
  salesRepId?: string;
  embajadorId?: string;
  createdAt: string; 
  updatedAt: string;
  primer_pedido_fecha?: string; // ISO Date String
  segundo_pedido_fecha?: string; // ISO Date String
}

export interface EnrichedAccount extends Account {
  status: AccountStatus;
  leadScore: number;
  nextInteraction?: Order;
  totalSuccessfulOrders: number;
  totalValue: number;
  lastInteractionDate?: Date;
  interactions: Order[];
  responsableName?: string;
  responsableAvatar?: string;
}

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Fallido' | 'Seguimiento' | 'Programada' | 'Facturado' | 'Completado' | 'Pagado';
export type ClientType = 'Distribuidor' | 'HORECA' | 'Retail' | 'Cliente Final' | 'Otro';
export type NextActionType = 'Llamar al responsable de compras' | 'Mandar información' | 'Visitar de nuevo' | 'Enviar muestra' | 'Esperar decisión' | 'Opción personalizada';
export type FailureReasonType = 'No interesado' | 'Ya trabaja con otro proveedor' | 'Sin presupuesto' | 'Producto no encaja' | 'Otro (especificar)';

export interface LatestPurchaseInfo {
  quantityPurchased: number;
  totalPurchaseCost: number;
  purchaseDate: string; 
  calculatedUnitCost: number;
  notes?: string; 
  batchNumber?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  latestPurchase?: LatestPurchaseInfo; 
  stock: number;
  safetyStock?: number;
  sku?: string;
  uom: UoM;
  createdAt?: string | Timestamp | FieldValue;
}

export interface AssignedPromotionalMaterial {
  materialId: string; 
  quantity: number;
}

export type CanalOrigenColocacion = 'Equipo Santa Brisa' | 'Iniciativa Importador' | 'Marketing Digital' | 'Referido' | 'Otro';

export interface AddressDetails {
  street?: string | null;
  number?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null; 
}

export type PaymentMethod = 'Adelantado' | 'Contado' | 'Transferencia 30 días' | 'Giro Bancario';

export interface Order {
  id: string;
  clientName: string;
  visitDate?: string; 
  products?: string[]; 
  value?: number; 
  status: OrderStatus;
  salesRep: string; 
  lastUpdated: string; 
  distributorId?: string; // NEW: Link to the distributor account
  clavadistaId?: string; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 
  canalOrigenColocacion?: CanalOrigenColocacion;
  paymentMethod?: PaymentMethod; 
  iban?: string;
  invoiceUrl?: string;
  invoiceFileName?: string;

  clientType?: ClientType;
  numberOfUnits?: number; 
  unitPrice?: number; 
  clientStatus?: "new" | "existing"; 
  
  notes?: string; 

  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: string; 
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;
  
  accountId?: string; 
  createdAt: string; 
  originatingTaskId?: string;
  taskCategory: 'Commercial' | 'General';
  isCompleted: boolean;
  orderIndex?: number;
  costOfGoods?: number; // Extension
  paidStatus?: PaidStatus; // Extension
  embajadorId?: string;
  comision?: Record<string, any>;
  bonus?: number;
  es_segundo_pedido?: boolean;
  liberado_para_pago?: boolean;
  cif?: string;
  saleType?: 'propia' | 'distribuidor';
}

export type MarketingResourceType = 'Folleto' | 'Presentación' | 'Imagen' | 'Guía';

export interface MarketingResource {
  id: string;
  title: string;
  description: string;
  link: string;
  type: MarketingResourceType;
}

export interface MarketingResourceCategory {
  id: string;
  name: string;
  resources: MarketingResource[];
}

export type AccountType = 'HORECA' | 'Distribuidor' | 'Retail Minorista' | 'Gran Superficie' | 'Evento Especial' | 'Cliente Final Directo' | 'Importador' | 'Otro' | 'distribuidor_mediano' | 'distribuidor_grande' | 'distribuidor_top';

export type CrmEventType = 'Activación en Tienda' | 'Feria Comercial' | 'Evento Corporativo' | 'Degustación' | 'Patrocinio' | 'Activación' | 'Otro';
export type CrmEventStatus = 'Planificado' | 'Confirmado' | 'En Curso' | 'Completado' | 'Cancelado' | 'Pospuesto';

export interface CrmEvent {
  id: string;
  name: string;
  type: CrmEventType;
  status: CrmEventStatus;
  startDate: string; 
  endDate?: string; 
  description?: string;
  location?: string;
  assignedTeamMemberIds: string[]; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 
  notes?: string;
  createdAt: string; 
  updatedAt: string; 
  orderIndex?: number;
  // Financials
  budget?: number;
  currency?: Currency;
  isCashflowForecast?: boolean;
  // KPIs
  salesTarget?: number;
  salesActual?: number;
  // Relation
  accountId?: string;
  accountName?: string;
  costCenterId?: string;
}

// --- NEW EXPENSE TYPES ---
export type DocumentStatus = 'proforma' | 'factura_pendiente' | 'factura_recibida' | 'factura_validada';
export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado' | 'pagado_adelantado';
export type Currency = "EUR" | "USD" | "MXN";

export interface ExpenseItem {
    productoId: string;
    productoNombre?: string;
    cantidad: number;
    costeUnitario: number;
    costeUnitarioProrrateado?: number;
    proveedorLote?: string;
    caducidad?: string;
}

export interface ExpenseAttachment {
  url: string;
  tipo: 'factura' | 'proforma' | 'albaran' | 'otro';
  fileName: string;
}

export interface Expense {
  id: string;
  concepto: string;
  proveedorId?: string; // FK to suppliers
  proveedorNombre?: string;
  categoriaId: string;
  categoria: string; // The NAME of the category at the time of creation
  isInventoryPurchase: boolean;
  
  // States
  estadoDocumento: DocumentStatus;
  estadoPago: PaymentStatus;
  recepcionCompleta?: boolean;

  // Amounts
  monto: number;
  moneda: Currency;
  gastosEnvio?: number;
  impuestos?: number;
  montoPagado?: number;

  // Dates
  fechaEmision?: string; // ISO
  fechaVencimiento?: string; // ISO
  fechaPago?: string; // ISO
  
  // Details
  items?: ExpenseItem[];
  invoiceNumber?: string; 
  notes?: string | null;
  adjuntos?: ExpenseAttachment[];

  // Audit
  creadoPor: string; // User ID
  fechaCreacion: string; // ISO
}


export type SampleRequestStatus = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Enviada';
export type SampleRequestPurpose = 'Captación Cliente Nuevo' | 'Seguimiento Cliente Existente' | 'Material para Evento' | 'Uso Interno/Formación' | 'Otro';

export interface SampleRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  accountId?: string;
  clientName: string;
  purpose: SampleRequestPurpose;
  numberOfSamples: number;
  justificationNotes: string;
  status: SampleRequestStatus;
  requestDate: string; // ISO String
  decisionDate?: string; // ISO String
  adminNotes?: string;
  shippingAddress?: AddressDetails;
}


export type OrderType = 'directa' | 'deposito';
export type DirectSaleChannel = 'Importador' | 'Online' | 'Estratégica' | 'Depósito/Consigna' | 'Otro';
export type DirectSaleStatus = 'borrador' | 'confirmado' | 'enviado' | 'entregado' | 'facturado' | 'pagado' | 'cancelado' | 'en depósito' | 'Confirmada' | 'En Depósito' | 'Facturada' | 'Pagada' | 'Cancelada';

export interface DirectSaleItem {
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  netUnitPrice: number; 
  total: number;
}

export interface DirectSale {
  id: string;
  type: OrderType;
  channel?: DirectSaleChannel;
  customerId: string;
  customerName: string;
  items: DirectSaleItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  issueDate: string; 
  dueDate?: string; 
  invoiceNumber?: string;
  status: DirectSaleStatus;
  paymentMethod?: PaymentMethod;
  relatedPlacementOrders?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  paidStatus?: PaidStatus;
  costOfGoods?: number;
  // Consignment fields
  originalConsignmentId?: string;
  regularizedUnits?: Record<string, number>; // { productId: totalRegularized }
  qtyRemainingInConsignment?: Record<string, number>; // { productId: remaining }
}

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  cif?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: AddressDetails;
  iban?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InteractionType = 'Visita' | 'Llamada' | 'Mail' | 'Otro';
export type InteractionResult = 'Programada' | 'Requiere seguimiento' | 'Pedido Exitoso' | 'Fallida';

export interface Interaction {
  id: string;
  accountId: string;
  tipo: InteractionType;
  resultado: InteractionResult;
  fecha_prevista: string;
  fecha_real?: string;
  importe?: number;
  promoItems?: {id: string, qty: number}[];
  createdBy: string;
  createdAt: string;
}

export type Step = "client" | "outcome" | "details" | "verify";

// --- FORM VALUE TYPES ---
export interface TeamMemberFormValues {
  name: string;
  email: string; 
  role: UserRole;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  avatarUrl?: string;
  authUid?: string;
  liderId?: string;
  uses_custom_conditions?: boolean;
  condiciones_personalizadas?: AmbassadorSettings;
  accountId?: string; // Link to distributor account
}

export interface FollowUpResultFormValues {
  outcome?: "successful" | "failed" | "follow-up";
  paymentMethod?: PaymentMethod;
  numberOfUnits?: number;
  unitPrice?: number;
  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: Date;
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;
  notes?: string;
  assignedSalesRepId?: string;
}

export interface SupplierFormValues {
  name: string;
  code?: string;
  cif?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address_street?: string;
  address_number?: string;
  address_city?: string;
  address_province?: string;
  address_postalCode?: string;
  address_country?: string;
  notes?: string;
}

export interface InventoryItemFormValues {
  name: string;
  description?: string;
  categoryId: string;
  uom?: UoM;
  safetyStock?: number;
}

export interface AccountFormValues {
  name: string;
  legalName?: string;
  cif?: string;
  type: AccountType;
  iban?: string;
  distributorId?: string;
  addressBilling_street?: string;
  addressBilling_number?: string;
  addressBilling_city?: string;
  addressBilling_province?: string;
  addressBilling_postalCode?: string;
  addressBilling_country?: string;
  addressShipping_street?: string;
  addressShipping_number?: string;
  addressShipping_city?: string;
  addressShipping_province?: string;
  addressShipping_postalCode?: string;
  addressShipping_country?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string;
  internalNotes?: string;
  salesRepId?: string;
}

export interface NewScheduledTaskData {
  clientSelectionMode: 'existing' | 'new';
  accountId?: string;
  newClientName?: string;
  notes: string;
  assignedToId?: string;
  visitDate: Date;
  taskCategory: 'Commercial' | 'General';
}

export interface EventFormValues {
  name: string;
  type: CrmEventType;
  status: CrmEventStatus;
  startDate: Date;
  endDate?: Date;
  description?: string;
  location?: string;
  assignedTeamMemberIds: string[];
  assignedMaterials: AssignedPromotionalMaterial[];
  notes?: string;
  orderIndex?: number;
  // Financials
  budget?: number;
  currency?: Currency;
  isCashflowForecast?: boolean;
  // KPIs
  salesTarget?: number;
  salesActual?: number;
  // Relation
  accountId?: string;
  accountName?: string;
  costCenterId?: string;
}

export interface ProductionRunFormValues {
    type: RunType;
    productSku: string;
    productName: string;
    qtyPlanned: number;
    startPlanned: Date;
    lineId: string;
    tankId?: string;
    notesPlan?: string;
    shortages?: Shortage[];
    maquilaCost?: number;
    maquilaTax?: number;
}

export interface FinishProductionRunFormValues {
  qtyActual: number;
  notesProd?: string;
  cleaningConfirmed?: boolean;
  cleaningMaterial?: string;
}


export type DirectSaleWithExtras = import('./schemas/direct-sale-schema').GenerateOrderFormValues & { issueDate: Date; customerId?: string };

export interface BatchFormValues {
  qcStatus: QcStatus;
  expiryDate?: Date | null;
  locationId?: string;
}

export interface ConsumptionPlanItem {
    componentId: string;
    componentName: string;
    componentSku?: string;
    uom: UoM;
    quantityToConsume: number;
    batchId: string;
    batchInternalCode: string;
    unitCost: number;
    supplierBatchCode?: string;
    batchData: ItemBatch;
}

export interface TankFormValues {
    name: string;
    capacity: number;
    location: string;
    status: TankStatus;
    currentBatchId?: string | null;
    currentQuantity?: number | null;
    currentUom?: UoM | null;
}

// Mail Type for Trigger Email Extension
export interface Mail {
  to: string[];
  cc?: string[];
  bcc?: string[];
  message: {
    subject: string;
    html: string;
  };
}


// Purchase Type, derived from form schema
export type PurchaseFormValues = import('./schemas/purchase-schema').PurchaseFormValues;
export type ExpenseType = import('./schemas/purchase-schema').PurchaseFormValues;

export interface SampleRequestFormValues {
  requesterId?: string;
  clientStatus: 'new' | 'existing';
  accountId?: string;
  clientName: string;
  purpose: SampleRequestPurpose;
  numberOfSamples: number;
  justificationNotes: string;
  shippingAddress_street?: string;
  shippingAddress_number?: string;
  shippingAddress_city?: string;
  shippingAddress_province?: string;
  shippingAddress_postalCode?: string;
  shippingAddress_country?: string;
}

// From Holded API
export interface HoldedProject {
    id: string;
    name: string;
    contactName: string;
    status: 0 | 1 | 2; // 0: Pending, 1: Active, 2: Finished
    startedAt: string; // "YYYY-MM-DD"
    dueDate?: string; // "YYYY-MM-DD"
    progress?: number; // 0-100
    total?: number;
    billed?: number;
    pending?: number;
}
