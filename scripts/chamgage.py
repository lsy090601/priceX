"""참가격 API 확인용 명령행 도구."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pricex import ChamgageClient, ChamgageError  # noqa: E402


def load_local_env() -> None:
    """외부 패키지 없이 프로젝트 루트의 단순한 .env 파일을 읽는다."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def main() -> int:
    load_local_env()
    parser = argparse.ArgumentParser(description="PriceX 참가격 API 클라이언트")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("products", help="식품 상품 목록 조회")
    search = subparsers.add_parser("search", help="상품명 검색")
    search.add_argument("query")
    subparsers.add_parser("stores", help="판매점 목록 조회")
    prices = subparsers.add_parser("prices", help="상품 가격 조회")
    prices.add_argument("product_id")
    prices.add_argument("--date", help="조사일(YYYYMMDD); 생략 시 최근 조사일 탐색")

    args = parser.parse_args()
    try:
        client = ChamgageClient()
        if args.command == "products":
            result: Any = client.products()
        elif args.command == "search":
            result = client.search_products(args.query)
        elif args.command == "stores":
            result = client.stores()
        elif args.date:
            result = {"inspect_day": args.date, "prices": client.prices(args.product_id, args.date)}
        else:
            day, rows = client.latest_prices(args.product_id)
            result = {"inspect_day": day, "prices": rows}
    except (ChamgageError, ValueError) as exc:
        print(f"오류: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

