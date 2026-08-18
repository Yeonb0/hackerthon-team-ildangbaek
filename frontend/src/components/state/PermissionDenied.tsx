import React from 'react';
import { Linking, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon, AppIconName } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { color, gradient, gradientDirection, space } from '@/theme/tokens';
import { adjustFontSize, weightFamily } from '@/theme/typography';
import type { StateLayout } from './ErrorState';

export type PermissionType = 'camera' | 'location' | 'notification';

/**
 * request — 아직 물어볼 수 있는 상태(undetermined, 또는 안드로이드에서 재요청 가능).
 *   Figma CameraPermission(59:8171). CTA가 "권한 허용하기"이고 누르면 시스템 팝업이 뜹니다.
 * guide — 영구 거부라 앱에서 팝업을 띄울 수 없는 상태(canAskAgain === false).
 *   Figma CameraPermissionGuide(59:8202). 시스템 팝업을 못 띄우므로 설정 앱까지 가는
 *   경로를 4단계로 안내하고 CTA는 "설정 앱으로 이동"입니다.
 *
 * 이 구분이 중요한 이유: 영구 거부 상태에서 "권한 허용하기"를 눌러도 아무 일도 일어나지
 * 않습니다(시스템이 팝업을 막습니다). 그러면 사용자는 버튼이 고장 났다고 판단합니다.
 */
export type PermissionStage = 'request' | 'guide';

type PermissionDeniedProps = {
  type: PermissionType;
  stage?: PermissionStage;
  layout?: StateLayout;
  /** stage='request'일 때 CTA 동작. 보통 expo-camera의 requestPermission을 넘깁니다. */
  onRequest?: () => void;
  /** stage='guide'일 때 CTA 동작. 미지정 시 Linking.openSettings()를 호출합니다. */
  onOpenSettings?: () => void;
  /** 화면별 문구 덮어쓰기 (기본값은 어느 화면에서나 성립하는 범용 표현). */
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

// ⚠️ 임시 카피 — 기획 문구 확정 전까지 사용하는 placeholder입니다.
//
// 2026-08-17 (세션 15): Figma CameraPermission의 설명은 "피부 기록은 카메라 촬영으로
// 이루어져요"인데, 이 컴포넌트는 제품 바코드 스캔(ProductScanScreen)·제품 직접 등록에서도
// 씁니다. 거기선 피부를 찍지 않습니다. 그래서 기본값은 범용 문구로 두고, 피부 기록
// 화면(FaceCaptureScreen)에서만 description으로 Figma 문구를 주입합니다.
const TYPE_COPY: Record<
  PermissionType,
  { icon: AppIconName; title: string; description: string; requestLabel: string }
> = {
  camera: {
    icon: 'camera',
    title: '카메라 권한이 필요해요',
    description: '카메라로 촬영해서 기록해요',
    requestLabel: '권한 허용하기',
  },
  location: {
    icon: 'locationPin',
    title: '위치 권한이 필요해요',
    description: '현재 위치로 날씨 정보를 가져와요',
    requestLabel: '권한 허용하기',
  },
  notification: {
    icon: 'bell',
    title: '알림 권한이 꺼져 있어요',
    description: '알림을 허용하면 기록 리마인드를 받을 수 있어요',
    requestLabel: '권한 허용하기',
  },
};

// Figma CameraPermissionGuide(59:8219~) 실측. iOS 설정 앱 경로 기준입니다.
const GUIDE_STEPS = ['설정 앱 열기', '개인정보 보호 탭 선택', '앱 이름 탭', '카메라 권한 켜기'];

/**
 * 권한 거부 상태. 설정 앱으로 바로 이동하는 버튼을 포함합니다
 * (로드맵 Phase 5 명시 요구사항: Linking.openSettings()).
 */
export function PermissionDenied({
  type,
  stage = 'request',
  layout = 'fullScreen',
  onRequest,
  onOpenSettings,
  title,
  description,
  style,
}: PermissionDeniedProps) {
  const copy = TYPE_COPY[type];
  const openSettings = onOpenSettings ?? (() => Linking.openSettings());

  if (stage === 'guide') {
    return (
      <View style={[styles.guideContainer, style]}>
        <View style={styles.guideBody}>
          <View style={styles.guideIcon}>
            <AppIcon name={copy.icon} size={48} color={color.textSub} />
          </View>
          <Text style={styles.guideTitle}>설정에서 직접 허용해주세요</Text>
          <View style={styles.stepList}>
            {GUIDE_STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <LinearGradient
                  colors={gradient.brand}
                  start={gradientDirection.badge.start}
                  end={gradientDirection.badge.end}
                  style={styles.stepBadge}
                >
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </LinearGradient>
                <Text style={styles.stepLabel}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <Button label="설정 앱으로 이동" variant="primary" onPress={openSettings} />
        </View>
      </View>
    );
  }

  const body = (
    <View style={styles.body}>
      <AppIcon name={copy.icon} size={48} color={color.textSub} />
      <Text style={styles.title}>{title ?? copy.title}</Text>
      <Text style={styles.description}>{description ?? copy.description}</Text>
    </View>
  );

  // 물어볼 수 있으면 시스템 팝업을, 아니면 설정 앱을 엽니다.
  const action = onRequest ?? openSettings;
  const actionLabel = onRequest ? copy.requestLabel : '설정 열기';

  if (layout === 'inline') {
    return (
      <View style={[styles.inlineContainer, style]}>
        {body}
        <Button
          label={actionLabel}
          variant="secondary"
          onPress={action}
          style={styles.inlineAction}
        />
      </View>
    );
  }

  return (
    <View style={[styles.fullContainer, style]}>
      <View style={styles.spacer} />
      {body}
      <View style={styles.spacer} />
      <View style={styles.footer}>
        <Button label={actionLabel} variant="primary" onPress={action} />
        <Text style={styles.hint}>거부하면 해당 기능을 사용할 수 없어요</Text>
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
  hint: {
    fontSize: adjustFontSize(12.5),
    ...weightFamily('medium'),
    color: color.textMuted,
    textAlign: 'center',
  },
  inlineAction: {
    marginTop: space[3],
  },

  // ── guide (Figma 59:8202) ──
  guideContainer: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: color.bg,
    paddingHorizontal: space[6],
  },
  guideBody: {
    flex: 1,
    justifyContent: 'center',
  },
  guideIcon: {
    alignItems: 'center',
  },
  guideTitle: {
    fontSize: adjustFontSize(22),
    ...weightFamily('bold'),
    color: color.textInk,
    textAlign: 'center',
    marginTop: space[8],
    marginBottom: space[8],
  },
  stepList: {
    gap: space[5],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: adjustFontSize(13),
    ...weightFamily('bold'),
    color: color.white,
  },
  stepLabel: {
    fontSize: adjustFontSize(15),
    ...weightFamily('bold'),
    color: color.textInk,
  },
});
