// src/components/chart/AreaTrendChart.tsx
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import { weightFamily, adjustFontSize, pinDisplayFont } from '@/theme/typography';

type AreaPoint = { date: string; score: number | null };

type AreaTrendChartProps = {
  points: AreaPoint[];
  /** 선/영역/마지막 점 배지 색상. 기본은 brand500 — 지표별로 쓸 땐 theme의
   * metricAccent[metric]을 넘기세요. */
  accentColor?: string;
  /** 요일/일자 라벨을 전부 보여줄지(7일 뷰) 첫/끝만 보여줄지(30일 뷰 — Figma도
   * 5/10/15/20/25/30만 보여줍니다, 30개를 다 넣으면 겹쳐서 못 읽습니다). */
  labelMode?: 'all' | 'edges';
  /** 이 날짜와 일치하는 점에 작은 원을 찍습니다(2026-08-17 — 리포트 홈 실측 요청).
   * 7일 뷰는 호출부가 전체 날짜를 넘겨 매일 점을 찍고, 30일 뷰는 REPORT-02 이벤트
   * 날짜만 넘겨 이벤트가 있는 날만 점을 찍습니다(TrendGraph의 eventDates와 동일
   * 패턴). 마지막 점은 이미 자체 배지가 있어 중복으로 그리지 않습니다. */
  dotDates?: string[];
  formatLabel?: (date: string) => string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const SCORE_MIN = 0;
const SCORE_MAX = 100;
const PADDING_X = 8;
// 마지막 점 배지를 점 위 가운데에 앉히려면 크기가 고정이어야 합니다(RN transform은
// translateX에 %를 못 써서 marginLeft로 절반을 당깁니다).
const BADGE_WIDTH = 30;
const BADGE_HEIGHT = 17;
// 배지가 위로 삐져나갈 자리를 위쪽 패딩에 확보합니다.
const PADDING_TOP = 26;
// 2026-08-18 — 아래쪽은 26 → 10. 위쪽과 달리 여기엔 아무것도 그리지 않습니다(날짜
// 라벨은 Svg 바깥의 labelRow에 따로 있습니다). 대칭으로 둘 이유가 없어서 줄이고,
// 그만큼을 곡선이 쓰는 높이로 넘겼습니다.
const PADDING_BOTTOM = 10;

// ── 스크러빙(그래프를 짚어 그 날 점수 보기) 관련 상수 ──
// 꾹 눌러야 시작합니다. 리포트 홈이 ScrollView 안이라, 터치 즉시 잡으면 세로 스크롤이
// 그래프 위에서 먹히지 않습니다(관리자 결정, 2026-08-18).
const SCRUB_LONG_PRESS_MS = 200;
const TOOLTIP_WIDTH = 62;
const TOOLTIP_HEIGHT = 34;
/** 말풍선이 점 위로 뜰 자리가 없을 때(점수가 높아 곡선이 천장에 붙을 때) 아래로 뒤집습니다. */
const TOOLTIP_GAP = 8;

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
 * 리포트 홈 종합 점수 카드 / 항목별 추이 카드 전용 미니 차트. TrendGraph(S-19 예전
 * 지표 그래프 · S-20)와 별도 컴포넌트로 뒀습니다 — Figma 실측(210:2437)이 곡선 아래
 * 그라데이션 영역 채움 + 마지막 점 강조 배지까지 요구해서, 기존 TrendGraph의
 * bar/line 두 variant에 조건을 더 얹기보다 새로 만드는 쪽이 더 단순했습니다.
 * TrendGraph는 REPORT-02(요인 상세) 이벤트 강조 로직이 남아 있어 그대로 둡니다.
 */
export function AreaTrendChart({
  points,
  accentColor = color.brand500,
  labelMode = 'edges',
  dotDates,
  formatLabel,
  width = s(320),
  // 2026-08-18(관리자 요청) — 100 → 124 → 150. 위아래 패딩을 빼면 곡선이 실제로 쓰는
  // 높이는 처음엔 48px뿐이었습니다. 아래쪽 패딩 축소(26→10)까지 더해 지금은 114px로,
  // 최초 대비 2.4배입니다. (Svg는 preserveAspectRatio="none"이라 이 값이 곧 실제
  // 렌더 높이입니다.)
  height = s(150),
  style,
}: AreaTrendChartProps) {
  const chartW = width - PADDING_X * 2;
  const chartH = height - PADDING_TOP - PADDING_BOTTOM;
  const n = points.length;

  const xAt = (i: number) => PADDING_X + (n <= 1 ? chartW / 2 : (chartW / (n - 1)) * i);
  const yAt = (score: number) =>
    PADDING_TOP + chartH - ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * chartH;

  const validPoints = points
    .map((point, i) => ({ date: point.date, i, score: point.score }))
    .filter((point): point is { date: string; i: number; score: number } => point.score !== null);

  const dotDateSet = dotDates ? new Set(dotDates) : null;

  const gradientId = `area-${accentColor.replace('#', '')}`;
  const linePath =
    validPoints.length >= 2
      ? buildSmoothPath(validPoints.map((point) => ({ x: xAt(point.i), y: yAt(point.score) })))
      : '';
  const areaPath =
    validPoints.length >= 2
      ? `${linePath} L ${xAt(validPoints[validPoints.length - 1].i)},${PADDING_TOP + chartH} L ${xAt(
          validPoints[0].i,
        )},${PADDING_TOP + chartH} Z`
      : '';

  const lastPoint = validPoints[validPoints.length - 1];

  // ───────────────────────── 스크러빙 ─────────────────────────
  // Svg가 width="100%" + preserveAspectRatio="none"라, 위 좌표들은 전부 viewBox 기준이고
  // 실제 렌더 폭은 런타임에만 압니다. 손가락 x는 실제 px로 들어오므로 폭을 재서 환산합니다.
  // (세로는 Svg height와 viewBox height가 같아 1:1이라 환산이 필요 없습니다.)
  const [layoutW, setLayoutW] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayoutW(event.nativeEvent.layout.width);
  };

  // 손가락에서 가장 가까운 "기록이 있는" 점으로 스냅합니다. 결측일(score null)에 멈춰서
  // 빈 말풍선이 뜨는 걸 막습니다 — 그래프도 결측은 건너뛰고 그리고 있습니다.
  const pickIndex = (touchX: number): number | null => {
    if (layoutW <= 0 || validPoints.length === 0) return null;
    const viewBoxX = (touchX / layoutW) * width;
    let nearest = validPoints[0];
    let nearestDistance = Infinity;
    for (const point of validPoints) {
      const distance = Math.abs(xAt(point.i) - viewBoxX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = point;
      }
    }
    return nearest.i;
  };

  const scrubGesture = useMemo(
    () =>
      Gesture.Pan()
        // 제스처 콜백에서 setState를 부르므로 워클릿이 아니라 JS 스레드로 돌립니다.
        // 인덱스가 바뀔 때만 리렌더라 30점 기준으로도 부담이 없습니다.
        .runOnJS(true)
        // onBegin이 아니라 onStart입니다 — onBegin은 터치 즉시라 롱프레스 대기가 무의미해집니다.
        .activateAfterLongPress(SCRUB_LONG_PRESS_MS)
        .shouldCancelWhenOutside(false)
        .onStart((event) => setActiveIndex(pickIndex(event.x)))
        .onUpdate((event) => setActiveIndex(pickIndex(event.x)))
        .onFinalize(() => setActiveIndex(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutW, width, n, validPoints.length],
  );

  const activePoint =
    activeIndex === null ? null : (validPoints.find((point) => point.i === activeIndex) ?? null);

  // 말풍선/세로선 위치는 실제 px로 계산합니다. %로 두면 양 끝에서 화면 밖으로 나가는데,
  // 폭을 이미 재고 있으니 px로 잡아야 가장자리 보정을 할 수 있습니다.
  const activeX = activePoint ? (xAt(activePoint.i) / width) * layoutW : 0;
  const activeY = activePoint ? yAt(activePoint.score) : 0;
  const tooltipBelow = activeY - TOOLTIP_HEIGHT - TOOLTIP_GAP < 0;
  const tooltipLeft = Math.max(0, Math.min(layoutW - TOOLTIP_WIDTH, activeX - TOOLTIP_WIDTH / 2));

  return (
    <GestureDetector gesture={scrubGesture}>
      <View style={[styles.container, style]} onLayout={handleLayout}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accentColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={accentColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {areaPath !== '' && <Path d={areaPath} fill={`url(#${gradientId})`} />}

          {linePath !== '' && (
            <Path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {validPoints.length === 1 && (
            <Circle
              cx={xAt(validPoints[0].i)}
              cy={yAt(validPoints[0].score)}
              r={5}
              fill={accentColor}
            />
          )}

          {dotDateSet &&
            validPoints
              .filter((point) => point.i !== lastPoint?.i && dotDateSet.has(point.date))
              .map((point) => (
                <Circle
                  key={`dot-${point.date}`}
                  cx={xAt(point.i)}
                  cy={yAt(point.score)}
                  r={3}
                  fill={accentColor}
                  stroke={color.bg}
                  strokeWidth={1.5}
                />
              ))}

          {lastPoint && (
            <Circle
              cx={xAt(lastPoint.i)}
              cy={yAt(lastPoint.score)}
              r={4}
              fill={accentColor}
              stroke={color.bg}
              strokeWidth={2}
            />
          )}
        </Svg>

        {lastPoint && activePoint === null && (
          <View
            style={[
              styles.lastPointBadge,
              {
                backgroundColor: accentColor,
                // 점 바로 "위"에 가운데 정렬로 띄웁니다(2026-08-17 관리자 제보 — 예전엔
                // left가 점의 왼쪽 끝에 붙어 배지가 오른쪽으로 뻗었고, top엔 퍼센트로
                // 계산한 값을 px 자리에 넘겨서 세로 위치도 어긋났습니다).
                // left는 %(뷰박스가 가로로 늘어나므로), top은 px(Svg height가 실제 px).
                left: `${(xAt(lastPoint.i) / width) * 100}%`,
                marginLeft: -BADGE_WIDTH / 2,
                top: Math.max(0, yAt(lastPoint.score) - BADGE_HEIGHT - 6),
              },
            ]}
          >
            <Text style={styles.lastPointText}>{lastPoint.score}</Text>
          </View>
        )}

        {activePoint && (
          <>
            {/* 세로 기준선 — 곡선 영역(PADDING_TOP ~ 바닥)만 덮습니다. */}
            <View
              style={[
                styles.scrubLine,
                {
                  left: activeX,
                  top: PADDING_TOP,
                  height: chartH,
                  backgroundColor: accentColor,
                },
              ]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.scrubDot,
                { left: activeX - 6, top: activeY - 6, borderColor: accentColor },
              ]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.scrubTooltip,
                {
                  left: tooltipLeft,
                  top: tooltipBelow
                    ? activeY + TOOLTIP_GAP
                    : activeY - TOOLTIP_HEIGHT - TOOLTIP_GAP,
                  backgroundColor: accentColor,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.scrubTooltipDate}>{labelFor(activePoint.date, formatLabel)}</Text>
              <Text style={styles.scrubTooltipScore}>{activePoint.score}</Text>
            </View>
          </>
        )}

        {validPoints.length === 0 && <Text style={styles.emptyHint}>표시할 기록이 없어요</Text>}

        {n > 0 && (
          <View style={styles.labelRow}>
            {labelMode === 'all' ? (
              points.map((point) => (
                <Text key={point.date} style={styles.labelText}>
                  {labelFor(point.date, formatLabel)}
                </Text>
              ))
            ) : (
              <>
                <Text style={styles.labelText}>{labelFor(points[0].date, formatLabel)}</Text>
                {n > 1 && (
                  <Text style={styles.labelText}>{labelFor(points[n - 1].date, formatLabel)}</Text>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 7일 뷰에서 Figma처럼 요일(월~일)로 보여줍니다. 30일 뷰는 formatLabel로 'N일' 포맷을 넘기세요. */
export function weekdayLabel(date: string): string {
  const d = new Date(date);
  return WEEKDAY_LABELS[d.getDay()];
}

function labelFor(date: string, formatLabel?: (date: string) => string) {
  if (formatLabel) return formatLabel(date);
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

const styles = StyleSheet.create({
  container: {
    // 2026-08-18(관리자 요청) — 그래프 가로를 양쪽에서 8px씩 좁힙니다. 카드 안에서
    // 선이 가장자리까지 꽉 차 있어 여백이 부족해 보였습니다.
    //
    // ⚠️ `width: '100%'`를 두면 안 됩니다. 폭이 부모 100%로 먼저 고정된 뒤 왼쪽 margin이
    // 통째로 밀어내서, 왼쪽만 들어가고 오른쪽은 8px 넘쳐 나갑니다(관리자 제보). 세로
    // 방향 부모의 기본 stretch에 맡기면 margin만큼 양쪽이 같이 줄어듭니다.
    //
    // ⚠️ padding이 아니라 margin인 이유: 마지막 점 배지가 이 컨테이너 기준
    // position:absolute + left:'%'로 앉는데, padding을 주면 배지의 % 기준(패딩 박스)과
    // Svg의 실제 폭이 어긋나 배지가 점에서 밀려납니다.
    alignSelf: 'stretch',
    marginHorizontal: space[2],
    gap: space[1],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  labelText: {
    fontSize: adjustFontSize(9),
    ...weightFamily('medium'),
    color: color.textMuted,
  },
  emptyHint: {
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
  },
  lastPointBadge: {
    position: 'absolute',
    width: BADGE_WIDTH,
    height: BADGE_HEIGHT,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubLine: {
    position: 'absolute',
    width: 1,
    opacity: 0.45,
  },
  scrubDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    backgroundColor: color.bg,
  },
  scrubTooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    height: TOOLTIP_HEIGHT,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubTooltipDate: {
    fontSize: adjustFontSize(9),
    ...weightFamily('medium'),
    color: color.white,
    opacity: 0.85,
  },
  scrubTooltipScore: {
    // 주아체 자리 — 마지막 점 배지와 같은 이유로 adjustFontSize를 쓰지 않습니다
    // (말풍선이 62×34 고정이라 글자만 커지면 넘칩니다).
    fontSize: 13,
    lineHeight: 17,
    ...pinDisplayFont('bmjua'),
    color: color.white,
  },
  lastPointText: {
    // 주아체 자리 — adjustFontSize를 쓰지 않습니다(typography.ts 규약). 배지가
    // 30×17 고정이라 글자만 커지면 원 밖으로 삐져나옵니다.
    // 9 → 11로 올렸습니다: 주아체는 본문 글꼴보다 x-height가 낮아 같은 pt에서 더
    // 작아 보이는데, 9pt 흰 글씨로는 두 자리가 읽히지 않습니다.
    fontSize: 11,
    ...pinDisplayFont('bmjua'),
    color: color.white,
  },
});