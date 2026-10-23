import { isAuthError } from '@supabase/supabase-js';

/** Supabase Auth 오류 코드 → 사용자에게 보여줄 한국어 메시지 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않아요.',
  email_not_confirmed: '이메일 인증이 아직 완료되지 않았어요. 메일함을 확인해 주세요.',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  email_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
  weak_password: '비밀번호가 너무 약해요. 더 길고 복잡하게 만들어 주세요.',
  email_address_invalid: '사용할 수 없는 이메일 주소예요.',
  over_email_send_rate_limit: '메일 발송 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  over_request_rate_limit: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  signup_disabled: '현재 회원가입이 비활성화되어 있어요.',
  email_provider_disabled: '이메일 로그인이 비활성화되어 있어요. Supabase 설정을 확인해 주세요.',
  provider_disabled: '해당 소셜 로그인이 아직 설정되지 않았어요.',
  flow_state_not_found: '인증 요청이 만료되었어요. 다시 시도해 주세요.',
  flow_state_expired: '인증 요청이 만료되었어요. 다시 시도해 주세요.',
  otp_expired: '인증 링크가 만료되었어요. 인증 메일을 다시 받아 주세요.',
  session_not_found: '로그인 정보가 만료되었어요. 다시 로그인해 주세요.',
};

export function getAuthErrorCode(error: unknown): string | undefined {
  return isAuthError(error) ? error.code : undefined;
}

export function toAuthErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
    if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
      return '네트워크에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
    }
    return error.message || '알 수 없는 오류가 발생했어요.';
  }
  if (error instanceof Error) {
    if (/network|fetch/i.test(error.message)) {
      return '네트워크에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
    }
    return error.message;
  }
  return '알 수 없는 오류가 발생했어요.';
}
