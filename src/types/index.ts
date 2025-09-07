
import type { Timestamp } from "firebase/firestore";
import type { Account, AccountStatus, AccountType, AddressDetails, PotencialType } from '@/domain/accounts/types';

export * from '@/domain/accounts/types';

// --- ENUMS & SHARED TYPES ---

export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista' | 'Líder Clavadista' | 'Manager' | 'Operaciones' | 'Marketing' | 'Finanzas';
export type Channel = 'horeca' | 'retail' | 'online' | 'b2b';
export type DistributionType = 'direct' | 'via_distributor';
export type TaskStatus = 'Programada' | 'Seguimiento' | 'Completado';
export type TaskArea = 'Ventas' | 'Administración' | 'Marketing' | 'Personal';
export type TaskPriority = 'low' | 'medium' | 'high';
export type InteractionKind = 'visit' | 'call' | 'tasting' | 'email' | 'event';
export type InteractionResult = 'éxito' | 'pendiente' | 'perdido';
export type OrderStatus = 'draft' | 'confirmed' | 'invoiced' | 'shipped' | 'cancelled' | 'Programada' | 'Seguimiento' | 'Completado' | 'Fallido' | 'Pendiente' | 'Procesando' | 'Enviado' | 'Entregado' | 'Facturado' | 'Pagado';
export type OrderOrigin = 'crm' | 'holded' | 'shopify' | 'sendcloud';
export type ProductCat = 'PT' | 'PLV' | 'raw' | 'kit'; // PT: Producto Terminado, PLV: Material Promocional
export type PackType = '1-bot' | '3-bot' | '6-bot' | 'caja' | 'pallet';
export type StockPolicy = 'crm' | 'holded';
export type CrmEventType = 'Activación en Tienda' | 'Feria Comercial' | 'Evento Corporativo' | 'Degustación' | 'Patrocinio' | 'Activación' | 'Otro';
export type CrmEventStatus = 'Planificado' | 'Confirmado' | 'En Curso' | 'Completado' | 'Cancelado' | 'Pospuesto';
export type Currency = "EUR" | "USD" | "MXN";
export type PaidStatus = 'pendiente' | 'parcial' | 'pagado' | 'pagado_adelantado';
export type DocumentStatus = 'proforma' | 'factura_pendiente' | 'factura_recibida' | 'factura_validada';
export type ClientType = 'Distribuidor' | 'HORECA' | 'Retail' | 'Cliente Final' | 'Otro';
export type MarketingResourceType = 'Folleto' | 'Presentación' | 'Imagen' | 'Guía';
export type NextActionType = 'Llamar al responsable de compras' | 'Mandar información' | 'Visitar de nuevo' | 'Enviar muestra' | 'Esperar decisión' | 'Opción personalizada';
export type FailureReasonType = 'No interesado' | 'Ya trabaja con otro proveedor' | 'Sin presupuesto' | 'Producto no encaja' | 'Otro (especificar)';
export type CanalOrigenColocacion = 'Equipo Santa Brisa' | 'Iniciativa Importador' | 'Marketing Digital' | 'Referido' | 'Otro';
export type PaymentMethod = 'Adelantado' | 'Contado' | 'Transferencia 30 días' | 'Giro Bancario';
export type SampleRequestStatus = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Enviada';
export type SampleRequestPurpose = 'Captación Cliente Nuevo' | 'Seguimiento Cliente Existente' | 'Material para Evento' | 'Uso Interno/Formación' | 'Otro';
export type DirectSaleStatus = 'borrador' | 'confirmado' | 'en depósito' | 'facturado' | 'pagado' | 'cancelado';
export type DirectSaleChannel = 'Importador' | 'Online' | 'Estratégica' | 'Depósito/Consigna' | 'Otro';
export type InteractionType = 'Visita' | 'Llamada' | 'Mail' | 'Otro';

export type CategoryKind = 'inventory' | 'cost';
export type RunStatus = "Borrador" | "Programada" | "En curso" | "Pausada" | "Finalizada" | "Cancelada";
export type RunType = "blend" | "fill";
export type TankStatus = "Libre" | "Ocupado" | "Limpieza";
export type UoM = "unit" | "kg" | "g" | "l" | "ml";
export type QcStatus = "Pending" | "Released" | "Rejected";
export type BomKind = "blend" | "fill";

// --- MAIN COLLECTIONS ---

export interface Contact {
  id: string;
  account_id: string; // Ref to Account
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: Timestamp;
}

export interface Task {
  id: string;
  account_id?: string; // Ref to Account
  title: string;
  notes?: string;
  status: TaskStatus;
  due_date: Timestamp;
  assigned_to: string; // UID
  area: TaskArea;
  priority: TaskPriority;
  created_at: Timestamp;
}

