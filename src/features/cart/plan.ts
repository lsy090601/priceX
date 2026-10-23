import type { CartItem } from "@/features/cart/cart-service";
import {
  fetchProductDetail,
  type ProductDetail,
  type StoreOffer,
} from "@/features/product/product-service";
import { displayStoreName, type StoreType } from "@/features/product/store-type";

/** 장바구니 품목 하나의 가격 정보 (한 번 받아 두고 판매점 종류를 바꿔가며 계산) */
export type PlanSource = {
  item: CartItem;
  detail: ProductDetail | null;
};

export type PlanLine = {
  key: string;
  productName: string;
  kind: CartItem["kind"];
  quantity: number;
  /** 신선식품의 기준 단위 (예: "10개"). 가격은 이 단위 한 묶음 값입니다. */
  unitLabel: string | null;
  /** 신선식품, 또는 해당 종류의 판매점에 가격이 없으면 null */
  storeName: string | null;
  /** 개당 가격. 가격을 알 수 없으면 null */
  unitPrice: number | null;
  /** 개당 평균 가격 */
  averagePrice: number | null;
  status: "store" | "average" | "no-store" | "no-price";
};

export type Plan = {
  lines: PlanLine[];
  total: number;
  baseline: number;
  savings: number;
};

export async function loadPlanSources(items: CartItem[]): Promise<PlanSource[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        return {
          item,
          detail: await fetchProductDetail(item.kind, item.productName),
        };
      } catch {
        return { item, detail: null };
      }
    }),
  );
}

function cheapest(offers: StoreOffer[], type: StoreType): StoreOffer | undefined {
  return offers.find((o) => o.storeType === type); // offers 는 싼 순서
}

/**
 * - 가공식품: 고른 종류의 판매점 중 가장 싼 곳
 * - 신선식품: 판매점별 가격이 없어서 평균 가격 기준
 * 가격을 모르는 품목은 합계에서 빼고 따로 표시합니다.
 */
export function computePlan(sources: PlanSource[], type: StoreType): Plan {
  const lines: PlanLine[] = sources.map(({ item, detail }) => {
    const base = {
      key: String(item.id),
      productName: item.productName,
      kind: item.kind,
      quantity: item.quantity,
      unitLabel: detail?.unitLabel ?? null,
    };
    if (!detail) {
      return {
        ...base,
        storeName: null,
        unitPrice: null,
        averagePrice: null,
        status: "no-price" as const,
      };
    }
    if (item.kind === "produce") {
      return {
        ...base,
        storeName: null,
        unitPrice: detail.price,
        averagePrice: detail.price,
        status: "average" as const,
      };
    }
    const offer = cheapest(detail.offers, type);
    if (!offer) {
      return {
        ...base,
        storeName: null,
        unitPrice: null,
        averagePrice: detail.price,
        status: "no-store" as const,
      };
    }
    return {
      ...base,
      storeName: displayStoreName(offer.storeName),
      unitPrice: offer.price,
      averagePrice: detail.price,
      status: "store" as const,
    };
  });

  let total = 0;
  let baseline = 0;
  for (const line of lines) {
    if (line.unitPrice === null || line.averagePrice === null) continue;
    total += line.unitPrice * line.quantity;
    baseline += line.averagePrice * line.quantity;
  }
  return { lines, total, baseline, savings: Math.max(baseline - total, 0) };
}

/** 장바구니에서 분석할 품목: 체크한 것이 있으면 그것만, 없으면 전체 */
export function pickItemsToAnalyze(items: CartItem[]): CartItem[] {
  const checked = items.filter((i) => i.checked);
  return checked.length > 0 ? checked : items;
}
