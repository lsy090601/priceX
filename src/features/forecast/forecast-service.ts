import { requireSupabase } from '@/lib/supabase/client';

export type ForecastDirection = 'up' | 'stable' | 'down';
export type ForecastConfidence = 'low' | 'medium' | 'high';

export type ProductForecast = {
  productName: string;
  predictedFor: string;
  predictedPrice: number;
  direction: ForecastDirection;
  confidence: ForecastConfidence;
  method: string;
  observationCount: number;
  trainingStart: string;
  trainingEnd: string;
};

type ForecastRow = {
  product_name: string;
  predicted_for: string;
  predicted_price: number;
  direction: ForecastDirection;
  confidence: ForecastConfidence;
  method: string;
  observation_count: number;
  training_start: string;
  training_end: string;
};

export async function searchPriceForecasts(query: string, limit = 20): Promise<ProductForecast[]> {
  const normalized = query.trim();
  if (!normalized) throw new Error('검색할 상품명을 입력해 주세요.');
  const { data, error } = await requireSupabase().rpc('search_price_forecasts', {
    search_query: normalized,
    result_limit: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw error;
  return ((data ?? []) as ForecastRow[]).map((row) => ({
    productName: row.product_name,
    predictedFor: row.predicted_for,
    predictedPrice: Number(row.predicted_price),
    direction: row.direction,
    confidence: row.confidence,
    method: row.method,
    observationCount: Number(row.observation_count),
    trainingStart: row.training_start,
    trainingEnd: row.training_end,
  }));
}
