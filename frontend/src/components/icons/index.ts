// src/components/icons/index.ts
// 아이콘 25종(nav 5 + ui/state/section 20) + AppIcon 배럴 export.
// 화면 코드에서는 개별 컴포넌트를 직접 import해서 쓰고(예: <IconBack />),
// ICONS/IconName은 카탈로그 화면처럼 "전체를 순회"해야 하는 곳에서만 씁니다.
// ICONS/IconName 실제 정의는 registry.ts에 있습니다 (AppIcon.tsx와의 순환 참조 방지 — 주석 참고).

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
};
