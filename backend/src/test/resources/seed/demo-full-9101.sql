-- ============================================================================
-- 데모 계정 전체 목업 데이터 (userId 9101)
--
-- 홈 · 기록 캘린더 · 리포트 추이 · 성분 프로파일 · 시차 상관관계 인사이트까지
-- 한 번에 채운다. 시연용으로 신규 계정을 만들어 심는 스크립트이며 로컬 전용이다.
--
-- 실행 (--default-character-set=utf8mb4 를 빼면 한글이 깨져 들어간다)
--   docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
--     -uildangbaek -pildangbaek1234 ildangbaek \
--     < backend/src/test/resources/seed/demo-full-9101.sql
--
-- 프론트 접속 토큰 (ADR 0017 임시 인증)
--   Authorization: Bearer mock-access-9101-demo
--
-- 여러 번 돌려도 된다. 맨 앞에서 9101 사용자의 기존 데이터를 전부 지우고 다시 심는다.
--
-- ----------------------------------------------------------------------------
-- ⚠️ 점수 방향 (읽고 시작할 것)
-- ----------------------------------------------------------------------------
-- 이 스크립트는 팀 확정 기준인 **"점수가 높을수록 좋다"**로 값을 심는다.
--   · 트러블 72 → 58 = 트러블이 심해짐(나빠짐)
--   · 색소침착 58 → 70 = 색소침착이 옅어짐(좋아짐)
--
-- 그런데 백엔드 분석기는 아직 반대(값 증가 = 악화, ADR 0002 시절 가정)를 쓴다.
--   backend/.../domain/analysis/lag/PatternDirection.java  — 주석
--   backend/.../domain/analysis/lag/LagCorrelationAnalyzer.java — collectPattern()
--       int worsened = (int) deltas.stream().filter(delta -> delta > 0).count();
--       int improved = (int) deltas.stream().filter(delta -> delta < 0).count();
--
-- 이 두 줄을 서로 바꾸면(양수 delta = IMPROVED) 전체가 정합해진다. 한 곳만 고치면
-- LagInsightWriter 문구(증가/감소)와 IngredientProfileWriter 분류(CAUTION/SUITABLE)가
-- 함께 따라온다. 이미 보고된 같은 계열 버그: ai-server insight_tip.py 시스템 프롬프트,
-- CheckHomeService.java 제품 분류 조건.
--
-- 고치기 전까지의 동작:
--   · 이 스크립트가 심어두는 ingredient_profiles / analysis_insights 는 올바른 방향이다.
--   · 하지만 데모 중 피부 기록을 새로 저장하면 LagAnalysisProfileUpdater 가 자동으로
--     재분석해서 두 표를 덮어쓰고, 그때 레티놀/나이아신아마이드의 판정이 뒤집힌다.
--   → 시연 전에 위 두 줄을 반드시 먼저 고칠 것.
--
-- ----------------------------------------------------------------------------
-- 심는 패턴 (무작위 아님 — 분석기가 잡아내는지 검증 가능해야 한다, ADR 0003)
-- ----------------------------------------------------------------------------
--   레티놀            : 나이트 21·15·8·2일 전 사용 → 2일 뒤(19·13·6일 전) 트러블 72→58
--                       → 관측 3쌍, 일치율 100%, 평균 -14점 → 확정 · CAUTION
--   나이아신아마이드  : 모닝 22·16·10·4일 전 사용 → 3일 뒤(19·13·7·1일 전) 색소침착 58→70
--                       → 관측 4쌍, 일치율 100%, 평균 +12점 → 확정 · SUITABLE
--   그 밖의 성분      : 매일 노출(루틴 고정) → 기준선과 이후가 같아 패턴 없음 → INSUFFICIENT
--
-- 두 성분을 **서로 다른 시간대**에 배치한 것이 핵심이다. 분석기는 같은 슬롯끼리만
-- 비교하므로(ADR 0014) 레티놀(나이트)과 나이아신아마이드(모닝)의 관측이 서로 섞이지 않는다.
-- 같은 슬롯에 두면 한쪽의 스파이크일이 다른 쪽의 시차와 우연히 맞아떨어져 엉뚱한 성분에
-- 패턴이 잡힌다. 사용일을 바꿀 때는 이 조건을 다시 확인해야 한다.
--
-- 홍조·모공은 하루 0.25 / 0.20점씩 서서히 좋아지는 추세만 준다(리포트 그래프용).
-- 시차 7일에서도 누적 변화가 1.75점이라 확정 임계값(3점, MIN_MEANINGFUL_DELTA)을 넘지
-- 않는다 — 매일 쓰는 성분에 가짜 패턴이 잡히지 않게 하려는 의도다. 기울기를 키울 때는
-- 0.42(=3/7) 미만인지 확인할 것.
--
-- ----------------------------------------------------------------------------
-- 기록 분포 (기록 캘린더에 FULL·PARTIAL·NONE이 골고루 보이도록)
-- ----------------------------------------------------------------------------
--   기간            : 어제(1일 전)부터 27일 전까지 27일
--   오늘(0일 전)    : 일부러 비워 둔다. 시연 중 직접 기록하는 화면을 보여줄 수 있다.
--   나이트          : 제품 27일 전부 / 피부 25일 (23·25일 전 제외 → PARTIAL)
--   모닝            : 제품 23일 (5·12·20·26일 전 제외 → NONE)
--                     피부 21일 (위 + 9·17일 전 제외 → PARTIAL)
-- ============================================================================

