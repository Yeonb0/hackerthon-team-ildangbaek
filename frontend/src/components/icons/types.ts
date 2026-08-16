// 화면 코드에서는 개별 컴포넌트를 직접 import해서 쓰고(예: <IconBack />),
// ICONS/IconName은 카탈로그 화면처럼 "전체를 순회"해야 하는 곳에서만 씁니다.
// ICONS/IconName 실제 정의는 registry.ts에 있습니다 (AppIcon.tsx와의 순환 참조 방지 — 주석 참고).
//
// 2026-08-15 — IconKakao/IconGoogle 추가 (로그인 화면 소셜 버튼 아이콘).
// 이 둘은 브랜드 고정색이라 ICONS/AppIcon 레지스트리(단색 currentColor 아이콘 42종)에는
// 넣지 않고, 여기서 개별 export만 합니다 — registry.ts를 건드리지 않습니다.

import { IconNavHome } from './IconNavHome';
import { IconNavShop } from './IconNavShop';
import { IconNavRecord } from './IconNavRecord';
import { IconNavReport } from './IconNavReport';
import { IconNavMy } from './IconNavMy';
import { IconAdd } from './IconAdd';
import { IconBack } from './IconBack';
import { IconBarcode } from './IconBarcode';
import { IconBell } from './IconBell';
import { IconCamera } from './IconCamera';
import { IconCelebrate } from './IconCelebrate';
import { IconCheck } from './IconCheck';
import { IconChevronRight } from './IconChevronRight';
import { IconClose } from './IconClose';
import { IconCloudError } from './IconCloudError';
import { IconDragHandle } from './IconDragHandle';
import { IconEye } from './IconEye';
import { IconFaceScan } from './IconFaceScan';
import { IconLoading } from './IconLoading';
import { IconMinus } from './IconMinus';
import { IconProductBottle } from './IconProductBottle';
import { IconSearch } from './IconSearch';
import { IconTip } from './IconTip';
import { IconWarning } from './IconWarning';
import { IconWifiOff } from './IconWifiOff';
import { IconArrowUp } from './IconArrowUp';
import { IconArrowDown } from './IconArrowDown';
import { IconCalendar } from './IconCalendar';
import { IconChevronUp } from './IconChevronUp';
import { IconChevronDown } from './IconChevronDown';
import { IconCircleEmpty } from './IconCircleEmpty';
import { IconFilter } from './IconFilter';
import { IconFlask } from './IconFlask';
import { IconHelpCircle } from './IconHelpCircle';
import { IconImagePlaceholder } from './IconImagePlaceholder';
import { IconInfo } from './IconInfo';
import { IconList } from './IconList';
import { IconLocationPin } from './IconLocationPin';
import { IconLogout } from './IconLogout';
import { IconPersonCircle } from './IconPersonCircle';
import { IconTrash } from './IconTrash';
import { IconTrayEmpty } from './IconTrayEmpty';
import { IconKakao } from './IconKakao';
import { IconGoogle } from './IconGoogle';
import { IconSunny } from './IconSunny';
import { IconMoon } from './IconMoon';
import { AppIcon } from './AppIcon';

export * from './types';
export { ICONS } from './registry';
export type { IconName } from './registry';
export { AppIcon };
export type { AppIconName } from './AppIcon';

export {
  IconNavHome,
  IconNavShop,
  IconNavRecord,
  IconNavReport,
  IconNavMy,
  IconAdd,
  IconBack,
  IconBarcode,
  IconBell,
  IconCamera,
  IconCelebrate,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconCloudError,
  IconDragHandle,
  IconEye,
  IconFaceScan,
  IconLoading,
  IconMinus,
  IconProductBottle,
  IconSearch,
  IconTip,
  IconWarning,
  IconWifiOff,
  IconArrowUp,
  IconArrowDown,
  IconCalendar,
  IconChevronUp,
  IconChevronDown,
  IconCircleEmpty,
  IconFilter,
  IconFlask,
  IconHelpCircle,
  IconImagePlaceholder,
  IconInfo,
  IconList,
  IconLocationPin,
  IconLogout,
  IconPersonCircle,
  IconTrash,
  IconTrayEmpty,
  IconKakao,
  IconGoogle,
  IconSunny,
  IconMoon,
};
