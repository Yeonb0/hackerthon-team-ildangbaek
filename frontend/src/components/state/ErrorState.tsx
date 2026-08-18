import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon, AppIconName } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { color, space } from '@/theme/tokens';
import { adjustFontSize, weightFamily } from '@/theme/typography';

export type ErrorVariant = 'network' | 'server' | 'notFound';

/**
 * fullScreen — Figma ErrorNetwork(59:8110) / ErrorServer(59:8140) 배치.
 *   위아래 spacer로 본문을 세로 중앙에 두고, CTA는 하단에 고정합니다. flex:1이 필요해서
 *   화면 전체(또는 헤더 아래 남은 영역)를 차지하는 자리에서만 씁니다.
 * inline — 섹션 카드 안이나 리스트 중간처럼 "화면 일부"에 들어가는 자리.
 *   하단 고정 CTA를 쓰면 부모 레이아웃이 깨지므로 버튼을 본문 바로 아래에 둡니다.
 */
export type StateLayout = 'fullScreen' | 'inline';

type ErrorStateProps = {
  variant: ErrorVariant;
  layout?: StateLayout;
  onRetry?: () => void;
  /**
   * fullScreen + 지정 시 CTA 아래에 텍스트 버튼이 붙습니다 (Figma ErrorServer "홈으로 가기").
   * 홈이 목적지로 말이 되는 화면에서만 넘기세요 — 온보딩/스플래시엔 부적절합니다.
   */
  onGoHome?: () => void;
  /**
   * 화면별 문구 덮어쓰기. 기본 문구는 어느 화면에서나 말이 되는 범용 표현이라,
   * Figma의 화면 전용 카피("분석을 완료하지 못했어요")는 해당 화면에서만 주입합니다.
   */
  title?: string;
  description?: string;
  /** CTA 아래 회색 보조 문구. fullScreen에서만 렌더됩니다. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

// ⚠️ 임시 카피 — 기획 문구 확정 전까지 사용하는 placeholder입니다.
//
// 2026-08-17 (세션 15) Figma 실측 반영 시 주의한 점:
// - network는 Figma 문구를 그대로 채택했습니다(어느 화면에서나 성립).
// - server는 Figma가 "분석을 완료하지 못했어요"인데, 이 variant는 마이페이지·성분 목록·
//   제품 상세 등 분석과 무관한 화면에서도 쓰입니다. 그래서 기본값은 범용 문구로 두고,
//   분석 화면(AnalyzingSkinScreen)에서만 title/description으로 덮어씁니다.
// - 아이콘: Figma는 network/server 둘 다 같은 구름 아이콘(37:31)이지만, 그러면 두 에러를
//   구분할 단서가 문구뿐입니다. 재시도로 풀리는 문제(network)와 아닌 문제(server)는
//   사용자 행동이 달라서 기존의 cloudError/warning 구분을 유지했습니다.
const VARIANT_COPY: Record<
  ErrorVariant,
  { icon: AppIconName; title: string; description: string; hint?: string; retryLabel: string }
> = {
  network: {
    icon: 'cloudError',
    title: '인터넷 연결을 확인해주세요',
    description: '와이파이 또는 데이터 연결이 필요해요',
    // Figma 원문은 "연결되면 자동으로 재시도해요"였지만 자동 재시도가 구현돼 있지
    // 않습니다(NetInfo 미도입). 없는 동작을 약속하지 않도록 문구를 바꿨습니다.
    hint: '연결 후 다시 시도해주세요',
    retryLabel: '다시 시도',
  },
  server: {
    icon: 'warning',
    title: '잠시 문제가 생겼어요',
    description: '서버에 일시적인 문제가 생겼어요',
    retryLabel: '다시 시도',
  },
  notFound: {
    icon: 'search',
    title: '찾을 수 없어요',
    description: '요청하신 내용을 찾지 못했어요',
    retryLabel: '다시 시도',
  },
};

/**
 * 에러 상태. network(연결 실패) / server(5xx) / notFound(404류) 3종.
 * REPORT_DATA_INSUFFICIENT처럼 "빈 상태"에 가까운 코드는 이 컴포넌트가 아니라
 * EmptyState를 써야 합니다 (types/errorCodes.ts의 EMPTY_STATE_CODES 참고 — 빨간 에러 UI 금지).
 */
export function ErrorState({
  variant,
  layout = 'fullScreen',
  onRetry,
  onGoHome,
  title,
  description,
  hint,
  style,
}: ErrorStateProps) {
  const copy = VARIANT_COPY[variant];
  const body = (
    <View style={styles.body}>
      <AppIcon name={copy.icon} size={48} color={color.statusCaution} />
      <Text style={styles.title}>{title ?? copy.title}</Text>
      <Text style={styles.description}>{description ?? copy.description}</Text>
    </View>
  );

  if (layout === 'inline') {
    return (
      <View style={[styles.inlineContainer, style]}>
        {body}
        {onRetry ? (
          <Button
            label={copy.retryLabel}
            variant="secondary"
            onPress={onRetry}
            style={styles.inlineAction}
          />
        ) : null}
      </View>
    );
  }

  const hintText = hint ?? copy.hint;

  return (
    <View style={[styles.fullContainer, style]}>
      <View style={styles.spacer} />
      {body}
      <View style={styles.spacer} />
      <View style={styles.footer}>
        {onRetry ? <Button label={copy.retryLabel} variant="primary" onPress={onRetry} /> : null}
        {onGoHome ? (
          <Pressable
            accessibilityRole="button"
            onPress={onGoHome}
            hitSlop={8}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>홈으로 가기</Text>
          </Pressable>
        ) : null}
        {hintText ? <Text style={styles.hint}>{hintText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    // 호출처 일부(centerFill)가 alignItems:'center'라, 그대로 두면 이 컨테이너가
    // 내용 폭으로 쪼그라들어 하단 CTA가 전체 폭을 못 씁니다. stretch로 덮어씁니다.
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: color.bg,
    paddingHorizontal: space[8],
  },
  inlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  spacer: {
    flex: 1,
  },
  body: {
    // Figma EmptyState(37:15)는 폭 240 고정이지만, 문구를 화면별로 덮어쓸 수 있어서
    // 고정 폭 대신 최대 폭으로 뒀습니다 — 긴 문구가 잘리지 않게.
    maxWidth: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  title: {
    fontSize: adjustFontSize(16),
    ...weightFamily('bold'),
    color: color.textInk,
    textAlign: 'center',
  },
  description: {
    fontSize: adjustFontSize(12.5),
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    paddingBottom: 48,
    gap: space[3],
  },
  textButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[1],
  },
  textButtonLabel: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },
  hint: {
    fontSize: adjustFontSize(12.5),
    ...weightFamily('medium'),
    color: color.textMuted,
    textAlign: 'center',
  },
  inlineAction: {
    marginTop: space[3],
  },
});
