import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabRoutes, DetailRoutes, MainTabParamList, DetailStackParamList } from './routes';

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

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<DetailStackParamList>();

// 하단 탭 5개 — 탭 전환은 상태 교체, 탭별 뒤로가기 없음 (구조 정의서 확정 규칙)
function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name={MainTabRoutes.Home} component={HomeScreen} />
      <Tab.Screen name={MainTabRoutes.Shopping} component={ShoppingScreen} />
      <Tab.Screen name={MainTabRoutes.RecordHub} component={RecordHubScreen} />
      <Tab.Screen name={MainTabRoutes.Report} component={ReportScreen} />
      <Tab.Screen name={MainTabRoutes.My} component={MyPageScreen} />
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
    </Stack.Navigator>
  );
}