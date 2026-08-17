// ProductCameraCapture.tsx
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
import { prepareProductPhoto } from '@/lib/image';
import { useScanProduct } from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { color, radius } from '@/theme/tokens';
import type { ScanMode, ScanResult } from '@/types/product';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export type ProductCameraCaptureHandle = {
  /** PRODUCT_IMAGE 모드 수동 셔터 버튼에서 호출합니다. */
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

  const runScan = async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    onCaptureStart?.();
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo?.uri) {
        onError({ message: '사진을 만드는 데 실패했어요. 다시 시도해 주세요.' });
        scannedRef.current = false;
        return;
      }
      const processed = await prepareProductPhoto(photo.uri, {
        width: photo.width,
        height: photo.height,
      });
      const result = await scanMutation.mutateAsync({ imageUri: processed.uri, scanMode });
      onSuccess(result);
    } catch (e) {
      if (e instanceof ApiError) {
        onError({ code: e.code, message: e.message });
      } else {
        onError({ message: '스캔 중 문제가 생겼어요. 다시 시도해 주세요.' });
      }
      scannedRef.current = false;
    } finally {
      setProcessing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    capture: runScan,
    resetScanned: () => {
      scannedRef.current = false;
    },
  }));

  const handleBarcodeDetected = (_result: BarcodeScanningResult) => {
    if (scannedRef.current || processing) return;
    scannedRef.current = true;
    runScan();
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
