import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";

const icons = {
  store: require("../../../assets/images/cart/store.svg"),
  bubble: require("../../../assets/images/cart/store-card-bubble.svg"),
};

/**
 * Figma 160:819 — 구매처 안내
 * 판매점의 주소·전화·지도는 아직 데이터가 없어서 "준비 중"으로 표시합니다.
 */
export default function StoreGuideScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ store?: string; items?: string }>();
  const store = typeof params.store === "string" ? params.store : "";
  const items = typeof params.items === "string" ? params.items : "";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="구매처 안내" />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Image
            source={icons.store}
            style={styles.storeIcon}
            contentFit="contain"
          />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{store} 추천!</Text>
            <Text style={styles.cardItems}>{items}</Text>
          </View>
        </View>

        <View style={styles.map}>
          <Text style={styles.mapText}>지도는 준비 중이에요</Text>
        </View>

        <View style={styles.bubbleWrap}>
          <Image
            source={icons.bubble}
            style={styles.bubble}
            contentFit="fill"
          />
          <View style={styles.bubbleContent}>
            <View style={styles.bubbleThumb} />
            <View style={styles.bubbleText}>
              <Text style={styles.storeName}>{store}</Text>
              <Text style={styles.address}>
                주소와 전화번호는 준비 중이에요
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  body: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 33,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  storeIcon: { width: 30, height: 30 },
  cardText: { flex: 1, gap: 10 },
  cardTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    fontWeight: "500",
    color: Colors.black,
  },
  cardItems: { fontFamily: FontFamily.regular, fontSize: 14, color: "#7e7e7e" },

  map: {
    marginTop: 20,
    height: 270,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#bcbcbc",
  },
  mapText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.white },

  bubbleWrap: { marginTop: 19, height: 158.29 },
  bubble: { position: "absolute", width: "100%", height: 158.29 },
  bubbleContent: {
    flexDirection: "row",
    gap: 20,
    marginTop: 47,
    marginLeft: 20,
    marginRight: 20,
  },
  bubbleThumb: {
    width: 80,
    height: 80,
    borderRadius: 5,
    backgroundColor: "#bcbcbc",
  },
  bubbleText: { flex: 1, gap: 20 },
  storeName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  address: { fontFamily: FontFamily.medium, fontSize: 13, color: "#7e7e7e" },
});
