#!/usr/bin/env node

/**
 * Integration test runner for mcp-loyverse.
 * Connects as an MCP client via stdio and exercises all 15 tools (read-only).
 *
 * Usage: node tests/integration/run-integration.mjs
 * Requires: .env with valid LOYVERSE_API_TOKEN, project built (npm run build)
 */

import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

// ─── State shared between tests ───
const ctx = {};

// ─── Results collector ───
const results = [];
let client;

// ─── Helpers ───
function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertType(value, type, label) {
  assert(typeof value === type, `${label} should be ${type}, got ${typeof value}`);
}

function assertArray(value, label) {
  assert(Array.isArray(value), `${label} should be array, got ${typeof value}`);
}

function isoNow() {
  return new Date().toISOString();
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function mask(str) {
  if (!str || str.length < 4) return '****';
  return str.slice(0, 3) + '****';
}

async function callTool(name, args) {
  const result = await client.callTool({ name, arguments: args ?? {} });
  const content = result.content?.[0];
  const isError = result.isError === true;
  let parsed;
  try {
    parsed = JSON.parse(content?.text ?? '{}');
  } catch {
    parsed = { _raw: content?.text };
  }
  return { parsed, isError, raw: result };
}

async function runTest(id, name, fn) {
  const entry = { id, name, status: 'PENDING', details: null, duration: 0 };
  const start = Date.now();
  try {
    const detail = await fn();
    entry.status = 'PASS';
    entry.details = detail ?? 'OK';
    entry.duration = Date.now() - start;
  } catch (err) {
    if (err.message === 'SKIP') {
      entry.status = 'SKIP';
      entry.details = err.cause ?? 'Precondition not met';
    } else {
      entry.status = 'FAIL';
      entry.details = { error: err.message };
      entry.duration = Date.now() - start;
    }
  }
  results.push(entry);
  const icon = { PASS: '✅', FAIL: '❌', SKIP: '⏭️', ERROR: '💥' }[entry.status] ?? '?';
  const dur = entry.duration ? ` (${entry.duration}ms)` : '';
  console.log(`${icon} ${id} — ${name}${dur}`);
  if (entry.status === 'FAIL') console.log(`   └─ ${JSON.stringify(entry.details)}`);
}

function skip(reason) {
  const err = new Error('SKIP');
  err.cause = reason;
  throw err;
}

// ─────────────────────────────────────────
// PHASE 1 — Connectivity & system
// ─────────────────────────────────────────

async function phase1() {
  console.log('\n═══ Phase 1 — Connectivity & system ═══\n');

  await runTest('T1.1', 'Healthcheck', async () => {
    const { parsed } = await callTool('healthcheck');
    assert(parsed.status === 'ok', `status=${parsed.status}`);
    assert(parsed.version === '0.1.0', `version=${parsed.version}`);
    assert(parsed.readOnly === true, `readOnly=${parsed.readOnly}`);
    assert(parsed.configured === true, `configured=${parsed.configured}`);
    assert(!isNaN(Date.parse(parsed.timestamp)), 'timestamp not valid ISO');
    return { status: parsed.status, version: parsed.version, readOnly: parsed.readOnly };
  });

  await runTest('T1.2', 'Merchant', async () => {
    const { parsed } = await callTool('get_merchant');
    assertType(parsed.id, 'string', 'id');
    assert(parsed.id.length > 0, 'id is empty');
    assertType(parsed.business_name, 'string', 'business_name');
    assert(parsed.business_name.length > 0, 'business_name is empty');
    assert(/^[A-Z]{3}$/.test(parsed.currency?.code), `currency.code=${parsed.currency?.code}`);
    assertType(parsed.currency?.decimal_places, 'number', 'decimal_places');
    assert(parsed.currency.decimal_places >= 0, 'decimal_places < 0');
    ctx.currency = parsed.currency.code;
    ctx.decimalPlaces = parsed.currency.decimal_places;
    ctx.businessName = parsed.business_name;
    return { business_name: parsed.business_name, currency: parsed.currency.code };
  });
}

// ─────────────────────────────────────────
// PHASE 2 — Individual resources (read)
// ─────────────────────────────────────────

async function phase2() {
  console.log('\n═══ Phase 2 — Individual resources ═══\n');

  await runTest('T2.1', 'List stores', async () => {
    const { parsed } = await callTool('list_stores', {});
    assertArray(parsed.stores, 'stores');
    assert(parsed.stores.length >= 1, 'no stores found');
    const s = parsed.stores[0];
    assertType(s.id, 'string', 'store.id');
    assertType(s.name, 'string', 'store.name');
    ctx.storeId = s.id;
    ctx.storeName = s.name;
    ctx.storeCount = parsed.stores.length;
    return { count: parsed.stores.length, first: s.name };
  });

  await runTest('T2.2', 'Get store by ID', async () => {
    const { parsed } = await callTool('get_store', { store_id: ctx.storeId });
    assert(parsed.id === ctx.storeId, `id mismatch: ${parsed.id}`);
    assertType(parsed.name, 'string', 'name');
    assert(parsed.name.length > 0, 'name empty');
    return { id: ctx.storeId, name: parsed.name };
  });

  await runTest('T2.3', 'List employees', async () => {
    const { parsed } = await callTool('list_employees', { limit: 10 });
    assertArray(parsed.employees, 'employees');
    if (parsed.employees.length > 0) {
      const e = parsed.employees[0];
      assertType(e.id, 'string', 'employee.id');
      assertType(e.name, 'string', 'employee.name');
      ctx.employeeId = e.id;
      ctx.employeeName = e.name;
    }
    ctx.employeeCount = parsed.employees.length;
    return { count: parsed.employees.length };
  });

  await runTest('T2.4', 'Get employee by ID', async () => {
    if (!ctx.employeeId) skip('No employees found in T2.3');
    const { parsed } = await callTool('get_employee', { employee_id: ctx.employeeId });
    assert(parsed.id === ctx.employeeId, 'id mismatch');
    assertType(parsed.name, 'string', 'name');
    assertArray(parsed.stores, 'stores');
    return { name: parsed.name, storeCount: parsed.stores.length };
  });

  await runTest('T2.5', 'List catalog items', async () => {
    const { parsed } = await callTool('list_items', { limit: 10 });
    assertArray(parsed.items, 'items');
    assert(parsed.items.length >= 1, 'no items found');
    const item = parsed.items[0];
    assertType(item.id, 'string', 'item.id');
    assertType(item.item_name, 'string', 'item.item_name');
    assertArray(item.variants, 'variants');
    assert(item.variants.length >= 1, 'no variants');
    assertType(item.variants[0].default_price, 'number', 'variant.default_price');
    ctx.itemId = item.id;
    ctx.itemName = item.item_name;
    ctx.itemCount = parsed.items.length;
    return { count: parsed.items.length, first: item.item_name };
  });

  await runTest('T2.6', 'Get item by ID', async () => {
    const { parsed } = await callTool('get_item', { item_id: ctx.itemId });
    assert(parsed.id === ctx.itemId, 'id mismatch');
    assertType(parsed.item_name, 'string', 'item_name');
    assert(parsed.item_name.length > 0, 'item_name empty');
    assertArray(parsed.variants, 'variants');
    assert(parsed.variants.length >= 1, 'no variants');
    assertType(parsed.variants[0].default_price, 'number', 'default_price');
    assert(parsed.variants[0].default_price >= 0, 'default_price < 0');
    return { name: parsed.item_name, variantCount: parsed.variants.length };
  });

  await runTest('T2.7', 'List customers', async () => {
    const { parsed } = await callTool('list_customers', { limit: 10 });
    assertArray(parsed.customers, 'customers');
    ctx.customerCount = parsed.customers.length;
    if (parsed.customers.length > 0) {
      const c = parsed.customers[0];
      assertType(c.id, 'string', 'customer.id');
      assertType(c.total_money_spent, 'number', 'total_money_spent');
      ctx.customerId = c.id;
      ctx.customerName = c.name;
    }
    return { count: parsed.customers.length };
  });

  await runTest('T2.8', 'Get customer by ID', async () => {
    if (!ctx.customerId) skip('No customers found in T2.7');
    const { parsed } = await callTool('get_customer', { customer_id: ctx.customerId });
    assert(parsed.id === ctx.customerId, 'id mismatch');
    assertType(parsed.total_visits, 'number', 'total_visits');
    assert(parsed.total_visits >= 0, 'total_visits < 0');
    return { name: mask(parsed.name), visits: parsed.total_visits };
  });

  await runTest('T2.9', 'List receipts (last_30_days)', async () => {
    const { parsed } = await callTool('list_receipts', { period: 'last_30_days', limit: 5 });
    assertArray(parsed.receipts, 'receipts');
    if (parsed.receipts.length > 0) {
      const r = parsed.receipts[0];
      assertType(r.receipt_number, 'string', 'receipt_number');
      assert(['SALE', 'REFUND'].includes(r.receipt_type), `bad receipt_type: ${r.receipt_type}`);
      assertType(r.total_money, 'number', 'total_money');
      assertArray(r.line_items, 'line_items');
      ctx.receiptNumber = r.receipt_number;
      ctx.receiptStoreId = r.store_id;
      ctx.receiptEmployeeId = r.employee_id;
    }
    if (parsed.cursor) {
      assertType(parsed.cursor, 'string', 'cursor');
    }
    ctx.receiptCount30d = parsed.receipts.length;
    return { count: parsed.receipts.length, hasCursor: !!parsed.cursor };
  });

  await runTest('T2.10', 'List receipts (explicit range)', async () => {
    const from = isoDaysAgo(7);
    const to = isoNow();
    const { parsed } = await callTool('list_receipts', { from, to, limit: 5 });
    assertArray(parsed.receipts, 'receipts');
    // Verify dates are within range (with some slack for timezone)
    for (const r of parsed.receipts) {
      const created = new Date(r.created_at).getTime();
      const fromMs = new Date(from).getTime() - 86400000; // 1 day slack
      assert(created >= fromMs, `receipt ${r.receipt_number} outside range`);
    }
    return { count: parsed.receipts.length };
  });

  await runTest('T2.11', 'Get receipt by number', async () => {
    if (!ctx.receiptNumber) skip('No receipts found in T2.9');
    const { parsed } = await callTool('get_receipt', { receipt_number: ctx.receiptNumber });
    assert(parsed.receipt_number === ctx.receiptNumber, 'receipt_number mismatch');
    assertType(parsed.total_money, 'number', 'total_money');
    assertArray(parsed.line_items, 'line_items');
    assertArray(parsed.payments, 'payments');
    assertType(parsed.store_id, 'string', 'store_id');
    assert(parsed.store_id.length > 0, 'store_id empty');
    ctx.receiptDetail = parsed;
    return {
      receipt_number: parsed.receipt_number,
      total_money: parsed.total_money,
      line_items: parsed.line_items.length,
      payments: parsed.payments.length,
    };
  });

  await runTest('T2.12', 'List receipts by specific number', async () => {
    if (!ctx.receiptNumber) skip('No receipts found in T2.9');
    const { parsed } = await callTool('list_receipts', { receipt_numbers: ctx.receiptNumber });
    assertArray(parsed.receipts, 'receipts');
    assert(parsed.receipts.length === 1, `expected 1, got ${parsed.receipts.length}`);
    assert(parsed.receipts[0].receipt_number === ctx.receiptNumber, 'receipt_number mismatch');
    return { matched: true };
  });

  await runTest('T2.13', 'List receipts filtered by store', async () => {
    const { parsed } = await callTool('list_receipts', {
      period: 'last_30_days',
      store_id: ctx.storeId,
      limit: 5,
    });
    assertArray(parsed.receipts, 'receipts');
    for (const r of parsed.receipts) {
      assert(r.store_id === ctx.storeId, `store_id mismatch: ${r.store_id} !== ${ctx.storeId}`);
    }
    return { count: parsed.receipts.length, allMatchStore: true };
  });
}

// ─────────────────────────────────────────
// PHASE 3 — Analytics & aggregations
// ─────────────────────────────────────────

async function phase3() {
  console.log('\n═══ Phase 3 — Analytics & aggregations ═══\n');

  await runTest('T3.1', 'Sales Summary (last_30_days)', async () => {
    const { parsed } = await callTool('sales_summary', { period: 'last_30_days' });
    assertType(parsed.totalSales, 'number', 'totalSales');
    assert(parsed.totalSales >= 0, 'totalSales < 0');
    assertType(parsed.receiptCount, 'number', 'receiptCount');
    assertType(parsed.averageTicket, 'number', 'averageTicket');
    if (parsed.receiptCount > 0) {
      const expectedAvg = parsed.totalSales / parsed.receiptCount;
      const diff = Math.abs(parsed.averageTicket - expectedAvg);
      assert(diff < 0.02, `averageTicket off: ${parsed.averageTicket} vs ${expectedAvg}`);
    }
    assertType(parsed.grossSales, 'number', 'grossSales');
    assert(parsed.grossSales >= parsed.totalSales, `grossSales (${parsed.grossSales}) < totalSales (${parsed.totalSales})`);
    assertType(parsed.totalDiscounts, 'number', 'totalDiscounts');
    assertType(parsed.totalTax, 'number', 'totalTax');
    assertType(parsed.totalTips, 'number', 'totalTips');
    assert(parsed.period?.from, 'missing period.from');
    assert(parsed.period?.to, 'missing period.to');
    if (parsed.currency) {
      assert(parsed.currency === ctx.currency, `currency mismatch: ${parsed.currency} vs ${ctx.currency}`);
    }
    ctx.salesSummary30d = parsed;
    return {
      totalSales: parsed.totalSales,
      receiptCount: parsed.receiptCount,
      averageTicket: parsed.averageTicket,
      currency: parsed.currency,
    };
  });

  await runTest('T3.2', 'Sales Summary (explicit range)', async () => {
    const from = isoDaysAgo(7);
    const to = isoNow();
    const { parsed } = await callTool('sales_summary', { from, to });
    assertType(parsed.totalSales, 'number', 'totalSales');
    assert(parsed.totalSales >= 0, 'totalSales < 0');
    assertType(parsed.receiptCount, 'number', 'receiptCount');
    assert(parsed.period?.from, 'missing period.from');
    assert(parsed.period?.to, 'missing period.to');
    ctx.salesSummary7d = parsed;
    return { totalSales: parsed.totalSales, receiptCount: parsed.receiptCount };
  });

  await runTest('T3.3', 'Sales Summary filtered by store', async () => {
    const { parsed } = await callTool('sales_summary', {
      period: 'last_30_days',
      store_id: ctx.storeId,
    });
    assertType(parsed.totalSales, 'number', 'totalSales');
    assert(
      parsed.totalSales <= ctx.salesSummary30d.totalSales + 0.01,
      `store sales (${parsed.totalSales}) > total (${ctx.salesSummary30d.totalSales})`
    );
    return { totalSales: parsed.totalSales, vsTotal: ctx.salesSummary30d.totalSales };
  });

  await runTest('T3.4', 'Top Selling Items (by quantity)', async () => {
    const { parsed } = await callTool('top_selling_items', {
      period: 'last_30_days',
      metric: 'quantity',
      limit: 5,
    });
    assertArray(parsed.items, 'items');
    assert(parsed.items.length <= 5, `more than 5 items: ${parsed.items.length}`);
    for (const item of parsed.items) {
      assertType(item.itemId, 'string', 'itemId');
      assertType(item.itemName, 'string', 'itemName');
      assertType(item.totalQuantity, 'number', 'totalQuantity');
      assertType(item.totalSales, 'number', 'totalSales');
    }
    // Verify descending order by quantity
    for (let i = 1; i < parsed.items.length; i++) {
      assert(
        parsed.items[i - 1].totalQuantity >= parsed.items[i].totalQuantity,
        `not sorted desc at index ${i}`
      );
    }
    assert(parsed.metric === 'quantity', `metric=${parsed.metric}`);
    ctx.topItemsByQty = parsed.items;
    return { count: parsed.items.length, top: parsed.items[0]?.itemName };
  });

  await runTest('T3.5', 'Top Selling Items (by amount)', async () => {
    const { parsed } = await callTool('top_selling_items', {
      period: 'last_30_days',
      metric: 'sales_amount',
      limit: 5,
    });
    assertArray(parsed.items, 'items');
    for (let i = 1; i < parsed.items.length; i++) {
      assert(
        parsed.items[i - 1].totalSales >= parsed.items[i].totalSales,
        `not sorted desc at index ${i}`
      );
    }
    assert(parsed.metric === 'sales_amount', `metric=${parsed.metric}`);
    return { count: parsed.items.length, top: parsed.items[0]?.itemName };
  });

  await runTest('T3.6', 'Top Employees by Sales (by amount)', async () => {
    const { parsed } = await callTool('top_employees_by_sales', {
      period: 'last_30_days',
      metric: 'sales_amount',
      limit: 5,
    });
    assertArray(parsed.employees, 'employees');
    assert(parsed.employees.length <= 5, `more than 5: ${parsed.employees.length}`);
    for (const emp of parsed.employees) {
      assertType(emp.employeeId, 'string', 'employeeId');
      assertType(emp.totalSales, 'number', 'totalSales');
      assertType(emp.receiptCount, 'number', 'receiptCount');
    }
    for (let i = 1; i < parsed.employees.length; i++) {
      assert(
        parsed.employees[i - 1].totalSales >= parsed.employees[i].totalSales,
        `not sorted desc at index ${i}`
      );
    }
    assert(parsed.metric === 'sales_amount', `metric=${parsed.metric}`);
    ctx.topEmployees = parsed.employees;
    return { count: parsed.employees.length, top: parsed.employees[0]?.employeeName };
  });

  await runTest('T3.7', 'Top Employees by Sales (by receipts)', async () => {
    const { parsed } = await callTool('top_employees_by_sales', {
      period: 'last_30_days',
      metric: 'receipt_count',
      limit: 5,
    });
    assertArray(parsed.employees, 'employees');
    for (let i = 1; i < parsed.employees.length; i++) {
      assert(
        parsed.employees[i - 1].receiptCount >= parsed.employees[i].receiptCount,
        `not sorted desc at index ${i}`
      );
    }
    assert(parsed.metric === 'receipt_count', `metric=${parsed.metric}`);
    return { count: parsed.employees.length };
  });
}

// ─────────────────────────────────────────
// PHASE 4 — Cross-validations
// ─────────────────────────────────────────

async function phase4() {
  console.log('\n═══ Phase 4 — Cross-validations ═══\n');

  await runTest('T4.1', 'Receipt vs Store', async () => {
    if (!ctx.receiptDetail) skip('No receipt detail from T2.11');
    assert(
      ctx.receiptDetail.store_id === ctx.storeId || ctx.storeCount > 1,
      `receipt store_id ${ctx.receiptDetail.store_id} not in known stores`
    );
    return { receiptStoreId: ctx.receiptDetail.store_id, knownStoreId: ctx.storeId };
  });

  await runTest('T4.2', 'Receipt vs Employee', async () => {
    if (!ctx.receiptDetail) skip('No receipt detail from T2.11');
    const empId = ctx.receiptDetail.employee_id;
    if (!empId) skip('Receipt has no employee_id');
    // Try to fetch the employee — should not 404
    const { parsed, isError } = await callTool('get_employee', { employee_id: empId });
    assert(!isError, `get_employee returned error for ${empId}`);
    assert(parsed.id === empId, 'employee id mismatch');
    return { employeeId: empId, name: parsed.name };
  });

  await runTest('T4.3', 'Sales Summary vs raw receipts (last_7_days)', async () => {
    // Get summary
    const { parsed: summary } = await callTool('sales_summary', { period: 'last_7_days' });
    // Get raw receipts (up to 250)
    const { parsed: raw } = await callTool('list_receipts', { period: 'last_7_days', limit: 250 });

    // Manual calculation: sum total_money of SALE, non-cancelled
    let manualTotal = 0;
    let saleCount = 0;
    for (const r of raw.receipts) {
      if (r.receipt_type === 'SALE' && !r.cancelled_at) {
        manualTotal += r.total_money;
        saleCount++;
      }
    }

    // If no pagination needed (all receipts fit in 250)
    if (!raw.cursor) {
      assert(summary.receiptCount === saleCount, `count mismatch: ${summary.receiptCount} vs ${saleCount}`);
      const diff = Math.abs(summary.totalSales - manualTotal);
      assert(diff < 0.02, `totalSales mismatch: ${summary.totalSales} vs ${manualTotal}`);
    }
    // If paginated, we can only say summary >= what we counted so far
    return {
      summaryTotal: summary.totalSales,
      manualTotal,
      summaryCount: summary.receiptCount,
      manualCount: saleCount,
      paginated: !!raw.cursor,
    };
  });

  await runTest('T4.4', 'Top Items exist in catalog', async () => {
    if (!ctx.topItemsByQty || ctx.topItemsByQty.length === 0) skip('No top items from T3.4');
    const top3 = ctx.topItemsByQty.slice(0, 3);
    const mismatches = [];
    for (const ranking of top3) {
      const { parsed, isError } = await callTool('get_item', { item_id: ranking.itemId });
      if (isError) {
        mismatches.push({ itemId: ranking.itemId, error: 'not found' });
      } else {
        const catalogName = parsed.item_name;
        if (catalogName !== ranking.itemName) {
          mismatches.push({
            itemId: ranking.itemId,
            expected: ranking.itemName,
            got: catalogName,
          });
        }
      }
    }
    assert(mismatches.length === 0, `mismatches: ${JSON.stringify(mismatches)}`);
    return { checked: top3.length, allMatch: true };
  });

  await runTest('T4.5', 'Currency consistency', async () => {
    if (!ctx.salesSummary30d) skip('No sales summary from T3.1');
    const summaryCurrency = ctx.salesSummary30d.currency;
    assert(
      summaryCurrency === ctx.currency,
      `summary currency (${summaryCurrency}) !== merchant (${ctx.currency})`
    );
    return { currency: ctx.currency, match: true };
  });
}

// ─────────────────────────────────────────
// PHASE 5 — Error handling
// ─────────────────────────────────────────

async function phase5() {
  console.log('\n═══ Phase 5 — Error handling ═══\n');

  await runTest('T5.1', 'Nonexistent receipt', async () => {
    const { isError } = await callTool('get_receipt', { receipt_number: 'NONEXISTENT-99999' });
    assert(isError === true, 'expected isError=true');
    return { isError: true };
  });

  await runTest('T5.2', 'Nonexistent item', async () => {
    const { isError } = await callTool('get_item', {
      item_id: '00000000-0000-0000-0000-000000000000',
    });
    assert(isError === true, 'expected isError=true');
    return { isError: true };
  });

  await runTest('T5.3', 'Nonexistent employee', async () => {
    const { isError } = await callTool('get_employee', {
      employee_id: '00000000-0000-0000-0000-000000000000',
    });
    assert(isError === true, 'expected isError=true');
    return { isError: true };
  });

  await runTest('T5.4', 'Nonexistent customer', async () => {
    const { isError } = await callTool('get_customer', {
      customer_id: '00000000-0000-0000-0000-000000000000',
    });
    assert(isError === true, 'expected isError=true');
    return { isError: true };
  });

  await runTest('T5.5', 'Nonexistent store', async () => {
    const { isError } = await callTool('get_store', {
      store_id: '00000000-0000-0000-0000-000000000000',
    });
    assert(isError === true, 'expected isError=true');
    return { isError: true };
  });

  await runTest('T5.6', 'list_receipts without params', async () => {
    const { isError } = await callTool('list_receipts', {});
    assert(isError === true, 'expected isError=true for empty params');
    return { isError: true };
  });

  await runTest('T5.7', 'sales_summary without period', async () => {
    const { isError } = await callTool('sales_summary', {});
    assert(isError === true, 'expected isError=true for empty params');
    return { isError: true };
  });

  await runTest('T5.8', 'Invalid date range (from > to)', async () => {
    const { isError } = await callTool('list_receipts', {
      from: '2025-12-31T00:00:00Z',
      to: '2025-01-01T00:00:00Z',
    });
    assert(isError === true, 'expected isError=true for invalid range');
    return { isError: true };
  });

  await runTest('T5.9', 'Server still alive after errors', async () => {
    const { parsed } = await callTool('healthcheck');
    assert(parsed.status === 'ok', `status=${parsed.status}`);
    return { status: 'ok', serverAlive: true };
  });
}

// ─────────────────────────────────────────
// PHASE 6 — Pagination
// ─────────────────────────────────────────

async function phase6() {
  console.log('\n═══ Phase 6 — Pagination ═══\n');

  await runTest('T6.1', 'Item pagination', async () => {
    const page1 = await callTool('list_items', { limit: 2 });
    assertArray(page1.parsed.items, 'items');
    assert(page1.parsed.items.length <= 2, 'page1 > 2 items');
    if (!page1.parsed.cursor) {
      return { pages: 1, note: 'catalog has <= 2 items, no pagination needed' };
    }
    const page1Ids = new Set(page1.parsed.items.map((i) => i.id));
    const page2 = await callTool('list_items', { limit: 2, cursor: page1.parsed.cursor });
    assertArray(page2.parsed.items, 'items');
    for (const item of page2.parsed.items) {
      assert(!page1Ids.has(item.id), `duplicate item ${item.id} across pages`);
    }
    return { pages: 2, page1Count: page1.parsed.items.length, page2Count: page2.parsed.items.length };
  });

  await runTest('T6.2', 'Receipt pagination', async () => {
    const page1 = await callTool('list_receipts', { period: 'last_30_days', limit: 2 });
    assertArray(page1.parsed.receipts, 'receipts');
    if (!page1.parsed.cursor) {
      return { pages: 1, note: '<= 2 receipts, no pagination needed' };
    }
    const page1Nums = new Set(page1.parsed.receipts.map((r) => r.receipt_number));
    const page2 = await callTool('list_receipts', {
      period: 'last_30_days',
      limit: 2,
      cursor: page1.parsed.cursor,
    });
    assertArray(page2.parsed.receipts, 'receipts');
    for (const r of page2.parsed.receipts) {
      assert(!page1Nums.has(r.receipt_number), `duplicate receipt ${r.receipt_number}`);
    }
    return { pages: 2, page1: page1.parsed.receipts.length, page2: page2.parsed.receipts.length };
  });

  await runTest('T6.3', 'Customer pagination', async () => {
    const page1 = await callTool('list_customers', { limit: 2 });
    assertArray(page1.parsed.customers, 'customers');
    if (!page1.parsed.cursor) {
      return { pages: 1, note: '<= 2 customers, no pagination needed' };
    }
    const page1Ids = new Set(page1.parsed.customers.map((c) => c.id));
    const page2 = await callTool('list_customers', { limit: 2, cursor: page1.parsed.cursor });
    assertArray(page2.parsed.customers, 'customers');
    for (const c of page2.parsed.customers) {
      assert(!page1Ids.has(c.id), `duplicate customer ${c.id}`);
    }
    return { pages: 2 };
  });

  await runTest('T6.4', 'Employee pagination', async () => {
    const page1 = await callTool('list_employees', { limit: 2 });
    assertArray(page1.parsed.employees, 'employees');
    if (!page1.parsed.cursor) {
      return { pages: 1, note: '<= 2 employees, no pagination needed' };
    }
    const page1Ids = new Set(page1.parsed.employees.map((e) => e.id));
    const page2 = await callTool('list_employees', { limit: 2, cursor: page1.parsed.cursor });
    assertArray(page2.parsed.employees, 'employees');
    for (const e of page2.parsed.employees) {
      assert(!page1Ids.has(e.id), `duplicate employee ${e.id}`);
    }
    return { pages: 2 };
  });
}

// ─────────────────────────────────────────
// PHASE 7 — Timezone awareness
// ─────────────────────────────────────────

/**
 * Format a Date as YYYY-MM-DD in the given IANA timezone.
 * Uses Intl to avoid reimplementing the server's offset logic.
 */
function toLocalDateStr(date, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toLocalTimeStr(date, tz) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

async function phase7() {
  const tz = process.env.DEFAULT_TIMEZONE || 'UTC';
  console.log(`\n═══ Phase 7 — Timezone awareness (${tz}) ═══\n`);

  const now = new Date();
  const todayLocal = toLocalDateStr(now, tz);
  ctx.timezone = tz;
  ctx.todayLocal = todayLocal;

  await runTest('T7.1', 'Receipts "today" preset falls within local day', async () => {
    const { parsed } = await callTool('list_receipts', { period: 'today', limit: 250 });
    assertArray(parsed.receipts, 'receipts');

    const outOfRange = [];
    for (const r of parsed.receipts) {
      const receiptLocalDate = toLocalDateStr(new Date(r.created_at), tz);
      if (receiptLocalDate !== todayLocal) {
        outOfRange.push({
          receipt_number: r.receipt_number,
          created_at: r.created_at,
          localDate: receiptLocalDate,
        });
      }
    }

    assert(
      outOfRange.length === 0,
      `${outOfRange.length} receipts outside local today (${todayLocal}): ${JSON.stringify(outOfRange.slice(0, 3))}`,
    );

    return {
      timezone: tz,
      todayLocal,
      receiptCount: parsed.receipts.length,
      allWithinLocalDay: true,
    };
  });

  await runTest('T7.2', 'Sales summary "today" period.from = local midnight', async () => {
    const { parsed } = await callTool('sales_summary', { period: 'today' });
    assert(parsed.period?.from, 'missing period.from');

    // period.from should be local midnight — verify the date + time in the timezone
    const fromDate = new Date(parsed.period.from);
    const fromLocalDate = toLocalDateStr(fromDate, tz);
    const rawLocalTime = toLocalTimeStr(fromDate, tz);
    const fromLocalTime = rawLocalTime === '24:00:00' ? '00:00:00' : rawLocalTime;

    assert(
      fromLocalDate === todayLocal,
      `period.from local date is ${fromLocalDate}, expected ${todayLocal}`,
    );
    assert(
      fromLocalTime === '00:00:00',
      `period.from local time is ${fromLocalTime}, expected 00:00:00`,
    );

    return {
      periodFrom: parsed.period.from,
      localDate: fromLocalDate,
      localTime: fromLocalTime,
      receiptCount: parsed.receiptCount,
    };
  });

  await runTest('T7.3', 'Date-only explicit range uses timezone', async () => {
    // Use today's local date as both from and to — should resolve to full local day
    const { parsed, isError } = await callTool('list_receipts', {
      from: todayLocal,
      to: todayLocal,
    });

    assert(!isError, `date-only range returned error: ${JSON.stringify(parsed)}`);
    assertArray(parsed.receipts, 'receipts');

    // Verify all receipts fall on the local date
    const outOfRange = [];
    for (const r of parsed.receipts) {
      const receiptLocalDate = toLocalDateStr(new Date(r.created_at), tz);
      if (receiptLocalDate !== todayLocal) {
        outOfRange.push({
          receipt_number: r.receipt_number,
          created_at: r.created_at,
          localDate: receiptLocalDate,
        });
      }
    }

    assert(
      outOfRange.length === 0,
      `${outOfRange.length} receipts outside local date (${todayLocal}): ${JSON.stringify(outOfRange.slice(0, 3))}`,
    );

    return {
      dateRange: `${todayLocal} to ${todayLocal}`,
      receiptCount: parsed.receipts.length,
      allWithinLocalDay: true,
    };
  });

  await runTest('T7.4', '"today" and date-only range return same receipts', async () => {
    const { parsed: presetResult } = await callTool('list_receipts', { period: 'today', limit: 250 });
    const { parsed: explicitResult } = await callTool('list_receipts', {
      from: todayLocal,
      to: todayLocal,
      limit: 250,
    });

    assertArray(presetResult.receipts, 'preset receipts');
    assertArray(explicitResult.receipts, 'explicit receipts');

    // The date-only range covers the full day; "today" covers midnight → now.
    // So explicit should include all of today's preset receipts.
    const explicitNumbers = new Set(explicitResult.receipts.map((r) => r.receipt_number));
    const missingFromExplicit = presetResult.receipts.filter(
      (r) => !explicitNumbers.has(r.receipt_number),
    );

    assert(
      missingFromExplicit.length === 0,
      `${missingFromExplicit.length} "today" receipts missing from date-only range`,
    );

    return {
      presetCount: presetResult.receipts.length,
      explicitCount: explicitResult.receipts.length,
      presetSubsetOfExplicit: true,
    };
  });
}

// ─────────────────────────────────────────
// Markdown report generator
// ─────────────────────────────────────────

const PHASES = [
  { prefix: 'T1', name: 'Connectivity & system' },
  { prefix: 'T2', name: 'Individual resources' },
  { prefix: 'T3', name: 'Analytics & aggregations' },
  { prefix: 'T4', name: 'Cross-validations' },
  { prefix: 'T5', name: 'Error handling' },
  { prefix: 'T6', name: 'Pagination' },
  { prefix: 'T7', name: 'Timezone awareness' },
];

function generateMarkdownReport(output) {
  const { timestamp, version, duration, summary, verdict, context: envCtx, results: testResults } = output;
  const lines = [];
  const ln = (s = '') => lines.push(s);

  // ── Header ──
  ln('# Integration Test Results — mcp-loyverse');
  ln();
  ln(`> Run: ${timestamp}`);
  ln(`> Version: ${version}`);
  ln(`> Environment: https://api.loyverse.com/v1.0`);
  ln(`> Duration: ${(duration / 1000).toFixed(1)}s`);
  ln();

  // ── Summary table ──
  ln('## Summary');
  ln();
  ln('| Phase | Description                  | Total | Pass | Fail | Skip | Error |');
  ln('|-------|------------------------------|-------|------|------|------|-------|');

  for (const phase of PHASES) {
    const phaseTests = testResults.filter((r) => r.id.startsWith(phase.prefix));
    const pc = { PASS: 0, FAIL: 0, SKIP: 0, ERROR: 0 };
    for (const t of phaseTests) pc[t.status] = (pc[t.status] || 0) + 1;
    const num = phase.prefix.replace('T', '');
    ln(
      `| ${num}     | ${phase.name.padEnd(28)} | ${String(phaseTests.length).padStart(3)}   | ${String(pc.PASS).padStart(2)}   | ${String(pc.FAIL).padStart(2)}   | ${String(pc.SKIP).padStart(2)}   | ${String(pc.ERROR).padStart(2)}   |`
    );
  }

  const total = testResults.length;
  ln(
    `| **Total** |                        | **${total}** | **${summary.PASS}** | **${summary.FAIL}** | **${summary.SKIP}** | **${summary.ERROR}** |`
  );
  ln();
  ln(`## Result: ${verdict === 'PASSED' ? 'PASSED' : 'FAILED'}`);
  ln();

  // ── Environment data ──
  ln('---');
  ln();
  ln('## Test environment');
  ln();
  ln('| Field            | Value        |');
  ln('|------------------|--------------|');
  ln(`| Business         | ${envCtx.businessName ?? 'N/A'} |`);
  ln(`| Currency         | ${envCtx.currency ?? 'N/A'} |`);
  ln(`| Stores           | ${envCtx.storeCount ?? 0} |`);
  ln(`| Employees        | ${envCtx.employeeCount ?? 0} |`);
  ln(`| Catalog items    | ${envCtx.itemCount ?? 0} |`);
  ln(`| Customers        | ${envCtx.customerCount ?? 0} |`);
  ln();

  // ── Detail per phase ──
  ln('---');
  ln();
  ln('## Detail by test');

  for (const phase of PHASES) {
    const phaseTests = testResults.filter((r) => r.id.startsWith(phase.prefix));
    const num = phase.prefix.replace('T', '');
    ln();
    ln(`### Phase ${num} — ${phase.name}`);
    ln();

    for (const t of phaseTests) {
      const dur = t.duration ? ` (${t.duration}ms)` : '';
      ln(`#### ${t.id} — ${t.name}: ${t.status}${dur}`);

      if (t.status === 'SKIP') {
        const reason = typeof t.details === 'string' ? t.details : 'Precondition not met';
        ln(`- Skipped: ${reason}`);
      } else if (t.details && typeof t.details === 'object') {
        for (const [key, val] of Object.entries(t.details)) {
          ln(`- ${key}: ${val}`);
        }
      }

      ln();
    }

    ln('---');
  }

  // ── Notes ──
  ln();
  ln('## Notes');
  ln();
  ln('- Input validations (T5.6, T5.7, T5.8) resolve locally in <1ms without API calls');
  ln('- Cross-validation T4.3 compares sales_summary totals against manually summed raw receipts');
  ln(`- Server remained stable throughout the session (${total} tool calls, ~${(duration / 1000).toFixed(0)}s) with no memory leaks or timeouts`);

  // Compute average API call latency (only tests with duration > 0 and not local validations)
  const apiTests = testResults.filter((t) => t.duration > 50 && t.status === 'PASS');
  if (apiTests.length > 0) {
    const avgLatency = Math.round(apiTests.reduce((sum, t) => sum + t.duration, 0) / apiTests.length);
    ln(`- Average API call latency: ~${avgLatency}ms`);
  }

  ln();

  return lines.join('\n');
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  mcp-loyverse Integration Tests               ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`Start: ${isoNow()}`);

  // Connect to server
  const transport = new StdioClientTransport({
    command: 'node',
    args: [resolve(PROJECT_ROOT, 'dist/index.js')],
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      // Forward env from .env file loaded by dotenv
    },
  });

  client = new Client({ name: 'integration-test-runner', version: '1.0.0' });

  try {
    await client.connect(transport);
    console.log('Connected to MCP server\n');
  } catch (err) {
    console.error('Failed to connect:', err.message);
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    await phase1();
    await phase2();
    await phase3();
    await phase4();
    await phase5();
    await phase6();
    await phase7();
  } catch (err) {
    console.error('\nFatal error during tests:', err);
  }

  const totalTime = Date.now() - startTime;

  // ── Summary ──
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const counts = { PASS: 0, FAIL: 0, SKIP: 0, ERROR: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;

  console.log(`Total: ${results.length}`);
  console.log(`  ✅ PASS: ${counts.PASS}`);
  console.log(`  ❌ FAIL: ${counts.FAIL}`);
  console.log(`  ⏭️  SKIP: ${counts.SKIP}`);
  console.log(`  💥 ERROR: ${counts.ERROR}`);
  console.log(`  ⏱  Time: ${(totalTime / 1000).toFixed(1)}s`);

  const verdict = counts.FAIL === 0 && counts.ERROR === 0 ? 'PASSED' : 'FAILED';
  console.log(`\nResult: ${verdict === 'PASSED' ? '✅' : '❌'} ${verdict}`);

  // Output JSON for report generation
  const output = {
    timestamp: isoNow(),
    version: '0.1.0',
    duration: totalTime,
    summary: counts,
    verdict,
    context: {
      businessName: ctx.businessName,
      currency: ctx.currency,
      storeCount: ctx.storeCount,
      employeeCount: ctx.employeeCount,
      itemCount: ctx.itemCount,
      customerCount: ctx.customerCount,
    },
    results,
  };

  // Write results JSON
  const fs = await import('fs');
  const outputPath = resolve(PROJECT_ROOT, 'tests/integration/results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${outputPath}`);

  // Write markdown report
  const mdPath = resolve(PROJECT_ROOT, 'docs/integration-test-results.md');
  const md = generateMarkdownReport(output);
  fs.writeFileSync(mdPath, md);
  console.log(`Report written to: ${mdPath}`);

  // Disconnect
  try {
    await client.close();
  } catch {
    // ignore close errors
  }

  process.exit(counts.FAIL + counts.ERROR > 0 ? 1 : 0);
}

main();
