import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { supabaseEnv } from '@/lib/supabase/client';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'misconfigured') return <ConfigErrorScreen />;
  if (status === 'loading') return <LoadingScreen />;

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.white } }}>
      {/* 로그인한 사용자만 */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* 로그인하지 않은 사용자만 */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* 이메일 인증 링크 / 소셜 로그인 딥링크는 상태와 관계없이 열려야 함 */}
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.center} accessibilityLabel="로그인 상태 확인 중">
      <Text style={styles.logo}>PRICEX</Text>
      <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

function ConfigErrorScreen() {
  const problems = supabaseEnv.ok ? [] : supabaseEnv.problems;
  return (
    <View style={[styles.center, { paddingHorizontal: 32 }]}>
      <Text style={styles.errorTitle}>Supabase 설정이 필요해요</Text>
      {problems.map((p) => (
        <Text key={p} style={styles.errorText}>
          • {p}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  logo: {
    fontFamily: FontFamily.logo,
    fontSize: FontSize.logo,
    fontWeight: '800',
    color: Colors.primary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  errorText: {
    alignSelf: 'stretch',
    fontSize: FontSize.label,
    lineHeight: 22,
    color: Colors.error,
  },
});
