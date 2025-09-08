import type { Timestamp } from "firebase/firestore";
import type { 
    TipoCuenta, 
    AccountStage,
    Canal, 
    TipoDistribucion, 
    RolUsuario, 
    EstadoPedido, 
    InteractionKind,
    InteractionResult,
    InteractionStatus,
    EventKind,
    PlvStatus,
    MetodoPago
} from "@ssot";

// --- DOMAIN-SPECIFIC SUB-TYPES ---

export interface Address {
  street?: string;
  number?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export interface OrderItem {
  sku: string;
  name?: string;
  qty: number;
  unitPrice?: number;
  discountPct?: number;
}

// --- CORE MODELS ---

export interface Account {
  id: string;
  name: string;               // canonical (antes: name/nombre)
  legalName?: string;
  cif?: string;               // VAT
  city?: string;              // canonical (antes: city/ciudad)

  // Identidad y segmentos
  accountType?: TipoCuenta | string;
  tags?: string[];

  // Propiedad / jerarquía
  salesRepId?: string;        // canonical (antes: salesRepId/responsableId)
  distributorId?: string | null;
  parentAccountId?: string | null;

  // Estado operacional (derivado)
  accountStage: AccountStage;

  // Contacto
  mainContactName?: string;
  mainContactEmail?: string;

  // Direcciones
  addressBilling?: Address;
  addressShipping?: Address;

  // Aux
  nameNorm?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}


export interface Order {
  id: string;
  accountId: string;
  distributorId?: string | null;
  date: string | Timestamp;
  amount: number;
  currency: "EUR" | "USD";
  items: OrderItem[];
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Interaction {
  id: string;
  accountId: string;
  kind: InteractionKind;
  when: string | Timestamp;
  status: InteractionStatus;
  result?: InteractionResult;
  summary?: string;
  nextAt?: string | Timestamp;
  createdById?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CrmEvent {
  id: string;
  accountId?: string | null;
  kind: EventKind;
  title: string;
  startAt: string | Timestamp;
  endAt?: string | Timestamp;
  location?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlvMaterial {
  id: string;
  accountId: string;
  kind: "EXPOSITOR" | "POSTER" | "NEVERA" | "OTRO";
  title?: string;
  quantity?: number;
  status?: PlvStatus;
  photoUrl?: string;
  installedAt?: string | Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PriceList {
  id: string;
  name: string;
  currency: "EUR" | "USD";
  validFrom?: string;
  validTo?: string;
  lines: Array<{ sku: string; price: number }>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AccountPriceOverride {
  id: string;
  accountId: string;
  sku: string;
  price: number;
  currency: "EUR" | "USD";
  validFrom?: string;
  validTo?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
