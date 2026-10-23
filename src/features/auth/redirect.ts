import * as Linking from 'expo-linking';

/**
 * 이메일 인증 링크·소셜 로그인 후 앱으로 돌아올 주소.
 * - 개발 빌드/스토어 앱: pricex://auth/callback
 * - Expo Go: exp://<내 PC IP>:8081/--/auth/callback
 * 이 주소들을 Supabase > Authentication > URL Configuration > Redirect URLs 에 등록해야 합니다.
 */
export function getAuthRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/** 콜백 URL 의 query(?a=b) 와 hash(#a=b) 에서 값을 모두 읽어옵니다. */
export function readAuthParams(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => {
      result[key] = value;
    });
  }
  return result;
}
