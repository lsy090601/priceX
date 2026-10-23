"""Import fresh fruit / vegetable retail prices (aT recent price API) into Supabase; repeated runs upsert."""
import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_URL = 'https://apis.data.go.kr/B552845/recent/price'
CATEGORIES = {'과일류', '채소류'}
RETAIL = '소매'
# 식량작물로 분류되지만 장보기에서는 채소처럼 쓰이는 품목 (채소류로 저장)
VEGETABLE_LIKE = {'감자', '고구마'}
PAGE_SIZE = 1000


def load_local_env():
    env_path = Path(__file__).resolve().parents[1] / '.env'
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('\'"'))


def fetch_items(service_key):
    items, page = [], 1
    while True:
        query = urllib.parse.urlencode({'serviceKey': service_key, 'pageNo': page,
                                        'numOfRows': PAGE_SIZE, 'returnType': 'json'})
        try:
            with urllib.request.urlopen(f'{API_URL}?{query}', timeout=60) as response:
                body = json.load(response)['response']['body']
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
            # The URL contains the service key, so never print the exception's URL.
            raise SystemExit(f'Price API request failed on page {page}: {type(exc).__name__}') from None
        batch = body['items']['item'] if body.get('items') else []
        if isinstance(batch, dict):
            batch = [batch]
        items.extend(batch)
        if page * PAGE_SIZE >= int(body['totalCount']):
            return items
        page += 1


def to_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def to_row(item, now):
    return {
        'inspected_at': datetime.strptime(item['exmn_ymd'], '%Y%m%d').date().isoformat(),
        'category': item['ctgry_nm'],
        'item_code': item['item_cd'],
        'item_name': item['item_nm'],
        'variety_code': item['vrty_cd'],
        'variety_name': item['vrty_nm'],
        'grade_code': item['grd_cd'],
        'grade_name': item['grd_nm'],
        'unit': item['unit'],
        'unit_size': float(item['unit_sz']),
        'price': to_int(item.get('exmn_dd_prc')),
        'price_1d_ago': to_int(item.get('dd1_bfr_prc')),
        'price_1w_ago': to_int(item.get('ww1_bfr_prc')),
        'price_1m_ago': to_int(item.get('mm1_bfr_prc')),
        'price_1y_ago': to_int(item.get('yy1_bfr_prc')),
        'converted_price': to_int(item.get('exmn_dd_cnvs_prc')),
        'updated_at': now,
    }


def save(rows, url, key):
    request = urllib.request.Request(
        url + '/rest/v1/produce_prices?on_conflict=inspected_at,item_code,variety_code,grade_code,unit,unit_size',
        data=json.dumps(rows).encode('utf-8'), method='POST',
        headers={'apikey': key, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode('utf-8', errors='replace').replace(key, '[REDACTED]')
            if attempt == 2 or exc.code not in (429, 500, 502, 503, 504):
                raise SystemExit(f'Supabase HTTP {exc.code}: {detail}') from None
            time.sleep(2 ** attempt)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise SystemExit('Network failure while saving to Supabase') from None
            time.sleep(2 ** attempt)


def main():
    if hasattr(__import__('sys').stdout, 'reconfigure'):
        __import__('sys').stdout.reconfigure(encoding='utf-8')
    load_local_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='fetch and count rows without saving')
    args = parser.parse_args()
    service_key = os.environ.get('DATA_GO_KR_SERVICE_KEY', '')
    if not service_key:
        raise SystemExit('Set DATA_GO_KR_SERVICE_KEY in .env.')
    items = fetch_items(service_key)
    now = datetime.now(timezone.utc).isoformat()
    rows = {}
    for item in items:
        if item.get('se_nm') != RETAIL:
            continue
        if item.get('item_nm') in VEGETABLE_LIKE:
            item = {**item, 'ctgry_nm': '채소류'}
        if item.get('ctgry_nm') in CATEGORIES:
            row = to_row(item, now)
            rows[(row['inspected_at'], row['item_code'], row['variety_code'], row['grade_code'],
                  row['unit'], row['unit_size'])] = row
    rows = list(rows.values())
    print(f'Fetched {len(items)} items, {len(rows)} retail fruit/vegetable rows')
    if args.dry_run:
        return
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SECRET_KEY', '')
    if not url or not key:
        raise SystemExit('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env (server only).')
    status = save(rows, url, key)
    print(f'Saved {len(rows)} rows (HTTP {status})')


if __name__ == '__main__':
    main()
