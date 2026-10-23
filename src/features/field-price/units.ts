/** 현장 가격 입력에서 고를 수 있는 단위 */
export const FIELD_UNITS = ["g", "kg", "개", "포기", "단", "봉지", "ml", "L"] as const;
export type FieldUnit = (typeof FIELD_UNITS)[number];

type Base = { kind: "mass" | "volume" | "count"; label: string; factor: number };

/** 단위를 g / ml / 개수 같은 기본 단위로 바꾸는 비율. 비교할 수 없는 단위는 null */
export function toBase(unit: string): Base | null {
  switch (unit) {
    case "g":
      return { kind: "mass", label: "g", factor: 1 };
    case "kg":
      return { kind: "mass", label: "g", factor: 1000 };
    case "ml":
      return { kind: "volume", label: "ml", factor: 1 };
    case "L":
      return { kind: "volume", label: "ml", factor: 1000 };
    case "개":
    case "포기":
    case "단":
    case "봉지":
      return { kind: "count", label: unit, factor: 1 };
    default:
      return null;
  }
}

/**
 * (가격, 양, 단위) → 기본 단위 하나당 가격.
 * 예: 3,000원 500g → 6원/g. 비교할 수 없으면 null.
 */
export function pricePerBase(price: number, amount: number, unit: string) {
  const base = toBase(unit);
  if (!base || amount <= 0) return null;
  return { kind: base.kind, label: base.label, value: price / (amount * base.factor) };
}
