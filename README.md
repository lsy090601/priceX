# PriceX

공공 물가 데이터와 AI로 "지금 이 가격, 사도 될까?"에 답해주는 스마트 장보기 앱입니다.

## 참가격 API 시작하기

1. [공공데이터포털의 최신 한국소비자원 생필품 가격 정보](https://www.data.go.kr/data/15083256/fileData.do)에서 `오픈 API` 탭의 활용신청을 누르고 일반 인증키(Decoding)를 발급받습니다.
2. `.env.example`을 복사해 `.env`를 만들고 `DATA_GO_KR_SERVICE_KEY`에 인증키를 입력합니다. 인증키는 `.env`나 GitHub Actions Secret에만 저장하고 커밋하지 않습니다.
3. Python 3.10 이상에서 아래 명령으로 연결을 확인합니다.

```powershell
Copy-Item .env.example .env
# .env의 DATA_GO_KR_SERVICE_KEY 값을 입력한 다음 실행
python scripts/chamgage.py search 배추
python scripts/chamgage.py prices --product 배추 --date 2026-09-11
```

지원 명령은 다음과 같습니다.

- `search 검색어 [--limit 개수]`: 상품명으로 가격 데이터 검색
- `prices [--product 상품명] [--date YYYY-MM-DD] [--store 판매점]`: 상품·조사일·판매점 조건 조회

API 원본 JSON의 한글 필드는 앱에서 사용하기 쉬운 영문 `snake_case` 구조로 변환됩니다. 참가격 조사는 실시간 매장 가격이 아니라 월간 공개 자료의 조사 시점 가격입니다.

테스트는 외부 API나 인증키 없이 실행됩니다.

```powershell
python -m unittest discover -s tests -v
```

## Supabase 저장 및 조회

`.env`에 `SUPABASE_URL`과 서버 전용 `SUPABASE_SECRET_KEY`를 설정합니다.
테이블 정의와 서버 권한 SQL은 `supabase/migrations/`에 있습니다.

```powershell
# 전체 페이지 수집 (반복 실행해도 동일 상품·판매점·조사일은 갱신)
python scripts/sync_prices.py
# 일부만 테스트
python scripts/sync_prices.py --product 배추 --pages 1 --page-size 100
# 장애 시 해당 페이지부터 재개 (페이지 크기를 동일하게 유지)
python scripts/sync_prices.py --start-page 50
# DB의 최신 조사일 기준 상품별 매장 가격과 평균 비교
python scripts/query_prices.py 배추
```

평균은 같은 상품명·용량과 같은 조사일끼리만 계산합니다. 검색어에 김치와 생배추가
함께 검색돼도 서로 다른 상품으로 비교합니다. 원본에 업태 코드가 없어 매장 이름으로
전통시장·마트를 임의 분류하지 않습니다.

## 자동 수집

`.github/workflows/sync-prices.yml`은 수동 실행과 매월 15일 오전 7시(한국 시간) 실행을
지원합니다. GitHub Actions를 활성화하려면 저장소 Secrets에 아래 값을 등록해야 합니다.

- `DATA_GO_KR_SERVICE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

`CHAMGAGE_API_URL`은 저장소 Variables로 변경할 수 있습니다. 현재 주소는 2026년 9월
자료의 고정 주소이므로 새로운 월 자료가 발행되면 URL을 확인해 변경해야 합니다.
일정 실행만으로 새 데이터셋 주소가 자동 발견되지는 않습니다.

서버 키는 React Native에 포함하지 않습니다. 현재 RLS 정책은 일반 앱 조회를 허용하지
않으므로 앱 인증 방식이 확정되면 조회 API 또는 읽기 정책을 별도로 연결해야 합니다.
