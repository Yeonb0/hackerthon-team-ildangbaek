// src/api/mock/user.ts
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import { getItem, setItem } from '@/lib/platformStorage';
import type {
  IngredientListItem,
  IngredientProfileResult,
  IngredientStatus,
  LocationItem,
  MyPageResult,
  ProfileResult,
  UpdateLocationInput,
} from '@/types/user';

// ---------------------------------------------------------------------------
// USER-01/02 · 마이페이지 · 성분 프로파일
// ---------------------------------------------------------------------------

const MOCK_INGREDIENTS: IngredientListItem[] = [
  { ingredientId: 3, name: '나이아신아마이드', status: 'GOOD', reason: '피부 톤 개선 이력', recordCount: 12 },
  { ingredientId: 8, name: '히알루론산', status: 'GOOD', reason: '수분 반응 양호', recordCount: 9 },
  { ingredientId: 15, name: '판테놀', status: 'GOOD', reason: '진정 반응 확인됨', recordCount: 6 },
  { ingredientId: 21, name: '레티놀', status: 'CAUTION', reason: '사용 후 홍조 반복 관찰', recordCount: 5 },
  { ingredientId: 27, name: '향료', status: 'CAUTION', reason: '과거 홍조 반응 있음', recordCount: 7 },
  { ingredientId: 33, name: 'AHA', status: 'CAUTION', reason: '자극 반응 1회 관찰', recordCount: 2 },
  { ingredientId: 44, name: '스쿠알란', status: 'INSUFFICIENT', reason: null, recordCount: 1 },
  { ingredientId: 45, name: '세라마이드', status: 'INSUFFICIENT', reason: null, recordCount: 1 },
  { ingredientId: 46, name: '티트리오일', status: 'INSUFFICIENT', reason: null, recordCount: 0 },
];

// USER-01 BR5: completionRate는 F-ANALYSIS-05 값을 그대로 쓰고, 구매 전 확인(Phase7 CHECK)
// 화면과 같은 값이어야 함. Phase7 mock(api/mock/check.ts)에 별도 completionRate 상수가
// 없어서(그 화면은 개별 성분 판정만 반환) 여기서 새로 정의합니다. 나중에 백엔드 연동 시
// 두 화면이 같은 GET /users/me 값을 참조하게 되면 자연히 일치합니다.
const MOCK_COMPLETION_RATE = 65;

function countByStatus(status: IngredientStatus): number {
  return MOCK_INGREDIENTS.filter((item) => item.status === status).length;
}

/**
 * GET /users/me/profile 목업. 나이·성별은 USER-01에 없어서 이 엔드포인트로 받습니다.
 * Figma MyPage 부제("26세 · 여성 · …")와 값을 맞췄습니다.
 */
export async function buildMockProfile(): Promise<ProfileResult> {
  await hydrateMockLocation();
  const notificationEnabled = await getMockNotificationEnabled();
  return {
    name: '김민지',
    gender: 'FEMALE',
    age: 26,
    skinTypes: ['OILY', 'SENSITIVE'],
    hormoneStatus: null,
    lastPeriodStartDate: null,
    averageCycleDays: null,
    location: getMockCurrentLocation()?.name ?? null,
    notificationEnabled,
  };
}

/**
 * 회원 탈퇴 목업. 실제 엔드포인트가 없어(2026-08-17 백엔드 확인) 성공만 반환합니다.
 * 세션 정리는 화면에서 로그아웃과 같은 경로를 태웁니다.
 */
export async function withdrawMockAccount(): Promise<void> {
  await resetMockUserSession();
}

