import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";
import {
  analyzeFieldPrice,
  type FieldPriceAnalysis,
} from "@/features/field-price/field-price-service";

const icons = {
  arrowDown: require("../../../assets/images/product/arrow-down.svg"),
  arrowUp: require("../../../assets/images/home/arrow-up.png"),
};

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;

/** g, ml 은 100 단위로 환산해서 보여줍니다. (예: 6원/g → 100g당 600원) */
function perLabel(label: string, value: number) {
  if (label === "g" || label === "ml") {
    return `100${label}당 ${won(value * 100)}`;
  }
  return `${label} 1개당 ${won(value)}`;
}

/** 현장 가격 입력 결과: 입력한 가격을 평균 가격과 비교해서 보여줍니다. */
export default function FieldPriceResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    name?: string;
    price?: string;
    amount?: string;
    unit?: string;
  }>();
  const name = typeof params.name === "string" ? params.name : "";
  const price = Number(params.price);
  const amount = Number(params.amount);
  const unit = typeof params.unit === "string" ? params.unit : "";
  const key = `${name}|${price}|${amount}|${unit}`;

  const [result, setResult] = useState<{
    key: string;
    analysis: FieldPriceAnalysis | null;
  } | null>(null);

  useEffect(() => {
    if (!name || !(price > 0) || !(amount > 0) || !unit) return;
    let cancelled = false;
    analyzeFieldPrice({ productName: name, price, amount, unit })
      .then((analysis) => !cancelled && setResult({ key, analysis }))
      .catch(() => !cancelled && setResult({ key, analysis: null }));
    return () => {
      cancelled = true;
    };
  }, [name, price, amount, unit, key]);

  const loading = !!name && result?.key !== key;
  const analysis = result?.key === key ? result.analysis : null;
  const diff = analysis?.comparison?.diffPct ?? null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="분석 결과" />

      {loading && (
        <ActivityIndicator color={Colors.primary} style={styles.status} />
      )}
      {!loading && !analysis && (
        <Text style={styles.statusText}>분석 결과를 불러오지 못했어요</Text>
      )}

      {analysis && (
        <View style={styles.body}>
          <Text style={styles.saved}>입력하신 가격을 저장했어요!</Text>

          <View style={styles.card}>
            <Text style={styles.name}>{analysis.productName}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{won(analysis.price)}</Text>
              <Text style={styles.amount}>{analysis.amountLabel}</Text>
            </View>

            {diff !== null && analysis.comparison ? (
              <View style={styles.compare}>
                <View style={styles.diffRow}>
                  <Image
                    source={diff > 0 ? icons.arrowUp : icons.arrowDown}
                    style={styles.arrow}
                    contentFit="contain"
                  />
                  <Text style={[styles.diff, diff <= 0 && styles.diffDown]}>
                    {diff === 0
                      ? "평균 가격과 같아요"
                      : `평균보다 ${Math.abs(diff)}% ${diff > 0 ? "비싸요" : "저렴해요"}`}
                  </Text>
                </View>
                <Text style={styles.detail}>
                  내가 본 가격: {perLabel(analysis.comparison.perLabel, analysis.comparison.inputPer)}
                </Text>
                <Text style={styles.detail}>
                  평균 가격: {perLabel(analysis.comparison.perLabel, analysis.comparison.referencePer)}
                </Text>
              </View>
            ) : analysis.reference ? (
              <View style={styles.compare}>
                <Text style={styles.detail}>
                  {analysis.reference.name}의 평균 가격은{" "}
                  {won(analysis.reference.price)}
                  {analysis.reference.unitLabel
                    ? ` (${analysis.reference.unitLabel} 기준)`
                    : ""}
                  이에요.
                </Text>
                <Text style={styles.detail}>
                  단위나 용량이 달라서 바로 비교하지는 못했어요.
                </Text>
              </View>
            ) : (
              <View style={styles.compare}>
                <Text style={styles.detail}>
                  비교할 평균 가격 정보를 찾지 못했어요.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <Pressable
          style={[styles.button, styles.buttonGray]}
          onPress={() => router.replace("/field-price-manual")}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>하나 더 입력</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonGreen]}
          onPress={() => router.dismissTo("/")}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>확인</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  body: { flex: 1, paddingTop: 30, paddingHorizontal: 20, gap: 20 },
  saved: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  card: {
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
  },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    fontWeight: "500",
    color: Colors.black,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  price: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.black,
  },
  amount: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
  compare: { gap: 8, marginTop: 8 },
  diffRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  arrow: { width: 16, height: 16 },
  diff: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "#ff3333",
  },
  diffDown: { color: "#3351ff" },
  detail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: "#757575",
  },

  footer: {
    flexDirection: "row",
    gap: 21,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.white,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 10,
  },
  buttonGray: { backgroundColor: "#b0b0b0" },
  buttonGreen: { backgroundColor: Colors.primary },
  buttonText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.white,
  },
});
