"""Import Chamgage pages into Supabase; repeated runs upsert existing observations."""
import argparse
import json
import os
import time
from datetime import datetime, timezone
import urllib.request
import urllib.error
from chamgage import load_local_env
from pricex import ChamgageClient

def main():
    load_local_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('--product')
    parser.add_argument('--pages', type=int, default=0, help='0 imports all pages')
    parser.add_argument('--start-page', type=int, default=1)
    parser.add_argument('--page-size', type=int, default=1000)
    args = parser.parse_args()
    if args.pages < 0 or args.start_page < 1 or not 1 <= args.page_size <= 1000:
        parser.error('Invalid page range or page size')
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SECRET_KEY', '')
    if not url or not key:
        raise SystemExit('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env (server only).')
    client = ChamgageClient()
    page = args.start_page
    while not args.pages or page < args.start_page + args.pages:
        result = client.prices(product_name=args.product, page=page, per_page=args.page_size)
        if result['page'] != page or result['per_page'] != args.page_size:
            raise SystemExit('API ignored pagination. Check your personal service key.')
        rows = result['prices']
        if not rows:
            break
        rows = list({(r['product_name'], r['inspected_at'], r['store_name']): r for r in rows}.values())
        for row in rows:
            row['updated_at'] = datetime.now(timezone.utc).isoformat()
        request = urllib.request.Request(
            url + '/rest/v1/price_observations?on_conflict=product_name,inspected_at,store_name',
            data=json.dumps(rows).encode('utf-8'), method='POST',
            headers={'apikey': key, 'Content-Type': 'application/json',
                     'Prefer': 'resolution=merge-duplicates,return=minimal'})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    print(f'Page {page}: saved {len(rows)} observations (HTTP {response.status})', flush=True)
                break
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode('utf-8', errors='replace').replace(key, '[REDACTED]')
                if attempt == 2 or exc.code not in (429, 500, 502, 503, 504):
                    raise SystemExit(f'Supabase HTTP {exc.code}: {detail}; resume with --start-page {page}') from None
                time.sleep(2 ** attempt)
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise SystemExit(f'Network failure; resume with --start-page {page}') from None
                time.sleep(2 ** attempt)
        if page * result['per_page'] >= result['match_count']:
            break
        page += 1

if __name__ == '__main__':
    main()
