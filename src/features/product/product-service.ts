import { requireSupabase } from "@/lib/supabase/client";

import { getStoreType, type StoreType } from "./store-type";

export type ProductKind = "produce" | "packaged";

export type StoreOffer = {
  storeName: string;
  storeType: StoreType;
  price: number;
  isDiscounted: boolean;
  isOnePlusOne: boolean;
};

export type ProductDetail = {
  kind: ProductKind;
  name: string;
  /** 신선식품은 조사 가격, 가공식품은 판매점 평균 가격 */
  price: number;
  /** 신선식품만: "10개", "100g" 같은 기준 단위 */
  unitLabel: string | null;
  inspectedAt: string;
  /** 신선식품만: 1주 전 대비 변동률(%) */
  changePct: number | null;
  /** 가공식품만: 판매점별 가격 (싼 순서) */
  offers: StoreOffer[];
};

type ProduceRow = {
  item_name: string;
  unit: string;
  unit_size: number;
  inspected_at: string;
  price: number;
  change_pct_1w: number | null;
};

type CompareRow = {
  inspected_at: string;
  store_name: string;
  price: number;
  is_discounted: boolean | null;
  is_one_plus_one: boolean | null;
};

export function isProductKind(value: unknown): value is ProductKind {
  return value === "produce" || value === "packaged";
}

export async function fetchProductDetail(
  kind: ProductKind,
  name: string,
): Promise<ProductDetail> {
  const supabase = requireSupabase();

  if (kind === "produce") {
    const { data, error } = await supabase.rpc("search_produce_prices", {
      search_query: name,
      result_limit: 50,
    });
    if (error) throw error;
    const row = ((data ?? []) as ProduceRow[]).find((r) => r.item_name === name);
    if (!row) throw new Error(`가격 정보를 찾지 못했어요: ${name}`);
    return {
      kind,
      name,
      price: row.price,
      unitLabel: `${row.unit_size}${row.unit}`,
      inspectedAt: row.inspected_at,
      changePct: row.change_pct_1w,
      offers: [],
    };
  }

  const { data, error } = await supabase.rpc("compare_product_prices", {
    target_product: name,
  });
  if (error) throw error;
  const rows = (data ?? []) as CompareRow[];
  if (rows.length === 0) throw new Error(`가격 정보를 찾지 못했어요: ${name}`);

  const offers: StoreOffer[] = rows
    .map((r) => ({
      storeName: r.store_name,
      storeType: getStoreType(r.store_name),
      price: r.price,
      isDiscounted: !!r.is_discounted,
      isOnePlusOne: !!r.is_one_plus_one,
    }))
    .sort((a, b) => a.price - b.price || a.storeName.localeCompare(b.storeName));

  const average = Math.round(
    offers.reduce((sum, o) => sum + o.price, 0) / offers.length,
  );
  return {
    kind,
    name,
    price: average,
    unitLabel: null,
    inspectedAt: rows[0].inspected_at,
    changePct: null,
    offers,
  };
}
