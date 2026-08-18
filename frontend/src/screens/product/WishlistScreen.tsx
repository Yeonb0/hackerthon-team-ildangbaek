// WishlistScreen.tsx — S-25 위시리스트 (2026-08-17 세션 12 신규 / 2026-08-18 세션 18 개명)
//
// 원래 이름은 "장바구니"(CartScreen)였습니다. 디자이너 제안 + 관리자 승인으로 위시리스트로
// 바꿨습니다 — 사유와 저장 키 초기화 건은 src/store/wishlistStore.ts 상단 주석 참고.
//
// 관리자 요청으로 신설한 화면입니다. 쇼핑 화면(S-21) 우측 상단 위시리스트 아이콘에서
// 진입합니다.
//
// ⚠️ 백엔드 API가 없습니다 — wishlistStore(클라이언트 저장) 하나만 봅니다. 자세한 제약은
// src/store/wishlistStore.ts 상단 주석 참고.
//
// ⚠️ Figma에 이 화면 디자인이 없습니다. 쇼핑 화면(Hifi ShopTab 59:6897)의 카드 스타일
// (연보라 배경 + 흰 카드 + 제품명 볼드/브랜드 회색)을 그대로 가져와서 톤만 맞췄습니다 —
// 디자인이 확정되면 교체해야 합니다.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconBack, IconImagePlaceholder, IconTrash } from '@/components/icons';
import { EmptyState } from '@/components/state/EmptyState';
import { Popup } from '@/components/base/Popup';
import { useWishlistStore } from '@/store/wishlistStore';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, reportCardShadow, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

export function WishlistScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();

  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const clear = useWishlistStore((s) => s.clear);

  const [clearConfirmVisible, setClearConfirmVisible] = React.useState(false);

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + space[2] }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={8}
          style={styles.navBackButton}
        >
          <IconBack size={20} color={color.textInk} />
        </Pressable>
        <Text style={styles.navTitle}>위시리스트</Text>
        {items.length > 0 ? (
          <Pressable
            onPress={() => setClearConfirmVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="위시리스트 비우기"
            hitSlop={8}
          >
            <Text style={styles.clearLink}>비우기</Text>
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="trayEmpty"
            title="위시리스트가 비어 있어요"
            description="제품 상세에서 마음에 드는 제품을 추가해보세요."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}
        >
          <Text style={styles.countText}>저장한 제품 {items.length}개</Text>

          {items.map((item) => (
            <Pressable
              key={item.productId}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} 상세 보기`}
              onPress={() =>
                navigation.navigate(DetailRoutes.ProductDetail, { productId: item.productId })
              }
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.thumbnail}>
                <IconImagePlaceholder size={22} color={color.textMuted} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.brand} numberOfLines={1}>
                  {item.brand}
                </Text>
              </View>
              {/* 카드 전체가 Pressable이라 삭제 버튼에 눌림이 겹칩니다 — 삭제 쪽에서
                  이벤트를 잡아 카드 탭(상세 이동)이 같이 발생하지 않게 막습니다. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name} 위시리스트에서 삭제`}
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  remove(item.productId);
                }}
                style={styles.removeButton}
              >
                <IconTrash size={18} color={color.textSub} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Popup
        visible={clearConfirmVisible}
        title="위시리스트를 비울까요?"
        description="저장한 제품이 모두 삭제돼요. 이 동작은 되돌릴 수 없어요."
        primaryLabel="비우기"
        onPrimaryPress={() => {
          clear();
          setClearConfirmVisible(false);
        }}
        secondaryLabel="취소"
        onSecondaryPress={() => setClearConfirmVisible(false)}
        onRequestClose={() => setClearConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingBottom: space[3],
  },
  navBackButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: adjustFontSize(17),
    ...weightFamily('bold'),
    color: color.textInk,
  },
  clearLink: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: space[4],
    gap: space[3],
  },
  countText: {
    fontSize: adjustFontSize(12),
    ...weightFamily('medium'),
    color: color.textSub,
    paddingHorizontal: space[1],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: color.bg,
    borderRadius: radius.xl,
    padding: space[4],
    ...reportCardShadow.soft,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceLavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: adjustFontSize(14),
    lineHeight: 21,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  brand: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
