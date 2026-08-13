-- CHECK-02 위험도 등급 로컬 검증용 목업 데이터. ADR 0015.
--
-- f-analysis-01-mockup.sql을 먼저 실행해야 한다 (사용자 9001, 성분 9001~9003).
-- 그 시드는 사용자 9001의 레티놀·히알루론산을 CAUTION으로, 판테놀을 INSUFFICIENT로 만들지만
-- 판정 성분이 2종뿐이라 비중 축 게이트(5종)를 시험할 수 없다. 이 파일이 그 나머지 등급
-- 조합(LOW·MEDIUM·개수축 단독 HIGH·비중축 HIGH)을 채운다.
--
-- 사용자 9002의 ingredient_profiles는 F-ANALYSIS-01 분석 결과가 아니라 이 스크립트가 직접
-- 써 넣은 값이다. ADR 0009 확정 기준(관측 3건·일치 67%·변화량 3점)으로는 SUITABLE이 실제
-- 분석 경로에서 빨리 나오지 않아, 등급 분기를 전부 실행하려면 손으로 채우는 편이 유일한
-- 실용적 방법이다 (f-analysis-04-sensitive.sql과 같은 이유).
--
-- 실행
--   docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
--     -uildangbaek -pildangbaek1234 ildangbaek \
--     < backend/src/test/resources/seed/check-02-risk-levels.sql

SET @u1 = 9001;
SET @u2 = 9002;

DELETE FROM product_risk_ingredients WHERE assessment_id IN (SELECT id FROM product_risk_assessments WHERE user_id IN (@u1, @u2));
DELETE FROM product_risk_assessments WHERE user_id IN (@u1, @u2);
DELETE FROM product_ingredients WHERE product_id IN (9003, 9004, 9005, 9006, 9007, 9008, 9009);
DELETE FROM products WHERE id IN (9003, 9004, 9005, 9006, 9007, 9008, 9009);
DELETE FROM ingredient_profiles WHERE user_id = @u2;
-- korean_name에 유니크 제약이 없어 재실행 시 중복 삽입된다. 이 스크립트가 만드는 임시 성분이라
-- 재실행마다 지우고 다시 만든다 — 다른 시드가 이 이름을 쓰지 않는다는 전제.
DELETE FROM product_ingredients WHERE ingredient_id IN (SELECT id FROM ingredients WHERE korean_name LIKE '개수축성분%');
DELETE FROM ingredient_profiles WHERE ingredient_id IN (SELECT id FROM ingredients WHERE korean_name LIKE '개수축성분%');
DELETE FROM ingredients WHERE korean_name LIKE '개수축성분%';

INSERT INTO users (id, created_at, updated_at, account_status, email, onboarding_completed,
                   provider, provider_user_id)
VALUES (@u2, NOW(6), NOW(6), 'ACTIVE', 'check-02-mockup@example.com', b'1', 'EMAIL', 'check-02-mockup')
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- USER-01(마이페이지)이 user_profiles 부재로 404가 나지 않도록 온보딩 결과를 함께 심는다.
INSERT INTO user_profiles (user_id, created_at, updated_at, nickname, birth_year, gender,
                           oral_contraceptive, progesterone_injection, hormone_replacement_therapy)
VALUES (@u2, NOW(6), NOW(6), 'check-02-mockup', 1998, 'FEMALE', b'0', b'0', b'0')
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- 성분 5종 추가 (사용자 9002의 등급 분기 시험용)
INSERT INTO ingredients (id, korean_name, english_name, function_category)
VALUES (9010, '나이아신아마이드', 'Niacinamide', '미백'),
       (9011, '세라마이드', 'Ceramide', '보습'),
       (9012, '살리실산', 'Salicylic Acid', '각질'),
       (9013, '알코올', 'Alcohol', '용제'),
       (9014, '벤조일퍼옥사이드', 'Benzoyl Peroxide', '여드름')
ON DUPLICATE KEY UPDATE korean_name = VALUES(korean_name);

-- 제품 9003 : 판테놀(INSUFFICIENT)만 → 판정 0건 → 409 PROFILE_NOT_READY
-- 제품 9004 : 레티놀+히알루론산(둘 다 CAUTION, 9001과 동일) + 판테놀 다량(INSUFFICIENT)
--             → BR 3 회귀: 9001과 등급·riskScore가 같아야 한다
-- 제품 9005 : 성분 행 없음 → 409 INGREDIENT_DATA_INSUFFICIENT
-- 제품 9006 : 사용자 9002용, SUITABLE 5종 → LOW
-- 제품 9007 : 사용자 9002용, 1 CAUTION + 4 SUITABLE (judged 5) → MEDIUM (ratio 0.20)
-- 제품 9008 : 사용자 9002용, 2 CAUTION + 3 SUITABLE (judged 5) → HIGH (ratio 0.40, 비중 축)
-- 제품 9009 : 사용자 9002용, 3 CAUTION + 17 SUITABLE (judged 20) → HIGH (ratio 0.15, 개수 축)
INSERT INTO products (id, created_at, updated_at, active, brand_name, product_name, category, data_source)
VALUES (9003, NOW(6), NOW(6), b'1', '목업랩', '판테놀 단독 토너', 'TONER', 'SAMPLE'),
       (9004, NOW(6), NOW(6), b'1', '목업랩', '레티놀 세럼 플러스', 'SERUM', 'SAMPLE'),
       (9005, NOW(6), NOW(6), b'1', '목업랩', '성분 미등록 제품', 'ETC', 'SAMPLE'),
       (9006, NOW(6), NOW(6), b'1', '목업랩', 'LOW 등급 제품', 'CREAM', 'SAMPLE'),
       (9007, NOW(6), NOW(6), b'1', '목업랩', 'MEDIUM 등급 제품(비중 0.20)', 'CREAM', 'SAMPLE'),
       (9008, NOW(6), NOW(6), b'1', '목업랩', 'HIGH 등급 제품(비중 축 0.40)', 'CREAM', 'SAMPLE'),
       (9009, NOW(6), NOW(6), b'1', '목업랩', 'HIGH 등급 제품(개수 축 3건)', 'CREAM', 'SAMPLE')
