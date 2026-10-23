import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';

import { fetchCurrentUser, signOut as signOutRequest } from './auth-service';

export type AuthStatus =
  | 'loading' // 저장된 세션 확인 중
  | 'signedIn'
  | 'signedOut'
  | 'misconfigured'; // 환경 변수 누락

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  /** 서버에서 사용자 정보를 다시 불러옵니다 (예: 프로필 수정 후) */
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'misconfigured');

  // 1) 인증 상태 구독 — 앱 시작 시 저장된 세션 복원(INITIAL_SESSION)도 여기로 들어옵니다.
  useEffect(() => {
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // 주의: 이 콜백 안에서 supabase 함수를 await 하면 교착될 수 있어 상태만 갱신합니다.
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setStatus(nextSession ? 'signedIn' : 'signedOut');
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // 2) 앱이 포그라운드일 때만 토큰 자동 갱신 (Supabase 권장 방식, 네이티브 전용)
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    const client = supabase;

    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });

    return () => {
      subscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    // SIGNED_OUT 이벤트로도 갱신되지만, 즉시 화면이 바뀌도록 직접 반영
    setSession(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await fetchCurrentUser();
    setUser(fresh);
    return fresh;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, user, signOut, refreshUser }),
    [status, session, user, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 <AuthProvider> 안에서만 사용할 수 있어요.');
  return ctx;
}
