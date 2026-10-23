import type { ProductKind } from "@/features/product/product-service";
import { requireSupabase } from "@/lib/supabase/client";

export type CartItem = {
  id: number;
  kind: ProductKind;
  productName: string;
  quantity: number;
  checked: boolean;
};

type CartRow = {
  id: number;
  kind: ProductKind;
  product_name: string;
  quantity: number;
  checked: boolean;
};

const MAX_QUANTITY = 99;

const toItem = (row: CartRow): CartItem => ({
  id: row.id,
  kind: row.kind,
  productName: row.product_name,
  quantity: row.quantity,
  checked: row.checked,
});

export async function listCart(): Promise<CartItem[]> {
  const { data, error } = await requireSupabase()
    .from("cart_items")
    .select("id, kind, product_name, quantity, checked")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CartRow[]).map(toItem);
}

/** 이미 담은 상품이면 수량을 1 늘립니다. */
export async function addToCart(kind: ProductKind, productName: string) {
  const supabase = requireSupabase();
  const { data: existing, error: findError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("kind", kind)
    .eq("product_name", productName)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: Math.min(existing.quantity + 1, MAX_QUANTITY),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("cart_items")
    .insert({ kind, product_name: productName });
  if (error) throw error;
}

export async function setCartQuantity(id: number, quantity: number) {
  const { error } = await requireSupabase()
    .from("cart_items")
    .update({
      quantity: Math.min(Math.max(quantity, 1), MAX_QUANTITY),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setCartChecked(ids: number[], checked: boolean) {
  if (ids.length === 0) return;
  const { error } = await requireSupabase()
    .from("cart_items")
    .update({ checked, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

export async function removeFromCart(ids: number[]) {
  if (ids.length === 0) return;
  const { error } = await requireSupabase()
    .from("cart_items")
    .delete()
    .in("id", ids);
  if (error) throw error;
}
