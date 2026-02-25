import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listEmployeesHandler } from '../../src/tools/listEmployees.js';
import type { EmployeesClient } from '../../src/loyverse/employeesClient.js';
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

describe('listEmployees tool', () => {
  let mockEmployeesClient: { listEmployees: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockEmployeesClient = { listEmployees: vi.fn() };
  });

  it('lists employees with default params', async () => {
    const response: EmployeesResponse = { employees: [makeEmployee()], cursor: 'next' };
    mockEmployeesClient.listEmployees.mockResolvedValue(response);

    const result = await listEmployeesHandler(
      { limit: 50 },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.employees).toHaveLength(1);
    expect(data.cursor).toBe('next');
    expect(mockEmployeesClient.listEmployees).toHaveBeenCalledWith({
      limit: 50,
      cursor: undefined,
      employeeIds: undefined,
    });
  });

  it('forwards employee_ids filter to the client', async () => {
    const response: EmployeesResponse = { employees: [] };
    mockEmployeesClient.listEmployees.mockResolvedValue(response);

    await listEmployeesHandler(
      { employee_ids: 'id1,id2', limit: 50 },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    const callArgs = mockEmployeesClient.listEmployees.mock.calls[0][0];
    expect(callArgs.employeeIds).toBe('id1,id2');
  });

  it('forwards pagination params to the client', async () => {
    const response: EmployeesResponse = { employees: [] };
    mockEmployeesClient.listEmployees.mockResolvedValue(response);

    await listEmployeesHandler(
      { limit: 100, cursor: 'abc123' },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    const callArgs = mockEmployeesClient.listEmployees.mock.calls[0][0];
    expect(callArgs.limit).toBe(100);
    expect(callArgs.cursor).toBe('abc123');
  });

  it('handles API errors gracefully', async () => {
    mockEmployeesClient.listEmployees.mockRejectedValue(new Error('API timeout'));

    const result = await listEmployeesHandler(
      { limit: 50 },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toContain('API timeout');
  });
});
