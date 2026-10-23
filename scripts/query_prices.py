"""Read stored prices and compare only identical products on their latest date."""
import argparse
import json
import os
import urllib.parse
import urllib.request
from chamgage import load_local_env

def main():
    if hasattr(__import__('sys').stdout, 'reconfigure'):
        __import__('sys').stdout.reconfigure(encoding='utf-8')
    load_local_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('query')
    parser.add_argument('--summary', action='store_true')
    args = parser.parse_args()
    endpoint = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/price_observations'
    key = os.environ['SUPABASE_SECRET_KEY']
    rows = []
    for offset in range(0, 1000000, 1000):
        params = urllib.parse.urlencode({'select': 'product_name,inspected_at,price,store_name',
            'product_name': 'ilike.*' + args.query + '*', 'order': 'id.asc',
            'limit': 1000, 'offset': offset})
        with urllib.request.urlopen(urllib.request.Request(endpoint + '?' + params,
                headers={'apikey': key}), timeout=30) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < 1000:
            break
    products = {}
    for row in rows:
        products.setdefault(row['product_name'], []).append(row)
    result = []
    for name, observations in sorted(products.items()):
        latest = max(r['inspected_at'] for r in observations)
        current = [r for r in observations if r['inspected_at'] == latest and r['price'] is not None]
        if not current:
            continue
        result.append({'product_name': name, 'inspected_at': latest,
            'store_count': len(current), 'min_price': min(r['price'] for r in current),
            'max_price': max(r['price'] for r in current),
            'average_price': round(sum(r['price'] for r in current) / len(current)),
            'stores': sorted(current, key=lambda r: r['price'])})
    if args.summary:
        for item in result:
            item.pop('stores')
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
