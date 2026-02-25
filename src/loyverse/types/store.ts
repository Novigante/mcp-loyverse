export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone_number: string;
  description: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StoresResponse {
  stores: Store[];
}
