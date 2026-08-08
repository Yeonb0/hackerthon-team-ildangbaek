// src/api/mock/home.ts
//
// 목업 원본 데이터. 명세서 HOME-01의 낮/밤 예시를 데모 시나리오 값으로 채웠습니다.
// USE_MOCK=true일 때 getHome()이 homeType에 맞는 쪽을 반환합니다 (api/queries/home.ts 참고).
import { formatDateString } from '@/lib/date';
import type { HomeResponse, HomeType, RecordDotStatus, WeeklyCalendarDay } from '@/types/home';

const MOCK_DAY_HOME: HomeResponse = {
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
  todayRecord: {
    morning: { productCompleted: false, skinCompleted: false },
    night: { productCompleted: false, skinCompleted: false },
  },
  weeklyCalendar: null,
  todayReport: null,
  failedSections: [],
};

// F-HOME-06 BR1: "이번 주(월~오늘)만 표시한다." 날짜를 고정 배열로 박아두면 오늘이
// 무슨 요일이냐에 따라 칸 수가 안 맞습니다(월요일이면 1칸, 일요일이면 7칸이어야 정상).
// 그래서 실행 시점의 실제 오늘 날짜 기준으로 이번 주 월요일부터 오늘까지를 매번 계산합니다.
function buildMockWeeklyCalendar(): WeeklyCalendarDay[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=일 ~ 6=토
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const numDays = daysSinceMonday + 1; // 이번 주 월요일부터 오늘까지 칸 수

  // 오늘(마지막 칸)은 아래 MOCK_NIGHT_HOME.todayRecord.night와 값을 맞춰서(모닝 완료 ·
  // 나이트 미완료) 데모 데이터끼리 앞뒤가 맞게 했습니다. 그 이전 날짜들은 데모용으로
  // 상태를 다양하게 섞어서 채움/외곽선/흐림이 골고루 보이게 순환시킵니다.
  const pastPattern: [RecordDotStatus, RecordDotStatus][] = [
    ['FULL', 'FULL'],
    ['FULL', 'PARTIAL'],
    ['PARTIAL', 'NONE'],
    ['FULL', 'FULL'],
    ['FULL', 'NONE'],
    ['PARTIAL', 'PARTIAL'],
  ];

  const days: WeeklyCalendarDay[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (numDays - 1 - i));
    const date = formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
    const isToday = i === numDays - 1;
    const [morning, night] = isToday
      ? (['FULL', 'NONE'] as const)
      : pastPattern[i % pastPattern.length];
    days.push({ date, morning, night });
  }
  return days;
}

// 체크포인트 B(낮/밤 토글 + 밤 홈)에서 바로 쓸 수 있도록 지금 같이 채워둡니다.
const MOCK_NIGHT_HOME: HomeResponse = {
  homeType: 'NIGHT',
  greeting: '오늘도 수고했어요',
  recordPrompt: '지금 기록을 남기면 내일 분석이 더 정확해져요',
  environment: null,
  routineRecommendation: {
    timeSlot: 'NIGHT',
    items: [{ rank: 1, productId: 33, name: '레티놀 크림', reason: '야간 루틴 권장' }],
  },
  todayRecord: {
    morning: { productCompleted: true, skinCompleted: true },
    night: { productCompleted: false, skinCompleted: false },
  },
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

export function buildMockHomeResponse(homeType: HomeType): HomeResponse {
  return homeType === 'DAY' ? MOCK_DAY_HOME : MOCK_NIGHT_HOME;
}