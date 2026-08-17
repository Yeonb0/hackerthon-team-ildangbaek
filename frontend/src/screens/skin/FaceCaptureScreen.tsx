// FaceCaptureScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/base/Button';
import { IconBack, IconClose } from '@/components/icons';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { LoadingState } from '@/components/state/LoadingState';
import { FaceGuideOverlay } from '@/components/domain/FaceGuideOverlay';
import { prepareSkinPhoto } from '@/lib/image';
import { DetailRoutes, DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, gradient, gradientDirection, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * S-16 얼굴 촬영. 두 내부 상태로 구성됩니다 — ① 촬영(카메라 라이브 뷰 + 가이드 오버레이)
 * ② 프리뷰(찍은 사진 + 재촬영/다음).
 *
 * ✅ 2026-08-17(세션 13) — 촬영 미리보기 단계가 Figma에 `PhotoConfirm`(node 59:6426)
 * 이라는 별도 프레임으로 확정됐습니다. 다만 **화면을 분리하지 않고 지금처럼 내부 상태로
 * 유지**하기로 했습니다(관리자 결정) — 화면을 나누면 재촬영할 때마다 CameraView가
 * 언마운트·재마운트되면서 카메라가 다시 초기화되고, 재촬영이 잦은 화면이라 체감 지연이
 * 큽니다. 디자인만 Figma에 맞췄습니다.
 *
 * Figma 실측 반영(node 59:6387 촬영 / 59:6426 프리뷰):
 *   - 촬영: 헤더가 좌 X(닫기) + 중앙 "사진을 찍으세요"로 바뀌고, 하단 CTA 버튼이
 *     원형 셔터(흰 링 + 그라데이션 안쪽 원)로 교체됨
 *   - 프리뷰: 검정 배경 풀블리드 → **흰 배경 + 라운드 사진 카드**로 전환. 사진 아래
 *     "이 사진으로 분석할까요?" 안내 2줄, 하단 재촬영(Ghost)/분석 시작(Primary) 2버튼
 *
 * ⚠️ Figma 프리뷰 우상단의 "얼굴 감지됨" 초록 배지는 **의도적으로 뺐습니다**(관리자
 * 결정, 2026-08-17). 프론트엔 얼굴 인식 기능이 없고(FaceGuideOverlay 주석 참고 — 인식은
 * 서버 SKIN-01이 422 SKIN_FACE_NOT_DETECTED로 판정), 촬영 직후는 아직 서버에 보내기
 * 전이라 감지 여부를 알 수 없습니다. 무조건 초록 배지를 띄우면 직후 422가 떴을 때
 * 화면끼리 모순됩니다 — 근거 없는 단정을 만들지 않습니다.
 *
 * 카메라 권한 흐름(F-SKIN-02 예외처리): 최초 진입 시(status === 'undetermined') 1회만
 * 자동으로 권한을 요청합니다. status가 'undetermined'일 때만 요청하도록 조건을 좁힌
 * 이유는 아래 useEffect 코멘트 참고.
 */
export function FaceCaptureScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'FaceCapture'>>();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureFailed, setCaptureFailed] = useState(false);

  // status가 'undetermined'(아직 한 번도 물어본 적 없음)일 때만 자동 요청합니다.
  // 'denied' 상태에서는 절대 다시 부르지 않습니다 — canAskAgain은 플랫폼마다
  // 1차 거부 직후에도 true일 수 있어서(Android 등), 이걸 조건으로 쓰면 방금 거부한
  // 사용자에게 시스템 팝업이 즉시 다시 뜨면서 PermissionDenied 화면이 안 보이는
  // 것처럼 느껴지는 버그가 생깁니다.
  useEffect(() => {
    if (permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return <LoadingState style={styles.centerFill} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <View style={[styles.permissionNav, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={8}
            style={styles.permissionNavBackButton}
          >
            <IconBack size={22} color={color.ink900} />
          </Pressable>
        </View>
        <View style={styles.centerFill}>
          <PermissionDenied type="camera" />
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setCaptureFailed(false);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo?.uri) {
        setCaptureFailed(true);
        return;
      }
      // 전면 카메라 촬영본 좌우반전 보정 + 업로드용 리사이즈·압축 (lib/image.ts 참고 —
      // mirror prop 회귀 이슈로 CameraView prop 대신 촬영 직후 수동 후처리 방식을 씁니다).
      // quality는 여기서 따로 안 줍니다 — 원본을 한 번 더 압축하면 화질 손실이 두 번
      // 겹치므로, 최종 압축은 prepareSkinPhoto의 saveAsync 한 곳에서만 합니다.
      const processed = await prepareSkinPhoto(photo.uri, {
        width: photo.width,
        height: photo.height,
      });
      setCapturedUri(processed.uri);
    } catch {
      // F-SKIN-02 예외처리: 이미지 생성 실패 → 오류 안내 + 재시도
      setCaptureFailed(true);
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    // 로드맵 Phase 5 4-3 명시 요구사항: 재촬영 시 기존 임시 이미지 폐기
    setCapturedUri(null);
    setCaptureFailed(false);
  };

  const handleConfirm = () => {
    if (!capturedUri) return;
    // navigate 대신 reset을 씁니다. navigate만 하면 스택이 Tabs→PhotoGuide→FaceCapture→
    // AnalyzingSkin으로 계속 쌓여서, 분석이 진행 중이거나 끝난 뒤에 뒤로가기를 눌러도
    // S-16(카메라가 초기화된 상태)·S-15로 되돌아갈 수 있었습니다. 이 시점부터는
    // "촬영을 확정하고 분석을 시작"하는 지점이라 되돌아갈 이유가 없고(같은 시간대
    // 재기록은 서버가 409 SKIN_ALREADY_RECORDED_IN_SLOT으로 막습니다), 뒤로가기를
    // 누르면 곧장 진입 지점(기록 허브)으로 나가는 게 자연스럽습니다. 그래서 스택을
    // Tabs → AnalyzingSkin 두 단계로 정리합니다.
    // ⚠️ 'Tabs' 라우트에 state를 안 넣으면 탭 내비게이터가 기본 탭(홈)으로 열립니다 —
    // 실기기 검증으로 확인된 버그였습니다. RecordHub 탭 상태를 명시해서 원래 있던
    // 기록 허브로 정확히 돌아가게 합니다.
    navigation.reset({
      index: 1,
      routes: [
        {
          name: 'Tabs',
          state: {
            routes: [{ name: MainTabRoutes.RecordHub, params: { timeSlot: route.params.timeSlot } }],
          },
        },
        {
          name: DetailRoutes.AnalyzingSkin,
          params: { timeSlot: route.params.timeSlot, imageUri: capturedUri },
        },
      ],
    });
  };

  // ② 프리뷰 상태 (Figma PhotoConfirm 59:6426)
  if (capturedUri) {
    return (
      <View style={styles.confirmScreen}>
        <View style={[styles.confirmNav, { paddingTop: insets.top + space[3] }]}>
          <Pressable
            onPress={handleRetake}
            accessibilityRole="button"
            accessibilityLabel="다시 촬영하기"
            hitSlop={12}
          >
            <IconBack size={18} color={color.textSub} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.confirmContent}>
          <Image
            source={{ uri: capturedUri }}
            style={styles.confirmPhoto}
            resizeMode="cover"
            accessibilityLabel="촬영한 사진 미리보기"
          />
          <Text style={styles.confirmTitle}>이 사진으로 분석할까요?</Text>
          <Text style={styles.confirmHint}>선명하고 정면을 바라볼수록 분석이 정확해요</Text>
        </ScrollView>

        <View style={[styles.confirmFooter, { paddingBottom: insets.bottom + space[6] }]}>
          <Button
            label="재촬영"
            variant="outline"
            onPress={handleRetake}
            style={styles.halfButton}
          />
          <Button
            label="분석 시작"
            variant="primary"
            onPress={handleConfirm}
            style={styles.halfButton}
          />
        </View>
      </View>
    );
  }

  // ① 촬영 상태
  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.cameraFill} facing="front" />

      <View style={styles.overlayContainer} pointerEvents="none">
        <FaceGuideOverlay />
      </View>

      {/* Figma 59:6388 — 좌 X(닫기) + 중앙 안내 문구. 우측 더미는 문구를 정확히
          가운데 두기 위한 것입니다(좌측 아이콘과 같은 폭). */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + space[3] }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="촬영 닫기"
          hitSlop={12}
          style={styles.topBarSide}
        >
          <IconClose size={20} color={color.white} />
        </Pressable>
        <Text style={styles.guideText}>사진을 찍으세요</Text>
        <View style={styles.topBarSide} />
      </View>

      {captureFailed ? (
        <View style={styles.errorBanner} pointerEvents="none">
          <Text style={styles.errorText}>사진을 만드는 데 실패했어요. 다시 시도해 주세요.</Text>
        </View>
      ) : null}

      {/* Figma 59:6411 — 원형 셔터(흰 링 + 그라데이션 안쪽 원) + 아래 "촬영" 라벨.
          누르는 동안 안쪽 원을 흐리게 해서 진행 중임을 표시합니다(별도 스피너 없음 —
          셔터 위에 스피너를 겹치면 링 안이 답답해집니다). */}
      <View style={[styles.shutterBar, { paddingBottom: insets.bottom + space[6] }]}>
        <Pressable
          onPress={handleCapture}
          disabled={capturing}
          accessibilityRole="button"
          accessibilityLabel="촬영"
          accessibilityState={{ disabled: capturing }}
          style={styles.shutterRing}
        >
          <LinearGradient
            colors={gradient.brand}
            start={gradientDirection.badge.start}
            end={gradientDirection.badge.end}
            style={[styles.shutterInner, capturing && styles.shutterInnerBusy]}
          />
        </Pressable>
        <Text style={styles.shutterLabel}>촬영</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.black },
  // ⚠️ StyleSheet.absoluteFillObject가 아니라 absoluteFill입니다 — 이 프로젝트 환경에서
  // absoluteFillObject가 undefined로 평가되는 문제가 실기기 검증으로 확인됐습니다
  // (관리자 확인, 2026-08-09). 카메라가 통째로 안 보이던 버그와 가이드가 카메라 밑에
  // 별도 블록으로 밀려 나오던 버그 둘 다 이게 원인이었습니다. 이 파일 전체에서
  // absoluteFillObject는 쓰지 않습니다.
  cameraFill: StyleSheet.absoluteFill,
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissionScreen: { flex: 1, backgroundColor: color.bg },
  permissionNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  permissionNavBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  /** 중앙 문구를 정확히 가운데 두기 위한 좌우 동일 폭 슬롯. */
  topBarSide: { width: 20, alignItems: 'center' },
  guideText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
  },
  shutterBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  shutterInnerBusy: { opacity: 0.5 },
  shutterLabel: {
    color: color.white,
    fontSize: adjustFontSize(13),
    ...weightFamily('bold'),
  },
  halfButton: { flex: 1 },

  // --- ② 프리뷰(PhotoConfirm 59:6426) ---
  confirmScreen: { flex: 1, backgroundColor: color.bg },
  confirmNav: {
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  confirmContent: {
    flexGrow: 1,
    paddingHorizontal: space[5],
    paddingTop: space[4],
  },
  confirmPhoto: {
    width: '100%',
    aspectRatio: 350 / 525,
    borderRadius: 20,
    backgroundColor: color.borderDividerFaint,
  },
  confirmTitle: {
    fontSize: adjustFontSize(17),
    lineHeight: 24,
    ...weightFamily('bold'),
    color: color.textInk,
    textAlign: 'center',
    paddingTop: space[6],
  },
  confirmHint: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
    paddingTop: space[1],
    paddingBottom: space[2],
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  errorBanner: {
    position: 'absolute',
    bottom: 100,
    left: space[5],
    right: space[5],
    backgroundColor: color.scrim60,
    borderRadius: 12,
    padding: space[3],
  },
  errorText: {
    color: color.white,
    fontSize: adjustFontSize(13),
    ...weightFamily('regular'),
    textAlign: 'center',
  },
});