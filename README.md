# PriceX

공공 물가 데이터와 AI로 "지금 이 가격, 사도 될까?"에 답해주는 스마트 장보기 앱입니다.

## 참가격 API 시작하기

1. [공공데이터포털의 최신 한국소비자원 생필품 가격 정보](https://www.data.go.kr/data/15083256/fileData.do)에서 `오픈 API` 탭의 활용신청을 누르고 일반 인증키(Decoding)를 발급받습니다.
2. `.env.example`을 복사해 `.env`를 만들고 `DATA_GO_KR_SERVICE_KEY`에 인증키를 입력합니다. 인증키는 `.env`나 GitHub Actions Secret에만 저장하고 커밋하지 않습니다.
3. Python 3.10 이상에서 아래 명령으로 연결을 확인합니다.

```powershell
Copy-Item .env.example .env
# .env의 PRICE_GOKR_SERVICE_KEY 값을 입력한 다음 실행
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
