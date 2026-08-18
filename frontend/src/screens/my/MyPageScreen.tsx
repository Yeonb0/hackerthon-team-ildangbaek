// MyPageScreen.tsx — S-23 마이페이지
//
// F-MY-01 BR1: 이름을 큰 제목으로, 활동 통계(가입 N일째 · 기록 N회)를 아래에 표시.
// F-MY-02: 완성도 게이지 + "내 성분 반응" 배지(맞음/주의/데이터부족) — 값은
// F-ANALYSIS-05 기준이라 구매 전 확인(Phase 7 CHECK) 화면과 같아야 함(USER-01 BR5).
// F-MY-03: 요약에는 상위 8건만, 전체는 별도 화면(IngredientList)에서.
// F-AUTH-03: 로그아웃은 "설정 메뉴 3행"(위치·알림·로그아웃) 중 하나. 즉시 처리하지
// 않고 확인 팝업을 거친다(BR1) — Popup.tsx 재사용.
//
// 2026-08-17 (세션 14) — Figma MyPage(59:7181) 확정본 반영.
//   · 헤더가 아바타 + 이름 + 부제(나이·성별·피부타입·지역)로 바뀜. 나이·성별은 USER-01에
//     없어서 GET /users/me/profile(useProfile)을 같이 부릅니다 — 실패해도 화면을 막지
//     않고 부제만 짧아집니다.
//   · 통계 4열 카드 신규(성분 분석/잘 맞음/지켜보는 중/주의). 총계는 서버 필드가 아니라
//     세 값의 합입니다(Figma 실측 128 = 87+24+17로 일치).
//   · 완성도 게이지 제거(Figma에 없음) → 잘 맞음/주의 성분 pill 두 묶음으로 교체.
//   · 설정 메뉴는 Figma가 3행(위치/탈퇴 설정/탈퇴)으로 줄였지만 **기존 행을 유지**하고
//     탈퇴만 추가했습니다(관리자 결정) — 로그아웃은 F-AUTH-03 요구사항이고 글꼴·주 시작은
//     관리자 요청으로 넣은 기능이라, Figma 화면에 없다는 이유로 지우면 기능이 사라집니다.
//
// 알림 토글은 전용 Switch 베이스 컴포넌트 없이 RN 기본 Switch를 그대로 썼습니다
// (사용처가 여기 한 곳뿐이라 지금 단계에서 컴포넌트로 분리할 실익이 적음).
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppIcon,
  AppIconName,
  IconBell,
  IconChevronRight,
  IconLocationPin,
  IconLogout,
  IconTrash,
} from '@/components/icons';
import { Card } from '@/components/base/Card';
import { Popup } from '@/components/base/Popup';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import {
  useMyPage,
  useProfile,
  useUpdateNotificationSetting,
  useLogout,
  useWithdrawAccount,
} from '@/api/queries/user';
import { buildProfileSubtitle } from '@/lib/profileLabels';
import { useFontStore, FontChoice } from '@/store/fontStore';
import { useWeekStartStore } from '@/store/weekStartStore';
import type { WeekStart } from '@/lib/date';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import {
  color,
  ingredientPillTint,
  radius,
  reportColor,
  space,
  typography,
  weightFamily,
} from '@/theme';
import { adjustFontSize, pinDisplayFont } from '@/theme/typography';
import type { IngredientProfileSummary, IngredientStatus, TopIngredientItem } from '@/types/user';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * 통계 4열 (Figma 59:7196). `total`은 서버 필드가 아니라 세 값의 합입니다 —
 * Figma 실측값도 128 = 87 + 24 + 17로 정확히 맞아떨어집니다.
 *
 * "지켜보는 중"은 서버의 INSUFFICIENT입니다(관리자 확정, 2026-08-17) — 같은 상태의
 * 사용자 표기이고, 앱 전체에서 이 문구로 통일합니다.
 */
type StatKey = 'total' | 'good' | 'watching' | 'caution';

const STAT_ITEMS: { key: StatKey; label: string; tint: string }[] = [
  { key: 'total', label: '성분 분석', tint: color.textInk },
  { key: 'good', label: '잘 맞음', tint: reportColor.purple },
  { key: 'watching', label: '지켜보는 중', tint: reportColor.amber },
  { key: 'caution', label: '주의', tint: reportColor.caution },
];

