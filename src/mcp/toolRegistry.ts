import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../config/index.js';
import type { LoyverseHttpClient } from '../loyverse/httpClient.js';
import { ReceiptsClient } from '../loyverse/receiptsClient.js';
import { ItemsClient } from '../loyverse/itemsClient.js';
import { EmployeesClient } from '../loyverse/employeesClient.js';
import { CustomersClient } from '../loyverse/customersClient.js';
import { StoresClient } from '../loyverse/storesClient.js';
import { MerchantClient } from '../loyverse/merchantClient.js';
import { healthcheckDefinition, healthcheckHandler } from '../tools/healthcheck.js';
import { listReceiptsDefinition, listReceiptsHandler } from '../tools/listReceipts.js';
import { getReceiptDefinition, getReceiptHandler } from '../tools/getReceipt.js';
import { listItemsDefinition, listItemsHandler } from '../tools/listItems.js';
import { getItemDefinition, getItemHandler } from '../tools/getItem.js';
import { listEmployeesDefinition, listEmployeesHandler } from '../tools/listEmployees.js';
import { getEmployeeDefinition, getEmployeeHandler } from '../tools/getEmployee.js';
import { listCustomersDefinition, listCustomersHandler } from '../tools/listCustomers.js';
import { getCustomerDefinition, getCustomerHandler } from '../tools/getCustomer.js';
import { listStoresDefinition, listStoresHandler } from '../tools/listStores.js';
import { getStoreDefinition, getStoreHandler } from '../tools/getStore.js';
import { getMerchantDefinition, getMerchantHandler } from '../tools/getMerchant.js';
import { salesSummaryDefinition, salesSummaryHandler } from '../tools/salesSummary.js';
import { topSellingItemsDefinition, topSellingItemsHandler } from '../tools/topSellingItems.js';
import { topEmployeesBySalesDefinition, topEmployeesBySalesHandler } from '../tools/topEmployeesBySales.js';

