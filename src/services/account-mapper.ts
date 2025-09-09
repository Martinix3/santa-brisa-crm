
import type { Account } from '@/types';
import type { AccountFormValues } from '@/lib/schemas/account-schema';
import { parseISO, isValid } from 'date-fns';

const norm = (s?: string | null): string | undefined => (s?.trim() ? s.trim() : undefined);

const toISOString = (dateValue: any): string | undefined => {
  if (!dateValue) return undefined;
  if (typeof dateValue.toDate === 'function') {
    return dateValue.toDate().toISOString();
  }
  if (typeof dateValue === 'string') {
    const d = parseISO(dateValue);
    if (isValid(d)) return d.toISOString();
  }
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue.toISOString();
  }
  return undefined;
};

export function fromFirestore(data: any): Account {
  if (!data) throw new Error("Received undefined data for account mapping");
  return {
    id: data.id,
    name: data.name ?? "",
    legalName: data.legalName,
    accountType: data.accountType ?? "OTRO",
    accountStage: data.accountStage ?? "POTENCIAL",
    tags: data.tags || [],
    distributorId: data.distributorId,
    parentAccountId: data.parentAccountId,
    owner_user_id: data.owner_user_id || data.salesRepId,
    cif: data.cif,
    addressBilling: data.addressBilling,
    addressShipping: data.addressShipping,
    city: data.city,
    country: data.country,
    mainContactName: data.mainContactName,
    mainContactEmail: data.mainContactEmail,
    mainContactPhone: data.mainContactPhone,
    createdAt: toISOString(data.createdAt)!,
    updatedAt: toISOString(data.updatedAt)!,
    notes: data.notes,
  } as Account;
}

export function toFirestore(a: Partial<Account>) {
  return {
    name: a.name ?? "",
    accountType: a.accountType ?? "OTRO",
    accountStage: a.accountStage ?? "POTENCIAL",
    city: a.city ?? undefined,
    distributorId: a.distributorId ?? null,
    parentAccountId: a.parentAccountId ?? null,
    createdAt: a.createdAt ?? new Date(),
    updatedAt: new Date(),
  };
}

export function formToAccountPartial(f: AccountFormValues): Partial<Account> {
  const parseAddress = (addr?: string | null): object | undefined => {
    if (!addr) return undefined;
    const parts = addr.split(',').map(s => s.trim());
    return {
        street: parts[0] || undefined,
        city: parts[1] || undefined,
        province: parts[2] || undefined,
        country: parts[3] || undefined,
    };
  };

  return {
    name: f.name,
    accountType: f.accountType,
    city: norm(f.city),
    country: norm(f.country),
    owner_user_id: f.salesRepId,
    mainContactName: norm(f.mainContactName),
    mainContactEmail: norm(f.mainContactEmail),
    mainContactPhone: norm(f.mainContactPhone),
    distributorId: norm(f.distributorId),
    parentAccountId: norm(f.parentAccountId),
    addressBilling: parseAddress(f.addressBilling),
    addressShipping: parseAddress(f.addressShipping),
    notes: norm(f.notes),
    tags: f.tags,
  };
}

export function accountToForm(a: Account): AccountFormValues {
    const formatAddress = (addr?: any): string => {
        if (!addr) return '';
        return [addr.street, addr.city, addr.province, addr.country].filter(Boolean).join(', ');
    };

    return {
        name: a.name ?? '',
        accountType: a.accountType ?? 'OTRO',
        city: a.city ?? '',
        country: a.country ?? 'ES',
        salesRepId: a.owner_user_id ?? a.salesRepId ?? '',
        mainContactName: a.mainContactName ?? '',
        mainContactEmail: a.mainContactEmail ?? '',
        mainContactPhone: a.mainContactPhone ?? '',
        distributorId: a.distributorId ?? '',
        parentAccountId: a.parentAccountId ?? '',
        addressBilling: formatAddress(a.addressBilling),
        addressShipping: formatAddress(a.addressShipping),
        notes: a.notes ?? '',
        tags: a.tags ?? [],
    };
}
