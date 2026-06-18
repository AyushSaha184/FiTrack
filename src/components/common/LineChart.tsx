import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Line, Area, useChartPressState } from 'victory-native';
import { Circle, useFont, vec, LinearGradient as SkiaLinearGradient } from '@shopify/react-native-skia';
import { useColors } from '../../hooks';
import { spacing, typography } from '../../theme';

interface ChartDataPoint {
  date: string;
  value: number;
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

  const isEmpty = data.length === 0;
  const activeData = isEmpty
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: 0,
        };
      })
    : data;

  // If there's only 1 data point, duplicate it to show a flat line from a day ago
  const displayData = [...activeData];
  if (displayData.length === 1 && !isEmpty) {
    displayData.unshift({
      date: '',
      value: displayData[0].value,
    });
  }

  // Transform data for Victory Native - needs numeric x values
  const chartData = displayData.map((d, i) => ({
    x: i,
    y: d.value,
    label: d.date,
  }));

  const values = activeData.map((d) => d.value);
  let minVal = isEmpty ? 0 : Math.floor(Math.min(...values) * 0.95);
  let maxVal = isEmpty ? 100 : Math.ceil(Math.max(...values) * 1.05);
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal - 10);
    maxVal = maxVal + 10;
  }

  // Determine which x-axis labels to show to prevent overlap
  const showEvery = Math.max(1, Math.floor(displayData.length / 6));

  return (
    <View style={[styles.container, { width, height }]}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        domainPadding={{ left: 10, right: 10, top: 20, bottom: 10 }}
        domain={{ y: [minVal, maxVal] }}
        axisOptions={{
          tickCount: { x: Math.min(displayData.length, 7), y: 5 },
          lineColor: 'transparent',
          labelColor: 'rgba(255,255,255,0.4)',
          formatXLabel: (val: number) => {
            const idx = Math.round(val);
            if (idx < 0 || idx >= displayData.length) return '';
            if (idx % showEvery !== 0 && idx !== displayData.length - 1) return '';
            return displayData[idx]?.date || '';
          },
          formatYLabel: (val: number) => {
            if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
            return val % 1 !== 0 ? val.toFixed(1) : val.toFixed(0);
          },
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
            {tooltipValue || data[data.length - 1].value.toLocaleString()}
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
