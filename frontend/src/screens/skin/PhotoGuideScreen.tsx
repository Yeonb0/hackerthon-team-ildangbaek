// PhotoGuideScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconPersonCircle } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space } from '@/theme/tokens';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const TIPS = [
  '정면을 응시해 주세요',
  '밝은 자연광 아래에서 촬영해 주세요',
  '안경・모자는 벗어 주세요',
  '세안 후 30분 뒤 촬영을 권장해요',
];

/**
 * S-15 촬영 가이드. 정적 화면(API 불필요) — F-SKIN-01.
 *
 * BR3: "매번 노출할지 최초 1회만 노출할지는 구현 시 결정" — 지금은 매번 노출로
 * 가장 단순하게 구현했습니다. 최초 1회만으로 바꾸고 싶으면 진입 지점(RecordHub의
 * "피부 기록" 슬롯 탭 핸들러)에서 already-seen 플래그를 보고 PhotoGuide를 건너뛰고
 * 바로 FaceCapture로 이동하도록 분기를 추가하면 됩니다 — 이 화면 자체는 안 바뀝니다.
 */
export function PhotoGuideScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'PhotoGuide'>>();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + space[5] }]}
    >
      <Text style={styles.title}>촬영 전 확인해 주세요</Text>

      {/* 예시 이미지 — 실제 이미지 에셋은 디자인 확정 후 교체 (BR1) */}
      <View style={styles.exampleBox}>
        <IconPersonCircle size={72} color={color.ink300} />
        <Text style={styles.exampleLabel}>예시 이미지 (디자인 확정 전)</Text>
      </View>

      <Card style={styles.tipsCard}>
        {TIPS.map((tip, index) => (
          <View key={tip} style={styles.tipRow}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </Card>

      <Button
        label="촬영 시작"
        variant="primary"
        onPress={() =>
          navigation.navigate(DetailRoutes.FaceCapture, { timeSlot: route.params.timeSlot })
        }
        style={styles.startButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space[5],
    gap: space[5],
    backgroundColor: color.bg,
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: color.ink900,
  },
  exampleBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[8],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.ink300,
    borderStyle: 'dashed',
  },
  exampleLabel: {
    fontSize: 12,
    color: color.ink600,
  },
  tipsCard: {
    gap: space[4],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: color.brand700,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: color.ink900,
    lineHeight: 20,
  },
  startButton: {
    marginTop: space[2],
  },
});