export async function buildMockMyPage(): Promise<MyPageResult> {
  // 저장된 지역을 메모리로 끌어올린 뒤에 읽어야 합니다 — 아래 location이 동기
  // 함수(getMockCurrentLocation)라 hydrate 전에 읽으면 기본값이 나옵니다.
  await hydrateMockLocation();
  const notificationEnabled = await getMockNotificationEnabled();
  return {
    name: '김민지',
    joinedDays: 30,
    totalRecordCount: 22,
    skinTypes: ['OILY', 'SENSITIVE'],
    ingredientProfile: {
      completionRate: MOCK_COMPLETION_RATE,
      goodCount: countByStatus('GOOD'),
      cautionCount: countByStatus('CAUTION'),
      insufficientCount: countByStatus('INSUFFICIENT'),
      // "요약 노출용 최대 8건" — GOOD → CAUTION → INSUFFICIENT 순으로 앞 8개(USER-02 정렬 규칙과 동일하게 맞춤).
      topIngredients: sortedIngredients()
        .slice(0, 8)
        .map(({ ingredientId, name, status }) => ({ ingredientId, name, status })),
    },
    location: getMockCurrentLocation()?.name ?? null,
    notificationEnabled,
  };
}

function sortedIngredients(): IngredientListItem[] {
  const order: Record<IngredientStatus, number> = { GOOD: 0, CAUTION: 1, INSUFFICIENT: 2 };
  return [...MOCK_INGREDIENTS].sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.recordCount - a.recordCount; // 그룹 내 recordCount 내림차순 (USER-02 BR3)
  });
}

export function buildMockIngredientProfile(status?: IngredientStatus): IngredientProfileResult {
  const filtered = status ? sortedIngredients().filter((item) => item.status === status) : sortedIngredients();
  return { completionRate: MOCK_COMPLETION_RATE, ingredients: filtered };
}

// ---------------------------------------------------------------------------
// USER-05/06 · 지역 목록 · 위치 설정
//
// ⚠️ 실제 백엔드 명세서엔 샘플 6개 지역만 있고 "전국 시/군/구 목록 확보가 선행되어야
// 한다"고 적혀 있습니다(백엔드 협의 필요 항목으로 이미 전달됨). 데모가 6개짜리 목록으로
// 보이면 안 되니, mock은 대표 지역을 넉넉히 채워뒀습니다. locationId는 문서에 나온
// 예시값(1=서울 강남구, 2=서울 마포구, 6=인천 연수구)만 그대로 두고 나머지는 편의상
// 순번을 매긴 것이라, 실제 백엔드 ID와는 다를 수 있습니다 — 연동 시 재확인 필요.
// ---------------------------------------------------------------------------

interface MockLocationSeed {
  locationId: number;
  name: string;
  /** mock 전용 대표 좌표 — 서버가 없으니 "가장 가까운 시드로 스냅"하는 방식의
   * 역지오코딩 흉내(pseudoReverseGeocode)에만 씁니다. 정확한 행정구역 중심점은
   * 아니고 데모에서 "그럴듯하게 맞아 보이는" 정도의 근사치입니다. */
  latitude: number;
  longitude: number;
}

