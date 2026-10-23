"""Verify repeating an import does not create duplicate observations."""
import os
import subprocess
import sys
import urllib.request
from chamgage import load_local_env

load_local_env()
url = os.environ['SUPABASE_URL'].rstrip('/')
key = os.environ['SUPABASE_SECRET_KEY']

def count():
    request = urllib.request.Request(
        url + '/rest/v1/price_observations?select=id&limit=1',
        headers={'apikey': key, 'Prefer': 'count=exact'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return int(response.headers['Content-Range'].split('/')[-1])

before = count()
subprocess.run([sys.executable, 'scripts/sync_prices.py', '--product', '\uBC30\uCD94', '--pages', '1', '--page-size', '100'], check=True)
after = count()
assert before == after and after > 0, f'Unexpected row counts: {before} -> {after}'
print(f'Duplicate check passed: {before} -> {after} rows')
