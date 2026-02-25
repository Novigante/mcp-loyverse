export interface ReceiptLineTax {
  id: string;
  type: 'ADDED' | 'INCLUDED';
  name: string;
  rate: number;
  money_amount: number;
}

export interface ReceiptLineDiscount {
  id: string;
  type: string;
  name: string;
  money_amount: number;
  percentage?: number;
}

export interface ReceiptLineModifier {
  id: string;
  modifier_option_id: string;
  name: string;
  option: string;
  price: number;
  money_amount: number;
}

export interface ReceiptLineItem {
  id: string;
  item_id: string;
  variant_id: string;
  item_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  price: number;
  gross_total_money: number;
  total_money: number;
  cost: number;
  cost_total: number;
  line_note: string;
  total_discount: number;
  line_taxes: ReceiptLineTax[];
  line_discounts: ReceiptLineDiscount[];
  line_modifiers: ReceiptLineModifier[];
}

export interface ReceiptDiscount {
  id: string;
  type: string;
  name: string;
  money_amount: number;
  percentage?: number;
}

export interface ReceiptTax {
  id: string;
  type: 'ADDED' | 'INCLUDED';
  name: string;
  rate: number;
  money_amount: number;
}

export interface ReceiptPayment {
  payment_type_id: string;
  name: string;
  type: string;
  money_amount: number;
  paid_at: string;
  payment_details?: {
    authorization_code?: string;
    reference_id?: string;
    entry_method?: string;
    card_company?: string;
    card_number?: string;
  };
}

export interface Receipt {
  receipt_number: string;
  receipt_type: 'SALE' | 'REFUND';
  receipt_date: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  refund_for: string | null;
  order: string;
  source: string;
  note: string;
  customer_id: string | null;
  employee_id: string | null;
  store_id: string;
  pos_device_id: string;
  dining_option: string;
  total_money: number;
  total_tax: number;
  total_discount: number;
  gross_sales?: number;
  tip: number;
  surcharge: number;
  points_earned: number;
  points_deducted: number;
  points_balance: number;
  line_items: ReceiptLineItem[];
  total_discounts: ReceiptDiscount[];
  total_taxes: ReceiptTax[];
  payments: ReceiptPayment[];
}

export interface ReceiptsResponse {
  receipts: Receipt[];
  cursor?: string;
}
