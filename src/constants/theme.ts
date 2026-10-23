/**
 * PRICEX 디자인 토큰 (Figma: 숦챌 / Page 1 기준)
 * 화면에서 색상·크기를 직접 쓰지 말고 이 파일의 값을 사용하세요.
 */

export const Colors = {
  primary: '#007529', // 로고, 주요 버튼
  primaryPressed: '#005c20',
  white: '#ffffff',
  black: '#000000',
  text: '#000000',
  textMuted: '#9d9d9d', // 로그인 화면 보조 텍스트·placeholder
  textSubtle: '#b5b5b5', // 회원가입 라벨·placeholder
  border: '#9d9d9d', // 로그인 입력창 테두리
  borderLight: '#b5b5b5', // 회원가입 입력창 테두리
  kakao: '#ffe812',
  error: '#d93025',
  errorBackground: '#fdecea',
  success: '#007529',
  successBackground: '#e6f2ea',
  disabled: '#c8c8c8',
} as const;

export const Radius = {
  input: 10,
  inputSmall: 7,
  button: 10,
  pill: 1000,
} as const;

export const FontSize = {
  caption: 12,
  label: 14,
  body: 16,
  title: 24,
  logo: 30,
} as const;

/**
 * Figma는 Pretendard / Gmarket Sans를 사용합니다.
 * 폰트 파일을 assets/fonts에 추가하고 expo-font로 로드한 뒤 여기 이름만 바꾸면 전체에 적용됩니다.
 * (지금은 시스템 기본 폰트 사용)
 */
export const FontFamily = {
  regular: undefined as string | undefined,
  medium: undefined as string | undefined,
  semiBold: undefined as string | undefined,
  logo: undefined as string | undefined,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
  screenX: 32, // 화면 좌우 여백 (393 - 329) / 2
} as const;
