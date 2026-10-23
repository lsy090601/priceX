import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { readSupabaseEnv } from './env';
import { authStorage } from './storage';

export const supabaseEnv = readSupabaseEnv();

/**
 * 환경 변수가 올바르지 않으면 null 입니다.
 * 이 경우 앱은 크래시 대신 "설정 오류" 화면을 보여줍니다 (src/app/_layout.tsx).
 */
export const supabase: SupabaseClient | null = supabaseEnv.ok
  ? createClient(supabaseEnv.url, supabaseEnv.publishableKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        // 앱에는 URL 이 없으므로 자동 감지를 끄고, 딥링크(auth/callback)에서 직접 처리합니다.
        detectSessionInUrl: false,
        // 이메일 인증 링크 / 소셜 로그인 모두 ?code= 를 돌려받아 세션으로 교환하는 PKCE 방식
        flowType: 'pkce',
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      supabaseEnv.ok ? 'Supabase 클라이언트를 만들 수 없어요.' : supabaseEnv.problems.join('\n'),
    );
  }
  return supabase;
}
