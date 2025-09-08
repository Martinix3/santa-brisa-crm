import type { Timestamp } from "firebase/firestore";
import type { TipoCuenta, AccountStatus, PotencialType, Canal, TipoDistribucion } from '@ssot';


export interface AddressDetails {
  street?: string | null;
  number?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface Account {
  id: string;

  // ✅ Canónico
  name: string;

  // 🔶 Alias legacy (se irá eliminando en lecturas/escrituras)
  nombre?: string;

  legalName?: string;
  type: TipoCuenta;
  status: AccountStatus;
  channel?: Canal;
  distribution_type?: TipoDistribucion;

  distributorId?: string | null;
  owner_user_id?: string;
  salesRepId?: string;
  responsableId?: string;
  embajadorId?: string;
  secondary_owner_ids?: string[];

  cif?: string;
  vat_number?: string;

  // ✅ Canónico
  billing_address?: AddressDetails;
  shipping_address?: AddressDetails;

  // 🔶 Legacy (solo para compatibilidad de lectura)
  addressBilling?: AddressDetails;
  addressShipping?: AddressDetails;

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

  primer_pedido_fecha?: string;
  segundo_pedido_fecha?: string;
  total_orders_count?: number;
}
