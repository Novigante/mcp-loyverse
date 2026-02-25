import { describe, it, expect } from 'vitest';
import {
  computeSalesSummary,
  computeTopItems,
  computeTopEmployees,
} from '../../../src/domain/analytics/salesAggregations.js';
import type { Receipt, ReceiptLineItem } from '../../../src/loyverse/types/receipt.js';

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

describe('computeSalesSummary', () => {
  it('returns zero summary for empty receipts', () => {
    const summary = computeSalesSummary([]);

    expect(summary.totalSales).toBe(0);
    expect(summary.receiptCount).toBe(0);
    expect(summary.averageTicket).toBe(0);
    expect(summary.grossSales).toBe(0);
    expect(summary.totalDiscounts).toBe(0);
    expect(summary.totalTax).toBe(0);
    expect(summary.totalTips).toBe(0);
  });

  it('sums values from valid SALE receipts', () => {
    const receipts = [
      makeReceipt({ total_money: 100, total_discount: 20, total_tax: 16, tip: 10 }),
      makeReceipt({ receipt_number: 'R-002', total_money: 200, total_discount: 30, total_tax: 32, tip: 20 }),
    ];

    const summary = computeSalesSummary(receipts);

    expect(summary.totalSales).toBe(300);
    expect(summary.grossSales).toBe(350);
    expect(summary.totalDiscounts).toBe(50);
    expect(summary.totalTax).toBe(48);
    expect(summary.totalTips).toBe(30);
    expect(summary.receiptCount).toBe(2);
    expect(summary.averageTicket).toBe(150);
  });

  it('excludes REFUND receipts', () => {
    const receipts = [
      makeReceipt({ total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', receipt_type: 'REFUND', total_money: 50 }),
    ];

    const summary = computeSalesSummary(receipts);

    expect(summary.totalSales).toBe(100);
    expect(summary.receiptCount).toBe(1);
  });

  it('excludes cancelled receipts', () => {
    const receipts = [
      makeReceipt({ total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', cancelled_at: '2025-06-01T13:00:00.000Z', total_money: 50 }),
    ];

    const summary = computeSalesSummary(receipts);

    expect(summary.totalSales).toBe(100);
    expect(summary.receiptCount).toBe(1);
  });

  it('excludes both REFUND and cancelled receipts in mix', () => {
    const receipts = [
      makeReceipt({ total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', receipt_type: 'REFUND', total_money: 50 }),
      makeReceipt({ receipt_number: 'R-003', cancelled_at: '2025-06-01T13:00:00.000Z', total_money: 75 }),
    ];

    const summary = computeSalesSummary(receipts);

    expect(summary.totalSales).toBe(100);
    expect(summary.receiptCount).toBe(1);
  });

  it('single receipt: average equals total', () => {
    const receipts = [makeReceipt({ total_money: 250 })];

    const summary = computeSalesSummary(receipts);

    expect(summary.averageTicket).toBe(250);
  });

  it('includes period in the result', () => {
    const summary = computeSalesSummary([], {
      from: '2025-06-01T00:00:00.000Z',
      to: '2025-06-30T23:59:59.999Z',
    });

    expect(summary.period.from).toBe('2025-06-01T00:00:00.000Z');
    expect(summary.period.to).toBe('2025-06-30T23:59:59.999Z');
  });
});

describe('computeTopItems', () => {
  it('returns empty array for empty receipts', () => {
    const items = computeTopItems([], 'quantity', 5);
    expect(items).toEqual([]);
  });

  it('aggregates line items by item_id and ranks by quantity', () => {
    const receipts = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'Taco', quantity: 3, total_money: 150 }),
          makeLineItem({ item_id: 'item-B', item_name: 'Burrito', quantity: 1, total_money: 80 }),
        ],
      }),
      makeReceipt({
        receipt_number: 'R-002',
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'Taco', quantity: 2, total_money: 100 }),
        ],
      }),
    ];

    const items = computeTopItems(receipts, 'quantity', 10);

    expect(items).toHaveLength(2);
    expect(items[0].itemId).toBe('item-A');
    expect(items[0].totalQuantity).toBe(5);
    expect(items[0].totalSales).toBe(250);
    expect(items[1].itemId).toBe('item-B');
    expect(items[1].totalQuantity).toBe(1);
  });

  it('ranks by sales_amount when specified', () => {
    const receipts = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'Taco', quantity: 10, total_money: 100 }),
          makeLineItem({ item_id: 'item-B', item_name: 'Lobster', quantity: 1, total_money: 500 }),
        ],
      }),
    ];

    const items = computeTopItems(receipts, 'sales_amount', 10);

    expect(items[0].itemId).toBe('item-B');
    expect(items[0].totalSales).toBe(500);
    expect(items[1].itemId).toBe('item-A');
  });

  it('respects limit parameter', () => {
    const receipts = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'A', quantity: 10, total_money: 100 }),
          makeLineItem({ item_id: 'item-B', item_name: 'B', quantity: 8, total_money: 80 }),
          makeLineItem({ item_id: 'item-C', item_name: 'C', quantity: 6, total_money: 60 }),
          makeLineItem({ item_id: 'item-D', item_name: 'D', quantity: 4, total_money: 40 }),
          makeLineItem({ item_id: 'item-E', item_name: 'E', quantity: 2, total_money: 20 }),
        ],
      }),
    ];

    const items = computeTopItems(receipts, 'quantity', 3);

    expect(items).toHaveLength(3);
    expect(items[0].itemId).toBe('item-A');
    expect(items[2].itemId).toBe('item-C');
  });

  it('excludes REFUND and cancelled receipts', () => {
    const receipts = [
      makeReceipt({
        line_items: [makeLineItem({ item_id: 'item-A', quantity: 5 })],
      }),
      makeReceipt({
        receipt_number: 'R-002',
        receipt_type: 'REFUND',
        line_items: [makeLineItem({ item_id: 'item-A', quantity: 3 })],
      }),
      makeReceipt({
        receipt_number: 'R-003',
        cancelled_at: '2025-06-01T13:00:00.000Z',
        line_items: [makeLineItem({ item_id: 'item-A', quantity: 2 })],
      }),
    ];

    const items = computeTopItems(receipts, 'quantity', 10);

    expect(items).toHaveLength(1);
    expect(items[0].totalQuantity).toBe(5);
  });

  it('handles tie-breaking by itemId (stable sort)', () => {
    const receipts = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-B', item_name: 'B', quantity: 5, total_money: 50 }),
          makeLineItem({ item_id: 'item-A', item_name: 'A', quantity: 5, total_money: 50 }),
        ],
      }),
    ];

    const items = computeTopItems(receipts, 'quantity', 10);

    expect(items[0].itemId).toBe('item-A');
    expect(items[1].itemId).toBe('item-B');
  });

  it('handles missing item_name gracefully', () => {
    const receipts = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-X', item_name: '' as string, quantity: 3 }),
        ],
      }),
    ];

    const items = computeTopItems(receipts, 'quantity', 10);

    expect(items).toHaveLength(1);
    // Empty string is kept as-is, but null/undefined would default
    expect(items[0].itemName).toBe('');
  });
});

