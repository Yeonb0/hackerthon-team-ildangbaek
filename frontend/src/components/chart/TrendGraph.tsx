// src/components/chart/TrendGraph.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { GraphPoint } from '@/types/report';

type TrendGraphProps = {
  points: GraphPoint[];
  /** S-19(REPORT-01)는 명세 기본값인 막대, S-20(REPORT-02)은 선으로 씁니다. */
  variant?: 'bar' | 'line';
  /** 라벨 포맷터. 기본은 'M/D'만 보여줍니다. */
  formatLabel?: (date: string) => string;
  /**
   * ⚠️ 실제 렌더 폭이 아니라 내부 좌표계 기준값입니다. 실제 폭은 항상 부모 컨테이너에
   * 맞춰 100%로 그려집니다(viewBox로 스케일). 카드 안에 들어갈 때 카드 폭보다 이 값이
   * 크면 그래프가 카드 밖으로 삐져나오는 문제가 있었는데(관리자님 스크린샷 제보,
   * 2026-08-10), 그걸 고치면서 이 prop의 의미가 "고정 픽셀 너비"에서 "좌표계 기준값
   * (사실상 종횡비만 결정)"으로 바뀌었습니다. 대부분은 기본값 그대로 두면 됩니다.
   */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const SCORE_MIN = 0;
const SCORE_MAX = 100;
const PADDING_X = 8;
const PADDING_Y = 12;

/**
 * 기간별 추이 그래프. REPORT-01/02 공용입니다.
 *
 * - 결측(score: null)은 막대·선 어느 쪽에서도 그리지 않고 빈 자리로만 남깁니다.
 *   0점으로 계산하지 않습니다 (REPORT-01 BR1).
 * - variant="line"에서 유효한 점이 1개뿐이면 선을 그릴 수 없으므로 Circle 하나로
 *   폴백합니다(로드맵 Phase 6 6-2 명시 요구사항).
 * - points가 비어 있거나(0일차) 전부 결측이어도 죽지 않고 빈 축 + 안내 문구만 보여줍니다.
 * - 실제 렌더 폭은 항상 부모 컨테이너의 100%입니다(viewBox 스케일링). 카드 padding이나
 *   화면 폭이 얼마든 그 안에 맞춰 그려져서, 카드 밖으로 삐져나오는 문제가 없습니다.
 */
export function TrendGraph({
  points,
  variant = 'bar',
  formatLabel,
  width = s(320),
  height = s(160),
  style,
}: TrendGraphProps) {
  const chartW = width - PADDING_X * 2;
  const chartH = height - PADDING_Y * 2;
  const n = points.length;

  const xAt = (i: number) => PADDING_X + (n <= 1 ? chartW / 2 : (chartW / (n - 1)) * i);
  const yAt = (score: number) =>
    PADDING_Y + chartH - ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * chartH;

  const validPoints = points
    .map((point, i) => ({ ...point, i }))
    .filter((point): point is GraphPoint & { i: number; score: number } => point.score !== null);

  const barWidth = n > 0 ? Math.max(6, chartW / n - 6) : 0;

  return (
    <View style={[styles.container, style]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Line
          x1={PADDING_X}
          y1={PADDING_Y + chartH}
          x2={width - PADDING_X}
          y2={PADDING_Y + chartH}
          stroke={color.ink300}
          strokeWidth={1}
        />

        {variant === 'bar' &&
          validPoints.map((point) => {
            const y = yAt(point.score);
            return (
              <Rect
                key={point.date}
                x={xAt(point.i) - barWidth / 2}
                y={y}
                width={barWidth}
                height={PADDING_Y + chartH - y}
                rx={3}
                fill={color.brand500}
              />
            );
          })}

        {variant === 'line' && validPoints.length >= 2 && (
          <Polyline
            points={validPoints.map((point) => `${xAt(point.i)},${yAt(point.score)}`).join(' ')}
            fill="none"
            stroke={color.brand500}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {variant === 'line' &&
          validPoints.length >= 2 &&
          validPoints.map((point) => (
            <Circle key={point.date} cx={xAt(point.i)} cy={yAt(point.score)} r={3} fill={color.brand700} />
          ))}

        {/* 유효한 점이 정확히 1개면 선 대신 점 하나만 (Polyline은 점 1개로는 그릴 수 없음) */}
        {variant === 'line' && validPoints.length === 1 && (
          <Circle cx={xAt(validPoints[0].i)} cy={yAt(validPoints[0].score)} r={5} fill={color.brand700} />
        )}
      </Svg>

      {validPoints.length === 0 && <Text style={styles.emptyHint}>표시할 기록이 없어요</Text>}

      {n > 0 && (
        <View style={styles.labelRow}>
          <Text style={styles.labelText}>{labelFor(points[0].date, formatLabel)}</Text>
          {n > 1 && <Text style={styles.labelText}>{labelFor(points[n - 1].date, formatLabel)}</Text>}
        </View>
      )}
    </View>
  );
}

function labelFor(date: string, formatLabel?: (date: string) => string) {
  if (formatLabel) return formatLabel(date);
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: space[1],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  labelText: {
    fontSize: 11,
    color: color.ink600,
  },
  emptyHint: {
    fontSize: 12,
    color: color.ink600,
    textAlign: 'center',
  },
});