import type { ProductKind } from "@/features/product/product-service";
import { requireSupabase } from "@/lib/supabase/client";

export type TrendPoint = { label: string; value: number };
export type TrendRange = { key: string; label: string; points: TrendPoint[] };
export type SeasonValue = { label: string; value: number };

export type TrendForecast = {
  predictedFor: string;
  predictedPrice: number;
  direction: "up" | "stable" | "down";
  confidence: "low" | "medium" | "high";
};

export type ForecastChart = {
  /** 지난 가격 몇 개 + 마지막 하나가 예상 가격 */
  points: TrendPoint[];
  /** points 에서 예상이 시작하는 위치 (마지막 점) */
  forecastIndex: number;
  summary: string;
};

export type TrendData = {
  kind: ProductKind;
  name: string;
  price: number;
  unitLabel: string | null;
  changePct: number | null;
  inspectedAt: string;
  ranges: TrendRange[];
  /** 가공식품만: 봄/여름/가을/겨울 평균 가격 */
  seasons: SeasonValue[] | null;
  summary: string;
  forecast: TrendForecast | null;
  /** 예상 탭에 보여줄 그래프. 예상 정보가 없으면 null */
  forecastChart: ForecastChart | null;
};

type ProduceRow = {
  item_name: string;
  unit: string;
  unit_size: number;
  inspected_at: string;
  price: number;
  price_1w_ago: number | null;
  price_1m_ago: number | null;
  change_pct_1w: number | null;
  // 마이그레이션 202610240007 적용 전에는 오지 않습니다.
  price_1d_ago?: number | null;
  price_1y_ago?: number | null;
};

type HistoryRow = { inspected_at: string; average_price: number };

type ForecastRow = {
  predicted_for: string;
  predicted_price: number;
  direction: TrendForecast["direction"];
  confidence: TrendForecast["confidence"];
};

const DAY = 86_400_000;

function shiftDate(date: string, days: number) {
  return new Date(new Date(date).getTime() - days * DAY);
}

/** 7.3 처럼 월.일 */
function md(d: Date) {
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
}

/** 24.10 처럼 연.월 */
function ym(d: Date) {
  return `${String(d.getUTCFullYear()).slice(2)}.${d.getUTCMonth() + 1}`;
}

/** 24.10.3 처럼 연.월.일 */
function ymd(d: Date) {
  return `${ym(d)}.${d.getUTCDate()}`;
}

function pctText(from: number, to: number) {
  const pct = Math.round(((to - from) / from) * 1000) / 10;
  if (pct === 0) return "변동이 없어요";
  return `${Math.abs(pct)}% ${pct > 0 ? "올랐어요" : "내렸어요"}`;
}

/** 신선식품: 조사일 기준 1년/1개월/1주/1일 전 가격으로 그래프를 만듭니다. */
function buildProduce(name: string, row: ProduceRow): TrendData {
  const at = row.inspected_at;
  const all: { key: string; label: string; value: number | null | undefined }[] = [
    { key: "1y", label: ymd(shiftDate(at, 365)), value: row.price_1y_ago },
    { key: "1m", label: md(shiftDate(at, 30)), value: row.price_1m_ago },
    { key: "1w", label: md(shiftDate(at, 7)), value: row.price_1w_ago },
    { key: "1d", label: md(shiftDate(at, 1)), value: row.price_1d_ago },
    { key: "now", label: md(new Date(at)), value: row.price },
  ];
  const pick = (keys: string[]): TrendPoint[] =>
    all
      .filter((p) => keys.includes(p.key) && typeof p.value === "number" && p.value > 0)
      .map((p) => ({ label: p.label, value: p.value as number }));

  const candidates: TrendRange[] = [
    { key: "1w", label: "1주", points: pick(["1w", "1d", "now"]) },
    { key: "1m", label: "1개월", points: pick(["1m", "1w", "1d", "now"]) },
    { key: "1y", label: "1년", points: pick(["1y", "1m", "1w", "1d", "now"]) },
  ];
  // 점이 2개 이상이고, 앞 기간과 내용이 다른 것만 보여줍니다. (1년 전 가격이 없으면 1개월과 같아짐)
  const ranges = candidates.filter(
    (r, i) =>
      r.points.length >= 2 &&
      (i === 0 ||
        JSON.stringify(r.points) !== JSON.stringify(candidates[i - 1].points)),
  );

  const parts: string[] = [];
  if (row.price_1w_ago) parts.push(`1주 전보다 ${pctText(row.price_1w_ago, row.price)}`);
  if (row.price_1m_ago) parts.push(`1개월 전보다 ${pctText(row.price_1m_ago, row.price)}`);
  const summary =
    parts.length > 0
      ? `${name}의 가격은 ${parts.join(", ")}.`
      : "비교할 지난 가격 정보가 아직 없어요.";

  return {
    kind: "produce",
    name,
    price: row.price,
    unitLabel: `${row.unit_size}${row.unit}`,
    changePct: row.change_pct_1w,
    inspectedAt: at,
    ranges,
    seasons: null,
    summary,
    forecast: null,
    forecastChart: null,
  };
}

const SEASONS: { label: string; months: number[] }[] = [
  { label: "봄", months: [3, 4, 5] },
  { label: "여름", months: [6, 7, 8] },
  { label: "가을", months: [9, 10, 11] },
  { label: "겨울", months: [12, 1, 2] },
];

const directionText: Record<TrendForecast["direction"], string> = {
  up: "오를 가능성이 있어요",
  stable: "비슷할 가능성이 커요",
  down: "내릴 가능성이 있어요",
};
const confidenceText: Record<TrendForecast["confidence"], string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

