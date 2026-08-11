// IngredientListScreen.tsx — 성분 전체 보기 (F-MY-03, S-23에서 진입)
//
// USER-02(GET /users/me/ingredient-profile) 기준. BR1: INSUFFICIENT 성분의 reason은
// 항상 null — 데이터가 부족한 성분에 판단 근거를 지어내지 않는다. BR2: recordCount를
// 함께 보여줘서 "왜 아직 데이터 부족인지" 사용자가 이해할 수 있게 한다. BR3: 정렬은
// GOOD → CAUTION → INSUFFICIENT, 그룹 내 recordCount 내림차순(서버가 이미 이 순서로
// 내려줌 — mock도 동일하게 정렬해서 반환).
//
// 상태별 필터는 새 컴포넌트를 만들지 않고 Phase 7의 CategoryFilterBar(범용
// categories: string[])를 그대로 재사용했습니다.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tag, TagVariant } from '@/components/base/Tag';
import { CategoryFilterBar } from '@/components/domain/CategoryFilterBar';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { useIngredientProfile } from '@/api/queries/user';
import { DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { IngredientStatus } from '@/types/user';

const STATUS_TO_TAG_VARIANT: Record<IngredientStatus, TagVariant> = {
  GOOD: 'match',
  CAUTION: 'caution',
  INSUFFICIENT: 'insufficient',
};

const STATUS_LABEL: Record<IngredientStatus, string> = {
  GOOD: '맞음',
  CAUTION: '주의',
  INSUFFICIENT: '데이터부족',
};

const STATUS_OPTIONS: IngredientStatus[] = ['GOOD', 'CAUTION', 'INSUFFICIENT'];

export function IngredientListScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<DetailStackParamList, 'IngredientList'>>();

  const [selectedStatus, setSelectedStatus] = useState<IngredientStatus | null>(
    route.params?.initialStatus ?? null
  );

  const { data, isLoading, isError, refetch } = useIngredientProfile(selectedStatus ?? undefined);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[4] }]}>
        <Text style={styles.title}>성분 전체 보기</Text>
        <CategoryFilterBar
          categories={STATUS_OPTIONS}
          selected={selectedStatus}
          onSelect={(value) => setSelectedStatus(value as IngredientStatus | null)}
          getLabel={(value) => STATUS_LABEL[value as IngredientStatus]}
          style={styles.filterBar}
        />
      </View>

      {isLoading && (
        <View style={styles.centerFill}>
          <LoadingState />
        </View>
      )}

      {isError && (
        <View style={styles.centerFill}>
          <ErrorState variant="server" onRetry={refetch} />
        </View>
      )}

      {!isLoading && !isError && data && data.ingredients.length === 0 && (
        <View style={styles.centerFill}>
          <EmptyState
            icon="flask"
            title="해당하는 성분이 없어요"
            description="필터를 바꾸거나 기록을 더 쌓아보세요."
          />
        </View>
      )}

      {!isLoading && !isError && data && data.ingredients.length > 0 && (
        <ScrollView contentContainerStyle={styles.content}>
          {data.ingredients.map((item) => (
            <View key={item.ingredientId} style={styles.row}>
              <Tag variant={STATUS_TO_TAG_VARIANT[item.status]} />
              <View style={styles.textArea}>
                <Text style={styles.name}>{item.name}</Text>
                {item.reason ? (
                  <Text style={styles.reason}>{item.reason}</Text>
                ) : (
                  <Text style={styles.reasonMuted}>아직 판단할 데이터가 부족해요</Text>
                )}
                <Text style={styles.recordCount}>기록 {item.recordCount}회</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[3],
    gap: space[3],
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  filterBar: {},
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
    gap: space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  reason: {
    ...typography.caption,
    color: color.ink600,
  },
  reasonMuted: {
    ...typography.caption,
    color: color.ink300,
    fontStyle: 'italic',
  },
  recordCount: {
    ...typography.micro,
    color: color.ink300,
    marginTop: 2,
  },
});