SET @uid = 9101;
SET @today = CURDATE();
SET @nickname = '김보연';
SET @region = 'Seoul';   -- LocationController 하드코딩 목록과 같은 표기여야 current=true가 뜬다

-- ============================================================================
-- 0. 기존 데이터 정리 (자식 → 부모 순서. FK 때문에 순서를 바꾸면 실패한다)
-- ============================================================================
DELETE FROM analysis_insights WHERE user_id = @uid;
DELETE FROM ingredient_profiles WHERE user_id = @uid;

DELETE sm FROM skin_metrics sm
    JOIN skin_records sr ON sr.id = sm.skin_record_id WHERE sr.user_id = @uid;
DELETE FROM skin_records WHERE user_id = @uid;

DELETE pri FROM product_record_items pri
    JOIN product_records pr ON pr.id = pri.product_record_id WHERE pr.user_id = @uid;
DELETE FROM product_records WHERE user_id = @uid;

DELETE rp FROM routine_products rp
    JOIN routines r ON r.id = rp.routine_id WHERE r.user_id = @uid;
DELETE FROM routines WHERE user_id = @uid;

DELETE FROM user_products WHERE user_id = @uid;
DELETE FROM daily_environments WHERE user_id = @uid;
DELETE FROM user_skin_types WHERE user_id = @uid;
DELETE FROM notification_settings WHERE user_id = @uid;
DELETE FROM user_profiles WHERE user_id = @uid;

-- ============================================================================
-- 1. 사용자
-- ============================================================================
INSERT INTO users (id, created_at, updated_at, account_status, email, onboarding_completed,
                   provider, provider_user_id)
VALUES (@uid, DATE_SUB(NOW(6), INTERVAL 40 DAY), NOW(6), 'ACTIVE', 'demo@skinteller.app', b'1',
        'EMAIL', 'demo-9101')
ON DUPLICATE KEY UPDATE updated_at = NOW(6), account_status = 'ACTIVE', onboarding_completed = b'1';

-- 생리 정보를 채우면 F-ANALYSIS-03 호르몬 보정이 걸려 확정 임계값이 0.67 → 0.8로 올라간다.
-- 이 스크립트의 패턴은 일치율 100%라 그래도 확정되지만, 인사이트 신뢰도가 20% 깎여
-- 시연 화면의 숫자가 덜 깔끔해진다. 그래서 menstrual_status는 NONE으로 둔다.
INSERT INTO user_profiles (user_id, created_at, updated_at, nickname, birth_year, gender,
                           sleep_time, wake_time, menstrual_status, last_menstrual_start_date,
                           menstrual_cycle_days, oral_contraceptive, progesterone_injection,
                           hormone_replacement_therapy, region_name)
VALUES (@uid, DATE_SUB(NOW(6), INTERVAL 40 DAY), NOW(6), @nickname, 1999, 'FEMALE',
        '00:30:00', '07:30:00', 'NONE', NULL, NULL, b'0', b'0', b'0', @region);