const LOCATION_SEED: MockLocationSeed[] = [
  { locationId: 1, name: '서울 강남구', latitude: 37.5172, longitude: 127.0473 },
  { locationId: 2, name: '서울 마포구', latitude: 37.5663, longitude: 126.9019 },
  { locationId: 3, name: '서울 종로구', latitude: 37.5735, longitude: 126.9788 },
  { locationId: 4, name: '서울 송파구', latitude: 37.5145, longitude: 127.1059 },
  { locationId: 5, name: '서울 서대문구', latitude: 37.5791, longitude: 126.9368 },
  { locationId: 6, name: '인천 연수구', latitude: 37.4106, longitude: 126.6784 },
  { locationId: 7, name: '인천 남동구', latitude: 37.4467, longitude: 126.7314 },
  { locationId: 8, name: '경기 성남시 분당구', latitude: 37.3826, longitude: 127.1188 },
  { locationId: 9, name: '경기 수원시 영통구', latitude: 37.2589, longitude: 127.0567 },
  { locationId: 10, name: '경기 고양시 일산동구', latitude: 37.6584, longitude: 126.7717 },
  { locationId: 11, name: '부산 해운대구', latitude: 35.1631, longitude: 129.1635 },
  { locationId: 12, name: '부산 수영구', latitude: 35.1455, longitude: 129.1132 },
  { locationId: 13, name: '대구 수성구', latitude: 35.8583, longitude: 128.6311 },
  { locationId: 14, name: '광주 서구', latitude: 35.1519, longitude: 126.8896 },
  { locationId: 15, name: '대전 유성구', latitude: 36.3623, longitude: 127.3562 },
  { locationId: 16, name: '울산 남구', latitude: 35.5439, longitude: 129.3300 },
  { locationId: 17, name: '세종특별자치시', latitude: 36.4801, longitude: 127.2891 },
  { locationId: 18, name: '강원 춘천시', latitude: 37.8813, longitude: 127.7300 },
  { locationId: 19, name: '강원 강릉시', latitude: 37.7519, longitude: 128.8761 },
  { locationId: 20, name: '충북 청주시 흥덕구', latitude: 36.6280, longitude: 127.4470 },
  { locationId: 21, name: '충남 천안시 서북구', latitude: 36.8151, longitude: 127.1139 },
  { locationId: 22, name: '전북 전주시 완산구', latitude: 35.8134, longitude: 127.1380 },
  { locationId: 23, name: '전남 여수시', latitude: 34.7604, longitude: 127.6622 },
  { locationId: 24, name: '경북 포항시 남구', latitude: 36.0011, longitude: 129.3435 },
  { locationId: 25, name: '경남 창원시 성산구', latitude: 35.2280, longitude: 128.6811 },
  { locationId: 26, name: '제주 제주시', latitude: 33.4996, longitude: 126.5312 },
  { locationId: 27, name: '제주 서귀포시', latitude: 33.2541, longitude: 126.5601 },
];

// ---------------------------------------------------------------------------
// F-MY-05 · 알림 설정 세션 상태
//
// ⚠️ Phase 8 수정(2026-08-11): 처음엔 이 상태를 그냥 모듈 최상단 `let` 변수로 뒀는데,
// mockPersistence.ts가 이미 겪었던 것과 같은 문제로 재발했습니다 — JS 런타임이
// 재시작되면(Fast Refresh 등) 모듈이 다시 실행되면서 변수가 초기값(true)으로
// 돌아가버려, 토글을 꺼도 다시 켜진 것처럼 보였습니다(관리자 실기기 확인). 온보딩
// 완료 플래그와 같은 방식(platformStorage → 웹은 localStorage, 네이티브는
// SecureStore)으로 실제 기기에 저장해서 이 문제를 근본적으로 없앴습니다.
// ---------------------------------------------------------------------------

const MOCK_NOTIFICATION_KEY = 'skinteller.mock.notificationEnabled';

export async function getMockNotificationEnabled(): Promise<boolean> {
  const stored = await getItem(MOCK_NOTIFICATION_KEY);
  // 저장된 값이 없으면(첫 실행) 기본값 true — USER-01 응답 예시와 동일.
  return stored === null ? true : stored === 'true';
}

export async function setMockNotificationEnabled(enabled: boolean): Promise<void> {
  await setItem(MOCK_NOTIFICATION_KEY, String(enabled));
}

