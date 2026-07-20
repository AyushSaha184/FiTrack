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
}

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

export const LineChart = memo<LineChartProps>(({
  data,
  width,
  height,
  yAxisLabel,
  showTooltip = true,
  tooltipValue,
  areaFill = true,
  lineColor,
}) => {
  const colors = useColors();
  const color = lineColor || colors.text;

  const processedData = useMemo(() => downsampleData(data, 30), [data]);

  // Load Skia font for Victory Native canvas axis labels
  const font = useMemo(() => {
    const fontFamily = Platform.select({ ios: 'Helvetica', android: 'sans-serif' }) || 'sans-serif';
    return matchFont({
      fontFamily,
      fontSize: 10,
      fontWeight: '500',
    });
  }, []);

  const getY = (d: ChartDataPoint) => ((d as any).y !== undefined ? (d as any).y : d.value);
  const getLabel = (d: ChartDataPoint) => d.date || '';

  const isEmpty = processedData.length === 0;
  const activeData = isEmpty
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: 0,
        } as ChartDataPoint;
      })
    : processedData;

  // If there's only 1 data point, duplicate it to show a flat line from a day ago
  const displayData = [...activeData];
  if (displayData.length === 1 && !isEmpty) {
    displayData.unshift({
      date: '',
      value: getY(displayData[0]),
    } as ChartDataPoint);
  }

  // Transform data for Victory Native - needs index-based x values (0, 1, 2, ...)
  const chartData = displayData.map((d, i) => ({
    x: i,
    y: getY(d),
    label: getLabel(d) || String(i + 1),
  }));

  const values = displayData.map((d) => getY(d));
  let minVal = isEmpty ? 0 : Math.floor(Math.min(...values) * 0.95);
  let maxVal = isEmpty ? 100 : Math.ceil(Math.max(...values) * 1.05);
  if (minVal === maxVal || !Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
    minVal = 0;
    maxVal = 100;
  }

  // Determine which x-axis labels to show to prevent overlap
  const showEvery = Math.max(1, Math.floor(displayData.length / 6));

  // Format Y-axis labels based on data magnitude
  const formatYLabel = (val: number): string => {
    // For steps (large numbers)
    if (val >= 10000) {
      return `${(val / 1000).toFixed(0)}K`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    // For weight / small numbers
    return val % 1 !== 0 ? val.toFixed(1) : val.toFixed(0);
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        domainPadding={{ left: 16, right: 16, top: 20, bottom: 30 }}
        domain={{ y: [minVal, maxVal] }}
        axisOptions={{
          font,
          tickCount: { x: Math.max(1, Math.min(displayData.length, 6)), y: 4 },
          lineColor: 'rgba(255,255,255,0.08)',
          labelColor: 'rgba(255,255,255,0.5)',
          formatXLabel: (val: number) => {
            const idx = Math.round(val);
            if (idx < 0 || idx >= chartData.length) return '';
            if (idx % showEvery !== 0 && idx !== chartData.length - 1) return '';
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
