import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeesClient } from '../../src/loyverse/employeesClient.js';
import type { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
import type { Employee, EmployeesResponse } from '../../src/loyverse/types/employee.js';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    email: 'john@example.com',
    phone_number: '+525512345678',
    stores: ['store-uuid-1'],
    is_owner: false,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('EmployeesClient', () => {
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let client: EmployeesClient;

  beforeEach(() => {
    mockHttpClient = { get: vi.fn() };
    client = new EmployeesClient(mockHttpClient as unknown as LoyverseHttpClient);
  });

  describe('listEmployees', () => {
    it('calls /employees with no params when none provided', async () => {
      const response: EmployeesResponse = { employees: [] };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listEmployees({});

      expect(mockHttpClient.get).toHaveBeenCalledWith('/employees', {});
      expect(result).toEqual(response);
    });

    it('maps camelCase params to snake_case query params', async () => {
      const response: EmployeesResponse = { employees: [makeEmployee()], cursor: 'next' };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listEmployees({
        employeeIds: 'id1,id2',
        createdAtMin: '2025-01-01T00:00:00.000Z',
        createdAtMax: '2025-01-31T23:59:59.999Z',
        updatedAtMin: '2025-01-15T00:00:00.000Z',
        updatedAtMax: '2025-01-20T23:59:59.999Z',
        showDeleted: true,
        limit: 100,
        cursor: 'prev-cursor',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/employees', {
        employee_ids: 'id1,id2',
        created_at_min: '2025-01-01T00:00:00.000Z',
        created_at_max: '2025-01-31T23:59:59.999Z',
        updated_at_min: '2025-01-15T00:00:00.000Z',
        updated_at_max: '2025-01-20T23:59:59.999Z',
        show_deleted: 'true',
        limit: '100',
        cursor: 'prev-cursor',
      });
      expect(result.employees).toHaveLength(1);
      expect(result.cursor).toBe('next');
    });

    it('omits undefined params from query', async () => {
      const response: EmployeesResponse = { employees: [] };
      mockHttpClient.get.mockResolvedValue(response);

      await client.listEmployees({ limit: 25 });

      const params = mockHttpClient.get.mock.calls[0][1] as Record<string, string>;
      expect(params).toEqual({ limit: '25' });
      expect(params).not.toHaveProperty('employee_ids');
      expect(params).not.toHaveProperty('show_deleted');
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(client.listEmployees({})).rejects.toThrow('Network error');
    });
  });

  describe('getEmployee', () => {
    it('calls /employees/{employee_id} with the employee ID', async () => {
      const employee = makeEmployee({ id: 'abc-123' });
      mockHttpClient.get.mockResolvedValue(employee);

      const result = await client.getEmployee('abc-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/employees/abc-123');
      expect(result).toEqual(employee);
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      await expect(client.getEmployee('nope')).rejects.toThrow('Not found');
    });
  });
});
