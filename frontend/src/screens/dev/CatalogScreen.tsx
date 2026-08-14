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
import { ProductSearchBar } from '@/components/domain/ProductSearchBar';
import { RoutineQuickRecordCard } from '@/components/domain/RoutineQuickRecordCard';
import { SkinRecordSuggestionCard } from '@/components/domain/SkinRecordSuggestionCard';
import { CategoryFilterBar } from '@/components/domain/CategoryFilterBar';
import { MetricScoreList } from '@/components/domain/MetricScoreList';
import { EnvironmentCard } from '@/components/domain/EnvironmentCard';
import { EnvironmentTipCard } from '@/components/domain/EnvironmentTipCard';
import { RoutineRecommendationList } from '@/components/domain/RoutineRecommendationList';
import { RecordDot } from '@/components/domain/RecordDot';
import { WeeklyRecordStrip } from '@/components/domain/WeeklyRecordStrip';
import { TodayReportCard } from '@/components/domain/TodayReportCard';
import { RecordSlotCard } from '@/components/domain/RecordSlotCard';
import { RecordCalendar } from '@/components/domain/RecordCalendar';
import { FaceGuideOverlay } from '@/components/domain/FaceGuideOverlay';
import { InsightCard } from '@/components/domain/InsightCard';
import { EmptyState } from '@/components/state/EmptyState';
import { ErrorState } from '@/components/state/ErrorState';
import { LoadingState } from '@/components/state/LoadingState';
import { PermissionDenied } from '@/components/state/PermissionDenied';
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { Popup } from '@/components/base/Popup';
import { Toast } from '@/components/base/Toast';
import { TrendGraph } from '@/components/chart/TrendGraph';
import { RadarChart, RadarChartItem } from '@/components/chart/RadarChart';
import { ICONS } from '@/components/icons';
import { getTodayDateString } from '@/lib/date';
import { color, navIcon, space } from '@/theme/tokens';
import type { GraphPoint } from '@/types/report';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/types/product';
import { weightFamily } from '@/theme/typography';
import { adjustFontSize } from '@/theme/typography';

/**
 * 개발용 컴포넌트 카탈로그.
 * Phase 2 전체(9종) 반영 완료:
 * 1차분 — Button / Card / Tag / ProgressBar
 * 2차분 — SegmentToggle / ProductCard / MetricScoreList / EmptyState / ErrorState / LoadingState / PermissionDenied
 * Phase 3 S-01 추가분 — Input / Chip / Stepper / InlineErrorBanner
 * Phase 5 S-16 추가분 — FaceGuideOverlay
 * Phase 6 추가분 — TrendGraph / RadarChart(실제 화면 미배치, 카탈로그 전용) / Popup / InsightCard
 * Phase 7-A 추가분 — ProductSearchBar / RoutineQuickRecordCard / ProductCard badgeLabel / Toast
 * Phase 7-B 추가분 — SkinRecordSuggestionCard (S-13/S-14는 카메라·저장 흐름이라 카탈로그
 * 데모 대상에서 제외 — FaceCaptureScreen과 같은 이유)
 * Phase 7-B 조정 — ProductCard selected(체크 표시), RoutineQuickRecordCard 펼침+순서변경
 * ·삭제(데모 전용, 미영속)
 * Phase 9 Checkpoint A 추가분 — 아이콘 25종 전시 (컴포넌트 자체는 components/icons/,
 * 여기선 ICONS 레지스트리로 순회만 함)
 */

// Phase 6 데모용 표본 데이터 생성 함수 — 실제 화면 코드가 아니라 카탈로그 전용입니다.
function buildDemoGraphPoints(count: number): GraphPoint[] {
  const points: GraphPoint[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const score = i % 3 === 0 ? null : 60 + Math.round(Math.sin(i) * 20);
    points.push({ date, score });
  }
  return points;
}

