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
    search = subparsers.add_parser("search", help="상품명 검색")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=100)
    prices = subparsers.add_parser("prices", help="가격 데이터 조건 조회")
    prices.add_argument("--product", help="상품명 일부")
    prices.add_argument("--date", help="조사일(YYYY-MM-DD)")
    prices.add_argument("--store", help="판매업소명 일부")
    prices.add_argument("--page", type=int, default=1)
    prices.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    try:
        client = ChamgageClient()
        if args.command == "search":
            result = client.search_products(args.query, per_page=args.limit)
        else:
            result = client.prices(product_name=args.product, inspect_day=args.date,
                                   store_name=args.store, page=args.page,
                                   per_page=args.limit)
    except (ChamgageError, ValueError) as exc:
        print(f"오류: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

