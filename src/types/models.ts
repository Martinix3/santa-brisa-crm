import type { Timestamp } from "firebase/firestore";
import type { 
    TipoCuenta, 
    AccountStatus, 
    PotencialType, 
    Canal, 
    TipoDistribucion, 
    RolUsuario, 
    EstadoPedido, 
    SiguienteAccion, 
    MotivoFallo, 
    TipoCliente,
    CanalOrigenColocacion,
    MetodoPago,
    CrmEventType,
    CrmEventStatus,
    PaymentStatus,
    DocumentStatus,
    ProductionRunStatus,
    QcStatus,
    TankStatus,
    DirectSaleStatus,
    SampleRequestStatus,
    PurchaseStatus,
    UoM,
    TipoBOM as BomKind,
    AmbassadorSettings as AmbassadorSettingsType,
    TipoCategoria as CategoryKind,
    TipoEjecucion as RunType,
    TipoPedido as OrderType
} from "@ssot";


// --- DOMAIN-SPECIFIC SUB-TYPES ---

export interface AddressDetails {
  street?: string | null;
  number?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface AssignedPromotionalMaterial {
    materialId: string;
    quantity: number;
}

// --- CORE MODELS ---

export interface Account {
  id: string;
  name: string; // Canonical
  nombre?: string; // Legacy
  legalName?: string;
  type: TipoCuenta;
  status: AccountStatus;
  channel?: Canal;
  distribution_type?: TipoDistribucion;
  distributorId?: string | null;
  owner_user_id?: string;
  salesRepId?: string; // Legacy
  responsableId?: string; // Legacy
  embajadorId?: string;
  secondary_owner_ids?: string[];
  cif?: string;
  vat_number?: string;
  billing_address?: AddressDetails; // Canonical
  shipping_address?: AddressDetails; // Canonical
  addressBilling?: AddressDetails; // Legacy
  addressShipping?: AddressDetails; // Legacy
  city?: string;
  region?: string;
  country?: string;
  ciudad?: string; // Legacy
  potencial: PotencialType;
  leadScore: number;
  sb_score?: number;
  next_action?: string;
  next_action_date?: Timestamp;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  iban?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string;
  internalNotes?: string;
  primer_pedido_fecha?: string; // ISO
  segundo_pedido_fecha?: string; // ISO
  total_orders_count?: number;
}

export interface EnrichedAccount extends Account {
  nextInteraction?: Order;
  totalSuccessfulOrders: number;
  totalValue: number;
  lastInteractionDate?: string;
  interactions?: Order[];
  responsableName?: string;
  responsableAvatar?: string;
}

export interface Interaction extends Order {
    // Legacy/Combined type, now just use Order
}

export interface Order {
  id: string;
  clientName: string;
  visitDate?: string; // ISO Date String
  products?: string[];
  value?: number;
  status: EstadoPedido;
  salesRep?: string;
  lastUpdated: string; // ISO Date String
  distributorId?: string;
  clavadistaId?: string;
  assignedMaterials?: AssignedPromotionalMaterial[];
  canalOrigenColocacion?: CanalOrigenColocacion;
  paymentMethod?: MetodoPago;
  iban?: string;
  invoiceUrl?: string;
  invoiceFileName?: string;
  clientType?: TipoCliente;
  numberOfUnits?: number;
  unitPrice?: number;
  clientStatus?: 'new' | 'existing';
  notes?: string;
  nextActionType?: SiguienteAccion;
  nextActionCustom?: string;
  nextActionDate?: string; // ISO Date String
  failureReasonType?: MotivoFallo;
  failureReasonCustom?: string;
  accountId?: string;
  createdAt: string; // ISO Date String
  originatingTaskId?: string;
  taskCategory: 'Commercial' | 'General';
  isCompleted?: boolean;
  orderIndex: number;
  costOfGoods?: number;
  paidStatus?: PaymentStatus;
  embajadorId?: string;
  comision?: number;
  bonus?: number;
  es_segundo_pedido?: boolean;
  liberado_para_pago?: boolean;
  cif?: string;
  saleType?: string;
}


export interface TeamMember {
  id: string;
  authUid: string;
  name: string;
  email: string;
  role: RolUsuario;
  avatarUrl?: string;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  createdAt?: string; // ISO String
  updatedAt?: string; // ISO String
  liderId?: string;
  equipoIds?: string[];
  condiciones_personalizadas?: AmbassadorSettingsType;
  total_comisiones?: number;
  total_bonus?: number;
  accountId?: string;
}

export interface TeamMemberFormValues extends Omit<TeamMember, 'id' | 'authUid' | 'createdAt' | 'updatedAt' | 'total_comisiones' | 'total_bonus'> {
  uses_custom_conditions?: boolean;
}

export interface AmbassadorSettings {
  horeca: HorecaRule;
  distribuidor_mediano: DistributorRule;
  distribuidor_grande: DistributorRule;
  distribuidor_top: DistributorRule;
}

export interface HorecaRule {
  pago_apertura: number;
  bonus_segundo_pedido: number;
  comision_inicial: number;
  comision_indefinida: number;
  min_pedido: number;
  segundo_pedido_plazo_dias: number;
}

export interface DistributorRule {
  pago_apertura: number;
  bonus_segundo_pedido: number;
  comision_inicial: number;
  comision_indefinida: number;
  min_pedido: number;
  segundo_pedido_plazo_dias: number;
}

export interface CrmEvent {
  id: string;
  name: string;
  type: CrmEventType;
  status: CrmEventStatus;
  startDate: string; // ISO Date String
  endDate?: string; // ISO Date String
  description?: string;
  location?: string;
  assignedTeamMemberIds: string[];
  assignedMaterials?: AssignedPromotionalMaterial[];
  notes?: string;
  orderIndex?: number;
  budget?: number;
  currency?: "EUR" | "USD" | "MXN";
  isCashflowForecast?: boolean;
  salesTarget?: number;
  salesActual?: number;
  accountId?: string;
  accountName?: string;
  costCenterId?: string;
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
}

export interface EventFormValues extends Omit<CrmEvent, 'id'| 'createdAt'| 'updatedAt'> {
    startDate: Date;
    endDate?: Date;
}

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

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  isConsumable: boolean;
  costType?: 'fixed' | 'variable';
  parentId?: string;
  idOverride?: string;
  createdAt?: string; // ISO String
  updatedAt?: string; // ISO String
}

