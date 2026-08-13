-- F-ANALYSIS-01 성분-피부 시차 분석 · 로컬 검증용 목업 데이터
--
-- 제품 기록 쓰기 API(PRODUCT-05, A 담당)가 아직 없어 product_records를 채울 방법이 없다.
-- 이 스크립트가 그 자리를 대신해 "의도한 패턴"을 심는다. 무작위 데이터를 넣으면 분석기가
-- 패턴을 제대로 잡았는지 확인할 수 없다. (ADR 0003의 목업 요건 1 — 결정적일 것)
--
-- 심는 패턴
--   · 레티놀    : 18 · 12 · 6일 전 사용 → 그 2일 뒤(16 · 10 · 4일 전) 트러블 +15 → 확정(OBSERVED) 기대
--   · 판테놀    : 18 · 11 · 8일 전 사용 → 뒤따르는 변화 없음                     → 미확정(OBSERVING) 기대
--   · 히알루론산: 레티놀 세럼에 동봉    → 레티놀과 같은 패턴을 공유              → 동반 성분도 후보로 나옴
--
-- 판테놀 사용일은 어떤 시차(1~7)로도 레티놀의 스파이크일(16 · 10 · 4일 전)에 3건 중 1건까지만
-- 걸리도록 골랐다. 우연히 겹치면 아무 관계가 없는 성분에도 반복 패턴이 잡혀 "미확정" 검증이
-- 무의미해진다. 사용일을 바꿀 때는 이 조건을 다시 확인해야 한다.
--
-- 실행 (--default-character-set=utf8mb4 를 빼면 성분 한글명이 깨져 들어간다)
--   docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
--     -uildangbaek -pildangbaek1234 ildangbaek \
--     < backend/src/test/resources/seed/f-analysis-01-mockup.sql
--
-- 주의: 아래 사용자(id 9001)의 기존 기록을 지우고 다시 심는다. 로컬 전용이다.

SET @uid = 9001;
SET @today = CURDATE();

DELETE sm FROM skin_metrics sm JOIN skin_records sr ON sr.id = sm.skin_record_id WHERE sr.user_id = @uid;
DELETE FROM skin_records WHERE user_id = @uid;
DELETE pri FROM product_record_items pri
    JOIN product_records pr ON pr.id = pri.product_record_id WHERE pr.user_id = @uid;
DELETE FROM product_records WHERE user_id = @uid;
DELETE FROM analysis_insights WHERE user_id = @uid;

INSERT INTO users (id, created_at, updated_at, account_status, email, onboarding_completed,
                   provider, provider_user_id)
VALUES (@uid, NOW(6), NOW(6), 'ACTIVE', 'analysis-mockup@example.com', b'1', 'EMAIL', 'analysis-mockup')
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- 성분 3종
INSERT INTO ingredients (id, korean_name, english_name, function_category)
VALUES (9001, '레티놀', 'Retinol', '주름개선'),
       (9002, '판테놀', 'Panthenol', '진정'),
       (9003, '히알루론산', 'Hyaluronic Acid', '보습')
ON DUPLICATE KEY UPDATE korean_name = VALUES(korean_name);

-- 제품 2종. 레티놀 세럼에는 히알루론산이 함께 들어 있어 동반 노출이 생긴다.
INSERT INTO products (id, created_at, updated_at, active, brand_name, product_name, category, data_source)
VALUES (9001, NOW(6), NOW(6), b'1', '목업랩', '레티놀 세럼', 'SERUM', 'SAMPLE'),
       (9002, NOW(6), NOW(6), b'1', '목업랩', '판테놀 토너', 'TONER', 'SAMPLE')
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

-- id를 지정하지 않는다. 순수 대리키라 값에 의미가 없고, 9001을 박아두면 나중에 A의 제품 API가
-- auto_increment로 넣는 행과 충돌한다. (product_id, ingredient_id) 유니크 제약이 중복을 막아준다.
INSERT INTO product_ingredients (product_id, ingredient_id, display_order, key_ingredient)
VALUES (9001, 9001, 1, b'1'),
       (9001, 9003, 2, b'0'),
       (9002, 9002, 1, b'1')
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

-- 피부 기록 20일치. 나이트 슬롯 1건/일.
-- 트러블 기준선 50, 레티놀 사용(0·6·12일 전) 2일 뒤에 해당하는 날만 65.
DROP TEMPORARY TABLE IF EXISTS day_seq;
CREATE TEMPORARY TABLE day_seq (offset_days INT PRIMARY KEY);
INSERT INTO day_seq (offset_days)
VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),
       (10),(11),(12),(13),(14),(15),(16),(17),(18),(19);

INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @uid,
       DATE_SUB(@today, INTERVAL offset_days DAY),
       'NIGHT',
       '/images/mockup.jpg',
       60.00,
       'COMPLETED',
       'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '22:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '22:01:00')
FROM day_seq;

-- 레티놀 사용일은 12·6·0일 전이므로, 그 2일 뒤는 10·4일 전과 오늘의 2일 뒤(=미래, 관측 없음)다.
-- 실제로 관측 쌍이 성립하는 사용일은 12·6일 전 두 건 + 18일 전 한 건을 더해 3건으로 맞춘다.
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id,
       'TROUBLE',
       CASE WHEN DATEDIFF(@today, sr.record_date) IN (16, 10, 4) THEN 65.00 ELSE 50.00 END
FROM skin_records sr WHERE sr.user_id = @uid;

INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, m.metric_type, 45.00
FROM skin_records sr
CROSS JOIN (SELECT 'REDNESS' AS metric_type UNION ALL
            SELECT 'PORES' UNION ALL
            SELECT 'PIGMENTATION') m
WHERE sr.user_id = @uid;

-- 제품 기록. 레티놀 세럼은 18·12·6일 전, 판테놀 토너는 18·11·8일 전 나이트에 사용.
-- 18일 전에는 두 제품을 함께 썼으므로 그날 제품 기록 1건에 항목 2건이 붙는다.
INSERT INTO product_records (user_id, record_date, time_period, source_type, recorded_at,
                             created_at, updated_at)
SELECT @uid, DATE_SUB(@today, INTERVAL offset_days DAY), 'NIGHT', 'INDIVIDUAL',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '21:30:00'), NOW(6), NOW(6)
FROM day_seq WHERE offset_days IN (18, 12, 11, 8, 6);

INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, 9001, 1, pr.recorded_at
FROM product_records pr
WHERE pr.user_id = @uid AND DATEDIFF(@today, pr.record_date) IN (18, 12, 6);

INSERT INTO product_record_items (product_record_id, product_id, usage_order, used_at)
SELECT pr.id, 9002, 2, pr.recorded_at
FROM product_records pr
WHERE pr.user_id = @uid AND DATEDIFF(@today, pr.record_date) IN (18, 11, 8);

DROP TEMPORARY TABLE day_seq;

SELECT '심은 피부 기록' AS item, COUNT(*) AS cnt FROM skin_records WHERE user_id = @uid
UNION ALL SELECT '심은 제품 기록', COUNT(*) FROM product_records WHERE user_id = @uid;
