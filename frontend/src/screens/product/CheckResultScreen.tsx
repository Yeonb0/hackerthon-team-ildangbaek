// CheckResultScreen.tsx — S-22 위험도 결과
//
// 진입 즉시 CHECK-02(POST /checks)를 호출합니다 — AnalyzingSkinScreen(S-17)과 같은
// "진입 시 자동 실행" 패턴입니다. F-CHECK-04 BR1: 제품명은 작게, 위험도 등급이 큰
// 제목입니다(사용자가 가장 먼저 읽어야 할 정보라서). 두 가지 409(CHECK_PROFILE_NOT_READY·
// CHECK_INGREDIENT_DATA_INSUFFICIENT)는 빨간 오류 UI가 아니라 빈 상태 안내로 처리합니다
// (명세서에 명시: "데이터 부족을 안전 또는 위험으로 임의 판단하지 않는다").
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Tag, TagVariant } from '@/components/base/Tag';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { computeCheck } from '@/api/queries/check';
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { CheckResult } from '@/types/check';
import type { IngredientStatus } from '@/types/product';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const RISK_COLOR: Record<CheckResult['riskLevel'], string> = {
  LOW: color.statusGood,
  MEDIUM: color.statusWatch,
  HIGH: color.statusCaution,
};

const STATUS_TO_TAG_VARIANT: Record<IngredientStatus, TagVariant> = {
  GOOD: 'match',
  CAUTION: 'caution',
  INSUFFICIENT: 'insufficient',
};

type Phase = 'computing' | 'result' | 'empty' | 'error';

export function CheckResultScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<DetailStackParamList, 'CheckResult'>>();
  const { productId } = route.params;

  const [phase, setPhase] = useState<Phase>('computing');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const submit = useCallback(async () => {
    setPhase('computing');
    try {
      const data = await computeCheck(productId);
      if (!isMountedRef.current) return;
      setResult(data);
      setPhase('result');
    } catch (e) {
      if (!isMountedRef.current) return;
      if (e instanceof ApiError && e.code === ErrorCode.CHECK_PROFILE_NOT_READY) {
        setEmptyMessage('아직 판단할 데이터가 부족해요.');
        setPhase('empty');
        return;
      }
      if (e instanceof ApiError && e.code === ErrorCode.CHECK_INGREDIENT_DATA_INSUFFICIENT) {
        setEmptyMessage('확인할 수 없는 성분이 포함되어 있어요.');
        setPhase('empty');
        return;
      }
      setPhase('error');
    }
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckAnother = () => {
    // 이미 끝난 확인 플로우로 뒤로가기 할 이유가 없어서, 쇼핑 홈까지 스택을 정리합니다
    // (IngredientCheckScreen의 handleBackToRecordHub와 같은 패턴).
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', state: { routes: [{ name: MainTabRoutes.Shopping }] } }],
    });
  };

  const handleGoToRecordHub = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', state: { routes: [{ name: MainTabRoutes.RecordHub }] } }],
    });
  };

  if (phase === 'computing') {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <LoadingState />
        <Text style={styles.computingText}>성분을 분석하는 중이에요…</Text>
      </View>
    );
  }

  if (phase === 'empty') {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <EmptyState
          icon="info"
          title={emptyMessage}
          description="데이터가 더 쌓이면 정확하게 확인할 수 있어요."
          actionLabel="기록하러 가기"
          onAction={handleGoToRecordHub}
        />
      </View>
    );
  }

  if (phase === 'error' || !result) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <ErrorState variant="server" onRetry={submit} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[6] }]}>
        <Text style={styles.productName}>{result.productName}</Text>
        <Text style={[styles.riskTitle, { color: RISK_COLOR[result.riskLevel] }]}>
          {result.riskTitle}
        </Text>
        <Text style={styles.riskDescription}>{result.riskDescription}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>근거 성분</Text>
          <View style={styles.ingredientList}>
            {result.ingredients.map((ingredient) => (
              <View key={ingredient.ingredientId} style={styles.ingredientRow}>
                <Tag variant={STATUS_TO_TAG_VARIANT[ingredient.status]} />
                <View style={styles.ingredientTextArea}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  {ingredient.reason ? (
                    <Text style={styles.ingredientReason}>{ingredient.reason}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[5] }]}>
        <Button
          label="다른 제품 확인하기"
          variant="primary"
          onPress={handleCheckAnother}
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
  computingText: {
    ...typography.caption,
    color: color.ink600,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
    gap: space[2],
  },
  productName: {
    ...typography.caption,
    color: color.ink600,
  },
  riskTitle: {
    fontSize: adjustFontSize(28),
    ...weightFamily('bold'),
  },
  riskDescription: {
    ...typography.body,
    color: color.ink600,
    marginBottom: space[3],
  },
  section: {
    gap: space[3],
    marginTop: space[4],
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  ingredientList: {
    gap: space[3],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  ingredientTextArea: {
    flex: 1,
    gap: 2,
  },
  ingredientName: {
    ...typography.body,
    color: color.ink900,
  },
  ingredientReason: {
    ...typography.caption,
    color: color.ink600,
  },
  bottomBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  bottomButton: {
    width: '100%',
  },
});
