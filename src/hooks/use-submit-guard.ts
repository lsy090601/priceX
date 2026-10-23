import { useCallback, useRef, useState } from 'react';

/**
 * 중복 제출 방지.
 * state 는 리렌더 전까지 반영되지 않으므로, 버튼 연타를 막기 위해 ref 로 한 번 더 잠급니다.
 */
export function useSubmitGuard() {
  const lock = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setSubmitting(true);
    try {
      return await task();
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
