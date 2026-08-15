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
import { IconCheck } from '@/components/icons';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import { Popup } from '@/components/base/Popup';
import { LoadingState } from '@/components/state/LoadingState';
import { EmptyState } from '@/components/state/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLocationSearch, useUpdateLocation } from '@/api/queries/user';
import { DetailStackParamList } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { LocationItem } from '@/types/user';

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
      <Pressable
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => setSelectedId(item.locationId)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={styles.rowText}>{item.name}</Text>
        <View style={styles.rowTrailing}>
          {item.current && <Text style={styles.currentBadge}>현재 설정</Text>}
          {isSelected && <IconCheck size={18} color={color.brand700} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[4] }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>위치 설정</Text>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={styles.skipText}>변경 없음</Text>
          </Pressable>
        </View>

        <Button
          label="현재 위치 사용"
          variant="secondary"
          loading={isLocating}
          onPress={handleUseCurrentPosition}
          style={styles.gpsButton}
        />

        <Input
          value={keyword}
          onChangeText={setKeyword}
          placeholder="지역 검색 (예: 강남구)"
          returnKeyType="search"
          accessibilityLabel="지역 검색"
        />
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

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space[5] }]}>
        <Button
          label="저장"
          variant="primary"
          disabled={!canSave}
          loading={updateLocation.isPending}
          onPress={handleSave}
          style={styles.saveButton}
        />
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
    gap: space[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  skipText: {
    ...typography.body,
    color: color.ink600,
  },
  gpsButton: {
    width: '100%',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: space[5],
    paddingBottom: space[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.ink300,
  },
  rowSelected: {
    backgroundColor: color.brand50,
  },
  rowText: {
    ...typography.body,
    color: color.ink900,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  currentBadge: {
    ...typography.micro,
    color: color.brand700,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.ink300,
  },
  saveButton: {
    width: '100%',
  },
});
