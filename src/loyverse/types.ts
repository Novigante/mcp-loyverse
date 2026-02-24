export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
}

export interface LoyverseListParams {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

export interface LoyverseApiErrorDetail {
  code: string;
  details: string;
  field?: string;
}

export interface LoyverseErrorResponse {
  errors: LoyverseApiErrorDetail[];
}
