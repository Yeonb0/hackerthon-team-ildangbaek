// MyPageScreen.tsx — S-23 마이페이지
//
// F-MY-01 BR1: 이름을 큰 제목으로, 활동 통계(가입 N일째 · 기록 N회)를 아래에 표시.
// F-MY-02: 완성도 게이지 + "내 성분 반응" 배지(맞음/주의/데이터부족) — 값은
// F-ANALYSIS-05 기준이라 구매 전 확인(Phase 7 CHECK) 화면과 같아야 함(USER-01 BR5).
// F-MY-03: 요약에는 상위 8건만, 전체는 별도 화면(IngredientList)에서.
// F-AUTH-03: 로그아웃은 "설정 메뉴 3행"(위치·알림·로그아웃) 중 하나. 즉시 처리하지
// 않고 확인 팝업을 거친다(BR1) — Popup.tsx 재사용.
//
// 완성도 게이지는 별도 원형 컴포넌트를 새로 만들지 않고 기존 ProgressBar(Phase 2)를
// 재사용했습니다 — 디자인 미확정 구간이라 "구조 우선" 원칙에 맞춥니다. 알림 토글도
// 전용 Switch 베이스 컴포넌트 없이 RN 기본 Switch를 그대로 썼습니다(사용처가 여기
// 한 곳뿐이라 지금 단계에서 컴포넌트로 분리할 실익이 적음).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconBell, IconChevronRight, IconLocationPin, IconLogout } from '@/components/icons';
import { Card } from '@/components/base/Card';
import { Tag, TagVariant } from '@/components/base/Tag';
import { ProgressBar } from '@/components/base/ProgressBar';
import { Popup } from '@/components/base/Popup';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { useMyPage, useUpdateNotificationSetting, useLogout } from '@/api/queries/user';
import { useFontStore, FontChoice } from '@/store/fontStore';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { IngredientStatus } from '@/types/user';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const STATUS_TO_TAG_VARIANT: Record<IngredientStatus, TagVariant> = {
  GOOD: 'match',
  CAUTION: 'caution',
  INSUFFICIENT: 'insufficient',
};

