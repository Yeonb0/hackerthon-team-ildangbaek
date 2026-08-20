// src/theme/bootstrapFont.ts
//
// 2026-08-15 — 글꼴 기능 A안. 저장된 선택값을 읽어 활성 글꼴을 확정합니다.
//
// ⚠️ 이 파일은 같은 theme/ 폴더에 있지만 './index'(배럴)나 './typography'를 절대
// import 하지 않습니다. 배럴을 타는 순간 typography.ts가 평가되면서 글꼴이 기본값으로
// 굳어버려, 이 함수를 아무리 먼저 돌려도 소용이 없어집니다.
import { getItem } from '@/lib/platformStorage';
import {
  FONT_STORAGE_KEY,
  FontChoice,
  getActiveFontChoice,
  lockActiveFontChoice,
  normalizeFontChoice,
  setActiveFontChoice,
} from './fontFamily';

/**
 * 반드시 App/화면 모듈이 평가되기 전에 완료돼야 합니다 (src/app/Root.tsx가 보장).
 * 저장소 읽기가 실패해도 앱은 떠야 하므로 기본값(나눔스퀘어네오)으로 넘어갑니다.
 */
export async function bootstrapFontChoice(): Promise<FontChoice> {
  try {
    const stored = await getItem(FONT_STORAGE_KEY);
    setActiveFontChoice(normalizeFontChoice(stored));
  } catch {
    // 기본값 유지 — 글꼴 하나 때문에 부팅을 막지 않습니다.
  }
  lockActiveFontChoice();
  return getActiveFontChoice();
}
