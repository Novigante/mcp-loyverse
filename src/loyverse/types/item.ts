export interface ItemVariantStore {
  store_id: string;
  pricing_type: string;
  price: number;
  available_for_sale: boolean;
  optimal_stock: number | null;
  low_stock: number | null;
}

export interface ItemVariant {
  id: string;
  item_id: string;
  name: string;
  sku: string;
  option1_value: string;
  option2_value: string;
  option3_value: string;
  barcode: string;
  price: number;
  cost: number;
  track_inventory: boolean;
  stores: ItemVariantStore[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ItemComponent {
  variant_id: string;
  quantity: number;
}

export interface Item {
  id: string;
  handle: string;
  reference_id: string;
  name: string;
  description: string;
  sku: string;
  image_url: string;
  category_id: string | null;
  tax_ids: string[];
  modifier_ids: string[];
  primary_supplier_id: string | null;
  option1_name: string;
  option2_name: string;
  option3_name: string;
  track_stock: boolean;
  sold_by_weight: boolean;
  is_composite: boolean;
  use_production: boolean;
  color: string;
  form: string;
  components: ItemComponent[];
  variants: ItemVariant[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ItemsResponse {
  items: Item[];
  cursor?: string;
}
