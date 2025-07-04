

export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista';

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
}

// --- ERP DATA MODELS ---

export type CategoryKind = 'inventory' | 'cost' | 'revenue' | 'production' | 'stock';
export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  isConsumable?: boolean;
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

export interface ItemBatch {
  id: string;
  sku: string;
  purchaseId?: string;
  supplierBatchCode?: string;
  qtyInitial: number;
  uom: UoM;
  unitCost: number;
  expiryDate?: string; // YYYY-MM-DD
  createdAt: string; // ISO String
}

export type StockTxnType = 'receive' | 'consume' | 'produce' | 'adjust' | 'waste' | 'sale';
export type StockTxnRefCollection = 'purchases' | 'productionRuns' | 'directSales';

export interface StockTxn {
  id: string;
  date: string; // ISO String
  sku: string;
  batchId?: string;
  qtyDelta: number; // Positive for additions, negative for subtractions
  costDelta: number; // Positive for additions, negative for subtractions. Matches qtyDelta sign.
  uom: UoM;
  txnType: StockTxnType;
  refCollection: StockTxnRefCollection;
  refId: string;
  costCenterIds?: string[];
  createdAt: string; // ISO String
}

export interface BomLine {
  id: string;
  productSku: string;
  componentSku: string;
  quantity: number;
  uom: UoM;
  lossFactor?: number; // 0-1
}

export type ProductionRunStatus = 'draft' | 'in-progress' | 'finished' | 'cancelled';

export interface ProductionRun {
  id: string;
  sku: string;
  qtyPlanned: number;
  qtyProduced?: number;
  status: ProductionRunStatus;
  startDate: string; // ISO String
  endDate?: string; // ISO String
  inputsCost?: number;
  overheadCost?: number;
  unitCost?: number; // Snapshot of cost at completion
}

export type CashTxnDirection = 'in' | 'out';

export interface CashTxn {
  id: string;
  date: string; // ISO String
  amount: number;
  currency: Currency;
  amountEq: number; // Value in base currency (e.g., EUR)
  direction: CashTxnDirection;
  refCollection: 'purchases' | 'directSales' | 'payrolls' | 'incentives';
  refId: string;
  costCenterIds?: string[];
  notes?: string;
}

export interface FxRate {
    date: string; // YYYY-MM-DD
    base: Currency;
    quote: Currency;
    rate: number;
}

export interface ProductCostSnapshot {
    sku: string;
    date: string; // YYYY-MM-DD
    unitCost: number;
}

export type PaidStatus = 'Pendiente' | 'Pagado' | 'Cobrado' | 'Parcial';

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


// --- EXISTING TYPES WITH EXTENSIONS ---

export type PotencialType = 'alto' | 'medio' | 'bajo';
export type AccountStatus = 'Repetición' | 'Activo' | 'Programada' | 'Seguimiento' | 'Fallido';

export interface Account {
  id: string;
  nombre: string;
  ciudad?: string;
  potencial: PotencialType;
  responsableId: string; // FK to TeamMember
  brandAmbassadorId?: string; // FK to TeamMember (Clavadista)
  
  status: AccountStatus; // This is now a calculated field in EnrichedAccount, but the type is reused. The raw field may be deprecated.
  leadScore: number;

