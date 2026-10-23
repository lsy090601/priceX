import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/ui/form-message';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { Colors, FontSize, Radius } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { toAuthErrorMessage } from '@/features/auth/errors';
import { useSubmitGuard } from '@/hooks/use-submit-guard';

/**
 * 임시 홈 — 인증 동작 확인용.
 * Figma 홈(21:199) 화면으로 교체할 예정입니다.
 */
export default function HomeScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const logout = useSubmitGuard();
  const refresh = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () =>
    logout.run(async () => {
      setError(null);
      try {
        await signOut();
      } catch (e) {
        setError(toAuthErrorMessage(e));
      }
    });

  const handleRefresh = () =>
    refresh.run(async () => {
      setError(null);
      try {
        await refreshUser();
      } catch (e) {
        setError(toAuthErrorMessage(e));
      }
    });

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.logo}>PRICEX</Text>
      <Text style={styles.title}>로그인되었어요 👋</Text>

      <View style={styles.card}>
        <Row label="이메일" value={user?.email ?? '-'} />
        <Row label="이메일 인증" value={user?.email_confirmed_at ? '완료' : '미완료'} />
        <Row label="로그인 방식" value={user?.app_metadata.provider ?? '-'} />
        <Row label="사용자 ID" value={user?.id ?? '-'} />
      </View>

      <FormMessage tone="error" message={error} />

      <View style={styles.actions}>
        <PrimaryButton title="가격 예측 보기" onPress={() => router.push('/forecast')} />
        <PrimaryButton title="내 정보 새로고침" loading={refresh.submitting} onPress={handleRefresh} />
        <PrimaryButton
          title="로그아웃"
          loading={logout.submitting}
          onPress={handleLogout}
          style={styles.logout}
        />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 40,
    gap: 20,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '600',
    color: Colors.text,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.input,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: FontSize.label,
    color: Colors.text,
  },
  actions: {
    gap: 12,
  },
  logout: {
    backgroundColor: '#555555',
  },
});
