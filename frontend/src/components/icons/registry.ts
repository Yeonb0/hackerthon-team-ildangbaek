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
// 아래 17개는 2026-08-12 디자이너 추가 전달분 — Checkpoint 9-B에서 대응 아이콘이 없어
// Ionicons로 임시 유지했던 자리를 채웁니다 (예: ellipse-outline → circleEmpty).
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

/** 카탈로그 화면·AppIcon 등에서 42개를 이름으로 순회/조회할 때 쓰는 이름→컴포넌트 맵. */
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
  arrowUp: IconArrowUp,
  arrowDown: IconArrowDown,
  calendar: IconCalendar,
  chevronUp: IconChevronUp,
  chevronDown: IconChevronDown,
  circleEmpty: IconCircleEmpty,
  filter: IconFilter,
  flask: IconFlask,
  helpCircle: IconHelpCircle,
  imagePlaceholder: IconImagePlaceholder,
  info: IconInfo,
  list: IconList,
  locationPin: IconLocationPin,
  logout: IconLogout,
  personCircle: IconPersonCircle,
  trash: IconTrash,
  trayEmpty: IconTrayEmpty,
} as const;

export type IconName = keyof typeof ICONS;
