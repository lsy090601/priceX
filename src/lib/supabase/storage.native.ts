// iOS / Android: expo-sqlite 가 제공하는 localStorage 에 세션을 저장합니다.
// (Expo 공식 Supabase 가이드 방식)
import 'expo-sqlite/localStorage/install';

export const authStorage = globalThis.localStorage;
