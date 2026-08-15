// src/store/fontStore.ts
//
// Phase 12(2026-08-13) 부가 요청 — 마이페이지(S-23) 설정에서 Pretendard / 나눔스퀘어네오
// 중 글꼴을 고를 수 있게 합니다. 재시작해도 값이 유지돼야 해서 mockPersistence.ts와 같은
// 패턴으로 platformStorage(SecureStore/localStorage)에 저장합니다.
//
// 2026-08-15 개편 — 저장값 읽기(hydrate)는 이 스토어가 아니라 부팅 게이트
// (src/app/Root.tsx → theme/bootstrapFont.ts)가 화면 모듈보다 먼저 처리합니다.
// 이 스토어가 화면에서 처음 import될 때는 이미 활성 글꼴이 확정된 상태라,
// 초기값을 getActiveFontChoice()에서 그대로 가져오면 됩니다.
//
// 리로드 호출도 여기서 합니다. 글꼴 저장과 "번들 재평가"는 사실상 한 동작이라,
// 호출부마다 리로드를 잊지 않고 붙여야 하는 구조는 실수가 나기 쉽습니다.
// setFontChoice를 부르면 저장 + 반영까지 끝나는 걸로 계약을 통일합니다.
//
// ⚠️ 이 함수는 앱을 재시작시킵니다. 사용자에게 먼저 확인을 받은 뒤에 호출하세요
// (MyPageScreen의 재시작 확인 팝업 참고). 화면 전환 중이나 입력 중에 부르면
// 작성 중인 내용이 날아갑니다.
//
// appliedFontChoice vs fontChoice:
//  - appliedFontChoice : 지금 화면에 실제로 그려지고 있는 글꼴 (이번 부팅에 굳은 값)
//  - fontChoice        : 사용자가 마지막으로 고른 값
// 리로드가 불가능한 환경(프로덕션 빌드)에서는 둘이 달라진 채로 남습니다 —
// 이 경우 화면에서 "다시 열면 적용됩니다" 안내를 띄우면 됩니다.
import { create } from 'zustand';
import { setItem } from '@/lib/platformStorage';
import { canReloadApp, reloadApp } from '@/lib/reloadApp';
import { FONT_STORAGE_KEY, FontChoice, getActiveFontChoice } from '@/theme/fontFamily';

export type { FontChoice };

interface FontState {
  /** 이번 부팅에 실제 적용된 글꼴. 리로드 전까지 바뀌지 않습니다. */
  appliedFontChoice: FontChoice;
  /** 사용자가 마지막으로 고른 글꼴 (저장소에 기록된 값). */
  fontChoice: FontChoice;
  /**
   * 저장 후 가능하면 앱을 리로드합니다.
   * @returns true = 리로드가 걸림(이 뒤 코드는 실행 안 될 수 있음),
   *          false = 리로드 불가 → 호출부가 "다시 열면 적용" 안내를 띄워야 함
   */
  setFontChoice: (choice: FontChoice) => Promise<boolean>;
}

export const useFontStore = create<FontState>((set) => ({
  appliedFontChoice: getActiveFontChoice(),
  fontChoice: getActiveFontChoice(),
  setFontChoice: async (choice) => {
    set({ fontChoice: choice });
    // 저장이 끝나기 전에 리로드하면 값이 유실됩니다 — 반드시 await 뒤에 리로드합니다.
    await setItem(FONT_STORAGE_KEY, choice);
    if (canReloadApp()) {
      reloadApp();
      return true;
    }
    return false;
  },
}));
