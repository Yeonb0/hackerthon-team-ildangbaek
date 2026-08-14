// ProductScanScreen.tsx — S-13 제품 스캔
//
// 바코드/상품 사진 두 모드를 하나의 CameraView로 처리합니다(브리프 가이드: "CameraView는
// 하나만 두고 barcodeScannerSettings 활성 여부만 바꾸는 방식"). 후면 카메라를 씁니다
// (facing='back') — 얼굴 촬영(S-16)과 달리 좌우반전 보정이 필요 없어서 prepareProductPhoto는
// flip을 하지 않습니다(lib/image.ts 참고).
//
// BARCODE 모드는 onBarcodeScanned로 자동 인식되면 그 즉시 사진을 찍어 업로드합니다 —
// PRODUCT-04 API가 스캔 모드와 무관하게 항상 이미지 파일을 받기 때문에(바코드 디코딩은
// 서버가 담당), 클라이언트는 "바코드가 프레임 안에 들어왔다"는 신호로 촬영 타이밍만
// 잡아줍니다. onBarcodeScanned는 초당 수십 번 발화할 수 있어 첫 인식 이후 즉시 차단합니다
// (로드맵 데모 리스크 가이드).
//
// ⚠️ 이 차단 플래그는 useState가 아니라 useRef여야 합니다(관리자님 실기기 확인, 2026-08-10 —
// 바코드에 카메라를 계속 대고 있으면 연속으로 촬영되는 버그). useState로 만들면
// setScanned(true) 직후에도 몇 프레임 동안은 리렌더가 아직 반영되기 전이라, 그 사이에
// 네이티브 카메라가 onBarcodeScanned를 또 발화시키면 "예전 렌더에서 만들어진, scanned=false를
// 기억하는" 클로저가 그대로 실행돼 중복 촬영으로 이어집니다. ref는 객체 하나를 계속
// 재사용해서 .current를 읽고 쓰는 시점이 항상 "지금 값"이라 이 문제가 없습니다.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { IconBack } from '@/components/icons';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { LoadingState } from '@/components/state/LoadingState';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { prepareProductPhoto } from '@/lib/image';
import { useScanProduct } from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';
import type { ScanMode } from '@/types/product';
import { weightFamily } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const MODE_OPTIONS: { value: ScanMode; label: string }[] = [
  { value: 'BARCODE', label: '바코드' },
  { value: 'PRODUCT_IMAGE', label: '상품 사진' },
];

const GUIDE_TEXT: Record<ScanMode, string> = {
  BARCODE: '바코드를 네모 안에 맞춰주세요',
  PRODUCT_IMAGE: '제품 전면이 보이게 촬영해주세요',
};

// 유통·화장품 제품에서 흔한 바코드 규격 위주로 골랐습니다.
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

type ScanErrorInfo = {
  code?: string;
  message: string;
};

