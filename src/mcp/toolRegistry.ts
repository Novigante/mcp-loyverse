import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../config/index.js';
import type { LoyverseHttpClient } from '../loyverse/httpClient.js';
import { ReceiptsClient } from '../loyverse/receiptsClient.js';
import { ItemsClient } from '../loyverse/itemsClient.js';
import { healthcheckDefinition, healthcheckHandler } from '../tools/healthcheck.js';
import { listReceiptsDefinition, listReceiptsHandler } from '../tools/listReceipts.js';
import { getReceiptDefinition, getReceiptHandler } from '../tools/getReceipt.js';
import { listItemsDefinition, listItemsHandler } from '../tools/listItems.js';
import { getItemDefinition, getItemHandler } from '../tools/getItem.js';

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
  }
}
