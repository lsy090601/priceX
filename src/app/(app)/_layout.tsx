import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** 로그인 후 화면들 (홈, 검색, 장바구니 …) 은 이 그룹 안에 추가하세요. */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.white } }} />
  );
}
