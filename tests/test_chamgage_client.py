import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

from pricex.chamgage_client import ChamgageClient


PRODUCT_XML = ET.fromstring(
    """<response><body><items>
    <item><goodId>1</goodId><goodName>배추 1포기</goodName>
    <goodSmlclsCode>030101</goodSmlclsCode><goodBaseCnt>1</goodBaseCnt></item>
    <item><goodId>2</goodId><goodName>세탁세제</goodName>
    <goodSmlclsCode>030301</goodSmlclsCode></item>
    </items></body></response>"""
)

PRICE_XML = ET.fromstring(
    """<response><iros.openapi.service.vo.goodPriceVO>
    <goodInspectDay>20261023</goodInspectDay><entpId>10</entpId>
    <goodId>1</goodId><goodPrice>3,200</goodPrice><goodDcYn>Y</goodDcYn>
    </iros.openapi.service.vo.goodPriceVO></response>"""
)


class ChamgageClientTest(unittest.TestCase):
    def setUp(self):
        self.client = ChamgageClient(service_key="test")

    def test_products_filters_non_food(self):
        with patch.object(self.client, "_request", return_value=PRODUCT_XML):
            products = self.client.products()
        self.assertEqual(["배추 1포기"], [item["name"] for item in products])

    def test_prices_normalizes_numbers_and_discount(self):
        with patch.object(self.client, "_request", return_value=PRICE_XML):
            prices = self.client.prices("1", "20261023")
        self.assertEqual(3200, prices[0]["price"])
        self.assertTrue(prices[0]["is_discounted"])

    def test_inspect_day_validation(self):
        with self.assertRaises(ValueError):
            self.client.prices("1", "2026-10-23")


if __name__ == "__main__":
    unittest.main()

