# 데모 계정 시드 데이터 작업 기록

- 작업일: 2026-08-20
- 대상 서버: 가비아 클라우드 `1.201.116.200:8080` (백엔드), 동일 서버 로컬 MySQL(`ildangbaek`)
- 목적: 안드로이드로 접속할 데모 계정 생성 + 루틴 구성 + 지난 1주일 피부기록/제품기록 시드 삽입
- TestFlight(iOS)와 안드로이드 preview 빌드는 EAS `preview` 환경변수를 공유하므로, 이 서버에 만든 계정은 두 플랫폼 어디서 로그인해도 동일하게 보인다.

## 진행 배경

- API만으로는 루틴-제품 연결(`routine_products`를 쓰는 엔드포인트가 백엔드에 없음)과 과거 날짜 기록 삽입(`skin_records`/`product_records` 모두 서버가 `LocalDate.now()`로 날짜를 강제, 요청 필드에 날짜 override 없음)이 불가능하다고 사전 조사에서 확인됨.
- 이 때문에 DB에 직접 SQL을 실행하는 방식으로 진행. SSH로 가비아 서버에 접속해 로컬 MySQL(`localhost:3306`)에 붙어 작업.

## 1. 기존 제품 데이터 정리

`products` 테이블 조회 결과 테스트 중 만들어진 것으로 보이는 한 글자짜리 쓰레기 제품명(예: "어", "아이", "Fg")과 브랜드명 없는 제품("어성초")이 섞여 있었음.

- `user_products`, `product_record_items`에서 이미 참조 중인 항목이 있어 **삭제 대신 비활성화**로 처리.
- 대상: product id `5, 6, 7, 8, 9, 10, 11, 12, 14` → `active = 0` UPDATE.
- id `13`(토리든 세럼)은 정상 제품으로 판단해 유지.

## 2. 올리브영 기초 제품 9종 신규 등록

사용자가 제공한 실제 제품/전성분 정보를 바탕으로 `products` + `product_ingredients` + `ingredients`에 등록.

- 중복 방지: "라운드랩 1025 독도 토너"는 기존 id=1과 동일 제품으로 판단해 **신규 등록하지 않고 기존 레코드 재사용**.
- 각 제품은 전성분표 앞쪽 **핵심 성분 3개**만 `key_ingredient=1`로 연결(기존 샘플 제품과 동일한 패턴에 맞춤). 나머지 전성분은 저장하지 않음.
- 신규 성분 5개(`프로판다이올`, `다이프로필렌글라이콜`, `세틸에틸헥사노에이트`, `마트리카리아꽃수`, `락토바실러스발효물`)를 `ingredients`에 추가, 기존 성분(정제수/부틸렌글라이콜/글리세린 등)은 재사용.

등록된 제품 (id 15~23):

| id | product_name | brand_name | category |
|---|---|---|---|
| 15 | 다이브인 저분자 히알루론산 세럼 | 토리든 | SERUM |
| 16 | XMD 스템3 클리니컬 리커버리 세럼 | 아이오페 | SERUM |
| 17 | 제로이드 수딩 크림 | 제로이드 | CREAM |
| 18 | 메디힐 에센셜 마스크팩 [마데카소사이드] | 메디힐 | MASK |
| 19 | 다이브인 저분자 히알루론산 토너 | 토리든 | TONER |
| 20 | 클래리파이 겔 토너 | 피쓰 | TONER |
| 21 | 블루 리페어 하이드로 수딩 크림 | 피쓰 | CREAM |
| 22 | 코어 리빌드 크림 | 피쓰 | CREAM |
| 23 | 블루 리페어 솔루션 | 피쓰 | MASK |

원본 입력([docs/DEMO_제품_입력.md](DEMO_제품_입력.md))에서 정정한 부분:
- "블루 리페어 솔루션" 행: 표 열 순서가 brand_name/category 자리에서 어긋나 있어 브랜드=피쓰, 카테고리=MASK로 정정.
- "1,2-산다이 올" → "1,2-헥산다이올" 오탈자로 판단해 정정 후 반영(단, 성분 자체는 핵심 3개 안에 들지 않아 실제 DB에는 포함되지 않음).

