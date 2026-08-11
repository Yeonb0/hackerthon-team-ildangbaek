import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabRoutes, DetailRoutes, MainTabParamList, DetailStackParamList } from './routes';
import { navIcon } from '@/theme/tokens';
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
import { LocationSettingsScreen } from '@/screens/my/LocationSettingsScreen';
import { IngredientListScreen } from '@/screens/my/IngredientListScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<DetailStackParamList>();

// 하단 탭 5개 — 탭 전환은 상태 교체, 탭별 뒤로가기 없음 (구조 정의서 확정 규칙)
// 아이콘 색상은 라벨 색과 맞추기 위해 tabBarActiveTintColor/tabBarInactiveTintColor에도
// 동일한 navIcon 토큰을 씁니다 (Checkpoint 9-A. 라벨 텍스트 자체는 이번 범위 아님).
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: navIcon.active,
        tabBarInactiveTintColor: navIcon.inactive,
      }}
    >
      <Tab.Screen
        name={MainTabRoutes.Home}
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <IconNavHome color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.Shopping}
        component={ShoppingScreen}
        options={{
          tabBarIcon: ({ color, size }) => <IconNavShop color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.RecordHub}
        component={RecordHubScreen}
        options={{
          tabBarIcon: ({ color, size }) => <IconNavRecord color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.Report}
        component={ReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => <IconNavReport color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={MainTabRoutes.My}
        component={MyPageScreen}
        options={{
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
      <Stack.Screen name={DetailRoutes.LocationSettings} component={LocationSettingsScreen} />
      <Stack.Screen name={DetailRoutes.IngredientList} component={IngredientListScreen} />
    </Stack.Navigator>
  );
}