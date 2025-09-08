// This file contains the old data models for reference during the migration.
// Once all modules are updated to use the new canonical models from models.ts,
// this file can be safely deleted.

import type { Timestamp } from "firebase/firestore";
import type { 
    TipoCuenta as LegacyTipoCuenta,
    AccountStatus as LegacyAccountStatus, 
    PotencialType, 
    RolUsuario as LegacyRolUsuario, 
    EstadoPedido as LegacyEstadoPedido, 
    SiguienteAccion as LegacySiguienteAccion, 
    MotivoFallo as LegacyMotivoFallo, 
    TipoCliente as LegacyTipoCliente,
    CanalOrigenColocacion as LegacyCanalOrigenColocacion,
    MetodoPago as LegacyMetodoPago,
    CrmEventType as LegacyCrmEventType,
    CrmEventStatus as LegacyCrmEventStatus,
    PaymentStatus as LegacyPaymentStatus,
    DocumentStatus as LegacyDocumentStatus,
    ProductionRunStatus as LegacyProductionRunStatus,
    QcStatus as LegacyQcStatus,
    TankStatus as LegacyTankStatus,
    DirectSaleStatus as LegacyDirectSaleStatus,
    SampleRequestStatus as LegacySampleRequestStatus,
    UoM as LegacyUoM,
    TipoBOM as LegacyBomKind,
    AmbassadorSettings as LegacyAmbassadorSettingsType,
    TipoCategoria as LegacyCategoryKind,
    TipoEjecucion as LegacyRunType,
    TipoPedido as LegacyOrderType
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
  nombre?: string;
  legalName?: string;
  type: LegacyTipoCuenta;
  status: LegacyAccountStatus;
  distributorId?: string | null;
  salesRepId?: string; 
  responsableId?: string;
  embajadorId?: string;
  cif?: string;
  addressBilling?: AddressDetails; 
  addressShipping?: AddressDetails;
  ciudad?: string;
  potencial: PotencialType;
  leadScore: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  iban?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string;
  internalNotes?: string;
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

export interface Interaction extends Order {
    // Legacy/Combined type, now just use Order
}

export interface Order {
  id: string;
  clientName: string;
  visitDate?: string; // ISO Date String
  products?: string[];
  value?: number;
  status: LegacyEstadoPedido;
  salesRep?: string;
  lastUpdated: string; // ISO Date String
  distributorId?: string;
  clavadistaId?: string;
  assignedMaterials?: AssignedPromotionalMaterial[];
  canalOrigenColocacion?: LegacyCanalOrigenColocacion;
  paymentMethod?: LegacyMetodoPago;
  iban?: string;
  invoiceUrl?: string;
  invoiceFileName?: string;
  clientType?: LegacyTipoCliente;
  numberOfUnits?: number;
  unitPrice?: number;
  clientStatus?: 'new' | 'existing';
  notes?: string;
  nextActionType?: LegacySiguienteAccion;
  nextActionCustom?: string;
  nextActionDate?: string; // ISO Date String
  failureReasonType?: LegacyMotivoFallo;
  failureReasonCustom?: string;
  accountId?: string;
  createdAt: string; // ISO Date String
  originatingTaskId?: string;
  taskCategory: 'Commercial' | 'General';
  isCompleted?: boolean;
  orderIndex: number;
  costOfGoods?: number;
  paidStatus?: LegacyPaymentStatus;
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
  role: LegacyRolUsuario;
  avatarUrl?: string;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  createdAt?: string; // ISO String
  updatedAt?: string; // ISO String
  liderId?: string;
  equipoIds?: string[];
  condiciones_personalizadas?: LegacyAmbassadorSettingsType;
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
  type: LegacyCrmEventType;
  status: LegacyCrmEventStatus;
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
  kind: LegacyCategoryKind;
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
  uom: LegacyUoM;
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
    uom: LegacyUoM;
    unitCost: number;
    expiryDate?: string; // ISO String
    locationId?: string;
    isClosed: boolean;
    createdAt: string; // ISO String
    updatedAt?: string; // ISO String
    qcStatus: LegacyQcStatus;
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
    estadoDocumento: LegacyDocumentStatus;
    estadoPago: LegacyPaymentStatus;
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
  type: LegacyRunType;
  status: LegacyProductionRunStatus;
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
    status: LegacyTankStatus;
    currentBatchId?: string | null;
    currentQuantity?: number | null;
    currentUom?: LegacyUoM | null;
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
  status: LegacyDirectSaleStatus;
  relatedPlacementOrders?: string[];
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  paidStatus: LegacyPaymentStatus;
  paymentMethod?: LegacyMetodoPago;
  costOfGoods?: number;
  type: LegacyOrderType;
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
  status: LegacySampleRequestStatus;
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
    uom: LegacyUoM;
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
    paymentMethod?: LegacyMetodoPago;
    numberOfUnits?: number;
    unitPrice?: number;
    nextActionType?: LegacySiguienteAccion;
    nextActionCustom?: string;
    nextActionDate?: Date;
    assignedSalesRepId?: string;
    failureReasonType?: LegacyMotivoFallo;
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