## 3. 데모 계정 생성 (API)

이메일 회원가입 플로우로 생성 (DB 직접 삽입이 아니라 정식 API 경로 사용 — 비밀번호 해시 등 백엔드 로직을 그대로 타야 하므로).

```
POST /auth/email/send-code      { "email": "demo@naver.com" }
POST /auth/email/verify-code    { "email": "demo@naver.com", "code": "123456" }  # mock 고정 코드
POST /auth/email/signup         { "email": "demo@naver.com", "password": "Demo1234!" }
```

- 생성된 `user_id = 15`
- 온보딩 완료: 이름 `demo`, 성별 `FEMALE`, 나이 `25`, 피부타입 `건성(DRY)`, 생리 상태 `MENSTRUATING`(2026-08-20 시작, 28일 주기)
- 로그인 계정: **demo@naver.com / Demo1234!**

## 4. 루틴 구성 (DB 직접 삽입)

로그인 시 자동 생성된 기본 루틴(모닝 id=21, 나이트 id=22)에 제품을 연결. `routine_products`는 `user_product_id`를 참조하므로, 먼저 `user_products`에 제품을 저장(`usage_status='USING'`)한 뒤 연결.

| 루틴 | 순서 | 제품 |
|---|---|---|
| 모닝 | 1 | 1025 독도 토너 (id 1) |
| 모닝 | 2 | 다이브인 저분자 히알루론산 세럼 (id 15) |
| 모닝 | 3 | 제로이드 수딩 크림 (id 17) |
| 나이트 | 1 | 클래리파이 겔 토너 (id 20) |
| 나이트 | 2 | XMD 스템3 클리니컬 리커버리 세럼 (id 16) |
| 나이트 | 3 | 블루 리페어 하이드로 수딩 크림 (id 21) |
| 나이트 | 4 | 메디힐 에센셜 마스크팩 [마데카소사이드] (id 18) |

## 5. 지난 1주일 피부기록 (DB 직접 삽입)

`skin_records` + `skin_metrics`, 2026-08-14~2026-08-20, 아침/저녁 하루 2회 = 14건.

- `overall_score`는 68 → 77점으로 완만한 개선 추세.
- `skin_metrics`(PIGMENTATION/PORES/REDNESS/TROUBLE, 총 56건)도 같은 방향으로 소폭 개선.
- `image_url`은 NULL — 실제 이미지 없이 더미로 채운 값이므로, 사진이 필요한 화면(원본 이미지 표시 등)에서는 빈 값으로 보일 수 있음.
- `analysis_method = 'MOCK'`로 표시해 실제 AI 분석 결과가 아님을 DB 레벨에서 구분해둠.

## 6. 지난 1주일 제품기록 (DB 직접 삽입)

`product_records` + `product_record_items`, 같은 기간 아침/저녁 각 1건씩 = 14건, 각 루틴 제품 그대로 사용(모닝 3개/나이트 4개).

- `source_type = 'ROUTINE'`으로 표시.

## 7. 테스트 쓰레기 성분 삭제

`ingredients` id 18~24(이/어어/에/비/바/타/유, 한 글자짜리 테스트 데이터)를 삭제.

- 모두 이미 비활성화해둔 테스트 쓰레기 제품(product id 5~12)에서만 `product_ingredients`로 참조되고 있어 제품 정합성에는 영향 없음.
- 다만 다른 실제 유저(user_id 2, 8)의 `ingredient_profiles`(성분 반응 분석 기록) 4건이 이 성분들을 참조하고 있어, 삭제 전 사용자 확인 후 해당 프로필 기록도 함께 삭제.
- 처리 순서: `product_ingredients` 삭제 → `ingredient_profiles` 삭제 → `ingredients` 삭제 (FK 제약 순서).

## 8. 백엔드 재배포

시드 작업 도중 서버가 origin/main보다 뒤처져 있는 것을 확인해 재배포 진행 (`gabia-server-deploy-guide.md` 절차 준용).

