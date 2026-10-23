import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontFamily } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-provider";

const icons = {
  homeActive: require("../../assets/images/home/nav-home.png"),
  homeInactive: require("../../assets/images/cart/nav-home-gray.svg"),
  checklistActive: require("../../assets/images/cart/nav-checklist-active.svg"),
  checklistInactive: require("../../assets/images/home/nav-checklist.png"),
  cartActive: require("../../assets/images/cart/nav-cart-active.svg"),
  cartInactive: require("../../assets/images/home/nav-cart.png"),
  user: require("../../assets/images/home/nav-user.png"),
};

export type TabKey = "home" | "checklist" | "cart" | "mypage";

/** 하단 탭 (홈 / 체크리스트 / 장바구니 / 마이페이지) */
export function TabBar({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  // 마이페이지가 아직 없어서, 임시로 눌렀을 때 로그아웃을 물어봅니다.
  const handleMyPage = () => {
    Alert.alert("마이페이지", "마이페이지는 준비 중이에요. 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => void signOut().catch(() => {}),
      },
    ]);
  };

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}
    >
      <TabItem
        label="홈"
        icon={active === "home" ? icons.homeActive : icons.homeInactive}
        active={active === "home"}
        iconSize={{ width: 32, height: 30 }}
        onPress={() => active !== "home" && router.replace("/")}
      />
      <TabItem
        label="체크리스트"
        icon={active === "checklist" ? icons.checklistActive : icons.checklistInactive}
        active={active === "checklist"}
        iconSize={{ width: 30, height: 30 }}
        onPress={() => active !== "checklist" && router.replace("/checklist")}
      />
      <TabItem
        label="장바구니"
        icon={active === "cart" ? icons.cartActive : icons.cartInactive}
        active={active === "cart"}
        iconSize={{ width: 25, height: 25 }}
        onPress={() => active !== "cart" && router.replace("/cart")}
      />
      <TabItem
        label="마이페이지"
        icon={icons.user}
        active={active === "mypage"}
        iconSize={{ width: 30, height: 30 }}
        onPress={handleMyPage}
      />
    </View>
  );
}

function TabItem({
  label,
  icon,
  active,
  iconSize,
  onPress,
}: {
  label: string;
  icon: number;
  active?: boolean;
  iconSize: { width: number; height: number };
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!active }}
    >
      <View style={styles.iconBox}>
        <Image source={icon} style={iconSize} contentFit="contain" />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    paddingHorizontal: 35,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: Colors.white,
  },
  item: { width: 52, alignItems: "center", gap: 8 },
  iconBox: { height: 30, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: FontFamily.regular, fontSize: 12, color: "#bbbbbb" },
  labelActive: { color: Colors.primary },
});
