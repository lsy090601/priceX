import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { addToCart } from "@/features/cart/cart-service";
import {
  fetchProductDetail,
  isProductKind,
  type ProductDetail,
} from "@/features/product/product-service";
import {
  displayStoreName,
  STORE_TYPES,
  type StoreType,
} from "@/features/product/store-type";
import { getProduceImage } from "@/features/produce/produce-images";

const icons = {
  arrowUp: require("../../../assets/images/home/arrow-up.png"),
  arrowDown: require("../../../assets/images/product/arrow-down.svg"),
  trend: require("../../../assets/images/product/trend-card.png"),
};

const MAX_OFFERS = 20;
const STALE_DAYS = 14;

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

function formatDate(inspectedAt: string) {
  const [, month, day] = inspectedAt.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function isStale(inspectedAt: string) {
  return (Date.now() - new Date(inspectedAt).getTime()) / 86_400_000 > STALE_DAYS;
}

/**
 * Figma 160:1013 — 가격 추이 (상품 상세)
 * 검색 결과 / 홈 카드에서 ?kind=produce|packaged&name=상품이름 으로 들어옵니다.
 */
export default function ProductScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string; name?: string }>();
  const kind = isProductKind(params.kind) ? params.kind : null;
  const name = typeof params.name === "string" ? params.name : "";
  const key = `${kind}:${name}`;

  const [result, setResult] = useState<{
    key: string;
    detail: ProductDetail | null;
  } | null>(null);
  const [storeType, setStoreType] = useState<StoreType>("mart");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!kind || !name) return;
    let cancelled = false;
    fetchProductDetail(kind, name)
      .then((detail) => !cancelled && setResult({ key, detail }))
      .catch(() => !cancelled && setResult({ key, detail: null }));
    return () => {
      cancelled = true;
    };
  }, [kind, name, key]);

  const loading = !!kind && !!name && result?.key !== key;
  const detail = result?.key === key ? result.detail : null;

  const handleAdd = async () => {
    if (!detail || adding) return;
    setAdding(true);
    try {
      await addToCart(detail.kind, detail.name);
      router.push("/cart");
    } catch {
      Alert.alert("장바구니", "장바구니에 담지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="가격 추이" />

      {loading && (
        <ActivityIndicator color={Colors.primary} style={styles.status} />
      )}
      {!loading && !detail && (
        <Text style={styles.statusText}>가격 정보를 불러오지 못했어요</Text>
      )}

      {detail && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <HeroImage name={detail.name} />

          <View style={styles.info}>
            <View style={styles.infoTop}>
              <Text style={styles.name}>{detail.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{won(detail.price)}</Text>
                {detail.unitLabel && (
                  <Text style={styles.unit}>{detail.unitLabel} 평균</Text>
                )}
                <Change pct={detail.changePct} />
              </View>
            </View>
            <Text style={styles.notice}>
              표시된 가격은 평균 가격이며, 실제 가게의 가격과 차이가 있을 수
              있어요.
            </Text>
            <Text style={styles.date}>
              {formatDate(detail.inspectedAt)} 기준
              {isStale(detail.inspectedAt) ? " (오래된 정보예요)" : ""}
            </Text>
          </View>

          <Pressable
            style={[styles.addButton, adding && styles.addButtonBusy]}
            onPress={handleAdd}
            disabled={adding}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>장바구니</Text>
          </Pressable>

          <Pressable
            style={styles.trendCard}
            onPress={() =>
              router.push({
                pathname: "/trend",
                params: { kind: detail.kind, name: detail.name },
              })
            }
          >
            <View style={styles.trendIconBox}>
              <View style={styles.trendIconClip}>
                <Image source={icons.trend} style={styles.trendIcon} />
              </View>
            </View>
            <View style={styles.trendText}>
              <Text style={styles.trendSmall}>똑똑한 소비를 위해</Text>
              <Text style={styles.trendBig}>
                <Text style={styles.trendGreen}>평균 가격 추이</Text>를
                확인해보세요!
              </Text>
            </View>
          </Pressable>

          {detail.kind === "packaged" ? (
            <Offers
              detail={detail}
              storeType={storeType}
              onChangeType={setStoreType}
            />
          ) : (
            <Text style={styles.noOffers}>
              신선식품은 아직 매장별 가격 정보가 없어요. 현장 가격을
              입력해주시면 함께 비교할 수 있어요.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function HeroImage({ name }: { name: string }) {
  const photo = getProduceImage(name);
  if (!photo) return <View style={styles.hero} />;
  return (
    <View style={styles.hero}>
      <Image source={photo} style={styles.heroImage} contentFit="contain" />
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

function Offers({
  detail,
  storeType,
  onChangeType,
}: {
  detail: ProductDetail;
  storeType: StoreType;
  onChangeType: (type: StoreType) => void;
}) {
  const offers = detail.offers
    .filter((o) => o.storeType === storeType)
    .slice(0, MAX_OFFERS);

  return (
    <View style={styles.offers}>
      <View style={styles.chips}>
        {STORE_TYPES.map((type) => {
          const selected = type.key === storeType;
          return (
            <Pressable
              key={type.key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChangeType(type.key)}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {offers.length === 0 && (
        <Text style={styles.noOffers}>
          이 종류의 판매점 가격 정보가 아직 없어요.
        </Text>
      )}
      {offers.map((offer) => {
        const diff = detail.price - offer.price;
        const cheaper = diff > 0;
        const same = diff === 0;
        return (
          <View key={offer.storeName} style={styles.offerRow}>
            <ProductThumb name={detail.name} size={80} radius={8} />
            <View style={styles.offerText}>
              <View style={styles.offerHead}>
                <Text style={styles.storeName} numberOfLines={1}>
                  {displayStoreName(offer.storeName)}
                </Text>
                <Text style={styles.offerPrice}>
                  {won(offer.price)}
                  {offer.isOnePlusOne ? " · 1+1" : offer.isDiscounted ? " · 할인" : ""}
                </Text>
              </View>
              {same ? (
                <Text style={styles.stale}>평균과 같아요</Text>
              ) : (
                <View style={styles.changeRow}>
                  <Image
                    source={cheaper ? icons.arrowDown : icons.arrowUp}
                    style={styles.arrow}
                    contentFit="contain"
                  />
                  <Text style={[styles.diffText, !cheaper && styles.diffUp]}>
                    평균보다 {won(Math.abs(diff))} {cheaper ? "저렴해요" : "비싸요"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
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
  hero: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },

  info: { marginTop: 16, paddingHorizontal: 20, gap: 12 },
  infoTop: { gap: 10 },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    fontWeight: "500",
    color: Colors.black,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  price: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.black,
  },
  unit: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    paddingBottom: 2,
  },
  changeRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  arrow: { width: 16, height: 16 },
  changeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#ff3333",
  },
  changeDown: { color: "#3351ff" },
  notice: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    width: 229,
  },
  date: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },

  addButton: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  addButtonBusy: { opacity: 0.6 },
  addButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.white,
  },

  trendCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 27,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  trendIconBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f0fff3",
  },
  // 피그마에서 이미지의 일부분만 잘라 쓴 아이콘 (37x37 안에 확대해서 배치)
  trendIconClip: { width: 37, height: 37, overflow: "hidden" },
  trendIcon: {
    position: "absolute",
    width: 72,
    height: 72,
    left: -18.8,
    top: -20.5,
  },
  trendText: { flex: 1, gap: 6 },
  trendSmall: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.black,
  },
  trendBig: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
  },
  trendGreen: { color: Colors.primary },

  offers: { marginTop: 40 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
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
  noOffers: {
    marginTop: 20,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textMuted,
  },

  offerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
    paddingVertical: 12,
  },
  offerText: { flex: 1, gap: 12 },
  offerHead: { gap: 8 },
  storeName: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
  },
  offerPrice: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  diffText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#3351ff",
  },
  diffUp: { color: "#ff3333" },
  stale: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
