// src/store/devUiStore.ts
//
// 개발용 UI 상태. 지금은 컴포넌트 카탈로그(CatalogScreen) 표시 여부만 들고 있습니다.
//
// 왜 필요한가: devFlags.SHOW_CATALOG은 process.env를 모듈 로드 시점에 한 번 읽습니다.
// 그래서 값을 바꾸려면 .env 수정 → dev 서버 재시작이 필요했습니다. 컴포넌트를 확인할
// 때마다 서버를 껐다 켜는 건 번거로워서(관리자님 요청), 앱 안에서 바로 켜고 끌 수
// 있도록 런타임 상태로 옮겼습니다. 리포트/스캔 목업 시나리오를 .env에서 DevResetButton
// 메뉴로 옮겼던 것과 같은 이유·같은 방식입니다.
//
// persist 미적용 — 앱을 껐다 켜면 항상 일반 화면으로 돌아옵니다. 카탈로그가 켜진 채로
// 저장되면 다음 실행에서 앱이 카탈로그로 뜨는데, 그 상태를 실제 앱 오류로 착각하기
// 쉽습니다. 토글 버튼(DevResetButton)이 카탈로그 위에도 계속 떠 있어서 되돌리는 데
// 지장은 없습니다.
//
// ⚠️ SHOW_CATALOG(.env)은 그대로 남겨뒀습니다. 둘 중 하나라도 true면 카탈로그가 뜹니다.
// .env로 켜 둔 경우엔 앱 안에서 끌 수 없으니(환경값이 항상 true), 그때는 .env를
// 되돌려야 합니다 — DevResetButton 메뉴가 그 상황을 라벨로 알려줍니다.
import { create } from 'zustand';

interface DevUiState {
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  toggleCatalog: () => void;
}

export const useDevUiStore = create<DevUiState>((set) => ({
  catalogOpen: false,
  setCatalogOpen: (open) => set({ catalogOpen: open }),
  toggleCatalog: () => set((state) => ({ catalogOpen: !state.catalogOpen })),
}));
