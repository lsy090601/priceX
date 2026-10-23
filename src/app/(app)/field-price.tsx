import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";

const icons = {
  camera: require("../../../assets/images/field-price/camera.svg"),
  pencil: require("../../../assets/images/field-price/pencil.svg"),
};

/** Figma 186:2076 — 현장 가격 입력하기 (등록 방법 고르기) */
export default function FieldPriceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="현장 가격 입력하기" />

      <View style={styles.body}>
        <Pressable
          style={styles.option}
          onPress={() => router.push("/field-price-camera")}
          accessibilityRole="button"
        >
          <Image source={icons.camera} style={styles.icon} contentFit="contain" />
          <View style={styles.text}>
            <Text style={styles.title}>사진으로 등록하기</Text>
            <Text style={styles.desc}>
              가격표 사진으로 식재료의 가격과 단위 정보를 간편하게 입력해요.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.option}
          onPress={() => router.push("/field-price-manual")}
          accessibilityRole="button"
        >
          <Image source={icons.pencil} style={styles.icon} contentFit="contain" />
          <View style={styles.text}>
            <Text style={styles.title}>직접 등록하기</Text>
            <Text style={styles.desc}>
              식재료의 이름과 판매 가격, 중량 및 수량을 직접 입력해 등록해요.
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  body: { paddingTop: 100, paddingHorizontal: 20, gap: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  icon: { width: 49, height: 49 },
  text: { flex: 1, gap: 10 },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  desc: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#757575",
  },
});
