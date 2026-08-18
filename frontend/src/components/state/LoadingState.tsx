import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';
import { adjustFontSize, weightFamily } from '@/theme/typography';

type LoadingStateProps = {
  /**
   * spinner — 단순 스피너.
   * skeleton — 회색 바 n줄. 레이아웃 모양을 흉내내지 않는 범용 형태입니다.
   * listRows — Figma LoadingSkeleton(59:8063). 썸네일 + 텍스트 2줄 + 우측 알약 구조라
   *   제품/성분처럼 "이미지가 붙은 목록"을 불러오는 화면에 맞습니다.
   */
  variant?: 'spinner' | 'skeleton' | 'listRows';
  /** skeleton일 때 보여줄 줄 수 (기본 3) */
  skeletonLines?: number;
  /** listRows일 때 보여줄 행 수 (기본 3, Figma 실측) */
  rows?: number;
  /** listRows 하단 문구. null을 넘기면 숨깁니다. */
  caption?: string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * 로딩 상태.
 *
 * listRows는 Figma가 제시한 뼈대 배치를 그대로 옮긴 것입니다 — 실제 목록과 같은 자리에
 * 같은 크기의 회색 블록을 놓아, 데이터가 도착했을 때 레이아웃이 튀지 않게 합니다.
 * 뼈대 색은 회색(ink300)이 아니라 연라벤더(surfaceLavenderHeader)입니다: 무채색
 * 스켈레톤은 이 앱의 보라 톤 위에서 "고장 난 화면"처럼 보입니다.
 */
export function LoadingState({
  variant = 'spinner',
  skeletonLines = 3,
  rows = 3,
  caption = '불러오는 중...',
  style,
}: LoadingStateProps) {
  if (variant === 'listRows') {
    return (
      <View style={[styles.listContainer, style]}>
        <View style={styles.listHeading}>
          <View style={[styles.bone, styles.headingBone]} />
          <View style={[styles.bone, styles.headingSubBone]} />
        </View>

        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={styles.row}>
            <View style={styles.thumb} />
            <View style={styles.rowText}>
              <View style={[styles.bone, styles.rowTitleBone]} />
              <View style={[styles.bone, styles.rowSubBone]} />
            </View>
            <View style={[styles.bone, styles.rowPillBone]} />
          </View>
        ))}

        <View style={styles.paragraph}>
          <View style={[styles.bone, styles.paragraphBoneFull]} />
          <View style={[styles.bone, styles.paragraphBoneMid]} />
          <View style={[styles.bone, styles.paragraphBoneShort]} />
        </View>

        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    );
  }

  if (variant === 'skeleton') {
    return (
      <View style={[styles.skeletonContainer, style]}>
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <View key={i} style={styles.skeletonLine} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size="large" color={color.brand500} />
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  skeletonContainer: {
    padding: space[5],
    gap: space[3],
  },
  skeletonLine: {
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: color.ink300,
    opacity: 0.4,
  },

  // ── listRows (Figma 59:8063) ──
  listContainer: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
    gap: space[5],
  },
  bone: {
    backgroundColor: color.surfaceLavenderHeader,
    borderRadius: radius.pill,
  },
  listHeading: {
    gap: space[2],
  },
  // Figma는 px 고정 폭(233/117 등)이지만 화면 폭이 제각각이라 비율로 옮겼습니다 —
  // 기준 화면(390pt, 좌우 여백 20) 대비 환산값입니다.
  headingBone: {
    height: 20,
    width: '67%',
  },
  headingSubBone: {
    height: 16,
    width: '33%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[1],
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: color.surfaceLavenderHeader,
  },
  rowText: {
    flex: 1,
    gap: space[2],
  },
  rowTitleBone: {
    height: 14,
    width: '75%',
  },
  rowSubBone: {
    height: 12,
    width: '50%',
  },
  rowPillBone: {
    height: 24,
    width: 56,
  },
  paragraph: {
    gap: space[2],
    paddingTop: space[2],
  },
  paragraphBoneFull: {
    height: 12,
    width: '100%',
  },
  paragraphBoneMid: {
    height: 12,
    width: '80%',
  },
  paragraphBoneShort: {
    height: 12,
    width: '67%',
  },
  caption: {
    fontSize: adjustFontSize(12.5),
    ...weightFamily('medium'),
    color: color.textMuted,
    textAlign: 'center',
    paddingTop: space[2],
  },
});
