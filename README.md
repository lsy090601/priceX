# PriceX

공공 물가 데이터와 AI로 "지금 이 가격, 사도 될까?"에 답해주는 스마트 장보기 앱입니다.

## 참가격 API 시작하기

1. [공공데이터포털의 한국소비자원 생필품 가격 정보](https://www.data.go.kr/data/3043385/openapi.do)에서 활용 신청 후 일반 인증키(Decoding)를 발급받습니다.
2. `.env.example`을 복사해 `.env`를 만들고 `PRICE_GOKR_SERVICE_KEY`에 인증키를 입력합니다. 인증키는 `.env`나 GitHub Actions Secret에만 저장하고 커밋하지 않습니다.
3. Python 3.10 이상에서 아래 명령으로 연결을 확인합니다.

```powershell
Copy-Item .env.example .env
# .env의 PRICE_GOKR_SERVICE_KEY 값을 입력한 다음 실행
python scripts/chamgage.py search 배추
python scripts/chamgage.py prices 상품ID
```

지원 명령은 다음과 같습니다.

- `products`: 식품 상품 전체 조회
- `search 검색어`: 상품명과 설명 검색
- `stores`: 판매점 전체 조회
- `prices 상품ID [--date YYYYMMDD]`: 해당 상품의 매장별 가격 조회. 날짜 생략 시 최근 21일을 탐색합니다.

API 원본 XML은 앱에서 사용하기 쉬운 JSON 구조로 변환됩니다. 참가격 조사는 실시간 매장 가격이 아니라 조사 시점의 가격이며, 일부 품목은 최신 조사일에 데이터가 없을 수 있습니다.

테스트는 외부 API나 인증키 없이 실행됩니다.

```powershell
python -m unittest discover -s tests -v
```
