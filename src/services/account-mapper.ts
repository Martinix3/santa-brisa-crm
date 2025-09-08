
import type { Account, AccountFormValues } from '@/types';

const norm = (s?: string | null) => (s ?? '').trim() || undefined;

export function fromFirestore(raw: any): Account {
  const name = raw.name ?? raw.nombre ?? '';
  const billing_address = raw.billing_address ?? raw.addressBilling ?? null;
  const shipping_address = raw.shipping_address ?? raw.addressShipping ?? null;

  return {
    id: String(raw.id),
    name,
    nombre: raw.nombre,
    legalName: raw.legalName,
    type: raw.type,
    status: raw.status,
    channel: raw.channel,
    distribution_type: raw.distribution_type,
    distributorId: raw.distributorId ?? null,
    owner_user_id: raw.owner_user_id,
    salesRepId: raw.salesRepId,
    responsableId: raw.responsableId,
    embajadorId: raw.embajadorId,
    secondary_owner_ids: raw.secondary_owner_ids,
    cif: raw.cif,
    vat_number: raw.vat_number,
    billing_address: billing_address ?? undefined,
    shipping_address: shipping_address ?? undefined,
    addressBilling: raw.addressBilling,
    addressShipping: raw.addressShipping,
    city: raw.city,
    ciudad: raw.ciudad,
    region: raw.region,
    country: raw.country,
    potencial: raw.potencial,
    leadScore: raw.leadScore,
    sb_score: raw.sb_score,
    next_action: raw.next_action,
    next_action_date: raw.next_action_date,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    iban: raw.iban,
    mainContactName: raw.mainContactName,
    mainContactEmail: raw.mainContactEmail,
    mainContactPhone: raw.mainContactPhone,
    notes: raw.notes,
    internalNotes: raw.internalNotes,
    primer_pedido_fecha: raw.primer_pedido_fecha,
    segundo_pedido_fecha: raw.segundo_pedido_fecha,
    total_orders_count: raw.total_orders_count,
  };
}

export function toFirestore(a: Partial<Account>): any {
    const data: { [key: string]: any } = {};

    // Always write the canonical 'name'
    if (a.name) {
        data.name = a.name;
        data.nombre = a.name; // Continue writing legacy field for compatibility
    }

    // Map all other potential fields from the partial Account object
    const fieldsToMap: (keyof Account)[] = [
        'legalName', 'type', 'status', 'channel', 'distribution_type', 'distributorId',
        'owner_user_id', 'salesRepId', 'responsableId', 'embajadorId', 'secondary_owner_ids',
        'cif', 'vat_number', 'billing_address', 'shipping_address', 'city', 'region', 'country',
        'potencial', 'leadScore', 'sb_score', 'next_action', 'next_action_date',
        'createdAt', 'updatedAt', 'iban', 'mainContactName', 'mainContactEmail',
        'mainContactPhone', 'notes', 'internalNotes', 'primer_pedido_fecha',
        'segundo_pedido_fecha', 'total_orders_count'
    ];

    fieldsToMap.forEach(key => {
        if (a[key] !== undefined) {
            data[key] = a[key];
        }
    });

    return data;
}


export function formToAccountPartial(f: AccountFormValues): Partial<Account> {
  const billing_address = {
    street: norm(f.addressBilling_street),
    number: norm(f.addressBilling_number),
    city: norm(f.addressBilling_city),
    province: norm(f.addressBilling_province),
    postalCode: norm(f.addressBilling_postalCode),
    country: norm(f.addressBilling_country ?? 'España'),
  };
  const shipping_address = {
    street: norm(f.addressShipping_street),
    number: norm(f.addressShipping_number),
    city: norm(f.addressShipping_city),
    province: norm(f.addressShipping_province),
    postalCode: norm(f.addressShipping_postalCode),
    country: norm(f.addressShipping_country ?? 'España'),
  };
  const has = (o: any) => Object.values(o).some(Boolean);

  return {
    name: f.name, // unificado
    legalName: norm(f.legalName),
    cif: norm(f.cif),
    type: f.type,
    iban: norm(f.iban),
    distributorId: norm(f.distributorId),
    billing_address: has(billing_address) ? billing_address : undefined,
    shipping_address: has(shipping_address) ? shipping_address : undefined,
    mainContactName: norm(f.mainContactName),
    mainContactEmail: norm(f.mainContactEmail),
    mainContactPhone: norm(f.mainContactPhone),
    notes: norm(f.notes),
    internalNotes: norm(f.internalNotes),
    salesRepId: f.salesRepId === '##NONE##' ? undefined : norm(f.salesRepId),
  };
}

export function accountToForm(a: Account): AccountFormValues {
  const b = a.billing_address ?? a.addressBilling ?? {};
  const s = a.shipping_address ?? a.addressShipping ?? {};
  return {
    name: a.name ?? a.nombre ?? '',
    legalName: a.legalName ?? '',
    cif: a.cif ?? '',
    type: a.type,
    iban: a.iban ?? '',
    distributorId: a.distributorId ?? '',
    addressBilling_street: b.street ?? '',
    addressBilling_number: b.number ?? '',
    addressBilling_city: b.city ?? '',
    addressBilling_province: b.province ?? '',
    addressBilling_postalCode: b.postalCode ?? '',
    addressBilling_country: b.country ?? 'España',
    addressShipping_street: s.street ?? '',
    addressShipping_number: s.number ?? '',
    addressShipping_city: s.city ?? '',
    addressShipping_province: s.province ?? '',
    addressShipping_postalCode: s.postalCode ?? '',
    addressShipping_country: s.country ?? 'España',
    mainContactName: a.mainContactName ?? '',
    mainContactEmail: a.mainContactEmail ?? '',
    mainContactPhone: a.mainContactPhone ?? '',
    notes: a.notes ?? '',
    internalNotes: a.internalNotes ?? '',
    salesRepId: a.salesRepId ?? undefined,
  };
}
