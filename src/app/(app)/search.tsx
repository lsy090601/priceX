import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontFamily } from "@/constants/theme";
import { getProduceImage } from "@/features/produce/produce-images";
import { requireSupabase } from "@/lib/supabase/client";

const icons = {
  back: require("../../../assets/images/search/back.svg"),
  search: require("../../../assets/images/search/search-gray.svg"),
  // 사진이 아직 없는 품목에 보여주는 기본 아이콘
  noPhoto: require("../../../assets/images/home/nav-cart.png"),
};

function ProduceThumb({ itemName }: { itemName: string }) {
  const photo = getProduceImage(itemName);
  if (photo) {
    return <Image source={photo} style={styles.thumb} contentFit="cover" />;
  }
  return (
    <View style={styles.thumbEmpty}>
      <Image
        source={icons.noPhoto}
        style={styles.thumbEmptyIcon}
        contentFit="contain"
      />
    </View>
  );
}

type SearchResult = {
  item_name: string;
  variety_name: string;
  grade_name: string;
  unit: string;
  unit_size: number;
  inspected_at: string;
  price: number;
  change_pct_1w: number | null;
};

// 조사일이 이보다 오래된 품목(제철이 아닌 과일 등)은 날짜를 같이 보여줍니다.
const STALE_DAYS = 14;

function isStale(inspectedAt: string) {
  const days = (Date.now() - new Date(inspectedAt).getTime()) / 86_400_000;
  return days > STALE_DAYS;
}

function formatDate(inspectedAt: string) {
  const [, month, day] = inspectedAt.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

const MAX_RECENT = 5;

/**
 * Figma 160:859 — 검색
 * 최근 검색어는 앱을 끄면 사라지는 임시 상태입니다. (저장소 연동 전)
 */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  // 마지막으로 검색이 끝난 검색어와 그 결과 (입력 중이면 keyword 와 달라서 로딩으로 취급)
  const [done, setDone] = useState<{
    keyword: string;
    results: SearchResult[];
    failed: boolean;
  } | null>(null);

  const keyword = query.trim();
  const settled = keyword !== "" && done?.keyword === keyword ? done : null;
  const loading = keyword !== "" && !settled;
  const results = settled?.results ?? [];
  const error = settled?.failed
    ? "검색 중 문제가 생겼어요. 잠시 후 다시 시도해주세요."
    : null;

  // 입력이 멈춘 뒤 검색합니다.
  useEffect(() => {
    if (!keyword) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      let failed = false;
      let rows: SearchResult[] = [];
      try {
        const { data, error: rpcError } = await requireSupabase().rpc(
          "search_produce_prices",
          { search_query: keyword, result_limit: 20 },
        );
        if (rpcError) failed = true;
        else rows = (data ?? []) as SearchResult[];
      } catch {
        failed = true;
      }
      if (!cancelled) setDone({ keyword, results: rows, failed });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword]);

  const saveRecent = (word: string) => {
    if (!word) return;
    setRecent((prev) =>
      [word, ...prev.filter((w) => w !== word)].slice(0, MAX_RECENT),
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable
        style={styles.back}
        onPress={() => router.back()}
        accessibilityLabel="뒤로 가기"
        hitSlop={8}
      >
        <Image
          source={icons.back}
          style={styles.backIcon}
          contentFit="contain"
        />
      </Pressable>

      <View style={styles.searchBar}>
        <Image
          source={icons.search}
          style={styles.searchIcon}
          contentFit="contain"
        />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => saveRecent(keyword)}
          placeholder="식자제 검색하기"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoFocus
          autoCorrect={false}
        />
      </View>

      {recent.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.recentLabel}>최근 검색어</Text>
          <View style={styles.chips}>
            {recent.map((word) => (
              <Pressable
                key={word}
                style={styles.chip}
                onPress={() => setQuery(word)}
              >
                <Text style={styles.chipText}>{word}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <ActivityIndicator color={Colors.primary} style={styles.status} />
      )}
      {!loading && error && <Text style={styles.statusText}>{error}</Text>}
      {!loading && !error && keyword !== "" && results.length === 0 && (
        <Text style={styles.statusText}>검색 결과가 없어요</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.item_name}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const change = item.change_pct_1w;
          const up = change !== null && change > 0;
          const down = change !== null && change < 0;
          return (
            <Pressable
              style={styles.card}
              onPress={() => saveRecent(item.item_name)}
            >
              <ProduceThumb itemName={item.item_name} />
              <View style={styles.info}>
                <View style={styles.nameBlock}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.item_name}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>
                      {item.price.toLocaleString("ko-KR")}원
                    </Text>
                    <Text style={styles.avg}>
                      {item.unit_size}
                      {item.unit} 평균
                    </Text>
                  </View>
                </View>
                {(up || down) && (
                  <Text style={[styles.change, down && styles.changeDown]}>
                    {up ? "▲" : "▼"} {Math.abs(change)}%{" "}
                    {up ? "올라갔어요" : "내려갔어요"}
                  </Text>
                )}
                {isStale(item.inspected_at) && (
                  <Text style={styles.stale}>
                    {formatDate(item.inspected_at)} 기준
                  </Text>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const BORDER = "#e5e5e5";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  back: { marginTop: 20, marginLeft: 20, width: 30, height: 30 },
  backIcon: {
    width: 30,
    height: 30,
    transform: [{ rotate: "180deg" }],
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 20,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    backgroundColor: "#f7f7f7",
  },
  searchIcon: { width: 20, height: 20 },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.black,
  },

  recent: { marginTop: 20, paddingHorizontal: 35, gap: 10 },
  recentLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.black,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e3e3e3",
    borderRadius: 10000,
    backgroundColor: "#f5f5f5",
  },
  chipText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.black,
  },

  status: { marginTop: 30 },
  statusText: {
    marginTop: 30,
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },

  list: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 19,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  thumb: { width: 80, height: 80, borderRadius: 5 },
  thumbEmpty: {
    width: 80,
    height: 80,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  thumbEmptyIcon: { width: 28, height: 28 },
  info: { flex: 1, gap: 12 },
  nameBlock: { gap: 10 },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.black,
  },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  price: {
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
  change: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#ff3333",
  },
  changeDown: { color: "#2f6fed" },
  stale: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
