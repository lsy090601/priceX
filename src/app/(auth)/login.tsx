import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/ui/form-message';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextInputRef } from '@/components/ui/text-field';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { signInWithEmail } from '@/features/auth/auth-service';
import { SocialLoginButtons } from '@/features/auth/components/social-login-buttons';
import { getAuthErrorCode, toAuthErrorMessage } from '@/features/auth/errors';
import { useOAuthSignIn } from '@/features/auth/use-oauth-sign-in';
import { normalizeEmail, validateEmail, validatePasswordPresent } from '@/features/auth/validation';
import { useSubmitGuard } from '@/hooks/use-submit-guard';

/** Figma 3:8 — 로그인 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const passwordRef = useRef<TextInputRef>(null);

  const { submitting, run } = useSubmitGuard();
  const oauth = useOAuthSignIn();
  const busy = submitting || oauth.submitting;

  const handleSubmit = () =>
    run(async () => {
      setFormError(null);
      setNeedsConfirmation(false);
      const errors = {
        email: validateEmail(email),
        password: validatePasswordPresent(password),
      };
      setFieldErrors(errors);
      if (errors.email || errors.password) return;

      try {
        await signInWithEmail(email, password);
        // 성공 시 AuthProvider 가 상태를 바꾸고, 보호 라우트가 홈으로 이동시킵니다.
      } catch (error) {
        setFormError(toAuthErrorMessage(error));
        if (getAuthErrorCode(error) === 'email_not_confirmed') setNeedsConfirmation(true);
      }
    });

  return (
    <Screen>
      <View style={styles.brand}>
        <Text style={styles.logo} accessibilityRole="header">
          PRICEX
        </Text>
        <Text style={styles.tagline}>가격을 비교하고, 소비를 바꾸다.</Text>
      </View>

      <View style={styles.fields}>
        <TextField
          placeholder="이메일을 입력해주세요"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!busy}
        />
        <TextField
          ref={passwordRef}
          placeholder="비밀번호를 입력해주세요"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!busy}
        />
      </View>

      <View style={styles.links}>
        <Link href="/signup" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} disabled={busy}>
            <Text style={styles.linkText}>회원가입</Text>
          </Pressable>
        </Link>
        <View style={styles.divider} />
        {/* TODO: 비밀번호 재설정 (resetPasswordForEmail) — 다음 단계에서 연결 */}
        <Text
          style={[styles.linkText, styles.linkDisabled]}
          accessibilityState={{ disabled: true }}
          accessibilityHint="준비 중인 기능이에요"
        >
          비밀번호 찾기
        </Text>
      </View>

      {formError ? (
        <View style={styles.messages}>
          <FormMessage tone="error" message={formError} />
          {needsConfirmation ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/verify-email', params: { email: normalizeEmail(email) } })
              }
            >
              <Text style={styles.inlineAction}>인증 메일 다시 받기</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <PrimaryButton
        title="로그인하기"
        loading={submitting}
        disabled={busy}
        onPress={handleSubmit}
        style={styles.submit}
      />

      <View style={styles.social}>
        <SocialLoginButtons onPress={oauth.start} disabled={busy} />
        {oauth.message ? (
          <View style={styles.oauthMessage}>
            <FormMessage tone={oauth.message.tone} message={oauth.message.text} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    marginTop: 92,
    alignItems: 'center',
    gap: 15,
  },
  logo: {
    fontFamily: FontFamily.logo,
    fontSize: FontSize.logo,
    fontWeight: '800',
    color: Colors.primary,
  },
  tagline: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.black,
  },
  fields: {
    marginTop: 89,
    gap: 16,
  },
  links: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  linkText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  divider: {
    width: 1,
    height: 13,
    backgroundColor: Colors.textMuted,
  },
  messages: {
    marginTop: 18,
    gap: 8,
  },
  submit: {
    marginTop: 18,
  },
  inlineAction: {
    fontSize: FontSize.label,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  social: {
    marginTop: 52,
    gap: 16,
  },
  oauthMessage: {
    marginTop: 4,
  },
});
