"""Transparent baseline price forecasting for monthly product averages."""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date
from statistics import mean


@dataclass(frozen=True)
class MonthlyPrice:
    month: date
    average_price: int


@dataclass(frozen=True)
class PriceForecast:
    predicted_for: date
    predicted_price: int
    direction: str
    confidence: str
    observation_count: int
    training_start: date
    training_end: date


def _next_month(value: date) -> date:
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)


def aggregate_monthly(observations: list[tuple[date, int]]) -> list[MonthlyPrice]:
    grouped: dict[date, list[int]] = {}
    for inspected_at, price in observations:
        month = inspected_at.replace(day=1)
        grouped.setdefault(month, []).append(price)
    return [
        MonthlyPrice(month, round(mean(prices)))
        for month, prices in sorted(grouped.items())
    ]


def forecast_next_month(series: list[MonthlyPrice]) -> PriceForecast | None:
    if len(series) < 3:
        return None
    recent = sorted(series, key=lambda item: item.month)[-12:]
    for previous, current in zip(recent[-3:], recent[-2:]):
        if _next_month(previous.month) != current.month:
            return None

    window = recent[-3:]
    changes = [
        window[index].average_price - window[index - 1].average_price
        for index in range(1, len(window))
    ]
    average_change = mean(changes)
    latest = window[-1].average_price
    raw_prediction = latest + average_change
    lower, upper = latest * 0.8, latest * 1.2
    predicted = round(min(max(raw_prediction, lower), upper))
    change_rate = (predicted - latest) / latest
    direction = "up" if change_rate > 0.02 else "down" if change_rate < -0.02 else "stable"
    confidence = "high" if len(recent) >= 12 else "medium" if len(recent) >= 6 else "low"
    return PriceForecast(
        predicted_for=_next_month(window[-1].month),
        predicted_price=predicted,
        direction=direction,
        confidence=confidence,
        observation_count=len(recent),
        training_start=recent[0].month,
        training_end=recent[-1].month,
    )
