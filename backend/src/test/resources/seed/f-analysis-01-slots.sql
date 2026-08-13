-- F-ANALYSIS-01 · 모닝·나이트 슬롯 분리(ADR 0014) 실서버 검증용 목업 데이터
--
-- f-analysis-01-mockup.sql은 피부 기록도 제품 기록도 전부 NIGHT 단일 슬롯이라, 슬롯을 평균으로
-- 접든(구버전) 슬롯별로 나누든(ADR 0014) 결과가 같다. 그래서 그 시드로는 ADR 0014가 고친 결함을
-- 실서버에서 확인할 수 없다. 이 시드가 그 자리를 메운다.
--
-- 기존 시드는 회귀 기준선으로 그대로 두고 건드리지 않는다 — 그쪽 기대값(레티놀 신뢰도 100 · +15)이
-- 바뀌면 ADR 0014 전후를 비교할 근거를 잃는다.
--
-- 두 사용자로 나눈 이유는 교차 오염 방지다. 한 사용자에 두 패턴을 심으면 A의 스파이크일이 B의
-- 사용일과 우연히 시차로 걸려 "확정되면 안 되는 것이 확정"될 수 있다.
--
-- ── 사용자 9101 · Case A (왜곡 방지) ────────────────────────────────────────────
--   나이트에만 쓴 성분(나이아신아마이드)의 기준선에 그날 모닝 점수가 섞이면 안 된다.
--   · NIGHT 트러블 : 20일 내내 50 고정      → 나이트끼리 비교하면 변화량 0
--   · MORNING 트러블: 사용일 10 · 2일 뒤 90  → 모닝만 크게 요동
--   사용일 18 · 12 · 6일 전 (NIGHT)
--
--   기대 — ADR 0014: 나이트 사용은 나이트 관측과만 비교하므로 delta 0 → 확정되지 않는다(OBSERVING).
--          구버전(평균 합산): baseline (50+10)/2=30, D+2 (50+90)/2=70 → delta +40으로 확정(OBSERVED).
--   즉 이 성분이 OBSERVED로 나오면 슬롯 분리가 깨진 것이다. 이 시드의 핵심 판정이다.
--
-- ── 사용자 9102 · Case B (노출 2건 집계) ───────────────────────────────────────
--   같은 성분(세라마이드)을 같은 날 모닝·나이트에 모두 쓰면 노출 2건으로 센다.
--   사용일 15 · 9 · 3일 전, 모닝·나이트 양쪽. 두 슬롯 모두 2일 뒤 트러블 +12.
--
--   기대 — ADR 0014: 관측 쌍 6건(사용일 3 × 슬롯 2) · 신뢰도 100 · 평균 변화량 +12 → OBSERVED.
--          구버전(노출 1건): 관측 쌍 3건.
--   관측 쌍 수가 6이 아니라 3이면 노출이 슬롯별로 분리되지 않은 것이다.
--
-- 실행 (--default-character-set=utf8mb4 를 빼면 성분 한글명이 깨져 들어간다)
--   docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
--     -uildangbaek -pildangbaek1234 ildangbaek \
--     < backend/src/test/resources/seed/f-analysis-01-slots.sql
--
-- 분석은 피부 기록 저장 시점에만 돌아간다. 적재 후 두 사용자로 SKIN-01을 한 번씩 호출해야 한다.
-- 주의: 아래 사용자(9101 · 9102)의 기존 기록을 지우고 다시 심는다. 로컬 전용이다.

SET @a = 9101;
SET @b = 9102;
SET @today = CURDATE();

DELETE sm FROM skin_metrics sm JOIN skin_records sr ON sr.id = sm.skin_record_id
    WHERE sr.user_id IN (@a, @b);
DELETE FROM skin_records WHERE user_id IN (@a, @b);
DELETE pri FROM product_record_items pri
    JOIN product_records pr ON pr.id = pri.product_record_id WHERE pr.user_id IN (@a, @b);