-- 피부 타입 마스터. code가 유니크라 이미 있으면 그대로 둔다.
INSERT INTO skin_types (code, name, description)
VALUES ('OILY', '지성', '피지 분비가 많고 번들거림이 쉽게 생기는 피부'),
       ('DRY', '건성', '수분과 유분이 부족해 당김이 잦은 피부'),
       ('SENSITIVE', '민감성', '자극에 쉽게 붉어지거나 따가움을 느끼는 피부'),
       ('UNKNOWN', '모르겠어요', '피부 타입을 아직 정하지 않은 상태')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 건성 + 민감성. 민감성은 악화 확정 기준을 3점 → 2점으로 완화하지만(ADR 0010),
-- 이 스크립트의 평균 변화량은 12~14점이라 어느 쪽이든 결과가 같다.
INSERT INTO user_skin_types (user_id, skin_type_id)
SELECT @uid, st.id FROM skin_types st WHERE st.code IN ('DRY', 'SENSITIVE');

INSERT INTO notification_settings (user_id, morning_enabled, night_enabled, morning_time,
                                   night_time, push_token)
VALUES (@uid, b'1', b'1', '08:00:00', '22:00:00', NULL);

-- ============================================================================
-- 2. 성분 · 제품 마스터
--
-- id를 9101~ 대역으로 못박는다. 아래 product_ingredients / product_record_items가
-- 이 값을 직접 참조해야 하기 때문이다. SampleProductDataInitializer가 넣는 행과는
-- 대역이 겹치지 않는다(그쪽은 auto_increment 1번대). 대신 이 INSERT 이후
-- products/ingredients의 auto_increment가 9101 위로 올라간다 — 로컬 전용이라 무해하다.
-- ============================================================================
INSERT INTO ingredients (id, korean_name, english_name, inci_name, function_category)
VALUES (9101, '레티놀', 'Retinol', 'Retinol', '주름개선'),
       (9102, '나이아신아마이드', 'Niacinamide', 'Niacinamide', '미백'),
       (9103, '판테놀', 'Panthenol', 'Panthenol', '진정'),
       (9104, '히알루론산', 'Hyaluronic Acid', 'Sodium Hyaluronate', '보습'),
       (9105, '병풀추출물', 'Centella Asiatica Extract', 'Centella Asiatica Extract', '진정'),
       (9106, '세라마이드엔피', 'Ceramide NP', 'Ceramide NP', '장벽강화'),
       (9107, '징크옥사이드', 'Zinc Oxide', 'Zinc Oxide', '자외선차단'),
       (9108, '글리세린', 'Glycerin', 'Glycerin', '보습'),
       (9109, '알란토인', 'Allantoin', 'Allantoin', '진정'),
       (9110, '토코페롤', 'Tocopherol', 'Tocopherol', '항산화')
ON DUPLICATE KEY UPDATE korean_name = VALUES(korean_name);

INSERT INTO products (id, created_at, updated_at, active, brand_name, product_name, category,
                      barcode, image_url, data_source)
VALUES (9101, NOW(6), NOW(6), b'1', '라운드랩', '1025 독도 토너', 'TONER', '8800000009101', NULL, 'SAMPLE'),
       (9102, NOW(6), NOW(6), b'1', '토리든', '다이브인 나이아신아마이드 세럼', 'SERUM', '8800000009102', NULL, 'SAMPLE'),
       (9103, NOW(6), NOW(6), b'1', '에스트라', '아토베리어365 크림', 'CREAM', '8800000009103', NULL, 'SAMPLE'),
       (9104, NOW(6), NOW(6), b'1', '닥터지', '그린 마일드 업 선 플러스', 'SUNCREAM', '8800000009104', NULL, 'SAMPLE'),
       (9105, NOW(6), NOW(6), b'1', '라로슈포제', '에빠끌라 클렌징 젤', 'CLEANSING', '8800000009105', NULL, 'SAMPLE'),
       (9106, NOW(6), NOW(6), b'1', '디오디너리', '레티놀 0.5% 인 스쿠알란', 'SERUM', '8800000009106', NULL, 'SAMPLE'),
       (9107, NOW(6), NOW(6), b'1', '마녀공장', '비피다 바이옴 앰플', 'AMPOULE', '8800000009107', NULL, 'SAMPLE')
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name), active = b'1';