ON DUPLICATE KEY UPDATE product_name = VALUES(product_name);

-- 9010~9012는 SUITABLE, 9013·9014는 CAUTION(위 프로파일 INSERT 기준)이므로, 제품마다 CAUTION
-- 성분을 몇 개 포함시키느냐로 judged=5 고정, caution만 0/1/2로 바꾼다.
--   9006 : SUITABLE 3종만                              → caution 0 → LOW
--   9007 : SUITABLE 3종 + CAUTION 1종(9013)             → caution 1, ratio 0.20 → MEDIUM
--   9008 : SUITABLE 3종 + CAUTION 2종(9013,9014)        → caution 2, ratio 0.40 → HIGH(비중 축)
INSERT INTO product_ingredients (product_id, ingredient_id, display_order, key_ingredient)
VALUES
    (9003, 9002, 1, b'1'),
    (9004, 9001, 1, b'1'),
    (9004, 9003, 2, b'0'),
    (9004, 9002, 3, b'0'),
    (9006, 9010, 1, b'1'),
    (9006, 9011, 2, b'0'),
    (9006, 9012, 3, b'0'),
    (9007, 9010, 1, b'1'),
    (9007, 9011, 2, b'0'),
    (9007, 9012, 3, b'0'),
    (9007, 9013, 4, b'0'),
    (9008, 9010, 1, b'1'),
    (9008, 9011, 2, b'0'),
    (9008, 9012, 3, b'0'),
    (9008, 9013, 4, b'0'),
    (9008, 9014, 5, b'0')
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

-- 9009는 20종(3 CAUTION + 17 SUITABLE)이라 반복 INSERT로 채운다. 성분 마스터도 20종 필요.
DROP TEMPORARY TABLE IF EXISTS ing_seq;
CREATE TEMPORARY TABLE ing_seq (n INT PRIMARY KEY);
INSERT INTO ing_seq (n) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
                                (11),(12),(13),(14),(15),(16),(17),(18),(19),(20);

INSERT INTO ingredients (korean_name, english_name, function_category)
SELECT CONCAT('개수축성분', n), CONCAT('CountAxisIngredient', n), 'ETC'
FROM ing_seq
ON DUPLICATE KEY UPDATE korean_name = korean_name;

-- 방금 넣은 20종의 id를 이름으로 다시 찾아 9009에 연결한다 (auto_increment라 id를 미리 모른다).
INSERT INTO product_ingredients (product_id, ingredient_id, display_order, key_ingredient)
SELECT 9009, i.id, n.n, b'0'
FROM ingredients i
JOIN ing_seq n ON i.korean_name = CONCAT('개수축성분', n.n)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

-- 사용자 9002 프로파일. 20종 중 앞 3개(개수축성분1~3)를 CAUTION, 나머지 17개를 SUITABLE로 --
-- 손으로 확정한다. 5종(9010~9014)에 대해서는 9006/9007/9008 조합대로 채운다.
INSERT INTO ingredient_profiles (user_id, ingredient_id, reaction_type, profile_score, confidence_score,
                                 observation_count, positive_count, negative_count, reason_summary, last_analyzed_at)
VALUES
    (@u2, 9010, 'SUITABLE', 5.0000, 100.00, 5, 5, 0, '피부 톤 개선 이력', NOW(6)),
    (@u2, 9011, 'SUITABLE', 5.0000, 100.00, 5, 5, 0, '보습 효과 확인됨', NOW(6)),
    (@u2, 9012, 'SUITABLE', 5.0000, 100.00, 5, 5, 0, '각질 개선 확인됨', NOW(6)),
    (@u2, 9013, 'CAUTION', 5.0000, 100.00, 5, 0, 5, '건성 피부 자극 가능', NOW(6)),
    (@u2, 9014, 'CAUTION', 5.0000, 100.00, 5, 0, 5, '과거 트러블 반응 있음', NOW(6))
ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type), reason_summary = VALUES(reason_summary);

INSERT INTO ingredient_profiles (user_id, ingredient_id, reaction_type, profile_score, confidence_score,
                                 observation_count, positive_count, negative_count, reason_summary, last_analyzed_at)
SELECT @u2, i.id,
       CASE WHEN n.n <= 3 THEN 'CAUTION' ELSE 'SUITABLE' END,
       5.0000, 100.00, 5,
       CASE WHEN n.n <= 3 THEN 0 ELSE 5 END,
       CASE WHEN n.n <= 3 THEN 5 ELSE 0 END,
       CASE WHEN n.n <= 3 THEN '과거 트러블 반응 있음' ELSE '피부 톤 개선 이력' END,
       NOW(6)
FROM ingredients i
JOIN ing_seq n ON i.korean_name = CONCAT('개수축성분', n.n)
ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type), reason_summary = VALUES(reason_summary);

DROP TEMPORARY TABLE ing_seq;

SELECT '9002 프로파일 행 수' AS item, COUNT(*) AS cnt FROM ingredient_profiles WHERE user_id = @u2
UNION ALL SELECT '9009 성분 행 수', COUNT(*) FROM product_ingredients WHERE product_id = 9009;
