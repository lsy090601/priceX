import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { requireSupabase } from '@/lib/supabase/client';

import { getAuthRedirectUrl, readAuthParams } from './redirect';
import { normalizeEmail } from './validation';

/**
 * Supabase Auth 호출을 모아둔 곳. 화면에서는 이 함수들만 사용합니다.
 * 비밀번호는 Supabase Auth 가 해시해서 auth.users 에 보관하며, 앱 DB 에는 저장하지 않습니다.
 */

// ───────────────────────── 이메일 / 비밀번호 ─────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
  return data.session;
}

export type SignUpResult =
  /** 이메일 인증이 꺼져 있어 바로 로그인됨 */
  | { kind: 'signedIn'; session: Session }
  /** 이메일 인증 필요 — 세션 없음 */
  | { kind: 'confirmationRequired'; email: string }
  /** 이미 가입된 이메일 (Supabase 는 보안상 오류 대신 빈 identities 를 돌려줌) */
  | { kind: 'alreadyRegistered'; email: string };

export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const normalized = normalizeEmail(email);
  const { data, error } = await requireSupabase().auth.signUp({
    email: normalized,
    password,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;

  if (data.session) return { kind: 'signedIn', session: data.session };
  if (data.user && data.user.identities?.length === 0) {
    return { kind: 'alreadyRegistered', email: normalized };
  }
  return { kind: 'confirmationRequired', email: normalized };
}

export async function resendSignupEmail(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resend({
    type: 'signup',
    email: normalizeEmail(email),
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  // 네트워크가 끊겨 서버 로그아웃이 실패해도 기기의 세션은 지워지도록 local scope 사용
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/** 서버에 다시 확인한 최신 사용자 정보 (세션에 저장된 값보다 신뢰도가 높음) */
export async function fetchCurrentUser(): Promise<User | null> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  return data.user;
}

// ───────────────────────── 딥링크 콜백 ─────────────────────────

/**
 * 이메일 인증 링크 / 소셜 로그인 후 돌아온 URL 을 세션으로 교환합니다.
 * PKCE 방식: ?code=... 를 exchangeCodeForSession 으로 교환.
 */
export async function completeAuthFromUrl(url: string): Promise<Session> {
  const params = readAuthParams(url);
  if (params.error_description || params.error) {
    throw new Error(decodeURIComponent(params.error_description || params.error).replace(/\+/g, ' '));
  }
  if (!params.code) {
    throw new Error('인증 코드가 없어요. 링크가 올바른지 확인해 주세요.');
  }
  const { data, error } = await requireSupabase().auth.exchangeCodeForSession(params.code);
  if (error) throw error;
  return data.session;
}

// ───────────────────────── 소셜 로그인 (Google / Kakao) ─────────────────────────

export type OAuthProvider = 'google' | 'kakao';

/**
 * Supabase 대시보드에서 제공자 설정을 끝낸 뒤 .env.local 에서 true 로 켜세요.
 * 꺼져 있으면 버튼은 보이지만 "준비 중" 안내만 표시합니다.
 */
export const OAUTH_ENABLED: Record<OAuthProvider, boolean> = {
  google: process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED === 'true',
  kakao: process.env.EXPO_PUBLIC_AUTH_KAKAO_ENABLED === 'true',
};

export type OAuthResult = { kind: 'signedIn'; session: Session } | { kind: 'cancelled' };

export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthResult> {
  if (!OAUTH_ENABLED[provider]) {
    throw new Error('아직 준비 중인 로그인 방식이에요.');
  }
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { kind: 'cancelled' };

  const session = await completeAuthFromUrl(result.url);
  return { kind: 'signedIn', session };
}
