import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/ui/form-message';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { requireSupabase } from '@/lib/supabase/client';
import { toAuthErrorMessage } from '@/features/auth/errors';

/**
 * 딥링크: pricex://auth/callback?code=...
 * 이메일 인증 링크(또는 소셜 로그인) 에서 돌아왔을 때 code 를 세션으로 교환합니다.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      const supabase = requireSupabase();
      try {
        if (params.error_description || params.error) {
          throw new Error(params.error_description || params.error);
        }
        if (!params.code) throw new Error('인증 코드가 없어요. 링크가 올바른지 확인해 주세요.');

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) throw exchangeError;
        router.replace('/');
      } catch (e) {
        // 소셜 로그인은 WebBrowser 쪽에서 이미 교환했을 수 있음 → 세션이 있으면 성공으로 간주
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace('/');
          return;
        }
        setError(
          `${toAuthErrorMessage(e)}\n\n이메일 인증 링크였다면 인증 자체는 완료됐을 수 있어요. 로그인을 시도해 주세요.`,
        );
      }
    })();
  }, [params.code, params.error, params.error_description]);

  if (error) {
    return (
      <View style={styles.container}>
        <FormMessage tone="error" message={error} />
        <View style={{ height: 24 }} />
        <PrimaryButton title="로그인 화면으로" onPress={() => router.replace('/login')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.center]}>
      <ActivityIndicator color={Colors.primary} />
      <Text style={styles.text}>인증 정보를 확인하고 있어요…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenX,
    backgroundColor: Colors.white,
  },
  center: {
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
  },
});
