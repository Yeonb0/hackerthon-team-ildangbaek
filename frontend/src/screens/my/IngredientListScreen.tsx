// IngredientListScreen.tsx — 성분 전체 목록 (F-MY-03, S-23에서 진입)
//
// USER-02(GET /users/me/ingredient-profile) 기준. BR1: INSUFFICIENT 성분의 reason은
// 항상 null — 데이터가 부족한 성분에 판단 근거를 지어내지 않는다. BR2: recordCount를
// 함께 보여줘서 "왜 아직 지켜보는 중인지" 사용자가 이해할 수 있게 한다. BR3: 정렬은
// GOOD → CAUTION → INSUFFICIENT, 그룹 내 recordCount 내림차순(서버가 이미 이 순서로
// 내려줌 — mock도 동일하게 정렬해서 반환).
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-17 (세션 14) — Figma IngredientList(59:7343) 확정본 반영.
//
//   · 제목 "성분 전체 보기" → "성분 전체 목록"
//   · 성분 검색 입력 신규. USER-02에 keyword 파라미터가 없어서 **클라이언트 필터**입니다
//     (이미 받아온 목록 안에서만 거릅니다). 서버 검색이 필요할 만큼 성분 수가 많아지면
//     그때 파라미터를 요청하면 됩니다.
//   · 행 레이아웃: 배지가 왼쪽 → **오른쪽**으로. 성분명 아래 설명 한 줄.
//   · 행 사이 구분선(Figma 59:7396).
//
// Figma와 의도적으로 다르게 간 곳:
//
//   · **"미확인" 칩 미채택** — Figma 필터 칩은 5개(전체/잘 맞음/지켜보는 중/주의/미확인)
//     인데 서버 상태는 3종뿐이라 "미확인"에 대응할 값이 없습니다. 넣으면 눌러도 항상
//     빈 목록이 나오는 죽은 칩이 됩니다(Figma 리스트 본문에도 미확인 배지가 없습니다).
//   · **성분 효능 설명 + 개인 판정 근거를 2줄로** — Figma는 성분명 아래 "미백·모공 축소
//     효과" 같은 사전 정보 **한 줄**만 답니다. 예전에는 그 필드가 API에 없어서 그 자리에
//     `reason`(개인 판정 근거)을 대신 넣어뒀는데, 요청했던 `description` 필드가 백엔드에
//     추가되면서(2026-08-16) 둘 다 갖게 됐습니다. 성격이 다른 정보라 합치지 않고 2줄로
//     나눴습니다(관리자 결정 B안, 2026-08-18) — `reason`은 "내 피부에서 이랬다"는 개인
//     근거라 이 앱의 차별점이고, 사전 설명으로 대체하면 사라집니다.
//     `description`은 백엔드 성분 사전 시드가 아직 없어 대부분 null이고, null이면 그 줄을
//     통째로 생략하므로 **당분간 실서버에선 예전과 똑같이 2줄로 보입니다.**
//     ⚠️ 두 줄이 된 뒤의 행 높이·색 위계는 Figma 미확정입니다.
//   · **구분선 실선** — Figma는 점선(border-dashed)인데 RN은 View에 점선 테두리를 주면
//     안드로이드에서 렌더가 불안정합니다(borderStyle: 'dashed'가 무시되거나 모서리가
//     깨짐). 1px 실선으로 둡니다.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '@/components/base/AppTextInput';
import { Tag, TagVariant } from '@/components/base/Tag';
import { CategoryFilterBar } from '@/components/domain/CategoryFilterBar';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { EmptyState } from '@/components/state/EmptyState';
import { IconBack, IconSearch } from '@/components/icons';
import { useIngredientProfile } from '@/api/queries/user';
import { INGREDIENT_STATUS_LABEL } from '@/lib/ingredientStatus';
import { DetailStackParamList } from '@/app/routes';
import { color, radius, space } from '@/theme';
import { adjustFontSize, weightFamily } from '@/theme/typography';
import type { IngredientListItem, IngredientStatus } from '@/types/user';

const STATUS_TO_TAG_VARIANT: Record<IngredientStatus, TagVariant> = {
  GOOD: 'match',
  CAUTION: 'caution',
  INSUFFICIENT: 'insufficient',
};

// 라벨은 lib/ingredientStatus.ts 단일 정의를 씁니다(2026-08-17 전 화면 통일).
const STATUS_LABEL = INGREDIENT_STATUS_LABEL;

// Figma 칩 순서(잘 맞음 → 지켜보는 중 → 주의)를 따릅니다. "전체"는 CategoryFilterBar가
// 앞에 고정으로 붙입니다.
const STATUS_OPTIONS: IngredientStatus[] = ['GOOD', 'INSUFFICIENT', 'CAUTION'];

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * 성분명 아래 **개인 판정 근거** 한 줄.
 *
 * `reason`이 있으면 그대로 쓰고, 없으면(= INSUFFICIENT, BR1) 기록 횟수를 보여줍니다 —
 * "왜 아직 판정이 안 났는지"를 가늠할 수 있는 유일한 단서라서입니다(BR2).
 *
 * ⚠️ 2026-08-18 — 이 함수는 이제 **성분 사전 설명(description)이 아닙니다.** 백엔드가
 * `description` 필드를 추가해주면서 둘이 분리됐습니다. 여기는 "내 피부에서 이랬다"는
 * 개인 판정 근거 전용이고, 일반 설명은 `item.description`이 따로 담습니다.
 * 항상 값이 있으므로 이 줄은 절대 비지 않습니다.
 */
