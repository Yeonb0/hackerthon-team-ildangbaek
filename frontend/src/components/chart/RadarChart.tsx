// src/components/chart/RadarChart.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { color } from '@/theme/tokens';
import { s } from '@/lib/scale';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

export type RadarChartItem = {
  key: string;
  label: string;
  /** 0~100, 높을수록 좋음을 가정합니다 (MetricScoreList와 동일 규칙) */
  score: number;
  /** 축 라벨 아래 점수를 그릴 때 쓰는 지표 고유색. 미지정 시 brand500. */
  accent?: string;
};

type RadarChartProps = {
  items: RadarChartItem[];
  size?: number;
  /**
   * 축 라벨 아래에 점수를 함께 그립니다 (S-18 TodaySkin, Figma 118:9474~118:9485).
   * 기본값 false — 기존 카탈로그 호출부의 모양이 바뀌지 않게 옵트인으로 둡니다.
   */
  showValues?: boolean;
  style?: StyleProp<ViewStyle>;
};

const LABEL_MARGIN = 32;
const LABEL_OFFSET = 18;

/**
 * n각형 범용 레이더 차트. items.length(n)가 몇 개든(3/4/6...) 그대로 그립니다 —
 * 지표 개수를 하드코딩하지 않습니다 (로드맵 Phase 6 6-1 원안).
 *
 * ⚠️ 실제 화면(S-19/S-20)에는 배치돼 있지 않습니다. REPORT-01/02 API는 "지표 하나를
 * 골라 기간별 추이"를 주는 구조라, 레이더에 필요한 "여러 지표를 한 시점에" 데이터를
 * 거기서 받을 수 없습니다 — 그런 스냅샷 형태는 SKIN-01/02(S-18)에만 있고 S-18은 이미
 * MetricScoreList로 구현이 끝나 있습니다. 관리자 확인(2026-08-10)에 따라 컴포넌트만
 * 미리 준비해 카탈로그에 등록해두고, 실제 배치는 기획 확인 후 별도로 결정합니다.
 */
export function RadarChart({ items, size = s(240), showValues = false, style }: RadarChartProps) {
  const n = items.length;
  const center = size / 2;
  const radius = size / 2 - LABEL_MARGIN;

  if (n < 3) {
    return (
      <View style={[styles.wrapper, { width: size, height: size }, style]}>
        <Text style={styles.notice}>레이더 표시에는 지표가 3개 이상 필요해요</Text>
      </View>
    );
  }

  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2; // 12시 방향에서 시작
  const pointAt = (i: number, r: number) => {
    const angle = angleAt(i);
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  // 왼쪽 축은 end, 오른쪽 축은 start, 위/아래는 middle — 안 나누면 라벨이 도형을 파고듭니다.
  const anchorAt = (i: number): 'start' | 'middle' | 'end' => {
    const cos = Math.cos(angleAt(i));
    if (cos > 0.3) return 'start';
    if (cos < -0.3) return 'end';
    return 'middle';
  };

  const outline = items.map((_, i) => pointAt(i, radius));
  const outlinePoints = outline.map((p) => `${p.x},${p.y}`).join(' ');

  const data = items.map((item, i) => pointAt(i, (radius * clampScore(item.score)) / 100));
  const dataPoints = data.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {items.map((item, i) => {
          const axisEnd = pointAt(i, radius);
          return (
            <Line
              key={`axis-${item.key}`}
              x1={center}
              y1={center}
              x2={axisEnd.x}
              y2={axisEnd.y}
              stroke={color.ink300}
              strokeWidth={1}
            />
          );
        })}

        <Polygon points={outlinePoints} fill="none" stroke={color.ink300} strokeWidth={1} />

        <Polygon
          points={dataPoints}
          fill={color.brand500}
          fillOpacity={0.25}
          stroke={color.brand700}
          strokeWidth={2}
        />

        {data.map((p, i) => (
          <Circle key={`dot-${items[i].key}`} cx={p.x} cy={p.y} r={3} fill={color.brand700} />
        ))}

        {items.map((item, i) => {
          const labelPos = pointAt(i, radius + LABEL_OFFSET);
          const anchor = anchorAt(i);
          return (
            <React.Fragment key={`label-${item.key}`}>
              <SvgText
                x={labelPos.x}
                y={showValues ? labelPos.y - 6 : labelPos.y}
                fontSize={showValues ? 11 : 12}
                fontWeight={showValues ? 'bold' : 'normal'}
                fill={showValues ? color.textInk : color.ink900}
                textAnchor={anchor}
                alignmentBaseline="middle"
              >
                {item.label}
              </SvgText>
              {showValues ? (
                <SvgText
                  x={labelPos.x}
                  y={labelPos.y + 8}
                  fontSize={10}
                  fontWeight="bold"
                  fill={item.accent ?? color.brand500}
                  textAnchor={anchor}
                  alignmentBaseline="middle"
                >
                  {item.score}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