DELETE FROM product_records WHERE user_id IN (@a, @b);
DELETE FROM analysis_insights WHERE user_id IN (@a, @b);
DELETE FROM ingredient_profiles WHERE user_id IN (@a, @b);

INSERT INTO users (id, created_at, updated_at, account_status, email, onboarding_completed,
                   provider, provider_user_id)
VALUES (@a, NOW(6), NOW(6), 'ACTIVE', 'slot-case-a@example.com', b'1', 'EMAIL', 'slot-case-a'),
       (@b, NOW(6), NOW(6), 'ACTIVE', 'slot-case-b@example.com', b'1', 'EMAIL', 'slot-case-b')
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- USER-01(마이페이지)이 user_profiles 부재로 404가 나지 않도록 온보딩 결과를 함께 심는다.
INSERT INTO user_profiles (user_id, created_at, updated_at, nickname, birth_year, gender,
                           oral_contraceptive, progesterone_injection, hormone_replacement_therapy)
VALUES (@a, NOW(6), NOW(6), 'slot-case-a', 1998, 'FEMALE', b'0', b'0', b'0'),
       (@b, NOW(6), NOW(6), 'slot-case-b', 1998, 'FEMALE', b'0', b'0', b'0')
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- 기존 시드의 성분(9001~9003)과 겹치지 않게 새 id를 쓴다.
INSERT INTO ingredients (id, korean_name, english_name, function_category)
VALUES (9011, '나이아신아마이드', 'Niacinamide', '미백'),
       (9012, '세라마이드', 'Ceramide', '장벽강화')
ON DUPLICATE KEY UPDATE korean_name = VALUES(korean_name);

INSERT INTO products (id, created_at, updated_at, active, brand_name, product_name, category, data_source)
VALUES (9011, NOW(6), NOW(6), b'1', '목업랩', '나이아신아마이드 앰플', 'SERUM', 'SAMPLE'),
       (9012, NOW(6), NOW(6), b'1', '목업랩', '세라마이드 크림', 'CREAM', 'SAMPLE')
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

-- 제품당 성분 1종만 둔다. 동반 성분이 있으면 어느 성분의 패턴인지 갈라지지 않아 슬롯 판정이 흐려진다.
INSERT INTO product_ingredients (product_id, ingredient_id, display_order, key_ingredient)
VALUES (9011, 9011, 1, b'1'),
       (9012, 9012, 1, b'1')
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

DROP TEMPORARY TABLE IF EXISTS day_seq;
CREATE TEMPORARY TABLE day_seq (offset_days INT PRIMARY KEY);
INSERT INTO day_seq (offset_days)
VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),
       (10),(11),(12),(13),(14),(15),(16),(17),(18),(19);

-- ── Case A (9101) ─────────────────────────────────────────────────────────────
-- 하루 2건(모닝·나이트) 20일치. 오늘 모닝은 비워 둔다 — SKIN-01을 호출해 분석을 트리거할 자리다.
INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @a, DATE_SUB(@today, INTERVAL offset_days DAY), 'MORNING', '/images/mockup.jpg', 60.00,
       'COMPLETED', 'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '08:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '08:01:00')
FROM day_seq WHERE offset_days > 0;

INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @a, DATE_SUB(@today, INTERVAL offset_days DAY), 'NIGHT', '/images/mockup.jpg', 60.00,
       'COMPLETED', 'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '22:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '22:01:00')
FROM day_seq;

-- 나이트 트러블은 20일 내내 50이다. 나이트끼리만 비교하면 어떤 시차에서도 변화량이 0이다.
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'TROUBLE', 50.00
FROM skin_records sr WHERE sr.user_id = @a AND sr.time_period = 'NIGHT';

-- 모닝 트러블만 요동친다. 사용일(18·12·6일 전) 10, 그 2일 뒤(16·10·4일 전) 90.
-- 이 값이 나이트 기준선에 섞이면 +40짜리 가짜 패턴이 만들어진다.
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'TROUBLE',
       CASE WHEN DATEDIFF(@today, sr.record_date) IN (16, 10, 4) THEN 90.00 ELSE 10.00 END