export function registerTools(server: McpServer, config: Config, httpClient?: LoyverseHttpClient): void {
  server.registerTool(
    healthcheckDefinition.name,
    {
      description: healthcheckDefinition.description,
      annotations: healthcheckDefinition.annotations,
    },
    async () => {
      return healthcheckHandler({
        token: config.loyverseApiToken,
        readOnly: config.mcpReadOnly,
      });
    },
  );

  if (httpClient) {
    const receiptsClient = new ReceiptsClient(httpClient);
    const itemsClient = new ItemsClient(httpClient);
    const employeesClient = new EmployeesClient(httpClient);
    const customersClient = new CustomersClient(httpClient);
    const storesClient = new StoresClient(httpClient);
    const merchantClient = new MerchantClient(httpClient);

    server.registerTool(
      listReceiptsDefinition.name,
      {
        description: listReceiptsDefinition.description,
        inputSchema: listReceiptsDefinition.inputSchema,
        annotations: listReceiptsDefinition.annotations,
      },
      async (input) => {
        return listReceiptsHandler(
          input as Record<string, unknown>,
          receiptsClient,
          config.defaultTimezone,
        );
      },
    );

    server.registerTool(
      getReceiptDefinition.name,
      {
        description: getReceiptDefinition.description,
        inputSchema: getReceiptDefinition.inputSchema,
        annotations: getReceiptDefinition.annotations,
      },
      async (input) => {
        return getReceiptHandler(
          input as { receipt_number: string },
          receiptsClient,
        );
      },
    );

    server.registerTool(
      listItemsDefinition.name,
      {
        description: listItemsDefinition.description,
        inputSchema: listItemsDefinition.inputSchema,
        annotations: listItemsDefinition.annotations,
      },
      async (input) => {
        return listItemsHandler(
          input as Record<string, unknown>,
          itemsClient,
        );
      },
    );

    server.registerTool(
      getItemDefinition.name,
      {
        description: getItemDefinition.description,
        inputSchema: getItemDefinition.inputSchema,
        annotations: getItemDefinition.annotations,
      },
      async (input) => {
        return getItemHandler(
          input as { item_id: string },
          itemsClient,
        );
      },
    );

    server.registerTool(
      listEmployeesDefinition.name,
      {
        description: listEmployeesDefinition.description,
        inputSchema: listEmployeesDefinition.inputSchema,
        annotations: listEmployeesDefinition.annotations,
      },
      async (input) => {
        return listEmployeesHandler(
          input as Record<string, unknown>,
          employeesClient,
        );
      },
    );

    server.registerTool(
      getEmployeeDefinition.name,
      {
        description: getEmployeeDefinition.description,
        inputSchema: getEmployeeDefinition.inputSchema,
        annotations: getEmployeeDefinition.annotations,
      },
      async (input) => {
        return getEmployeeHandler(
          input as { employee_id: string },
          employeesClient,
        );
      },
    );

    server.registerTool(
      listCustomersDefinition.name,
      {
        description: listCustomersDefinition.description,
        inputSchema: listCustomersDefinition.inputSchema,
        annotations: listCustomersDefinition.annotations,
      },
      async (input) => {
        return listCustomersHandler(
          input as Record<string, unknown>,
          customersClient,
        );
      },
    );

    server.registerTool(
      getCustomerDefinition.name,
      {
        description: getCustomerDefinition.description,
        inputSchema: getCustomerDefinition.inputSchema,
        annotations: getCustomerDefinition.annotations,
      },
      async (input) => {
        return getCustomerHandler(
          input as { customer_id: string },
          customersClient,
        );
      },
    );

    server.registerTool(
      listStoresDefinition.name,
      {
        description: listStoresDefinition.description,
        inputSchema: listStoresDefinition.inputSchema,
        annotations: listStoresDefinition.annotations,
      },
      async (input) => {
        return listStoresHandler(
          input as Record<string, unknown>,
          storesClient,
        );
      },
    );

    server.registerTool(
      getStoreDefinition.name,
      {
        description: getStoreDefinition.description,
        inputSchema: getStoreDefinition.inputSchema,
        annotations: getStoreDefinition.annotations,
      },
      async (input) => {
        return getStoreHandler(
          input as { store_id: string },
          storesClient,
        );
      },
    );

    server.registerTool(
      getMerchantDefinition.name,
      {
        description: getMerchantDefinition.description,
        annotations: getMerchantDefinition.annotations,
      },
      async () => {
        return getMerchantHandler(merchantClient);
      },
    );

    // Analytics tools
    server.registerTool(
      salesSummaryDefinition.name,
      {
        description: salesSummaryDefinition.description,
        inputSchema: salesSummaryDefinition.inputSchema,
        annotations: salesSummaryDefinition.annotations,
      },
      async (input) => {
        return salesSummaryHandler(
          input as Record<string, unknown>,
          receiptsClient,
          merchantClient,
          config.defaultTimezone,
        );
      },
    );

    server.registerTool(
      topSellingItemsDefinition.name,
      {
        description: topSellingItemsDefinition.description,
        inputSchema: topSellingItemsDefinition.inputSchema,
        annotations: topSellingItemsDefinition.annotations,
      },
      async (input) => {
        return topSellingItemsHandler(
          input as Record<string, unknown>,
          receiptsClient,
          config.defaultTimezone,
        );
      },
    );

    server.registerTool(
      topEmployeesBySalesDefinition.name,
      {
        description: topEmployeesBySalesDefinition.description,
        inputSchema: topEmployeesBySalesDefinition.inputSchema,
        annotations: topEmployeesBySalesDefinition.annotations,
      },
      async (input) => {
        return topEmployeesBySalesHandler(
          input as Record<string, unknown>,
          receiptsClient,
          employeesClient,
          config.defaultTimezone,
        );
      },
    );
  }
}
