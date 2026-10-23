import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/ui/form-message';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { resendSignupEmail } from '@/features/auth/auth-service';
import { toAuthErrorMessage } from '@/features/auth/errors';
import { validateEmail } from '@/features/auth/validation';
import { useSubmitGuard } from '@/hooks/use-submit-guard';

/** Supabase 기본 설정상 같은 주소로 인증 메일은 60초에 한 번만 보낼 수 있어요. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * 회원가입 직후(이메일 인증 필요) 또는 "이메일 미인증" 로그인 실패 시 보여주는 화면.
 * 사용자가 메일의 링크를 누르면 auth/callback 으로 돌아와 자동으로 로그인됩니다.
 */
export default function VerifyEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const { submitting, run } = useSubmitGuard();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const emailInvalid = Boolean(validateEmail(email));

  const handleResend = () =>
    run(async () => {
      setMessage(null);
      try {
        await resendSignupEmail(email);
        setMessage({ tone: 'success', text: '인증 메일을 다시 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.' });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch (error) {
        setMessage({ tone: 'error', text: toAuthErrorMessage(error) });
      }
    });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          메일함을 확인해 주세요
        </Text>
        <Text style={styles.body}>
          {email ? <Text style={styles.email}>{email}</Text> : '입력하신 이메일'}
          {'\n'}으로 인증 링크를 보냈어요. 링크를 누르면 가입이 완료되고 앱으로 돌아와 자동으로
          로그인돼요.
        </Text>
        <Text style={styles.note}>
          다른 기기(PC 등)에서 링크를 열었다면 인증만 완료돼요. 이 경우 아래 버튼으로 로그인해 주세요.
        </Text>
      </View>

      <View style={styles.messages}>
        <FormMessage tone={message?.tone ?? 'success'} message={message?.text} />
      </View>

      <PrimaryButton
        title={cooldown > 0 ? `인증 메일 다시 보내기 (${cooldown}초)` : '인증 메일 다시 보내기'}
        loading={submitting}
        disabled={cooldown > 0 || emailInvalid}
        onPress={handleResend}
      />

      <Pressable
        accessibilityRole="link"
        style={styles.back}
        hitSlop={8}
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.backText}>로그인 화면으로 돌아가기</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 61,
    gap: 12,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.title,
    fontWeight: '600',
    color: Colors.black,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.5,
    color: Colors.black,
  },
  email: {
    fontWeight: '700',
    color: Colors.primary,
  },
  note: {
    fontSize: FontSize.label,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  messages: {
    marginVertical: 32,
  },
  back: {
    marginTop: 20,
    alignSelf: 'center',
  },
  backText: {
    fontSize: FontSize.label,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
