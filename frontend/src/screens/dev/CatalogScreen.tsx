import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { Tag } from '@/components/base/Tag';
import { ProgressBar } from '@/components/base/ProgressBar';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { ProductCard } from '@/components/domain/ProductCard';
import { MetricScoreList } from '@/components/domain/MetricScoreList';
import { EmptyState } from '@/components/state/EmptyState';
import { ErrorState } from '@/components/state/ErrorState';
import { LoadingState } from '@/components/state/LoadingState';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { color, space } from '@/theme/tokens';

/**
 * 개발용 컴포넌트 카탈로그.
 * Phase 2 전체(9종) 반영 완료:
 * 1차분 — Button / Card / Tag / ProgressBar
 * 2차분 — SegmentToggle / ProductCard / MetricScoreList / EmptyState / ErrorState / LoadingState / PermissionDenied
 */
export default function CatalogScreen() {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [dayNight, setDayNight] = useState<'day' | 'night'>('day');
  const [scanMode, setScanMode] = useState<'barcode' | 'photo'>('barcode');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Button">
        <Text style={styles.hint}>
          실제로 눌러보면 pressed 스타일이 보입니다. 아래는 disabled / loading 상태 예시입니다.
        </Text>
        <Row>
          <Button label="Primary" variant="primary" onPress={() => {}} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Ghost" variant="ghost" onPress={() => {}} />
        </Row>
        <Row>
          <Button label="Disabled" variant="primary" disabled onPress={() => {}} />
          <Button
            label="탭하면 1.5초 로딩"
            variant="primary"
            loading={loadingDemo}
            onPress={() => {
              setLoadingDemo(true);
              setTimeout(() => setLoadingDemo(false), 1500);
            }}
          />
        </Row>
      </Section>

      <Section title="Card">
        <Card>
          <Text style={styles.cardText}>Card 안에 들어가는 콘텐츠 예시입니다.</Text>
        </Card>
      </Section>

      <Section title="Tag (색 + 심볼)">
        <Row>
          <Tag variant="match" />
          <Tag variant="caution" />
          <Tag variant="insufficient" />
        </Row>
      </Section>

      <Section title="ProgressBar">
        <Text style={styles.hint}>분모 확정 (예: 온보딩 3/6단계)</Text>
        <ProgressBar progress={3 / 6} current={3} total={6} style={styles.progressSpacing} />
        <Text style={styles.hint}>분모 미확정 (성별 선택 전) — 채움바만</Text>
        <ProgressBar progress={0.3} style={styles.progressSpacing} />
      </Section>

      <Section title="SegmentToggle">
        <Text style={styles.hint}>낮/밤 홈 토글 예시 — 실제로 눌러서 전환해 보세요.</Text>
        <SegmentToggle
          options={[
            { value: 'day', label: '낮' },
            { value: 'night', label: '밤' },
          ]}
          value={dayNight}
          onChange={setDayNight}
        />
        <Text style={styles.hint}>스캐너 2모드 전환 예시 (같은 컴포넌트 재사용)</Text>
        <SegmentToggle
          options={[
            { value: 'barcode', label: '바코드' },
            { value: 'photo', label: '사진' },
          ]}
          value={scanMode}
          onChange={setScanMode}
        />
      </Section>

      <Section title="ProductCard">
        <ProductCard
          brand="이니스프리"
          name="그린티 씨드 세럼 리치 버전으로 아주 긴 제품명 테스트용 텍스트입니다"
          category="세럼"
          onPress={() => {}}
        />
        <ProductCard brand="아누아" name="어성초 77 토너" category="토너" onPress={() => {}} />
      </Section>

      <Section title="MetricScoreList">
        <Text style={styles.hint}>
          score/delta 방향은 백엔드 정규화 확정 대기 중 — 지금은 "높을수록 좋음" 가정
        </Text>
        <MetricScoreList
          items={[
            { key: 'trouble', label: '트러블', score: 72, delta: 5 },
            { key: 'redness', label: '홍조', score: 58, delta: -3 },
            { key: 'pigment', label: '색소침착', score: 64, delta: 0 },
            { key: 'pore', label: '모공', score: 80, delta: null },
          ]}
        />
      </Section>

      <Section title="EmptyState">
        <Card padding={4}>
          <EmptyState
            icon="calendar-outline"
            title="아직 기록이 없어요"
            description="오늘의 피부 기록을 남겨보세요."
            actionLabel="기록하러 가기"
            onAction={() => {}}
          />
        </Card>
      </Section>

      <Section title="ErrorState (3종)">
        <Card padding={4}>
          <ErrorState variant="network" onRetry={() => {}} />
        </Card>
        <Card padding={4}>
          <ErrorState variant="server" onRetry={() => {}} />
        </Card>
        <Card padding={4}>
          <ErrorState variant="notFound" />
        </Card>
      </Section>

      <Section title="LoadingState (spinner / skeleton)">
        <Card padding={4}>
          <LoadingState variant="spinner" />
        </Card>
        <Card padding={4}>
          <LoadingState variant="skeleton" skeletonLines={3} />
        </Card>
      </Section>

      <Section title="PermissionDenied (3종)">
        <Card padding={4}>
          <PermissionDenied type="camera" onOpenSettings={() => {}} />
        </Card>
        <Card padding={4}>
          <PermissionDenied type="location" onOpenSettings={() => {}} />
        </Card>
        <Card padding={4}>
          <PermissionDenied type="notification" onOpenSettings={() => {}} />
        </Card>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    padding: space[5],
    backgroundColor: color.bg,
    gap: space[6],
  },
  section: {
    gap: space[3],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.ink900,
  },
  hint: {
    fontSize: 12,
    color: color.ink600,
  },
  row: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardText: {
    color: color.ink900,
  },
  progressSpacing: {
    marginBottom: space[3],
  },
});
