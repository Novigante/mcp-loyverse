import type { LoyverseHttpClient } from './httpClient.js';
import type { Employee, EmployeesResponse } from './types/employee.js';

export interface ListEmployeesParams {
  employeeIds?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  showDeleted?: boolean;
  limit?: number;
  cursor?: string;
}

export class EmployeesClient {
  constructor(private readonly http: LoyverseHttpClient) {}

  async listEmployees(params: ListEmployeesParams): Promise<EmployeesResponse> {
    const query: Record<string, string> = {};

    if (params.employeeIds !== undefined) query.employee_ids = params.employeeIds;
    if (params.createdAtMin !== undefined) query.created_at_min = params.createdAtMin;
    if (params.createdAtMax !== undefined) query.created_at_max = params.createdAtMax;
    if (params.updatedAtMin !== undefined) query.updated_at_min = params.updatedAtMin;
    if (params.updatedAtMax !== undefined) query.updated_at_max = params.updatedAtMax;
    if (params.showDeleted !== undefined) query.show_deleted = String(params.showDeleted);
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.cursor !== undefined) query.cursor = params.cursor;

    return this.http.get<EmployeesResponse>('/employees', query);
  }

  async getEmployee(employeeId: string): Promise<Employee> {
    return this.http.get<Employee>(`/employees/${employeeId}`);
  }
}
