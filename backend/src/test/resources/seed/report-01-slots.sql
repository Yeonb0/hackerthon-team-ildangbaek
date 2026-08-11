-- ADR 0012 검증용 · REPORT-01 그래프 시간대 분리
--
-- f-analysis-01-mockup.sql은 NIGHT 기록만 심어서 morningScore가 전부 null이다.
-- 이 스크립트는 그 위에 MORNING 기록을 골라 얹어 네 가지 조합을 모두 만든다.
--
--   0일 전(오늘) : MORNING + NIGHT  → 두 값 다 나와야 함
--   1일 전       : MORNING만        → nightScore null (NIGHT를 지움)
--   2일 전       : NIGHT만          → morningScore null (원래 상태 유지)
--   3일 전       : 둘 다 없음       → 두 값 다 null (NIGHT를 지움)
--
-- MORNING 트러블은 40, NIGHT 트러블은 50/65 이므로 값으로 슬롯을 구분할 수 있다.
--
-- 선행: f-analysis-01-mockup.sql을 먼저 실행해야 한다. 이 스크립트는 그 결과 위에 얹는다.
--
-- 실행
--   docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
--     -uildangbaek -pildangbaek1234 ildangbaek \
--     < backend/src/test/resources/seed/report-01-slots.sql
--
-- 주의: 1일 전 · 3일 전의 NIGHT 기록을 지운다. 그중 하나가 레티놀 패턴의 스파이크일이라
-- 이 시드를 얹은 뒤에는 REPORT-01의 insights가 비어 보일 수 있다. 그래프 검증 전용이다.

SET @uid = 9001;
SET @today = CURDATE();

-- 3일 전은 "기록 없음" 케이스로 쓰므로 NIGHT를 지운다.
DELETE sm FROM skin_metrics sm JOIN skin_records sr ON sr.id = sm.skin_record_id
WHERE sr.user_id = @uid AND sr.record_date = DATE_SUB(@today, INTERVAL 3 DAY);
DELETE FROM skin_records
WHERE user_id = @uid AND record_date = DATE_SUB(@today, INTERVAL 3 DAY);

-- 1일 전은 "모닝만" 케이스로 쓰므로 NIGHT를 지운다.
DELETE sm FROM skin_metrics sm JOIN skin_records sr ON sr.id = sm.skin_record_id
WHERE sr.user_id = @uid AND sr.record_date = DATE_SUB(@today, INTERVAL 1 DAY);
DELETE FROM skin_records
WHERE user_id = @uid AND record_date = DATE_SUB(@today, INTERVAL 1 DAY);

-- 오늘과 1일 전에 MORNING을 심는다.
DROP TEMPORARY TABLE IF EXISTS morning_seq;
CREATE TEMPORARY TABLE morning_seq (offset_days INT PRIMARY KEY);
INSERT INTO morning_seq (offset_days) VALUES (0),(1);

INSERT INTO skin_records (user_id, record_date, time_period, image_url, overall_score,
                          analysis_status, analysis_method, captured_at, analyzed_at)
SELECT @uid,
       DATE_SUB(@today, INTERVAL offset_days DAY),
       'MORNING',
       '/images/mockup.jpg',
       70.00,
       'COMPLETED',
       'MOCK',
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '08:00:00'),
       TIMESTAMP(DATE_SUB(@today, INTERVAL offset_days DAY), '08:01:00')
FROM morning_seq;

-- MORNING 지표. 트러블 40으로 NIGHT(50/65)와 구분되게 둔다.
INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, 'TROUBLE', 40.00
FROM skin_records sr
WHERE sr.user_id = @uid AND sr.time_period = 'MORNING';

INSERT INTO skin_metrics (skin_record_id, metric_type, metric_value)
SELECT sr.id, m.metric_type, 42.00
FROM skin_records sr
CROSS JOIN (SELECT 'REDNESS' AS metric_type UNION ALL
            SELECT 'PORES' UNION ALL
            SELECT 'PIGMENTATION') m
WHERE sr.user_id = @uid AND sr.time_period = 'MORNING';

SELECT DATEDIFF(@today, record_date) AS days_ago, time_period,
       (SELECT metric_value FROM skin_metrics
        WHERE skin_record_id = sr.id AND metric_type = 'TROUBLE') AS trouble
FROM skin_records sr
WHERE user_id = @uid AND record_date >= DATE_SUB(@today, INTERVAL 4 DAY)
ORDER BY days_ago, time_period;
