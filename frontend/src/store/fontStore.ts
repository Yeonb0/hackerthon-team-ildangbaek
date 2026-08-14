// src/store/fontStore.ts
//
// Phase 12(2026-08-13) 부가 요청 — 마이페이지(S-23) 설정에서 Pretendard / 나눔스퀘어네오
// 중 글꼴을 고를 수 있게 합니다. dayNightStore와 달리 이 값은 재시작해도 유지돼야 해서
// (설정을 켤 때마다 초기화되면 의미가 없음) mockPersistence.ts와 같은 패턴으로
// platformStorage(SecureStore/localStorage)에 저장합니다.
//
// ⚠️ typography.ts 주석 참고 — 이 값을 바꿔도 "지금 떠 있는 화면"의 글꼴은 즉시 안
// 바뀝니다. 앱 재시작(JS 번들 재평가) 후에 App.tsx가 이 값을 읽어서 fontFamily를
// 다시 채워 넣어야 반영됩니다.
import { create } from 'zustand';
import { getItem, setItem } from '@/lib/platformStorage';

export type FontChoice = 'pretendard' | 'nanumSquareNeo';

const STORAGE_KEY = 'skinteller.settings.fontChoice';
const DEFAULT_FONT: FontChoice = 'pretendard';

interface FontState {
  /** 저장된 값을 아직 못 읽어온 최초 한 순간을 구분하기 위한 플래그. App.tsx 부팅 시퀀스에서만 씁니다. */
  hydrated: boolean;
  fontChoice: FontChoice;
  hydrate: () => Promise<FontChoice>;
  setFontChoice: (choice: FontChoice) => Promise<void>;
}

export const useFontStore = create<FontState>((set) => ({
  hydrated: false,
  fontChoice: DEFAULT_FONT,
  hydrate: async () => {
    const stored = await getItem(STORAGE_KEY);
    const value: FontChoice = stored === 'nanumSquareNeo' ? 'nanumSquareNeo' : DEFAULT_FONT;
    set({ fontChoice: value, hydrated: true });
    return value;
  },
  setFontChoice: async (choice) => {
    set({ fontChoice: choice });
    await setItem(STORAGE_KEY, choice);
  },
}));