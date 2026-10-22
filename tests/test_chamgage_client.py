import unittest
from unittest.mock import patch

from pricex.chamgage_client import ChamgageClient

PAYLOAD = {
    "currentCount": 1, "matchCount": 3, "page": 1, "perPage": 10,
    "totalCount": 235632,
    "data": [{"상품명": "배추(1.5~2kg)", "조사일": "2026-09-11",
              "판매가격": 3200, "판매업소": "테스트마트", "제조사": None,
              "세일여부": "Y", "원플러스원": "N"}],
}


class ChamgageClientTest(unittest.TestCase):
    def setUp(self):
        self.client = ChamgageClient(service_key="test")

    def test_prices_normalizes_odcloud_response(self):
        with patch.object(self.client, "_request", return_value=PAYLOAD):
            result = self.client.prices(product_name="배추", per_page=10)
        self.assertEqual("배추(1.5~2kg)", result["prices"][0]["product_name"])
        self.assertEqual(3200, result["prices"][0]["price"])
        self.assertTrue(result["prices"][0]["is_discounted"])
        self.assertEqual(3, result["match_count"])

    def test_search_sends_like_condition(self):
        with patch.object(self.client, "_request", return_value=PAYLOAD) as request:
            self.client.search_products("배추", per_page=20)
        params = request.call_args.args[0]
        self.assertEqual("배추", params["cond[상품명::LIKE]"])
        self.assertEqual(20, params["perPage"])

    def test_page_validation(self):
        with self.assertRaises(ValueError):
            self.client.prices(page=0)


if __name__ == "__main__":
    unittest.main()

