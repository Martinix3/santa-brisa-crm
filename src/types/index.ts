
import { Timestamp, FieldValue } from "firebase/firestore";

// --- ENUMS & SHARED TYPES ---

export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista' | 'Líder Clavadista' | 'Manager' | 'Operaciones' | 'Marketing' | 'Finanzas';
export type AccountType = 'prospect' | 'customer' | 'distributor' | 'importer';
export type AccountStatus = 'lead' | 'qualified' | 'active' | 'dormant' | 'lost';
export type Channel = 'horeca' | 'retail' | 'online' | 'b2b';
export type DistributionType = 'direct' | 'via_distributor';
export type TaskStatus = 'Programada' | 'Seguimiento' | 'Completado';
export type TaskArea = 'Ventas' | 'Administración' | 'Marketing' | 'Personal';
export type TaskPriority = 'low' | 'medium' | 'high';
export type InteractionKind = 'visit' | 'call' | 'tasting' | 'email' | 'event';
export type InteractionResult = 'éxito' | 'pendiente' | 'perdido';
export type OrderStatus = 'draft' | 'confirmed' | 'invoiced' | 'shipped' | 'cancelled';
export type OrderOrigin = 'crm' | 'holded' | 'shopify' | 'sendcloud';
export type ProductCat = 'PT' | 'PLV' | 'raw' | 'kit'; // PT: Producto Terminado, PLV: Material Promocional
export type PackType = '1-bot' | '3-bot' | '6-bot' | 'caja' | 'pallet';
export type StockPolicy = 'crm' | 'holded';
export type EventType = 'Activación en Tienda' | 'Feria Comercial' | 'Evento Corporativo' | 'Degustación' | 'Patrocinio' | 'Activación' | 'Otro';
export type EventStatus = 'Planificado' | 'Confirmado' | 'En Curso' | 'Completado' | 'Cancelado' | 'Pospuesto';
export type Currency = "EUR" | "USD" | "MXN";
export type PaidStatus = 'pendiente' | 'parcial' | 'pagado' | 'pagado_adelantado';
export type DocumentStatus = 'proforma' | 'factura_pendiente' | 'factura_recibida' | 'factura_validada';

// --- MAIN COLLECTIONS ---

export interface AddressDetails {
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  channel: Channel;
  distribution_type: DistributionType;
  distributor_id?: string | null; // Ref to another Account
  owner_user_id: string; // UID
  secondary_owner_ids?: string[];
  vat_number?: string;
  billing_address?: AddressDetails;
  shipping_address?: AddressDetails;
  city?: string;
  region?: string;
  country?: string;
  lead_score?: number;
  sb_score?: number; // Scoring propio
  next_action?: string;
  next_action_date?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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

export interface Order {
  id: string;
  account_id: string; // Ref to Account
  distributor_id?: string | null; // Ref to Account
  products: OrderProduct[];
  status: OrderStatus;
  origin: OrderOrigin;
  sellout_reported?: boolean;
  invoice_id?: string; // Ref to Holded Invoice
  created_at: Timestamp;
  updated_at: Timestamp;
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
  uid: string; // From Firebase Auth
  name: string;
  email: string; 
  role: UserRole; 
  region?: string;
  permissions?: Record<string, boolean>;
  created_at: Timestamp;
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