-- id를 지정하지 않는다. 순수 대리키라 값에 의미가 없고, (product_id, ingredient_id)
-- 유니크 제약이 중복 삽입을 막아준다. (기존 seed와 같은 방침)
--
-- ⚠️ 레티놀(9101)은 9106에만, 나이아신아마이드(9102)는 9102에만 넣는다. 다른 제품에도
-- 넣으면 그 제품의 매일 사용분 때문에 노출이 매일로 번져 패턴이 희석된다.
INSERT INTO product_ingredients (product_id, ingredient_id, display_order, key_ingredient)
VALUES -- 9101 토너
       (9101, 9104, 1, b'1'), (9101, 9103, 2, b'0'), (9101, 9108, 3, b'0'),
       -- 9102 나이아신아마이드 세럼 (모닝 전용 · 패턴 성분)
       (9102, 9102, 1, b'1'), (9102, 9108, 2, b'0'),
       -- 9103 크림
       (9103, 9106, 1, b'1'), (9103, 9108, 2, b'0'), (9103, 9103, 3, b'0'),
       -- 9104 선크림
       (9104, 9107, 1, b'1'), (9104, 9105, 2, b'0'), (9104, 9110, 3, b'0'),
       -- 9105 클렌징
       (9105, 9108, 1, b'0'), (9105, 9109, 2, b'0'),
       -- 9106 레티놀 세럼 (나이트 전용 · 패턴 성분)
       (9106, 9101, 1, b'1'), (9106, 9108, 2, b'0'),
       -- 9107 앰플
       (9107, 9103, 1, b'1'), (9107, 9109, 2, b'0')
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order),
                        key_ingredient = VALUES(key_ingredient);

-- ============================================================================
-- 3. 저장된 제품 · 루틴
-- ============================================================================
INSERT INTO user_products (user_id, product_id, usage_status, first_saved_at, last_used_at)
SELECT @uid, p.id, 'USING',
       TIMESTAMP(DATE_SUB(@today, INTERVAL 30 DAY), '20:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '22:00:00')
FROM products p WHERE p.id BETWEEN 9101 AND 9107;

INSERT INTO routines (user_id, routine_name, time_period, active)
VALUES (@uid, '모닝 루틴', 'MORNING', b'1'),
       (@uid, '나이트 루틴', 'NIGHT', b'1');

SET @morning_routine = (SELECT id FROM routines WHERE user_id = @uid AND time_period = 'MORNING');
SET @night_routine   = (SELECT id FROM routines WHERE user_id = @uid AND time_period = 'NIGHT');

-- 모닝: 토너 → 크림 → 선크림. 나이아신아마이드 세럼(9102)은 루틴에 넣지 않는다 —
-- 격일 사용이라 루틴에 넣으면 "매일 쓰는 제품"으로 읽힌다.
INSERT INTO routine_products (routine_id, user_product_id, sequence_order)
SELECT @morning_routine, up.id, seq.n
FROM (SELECT 9101 AS pid, 1 AS n UNION ALL
      SELECT 9103, 2 UNION ALL
      SELECT 9104, 3) seq
JOIN user_products up ON up.user_id = @uid AND up.product_id = seq.pid;

-- 나이트: 클렌징 → 토너 → 앰플 → 크림. 레티놀 세럼(9106)도 같은 이유로 제외.
INSERT INTO routine_products (routine_id, user_product_id, sequence_order)
SELECT @night_routine, up.id, seq.n
FROM (SELECT 9105 AS pid, 1 AS n UNION ALL
      SELECT 9101, 2 UNION ALL
      SELECT 9107, 3 UNION ALL
      SELECT 9103, 4) seq
JOIN user_products up ON up.user_id = @uid AND up.product_id = seq.pid;

-- ============================================================================
-- 4. 날짜 축
-- ============================================================================
DROP TEMPORARY TABLE IF EXISTS day_seq;
CREATE TEMPORARY TABLE day_seq (d INT PRIMARY KEY);
INSERT INTO day_seq (d)
VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),
       (10),(11),(12),(13),(14),(15),(16),(17),(18),(19),
       (20),(21),(22),(23),(24),(25),(26),(27);

-- ============================================================================
-- 5. 일별 환경 (F-ANALYSIS-02 공변량 · 구매 전 확인 오늘 컨텍스트)
--
-- 자외선은 3→6→3 사이를 하루 1씩만 움직이게 한다. 급변일로 잡히면 확정 임계값이
-- 0.8로 올라가고 인사이트 신뢰도가 20% 깎인다(ADR 0021).
-- ============================================================================
INSERT INTO daily_environments (user_id, record_date, region_name, weather_condition,
                                temperature, humidity, uv_index_current, uv_index_max,
                                data_source, fetched_at)
