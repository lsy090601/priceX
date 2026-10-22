"""한국소비자원 참가격 생필품 가격 API 클라이언트."""

from __future__ import annotations

import os
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from typing import Any


DEFAULT_BASE_URL = (
    "http://openapi.price.go.kr/openApiImpl/ProductPriceInfoService"
)
FOOD_CATEGORY_PREFIXES = ("0301", "0302")


class ChamgageError(RuntimeError):
    """참가격 호출 또는 응답 처리 실패."""


def _text(node: ET.Element, name: str) -> str | None:
    value = node.findtext(name)
    return value.strip() if value and value.strip() else None


def _integer(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value.replace(",", ""))
    except ValueError:
        return None


class ChamgageClient:
    """API 응답을 앱과 DB에서 쓰기 쉬운 snake_case 사전으로 변환한다."""

    def __init__(
        self,
        service_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 15,
        retries: int = 3,
    ) -> None:
        self.service_key = service_key or os.getenv("PRICE_GOKR_SERVICE_KEY", "")
        self.base_url = (
            base_url or os.getenv("PRICE_GOKR_BASE_URL") or DEFAULT_BASE_URL
        ).rstrip("/")
        self.timeout = timeout
        self.retries = retries

        if not self.service_key:
            raise ChamgageError(
                "PRICE_GOKR_SERVICE_KEY가 없습니다. .env.example을 참고해 환경변수를 설정하세요."
            )

    def _request(self, operation: str, **params: str) -> ET.Element:
        # 인증키는 이미 인코딩된 값일 수도 있어 안전하게 한 번 디코딩한 뒤 조립한다.
        query = urllib.parse.urlencode(
            {"ServiceKey": urllib.parse.unquote(self.service_key), **params}
        )
        url = f"{self.base_url}/{operation}.do?{query}"

        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                with urllib.request.urlopen(url, timeout=self.timeout) as response:
                    payload = response.read()
                root = ET.fromstring(payload)
                self._raise_for_api_error(root)
                return root
            except (urllib.error.URLError, TimeoutError, ET.ParseError) as exc:
                last_error = exc
                if attempt + 1 < self.retries:
                    time.sleep(2**attempt)

        raise ChamgageError(f"참가격 API 호출 실패: {last_error}") from last_error

    @staticmethod
    def _raise_for_api_error(root: ET.Element) -> None:
        code = root.findtext(".//resultCode") or root.findtext(".//returnReasonCode")
        message = root.findtext(".//resultMsg") or root.findtext(".//returnAuthMsg")
        if code and code not in {"00", "0", "INFO-0"}:
            raise ChamgageError(f"참가격 API 오류 {code}: {message or '원인 미상'}")

    def products(self, food_only: bool = True) -> list[dict[str, Any]]:
        root = self._request("getProductInfoSvc")
        result = []
        for item in root.findall(".//item"):
            category_code = _text(item, "goodSmlclsCode") or ""
            if food_only and not category_code.startswith(FOOD_CATEGORY_PREFIXES):
                continue
            result.append(
                {
                    "product_id": _text(item, "goodId"),
                    "name": _text(item, "goodName"),
                    "manufacturer_code": _text(item, "productEntpCode"),
                    "category_code": category_code or None,
                    "base_quantity": _integer(_text(item, "goodBaseCnt")),
                    "base_unit_code": _text(item, "goodUnitDivCode"),
                    "total_quantity": _integer(_text(item, "goodTotalCnt")),
                    "total_unit_code": _text(item, "goodTotalDivCode"),
                    "description": _text(item, "detailMean"),
                }
            )
        return result

    def search_products(self, query: str) -> list[dict[str, Any]]:
        keyword = query.strip().casefold()
        if not keyword:
            return []
        return [
            product
            for product in self.products()
            if keyword in (product["name"] or "").casefold()
            or keyword in (product["description"] or "").casefold()
        ]

    def stores(self) -> list[dict[str, Any]]:
        root = self._request("getStoreInfoSvc")
        result = []
        for item in root.findall(".//iros.openapi.service.vo.entpInfoVO"):
            result.append(
                {
                    "store_id": _text(item, "entpId"),
                    "name": _text(item, "entpName"),
                    "channel_code": _text(item, "entpTypeCode"),
                    "area_code": _text(item, "entpAreaCode"),
                    "area_detail_code": _text(item, "areaDetailCode"),
                    "phone": _text(item, "entpTelno"),
                    "postal_code": _text(item, "postNo"),
                    "address": " ".join(
                        filter(
                            None,
                            (_text(item, "roadAddrBasic"), _text(item, "roadAddrDetail")),
                        )
                    ),
                    "longitude": _text(item, "xMapCoord"),
                    "latitude": _text(item, "yMapCoord"),
                }
            )
        return result

    def prices(self, product_id: str, inspect_day: str) -> list[dict[str, Any]]:
        if len(inspect_day) != 8 or not inspect_day.isdigit():
            raise ValueError("inspect_day는 YYYYMMDD 형식이어야 합니다.")
        root = self._request(
            "getProductPriceInfoSvc",
            goodInspectDay=inspect_day,
            goodId=product_id,
        )
        result = []
        for item in root.findall(".//iros.openapi.service.vo.goodPriceVO"):
            result.append(
                {
                    "inspected_at": _text(item, "goodInspectDay"),
                    "store_id": _text(item, "entpId"),
                    "product_id": _text(item, "goodId"),
                    "price": _integer(_text(item, "goodPrice")),
                    "is_discounted": _text(item, "goodDcYn") == "Y",
                    "collected_at": _text(item, "inputDttm"),
                }
            )
        return result

    def latest_prices(
        self, product_id: str, lookback_days: int = 21
    ) -> tuple[str | None, list[dict[str, Any]]]:
        current = date.today()
        for offset in range(lookback_days):
            inspect_day = (current - timedelta(days=offset)).strftime("%Y%m%d")
            rows = self.prices(product_id, inspect_day)
            if rows:
                return inspect_day, rows
        return None, []

