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
  listChecklist,
  removeChecklistItems,
  setChecklistChecked,
  type ChecklistItem,
} from "@/features/checklist/checklist-service";

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const subtotal = (item: ChecklistItem) =>
  (item.unitPrice ?? 0) * item.quantity;

type Group = { key: string; title: string; note: string | null; items: ChecklistItem[] };

/** 판매점별로 묶고, 판매점이 없는 신선식품은 맨 아래에 모읍니다. */
function groupItems(items: ChecklistItem[]): Group[] {
  const stores = new Map<string, ChecklistItem[]>();
  const produce: ChecklistItem[] = [];
  for (const item of items) {
    if (item.storeName) {
      stores.set(item.storeName, [...(stores.get(item.storeName) ?? []), item]);
    } else {
      produce.push(item);
    }
  }
  const groups: Group[] = [...stores.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([store, list]) => ({ key: store, title: store, note: null, items: list }));
  if (produce.length > 0) {
    groups.push({
      key: "__produce",
      title: "신선식품",
      note: "판매점별 가격이 없어 평균 가격 기준이에요",
      items: produce,
    });
  }
  return groups;
}

/**
 * 체크리스트(장보기 리스트) — AI 장보기 추천에서 “결정하기”를 누르면 여기에 담깁니다.
 * 마트에서 하나씩 체크하며 장을 봅니다.
 */
export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await listChecklist());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 화면을 먼저 바꾸고 서버에 저장합니다. 실패하면 서버 상태로 되돌립니다.
  const update = (
    next: (list: ChecklistItem[]) => ChecklistItem[],
    save: () => Promise<void>,
  ) => {
    setItems((list) => (list ? next(list) : list));
    save().catch(() => {
      Alert.alert("체크리스트", "저장하지 못했어요. 다시 불러올게요.");
      void reload();
    });
  };

  const toggle = (item: ChecklistItem) =>
    update(
      (list) =>
        list.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
      () => setChecklistChecked([item.id], !item.checked),
    );

  const list = items ?? [];
  const done = list.filter((i) => i.checked);
  const remainingTotal = list
    .filter((i) => !i.checked)
    .reduce((sum, i) => sum + subtotal(i), 0);
  const groups = groupItems(list);

  const clearDone = () =>
    update(
      (current) => current.filter((i) => !i.checked),
      () => removeChecklistItems(done.map((i) => i.id)),
    );

  const clearAll = () =>
    Alert.alert("리스트 비우기", "장보기 리스트를 모두 지울까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "비우기",
        style: "destructive",
        onPress: () =>
          update(
            () => [],
            () => removeChecklistItems(list.map((i) => i.id)),
          ),
      },
    ]);

  const progress = list.length > 0 ? done.length / list.length : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="체크리스트" />

      {items === null && !failed && (
        <ActivityIndicator color={Colors.primary} style={styles.status} />
      )}
      {failed && items === null && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>체크리스트를 불러오지 못했어요</Text>
          <Pressable style={styles.emptyButton} onPress={() => void reload()}>
            <Text style={styles.emptyButtonText}>다시 불러오기</Text>
          </Pressable>
        </View>
      )}

      {items !== null && list.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 장보기 리스트가 없어요</Text>
          <Text style={styles.emptyText}>
            장바구니를 AI로 분석하고 ‘결정하기’를 누르면{"\n"}
            추천받은 구매 조합이 여기에 담겨요.
          </Text>
          <Pressable
            style={styles.emptyButton}
            onPress={() => router.replace("/cart")}
          >
            <Text style={styles.emptyButtonText}>장바구니로 가기</Text>
          </Pressable>
        </View>
      )}

      {list.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summary}>
            <View style={styles.summaryTop}>
              <Text style={styles.summaryTitle}>장보기 진행</Text>
              <Text style={styles.summaryCount}>
                {done.length} / {list.length}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.remaining}>
              {done.length === list.length
                ? "장보기를 모두 마쳤어요! 🎉"
                : `남은 예상 지출 ${won(remainingTotal)}`}
            </Text>
          </View>

          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.note && <Text style={styles.groupNote}>{group.note}</Text>}
              </View>
              {group.items.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.row}
                  onPress={() => toggle(item)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                >
                  <View style={[styles.check, item.checked && styles.checkOn]}>
                    {item.checked && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <ProductThumb name={item.productName} size={56} radius={8} />
                  <View style={[styles.rowText, item.checked && styles.rowDone]}>
                    <Text
                      style={[styles.name, item.checked && styles.nameDone]}
                      numberOfLines={2}
                    >
                      {item.productName}
                      {item.unitLabel ? ` (${item.unitLabel})` : ""}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </Text>
                    {item.unitPrice !== null && (
                      <Text style={styles.unitPrice}>
                        개당 {won(item.unitPrice)}
                      </Text>
                    )}
                  </View>
                  {item.unitPrice !== null && (
                    <Text style={[styles.price, item.checked && styles.nameDone]}>
                      {won(subtotal(item))}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}

          <View style={styles.actions}>
            {done.length > 0 && (
              <Pressable onPress={clearDone} hitSlop={8}>
                <Text style={styles.action}>완료한 항목 지우기</Text>
              </Pressable>
            )}
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.action}>리스트 비우기</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <TabBar active="checklist" />
    </View>
  );
}

const BORDER = "#e5e5e5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  status: { marginTop: 40 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  emptyText: {
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textMuted,
  },
  emptyButton: {
    marginTop: 6,
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

  body: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 30, gap: 30 },

  summary: {
    gap: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    fontWeight: "500",
    color: Colors.black,
  },
  summaryCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#eeeeee",
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: "#00b43f" },
  remaining: { fontFamily: FontFamily.medium, fontSize: 13, color: "#757575" },

  group: { gap: 6 },
  groupHead: { gap: 4, marginBottom: 6 },
  groupTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  groupNote: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
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
  rowText: { flex: 1, gap: 6 },
  rowDone: { opacity: 0.5 },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.black,
  },
  nameDone: { textDecorationLine: "line-through", color: "#9d9d9d" },
  unitPrice: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
  price: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.black,
  },

  actions: { flexDirection: "row", justifyContent: "center", gap: 24 },
  action: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: "#b0b0b0",
    textDecorationLine: "underline",
  },
});
