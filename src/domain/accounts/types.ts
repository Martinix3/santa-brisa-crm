import type { Timestamp } from "firebase/firestore";

export type AccountType = 'prospect' | 'customer' | 'distributor' | 'importer';
export type AccountStatus = 'lead' | 'qualified' | 'active' | 'dormant' | 'lost' | 'Programada' | 'Seguimiento' | 'Repetición' | 'Fallido' | 'Pendiente' | 'Inactivo';
export type PotencialType = 'alto' | 'medio' | 'bajo';
export type Channel = 'horeca' | 'retail' | 'online' | 'b2b';
export type DistributionType = 'direct' | 'via_distributor';

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
  nombre: string;
  legalName?: string;
  type: AccountType;
  status: AccountStatus;
  channel?: Channel;
  distribution_type?: DistributionType;
  distributorId?: string | null; // Ref to another Account
  owner_user_id?: string; // UID
  salesRepId?: string; // legacy
  responsableId?: string; // legacy
  embajadorId?: string;
  secondary_owner_ids?: string[];
  cif?: string;
  vat_number?: string;
  billing_address?: AddressDetails;
  addressBilling?: AddressDetails; // legacy
  shipping_address?: AddressDetails;
  addressShipping?: AddressDetails; // legacy
  city?: string;
  region?: string;
  country?: string;
  potencial: PotencialType;
  leadScore: number;
  sb_score?: number; // Scoring propio
  next_action?: string;
  next_action_date?: Timestamp;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
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
