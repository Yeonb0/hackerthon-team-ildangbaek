// src/components/chart/TrendGraph.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import type { GraphPoint } from '@/types/report';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type TrendGraphProps = {
  points: GraphPoint[];
  /** S-19(REPORT-01)는 명세 기본값인 막대, S-20(REPORT-02)은 선으로 씁니다. */
  variant?: 'bar' | 'line';
  /** 이 날짜와 일치하는 점을 더 크고 다른 색(statusCaution)으로 강조합니다 — Figma
   * RPT-02는 그래프 위에 점선+텍스트 주석까지 있었는데, 관리자님 요청으로 점 강조만
   * 하고 텍스트 주석은 넣지 않았습니다(2026-08-14). line variant에서만 동작합니다. */
  eventDates?: string[];
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
 * 점들을 캣멀롬(Catmull-Rom) 스플라인 → 3차 베지어로 변환해서 부드러운 곡선 path를
 * 만듭니다 — Figma RPT-02의 곡선 그래프처럼 보이게 (관리자님 요청, 2026-08-14).
 * 이전엔 Polyline로 점 사이를 직선으로만 이었습니다.
 */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  }
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/**
 * 기간별 추이 그래프. REPORT-01/02 공용입니다.
 *
 * - 서버는 모닝·나이트를 각각 내려줍니다 (ADR 0012·0013). 이 그래프는 선 하나만
 *   그리므로 나이트를 우선 쓰고 없으면 모닝으로 폴백합니다 — 두 계열을 동시에
 *   그리는 건 별도 작업입니다.
 * - 두 슬롯이 모두 결측인 날은 막대·선 어느 쪽에서도 그리지 않고 빈 자리로만 남깁니다.
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
  eventDates,
  formatLabel,
  width = s(320),
  height = s(160),
  style,
}: TrendGraphProps) {
  const eventDateSet = eventDates ? new Set(eventDates) : null;
  const chartW = width - PADDING_X * 2;
  const chartH = height - PADDING_Y * 2;
  const n = points.length;

  const xAt = (i: number) => PADDING_X + (n <= 1 ? chartW / 2 : (chartW / (n - 1)) * i);
  const yAt = (score: number) =>
    PADDING_Y + chartH - ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * chartH;

  const validPoints = points
    .map((point, i) => ({ date: point.date, i, score: point.nightScore ?? point.morningScore }))
    .filter((point): point is { date: string; i: number; score: number } => point.score !== null);

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
          <Path
            d={buildSmoothPath(validPoints.map((point) => ({ x: xAt(point.i), y: yAt(point.score) })))}
            fill="none"
            stroke={color.brand500}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* 이벤트 날짜 강조. 관리자님 요청(2026-08-14)으로 텍스트 주석은 안 넣고, 이제는
            일반 점(매 포인트마다 찍던 작은 원)도 없앴습니다 — 이벤트 점만 남아서 곡선
            위에 도드라져 보입니다. 처음엔 statusCaution(주황)→blush500(핑크)→최종
            brand700(선/점보다 진한 보라, 명도 대비)로 정착했습니다. */}
        {variant === 'line' &&
          validPoints.length >= 2 &&
          eventDateSet &&
          validPoints
            .filter((point) => eventDateSet.has(point.date))
            .map((point) => (
              <Circle
                key={`event-${point.date}`}
                cx={xAt(point.i)}
                cy={yAt(point.score)}
                r={5}
                fill={color.brand700}
                stroke={color.bg}
                strokeWidth={2}
              />
            ))}

        {/* 유효한 점이 정확히 1개면 선 대신 점 하나만 (곡선을 그릴 수 없음) */}
        {variant === 'line' && validPoints.length === 1 && (
          <Circle cx={xAt(validPoints[0].i)} cy={yAt(validPoints[0].score)} r={5} fill={color.brand500} />
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
    fontSize: adjustFontSize(11),
    ...weightFamily('regular'),
    color: color.ink600,
  },
  emptyHint: {
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
  },
});