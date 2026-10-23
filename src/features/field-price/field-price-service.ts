import { requireSupabase } from "@/lib/supabase/client";

import { pricePerBase } from "./units";

export type FieldPriceInput = {
  productName: string;
  price: number;
  amount: number;
  unit: string;
};

/** 입력한 가격을 저장합니다. */
export async function saveFieldPrice(input: FieldPriceInput) {
  const { error } = await requireSupabase().from("field_prices").insert({
    product_name: input.productName.trim(),
    price: Math.round(input.price),
    amount: input.amount,
    unit: input.unit,
  });
  if (error) throw error;
}

export type FieldPriceAnalysis = {
  productName: string;
  /** 입력한 가격 */
  price: number;
  amountLabel: string;
  /** 비교한 기준: 이름과 평균 가격 (없으면 null) */
  reference: {
    name: string;
    price: number;
    unitLabel: string | null;
    inspectedAt: string;
  } | null;
  /** 같은 단위로 환산해 비교한 결과. 비교할 수 없으면 null */
  comparison: {
    /** 양수면 평균보다 비쌈 (%) */
    diffPct: number;
    perLabel: string;
    inputPer: number;
    referencePer: number;
  } | null;
};

type ProduceRow = {
  item_name: string;
  unit: string;
  unit_size: number;
  inspected_at: string;
  price: number;
};

type PackagedRow = {
  product_name: string;
  inspected_at: string;
  average_price: number;
};

/**
 * 신선식품 가격을 찾습니다. 이름이 정확히 같은 품목을 먼저 찾고,
 * 없으면 "국내산 양파", "양파 1.5kg"처럼 앞뒤에 말이 붙은 경우 단어별로 다시 찾습니다.
 */
async function findProduce(name: string): Promise<ProduceRow | undefined> {
  const supabase = requireSupabase();
  const words = name
    .split(/[\s()[\],/·]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w !== name);
  for (const query of [name, ...words]) {
    const { data } = await supabase.rpc("search_produce_prices", {
      search_query: query,
      result_limit: 50,
    });
    const row = ((data ?? []) as ProduceRow[]).find((r) => r.item_name === query);
    if (row) return row;
  }
  return undefined;
}

/** 입력한 가격을 평균 가격과 비교합니다. (신선식품은 단위를 맞춰 비교) */
export async function analyzeFieldPrice(
  input: FieldPriceInput,
): Promise<FieldPriceAnalysis> {
  const supabase = requireSupabase();
  const name = input.productName.trim();
  const base: FieldPriceAnalysis = {
    productName: name,
    price: Math.round(input.price),
    amountLabel: `${input.amount}${input.unit}`,
    reference: null,
    comparison: null,
  };

  const row = await findProduce(name);
  if (row) {
    const reference = {
      name: row.item_name,
      price: row.price,
      unitLabel: `${row.unit_size}${row.unit}`,
      inspectedAt: row.inspected_at,
    };
    const mine = pricePerBase(input.price, input.amount, input.unit);
    const theirs = pricePerBase(row.price, row.unit_size, row.unit);
    if (mine && theirs && mine.kind === theirs.kind && mine.label === theirs.label) {
      return {
        ...base,
        reference,
        comparison: {
          diffPct: Math.round(((mine.value - theirs.value) / theirs.value) * 1000) / 10,
          perLabel: mine.label,
          inputPer: mine.value,
          referencePer: theirs.value,
        },
      };
    }
    return { ...base, reference };
  }

  // 가공식품은 상품 이름에 입력한 글자가 들어 있는 첫 번째 상품과 비교합니다.
  const packaged = await supabase.rpc("search_price_products", {
    search_query: name,
    result_limit: 5,
  });
  const product = ((packaged.data ?? []) as PackagedRow[])[0];
  if (product) {
    return {
      ...base,
      reference: {
        name: product.product_name,
        price: product.average_price,
        unitLabel: null,
        inspectedAt: product.inspected_at,
      },
    };
  }
  return base;
}
