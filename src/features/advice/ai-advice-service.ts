import type { PurchaseItem } from '@/features/shopping/recommendation-service';
import { requireSupabase } from '@/lib/supabase/client';

import {
  createShoppingAdvice,
  type PriceToAssess,
  type PurchaseAdvice,
} from './purchase-advice';

export type AiPurchaseAdvice = PurchaseAdvice & {
  source: 'gemini' | 'rules';
};

type AiAdviceText = {
  title: string;
  summary: string;
  actions: string[];
};

function isAiAdviceText(value: unknown): value is AiAdviceText {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AiAdviceText>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.summary === 'string' &&
    Array.isArray(candidate.actions) &&
    candidate.actions.every((action) => typeof action === 'string')
  );
}

export async function createAiShoppingAdvice({
  purchaseItems,
  prices = [],
}: {
  purchaseItems: PurchaseItem[];
  prices?: PriceToAssess[];
}): Promise<{
  recommendation: Awaited<ReturnType<typeof createShoppingAdvice>>['recommendation'];
  advice: AiPurchaseAdvice;
}> {
  const base = await createShoppingAdvice({ purchaseItems, prices });
  const fallback: AiPurchaseAdvice = { ...base.advice, source: 'rules' };

  try {
    const { data, error } = await requireSupabase().functions.invoke('purchase-advice', {
      body: {
        facts: {
          title: base.advice.title,
          summary: base.advice.summary,
          actions: base.advice.actions,
          dataAsOf: base.advice.dataAsOf,
        },
      },
    });
    if (error || !isAiAdviceText(data?.advice)) return { ...base, advice: fallback };

    return {
      recommendation: base.recommendation,
      advice: {
        ...base.advice,
        ...data.advice,
        source: 'gemini',
      },
    };
  } catch {
    return { ...base, advice: fallback };
  }
}

