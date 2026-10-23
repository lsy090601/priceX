import {
  recommendPurchasePlan,
  type PurchaseItem,
  type PurchaseRecommendation,
} from '@/features/shopping/recommendation-service';

export type PriceLevel = 'cheap' | 'fair' | 'expensive';

export type PriceAssessment = {
  productName: string;
  inputPrice: number;
  averagePrice: number;
  difference: number;
  percentageDifference: number;
  level: PriceLevel;
};

export type PurchaseAdvice = {
  title: string;
  summary: string;
  actions: string[];
  assessments: PriceAssessment[];
  dataAsOf: string | null;
};

export type PriceToAssess = {
  productName: string;
  inputPrice: number;
  averagePrice: number;
};

const formatWon = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;

export function assessPrice({
  productName,
  inputPrice,
  averagePrice,
}: PriceToAssess): PriceAssessment {
  if (!productName.trim()) throw new Error('상품명이 필요합니다.');
  if (!Number.isFinite(inputPrice) || inputPrice < 0) {
    throw new Error('현재 가격은 0원 이상이어야 합니다.');
  }
  if (!Number.isFinite(averagePrice) || averagePrice <= 0) {
    throw new Error('평균 가격은 0원보다 커야 합니다.');
  }

  const difference = Math.round(inputPrice - averagePrice);
  const percentageDifference = Math.round((difference / averagePrice) * 100);
  const level: PriceLevel =
    percentageDifference <= -10
      ? 'cheap'
      : percentageDifference >= 10
        ? 'expensive'
        : 'fair';

  return {
    productName: productName.trim(),
    inputPrice: Math.round(inputPrice),
    averagePrice: Math.round(averagePrice),
    difference,
    percentageDifference,
    level,
  };
}

function assessmentSentence(assessment: PriceAssessment): string {
  const absoluteDifference = formatWon(Math.abs(assessment.difference));
  if (assessment.level === 'cheap') {
    return `${assessment.productName}은 평균보다 ${absoluteDifference}(${Math.abs(assessment.percentageDifference)}%) 저렴해 지금 구매하기 좋은 편입니다.`;
  }
  if (assessment.level === 'expensive') {
    return `${assessment.productName}은 평균보다 ${absoluteDifference}(${assessment.percentageDifference}%) 비싸 급하지 않다면 구매를 미루는 편이 좋습니다.`;
  }
  return `${assessment.productName}은 평균과 ${absoluteDifference} 차이로 보통 가격대입니다.`;
}

function uniqueDates(recommendation: PurchaseRecommendation | null): string[] {
  if (!recommendation) return [];
  return [...new Set(recommendation.items.map((item) => item.inspectedAt))].sort();
}

export function generatePurchaseAdvice({
  prices = [],
  recommendation = null,
}: {
  prices?: PriceToAssess[];
  recommendation?: PurchaseRecommendation | null;
}): PurchaseAdvice {
  if (prices.length === 0 && !recommendation) {
    throw new Error('가격 또는 장바구니 분석 결과가 필요합니다.');
  }

  const assessments = prices.map(assessPrice);
  const actions: string[] = [];
  const expensive = assessments
    .filter((item) => item.level === 'expensive')
    .sort((a, b) => b.percentageDifference - a.percentageDifference);
  const cheap = assessments.filter((item) => item.level === 'cheap');

  let title = '현재 가격은 보통 수준이에요';
  if (expensive.length > 0) title = '일부 상품은 구매를 미뤄보세요';
  else if (cheap.length > 0) title = '지금 구매하기 좋은 상품이 있어요';

  if (expensive[0]) {
    actions.push(
      `${expensive[0].productName}은 평균보다 ${expensive[0].percentageDifference}% 비싸므로 다른 판매점을 먼저 확인하세요.`,
    );
  }
  if (cheap.length > 0) {
    actions.push(`${cheap.map((item) => item.productName).join(', ')}은 현재 가격에 구매해도 좋아요.`);
  }

  if (recommendation) {
    if (recommendation.missingProducts.length > 0) {
      actions.push(
        `${recommendation.missingProducts.join(', ')}은 가격 자료가 없어 구매처 계산에서 제외됐습니다.`,
      );
    }

    if (recommendation.singleStore && recommendation.savings > 0) {
      const savingRate = Math.round(
        (recommendation.savings / recommendation.singleStore.total) * 100,
      );
      if (recommendation.savings >= 3000 || savingRate >= 10) {
        actions.push(
          `상품별 추천 매장에서 나눠 사면 ${recommendation.singleStore.storeName} 한 곳에서 살 때보다 ${formatWon(recommendation.savings)} 절약할 수 있습니다.`,
        );
      } else {
        actions.push(
          `여러 매장을 방문해도 절약액은 ${formatWon(recommendation.savings)}이므로 ${recommendation.singleStore.storeName} 한 곳에서 구매하는 편이 편리합니다.`,
        );
      }
    } else if (!recommendation.singleStore && recommendation.items.length > 1) {
      actions.push('모든 상품을 판매하는 공통 매장이 없어 상품별 최저가 판매점을 확인하세요.');
    }

    const promotedItems = recommendation.items.filter(
      (item) => item.isDiscounted || item.isOnePlusOne,
    );
    if (promotedItems.length > 0) {
      actions.push(
        `${promotedItems.map((item) => item.productName).join(', ')}은 할인 정보를 확인한 뒤 실제 적용 조건을 살펴보세요.`,
      );
    }
  }

  if (actions.length === 0) {
    actions.push('현재 가격과 평균 가격 차이가 크지 않아 필요한 수량만 구매해도 좋습니다.');
  }

  const assessmentSummary = assessments.map(assessmentSentence).join(' ');
  const basketSummary = recommendation
    ? `상품별 최저가 기준 예상 총액은 ${formatWon(recommendation.multiStoreTotal)}입니다.`
    : '';
  const dates = uniqueDates(recommendation);

  return {
    title,
    summary: [assessmentSummary, basketSummary].filter(Boolean).join(' '),
    actions,
    assessments,
    dataAsOf: dates.length === 0 ? null : dates[dates.length - 1],
  };
}

export async function createShoppingAdvice({
  purchaseItems,
  prices = [],
}: {
  purchaseItems: PurchaseItem[];
  prices?: PriceToAssess[];
}): Promise<{ recommendation: PurchaseRecommendation; advice: PurchaseAdvice }> {
  const recommendation = await recommendPurchasePlan(purchaseItems);
  const advice = generatePurchaseAdvice({ prices, recommendation });
  return { recommendation, advice };
}

