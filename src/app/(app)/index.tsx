import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBar } from "@/components/tab-bar";
import { Colors, FontFamily } from "@/constants/theme";
import {
  fetchCartSummary,
  fetchTodayPrices,
  type CartSummary,
  type TodayPrice,
} from "@/features/home/home-service";
import { getProduceImage } from "@/features/produce/produce-images";

const icons = {
  search: require("../../../assets/images/home/search.png"),
  bell: require("../../../assets/images/home/bell.png"),
  chevronGray: require("../../../assets/images/home/chevron-gray.png"),
  chevronGreen: require("../../../assets/images/home/chevron-green.png"),
  arrowUp: require("../../../assets/images/home/arrow-up.png"),
  arrowDown: require("../../../assets/images/product/arrow-down.svg"),
  mascot: require("../../../assets/images/home/ai-mascot.png"),
  priceInput: require("../../../assets/images/home/price-input.png"),
};

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/**
 * Figma 160:562 — 홈
 * 오늘의 가격 카드는 실제 가격 데이터, AI 장보기 추천 카드는 내 장바구니로 계산합니다.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState<TodayPrice[] | null>(null);
  const [cart, setCart] = useState<CartSummary | null>(null);

  // 홈에 들어올 때마다 새로 불러옵니다. (장바구니를 바꾸고 돌아온 경우 등)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchTodayPrices()
        .then((items) => !cancelled && setToday(items))
        .catch(() => !cancelled && setToday([]));
      fetchCartSummary()
        .then((summary) => !cancelled && setCart(summary))
        .catch(() => !cancelled && setCart(null));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const aiText = !cart
    ? "장바구니에 상품을 담으면 최적 구매 조합을 알려드려요"
    : cart.itemCount === 0
      ? "장바구니에 상품을 담으면 최적 구매 조합을 알려드려요"
      : cart.savings > 0
        ? `예상 지출 ${won(cart.total)}, 최대 ${won(cart.savings)} 절약 가능`
        : `예상 지출 ${won(cart.total)}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>PRICEX</Text>
        <View style={styles.headerIcons}>
          <Pressable
            style={styles.iconButton}
            accessibilityLabel="검색"
            onPress={() => router.push("/search")}
            hitSlop={8}
          >
            <Image
              source={icons.search}
              style={styles.search}
              contentFit="contain"
            />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            accessibilityLabel="알림"
            hitSlop={8}
          >
            <Image
              source={icons.bell}
              style={styles.iconButton}
              contentFit="contain"
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHead}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Today’s PRICE!</Text>
            <Pressable
              style={styles.more}
              onPress={() => router.push("/search")}
              hitSlop={8}
            >
              <Text style={styles.moreText}>더보기</Text>
              <Image
                source={icons.chevronGray}
                style={styles.chevron}
                contentFit="contain"
              />
            </Pressable>
          </View>
          <Text style={styles.sectionDesc}>
            오늘의 인기 식자재 가격을 비교해보세요
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardList}
        >
          {(today ?? []).map((item) => (
            <Pressable
              key={item.name}
              style={styles.priceCard}
              onPress={() =>
                router.push({
                  pathname: "/product",
                  params: { kind: "produce", name: item.name },
                })
              }
            >
              <Image
                source={getProduceImage(item.name)}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={styles.priceInfo}>
                <View style={styles.nameBlock}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>{won(item.price)}</Text>
                    <Text style={styles.avg}>{item.unitLabel} 평균</Text>
                  </View>
                </View>
                <View style={styles.changeRow}>
                  {item.changePct !== null && item.changePct !== 0 ? (
                    <>
                      <Image
                        source={item.changePct > 0 ? icons.arrowUp : icons.arrowDown}
                        style={styles.arrow}
                        contentFit="contain"
                      />
                      <Text
                        style={[
                          styles.changeText,
                          item.changePct < 0 && styles.changeDown,
                        ]}
                      >
                        {Math.abs(item.changePct)}%
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.avg}>변동 없음</Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
          {today === null && (
            <View style={styles.cardLoading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <Image
              source={icons.priceInput}
              style={styles.inputImage}
              contentFit="cover"
            />
            <View style={styles.inputText}>
              <Text style={styles.aiTitle}>현장 가격 입력하기</Text>
              <Text style={styles.inputDesc}>
                매장에서 확인한 가격을 입력하고 평균 가격과 비교해보세요!
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.inputButton}
            onPress={() => router.push("/field-price")}
            accessibilityRole="button"
          >
            <Text style={styles.inputButtonText}>가격 입력하기</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.aiCard}
          onPress={() =>
            router.push(cart && cart.itemCount > 0 ? "/plan" : "/cart")
          }
          accessibilityRole="button"
        >
          <Image
            source={icons.mascot}
            style={styles.mascot}
            contentFit="cover"
          />
          <View style={styles.aiText}>
            <View style={styles.aiHead}>
              <Text style={styles.aiTitle}>AI 장보기 추천</Text>
              <View style={styles.aiLink}>
                <Text style={styles.aiLinkText}>최적 구매 조합 확인하기</Text>
                <Image
                  source={icons.chevronGreen}
                  style={styles.chevron}
                  contentFit="contain"
                />
              </View>
            </View>
            <Text style={styles.aiDesc}>{aiText}</Text>
          </View>
        </Pressable>
      </ScrollView>

      <TabBar active="home" />
    </View>
  );
}

const BORDER = "#e5e5e5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  logo: {
    fontFamily: FontFamily.logo,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
    paddingVertical: 5,
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 20 },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  search: { width: 19.5, height: 19.5 },

  body: { paddingTop: 30, paddingBottom: 40 },
  sectionHead: { paddingHorizontal: 20, gap: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: FontFamily.logo,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  more: { flexDirection: "row", alignItems: "center", gap: 3 },
  moreText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  chevron: { width: 20, height: 20 },
  sectionDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.black,
  },

  cardScroll: { flexGrow: 0, marginTop: 30 },
  cardList: { paddingHorizontal: 20, gap: 20 },
  priceCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 10,
  },
  thumb: {
    width: 140,
    height: 90,
    borderRadius: 6,
    backgroundColor: "#bcbcbc",
  },
  priceInfo: { minWidth: 90, maxWidth: 140, gap: 16 },
  nameBlock: { gap: 5 },
  itemName: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.black,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  itemPrice: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  avg: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  changeRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  arrow: { width: 16, height: 16 },
  cardLoading: { width: 140, height: 200, alignItems: "center", justifyContent: "center" },
  changeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#ff3333",
  },
  changeDown: { color: "#3351ff" },

  inputCard: {
    marginTop: 32,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 20,
    backgroundColor: Colors.white,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  inputImage: { width: 101, height: 101 },
  inputText: { flex: 1, gap: 10 },
  inputDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#757575",
  },
  inputButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  inputButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.white,
  },

  aiCard: {
    marginTop: 31,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 27,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 20,
    backgroundColor: Colors.white,
  },
  mascot: { width: 57, height: 57, borderRadius: 8 },
  aiText: { flex: 1, gap: 10 },
  aiHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  aiTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  aiLink: { flexDirection: "row", alignItems: "center", gap: 3 },
  aiLinkText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.primary,
  },
  aiDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#757575",
    width: 186,
  },

});
