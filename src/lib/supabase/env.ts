/**
 * Supabase 환경 변수 읽기 + 검증.
 *
 * Expo는 `process.env.EXPO_PUBLIC_*` 를 "그대로 적힌 형태"로만 빌드 시 치환합니다.
 * 구조 분해(const { X } = process.env)나 동적 키 접근은 동작하지 않으니 이 형태를 유지하세요.
 *
 * ⚠️ 앱 번들에 포함되는 값이므로 publishable(anon) 키만 넣어야 합니다.
 *    service_role / secret 키는 절대 넣지 마세요.
 */

export type SupabaseEnv =
  | { ok: true; url: string; publishableKey: string }
  | { ok: false; problems: string[] };

function looksLikeSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;

  // 레거시 JWT 형태 키: payload의 role 이 service_role 인지 확인
  const parts = key.split('.');
  if (parts.length === 3 && typeof globalThis.atob === 'function') {
    try {
      const payload = JSON.parse(
        globalThis.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as { role?: string };
      return payload.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

export function readSupabaseEnv(): SupabaseEnv {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const problems: string[] = [];

  if (!url) {
    problems.push('EXPO_PUBLIC_SUPABASE_URL 값이 비어 있어요.');
  } else if (!/^https?:\/\/.+/.test(url)) {
    problems.push('EXPO_PUBLIC_SUPABASE_URL 은 https:// 로 시작하는 프로젝트 URL이어야 해요.');
  }

  if (!publishableKey) {
    problems.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY 값이 비어 있어요.');
  } else if (looksLikeSecretKey(publishableKey)) {
    problems.push(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY 에 secret / service_role 키가 들어 있어요. 앱에는 publishable 키만 넣어주세요.',
    );
  }

  if (problems.length > 0) {
    problems.push('프로젝트 루트의 .env.local 을 확인한 뒤 `npx expo start -c` 로 다시 실행해 주세요.');
    return { ok: false, problems };
  }
  return { ok: true, url, publishableKey };
}
