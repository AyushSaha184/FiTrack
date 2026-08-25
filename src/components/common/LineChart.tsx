import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CartesianChart, Line, Area } from 'victory-native';
import { Circle, vec, LinearGradient as SkiaLinearGradient, matchFont } from '@shopify/react-native-skia';
import { useColors } from '../../hooks';
import { spacing, typography } from '../../theme';

interface ChartDataPoint {
  date: string;
  value: number;
  timestamp?: number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  width: number;
  height: number;
  yAxisLabel?: string;
  showTooltip?: boolean;
  tooltipValue?: string;
  areaFill?: boolean;
  lineColor?: string;
  // Maximum Y value. When provided, the Y-axis domain is fixed to [0, yMax]
  // and the ticks are evenly distributed (up to 5) between 0 and yMax. Useful
  // for step screens where the domain should align with the user's step goal.
  yMax?: number;
  // Number of Y-axis ticks to display when yMax is set. Defaults to 5.
  yTickCount?: number;
}

// Hoist the Skia font object to module scope so it is created exactly once
// per app launch instead of once per chart mount. Skia's `matchFont` builds a
// underlying Skia typeface which is expensive.
const CHART_FONT = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', android: 'sans-serif' }) || 'sans-serif',
  fontSize: 10,
  fontWeight: '500',
});

const downsampleData = (pts: ChartDataPoint[], maxPoints = 30): ChartDataPoint[] => {
  if (pts.length <= maxPoints) return pts;
  const sampled: ChartDataPoint[] = [];
  const step = (pts.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    if (pts[idx]) {
      sampled.push(pts[idx]);
    }
  }
  return sampled;
};

// Round a number UP to the nearest "nice" value. e.g. 7500 -> 8000,
// 12000 -> 12000, 4750 -> 5000. Used to pin a Y-axis max to a clean number.
const niceCeil = (n: number): number => {
  if (!Number.isFinite(n) || n <= 0) return 100;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const fraction = n / base;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * base;
};

// Empty-state placeholder so the chart still renders a baseline when there is
// no data yet. Pre-computed for the past 7 days relative to "now" once per
// module load (date strings are intentionally static so the axis labels don't
// shimmer as the user switches time ranges).
const buildEmptyData = (): ChartDataPoint[] => {
  const result: ChartDataPoint[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: 0,
    });
  }
  return result;
};
const EMPTY_DATA = buildEmptyData();

