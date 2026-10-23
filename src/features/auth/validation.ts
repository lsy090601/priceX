/**
 * 입력값 검증. 오류가 없으면 undefined 를 반환합니다.
 * PASSWORD_MIN_LENGTH 는 Supabase 대시보드 Auth > Providers > Email 의
 * "Minimum password length" 와 같거나 더 크게 맞춰 주세요.
 */
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return '이메일을 입력해 주세요.';
  if (!EMAIL_PATTERN.test(value)) return '올바른 이메일 형식이 아니에요.';
  return undefined;
}

/** 로그인용: 비어 있는지만 확인 */
export function validatePasswordPresent(password: string): string | undefined {
  return password ? undefined : '비밀번호를 입력해 주세요.';
}

/** 회원가입용: 길이 + 영문/숫자 포함 */
export function validateNewPassword(password: string): string | undefined {
  if (!password) return '비밀번호를 입력해 주세요.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return '비밀번호에 영문과 숫자를 모두 포함해 주세요.';
  }
  return undefined;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | undefined {
  if (!confirm) return '비밀번호를 한 번 더 입력해 주세요.';
  if (password !== confirm) return '비밀번호가 일치하지 않아요.';
  return undefined;
}
