import unittest
from datetime import date

from pricex.forecast import MonthlyPrice, aggregate_monthly, forecast_next_month


class ForecastTest(unittest.TestCase):
    def test_aggregates_multiple_inspections_per_month(self):
        result = aggregate_monthly([
            (date(2026, 7, 5), 1000),
            (date(2026, 7, 20), 1200),
            (date(2026, 8, 5), 1300),
        ])
        self.assertEqual([1100, 1300], [item.average_price for item in result])

    def test_predicts_from_three_consecutive_months(self):
        result = forecast_next_month([
            MonthlyPrice(date(2026, 7, 1), 1000),
            MonthlyPrice(date(2026, 8, 1), 1100),
            MonthlyPrice(date(2026, 9, 1), 1200),
        ])
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(1300, result.predicted_price)
        self.assertEqual("up", result.direction)
        self.assertEqual("low", result.confidence)
        self.assertEqual(date(2026, 10, 1), result.predicted_for)

    def test_refuses_to_predict_across_missing_months(self):
        result = forecast_next_month([
            MonthlyPrice(date(2024, 11, 1), 1000),
            MonthlyPrice(date(2024, 12, 1), 1100),
            MonthlyPrice(date(2026, 9, 1), 1200),
        ])
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
