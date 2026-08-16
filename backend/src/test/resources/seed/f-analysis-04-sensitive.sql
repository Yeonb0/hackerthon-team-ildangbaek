-- F-ANALYSIS-04 민감성 피부 완화(BR 3) · 로컬 검증용 추가 데이터
--
-- f-analysis-01-mockup.sql 을 먼저 실행한 뒤에 적용한다. 그 시드만으로는 민감성 완화를
-- 확인할 수 없다 — 레티놀 패턴의 변화량이 +15라 기본 기준(3점)으로도 확정되기 때문이다.
-- 완화가 실제로 동작하는지 보려면 **기본 기준과 완화 기준 사이(2~3점)** 에 걸치는 패턴이 필요하다.
--
-- 심는 것
--   1. skin_types 마스터에 SENSITIVE 행. 온보딩 API(F-ONBOARD-02, A 담당)가 없어 비어 있다.
--   2. 사용자 9001을 민감성으로 지정.
--   3. 판테놀 사용일(18 · 11 · 8일 전) 2일 뒤(16 · 9 · 6일 전)의 모공 +2.5.
--
-- 기대 결과 (ADR 0010)
--   · 민감성일 때  : 판테놀 CAUTION · profile_score 2.5000 · 근거에 "민감성 피부 기준 ·" 접두어
--   · 민감성이 아닐 때: 판테놀 INSUFFICIENT · 근거 NULL
--
-- 대조군을 보려면 아래로 민감성 지정만 지우고 다시 분석한다.
--   DELETE FROM user_skin_types WHERE user_id = 9001;
--
-- 실행
--   docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
--     -uildangbaek -pildangbaek1234 ildangbaek \
--     < backend/src/test/resources/seed/f-analysis-04-sensitive.sql

SET @uid = 9001;
SET @today = CURDATE();

-- 피부 타입 마스터. 온보딩이 붙기 전까지 이 표는 비어 있으므로 완화 경로가 아예 실행되지 않는다.
INSERT INTO skin_types (id, code, name, description)
VALUES (9001, 'SENSITIVE', '민감성', '외부 자극에 쉽게 반응하는 피부')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO user_skin_types (user_id, skin_type_id)
VALUES (@uid, 9001)
ON DUPLICATE KEY UPDATE skin_type_id = VALUES(skin_type_id);

-- 판테놀 사용 2일 뒤에만 모공을 45 → 47.5로 올린다. 변화량 2.5점은 기본 확정 기준(3점)에
-- 미달하고 민감성 완화 기준(2점)은 넘는 값이라, 완화가 켜졌는지 여부로 결과가 갈린다.
UPDATE skin_metrics sm
    JOIN skin_records sr ON sr.id = sm.skin_record_id
SET sm.metric_value = 47.50
WHERE sr.user_id = @uid
  AND sm.metric_type = 'PORES'
  AND DATEDIFF(@today, sr.record_date) IN (16, 9, 6);

SELECT '민감성 지정' AS item, COUNT(*) AS cnt FROM user_skin_types WHERE user_id = @uid
UNION ALL
SELECT '모공 +2.5 적용된 기록', COUNT(*) FROM skin_records sr
    JOIN skin_metrics sm ON sm.skin_record_id = sr.id
WHERE sr.user_id = @uid AND sm.metric_type = 'PORES' AND sm.metric_value = 47.50;
