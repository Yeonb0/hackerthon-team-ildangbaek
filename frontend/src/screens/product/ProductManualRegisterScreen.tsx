// src/screens/product/ProductManualRegisterScreen.tsx — PROD-05 제품 직접 등록
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
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '@/components/base/AppTextInput';
import { AppIcon, IconCamera } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { KeyboardAvoidingScreen } from '@/components/base/KeyboardAvoidingScreen';
import { Input } from '@/components/base/Input';
import { LoadingState } from '@/components/state/LoadingState';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { prepareProductPhoto } from '@/lib/image';
import {
  matchProduct,
  useAddProductToRoutine,
  useRegisterProduct,
  useRoutines,
  useSaveProductToLibrary,
} from '@/api/queries/product';
import { Popup } from '@/components/base/Popup';
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
  const { timeSlot, initialKeyword, initialRoutineId } = route.params;

  const [name, setName] = useState(initialKeyword ?? '');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [ingredientsText, setIngredientsText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** GET /products/match에서 같은 이름·브랜드 제품이 잡힌 경우의 productId(팝업 표시용). */
  const [matchedProductId, setMatchedProductId] = useState<number | null>(null);

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
  // 기존 제품 재사용 경로에서만 씁니다(등록 경로는 registerProduct 내부에서 저장합니다).
  const saveMutation = useSaveProductToLibrary();

  // 관리자님 요청(2026-08-14) — 모닝/나이트 루틴 둘 다 동시에 추가할 수 있게 다중 선택으로.
  // initialRoutineId(2026-08-15 세션5, RoutineAddProductScreen "새 제품 등록하기"에서 옴)가
  // 있으면 그 루틴을 기본으로 미리 체크해둡니다 — 루틴 수정 흐름에서 온 거니 그 루틴에
  // 담으려는 의도가 명확하기 때문입니다. 사용자가 직접 해제하거나 다른 루틴을 추가로
  // 고를 수 있습니다.
  const routinesQuery = useRoutines();
  // 칩 순서를 모닝 → 나이트로 고정합니다(S-14와 동일). 서버 반환 순서에 기대면
  // 계정마다 칩 위치가 달라져서, 같은 자리를 누르던 사용자가 반대 루틴을 고르게 됩니다.
  const orderedRoutines = [...(routinesQuery.data ?? [])].sort((a, b) =>
    a.timeSlot === b.timeSlot ? 0 : a.timeSlot === 'MORNING' ? -1 : 1
  );
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<number>>(
    initialRoutineId ? new Set([initialRoutineId]) : new Set()
  );
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

  /**
   * 제품이 정해진 뒤의 공통 처리 — 새로 등록했든 기존 제품을 재사용했든 동일합니다.
   * (2026-08-19 세션 20에 중복 매칭 분기가 생기면서 handleSubmit에서 떼어냈습니다.)
   */
  const continueWithProduct = async (productId: number) => {
    if (selectedRoutineIds.size === 0) {
      // 2026-08-19(세션 18, 관리자님 지시) — 예전엔 성분 확인(S-14)으로 넘겨서
      // 거기서 다시 고르게 했는데, 이 화면에 이미 같은 3지선다가 있어서 두 번
      // 묻는 셈이었습니다. 「제품만 등록하기」면 등록으로 이미 끝난 상태라
      // 제품 기록(S-11)으로 바로 돌아갑니다.
      navigation.replace(DetailRoutes.ProductRecord, { timeSlot });
      return;
    }

    // 루틴에 추가하는 건 "오늘 기록"이 아니라 루틴 구성을 바꾸는 것이라(관리자님
    // 확인, 2026-08-13), 성분확인/기록완료로 보내지 않습니다. 모닝/나이트 둘 다
    // 고를 수 있어서(관리자님 요청, 2026-08-14) 순서대로 하나씩 추가합니다.
    for (const routineId of selectedRoutineIds) {
      await addToRoutineMutation.mutateAsync({ routineId, productId });
    }

    // 루틴에 추가만 해두고 방금 등록한 제품이 바로 보이는 제품 기록(S-11) 화면으로
    // 돌아갑니다(관리자님 요청, 2026-08-14 — 기록 허브로 나갔다가 다시 들어오면 목록이
    // 안 보인다는 문제 보고 있었는데, 새로 mount되는 화면으로 보내는 편이 더 확실합니다).
    navigation.replace(DetailRoutes.ProductRecord, { timeSlot });
  };

  const handleSubmit = async () => {
    if (!canSubmit || !category) return;
    setSubmitError(null);
    try {
      // 2026-08-19(세션 20) — 등록 전에 GET /products/match로 같은 이름·브랜드가 이미
      // 있는지 확인합니다. 있으면 등록하지 않고 그 제품을 재사용할지 물어봅니다 —
      // 그냥 등록하면 같은 제품이 계정마다 새 row로 쌓이고, 성분 분석도 각자 따로
      // 갖게 됩니다. 조회 실패는 무시하고 등록으로 진행합니다(편의 기능이라 등록을
      // 막으면 안 됨).
      const match = await matchProduct(name.trim(), brand.trim()).catch(() => null);
      if (match?.matched && match.productId != null) {
        setMatchedProductId(match.productId);
        return;
      }

      const product = await registerMutation.mutateAsync({
        name: name.trim(),
        brand: brand.trim(),
        category,
        ingredientNames,
        imageUri: photoUri ?? undefined,
      });
      await continueWithProduct(product.productId);
    } catch {
      setSubmitError('등록에 실패했어요. 다시 시도해주세요.');
    }
  };

  /** 중복 매칭 팝업에서 "기존 제품 사용"을 고른 경우. */
  const handleUseMatchedProduct = async () => {
    const productId = matchedProductId;
    setMatchedProductId(null);
    if (productId == null) return;
    try {
      // 등록 경로(registerProduct)는 안에서 saveProductToLibrary를 이어 붙여 UserProduct를
      // 만듭니다. 기존 제품을 재사용할 때는 그 단계가 없어서, 여기서 직접 저장하지 않으면
      // "저장된 제품" 목록과 루틴 이름 조회에 안 잡힙니다.
      await saveMutation.mutateAsync(productId);
      await continueWithProduct(productId);
    } catch {
      setSubmitError('처리에 실패했어요. 다시 시도해주세요.');
    }
  };

  if (cameraOpen) {
    if (!permission) {
      return <LoadingState style={styles.centerFill} />;
    }
    if (!permission.granted) {
      return (
        <View style={[styles.centerFill, { paddingTop: insets.top }]}>
          <PermissionDenied
            type="camera"
            stage={permission.canAskAgain ? 'request' : 'guide'}
            onRequest={permission.canAskAgain ? requestPermission : undefined}
            description="제품 사진을 카메라로 촬영해요"
          />
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

      {/* 2026-08-19(세션 19, 관리자님 5번 항목) — 스크롤 영역과 하단 버튼을 **함께**
          감쌉니다. 스크롤 안쪽만 감싸면 「등록하기」가 키보드에 가려진 채로 남습니다.
          이 화면은 자기 ScrollView를 이미 갖고 있어서 scrollable={false}입니다. */}
      <KeyboardAvoidingScreen scrollable={false}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headingArea}>
            <Text style={styles.heading}>어떤 제품인가요?</Text>
            <Text style={styles.subheading}>성분을 자동으로 불러와 분석해드려요</Text>
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
                <IconCamera size={32} color={color.ink300} />
              </View>
            )}
            <Text style={styles.photoPickerLabel}>{photoUri ? '다시 찍기' : '제품 사진 촬영'}</Text>
          </Pressable>

          <Input
            label="제품명"
            value={name}
            onChangeText={setName}
            placeholder="예: 어성초 진정 토너"
            accessibilityLabel="제품명"
            maxLength={40}
          />
          <Input
            label="브랜드"
            value={brand}
            onChangeText={setBrand}
            placeholder="예: 이니스프리"
            accessibilityLabel="브랜드명"
            maxLength={30}
          />

          <View style={styles.categorySection}>
            <Text style={styles.categorySectionLabel}>제품 타입</Text>
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
            <AppTextInput
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
            <AppIcon name="info" size={16} color={color.brand700} style={styles.hintIcon} />
            <Text style={styles.hintText}>
              성분을 모른다면 일부만 입력하거나 비워두세요. AI가 바코드/사진으로 채울 수 있어요
            </Text>
          </View>

          {/* 2026-08-19 — 예전 조건(`length > 0`)은 서버가 루틴을 만들어 준다는 전제였고,
              실서버에서는 항상 거짓이라 이 섹션이 통째로 사라졌습니다. 이제 모닝·나이트
              루틴은 제품이 0개여도 항상 존재합니다(store/routineStore.ts). */}
          <View style={styles.routineSection}>
              {/* 2026-08-19 — 성분 확인 화면(S-14)과 문구·구조를 통일했습니다(관리자님 지시).
                  「추가 안 함」이라는 부정형 라벨은 아무것도 안 일어나는 것처럼 읽혀서,
                  실제 동작(제품 목록에는 등록됨)에 맞춰 「제품만 등록하기」로 바꿨습니다. */}
              <Text style={styles.fieldLabel}>어디에 등록할까요? (모닝·나이트 중복 가능)</Text>
              <View style={styles.categoryRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="제품만 등록하기"
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
                    제품만 등록하기
                  </Text>
                </Pressable>
                {orderedRoutines.map((routine) => {
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

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[3] }]}>
          <Button
            label="등록하기"
            variant="primary"
            disabled={!canSubmit}
            loading={
              registerMutation.isPending || addToRoutineMutation.isPending || saveMutation.isPending
            }
            onPress={handleSubmit}
            style={styles.bottomButton}
          />
        </View>
      </KeyboardAvoidingScreen>

      {/* 이미 같은 이름·브랜드의 제품이 서버에 있는 경우(GET /products/match).
          기존 제품을 쓰면 이 화면에서 입력한 카테고리·성분은 반영되지 않습니다 —
          서버에 그 제품을 수정하는 API가 없어서, 다르게 알고 있는 값을 덮어쓸 방법이
          없습니다. 그래서 문구로 미리 알립니다. */}
      <Popup
        visible={matchedProductId !== null}
        title="이미 등록된 제품이에요"
        description={`${brand.trim()} ${name.trim()}은(는) 이미 등록돼 있어요. 기존 제품으로 진행하면 입력하신 카테고리·성분 대신 등록된 정보가 쓰여요.`}
        primaryLabel="기존 제품 사용"
        onPrimaryPress={handleUseMatchedProduct}
        secondaryLabel="취소"
        onSecondaryPress={() => setMatchedProductId(null)}
        onRequestClose={() => setMatchedProductId(null)}
      />
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
    alignItems: 'center',
    alignSelf: 'center',
    gap: space[2],
  },
  photoThumbnail: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
  },
  photoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
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
  // Figma Label 패턴(제품명/브랜드 라벨과 동일 톤) — 이 화면엔 "제품 타입" 라벨이
  // 아예 없었어서 추가(2026-08-16, Figma 59:5839 대조).
  categorySectionLabel: {
    fontSize: adjustFontSize(11),
    ...weightFamily('bold'),
    color: color.textSub,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  // 2026-08-16 — Figma Chip/Default 실측 대조(관리자 결정: 그라데이션 대신 단색
  // 브랜드 컬러). 기존엔 흰 배경+회색 테두리(미선택) / 검정 배경(선택)이라 브랜드
  // 톤이 전혀 안 묻어났습니다. 루틴 추가 칩(routineSection)도 같은 스타일을
  // 재사용하고 있어서 톤이 같이 맞춰집니다.
  categoryChip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.surfaceLavenderSoft,
  },
  categoryChipActive: {
    backgroundColor: color.brand500,
  },
  categoryChipText: {
    ...typography.caption,
    color: color.textInk,
    ...weightFamily('medium'),
  },
  categoryChipTextActive: {
    color: color.bg,
    ...weightFamily('semibold'),
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
  // 2026-08-16 — Figma 59:5894 대조: 점선 테두리 → 연라벤더(surfaceLavenderPale)
  // 배경 실선 박스 + 안내 아이콘. 문구는 그대로 유지했습니다 — Figma 원문 문구는
  // "자동으로 불러와" 표현이라 AI 자동 채움 기능이 있는 것처럼 읽히는데, 이 화면은
  // 실제로 사용자가 성분을 직접 입력하는 구조라(위 성분 입력란) 문구까지 그대로
  // 옮기면 실제 동작과 어긋나 보일 수 있어서 기존 문구(수동 입력 안내)를 유지했습니다.
  hintBox: {
    flexDirection: 'row',
    gap: space[3],
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: radius.md,
    padding: space[4],
  },
  hintIcon: {
    marginTop: 2,
  },
  hintText: {
    flex: 1,
    ...typography.caption,
    color: color.textInk,
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