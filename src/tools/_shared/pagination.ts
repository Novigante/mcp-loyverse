import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(250).default(50),
  cursor: z.string().optional(),
});

export type PaginationInput = z.input<typeof paginationSchema>;

export interface NormalizedPagination {
  limit: number;
  cursor?: string;
}

export function normalizePagination(input: PaginationInput): NormalizedPagination {
  const parsed = paginationSchema.parse(input);
  return {
    limit: parsed.limit,
    cursor: parsed.cursor,
  };
}