export function MyPageScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useMyPage();
  const updateNotification = useUpdateNotificationSetting();
  const logoutMutation = useLogout();
  const fontChoice = useFontStore((s) => s.fontChoice);
  const setFontChoice = useFontStore((s) => s.setFontChoice);

  const [logoutPopupVisible, setLogoutPopupVisible] = useState(false);
  const [restartPopupVisible, setRestartPopupVisible] = useState(false);

  const handleSelectFont = async (choice: FontChoice) => {
    if (choice === fontChoice) return;
    await setFontChoice(choice);
    // fontFamily는 StyleSheet.create 스냅샷이라 지금 떠 있는 화면엔 즉시 반영되지
    // 않습니다(typography.ts 주석 참고) — 재시작이 필요하다는 걸 바로 안내합니다.
    setRestartPopupVisible(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <LoadingState />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <ErrorState variant="server" onRetry={refetch} />
      </View>
    );
  }

  const { ingredientProfile } = data;

  const handleStatusPress = (status: IngredientStatus) => {
    navigation.navigate(DetailRoutes.IngredientList, { initialStatus: status });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[6] }]}
      >
        {/* F-MY-01: 이름 = 큰 제목, 아래에 활동 통계 */}
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.statLine}>
          가입 {data.joinedDays}일째 · 기록 {data.totalRecordCount}회
        </Text>

        {/* F-MY-02: 성분 프로파일 카드 */}
        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>내 성분 프로파일</Text>
            <Text style={styles.completionText}>{ingredientProfile.completionRate}% 완성</Text>
          </View>
          <ProgressBar progress={ingredientProfile.completionRate / 100} style={styles.gauge} />

          <View style={styles.statusSummaryRow}>
            <Tag
              variant="match"
              label={`맞음 ${ingredientProfile.goodCount}`}
              style={styles.statusChip}
            />
            <Tag
              variant="caution"
              label={`주의 ${ingredientProfile.cautionCount}`}
              style={styles.statusChip}
            />
            <Tag
              variant="insufficient"
              label={`데이터부족 ${ingredientProfile.insufficientCount}`}
              style={styles.statusChip}
            />
          </View>

          {ingredientProfile.topIngredients.length > 0 && (
            <View style={styles.ingredientList}>
              {ingredientProfile.topIngredients.map((item) => (
                <Pressable
                  key={item.ingredientId}
                  style={styles.ingredientRow}
                  onPress={() => handleStatusPress(item.status)}
                  accessibilityRole="button"
                >
                  <Tag variant={STATUS_TO_TAG_VARIANT[item.status]} />
                  <Text style={styles.ingredientName}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.viewAllRow}
            onPress={() => navigation.navigate(DetailRoutes.IngredientList, undefined)}
            accessibilityRole="button"
          >
            <Text style={styles.viewAllText}>성분 전체 보기</Text>
            <IconChevronRight size={18} color={color.ink300} />
          </Pressable>
        </Card>

        {/* 설정 메뉴 3행 — 위치 · 알림 · 로그아웃(F-AUTH-03) */}
        <Card style={styles.section} padding={2}>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate(DetailRoutes.LocationSettings, undefined)}
            accessibilityRole="button"
          >
            <IconLocationPin size={20} color={color.ink600} />
            <Text style={styles.menuLabel}>위치 설정</Text>
            <Text style={styles.menuValue}>{data.location ?? '설정 안 됨'}</Text>
            <IconChevronRight size={18} color={color.ink300} />
          </Pressable>

          <View style={styles.menuRow}>
            <IconBell size={20} color={color.ink600} />
            <Text style={styles.menuLabel}>알림 설정</Text>
            <Switch
              value={data.notificationEnabled}
              onValueChange={(enabled) => updateNotification.mutate({ enabled })}
              trackColor={{ false: color.ink300, true: color.brand500 }}
            />
          </View>

          {/* Phase 12(2026-08-13) 부가 요청 — 글꼴 선택. 42종 아이콘 세트에 딱 맞는
              폰트/텍스트 아이콘이 없어서 이 행만 아이콘 없이 라벨만 둡니다(체크포인트 9-B와
              같은 원칙 — 대응 아이콘 없으면 무리해서 넣지 않음). */}
          <View style={[styles.menuRow, styles.fontRow]}>
            <Text style={styles.menuLabel}>글꼴</Text>
            <SegmentToggle
              options={[
                { value: 'pretendard' as FontChoice, label: 'Pretendard' },
                { value: 'nanumSquareNeo' as FontChoice, label: '나눔스퀘어네오' },
              ]}
              value={fontChoice}
              onChange={handleSelectFont}
              style={styles.fontToggle}
            />
          </View>

          <Pressable
            style={styles.menuRow}
            onPress={() => setLogoutPopupVisible(true)}
            accessibilityRole="button"
          >
            <IconLogout size={20} color={color.statusCaution} />
            <Text style={[styles.menuLabel, { color: color.statusCaution }]}>로그아웃</Text>
          </Pressable>
        </Card>
      </ScrollView>

      <Popup
        visible={logoutPopupVisible}
        title="로그아웃 하시겠어요?"
        description="다시 로그인하면 기존 기록을 그대로 이어볼 수 있어요."
        primaryLabel="로그아웃"
        onPrimaryPress={() => {
          setLogoutPopupVisible(false);
          logoutMutation.mutate();
        }}
        secondaryLabel="취소"
        onSecondaryPress={() => setLogoutPopupVisible(false)}
        onRequestClose={() => setLogoutPopupVisible(false)}
      />

      <Popup
        visible={restartPopupVisible}
        title="글꼴 설정을 저장했어요"
        description={
          '지금 버전에서는 선택하신 글꼴이 화면에 바로 적용되지 않아요.\n' +
          '이 부분은 다음 업데이트에서 마저 반영할 예정이에요.'
        }
        primaryLabel="확인"
        onPrimaryPress={() => setRestartPopupVisible(false)}
        onRequestClose={() => setRestartPopupVisible(false)}
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
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
    gap: space[4],
  },
  name: {
    ...typography.display,
    color: color.ink900,
  },
  statLine: {
    ...typography.body,
    color: color.ink600,
    marginTop: -space[2],
  },
  section: {
    gap: space[3],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h2,
    color: color.ink900,
  },
  completionText: {
    ...typography.caption,
    color: color.brand700,
    fontWeight: '600',
  },
  gauge: {
    marginTop: space[1],
  },
  statusSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  statusChip: {},
  ingredientList: {
    gap: space[3],
    marginTop: space[2],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  ingredientName: {
    ...typography.body,
    color: color.ink900,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.ink300,
  },
  viewAllText: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[3],
  },
  fontRow: {
    justifyContent: 'space-between',
  },
  fontToggle: {
    width: 220,
  },
  menuLabel: {
    ...typography.body,
    color: color.ink900,
    flex: 1,
  },
  menuValue: {
    ...typography.caption,
    color: color.ink600,
  },
});