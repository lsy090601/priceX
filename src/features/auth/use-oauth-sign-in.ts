import { useState } from 'react';

import { useSubmitGuard } from '@/hooks/use-submit-guard';

import { OAUTH_ENABLED, signInWithOAuth, type OAuthProvider } from './auth-service';
import { toAuthErrorMessage } from './errors';

const LABEL: Record<OAuthProvider, string> = { google: 'Google', kakao: '카카오' };

/**
 * 소셜 로그인 버튼 핸들러.
 * 제공자 설정이 끝나지 않았으면(OAUTH_ENABLED=false) 로그인 시도 없이 안내만 합니다.
 * 성공 표시는 실제로 세션을 받은 경우에만 — 화면 전환은 AuthProvider 가 처리합니다.
 */
export function useOAuthSignIn() {
  const { submitting, run } = useSubmitGuard();
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  const start = (provider: OAuthProvider) => {
    setMessage(null);
    if (!OAUTH_ENABLED[provider]) {
      setMessage({ tone: 'info', text: `${LABEL[provider]} 로그인은 준비 중이에요. 이메일로 로그인해 주세요.` });
      return;
    }
    void run(async () => {
      try {
        const result = await signInWithOAuth(provider);
        if (result.kind === 'cancelled') {
          setMessage({ tone: 'info', text: `${LABEL[provider]} 로그인이 취소되었어요.` });
        }
      } catch (error) {
        setMessage({ tone: 'error', text: toAuthErrorMessage(error) });
      }
    });
  };

  return { start, submitting, message };
}
