import React, { useState } from 'react';
import { Animated, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { EnvironmentCard } from '@/components/domain/EnvironmentCard';
import { EnvironmentTipCard } from '@/components/domain/EnvironmentTipCard';
import { RoutineRecommendationList } from '@/components/domain/RoutineRecommendationList';
import { s } from '@/lib/scale';
import { getWeatherBackground } from '@/lib/weather';
import { color, radius, space, typography } from '@/theme';
import type { HomeResponse } from '@/types/home';
import { weightFamily } from '@/theme/typography';

// 날씨 배경 에셋 원본 비율(가로 760 × 세로 837 — assets/weather/*.jpg 공통 리사이즈 크기).
// 컨테이너 높이를 헤더 콘텐츠 길이에 맞춰 자동으로 잡으면 이 비율과 어긋나서
// resizeMode="cover"가 과하게 확대/크롭 — 위쪽이 잘리고 이미지 하단의 화장대가 크롭
// 범위 밖으로 밀려나는 문제가 있었습니다(2026-08-16 관리자님 리포트).
const WEATHER_BG_ASPECT_RATIO = 760 / 837;
// 2026-08-16 — 화장대(원본 이미지의 57% 지점부터 시작)와 해(34~48% 지점) 사이에 빈
// 하늘 구간이 있어서, 해가 보이도록 위쪽을 조금만 자르면(0.92) 그 빈 하늘이 그대로
// 화면에 나와 "자외선 지수가 높아요" 카드 위에 큰 여백으로 보였습니다. 관리자님이 해
// 노출보다 그 여백 제거를 우선하기로 하셔서 0.92 → 0.65로 더 잘라냈습니다 — 해는
// 대부분 잘리지만, 화장대가 헤더 콘텐츠 바로 아래에 붙어서 여백이 크게 줄어듭니다.
const HERO_HEIGHT_SCALE = 0.92;

type DayHomeScreenProps = {
  data: HomeResponse;
  /** 낮/밤 토글 — HomeScreen(부모)이 만들어서 내려줍니다. Figma HOME-01 기준으로 위치 텍스트와
   * 같은 줄, 오른쪽 정렬로 여기서 렌더링합니다 (Phase 12, 관리자님 확인 2026-08-13). */
  toggle: React.ReactNode;
  onPressRecordCta: () => void;
};

// 로드맵 4-5(Collapsing header, B안) — 환경 정보 블록(온도·배지)을 스크롤에 따라
// s(128) → s(105)으로 줄이는 애니메이션입니다. 2026-08-16 — 이번 요청으로 스크롤 자체를
// 껐기 때문에(scrollEnabled=false, 아래 참고) scrollY가 더 이상 바뀌지 않아 이 collapse
// 로직은 사실상 항상 EXPANDED 값 그대로 멈춰 있는 죽은 코드가 됐습니다. 나중에 스크롤을
// 다시 켤 일이 있으면 그대로 되살아나므로 일단 지우지 않고 남겨뒀습니다.
// 128(EXPANDED) 값 자체는 온도 폰트가 58→64로 커지면서 배지 줄까지 합쳐 실제 필요
// 높이가 ~115였는데 기존 110이 그보다 작아서 배지 아랫부분이 살짝 잘렸던 버그를
// 고친 값입니다(관리자님 리포트, 2026-08-16).
const HEADER_EXPANDED_HEIGHT = s(128);
const HEADER_COLLAPSED_HEIGHT = s(105);
const HEADER_COLLAPSE_SCROLL_RANGE = s(120);

/**
 * S-07 낮 홈.
 *
 * 2026-08-16 — 헤더(위치·인사말·환경카드) 뒤에 날씨별 화장대 일러스트 배경을 깔았습니다
 * (디자이너 전달, background-image 문서). 원본 PNG엔 알파 채널이 없어서(RGB) 이미지
 * 자체를 마스킹하는 대신, 이미지 위에 투명→surfaceLavenderPale(#F5F2FF) LinearGradient를
 * 겹쳐서 하단이 배경색으로 자연스럽게 녹아드는 것처럼 보이게 했습니다 — 도착색이 페이지
 * 배경색과 완전히 같아서 실제 마스킹과 결과물이 동일합니다.
 * 화면 전체 배경도 기존 brand50→brand100 2단 그라데이션에서 단색 surfaceLavenderPale로
 * 바꿨습니다(문서가 명시한 도착색과 정확히 맞추기 위함 — brand50과 거의 같은 색이라
 * 육안으로는 차이가 거의 없습니다).
 *
 * 헤더 영역(위치+인사말+환경카드)을 통째로 하나의 히어로 컨테이너로 묶어서 그 뒤에
 * 이미지를 깔았습니다 — 기존에 별도로 있던 "화장대 일러스트" placeholder 박스는
 * 제거했습니다(새 배경 이미지 안에 화장대가 이미 그려져 있어서 중복입니다).
 * 히어로 배경은 화면 좌우 끝까지 꽉 채우고(풀블리드), 안쪽 콘텐츠(위치/토글/인사말/
 * 환경카드)만 기존과 같은 좌우 여백(space[5])을 유지합니다.
 *
 * Collapsing header는 환경 정보 블록(온도·날씨·배지)에만 적용했습니다 — 위치+토글 행은
 * Figma처럼 항상 고정으로 보입니다. 밤 홈은 이 영역이 아예 없어서(environment: null)
 * 체크포인트 C 범위에서 제외했습니다.
 */
export function DayHomeScreen({ data, toggle, onPressRecordCta }: DayHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const heroImageHeight = windowWidth / WEATHER_BG_ASPECT_RATIO;
  const heroHeight = heroImageHeight * HERO_HEIGHT_SCALE;
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

  const weatherBackground = getWeatherBackground(data.environment?.weather ?? '');

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        scrollEnabled={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <Image
            source={weatherBackground}
            style={[styles.heroImage, { height: heroImageHeight }]}
            resizeMode="cover"
          />
          {/* mask-image 대신 도착색이 페이지 배경과 같은 LinearGradient로 같은 효과를 냅니다
              (원본 PNG에 알파가 없어서 — 파일 상단 주석 참고). */}
          <LinearGradient
            colors={['transparent', color.surfaceLavenderPale]}
            style={styles.heroFade}
            pointerEvents="none"
          />
          <View style={[styles.heroInner, { paddingTop: insets.top + space[3] }]}>
            <View style={styles.headerRow}>
              <Text style={styles.location}>{data.environment?.location ?? ''}</Text>
              {toggle}
            </View>

            <Animated.View
              style={[styles.section, styles.environmentClip, { height: environmentHeight }]}
            >
              <EnvironmentCard environment={data.environment} hasFailed={hasEnvironmentFailure} />
            </Animated.View>
          </View>
        </View>

        {data.environment && !hasEnvironmentFailure && (
          <EnvironmentTipCard
            environment={data.environment}
            style={[styles.sectionPadded, styles.tipCardPull]}
          />
        )}

        <RoutineRecommendationList
          timeSlot={data.routineRecommendation.timeSlot}
          items={data.routineRecommendation.items}
          style={styles.sectionPadded}
        />

        {/* Figma HOME-01은 미니멀 텍스트 링크였지만, 관리자님이 기존 그라데이션 버튼 느낌으로
            되돌려달라고 하셔서(2026-08-14) 원래 스타일로 복원했습니다. 완료 여부에 따른
            라벨 전환은 그대로 유지합니다. */}
        <Button
          label={morningCompleted ? '오늘 모닝루틴 완료!' : '모닝루틴 기록하러 가기'}
          onPress={onPressRecordCta}
          variant="gradient"
          style={[styles.cta, styles.sectionPadded]}
        />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  content: {
    paddingBottom: space[4],
    gap: space[3],
  },
  hero: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // 2026-08-16 — 55%였을 때 화장대(원본 이미지의 85~95% 지점)가 페이드 범위 안에
    // 걸려서 흐릿하게 사라지는 문제가 있었습니다(관리자님 리포트). 화장대는 그대로
    // 두고 그 아래 빈 테이블/여백 부분만 옅어지도록 12%로 좁혔습니다.
    height: '12%',
  },
  heroInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space[5],
    gap: space[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  location: {
    ...typography.caption,
    color: color.white,
    marginTop: space[5],
    ...weightFamily('bold'),
  },
  section: {
    width: '100%',
  },
  sectionPadded: {
    marginHorizontal: space[5],
  },
  // 2026-08-16 — 히어로 바로 아래 카드(자외선 경고)만 콕 집어서 gap을 상쇄하고 더
  // 끌어올렸습니다. content.gap을 전체적으로 줄이면 다른 카드 사이 간격도 같이
  // 좁아져서, 이 카드에만 negative margin으로 targeted 처리했습니다.
  tipCardPull: {
    marginTop: -25,
  },
  environmentClip: {
    overflow: 'hidden',
    // Card 컴포넌트의 radius.lg와 맞춰야 접힌 상태에서도 아래쪽이 각지지 않고
    // 둥글게 클리핑됩니다. overflow:hidden 경계 자체가 각져 있으면 Card가 둥글어도
    // 잘리는 순간 직선으로 잘려 보입니다.
    borderRadius: radius.lg,
  },
  cta: {
    marginTop: 0,
  },
});