import { requireSupabase } from "@/lib/supabase/client";

import { FIELD_UNITS } from "./units";

export type PriceTagReading = {
  name: string | null;
  price: number | null;
  amount: number | null;
  unit: string | null;
};

/** 서버가 돌려준 값을 한 번 더 확인합니다. 믿을 수 없는 값은 null 로 바꿉니다. */
export function normalizeReading(raw: unknown): PriceTagReading {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const num = (v: unknown, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max ? v : null;

  const name =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim().slice(0, 40)
      : null;
  const price = num(value.price, 10_000_000);
  const unit =
    typeof value.unit === "string" &&
    (FIELD_UNITS as readonly string[]).includes(value.unit)
      ? value.unit
      : null;
  return {
    name,
    price: price === null ? null : Math.round(price),
    amount: num(value.amount, 100_000),
    unit,
  };
}

/** 하나라도 읽었으면 true */
export function hasAnyValue(reading: PriceTagReading) {
  return (
    reading.name !== null ||
    reading.price !== null ||
    reading.amount !== null ||
    reading.unit !== null
  );
}

/** 가격표 사진을 서버(Supabase 함수 read-price-tag)에서 읽어 옵니다. */
export async function readPriceTag(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<PriceTagReading> {
  const { data, error } = await requireSupabase().functions.invoke(
    "read-price-tag",
    { body: { imageBase64, mimeType } },
  );
  if (error) throw error;
  return normalizeReading((data as { reading?: unknown } | null)?.reading);
}
