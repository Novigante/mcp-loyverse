export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  region: string;
  postal_code: string;
  country_code: string;
  note: string;
  first_visit: string;
  last_visit: string;
  total_visits: number;
  total_points: number;
  total_money_spent: number;
  created_at: string;
  updated_at: string;
  permanent_deletion_at: string | null;
}

export interface CustomersResponse {
  customers: Customer[];
  cursor?: string;
}
