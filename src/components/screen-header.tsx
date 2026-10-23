import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FontFamily } from "@/constants/theme";

const back = require("../../assets/images/search/back.svg");

/** 뒤로가기 + 제목이 있는 상단 줄 (Figma: 가격 추이, 장바구니, AI 장보기 추천 …) */
export function ScreenHeader({ title }: { title: string }) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.header}>
      <Pressable onPress={goBack} accessibilityLabel="뒤로 가기" hitSlop={8}>
        <Image source={back} style={styles.backIcon} contentFit="contain" />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
  backIcon: { width: 30, height: 30, transform: [{ rotate: "180deg" }] },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
});
