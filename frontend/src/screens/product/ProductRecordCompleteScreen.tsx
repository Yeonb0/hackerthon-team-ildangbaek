// src/screens/product/ProductRecordCompleteScreen.tsx
//
// 제품 등록 완료 (Figma Hifi-GUI `322:911` ProductRegister 실측).
//
// 세션 18에서 "완료 화면 진입 지점 미결"로 남아 있던 항목입니다. 관리자님이 A안
// (제품 기록 저장 직후, S-11)으로 확정했습니다(2026-08-19).
//
// ─────────────────────────────────────────────────────────────────────────────
// Figma 실측값
//
//   아이콘   icon-face-good 80×80 (기존 42종 세트 그대로 — 새 에셋 불필요)
//   제목     22 / Bold / #423B5C          "제품 기록 완료!"(아래 참고)
//   설명     13 / Medium / #A79FC2        "이제 오늘의 피부를 기록해보세요"
//   CTA      Button/Primary, 그라데이션 + shadow/cta   "피부 기록하러 가기"
//   텍스트   15 / Medium / #A79FC2        "홈으로 돌아가기"
//   하단여백 48
//
// ⚠️ Figma 문구는 「제품 등록 완료!」인데 **「제품 기록 완료!」로 바꿨습니다**(관리자님
// 확정). 이 화면은 S-11의 "오늘 기록 저장" 직후에 뜨는 자리라 "등록"은 제품을 카탈로그에
// 추가하는 다른 동작(S-14 직접 등록)과 헷갈립니다.
//
// ⚠️ Figma는 아이콘이 단색인데 **그라데이션으로 넣었습니다**(관리자님 요청 —
// "앱 아이콘처럼"). 새 의존성은 쓰지 않았고, react-native-svg의 Defs +
// LinearGradient를 IconFaceGood에 추가해서 처리했습니다.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { IconFaceGood } from '@/components/icons';
import { DetailRoutes, DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, gradient, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

export function ProductRecordCompleteScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'ProductRecordComplete'>>();
  const insets = useSafeAreaInsets();

  const { timeSlot, skinRecordSuggested } = route.params;

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', state: { routes: [{ name: MainTabRoutes.Home }] } }],
    });
  };

  /**
   * 피부 기록 흐름으로 이어갑니다. `reset`이 아니라 `replace`인 이유 — 사진 안내(S-15)
   * 에서 뒤로 가면 완료 화면이 아니라 그 앞(기록 허브)으로 나가야 자연스럽습니다.
   * 완료 화면은 지나가는 화면이라 스택에 남길 이유가 없습니다.
   */
  const handleGoToSkinRecord = () => {
    navigation.replace(DetailRoutes.PhotoGuide, { timeSlot });
  };

  /**
   * 같은 시간대 피부 기록이 이미 끝났으면(`skinRecordSuggested === false`) 피부 기록을
   * 권할 이유가 없습니다 — 눌러도 S-15에서 "이미 기록했다"로 막힙니다. 이때는 문구를
   * 바꾸고 홈으로 보내는 버튼 하나만 둡니다.
   *
   * 이 값은 서버가 `POST /product-records` 응답으로 주는 것을 그대로 실어온 것입니다
   * (F-PRODUCT-07과 같은 조건).
   */
  const description = skinRecordSuggested
    ? '이제 오늘의 피부를 기록해보세요'
    : '오늘 기록이 모두 끝났어요';

  return (
    <View style={styles.screen}>
      <View style={[styles.body, { paddingTop: insets.top }]}>
        <IconFaceGood size={80} gradientColors={gradient.brand} />
        <View style={styles.textBlock}>
          <Text style={styles.title}>제품 기록 완료!</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[6] }]}>
        {skinRecordSuggested ? (
          <>
            <Button label="피부 기록하러 가기" variant="primary" onPress={handleGoToSkinRecord} />
            <Pressable onPress={handleGoHome} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.textButton}>홈으로 돌아가기</Text>
            </Pressable>
          </>
        ) : (
          <Button label="홈으로 돌아가기" variant="primary" onPress={handleGoHome} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    paddingHorizontal: space[6],
  },
  textBlock: {
    alignItems: 'center',
    gap: space[2],
  },
  title: {
    fontSize: adjustFontSize(22),
    lineHeight: 31,
    ...weightFamily('bold'),
    color: color.textInk,
    textAlign: 'center',
  },
  description: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    gap: space[3],
    alignItems: 'stretch',
  },
  textButton: {
    fontSize: adjustFontSize(15),
    lineHeight: 22,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },
});