export const LineChart = memo<LineChartProps>(({
  data,
  width,
  height,
  yAxisLabel,
  showTooltip = true,
  tooltipValue,
  areaFill = true,
  lineColor,
  yMax: yMaxProp,
  yTickCount: yTickCountProp = 5,
}) => {
  const colors = useColors();
  const color = lineColor || colors.text;

  // Combined memo for all the heavy, derived chart data. Re-runs only when
  // the input data, pinned yMax, or tick count changes.
  const chartGeometry = useMemo(() => {
    const processed = downsampleData(data, 30);

    const isEmpty = processed.length === 0;
    const activeData = isEmpty ? EMPTY_DATA : processed;

    // If there's only 1 data point, duplicate it to show a flat line from a day ago
    const display = [...activeData];
    if (display.length === 1 && !isEmpty) {
      display.unshift({ date: '', value: display[0].value } as ChartDataPoint);
    }

    const getY = (d: ChartDataPoint) =>
      (d as any).y !== undefined ? (d as any).y : d.value;
    const getLabel = (d: ChartDataPoint) => d.date || '';

    const values = display.map((d) => getY(d));
    const hasYMaxOverride = yMaxProp != null && yMaxProp > 0;
    let maxVal: number;
    if (hasYMaxOverride) {
      maxVal = niceCeil(yMaxProp!);
    } else if (isEmpty) {
      maxVal = 100;
    } else {
      const rawMax = Math.max(...values);
      maxVal = niceCeil(rawMax * 1.05);
    }
    if (!Number.isFinite(maxVal) || maxVal <= 0) {
      maxVal = 100;
    }
    const yTickCount = Math.max(2, hasYMaxOverride ? yTickCountProp : 5);
    const rawStep = maxVal / (yTickCount - 1);
    const yStep = niceCeil(rawStep);
    maxVal = yStep * (yTickCount - 1);

    const chartData = display.map((d, i) => ({
      x: i,
      y: maxVal > 0 ? Math.max(0, Math.min(getY(d), maxVal)) : getY(d),
      label: getLabel(d) || String(i + 1),
    }));

    const maxXTicks = 6;
    const xTickIndices: number[] = (() => {
      const n = chartData.length;
      if (n <= 0) return [];
      if (n === 1) return [0];
      const count = Math.min(maxXTicks, n);
      const indices: number[] = [];
      for (let i = 0; i < count; i++) {
        const idx = Math.round((i * (n - 1)) / (count - 1));
        if (idx < 0) continue;
        if (idx > n - 1) break;
        if (!indices.includes(idx)) indices.push(idx);
      }
      if (indices[indices.length - 1] !== n - 1) {
        indices[indices.length - 1] = n - 1;
      }
      return indices;
    })();

    const xTickSet = new Set(xTickIndices);

    // Format Y-axis labels based on tick step magnitude so they always show
    // clean values (e.g. 2.5k, 5k, 7.5k, 10k for a goal of 10000).
    const formatYLabel = (val: number): string => {
      const rounded = Math.round(val / yStep) * yStep;
      if (yStep >= 1000) {
        const thousands = rounded / 1000;
        const isWholeK = Math.abs(thousands - Math.round(thousands)) < 0.01;
        if (isWholeK) {
          const k = Math.round(thousands);
          return k >= 10 ? `${k}K` : `${k}k`;
        }
        return `${thousands.toFixed(1)}k`;
      }
      if (yStep >= 1) {
        return val % 1 !== 0 ? rounded.toFixed(1) : String(Math.round(rounded));
      }
      return rounded.toFixed(2);
    };

    const yTickValues: number[] = Array.from(
      { length: yTickCount },
      (_, i) => i * yStep
    );

    return {
      isEmpty,
      chartData,
      maxVal,
      yTickCount,
      yTickValues,
      xTickIndices,
      xTickSet,
      formatYLabel,
      getY,
    };
  }, [data, yMaxProp, yTickCountProp]);

  const { isEmpty, chartData, maxVal, yTickCount, yTickValues, xTickIndices, xTickSet, formatYLabel, getY } = chartGeometry;

  // Module-scope font is created once; reference it here so the chart picks
  // it up without re-running matchFont.
  const font = CHART_FONT;

  return (
    <View style={[styles.container, { width, height }]}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        domainPadding={{ left: 16, right: 16, top: 20, bottom: 30 }}
        domain={{ y: [0, maxVal] }}
        axisOptions={{
          font,
          tickCount: { x: xTickIndices.length, y: yTickCount },
          tickValues: { x: xTickIndices, y: yTickValues },
          lineColor: 'rgba(255,255,255,0.08)',
          labelColor: 'rgba(255,255,255,0.5)',
          formatXLabel: (val: number) => {
            const idx = Math.round(val);
            if (idx < 0 || idx >= chartData.length) return '';
            if (!xTickSet.has(idx)) return '';
            const label = chartData[idx]?.label || '';
            return label.length > 8 ? label.substring(0, 6) + '..' : label;
          },
          formatYLabel: formatYLabel,
          labelOffset: { x: 4, y: 4 },
        }}
      >
        {({ points, chartBounds }) => (
          <>
            {/* Area fill */}
            {areaFill && (
              <Area
                points={points.y}
                y0={chartBounds.bottom}
                animate={{ type: 'timing', duration: 800 }}
                curveType="natural"
              >
                <SkiaLinearGradient
                  start={vec(0, chartBounds.top)}
                  end={vec(0, chartBounds.bottom)}
                  colors={[`${color}26`, `${color}00`]}
                />
              </Area>
            )}

            {/* Line */}
            <Line
              points={points.y}
              color={color}
              strokeWidth={2}
              animate={{ type: 'timing', duration: 800 }}
              curveType="natural"
            />

            {/* Data points */}
            {!isEmpty && points.y.map((point, i) => {
              if (!point || point.x == null || point.y == null) return null;
              return (
                <React.Fragment key={`point-${i}`}>
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    color={colors.background}
                    style="fill"
                  />
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    color={color}
                    style="stroke"
                    strokeWidth={2}
                  />
                </React.Fragment>
              );
            })}
          </>
        )}
      </CartesianChart>

      {isEmpty && (
        <View style={styles.overlayContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No data logged yet
          </Text>
        </View>
      )}

      {/* Tooltip for last value */}
      {showTooltip && data.length > 0 && (
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderColor: 'rgba(255,255,255,0.2)',
              right: 8,
              top: 8,
            },
          ]}
        >
          <Text style={[styles.tooltipText, { color: colors.text }]}>
            {tooltipValue || formatYLabel(getY(data[data.length - 1]))}
          </Text>
        </View>
      )}
    </View>
  );
});

LineChart.displayName = 'LineChart';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 2,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    fontWeight: '500',
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