SELECT @uid,
       DATE_SUB(@today, INTERVAL d DAY),
       @region,
       CASE d % 5 WHEN 0 THEN 'SUNNY' WHEN 1 THEN 'CLOUDY' WHEN 2 THEN 'SUNNY'
                  WHEN 3 THEN 'OVERCAST' ELSE 'RAIN' END,
       ROUND(24.0 + (d % 5), 2),
       ROUND(45.0 + (d % 4) * 5, 2),
       ROUND(CASE d % 7 WHEN 0 THEN 3 WHEN 1 THEN 4 WHEN 2 THEN 5 WHEN 3 THEN 6
                        WHEN 4 THEN 5 WHEN 5 THEN 4 ELSE 3 END, 2),
       ROUND(CASE d % 7 WHEN 0 THEN 4 WHEN 1 THEN 5 WHEN 2 THEN 6 WHEN 3 THEN 7
                        WHEN 4 THEN 6 WHEN 5 THEN 5 ELSE 4 END, 2),
       'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '07:00:00')
FROM day_seq;

-- ============================================================================
-- 6. 제품 기록
-- ============================================================================
-- 6-1. 나이트 (27일 전부)
INSERT INTO product_records (user_id, record_date, time_period, source_type, recorded_at,
                             created_at, updated_at)
SELECT @uid, DATE_SUB(@today, INTERVAL d DAY), 'NIGHT', 'ROUTINE',
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '22:00:00'), NOW(6), NOW(6)
FROM day_seq WHERE d BETWEEN 1 AND 27;

-- 6-2. 모닝 (5·12·20·26일 전 제외 → 캘린더에 NONE 칸이 생긴다)
INSERT INTO product_records (user_id, record_date, time_period, source_type, recorded_at,
                             created_at, updated_at)
SELECT @uid, DATE_SUB(@today, INTERVAL d DAY), 'MORNING', 'ROUTINE',
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '08:10:00'), NOW(6), NOW(6)
FROM day_seq WHERE d BETWEEN 1 AND 27 AND d NOT IN (5, 12, 20, 26);

-- 6-3. 루틴 제품 항목
INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, seq.pid, seq.n, pr.recorded_at
FROM product_records pr
CROSS JOIN (SELECT 9105 AS pid, 1 AS n UNION ALL SELECT 9101, 2 UNION ALL
            SELECT 9107, 3 UNION ALL SELECT 9103, 4) seq
WHERE pr.user_id = @uid AND pr.time_period = 'NIGHT';

INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, seq.pid, seq.n, pr.recorded_at
FROM product_records pr
CROSS JOIN (SELECT 9101 AS pid, 1 AS n UNION ALL SELECT 9103, 2 UNION ALL
            SELECT 9104, 3) seq
WHERE pr.user_id = @uid AND pr.time_period = 'MORNING';

-- 6-4. 패턴 성분 제품 (루틴 밖 추가 사용)
--   레티놀 세럼        : 나이트 21·15·8·2일 전
--   나이아신아마이드   : 모닝 22·16·10·4일 전
INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, 9106, 5, pr.recorded_at
FROM product_records pr
WHERE pr.user_id = @uid AND pr.time_period = 'NIGHT'
  AND DATEDIFF(@today, pr.record_date) IN (21, 15, 8, 2);

INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, 9102, 4, pr.recorded_at
FROM product_records pr
WHERE pr.user_id = @uid AND pr.time_period = 'MORNING'
  AND DATEDIFF(@today, pr.record_date) IN (22, 16, 10, 4);

-- 루틴 그대로가 아닌 날은 source_type을 INDIVIDUAL로 되돌린다.
UPDATE product_records pr
SET pr.source_type = 'INDIVIDUAL'
WHERE pr.user_id = @uid
  AND ((pr.time_period = 'NIGHT'   AND DATEDIFF(@today, pr.record_date) IN (21, 15, 8, 2))
    OR (pr.time_period = 'MORNING' AND DATEDIFF(@today, pr.record_date) IN (22, 16, 10, 4)));

-- ============================================================================
-- 7. 피부 기록
--
-- overall_score는 여기서 넣지 않고 8단계에서 지표 4종 평균으로 갱신한다(ADR 0008).
-- ============================================================================
-- 7-1. 나이트 (23·25일 전 제외 → 그날은 제품만 기록 = PARTIAL)
INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @uid, DATE_SUB(@today, INTERVAL d DAY), 'NIGHT', '/images/demo-night.jpg', 0.00,
       'COMPLETED', 'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '22:20:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '22:20:40')
