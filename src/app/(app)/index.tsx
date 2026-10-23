import { Image } from "expo-image";
import { router } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontFamily } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-provider";
import { getProduceImage } from "@/features/produce/produce-images";

const icons = {
  search: require("../../../assets/images/home/search.png"),
  bell: require("../../../assets/images/home/bell.png"),
  chevronGray: require("../../../assets/images/home/chevron-gray.png"),
  chevronGreen: require("../../../assets/images/home/chevron-green.png"),
  arrowUp: require("../../../assets/images/home/arrow-up.png"),
  mascot: require("../../../assets/images/home/ai-mascot.png"),
  priceInput: require("../../../assets/images/home/price-input.png"),
  navHome: require("../../../assets/images/home/nav-home.png"),
  navChecklist: require("../../../assets/images/home/nav-checklist.png"),
  navCart: require("../../../assets/images/home/nav-cart.png"),
  navUser: require("../../../assets/images/home/nav-user.png"),
};

// TODO: 실제 가격 데이터 연동 전까지 쓰는 임시 데이터 (Figma 160:562)
const TODAY_ITEMS = [
  {
    id: "1",
    name: "딸기",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "2",
    name: "바나나",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "3",
    name: "감자",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "4",
    name: "포도",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "5",
    name: "레몬",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "6",
    name: "브로콜리",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "7",
    name: "상추",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "8",
    name: "양상추",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "9",
    name: "깻잎",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "10",
    name: "단감",
    price: "1,200원",
    change: "3%",
  },
  {
    id: "11",
    name: "용과",
    price: "1,200원",
    change: "3%",
  },
];

/**
 * Figma 160:562 — 홈 (임시 구현)
 * 하단 탭은 이 화면 안에 임시로 그렸습니다. 다른 탭 화면이 생기면 Tabs 레이아웃으로 옮기세요.
 */
export default function HomeScreen() {
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
            <Pressable style={styles.more} hitSlop={8}>
              <Text style={styles.moreText}>더보기</Text>
              <Image
                source={icons.chevronGray}
                style={styles.chevron}
                contentFit="contain"
              />
            </Pressable>
          </View>
          <Text style={styles.sectionDesc}>
            오늘의 인기 식자제 가격을 비교해보세요
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardScroll}
          contentContainerStyle={styles.cardList}
        >
          {TODAY_ITEMS.map((item) => (
            <View key={item.id} style={styles.priceCard}>
              <Image
                source={getProduceImage(item.name)}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={styles.priceInfo}>
                <View style={styles.nameBlock}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>{item.price}</Text>
                    <Text style={styles.avg}>평균</Text>
                  </View>
                </View>
                <View style={styles.changeRow}>
                  <Image
                    source={icons.arrowUp}
                    style={styles.arrow}
                    contentFit="contain"
                  />
                  <Text style={styles.changeText}>{item.change}</Text>
                </View>
              </View>
            </View>
          ))}
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
          <Pressable style={styles.inputButton} accessibilityRole="button">
            <Text style={styles.inputButtonText}>가격 입력하기</Text>
          </Pressable>
        </View>

        <Pressable style={styles.aiCard} accessibilityRole="button">
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
            <Text style={styles.aiDesc}>
              예상 지출 2,5000원, 최대 3,000원 절약 가능
            </Text>
          </View>
        </Pressable>

        {/* TODO: 피그마에 예측 화면 입구가 정해지면 그 위치로 옮기기 */}
        <Pressable
          style={styles.forecastLink}
          onPress={() => router.push("/forecast")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.aiLinkText}>가격 예측 보기</Text>
          <Image
            source={icons.chevronGreen}
            style={styles.chevron}
            contentFit="contain"
          />
        </Pressable>
      </ScrollView>

      <View
        style={[
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 18 },
        ]}
      >
        <TabItem
          label="홈"
          icon={icons.navHome}
          active
          iconSize={{ width: 32, height: 30 }}
        />
        <TabItem
          label="체크리스트"
          icon={icons.navChecklist}
          iconSize={{ width: 30, height: 30 }}
        />
        <TabItem
          label="장바구니"
          icon={icons.navCart}
          iconSize={{ width: 25, height: 25 }}
        />
        <TabItem
          label="마이페이지"
          icon={icons.navUser}
          iconSize={{ width: 30, height: 30 }}
          onPress={handleMyPage}
        />
      </View>
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
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!active }}
    >
      <View style={styles.tabIconBox}>
        <Image source={icon} style={iconSize} contentFit="contain" />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
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
  priceInfo: { width: 90, gap: 16 },
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
  changeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#ff3333",
  },

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
  forecastLink: {
    marginTop: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  aiDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "#757575",
    width: 186,
  },

  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    paddingHorizontal: 35,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: Colors.white,
  },
  tabItem: { width: 52, alignItems: "center", gap: 8 },
  tabIconBox: { height: 30, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: "#bbbbbb" },
  tabLabelActive: { color: Colors.primary },
});
