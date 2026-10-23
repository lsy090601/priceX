import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LineChart } from "@/components/line-chart";
import { ProductThumb } from "@/components/product-thumb";
import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";
import { isProductKind } from "@/features/product/product-service";
import {
  fetchTrend,
  type SeasonValue,
  type TrendData,
  type TrendForecast,
} from "@/features/trend/trend-service";

const icons = {
  arrowUp: require("../../../assets/images/home/arrow-up.png"),
  arrowDown: require("../../../assets/images/product/arrow-down.svg"),
  mascot: require("../../../assets/images/home/ai-mascot.png"),
};

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;

const directionLabel: Record<TrendForecast["direction"], string> = {
  up: "오를 가능성이 있어요",
  stable: "비슷할 가능성이 커요",
  down: "내릴 가능성이 있어요",
};
const confidenceLabel: Record<TrendForecast["confidence"], string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

/**
 * Figma 160:1139 — 가격 추이 (그래프)
 * 상세 화면의 "평균 가격 추이" 카드에서 ?kind=…&name=… 으로 들어옵니다.
 */
export default function TrendScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ kind?: string; name?: string }>();
  const kind = isProductKind(params.kind) ? params.kind : null;
  const name = typeof params.name === "string" ? params.name : "";
  const key = `${kind}:${name}`;

  const [result, setResult] = useState<{ key: string; data: TrendData | null } | null>(null);
  const [tab, setTab] = useState<"now" | "forecast">("now");
  const [rangeKey, setRangeKey] = useState<string | null>(null);

  useEffect(() => {
    if (!kind || !name) return;
    let cancelled = false;
    fetchTrend(kind, name)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch(() => !cancelled && setResult({ key, data: null }));
    return () => {
      cancelled = true;
    };
  }, [kind, name, key]);

  const loading = !!kind && !!name && result?.key !== key;
  const data = result?.key === key ? result.data : null;
  const range = data
    ? (data.ranges.find((r) => r.key === rangeKey) ?? data.ranges[0] ?? null)
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="가격 추이" />

      {loading && <ActivityIndicator color={Colors.primary} style={styles.status} />}
      {!loading && !data && (
        <Text style={styles.statusText}>가격 추이를 불러오지 못했어요</Text>
      )}

      {data && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <ProductThumb name={data.name} size={80} />
            <View style={styles.topText}>
              <Text style={styles.name}>{data.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{won(data.price)}</Text>
                <Change pct={data.changePct} />
              </View>
              {data.unitLabel && (
                <Text style={styles.muted}>{data.unitLabel} 평균</Text>
              )}
            </View>
          </View>

          <View style={styles.tabs}>
            <TabButton
              label="현재"
              selected={tab === "now"}
              onPress={() => setTab("now")}
            />
            {data.forecast && (
              <TabButton
                label="예상"
                selected={tab === "forecast"}
                onPress={() => setTab("forecast")}
              />
            )}
          </View>

          {tab === "now" ? (
            <>
              {range ? (
                <>
                  <View style={styles.ranges}>
                    {data.ranges.map((r) => {
                      const selected = r.key === range.key;
                      return (
                        <Pressable
                          key={r.key}
                          style={[styles.pill, selected && styles.pillOn]}
                          onPress={() => setRangeKey(r.key)}
                          accessibilityState={{ selected }}
                        >
                          <Text style={[styles.pillText, selected && styles.pillTextOn]}>
                            {r.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.chart}>
                    <LineChart points={range.points} width={width - 40} />
                  </View>
                </>
              ) : (
                <Text style={styles.empty}>
                  그래프를 그릴 만큼 가격 기록이 쌓이지 않았어요.
                </Text>
              )}
            </>
          ) : (
            data.forecast && <ForecastCard forecast={data.forecast} />
          )}

          <View style={styles.summary}>
            <Image source={icons.mascot} style={styles.mascot} contentFit="cover" />
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>가격 변화 요약</Text>
              <Text style={styles.summaryDesc}>{data.summary}</Text>
            </View>
          </View>
          <Text style={styles.date}>{data.inspectedAt} 기준</Text>

          {data.seasons && <Seasons seasons={data.seasons} />}
        </ScrollView>
      )}
    </View>
  );
}

function Change({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null;
  const up = pct > 0;
  return (
    <View style={styles.changeRow}>
      <Image
        source={up ? icons.arrowUp : icons.arrowDown}
        style={styles.arrow}
        contentFit="contain"
      />
      <Text style={[styles.changeText, !up && styles.changeDown]}>
        {Math.abs(pct)}% {up ? "올라갔어요" : "내려갔어요"}
      </Text>
    </View>
  );
}

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, selected && styles.tabOn]}
      onPress={onPress}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.tabText, selected && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

function ForecastCard({ forecast }: { forecast: TrendForecast }) {
  const month = Number(forecast.predictedFor.slice(5, 7));
  return (
    <View style={styles.forecast}>
      <Text style={styles.forecastLabel}>{month}월 예상 가격</Text>
      <Text style={styles.forecastPrice}>{won(forecast.predictedPrice)}</Text>
      <Text style={styles.forecastDesc}>
        가격이 {directionLabel[forecast.direction]} (신뢰도{" "}
        {confidenceLabel[forecast.confidence]})
      </Text>
      <Text style={styles.muted}>
        예상가격은 공공 조사자료 기반 참고값이며 실제 매장 가격과 다를 수 있어요.
      </Text>
    </View>
  );
}

function Seasons({ seasons }: { seasons: SeasonValue[] }) {
  const values = seasons.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const barHeight = (v: number) => (max === min ? 80 : 40 + (60 * (v - min)) / (max - min));

  return (
    <View style={styles.seasonWrap}>
      <Text style={styles.seasonTitle}>계절별 평균 가격</Text>
      <View style={styles.seasonCard}>
        <View style={styles.bars}>
          {seasons.map((s) => (
            <View key={s.label} style={styles.barCol}>
              <Text style={styles.barValue}>{s.value.toLocaleString("ko-KR")}</Text>
              <View
                style={[
                  styles.bar,
                  { height: barHeight(s.value) },
                  s.value === max && styles.barMax,
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.baseline} />
        <View style={styles.barLabels}>
          {seasons.map((s) => (
            <Text key={s.label} style={styles.barLabel}>
              {s.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const BORDER = "#e5e5e5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  status: { marginTop: 40 },
  statusText: {
    marginTop: 40,
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  body: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 50 },

  top: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  topText: { flex: 1, gap: 10 },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    fontWeight: "500",
    color: Colors.black,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, flexWrap: "wrap" },
  price: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.black,
  },
  muted: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
  changeRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  arrow: { width: 16, height: 16 },
  changeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#ff3333",
  },
  changeDown: { color: "#3351ff" },

  tabs: { flexDirection: "row", marginTop: 20 },
  tab: {
    width: 90,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabOn: { borderBottomColor: Colors.black },
  tabText: { fontFamily: FontFamily.regular, fontSize: 13, color: "#757575" },
  tabTextOn: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
  },

  ranges: { flexDirection: "row", gap: 12, marginTop: 20 },
  pill: {
    minWidth: 55,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e3e3e3",
    borderRadius: 10000,
    backgroundColor: "#f5f5f5",
  },
  pillOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  pillText: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.black },
  pillTextOn: {
    fontFamily: FontFamily.semiBold,
    fontWeight: "600",
    color: Colors.white,
  },
  chart: { marginTop: 20 },
  empty: {
    marginTop: 30,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },

  forecast: {
    marginTop: 20,
    gap: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
  },
  forecastLabel: { fontFamily: FontFamily.medium, fontSize: 14, color: "#757575" },
  forecastPrice: {
    fontFamily: FontFamily.semiBold,
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  forecastDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },

  summary: {
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  mascot: { width: 79, height: 79, borderRadius: 8 },
  summaryText: { flex: 1, gap: 10 },
  summaryTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
  },
  summaryDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    color: "#757575",
  },
  date: {
    marginTop: 10,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },

  seasonWrap: { marginTop: 30, gap: 14 },
  seasonTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  seasonCard: {
    height: 220,
    paddingHorizontal: 18,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    overflow: "hidden",
  },
  bars: {
    height: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  barCol: { width: 53, alignItems: "center", gap: 4 },
  barValue: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },
  bar: {
    width: 53,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: "#c9c9c9",
  },
  barMax: { backgroundColor: "#00b43f" },
  baseline: { height: 1, backgroundColor: "#c9c9c9" },
  barLabels: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  barLabel: {
    width: 53,
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.black,
  },
});