FROM day_seq WHERE d BETWEEN 1 AND 27 AND d NOT IN (23, 25);

-- 7-2. 모닝 (모닝 제품 미기록일 + 9·17일 전 제외)
INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @uid, DATE_SUB(@today, INTERVAL d DAY), 'MORNING', '/images/demo-morning.jpg', 0.00,
       'COMPLETED', 'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '08:30:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL d DAY), '08:30:40')
FROM day_seq WHERE d BETWEEN 1 AND 27 AND d NOT IN (5, 12, 20, 26, 9, 17);

-- ============================================================================
-- 8. 피부 지표 4종
--
-- 값이 클수록 좋다(파일 상단 주석 참고).
--   TROUBLE       기준 72, 레티놀 시차일(19·13·6일 전 나이트)만 58  → 14점 악화
--   PIGMENTATION  기준 58, 나이아신 시차일(19·13·7·1일 전 모닝)만 70 → 12점 개선
--   REDNESS       60.00 + 0.25/일 개선 추세
--   PORES         58.00 + 0.20/일 개선 추세
-- ============================================================================
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'TROUBLE',
       CASE WHEN sr.time_period = 'NIGHT'
                 AND DATEDIFF(@today, sr.record_date) IN (19, 13, 6)
            THEN 58.00 ELSE 72.00 END
FROM skin_records sr WHERE sr.user_id = @uid;

INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'PIGMENTATION',
       CASE WHEN sr.time_period = 'MORNING'
                 AND DATEDIFF(@today, sr.record_date) IN (19, 13, 7, 1)
            THEN 70.00 ELSE 58.00 END
FROM skin_records sr WHERE sr.user_id = @uid;

INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'REDNESS',
       ROUND(60.00 + 0.25 * (27 - DATEDIFF(@today, sr.record_date)), 2)
FROM skin_records sr WHERE sr.user_id = @uid;

INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'PORES',
       ROUND(58.00 + 0.20 * (27 - DATEDIFF(@today, sr.record_date)), 2)
FROM skin_records sr WHERE sr.user_id = @uid;

-- 종합 점수 = 지표 4종 단순 평균 (ADR 0008)
-- 파생 테이블 안에서 skin_records를 다시 참조하지 않는다. MySQL이 파생 테이블을
-- 병합하면 "갱신 대상 테이블을 FROM에 쓸 수 없다"(1093)로 막힌다.
UPDATE skin_records sr
JOIN (SELECT skin_record_id, ROUND(AVG(metric_value), 2) AS avg_value
      FROM skin_metrics GROUP BY skin_record_id) m ON m.skin_record_id = sr.id
SET sr.overall_score = m.avg_value
WHERE sr.user_id = @uid;

-- ============================================================================
-- 9. 성분 프로파일 (F-ANALYSIS-04 · USER-02 · 구매 전 확인이 읽는 표)
--
-- 노출된 성분 전부를 INSUFFICIENT로 깔고, 패턴이 확정된 두 성분만 덮어쓴다.
-- observation_count는 그 성분을 실제로 쓴 날 수를 기록에서 직접 센다.
-- ============================================================================
INSERT INTO ingredient_profiles (user_id, ingredient_id, reaction_type, profile_score,
                                 confidence_score, observation_count, positive_count,
                                 negative_count, representative_lag_days, reason_summary,
                                 last_analyzed_at)
SELECT @uid, pi.ingredient_id, 'INSUFFICIENT', NULL, NULL,
       COUNT(DISTINCT pr.record_date), 0, 0, NULL, NULL, NOW(6)
FROM product_records pr
JOIN product_record_items pri ON pri.product_record_id = pr.id
JOIN product_ingredients pi ON pi.product_id = pri.product_id
WHERE pr.user_id = @uid
GROUP BY pi.ingredient_id;

UPDATE ingredient_profiles
SET reaction_type = 'CAUTION', profile_score = -14.0000, confidence_score = 100.00,
    positive_count = 0, negative_count = 1, representative_lag_days = 2,
    reason_summary = '레티놀을 쓴 뒤 2일 뒤 트러블 점수가 평균 14점 낮아지는 패턴이 3회 반복됐어요'
