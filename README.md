# PriceX

공공 물가 데이터와 AI로 "지금 이 가격, 사도 될까?"에 답해주는 스마트 장보기 앱입니다.

- 앱: Expo(React Native) · TypeScript · Expo Router
- 백엔드: Supabase(Auth, 가격 DB)
- 가격 데이터: 한국소비자원 참가격 월간 공개 자료

## 앱 시작하기

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# .env.local에 Supabase URL과 publishable 키 입력
npx expo start -c
```

환경 변수가 비어 있으면 앱에 "Supabase 설정이 필요해요" 화면이 표시됩니다. 환경 변수를 바꾼 뒤에는 `-c` 옵션으로 캐시를 지우고 다시 실행하세요.

| 명령 | 설명 |
| --- | --- |
| `npx expo start` | 개발 서버 실행 |
| `npx tsc --noEmit` | 타입 검사 |
| `npm run lint` | 린트 |

## 참가격 API와 데이터 수집

1. [공공데이터포털의 한국소비자원 생필품 가격 정보](https://www.data.go.kr/data/15083256/fileData.do)에서 활용신청 후 일반 인증키를 발급받습니다.
2. `.env.example`을 `.env`로 복사하고 서버 전용 값을 입력합니다.
3. Python 3.10 이상에서 연결과 수집을 실행합니다.

```powershell
python scripts/chamgage.py search 배추
python scripts/chamgage.py prices --product 배추 --date 2026-09-11
python scripts/sync_prices.py
python scripts/query_prices.py 배추
```

참가격은 실시간 매장 가격이 아니라 월간 공개 자료의 조사 시점 가격입니다. 화면에는 반드시 조사일을 함께 표시합니다. 서버 키는 React Native 앱에 포함하지 않습니다.

Supabase 테이블과 읽기 전용 검색 함수는 `supabase/migrations/`에 있습니다. 앱에서는 다음 RPC를 사용합니다.

- `search_price_products`: 상품 검색과 최신 조사일·최저가·최고가·평균가 조회
- `compare_product_prices`: 선택 상품의 최신 마트별 가격을 최저가순으로 조회

## 테스트

```powershell
python -m unittest discover -s tests -v
python scripts/test_price_rpc.py
npx tsc --noEmit
npm run lint
```

## 폴더 구조

```text
src/app/                    # Expo Router 화면
src/features/auth/          # 인증 로직
src/lib/supabase/           # Supabase 앱 클라이언트
src/components/ui/          # 공통 UI
pricex/                     # 참가격 Python 클라이언트
scripts/                    # 수집·조회·검증 스크립트
supabase/migrations/        # 적용된 가격 DB 마이그레이션
supabase/drafts/            # 실행 전 검토할 SQL 초안
```

## Supabase 인증 설정

1. Project Settings → API Keys에서 Project URL과 Publishable key를 `.env.local`에 입력합니다.
2. Authentication → Sign In / Providers → Email에서 이메일 확인을 켜고 최소 비밀번호 길이를 8자로 설정합니다.
3. Authentication → URL Configuration에 `pricex://**`와 개발용 `exp://**`를 추가합니다.
4. 실제 서비스 전에는 Authentication → Emails → SMTP Settings에서 자체 SMTP를 연결합니다.
5. 소셜 로그인 제공자 설정이 끝난 뒤 해당 `EXPO_PUBLIC_AUTH_*_ENABLED` 값을 `true`로 바꿉니다.

`supabase/drafts/001_profiles.sql`은 검토 후 적용해야 하며 아직 실행되지 않은 초안입니다.

## 자동 수집

`.github/workflows/sync-prices.yml`은 수동 실행과 매월 15일 오전 7시(한국 시간) 실행을 지원합니다. 저장소 Secrets에는 다음 값을 등록해야 합니다.

- `DATA_GO_KR_SERVICE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

현재 참가격 API 주소는 2026년 9월 자료에 고정되어 있으므로 새 월 자료가 발행되면 `CHAMGAGE_API_URL`을 갱신해야 합니다.

## AI 구매 조언

AI 조언은 `Expo 앱 → Supabase Edge Function → Gemini API` 순서로 호출합니다.
Gemini 키는 앱 환경 변수에 넣지 않고 Supabase 프로젝트의 Edge Function Secret으로 설정합니다.

```bash
npx supabase secrets set GEMINI_API_KEY=your_key GEMINI_MODEL=gemini-3.8-flash
npx supabase functions deploy purchase-advice
```

함수가 배포되지 않았거나 Gemini 호출에 실패하면 앱은 계산 기반 조언을 대신 표시합니다. AI는 서버에서 계산한 가격·비율·판매점·절약액을 전달받아 설명만 작성합니다.

## 가격 이력과 예측

상품별 평균가격 이력은 매장별 최신 가격과 분리해 `product_price_history`에 저장합니다.
공공데이터포털에서 받은 CP949 CSV는 다음 명령으로 검증한 뒤 중복 없이 업로드합니다.

```bash
python scripts/import_price_history.py "path/to/한국소비자원_생필품 가격 정보 상품별 통계_20241220.csv"
```

초기 예측은 최근 3개월의 월평균 변화량을 사용하며, 월이 연속되지 않으면 예측하지 않습니다.
예측 결과는 최대 ±20%로 제한하고 데이터 개수에 따라 신뢰도를 표시합니다. LSTM은 24개월 이상의
연속 자료가 있고 이동평균 기준선보다 검증 오차가 10% 이상 낮을 때만 도입합니다.
