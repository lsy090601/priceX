import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductThumb } from "@/components/product-thumb";
import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";
import { listCart } from "@/features/cart/cart-service";
import {
  computePlan,
  loadPlanSources,
  pickItemsToAnalyze,
  type PlanLine,
  type PlanSource,
} from "@/features/cart/plan";
import { STORE_TYPES, type StoreType } from "@/features/product/store-type";

const icons = {
  arrowDown: require("../../../assets/images/product/arrow-down.svg"),
  arrowUp: require("../../../assets/images/home/arrow-up.png"),
  chevron: require("../../../assets/images/cart/chevron-right.svg"),
};

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/**
 * Figma 160:721 — AI 장보기 추천
 * 체크한 장바구니 품목(없으면 전체)을 판매점 종류별로 가장 싼 곳 기준으로 계산합니다.
 * 신선식품은 판매점별 가격이 없어서 평균 가격으로 계산합니다.
 */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; sources: PlanSource[] }
  >({ status: "loading" });
  const [storeType, setStoreType] = useState<StoreType>("mart");

  useEffect(() => {
    let cancelled = false;
    listCart()
      .then((items) => loadPlanSources(pickItemsToAnalyze(items)))
      .then((sources) => !cancelled && setState({ status: "ready", sources }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = useMemo(
    () =>
      state.status === "ready" ? computePlan(state.sources, storeType) : null,
    [state, storeType],
  );

  const openStore = (line: PlanLine) => {
    if (!line.storeName || !plan) return;
    const names = plan.lines
      .filter((l) => l.storeName === line.storeName)
      .map((l) => l.productName);
    router.push({
      pathname: "/store-guide",
      params: { store: line.storeName, items: names.join(", ") },
    });
  };

  const hasProduce = plan?.lines.some((l) => l.status === "average");

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="AI 장보기 추천" />

      {state.status === "loading" && (
        <ActivityIndicator color={Colors.primary} style={styles.status} />
      )}
      {state.status === "error" && (
        <Text style={styles.statusText}>분석 결과를 불러오지 못했어요</Text>
      )}

      {plan && (
        <>
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.intro}>
              <Text style={styles.introTitle}>분석이 완료 되었어요!</Text>
              <Text style={styles.introDesc}>
                장바구니를 분석한 결과, 아래와 같이 구매하시면 가장 합리적인
                조건으로 구매할 수 있어요.
              </Text>
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>예상 총 지출 금액</Text>
              <View style={styles.summaryBody}>
                <View style={styles.amountRow}>
                  <Text style={styles.total}>{won(plan.total)}</Text>
                  <Text style={styles.baseline}>
                    기존 예상 {won(plan.baseline)}
                  </Text>
                </View>
                {plan.savings > 0 ? (
                  <View style={styles.saveRow}>
                    <Image
                      source={icons.arrowDown}
                      style={styles.arrow}
                      contentFit="contain"
                    />
                    <Text style={styles.saveText}>
                      {won(plan.savings)} 절약 가능
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.baseline}>평균 가격과 비슷해요</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>추천 구매 조합</Text>
            <View style={styles.chips}>
              {STORE_TYPES.map((type) => {
                const selected = type.key === storeType;
                return (
                  <Pressable
                    key={type.key}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setStoreType(type.key)}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.lines}>
              {plan.lines.map((line) => (
                <LineRow
                  key={line.key}
                  line={line}
                  onPress={() => openStore(line)}
                />
              ))}
            </View>

            {hasProduce && (
              <Text style={styles.note}>
                신선식품은 판매점별 가격 정보가 없어서 평균 가격 기준으로
                계산했어요.
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.buttonGray]}
              onPress={() => router.back()}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>다시하기</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonGreen]}
              onPress={() => router.push("/plan-done")}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>결정하기</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function LineRow({ line, onPress }: { line: PlanLine; onPress: () => void }) {
  const qty = line.quantity > 1 ? ` × ${line.quantity}` : "";
  const name = line.unitLabel
    ? `${line.productName} (${line.unitLabel})`
    : line.productName;
  const title =
    line.status === "store"
      ? `${line.storeName} • ${name}${qty}`
      : `${name}${qty}`;

  let detail: React.ReactNode = null;
  if (line.unitPrice !== null && line.averagePrice !== null) {
    const diff = line.averagePrice - line.unitPrice;
    if (line.status === "average") {
      detail = <Text style={styles.muted}>평균 가격 기준</Text>;
    } else if (diff > 0) {
      detail = (
        <View style={styles.saveRow}>
          <Image
            source={icons.arrowDown}
            style={styles.arrow}
            contentFit="contain"
          />
          <Text style={styles.saveText}>평균보다 {won(diff)} 저렴해요</Text>
        </View>
      );
    } else if (diff < 0) {
      detail = (
        <View style={styles.saveRow}>
          <Image
            source={icons.arrowUp}
            style={styles.arrow}
            contentFit="contain"
          />
          <Text style={styles.moreText}>평균보다 {won(-diff)} 비싸요</Text>
        </View>
      );
    } else {
      detail = <Text style={styles.muted}>평균 가격이에요</Text>;
    }
  } else if (line.status === "no-store") {
    detail = (
      <Text style={styles.muted}>이 종류의 판매점 가격 정보가 없어요</Text>
    );
  } else {
    detail = <Text style={styles.muted}>가격 정보를 찾지 못했어요</Text>;
  }

  const pressable = line.status === "store";
  return (
    <Pressable
      style={styles.line}
      onPress={pressable ? onPress : undefined}
      disabled={!pressable}
    >
      <ProductThumb name={line.productName} size={80} radius={8} />
      <View style={styles.lineText}>
        <Text style={styles.lineTitle} numberOfLines={2}>
          {title}
        </Text>
        {line.unitPrice !== null && (
          <Text style={styles.linePrice}>{won(line.unitPrice)}</Text>
        )}
        {detail}
      </View>
      {pressable && (
        <Image
          source={icons.chevron}
          style={styles.chevron}
          contentFit="contain"
        />
      )}
    </Pressable>
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

  body: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 30 },
  intro: { gap: 10, width: 272 },
  introTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  introDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: "#7e7e7e",
  },

  summary: {
    marginTop: 30,
    gap: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  summaryTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    fontWeight: "500",
    color: Colors.black,
  },
  summaryBody: { alignItems: "flex-end", gap: 14 },
  amountRow: { flexDirection: "row", alignItems: "flex-end", gap: 20 },
  total: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.primary,
  },
  baseline: { fontFamily: FontFamily.regular, fontSize: 14, color: "#b0b0b0" },
  saveRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  arrow: { width: 16, height: 16 },
  saveText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#3351ff",
  },
  moreText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#ff3333",
  },

  sectionTitle: {
    marginTop: 30,
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },
  chips: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 1000,
    backgroundColor: "#f5f5f5",
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.black,
  },
  chipTextSelected: {
    fontFamily: FontFamily.semiBold,
    fontWeight: "600",
    color: Colors.white,
  },

  lines: { marginTop: 20, gap: 20 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  lineText: { flex: 1, gap: 8 },
  lineTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },
  linePrice: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  muted: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  chevron: { width: 30, height: 30, alignSelf: "center" },
  note: {
    marginTop: 24,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
  },

  footer: {
    flexDirection: "row",
    gap: 21,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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