export function ProductScanScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'ProductScan'>>();
  const insets = useSafeAreaInsets();
  const { timeSlot } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // 위 상단 주석 참고 — 반드시 ref여야 연속 촬영 버그가 안 생깁니다.
  const scannedRef = useRef(false);

  const [scanMode, setScanMode] = useState<ScanMode>('BARCODE');
  const [processing, setProcessing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ScanErrorInfo | null>(null);

  const scanMutation = useScanProduct();

  useEffect(() => {
    // FaceCaptureScreen과 동일한 이유로 'undetermined'일 때만 자동 요청합니다 —
    // 'denied' 상태에서 다시 부르면 방금 거부한 사용자에게 시스템 팝업이 또 뜹니다.
    if (permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return <LoadingState style={styles.centerFill} />;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <PermissionDenied type="camera" />
      </View>
    );
  }

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    scannedRef.current = false;
    setErrorInfo(null);
  };

  const runScan = async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    setErrorInfo(null);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo?.uri) {
        setErrorInfo({ message: '사진을 만드는 데 실패했어요. 다시 시도해 주세요.' });
        scannedRef.current = false;
        return;
      }
      const processed = await prepareProductPhoto(photo.uri, {
        width: photo.width,
        height: photo.height,
      });
      const result = await scanMutation.mutateAsync({ imageUri: processed.uri, scanMode });
      // replace를 씁니다 — 인식된 카메라 화면으로 뒤로가기가 자연스럽지 않아서(FaceCaptureScreen의
      // handleConfirm과 같은 이유), S-13을 스택에서 빼고 S-14로 바로 넘어갑니다.
      navigation.replace(DetailRoutes.IngredientCheck, { productId: result.productId, timeSlot });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorInfo({ code: e.code, message: e.message });
      } else {
        setErrorInfo({ message: '스캔 중 문제가 생겼어요. 다시 시도해 주세요.' });
      }
      scannedRef.current = false;
    } finally {
      setProcessing(false);
    }
  };

  const handleBarcodeDetected = (_result: BarcodeScanningResult) => {
    if (scannedRef.current || processing) return;
    scannedRef.current = true;
    runScan();
  };

  const handleSwitchToSearch = () => navigation.goBack();

  const isNotFoundLike =
    errorInfo?.code === ErrorCode.SCAN_PRODUCT_NOT_DETECTED ||
    errorInfo?.code === ErrorCode.PRODUCT_NOT_FOUND;

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={styles.cameraFill}
        facing="back"
        barcodeScannerSettings={
          scanMode === 'BARCODE' ? { barcodeTypes: [...BARCODE_TYPES] } : undefined
        }
        onBarcodeScanned={scanMode === 'BARCODE' ? handleBarcodeDetected : undefined}
      />

      {scanMode === 'BARCODE' ? (
        <View style={styles.overlayContainer} pointerEvents="none">
          {/* Figma PROD-04 기준 — 모서리 브래킷 4개 + 가로 스캔라인으로 교체
              (관리자님 요청, 2026-08-14). 실제 카메라 화면 위라 밝기가 계속 바뀌어서
              Figma의 연한 회색 대신 흰색으로 뒀습니다 — 구조(브래킷+라인)만 맞추고
              색은 가시성 우선으로 조정했습니다. */}
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <View style={styles.scanLine} />
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        hitSlop={8}
        style={[styles.backButton, { top: insets.top + space[3] }]}
      >
        <IconBack size={22} color={color.brand700} />
      </Pressable>

      <View
        style={[styles.topBar, { paddingTop: insets.top + space[3] }]}
        pointerEvents="box-none"
      >
        <Text style={styles.guideText}>{GUIDE_TEXT[scanMode]}</Text>
        <SegmentToggle
          options={MODE_OPTIONS}
          value={scanMode}
          onChange={handleModeChange}
          style={styles.modeToggle}
        />
      </View>

      {errorInfo ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorInfo.message}</Text>
          <View style={styles.errorActions}>
            <Button
              label="다시 스캔"
              variant="secondary"
              onPress={() => {
                setErrorInfo(null);
                scannedRef.current = false;
              }}
              style={styles.errorButton}
            />
            {isNotFoundLike ? (
              <Button
                label="검색으로 전환"
                variant="primary"
                onPress={handleSwitchToSearch}
                style={styles.errorButton}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {scanMode === 'PRODUCT_IMAGE' ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[5] }]}>
          <Button
            label="촬영"
            variant="primary"
            loading={processing}
            onPress={runScan}
            style={styles.captureButton}
          />
        </View>
      ) : processing ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[5] }]}>
          <View style={styles.processingPill}>
            <Text style={styles.processingText}>인식 중이에요…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.black },
  // ⚠️ absoluteFillObject 대신 absoluteFill을 씁니다 — FaceCaptureScreen과 같은 이유
  // (이 프로젝트 환경에서 absoluteFillObject가 undefined로 평가되는 문제, 관리자 확인 2026-08-09).
  cameraFill: StyleSheet.absoluteFill,
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 220,
    height: 120,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: color.white,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 4,
    right: 4,
    height: 1.5,
    backgroundColor: color.white,
    opacity: 0.7,
  },
  backButton: {
    position: 'absolute',
    left: space[5],
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg,
    shadowColor: color.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
  },
  guideText: {
    color: color.white,
    fontSize: 14,
    ...weightFamily('semibold'),
    textShadowColor: color.scrim40,
    textShadowRadius: 4,
  },
  modeToggle: {
    width: 220,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
  captureButton: { flex: 1 },
  processingPill: {
    backgroundColor: color.scrim60,
    borderRadius: 999,
    paddingVertical: space[3],
    paddingHorizontal: space[5],
  },
  processingText: {
    color: color.white,
    fontSize: 14,
    ...weightFamily('semibold'),
  },
  errorBanner: {
    position: 'absolute',
    bottom: 110,
    left: space[5],
    right: space[5],
    backgroundColor: color.scrim60,
    borderRadius: 12,
    padding: space[3],
    gap: space[3],
  },
  errorText: {
    color: color.white,
    fontSize: 13,
    ...weightFamily('regular'),
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: space[2],
  },
  errorButton: {
    flex: 1,
  },
});