export interface Interaction {
  id: string;
  account_id: string; // Ref to Account
  contact_id?: string; // Ref to Contact
  kind: InteractionKind;
  summary: string;
  result: InteractionResult;
  date: Timestamp;
  created_by: string; // UID
  originating_task_id?: string; // Ref to Task
  attachments?: string[]; // Array of URLs
}

export interface OrderProduct {
  sku: string;
  qty: number;
  price: number;
}

export interface AssignedPromotionalMaterial {
  materialId: string;
  quantity: number;
}

export interface Order {
  id: string;
  accountId?: string;
  clientName: string;
  clientStatus: 'new' | 'existing';
  visitDate: string; // ISO Date String
  products?: string[];
  value?: number;
  status: OrderStatus;
  salesRep: string;
  lastUpdated: string; // ISO Date String
  distributorId?: string;
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
  notes?: string;
  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: string;
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;
  createdAt: string;
  originatingTaskId?: string;
  taskCategory: 'Commercial' | 'General';
  isCompleted: boolean;
  orderIndex?: number;
  costOfGoods?: number;
  paidStatus?: PaidStatus;
  embajadorId?: string;
  comision?: number;
  bonus?: number;
  es_segundo_pedido?: boolean;
  liberado_para_pago?: boolean;
  cif?: string;
  saleType?: 'propia' | 'distribuidor';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCat;
  unit: 'bottle' | 'unit' | 'kit';
  pack_type: PackType;
  unit_size_ml?: number;
  abv?: number; // Alcohol by Volume
  prices: Record<string, number>; // e.g., { pvp: 25, distribuidor: 15 }
  tax_rate: number;
  weight_kg?: number;
  stock_policy: StockPolicy;
}

export interface WarehouseInventory {
    id: string; // Usually same as product.sku
    product_sku: string;
    stock_level: number;
    location: string;
}

export interface Shipment {
    id: string;
    order_id: string; // Ref to Order
    tracking_number?: string;
    carrier?: string;
    status: 'pending' | 'in_transit' | 'delivered' | 'failed';
    shipped_at?: Timestamp;
    delivered_at?: Timestamp;
}

export interface BomComponent {
    component_sku: string;
    quantity: number;
}
export interface BillOfMaterials {
    id: string; // e.g., product sku of the finished good
    product_sku: string;
    components: BomComponent[];
}

export interface ProductionExecution {
    id: string;
    bom_id: string; // Ref to BillOfMaterials
    start_time: Timestamp;
    end_time: Timestamp;
    quantity_produced: number;
    consumed_lots: Record<string, number>; // { lot_id: consumed_qty }
    costs: {
        raw_material: number;
        labor: number;
        overhead: number;
    };
}

export interface TraceabilityLot {
    id: string;
    product_sku: string;
    lot_number: string;
    production_exec_id: string; // Ref to ProductionExecution
    qc_status: 'pending' | 'passed' | 'failed';
    expiry_date: Timestamp;
    attached_docs?: Record<string, string>; // { 'Cert. Calidad': 'url', ... }
}

export interface MarketingEvent {
    id: string;
    name: string;
    date: Timestamp;
    location: string;
    invited_account_ids: string[];
    cost: number;
    expected_roi: number;
}

export interface Collaboration {
    id: string;
    influencer_name: string;
    channel: string;
    cost: number;
    reach: number;
    leads_generated: number;
}

export interface PlvAssignment {
    id: string;
    account_id: string; // Ref to Account
    product_sku: string; // Ref to Product (PLV category)
    quantity: number;
    assigned_at: Timestamp;
}

export interface HoldedInvoice {
    id: string; // From Holded
    status: number; // 0=unpaid, 1=paid, 2=draft, 3=partial
    total: number;
    due_date: string; // "YYYY-MM-DD"
}

export interface HoldedPayment {
    id: string;
    date: string; // "YYYY-MM-DD"
    amount: number;
    bank_account_ref?: string;
}

export interface TeamMember {
  id: string; 
  uid?: string; // From Firebase Auth
  name: string;
  email: string; 
  role: UserRole; 
  region?: string;
  permissions?: Record<string, boolean>;
  created_at?: Timestamp;
  // --- Legacy fields to be phased out ---
  authUid?: string;
  avatarUrl?: string; 
  monthlyTargetAccounts?: number; 
  monthlyTargetVisits?: number; 
  bottlesSold?: number; 
  orders?: number; 
  visits?: number; 
  performanceData?: { month: string; bottles: number }[]; 
  updatedAt?: string; 
  liderId?: string;
  equipoIds?: string[];
  condiciones_personalizadas?: any;
  total_comisiones?: number;
  total_bonus?: number;
  total_pedidos?: number;
  accountId?: string;
}