FROM skin_records sr WHERE sr.user_id = @a AND sr.time_period = 'MORNING';

-- 나머지 지표는 두 슬롯 모두 고정값이라 패턴을 만들지 않는다.
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, m.metric_type, 45.00
FROM skin_records sr
CROSS JOIN (SELECT 'REDNESS' AS metric_type UNION ALL
            SELECT 'PORES' UNION ALL
            SELECT 'PIGMENTATION') m
WHERE sr.user_id = @a;

INSERT INTO product_records (user_id, record_date, time_period, source_type, recorded_at,
                             created_at, updated_at)
SELECT @a, DATE_SUB(@today, INTERVAL offset_days DAY), 'NIGHT', 'INDIVIDUAL',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '21:30:00'), NOW(6), NOW(6)
FROM day_seq WHERE offset_days IN (18, 12, 6);

INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, 9011, 1, pr.recorded_at
FROM product_records pr WHERE pr.user_id = @a;

-- ── Case B (9102) ─────────────────────────────────────────────────────────────
INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @b, DATE_SUB(@today, INTERVAL offset_days DAY), 'MORNING', '/images/mockup.jpg', 60.00,
       'COMPLETED', 'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '08:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '08:01:00')
FROM day_seq WHERE offset_days > 0;

INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @b, DATE_SUB(@today, INTERVAL offset_days DAY), 'NIGHT', '/images/mockup.jpg', 60.00,
       'COMPLETED', 'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '22:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '22:01:00')
FROM day_seq;

-- 두 슬롯 모두 기준선 40, 사용일(15·9·3일 전)의 2일 뒤(13·7·1일 전)만 52.
-- 슬롯을 나눠 세면 관측 쌍 6건, 노출을 1건으로 접으면 3건이다.
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'TROUBLE',
       CASE WHEN DATEDIFF(@today, sr.record_date) IN (13, 7, 1) THEN 52.00 ELSE 40.00 END
FROM skin_records sr WHERE sr.user_id = @b;

INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, m.metric_type, 45.00
FROM skin_records sr
CROSS JOIN (SELECT 'REDNESS' AS metric_type UNION ALL
            SELECT 'PORES' UNION ALL
            SELECT 'PIGMENTATION') m
WHERE sr.user_id = @b;

-- 같은 날 모닝·나이트 양쪽에 제품 기록을 남긴다. 슬롯당 제품 기록 1건씩이다.
INSERT INTO product_records (user_id, record_date, time_period, source_type, recorded_at,
                             created_at, updated_at)
SELECT @b, DATE_SUB(@today, INTERVAL offset_days DAY), 'MORNING', 'INDIVIDUAL',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '07:30:00'), NOW(6), NOW(6)
FROM day_seq WHERE offset_days IN (15, 9, 3);

INSERT INTO product_records (user_id, record_date, time_period, source_type, recorded_at,
                             created_at, updated_at)
SELECT @b, DATE_SUB(@today, INTERVAL offset_days DAY), 'NIGHT', 'INDIVIDUAL',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '21:30:00'), NOW(6), NOW(6)
FROM day_seq WHERE offset_days IN (15, 9, 3);

INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, 9012, 1, pr.recorded_at
FROM product_records pr WHERE pr.user_id = @b;

DROP TEMPORARY TABLE day_seq;

SELECT 'Case A(9101) 피부 기록' AS item, COUNT(*) AS cnt FROM skin_records WHERE user_id = @a
UNION ALL SELECT 'Case A(9101) 제품 기록', COUNT(*) FROM product_records WHERE user_id = @a
UNION ALL SELECT 'Case B(9102) 피부 기록', COUNT(*) FROM skin_records WHERE user_id = @b
UNION ALL SELECT 'Case B(9102) 제품 기록', COUNT(*) FROM product_records WHERE user_id = @b;