export interface CostCenter {
    id: string;
    name: string;
    type: 'Marketing' | 'Event' | 'COGS' | 'Incentive' | 'General';
    parentId?: string;
}

export interface LatestPurchaseInfo {
  quantityPurchased: number;
  totalPurchaseCost: number;
  purchaseDate: string; // ISO Date String
  calculatedUnitCost: number;
  notes?: string;
  batchNumber?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  stock: number;
  safetyStock?: number;
  sku?: string;
  uom: UoM;
  latestPurchase?: LatestPurchaseInfo;
  createdAt?: string;
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
    costLayers?: {
        componentId: string;
        componentName: string;
        componentBatchId: string;
        quantity: number;
        unitCost: number;
    }[];
}

export interface StockTxn {
    id: string;
    inventoryItemId: string;
    batchId: string;
    date: Timestamp;
    qtyDelta: number; // Positive for additions, negative for consumptions
    newStock: number; // Stock of the item AFTER this transaction
    unitCost?: number;
    refCollection: 'purchases' | 'productionRuns' | 'directSales' | 'manual_adjustment';
    refId: string;
    txnType: 'recepcion' | 'consumo' | 'produccion' | 'venta' | 'ajuste';
    notes?: string;
    createdAt?: Timestamp;
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
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Expense {
    id: string;
    categoriaId?: string;
    categoria?: string;
    isInventoryPurchase: boolean;
    estadoDocumento: DocumentStatus;
    estadoPago: PaymentStatus;
    recepcionCompleta?: boolean;
    concepto: string;
    monto: number;
    moneda: "EUR" | "USD" | "MXN";
    fechaEmision: string; // ISO
    fechaVencimiento?: string; // ISO
    fechaPago?: string; // ISO
    items: {
        productoId: string;
        newItemName?: string;
        description?: string;
        cantidad: number;
        costeUnitario: number;
        proveedorLote: string;
        caducidad?: string; // ISO
    }[];
    gastosEnvio?: number;
    impuestos?: number;
    proveedorId?: string;
    proveedorNombre?: string;
    invoiceNumber?: string;
    notes?: string;
    adjuntos?: { url: string; name: string }[];
    creadoPor: string; // User ID
    fechaCreacion: string; // ISO
}

export interface ProductionRun {
  id: string;
  opCode: string;
  type: RunType;
  status: ProductionRunStatus;
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
  totalPauseDuration?: number; // Milliseconds
  reservations?: {
    orderId: string;
    qty: number;
  }[];
  shortages: Shortage[];
  consumedComponents?: ConsumptionPlanItem[];
  outputBatchId?: string;
  cleaningLogs?: CleaningLog[];
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

export interface Tank {
    id: string;
    name: string;
    capacity: number;
    status: TankStatus;
    currentBatchId?: string | null;
    currentQuantity?: number | null;
    currentUom?: UoM | null;
    location: string;
    createdAt?: string; // ISO String
    updatedAt?: string; // ISO String
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
  channel?: CanalVentaDirecta;
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
  paidStatus: PaymentStatus;
  paymentMethod?: MetodoPago;
  costOfGoods?: number;
  type: OrderType;
  qtyRemainingInConsignment?: { [productId: string]: number };
  originalConsignmentId?: string;
}

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
  requestDate: string; // ISO Date
  decisionDate?: string; // ISO Date
  adminNotes?: string;
  shippingAddress?: AddressDetails;
}

export interface StickyNote {
  id: string;
  content: string;
  creatorId: string;
  assignedToId: string;
  isCompleted: boolean;
  createdAt: string; // ISO Date String
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
    unitCost: number;
    supplierBatchCode?: string;
    batchData: ItemBatch;
}

export interface FinishProductionRunFormValues {
    qtyActual: number;
    notesProd?: string;
    cleaningConfirmed?: boolean;
    cleaningMaterial?: string;
}

export interface CleaningLog {
    date: string; // ISO
    type: 'initial' | 'final';
    userId: string;
    runId: string;
    material: string;
}

// --- FORM VALUE TYPES (Subset of main types) ---
export type AccountFormValues = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'potencial' | 'leadScore'>;
export type SupplierFormValues = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;
export type InventoryItemFormValues = Omit<InventoryItem, 'id' | 'stock' | 'latestPurchase' | 'createdAt' | 'sku' | 'averageCost'>;
export type BatchFormValues = Pick<ItemBatch, 'qcStatus' | 'expiryDate' | 'locationId'>;
export type TankFormValues = Omit<Tank, 'id' | 'createdAt' | 'updatedAt'>;
export type SampleRequestFormValues = Pick<SampleRequest, 'accountId' | 'clientName' | 'purpose' | 'numberOfSamples' | 'justificationNotes'> & {
    isNewClient: boolean;
    requesterId?: string;
    shippingAddress_street?: string;
    shippingAddress_number?: string;
    shippingAddress_city?: string;
    shippingAddress_province?: string;
    shippingAddress_postalCode?: string;
    shippingAddress_country?: string;
    clientStatus: 'new' | 'existing';
};

export interface FollowUpResultFormValues {
    outcome: 'successful' | 'failed' | 'follow-up';
    notes?: string;
    paymentMethod?: MetodoPago;
    numberOfUnits?: number;
    unitPrice?: number;
    nextActionType?: SiguienteAccion;
    nextActionCustom?: string;
    nextActionDate?: Date;
    assignedSalesRepId?: string;
    failureReasonType?: MotivoFallo;
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
