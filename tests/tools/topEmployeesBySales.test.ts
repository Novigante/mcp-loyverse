import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topEmployeesBySalesHandler } from '../../src/tools/topEmployeesBySales.js';
import type { ReceiptsClient } from '../../src/loyverse/receiptsClient.js';
import type { EmployeesClient } from '../../src/loyverse/employeesClient.js';
import type { Receipt, ReceiptsResponse, ReceiptLineItem } from '../../src/loyverse/types/receipt.js';
import type { EmployeesResponse } from '../../src/loyverse/types/employee.js';

function makeLineItem(overrides: Partial<ReceiptLineItem> = {}): ReceiptLineItem {
  return {
    id: 'line-1',
    item_id: 'item-1',
    variant_id: 'var-1',
    item_name: 'Taco',
    variant_name: 'Regular',
    sku: 'SKU-001',
    quantity: 1,
    price: 50,
    gross_total_money: 50,
    total_money: 50,
    cost: 20,
    cost_total: 20,
    line_note: '',
    total_discount: 0,
    line_taxes: [],
    line_discounts: [],
    line_modifiers: [],
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    receipt_number: 'R-001',
    receipt_type: 'SALE',
    receipt_date: '2025-06-01T12:00:00.000Z',
    created_at: '2025-06-01T12:00:00.000Z',
    updated_at: '2025-06-01T12:00:00.000Z',
    cancelled_at: null,
    refund_for: null,
    order: '',
    source: 'POS',
    note: '',
    customer_id: null,
    employee_id: 'emp-1',
    store_id: 'store-1',
    pos_device_id: 'pos-1',
    dining_option: 'DINE_IN',
    total_money: 100,
    total_tax: 16,
    total_discount: 0,
    tip: 10,
    surcharge: 0,
    points_earned: 0,
    points_deducted: 0,
    points_balance: 0,
    line_items: [makeLineItem()],
    total_discounts: [],
    total_taxes: [],
    payments: [],
    ...overrides,
  };
}

describe('topEmployeesBySalesHandler', () => {
  let mockReceiptsClient: { listReceipts: ReturnType<typeof vi.fn> };
  let mockEmployeesClient: { listEmployees: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReceiptsClient = { listReceipts: vi.fn() };
    mockEmployeesClient = { listEmployees: vi.fn() };
  });

  it('returns ranking with employee names resolved', async () => {
    const receipts: Receipt[] = [
      makeReceipt({ employee_id: 'emp-1', total_money: 300 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-1', total_money: 200 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-2', total_money: 400 }),
    ];
    const receiptResponse: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(receiptResponse);

    const employeesResponse: EmployeesResponse = {
      employees: [
        { id: 'emp-1', name: 'Alice', email: '', phone_number: '', stores: [], is_owner: false, created_at: '', updated_at: '', deleted_at: null },
        { id: 'emp-2', name: 'Bob', email: '', phone_number: '', stores: [], is_owner: false, created_at: '', updated_at: '', deleted_at: null },
      ],
    };
    mockEmployeesClient.listEmployees.mockResolvedValue(employeesResponse);

    const result = await topEmployeesBySalesHandler(
      { period: 'today', metric: 'sales_amount' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockEmployeesClient as unknown as EmployeesClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.employees).toHaveLength(2);
    expect(data.employees[0].employeeId).toBe('emp-1');
    expect(data.employees[0].employeeName).toBe('Alice');
    expect(data.employees[0].totalSales).toBe(500);
    expect(data.employees[0].receiptCount).toBe(2);
    expect(data.employees[1].employeeId).toBe('emp-2');
    expect(data.employees[1].employeeName).toBe('Bob');
    expect(data.employees[1].totalSales).toBe(400);
    expect(data.period.from).toBeDefined();
  });

  it('handles unknown employee_id gracefully', async () => {
    const receipts: Receipt[] = [
      makeReceipt({ employee_id: null, total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-999', total_money: 200 }),
    ];
    const receiptResponse: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(receiptResponse);

    const employeesResponse: EmployeesResponse = { employees: [] };
    mockEmployeesClient.listEmployees.mockResolvedValue(employeesResponse);

    const result = await topEmployeesBySalesHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockEmployeesClient as unknown as EmployeesClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.employees).toHaveLength(2);
    // emp-999 has higher sales
    expect(data.employees[0].employeeId).toBe('emp-999');
    expect(data.employees[0].employeeName).toBeUndefined();
    expect(data.employees[1].employeeId).toBe('unknown');
  });

  it('ranks by receipt_count when specified', async () => {
    const receipts: Receipt[] = [
      makeReceipt({ employee_id: 'emp-1', total_money: 500 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-2', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-2', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-004', employee_id: 'emp-2', total_money: 100 }),
    ];
    const receiptResponse: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(receiptResponse);

    const employeesResponse: EmployeesResponse = { employees: [] };
    mockEmployeesClient.listEmployees.mockResolvedValue(employeesResponse);

    const result = await topEmployeesBySalesHandler(
      { period: 'today', metric: 'receipt_count' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockEmployeesClient as unknown as EmployeesClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.employees[0].employeeId).toBe('emp-2');
    expect(data.employees[0].receiptCount).toBe(3);
  });

  it('returns empty array for empty period', async () => {
    const receiptResponse: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(receiptResponse);

    const result = await topEmployeesBySalesHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockEmployeesClient as unknown as EmployeesClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.employees).toEqual([]);
    // Should NOT call employees API if no receipts
    expect(mockEmployeesClient.listEmployees).not.toHaveBeenCalled();
  });

  it('requires date period or explicit range', async () => {
    const result = await topEmployeesBySalesHandler(
      {},
      mockReceiptsClient as unknown as ReceiptsClient,
      mockEmployeesClient as unknown as EmployeesClient,
      'UTC',
    );

    expect(result.isError).toBe(true);
  });
});
