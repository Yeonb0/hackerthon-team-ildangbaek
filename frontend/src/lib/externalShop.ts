// externalShop.ts — 외부 커머스(올리브영) 검색 페이지 열기
//
// 2026-08-18(세션 18) 관리자 결정 — SHOP-02 "구매하러 가기"가 지금까지 Toast만 띄우는
// 완전 목업이었는데, 실제로 올리브영 검색 결과 페이지로 보내기로 했습니다.
//
// 왜 "제품 상세"가 아니라 "검색 결과"인가:
//   우리 카탈로그의 productId와 올리브영 goodsNo 사이에 매핑이 없습니다(백엔드에도 없음).
//   상세 페이지(getGoodsDetail.do?goodsNo=...)로 보내려면 그 매핑이 있어야 하는데, 없는 상태에서
//   억지로 추정하면 엉뚱한 제품으로 보내게 됩니다. 검색 결과로 보내면 최악의 경우에도 "결과 없음"
//   화면이지 오정보는 아닙니다.
//
// 검색어(관리자 결정, 2026-08-18): **제품명만** 사용합니다. 브랜드를 앞에 붙이면 문자열이
// 길어져서 올리브영 검색이 0건을 내는 경우가 늘어납니다. 브랜드로도 검색하고 싶어지면
// 호출부에서 keyword만 바꾸면 됩니다.
//
// 여는 방식(관리자 결정, 2026-08-18): react-native 내장 `Linking` — 추가 패키지·EAS 재빌드가
// 필요 없습니다. 인앱 브라우저(expo-web-browser)로 바꾸려면 이 파일의 openURL 한 줄만
// 교체하면 됩니다.
//
// ⚠️ 제휴(어필리에이트) 링크가 아닙니다. 수익 배분·트래킹 파라미터가 붙어 있지 않은 순수
// 공개 검색 URL입니다. 제휴가 생기면 SEARCH_BASE에 파라미터를 추가하세요.
//
// ── 올리브영 "앱으로 바로 이동" 검토 결과 (2026-08-18, 관리자 실기기 확인 후 현상유지 결정)
// 안드로이드 실기기에 올리브영 앱이 설치된 상태에서도 브라우저가 열립니다.
// → 올리브영이 `www.oliveyoung.co.kr` 도메인에 App Links를 등록해두지 않았다는 뜻입니다.
//   (자사 테크블로그상 App Links/Universal Links를 쓰긴 하지만 대상 도메인은 비공개)
//   Linking.openURL은 OS에 URL을 넘길 뿐이라 이건 우리 쪽에서 고칠 수 있는 문제가 아닙니다.
// 검토했다가 채택하지 않은 대안:
//   ① 커스텀 스킴(oliveyoung://) — 스킴이 비공개. 알아내도 "검색어를 담은 경로"를 모르면
//      앱 홈만 열려서 지금(검색 결과 즉시 노출)보다 오히려 나빠집니다.
//      추가로 iOS는 LSApplicationQueriesSchemes 등록이 필요해 EAS 재빌드가 걸립니다.
//   ② expo-intent-launcher로 packageName='com.oliveyoung' 강제 지정 — 안드로이드만 동작하고
//      iOS는 대응 수단이 없습니다. 네이티브 패키지 추가라 EAS 재빌드 필요.
// 현상유지 근거: 모바일 브라우저로 열리면 올리브영이 상단에 "앱으로 보기" 배너를 띄워주므로
// 앱 진입 경로 자체는 사용자에게 열려 있습니다. 재빌드 비용 대비 체감 이득이 작습니다.
// 나중에 다시 하려면 실기기에서 아래로 스킴부터 확인하는 게 순서입니다:
//   adb shell dumpsys package com.oliveyoung | grep -i -A3 "Scheme\|android.intent.action.VIEW"
import { Linking } from 'react-native';

/**
 * 올리브영 온라인몰 검색 URL. `query` 파라미터 하나만으로 동작합니다
 * (giftYn·t_page 등 나머지는 웹에서 붙는 추적용이라 생략).
 */
const OLIVEYOUNG_SEARCH_BASE = 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=';

/** 검색어를 인코딩해 올리브영 검색 결과 URL을 만듭니다. 빈 문자열이면 null. */
export function buildOliveYoungSearchUrl(keyword: string): string | null {
  const trimmed = keyword.trim();
  if (trimmed.length === 0) return null;
  return OLIVEYOUNG_SEARCH_BASE + encodeURIComponent(trimmed);
}

/**
 * 올리브영 검색 결과를 외부 브라우저(또는 설치돼 있으면 올리브영 앱)로 엽니다.
 *
 * 실패해도 throw하지 않고 false를 반환합니다 — 호출부는 Toast 한 줄만 띄우면 됩니다.
 * 안드로이드에서 올리브영 앱이 App Links를 등록해뒀다면 브라우저 대신 앱이 열릴 수 있는데,
 * 데모에서는 그게 더 자연스러워서 웹으로 강제하지 않습니다.
 */
export async function openOliveYoungSearch(keyword: string): Promise<boolean> {
  const url = buildOliveYoungSearchUrl(keyword);
  if (url === null) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    // canOpenURL을 먼저 부르지 않는 이유: https는 사실상 항상 열 수 있고, iOS에서
    // canOpenURL은 커스텀 스킴에 대해 Info.plist 등록을 요구해서 오히려 오탐이 납니다.
    return false;
  }
}
