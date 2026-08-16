import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getHumidityGradeLabel, getUvGradeLabel } from '@/lib/weather';
import { color, overlayWhite, pinDisplayFont, radius, space, typography, weightFamily } from '@/theme';
import type { HomeEnvironment } from '@/types/home';
import { adjustFontSize } from '@/theme/typography';

type EnvironmentCardProps = {
  environment: HomeEnvironment | null;
  /** failedSections에 'environment'가 포함된 경우 true. "아직 값 없음"과 "조회 실패"를 구분합니다 (F-HOME-03 부분 실패 규칙) */
  hasFailed?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 낮 홈(S-07) 전용 환경 정보 블록 — 날씨 배경 이미지(DayHomeScreen 히어로) 위에 얹힙니다.
 *
 * 2026-08-16 — Figma Home-Day(229:2571, 최신본) 대조. 예전엔 카드가 옅은 그라데이션
 * 배경(브랜드 톤) 위에 있어서 ink 계열 어두운 텍스트였는데, 지금은 날씨 사진 위라 전부
 * 흰색/반투명 흰색으로 바꿨습니다. 온도도 40 → 58(Figma display 사이즈)로 키웠습니다.
 * 날씨 아이콘 자리(점선 placeholder)는 Figma에 이 요소 자체가 없어서 제거했습니다.
 *
 * UV·습도 칩은 Figma "Chip/OnHero" 그대로 반투명 흰(90%) 배경 + ink 텍스트로 통일했습니다
 * (예전엔 UV/습도를 서로 다른 톤 배지로 구분했는데, Figma엔 그 구분이 없습니다).
 * 습도 칩에서 Figma 예시엔 등급 문구가 빠져있지만("💧 습도 55%"), 이건 이 목업 하나의
 * 예시일 뿐 등급 정보 자체를 빼라는 지시는 아니라고 판단해 값+등급 둘 다 유지했습니다
 * (관리자님 확인 필요하면 말씀해주세요 — 빼는 건 한 줄만 지우면 됩니다).
 *
 * 2026-08-16 — 낮 홈을 스크롤 없이 한 화면에 다 보이게 해달라는 요청으로 UV·습도 칩을
 * 온도 옆(같은 행)으로 옮겼다가, 바로 다음 요청으로 다시 온도 아래(원래 방향, Figma와
 * 동일)로 되돌렸습니다. 대신 인사말("좋은 아침이에요", DayHomeScreen)과 날씨 라벨
 * ("맑음")을 지워서 그만큼 생긴 여유로 온도를 58→64로 키웠습니다.
 *
 * "어제보다 2° 높아요" 같은 전일 대비 문구는 Figma에 있지만 백엔드에 아직 없는 데이터라
 * (관리자님 확인, 2026-08-16) 보류 상태입니다 — 값이 추가되면 weather 줄에 이어붙이면 됩니다.
 *
 * 2026-08-15 — 기온 숫자만 배달의민족 주아체(BMJUA)로 고정했습니다(관리자 요청).
 * 마이페이지 글꼴 설정(Pretendard/나눔스퀘어네오)의 영향을 받지 않는 자리입니다. Figma는
 * 날씨 설명 줄과 루틴 리스트 항목명에도 같은 계열(Jua) 폰트를 쓰지만, "온도 숫자만 BMJUA"
 * 라는 기존 결정을 넘어서는 확장이라 이번엔 온도만 그대로 유지하고 나머지는 기존 본문
 * 글꼴을 그대로 씁니다 — 폰트 적용 범위를 넓히고 싶으시면 별도로 말씀해주세요.
 *
 * ⚠️ 단위(°C)는 주아체로 그리면 안 됩니다.
 * 주아체 파일은 U+00B0(°)와 U+2103(℃)을 cmap에 매핑해 두고도 글리프가 비어 있습니다
 * (contours=0, advance width 800). 그대로 쓰면 동그라미가 사라지고 넓은 공백만 남습니다.
 * 그래서 숫자만 주아체로, 단위는 본문 글꼴로 중첩 Text를 써서 분리했습니다.
 * 다른 자리에 주아체를 쓸 때도 기호류(°, ℃ 등)는 같은 방식으로 빼야 합니다.
 * 주아체는 Regular 단일 weight라 fontWeight는 주지 않습니다 — 주면 안드로이드가
 * 합성 볼드를 얹어 획이 뭉갭니다.
 */
export function EnvironmentCard({ environment, hasFailed = false, style }: EnvironmentCardProps) {
  if (hasFailed || !environment) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>날씨 정보를 불러오지 못했어요.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {/* 중첩 Text는 부모의 글꼴을 물려받으므로, 단위 쪽에서 fontFamily를 명시적으로
          덮어써야 본문 글꼴로 그려집니다. */}
      <Text style={styles.temperature}>
        {environment.temperature}
        <Text style={styles.temperatureUnit}>°C</Text>
      </Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            ☀️ 자외선 {environment.uvIndex} · {getUvGradeLabel(environment.uvGrade)}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            💧 습도 {environment.humidity}% · {getHumidityGradeLabel(environment.humidityGrade)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[1],
  },
  temperature: {
    // 2026-08-16 — 인사말·날씨 라벨("맑음")을 지우면서 생긴 여유 공간만큼 살짝 키웠습니다
    // (58 → 64).
    fontSize: adjustFontSize(64),
    // 주아체는 글자 상자가 커서 lineHeight를 명시하지 않으면 안드로이드에서 위아래가
    // 잘립니다. fontSize의 1.2배로 잡아뒀습니다.
    lineHeight: adjustFontSize(64) * 1.2,
    color: color.white,
    ...pinDisplayFont('bmjua'),
  },
  temperatureUnit: {
    // 주아체에 도(°) 글리프가 비어 있어서 이 조각만 본문 글꼴로 그립니다(위 주석 참고).
    fontSize: adjustFontSize(34),
    color: color.white,
    ...weightFamily('bold'),
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    marginTop: 0,
  },
  badge: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: overlayWhite[90],
  },
  badgeText: {
    fontSize: adjustFontSize(11),
    color: color.textInk,
    ...weightFamily('semibold'),
  },
  // 날씨 이미지 배경이 밝든 어둡든 항상 읽히도록 반투명 검정 스크림을 깔았습니다
  // (기존엔 배경이 항상 밝은 그라데이션이라 이런 처리가 필요 없었습니다).
  errorBox: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.sm,
    backgroundColor: color.scrim40,
  },
  errorText: {
    ...typography.body,
    color: color.white,
  },
});