describe('computeTopEmployees', () => {
  it('returns empty array for empty receipts', () => {
    const employees = computeTopEmployees([], 'sales_amount', 5);
    expect(employees).toEqual([]);
  });

  it('aggregates by employee_id and ranks by sales_amount', () => {
    const receipts = [
      makeReceipt({ employee_id: 'emp-1', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-1', total_money: 200 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-2', total_money: 500 }),
    ];

    const employees = computeTopEmployees(receipts, 'sales_amount', 10);

    expect(employees).toHaveLength(2);
    expect(employees[0].employeeId).toBe('emp-2');
    expect(employees[0].totalSales).toBe(500);
    expect(employees[0].receiptCount).toBe(1);
    expect(employees[1].employeeId).toBe('emp-1');
    expect(employees[1].totalSales).toBe(300);
    expect(employees[1].receiptCount).toBe(2);
  });

  it('ranks by receipt_count when specified', () => {
    const receipts = [
      makeReceipt({ employee_id: 'emp-1', total_money: 500 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-2', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-2', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-004', employee_id: 'emp-2', total_money: 100 }),
    ];

    const employees = computeTopEmployees(receipts, 'receipt_count', 10);

    expect(employees[0].employeeId).toBe('emp-2');
    expect(employees[0].receiptCount).toBe(3);
    expect(employees[1].employeeId).toBe('emp-1');
    expect(employees[1].receiptCount).toBe(1);
  });

  it('respects limit parameter', () => {
    const receipts = [
      makeReceipt({ employee_id: 'emp-1', total_money: 300 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-2', total_money: 200 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-3', total_money: 100 }),
    ];

    const employees = computeTopEmployees(receipts, 'sales_amount', 2);

    expect(employees).toHaveLength(2);
    expect(employees[0].employeeId).toBe('emp-1');
    expect(employees[1].employeeId).toBe('emp-2');
  });

  it('excludes REFUND and cancelled receipts', () => {
    const receipts = [
      makeReceipt({ employee_id: 'emp-1', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-1', receipt_type: 'REFUND', total_money: 50 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-1', cancelled_at: '2025-06-01T13:00:00.000Z', total_money: 75 }),
    ];

    const employees = computeTopEmployees(receipts, 'sales_amount', 10);

    expect(employees).toHaveLength(1);
    expect(employees[0].totalSales).toBe(100);
    expect(employees[0].receiptCount).toBe(1);
  });

  it('groups receipts with missing employee_id as "unknown"', () => {
    const receipts = [
      makeReceipt({ employee_id: null, total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: null, total_money: 200 }),
      makeReceipt({ receipt_number: 'R-003', employee_id: 'emp-1', total_money: 50 }),
    ];

    const employees = computeTopEmployees(receipts, 'sales_amount', 10);

    expect(employees).toHaveLength(2);
    expect(employees[0].employeeId).toBe('unknown');
    expect(employees[0].totalSales).toBe(300);
    expect(employees[0].receiptCount).toBe(2);
  });

  it('handles tie-breaking by employeeId (stable sort)', () => {
    const receipts = [
      makeReceipt({ employee_id: 'emp-B', total_money: 100 }),
      makeReceipt({ receipt_number: 'R-002', employee_id: 'emp-A', total_money: 100 }),
    ];

    const employees = computeTopEmployees(receipts, 'sales_amount', 10);

    expect(employees[0].employeeId).toBe('emp-A');
    expect(employees[1].employeeId).toBe('emp-B');
  });
});
