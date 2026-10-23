# priceX
공공 물가 데이터와 AI로 "지금 이 가격, 사도 될까?"에 답해주는 스마트 장보기 앱

- 앱: Expo (React Native) · TypeScript · Expo Router
- 백엔드: Supabase (Auth, 이후 DB)
- 디자인: Figma `숦챌` 파일 (iPhone 15 Pro 393×852 기준)

## 시작하기

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# .env.local 에 Supabase URL / publishable 키 입력
npx expo start -c
```

휴대폰의 **Expo Go** 앱으로 QR 코드를 찍으면 실행됩니다.
환경 변수가 비어 있으면 앱이 꺼지지 않고 "Supabase 설정이 필요해요" 화면에 원인을 보여줍니다.
`.env.local` 을 고친 뒤에는 꼭 `-c` (캐시 삭제) 옵션으로 다시 실행하세요.

| 명령 | 설명 |
| --- | --- |
| `npx expo start` | 개발 서버 |
| `npx tsc --noEmit` | 타입 검사 |
| `npm run lint` | 린트 |

## 폴더 구조

```
src/
  app/                    # 화면 (파일 = 라우트)
    _layout.tsx           # AuthProvider, 로그인 여부에 따른 화면 분기(Stack.Protected)
    (auth)/               # 로그아웃 상태에서만: login, signup, verify-email
    (app)/                # 로그인 상태에서만: 홈 …
    auth/callback.tsx     # 이메일 인증 / 소셜 로그인 딥링크 처리
  features/auth/          # 인증 로직 (service, provider, 검증, 오류 메시지)
  lib/supabase/           # Supabase 클라이언트, 환경 변수 검증, 세션 저장소
  components/ui/          # 공통 UI (TextField, PrimaryButton …)
  constants/theme.ts      # 디자인 토큰 (Figma 색상·크기)
supabase/drafts/          # 실행 전 검토용 SQL 초안
```

## Supabase 대시보드에서 직접 해야 할 설정

### 1. API 키 (필수)
Project Settings → API Keys 에서 **Project URL** 과 **Publishable key** 를 `.env.local` 에 입력.
**secret / service_role 키는 앱에 절대 넣지 마세요.** (넣으면 앱이 설정 오류 화면을 띄웁니다)

### 2. 이메일 인증 (필수)
Authentication → Sign In / Providers → **Email**
- `Confirm email` 켜기 (권장) — 켜져 있으면 가입 직후 세션이 없고 "메일함 확인" 화면으로 이동합니다.
- `Minimum password length` 를 **8** 이상으로 (앱 검증 기준과 맞추기)

### 3. Redirect URLs (필수 — 인증 링크가 앱으로 돌아오게)
Authentication → URL Configuration → **Redirect URLs** 에 추가:
- `pricex://**` (개발 빌드 / 실제 앱)
- `exp://**` (Expo Go 개발용 — 배포 전에 제거)

### 4. 이메일 발송 한도
기본 SMTP 는 시간당 발송 수가 매우 적고 테스트용입니다. 실제 사용자 받기 전에
Authentication → Emails → SMTP Settings 에서 자체 SMTP(Resend, SES 등)를 연결하세요.

### 5. 소셜 로그인 (다음 단계)
- **Google**: Google Cloud Console 에서 OAuth 클라이언트 생성 → Supabase Providers → Google 에 Client ID/Secret 입력
- **Kakao**: Kakao Developers 앱 생성 → Redirect URI 에 `https://<프로젝트>.supabase.co/auth/v1/callback` 등록 → Supabase Providers → Kakao 에 REST API 키 / Client Secret 입력.
  카카오는 이메일(account_email) 동의 항목이 비즈 앱 전환을 요구할 수 있어요.
- 설정이 끝나면 `.env.local` 에서 `EXPO_PUBLIC_AUTH_GOOGLE_ENABLED=true` / `EXPO_PUBLIC_AUTH_KAKAO_ENABLED=true`.
  그 전까지 버튼은 "준비 중" 안내만 표시합니다.
- 소셜 로그인은 Expo Go 보다 개발 빌드(`npx expo run:android`)에서 테스트하는 걸 권장합니다.

### 6. 프로필 테이블 (검토 후)
`supabase/drafts/001_profiles.sql` 을 검토한 뒤 SQL Editor 에서 실행하세요. 아직 실행되지 않은 상태입니다.
