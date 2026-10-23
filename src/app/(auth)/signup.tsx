import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormMessage } from '@/components/ui/form-message';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextInputRef } from '@/components/ui/text-field';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { signUpWithEmail } from '@/features/auth/auth-service';
import { toAuthErrorMessage } from '@/features/auth/errors';
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirm,
} from '@/features/auth/validation';
import { useSubmitGuard } from '@/hooks/use-submit-guard';

type FieldErrors = { email?: string; password?: string; confirm?: string };

/**
 * Figma 109:567 — 회원가입 (이메일 / 비밀번호 / 비밀번호 확인)
 * Figma 109:687 (이름·지역) 단계는 profiles 테이블을 만든 뒤 이어서 붙일 예정입니다.
 */
export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const passwordRef = useRef<TextInputRef>(null);
  const confirmRef = useRef<TextInputRef>(null);
  const { submitting, run } = useSubmitGuard();

  const handleSubmit = () =>
    run(async () => {
      setFormError(null);
      setAlreadyRegistered(false);
      const next: FieldErrors = {
        email: validateEmail(email),
        password: validateNewPassword(password),
        confirm: validatePasswordConfirm(password, confirm),
      };
      setErrors(next);
      if (next.email || next.password || next.confirm) return;

      try {
        const result = await signUpWithEmail(email, password);
        switch (result.kind) {
          case 'confirmationRequired':
            router.replace({ pathname: '/verify-email', params: { email: result.email } });
            break;
          case 'alreadyRegistered':
            setAlreadyRegistered(true);
            setFormError('이미 가입된 이메일이에요. 로그인해 주세요.');
            break;
          case 'signedIn':
            // 이메일 인증이 꺼진 프로젝트: AuthProvider 가 홈으로 이동시킵니다.
            break;
        }
      } catch (error) {
        setFormError(toAuthErrorMessage(error));
      }
    });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          안녕하세요!
        </Text>
        <Text style={styles.subtitle} lineBreakStrategyIOS="hangul-word">개인정보는 타인에게 공개 되지 않고 안전하게 보관됩니다.</Text>
      </View>

      <View style={styles.fields}>
        <TextField
          variant="form"
          label="이메일"
          placeholder="이메일을 적어주세요"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
        />
        <TextField
          ref={passwordRef}
          variant="form"
          label="비밀번호"
          placeholder="비밀번호를 적어주세요"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!submitting}
        />
        {!errors.password ? (
          <Text style={styles.hint}>영문과 숫자를 포함해 {PASSWORD_MIN_LENGTH}자 이상</Text>
        ) : null}
        <TextField
          ref={confirmRef}
          variant="form"
          label="비밀번호 확인"
          placeholder="비밀번호를 한번 더 적어주세요"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
        />
      </View>

      <View style={styles.messages}>
        <FormMessage tone="error" message={formError} />
        {alreadyRegistered ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace('/login')}>
            <Text style={styles.inlineAction}>로그인하러 가기</Text>
          </Pressable>
        ) : null}
      </View>

      <PrimaryButton title="회원가입" loading={submitting} onPress={handleSubmit} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>이미 계정이 있나요?</Text>
        <Link href="/login" replace asChild>
          <Pressable accessibilityRole="link" hitSlop={8} disabled={submitting}>
            <Text style={styles.footerLink}>로그인</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 61, // Figma top 120 - 상태바(약 59)
    width: 302,
    gap: 10,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.title,
    fontWeight: '600',
    color: Colors.black,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.4,
    color: Colors.black,
    width: 285,
  },
  fields: {
    marginTop: 20,
    gap: 10,
  },
  hint: {
    marginTop: -4,
    fontSize: FontSize.caption,
    color: Colors.textSubtle,
  },
  messages: {
    marginTop: 24,
    marginBottom: 24,
    gap: 8,
  },
  inlineAction: {
    fontSize: FontSize.label,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