function reasonOf(item: IngredientListItem): string {
  if (item.reason) return item.reason;
  return item.recordCount > 0
    ? `기록 ${item.recordCount}회 · 판단하기엔 아직 부족해요`
    : '아직 기록이 없어요';
}

export function IngredientListScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<DetailStackParamList, 'IngredientList'>>();

  const [selectedStatus, setSelectedStatus] = useState<IngredientStatus | null>(
    route.params?.initialStatus ?? null
  );
  const [keyword, setKeyword] = useState('');

  const { data, isLoading, isError, refetch } = useIngredientProfile(selectedStatus ?? undefined);

  // 검색은 클라이언트 필터입니다(위 주석 참고). 공백만 입력한 경우는 전체로 봅니다.
  const visibleItems = useMemo(() => {
    if (!data) return [];
    const q = keyword.trim();
    if (q.length === 0) return data.ingredients;
    return data.ingredients.filter((item) => item.name.includes(q));
  }, [data, keyword]);

  const searching = keyword.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[3] }]}>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={12}
          >
            <IconBack size={18} color={color.textInk} />
          </Pressable>
          <Text style={styles.title}>성분 전체 목록</Text>
        </View>

        {/* Figma 59:7357 — 아이콘이 입력 안쪽에 들어간 형태라 공용 Input(아이콘 슬롯이
            없음) 대신 여기서 직접 구성합니다. */}
        <View style={styles.searchBox}>
          <IconSearch size={14} color={color.textMuted} />
          <AppTextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="성분 검색"
            placeholderTextColor={color.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="성분 검색"
            maxLength={20}
          />
        </View>

        <CategoryFilterBar
          categories={STATUS_OPTIONS}
          selected={selectedStatus}
          onSelect={(value) => setSelectedStatus(value as IngredientStatus | null)}
          getLabel={(value) => STATUS_LABEL[value as IngredientStatus]}
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

      {!isLoading && !isError && data && visibleItems.length === 0 && (
        <View style={styles.centerFill}>
          <EmptyState
            icon="flask"
            title={searching ? '검색 결과가 없어요' : '해당하는 성분이 없어요'}
            description={
              searching ? '다른 이름으로 찾아보세요.' : '필터를 바꾸거나 기록을 더 쌓아보세요.'
            }
          />
        </View>
      )}

      {!isLoading && !isError && data && visibleItems.length > 0 && (
        <ScrollView contentContainerStyle={styles.content}>
          {visibleItems.map((item, index) => (
            <View key={item.ingredientId}>
              <View style={styles.row}>
                <View style={styles.textArea}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {/* 성분 사전 설명 — 백엔드 시드가 아직 없어 대부분 null입니다.
                      값이 있을 때만 줄을 만들어서, 없으면 기존과 똑같이 2줄로 보입니다. */}
                  {item.description ? (
                    <Text style={styles.ingredientDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.reason} numberOfLines={1}>
                    {reasonOf(item)}
                  </Text>
                </View>
                <Tag variant={STATUS_TO_TAG_VARIANT[item.status]} />
              </View>
              {/* 마지막 행 아래에는 선을 긋지 않습니다(Figma 59:7487도 동일). */}
              {index < visibleItems.length - 1 ? <View style={styles.divider} /> : null}
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
    paddingBottom: space[4],
    gap: space[4],
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  title: {
    fontSize: adjustFontSize(17),
    lineHeight: 24,
    ...weightFamily('bold'),
    color: color.textInk,
  },

  // --- 검색 (Figma 59:7352) ---
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    gap: space[2],
  },
  searchInput: {
    flex: 1,
    // 안드로이드 TextInput은 기본 세로 패딩이 있어서, 높이가 고정된 박스 안에 넣으면
    // 글자가 아래로 쏠립니다. 0으로 지우고 박스의 alignItems로 중앙을 맞춥니다.
    paddingVertical: 0,
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textInk,
  },

  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
  },

  // --- 목록 행 (Figma 59:7380) ---
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[4],
  },
  textArea: {
    flex: 1,
    // 두 줄이 붙어 보이지 않도록 최소 간격만 줍니다. description이 없으면 이 gap도
    // 무의미해져서(자식이 2개뿐) 기존 레이아웃과 동일하게 보입니다.
    gap: 2,
  },
  name: {
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  /**
   * 성분 사전 설명(item.description) — 일반 정보라 아래 reason보다 한 톤 옅게 둡니다.
   * ⚠️ 색·간격은 Figma 미확정 상태의 잠정값입니다. Figma에는 이 자리에 설명 한 줄만
   * 있고 개인 판정 근거는 없어서, 두 줄이 된 지금의 위계는 확인이 필요합니다.
   */
  ingredientDescription: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textMuted,
  },
  /** 개인 판정 근거(reason) — 이 앱의 핵심 정보라 기존 스타일을 그대로 유지합니다. */
  reason: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  divider: {
    height: 1,
    backgroundColor: color.borderDividerFaint,
  },
});