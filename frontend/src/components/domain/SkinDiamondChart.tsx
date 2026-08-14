// src/components/domain/SkinDiamondChart.tsx
//
// S-18 분석결과(FACE-06) — Figma의 "DiamondChart"를 react-native-svg로 구현했습니다
// (관리자님 요청, 2026-08-14). 지표 4개(트러블/홍조/색소침착/모공, 팀 최종 확정)를
// 위/오른쪽/아래/왼쪽 4축에 고정 배치합니다 — 개수 가변 대응은 안 합니다, 이 4개가
// 이미 확정 사항이라 범용화할 이유가 없습니다.
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import type { MetricListItem } from '@/api/adapters';
import { color, typography } from '@/theme';

type SkinDiamondChartProps = {
  /** 정확히 4개를 기대합니다 — 순서대로 위/오른쪽/아래/왼쪽 축에 배치됩니다. */
  items: MetricListItem[];
  style?: StyleProp<ViewStyle>;
};

const SIZE = 300;
const CENTER = SIZE / 2;
const MAX_RADIUS = 80;
const LABEL_OFFSET = 30;
const LABEL_WIDTH = 68;

// 위(−90°) → 오른쪽(0°) → 아래(90°) → 왼쪽(180°), 시계방향. Figma DiamondChart와 같은 배치.
const ANGLES = [-90, 0, 90, 180];

function pointAt(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

export function SkinDiamondChart({ items, style }: SkinDiamondChartProps) {
  // 4개가 아니면 좌표 배치 가정이 깨져서 그리지 않습니다 — 호출부(SkinResultScreen)가
  // 대신 막대 리스트로 폴백합니다.
  if (items.length !== 4) return null;

  const dataPoints = items.map((item, i) =>
    pointAt(ANGLES[i], (Math.max(0, Math.min(100, item.score)) / 100) * MAX_RADIUS)
  );
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const gridLevels = [0.33, 0.66, 1];

  return (
    <View style={[styles.container, style]}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {ANGLES.map((angle, i) => {
          const p = pointAt(angle, MAX_RADIUS);
          return (
            <Line
              key={`axis-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke={color.ink300}
              strokeWidth={1}
            />
          );
        })}
        {gridLevels.map((level, i) => (
          <Polygon
            key={`grid-${i}`}
            points={ANGLES.map((angle) => {
              const p = pointAt(angle, MAX_RADIUS * level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke={color.ink300}
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
        <Polygon
          points={polygonPoints}
          fill={color.brand500}
          fillOpacity={0.22}
          stroke={color.brand500}
          strokeWidth={2}
        />
        {dataPoints.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill={color.brand500} />
        ))}
      </Svg>

      {items.map((item, i) => {
        const p = pointAt(ANGLES[i], MAX_RADIUS + LABEL_OFFSET);
        // 방향별 앵커: 위/아래는 점 기준 가로 중앙(고정폭 박스), 오른쪽/왼쪽은 점에서
        // 바깥쪽으로만 뻗어나가는 auto-width 박스입니다(고정폭이면 컨테이너 밖으로
        // 넘쳐서 어긋나 보였던 원인). react-native-web이 아니라 RN이라 left/right를
        // 섞어 써도 안전합니다.
        if (i === 0) {
          return (
            <View
              key={item.key}
              style={[
                styles.axisLabel,
                { left: p.x - LABEL_WIDTH / 2, top: p.y - 22, width: LABEL_WIDTH, alignItems: 'center' },
              ]}
            >
              <Text style={styles.axisLabelText}>{item.label}</Text>
            </View>
          );
        }
        if (i === 2) {
          return (
            <View
              key={item.key}
              style={[
                styles.axisLabel,
                { left: p.x - LABEL_WIDTH / 2, top: p.y + 6, width: LABEL_WIDTH, alignItems: 'center' },
              ]}
            >
              <Text style={styles.axisLabelText}>{item.label}</Text>
            </View>
          );
        }
        if (i === 1) {
          return (
            <View key={item.key} style={[styles.axisLabel, { left: p.x + 4, top: p.y - 9 }]}>
              <Text style={styles.axisLabelText}>{item.label}</Text>
            </View>
          );
        }
        return (
          <View key={item.key} style={[styles.axisLabel, { right: SIZE - p.x + 4, top: p.y - 9 }]}>
            <Text style={styles.axisLabelText}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  axisLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  axisLabelText: {
    ...typography.caption,
    color: color.ink600,
    fontWeight: '600',
    textAlign: 'center',
  },
});