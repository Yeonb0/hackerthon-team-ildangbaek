// src/components/domain/ProductCameraCapture.tsx
//
// PRODUCT-04(POST /products/scan) 캡처 로직만 뽑아낸 컴포넌트입니다. S-21(구매 전 확인)이
// F-CHECK-02 BR1("스캔 모드 → 뷰파인더가 같은 자리에서 교체")에 따라 카메라를 전체화면이
// 아니라 화면 안에 인라인으로 끼워 넣어야 해서 새로 분리했습니다.
//
// ⚠️ ProductScanScreen(S-13)의 카메라 로직과 상당 부분 겹칩니다. S-13은 이미 실기기
// 검증이 끝난 화면이라 이번엔 건드리지 않고 별도 컴포넌트로 뒀습니다 — 나중에 여유 있을
// 때 S-13도 이 컴포넌트를 쓰도록 합치면 중복을 없앨 수 있습니다.
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { LoadingState } from '@/components/state/LoadingState';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { useScanProduct } from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { color, radius } from '@/theme/tokens';
import type { ScanMode, ScanResult } from '@/types/product';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export type ProductCameraCaptureHandle = {
  /**
   * PRODUCT_IMAGE 모드 수동 셔터 버튼용.
   * ⚠️ 2026-08-18 — 백엔드 미지원이라 현재는 안내 에러만 냅니다(구현부 주석 참고).
   */
  capture: () => void;
  /** 에러 안내를 닫고 "다시 스캔"할 때, 부모가 바코드 재인식을 다시 허용하도록 호출합니다. */
  resetScanned: () => void;
};

type ProductCameraCaptureProps = {
  scanMode: ScanMode;
  onCaptureStart?: () => void;
  onSuccess: (result: ScanResult) => void;
  onError: (info: { code?: string; message: string }) => void;
  style?: StyleProp<ViewStyle>;
};

export const ProductCameraCapture = forwardRef<
  ProductCameraCaptureHandle,
  ProductCameraCaptureProps
>(function ProductCameraCapture({ scanMode, onCaptureStart, onSuccess, onError, style }, ref) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // ProductScanScreen과 동일한 이유로 ref를 씁니다 — 연속 촬영 버그 방지(관리자님 확인, 2026-08-10).
  const scannedRef = useRef(false);
  const [processing, setProcessing] = useState(false);
  const scanMutation = useScanProduct();

  useEffect(() => {
    if (permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const runScan = async (barcode: string) => {
    if (processing) return;
    setProcessing(true);
    onCaptureStart?.();
    try {
      const result = await scanMutation.mutateAsync({ scanMode: 'BARCODE', barcode });
      onSuccess(result);
    } catch (e) {
      if (e instanceof ApiError) {
        onError({ code: e.code, message: e.message });
      } else {
        onError({ message: '스캔 중 문제가 생겼어요. 다시 시도해 주세요.' });
      }
      // ⚠️ 2026-08-19(세션 19, 관리자님 리포트) — 여기서 `scannedRef.current = false`로
      // 스캐너를 즉시 다시 열면, 실패한 바코드가 아직 카메라 앞에 있어서 같은 실패가
      // 초당 수차례 반복됩니다(에러 안내가 계속 다시 뜸). S-13과 동일한 수정입니다.
      //
      // 잠금은 부모가 「다시 스캔」에서 `resetScanned()`를 부를 때만 풉니다.
    } finally {
      setProcessing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    // 2026-08-18 — PRODUCT_IMAGE 수동 셔터는 백엔드에 인식 로직이 없어 동작하지 않습니다.
    // 부모(S-21)가 셔터 버튼을 감췄지만, 다른 경로로 호출돼도 무의미한 촬영이 일어나지
    // 않도록 여기서 안내 에러로 막습니다. 백엔드가 구현하면 촬영 경로를 되살리면 됩니다.
    capture: () =>
      onError({
        message:
          '상품 사진으로 찾는 기능은 아직 준비 중이에요. 바코드를 스캔하거나 제품명으로 검색해 주세요.',
      }),
    resetScanned: () => {
      scannedRef.current = false;
    },
  }));

  /**
   * ⚠️ 2026-08-18 — S-13과 같은 수정. 예전엔 인식 결과를 버리고 사진을 찍어 업로드했는데,
   * 백엔드 multipart 경로는 SCAN_SERVICE_UNAVAILABLE만 던집니다. `result.data`가 실제
   * 조회에 쓰이는 바코드 문자열입니다.
   */
  const handleBarcodeDetected = (result: BarcodeScanningResult) => {
    if (scannedRef.current || processing) return;
    if (!result.data) return;
    scannedRef.current = true;
    runScan(result.data);
  };

  if (!permission) {
    return <LoadingState style={[styles.fallback, style]} />;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.fallback, style]}>
        <PermissionDenied
          type="camera"
          layout="inline"
          stage={permission.canAskAgain ? 'request' : 'guide'}
          onRequest={permission.canAskAgain ? requestPermission : undefined}
        />
      </View>
    );
  }

  return (
    <View style={[styles.cameraBox, style]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={
          scanMode === 'BARCODE' ? { barcodeTypes: [...BARCODE_TYPES] } : undefined
        }
        onBarcodeScanned={scanMode === 'BARCODE' ? handleBarcodeDetected : undefined}
      />
      {scanMode === 'BARCODE' ? (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.viewfinder} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    minHeight: 220,
    borderRadius: radius.md,
    backgroundColor: color.brand50,
    justifyContent: 'center',
  },
  cameraBox: {
    minHeight: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.black,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: '70%',
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: color.white,
  },
});
