"""Import the official Chamgage product-average history CSV into Supabase."""

from __future__ import annotations

import argparse
import csv
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


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


def read_rows(path: Path) -> list[dict[str, object]]:
    with path.open("r", encoding="cp949", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"조사일", "상품명", "평균판매가격"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"필수 열이 없습니다: {', '.join(sorted(required))}")
        rows = []
        for line_number, row in enumerate(reader, start=2):
            try:
                price = int(str(row["평균판매가격"]).replace(",", ""))
            except ValueError as exc:
                raise ValueError(f"{line_number}행 평균판매가격이 숫자가 아닙니다.") from exc
            rows.append({
                "product_name": row["상품명"].strip(),
                "inspected_at": row["조사일"].strip(),
                "average_price": price,
                "source": "chamgage_product_statistics",
            })
    return rows


def upsert(rows: list[dict[str, object]], batch_size: int) -> None:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SECRET_KEY"]
    endpoint = (
        f"{url}/rest/v1/product_price_history?"
        + urllib.parse.urlencode({"on_conflict": "product_name,inspected_at,source"})
    )
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    for offset in range(0, len(rows), batch_size):
        batch = rows[offset:offset + batch_size]
        request = urllib.request.Request(
            endpoint,
            data=json.dumps(batch, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                if response.status not in (200, 201):
                    raise RuntimeError(f"Supabase HTTP {response.status}")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase HTTP {exc.code}: {detail}") from exc
        print(f"Saved {min(offset + batch_size, len(rows))}/{len(rows)}", flush=True)


def main() -> None:
    load_local_env()
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()
    rows = read_rows(args.csv_path)
    print(f"Validated {len(rows)} rows")
    upsert(rows, args.batch_size)


if __name__ == "__main__":
    main()
