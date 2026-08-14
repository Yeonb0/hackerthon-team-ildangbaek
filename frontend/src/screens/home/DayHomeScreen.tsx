import React, { useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { EnvironmentCard } from '@/components/domain/EnvironmentCard';
import { EnvironmentTipCard } from '@/components/domain/EnvironmentTipCard';
import { RoutineRecommendationList } from '@/components/domain/RoutineRecommendationList';
import { s } from '@/lib/scale';
import { color, radius, space, typography } from '@/theme';
import type { HomeResponse } from '@/types/home';

type DayHomeScreenProps = {
  data: HomeResponse;
  /** 낮/밤 토글 — HomeScreen(부모)이 만들어서 내려줍니다. Figma HOME-01 기준으로 위치 텍스트와
   * 같은 줄, 오른쪽 정렬로 여기서 렌더링합니다 (Phase 12, 관리자님 확인 2026-08-13). */
  toggle: React.ReactNode;
  onPressRecordCta: () => void;
};

// 로드맵 4-5(Collapsing header, B안) 그대로 — 환경 정보 블록(온도·날씨·배지)을 스크롤에 따라
// s(150) → s(92)으로 줄입니다. 높이는 useNativeDriver: true를 못 쓰기 때문에(네이티브
// 드라이버가 layout 속성을 애니메이션 못 함) false로 둡니다. 나중에 성능이 문제되면
// 로드맵 안내대로 height 대신 translateY+opacity 조합으로 바꾸면 native driver를 쓸 수 있습니다.
const HEADER_EXPANDED_HEIGHT = s(150);
const HEADER_COLLAPSED_HEIGHT = s(92); // padding(20×2) + location(18) + gap(8) + weather(36) 딱 맞는 높이
const HEADER_COLLAPSE_SCROLL_RANGE = s(120);

/**
 * S-07 낮 홈.
 *
 * 배경 그라데이션은 brand50→brand100 고정 2단 그라데이션입니다. Checkpoint 9-D에서
 * brand50/100이 라벤더 톤으로 바뀌면서 배경도 자동으로 옅은 라벤더 느낌이 됐습니다
 * (관리자 결정 — 낮은 하늘색 기조 유지 + 살짝만 색감 변화, 2026-08-11). 날씨별
 * 그라데이션 팔레트로 나누는 원래 계획은 디자인 쪽 색상표가 아직 없어서(Figma
 * Variables 미확정) 보류 상태이고, 확정되면 이 파일의 colors 배열만 날씨 조건별
 * 분기로 바꾸면 됩니다.
 *
 * Collapsing header는 환경 정보 블록(온도·날씨·배지)에만 적용했습니다 — 위치+토글 행은
 * Figma처럼 항상 고정으로 보이고, 화장대 일러스트 자리는 그 아래 고정 블록으로 둡니다.
 * 밤 홈은 이 영역이 아예 없어서(environment: null) 체크포인트 C 범위에서 제외했습니다.
 */
export function DayHomeScreen({ data, toggle, onPressRecordCta }: DayHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const hasEnvironmentFailure = data.failedSections.some((f) => f.section === 'environment');
  const morningSlot = data.todayRecord.morning;
  const morningCompleted = morningSlot.productCompleted && morningSlot.skinCompleted;

  // useRef().current 대신 useState 지연 초기화를 씁니다 — ESLint의 react-hooks/refs 규칙이
  // "렌더링 중 ref 접근"을 금지해서, useRef(new Animated.Value(0)).current 형태를 에러로 잡습니다.
  // setScrollY는 안 씁니다 — Animated.Value는 리렌더 없이 자체적으로 값이 바뀌는 객체라
  // 최초 1회 만든 인스턴스만 안정적으로 유지되면 충분합니다.
  const [scrollY] = useState(() => new Animated.Value(0));
  const environmentHeight = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_SCROLL_RANGE],
    outputRange: [HEADER_EXPANDED_HEIGHT, HEADER_COLLAPSED_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient colors={[color.brand50, color.brand100]} style={styles.gradient}>
      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[3] }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        <View style={styles.headerRow}>
          <Text style={styles.location}>{data.environment?.location ?? ''}</Text>
          {toggle}
        </View>

        {/* greeting은 관리자 메모: 추후 기획에서 빠질 수도 있어서 조건부 렌더링으로 방어 */}
        {data.greeting ? <Text style={styles.greeting}>{data.greeting}</Text> : null}

        <Animated.View
          style={[styles.section, styles.environmentClip, { height: environmentHeight }]}
        >
          <EnvironmentCard environment={data.environment} hasFailed={hasEnvironmentFailure} />
        </Animated.View>

        {/* Figma HOME-01의 화장대 일러스트 자리 — SVG 에셋이 아직 없어서(체크포인트 A 시점
            결정) Figma 원본과 같은 방식(점선 박스 + 안내 텍스트)의 자리표시자로 둡니다.
            실제 에셋이 오면 이 View를 이미지로 교체하면 됩니다. */}
        <View style={styles.illustrationPlaceholder}>
          <Text style={styles.illustrationPlaceholderText}>(화장대 일러스트)</Text>
        </View>

        {data.environment && !hasEnvironmentFailure && (
          <EnvironmentTipCard environment={data.environment} style={styles.section} />
        )}

        <RoutineRecommendationList
          timeSlot={data.routineRecommendation.timeSlot}
          items={data.routineRecommendation.items}
          style={styles.section}
        />

        {/* Figma HOME-01은 미니멀 텍스트 링크였지만, 관리자님이 기존 그라데이션 버튼 느낌으로
            되돌려달라고 하셔서(2026-08-14) 원래 스타일로 복원했습니다. 완료 여부에 따른
            라벨 전환은 그대로 유지합니다. */}
        <Button
          label={morningCompleted ? '오늘 모닝루틴 완료!' : '모닝루틴 기록하러 가기'}
          onPress={onPressRecordCta}
          variant="gradient"
          style={styles.cta}
        />
      </Animated.ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    padding: space[5],
    paddingBottom: space[8],
    gap: space[5],
  },
  greeting: {
    ...typography.h1,
    color: color.ink900,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  location: {
    ...typography.caption,
    color: color.ink600,
  },
  section: {
    width: '100%',
  },
  environmentClip: {
    overflow: 'hidden',
    // Card 컴포넌트의 radius.lg와 맞춰야 접힌 상태에서도 아래쪽이 각지지 않고
    // 둥글게 클리핑됩니다. overflow:hidden 경계 자체가 각져 있으면 Card가 둥글어도
    // 잘리는 순간 직선으로 잘려 보입니다.
    borderRadius: radius.lg,
  },
  illustrationPlaceholder: {
    height: s(160),
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink300,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationPlaceholderText: {
    ...typography.caption,
    color: color.ink300,
  },
  cta: {
    marginTop: space[2],
  },
});