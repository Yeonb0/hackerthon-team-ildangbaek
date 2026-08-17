// PhotoGuideScreen.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IconBack, IconCheck } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, gradient, gradientDirection, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

// Figma 59:6345~59:6371 문구 그대로.
const TIPS = [
  '정면을 바라봐 주세요',
  '밝은 자연광 아래서 촬영',
  '안경·모자를 벗어주세요',
  '세안 후 30분 뒤 권장',
];

/**
 * S-15 촬영 가이드. 정적 화면(API 불필요) — F-SKIN-01.
 *
 * 2026-08-17(세션 13) — Figma 컬러 확정본 `P8CmHDZp7z0dKiHByEzuLx` node `59:6317` 실측
 * 반영. 이전 구조(연보라 예시 박스 + 번호 배지 카드)에서 아래처럼 바뀌었습니다:
 *   - 헤더가 "< 촬영 가이드"(작은 보조 라벨)로 바뀌고, 큰 제목은 본문 첫 줄로 내려옴
 *   - 팁 행의 번호 배지(1·2·3·4) → 그라데이션 원 + 흰 체크. 순서에 의미가 없어서
 *     번호를 뺀 것으로 읽힙니다
 *   - 팁을 Card로 감싸지 않고 배경 위에 그대로 나열
 *   - 부제 "같은 조건일수록" → Figma 문구 "균등 조건일수록"으로 교체
 *
 * BR3: "매번 노출할지 최초 1회만 노출할지는 구현 시 결정" — 지금은 매번 노출로
 * 가장 단순하게 구현했습니다. 최초 1회만으로 바꾸고 싶으면 진입 지점(RecordHub의
 * "피부 기록" 슬롯 탭 핸들러)에서 already-seen 플래그를 보고 PhotoGuide를 건너뛰고
 * 바로 FaceCapture로 이동하도록 분기를 추가하면 됩니다 — 이 화면 자체는 안 바뀝니다.
 *
 * ⚠️ 프리뷰 박스는 여전히 자리표시자입니다. Figma도 회색 박스 + 점선 타원 + "카메라 뷰"
 * 텍스트라서 실제 예시 사진 에셋이 없는 상태 그대로입니다(디자인 자산 미수령).
 */
export function PhotoGuideScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'PhotoGuide'>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + space[3] }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={12}
            style={styles.navRow}
          >
            <IconBack size={18} color={color.textSub} />
            <Text style={styles.navLabel}>촬영 가이드</Text>
          </Pressable>
          <Text style={styles.title}>이렇게 찍어주세요</Text>
          <Text style={styles.subtitle}>균등 조건일수록 분석이 정확해져요</Text>
        </View>

        {/* 예시 프리뷰 — Figma 59:6334. 실제 예시 사진 에셋 미수령이라 회색 박스 안
            점선 타원으로 자리만 잡습니다. */}
        <View style={styles.previewBox}>
          <View style={styles.previewOval}>
            <Text style={styles.previewLabel}>카메라 뷰</Text>
          </View>
        </View>

        <View style={styles.tipList}>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <LinearGradient
                colors={gradient.brand}
                start={gradientDirection.badge.start}
                end={gradientDirection.badge.end}
                style={styles.tipCheck}
              >
                <IconCheck size={12} color={color.white} />
              </LinearGradient>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[6] }]}>
        <Button
          label="촬영 시작"
          variant="primary"
          onPress={() =>
            navigation.navigate(DetailRoutes.FaceCapture, { timeSlot: route.params.timeSlot })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  // 스크롤 없이 한 화면에 담습니다(관리자 요청, 2026-08-17). 세로 여유는 프리뷰 박스가
  // 혼자 흡수하고(flex: 1) 나머지 요소는 고정 높이입니다 — 작은 기기에서는 프리뷰가
  // 줄어들고 큰 기기에서는 늘어납니다.
  content: {
    flex: 1,
    paddingHorizontal: space[5],
  },
  header: {
    paddingBottom: space[3],
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    alignSelf: 'flex-start',
  },
  navLabel: {
    fontSize: adjustFontSize(14),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  title: {
    // Figma는 26px Black인데 이 프로젝트 폰트 세트에 Black(900) weight가 없어 bold(700)로 둡니다.
    fontSize: adjustFontSize(26),
    lineHeight: 34,
    ...weightFamily('bold'),
    color: color.textInk,
    paddingTop: space[4],
  },
  subtitle: {
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textSub,
    paddingTop: space[1],
  },
  previewBox: {
    // Figma는 350×421 고정이지만 그 비율을 지키면 팁·CTA가 화면 밖으로 밀립니다.
    // 비율 대신 가변 높이로 두고 최소 높이만 보장합니다.
    flex: 1,
    minHeight: 200,
    borderRadius: 20,
    backgroundColor: color.surfacePhotoPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewOval: {
    // 프리뷰 박스가 줄어들 때 타원이 박스를 뚫지 않도록 높이도 비율로 잡습니다.
    width: '41%',
    aspectRatio: 144 / 192,
    maxHeight: '46%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(155, 140, 245, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  tipList: {
    gap: space[3],
    paddingTop: space[4],
    paddingBottom: space[4],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  tipCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('medium'),
    color: color.textInk,
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
  },
});