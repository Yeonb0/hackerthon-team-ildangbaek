// ProductManualRegisterScreen.tsx — PROD-05 제품 직접 등록
//
// Phase 11-C(관리자 결정, 2026-08-13) — F-PRODUCT-08은 기능명세서에 "TBD-07 · 최우선 미정"
// (버튼은 있는데 목적지 화면이 없음)으로 남아있던 항목입니다. 이번에 최소 버전으로 화면을
// 만들었습니다. 백엔드에 대응 API가 전혀 없어서(api_명세서.md 전수 확인) 완전히 프론트
// 목업입니다 — registerProduct()가 세션 한정 카탈로그에 제품을 추가하고, 그 productId로
// 바로 성분 확인(IngredientCheck, S-14)에 이어붙여 기록을 완료합니다(관리자 결정,
// 2026-08-13) — "성분 확인 화면의 기록 완료 버튼이 저장 시점"이라는 F-PRODUCT-04 BR1
// 원칙을 새로 등록한 제품에도 그대로 적용한 것입니다.
//
// Figma(node 193:4422) 배치 그대로: 제품명 → 브랜드명 → 카테고리 탭 → 성분 입력(자유
// 텍스트) → 안내 문구(점선 박스) → 등록하기. 카테고리는 Figma 시안엔 4개 탭(토너/세럼/
// 크림/기타)만 그려져 있지만, 이미 확정된 표준 12종(PRODUCT_CATEGORIES, 관리자 확정
// 2026-08-10)이 있어서 그걸 그대로 가로 스크롤로 다 보여줍니다 — 나중에 필터링 등에서
// "기타"로 뭉쳐지는 것보다 정확한 카테고리를 받는 게 낫다고 판단했습니다.
//
// 안내 문구는 Figma 원문 그대로: "성분을 모른다면 일부만 입력하거나 비워두세요. AI가
// 바코드/사진으로 채울 수 있어요." — 다만 AI 채움 기능 자체는 이번 범위에 없습니다
// (문구만 Figma 그대로 옮긴 것 — 관리자님 확인 필요할 수도 있어요).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, IconCamera } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { LoadingState } from '@/components/state/LoadingState';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { prepareProductPhoto } from '@/lib/image';
import { useAddProductToRoutine, useRegisterProduct, useRoutines } from '@/api/queries/product';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, space, typography } from '@/theme';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/types/product';
import type { ProductCategory } from '@/types/product';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

