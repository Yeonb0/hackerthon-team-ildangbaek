// src/components/icons/registry.ts
// ICONS/IconName을 index.ts에서 분리한 이유: AppIcon.tsx가 이 맵을 참조해야 하는데,
// AppIcon을 index.ts에서 다시 export하다 보니 AppIcon → index.ts → AppIcon 순환 참조가
// 생겼습니다. registry.ts를 공통 하위 모듈로 두고 index.ts/AppIcon.tsx 둘 다 여기서만
// import하는 구조로 순환을 없앴습니다.
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

/** 카탈로그 화면·AppIcon 등에서 25개를 이름으로 순회/조회할 때 쓰는 이름→컴포넌트 맵. */
export const ICONS = {
  navHome: IconNavHome,
  navShop: IconNavShop,
  navRecord: IconNavRecord,
  navReport: IconNavReport,
  navMy: IconNavMy,
  add: IconAdd,
  back: IconBack,
  barcode: IconBarcode,
  bell: IconBell,
  camera: IconCamera,
  celebrate: IconCelebrate,
  check: IconCheck,
  chevronRight: IconChevronRight,
  close: IconClose,
  cloudError: IconCloudError,
  dragHandle: IconDragHandle,
  eye: IconEye,
  faceScan: IconFaceScan,
  loading: IconLoading,
  minus: IconMinus,
  productBottle: IconProductBottle,
  search: IconSearch,
  tip: IconTip,
  warning: IconWarning,
  wifiOff: IconWifiOff,
} as const;

export type IconName = keyof typeof ICONS;