  legalName?: string;
  cif: string; 
  type: AccountType;
  addressBilling?: AddressDetails;
  addressShipping?: AddressDetails;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  iban?: string;
  notes?: string; 
  internalNotes?: string;
  salesRepId?: string; // Kept for compatibility, should transition to responsableId
  createdAt: string; 
  updatedAt: string; 
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

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Fallido' | 'Seguimiento' | 'Programada' | 'Facturado' | 'Completado';
export type ClientType = 'Distribuidor' | 'HORECA' | 'Retail' | 'Cliente Final';
export type NextActionType = 'Llamar al responsable de compras' | 'Mandar información' | 'Visitar de nuevo' | 'Enviar muestra' | 'Esperar decisión' | 'Opción personalizada';
export type FailureReasonType = 'No interesado' | 'Ya trabaja con otro proveedor' | 'Sin presupuesto' | 'Producto no encaja' | 'Otro (especificar)';

export interface LatestPurchaseInfo {
  quantityPurchased: number;
  totalPurchaseCost: number;
  purchaseDate: string; 
  calculatedUnitCost: number;
  notes?: string; 
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  latestPurchase?: LatestPurchaseInfo; 
  stock: number;
  sku?: string;
}

export interface AssignedPromotionalMaterial {
  materialId: string; 
  quantity: number;
}

export type CanalOrigenColocacion = 'Equipo Santa Brisa' | 'Iniciativa Importador' | 'Marketing Digital' | 'Referido' | 'Otro';

export interface AddressDetails {
  street: string | null;
  number?: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
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

export type AccountType = 'HORECA' | 'Distribuidor' | 'Retail Minorista' | 'Gran Superficie' | 'Evento Especial' | 'Cliente Final Directo' | 'Importador' | 'Otro';

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
}

export type PurchaseStatus = 'Borrador' | 'Proforma Recibida' | 'Pagado' | 'Pago a 30 días' | 'Factura Recibida' | 'Completado' | 'Cancelado';
export type PurchaseCategory = 'Materia Prima (COGS)' | 'Material de Embalaje (COGS)' | 'Material Promocional' | 'Gastos de Eventos' | 'Publicidad y Promoción' | 'Gastos de Logística' | 'Gastos Operativos' | 'Otro';
export type Currency = "EUR" | "USD" | "MXN";

export interface PurchaseItem {
  materialId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  batchNumber?: string;
  destSku?: string;
  total: number;
}

export interface Purchase {
  id: string;
  supplier: string;
  supplierId?: string;
  categoryId: string; // Replaces 'category' string
  costCenterIds?: string[]; // Extension
  items: PurchaseItem[];
  currency: Currency;
  subtotal: number;
  tax: number;
  taxRate: number;
  shippingCost?: number;
  totalAmount: number;
  orderDate: string; // YYYY-MM-DD
  status: PurchaseStatus;
  invoiceUrl?: string; 
  invoiceContentType?: string;
  storagePath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  requestDate: string;
  decisionDate?: string;
  adminNotes?: string;
  shippingAddress?: AddressDetails;
}

export type DirectSaleStatus = 'Borrador' | 'Confirmada' | 'Facturada' | 'Pagada' | 'Cancelada';
export type DirectSaleChannel = 'Importador' | 'Online' | 'Estratégica' | 'Otro';

export interface DirectSaleItem {
  productId?: string | null;
  productName: string;
  quantity: number;
  netUnitPrice: number; 
  total: number;
}

export interface DirectSale {
  id: string;
  customerId: string;
  customerName: string;
  channel: DirectSaleChannel;
  items: DirectSaleItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  issueDate: string; 
  dueDate?: string; 
  invoiceNumber?: string;
  status: DirectSaleStatus;
  relatedPlacementOrders?: string[]; // IDs de las órdenes de colocación que cubre esta venta
  notes?: string;
  createdAt: string;
  updatedAt: string;
  costOfGoods?: number; // Extension
  paidStatus?: PaidStatus; // Extension
}

export interface Supplier {
  id: string;
  name: string;
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

export interface PurchaseFormValues {
  supplier: string;
  supplierCif?: string; // Para creación automática
  supplierAddress_street?: string;
  supplierAddress_number?: string;
  supplierAddress_city?: string;
  supplierAddress_province?: string;
  supplierAddress_postalCode?: string;
  supplierAddress_country?: string;

  orderDate: Date;
  status: PurchaseStatus;
  categoryId: string; // Changed from category
  costCenterIds?: string[]; // New
  currency: Currency;
  items: {
    materialId: string;
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    batchNumber?: string;
  }[];
  shippingCost?: number | null;
  taxRate: number;
  notes?: string;
  invoiceFile?: File | null;
  invoiceDataUri?: string | null;
  invoiceUrl?: string;
  invoiceContentType?: string;
  storagePath?: string;
}

export interface TeamMemberFormValues {
  name: string;
  email: string; 
  role: UserRole;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  avatarUrl?: string;
  authUid?: string; 
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

export type SampleRequestStatus = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Enviada';
export type SampleRequestPurpose = 'Captación Cliente Nuevo' | 'Seguimiento Cliente Existente' | 'Material para Evento' | 'Uso Interno/Formación' | 'Otro';

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

export interface SupplierFormValues {
  name: string;
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
  sku?: string;
  latestPurchaseQuantity?: number;
  latestPurchaseTotalCost?: number;
  latestPurchaseDate?: Date;
  latestPurchaseNotes?: string;
}

export interface AccountFormValues {
  name: string;
  legalName?: string;
  cif: string;
  type: AccountType;
  iban?: string;
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
}