const RADAR_POOL: RadarChartItem[] = [
  { key: 'trouble', label: '트러블', score: 72 },
  { key: 'redness', label: '홍조', score: 58 },
  { key: 'pores', label: '모공', score: 80 },
  { key: 'pigmentation', label: '색소침착', score: 64 },
  { key: 'moisture', label: '수분', score: 45 },
  { key: 'oil', label: '유분', score: 70 },
];
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
  const [recordCalYear, setRecordCalYear] = useState(2026);
  const [recordCalMonth, setRecordCalMonth] = useState(7); // 0-indexed, 8월
  const [trendVariant, setTrendVariant] = useState<'bar' | 'line'>('line');
  const [trendPointCount, setTrendPointCount] = useState<0 | 1 | 7 | 30>(7);
  const [radarCount, setRadarCount] = useState<3 | 4 | 6>(4);
  const [popupVisible, setPopupVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

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
          <Chip
            label="민감성"
            selected={chipSelected === 'c'}
            onPress={() => setChipSelected('c')}
          />
        </Row>
      </Section>

      <Section title="Stepper">
        <Stepper value={stepperValue} onChange={setStepperValue} min={10} max={100} />
      </Section>

      <Section title="InlineErrorBanner">
        <Text style={styles.hint}>
          ErrorState와 달리 화면을 덮지 않습니다 — 온보딩 저장 실패처럼 입력값을 지키면서 재시도
          유도할 때
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
        <WheelPicker
          value={wheelAge}
          onChange={setWheelAge}
          min={10}
          max={100}
          formatLabel={(v) => `${v}세`}
        />
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
        <ProductCard brand="라운드랩" name="1025 독도 토너" category="토너" badgeLabel="저장됨" onPress={() => {}} />
        <ProductCard brand="조선미녀" name="맑은쌀 선크림" category="선크림" selected onPress={() => {}} />
        <ProductCard brand="닥터지" name="선베이스" category="선크림" selected={false} onPress={() => {}} />
        <ProductCard
          brand="라로슈포제"
          name="시카플라스트"
          category="크림"
          onPress={() => {}}
          onViewIngredients={() => {}}
        />
      </Section>

      <Section title="ProductSearchBar (Phase 7)">
        <ProductSearchBar value="" onChangeText={() => {}} onScanPress={() => {}} />
        <ProductSearchBar value="토너" onChangeText={() => {}} onScanPress={() => {}} style={{ marginTop: space[2] }} />
      </Section>

      <Section title="RoutineQuickRecordCard (Phase 7 — 탭하면 펼쳐짐)">
        <RoutineQuickRecordCard
          routineId={1}
          name="모닝루틴"
          timeSlot="MORNING"
          productCount={3}
          productSummary="토너 · 세럼 · 선크림"
          onQuickRecord={() => {}}
          products={[
            { productId: 11, name: '라운드랩 자작나무 수분 토너' },
            { productId: 15, name: '이니스프리 어성초 세럼' },
            { productId: 21, name: '닥터지 선베이스' },
          ]}
        />
      </Section>

      <Section title="SkinRecordSuggestionCard (Phase 7-B)">
        <SkinRecordSuggestionCard onPress={() => {}} />
      </Section>

      <Section title="CategoryFilterBar (Phase 7 — 초기화는 고정, 나머지는 옆으로 스크롤)">
        <CategoryFilterBar
          categories={[...PRODUCT_CATEGORIES]}
          selected={null}
          onSelect={() => {}}
          getLabel={(c) => PRODUCT_CATEGORY_LABELS[c] ?? c}
        />
      </Section>

      <Section title="MetricScoreList">
        <Text style={styles.hint}>
          score/delta 방향은 백엔드 정규화 확정 대기 중 — 지금은 &ldquo;높을수록 좋음&rdquo; 가정
        </Text>
        <MetricScoreList
          items={[
            { key: 'trouble', label: '트러블', score: 72, delta: 5 },
            { key: 'redness', label: '홍조', score: 58, delta: -3 },
            { key: 'pores', label: '모공', score: 80, delta: null },
            { key: 'pigmentation', label: '색소침착', score: 64, delta: 0 },
          ]}
        />
      </Section>

      <Section title="EnvironmentCard">
        <EnvironmentCard
          environment={{
            location: '서울 강남구',
            weather: 'SUNNY',
            temperature: 28,
            uvIndex: 7,
            uvGrade: 'HIGH',
            humidity: 55,
            humidityGrade: 'NORMAL',
          }}
        />
        <Text style={styles.hint}>failedSections에 environment가 포함된 부분 실패 상태:</Text>
        <EnvironmentCard environment={null} hasFailed />
      </Section>

      <Section title="EnvironmentTipCard (Checkpoint 9-D)">
        <Text style={styles.hint}>자외선 높음 → 자외선 팁이 우선 표시됩니다.</Text>
        <EnvironmentTipCard
          environment={{
            location: '서울 강남구',
            weather: 'SUNNY',
            temperature: 28,
            uvIndex: 7,
            uvGrade: 'HIGH',
            humidity: 55,
            humidityGrade: 'NORMAL',
          }}
        />
        <Text style={[styles.hint, styles.progressSpacing]}>
          자외선 평범 + 습도 낮음 → 건조 팁으로 대체됩니다.
        </Text>
        <EnvironmentTipCard
          environment={{
            location: '서울 강남구',
            weather: 'SUNNY',
            temperature: 22,
            uvIndex: 3,
            uvGrade: 'MODERATE',
            humidity: 25,
            humidityGrade: 'LOW',
          }}
        />
        <Text style={[styles.hint, styles.progressSpacing]}>
          둘 다 평범 → 카드 자체가 렌더링되지 않습니다(아래 빈 공간이 정상):
        </Text>
        <EnvironmentTipCard
          environment={{
            location: '서울 강남구',
            weather: 'CLOUDY',
            temperature: 20,
            uvIndex: 2,
            uvGrade: 'LOW',
            humidity: 50,
            humidityGrade: 'NORMAL',
          }}
        />
      </Section>

      <Section title="RoutineRecommendationList">
        <RoutineRecommendationList
          timeSlot="MORNING"
          items={[
            { rank: 1, productId: 21, name: '자외선 차단제', reason: '자외선 지수 높음' },
            { rank: 2, productId: 15, name: '히알루론산 세럼', reason: '실내 건조 주의' },
          ]}
        />
        <Text style={styles.hint}>등록된 제품이 없는 신규 사용자(빈 상태):</Text>
        <RoutineRecommendationList timeSlot="MORNING" items={[]} onEmptyAction={() => {}} />
      </Section>

      <Section title="RecordDot">
        <Text style={styles.hint}>
          채움(FULL) · 외곽선(PARTIAL) · 흐림(NONE) — 색이 아니라 채움 방식으로 구분
        </Text>
        <View style={styles.row}>
          <RecordDot status="FULL" />
          <RecordDot status="PARTIAL" />
          <RecordDot status="NONE" />
        </View>
      </Section>

      <Section title="WeeklyRecordStrip">
        <Card padding={4}>
          <WeeklyRecordStrip
            days={[
              { date: '2026-08-03', morning: 'FULL', night: 'FULL' },
              { date: '2026-08-04', morning: 'FULL', night: 'PARTIAL' },
              { date: '2026-08-05', morning: 'PARTIAL', night: 'NONE' },
              { date: '2026-08-06', morning: 'FULL', night: 'FULL' },
              { date: '2026-08-07', morning: 'FULL', night: 'NONE' },
            ]}
          />
        </Card>
      </Section>

      <Section title="TodayReportCard">
        <TodayReportCard
          report={{
            skinRecordId: 31,
            totalScore: 78,
            previousScore: 72,
            change: 6,
            comparedTo: '2026-08-06 MORNING',
            summary: '어제보다 좋아졌어요',
          }}
          onPress={() => {}}
        />
        <Text style={styles.hint}>비교 대상 없는 첫 기록:</Text>
        <TodayReportCard
          report={{
            skinRecordId: 31,
            totalScore: 78,
            previousScore: null,
            change: null,
            comparedTo: null,
            summary: '오늘의 피부 상태예요',
          }}
          onPress={() => {}}
        />
      </Section>

      <Section title="RecordSlotCard">
        <RecordSlotCard
          label="제품 기록"
          completed
          summary="라운드랩 토너 외 2개"
          onPress={() => {}}
        />
        <RecordSlotCard label="피부 기록" completed={false} summary={null} onPress={() => {}} />
      </Section>

      <Section title="RecordCalendar">
        <Card padding={4}>
          <RecordCalendar
            year={recordCalYear}
            month={recordCalMonth}
            days={[
              { date: '2026-08-01', morning: 'FULL', night: 'PARTIAL', today: false },
              { date: '2026-08-02', morning: 'NONE', night: 'NONE', today: false },
              { date: '2026-08-03', morning: 'FULL', night: 'FULL', today: false },
              { date: '2026-08-07', morning: 'FULL', night: 'NONE', today: true },
            ]}
            onPrevMonth={() => {
              if (recordCalMonth === 0) {
                setRecordCalYear((y) => y - 1);
                setRecordCalMonth(11);
              } else {
                setRecordCalMonth((m) => m - 1);
              }
            }}
            onNextMonth={() => {
              if (recordCalMonth === 11) {
                setRecordCalYear((y) => y + 1);
                setRecordCalMonth(0);
              } else {
                setRecordCalMonth((m) => m + 1);
              }
            }}
          />
        </Card>
      </Section>

      <Section title="FaceGuideOverlay">
        <Text style={styles.hint}>
          S-16 카메라 라이브 뷰 위에 겹쳐 그리는 순수 안내선입니다 — 얼굴 인식 로직은 없습니다.
        </Text>
        <View style={styles.faceGuidePreview}>
          <FaceGuideOverlay />
        </View>
      </Section>

      <Section title="EmptyState">
        <Card padding={4}>
          <EmptyState
            icon="calendar"
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

      <Section title="TrendGraph (S-19/S-20 둘 다 선 사용 — 막대는 예비 옵션)">
        <Text style={styles.hint}>
          완료 기준 검증용 — 아래에서 데이터 0/1/7/30일차를 전부 눌러 화면이 죽지 않는지
          확인하세요. line 모드에서 1일차는 점 하나로만 표시됩니다(선을 그릴 수 없음).
        </Text>
        <SegmentToggle
          options={[
            { value: 'bar', label: '막대' },
            { value: 'line', label: '선 (실사용)' },
          ]}
          value={trendVariant}
          onChange={setTrendVariant}
        />
        <Row>
          {([0, 1, 7, 30] as const).map((count) => (
            <Chip
              key={count}
              label={`${count}일`}
              selected={trendPointCount === count}
              onPress={() => setTrendPointCount(count)}
            />
          ))}
        </Row>
        <Card padding={4}>
          <TrendGraph points={buildDemoGraphPoints(trendPointCount)} variant={trendVariant} />
        </Card>
      </Section>

      <Section title="RadarChart (실제 화면 미배치 — 카탈로그 전용)">
        <Text style={styles.hint}>
          REPORT-01/02 API에는 여러 지표를 한 시점에 동시 비교하는 데이터가 없어서(관리자
          확인, 2026-08-10) S-19/S-20에는 배치하지 않았습니다. n각형 범용 동작만 여기서
          검증합니다 — 지표 3→4→6개로 바꿔도 라벨이 도형을 파고들지 않아야 합니다.
        </Text>
        <Row>
          {([3, 4, 6] as const).map((count) => (
            <Chip
              key={count}
              label={`${count}개`}
              selected={radarCount === count}
              onPress={() => setRadarCount(count)}
            />
          ))}
        </Row>
        <View style={styles.radarPreview}>
          <RadarChart items={RADAR_POOL.slice(0, radarCount)} />
        </View>
      </Section>

      <Section title="Popup">
        <Text style={styles.hint}>
          S-19 데이터부족(REPORT_DATA_INSUFFICIENT) 안내에 처음 쓰는 base 컴포넌트입니다.
          문구는 기획 확정 전 placeholder입니다.
        </Text>
        <Button label="데이터부족 팝업 열기" variant="secondary" onPress={() => setPopupVisible(true)} />
        <Popup
          visible={popupVisible}
          title="아직 리포트를 만들 수 없어요"
          description="피부 기록이 더 쌓이면 리포트를 확인할 수 있어요. (placeholder 문구 — 기획 확정 대기)"
          primaryLabel="기록하러 가기"
          onPrimaryPress={() => setPopupVisible(false)}
          secondaryLabel="닫기"
          onSecondaryPress={() => setPopupVisible(false)}
          onRequestClose={() => setPopupVisible(false)}
        />
      </Section>

      <Section title="Toast (Phase 7 — 확인 없이 자동으로 사라짐)">
        <Text style={styles.hint}>
          Popup과 달리 화면을 막지 않고, 몇 초 후 스스로 닫힙니다. &ldquo;정보 전달&rdquo;용 — 결정이
          필요한 안내는 계속 Popup을 씁니다.
        </Text>
        <Button label="기록 완료 토스트 열기" variant="secondary" onPress={() => setToastVisible(true)} />
        <Toast
          visible={toastVisible}
          message="기록 완료! 라운드랩 자작나무 수분 토너 외 2개"
          icon="check"
          actionLabel="피부도 기록하기"
          onActionPress={() => {}}
          onDismiss={() => setToastVisible(false)}
        />
      </Section>

      <Section title="InsightCard">
        <InsightCard
          insight={{
            insightId: 101,
            type: 'INGREDIENT',
            title: '레티놀',
            description: '레티놀 세럼 사용 후 2일 뒤 트러블이 반복적으로 증가해요',
            confidence: 'OBSERVED',
          }}
          onPress={() => {}}
        />
        <InsightCard
          insight={{
            insightId: 103,
            type: 'ENVIRONMENT',
            title: '자외선',
            description: '자외선 높은 날 다음 날 홍조 수치가 높아지는 경향을 확인하는 중이에요',
            confidence: 'OBSERVING',
          }}
          onPress={() => {}}
        />
      </Section>

      <Section title="아이콘 (Phase 9 Checkpoint A~B — 42종)">
        <Text style={styles.hint}>
          24×24 SVG, color prop 하나로 색이 바뀝니다. barcode/celebrate/cloud-error/
          product-bottle/wifi-off 5개와 2026-08-12 추가분 중 6개(trash/help-circle/
          image-placeholder/info/location-pin/person-circle)는 원본이 고정 검정이었던 걸
          currentColor로 정규화했습니다.
        </Text>
        <Row>
          {Object.entries(ICONS).map(([name, IconComponent]) => (
            <View key={name} style={styles.iconSwatch}>
              <IconComponent color={color.ink600} size={24} />
              <Text style={styles.iconLabel}>{name}</Text>
            </View>
          ))}
        </Row>

        <Text style={[styles.hint, styles.progressSpacing]}>
          탭바 실제 색상(활성 / 비활성) — MainTabNavigator와 동일한 navIcon 토큰입니다.
        </Text>
        <Row>
          <View style={styles.iconSwatch}>
            <ICONS.navHome color={navIcon.active} size={28} />
            <Text style={styles.iconLabel}>active</Text>
          </View>
          <View style={styles.iconSwatch}>
            <ICONS.navHome color={navIcon.inactive} size={28} />
            <Text style={styles.iconLabel}>inactive</Text>
          </View>
        </Row>
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
    fontSize: adjustFontSize(16),
    ...weightFamily('bold'),
    color: color.ink900,
  },
  hint: {
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
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
  faceGuidePreview: {
    alignItems: 'center',
    backgroundColor: color.ink900,
    borderRadius: 16,
    paddingVertical: space[5],
  },
  radarPreview: {
    alignItems: 'center',
    paddingVertical: space[3],
  },
  iconSwatch: {
    alignItems: 'center',
    gap: space[1],
    width: 64,
  },
  iconLabel: {
    fontSize: adjustFontSize(10),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
  },
});