WHERE user_id = @uid AND ingredient_id = 9101;

UPDATE ingredient_profiles
SET reaction_type = 'SUITABLE', profile_score = 12.0000, confidence_score = 100.00,
    positive_count = 1, negative_count = 0, representative_lag_days = 3,
    reason_summary = '나이아신아마이드를 쓴 뒤 3일 뒤 색소침착 점수가 평균 12점 높아지는 패턴이 4회 반복됐어요'
WHERE user_id = @uid AND ingredient_id = 9102;

-- ============================================================================
-- 10. 시차 상관관계 인사이트 (REPORT-01 insights)
--
-- LagInsightWriter가 만드는 것과 같은 모양이되, 문구 방향만 "높을수록 좋다"에 맞췄다.
-- ⚠️ 피부 기록을 새로 저장하면 이 두 행은 자동 재분석으로 덮어써진다(파일 상단 참고).
-- ============================================================================
INSERT INTO analysis_insights (user_id, insight_type, metric_type, title, description,
                               recommendation, start_date, end_date, confidence_score,
                               lag_days, average_delta, generated_at)
VALUES (@uid, 'INGREDIENT', 'TROUBLE', '레티놀',
        '레티놀 사용 후 2일 뒤 트러블이 반복적으로 나빠져요',
        '이 성분이 들어간 제품의 사용 빈도를 줄여보세요',
        DATE_SUB(@today, INTERVAL 27 DAY), DATE_SUB(@today, INTERVAL 1 DAY),
        100.00, 2, -14.00, NOW(6)),
       (@uid, 'INGREDIENT', 'PIGMENTATION', '나이아신아마이드',
        '나이아신아마이드 사용 후 3일 뒤 색소침착이 반복적으로 좋아져요',
        '이 성분이 잘 맞는 편이에요',
        DATE_SUB(@today, INTERVAL 27 DAY), DATE_SUB(@today, INTERVAL 1 DAY),
        100.00, 3, 12.00, NOW(6)),
       (@uid, 'INGREDIENT', 'REDNESS', '판테놀',
        '판테놀 사용 후 홍조 변화를 확인 중이에요',
        '조금 더 기록하면 패턴을 확인할 수 있어요',
        DATE_SUB(@today, INTERVAL 27 DAY), DATE_SUB(@today, INTERVAL 1 DAY),
        52.00, 4, 1.05, NOW(6));

DROP TEMPORARY TABLE day_seq;

-- ============================================================================
-- 11. 검증
-- ============================================================================
SELECT '사용자' AS item, CONCAT(@uid, ' · ', @nickname) AS detail
UNION ALL SELECT '접속 토큰', CONCAT('Bearer mock-access-', @uid, '-demo')
UNION ALL SELECT '저장된 제품', CAST(COUNT(*) AS CHAR) FROM user_products WHERE user_id = @uid
UNION ALL SELECT '루틴', CAST(COUNT(*) AS CHAR) FROM routines WHERE user_id = @uid
UNION ALL SELECT '제품 기록', CAST(COUNT(*) AS CHAR) FROM product_records WHERE user_id = @uid
UNION ALL SELECT '피부 기록', CAST(COUNT(*) AS CHAR) FROM skin_records WHERE user_id = @uid
UNION ALL SELECT '피부 지표', CAST(COUNT(*) AS CHAR) FROM skin_metrics sm
    JOIN skin_records sr ON sr.id = sm.skin_record_id WHERE sr.user_id = @uid
UNION ALL SELECT '성분 프로파일', CAST(COUNT(*) AS CHAR) FROM ingredient_profiles WHERE user_id = @uid
UNION ALL SELECT '  └ 주의(CAUTION)', CAST(COUNT(*) AS CHAR) FROM ingredient_profiles
    WHERE user_id = @uid AND reaction_type = 'CAUTION'
UNION ALL SELECT '  └ 맞음(SUITABLE)', CAST(COUNT(*) AS CHAR) FROM ingredient_profiles
    WHERE user_id = @uid AND reaction_type = 'SUITABLE'
UNION ALL SELECT '인사이트', CAST(COUNT(*) AS CHAR) FROM analysis_insights WHERE user_id = @uid
UNION ALL SELECT '일별 환경', CAST(COUNT(*) AS CHAR) FROM daily_environments WHERE user_id = @uid;
