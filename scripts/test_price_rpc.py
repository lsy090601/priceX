"""Smoke-test the public product search and store comparison RPCs."""
import json
import os
import sys
import urllib.error
import urllib.request

from chamgage import load_local_env


def call_rpc(name, payload):
    base_url = os.environ["SUPABASE_URL"].rstrip("/")
    # Use the public key when configured; the server key also verifies the RPC in CI.
    api_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ["SUPABASE_SECRET_KEY"]
    request = urllib.request.Request(
        f"{base_url}/rest/v1/rpc/{name}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"apikey": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    load_local_env()
    products = call_rpc(
        "search_price_products", {"search_query": "배추", "result_limit": 10}
    )
    assert products, "No matching products were returned"
    required_summary = {
        "product_name", "inspected_at", "store_count",
        "min_price", "max_price", "average_price",
    }
    assert required_summary <= products[0].keys()

    prices = call_rpc(
        "compare_product_prices", {"target_product": products[0]["product_name"]}
    )
    assert prices, "No store prices were returned"
    assert prices == sorted(prices, key=lambda row: (row["price"], row["store_name"]))
    assert len({row["inspected_at"] for row in prices}) == 1

    selected_products = [item["product_name"] for item in products[:2]]
    recommendation = call_rpc(
        "recommend_purchase_plan",
        {
            "purchase_items": [
                {"product_name": selected_products[0], "quantity": 2},
                {"product_name": selected_products[1], "quantity": 1},
            ]
        },
    )
    assert recommendation["is_complete"] is True
    assert len(recommendation["items"]) == 2
    assert recommendation["multi_store_total"] == sum(
        item["subtotal"] for item in recommendation["items"]
    )
    if recommendation["single_store"]:
        assert recommendation["single_store"]["total"] >= recommendation["multi_store_total"]
        assert recommendation["savings"] == (
            recommendation["single_store"]["total"]
            - recommendation["multi_store_total"]
        )

    print(
        f"RPC check passed: {len(products)} products, "
        f"{len(prices)} stores for {products[0]['product_name']}, "
        f"purchase plan total {recommendation['multi_store_total']:,}원"
    )


if __name__ == "__main__":
    main()