// ⚠️ 2026-08-17(세션 15) 수정 — 원래는 모듈 최상단 `let` 하나였는데, 바로 위 알림
// 설정이 겪었던 문제가 그대로 재발했습니다: JS 런타임이 재시작되면(Fast Refresh,
// 새로고침, 앱 재시작) 모듈이 다시 평가되면서 초기값(서울 강남구)으로 돌아가,
// 지역을 바꿔도 되돌아간 것처럼 보였습니다(관리자 제보 — "위치 설정이 제대로 동작
// 안함"). 알림과 같은 방식으로 platformStorage에 저장합니다.
//
// 읽기가 비동기인데 searchMockLocations는 동기라, 메모리 캐시를 함께 둡니다:
// 저장소 값은 hydrate에서 한 번 읽어 캐시에 채우고, 이후에는 캐시를 씁니다.
const MOCK_LOCATION_KEY = 'skinteller.mock.currentLocationId';
const DEFAULT_LOCATION_ID = 1; // 데모 기본값: 서울 강남구 (USER-01 응답 예시와 동일)

let currentLocationId: number | null = DEFAULT_LOCATION_ID;
let locationHydrated = false;

/**
 * 저장된 지역을 메모리 캐시로 끌어올립니다. 마이페이지·위치 검색 목업이 호출하기
 * 전에 한 번만 실행되면 되고, 그 뒤로는 동기 함수들이 캐시를 그대로 씁니다.
 */
async function hydrateMockLocation(): Promise<void> {
  if (locationHydrated) return;
  locationHydrated = true;
  const stored = await getItem(MOCK_LOCATION_KEY);
  if (stored !== null) {
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      currentLocationId = parsed;
    }
  }
}

function getMockCurrentLocation(): MockLocationSeed | undefined {
  return LOCATION_SEED.find((item) => item.locationId === currentLocationId);
}

export async function searchMockLocations(keyword: string): Promise<LocationItem[]> {
  await hydrateMockLocation();
  const trimmed = keyword.trim();
  const pool = trimmed
    ? LOCATION_SEED.filter((item) => item.name.includes(trimmed))
    : LOCATION_SEED;
  // USER-05 BR1: 최대 30건.
  return pool.slice(0, 30).map((item) => ({
    ...item,
    current: item.locationId === currentLocationId,
  }));
}

// 위경도로 가장 가까운 시드 지역을 찾습니다 — 실제 역지오코딩(정확한 행정구역
// 판정)은 서버 책임이지만, mock에서 좌표를 완전히 무시하면("항상 서울 강남구")
// "현재 위치 사용"을 눌러도 실제 위치와 무관하게 항상 같은 결과가 나와서 데모에서
// 이상하게 보입니다(관리자 실기기 확인, 2026-08-11). 정확한 행정구역 경계 판정
// 대신 대표 좌표까지의 단순 유클리드 거리로 가장 가까운 시드를 고릅니다 — 한국
// 영토 규모에서는 이 정도 근사로도 데모용으로는 충분히 그럴듯합니다.
function pseudoReverseGeocode(latitude: number, longitude: number): MockLocationSeed {
  let nearest = LOCATION_SEED[0];
  let nearestDistance = Infinity;
  for (const seed of LOCATION_SEED) {
    const dLat = seed.latitude - latitude;
    const dLng = seed.longitude - longitude;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = seed;
    }
  }
  return nearest;
}

export async function updateMockLocation(input: UpdateLocationInput): Promise<{ location: string }> {
  await hydrateMockLocation();
  const target =
    'locationId' in input
      ? LOCATION_SEED.find((item) => item.locationId === input.locationId)
      : pseudoReverseGeocode(input.latitude, input.longitude);
  if (!target) {
    throw new ApiError(ErrorCode.USER_LOCATION_NOT_FOUND, '설정하려는 지역을 찾을 수 없어요.');
  }
  currentLocationId = target.locationId;
  await setItem(MOCK_LOCATION_KEY, String(target.locationId));
  return { location: target.name };
}

export async function resetMockUserSession(): Promise<void> {
  currentLocationId = DEFAULT_LOCATION_ID;
  locationHydrated = true; // 방금 초기값으로 맞췄으므로 저장소를 다시 읽지 않습니다.
  await setItem(MOCK_LOCATION_KEY, String(DEFAULT_LOCATION_ID));
  await setMockNotificationEnabled(true);
}