export function ProductManualRegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<DetailStackParamList, 'ProductManualRegister'>>();
  const { timeSlot, initialKeyword } = route.params;

  const [name, setName] = useState(initialKeyword ?? '');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [ingredientsText, setIngredientsText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 관리자님 요청(2026-08-13) — 제품 사진을 찍어서 등록할 수 있게. 별도 화면/라우트로
  // 안 빼고 이 화면 내부 상태로 카메라 뷰를 전환합니다(FaceCaptureScreen과 같은 패턴,
  // 다만 여기는 프리뷰 확인 단계를 따로 안 두고 촬영 즉시 폼으로 돌아갑니다 — 다시
  // 찍고 싶으면 썸네일을 다시 누르면 되므로).
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (cameraOpen && permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [cameraOpen, permission, requestPermission]);

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        const processed = await prepareProductPhoto(photo.uri, {
          width: photo.width,
          height: photo.height,
        });
        setPhotoUri(processed.uri);
        setCameraOpen(false);
      }
    } catch {
      // 촬영 실패는 조용히 카메라 화면에 남겨서 다시 시도하게 둡니다 — 사진은 필수가
      // 아니라서(등록 자체를 막을 정도는 아님) 별도 에러 UI까지는 안 만들었습니다.
    } finally {
      setCapturing(false);
    }
  };

  const registerMutation = useRegisterProduct();
  const addToRoutineMutation = useAddProductToRoutine();

  // 관리자님 요청(2026-08-14) — 모닝/나이트 루틴 둘 다 동시에 추가할 수 있게 다중 선택으로.
  const routinesQuery = useRoutines();
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<number>>(new Set());
  const toggleRoutine = (routineId: number) => {
    setSelectedRoutineIds((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const canSubmit = name.trim().length > 0 && brand.trim().length > 0 && category !== null;

  const ingredientNames = useMemo(
    () =>
      ingredientsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [ingredientsText]
  );

  const handleSubmit = async () => {
    if (!canSubmit || !category) return;
    setSubmitError(null);
    try {
      const product = await registerMutation.mutateAsync({
        name: name.trim(),
        brand: brand.trim(),
        category,
        ingredientNames,
        imageUri: photoUri ?? undefined,
      });

      if (selectedRoutineIds.size === 0) {
        // 루틴 선택 안 함 — 기존과 동일하게 이 제품 하나만 성분확인으로 넘어가서
        // 바로 오늘 기록으로 저장합니다.
        navigation.replace(DetailRoutes.IngredientCheck, {
          productId: product.productId,
          timeSlot,
        });
        return;
      }

      // 루틴에 추가하는 건 "오늘 기록"이 아니라 루틴 구성을 바꾸는 것이라(관리자님
      // 확인, 2026-08-13), 성분확인/기록완료로 보내지 않습니다. 모닝/나이트 둘 다
      // 고를 수 있어서(관리자님 요청, 2026-08-14) 순서대로 하나씩 추가합니다.
      for (const routineId of selectedRoutineIds) {
        await addToRoutineMutation.mutateAsync({ routineId, productId: product.productId });
      }

      // 루틴에 추가만 해두고 방금 등록한 제품이 바로 보이는 제품 기록(S-11) 화면으로
      // 돌아갑니다(관리자님 요청, 2026-08-14 — 기록 허브로 나갔다가 다시 들어오면 목록이
      // 안 보인다는 문제 보고 있었는데, 새로 mount되는 화면으로 보내는 편이 더 확실합니다).
      navigation.replace(DetailRoutes.ProductRecord, { timeSlot });
    } catch {
      setSubmitError('등록에 실패했어요. 다시 시도해주세요.');
    }
  };

  if (cameraOpen) {
    if (!permission) {
      return <LoadingState style={styles.centerFill} />;
    }
    if (!permission.granted) {
      return (
        <View style={[styles.centerFill, { paddingTop: insets.top }]}>
          <PermissionDenied type="camera" />
          <Button label="닫기" variant="ghost" onPress={() => setCameraOpen(false)} />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.cameraFill} facing="back" />
        <View style={[styles.cameraTopBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => setCameraOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="촬영 취소"
            hitSlop={8}
          >
            <AppIcon name="close" size={24} color={color.bg} />
          </Pressable>
        </View>
        <View style={[styles.cameraBottomBar, { paddingBottom: insets.bottom + space[5] }]}>
          <Button label="촬영" variant="primary" loading={capturing} onPress={handleCapturePhoto} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={8}
          >
            <AppIcon name="back" size={22} color={color.ink900} />
          </Pressable>
          <Text style={styles.navTitle}>제품 등록</Text>
        </View>
        <View style={styles.navDivider} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headingArea}>
          <Text style={styles.heading}>어떤 제품인가요?</Text>
          <Text style={styles.subheading}>성분표를 보고 입력해주세요</Text>
        </View>

        <Pressable
          onPress={() => setCameraOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={photoUri ? '제품 사진 다시 찍기' : '제품 사진 촬영'}
          style={styles.photoPicker}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoThumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <IconCamera size={24} color={color.ink300} />
            </View>
          )}
          <Text style={styles.photoPickerLabel}>{photoUri ? '다시 찍기' : '제품 사진 촬영'}</Text>
        </Pressable>

        <Input
          value={name}
          onChangeText={setName}
          placeholder="제품명 (예: 어성초 진정 토너)"
          accessibilityLabel="제품명"
          maxLength={40}
        />
        <Input
          value={brand}
          onChangeText={setBrand}
          placeholder="브랜드명 (예: 이니스프리)"
          accessibilityLabel="브랜드명"
          maxLength={30}
        />

        <View style={styles.categorySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {PRODUCT_CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={PRODUCT_CATEGORY_LABELS[c]}
                  accessibilityState={{ selected: active }}
                  onPress={() => setCategory(c)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {PRODUCT_CATEGORY_LABELS[c]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.ingredientSection}>
          <Text style={styles.fieldLabel}>성분 입력</Text>
          <TextInput
            value={ingredientsText}
            onChangeText={setIngredientsText}
            placeholder="정제수, 글리세린, 나이아신아마이드, 어성초추출물..."
            placeholderTextColor={color.ink300}
            multiline
            numberOfLines={4}
            style={styles.textarea}
            accessibilityLabel="성분 입력"
          />
        </View>

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            성분을 모른다면 일부만 입력하거나 비워두세요. AI가 바코드/사진으로 채울 수 있어요
          </Text>
        </View>

        {routinesQuery.data && routinesQuery.data.length > 0 ? (
          <View style={styles.routineSection}>
            <Text style={styles.fieldLabel}>루틴에 추가 (선택, 중복 가능)</Text>
            <View style={styles.categoryRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="루틴에 추가 안 함"
                accessibilityState={{ selected: selectedRoutineIds.size === 0 }}
                onPress={() => setSelectedRoutineIds(new Set())}
                style={[
                  styles.categoryChip,
                  selectedRoutineIds.size === 0 && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedRoutineIds.size === 0 && styles.categoryChipTextActive,
                  ]}
                >
                  추가 안 함
                </Text>
              </Pressable>
              {routinesQuery.data.map((routine) => {
                const active = selectedRoutineIds.has(routine.routineId);
                return (
                  <Pressable
                    key={routine.routineId}
                    accessibilityRole="button"
                    accessibilityLabel={routine.name}
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleRoutine(routine.routineId)}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {routine.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[3] }]}>
        <Button
          label="등록하기"
          variant="primary"
          disabled={!canSubmit}
          loading={registerMutation.isPending || addToRoutineMutation.isPending}
          onPress={handleSubmit}
          style={styles.bottomButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: color.bg,
  },
  cameraFill: {
    flex: 1,
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    alignItems: 'center',
  },
  photoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  photoThumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.ink300,
    backgroundColor: color.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerLabel: {
    ...typography.caption,
    color: color.brand700,
    ...weightFamily('semibold'),
  },
  nav: {
    backgroundColor: color.bg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  navTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  navDivider: {
    height: 1,
    backgroundColor: color.ink300,
    opacity: 0.4,
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[8],
    gap: space[4],
  },
  headingArea: {
    gap: 4,
    marginBottom: space[2],
  },
  heading: {
    ...typography.h1,
    color: color.ink900,
  },
  subheading: {
    ...typography.caption,
    color: color.ink600,
  },
  categorySection: {
    gap: space[2],
  },
  categoryRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  categoryChip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.ink300,
    backgroundColor: color.bg,
  },
  categoryChipActive: {
    backgroundColor: color.ink900,
    borderColor: color.ink900,
  },
  categoryChipText: {
    ...typography.caption,
    color: color.ink600,
    ...weightFamily('semibold'),
  },
  categoryChipTextActive: {
    color: color.bg,
  },
  ingredientSection: {
    gap: space[2],
  },
  routineSection: {
    gap: space[2],
  },
  fieldLabel: {
    fontSize: adjustFontSize(13),
    ...weightFamily('semibold'),
    color: color.ink600,
  },
  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: color.ink300,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: adjustFontSize(15),
    ...weightFamily('regular'),
    color: color.ink900,
    backgroundColor: color.bg,
    textAlignVertical: 'top',
  },
  hintBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink300,
    borderRadius: radius.md,
    padding: space[3],
  },
  hintText: {
    ...typography.caption,
    color: color.ink600,
  },
  errorText: {
    ...typography.caption,
    color: color.statusCaution,
  },
  bottomBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  bottomButton: {
    width: '100%',
  },
});