/**
 * 예상 탭 그래프: 가장 최근 조사의 평균 가격과 예상 가격을 이어서 보여줍니다.
 * (과거 이력 통계는 조사 시기와 기준이 달라서 이어 그리면 오해를 주기 때문에 쓰지 않습니다.)
 */
function buildForecastChart(
  name: string,
  current: { price: number; inspectedAt: string },
  forecast: TrendForecast,
): ForecastChart {
  const points: TrendPoint[] = [
    { label: ym(new Date(current.inspectedAt)), value: current.price },
    { label: ym(new Date(forecast.predictedFor)), value: forecast.predictedPrice },
  ];
  const d = new Date(forecast.predictedFor);
  const summary = `${name}의 가격은 ${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월에 ${forecast.predictedPrice.toLocaleString("ko-KR")}원 정도로 ${directionText[forecast.direction]} (신뢰도 ${confidenceText[forecast.confidence]})`;
  return { points, forecastIndex: 1, summary };
}

/** 가공식품: 과거 평균 가격 이력(월별 통계)으로 그래프와 계절별 평균을 만듭니다. */
function buildPackaged(
  name: string,
  history: HistoryRow[],
  forecast: TrendForecast | null,
  current: { price: number; inspectedAt: string } | null,
): TrendData {
  const rows = [...history].sort((a, b) =>
    a.inspected_at.localeCompare(b.inspected_at),
  );
  const last = rows[rows.length - 1];
  const lastAt = last?.inspected_at ?? new Date().toISOString().slice(0, 10);

  const withinDays = (days: number | null) =>
    rows.filter(
      (r) =>
        days === null ||
        new Date(r.inspected_at).getTime() >=
          new Date(lastAt).getTime() - days * DAY,
    );

  // 점이 너무 많으면 7개 안팎으로 골고루 줄입니다.
  const sample = (list: HistoryRow[]): TrendPoint[] => {
    const max = 7;
    const picked =
      list.length <= max
        ? list
        : Array.from(
            { length: max },
            (_, i) => list[Math.round((i * (list.length - 1)) / (max - 1))],
          );
    return picked.map((r) => ({
      label: ym(new Date(r.inspected_at)),
      value: r.average_price,
    }));
  };

  const candidates: TrendRange[] = [
    { key: "1y", label: "1년", points: sample(withinDays(365)) },
    { key: "3y", label: "3년", points: sample(withinDays(365 * 3)) },
    { key: "all", label: "전체", points: sample(withinDays(null)) },
  ];
  // 점이 2개 이상이고, 앞 기간과 내용이 다른 것만 보여줍니다.
  const ranges = candidates.filter(
    (r, i) =>
      r.points.length >= 2 &&
      (i === 0 ||
        JSON.stringify(r.points) !== JSON.stringify(candidates[i - 1].points)),
  );

  const seasons: SeasonValue[] = SEASONS.flatMap((s) => {
    const values = rows
      .filter((r) => s.months.includes(new Date(r.inspected_at).getUTCMonth() + 1))
      .map((r) => r.average_price);
    return values.length > 0
      ? [
          {
            label: s.label,
            value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          },
        ]
      : [];
  });

  const yearAgo = withinDays(365)[0];
  const summary =
    last && yearAgo && yearAgo !== last
      ? `${name}의 평균 가격은 ${ym(new Date(yearAgo.inspected_at))} 무렵보다 ${pctText(yearAgo.average_price, last.average_price)} (${last.inspected_at} 기준 통계)`
      : "비교할 지난 가격 정보가 아직 충분하지 않아요.";

  return {
    kind: "packaged",
    name,
    forecastChart: forecast && current ? buildForecastChart(name, current, forecast) : null,
    price: current?.price ?? last?.average_price ?? 0,
    unitLabel: null,
    changePct: null,
    inspectedAt: lastAt,
    ranges,
    seasons: seasons.length >= 2 ? seasons : null,
    summary,
    forecast,
  };
}

export async function fetchTrend(
  kind: ProductKind,
  name: string,
): Promise<TrendData> {
  const supabase = requireSupabase();

  if (kind === "produce") {
    const { data, error } = await supabase.rpc("search_produce_prices", {
      search_query: name,
      result_limit: 50,
    });
    if (error) throw error;
    const row = ((data ?? []) as ProduceRow[]).find((r) => r.item_name === name);
    if (!row) throw new Error(`가격 정보를 찾지 못했어요: ${name}`);
    return buildProduce(name, row);
  }

  const [history, forecast, average] = await Promise.all([
    supabase.rpc("get_product_price_history", {
      target_product: name,
      result_limit: 120,
    }),
    supabase.rpc("get_latest_price_forecast", { target_product: name }),
    supabase.rpc("search_price_products", {
      search_query: name,
      result_limit: 20,
    }),
  ]);
  if (history.error) throw history.error;
  const rows = (history.data ?? []) as HistoryRow[];
  if (rows.length === 0) throw new Error(`가격 이력이 없어요: ${name}`);

  const f = ((forecast.data ?? []) as ForecastRow[])[0];
  const currentRow = (
    (average.data ?? []) as {
      product_name: string;
      average_price: number;
      inspected_at: string;
    }[]
  ).find((r) => r.product_name === name);
  return buildPackaged(
    name,
    rows,
    f
      ? {
          predictedFor: f.predicted_for,
          predictedPrice: f.predicted_price,
          direction: f.direction,
          confidence: f.confidence,
        }
      : null,
    currentRow
      ? { price: currentRow.average_price, inspectedAt: currentRow.inspected_at }
      : null,
  );
}
