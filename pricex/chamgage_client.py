"""공공데이터포털 ODCloud 기반 한국소비자원 생필품 가격 API 클라이언트."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

DEFAULT_API_URL = (
    "https://api.odcloud.kr/api/15083256/v1/"
    "uddi:4f684682-d8a2-446e-be30-adfffdaae05a"
)


class ChamgageError(RuntimeError):
    """참가격 호출 또는 응답 처리 실패."""


def _normalize(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "product_name": row.get("상품명"),
        "inspected_at": row.get("조사일"),
        "price": row.get("판매가격"),
        "store_name": row.get("판매업소"),
        "manufacturer": row.get("제조사"),
        "is_discounted": row.get("세일여부") == "Y",
        "is_one_plus_one": row.get("원플러스원") == "Y",
    }


class ChamgageClient:
    """참가격 ODCloud 응답을 앱과 DB용 snake_case 구조로 변환한다."""

    def __init__(self, service_key: str | None = None, api_url: str | None = None,
                 timeout: float = 15, retries: int = 3) -> None:
        self.service_key = service_key or os.getenv("DATA_GO_KR_SERVICE_KEY", "")
        self.api_url = api_url or os.getenv("CHAMGAGE_API_URL") or DEFAULT_API_URL
        self.timeout = timeout
        self.retries = retries
        if not self.service_key:
            raise ChamgageError(
                "DATA_GO_KR_SERVICE_KEY가 없습니다. .env.example을 참고해 설정하세요."
            )

    def _request(self, params: dict[str, str | int]) -> dict[str, Any]:
        query = urllib.parse.urlencode(
            {**params, "serviceKey": urllib.parse.unquote(self.service_key)}
        )
        url = f"{self.api_url}?{query}"
        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                request = urllib.request.Request(url, headers={"Accept": "application/json"})
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if "data" not in payload:
                    message = payload.get("msg") or payload.get("message") or str(payload)
                    raise ChamgageError(f"참가격 API 오류: {message}")
                return payload
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                last_error = exc
                if attempt + 1 < self.retries:
                    time.sleep(2**attempt)
        raise ChamgageError(f"참가격 API 호출 실패: {last_error}") from last_error

    def prices(self, *, product_name: str | None = None,
               inspect_day: str | None = None, store_name: str | None = None,
               page: int = 1, per_page: int = 100) -> dict[str, Any]:
        if page < 1 or not 1 <= per_page <= 1000:
            raise ValueError("page는 1 이상, per_page는 1~1000이어야 합니다.")
        params: dict[str, str | int] = {"page": page, "perPage": per_page}
        if product_name:
            params["cond[상품명::LIKE]"] = product_name.strip()
        if inspect_day:
            params["cond[조사일::EQ]"] = inspect_day.strip()
        if store_name:
            params["cond[판매업소::LIKE]"] = store_name.strip()
        payload = self._request(params)
        return {
            "page": payload.get("page", page),
            "per_page": payload.get("perPage", per_page),
            "current_count": payload.get("currentCount", 0),
            "match_count": payload.get("matchCount", 0),
            "total_count": payload.get("totalCount", 0),
            "prices": [_normalize(row) for row in payload.get("data", [])],
        }

    def search_products(self, query: str, per_page: int = 100) -> dict[str, Any]:
        if not query.strip():
            return {"page": 1, "per_page": per_page, "current_count": 0,
                    "match_count": 0, "total_count": 0, "prices": []}
        return self.prices(product_name=query, per_page=per_page)

