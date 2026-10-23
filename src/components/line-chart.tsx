import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { FontFamily } from "@/constants/theme";

export type ChartPoint = { label: string; value: number };

const HEIGHT = 140;
const LABEL_W = 62; // 왼쪽 가격 글자 칸
const TOP_PAD = 10;
const X_LABEL_H = 24;

/** 눈금 간격을 1, 2, 5 × 10^n 중에서 고릅니다. */
function niceStep(range: number, ticks: number) {
  const raw = range / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * pow;
}

/** 가격 추이 꺾은선 그래프 (피그마 160:1139) */
export function LineChart({
  points,
  width,
  forecastIndex,
}: {
  points: ChartPoint[];
  width: number;
  /** 이 위치부터는 예상 가격이라 점선으로 그립니다. */
  forecastIndex?: number;
}) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(max * 0.1, 10);
  const step = niceStep(span * 1.2, 3);
  const axisMin = Math.max(0, Math.floor((min - span * 0.1) / step) * step);
  let axisMax = axisMin + step * 3;
  while (axisMax < max + span * 0.05) axisMax += step;
  const ticks: number[] = [];
  for (let v = axisMin; v <= axisMax + 1e-6; v += step) ticks.push(v);

  const plotLeft = LABEL_W;
  const plotRight = width - 14;
  const plotW = plotRight - plotLeft;
  const x = (i: number) =>
    points.length === 1
      ? plotLeft + plotW / 2
      : plotLeft + 10 + ((plotW - 20) * i) / (points.length - 1);
  const y = (v: number) =>
    TOP_PAD + (HEIGHT - TOP_PAD) * (1 - (v - axisMin) / (axisMax - axisMin));

  const path = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, k) => `${k === 0 ? "M" : "L"}${x(from + k)} ${y(p.value)}`)
      .join(" ");
  const hasForecast =
    forecastIndex !== undefined &&
    forecastIndex > 0 &&
    forecastIndex < points.length;
  const solidEnd = hasForecast ? forecastIndex - 1 : points.length - 1;
  const line = path(0, points.length - 1);
  const solidLine = path(0, solidEnd);
  const dashedLine = hasForecast ? path(forecastIndex - 1, points.length - 1) : null;
  const area = `${line} L${x(points.length - 1)} ${HEIGHT} L${x(0)} ${HEIGHT} Z`;

  return (
    <View style={{ width, height: HEIGHT + X_LABEL_H }}>
      <Svg width={width} height={HEIGHT + X_LABEL_H}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#00b43f" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#00b43f" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {ticks.map((t) => (
          <Line
            key={t}
            x1={plotLeft}
            x2={plotRight}
            y1={y(t)}
            y2={y(t)}
            stroke="#c9c9c9"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}
        <Path d={area} fill="url(#area)" />
        <Path d={solidLine} stroke="#007529" strokeWidth={1.5} fill="none" />
        {dashedLine && (
          <Path
            d={dashedLine}
            stroke="#007529"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            fill="none"
          />
        )}
        {points.map((p, i) =>
          i === points.length - 1 ? (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={5}
              fill="#007529"
              stroke="#c6efd3"
              strokeWidth={3}
            />
          ) : (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={3}
              fill="#ffffff"
              stroke="#007529"
              strokeWidth={1.2}
            />
          ),
        )}
      </Svg>

      {ticks.map((t) => (
        <Text key={t} style={[styles.yLabel, { top: y(t) - 9 }]}>
          {Math.round(t).toLocaleString("ko-KR")}원
        </Text>
      ))}
      {points.map((p, i) => (
        <Text
          key={`${p.label}-${i}`}
          style={[styles.xLabel, { left: x(i) - 24, top: HEIGHT + 6 }]}
        >
          {p.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  yLabel: {
    position: "absolute",
    left: 0,
    width: LABEL_W - 6,
    textAlign: "right",
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#000000",
  },
  xLabel: {
    position: "absolute",
    width: 48,
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#000000",
  },
});
