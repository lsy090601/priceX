import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/ui/form-message';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import {
  searchPriceForecasts,
  type ForecastConfidence,
  type ForecastDirection,
  type ProductForecast,
} from '@/features/forecast/forecast-service';

const directionLabel: Record<ForecastDirection, string> = {
  up: '상승 가능성', stable: '비슷할 가능성', down: '하락 가능성',
};
const confidenceLabel: Record<ForecastConfidence, string> = {
  low: '낮음', medium: '보통', high: '높음',
};
const formatWon = (price: number) => `${Math.round(price).toLocaleString('ko-KR')}원`;
const formatMonth = (value: string) => `${value.slice(0, 4)}년 ${Number(value.slice(5, 7))}월`;

export default function ForecastScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return setError('검색할 상품명을 입력해 주세요.');
    setLoading(true); setError(null);
    try { setResults(await searchPriceForecasts(query)); setSearched(true); }
    catch { setError('예측 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  };

  return (
    <Screen contentStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.back}>‹ 뒤로</Text>
      </Pressable>
      <View style={styles.heading}>
        <Text style={styles.title}>가격 예측</Text>
        <Text style={styles.description}>과거 같은 시기의 가격 변화로 다음 조사 시점의 예상가격을 보여드려요.</Text>
      </View>
      <TextField value={query} onChangeText={setQuery} placeholder="예: 배추, 우유, 라면" returnKeyType="search" onSubmitEditing={search} />
      <PrimaryButton title="예상가격 확인" loading={loading} onPress={search} />
      <FormMessage tone="error" message={error} />
      {searched && !loading && results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>예측 가능한 상품이 없어요</Text>
          <Text style={styles.muted}>과거 동일 기간 자료가 3회 이상 있는 상품만 제공됩니다.</Text>
        </View>
      ) : null}
      <View style={styles.results}>
        {results.map((forecast) => (
          <View key={`${forecast.productName}-${forecast.predictedFor}`} style={styles.card}>
            <Text style={styles.productName}>{forecast.productName}</Text>
            <Text style={styles.period}>{formatMonth(forecast.predictedFor)} 예상</Text>
            <Text style={styles.price}>{formatWon(forecast.predictedPrice)}</Text>
            <View style={styles.badges}>
              <Text style={styles.direction}>{directionLabel[forecast.direction]}</Text>
              <Text style={styles.confidence}>신뢰도 {confidenceLabel[forecast.confidence]}</Text>
            </View>
            <Text style={styles.note}>{forecast.trainingStart.slice(0, 4)}~{forecast.trainingEnd.slice(0, 4)}년 같은 달의 가격 변화 {forecast.observationCount}건을 사용했어요.</Text>
          </View>
        ))}
      </View>
      <Text style={styles.disclaimer}>예상가격은 공공 조사자료 기반 참고값이며 실제 매장 가격과 다를 수 있습니다.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.lg, gap: Spacing.md },
  back: { color: Colors.primary, fontSize: FontSize.body, fontWeight: '600' },
  heading: { gap: Spacing.sm, marginVertical: Spacing.sm },
  title: { color: Colors.text, fontSize: FontSize.title, fontWeight: '700' },
  description: { color: Colors.textMuted, fontSize: FontSize.label, lineHeight: 21 },
  results: { gap: 12 },
  card: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.input, padding: 18, gap: 8 },
  productName: { color: Colors.text, fontSize: FontSize.body, fontWeight: '700' },
  period: { color: Colors.textMuted, fontSize: FontSize.caption },
  price: { color: Colors.primary, fontSize: 28, fontWeight: '800' },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  direction: { color: Colors.primary, backgroundColor: Colors.successBackground, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, fontSize: FontSize.caption, fontWeight: '600' },
  confidence: { color: Colors.text, backgroundColor: '#f1f1f1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, fontSize: FontSize.caption },
  note: { color: Colors.textMuted, fontSize: FontSize.caption, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: '600' },
  muted: { color: Colors.textMuted, fontSize: FontSize.label, textAlign: 'center' },
  disclaimer: { color: Colors.textMuted, fontSize: FontSize.caption, lineHeight: 18, marginTop: Spacing.sm },
});
