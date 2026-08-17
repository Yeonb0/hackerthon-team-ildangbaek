// LocationSettingsScreen.tsx — S-24 위치 설정
//
// 로드맵(frontend-roadmap-phases.md) Phase 8은 "정적 JSON + 로컬 필터"로 계획했지만,
// 실제 USER-05/06 명세는 서버 검색 API(`GET /locations?keyword=`)로 설계되어 있어서
// 그대로 따랐습니다(관리자 확인, 2026-08-11 — types/user.ts 상단 주석 참고). 대신 두
// 경로를 모두 지원해서 로드맵이 원했던 "빠르게 위치 설정" 경험을 살렸습니다:
//
//   1) "현재 위치 사용" — expo-location으로 GPS 좌표를 얻어 즉시 PATCH (USER-06 (b))
//   2) 검색 목록에서 선택 → "저장" 버튼으로 확정 (USER-06 (a), F-MY-04 BR1)
//
// F-MY-04 BR5: "변경 없음" 텍스트 버튼으로 저장 안 하고 나갈 수 있음.
// F-MY-04 BR6 / F-SYSTEM-01 BR4: 위치 권한 거부는 이 화면(S-24)의 수동 설정으로
// 대체 — 그래서 GPS 권한이 거부돼도 화면 전체를 막지 않고 검색 목록은 계속 씁니다.
import React, { useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTextInput } from '@/components/base/AppTextInput';
import { IconBack, IconCheck, IconSearch } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Popup } from '@/components/base/Popup';
import { LoadingState } from '@/components/state/LoadingState';
import { EmptyState } from '@/components/state/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLocationSearch, useUpdateLocation } from '@/api/queries/user';
import { DetailStackParamList } from '@/app/routes';
import { color, gradient, gradientDirection, radius, space } from '@/theme';
import type { LocationItem } from '@/types/user';
import { adjustFontSize, weightFamily } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

export function LocationSettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const { data: locations, isLoading } = useLocationSearch(debouncedKeyword);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionPopupVisible, setPermissionPopupVisible] = useState(false);

  const updateLocation = useUpdateLocation();

  const currentLocation = locations?.find((item) => item.current) ?? null;
  const effectiveSelectedId = selectedId ?? currentLocation?.locationId ?? null;
  const canSave = selectedId !== null && selectedId !== currentLocation?.locationId;

  const handleUseCurrentPosition = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionPopupVisible(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      await updateLocation.mutateAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      navigation.goBack();
    } catch {
      // 위치 조회 자체가 실패해도(기기 GPS 꺼짐, 일시적 오류 등) 화면은 검색 목록으로
      // 계속 쓸 수 있어야 하므로 조용히 무시합니다 — F-MY-04 BR6과 같은 원칙.
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    if (!canSave || selectedId === null) return;
    updateLocation.mutate(
      { locationId: selectedId },
      { onSuccess: () => navigation.goBack() }
    );
  };

  const renderItem = ({ item }: { item: LocationItem }) => {
    const isSelected = item.locationId === effectiveSelectedId;
    return (
      <View>
        <Pressable
          style={styles.row}
          onPress={() => setSelectedId(item.locationId)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{item.name}</Text>
          {/* Figma 59:7541 — 선택 표시는 그라데이션 원 + 흰 체크입니다. "현재 설정"
              텍스트 배지는 Figma에 없어 뺐습니다. 서버가 준 current 항목은 진입 시점에
              이미 선택 상태로 보이므로(effectiveSelectedId) 배지 없이도 구분됩니다. */}
          {isSelected ? (
            <LinearGradient
              colors={gradient.brand}
              start={gradientDirection.badge.start}
              end={gradientDirection.badge.end}
              style={styles.checkCircle}
            >
              <IconCheck size={12} color={color.white} />
            </LinearGradient>
          ) : null}
        </Pressable>
        <View style={styles.divider} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[3] }]}>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={12}
          >
            <IconBack size={18} color={color.textInk} />
          </Pressable>
          <Text style={styles.title}>위치 설정</Text>
        </View>

        {/* Figma 59:7531 — 아이콘 내장 검색 입력. 공용 Input에는 아이콘 슬롯이 없어
            성분 목록 화면과 같은 방식으로 직접 구성합니다. */}
        <View style={styles.searchBox}>
          <IconSearch size={14} color={color.textMuted} />
          <AppTextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="지역 설정을 직접 입력해요"
            placeholderTextColor={color.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="지역 검색"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerFill}>
          <LoadingState />
        </View>
      ) : locations && locations.length > 0 ? (
        <FlatList
          data={locations}
          keyExtractor={(item) => String(item.locationId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        // USER-05 BR3: 검색 결과 없음은 오류가 아니라 빈 배열 — EmptyState로 처리.
        <View style={styles.centerFill}>
          <EmptyState icon="search" title="검색 결과가 없어요" />
        </View>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[6] }]}>
        <Button
          label="저장"
          variant="primary"
          disabled={!canSave}
          loading={updateLocation.isPending}
          onPress={handleSave}
        />
        {/* Figma 59:7578 — GPS 사용이 상단 secondary 버튼에서 하단 텍스트 버튼으로
            내려왔습니다. 동작은 그대로(USER-06 (b) 좌표 PATCH). */}
        <Pressable
          onPress={handleUseCurrentPosition}
          disabled={isLocating}
          accessibilityRole="button"
          accessibilityLabel="현재 위치로 설정"
          hitSlop={8}
        >
          <Text style={styles.currentPositionText}>
            {isLocating ? '위치 확인 중…' : '현재 위치'}
          </Text>
        </Pressable>
      </View>

      <Popup
        visible={permissionPopupVisible}
        title="위치 권한이 필요해요"
        description="설정에서 위치 접근을 허용하면 현재 위치를 바로 쓸 수 있어요. 권한 없이도 아래 검색으로 지역을 직접 고를 수 있어요."
        primaryLabel="설정 열기"
        onPrimaryPress={() => {
          setPermissionPopupVisible(false);
          Linking.openSettings();
        }}
        secondaryLabel="닫기"
        onSecondaryPress={() => setPermissionPopupVisible(false)}
        onRequestClose={() => setPermissionPopupVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
    gap: space[5],
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  title: {
    fontSize: adjustFontSize(17),
    lineHeight: 24,
    ...weightFamily('bold'),
    color: color.textInk,
  },

  // --- 검색 (Figma 59:7526) ---
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    gap: space[2],
  },
  searchInput: {
    flex: 1,
    // 안드로이드 TextInput 기본 세로 패딩 제거 — 고정 높이 박스에서 글자가 아래로
    // 쏠리는 것을 막습니다.
    paddingVertical: 0,
    fontSize: adjustFontSize(13),
    ...weightFamily('medium'),
    color: color.textInk,
  },

  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: space[5],
    paddingBottom: space[6],
  },

  // --- 목록 행 (Figma 59:7537) ---
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[4],
  },
  rowText: {
    fontSize: adjustFontSize(15),
    lineHeight: 23,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  rowTextSelected: {
    color: color.brand700,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: color.borderDividerFaint,
  },

  // --- 하단 (Figma 59:7574) ---
  bottomBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[3],
  },
  currentPositionText: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },
});