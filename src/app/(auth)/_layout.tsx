import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

// 로그아웃 상태로 들어오면 항상 로그인 화면이 첫 화면이 되도록 지정
export const unstable_settings = {
  anchor: 'login',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.white } }} />
  );
}
