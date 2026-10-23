import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";

const icons = {
  check: require("../../../assets/images/cart/done-check.svg"),
  basket: require("../../../assets/images/cart/done-basket.png"),
  list: require("../../../assets/images/cart/list-check.svg"),
};

/** Figma 160:850 — 장볼 준비 완료 */
export default function PlanDoneScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="AI 장보기 추천" />

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.top}>
            <Image
              source={icons.check}
              style={styles.check}
              contentFit="contain"
            />
            <View style={styles.texts}>
              <Text style={styles.title}>이제 장볼 준비가 되었어요!</Text>
              <Text style={styles.desc}>
                추천받은 구매 조합으로 더 저렴하고 똑똑하게 장보세요
              </Text>
            </View>
            <Image
              source={icons.basket}
              style={styles.basket}
              contentFit="cover"
            />
            <Text style={styles.footnote}>
              더 합리적인 장보기를 위해 PRICEX가 항상 함께할게요!
            </Text>
          </View>

          <Pressable
            style={styles.button}
            onPress={() => {
              // 장보기 리스트(체크리스트) 화면이 아직 없어서, 안내 후 홈으로 돌아갑니다.
              Alert.alert("장보기 리스트", "장보기 리스트는 준비 중이에요.");
              router.replace("/");
            }}
            accessibilityRole="button"
          >
            <Image
              source={icons.list}
              style={styles.listIcon}
              contentFit="contain"
            />
            <Text style={styles.buttonText}>장보기 리스트로 이동하기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  body: { paddingTop: 30, paddingHorizontal: 20 },
  card: {
    alignItems: "center",
    gap: 50,
    paddingHorizontal: 20,
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    backgroundColor: "#f7f7f7",
  },
  top: { alignItems: "center", gap: 30, width: 199 },
  check: { width: 39, height: 39 },
  texts: { alignItems: "center", gap: 10 },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  desc: {
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: "#7e7e7e",
  },
  basket: { width: 174, height: 174 },
  footnote: {
    width: 183,
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#7e7e7e",
  },
  button: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
    padding: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  listIcon: { width: 27, height: 27 },
  buttonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.white,
  },
});
