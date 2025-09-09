import type { Timestamp } from "firebase/firestore";
import type { 
    TipoCuenta, 
    AccountStage,
    RolUsuario, 
    EstadoPedido, 
    InteractionKind,
    InteractionResult,
    InteractionStatus,
    TipoEventoCrm as EventKind,
    PlvStatus,
    MetodoPago,
    CanalOrigenColocacion,
    SiguienteAccion,
    MotivoFallo,
    TipoCliente,
    EstadoDocumento,
    EstadoPago,
    ProductionRunStatus,
    EstadoQC,
    EstadoTanque,
    EstadoVentaDirecta,
    EstadoSolicitudMuestra,
    UdM,
    TipoBOM,
    AmbassadorSettings as AmbassadorSettingsType,
    TipoCategoria,
    TipoEjecucion,
    TipoPedido
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
  name: string;
  legalName?: string;
  accountType: TipoCuenta | string;
  accountStage: AccountStage | string;
  tags?: string[];
  distributorId?: string | null;
  parentAccountId?: string | null;
  owner_user_id?: string;
  cif?: string;
  addressBilling?: AddressDetails;
  addressShipping?: AddressDetails;
  city?: string;
  country?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  notes?: string;
  salesRepId?: string; // Legacy, to be removed
  responsableId?: string; // Legacy, to be removed
  nombre?: string; // Legacy, to be removed
  status?: string; // Legacy, to be removed
  potencial?: string; // Legacy, to be removed
  leadScore?: number; // Legacy, to be removed
  type?: string; // Legacy, to be removed
}

export interface EnrichedAccount extends Account {
  nextInteraction?: Order;
  totalSuccessfulOrders: number;
  totalValue: number;
  lastInteractionDate?: string;
  interactions?: Order[];
  responsableId: string;
  responsableName?: string;
  responsableAvatar?: string;
  distributorName?: string;
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
  paidStatus?: EstadoPago;
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

export interface CrmEvent {
  id: string;
  name: string;
  type: EventKind;
  status: EstadoEventoCrm;
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
  kind: TipoCategoria;
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
  uom: UdM;
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
    uom: UdM;
    unitCost: number;
    expiryDate?: string; // ISO String
    locationId?: string;
    isClosed: boolean;
    createdAt: string; // ISO String
    updatedAt?: string; // ISO String
    qcStatus: EstadoQC;
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
    estadoDocumento: EstadoDocumento;
    estadoPago: EstadoPago;
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
  type: TipoEjecucion;
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
    status: EstadoTanque;
    currentBatchId?: string | null;
    currentQuantity?: number | null;
    currentUom?: UdM | null;
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
  channel?: string;
  items: DirectSaleItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  issueDate: string; // ISO
  dueDate?: string; // ISO
  invoiceNumber?: string;
  status: EstadoVentaDirecta;
  relatedPlacementOrders?: string[];
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  paidStatus: EstadoPago;
  paymentMethod?: MetodoPago;
  costOfGoods?: number;
  type: TipoPedido;
  qtyRemainingInConsignment?: { [productId: string]: number };
  originalConsignmentId?: string;
}

export interface SampleRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  accountId?: string;
  clientName: string;
  purpose: string;
  numberOfSamples: number;
  justificationNotes: string;
  status: EstadoSolicitudMuestra;
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
    uom: UdM;
    quantityToConsume: number;
    batchId: string;
    batchInternalCode: string;
    unitCost: number;
    supplierBatchCode?: string;
    batchData: ItemBatch;
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

export interface EventFormValues extends Omit<CrmEvent, 'id' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' > {
    startDate: Date;
    endDate?: Date;
}

export interface ProductionRunFormValues extends Omit<ProductionRun, 'id' | 'createdAt' | 'updatedAt' | 'startPlanned' > {
    startPlanned: Date;
}

export interface FinishProductionRunFormValues {
    qtyActual: number;
    notesProd?: string;
    cleaningConfirmed?: boolean;
    cleaningMaterial?: string;
}