export interface Settings {
    id: string; // e.g., "global"
    agenda_colors: Record<TaskArea, string>;
    pipeline_stages: string[];
    kpis_dashboard: string[];
    branding: {
        primary_color: string;
        secondary_color: string;
        logo_url: string;
    };
}


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

export interface Kpi {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: '€' | 'botellas' | 'cuentas' | 'visitas' | '%' | '';
  icon: React.ElementType;
}

export interface StrategicObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface PromotionalMaterial {
  id: string;
  name: string;
  description?: string;
  unitCost: number;
  stock: number;
  lastPurchase?: {
    date: string;
    quantity: number;
    totalCost: number;
  };
}
export interface PurchaseStatus {
    documento: 'proforma' | 'factura_pendiente' | 'factura_recibida';
    pago: 'pendiente' | 'parcial' | 'pagado' | 'pagado_adelantado';
}

export interface PurchaseItem {
    productoId: string;
    newItemName?: string;
    description: string;
    cantidad: number;
    costeUnitario: number;
    proveedorLote: string;
    caducidad?: string; // ISO string
}

export interface Purchase {
    id: string;
    creadoPor: string;
    fechaCreacion: string; // ISO string
    proveedorId?: string;
    proveedorNombre: string;
    invoiceNumber?: string;
    categoriaId: string;
    categoria?: string;
    isInventoryPurchase: boolean;
    concepto: string;
    monto: number;
    moneda: Currency;
    fechaEmision?: string; // ISO string
    fechaVencimiento?: string; // ISO string
    fechaPago?: string; // ISO string
    estadoDocumento: DocumentStatus;
    estadoPago: PaidStatus;
    recepcionCompleta: boolean;
    items: PurchaseItem[];
    gastosEnvio?: number;
    impuestos?: number;
    notes?: string;
    adjuntos?: { name: string; url: string }[];
}

export interface EnrichedAccount extends Account {
  totalValue: number;
  lastInteractionDate?: Date;
  nextInteraction?: Order;
  interactions: Order[];
  responsableName?: string;
  responsableAvatar?: string;
  total_orders_count?: number;
}

export interface FollowUpResultFormValues {
    outcome: 'successful' | 'failed' | 'follow-up';
    notes?: string;
    paymentMethod?: PaymentMethod;
    numberOfUnits?: number;
    unitPrice?: number;
    nextActionType?: NextActionType;
    nextActionCustom?: string;
    nextActionDate?: Date;
    assignedSalesRepId?: string;
    failureReasonType?: FailureReasonType;
    failureReasonCustom?: string;
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

export interface CrmEvent {
    id: string;
    name: string;
    type: CrmEventType;
    status: CrmEventStatus;
    startDate: string; // ISO String
    endDate?: string; // ISO String
    description?: string;
    location?: string;
    assignedTeamMemberIds: string[];
    assignedMaterials?: AssignedPromotionalMaterial[];
    notes?: string;
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
    orderIndex?: number;
    budget?: number;
    currency?: Currency;
    isCashflowForecast?: boolean;
    salesTarget?: number;
    salesActual?: number;
    accountId?: string;
    accountName?: string;
    costCenterId?: string;
}

export interface EventFormValues extends Omit<CrmEvent, 'id' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'assignedMaterials' | 'assignedTeamMemberIds'> {
    startDate: Date;
    endDate?: Date;
    assignedMaterials?: { materialId: string; quantity: number }[];
    assignedTeamMemberIds: string[];
}

export interface CostCenter {
  id: string;
  name: string;
  type: 'Marketing' | 'Event' | 'COGS' | 'Incentive' | 'General';
  parentId?: string;
}

export interface CostCenterFormValues extends Omit<CostCenter, 'id'> {}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  isConsumable?: boolean;
  costType?: 'fixed' | 'variable';
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
  idOverride?: string; // Only for seeding
}

export interface InventoryItemFormValues {
    name: string;
    description?: string;
    categoryId: string;
    uom: UoM;
    safetyStock?: number;
}

export interface LatestPurchaseInfo {
    quantityPurchased: number;
    totalPurchaseCost: number;
    purchaseDate: string; // ISO String
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
    createdAt?: string; // ISO String
}


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
    createdAt: string; // ISO String
    updatedAt?: string; // ISO String
    qcStatus: QcStatus;
    isLegacy?: boolean;
    costLayers?: { componentBatchId: string, cost: number }[];
}

export interface BatchFormValues {
  qcStatus: QcStatus;
  expiryDate?: Date | null;
  locationId?: string;
}


export interface Shortage {
  componentId: string;
  qtyShort: number;
}

