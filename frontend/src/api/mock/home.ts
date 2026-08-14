// src/api/mock/home.ts
//
// 목업 원본 데이터. 명세서 HOME-01의 낮/밤 예시를 데모 시나리오 값으로 채웠습니다.
// USE_MOCK=true일 때 getHome()이 homeType에 맞는 쪽을 반환합니다 (api/queries/home.ts 참고).
import { getCurrentWeekDates, getTodayDateString } from '@/lib/date';
import { buildMockRecordToday } from '@/api/mock/record';
import type {
  HomeResponse,
  HomeType,
  RecordDotStatus,
  TodayRecord,
  WeeklyCalendarDay,
} from '@/types/home';

// Phase 7-A 버그 수정(관리자님 실기기 확인, 2026-08-10): todayRecord·weeklyCalendar가
// MOCK_NIGHT_HOME 안에 고정값으로 박혀 있어서, 기록 허브 캘린더(api/mock/record.ts)는
// 실제 기록 상태를 반영하도록 고쳤는데도 밤 홈의 "이번 주 기록" 캘린더는 그대로였습니다.
// 두 화면이 "오늘 기록했는지"를 서로 다른 mock 소스에서 각자 판단하고 있었던 게 원인이라,
// buildMockRecordToday()(record.ts의 mockProductCompletions/mockSkinCompletions 반영 결과)를
// 공통 소스로 삼아 여기서도 그대로 재사용합니다.
function buildTodayRecord(): TodayRecord {
  const today = buildMockRecordToday();
  return {
    morning: {
      productCompleted: today.morning.product.completed,
      skinCompleted: today.morning.skin.completed,
    },
    night: {
      productCompleted: today.night.product.completed,
      skinCompleted: today.night.skin.completed,
    },
  };
}

function computeDotStatus(productDone: boolean, skinDone: boolean): RecordDotStatus {
  if (productDone && skinDone) return 'FULL';
  if (productDone || skinDone) return 'PARTIAL';
  return 'NONE';
}

// 실제 명세(F-HOME-06 BR1) 원안은 "이번 주(월~오늘)만 표시한다"였는데, 요일에 따라
// 1~7칸으로 들쭉날쭉하고 특히 월요일엔 1칸만 나와서 위젯 정보량이 거의 없어지는 문제가
// 있었습니다. 그래서 "최근 7일(롤링)"로 한 번 바꿨다가(관리자님 요청, 2026-08-10),
// 캘린더 주 개념과 어긋난다는 이유로 다시 "월~일 고정 7칸"으로 되돌렸습니다(관리자님
// 결정, 2026-08-14). 오늘 이후 날짜는 서버 규칙(BR3, RecordCalendar 대상)과 동일하게
// NONE으로 채우고, 화면(WeeklyRecordStrip)에서 점을 그리지 않는 방식으로 "기록
// 안 함"과 구분합니다. 실서버 반영을 위해 백엔드 요청 문서를 롤링 버전에서 고정 주
// 버전으로 교체해 다시 전달해야 합니다(request-weekly-calendar-rolling-7days.md → 대체).
function buildMockWeeklyCalendar(): WeeklyCalendarDay[] {
  const todayStr = getTodayDateString();
  const weekDates = getCurrentWeekDates('MONDAY');

  // 오늘은 buildTodayRecord()와 같은 소스로 계산합니다 — 과거엔 여기 별도 고정값이
  // 있었는데, 그게 홈/기록 허브 간 "오늘 기록했는지" 불일치 버그의 원인이었습니다.
  const todayStatus = buildTodayRecord();
  const todayDot: [RecordDotStatus, RecordDotStatus] = [
    computeDotStatus(todayStatus.morning.productCompleted, todayStatus.morning.skinCompleted),
    computeDotStatus(todayStatus.night.productCompleted, todayStatus.night.skinCompleted),
  ];

  // 과거 날짜는 데모용으로 상태를 다양하게 섞어서 채움/외곽선/흐림이 골고루 보이게 순환시킵니다.
  const pastPattern: [RecordDotStatus, RecordDotStatus][] = [
    ['FULL', 'FULL'],
    ['FULL', 'PARTIAL'],
    ['PARTIAL', 'NONE'],
    ['FULL', 'FULL'],
    ['FULL', 'NONE'],
    ['PARTIAL', 'PARTIAL'],
  ];

  let pastIndex = 0;
  const days: WeeklyCalendarDay[] = weekDates.map((date) => {
    if (date === todayStr) {
      return { date, morning: todayDot[0], night: todayDot[1] };
    }
    if (date > todayStr) {
      // 미래 요일 — 서버 BR3과 동일하게 NONE. 화면에서 점 대신 자리표시자로 처리됨.
      return { date, morning: 'NONE', night: 'NONE' };
    }
    const [morning, night] = pastPattern[pastIndex % pastPattern.length];
    pastIndex += 1;
    return { date, morning, night };
  });

  return days;
}

function buildMockDayHome(): HomeResponse {
  return {
    homeType: 'DAY',
    greeting: '좋은 아침이에요',
    environment: {
      location: '서울 강남구',
      weather: 'SUNNY',
      temperature: 28,
      uvIndex: 7,
      uvGrade: 'HIGH',
      humidity: 55,
      humidityGrade: 'NORMAL',
    },
    routineRecommendation: {
      timeSlot: 'MORNING',
      items: [
        { rank: 1, productId: 21, name: '자외선 차단제', reason: '자외선 지수 높음' },
        { rank: 2, productId: 15, name: '히알루론산 세럼', reason: '실내 건조 주의' },
      ],
    },
    todayRecord: buildTodayRecord(),
    weeklyCalendar: null,
    todayReport: null,
    failedSections: [],
  };
}

function buildMockNightHome(): HomeResponse {
  return {
    homeType: 'NIGHT',
    greeting: '오늘도 수고했어요',
    recordPrompt: '지금 기록을 남기면 내일 분석이 더 정확해져요',
    environment: null,
    routineRecommendation: {
      timeSlot: 'NIGHT',
      items: [{ rank: 1, productId: 33, name: '레티놀 크림', reason: '야간 루틴 권장' }],
    },
    todayRecord: buildTodayRecord(),
    weeklyCalendar: buildMockWeeklyCalendar(),
    todayReport: {
      skinRecordId: 31,
      totalScore: 78,
      previousScore: 72,
      change: 6,
      comparedTo: '전일 동일 시간대',
      summary: '어제보다 좋아졌어요',
    },
    failedSections: [],
  };
}

// 매 호출마다 buildMockDayHome()/buildMockNightHome()을 새로 만듭니다 — 예전엔 모듈
// 최상단에 고정 객체(MOCK_NIGHT_HOME)로 한 번만 만들어뒀어서, todayRecord·weeklyCalendar가
// 세션 중 기록을 아무리 완료해도 그 "최초 스냅샷" 값 그대로 응답됐습니다.
export function buildMockHomeResponse(homeType: HomeType): HomeResponse {
  return homeType === 'DAY' ? buildMockDayHome() : buildMockNightHome();
}