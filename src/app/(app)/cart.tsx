import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { TabBar } from "@/components/tab-bar";
import { Colors, FontFamily } from "@/constants/theme";
import {
  listCart,
  removeFromCart,
  setCartChecked,
  setCartQuantity,
  type CartItem,
} from "@/features/cart/cart-service";

const icons = {
  trash: require("../../../assets/images/cart/trash.svg"),
  plus: require("../../../assets/images/cart/plus.svg"),
};

/**
 * Figma 160:647 — 장바구니
 * 체크한 품목이 있으면 그것만, 하나도 안 골랐으면 전체를 AI 분석합니다.
 */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await listCart());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // 화면에 들어올 때마다 새로 불러옵니다. (상세 화면에서 담고 돌아온 경우 등)
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 화면을 먼저 바꾸고 서버에 저장합니다. 실패하면 서버 상태로 되돌립니다.
  const update = (
    next: (list: CartItem[]) => CartItem[],
    save: () => Promise<void>,
  ) => {
    setItems((list) => (list ? next(list) : list));
    save().catch(() => {
      Alert.alert("장바구니", "저장하지 못했어요. 다시 불러올게요.");
      void reload();
    });
  };

  const toggle = (item: CartItem) =>
    update(
      (list) =>
        list.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
      () => setCartChecked([item.id], !item.checked),
    );

  const changeQuantity = (item: CartItem, delta: number) => {
    const quantity = item.quantity + delta;
    if (quantity < 1) {
      update(
        (list) => list.filter((i) => i.id !== item.id),
        () => removeFromCart([item.id]),
      );
      return;
    }
    update(
      (list) => list.map((i) => (i.id === item.id ? { ...i, quantity } : i)),
      () => setCartQuantity(item.id, quantity),
    );
  };

  const list = items ?? [];
  const allChecked = list.length > 0 && list.every((i) => i.checked);

  const toggleAll = () =>
    update(
      (current) => current.map((i) => ({ ...i, checked: !allChecked })),
      () => setCartChecked(list.map((i) => i.id), !allChecked),
    );

  const removeAll = () => {
    if (list.length === 0) return;
    Alert.alert("전체 삭제", "장바구니를 모두 비울까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          update(
            () => [],
            () => removeFromCart(list.map((i) => i.id)),
          ),
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="장바구니" />

      {items === null && !failed && (
        <ActivityIndicator color={Colors.primary} style={styles.status} />
      )}
      {failed && items === null && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>장바구니를 불러오지 못했어요</Text>
          <Pressable style={styles.emptyButton} onPress={() => void reload()}>
            <Text style={styles.emptyButtonText}>다시 불러오기</Text>
          </Pressable>
        </View>
      )}

      {items !== null && list.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>장바구니가 비어 있어요</Text>
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.push("/search")}
          >
            <Text style={styles.emptyButtonText}>상품 검색하러 가기</Text>
          </Pressable>
        </View>
      )}

      {list.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHead}>
            <Text style={styles.listTitle}>현재 장바구니</Text>
            <View style={styles.listActions}>
              <Pressable onPress={removeAll} hitSlop={8}>
                <Text style={styles.action}>전체 삭제</Text>
              </Pressable>
              <View style={styles.divider} />
              <Pressable onPress={toggleAll} hitSlop={8}>
                <Text style={styles.action}>
                  {allChecked ? "전체 해제" : "전체 선택"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.cards}>
            {list.map((item) => (
              <View key={item.id} style={styles.card}>
                <Pressable
                  onPress={() => toggle(item)}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={`${item.productName} 선택`}
                  style={styles.checkWrap}
                >
                  <View style={[styles.check, item.checked && styles.checkOn]}>
                    {item.checked && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>

                <View style={styles.cardBody}>
                  <View style={styles.cardText}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => changeQuantity(item, -1)}
                        hitSlop={8}
                        accessibilityLabel={
                          item.quantity > 1 ? "수량 줄이기" : "장바구니에서 삭제"
                        }
                      >
                        <Image
                          source={icons.trash}
                          style={styles.stepIcon}
                          contentFit="contain"
                        />
                      </Pressable>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => changeQuantity(item, 1)}
                        hitSlop={8}
                        accessibilityLabel="수량 늘리기"
                      >
                        <Image
                          source={icons.plus}
                          style={styles.stepIcon}
                          contentFit="contain"
                        />
                      </Pressable>
                    </View>
                  </View>
                  <ProductThumb name={item.productName} size={76} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {list.length > 0 && (
        <View style={styles.footer}>
          <Pressable
            style={styles.analyze}
            onPress={() => router.push("/plan")}
            accessibilityRole="button"
          >
            <Text style={styles.analyzeText}>장바구니 AI 분석</Text>
          </Pressable>
        </View>
      )}

      <TabBar active="cart" />
    </View>
  );
}

const BORDER = "#e5e5e5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  status: { marginTop: 40 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  emptyButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.white,
  },

  body: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 20 },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  listActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  action: { fontFamily: FontFamily.regular, fontSize: 14, color: "#b0b0b0" },
  divider: { width: 1, height: 16, backgroundColor: "#d9d9d9" },

  cards: { marginTop: 30, gap: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  checkWrap: { padding: 5 },
  check: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 5,
    backgroundColor: Colors.white,
  },
  checkOn: { backgroundColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardText: { flex: 1, gap: 20 },
  itemName: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    fontWeight: "500",
    color: Colors.black,
  },
  stepper: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: "#f7f7f7",
  },
  stepIcon: { width: 16, height: 16 },
  quantity: {
    minWidth: 16,
    textAlign: "center",
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.black,
  },

  footer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white },
  analyze: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  analyzeText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.white,
  },
});
