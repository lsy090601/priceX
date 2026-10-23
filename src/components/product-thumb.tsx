import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { getProduceImage } from "@/features/produce/produce-images";

const noPhoto = require("../../assets/images/home/nav-cart.png");

/** 품목 사진. 사진이 아직 없는 품목은 연한 배경에 기본 아이콘을 보여줍니다. */
export function ProductThumb({
  name,
  size,
  radius = 5,
  style,
}: {
  name: string;
  size: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const photo = getProduceImage(name);
  const box = { width: size, height: size, borderRadius: radius };

  if (photo) {
    return (
      <Image source={photo} style={[box, style as object]} contentFit="cover" />
    );
  }
  return (
    <View style={[styles.empty, box, style]}>
      <Image
        source={noPhoto}
        style={{ width: size * 0.35, height: size * 0.35 }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
});