export interface ConsumptionPlanItem {
  componentId: string;
  componentName: string;
  componentSku?: string;
  uom: UoM;
  quantityToConsume: number;
  batchId: string;
  batchInternalCode: string;
  supplierBatchCode?: string;
  unitCost: number;
  batchData: ItemBatch;
}

export interface CleaningLog {
    date: string;
    type: 'initial' | 'final';
    userId: string;
    runId: string;
    material?: string;
}

export interface ProductionRun {
    id: string;
    opCode: string; // ej: P240725-L1-001-M
    type: RunType; // 'blend' | 'fill'
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
    totalPauseDuration?: number; // ms
    reservations: string[]; // IDs de las órdenes de venta
    shortages: Shortage[];
    consumedComponents: ConsumptionPlanItem[];
    outputBatchId?: string; // ref a itemBatches
    cleaningLogs: CleaningLog[];
    yieldPct?: number;
    bottlesPerHour?: number;
    cost?: { total: number, unit: number };
    notesPlan?: string;
    notesProd?: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    maquilaCost?: number;
    maquilaTax?: number;
}
export interface ProductionRunFormValues extends Omit<ProductionRun, 'id' | 'createdAt' | 'updatedAt' | 'opCode' | 'status' | 'qtyActual' | 'startActual' | 'endActual' | 'lastPausedAt'| 'totalPauseDuration' | 'reservations' | 'consumedComponents' | 'outputBatchId' | 'cleaningLogs' | 'yieldPct' | 'bottlesPerHour' | 'cost' | 'notesProd' | 'startPlanned'> {
    startPlanned: Date;
}
export interface FinishProductionRunFormValues {
    qtyActual: number;
    notesProd?: string;
    cleaningConfirmed: boolean;
    cleaningMaterial?: string;
}

export interface Tank {
  id: string;
  name: string;
  capacity: number; // in Liters
  status: TankStatus;
  currentBatchId?: string | null;
  currentQuantity?: number | null;
  currentUom?: UoM | null;
  location: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
export interface TankFormValues extends Omit<Tank, 'id' | 'createdAt' | 'updatedAt'> {}

export interface TeamMemberFormValues {
  name: string;
  email: string;
  role: UserRole;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  authUid?: string;
  avatarUrl?: string;
  liderId?: string;
  uses_custom_conditions?: boolean;
  condiciones_personalizadas?: any;
  accountId?: string;
}

export interface EnrichedTeamMember extends TeamMember {
  monthlyAccountsAchieved: number;
  monthlyVisitsAchieved: number;
}

export interface SampleRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  clientStatus: 'new' | 'existing';
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

export interface SampleRequestFormValues extends Omit<SampleRequest, 'id' | 'requesterId' | 'requesterName' | 'status' | 'requestDate' | 'decisionDate' | 'adminNotes' | 'shippingAddress'> {
    shippingAddress_street?: string | null;
    shippingAddress_number?: string | null;
    shippingAddress_city?: string | null;
    shippingAddress_province?: string | null;
    shippingAddress_postalCode?: string | null;
    shippingAddress_country?: string | null;
}

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
  customerId: string;
  customerName: string;
  channel?: DirectSaleChannel;
  items: DirectSaleItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  issueDate: string; // ISO
  dueDate?: string; // ISO
  invoiceNumber?: string;
  status: DirectSaleStatus;
  relatedPlacementOrders?: string[];
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  paidStatus: PaidStatus;
  paymentMethod?: PaymentMethod;
  costOfGoods?: number;
  type: OrderType;
  qtyRemainingInConsignment?: Record<string, number>; // { productId: qty }
  originalConsignmentId?: string;
}

export interface HoldedProject {
    id: string;
    name: string;
    status: number; // 0=pending, 1=active, 2=finished
    contactName?: string;
    startedAt?: string; // YYYY-MM-DD
}

export interface StickyNote {
  id: string;
  content: string;
  creatorId: string;
  assignedToId: string;
  isCompleted: boolean;
  createdAt: string; // ISO String
}

export interface HorecaRule {
  stage: 'openAccount' | 'repeat45d' | 'months1to3' | 'afterMonth4';
  label: string;
  condition?: "firstOrder" | "secondOrderWithinDays";
  minOrderCases?: number;
  days?: number;
  fixedFee?: number;
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

export interface AmbassadorSettings {
  horeca: Omit<HorecaRule, 'stage' | 'label' | 'condition'>;
  distribuidor_mediano: Omit<DistributorRule, 'tier' | 'label'>;
  distribuidor_grande: Omit<DistributorRule, 'tier' | 'label'>;
  distribuidor_top: Omit<DistributorRule, 'tier' | 'label'>;
}

export interface EarningsConfig {
  horecaRules: HorecaRule[];
  distributorRules: DistributorRule[];
}

export type OrderType = 'directa' | 'deposito';