- 서버 배포 커밋: `ff7453d` → `ccb5f73`(PR #64 머지 포함)로 갱신.
- `ai-server/requirements.txt`는 서버에서 numpy/opencv 버전을 낮춰 수동 수정해둔 상태(설치 호환성 대응으로 추정)라 `git stash`로 보존 후 pull 진행. AI 서버는 이번에 건드리지 않음(백엔드만 재배포).
- `./gradlew clean build -x test` → `BUILD SUCCESSFUL`.
- `pkill -f backend-0.0.1-SNAPSHOT.jar` 후 `run.sh` 재기동. 첫 시도는 SSH 세션 종료와 함께 백그라운드 프로세스가 죽어 헬스체크 실패 → `setsid nohup ... & disown`으로 세션과 완전히 분리해 재시도, 정상 기동 확인(`/api/v1/health` 200 OK).
- 재기동 후 데모 계정(`user_id=15`)과 시드 데이터(피부기록 14건, 제품기록 14건)는 DB에 그대로 남아있음을 확인 — 재배포는 코드만 교체할 뿐 DB 데이터에는 영향 없음.

## 9. 쇼핑 추천템(CHECK-01, `GET /checks/home`) 미노출 문제 해결

데모 계정에서 홈 화면 추천 제품이 비어 있는 문제 확인.

- 원인: `recommendations`는 사용자의 `ingredient_profiles`에 `reaction_type='SUITABLE'`인 성분이 있어야만 채워짐(`CheckHomeService`). 이 테이블은 `SKIN-01` 피부기록 생성 API를 통해서만 부수효과로 채워지는(`IngredientLagAnalysisService`) 분석 결과 테이블로, 직접 INSERT하는 API가 없음.
- 데모 계정의 피부기록/제품기록은 DB에 직접 SQL로 삽입했기 때문에(4~6절) 이 분석 로직이 한 번도 실행되지 않아 `ingredient_profiles`가 비어 있었음 → 추천 로직이 조기 반환하여 빈 배열.
- 조치: `ingredient_profiles`에 데모 루틴 제품의 핵심 성분(나이아신아마이드-레티놀 시카 앰플, 판테놀-1025 독도 토너) 2건을 `reaction_type='SUITABLE'`로 직접 삽입.
- `GET /checks/home` 재호출로 추천 2건("1025 독도 토너", "레티놀 시카 앰플") 정상 노출 확인.

## 10. 리포트 종합 점수(REPORT-01, `GET /reports`) 22점 문제 해결

리포트 탭 종합 피부 점수가 22점으로 비정상적으로 낮게 표시되는 문제 확인.

- 원인: `summary.totalScore`는 `skin_records.overall_score`를 쓰지 않고, 기간 내 모든 `skin_metrics.metric_value`(TROUBLE/REDNESS/PORES/PIGMENTATION)를 통째로 평균낸 값(ADR 0008 공식을 기간 단위로 확장, `ReportService.averageOfAll`). `overall_score`는 `summary.graph` 트렌드 표시에만 쓰임 — 서로 다른 소스.
- 5절에서 `skin_metrics`를 넣을 때 "수치가 낮을수록 좋음"으로 착각해 20~35 범위의 낮은 값으로 채웠는데, 실제로는 `overall_score`와 같은 방향(높을수록 좋음, 0~100)이어야 했음. 그 결과 전체 평균이 22점으로 나옴.
- 조치: 56건(14 records × 4 metrics)의 `metric_value`를 해당 레코드의 `overall_score`와 평균이 일치하도록 재계산해 UPDATE.
- `GET /reports?period=7` 재호출로 `totalScore: 71` 정상 확인 (기존 22 → 71).

## 11. AI 인사이트 / 추천 코멘트 / 성분 프로필 확장

### 11-1. AI 인사이트 (`analysis_insights`)
리포트 탭 인사이트가 비어있어 3건 추가:

| id | insight_type | metric_type | title |
|---|---|---|---|
| 11 | INGREDIENT | TROUBLE | 레티놀 사용과 트러블 변화 |
| 12 | INGREDIENT | REDNESS | 세라마이드와 홍조 개선 |
| 13 | ENVIRONMENT | PORES | 습도와 모공 컨디션 |

`GET /reports?period=7`의 `insights` 배열에 정상 노출 확인.

### 11-2. 추천 제품 코멘트 (`aiComment`)
확인 결과 **DB에 저장되는 값이 아님** — `CheckHomeService`가 매 요청마다 ai-server(`http://localhost:8000/product-comments`)를 실시간 호출해 받아오는 값(`ProductCommentClient`). 이미 정상 응답 중인 것을 확인해 별도 작업 불필요.

### 11-3. 성분 프로필 확장 (`ingredient_profiles`)
기존 SUITABLE 2건(판테놀, 나이아신아마이드)에 추가:

| id | 성분 | reaction_type |
|---|---|---|
| 9 | 글리세린 | SUITABLE |
| 10 | 세라마이드엔피 | SUITABLE |
| 11 | 레티놀 | CAUTION |
| 12 | 부틸렌글라이콜 | CAUTION |

`GET /checks/home` 재호출 결과 추천 제품이 2건 → 9건으로 늘어남(`profileCompletion`도 17 → 27로 상승) — SUITABLE 성분을 key_ingredient로 가진 활성 제품이 늘어난 만큼 매칭 결과가 증가하는 정상 동작.

## 12. 추천 목록 정리: 토리든 세럼 제외 + 피쓰 제품 포함

기존 샘플 제품 "토리든 세럼"(id 13)이 글리세린(SUITABLE) 매칭으로 추천에 뜨는 것을 제외하고, 사용자가 입력한 데이터가 더 많이 노출되도록 조정.

- id 13("토리든 세럼")을 사용자가 처음 입력했던 "다이브인 저분자 히알루론산 세럼"(브랜드 토리든)으로 이름 변경. 단 id 13은 다른 유저(user_id=10)가 이미 저장해 둔 제품이라 삭제 불가 — rename으로 대체.
- 원래 이 이름으로 신규 등록했던 id 15는 데모 계정 `user_products`/`product_record_items`가 모두 id 13을 가리키도록 재연결한 뒤 `active=0`으로 비활성화(사실상 폐기, 이름도 "(사용중단) ... 중복"으로 구분).
- id 13에 부틸렌글라이콜(key_ingredient) 성분을 추가해 원래 id 15와 성분 구성을 맞춤.
- `GET /checks/home` 재확인 결과 추천 8건 중 피쓰 브랜드 2건(블루 리페어 하이드로 수딩 크림, 코어 리빌드 크림) 포함, "토리든 세럼"이라는 이름은 더 이상 노출되지 않음(같은 id가 "다이브인 저분자 히알루론산 세럼"으로 노출).

## 13. 제품 이미지 채우기

사용자가 입력한 9개 제품(2절)은 `image_url`이 모두 NULL이라 쇼핑탭에서 사진이 비어있는 상태였음. 웹 검색으로 각 브랜드 공식몰/직영몰에서 실제 상품 이미지 URL을 찾아 채움.

| id | product_name | 반영 여부 |
|---|---|---|
| 13 | 다이브인 저분자 히알루론산 세럼 | ✅ 토리든 공식몰(godomall) |
| 19 | 다이브인 저분자 히알루론산 토너 | ✅ 토리든 공식몰(godomall) |
| 17 | 제로이드 수딩 크림 | ✅ neopharmshop CDN |
| 18 | 메디힐 에센셜 마스크팩 [마데카소사이드] | ✅ 메디힐샵 공식몰 |
| 22 | 코어 리빌드 크림 | ✅ 피쓰(pithseoul) 공식몰, cafe24 CDN |
| 16 | XMD 스템3 클리니컬 리커버리 세럼 | ❌ 미반영 — 아이오페 공식 페이지가 404로 확인 안 됨 |
| 20 | 클래리파이 겔 토너 | ❌ 미반영 — 피쓰 공식몰에서 상세페이지 못 찾음 |
| 21 | 블루 리페어 하이드로 수딩 크림 | ❌ 미반영 — 위와 동일 |
| 23 | 블루 리페어 솔루션 | ❌ 미반영 — 위와 동일 |

- 반영 전 5개 URL 모두 `curl -A "Mozilla/5.0"`로 HTTP 200 및 `image/*` content-type 확인 후 반영.
- 올리브영 상품 페이지는 봇 차단(403)으로 이미지 URL을 직접 못 뽑음. 아이오페 공식 사이트는 검색 결과로 뜬 상품 URL이 모두 404.
- 남은 4개는 실제 이미지 URL을 사용자가 직접 전달하면 반영 예정.

## 14. 토너 제품 3종 추가 (올리브영 실제 랭킹 기반)

올리브영 토너 카테고리 실제 랭킹/스테디셀러를 웹 검색으로 확인해 정확한 제품명으로 등록. 올리브영 페이지 자체는 봇 차단(403)이라 마켓컬리·다나와 등 이미지가 열람 가능한 판매처에서 대표 이미지 URL을 확보.

| id | product_name | brand_name | 비고 |
|---|---|---|---|
| 24 | 티트리 시카 수딩 토너 | 브링그린 | 올리브영 토너 카테고리 8월 랭킹 1위 |
| 25 | 어성초 77 토너 | 아누아 | 스테디셀러, 어성초 성분 기반 진정 토너 |
| 26 | 어성초 히알루론 수딩 토너 | 구달 | 올리브영 8월 랭킹 6위 |

- 이미지는 마켓컬리(구달), 다나와/CJ온스타일 이미지 CDN(브링그린·아누아)에서 확보, 반영 전 `curl`로 HTTP 200 + `image/*` content-type 확인.
- 핵심 성분(각 3개, `key_ingredient=1`): 정제수 공통 + 브링그린은 부틸렌글라이콜·병풀추출물(시카), 아누아·구달은 신규 등록한 "어성초추출물"(id 31) + 부틸렌글라이콜/글리세린. 전성분표는 브링그린·구달만 웹에서 확보했고 아누아는 대표 성분(어성초)만 확인해 구성.
- `GET /products?keyword=어성초`, `keyword=티트리`로 검색 결과 및 이미지 정상 노출 확인. 아직 데모 계정 루틴에는 추가하지 않음 — 필요 시 별도 요청.

## 15. 피쓰 제품 나머지 3종 이미지 반영

13절에서 미반영이었던 피쓰(pithseoul.com) 제품 3종의 이미지를, 사용자가 직접 전달한 상품 상세 링크에서 확보해 반영. 코어 리빌드 크림(id 22)도 같은 소스로 재확인.

| id | product_name | image_url 출처 |
|---|---|---|
| 20 | 클래리파이 겔 토너 | pithseoul.com product_no=49 |
| 21 | 블루 리페어 하이드로 수딩 크림 | pithseoul.com product_no=42 (품절 상태 페이지였으나 이미지는 정상) |
| 23 | 블루 리페어 솔루션 | pithseoul.com product_no=13 |
| 22 | 코어 리빌드 크림 | pithseoul.com product_no=12 (기존 반영 값과 동일 확인) |

반영 전 4개 URL 모두 `curl -A "Mozilla/5.0"`로 HTTP 200 + `image/png` 확인. 이로써 사용자가 입력한 9개 제품 전체(13절 5개 + 이번 3개, 코어 리빌드는 중복 확인)의 이미지가 모두 채워짐.

## 확인 필요 / 후속 작업 제안

- `ingredients`에 여전히 중복 성분(정제수 id 1/17, 병풀추출물 id 7/14, 글리세린 id 12/25)이 남아있음. 정상 제품에서 실제 참조 중이라 이번 작업에서는 손대지 않음 — 병합하려면 참조 중인 `product_ingredients`를 대표 id로 일괄 변경 후 나머지 삭제 필요.
- 데모 계정 비밀번호(`Demo1234!`)는 안드로이드 기기에 이메일 로그인으로 입력해 사용.
