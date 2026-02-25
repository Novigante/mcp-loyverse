import { z } from 'zod';
import type { EmployeesClient } from '../loyverse/employeesClient.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const getEmployeeInputSchema = {
  employee_id: z.string().min(1).describe('The employee UUID to look up'),
};

interface GetEmployeeInput {
  employee_id: string;
}

export async function getEmployeeHandler(
  input: GetEmployeeInput,
  employeesClient: EmployeesClient,
): Promise<McpToolResult> {
  try {
    if (!input.employee_id || input.employee_id.length === 0) {
      return errorResult('VALIDATION_ERROR', 'employee_id is required');
    }

    const employee = await employeesClient.getEmployee(input.employee_id);
    return successResult(employee);
  } catch (err) {
    return handleToolError(err);
  }
}

export const getEmployeeDefinition = {
  name: 'get_employee',
  description: 'Get full details of a specific employee by their ID',
  inputSchema: getEmployeeInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
