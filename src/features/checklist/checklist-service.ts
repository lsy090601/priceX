import type { PlanLine } from "@/features/cart/plan";
import type { ProductKind } from "@/features/product/product-service";
import { requireSupabase } from "@/lib/supabase/client";

export type ChecklistItem = {
  id: number;
  kind: ProductKind;
  productName: string;
  quantity: number;
  storeName: string | null;
  unitPrice: number | null;
  averagePrice: number | null;
  unitLabel: string | null;
  checked: boolean;
};

type ChecklistRow = {
  id: number;
  kind: ProductKind;
  product_name: string;
  quantity: number;
  store_name: string | null;
  unit_price: number | null;
  average_price: number | null;
  unit_label: string | null;
  checked: boolean;
};

const toItem = (row: ChecklistRow): ChecklistItem => ({
  id: row.id,
  kind: row.kind,
  productName: row.product_name,
  quantity: row.quantity,
  storeName: row.store_name,
  unitPrice: row.unit_price,
  averagePrice: row.average_price,
  unitLabel: row.unit_label,
  checked: row.checked,
});

export async function listChecklist(): Promise<ChecklistItem[]> {
  const { data, error } = await requireSupabase()
    .from("shopping_list_items")
    .select(
      "id, kind, product_name, quantity, store_name, unit_price, average_price, unit_label, checked",
    )
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ChecklistRow[]).map(toItem);
}

/**
 * AI 장보기 추천에서 "결정하기"를 누르면, 추천 결과로 장보기 리스트를 새로 만듭니다.
 * 이전 리스트는 지우고 교체합니다. 가격을 알 수 없었던 품목은 담지 않습니다.
 */
export async function saveChecklistFromPlan(lines: PlanLine[]) {
  const rows = lines
    .filter((l) => l.unitPrice !== null)
    .map((l) => ({
      kind: l.kind,
      product_name: l.productName,
      quantity: l.quantity,
      store_name: l.storeName,
      unit_price: l.unitPrice,
      average_price: l.averagePrice,
      unit_label: l.unitLabel,
    }));
  if (rows.length === 0) throw new Error("담을 품목이 없어요.");

  const supabase = requireSupabase();
  // 기존 리스트 삭제 (user_id 조건은 RLS가 알아서 본인 것만 남깁니다)
  const { error: deleteError } = await supabase
    .from("shopping_list_items")
    .delete()
    .gt("id", 0);
  if (deleteError) throw deleteError;

  const { error } = await supabase.from("shopping_list_items").insert(rows);
  if (error) throw error;
}

export async function setChecklistChecked(ids: number[], checked: boolean) {
  if (ids.length === 0) return;
  const { error } = await requireSupabase()
    .from("shopping_list_items")
    .update({ checked })
    .in("id", ids);
  if (error) throw error;
}

export async function removeChecklistItems(ids: number[]) {
  if (ids.length === 0) return;
  const { error } = await requireSupabase()
    .from("shopping_list_items")
    .delete()
    .in("id", ids);
  if (error) throw error;
}
