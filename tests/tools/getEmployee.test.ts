import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployeeHandler } from '../../src/tools/getEmployee.js';
import type { EmployeesClient } from '../../src/loyverse/employeesClient.js';
import { NotFoundError } from '../../src/loyverse/errors.js';
import type { Employee } from '../../src/loyverse/types/employee.js';

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

describe('getEmployee tool', () => {
  let mockEmployeesClient: { getEmployee: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockEmployeesClient = { getEmployee: vi.fn() };
  });

  it('returns employee data for valid employee_id', async () => {
    const employee = makeEmployee({ id: 'abc-123', name: 'Jane Smith' });
    mockEmployeesClient.getEmployee.mockResolvedValue(employee);

    const result = await getEmployeeHandler(
      { employee_id: 'abc-123' },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe('abc-123');
    expect(data.name).toBe('Jane Smith');
    expect(mockEmployeesClient.getEmployee).toHaveBeenCalledWith('abc-123');
  });

  it('returns error when employee_id is empty', async () => {
    const result = await getEmployeeHandler(
      { employee_id: '' },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns clear error message on 404', async () => {
    mockEmployeesClient.getEmployee.mockRejectedValue(
      new NotFoundError('Employee not found'),
    );

    const result = await getEmployeeHandler(
      { employee_id: '550e8400-e29b-41d4-a716-446655440099' },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('handles unexpected errors gracefully', async () => {
    mockEmployeesClient.getEmployee.mockRejectedValue(new Error('Network error'));

    const result = await getEmployeeHandler(
      { employee_id: '550e8400-e29b-41d4-a716-446655440000' },
      mockEmployeesClient as unknown as EmployeesClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
