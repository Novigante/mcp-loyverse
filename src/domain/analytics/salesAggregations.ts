import type { Receipt } from '../../loyverse/types/receipt.js';
import type { SalesSummary, ItemRanking, EmployeeRanking } from '../types.js';

/**
 * Filter receipts to only valid sales (not refunds, not cancelled).
 */
function filterValidSales(receipts: Receipt[]): Receipt[] {
  return receipts.filter(
    (r) => r.receipt_type === 'SALE' && r.cancelled_at === null,
  );
}

/**
 * Compute a sales summary from an array of receipts.
 * Only SALE-type, non-cancelled receipts are counted.
 */
export function computeSalesSummary(
  receipts: Receipt[],
  period: { from: string; to: string } = { from: '', to: '' },
): SalesSummary {
  const valid = filterValidSales(receipts);

  const totalSales = valid.reduce((sum, r) => sum + (r.total_money ?? 0), 0);
  const totalDiscounts = valid.reduce((sum, r) => sum + (r.total_discount ?? 0), 0);
  const grossSales = totalSales + totalDiscounts;
  const totalTax = valid.reduce((sum, r) => sum + (r.total_tax ?? 0), 0);
  const totalTips = valid.reduce((sum, r) => sum + (r.tip ?? 0), 0);
  const receiptCount = valid.length;
  const averageTicket = receiptCount > 0 ? totalSales / receiptCount : 0;

  return {
    totalSales,
    receiptCount,
    averageTicket,
    grossSales,
    totalDiscounts,
    totalTax,
    totalTips,
    period,
  };
}

/**
 * Compute top items ranked by quantity or sales amount.
 * Only SALE-type, non-cancelled receipts are counted.
 */
export function computeTopItems(
  receipts: Receipt[],
  metric: 'quantity' | 'sales_amount',
  limit: number,
): ItemRanking[] {
  const valid = filterValidSales(receipts);

  const itemMap = new Map<string, ItemRanking>();

  for (const receipt of valid) {
    if (!receipt.line_items) continue;

    for (const line of receipt.line_items) {
      const itemId = line.item_id ?? 'unknown';
      const existing = itemMap.get(itemId);

      if (existing) {
        existing.totalQuantity += line.quantity ?? 0;
        existing.totalSales += line.total_money ?? 0;
      } else {
        itemMap.set(itemId, {
          itemId,
          itemName: line.item_name ?? 'Unknown Item',
          variantName: line.variant_name || undefined,
          totalQuantity: line.quantity ?? 0,
          totalSales: line.total_money ?? 0,
        });
      }
    }
  }

  const rankings = Array.from(itemMap.values());

  rankings.sort((a, b) => {
    const valA = metric === 'quantity' ? a.totalQuantity : a.totalSales;
    const valB = metric === 'quantity' ? b.totalQuantity : b.totalSales;
    if (valB !== valA) return valB - valA;
    // Stable tie-break by itemId
    return a.itemId.localeCompare(b.itemId);
  });

  return rankings.slice(0, limit);
}

/**
 * Compute top employees ranked by sales amount or receipt count.
 * Only SALE-type, non-cancelled receipts are counted.
 */
export function computeTopEmployees(
  receipts: Receipt[],
  metric: 'sales_amount' | 'receipt_count',
  limit: number,
): EmployeeRanking[] {
  const valid = filterValidSales(receipts);

  const employeeMap = new Map<string, EmployeeRanking>();

  for (const receipt of valid) {
    const employeeId = receipt.employee_id ?? 'unknown';
    const existing = employeeMap.get(employeeId);

    if (existing) {
      existing.totalSales += receipt.total_money ?? 0;
      existing.receiptCount += 1;
    } else {
      employeeMap.set(employeeId, {
        employeeId,
        totalSales: receipt.total_money ?? 0,
        receiptCount: 1,
      });
    }
  }

  const rankings = Array.from(employeeMap.values());

  rankings.sort((a, b) => {
    const valA = metric === 'sales_amount' ? a.totalSales : a.receiptCount;
    const valB = metric === 'sales_amount' ? b.totalSales : b.receiptCount;
    if (valB !== valA) return valB - valA;
    // Stable tie-break by employeeId
    return a.employeeId.localeCompare(b.employeeId);
  });

  return rankings.slice(0, limit);
}
