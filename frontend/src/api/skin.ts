// src/api/skin.ts
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import {
  buildMockSkinRecordResult,
  buildMockSkinRecordResultForDate,
  mockSkinAnalysisDelay,
} from '@/api/mock/skin';
import { recordMockSkinCompletion } from '@/api/mock/record';
import type { CreateSkinRecordInput, SkinRecordResult } from '@/types/skin';
import type { ReportDailyResult } from '@/types/report';
import type { TimeSlot } from '@/app/routes';

/**
 * SKIN-01 · 피부 기록 생성 및 분석. 분석 완료 시점에 이미 저장까지 끝나는 구조입니다
 * (TBD-10b A안, 관리자 확인 2026-08-09) — S-18의 확인 버튼은 화면을 닫는 역할만 합니다.
 *
 * 분석 자체가 오래 걸릴 수 있어서(AI 서버 호출 포함) apiClient 기본 타임아웃(10초,
 * client.ts)만으로는 부족할 수 있습니다. 이 요청만 개별적으로 넉넉하게 늘립니다 —
 * 서버가 자체적으로 SKIN_ANALYSIS_TIMEOUT(504)을 반환하므로, 클라이언트 타임아웃은
 * 그보다 여유 있게 잡아서 서버 타임아웃이 먼저 발생하도록 합니다(TBD-09에 대한 프론트
 * 해석 — 서버가 504를 주면 AnalyzingSkinScreen이 일반 에러 케이스로 처리해 재시도
 * 버튼을 보여줍니다).
 */
export async function createSkinRecord({
  timeSlot,
  imageUri,
}: CreateSkinRecordInput): Promise<SkinRecordResult> {
  if (USE_MOCK) {
    await mockSkinAnalysisDelay();
    const result = buildMockSkinRecordResult(timeSlot);
    // 기록 허브(useRecordToday) mock이 "촬영 후에도 계속 미완료"로 보이던 문제 수정 —
    // 여기서 완료 사실을 세션에 남겨야 record.ts의 mock이 그걸 반영합니다.
    recordMockSkinCompletion(timeSlot, `분석 점수 ${result.totalScore}점`);
    return result;
  }

  const form = new FormData();
  // React Native의 FormData는 파일 필드를 { uri, name, type } 형태로 받습니다
  // (웹 표준 Blob이 아닙니다) — 타입 단언이 필요합니다.
  form.append('image', {
    uri: imageUri,
    name: 'face.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('timeSlot', timeSlot);

  return unwrap<SkinRecordResult>(
    apiClient.post('/skin-records', form, {
      // Content-Type을 직접 지정하지 않습니다 — axios가 body가 FormData임을 보고
      // boundary가 포함된 값을 알아서 채웁니다. 'multipart/form-data'만 직접 넣으면
      // boundary가 빠져서 서버가 파싱하지 못합니다(로드맵 Phase 5 명시 주의사항).
      timeout: 45000,
    }),
  );
}

/** SKIN-02 · 오늘 피부 결과 조회. 응답 구조는 SKIN-01의 result와 동일합니다. */
export async function getSkinRecordToday(timeSlot?: TimeSlot): Promise<SkinRecordResult> {
  if (USE_MOCK) {
    return buildMockSkinRecordResult(timeSlot ?? 'MORNING');
  }
  return unwrap<SkinRecordResult>(
    apiClient.get('/skin-records/today', { params: timeSlot ? { timeSlot } : undefined }),
  );
}

/**
 * REPORT-03 · 일자별 피부 기록 조회 (`GET /reports/daily`).
 *
 * 월간 기록(S-09 캘린더) 바텀시트의 "자세히 보기" 전용입니다. SKIN-02는 `/skin-records/today`라
 * 오늘 것만 읽을 수 있어서, 지난 날짜를 여는 이 경로만 REPORT-03을 씁니다.
 *
 * 백엔드 `ReportDailyResponse` javadoc이 이 화면을 명시적으로 지목하고 있습니다 —
 * *"기록이 없으면 빈 배열이다. 오류가 아니다 — 캘린더에서 임의 날짜를 여는 화면이라
 * '그날은 기록이 없다'가 정상 상태다"*. 그래서 **404가 아니라 `null`을 돌려줍니다.**
 * 호출부(S-18)는 이걸 에러가 아닌 빈 상태로 다뤄야 합니다.
 *
 * `records`는 모닝 → 나이트 순이고 원소는 SKIN-01/02와 같은 구조입니다(ADR 0012 —
 * 하루 2건을 대표값으로 접지 않습니다). `timeSlot`을 주면 그 슬롯만 담겨 옵니다.
 * 안 주면 **첫 원소(모닝 우선)** 를 씁니다 — 바텀시트가 종합 점수 하나만 보여주는
 * 구조라 어차피 한 건만 펼칠 수 있고, 슬롯을 고르는 UI는 아직 없습니다.
 */
export async function getSkinRecordByDate(
  date: string,
  timeSlot?: TimeSlot,
): Promise<SkinRecordResult | null> {
  if (USE_MOCK) {
    return buildMockSkinRecordResultForDate(date, timeSlot ?? 'MORNING');
  }
  const daily = await unwrap<ReportDailyResult>(
    apiClient.get('/reports/daily', {
      params: timeSlot ? { date, timeSlot } : { date },
    }),
  );
  return daily.records[0] ?? null;
}
