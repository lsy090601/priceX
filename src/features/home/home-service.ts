import { listCart } from "@/features/cart/cart-service";
import {
  computePlan,
  loadPlanSources,
  pickItemsToAnalyze,
} from "@/features/cart/plan";
import { requireSupabase } from "@/lib/supabase/client";

export type TodayPrice = {
  name: string;
  price: number;
  unitLabel: string;
  /** 1주 전 대비 변동률(%) */
  changePct: number | null;
};

// 사진이 있는 품목 위주로 보여줍니다. (가격 데이터에 없거나 오래된 품목은 건너뜁니다)
const CANDIDATES = [
  "바나나",
  "감자",
  "포도",
  "레몬",
  "브로콜리",
  "상추",
  "깻잎",
  "단감",
  "딸기",
];
const MAX_ITEMS = 8;
const STALE_DAYS = 14;

type ProduceRow = {
  item_name: string;
  unit: string;
  unit_size: number;
  inspected_at: string;
  price: number;
  change_pct_1w: number | null;
};

/** 홈의 "Today's PRICE!" 카드에 쓸 실제 가격 */
export async function fetchTodayPrices(): Promise<TodayPrice[]> {
  const supabase = requireSupabase();
  const results = await Promise.all(
    CANDIDATES.map(async (name): Promise<TodayPrice | null> => {
      const { data, error } = await supabase.rpc("search_produce_prices", {
        search_query: name,
        result_limit: 20,
      });
      if (error) return null;
      const row = ((data ?? []) as ProduceRow[]).find((r) => r.item_name === name);
      if (!row) return null;
      const ageDays = (Date.now() - new Date(row.inspected_at).getTime()) / 86_400_000;
      if (ageDays > STALE_DAYS) return null;
      return {
        name,
        price: row.price,
        unitLabel: `${row.unit_size}${row.unit}`,
        changePct: row.change_pct_1w,
      };
    }),
  );
  return results.filter((r): r is TodayPrice => r !== null).slice(0, MAX_ITEMS);
}

export type CartSummary = {
  itemCount: number;
  total: number;
  savings: number;
};

/** 홈의 "AI 장보기 추천" 카드: 장바구니를 가장 싼 판매점 기준으로 계산합니다. */
export async function fetchCartSummary(): Promise<CartSummary> {
  const items = pickItemsToAnalyze(await listCart());
  if (items.length === 0) return { itemCount: 0, total: 0, savings: 0 };
  const plan = computePlan(await loadPlanSources(items), "any");
  return { itemCount: items.length, total: plan.total, savings: plan.savings };
}
