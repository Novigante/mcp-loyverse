export interface Employee {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  stores: string[];
  is_owner: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmployeesResponse {
  employees: Employee[];
  cursor?: string;
}
