export interface SalesSummary {
  totalSales: number;
  receiptCount: number;
  averageTicket: number;
  grossSales: number;
  totalDiscounts: number;
  totalTax: number;
  totalTips: number;
  period: { from: string; to: string };
  currency?: string;
}

export interface ItemRanking {
  itemId: string;
  itemName: string;
  variantName?: string;
  totalQuantity: number;
  totalSales: number;
}

export interface EmployeeRanking {
  employeeId: string;
  employeeName?: string;
  totalSales: number;
  receiptCount: number;
}
