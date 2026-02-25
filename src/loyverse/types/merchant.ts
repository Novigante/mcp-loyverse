export interface MerchantCurrency {
  code: string;
  decimal_places: number;
}

export interface Merchant {
  id: string;
  business_name: string;
  email: string;
  country: string;
  currency: MerchantCurrency;
  created_at: string;
}
