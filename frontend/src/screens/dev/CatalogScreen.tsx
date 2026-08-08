import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { Tag } from '@/components/base/Tag';
import { ProgressBar } from '@/components/base/ProgressBar';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { Input } from '@/components/base/Input';
import { Chip } from '@/components/base/Chip';
import { OptionCard } from '@/components/base/OptionCard';
import { Stepper } from '@/components/base/Stepper';
import { Calendar } from '@/components/base/Calendar';
import { DateField } from '@/components/base/DateField';
import { WheelPicker } from '@/components/base/WheelPicker';
import { ProductCard } from '@/components/domain/ProductCard';
import { MetricScoreList } from '@/components/domain/MetricScoreList';
import { EmptyState } from '@/components/state/EmptyState';
import { ErrorState } from '@/components/state/ErrorState';
import { LoadingState } from '@/components/state/LoadingState';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { getTodayDateString } from '@/lib/date';
import { color, space } from '@/theme/tokens';

/**
 * 개발용 컴포넌트 카탈로그.
 * Phase 2 전체(9종) 반영 완료:
 * 1차분 — Button / Card / Tag / ProgressBar
 * 2차분 — SegmentToggle / ProductCard / MetricScoreList / EmptyState / ErrorState / LoadingState / PermissionDenied
 * Phase 3 S-01 추가분 — Input / Chip / Stepper / InlineErrorBanner
 */
export default function CatalogScreen() {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [dayNight, setDayNight] = useState<'day' | 'night'>('day');
  const [scanMode, setScanMode] = useState<'barcode' | 'photo'>('barcode');
  const [nameInput, setNameInput] = useState('');
  const [chipSelected, setChipSelected] = useState<'a' | 'b' | 'c'>('a');
  const [stepperValue, setStepperValue] = useState(20);
  const [optionCardSelected, setOptionCardSelected] = useState<string[]>(['OILY']);
  const [calendarValue, setCalendarValue] = useState<string | null>(null);
  const [dateFieldValue, setDateFieldValue] = useState<string | null>(null);
  const [wheelAge, setWheelAge] = useState(20);
  const [wheelCycle, setWheelCycle] = useState(28);

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

      <Section title="Input">
        <Input
          label="이름"
          placeholder="이름을 입력해주세요"
          value={nameInput}
          onChangeText={setNameInput}
        />
        <Text style={styles.hint}>에러 상태 (COMMON_VALIDATION_FAILED류 인라인 표시)</Text>
        <Input label="이름" value="" error="이름은 필수입니다." />
      </Section>

      <Section title="Chip (단일/다중 선택은 사용처가 결정)">
        <Row>
          <Chip label="지성" selected={chipSelected === 'a'} onPress={() => setChipSelected('a')} />
          <Chip label="건성" selected={chipSelected === 'b'} onPress={() => setChipSelected('b')} />
          <Chip label="민감성" selected={chipSelected === 'c'} onPress={() => setChipSelected('c')} />
        </Row>
      </Section>

      <Section title="Stepper">
        <Stepper value={stepperValue} onChange={setStepperValue} min={10} max={100} />
      </Section>

      <Section title="InlineErrorBanner">
        <Text style={styles.hint}>
          ErrorState와 달리 화면을 덮지 않습니다 — 온보딩 저장 실패처럼 입력값을 지키면서 재시도 유도할 때
        </Text>
        <InlineErrorBanner message="저장에 실패했어요. 다시 시도해주세요." onRetry={() => {}} />
      </Section>

      <Section title="OptionCard (설명 문구가 있는 선택 카드)">
        <Text style={styles.hint}>
          S-02 피부 타입처럼 &ldquo;모르겠음&rdquo;이 나머지와 배타인 다중 선택 예시
        </Text>
        {[
          { value: 'OILY', title: '지성', description: '유분이 많고 쉽게 번들거려요' },
          { value: 'DRY', title: '건성', description: '당기고 각질이 잘 생겨요' },
          { value: 'UNKNOWN', title: '모르겠음', description: '다른 항목과 함께 선택할 수 없어요' },
        ].map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={optionCardSelected.includes(option.value)}
            onPress={() =>
              setOptionCardSelected((prev) => {
                if (option.value === 'UNKNOWN') {
                  return prev.includes('UNKNOWN') ? [] : ['UNKNOWN'];
                }
                const withoutUnknown = prev.filter((v) => v !== 'UNKNOWN');
                return withoutUnknown.includes(option.value)
                  ? withoutUnknown.filter((v) => v !== option.value)
                  : [...withoutUnknown, option.value];
              })
            }
          />
        ))}
      </Section>

      <Section title="Calendar (오늘 이후 선택 불가 예시)">
        <Calendar
          value={calendarValue}
          onSelect={setCalendarValue}
          maxDate={getTodayDateString()}
        />
        <Text style={styles.hint}>선택값: {calendarValue ?? '(없음)'}</Text>
      </Section>

      <Section title="DateField (탭하면 Calendar가 모달로 뜸)">
        <DateField
          label="최근 생리 시작일 (선택)"
          value={dateFieldValue}
          onChange={setDateFieldValue}
          maxDate={getTodayDateString()}
        />
      </Section>

      <Section title="WheelPicker (스크롤 선택, S-01 나이 — 세로)">
        <WheelPicker value={wheelAge} onChange={setWheelAge} min={10} max={100} formatLabel={(v) => `${v}세`} />
      </Section>

      <Section title="WheelPicker (S-04 평균 주기 — 가로)">
        <WheelPicker
          orientation="horizontal"
          value={wheelCycle}
          onChange={setWheelCycle}
          min={20}
          max={45}
          formatLabel={(v) => `${v}일`}
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
          score/delta 방향은 백엔드 정규화 확정 대기 중 — 지금은 &ldquo;높을수록 좋음&rdquo; 가정
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