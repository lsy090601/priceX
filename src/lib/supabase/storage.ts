// Web: 브라우저의 localStorage 를 사용합니다.
// (서버 환경처럼 window 가 없으면 undefined → supabase-js 가 메모리 저장소로 대체)
export const authStorage: Storage | undefined =
  typeof window !== 'undefined' ? window.localStorage : undefined;