function statValueOf(key: StatKey, profile: IngredientProfileSummary): number {
  switch (key) {
    case 'good':
      return profile.goodCount;
    case 'watching':
      return profile.insufficientCount;
    case 'caution':
      return profile.cautionCount;
    case 'total':
    default:
      return profile.goodCount + profile.insufficientCount + profile.cautionCount;
  }
}

/**
 * 성분 pill 묶음. Tag 컴포넌트를 쓰지 않는 이유는 tokens.ts의 ingredientPillTint
 * 주석 참고 — 묶음 제목이 이미 상태를 말해주므로 pill마다 아이콘을 반복하지 않습니다.
 *
 * 비어 있을 때 묶음을 통째로 숨기지 않고 안내 문구를 남깁니다. 잘 맞는 성분이 아직
 * 없는 신규 사용자에게 "주의 성분 목록"만 덩그러니 보이면 프로파일이 고장 난 것처럼
 * 읽히기 때문입니다.
 */
function IngredientPillGroup({
  title,
  icon,
  tint,
  items,
  emptyHint,
  onPress,
}: {
  title: string;
  icon: AppIconName;
  tint: { bg: string; fg: string };
  items: TopIngredientItem[];
  emptyHint: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.pillGroup}>
      <View style={styles.pillGroupTitleRow}>
        <AppIcon name={icon} size={20} color={tint.fg} />
        <Text style={[styles.pillGroupTitle, { color: tint.fg }]}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.pillEmptyHint}>{emptyHint}</Text>
      ) : (
        <Pressable
          style={styles.pillWrap}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${title} 전체 보기`}
        >
          {items.map((item) => (
            <View
              key={item.ingredientId}
              style={[styles.pill, { backgroundColor: tint.bg }]}
            >
              <Text style={[styles.pillLabel, { color: tint.fg }]}>{item.name}</Text>
            </View>
          ))}
        </Pressable>
      )}
    </View>
  );
}

export function MyPageScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useMyPage();
  const updateNotification = useUpdateNotificationSetting();
  const logoutMutation = useLogout();
  const withdrawMutation = useWithdrawAccount();
  // 부제 전용 보조 쿼리 — 실패해도 화면을 막지 않습니다(에러 분기에 넣지 않음).
  const { data: profile } = useProfile();
  const fontChoice = useFontStore((s) => s.fontChoice);
  const setFontChoice = useFontStore((s) => s.setFontChoice);
  const weekStart = useWeekStartStore((s) => s.weekStart);
  const setWeekStart = useWeekStartStore((s) => s.setWeekStart);

  const [logoutPopupVisible, setLogoutPopupVisible] = useState(false);
  const [withdrawPopupVisible, setWithdrawPopupVisible] = useState(false);
  const [withdrawFailedPopupVisible, setWithdrawFailedPopupVisible] = useState(false);
  const [restartPopupVisible, setRestartPopupVisible] = useState(false);
  /** 확인 팝업 대기 중인 선택값. null이면 팝업이 닫힌 상태입니다. */
  const [pendingFontChoice, setPendingFontChoice] = useState<FontChoice | null>(null);

  // 알림 스위치는 누르는 즉시 움직여야 합니다. 쿼리 캐시만 낙관적으로 고치면
  // onMutate가 비동기라 반영이 한 틱 늦고, 그 사이 RN Switch가 원래 자리로
  // 되돌아갔다 다시 움직여서 "버벅"으로 보입니다(관리자 제보, 2026-08-17).
  // 여기서 화면용 값을 따로 들고 즉시 바꾸고, 저장이 실패하면 되돌립니다.
  const [pendingNotification, setPendingNotification] = useState<boolean | null>(null);

  // 글꼴을 바꾸면 앱이 재시작됩니다(번들을 다시 평가해야 화면 글꼴이 바뀜 — typography.ts
  // 주석 참고). 사용자 입장에선 갑자기 앱이 튕긴 것처럼 보이므로 먼저 확인을 받습니다.
  // 여기서 바로 저장하지 않기 때문에, "아니오"를 누르면 토글 선택 표시도 원래대로 남습니다.
  const handleSelectFont = (choice: FontChoice) => {
    if (choice === fontChoice) return;
    setPendingFontChoice(choice);
  };

  const handleConfirmFontChange = async () => {
    const choice = pendingFontChoice;
    setPendingFontChoice(null);
    if (!choice) return;
    // 리로드가 걸리면 이 아래는 실행되지 않습니다. false면 수동 재시작 안내로 넘어갑니다
    // (프로덕션 빌드 — expo-updates를 붙이기 전까지의 폴백).
    const reloaded = await setFontChoice(choice);
    if (!reloaded) setRestartPopupVisible(true);
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

  // topIngredients는 최대 8건이고 상태 순(GOOD → CAUTION → INSUFFICIENT)으로 정렬돼
  // 옵니다. 여기서 두 묶음으로 가릅니다.
  const goodIngredients = ingredientProfile.topIngredients.filter((i) => i.status === 'GOOD');
  const cautionIngredients = ingredientProfile.topIngredients.filter(
    (i) => i.status === 'CAUTION'
  );

  const handleStatusPress = (status: IngredientStatus) => {
    navigation.navigate(DetailRoutes.IngredientList, { initialStatus: status });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── 프로필 헤더 (Figma 59:7183) ──
            라벤더 그라데이션 배경 위에 아바타 + 이름 + 부제. 아바타 이미지는 서버에
            없어서 이름 첫 글자를 원 안에 둡니다(Figma도 이미지 없이 원만 그려둠). */}
        <LinearGradient
          colors={[color.surfaceLavenderHeader, color.surfaceLavenderPale]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + space[5] }]}
        >
          <View style={styles.profileRow}>
            {/* 서버에 프로필 사진이 없어서 앱 아이콘을 씁니다(관리자 요청, 2026-08-17).
                알림 미리보기(S-07)와 같은 소스 파일이라 앱 아이덴티티가 일관됩니다. */}
            <View style={styles.avatar}>
              <Image
                source={require('../../../assets/skinteller-logo-icon-source.png')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.name} numberOfLines={1}>
                {data.name}
              </Text>
              {/* profile 쿼리는 실패해도 화면을 막지 않습니다 — 나이·성별이 빠진
                  짧은 부제로 자연스럽게 줄어듭니다. */}
              <Text style={styles.profileSubtitle} numberOfLines={2}>
                {buildProfileSubtitle({
                  age: profile?.age,
                  gender: profile?.gender,
                  skinTypes: data.skinTypes,
                  location: data.location,
                })}
              </Text>
            </View>
          </View>

          {/* 통계 4열 (Figma 59:7196). 총 분석 수는 서버 필드가 아니라 세 값의 합입니다 —
              Figma 실측값도 128 = 87 + 24 + 17로 정확히 맞습니다. */}
          <View style={styles.statsCard}>
            {STAT_ITEMS.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 ? <View style={styles.statDivider} /> : null}
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: item.tint }]}>
                    {statValueOf(item.key, ingredientProfile)}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1} allowFontScaling={false}>
                    {item.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── 내 성분 프로파일 (Figma 59:7230) ──
              완성도 게이지는 Figma에 없어 걷어냈습니다. 대신 잘 맞음/주의 두 묶음을
              pill로 보여줍니다. "지켜보는 중"은 묶음으로 그리지 않습니다 — 판정이
              아직 안 끝난 성분이라 프로파일에 확정 정보처럼 놓이면 오해를 줍니다
              (개수는 위 통계 카드에 이미 있습니다). */}
          <Card style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>내 성분 프로파일</Text>
              <Pressable
                onPress={() => navigation.navigate(DetailRoutes.IngredientList, undefined)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.viewAllText}>전체 성분 보기</Text>
              </Pressable>
            </View>

            <IngredientPillGroup
              title="잘 맞는 성분 목록"
              icon="faceGood"
              tint={ingredientPillTint.good}
              items={goodIngredients}
              emptyHint="아직 잘 맞는 성분이 확인되지 않았어요"
              onPress={() => handleStatusPress('GOOD')}
            />
            <IngredientPillGroup
              title="주의 성분 목록"
              icon="faceCaution"
              tint={ingredientPillTint.caution}
              items={cautionIngredients}
              emptyHint="주의가 필요한 성분은 아직 없어요"
              onPress={() => handleStatusPress('CAUTION')}
            />
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
            {/* thumbColor를 안 주면 안드로이드가 OS 기본 accent(초록)를 씁니다 —
                trackColor만 브랜드 색으로 바꿔도 동그라미가 초록으로 남던 원인입니다.
                흰 동그라미 + 보라 트랙 조합으로 고정합니다.
                ios_backgroundColor는 iOS 꺼짐 상태 트랙 색입니다. */}
            <Switch
              value={pendingNotification ?? data.notificationEnabled}
              onValueChange={(enabled) => {
                setPendingNotification(enabled);
                updateNotification.mutate(
                  { enabled },
                  // 실패했을 때만 되돌립니다. 성공 시 pending을 지우면, 서버 값이
                  // 아직 안 온 순간에 이전 값으로 잠깐 튀어 보입니다.
                  { onError: () => setPendingNotification(null) }
                );
              }}
              trackColor={{ false: color.ink300, true: color.brand500 }}
              thumbColor={color.bg}
              ios_backgroundColor={color.ink300}
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

          {/* 주 시작 요일 설정(2026-08-15, 관리자님 요청). 글꼴 행과 같은 패턴 —
              dayNightStore·fontStore처럼 서버 전송 없이 클라이언트 메모리에만 저장합니다
              (weekStartStore). 기록 홈 주간 스트립·월간 기록 캘린더에 바로 반영되고,
              밤 홈 주간 스트립은 USE_MOCK에서는 반영되지만 실서버는 백엔드가 weekStart
              파라미터를 지원해야 정확해집니다(요청서 전달 예정). */}
          <View style={[styles.menuRow, styles.fontRow]}>
            <Text style={styles.menuLabel}>주 시작</Text>
            <SegmentToggle
              options={[
                { value: 'SUNDAY' as WeekStart, label: '일요일' },
                { value: 'MONDAY' as WeekStart, label: '월요일' },
              ]}
              value={weekStart}
              onChange={setWeekStart}
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

          {/* 탈퇴 (Figma 59:7289). 백엔드에 엔드포인트가 없어 목업으로 동작합니다 —
              queries/user.ts의 withdrawAccount 주석 참고. */}
          <Pressable
            style={styles.menuRow}
            onPress={() => setWithdrawPopupVisible(true)}
            accessibilityRole="button"
          >
            <IconTrash size={20} color={color.statusCaution} />
            <Text style={[styles.menuLabel, { color: color.statusCaution }]}>탈퇴</Text>
            <IconChevronRight size={18} color={color.ink300} />
          </Pressable>
          </Card>
        </View>
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
        visible={withdrawPopupVisible}
        title="정말 탈퇴하시겠어요?"
        description={'기록한 피부 데이터와 성분 프로파일이 모두 사라져요.\n이 작업은 되돌릴 수 없어요.'}
        primaryLabel="탈퇴하기"
        onPrimaryPress={() => {
          setWithdrawPopupVisible(false);
          withdrawMutation.mutate(undefined, {
            onError: () => setWithdrawFailedPopupVisible(true),
          });
        }}
        secondaryLabel="취소"
        onSecondaryPress={() => setWithdrawPopupVisible(false)}
        onRequestClose={() => setWithdrawPopupVisible(false)}
      />

      {/* 실서버 모드에서는 엔드포인트가 없어 항상 실패합니다. 조용히 아무 일도
          일어나지 않으면 "눌렀는데 반응 없음"으로 보이므로 사유를 알립니다. */}
      <Popup
        visible={withdrawFailedPopupVisible}
        title="아직 준비 중이에요"
        description="탈퇴 기능은 곧 제공될 예정이에요."
        primaryLabel="확인"
        onPrimaryPress={() => setWithdrawFailedPopupVisible(false)}
        onRequestClose={() => setWithdrawFailedPopupVisible(false)}
      />

      <Popup
        visible={pendingFontChoice !== null}
        title="앱이 다시 시작돼요"
        description={'글꼴을 바꾸려면 앱을 한 번 다시 시작해야 해요.\n지금 바꿀까요?'}
        primaryLabel="예"
        onPrimaryPress={handleConfirmFontChange}
        secondaryLabel="아니오"
        onSecondaryPress={() => setPendingFontChoice(null)}
        onRequestClose={() => setPendingFontChoice(null)}
      />

      {/* 리로드가 불가능한 환경(프로덕션 빌드)에서만 뜹니다 — expo-updates를 붙이면
          이 폴백은 필요 없어집니다. */}
      <Popup
        visible={restartPopupVisible}
        title="글꼴 설정을 저장했어요"
        description={'앱을 완전히 종료했다가 다시 열면 선택하신 글꼴이 적용돼요.'}
        primaryLabel="확인"
        onPrimaryPress={() => setRestartPopupVisible(false)}
        onRequestClose={() => setRestartPopupVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // 화면 전체 배경이 라벤더입니다(Figma 59:7181 = #F5F2FF). 헤더 그라데이션만
    // 라벤더로 두면 카드 영역 아래가 흰색으로 끊겨 보입니다(관리자 제보, 2026-08-17).
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceLavenderPale,
  },
  content: {
    paddingBottom: space[8],
  },

  // --- 프로필 헤더 (Figma 59:7183) ---
  // 그라데이션이 화면 폭을 꽉 채워야 해서 좌우 패딩은 헤더 안쪽에 둡니다.
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[6],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.surfaceLavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    // 정사각 이미지를 원으로 잘라냅니다. 없으면 모서리가 원 밖으로 튀어나옵니다.
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileTextCol: {
    flex: 1,
  },
  name: {
    fontSize: adjustFontSize(22),
    lineHeight: 31,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  profileSubtitle: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
  },

  // --- 통계 4열 (Figma 59:7196) ---
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bg,
    borderRadius: radius.lg,
    // 좌우 패딩을 0으로 둡니다. 패딩이 있으면 그 값이 **양끝 칸에만** 더해져서,
    // 셀 폭이 균등해도 구분선 기준 간격은 양끝이 더 넓어 보입니다
    // (관리자 제보 2회, 2026-08-17). 여백은 각 셀 안쪽에서 만듭니다.
    paddingVertical: space[4],
    marginTop: space[4],
  },
  statCell: {
    // flexBasis를 0으로 못박아야 4칸이 정확히 균등해집니다. `flex: 1`만 주면 라벨이
    // 긴 칸("성분 분석")이 콘텐츠 폭만큼 밀려서 그 칸만 넓어집니다
    // (관리자 제보, 2026-08-17).
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: space[1],
  },
  statDivider: {
    width: 1,
    height: 40,
    // 셀이 공간을 다 가져갈 때 1px 선이 0으로 찌그러지는 걸 막습니다.
    flexShrink: 0,
    backgroundColor: color.borderDividerFaint,
  },
  statValue: {
    // 주아체 자리 — adjustFontSize를 쓰지 않습니다(typography.ts 규약). 4열이 나란히
    // 놓여서 하나라도 커지면 구분선 간격이 어긋납니다.
    fontSize: 24,
    lineHeight: 30,
    ...pinDisplayFont('bmjua'),
  },
  statLabel: {
    // 글꼴 확대 설정과 무관하게 고정합니다(allowFontScaling={false}) — 라벨이 커지면
    // "지켜보는 중"이 한 칸에 안 들어가 말줄임됩니다.
    fontSize: 11,
    lineHeight: 15,
    ...weightFamily('medium'),
    color: color.textSub,
    paddingTop: 2,
    textAlign: 'center',
  },

  body: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    gap: space[4],
  },

  // --- 성분 pill 묶음 ---
  pillGroup: {
    gap: space[2],
  },
  pillGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillGroupTitle: {
    fontSize: adjustFontSize(11),
    lineHeight: 15,
    ...weightFamily('bold'),
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  pill: {
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillLabel: {
    // 기본 굵기(관리자 요청, 2026-08-17) — 묶음 제목이 이미 굵어서 pill까지 굵으면
    // 성분명이 제목처럼 읽힙니다.
    fontSize: adjustFontSize(11),
    lineHeight: 15,
    ...weightFamily('regular'),
  },
  pillEmptyHint: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
  },

  section: {
    gap: space[4],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    // Figma 59:7233 실측 14px Bold. typography.h2(18px semibold)보다 작고 굵습니다.
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  viewAllText: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.brand500,
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