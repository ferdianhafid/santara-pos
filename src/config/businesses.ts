export type BusinessSlug = 'santara' | 'parama';

export type BusinessIdentity = {
  id: string;
  slug: BusinessSlug;
  name: string;
  receiptPrefix: 'SAN' | 'PAR';
};

export const SANTARA_BUSINESS: BusinessIdentity = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'santara',
  name: 'Santara Coffee',
  receiptPrefix: 'SAN',
};

export const PARAMA_BUSINESS: BusinessIdentity = {
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'parama',
  name: 'Parama Cafe',
  receiptPrefix: 'PAR',
};

export const SUPPORTED_BUSINESSES = [
  SANTARA_BUSINESS,
  PARAMA_BUSINESS,
] as const;

export function getBusinessById(id: string) {
  return SUPPORTED_BUSINESSES.find((business) => business.id === id) ?? null;
}

export function getBusinessBySlug(slug: string) {
  return SUPPORTED_BUSINESSES.find((business) => business.slug === slug) ?? null;
}

export function getDefaultCashierName(business: BusinessIdentity) {
  return `${business.name} Cashier`;
}
