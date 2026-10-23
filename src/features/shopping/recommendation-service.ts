import { requireSupabase } from '@/lib/supabase/client';

export type PurchaseItem = {
  productName: string;
  quantity: number;
};

export type RecommendedItem = {
  productName: string;
  quantity: number;
  inspectedAt: string;
  storeName: string;
  unitPrice: number;
  subtotal: number;
  isDiscounted: boolean | null;
  isOnePlusOne: boolean | null;
};

export type SingleStoreRecommendation = {
  storeName: string;
  total: number;
};

export type PurchaseRecommendation = {
  isComplete: boolean;
  items: RecommendedItem[];
  multiStoreTotal: number;
  singleStore: SingleStoreRecommendation | null;
  savings: number;
  missingProducts: string[];
};

type RpcRecommendedItem = {
  product_name: string;
  quantity: number;
  inspected_at: string;
  store_name: string;
  unit_price: number;
  subtotal: number;
  is_discounted: boolean | null;
  is_one_plus_one: boolean | null;
};

type RpcRecommendation = {
  is_complete: boolean;
  items: RpcRecommendedItem[];
  multi_store_total: number;
  single_store: { store_name: string; total: number } | null;
  savings: number;
  missing_products: string[];
};

export async function recommendPurchasePlan(
  purchaseItems: PurchaseItem[],
): Promise<PurchaseRecommendation> {
  const normalized = purchaseItems.map((item) => ({
    product_name: item.productName.trim(),
    quantity: item.quantity,
  }));

  if (
    normalized.length === 0 ||
    normalized.some(
      (item) =>
        !item.product_name ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 999,
    )
  ) {
    throw new Error('상품과 0보다 큰 수량을 입력해 주세요.');
  }

  const { data, error } = await requireSupabase().rpc('recommend_purchase_plan', {
    purchase_items: normalized,
  });
  if (error) throw error;

  const result = data as RpcRecommendation;
  return {
    isComplete: result.is_complete,
    items: result.items.map((item) => ({
      productName: item.product_name,
      quantity: Number(item.quantity),
      inspectedAt: item.inspected_at,
      storeName: item.store_name,
      unitPrice: item.unit_price,
      subtotal: Number(item.subtotal),
      isDiscounted: item.is_discounted,
      isOnePlusOne: item.is_one_plus_one,
    })),
    multiStoreTotal: Number(result.multi_store_total),
    singleStore: result.single_store
      ? {
          storeName: result.single_store.store_name,
          total: Number(result.single_store.total),
        }
      : null,
    savings: Number(result.savings),
    missingProducts: result.missing_products,
  };
}

