import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabRoutes, DetailRoutes, MainTabParamList, DetailStackParamList } from './routes';
import { navIcon } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';
import {
  IconNavHome,
  IconNavShop,
  IconNavRecord,
  IconNavReport,
  IconNavMy,
} from '@/components/icons';

import { HomeScreen } from '@/screens/home/HomeScreen';
import { ShoppingScreen } from '@/screens/product/ShoppingScreen';
import { RecordHubScreen } from '@/screens/record/RecordHubScreen';
import { ReportScreen } from '@/screens/report/ReportScreen';
import { MyPageScreen } from '@/screens/my/MyPageScreen';

import { ProductRecordScreen } from '@/screens/product/ProductRecordScreen';
import { ProductScanScreen } from '@/screens/product/ProductScanScreen';
import { IngredientCheckScreen } from '@/screens/product/IngredientCheckScreen';
import { PhotoGuideScreen } from '@/screens/skin/PhotoGuideScreen';
import { FaceCaptureScreen } from '@/screens/skin/FaceCaptureScreen';
import { AnalyzingSkinScreen } from '@/screens/skin/AnalyzingSkinScreen';
import { SkinResultScreen } from '@/screens/skin/SkinResultScreen';
import { MetricDetailScreen } from '@/screens/report/MetricDetailScreen';
import { CheckResultScreen } from '@/screens/product/CheckResultScreen';
import { ProductDetailScreen } from '@/screens/product/ProductDetailScreen';
import { LocationSettingsScreen } from '@/screens/my/LocationSettingsScreen';
import { IngredientListScreen } from '@/screens/my/IngredientListScreen';
import { RoutineEditScreen } from '@/screens/product/RoutineEditScreen';
import { RoutineAddProductScreen } from '@/screens/product/RoutineAddProductScreen';
import { ProductManualRegisterScreen } from '@/screens/product/ProductManualRegisterScreen';
import { RecordCalendarScreen } from '@/screens/record/RecordCalendarScreen';
import { WishlistScreen } from '@/screens/product/WishlistScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<DetailStackParamList>();

// 탭바 기본 콘텐츠 높이(safe-area 제외). React Navigation 기본값(iOS 49 / Android 56)보다
// 살짝 늘렸습니다 — 정확한 수치는 관리자님 실기기 확인 후 조정값으로 확정합니다.
const TAB_BAR_BASE_HEIGHT = Platform.OS === 'ios' ? 56 : 64;

// 하단 탭 5개 — 탭 전환은 상태 교체, 탭별 뒤로가기 없음 (구조 정의서 확정 규칙)
// 아이콘 색상은 라벨 색과 맞추기 위해 tabBarActiveTintColor/tabBarInactiveTintColor에도
// 동일한 navIcon 토큰을 씁니다. 라벨 텍스트(홈/쇼핑/기록/리포트/마이)는 관리자님
// 요청(2026-08-14)으로 추가 — 그 전까지는 라우트 이름(영문)이 그대로 노출되고 있었습니다.
function Tabs() {
  // 탭바 높이를 직접 지정하면 React Navigation의 safe-area 자동 계산이 빠지기 때문에,
  // insets.bottom을 직접 더해줘야 합니다 (그냥 tabBarStyle.paddingTop만 추가하면
  // 기존 고정 height 안에서 콘텐츠가 짓눌려 라벨이 잘립니다).
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: navIcon.active,
        tabBarInactiveTintColor: navIcon.inactive,
        // 2026-08-17(세션 12) — 탭 라벨이 OS 기본 글꼴로 남아 있던 것을 앱 글꼴로
        // 맞춥니다(관리자 제보). React Navigation의 탭 라벨은 우리 Text 컴포넌트가
        // 아니라 라이브러리 내부 Text라 코드모드(scripts/apply-font-tokens.mjs)
        // 대상에서 빠져 있었고, fontFamily를 명시하지 않으면 OS 기본 글꼴로 남습니다
        // (TextInput과 동일한 이유 — ProductSearchBar.tsx 주석 참고).
        //
        // ⚠️ fontWeight는 주지 않습니다 — 굵기별 폰트 파일 위에 fontWeight를 얹으면
        // 안드로이드가 합성 볼드를 겹쳐 얹습니다(theme/typography.ts 규칙).
        // ⚠️ fontSize도 지정하지 않았습니다. 라이브러리 기본값을 그대로 두면 글꼴만
        // 바뀌고 탭바 레이아웃은 건드리지 않게 됩니다 — 글꼴 교체 후 크기가 어색하면
        // 여기에 fontSize를 추가하면 됩니다.
        tabBarLabelStyle: {
          ...weightFamily('medium'),
        },
        tabBarStyle: {
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tab.Screen
        name={MainTabRoutes.Home}
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => <IconNavHome color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.Shopping}
        component={ShoppingScreen}
        options={{
          tabBarLabel: '쇼핑',
          tabBarIcon: ({ color, size }) => <IconNavShop color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.RecordHub}
        component={RecordHubScreen}
        options={{
          tabBarLabel: '기록',
          tabBarIcon: ({ color, size }) => <IconNavRecord color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.Report}
        component={ReportScreen}
        options={{
          tabBarLabel: '리포트',
          tabBarIcon: ({ color, size }) => <IconNavReport color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.My}
        component={MyPageScreen}
        options={{
          tabBarLabel: '마이',
          tabBarIcon: ({ color, size }) => <IconNavMy color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function MainTabNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name={DetailRoutes.ProductRecord} component={ProductRecordScreen} />
      <Stack.Screen name={DetailRoutes.ProductScan} component={ProductScanScreen} />
      <Stack.Screen name={DetailRoutes.IngredientCheck} component={IngredientCheckScreen} />
      <Stack.Screen name={DetailRoutes.PhotoGuide} component={PhotoGuideScreen} />
      <Stack.Screen name={DetailRoutes.FaceCapture} component={FaceCaptureScreen} />
      <Stack.Screen name={DetailRoutes.AnalyzingSkin} component={AnalyzingSkinScreen} />
      <Stack.Screen name={DetailRoutes.SkinResult} component={SkinResultScreen} />
      <Stack.Screen name={DetailRoutes.MetricDetail} component={MetricDetailScreen} />
      <Stack.Screen name={DetailRoutes.CheckResult} component={CheckResultScreen} />
      <Stack.Screen name={DetailRoutes.ProductDetail} component={ProductDetailScreen} />
      <Stack.Screen name={DetailRoutes.LocationSettings} component={LocationSettingsScreen} />
      <Stack.Screen name={DetailRoutes.IngredientList} component={IngredientListScreen} />
      <Stack.Screen name={DetailRoutes.RoutineEdit} component={RoutineEditScreen} />
      <Stack.Screen name={DetailRoutes.RoutineAddProduct} component={RoutineAddProductScreen} />
      <Stack.Screen name={DetailRoutes.ProductManualRegister} component={ProductManualRegisterScreen} />
      <Stack.Screen name={DetailRoutes.RecordCalendar} component={RecordCalendarScreen} />
      {/* S-25 위시리스트 — 2026-08-17(세션 12) 신규. 쇼핑 화면 우측 상단 아이콘에서 진입. */}
      <Stack.Screen name={DetailRoutes.Wishlist} component={WishlistScreen} />
    </Stack.Navigator>
  );
}
